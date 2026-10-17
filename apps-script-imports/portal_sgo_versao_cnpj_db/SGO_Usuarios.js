const SGO_USUARIOS = (() => {
  const SHEET_NAME = "CAD_USUARIOS";
  const STATUS_ATIVO = "ATIVO";
  const STATUS_INATIVO = "INATIVO";

  function verificarPermissaoAdmin_(sessao) {
    const perfil = SGO_UTILS.safeUpper(sessao.perfil);
    // Expandido para permitir que GESTORES e DIRETORIA também gerenciem usuários.
    if (perfil !== "ADMIN" && perfil !== "GESTOR" && perfil !== "DIRETORIA") {
      throw new Error("Acesso negado: Apenas gestores e administradores podem gerenciar usuários.");
    }
  }

  // CELULAR (WhatsApp) — 2026-10-16. Coluna garantida como as dos outros
  // módulos; formato texto para o "55..." não virar número na planilha.
  // Cache de 6 h: forçar formato a cada chamada já derrubou a Frota.
  function garantirColunaCelular_() {
    try {
      const cache = CacheService.getScriptCache();
      if (cache.get("USR_CELULAR_OK_V2")) return;
      // EMAIL também: o cadastro exige e-mail, mas a coluna só nascia quando a
      // integração Auvo rodava — sem ela o e-mail era descartado em silêncio e
      // toda edição seguinte falhava com "E-mail é obrigatório".
      CertCal_garantirColuna_(SHEET_NAME, "EMAIL");
      CertCal_garantirColuna_(SHEET_NAME, "CELULAR");
      CertCal_forcarColunaTexto_(SHEET_NAME, "CELULAR");
      SGO_DATA._headersCache = {}; SGO_DATA._headerMapCache = {};
      cache.put("USR_CELULAR_OK_V2", "1", 21600);
    } catch (e) {
      console.warn("Não foi possível garantir a coluna CELULAR: " + e.message);
    }
  }

  /** "(11) 98765-4321" -> "5511987654321". Vazio = sem celular. null = inválido. */
  function normalizarCelular_(v) {
    let d = String(v === null || v === undefined ? "" : v).replace(/\D/g, "");
    if (!d) return "";
    d = d.replace(/^0+/, "");
    if (d.length === 10 || d.length === 11) d = "55" + d;
    if (!/^55\d{10,11}$/.test(d)) return null;
    return d;
  }

  function listar(sessionId) {
    const sessao = exigirSessao(sessionId);
    verificarPermissaoAdmin_(sessao);
    garantirColunaCelular_();

    const registros = SGO_DATA.getAll(SHEET_NAME);

    const itens = registros
      .map(function (u) {
        const clone = Object.assign({}, u);
        delete clone.SENHA;
        return clone;
      })
      .sort(function (a, b) {
        const sa = SGO_UTILS.safeUpper(a.STATUS);
        const sb = SGO_UTILS.safeUpper(b.STATUS);

        if (sa === sb) {
          return SGO_UTILS.safe(a.NOME).localeCompare(SGO_UTILS.safe(b.NOME));
        }

        if (sa === STATUS_ATIVO) return -1;
        if (sb === STATUS_ATIVO) return 1;
        return 0;
      });

    // Módulo corrigido para "USUARIOS"
    SGO_DATA.log("USUARIOS_LISTAR", sessao.usuario, "Listagem de usuários executada.", "USUARIOS");

    return {
      success: true,
      items: itens,
      total: itens.length
    };
  }

  function obter(sessionId, id) {
    const sessao = exigirSessao(sessionId);
    verificarPermissaoAdmin_(sessao);

    const usuarioId = SGO_UTILS.safe(id);

    if (!usuarioId) {
      return { success: false, message: "ID do usuário não informado." };
    }

    const registro = SGO_DATA.getById(SHEET_NAME, usuarioId);

    if (!registro) {
      return { success: false, message: "Usuário não encontrado." };
    }

    const item = Object.assign({}, registro);
    delete item.SENHA;

    if (item.CRIADO_EM && typeof item.CRIADO_EM.toISOString === "function") {
      item.CRIADO_EM = item.CRIADO_EM.toISOString();
    }

    // Módulo corrigido
    SGO_DATA.log("USUARIOS_OBTER", sessao.usuario, "Consulta do usuário ID=" + usuarioId, "USUARIOS");

    return {
      success: true,
      item: item
    };
  }

  // Conta de Administrador (e o perfil ADMIN) só é criada, editada,
  // inativada ou excluída por outro Administrador: sem isso, um Gestor
  // trocava a senha do admin e entrava como dono do sistema.
  function exigirAdminParaContaAdmin_(sessao, perfilAlvo, acao) {
    if (SGO_UTILS.safeUpper(perfilAlvo) !== "ADMIN") return "";
    if (SGO_UTILS.safeUpper(sessao.perfil) === "ADMIN") return "";
    return "Não foi possível " + acao + ": contas de Administrador só podem ser criadas ou alteradas por um Administrador. Peça ao administrador do sistema.";
  }

  /** Impede ficar sem nenhum Administrador ativo (ninguém mais conseguiria gerir chaves e usuários). */
  function ehUltimoAdminAtivo_(usuarioId) {
    const ativos = SGO_DATA.getAll(SHEET_NAME).filter(function (u) {
      return SGO_UTILS.safeUpper(u.PERFIL) === "ADMIN" && SGO_UTILS.safeUpper(u.STATUS) === STATUS_ATIVO;
    });
    return ativos.length === 1 && SGO_UTILS.safe(ativos[0].ID) === SGO_UTILS.safe(usuarioId);
  }

  function criar(sessionId, payload) {
    const sessao = exigirSessao(sessionId);
    verificarPermissaoAdmin_(sessao);
    garantirColunaCelular_();

    const dados = normalizarPayload_(payload);
    const erros = validarPayload_(dados, false);

    if (erros.length) {
      return { success: false, message: erros.join(" ") };
    }

    const negado = exigirAdminParaContaAdmin_(sessao, dados.PERFIL, "cadastrar");
    if (negado) return { success: false, message: negado };

    if (existeUsuarioDuplicado_(dados.USUARIO, "")) {
      return { success: false, message: "Já existe uma conta com este nome de usuário (login)." };
    }

    if (existeEmailDuplicado_(dados.EMAIL, "")) {
      return { success: false, message: "Já existe outra conta usando este e-mail." };
    }

    const registro = SGO_DATA.normalizarObjetoParaSheet(
      SHEET_NAME,
      SGO_DATA.gerarRegistroBase({
        USUARIO: dados.USUARIO,
        SENHA: gerarHashSenhaAuth_(dados.SENHA), // SEGURANCA: nunca grava senha em texto plano
        NOME: dados.NOME,
        PERFIL: dados.PERFIL,
        CLIENTE_ID: dados.PERFIL === "CLIENTE" ? dados.CLIENTE_ID : "",
        EMAIL: dados.EMAIL,
        CELULAR: dados.CELULAR || "",
        STATUS: STATUS_ATIVO
      })
    );

    SGO_DATA.insert(SHEET_NAME, registro);
    // Módulo corrigido
    SGO_DATA.log("USUARIOS_CRIAR", sessao.usuario, "Usuário criado: " + registro.USUARIO + " (perfil " + registro.PERFIL + ")", "USUARIOS");

    return {
      success: true,
      message: "Usuário cadastrado com sucesso."
    };
  }

  function atualizar(sessionId, id, payload) {
    const sessao = exigirSessao(sessionId);
    verificarPermissaoAdmin_(sessao);

    const usuarioId = SGO_UTILS.safe(id);

    if (!usuarioId) {
      return { success: false, message: "ID do usuário não informado." };
    }

    garantirColunaCelular_();
    const atual = SGO_DATA.getById(SHEET_NAME, usuarioId);
    if (!atual) {
      return { success: false, message: "Usuário não encontrado." };
    }

    payload = payload || {};
    const normal = normalizarPayload_(payload);
    // Merge: campo ausente no pedido mantém o valor atual (não apaga).
    const dados = SGO_DATA.mesclarCampos_(atual, normal, payload, ["USUARIO", "NOME", "PERFIL", "CLIENTE_ID", "EMAIL"]);
    dados.USUARIO = SGO_UTILS.safeLower(dados.USUARIO);
    dados.PERFIL = SGO_UTILS.safeUpper(dados.PERFIL);
    dados.EMAIL = SGO_UTILS.safeLower(dados.EMAIL);
    dados.SENHA = normal.SENHA;
    dados.CELULAR = normal.CELULAR;
    const erros = validarPayload_(dados, true);

    if (erros.length) {
      return { success: false, message: erros.join(" ") };
    }

    const negado = exigirAdminParaContaAdmin_(sessao, atual.PERFIL, "salvar") || exigirAdminParaContaAdmin_(sessao, dados.PERFIL, "salvar");
    if (negado) return { success: false, message: negado };

    if (SGO_UTILS.safeUpper(atual.PERFIL) === "ADMIN" && dados.PERFIL !== "ADMIN" && ehUltimoAdminAtivo_(usuarioId)) {
      return { success: false, message: "Não foi possível salvar: este é o único Administrador ativo. Cadastre (ou reative) outro Administrador antes de mudar o perfil deste." };
    }

    if (existeUsuarioDuplicado_(dados.USUARIO, usuarioId)) {
      return { success: false, message: "Já existe outra conta usando este nome de usuário (login)." };
    }

    if (existeEmailDuplicado_(dados.EMAIL, usuarioId)) {
      return { success: false, message: "Já existe outra conta usando este e-mail." };
    }

    // Object.assign sobre o registro atual: colunas que outros módulos
    // acrescentem em CAD_USUARIOS ficam como estão.
    const novosDados = Object.assign({}, atual, {
      ID: usuarioId,
      USUARIO: dados.USUARIO,
      SENHA: dados.SENHA ? gerarHashSenhaAuth_(dados.SENHA) : atual.SENHA, // SEGURANCA: hash na troca; mantém hash atual se não alterada
      NOME: dados.NOME,
      PERFIL: dados.PERFIL,
      CLIENTE_ID: dados.PERFIL === "CLIENTE" ? dados.CLIENTE_ID : "",
      EMAIL: dados.EMAIL,
      CELULAR: dados.CELULAR === undefined ? SGO_UTILS.safe(atual.CELULAR) : dados.CELULAR,
      STATUS: SGO_UTILS.safeUpper(atual.STATUS) || STATUS_ATIVO,
      CRIADO_EM: atual.CRIADO_EM
    });

    const ok = SGO_DATA.update(SHEET_NAME, usuarioId, novosDados);

    if (!ok) {
      return { success: false, message: "Não foi possível atualizar o usuário." };
    }

    const mudouPerfil = SGO_UTILS.safeUpper(atual.PERFIL) !== dados.PERFIL;
    SGO_DATA.log("USUARIOS_ATUALIZAR", sessao.usuario, "Usuário atualizado ID=" + usuarioId + (dados.SENHA ? " (senha trocada)" : "") + (mudouPerfil ? " (perfil " + SGO_UTILS.safeUpper(atual.PERFIL) + " -> " + dados.PERFIL + ")" : ""), "USUARIOS");

    return {
      success: true,
      message: "Usuário atualizado com sucesso." + (mudouPerfil ? " O novo perfil vale para esta pessoa em até 5 minutos (ou no próximo login)." : "")
    };
  }

  function inativar(sessionId, id) {
    const sessao = exigirSessao(sessionId);
    verificarPermissaoAdmin_(sessao);

    const usuarioId = SGO_UTILS.safe(id);
    if (!usuarioId) return { success: false, message: "ID não informado." };

    if (usuarioId === SGO_UTILS.safe(sessao.userId)) { // Corrigido: era sessao.usuarioId e devia ser userId (padrão do SGO_Auth)
      return { success: false, message: "Você não pode inativar seu próprio usuário." };
    }

    const atual = SGO_DATA.getById(SHEET_NAME, usuarioId);
    if (!atual) return { success: false, message: "Usuário não encontrado: pode ter sido alterado por outra pessoa. Atualize a lista." };
    const negado = exigirAdminParaContaAdmin_(sessao, atual.PERFIL, "inativar");
    if (negado) return { success: false, message: negado };
    if (SGO_UTILS.safeUpper(atual.PERFIL) === "ADMIN" && ehUltimoAdminAtivo_(usuarioId)) {
      return { success: false, message: "Não foi possível inativar: este é o único Administrador ativo. Cadastre (ou reative) outro Administrador antes." };
    }

    const ok = SGO_DATA.update(SHEET_NAME, usuarioId, { STATUS: STATUS_INATIVO });
    if (!ok) return { success: false, message: "Não foi possível inativar." };

    SGO_DATA.log("USUARIOS_INATIVAR", sessao.usuario, "Usuário inativado ID=" + usuarioId, "USUARIOS");
    return { success: true, message: "Usuário inativado com sucesso. O acesso dele é encerrado em até 5 minutos." };
  }

  function reativar(sessionId, id) {
    const sessao = exigirSessao(sessionId);
    verificarPermissaoAdmin_(sessao);

    const usuarioId = SGO_UTILS.safe(id);
    const atual = SGO_DATA.getById(SHEET_NAME, usuarioId);
    if (!atual) return { success: false, message: "Usuário não encontrado: pode ter sido alterado por outra pessoa. Atualize a lista." };
    const negado = exigirAdminParaContaAdmin_(sessao, atual.PERFIL, "reativar");
    if (negado) return { success: false, message: negado };

    const ok = SGO_DATA.update(SHEET_NAME, usuarioId, { STATUS: STATUS_ATIVO });
    if (!ok) return { success: false, message: "Não foi possível reativar." };

    SGO_DATA.log("USUARIOS_REATIVAR", sessao.usuario, "Usuário reativado ID=" + usuarioId, "USUARIOS");
    return { success: true, message: "Usuário reativado com sucesso." };
  }

  function excluir(sessionId, id) {
    const sessao = exigirSessao(sessionId);
    verificarPermissaoAdmin_(sessao);

    const usuarioId = SGO_UTILS.safe(id);
    if (usuarioId === SGO_UTILS.safe(sessao.userId)) { // Corrigido: era sessao.usuarioId, agora é userId
      return { success: false, message: "Você não pode excluir sua própria conta." };
    }

    const atual = SGO_DATA.getById(SHEET_NAME, usuarioId);
    if (!atual) return { success: false, message: "Usuário não encontrado: pode ter sido excluído por outra pessoa. Atualize a lista." };
    const negado = exigirAdminParaContaAdmin_(sessao, atual.PERFIL, "excluir");
    if (negado) return { success: false, message: negado };
    if (SGO_UTILS.safeUpper(atual.PERFIL) === "ADMIN" && ehUltimoAdminAtivo_(usuarioId)) {
      return { success: false, message: "Não foi possível excluir: este é o único Administrador ativo. Cadastre outro Administrador antes." };
    }

    const ok = SGO_DATA.remove(SHEET_NAME, usuarioId);
    if (!ok) return { success: false, message: "Não foi possível excluir." };

    SGO_DATA.log("USUARIOS_EXCLUIR", sessao.usuario, "Usuário excluído ID=" + usuarioId + " (" + SGO_UTILS.safe(atual.USUARIO) + ", perfil " + SGO_UTILS.safeUpper(atual.PERFIL) + ")", "USUARIOS");
    return { success: true, message: "Usuário excluído com sucesso." };
  }

  function pesquisar(sessionId, termo) {
    const sessao = exigirSessao(sessionId);
    verificarPermissaoAdmin_(sessao);

    const q = SGO_UTILS.safeLower(termo);
    const registros = SGO_DATA.getAll(SHEET_NAME);

    const base = registros.map(function (u) {
      const clone = Object.assign({}, u);
      delete clone.SENHA;
      return clone;
    });

    if (!q) return { success: true, items: base, total: base.length };

    const filtrados = base.filter(function (r) {
      return [r.USUARIO, r.NOME, r.PERFIL, r.STATUS, r.CELULAR].some(v => SGO_UTILS.safeLower(v).includes(q));
    });

    return { success: true, items: filtrados, total: filtrados.length };
  }

  function listarClientesAtivos(sessionId) {
    exigirSessao(sessionId);
    const clientes = SGO_DATA.getAll(SGO_CFG.SHEETS.CAD_CLIENTES);
    const itens = clientes
      .filter(c => SGO_UTILS.safeUpper(c.STATUS) === SGO_CFG.STATUS.ATIVO)
      .map(c => ({
        ID: SGO_UTILS.safe(c.ID),
        NOME: SGO_UTILS.safe(c.NOME_FANTASIA) || SGO_UTILS.safe(c.RAZAO_SOCIAL),
        CNPJ: SGO_UTILS.safe(c.CNPJ)
      }))
      .sort((a, b) => a.NOME.localeCompare(b.NOME));
    return { success: true, items: itens };
  }

  function normalizarPayload_(payload) {
    payload = payload || {};
    return {
      USUARIO: SGO_UTILS.safeLower(payload.USUARIO),
      SENHA: SGO_UTILS.safe(payload.SENHA), // Removido o Trim da senha para permitir espaços, se o usuário quiser.
      NOME: SGO_UTILS.safeUpper(payload.NOME), // Força o nome completo para maiúsculo
      PERFIL: SGO_UTILS.safeUpper(payload.PERFIL),
      CLIENTE_ID: SGO_UTILS.safe(payload.CLIENTE_ID),
      EMAIL: SGO_UTILS.safeLower(payload.EMAIL).trim(),
      // Sem a chave CELULAR no pedido = "não mexer" (undefined), não "apagar".
      CELULAR: Object.prototype.hasOwnProperty.call(payload, "CELULAR") ? normalizarCelular_(payload.CELULAR) : undefined
    };
  }

  function validarPayload_(dados, isEdicao) {
    const erros = [];
    if (!dados.USUARIO) erros.push("Login é obrigatório.");
    if (!dados.NOME) erros.push("Nome completo é obrigatório.");
    if (!isEdicao && !dados.SENHA) erros.push("Senha é obrigatória para novos usuários.");
    if (!dados.PERFIL) {
      erros.push("Perfil de acesso é obrigatório.");
    } else if (SGO_CFG.PROFILES.indexOf(dados.PERFIL) === -1) {
      erros.push("Perfil de acesso inválido.");
    }
    if (dados.PERFIL === "CLIENTE" && !dados.CLIENTE_ID) erros.push("Vínculo de cliente é obrigatório para este perfil.");
    if (!dados.EMAIL) {
      erros.push("E-mail é obrigatório — usado como identidade do usuário no Portal.");
    } else if (dados.EMAIL.indexOf("@") === -1 || dados.EMAIL.indexOf(".") === -1) {
      erros.push("E-mail inválido.");
    }
    if (dados.CELULAR === null) {
      erros.push("Não foi possível aceitar o celular: informe DDD + número, no formato (11) 98765-4321, ou deixe o campo vazio.");
    }
    return erros;
  }

  function existeUsuarioDuplicado_(usuario, idIgnorado) {
    const alvo = SGO_UTILS.safeLower(usuario);
    if (!alvo) return false;
    const registros = SGO_DATA.getAll(SHEET_NAME);
    return registros.some(r => SGO_UTILS.safeLower(r.USUARIO) === alvo && SGO_UTILS.safe(r.ID) !== SGO_UTILS.safe(idIgnorado));
  }

  function existeEmailDuplicado_(email, idIgnorado) {
    const alvo = SGO_UTILS.safeLower(email);
    if (!alvo) return false;
    const registros = SGO_DATA.getAll(SHEET_NAME);
    return registros.some(r => SGO_UTILS.safeLower(r.EMAIL) === alvo && SGO_UTILS.safe(r.ID) !== SGO_UTILS.safe(idIgnorado));
  }

  return { listar, obter, criar, atualizar, inativar, reativar, excluir, pesquisar, listarClientesAtivos };
})();

