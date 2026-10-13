function CronExec_setupModulo() {
  const props = PropertiesService.getScriptProperties();

  let planilha;
  const dbExistente = props.getProperty("CRONEXEC_DB_ID");

  if (!dbExistente) {
    planilha = SpreadsheetApp.create(CRONEXEC_CFG.PLANILHA.NOME);
    props.setProperty("CRONEXEC_DB_ID", planilha.getId());

    const abas = CRONEXEC_CFG.PLANILHA.ABAS;
    Object.values(abas).forEach(nome => {
      let aba = planilha.getSheetByName(nome);
      if (!aba) aba = planilha.insertSheet(nome);
    });

    const defaultSheet = planilha.getSheetByName("Sheet1");
    if (defaultSheet) {
      planilha.deleteSheet(defaultSheet);
    }
  } else {
    planilha = SpreadsheetApp.openById(dbExistente);
    CronExec_garantirAbas_(planilha);
  }

  CronExec_inicializarAbas_(planilha);

  const pastaRaizId = props.getProperty("CRONEXEC_PASTA_RAIZ_ID");
  const pastaPdfId = props.getProperty("CRONEXEC_PASTA_PDF_ID");

  if (!pastaRaizId || !pastaPdfId) {
    const pastaRaiz = DriveApp.createFolder(CRONEXEC_CFG.DRIVE.PASTA_RAIZ);
    const pastaPdf = pastaRaiz.createFolder(CRONEXEC_CFG.DRIVE.PASTA_PDFS);

    props.setProperty("CRONEXEC_PASTA_RAIZ_ID", pastaRaiz.getId());
    props.setProperty("CRONEXEC_PASTA_PDF_ID", pastaPdf.getId());
  }

  props.setProperty("CRONEXEC_LOGO_ID", CRONEXEC_CFG.LOGO_ID);
  props.setProperty("CRONEXEC_APP_NOME", CRONEXEC_CFG.APP.NOME);
  props.setProperty("CRONEXEC_APP_VERSAO", CRONEXEC_CFG.APP.VERSAO);
  props.setProperty("CRONEXEC_EMPRESA_NOME", CRONEXEC_CFG.EMPRESA.NOME);
  props.setProperty("CRONEXEC_RESPONSAVEL_TECNICO", CRONEXEC_CFG.EMPRESA.RESPONSAVEL_TECNICO);
  props.setProperty("CRONEXEC_WHATSAPP_MSG", CRONEXEC_CFG.WHATSAPP.MENSAGEM_PADRAO);
  props.setProperty("CRONEXEC_LIMIAR_UNIDADE_UNICO_GRUPO", String(CRONEXEC_CFG.GRUPOS.LIMIAR_UNIDADE_UNICO_GRUPO));
  props.setProperty("CRONEXEC_MAX_UNIDADES_POR_GRUPO", String(CRONEXEC_CFG.GRUPOS.MAX_UNIDADES_POR_GRUPO));
  props.setProperty("CRONEXEC_DIAS_UTEIS_POR_GRUPO", String(CRONEXEC_CFG.GRUPOS.DIAS_UTEIS_POR_GRUPO));
  props.setProperty("CRONEXEC_GAP_DIAS_UTEIS_ENTRE_GRUPOS", String(CRONEXEC_CFG.GRUPOS.GAP_DIAS_UTEIS_ENTRE_GRUPOS));

  return {
    ok: true,
    mensagem: "Setup Cronograma de Execução V1.0 concluído com sucesso.",
    dbId: props.getProperty("CRONEXEC_DB_ID"),
    pastaPdfId: props.getProperty("CRONEXEC_PASTA_PDF_ID")
  };
}

function CronExec_garantirAbas_(planilha) {
  const abas = CRONEXEC_CFG.PLANILHA.ABAS;

  Object.values(abas).forEach(nome => {
    let aba = planilha.getSheetByName(nome);
    if (!aba) {
      planilha.insertSheet(nome);
    }
  });
}

