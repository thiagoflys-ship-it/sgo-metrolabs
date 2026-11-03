/* Vínculo de trabalho (CAD_USUARIOS.VINCULO_TRABALHO): valores aceitos e rótulo
   para telas e relatórios (22/10/2026). Fica antes do módulo porque ele lê a
   lista ao carregar. "Diretoria" entrou a pedido do dono: a empresa tem CLT, PJ
   e Diretoria, e o sistema precisa reconhecer os diretores. */
// 03/11/2026 (pedido do dono): "Cliente" e "Representante" para as contas de fora da Metrolabs (perfil Cliente e perfil
// Representada). Valem só para identificar a conta: nada que hoje vai só para CLT (ponto, WhatsApp de atividades e da
// gestão, resumo da matriz) passa a incluir esses dois vínculos (SGO_Notificar.js, SGO_Ponto_Config.js, ATV_VINCULOS_OPCOES).
var SGO_VINCULOS_TRABALHO = ["CLT", "PJ", "DIRETORIA", "CLIENTE", "REPRESENTANTE"];
var SGO_VINCULO_ROTULOS = { CLT: "CLT", PJ: "PJ", DIRETORIA: "Diretoria", CLIENTE: "Cliente", REPRESENTANTE: "Representante" };
/** Vínculos das contas de fora da Metrolabs e o perfil que cada um exige. */
var SGO_VINCULOS_EXTERNOS = { CLIENTE: "CLIENTE", REPRESENTANTE: "REPRESENTADA" };
/** Perfil de fora da Metrolabs e o vínculo que ele tem (sugerido e preenchido quando a conta está sem vínculo). */
var SGO_PERFIL_VINCULO_EXTERNO = { CLIENTE: "CLIENTE", REPRESENTADA: "REPRESENTANTE" };
/** Colunas da exclusão lógica de conta (03/11/2026), acrescentadas no fim de CAD_USUARIOS. */
var USR_COLUNAS_EXCLUSAO = ["EXCLUIDO_EM", "EXCLUIDO_POR", "EXCLUIDO_POR_ID", "EXCLUIDO_MOTIVO", "SITUACAO_ANTES_EXCLUSAO"];

/**
 * Combinação perfil x vínculo de trabalho que não faz sentido ("" = coerente). Vínculo vazio é sempre aceito (contas
 * antigas; a tela sugere e a rotina preenche). A mensagem diz o que corrigir.
 */
function Usuarios_vinculoIncoerente_(perfil, vinculo) {
  var p = String(perfil || "").trim().toUpperCase(), v = String(vinculo || "").replace(/\s+/g, "").toUpperCase();
  if (!v || !p) return "";
  var rotP = { CLIENTE: "Cliente", REPRESENTADA: "Representada" };
  if (SGO_VINCULOS_EXTERNOS[v] && SGO_VINCULOS_EXTERNOS[v] !== p) {
    return v === "CLIENTE"
      ? "Vínculo de trabalho incoerente: o vínculo Cliente é só da conta de cliente (perfil Cliente, ligada à empresa). O que corrigir: escolha o perfil Cliente e a empresa, ou troque o vínculo para CLT, PJ, Diretoria ou Não informado."
      : "Vínculo de trabalho incoerente: o vínculo Representante é só da conta da representada (perfil Representada, com a representada e o papel nela). O que corrigir: escolha o perfil Representada, a representada e o papel, ou troque o vínculo para CLT, PJ, Diretoria ou Não informado.";
  }
  if (SGO_PERFIL_VINCULO_EXTERNO[p] && SGO_PERFIL_VINCULO_EXTERNO[p] !== v) {
    return "Vínculo de trabalho incoerente: a conta com perfil " + rotP[p] + " é de fora da Metrolabs e tem o vínculo " + SGO_rotuloVinculo_(SGO_PERFIL_VINCULO_EXTERNO[p]) + " (não " + SGO_rotuloVinculo_(v) +
      "). O que corrigir: escolha o vínculo " + SGO_rotuloVinculo_(SGO_PERFIL_VINCULO_EXTERNO[p]) + " (ou Não informado), ou troque o perfil se a pessoa é da equipe.";
  }
  return "";
}

/** "2026-11-03T14:05:00..." -> "03/11/2026 às 14:05" (horário de Brasília quando der). */
function Usuarios_dataBr_(v) {
  var t = String(v || "");
  if (!t) return "data não registrada";
  try { var d = new Date(t); if (!isNaN(d.getTime()) && typeof Utilities !== "undefined" && Utilities.formatDate) return Utilities.formatDate(d, "America/Sao_Paulo", "dd/MM/yyyy 'às' HH:mm"); } catch (e) {}
  var m = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/.exec(t);
  return m ? m[3] + "/" + m[2] + "/" + m[1] + (m[4] ? " às " + m[4] + ":" + m[5] : "") : t;
}

