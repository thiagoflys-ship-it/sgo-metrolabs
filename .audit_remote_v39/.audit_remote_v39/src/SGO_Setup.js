function setupSGO() {
  return setupSGOSeguro();
}

function setupSGOSeguro() {
  const log = [];
  const ss = garantirBancoPrincipalSeguro_(log);

  criarEstruturaPrincipalSegura_(ss, log);

  if (typeof setupSGOv2 === "function") {
    const resV2 = setupSGOv2();
    log.push("SETUP_V2: " + (resV2 && resV2.ok ? "executado com sucesso" : "executado"));
  }

  if (typeof SGO_DATA !== "undefined" && SGO_DATA.clearCache) {
    SGO_DATA.clearCache();
  }

  log.forEach(function(item) {
    Logger.log(item);
  });

  return {
    ok: true,
    seguro: true,
    dbId: ss.getId(),
    url: ss.getUrl(),
    log: log
  };
}

function criarNovasAbas() {
  return setupSGOSeguro();
}

function garantirBancoPrincipalSeguro_(log) {
  const dbId = SGO_CFG.DB_ID;

  if (dbId) {
    try {
      const ss = SpreadsheetApp.openById(dbId);
      log.push("DB_ID: banco principal existente localizado. Nenhum dado sera apagado.");
      return ss;
    } catch (e) {
      log.push("DB_ID: ID existente invalido, criando novo banco principal.");
    }
  }

  const ssNovo = SpreadsheetApp.create(SGO_CFG.SISTEMA.NOME_EXIBICAO + "_DB");
  SGO_CFG.DB_ID = ssNovo.getId();
  log.push("DB_ID: novo banco principal criado e salvo.");
  return ssNovo;
}

function criarEstruturaPrincipalSegura_(ss, log) {
  garantirAbaSetupSeguro_(ss, SGO_CFG.SHEETS.CFG_SISTEMA, [
    "CHAVE", "VALOR"
  ], log);

  garantirCfgSistemaSeguro_(ss.getSheetByName(SGO_CFG.SHEETS.CFG_SISTEMA), ss, log);

  garantirAbaSetupSeguro_(ss, SGO_CFG.SHEETS.CAD_USUARIOS, [
    "ID", "USUARIO", "SENHA", "NOME", "PERFIL", "STATUS", "CRIADO_EM", "CLIENTE_ID"
  ], log);
  garantirUsuarioAdminSeguro_(ss.getSheetByName(SGO_CFG.SHEETS.CAD_USUARIOS), log);

  garantirAbaSetupSeguro_(ss, SGO_CFG.SHEETS.CAD_CLIENTES, [
    "ID", "RAZAO_SOCIAL", "NOME_FANTASIA", "CNPJ", "ENDERECO", "CONTATO", "EMAIL", "TELEFONE", "STATUS", "CRIADO_EM"
  ], log);

  garantirAbaSetupSeguro_(ss, SGO_CFG.SHEETS.CAD_UNIDADES, [
    "ID", "CLIENTE_ID", "NOME_UNIDADE", "CNPJ_UNIDADE", "ENDERECO", "CIDADE", "UF", "RESPONSAVEL", "TELEFONE", "STATUS", "CRIADO_EM"
  ], log);

  garantirAbaSetupSeguro_(ss, SGO_CFG.SHEETS.CAD_EQUIPAMENTOS, [
    "ID", "CLIENTE_ID", "UNIDADE_ID", "TIPO", "FABRICANTE", "MODELO", "SERIE", "TAG", "SETOR",
    "TIPO_POSSE", "PROPRIETARIO", "CLASSE_ANVISA", "NUMERO_ANVISA", "RISCO", "VIDA_UTIL",
    "DATA_AQUISICAO", "PERIODICIDADE_MANUTENCAO", "APLICA_CALIBRACAO", "APLICA_QUALIFICACAO",
    "APLICA_ENSAIO_ELETRICO", "APLICA_MANUTENCAO_PREV", "QR_TOKEN", "QRCODE_LINK", "STATUS", "CRIADO_EM"
  ], log);

  garantirAbaSetupSeguro_(ss, SGO_CFG.SHEETS.REG_TECNICO, [
    "ID", "EQUIPAMENTO_ID", "CLIENTE_ID", "UNIDADE_ID", "TIPO_SERVICO", "DATA_REALIZADO",
    "DATA_VALIDADE", "NUMERO_CERTIFICADO", "EMPRESA_RESPONSAVEL", "TECNICO", "RESULTADO",
    "OBSERVACOES", "LINK_DOCUMENTO", "STATUS", "CRIADO_EM"
  ], log);

  garantirAbaSetupSeguro_(ss, SGO_CFG.SHEETS.DOC_DOCUMENTOS, [
    "ID", "CLIENTE_ID", "UNIDADE_ID", "EQUIPAMENTO_ID", "TIPO_DOCUMENTO", "NOME_ARQUIVO",
    "LINK_ARQUIVO", "DATA_EMISSAO", "DATA_VENCIMENTO", "STATUS", "CRIADO_EM"
  ], log);

  garantirAbaSetupSeguro_(ss, SGO_CFG.SHEETS.SYS_ALERTAS, [
    "ID", "TIPO", "REFERENCIA_ID", "DESCRICAO", "DATA_LIMITE", "STATUS", "CRIADO_EM"
  ], log);

  garantirAbaSetupSeguro_(ss, SGO_CFG.SHEETS.SYS_LOGS, [
    "ID", "DATA_HORA", "USUARIO", "ACAO", "MODULO", "DETALHES"
  ], log);
}

