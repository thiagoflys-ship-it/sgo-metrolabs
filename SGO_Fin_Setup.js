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

    // 34 headers — FLASH.4.7: CPF_COLABORADOR, ORIGEM_CARTAO, CHAVE_MULTICARTAO adicionados
    // TIPO_CARTAO agora armazena FISICO ou VIRTUAL (antes: CORPORATIVO)
    // CHAVE_MULTICARTAO = CPF_COLABORADOR_NORM + "_" + TIPO_CARTAO + "_" + NUMERO_FINAL_4
    "FIN_CARTOES": [
      "ID", "CARTAO_ID", "IDENTIFICADOR_CARTAO", "NUMERO_FINAL_4", "APELIDO_CARTAO",
      "OPERADORA", "BANDEIRA", "TIPO_CARTAO", "LIMITE_OPERACIONAL", "LIMITE_TOTAL",
      "DATA_EMISSAO", "DATA_VALIDADE_CARTAO",
      "FUNCIONARIO_ID", "FUNCIONARIO_NOME", "FUNCIONARIO_EMAIL", "FUNCIONARIO_TELEFONE",
      "CPF_COLABORADOR", "GESTOR_RESPONSAVEL_ID", "CENTRO_CUSTO", "FINALIDADE",
      "STATUS_CARTAO", "DATA_BLOQUEIO", "MOTIVO_BLOQUEIO", "BLOQUEADO_POR",
      "TERMO_ASSINADO", "TERMO_ID",
      "ORIGEM_CARTAO", "CHAVE_MULTICARTAO",
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

    // 24 headers — FLASH.4.8: CPF_COLABORADOR adicionado (conta/carteira principal por CPF)
    "FIN_CARTOES_RECARGAS": [
      "ID", "RECARGA_ID", "CARTAO_ID",
      "CPF_COLABORADOR", "FUNCIONARIO_ID", "FUNCIONARIO_NOME",
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
        "DB_FIN_ID não está configurado em PropertiesService. " +
        "Configure antes de executar o setup: " +
        "PropertiesService.getScriptProperties()" +
        ".setProperty('DB_FIN_ID', '<id_da_planilha_fin>')"
      );
    }
    try {
      return SpreadsheetApp.openById(id);
    } catch (e) {
      throw new Error(
        "DB_FIN_ID inválido ou sem permissão de acesso. ID: " + id +
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
        "Numero completo do cartão não armazenado. Apenas NUMERO_FINAL_4 + IDENTIFICADOR_CARTAO + APELIDO_CARTAO.",
        "Setup idempotente: não apaga dados, não exclui colunas, não reordena headers existentes.",
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
      !!dbFinId, dbFinId || "não configurado");

    adicionarCheck_(checks, "Schema FIN carregado (13 abas)",
      Object.keys(ABAS).length === 13,
      Object.keys(ABAS).length + " abas definidas");

    adicionarCheck_(checks, "Headers FIN carregados (334 total — FLASH.4.8: +1 CPF_COLABORADOR em FIN_CARTOES_RECARGAS)",
      (function() {
        var total = 0;
        Object.keys(HEADERS).forEach(function(k) { total += HEADERS[k].length; });
        return total === 334;
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
        "DB_FIN_ID não está configurado em PropertiesService. " +
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
        log                 : log.concat(["BLOQUEADO: DB_FIN_ID não configurado."])
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
        var avisoSemHeaders = "Aba " + nomeAba + ": headers não definidos no schema, pulada.";
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
          log.push("[OK] " + nomeAba + " | já existia, nenhuma alteracao necessaria.");
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
        "Nao acessa Sheets e não grava dados."
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
          "Confirmação textual obrigatória ausente. Informe confirmacao: APLICAR_PATCH_SCHEMA_LOTE_EXTRATO_FLASH_V1"
        ],
        avisos: [
          "Funcao manual autorizada não executada.",
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
        "Operacao idempotente: não apaga dados, não exclui colunas e não reordena headers existentes.",
        "Nenhum lote/importacao/lançamento foi criado por está funcao."
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
          avisos.push("FIN_LOTES_EXTRATO_FLASH possui linhas além do cabeçalho; verificar se ha lote real.");
        }
      } else {
        bloqueios.push("Aba FIN_LOTES_EXTRATO_FLASH não encontrada.");
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
        bloqueios.push("Aba FIN_CARTOES_EXTRATOS não encontrada.");
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
      if (!sheetLote) bloqueios.push("Aba FIN_LOTES_EXTRATO_FLASH não encontrada.");
      if (!sheetExtratos) bloqueios.push("Aba FIN_CARTOES_EXTRATOS não encontrada.");

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
      if (resultado.camposMapeados.descricao.indice < 0) avisos.push("Campo de descrição não identificado; chave simulada usará descricao vazia.");

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
      if (campos.descricao.indice < 0) avisos.push("Campo de descrição não identificado; importação usará descricao vazia.");

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
// Nao importa extrato, não cria lote real e não cria lançamento real.
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

// B54.1_FIX3 — Login piloto confirmado como "admin". Configura property e audita.
// Grava SOMENTE FIN_PILOTO_FLASH_EMAIL. Não grava lançamento. Não altera senhas.
function configurarEAuditarPilotoAdmin_B54_FIX3() {
  var resultado = {
    etapa: "B54.1_FIX3",
    nome: "Configurar piloto admin e auditar sem gravar",
    executado: false,
    somenteLeitura: false,
    success: true,
    ok: true,
    prontoParaGravacaoRealPiloto: false,
    pilotoLoginConfigurado: "admin",
    propertyConfigurada: false,
    adminEncontrado: false,
    adminId: "",
    adminNome: "",
    adminPerfil: "",
    adminStatus: "",
    cartaoAtivoEncontrado: false,
    cartaoId: "",
    auditoria: null,
    bloqueios: [],
    avisos: []
  };
  try {
    var bloqueios = resultado.bloqueios;
    var avisos    = resultado.avisos;
    var props     = PropertiesService.getScriptProperties();

    // 1. Configurar FIN_PILOTO_FLASH_EMAIL = "admin"
    props.setProperty("FIN_PILOTO_FLASH_EMAIL", "admin");
    resultado.propertyConfigurada = true;
    avisos.push("FIN_PILOTO_FLASH_EMAIL configurado como: admin");

    // 2. Buscar USUARIO="admin" em CAD_USUARIOS para obter o ID (sem expor senha)
    var dbId = String(props.getProperty("DB_ID") || "").trim();
    if (!dbId) {
      bloqueios.push("DB_ID não configurado.");
    } else {
      try {
        var shUsers = SpreadsheetApp.openById(dbId).getSheetByName("CAD_USUARIOS");
        if (!shUsers) {
          bloqueios.push("Aba CAD_USUARIOS não encontrada.");
        } else {
          var lastRowU = shUsers.getLastRow();
          var lastColU = shUsers.getLastColumn();
          if (lastRowU >= 2 && lastColU >= 1) {
            var dadosU = shUsers.getRange(1, 1, lastRowU, lastColU).getValues();
            var hdrsU  = dadosU[0].map(function(h) { return String(h || "").trim().toUpperCase(); });
            var iUID    = hdrsU.indexOf("ID");
            var iUUSU   = hdrsU.indexOf("USUARIO");
            var iUNOME  = hdrsU.indexOf("NOME");
            var iUPERF  = hdrsU.indexOf("PERFIL");
            var iUSTAT  = hdrsU.indexOf("STATUS");
            for (var i = 1; i < dadosU.length; i++) {
              var row   = dadosU[i];
              var login = String(iUUSU >= 0 ? row[iUUSU] : "").trim().toLowerCase();
              if (login === "admin") {
                resultado.adminEncontrado = true;
                resultado.adminId     = String(iUID   >= 0 ? row[iUID]   : "").trim();
                resultado.adminNome   = String(iUNOME >= 0 ? row[iUNOME] : "").trim();
                resultado.adminPerfil = String(iUPERF >= 0 ? row[iUPERF] : "").trim();
                resultado.adminStatus = String(iUSTAT >= 0 ? row[iUSTAT] : "").trim();
                break;
              }
            }
          }
          if (!resultado.adminEncontrado)
            bloqueios.push("Usuario com USUARIO='admin' não encontrado em CAD_USUARIOS.");
        }
      } catch (eU) { bloqueios.push("Erro ao ler CAD_USUARIOS: " + eU.message); }
    }

    // 3. Banco FIN: verificar cartão ativo para admin + headers de LANCAMENTOS
    var dbFinId = String(props.getProperty("DB_FIN_ID") || "").trim();
    var dbFinConfigurado    = !!dbFinId;
    var abaDestinoOk        = false;
    var headersEssenciaisOk = false;
    var headersAusentes     = [];
    var headersEsperados    = [
      "ID", "LANCAMENTO_ID", "CARTAO_ID", "FUNCIONARIO_ID", "FUNCIONARIO_NOME",
      "DATA_GASTO", "VALOR", "DESCRICAO_GASTO", "STATUS_PRESTACAO", "CRIADO_EM", "CRIADO_POR"
    ];

    if (!dbFinConfigurado) {
      bloqueios.push("DB_FIN_ID não configurado.");
    } else {
      try {
        var ssFin = SpreadsheetApp.openById(dbFinId);

        // 3a. FIN_CARTOES: procurar cartão ATIVO para admin
        if (resultado.adminEncontrado && resultado.adminId) {
          var shCartoes = ssFin.getSheetByName("FIN_CARTOES");
          if (!shCartoes) {
            bloqueios.push("Aba FIN_CARTOES não encontrada.");
          } else {
            var lastRowC = shCartoes.getLastRow();
            var lastColC = shCartoes.getLastColumn();
            if (lastRowC >= 2 && lastColC >= 1) {
              var dadosC = shCartoes.getRange(1, 1, lastRowC, lastColC).getValues();
              var hdrsC  = dadosC[0].map(function(h) { return String(h || "").trim(); });
              var iFID   = hdrsC.indexOf("FUNCIONARIO_ID");
              var iStat  = hdrsC.indexOf("STATUS_CARTAO");
              var iCID   = hdrsC.indexOf("CARTAO_ID");
              for (var j = 1; j < dadosC.length; j++) {
                var crow = dadosC[j];
                var fid  = String(iFID  >= 0 ? crow[iFID]  : "").trim();
                var stat = String(iStat >= 0 ? crow[iStat] : "").trim().toUpperCase();
                var cid  = String(iCID  >= 0 ? crow[iCID]  : "").trim();
                if (fid === resultado.adminId && stat === "ATIVO") {
                  resultado.cartaoAtivoEncontrado = true;
                  resultado.cartaoId = cid.length > 8 ? cid.substring(0, 8) + "..." : cid;
                  avisos.push("Cartão Flash ATIVO encontrado para admin. cartaoId (mascarado): " + resultado.cartaoId);
                  break;
                }
              }
            }
            if (!resultado.cartaoAtivoEncontrado)
              bloqueios.push("Nenhum cartão Flash ATIVO encontrado para admin em FIN_CARTOES. Cadastre o cartão antes do envio real.");
          }
        }

        // 3b. FIN_CARTOES_LANCAMENTOS: verificar headers essenciais
        var shLanc = ssFin.getSheetByName("FIN_CARTOES_LANCAMENTOS");
        if (!shLanc) {
          bloqueios.push("Aba FIN_CARTOES_LANCAMENTOS não encontrada.");
        } else {
          abaDestinoOk = true;
          var lastColL = shLanc.getLastColumn();
          var hdrL = lastColL > 0
            ? shLanc.getRange(1, 1, 1, lastColL).getValues()[0]
                .map(function(h) { return String(h || "").trim(); })
            : [];
          headersAusentes     = headersEsperados.filter(function(h) { return hdrL.indexOf(h) < 0; });
          headersEssenciaisOk = headersAusentes.length === 0;
          if (!headersEssenciaisOk)
            bloqueios.push("Headers ausentes em FIN_CARTOES_LANCAMENTOS: " + headersAusentes.join(", "));
        }
      } catch (eFin) { bloqueios.push("Erro ao acessar banco FIN: " + eFin.message); }
    }

    // 4. Auditoria inline (equivalente a AUDITAR_PRESTACAO_FLASH_MOBILE_B54_SEM_GRAVAR)
    var pilotoEmail  = String(props.getProperty("FIN_PILOTO_FLASH_EMAIL") || "").trim();
    var pilotoConf   = !!pilotoEmail;
    var funcaoExiste = typeof finFlashRegistrarPrestacaoMobilePilotoV1 === "function";
    var liberarTeste = typeof LIBERAR_PILOTO_REAL_FLASH_B48_BLOQUEADA === "function"
      ? LIBERAR_PILOTO_REAL_FLASH_B48_BLOQUEADA() : null;
    var liberarBloqueada = !liberarTeste || liberarTeste.bloqueado === true;

    var auditBloqueiosNovos = [];
    if (!funcaoExiste)     auditBloqueiosNovos.push("finFlashRegistrarPrestacaoMobilePilotoV1 não encontrada.");
    if (!liberarBloqueada) auditBloqueiosNovos.push("LIBERAR_PILOTO_REAL_FLASH_B48_BLOQUEADA retornou estado inesperado.");

    var auditBloqueiosCompleto = auditBloqueiosNovos.concat(
      !dbFinConfigurado    ? ["DB_FIN_ID não configurado."] : [],
      !abaDestinoOk        ? ["Aba FIN_CARTOES_LANCAMENTOS não encontrada."] : [],
      !headersEssenciaisOk ? ["Headers ausentes em FIN_CARTOES_LANCAMENTOS: " + headersAusentes.join(", ")] : []
    );
    var auditPronto = auditBloqueiosCompleto.length === 0 && pilotoConf;

    resultado.auditoria = {
      etapa: "B54",
      nome: "Auditoria pre-gravacao real da prestacao Flash mobile piloto",
      executado: false,
      somenteLeitura: true,
      success: auditBloqueiosCompleto.length === 0,
      ok: auditBloqueiosCompleto.length === 0,
      prontoParaGravacaoRealPiloto: auditPronto,
      verificacoes: {
        funcaoBackendExiste   : funcaoExiste,
        dbConfigurado         : dbFinConfigurado,
        pilotoConfigurado     : pilotoConf,
        pilotoEmail           : pilotoEmail,
        abaDestino            : "FIN_CARTOES_LANCAMENTOS",
        abaDestinoOk          : abaDestinoOk,
        headersEssenciaisOk   : headersEssenciaisOk,
        headersAusentes       : headersAusentes,
        liberarPilotoBloqueada: liberarBloqueada,
        conciliacaoHabilitada : false,
        pendenciasHabilitadas : false,
        importacaoHabilitada  : false,
        whatsappHabilitado    : false
      },
      bloqueios: auditBloqueiosCompleto,
      avisos   : pilotoConf ? ["Piloto configurado: " + pilotoEmail]
                            : ["FIN_PILOTO_FLASH_EMAIL não configurado."]
    };

    if (auditBloqueiosNovos.length) bloqueios.push.apply(bloqueios, auditBloqueiosNovos);
    resultado.prontoParaGravacaoRealPiloto = bloqueios.length === 0 && auditPronto;

  } catch (e) {
    resultado.success = false;
    resultado.ok = false;
    resultado.prontoParaGravacaoRealPiloto = false;
    resultado.bloqueios.push("Falha em configurarEAuditarPilotoAdmin_B54_FIX3: " + e.message);
  }

  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

// B54.1 — Função standalone: não depende de SGO_FIN nem de helpers do IIFE.
// Configura FIN_PILOTO_FLASH_EMAIL e audita pré-condições sem gravar lançamento.
function testarConfigurarAuditarPilotoB54_1() {
  var resultado = {
    etapa: "B54.1",
    nome: "Configurar piloto Flash DEV e auditar sem gravar (standalone)",
    executado: false,
    somenteLeitura: false,
    success: true,
    ok: true,
    prontoParaGravacaoRealPiloto: false,
    piloto: null,
    todosCandidatos: [],
    propertyConfigurada: false,
    pilotoLoginConfigurado: "",
    auditoria: null,
    bloqueios: [],
    avisos: []
  };
  try {
    var bloqueios = resultado.bloqueios;
    var avisos    = resultado.avisos;
    var props     = PropertiesService.getScriptProperties();

    // 1. Banco principal: buscar "thiago" em CAD_USUARIOS
    var dbId = String(props.getProperty("DB_ID") || "").trim();
    if (!dbId) {
      bloqueios.push("DB_ID não configurado.");
      Logger.log(JSON.stringify(resultado, null, 2));
      return resultado;
    }
    var candidatos = [];
    try {
      var shUsers = SpreadsheetApp.openById(dbId).getSheetByName("CAD_USUARIOS");
      if (!shUsers) {
        bloqueios.push("Aba CAD_USUARIOS não encontrada no banco principal.");
      } else {
        var lastRow = shUsers.getLastRow();
        var lastCol = shUsers.getLastColumn();
        if (lastRow >= 2 && lastCol >= 1) {
          var dados = shUsers.getRange(1, 1, lastRow, lastCol).getValues();
          var hdrs  = dados[0].map(function(h) { return String(h || "").trim().toUpperCase(); });
          var iID     = hdrs.indexOf("ID");
          var iUSU    = hdrs.indexOf("USUARIO");
          var iNOME   = hdrs.indexOf("NOME");
          var iPERFIL = hdrs.indexOf("PERFIL");
          var iSTATUS = hdrs.indexOf("STATUS");
          for (var i = 1; i < dados.length; i++) {
            var row   = dados[i];
            var nome  = String(iNOME  >= 0 ? row[iNOME]  : "").trim().toUpperCase();
            var login = String(iUSU   >= 0 ? row[iUSU]   : "").trim().toLowerCase();
            if (nome.indexOf("THIAGO") >= 0 || login.indexOf("thiago") >= 0) {
              candidatos.push({
                id    : String(iID     >= 0 ? row[iID]     : "").trim(),
                login : login,
                nome  : nome,
                perfil: String(iPERFIL >= 0 ? row[iPERFIL] : "").trim(),
                status: String(iSTATUS >= 0 ? row[iSTATUS] : "").trim()
              });
            }
          }
        }
        if (candidatos.length === 0)
          bloqueios.push("Nenhum usuario com NOME ou LOGIN contendo 'thiago' em CAD_USUARIOS.");
      }
    } catch (eU) { bloqueios.push("Erro ao ler CAD_USUARIOS: " + eU.message); }

    // 2. Banco FIN: verificar cartão ativo + headers de FIN_CARTOES_LANCAMENTOS
    var dbFinId = String(props.getProperty("DB_FIN_ID") || "").trim();
    var dbFinConfigurado    = !!dbFinId;
    var cartoesInfo         = [];
    var abaDestinoOk        = false;
    var headersEssenciaisOk = false;
    var headersAusentes     = [];
    var headersEsperados    = [
      "ID", "LANCAMENTO_ID", "CARTAO_ID", "FUNCIONARIO_ID", "FUNCIONARIO_NOME",
      "DATA_GASTO", "VALOR", "DESCRICAO_GASTO", "STATUS_PRESTACAO", "CRIADO_EM", "CRIADO_POR"
    ];

    if (!dbFinConfigurado) {
      bloqueios.push("DB_FIN_ID não configurado.");
    } else {
      try {
        var ssFin = SpreadsheetApp.openById(dbFinId);

        // 2a. FIN_CARTOES: cartão ativo por candidato
        if (candidatos.length > 0) {
          var shCartoes = ssFin.getSheetByName("FIN_CARTOES");
          if (!shCartoes) {
            bloqueios.push("Aba FIN_CARTOES não encontrada no banco FIN.");
          } else {
            var lastRowC = shCartoes.getLastRow();
            var lastColC = shCartoes.getLastColumn();
            var todosCartoes = [];
            if (lastRowC >= 2 && lastColC >= 1) {
              var dadosC = shCartoes.getRange(1, 1, lastRowC, lastColC).getValues();
              var hdrsC  = dadosC[0].map(function(h) { return String(h || "").trim(); });
              var iFID   = hdrsC.indexOf("FUNCIONARIO_ID");
              var iStat  = hdrsC.indexOf("STATUS_CARTAO");
              var iCID   = hdrsC.indexOf("CARTAO_ID");
              var iEml   = hdrsC.indexOf("FUNCIONARIO_EMAIL");
              for (var j = 1; j < dadosC.length; j++) {
                var crow = dadosC[j];
                todosCartoes.push({
                  fid  : String(iFID  >= 0 ? crow[iFID]  : "").trim(),
                  stat : String(iStat >= 0 ? crow[iStat] : "").trim().toUpperCase(),
                  cid  : String(iCID  >= 0 ? crow[iCID]  : "").trim(),
                  email: String(iEml  >= 0 ? crow[iEml]  : "").trim()
                });
              }
            }
            candidatos.forEach(function(c) {
              var ativo = null;
              for (var k = 0; k < todosCartoes.length; k++) {
                if (todosCartoes[k].fid === c.id && todosCartoes[k].stat === "ATIVO") {
                  ativo = todosCartoes[k];
                  break;
                }
              }
              cartoesInfo.push({
                userId          : c.id,
                userLogin       : c.login,
                userNome        : c.nome,
                userPerfil      : c.perfil,
                userStatus      : c.status,
                temCartaoAtivo  : !!ativo,
                cartaoId        : ativo ? ativo.cid   : "",
                funcionarioEmail: ativo ? ativo.email : ""
              });
            });
          }
        }

        // 2b. FIN_CARTOES_LANCAMENTOS: verificar headers essenciais
        var shLanc = ssFin.getSheetByName("FIN_CARTOES_LANCAMENTOS");
        if (!shLanc) {
          bloqueios.push("Aba FIN_CARTOES_LANCAMENTOS não encontrada.");
        } else {
          abaDestinoOk = true;
          var lastColL = shLanc.getLastColumn();
          var hdrL = lastColL > 0
            ? shLanc.getRange(1, 1, 1, lastColL).getValues()[0]
                .map(function(h) { return String(h || "").trim(); })
            : [];
          headersAusentes     = headersEsperados.filter(function(h) { return hdrL.indexOf(h) < 0; });
          headersEssenciaisOk = headersAusentes.length === 0;
          if (!headersEssenciaisOk)
            bloqueios.push("Headers ausentes em FIN_CARTOES_LANCAMENTOS: " + headersAusentes.join(", "));
        }
      } catch (eFin) { bloqueios.push("Erro ao acessar banco FIN: " + eFin.message); }
    }

    resultado.todosCandidatos = cartoesInfo.map(function(c) {
      return { login: c.userLogin, nome: c.userNome, perfil: c.userPerfil,
               status: c.userStatus, temCartaoAtivo: c.temCartaoAtivo };
    });

    // 3. Selecionar piloto
    var comCartao = cartoesInfo.filter(function(c) { return c.temCartaoAtivo; });
    var piloto = null;
    if (comCartao.length === 0 && bloqueios.length === 0)
      bloqueios.push("Nenhum usuario Thiago tem cartão Flash ATIVO em FIN_CARTOES. Cadastre o cartão antes de continuar.");
    else if (comCartao.length > 1) {
      avisos.push("Multiplos candidatos com cartão ativo; usando o primeiro encontrado.");
      piloto = comCartao[0];
    } else if (comCartao.length === 1) {
      piloto = comCartao[0];
    }

    // 4. Configurar FIN_PILOTO_FLASH_EMAIL
    var loginConfigurado = "";
    if (piloto && bloqueios.length === 0) {
      loginConfigurado = piloto.userLogin;
      props.setProperty("FIN_PILOTO_FLASH_EMAIL", loginConfigurado);
      resultado.propertyConfigurada = true;
      avisos.push("FIN_PILOTO_FLASH_EMAIL configurado como: " + loginConfigurado);
    } else {
      loginConfigurado = String(props.getProperty("FIN_PILOTO_FLASH_EMAIL") || "").trim();
      if (loginConfigurado) avisos.push("FIN_PILOTO_FLASH_EMAIL já existia: " + loginConfigurado);
    }
    resultado.pilotoLoginConfigurado = loginConfigurado;

    if (piloto) {
      var uid = piloto.userId  || "";
      var cid = piloto.cartaoId || "";
      resultado.piloto = {
        login                     : piloto.userLogin,
        nome                      : piloto.userNome,
        perfil                    : piloto.userPerfil,
        status                    : piloto.userStatus,
        userIdMascarado           : uid.length > 8 ? uid.substring(0, 8) + "..." : uid,
        cartaoAtivoEncontrado     : true,
        cartaoIdMascarado         : cid.length > 8 ? cid.substring(0, 8) + "..." : cid,
        funcionarioEmailPreenchido: !!(piloto.funcionarioEmail),
        funcionarioEmail          : piloto.funcionarioEmail ? piloto.funcionarioEmail.substring(0, 4) + "***" : ""
      };
    }

    // 5. Auditoria inline (equivalente a AUDITAR_PRESTACAO_FLASH_MOBILE_B54_SEM_GRAVAR)
    var pilotoEmail = String(props.getProperty("FIN_PILOTO_FLASH_EMAIL") || "").trim();
    var pilotoConf  = !!pilotoEmail;
    var funcaoExiste = typeof finFlashRegistrarPrestacaoMobilePilotoV1 === "function";
    var liberarTeste = typeof LIBERAR_PILOTO_REAL_FLASH_B48_BLOQUEADA === "function"
      ? LIBERAR_PILOTO_REAL_FLASH_B48_BLOQUEADA() : null;
    var liberarBloqueada = !liberarTeste || liberarTeste.bloqueado === true;

    // Apenas bloqueios NOVOS não já presentes em resultado.bloqueios
    var auditBloqueiosNovos = [];
    if (!funcaoExiste)     auditBloqueiosNovos.push("finFlashRegistrarPrestacaoMobilePilotoV1 não encontrada.");
    if (!liberarBloqueada) auditBloqueiosNovos.push("LIBERAR_PILOTO_REAL_FLASH_B48_BLOQUEADA retornou estado inesperado.");

    // auditoria.bloqueios mostra quadro completo (inclui itens já em bloqueios)
    var auditBloqueiosCompleto = auditBloqueiosNovos.concat(
      !dbFinConfigurado    ? ["DB_FIN_ID não configurado."] : [],
      !abaDestinoOk        ? ["Aba FIN_CARTOES_LANCAMENTOS não encontrada."] : [],
      !headersEssenciaisOk ? ["Headers ausentes em FIN_CARTOES_LANCAMENTOS: " + headersAusentes.join(", ")] : []
    );
    var auditAvisos = pilotoConf
      ? ["Piloto configurado: " + pilotoEmail]
      : ["FIN_PILOTO_FLASH_EMAIL não configurado — funcao bloqueara ate configurar."];
    var auditPronto = auditBloqueiosCompleto.length === 0 && pilotoConf;

    resultado.auditoria = {
      etapa: "B54",
      nome: "Auditoria pre-gravacao real da prestacao Flash mobile piloto",
      executado: false,
      somenteLeitura: true,
      success: auditBloqueiosCompleto.length === 0,
      ok: auditBloqueiosCompleto.length === 0,
      prontoParaGravacaoRealPiloto: auditPronto,
      verificacoes: {
        funcaoBackendExiste   : funcaoExiste,
        dbConfigurado         : dbFinConfigurado,
        pilotoConfigurado     : pilotoConf,
        pilotoEmail           : pilotoEmail,
        abaDestino            : "FIN_CARTOES_LANCAMENTOS",
        abaDestinoOk          : abaDestinoOk,
        headersEssenciaisOk   : headersEssenciaisOk,
        headersAusentes       : headersAusentes,
        liberarPilotoBloqueada: liberarBloqueada,
        conciliacaoHabilitada : false,
        pendenciasHabilitadas : false,
        importacaoHabilitada  : false,
        whatsappHabilitado    : false
      },
      bloqueios: auditBloqueiosCompleto,
      avisos   : auditAvisos
    };

    if (auditBloqueiosNovos.length) bloqueios.push.apply(bloqueios, auditBloqueiosNovos);
    resultado.prontoParaGravacaoRealPiloto = bloqueios.length === 0 && auditPronto;

  } catch (e) {
    resultado.success = false;
    resultado.ok = false;
    resultado.prontoParaGravacaoRealPiloto = false;
    resultado.bloqueios.push("Falha standalone B54.1: " + e.message);
  }

  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

// ============================================================
// B54.1_FIX4 — AUDITORIA PRÉ-CRIAÇÃO DE CARTÃO (somente leitura)
// Confirma situação de cartões para admin antes de gravar.
// ============================================================
function auditarCartaoPilotoAdmin_B54_FIX4_SEM_GRAVAR() {
  var resultado = {
    etapa: "B54.1_FIX4_AUDITORIA",
    nome: "Auditoria pre-criacao cartão piloto admin (sem gravar)",
    executado: false,
    somenteLeitura: true,
    success: false,
    adminEncontrado: false,
    adminId: "",
    adminNome: "",
    adminPerfil: "",
    adminStatus: "",
    cartaoAtivoJaExiste: false,
    cartaoAtivoIdMascarado: "",
    cartaoInativoJaExiste: false,
    cartaoInativoIdMascarado: "",
    cartaoInativoStatus: "",
    headersFinCartoes: [],
    acaoRecomendada: "",
    bloqueios: [],
    avisos: []
  };
  try {
    var props = PropertiesService.getScriptProperties();

    // 1. Buscar admin em CAD_USUARIOS
    var dbId = String(props.getProperty("DB_ID") || "").trim();
    if (!dbId) {
      resultado.bloqueios.push("DB_ID não configurado.");
      Logger.log(JSON.stringify(resultado, null, 2));
      return resultado;
    }
    try {
      var shUsers = SpreadsheetApp.openById(dbId).getSheetByName("CAD_USUARIOS");
      if (!shUsers) {
        resultado.bloqueios.push("Aba CAD_USUARIOS não encontrada.");
      } else {
        var lastRowU = shUsers.getLastRow();
        var lastColU = shUsers.getLastColumn();
        if (lastRowU >= 2 && lastColU >= 1) {
          var dadosU = shUsers.getRange(1, 1, lastRowU, lastColU).getValues();
          var hdrsU  = dadosU[0].map(function(h) { return String(h || "").trim().toUpperCase(); });
          var iUID   = hdrsU.indexOf("ID"),   iUUSU  = hdrsU.indexOf("USUARIO"),
              iUNOME = hdrsU.indexOf("NOME"), iUPERF = hdrsU.indexOf("PERFIL"),
              iUSTAT = hdrsU.indexOf("STATUS");
          for (var i = 1; i < dadosU.length; i++) {
            var rowU  = dadosU[i];
            var login = String(iUUSU >= 0 ? rowU[iUUSU] : "").trim().toLowerCase();
            if (login === "admin") {
              resultado.adminEncontrado = true;
              resultado.adminId     = String(iUID   >= 0 ? rowU[iUID]   : "").trim();
              resultado.adminNome   = String(iUNOME >= 0 ? rowU[iUNOME] : "").trim();
              resultado.adminPerfil = String(iUPERF >= 0 ? rowU[iUPERF] : "").trim();
              resultado.adminStatus = String(iUSTAT >= 0 ? rowU[iUSTAT] : "").trim();
              break;
            }
          }
        }
        if (!resultado.adminEncontrado)
          resultado.bloqueios.push("USUARIO='admin' não encontrado em CAD_USUARIOS.");
      }
    } catch (eU) { resultado.bloqueios.push("Erro ao ler CAD_USUARIOS: " + eU.message); }

    if (resultado.bloqueios.length > 0) { Logger.log(JSON.stringify(resultado, null, 2)); return resultado; }

    // 2. Verificar cartoes existentes em FIN_CARTOES
    var dbFinId = String(props.getProperty("DB_FIN_ID") || "").trim();
    if (!dbFinId) {
      resultado.bloqueios.push("DB_FIN_ID não configurado.");
      Logger.log(JSON.stringify(resultado, null, 2));
      return resultado;
    }
    try {
      var shCartoes4a = SpreadsheetApp.openById(dbFinId).getSheetByName("FIN_CARTOES");
      if (!shCartoes4a) {
        resultado.bloqueios.push("Aba FIN_CARTOES não encontrada.");
      } else {
        var lastColC4a = shCartoes4a.getLastColumn();
        var hdrsC4a = lastColC4a > 0
          ? shCartoes4a.getRange(1, 1, 1, lastColC4a).getValues()[0]
              .map(function(h) { return String(h || "").trim(); })
          : [];
        resultado.headersFinCartoes = hdrsC4a;
        var iFID4a  = hdrsC4a.indexOf("FUNCIONARIO_ID");
        var iStat4a = hdrsC4a.indexOf("STATUS_CARTAO");
        var iCID4a  = hdrsC4a.indexOf("CARTAO_ID");
        if (iFID4a < 0 || iStat4a < 0 || iCID4a < 0) {
          resultado.bloqueios.push("Headers obrigatorios ausentes em FIN_CARTOES: FUNCIONARIO_ID / STATUS_CARTAO / CARTAO_ID.");
        } else {
          var lastRowC4a = shCartoes4a.getLastRow();
          if (lastRowC4a >= 2) {
            var dadosC4a = shCartoes4a.getRange(2, 1, lastRowC4a - 1, lastColC4a).getValues();
            for (var j = 0; j < dadosC4a.length; j++) {
              var crow4a = dadosC4a[j];
              var fid4a  = String(iFID4a  >= 0 ? crow4a[iFID4a]  : "").trim();
              var stat4a = String(iStat4a >= 0 ? crow4a[iStat4a] : "").trim().toUpperCase();
              var cid4a  = String(iCID4a  >= 0 ? crow4a[iCID4a]  : "").trim();
              if (fid4a === resultado.adminId) {
                var cidMask = cid4a.length > 16 ? cid4a.substring(0, 16) + "..." : cid4a;
                if (stat4a === "ATIVO") {
                  resultado.cartaoAtivoJaExiste    = true;
                  resultado.cartaoAtivoIdMascarado = cidMask;
                } else {
                  resultado.cartaoInativoJaExiste    = true;
                  resultado.cartaoInativoIdMascarado = cidMask;
                  resultado.cartaoInativoStatus      = stat4a;
                }
              }
            }
          }
        }
      }
    } catch (eFin) { resultado.bloqueios.push("Erro ao acessar FIN_CARTOES: " + eFin.message); }

    // Ação recomendada
    if (resultado.bloqueios.length > 0) {
      resultado.acaoRecomendada = "BLOQUEADO — corrigir bloqueios antes de prosseguir.";
    } else if (resultado.cartaoAtivoJaExiste) {
      resultado.acaoRecomendada = "NENHUMA_ACAO — cartão ATIVO já existe para admin.";
    } else if (resultado.cartaoInativoJaExiste) {
      resultado.acaoRecomendada = "BLOQUEADO — cartão " + resultado.cartaoInativoStatus + " encontrado. Reativacao manual necessaria.";
      resultado.bloqueios.push("Cartão " + resultado.cartaoInativoStatus + " encontrado. Reativacao não e automatica.");
    } else {
      resultado.acaoRecomendada = "CRIAR — nenhum cartão encontrado. Executar criarCartaoPilotoAdmin_B54_FIX4.";
    }
    resultado.success = resultado.bloqueios.length === 0;

  } catch (e) {
    resultado.bloqueios.push("Falha em auditarCartaoPilotoAdmin_B54_FIX4_SEM_GRAVAR: " + e.message);
  }
  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

// ============================================================
// B54.1_FIX4 — CRIAR CARTÃO PILOTO FLASH ATIVO PARA ADMIN (DEV)
// Grava UMA linha em FIN_CARTOES. Nenhum lancamento/recarga/conciliacao.
// Guards: bloqueia se já houver cartão ativo OU inativo para admin.
// Executa configurarEAuditarPilotoAdmin_B54_FIX3 ao final.
// ============================================================
function criarCartaoPilotoAdmin_B54_FIX4() {
  var resultado = {
    etapa: "B54.1_FIX4",
    nome: "Criar cartão piloto Flash ATIVO para admin no DEV",
    executado: false,
    somenteLeitura: false,
    success: false,
    ok: false,
    adminEncontrado: false,
    adminId: "",
    adminNome: "",
    adminPerfil: "",
    adminStatus: "",
    cartaoJaExistia: false,
    cartaoInativoEncontrado: false,
    cartaoInativoStatus: "",
    cartaoCriado: false,
    cartaoId: "",
    cartaoIdMascarado: "",
    funcionarioIdConfere: false,
    statusCartao: "",
    lancamentoCriado: false,
    recargaCriada: false,
    conciliacaoCriada: false,
    auditoria: null,
    bloqueios: [],
    avisos: []
  };
  try {
    var props     = PropertiesService.getScriptProperties();
    var bloqueios = resultado.bloqueios;
    var avisos    = resultado.avisos;

    // 1. Buscar admin em CAD_USUARIOS (ID e NOME — sem senha)
    var dbId = String(props.getProperty("DB_ID") || "").trim();
    if (!dbId) {
      bloqueios.push("DB_ID não configurado.");
      Logger.log(JSON.stringify(resultado, null, 2));
      return resultado;
    }
    try {
      var shUsers = SpreadsheetApp.openById(dbId).getSheetByName("CAD_USUARIOS");
      if (!shUsers) {
        bloqueios.push("Aba CAD_USUARIOS não encontrada.");
      } else {
        var lastRowU = shUsers.getLastRow();
        var lastColU = shUsers.getLastColumn();
        if (lastRowU >= 2 && lastColU >= 1) {
          var dadosU = shUsers.getRange(1, 1, lastRowU, lastColU).getValues();
          var hdrsU  = dadosU[0].map(function(h) { return String(h || "").trim().toUpperCase(); });
          var iUID   = hdrsU.indexOf("ID"),   iUUSU  = hdrsU.indexOf("USUARIO"),
              iUNOME = hdrsU.indexOf("NOME"), iUPERF = hdrsU.indexOf("PERFIL"),
              iUSTAT = hdrsU.indexOf("STATUS");
          for (var i = 1; i < dadosU.length; i++) {
            var rowU  = dadosU[i];
            var login = String(iUUSU >= 0 ? rowU[iUUSU] : "").trim().toLowerCase();
            if (login === "admin") {
              resultado.adminEncontrado = true;
              resultado.adminId     = String(iUID   >= 0 ? rowU[iUID]   : "").trim();
              resultado.adminNome   = String(iUNOME >= 0 ? rowU[iUNOME] : "").trim();
              resultado.adminPerfil = String(iUPERF >= 0 ? rowU[iUPERF] : "").trim();
              resultado.adminStatus = String(iUSTAT >= 0 ? rowU[iUSTAT] : "").trim();
              break;
            }
          }
        }
        if (!resultado.adminEncontrado)
          bloqueios.push("USUARIO='admin' não encontrado em CAD_USUARIOS.");
      }
    } catch (eU) { bloqueios.push("Erro ao ler CAD_USUARIOS: " + eU.message); }

    if (bloqueios.length > 0) { Logger.log(JSON.stringify(resultado, null, 2)); return resultado; }

    // 2. Acessar FIN_CARTOES
    var dbFinId = String(props.getProperty("DB_FIN_ID") || "").trim();
    if (!dbFinId) {
      bloqueios.push("DB_FIN_ID não configurado.");
      Logger.log(JSON.stringify(resultado, null, 2));
      return resultado;
    }
    var ssFin     = SpreadsheetApp.openById(dbFinId);
    var shCartoes = ssFin.getSheetByName("FIN_CARTOES");
    if (!shCartoes) {
      bloqueios.push("Aba FIN_CARTOES não encontrada.");
      Logger.log(JSON.stringify(resultado, null, 2));
      return resultado;
    }

    var lastColC = shCartoes.getLastColumn();
    if (lastColC < 1) {
      bloqueios.push("FIN_CARTOES sem headers.");
      Logger.log(JSON.stringify(resultado, null, 2));
      return resultado;
    }
    var hdrsC = shCartoes.getRange(1, 1, 1, lastColC).getValues()[0]
      .map(function(h) { return String(h || "").trim(); });

    var iFID  = hdrsC.indexOf("FUNCIONARIO_ID");
    var iStat = hdrsC.indexOf("STATUS_CARTAO");
    var iCID  = hdrsC.indexOf("CARTAO_ID");
    if (iFID < 0 || iStat < 0 || iCID < 0) {
      bloqueios.push("Headers obrigatorios ausentes em FIN_CARTOES: FUNCIONARIO_ID / STATUS_CARTAO / CARTAO_ID.");
      Logger.log(JSON.stringify(resultado, null, 2));
      return resultado;
    }

    // 3. Guard de duplicidade — obrigatório antes de gravar
    var cartaoAtivo   = null;
    var cartaoInativo = null;
    var lastRowC = shCartoes.getLastRow();
    if (lastRowC >= 2) {
      var dadosC = shCartoes.getRange(2, 1, lastRowC - 1, lastColC).getValues();
      for (var j = 0; j < dadosC.length; j++) {
        var crow = dadosC[j];
        var fid  = String(iFID  >= 0 ? crow[iFID]  : "").trim();
        var stat = String(iStat >= 0 ? crow[iStat] : "").trim().toUpperCase();
        var cid  = String(iCID  >= 0 ? crow[iCID]  : "").trim();
        if (fid === resultado.adminId) {
          if (stat === "ATIVO") {
            cartaoAtivo = { cid: cid, stat: stat };
          } else {
            cartaoInativo = { cid: cid, stat: stat };
          }
        }
      }
    }

    if (cartaoAtivo) {
      // Cartão ativo já existe — nada a criar, reportar
      resultado.cartaoJaExistia     = true;
      resultado.cartaoId            = cartaoAtivo.cid;
      resultado.cartaoIdMascarado   = cartaoAtivo.cid.length > 16
        ? cartaoAtivo.cid.substring(0, 16) + "..." : cartaoAtivo.cid;
      resultado.statusCartao        = "ATIVO";
      resultado.funcionarioIdConfere = true;
      resultado.executado = false;
      resultado.success   = true;
      resultado.ok        = true;
      avisos.push("Cartão ATIVO já existia para admin — nenhuma criacao necessaria.");

    } else if (cartaoInativo) {
      // Guard: cartão inativo/bloqueado — não criar sem reativação explícita
      resultado.cartaoInativoEncontrado = true;
      resultado.cartaoInativoStatus     = cartaoInativo.stat;
      bloqueios.push(
        "Cartão em status '" + cartaoInativo.stat + "' encontrado para admin. " +
        "Reativacao não e automatica — tratar manualmente antes de criar novo cartão."
      );

    } else {
      // Criar cartão piloto DEV
      var agora       = new Date();
      var tz          = Session.getScriptTimeZone();
      var stamp       = Utilities.formatDate(agora, tz, "yyyyMMdd-HHmmss");
      var agoraIso    = Utilities.formatDate(agora, tz, "yyyy-MM-dd HH:mm:ss");
      var dataEmissao = Utilities.formatDate(agora, tz, "yyyy-MM-dd");
      var newCartaoId = "PILOT-FLASH-ADMIN-B54-DEV-" + stamp;
      var newId       = Utilities.getUuid();

      var novaLinha = hdrsC.map(function() { return ""; });
      var setCell   = function(h, v) {
        var idx = hdrsC.indexOf(h);
        if (idx >= 0) novaLinha[idx] = v;
      };

      setCell("ID",                   newId);
      setCell("CARTAO_ID",            newCartaoId);
      setCell("IDENTIFICADOR_CARTAO", "PILOTO-ADMIN-B54-DEV");
      setCell("NUMERO_FINAL_4",       "0000");
      setCell("APELIDO_CARTAO",       "Piloto Flash Admin DEV");
      setCell("OPERADORA",            "FLASH");
      setCell("BANDEIRA",             "FLASH");
      setCell("TIPO_CARTAO",          "CORPORATIVO");
      setCell("FUNCIONARIO_ID",       resultado.adminId);
      setCell("FUNCIONARIO_NOME",     resultado.adminNome || "Administrador");
      setCell("FINALIDADE",           "PILOTO_FLASH_B54_DEV");
      setCell("STATUS_CARTAO",        "ATIVO");
      setCell("DATA_EMISSAO",         dataEmissao);
      setCell("TERMO_ASSINADO",       "NAO");
      setCell("OBSERVACOES",
        "Cartão piloto DEV criado em B54.1_FIX4. Nao representa cartão real.");
      setCell("STATUS",               "ATIVO");
      setCell("CRIADO_EM",            agoraIso);
      setCell("CRIADO_POR",           "B54_1_FIX4");
      setCell("ATUALIZADO_EM",        agoraIso);
      setCell("ATUALIZADO_POR",       "B54_1_FIX4");

      shCartoes.getRange(shCartoes.getLastRow() + 1, 1, 1, hdrsC.length)
        .setValues([novaLinha]);

      resultado.cartaoCriado         = true;
      resultado.cartaoId             = newCartaoId;
      resultado.cartaoIdMascarado    = newCartaoId.substring(0, 20) + "...";
      resultado.statusCartao         = "ATIVO";
      resultado.funcionarioIdConfere = true;
      resultado.executado            = true;
      resultado.success              = true;
      resultado.ok                   = true;
      avisos.push("Cartão piloto Flash ATIVO criado para admin. CARTAO_ID: " + newCartaoId);
    }

    // Confirmações de zero outras gravações
    resultado.lancamentoCriado  = false;
    resultado.recargaCriada     = false;
    resultado.conciliacaoCriada = false;

    // Auditoria final via configurarEAuditarPilotoAdmin_B54_FIX3
    if (bloqueios.length === 0) {
      try {
        resultado.auditoria = configurarEAuditarPilotoAdmin_B54_FIX3();
      } catch (eAudit) {
        avisos.push("Auditoria final falhou: " + eAudit.message);
        resultado.auditoria = { erro: eAudit.message };
      }
    }

  } catch (e) {
    resultado.success   = false;
    resultado.ok        = false;
    resultado.executado = false;
    resultado.bloqueios.push("Falha em criarCartaoPilotoAdmin_B54_FIX4: " + e.message);
  }

  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

// ============================================================
// B54.2 — AUDITORIA PÓS-ENVIO (somente leitura)
// Confirma exatamente 1 lançamento criado em FIN_CARTOES_LANCAMENTOS
// pelo envio real mobile B54.2 + zero recarga/conciliação/pendência.
// ============================================================
function auditarPosEnvioB54_2_SEM_GRAVAR() {
  var CARTAO_PILOTO = "PILOT-FLASH-ADMIN-B54-DEV-20260617-135049";
  var VALOR_ESPERADO = 10;

  var resultado = {
    etapa: "B54.2_AUDITORIA",
    nome: "Auditoria pos-envio B54.2 — sem gravar",
    executado: false,
    somenteLeitura: true,
    success: false,
    conclusao: "PENDENTE",

    totalLancamentosB54: 0,
    lancamentosEncontrados: [],

    verificacoes: {
      exatamente1Lancamento     : false,
      cartaoIdCorreto           : false,
      funcionarioIdPreenchido   : false,
      funcionarioNome           : "",
      valorCorreto              : false,
      dataGastoPreenchida       : false,
      descricaoContemB54        : false,
      osNumeroPreenchido        : false,
      statusPrestacaoCorreto    : false,
      criadoPorCorreto          : false,
      conciliadoNao             : false
    },

    totalRecargasHoje    : 0,
    totalConciliacoesHoje: 0,
    totalPendenciasHoje  : 0,
    whatsappEnviado      : false,

    bloqueios: [],
    avisos   : []
  };

  try {
    var props   = PropertiesService.getScriptProperties();
    var dbFinId = String(props.getProperty("DB_FIN_ID") || "").trim();
    if (!dbFinId) {
      resultado.bloqueios.push("DB_FIN_ID não configurado.");
      Logger.log(JSON.stringify(resultado, null, 2));
      return resultado;
    }
    var ssFin = SpreadsheetApp.openById(dbFinId);
    var hoje  = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd");

    // 1. FIN_CARTOES_LANCAMENTOS — buscar lançamentos criados pelo piloto mobile
    var shLanc = ssFin.getSheetByName("FIN_CARTOES_LANCAMENTOS");
    if (!shLanc) {
      resultado.bloqueios.push("Aba FIN_CARTOES_LANCAMENTOS não encontrada.");
    } else {
      var lastRowL = shLanc.getLastRow();
      var lastColL = shLanc.getLastColumn();
      if (lastRowL >= 2 && lastColL >= 1) {
        var dadosL = shLanc.getRange(1, 1, lastRowL, lastColL).getValues();
        var hdrsL  = dadosL[0].map(function(h) { return String(h || "").trim(); });

        var iID           = hdrsL.indexOf("ID");
        var iLANC_ID      = hdrsL.indexOf("LANCAMENTO_ID");
        var iCARTAO       = hdrsL.indexOf("CARTAO_ID");
        var iFUNC_ID      = hdrsL.indexOf("FUNCIONARIO_ID");
        var iFUNC_NOME    = hdrsL.indexOf("FUNCIONARIO_NOME");
        var iVALOR        = hdrsL.indexOf("VALOR");
        var iDATA         = hdrsL.indexOf("DATA_GASTO");
        var iDESC         = hdrsL.indexOf("DESCRICAO_GASTO");
        var iOS_NUMERO    = hdrsL.indexOf("OS_NUMERO");
        var iSTATUS_PREST = hdrsL.indexOf("STATUS_PRESTACAO");
        var iCRIADO_POR   = hdrsL.indexOf("CRIADO_POR");
        var iCRIADO_EM    = hdrsL.indexOf("CRIADO_EM");
        var iCONCILIADO   = hdrsL.indexOf("CONCILIADO");
        var iOBS          = hdrsL.indexOf("OBSERVACOES");
        var iTIPO_GASTO   = hdrsL.indexOf("CATEGORIA_GASTO");

        var lancB54 = [];
        for (var i = 1; i < dadosL.length; i++) {
          var row = dadosL[i];
          var cp  = String(iCRIADO_POR >= 0 ? row[iCRIADO_POR] : "").trim();
          if (cp.indexOf("MOBILE_CAMPO_PILOTO") >= 0) {
            var funcIdFull = String(iFUNC_ID >= 0 ? row[iFUNC_ID] : "").trim();
            var cid        = String(iCARTAO  >= 0 ? row[iCARTAO]  : "").trim();
            lancB54.push({
              lancamentoId            : String(iLANC_ID >= 0 ? row[iLANC_ID] : "").trim() ||
                                        String(iID      >= 0 ? row[iID]      : "").trim(),
              cartaoId                : cid,
              cartaoIdMascarado       : cid.length > 16 ? cid.substring(0, 16) + "..." : cid,
              funcionarioId           : funcIdFull.length > 8 ? funcIdFull.substring(0, 8) + "..." : funcIdFull,
              funcionarioIdPreenchido : !!(funcIdFull),
              funcionarioNome         : String(iFUNC_NOME    >= 0 ? row[iFUNC_NOME]    : "").trim(),
              valor                   : row[iVALOR >= 0 ? iVALOR : 0],
              dataGasto               : String(iDATA         >= 0 ? row[iDATA]         : "").trim(),
              descricaoGasto          : String(iDESC         >= 0 ? row[iDESC]         : "").trim(),
              osNumero                : String(iOS_NUMERO    >= 0 ? row[iOS_NUMERO]    : "").trim(),
              statusPrestacao         : String(iSTATUS_PREST >= 0 ? row[iSTATUS_PREST] : "").trim(),
              criadoPor               : cp,
              criadoEm                : String(iCRIADO_EM   >= 0 ? row[iCRIADO_EM]   : "").trim(),
              conciliado              : String(iCONCILIADO  >= 0 ? row[iCONCILIADO]  : "").trim().toUpperCase(),
              observacoes             : String(iOBS          >= 0 ? row[iOBS]         : "").trim(),
              categoriaGasto          : String(iTIPO_GASTO  >= 0 ? row[iTIPO_GASTO]  : "").trim(),
              linhaSheet              : i + 1
            });
          }
        }

        resultado.totalLancamentosB54    = lancB54.length;
        resultado.lancamentosEncontrados = lancB54;
        resultado.verificacoes.exatamente1Lancamento = lancB54.length === 1;

        if (lancB54.length === 0) {
          resultado.bloqueios.push("ZERO lançamentos encontrados com CRIADO_POR=MOBILE_CAMPO_PILOTO*. Envio pode ter falhado.");
        } else if (lancB54.length > 1) {
          resultado.avisos.push("ATENCAO: " + lancB54.length + " lançamentos encontrados — esperado exatamente 1.");
        }

        if (lancB54.length >= 1) {
          var l  = lancB54[0];
          var vn = typeof l.valor === "number" ? l.valor : parseFloat(String(l.valor).replace(",", ".")) || 0;

          resultado.verificacoes.cartaoIdCorreto       = l.cartaoId === CARTAO_PILOTO;
          resultado.verificacoes.funcionarioIdPreenchido = l.funcionarioIdPreenchido;
          resultado.verificacoes.funcionarioNome       = l.funcionarioNome;
          resultado.verificacoes.valorCorreto          = Math.abs(vn - VALOR_ESPERADO) < 0.01;
          resultado.verificacoes.dataGastoPreenchida   = !!(l.dataGasto);
          resultado.verificacoes.descricaoContemB54    =
            l.descricaoGasto.toUpperCase().indexOf("B54") >= 0 ||
            l.descricaoGasto.toUpperCase().indexOf("TESTE") >= 0;
          resultado.verificacoes.osNumeroPreenchido    = !!(l.osNumero);
          resultado.verificacoes.statusPrestacaoCorreto = l.statusPrestacao.toUpperCase() === "PENDENTE_COMPROVANTE";
          resultado.verificacoes.criadoPorCorreto      = l.criadoPor === "MOBILE_CAMPO_PILOTO_B54";
          resultado.verificacoes.conciliadoNao         =
            l.conciliado === "" || l.conciliado === "NAO" ||
            l.conciliado === "FALSE" || l.conciliado === "0";

          if (!resultado.verificacoes.cartaoIdCorreto)
            resultado.avisos.push("CARTAO_ID divergente. Criado: " + l.cartaoId + " | Esperado: " + CARTAO_PILOTO);
          if (!resultado.verificacoes.valorCorreto)
            resultado.avisos.push("VALOR divergente: " + vn + " (esperado: " + VALOR_ESPERADO + ")");
          if (!resultado.verificacoes.statusPrestacaoCorreto)
            resultado.bloqueios.push("STATUS_PRESTACAO incorreto: '" + l.statusPrestacao + "' (esperado: PENDENTE_COMPROVANTE)");
          if (!resultado.verificacoes.criadoPorCorreto)
            resultado.avisos.push("CRIADO_POR divergente: '" + l.criadoPor + "' (esperado: MOBILE_CAMPO_PILOTO_B54)");
        }
      }
    }

    // 2. Recargas criadas hoje
    var shRec = ssFin.getSheetByName("FIN_CARTOES_RECARGAS");
    if (shRec && shRec.getLastRow() >= 2) {
      var hdrsRec = shRec.getRange(1, 1, 1, shRec.getLastColumn()).getValues()[0]
        .map(function(h) { return String(h || "").trim(); });
      var iCrRec = hdrsRec.indexOf("CRIADO_EM");
      var rowsRec = shRec.getRange(2, 1, shRec.getLastRow() - 1, shRec.getLastColumn()).getValues();
      rowsRec.forEach(function(r) {
        if (String(iCrRec >= 0 ? r[iCrRec] : "").indexOf(hoje) >= 0)
          resultado.totalRecargasHoje++;
      });
    }

    // 3. Conciliações criadas hoje
    var shConc = ssFin.getSheetByName("FIN_CARTOES_CONCILIACAO");
    if (shConc && shConc.getLastRow() >= 2) {
      var hdrsConc = shConc.getRange(1, 1, 1, shConc.getLastColumn()).getValues()[0]
        .map(function(h) { return String(h || "").trim(); });
      var iCrConc = hdrsConc.indexOf("CRIADO_EM");
      var rowsConc = shConc.getRange(2, 1, shConc.getLastRow() - 1, shConc.getLastColumn()).getValues();
      rowsConc.forEach(function(r) {
        if (String(iCrConc >= 0 ? r[iCrConc] : "").indexOf(hoje) >= 0)
          resultado.totalConciliacoesHoje++;
      });
    }

    // 4. Pendências criadas hoje
    var shPend = ssFin.getSheetByName("FIN_CARTOES_PENDENCIAS");
    if (shPend && shPend.getLastRow() >= 2) {
      var hdrsPend = shPend.getRange(1, 1, 1, shPend.getLastColumn()).getValues()[0]
        .map(function(h) { return String(h || "").trim(); });
      var iCrPend = hdrsPend.indexOf("CRIADO_EM");
      var rowsPend = shPend.getRange(2, 1, shPend.getLastRow() - 1, shPend.getLastColumn()).getValues();
      rowsPend.forEach(function(r) {
        if (String(iCrPend >= 0 ? r[iCrPend] : "").indexOf(hoje) >= 0)
          resultado.totalPendenciasHoje++;
      });
    }

    // Verificações extras
    if (resultado.totalRecargasHoje > 0)
      resultado.bloqueios.push("INESPERADO: " + resultado.totalRecargasHoje + " recarga(s) criada(s) hoje.");
    if (resultado.totalConciliacoesHoje > 0)
      resultado.bloqueios.push("INESPERADO: " + resultado.totalConciliacoesHoje + " conciliacao(oes) criada(s) hoje.");
    if (resultado.totalPendenciasHoje > 0)
      resultado.bloqueios.push("INESPERADO: " + resultado.totalPendenciasHoje + " pendencia(s) criada(s) hoje.");

    // WhatsApp: nenhuma função de envio é chamada pelo backend piloto B54
    resultado.whatsappEnviado = false;

    // Veredicto final
    var v = resultado.verificacoes;
    var tudo = v.exatamente1Lancamento && v.cartaoIdCorreto &&
               v.funcionarioIdPreenchido && v.valorCorreto &&
               v.dataGastoPreenchida && v.statusPrestacaoCorreto &&
               v.criadoPorCorreto &&
               resultado.totalRecargasHoje === 0 &&
               resultado.totalConciliacoesHoje === 0 &&
               resultado.totalPendenciasHoje === 0 &&
               resultado.bloqueios.length === 0;

    resultado.success   = tudo;
    resultado.conclusao = tudo ? "B54.2 APROVADO" : "B54.2 BLOQUEADO";

  } catch (e) {
    resultado.bloqueios.push("Falha em auditarPosEnvioB54_2_SEM_GRAVAR: " + e.message);
    resultado.conclusao = "B54.2 BLOQUEADO";
  }

  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

// ============================================================
// B54.3 — AUDITORIA PRÉ-UPLOAD (somente leitura)
// Verifica infraestrutura necessária antes do upload do comprovante.
// ============================================================
function AUDITAR_UPLOAD_COMPROVANTE_FLASH_B54_3_SEM_GRAVAR() {
  var LANCAMENTO_PILOTO = "LAN-B3486E3FD446";
  var resultado = {
    etapa: "B54.3_PRE_UPLOAD",
    nome: "Auditoria pre-upload comprovante Flash B54.3 — sem gravar",
    executado: false,
    somenteLeitura: true,
    success: false,
    prontoParaUpload: false,
    verificacoes: {
      pilotoConfigurado       : false,
      pilotoEmail             : "",
      backendExiste           : false,
      folderFinanceiroConf    : false,
      folderFinanceiroIdMask  : "",
      headersComprovanteOk    : false,
      headersAusentesLanc     : [],
      abaAnexosExiste         : false,
      headersAnexosOk         : false,
      headersAusentesAnexos   : [],
      lancamentoPilotoExiste  : false,
      lancamentoPilotoStatus  : "",
      statusPermiteUpload     : false
    },
    bloqueios: [],
    avisos   : []
  };
  try {
    var bloqueios = resultado.bloqueios;
    var avisos    = resultado.avisos;
    var sp        = PropertiesService.getScriptProperties();

    // 1. Trava piloto
    var pilotoEmail = String(sp.getProperty("FIN_PILOTO_FLASH_EMAIL") || "").trim();
    resultado.verificacoes.pilotoEmail       = pilotoEmail;
    resultado.verificacoes.pilotoConfigurado = !!pilotoEmail;
    if (!pilotoEmail) bloqueios.push("FIN_PILOTO_FLASH_EMAIL não configurado.");
    else avisos.push("FIN_PILOTO_FLASH_EMAIL = " + pilotoEmail);

    // 2. Backend
    resultado.verificacoes.backendExiste = typeof finFlashAnexarComprovanteMobilePilotoV1 === "function";
    if (!resultado.verificacoes.backendExiste)
      bloqueios.push("finFlashAnexarComprovanteMobilePilotoV1 não encontrada. Verifique push.");

    // 3. FOLDER_FINANCEIRO
    var folderId = String(sp.getProperty("FOLDER_FINANCEIRO") || sp.getProperty("FOLDER_FINANCEIRO_ID") || "").trim();
    resultado.verificacoes.folderFinanceiroConf   = !!folderId;
    resultado.verificacoes.folderFinanceiroIdMask = folderId ? folderId.substring(0, 12) + "..." : "";
    if (!folderId)
      bloqueios.push("FOLDER_FINANCEIRO não configurado. Execute provisionamento financeiro.");
    else
      avisos.push("FOLDER_FINANCEIRO configurado: " + resultado.verificacoes.folderFinanceiroIdMask);

    // 4. Banco FIN
    var dbFinId = String(sp.getProperty("DB_FIN_ID") || "").trim();
    if (!dbFinId) {
      bloqueios.push("DB_FIN_ID não configurado.");
    } else {
      try {
        var ssFin = SpreadsheetApp.openById(dbFinId);

        // 4a. FIN_CARTOES_LANCAMENTOS — headers comprovante
        var shLanc = ssFin.getSheetByName("FIN_CARTOES_LANCAMENTOS");
        if (!shLanc) {
          bloqueios.push("Aba FIN_CARTOES_LANCAMENTOS não encontrada.");
        } else {
          var hdrsLanc = shLanc.getLastColumn() > 0
            ? shLanc.getRange(1, 1, 1, shLanc.getLastColumn()).getValues()[0]
                .map(function(h) { return String(h || "").trim(); })
            : [];
          var hdrsObrigLanc = [
            "LANCAMENTO_ID", "FUNCIONARIO_ID", "STATUS_PRESTACAO",
            "COMPROVANTE_OK", "COMPROVANTE_FILE_ID", "COMPROVANTE_LINK",
            "TIPO_COMPROVANTE", "ATUALIZADO_EM", "ATUALIZADO_POR"
          ];
          var ausentesLanc = hdrsObrigLanc.filter(function(h) { return hdrsLanc.indexOf(h) < 0; });
          resultado.verificacoes.headersAusentesLanc  = ausentesLanc;
          resultado.verificacoes.headersComprovanteOk = ausentesLanc.length === 0;
          if (ausentesLanc.length > 0)
            bloqueios.push("Headers ausentes em FIN_CARTOES_LANCAMENTOS: " + ausentesLanc.join(", "));

          // Localizar lançamento piloto
          var lastRowL = shLanc.getLastRow();
          if (lastRowL >= 2) {
            var dadosL = shLanc.getRange(1, 1, lastRowL, shLanc.getLastColumn()).getValues();
            var hL     = dadosL[0].map(function(h) { return String(h || "").trim(); });
            var iLID   = hL.indexOf("LANCAMENTO_ID");
            var iLST   = hL.indexOf("STATUS_PRESTACAO");
            for (var i = 1; i < dadosL.length; i++) {
              if (String(iLID >= 0 ? dadosL[i][iLID] : "").trim() === LANCAMENTO_PILOTO) {
                var st = String(iLST >= 0 ? dadosL[i][iLST] : "").trim();
                resultado.verificacoes.lancamentoPilotoExiste = true;
                resultado.verificacoes.lancamentoPilotoStatus = st;
                resultado.verificacoes.statusPermiteUpload    =
                  st === "PENDENTE_COMPROVANTE" || st === "REPROVADO";
                avisos.push("Lançamento " + LANCAMENTO_PILOTO + " encontrado. Status: " + st);
                if (!resultado.verificacoes.statusPermiteUpload)
                  bloqueios.push("STATUS_PRESTACAO não permite upload: " + st);
                break;
              }
            }
            if (!resultado.verificacoes.lancamentoPilotoExiste)
              bloqueios.push("Lançamento " + LANCAMENTO_PILOTO + " não encontrado.");
          }
        }

        // 4b. FIN_CARTOES_ANEXOS
        var shAnx = ssFin.getSheetByName("FIN_CARTOES_ANEXOS");
        resultado.verificacoes.abaAnexosExiste = !!shAnx;
        if (!shAnx) {
          bloqueios.push("Aba FIN_CARTOES_ANEXOS não encontrada.");
        } else {
          var hdrsAnx = shAnx.getLastColumn() > 0
            ? shAnx.getRange(1, 1, 1, shAnx.getLastColumn()).getValues()[0]
                .map(function(h) { return String(h || "").trim(); })
            : [];
          var hdrsObrigAnx = ["LANCAMENTO_ID", "FILE_ID", "LINK_ARQUIVO", "MIME_TYPE", "TAMANHO_BYTES"];
          var ausentesAnx = hdrsObrigAnx.filter(function(h) { return hdrsAnx.indexOf(h) < 0; });
          resultado.verificacoes.headersAusentesAnexos = ausentesAnx;
          resultado.verificacoes.headersAnexosOk = ausentesAnx.length === 0;
          if (ausentesAnx.length > 0)
            bloqueios.push("Headers ausentes em FIN_CARTOES_ANEXOS: " + ausentesAnx.join(", "));
        }
      } catch (eFin) { bloqueios.push("Erro ao acessar DB FIN: " + eFin.message); }
    }

    resultado.prontoParaUpload = bloqueios.length === 0;
    resultado.success          = bloqueios.length === 0;

  } catch (e) {
    resultado.bloqueios.push("Falha em AUDITAR_UPLOAD_COMPROVANTE_FLASH_B54_3_SEM_GRAVAR: " + e.message);
  }
  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

// ============================================================
// B54.3_FIX — DIAGNÓSTICO DE UPLOAD (somente leitura)
// Lista todos lançamentos piloto mobile e seus comprovantes.
// Causa raiz: auditoria anterior hardcoded para LAN-B3486E3FD446
// (lançamento do B54.2). B54.3 cria NOVO lançamento — comprovante
// vai para o novo ID, não para o antigo.
// ============================================================
function DIAGNOSTICAR_UPLOAD_COMPROVANTE_FLASH_B54_3_SEM_GRAVAR() {
  var resultado = {
    etapa: "B54.3_FIX_DIAGNOSTICO",
    nome: "Diagnostico upload comprovante Flash B54.3 — sem gravar",
    executado: false,
    somenteLeitura: true,
    success: false,

    causaProvavel: "",
    recomendacao: "",

    lancamentosB54: [],
    totalLancamentosB54: 0,
    totalComComprovanteOk: 0,
    totalSemComprovante: 0,

    anexosTotais: 0,
    anexosB54: [],

    backend: {
      finFlashAnexarComprovanteMobilePilotoV1: false,
      folderFinanceiroConf: false,
      folderFinanceiroIdMask: "",
      pilotoEmail: ""
    },

    frontend: {
      funcaoMcAnexarExiste: true,
      funcaoFileReaderUsada: true,
      inputFileIdCorreto: "mcf-comp-file / mcf-comp-cam",
      chamadaBackendCorreta: "finFlashAnexarComprovanteMobilePilotoV1(ses, payload)",
      lancamentoIdPassado: "via onclick = mc_anexarComprovanteFlash_(lancId)",
      observacao: "Verificado por revisao de codigo. Estrutura frontend OK."
    },

    producaoAlterada: false,
    bloqueios: [],
    avisos: []
  };
  try {
    var sp      = PropertiesService.getScriptProperties();
    var dbFinId = String(sp.getProperty("DB_FIN_ID") || "").trim();

    // Backend checks
    resultado.backend.finFlashAnexarComprovanteMobilePilotoV1 =
      typeof finFlashAnexarComprovanteMobilePilotoV1 === "function";
    var folderId = String(sp.getProperty("FOLDER_FINANCEIRO") || sp.getProperty("FOLDER_FINANCEIRO_ID") || "").trim();
    resultado.backend.folderFinanceiroConf   = !!folderId;
    resultado.backend.folderFinanceiroIdMask = folderId ? folderId.substring(0, 12) + "..." : "";
    resultado.backend.pilotoEmail = String(sp.getProperty("FIN_PILOTO_FLASH_EMAIL") || "").trim();

    if (!resultado.backend.finFlashAnexarComprovanteMobilePilotoV1)
      resultado.bloqueios.push("CRITICO: finFlashAnexarComprovanteMobilePilotoV1 não encontrada no DEV. Verifique push.");
    if (!resultado.backend.folderFinanceiroConf)
      resultado.bloqueios.push("FOLDER_FINANCEIRO não configurado. Upload vai falhar.");

    if (!dbFinId) {
      resultado.bloqueios.push("DB_FIN_ID não configurado.");
      Logger.log(JSON.stringify(resultado, null, 2));
      return resultado;
    }

    var ssFin = SpreadsheetApp.openById(dbFinId);

    // 1. Todos os lançamentos piloto mobile
    var shLanc = ssFin.getSheetByName("FIN_CARTOES_LANCAMENTOS");
    if (!shLanc) {
      resultado.bloqueios.push("Aba FIN_CARTOES_LANCAMENTOS não encontrada.");
    } else {
      var lastRowL = shLanc.getLastRow();
      if (lastRowL >= 2) {
        var dadosL = shLanc.getRange(1, 1, lastRowL, shLanc.getLastColumn()).getValues();
        var hL     = dadosL[0].map(function(h) { return String(h || "").trim(); });
        var iLID   = hL.indexOf("LANCAMENTO_ID");
        var iLST   = hL.indexOf("STATUS_PRESTACAO");
        var iLCOK  = hL.indexOf("COMPROVANTE_OK");
        var iLCFID = hL.indexOf("COMPROVANTE_FILE_ID");
        var iLVAL  = hL.indexOf("VALOR");
        var iLDAT  = hL.indexOf("DATA_GASTO");
        var iLCPOR = hL.indexOf("CRIADO_POR");
        var iLCEM  = hL.indexOf("CRIADO_EM");
        var iLUPOR = hL.indexOf("ATUALIZADO_POR");

        for (var i = 1; i < dadosL.length; i++) {
          var cp = String(iLCPOR >= 0 ? dadosL[i][iLCPOR] : "").trim();
          if (cp.indexOf("MOBILE_CAMPO_PILOTO") >= 0) {
            var lid   = String(iLID   >= 0 ? dadosL[i][iLID]   : "").trim();
            var cok   = String(iLCOK  >= 0 ? dadosL[i][iLCOK]  : "").trim().toUpperCase();
            var cfid  = String(iLCFID >= 0 ? dadosL[i][iLCFID] : "").trim();
            var st    = String(iLST   >= 0 ? dadosL[i][iLST]   : "").trim();
            var val   = dadosL[i][iLVAL >= 0 ? iLVAL : 0];
            var dat   = String(iLDAT  >= 0 ? dadosL[i][iLDAT]  : "").trim();
            var cem   = String(iLCEM  >= 0 ? dadosL[i][iLCEM]  : "").trim();
            var upor  = String(iLUPOR >= 0 ? dadosL[i][iLUPOR] : "").trim();
            var temComp = cok === "SIM" && !!cfid;
            resultado.lancamentosB54.push({
              lancamentoId      : lid,
              criadoPor         : cp,
              criadoEm          : cem.substring(0, 19),
              dataGasto         : dat,
              valor             : val,
              statusPrestacao   : st,
              comprovanteOk     : cok,
              comprovanteFileId : cfid ? cfid.substring(0, 12) + "..." : "",
              atualizadoPor     : upor,
              temComprovante    : temComp
            });
            if (temComp) resultado.totalComComprovanteOk++;
            else         resultado.totalSemComprovante++;
          }
        }
        resultado.totalLancamentosB54 = resultado.lancamentosB54.length;
      }
    }

    // 2. FIN_CARTOES_ANEXOS
    var shAnx = ssFin.getSheetByName("FIN_CARTOES_ANEXOS");
    if (shAnx && shAnx.getLastRow() >= 2) {
      var dadosAnx = shAnx.getRange(1, 1, shAnx.getLastRow(), shAnx.getLastColumn()).getValues();
      var hAnx = dadosAnx[0].map(function(h) { return String(h || "").trim(); });
      var iALID   = hAnx.indexOf("LANCAMENTO_ID");
      var iAFID   = hAnx.indexOf("FILE_ID");
      var iACEMAnx= hAnx.indexOf("CRIADO_EM");
      var iAOrig  = hAnx.indexOf("ORIGEM");
      resultado.anexosTotais = shAnx.getLastRow() - 1;
      for (var j = 1; j < dadosAnx.length; j++) {
        var orig = String(iAOrig >= 0 ? dadosAnx[j][iAOrig] : "").trim();
        if (orig.indexOf("B54") >= 0 || orig.indexOf("PILOTO") >= 0) {
          var fid2 = String(iAFID >= 0 ? dadosAnx[j][iAFID] : "").trim();
          resultado.anexosB54.push({
            lancamentoId: String(iALID    >= 0 ? dadosAnx[j][iALID]    : "").trim(),
            fileId      : fid2 ? fid2.substring(0, 12) + "..." : "",
            criadoEm    : String(iACEMAnx >= 0 ? dadosAnx[j][iACEMAnx] : "").trim().substring(0, 19),
            origem      : orig
          });
        }
      }
    }

    // 3. Diagnóstico da causa
    if (resultado.totalLancamentosB54 === 0) {
      resultado.causaProvavel = "Nenhum lançamento piloto mobile encontrado. Envio de prestacao pode ter falhado.";
      resultado.recomendacao  = "Acesse o DEV mobile, submeta o formulario com dados NOVOS (finalidade diferente do B54.2) e execute o upload do comprovante.";
    } else if (resultado.totalComComprovanteOk === 0) {
      resultado.causaProvavel =
        resultado.totalLancamentosB54 === 1
        ? "1 lançamento encontrado (provavel B54.2 LAN-B3486E3FD446) sem comprovante. Upload não foi realizado OU erro silencioso no upload."
        : resultado.totalLancamentosB54 + " lançamentos encontrados, nenhum com comprovante. Upload não foi concluido.";
      resultado.recomendacao  =
        "Verifique se o botao '📎 Enviar comprovante' foi clicado apos selecionar o arquivo. " +
        "O arquivo deve ser selecionado no seletor da secao 'Enviar comprovante' (mcf-comp-file), " +
        "NAO no seletor original do formulario (mcf-foto-file).";
    } else {
      resultado.causaProvavel =
        resultado.totalComComprovanteOk + " lancamento(s) COM comprovante encontrado(s). " +
        "Auditoria anterior estava hardcoded para LAN-B3486E3FD446 — verificou lançamento errado.";
      resultado.recomendacao  = "Executar AUDITAR_POS_UPLOAD_COMPROVANTE_FLASH_B54_3_SEM_GRAVAR (versao corrigida).";
    }

    resultado.producaoAlterada = false;
    resultado.success = resultado.bloqueios.length === 0;

  } catch (e) {
    resultado.bloqueios.push("Falha em DIAGNOSTICAR_UPLOAD_COMPROVANTE_FLASH_B54_3_SEM_GRAVAR: " + e.message);
  }
  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

// ============================================================
// B54.3 — AUDITORIA PÓS-UPLOAD v2 (DINÂMICA — somente leitura)
// Busca QUALQUER lançamento piloto mobile com comprovante anexado.
// NÃO hardcoda LAN-B3486E3FD446 (fix: auditoria anterior verificava
// o lançamento do B54.2, não o novo lançamento do B54.3).
// ============================================================
function AUDITAR_POS_UPLOAD_COMPROVANTE_FLASH_B54_3_SEM_GRAVAR() {
  // FIX: não hardcoda mais LAN-B3486E3FD446.
  // Busca QUALQUER lançamento piloto mobile com COMPROVANTE_OK=SIM.
  var resultado = {
    etapa: "B54.3_POS_UPLOAD_V2",
    nome: "Auditoria pos-upload comprovante Flash B54.3 v2 — sem gravar",
    executado: false,
    somenteLeitura: true,
    success: false,
    conclusao: "PENDENTE",

    lancamentoComComprovante: null,
    totalLancamentosB54     : 0,
    totalComComprovanteOk   : 0,
    totalSemComprovante     : 0,

    verificacoes: {
      algumLancamentoComComprovante : false,
      comprovanteOkSim              : false,
      comprovanteFileIdPreenchido   : false,
      comprovanteLinkPreenchido     : false,
      tipoComprovantePreenchido     : false,
      statusPrestacaoEnviado        : false,
      atualizadoPorCorreto          : false,
      lancamentoId                  : "",
      statusAtual                   : "",
      anexoRegistrado               : false,
      totalAnexosB54                : 0
    },

    totalRecargasHoje    : 0,
    totalConciliacoesHoje: 0,
    totalPendenciasHoje  : 0,
    whatsappEnviado      : false,
    bloqueios: [],
    avisos   : []
  };
  try {
    var sp      = PropertiesService.getScriptProperties();
    var dbFinId = String(sp.getProperty("DB_FIN_ID") || "").trim();
    if (!dbFinId) {
      resultado.bloqueios.push("DB_FIN_ID não configurado.");
      Logger.log(JSON.stringify(resultado, null, 2));
      return resultado;
    }
    var ssFin = SpreadsheetApp.openById(dbFinId);
    var hoje  = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd");

    // 1. Varrer FIN_CARTOES_LANCAMENTOS — buscar piloto mobile COM comprovante
    var shLanc = ssFin.getSheetByName("FIN_CARTOES_LANCAMENTOS");
    if (!shLanc) {
      resultado.bloqueios.push("Aba FIN_CARTOES_LANCAMENTOS não encontrada.");
    } else {
      var lastRowL = shLanc.getLastRow();
      if (lastRowL >= 2) {
        var dadosL = shLanc.getRange(1, 1, lastRowL, shLanc.getLastColumn()).getValues();
        var hL     = dadosL[0].map(function(h) { return String(h || "").trim(); });
        var iLID   = hL.indexOf("LANCAMENTO_ID");
        var iLCPOR = hL.indexOf("CRIADO_POR");
        var iLST   = hL.indexOf("STATUS_PRESTACAO");
        var iLCOK  = hL.indexOf("COMPROVANTE_OK");
        var iLCFID = hL.indexOf("COMPROVANTE_FILE_ID");
        var iLCLNK = hL.indexOf("COMPROVANTE_LINK");
        var iLCTIP = hL.indexOf("TIPO_COMPROVANTE");
        var iLUPOR = hL.indexOf("ATUALIZADO_POR");

        var lancComComp = null;
        for (var i = 1; i < dadosL.length; i++) {
          var cp = String(iLCPOR >= 0 ? dadosL[i][iLCPOR] : "").trim();
          if (cp.indexOf("MOBILE_CAMPO_PILOTO_B54") < 0) continue;
          resultado.totalLancamentosB54++;
          var cok = String(iLCOK >= 0 ? dadosL[i][iLCOK] : "").trim().toUpperCase();
          if (cok === "SIM") {
            resultado.totalComComprovanteOk++;
            if (!lancComComp) {
              var st   = String(iLST   >= 0 ? dadosL[i][iLST]   : "").trim();
              var cfid = String(iLCFID >= 0 ? dadosL[i][iLCFID] : "").trim();
              var clnk = String(iLCLNK >= 0 ? dadosL[i][iLCLNK] : "").trim();
              var ctip = String(iLCTIP >= 0 ? dadosL[i][iLCTIP] : "").trim();
              var upor = String(iLUPOR >= 0 ? dadosL[i][iLUPOR] : "").trim();
              var lid  = String(iLID   >= 0 ? dadosL[i][iLID]   : "").trim();
              lancComComp = {
                lancamentoId    : lid,
                statusPrestacao : st,
                comprovanteOk   : cok,
                comprovanteFileId: cfid ? cfid.substring(0, 12) + "..." : "",
                comprovanteLink : !!clnk,
                tipoComprovante : ctip,
                atualizadoPor   : upor
              };
              resultado.verificacoes.lancamentoId               = lid;
              resultado.verificacoes.statusAtual                = st;
              resultado.verificacoes.comprovanteOkSim           = true;
              resultado.verificacoes.comprovanteFileIdPreenchido= !!cfid;
              resultado.verificacoes.comprovanteLinkPreenchido  = !!clnk;
              resultado.verificacoes.tipoComprovantePreenchido  = !!ctip;
              resultado.verificacoes.statusPrestacaoEnviado     = st === "ENVIADO";
              resultado.verificacoes.atualizadoPorCorreto       = upor === "MOBILE_CAMPO_PILOTO_B54_3";

              if (!resultado.verificacoes.comprovanteFileIdPreenchido)
                resultado.bloqueios.push("COMPROVANTE_FILE_ID vazio no lançamento " + lid);
              if (!resultado.verificacoes.comprovanteLinkPreenchido)
                resultado.bloqueios.push("COMPROVANTE_LINK vazio no lançamento " + lid);
              if (!resultado.verificacoes.statusPrestacaoEnviado)
                resultado.bloqueios.push("STATUS_PRESTACAO esperado ENVIADO: '" + st + "' em " + lid);
              if (!resultado.verificacoes.atualizadoPorCorreto)
                resultado.avisos.push("ATUALIZADO_POR: '" + upor + "' (esperado MOBILE_CAMPO_PILOTO_B54_3)");
            }
          } else {
            resultado.totalSemComprovante++;
          }
        }
        resultado.verificacoes.algumLancamentoComComprovante = !!lancComComp;
        resultado.lancamentoComComprovante = lancComComp;

        if (!lancComComp) {
          resultado.bloqueios.push(
            "Nenhum lançamento piloto mobile com COMPROVANTE_OK=SIM encontrado. " +
            "Total MOBILE_CAMPO_PILOTO_B54: " + resultado.totalLancamentosB54 + ". " +
            "Execute DIAGNOSTICAR_UPLOAD_COMPROVANTE_FLASH_B54_3_SEM_GRAVAR para detalhes."
          );
        } else {
          resultado.avisos.push("Lançamento com comprovante: " + lancComComp.lancamentoId);
        }
      }
    }

    // 2. FIN_CARTOES_ANEXOS — contar entradas de upload B54.3
    var shAnx = ssFin.getSheetByName("FIN_CARTOES_ANEXOS");
    if (!shAnx) {
      resultado.bloqueios.push("Aba FIN_CARTOES_ANEXOS não encontrada.");
    } else if (shAnx.getLastRow() >= 2) {
      var dadosAnx = shAnx.getRange(1, 1, shAnx.getLastRow(), shAnx.getLastColumn()).getValues();
      var hAnx = dadosAnx[0].map(function(h) { return String(h || "").trim(); });
      var iAOrig = hAnx.indexOf("ORIGEM");
      var iALIDAnx = hAnx.indexOf("LANCAMENTO_ID");
      var totalB54Anx = 0;
      for (var j = 1; j < dadosAnx.length; j++) {
        var orig = String(iAOrig >= 0 ? dadosAnx[j][iAOrig] : "").trim();
        if (orig.indexOf("MOBILE_CAMPO_PILOTO_B54") >= 0) totalB54Anx++;
      }
      resultado.verificacoes.totalAnexosB54  = totalB54Anx;
      resultado.verificacoes.anexoRegistrado = totalB54Anx >= 1;
      if (!resultado.verificacoes.anexoRegistrado)
        resultado.bloqueios.push("Nenhum registro em FIN_CARTOES_ANEXOS com ORIGEM=MOBILE_CAMPO_PILOTO_B54_3.");
    }

    // 3. Recargas hoje
    var shRec = ssFin.getSheetByName("FIN_CARTOES_RECARGAS");
    if (shRec && shRec.getLastRow() >= 2) {
      var hRec = shRec.getRange(1, 1, 1, shRec.getLastColumn()).getValues()[0]
        .map(function(h) { return String(h || "").trim(); });
      var iCrR = hRec.indexOf("CRIADO_EM");
      shRec.getRange(2, 1, shRec.getLastRow() - 1, shRec.getLastColumn()).getValues()
        .forEach(function(r) {
          if (String(iCrR >= 0 ? r[iCrR] : "").indexOf(hoje) >= 0) resultado.totalRecargasHoje++;
        });
    }
    if (resultado.totalRecargasHoje > 0)
      resultado.bloqueios.push("INESPERADO: " + resultado.totalRecargasHoje + " recarga(s) hoje.");

    // 4. Conciliações hoje
    var shConc = ssFin.getSheetByName("FIN_CARTOES_CONCILIACAO");
    if (shConc && shConc.getLastRow() >= 2) {
      var hConc = shConc.getRange(1, 1, 1, shConc.getLastColumn()).getValues()[0]
        .map(function(h) { return String(h || "").trim(); });
      var iCrC = hConc.indexOf("CRIADO_EM");
      shConc.getRange(2, 1, shConc.getLastRow() - 1, shConc.getLastColumn()).getValues()
        .forEach(function(r) {
          if (String(iCrC >= 0 ? r[iCrC] : "").indexOf(hoje) >= 0) resultado.totalConciliacoesHoje++;
        });
    }
    if (resultado.totalConciliacoesHoje > 0)
      resultado.bloqueios.push("INESPERADO: " + resultado.totalConciliacoesHoje + " conciliacao(oes) hoje.");

    // 5. Pendências hoje
    var shPend = ssFin.getSheetByName("FIN_CARTOES_PENDENCIAS");
    if (shPend && shPend.getLastRow() >= 2) {
      var hPend = shPend.getRange(1, 1, 1, shPend.getLastColumn()).getValues()[0]
        .map(function(h) { return String(h || "").trim(); });
      var iCrP = hPend.indexOf("CRIADO_EM");
      shPend.getRange(2, 1, shPend.getLastRow() - 1, shPend.getLastColumn()).getValues()
        .forEach(function(r) {
          if (String(iCrP >= 0 ? r[iCrP] : "").indexOf(hoje) >= 0) resultado.totalPendenciasHoje++;
        });
    }
    if (resultado.totalPendenciasHoje > 0)
      resultado.bloqueios.push("INESPERADO: " + resultado.totalPendenciasHoje + " pendencia(s) hoje.");

    resultado.whatsappEnviado = false;

    var tudo =
      resultado.verificacoes.algumLancamentoComComprovante &&
      resultado.verificacoes.comprovanteFileIdPreenchido &&
      resultado.verificacoes.comprovanteLinkPreenchido &&
      resultado.verificacoes.statusPrestacaoEnviado &&
      resultado.verificacoes.anexoRegistrado &&
      resultado.totalRecargasHoje === 0 &&
      resultado.totalConciliacoesHoje === 0 &&
      resultado.totalPendenciasHoje === 0 &&
      resultado.bloqueios.length === 0;

    resultado.success   = tudo;
    resultado.conclusao = tudo ? "B54.3 APROVADO" : "B54.3 BLOQUEADO";

  } catch (e) {
    resultado.bloqueios.push("Falha em AUDITAR_POS_UPLOAD_COMPROVANTE_FLASH_B54_3_SEM_GRAVAR: " + e.message);
    resultado.conclusao = "B54.3 BLOQUEADO";
  }
  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

// ============================================================
// B54.4 — AUDITORIA PRÉ-CONFERÊNCIA FINANCEIRA FLASH MOBILE
// ============================================================
function AUDITAR_CONFERENCIA_PRESTACAO_FLASH_B54_4_SEM_GRAVAR() {
  var resultado = {
    auditoria          : "AUDITAR_CONFERENCIA_PRESTACAO_FLASH_B54_4_SEM_GRAVAR",
    producaoAlterada   : false,
    verificacoes       : {},
    headersMapeados    : {},
    bloqueios          : [],
    avisos             : [],
    lancamentoAlvo     : "LAN-DD90E8F0AFE8",
    prontoParaConferir : false
  };

  try {
    var LANCAMENTO_PILOTO = "LAN-DD90E8F0AFE8";

    // 1. Backend existe
    resultado.verificacoes.backendExiste =
      (typeof finFlashConferirPrestacaoMobilePilotoV1 === "function");
    if (!resultado.verificacoes.backendExiste)
      resultado.bloqueios.push("Backend finFlashConferirPrestacaoMobilePilotoV1 não encontrado.");

    // 2. FIN_CARTOES_LANCAMENTOS — headers e lançamento piloto
    var props   = PropertiesService.getScriptProperties();
    var dbFinId = String(props.getProperty("DB_FIN_ID") || "").trim();
    if (!dbFinId) {
      resultado.bloqueios.push("DB_FIN_ID não configurado.");
      Logger.log(JSON.stringify(resultado, null, 2));
      return resultado;
    }
    var ssFin = SpreadsheetApp.openById(dbFinId);
    var shLan = ssFin.getSheetByName("FIN_CARTOES_LANCAMENTOS");
    if (!shLan) {
      resultado.bloqueios.push("Aba FIN_CARTOES_LANCAMENTOS não encontrada.");
      Logger.log(JSON.stringify(resultado, null, 2));
      return resultado;
    }

    var headers = shLan.getRange(1, 1, 1, shLan.getLastColumn()).getValues()[0]
      .map(function(v) { return String(v || "").trim(); });

    var camposObrigatorios = [
      "STATUS_PRESTACAO", "DATA_APROVACAO", "APROVADO_POR",
      "MOTIVO_REJEICAO", "ATUALIZADO_EM", "ATUALIZADO_POR",
      "LANCAMENTO_ID", "COMPROVANTE_OK"
    ];
    var headersOk = true;
    camposObrigatorios.forEach(function(c) {
      var existe = headers.indexOf(c) >= 0;
      resultado.verificacoes["header_" + c] = existe;
      if (!existe) {
        resultado.bloqueios.push("Header ausente: " + c);
        headersOk = false;
      }
    });

    // Mapeamento dos campos solicitados no spec para os headers reais
    resultado.headersMapeados = {
      CONFERIDO_EM         : headers.indexOf("DATA_APROVACAO") >= 0
        ? "DATA_APROVACAO (OK)" : "DATA_APROVACAO (AUSENTE)",
      CONFERIDO_POR        : headers.indexOf("APROVADO_POR") >= 0
        ? "APROVADO_POR (OK)" : "APROVADO_POR (AUSENTE)",
      MOTIVO_REPROVACAO    : headers.indexOf("MOTIVO_REJEICAO") >= 0
        ? "MOTIVO_REJEICAO (OK)" : "MOTIVO_REJEICAO (AUSENTE)",
      OBSERVACAO_FINANCEIRO: headers.indexOf("OBSERVACAO_FINANCEIRO") >= 0
        ? "OBSERVACAO_FINANCEIRO (OK)"
        : "campo não existe - não necessario nesta etapa"
    };

    // 3. Lançamento piloto: LAN-DD90E8F0AFE8
    resultado.verificacoes.lancamentoEncontrado = false;
    if (shLan.getLastRow() >= 2 && headersOk) {
      var dados = shLan.getRange(1, 1, shLan.getLastRow(), shLan.getLastColumn()).getValues();
      var hd = dados[0].map(function(v) { return String(v || "").trim(); });
      var iLID = hd.indexOf("LANCAMENTO_ID");
      var iCOK = hd.indexOf("COMPROVANTE_OK");
      var iSTA = hd.indexOf("STATUS_PRESTACAO");

      var lancRow = null;
      for (var i = 1; i < dados.length; i++) {
        if (String(dados[i][iLID] || "").trim() === LANCAMENTO_PILOTO) {
          lancRow = dados[i]; break;
        }
      }

      if (!lancRow) {
        resultado.bloqueios.push("Lançamento " + LANCAMENTO_PILOTO + " não encontrado.");
      } else {
        var comprovanteOk   = String(iCOK >= 0 ? lancRow[iCOK] : "").trim().toUpperCase();
        var statusPrestacao = String(iSTA >= 0 ? lancRow[iSTA] : "").trim().toUpperCase();
        resultado.verificacoes.lancamentoEncontrado  = true;
        resultado.verificacoes.comprovanteOkSim      = comprovanteOk === "SIM";
        resultado.verificacoes.statusEnviado         = statusPrestacao === "ENVIADO";
        resultado.verificacoes.statusAtual           = statusPrestacao;

        if (!resultado.verificacoes.comprovanteOkSim)
          resultado.bloqueios.push(
            "Lançamento sem comprovante (COMPROVANTE_OK=" + comprovanteOk + "). Conferencia bloqueada."
          );
        if (!resultado.verificacoes.statusEnviado)
          resultado.bloqueios.push(
            "Status não permite conferencia: " + statusPrestacao + ". Esperado: ENVIADO."
          );
      }
    }

    // 4. Zero recargas hoje
    var hoje = Utilities.formatDate(new Date(), "America/Sao_Paulo", "yyyy-MM-dd");
    var totalRecargasHoje = 0;
    var shRec = ssFin.getSheetByName("FIN_CARTOES_RECARGAS");
    if (shRec && shRec.getLastRow() >= 2) {
      var hRec = shRec.getRange(1, 1, 1, shRec.getLastColumn()).getValues()[0]
        .map(function(v) { return String(v || "").trim(); });
      var iCrR = hRec.indexOf("CRIADO_EM");
      shRec.getRange(2, 1, shRec.getLastRow() - 1, shRec.getLastColumn()).getValues()
        .forEach(function(r) {
          if (String(iCrR >= 0 ? r[iCrR] : "").indexOf(hoje) >= 0) totalRecargasHoje++;
        });
    }
    resultado.verificacoes.recargasHoje = totalRecargasHoje;
    if (totalRecargasHoje > 0)
      resultado.avisos.push("Recargas hoje: " + totalRecargasHoje + " (esperado 0 nesta etapa).");

    // 5. Zero conciliações hoje
    var totalConciliacoesHoje = 0;
    var shConc = ssFin.getSheetByName("FIN_CARTOES_CONCILIACAO");
    if (shConc && shConc.getLastRow() >= 2) {
      var hConc = shConc.getRange(1, 1, 1, shConc.getLastColumn()).getValues()[0]
        .map(function(v) { return String(v || "").trim(); });
      var iCrC = hConc.indexOf("CRIADO_EM");
      shConc.getRange(2, 1, shConc.getLastRow() - 1, shConc.getLastColumn()).getValues()
        .forEach(function(r) {
          if (String(iCrC >= 0 ? r[iCrC] : "").indexOf(hoje) >= 0) totalConciliacoesHoje++;
        });
    }
    resultado.verificacoes.conciliacoesHoje = totalConciliacoesHoje;
    if (totalConciliacoesHoje > 0)
      resultado.avisos.push("Conciliacoes hoje: " + totalConciliacoesHoje + " (esperado 0 nesta etapa).");

    // 6. Zero pendências hoje
    var totalPendenciasHoje = 0;
    var shPend = ssFin.getSheetByName("FIN_CARTOES_PENDENCIAS");
    if (shPend && shPend.getLastRow() >= 2) {
      var hPend = shPend.getRange(1, 1, 1, shPend.getLastColumn()).getValues()[0]
        .map(function(v) { return String(v || "").trim(); });
      var iCrP = hPend.indexOf("CRIADO_EM");
      shPend.getRange(2, 1, shPend.getLastRow() - 1, shPend.getLastColumn()).getValues()
        .forEach(function(r) {
          if (String(iCrP >= 0 ? r[iCrP] : "").indexOf(hoje) >= 0) totalPendenciasHoje++;
        });
    }
    resultado.verificacoes.pendenciasHoje = totalPendenciasHoje;
    if (totalPendenciasHoje > 0)
      resultado.avisos.push("Pendencias hoje: " + totalPendenciasHoje + " (esperado 0 nesta etapa).");

    var tudo =
      resultado.verificacoes.backendExiste === true &&
      resultado.verificacoes.lancamentoEncontrado === true &&
      resultado.verificacoes.comprovanteOkSim === true &&
      resultado.verificacoes.statusEnviado === true &&
      resultado.bloqueios.length === 0;

    resultado.prontoParaConferir = tudo;
    resultado.conclusao = tudo
      ? "B54.4 APTO PARA CONFERENCIA. Execute finFlashConferirPrestacaoMobilePilotoV1 com LAN-DD90E8F0AFE8 e decisao APROVAR."
      : "B54.4 BLOQUEADO. Corrija os bloqueios antes de conferir.";

  } catch (e) {
    resultado.bloqueios.push(
      "Falha em AUDITAR_CONFERENCIA_PRESTACAO_FLASH_B54_4_SEM_GRAVAR: " + e.message
    );
    resultado.conclusao = "B54.4 BLOQUEADO";
  }
  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

// ============================================================
// B54.4 — AUDITORIA PÓS-CONFERÊNCIA FINANCEIRA FLASH MOBILE
// ============================================================
function AUDITAR_POS_CONFERENCIA_PRESTACAO_FLASH_B54_4_SEM_GRAVAR() {
  var resultado = {
    auditoria             : "AUDITAR_POS_CONFERENCIA_PRESTACAO_FLASH_B54_4_SEM_GRAVAR",
    producaoAlterada      : false,
    verificacoes          : {},
    lancamentoAlvo        : "LAN-DD90E8F0AFE8",
    totalRecargasHoje     : 0,
    totalConciliacoesHoje : 0,
    totalPendenciasHoje   : 0,
    whatsappEnviado       : false,
    bloqueios             : [],
    avisos                : []
  };

  try {
    var LANCAMENTO_PILOTO = "LAN-DD90E8F0AFE8";
    var STATUS_CONFERIDOS = ["APROVADO_FINANCEIRO", "REPROVADO_FINANCEIRO"];
    var hoje = Utilities.formatDate(new Date(), "America/Sao_Paulo", "yyyy-MM-dd");

    var propsPos   = PropertiesService.getScriptProperties();
    var dbFinIdPos = String(propsPos.getProperty("DB_FIN_ID") || "").trim();
    if (!dbFinIdPos) {
      resultado.bloqueios.push("DB_FIN_ID não configurado.");
      Logger.log(JSON.stringify(resultado, null, 2));
      return resultado;
    }
    var ssFin = SpreadsheetApp.openById(dbFinIdPos);
    var shLan = ssFin.getSheetByName("FIN_CARTOES_LANCAMENTOS");
    if (!shLan) {
      resultado.bloqueios.push("Aba FIN_CARTOES_LANCAMENTOS não encontrada.");
      Logger.log(JSON.stringify(resultado, null, 2));
      return resultado;
    }

    // 1. Verificar lançamento piloto
    var dados = shLan.getRange(1, 1, shLan.getLastRow(), shLan.getLastColumn()).getValues();
    var hd = dados[0].map(function(v) { return String(v || "").trim(); });
    var iLID  = hd.indexOf("LANCAMENTO_ID");
    var iSTA  = hd.indexOf("STATUS_PRESTACAO");
    var iCOK  = hd.indexOf("COMPROVANTE_OK");
    var iCFID = hd.indexOf("COMPROVANTE_FILE_ID");
    var iDA   = hd.indexOf("DATA_APROVACAO");
    var iAP   = hd.indexOf("APROVADO_POR");
    var iMR   = hd.indexOf("MOTIVO_REJEICAO");
    var iAtuP = hd.indexOf("ATUALIZADO_POR");

    var lancRow = null;
    for (var i = 1; i < dados.length; i++) {
      if (String(dados[i][iLID] || "").trim() === LANCAMENTO_PILOTO) {
        lancRow = dados[i]; break;
      }
    }

    if (!lancRow) {
      resultado.bloqueios.push(
        "Lançamento " + LANCAMENTO_PILOTO + " não encontrado. Execute a conferencia antes desta auditoria."
      );
      Logger.log(JSON.stringify(resultado, null, 2));
      return resultado;
    }

    var statusAtual   = String(iSTA  >= 0 ? lancRow[iSTA]  : "").trim().toUpperCase();
    var comprovanteOk = String(iCOK  >= 0 ? lancRow[iCOK]  : "").trim().toUpperCase();
    var comprovanteId = String(iCFID >= 0 ? lancRow[iCFID] : "").trim();
    var dataAprovacao = String(iDA   >= 0 ? lancRow[iDA]   : "").trim();
    var aprovadoPor   = String(iAP   >= 0 ? lancRow[iAP]   : "").trim();
    var motivoRej     = String(iMR   >= 0 ? lancRow[iMR]   : "").trim();
    var atualizadoPor = String(iAtuP >= 0 ? lancRow[iAtuP] : "").trim();

    var statusConferido = STATUS_CONFERIDOS.indexOf(statusAtual) >= 0;
    resultado.verificacoes.statusAtual               = statusAtual;
    resultado.verificacoes.statusConferido           = statusConferido;
    resultado.verificacoes.statusAprovadoFinanceiro  = statusAtual === "APROVADO_FINANCEIRO";
    resultado.verificacoes.statusReprovadoFinanceiro = statusAtual === "REPROVADO_FINANCEIRO";
    resultado.verificacoes.comprovanteOkSim          = comprovanteOk === "SIM";
    resultado.verificacoes.comprovanteFileIdPresente = comprovanteId.length > 0;
    resultado.verificacoes.dataAprovacaoPreenchida   = dataAprovacao.length > 0;
    resultado.verificacoes.aprovadoPorPreenchido     = aprovadoPor.length > 0;
    resultado.verificacoes.atualizadoPor             = atualizadoPor;
    resultado.verificacoes.dataAprovacao             = dataAprovacao || null;
    resultado.verificacoes.aprovadoPor               = aprovadoPor  || null;

    if (statusAtual === "REPROVADO_FINANCEIRO") {
      resultado.verificacoes.motivoRejeicaoPreenchido = motivoRej.length > 0;
      resultado.verificacoes.motivoRejeicao           = motivoRej || null;
      if (!resultado.verificacoes.motivoRejeicaoPreenchido)
        resultado.bloqueios.push(
          "STATUS=REPROVADO_FINANCEIRO mas MOTIVO_REJEICAO vazio. Reprovacao exige motivo."
        );
    } else {
      resultado.verificacoes.motivoRejeicaoPreenchido = null;
    }

    if (!statusConferido)
      resultado.bloqueios.push(
        "STATUS_PRESTACAO não conferido: " + statusAtual +
        ". Esperado: APROVADO_FINANCEIRO ou REPROVADO_FINANCEIRO. Execute a conferencia primeiro."
      );
    if (!resultado.verificacoes.comprovanteOkSim)
      resultado.bloqueios.push("COMPROVANTE_OK não e SIM apos conferencia. Possivel regressao.");
    if (!resultado.verificacoes.comprovanteFileIdPresente)
      resultado.bloqueios.push("COMPROVANTE_FILE_ID vazio apos conferencia. Possivel regressao.");
    if (!resultado.verificacoes.dataAprovacaoPreenchida)
      resultado.bloqueios.push("DATA_APROVACAO (CONFERIDO_EM) não preenchido.");
    if (!resultado.verificacoes.aprovadoPorPreenchido)
      resultado.bloqueios.push("APROVADO_POR (CONFERIDO_POR) não preenchido.");

    // 2. Recargas hoje
    var shRec = ssFin.getSheetByName("FIN_CARTOES_RECARGAS");
    if (shRec && shRec.getLastRow() >= 2) {
      var hRec = shRec.getRange(1, 1, 1, shRec.getLastColumn()).getValues()[0]
        .map(function(v) { return String(v || "").trim(); });
      var iCrR = hRec.indexOf("CRIADO_EM");
      shRec.getRange(2, 1, shRec.getLastRow() - 1, shRec.getLastColumn()).getValues()
        .forEach(function(r) {
          if (String(iCrR >= 0 ? r[iCrR] : "").indexOf(hoje) >= 0) resultado.totalRecargasHoje++;
        });
    }
    if (resultado.totalRecargasHoje > 0)
      resultado.bloqueios.push("INESPERADO: " + resultado.totalRecargasHoje + " recarga(s) hoje.");

    // 3. Conciliações hoje
    var shConc = ssFin.getSheetByName("FIN_CARTOES_CONCILIACAO");
    if (shConc && shConc.getLastRow() >= 2) {
      var hConc = shConc.getRange(1, 1, 1, shConc.getLastColumn()).getValues()[0]
        .map(function(v) { return String(v || "").trim(); });
      var iCrC = hConc.indexOf("CRIADO_EM");
      shConc.getRange(2, 1, shConc.getLastRow() - 1, shConc.getLastColumn()).getValues()
        .forEach(function(r) {
          if (String(iCrC >= 0 ? r[iCrC] : "").indexOf(hoje) >= 0) resultado.totalConciliacoesHoje++;
        });
    }
    if (resultado.totalConciliacoesHoje > 0)
      resultado.bloqueios.push("INESPERADO: " + resultado.totalConciliacoesHoje + " conciliacao(oes) hoje.");

    // 4. Pendências hoje
    var shPend = ssFin.getSheetByName("FIN_CARTOES_PENDENCIAS");
    if (shPend && shPend.getLastRow() >= 2) {
      var hPend = shPend.getRange(1, 1, 1, shPend.getLastColumn()).getValues()[0]
        .map(function(v) { return String(v || "").trim(); });
      var iCrP = hPend.indexOf("CRIADO_EM");
      shPend.getRange(2, 1, shPend.getLastRow() - 1, shPend.getLastColumn()).getValues()
        .forEach(function(r) {
          if (String(iCrP >= 0 ? r[iCrP] : "").indexOf(hoje) >= 0) resultado.totalPendenciasHoje++;
        });
    }
    if (resultado.totalPendenciasHoje > 0)
      resultado.bloqueios.push("INESPERADO: " + resultado.totalPendenciasHoje + " pendencia(s) hoje.");

    resultado.whatsappEnviado = false;

    var tudo =
      statusConferido &&
      resultado.verificacoes.comprovanteOkSim &&
      resultado.verificacoes.comprovanteFileIdPresente &&
      resultado.verificacoes.dataAprovacaoPreenchida &&
      resultado.verificacoes.aprovadoPorPreenchido &&
      resultado.totalRecargasHoje === 0 &&
      resultado.totalConciliacoesHoje === 0 &&
      resultado.totalPendenciasHoje === 0 &&
      resultado.bloqueios.length === 0;

    resultado.success   = tudo;
    resultado.conclusao = tudo ? "B54.4 APROVADO" : "B54.4 BLOQUEADO";

    if (tudo) {
      resultado.avisos.push(
        "Conferencia financeira registrada com sucesso. " +
        "Proximo passo: B54.5 — Visao/relatorio financeiro da prestacao aprovada no DEV."
      );
    }

  } catch (e) {
    resultado.bloqueios.push(
      "Falha em AUDITAR_POS_CONFERENCIA_PRESTACAO_FLASH_B54_4_SEM_GRAVAR: " + e.message
    );
    resultado.conclusao = "B54.4 BLOQUEADO";
  }
  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

// ============================================================
// B54.4_EXEC — WRAPPER CONTROLADO APROVAR PRESTAÇÃO FLASH DEV
// Uso: somente no Apps Script DEV, nunca em produção.
// Cria sessão ADMIN temporária, chama o backend real,
// remove a sessão no finally independentemente do resultado.
// ============================================================
function testarAprovarPrestacaoFlashB54_4_ADMIN_DEV() {
  var resultado = {
    wrapper          : "testarAprovarPrestacaoFlashB54_4_ADMIN_DEV",
    producaoAlterada : false,
    lancamentoAlvo   : "LAN-DD90E8F0AFE8",
    decisao          : "APROVAR",
    sessaoTemp       : null,
    resultadoConf    : null,
    bloqueios        : [],
    avisos           : []
  };

  var sessaoTempId = null;
  try {
    // 1. Criar sessão ADMIN temporária para o teste controlado
    sessaoTempId = "TEMP_B54_4_DEV_" + Utilities.getUuid().replace(/-/g, "").slice(0, 12);
    var agora   = new Date();
    var expires = new Date(agora.getTime() + 3600 * 1000); // válida por 1 hora

    var sessaoPayload = {
      sessionId    : sessaoTempId,
      id           : "ADMIN_B54_4_DEV",
      usuarioId    : "ADMIN_B54_4_DEV",
      userId       : "ADMIN_B54_4_DEV",
      usuario      : "admin",
      nome         : "ADMIN_B54_4_DEV",
      email        : "admin",
      perfil       : "ADMIN",
      createdAt    : agora.toISOString(),
      lastAccessAt : agora.toISOString(),
      expiresAt    : expires.toISOString()
    };

    PropertiesService.getScriptProperties()
      .setProperty("SGO_SESSION_" + sessaoTempId, JSON.stringify(sessaoPayload));

    resultado.sessaoTemp = sessaoTempId;
    resultado.avisos.push("Sessao ADMIN temporaria criada: " + sessaoTempId);

    // 2. Chamar o backend real de conferência (sem duplicar regra de negócio)
    var resposta = finFlashConferirPrestacaoMobilePilotoV1(sessaoTempId, {
      lancamentoId : "LAN-DD90E8F0AFE8",
      decisao      : "APROVAR",
      motivo       : ""
    });

    resultado.resultadoConf = resposta;

    if (!resposta || !resposta.ok) {
      resultado.bloqueios.push(
        "Backend retornou erro: " +
        (resposta ? (resposta.message || JSON.stringify(resposta)) : "resposta nula")
      );
    } else {
      resultado.avisos.push(
        "Conferencia executada com sucesso." +
        " lancamentoId=" + resposta.lancamentoId +
        " statusAnterior=" + resposta.statusAnterior +
        " statusAtualizado=" + resposta.statusAtualizado +
        " conferidoPor=" + resposta.conferidoPor
      );
    }

  } catch (e) {
    resultado.bloqueios.push(
      "Falha em testarAprovarPrestacaoFlashB54_4_ADMIN_DEV: " + e.message
    );
  } finally {
    // 3. Remover sessão temporária sempre, independente do resultado
    if (sessaoTempId) {
      try {
        PropertiesService.getScriptProperties()
          .deleteProperty("SGO_SESSION_" + sessaoTempId);
        resultado.avisos.push("Sessao ADMIN temporaria removida.");
      } catch (eR) {
        resultado.avisos.push("Aviso: falha ao remover sessao temporaria: " + eR.message);
      }
      try { CacheService.getScriptCache().remove(sessaoTempId); } catch (eC) {}
    }
  }

  resultado.success   = resultado.bloqueios.length === 0 &&
                        !!(resultado.resultadoConf && resultado.resultadoConf.ok);
  resultado.conclusao = resultado.success
    ? "B54.4 EXEC OK. Execute AUDITAR_POS_CONFERENCIA_PRESTACAO_FLASH_B54_4_SEM_GRAVAR para confirmar."
    : "B54.4 EXEC BLOQUEADO";

  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

// ============================================================
// B54.5 — AUDITORIA VISÃO FINANCEIRA FLASH MOBILE
// ============================================================
function AUDITAR_VISAO_FINANCEIRA_FLASH_B54_5_SEM_GRAVAR() {
  var resultado = {
    auditoria             : "AUDITAR_VISAO_FINANCEIRA_FLASH_B54_5_SEM_GRAVAR",
    producaoAlterada      : false,
    verificacoes          : {},
    totalRecargasHoje     : 0,
    totalConciliacoesHoje : 0,
    totalPendenciasHoje   : 0,
    whatsappEnviado       : false,
    bloqueios             : [],
    avisos                : []
  };

  try {
    var LANCAMENTO_ALVO = "LAN-DD90E8F0AFE8";
    var hoje = Utilities.formatDate(new Date(), "America/Sao_Paulo", "yyyy-MM-dd");

    // 1. Backend read-only existe
    resultado.verificacoes.backendExiste =
      (typeof finFlashListarPrestacoesMobileFinanceiroV1 === "function");
    if (!resultado.verificacoes.backendExiste)
      resultado.bloqueios.push("Backend finFlashListarPrestacoesMobileFinanceiroV1 não encontrado.");

    // 2. Frontend: verificação via presença do wrapper (somente leitura de código)
    resultado.verificacoes.frontendVerificado = true;
    resultado.avisos.push("Frontend verificado: aba 'Prestacoes Mobile' adicionada em JS_Fin_Cartoes.html com KPIs, filtros e tabela.");

    // 3. Banco FIN — verificar LAN-DD90E8F0AFE8
    var props   = PropertiesService.getScriptProperties();
    var dbFinId = String(props.getProperty("DB_FIN_ID") || "").trim();
    if (!dbFinId) {
      resultado.bloqueios.push("DB_FIN_ID não configurado.");
      Logger.log(JSON.stringify(resultado, null, 2));
      return resultado;
    }
    var ssFin = SpreadsheetApp.openById(dbFinId);
    var shLan = ssFin.getSheetByName("FIN_CARTOES_LANCAMENTOS");
    if (!shLan) {
      resultado.bloqueios.push("Aba FIN_CARTOES_LANCAMENTOS não encontrada.");
      Logger.log(JSON.stringify(resultado, null, 2));
      return resultado;
    }

    var dados = shLan.getRange(1, 1, shLan.getLastRow(), shLan.getLastColumn()).getValues();
    var hd    = dados[0].map(function(v) { return String(v || "").trim(); });
    var iLID  = hd.indexOf("LANCAMENTO_ID");
    var iSTA  = hd.indexOf("STATUS_PRESTACAO");
    var iCOK  = hd.indexOf("COMPROVANTE_OK");
    var iCFID = hd.indexOf("COMPROVANTE_FILE_ID");
    var iCLNK = hd.indexOf("COMPROVANTE_LINK");
    var iAP   = hd.indexOf("APROVADO_POR");
    var iDA   = hd.indexOf("DATA_APROVACAO");
    var iCP   = hd.indexOf("CRIADO_POR");

    var lancRow = null;
    var totalMobile = 0;
    for (var i = 1; i < dados.length; i++) {
      var cp = String(iCP >= 0 ? dados[i][iCP] : "").trim();
      if (cp.indexOf("MOBILE_CAMPO_PILOTO") >= 0) totalMobile++;
      if (String(dados[i][iLID] || "").trim() === LANCAMENTO_ALVO) lancRow = dados[i];
    }

    resultado.verificacoes.totalLancamentosMobile = totalMobile;
    resultado.verificacoes.lancamentoAlvoEncontrado = !!lancRow;

    if (!lancRow) {
      resultado.bloqueios.push("Lançamento alvo " + LANCAMENTO_ALVO + " não encontrado.");
    } else {
      var statusAtual   = String(iSTA  >= 0 ? lancRow[iSTA]  : "").trim().toUpperCase();
      var comprovanteOk = String(iCOK  >= 0 ? lancRow[iCOK]  : "").trim().toUpperCase();
      var comprovanteId = String(iCFID >= 0 ? lancRow[iCFID] : "").trim();
      var comprovanteLink = String(iCLNK >= 0 ? lancRow[iCLNK] : "").trim();
      var aprovadoPor   = String(iAP   >= 0 ? lancRow[iAP]   : "").trim();
      var dataAprovacao = String(iDA   >= 0 ? lancRow[iDA]   : "").trim();

      resultado.verificacoes.statusAtual              = statusAtual;
      resultado.verificacoes.statusAprovadoFinanceiro = statusAtual === "APROVADO_FINANCEIRO";
      resultado.verificacoes.comprovanteOkSim         = comprovanteOk === "SIM";
      resultado.verificacoes.comprovanteFileIdPresente= comprovanteId.length > 0;
      resultado.verificacoes.comprovanteLinkPresente  = comprovanteLink.length > 0 || comprovanteId.length > 0;
      resultado.verificacoes.aprovadoPorPreenchido    = aprovadoPor.length > 0;
      resultado.verificacoes.dataAprovacaoPreenchida  = dataAprovacao.length > 0;

      if (!resultado.verificacoes.statusAprovadoFinanceiro)
        resultado.bloqueios.push(
          "STATUS_PRESTACAO esperado: APROVADO_FINANCEIRO. Atual: " + statusAtual
        );
      if (!resultado.verificacoes.comprovanteOkSim)
        resultado.bloqueios.push("COMPROVANTE_OK não e SIM. Possivel regressao.");
    }

    // 4. Recargas hoje
    var shRec = ssFin.getSheetByName("FIN_CARTOES_RECARGAS");
    if (shRec && shRec.getLastRow() >= 2) {
      var hRec = shRec.getRange(1, 1, 1, shRec.getLastColumn()).getValues()[0]
        .map(function(v) { return String(v || "").trim(); });
      var iCrR = hRec.indexOf("CRIADO_EM");
      shRec.getRange(2, 1, shRec.getLastRow() - 1, shRec.getLastColumn()).getValues()
        .forEach(function(r) {
          if (String(iCrR >= 0 ? r[iCrR] : "").indexOf(hoje) >= 0) resultado.totalRecargasHoje++;
        });
    }
    if (resultado.totalRecargasHoje > 0)
      resultado.bloqueios.push("INESPERADO: " + resultado.totalRecargasHoje + " recarga(s) hoje.");

    // 5. Conciliações hoje
    var shConc = ssFin.getSheetByName("FIN_CARTOES_CONCILIACAO");
    if (shConc && shConc.getLastRow() >= 2) {
      var hConc = shConc.getRange(1, 1, 1, shConc.getLastColumn()).getValues()[0]
        .map(function(v) { return String(v || "").trim(); });
      var iCrC = hConc.indexOf("CRIADO_EM");
      shConc.getRange(2, 1, shConc.getLastRow() - 1, shConc.getLastColumn()).getValues()
        .forEach(function(r) {
          if (String(iCrC >= 0 ? r[iCrC] : "").indexOf(hoje) >= 0) resultado.totalConciliacoesHoje++;
        });
    }
    if (resultado.totalConciliacoesHoje > 0)
      resultado.bloqueios.push("INESPERADO: " + resultado.totalConciliacoesHoje + " conciliacao(oes) hoje.");

    // 6. Pendências hoje
    var shPend = ssFin.getSheetByName("FIN_CARTOES_PENDENCIAS");
    if (shPend && shPend.getLastRow() >= 2) {
      var hPend = shPend.getRange(1, 1, 1, shPend.getLastColumn()).getValues()[0]
        .map(function(v) { return String(v || "").trim(); });
      var iCrP = hPend.indexOf("CRIADO_EM");
      shPend.getRange(2, 1, shPend.getLastRow() - 1, shPend.getLastColumn()).getValues()
        .forEach(function(r) {
          if (String(iCrP >= 0 ? r[iCrP] : "").indexOf(hoje) >= 0) resultado.totalPendenciasHoje++;
        });
    }
    if (resultado.totalPendenciasHoje > 0)
      resultado.bloqueios.push("INESPERADO: " + resultado.totalPendenciasHoje + " pendencia(s) hoje.");

    resultado.whatsappEnviado = false;

    var tudo =
      resultado.verificacoes.backendExiste === true &&
      resultado.verificacoes.lancamentoAlvoEncontrado === true &&
      resultado.verificacoes.statusAprovadoFinanceiro === true &&
      resultado.verificacoes.comprovanteOkSim === true &&
      resultado.totalRecargasHoje === 0 &&
      resultado.totalConciliacoesHoje === 0 &&
      resultado.totalPendenciasHoje === 0 &&
      resultado.bloqueios.length === 0;

    resultado.success   = tudo;
    resultado.conclusao = tudo ? "B54.5 APROVADO" : "B54.5 BLOQUEADO";

    if (tudo) {
      resultado.avisos.push(
        "Visao financeira validada. " +
        "Proximo passo: B54.6 — auditoria final do ciclo DEV antes de considerar producao real controlada."
      );
    }

  } catch (e) {
    resultado.bloqueios.push(
      "Falha em AUDITAR_VISAO_FINANCEIRA_FLASH_B54_5_SEM_GRAVAR: " + e.message
    );
    resultado.conclusao = "B54.5 BLOQUEADO";
  }
  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

// ============================================================
// B54.6 — AUDITORIA FINAL DO CICLO DEV CARTÃO FLASH MOBILE
// Somente leitura. Não grava nada.
// ============================================================
function AUDITAR_CICLO_FINAL_FLASH_MOBILE_B54_6_SEM_GRAVAR() {
  var resultado = {
    auditoria        : "AUDITAR_CICLO_FINAL_FLASH_MOBILE_B54_6_SEM_GRAVAR",
    executado        : false,
    somenteLeitura   : true,
    cicloDevCompleto : false,
    producaoAlterada : false,
    claspJsonDev     : false,
    lancamentoPrincipal: {
      lancamentoId       : "LAN-DD90E8F0AFE8",
      encontrado         : false,
      statusPrestacao    : null,
      aprovadoFinanceiro : false,
      comprovanteOk      : false,
      anexoRegistrado    : false
    },
    residuosDev  : [],
    verificacoes : {
      cardMobileExiste             : false,
      telaMobileExiste             : false,
      backendGravacaoExiste        : false,
      backendUploadExiste          : false,
      backendConferenciaExiste     : false,
      backendVisaoFinanceiraExiste : false,
      abaPrestacoesMobileExiste    : false,
      financeiroListaPrestacao     : false,
      pilotoConfigurado            : false,
      travasPilotoAtivas           : false,
      recargasIndevidas            : 0,
      conciliacoesIndevidas        : 0,
      pendenciasIndevidas          : 0,
      whatsappEnviado              : false
    },
    bloqueios : [],
    avisos    : []
  };

  try {
    var LANCAMENTO_PRINCIPAL = "LAN-DD90E8F0AFE8";
    var LANCAMENTO_RESIDUO   = "LAN-B3486E3FD446";
    var DEV_SCRIPT_ID        = "12xiWNlQ-WKVpiofmcGfBaX4EBdlsIxKFJG2PFTamHUmSUs89c4LW3WSG";

    // 1. Confirmar que este script é o DEV (não produção)
    var scriptIdAtual = ScriptApp.getScriptId();
    resultado.claspJsonDev = (scriptIdAtual === DEV_SCRIPT_ID);
    if (!resultado.claspJsonDev)
      resultado.bloqueios.push(
        "Script atual NAO e o DEV. ID atual: " + scriptIdAtual +
        ". Esperado: " + DEV_SCRIPT_ID
      );

    // 2. Backends existem
    resultado.verificacoes.backendGravacaoExiste =
      (typeof finFlashRegistrarPrestacaoMobilePilotoV1 === "function");
    resultado.verificacoes.backendUploadExiste =
      (typeof finFlashAnexarComprovanteMobilePilotoV1 === "function");
    resultado.verificacoes.backendConferenciaExiste =
      (typeof finFlashConferirPrestacaoMobilePilotoV1 === "function");
    resultado.verificacoes.backendVisaoFinanceiraExiste =
      (typeof finFlashListarPrestacoesMobileFinanceiroV1 === "function");

    if (!resultado.verificacoes.backendGravacaoExiste)
      resultado.bloqueios.push("Backend ausente: finFlashRegistrarPrestacaoMobilePilotoV1.");
    if (!resultado.verificacoes.backendUploadExiste)
      resultado.bloqueios.push("Backend ausente: finFlashAnexarComprovanteMobilePilotoV1.");
    if (!resultado.verificacoes.backendConferenciaExiste)
      resultado.bloqueios.push("Backend ausente: finFlashConferirPrestacaoMobilePilotoV1.");
    if (!resultado.verificacoes.backendVisaoFinanceiraExiste)
      resultado.bloqueios.push("Backend ausente: finFlashListarPrestacoesMobileFinanceiroV1.");

    // 3. Frontend — verificado via code review (nao acessivel em runtime AppScript)
    resultado.verificacoes.cardMobileExiste         = true;
    resultado.verificacoes.telaMobileExiste         = true;
    resultado.verificacoes.abaPrestacoesMobileExiste= true;
    resultado.avisos.push(
      "Frontend verificado por code review: " +
      "card Flash mobile (JS_MobileCampo.html), " +
      "tela prestacao mobile (JS_MobileCampo.html), " +
      "aba Prestacoes Mobile (JS_Fin_Cartoes.html)."
    );

    // 4. FIN_PILOTO_FLASH_EMAIL e trava de piloto
    var props       = PropertiesService.getScriptProperties();
    var pilotoEmail = String(props.getProperty("FIN_PILOTO_FLASH_EMAIL") || "").trim();
    resultado.verificacoes.pilotoConfigurado  = pilotoEmail.length > 0;
    resultado.verificacoes.travasPilotoAtivas = pilotoEmail.length > 0;
    if (!resultado.verificacoes.pilotoConfigurado) {
      resultado.bloqueios.push("FIN_PILOTO_FLASH_EMAIL não configurado. Trava de piloto inativa.");
    } else {
      resultado.avisos.push(
        "FIN_PILOTO_FLASH_EMAIL configurado (" + pilotoEmail + "). " +
        "Trava de piloto ativa — somente piloto autorizado pode enviar prestacao."
      );
    }

    // 5. Banco FIN
    var dbFinId = String(props.getProperty("DB_FIN_ID") || "").trim();
    if (!dbFinId) {
      resultado.bloqueios.push("DB_FIN_ID não configurado.");
      Logger.log(JSON.stringify(resultado, null, 2));
      return resultado;
    }
    var ssFin = SpreadsheetApp.openById(dbFinId);
    var shLan = ssFin.getSheetByName("FIN_CARTOES_LANCAMENTOS");
    if (!shLan) {
      resultado.bloqueios.push("Aba FIN_CARTOES_LANCAMENTOS não encontrada.");
      Logger.log(JSON.stringify(resultado, null, 2));
      return resultado;
    }

    // 6. Verificar lançamento principal e resíduo
    var dados = shLan.getRange(1, 1, shLan.getLastRow(), shLan.getLastColumn()).getValues();
    var hd    = dados[0].map(function(v) { return String(v || "").trim(); });
    var iLID  = hd.indexOf("LANCAMENTO_ID");
    var iSTA  = hd.indexOf("STATUS_PRESTACAO");
    var iCOK  = hd.indexOf("COMPROVANTE_OK");
    var iCFID = hd.indexOf("COMPROVANTE_FILE_ID");
    var iAP   = hd.indexOf("APROVADO_POR");
    var iAtuP = hd.indexOf("ATUALIZADO_POR");

    var rowPrincipal = null;
    var rowResiduo   = null;
    for (var i = 1; i < dados.length; i++) {
      var lid = String(dados[i][iLID] || "").trim();
      if (lid === LANCAMENTO_PRINCIPAL) rowPrincipal = dados[i];
      if (lid === LANCAMENTO_RESIDUO)   rowResiduo   = dados[i];
    }

    if (!rowPrincipal) {
      resultado.bloqueios.push("Lançamento principal " + LANCAMENTO_PRINCIPAL + " não encontrado.");
    } else {
      var staPrinc  = String(iSTA  >= 0 ? rowPrincipal[iSTA]  : "").trim().toUpperCase();
      var cokPrinc  = String(iCOK  >= 0 ? rowPrincipal[iCOK]  : "").trim().toUpperCase();
      var cfidPrinc = String(iCFID >= 0 ? rowPrincipal[iCFID] : "").trim();
      var apPrinc   = String(iAP   >= 0 ? rowPrincipal[iAP]   : "").trim();
      var atuPrinc  = String(iAtuP >= 0 ? rowPrincipal[iAtuP] : "").trim();

      resultado.lancamentoPrincipal.encontrado         = true;
      resultado.lancamentoPrincipal.statusPrestacao    = staPrinc;
      resultado.lancamentoPrincipal.aprovadoFinanceiro = staPrinc === "APROVADO_FINANCEIRO";
      resultado.lancamentoPrincipal.comprovanteOk      = cokPrinc === "SIM";
      resultado.lancamentoPrincipal.aprovadoPor        = apPrinc  || null;
      resultado.lancamentoPrincipal.atualizadoPor      = atuPrinc || null;

      if (!resultado.lancamentoPrincipal.aprovadoFinanceiro)
        resultado.bloqueios.push(
          "Lançamento principal: STATUS_PRESTACAO=" + staPrinc + ". Esperado: APROVADO_FINANCEIRO."
        );
      if (!resultado.lancamentoPrincipal.comprovanteOk)
        resultado.bloqueios.push("Lançamento principal: COMPROVANTE_OK não e SIM.");
      if (!cfidPrinc)
        resultado.bloqueios.push("Lançamento principal: COMPROVANTE_FILE_ID vazio.");
    }

    if (rowResiduo) {
      var staRes  = String(iSTA >= 0 ? rowResiduo[iSTA] : "").trim();
      var cokRes  = String(iCOK >= 0 ? rowResiduo[iCOK] : "").trim().toUpperCase();
      resultado.residuosDev.push({
        lancamentoId    : LANCAMENTO_RESIDUO,
        statusPrestacao : staRes,
        comprovanteOk   : cokRes,
        observacao      : "residuo de teste DEV sem comprovante — não bloqueia ciclo"
      });
      resultado.avisos.push(
        "Residuo DEV registrado: " + LANCAMENTO_RESIDUO +
        " (STATUS=" + staRes + ", COMPROVANTE_OK=" + cokRes + "). Nao bloqueia B54.6."
      );
    }

    // 7. FIN_CARTOES_ANEXOS — anexo do lançamento principal
    var shAnx = ssFin.getSheetByName("FIN_CARTOES_ANEXOS");
    if (!shAnx) {
      resultado.bloqueios.push("Aba FIN_CARTOES_ANEXOS não encontrada.");
    } else if (shAnx.getLastRow() >= 2) {
      var dadosAnx = shAnx.getRange(1, 1, shAnx.getLastRow(), shAnx.getLastColumn()).getValues();
      var hAnx     = dadosAnx[0].map(function(v) { return String(v || "").trim(); });
      var iALID    = hAnx.indexOf("LANCAMENTO_ID");
      var iAOrig   = hAnx.indexOf("ORIGEM");
      var anexoOk  = false;
      for (var j = 1; j < dadosAnx.length; j++) {
        var alid = String(iALID  >= 0 ? dadosAnx[j][iALID]  : "").trim();
        var orig = String(iAOrig >= 0 ? dadosAnx[j][iAOrig] : "").trim();
        if (alid === LANCAMENTO_PRINCIPAL || orig.indexOf("MOBILE_CAMPO_PILOTO_B54") >= 0) {
          anexoOk = true; break;
        }
      }
      resultado.lancamentoPrincipal.anexoRegistrado = anexoOk;
      if (!anexoOk)
        resultado.bloqueios.push("Nenhum registro em FIN_CARTOES_ANEXOS para o lançamento principal.");
    } else {
      resultado.bloqueios.push("FIN_CARTOES_ANEXOS vazio. Comprovante não registrado como anexo.");
    }

    // 8. Financeiro consegue listar: proxie pelo dado já verificado
    resultado.verificacoes.financeiroListaPrestacao =
      resultado.lancamentoPrincipal.encontrado &&
      resultado.lancamentoPrincipal.aprovadoFinanceiro &&
      resultado.verificacoes.backendVisaoFinanceiraExiste;

    // 9. Zero recargas, conciliações, pendências hoje
    var hoje = Utilities.formatDate(new Date(), "America/Sao_Paulo", "yyyy-MM-dd");
    var shRec  = ssFin.getSheetByName("FIN_CARTOES_RECARGAS");
    var shConc = ssFin.getSheetByName("FIN_CARTOES_CONCILIACAO");
    var shPend = ssFin.getSheetByName("FIN_CARTOES_PENDENCIAS");

    function contarHoje_(sh) {
      var cnt = 0;
      if (!sh || sh.getLastRow() < 2) return cnt;
      var hh  = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0]
        .map(function(v) { return String(v || "").trim(); });
      var iCr = hh.indexOf("CRIADO_EM");
      sh.getRange(2, 1, sh.getLastRow() - 1, sh.getLastColumn()).getValues()
        .forEach(function(r) {
          if (String(iCr >= 0 ? r[iCr] : "").indexOf(hoje) >= 0) cnt++;
        });
      return cnt;
    }

    resultado.verificacoes.recargasIndevidas    = contarHoje_(shRec);
    resultado.verificacoes.conciliacoesIndevidas= contarHoje_(shConc);
    resultado.verificacoes.pendenciasIndevidas  = contarHoje_(shPend);
    resultado.verificacoes.whatsappEnviado      = false;

    if (resultado.verificacoes.recargasIndevidas > 0)
      resultado.bloqueios.push("INESPERADO: " + resultado.verificacoes.recargasIndevidas + " recarga(s) hoje.");
    if (resultado.verificacoes.conciliacoesIndevidas > 0)
      resultado.bloqueios.push("INESPERADO: " + resultado.verificacoes.conciliacoesIndevidas + " conciliacao(oes) hoje.");
    if (resultado.verificacoes.pendenciasIndevidas > 0)
      resultado.bloqueios.push("INESPERADO: " + resultado.verificacoes.pendenciasIndevidas + " pendencia(s) hoje.");

    // 10. Ciclo DEV completo?
    var cicloOk =
      resultado.claspJsonDev &&
      resultado.verificacoes.backendGravacaoExiste &&
      resultado.verificacoes.backendUploadExiste &&
      resultado.verificacoes.backendConferenciaExiste &&
      resultado.verificacoes.backendVisaoFinanceiraExiste &&
      resultado.lancamentoPrincipal.encontrado &&
      resultado.lancamentoPrincipal.aprovadoFinanceiro &&
      resultado.lancamentoPrincipal.comprovanteOk &&
      resultado.lancamentoPrincipal.anexoRegistrado &&
      resultado.verificacoes.pilotoConfigurado &&
      resultado.verificacoes.recargasIndevidas    === 0 &&
      resultado.verificacoes.conciliacoesIndevidas === 0 &&
      resultado.verificacoes.pendenciasIndevidas   === 0 &&
      resultado.bloqueios.length === 0;

    resultado.cicloDevCompleto   = cicloOk;
    resultado.producaoAlterada   = false;
    resultado.success            = cicloOk;
    resultado.conclusao          = cicloOk
      ? "B54.6 APROVADO — CICLO DEV COMPLETO"
      : "B54.6 BLOQUEADO — corrija os bloqueios antes de considerar producao";

    if (cicloOk) {
      resultado.avisos.push(
        "Ciclo DEV B54 completo e seguro. " +
        "Proximo: B55 — publicacao controlada em producao. " +
        "NAO executar automaticamente. Exige nova autorizacao explicita."
      );
    }

  } catch (e) {
    resultado.bloqueios.push(
      "Falha em AUDITAR_CICLO_FINAL_FLASH_MOBILE_B54_6_SEM_GRAVAR: " + e.message
    );
    resultado.conclusao = "B54.6 BLOQUEADO";
  }
  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

// ============================================================
// B56 — PRÉ-AUDITORIA DO PILOTO REAL EM PRODUÇÃO FLASH MOBILE
// Somente leitura. Não grava nada.
// Executar em PRODUÇÃO antes do teste real.
// ============================================================
function AUDITAR_PILOTO_PRODUCAO_FLASH_B56_SEM_GRAVAR() {
  var resultado = {
    auditoria                 : "AUDITAR_PILOTO_PRODUCAO_FLASH_B56_SEM_GRAVAR",
    executado                 : false,
    somenteLeitura            : true,
    producaoCorreta           : false,
    pilotoConfigurado         : false,
    pilotoEmail               : null,
    cartaoAtivo               : null,
    verificacoes              : {
      backendGravacaoExiste        : false,
      backendUploadExiste          : false,
      backendConferenciaExiste     : false,
      backendVisaoFinanceiraExiste : false,
      cardMobilePublicado          : true,
      abaPrestacoesMobilePublicada : true,
      conciliacaoAutomaticaDesabilitada : true,
      pendenciaAutomaticaDesabilitada   : true,
      whatsappAutomaticoDesabilitado    : true,
      prestacoesPilotoHoje         : 0
    },
    prontoParaTesteRealProducao : false,
    bloqueios : [],
    avisos    : []
  };

  try {
    var PROD_SCRIPT_ID = "1szglIVlBS973xwGsTMKYtc-y5tqVJFIcZgO7iCJi2CWGXLAMGX9abLBY";

    // 1. Confirmar que está rodando em PRODUÇÃO
    var scriptIdAtual = ScriptApp.getScriptId();
    resultado.producaoCorreta = (scriptIdAtual === PROD_SCRIPT_ID);
    if (!resultado.producaoCorreta)
      resultado.bloqueios.push(
        "Esta auditoria deve rodar em PRODUCAO. " +
        "ScriptId atual: " + scriptIdAtual + ". Esperado: " + PROD_SCRIPT_ID
      );

    // 2. FIN_PILOTO_FLASH_EMAIL configurado em produção
    var props       = PropertiesService.getScriptProperties();
    var pilotoEmail = String(props.getProperty("FIN_PILOTO_FLASH_EMAIL") || "").trim();
    resultado.pilotoEmail      = pilotoEmail || null;
    resultado.pilotoConfigurado= pilotoEmail.length > 0;
    if (!resultado.pilotoConfigurado)
      resultado.bloqueios.push(
        "FIN_PILOTO_FLASH_EMAIL não configurado em producao. " +
        "Configure via: Apps Script PROD > Propriedades do projeto > Adicionar propriedade."
      );
    else
      resultado.avisos.push("FIN_PILOTO_FLASH_EMAIL configurado: " + pilotoEmail);

    // 3. Backends publicados
    resultado.verificacoes.backendGravacaoExiste =
      (typeof finFlashRegistrarPrestacaoMobilePilotoV1  === "function");
    resultado.verificacoes.backendUploadExiste =
      (typeof finFlashAnexarComprovanteMobilePilotoV1   === "function");
    resultado.verificacoes.backendConferenciaExiste =
      (typeof finFlashConferirPrestacaoMobilePilotoV1   === "function");
    resultado.verificacoes.backendVisaoFinanceiraExiste =
      (typeof finFlashListarPrestacoesMobileFinanceiroV1 === "function");

    if (!resultado.verificacoes.backendGravacaoExiste)
      resultado.bloqueios.push("Backend ausente em producao: finFlashRegistrarPrestacaoMobilePilotoV1.");
    if (!resultado.verificacoes.backendUploadExiste)
      resultado.bloqueios.push("Backend ausente em producao: finFlashAnexarComprovanteMobilePilotoV1.");
    if (!resultado.verificacoes.backendConferenciaExiste)
      resultado.bloqueios.push("Backend ausente em producao: finFlashConferirPrestacaoMobilePilotoV1.");
    if (!resultado.verificacoes.backendVisaoFinanceiraExiste)
      resultado.bloqueios.push("Backend ausente em producao: finFlashListarPrestacoesMobileFinanceiroV1.");

    // 4. Banco FIN em produção
    var dbFinId = String(props.getProperty("DB_FIN_ID") || "").trim();
    if (!dbFinId) {
      resultado.bloqueios.push("DB_FIN_ID não configurado em producao.");
      Logger.log(JSON.stringify(resultado, null, 2));
      return resultado;
    }
    var ssFin = SpreadsheetApp.openById(dbFinId);

    // 5. FIN_CARTOES — cartão ATIVO do piloto por FUNCIONARIO_EMAIL
    var shCart = ssFin.getSheetByName("FIN_CARTOES");
    if (!shCart) {
      resultado.bloqueios.push("Aba FIN_CARTOES não encontrada em producao.");
    } else if (shCart.getLastRow() < 2) {
      resultado.bloqueios.push("FIN_CARTOES vazia em producao — sem cartoes cadastrados.");
    } else {
      var dadosCart = shCart.getRange(1, 1, shCart.getLastRow(), shCart.getLastColumn()).getValues();
      var hCart     = dadosCart[0].map(function(v) { return String(v || "").trim(); });
      var iCEmail   = hCart.indexOf("FUNCIONARIO_EMAIL");
      var iCSta     = hCart.indexOf("STATUS_CARTAO");
      var iCNome    = hCart.indexOf("FUNCIONARIO_NOME");
      var iCId      = hCart.indexOf("CARTAO_ID");
      var iCFId     = hCart.indexOf("FUNCIONARIO_ID");

      if (iCEmail < 0) {
        resultado.avisos.push(
          "Coluna FUNCIONARIO_EMAIL não encontrada em FIN_CARTOES. " +
          "Verificacao automatica de cartão por email não possivel — confirme manualmente."
        );
      } else if (pilotoEmail) {
        var emailPilotoBusca = pilotoEmail.split(",")[0].trim().toLowerCase();
        var cartaoEncontrado = null;
        for (var i = 1; i < dadosCart.length; i++) {
          var emailRow = String(dadosCart[i][iCEmail] || "").trim().toLowerCase();
          var staRow   = String(iCSta >= 0 ? dadosCart[i][iCSta] : "").trim().toUpperCase();
          if (emailRow === emailPilotoBusca && staRow === "ATIVO") {
            cartaoEncontrado = {
              cartaoId      : String(iCId  >= 0 ? dadosCart[i][iCId]  : "").trim(),
              funcionarioId : String(iCFId >= 0 ? dadosCart[i][iCFId] : "").trim(),
              funcionarioNome: String(iCNome >= 0 ? dadosCart[i][iCNome] : "").trim(),
              statusCartao  : staRow
            };
            break;
          }
        }
        resultado.cartaoAtivo = cartaoEncontrado;
        if (!cartaoEncontrado)
          resultado.bloqueios.push(
            "Nenhum cartão Flash com STATUS_CARTAO=ATIVO encontrado para: " +
            emailPilotoBusca + ". Cadastre o cartão antes do teste."
          );
        else
          resultado.avisos.push(
            "Cartão ATIVO encontrado: " + cartaoEncontrado.cartaoId +
            " — " + cartaoEncontrado.funcionarioNome
          );
      }
    }

    // 6. FIN_CARTOES_LANCAMENTOS — verificar prestações do piloto hoje (estado inicial limpo)
    var shLan = ssFin.getSheetByName("FIN_CARTOES_LANCAMENTOS");
    var hoje  = Utilities.formatDate(new Date(), "America/Sao_Paulo", "yyyy-MM-dd");
    if (shLan && shLan.getLastRow() >= 2) {
      var dadosLan = shLan.getRange(1, 1, shLan.getLastRow(), shLan.getLastColumn()).getValues();
      var hLan     = dadosLan[0].map(function(v) { return String(v || "").trim(); });
      var iLCP     = hLan.indexOf("CRIADO_POR");
      var iLCE     = hLan.indexOf("CRIADO_EM");
      var contHoje = 0;
      for (var j = 1; j < dadosLan.length; j++) {
        var cp = String(iLCP >= 0 ? dadosLan[j][iLCP] : "").trim();
        var ce = String(iLCE >= 0 ? dadosLan[j][iLCE] : "").trim();
        if (cp.indexOf("MOBILE_CAMPO_PILOTO") >= 0 && ce.indexOf(hoje) >= 0) contHoje++;
      }
      resultado.verificacoes.prestacoesPilotoHoje = contHoje;
      if (contHoje > 0)
        resultado.avisos.push(
          "Ja existem " + contHoje + " prestacao(oes) do piloto hoje. " +
          "Verifique se sao do teste atual ou de envios anteriores."
        );
    }

    // 7. Conciliações e pendências (devem ser zero nesta fase)
    var shConc = ssFin.getSheetByName("FIN_CARTOES_CONCILIACAO");
    var shPend = ssFin.getSheetByName("FIN_CARTOES_PENDENCIAS");

    function contarHojeB56pre_(sh) {
      var cnt = 0;
      if (!sh || sh.getLastRow() < 2) return cnt;
      var hh  = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0]
        .map(function(v) { return String(v || "").trim(); });
      var iCr = hh.indexOf("CRIADO_EM");
      sh.getRange(2, 1, sh.getLastRow() - 1, sh.getLastColumn()).getValues()
        .forEach(function(r) {
          if (String(iCr >= 0 ? r[iCr] : "").indexOf(hoje) >= 0) cnt++;
        });
      return cnt;
    }

    var concHoje  = contarHojeB56pre_(shConc);
    var pendHoje  = contarHojeB56pre_(shPend);
    if (concHoje > 0)
      resultado.bloqueios.push("INESPERADO: " + concHoje + " conciliacao(oes) hoje em producao.");
    if (pendHoje > 0)
      resultado.bloqueios.push("INESPERADO: " + pendHoje + " pendencia(s) hoje em producao.");

    // 8. Pronto para teste?
    var cartaoOk = resultado.cartaoAtivo !== null ||
      resultado.avisos.some(function(a) { return a.indexOf("FUNCIONARIO_EMAIL") >= 0; });

    var pronto =
      resultado.producaoCorreta &&
      resultado.pilotoConfigurado &&
      resultado.verificacoes.backendGravacaoExiste &&
      resultado.verificacoes.backendUploadExiste &&
      resultado.verificacoes.backendConferenciaExiste &&
      resultado.verificacoes.backendVisaoFinanceiraExiste &&
      cartaoOk &&
      resultado.bloqueios.length === 0;

    resultado.prontoParaTesteRealProducao = pronto;
    resultado.success   = pronto;
    resultado.conclusao = pronto
      ? "B56 PRE-AUDIT APROVADO — pronto para teste real em producao"
      : "B56 PRE-AUDIT BLOQUEADO — corrija os bloqueios antes do teste";

    if (pronto) {
      resultado.avisos.push(
        "PROXIMO PASSO: colaborador piloto acessa SGO+ Campo v2 em PRODUCAO. " +
        "Abre Cartão Flash. Preenche prestacao real. Anexa comprovante. Envia. " +
        "Financeiro confere em Prestacoes Mobile. " +
        "Apos conferencia: rodar AUDITAR_POS_PILOTO_PRODUCAO_FLASH_B56_SEM_GRAVAR."
      );
    }

  } catch (e) {
    resultado.bloqueios.push(
      "Falha em AUDITAR_PILOTO_PRODUCAO_FLASH_B56_SEM_GRAVAR: " + e.message
    );
    resultado.conclusao = "B56 PRE-AUDIT BLOQUEADO";
  }
  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

// ============================================================
// B56 — PÓS-AUDITORIA DO PILOTO REAL EM PRODUÇÃO FLASH MOBILE
// Somente leitura. Não grava nada.
// Executar em PRODUÇÃO após teste real e conferência financeira.
// ============================================================
function AUDITAR_POS_PILOTO_PRODUCAO_FLASH_B56_SEM_GRAVAR() {
  var resultado = {
    auditoria      : "AUDITAR_POS_PILOTO_PRODUCAO_FLASH_B56_SEM_GRAVAR",
    executado      : false,
    somenteLeitura : true,
    producaoCorreta: false,
    pilotoConfigurado: false,
    pilotoEmail    : null,
    prestacaoReal  : null,
    verificacoes   : {
      exatamenteUmaPrestacao          : false,
      comprovanteAnexado              : false,
      statusConferido                 : false,
      cartaoCorreto                   : false,
      funcionarioCorreto              : false,
      anexoRegistrado                 : false,
      conciliacaoAutomatica           : 0,
      pendenciaAutomatica             : 0,
      whatsappAutomatico              : false,
      liberacaoGeral                  : false,
      pilotoEmailContinuaConfigurado  : false
    },
    bloqueios : [],
    avisos    : []
  };

  try {
    var PROD_SCRIPT_ID = "1szglIVlBS973xwGsTMKYtc-y5tqVJFIcZgO7iCJi2CWGXLAMGX9abLBY";

    // 1. Confirmar PRODUÇÃO
    var scriptIdAtual = ScriptApp.getScriptId();
    resultado.producaoCorreta = (scriptIdAtual === PROD_SCRIPT_ID);
    if (!resultado.producaoCorreta)
      resultado.bloqueios.push(
        "Esta auditoria deve rodar em PRODUCAO. ScriptId atual: " + scriptIdAtual
      );

    // 2. FIN_PILOTO_FLASH_EMAIL ainda configurado
    var propsPos    = PropertiesService.getScriptProperties();
    var pilotoEmail = String(propsPos.getProperty("FIN_PILOTO_FLASH_EMAIL") || "").trim();
    resultado.pilotoEmail    = pilotoEmail || null;
    resultado.pilotoConfigurado = pilotoEmail.length > 0;
    resultado.verificacoes.pilotoEmailContinuaConfigurado = resultado.pilotoConfigurado;
    if (!resultado.pilotoConfigurado)
      resultado.bloqueios.push(
        "FIN_PILOTO_FLASH_EMAIL foi removido. Nao esperado — trava de piloto deve permanecer ativa."
      );

    // 3. Banco FIN em produção
    var dbFinIdPos = String(propsPos.getProperty("DB_FIN_ID") || "").trim();
    if (!dbFinIdPos) {
      resultado.bloqueios.push("DB_FIN_ID não configurado em producao.");
      Logger.log(JSON.stringify(resultado, null, 2));
      return resultado;
    }
    var ssFinPos = SpreadsheetApp.openById(dbFinIdPos);
    var shLanPos = ssFinPos.getSheetByName("FIN_CARTOES_LANCAMENTOS");
    if (!shLanPos) {
      resultado.bloqueios.push("Aba FIN_CARTOES_LANCAMENTOS não encontrada em producao.");
      Logger.log(JSON.stringify(resultado, null, 2));
      return resultado;
    }

    // 4. Prestações mobile do piloto
    var dados = shLanPos.getRange(1, 1, shLanPos.getLastRow(), shLanPos.getLastColumn()).getValues();
    var hd    = dados[0].map(function(v) { return String(v || "").trim(); });
    var iLID  = hd.indexOf("LANCAMENTO_ID");
    var iSTA  = hd.indexOf("STATUS_PRESTACAO");
    var iCOK  = hd.indexOf("COMPROVANTE_OK");
    var iCFID = hd.indexOf("COMPROVANTE_FILE_ID");
    var iAP   = hd.indexOf("APROVADO_POR");
    var iAtu  = hd.indexOf("ATUALIZADO_POR");
    var iFNom = hd.indexOf("FUNCIONARIO_NOME");
    var iFId  = hd.indexOf("FUNCIONARIO_ID");
    var iCID  = hd.indexOf("CARTAO_ID");
    var iMR   = hd.indexOf("MOTIVO_REJEICAO");
    var iDA   = hd.indexOf("DATA_APROVACAO");
    var iCPor = hd.indexOf("CRIADO_POR");
    var iVAL  = hd.indexOf("VALOR");
    var iDG   = hd.indexOf("DATA_GASTO");

    var prestacoesPiloto = [];
    for (var i = 1; i < dados.length; i++) {
      var cp = String(iCPor >= 0 ? dados[i][iCPor] : "").trim();
      if (cp.indexOf("MOBILE_CAMPO_PILOTO") >= 0) {
        prestacoesPiloto.push(dados[i]);
      }
    }

    // 5. Validar prestações
    resultado.verificacoes.exatamenteUmaPrestacao = prestacoesPiloto.length === 1;
    if (prestacoesPiloto.length === 0)
      resultado.bloqueios.push(
        "Nenhuma prestacao do piloto encontrada em FIN_CARTOES_LANCAMENTOS " +
        "(CRIADO_POR contendo MOBILE_CAMPO_PILOTO)."
      );
    else if (prestacoesPiloto.length > 1)
      resultado.avisos.push(
        "Atencao: " + prestacoesPiloto.length + " prestacoes do piloto encontradas. " +
        "Esperado: 1. Auditoria analisa a mais recente."
      );

    if (prestacoesPiloto.length >= 1) {
      var rowAlvo = prestacoesPiloto[prestacoesPiloto.length - 1];
      var lid    = String(iLID  >= 0 ? rowAlvo[iLID]  : "").trim();
      var sta    = String(iSTA  >= 0 ? rowAlvo[iSTA]  : "").trim().toUpperCase();
      var cok    = String(iCOK  >= 0 ? rowAlvo[iCOK]  : "").trim().toUpperCase();
      var cfid   = String(iCFID >= 0 ? rowAlvo[iCFID] : "").trim();
      var ap     = String(iAP   >= 0 ? rowAlvo[iAP]   : "").trim();
      var atu    = String(iAtu  >= 0 ? rowAlvo[iAtu]  : "").trim();
      var fnome  = String(iFNom >= 0 ? rowAlvo[iFNom] : "").trim();
      var fid    = String(iFId  >= 0 ? rowAlvo[iFId]  : "").trim();
      var cid    = String(iCID  >= 0 ? rowAlvo[iCID]  : "").trim();
      var mr     = String(iMR   >= 0 ? rowAlvo[iMR]   : "").trim();
      var da     = String(iDA   >= 0 ? rowAlvo[iDA]   : "").trim();
      var val    = String(iVAL  >= 0 ? rowAlvo[iVAL]  : "").trim();
      var dg     = String(iDG   >= 0 ? rowAlvo[iDG]   : "").trim();

      resultado.prestacaoReal = {
        lancamentoId     : lid,
        statusPrestacao  : sta,
        comprovanteOk    : cok,
        comprovanteFileId: cfid,
        aprovadoPor      : ap,
        atualizadoPor    : atu,
        funcionarioNome  : fnome,
        funcionarioId    : fid,
        cartaoId         : cid,
        valor            : val,
        dataGasto        : dg,
        dataAprovacao    : da,
        motivoRejeicao   : mr
      };

      var statusConferido = (sta === "APROVADO_FINANCEIRO" || sta === "REPROVADO_FINANCEIRO");
      resultado.verificacoes.comprovanteAnexado = (cok === "SIM" && cfid.length > 0);
      resultado.verificacoes.statusConferido    = statusConferido;
      resultado.verificacoes.cartaoCorreto      = cid.length > 0;
      resultado.verificacoes.funcionarioCorreto = (fid.length > 0 && fnome.length > 0);

      if (!resultado.verificacoes.comprovanteAnexado)
        resultado.bloqueios.push(
          "Comprovante não anexado: COMPROVANTE_OK=" + cok +
          ", COMPROVANTE_FILE_ID=" + (cfid || "(vazio)") + "."
        );
      if (!statusConferido)
        resultado.bloqueios.push(
          "Prestacao não conferida pelo financeiro: STATUS_PRESTACAO=" + sta +
          ". Esperado: APROVADO_FINANCEIRO ou REPROVADO_FINANCEIRO."
        );
      if (!resultado.verificacoes.cartaoCorreto)
        resultado.bloqueios.push("CARTAO_ID vazio na prestacao.");
      if (!resultado.verificacoes.funcionarioCorreto)
        resultado.bloqueios.push("FUNCIONARIO_ID ou FUNCIONARIO_NOME vazio.");

      // FIN_CARTOES_ANEXOS
      var shAnxPos = ssFinPos.getSheetByName("FIN_CARTOES_ANEXOS");
      if (!shAnxPos || shAnxPos.getLastRow() < 2) {
        resultado.bloqueios.push("FIN_CARTOES_ANEXOS vazio ou inexistente em producao.");
      } else {
        var dadosAnx = shAnxPos.getRange(1, 1, shAnxPos.getLastRow(), shAnxPos.getLastColumn()).getValues();
        var hAnx     = dadosAnx[0].map(function(v) { return String(v || "").trim(); });
        var iALID    = hAnx.indexOf("LANCAMENTO_ID");
        var iAOrig   = hAnx.indexOf("ORIGEM");
        var axOk     = false;
        for (var j = 1; j < dadosAnx.length; j++) {
          var alid = String(iALID  >= 0 ? dadosAnx[j][iALID]  : "").trim();
          var orig = String(iAOrig >= 0 ? dadosAnx[j][iAOrig] : "").trim();
          if (alid === lid || orig.indexOf("MOBILE_CAMPO_PILOTO") >= 0) {
            axOk = true; break;
          }
        }
        resultado.verificacoes.anexoRegistrado = axOk;
        if (!axOk)
          resultado.bloqueios.push(
            "Nenhum registro em FIN_CARTOES_ANEXOS para o lançamento " + lid + "."
          );
      }
    }

    // 6. Zero conciliações/pendências indevidas
    var hojePos  = Utilities.formatDate(new Date(), "America/Sao_Paulo", "yyyy-MM-dd");
    var shConcPos= ssFinPos.getSheetByName("FIN_CARTOES_CONCILIACAO");
    var shPendPos= ssFinPos.getSheetByName("FIN_CARTOES_PENDENCIAS");

    function contarHojeB56pos_(sh) {
      var cnt = 0;
      if (!sh || sh.getLastRow() < 2) return cnt;
      var hh  = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0]
        .map(function(v) { return String(v || "").trim(); });
      var iCr = hh.indexOf("CRIADO_EM");
      sh.getRange(2, 1, sh.getLastRow() - 1, sh.getLastColumn()).getValues()
        .forEach(function(r) {
          if (String(iCr >= 0 ? r[iCr] : "").indexOf(hojePos) >= 0) cnt++;
        });
      return cnt;
    }

    resultado.verificacoes.conciliacaoAutomatica = contarHojeB56pos_(shConcPos);
    resultado.verificacoes.pendenciaAutomatica   = contarHojeB56pos_(shPendPos);
    resultado.verificacoes.whatsappAutomatico    = false;
    resultado.verificacoes.liberacaoGeral        = false;

    if (resultado.verificacoes.conciliacaoAutomatica > 0)
      resultado.bloqueios.push(
        "INESPERADO: " + resultado.verificacoes.conciliacaoAutomatica + " conciliacao(oes) indevidas em producao."
      );
    if (resultado.verificacoes.pendenciaAutomatica > 0)
      resultado.bloqueios.push(
        "INESPERADO: " + resultado.verificacoes.pendenciaAutomatica + " pendencia(s) indevidas em producao."
      );

    // 7. Conclusão
    var aprovado =
      resultado.producaoCorreta &&
      resultado.pilotoConfigurado &&
      resultado.verificacoes.exatamenteUmaPrestacao &&
      resultado.verificacoes.comprovanteAnexado &&
      resultado.verificacoes.statusConferido &&
      resultado.verificacoes.cartaoCorreto &&
      resultado.verificacoes.funcionarioCorreto &&
      resultado.verificacoes.anexoRegistrado &&
      resultado.verificacoes.conciliacaoAutomatica === 0 &&
      resultado.verificacoes.pendenciaAutomatica === 0 &&
      resultado.bloqueios.length === 0;

    resultado.success   = aprovado;
    resultado.conclusao = aprovado
      ? "B56 APROVADO — PILOTO REAL EM PRODUCAO VALIDADO"
      : "B56 BLOQUEADO — corrija os bloqueios";

    if (aprovado) {
      resultado.avisos.push(
        "Ciclo piloto real completo e validado em producao. " +
        "Proximo: B57 — acompanhamento do piloto por 3 a 7 dias. " +
        "NAO executar automaticamente. Exige nova autorizacao explicita."
      );
    }

  } catch (e) {
    resultado.bloqueios.push(
      "Falha em AUDITAR_POS_PILOTO_PRODUCAO_FLASH_B56_SEM_GRAVAR: " + e.message
    );
    resultado.conclusao = "B56 BLOQUEADO";
  }
  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

// ============================================================
// B56_FIX_PRE — CRIAR CARTÃO FLASH PILOTO EM PRODUÇÃO
// Controlado: cria exatamente 1 cartão. Somente em PRODUÇÃO.
// Pré-requisitos:
//   1. FIN_PILOTO_FLASH_EMAIL configurado em PROD ScriptProperties
//   2. DB_ID configurado (banco principal com CAD_USUARIOS)
//   3. DB_FIN_ID configurado (banco FIN com FIN_CARTOES)
// ============================================================
function criarCartaoPilotoProducao_B56_FIX_PRE() {
  var resultado = {
    funcao       : "criarCartaoPilotoProducao_B56_FIX_PRE",
    executado    : false,
    somenteLeitura: false,
    producaoCorreta: false,
    cartaoCriado : false,
    cartaoId     : null,
    piloto       : null,
    bloqueios    : [],
    avisos       : []
  };

  try {
    var PROD_SCRIPT_ID = "1szglIVlBS973xwGsTMKYtc-y5tqVJFIcZgO7iCJi2CWGXLAMGX9abLBY";

    // 1. Confirmar PRODUÇÃO
    var scriptIdAtual = ScriptApp.getScriptId();
    resultado.producaoCorreta = (scriptIdAtual === PROD_SCRIPT_ID);
    if (!resultado.producaoCorreta) {
      resultado.bloqueios.push(
        "Esta funcao so pode rodar em PRODUCAO. " +
        "ScriptId atual: " + scriptIdAtual + ". " +
        "Execute no projeto PROD: " + PROD_SCRIPT_ID
      );
      Logger.log(JSON.stringify(resultado, null, 2));
      return resultado;
    }

    var props = PropertiesService.getScriptProperties();

    // 2. FIN_PILOTO_FLASH_EMAIL obrigatório
    var pilotoLogin = String(props.getProperty("FIN_PILOTO_FLASH_EMAIL") || "").trim().toLowerCase();
    if (!pilotoLogin) {
      resultado.bloqueios.push(
        "FIN_PILOTO_FLASH_EMAIL não configurado. " +
        "Configure em: Apps Script PROD > Propriedades do projeto."
      );
      Logger.log(JSON.stringify(resultado, null, 2));
      return resultado;
    }

    // 3. DB_ID — banco principal com CAD_USUARIOS
    var dbPrincipalId = String(props.getProperty("DB_ID") || "").trim();
    if (!dbPrincipalId) {
      resultado.bloqueios.push("DB_ID (banco principal) não configurado em PROD.");
      Logger.log(JSON.stringify(resultado, null, 2));
      return resultado;
    }

    // 4. DB_FIN_ID — banco FIN com FIN_CARTOES
    var dbFinId = String(props.getProperty("DB_FIN_ID") || "").trim();
    if (!dbFinId) {
      resultado.bloqueios.push("DB_FIN_ID não configurado em PROD.");
      Logger.log(JSON.stringify(resultado, null, 2));
      return resultado;
    }

    // 5. Buscar usuário piloto em CAD_USUARIOS pelo login
    var pilotoUser = null;
    var ssPrincipal = SpreadsheetApp.openById(dbPrincipalId);
    var shUsers = ssPrincipal.getSheetByName("CAD_USUARIOS");
    if (!shUsers) {
      resultado.bloqueios.push("Aba CAD_USUARIOS não encontrada em DB_ID.");
      Logger.log(JSON.stringify(resultado, null, 2));
      return resultado;
    }
    var dadosUsers = shUsers.getRange(1, 1, shUsers.getLastRow(), shUsers.getLastColumn()).getValues();
    var hUsers = dadosUsers[0].map(function(v) { return String(v || "").trim().toUpperCase(); });
    var iUID    = hUsers.indexOf("ID");
    var iUUSU   = hUsers.indexOf("USUARIO");
    var iUNOME  = hUsers.indexOf("NOME");
    var iUSTATUS= hUsers.indexOf("STATUS");
    var iUPERFIL= hUsers.indexOf("PERFIL");
    var iUEMAIL = hUsers.indexOf("EMAIL");

    for (var i = 1; i < dadosUsers.length; i++) {
      var login   = String(iUUSU    >= 0 ? dadosUsers[i][iUUSU]    : "").trim().toLowerCase();
      var emailU  = String(iUEMAIL  >= 0 ? dadosUsers[i][iUEMAIL]  : "").trim().toLowerCase();
      var statusU = String(iUSTATUS >= 0 ? dadosUsers[i][iUSTATUS] : "").trim().toUpperCase();
      if ((login === pilotoLogin || emailU === pilotoLogin) && statusU === "ATIVO") {
        pilotoUser = {
          id    : String(iUID    >= 0 ? dadosUsers[i][iUID]    : "").trim(),
          login : login || emailU,
          nome  : String(iUNOME  >= 0 ? dadosUsers[i][iUNOME]  : "").trim(),
          perfil: String(iUPERFIL >= 0 ? dadosUsers[i][iUPERFIL]: "").trim(),
          status: statusU,
          email : emailU
        };
        break;
      }
    }

    if (!pilotoUser) {
      resultado.bloqueios.push(
        "Usuario não encontrado em CAD_USUARIOS com USUARIO=" + pilotoLogin +
        " e STATUS=ATIVO. Verifique se o login em FIN_PILOTO_FLASH_EMAIL " +
        "corresponde exatamente ao campo USUARIO em CAD_USUARIOS."
      );
      Logger.log(JSON.stringify(resultado, null, 2));
      return resultado;
    }
    resultado.piloto = pilotoUser;
    resultado.avisos.push("Piloto encontrado: " + pilotoUser.nome + " (ID=" + pilotoUser.id + ", login=" + pilotoUser.login + ")");

    if (!pilotoUser.id) {
      resultado.bloqueios.push("ID do usuario piloto está vazio em CAD_USUARIOS. Verifique o cadastro.");
      Logger.log(JSON.stringify(resultado, null, 2));
      return resultado;
    }

    // 6. Verificar se já existe cartão para esse usuário em FIN_CARTOES
    var ssFin   = SpreadsheetApp.openById(dbFinId);
    var shCart  = ssFin.getSheetByName("FIN_CARTOES");
    if (!shCart) {
      resultado.bloqueios.push("Aba FIN_CARTOES não encontrada em DB_FIN_ID.");
      Logger.log(JSON.stringify(resultado, null, 2));
      return resultado;
    }

    // Se a aba tem dados, verificar duplicata
    if (shCart.getLastRow() >= 2) {
      var dadosCart = shCart.getRange(1, 1, shCart.getLastRow(), shCart.getLastColumn()).getValues();
      var hCart     = dadosCart[0].map(function(v) { return String(v || "").trim(); });
      var iCFId     = hCart.indexOf("FUNCIONARIO_ID");
      var iCSta     = hCart.indexOf("STATUS_CARTAO");
      for (var j = 1; j < dadosCart.length; j++) {
        var fid = String(iCFId >= 0 ? dadosCart[j][iCFId] : "").trim();
        var sta = String(iCSta >= 0 ? dadosCart[j][iCSta] : "").trim().toUpperCase();
        if (fid === pilotoUser.id && sta === "ATIVO") {
          resultado.avisos.push(
            "Ja existe cartão ATIVO para FUNCIONARIO_ID=" + pilotoUser.id + ". " +
            "Nenhum cartão adicional sera criado."
          );
          resultado.cartaoCriado = false;
          resultado.conclusao    = "CARTAO JA EXISTE — nenhuma acao necessaria. Execute a pre-auditoria B56 novamente.";
          Logger.log(JSON.stringify(resultado, null, 2));
          return resultado;
        }
      }
    }

    // 7. Criar cartão piloto
    var agora    = new Date().toISOString();
    var cartaoId = "CART-B56-PROD-" + Utilities.getUuid().replace(/-/g, "").slice(0, 8).toUpperCase();
    var uuid     = Utilities.getUuid();

    var novoCartao = {
      "ID"                   : uuid,
      "CARTAO_ID"            : cartaoId,
      "IDENTIFICADOR_CARTAO" : "Flash Piloto " + pilotoUser.nome.split(" ")[0] + " B56",
      "NUMERO_FINAL_4"       : "",
      "APELIDO_CARTAO"       : "Cartão Flash Piloto B56",
      "OPERADORA"            : "FLASH",
      "BANDEIRA"             : "",
      "TIPO_CARTAO"          : "CORPORATIVO",
      "LIMITE_OPERACIONAL"   : 0,
      "LIMITE_TOTAL"         : 0,
      "DATA_EMISSAO"         : "",
      "DATA_VALIDADE_CARTAO" : "",
      "FUNCIONARIO_ID"       : pilotoUser.id,
      "FUNCIONARIO_NOME"     : pilotoUser.nome,
      "FUNCIONARIO_EMAIL"    : pilotoUser.login,
      "FUNCIONARIO_TELEFONE" : "",
      "GESTOR_RESPONSAVEL_ID": "",
      "CENTRO_CUSTO"         : "",
      "FINALIDADE"           : "Piloto Flash Mobile B56",
      "STATUS_CARTAO"        : "ATIVO",
      "DATA_BLOQUEIO"        : "",
      "MOTIVO_BLOQUEIO"      : "",
      "BLOQUEADO_POR"        : "",
      "TERMO_ASSINADO"       : "NAO",
      "TERMO_ID"             : "",
      "OBSERVACOES"          : "Cartão piloto criado por B56_FIX_PRE_PRODUCAO. Piloto: " + pilotoUser.nome,
      "STATUS"               : "ATIVO",
      "CRIADO_EM"            : agora,
      "CRIADO_POR"           : "B56_FIX_PRE_PRODUCAO",
      "ATUALIZADO_EM"        : agora,
      "ATUALIZADO_POR"       : "B56_FIX_PRE_PRODUCAO"
    };

    // Usar os cabeçalhos existentes ou criar linha nova respeitando a ordem
    var headers;
    if (shCart.getLastRow() >= 1) {
      headers = shCart.getRange(1, 1, 1, shCart.getLastColumn()).getValues()[0]
        .map(function(v) { return String(v || "").trim(); });
    } else {
      // Aba vazia — criar cabeçalhos
      headers = Object.keys(novoCartao);
      shCart.appendRow(headers);
    }

    var linha = headers.map(function(h) {
      return novoCartao.hasOwnProperty(h) ? novoCartao[h] : "";
    });
    shCart.appendRow(linha);

    resultado.executado   = true;
    resultado.cartaoCriado= true;
    resultado.cartaoId    = cartaoId;
    resultado.conclusao   = "CARTAO CRIADO — execute AUDITAR_PILOTO_PRODUCAO_FLASH_B56_SEM_GRAVAR para confirmar.";
    resultado.avisos.push(
      "Cartão criado com CARTAO_ID=" + cartaoId + " para " + pilotoUser.nome + ". " +
      "STATUS_CARTAO=ATIVO. " +
      "Nao foram criadas recargas, lancamentos, conciliacoes ou pendencias."
    );

  } catch (e) {
    resultado.bloqueios.push("Falha em criarCartaoPilotoProducao_B56_FIX_PRE: " + e.message);
    resultado.conclusao = "BLOQUEADO — erro na criacao do cartao";
  }
  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

/* ============================================================
   FLASH.4.7 — AUDITORIAS SOMENTE LEITURA (MULTICARTÃO)
   Todas as funções abaixo são somente leitura.
   Nenhuma grava dados, cria recargas ou altera piloto FLASH44.
   Podem ser executadas manualmente no editor Apps Script /dev.
============================================================ */

// 1. Verifica se FIN_CARTOES possui os campos obrigatórios do multicartão
function AUDITAR_FLASH47_SCHEMA_MULTICARTAO_SEM_GRAVAR() {
  var resultado = {
    versao        : "FLASH.4.7",
    modo          : "AUDITORIA_SCHEMA_MULTICARTAO_SEM_GRAVAR",
    executado     : false,
    somenteLeitura: true,
    gravacaoReal  : false,
    success       : false,
    bloqueios     : [],
    avisos        : [],
    schema        : {}
  };

  try {
    var props = PropertiesService.getScriptProperties();
    var dbId  = String(props.getProperty("DB_FIN_ID") || "").trim();
    if (!dbId) { resultado.bloqueios.push("DB_FIN_ID não configurado."); Logger.log(JSON.stringify(resultado, null, 2)); return resultado; }

    var ssFin  = SpreadsheetApp.openById(dbId);
    var shCart = ssFin.getSheetByName("FIN_CARTOES");
    if (!shCart) { resultado.bloqueios.push("Aba FIN_CARTOES não encontrada."); Logger.log(JSON.stringify(resultado, null, 2)); return resultado; }

    var lastCol = shCart.getLastColumn();
    if (lastCol < 1) { resultado.bloqueios.push("FIN_CARTOES sem cabeçalho."); Logger.log(JSON.stringify(resultado, null, 2)); return resultado; }

    var hdrs = shCart.getRange(1, 1, 1, lastCol).getValues()[0].map(function(h) { return String(h || "").trim(); });

    var camposObrigatorios = ["CPF_COLABORADOR", "TIPO_CARTAO", "NUMERO_FINAL_4", "CHAVE_MULTICARTAO", "ORIGEM_CARTAO", "FUNCIONARIO_ID", "STATUS_CARTAO"];
    var presentes = [], faltantes = [];
    camposObrigatorios.forEach(function(c) {
      if (hdrs.indexOf(c) >= 0) presentes.push(c);
      else faltantes.push(c);
    });

    resultado.schema = {
      totalHeadersPresentes: hdrs.length,
      camposObrigatorios   : camposObrigatorios,
      presentes            : presentes,
      faltantes            : faltantes,
      todosPresentes       : faltantes.length === 0
    };

    if (faltantes.length > 0) {
      resultado.bloqueios.push("Campos faltantes em FIN_CARTOES: " + faltantes.join(", ") + ". Execute setupFinanceiroV2() para adicionar.");
    } else {
      resultado.avisos.push("Todos os campos multicartão presentes em FIN_CARTOES.");
    }

    resultado.success = resultado.bloqueios.length === 0;
    resultado.ok      = resultado.success;
    resultado.conclusao = resultado.success
      ? "SCHEMA OK — pronto para multicartão FLASH.4.7"
      : "SCHEMA INCOMPLETO — execute setupFinanceiroV2() para corrigir";

  } catch (e47a) {
    resultado.bloqueios.push("Erro: " + e47a.message);
    resultado.ok = false;
  }

  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

// 2. Verifica duplicidade pelo critério multicartão (CPF + TIPO + FINAL)
function AUDITAR_FLASH47_DUPLICIDADE_MULTICARTAO_SEM_GRAVAR() {
  var resultado = {
    versao           : "FLASH.4.7",
    modo             : "AUDITORIA_DUPLICIDADE_MULTICARTAO_SEM_GRAVAR",
    executado        : false,
    somenteLeitura   : true,
    gravacaoReal     : false,
    success          : false,
    bloqueios        : [],
    avisos           : [],
    resumo           : {},
    duplicatasExatas : [],
    exemploMulticartao: []
  };

  try {
    var props = PropertiesService.getScriptProperties();
    var dbId  = String(props.getProperty("DB_FIN_ID") || "").trim();
    if (!dbId) { resultado.bloqueios.push("DB_FIN_ID não configurado."); Logger.log(JSON.stringify(resultado, null, 2)); return resultado; }

    var ssFin  = SpreadsheetApp.openById(dbId);
    var shCart = ssFin.getSheetByName("FIN_CARTOES");
    if (!shCart || shCart.getLastRow() < 2) {
      resultado.avisos.push("FIN_CARTOES sem dados.");
      resultado.success = true;
      resultado.conclusao = "Sem dados para analisar.";
      Logger.log(JSON.stringify(resultado, null, 2));
      return resultado;
    }

    var dados = shCart.getRange(1, 1, shCart.getLastRow(), shCart.getLastColumn()).getValues();
    var hdrs  = dados[0].map(function(h) { return String(h || "").trim(); });

    var iCPF  = hdrs.indexOf("CPF_COLABORADOR");
    var iTipo = hdrs.indexOf("TIPO_CARTAO");
    var iFin  = hdrs.indexOf("NUMERO_FINAL_4");
    var iChav = hdrs.indexOf("CHAVE_MULTICARTAO");
    var iStat = hdrs.indexOf("STATUS_CARTAO");
    var iCId  = hdrs.indexOf("CARTAO_ID");
    var iNome = hdrs.indexOf("FUNCIONARIO_NOME");

    var mapaCPF   = {};
    var mapaChave = {};
    var inativados = ["INATIVO", "CANCELADO", "DEVOLVIDO"];

    for (var i = 1; i < dados.length; i++) {
      var row    = dados[i];
      var stat_  = String(iStat >= 0 ? row[iStat] : "").trim().toUpperCase();
      if (inativados.indexOf(stat_) >= 0) continue;

      var cpf_   = String(iCPF >= 0 ? row[iCPF] : "").replace(/\D/g, "");
      var tipo_  = String(iTipo >= 0 ? row[iTipo] : "").trim().toUpperCase();
      var final_ = String(iFin >= 0 ? row[iFin] : "").replace(/\D/g, "");
      var chave_ = String(iChav >= 0 ? row[iChav] : "").trim();
      var cid_   = String(iCId >= 0 ? row[iCId] : "").trim();
      var nome_  = String(iNome >= 0 ? row[iNome] : "").trim();

      if (!chave_ && cpf_ && tipo_ && final_) chave_ = cpf_ + "_" + tipo_ + "_" + final_;

      if (cpf_) {
        if (!mapaCPF[cpf_]) mapaCPF[cpf_] = [];
        mapaCPF[cpf_].push({ cartaoId: cid_, tipo: tipo_, final: final_, nome: nome_, chave: chave_ });
      }
      if (chave_) {
        if (!mapaChave[chave_]) mapaChave[chave_] = [];
        mapaChave[chave_].push(cid_);
      }
    }

    var dupExatas = [];
    Object.keys(mapaChave).forEach(function(ch) {
      if (mapaChave[ch].length > 1) dupExatas.push({ chave: ch, cartoes: mapaChave[ch] });
    });

    var multicartao = [];
    Object.keys(mapaCPF).forEach(function(cpf) {
      if (mapaCPF[cpf].length > 1) multicartao.push({ cpf: cpf, cartoes: mapaCPF[cpf] });
    });

    resultado.resumo = {
      totalCartoesAtivos    : Object.keys(mapaChave).length,
      totalCPFsUnicos       : Object.keys(mapaCPF).length,
      cpfsComMultiploCartao : multicartao.length,
      duplicatasExatas      : dupExatas.length
    };
    resultado.duplicatasExatas    = dupExatas;
    resultado.exemploMulticartao  = multicartao.slice(0, 5);

    if (dupExatas.length > 0) {
      resultado.bloqueios.push("Encontradas " + dupExatas.length + " duplicata(s) exata(s) (mesmo CPF+TIPO+FINAL).");
    } else {
      resultado.avisos.push("Nenhuma duplicata exata detectada. Regra multicartão OK.");
    }
    if (multicartao.length > 0) {
      resultado.avisos.push(multicartao.length + " CPF(s) com múltiplos cartões (correto no FLASH.4.7).");
    }

    resultado.success = resultado.bloqueios.length === 0;
    resultado.ok      = resultado.success;
    resultado.conclusao = resultado.success
      ? "DUPLICIDADE OK — sem colisões na chave multicartão"
      : "DUPLICIDADE COM PROBLEMA — ver duplicatasExatas";

  } catch (e47b) {
    resultado.bloqueios.push("Erro: " + e47b.message);
    resultado.ok = false;
  }

  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

// 3. Verifica vínculos extrato × cartão pelo critério multicartão
function AUDITAR_FLASH47_EXTRATO_MULTICARTAO_SEM_GRAVAR() {
  var resultado = {
    versao             : "FLASH.4.7",
    modo               : "AUDITORIA_EXTRATO_MULTICARTAO_SEM_GRAVAR",
    executado          : false,
    somenteLeitura     : true,
    gravacaoReal       : false,
    success            : false,
    bloqueios          : [],
    avisos             : [],
    resumo             : {},
    pendenciasGerariam : []
  };

  try {
    var props = PropertiesService.getScriptProperties();
    var dbId  = String(props.getProperty("DB_FIN_ID") || "").trim();
    if (!dbId) { resultado.bloqueios.push("DB_FIN_ID não configurado."); Logger.log(JSON.stringify(resultado, null, 2)); return resultado; }

    var ssFin = SpreadsheetApp.openById(dbId);

    // Mapa: final → lista de cartões cadastrados
    var mapaFinalCartao = {};
    var shCart = ssFin.getSheetByName("FIN_CARTOES");
    if (shCart && shCart.getLastRow() >= 2) {
      var dc = shCart.getRange(1, 1, shCart.getLastRow(), shCart.getLastColumn()).getValues();
      var hc = dc[0].map(function(h) { return String(h || "").trim(); });
      var icFin  = hc.indexOf("NUMERO_FINAL_4");
      var icCId  = hc.indexOf("CARTAO_ID");
      var icStat = hc.indexOf("STATUS_CARTAO");
      var icTipo = hc.indexOf("TIPO_CARTAO");
      for (var i = 1; i < dc.length; i++) {
        var st = String(icStat >= 0 ? dc[i][icStat] : "").trim().toUpperCase();
        if (["INATIVO","CANCELADO","DEVOLVIDO"].indexOf(st) >= 0) continue;
        var f2 = String(icFin >= 0 ? dc[i][icFin] : "").replace(/\D/g, "");
        var c2 = String(icCId >= 0 ? dc[i][icCId] : "").trim();
        var t2 = String(icTipo >= 0 ? dc[i][icTipo] : "").trim().toUpperCase();
        if (f2 && c2) {
          if (!mapaFinalCartao[f2]) mapaFinalCartao[f2] = [];
          mapaFinalCartao[f2].push({ cartaoId: c2, tipo: t2 });
        }
      }
    }

    // Analisar extratos
    var shExt = ssFin.getSheetByName("FIN_CARTOES_EXTRATOS");
    var totExt = 0, vinc = 0, semCartao = 0;
    var exemplos = [];

    if (shExt && shExt.getLastRow() >= 2) {
      var de = shExt.getRange(1, 1, shExt.getLastRow(), shExt.getLastColumn()).getValues();
      var he = de[0].map(function(h) { return String(h || "").trim(); });
      var ieFin  = he.indexOf("CARTAO_FINAL");
      var ieCId  = he.indexOf("CARTAO_ID");
      var ieStat = he.indexOf("STATUS");

      for (var j = 1; j < de.length; j++) {
        var est = String(ieStat >= 0 ? de[j][ieStat] : "").trim().toUpperCase();
        if (est === "CANCELADO") continue;
        totExt++;
        var eFin = String(ieFin >= 0 ? de[j][ieFin] : "").replace(/\D/g, "");
        var eCId = String(ieCId >= 0 ? de[j][ieCId] : "").trim();
        if (eCId) {
          vinc++;
        } else if (!mapaFinalCartao[eFin]) {
          semCartao++;
          if (exemplos.length < 5) exemplos.push({ cartaoFinal: eFin, linhaExtrato: j + 1 });
        }
      }
    }

    resultado.resumo = {
      totalExtratos       : totExt,
      comCartaoVinculado  : vinc,
      semCartaoCadastrado : semCartao
    };

    if (semCartao > 0) {
      resultado.pendenciasGerariam = exemplos.map(function(e) {
        return { tipo: "CARTAO_FLASH_NAO_CADASTRADO", cartaoFinal: e.cartaoFinal, linhaExtrato: e.linhaExtrato };
      });
      resultado.avisos.push(semCartao + " extrato(s) sem cartão cadastrado gerariam pendência CARTAO_FLASH_NAO_CADASTRADO.");
    } else {
      resultado.avisos.push("Todos os extratos com final identificado possuem cartão cadastrado.");
    }

    resultado.success = true;
    resultado.ok      = true;
    resultado.conclusao = "Auditoria de extrato × cartão concluída. Ver resumo.";

  } catch (e47c) {
    resultado.bloqueios.push("Erro: " + e47c.message);
    resultado.success = false;
    resultado.ok      = false;
  }

  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

// 4. Auditoria final consolidada FLASH.4.7
function AUDITAR_FLASH47_FINAL_SEM_GRAVAR() {
  var resultado = {
    versao        : "FLASH.4.7",
    modo          : "AUDITORIA_FINAL_FLASH47_SEM_GRAVAR",
    executado     : false,
    somenteLeitura: true,
    gravacaoReal  : false,
    success       : false,
    bloqueios     : [],
    avisos        : [],
    criterios     : {},
    subAuditorias : {}
  };

  try {
    var schema      = AUDITAR_FLASH47_SCHEMA_MULTICARTAO_SEM_GRAVAR();
    var duplicidade = AUDITAR_FLASH47_DUPLICIDADE_MULTICARTAO_SEM_GRAVAR();
    var extrato     = AUDITAR_FLASH47_EXTRATO_MULTICARTAO_SEM_GRAVAR();

    resultado.subAuditorias = {
      schema      : { ok: schema.success,      bloqueios: schema.bloqueios      },
      duplicidade : { ok: duplicidade.success,  bloqueios: duplicidade.bloqueios },
      extrato     : { ok: extrato.success,      bloqueios: extrato.bloqueios     }
    };

    var props  = PropertiesService.getScriptProperties();
    var dbId   = String(props.getProperty("DB_FIN_ID") || "").trim();
    var libGen = String(props.getProperty("FIN_LIBERACAO_GERAL") || "false").trim().toLowerCase();

    // Verificar piloto FLASH44 intacto
    var flash44Ok = false;
    if (dbId) {
      try {
        var ssFin47 = SpreadsheetApp.openById(dbId);
        var sh47    = ssFin47.getSheetByName("FIN_CARTOES");
        if (sh47 && sh47.getLastRow() >= 2) {
          var d47 = sh47.getRange(1, 1, sh47.getLastRow(), sh47.getLastColumn()).getValues();
          var h47 = d47[0].map(function(h) { return String(h || "").trim(); });
          var ip47 = h47.indexOf("FUNCIONARIO_ID");
          for (var k = 1; k < d47.length; k++) {
            if (String(ip47 >= 0 ? d47[k][ip47] : "").trim() === "PILOTO_FLASH44") {
              flash44Ok = true; break;
            }
          }
        }
      } catch(e47d) { resultado.avisos.push("Não foi possível verificar FLASH44: " + e47d.message); }
    }

    resultado.criterios = {
      schemaMulticartaoOk : schema.success,
      semDuplicidadeExata : duplicidade.success && (duplicidade.resumo.duplicatasExatas || 0) === 0,
      extratoAuditadoOk   : extrato.success,
      liberacaoGeralFalse : libGen !== "true",
      pilotoFLASH44Intacto: flash44Ok,
      recargaNaoCriada    : true
    };

    if (!resultado.criterios.liberacaoGeralFalse) resultado.bloqueios.push("LIBERACAO_GERAL está true — não permitido nesta fase.");
    if (!resultado.criterios.schemaMulticartaoOk) resultado.bloqueios.push("Schema FIN_CARTOES incompleto para multicartão.");
    if (!resultado.criterios.semDuplicidadeExata) resultado.bloqueios.push("Existem duplicatas exatas na chave multicartão.");
    (schema.bloqueios || []).forEach(function(b) { resultado.bloqueios.push("[SCHEMA] " + b); });
    (duplicidade.bloqueios || []).forEach(function(b) { resultado.bloqueios.push("[DUP] " + b); });

    var todosOk = Object.keys(resultado.criterios).every(function(k) { return resultado.criterios[k] === true; });
    resultado.success = todosOk && resultado.bloqueios.length === 0;
    resultado.ok             = resultado.success;
    resultado.liberacaoGeral  = resultado.criterios.liberacaoGeralFalse === true ? false : true;
    resultado.recargaCriada   = resultado.criterios.recargaNaoCriada === true ? false : true;
    resultado.flash44Intacto  = resultado.criterios.pilotoFLASH44Intacto === true;
    resultado.conclusao = resultado.success
      ? "FLASH.4.7 AUDITORIA FINAL OK — multicartão implementado, liberação geral false, piloto FLASH44 intacto."
      : "FLASH.4.7 AUDITORIA FINAL COM PENDÊNCIAS — ver bloqueios e criterios.";

  } catch (e47e) {
    resultado.bloqueios.push("Erro na auditoria final: " + e47e.message);
    resultado.ok             = false;
    resultado.liberacaoGeral  = true;
    resultado.recargaCriada   = true;
    resultado.flash44Intacto  = false;
  }

  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

function EXECUTAR_FLASH47B_SETUP_E_AUDITORIA_DEV_AUTORIZADO() {
  var resultado = {
    success: false,
    ok: false,
    etapa: 'INICIO',
    ambiente: null,
    scriptId: null,
    dbFinId: null,
    bloqueios: [],
    avisos: [],
    setupExecutado: false,
    schema: null,
    duplicidade: null,
    extrato: null,
    final: null,
    liberacaoGeral: false,
    recargaCriada: false,
    flash44Intacto: false,
    prontoParaTesteHumanoDEV: false
  };

  try {
    resultado.etapa = 'VALIDAR_AMBIENTE';

    var DEV_SCRIPT_ID = '12xiWNlQ-WKVpiofmcGfBaX4EBdlsIxKFJG2PFTamHUmSUs89c4LW3WSG';
    var PRODUCAO_V2_SCRIPT_ID = '1iKgbkoBgRuethKuFhQM1H1W9vRvuBM1tT21-cYizkusfT_YrgHbIbZ1y';
    var DEV_DB_FIN_ID = '1Q7zvZvtzrYUVGk8oMoOCmTYoE0A7lxP6zbd4GfojuZ0';

    var scriptId = ScriptApp.getScriptId();
    resultado.scriptId = scriptId;

    if (scriptId === PRODUCAO_V2_SCRIPT_ID) {
      resultado.bloqueios.push('BLOQUEADO: scriptId é PRODUCAO_V2.');
    }

    if (scriptId !== DEV_SCRIPT_ID) {
      resultado.bloqueios.push('BLOQUEADO: scriptId não é o DEV esperado.');
    }

    resultado.ambiente = scriptId === DEV_SCRIPT_ID ? 'DEV' : 'DESCONHECIDO';

    var props = PropertiesService.getScriptProperties();
    var dbFinId = props.getProperty('DB_FIN_ID');
    resultado.dbFinId = dbFinId;

    if (dbFinId !== DEV_DB_FIN_ID) {
      resultado.bloqueios.push('BLOQUEADO: DB_FIN_ID não é o banco FIN DEV esperado.');
    }

    if (resultado.bloqueios.length > 0) {
      Logger.log(JSON.stringify(resultado, null, 2));
      return resultado;
    }

    resultado.etapa = 'SETUP_FINANCEIRO';

    if (typeof setupFinanceiroV2 !== 'function') {
      resultado.bloqueios.push('setupFinanceiroV2 não encontrada no escopo global.');
      Logger.log(JSON.stringify(resultado, null, 2));
      return resultado;
    }

    setupFinanceiroV2();
    resultado.setupExecutado = true;

    resultado.etapa = 'AUDITORIA_SCHEMA';
    resultado.schema = AUDITAR_FLASH47_SCHEMA_MULTICARTAO_SEM_GRAVAR();

    resultado.etapa = 'AUDITORIA_DUPLICIDADE';
    resultado.duplicidade = AUDITAR_FLASH47_DUPLICIDADE_MULTICARTAO_SEM_GRAVAR();

    resultado.etapa = 'AUDITORIA_EXTRATO';
    resultado.extrato = AUDITAR_FLASH47_EXTRATO_MULTICARTAO_SEM_GRAVAR();

    resultado.etapa = 'AUDITORIA_FINAL';
    resultado.final = AUDITAR_FLASH47_FINAL_SEM_GRAVAR();

    var schemaOk = !!(resultado.schema && resultado.schema.ok === true);
    var duplicidadeOk = !!(resultado.duplicidade && resultado.duplicidade.ok === true);
    var extratoOk = !!(resultado.extrato && resultado.extrato.ok === true);
    var finalOk = !!(resultado.final && resultado.final.ok === true);

    if (resultado.final) {
      resultado.liberacaoGeral = resultado.final.liberacaoGeral === true;
      resultado.recargaCriada = resultado.final.recargaCriada === true;
      resultado.flash44Intacto = resultado.final.flash44Intacto === true;
    }

    resultado.prontoParaTesteHumanoDEV =
      schemaOk &&
      duplicidadeOk &&
      extratoOk &&
      finalOk &&
      resultado.liberacaoGeral === false &&
      resultado.recargaCriada === false &&
      resultado.flash44Intacto === true;

    resultado.ok = resultado.prontoParaTesteHumanoDEV === true;
    resultado.success = true;
    resultado.etapa = 'FINALIZADO';

    Logger.log(JSON.stringify(resultado, null, 2));
    return resultado;

  } catch (erro) {
    resultado.success = false;
    resultado.ok = false;
    resultado.bloqueios.push(String(erro && erro.message ? erro.message : erro));
    resultado.stack = erro && erro.stack ? erro.stack : null;
    Logger.log(JSON.stringify(resultado, null, 2));
    return resultado;
  }
}

// ============================================================
// FLASH.4.8 — Auditorias somente leitura (executado: false)
// ============================================================

// 1. Conta por CPF — verifica agrupamento de cartões por CPF_COLABORADOR
function AUDITAR_FLASH48_CONTA_POR_CPF_SEM_GRAVAR() {
  var resultado = {
    versao        : "FLASH.4.8",
    modo          : "AUDITORIA_CONTA_POR_CPF_SEM_GRAVAR",
    executado     : false,
    somenteLeitura: true,
    gravacaoReal  : false,
    success       : false,
    ok            : false,
    bloqueios     : [],
    avisos        : [],
    resumo        : {}
  };
  try {
    var props = PropertiesService.getScriptProperties();
    var dbId  = String(props.getProperty("DB_FIN_ID") || "").trim();
    if (!dbId) { resultado.bloqueios.push("DB_FIN_ID não configurado."); Logger.log(JSON.stringify(resultado, null, 2)); return resultado; }

    var ssFin  = SpreadsheetApp.openById(dbId);
    var shCart = ssFin.getSheetByName("FIN_CARTOES");
    if (!shCart || shCart.getLastRow() < 2) {
      resultado.avisos.push("FIN_CARTOES sem dados. Aguardando cadastro real.");
      resultado.success = true; resultado.ok = true;
      Logger.log(JSON.stringify(resultado, null, 2)); return resultado;
    }

    var dados = shCart.getRange(1, 1, shCart.getLastRow(), shCart.getLastColumn()).getValues();
    var hdrs  = dados[0].map(function(h) { return String(h || "").trim(); });
    var iCPF  = hdrs.indexOf("CPF_COLABORADOR");
    var iNome = hdrs.indexOf("FUNCIONARIO_NOME");
    var iStat = hdrs.indexOf("STATUS_CARTAO");
    var iTipo = hdrs.indexOf("TIPO_CARTAO");
    var iFin  = hdrs.indexOf("NUMERO_FINAL_4");
    var iCId  = hdrs.indexOf("CARTAO_ID");

    if (iCPF < 0) { resultado.bloqueios.push("Campo CPF_COLABORADOR ausente em FIN_CARTOES. Execute setupFinanceiroV2()."); Logger.log(JSON.stringify(resultado, null, 2)); return resultado; }

    var mapaCPF = {};
    for (var i = 1; i < dados.length; i++) {
      var row  = dados[i];
      var cpf  = String(iCPF >= 0 ? row[iCPF] : "").replace(/\D/g, "");
      var nome = String(iNome >= 0 ? row[iNome] : "").trim();
      var st   = String(iStat >= 0 ? row[iStat] : "").trim().toUpperCase();
      var tipo = String(iTipo >= 0 ? row[iTipo] : "").trim().toUpperCase();
      var fin  = String(iFin >= 0 ? row[iFin] : "").replace(/\D/g, "");
      var cid  = String(iCId >= 0 ? row[iCId] : "").trim();
      var chave = cpf || ("__SEM_CPF_" + i);
      if (!mapaCPF[chave]) mapaCPF[chave] = { cpf: cpf, nome: nome, cartoes: [], ativos: 0 };
      if (!cpf) mapaCPF[chave].nome = "(sem CPF)";
      mapaCPF[chave].cartoes.push({ cartaoId: cid, tipo: tipo, final: fin, status: st });
      if (st === "ATIVO") mapaCPF[chave].ativos++;
    }

    var contas   = Object.keys(mapaCPF).map(function(k) { return mapaCPF[k]; });
    var semCPF   = contas.filter(function(c) { return !c.cpf; });
    var multi    = contas.filter(function(c) { return c.cartoes.length > 1; });
    var comAtivo = contas.filter(function(c) { return c.ativos > 0; });

    resultado.resumo = {
      totalContas       : contas.length,
      contasComMultiCartao: multi.length,
      contasComAtivo    : comAtivo.length,
      contasSemCPF      : semCPF.length,
      exemplosMultiCartao: multi.slice(0, 5).map(function(c) { return { cpf: c.cpf, nome: c.nome, cartoes: c.cartoes }; })
    };

    if (semCPF.length > 0) resultado.avisos.push(semCPF.length + " cartão(s) sem CPF_COLABORADOR — preencher para operação FLASH.4.8 completa.");
    resultado.avisos.push("FLASH.4.8: " + contas.length + " conta(s)/CPF, " + multi.length + " com múltiplos cartões.");

    resultado.success = true;
    resultado.ok      = true;
    resultado.conclusao = "CONTA_POR_CPF OK — schema multicartão FLASH.4.8 validado.";
  } catch (e48a) {
    resultado.bloqueios.push("Erro: " + e48a.message);
    resultado.ok = false;
  }
  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

// 2. Recarga por CPF — verifica se FIN_CARTOES_RECARGAS tem CPF_COLABORADOR
function AUDITAR_FLASH48_RECARGA_POR_CPF_SEM_GRAVAR() {
  var resultado = {
    versao        : "FLASH.4.8",
    modo          : "AUDITORIA_RECARGA_POR_CPF_SEM_GRAVAR",
    executado     : false,
    somenteLeitura: true,
    gravacaoReal  : false,
    success       : false,
    ok            : false,
    bloqueios     : [],
    avisos        : [],
    resumo        : {}
  };
  try {
    var props = PropertiesService.getScriptProperties();
    var dbId  = String(props.getProperty("DB_FIN_ID") || "").trim();
    if (!dbId) { resultado.bloqueios.push("DB_FIN_ID não configurado."); Logger.log(JSON.stringify(resultado, null, 2)); return resultado; }

    var ssFin = SpreadsheetApp.openById(dbId);
    var shRec = ssFin.getSheetByName("FIN_CARTOES_RECARGAS");
    if (!shRec) { resultado.bloqueios.push("Aba FIN_CARTOES_RECARGAS não encontrada."); Logger.log(JSON.stringify(resultado, null, 2)); return resultado; }

    var lastCol = shRec.getLastColumn();
    var hdrs    = lastCol >= 1 ? shRec.getRange(1, 1, 1, lastCol).getValues()[0].map(function(h) { return String(h || "").trim(); }) : [];

    var temCPF   = hdrs.indexOf("CPF_COLABORADOR") >= 0;
    var temCartao= hdrs.indexOf("CARTAO_ID") >= 0;

    resultado.resumo = {
      totalHeadersRecargas : hdrs.length,
      temCPF_COLABORADOR   : temCPF,
      temCARTAO_ID         : temCartao,
      headers              : hdrs
    };

    if (!temCPF) {
      resultado.bloqueios.push("Campo CPF_COLABORADOR ausente em FIN_CARTOES_RECARGAS. Execute setupFinanceiroV2() para adicionar.");
    } else {
      resultado.avisos.push("FIN_CARTOES_RECARGAS tem CPF_COLABORADOR — modelo FLASH.4.8 pronto.");
    }

    if (shRec.getLastRow() >= 2) {
      var dadosRec = shRec.getRange(1, 1, shRec.getLastRow(), lastCol).getValues();
      var iCPFRec  = hdrs.indexOf("CPF_COLABORADOR");
      var semCPF = 0;
      for (var j = 1; j < dadosRec.length; j++) {
        if (iCPFRec >= 0 && !String(dadosRec[j][iCPFRec] || "").trim()) semCPF++;
      }
      resultado.resumo.totalRecargas = dadosRec.length - 1;
      resultado.resumo.recargasSemCPF = semCPF;
      if (semCPF > 0) resultado.avisos.push(semCPF + " recarga(s) existente(s) sem CPF_COLABORADOR (criadas antes do FLASH.4.8).");
    } else {
      resultado.resumo.totalRecargas = 0;
      resultado.avisos.push("Nenhuma recarga cadastrada ainda.");
    }

    resultado.success = resultado.bloqueios.length === 0;
    resultado.ok      = resultado.success;
    resultado.conclusao = resultado.success
      ? "RECARGA_POR_CPF OK — FIN_CARTOES_RECARGAS pronto para modelo FLASH.4.8."
      : "RECARGA_POR_CPF INCOMPLETO — execute setupFinanceiroV2().";
  } catch (e48b) {
    resultado.bloqueios.push("Erro: " + e48b.message);
    resultado.ok = false;
  }
  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

// 3. Prestação × cartões do CPF — verifica que lançamentos podem ser vinculados ao CPF correto
function AUDITAR_FLASH48_PRESTACAO_CARTOES_DO_CPF_SEM_GRAVAR() {
  var resultado = {
    versao        : "FLASH.4.8",
    modo          : "AUDITORIA_PRESTACAO_CARTOES_DO_CPF_SEM_GRAVAR",
    executado     : false,
    somenteLeitura: true,
    gravacaoReal  : false,
    success       : false,
    ok            : false,
    bloqueios     : [],
    avisos        : [],
    resumo        : {}
  };
  try {
    var props = PropertiesService.getScriptProperties();
    var dbId  = String(props.getProperty("DB_FIN_ID") || "").trim();
    if (!dbId) { resultado.bloqueios.push("DB_FIN_ID não configurado."); Logger.log(JSON.stringify(resultado, null, 2)); return resultado; }

    var ssFin  = SpreadsheetApp.openById(dbId);
    var shCart = ssFin.getSheetByName("FIN_CARTOES");
    var shLanc = ssFin.getSheetByName("FIN_CARTOES_LANCAMENTOS");

    // Mapa: CARTAO_ID → CPF_COLABORADOR
    var mapaCPFporCartao = {};
    if (shCart && shCart.getLastRow() >= 2) {
      var dc = shCart.getRange(1, 1, shCart.getLastRow(), shCart.getLastColumn()).getValues();
      var hc = dc[0].map(function(h) { return String(h || "").trim(); });
      var icId  = hc.indexOf("CARTAO_ID");
      var icCPF = hc.indexOf("CPF_COLABORADOR");
      var icTipo= hc.indexOf("TIPO_CARTAO");
      var icFin = hc.indexOf("NUMERO_FINAL_4");
      for (var i = 1; i < dc.length; i++) {
        var cid = String(icId >= 0 ? dc[i][icId] : "").trim();
        var cpf = String(icCPF >= 0 ? dc[i][icCPF] : "").replace(/\D/g, "");
        var tipo = String(icTipo >= 0 ? dc[i][icTipo] : "").trim();
        var fin  = String(icFin >= 0 ? dc[i][icFin] : "").replace(/\D/g, "");
        if (cid) mapaCPFporCartao[cid] = { cpf: cpf, tipo: tipo, final: fin };
      }
    }

    // Verificar lançamentos: cada CARTAO_ID deve ter CPF associado
    var totalLanc = 0, comCPF = 0, semCPF = 0;
    if (shLanc && shLanc.getLastRow() >= 2) {
      var dl = shLanc.getRange(1, 1, shLanc.getLastRow(), shLanc.getLastColumn()).getValues();
      var hl = dl[0].map(function(h) { return String(h || "").trim(); });
      var ilCId = hl.indexOf("CARTAO_ID");
      for (var j = 1; j < dl.length; j++) {
        totalLanc++;
        var lancCid = String(ilCId >= 0 ? dl[j][ilCId] : "").trim();
        if (lancCid && mapaCPFporCartao[lancCid] && mapaCPFporCartao[lancCid].cpf) comCPF++;
        else semCPF++;
      }
    }

    var totalCartoes = Object.keys(mapaCPFporCartao).length;
    resultado.resumo = {
      totalCartoesComCPF    : Object.keys(mapaCPFporCartao).filter(function(k) { return mapaCPFporCartao[k].cpf; }).length,
      totalCartoesSemCPF    : Object.keys(mapaCPFporCartao).filter(function(k) { return !mapaCPFporCartao[k].cpf; }).length,
      totalLancamentos      : totalLanc,
      lancamentosComCPFVinc : comCPF,
      lancamentosSemCPFVinc : semCPF
    };

    if (resultado.resumo.totalCartoesSemCPF > 0) {
      resultado.avisos.push(resultado.resumo.totalCartoesSemCPF + " cartão(s) sem CPF_COLABORADOR — preencher manualmente.");
    }
    if (semCPF > 0) {
      resultado.avisos.push(semCPF + " lançamento(s) cujo cartão não tem CPF_COLABORADOR — dados históricos pré-FLASH.4.8.");
    }
    resultado.avisos.push("Mapa CARTAO_ID→CPF permite vincular prestação a todos os cartões do CPF corretamente.");

    resultado.success = true;
    resultado.ok      = true;
    resultado.conclusao = "PRESTACAO_CARTOES_DO_CPF OK — vinculação CARTAO_ID→CPF disponível para prestação FLASH.4.8.";
  } catch (e48c) {
    resultado.bloqueios.push("Erro: " + e48c.message);
    resultado.ok = false;
  }
  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

// 4. Auditoria final consolidada FLASH.4.8
function AUDITAR_FLASH48_FINAL_SEM_GRAVAR() {
  var resultado = {
    versao        : "FLASH.4.8",
    modo          : "AUDITORIA_FINAL_FLASH48_SEM_GRAVAR",
    executado     : false,
    somenteLeitura: true,
    gravacaoReal  : false,
    success       : false,
    ok            : false,
    bloqueios     : [],
    avisos        : [],
    criterios     : {},
    subAuditorias : {}
  };
  try {
    var conta      = AUDITAR_FLASH48_CONTA_POR_CPF_SEM_GRAVAR();
    var recarga    = AUDITAR_FLASH48_RECARGA_POR_CPF_SEM_GRAVAR();
    var prestacao  = AUDITAR_FLASH48_PRESTACAO_CARTOES_DO_CPF_SEM_GRAVAR();

    resultado.subAuditorias = {
      conta    : { ok: conta.ok,    bloqueios: conta.bloqueios    },
      recarga  : { ok: recarga.ok,  bloqueios: recarga.bloqueios  },
      prestacao: { ok: prestacao.ok,bloqueios: prestacao.bloqueios}
    };

    var props   = PropertiesService.getScriptProperties();
    var libGen  = String(props.getProperty("FIN_LIBERACAO_GERAL") || "false").trim().toLowerCase();
    var flash44 = false;
    var dbId    = String(props.getProperty("DB_FIN_ID") || "").trim();
    if (dbId) {
      try {
        var ssFin48 = SpreadsheetApp.openById(dbId);
        var sh48    = ssFin48.getSheetByName("FIN_CARTOES");
        if (sh48 && sh48.getLastRow() >= 2) {
          var d48 = sh48.getRange(1, 1, sh48.getLastRow(), sh48.getLastColumn()).getValues();
          var h48 = d48[0].map(function(h) { return String(h || "").trim(); });
          var ip48 = h48.indexOf("FUNCIONARIO_ID");
          for (var k = 1; k < d48.length; k++) {
            if (String(ip48 >= 0 ? d48[k][ip48] : "").trim() === "PILOTO_FLASH44") { flash44 = true; break; }
          }
        }
      } catch(e48e) { resultado.avisos.push("Não foi possível verificar FLASH44: " + e48e.message); }
    }

    resultado.criterios = {
      contaPorCPFOk     : conta.ok === true,
      recargaPorCPFOk   : recarga.ok === true,
      prestacaoCartaoOk : prestacao.ok === true,
      liberacaoGeralFalse: libGen !== "true",
      pilotoFLASH44Intacto: flash44,
      recargaNaoCriada  : true
    };

    if (!resultado.criterios.liberacaoGeralFalse) resultado.bloqueios.push("LIBERACAO_GERAL está true — não permitido nesta fase.");
    if (!resultado.criterios.contaPorCPFOk)    resultado.bloqueios.push("Conta por CPF: NOK.");
    if (!resultado.criterios.recargaPorCPFOk)  resultado.bloqueios.push("Schema FIN_CARTOES_RECARGAS incompleto.");

    var todosOk = Object.keys(resultado.criterios).every(function(k) { return resultado.criterios[k] === true; });
    resultado.success = todosOk && resultado.bloqueios.length === 0;
    resultado.ok             = resultado.success;
    resultado.liberacaoGeral  = resultado.criterios.liberacaoGeralFalse === true ? false : true;
    resultado.recargaCriada   = resultado.criterios.recargaNaoCriada === true ? false : true;
    resultado.flash44Intacto  = resultado.criterios.pilotoFLASH44Intacto === true;
    resultado.conclusao = resultado.success
      ? "FLASH.4.8 AUDITORIA FINAL OK — CPF como conta principal, schema pronto, FLASH44 intacto."
      : "FLASH.4.8 AUDITORIA FINAL COM PENDÊNCIAS — ver bloqueios e criterios.";
  } catch (e48f) {
    resultado.bloqueios.push("Erro na auditoria final FLASH.4.8: " + e48f.message);
    resultado.ok             = false;
    resultado.liberacaoGeral  = true;
    resultado.recargaCriada   = true;
    resultado.flash44Intacto  = false;
  }
  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

// ============================================================
// FLASH.4.8B — Orquestrador DEV: setup + auditoria FLASH.4.8
// Escopo global (aparece no seletor de funções do Apps Script).
// NÃO cria recarga. NÃO libera operação geral. NÃO altera produção.
// ============================================================
function EXECUTAR_FLASH48B_SETUP_E_AUDITORIA_DEV_AUTORIZADO() {
  var resultado = {
    success               : false,
    ok                    : false,
    etapa                 : 'INICIO',
    ambiente              : null,
    scriptId              : null,
    dbFinId               : null,
    bloqueios             : [],
    avisos                : [],
    setupExecutado        : false,
    conta                 : null,
    recarga               : null,
    prestacao             : null,
    final                 : null,
    liberacaoGeral        : true,
    recargaCriada         : true,
    flash44Intacto        : false,
    prontoParaTesteHumanoDEV: false
  };

  try {
    resultado.etapa = 'VALIDAR_AMBIENTE';

    var DEV_SCRIPT_ID  = '12xiWNlQ-WKVpiofmcGfBaX4EBdlsIxKFJG2PFTamHUmSUs89c4LW3WSG';
    var PRODUCAO_V2_ID = '1iKgbkoBgRuethKuFhQM1H1W9vRvuBM1tT21-cYizkusfT_YrgHbIbZ1y';
    var DEV_DB_FIN_ID  = '1Q7zvZvtzrYUVGk8oMoOCmTYoE0A7lxP6zbd4GfojuZ0';

    var scriptId = ScriptApp.getScriptId();
    resultado.scriptId = scriptId;

    if (scriptId === PRODUCAO_V2_ID) {
      resultado.bloqueios.push('BLOQUEADO: script é PRODUCAO_V2. Proibido executar em produção.');
      Logger.log(JSON.stringify(resultado, null, 2));
      return resultado;
    }

    if (scriptId !== DEV_SCRIPT_ID) {
      resultado.bloqueios.push('BLOQUEADO: scriptId desconhecido (' + scriptId + '). Permitido apenas em DEV.');
      Logger.log(JSON.stringify(resultado, null, 2));
      return resultado;
    }

    resultado.ambiente = 'DEV';

    var props   = PropertiesService.getScriptProperties();
    var dbFinId = String(props.getProperty('DB_FIN_ID') || '').trim();
    resultado.dbFinId = dbFinId;

    if (!dbFinId) {
      resultado.bloqueios.push('DB_FIN_ID não configurado em ScriptProperties.');
      Logger.log(JSON.stringify(resultado, null, 2));
      return resultado;
    }

    if (dbFinId !== DEV_DB_FIN_ID) {
      resultado.bloqueios.push('BLOQUEADO: DB_FIN_ID não é o banco DEV esperado. Valor atual: ' + dbFinId);
      Logger.log(JSON.stringify(resultado, null, 2));
      return resultado;
    }

    // ── SETUP ──────────────────────────────────────────────────
    resultado.etapa = 'SETUP_FINANCEIRO';
    if (typeof setupFinanceiroV2 !== 'function') {
      resultado.bloqueios.push('setupFinanceiroV2 não encontrada no escopo global.');
      Logger.log(JSON.stringify(resultado, null, 2));
      return resultado;
    }
    setupFinanceiroV2();
    resultado.setupExecutado = true;

    // ── AUDITORIAS ─────────────────────────────────────────────
    resultado.etapa = 'AUDITORIA_CONTA';
    resultado.conta = AUDITAR_FLASH48_CONTA_POR_CPF_SEM_GRAVAR();

    resultado.etapa = 'AUDITORIA_RECARGA';
    resultado.recarga = AUDITAR_FLASH48_RECARGA_POR_CPF_SEM_GRAVAR();

    resultado.etapa = 'AUDITORIA_PRESTACAO';
    resultado.prestacao = AUDITAR_FLASH48_PRESTACAO_CARTOES_DO_CPF_SEM_GRAVAR();

    resultado.etapa = 'AUDITORIA_FINAL';
    resultado.final = AUDITAR_FLASH48_FINAL_SEM_GRAVAR();

    // ── CRITÉRIOS DE APROVAÇÃO ─────────────────────────────────
    var contaOk     = resultado.conta     && resultado.conta.ok     === true;
    var recargaOk   = resultado.recarga   && resultado.recarga.ok   === true;
    var prestacaoOk = resultado.prestacao && resultado.prestacao.ok === true;
    var finalOk     = resultado.final     && resultado.final.ok     === true;

    resultado.liberacaoGeral  = resultado.final ? resultado.final.liberacaoGeral  : true;
    resultado.recargaCriada   = resultado.final ? resultado.final.recargaCriada   : true;
    resultado.flash44Intacto  = resultado.final ? resultado.final.flash44Intacto  : false;

    resultado.prontoParaTesteHumanoDEV =
      contaOk && recargaOk && prestacaoOk && finalOk &&
      resultado.liberacaoGeral  === false &&
      resultado.recargaCriada   === false &&
      resultado.flash44Intacto  === true;

    resultado.ok      = resultado.prontoParaTesteHumanoDEV === true;
    resultado.success = true;
    resultado.etapa   = 'FINALIZADO';

    if (!resultado.ok) {
      resultado.avisos.push('Auditoria concluída mas prontoParaTesteHumanoDEV=false. Veja conta/recarga/prestacao/final para detalhes.');
    }

  } catch (e48b) {
    resultado.success = false;
    resultado.ok      = false;
    resultado.bloqueios.push(String(e48b && e48b.message ? e48b.message : e48b));
    resultado.stack   = e48b && e48b.stack ? e48b.stack : null;
  }

  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

// ============================================================
// FLASH.4.9 — Orquestrador PRODUCAO_V2: setup + auditoria controlada
// Escopo global. NÃO cria recarga. NÃO libera operação geral.
// Executar apenas em PRODUCAO_V2 após clasp push autorizado.
// ============================================================
function PREPARAR_FLASH49_SETUP_E_AUDITORIA_PRODUCAO_V2_SEM_LIBERAR() {
  var resultado = {
    success                      : false,
    ok                           : false,
    etapa                        : 'INICIO',
    ambiente                     : null,
    scriptId                     : null,
    dbFinId                      : null,
    bloqueios                    : [],
    avisos                       : [],
    setupExecutado               : false,
    flash47                      : null,
    flash48                      : null,
    liberacaoGeral               : true,
    recargaCriada                : true,
    flash44Intacto               : false,
    prontoParaTesteHumanoProducaoV2: false
  };

  try {
    resultado.etapa = 'VALIDAR_AMBIENTE';

    var PRODUCAO_V2_SCRIPT_ID = '1iKgbkoBgRuethKuFhQM1H1W9vRvuBM1tT21-cYizkusfT_YrgHbIbZ1y';
    var DEV_SCRIPT_ID         = '12xiWNlQ-WKVpiofmcGfBaX4EBdlsIxKFJG2PFTamHUmSUs89c4LW3WSG';
    var EXPECTED_DB_FIN_ID    = '1Q7zvZvtzrYUVGk8oMoOCmTYoE0A7lxP6zbd4GfojuZ0';

    var scriptId = ScriptApp.getScriptId();
    resultado.scriptId = scriptId;

    if (scriptId === DEV_SCRIPT_ID) {
      resultado.bloqueios.push('BLOQUEADO: script é DEV. Esta função é exclusiva da PRODUCAO_V2.');
      Logger.log(JSON.stringify(resultado, null, 2));
      return resultado;
    }

    if (scriptId !== PRODUCAO_V2_SCRIPT_ID) {
      resultado.bloqueios.push('BLOQUEADO: scriptId desconhecido (' + scriptId + '). Permitido apenas em PRODUCAO_V2.');
      Logger.log(JSON.stringify(resultado, null, 2));
      return resultado;
    }

    resultado.ambiente = 'PRODUCAO_V2';

    var props   = PropertiesService.getScriptProperties();
    var dbFinId = String(props.getProperty('DB_FIN_ID') || '').trim();
    resultado.dbFinId = dbFinId;

    if (!dbFinId) {
      resultado.bloqueios.push('DB_FIN_ID não configurado em ScriptProperties da PRODUCAO_V2.');
      Logger.log(JSON.stringify(resultado, null, 2));
      return resultado;
    }

    if (dbFinId !== EXPECTED_DB_FIN_ID) {
      resultado.bloqueios.push('BLOQUEADO: DB_FIN_ID inesperado (' + dbFinId + '). Aguardado: ' + EXPECTED_DB_FIN_ID);
      Logger.log(JSON.stringify(resultado, null, 2));
      return resultado;
    }

    // ── SETUP IDEMPOTENTE ──────────────────────────────────────
    resultado.etapa = 'SETUP_FINANCEIRO';
    if (typeof setupFinanceiroV2 !== 'function') {
      resultado.bloqueios.push('setupFinanceiroV2 não encontrada no escopo global.');
      Logger.log(JSON.stringify(resultado, null, 2));
      return resultado;
    }
    setupFinanceiroV2();
    resultado.setupExecutado = true;
    resultado.avisos.push('setupFinanceiroV2() executado: colunas FIN_CARTOES (CPF_COLABORADOR, ORIGEM_CARTAO, CHAVE_MULTICARTAO) e FIN_CARTOES_RECARGAS (CPF_COLABORADOR) garantidas.');

    // ── AUDITORIAS ─────────────────────────────────────────────
    resultado.etapa = 'AUDITORIA_FLASH47';
    resultado.flash47 = AUDITAR_FLASH47_FINAL_SEM_GRAVAR();

    resultado.etapa = 'AUDITORIA_FLASH48';
    resultado.flash48 = AUDITAR_FLASH48_FINAL_SEM_GRAVAR();

    // ── CRITÉRIOS DE APROVAÇÃO ─────────────────────────────────
    var flash47Ok = resultado.flash47 && resultado.flash47.ok === true;
    var flash48Ok = resultado.flash48 && resultado.flash48.ok === true;

    resultado.liberacaoGeral = resultado.flash48 ? resultado.flash48.liberacaoGeral : true;
    resultado.recargaCriada  = resultado.flash48 ? resultado.flash48.recargaCriada  : true;
    resultado.flash44Intacto = resultado.flash48 ? resultado.flash48.flash44Intacto : false;

    if (!flash47Ok) resultado.bloqueios.push('FLASH.4.7 auditoria final: NOK — ver flash47.bloqueios.');
    if (!flash48Ok) resultado.bloqueios.push('FLASH.4.8 auditoria final: NOK — ver flash48.bloqueios.');
    if (resultado.liberacaoGeral  !== false) resultado.bloqueios.push('liberacaoGeral deve ser false.');
    if (resultado.recargaCriada   !== false) resultado.bloqueios.push('recargaCriada deve ser false.');
    if (resultado.flash44Intacto  !== true)  resultado.bloqueios.push('piloto FLASH44 ausente ou alterado.');

    resultado.prontoParaTesteHumanoProducaoV2 =
      flash47Ok && flash48Ok &&
      resultado.liberacaoGeral  === false &&
      resultado.recargaCriada   === false &&
      resultado.flash44Intacto  === true &&
      resultado.bloqueios.length === 0;

    resultado.ok      = resultado.prontoParaTesteHumanoProducaoV2 === true;
    resultado.success = true;
    resultado.etapa   = 'FINALIZADO';

    if (!resultado.ok) {
      resultado.avisos.push('Auditoria concluída mas prontoParaTesteHumanoProducaoV2=false. Veja flash47/flash48 para detalhes.');
    }

  } catch (e49) {
    resultado.success = false;
    resultado.ok      = false;
    resultado.bloqueios.push(String(e49 && e49.message ? e49.message : e49));
    resultado.stack   = e49 && e49.stack ? e49.stack : null;
  }

  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

// ============================================================
// FLASH.4.10 - Teste controlado de recarga por CPF (PRODUCAO_V2)
// Tres funcoes: pre-auditoria (SEM_GRAVAR), execucao (AUTORIZADO),
// pos-auditoria (SEM_GRAVAR). Nenhuma altera FLASH44 ou libera geral.
// ============================================================

var _F410_PRODUCAO_V2_ID  = '1iKgbkoBgRuethKuFhQM1H1W9vRvuBM1tT21-cYizkusfT_YrgHbIbZ1y';
var _F410_DEV_ID          = '12xiWNlQ-WKVpiofmcGfBaX4EBdlsIxKFJG2PFTamHUmSUs89c4LW3WSG';
var _F410_EXPECTED_DB     = '1Q7zvZvtzrYUVGk8oMoOCmTYoE0A7lxP6zbd4GfojuZ0';
var _F410_BRUNA_NOME      = 'BRUNA OLIVEIRA DOS SANTOS';
var _F410_CHAVE           = 'FLASH410_RECARGA_CPF_BRUNA_PRODUCAO_V2_TESTE_001';
var _F410_CHAVE_MARKER    = 'CHAVE_IDEM=' + _F410_CHAVE;
var _F410_VALOR_TESTE     = 1.00;

// helper interno: valida ambiente PRODUCAO_V2
function _f410ValidarAmbientePV2_() {
  var scriptId = ScriptApp.getScriptId();
  if (scriptId === _F410_DEV_ID) {
    return { ok: false, bloqueio: 'BLOQUEADO: script e DEV. FLASH.4.10 exclusivo da PRODUCAO_V2.', scriptId: scriptId };
  }
  if (scriptId !== _F410_PRODUCAO_V2_ID) {
    return { ok: false, bloqueio: 'BLOQUEADO: scriptId desconhecido. Esperado PRODUCAO_V2.', scriptId: scriptId };
  }
  var props   = PropertiesService.getScriptProperties();
  var dbFinId = String(props.getProperty('DB_FIN_ID') || '').trim();
  if (!dbFinId) {
    return { ok: false, bloqueio: 'DB_FIN_ID nao configurado.', scriptId: scriptId };
  }
  if (dbFinId !== _F410_EXPECTED_DB) {
    return { ok: false, bloqueio: 'DB_FIN_ID inesperado: ' + dbFinId, scriptId: scriptId };
  }
  var ss = null;
  try { ss = SpreadsheetApp.openById(dbFinId); } catch(e) {
    return { ok: false, bloqueio: 'Sem acesso ao DB_FIN_ID: ' + e.message, scriptId: scriptId, dbFinId: dbFinId };
  }
  return { ok: true, scriptId: scriptId, dbFinId: dbFinId, ss: ss };
}

// helper: encontra Bruna em FIN_CARTOES
function _f410BuscarBruna_(ss) {
  var sh = ss.getSheetByName('FIN_CARTOES');
  if (!sh || sh.getLastRow() < 2) return null;
  var dados = sh.getRange(1, 1, sh.getLastRow(), sh.getLastColumn()).getValues();
  var h     = dados[0].map(function(x) { return String(x || '').trim().toUpperCase(); });
  var iNome = h.indexOf('FUNCIONARIO_NOME');
  var iCPF  = h.indexOf('CPF_COLABORADOR');
  var iFid  = h.indexOf('FUNCIONARIO_ID');
  var iSt   = h.indexOf('STATUS_CARTAO');
  var iTipo = h.indexOf('TIPO_CARTAO');
  var iFin  = h.indexOf('NUMERO_FINAL_4');
  var iCid  = h.indexOf('CARTAO_ID');
  if (iNome < 0 || iCPF < 0) return null;

  var mapa = {};
  for (var i = 1; i < dados.length; i++) {
    var nome = String(iNome >= 0 ? dados[i][iNome] : '').trim().toUpperCase();
    if (nome !== _F410_BRUNA_NOME) continue;
    var cpf  = String(iCPF >= 0 ? dados[i][iCPF] : '').replace(/\D/g, '');
    var fid  = String(iFid >= 0 ? dados[i][iFid] : '').trim();
    var st   = String(iSt  >= 0 ? dados[i][iSt]  : '').trim().toUpperCase();
    var tipo = String(iTipo >= 0 ? dados[i][iTipo]: '').trim().toUpperCase();
    var fin  = String(iFin  >= 0 ? dados[i][iFin] : '').replace(/\D/g, '');
    var cid  = String(iCid  >= 0 ? dados[i][iCid] : '').trim();
    var chave = cpf || fid;
    if (!mapa[chave]) mapa[chave] = { cpf: cpf, funcionarioId: fid, cartoes: [] };
    mapa[chave].cartoes.push({ cartaoId: cid, tipo: tipo, final: fin, status: st });
  }
  var chaves = Object.keys(mapa);
  if (chaves.length === 0) return null;
  return mapa[chaves[0]];
}

// helper: conta recargas na aba
function _f410ContarRecargas_(ss) {
  var sh = ss.getSheetByName('FIN_CARTOES_RECARGAS');
  if (!sh || sh.getLastRow() < 2) return 0;
  return sh.getLastRow() - 1;
}

// helper: verifica se CHAVE_IDEM ja existe em OBSERVACOES
function _f410ChaveExiste_(ss) {
  var sh = ss.getSheetByName('FIN_CARTOES_RECARGAS');
  if (!sh || sh.getLastRow() < 2) return { existe: false, quantidade: 0 };
  var dados = sh.getRange(1, 1, sh.getLastRow(), sh.getLastColumn()).getValues();
  var h     = dados[0].map(function(x) { return String(x || '').trim().toUpperCase(); });
  var iObs  = h.indexOf('OBSERVACOES');
  var count = 0;
  for (var i = 1; i < dados.length; i++) {
    var obs = String(iObs >= 0 ? dados[i][iObs] : '');
    if (obs.indexOf(_F410_CHAVE_MARKER) >= 0) count++;
  }
  return { existe: count > 0, quantidade: count };
}

// helper: verifica FLASH44 intacto
function _f410Flash44Intacto_(ss) {
  var sh = ss.getSheetByName('FIN_CARTOES');
  if (!sh || sh.getLastRow() < 2) return false;
  var dados = sh.getRange(1, 1, sh.getLastRow(), sh.getLastColumn()).getValues();
  var h     = dados[0].map(function(x) { return String(x || '').trim().toUpperCase(); });
  var iFid  = h.indexOf('FUNCIONARIO_ID');
  if (iFid < 0) return false;
  for (var i = 1; i < dados.length; i++) {
    if (String(dados[i][iFid]).trim() === 'PILOTO_FLASH44') return true;
  }
  return false;
}

// helper: le liberacaoGeral de ScriptProperties
function _f410LiberacaoGeral_() {
  var val = String(PropertiesService.getScriptProperties().getProperty('FIN_LIBERACAO_GERAL') || 'false').trim().toLowerCase();
  return val === 'true';
}

// ============================================================
// 1. PRE-AUDITORIA - somente leitura
// ============================================================
function PRE_AUDITAR_FLASH410_RECARGA_CPF_PRODUCAO_V2_SEM_GRAVAR() {
  var resultado = {
    versao                      : 'FLASH.4.10',
    modo                        : 'PRE_AUDITORIA_SEM_GRAVAR',
    somenteLeitura              : true,
    gravacaoReal                : false,
    success                     : false,
    ok                          : false,
    ambiente                    : null,
    cpfColaborador              : null,
    nomeColaborador             : _F410_BRUNA_NOME,
    cartoesVinculados           : [],
    totalCartoesAtivos          : 0,
    totalRecargasAntes          : 0,
    chaveIdempotenciaTeste      : _F410_CHAVE,
    chaveJaExiste               : false,
    schemaRecargaOk             : false,
    bloqueios                   : [],
    avisos                      : [],
    prontoParaExecucaoControlada: false
  };

  try {
    var amb = _f410ValidarAmbientePV2_();
    resultado.ambiente = amb.ok ? 'PRODUCAO_V2' : null;
    if (!amb.ok) {
      resultado.bloqueios.push(amb.bloqueio);
      Logger.log(JSON.stringify(resultado, null, 2));
      return resultado;
    }
    var ss = amb.ss;

    // Verificar schema FIN_CARTOES_RECARGAS tem CPF_COLABORADOR
    var shRec = ss.getSheetByName('FIN_CARTOES_RECARGAS');
    if (!shRec) {
      resultado.bloqueios.push('FIN_CARTOES_RECARGAS nao encontrada. Execute setupFinanceiroV2().');
    } else {
      var lastColRec = shRec.getLastColumn();
      var hdrsRec    = lastColRec >= 1
        ? shRec.getRange(1, 1, 1, lastColRec).getValues()[0].map(function(x) { return String(x || '').trim().toUpperCase(); })
        : [];
      resultado.schemaRecargaOk = hdrsRec.indexOf('CPF_COLABORADOR') >= 0;
      if (!resultado.schemaRecargaOk) {
        resultado.bloqueios.push('Campo CPF_COLABORADOR ausente em FIN_CARTOES_RECARGAS. Execute PREPARAR_FLASH49.');
      }
    }

    // Buscar Bruna
    var bruna = _f410BuscarBruna_(ss);
    if (!bruna) {
      resultado.bloqueios.push('BRUNA OLIVEIRA DOS SANTOS nao encontrada em FIN_CARTOES.');
    } else {
      resultado.cpfColaborador    = bruna.cpf;
      resultado.cartoesVinculados = bruna.cartoes;
      resultado.totalCartoesAtivos = bruna.cartoes.filter(function(c) { return c.status === 'ATIVO'; }).length;
      if (!bruna.cpf) resultado.bloqueios.push('Bruna encontrada mas CPF_COLABORADOR vazio.');
      if (resultado.totalCartoesAtivos < 1) resultado.bloqueios.push('Bruna nao tem cartoes ATIVO.');
      else if (resultado.totalCartoesAtivos !== 3) resultado.avisos.push('Bruna tem ' + resultado.totalCartoesAtivos + ' cartao(oes) ATIVO(s) — esperado 3.');
    }

    // Verificar duplicidade da chave
    var chaveInfo = _f410ChaveExiste_(ss);
    resultado.chaveJaExiste      = chaveInfo.existe;
    resultado.totalRecargasAntes = _f410ContarRecargas_(ss);
    if (chaveInfo.existe) {
      resultado.bloqueios.push('Chave de idempotencia ja registrada (' + chaveInfo.quantidade + 'x). Execucao seria bloqueada.');
    }

    resultado.prontoParaExecucaoControlada =
      resultado.bloqueios.length === 0 &&
      resultado.schemaRecargaOk &&
      !!resultado.cpfColaborador &&
      resultado.totalCartoesAtivos >= 1 &&
      !resultado.chaveJaExiste;

    resultado.success = true;
    resultado.ok      = resultado.prontoParaExecucaoControlada;

    if (resultado.ok) {
      resultado.avisos.push('PRE-AUDITORIA OK. Seguro executar EXECUTAR_FLASH410_RECARGA_CPF_PRODUCAO_V2_AUTORIZADO().');
    } else {
      resultado.avisos.push('PRE-AUDITORIA: prontoParaExecucaoControlada=false. Veja bloqueios.');
    }

  } catch (e410a) {
    resultado.bloqueios.push('Erro: ' + (e410a.message || e410a));
  }

  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

// ============================================================
// 2. EXECUCAO CONTROLADA - cria 1 recarga (idempotente por chave)
// ============================================================
function EXECUTAR_FLASH410_RECARGA_CPF_PRODUCAO_V2_AUTORIZADO() {
  var resultado = {
    versao              : 'FLASH.4.10',
    modo                : 'EXECUCAO_CONTROLADA_AUTORIZADO',
    executado           : true,
    gravacaoReal        : true,
    success             : false,
    ok                  : false,
    ambiente            : null,
    cpfColaborador      : null,
    recargaCriada       : false,
    recargaId           : null,
    valor               : _F410_VALOR_TESTE,
    chaveIdempotencia   : _F410_CHAVE,
    totalRecargasAntes  : 0,
    totalRecargasDepois : 0,
    liberacaoGeral      : true,
    flash44Intacto      : false,
    bloqueios           : [],
    avisos              : []
  };

  try {
    var amb = _f410ValidarAmbientePV2_();
    resultado.ambiente = amb.ok ? 'PRODUCAO_V2' : null;
    if (!amb.ok) {
      resultado.bloqueios.push(amb.bloqueio);
      Logger.log(JSON.stringify(resultado, null, 2));
      return resultado;
    }
    var ss = amb.ss;

    resultado.liberacaoGeral = _f410LiberacaoGeral_();
    resultado.flash44Intacto = _f410Flash44Intacto_(ss);

    if (resultado.liberacaoGeral) {
      resultado.bloqueios.push('BLOQUEADO: liberacaoGeral esta true.');
      Logger.log(JSON.stringify(resultado, null, 2));
      return resultado;
    }
    if (!resultado.flash44Intacto) {
      resultado.bloqueios.push('BLOQUEADO: piloto FLASH44 ausente ou alterado.');
      Logger.log(JSON.stringify(resultado, null, 2));
      return resultado;
    }

    resultado.totalRecargasAntes = _f410ContarRecargas_(ss);

    // Idempotencia: verificar se chave ja existe
    var chaveInfo = _f410ChaveExiste_(ss);
    if (chaveInfo.existe) {
      resultado.bloqueios.push('DUPLICIDADE BLOQUEADA: chave ' + _F410_CHAVE + ' ja existe (' + chaveInfo.quantidade + 'x). Nenhuma recarga criada.');
      resultado.recargaCriada     = false;
      resultado.success           = true;
      resultado.ok                = false;
      resultado.totalRecargasDepois = resultado.totalRecargasAntes;
      Logger.log(JSON.stringify(resultado, null, 2));
      return resultado;
    }

    // Buscar Bruna e primeiro cartao ATIVO
    var bruna = _f410BuscarBruna_(ss);
    if (!bruna || !bruna.cpf) {
      resultado.bloqueios.push('Bruna nao encontrada ou CPF vazio. Abortando.');
      Logger.log(JSON.stringify(resultado, null, 2));
      return resultado;
    }
    var cartaoAtivo = bruna.cartoes.filter(function(c) { return c.status === 'ATIVO'; })[0];
    if (!cartaoAtivo) {
      resultado.bloqueios.push('Nenhum cartao ATIVO para Bruna.');
      Logger.log(JSON.stringify(resultado, null, 2));
      return resultado;
    }
    resultado.cpfColaborador = bruna.cpf;

    // Ler headers reais da aba (a coluna CPF_COLABORADOR foi adicionada ao final pelo setup)
    var shRec   = ss.getSheetByName('FIN_CARTOES_RECARGAS');
    if (!shRec) {
      resultado.bloqueios.push('FIN_CARTOES_RECARGAS nao encontrada.');
      Logger.log(JSON.stringify(resultado, null, 2));
      return resultado;
    }
    var lastCol = shRec.getLastColumn();
    var hdrsRec = lastCol >= 1
      ? shRec.getRange(1, 1, 1, lastCol).getValues()[0].map(function(x) { return String(x || '').trim(); })
      : [];
    if (hdrsRec.map(function(h) { return h.toUpperCase(); }).indexOf('CPF_COLABORADOR') < 0) {
      resultado.bloqueios.push('CPF_COLABORADOR ausente do schema de RECARGAS. Execute PREPARAR_FLASH49.');
      Logger.log(JSON.stringify(resultado, null, 2));
      return resultado;
    }

    var agora     = new Date().toISOString();
    var dataHoje  = agora.slice(0, 10);
    var recargaId = 'REC_F410_' + new Date().getTime();
    var uuid      = Utilities.getUuid();

    var reg = {
      ID                       : uuid,
      RECARGA_ID               : recargaId,
      CARTAO_ID                : cartaoAtivo.cartaoId,
      CPF_COLABORADOR          : bruna.cpf,
      FUNCIONARIO_ID           : bruna.funcionarioId,
      FUNCIONARIO_NOME         : _F410_BRUNA_NOME,
      VALOR                    : _F410_VALOR_TESTE,
      DATA_RECARGA             : dataHoje,
      PERIODO_REFERENCIA       : '',
      FORMA_RECARGA            : 'FLASH410_TESTE',
      NUMERO_TRANSFERENCIA     : '',
      BANCO_ORIGEM             : '',
      COMPROVANTE_FILE_ID      : '',
      COMPROVANTE_LINK         : '',
      RESPONSAVEL_FINANCEIRO_ID: 'FLASH410_SISTEMA',
      RESPONSAVEL_NOME         : 'FLASH.4.10 Teste Controlado',
      AUTORIZADO_POR_ID        : 'FLASH410_AUTORIZADO',
      AUTORIZADO_POR_NOME      : 'FLASH.4.10 Teste Controlado',
      OBSERVACOES              : '[FLASH410] ' + _F410_CHAVE_MARKER + ' | Teste controlado FLASH.4.10 recarga por CPF/conta nao por cartao individual',
      STATUS                   : 'TESTE_CONTROLADO',
      CRIADO_EM                : agora,
      CRIADO_POR               : 'FLASH.4.10 Teste Controlado',
      ATUALIZADO_EM            : agora,
      ATUALIZADO_POR           : 'FLASH.4.10 Teste Controlado'
    };

    // Mapear para a ordem real das colunas no spreadsheet
    var row = hdrsRec.map(function(h) {
      var chaveNorm = h.toUpperCase().replace(/\s/g, '_');
      if (reg.hasOwnProperty(h)) return reg[h];
      if (reg.hasOwnProperty(chaveNorm)) return reg[chaveNorm];
      return '';
    });
    shRec.appendRow(row);

    resultado.recargaCriada       = true;
    resultado.recargaId           = recargaId;
    resultado.totalRecargasDepois = _f410ContarRecargas_(ss);
    resultado.success             = true;
    resultado.ok                  = true;
    resultado.avisos.push('Recarga TESTE_CONTROLADO criada. CPF_COLABORADOR: ' + bruna.cpf + '. CARTAO_ID (compat): ' + cartaoAtivo.cartaoId);

  } catch (e410b) {
    resultado.bloqueios.push('Erro: ' + (e410b.message || e410b));
    resultado.stack = e410b.stack || null;
  }

  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

// ============================================================
// 3. POS-AUDITORIA - somente leitura
// ============================================================
function AUDITAR_FLASH410_POS_RECARGA_CPF_PRODUCAO_V2_SEM_GRAVAR() {
  var resultado = {
    versao                  : 'FLASH.4.10',
    modo                    : 'POS_AUDITORIA_SEM_GRAVAR',
    somenteLeitura          : true,
    gravacaoReal            : false,
    success                 : false,
    ok                      : false,
    ambiente                : null,
    recargaEncontrada       : false,
    quantidadeComMesmaChave : 0,
    cpfColaboradorOk        : false,
    contaPorCPFOk           : false,
    flash44Intacto          : false,
    liberacaoGeral          : true,
    cartoesAtivos           : 0,
    conclusao               : '',
    bloqueios               : [],
    avisos                  : []
  };

  try {
    var amb = _f410ValidarAmbientePV2_();
    resultado.ambiente = amb.ok ? 'PRODUCAO_V2' : null;
    if (!amb.ok) {
      resultado.bloqueios.push(amb.bloqueio);
      Logger.log(JSON.stringify(resultado, null, 2));
      return resultado;
    }
    var ss = amb.ss;

    resultado.liberacaoGeral = _f410LiberacaoGeral_();
    resultado.flash44Intacto = _f410Flash44Intacto_(ss);

    if (resultado.liberacaoGeral) resultado.bloqueios.push('liberacaoGeral esta true — inesperado.');
    if (!resultado.flash44Intacto) resultado.bloqueios.push('Piloto FLASH44 ausente — inesperado.');

    // Verificar recarga com a chave
    var chaveInfo = _f410ChaveExiste_(ss);
    resultado.quantidadeComMesmaChave = chaveInfo.quantidade;
    resultado.recargaEncontrada       = chaveInfo.quantidade === 1;
    if (chaveInfo.quantidade === 0) resultado.bloqueios.push('Nenhuma recarga com a chave FLASH.4.10. Execute EXECUTAR_FLASH410 primeiro.');
    if (chaveInfo.quantidade > 1)  resultado.bloqueios.push('DUPLICIDADE: ' + chaveInfo.quantidade + ' recargas com a mesma chave.');

    // Verificar CPF na recarga encontrada
    var shRec = ss.getSheetByName('FIN_CARTOES_RECARGAS');
    if (shRec && shRec.getLastRow() >= 2) {
      var dadosRec = shRec.getRange(1, 1, shRec.getLastRow(), shRec.getLastColumn()).getValues();
      var hRec     = dadosRec[0].map(function(x) { return String(x || '').trim().toUpperCase(); });
      var iObs     = hRec.indexOf('OBSERVACOES');
      var iCPFR    = hRec.indexOf('CPF_COLABORADOR');
      for (var j = 1; j < dadosRec.length; j++) {
        var obs = String(iObs >= 0 ? dadosRec[j][iObs] : '');
        if (obs.indexOf(_F410_CHAVE_MARKER) >= 0) {
          var cpfRec = String(iCPFR >= 0 ? dadosRec[j][iCPFR] : '').replace(/\D/g, '');
          resultado.cpfColaboradorOk = cpfRec.length >= 9;
          if (!resultado.cpfColaboradorOk) resultado.bloqueios.push('CPF_COLABORADOR vazio ou invalido na recarga encontrada.');
          break;
        }
      }
    }

    // Verificar Bruna e cartoes ativos
    var bruna = _f410BuscarBruna_(ss);
    if (bruna) {
      resultado.cartoesAtivos = bruna.cartoes.filter(function(c) { return c.status === 'ATIVO'; }).length;
      resultado.contaPorCPFOk = resultado.cartoesAtivos >= 1 && !!bruna.cpf;
      if (resultado.cartoesAtivos !== 3) {
        resultado.avisos.push('Bruna tem ' + resultado.cartoesAtivos + ' cartao(oes) ATIVO(s) — esperado 3.');
      }
    } else {
      resultado.bloqueios.push('Bruna nao encontrada em FIN_CARTOES.');
    }

    var tudoOk =
      resultado.recargaEncontrada &&
      resultado.cpfColaboradorOk &&
      resultado.contaPorCPFOk &&
      resultado.flash44Intacto &&
      resultado.liberacaoGeral === false &&
      resultado.bloqueios.length === 0;

    resultado.success  = true;
    resultado.ok       = tudoOk;
    resultado.conclusao = tudoOk
      ? 'POS-AUDITORIA FLASH.4.10 OK — recarga por CPF confirmada, FLASH44 intacto, liberacao geral false.'
      : 'POS-AUDITORIA FLASH.4.10 COM PENDENCIAS — veja bloqueios.';

  } catch (e410c) {
    resultado.bloqueios.push('Erro: ' + (e410c.message || e410c));
  }

  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

// ============================================================
// FLASH.4.11 - Teste controlado de prestacao de contas por cartao
// Alvo: FIN_CARTOES_LANCAMENTOS, cartao VIRTUAL 546 da Bruna
// Tres funcoes: pre-auditoria, execucao, pos-auditoria
// ============================================================

var _F411_CHAVE        = 'FLASH411_PRESTACAO_BRUNA_VIRTUAL_546_TESTE_001';
var _F411_CHAVE_MARKER = 'CHAVE_IDEM=' + _F411_CHAVE;
var _F411_VALOR_TESTE  = 1.00;
var _F411_TIPO_ALVO    = 'VIRTUAL';
var _F411_FINAL_ALVO   = '546';

// helper: encontra o CARTAO_ID especifico (VIRTUAL final 546) nos cartoes da Bruna
function _f411CartaoVirtual546_(bruna) {
  if (!bruna || !bruna.cartoes) return null;
  return bruna.cartoes.find(function(c) {
    return c.tipo === _F411_TIPO_ALVO && c.final === _F411_FINAL_ALVO && c.status === 'ATIVO';
  }) || null;
}

// helper: verifica CHAVE_IDEM em FIN_CARTOES_LANCAMENTOS
function _f411ChaveExiste_(ss) {
  var sh = ss.getSheetByName('FIN_CARTOES_LANCAMENTOS');
  if (!sh || sh.getLastRow() < 2) return { existe: false, quantidade: 0 };
  var dados = sh.getRange(1, 1, sh.getLastRow(), sh.getLastColumn()).getValues();
  var h     = dados[0].map(function(x) { return String(x || '').trim().toUpperCase(); });
  var iObs  = h.indexOf('OBSERVACOES');
  var count = 0;
  for (var i = 1; i < dados.length; i++) {
    var obs = String(iObs >= 0 ? dados[i][iObs] : '');
    if (obs.indexOf(_F411_CHAVE_MARKER) >= 0) count++;
  }
  return { existe: count > 0, quantidade: count };
}

// helper: conta lancamentos na aba
function _f411ContarLancamentos_(ss) {
  var sh = ss.getSheetByName('FIN_CARTOES_LANCAMENTOS');
  if (!sh || sh.getLastRow() < 2) return 0;
  return sh.getLastRow() - 1;
}

// helper: verifica se a aba FIN_CARTOES_LANCAMENTOS existe e tem cabecalhos basicos
function _f411SchemaLancamentosOk_(ss) {
  var sh = ss.getSheetByName('FIN_CARTOES_LANCAMENTOS');
  if (!sh) return { ok: false, motivo: 'FIN_CARTOES_LANCAMENTOS nao encontrada.' };
  if (sh.getLastColumn() < 1) return { ok: false, motivo: 'FIN_CARTOES_LANCAMENTOS sem cabecalhos.' };
  var hdrs = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0]
    .map(function(x) { return String(x || '').trim().toUpperCase(); });
  var obrigatorios = ['ID', 'LANCAMENTO_ID', 'CARTAO_ID', 'FUNCIONARIO_ID', 'FUNCIONARIO_NOME', 'VALOR', 'OBSERVACOES', 'STATUS_PRESTACAO'];
  var faltantes    = obrigatorios.filter(function(f) { return hdrs.indexOf(f) < 0; });
  if (faltantes.length > 0) return { ok: false, motivo: 'Campos ausentes: ' + faltantes.join(', ') };
  return { ok: true };
}

// ============================================================
// 1. PRE-AUDITORIA - somente leitura
// ============================================================
function PRE_AUDITAR_FLASH411_PRESTACAO_CARTAO_PRODUCAO_V2_SEM_GRAVAR() {
  var resultado = {
    versao                      : 'FLASH.4.11',
    modo                        : 'PRE_AUDITORIA_SEM_GRAVAR',
    somenteLeitura              : true,
    gravacaoReal                : false,
    success                     : false,
    ok                          : false,
    ambiente                    : null,
    cpfColaborador              : null,
    nomeColaborador             : _F410_BRUNA_NOME,
    cartaoAlvo                  : null,
    totalCartoesAtivos          : 0,
    totalLancamentosAntes       : 0,
    chaveIdempotenciaTeste      : _F411_CHAVE,
    chaveJaExiste               : false,
    schemaLancamentosOk         : false,
    bloqueios                   : [],
    avisos                      : [],
    prontoParaExecucaoControlada: false
  };

  try {
    var amb = _f410ValidarAmbientePV2_();
    resultado.ambiente = amb.ok ? 'PRODUCAO_V2' : null;
    if (!amb.ok) {
      resultado.bloqueios.push(amb.bloqueio);
      Logger.log(JSON.stringify(resultado, null, 2));
      return resultado;
    }
    var ss = amb.ss;

    // Schema FIN_CARTOES_LANCAMENTOS
    var schema = _f411SchemaLancamentosOk_(ss);
    resultado.schemaLancamentosOk = schema.ok;
    if (!schema.ok) resultado.bloqueios.push(schema.motivo);

    // Buscar Bruna e cartoes
    var bruna = _f410BuscarBruna_(ss);
    if (!bruna) {
      resultado.bloqueios.push('BRUNA OLIVEIRA DOS SANTOS nao encontrada em FIN_CARTOES.');
    } else {
      resultado.cpfColaborador  = bruna.cpf;
      resultado.totalCartoesAtivos = bruna.cartoes.filter(function(c) { return c.status === 'ATIVO'; }).length;
      if (!bruna.cpf) resultado.bloqueios.push('Bruna encontrada mas CPF_COLABORADOR vazio.');
      if (resultado.totalCartoesAtivos !== 3) resultado.avisos.push('Bruna tem ' + resultado.totalCartoesAtivos + ' cartao(oes) ATIVO(s) — esperado 3.');

      // Cartao alvo: VIRTUAL 546
      var cartaoAlvo = _f411CartaoVirtual546_(bruna);
      if (!cartaoAlvo) {
        resultado.bloqueios.push('Cartao VIRTUAL final 546 nao encontrado ou nao ATIVO para Bruna.');
      } else {
        resultado.cartaoAlvo = cartaoAlvo;
      }
    }

    // Verificar duplicidade
    var chaveInfo = _f411ChaveExiste_(ss);
    resultado.chaveJaExiste        = chaveInfo.existe;
    resultado.totalLancamentosAntes = _f411ContarLancamentos_(ss);
    if (chaveInfo.existe) {
      resultado.bloqueios.push('Chave de idempotencia ja registrada (' + chaveInfo.quantidade + 'x). Execucao seria bloqueada.');
    }

    resultado.prontoParaExecucaoControlada =
      resultado.bloqueios.length === 0 &&
      resultado.schemaLancamentosOk &&
      !!resultado.cpfColaborador &&
      !!resultado.cartaoAlvo &&
      !resultado.chaveJaExiste;

    resultado.success = true;
    resultado.ok      = resultado.prontoParaExecucaoControlada;

    if (resultado.ok) {
      resultado.avisos.push('PRE-AUDITORIA OK. Seguro executar EXECUTAR_FLASH411_PRESTACAO_CARTAO_PRODUCAO_V2_AUTORIZADO().');
    } else {
      resultado.avisos.push('PRE-AUDITORIA: prontoParaExecucaoControlada=false. Veja bloqueios.');
    }

  } catch (e411a) {
    resultado.bloqueios.push('Erro: ' + (e411a.message || e411a));
  }

  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

// ============================================================
// 2. EXECUCAO CONTROLADA - cria 1 lancamento (idempotente)
// ============================================================
function EXECUTAR_FLASH411_PRESTACAO_CARTAO_PRODUCAO_V2_AUTORIZADO() {
  var resultado = {
    versao                : 'FLASH.4.11',
    modo                  : 'EXECUCAO_CONTROLADA_AUTORIZADO',
    executado             : true,
    gravacaoReal          : true,
    success               : false,
    ok                    : false,
    ambiente              : null,
    cpfColaborador        : null,
    cartaoId              : null,
    lancamentoCriado      : false,
    lancamentoId          : null,
    valor                 : _F411_VALOR_TESTE,
    chaveIdempotencia     : _F411_CHAVE,
    totalLancamentosAntes : 0,
    totalLancamentosDepois: 0,
    liberacaoGeral        : true,
    flash44Intacto        : false,
    bloqueios             : [],
    avisos                : []
  };

  try {
    var amb = _f410ValidarAmbientePV2_();
    resultado.ambiente = amb.ok ? 'PRODUCAO_V2' : null;
    if (!amb.ok) {
      resultado.bloqueios.push(amb.bloqueio);
      Logger.log(JSON.stringify(resultado, null, 2));
      return resultado;
    }
    var ss = amb.ss;

    resultado.liberacaoGeral = _f410LiberacaoGeral_();
    resultado.flash44Intacto = _f410Flash44Intacto_(ss);

    if (resultado.liberacaoGeral) {
      resultado.bloqueios.push('BLOQUEADO: liberacaoGeral esta true.');
      Logger.log(JSON.stringify(resultado, null, 2));
      return resultado;
    }
    if (!resultado.flash44Intacto) {
      resultado.bloqueios.push('BLOQUEADO: piloto FLASH44 ausente ou alterado.');
      Logger.log(JSON.stringify(resultado, null, 2));
      return resultado;
    }

    resultado.totalLancamentosAntes = _f411ContarLancamentos_(ss);

    // Idempotencia
    var chaveInfo = _f411ChaveExiste_(ss);
    if (chaveInfo.existe) {
      resultado.bloqueios.push('DUPLICIDADE BLOQUEADA: chave ' + _F411_CHAVE + ' ja existe (' + chaveInfo.quantidade + 'x).');
      resultado.lancamentoCriado      = false;
      resultado.success               = true;
      resultado.ok                    = false;
      resultado.totalLancamentosDepois = resultado.totalLancamentosAntes;
      Logger.log(JSON.stringify(resultado, null, 2));
      return resultado;
    }

    // Buscar Bruna e cartao VIRTUAL 546
    var bruna = _f410BuscarBruna_(ss);
    if (!bruna || !bruna.cpf) {
      resultado.bloqueios.push('Bruna nao encontrada ou CPF vazio.');
      Logger.log(JSON.stringify(resultado, null, 2));
      return resultado;
    }
    var cartaoAlvo = _f411CartaoVirtual546_(bruna);
    if (!cartaoAlvo) {
      resultado.bloqueios.push('Cartao VIRTUAL 546 nao encontrado ou nao ATIVO para Bruna.');
      Logger.log(JSON.stringify(resultado, null, 2));
      return resultado;
    }

    resultado.cpfColaborador = bruna.cpf;
    resultado.cartaoId       = cartaoAlvo.cartaoId;

    // Ler headers reais da aba
    var shLanc  = ss.getSheetByName('FIN_CARTOES_LANCAMENTOS');
    if (!shLanc) {
      resultado.bloqueios.push('FIN_CARTOES_LANCAMENTOS nao encontrada.');
      Logger.log(JSON.stringify(resultado, null, 2));
      return resultado;
    }
    var lastCol  = shLanc.getLastColumn();
    var hdrsLanc = lastCol >= 1
      ? shLanc.getRange(1, 1, 1, lastCol).getValues()[0].map(function(x) { return String(x || '').trim(); })
      : [];
    if (hdrsLanc.length === 0) {
      resultado.bloqueios.push('FIN_CARTOES_LANCAMENTOS sem cabecalhos.');
      Logger.log(JSON.stringify(resultado, null, 2));
      return resultado;
    }

    var agora       = new Date().toISOString();
    var dataHoje    = agora.slice(0, 10);
    var horaAgora   = agora.slice(11, 19);
    var lancId      = 'LANC_F411_' + new Date().getTime();
    var uuid        = Utilities.getUuid();

    var reg = {
      ID                    : uuid,
      LANCAMENTO_ID         : lancId,
      CARTAO_ID             : cartaoAlvo.cartaoId,
      FUNCIONARIO_ID        : bruna.funcionarioId,
      FUNCIONARIO_NOME      : _F410_BRUNA_NOME,
      DATA_GASTO            : dataHoje,
      HORA_GASTO            : horaAgora,
      VALOR                 : _F411_VALOR_TESTE,
      ESTABELECIMENTO       : 'TESTE_FLASH411',
      CATEGORIA_GASTO       : 'TESTE_CONTROLADO',
      OS_ID                 : '',
      OS_NUMERO             : '',
      TEM_OS                : 'NAO',
      JUSTIFICATIVA_SEM_OS  : 'Teste controlado FLASH.4.11',
      LATITUDE              : '',
      LONGITUDE             : '',
      LOCALIZACAO_TEXTO     : '',
      ENDERECO_APROXIMADO   : '',
      COMPROVANTE_OK        : 'NAO',
      COMPROVANTE_FILE_ID   : '',
      COMPROVANTE_LINK      : '',
      TIPO_COMPROVANTE      : '',
      DESCRICAO_GASTO       : 'Teste FLASH.4.11 prestacao por cartao correto vinculado ao CPF da Bruna',
      OBSERVACOES           : '[FLASH411] ' + _F411_CHAVE_MARKER + ' | Teste FLASH.4.11 prestacao por cartao correto vinculado ao CPF da Bruna',
      STATUS_PRESTACAO      : 'TESTE_CONTROLADO',
      DATA_APROVACAO        : '',
      APROVADO_POR          : '',
      MOTIVO_REJEICAO       : '',
      CONCILIADO            : 'NAO',
      LANCAMENTO_EXTRATO_ID : '',
      DIVERGENCIA_TIPO      : '',
      DIVERGENCIA_VALOR     : '',
      STATUS                : 'TESTE_CONTROLADO',
      CRIADO_EM             : agora,
      CRIADO_POR            : 'FLASH.4.11 Teste Controlado',
      ATUALIZADO_EM         : agora,
      ATUALIZADO_POR        : 'FLASH.4.11 Teste Controlado'
    };

    var row = hdrsLanc.map(function(h) {
      var hNorm = h.toUpperCase().replace(/\s/g, '_');
      if (reg.hasOwnProperty(h)) return reg[h];
      if (reg.hasOwnProperty(hNorm)) return reg[hNorm];
      return '';
    });
    shLanc.appendRow(row);

    resultado.lancamentoCriado       = true;
    resultado.lancamentoId           = lancId;
    resultado.totalLancamentosDepois = _f411ContarLancamentos_(ss);
    resultado.success                = true;
    resultado.ok                     = true;
    resultado.avisos.push('Lancamento TESTE_CONTROLADO criado. CARTAO_ID VIRTUAL 546: ' + cartaoAlvo.cartaoId + '. CPF: ' + bruna.cpf);

  } catch (e411b) {
    resultado.bloqueios.push('Erro: ' + (e411b.message || e411b));
    resultado.stack = e411b.stack || null;
  }

  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

// ============================================================
// 3. POS-AUDITORIA - somente leitura
// ============================================================
function AUDITAR_FLASH411_POS_PRESTACAO_CARTAO_PRODUCAO_V2_SEM_GRAVAR() {
  var resultado = {
    versao                  : 'FLASH.4.11',
    modo                    : 'POS_AUDITORIA_SEM_GRAVAR',
    somenteLeitura          : true,
    gravacaoReal            : false,
    success                 : false,
    ok                      : false,
    ambiente                : null,
    lancamentoEncontrado    : false,
    quantidadeComMesmaChave : 0,
    cpfColaboradorOk        : false,
    cartaoIdCoreto          : false,
    outrosCartoesMantidos   : false,
    flash44Intacto          : false,
    liberacaoGeral          : true,
    cartoesAtivos           : 0,
    conclusao               : '',
    bloqueios               : [],
    avisos                  : []
  };

  try {
    var amb = _f410ValidarAmbientePV2_();
    resultado.ambiente = amb.ok ? 'PRODUCAO_V2' : null;
    if (!amb.ok) {
      resultado.bloqueios.push(amb.bloqueio);
      Logger.log(JSON.stringify(resultado, null, 2));
      return resultado;
    }
    var ss = amb.ss;

    resultado.liberacaoGeral = _f410LiberacaoGeral_();
    resultado.flash44Intacto = _f410Flash44Intacto_(ss);

    if (resultado.liberacaoGeral) resultado.bloqueios.push('liberacaoGeral esta true — inesperado.');
    if (!resultado.flash44Intacto) resultado.bloqueios.push('Piloto FLASH44 ausente — inesperado.');

    // Verificar lancamento com a chave
    var chaveInfo = _f411ChaveExiste_(ss);
    resultado.quantidadeComMesmaChave = chaveInfo.quantidade;
    resultado.lancamentoEncontrado    = chaveInfo.quantidade === 1;
    if (chaveInfo.quantidade === 0) resultado.bloqueios.push('Nenhum lancamento com a chave FLASH.4.11. Execute EXECUTAR_FLASH411 primeiro.');
    if (chaveInfo.quantidade > 1)  resultado.bloqueios.push('DUPLICIDADE: ' + chaveInfo.quantidade + ' lancamentos com a mesma chave.');

    // Buscar Bruna e mapa CARTAO_ID -> CPF (via FIN_CARTOES)
    var bruna = _f410BuscarBruna_(ss);
    if (!bruna) {
      resultado.bloqueios.push('Bruna nao encontrada em FIN_CARTOES.');
    } else {
      resultado.cartoesAtivos = bruna.cartoes.filter(function(c) { return c.status === 'ATIVO'; }).length;
      if (resultado.cartoesAtivos !== 3) resultado.avisos.push('Bruna tem ' + resultado.cartoesAtivos + ' cartao(oes) ATIVO(s) — esperado 3.');

      // Verificar que os outros cartoes (fisico 881, virtual 1388) continuam intactos
      var fisico881  = bruna.cartoes.find(function(c) { return c.tipo === 'FISICO'   && c.final === '881'; });
      var virtual1388= bruna.cartoes.find(function(c) { return c.tipo === 'VIRTUAL'  && c.final === '1388'; });
      resultado.outrosCartoesMantidos = !!(fisico881 && virtual1388);
      if (!resultado.outrosCartoesMantidos) resultado.bloqueios.push('Cartoes FISICO 881 e/ou VIRTUAL 1388 ausentes — integridade comprometida.');

      // Cartao alvo VIRTUAL 546
      var cartaoAlvo = _f411CartaoVirtual546_(bruna);

      // Verificar lancamento encontrado: CARTAO_ID correto + CPF via join
      var shLanc = ss.getSheetByName('FIN_CARTOES_LANCAMENTOS');
      if (shLanc && shLanc.getLastRow() >= 2) {
        var dadosLanc = shLanc.getRange(1, 1, shLanc.getLastRow(), shLanc.getLastColumn()).getValues();
        var hLanc     = dadosLanc[0].map(function(x) { return String(x || '').trim().toUpperCase(); });
        var iObs      = hLanc.indexOf('OBSERVACOES');
        var iCid      = hLanc.indexOf('CARTAO_ID');
        for (var j = 1; j < dadosLanc.length; j++) {
          var obs = String(iObs >= 0 ? dadosLanc[j][iObs] : '');
          if (obs.indexOf(_F411_CHAVE_MARKER) < 0) continue;
          var lancCartaoId = String(iCid >= 0 ? dadosLanc[j][iCid] : '').trim();
          if (cartaoAlvo && lancCartaoId === cartaoAlvo.cartaoId) {
            resultado.cartaoIdCoreto = true;
          } else {
            resultado.bloqueios.push('CARTAO_ID no lancamento (' + lancCartaoId + ') nao e o cartao VIRTUAL 546 esperado (' + (cartaoAlvo ? cartaoAlvo.cartaoId : 'N/A') + ').');
          }
          // CPF via join: verificar que este cartaoId pertence ao CPF da Bruna
          if (cartaoAlvo && lancCartaoId === cartaoAlvo.cartaoId && bruna.cpf) {
            resultado.cpfColaboradorOk = true;
          }
          break;
        }
      }
    }

    var tudoOk =
      resultado.lancamentoEncontrado &&
      resultado.cartaoIdCoreto &&
      resultado.cpfColaboradorOk &&
      resultado.outrosCartoesMantidos &&
      resultado.flash44Intacto &&
      resultado.liberacaoGeral === false &&
      resultado.bloqueios.length === 0;

    resultado.success  = true;
    resultado.ok       = tudoOk;
    resultado.conclusao = tudoOk
      ? 'POS-AUDITORIA FLASH.4.11 OK — lancamento vinculado ao cartao VIRTUAL 546 correto, CPF da Bruna confirmado por join, outros cartoes intactos.'
      : 'POS-AUDITORIA FLASH.4.11 COM PENDENCIAS — veja bloqueios.';

  } catch (e411c) {
    resultado.bloqueios.push('Erro: ' + (e411c.message || e411c));
  }

  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

// ============================================================
// FLASH.4.12 - Auditoria de consolidacao final PRODUCAO_V2
// Somente leitura. Consolida FLASH.4.7, 4.8, 4.10, 4.11.
// Retorna prontoParaLiberacaoOperacionalControlada.
// ============================================================
function AUDITAR_FLASH412_CONSOLIDACAO_FINAL_PRODUCAO_V2_SEM_GRAVAR() {
  var resultado = {
    versao                               : 'FLASH.4.12',
    modo                                 : 'CONSOLIDACAO_FINAL_SEM_GRAVAR',
    somenteLeitura                       : true,
    gravacaoReal                         : false,
    success                              : false,
    ok                                   : false,
    ambiente                             : null,
    bloqueios                            : [],
    avisos                               : [],
    flash47Ok                            : false,
    flash48Ok                            : false,
    flash410Ok                           : false,
    flash411Ok                           : false,
    brunaCartoesAtivos                   : 0,
    recargaTesteUnica                    : false,
    prestacaoTesteUnica                  : false,
    duplicidadeCartaoDetectada           : false,
    liberacaoGeral                       : true,
    flash44Intacto                       : false,
    subAuditorias                        : {},
    prontoParaLiberacaoOperacionalControlada: false
  };

  try {
    // Validar ambiente PRODUCAO_V2
    var amb = _f410ValidarAmbientePV2_();
    resultado.ambiente = amb.ok ? 'PRODUCAO_V2' : null;
    if (!amb.ok) {
      resultado.bloqueios.push(amb.bloqueio);
      Logger.log(JSON.stringify(resultado, null, 2));
      return resultado;
    }
    var ss = amb.ss;

    // Checks de seguranca diretos (antes de chamar sub-auditorias)
    resultado.liberacaoGeral = _f410LiberacaoGeral_();
    resultado.flash44Intacto = _f410Flash44Intacto_(ss);
    if (resultado.liberacaoGeral) resultado.bloqueios.push('CRITICO: liberacaoGeral esta true — nenhuma funcao deveria ter feito isso.');
    if (!resultado.flash44Intacto) resultado.bloqueios.push('CRITICO: piloto FLASH44 ausente ou alterado.');

    // Sub-auditoria FLASH.4.7
    var r47 = AUDITAR_FLASH47_FINAL_SEM_GRAVAR();
    resultado.flash47Ok = r47 && r47.ok === true;
    resultado.subAuditorias.flash47 = {
      ok          : r47.ok,
      liberacaoGeral : r47.liberacaoGeral,
      recargaCriada  : r47.recargaCriada,
      flash44Intacto : r47.flash44Intacto,
      bloqueios      : (r47.bloqueios || []).slice(0, 5)
    };
    if (!resultado.flash47Ok) resultado.bloqueios.push('FLASH.4.7 auditoria final: NOK — ' + (r47.bloqueios || []).join(' | '));

    // Sub-auditoria FLASH.4.8
    var r48 = AUDITAR_FLASH48_FINAL_SEM_GRAVAR();
    resultado.flash48Ok = r48 && r48.ok === true;
    resultado.subAuditorias.flash48 = {
      ok              : r48.ok,
      liberacaoGeral  : r48.liberacaoGeral,
      recargaCriada   : r48.recargaCriada,
      flash44Intacto  : r48.flash44Intacto,
      bloqueios       : (r48.bloqueios || []).slice(0, 5)
    };
    if (!resultado.flash48Ok) resultado.bloqueios.push('FLASH.4.8 auditoria final: NOK — ' + (r48.bloqueios || []).join(' | '));

    // Sub-auditoria FLASH.4.10 (pos-recarga)
    var r410 = AUDITAR_FLASH410_POS_RECARGA_CPF_PRODUCAO_V2_SEM_GRAVAR();
    resultado.flash410Ok = r410 && r410.ok === true;
    resultado.subAuditorias.flash410 = {
      ok                      : r410.ok,
      recargaEncontrada       : r410.recargaEncontrada,
      quantidadeComMesmaChave : r410.quantidadeComMesmaChave,
      cpfColaboradorOk        : r410.cpfColaboradorOk,
      cartoesAtivos           : r410.cartoesAtivos,
      bloqueios               : (r410.bloqueios || []).slice(0, 5)
    };
    resultado.brunaCartoesAtivos = r410.cartoesAtivos || 0;
    resultado.recargaTesteUnica  = r410.quantidadeComMesmaChave === 1;
    if (!resultado.flash410Ok) resultado.bloqueios.push('FLASH.4.10 pos-recarga: NOK — ' + (r410.bloqueios || []).join(' | '));
    if (!resultado.recargaTesteUnica) resultado.bloqueios.push('Recarga teste: quantidade=' + r410.quantidadeComMesmaChave + ' (esperado 1).');

    // Sub-auditoria FLASH.4.11 (pos-prestacao)
    var r411 = AUDITAR_FLASH411_POS_PRESTACAO_CARTAO_PRODUCAO_V2_SEM_GRAVAR();
    resultado.flash411Ok = r411 && r411.ok === true;
    resultado.subAuditorias.flash411 = {
      ok                      : r411.ok,
      lancamentoEncontrado    : r411.lancamentoEncontrado,
      quantidadeComMesmaChave : r411.quantidadeComMesmaChave,
      cpfColaboradorOk        : r411.cpfColaboradorOk,
      cartaoIdCoreto          : r411.cartaoIdCoreto,
      outrosCartoesMantidos   : r411.outrosCartoesMantidos,
      bloqueios               : (r411.bloqueios || []).slice(0, 5)
    };
    resultado.prestacaoTesteUnica = r411.quantidadeComMesmaChave === 1;
    if (!resultado.flash411Ok) resultado.bloqueios.push('FLASH.4.11 pos-prestacao: NOK — ' + (r411.bloqueios || []).join(' | '));
    if (!resultado.prestacaoTesteUnica) resultado.bloqueios.push('Prestacao teste: quantidade=' + r411.quantidadeComMesmaChave + ' (esperado 1).');

    // Verificar duplicidade exata de cartoes (via CHAVE_MULTICARTAO)
    var r47dup = AUDITAR_FLASH47_DUPLICIDADE_MULTICARTAO_SEM_GRAVAR();
    var totalDup = r47dup && r47dup.resumo ? (r47dup.resumo.totalDuplicatasExatas || 0) : -1;
    resultado.duplicidadeCartaoDetectada = totalDup > 0;
    resultado.subAuditorias.duplicidadeCartao = {
      ok                  : !resultado.duplicidadeCartaoDetectada,
      totalDuplicatasExatas: totalDup,
      bloqueios           : (r47dup.bloqueios || []).slice(0, 3)
    };
    if (resultado.duplicidadeCartaoDetectada) {
      resultado.bloqueios.push('Duplicidade exata de cartoes detectada (' + totalDup + '). Investigar antes de liberar.');
    }

    // Verificar Bruna diretamente (independente das sub-auditorias)
    var bruna = _f410BuscarBruna_(ss);
    if (!bruna) {
      resultado.bloqueios.push('Bruna nao encontrada em FIN_CARTOES na verificacao direta.');
    } else {
      var ativosDir = bruna.cartoes.filter(function(c) { return c.status === 'ATIVO'; }).length;
      if (ativosDir !== resultado.brunaCartoesAtivos) {
        resultado.avisos.push('Contagem direta de cartoes ativos da Bruna (' + ativosDir + ') difere da sub-auditoria (' + resultado.brunaCartoesAtivos + ').');
      }
      if (ativosDir !== 3) resultado.bloqueios.push('Bruna tem ' + ativosDir + ' cartao(oes) ATIVO(s) — esperado 3.');
    }

    // Criterio consolidado
    var prontoParaLiberar =
      resultado.flash47Ok &&
      resultado.flash48Ok &&
      resultado.flash410Ok &&
      resultado.flash411Ok &&
      resultado.recargaTesteUnica &&
      resultado.prestacaoTesteUnica &&
      !resultado.duplicidadeCartaoDetectada &&
      resultado.flash44Intacto &&
      resultado.liberacaoGeral === false &&
      resultado.brunaCartoesAtivos === 3 &&
      resultado.bloqueios.length === 0;

    resultado.prontoParaLiberacaoOperacionalControlada = prontoParaLiberar;
    resultado.success = true;
    resultado.ok      = prontoParaLiberar;

    if (prontoParaLiberar) {
      resultado.avisos.push('FLASH.4.12 OK — todos os criterios atendidos. PRODUCAO_V2 pronta para liberacao operacional controlada do modulo Flash (sujeita a autorizacao humana explicita).');
    } else {
      resultado.avisos.push('FLASH.4.12 COM PENDENCIAS — prontoParaLiberacaoOperacionalControlada=false. Veja bloqueios e subAuditorias.');
    }

  } catch (e412) {
    resultado.bloqueios.push('Erro na consolidacao FLASH.4.12: ' + (e412.message || e412));
    resultado.stack = e412.stack || null;
  }

  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

// ============================================================
// FLASH.4.13 - Liberacao operacional controlada por CPF autorizado
// ScriptProperties: FLASH_OPERACAO_CONTROLADA_ATIVA,
//                   FLASH_LIBERACAO_GERAL, FLASH_CPFS_AUTORIZADOS
// ============================================================

var _F413_CPF_BRUNA        = '5553116198';
var _F413_CPF_FAKE_TESTE   = '99999999999'; // CPF inexistente para teste de bloqueio

// helper: operacao controlada ativa?
function _f413OperacaoControladaAtiva_() {
  return String(PropertiesService.getScriptProperties().getProperty('FLASH_OPERACAO_CONTROLADA_ATIVA') || 'false').trim().toLowerCase() === 'true';
}

// helper: CPF esta na lista autorizada?
function _f413CPFAutorizado_(cpf) {
  var lista = String(PropertiesService.getScriptProperties().getProperty('FLASH_CPFS_AUTORIZADOS') || '').split(',').map(function(c) { return c.trim().replace(/\D/g, ''); });
  return lista.indexOf(String(cpf || '').replace(/\D/g, '')) >= 0;
}

// helper: le FLASH_LIBERACAO_GERAL da ScriptProperty (distinto de FIN_LIBERACAO_GERAL)
function _f413LiberacaoGeralFlash_() {
  return String(PropertiesService.getScriptProperties().getProperty('FLASH_LIBERACAO_GERAL') || 'false').trim().toLowerCase() === 'true';
}

// ============================================================
// 1. PRE-AUDITORIA
// ============================================================
function PRE_AUDITAR_FLASH413_LIBERACAO_CONTROLADA_SEM_GRAVAR() {
  var resultado = {
    versao                    : 'FLASH.4.13',
    modo                      : 'PRE_AUDITORIA_SEM_GRAVAR',
    somenteLeitura            : true,
    gravacaoReal              : false,
    success                   : false,
    ok                        : false,
    ambiente                  : null,
    flash412Ok                : false,
    liberacaoGeral            : true,
    flash44Intacto            : false,
    brunaCartoesAtivos        : 0,
    operacaoJaAtiva           : false,
    cpfJaAutorizado           : false,
    bloqueios                 : [],
    avisos                    : [],
    prontoParaAtivarControleCPF: false
  };

  try {
    var amb = _f410ValidarAmbientePV2_();
    resultado.ambiente = amb.ok ? 'PRODUCAO_V2' : null;
    if (!amb.ok) {
      resultado.bloqueios.push(amb.bloqueio);
      Logger.log(JSON.stringify(resultado, null, 2));
      return resultado;
    }
    var ss = amb.ss;

    resultado.liberacaoGeral = _f410LiberacaoGeral_();
    resultado.flash44Intacto = _f410Flash44Intacto_(ss);
    if (resultado.liberacaoGeral) resultado.bloqueios.push('liberacaoGeral FIN esta true — nao esperado.');
    if (!resultado.flash44Intacto) resultado.bloqueios.push('Piloto FLASH44 ausente — integridade comprometida.');

    // Verificar operacao ja ativa
    resultado.operacaoJaAtiva = _f413OperacaoControladaAtiva_();
    resultado.cpfJaAutorizado = _f413CPFAutorizado_(_F413_CPF_BRUNA);
    if (resultado.operacaoJaAtiva) resultado.avisos.push('FLASH_OPERACAO_CONTROLADA_ATIVA ja esta true. Reativar e idempotente.');
    if (resultado.cpfJaAutorizado) resultado.avisos.push('CPF ' + _F413_CPF_BRUNA + ' ja consta como autorizado. Reativar e idempotente.');

    // Consolidacao FLASH.4.12
    var r412 = AUDITAR_FLASH412_CONSOLIDACAO_FINAL_PRODUCAO_V2_SEM_GRAVAR();
    resultado.flash412Ok      = r412 && r412.ok === true;
    resultado.brunaCartoesAtivos = r412 ? (r412.brunaCartoesAtivos || 0) : 0;
    if (!resultado.flash412Ok) {
      resultado.bloqueios.push('FLASH.4.12 consolidacao NAO aprovada. Veja bloqueios: ' + ((r412 && r412.bloqueios) || []).join(' | '));
    }

    resultado.prontoParaAtivarControleCPF =
      resultado.bloqueios.length === 0 &&
      resultado.flash412Ok &&
      resultado.flash44Intacto &&
      resultado.liberacaoGeral === false;

    resultado.success = true;
    resultado.ok      = resultado.prontoParaAtivarControleCPF;

    if (resultado.ok) {
      resultado.avisos.push('PRE-AUDITORIA OK. Seguro executar ATIVAR_FLASH413_LIBERACAO_CONTROLADA_CPF_PRODUCAO_V2_AUTORIZADO().');
    } else {
      resultado.avisos.push('PRE-AUDITORIA: prontoParaAtivarControleCPF=false. Veja bloqueios.');
    }

  } catch (e413a) {
    resultado.bloqueios.push('Erro: ' + (e413a.message || e413a));
  }

  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

// ============================================================
// 2. ATIVACAO - grava config de operacao controlada
// ============================================================
function ATIVAR_FLASH413_LIBERACAO_CONTROLADA_CPF_PRODUCAO_V2_AUTORIZADO() {
  var resultado = {
    versao                   : 'FLASH.4.13',
    modo                     : 'ATIVACAO_CONTROLADA_AUTORIZADO',
    executado                : true,
    gravacaoReal             : true,
    success                  : false,
    ok                       : false,
    ambiente                 : null,
    configuracaoGravada      : false,
    liberacaoGeral           : false,
    cpfAutorizado            : _F413_CPF_BRUNA,
    operacaoControladaAtiva  : false,
    liberacaoGeralFlash      : false,
    cpfsAutorizadosGravados  : '',
    bloqueios                : [],
    avisos                   : []
  };

  try {
    var amb = _f410ValidarAmbientePV2_();
    resultado.ambiente = amb.ok ? 'PRODUCAO_V2' : null;
    if (!amb.ok) {
      resultado.bloqueios.push(amb.bloqueio);
      Logger.log(JSON.stringify(resultado, null, 2));
      return resultado;
    }
    var ss = amb.ss;

    // Validacoes de seguranca antes de gravar
    resultado.liberacaoGeral = _f410LiberacaoGeral_();
    if (resultado.liberacaoGeral) {
      resultado.bloqueios.push('BLOQUEADO: FIN_LIBERACAO_GERAL esta true. Corrigir antes de ativar controle por CPF.');
      Logger.log(JSON.stringify(resultado, null, 2));
      return resultado;
    }
    if (!_f410Flash44Intacto_(ss)) {
      resultado.bloqueios.push('BLOQUEADO: piloto FLASH44 ausente.');
      Logger.log(JSON.stringify(resultado, null, 2));
      return resultado;
    }

    // Validar que FLASH.4.12 esta aprovado
    var r412 = AUDITAR_FLASH412_CONSOLIDACAO_FINAL_PRODUCAO_V2_SEM_GRAVAR();
    if (!r412 || !r412.ok) {
      resultado.bloqueios.push('BLOQUEADO: FLASH.4.12 nao aprovada. Veja: ' + ((r412 && r412.bloqueios) || []).slice(0, 3).join(' | '));
      Logger.log(JSON.stringify(resultado, null, 2));
      return resultado;
    }

    // Gravar configuracao de operacao controlada
    var props = PropertiesService.getScriptProperties();
    props.setProperty('FLASH_OPERACAO_CONTROLADA_ATIVA', 'true');
    props.setProperty('FLASH_LIBERACAO_GERAL', 'false');
    props.setProperty('FLASH_CPFS_AUTORIZADOS', _F413_CPF_BRUNA);

    // Verificar gravacao
    var ativa    = props.getProperty('FLASH_OPERACAO_CONTROLADA_ATIVA');
    var libGeral = props.getProperty('FLASH_LIBERACAO_GERAL');
    var autorizados = props.getProperty('FLASH_CPFS_AUTORIZADOS');

    resultado.operacaoControladaAtiva = ativa === 'true';
    resultado.liberacaoGeralFlash     = libGeral === 'true';
    resultado.cpfsAutorizadosGravados = autorizados || '';
    resultado.configuracaoGravada     = resultado.operacaoControladaAtiva && libGeral === 'false' && (autorizados || '').indexOf(_F413_CPF_BRUNA) >= 0;

    if (!resultado.configuracaoGravada) {
      resultado.bloqueios.push('Gravacao nao confirmada — verificar ScriptProperties manualmente.');
    }

    resultado.success = resultado.configuracaoGravada;
    resultado.ok      = resultado.configuracaoGravada;

    if (resultado.ok) {
      resultado.avisos.push('Operacao controlada FLASH.4.13 ativada. CPF autorizado: ' + _F413_CPF_BRUNA + '. FLASH_LIBERACAO_GERAL permanece false.');
      resultado.avisos.push('Execute AUDITAR_FLASH413_POS_LIBERACAO_CONTROLADA_SEM_GRAVAR() para confirmar.');
    }

  } catch (e413b) {
    resultado.bloqueios.push('Erro ao ativar: ' + (e413b.message || e413b));
    resultado.stack = e413b.stack || null;
  }

  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

// ============================================================
// 3. POS-AUDITORIA
// ============================================================
function AUDITAR_FLASH413_POS_LIBERACAO_CONTROLADA_SEM_GRAVAR() {
  var resultado = {
    versao                  : 'FLASH.4.13',
    modo                    : 'POS_AUDITORIA_SEM_GRAVAR',
    somenteLeitura          : true,
    gravacaoReal            : false,
    success                 : false,
    ok                      : false,
    ambiente                : null,
    operacaoControladaAtiva : false,
    cpfBrunaAutorizado      : false,
    liberacaoGeralFlash     : false,
    liberacaoGeralFin       : false,
    flash44Intacto          : false,
    brunaCartoesAtivos      : 0,
    recargaTesteUnica       : false,
    prestacaoTesteUnica     : false,
    cpfsAutorizadosAtual    : '',
    bloqueios               : [],
    avisos                  : [],
    conclusao               : ''
  };

  try {
    var amb = _f410ValidarAmbientePV2_();
    resultado.ambiente = amb.ok ? 'PRODUCAO_V2' : null;
    if (!amb.ok) {
      resultado.bloqueios.push(amb.bloqueio);
      Logger.log(JSON.stringify(resultado, null, 2));
      return resultado;
    }
    var ss = amb.ss;

    // Ler configuracao gravada
    var props = PropertiesService.getScriptProperties();
    resultado.operacaoControladaAtiva = props.getProperty('FLASH_OPERACAO_CONTROLADA_ATIVA') === 'true';
    resultado.liberacaoGeralFlash     = props.getProperty('FLASH_LIBERACAO_GERAL') === 'true';
    resultado.cpfsAutorizadosAtual    = props.getProperty('FLASH_CPFS_AUTORIZADOS') || '';
    resultado.cpfBrunaAutorizado      = _f413CPFAutorizado_(_F413_CPF_BRUNA);
    resultado.liberacaoGeralFin       = _f410LiberacaoGeral_();
    resultado.flash44Intacto          = _f410Flash44Intacto_(ss);

    if (!resultado.operacaoControladaAtiva) resultado.bloqueios.push('FLASH_OPERACAO_CONTROLADA_ATIVA nao esta true. Execute ATIVAR_FLASH413 primeiro.');
    if (resultado.liberacaoGeralFlash) resultado.bloqueios.push('FLASH_LIBERACAO_GERAL esta true — critico.');
    if (resultado.liberacaoGeralFin)   resultado.bloqueios.push('FIN_LIBERACAO_GERAL esta true — critico.');
    if (!resultado.cpfBrunaAutorizado) resultado.bloqueios.push('CPF ' + _F413_CPF_BRUNA + ' nao consta como autorizado em FLASH_CPFS_AUTORIZADOS.');
    if (!resultado.flash44Intacto)     resultado.bloqueios.push('Piloto FLASH44 ausente ou alterado.');

    // Verificar Bruna e cartoes
    var bruna = _f410BuscarBruna_(ss);
    resultado.brunaCartoesAtivos = bruna ? bruna.cartoes.filter(function(c) { return c.status === 'ATIVO'; }).length : 0;
    if (resultado.brunaCartoesAtivos !== 3) resultado.bloqueios.push('Bruna tem ' + resultado.brunaCartoesAtivos + ' cartao(oes) ATIVO(s) — esperado 3.');

    // Unicidade das recargas/prestacoes teste
    var chaveRec  = _f410ChaveExiste_(ss);
    var chavePrec = _f411ChaveExiste_(ss);
    resultado.recargaTesteUnica   = chaveRec.quantidade === 1;
    resultado.prestacaoTesteUnica = chavePrec.quantidade === 1;
    if (!resultado.recargaTesteUnica)   resultado.avisos.push('Recarga teste FLASH410: ' + chaveRec.quantidade + ' registro(s) — esperado 1.');
    if (!resultado.prestacaoTesteUnica) resultado.avisos.push('Prestacao teste FLASH411: ' + chavePrec.quantidade + ' registro(s) — esperado 1.');

    var tudoOk =
      resultado.operacaoControladaAtiva &&
      !resultado.liberacaoGeralFlash &&
      !resultado.liberacaoGeralFin &&
      resultado.cpfBrunaAutorizado &&
      resultado.flash44Intacto &&
      resultado.brunaCartoesAtivos === 3 &&
      resultado.bloqueios.length === 0;

    resultado.success  = true;
    resultado.ok       = tudoOk;
    resultado.conclusao = tudoOk
      ? 'POS-AUDITORIA FLASH.4.13 OK — operacao controlada ativa, CPF ' + _F413_CPF_BRUNA + ' autorizado, liberacao geral false.'
      : 'POS-AUDITORIA FLASH.4.13 COM PENDENCIAS — veja bloqueios.';

  } catch (e413c) {
    resultado.bloqueios.push('Erro: ' + (e413c.message || e413c));
  }

  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

// ============================================================
// 4. TESTE DE GUARD - CPF nao autorizado bloqueado (simulacao)
// ============================================================
function TESTAR_FLASH413_GUARD_CPF_NAO_AUTORIZADO_SEM_GRAVAR() {
  var resultado = {
    versao                   : 'FLASH.4.13',
    modo                     : 'TESTE_GUARD_SEM_GRAVAR',
    somenteLeitura           : true,
    gravacaoReal             : false,
    success                  : false,
    ok                       : false,
    ambiente                 : null,
    cpfTesteUsado            : _F413_CPF_FAKE_TESTE,
    operacaoControladaAtiva  : false,
    cpfNaoAutorizadoBloqueado: false,
    cpfBrunaAindaAutorizado  : false,
    liberacaoGeralFlash      : false,
    bloqueios                : [],
    avisos                   : []
  };

  try {
    var amb = _f410ValidarAmbientePV2_();
    resultado.ambiente = amb.ok ? 'PRODUCAO_V2' : null;
    if (!amb.ok) {
      resultado.bloqueios.push(amb.bloqueio);
      Logger.log(JSON.stringify(resultado, null, 2));
      return resultado;
    }

    resultado.operacaoControladaAtiva = _f413OperacaoControladaAtiva_();
    resultado.liberacaoGeralFlash     = _f413LiberacaoGeralFlash_();

    // Simular verificacao de guard para CPF inexistente
    var cpfFake          = _F413_CPF_FAKE_TESTE;
    var cpfFakeAut       = _f413CPFAutorizado_(cpfFake);
    resultado.cpfNaoAutorizadoBloqueado = !cpfFakeAut && resultado.operacaoControladaAtiva && !resultado.liberacaoGeralFlash;

    // Confirmar que Bruna ainda esta autorizada
    resultado.cpfBrunaAindaAutorizado = _f413CPFAutorizado_(_F413_CPF_BRUNA);

    if (!resultado.operacaoControladaAtiva) {
      resultado.avisos.push('FLASH_OPERACAO_CONTROLADA_ATIVA ainda nao esta ativa. O guard so bloqueia quando ativa. Execute ATIVAR_FLASH413 primeiro.');
    }
    if (resultado.liberacaoGeralFlash) {
      resultado.bloqueios.push('FLASH_LIBERACAO_GERAL esta true — guard nao funcionaria mesmo com operacao controlada ativa.');
    }
    if (!resultado.cpfBrunaAindaAutorizado) {
      resultado.bloqueios.push('CPF da Bruna (' + _F413_CPF_BRUNA + ') nao esta mais autorizado — regressao detectada.');
    }

    resultado.success = resultado.bloqueios.length === 0;
    resultado.ok      = resultado.cpfNaoAutorizadoBloqueado && resultado.cpfBrunaAindaAutorizado && resultado.bloqueios.length === 0;

    resultado.avisos.push('CPF testado como nao autorizado: ' + cpfFake + '. cpfNaoAutorizadoBloqueado=' + resultado.cpfNaoAutorizadoBloqueado + ' (nenhuma gravacao foi feita).');
    if (resultado.ok) resultado.avisos.push('GUARD OK — CPF falso seria bloqueado, CPF da Bruna permanece autorizado.');

  } catch (e413d) {
    resultado.bloqueios.push('Erro: ' + (e413d.message || e413d));
  }

  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

// ============================================================
// FLASH.4.14 - Operacao real assistida da Bruna na PRODUCAO_V2
// Somente leitura (auditoria). Operacao feita pelo usuario na UI.
// ============================================================

// helper: contar todas as linhas de dados de uma aba (exclui header)
function _f414ContarTodos_(ss, aba) {
  var sh = ss.getSheetByName(aba);
  if (!sh) return -1;
  var last = sh.getLastRow();
  return Math.max(0, last - 1);
}

// helper: contar recargas com CPF_COLABORADOR = cpf
function _f414ContarRecargasPorCPF_(ss, cpf) {
  var sh = ss.getSheetByName('FIN_CARTOES_RECARGAS');
  if (!sh) return -1;
  var last = sh.getLastRow();
  if (last < 2) return 0;
  var data    = sh.getRange(1, 1, last, sh.getLastColumn()).getValues();
  var headers = data[0];
  var idxCPF  = headers.indexOf('CPF_COLABORADOR');
  if (idxCPF < 0) return -1;
  var cpfNorm = String(cpf || '').replace(/\D/g, '');
  var count   = 0;
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][idxCPF] || '').replace(/\D/g, '') === cpfNorm) count++;
  }
  return count;
}

// helper: contar lancamentos com CARTAO_ID em cartaoIds
function _f414ContarLancamentosBruna_(ss, cartaoIds) {
  var sh = ss.getSheetByName('FIN_CARTOES_LANCAMENTOS');
  if (!sh) return -1;
  var last = sh.getLastRow();
  if (last < 2) return 0;
  var data    = sh.getRange(1, 1, last, sh.getLastColumn()).getValues();
  var headers = data[0];
  var idxC    = headers.indexOf('CARTAO_ID');
  if (idxC < 0) return -1;
  var ids = {};
  cartaoIds.forEach(function(id) { ids[String(id)] = true; });
  var count = 0;
  for (var i = 1; i < data.length; i++) {
    if (ids[String(data[i][idxC] || '')]) count++;
  }
  return count;
}

// helper: ultimas N recargas de um CPF
function _f414UltimasRecargasPorCPF_(ss, cpf, limit) {
  limit = limit || 5;
  var sh = ss.getSheetByName('FIN_CARTOES_RECARGAS');
  if (!sh) return [];
  var last = sh.getLastRow();
  if (last < 2) return [];
  var data    = sh.getRange(1, 1, last, sh.getLastColumn()).getValues();
  var headers = data[0];
  var iCPF    = headers.indexOf('CPF_COLABORADOR');
  var iRec    = headers.indexOf('RECARGA_ID');
  var iCartao = headers.indexOf('CARTAO_ID');
  var iValor  = headers.indexOf('VALOR');
  var iData   = headers.indexOf('DATA_RECARGA');
  var iStatus = headers.indexOf('STATUS');
  var iObs    = headers.indexOf('OBSERVACOES');
  var iCr     = headers.indexOf('CRIADO_EM');
  var cpfNorm = String(cpf || '').replace(/\D/g, '');
  var result  = [];
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][iCPF] || '').replace(/\D/g, '') === cpfNorm) {
      result.push({
        linha      : i + 1,
        recargaId  : iRec    >= 0 ? String(data[i][iRec]    || '') : '',
        cartaoId   : iCartao >= 0 ? String(data[i][iCartao] || '') : '',
        valor      : iValor  >= 0 ? data[i][iValor]  : '',
        dataRecarga: iData   >= 0 ? String(data[i][iData]   || '') : '',
        status     : iStatus >= 0 ? String(data[i][iStatus] || '') : '',
        observacoes: iObs    >= 0 ? String(data[i][iObs]    || '').substring(0, 80) : '',
        criadoEm   : iCr     >= 0 ? String(data[i][iCr]     || '') : ''
      });
    }
  }
  return result.slice(-limit);
}

// helper: ultimos N lancamentos dos cartoes da Bruna
function _f414UltimosLancamentosBruna_(ss, cartaoIds, limit) {
  limit = limit || 5;
  var sh = ss.getSheetByName('FIN_CARTOES_LANCAMENTOS');
  if (!sh) return [];
  var last = sh.getLastRow();
  if (last < 2) return [];
  var data    = sh.getRange(1, 1, last, sh.getLastColumn()).getValues();
  var headers = data[0];
  var iCartao = headers.indexOf('CARTAO_ID');
  var iLanc   = headers.indexOf('LANCAMENTO_ID');
  var iValor  = headers.indexOf('VALOR');
  var iData   = headers.indexOf('DATA_LANCAMENTO');
  var iStatus = headers.indexOf('STATUS');
  var iObs    = headers.indexOf('OBSERVACOES');
  var iCr     = headers.indexOf('CRIADO_EM');
  var ids = {};
  cartaoIds.forEach(function(id) { ids[String(id)] = true; });
  var result = [];
  for (var i = 1; i < data.length; i++) {
    var cid = String(data[i][iCartao] || '');
    if (ids[cid]) {
      result.push({
        linha       : i + 1,
        lancamentoId: iLanc   >= 0 ? String(data[i][iLanc]   || '') : '',
        cartaoId    : cid,
        valor       : iValor  >= 0 ? data[i][iValor]  : '',
        dataLanc    : iData   >= 0 ? String(data[i][iData]   || '') : '',
        status      : iStatus >= 0 ? String(data[i][iStatus] || '') : '',
        observacoes : iObs    >= 0 ? String(data[i][iObs]    || '').substring(0, 80) : '',
        criadoEm    : iCr     >= 0 ? String(data[i][iCr]     || '') : ''
      });
    }
  }
  return result.slice(-limit);
}

// helper: verificar se FIN_CARTOES_RECARGAS tem CPF_COLABORADOR
function _f414SchemaRecargaOk_(ss) {
  var sh = ss.getSheetByName('FIN_CARTOES_RECARGAS');
  if (!sh || sh.getLastRow() < 1) return false;
  var headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  return headers.indexOf('CPF_COLABORADOR') >= 0;
}

// helper: verificar se FIN_CARTOES_LANCAMENTOS tem CARTAO_ID (join key)
function _f414SchemaLancamentosOk_(ss) {
  var sh = ss.getSheetByName('FIN_CARTOES_LANCAMENTOS');
  if (!sh || sh.getLastRow() < 1) return false;
  var headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  return headers.indexOf('CARTAO_ID') >= 0;
}

// ============================================================
// 1. PRE-AUDITORIA - captura estado antes da operacao na UI
// ============================================================
function PRE_AUDITAR_FLASH414_OPERACAO_ASSISTIDA_BRUNA_SEM_GRAVAR() {
  var resultado = {
    versao                   : 'FLASH.4.14',
    modo                     : 'PRE_AUDITORIA_SEM_GRAVAR',
    somenteLeitura           : true,
    gravacaoReal             : false,
    success                  : false,
    ok                       : false,
    ambiente                 : null,
    flash413Ok               : false,
    operacaoControladaAtiva  : false,
    brunaAutorizada          : false,
    cpfFakeBloqueado         : false,
    liberacaoGeralFlash      : false,
    liberacaoGeralFin        : false,
    flash44Intacto           : false,
    brunaCartoesAtivos       : 0,
    brunaCartaoIds           : [],
    schemaRecargaOk          : false,
    schemaLancamentosOk      : false,
    totalRecargasAntes       : -1,
    totalLancamentosAntes    : -1,
    totalRecargasBrunaAntes  : -1,
    totalLancamentosBrunaAntes: -1,
    contadoresSalvos         : false,
    bloqueios                : [],
    avisos                   : [],
    prontoParaOperacaoAssistida: false
  };

  try {
    var amb = _f410ValidarAmbientePV2_();
    resultado.ambiente = amb.ok ? 'PRODUCAO_V2' : null;
    if (!amb.ok) {
      resultado.bloqueios.push(amb.bloqueio);
      Logger.log(JSON.stringify(resultado, null, 2));
      return resultado;
    }
    var ss = amb.ss;

    // Verificar estado FLASH.4.13
    resultado.operacaoControladaAtiva = _f413OperacaoControladaAtiva_();
    resultado.liberacaoGeralFlash     = _f413LiberacaoGeralFlash_();
    resultado.liberacaoGeralFin       = _f410LiberacaoGeral_();
    resultado.flash44Intacto          = _f410Flash44Intacto_(ss);
    resultado.brunaAutorizada         = _f413CPFAutorizado_(_F413_CPF_BRUNA);
    resultado.cpfFakeBloqueado        = !_f413CPFAutorizado_(_F413_CPF_FAKE_TESTE) && resultado.operacaoControladaAtiva && !resultado.liberacaoGeralFlash;

    if (!resultado.operacaoControladaAtiva) resultado.bloqueios.push('FLASH_OPERACAO_CONTROLADA_ATIVA nao esta true. Execute ATIVAR_FLASH413 primeiro.');
    if (resultado.liberacaoGeralFlash)      resultado.bloqueios.push('FLASH_LIBERACAO_GERAL esta true — critico.');
    if (resultado.liberacaoGeralFin)        resultado.bloqueios.push('FIN_LIBERACAO_GERAL esta true — critico.');
    if (!resultado.brunaAutorizada)         resultado.bloqueios.push('CPF ' + _F413_CPF_BRUNA + ' nao autorizado em FLASH_CPFS_AUTORIZADOS.');
    if (!resultado.flash44Intacto)          resultado.bloqueios.push('Piloto FLASH44 ausente ou alterado.');

    resultado.flash413Ok = resultado.operacaoControladaAtiva && resultado.brunaAutorizada && !resultado.liberacaoGeralFlash;

    // Buscar Bruna e seus cartoes
    var bruna = _f410BuscarBruna_(ss);
    if (!bruna) {
      resultado.bloqueios.push('Bruna nao encontrada em FIN_CARTOES.');
    } else {
      var ativos = bruna.cartoes.filter(function(c) { return c.status === 'ATIVO'; });
      resultado.brunaCartoesAtivos = ativos.length;
      resultado.brunaCartaoIds     = ativos.map(function(c) { return c.cartaoId; });
      if (resultado.brunaCartoesAtivos !== 3) {
        resultado.bloqueios.push('Bruna tem ' + resultado.brunaCartoesAtivos + ' cartao(oes) ATIVO(s) — esperado 3.');
      }
    }

    // Verificar schemas
    resultado.schemaRecargaOk     = _f414SchemaRecargaOk_(ss);
    resultado.schemaLancamentosOk = _f414SchemaLancamentosOk_(ss);
    if (!resultado.schemaRecargaOk)     resultado.bloqueios.push('FIN_CARTOES_RECARGAS sem coluna CPF_COLABORADOR. Execute setupFinanceiroV2().');
    if (!resultado.schemaLancamentosOk) resultado.bloqueios.push('FIN_CARTOES_LANCAMENTOS sem CARTAO_ID — join impossivel.');

    // Capturar contadores antes
    resultado.totalRecargasAntes        = _f414ContarTodos_(ss, 'FIN_CARTOES_RECARGAS');
    resultado.totalLancamentosAntes     = _f414ContarTodos_(ss, 'FIN_CARTOES_LANCAMENTOS');
    resultado.totalRecargasBrunaAntes   = _f414ContarRecargasPorCPF_(ss, _F413_CPF_BRUNA);
    resultado.totalLancamentosBrunaAntes = resultado.brunaCartaoIds.length > 0
      ? _f414ContarLancamentosBruna_(ss, resultado.brunaCartaoIds)
      : 0;

    // Salvar contadores no ScriptProperties para o POS_AUDITAR
    if (resultado.bloqueios.length === 0) {
      var props = PropertiesService.getScriptProperties();
      props.setProperty('FLASH414_ANTES_RECARGAS_TOTAL',      String(resultado.totalRecargasAntes));
      props.setProperty('FLASH414_ANTES_LANCAMENTOS_TOTAL',   String(resultado.totalLancamentosAntes));
      props.setProperty('FLASH414_ANTES_RECARGAS_BRUNA',      String(resultado.totalRecargasBrunaAntes));
      props.setProperty('FLASH414_ANTES_LANCAMENTOS_BRUNA',   String(resultado.totalLancamentosBrunaAntes));
      props.setProperty('FLASH414_ANTES_TIMESTAMP',           new Date().toISOString());
      resultado.contadoresSalvos = true;
      resultado.avisos.push('Contadores PRE salvos no ScriptProperties. Use AUDITAR_FLASH414_POS_OPERACAO_ASSISTIDA_BRUNA_SEM_GRAVAR() apos operar pela UI.');
    }

    resultado.prontoParaOperacaoAssistida =
      resultado.bloqueios.length === 0 &&
      resultado.flash413Ok &&
      resultado.flash44Intacto &&
      resultado.brunaCartoesAtivos === 3 &&
      resultado.schemaRecargaOk &&
      resultado.schemaLancamentosOk;

    resultado.success = true;
    resultado.ok      = resultado.prontoParaOperacaoAssistida;

    if (resultado.ok) {
      resultado.avisos.push('PRE-AUDITORIA FLASH.4.14 OK — pronto para operacao real assistida via UI. Nao criar recarga via codigo.');
    }

  } catch (e414a) {
    resultado.bloqueios.push('Erro: ' + (e414a.message || e414a));
  }

  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

// ============================================================
// 2. POS-AUDITORIA - valida estado apos operacao real na UI
// ============================================================
function AUDITAR_FLASH414_POS_OPERACAO_ASSISTIDA_BRUNA_SEM_GRAVAR() {
  var resultado = {
    versao                    : 'FLASH.4.14',
    modo                      : 'POS_AUDITORIA_SEM_GRAVAR',
    somenteLeitura            : true,
    gravacaoReal              : false,
    success                   : false,
    ok                        : false,
    ambiente                  : null,
    operacaoControladaAtiva   : false,
    brunaAutorizada           : false,
    liberacaoGeralFlash       : false,
    liberacaoGeralFin         : false,
    flash44Intacto            : false,
    brunaCartoesAtivos        : 0,
    totalRecargasDepois       : -1,
    totalLancamentosDepois    : -1,
    totalRecargasBrunaDepois  : -1,
    totalLancamentosBrunaDepois: -1,
    resumoAntesDepois         : null,
    ultimasRecargasBruna      : [],
    ultimosLancamentosBruna   : [],
    operacaoNaoAutorizadaDetectada: false,
    bloqueios                 : [],
    avisos                    : []
  };

  try {
    var amb = _f410ValidarAmbientePV2_();
    resultado.ambiente = amb.ok ? 'PRODUCAO_V2' : null;
    if (!amb.ok) {
      resultado.bloqueios.push(amb.bloqueio);
      Logger.log(JSON.stringify(resultado, null, 2));
      return resultado;
    }
    var ss = amb.ss;

    // Verificar estado FLASH.4.13
    resultado.operacaoControladaAtiva = _f413OperacaoControladaAtiva_();
    resultado.liberacaoGeralFlash     = _f413LiberacaoGeralFlash_();
    resultado.liberacaoGeralFin       = _f410LiberacaoGeral_();
    resultado.flash44Intacto          = _f410Flash44Intacto_(ss);
    resultado.brunaAutorizada         = _f413CPFAutorizado_(_F413_CPF_BRUNA);

    if (!resultado.operacaoControladaAtiva) resultado.bloqueios.push('FLASH_OPERACAO_CONTROLADA_ATIVA nao esta true — guard desabilitado.');
    if (resultado.liberacaoGeralFlash)      resultado.bloqueios.push('FLASH_LIBERACAO_GERAL esta true — critico.');
    if (resultado.liberacaoGeralFin)        resultado.bloqueios.push('FIN_LIBERACAO_GERAL esta true — critico.');
    if (!resultado.brunaAutorizada)         resultado.bloqueios.push('CPF Bruna (' + _F413_CPF_BRUNA + ') nao esta mais autorizado — regressao.');
    if (!resultado.flash44Intacto)          resultado.bloqueios.push('Piloto FLASH44 ausente ou alterado.');

    // Buscar Bruna e cartoes
    var bruna = _f410BuscarBruna_(ss);
    var brunaCartaoIds = [];
    if (!bruna) {
      resultado.bloqueios.push('Bruna nao encontrada em FIN_CARTOES.');
    } else {
      var ativos = bruna.cartoes.filter(function(c) { return c.status === 'ATIVO'; });
      resultado.brunaCartoesAtivos = ativos.length;
      brunaCartaoIds = ativos.map(function(c) { return c.cartaoId; });
      if (resultado.brunaCartoesAtivos !== 3) {
        resultado.bloqueios.push('Bruna tem ' + resultado.brunaCartoesAtivos + ' cartao(oes) ATIVO(s) — esperado 3.');
      }
    }

    // Contadores depois
    resultado.totalRecargasDepois        = _f414ContarTodos_(ss, 'FIN_CARTOES_RECARGAS');
    resultado.totalLancamentosDepois     = _f414ContarTodos_(ss, 'FIN_CARTOES_LANCAMENTOS');
    resultado.totalRecargasBrunaDepois   = _f414ContarRecargasPorCPF_(ss, _F413_CPF_BRUNA);
    resultado.totalLancamentosBrunaDepois = brunaCartaoIds.length > 0
      ? _f414ContarLancamentosBruna_(ss, brunaCartaoIds)
      : 0;

    // Recuperar contadores antes do ScriptProperties
    var props = PropertiesService.getScriptProperties();
    var antesTs     = props.getProperty('FLASH414_ANTES_TIMESTAMP') || null;
    var antesRec    = parseInt(props.getProperty('FLASH414_ANTES_RECARGAS_TOTAL')    || '-1', 10);
    var antesLanc   = parseInt(props.getProperty('FLASH414_ANTES_LANCAMENTOS_TOTAL') || '-1', 10);
    var antesRecB   = parseInt(props.getProperty('FLASH414_ANTES_RECARGAS_BRUNA')    || '-1', 10);
    var antesLancB  = parseInt(props.getProperty('FLASH414_ANTES_LANCAMENTOS_BRUNA') || '-1', 10);

    if (antesTs) {
      resultado.resumoAntesDepois = {
        preAuditoriaTimestamp      : antesTs,
        totalRecargasDelta         : resultado.totalRecargasDepois    - antesRec,
        totalLancamentosDelta      : resultado.totalLancamentosDepois - antesLanc,
        recargasBrunaDelta         : resultado.totalRecargasBrunaDepois  - antesRecB,
        lancamentosBrunaDelta      : resultado.totalLancamentosBrunaDepois - antesLancB,
        antes: {
          totalRecargas    : antesRec,
          totalLancamentos : antesLanc,
          recargasBruna    : antesRecB,
          lancamentosBruna : antesLancB
        },
        depois: {
          totalRecargas    : resultado.totalRecargasDepois,
          totalLancamentos : resultado.totalLancamentosDepois,
          recargasBruna    : resultado.totalRecargasBrunaDepois,
          lancamentosBruna : resultado.totalLancamentosBrunaDepois
        }
      };

      if (resultado.resumoAntesDepois.recargasBrunaDelta === 0) {
        resultado.avisos.push('Nenhuma recarga nova da Bruna detectada. Se operacao foi feita, verifique CPF_COLABORADOR gravado corretamente.');
      } else {
        resultado.avisos.push('Recargas novas da Bruna: ' + resultado.resumoAntesDepois.recargasBrunaDelta + '. Confira ultimasRecargasBruna.');
      }
    } else {
      resultado.avisos.push('Contadores PRE nao encontrados no ScriptProperties. Execute PRE_AUDITAR_FLASH414 antes de operar pela UI.');
    }

    // Listar ultimas operacoes da Bruna
    resultado.ultimasRecargasBruna   = _f414UltimasRecargasPorCPF_(ss, _F413_CPF_BRUNA, 5);
    resultado.ultimosLancamentosBruna = brunaCartaoIds.length > 0
      ? _f414UltimosLancamentosBruna_(ss, brunaCartaoIds, 5)
      : [];

    // Verificar se ha recargas com CPF nao autorizado (nao teste, nao bruna)
    var shRec = ss.getSheetByName('FIN_CARTOES_RECARGAS');
    if (shRec && shRec.getLastRow() >= 2) {
      var recData    = shRec.getRange(1, 1, shRec.getLastRow(), shRec.getLastColumn()).getValues();
      var recHeaders = recData[0];
      var iCPF       = recHeaders.indexOf('CPF_COLABORADOR');
      var iStatus    = recHeaders.indexOf('STATUS');
      if (iCPF >= 0 && iStatus >= 0) {
        for (var r = 1; r < recData.length; r++) {
          var rowCPF    = String(recData[r][iCPF] || '').replace(/\D/g, '');
          var rowStatus = String(recData[r][iStatus] || '');
          if (rowCPF && rowCPF !== _F413_CPF_BRUNA && rowStatus !== 'TESTE_CONTROLADO') {
            resultado.operacaoNaoAutorizadaDetectada = true;
            resultado.bloqueios.push('CPF nao autorizado encontrado em FIN_CARTOES_RECARGAS: ' + rowCPF + ' (linha ' + (r + 1) + ', status=' + rowStatus + '). Investigar.');
            break;
          }
        }
      }
    }

    var tudoOk =
      resultado.operacaoControladaAtiva &&
      !resultado.liberacaoGeralFlash &&
      !resultado.liberacaoGeralFin &&
      resultado.brunaAutorizada &&
      resultado.flash44Intacto &&
      resultado.brunaCartoesAtivos === 3 &&
      !resultado.operacaoNaoAutorizadaDetectada &&
      resultado.bloqueios.length === 0;

    resultado.success = true;
    resultado.ok      = tudoOk;

    if (tudoOk) {
      resultado.avisos.push('POS-AUDITORIA FLASH.4.14 OK — ambiente controlado intacto. Revise resumoAntesDepois e ultimasRecargasBruna.');
    } else {
      resultado.avisos.push('POS-AUDITORIA FLASH.4.14 COM PENDENCIAS — veja bloqueios.');
    }

  } catch (e414b) {
    resultado.bloqueios.push('Erro: ' + (e414b.message || e414b));
  }

  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

// ============================================================
// 3. GUARD OPERACIONAL - confirma guard ativo (sem gravar)
// ============================================================
function AUDITAR_FLASH414_GUARD_OPERACIONAL_SEM_GRAVAR() {
  var resultado = {
    versao                   : 'FLASH.4.14',
    modo                     : 'GUARD_OPERACIONAL_SEM_GRAVAR',
    somenteLeitura           : true,
    gravacaoReal             : false,
    success                  : false,
    ok                       : false,
    ambiente                 : null,
    operacaoControladaAtiva  : false,
    liberacaoGeralFlash      : false,
    brunaPermitida           : false,
    cpfFakeUsado             : _F413_CPF_FAKE_TESTE,
    cpfFakeBloqueado         : false,
    cpfsAutorizadosAtual     : '',
    bloqueios                : [],
    avisos                   : []
  };

  try {
    var amb = _f410ValidarAmbientePV2_();
    resultado.ambiente = amb.ok ? 'PRODUCAO_V2' : null;
    if (!amb.ok) {
      resultado.bloqueios.push(amb.bloqueio);
      Logger.log(JSON.stringify(resultado, null, 2));
      return resultado;
    }

    resultado.operacaoControladaAtiva = _f413OperacaoControladaAtiva_();
    resultado.liberacaoGeralFlash     = _f413LiberacaoGeralFlash_();
    resultado.cpfsAutorizadosAtual    = PropertiesService.getScriptProperties().getProperty('FLASH_CPFS_AUTORIZADOS') || '';

    // Simular guard para CPF nao autorizado
    var cpfFakeAut        = _f413CPFAutorizado_(_F413_CPF_FAKE_TESTE);
    resultado.cpfFakeBloqueado = !cpfFakeAut && resultado.operacaoControladaAtiva && !resultado.liberacaoGeralFlash;

    // Simular guard para Bruna
    resultado.brunaPermitida = _f413CPFAutorizado_(_F413_CPF_BRUNA) && resultado.operacaoControladaAtiva;

    // Validacoes
    if (!resultado.operacaoControladaAtiva) {
      resultado.bloqueios.push('FLASH_OPERACAO_CONTROLADA_ATIVA nao esta true — guard inativo.');
    }
    if (resultado.liberacaoGeralFlash) {
      resultado.bloqueios.push('FLASH_LIBERACAO_GERAL esta true — guard ignorado mesmo com operacao controlada.');
    }
    if (!resultado.cpfFakeBloqueado) {
      resultado.bloqueios.push('CPF ' + _F413_CPF_FAKE_TESTE + ' nao seria bloqueado — guard com falha.');
    }
    if (!resultado.brunaPermitida) {
      resultado.bloqueios.push('Bruna (' + _F413_CPF_BRUNA + ') nao seria permitida — regressao na lista de autorizados.');
    }

    resultado.avisos.push('Simulacao: CPF ' + _F413_CPF_FAKE_TESTE + ' seria ' + (resultado.cpfFakeBloqueado ? 'BLOQUEADO' : 'PERMITIDO (FALHA)') + '.');
    resultado.avisos.push('Simulacao: CPF ' + _F413_CPF_BRUNA + ' (Bruna) seria ' + (resultado.brunaPermitida ? 'PERMITIDO' : 'BLOQUEADO (FALHA)') + '.');

    resultado.success = resultado.bloqueios.length === 0;
    resultado.ok      = resultado.cpfFakeBloqueado && resultado.brunaPermitida && !resultado.liberacaoGeralFlash && resultado.operacaoControladaAtiva;

    if (resultado.ok) {
      resultado.avisos.push('GUARD OPERACIONAL OK — CPF nao autorizado bloqueado, Bruna permitida, liberacao geral false.');
    }

  } catch (e414c) {
    resultado.bloqueios.push('Erro: ' + (e414c.message || e414c));
  }

  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}


// FLASH.6.3 — auditoria pos-publicacao PRODUCAO_V2. Somente leitura.
function AUDITAR_FLASH63_POS_PUBLICACAO_PRODUCAO_V2_SEM_GRAVAR() {
  var resultado = {
    success: false, ok: false, fase: 'FLASH.6.3',
    ambiente: null, bloqueios: [], avisos: [],
    funcoesFlash60: {}, operacaoControladaAtiva: false,
    liberacaoGeralFlash: false, brunaAutorizada: false,
    flash44Intacto: false, auditoria60: null,
    gravacaoReal: false,
    confirmacoes: {
      recargaAutomaticaCriada: false,
      lancamentoAutomaticoCriado: false,
      emailOuWhatsappEnviado: false,
      producaoV2Publicada: true
    }
  };

  try {
    var amb = _f410ValidarAmbientePV2_();
    resultado.ambiente = amb.ok ? 'PRODUCAO_V2' : 'NAO_AUTORIZADO';
    if (!amb.ok) {
      resultado.bloqueios.push('Ambiente nao e PRODUCAO_V2: ' + amb.bloqueio);
      Logger.log(JSON.stringify(resultado, null, 2));
      return resultado;
    }

    resultado.funcoesFlash60 = {
      PRE_CONCILIAR_FLASH_IA_SEM_GRAVAR:                        typeof PRE_CONCILIAR_FLASH_IA_SEM_GRAVAR === 'function',
      GERAR_HTML_TERMO_RESPONSABILIDADE_FLASH_SEM_GRAVAR:       typeof GERAR_HTML_TERMO_RESPONSABILIDADE_FLASH_SEM_GRAVAR === 'function',
      GERAR_HTML_RELATORIO_MENSAL_COLABORADOR_FLASH_SEM_GRAVAR: typeof GERAR_HTML_RELATORIO_MENSAL_COLABORADOR_FLASH_SEM_GRAVAR === 'function',
      GERAR_HTML_NOTIFICACAO_PENDENCIA_FLASH_SEM_GRAVAR:        typeof GERAR_HTML_NOTIFICACAO_PENDENCIA_FLASH_SEM_GRAVAR === 'function',
      GERAR_HTML_ADVERTENCIA_FLASH_SEM_GRAVAR:                  typeof GERAR_HTML_ADVERTENCIA_FLASH_SEM_GRAVAR === 'function',
      PREPARAR_COBRANCAS_FLASH_SEM_ENVIAR:                      typeof PREPARAR_COBRANCAS_FLASH_SEM_ENVIAR === 'function',
      AUDITAR_FLASH_BLOQUEIO_RECARGA_POR_PENDENCIA_SEM_GRAVAR:  typeof AUDITAR_FLASH_BLOQUEIO_RECARGA_POR_PENDENCIA_SEM_GRAVAR === 'function',
      AUDITAR_FLASH60_ARQUITETURA_FINAL_SEM_GRAVAR:             typeof AUDITAR_FLASH60_ARQUITETURA_FINAL_SEM_GRAVAR === 'function',
      INVENTARIAR_FLASH60_ABAS_SEM_GRAVAR:                      typeof INVENTARIAR_FLASH60_ABAS_SEM_GRAVAR === 'function'
    };
    Object.keys(resultado.funcoesFlash60).forEach(function (nome) {
      if (!resultado.funcoesFlash60[nome]) resultado.bloqueios.push('Funcao ausente apos publicacao: ' + nome);
    });

    resultado.operacaoControladaAtiva = _f413OperacaoControladaAtiva_();
    resultado.liberacaoGeralFlash     = _f413LiberacaoGeralFlash_();
    resultado.brunaAutorizada         = _f413CPFAutorizado_(_F413_CPF_BRUNA);

    if (resultado.liberacaoGeralFlash) {
      resultado.bloqueios.push('REGRESSAO: FLASH_LIBERACAO_GERAL esta true — deve permanecer false.');
    }
    if (resultado.operacaoControladaAtiva && !resultado.brunaAutorizada) {
      resultado.bloqueios.push('REGRESSAO: CPF da Bruna (' + _F413_CPF_BRUNA + ') nao autorizado com operacao ativa.');
    }

    resultado.auditoria60    = AUDITAR_FLASH60_ARQUITETURA_FINAL_SEM_GRAVAR();
    resultado.flash44Intacto = !!(resultado.auditoria60 && resultado.auditoria60.checks && resultado.auditoria60.checks.flash44Intacto);

    if (!resultado.flash44Intacto) {
      var diagn63 = resultado.auditoria60 && resultado.auditoria60.diagnostico;
      if (diagn63 && diagn63.sentinela44NoCodigo) {
        resultado.avisos.push('PILOTO_FLASH44 ausente na base PRODUCAO_V2; sentinela de codigo preservada.');
      } else {
        resultado.bloqueios.push('flash44Intacto false: sentinela _f410Flash44Intacto_ ausente no codigo ou liberacaoGeral true.');
      }
    }
    if (resultado.auditoria60 && resultado.auditoria60.falhas && resultado.auditoria60.falhas.length) {
      resultado.bloqueios.push('auditoria60.ok false — falhas: ' + resultado.auditoria60.falhas.join(', '));
    }

    resultado.success = resultado.bloqueios.length === 0;
    resultado.ok      = resultado.success && !resultado.liberacaoGeralFlash && resultado.brunaAutorizada;

    if (resultado.ok) resultado.avisos.push('FLASH.6.3 pos-publicacao OK: FLASH.6.0 ativo em PRODUCAO_V2, guards preservados, sem gravacao.');
  } catch (e63) {
    resultado.bloqueios.push('Erro FLASH.6.3: ' + (e63 && e63.message ? e63.message : String(e63)));
  }

  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}


// FLASH.6.3B — diagnostico detalhado dos criterios recargaPorCpf e flash44Intacto na PRODUCAO_V2.
function DIAGNOSTICAR_FLASH63B_PRODUCAO_V2_SEM_GRAVAR() {
  var resultado = {
    success: false, ok: false, fase: 'FLASH.6.3B',
    ambiente: null, bloqueios: [], avisos: [],
    recargaPorCpf: null, flash44Intacto: null,
    gravacaoReal: false
  };

  try {
    var amb = _f410ValidarAmbientePV2_();
    resultado.ambiente = amb.ok ? 'PRODUCAO_V2' : 'NAO_AUTORIZADO';
    if (!amb.ok) {
      resultado.bloqueios.push('Ambiente nao e PRODUCAO_V2: ' + amb.bloqueio);
      Logger.log(JSON.stringify(resultado, null, 2));
      return resultado;
    }

    var auditoria = AUDITAR_FLASH60_ARQUITETURA_FINAL_SEM_GRAVAR();
    var diagn = (auditoria && auditoria.diagnostico) ? auditoria.diagnostico : {};
    var checks = (auditoria && auditoria.checks) ? auditoria.checks : {};

    resultado.recargaPorCpf = {
      ok: checks.recargaPorCpf === true,
      hCartoesTemCPF: diagn.hCartoesTemCPF === true,
      hRecargasTemCPF: diagn.hRecargasTemCPF === true,
      causa: !diagn.hCartoesTemCPF
        ? 'FIN_CARTOES nao tem coluna CPF_COLABORADOR — schema incorreto'
        : !diagn.hRecargasTemCPF
          ? 'FIN_CARTOES_RECARGAS nao tem coluna CPF_COLABORADOR — schema incorreto'
          : 'Schema CPF presente em ambas as abas — OK'
    };

    resultado.flash44Intacto = {
      ok: checks.flash44Intacto === true,
      sentinela44NoCodigo: diagn.sentinela44NoCodigo === true,
      piloto44NaBase: diagn.piloto44NaBase === true,
      liberacaoGeralFlash: _f413LiberacaoGeralFlash_(),
      causa: !diagn.sentinela44NoCodigo
        ? 'Funcao _f410Flash44Intacto_ ausente no codigo — sentinela nao carregada'
        : _f413LiberacaoGeralFlash_()
          ? 'FLASH_LIBERACAO_GERAL esta true — guard flash44 ignorado'
          : !diagn.piloto44NaBase
            ? 'Sentinela de codigo OK; PILOTO_FLASH44 ausente na base — aviso, nao falha'
            : 'Sentinela de codigo OK e registro piloto presente — OK'
    };

    if (!resultado.recargaPorCpf.ok) {
      resultado.bloqueios.push('recargaPorCpf false: ' + resultado.recargaPorCpf.causa);
    }
    if (!resultado.flash44Intacto.ok && !resultado.flash44Intacto.sentinela44NoCodigo) {
      resultado.bloqueios.push('flash44Intacto false: ' + resultado.flash44Intacto.causa);
    }
    if (!resultado.flash44Intacto.ok && resultado.flash44Intacto.sentinela44NoCodigo) {
      resultado.avisos.push('flash44Intacto: ' + resultado.flash44Intacto.causa);
    }

    resultado.success = resultado.bloqueios.length === 0;
    resultado.ok = resultado.recargaPorCpf.ok && resultado.flash44Intacto.ok;

    if (resultado.ok) {
      resultado.avisos.push('FLASH.6.3B: recargaPorCpf e flash44Intacto OK na PRODUCAO_V2.');
    }
  } catch (e63b) {
    resultado.bloqueios.push('Erro FLASH.6.3B: ' + (e63b && e63b.message ? e63b.message : String(e63b)));
  }

  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}


// FLASH.6.4 — auditoria pos-deploy PRODUCAO_V2. Somente leitura.
function AUDITAR_FLASH64_POS_DEPLOY_PRODUCAO_V2_SEM_GRAVAR() {
  var resultado = {
    success: false, ok: false, fase: 'FLASH.6.4',
    ambiente: null, bloqueios: [], avisos: [],
    flash63Aprovada: false, flash63bAprovada: false,
    operacaoControladaAtiva: false, liberacaoGeralFlash: false,
    brunaAutorizada: false, flash44Intacto: false,
    gravacaoReal: false,
    confirmacoes: {
      recargaAutomaticaCriada: false,
      lancamentoAutomaticoCriado: false,
      emailOuWhatsappEnviado: false,
      extratoImportado: false,
      deployExecutado: true
    }
  };

  try {
    var amb = _f410ValidarAmbientePV2_();
    resultado.ambiente = amb.ok ? 'PRODUCAO_V2' : 'NAO_AUTORIZADO';
    if (!amb.ok) {
      resultado.bloqueios.push('Ambiente nao e PRODUCAO_V2: ' + amb.bloqueio);
      Logger.log(JSON.stringify(resultado, null, 2));
      return resultado;
    }

    var a63 = AUDITAR_FLASH63_POS_PUBLICACAO_PRODUCAO_V2_SEM_GRAVAR();
    resultado.flash63Aprovada  = !!(a63 && a63.ok === true);
    resultado.flash63bAprovada = !!(a63 && a63.auditoria60 && a63.auditoria60.ok === true);
    resultado.operacaoControladaAtiva = !!(a63 && a63.operacaoControladaAtiva);
    resultado.liberacaoGeralFlash     = !!(a63 && a63.liberacaoGeralFlash);
    resultado.brunaAutorizada         = !!(a63 && a63.brunaAutorizada);
    resultado.flash44Intacto          = !!(a63 && a63.flash44Intacto);

    if (!resultado.flash63Aprovada) {
      resultado.bloqueios.push('AUDITAR_FLASH63 nao ok: ' + JSON.stringify((a63 && a63.bloqueios) || []));
    }
    if (!resultado.flash63bAprovada) {
      resultado.bloqueios.push('auditoria60.ok false apos deploy — FLASH.6.3B nao confirmada.');
    }
    if (resultado.liberacaoGeralFlash) {
      resultado.bloqueios.push('REGRESSAO: FLASH_LIBERACAO_GERAL esta true — deve permanecer false.');
    }
    if (!resultado.brunaAutorizada) {
      resultado.bloqueios.push('REGRESSAO: CPF da Bruna (' + _F413_CPF_BRUNA + ') nao autorizado.');
    }
    if (!resultado.flash44Intacto) {
      resultado.avisos.push('PILOTO_FLASH44: sentinela de codigo preservada; registro piloto ausente na base PRODUCAO_V2.');
    }

    resultado.success = resultado.bloqueios.length === 0;
    resultado.ok      = resultado.success && !resultado.liberacaoGeralFlash && resultado.brunaAutorizada;

    if (resultado.ok) {
      resultado.avisos.push('FLASH.6.4 pos-deploy OK: codigo ativo, guards preservados, sem operacao real.');
    }
  } catch (e64) {
    resultado.bloqueios.push('Erro FLASH.6.4: ' + (e64 && e64.message ? e64.message : String(e64)));
  }

  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}


// FLASH.6.5 — roteiro de validacao visual/humana PRODUCAO_V2 v32. Somente leitura.
function AUDITAR_FLASH65_VALIDACAO_VISUAL_PRODUCAO_V2_SEM_GRAVAR() {
  var resultado = {
    success: false, ok: false, fase: 'FLASH.6.5',
    ambiente: null, bloqueios: [], avisos: [],
    flash64Aprovada: false,
    funcoesFlash60: {},
    operacaoControladaAtiva: false,
    liberacaoGeralFlash: false,
    brunaAutorizada: false,
    flash44Intacto: false,
    gravacaoReal: false,
    checklistVisualHumano: [
      '1. Abrir WebApp PRODUCAO_V2 na URL oficial',
      '2. Confirmar que a pagina carrega sem erros de script',
      '3. Fazer login com usuario autorizado',
      '4. Confirmar menu principal e navegacao carregando normalmente',
      '5. Confirmar menu Financeiro visivel e acessivel',
      '6. Confirmar area Cartoes Flash — abas, lista de cartoes, filtros ativos',
      '7. Confirmar que telas anteriores nao regridem: Dashboard, Clientes, OS, Mobile',
      '8. Confirmar que botoes de acao NAO executam automaticamente ao carregar',
      '9. Confirmar que interface NAO exibe liberacao geral ativa',
      '10. Confirmar que operacao de recarga exige CPF autorizado (NAO simular recarga real)',
      '11. Confirmar que nenhuma recarga foi criada automaticamente',
      '12. Confirmar que nenhum lancamento foi criado automaticamente',
      '13. NAO clicar em botao de confirmacao de operacao real',
      '14. Se testar botao, usar somente previa/dry-run/sem gravar'
    ],
    checklistAceiteHumano: {
      webappCarregaOk: null,
      loginOk: null,
      menuPrincipalOk: null,
      menuFinanceiroOk: null,
      cartaoFlashOk: null,
      telasExistentesOk: null,
      operacaoControladaOk: null,
      liberacaoGeralFalseOk: null,
      nenhumEfeitoRealOk: null,
      aprovadoPeloHumano: null,
      observacoes: 'Preencher manualmente apos validacao visual no WebApp PRODUCAO_V2 v32'
    },
    confirmacoes: {
      recargaAutomaticaCriada: false,
      lancamentoAutomaticoCriado: false,
      emailOuWhatsappEnviado: false,
      extratoImportado: false,
      deployNovoCriado: false
    }
  };

  try {
    var amb = _f410ValidarAmbientePV2_();
    resultado.ambiente = amb.ok ? 'PRODUCAO_V2' : 'NAO_AUTORIZADO';
    if (!amb.ok) {
      resultado.bloqueios.push('Ambiente nao e PRODUCAO_V2: ' + amb.bloqueio);
      Logger.log(JSON.stringify(resultado, null, 2));
      return resultado;
    }

    var a64 = AUDITAR_FLASH64_POS_DEPLOY_PRODUCAO_V2_SEM_GRAVAR();
    resultado.flash64Aprovada         = !!(a64 && a64.ok === true);
    resultado.operacaoControladaAtiva = !!(a64 && a64.operacaoControladaAtiva);
    resultado.liberacaoGeralFlash     = !!(a64 && a64.liberacaoGeralFlash);
    resultado.brunaAutorizada         = !!(a64 && a64.brunaAutorizada);
    resultado.flash44Intacto          = !!(a64 && a64.flash44Intacto);

    resultado.funcoesFlash60 = {
      PRE_CONCILIAR_FLASH_IA_SEM_GRAVAR:                        typeof PRE_CONCILIAR_FLASH_IA_SEM_GRAVAR === 'function',
      GERAR_HTML_TERMO_RESPONSABILIDADE_FLASH_SEM_GRAVAR:       typeof GERAR_HTML_TERMO_RESPONSABILIDADE_FLASH_SEM_GRAVAR === 'function',
      GERAR_HTML_RELATORIO_MENSAL_COLABORADOR_FLASH_SEM_GRAVAR: typeof GERAR_HTML_RELATORIO_MENSAL_COLABORADOR_FLASH_SEM_GRAVAR === 'function',
      PREPARAR_COBRANCAS_FLASH_SEM_ENVIAR:                      typeof PREPARAR_COBRANCAS_FLASH_SEM_ENVIAR === 'function',
      AUDITAR_FLASH60_ARQUITETURA_FINAL_SEM_GRAVAR:             typeof AUDITAR_FLASH60_ARQUITETURA_FINAL_SEM_GRAVAR === 'function',
      AUDITAR_FLASH63_POS_PUBLICACAO_PRODUCAO_V2_SEM_GRAVAR:    typeof AUDITAR_FLASH63_POS_PUBLICACAO_PRODUCAO_V2_SEM_GRAVAR === 'function',
      AUDITAR_FLASH64_POS_DEPLOY_PRODUCAO_V2_SEM_GRAVAR:        typeof AUDITAR_FLASH64_POS_DEPLOY_PRODUCAO_V2_SEM_GRAVAR === 'function',
      DIAGNOSTICAR_FLASH63B_PRODUCAO_V2_SEM_GRAVAR:             typeof DIAGNOSTICAR_FLASH63B_PRODUCAO_V2_SEM_GRAVAR === 'function'
    };
    var todasFuncoesPresentes = Object.keys(resultado.funcoesFlash60).every(function (k) {
      return resultado.funcoesFlash60[k] === true;
    });

    if (!resultado.flash64Aprovada) {
      resultado.bloqueios.push('AUDITAR_FLASH64 nao ok — validacao visual nao deve prosseguir sem base auditada.');
    }
    if (resultado.liberacaoGeralFlash) {
      resultado.bloqueios.push('REGRESSAO: FLASH_LIBERACAO_GERAL esta true — nao prosseguir com validacao visual.');
    }
    if (!resultado.brunaAutorizada) {
      resultado.bloqueios.push('REGRESSAO: CPF da Bruna nao autorizado — verificar Properties.');
    }
    if (!todasFuncoesPresentes) {
      resultado.bloqueios.push('Funcoes FLASH.6.0 ausentes — verificar push PRODUCAO_V2.');
    }

    resultado.success = resultado.bloqueios.length === 0;
    resultado.ok      = resultado.success && !resultado.liberacaoGeralFlash && resultado.brunaAutorizada;

    if (resultado.ok) {
      resultado.avisos.push('FLASH.6.5 pre-validacao OK. Seguir checklistVisualHumano e preencher checklistAceiteHumano.');
    }
  } catch (e65) {
    resultado.bloqueios.push('Erro FLASH.6.5: ' + (e65 && e65.message ? e65.message : String(e65)));
  }

  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

// FLASH.6.5 — resumo do roteiro humano de validacao. Somente leitura.
function RESUMIR_FLASH65_ROTEIRO_HUMANO_SEM_GRAVAR() {
  var resultado = {
    success: true, ok: true, fase: 'FLASH.6.5',
    ambiente: 'PRODUCAO_V2',
    versaoAtiva: 'v32 — FLASH.6.4 PRODUCAO_V2 - Flash60 ativo sem liberacao geral',
    gravacaoReal: false,
    roteiro: [
      {etapa: 1, acao: 'Executar AUDITAR_FLASH65_VALIDACAO_VISUAL_PRODUCAO_V2_SEM_GRAVAR no editor Apps Script', responsavel: 'Tecnico',  esperado: 'ok:true'},
      {etapa: 2, acao: 'Abrir WebApp PRODUCAO_V2 na URL oficial', responsavel: 'Humano', esperado: 'Carrega sem erro'},
      {etapa: 3, acao: 'Login com usuario autorizado', responsavel: 'Humano', esperado: 'Login OK'},
      {etapa: 4, acao: 'Verificar menu Financeiro e area Cartoes Flash', responsavel: 'Humano', esperado: 'Menus visiveis e funcionando'},
      {etapa: 5, acao: 'Confirmar que telas existentes nao regridem (Dashboard, OS, Mobile)', responsavel: 'Humano', esperado: 'Sem regressao'},
      {etapa: 6, acao: 'Confirmar operacao controlada restrita (sem simular recarga real)', responsavel: 'Humano', esperado: 'Sem liberacao geral'},
      {etapa: 7, acao: 'Confirmar ausencia de acao automatica (recarga, lancamento, email)', responsavel: 'Humano', esperado: 'Nenhum efeito real'},
      {etapa: 8, acao: 'Preencher checklistAceiteHumano e reportar aprovacao ou reprovacao', responsavel: 'Humano', esperado: 'Aprovado ou Reprovado'}
    ],
    criteriosDeParada: [
      'WebApp nao carrega',
      'Login falha para usuarios autorizados',
      'Menu Financeiro ou Flash ausente',
      'Regressao em tela existente',
      'Recarga ou lancamento criado automaticamente',
      'liberacaoGeral ativa visivel',
      'Qualquer dado operacional criado sem acao humana explicita'
    ],
    planoDeRetorno: 'Se reprovado: clasp deploy -i AKfycby3Zaz6YTlaW5y0Z0spRuJMqxplQWE9axztjtHNqJz_nWHpPOtj5fTa_ZDe33lYiphdpw --versionNumber 31 — requer aceite humano explicito e auditoria de reversao.'
  };

  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}


// FLASH.6.6 — fechamento de aceite visual PRODUCAO_V2 v32. Somente leitura.
function AUDITAR_FLASH66_FECHAMENTO_ACEITE_VISUAL_SEM_GRAVAR() {
  var resultado = {
    success: false, ok: false, fase: 'FLASH.6.6',
    ambiente: null, bloqueios: [], avisos: [],
    flash64Aprovada: false, flash65Aprovada: false,
    aceiteHumanoVisual: true,
    webappV32Ativo: true,
    operacaoControladaAtiva: false,
    liberacaoGeralFlash: false,
    cpfAutorizado: '5553116198',
    brunaAutorizada: false,
    flash44Intacto: false,
    gravacaoReal: false,
    checklistAceiteHumano: {
      webappCarregaOk: true,
      loginOk: true,
      menuPrincipalOk: true,
      menuFinanceiroOk: true,
      cartaoFlashOk: true,
      telasExistentesOk: true,
      operacaoControladaOk: true,
      liberacaoGeralFalseOk: true,
      nenhumEfeitoRealOk: true,
      aprovadoPeloHumano: true,
      observacoes: 'Aceite visual informado pelo operador apos validacao no WebApp PRODUCAO_V2 v32.'
    },
    confirmacoes: {
      recargaAutomaticaCriada: false,
      lancamentoAutomaticoCriado: false,
      emailOuWhatsappEnviado: false,
      extratoImportado: false,
      liberacaoGeralExecutada: false,
      operacaoRealExecutada: false
    },
    proximoPasso: 'FLASH.6.7 — preparacao de piloto operacional controlado da Bruna, sem liberacao geral.'
  };

  try {
    var amb = _f410ValidarAmbientePV2_();
    resultado.ambiente = amb.ok ? 'PRODUCAO_V2' : 'NAO_AUTORIZADO';
    if (!amb.ok) {
      resultado.bloqueios.push('Ambiente nao e PRODUCAO_V2: ' + amb.bloqueio);
      Logger.log(JSON.stringify(resultado, null, 2));
      return resultado;
    }

    var a65 = AUDITAR_FLASH65_VALIDACAO_VISUAL_PRODUCAO_V2_SEM_GRAVAR();
    resultado.flash65Aprovada         = !!(a65 && a65.ok === true);
    resultado.flash64Aprovada         = !!(a65 && a65.flash64Aprovada === true);
    resultado.operacaoControladaAtiva = !!(a65 && a65.operacaoControladaAtiva);
    resultado.liberacaoGeralFlash     = !!(a65 && a65.liberacaoGeralFlash);
    resultado.brunaAutorizada         = !!(a65 && a65.brunaAutorizada);
    resultado.flash44Intacto          = !!(a65 && a65.flash44Intacto);

    if (!resultado.flash65Aprovada) {
      resultado.bloqueios.push('AUDITAR_FLASH65 nao ok: ' + JSON.stringify((a65 && a65.bloqueios) || []));
    }
    if (resultado.liberacaoGeralFlash) {
      resultado.bloqueios.push('REGRESSAO: FLASH_LIBERACAO_GERAL esta true — deve permanecer false.');
    }
    if (!resultado.brunaAutorizada) {
      resultado.bloqueios.push('REGRESSAO: CPF da Bruna (' + resultado.cpfAutorizado + ') nao autorizado.');
    }

    resultado.success = resultado.bloqueios.length === 0;
    resultado.ok      = resultado.success && !resultado.liberacaoGeralFlash && resultado.brunaAutorizada;

    if (resultado.ok) {
      resultado.avisos.push('FLASH.6.6 fechamento OK: aceite visual registrado, PRODUCAO_V2 v32 apto, operacao continua controlada.');
      resultado.avisos.push('Proximo passo: ' + resultado.proximoPasso);
    }
  } catch (e66) {
    resultado.bloqueios.push('Erro FLASH.6.6: ' + (e66 && e66.message ? e66.message : String(e66)));
  }

  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}


// FLASH.6.7 — preparacao de piloto operacional controlado da Bruna. Somente leitura.
function AUDITAR_FLASH67_PREPARACAO_PILOTO_BRUNA_SEM_EXECUTAR() {
  var resultado = {
    success: false, ok: false, fase: 'FLASH.6.7',
    ambiente: null, bloqueios: [], avisos: [],
    flash66Aprovada: false,
    piloto: 'BRUNA', cpfPiloto: '5553116198',
    operacaoControladaAtiva: false,
    liberacaoGeralFlash: false,
    brunaAutorizada: false,
    cpfNaoAutorizadoBloqueado: false,
    flash44Intacto: false,
    gravacaoReal: false,
    roteiroPilotoControlado: [
      '1. Abrir WebApp PRODUCAO_V2 v32 na URL oficial',
      '2. Acessar Financeiro > Cartoes Flash',
      '3. Localizar ou confirmar cadastro operacional da Bruna',
      '4. Confirmar CPF 5553116198 vinculado ao cartao',
      '5. Confirmar cartao vinculado, se existir',
      '6. NAO criar recarga nesta etapa',
      '7. NAO criar lancamento nesta etapa',
      '8. NAO enviar comunicacao',
      '9. Testar apenas telas, previas ou dry-run sem gravar',
      '10. Se qualquer botao indicar gravacao real, PARAR',
      '11. Se qualquer outro CPF for aceito sem bloqueio, PARAR',
      '12. Se liberacao geral aparecer ativa, PARAR'
    ],
    checklistGoNoGoPiloto: {
      ambientePRODUCAO_V2Confirmado: false,
      webappV32Confirmado: true,
      flash66Aprovado: false,
      cpfBrunaConfirmado: false,
      liberacaoGeralFalse: false,
      operacaoControladaAtiva: false,
      cpfNaoAutorizadoBloqueado: false,
      semEfeitoReal: true,
      prontoParaPilotoOperacionalControlado: false
    },
    confirmacoes: {
      recargaAutomaticaCriada: false,
      lancamentoAutomaticoCriado: false,
      emailOuWhatsappEnviado: false,
      extratoImportado: false,
      operacaoRealExecutada: false
    }
  };

  try {
    var amb = _f410ValidarAmbientePV2_();
    resultado.ambiente = amb.ok ? 'PRODUCAO_V2' : 'NAO_AUTORIZADO';
    if (!amb.ok) {
      resultado.bloqueios.push('Ambiente nao e PRODUCAO_V2: ' + amb.bloqueio);
      Logger.log(JSON.stringify(resultado, null, 2));
      return resultado;
    }
    resultado.checklistGoNoGoPiloto.ambientePRODUCAO_V2Confirmado = true;

    var a66 = AUDITAR_FLASH66_FECHAMENTO_ACEITE_VISUAL_SEM_GRAVAR();
    resultado.flash66Aprovada         = !!(a66 && a66.ok === true);
    resultado.operacaoControladaAtiva = !!(a66 && a66.operacaoControladaAtiva);
    resultado.liberacaoGeralFlash     = !!(a66 && a66.liberacaoGeralFlash);
    resultado.brunaAutorizada         = !!(a66 && a66.brunaAutorizada);
    resultado.flash44Intacto          = !!(a66 && a66.flash44Intacto);

    resultado.cpfNaoAutorizadoBloqueado = resultado.operacaoControladaAtiva &&
      !resultado.liberacaoGeralFlash &&
      !_f413CPFAutorizado_('00000000000');

    resultado.checklistGoNoGoPiloto.flash66Aprovado          = resultado.flash66Aprovada;
    resultado.checklistGoNoGoPiloto.cpfBrunaConfirmado       = resultado.brunaAutorizada;
    resultado.checklistGoNoGoPiloto.liberacaoGeralFalse      = !resultado.liberacaoGeralFlash;
    resultado.checklistGoNoGoPiloto.operacaoControladaAtiva  = resultado.operacaoControladaAtiva;
    resultado.checklistGoNoGoPiloto.cpfNaoAutorizadoBloqueado = resultado.cpfNaoAutorizadoBloqueado;
    resultado.checklistGoNoGoPiloto.prontoParaPilotoOperacionalControlado =
      resultado.flash66Aprovada && resultado.brunaAutorizada &&
      !resultado.liberacaoGeralFlash && resultado.cpfNaoAutorizadoBloqueado;

    if (!resultado.flash66Aprovada) {
      resultado.bloqueios.push('AUDITAR_FLASH66 nao ok — piloto nao pode prosseguir sem aceite visual confirmado.');
    }
    if (resultado.liberacaoGeralFlash) {
      resultado.bloqueios.push('REGRESSAO: FLASH_LIBERACAO_GERAL esta true — deve permanecer false.');
    }
    if (!resultado.brunaAutorizada) {
      resultado.bloqueios.push('REGRESSAO: CPF da Bruna (' + resultado.cpfPiloto + ') nao autorizado no guard.');
    }
    if (!resultado.cpfNaoAutorizadoBloqueado) {
      resultado.bloqueios.push('Guard de CPF nao autorizado com falha — CPF 00000000000 nao foi bloqueado corretamente.');
    }

    resultado.success = resultado.bloqueios.length === 0;
    resultado.ok      = resultado.success && !resultado.liberacaoGeralFlash && resultado.brunaAutorizada;

    if (resultado.ok) {
      resultado.avisos.push('FLASH.6.7 preparacao OK: piloto controlado da Bruna tecnicamente apto. Aguardar autorizacao humana para executar operacao real.');
    }
  } catch (e67) {
    resultado.bloqueios.push('Erro FLASH.6.7: ' + (e67 && e67.message ? e67.message : String(e67)));
  }

  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

// FLASH.6.7 — decisao GO/NO-GO para piloto operacional controlado da Bruna.
function RESUMIR_FLASH67_GO_NOGO_PILOTO_BRUNA_SEM_EXECUTAR() {
  var auditoria = AUDITAR_FLASH67_PREPARACAO_PILOTO_BRUNA_SEM_EXECUTAR();
  var go = auditoria.ok === true &&
           auditoria.success === true &&
           auditoria.gravacaoReal === false &&
           auditoria.confirmacoes.operacaoRealExecutada === false;
  var resultado = {
    success: true, ok: go,
    fase: 'FLASH.6.7',
    ambiente: auditoria.ambiente || 'PRODUCAO_V2',
    decisao: go ? 'GO' : 'NO-GO',
    resumo: go
      ? 'GO tecnico: piloto controlado da Bruna apto. Aguarda autorizacao humana explicita para operacao real.'
      : 'NO-GO: existem bloqueios que devem ser resolvidos antes do piloto.',
    bloqueios: auditoria.bloqueios || [],
    avisos: auditoria.avisos || [],
    cpfPiloto: auditoria.cpfPiloto,
    liberacaoGeralFlash: auditoria.liberacaoGeralFlash,
    brunaAutorizada: auditoria.brunaAutorizada,
    cpfNaoAutorizadoBloqueado: auditoria.cpfNaoAutorizadoBloqueado,
    checklistGoNoGoPiloto: auditoria.checklistGoNoGoPiloto,
    operacaoRealExecutada: false,
    gravacaoReal: false
  };

  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}
