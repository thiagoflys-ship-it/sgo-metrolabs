/**
 * ============================================================
 * METROLABS — CARTA DE CONFORMIDADE / RELATÓRIO TÉCNICO
 * ARQUIVO: Setup.gs
 * VERSÃO: V2.0 PROFISSIONAL
 *
 * FUNÇÃO:
 * - Criar banco de dados V2.
 * - Criar pastas do Drive.
 * - Criar abas do sistema.
 * - Criar aba de validação.
 * - Salvar propriedades centrais.
 * - Não apagar dados existentes.
 *
 * IMPORTANTE:
 * Execute setupMetrolabsCartaConformidadeV2() uma vez
 * antes de implantar/testar o WebApp.
 * ============================================================
 */

function setupMetrolabsCartaConformidadeV2() {
  const props = PropertiesService.getScriptProperties();

  const db = obterOuCriarBancoSetupV2_(props);
  garantirAbasSetupV2_(db);
  inicializarAbasSetupV2_(db);
  garantirPastasDriveSetupV2_(props);
  salvarPropriedadesSetupV2_(props);
  registrarLogSetupV2_(db, "SETUP", "Setup V2 executado com sucesso.");

  return {
    ok: true,
    mensagem: "Setup Metrolabs Carta de Conformidade V2 concluído com sucesso.",
    dbId: props.getProperty("DB_ID"),
    pastaRaizId: props.getProperty("PASTA_RAIZ_ID"),
    pastaPdfId: props.getProperty("PASTA_PDF_ID"),
    pastaDocsId: props.getProperty("PASTA_DOCS_ID"),
    pastaTempId: props.getProperty("PASTA_TEMP_ID"),
    pastaAssinaturasId: props.getProperty("PASTA_ASSINATURAS_ID")
  };
}

/**
 * Compatibilidade: se você executar o nome antigo, ele chama o V2.
 */
function setupMetrolabsCartaConformidadeV1() {
  return setupMetrolabsCartaConformidadeV2();
}

/**
 * ============================================================
 * BANCO
 * ============================================================
 */

function obterOuCriarBancoSetupV2_(props) {
  const dbId = String(props.getProperty("DB_ID") || "").trim();

  if (dbId) {
    try {
      return SpreadsheetApp.openById(dbId);
    } catch (e) {
      // ID antigo inválido: cria novo banco.
    }
  }

  const db = SpreadsheetApp.create(CFG.PLANILHA.NOME || "METROLABS_CARTA_CONFORMIDADE_DB_V2");
  props.setProperty("DB_ID", db.getId());
  return db;
}

function garantirAbasSetupV2_(db) {
  const abas = CFG.PLANILHA.ABAS || {};

  Object.keys(abas).forEach(function(chave) {
    const nome = abas[chave];
    if (nome && !db.getSheetByName(nome)) {
      db.insertSheet(nome);
    }
  });

  if (!db.getSheetByName("VALIDACAO")) {
    db.insertSheet("VALIDACAO");
  }

  const sheet1 = db.getSheetByName("Sheet1");
  if (sheet1 && db.getSheets().length > 1) {
    try {
      db.deleteSheet(sheet1);
    } catch (e) {}
  }
}

