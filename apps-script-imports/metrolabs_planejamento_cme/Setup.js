function setupMetrolabsCME() {
  const props = PropertiesService.getScriptProperties();

  let planilha;
  const dbExistente = props.getProperty("DB_ID");

  if (!dbExistente) {
    planilha = SpreadsheetApp.create(CFG.PLANILHA.NOME);
    props.setProperty("DB_ID", planilha.getId());

    const abas = CFG.PLANILHA.ABAS;
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
    garantirAbas_(planilha);
  }

  inicializarAbas_(planilha);

  const pastaRaizId = props.getProperty("PASTA_RAIZ_ID");
  const pastaPdfId = props.getProperty("PASTA_PDF_ID");
  const pastaJustificativasId = props.getProperty("PASTA_JUSTIFICATIVAS_ID");

  if (!pastaRaizId || !pastaPdfId || !pastaJustificativasId) {
    const pastaRaiz = DriveApp.createFolder(CFG.DRIVE.PASTA_RAIZ);
    const pastaPdf = pastaRaiz.createFolder(CFG.DRIVE.PASTA_PDFS);
    const pastaJustificativas = pastaRaiz.createFolder(CFG.DRIVE.PASTA_JUSTIFICATIVAS);

    props.setProperty("PASTA_RAIZ_ID", pastaRaiz.getId());
    props.setProperty("PASTA_PDF_ID", pastaPdf.getId());
    props.setProperty("PASTA_JUSTIFICATIVAS_ID", pastaJustificativas.getId());
  }

  // Definição de Propriedades Gerais
  props.setProperty("LOGO_ID", CFG.LOGO_ID);
  props.setProperty("APP_NOME", CFG.APP.NOME);
  props.setProperty("APP_VERSAO", CFG.APP.VERSAO);
  props.setProperty("EMPRESA_NOME", CFG.EMPRESA.NOME);
  props.setProperty("RESPONSAVEL_TECNICO", CFG.EMPRESA.RESPONSAVEL_TECNICO);
  props.setProperty("MARGEM_SEGURANCA", String(CFG.CALCULO.MARGEM_SEGURANCA));
  props.setProperty("WHATSAPP_MSG", CFG.WHATSAPP.MENSAGEM_PADRAO);

  // Definição de Textos Técnicos Enriquecidos
  props.setProperty("TEXTO_QI", CFG.TEXTOS.QI);
  props.setProperty("TEXTO_QO", CFG.TEXTOS.QO);
  props.setProperty("TEXTO_QD", CFG.TEXTOS.QD);
  props.setProperty("TEXTO_ERU", CFG.TEXTOS.ERU);
  
  // Nova Propriedade para Observação Técnica de Lavadoras
  if (CFG.TEXTOS.LAVA_ULTR_OBS) {
    props.setProperty("TEXTO_LAVA_OBS", CFG.TEXTOS.LAVA_ULTR_OBS);
  }

  return {
    ok: true,
    mensagem: "Setup Metrolabs CME V3.0 concluído com sucesso.",
    dbId: props.getProperty("DB_ID"),
    pastaPdfId: props.getProperty("PASTA_PDF_ID"),
    pastaJustificativasId: props.getProperty("PASTA_JUSTIFICATIVAS_ID")
  };
}

function garantirAbas_(planilha) {
  const abas = CFG.PLANILHA.ABAS;

  Object.values(abas).forEach(nome => {
    let aba = planilha.getSheetByName(nome);
    if (!aba) {
      planilha.insertSheet(nome);
    }
  });
}

