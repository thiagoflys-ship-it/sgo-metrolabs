/****************************************************
 * SGO_Auth.gs
 * METROLABS SGO+
 * AUTENTICAÇÃO E SESSÃO
 *
 * OBJETIVO:
 * - realizar login
 * - validar sessão com robustez
 * - evitar perda aleatória de sessão
 * - manter compatibilidade com o sistema atual
 * - preparar base para controle de acesso por perfil/cliente
 ****************************************************/

/**
 * DIAGNOSTICO TEMPORARIO 2026-08-06: roda manualmente no editor (como o
 * usuario administrador) para forcar a tela de autorizacao completa do
 * script (todos os escopos do manifest) a aparecer e ser aceita, caso a
 * automatizacao "USER_DEPLOYING" esteja com consentimento pendente.
 */
function DIAG_forcarAutorizacaoCompleta() {
  // 17/10/2026: só pelo editor; pelo navegador não executa nada (sem portas dos fundos).
  if (!SGO_execucaoInterna_()) return { success: false, message: "Esta rotina só pode ser executada pelo administrador do sistema, no editor." };
  const props = PropertiesService.getScriptProperties();
  const dbId = props.getProperty('DB_ID');
  if (dbId) {
    const ss = SpreadsheetApp.openById(dbId);
    Logger.log('Spreadsheet OK: ' + ss.getName());
  }
  const pastas = DriveApp.getRootFolder();
  Logger.log('Drive OK: ' + pastas.getName());
  Logger.log('Autorizacao completa executada com sucesso.');
  return 'OK';
}

/****************************************************
 * SEGURANÇA: HASH DE SENHAS
 *
 * 31/10/2026 (pedido do dono, segurança do acesso): formato forte
 *   "pbkdf2_sha256$<iterações>$<sal hex>$<hash hex>" — PBKDF2-HMAC-SHA256,
 *   600 mil iterações, sal aleatório de 16 bytes por senha. Calculado pela
 *   criptografia nativa do servidor (global SGO_CRIPTO, sgo_servidor
 *   compat/cripto.ts); sem ela (Google, testes) a conferência usa o cálculo
 *   em JavaScript e as senhas novas ficam no formato anterior.
 * Formatos antigos continuam entrando (ninguém fica trancado):
 *   "sha256$<salt>$<hash-hex>" (SHA-256 com sal, uma rodada) e texto plano.
 *   No primeiro login certo a senha é regravada no formato forte, sem a
 *   pessoa perceber (migração transparente). Na troca de senha também.
 * - Migração em lote antiga: migrarSenhasParaHash() em SGO_Setup_Seguranca.js.
 ****************************************************/
var SENHA_HASH_PREFIX_AUTH = 'sha256$';
var SENHA_PBKDF2_PREFIX_AUTH = 'pbkdf2_sha256$';
var SENHA_PBKDF2_ITERACOES_AUTH = 600000;

/** Criptografia nativa do servidor (SGO_CRIPTO) ou null. */
function criptoNativaAuth_() {
  try {
    return typeof SGO_CRIPTO !== 'undefined' && SGO_CRIPTO && typeof SGO_CRIPTO.pbkdf2Hex === 'function' ? SGO_CRIPTO : null;
  } catch (e) { return null; }
}

/** Comparação de dois textos sem atalho (tempo constante para o mesmo tamanho). */
function textosIguaisAuth_(a, b) {
  const x = String(a === null || a === undefined ? '' : a), y = String(b === null || b === undefined ? '' : b);
  const c = criptoNativaAuth_();
  if (c && typeof c.igual === 'function') return c.igual(x, y) === true;
  if (x.length !== y.length) return false;
  let dif = 0;
  for (let i = 0; i < x.length; i++) dif |= x.charCodeAt(i) ^ y.charCodeAt(i);
  return dif === 0;
}

function bytesUtf8Auth_(t) {
  return Utilities.newBlob(String(t === null || t === undefined ? '' : t)).getBytes();
}

/** PBKDF2-HMAC-SHA256 (32 bytes) em JavaScript, para quando não há SGO_CRIPTO. Lento: só reserva. */
function pbkdf2JsAuth_(senha, salHex, iteracoes) {
  const chave = bytesUtf8Auth_(senha);
  const sal = [];
  for (let i = 0; i < salHex.length; i += 2) { const v = parseInt(salHex.substr(i, 2), 16); sal.push(v > 127 ? v - 256 : v); }
  const assinar = function (dados) { return Utilities.computeHmacSha256Signature(dados, chave); };
  let u = assinar(sal.concat([0, 0, 0, 1]));
  const t = u.slice();
  for (let n = 1; n < iteracoes; n++) {
    u = assinar(u);
    for (let k = 0; k < t.length; k++) t[k] = t[k] ^ u[k];
  }
  return t.map(function (b) { const v = b < 0 ? b + 256 : b & 255; return (v < 16 ? '0' : '') + v.toString(16); }).join('');
}

function pbkdf2HexAuth_(senha, salHex, iteracoes) {
  const c = criptoNativaAuth_();
  return c ? String(c.pbkdf2Hex(String(senha === null || senha === undefined ? '' : senha), salHex, iteracoes)) : pbkdf2JsAuth_(senha, salHex, iteracoes);
}

