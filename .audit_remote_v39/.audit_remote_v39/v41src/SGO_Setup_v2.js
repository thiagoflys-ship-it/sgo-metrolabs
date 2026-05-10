function setupSGOv2() {
  const log = [];

  const dbPrincipal = garantirBancoSGOv2_("DB_ID", SGO_CFG.SISTEMA.NOME_EXIBICAO + "_DB", log);
  const dbOS = garantirBancoSGOv2_("DB_OS_ID", SGO_CFG.SISTEMA.NOME_EXIBICAO + "_DB_OS", log);
  const dbFrota = garantirBancoSGOv2_("DB_FROTA_ID", SGO_CFG.SISTEMA.NOME_EXIBICAO + "_DB_FROTA", log);
  const dbEstoque = garantirBancoSGOv2_("DB_ESTOQUE_ID", SGO_CFG.SISTEMA.NOME_EXIBICAO + "_DB_ESTOQUE", log);

  criarEstruturaPrincipalV2_(dbPrincipal, log);
  criarEstruturaOSV2_(dbOS, log);
  criarEstruturaFrotaV2_(dbFrota, log);
  criarEstruturaEstoqueV2_(dbEstoque, log);

  if (typeof configurarPastasSGOV2 === "function") {
    const drive = configurarPastasSGOV2();
    log.push("DRIVE: " + (drive.success ? "estrutura v2 verificada" : drive.message));
  }

  if (typeof SGO_DATA !== "undefined" && SGO_DATA.clearCache) {
    SGO_DATA.clearCache();
  }

  log.forEach(function(item) {
    Logger.log(item);
  });

  return {
    ok: true,
    dbId: dbPrincipal.getId(),
    dbOsId: dbOS.getId(),
    dbFrotaId: dbFrota.getId(),
    dbEstoqueId: dbEstoque.getId(),
    log: log
  };
}

function criarNovasAbasV2() {
  return setupSGOv2();
}

function garantirBancoSGOv2_(propName, nomeBanco, log) {
  const props = PropertiesService.getScriptProperties();
  const atual = SGO_UTILS.safe(props.getProperty(propName));

  if (atual) {
    try {
      const ssExistente = SpreadsheetApp.openById(atual);
      log.push(propName + ": banco existente localizado.");
      return ssExistente;
    } catch (e) {
      log.push(propName + ": ID antigo invalido, criando novo banco.");
    }
  }

  const ss = SpreadsheetApp.create(nomeBanco);
  props.setProperty(propName, ss.getId());
  log.push(propName + ": banco criado e salvo (" + ss.getId() + ").");
  return ss;
}