function inicializarAbas_(planilha) {
  const abas = CFG.PLANILHA.ABAS;

  // 1. Aba de Configuração do Sistema (CFG_SISTEMA)
  const cfg = planilha.getSheetByName(abas.CONFIG);
  cfg.clear();
  
  const configValues = [
    ["CHAVE", "VALOR"],
    ["LOGO_ID", CFG.LOGO_ID],
    ["MARGEM_SEGURANCA", CFG.CALCULO.MARGEM_SEGURANCA],
    ["APP_NOME", CFG.APP.NOME],
    ["VERSAO", CFG.APP.VERSAO],
    ["WHATSAPP_MSG", CFG.WHATSAPP.MENSAGEM_PADRAO],
    ["EMPRESA_NOME", CFG.EMPRESA.NOME],
    ["RESPONSAVEL_TECNICO", CFG.EMPRESA.RESPONSAVEL_TECNICO],
    ["TIPO_EQUIPAMENTO_1", CFG.TIPOS_EQUIPAMENTO.AUTOCLAVE_VAPOR],
    ["TIPO_EQUIPAMENTO_2", CFG.TIPOS_EQUIPAMENTO.AUTOCLAVE_PEROXIDO],
    ["TIPO_EQUIPAMENTO_3", CFG.TIPOS_EQUIPAMENTO.LAVADORA_ULTR_BRASMEDICAL],
    ["TIPO_EQUIPAMENTO_4", CFG.TIPOS_EQUIPAMENTO.LAVADORA_ULTR_SANDERS],
    ["TIPO_EQUIPAMENTO_5", CFG.TIPOS_EQUIPAMENTO.LAVADORA_ULTR_OUTROS],
    ["TIPO_EQUIPAMENTO_6", CFG.TIPOS_EQUIPAMENTO.TERMODESINFECTORA],
    ["TEXTO_QI", CFG.TEXTOS.QI],
    ["TEXTO_QO", CFG.TEXTOS.QO],
    ["TEXTO_QD", CFG.TEXTOS.QD],
    ["TEXTO_ERU", CFG.TEXTOS.ERU]
  ];
  
  // Adiciona a observação técnica de lavadoras se existir no CFG
  if (CFG.TEXTOS.LAVA_ULTR_OBS) {
    configValues.push(["TEXTO_LAVA_OBS", CFG.TEXTOS.LAVA_ULTR_OBS]);
  }

  cfg.getRange(1, 1, configValues.length, 2).setValues(configValues);

  // 2. Aba de Clientes (CAD_CLIENTES)
  const clientes = planilha.getSheetByName(abas.CLIENTES);
  clientes.clear();
  clientes.getRange(1, 1, 1, 7).setValues([[
    "ID", "CNPJ", "RAZAO_SOCIAL", "LOGRADOURO", "BAIRRO", "CIDADE", "UF"
  ]]);

  // 3. Aba de Equipamentos (CAD_EQUIPAMENTOS)
  const equipamentos = planilha.getSheetByName(abas.EQUIPAMENTOS);
  equipamentos.clear();
  equipamentos.getRange(1, 1, 1, 9).setValues([[
    "ID", "TIPO", "MARCA", "MODELO", "SERIE", "VOLUME", "BOMBA_VACUO", "TIPO_PROCESSO", "OBS"
  ]]);

  // 4. Aba de Receitas/Ciclos (CAD_RECEITAS)
  const receitas = planilha.getSheetByName(abas.RECEITAS);
  receitas.clear();
  receitas.getRange(1, 1, 1, 4).setValues([[
    "ID", "TIPO", "NOME", "ATIVO"
  ]]);

  const receitasPadrao = (CFG.RECEITAS_PADRAO || []).map(nome => [
    gerarId_(), "PADRAO", nome, "SIM"
  ]);

  if (receitasPadrao.length > 0) {
    receitas.getRange(2, 1, receitasPadrao.length, 4).setValues(receitasPadrao);
  }

  // 5. Aba de Movimentação de Planejamentos (MOV_PLANEJAMENTOS)
  const planejamentos = planilha.getSheetByName(abas.PLANEJAMENTOS);
  planejamentos.clear();
  planejamentos.getRange(1, 1, 1, 14).setValues([[
    "ID",
    "DATA",
    "CLIENTE",
    "CNPJ",
    "EQUIPAMENTO",
    "TIPO_PROCESSO",
    "VOLUME",
    "QI",
    "QO",
    "QD",
    "BOWIE_DICK",
    "PRIONS/LAVAGEM",
    "RESULTADO_JSON",
    "OBS"
  ]]);

  // 6. Aba de Documentos Gerados (MOV_DOCUMENTOS)
  const documentos = planilha.getSheetByName(abas.DOCUMENTOS);
  documentos.clear();
  documentos.getRange(1, 1, 1, 7).setValues([[
    "ID",
    "DATA",
    "CLIENTE",
    "TIPO_DOCUMENTO",
    "NOME_ARQUIVO",
    "URL",
    "PLANEJAMENTO_ID"
  ]]);

  aplicarEstiloCabecalho_(cfg);
  aplicarEstiloCabecalho_(clientes);
  aplicarEstiloCabecalho_(equipamentos);
  aplicarEstiloCabecalho_(receitas);
  aplicarEstiloCabecalho_(planejamentos);
  aplicarEstiloCabecalho_(documentos);
}

function aplicarEstiloCabecalho_(aba) {
  const ultimaColuna = aba.getLastColumn();
  if (!ultimaColuna) return;

  aba.getRange(1, 1, 1, ultimaColuna)
    .setFontWeight("bold")
    .setBackground("#d9ead3");

  aba.setFrozenRows(1);
  aba.autoResizeColumns(1, ultimaColuna);
}

function gerarId_() {
  return Utilities.getUuid();
}