function gerarSaltAuth_() {
  return Utilities.getUuid().replace(/-/g, '').slice(0, 16);
}

function hashHexAuth_(texto) {
  const bytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    texto,
    Utilities.Charset.UTF_8
  );
  return bytes.map(function (b) {
    const v = b < 0 ? b + 256 : b;
    return (v < 16 ? '0' : '') + v.toString(16);
  }).join('');
}

/** Gera o valor a ser armazenado na coluna SENHA (formato forte quando o servidor oferece SGO_CRIPTO). */
function gerarHashSenhaAuth_(senha) {
  const c = criptoNativaAuth_();
  if (c) {
    const sal = String(c.aleatorioHex(16));
    return SENHA_PBKDF2_PREFIX_AUTH + SENHA_PBKDF2_ITERACOES_AUTH + '$' + sal + '$' + pbkdf2HexAuth_(senha, sal, SENHA_PBKDF2_ITERACOES_AUTH);
  }
  const salt = gerarSaltAuth_();
  return SENHA_HASH_PREFIX_AUTH + salt + '$' + hashHexAuth_(salt + String(senha || ''));
}

/** Indica se o valor armazenado já está em algum formato de hash (não é texto plano). */
function senhaEstaHasheadaAuth_(valorArmazenado) {
  const v = String(valorArmazenado || '');
  return v.indexOf(SENHA_HASH_PREFIX_AUTH) === 0 || v.indexOf(SENHA_PBKDF2_PREFIX_AUTH) === 0;
}

/** Indica se o valor armazenado já está no formato forte (PBKDF2). */
function senhaHashForteAuth_(valorArmazenado) {
  return String(valorArmazenado || '').indexOf(SENHA_PBKDF2_PREFIX_AUTH) === 0;
}

/** Compara a senha informada com o valor armazenado (hash ou legado texto plano). */
function verificarSenhaAuth_(senhaInformada, valorArmazenado) {
  const arm = String(valorArmazenado || '');
  const inf = String(senhaInformada || '');
  if (!arm || !inf) return false;

  if (senhaHashForteAuth_(arm)) {
    const p = arm.split('$'); // ['pbkdf2_sha256', iterações, sal, hash]
    const it = Number(p[1]);
    if (p.length !== 4 || !(it >= 1 && it <= 2000000) || !/^[0-9a-f]{16,128}$/i.test(p[2]) || !p[3]) return false;
    return textosIguaisAuth_(pbkdf2HexAuth_(inf, p[2], it), p[3]);
  }

  if (senhaEstaHasheadaAuth_(arm)) {
    const partes = arm.split('$'); // ['sha256', salt, hash]
    if (partes.length !== 3) return false;
    return textosIguaisAuth_(hashHexAuth_(partes[1] + inf), partes[2]);
  }

  // Legado: texto plano
  return textosIguaisAuth_(arm, inf);
}

/**
 * Realiza login do usuário.
 * Mantém compatibilidade com a assinatura já usada no sistema.
 *
 * 31/10/2026 (segurança do acesso, SGO_SegurancaAcesso.js): ctx é preenchido pelo servidor
 * ({ ip, agente, aparelho }; o navegador não decide). Depois da senha certa:
 *  - com o código no celular ligado para o perfil e sem aparelho confiado, NÃO cria sessão:
 *    devolve { success: true, etapa: "CODIGO", desafio, destino } e a sessão só nasce em
 *    verificarCodigoAcesso;
 *  - com a marca "precisa trocar a senha", cria a sessão PENDENTE e devolve etapa
 *    "TROCAR_SENHA": validarSessao recusa essa sessão até trocarSenhaAcesso.
 */
