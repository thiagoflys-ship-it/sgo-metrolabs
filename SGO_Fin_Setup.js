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
    LOTES_EXTRATO_FLASH: "FIN_LOTES_EXTRATO_FLASH",
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

    // 31 headers
    "FIN_CARTOES_EXTRATOS": [
      "ID", "EXTRATO_ID", "IMPORTACAO_ID", "LOTE_ID", "CARTAO_ID",
      "DATA_TRANSACAO", "HORA_TRANSACAO", "VALOR", "TIPO_TRANSACAO",
      "ESTABELECIMENTO_EXTRATO", "CIDADE_EXTRATO", "UF_EXTRATO", "CATEGORIA_EXTRATO",
      "NUMERO_AUTORIZACAO", "NSU", "CARTAO_FINAL", "MODALIDADE",
      "CONCILIADO", "LANCAMENTO_ID", "STATUS_CONCILIACAO",
      "DIVERGENCIA_TIPO", "DIVERGENCIA_VALOR",
      "ARQUIVO_ORIGEM_ID", "ARQUIVO_HASH", "ORIGEM", "LINHA_ORIGEM",
      "CHAVE_DUPLICIDADE",
      "OBSERVACOES",
      "STATUS", "CRIADO_EM", "CRIADO_POR"
    ],

    // 26 headers
    "FIN_LOTES_EXTRATO_FLASH": [
      "LOTE_ID", "ORIGEM", "ARQUIVO_NOME", "ARQUIVO_HASH",
      "PERIODO_INICIO", "PERIODO_FIM",
      "PESSOA", "CARTAO_FINAL",
      "TOTAL_LANCAMENTOS", "TOTAL_DEBITOS", "TOTAL_CREDITOS",
      "SOMA_DEBITOS", "SOMA_CREDITOS", "SALDO_LIQUIDO",
      "STATUS_LOTE", "CHAVE_LOTE",
      "IMPORTADO_EM", "IMPORTADO_POR",
      "CANCELADO_EM", "CANCELADO_POR", "MOTIVO_CANCELAMENTO",
      "OBSERVACOES",
      "CRIADO_EM", "CRIADO_POR", "ATUALIZADO_EM", "ATUALIZADO_POR"
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
  // Nunca apaga dados. Nunca exclui colunas. Nunca reordena headers existentes.
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
        "Setup idempotente: nao apaga dados, nao exclui colunas, nao reordena headers existentes.",
        "SGO_Config.js recebera DB_FIN_ID + DB_KEYS.FIN + DRIVE.FOLDER_FINANCEIRO + SHEETS.FIN_* em FIN.2+.",
        "SGO_Setup_v2.js recebera chamada a criarEstruturaFinanceiroV2_() em FIN.2+.",
        "SGO_DocumentFactory.js recebera tipos FIN_TERMO_CARTAO, FIN_PRESTACAO_CONTAS, FIN_CONCILIACAO, FIN_PENDENCIA, FIN_BLOQUEIO, FIN_POP, FIN_POLITICA, FIN_RELATORIO_IA em FIN.10."
      ]
    };
  }

  /* ============================================================
     FUNÇÃO PÚBLICA: setupFinanceiroV2
     Executa o setup idempotente das 13 abas FIN no banco DB_FIN_ID.
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

    adicionarCheck_(checks, "Schema FIN carregado (13 abas)",
      Object.keys(ABAS).length === 13,
      Object.keys(ABAS).length + " abas definidas");

    adicionarCheck_(checks, "Headers FIN carregados (330 total)",
      (function() {
        var total = 0;
        Object.keys(HEADERS).forEach(function(k) { total += HEADERS[k].length; });
        return total === 330;
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
  function diagnosticarSchemaLoteExtratoFlashV1() {
    var headersLote = HEADERS[ABAS.LOTES_EXTRATO_FLASH] || [];
    var headersExtratos = HEADERS[ABAS.EXTRATOS] || [];
    var obrigatoriosLote = [
      "LOTE_ID", "ORIGEM", "ARQUIVO_NOME", "ARQUIVO_HASH",
      "PERIODO_INICIO", "PERIODO_FIM", "PESSOA", "CARTAO_FINAL",
      "TOTAL_LANCAMENTOS", "TOTAL_DEBITOS", "TOTAL_CREDITOS",
      "SOMA_DEBITOS", "SOMA_CREDITOS", "SALDO_LIQUIDO",
      "STATUS_LOTE", "CHAVE_LOTE",
      "IMPORTADO_EM", "IMPORTADO_POR",
      "CANCELADO_EM", "CANCELADO_POR", "MOTIVO_CANCELAMENTO",
      "OBSERVACOES", "CRIADO_EM", "CRIADO_POR", "ATUALIZADO_EM", "ATUALIZADO_POR"
    ];
    var obrigatoriosExtratos = ["LOTE_ID", "CHAVE_DUPLICIDADE", "ORIGEM", "ARQUIVO_HASH"];
    var faltantesLote = obrigatoriosLote.filter(function(h) {
      return headersLote.indexOf(h) < 0;
    });
    var faltantesExtratos = obrigatoriosExtratos.filter(function(h) {
      return headersExtratos.indexOf(h) < 0;
    });

    return {
      success: faltantesLote.length === 0 && faltantesExtratos.length === 0,
      executado: false,
      modo: "DIAGNOSTICO_SCHEMA_LOTE_EXTRATO_FLASH_V1",
      abaLoteDeclarada: ABAS.LOTES_EXTRATO_FLASH === "FIN_LOTES_EXTRATO_FLASH",
      totalHeadersLote: headersLote.length,
      headersLote: headersLote.slice(),
      faltantesLote: faltantesLote,
      headersExtratosNovos: obrigatoriosExtratos.filter(function(h) {
        return headersExtratos.indexOf(h) >= 0;
      }),
      faltantesExtratos: faltantesExtratos,
      avisos: [
        "Diagnostico somente do schema declarado em codigo.",
        "Nao acessa Sheets e nao grava dados."
      ]
    };
  }

  function aplicarPatchSchemaLoteExtratoFlashV1_MANUAL_AUTORIZADO(payload) {
    var entrada = payload || {};
    var confirmacao = String(entrada.confirmacao || "");
    if (confirmacao !== "APLICAR_PATCH_SCHEMA_LOTE_EXTRATO_FLASH_V1") {
      return {
        success: false,
        executado: false,
        bloqueios: [
          "Confirmacao textual obrigatoria ausente. Informe confirmacao: APLICAR_PATCH_SCHEMA_LOTE_EXTRATO_FLASH_V1"
        ],
        avisos: [
          "Funcao manual autorizada nao executada.",
          "Nenhuma aba/header foi alterado."
        ]
      };
    }

    var ss = abrirDbFin_();
    var alvos = [
      { nomeAba: ABAS.LOTES_EXTRATO_FLASH, headers: HEADERS[ABAS.LOTES_EXTRATO_FLASH] || [] },
      { nomeAba: ABAS.EXTRATOS, headers: HEADERS[ABAS.EXTRATOS] || [] }
    ];
    var resultados = [];
    var totalHeadersAdicionados = 0;

    for (var i = 0; i < alvos.length; i++) {
      var res = garantirAbaFin_(ss, alvos[i].nomeAba, alvos[i].headers);
      totalHeadersAdicionados += res.headersAdicionados.length;
      resultados.push(res);
    }

    return {
      success: true,
      executado: true,
      modo: "PATCH_SCHEMA_LOTE_EXTRATO_FLASH_V1",
      abasProcessadas: resultados,
      headersAdicionados: totalHeadersAdicionados,
      avisos: [
        "Patch schema executado manualmente com confirmacao textual.",
        "Operacao idempotente: nao apaga dados, nao exclui colunas e nao reordena headers existentes.",
        "Nenhum lote/importacao/lancamento foi criado por esta funcao."
      ],
      bloqueios: []
    };
  }

  function lerHeadersReaisFin_(sheet) {
    var lastCol = sheet.getLastColumn();
    if (lastCol < 1) return [];
    return sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(function(h) {
      return String(h || "").trim();
    }).filter(function(h) {
      return h !== "";
    });
  }

  function auditarSchemaRealLoteExtratoFlashV1_SEM_GRAVAR() {
    var bloqueios = [];
    var avisos = [];
    var esperadosLote = HEADERS[ABAS.LOTES_EXTRATO_FLASH] || [];
    var esperadosExtratos = ["LOTE_ID", "ARQUIVO_HASH", "ORIGEM", "CHAVE_DUPLICIDADE"];
    var resultado = {
      success: false,
      executado: false,
      modo: "AUDITORIA_SCHEMA_REAL_LOTE_EXTRATO_FLASH_V1",
      spreadsheetId: "",
      abaLoteExiste: false,
      totalHeadersLote: 0,
      headersLotePresentes: [],
      faltantesLote: esperadosLote.slice(),
      totalLinhasLote: 0,
      abaExtratosExiste: false,
      headersExtratosPresentes: [],
      faltantesExtratos: esperadosExtratos.slice(),
      totalLinhasExtratos: 0,
      bloqueios: bloqueios,
      avisos: avisos
    };

    try {
      var ss = abrirDbFin_();
      resultado.spreadsheetId = ss.getId();

      var sheetLote = ss.getSheetByName(ABAS.LOTES_EXTRATO_FLASH);
      if (sheetLote) {
        resultado.abaLoteExiste = true;
        resultado.totalLinhasLote = Math.max(0, sheetLote.getLastRow());
        resultado.headersLotePresentes = lerHeadersReaisFin_(sheetLote);
        resultado.totalHeadersLote = resultado.headersLotePresentes.length;
        resultado.faltantesLote = esperadosLote.filter(function(h) {
          return resultado.headersLotePresentes.indexOf(h) < 0;
        });
        if (resultado.totalLinhasLote > 1) {
          avisos.push("FIN_LOTES_EXTRATO_FLASH possui linhas alem do header; verificar se ha lote real.");
        }
      } else {
        bloqueios.push("Aba FIN_LOTES_EXTRATO_FLASH nao encontrada.");
      }

      var sheetExtratos = ss.getSheetByName(ABAS.EXTRATOS);
      if (sheetExtratos) {
        resultado.abaExtratosExiste = true;
        resultado.totalLinhasExtratos = Math.max(0, sheetExtratos.getLastRow());
        var headersExtratos = lerHeadersReaisFin_(sheetExtratos);
        resultado.headersExtratosPresentes = esperadosExtratos.filter(function(h) {
          return headersExtratos.indexOf(h) >= 0;
        });
        resultado.faltantesExtratos = esperadosExtratos.filter(function(h) {
          return headersExtratos.indexOf(h) < 0;
        });
      } else {
        bloqueios.push("Aba FIN_CARTOES_EXTRATOS nao encontrada.");
      }

      if (resultado.faltantesLote.length) {
        bloqueios.push("Headers faltantes em FIN_LOTES_EXTRATO_FLASH: " + resultado.faltantesLote.join(", "));
      }
      if (resultado.faltantesExtratos.length) {
        bloqueios.push("Headers faltantes em FIN_CARTOES_EXTRATOS: " + resultado.faltantesExtratos.join(", "));
      }

      resultado.success = bloqueios.length === 0;
    } catch (e) {
      bloqueios.push(e && e.message ? e.message : String(e));
    }

    if (typeof Logger !== "undefined" && Logger && Logger.log) {
      Logger.log(JSON.stringify(resultado, null, 2));
    }

    return resultado;
  }

  function normalizarTextoFin1114_(valor) {
    return String(valor || "")
      .trim()
      .toUpperCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ");
  }

  function normalizarDataFin1114_(valor) {
    if (Object.prototype.toString.call(valor) === "[object Date]" && !isNaN(valor.getTime())) {
      var diaDate = ("0" + (valor.getMonth() + 1)).slice(-2);
      var mesDate = ("0" + valor.getDate()).slice(-2);
      return valor.getFullYear() + "-" + mesDate + "-" + diaDate;
    }
    var texto = String(valor || "").trim();
    if (!texto) return "";
    var iso = texto.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (iso) return iso[1] + "-" + iso[2] + "-" + iso[3];
    // Datas Flash/planilha em pt-BR devem ser interpretadas como dd/mm/yyyy.
    // Exemplos: 10/06/2026 -> 2026-06-10; 11/06/2026 -> 2026-06-11.
    var br = texto.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
    if (br) {
      var ano = br[3].length === 2 ? "20" + br[3] : br[3];
      var dia = ("0" + br[1]).slice(-2);
      var mes = ("0" + br[2]).slice(-2);
      return ano + "-" + mes + "-" + dia;
    }
    return texto;
  }

  function normalizarNumeroFin1114_(valor) {
    if (typeof valor === "number") return valor;
    var texto = String(valor || "").trim();
    if (!texto) return 0;
    var negativo = /^\s*-/.test(texto) || /\(\s*[^)]+\s*\)/.test(texto);
    texto = texto.replace(/[^\d,.\-]/g, "");
    if (texto.indexOf(",") >= 0 && texto.indexOf(".") >= 0) {
      texto = texto.replace(/\./g, "").replace(",", ".");
    } else if (texto.indexOf(",") >= 0) {
      texto = texto.replace(",", ".");
    }
    texto = texto.replace(/(?!^)-/g, "");
    var numero = parseFloat(texto);
    if (isNaN(numero)) return 0;
    return negativo && numero > 0 ? numero * -1 : numero;
  }

  function inferirTipoFin1114_(tipoBruto, valorNumerico) {
    var tipo = normalizarTextoFin1114_(tipoBruto);
    if (tipo.indexOf("CRED") >= 0 || tipo === "C" || tipo.indexOf("REEMBOLSO") >= 0 || tipo.indexOf("ESTORNO") >= 0) {
      return "CREDITO";
    }
    if (tipo.indexOf("DEB") >= 0 || tipo === "D" || tipo.indexOf("COMPRA") >= 0 || tipo.indexOf("DESPESA") >= 0) {
      return "DEBITO";
    }
    if (valorNumerico < 0) return "DEBITO";
    if (valorNumerico > 0) return "CREDITO";
    return "INDEFINIDO";
  }

  function localizarCampoFin1114_(headers, aliases) {
    var headersNorm = headers.map(function(h) {
      return normalizarTextoFin1114_(h);
    });
    for (var i = 0; i < aliases.length; i++) {
      var pos = headersNorm.indexOf(normalizarTextoFin1114_(aliases[i]));
      if (pos >= 0) {
        return {
          header: headers[pos],
          indice: pos
        };
      }
    }
    return {
      header: "",
      indice: -1
    };
  }

  function gerarChaveDuplicidadeFin1114_(item) {
    var pessoaCartao = item.pessoa || item.cartaoFinal || "";
    return [
      "FLASH",
      normalizarTextoFin1114_(item.data),
      normalizarTextoFin1114_(item.descricao),
      Math.abs(item.valorNumerico || 0).toFixed(2),
      normalizarTextoFin1114_(pessoaCartao)
    ].join("|");
  }

  function simularImportacaoExtratoFlashV1_SEM_GRAVAR() {
    var bloqueios = [];
    var avisos = [];
    var resultado = {
      success: false,
      apto: false,
      executado: false,
      modo: "SIMULACAO_IMPORTACAO_EXTRATO_FLASH_V1_SEM_GRAVAR",
      spreadsheetId: "",
      abaEntradaExiste: false,
      totalLinhasEntrada: 0,
      headersEntradaPresentes: [],
      camposMapeados: {},
      loteSimulado: null,
      totais: {
        totalLancamentos: 0,
        totalDebitos: 0,
        totalCreditos: 0,
        somaDebitos: 0,
        somaCreditos: 0,
        saldoLiquido: 0
      },
      duplicidadesInternas: [],
      duplicidadesContraBase: [],
      bloqueios: bloqueios,
      avisos: avisos,
      amostraNormalizada: []
    };

    try {
      var ss = abrirDbFin_();
      resultado.spreadsheetId = ss.getId();

      var sheetLote = ss.getSheetByName(ABAS.LOTES_EXTRATO_FLASH);
      var sheetExtratos = ss.getSheetByName(ABAS.EXTRATOS);
      if (!sheetLote) bloqueios.push("Aba FIN_LOTES_EXTRATO_FLASH nao encontrada.");
      if (!sheetExtratos) bloqueios.push("Aba FIN_CARTOES_EXTRATOS nao encontrada.");

      var sheetEntrada = ss.getSheetByName("TMP_IMPORT_EXTRATO_FLASH");
      resultado.abaEntradaExiste = !!sheetEntrada;
      if (!sheetEntrada) {
        bloqueios.push("Aba TMP_IMPORT_EXTRATO_FLASH não encontrada para simulação");
        resultado.success = false;
        resultado.apto = false;
        Logger.log(JSON.stringify(resultado, null, 2));
        return resultado;
      }

      var lastRowEntrada = sheetEntrada.getLastRow();
      var lastColEntrada = sheetEntrada.getLastColumn();
      resultado.totalLinhasEntrada = Math.max(0, lastRowEntrada - 1);
      if (lastRowEntrada < 1 || lastColEntrada < 1) {
        bloqueios.push("Aba TMP_IMPORT_EXTRATO_FLASH sem headers para simulação.");
        Logger.log(JSON.stringify(resultado, null, 2));
        return resultado;
      }

      var dadosEntrada = sheetEntrada.getRange(1, 1, lastRowEntrada, lastColEntrada).getValues();
      var headersEntrada = dadosEntrada[0].map(function(h) {
        return String(h || "").trim();
      });
      resultado.headersEntradaPresentes = headersEntrada.filter(function(h) {
        return h !== "";
      });

      var aliases = {
        data: ["DATA", "Data", "DATA_TRANSACAO", "Data da transação"],
        descricao: ["DESCRICAO", "Descrição", "ESTABELECIMENTO", "Estabelecimento"],
        valor: ["VALOR", "Valor", "VALOR_TRANSACAO", "Valor da transação"],
        tipo: ["TIPO", "Tipo", "DEBITO_CREDITO", "Débito/Crédito"],
        pessoa: ["PESSOA", "Pessoa", "PORTADOR", "Colaborador"],
        cartaoFinal: ["CARTAO_FINAL", "Final Cartão", "Final do cartão", "CARTAO"]
      };
      Object.keys(aliases).forEach(function(campo) {
        resultado.camposMapeados[campo] = localizarCampoFin1114_(headersEntrada, aliases[campo]);
      });

      if (resultado.camposMapeados.valor.indice < 0) {
        bloqueios.push("Campo de valor não identificado na TMP_IMPORT_EXTRATO_FLASH.");
      }
      if (resultado.camposMapeados.data.indice < 0) avisos.push("Campo de data não identificado; chave simulada usará data vazia.");
      if (resultado.camposMapeados.descricao.indice < 0) avisos.push("Campo de descricao não identificado; chave simulada usará descricao vazia.");

      var existentes = {};
      if (sheetExtratos) {
        var headersExtratos = lerHeadersReaisFin_(sheetExtratos);
        var idxChaveBase = headersExtratos.indexOf("CHAVE_DUPLICIDADE");
        if (idxChaveBase >= 0 && sheetExtratos.getLastRow() > 1) {
          var valoresBase = sheetExtratos.getRange(2, idxChaveBase + 1, sheetExtratos.getLastRow() - 1, 1).getValues();
          valoresBase.forEach(function(linha) {
            var chave = String(linha[0] || "").trim();
            if (chave) existentes[chave] = true;
          });
        } else if (idxChaveBase < 0) {
          bloqueios.push("Header CHAVE_DUPLICIDADE não encontrado em FIN_CARTOES_EXTRATOS.");
        }
      }

      var porChave = {};
      var itens = [];
      for (var i = 1; i < dadosEntrada.length; i++) {
        var linha = dadosEntrada[i];
        var preenchida = linha.some(function(celula) {
          return String(celula || "").trim() !== "";
        });
        if (!preenchida) continue;

        var valorBruto = resultado.camposMapeados.valor.indice >= 0 ? linha[resultado.camposMapeados.valor.indice] : "";
        var valorNumerico = normalizarNumeroFin1114_(valorBruto);
        var item = {
          linhaOrigem: i + 1,
          data: resultado.camposMapeados.data.indice >= 0 ? normalizarDataFin1114_(linha[resultado.camposMapeados.data.indice]) : "",
          descricao: resultado.camposMapeados.descricao.indice >= 0 ? String(linha[resultado.camposMapeados.descricao.indice] || "").trim() : "",
          valorBruto: valorBruto,
          valorNumerico: valorNumerico,
          tipoInferido: inferirTipoFin1114_(resultado.camposMapeados.tipo.indice >= 0 ? linha[resultado.camposMapeados.tipo.indice] : "", valorNumerico),
          pessoa: resultado.camposMapeados.pessoa.indice >= 0 ? String(linha[resultado.camposMapeados.pessoa.indice] || "").trim() : "",
          cartaoFinal: resultado.camposMapeados.cartaoFinal.indice >= 0 ? String(linha[resultado.camposMapeados.cartaoFinal.indice] || "").trim() : ""
        };
        item.chaveDuplicidadeSimulada = gerarChaveDuplicidadeFin1114_(item);
        itens.push(item);
        if (!porChave[item.chaveDuplicidadeSimulada]) porChave[item.chaveDuplicidadeSimulada] = [];
        porChave[item.chaveDuplicidadeSimulada].push(item.linhaOrigem);
        if (existentes[item.chaveDuplicidadeSimulada]) {
          resultado.duplicidadesContraBase.push({
            linhaOrigem: item.linhaOrigem,
            chaveDuplicidadeSimulada: item.chaveDuplicidadeSimulada
          });
        }
      }

      Object.keys(porChave).forEach(function(chave) {
        if (porChave[chave].length > 1) {
          resultado.duplicidadesInternas.push({
            chaveDuplicidadeSimulada: chave,
            linhasOrigem: porChave[chave]
          });
        }
      });

      itens.forEach(function(item) {
        var valorAbs = Math.abs(item.valorNumerico || 0);
        resultado.totais.totalLancamentos++;
        if (item.tipoInferido === "DEBITO") {
          resultado.totais.totalDebitos++;
          resultado.totais.somaDebitos += valorAbs;
        } else if (item.tipoInferido === "CREDITO") {
          resultado.totais.totalCreditos++;
          resultado.totais.somaCreditos += valorAbs;
        }
      });
      resultado.totais.somaDebitos = Number(resultado.totais.somaDebitos.toFixed(2));
      resultado.totais.somaCreditos = Number(resultado.totais.somaCreditos.toFixed(2));
      resultado.totais.saldoLiquido = Number((resultado.totais.somaCreditos - resultado.totais.somaDebitos).toFixed(2));
      resultado.amostraNormalizada = itens.slice(0, 10);

      var agora = new Date();
      var stamp = Utilities.formatDate(agora, Session.getScriptTimeZone(), "yyyyMMdd-HHmmss");
      resultado.loteSimulado = {
        loteIdSimulado: "LOTE-DRYRUN-FLASH-" + stamp,
        origem: "FLASH",
        totalLancamentos: resultado.totais.totalLancamentos,
        totalDebitos: resultado.totais.totalDebitos,
        totalCreditos: resultado.totais.totalCreditos,
        somaDebitos: resultado.totais.somaDebitos,
        somaCreditos: resultado.totais.somaCreditos,
        saldoLiquido: resultado.totais.saldoLiquido,
        statusLoteSimulado: "DRY_RUN"
      };

      resultado.apto = bloqueios.length === 0;
      resultado.success = resultado.apto;
    } catch (e) {
      bloqueios.push(e && e.message ? e.message : String(e));
      resultado.success = false;
      resultado.apto = false;
    }

    if (typeof Logger !== "undefined" && Logger && Logger.log) {
      Logger.log(JSON.stringify(resultado, null, 2));
    }
    return resultado;
  }

  function prepararTmpImportExtratoFlashTeste_FIN1115() {
    var headers = ["DATA", "DESCRICAO", "VALOR", "TIPO", "PESSOA", "CARTAO_FINAL"];
    var linhas = [
      ["10/06/2026", "POSTO TESTE GOIANIA", "-150,00", "DEBITO", "THIAGO TESTE", "9999"],
      ["10/06/2026", "ESTORNO POSTO TESTE", "50,00", "CREDITO", "THIAGO TESTE", "9999"],
      ["11/06/2026", "ALMOCO TESTE", "-32,90", "DEBITO", "THIAGO TESTE", "9999"],
      ["11/06/2026", "ALMOCO TESTE", "-32,90", "DEBITO", "THIAGO TESTE", "9999"]
    ];
    var resultado = {
      success: false,
      executado: false,
      modo: "PREPARACAO_TMP_IMPORT_EXTRATO_FLASH_TESTE_FIN1115",
      spreadsheetId: "",
      aba: "TMP_IMPORT_EXTRATO_FLASH",
      linhasGravadas: 0,
      headers: headers.slice(),
      observacao: "Dados ficticios gravados somente na aba temporaria TMP_IMPORT_EXTRATO_FLASH para dry-run."
    };

    try {
      var ss = abrirDbFin_();
      resultado.spreadsheetId = ss.getId();

      var sheet = ss.getSheetByName("TMP_IMPORT_EXTRATO_FLASH");
      if (!sheet) {
        sheet = ss.insertSheet("TMP_IMPORT_EXTRATO_FLASH");
      } else {
        sheet.clearContents();
      }

      var dados = [headers].concat(linhas);
      sheet.getRange(1, 1, dados.length, headers.length).setValues(dados);

      resultado.success = true;
      resultado.executado = true;
      resultado.linhasGravadas = linhas.length;
    } catch (e) {
      resultado.observacao = "Falha ao preparar TMP_IMPORT_EXTRATO_FLASH: " + (e && e.message ? e.message : String(e));
    }

    if (typeof Logger !== "undefined" && Logger && Logger.log) {
      Logger.log(JSON.stringify(resultado, null, 2));
    }
    return resultado;
  }

  function hashTextoFin1117_(texto) {
    var bytes = Utilities.computeDigest(
      Utilities.DigestAlgorithm.SHA_256,
      String(texto || ""),
      Utilities.Charset.UTF_8
    );
    return bytes.map(function(b) {
      var v = b < 0 ? b + 256 : b;
      return ("0" + v.toString(16)).slice(-2);
    }).join("");
  }

  function mapaHeadersFin1117_(headers) {
    var mapa = {};
    headers.forEach(function(h, i) {
      var nome = String(h || "").trim();
      if (nome) mapa[nome] = i;
    });
    return mapa;
  }

  function preencherHeaderFin1117_(linha, mapa, header, valor) {
    if (Object.prototype.hasOwnProperty.call(mapa, header)) {
      linha[mapa[header]] = valor;
    }
  }

  function importarExtratoFlashReal_FIN1117(confirmacao) {
    var autorizado = String(confirmacao || "") === "IMPORTAR_EXTRATO_FLASH_REAL_FIN1117";
    var bloqueios = [];
    var avisos = [];
    var resultado = {
      success: false,
      executado: false,
      modo: "IMPORTACAO_EXTRATO_FLASH_REAL_FIN1117",
      autorizado: autorizado,
      spreadsheetId: "",
      loteId: "",
      linhasEntrada: 0,
      linhasValidas: 0,
      linhasIgnoradasDuplicidadeInterna: [],
      linhasIgnoradasDuplicidadeBase: [],
      linhasGravadasExtrato: 0,
      loteGravado: false,
      totais: {
        totalLancamentos: 0,
        totalDebitos: 0,
        totalCreditos: 0,
        somaDebitos: 0,
        somaCreditos: 0,
        saldoLiquido: 0
      },
      bloqueios: bloqueios,
      avisos: avisos,
      amostraGravada: []
    };

    if (!autorizado) {
      bloqueios.push("Confirmação obrigatória inválida ou ausente para importação real FIN.11.17");
      if (typeof Logger !== "undefined" && Logger && Logger.log) {
        Logger.log(JSON.stringify(resultado, null, 2));
      }
      return resultado;
    }

    try {
      var ss = abrirDbFin_();
      resultado.spreadsheetId = ss.getId();

      var sheetEntrada = ss.getSheetByName("TMP_IMPORT_EXTRATO_FLASH");
      var sheetLote = ss.getSheetByName(ABAS.LOTES_EXTRATO_FLASH);
      var sheetExtratos = ss.getSheetByName(ABAS.EXTRATOS);
      if (!sheetEntrada) bloqueios.push("Aba TMP_IMPORT_EXTRATO_FLASH não encontrada.");
      if (!sheetLote) bloqueios.push("Aba FIN_LOTES_EXTRATO_FLASH não encontrada.");
      if (!sheetExtratos) bloqueios.push("Aba FIN_CARTOES_EXTRATOS não encontrada.");
      if (bloqueios.length) throw new Error("Importação bloqueada por abas obrigatórias ausentes.");

      var lastRowEntrada = sheetEntrada.getLastRow();
      var lastColEntrada = sheetEntrada.getLastColumn();
      resultado.linhasEntrada = Math.max(0, lastRowEntrada - 1);
      if (lastRowEntrada < 1 || lastColEntrada < 1) {
        bloqueios.push("Aba TMP_IMPORT_EXTRATO_FLASH sem headers para importação.");
        throw new Error("Importação bloqueada por entrada sem headers.");
      }

      var dadosEntrada = sheetEntrada.getRange(1, 1, lastRowEntrada, lastColEntrada).getValues();
      var headersEntrada = dadosEntrada[0].map(function(h) {
        return String(h || "").trim();
      });
      var aliases = {
        data: ["DATA", "Data", "DATA_TRANSACAO", "Data da transação"],
        descricao: ["DESCRICAO", "Descrição", "ESTABELECIMENTO", "Estabelecimento"],
        valor: ["VALOR", "Valor", "VALOR_TRANSACAO", "Valor da transação"],
        tipo: ["TIPO", "Tipo", "DEBITO_CREDITO", "Débito/Crédito"],
        pessoa: ["PESSOA", "Pessoa", "PORTADOR", "Colaborador"],
        cartaoFinal: ["CARTAO_FINAL", "Final Cartão", "Final do cartão", "CARTAO"]
      };
      var campos = {};
      Object.keys(aliases).forEach(function(campo) {
        campos[campo] = localizarCampoFin1114_(headersEntrada, aliases[campo]);
      });
      if (campos.valor.indice < 0) bloqueios.push("Campo de valor não identificado na TMP_IMPORT_EXTRATO_FLASH.");
      if (campos.data.indice < 0) avisos.push("Campo de data não identificado; importação usará data vazia.");
      if (campos.descricao.indice < 0) avisos.push("Campo de descricao não identificado; importação usará descricao vazia.");

      var headersExtratos = lerHeadersReaisFin_(sheetExtratos);
      var mapaExtratos = mapaHeadersFin1117_(headersExtratos);
      var idxChaveBase = headersExtratos.indexOf("CHAVE_DUPLICIDADE");
      if (idxChaveBase < 0) {
        bloqueios.push("Header CHAVE_DUPLICIDADE não encontrado em FIN_CARTOES_EXTRATOS.");
      }
      if (bloqueios.length) throw new Error("Importação bloqueada por validação de entrada.");

      var chavesBase = {};
      if (sheetExtratos.getLastRow() > 1) {
        var valoresBase = sheetExtratos.getRange(2, idxChaveBase + 1, sheetExtratos.getLastRow() - 1, 1).getValues();
        valoresBase.forEach(function(linhaBase) {
          var chaveBase = String(linhaBase[0] || "").trim();
          if (chaveBase) chavesBase[chaveBase] = true;
        });
      }

      var vistos = {};
      var validos = [];
      for (var i = 1; i < dadosEntrada.length; i++) {
        var linhaEntrada = dadosEntrada[i];
        var preenchida = linhaEntrada.some(function(celula) {
          return String(celula || "").trim() !== "";
        });
        if (!preenchida) continue;

        var valorBruto = campos.valor.indice >= 0 ? linhaEntrada[campos.valor.indice] : "";
        var valorNumerico = normalizarNumeroFin1114_(valorBruto);
        var item = {
          linhaOrigem: i + 1,
          data: campos.data.indice >= 0 ? normalizarDataFin1114_(linhaEntrada[campos.data.indice]) : "",
          descricao: campos.descricao.indice >= 0 ? String(linhaEntrada[campos.descricao.indice] || "").trim() : "",
          valorBruto: valorBruto,
          valorNumerico: valorNumerico,
          tipoInferido: inferirTipoFin1114_(campos.tipo.indice >= 0 ? linhaEntrada[campos.tipo.indice] : "", valorNumerico),
          pessoa: campos.pessoa.indice >= 0 ? String(linhaEntrada[campos.pessoa.indice] || "").trim() : "",
          cartaoFinal: campos.cartaoFinal.indice >= 0 ? String(linhaEntrada[campos.cartaoFinal.indice] || "").trim() : ""
        };
        item.chaveDuplicidadeSimulada = gerarChaveDuplicidadeFin1114_(item);

        if (vistos[item.chaveDuplicidadeSimulada]) {
          resultado.linhasIgnoradasDuplicidadeInterna.push({
            linhaOrigem: item.linhaOrigem,
            primeiraLinhaOrigem: vistos[item.chaveDuplicidadeSimulada],
            chaveDuplicidade: item.chaveDuplicidadeSimulada
          });
          continue;
        }
        vistos[item.chaveDuplicidadeSimulada] = item.linhaOrigem;

        if (chavesBase[item.chaveDuplicidadeSimulada]) {
          resultado.linhasIgnoradasDuplicidadeBase.push({
            linhaOrigem: item.linhaOrigem,
            chaveDuplicidade: item.chaveDuplicidadeSimulada
          });
          continue;
        }

        validos.push(item);
      }

      if (!validos.length) {
        bloqueios.push("Nenhuma linha válida para importação real FIN.11.17 após filtros de duplicidade.");
        throw new Error("Importação bloqueada sem linhas válidas.");
      }

      validos.forEach(function(item) {
        var valorAbs = Math.abs(item.valorNumerico || 0);
        resultado.totais.totalLancamentos++;
        if (item.tipoInferido === "DEBITO") {
          resultado.totais.totalDebitos++;
          resultado.totais.somaDebitos += valorAbs;
        } else if (item.tipoInferido === "CREDITO") {
          resultado.totais.totalCreditos++;
          resultado.totais.somaCreditos += valorAbs;
        }
      });
      resultado.totais.somaDebitos = Number(resultado.totais.somaDebitos.toFixed(2));
      resultado.totais.somaCreditos = Number(resultado.totais.somaCreditos.toFixed(2));
      resultado.totais.saldoLiquido = Number((resultado.totais.somaCreditos - resultado.totais.somaDebitos).toFixed(2));
      resultado.linhasValidas = validos.length;

      var agora = new Date();
      var timezone = Session.getScriptTimeZone();
      var stamp = Utilities.formatDate(agora, timezone, "yyyyMMdd-HHmmss");
      var agoraIso = Utilities.formatDate(agora, timezone, "yyyy-MM-dd HH:mm:ss");
      var usuario = "";
      try {
        usuario = Session.getActiveUser().getEmail() || "";
      } catch (eUsuario) {
        usuario = "";
      }
      resultado.loteId = "LOTE-FLASH-" + stamp;
      var chaveLote = hashTextoFin1117_(validos.map(function(item) {
        return item.chaveDuplicidadeSimulada;
      }).join("|"));
      var datas = validos.map(function(item) { return item.data; }).filter(function(data) { return !!data; }).sort();
      var pessoas = {};
      var cartoes = {};
      validos.forEach(function(item) {
        if (item.pessoa) pessoas[item.pessoa] = true;
        if (item.cartaoFinal) cartoes[item.cartaoFinal] = true;
      });
      var pessoaLote = Object.keys(pessoas).length === 1 ? Object.keys(pessoas)[0] : "MULTIPLOS";
      var cartaoLote = Object.keys(cartoes).length === 1 ? Object.keys(cartoes)[0] : "MULTIPLOS";

      var headersLote = lerHeadersReaisFin_(sheetLote);
      var mapaLote = mapaHeadersFin1117_(headersLote);
      var linhaLote = headersLote.map(function() { return ""; });
      preencherHeaderFin1117_(linhaLote, mapaLote, "LOTE_ID", resultado.loteId);
      preencherHeaderFin1117_(linhaLote, mapaLote, "ORIGEM", "FLASH");
      preencherHeaderFin1117_(linhaLote, mapaLote, "ARQUIVO_NOME", "TMP_IMPORT_EXTRATO_FLASH");
      preencherHeaderFin1117_(linhaLote, mapaLote, "ARQUIVO_HASH", chaveLote);
      preencherHeaderFin1117_(linhaLote, mapaLote, "PERIODO_INICIO", datas[0] || "");
      preencherHeaderFin1117_(linhaLote, mapaLote, "PERIODO_FIM", datas[datas.length - 1] || "");
      preencherHeaderFin1117_(linhaLote, mapaLote, "PESSOA", pessoaLote);
      preencherHeaderFin1117_(linhaLote, mapaLote, "CARTAO_FINAL", cartaoLote);
      preencherHeaderFin1117_(linhaLote, mapaLote, "TOTAL_LANCAMENTOS", resultado.totais.totalLancamentos);
      preencherHeaderFin1117_(linhaLote, mapaLote, "TOTAL_DEBITOS", resultado.totais.totalDebitos);
      preencherHeaderFin1117_(linhaLote, mapaLote, "TOTAL_CREDITOS", resultado.totais.totalCreditos);
      preencherHeaderFin1117_(linhaLote, mapaLote, "SOMA_DEBITOS", resultado.totais.somaDebitos);
      preencherHeaderFin1117_(linhaLote, mapaLote, "SOMA_CREDITOS", resultado.totais.somaCreditos);
      preencherHeaderFin1117_(linhaLote, mapaLote, "SALDO_LIQUIDO", resultado.totais.saldoLiquido);
      preencherHeaderFin1117_(linhaLote, mapaLote, "STATUS_LOTE", "IMPORTADO");
      preencherHeaderFin1117_(linhaLote, mapaLote, "CHAVE_LOTE", chaveLote);
      preencherHeaderFin1117_(linhaLote, mapaLote, "IMPORTADO_EM", agoraIso);
      preencherHeaderFin1117_(linhaLote, mapaLote, "IMPORTADO_POR", usuario);
      preencherHeaderFin1117_(linhaLote, mapaLote, "CRIADO_EM", agoraIso);
      preencherHeaderFin1117_(linhaLote, mapaLote, "CRIADO_POR", usuario);
      preencherHeaderFin1117_(linhaLote, mapaLote, "ATUALIZADO_EM", agoraIso);
      preencherHeaderFin1117_(linhaLote, mapaLote, "ATUALIZADO_POR", usuario);
      preencherHeaderFin1117_(linhaLote, mapaLote, "OBSERVACOES", "Importação real controlada FIN.11.17 a partir de TMP_IMPORT_EXTRATO_FLASH.");

      var linhasExtrato = validos.map(function(item, idx) {
        var linha = headersExtratos.map(function() { return ""; });
        var extratoId = resultado.loteId + "-EXTRATO-" + ("0000" + (idx + 1)).slice(-4);
        preencherHeaderFin1117_(linha, mapaExtratos, "ID", extratoId);
        preencherHeaderFin1117_(linha, mapaExtratos, "EXTRATO_ID", extratoId);
        preencherHeaderFin1117_(linha, mapaExtratos, "IMPORTACAO_ID", resultado.loteId);
        preencherHeaderFin1117_(linha, mapaExtratos, "LOTE_ID", resultado.loteId);
        preencherHeaderFin1117_(linha, mapaExtratos, "ARQUIVO_HASH", chaveLote);
        preencherHeaderFin1117_(linha, mapaExtratos, "ORIGEM", "FLASH");
        preencherHeaderFin1117_(linha, mapaExtratos, "CHAVE_DUPLICIDADE", item.chaveDuplicidadeSimulada);
        preencherHeaderFin1117_(linha, mapaExtratos, "DATA", item.data);
        preencherHeaderFin1117_(linha, mapaExtratos, "DATA_TRANSACAO", item.data);
        preencherHeaderFin1117_(linha, mapaExtratos, "DESCRICAO", item.descricao);
        preencherHeaderFin1117_(linha, mapaExtratos, "ESTABELECIMENTO", item.descricao);
        preencherHeaderFin1117_(linha, mapaExtratos, "ESTABELECIMENTO_EXTRATO", item.descricao);
        preencherHeaderFin1117_(linha, mapaExtratos, "VALOR", item.valorNumerico);
        preencherHeaderFin1117_(linha, mapaExtratos, "VALOR_TRANSACAO", item.valorNumerico);
        preencherHeaderFin1117_(linha, mapaExtratos, "TIPO", item.tipoInferido);
        preencherHeaderFin1117_(linha, mapaExtratos, "TIPO_TRANSACAO", item.tipoInferido);
        preencherHeaderFin1117_(linha, mapaExtratos, "DEBITO_CREDITO", item.tipoInferido);
        preencherHeaderFin1117_(linha, mapaExtratos, "PESSOA", item.pessoa);
        preencherHeaderFin1117_(linha, mapaExtratos, "PORTADOR", item.pessoa);
        preencherHeaderFin1117_(linha, mapaExtratos, "CARTAO_FINAL", item.cartaoFinal);
        preencherHeaderFin1117_(linha, mapaExtratos, "LINHA_ORIGEM", item.linhaOrigem);
        preencherHeaderFin1117_(linha, mapaExtratos, "CONCILIADO", "NAO");
        preencherHeaderFin1117_(linha, mapaExtratos, "STATUS", "IMPORTADO");
        preencherHeaderFin1117_(linha, mapaExtratos, "CRIADO_EM", agoraIso);
        preencherHeaderFin1117_(linha, mapaExtratos, "CRIADO_POR", usuario);
        preencherHeaderFin1117_(linha, mapaExtratos, "ATUALIZADO_EM", agoraIso);
        preencherHeaderFin1117_(linha, mapaExtratos, "ATUALIZADO_POR", usuario);
        return linha;
      });

      sheetLote.getRange(sheetLote.getLastRow() + 1, 1, 1, headersLote.length).setValues([linhaLote]);
      sheetExtratos.getRange(sheetExtratos.getLastRow() + 1, 1, linhasExtrato.length, headersExtratos.length).setValues(linhasExtrato);

      resultado.loteGravado = true;
      resultado.linhasGravadasExtrato = linhasExtrato.length;
      resultado.amostraGravada = validos.slice(0, 10).map(function(item) {
        return {
          linhaOrigem: item.linhaOrigem,
          data: item.data,
          descricao: item.descricao,
          valorNumerico: item.valorNumerico,
          tipoInferido: item.tipoInferido,
          pessoa: item.pessoa,
          cartaoFinal: item.cartaoFinal,
          chaveDuplicidade: item.chaveDuplicidadeSimulada
        };
      });
      resultado.success = true;
      resultado.executado = true;
    } catch (e) {
      if (!bloqueios.length) {
        bloqueios.push(e && e.message ? e.message : String(e));
      }
      resultado.success = false;
      resultado.executado = false;
    }

    if (typeof Logger !== "undefined" && Logger && Logger.log) {
      Logger.log(JSON.stringify(resultado, null, 2));
    }
    return resultado;
  }

  function objetosPorHeadersFin1119_(headers, valores) {
    return valores.map(function(linha) {
      var obj = {};
      headers.forEach(function(header, i) {
        if (header) obj[header] = linha[i];
      });
      return obj;
    });
  }

  function auditarImportacaoExtratoFlash_FIN1119_SEM_GRAVAR() {
    var bloqueios = [];
    var avisos = [];
    var resultado = {
      success: false,
      executado: false,
      modo: "AUDITORIA_IMPORTACAO_EXTRATO_FLASH_FIN1119",
      spreadsheetId: "",
      totalLinhasLotes: 0,
      totalLinhasExtratos: 0,
      totalLinhasTmp: 0,
      ultimosLotes: [],
      ultimosExtratos: [],
      contagemPorLote: {},
      chavesDuplicidadeRepetidas: [],
      bloqueios: bloqueios,
      avisos: avisos
    };

    try {
      var ss = abrirDbFin_();
      resultado.spreadsheetId = ss.getId();

      var sheetLotes = ss.getSheetByName(ABAS.LOTES_EXTRATO_FLASH);
      var sheetExtratos = ss.getSheetByName(ABAS.EXTRATOS);
      var sheetTmp = ss.getSheetByName("TMP_IMPORT_EXTRATO_FLASH");
      if (!sheetLotes) bloqueios.push("Aba FIN_LOTES_EXTRATO_FLASH não encontrada.");
      if (!sheetExtratos) bloqueios.push("Aba FIN_CARTOES_EXTRATOS não encontrada.");
      if (!sheetTmp) bloqueios.push("Aba TMP_IMPORT_EXTRATO_FLASH não encontrada.");

      if (sheetLotes) {
        var lastRowLotes = sheetLotes.getLastRow();
        var lastColLotes = sheetLotes.getLastColumn();
        resultado.totalLinhasLotes = Math.max(0, lastRowLotes - 1);
        if (lastRowLotes > 1 && lastColLotes > 0) {
          var headersLotes = lerHeadersReaisFin_(sheetLotes);
          var inicioLotes = Math.max(2, lastRowLotes - 4);
          var valoresLotes = sheetLotes.getRange(inicioLotes, 1, lastRowLotes - inicioLotes + 1, lastColLotes).getValues();
          resultado.ultimosLotes = objetosPorHeadersFin1119_(headersLotes, valoresLotes);
        }
      }

      if (sheetExtratos) {
        var lastRowExtratos = sheetExtratos.getLastRow();
        var lastColExtratos = sheetExtratos.getLastColumn();
        resultado.totalLinhasExtratos = Math.max(0, lastRowExtratos - 1);
        if (lastRowExtratos > 1 && lastColExtratos > 0) {
          var headersExtratos = lerHeadersReaisFin_(sheetExtratos);
          var inicioExtratos = Math.max(2, lastRowExtratos - 9);
          var valoresExtratos = sheetExtratos.getRange(2, 1, lastRowExtratos - 1, lastColExtratos).getValues();
          var ultimosValoresExtratos = sheetExtratos.getRange(inicioExtratos, 1, lastRowExtratos - inicioExtratos + 1, lastColExtratos).getValues();
          resultado.ultimosExtratos = objetosPorHeadersFin1119_(headersExtratos, ultimosValoresExtratos);

          var idxLote = headersExtratos.indexOf("LOTE_ID");
          var idxChave = headersExtratos.indexOf("CHAVE_DUPLICIDADE");
          var chaves = {};
          valoresExtratos.forEach(function(linha) {
            if (idxLote >= 0) {
              var loteId = String(linha[idxLote] || "").trim();
              if (loteId) resultado.contagemPorLote[loteId] = (resultado.contagemPorLote[loteId] || 0) + 1;
            }
            if (idxChave >= 0) {
              var chave = String(linha[idxChave] || "").trim();
              if (chave) chaves[chave] = (chaves[chave] || 0) + 1;
            }
          });
          Object.keys(chaves).forEach(function(chave) {
            if (chaves[chave] > 1) {
              resultado.chavesDuplicidadeRepetidas.push({
                chaveDuplicidade: chave,
                quantidade: chaves[chave]
              });
            }
          });
          if (idxLote < 0) avisos.push("Header LOTE_ID não encontrado em FIN_CARTOES_EXTRATOS.");
          if (idxChave < 0) avisos.push("Header CHAVE_DUPLICIDADE não encontrado em FIN_CARTOES_EXTRATOS.");
        }
      }

      if (sheetTmp) {
        resultado.totalLinhasTmp = Math.max(0, sheetTmp.getLastRow() - 1);
      }

      resultado.success = bloqueios.length === 0;
    } catch (e) {
      bloqueios.push(e && e.message ? e.message : String(e));
      resultado.success = false;
    }

    if (typeof Logger !== "undefined" && Logger && Logger.log) {
      Logger.log(JSON.stringify(resultado, null, 2));
    }
    return resultado;
  }

  function diagnosticarBaseConciliacaoFlash_FIN120_SEM_GRAVAR() {
    var bloqueios = [];
    var avisos = [];
    var alvos = {
      extratos: {
        nomeAba: ABAS.EXTRATOS,
        grupos: [
          ["CHAVE_DUPLICIDADE"],
          ["DATA", "DATA_TRANSACAO"],
          ["VALOR", "VALOR_TRANSACAO"],
          ["CARTAO_ID", "CARTAO_FINAL"]
        ]
      },
      lancamentos: {
        nomeAba: ABAS.LANCAMENTOS,
        grupos: [
          ["LANCAMENTO_ID"],
          ["CARTAO_ID"],
          ["VALOR"],
          ["DATA", "DATA_GASTO"],
          ["FINALIDADE", "DESCRICAO", "DESCRICAO_GASTO"]
        ]
      },
      conciliacao: {
        nomeAba: ABAS.CONCILIACAO,
        grupos: [["CONCILIACAO_ID"]]
      },
      pendencias: {
        nomeAba: ABAS.PENDENCIAS,
        grupos: [["PENDENCIA_ID"]]
      }
    };
    var resultado = {
      success: false,
      executado: false,
      modo: "DIAGNOSTICO_BASE_CONCILIACAO_FLASH_FIN120",
      spreadsheetId: "",
      abas: {},
      headersPresentes: {},
      faltantes: {},
      bloqueios: bloqueios,
      avisos: avisos
    };

    try {
      var ss = abrirDbFin_();
      resultado.spreadsheetId = ss.getId();

      Object.keys(alvos).forEach(function(chaveAba) {
        var alvo = alvos[chaveAba];
        var sheet = ss.getSheetByName(alvo.nomeAba);
        resultado.abas[chaveAba] = {
          nomeAba: alvo.nomeAba,
          existe: !!sheet,
          totalLinhas: sheet ? Math.max(0, sheet.getLastRow() - 1) : 0,
          totalHeaders: 0
        };
        resultado.headersPresentes[chaveAba] = [];
        resultado.faltantes[chaveAba] = [];
        if (!sheet) {
          bloqueios.push("Aba " + alvo.nomeAba + " não encontrada.");
          return;
        }

        var headers = lerHeadersReaisFin_(sheet);
        resultado.headersPresentes[chaveAba] = headers.slice();
        resultado.abas[chaveAba].totalHeaders = headers.length;
        alvo.grupos.forEach(function(grupo) {
          var temAlgum = grupo.some(function(header) {
            return headers.indexOf(header) >= 0;
          });
          if (!temAlgum) {
            resultado.faltantes[chaveAba].push(grupo.join(" ou "));
          }
        });
        if (resultado.faltantes[chaveAba].length) {
          bloqueios.push("Campos mínimos faltantes em " + alvo.nomeAba + ": " + resultado.faltantes[chaveAba].join(", "));
        }
      });

      if (ABAS.LANCAMENTOS !== "FIN_LANCAMENTOS") {
        avisos.push("Schema atual usa " + ABAS.LANCAMENTOS + " como aba de lançamentos FIN.");
      }
      if (ABAS.CONCILIACAO !== "FIN_CONCILIACAO") {
        avisos.push("Schema atual usa " + ABAS.CONCILIACAO + " como aba de conciliação FIN.");
      }
      if (ABAS.PENDENCIAS !== "FIN_PENDENCIAS") {
        avisos.push("Schema atual usa " + ABAS.PENDENCIAS + " como aba de pendências FIN.");
      }

      resultado.success = bloqueios.length === 0;
    } catch (e) {
      bloqueios.push(e && e.message ? e.message : String(e));
      resultado.success = false;
    }

    if (typeof Logger !== "undefined" && Logger && Logger.log) {
      Logger.log(JSON.stringify(resultado, null, 2));
    }
    return resultado;
  }

  function valorPorHeadersFin121_(obj, headers) {
    for (var i = 0; i < headers.length; i++) {
      if (Object.prototype.hasOwnProperty.call(obj, headers[i])) {
        var valor = obj[headers[i]];
        if (valor !== "" && valor !== null && typeof valor !== "undefined") return valor;
      }
    }
    return "";
  }

  function dataIsoFin121_(valor) {
    if (Object.prototype.toString.call(valor) === "[object Date]" && !isNaN(valor.getTime())) {
      var timezone = "America/Sao_Paulo";
      try {
        timezone = Session.getScriptTimeZone() || timezone;
      } catch (e) {
        timezone = "America/Sao_Paulo";
      }
      return Utilities.formatDate(valor, timezone, "yyyy-MM-dd");
    }
    var texto = String(valor || "").trim();
    if (!texto) return "";
    var iso = texto.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (iso) return iso[1] + "-" + iso[2] + "-" + iso[3];
    // Datas lidas de Sheets/Apps Script não devem ser reinterpretadas em formato americano.
    // dd/mm/yyyy: 10/06/2026 -> 2026-06-10; 11/06/2026 -> 2026-06-11.
    // ISO preservado: 2026-06-10 -> 2026-06-10; 2026-06-11 -> 2026-06-11.
    var br = texto.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
    if (br) {
      var ano = br[3].length === 2 ? "20" + br[3] : br[3];
      return ano + "-" + ("0" + br[2]).slice(-2) + "-" + ("0" + br[1]).slice(-2);
    }
    return texto.slice(0, 10);
  }

  function diferencaDiasFin121_(dataA, dataB) {
    if (!dataA || !dataB) return 999999;
    var partesA = String(dataA).split("-");
    var partesB = String(dataB).split("-");
    if (partesA.length < 3 || partesB.length < 3) return 999999;
    var utcA = Date.UTC(Number(partesA[0]), Number(partesA[1]) - 1, Number(partesA[2]));
    var utcB = Date.UTC(Number(partesB[0]), Number(partesB[1]) - 1, Number(partesB[2]));
    return Math.abs(Math.round((utcA - utcB) / 86400000));
  }

  function linhaAtivaFin121_(obj) {
    var status = normalizarTextoFin1114_(obj.STATUS || "");
    if (!status) return true;
    return ["ATIVO", "IMPORTADO", "PENDENTE", "ABERTO", "APROVADO"].indexOf(status) >= 0;
  }

  function naoConciliadoFin121_(obj) {
    return normalizarTextoFin1114_(obj.CONCILIADO || "") !== "SIM";
  }

  function previsualizarConciliacaoFlash_FIN121_SEM_GRAVAR() {
    var bloqueios = [];
    var avisos = [];
    var resultado = {
      success: false,
      executado: false,
      modo: "PREVIA_CONCILIACAO_FLASH_FIN121",
      spreadsheetId: "",
      totalExtratosPendentes: 0,
      totalLancamentosPendentes: 0,
      totalConciliaveis: 0,
      totalSemPrestacao: 0,
      totalSemExtrato: 0,
      extratosSemPrestacao: [],
      paresSugeridos: [],
      lancamentosSemExtrato: [],
      bloqueios: bloqueios,
      avisos: avisos
    };

    try {
      var ss = abrirDbFin_();
      resultado.spreadsheetId = ss.getId();

      var sheetExtratos = ss.getSheetByName(ABAS.EXTRATOS);
      var sheetLancamentos = ss.getSheetByName(ABAS.LANCAMENTOS);
      if (!sheetExtratos) bloqueios.push("Aba FIN_CARTOES_EXTRATOS não encontrada.");
      if (!sheetLancamentos) bloqueios.push("Aba " + ABAS.LANCAMENTOS + " não encontrada.");
      if (bloqueios.length) {
        resultado.success = false;
        Logger.log(JSON.stringify(resultado, null, 2));
        return resultado;
      }

      var headersExtratos = lerHeadersReaisFin_(sheetExtratos);
      var headersLancamentos = lerHeadersReaisFin_(sheetLancamentos);
      var linhasExtratos = [];
      var linhasLancamentos = [];
      if (sheetExtratos.getLastRow() > 1 && sheetExtratos.getLastColumn() > 0) {
        linhasExtratos = objetosPorHeadersFin1119_(
          headersExtratos,
          sheetExtratos.getRange(2, 1, sheetExtratos.getLastRow() - 1, sheetExtratos.getLastColumn()).getValues()
        );
      }
      if (sheetLancamentos.getLastRow() > 1 && sheetLancamentos.getLastColumn() > 0) {
        linhasLancamentos = objetosPorHeadersFin1119_(
          headersLancamentos,
          sheetLancamentos.getRange(2, 1, sheetLancamentos.getLastRow() - 1, sheetLancamentos.getLastColumn()).getValues()
        );
      }

      var extratosPendentes = linhasExtratos.filter(function(extrato) {
        var statusOk = !Object.prototype.hasOwnProperty.call(extrato, "STATUS") ||
          normalizarTextoFin1114_(extrato.STATUS || "") === "IMPORTADO";
        return statusOk && naoConciliadoFin121_(extrato);
      }).map(function(extrato, idx) {
        return {
          indice: idx,
          loteId: extrato.LOTE_ID || "",
          chaveDuplicidade: extrato.CHAVE_DUPLICIDADE || "",
          data: dataIsoFin121_(valorPorHeadersFin121_(extrato, ["DATA_TRANSACAO", "DATA"])),
          valor: normalizarNumeroFin1114_(valorPorHeadersFin121_(extrato, ["VALOR", "VALOR_TRANSACAO"])),
          cartaoId: extrato.CARTAO_ID || "",
          cartaoFinal: extrato.CARTAO_FINAL || "",
          estabelecimento: valorPorHeadersFin121_(extrato, ["ESTABELECIMENTO_EXTRATO", "ESTABELECIMENTO", "DESCRICAO"])
        };
      });

      var lancamentosPendentes = linhasLancamentos.filter(function(lancamento) {
        return linhaAtivaFin121_(lancamento) && naoConciliadoFin121_(lancamento);
      }).map(function(lancamento, idx) {
        return {
          indice: idx,
          lancamentoId: lancamento.LANCAMENTO_ID || lancamento.ID || "",
          data: dataIsoFin121_(valorPorHeadersFin121_(lancamento, ["DATA_GASTO", "DATA"])),
          valor: normalizarNumeroFin1114_(valorPorHeadersFin121_(lancamento, ["VALOR", "VALOR_TRANSACAO"])),
          cartaoId: lancamento.CARTAO_ID || "",
          cartaoFinal: lancamento.CARTAO_FINAL || "",
          descricao: valorPorHeadersFin121_(lancamento, ["DESCRICAO_GASTO", "DESCRICAO", "FINALIDADE"])
        };
      });

      var lancamentosPareados = {};
      var totalParesSugeridos = 0;
      var totalExtratosSemPrestacao = 0;
      extratosPendentes.forEach(function(extrato) {
        var candidatos = lancamentosPendentes.filter(function(lancamento) {
          var valorOk = Math.abs(Math.abs(extrato.valor) - Math.abs(lancamento.valor)) <= 0.01 ||
            Math.abs(extrato.valor - lancamento.valor) <= 0.01;
          var dataOk = diferencaDiasFin121_(extrato.data, lancamento.data) <= 1;
          var cartaoIdOk = !extrato.cartaoId || !lancamento.cartaoId || extrato.cartaoId === lancamento.cartaoId;
          var cartaoFinalOk = !extrato.cartaoFinal || !lancamento.cartaoFinal || extrato.cartaoFinal === lancamento.cartaoFinal;
          var cartaoOk = cartaoIdOk && cartaoFinalOk;
          return valorOk && dataOk && cartaoOk;
        });

        if (candidatos.length) {
          var escolhido = candidatos[0];
          totalParesSugeridos++;
          lancamentosPareados[escolhido.indice] = true;
          if (resultado.paresSugeridos.length < 20) {
            resultado.paresSugeridos.push({
              extrato: extrato,
              lancamento: escolhido,
              criterio: "valor_data_cartao"
            });
          }
        } else {
          totalExtratosSemPrestacao++;
          if (resultado.extratosSemPrestacao.length < 20) {
            resultado.extratosSemPrestacao.push(extrato);
          }
        }
      });

      lancamentosPendentes.forEach(function(lancamento) {
        if (!lancamentosPareados[lancamento.indice] && resultado.lancamentosSemExtrato.length < 20) {
          resultado.lancamentosSemExtrato.push(lancamento);
        }
      });

      resultado.totalExtratosPendentes = extratosPendentes.length;
      resultado.totalLancamentosPendentes = lancamentosPendentes.length;
      resultado.totalConciliaveis = totalParesSugeridos;
      resultado.totalSemPrestacao = totalExtratosSemPrestacao;
      resultado.totalSemExtrato = lancamentosPendentes.length - Object.keys(lancamentosPareados).length;
      resultado.success = bloqueios.length === 0;
    } catch (e) {
      bloqueios.push(e && e.message ? e.message : String(e));
      resultado.success = false;
    }

    if (typeof Logger !== "undefined" && Logger && Logger.log) {
      Logger.log(JSON.stringify(resultado, null, 2));
    }
    return resultado;
  }

  function prepararLancamentosTesteConciliacaoFlash_FIN123(confirmacao) {
    var autorizado = String(confirmacao || "") === "PREPARAR_LANCAMENTOS_TESTE_CONCILIACAO_FLASH_FIN123";
    var bloqueios = [];
    var avisos = [];
    var resultado = {
      success: false,
      executado: false,
      autorizado: autorizado,
      modo: "PREPARACAO_LANCAMENTOS_TESTE_CONCILIACAO_FLASH_FIN123",
      spreadsheetId: "",
      linhasPreparadas: 3,
      linhasGravadas: 0,
      idsJaExistentes: [],
      bloqueios: bloqueios,
      avisos: avisos,
      amostraLancamentos: []
    };

    if (!autorizado) {
      bloqueios.push("Confirmação obrigatória inválida ou ausente para preparar lançamentos de teste FIN.12.3");
      if (typeof Logger !== "undefined" && Logger && Logger.log) {
        Logger.log(JSON.stringify(resultado, null, 2));
      }
      return resultado;
    }

    try {
      var ss = abrirDbFin_();
      resultado.spreadsheetId = ss.getId();

      var sheetLancamentos = ss.getSheetByName(ABAS.LANCAMENTOS);
      if (!sheetLancamentos) {
        bloqueios.push("Aba " + ABAS.LANCAMENTOS + " não encontrada.");
        throw new Error("Preparação bloqueada por aba de lançamentos ausente.");
      }

      var headers = lerHeadersReaisFin_(sheetLancamentos);
      if (!headers.length) {
        bloqueios.push("Aba " + ABAS.LANCAMENTOS + " sem headers.");
        throw new Error("Preparação bloqueada por headers ausentes.");
      }
      var mapa = mapaHeadersFin1117_(headers);
      if (!Object.prototype.hasOwnProperty.call(mapa, "LANCAMENTO_ID")) {
        bloqueios.push("Header LANCAMENTO_ID não encontrado em " + ABAS.LANCAMENTOS + ".");
        throw new Error("Preparação bloqueada por LANCAMENTO_ID ausente.");
      }

      var existentes = {};
      if (sheetLancamentos.getLastRow() > 1) {
        var valoresIds = sheetLancamentos.getRange(2, mapa.LANCAMENTO_ID + 1, sheetLancamentos.getLastRow() - 1, 1).getValues();
        valoresIds.forEach(function(linha) {
          var id = String(linha[0] || "").trim();
          if (id) existentes[id] = true;
        });
      }

      var baseLancamentos = [
        {
          id: "LANC-TESTE-FIN123-001",
          dataGasto: "2026-06-10",
          valor: 150,
          estabelecimento: "POSTO TESTE GOIANIA"
        },
        {
          id: "LANC-TESTE-FIN123-002",
          dataGasto: "2026-06-11",
          valor: 32.90,
          estabelecimento: "ALMOCO TESTE"
        },
        {
          id: "LANC-TESTE-FIN123-003",
          dataGasto: "2026-06-12",
          valor: 99.99,
          estabelecimento: "TESTE SEM EXTRATO"
        }
      ];
      var agora = new Date();
      var timezone = "America/Sao_Paulo";
      try {
        timezone = Session.getScriptTimeZone() || timezone;
      } catch (eTimezone) {
        timezone = "America/Sao_Paulo";
      }
      var agoraIso = Utilities.formatDate(agora, timezone, "yyyy-MM-dd HH:mm:ss");
      var usuario = "";
      try {
        usuario = Session.getActiveUser().getEmail() || "";
      } catch (eUsuario) {
        usuario = "";
      }

      var linhasParaGravar = [];
      baseLancamentos.forEach(function(item) {
        if (existentes[item.id]) {
          resultado.idsJaExistentes.push(item.id);
          return;
        }

        var linha = headers.map(function() { return ""; });
        preencherHeaderFin1117_(linha, mapa, "ID", item.id);
        preencherHeaderFin1117_(linha, mapa, "LANCAMENTO_ID", item.id);
        preencherHeaderFin1117_(linha, mapa, "CARTAO_ID", "");
        preencherHeaderFin1117_(linha, mapa, "FUNCIONARIO_NOME", "THIAGO TESTE");
        preencherHeaderFin1117_(linha, mapa, "DATA_GASTO", item.dataGasto);
        preencherHeaderFin1117_(linha, mapa, "VALOR", item.valor);
        preencherHeaderFin1117_(linha, mapa, "ESTABELECIMENTO", item.estabelecimento);
        preencherHeaderFin1117_(linha, mapa, "DESCRICAO_GASTO", item.estabelecimento);
        preencherHeaderFin1117_(linha, mapa, "CARTAO_FINAL", "9999");
        preencherHeaderFin1117_(linha, mapa, "COMPROVANTE_OK", "SIM");
        preencherHeaderFin1117_(linha, mapa, "STATUS_PRESTACAO", "APROVADO");
        preencherHeaderFin1117_(linha, mapa, "CONCILIADO", "NAO");
        preencherHeaderFin1117_(linha, mapa, "STATUS", "ATIVO");
        preencherHeaderFin1117_(linha, mapa, "CRIADO_EM", agoraIso);
        preencherHeaderFin1117_(linha, mapa, "CRIADO_POR", usuario);
        preencherHeaderFin1117_(linha, mapa, "ATUALIZADO_EM", agoraIso);
        preencherHeaderFin1117_(linha, mapa, "ATUALIZADO_POR", usuario);
        linhasParaGravar.push(linha);
        resultado.amostraLancamentos.push({
          lancamentoId: item.id,
          dataGasto: item.dataGasto,
          valor: item.valor,
          estabelecimento: item.estabelecimento,
          funcionarioNome: "THIAGO TESTE",
          cartaoFinal: "9999",
          conciliado: "NAO",
          status: "ATIVO"
        });
      });

      if (resultado.idsJaExistentes.length) {
        avisos.push("Lançamentos de teste já existentes não foram duplicados: " + resultado.idsJaExistentes.join(", "));
      }

      if (linhasParaGravar.length) {
        sheetLancamentos.getRange(sheetLancamentos.getLastRow() + 1, 1, linhasParaGravar.length, headers.length).setValues(linhasParaGravar);
      }

      resultado.linhasGravadas = linhasParaGravar.length;
      resultado.executado = true;
      resultado.success = bloqueios.length === 0;
    } catch (e) {
      if (!bloqueios.length) {
        bloqueios.push(e && e.message ? e.message : String(e));
      }
      resultado.success = false;
      resultado.executado = false;
    }

    if (typeof Logger !== "undefined" && Logger && Logger.log) {
      Logger.log(JSON.stringify(resultado, null, 2));
    }
    return resultado;
  }

  function executarPreparacaoLancamentosTesteConciliacaoFlash_FIN124_AUTORIZADA() {
    return prepararLancamentosTesteConciliacaoFlash_FIN123("PREPARAR_LANCAMENTOS_TESTE_CONCILIACAO_FLASH_FIN123");
  }

  function objetosPorHeadersComLinhaFin125_(headers, valores, linhaInicial) {
    return valores.map(function(linha, idx) {
      var obj = {};
      headers.forEach(function(header, i) {
        if (header) obj[header] = linha[i];
      });
      obj.__linha = linhaInicial + idx;
      obj.__valores = linha;
      return obj;
    });
  }

  function obterIdExtratoFin125_(extrato) {
    return String(extrato.EXTRATO_ID || extrato.ID || extrato.CHAVE_DUPLICIDADE || "").trim();
  }

  function criarItemExtratoConciliacaoFin125_(extrato) {
    return {
      linha: extrato.__linha,
      valores: extrato.__valores,
      extratoId: obterIdExtratoFin125_(extrato),
      loteId: extrato.LOTE_ID || "",
      chaveDuplicidade: extrato.CHAVE_DUPLICIDADE || "",
      data: dataIsoFin121_(valorPorHeadersFin121_(extrato, ["DATA_TRANSACAO", "DATA"])),
      valor: normalizarNumeroFin1114_(valorPorHeadersFin121_(extrato, ["VALOR", "VALOR_TRANSACAO"])),
      tipo: normalizarTextoFin1114_(valorPorHeadersFin121_(extrato, ["TIPO_TRANSACAO", "TIPO", "DEBITO_CREDITO"])),
      cartaoId: extrato.CARTAO_ID || "",
      cartaoFinal: extrato.CARTAO_FINAL || "",
      estabelecimento: valorPorHeadersFin121_(extrato, ["ESTABELECIMENTO_EXTRATO", "ESTABELECIMENTO", "DESCRICAO"])
    };
  }

  function criarItemLancamentoConciliacaoFin125_(lancamento) {
    return {
      linha: lancamento.__linha,
      valores: lancamento.__valores,
      lancamentoId: String(lancamento.LANCAMENTO_ID || lancamento.ID || "").trim(),
      data: dataIsoFin121_(valorPorHeadersFin121_(lancamento, ["DATA_GASTO", "DATA"])),
      valor: normalizarNumeroFin1114_(valorPorHeadersFin121_(lancamento, ["VALOR", "VALOR_TRANSACAO"])),
      cartaoId: lancamento.CARTAO_ID || "",
      cartaoFinal: lancamento.CARTAO_FINAL || "",
      descricao: valorPorHeadersFin121_(lancamento, ["DESCRICAO_GASTO", "DESCRICAO", "FINALIDADE", "ESTABELECIMENTO"])
    };
  }

  function encontrarParesConciliacaoFlashFin125_(extratosPendentes, lancamentosPendentes) {
    var lancamentosUsados = {};
    var pares = [];
    var semPrestacao = [];
    extratosPendentes.forEach(function(extrato) {
      var tipoCredito = extrato.tipo.indexOf("CRED") >= 0 || extrato.valor > 0;
      var isEstorno = normalizarTextoFin1114_(extrato.estabelecimento).indexOf("ESTORNO") >= 0;
      if (tipoCredito || isEstorno) {
        semPrestacao.push(extrato);
        return;
      }

      var candidatos = lancamentosPendentes.filter(function(lancamento) {
        if (lancamentosUsados[lancamento.lancamentoId]) return false;
        var valorOk = Math.abs(Math.abs(extrato.valor) - Math.abs(lancamento.valor)) <= 0.01 ||
          Math.abs(extrato.valor - lancamento.valor) <= 0.01;
        var dataOk = diferencaDiasFin121_(extrato.data, lancamento.data) <= 1;
        var cartaoIdOk = !extrato.cartaoId || !lancamento.cartaoId || extrato.cartaoId === lancamento.cartaoId;
        var cartaoFinalOk = !extrato.cartaoFinal || !lancamento.cartaoFinal || extrato.cartaoFinal === lancamento.cartaoFinal;
        return valorOk && dataOk && cartaoIdOk && cartaoFinalOk;
      });

      if (candidatos.length) {
        var escolhido = candidatos[0];
        lancamentosUsados[escolhido.lancamentoId] = true;
        pares.push({
          extrato: extrato,
          lancamento: escolhido,
          criterio: "valor_abs_data_cartao",
          confianca: "ALTA"
        });
      } else {
        semPrestacao.push(extrato);
      }
    });

    var semExtrato = lancamentosPendentes.filter(function(lancamento) {
      return !lancamentosUsados[lancamento.lancamentoId];
    });
    return {
      pares: pares,
      semPrestacao: semPrestacao,
      semExtrato: semExtrato
    };
  }

  function conciliarExtratoFlashTeste_FIN125(confirmacao) {
    var autorizado = String(confirmacao || "") === "CONCILIAR_EXTRATO_FLASH_TESTE_FIN125";
    var bloqueios = [];
    var avisos = [];
    var resultado = {
      success: false,
      executado: false,
      autorizado: autorizado,
      modo: "CONCILIACAO_EXTRATO_FLASH_TESTE_FIN125",
      spreadsheetId: "",
      conciliacaoId: "",
      totalParesEncontrados: 0,
      totalConciliados: 0,
      totalSemPrestacao: 0,
      totalSemExtrato: 0,
      extratosAtualizados: [],
      lancamentosAtualizados: [],
      conciliacaoGravada: false,
      bloqueios: bloqueios,
      avisos: avisos,
      amostraConciliados: []
    };

    if (!autorizado) {
      bloqueios.push("Confirmação obrigatória inválida ou ausente para conciliação FIN.12.5");
      if (typeof Logger !== "undefined" && Logger && Logger.log) {
        Logger.log(JSON.stringify(resultado, null, 2));
      }
      return resultado;
    }

    try {
      var ss = abrirDbFin_();
      resultado.spreadsheetId = ss.getId();
      var sheetExtratos = ss.getSheetByName(ABAS.EXTRATOS);
      var sheetLancamentos = ss.getSheetByName(ABAS.LANCAMENTOS);
      var sheetConciliacao = ss.getSheetByName(ABAS.CONCILIACAO);
      if (!sheetExtratos) bloqueios.push("Aba FIN_CARTOES_EXTRATOS não encontrada.");
      if (!sheetLancamentos) bloqueios.push("Aba " + ABAS.LANCAMENTOS + " não encontrada.");
      if (!sheetConciliacao) bloqueios.push("Aba " + ABAS.CONCILIACAO + " não encontrada.");
      if (bloqueios.length) throw new Error("Conciliação bloqueada por abas obrigatórias ausentes.");

      var headersExtratos = lerHeadersReaisFin_(sheetExtratos);
      var headersLancamentos = lerHeadersReaisFin_(sheetLancamentos);
      var headersConciliacao = lerHeadersReaisFin_(sheetConciliacao);
      var mapaExtratos = mapaHeadersFin1117_(headersExtratos);
      var mapaLancamentos = mapaHeadersFin1117_(headersLancamentos);
      var mapaConciliacao = mapaHeadersFin1117_(headersConciliacao);
      var valoresExtratos = sheetExtratos.getLastRow() > 1 ?
        sheetExtratos.getRange(2, 1, sheetExtratos.getLastRow() - 1, sheetExtratos.getLastColumn()).getValues() : [];
      var valoresLancamentos = sheetLancamentos.getLastRow() > 1 ?
        sheetLancamentos.getRange(2, 1, sheetLancamentos.getLastRow() - 1, sheetLancamentos.getLastColumn()).getValues() : [];
      var extratos = objetosPorHeadersComLinhaFin125_(headersExtratos, valoresExtratos, 2);
      var lancamentos = objetosPorHeadersComLinhaFin125_(headersLancamentos, valoresLancamentos, 2);

      var extratosPendentes = extratos.filter(function(extrato) {
        var statusOk = !Object.prototype.hasOwnProperty.call(extrato, "STATUS") ||
          normalizarTextoFin1114_(extrato.STATUS || "") === "IMPORTADO";
        return statusOk && naoConciliadoFin121_(extrato);
      }).map(criarItemExtratoConciliacaoFin125_);
      var lancamentosPendentes = lancamentos.filter(function(lancamento) {
        return linhaAtivaFin121_(lancamento) && naoConciliadoFin121_(lancamento);
      }).map(criarItemLancamentoConciliacaoFin125_);
      var previa = encontrarParesConciliacaoFlashFin125_(extratosPendentes, lancamentosPendentes);
      resultado.totalParesEncontrados = previa.pares.length;
      resultado.totalSemPrestacao = previa.semPrestacao.length;
      resultado.totalSemExtrato = previa.semExtrato.length;

      previa.pares.forEach(function(par) {
        preencherHeaderFin1117_(par.extrato.valores, mapaExtratos, "CONCILIADO", "SIM");
        preencherHeaderFin1117_(par.extrato.valores, mapaExtratos, "LANCAMENTO_ID", par.lancamento.lancamentoId);
        preencherHeaderFin1117_(par.extrato.valores, mapaExtratos, "STATUS_CONCILIACAO", "CONCILIADO");
        preencherHeaderFin1117_(par.extrato.valores, mapaExtratos, "DIVERGENCIA_TIPO", "");
        preencherHeaderFin1117_(par.extrato.valores, mapaExtratos, "DIVERGENCIA_VALOR", 0);
        preencherHeaderFin1117_(par.lancamento.valores, mapaLancamentos, "CONCILIADO", "SIM");
        preencherHeaderFin1117_(par.lancamento.valores, mapaLancamentos, "LANCAMENTO_EXTRATO_ID", par.extrato.extratoId);
        preencherHeaderFin1117_(par.lancamento.valores, mapaLancamentos, "STATUS", "ATIVO");
        preencherHeaderFin1117_(par.lancamento.valores, mapaLancamentos, "DIVERGENCIA_TIPO", "");
        preencherHeaderFin1117_(par.lancamento.valores, mapaLancamentos, "DIVERGENCIA_VALOR", 0);
        sheetExtratos.getRange(par.extrato.linha, 1, 1, headersExtratos.length).setValues([par.extrato.valores]);
        sheetLancamentos.getRange(par.lancamento.linha, 1, 1, headersLancamentos.length).setValues([par.lancamento.valores]);
        resultado.extratosAtualizados.push(par.extrato.extratoId);
        resultado.lancamentosAtualizados.push(par.lancamento.lancamentoId);
        if (resultado.amostraConciliados.length < 10) {
          resultado.amostraConciliados.push({
            extratoId: par.extrato.extratoId,
            lancamentoId: par.lancamento.lancamentoId,
            valorExtrato: par.extrato.valor,
            valorLancamento: par.lancamento.valor,
            dataExtrato: par.extrato.data,
            dataLancamento: par.lancamento.data,
            criterio: par.criterio
          });
        }
      });
      resultado.totalConciliados = resultado.extratosAtualizados.length;

      var resumoJaExiste = false;
      if (sheetConciliacao.getLastRow() > 1 && headersConciliacao.length) {
        var valoresConciliacao = sheetConciliacao.getRange(2, 1, sheetConciliacao.getLastRow() - 1, sheetConciliacao.getLastColumn()).getValues();
        var idxConciliacaoId = headersConciliacao.indexOf("CONCILIACAO_ID");
        var idxObs = headersConciliacao.indexOf("OBSERVACOES_FINANCEIRO");
        valoresConciliacao.forEach(function(linha) {
          var id = idxConciliacaoId >= 0 ? String(linha[idxConciliacaoId] || "") : "";
          var obs = idxObs >= 0 ? String(linha[idxObs] || "") : "";
          if (id.indexOf("CONC-FLASH-TESTE-FIN125-") === 0 || obs.indexOf("FIN.12.5 TESTE FLASH") >= 0) {
            resumoJaExiste = true;
          }
        });
      }

      var agora = new Date();
      var timezone = Session.getScriptTimeZone();
      var agoraIso = Utilities.formatDate(agora, timezone, "yyyy-MM-dd HH:mm:ss");
      var stamp = Utilities.formatDate(agora, timezone, "yyyyMMdd-HHmmss");
      resultado.conciliacaoId = "CONC-FLASH-TESTE-FIN125-" + stamp;
      var usuario = "";
      try {
        usuario = Session.getActiveUser().getEmail() || "";
      } catch (eUsuario) {
        usuario = "";
      }

      if (resumoJaExiste) {
        avisos.push("Resumo de conciliação FIN.12.5 já existe; nova linha não foi criada.");
      } else if (headersConciliacao.length && resultado.totalConciliados > 0) {
        var datas = extratosPendentes.map(function(extrato) { return extrato.data; }).filter(function(data) { return !!data; }).sort();
        var linhaResumo = headersConciliacao.map(function() { return ""; });
        preencherHeaderFin1117_(linhaResumo, mapaConciliacao, "ID", resultado.conciliacaoId);
        preencherHeaderFin1117_(linhaResumo, mapaConciliacao, "CONCILIACAO_ID", resultado.conciliacaoId);
        preencherHeaderFin1117_(linhaResumo, mapaConciliacao, "DATA_CONCILIACAO", agoraIso);
        preencherHeaderFin1117_(linhaResumo, mapaConciliacao, "REALIZADO_POR", usuario);
        preencherHeaderFin1117_(linhaResumo, mapaConciliacao, "PERIODO_INICIO", datas[0] || "");
        preencherHeaderFin1117_(linhaResumo, mapaConciliacao, "PERIODO_FIM", datas[datas.length - 1] || "");
        preencherHeaderFin1117_(linhaResumo, mapaConciliacao, "TOTAL_LANCAMENTOS", lancamentosPendentes.length);
        preencherHeaderFin1117_(linhaResumo, mapaConciliacao, "TOTAL_EXTRATO", extratosPendentes.length);
        preencherHeaderFin1117_(linhaResumo, mapaConciliacao, "TOTAL_CONCILIADO", resultado.totalConciliados);
        preencherHeaderFin1117_(linhaResumo, mapaConciliacao, "TOTAL_DIVERGENTE", 0);
        preencherHeaderFin1117_(linhaResumo, mapaConciliacao, "TOTAL_SEM_PRESTACAO", resultado.totalSemPrestacao);
        preencherHeaderFin1117_(linhaResumo, mapaConciliacao, "TOTAL_SEM_EXTRATO", resultado.totalSemExtrato);
        preencherHeaderFin1117_(linhaResumo, mapaConciliacao, "PERCENTUAL_CONCILIADO",
          extratosPendentes.length ? Number(((resultado.totalConciliados / extratosPendentes.length) * 100).toFixed(2)) : 0);
        preencherHeaderFin1117_(linhaResumo, mapaConciliacao, "STATUS", "CONCLUIDO");
        preencherHeaderFin1117_(linhaResumo, mapaConciliacao, "OBSERVACOES_FINANCEIRO", "FIN.12.5 TESTE FLASH - conciliação controlada sem pendências.");
        preencherHeaderFin1117_(linhaResumo, mapaConciliacao, "CRIADO_EM", agoraIso);
        preencherHeaderFin1117_(linhaResumo, mapaConciliacao, "CRIADO_POR", usuario);
        sheetConciliacao.getRange(sheetConciliacao.getLastRow() + 1, 1, 1, headersConciliacao.length).setValues([linhaResumo]);
        resultado.conciliacaoGravada = true;
      }

      resultado.executado = true;
      resultado.success = bloqueios.length === 0;
    } catch (e) {
      if (!bloqueios.length) {
        bloqueios.push(e && e.message ? e.message : String(e));
      }
      resultado.success = false;
      resultado.executado = false;
    }

    if (typeof Logger !== "undefined" && Logger && Logger.log) {
      Logger.log(JSON.stringify(resultado, null, 2));
    }
    return resultado;
  }

  function auditarConciliacaoFlash_FIN126_SEM_GRAVAR() {
    var bloqueios = [];
    var avisos = [];
    var resultado = {
      success: false,
      executado: false,
      modo: "AUDITORIA_CONCILIACAO_FLASH_FIN126",
      spreadsheetId: "",
      totalExtratos: 0,
      totalExtratosConciliados: 0,
      totalExtratosNaoConciliados: 0,
      totalLancamentos: 0,
      totalLancamentosConciliados: 0,
      totalLancamentosNaoConciliados: 0,
      totalRegistrosConciliacao: 0,
      totalPendencias: 0,
      extratosNaoConciliados: [],
      lancamentosNaoConciliados: [],
      ultimasConciliacoes: [],
      inconsistencias: [],
      bloqueios: bloqueios,
      avisos: avisos
    };

    try {
      var ss = abrirDbFin_();
      resultado.spreadsheetId = ss.getId();
      var sheetExtratos = ss.getSheetByName(ABAS.EXTRATOS);
      var sheetLancamentos = ss.getSheetByName(ABAS.LANCAMENTOS);
      var sheetConciliacao = ss.getSheetByName(ABAS.CONCILIACAO);
      var sheetPendencias = ss.getSheetByName(ABAS.PENDENCIAS);
      if (!sheetExtratos) bloqueios.push("Aba FIN_CARTOES_EXTRATOS não encontrada.");
      if (!sheetLancamentos) bloqueios.push("Aba " + ABAS.LANCAMENTOS + " não encontrada.");
      if (!sheetConciliacao) bloqueios.push("Aba " + ABAS.CONCILIACAO + " não encontrada.");
      if (!sheetPendencias) bloqueios.push("Aba " + ABAS.PENDENCIAS + " não encontrada.");
      if (bloqueios.length) throw new Error("Auditoria bloqueada por abas obrigatórias ausentes.");

      var headersExtratos = lerHeadersReaisFin_(sheetExtratos);
      var headersLancamentos = lerHeadersReaisFin_(sheetLancamentos);
      var headersConciliacao = lerHeadersReaisFin_(sheetConciliacao);
      var extratos = sheetExtratos.getLastRow() > 1 ? objetosPorHeadersComLinhaFin125_(
        headersExtratos,
        sheetExtratos.getRange(2, 1, sheetExtratos.getLastRow() - 1, sheetExtratos.getLastColumn()).getValues(),
        2
      ) : [];
      var lancamentos = sheetLancamentos.getLastRow() > 1 ? objetosPorHeadersComLinhaFin125_(
        headersLancamentos,
        sheetLancamentos.getRange(2, 1, sheetLancamentos.getLastRow() - 1, sheetLancamentos.getLastColumn()).getValues(),
        2
      ) : [];
      var conciliacoes = sheetConciliacao.getLastRow() > 1 ? objetosPorHeadersFin1119_(
        headersConciliacao,
        sheetConciliacao.getRange(2, 1, sheetConciliacao.getLastRow() - 1, sheetConciliacao.getLastColumn()).getValues()
      ) : [];
      resultado.totalPendencias = Math.max(0, sheetPendencias.getLastRow() - 1);

      var idsLancamentos = {};
      lancamentos.forEach(function(lancamento) {
        var idLancamento = String(lancamento.LANCAMENTO_ID || lancamento.ID || "").trim();
        if (idLancamento) idsLancamentos[idLancamento] = true;
      });
      var idsExtratos = {};
      extratos.forEach(function(extrato) {
        var idExtrato = obterIdExtratoFin125_(extrato);
        if (idExtrato) idsExtratos[idExtrato] = true;
      });

      resultado.totalExtratos = extratos.length;
      resultado.totalLancamentos = lancamentos.length;
      resultado.totalRegistrosConciliacao = conciliacoes.length;
      extratos.forEach(function(extrato) {
        var idExtrato = obterIdExtratoFin125_(extrato);
        var conciliado = normalizarTextoFin1114_(extrato.CONCILIADO || "") === "SIM";
        if (conciliado) {
          resultado.totalExtratosConciliados++;
          if (!String(extrato.LANCAMENTO_ID || "").trim()) {
            resultado.inconsistencias.push({ tipo: "EXTRATO_SIM_SEM_LANCAMENTO_ID", extratoId: idExtrato });
          } else if (!idsLancamentos[String(extrato.LANCAMENTO_ID || "").trim()]) {
            resultado.inconsistencias.push({ tipo: "EXTRATO_APONTA_LANCAMENTO_INEXISTENTE", extratoId: idExtrato, lancamentoId: extrato.LANCAMENTO_ID });
          }
        } else {
          resultado.totalExtratosNaoConciliados++;
          if (resultado.extratosNaoConciliados.length < 20) {
            resultado.extratosNaoConciliados.push(criarItemExtratoConciliacaoFin125_(extrato));
          }
        }
      });

      lancamentos.forEach(function(lancamento) {
        var idLancamento = String(lancamento.LANCAMENTO_ID || lancamento.ID || "").trim();
        var conciliado = normalizarTextoFin1114_(lancamento.CONCILIADO || "") === "SIM";
        if (conciliado) {
          resultado.totalLancamentosConciliados++;
          if (!String(lancamento.LANCAMENTO_EXTRATO_ID || "").trim()) {
            resultado.inconsistencias.push({ tipo: "LANCAMENTO_SIM_SEM_LANCAMENTO_EXTRATO_ID", lancamentoId: idLancamento });
          } else if (!idsExtratos[String(lancamento.LANCAMENTO_EXTRATO_ID || "").trim()]) {
            resultado.inconsistencias.push({ tipo: "LANCAMENTO_APONTA_EXTRATO_INEXISTENTE", lancamentoId: idLancamento, extratoId: lancamento.LANCAMENTO_EXTRATO_ID });
          }
        } else {
          resultado.totalLancamentosNaoConciliados++;
          if (resultado.lancamentosNaoConciliados.length < 20) {
            resultado.lancamentosNaoConciliados.push(criarItemLancamentoConciliacaoFin125_(lancamento));
          }
        }
      });

      resultado.ultimasConciliacoes = conciliacoes.slice(Math.max(0, conciliacoes.length - 5));
      resultado.success = bloqueios.length === 0;
    } catch (e) {
      if (!bloqueios.length) {
        bloqueios.push(e && e.message ? e.message : String(e));
      }
      resultado.success = false;
    }

    if (typeof Logger !== "undefined" && Logger && Logger.log) {
      Logger.log(JSON.stringify(resultado, null, 2));
    }
    return resultado;
  }

  function chavePendenciaFlashFin131_(tipo, extratoId, lancamentoId) {
    return [
      normalizarTextoFin1114_(tipo),
      String(extratoId || "").trim(),
      String(lancamentoId || "").trim()
    ].join("|");
  }

  function statusNaoCanceladoFin131_(obj) {
    return normalizarTextoFin1114_(obj.STATUS || "") !== "CANCELADO";
  }

  function criarSugestoesPendenciasFlashFin131_(extratos, lancamentos, pendencias) {
    var existentes = {};
    var jaExistentes = [];
    pendencias.forEach(function(pendencia) {
      var tipo = String(pendencia.TIPO_PENDENCIA || "").trim();
      var extratoId = String(pendencia.EXTRATO_ID || "").trim();
      var lancamentoId = String(pendencia.LANCAMENTO_ID || "").trim();
      if (!tipo) return;
      var chave = chavePendenciaFlashFin131_(tipo, extratoId, lancamentoId);
      existentes[chave] = true;
      jaExistentes.push({
        tipoPendencia: tipo,
        extratoId: extratoId,
        lancamentoId: lancamentoId,
        status: pendencia.STATUS || "",
        chave: chave
      });
    });

    var sugestoes = [];
    var existentesRelacionadas = [];
    extratos.forEach(function(extrato) {
      if (!naoConciliadoFin121_(extrato) || !statusNaoCanceladoFin131_(extrato)) return;
      var item = criarItemExtratoConciliacaoFin125_(extrato);
      var chave = chavePendenciaFlashFin131_("EXTRATO_SEM_PRESTACAO", item.extratoId, "");
      var sugestao = {
        chave: chave,
        tipoPendencia: "EXTRATO_SEM_PRESTACAO",
        extratoId: item.extratoId,
        lancamentoId: "",
        cartaoId: item.cartaoId,
        funcionarioId: "",
        funcionarioNome: "",
        descricaoPendencia: "Extrato Flash sem prestação vinculada: " + item.estabelecimento,
        valorEnvolvido: item.valor,
        statusSugerido: "ABERTA"
      };
      if (existentes[chave]) {
        existentesRelacionadas.push(sugestao);
      } else {
        sugestoes.push(sugestao);
      }
    });

    lancamentos.forEach(function(lancamento) {
      if (!naoConciliadoFin121_(lancamento) || !statusNaoCanceladoFin131_(lancamento)) return;
      var item = criarItemLancamentoConciliacaoFin125_(lancamento);
      var chave = chavePendenciaFlashFin131_("LANCAMENTO_SEM_EXTRATO", "", item.lancamentoId);
      var sugestao = {
        chave: chave,
        tipoPendencia: "LANCAMENTO_SEM_EXTRATO",
        extratoId: "",
        lancamentoId: item.lancamentoId,
        cartaoId: item.cartaoId,
        funcionarioId: lancamento.FUNCIONARIO_ID || "",
        funcionarioNome: lancamento.FUNCIONARIO_NOME || "",
        descricaoPendencia: "Lançamento de prestação sem extrato Flash correspondente: " + item.descricao,
        valorEnvolvido: item.valor,
        statusSugerido: "ABERTA"
      };
      if (existentes[chave]) {
        existentesRelacionadas.push(sugestao);
      } else {
        sugestoes.push(sugestao);
      }
    });

    return {
      sugestoes: sugestoes,
      existentesRelacionadas: existentesRelacionadas,
      todasExistentes: jaExistentes
    };
  }

  function lerBasePendenciasFlashFin131_(ss, bloqueios) {
    var sheetExtratos = ss.getSheetByName(ABAS.EXTRATOS);
    var sheetLancamentos = ss.getSheetByName(ABAS.LANCAMENTOS);
    var sheetPendencias = ss.getSheetByName(ABAS.PENDENCIAS);
    if (!sheetExtratos) bloqueios.push("Aba FIN_CARTOES_EXTRATOS não encontrada.");
    if (!sheetLancamentos) bloqueios.push("Aba " + ABAS.LANCAMENTOS + " não encontrada.");
    if (!sheetPendencias) bloqueios.push("Aba " + ABAS.PENDENCIAS + " não encontrada.");
    if (bloqueios.length) {
      return {
        extratos: [],
        lancamentos: [],
        pendencias: [],
        sheetPendencias: sheetPendencias,
        headersPendencias: []
      };
    }

    var headersExtratos = lerHeadersReaisFin_(sheetExtratos);
    var headersLancamentos = lerHeadersReaisFin_(sheetLancamentos);
    var headersPendencias = lerHeadersReaisFin_(sheetPendencias);
    var extratos = sheetExtratos.getLastRow() > 1 ? objetosPorHeadersComLinhaFin125_(
      headersExtratos,
      sheetExtratos.getRange(2, 1, sheetExtratos.getLastRow() - 1, sheetExtratos.getLastColumn()).getValues(),
      2
    ) : [];
    var lancamentos = sheetLancamentos.getLastRow() > 1 ? objetosPorHeadersComLinhaFin125_(
      headersLancamentos,
      sheetLancamentos.getRange(2, 1, sheetLancamentos.getLastRow() - 1, sheetLancamentos.getLastColumn()).getValues(),
      2
    ) : [];
    var pendencias = sheetPendencias.getLastRow() > 1 ? objetosPorHeadersComLinhaFin125_(
      headersPendencias,
      sheetPendencias.getRange(2, 1, sheetPendencias.getLastRow() - 1, sheetPendencias.getLastColumn()).getValues(),
      2
    ) : [];
    return {
      extratos: extratos,
      lancamentos: lancamentos,
      pendencias: pendencias,
      sheetPendencias: sheetPendencias,
      headersPendencias: headersPendencias
    };
  }

  function previsualizarPendenciasFlash_FIN131_SEM_GRAVAR() {
    var bloqueios = [];
    var avisos = [];
    var resultado = {
      success: false,
      executado: false,
      modo: "PREVIA_PENDENCIAS_FLASH_FIN131",
      spreadsheetId: "",
      totalExtratosNaoConciliados: 0,
      totalLancamentosNaoConciliados: 0,
      totalPendenciasSugeridas: 0,
      totalPendenciasJaExistentes: 0,
      pendenciasSugeridas: [],
      pendenciasJaExistentes: [],
      bloqueios: bloqueios,
      avisos: avisos
    };

    try {
      var ss = abrirDbFin_();
      resultado.spreadsheetId = ss.getId();
      var base = lerBasePendenciasFlashFin131_(ss, bloqueios);
      if (bloqueios.length) throw new Error("Prévia de pendências bloqueada por abas obrigatórias ausentes.");
      var previa = criarSugestoesPendenciasFlashFin131_(base.extratos, base.lancamentos, base.pendencias);
      resultado.totalExtratosNaoConciliados = base.extratos.filter(function(extrato) {
        return naoConciliadoFin121_(extrato) && statusNaoCanceladoFin131_(extrato);
      }).length;
      resultado.totalLancamentosNaoConciliados = base.lancamentos.filter(function(lancamento) {
        return naoConciliadoFin121_(lancamento) && statusNaoCanceladoFin131_(lancamento);
      }).length;
      resultado.totalPendenciasSugeridas = previa.sugestoes.length;
      resultado.totalPendenciasJaExistentes = previa.existentesRelacionadas.length;
      resultado.pendenciasSugeridas = previa.sugestoes.slice(0, 20);
      resultado.pendenciasJaExistentes = previa.existentesRelacionadas.slice(0, 20);
      resultado.success = bloqueios.length === 0;
    } catch (e) {
      if (!bloqueios.length) bloqueios.push(e && e.message ? e.message : String(e));
      resultado.success = false;
    }

    if (typeof Logger !== "undefined" && Logger && Logger.log) {
      Logger.log(JSON.stringify(resultado, null, 2));
    }
    return resultado;
  }

  function gerarPendenciasFlash_FIN132(confirmacao) {
    var autorizado = String(confirmacao || "") === "GERAR_PENDENCIAS_FLASH_FIN132";
    var bloqueios = [];
    var avisos = [];
    var resultado = {
      success: false,
      executado: false,
      autorizado: autorizado,
      modo: "GERACAO_PENDENCIAS_FLASH_FIN132",
      spreadsheetId: "",
      totalPendenciasSugeridas: 0,
      totalPendenciasJaExistentes: 0,
      totalPendenciasGravadas: 0,
      pendenciasGravadas: [],
      bloqueios: bloqueios,
      avisos: avisos
    };

    if (!autorizado) {
      bloqueios.push("Confirmação obrigatória inválida ou ausente para gerar pendências FIN.13.2");
      if (typeof Logger !== "undefined" && Logger && Logger.log) {
        Logger.log(JSON.stringify(resultado, null, 2));
      }
      return resultado;
    }

    try {
      var ss = abrirDbFin_();
      resultado.spreadsheetId = ss.getId();
      var base = lerBasePendenciasFlashFin131_(ss, bloqueios);
      if (bloqueios.length) throw new Error("Geração de pendências bloqueada por abas obrigatórias ausentes.");
      var previa = criarSugestoesPendenciasFlashFin131_(base.extratos, base.lancamentos, base.pendencias);
      resultado.totalPendenciasSugeridas = previa.sugestoes.length;
      resultado.totalPendenciasJaExistentes = previa.existentesRelacionadas.length;

      var headers = base.headersPendencias;
      if (!headers.length) {
        bloqueios.push("Aba " + ABAS.PENDENCIAS + " sem headers.");
        throw new Error("Geração de pendências bloqueada por headers ausentes.");
      }
      var mapa = mapaHeadersFin1117_(headers);
      var agora = new Date();
      var timezone = Session.getScriptTimeZone();
      var agoraIso = Utilities.formatDate(agora, timezone, "yyyy-MM-dd HH:mm:ss");
      var dataLimite = Utilities.formatDate(new Date(agora.getTime() + 7 * 86400000), timezone, "yyyy-MM-dd");
      var usuario = "";
      try {
        usuario = Session.getActiveUser().getEmail() || "";
      } catch (eUsuario) {
        usuario = "";
      }

      var linhas = previa.sugestoes.map(function(sugestao, idx) {
        var sequencial = ("000" + (idx + 1)).slice(-3);
        var pendenciaId = "PEND-FLASH-FIN132-" + sequencial;
        var linha = headers.map(function() { return ""; });
        preencherHeaderFin1117_(linha, mapa, "ID", pendenciaId);
        preencherHeaderFin1117_(linha, mapa, "PENDENCIA_ID", pendenciaId);
        preencherHeaderFin1117_(linha, mapa, "TIPO_PENDENCIA", sugestao.tipoPendencia);
        preencherHeaderFin1117_(linha, mapa, "LANCAMENTO_ID", sugestao.lancamentoId);
        preencherHeaderFin1117_(linha, mapa, "EXTRATO_ID", sugestao.extratoId);
        preencherHeaderFin1117_(linha, mapa, "CARTAO_ID", sugestao.cartaoId);
        preencherHeaderFin1117_(linha, mapa, "FUNCIONARIO_ID", sugestao.funcionarioId);
        preencherHeaderFin1117_(linha, mapa, "FUNCIONARIO_NOME", sugestao.funcionarioNome);
        preencherHeaderFin1117_(linha, mapa, "DESCRICAO_PENDENCIA", sugestao.descricaoPendencia);
        preencherHeaderFin1117_(linha, mapa, "VALOR_ENVOLVIDO", sugestao.valorEnvolvido);
        preencherHeaderFin1117_(linha, mapa, "DATA_LIMITE_ESCLARECIMENTO", dataLimite);
        preencherHeaderFin1117_(linha, mapa, "NOTIFICACOES_ENVIADAS", 0);
        preencherHeaderFin1117_(linha, mapa, "CANAL_NOTIFICACAO", "INTERNO");
        preencherHeaderFin1117_(linha, mapa, "STATUS", "ABERTA");
        preencherHeaderFin1117_(linha, mapa, "CRIADO_EM", agoraIso);
        preencherHeaderFin1117_(linha, mapa, "CRIADO_POR", usuario);
        preencherHeaderFin1117_(linha, mapa, "ATUALIZADO_EM", agoraIso);
        preencherHeaderFin1117_(linha, mapa, "ATUALIZADO_POR", usuario);
        resultado.pendenciasGravadas.push({
          pendenciaId: pendenciaId,
          tipoPendencia: sugestao.tipoPendencia,
          extratoId: sugestao.extratoId,
          lancamentoId: sugestao.lancamentoId,
          valorEnvolvido: sugestao.valorEnvolvido
        });
        return linha;
      });

      if (linhas.length) {
        base.sheetPendencias.getRange(base.sheetPendencias.getLastRow() + 1, 1, linhas.length, headers.length).setValues(linhas);
      }
      resultado.totalPendenciasGravadas = linhas.length;
      resultado.executado = true;
      resultado.success = bloqueios.length === 0;
    } catch (e) {
      if (!bloqueios.length) bloqueios.push(e && e.message ? e.message : String(e));
      resultado.success = false;
      resultado.executado = false;
    }

    if (typeof Logger !== "undefined" && Logger && Logger.log) {
      Logger.log(JSON.stringify(resultado, null, 2));
    }
    return resultado;
  }

  function auditarPendenciasFlash_FIN134_SEM_GRAVAR() {
    var bloqueios = [];
    var avisos = [];
    var resultado = {
      success: false,
      executado: false,
      modo: "AUDITORIA_PENDENCIAS_FLASH_FIN134",
      spreadsheetId: "",
      totalPendencias: 0,
      totalAbertas: 0,
      totalResolvidas: 0,
      totalPorTipo: {},
      pendenciasAbertas: [],
      pendenciasDuplicadas: [],
      pendenciasSemReferencia: [],
      bloqueios: bloqueios,
      avisos: avisos
    };

    try {
      var ss = abrirDbFin_();
      resultado.spreadsheetId = ss.getId();
      var base = lerBasePendenciasFlashFin131_(ss, bloqueios);
      if (bloqueios.length) throw new Error("Auditoria de pendências bloqueada por abas obrigatórias ausentes.");
      var idsExtratos = {};
      base.extratos.forEach(function(extrato) {
        var id = obterIdExtratoFin125_(extrato);
        if (id) idsExtratos[id] = true;
      });
      var idsLancamentos = {};
      base.lancamentos.forEach(function(lancamento) {
        var id = String(lancamento.LANCAMENTO_ID || lancamento.ID || "").trim();
        if (id) idsLancamentos[id] = true;
      });

      var porChave = {};
      resultado.totalPendencias = base.pendencias.length;
      base.pendencias.forEach(function(pendencia) {
        var tipo = String(pendencia.TIPO_PENDENCIA || "").trim();
        var extratoId = String(pendencia.EXTRATO_ID || "").trim();
        var lancamentoId = String(pendencia.LANCAMENTO_ID || "").trim();
        var status = normalizarTextoFin1114_(pendencia.STATUS || "");
        resultado.totalPorTipo[tipo || "INDEFINIDO"] = (resultado.totalPorTipo[tipo || "INDEFINIDO"] || 0) + 1;
        if (status === "RESOLVIDA" || status === "RESOLVIDO" || status === "FECHADA") {
          resultado.totalResolvidas++;
        } else {
          resultado.totalAbertas++;
          if (resultado.pendenciasAbertas.length < 20) {
            resultado.pendenciasAbertas.push(pendencia);
          }
        }

        var chave = chavePendenciaFlashFin131_(tipo, extratoId, lancamentoId);
        if (!porChave[chave]) porChave[chave] = [];
        porChave[chave].push(pendencia.PENDENCIA_ID || pendencia.ID || "");
        if (tipo === "EXTRATO_SEM_PRESTACAO" && !extratoId) {
          resultado.pendenciasSemReferencia.push({ tipo: "EXTRATO_SEM_PRESTACAO_SEM_EXTRATO_ID", pendenciaId: pendencia.PENDENCIA_ID || "" });
        }
        if (tipo === "LANCAMENTO_SEM_EXTRATO" && !lancamentoId) {
          resultado.pendenciasSemReferencia.push({ tipo: "LANCAMENTO_SEM_EXTRATO_SEM_LANCAMENTO_ID", pendenciaId: pendencia.PENDENCIA_ID || "" });
        }
        if (extratoId && !idsExtratos[extratoId]) {
          resultado.pendenciasSemReferencia.push({ tipo: "EXTRATO_ID_INEXISTENTE", pendenciaId: pendencia.PENDENCIA_ID || "", extratoId: extratoId });
        }
        if (lancamentoId && !idsLancamentos[lancamentoId]) {
          resultado.pendenciasSemReferencia.push({ tipo: "LANCAMENTO_ID_INEXISTENTE", pendenciaId: pendencia.PENDENCIA_ID || "", lancamentoId: lancamentoId });
        }
      });
      Object.keys(porChave).forEach(function(chave) {
        if (porChave[chave].length > 1) {
          resultado.pendenciasDuplicadas.push({
            chave: chave,
            pendenciaIds: porChave[chave]
          });
        }
      });
      resultado.success = bloqueios.length === 0;
    } catch (e) {
      if (!bloqueios.length) bloqueios.push(e && e.message ? e.message : String(e));
      resultado.success = false;
    }

    if (typeof Logger !== "undefined" && Logger && Logger.log) {
      Logger.log(JSON.stringify(resultado, null, 2));
    }
    return resultado;
  }

  return {
    setupFinanceiroV2      : setupFinanceiroV2,
    obterSchemaFinanceiroV2: obterSchemaFinanceiroV2,
    diagnosticarSchemaLoteExtratoFlashV1: diagnosticarSchemaLoteExtratoFlashV1,
    aplicarPatchSchemaLoteExtratoFlashV1_MANUAL_AUTORIZADO: aplicarPatchSchemaLoteExtratoFlashV1_MANUAL_AUTORIZADO,
    auditarSchemaRealLoteExtratoFlashV1_SEM_GRAVAR: auditarSchemaRealLoteExtratoFlashV1_SEM_GRAVAR,
    simularImportacaoExtratoFlashV1_SEM_GRAVAR: simularImportacaoExtratoFlashV1_SEM_GRAVAR,
    prepararTmpImportExtratoFlashTeste_FIN1115: prepararTmpImportExtratoFlashTeste_FIN1115,
    importarExtratoFlashReal_FIN1117: importarExtratoFlashReal_FIN1117,
    auditarImportacaoExtratoFlash_FIN1119_SEM_GRAVAR: auditarImportacaoExtratoFlash_FIN1119_SEM_GRAVAR,
    diagnosticarBaseConciliacaoFlash_FIN120_SEM_GRAVAR: diagnosticarBaseConciliacaoFlash_FIN120_SEM_GRAVAR,
    previsualizarConciliacaoFlash_FIN121_SEM_GRAVAR: previsualizarConciliacaoFlash_FIN121_SEM_GRAVAR,
    prepararLancamentosTesteConciliacaoFlash_FIN123: prepararLancamentosTesteConciliacaoFlash_FIN123,
    executarPreparacaoLancamentosTesteConciliacaoFlash_FIN124_AUTORIZADA: executarPreparacaoLancamentosTesteConciliacaoFlash_FIN124_AUTORIZADA,
    conciliarExtratoFlashTeste_FIN125: conciliarExtratoFlashTeste_FIN125,
    auditarConciliacaoFlash_FIN126_SEM_GRAVAR: auditarConciliacaoFlash_FIN126_SEM_GRAVAR,
    previsualizarPendenciasFlash_FIN131_SEM_GRAVAR: previsualizarPendenciasFlash_FIN131_SEM_GRAVAR,
    gerarPendenciasFlash_FIN132: gerarPendenciasFlash_FIN132,
    auditarPendenciasFlash_FIN134_SEM_GRAVAR: auditarPendenciasFlash_FIN134_SEM_GRAVAR
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

function diagnosticarSchemaLoteExtratoFlashV1() {
  return SGO_FIN_SETUP.diagnosticarSchemaLoteExtratoFlashV1();
}

function aplicarPatchSchemaLoteExtratoFlashV1_MANUAL_AUTORIZADO(payload) {
  return SGO_FIN_SETUP.aplicarPatchSchemaLoteExtratoFlashV1_MANUAL_AUTORIZADO(payload);
}

// Funcao manual para FIN.11.12.
// Nao importa extrato, nao cria lote real e nao cria lancamento real.
// Apenas aplica schema/header quando executada manualmente no Apps Script editor.
function aplicarPatchSchemaLoteExtratoFlashV1_EXECUTAR_MANUALMENTE() {
  var resultado = aplicarPatchSchemaLoteExtratoFlashV1_MANUAL_AUTORIZADO({
    confirmacao: "APLICAR_PATCH_SCHEMA_LOTE_EXTRATO_FLASH_V1"
  });
  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

function auditarSchemaRealLoteExtratoFlashV1_SEM_GRAVAR() {
  return SGO_FIN_SETUP.auditarSchemaRealLoteExtratoFlashV1_SEM_GRAVAR();
}

function simularImportacaoExtratoFlashV1_SEM_GRAVAR() {
  return SGO_FIN_SETUP.simularImportacaoExtratoFlashV1_SEM_GRAVAR();
}

function prepararTmpImportExtratoFlashTeste_FIN1115() {
  return SGO_FIN_SETUP.prepararTmpImportExtratoFlashTeste_FIN1115();
}

function importarExtratoFlashReal_FIN1117(confirmacao) {
  return SGO_FIN_SETUP.importarExtratoFlashReal_FIN1117(confirmacao);
}

function testarBloqueioImportacaoExtratoFlashReal_FIN1117() {
  return importarExtratoFlashReal_FIN1117("");
}

function executarImportacaoExtratoFlashReal_FIN1118_AUTORIZADA_TESTE() {
  return importarExtratoFlashReal_FIN1117("IMPORTAR_EXTRATO_FLASH_REAL_FIN1117");
}

function auditarImportacaoExtratoFlash_FIN1119_SEM_GRAVAR() {
  return SGO_FIN_SETUP.auditarImportacaoExtratoFlash_FIN1119_SEM_GRAVAR();
}

function testarReimportacaoDuplicadaExtratoFlash_FIN1120() {
  return importarExtratoFlashReal_FIN1117("IMPORTAR_EXTRATO_FLASH_REAL_FIN1117");
}

function diagnosticarBaseConciliacaoFlash_FIN120_SEM_GRAVAR() {
  return SGO_FIN_SETUP.diagnosticarBaseConciliacaoFlash_FIN120_SEM_GRAVAR();
}

function previsualizarConciliacaoFlash_FIN121_SEM_GRAVAR() {
  return SGO_FIN_SETUP.previsualizarConciliacaoFlash_FIN121_SEM_GRAVAR();
}

function prepararLancamentosTesteConciliacaoFlash_FIN123(confirmacao) {
  return SGO_FIN_SETUP.prepararLancamentosTesteConciliacaoFlash_FIN123(confirmacao);
}

function testarBloqueioPrepararLancamentosTesteConciliacaoFlash_FIN123() {
  return prepararLancamentosTesteConciliacaoFlash_FIN123("");
}

function executarPreparacaoLancamentosTesteConciliacaoFlash_FIN124_AUTORIZADA() {
  return SGO_FIN_SETUP.executarPreparacaoLancamentosTesteConciliacaoFlash_FIN124_AUTORIZADA();
}

function conciliarExtratoFlashTeste_FIN125(confirmacao) {
  return SGO_FIN_SETUP.conciliarExtratoFlashTeste_FIN125(confirmacao);
}

function testarBloqueioConciliacaoExtratoFlash_FIN125() {
  return conciliarExtratoFlashTeste_FIN125("");
}

function auditarConciliacaoFlash_FIN126_SEM_GRAVAR() {
  return SGO_FIN_SETUP.auditarConciliacaoFlash_FIN126_SEM_GRAVAR();
}

function executarConciliacaoExtratoFlashTeste_FIN127_AUTORIZADA() {
  return conciliarExtratoFlashTeste_FIN125("CONCILIAR_EXTRATO_FLASH_TESTE_FIN125");
}

function previsualizarPendenciasFlash_FIN131_SEM_GRAVAR() {
  return SGO_FIN_SETUP.previsualizarPendenciasFlash_FIN131_SEM_GRAVAR();
}

function gerarPendenciasFlash_FIN132(confirmacao) {
  return SGO_FIN_SETUP.gerarPendenciasFlash_FIN132(confirmacao);
}

function testarBloqueioGerarPendenciasFlash_FIN132() {
  return gerarPendenciasFlash_FIN132("");
}

function executarGeracaoPendenciasFlash_FIN133_AUTORIZADA() {
  return gerarPendenciasFlash_FIN132("GERAR_PENDENCIAS_FLASH_FIN132");
}

function auditarPendenciasFlash_FIN134_SEM_GRAVAR() {
  return SGO_FIN_SETUP.auditarPendenciasFlash_FIN134_SEM_GRAVAR();
}