function inicializarAbasSetupV2_(db) {
  const A = CFG.PLANILHA.ABAS;

  inicializarAbaSetupV2_(db.getSheetByName(A.CONFIG), cabecalhoConfigSetupV2_(), linhasConfigSetupV2_());
  inicializarAbaSetupV2_(db.getSheetByName(A.CLIENTES), cabecalhoClientesSetupV2_());
  inicializarAbaSetupV2_(db.getSheetByName(A.EQUIPAMENTOS), cabecalhoEquipamentosSetupV2_());
  inicializarAbaSetupV2_(db.getSheetByName(A.EXECUCOES), cabecalhoExecucoesSetupV2_());
  inicializarAbaSetupV2_(db.getSheetByName(A.RELATORIOS), cabecalhoRelatoriosSetupV2_());
  inicializarAbaSetupV2_(db.getSheetByName(A.DOCUMENTOS), cabecalhoDocumentosSetupV2_());

  inicializarAbaSetupV2_(db.getSheetByName(A.ESTERILIZACAO_CICLOS), cabecalhoEsterilizacaoCiclosSetupV2_());
  inicializarAbaSetupV2_(db.getSheetByName(A.ESTERILIZACAO_INSUMOS), cabecalhoEsterilizacaoInsumosSetupV2_());

  inicializarAbaSetupV2_(db.getSheetByName(A.LAVAGEM_CICLOS), cabecalhoLavagemCiclosSetupV2_());
  inicializarAbaSetupV2_(db.getSheetByName(A.LAVAGEM_TESTES), cabecalhoLavagemTestesSetupV2_());

  inicializarAbaSetupV2_(db.getSheetByName(A.ENSAIOS_TERMICOS), cabecalhoEnsaiosTermicosSetupV2_());
  inicializarAbaSetupV2_(db.getSheetByName(A.ENSAIOS_GERAIS), cabecalhoEnsaiosGeraisSetupV2_());
  inicializarAbaSetupV2_(db.getSheetByName(A.INSPECOES_NR13), cabecalhoInspecoesNR13SetupV2_());

  inicializarAbaSetupV2_(db.getSheetByName(A.LOGS), cabecalhoLogsSetupV2_());
  inicializarAbaSetupV2_(db.getSheetByName("VALIDACAO"), cabecalhoValidacaoSetupV2_());
}

function inicializarAbaSetupV2_(aba, cabecalho, linhasIniciais) {
  if (!aba || !cabecalho || !cabecalho.length) return;

  const lastRow = aba.getLastRow();
  const lastCol = Math.max(aba.getLastColumn(), cabecalho.length);

  if (lastRow === 0) {
    aba.getRange(1, 1, 1, cabecalho.length).setValues([cabecalho]);

    if (linhasIniciais && linhasIniciais.length) {
      aba.getRange(2, 1, linhasIniciais.length, cabecalho.length).setValues(linhasIniciais);
    }

    aplicarEstiloAbaSetupV2_(aba);
    return;
  }

  const atual = aba.getRange(1, 1, 1, lastCol).getValues()[0];
  const vazio = atual.every(function(v) {
    return String(v || "").trim() === "";
  });

  if (vazio) {
    aba.getRange(1, 1, 1, cabecalho.length).setValues([cabecalho]);
    if (linhasIniciais && linhasIniciais.length && aba.getLastRow() === 1) {
      aba.getRange(2, 1, linhasIniciais.length, cabecalho.length).setValues(linhasIniciais);
    }
  }

  aplicarEstiloAbaSetupV2_(aba);
}

function aplicarEstiloAbaSetupV2_(aba) {
  const cols = aba.getLastColumn();
  if (!cols) return;

  aba.getRange(1, 1, 1, cols)
    .setFontWeight("bold")
    .setBackground("#198754")
    .setFontColor("#ffffff");

  aba.setFrozenRows(1);

  try {
    aba.autoResizeColumns(1, cols);
  } catch (e) {}
}

/**
 * ============================================================
 * DRIVE
 * ============================================================
 */

function garantirPastasDriveSetupV2_(props) {
  const raiz = obterOuCriarPastaSetupV2_(props, "PASTA_RAIZ_ID", CFG.DRIVE.PASTA_RAIZ, null);

  const pdf = obterOuCriarPastaSetupV2_(props, "PASTA_PDF_ID", CFG.DRIVE.PASTA_PDFS, raiz);
  const docs = obterOuCriarPastaSetupV2_(props, "PASTA_DOCS_ID", CFG.DRIVE.PASTA_DOCS, raiz);
  const temp = obterOuCriarPastaSetupV2_(props, "PASTA_TEMP_ID", CFG.DRIVE.PASTA_TEMP, raiz);
  const assinaturas = obterOuCriarPastaSetupV2_(props, "PASTA_ASSINATURAS_ID", CFG.DRIVE.PASTA_ASSINATURAS, raiz);

  props.setProperty("PASTA_RAIZ_ID", raiz.getId());
  props.setProperty("PASTA_PDF_ID", pdf.getId());
  props.setProperty("PASTA_DOCS_ID", docs.getId());
  props.setProperty("PASTA_TEMP_ID", temp.getId());
  props.setProperty("PASTA_ASSINATURAS_ID", assinaturas.getId());
}

