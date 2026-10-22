/* Vínculo de trabalho (CAD_USUARIOS.VINCULO_TRABALHO): valores aceitos e rótulo
   para telas e relatórios (22/10/2026). Fica antes do módulo porque ele lê a
   lista ao carregar. "Diretoria" entrou a pedido do dono: a empresa tem CLT, PJ
   e Diretoria, e o sistema precisa reconhecer os diretores. */
var SGO_VINCULOS_TRABALHO = ["CLT", "PJ", "DIRETORIA"];
var SGO_VINCULO_ROTULOS = { CLT: "CLT", PJ: "PJ", DIRETORIA: "Diretoria" };
/** "CLT" -> "CLT", "DIRETORIA" -> "Diretoria", vazio ou desconhecido -> "Não informado". */
function SGO_rotuloVinculo_(v) {
  var k = String(v === null || v === undefined ? "" : v).replace(/\s+/g, "").toUpperCase();
  return SGO_VINCULO_ROTULOS[k] || "Não informado";
}

const SGO_USUARIOS = (() => {
  const SHEET_NAME = "CAD_USUARIOS";
  const STATUS_ATIVO = "ATIVO";
  const STATUS_INATIVO = "INATIVO";

  // 21/10/2026 (pedido do dono): a rotina de usuários (criar, editar, área,
  // vínculo CLT/PJ/Diretoria, celular, redefinir senha, inativar e reativar) é da gestão
  // e também do RH e do Financeiro (SGO_ehGestaoRotina_ em SGO_Auth.js).
  // Contas e perfis ADMIN e DIRETORIA seguem em exigirAdminParaContaAdmin_;
  // excluir de vez é do Administrador e da Diretoria (exigirExcluir_);
  // ninguém muda o próprio perfil (exigirNaoMudarProprioPerfil_).
  function perfilRotina_(perfil) {
    return typeof SGO_ehGestaoRotina_ === "function" ? SGO_ehGestaoRotina_(perfil) : (perfil === "ADMIN" || perfil === "GESTOR" || perfil === "DIRETORIA");
  }

  function verificarPermissaoAdmin_(sessao) {
    const perfil = SGO_UTILS.safeUpper(sessao.perfil);
    if (!perfilRotina_(perfil)) {
      throw new Error("Acesso negado: as contas de acesso são criadas e alteradas pela gestão (Administrador, Diretoria, Gestor, RH ou Financeiro). Peça a um deles.");
    }
  }

  // Consulta da lista: a mesma regra (a gestão, o RH e o Financeiro).
  function verificarPermissaoConsulta_(sessao) {
    const perfil = SGO_UTILS.safeUpper(sessao.perfil);
    if (!perfilRotina_(perfil)) {
      throw new Error("Acesso negado: a lista de usuários é consultada pelos perfis Administrador, Diretoria, Gestor, RH e Financeiro.");
    }
  }

  // Excluir de vez (some da lista, sem volta): Administrador e Diretoria.
  // Para tirar o acesso, todos da gestão usam Inativar (o histórico fica).
  function exigirExcluir_(sessao) {
    const perfil = SGO_UTILS.safeUpper(sessao.perfil);
    if (perfil === "ADMIN" || perfil === "DIRETORIA") return "";
    return "Não foi possível excluir: excluir uma conta de vez é do Administrador e da Diretoria. Para tirar o acesso desta pessoa, use Mais > Inativar (o histórico fica guardado).";
  }

  // Ninguém muda o próprio perfil (nem se promove): só outro Administrador.
  function exigirNaoMudarProprioPerfil_(sessao, usuarioId, perfilAtual, perfilNovo) {
    if (SGO_UTILS.safe(usuarioId) !== SGO_UTILS.safe(sessao.userId)) return "";
    if (SGO_UTILS.safeUpper(perfilAtual) === SGO_UTILS.safeUpper(perfilNovo)) return "";
    return "Não foi possível salvar: ninguém muda o próprio perfil. Os outros dados da sua conta podem ser alterados; para mudar o seu perfil, peça a outra pessoa da gestão (perfil Administrador ou Diretoria para os perfis de gestão).";
  }

  // VINCULO_TRABALHO (19/10/2026): "CLT", "PJ", "DIRETORIA" (22/10/2026, pedido
  // do dono: a empresa tem CLT, PJ e Diretoria) ou vazio (não informado).
  // O COMMAND lê esta coluna do CAD_USUARIOS pelo mesmo caminho do CELULAR
  // (cmdSgoUsuarios_ em Sgo.js): não mudar o nome. As mensagens da categoria
  // PONTO (SGO_notificar_) só vão para quem é CLT; Diretoria segue a regra do PJ
  // (não bate ponto, não é cobrada pelo WhatsApp; recebe resumo e relatórios).
  const VINCULOS_TRABALHO = SGO_VINCULOS_TRABALHO;
  function normalizarVinculo_(v) {
    const t = SGO_UTILS.safeUpper(v).replace(/\s+/g, "");
    if (!t || t === "NAOINFORMADO" || t === "NÃOINFORMADO") return "";
    return VINCULOS_TRABALHO.indexOf(t) >= 0 ? t : null;
  }

  // CELULAR (WhatsApp) — 2026-10-16. Coluna garantida como as dos outros
  // módulos; formato texto para o "55..." não virar número na planilha.
  // Cache de 6 h: forçar formato a cada chamada já derrubou a Frota.
  function garantirColunaCelular_() {
    try {
      const cache = CacheService.getScriptCache();
      if (cache.get("USR_CELULAR_OK_V3")) return;
      // EMAIL também: o cadastro exige e-mail, mas a coluna só nascia quando a
      // integração Auvo rodava — sem ela o e-mail era descartado em silêncio e
      // toda edição seguinte falhava com "E-mail é obrigatório".
      CertCal_garantirColuna_(SHEET_NAME, "EMAIL");
      CertCal_garantirColuna_(SHEET_NAME, "CELULAR");
      CertCal_forcarColunaTexto_(SHEET_NAME, "CELULAR");
      // Vínculo de trabalho (19/10/2026): acrescenta a coluna no fim, sem apagar nada.
      CertCal_garantirColuna_(SHEET_NAME, "VINCULO_TRABALHO");
      // Área (19/10/2026): fonte única da área da pessoa (SGO_Areas.js), lida pelo
      // Programa de conduta e pelos indicadores. Coluna no fim, sem apagar nada.
      CertCal_garantirColuna_(SHEET_NAME, "AREA");
      SGO_DATA._headersCache = {}; SGO_DATA._headerMapCache = {};
      cache.put("USR_CELULAR_OK_V3", "1", 21600);
    } catch (e) {
      console.warn("Não foi possível garantir a coluna CELULAR: " + e.message);
    }
  }

  /** Código de área ativa (SGO_Areas.js). "" = sem área; null = não existe ou está inativa. */
  function normalizarArea_(v) {
    const t = SGO_UTILS.safe(v);
    if (!t) return "";
    if (typeof Areas_codigoDeTexto_ !== "function") return null;
    try { Areas_garantir_(); } catch (e) {}
    const cod = Areas_codigoDeTexto_(t);
    if (!cod) return null;
    return Areas_todas_().some(function (a) { return a.CODIGO === cod && a.ATIVO; }) ? cod : null;
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
    verificarPermissaoConsulta_(sessao);
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
    verificarPermissaoConsulta_(sessao);

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
    var alvo = SGO_UTILS.safeUpper(perfilAlvo), meu = SGO_UTILS.safeUpper(sessao.perfil);
    // 19/10/2026: a Diretoria decide ocorrência em que é envolvida (Programa de
    // conduta); por isso o perfil Diretoria é dado só por Administrador ou Diretoria
    // — um Gestor não se promove nem promove outra pessoa a Diretoria.
    if (alvo === "DIRETORIA") {
      if (meu === "ADMIN" || meu === "DIRETORIA") return "";
      return "Não foi possível " + acao + ": o perfil Diretoria só é dado ou alterado por um Administrador ou pela Diretoria. Peça ao administrador do sistema.";
    }
    if (alvo !== "ADMIN") return "";
    if (meu === "ADMIN") return "";
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
        VINCULO_TRABALHO: dados.VINCULO_TRABALHO || "",
        // Sem a chave AREA no pedido (cadastro por outra tela ou pela ponte), a área vem do perfil quando ele a diz.
        AREA: dados.PERFIL === "CLIENTE" ? "" : (dados.AREA !== undefined ? (dados.AREA || "") : ((typeof AREAS_POR_PERFIL !== "undefined" && AREAS_POR_PERFIL[dados.PERFIL]) || "")),
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
    dados.VINCULO_TRABALHO = normal.VINCULO_TRABALHO;
    dados.AREA = normal.AREA;
    const erros = validarPayload_(dados, true);

    if (erros.length) {
      return { success: false, message: erros.join(" ") };
    }

    const negado = exigirNaoMudarProprioPerfil_(sessao, usuarioId, atual.PERFIL, dados.PERFIL) ||
      exigirAdminParaContaAdmin_(sessao, atual.PERFIL, "salvar") || exigirAdminParaContaAdmin_(sessao, dados.PERFIL, "salvar");
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
      // Sem a chave no pedido (redefinir senha, por exemplo) o vínculo fica como está.
      VINCULO_TRABALHO: dados.VINCULO_TRABALHO === undefined ? SGO_UTILS.safeUpper(atual.VINCULO_TRABALHO) : dados.VINCULO_TRABALHO,
      // Área: mesma regra (sem a chave no pedido, fica como está).
      AREA: dados.PERFIL === "CLIENTE" ? "" : (dados.AREA === undefined ? SGO_UTILS.safeUpper(atual.AREA) : dados.AREA),
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
    const negado = exigirExcluir_(sessao) || exigirAdminParaContaAdmin_(sessao, atual.PERFIL, "excluir");
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
    verificarPermissaoConsulta_(sessao);
    garantirColunaCelular_();

    const q = SGO_UTILS.safeLower(termo);
    const registros = SGO_DATA.getAll(SHEET_NAME);

    const base = registros.map(function (u) {
      const clone = Object.assign({}, u);
      delete clone.SENHA;
      return clone;
    });

    if (!q) return { success: true, items: base, total: base.length };

    const filtrados = base.filter(function (r) {
      return [r.USUARIO, r.NOME, r.PERFIL, r.STATUS, r.CELULAR, r.VINCULO_TRABALHO, r.AREA].some(v => SGO_UTILS.safeLower(v).includes(q));
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
      CELULAR: Object.prototype.hasOwnProperty.call(payload, "CELULAR") ? normalizarCelular_(payload.CELULAR) : undefined,
      // Mesma regra: sem a chave = não mexer; "" = não informado; null = valor inválido.
      VINCULO_TRABALHO: Object.prototype.hasOwnProperty.call(payload, "VINCULO_TRABALHO") ? normalizarVinculo_(payload.VINCULO_TRABALHO) : undefined,
      // Área (19/10/2026): sem a chave = não mexer; "" = sem área; null = área desconhecida ou inativa.
      AREA: Object.prototype.hasOwnProperty.call(payload, "AREA") ? normalizarArea_(payload.AREA) : undefined
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
    if (dados.AREA === null) {
      erros.push("Área inválida: escolha uma das áreas da lista (Administração > Usuários > Áreas) ou deixe Sem área.");
    }
    if (dados.VINCULO_TRABALHO === null) {
      erros.push("Vínculo de trabalho inválido: escolha CLT, PJ, Diretoria ou Não informado.");
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

/* =========================
   CADASTROS E ADMINISTRAÇÃO 17/10 — tela Usuários
   Lista com perfil, situação, e-mail, celular (WhatsApp) e último acesso.
   Só leitura: a permissão é a mesma da lista (Administrador, Gestor,
   Diretoria e RH, conferida em SGO_USUARIOS.pesquisar); a senha nunca sai daqui.
   O RH só consulta (podeGerir falso): nada de criar, editar ou excluir.
   Último acesso: o LOGIN_OK mais recente de cada login nas últimas 40 mil
   linhas do SYS_LOGS (lido do fim, guardado 60 s).
========================= */
function Usuarios_ultimosAcessos_() {
  var cache = null;
  try { cache = CacheService.getScriptCache(); var c = cache.get("USR_ULTIMO_ACESSO_V1"); if (c) return JSON.parse(c); } catch (e) {}
  var mapa = {};
  try {
    var sh = SGO_DATA.getSheet(SGO_CFG.SHEETS.SYS_LOGS);
    var n = sh ? sh.getLastRow() : 0;
    if (n > 1) {
      var ini = Math.max(2, n - 40000 + 1);
      var vals = sh.getRange(ini, 2, n - ini + 1, 3).getValues(); // DATA, USUARIO, ACAO
      for (var i = vals.length - 1; i >= 0; i--) {
        var r = vals[i];
        if (String(r[2] || "") !== "LOGIN_OK") continue;
        var u = String(r[1] || "").trim().toLowerCase();
        if (!u || mapa[u]) continue;
        mapa[u] = Object.prototype.toString.call(r[0]) === "[object Date]" ? r[0].toISOString() : String(r[0] || "");
      }
    }
  } catch (e) { console.warn("Último acesso dos usuários: " + ((e && e.message) || e)); }
  try { if (cache) cache.put("USR_ULTIMO_ACESSO_V1", JSON.stringify(mapa), 60); } catch (e) {}
  return mapa;
}

/* =========================
   VÍNCULO DIRETORIA (22/10/2026, pedido do dono)
   Quem tem perfil Diretoria, ou é responsável pelo sistema (SGO_DONOS em
   SGO_Chaves.js), e está sem vínculo de trabalho é da Diretoria: a tela sugere
   e a rotina preenche sozinha, uma vez, com registro no SYS_LOGS (quem:
   sistema; motivo: perfil Diretoria). Vínculo já informado nunca é trocado.
========================= */
var USR_SANEAMENTO_VINCULO_DIRETORIA = "USR_VINCULO_DIRETORIA_20261022";

/** "DIRETORIA" quando o vínculo está vazio e a conta é da Diretoria (perfil) ou do responsável pelo sistema; senão "". */
function Usuarios_vinculoSugerido_(u) {
  if (!u) return "";
  var perfil = SGO_UTILS.safeUpper(u.PERFIL);
  if (perfil === "CLIENTE" || perfil === "AUVO_SYNC") return "";
  if (SGO_UTILS.safeUpper(u.VINCULO_TRABALHO).replace(/\s+/g, "")) return "";
  var login = SGO_UTILS.safeLower(u.USUARIO).trim();
  var dono = false;
  try { dono = typeof Chaves_ehDonoUsuario_ === "function" ? Chaves_ehDonoUsuario_(login) : login === "admin"; } catch (e) { dono = false; }
  return perfil === "DIRETORIA" || dono ? "DIRETORIA" : "";
}

/**
 * Preenche com DIRETORIA o vínculo vazio de quem tem perfil Diretoria (ou é o responsável pelo sistema).
 * Roda uma vez (propriedade USR_VINCULO_DIRETORIA_20261022), chamada pela tela Usuários e pela rotina diária
 * do Programa de conduta. Nunca lança; devolve { aplicado, logins }.
 */
function Usuarios_saneamentoVinculoDiretoria_() {
  var r = { aplicado: false, logins: [] };
  var props = null;
  try { props = PropertiesService.getScriptProperties(); if (props.getProperty(USR_SANEAMENTO_VINCULO_DIRETORIA) === "1") return r; } catch (e) { props = null; }
  try {
    var aba = SGO_CFG.SHEETS.CAD_USUARIOS || "CAD_USUARIOS";
    SGO_DATA.getAll(aba).forEach(function (u) {
      if (Usuarios_vinculoSugerido_(u) !== "DIRETORIA") return;
      var login = SGO_UTILS.safeLower(u.USUARIO).trim();
      if (!SGO_DATA.update(aba, SGO_UTILS.safe(u.ID), { VINCULO_TRABALHO: "DIRETORIA" })) return;
      r.logins.push(login);
      SGO_DATA.log("USUARIOS_VINCULO_AUTO", "sistema", "Vínculo de trabalho preenchido com Diretoria: " + login + " (estava Não informado; motivo: " + (SGO_UTILS.safeUpper(u.PERFIL) === "DIRETORIA" ? "perfil Diretoria" : "responsável pelo sistema") + ")", "USUARIOS");
    });
    r.aplicado = true;
    if (props) props.setProperty(USR_SANEAMENTO_VINCULO_DIRETORIA, "1");
    SGO_DATA.log("USUARIOS_VINCULO_AUTO", "sistema", r.logins.length ? "Diretoria preenchida em: " + r.logins.join(", ") : "nada a preencher", "USUARIOS");
  } catch (e) { console.warn("Vínculo Diretoria (saneamento): " + ((e && e.message) || e)); }
  return r;
}

function usuariosPainel(sessionId) {
  try {
    var sessao = exigirSessao(sessionId);
    var base = SGO_USUARIOS.pesquisar(sessionId, "");
    if (!base || !base.success) return base || { success: false, message: "Não foi possível carregar os usuários." };
    // 22/10/2026: a primeira abertura da tela depois da publicação preenche o vínculo Diretoria de quem está sem (uma vez).
    try { if (Usuarios_saneamentoVinculoDiretoria_().logins.length) base = SGO_USUARIOS.pesquisar(sessionId, ""); } catch (eSan) {}
    var souAdmin = SGO_UTILS.safeUpper(sessao.perfil) === "ADMIN";
    // 19/10/2026: o perfil Diretoria é dado só por Administrador ou Diretoria (exigirAdminParaContaAdmin_).
    var podeDarDiretoria = souAdmin || SGO_UTILS.safeUpper(sessao.perfil) === "DIRETORIA";
    // 21/10/2026: a gestão, o RH e o Financeiro criam e alteram contas (rotina da empresa); excluir de vez, só
    // Administrador e Diretoria; o próprio perfil ninguém muda (a tela trava o campo).
    var podeGerir = typeof SGO_ehGestaoRotina_ === "function" ? SGO_ehGestaoRotina_(sessao.perfil) : isAdminPerfilAuth_(sessao.perfil);
    var podeExcluir = souAdmin || SGO_UTILS.safeUpper(sessao.perfil) === "DIRETORIA";
    var acessos = Usuarios_ultimosAcessos_();
    // Áreas (19/10/2026): lista para o formulário e nomes para a coluna da lista.
    var areasAtivas = [], nomesAreas = {};
    try { Areas_garantir_(); areasAtivas = Areas_todas_().filter(function (a) { return a.ATIVO; }); nomesAreas = Areas_mapaNomes_(); } catch (eAr) { console.warn("Áreas: " + ((eAr && eAr.message) || eAr)); }
    var clientes = {};
    try { SGO_DATA.getAll(SGO_CFG.SHEETS.CAD_CLIENTES).forEach(function (c) { clientes[SGO_UTILS.safe(c.ID)] = SGO_UTILS.safe(c.NOME_FANTASIA) || SGO_UTILS.safe(c.RAZAO_SOCIAL); }); } catch (e) {}
    var ativosAdmin = (base.items || []).filter(function (u) { return SGO_UTILS.safeUpper(u.PERFIL) === "ADMIN" && SGO_UTILS.safeUpper(u.STATUS) === "ATIVO"; }).length;
    var itens = (base.items || []).map(function (u) {
      var o = {};
      Object.keys(u).forEach(function (k) { if (k !== "SENHA") { var v = u[k]; o[k] = Object.prototype.toString.call(v) === "[object Date]" ? v.toISOString() : v; } });
      var perfil = SGO_UTILS.safeUpper(u.PERFIL);
      o.ULTIMO_ACESSO = acessos[SGO_UTILS.safeLower(u.USUARIO)] || "";
      o.CLIENTE_NOME = perfil === "CLIENTE" ? (clientes[SGO_UTILS.safe(u.CLIENTE_ID)] || "") : "";
      o.SEM_CELULAR = !String(u.CELULAR || "").replace(/\D/g, "");
      o.EU = SGO_UTILS.safe(u.ID) === SGO_UTILS.safe(sessao.userId);
      // Conta de Administrador só é alterada por Administrador (a regra vale no servidor; aqui só orienta a tela).
      o.PODE_ALTERAR = podeGerir && (souAdmin || perfil !== "ADMIN") && (podeDarDiretoria || perfil !== "DIRETORIA");
      o.VINCULO_TRABALHO = SGO_UTILS.safeUpper(u.VINCULO_TRABALHO).replace(/\s+/g, "");
      o.VINCULO_ROTULO = SGO_rotuloVinculo_(o.VINCULO_TRABALHO);
      // 22/10/2026: conta da Diretoria (ou do responsável pelo sistema) sem vínculo: a tela sugere "Diretoria".
      o.VINCULO_SUGERIDO = Usuarios_vinculoSugerido_(u);
      var ar = perfil === "CLIENTE" ? { codigo: "", nome: "" } : (typeof SGO_areaDoUsuario_ === "function" ? SGO_areaDoUsuario_(u, nomesAreas) : { codigo: SGO_UTILS.safeUpper(u.AREA), nome: SGO_UTILS.safe(u.AREA) });
      o.AREA = ar.codigo;
      o.AREA_NOME = ar.codigo ? ar.nome : "";
      o.ULTIMO_ADMIN = perfil === "ADMIN" && SGO_UTILS.safeUpper(u.STATUS) === "ATIVO" && ativosAdmin === 1;
      return o;
    });
    itens.sort(function (a, b) {
      var sa = SGO_UTILS.safeUpper(a.STATUS) === "ATIVO" ? 0 : 1, sb = SGO_UTILS.safeUpper(b.STATUS) === "ATIVO" ? 0 : 1;
      return sa - sb || SGO_UTILS.safe(a.NOME).localeCompare(SGO_UTILS.safe(b.NOME), "pt-BR");
    });
    return JSON.parse(JSON.stringify({ success: true, items: itens, total: itens.length, souAdmin: souAdmin, podeDarDiretoria: podeDarDiretoria, podeGerir: podeGerir, podeExcluir: podeExcluir,
      areas: areasAtivas, podeGerirAreas: SGO_podeConsultarPessoas_(sessao.perfil),
      perfis: (SGO_CFG.PROFILES || []).filter(function (p) { var k = SGO_UTILS.safeUpper(p); return (souAdmin || k !== "ADMIN") && (podeDarDiretoria || k !== "DIRETORIA"); }) }));
  } catch (e) {
    return { success: false, message: SGO_textoFalhaOperador_("carregar os usuários", e) };
  }
}