/* =========================
   WRAPPERS BLINDADOS (VACINA ANTI-DATA)
========================= */
function usuariosListar(sessionId) { try { return JSON.parse(JSON.stringify(SGO_USUARIOS.listar(sessionId))); } catch(e) { return { success: false, message: SGO_textoFalhaOperador_("concluir a operação com o usuário", e) }; } }
function usuariosObter(sessionId, id) { try { return JSON.parse(JSON.stringify(SGO_USUARIOS.obter(sessionId, id))); } catch(e) { return { success: false, message: SGO_textoFalhaOperador_("concluir a operação com o usuário", e) }; } }
function usuariosCriar(sessionId, payload) { try { return JSON.parse(JSON.stringify(SGO_USUARIOS.criar(sessionId, payload))); } catch(e) { return { success: false, message: SGO_textoFalhaOperador_("concluir a operação com o usuário", e) }; } }
function usuariosAtualizar(sessionId, id, payload) { try { return JSON.parse(JSON.stringify(SGO_USUARIOS.atualizar(sessionId, id, payload))); } catch(e) { return { success: false, message: SGO_textoFalhaOperador_("concluir a operação com o usuário", e) }; } }
function usuariosInativar(sessionId, id) { try { return JSON.parse(JSON.stringify(SGO_USUARIOS.inativar(sessionId, id))); } catch(e) { return { success: false, message: SGO_textoFalhaOperador_("concluir a operação com o usuário", e) }; } }
function usuariosReativar(sessionId, id) { try { return JSON.parse(JSON.stringify(SGO_USUARIOS.reativar(sessionId, id))); } catch(e) { return { success: false, message: SGO_textoFalhaOperador_("concluir a operação com o usuário", e) }; } }
function usuariosExcluir(sessionId, id) { try { return JSON.parse(JSON.stringify(SGO_USUARIOS.excluir(sessionId, id))); } catch(e) { return { success: false, message: SGO_textoFalhaOperador_("concluir a operação com o usuário", e) }; } }
function usuariosPesquisar(sessionId, termo) { try { return JSON.parse(JSON.stringify(SGO_USUARIOS.pesquisar(sessionId, termo))); } catch(e) { return { success: false, message: SGO_textoFalhaOperador_("concluir a operação com o usuário", e) }; } }
function usuariosListarClientesAtivos(sessionId) { try { return JSON.parse(JSON.stringify(SGO_USUARIOS.listarClientesAtivos(sessionId))); } catch(e) { return { success: false, message: SGO_textoFalhaOperador_("concluir a operação com o usuário", e) }; } }