function criarEstruturaPrincipalV2_(ss, log) {
  garantirAbaV2_(ss, SGO_CFG.SHEETS.CAD_TECNICOS, [
    "ID", "USUARIO_ID", "NOME", "CPF", "EMAIL", "TELEFONE",
    "CREA_CRT", "NUMERO_CREA", "UF_CREA", "DATA_VENCIMENTO_CREA",
    "CNH", "CATEGORIA_CNH", "VENCIMENTO_CNH",
    "ESPECIALIDADES",
    "CUSTO_HORA", "DISPONIBILIDADE",
    "DATA_ADMISSAO", "ENDERECO", "CIDADE", "UF",
    "OBSERVACOES", "STATUS", "CRIADO_EM"
  ], log);

  garantirAbaV2_(ss, SGO_CFG.SHEETS.CAD_PECAS, [
    "ID", "EQUIPAMENTO_ID", "CLIENTE_ID", "UNIDADE_ID", "NOME", "TIPO_PECA",
    "FABRICANTE", "MODELO", "REFERENCIA", "NUMERO_SERIE", "LOTE",
    "DATA_FABRICACAO", "DATA_INSTALACAO", "VIDA_UTIL_MESES",
    "APLICA_CALIBRACAO", "DATA_ULTIMA_CAL", "DATA_PROXIMA_CAL",
    "CERTIFICADO_NUMERO", "LINK_CERTIFICADO",
    "ITEM_ESTOQUE_ID", "LOTE_ID", "FORNECEDOR_ID", "INSTALADA_OS_ID", "INSTALADA_POR",
    "DATA_REMOVIDA", "REMOVIDA_OS_ID", "MOTIVO_REMOCAO",
    "QR_TOKEN", "QRCODE_LINK", "STATUS", "CRIADO_EM"
  ], log);

  garantirAbaV2_(ss, SGO_CFG.SHEETS.HST_PECAS_EQUIPAMENTO, [
    "ID", "PECA_INSTALADA_ID", "EQUIPAMENTO_ID", "OS_ID", "EVENTO", "DATA_EVENTO",
    "TECNICO_ID", "DESCRICAO", "STATUS_ANTERIOR", "STATUS_NOVO", "DOCUMENTO_ID", "CRIADO_EM"
  ], log);

  garantirAbaV2_(ss, SGO_CFG.SHEETS.DOC_DOCUMENTOS, [
    "ID", "CLIENTE_ID", "UNIDADE_ID", "EQUIPAMENTO_ID", "PECA_INSTALADA_ID", "FORNECEDOR_ID",
    "OS_ID", "TIPO_DOCUMENTO", "NUMERO_DOCUMENTO", "DATA_EMISSAO", "DATA_VENCIMENTO",
    "NOME_ARQUIVO", "LINK_ARQUIVO", "FILE_ID", "HASH_SHA256", "TOKEN_VALIDACAO", "URL_VALIDACAO",
    "QR_CODE_LINK", "RESPONSAVEL_TECNICO", "CREA_CRT", "STATUS", "CRIADO_EM"
  ], log);

  garantirAbaV2_(ss, SGO_CFG.SHEETS.CAD_CONTRATOS, [
    "ID", "CLIENTE_ID", "NUMERO_CONTRATO", "TIPO_CONTRATO",
    "OBJETO", "DATA_INICIO", "DATA_FIM", "DATA_RENOVACAO_ALERTA",
    "VALOR_MENSAL", "VALOR_TOTAL", "MOEDA",
    "RESPONSAVEL_CLIENTE", "CONTATO_CLIENTE",
    "STATUS", "LINK_CONTRATO", "OBSERVACOES", "CRIADO_EM"
  ], log);

  garantirAbaV2_(ss, SGO_CFG.SHEETS.CAD_CONTRATOS_EQP, [
    "ID", "CONTRATO_ID", "EQUIPAMENTO_ID", "TIPO_COBERTURA", "CRIADO_EM"
  ], log);

  garantirAbaV2_(ss, SGO_CFG.SHEETS.SYS_ASSINATURAS, [
    "ID", "OS_ID", "TIPO", "ASSINADO_POR", "CARGO",
    "ASSINATURA_DATA_URL", "ASSINATURA_FILE_ID", "LINK_DRIVE",
    "RECOLETA_NECESSARIA", "IP_DISPOSITIVO", "USER_AGENT", "ASSINADO_EM", "CRIADO_EM"
  ], log);
}