function login(usuario, senha, ctx) {
  try {
    const dbId = SGO_CFG.DB_ID;
    if (!dbId) {
      return {
        success: false,
        message: "Sistema não inicializado. Rode o setupSGO()."
      };
    }

    const usuarioInformado = normalizarTextoAuth_(usuario);
    const senhaInformada = SGO_UTILS.safe(senha);

    if (!usuarioInformado || !senhaInformada) {
      return {
        success: false,
        message: "Informe usuário e senha."
      };
    }

    const ss = SpreadsheetApp.openById(dbId);
    const sheet = ss.getSheetByName(SGO_CFG.SHEETS.CAD_USUARIOS);

    if (!sheet) {
      return {
        success: false,
        message: "Aba de usuários não encontrada."
      };
    }

    const dados = sheet.getDataRange().getValues();
    const ctxAcesso = typeof SegAcesso_ctx_ === "function" ? SegAcesso_ctx_(ctx) : { ip: "", agente: "", aparelho: "" };
    if (!dados || dados.length < 2) {
      return {
        success: false,
        message: "Nenhum usuário cadastrado no sistema."
      };
    }

    // Varre os usuários cadastrados
    for (let i = 1; i < dados.length; i++) {
      const linha = dados[i];

      const id = SGO_UTILS.safe(linha[0]);
      const usuarioDb = normalizarTextoAuth_(linha[1]);
      const senhaDb = SGO_UTILS.safe(linha[2]);
      const nomeDb = SGO_UTILS.safe(linha[3]);
      const perfilDb = SGO_UTILS.safeUpper(linha[4]);
      const statusDb = SGO_UTILS.safeUpper(linha[5]);
      const clienteIdDb = SGO_UTILS.safe(linha[7]); // Captura a trava do Portal do Cliente

      if (
        usuarioDb === usuarioInformado &&
        verificarSenhaAuth_(senhaInformada, linha[2]) // SEGURANCA: compara via hash (com suporte a legado)
      ) {

        // MIGRAÇÃO TRANSPARENTE: se a senha ainda estava em texto plano (ou no formato
        // antigo, SHA-256 de uma rodada), regrava no formato forte logo após o login certo.
        if (!senhaEstaHasheadaAuth_(linha[2]) || (!senhaHashForteAuth_(linha[2]) && criptoNativaAuth_())) {
          try {
            sheet.getRange(i + 1, 3).setValue(gerarHashSenhaAuth_(senhaInformada));
          } catch (eMig) {
            registrarLogAuth_("SENHA_MIGRACAO_FALHA", {
              usuario: usuarioInformado,
              perfil: perfilDb,
              detalhe: "Falha ao converter senha para hash: " + eMig.message
            });
          }
        }

        // Verifica se o usuário está bloqueado ou inativo antes de liberar acesso
        if (statusDb !== SGO_CFG.STATUS.ATIVO) {
           registrarLogAuth_("LOGIN_NEGADO", {
            usuario: usuarioInformado,
            perfil: perfilDb,
            detalhe: "Tentativa de login com usuário inativo/bloqueado."
          });
          if (typeof SegAcesso_registrar_ === "function") SegAcesso_registrar_("LOGIN_NEGADO", { ID: id, USUARIO: usuarioDb, PERFIL: perfilDb }, ctxAcesso, "Usuário inativo ou bloqueado.");
          return {
            success: false,
            message: "Usuário inativo ou bloqueado. Contate o administrador."
          };
        }

        // 29/10/2026 (módulo Representação): a conta REPRESENTADA precisa estar ligada a uma representada ativa.
        let repIdDb = "", repPapelDb = "";
        if (perfilDb === "REPRESENTADA") {
          const repU = lerUsuarioSessaoAuth_(id) || {};
          repIdDb = SGO_UTILS.safe(repU.REPRESENTADA_ID);
          repPapelDb = SGO_UTILS.safeUpper(repU.REPRESENTACAO_PAPEL);
          const motivoRep = motivoRepresentadaAuth_(repIdDb);
          if (motivoRep) {
            registrarLogAuth_("LOGIN_NEGADO", { usuario: usuarioInformado, perfil: perfilDb, detalhe: motivoRep });
            return { success: false, message: motivoRep };
          }
        }

        // 31/10/2026: a linha inteira pelo cabeçalho (celular, e-mail, marca de troca e versão de segurança)
        const cab = (dados[0] || []).map(function (h) { return SGO_UTILS.safe(h); });
        const registro = {};
        cab.forEach(function (h, j) { if (h) registro[h] = linha[j]; });
        const u = usuarioParaSessaoAuth_(registro);
        u.ID = id; u.USUARIO = usuarioDb; u.NOME = nomeDb; u.PERFIL = perfilDb; u.STATUS = statusDb; u.CLIENTE_ID = clienteIdDb;
        u.REPRESENTADA_ID = repIdDb; u.REPRESENTACAO_PAPEL = repPapelDb;

        // código no celular (segundo fator): sem sessão até o código certo
        if (typeof SegAcesso_aposSenhaCerta_ === "function") {
          let etapa = null;
          try { etapa = SegAcesso_aposSenhaCerta_(u, ctxAcesso); }
          catch (eSeg) {
            // falha no código: não entra sem ele (o que fazer na mensagem; o script do servidor recupera o acesso)
            registrarLogAuth_("LOGIN_ERRO", { usuario: usuarioDb, perfil: perfilDb, detalhe: "Código de acesso: " + getErrorMessageAuth_(eSeg) });
            if (typeof SegAcesso_registrar_ === "function") SegAcesso_registrar_("CODIGO_FALHA_ENVIO", u, ctxAcesso, "Erro ao gerar o código: " + getErrorMessageAuth_(eSeg).slice(0, 200));
            return { success: true, etapa: "SEM_ENVIO", message: "Não foi possível gerar o código de acesso agora. A senha está certa, mas o sistema não entra sem o código. O que fazer: tente de novo em alguns minutos; se continuar, avise o administrador do SGO+." };
          }
          if (etapa) return etapa;
        }

        return criarSessaoLoginAuth_(u, ctxAcesso, {});
      }
    }

    // Se varreu o for inteiro e não achou a combinação
    registrarLogAuth_("LOGIN_FALHA", {
      usuario: usuarioInformado,
      perfil: "",
      detalhe: "Usuário ou senha inválidos."
    });
    if (typeof SegAcesso_registrar_ === "function") SegAcesso_registrar_("LOGIN_FALHA", { USUARIO: usuarioInformado }, ctxAcesso, "Usuário ou senha inválidos.");

    return {
      success: false,
      message: "Usuário ou senha inválidos."
    };

  } catch (err) {
    registrarLogAuth_("LOGIN_ERRO", {
      usuario: SGO_UTILS.safe(usuario),
      perfil: "",
      detalhe: getErrorMessageAuth_(err)
    });

    return {
      success: false,
      message: "Erro interno ao processar o login."
    };
  }
}

