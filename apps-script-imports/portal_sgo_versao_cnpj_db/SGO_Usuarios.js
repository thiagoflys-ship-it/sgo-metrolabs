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
      if (cache.get("USR_CELULAR_OK_V1")) return;
      CertCal_garantirColuna_(SHEET_NAME, "CELULAR");
      CertCal_forcarColunaTexto_(SHEET_NAME, "CELULAR");
      cache.put("USR_CELULAR_OK_V1", "1", 21600);
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

  function criar(sessionId, payload) {
    const sessao = exigirSessao(sessionId);
    verificarPermissaoAdmin_(sessao);
    garantirColunaCelular_();

    const dados = normalizarPayload_(payload);
    const erros = validarPayload_(dados, false);

    if (erros.length) {
      return { success: false, message: erros.join(" ") };
    }

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
        CLIENTE_ID: dados.CLIENTE_ID,
        EMAIL: dados.EMAIL,
        CELULAR: dados.CELULAR || "",
        STATUS: STATUS_ATIVO
      })
    );

    SGO_DATA.insert(SHEET_NAME, registro);
    // Módulo corrigido
    SGO_DATA.log("USUARIOS_CRIAR", sessao.usuario, "Usuário criado: " + registro.USUARIO, "USUARIOS");

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

    const dados = normalizarPayload_(payload);
    const erros = validarPayload_(dados, true); 

    if (erros.length) {
      return { success: false, message: erros.join(" ") };
    }

    if (existeUsuarioDuplicado_(dados.USUARIO, usuarioId)) {
      return { success: false, message: "Já existe outra conta usando este nome de usuário (login)." };
    }

    if (existeEmailDuplicado_(dados.EMAIL, usuarioId)) {
      return { success: false, message: "Já existe outra conta usando este e-mail." };
    }

    const novosDados = SGO_DATA.normalizarObjetoParaSheet(SHEET_NAME, {
      ID: usuarioId,
      USUARIO: dados.USUARIO,
      SENHA: dados.SENHA ? gerarHashSenhaAuth_(dados.SENHA) : atual.SENHA, // SEGURANCA: hash na troca; mantém hash atual se não alterada
      NOME: dados.NOME,
      PERFIL: dados.PERFIL,
      CLIENTE_ID: dados.CLIENTE_ID,
      EMAIL: dados.EMAIL,
      CELULAR: dados.CELULAR === undefined ? SGO_UTILS.safe(atual.CELULAR) : dados.CELULAR,
      STATUS: SGO_UTILS.safeUpper(atual.STATUS) || STATUS_ATIVO,
      CRIADO_EM: atual.CRIADO_EM
    });

    const ok = SGO_DATA.update(SHEET_NAME, usuarioId, novosDados);

    if (!ok) {
      return { success: false, message: "Não foi possível atualizar o usuário." };
    }

    SGO_DATA.log("USUARIOS_ATUALIZAR", sessao.usuario, "Usuário atualizado ID=" + usuarioId, "USUARIOS");

    return {
      success: true,
      message: "Usuário atualizado com sucesso."
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

    const ok = SGO_DATA.update(SHEET_NAME, usuarioId, { STATUS: STATUS_INATIVO });
    if (!ok) return { success: false, message: "Não foi possível inativar." };

    SGO_DATA.log("USUARIOS_INATIVAR", sessao.usuario, "Usuário inativado ID=" + usuarioId, "USUARIOS");
    return { success: true, message: "Usuário inativado com sucesso." };
  }

  function reativar(sessionId, id) {
    const sessao = exigirSessao(sessionId);
    verificarPermissaoAdmin_(sessao);

    const usuarioId = SGO_UTILS.safe(id);
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

    const ok = SGO_DATA.remove(SHEET_NAME, usuarioId);
    if (!ok) return { success: false, message: "Não foi possível excluir." };

    SGO_DATA.log("USUARIOS_EXCLUIR", sessao.usuario, "Usuário excluído ID=" + usuarioId, "USUARIOS");
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
function usuariosListar(sessionId) { try { return JSON.parse(JSON.stringify(SGO_USUARIOS.listar(sessionId))); } catch(e) { return { success: false, message: "Erro: " + e.message }; } }
function usuariosObter(sessionId, id) { try { return JSON.parse(JSON.stringify(SGO_USUARIOS.obter(sessionId, id))); } catch(e) { return { success: false, message: "Erro: " + e.message }; } }
function usuariosCriar(sessionId, payload) { try { return JSON.parse(JSON.stringify(SGO_USUARIOS.criar(sessionId, payload))); } catch(e) { return { success: false, message: "Erro: " + e.message }; } }
function usuariosAtualizar(sessionId, id, payload) { try { return JSON.parse(JSON.stringify(SGO_USUARIOS.atualizar(sessionId, id, payload))); } catch(e) { return { success: false, message: "Erro: " + e.message }; } }
function usuariosInativar(sessionId, id) { try { return JSON.parse(JSON.stringify(SGO_USUARIOS.inativar(sessionId, id))); } catch(e) { return { success: false, message: "Erro: " + e.message }; } }
function usuariosReativar(sessionId, id) { try { return JSON.parse(JSON.stringify(SGO_USUARIOS.reativar(sessionId, id))); } catch(e) { return { success: false, message: "Erro: " + e.message }; } }
function usuariosExcluir(sessionId, id) { try { return JSON.parse(JSON.stringify(SGO_USUARIOS.excluir(sessionId, id))); } catch(e) { return { success: false, message: "Erro: " + e.message }; } }
function usuariosPesquisar(sessionId, termo) { try { return JSON.parse(JSON.stringify(SGO_USUARIOS.pesquisar(sessionId, termo))); } catch(e) { return { success: false, message: "Erro: " + e.message }; } }
function usuariosListarClientesAtivos(sessionId) { try { return JSON.parse(JSON.stringify(SGO_USUARIOS.listarClientesAtivos(sessionId))); } catch(e) { return { success: false, message: "Erro: " + e.message }; } }