function criarEstruturaOSV2_(ss, log) {
  garantirAbaV2_(ss, SGO_CFG.SHEETS.OS_ORDENS, [
    "ID", "NUMERO_OS", "TIPO_OS", "PRIORIDADE", "SLA_HORAS", "SLA_PRAZO",
    "STATUS", "STATUS_FATURAMENTO",
    "CLIENTE_ID", "UNIDADE_ID", "EQUIPAMENTO_ID", "PECA_ID", "CONTRATO_ID",
    "RELATO_CLIENTE", "MISSAO_TECNICA",
    "RESPONSAVEL_ID", "TECNICO_ID", "TECNICO_USUARIO_ID", "MISSAO_ID", "VEICULO_ID",
    "LOCAL_ATENDIMENTO", "CHECKIN_LAT", "CHECKIN_LNG", "CHECKIN_ENDERECO",
    "DATA_ABERTURA", "DATA_AGENDADA", "DATA_INICIO", "DATA_CONCLUSAO",
    "CONDICAO_ENCONTRADA", "SERVICO_EXECUTADO", "DIAGNOSTICO_FINAL", "CAUSA_PROVAVEL",
    "RECOMENDACAO", "PENDENCIAS", "NECESSITA_RETORNO", "NECESSITA_ORCAMENTO",
    "ORIENTACAO_TECNICA", "RELATO_TECNICO", "RESULTADO_ATENDIMENTO",
    "CHECKIN_EM", "CHECKOUT_EM", "CHECKOUT_LAT", "CHECKOUT_LNG",
    "QUESTIONARIO_MODELO_ID",
    "ENCERRAMENTO_TECNICO", "RELATO_TECNICO_OBRIGATORIO", "CHECKLIST_OK", "EVIDENCIAS_OK",
    "APROVACAO_ADMIN", "APROVADOR_ID", "DATA_APROVACAO", "APROVADO_POR", "APROVADO_EM",
    "ASSINATURA_ID", "ASSINADO_EM", "ASSINADO_POR",
    "LINK_PASTA_DRIVE",
    "CUSTO_PECAS", "CUSTO_HORA", "CUSTO_DESLOCAMENTO", "CUSTO_TOTAL",
    "DOCUMENTO_ID", "TOKEN_VALIDACAO", "PDF_URL",
    "NUMERO_NF", "OBSERVACOES_FATURAMENTO", "FATURAMENTO_STATUS",
    "CANCELADO_POR", "CANCELADO_EM", "MOTIVO_CANCELAMENTO",
    "CRIADO_POR", "CRIADO_EM", "ATUALIZADO_EM"
  ], log);

  garantirAbaV2_(ss, SGO_CFG.SHEETS.OS_FOTOS, [
    "ID", "OS_ID", "MISSAO_ID", "EQUIPAMENTO_ID", "MOMENTO", "TIPO_FOTO", "NOME_ARQUIVO",
    "LINK_DRIVE", "FILE_ID", "MIME_TYPE", "PERGUNTA_ID",
    "UPLOAD_POR", "UPLOAD_EM", "ENVIADO_POR", "ENVIADO_EM", "OBSERVACAO", "CRIADO_EM"
  ], log);

  garantirAbaV2_(ss, SGO_CFG.SHEETS.OS_CHECKLIST_TEMPLATE, [
    "ID", "TIPO_OS", "SECAO", "ITEM", "PERGUNTA", "DESCRICAO", "TIPO_RESPOSTA", "OBRIGATORIO", "ORDEM", "ATIVO", "CRIADO_EM"
  ], log);

  garantirAbaV2_(ss, SGO_CFG.SHEETS.OS_CHECKLIST_MODELOS, [
    "ID", "NOME", "TIPO_OS", "TIPO_EQUIPAMENTO", "DESCRICAO", "VERSAO", "STATUS",
    "EXIGE_FOTO", "EXIGE_ASSINATURA", "EXIGE_KM", "EXIGE_MATERIAIS", "EXIGE_GPS",
    "BLOQUEIA_SE_NAO_CONFORME", "PERMITE_CONCLUIR_SEM_QUESTIONARIO",
    "CRIADO_EM", "CRIADO_POR", "ATUALIZADO_EM"
  ], log);

  garantirAbaV2_(ss, SGO_CFG.SHEETS.OS_CHECKLIST_PERGUNTAS, [
    "ID", "MODELO_ID", "SECAO", "ORDEM", "PERGUNTA", "TIPO_RESPOSTA", "OPCOES",
    "OBRIGATORIO", "EXIGE_FOTO", "EXIGE_OBSERVACAO_SE_NAO_OK", "EXIGE_FOTO_SE_NAO_OK",
    "BLOQUEIA_CONCLUSAO", "PERMITE_NA", "PESO", "AJUDA", "STATUS", "CRIADO_EM"
  ], log);

  garantirAbaV2_(ss, SGO_CFG.SHEETS.OS_CHECKLIST_RESPOSTAS, [
    "ID", "OS_ID", "MISSAO_ID", "MODELO_ID", "PERGUNTA_ID", "TEMPLATE_ID",
    "SECAO", "ITEM", "PERGUNTA", "TIPO_RESPOSTA", "OBRIGATORIO",
    "RESPOSTA", "OBSERVACAO", "EVIDENCIA_LINK", "FOTO_ID", "STATUS_CONFORMIDADE",
    "RESPONDIDO_POR", "RESPONDIDO_EM", "CRIADO_EM"
  ], log);

  garantirAbaV2_(ss, SGO_CFG.SHEETS.OS_MATERIAIS, [
    "ID", "OS_ID", "EQUIPAMENTO_ID", "PECA_ID", "ITEM_ID", "LOTE_ID", "FORNECEDOR_ID", "TECNICO_ID",
    "PECA_INSTALADA_ID", "DESCRICAO", "REFERENCIA",
    "NUMERO_SERIE", "LOTE", "QUANTIDADE", "UNIDADE_MEDIDA",
    "CUSTO_UNITARIO", "CUSTO_TOTAL", "FORNECEDOR",
    "NOTA_FISCAL", "LINK_NF", "DATA_USO", "STATUS", "CRIADO_POR", "CRIADO_EM"
  ], log);

  garantirAbaV2_(ss, SGO_CFG.SHEETS.AGD_MISSOES, [
    "ID", "OS_ID", "TECNICO_ID", "TECNICO_USUARIO_ID", "TITULO", "DESCRICAO",
    "DATA_AGENDADA", "DATA", "HORA_INICIO_PREV", "HORA_INICIO_PREVISTA", "HORA_FIM_PREV", "HORA_FIM_PREVISTA", "SLA_HORAS",
    "STATUS",
    "CHECKIN_EM", "CHECKIN_LAT", "CHECKIN_LNG", "CHECKIN_ENDERECO",
    "CHECKOUT_EM", "CHECKOUT_LAT", "CHECKOUT_LNG", "CHECKOUT_ENDERECO",
    "HORAS_PREVISTAS", "HORAS_APONTADAS",
    "VEICULO_ID", "KM_SAIDA", "KM_CHEGADA",
    "CONCLUSAO_TECNICA", "OBSERVACOES",
    "ALERTA_ENVIADO", "CRIADO_POR", "CRIADO_EM"
  ], log);

  garantirAbaV2_(ss, SGO_CFG.SHEETS.AGD_APONTAMENTOS, [
    "ID", "MISSAO_ID", "OS_ID", "TECNICO_ID", "DATA",
    "HORA_INICIO", "HORA_FIM", "HORAS_TOTAL",
    "ATIVIDADE", "OBSERVACOES", "CRIADO_EM"
  ], log);
}