function obterOuCriarPastaSetupV2_(props, propName, nomePasta, pastaPai) {
  const existenteId = String(props.getProperty(propName) || "").trim();

  if (existenteId) {
    try {
      return DriveApp.getFolderById(existenteId);
    } catch (e) {}
  }

  let pasta;

  if (pastaPai) {
    const it = pastaPai.getFoldersByName(nomePasta);
    pasta = it.hasNext() ? it.next() : pastaPai.createFolder(nomePasta);
  } else {
    const itRaiz = DriveApp.getFoldersByName(nomePasta);
    pasta = itRaiz.hasNext() ? itRaiz.next() : DriveApp.createFolder(nomePasta);
  }

  props.setProperty(propName, pasta.getId());
  return pasta;
}

/**
 * ============================================================
 * PROPRIEDADES
 * ============================================================
 */

function salvarPropriedadesSetupV2_(props) {
  props.setProperty("APP_NOME", String(CFG.APP.NOME || ""));
  props.setProperty("APP_VERSAO", String(CFG.APP.VERSAO || ""));
  props.setProperty("APP_MODULO", String(CFG.APP.MODULO || ""));
  props.setProperty("TIMEZONE", String(CFG.APP.TIMEZONE || Session.getScriptTimeZone() || "America/Sao_Paulo"));

  props.setProperty("LOGO_ID", String(CFG.LOGO_ID || ""));

  props.setProperty("EMPRESA_NOME", String(CFG.EMPRESA.NOME || ""));
  props.setProperty("EMPRESA_CNPJ", String(CFG.EMPRESA.CNPJ || ""));
  props.setProperty("EMPRESA_ENDERECO", String(CFG.EMPRESA.ENDERECO || ""));
  props.setProperty("RESPONSAVEL_TECNICO", String(CFG.EMPRESA.RESPONSAVEL_TECNICO || ""));
  props.setProperty("EMPRESA_CREA", String(CFG.EMPRESA.CREA || ""));

  props.setProperty("WHATSAPP_MSG", String(CFG.WHATSAPP.MENSAGEM_PADRAO || ""));
  props.setProperty("TEXTO_CABECALHO_PRELIMINAR", String(CFG.TEXTOS_GERAIS.CABECALHO_PRELIMINAR || ""));
  props.setProperty("TEXTO_CLAUSULA_FINAL", String(CFG.TEXTOS_GERAIS.CLAUSULA_FINAL || ""));
  props.setProperty("TEXTO_VALIDACAO", String(CFG.TEXTOS_GERAIS.VALIDACAO || ""));
}

/**
 * ============================================================
 * CABEÇALHOS
 * ============================================================
 */

function cabecalhoConfigSetupV2_() {
  return ["CHAVE", "VALOR", "OBS"];
}

function cabecalhoClientesSetupV2_() {
  return [
    "ID", "DATA_CADASTRO", "CNPJ", "RAZAO_SOCIAL", "NOME_FANTASIA",
    "LOGRADOURO", "NUMERO", "COMPLEMENTO", "BAIRRO", "CIDADE", "UF", "CEP",
    "RESPONSAVEL", "TELEFONE", "EMAIL", "OBS"
  ];
}

function cabecalhoEquipamentosSetupV2_() {
  return [
    "ID", "DATA_CADASTRO", "CLIENTE_ID", "TIPO_CODIGO", "TIPO_NOME", "FAMILIA",
    "MARCA", "MODELO", "NUMERO_SERIE", "TAG", "PATRIMONIO", "CAPACIDADE_LITROS",
    "SETOR", "LOCAL_INSTALACAO", "FAIXA_MIN", "FAIXA_MAX", "PMTA", "VOLUME",
    "CATEGORIA_NR13", "CLASSE_FILTRO", "ROTACAO_MAXIMA", "TEMPERATURA_TRABALHO",
    "TIPO_GAS", "SISTEMA_EXAUSTAO", "OBS"
  ];
}