/**
 * 31/10/2026: registro de CAD_USUARIOS (lido pelo cabeçalho) -> campos que a sessão e a
 * segurança do acesso usam. Nunca leva a senha para a sessão.
 */
function usuarioParaSessaoAuth_(r) {
  r = r || {};
  return {
    ID: SGO_UTILS.safe(r.ID), USUARIO: normalizarTextoAuth_(r.USUARIO), NOME: SGO_UTILS.safe(r.NOME),
    PERFIL: SGO_UTILS.safeUpper(r.PERFIL), STATUS: SGO_UTILS.safeUpper(r.STATUS), CLIENTE_ID: SGO_UTILS.safe(r.CLIENTE_ID),
    REPRESENTADA_ID: SGO_UTILS.safe(r.REPRESENTADA_ID), REPRESENTACAO_PAPEL: SGO_UTILS.safeUpper(r.REPRESENTACAO_PAPEL),
    EMAIL: SGO_UTILS.safe(r.EMAIL), CELULAR: SGO_UTILS.safe(r.CELULAR),
    PRECISA_TROCAR_SENHA: SGO_UTILS.safeUpper(r.PRECISA_TROCAR_SENHA),
    SEGURANCA_VERSAO: Number(r.SEGURANCA_VERSAO) || 0
  };
}

var MSG_TROCA_SENHA_AUTH = "Antes de continuar, crie a sua nova senha. Por quê: a gestão do SGO+ pediu a troca da senha para proteger o sistema. O que fazer: preencha a tela \"Crie sua nova senha\"; depois disso tudo volta a funcionar.";

/**
 * 31/10/2026: cria a sessão de um login aprovado (senha certa e, quando exigido, o código certo).
 * Com a marca de troca obrigatória, a sessão nasce pendente e a resposta leva etapa "TROCAR_SENHA".
 * opcoes.aparelhoHash: aparelho confiado criado neste login (sobrevive à troca de senha que vier em seguida).
 */
function criarSessaoLoginAuth_(u, ctx, opcoes) {
  opcoes = opcoes || {};
  ctx = ctx || {};
  const agora = new Date();
  const agoraIso = SGO_UTILS.nowIso();
  const sessionId = gerarSessionIdAuth_();
  const trocar = SGO_UTILS.safeUpper(u.PRECISA_TROCAR_SENHA) === "SIM";
  const payload = {
    sessionId: sessionId,
    userId: u.ID,
    usuario: u.USUARIO,
    nome: u.NOME,
    perfil: u.PERFIL,
    status: u.STATUS || SGO_CFG.STATUS.ATIVO,
    clienteId: u.CLIENTE_ID, // Salva o ID do cliente na sessão para regras de visualização
    representadaId: u.REPRESENTADA_ID || "", representacaoPapel: u.REPRESENTACAO_PAPEL || "",
    loginAt: agoraIso,
    lastAccessAt: agoraIso,
    expiresAt: new Date(agora.getTime() + (getSessionTtlSecondsAuth_() * 1000)).toISOString(),
    conferidoEm: agora.toISOString(),
    segVersao: Number(u.SEGURANCA_VERSAO) || 0
  };
  if (trocar) payload.pendente = "TROCA_SENHA";
  if (opcoes.aparelhoHash) payload.aparelhoHash = String(opcoes.aparelhoHash);

  salvarSessaoAuth_(payload);

  registrarLogAuth_("LOGIN_OK", {
    usuario: u.USUARIO,
    perfil: u.PERFIL,
    detalhe: "Login realizado com sucesso." + (opcoes.via === "codigo" ? " Código do celular conferido." : "") + (trocar ? " Troca de senha obrigatória pendente." : "")
  });
  if (typeof SegAcesso_registrar_ === "function") SegAcesso_registrar_("LOGIN_OK", u, ctx, (opcoes.via === "codigo" ? "Senha e código certos." : opcoes.via === "aparelho" ? "Senha certa; aparelho confiado (sem código)." : "Senha certa.") + (trocar ? " Precisa criar a senha nova antes de usar o sistema." : ""));

  const resposta = {
    success: true,
    sessionId: sessionId,
    user: {
      id: u.ID,
      usuario: u.USUARIO,
      nome: u.NOME,
      perfil: u.PERFIL,
      clienteId: u.CLIENTE_ID,
      representadaId: u.REPRESENTADA_ID || "",
      representacaoPapel: u.REPRESENTACAO_PAPEL || ""
    }
  };
  if (trocar) {
    resposta.etapa = "TROCAR_SENHA";
    resposta.trocaSenha = { pedirAtual: false, motivo: "A gestão do SGO+ pediu que você crie uma senha nova antes de continuar." };
  }
  return resposta;
}

