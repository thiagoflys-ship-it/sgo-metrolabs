// ============================================================
// SGO_Auth_V2.js — Backend de autenticação V2
// SHA-256 + salt, leitura por header, email na sessão,
// bloqueio por tentativas.
// Paralelo ao login legado — não substitui SGO_Auth.js ainda.
// Sessão V2 é compatível com validarSessao/exigirSessao legados.
// ============================================================

var SGO_AUTH_V2 = (function () {
  "use strict";

  var DEV_SCRIPT_ID = "12xiWNlQ-WKVpiofmcGfBaX4EBdlsIxKFJG2PFTamHUmSUs89c4LW3WSG";
  var PV2_SCRIPT_ID = "1iKgbkoBgRuethKuFhQM1H1W9vRvuBM1tT21-cYizkusfT_YrgHbIbZ1y";
  var ABA_AUTH_USR  = "AUTH_USUARIOS";
  var ABA_AUTH_LOG  = "AUTH_LOG_ACESSO";
  var MAX_TENT      = 5;
  var BLOQ_MIN      = 15;     // minutos de bloqueio automático
  var SESSION_TTL   = 21600;  // 6 horas em segundos

  // ── Helpers de infra ──────────────────────────────────────

  function dbId_() {
    var id = String(
      PropertiesService.getScriptProperties().getProperty("DB_ID") || ""
    ).trim();
    if (!id) throw new Error("DB_ID nao configurado em ScriptProperties.");
    return id;
  }

  function db_() { return SpreadsheetApp.openById(dbId_()); }

  function hexBytes_(bytes) {
    return bytes.map(function (b) {
      return ("0" + (b & 0xff).toString(16)).slice(-2);
    }).join("");
  }

  // ── 1. Gerar salt ─────────────────────────────────────────
  function authV2GerarSalt_() {
    var u1 = Utilities.getUuid().replace(/-/g, "");
    var u2 = Utilities.getUuid().replace(/-/g, "");
    var ts = new Date().getTime().toString(36);
    return (u1 + u2 + ts).slice(0, 64);
  }

  // ── 2. Hash SHA-256 ───────────────────────────────────────
  function authV2HashSenha_(senha, salt) {
    var input = "SGO_V2::" + salt + "::" + senha;
    return hexBytes_(
      Utilities.computeDigest(
        Utilities.DigestAlgorithm.SHA_256,
        input,
        Utilities.Charset.UTF_8
      )
    );
  }

  // ── 3. Verificar senha ────────────────────────────────────
  function authV2VerificarSenha_(senhaInformada, senhaHash, salt) {
    if (!senhaInformada || !senhaHash || !salt) return false;
    return authV2HashSenha_(senhaInformada, salt) === senhaHash;
  }

  // ── 4. Normalizar login/e-mail ────────────────────────────
  function authV2NormalizarLogin_(valor) {
    return String(valor || "").trim().toLowerCase();
  }

  // ── 5. Ler AUTH_USUARIOS por header ──────────────────────
  function authV2LerAuthUsuarios_() {
    var ss  = db_();
    var sh  = ss.getSheetByName(ABA_AUTH_USR);
    if (!sh || sh.getLastRow() < 1)
      return { headers: [], usuarios: [], sh: sh, ss: ss };
    var lastRow = sh.getLastRow();
    var lastCol = sh.getLastColumn();
    var dados   = sh.getRange(1, 1, lastRow, lastCol).getValues();
    var headers = dados[0].map(function (h) { return String(h || "").trim(); });
    var usuarios = [];
    for (var i = 1; i < dados.length; i++) {
      var obj = {};
      headers.forEach(function (h, idx) { obj[h] = dados[i][idx]; });
      obj.__row = i + 1;
      if (String(obj.ID || "").trim() || String(obj.USUARIO || "").trim())
        usuarios.push(obj);
    }
    return { headers: headers, usuarios: usuarios, sh: sh, ss: ss };
  }

  // ── 6. Buscar por login ou e-mail ─────────────────────────
  function authV2BuscarUsuarioPorLoginOuEmail_(loginOuEmail) {
    var busca = authV2NormalizarLogin_(loginOuEmail);
    if (!busca) return null;
    var ctx = authV2LerAuthUsuarios_();
    for (var i = 0; i < ctx.usuarios.length; i++) {
      var u   = ctx.usuarios[i];
      var usr = authV2NormalizarLogin_(u.USUARIO);
      var eml = authV2NormalizarLogin_(u.EMAIL);
      if (usr === busca || (eml && eml === busca))
        return { usuario: u, ctx: ctx };
    }
    return null;
  }

  // Atualizar um campo e ATUALIZADO_EM na linha do usuário
  function setCampo_(ctx, row, campo, valor) {
    var col = ctx.headers.indexOf(campo);
    if (col < 0) return;
    ctx.sh.getRange(row, col + 1).setValue(valor);
    var iAtu = ctx.headers.indexOf("ATUALIZADO_EM");
    if (iAtu >= 0) ctx.sh.getRange(row, iAtu + 1).setValue(new Date().toISOString());
    var iAtuP = ctx.headers.indexOf("ATUALIZADO_POR");
    if (iAtuP >= 0) ctx.sh.getRange(row, iAtuP + 1).setValue("AUTH_V2_SISTEMA");
  }

  // ── 7. Registrar log de acesso ────────────────────────────
  function authV2RegistrarLogAcesso_(usuObj, acao, detalhe, statusLog) {
    try {
      var sh = db_().getSheetByName(ABA_AUTH_LOG);
      if (!sh) return;
      sh.appendRow([
        Utilities.getUuid(),
        new Date().toISOString(),
        String(usuObj && usuObj.ID      ? usuObj.ID      : ""),
        String(usuObj && usuObj.USUARIO ? usuObj.USUARIO : ""),
        String(usuObj && usuObj.EMAIL   ? usuObj.EMAIL   : ""),
        String(acao    || ""),
        String(detalhe || ""),
        "",   // IP_HASH — indisponível em Apps Script
        "",   // USER_AGENT_HASH
        String(statusLog || "OK")
      ]);
    } catch (_e) { /* falha silenciosa — não bloquear fluxo de login */ }
  }

  // ── 8. Criar sessão V2 ────────────────────────────────────
  // Formato compatível com validarSessao/exigirSessao do SGO_Auth.js legado.
  // Campos extras (email, tecnicoId, etc.) são ignorados pelo legado mas
  // ficam disponíveis nos módulos que usam exigirSessao.
  function authV2CriarSessao_(u) {
    var agora  = new Date();
    var expira = new Date(agora.getTime() + SESSION_TTL * 1000);
    var sessId = "SESS_" + Utilities.getUuid().replace(/-/g, "") + "_" + agora.getTime();
    var payload = {
      sessionId      : sessId,
      userId         : String(u.ID              || ""),
      usuario        : String(u.USUARIO         || ""),
      email          : String(u.EMAIL           || ""),
      nome           : String(u.NOME            || ""),
      perfil         : String(u.PERFIL_PRINCIPAL || ""),
      perfilPrincipal: String(u.PERFIL_PRINCIPAL || ""),
      status         : String(u.STATUS          || ""),
      clienteId      : String(u.CLIENTE_ID      || ""),
      tecnicoId      : String(u.TECNICO_ID      || ""),
      funcionarioId  : String(u.FUNCIONARIO_ID  || ""),
      filial         : String(u.FILIAL          || ""),
      departamento   : String(u.DEPARTAMENTO    || ""),
      cargo          : String(u.CARGO           || ""),
      loginAt        : agora.toISOString(),
      lastAccessAt   : agora.toISOString(),
      expiresAt      : expira.toISOString(),
      versao         : "V2"
    };
    var chave = "SGO_SESSION_" + sessId;
    var str   = JSON.stringify(payload);
    PropertiesService.getScriptProperties().setProperty(chave, str);
    try { CacheService.getScriptCache().put(sessId, str, SESSION_TTL); } catch (_e) {}
    return payload;
  }

  // ── 9. Validar bloqueio/status ────────────────────────────
  function authV2ValidarBloqueio_(u) {
    var status = String(u.STATUS || "").trim().toUpperCase();
    // Verifica se BLOQUEIO_TEMPORARIO expirou — restaura acesso
    if (status === "BLOQUEADO") {
      var ate = u.BLOQUEADO_ATE ? new Date(u.BLOQUEADO_ATE) : null;
      if (ate && !isNaN(ate.getTime()) && ate <= new Date())
        return { bloqueado: false, expirou: true };
      return {
        bloqueado: true,
        motivo: "BLOQUEIO_TEMPORARIO",
        ate: ate ? ate.toISOString() : null
      };
    }
    if (status !== "ATIVO")
      return { bloqueado: true, motivo: "STATUS_" + status };
    // Verifica BLOQUEADO_ATE mesmo com STATUS ATIVO (ex.: race condition)
    var bloqAte = u.BLOQUEADO_ATE ? new Date(u.BLOQUEADO_ATE) : null;
    if (bloqAte && !isNaN(bloqAte.getTime()) && bloqAte > new Date())
      return { bloqueado: true, motivo: "BLOQUEIO_TEMPORARIO", ate: bloqAte.toISOString() };
    return { bloqueado: false };
  }

  // ── 10. Incrementar tentativa falha ───────────────────────
  function authV2IncrementarTentativaFalha_(found) {
    var u    = found.usuario;
    var ctx  = found.ctx;
    var tent = (parseInt(u.TENTATIVAS_LOGIN, 10) || 0) + 1;
    setCampo_(ctx, u.__row, "TENTATIVAS_LOGIN", tent);
    if (tent >= MAX_TENT) {
      var bloqAte = new Date(Date.now() + BLOQ_MIN * 60000).toISOString();
      setCampo_(ctx, u.__row, "BLOQUEADO_ATE", bloqAte);
      setCampo_(ctx, u.__row, "STATUS", "BLOQUEADO");
      authV2RegistrarLogAcesso_(u, "BLOQUEIO_AUTO",
        "Bloqueio automatico apos " + tent + " tentativas. Ate: " + bloqAte, "BLOQUEADO");
    }
    return tent;
  }

  // ── 11. Zerar tentativas após login OK ────────────────────
  function authV2ZerarTentativas_(found) {
    var u   = found.usuario;
    var ctx = found.ctx;
    setCampo_(ctx, u.__row, "TENTATIVAS_LOGIN", 0);
    setCampo_(ctx, u.__row, "BLOQUEADO_ATE", "");
    setCampo_(ctx, u.__row, "ULTIMO_LOGIN", new Date().toISOString());
    if (String(u.STATUS || "").toUpperCase() === "BLOQUEADO")
      setCampo_(ctx, u.__row, "STATUS", "ATIVO");
  }

  // ── loginV2 — DEV + PRODUCAO_V2 ──────────────────────────
  function loginV2Dev_(loginOuEmail, senha) {
    var scriptAtual = ScriptApp.getScriptId();
    if (scriptAtual !== DEV_SCRIPT_ID && scriptAtual !== PV2_SCRIPT_ID)
      return { success: false, message: "loginV2 nao autorizado neste ambiente." };
    try {
      var loginNorm = authV2NormalizarLogin_(loginOuEmail);
      if (!loginNorm || !senha)
        return { success: false, message: "Login e senha obrigatorios." };

      // 1. Buscar em AUTH_USUARIOS
      var found = authV2BuscarUsuarioPorLoginOuEmail_(loginNorm);
      if (!found) {
        authV2RegistrarLogAcesso_(
          { ID: "", USUARIO: loginNorm, EMAIL: "" },
          "LOGIN_NEGADO", "Usuario nao encontrado em AUTH_USUARIOS.", "NEGADO"
        );
        return { success: false, message: "Usuario ou senha invalidos." };
      }
      var u = found.usuario;

      // 2. Validar bloqueio/status
      var bloq = authV2ValidarBloqueio_(u);
      if (bloq.bloqueado) {
        authV2RegistrarLogAcesso_(u, "LOGIN_NEGADO",
          "Bloqueado: " + bloq.motivo + (bloq.ate ? " ate " + bloq.ate : ""), "BLOQUEADO");
        return {
          success: false,
          message: "Acesso bloqueado: " + bloq.motivo +
            (bloq.ate ? ". Tente apos: " + bloq.ate : ".")
        };
      }

      // 3. Verificar hash
      if (!authV2VerificarSenha_(senha,
            String(u.SENHA_HASH || ""), String(u.SENHA_SALT || ""))) {
        var tent = authV2IncrementarTentativaFalha_(found);
        authV2RegistrarLogAcesso_(u, "LOGIN_NEGADO",
          "Senha incorreta. Tentativa " + tent + "/" + MAX_TENT + ".", "NEGADO");
        return {
          success: false,
          message: "Usuario ou senha invalidos." +
            (tent >= MAX_TENT
              ? " Conta bloqueada por " + BLOQ_MIN + " min."
              : " (" + tent + "/" + MAX_TENT + ")")
        };
      }

      // 4. Sucesso — zerar tentativas, criar sessão, registrar log
      authV2ZerarTentativas_(found);
      var sessao = authV2CriarSessao_(u);
      authV2RegistrarLogAcesso_(u, "LOGIN_OK",
        "Login V2 OK. Perfil: " + sessao.perfil + ".", "OK");

      return {
        success  : true,
        sessionId: sessao.sessionId,
        versao   : "V2",
        user: {
          id             : sessao.userId,
          usuario        : sessao.usuario,
          email          : sessao.email,
          nome           : sessao.nome,
          perfil         : sessao.perfil,
          tecnicoId      : sessao.tecnicoId,
          funcionarioId  : sessao.funcionarioId,
          senhaTemporaria: String(u.SENHA_TEMPORARIA || "").toUpperCase() === "SIM",
          expiresAt      : sessao.expiresAt
        }
      };
    } catch (e) {
      return { success: false, message: "Erro interno em loginV2: " + e.message };
    }
  }

  // ── Exports ───────────────────────────────────────────────
  return {
    gerarSalt                   : authV2GerarSalt_,
    hashSenha                   : authV2HashSenha_,
    verificarSenha              : authV2VerificarSenha_,
    normalizarLogin             : authV2NormalizarLogin_,
    lerAuthUsuarios             : authV2LerAuthUsuarios_,
    buscarUsuarioPorLoginOuEmail: authV2BuscarUsuarioPorLoginOuEmail_,
    registrarLogAcesso          : authV2RegistrarLogAcesso_,
    criarSessao                 : authV2CriarSessao_,
    validarBloqueio             : authV2ValidarBloqueio_,
    incrementarTentativaFalha   : authV2IncrementarTentativaFalha_,
    zerarTentativas             : authV2ZerarTentativas_,
    loginV2DEV                  : loginV2Dev_
  };
})();