function cabecalhoExecucoesSetupV2_() {
  return [
    "ID", "DATA_REGISTRO", "CLIENTE_ID", "EQUIPAMENTO_ID", "TIPO_CODIGO",
    "TIPO_NOME", "FAMILIA", "DATA_EXECUCAO", "RESPONSAVEL_EXECUCAO",
    "OS_NUMERO", "ESCOPO_JSON", "OBS_GERAIS"
  ];
}

function cabecalhoRelatoriosSetupV2_() {
  return [
    "ID", "DATA_EMISSAO", "EXECUCAO_ID", "CLIENTE_ID", "EQUIPAMENTO_ID",
    "TIPO_CODIGO", "TIPO_NOME", "FAMILIA", "STATUS_FINAL",
    "STATUS_QI", "STATUS_QO", "STATUS_QD", "STATUS_INSPECAO",
    "DADOS_JSON", "AUDITORIA_JSON", "TEXTO_CONCLUSAO",
    "URL_PDF", "URL_DOC", "CODIGO_VALIDACAO", "URL_VALIDACAO",
    "OS_NUMERO", "CLIENTE_NOME", "CLIENTE_CNPJ", "EQUIPAMENTO_SERIE"
  ];
}

function cabecalhoDocumentosSetupV2_() {
  return [
    "ID", "DATA_REGISTRO", "CLIENTE_ID", "EQUIPAMENTO_ID", "RELATORIO_ID",
    "TIPO_DOCUMENTO", "NOME_ARQUIVO", "URL_ARQUIVO", "CODIGO_VALIDACAO",
    "URL_VALIDACAO", "OS_NUMERO", "CLIENTE", "CNPJ", "EQUIPAMENTO",
    "SERIE", "STATUS"
  ];
}

function cabecalhoEsterilizacaoCiclosSetupV2_() {
  return [
    "ID", "EXECUCAO_ID", "RELATORIO_ID", "CLIENTE_ID", "EQUIPAMENTO_ID",
    "TIPO_CODIGO", "TIPO_NOME", "RECEITA", "QUALIFICACAO", "CATEGORIA",
    "CODIGO_CICLO", "DATA_INICIO", "HORA_INICIO", "DATA_FIM", "HORA_FIM",
    "TEMPERATURA", "PRESSAO", "UMIDADE", "TEMPO_EXPOSICAO", "TEMPO_AERACAO",
    "RESULTADO", "OBS"
  ];
}

function cabecalhoEsterilizacaoInsumosSetupV2_() {
  return [
    "ID", "EXECUCAO_ID", "RELATORIO_ID", "CLIENTE_ID", "EQUIPAMENTO_ID",
    "TIPO_CODIGO", "TIPO_NOME", "RECEITA_VINCULADA", "INSUMO_CODIGO",
    "INSUMO_NOME", "LOTE", "VALIDADE", "FABRICANTE", "RESULTADO", "OBS"
  ];
}

function cabecalhoLavagemCiclosSetupV2_() {
  return [
    "ID", "EXECUCAO_ID", "RELATORIO_ID", "CLIENTE_ID", "EQUIPAMENTO_ID",
    "TIPO_CODIGO", "TIPO_NOME", "PROGRAMA", "QUALIFICACAO", "CATEGORIA",
    "CODIGO_CICLO", "DATA_INICIO", "HORA_INICIO", "DATA_FIM", "HORA_FIM",
    "TEMPERATURA_LAVAGEM", "TEMPERATURA_DESINFECCAO", "TEMPO_LAVAGEM",
    "TEMPO_DESINFECCAO", "A0", "RESULTADO", "OBS"
  ];
}

function cabecalhoLavagemTestesSetupV2_() {
  return [
    "ID", "EXECUCAO_ID", "RELATORIO_ID", "CLIENTE_ID", "EQUIPAMENTO_ID",
    "TIPO_CODIGO", "TIPO_NOME", "PROGRAMA_VINCULADO", "TESTE_CODIGO",
    "TESTE_NOME", "LOTE", "VALIDADE", "FABRICANTE", "RESULTADO", "OBS"
  ];
}

