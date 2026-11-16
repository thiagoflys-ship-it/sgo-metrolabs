function PlanCME_setupModulo() {
  const props = PropertiesService.getScriptProperties();

  let planilha;
  const dbExistente = props.getProperty("PLANCME_DB_ID");

  if (!dbExistente) {
    planilha = SpreadsheetApp.create(PLANCME_CFG.PLANILHA.NOME);
    props.setProperty("PLANCME_DB_ID", planilha.getId());

    const abas = PLANCME_CFG.PLANILHA.ABAS;
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
    PlanCME_garantirAbas_(planilha);
  }

  PlanCME_inicializarAbas_(planilha);

  const pastaRaizId = props.getProperty("PLANCME_PASTA_RAIZ_ID");
  const pastaPdfId = props.getProperty("PLANCME_PASTA_PDF_ID");
  const pastaJustificativasId = props.getProperty("PLANCME_PASTA_JUSTIFICATIVAS_ID");

  if (!pastaRaizId || !pastaPdfId || !pastaJustificativasId) {
    // (2026-10-16) Reaproveita as pastas já existentes (ID salvo ou nome) —
    // antes criava outra raiz sempre que faltava uma das três propriedades.
    const pastaRaiz = PlanCME_pastaExistenteOuNova_(null, PLANCME_CFG.DRIVE.PASTA_RAIZ, pastaRaizId);
    const pastaPdf = PlanCME_pastaExistenteOuNova_(pastaRaiz, PLANCME_CFG.DRIVE.PASTA_PDFS, pastaPdfId);
    const pastaJustificativas = PlanCME_pastaExistenteOuNova_(pastaRaiz, PLANCME_CFG.DRIVE.PASTA_JUSTIFICATIVAS, pastaJustificativasId);

    props.setProperty("PLANCME_PASTA_RAIZ_ID", pastaRaiz.getId());
    props.setProperty("PLANCME_PASTA_PDF_ID", pastaPdf.getId());
    props.setProperty("PLANCME_PASTA_JUSTIFICATIVAS_ID", pastaJustificativas.getId());
  }

  // Definição de Propriedades Gerais
  props.setProperty("PLANCME_LOGO_ID", PLANCME_CFG.LOGO_ID);
  props.setProperty("PLANCME_APP_NOME", PLANCME_CFG.APP.NOME);
  props.setProperty("PLANCME_APP_VERSAO", PLANCME_CFG.APP.VERSAO);
  props.setProperty("PLANCME_EMPRESA_NOME", PLANCME_CFG.EMPRESA.NOME);
  props.setProperty("PLANCME_RESPONSAVEL_TECNICO", PLANCME_CFG.EMPRESA.RESPONSAVEL_TECNICO);
  props.setProperty("PLANCME_MARGEM_SEGURANCA", String(PLANCME_CFG.CALCULO.MARGEM_SEGURANCA));
  props.setProperty("PLANCME_WHATSAPP_MSG", PLANCME_CFG.WHATSAPP.MENSAGEM_PADRAO);

  // Definição de Textos Técnicos Enriquecidos
  props.setProperty("PLANCME_TEXTO_QI", PLANCME_CFG.TEXTOS.QI);
  props.setProperty("PLANCME_TEXTO_QO", PLANCME_CFG.TEXTOS.QO);
  props.setProperty("PLANCME_TEXTO_QD", PLANCME_CFG.TEXTOS.QD);
  props.setProperty("PLANCME_TEXTO_ERU", PLANCME_CFG.TEXTOS.ERU);
  
  // Nova Propriedade para Observação Técnica de Lavadoras
  if (PLANCME_CFG.TEXTOS.LAVA_ULTR_OBS) {
    props.setProperty("PLANCME_TEXTO_LAVA_OBS", PLANCME_CFG.TEXTOS.LAVA_ULTR_OBS);
  }

  return {
    ok: true,
    mensagem: "Setup Metrolabs CME V3.0 concluído com sucesso.",
    dbId: props.getProperty("PLANCME_DB_ID"),
    pastaPdfId: props.getProperty("PLANCME_PASTA_PDF_ID"),
    pastaJustificativasId: props.getProperty("PLANCME_PASTA_JUSTIFICATIVAS_ID")
  };
}