function criarEstruturaFrotaV2_(ss, log) {
  garantirAbaV2_(ss, SGO_CFG.SHEETS.FRT_VEICULOS, [
    "ID", "PLACA", "MODELO", "MARCA", "ANO", "COR", "TIPO_COMBUSTIVEL",
    "RENAVAM", "CHASSI", "PROPRIETARIO",
    "KM_ATUAL", "KM_ULTIMA_MANUT", "KM_PROXIMA_MANUT",
    "DATA_ULTIMA_MANUT", "DATA_PROXIMA_MANUT",
    "DATA_VENCIMENTO_SEGURO", "DATA_VENCIMENTO_IPVA", "DATA_VENCIMENTO_LICENCIAMENTO",
    "CUSTO_KM", "STATUS", "BLOQUEADO", "MOTIVO_BLOQUEIO",
    "TECNICO_RESPONSAVEL_ID", "LINK_PASTA_DRIVE", "CRIADO_EM"
  ], log);

  garantirAbaV2_(ss, SGO_CFG.SHEETS.FRT_AGENDAMENTOS, [
    "ID", "VEICULO_ID", "TECNICO_ID", "OS_ID", "MISSAO_ID",
    "DATA_INICIO", "DATA_FIM", "STATUS",
    "KM_SAIDA", "KM_CHEGADA", "KM_PERCORRIDO",
    "CUSTO_KM", "CUSTO_TOTAL", "OBSERVACOES", "CRIADO_EM"
  ], log);

  garantirAbaV2_(ss, SGO_CFG.SHEETS.FRT_VISTORIAS, [
    "ID", "VEICULO_ID", "TECNICO_ID", "TIPO", "DATA", "KM",
    "COMBUSTIVEL_PCT", "PNEUS_OK", "LATARIA_OK", "INTERIOR_OK",
    "AVARIAS_DESCRICAO", "LINK_FOTOS", "APROVADO", "APROVADO_POR", "CRIADO_EM"
  ], log);

  garantirAbaV2_(ss, SGO_CFG.SHEETS.FRT_ABASTECIMENTOS, [
    "ID", "VEICULO_ID", "TECNICO_ID", "DATA", "KM",
    "LITROS", "VALOR_LITRO", "VALOR_TOTAL", "TIPO_COMBUSTIVEL",
    "POSTO", "NOTA_FISCAL", "LINK_NF", "CRIADO_EM"
  ], log);

  garantirAbaV2_(ss, SGO_CFG.SHEETS.FRT_MANUTENCAO, [
    "ID", "VEICULO_ID", "TIPO_MANUT", "DESCRICAO", "DATA", "KM",
    "OFICINA", "CUSTO", "NOTA_FISCAL", "LINK_NF",
    "PROXIMA_DATA", "PROXIMO_KM", "STATUS", "CRIADO_EM"
  ], log);
}

