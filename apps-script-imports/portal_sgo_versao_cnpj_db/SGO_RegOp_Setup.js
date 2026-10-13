function RegOp_setupModulo() {
  const props = PropertiesService.getScriptProperties();

  let planilha;
  const dbExistente = props.getProperty("REGOP_DB_ID");

  if (!dbExistente) {
    planilha = SpreadsheetApp.create(REGOP_CFG.PLANILHA.NOME);
    props.setProperty("REGOP_DB_ID", planilha.getId());

    const abas = REGOP_CFG.PLANILHA.ABAS;
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
    RegOp_garantirAbas_(planilha);
  }

  RegOp_inicializarAbas_(planilha);

  const pastaRaizId = props.getProperty("REGOP_PASTA_RAIZ_ID");
  const pastaPdfId = props.getProperty("REGOP_PASTA_PDF_ID");

  if (!pastaRaizId || !pastaPdfId) {
    const pastaRaiz = DriveApp.createFolder(REGOP_CFG.DRIVE.PASTA_RAIZ);
    const pastaPdf = pastaRaiz.createFolder(REGOP_CFG.DRIVE.PASTA_PDFS);

    props.setProperty("REGOP_PASTA_RAIZ_ID", pastaRaiz.getId());
    props.setProperty("REGOP_PASTA_PDF_ID", pastaPdf.getId());
  }

  props.setProperty("REGOP_LOGO_ID", REGOP_CFG.LOGO_ID);
  props.setProperty("REGOP_APP_NOME", REGOP_CFG.APP.NOME);
  props.setProperty("REGOP_APP_VERSAO", REGOP_CFG.APP.VERSAO);
  props.setProperty("REGOP_EMPRESA_NOME", REGOP_CFG.EMPRESA.NOME);

  return {
    ok: true,
    mensagem: "Setup Registros Operacionais V1.0 concluído com sucesso.",
    dbId: props.getProperty("REGOP_DB_ID"),
    pastaPdfId: props.getProperty("REGOP_PASTA_PDF_ID")
  };
}

function RegOp_garantirAbas_(planilha) {
  const abas = REGOP_CFG.PLANILHA.ABAS;

  Object.values(abas).forEach(nome => {
    let aba = planilha.getSheetByName(nome);
    if (!aba) {
      planilha.insertSheet(nome);
    }
  });
}

/**
 * Garante que uma aba tenha (pelo menos) o cabeçalho esperado, SEM
 * apagar linhas de dados já existentes. Aba vazia: escreve o
 * cabeçalho completo. Aba já populada: só ACRESCENTA as colunas que
 * faltam no fim (migração aditiva) — nunca faz .clear() numa aba com
 * dados reais. Ver [[project_registros_operacionais_modulo]] (v3,
 * 2026-08-15) — corrige um `.clear()` incondicional que existia antes
 * aqui e que apagaria tipos/registros reais numa re-execução.
 */
function RegOp_garantirColunas_(aba, headerEsperado) {
  const ultimaLinha = aba.getLastRow();
  if (ultimaLinha === 0) {
    aba.getRange(1, 1, 1, headerEsperado.length).setValues([headerEsperado]);
    RegOp_aplicarEstiloCabecalho_(aba);
    return;
  }
  const larguraAtual = aba.getLastColumn();
  const headerAtual = larguraAtual > 0 ? aba.getRange(1, 1, 1, larguraAtual).getValues()[0] : [];
  if (headerEsperado.length > headerAtual.length) {
    const colunasNovas = headerEsperado.slice(headerAtual.length);
    aba.getRange(1, headerAtual.length + 1, 1, colunasNovas.length).setValues([colunasNovas]);
  }
  RegOp_aplicarEstiloCabecalho_(aba);
}

function RegOp_inicializarAbas_(planilha) {
  const abas = REGOP_CFG.PLANILHA.ABAS;

  // 1. Configuração do sistema
  const cfg = planilha.getSheetByName(abas.CONFIG);
  RegOp_garantirColunas_(cfg, ["CHAVE", "VALOR"]);
  if (cfg.getLastRow() <= 1) {
    cfg.getRange(2, 1, 4, 2).setValues([
      ["REGOP_LOGO_ID", REGOP_CFG.LOGO_ID],
      ["REGOP_APP_NOME", REGOP_CFG.APP.NOME],
      ["VERSAO", REGOP_CFG.APP.VERSAO],
      ["REGOP_EMPRESA_NOME", REGOP_CFG.EMPRESA.NOME]
    ]);
  }

  // 2. Tipos de documento — 1 linha por tipo de documento CRIADO
  //    LIVREMENTE pelo gestor (não travado 1:1 com um POP — um tipo
  //    pode não ter POP nenhum, ter vários, e um POP pode ter vários
  //    tipos). GLOBAL — não por hospital, reaproveitado por todos.
  //    ABRE_PENDENCIA/TIPO_FECHAMENTO_ID (v3, 2026-08-15): quando este
  //    tipo, ao ser preenchido, deixa uma pendência em aberto até um
  //    outro tipo (o de fechamento) ser preenchido depois.
  const tiposDocumento = planilha.getSheetByName(abas.TIPOS_DOCUMENTO);
  RegOp_garantirColunas_(tiposDocumento, [
    "ID", "NOME", "POPS_RELACIONADOS_JSON", "CAMPOS_JSON",
    "ASSINATURAS_JSON", "CRIADO_EM", "REVISADO_POR",
    "ABRE_PENDENCIA", "TIPO_FECHAMENTO_ID"
  ]);

  // 3. Registros preenchidos (1 linha por preenchimento real).
  //    STATUS_PENDENCIA/REGISTRO_ORIGEM_ID (v3, 2026-08-15): rastreiam
  //    documentos "em aberto" (ex.: Saída de Equipamento) até o
  //    documento de fechamento (ex.: Retorno) ser gerado.
  const registros = planilha.getSheetByName(abas.REGISTROS);
  RegOp_garantirColunas_(registros, [
    "ID", "DATA", "HOSPITAL", "CNPJ", "TIPO_DOCUMENTO_ID", "TIPO_DOCUMENTO_NOME",
    "RESPOSTAS_JSON", "ASSINATURAS_JSON",
    "OBSERVACOES_GERAIS", "IMAGENS_JSON", "PDF_URL",
    "STATUS_PENDENCIA", "REGISTRO_ORIGEM_ID"
  ]);

  // 4. Documentos gerados (auditoria de PDF salvo — mesmo padrão do PgtPop).
  const documentos = planilha.getSheetByName(abas.DOCUMENTOS);
  RegOp_garantirColunas_(documentos, [
    "ID", "DATA", "HOSPITAL", "CNPJ", "NOME_ARQUIVO", "URL", "REGISTRO_ID"
  ]);
}

function RegOp_aplicarEstiloCabecalho_(aba) {
  const ultimaColuna = aba.getLastColumn();
  if (!ultimaColuna) return;

  aba.getRange(1, 1, 1, ultimaColuna)
    .setFontWeight("bold")
    .setBackground("#d9ead3");

  aba.setFrozenRows(1);
  aba.autoResizeColumns(1, ultimaColuna);
}

function RegOp_gerarId_() {
  return Utilities.getUuid();
}
