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
 * Realiza login do usuário.
 * Mantém compatibilidade com a assinatura já usada no sistema.
 */
function login(usuario, senha) {
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
        senhaDb === senhaInformada
      ) {
        
        // Verifica se o usuário está bloqueado ou inativo antes de liberar acesso
        if (statusDb !== SGO_CFG.STATUS.ATIVO) {
           registrarLogAuth_("LOGIN_NEGADO", {
            usuario: usuarioInformado,
            perfil: perfilDb,
            detalhe: "Tentativa de login com usuário inativo/bloqueado."
          });
          return {
            success: false,
            message: "Usuário inativo ou bloqueado. Contate o administrador."
          };
        }

        const agora = new Date();
        const agoraIso = SGO_UTILS.nowIso(); // Usando a função padronizada do UTILS
        const sessionId = gerarSessionIdAuth_();
        const expiresAt = new Date(agora.getTime() + (getSessionTtlSecondsAuth_() * 1000));
        const expiresAtIso = expiresAt.toISOString();

        const payload = {
          sessionId: sessionId,
          userId: id,
          usuario: usuarioDb,
          nome: nomeDb,
          perfil: perfilDb,
          status: statusDb,
          clienteId: clienteIdDb, // Salva o ID do cliente na sessão para regras de visualização
          loginAt: agoraIso,
          lastAccessAt: agoraIso,
          expiresAt: expiresAtIso
        };

        salvarSessaoAuth_(payload);

        registrarLogAuth_("LOGIN_OK", {
          usuario: usuarioDb,
          perfil: perfilDb,
          detalhe: "Login realizado com sucesso."
        });

        return {
          success: true,
          sessionId: sessionId,
          user: {
            id: id,
            usuario: usuarioDb,
            nome: nomeDb,
            perfil: perfilDb,
            clienteId: clienteIdDb
          }
        };
      }
    }

    // Se varreu o for inteiro e não achou a combinação
    registrarLogAuth_("LOGIN_FALHA", {
      usuario: usuarioInformado,
      perfil: "",
      detalhe: "Usuário ou senha inválidos."
    });

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

    // Renova a sessão a cada validação
    const agora = new Date();
    data.lastAccessAt = SGO_UTILS.nowIso();
    data.expiresAt = new Date(agora.getTime() + (getSessionTtlSecondsAuth_() * 1000)).toISOString();

    salvarSessaoAuth_(data);

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
    return {
      success: false,
      message: validacao.message || "Sessão inválida."
    };
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

  return validacao.data;
}

/**
 * Verifica se o perfil atual é administrativo.
 * Já deixa pronto para regras futuras de QR/portal.
 */
function isAdminSession(sessionId) {
  const validacao = validarSessao(sessionId);
  if (!validacao.valid) return false;
  return isAdminPerfilAuth_(validacao.data && validacao.data.perfil);
}

/**
 * Verifica se o perfil informado é admin.
 */
function isAdminPerfilAuth_(perfil) {
  const p = SGO_UTILS.safeUpper(perfil);
  return p === "ADMIN" || p === "DIRETORIA" || p === "GESTOR";
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
        return JSON.parse(rawCache);
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