function criarEstruturaEstoqueV2_(ss, log) {
  garantirAbaV2_(ss, SGO_CFG.SHEETS.CAD_FORNECEDORES, [
    "ID", "RAZAO_SOCIAL", "NOME_FANTASIA", "CNPJ", "INSCRICAO_ESTADUAL",
    "ENDERECO", "CIDADE", "UF", "CONTATO", "EMAIL", "TELEFONE",
    "TIPO_FORNECEDOR", "STATUS", "BLOQUEADO", "MOTIVO_BLOQUEIO",
    "DATA_BLOQUEIO", "CRIADO_EM"
  ], log);

  garantirAbaV2_(ss, SGO_CFG.SHEETS.FORN_DOCUMENTOS, [
    "ID", "FORNECEDOR_ID", "TIPO_DOCUMENTO", "NUMERO_DOCUMENTO",
    "DATA_EMISSAO", "DATA_VENCIMENTO", "LINK_ARQUIVO", "FILE_ID",
    "HASH_SHA256", "STATUS", "VALIDADO_POR", "VALIDADO_EM", "CRIADO_EM"
  ], log);

  garantirAbaV2_(ss, SGO_CFG.SHEETS.FORN_QUALIFICACAO, [
    "ID", "FORNECEDOR_ID", "STATUS_QUALIFICACAO", "ALVARA_OK", "ANVISA_OK",
    "ISO_OK", "DOCUMENTOS_OK", "DATA_ULTIMA_ANALISE", "DATA_PROXIMA_ANALISE",
    "RESPONSAVEL_ID", "OBSERVACOES", "CRIADO_EM"
  ], log);

  garantirAbaV2_(ss, SGO_CFG.SHEETS.EST_ITENS, [
    "ID", "CODIGO_INTERNO", "DESCRICAO", "TIPO_ITEM", "FABRICANTE", "MODELO",
    "REFERENCIA", "UNIDADE_MEDIDA", "ESTOQUE_MINIMO", "EXIGE_LOTE",
    "EXIGE_VALIDADE", "EXIGE_SERIE", "APLICA_CALIBRACAO", "STATUS",
    "QR_TOKEN", "QRCODE_LINK", "CRIADO_EM"
  ], log);

  garantirAbaV2_(ss, SGO_CFG.SHEETS.EST_LOTES, [
    "ID", "ITEM_ID", "FORNECEDOR_ID", "NUMERO_LOTE", "NUMERO_SERIE",
    "DATA_FABRICACAO", "DATA_VALIDADE", "DATA_ENTRADA", "NF_ID",
    "QUANTIDADE_INICIAL", "QUANTIDADE_ATUAL", "CUSTO_UNITARIO",
    "STATUS", "BLOQUEADO", "MOTIVO_BLOQUEIO", "QR_TOKEN", "QRCODE_LINK", "CRIADO_EM"
  ], log);

  garantirAbaV2_(ss, SGO_CFG.SHEETS.EST_NOTAS_FISCAIS, [
    "ID", "FORNECEDOR_ID", "NUMERO_NF", "SERIE_NF", "DATA_EMISSAO",
    "DATA_RECEBIMENTO", "VALOR_TOTAL", "LINK_XML", "LINK_PDF",
    "HASH_XML", "HASH_PDF", "STATUS", "CRIADO_EM"
  ], log);

  garantirAbaV2_(ss, SGO_CFG.SHEETS.EST_ENTRADAS, [
    "ID", "NF_ID", "ITEM_ID", "LOTE_ID", "FORNECEDOR_ID", "QUANTIDADE",
    "CUSTO_UNITARIO", "CUSTO_TOTAL", "RECEBIDO_POR", "RECEBIDO_EM",
    "OBSERVACOES", "CRIADO_EM"
  ], log);

  garantirAbaV2_(ss, SGO_CFG.SHEETS.EST_SAIDAS, [
    "ID", "ITEM_ID", "LOTE_ID", "FORNECEDOR_ID", "OS_ID", "EQUIPAMENTO_ID",
    "PECA_INSTALADA_ID", "TECNICO_ID", "QUANTIDADE", "DESTINO", "MOTIVO_SAIDA",
    "DATA_SAIDA", "CRIADO_EM"
  ], log);

  garantirAbaV2_(ss, SGO_CFG.SHEETS.EST_MOVIMENTACOES, [
    "ID", "ITEM_ID", "LOTE_ID", "TIPO_MOVIMENTO", "ORIGEM", "DESTINO",
    "OS_ID", "QUANTIDADE", "SALDO_ANTES", "SALDO_DEPOIS", "RESPONSAVEL_ID",
    "DATA_MOVIMENTO", "OBSERVACOES", "CRIADO_EM"
  ], log);

  garantirAbaV2_(ss, SGO_CFG.SHEETS.SYS_ETIQUETAS, [
    "ID", "TIPO_ENTIDADE", "REFERENCIA_ID", "TOKEN", "CODIGO_LEITURA",
    "QRCODE_LINK", "IMPRESSO_POR", "IMPRESSO_EM", "STATUS", "CRIADO_EM"
  ], log);
}