// Global wrapper — DEV only
function loginV2_DEV(loginOuEmail, senha) {
  return SGO_AUTH_V2.loginV2DEV(loginOuEmail, senha);
}

// ============================================================
// AUTH.4A — Backend portal do usuário (extensão de SGO_AUTH_V2)
// Adiciona: atualizar e-mail, recuperação de senha, redefinição
// por token e troca de senha no primeiro acesso.
// Todas as funções são DEV-only.
// ============================================================
(function (m) {
  "use strict";

  var DEV_SCRIPT_ID   = "12xiWNlQ-WKVpiofmcGfBaX4EBdlsIxKFJG2PFTamHUmSUs89c4LW3WSG";
  var PV2_SCRIPT_ID   = "1iKgbkoBgRuethKuFhQM1H1W9vRvuBM1tT21-cYizkusfT_YrgHbIbZ1y";
  var ABA_RECUPERACAO = "AUTH_RECUPERACAO_SENHA";
  var TOKEN_TTL_MIN   = 30;
  var SENHA_MIN_LEN   = 8;

  // ── Helpers privados ──────────────────────────────────────

  // Permite DEV e PRODUCAO_V2
  function devOnly_() {
    var id = ScriptApp.getScriptId();
    return id === DEV_SCRIPT_ID || id === PV2_SCRIPT_ID;
  }

  function dbId_() {
    var id = String(PropertiesService.getScriptProperties().getProperty("DB_ID") || "").trim();
    if (!id) throw new Error("DB_ID nao configurado.");
    return id;
  }

  function db_() { return SpreadsheetApp.openById(dbId_()); }

  function validarForcaSenha_(senha) {
    var s = String(senha || "");
    if (s.length < SENHA_MIN_LEN)
      return { valida: false, motivo: "Minimo " + SENHA_MIN_LEN + " caracteres." };
    if (!/[a-zA-Z]/.test(s))
      return { valida: false, motivo: "Deve conter ao menos uma letra." };
    if (!/[0-9]/.test(s))
      return { valida: false, motivo: "Deve conter ao menos um numero." };
    return { valida: true, motivo: "" };
  }

  function hashToken_(tokenRaw) {
    var bytes = Utilities.computeDigest(
      Utilities.DigestAlgorithm.SHA_256,
      "SGO_TOKEN::" + tokenRaw,
      Utilities.Charset.UTF_8
    );
    return bytes.map(function (b) {
      return ("0" + (b & 0xff).toString(16)).slice(-2);
    }).join("");
  }

  function gerarTokenRaw_() {
    return Utilities.getUuid().replace(/-/g, "") + new Date().getTime().toString(36);
  }

  function mascararEmail_(email) {
    var e  = String(email || "");
    var at = e.indexOf("@");
    if (at <= 0) return "***";
    var local  = e.slice(0, at);
    var domain = e.slice(at);
    return local.slice(0, Math.min(2, local.length)) + "***" + domain;
  }

  // Lê o registro do usuário por ID (relê fresh para evitar cache de ctx)
  function buscarUsuarioPorId_(usuarioId) {
    var ctx = m.lerAuthUsuarios();
    for (var i = 0; i < ctx.usuarios.length; i++) {
      if (String(ctx.usuarios[i].ID || "") === String(usuarioId || ""))
        return { usuario: ctx.usuarios[i], ctx: ctx };
    }
    return null;
  }

  // Valida e retorna registro de token em AUTH_RECUPERACAO_SENHA
  function lerRegistroToken_(tokenRaw) {
    var tokenHash = hashToken_(tokenRaw);
    var ss  = db_();
    var shR = ss.getSheetByName(ABA_RECUPERACAO);
    if (!shR || shR.getLastRow() < 2)
      return { valido: false, motivo: "Nenhum token encontrado." };
    var dados = shR.getRange(1, 1, shR.getLastRow(), shR.getLastColumn()).getValues();
    var hR    = dados[0].map(function (v) { return String(v || "").trim(); });
    var iHash   = hR.indexOf("TOKEN_HASH");
    var iUsado  = hR.indexOf("USADO");
    var iExpira = hR.indexOf("EXPIRA_EM");
    var iUid    = hR.indexOf("USUARIO_ID");
    var iEmail  = hR.indexOf("EMAIL");
    for (var i = 1; i < dados.length; i++) {
      if (String(dados[i][iHash] || "") !== tokenHash) continue;
      if (String(dados[i][iUsado] || "").toUpperCase() === "SIM")
        return { valido: false, motivo: "Token ja utilizado.", rowIndex: i + 1, shR: shR, hR: hR };
      var expira = new Date(String(dados[i][iExpira] || ""));
      if (isNaN(expira.getTime()) || expira <= new Date())
        return { valido: false, motivo: "Token expirado.", rowIndex: i + 1, shR: shR, hR: hR };
      return {
        valido    : true,
        tokenHash : tokenHash,
        usuarioId : String(dados[i][iUid]   || ""),
        email     : String(iEmail >= 0 ? dados[i][iEmail] : ""),
        expiresAt : expira.toISOString(),
        rowIndex  : i + 1,
        shR       : shR,
        hR        : hR
      };
    }
    return { valido: false, motivo: "Token invalido ou nao encontrado." };
  }

  // ── 1. atualizarEmailUsuarioAuthV2_DEV ───────────────────

  function atualizarEmail_(usuarioId, email) {
    if (!devOnly_()) return { success: false, message: "So pode rodar no DEV." };
    try {
      var emailNorm = String(email || "").trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNorm))
        return { success: false, message: "Formato de e-mail invalido: " + emailNorm };

      var ctx = m.lerAuthUsuarios();

      // Verificar unicidade
      for (var i = 0; i < ctx.usuarios.length; i++) {
        var eu = ctx.usuarios[i];
        if (String(eu.EMAIL || "").trim().toLowerCase() === emailNorm &&
            String(eu.ID    || "") !== String(usuarioId || ""))
          return { success: false, message: "E-mail ja cadastrado para outro usuario." };
      }

      // Encontrar usuário por ID
      var found = null;
      for (var j = 0; j < ctx.usuarios.length; j++) {
        if (String(ctx.usuarios[j].ID || "") === String(usuarioId || "")) {
          found = ctx.usuarios[j]; break;
        }
      }
      if (!found)
        return { success: false, message: "Usuario nao encontrado: " + usuarioId };

      var iEmail = ctx.headers.indexOf("EMAIL");
      if (iEmail < 0) return { success: false, message: "Coluna EMAIL ausente em AUTH_USUARIOS." };

      ctx.sh.getRange(found.__row, iEmail + 1).setValue(emailNorm);
      var iAtu  = ctx.headers.indexOf("ATUALIZADO_EM");
      var iAtuP = ctx.headers.indexOf("ATUALIZADO_POR");
      if (iAtu  >= 0) ctx.sh.getRange(found.__row, iAtu  + 1).setValue(new Date().toISOString());
      if (iAtuP >= 0) ctx.sh.getRange(found.__row, iAtuP + 1).setValue("AUTH4A_EMAIL_DEV");

      m.registrarLogAcesso(found, "EMAIL_ATUALIZADO",
        "EMAIL atualizado: " + mascararEmail_(emailNorm) + ".", "OK");

      return {
        success        : true,
        usuarioId      : String(usuarioId),
        usuario        : String(found.USUARIO || ""),
        emailNovo      : emailNorm,
        emailMascarado : mascararEmail_(emailNorm),
        message        : "EMAIL atualizado em AUTH_USUARIOS. CAD_USUARIOS nao alterada."
      };
    } catch (e) {
      return { success: false, message: "Erro: " + e.message };
    }
  }

  // ── 2. solicitarRecuperacaoSenhaV2_DEV ───────────────────

  function solicitarRecuperacao_(loginOuEmail, modoDryRun) {
    if (!devOnly_()) return { success: false, message: "So pode rodar no DEV." };
    try {
      var loginNorm = m.normalizarLogin(loginOuEmail);
      if (!loginNorm) return { success: false, message: "Informe usuario ou e-mail." };

      var MSG_NEUTRA = "Se houver e-mail cadastrado para este usuario, as instrucoes foram enviadas.";

      var found = m.buscarUsuarioPorLoginOuEmail(loginNorm);
      if (!found) {
        m.registrarLogAcesso(
          { ID: "", USUARIO: loginNorm, EMAIL: "" },
          "RECUPERACAO_SOLICITADA", "Usuario nao encontrado (resp. neutra).", "NEGADO"
        );
        return { success: true, message: MSG_NEUTRA };
      }

      var u = found.usuario;
      var emailDestino = String(u.EMAIL || "").trim();
      if (!emailDestino) {
        m.registrarLogAcesso(u, "RECUPERACAO_BLOQUEADA",
          "EMAIL vazio — recuperacao impossivel.", "BLOQUEADO");
        return {
          success: false,
          message: "Usuario sem e-mail cadastrado. Solicite atualizacao ao administrador."
        };
      }

      // Gerar token (raw nunca persiste exceto em dry-run para teste)
      var tokenRaw  = gerarTokenRaw_();
      var tokenHash = hashToken_(tokenRaw);
      var agora     = new Date();
      var expira    = new Date(agora.getTime() + TOKEN_TTL_MIN * 60000).toISOString();

      // Gravar em AUTH_RECUPERACAO_SENHA
      var ss  = db_();
      var shR = ss.getSheetByName(ABA_RECUPERACAO);
      if (!shR) throw new Error(ABA_RECUPERACAO + " nao encontrada.");
      var hR = shR.getLastRow() >= 1
        ? shR.getRange(1, 1, 1, shR.getLastColumn()).getValues()[0]
            .map(function (v) { return String(v || "").trim(); })
        : ["ID","USUARIO_ID","EMAIL","TOKEN_HASH","EXPIRA_EM",
           "USADO","USADO_EM","CRIADO_EM","IP_HASH","STATUS"];
      var reg = {
        "ID"        : Utilities.getUuid(),
        "USUARIO_ID": String(u.ID || ""),
        "EMAIL"     : emailDestino,
        "TOKEN_HASH": tokenHash,
        "EXPIRA_EM" : expira,
        "USADO"     : "NAO",
        "USADO_EM"  : "",
        "CRIADO_EM" : agora.toISOString(),
        "IP_HASH"   : "",
        "STATUS"    : "PENDENTE"
      };
      shR.appendRow(hR.map(function (h) {
        return reg.hasOwnProperty(h) ? reg[h] : "";
      }));

      // Atualizar AUTH_USUARIOS.TOKEN_RECUPERACAO_HASH + _EXPIRA_EM
      var ctx  = m.lerAuthUsuarios();
      var uRow = null;
      for (var i = 0; i < ctx.usuarios.length; i++) {
        if (String(ctx.usuarios[i].ID || "") === String(u.ID || "")) {
          uRow = ctx.usuarios[i]; break;
        }
      }
      if (uRow) {
        var iTH  = ctx.headers.indexOf("TOKEN_RECUPERACAO_HASH");
        var iTE  = ctx.headers.indexOf("TOKEN_RECUPERACAO_EXPIRA_EM");
        var iAtu = ctx.headers.indexOf("ATUALIZADO_EM");
        if (iTH  >= 0) ctx.sh.getRange(uRow.__row, iTH  + 1).setValue(tokenHash);
        if (iTE  >= 0) ctx.sh.getRange(uRow.__row, iTE  + 1).setValue(expira);
        if (iAtu >= 0) ctx.sh.getRange(uRow.__row, iAtu + 1).setValue(agora.toISOString());
      }

      m.registrarLogAcesso(u, "RECUPERACAO_SOLICITADA",
        "Token gerado. Expira: " + expira + ". DryRun: " + (!!modoDryRun) + ".", "OK");

      var resposta = {
        success        : true,
        emailMascarado : mascararEmail_(emailDestino),
        expiresAt      : expira,
        modoDryRun     : !!modoDryRun,
        message        : modoDryRun
          ? "[DRY-RUN] Token gerado. Use tokenParaTeste com redefinirSenhaPorTokenV2_DEV."
          : MSG_NEUTRA
      };
      // tokenRaw SOMENTE exposto em dry-run (não logar)
      if (modoDryRun) resposta.tokenParaTeste = tokenRaw;
      return resposta;
    } catch (e) {
      return { success: false, message: "Erro: " + e.message };
    }
  }

  // ── 3. validarTokenRecuperacaoSenhaV2_DEV ────────────────

  function validarToken_(tokenRaw) {
    if (!devOnly_()) return { success: false, message: "So pode rodar no DEV." };
    try {
      if (!tokenRaw) return { success: false, message: "Token nao informado." };
      var reg = lerRegistroToken_(tokenRaw);
      if (!reg.valido)
        return { success: false, message: reg.motivo || "Token invalido." };

      var found = buscarUsuarioPorId_(reg.usuarioId);
      var usrMasc = found
        ? String(found.usuario.USUARIO || "").slice(0, 2) + "***"
        : "***";

      return {
        success          : true,
        valido           : true,
        usuarioId        : reg.usuarioId,
        usuarioMascarado : usrMasc,
        emailMascarado   : mascararEmail_(reg.email),
        expiresAt        : reg.expiresAt
      };
    } catch (e) {
      return { success: false, message: "Erro: " + e.message };
    }
  }

  // ── 4. redefinirSenhaPorTokenV2_DEV ──────────────────────

  function redefinirSenhaPorToken_(tokenRaw, novaSenha) {
    if (!devOnly_()) return { success: false, message: "So pode rodar no DEV." };
    try {
      // Validar força ANTES de qualquer IO
      var forca = validarForcaSenha_(novaSenha);
      if (!forca.valida)
        return { success: false, message: "Senha fraca: " + forca.motivo };

      var reg = lerRegistroToken_(tokenRaw);
      if (!reg.valido)
        return { success: false, message: "Token invalido: " + reg.motivo };

      // Gerar novo hash e descartar senha imediatamente
      var novoSalt = m.gerarSalt();
      var novoHash = m.hashSenha(novaSenha, novoSalt);
      novaSenha = null;

      var found = buscarUsuarioPorId_(reg.usuarioId);
      if (!found)
        return { success: false, message: "Usuario nao encontrado em AUTH_USUARIOS." };
      var u   = found.usuario;
      var ctx = found.ctx;

      // Atualizar AUTH_USUARIOS
      var campos = {
        "SENHA_HASH"        : novoHash,
        "SENHA_SALT"        : novoSalt,
        "SENHA_TEMPORARIA"  : "NAO",
        "TENTATIVAS_LOGIN"  : 0,
        "BLOQUEADO_ATE"     : "",
        "TOKEN_RECUPERACAO_HASH"      : "",
        "TOKEN_RECUPERACAO_EXPIRA_EM" : "",
        "ATUALIZADO_POR"    : "AUTH4A_REDEFINICAO_TOKEN_DEV"
      };
      Object.keys(campos).forEach(function (campo) {
        var col = ctx.headers.indexOf(campo);
        if (col >= 0) ctx.sh.getRange(u.__row, col + 1).setValue(campos[campo]);
      });
      var iAtu = ctx.headers.indexOf("ATUALIZADO_EM");
      if (iAtu >= 0) ctx.sh.getRange(u.__row, iAtu + 1).setValue(new Date().toISOString());

      // Marcar token como USADO em AUTH_RECUPERACAO_SENHA
      if (reg.shR && reg.rowIndex > 0) {
        var iUsado   = reg.hR.indexOf("USADO");
        var iUsadoEm = reg.hR.indexOf("USADO_EM");
        var iStat    = reg.hR.indexOf("STATUS");
        if (iUsado   >= 0) reg.shR.getRange(reg.rowIndex, iUsado   + 1).setValue("SIM");
        if (iUsadoEm >= 0) reg.shR.getRange(reg.rowIndex, iUsadoEm + 1).setValue(new Date().toISOString());
        if (iStat    >= 0) reg.shR.getRange(reg.rowIndex, iStat    + 1).setValue("UTILIZADO");
      }

      m.registrarLogAcesso(u, "SENHA_REDEFINIDA",
        "Senha redefinida via token. SENHA_TEMPORARIA=NAO. CAD_USUARIOS inalterada.", "OK");

      return {
        success          : true,
        usuarioId        : reg.usuarioId,
        usuario          : String(u.USUARIO || ""),
        senhaTemporaria  : "NAO",
        tokenMarcadoUsado: true,
        message          : "Senha redefinida. Faca login com a nova senha via loginV2_DEV."
      };
    } catch (e) {
      return { success: false, message: "Erro: " + e.message };
    }
  }

  // ── 5. trocarSenhaPrimeiroAcessoV2_DEV ───────────────────

  function trocarSenhaPrimeiroAcesso_(sessionId, senhaAtual, novaSenha) {
    if (!devOnly_()) return { success: false, message: "So pode rodar no DEV." };
    try {
      if (!sessionId) return { success: false, message: "sessionId obrigatorio." };

      // Validar força ANTES de qualquer IO
      var forca = validarForcaSenha_(novaSenha);
      if (!forca.valida)
        return { success: false, message: "Nova senha fraca: " + forca.motivo };

      // Carregar sessão V2
      var sessStr = PropertiesService.getScriptProperties()
        .getProperty("SGO_SESSION_" + sessionId);
      if (!sessStr)
        return { success: false, message: "Sessao nao encontrada ou expirada." };
      var sess = JSON.parse(sessStr);
      if (sess.versao !== "V2")
        return { success: false, message: "Requer sessao V2. Faca login via loginV2_DEV." };
      if (new Date(sess.expiresAt) <= new Date())
        return { success: false, message: "Sessao expirada. Faca login novamente." };

      var found = buscarUsuarioPorId_(sess.userId);
      if (!found)
        return { success: false, message: "Usuario da sessao nao encontrado em AUTH_USUARIOS." };
      var u   = found.usuario;
      var ctx = found.ctx;

      // Verificar senha atual
      var hashOk = m.verificarSenha(senhaAtual,
        String(u.SENHA_HASH || ""), String(u.SENHA_SALT || ""));
      senhaAtual = null; // descartar
      if (!hashOk)
        return { success: false, message: "Senha atual incorreta." };

      // Gerar novo hash e descartar nova senha
      var novoSalt = m.gerarSalt();
      var novoHash = m.hashSenha(novaSenha, novoSalt);
      novaSenha = null;

      // Atualizar AUTH_USUARIOS
      var campos = {
        "SENHA_HASH"      : novoHash,
        "SENHA_SALT"      : novoSalt,
        "SENHA_TEMPORARIA": "NAO",
        "TENTATIVAS_LOGIN": 0,
        "BLOQUEADO_ATE"   : "",
        "ATUALIZADO_POR"  : "AUTH4A_TROCA_PRIMEIRO_ACESSO_DEV"
      };
      Object.keys(campos).forEach(function (campo) {
        var col = ctx.headers.indexOf(campo);
        if (col >= 0) ctx.sh.getRange(u.__row, col + 1).setValue(campos[campo]);
      });
      var iAtu = ctx.headers.indexOf("ATUALIZADO_EM");
      if (iAtu >= 0) ctx.sh.getRange(u.__row, iAtu + 1).setValue(new Date().toISOString());

      m.registrarLogAcesso(u, "SENHA_ALTERADA",
        "Senha alterada no primeiro acesso. SENHA_TEMPORARIA=NAO. CAD_USUARIOS inalterada.", "OK");

      return {
        success        : true,
        usuarioId      : sess.userId,
        usuario        : String(u.USUARIO || ""),
        senhaTemporaria: "NAO",
        message        : "Senha alterada com sucesso. SENHA_TEMPORARIA=NAO."
      };
    } catch (e) {
      return { success: false, message: "Erro: " + e.message };
    }
  }

  // ── Registrar no módulo ───────────────────────────────────
  m.atualizarEmail            = atualizarEmail_;
  m.solicitarRecuperacao      = solicitarRecuperacao_;
  m.validarToken              = validarToken_;
  m.redefinirSenhaPorToken    = redefinirSenhaPorToken_;
  m.trocarSenhaPrimeiroAcesso = trocarSenhaPrimeiroAcesso_;

})(SGO_AUTH_V2);