/**
 * Valida a sessão.
 * Primeiro tenta cache, depois fallback em ScriptProperties.
 * Renova a validade a cada acesso.
 */
function validarSessao(sessionId) {
  try {
    const sessionKey = SGO_UTILS.safe(sessionId);

    if (!sessionKey) {
      return { valid: false, message: "Sessão não informada." };
    }

    let data = lerSessaoAuth_(sessionKey);

    if (!data) {
      return { valid: false, message: "Sessão expirada ou inexistente." };
    }

    if (sessaoExpiradaAuth_(data)) {
      removerSessaoAuth_(sessionKey);
      return { valid: false, message: "Sessão expirada ou inexistente." };
    }

    // Reconfere o cadastro a cada 5 minutos: usuário inativado, excluído ou
    // com perfil trocado não continua entrando com a sessão antiga (antes
    // valia até 6 h depois de inativado).
    const conferidoEm = Date.parse(data.conferidoEm || "") || 0;
    if (data.userId && Date.now() - conferidoEm > 300000) {
      const cadastro = lerUsuarioSessaoAuth_(data.userId);
      if (cadastro === null || (cadastro && SGO_UTILS.safeUpper(cadastro.STATUS) !== SGO_CFG.STATUS.ATIVO)) {
        removerSessaoAuth_(sessionKey);
        registrarLogAuth_("SESSAO_ENCERRADA", { usuario: data.usuario, perfil: data.perfil, detalhe: "Sessão encerrada: usuário inativo ou removido do cadastro." });
        return { valid: false, message: "Seu acesso foi desativado ou o seu usuário não existe mais. Fale com o gestor do sistema." };
      }
      if (cadastro) {
        data.perfil = SGO_UTILS.safeUpper(cadastro.PERFIL);
        data.clienteId = SGO_UTILS.safe(cadastro.CLIENTE_ID);
        data.representadaId = SGO_UTILS.safe(cadastro.REPRESENTADA_ID);
        data.representacaoPapel = SGO_UTILS.safeUpper(cadastro.REPRESENTACAO_PAPEL);
        data.nome = SGO_UTILS.safe(cadastro.NOME) || data.nome;
        data.usuario = normalizarTextoAuth_(cadastro.USUARIO) || data.usuario;
        data.conferidoEm = new Date().toISOString();
        // 31/10/2026 (segurança do acesso): senha trocada, segundo fator zerado ou acesso recuperado aumentam a
        // versão de segurança da pessoa — as outras sessões dela terminam aqui. Sessão de antes desta regra adota a versão.
        const versaoCad = Number(cadastro.SEGURANCA_VERSAO) || 0;
        if (data.segVersao === undefined || data.segVersao === null || data.segVersao === "") data.segVersao = versaoCad;
        else if (Number(data.segVersao) !== versaoCad) {
          removerSessaoAuth_(sessionKey);
          registrarLogAuth_("SESSAO_ENCERRADA", { usuario: data.usuario, perfil: data.perfil, detalhe: "Sessão encerrada: senha trocada ou acesso redefinido." });
          return { valid: false, message: "Sua sessão terminou porque a senha foi trocada ou o acesso foi redefinido pelo administrador. Entre de novo com a senha atual." };
        }
        // a gestão exigiu a troca de senha depois deste login: a sessão passa a ficar pendente (pede também a senha atual)
        if (!data.pendente && SGO_UTILS.safeUpper(cadastro.PRECISA_TROCAR_SENHA) === "SIM") { data.pendente = "TROCA_SENHA"; data.pedirAtual = true; }
      }
    }

    // Renova a sessão a cada validação
    const agora = new Date();
    data.lastAccessAt = SGO_UTILS.nowIso();
    data.expiresAt = new Date(agora.getTime() + (getSessionTtlSecondsAuth_() * 1000)).toISOString();

    salvarSessaoAuth_(data);

    // 31/10/2026: troca de senha obrigatória pendente — nenhuma função do sistema aceita esta sessão até a troca
    // (trocarSenhaAcesso lê a sessão direto). O servidor também recusa as chamadas (sgo_servidor, FUNCOES_TROCA_SENHA).
    if (data.pendente) {
      return { valid: false, pendente: String(data.pendente), message: MSG_TROCA_SENHA_AUTH, pendenteInfo: { nome: SGO_UTILS.safe(data.nome), usuario: SGO_UTILS.safe(data.usuario), pedirAtual: !!data.pedirAtual } };
    }

    return {
      valid: true,
      data: data
    };

  } catch (err) {
    return {
      valid: false,
      message: "Erro ao validar sessão."
    };
  }
}

/**
 * Linha do usuário da sessão em CAD_USUARIOS: objeto, null (não existe mais)
 * ou false (não deu para ler agora — não derruba a sessão por falha de leitura).
 */