function garantirAbaV2_(ss, nomeAba, cabecalhos, log) {
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
    formatarCabecalhoV2_(sheet, cabecalhos.length);
    log.push(nomeAba + ": criada com " + cabecalhos.length + " colunas.");
    return;
  }

  if (sheet.getLastRow() === 0 || sheet.getLastColumn() === 0) {
    sheet.appendRow(cabecalhos);
    formatarCabecalhoV2_(sheet, cabecalhos.length);
    log.push(nomeAba + ": cabecalho criado em aba vazia.");
    return;
  }

  const atuais = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(function(h) {
    return SGO_UTILS.safe(h);
  });

  const faltantes = cabecalhos.filter(function(h) {
    return atuais.indexOf(h) < 0;
  });

  if (faltantes.length > 0) {
    sheet.getRange(1, atuais.length + 1, 1, faltantes.length).setValues([faltantes]);
    formatarCabecalhoV2_(sheet, atuais.length + faltantes.length);
    log.push(nomeAba + ": " + faltantes.length + " colunas adicionadas.");
  } else {
    formatarCabecalhoV2_(sheet, atuais.length);
    log.push(nomeAba + ": ja estava atualizada.");
  }
}

function formatarCabecalhoV2_(sheet, totalColunas) {
  const qtd = Math.max(1, totalColunas || sheet.getLastColumn());
  sheet.getRange(1, 1, 1, qtd).setFontWeight("bold").setBackground("#f3f3f3");
  sheet.setFrozenRows(1);
}