function cabecalhoEnsaiosTermicosSetupV2_() {
  return [
    "ID", "EXECUCAO_ID", "RELATORIO_ID", "CLIENTE_ID", "EQUIPAMENTO_ID",
    "TIPO_CODIGO", "TIPO_NOME", "ENSAIO", "DATA_INICIO", "HORA_INICIO",
    "DATA_FIM", "HORA_FIM", "FAIXA_MIN", "FAIXA_MAX", "TEMP_MIN",
    "TEMP_MAX", "TEMP_MEDIA", "EXCURSOES", "RESULTADO", "OBS"
  ];
}

function cabecalhoEnsaiosGeraisSetupV2_() {
  return [
    "ID", "EXECUCAO_ID", "RELATORIO_ID", "CLIENTE_ID", "EQUIPAMENTO_ID",
    "TIPO_CODIGO", "TIPO_NOME", "ENSAIO", "PARAMETRO", "VALOR_REFERENCIA",
    "VALOR_OBSERVADO", "CRITERIO", "RESULTADO", "OBS"
  ];
}

function cabecalhoInspecoesNR13SetupV2_() {
  return [
    "ID", "EXECUCAO_ID", "RELATORIO_ID", "CLIENTE_ID", "EQUIPAMENTO_ID",
    "TIPO_CODIGO", "TIPO_NOME", "PMTA", "VOLUME", "CATEGORIA_NR13",
    "ENSAIO", "PRESSAO_TESTE", "TEMPO_TESTE", "VALVULA_SEGURANCA",
    "MANOMETRO", "ESPESSURA", "INTEGRIDADE", "RESULTADO", "OBS"
  ];
}

function cabecalhoLogsSetupV2_() {
  return [
    "ID", "DATA_HORA", "USUARIO", "ACAO", "MODULO", "ENTIDADE",
    "ENTIDADE_ID", "STATUS", "DETALHE"
  ];
}

function cabecalhoValidacaoSetupV2_() {
  return [
    "DATA", "CODIGO", "CLIENTE", "CNPJ", "EQUIPAMENTO", "SERIE",
    "STATUS", "OS", "PDF", "URL_VALIDACAO"
  ];
}

/**
 * ============================================================
 * LINHAS INICIAIS
 * ============================================================
 */

function linhasConfigSetupV2_() {
  const linhas = [
    ["APP_NOME", CFG.APP.NOME, "Nome do sistema"],
    ["APP_VERSAO", CFG.APP.VERSAO, "Versão do sistema"],
    ["APP_MODULO", CFG.APP.MODULO, "Módulo interno"],
    ["LOGO_ID", CFG.LOGO_ID, "Logo Metrolabs no Google Drive"],
    ["EMPRESA_NOME", CFG.EMPRESA.NOME, "Empresa executante"],
    ["EMPRESA_CNPJ", CFG.EMPRESA.CNPJ, "CNPJ da empresa executante"],
    ["RESPONSAVEL_TECNICO", CFG.EMPRESA.RESPONSAVEL_TECNICO, "Responsável técnico padrão"],
    ["EMPRESA_CREA", CFG.EMPRESA.CREA, "CREA do responsável técnico"],
    ["TIMEZONE", CFG.APP.TIMEZONE, "Fuso horário padrão"]
  ];

  const tipos = getListaTiposEquipamento_();
  tipos.forEach(function(t) {
    linhas.push([
      "TIPO_EQUIPAMENTO_" + t.codigo,
      t.nome,
      "Família: " + t.familia
    ]);
  });

  return linhas;
}

/**
 * ============================================================
 * LOG
 * ============================================================
 */

function registrarLogSetupV2_(db, acao, detalhe) {
  try {
    const aba = db.getSheetByName(CFG.PLANILHA.ABAS.LOGS);
    if (!aba) return;

    aba.appendRow([
      "LOG_" + Utilities.getUuid().replace(/-/g, "").substring(0, 10).toUpperCase(),
      Utilities.formatDate(new Date(), CFG.APP.TIMEZONE || Session.getScriptTimeZone(), "dd/MM/yyyy HH:mm:ss"),
      Session.getActiveUser().getEmail() || "sistema",
      acao,
      "SETUP",
      "SISTEMA",
      "",
      "OK",
      detalhe
    ]);
  } catch (e) {}
}