function lerUsuarioSessaoAuth_(userId) {
  try {
    const alvo = SGO_UTILS.safe(userId);
    // 29/10/2026: inclui as contas REPRESENTADA (SGO_DATA.getAll as esconde fora de Usuários e do módulo Representação)
    const antes = typeof SGO_DATA_REP_VISIVEL === "undefined" ? false : SGO_DATA_REP_VISIVEL;
    SGO_DATA_REP_VISIVEL = true;
    let achado;
    try { achado = SGO_DATA.getAll(SGO_CFG.SHEETS.CAD_USUARIOS).find(function (u) { return SGO_UTILS.safe(u.ID) === alvo; }); } finally { SGO_DATA_REP_VISIVEL = antes; }
    return achado || null;
  } catch (e) {
    return false;
  }
}

/**
 * Encerra a sessão.
 */
function logout(sessionId) {
  try {
    const sessionKey = SGO_UTILS.safe(sessionId);

    if (!sessionKey) {
      return { success: true };
    }

    const data = lerSessaoAuth_(sessionKey);

    if (data) {
      registrarLogAuth_("LOGOUT", {
        usuario: SGO_UTILS.safe(data.usuario),
        perfil: SGO_UTILS.safe(data.perfil),
        detalhe: "Logout realizado com sucesso."
      });
      if (typeof SegAcesso_registrar_ === "function") SegAcesso_registrar_("LOGOUT", { ID: data.userId, USUARIO: data.usuario, PERFIL: data.perfil }, null, "Saiu do sistema.");
    }

    removerSessaoAuth_(sessionKey);

    return { success: true };

  } catch (err) {
    return {
      success: false,
      message: "Erro ao realizar logout."
    };
  }
}

/**
 * Retorna a sessão atual.
 */
function getSessaoAtual(sessionId) {
  const validacao = validarSessao(sessionId);

  if (!validacao.valid) {
    const r = {
      success: false,
      message: validacao.message || "Sessão inválida."
    };
    // 31/10/2026: a tela reabre "Crie sua nova senha" com a mesma sessão (sem passar pelo login de novo)
    if (validacao.pendente) { r.pendente = validacao.pendente; r.trocaSenha = validacao.pendenteInfo || {}; }
    return r;
  }

  return {
    success: true,
    session: validacao.data
  };
}

/**
 * Exige uma sessão válida.
 * Lança erro se não estiver válida.
 */
function exigirSessao(sessionId) {
  const validacao = validarSessao(sessionId);

  if (!validacao.valid) {
    throw new Error(validacao.message || "Sessão inválida ou expirada.");
  }

  // 29/10/2026 (módulo Representação): a sessão REPRESENTADA só vale dentro da entrada do módulo (Representacao_api
  // liga SGO_REP_MODULO). Em qualquer outra função do SGO+ é recusada, mesmo que a chamada chegue lá.
  if (SGO_UTILS.safeUpper(validacao.data && validacao.data.perfil) === "REPRESENTADA" && !(typeof SGO_REP_MODULO !== "undefined" && SGO_REP_MODULO === true)) {
    throw new Error(MSG_REPRESENTADA_AUTH);
  }

  return validacao.data;
}

var MSG_REPRESENTADA_AUTH = "Acesso negado: o seu usuário é de representada e usa só o módulo Representação. Abra o menu Representação.";

/** Motivo para recusar a entrada da conta REPRESENTADA ("" = pode entrar). */
function motivoRepresentadaAuth_(representadaId) {
  const rid = SGO_UTILS.safe(representadaId);
  if (!rid) return "Não foi possível entrar: o seu usuário de representada não está ligado a nenhuma empresa. Fale com a Metrolabs para corrigir o acesso.";
  let rep = null;
  try { rep = SGO_DATA.getById("REP_REPRESENTADAS", rid); } catch (e) { rep = null; }
  if (!rep) return "Não foi possível entrar: a empresa ligada ao seu usuário não foi encontrada. Fale com a Metrolabs para corrigir o acesso.";
  if (SGO_UTILS.safeUpper(rep.SITUACAO || "ATIVA") !== "ATIVA") return "Não foi possível entrar: o acesso da " + SGO_UTILS.safe(rep.NOME) + " está suspenso pela Metrolabs. Fale com a Metrolabs.";
  return "";
}

/**
 * Verifica se o perfil atual é administrativo.
 * Já deixa pronto para regras futuras de QR/portal.
 */
function isAdminSession(sessionId) {
  const validacao = validarSessao(sessionId);
  if (!validacao.valid) return false;
  if (SGO_UTILS.safeUpper(validacao.data && validacao.data.perfil) === "REPRESENTADA") return false;
  return isAdminPerfilAuth_(validacao.data && validacao.data.perfil);
}

/**
 * Verifica se o perfil informado é admin.
 */
function isAdminPerfilAuth_(perfil) {
  const p = SGO_UTILS.safeUpper(perfil);
  return p === "ADMIN" || p === "DIRETORIA" || p === "GESTOR";
}

