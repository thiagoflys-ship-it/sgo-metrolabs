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
 * SEGURANÇA: HASH DE SENHAS (SHA-256 + SALT POR USUÁRIO)
 *
 * Formato armazenado: "sha256$<salt>$<hash-hex>"
 * - Compatível com legado: valores sem o prefixo são tratados
 *   como texto plano e convertidos automaticamente no primeiro
 *   login bem-sucedido (migração transparente).
 * - Migração em lote: rodar migrarSenhasParaHash() em
 *   SGO_Setup_Seguranca.js.
 ****************************************************/
var SENHA_HASH_PREFIX_AUTH = 'sha256$';

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

/** Gera o valor a ser armazenado na coluna SENHA. */
function gerarHashSenhaAuth_(senha) {
  const salt = gerarSaltAuth_();
  return SENHA_HASH_PREFIX_AUTH + salt + '$' + hashHexAuth_(salt + String(senha || ''));
}

/** Indica se o valor armazenado já está no formato hash. */
function senhaEstaHasheadaAuth_(valorArmazenado) {
  return String(valorArmazenado || '').indexOf(SENHA_HASH_PREFIX_AUTH) === 0;
}

/** Compara a senha informada com o valor armazenado (hash ou legado texto plano). */
function verificarSenhaAuth_(senhaInformada, valorArmazenado) {
  const arm = String(valorArmazenado || '');
  const inf = String(senhaInformada || '');
  if (!arm || !inf) return false;

  if (senhaEstaHasheadaAuth_(arm)) {
    const partes = arm.split('$'); // ['sha256', salt, hash]
    if (partes.length !== 3) return false;
    return hashHexAuth_(partes[1] + inf) === partes[2];
  }

  // Legado: texto plano
  return arm === inf;
}

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
        verificarSenhaAuth_(senhaInformada, linha[2]) // SEGURANCA: compara via hash (com suporte a legado)
      ) {

        // MIGRAÇÃO TRANSPARENTE: se a senha ainda estava em texto plano,
        // converte para hash imediatamente após o login bem-sucedido.
        if (!senhaEstaHasheadaAuth_(linha[2])) {
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
        data.nome = SGO_UTILS.safe(cadastro.NOME) || data.nome;
        data.usuario = normalizarTextoAuth_(cadastro.USUARIO) || data.usuario;
        data.conferidoEm = new Date().toISOString();
      }
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
 * Linha do usuário da sessão em CAD_USUARIOS: objeto, null (não existe mais)
 * ou false (não deu para ler agora — não derruba a sessão por falha de leitura).
 */
function lerUsuarioSessaoAuth_(userId) {
  try {
    const alvo = SGO_UTILS.safe(userId);
    const achado = SGO_DATA.getAll(SGO_CFG.SHEETS.CAD_USUARIOS).find(function (u) { return SGO_UTILS.safe(u.ID) === alvo; });
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

/* =========================================================================
   PERFIL RH (19/10/2026)
   O RH vê o que um colaborador vê (Início, Minhas atividades, Avisos, Frota
   e o próprio farol da conduta) e, além disso:
     - Avisos: publica comunicados (as mesmas ações de publicação da gestão:
       publicar, ver quem leu, reenviar e arquivar);
     - Programa de conduta: consulta ocorrências, missões, ausências,
       fechamentos, relatórios e extratos de todos. Não homologa, não julga,
       não decide missão, não registra ausência e não fecha o mês (isso
       continua com isAdminPerfilAuth_ / Conduta_exigirGestor_). O "fiscal" do
       programa é quem registra a ocorrência, e isso o RH pode, como todos;
     - Usuários: consulta da lista (vínculo de trabalho, celular, situação),
       sem criar, editar, redefinir senha, inativar ou excluir. Conta de
       Administrador continua só com Administrador.
   O RH NÃO acessa: Chaves e senhas, Configurações, emissão de certificados,
   laudos, relatórios e documentos técnicos (qualificação, calibração, NR-13,
   PGT/POP, Planejamento CME, Cronograma, Registros operacionais), os
   cadastros técnicos (clientes, unidades, equipamentos, vínculos, arquivo de
   documentos, inventário), Integração Auvo, Painel de qualidade, nem o
   Comercial. O menu esconde e o servidor recusa (SGO_bloquearRH_ no despacho
   de cada módulo técnico).
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
   documentos, multas, clientes, unidades, equipamentos, contatos,
   fornecedores, usuários dos perfis operacionais), frota, reservas,
   atividades da equipe, avisos, regras de compras, catálogo comercial,
   horários e o Assistente do ponto: ADMIN, DIRETORIA, GESTOR, RH e
   FINANCEIRO.
   isAdminPerfilAuth_ continua sendo a "gestão de decisões" (Programa de
   conduta, valores do Comercial, aprovações por faixa): não muda aqui.
   Só o Administrador: Chaves e senhas, integrações e credenciais, acervo do
   Auvo, modos especiais, Matriz de avisos, perfis ADMIN/DIRETORIA, excluir
   usuário definitivamente.
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

/** Texto de quem pode, para as mensagens das telas. */
var SGO_TEXTO_GESTAO_ROTINA = "a gestão (Administrador, Diretoria, Gestor, RH ou Financeiro)";

/** Gestão (Administrador, Gestor, Diretoria) ou RH: consulta dados de pessoas de toda a equipe. */
function SGO_podeConsultarPessoas_(perfil) {
  return isAdminPerfilAuth_(perfil) || SGO_ehPerfilRH_(perfil);
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