// ── Global wrappers — DEV only ────────────────────────────────
function atualizarEmailUsuarioAuthV2_DEV(usuarioId, email) {
  return SGO_AUTH_V2.atualizarEmail(usuarioId, email);
}
function solicitarRecuperacaoSenhaV2_DEV(loginOuEmail, modoDryRun) {
  return SGO_AUTH_V2.solicitarRecuperacao(loginOuEmail, modoDryRun);
}
function validarTokenRecuperacaoSenhaV2_DEV(token) {
  return SGO_AUTH_V2.validarToken(token);
}
function redefinirSenhaPorTokenV2_DEV(token, novaSenha) {
  return SGO_AUTH_V2.redefinirSenhaPorToken(token, novaSenha);
}
function trocarSenhaPrimeiroAcessoV2_DEV(sessionId, senhaAtual, novaSenha) {
  return SGO_AUTH_V2.trocarSenhaPrimeiroAcesso(sessionId, senhaAtual, novaSenha);
}

// ============================================================
// AUTH.5 — PERMISSÕES E PERFIS POR MÓDULO
// Extension IIFE: adiciona obterContextoUsuario e podeAcessarModulo
// ============================================================
(function(m) {
  var AUTH5_MODULOS_TODOS_ = [
    "dashboard", "dashboard_bi", "clientes", "unidades", "equipamentos",
    "documentos", "registros", "relatorios", "inventario", "importacao",
    "contratos", "os", "os_questionarios", "assistencia_tecnica", "missoes",
    "tecnicos", "pecas", "fornecedores", "estoque", "rastreabilidade",
    "frota", "admin", "autoclave", "financeiro", "mobile_campo",
    "fin_cartoes", "lavadora", "relatorio_conformidade", "planejamento_cme"
  ];

  var AUTH5_MAPA_PADRAO_ = {
    DIRETORIA : AUTH5_MODULOS_TODOS_.filter(function(x) { return x !== "admin"; }),
    GESTOR    : [
      "dashboard","clientes","unidades","equipamentos","documentos","registros",
      "relatorios","inventario","contratos","os","missoes","tecnicos","pecas",
      "fornecedores","estoque","rastreabilidade","frota","assistencia_tecnica"
    ],
    TECNICO   : [
      "dashboard","equipamentos","documentos","registros","os",
      "assistencia_tecnica","missoes","pecas","rastreabilidade","mobile_campo"
    ],
    METROLOGIA: [
      "dashboard","dashboard_bi","equipamentos","documentos","registros","relatorios",
      "os","os_questionarios","assistencia_tecnica","missoes","pecas",
      "rastreabilidade","autoclave","lavadora","relatorio_conformidade"
    ],
    COMERCIAL : ["dashboard","clientes","contratos","relatorios","dashboard_bi"],
    FINANCEIRO: [
      "dashboard","contratos","os","relatorios","dashboard_bi","financeiro","fin_cartoes"
    ],
    CLIENTE   : ["dashboard","equipamentos","documentos","os","relatorios"]
  };

  function lerPermissoesDB_(ss, perfil) {
    var sh = ss.getSheetByName("AUTH_PERMISSOES");
    if (!sh || sh.getLastRow() < 2) return null;
    var data = sh.getRange(1, 1, sh.getLastRow(), sh.getLastColumn()).getValues();
    var h = data[0].map(function(v) { return String(v || "").trim(); });
    var iP   = h.indexOf("PERFIL");
    var iM   = h.indexOf("MODULO");
    var iPer = h.indexOf("PERMITIDO");
    var iSt  = h.indexOf("STATUS");
    var modulos = [];
    for (var i = 1; i < data.length; i++) {
      var p   = String(iP   >= 0 ? data[i][iP]   : "").toUpperCase();
      var per = String(iPer >= 0 ? data[i][iPer]  : "").toUpperCase();
      var st  = String(iSt  >= 0 ? data[i][iSt]   : "ATIVO").toUpperCase();
      if (p !== perfil || per !== "SIM" || st !== "ATIVO") continue;
      modulos.push(String(iM >= 0 ? data[i][iM] : "").toLowerCase());
    }
    return modulos.length > 0 ? modulos : null;
  }

  function aplicarOverridesUsuario_(ss, userId, modulos) {
    var sh = ss.getSheetByName("AUTH_USUARIO_PERMISSOES");
    if (!sh || sh.getLastRow() < 2) return modulos;
    var data = sh.getRange(1, 1, sh.getLastRow(), sh.getLastColumn()).getValues();
    var h = data[0].map(function(v) { return String(v || "").trim(); });
    var iUid = h.indexOf("USUARIO_ID");
    var iM   = h.indexOf("MODULO");
    var iP   = h.indexOf("PERMITIDO");
    var iSt  = h.indexOf("STATUS");
    var result = modulos.slice();
    for (var i = 1; i < data.length; i++) {
      if (String(iUid >= 0 ? data[i][iUid] : "") !== String(userId)) continue;
      var st  = String(iSt >= 0 ? data[i][iSt] : "ATIVO").toUpperCase();
      if (st !== "ATIVO") continue;
      var mod = String(iM >= 0 ? data[i][iM] : "").toLowerCase();
      var per = String(iP >= 0 ? data[i][iP] : "").toUpperCase();
      if (per === "SIM" && result.indexOf(mod) < 0) {
        result.push(mod);
      } else if (per === "NAO") {
        result = result.filter(function(x) { return x !== mod; });
      }
    }
    return result;
  }

  function obterContextoUsuario_(sessionId) {
    try {
      if (!sessionId) return { success: false, message: "sessionId obrigatorio." };
      var props = PropertiesService.getScriptProperties();
      var sessStr = props.getProperty("SGO_SESSION_" + sessionId);
      if (!sessStr) return { success: false, message: "Sessao nao encontrada ou expirada." };
      var sess;
      try { sess = JSON.parse(sessStr); } catch (ep) {
        return { success: false, message: "Sessao corrompida." };
      }
      if (!sess || !sess.userId) return { success: false, message: "Sessao invalida: sem userId." };
      if (sess.expiresAt && new Date(sess.expiresAt) <= new Date()) {
        return { success: false, message: "Sessao expirada." };
      }

      var perfil  = String(sess.perfil || "").toUpperCase();
      var isAdmin = (perfil === "ADMIN");
      var modulos;

      if (isAdmin) {
        modulos = AUTH5_MODULOS_TODOS_.slice();
      } else {
        var dbId = String(props.getProperty("DB_ID") || "").trim();
        modulos = null;
        if (dbId) {
          try {
            var ss = SpreadsheetApp.openById(dbId);
            modulos = lerPermissoesDB_(ss, perfil);
            if (modulos) modulos = aplicarOverridesUsuario_(ss, sess.userId, modulos);
          } catch (eDb) { modulos = null; }
        }
        if (!modulos) modulos = (AUTH5_MAPA_PADRAO_[perfil] || ["dashboard"]).slice();
      }

      return {
        success    : true,
        usuario    : {
          id          : String(sess.userId       || ""),
          usuario     : String(sess.usuario      || ""),
          nome        : String(sess.nome         || ""),
          perfil      : perfil,
          email       : String(sess.email        || ""),
          filial      : String(sess.filial       || ""),
          departamento: String(sess.departamento || ""),
          cargo       : String(sess.cargo        || "")
        },
        permissoes : modulos,
        isAdmin    : isAdmin,
        sessionId  : sessionId,
        versao     : "AUTH5"
      };
    } catch (e) {
      return { success: false, message: "Erro interno: " + e.message };
    }
  }

  function podeAcessarModulo_(sessionId, modulo) {
    try {
      var ctx = obterContextoUsuario_(sessionId);
      if (!ctx || !ctx.success) {
        return { permitido: false, motivo: ctx ? ctx.message : "Sessao invalida.", perfil: null, modulo: modulo };
      }
      var mod      = String(modulo || "").toLowerCase();
      var permitido = ctx.isAdmin || ctx.permissoes.indexOf(mod) >= 0;
      return {
        permitido : permitido,
        motivo    : permitido
          ? "Acesso permitido."
          : ("Perfil " + ctx.usuario.perfil + " nao tem acesso ao modulo " + modulo + "."),
        perfil    : ctx.usuario.perfil,
        modulo    : modulo
      };
    } catch (e) {
      return { permitido: false, motivo: "Erro: " + e.message, perfil: null, modulo: modulo };
    }
  }

  m.obterContextoUsuario = obterContextoUsuario_;
  m.podeAcessarModulo    = podeAcessarModulo_;
})(SGO_AUTH_V2);