/* =========================================================================
   PERFIL RH (19/10/2026; rotina da empresa desde 21/10/2026)
   O RH faz a rotina da empresa como o Gestor (ver ROTINA DA EMPRESA abaixo):
   usuários dos perfis operacionais, áreas, cadastros de clientes, unidades
   e equipamentos, vínculos, frota, avisos, atividades da equipe, Caixa de
   decisões das áreas dele, regras de compras, Assistente do ponto e piloto
   do WhatsApp. No Programa de conduta consulta tudo e não decide (isso
   continua com isAdminPerfilAuth_ / Conduta_exigirGestor_).
   O RH NÃO acessa: Chaves e senhas, Configurações, emissão de certificados,
   laudos, relatórios e documentos técnicos (qualificação, calibração, NR-13,
   PGT/POP, Planejamento CME, Cronograma, Registros operacionais), o arquivo
   de documentos técnicos, inventário, Integração Auvo, Painel de qualidade,
   nem o Comercial (valores de venda). O menu esconde e o servidor recusa
   (SGO_bloquearRH_ no despacho de cada módulo técnico).
   Sem SGO_UTILS de propósito: os testes carregam os módulos sozinhos.
   ========================================================================= */
function SGO_ehPerfilRH_(perfil) {
  return String(perfil === null || perfil === undefined ? "" : perfil).trim().toUpperCase() === "RH";
}

/* =========================================================================
   ROTINA DA EMPRESA (21/10/2026, pedido do dono)
   "Toda parte do sistema de inserir e organizar, os gestores, RH e
   financeiro conseguem fazer; só coisas importantes do sistema são do
   Administrador." Cadastros do dia a dia (condutores, CNH, veículos,
   documentos do veículo, multas, clientes, unidades, equipamentos,
   vínculos, usuários dos perfis operacionais e áreas), frota, reservas,
   atividades da equipe, avisos com ciência, Caixa de decisões nas áreas de
   cada um, regras de compras, configuração do Assistente do ponto e a lista
   de pessoas do piloto do WhatsApp: ADMIN, DIRETORIA, GESTOR, RH e
   FINANCEIRO. Catálogo comercial: gestão comercial e Financeiro (o RH não
   vê valores de venda).
   isAdminPerfilAuth_ continua sendo a "gestão de decisões" (Programa de
   conduta, Integração Auvo, Painel de qualidade, excluir cadastro
   definitivamente, aprovações por faixa): não muda aqui.
   Só o Administrador (e a Diretoria onde já era): Chaves e senhas,
   integrações e credenciais, acervo do Auvo, modos especiais, Matriz de
   avisos, telefones do piloto, contas e perfis ADMIN e DIRETORIA, excluir
   usuário. Ninguém muda o próprio perfil.
   ========================================================================= */
var SGO_PERFIS_ROTINA = ["ADMIN", "DIRETORIA", "GESTOR", "RH", "FINANCEIRO"];

/** Perfil que faz a rotina da empresa (cadastrar, editar e organizar). */
function SGO_ehGestaoRotina_(perfil) {
  var p = String(perfil === null || perfil === undefined ? "" : perfil).trim().toUpperCase();
  return SGO_PERFIS_ROTINA.indexOf(p) >= 0;
}

/** Mesma regra, a partir da sessão (falso se a sessão não vale). */
function SGO_ehGestaoRotinaSessao_(sessionId) {
  var v = validarSessao(sessionId);
  return !!(v && v.valid && SGO_ehGestaoRotina_(v.data && v.data.perfil));
}

/** Rotina pela sessão, para os módulos: gestão de decisões (isAdminSession) ou rotina da empresa. */
function SGO_rotinaSessao_(sessionId) {
  try { if (isAdminSession(sessionId)) return true; } catch (e) {}
  try { return SGO_ehGestaoRotinaSessao_(sessionId); } catch (e2) { return false; }
}

/** Texto de quem pode, para as mensagens das telas. */
var SGO_TEXTO_GESTAO_ROTINA = "a gestão (Administrador, Diretoria, Gestor, RH ou Financeiro)";

/** Quem consulta e organiza dados de pessoas da equipe (lista de usuários, áreas): a rotina da empresa. */
function SGO_podeConsultarPessoas_(perfil) {
  return isAdminPerfilAuth_(perfil) || SGO_ehPerfilRH_(perfil) || SGO_ehGestaoRotina_(perfil);
}

/** Recusa o perfil RH nos módulos técnicos. "oQue" = nome da área, ex.: "o Certificado de calibração". */
function SGO_bloquearRH_(sessao, oQue) {
  if (sessao && SGO_ehPerfilRH_(sessao.perfil)) {
    throw new Error("Não foi possível abrir " + (oQue || "esta área") + ": o perfil RH não tem acesso aos documentos técnicos. " +
      "Use o menu para voltar ao Início. Se precisar de um documento técnico, peça à equipe técnica ou à gestão.");
  }
  return sessao;
}

/**
 * Salva sessão em dupla camada:
 * 1) CacheService (Rápido, temporário)
 * 2) ScriptProperties (Persistente, lento)
 */
function salvarSessaoAuth_(payload) {
  const sessionId = SGO_UTILS.safe(payload && payload.sessionId);
  if (!sessionId) return;

  const raw = JSON.stringify(payload);
  const ttl = getSessionTtlSecondsAuth_();

  try {
    // Cache Service limita a 6 horas (21600s) estritamente
    const cacheTtl = ttl > 21600 ? 21600 : ttl;
    CacheService.getScriptCache().put(sessionId, raw, cacheTtl);
  } catch (e) {
    // não derruba por falha de cache
  }

  try {
    PropertiesService
      .getScriptProperties()
      .setProperty(getSessionPropertyKeyAuth_(sessionId), raw);
  } catch (e) {
    // não derruba por falha de properties
  }
}