function PlanCME_garantirAbas_(planilha) {
  const abas = PLANCME_CFG.PLANILHA.ABAS;

  Object.values(abas).forEach(nome => {
    let aba = planilha.getSheetByName(nome);
    if (!aba) {
      planilha.insertSheet(nome);
    }
  });
}

function PlanCME_inicializarAbas_(planilha) {
  const abas = PLANCME_CFG.PLANILHA.ABAS;

  // 1. Aba de Configuração do Sistema (CFG_SISTEMA)
  const cfg = planilha.getSheetByName(abas.CONFIG);
  cfg.clear();
  
  const configValues = [
    ["CHAVE", "VALOR"],
    ["PLANCME_LOGO_ID", PLANCME_CFG.LOGO_ID],
    ["PLANCME_MARGEM_SEGURANCA", PLANCME_CFG.CALCULO.MARGEM_SEGURANCA],
    ["PLANCME_APP_NOME", PLANCME_CFG.APP.NOME],
    ["VERSAO", PLANCME_CFG.APP.VERSAO],
    ["PLANCME_WHATSAPP_MSG", PLANCME_CFG.WHATSAPP.MENSAGEM_PADRAO],
    ["PLANCME_EMPRESA_NOME", PLANCME_CFG.EMPRESA.NOME],
    ["PLANCME_RESPONSAVEL_TECNICO", PLANCME_CFG.EMPRESA.RESPONSAVEL_TECNICO],
    ["TIPO_EQUIPAMENTO_1", PLANCME_CFG.TIPOS_EQUIPAMENTO.AUTOCLAVE_VAPOR],
    ["TIPO_EQUIPAMENTO_2", PLANCME_CFG.TIPOS_EQUIPAMENTO.AUTOCLAVE_PEROXIDO],
    ["TIPO_EQUIPAMENTO_3", PLANCME_CFG.TIPOS_EQUIPAMENTO.LAVADORA_ULTR],
    ["TIPO_EQUIPAMENTO_4", PLANCME_CFG.TIPOS_EQUIPAMENTO.AUTOCLAVE_FORMALDEIDO],
    ["TIPO_EQUIPAMENTO_5", PLANCME_CFG.TIPOS_EQUIPAMENTO.AUTOCLAVE_ETO],
    ["TIPO_EQUIPAMENTO_6", PLANCME_CFG.TIPOS_EQUIPAMENTO.TERMODESINFECTORA],
    ["PLANCME_TEXTO_QI", PLANCME_CFG.TEXTOS.QI],
    ["PLANCME_TEXTO_QO", PLANCME_CFG.TEXTOS.QO],
    ["PLANCME_TEXTO_QD", PLANCME_CFG.TEXTOS.QD],
    ["PLANCME_TEXTO_ERU", PLANCME_CFG.TEXTOS.ERU]
  ];
  
  // Adiciona a observação técnica de lavadoras se existir no PLANCME_CFG
  if (PLANCME_CFG.TEXTOS.LAVA_ULTR_OBS) {
    configValues.push(["PLANCME_TEXTO_LAVA_OBS", PLANCME_CFG.TEXTOS.LAVA_ULTR_OBS]);
  }

  cfg.getRange(1, 1, configValues.length, 2).setValues(configValues);

  // 2. Aba de Clientes (CAD_CLIENTES)
  const clientes = planilha.getSheetByName(abas.CLIENTES);
  if (PlanCME_abaVazia_(clientes)) clientes.getRange(1, 1, 1, 7).setValues([[
    "ID", "CNPJ", "RAZAO_SOCIAL", "LOGRADOURO", "BAIRRO", "CIDADE", "UF"
  ]]);

  // 3. Aba de Equipamentos (CAD_EQUIPAMENTOS)
  const equipamentos = planilha.getSheetByName(abas.EQUIPAMENTOS);
  if (PlanCME_abaVazia_(equipamentos)) equipamentos.getRange(1, 1, 1, 9).setValues([[
    "ID", "TIPO", "MARCA", "MODELO", "SERIE", "VOLUME", "BOMBA_VACUO", "TIPO_PROCESSO", "OBS"
  ]]);

  // 4. Aba de Receitas/Ciclos (CAD_RECEITAS)
  const receitas = planilha.getSheetByName(abas.RECEITAS);
  const receitasVazia = PlanCME_abaVazia_(receitas);
  if (receitasVazia) receitas.getRange(1, 1, 1, 4).setValues([[
    "ID", "TIPO", "NOME", "ATIVO"
  ]]);

  const receitasPadrao = (PLANCME_CFG.RECEITAS_PADRAO || []).map(nome => [
    PlanCME_gerarId_(), "PADRAO", nome, "SIM"
  ]);

  if (receitasVazia && receitasPadrao.length > 0) {
    receitas.getRange(2, 1, receitasPadrao.length, 4).setValues(receitasPadrao);
  }

  // 5. Aba de Movimentação de Planejamentos (MOV_PLANEJAMENTOS)
  const planejamentos = planilha.getSheetByName(abas.PLANEJAMENTOS);
  if (PlanCME_abaVazia_(planejamentos)) planejamentos.getRange(1, 1, 1, 14).setValues([[
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
  if (PlanCME_abaVazia_(documentos)) documentos.getRange(1, 1, 1, 7).setValues([[
    "ID",
    "DATA",
    "CLIENTE",
    "TIPO_DOCUMENTO",
    "NOME_ARQUIVO",
    "URL",
    "PLANEJAMENTO_ID"
  ]]);

  PlanCME_aplicarEstiloCabecalho_(cfg);
  PlanCME_aplicarEstiloCabecalho_(clientes);
  PlanCME_aplicarEstiloCabecalho_(equipamentos);
  PlanCME_aplicarEstiloCabecalho_(receitas);
  PlanCME_aplicarEstiloCabecalho_(planejamentos);
  PlanCME_aplicarEstiloCabecalho_(documentos);
}

/**
 * (2026-10-16) Abas de dados só recebem cabeçalho/receitas padrão quando
 * estão vazias. Antes o setup fazia clear() nelas sempre — e ele roda sozinho
 * quando falta só a propriedade da pasta de PDFs (PlanCME_apiSalvarDocumento),
 * o que apagaria todos os planejamentos e documentos já registrados.
 */
/** Pasta pelo ID salvo; senão a primeira com esse nome (dentro de `pai`, ou no Drive); senão cria. */
function PlanCME_pastaExistenteOuNova_(pai, nome, idSalvo) {
  if (idSalvo) {
    try { return DriveApp.getFolderById(idSalvo); } catch (e) { /* ID inválido: procura pelo nome */ }
  }
  const it = pai ? pai.getFoldersByName(nome) : DriveApp.getFoldersByName(nome);
  if (it.hasNext()) return it.next();
  return pai ? pai.createFolder(nome) : DriveApp.createFolder(nome);
}

function PlanCME_abaVazia_(aba) {
  return !aba || aba.getLastRow() === 0;
}

function PlanCME_aplicarEstiloCabecalho_(aba) {
  const ultimaColuna = aba.getLastColumn();
  if (!ultimaColuna) return;

  aba.getRange(1, 1, 1, ultimaColuna)
    .setFontWeight("bold")
    .setBackground("#d9ead3");

  aba.setFrozenRows(1);
  aba.autoResizeColumns(1, ultimaColuna);
}

function PlanCME_gerarId_() {
  return Utilities.getUuid();
}