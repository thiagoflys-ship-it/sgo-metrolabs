function PgtPop_setupModulo() {
  const props = PropertiesService.getScriptProperties();

  let planilha;
  const dbExistente = props.getProperty("PGTPOP_DB_ID");

  if (!dbExistente) {
    planilha = SpreadsheetApp.create(PGTPOP_CFG.PLANILHA.NOME);
    props.setProperty("PGTPOP_DB_ID", planilha.getId());

    const abas = PGTPOP_CFG.PLANILHA.ABAS;
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
    PgtPop_garantirAbas_(planilha);
  }

  PgtPop_inicializarAbas_(planilha);

  const pastaRaizId = props.getProperty("PGTPOP_PASTA_RAIZ_ID");
  const pastaPdfId = props.getProperty("PGTPOP_PASTA_PDF_ID");

  if (!pastaRaizId || !pastaPdfId) {
    // (2026-10-16) Reaproveita a pasta já existente (pelo ID salvo ou pelo
    // nome) — antes criava outra raiz sempre que faltava uma das duas
    // propriedades, e os PDFs antigos sumiam da consulta por CNPJ.
    const pastaRaiz = PgtPop_pastaExistenteOuNova_(null, PGTPOP_CFG.DRIVE.PASTA_RAIZ, pastaRaizId);
    const pastaPdf = PgtPop_pastaExistenteOuNova_(pastaRaiz, PGTPOP_CFG.DRIVE.PASTA_PDFS, pastaPdfId);

    props.setProperty("PGTPOP_PASTA_RAIZ_ID", pastaRaiz.getId());
    props.setProperty("PGTPOP_PASTA_PDF_ID", pastaPdf.getId());
  }

  props.setProperty("PGTPOP_LOGO_ID", PGTPOP_CFG.LOGO_ID);
  props.setProperty("PGTPOP_APP_NOME", PGTPOP_CFG.APP.NOME);
  props.setProperty("PGTPOP_APP_VERSAO", PGTPOP_CFG.APP.VERSAO);
  props.setProperty("PGTPOP_EMPRESA_NOME", PGTPOP_CFG.EMPRESA.NOME);
  props.setProperty("PGTPOP_WHATSAPP_MSG", PGTPOP_CFG.WHATSAPP.MENSAGEM_PADRAO);

  return {
    ok: true,
    mensagem: "Setup PGT e POP - Engenharia Clínica V2.0 concluído com sucesso.",
    dbId: props.getProperty("PGTPOP_DB_ID"),
    pastaPdfId: props.getProperty("PGTPOP_PASTA_PDF_ID")
  };
}

function PgtPop_garantirAbas_(planilha) {
  const abas = PGTPOP_CFG.PLANILHA.ABAS;

  Object.values(abas).forEach(nome => {
    let aba = planilha.getSheetByName(nome);
    if (!aba) {
      planilha.insertSheet(nome);
    }
  });
}