/**
 * Lê sessão do cache e, se necessário, restaura do ScriptProperties.
 */
function lerSessaoAuth_(sessionId) {
  const sessionKey = SGO_UTILS.safe(sessionId);
  if (!sessionKey) return null;

  try {
    const cache = CacheService.getScriptCache();
    const rawCache = cache.get(sessionKey);

    if (rawCache) {
      try {
        const dataCache = JSON.parse(rawCache);
        // A sessão pode ter sido renovada no banco por outra execução. Cache vencido
        // nunca autoriza remover a cópia persistente: confira-a antes de encerrar.
        if (dataCache && dataCache.sessionId === sessionKey && !sessaoExpiradaAuth_(dataCache)) return dataCache;
      } catch (e) {
        // segue para fallback
      }
    }
  } catch (e) {
    // segue para fallback
  }

  try {
    const rawProp = PropertiesService
      .getScriptProperties()
      .getProperty(getSessionPropertyKeyAuth_(sessionKey));

    if (!rawProp) return null;

    const data = JSON.parse(rawProp);

    if (!sessaoExpiradaAuth_(data)) {
      try {
        const ttl = getSessionTtlSecondsAuth_();
        const cacheTtl = ttl > 21600 ? 21600 : ttl;
        CacheService.getScriptCache().put(sessionKey, rawProp, cacheTtl);
      } catch (e) {
        // ignora
      }
    }

    return data;
  } catch (e) {
    return null;
  }
}

/**
 * Remove sessão de todas as camadas.
 */
function removerSessaoAuth_(sessionId) {
  const sessionKey = SGO_UTILS.safe(sessionId);
  if (!sessionKey) return;

  try {
    CacheService.getScriptCache().remove(sessionKey);
  } catch (e) {
    // ignora
  }

  try {
    PropertiesService
      .getScriptProperties()
      .deleteProperty(getSessionPropertyKeyAuth_(sessionKey));
  } catch (e) {
    // ignora
  }
}

/**
 * Monta a chave de armazenamento da sessão.
 */
function getSessionPropertyKeyAuth_(sessionId) {
  return "SGO_SESSION_" + SGO_UTILS.safe(sessionId);
}

/**
 * Informa se a sessão expirou.
 */
function sessaoExpiradaAuth_(data) {
  if (!data || !data.expiresAt) return true;

  const exp = new Date(data.expiresAt);
  if (isNaN(exp.getTime())) return true;

  return exp.getTime() < new Date().getTime();
}

/**
 * TTL da sessão em segundos.
 * Usa SGO_CFG.SESSION_TTL se existir, senão assume 21600 (6 horas).
 */
function getSessionTtlSecondsAuth_() {
  const ttl = Number(SGO_CFG && SGO_CFG.SESSION_TTL);
  if (!isNaN(ttl) && ttl > 0) return ttl;
  return 21600; 
}

/**
 * Gera um ID de sessão robusto.
 */
function gerarSessionIdAuth_() {
  return "SESS_" + SGO_UTILS.uuid() + "_" + new Date().getTime();
}

/**
 * Normaliza texto para comparação segura de login.
 */
function normalizarTextoAuth_(valor) {
  return SGO_UTILS.safe(valor).trim();
}

/**
 * Extrai mensagem do erro com segurança.
 */
function getErrorMessageAuth_(err) {
  return String(err && err.message ? err.message : err || "Erro desconhecido");
}

/**
 * Registra logs de autenticação alinhado com as 6 colunas do banco de dados (SGO_Setup.gs)
 */
function registrarLogAuth_(acao, ctx) {
  try {
    const dbId = SGO_CFG.DB_ID;
    if (!dbId) return;

    const ss = SpreadsheetApp.openById(dbId);
    const sheet = ss.getSheetByName(SGO_CFG.SHEETS.SYS_LOGS);
    if (!sheet) return;

    const usuario = SGO_UTILS.safe(ctx && ctx.usuario);
    const perfil = SGO_UTILS.safe(ctx && ctx.perfil);
    const detalhe = SGO_UTILS.safe(ctx && ctx.detalhe);

    // Agora insere 6 colunas, preenchendo o "MODULO" com "AUTH"
    sheet.appendRow([
      SGO_UTILS.uuid(),
      SGO_UTILS.nowIso(), // Usa o padronizador do sistema
      usuario,
      acao,
      "AUTH", // Coluna "MODULO" adicionada para alinhar com o banco
      montarDetalheLogAuth_(perfil, detalhe)
    ]);
  } catch (err) {
    // não derruba o sistema por falha de log
  }
}

/**
 * Monta o detalhe do log.
 */
function montarDetalheLogAuth_(perfil, detalhe) {
  const partes = [];

  if (perfil) partes.push("Perfil: " + perfil);
  if (detalhe) partes.push("Detalhe: " + detalhe);

  return partes.join(" | ");
}