function garantirAbaSetupSeguro_(ss, nomeAba, cabecalhos, log) {
  let sheet = ss.getSheetByName(nomeAba);

  if (!sheet) {
    const sheets = ss.getSheets();
    if (sheets.length === 1 && sheets[0].getLastRow() === 0 && sheets[0].getLastColumn() === 0) {
      sheet = sheets[0];
      sheet.setName(nomeAba);
    } else {
      sheet = ss.insertSheet(nomeAba);
    }
    sheet.appendRow(cabecalhos);
    formatarCabecalhoSetupSeguro_(sheet, cabecalhos.length);
    log.push(nomeAba + ": criada com cabecalho. Dados existentes: nenhum.");
    return sheet;
  }

  if (sheet.getLastRow() === 0 || sheet.getLastColumn() === 0) {
    sheet.appendRow(cabecalhos);
    formatarCabecalhoSetupSeguro_(sheet, cabecalhos.length);
    log.push(nomeAba + ": cabecalho criado em aba vazia.");
    return sheet;
  }

  const atuais = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(function(h) {
    return SGO_UTILS.safe(h);
  });

  const faltantes = cabecalhos.filter(function(h) {
    return atuais.indexOf(h) < 0;
  });

  if (faltantes.length > 0) {
    sheet.getRange(1, atuais.length + 1, 1, faltantes.length).setValues([faltantes]);
    formatarCabecalhoSetupSeguro_(sheet, atuais.length + faltantes.length);
    log.push(nomeAba + ": " + faltantes.length + " coluna(s) adicionada(s). Dados preservados.");
  } else {
    formatarCabecalhoSetupSeguro_(sheet, atuais.length);
    log.push(nomeAba + ": ja existe e foi preservada.");
  }

  return sheet;
}

function garantirCfgSistemaSeguro_(sheet, ss, log) {
  if (!sheet) return;

  const existentes = {};
  const lastRow = sheet.getLastRow();
  if (lastRow >= 2) {
    const dados = sheet.getRange(2, 1, lastRow - 1, Math.max(2, sheet.getLastColumn())).getValues();
    dados.forEach(function(row) {
      const chave = SGO_UTILS.safe(row[0]);
      if (chave) existentes[chave] = true;
    });
  }

  const defaults = [
    ["APP_NAME", SGO_CFG.APP_NAME],
    ["VERSION", SGO_CFG.VERSION],
    ["DB_ID", ss.getId()],
    ["CRIADO_EM", SGO_UTILS.nowIso()],
    ["LOGO_URL", SGO_CFG.LOGO_URL],
    ["OCIOSIDADE_SEGUNDOS", SGO_CFG.OCIOSIDADE.TEMPO_LIMITE_SEGUNDOS],
    ["OCIOSIDADE_SOM_PADRAO", SGO_CFG.OCIOSIDADE.SOM_ATIVO_PADRAO],
    ["ALERTA_VISUAL_OCIOSIDADE", SGO_CFG.OCIOSIDADE.ALERTA_VISUAL],
    ["ALERTA_DIAS_PADRAO", SGO_CFG.ALERTAS.DIAS_ANTECEDENCIA_PADRAO],
    ["MOSTRAR_ALERTAS_DASHBOARD", SGO_CFG.ALERTAS.MOSTRAR_NO_DASHBOARD],
    ["MODO_DEBUG", SGO_CFG.SISTEMA.MODO_DEBUG],
    ["NOME_EXIBICAO", SGO_CFG.SISTEMA.NOME_EXIBICAO]
  ];

  defaults.forEach(function(row) {
    if (!existentes[row[0]]) {
      sheet.appendRow(row);
      log.push("CFG_SISTEMA: chave adicionada " + row[0]);
    }
  });
}

function garantirUsuarioAdminSeguro_(sheet, log) {
  if (!sheet) return;
  if (sheet.getLastRow() > 1) {
    log.push("CAD_USUARIOS: usuarios existentes preservados. Admin padrao nao foi recriado.");
    return;
  }

  sheet.appendRow([
    SGO_UTILS.uuid(),
    "admin",
    "123456",
    "Administrador",
    "ADMIN",
    SGO_CFG.STATUS.ATIVO,
    SGO_UTILS.nowIso(),
    ""
  ]);
  log.push("CAD_USUARIOS: admin padrao criado porque a aba estava vazia.");
}

function formatarCabecalhoSetupSeguro_(sheet, totalColunas) {
  const qtd = Math.max(1, totalColunas || sheet.getLastColumn());
  sheet.getRange(1, 1, 1, qtd).setFontWeight("bold").setBackground("#f3f3f3");
  sheet.setFrozenRows(1);
}