function PgtPop_inicializarAbas_(planilha) {
  const abas = PGTPOP_CFG.PLANILHA.ABAS;

  // 1. Aba de Configuração do Sistema (CFG_SISTEMA)
  const cfg = planilha.getSheetByName(abas.CONFIG);
  cfg.clear();

  const configValues = [
    ["CHAVE", "VALOR"],
    ["PGTPOP_LOGO_ID", PGTPOP_CFG.LOGO_ID],
    ["PGTPOP_APP_NOME", PGTPOP_CFG.APP.NOME],
    ["VERSAO", PGTPOP_CFG.APP.VERSAO],
    ["PGTPOP_WHATSAPP_MSG", PGTPOP_CFG.WHATSAPP.MENSAGEM_PADRAO],
    ["PGTPOP_EMPRESA_NOME", PGTPOP_CFG.EMPRESA.NOME],
    ["PGTPOP_BASE_NORMATIVA", PGTPOP_CFG.BASE_NORMATIVA]
  ];

  cfg.getRange(1, 1, configValues.length, 2).setValues(configValues);

  // 2. Aba de Clientes (CAD_CLIENTES) — cache de CNPJ
  const clientes = planilha.getSheetByName(abas.CLIENTES);
  if (PgtPop_abaVazia_(clientes)) clientes.getRange(1, 1, 1, 7).setValues([[
    "ID", "CNPJ", "RAZAO_SOCIAL", "LOGRADOURO", "BAIRRO", "CIDADE", "UF"
  ]]);

  // 3. Aba de PGTs gerados (MOV_PGT) — colunas de controle de versão/
  //    revisão (v2, 2026-08-13) + CNPJ/HOSPITAL_JSON/ELABORADO_POR_NOME
  //    (v3, 2026-08-13) pra suportar "consultar documentos existentes
  //    por CNPJ" sem precisar gerar tudo de novo. ELABORADO_POR_CARGO/
  //    REGISTRO (v6, 2026-08-13) — antes cargo/registro eram sempre
  //    fixos mesmo com nome editável, o que atribuía o registro
  //    profissional (REA-GO) de uma pessoa a documentos assinados por
  //    outra; agora ambos ficam gravados junto com o nome.
  const pgts = planilha.getSheetByName(abas.PGT);
  if (PgtPop_abaVazia_(pgts)) pgts.getRange(1, 1, 1, 14).setValues([[
    "ID", "DATA", "HOSPITAL", "CNPJ", "CODIGO_DOCUMENTO", "VERSAO_ATUAL",
    "ROTEIRO", "ELABORADO_POR_NOME", "TEXTO_GERADO_JSON", "HISTORICO_REVISOES_JSON",
    "HOSPITAL_JSON", "OBS", "ELABORADO_POR_CARGO", "ELABORADO_POR_REGISTRO"
  ]]);

  // 4. Aba de POPs gerados (MOV_POPS) — idem
  const pops = planilha.getSheetByName(abas.POPS);
  if (PgtPop_abaVazia_(pops)) pops.getRange(1, 1, 1, 15).setValues([[
    "ID", "DATA", "HOSPITAL", "CNPJ", "PGT_ID", "CODIGO_DOCUMENTO", "NOME_POP",
    "VERSAO_ATUAL", "ROTEIRO", "ELABORADO_POR_NOME", "TEXTO_GERADO_JSON",
    "HISTORICO_REVISOES_JSON", "HOSPITAL_JSON", "ELABORADO_POR_CARGO", "ELABORADO_POR_REGISTRO"
  ]]);

  // 5. Aba de Documentos Gerados (MOV_DOCUMENTOS) — CNPJ (v14, 2026-08-14)
  //    é a chave real da pasta do Drive agora (ver PgtPop_obterPastaPorCnpj_
  //    em SGO_PgtPop_Main.js), não mais o nome do hospital.
  const documentos = planilha.getSheetByName(abas.DOCUMENTOS);
  if (PgtPop_abaVazia_(documentos)) documentos.getRange(1, 1, 1, 8).setValues([[
    "ID", "DATA", "HOSPITAL", "CNPJ", "TIPO_DOCUMENTO", "NOME_ARQUIVO", "URL", "REGISTRO_ID"
  ]]);

  PgtPop_aplicarEstiloCabecalho_(cfg);
  PgtPop_aplicarEstiloCabecalho_(clientes);
  PgtPop_aplicarEstiloCabecalho_(pgts);
  PgtPop_aplicarEstiloCabecalho_(pops);
  PgtPop_aplicarEstiloCabecalho_(documentos);
}

/**
 * (2026-10-16) As abas de dados (CAD_CLIENTES, MOV_PGT, MOV_POPS,
 * MOV_DOCUMENTOS) só recebem cabeçalho quando estão vazias. Antes o setup
 * fazia clear() nelas sempre que rodava com a planilha já existente — e ele
 * roda sozinho quando falta só a propriedade da pasta de PDFs
 * (PgtPop_obterPastaPorCnpj_), o que apagaria todo o histórico de PGT/POP.
 */
/** Pasta pelo ID salvo; senão a primeira com esse nome (dentro de `pai`, ou no Drive); senão cria. */
function PgtPop_pastaExistenteOuNova_(pai, nome, idSalvo) {
  if (idSalvo) {
    try { return DriveApp.getFolderById(idSalvo); } catch (e) { /* ID inválido: procura pelo nome */ }
  }
  const it = pai ? pai.getFoldersByName(nome) : DriveApp.getFoldersByName(nome);
  if (it.hasNext()) return it.next();
  return pai ? pai.createFolder(nome) : DriveApp.createFolder(nome);
}

function PgtPop_abaVazia_(aba) {
  return !aba || aba.getLastRow() === 0;
}

function PgtPop_aplicarEstiloCabecalho_(aba) {
  const ultimaColuna = aba.getLastColumn();
  if (!ultimaColuna) return;

  aba.getRange(1, 1, 1, ultimaColuna)
    .setFontWeight("bold")
    .setBackground("#d9ead3");

  aba.setFrozenRows(1);
  aba.autoResizeColumns(1, ultimaColuna);
}

function PgtPop_gerarId_() {
  return Utilities.getUuid();
}
