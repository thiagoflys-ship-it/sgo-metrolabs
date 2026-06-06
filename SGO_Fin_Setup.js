// SGO_Fin_Setup.js — METROLABS SGO+
// Módulo : FIN — Cartão Flash, Prestação de Contas e Conciliação Inteligente
// Versão  : FIN.1 — Schema inicial
// Criado  : 2026-06-06
//
// REGRA: este arquivo não executa nada automaticamente.
// Para criar as abas no banco FIN, chame setupFinanceiroV2() manualmente
// no editor do Apps Script, somente após configurar DB_FIN_ID em PropertiesService.
//
// Pré-requisito obrigatório antes de executar:
//   PropertiesService.getScriptProperties()
//     .setProperty('DB_FIN_ID', '<id_da_planilha_fin>');
//
// SGO_Config.js e SGO_Setup_v2.js serão atualizados em etapa futura (FIN.2+).
// Os nomes de abas e DB_KEY "FIN" estão definidos localmente neste arquivo.

const SGO_FIN_SETUP = (() => {

  /* ============================================================
     IDENTIFICAÇÃO DO MÓDULO
  ============================================================ */
  const VERSAO    = "FIN.1";
  const MODULO    = "FIN";
  const DESCRICAO = "Cartão Flash, Prestação de Contas e Conciliação Inteligente";

  /* ============================================================
     NOMES DAS ABAS
     Definidos localmente — SGO_Config.js não é alterado nesta etapa.
     Em FIN.2+ estas constantes migram para SGO_CFG.SHEETS.FIN_*.
  ============================================================ */
  const ABAS = {
    CARTOES     : "FIN_CARTOES",
    TERMOS      : "FIN_CARTOES_TERMOS",
    RECARGAS    : "FIN_CARTOES_RECARGAS",
    LANCAMENTOS : "FIN_CARTOES_LANCAMENTOS",
    ANEXOS      : "FIN_CARTOES_ANEXOS",
    EXTRATOS    : "FIN_CARTOES_EXTRATOS",
    CONCILIACAO : "FIN_CARTOES_CONCILIACAO",
    PENDENCIAS  : "FIN_CARTOES_PENDENCIAS",
    DOCUMENTOS  : "FIN_CARTOES_DOCUMENTOS",
    POLITICA    : "FIN_CARTOES_POLITICA",
    LOGS        : "FIN_CARTOES_LOGS",
    CONFIG      : "FIN_CARTOES_CONFIG"
  };

  /* ============================================================
     HEADERS DAS ABAS
     Regras do schema:
     - Número completo do cartão NÃO é armazenado.
       Usar apenas NUMERO_FINAL_4 + IDENTIFICADOR_CARTAO + APELIDO_CARTAO.
     - Campos base em toda aba: ID, STATUS, CRIADO_EM, CRIADO_POR.
     - Campos de auditoria de update: ATUALIZADO_EM, ATUALIZADO_POR (quando aplicável).
  ============================================================ */
  const HEADERS = {

    // 31 headers
    "FIN_CARTOES": [
      "ID", "CARTAO_ID", "IDENTIFICADOR_CARTAO", "NUMERO_FINAL_4", "APELIDO_CARTAO",
      "OPERADORA", "BANDEIRA", "TIPO_CARTAO", "LIMITE_OPERACIONAL", "LIMITE_TOTAL",
      "DATA_EMISSAO", "DATA_VALIDADE_CARTAO",
      "FUNCIONARIO_ID", "FUNCIONARIO_NOME", "FUNCIONARIO_EMAIL", "FUNCIONARIO_TELEFONE",
      "GESTOR_RESPONSAVEL_ID", "CENTRO_CUSTO", "FINALIDADE",
      "STATUS_CARTAO", "DATA_BLOQUEIO", "MOTIVO_BLOQUEIO", "BLOQUEADO_POR",
      "TERMO_ASSINADO", "TERMO_ID",
      "OBSERVACOES",
      "STATUS", "CRIADO_EM", "CRIADO_POR", "ATUALIZADO_EM", "ATUALIZADO_POR"
    ],

    // 33 headers
    "FIN_CARTOES_TERMOS": [
      "ID", "TERMO_ID", "CARTAO_ID",
      "FUNCIONARIO_ID", "FUNCIONARIO_NOME", "FUNCIONARIO_CPF",
      "VERSAO_TERMO", "HASH_TERMO",
      "TOKEN_VALIDACAO", "URL_VALIDACAO", "QRCODE_LINK",
      "DATA_EXPIRACAO_TOKEN", "ENVIADO_WHATSAPP", "DATA_ENVIO_WHATSAPP", "NUMERO_WHATSAPP",
      "IP_DISPOSITIVO", "USER_AGENT",
      "LATITUDE", "LONGITUDE", "LOCALIZACAO_TEXTO",
      "DATA_ASSINATURA", "ASSINATURA_DATA_URL", "ASSINATURA_FILE_ID", "ASSINATURA_LINK",
      "PDF_FILE_ID", "PDF_URL", "NOME_ARQUIVO",
      "ACEITE_POLITICA", "DATA_ACEITE_POLITICA", "VERSAO_POLITICA",
      "STATUS", "CRIADO_EM", "CRIADO_POR"
    ],

    // 23 headers
    "FIN_CARTOES_RECARGAS": [
      "ID", "RECARGA_ID", "CARTAO_ID",
      "FUNCIONARIO_ID", "FUNCIONARIO_NOME",
      "VALOR", "DATA_RECARGA", "PERIODO_REFERENCIA",
      "FORMA_RECARGA", "NUMERO_TRANSFERENCIA", "BANCO_ORIGEM",
      "COMPROVANTE_FILE_ID", "COMPROVANTE_LINK",
      "RESPONSAVEL_FINANCEIRO_ID", "RESPONSAVEL_NOME",
      "AUTORIZADO_POR_ID", "AUTORIZADO_POR_NOME",
      "OBSERVACOES",
      "STATUS", "CRIADO_EM", "CRIADO_POR", "ATUALIZADO_EM", "ATUALIZADO_POR"
    ],

    // 37 headers
    "FIN_CARTOES_LANCAMENTOS": [
      "ID", "LANCAMENTO_ID", "CARTAO_ID",
      "FUNCIONARIO_ID", "FUNCIONARIO_NOME",
      "DATA_GASTO", "HORA_GASTO", "VALOR",
      "ESTABELECIMENTO", "CATEGORIA_GASTO",
      "OS_ID", "OS_NUMERO", "TEM_OS", "JUSTIFICATIVA_SEM_OS",
      "LATITUDE", "LONGITUDE", "LOCALIZACAO_TEXTO", "ENDERECO_APROXIMADO",
      "COMPROVANTE_OK", "COMPROVANTE_FILE_ID", "COMPROVANTE_LINK", "TIPO_COMPROVANTE",
      "DESCRICAO_GASTO", "OBSERVACOES",
      "STATUS_PRESTACAO", "DATA_APROVACAO", "APROVADO_POR", "MOTIVO_REJEICAO",
      "CONCILIADO", "LANCAMENTO_EXTRATO_ID", "DIVERGENCIA_TIPO", "DIVERGENCIA_VALOR",
      "STATUS", "CRIADO_EM", "CRIADO_POR", "ATUALIZADO_EM", "ATUALIZADO_POR"
    ],

    // 18 headers
    "FIN_CARTOES_ANEXOS": [
      "ID", "ANEXO_ID", "LANCAMENTO_ID", "PENDENCIA_ID", "CARTAO_ID", "FUNCIONARIO_ID",
      "TIPO_ANEXO", "NOME_ARQUIVO", "FILE_ID", "LINK_ARQUIVO",
      "MIME_TYPE", "TAMANHO_BYTES", "DESCRICAO", "ORIGEM", "DATA_UPLOAD",
      "STATUS", "CRIADO_EM", "CRIADO_POR"
    ],

    // 27 headers
    "FIN_CARTOES_EXTRATOS": [
      "ID", "EXTRATO_ID", "IMPORTACAO_ID", "CARTAO_ID",
      "DATA_TRANSACAO", "HORA_TRANSACAO", "VALOR", "TIPO_TRANSACAO",
      "ESTABELECIMENTO_EXTRATO", "CIDADE_EXTRATO", "UF_EXTRATO", "CATEGORIA_EXTRATO",
      "NUMERO_AUTORIZACAO", "NSU", "CARTAO_FINAL", "MODALIDADE",
      "CONCILIADO", "LANCAMENTO_ID", "STATUS_CONCILIACAO",
      "DIVERGENCIA_TIPO", "DIVERGENCIA_VALOR",
      "ARQUIVO_ORIGEM_ID", "LINHA_ORIGEM",
      "OBSERVACOES",
      "STATUS", "CRIADO_EM", "CRIADO_POR"
    ],

    // 30 headers
    "FIN_CARTOES_CONCILIACAO": [
      "ID", "CONCILIACAO_ID", "DATA_CONCILIACAO", "REALIZADO_POR",
      "PERIODO_INICIO", "PERIODO_FIM",
      "CARTAO_ID", "FUNCIONARIO_ID", "FUNCIONARIO_NOME",
      "TOTAL_LANCAMENTOS", "TOTAL_EXTRATO", "TOTAL_CONCILIADO",
      "TOTAL_DIVERGENTE", "TOTAL_SEM_PRESTACAO", "TOTAL_SEM_EXTRATO",
      "PERCENTUAL_CONCILIADO", "SCORE_RISCO", "CLASSIFICACAO_RISCO",
      "OBSERVACOES_FINANCEIRO", "CONCLUSAO_IA", "CONCLUSAO_GESTOR",
      "PDF_FILE_ID", "PDF_URL", "TOKEN_VALIDACAO",
      "HASH_SHA256", "URL_VALIDACAO", "QRCODE_LINK",
      "STATUS", "CRIADO_EM", "CRIADO_POR"
    ],

    // 25 headers
    "FIN_CARTOES_PENDENCIAS": [
      "ID", "PENDENCIA_ID", "TIPO_PENDENCIA",
      "LANCAMENTO_ID", "EXTRATO_ID", "CARTAO_ID",
      "FUNCIONARIO_ID", "FUNCIONARIO_NOME",
      "DESCRICAO_PENDENCIA", "VALOR_ENVOLVIDO", "DATA_LIMITE_ESCLARECIMENTO",
      "NOTIFICACOES_ENVIADAS", "ULTIMA_NOTIFICACAO_EM", "CANAL_NOTIFICACAO",
      "ESCLARECIMENTO_TEXTO", "ESCLARECIMENTO_EM", "ESCLARECIDO_POR",
      "RESOLVIDO_POR", "RESOLUCAO_DESCRICAO", "RESOLUCAO_EM",
      "STATUS", "CRIADO_EM", "CRIADO_POR", "ATUALIZADO_EM", "ATUALIZADO_POR"
    ],

    // 28 headers
    "FIN_CARTOES_DOCUMENTOS": [
      "ID", "DOCUMENTO_ID", "TIPO_DOCUMENTO",
      "CARTAO_ID", "FUNCIONARIO_ID", "FUNCIONARIO_NOME",
      "PERIODO_REFERENCIA", "NUMERO_DOCUMENTO", "TITULO",
      "NOME_ARQUIVO", "FILE_ID", "LINK_ARQUIVO", "DATA_EMISSAO",
      "HASH_SHA256", "TOKEN_VALIDACAO", "URL_VALIDACAO", "QRCODE_LINK",
      "EMITIDO_POR",
      "DESTINATARIO_NOME", "DESTINATARIO_EMAIL", "DESTINATARIO_WHATSAPP",
      "ENVIADO_WHATSAPP", "DATA_ENVIO_WHATSAPP",
      "ENVIADO_EMAIL", "DATA_ENVIO_EMAIL",
      "STATUS", "CRIADO_EM", "CRIADO_POR"
    ],

    // 20 headers
    "FIN_CARTOES_POLITICA": [
      "ID", "POLITICA_ID", "TIPO_DOCUMENTO", "VERSAO", "TITULO",
      "CONTEUDO_HTML", "CONTEUDO_RESUMIDO",
      "DATA_VIGENCIA_INICIO", "DATA_VIGENCIA_FIM",
      "ELABORADO_POR", "APROVADO_POR", "DATA_APROVACAO",
      "FILE_ID", "LINK_ARQUIVO", "TOKEN_VALIDACAO", "HASH_CONTEUDO",
      "TOTAL_ACEITES",
      "STATUS", "CRIADO_EM", "CRIADO_POR"
    ],

    // 17 headers
    // Nota: STATUS e CRIADO_POR intencionalmente ausentes.
    // Logs são registros de auditoria imutáveis — não têm estado gerenciável
    // (STATUS não se aplica) e o autor já está identificado por USUARIO_ID,
    // USUARIO_NOME, PERFIL e DATA_HORA. Padrão consistente com SYS_LOGS do SGO+.
    "FIN_CARTOES_LOGS": [
      "ID", "LOG_ID", "DATA_HORA",
      "USUARIO_ID", "USUARIO_NOME", "PERFIL",
      "ACAO", "MODULO", "ENTIDADE_TIPO", "ENTIDADE_ID",
      "DADOS_ANTES", "DADOS_DEPOIS",
      "IP_DISPOSITIVO", "USER_AGENT",
      "RESULTADO", "MENSAGEM",
      "CRIADO_EM"
    ],

    // 11 headers
    // Nota: STATUS intencionalmente ausente.
    // Configs usam ATIVO (boolean) como controle de vigência —
    // semântica mais precisa que STATUS (ATIVO/INATIVO/PENDENTE/BLOQUEADO)
    // para uma tabela de chave/valor operacional.
    "FIN_CARTOES_CONFIG": [
      "ID", "CONFIG_ID", "CHAVE", "VALOR", "DESCRICAO",
      "TIPO_VALOR", "ATIVO",
      "CRIADO_EM", "CRIADO_POR", "ATUALIZADO_EM", "ATUALIZADO_POR"
    ]

  };

  /* ============================================================
     HELPERS PRIVADOS
  ============================================================ */

  // Lê DB_FIN_ID de PropertiesService de forma segura.
  // Retorna string com o ID ou null se ausente/vazio.
  function obterDbFinId_() {
    try {
      var id = PropertiesService.getScriptProperties().getProperty("DB_FIN_ID");
      return (id && String(id).trim() !== "") ? String(id).trim() : null;
    } catch (e) {
      return null;
    }
  }

  // Abre o banco FIN pelo DB_FIN_ID.
  // Lança Error descritivo se o ID não estiver configurado ou for inválido.
  function abrirDbFin_() {
    var id = obterDbFinId_();
    if (!id) {
      throw new Error(
        "DB_FIN_ID nao esta configurado em PropertiesService. " +
        "Configure antes de executar o setup: " +
        "PropertiesService.getScriptProperties()" +
        ".setProperty('DB_FIN_ID', '<id_da_planilha_fin>')"
      );
    }
    try {
      return SpreadsheetApp.openById(id);
    } catch (e) {
      throw new Error(
        "DB_FIN_ID invalido ou sem permissao de acesso. ID: " + id +
        " | Erro: " + e.message
      );
    }
  }

  // Adiciona um item de verificação ao array de checks.
  // Usado para pré-voo antes das operações de setup.
  function adicionarCheck_(lista, label, ok, detalhe) {
    lista.push({
      check  : label,
      ok     : !!ok,
      detalhe: String(detalhe || "")
    });
  }

  // Aplica formatação padrão FIN ao cabeçalho (azul escuro, fonte branca).
  // Falha silenciosa — formatação é cosmética e não deve bloquear o setup.
  function formatarCabecalhoFin_(sheet, totalColunas) {
    try {
      var range = sheet.getRange(1, 1, 1, totalColunas);
      range.setBackground("#1a3a5c");
      range.setFontColor("#ffffff");
      range.setFontWeight("bold");
      range.setFontSize(9);
      sheet.setFrozenRows(1);
    } catch (e) {
      // intencional: não propagar erro de formatação
    }
  }

  // Garante que uma aba FIN exista com todos os headers.
  // Cria a aba se não existir. Se já existir, apenas adiciona colunas faltantes.
  // Nunca apaga dados. Nunca remove colunas. Nunca reordena headers existentes.
  function garantirAbaFin_(ss, nomeAba, headers) {
    var resultado = {
      nomeAba            : nomeAba,
      criada             : false,
      jaExistia          : false,
      headersAdicionados : [],
      headersExistentes  : 0
    };

    var sheet = ss.getSheetByName(nomeAba);

    if (!sheet) {
      // Aba nova: reutilizar Sheet1 vazia se for a única (comportamento do Sheets)
      var sheets = ss.getSheets();
      if (
        sheets.length === 1 &&
        sheets[0].getLastRow() === 0 &&
        sheets[0].getLastColumn() === 0
      ) {
        sheet = sheets[0];
        sheet.setName(nomeAba);
      } else {
        sheet = ss.insertSheet(nomeAba);
      }
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      formatarCabecalhoFin_(sheet, headers.length);
      resultado.criada = true;
      resultado.headersAdicionados = headers.slice();
      return resultado;
    }

    // Aba já existe — apenas adicionar colunas faltantes
    resultado.jaExistia = true;
    var lastCol = sheet.getLastColumn();
    var atuais = [];

    if (lastCol > 0) {
      atuais = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(function(h) {
        return String(h || "").trim();
      });
    }
    resultado.headersExistentes = atuais.length;

    var faltantes = headers.filter(function(h) {
      return atuais.indexOf(h) < 0;
    });

    if (faltantes.length > 0) {
      sheet.getRange(1, atuais.length + 1, 1, faltantes.length).setValues([faltantes]);
      formatarCabecalhoFin_(sheet, atuais.length + faltantes.length);
      resultado.headersAdicionados = faltantes.slice();
    }

    return resultado;
  }

  // Monta o objeto de schema completo usado por obterSchemaFinanceiroV2.
  function gerarResumoSchema_() {
    var abas = [];
    var totalHeaders = 0;

    Object.keys(ABAS).forEach(function(chave) {
      var nomeAba = ABAS[chave];
      var hdrs    = HEADERS[nomeAba] || [];
      totalHeaders += hdrs.length;
      abas.push({
        chave        : chave,
        nomeAba      : nomeAba,
        totalHeaders : hdrs.length,
        headers      : hdrs.slice()
      });
    });

    return {
      modulo       : MODULO,
      versao       : VERSAO,
      descricao    : DESCRICAO,
      totalAbas    : abas.length,
      totalHeaders : totalHeaders,
      abas         : abas,
      observacoes  : [
        "Banco obrigatoriamente separado: DB_FIN_ID via PropertiesService. Nao usa DB_ID principal.",
        "Numero completo do cartao nao armazenado. Apenas NUMERO_FINAL_4 + IDENTIFICADOR_CARTAO + APELIDO_CARTAO.",
        "Setup idempotente: nao apaga dados, nao remove colunas, nao reordena headers existentes.",
        "SGO_Config.js recebera DB_FIN_ID + DB_KEYS.FIN + DRIVE.FOLDER_FINANCEIRO + SHEETS.FIN_* em FIN.2+.",
        "SGO_Setup_v2.js recebera chamada a criarEstruturaFinanceiroV2_() em FIN.2+.",
        "SGO_DocumentFactory.js recebera tipos FIN_TERMO_CARTAO, FIN_PRESTACAO_CONTAS, FIN_CONCILIACAO, FIN_PENDENCIA, FIN_BLOQUEIO, FIN_POP, FIN_POLITICA, FIN_RELATORIO_IA em FIN.10."
      ]
    };
  }

  /* ============================================================
     FUNÇÃO PÚBLICA: setupFinanceiroV2
     Executa o setup idempotente das 12 abas FIN no banco DB_FIN_ID.
     NÃO deve ser executada até que DB_FIN_ID esteja configurado
     e a planilha FIN esteja criada manualmente no Google Drive.
  ============================================================ */
  function setupFinanceiroV2() {
    var log                     = [];
    var bloqueios               = [];
    var avisos                  = [];
    var abasProcessadas         = [];
    var totalHeadersAdicionados = 0;

    // === PRÉ-VOO: checks antes de qualquer operação ===
    var checks = [];

    var dbFinId = obterDbFinId_();
    adicionarCheck_(checks, "DB_FIN_ID configurado em PropertiesService",
      !!dbFinId, dbFinId || "nao configurado");

    adicionarCheck_(checks, "Schema FIN carregado (12 abas)",
      Object.keys(ABAS).length === 12,
      Object.keys(ABAS).length + " abas definidas");

    adicionarCheck_(checks, "Headers FIN carregados (300 total)",
      (function() {
        var total = 0;
        Object.keys(HEADERS).forEach(function(k) { total += HEADERS[k].length; });
        return total === 300;
      })(),
      (function() {
        var total = 0;
        Object.keys(HEADERS).forEach(function(k) { total += HEADERS[k].length; });
        return total + " headers definidos";
      })()
    );

    log.push("=== SGO_FIN_SETUP v" + VERSAO + " ===");
    checks.forEach(function(c) {
      log.push("[CHECK " + (c.ok ? "OK" : "FALHOU") + "] " + c.check + " — " + c.detalhe);
    });

    // Gate obrigatório: DB_FIN_ID deve existir antes de qualquer operação
    if (!dbFinId) {
      bloqueios.push(
        "DB_FIN_ID nao esta configurado em PropertiesService. " +
        "Crie a planilha FIN manualmente no Google Drive e configure: " +
        "PropertiesService.getScriptProperties()" +
        ".setProperty('DB_FIN_ID', '<id_da_planilha_fin>')"
      );
      return {
        success             : false,
        executado           : false,
        abasProcessadas     : [],
        headersAdicionados  : 0,
        checks              : checks,
        bloqueios           : bloqueios,
        avisos              : avisos,
        log                 : log.concat(["BLOQUEADO: DB_FIN_ID nao configurado."])
      };
    }

    // Abrir o banco FIN
    var ss;
    try {
      ss = abrirDbFin_();
      log.push("Banco FIN aberto: " + ss.getName() + " | ID: " + ss.getId());
    } catch (e) {
      bloqueios.push("Falha ao abrir banco FIN: " + e.message);
      return {
        success             : false,
        executado           : false,
        abasProcessadas     : [],
        headersAdicionados  : 0,
        checks              : checks,
        bloqueios           : bloqueios,
        avisos              : avisos,
        log                 : log.concat(["BLOQUEADO: " + e.message])
      };
    }

    // Processar cada aba na ordem definida em ABAS
    var chaves = Object.keys(ABAS);
    for (var i = 0; i < chaves.length; i++) {
      var chave   = chaves[i];
      var nomeAba = ABAS[chave];
      var headers = HEADERS[nomeAba];

      if (!headers || headers.length === 0) {
        var avisoSemHeaders = "Aba " + nomeAba + ": headers nao definidos no schema, pulada.";
        avisos.push(avisoSemHeaders);
        log.push("[AVISO] " + avisoSemHeaders);
        continue;
      }

      try {
        var res = garantirAbaFin_(ss, nomeAba, headers);
        totalHeadersAdicionados += res.headersAdicionados.length;

        if (res.criada) {
          log.push("[CRIADA] " + nomeAba + " | " + res.headersAdicionados.length + " headers.");
        } else if (res.headersAdicionados.length > 0) {
          log.push(
            "[ATUALIZADA] " + nomeAba + " | " +
            res.headersAdicionados.length + " header(s) adicionado(s): " +
            res.headersAdicionados.join(", ")
          );
        } else {
          log.push("[OK] " + nomeAba + " | ja existia, nenhuma alteracao necessaria.");
        }

        abasProcessadas.push({
          nomeAba            : res.nomeAba,
          criada             : res.criada,
          jaExistia          : res.jaExistia,
          headersAdicionados : res.headersAdicionados,
          headersExistentes  : res.headersExistentes
        });

      } catch (e) {
        var msgErro = "ERRO em " + nomeAba + ": " + e.message;
        bloqueios.push(msgErro);
        log.push("[ERRO] " + msgErro);
      }
    }

    var sucesso = bloqueios.length === 0;

    if (sucesso) {
      log.push(
        "=== SETUP FIN CONCLUIDO === " +
        "Abas: " + abasProcessadas.length + " | " +
        "Headers adicionados: " + totalHeadersAdicionados
      );
      avisos.push(
        "Proximos passos (FIN.2+): " +
        "adicionar DB_FIN_ID, DB_KEYS.FIN, DRIVE.FOLDER_FINANCEIRO e SHEETS.FIN_* ao SGO_Config.js; " +
        "adicionar criarEstruturaFinanceiroV2_() ao SGO_Setup_v2.js."
      );
    } else {
      log.push(
        "=== SETUP FIN FINALIZADO COM " + bloqueios.length + " BLOQUEIO(S) === " +
        "Corrija os bloqueios antes de prosseguir."
      );
    }

    return {
      success             : sucesso,
      executado           : true,
      abasProcessadas     : abasProcessadas,
      headersAdicionados  : totalHeadersAdicionados,
      checks              : checks,
      bloqueios           : bloqueios,
      avisos              : avisos,
      log                 : log
    };
  }

  /* ============================================================
     FUNÇÃO PÚBLICA: obterSchemaFinanceiroV2 (somente leitura)
     Retorna o schema completo do módulo FIN sem tocar em nenhum banco.
     Pode ser executada a qualquer momento — sem pré-requisitos.
  ============================================================ */
  function obterSchemaFinanceiroV2() {
    return gerarResumoSchema_();
  }

  /* ============================================================
     INTERFACE PÚBLICA DO MÓDULO
  ============================================================ */
  return {
    setupFinanceiroV2      : setupFinanceiroV2,
    obterSchemaFinanceiroV2: obterSchemaFinanceiroV2
  };

})();

/* ============================================================
   WRAPPERS GLOBAIS
   Expõem as funções no escopo global do Apps Script para que
   possam ser acionadas manualmente pelo editor.
   NÃO EXECUTAM AUTOMATICAMENTE.
   Chamar somente após configurar DB_FIN_ID em PropertiesService.
============================================================ */
function setupFinanceiroV2() {
  return SGO_FIN_SETUP.setupFinanceiroV2();
}

function obterSchemaFinanceiroV2() {
  return SGO_FIN_SETUP.obterSchemaFinanceiroV2();
}