/** Marca de curta duração lida por validarSessao a cada chamada: a sessão da conta excluída cai na hora, sem esperar 5 minutos. */
function Usuarios_marcarExcluida_(usuarioId) {
  try { CacheService.getScriptCache().put("SGO_CONTA_EXCLUIDA_" + String(usuarioId || "").trim(), "1", 21600); } catch (e) {}
}
function Usuarios_contaExcluidaAgora_(usuarioId) {
  try { return !!String(usuarioId || "").trim() && CacheService.getScriptCache().get("SGO_CONTA_EXCLUIDA_" + String(usuarioId || "").trim()) === "1"; } catch (e) { return false; }
}
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

  // Excluir a conta (some da lista e dos seletores, sem volta): só o Administrador (03/11/2026, pedido do dono; antes
  // também a Diretoria). Para tirar o acesso, todos da gestão usam Inativar (o histórico fica).
  function exigirExcluir_(sessao) {
    const perfil = SGO_UTILS.safeUpper(sessao.perfil);
    if (perfil === "ADMIN") return "";
    return "Não foi possível excluir: excluir uma conta é só do Administrador. Para tirar o acesso desta pessoa, use Mais > Inativar (o histórico fica guardado) ou peça ao Administrador.";
  }
  function ehExcluida_(u) { return !!(u && SGO_UTILS.safe(u.EXCLUIDO_EM)); }
  function msgExcluida_(u, acao) {
    return "Não foi possível " + acao + ": a conta de " + (SGO_UTILS.safe(u.NOME) || "esta pessoa") + " foi excluída em " + Usuarios_dataBr_(u.EXCLUIDO_EM) + (SGO_UTILS.safe(u.EXCLUIDO_POR) ? " por " + SGO_UTILS.safe(u.EXCLUIDO_POR) : "") +
      ". Conta excluída fica só para consulta (filtro Excluídos) e não volta. O que fazer: se a pessoa precisa de acesso de novo, cadastre uma conta nova (o mesmo e-mail pode ser usado).";
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
  // 03/11/2026: "CLIENTE" (exige o perfil Cliente e a empresa) e "REPRESENTANTE" (exige o perfil Representada, a
  // representada e o papel): combinação incoerente é recusada em validarPayload_ com o que corrigir.
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
      if (cache.get("USR_CELULAR_OK_V5")) return;
      // EMAIL também: o cadastro exige e-mail, mas a coluna só nascia quando a
      // integração Auvo rodava — sem ela o e-mail era descartado em silêncio e
      // toda edição seguinte falhava com "E-mail é obrigatório".
      CertCal_garantirColuna_(SHEET_NAME, "EMAIL");
      CertCal_garantirColuna_(SHEET_NAME, "CELULAR");
      // 29/10/2026 (módulo Representação): conta da representada ligada à empresa e o papel dela
      CertCal_garantirColuna_(SHEET_NAME, "REPRESENTADA_ID");
      CertCal_garantirColuna_(SHEET_NAME, "REPRESENTACAO_PAPEL");
      CertCal_forcarColunaTexto_(SHEET_NAME, "CELULAR");
      // Vínculo de trabalho (19/10/2026): acrescenta a coluna no fim, sem apagar nada.
      CertCal_garantirColuna_(SHEET_NAME, "VINCULO_TRABALHO");
      // Área (19/10/2026): fonte única da área da pessoa (SGO_Areas.js), lida pelo
      // Programa de conduta e pelos indicadores. Coluna no fim, sem apagar nada.
      CertCal_garantirColuna_(SHEET_NAME, "AREA");
      // 03/11/2026: exclusão de conta com vínculo (exclusão lógica): quando, quem e o motivo; a linha fica (o nome segue nos registros)
      USR_COLUNAS_EXCLUSAO.forEach(function (c) { CertCal_garantirColuna_(SHEET_NAME, c); });
      SGO_DATA._headersCache = {}; SGO_DATA._headerMapCache = {};
      // (antes conferia V4 e gravava V3: a garantia rodava em toda chamada)
      cache.put("USR_CELULAR_OK_V5", "1", 21600);
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
    // 03/11/2026: perfil Cliente ou Representada com o vínculo vazio já nasce com o vínculo da conta de fora (Cliente/Representante)
    if (!dados.VINCULO_TRABALHO && dados.VINCULO_TRABALHO !== null && SGO_PERFIL_VINCULO_EXTERNO[dados.PERFIL]) dados.VINCULO_TRABALHO = SGO_PERFIL_VINCULO_EXTERNO[dados.PERFIL];
    const erros = validarPayload_(dados, false);

    if (erros.length) {
      return { success: false, message: erros.join(" ") };
    }

    const negado = exigirAdminParaContaAdmin_(sessao, dados.PERFIL, "cadastrar");
    if (negado) return { success: false, message: negado };

    // 31/10/2026 (login pelo e-mail): o e-mail é a identidade e precisa ser único; o identificador interno (USUARIO)
    // é gerado a partir dele e não aparece para ninguém.
    const dupEmail = contaComEmail_(dados.EMAIL, "");
    if (dupEmail) return { success: false, message: mensagemEmailRepetido_(dupEmail) };
    if (!dados.USUARIO) dados.USUARIO = gerarLoginInterno_(dados.EMAIL);

    if (existeUsuarioDuplicado_(dados.USUARIO, "")) {
      return { success: false, message: "Não foi possível cadastrar agora: o identificador interno gerado já existe. Tente salvar de novo." };
    }

    // 31/10/2026 (segurança do acesso): a senha que a gestão define é provisória — a pessoa cria a dela no 1º login
    if (typeof SegAcesso_garantirEstrutura_ === "function") SegAcesso_garantirEstrutura_();
    const registro = SGO_DATA.normalizarObjetoParaSheet(
      SHEET_NAME,
      SGO_DATA.gerarRegistroBase({
        USUARIO: dados.USUARIO,
        SENHA: gerarHashSenhaAuth_(dados.SENHA), // SEGURANCA: nunca grava senha em texto plano
        PRECISA_TROCAR_SENHA: "SIM",
        NOME: dados.NOME,
        PERFIL: dados.PERFIL,
        CLIENTE_ID: dados.PERFIL === "CLIENTE" ? dados.CLIENTE_ID : "",
        REPRESENTADA_ID: dados.PERFIL === "REPRESENTADA" ? dados.REPRESENTADA_ID : "",
        REPRESENTACAO_PAPEL: dados.PERFIL === "REPRESENTADA" ? dados.REPRESENTACAO_PAPEL : "",
        EMAIL: dados.EMAIL,
        CELULAR: dados.CELULAR || "",
        VINCULO_TRABALHO: dados.VINCULO_TRABALHO || "",
        // Sem a chave AREA no pedido (cadastro por outra tela ou pela ponte), a área vem do perfil quando ele a diz.
        AREA: dados.PERFIL === "CLIENTE" || dados.PERFIL === "REPRESENTADA" ? "" : (dados.AREA !== undefined ? (dados.AREA || "") : ((typeof AREAS_POR_PERFIL !== "undefined" && AREAS_POR_PERFIL[dados.PERFIL]) || "")),
        STATUS: STATUS_ATIVO
      })
    );

    SGO_DATA.insert(SHEET_NAME, registro);
    // Módulo corrigido
    SGO_DATA.log("USUARIOS_CRIAR", sessao.usuario, "Usuário criado: " + registro.NOME + " <" + registro.EMAIL + "> (perfil " + registro.PERFIL + ", login interno " + registro.USUARIO + ")", "USUARIOS");

    return {
      success: true,
      email: registro.EMAIL,
      message: "Usuário cadastrado com sucesso. A pessoa entra com o e-mail " + registro.EMAIL + " e a senha inicial, que é provisória: no primeiro acesso ela cria a senha dela."
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
    const dados = SGO_DATA.mesclarCampos_(atual, normal, payload, ["NOME", "PERFIL", "CLIENTE_ID", "REPRESENTADA_ID", "REPRESENTACAO_PAPEL", "EMAIL"]);
    // 31/10/2026 (login pelo e-mail): o identificador interno (USUARIO) não muda na edição — histórico, auditoria,
    // Frota, Conduta e avisos guardam o login; trocar quebraria as referências. Conta antiga sem ele ganha um agora.
    dados.USUARIO = SGO_UTILS.safeLower(atual.USUARIO) || gerarLoginInterno_(dados.EMAIL || atual.EMAIL);
    dados.PERFIL = SGO_UTILS.safeUpper(dados.PERFIL);
    dados.EMAIL = emailNormal_(dados.EMAIL);
    dados.SENHA = normal.SENHA;
    dados.CELULAR = normal.CELULAR;
    dados.VINCULO_TRABALHO = normal.VINCULO_TRABALHO;
    dados.AREA = normal.AREA;
    if (ehExcluida_(atual)) return { success: false, message: msgExcluida_(atual, "salvar") };
    // 03/11/2026: coerência perfil x vínculo (Cliente/Representante) conferida quando o pedido mexe no perfil ou no vínculo;
    // perfil de fora com o vínculo vazio é alinhado (Cliente -> Cliente, Representada -> Representante)
    if (dados.VINCULO_TRABALHO !== null) {
      const mexeu = Object.prototype.hasOwnProperty.call(payload, "PERFIL") || Object.prototype.hasOwnProperty.call(payload, "VINCULO_TRABALHO");
      let efetivo = dados.VINCULO_TRABALHO === undefined ? SGO_UTILS.safeUpper(atual.VINCULO_TRABALHO).replace(/\s+/g, "") : dados.VINCULO_TRABALHO;
      if (!efetivo && SGO_PERFIL_VINCULO_EXTERNO[dados.PERFIL]) { efetivo = SGO_PERFIL_VINCULO_EXTERNO[dados.PERFIL]; if (mexeu) dados.VINCULO_TRABALHO = efetivo; }
      dados.VINCULO_EFETIVO = mexeu ? efetivo : "";
    }
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

    const dupEmail = contaComEmail_(dados.EMAIL, usuarioId);
    if (dupEmail) return { success: false, message: mensagemEmailRepetido_(dupEmail) };

    // 31/10/2026 (segurança do acesso): senha redefinida pela gestão para OUTRA pessoa é provisória (troca obrigatória
    // no próximo login) e derruba as sessões e os aparelhos confiados dela; a própria senha trocada aqui não marca.
    const senhaDeOutro = !!dados.SENHA && usuarioId !== SGO_UTILS.safe(sessao.userId);
    // 31/10/2026 (pedido do dono, redefinição pelo e-mail): a senha provisória fica só para quem NÃO tem e-mail válido.
    // Quem tem e-mail recebe o link ("Enviar link de redefinição"): a gestão não fica sabendo a senha de ninguém.
    if (senhaDeOutro && emailValido_(atual.EMAIL)) {
      return { success: false, message: "Esta pessoa tem e-mail cadastrado: use \"Enviar link de redefinição\" (Mais ações). A senha provisória fica só para quem não tem e-mail." };
    }
    if (dados.SENHA && typeof SegAcesso_garantirEstrutura_ === "function") SegAcesso_garantirEstrutura_();
    // Object.assign sobre o registro atual: colunas que outros módulos
    // acrescentem em CAD_USUARIOS ficam como estão.
    const novosDados = Object.assign({}, atual, {
      ID: usuarioId,
      USUARIO: dados.USUARIO,
      SENHA: dados.SENHA ? gerarHashSenhaAuth_(dados.SENHA) : atual.SENHA, // SEGURANCA: hash na troca; mantém hash atual se não alterada
      NOME: dados.NOME,
      PERFIL: dados.PERFIL,
      CLIENTE_ID: dados.PERFIL === "CLIENTE" ? dados.CLIENTE_ID : "",
      REPRESENTADA_ID: dados.PERFIL === "REPRESENTADA" ? dados.REPRESENTADA_ID : "",
      REPRESENTACAO_PAPEL: dados.PERFIL === "REPRESENTADA" ? dados.REPRESENTACAO_PAPEL : "",
      EMAIL: dados.EMAIL,
      CELULAR: dados.CELULAR === undefined ? SGO_UTILS.safe(atual.CELULAR) : dados.CELULAR,
      // Sem a chave no pedido (redefinir senha, por exemplo) o vínculo fica como está.
      VINCULO_TRABALHO: dados.VINCULO_TRABALHO === undefined ? SGO_UTILS.safeUpper(atual.VINCULO_TRABALHO) : dados.VINCULO_TRABALHO,
      // Área: mesma regra (sem a chave no pedido, fica como está).
      AREA: dados.PERFIL === "CLIENTE" || dados.PERFIL === "REPRESENTADA" ? "" : (dados.AREA === undefined ? SGO_UTILS.safeUpper(atual.AREA) : dados.AREA),
      STATUS: SGO_UTILS.safeUpper(atual.STATUS) || STATUS_ATIVO,
      CRIADO_EM: atual.CRIADO_EM
    }, senhaDeOutro ? { PRECISA_TROCAR_SENHA: "SIM", SEGURANCA_VERSAO: String((Number(atual.SEGURANCA_VERSAO) || 0) + 1) } : {});

    const ok = SGO_DATA.update(SHEET_NAME, usuarioId, novosDados);

    if (!ok) {
      return { success: false, message: "Não foi possível atualizar o usuário." };
    }

    const mudouPerfil = SGO_UTILS.safeUpper(atual.PERFIL) !== dados.PERFIL;
    SGO_DATA.log("USUARIOS_ATUALIZAR", sessao.usuario, "Usuário atualizado ID=" + usuarioId + (dados.SENHA ? " (senha trocada)" : "") + (mudouPerfil ? " (perfil " + SGO_UTILS.safeUpper(atual.PERFIL) + " -> " + dados.PERFIL + ")" : ""), "USUARIOS");

    if (senhaDeOutro && typeof SegAcesso_registrar_ === "function") SegAcesso_registrar_("TROCA_EXIGIDA", { ID: usuarioId, USUARIO: dados.USUARIO, PERFIL: dados.PERFIL }, null, "Senha provisória definida pela gestão em Usuários (conta sem e-mail; a pessoa cria a dela no próximo login).", SGO_UTILS.safe(sessao.nome) || SGO_UTILS.safe(sessao.usuario));
    // as sessões abertas com a senha antiga caem na hora (antes, em até 5 minutos pela versão de segurança)
    if (senhaDeOutro && typeof SegAcesso_derrubarSessoes_ === "function") SegAcesso_derrubarSessoes_(usuarioId, "", "");
    return {
      success: true,
      message: "Usuário atualizado com sucesso." + (mudouPerfil ? " O novo perfil vale para esta pessoa em até 5 minutos (ou no próximo login)." : "") +
        (senhaDeOutro ? " A senha nova é provisória: no próximo login a pessoa cria a senha dela (as sessões abertas com a senha antiga terminam)." : "")
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
    if (ehExcluida_(atual)) return { success: false, message: msgExcluida_(atual, "inativar") };
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
    // 03/11/2026: conta excluída não volta (só consulta); a pessoa ganha uma conta nova se precisar
    if (ehExcluida_(atual)) return { success: false, message: msgExcluida_(atual, "reativar") };
    const negado = exigirAdminParaContaAdmin_(sessao, atual.PERFIL, "reativar");
    if (negado) return { success: false, message: negado };
    // 31/10/2026 (login pelo e-mail): duas contas ativas com o mesmo e-mail não entram; não reativa por cima de outra
    const outraAtiva = emailValido_(atual.EMAIL) ? SGO_DATA.getAll(SHEET_NAME).filter(function (r) {
      return SGO_UTILS.safe(r.ID) !== usuarioId && SGO_UTILS.safeUpper(r.STATUS) === STATUS_ATIVO && emailNormal_(r.EMAIL) === emailNormal_(atual.EMAIL);
    })[0] : null;
    if (outraAtiva) return { success: false, message: "Não foi possível reativar: o e-mail desta conta (" + emailNormal_(atual.EMAIL) + ") já é da conta ativa de " + SGO_UTILS.safe(outraAtiva.NOME) + ". O e-mail é a entrada no SGO+ e não pode ficar em duas contas ativas. O que fazer: troque o e-mail de uma delas (Editar) e reative de novo." };

    const ok = SGO_DATA.update(SHEET_NAME, usuarioId, { STATUS: STATUS_ATIVO });
    if (!ok) return { success: false, message: "Não foi possível reativar." };

    SGO_DATA.log("USUARIOS_REATIVAR", sessao.usuario, "Usuário reativado ID=" + usuarioId, "USUARIOS");
    return { success: true, message: "Usuário reativado com sucesso." };
  }

  /**
   * 03/11/2026 (pedido do dono): excluir a conta, só o Administrador. Antes de confirmar, a tela mostra o que está ligado à
   * conta (Usuarios_vinculosDaConta_) e pede o motivo.
   *  - Conta sem nenhum vínculo (e com todas as abas conferidas): a linha sai de CAD_USUARIOS.
   *  - Conta com vínculo (ou alguma aba que não deu para conferir): exclusão lógica. STATUS INATIVO + EXCLUIDO_EM/POR/MOTIVO;
   *    some da lista e dos seletores, a sessão cai na hora (validarSessao recusa), o login é recusado e o nome continua nos
   *    registros antigos. Não volta (reativar recusa); consulta pelo filtro Excluídos.
   * Registro em SYS_LOGS (USUARIOS_EXCLUIR) e no registro de segurança (CONTA_EXCLUIDA).
   */
  function excluir(sessionId, id, motivo) {
    const sessao = exigirSessao(sessionId);
    verificarPermissaoAdmin_(sessao);

    const usuarioId = SGO_UTILS.safe(id);
    if (!usuarioId) return { success: false, message: "Não foi possível excluir: a conta não foi informada. Atualize a lista e tente de novo." };
    if (usuarioId === SGO_UTILS.safe(sessao.userId)) { // Corrigido: era sessao.usuarioId, agora é userId
      return { success: false, message: "Você não pode excluir a sua própria conta. Se ela não deve mais existir, peça a outro Administrador." };
    }

    const negadoPerfil = exigirExcluir_(sessao);
    if (negadoPerfil) return { success: false, message: negadoPerfil };
    garantirColunaCelular_();
    const atual = SGO_DATA.getById(SHEET_NAME, usuarioId);
    if (!atual) return { success: false, message: "Usuário não encontrado: pode ter sido excluído por outra pessoa. Atualize a lista." };
    if (ehExcluida_(atual)) return { success: false, message: "Esta conta já foi excluída em " + Usuarios_dataBr_(atual.EXCLUIDO_EM) + ". Ela aparece só no filtro Excluídos." };
    const negado = exigirAdminParaContaAdmin_(sessao, atual.PERFIL, "excluir");
    if (negado) return { success: false, message: negado };
    if (SGO_UTILS.safeUpper(atual.PERFIL) === "ADMIN" && SGO_UTILS.safeUpper(atual.STATUS) === STATUS_ATIVO && ehUltimoAdminAtivo_(usuarioId)) {
      return { success: false, message: "Não foi possível excluir: este é o único Administrador ativo. Cadastre (ou reative) outro Administrador antes." };
    }
    const m = SGO_UTILS.safe(motivo);
    if (m.length < 10) return { success: false, message: "Escreva o motivo da exclusão (pelo menos 10 letras). Ele fica no registro de auditoria com o seu nome." };

    const vinc = Usuarios_vinculosDaConta_(atual);
    const quem = SGO_UTILS.safe(sessao.nome) || SGO_UTILS.safe(sessao.usuario);
    const desc = SGO_UTILS.safe(atual.NOME) + " <" + SGO_UTILS.safe(atual.EMAIL) + ">, login interno " + SGO_UTILS.safe(atual.USUARIO) + ", perfil " + SGO_UTILS.safeUpper(atual.PERFIL);
    if (vinc.semVinculo) {
      const ok = SGO_DATA.remove(SHEET_NAME, usuarioId);
      if (!ok) return { success: false, message: "Não foi possível excluir agora: a linha da conta não foi encontrada para remover. Atualize a lista e tente de novo; nada foi alterado." };
      SGO_DATA.log("USUARIOS_EXCLUIR", sessao.usuario, "Conta removida (sem nenhum vínculo) ID=" + usuarioId + " (" + desc + "). Motivo: " + m.slice(0, 300), "USUARIOS");
      if (typeof SegAcesso_registrar_ === "function") SegAcesso_registrar_("CONTA_EXCLUIDA", { ID: usuarioId, USUARIO: atual.USUARIO, PERFIL: atual.PERFIL }, null, "Conta removida (sem vínculo). Motivo: " + m.slice(0, 300), quem);
      Usuarios_marcarExcluida_(usuarioId);
      if (typeof SegAcesso_derrubarSessoes_ === "function") SegAcesso_derrubarSessoes_(usuarioId, "", "");
      return { success: true, modo: "REMOVIDA", message: "Conta de " + SGO_UTILS.safe(atual.NOME) + " excluída. Ela não tinha nenhum registro ligado, então saiu do cadastro." };
    }

    const agora = SGO_UTILS.nowIso();
    const ok = SGO_DATA.update(SHEET_NAME, usuarioId, {
      STATUS: STATUS_INATIVO, EXCLUIDO_EM: agora, EXCLUIDO_POR: quem, EXCLUIDO_POR_ID: SGO_UTILS.safe(sessao.userId), EXCLUIDO_MOTIVO: m.slice(0, 500),
      SITUACAO_ANTES_EXCLUSAO: SGO_UTILS.safeUpper(atual.STATUS) || STATUS_ATIVO, SEGURANCA_VERSAO: String((Number(atual.SEGURANCA_VERSAO) || 0) + 1)
    });
    if (!ok) return { success: false, message: "Não foi possível excluir agora: a conta não foi gravada. Atualize a lista e tente de novo; nada foi alterado." };
    Usuarios_marcarExcluida_(usuarioId);
    let derrubadas = { sessoes: 0 };
    if (typeof SegAcesso_derrubarSessoes_ === "function") derrubadas = SegAcesso_derrubarSessoes_(usuarioId, "", "") || derrubadas;
    const resumo = vinc.categorias.filter(function (c) { return c.total > 0; }).map(function (c) { return c.rotulo + ": " + c.total; }).join("; ");
    SGO_DATA.log("USUARIOS_EXCLUIR", sessao.usuario, "Conta excluída (exclusão lógica, tem vínculo) ID=" + usuarioId + " (" + desc + "). Vínculos: " + (resumo || "não deu para conferir tudo") +
      (vinc.naoConferidas.length ? " (não conferido: " + vinc.naoConferidas.join(", ") + ")" : "") + ". Motivo: " + m.slice(0, 300), "USUARIOS");
    if (typeof SegAcesso_registrar_ === "function") SegAcesso_registrar_("CONTA_EXCLUIDA", { ID: usuarioId, USUARIO: atual.USUARIO, PERFIL: atual.PERFIL }, null, "Conta excluída (exclusão lógica). Motivo: " + m.slice(0, 300), quem);
    return {
      success: true, modo: "LOGICA",
      message: "Conta de " + SGO_UTILS.safe(atual.NOME) + " excluída. Como ela tem registros ligados (" + (resumo || "algumas abas não puderam ser conferidas") + "), a linha fica guardada: a conta some da lista e dos seletores, " +
        (derrubadas.sessoes ? "as sessões abertas foram encerradas agora" : "qualquer sessão aberta é encerrada na próxima ação") + ", o login é recusado e o nome continua nos registros antigos. Consulte em Excluídos."
    };
  }

  /**
   * 31/10/2026 (pedido do dono): a gestão envia o link de redefinição de senha para o e-mail da pessoa (30 minutos, uso
   * único; com o código no celular quando o perfil exige). Motivo obrigatório (fica no registro de segurança). Mesmas
   * permissões de "redefinir senha": rotina da empresa e conta de Administrador/Diretoria só por quem pode.
   */
  function enviarLinkRedefinicao(sessionId, id, motivo) {
    const sessao = exigirSessao(sessionId);
    verificarPermissaoAdmin_(sessao);
    const usuarioId = SGO_UTILS.safe(id);
    const atual = SGO_DATA.getById(SHEET_NAME, usuarioId);
    if (!atual) return { success: false, message: "Usuário não encontrado: pode ter sido alterado por outra pessoa. Atualize a lista." };
    if (ehExcluida_(atual)) return { success: false, message: msgExcluida_(atual, "enviar o link") };
    const negado = exigirAdminParaContaAdmin_(sessao, atual.PERFIL, "enviar o link");
    if (negado) return { success: false, message: negado };
    const m = SGO_UTILS.safe(motivo);
    if (m.length < 5) return { success: false, message: "Escreva o motivo (pelo menos 5 letras). Ele fica no registro de segurança com o seu nome." };
    if (typeof SegAcesso_enviarLinkGestao_ !== "function") return { success: false, message: "A redefinição por link não está disponível neste sistema. Atualize a página (F5)." };
    const r = SegAcesso_enviarLinkGestao_(usuarioId, m.slice(0, 300), sessao, "SENHA");
    SGO_DATA.log("USUARIOS_LINK_SENHA", sessao.usuario, "Link de redefinição de senha enviado para " + SGO_UTILS.safe(atual.NOME) + " (" + r.destino + "). Motivo: " + m.slice(0, 300), "USUARIOS");
    return { success: true, message: "Link enviado para o e-mail " + r.destino + ". Ele vale por 30 minutos e só pode ser usado uma vez. A senha atual de " + SGO_UTILS.safe(atual.NOME).split(" ")[0] + " continua valendo até a senha nova ser criada." };
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
      return [r.EMAIL, r.NOME, r.PERFIL, r.STATUS, r.CELULAR, r.VINCULO_TRABALHO, r.AREA].some(v => SGO_UTILS.safeLower(v).includes(q));
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
      // 31/10/2026: não vem mais da tela; a criação gera a partir do e-mail (gerarLoginInterno_) e a edição mantém o atual
      USUARIO: SGO_UTILS.safeLower(payload.USUARIO).replace(/\s+/g, ""),
      SENHA: SGO_UTILS.safe(payload.SENHA), // Removido o Trim da senha para permitir espaços, se o usuário quiser.
      NOME: SGO_UTILS.safeUpper(payload.NOME), // Força o nome completo para maiúsculo
      PERFIL: SGO_UTILS.safeUpper(payload.PERFIL),
      CLIENTE_ID: SGO_UTILS.safe(payload.CLIENTE_ID),
      REPRESENTADA_ID: SGO_UTILS.safe(payload.REPRESENTADA_ID),
      REPRESENTACAO_PAPEL: SGO_UTILS.safeUpper(payload.REPRESENTACAO_PAPEL),
      // 31/10/2026 (login pelo e-mail): minúsculas e sem nenhum espaço (é a chave de entrada)
      EMAIL: emailNormal_(payload.EMAIL),
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
    // 31/10/2026: o identificador interno (USUARIO) é gerado pelo sistema; a tela não pede mais "login"
    if (isEdicao && !dados.USUARIO) erros.push("Não foi possível salvar: a conta está sem identificador interno e sem e-mail. Informe o e-mail.");
    if (!dados.NOME) erros.push("Nome completo é obrigatório.");
    if (!isEdicao && !dados.SENHA) erros.push("Senha é obrigatória para novos usuários.");
    if (!dados.PERFIL) {
      erros.push("Perfil de acesso é obrigatório.");
    } else if (SGO_CFG.PROFILES.indexOf(dados.PERFIL) === -1) {
      erros.push("Perfil de acesso inválido.");
    }
    if (dados.PERFIL === "CLIENTE" && !dados.CLIENTE_ID) erros.push("Vínculo de cliente é obrigatório para este perfil.");
    // 29/10/2026 (módulo Representação): a conta da representada precisa da empresa (Representação > Representadas) e do papel
    if (dados.PERFIL === "REPRESENTADA") {
      if (!dados.REPRESENTADA_ID) erros.push("Escolha a representada (empresa) desta conta. Se ela não aparece, cadastre em Representação > Representadas.");
      else { let rp = null; try { rp = SGO_DATA.getById("REP_REPRESENTADAS", dados.REPRESENTADA_ID); } catch (eRp) { rp = null; } if (!rp) erros.push("A representada escolhida não foi encontrada. Atualize a tela e escolha de novo."); }
      if (["ADMIN", "ATENDENTE", "FINANCEIRO", "LEITURA"].indexOf(dados.REPRESENTACAO_PAPEL) < 0) erros.push("Escolha o papel na representada (administrador, atendente, financeiro de garantia ou leitura).");
    }
    if (!dados.EMAIL) {
      erros.push("E-mail é obrigatório: é com ele que a pessoa entra no SGO+ e recebe o link para criar a senha.");
    } else if (!emailValido_(dados.EMAIL)) {
      erros.push("E-mail inválido: confira o formato (nome@empresa.com.br).");
    }
    if (dados.AREA === null) {
      erros.push("Área inválida: escolha uma das áreas da lista (Administração > Usuários > Áreas) ou deixe Sem área.");
    }
    if (dados.VINCULO_TRABALHO === null) {
      erros.push("Vínculo de trabalho inválido: escolha CLT, PJ, Diretoria, Cliente, Representante ou Não informado.");
    } else {
      const incoerente = Usuarios_vinculoIncoerente_(dados.PERFIL, dados.VINCULO_EFETIVO !== undefined ? dados.VINCULO_EFETIVO : dados.VINCULO_TRABALHO);
      if (incoerente) erros.push(incoerente);
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

  /* 31/10/2026 (login pelo e-mail): e-mail comparado sem diferenciar maiúsculas e sem espaços, em TODAS as contas
     (inclusive inativas: quem volta é reativado, não cadastrado de novo). */
  function emailNormal_(v) { return String(v === null || v === undefined ? "" : v).replace(/\s+/g, "").toLowerCase(); }
  function emailValido_(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNormal_(v)); }

  /** Outra conta (não idIgnorado) com o mesmo e-mail, ou null. */
  function contaComEmail_(email, idIgnorado) {
    const alvo = emailNormal_(email);
    if (!alvo) return null;
    // 03/11/2026: conta excluída não segura o e-mail (a pessoa pode ganhar uma conta nova com ele)
    return SGO_DATA.getAll(SHEET_NAME).filter(function (r) { return emailNormal_(r.EMAIL) === alvo && SGO_UTILS.safe(r.ID) !== SGO_UTILS.safe(idIgnorado) && !ehExcluida_(r); })[0] || null;
  }
  function mensagemEmailRepetido_(outra) {
    const ativa = SGO_UTILS.safeUpper(outra.STATUS) === STATUS_ATIVO;
    return "Este e-mail já é da conta de " + (SGO_UTILS.safe(outra.NOME) || "outra pessoa") + (ativa ? "" : " (inativa)") + ". O e-mail é a entrada no SGO+ e não pode ficar em duas contas. " +
      (ativa ? "O que fazer: use outro e-mail ou corrija a conta que já existe." : "O que fazer: reative a conta que já existe (Mais > Reativar) ou troque o e-mail dela antes.");
  }

  /** Identificador interno (CAD_USUARIOS.USUARIO) a partir do e-mail: a parte antes do @, sem acento, com número se já existe. */
  function gerarLoginInterno_(email) {
    let base = String(emailNormal_(email).split("@")[0] || "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9._-]/g, "").slice(0, 40);
    if (!base) base = "usuario";
    const usados = {};
    SGO_DATA.getAll(SHEET_NAME).forEach(function (r) { usados[SGO_UTILS.safeLower(r.USUARIO)] = true; });
    if (!usados[base]) return base;
    for (let n = 2; n < 1000; n++) if (!usados[base + n]) return base + n;
    return base + "." + Date.now();
  }

  return { listar, obter, criar, atualizar, inativar, reativar, excluir, pesquisar, listarClientesAtivos, enviarLinkRedefinicao, emailNormal_: emailNormal_, emailValido_: emailValido_ };
})();

/* =========================
   WRAPPERS BLINDADOS (VACINA ANTI-DATA)
========================= */
function usuariosListar(sessionId) { SGO_DATA_REP_VISIVEL = true; try { return JSON.parse(JSON.stringify(SGO_USUARIOS.listar(sessionId))); } catch(e) { return { success: false, message: SGO_textoFalhaOperador_("concluir a operação com o usuário", e) }; } }
function usuariosObter(sessionId, id) { SGO_DATA_REP_VISIVEL = true; try { return JSON.parse(JSON.stringify(SGO_USUARIOS.obter(sessionId, id))); } catch(e) { return { success: false, message: SGO_textoFalhaOperador_("concluir a operação com o usuário", e) }; } }
function usuariosCriar(sessionId, payload) { SGO_DATA_REP_VISIVEL = true; try { return JSON.parse(JSON.stringify(SGO_USUARIOS.criar(sessionId, payload))); } catch(e) { return { success: false, message: SGO_textoFalhaOperador_("concluir a operação com o usuário", e) }; } }
function usuariosAtualizar(sessionId, id, payload) { SGO_DATA_REP_VISIVEL = true; try { return JSON.parse(JSON.stringify(SGO_USUARIOS.atualizar(sessionId, id, payload))); } catch(e) { return { success: false, message: SGO_textoFalhaOperador_("concluir a operação com o usuário", e) }; } }
function usuariosInativar(sessionId, id) { SGO_DATA_REP_VISIVEL = true; try { return JSON.parse(JSON.stringify(SGO_USUARIOS.inativar(sessionId, id))); } catch(e) { return { success: false, message: SGO_textoFalhaOperador_("concluir a operação com o usuário", e) }; } }
function usuariosReativar(sessionId, id) { SGO_DATA_REP_VISIVEL = true; try { return JSON.parse(JSON.stringify(SGO_USUARIOS.reativar(sessionId, id))); } catch(e) { return { success: false, message: SGO_textoFalhaOperador_("concluir a operação com o usuário", e) }; } }
function usuariosExcluir(sessionId, id, motivo) { SGO_DATA_REP_VISIVEL = true;
  try { var antesG = typeof SGO_avisoGestaoAntes_ === 'function' ? SGO_avisoGestaoAntes_(SGO_CFG.SHEETS.CAD_USUARIOS, id) : null; var rG = JSON.parse(JSON.stringify(SGO_USUARIOS.excluir(sessionId, id, motivo)));
    // 01/11/2026: exclusão de cadastro é ato irreversível: avisa na hora a Diretoria (SGO_Avisos_Gestao.js, GI07)
    if (antesG && rG && rG.success !== false && typeof SGO_avisoGestaoExclusao_ === 'function') SGO_avisoGestaoExclusao_(sessionId, 'usuário', antesG);
    return rG; } catch(e) { return { success: false, message: SGO_textoFalhaOperador_("concluir a operação com o usuário", e) }; } }
function usuariosPesquisar(sessionId, termo) { SGO_DATA_REP_VISIVEL = true; try { return JSON.parse(JSON.stringify(SGO_USUARIOS.pesquisar(sessionId, termo))); } catch(e) { return { success: false, message: SGO_textoFalhaOperador_("concluir a operação com o usuário", e) }; } }
function usuariosEnviarLinkRedefinicao(sessionId, id, motivo) { SGO_DATA_REP_VISIVEL = true; try { return JSON.parse(JSON.stringify(SGO_USUARIOS.enviarLinkRedefinicao(sessionId, id, motivo))); } catch(e) { return { success: false, message: String((e && e.message) || e) }; } }
function usuariosListarClientesAtivos(sessionId) { SGO_DATA_REP_VISIVEL = true; try { return JSON.parse(JSON.stringify(SGO_USUARIOS.listarClientesAtivos(sessionId))); } catch(e) { return { success: false, message: SGO_textoFalhaOperador_("concluir a operação com o usuário", e) }; } }
/* =========================
   EXCLUIR USUÁRIO (03/11/2026, pedido do dono)
   O que está ligado à conta, por assunto. Coluna ligada = o ID da conta em USUARIO_ID, RESPONSAVEL_ID, TECNICO_ID,
   DESTINATARIO_ID, AUTOR_ID, POR_ID, *_POR_ID, *_USUARIO_ID ou numa lista *_IDS. Aba que não existe conta zero; aba que
   existe e não deu para ler entra em naoConferidas e a exclusão fica lógica (nunca remove a linha sem conferir tudo).
========================= */
var USR_VINCULOS_CATEGORIAS = [
  { cat: "acessos", rotulo: "Logins e acessos", abas: ["SYS_SEGURANCA_ACESSO", "GES_ACESSOS", "REP_ACESSOS"] },
  { cat: "chamados", rotulo: "Chamados e pedidos", abas: ["ATEC_CHAMADOS", "ATEC_SOLICITACOES", "ATEC_CASOS", "ATEC_ORCAMENTOS", "ATEC_EVENTOS"] },
  { cat: "os", rotulo: "Ordens de serviço", abas: ["ATEC_OS", "ATEC_FOTOS", "ATEC_PECAS"] },
  { cat: "mensagens", rotulo: "Mensagens", abas: ["REP_MENSAGENS"] },
  { cat: "atividades", rotulo: "Atividades", abas: ["ATV_ATIVIDADES", "ATV_HISTORICO"] },
  { cat: "documentos", rotulo: "Documentos", abas: ["DOC_DOCUMENTOS", "DOC_ENVIOS", "DOC_REVISOES", "REP_DOCUMENTOS", "REP_ANEXOS"] },
  { cat: "avisos", rotulo: "Avisos", abas: ["AVS_AVISOS", "AVS_CIENCIA", "ATV_AVISOS", "NTF_ENVIOS", "NTF_GESTAO"] },
  { cat: "historico", rotulo: "Histórico e outros registros", abas: ["HIST_CADASTROS", "QUALIDADE_OCORRENCIAS", "GES_DECISOES", "GES_AVALIACOES", "CMP_REQUISICOES", "CMP_PEDIDOS", "REG_FROTA_MOVIMENTACAO", "REG_FROTA_RESERVA", "CAD_CONDUTORES"] }
];
var USR_VINCULO_COLUNA = /^(USUARIO_ID|RESPONSAVEL_ID|TECNICO_ID|DESTINATARIO_ID|AUTOR_ID|POR_ID)$|_POR_ID$|_USUARIO_ID$|_RESPONSAVEL_ID$/;
var USR_VINCULO_LISTA = /_IDS$/;

/** Quantos registros da aba citam o ID nas colunas de ligação. null = a aba existe e não deu para ler. */
function Usuarios_contarNaAba_(aba, id) {
  var linhas;
  try { linhas = SGO_DATA.getAll(aba) || []; } catch (e) {
    if (/Aba não encontrada|não encontrad/i.test(String((e && e.message) || e))) return 0;
    return null;
  }
  if (!linhas.length) return 0;
  var cols = Object.keys(linhas[0]), lig = cols.filter(function (c) { return USR_VINCULO_COLUNA.test(c); }), lst = cols.filter(function (c) { return USR_VINCULO_LISTA.test(c); });
  if (!lig.length && !lst.length) return 0;
  var n = 0;
  linhas.forEach(function (r) {
    var achou = lig.some(function (c) { return String(r[c] === null || r[c] === undefined ? "" : r[c]).trim() === id; }) ||
      lst.some(function (c) { return String(r[c] || "").split(/[\s,;|]+/).indexOf(id) >= 0; });
    if (achou) n++;
  });
  return n;
}

/** Mensagens do bate-papo (planilha da Comunicação) escritas pela pessoa. null = não deu para conferir. */
function Usuarios_contarBatePapo_(id) {
  if (typeof comBanco_ !== "function" || typeof comPessoas_ !== "function") return 0;
  try {
    var ss = comBanco_(false);
    if (!ss) return 0;
    var ps = comPessoas_(ss), ids = {};
    ps.forEach(function (p) { if (String(p.sgo_id || "").trim() === id) (typeof comIdsDe_ === "function" ? comIdsDe_(ps, p.pessoa_id) : [p.pessoa_id]).forEach(function (x) { ids[x] = true; }); });
    if (!Object.keys(ids).length) return 0;
    var msgs = comLerLinhas_(ss, "COM_MENSAGENS", 2, comUltima_(ss, "COM_MENSAGENS"));
    return msgs.filter(function (m) { return ids[String(m.de_pessoa || "")]; }).length;
  } catch (e) { return null; }
}

/**
 * { categorias: [{ cat, rotulo, total, abas: [{ aba, n }] }], total, naoConferidas: [abas], semVinculo }.
 * "Logins e acessos" também conta o último login (SYS_LOGS, LOGIN_OK) do login interno da pessoa.
 */
function Usuarios_vinculosDaConta_(u) {
  var id = SGO_UTILS.safe(u && u.ID), login = SGO_UTILS.safeLower(u && u.USUARIO).trim();
  var r = { categorias: [], total: 0, naoConferidas: [], semVinculo: false };
  var antes = typeof SGO_DATA_REP_VISIVEL === "undefined" ? false : SGO_DATA_REP_VISIVEL;
  SGO_DATA_REP_VISIVEL = true;
  try {
    USR_VINCULOS_CATEGORIAS.forEach(function (c) {
      var item = { cat: c.cat, rotulo: c.rotulo, total: 0, abas: [] };
      c.abas.forEach(function (aba) {
        var n = Usuarios_contarNaAba_(aba, id);
        if (n === null) { r.naoConferidas.push(aba); return; }
        if (n) { item.abas.push({ aba: aba, n: n }); item.total += n; }
      });
      if (c.cat === "acessos" && login) {
        var ult = "";
        try { ult = (Usuarios_ultimosAcessos_() || {})[login] || ""; } catch (e) { ult = ""; }
        if (ult) { item.abas.push({ aba: "SYS_LOGS (último login " + Usuarios_dataBr_(ult) + ")", n: 1 }); item.total += 1; }
      }
      if (c.cat === "mensagens") {
        var nb = Usuarios_contarBatePapo_(id);
        if (nb === null) r.naoConferidas.push("bate-papo (Comunicação)");
        else if (nb) { item.abas.push({ aba: "bate-papo (Comunicação)", n: nb }); item.total += nb; }
      }
      r.categorias.push(item);
      r.total += item.total;
    });
  } finally { SGO_DATA_REP_VISIVEL = antes; }
  r.semVinculo = !!id && r.total === 0 && r.naoConferidas.length === 0;
  return r;
}

/** Tela Usuários > Excluir: o que está ligado à conta e o que vai acontecer (remover a linha ou exclusão lógica). Só o Administrador. */
function usuariosVinculosConta(sessionId, id) {
  SGO_DATA_REP_VISIVEL = true;
  try {
    var sessao = exigirSessao(sessionId);
    if (SGO_UTILS.safeUpper(sessao.perfil) !== "ADMIN") return { success: false, message: "Não foi possível conferir: excluir uma conta é só do Administrador. Para tirar o acesso desta pessoa, use Mais > Inativar." };
    var u = SGO_DATA.getById(SGO_CFG.SHEETS.CAD_USUARIOS, SGO_UTILS.safe(id));
    if (!u) return { success: false, message: "Usuário não encontrado: pode ter sido excluído por outra pessoa. Atualize a lista." };
    if (SGO_UTILS.safe(u.EXCLUIDO_EM)) return { success: false, message: "Esta conta já foi excluída em " + Usuarios_dataBr_(u.EXCLUIDO_EM) + ". Ela aparece só em Excluídos." };
    var v = Usuarios_vinculosDaConta_(u);
    return JSON.parse(JSON.stringify({ success: true, nome: SGO_UTILS.safe(u.NOME), email: SGO_UTILS.safe(u.EMAIL), modo: v.semVinculo ? "REMOVER" : "LOGICA",
      categorias: v.categorias, total: v.total, naoConferidas: v.naoConferidas }));
  } catch (e) { return { success: false, message: SGO_textoFalhaOperador_("conferir o que está ligado à conta", e) }; }
}

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

/**
 * Vínculo sugerido para a conta sem vínculo ("" = nenhum): "DIRETORIA" para o perfil Diretoria ou o responsável pelo
 * sistema; 03/11/2026: "CLIENTE" para o perfil Cliente e "REPRESENTANTE" para o perfil Representada (contas de fora).
 */
function Usuarios_vinculoSugerido_(u) {
  if (!u) return "";
  var perfil = SGO_UTILS.safeUpper(u.PERFIL);
  if (SGO_UTILS.safeUpper(u.VINCULO_TRABALHO).replace(/\s+/g, "")) return "";
  if (SGO_PERFIL_VINCULO_EXTERNO[perfil]) return SGO_PERFIL_VINCULO_EXTERNO[perfil];
  if (perfil === "AUVO_SYNC") return "";
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

/* =========================
   VÍNCULO DAS CONTAS DE FORA (03/11/2026, pedido do dono)
   Conta com perfil Cliente ou Representada e sem vínculo recebe "Cliente" ou "Representante", do mesmo jeito que a
   Diretoria: a tela sugere e a rotina preenche uma vez (USR_VINCULO_EXTERNOS_20261103), com registro no SYS_LOGS.
   Vínculo já informado nunca é trocado. Essas contas continuam fora do ponto e dos avisos internos (só CLT recebe o ponto).
========================= */
var USR_SANEAMENTO_VINCULO_EXTERNOS = "USR_VINCULO_EXTERNOS_20261103";
function Usuarios_saneamentoVinculoExternos_() {
  var r = { aplicado: false, logins: [] };
  var props = null;
  try { props = PropertiesService.getScriptProperties(); if (props.getProperty(USR_SANEAMENTO_VINCULO_EXTERNOS) === "1") return r; } catch (e) { props = null; }
  var antes = typeof SGO_DATA_REP_VISIVEL === "undefined" ? false : SGO_DATA_REP_VISIVEL;
  SGO_DATA_REP_VISIVEL = true;
  try {
    var aba = SGO_CFG.SHEETS.CAD_USUARIOS || "CAD_USUARIOS";
    SGO_DATA.getAll(aba).forEach(function (u) {
      var sug = Usuarios_vinculoSugerido_(u);
      if (sug !== "CLIENTE" && sug !== "REPRESENTANTE") return;
      var login = SGO_UTILS.safeLower(u.USUARIO).trim();
      if (!SGO_DATA.update(aba, SGO_UTILS.safe(u.ID), { VINCULO_TRABALHO: sug })) return;
      r.logins.push(login);
      SGO_DATA.log("USUARIOS_VINCULO_AUTO", "sistema", "Vínculo de trabalho preenchido com " + SGO_rotuloVinculo_(sug) + ": " + login + " (estava Não informado; motivo: perfil " + (sug === "CLIENTE" ? "Cliente" : "Representada") + ")", "USUARIOS");
    });
    r.aplicado = true;
    if (props) props.setProperty(USR_SANEAMENTO_VINCULO_EXTERNOS, "1");
    SGO_DATA.log("USUARIOS_VINCULO_AUTO", "sistema", r.logins.length ? "Cliente/Representante preenchido em: " + r.logins.join(", ") : "contas de fora: nada a preencher", "USUARIOS");
  } catch (e) { console.warn("Vínculo das contas de fora (saneamento): " + ((e && e.message) || e)); } finally { SGO_DATA_REP_VISIVEL = antes; }
  return r;
}

function usuariosPainel(sessionId) {
  // 29/10/2026: a tela Usuários lista também as contas REPRESENTADA (SGO_DATA.getAll as esconde no resto do SGO+)
  SGO_DATA_REP_VISIVEL = true;
  try {
    var sessao = exigirSessao(sessionId);
    var base = SGO_USUARIOS.pesquisar(sessionId, "");
    if (!base || !base.success) return base || { success: false, message: "Não foi possível carregar os usuários." };
    // 22/10/2026: a primeira abertura da tela depois da publicação preenche o vínculo Diretoria de quem está sem (uma vez).
    try { if (Usuarios_saneamentoVinculoDiretoria_().logins.length) base = SGO_USUARIOS.pesquisar(sessionId, ""); } catch (eSan) {}
    try { if (Usuarios_saneamentoVinculoExternos_().logins.length) base = SGO_USUARIOS.pesquisar(sessionId, ""); } catch (eSanX) {}
    // 03/11/2026: conta excluída sai da lista; fica só em "Excluídos" (consulta: quem excluiu, quando e o motivo)
    var excluidas = (base.items || []).filter(function (u) { return SGO_UTILS.safe(u.EXCLUIDO_EM); });
    base = Object.assign({}, base, { items: (base.items || []).filter(function (u) { return !SGO_UTILS.safe(u.EXCLUIDO_EM); }) });
    var souAdmin = SGO_UTILS.safeUpper(sessao.perfil) === "ADMIN";
    // 19/10/2026: o perfil Diretoria é dado só por Administrador ou Diretoria (exigirAdminParaContaAdmin_).
    var podeDarDiretoria = souAdmin || SGO_UTILS.safeUpper(sessao.perfil) === "DIRETORIA";
    // 21/10/2026: a gestão, o RH e o Financeiro criam e alteram contas (rotina da empresa); excluir de vez, só
    // Administrador e Diretoria; o próprio perfil ninguém muda (a tela trava o campo).
    var podeGerir = typeof SGO_ehGestaoRotina_ === "function" ? SGO_ehGestaoRotina_(sessao.perfil) : isAdminPerfilAuth_(sessao.perfil);
    // 03/11/2026 (pedido do dono): excluir conta é só do Administrador (antes também a Diretoria)
    var podeExcluir = souAdmin;
    var acessos = Usuarios_ultimosAcessos_();
    // Áreas (19/10/2026): lista para o formulário e nomes para a coluna da lista.
    var areasAtivas = [], nomesAreas = {};
    try { Areas_garantir_(); areasAtivas = Areas_todas_().filter(function (a) { return a.ATIVO; }); nomesAreas = Areas_mapaNomes_(); } catch (eAr) { console.warn("Áreas: " + ((eAr && eAr.message) || eAr)); }
    var clientes = {};
    try { SGO_DATA.getAll(SGO_CFG.SHEETS.CAD_CLIENTES).forEach(function (c) { clientes[SGO_UTILS.safe(c.ID)] = SGO_UTILS.safe(c.NOME_FANTASIA) || SGO_UTILS.safe(c.RAZAO_SOCIAL); }); } catch (e) {}
    var representadas = {}, listaRepresentadas = [];
    try { SGO_DATA.getAll("REP_REPRESENTADAS").forEach(function (r) { representadas[SGO_UTILS.safe(r.ID)] = SGO_UTILS.safe(r.NOME); if (SGO_UTILS.safeUpper(r.SITUACAO || "ATIVA") === "ATIVA") listaRepresentadas.push({ ID: SGO_UTILS.safe(r.ID), NOME: SGO_UTILS.safe(r.NOME) }); }); } catch (eRep) {}
    var ativosAdmin = (base.items || []).filter(function (u) { return SGO_UTILS.safeUpper(u.PERFIL) === "ADMIN" && SGO_UTILS.safeUpper(u.STATUS) === "ATIVO"; }).length;
    // 31/10/2026 (login pelo e-mail): e-mails das contas ATIVAS, para mostrar em destaque quem não consegue entrar
    var eN = SGO_USUARIOS.emailNormal_, eV = SGO_USUARIOS.emailValido_;
    var ativosPorEmail = {};
    (base.items || []).forEach(function (u) {
      if (SGO_UTILS.safeUpper(u.STATUS) !== "ATIVO" || SGO_UTILS.safeUpper(u.PERFIL) === "AUVO_SYNC" || !eV(u.EMAIL)) return;
      (ativosPorEmail[eN(u.EMAIL)] = ativosPorEmail[eN(u.EMAIL)] || []).push({ id: SGO_UTILS.safe(u.ID), nome: SGO_UTILS.safe(u.NOME) });
    });
    var itens = (base.items || []).map(function (u) {
      var o = {};
      // o identificador interno (USUARIO) não vai para a tela: a pessoa é o nome e o e-mail
      Object.keys(u).forEach(function (k) { if (k !== "SENHA" && k !== "USUARIO") { var v = u[k]; o[k] = Object.prototype.toString.call(v) === "[object Date]" ? v.toISOString() : v; } });
      var perfil = SGO_UTILS.safeUpper(u.PERFIL);
      o.ULTIMO_ACESSO = acessos[SGO_UTILS.safeLower(u.USUARIO)] || "";
      o.EMAIL = eN(u.EMAIL);
      o.TECNICA = perfil === "AUVO_SYNC";
      o.SEM_EMAIL = !o.TECNICA && !eV(u.EMAIL);
      var mesmos = !o.TECNICA && SGO_UTILS.safeUpper(u.STATUS) === "ATIVO" && eV(u.EMAIL) ? (ativosPorEmail[eN(u.EMAIL)] || []) : [];
      o.EMAIL_REPETIDO_COM = mesmos.filter(function (x) { return x.id !== SGO_UTILS.safe(u.ID); }).map(function (x) { return x.nome; });
      // conta do responsável pelo sistema não entra no "Sem área" (antes a tela comparava o login "admin")
      o.IGNORAR_AREA = SGO_UTILS.safeLower(u.USUARIO) === "admin";
      o.CLIENTE_NOME = perfil === "CLIENTE" ? (clientes[SGO_UTILS.safe(u.CLIENTE_ID)] || "") : "";
      o.REPRESENTADA_NOME = perfil === "REPRESENTADA" ? (representadas[SGO_UTILS.safe(u.REPRESENTADA_ID)] || "") : "";
      o.SEM_CELULAR = !String(u.CELULAR || "").replace(/\D/g, "");
      o.EU = SGO_UTILS.safe(u.ID) === SGO_UTILS.safe(sessao.userId);
      // Conta de Administrador só é alterada por Administrador (a regra vale no servidor; aqui só orienta a tela).
      o.PODE_ALTERAR = podeGerir && (souAdmin || perfil !== "ADMIN") && (podeDarDiretoria || perfil !== "DIRETORIA");
      o.VINCULO_TRABALHO = SGO_UTILS.safeUpper(u.VINCULO_TRABALHO).replace(/\s+/g, "");
      o.VINCULO_ROTULO = SGO_rotuloVinculo_(o.VINCULO_TRABALHO);
      // 22/10/2026: conta da Diretoria (ou do responsável pelo sistema) sem vínculo: a tela sugere "Diretoria".
      o.VINCULO_SUGERIDO = Usuarios_vinculoSugerido_(u);
      var ar = perfil === "CLIENTE" || perfil === "REPRESENTADA" ? { codigo: "", nome: "" } : (typeof SGO_areaDoUsuario_ === "function" ? SGO_areaDoUsuario_(u, nomesAreas) : { codigo: SGO_UTILS.safeUpper(u.AREA), nome: SGO_UTILS.safe(u.AREA) });
      o.AREA = ar.codigo;
      o.AREA_NOME = ar.codigo ? ar.nome : "";
      o.ULTIMO_ADMIN = perfil === "ADMIN" && SGO_UTILS.safeUpper(u.STATUS) === "ATIVO" && ativosAdmin === 1;
      return o;
    });
    itens.sort(function (a, b) {
      var sa = SGO_UTILS.safeUpper(a.STATUS) === "ATIVO" ? 0 : 1, sb = SGO_UTILS.safeUpper(b.STATUS) === "ATIVO" ? 0 : 1;
      return sa - sb || SGO_UTILS.safe(a.NOME).localeCompare(SGO_UTILS.safe(b.NOME), "pt-BR");
    });
    var excluidos = excluidas.map(function (u) {
      return { ID: SGO_UTILS.safe(u.ID), NOME: SGO_UTILS.safe(u.NOME), EMAIL: eN(u.EMAIL), PERFIL: SGO_UTILS.safeUpper(u.PERFIL), EXCLUIDO_EM: SGO_UTILS.safe(u.EXCLUIDO_EM), EXCLUIDO_EM_BR: Usuarios_dataBr_(u.EXCLUIDO_EM),
        EXCLUIDO_POR: SGO_UTILS.safe(u.EXCLUIDO_POR), EXCLUIDO_MOTIVO: SGO_UTILS.safe(u.EXCLUIDO_MOTIVO), CLIENTE_NOME: clientes[SGO_UTILS.safe(u.CLIENTE_ID)] || "", REPRESENTADA_NOME: representadas[SGO_UTILS.safe(u.REPRESENTADA_ID)] || "" };
    }).sort(function (a, b) { return String(b.EXCLUIDO_EM).localeCompare(String(a.EXCLUIDO_EM)); });
    return JSON.parse(JSON.stringify({ success: true, items: itens, total: itens.length, excluidos: excluidos, souAdmin: souAdmin, podeDarDiretoria: podeDarDiretoria, podeGerir: podeGerir, podeExcluir: podeExcluir,
      areas: areasAtivas, podeGerirAreas: SGO_podeConsultarPessoas_(sessao.perfil),
      representadas: listaRepresentadas, papeisRepresentacao: [["ADMIN", "Administrador da representada"], ["ATENDENTE", "Atendente"], ["FINANCEIRO", "Financeiro de garantia"], ["LEITURA", "Leitura"]],
      perfis: (SGO_CFG.PROFILES || []).filter(function (p) { var k = SGO_UTILS.safeUpper(p); return (souAdmin || k !== "ADMIN") && (podeDarDiretoria || k !== "DIRETORIA"); }) }));
  } catch (e) {
    return { success: false, message: SGO_textoFalhaOperador_("carregar os usuários", e) };
  }
}