function authV2ObterContextoUsuario(sessionId) {
  return SGO_AUTH_V2.obterContextoUsuario(sessionId);
}
function authV2UsuarioPodeAcessarModulo(sessionId, modulo) {
  return SGO_AUTH_V2.podeAcessarModulo(sessionId, modulo);
}

// ============================================================
// AUTH.6 — ENDURECIMENTO DE SESSÃO E GUARD LEVE
// Extension IIFE: validarSessao, exigirModulo, limparExpiradas
// ============================================================
(function(m) {
  var AUTH6_PERFIS_VALIDOS_ = [
    "ADMIN","DIRETORIA","GESTOR","TECNICO","METROLOGIA","COMERCIAL","FINANCEIRO","CLIENTE"
  ];

  function validarSessao_(sessionId) {
    try {
      if (!sessionId) {
        return { success: true, valido: false, motivo: "sessionId nao informado." };
      }
      var props   = PropertiesService.getScriptProperties();
      var sessStr = props.getProperty("SGO_SESSION_" + sessionId);
      if (!sessStr) {
        return { success: true, valido: false, motivo: "Sessao nao encontrada." };
      }
      var sess;
      try { sess = JSON.parse(sessStr); } catch (ep) {
        return { success: true, valido: false, motivo: "Sessao corrompida." };
      }
      if (!sess || !sess.userId) {
        return { success: true, valido: false, motivo: "Sessao invalida: sem userId." };
      }
      if (sess.expiresAt && new Date(sess.expiresAt) <= new Date()) {
        return { success: true, valido: false, motivo: "Sessao expirada.", expiresAt: sess.expiresAt };
      }

      // Verificar usuario ativo em AUTH_USUARIOS
      var dbId = String(props.getProperty("DB_ID") || "").trim();
      if (!dbId) {
        return { success: true, valido: false, motivo: "DB_ID nao configurado." };
      }
      var ss     = SpreadsheetApp.openById(dbId);
      var shAuth = ss.getSheetByName("AUTH_USUARIOS");
      if (!shAuth || shAuth.getLastRow() < 2) {
        return { success: true, valido: false, motivo: "AUTH_USUARIOS nao encontrada ou vazia." };
      }
      var data = shAuth.getRange(1, 1, shAuth.getLastRow(), shAuth.getLastColumn()).getValues();
      var h    = data[0].map(function(v) { return String(v || "").trim(); });
      var iId     = h.indexOf("ID");
      var iStatus = h.indexOf("STATUS");
      var iPerfil = h.indexOf("PERFIL_PRINCIPAL");

      var linhaUser = null;
      for (var i = 1; i < data.length; i++) {
        if (iId >= 0 && String(data[i][iId]) === String(sess.userId)) {
          linhaUser = data[i];
          break;
        }
      }
      if (!linhaUser) {
        return { success: true, valido: false, motivo: "Usuario nao encontrado em AUTH_USUARIOS." };
      }
      var status = iStatus >= 0 ? String(linhaUser[iStatus] || "").toUpperCase() : "ATIVO";
      if (status !== "ATIVO") {
        return { success: true, valido: false, motivo: "Usuario inativo ou bloqueado (STATUS=" + status + ")." };
      }
      var perfil = iPerfil >= 0
        ? String(linhaUser[iPerfil] || "").toUpperCase()
        : String(sess.perfil || "").toUpperCase();
      if (AUTH6_PERFIS_VALIDOS_.indexOf(perfil) < 0) {
        return { success: true, valido: false, motivo: "Perfil invalido: " + perfil };
      }

      return {
        success  : true,
        valido   : true,
        usuario  : String(sess.usuario  || ""),
        perfil   : perfil,
        isAdmin  : (perfil === "ADMIN"),
        expiresAt: sess.expiresAt || null,
        motivo   : null
      };
    } catch (e) {
      return { success: false, valido: false, motivo: "Erro interno: " + e.message };
    }
  }

  function exigirModulo_(sessionId, modulo) {
    try {
      var vSess = validarSessao_(sessionId);
      if (!vSess || !vSess.valido) {
        return {
          permitido: false,
          motivo   : vSess ? (vSess.motivo || "Sessao invalida.") : "Erro na validacao de sessao.",
          perfil   : null,
          modulo   : modulo
        };
      }
      if (vSess.isAdmin) {
        return { permitido: true, motivo: "ADMIN: acesso total.", perfil: vSess.perfil, modulo: modulo };
      }
      return m.podeAcessarModulo(sessionId, modulo);
    } catch (e) {
      return { permitido: false, motivo: "Erro: " + e.message, perfil: null, modulo: modulo };
    }
  }

  function limparSessoesExpiradas_() {
    try {
      var props    = PropertiesService.getScriptProperties();
      var allProps = props.getProperties();
      var agora    = new Date();
      var analisadas = 0;
      var removidas  = 0;
      var erros      = [];

      Object.keys(allProps).forEach(function(key) {
        if (key.indexOf("SGO_SESSION_") !== 0) return;
        analisadas++;
        try {
          var sess = JSON.parse(allProps[key]);
          if (!sess || !sess.expiresAt) return;
          if (new Date(sess.expiresAt) <= agora) {
            props.deleteProperty(key);
            removidas++;
          }
        } catch (ep) {
          erros.push("Chave corrompida: " + key);
        }
      });

      return { success: true, analisadas: analisadas, removidas: removidas, erros: erros };
    } catch (e) {
      return { success: false, message: "Erro: " + e.message };
    }
  }

  m.validarSessao   = validarSessao_;
  m.exigirModulo    = exigirModulo_;
  m.limparExpiradas = limparSessoesExpiradas_;
})(SGO_AUTH_V2);

function authV2ValidarSessao(sessionId) {
  return SGO_AUTH_V2.validarSessao(sessionId);
}
function authV2ExigirModulo(sessionId, modulo) {
  return SGO_AUTH_V2.exigirModulo(sessionId, modulo);
}
function authV2LimparSessoesExpiradas_DEV() {
  if (ScriptApp.getScriptId() !== "12xiWNlQ-WKVpiofmcGfBaX4EBdlsIxKFJG2PFTamHUmSUs89c4LW3WSG") {
    return { success: false, message: "BLOQUEIO: funcao DEV-only executada fora do DEV." };
  }
  return SGO_AUTH_V2.limparExpiradas();
}