function CronExec_inicializarAbas_(planilha) {
  const abas = CRONEXEC_CFG.PLANILHA.ABAS;

  // 1. Aba de Configuração do Sistema (CFG_SISTEMA)
  const cfg = planilha.getSheetByName(abas.CONFIG);
  cfg.clear();

  const configValues = [
    ["CHAVE", "VALOR"],
    ["CRONEXEC_LOGO_ID", CRONEXEC_CFG.LOGO_ID],
    ["CRONEXEC_APP_NOME", CRONEXEC_CFG.APP.NOME],
    ["VERSAO", CRONEXEC_CFG.APP.VERSAO],
    ["CRONEXEC_WHATSAPP_MSG", CRONEXEC_CFG.WHATSAPP.MENSAGEM_PADRAO],
    ["CRONEXEC_EMPRESA_NOME", CRONEXEC_CFG.EMPRESA.NOME],
    ["CRONEXEC_RESPONSAVEL_TECNICO", CRONEXEC_CFG.EMPRESA.RESPONSAVEL_TECNICO],
    ["CRONEXEC_LIMIAR_UNIDADE_UNICO_GRUPO", CRONEXEC_CFG.GRUPOS.LIMIAR_UNIDADE_UNICO_GRUPO],
    ["CRONEXEC_MAX_UNIDADES_POR_GRUPO", CRONEXEC_CFG.GRUPOS.MAX_UNIDADES_POR_GRUPO],
    ["CRONEXEC_DIAS_UTEIS_POR_GRUPO", CRONEXEC_CFG.GRUPOS.DIAS_UTEIS_POR_GRUPO],
    ["CRONEXEC_GAP_DIAS_UTEIS_ENTRE_GRUPOS", CRONEXEC_CFG.GRUPOS.GAP_DIAS_UTEIS_ENTRE_GRUPOS]
  ];

  cfg.getRange(1, 1, configValues.length, 2).setValues(configValues);

  // 2. Aba de Clientes (CAD_CLIENTES) — cache de CNPJ, não é cadastro de equipamento
  const clientes = planilha.getSheetByName(abas.CLIENTES);
  clientes.clear();
  clientes.getRange(1, 1, 1, 7).setValues([[
    "ID", "CNPJ", "RAZAO_SOCIAL", "LOGRADOURO", "BAIRRO", "CIDADE", "UF"
  ]]);

  // 3. Aba de Cronogramas gerados (MOV_CRONOGRAMAS)
  const cronogramas = planilha.getSheetByName(abas.CRONOGRAMAS);
  cronogramas.clear();
  cronogramas.getRange(1, 1, 1, 16).setValues([[
    "ID",
    "DATA",
    "CLIENTE",
    "CNPJ",
    "TOTAL_TIPOS_EQUIPAMENTO",
    "TOTAL_UNIDADES",
    "MODO",
    "TOTAL_GRUPOS",
    "DATA_INICIO_GRUPO1",
    "DATA_FIM_ULTIMO_GRUPO",
    "PARAM_MAX_UNIDADES_GRUPO",
    "PARAM_DIAS_UTEIS_GRUPO",
    "PARAM_GAP_DIAS",
    "EQUIPAMENTOS_JSON",
    "GRUPOS_JSON",
    "TEXTOS_IA_JSON"
  ]]);

  // 4. Aba de Documentos Gerados (MOV_DOCUMENTOS)
  const documentos = planilha.getSheetByName(abas.DOCUMENTOS);
  documentos.clear();
  documentos.getRange(1, 1, 1, 7).setValues([[
    "ID",
    "DATA",
    "CLIENTE",
    "TIPO_DOCUMENTO",
    "NOME_ARQUIVO",
    "URL",
    "CRONOGRAMA_ID"
  ]]);

  CronExec_aplicarEstiloCabecalho_(cfg);
  CronExec_aplicarEstiloCabecalho_(clientes);
  CronExec_aplicarEstiloCabecalho_(cronogramas);
  CronExec_aplicarEstiloCabecalho_(documentos);
}

function CronExec_aplicarEstiloCabecalho_(aba) {
  const ultimaColuna = aba.getLastColumn();
  if (!ultimaColuna) return;

  aba.getRange(1, 1, 1, ultimaColuna)
    .setFontWeight("bold")
    .setBackground("#d9ead3");

  aba.setFrozenRows(1);
  aba.autoResizeColumns(1, ultimaColuna);
}

function CronExec_gerarId_() {
  return Utilities.getUuid();
}
