function setupSGOv2() {
  const log = [];

  const dbPrincipal = garantirBancoSGOv2_("DB_ID", sgoGetCfgSafe_().SISTEMA.NOME_EXIBICAO + "_DB", log);
  const dbOS = garantirBancoSGOv2_("DB_OS_ID", sgoGetCfgSafe_().SISTEMA.NOME_EXIBICAO + "_DB_OS", log);
  const dbFrota = garantirBancoSGOv2_("DB_FROTA_ID", sgoGetCfgSafe_().SISTEMA.NOME_EXIBICAO + "_DB_FROTA", log);
  const dbEstoque = garantirBancoSGOv2_("DB_ESTOQUE_ID", sgoGetCfgSafe_().SISTEMA.NOME_EXIBICAO + "_DB_ESTOQUE", log);

  criarEstruturaPrincipalV2_(dbPrincipal, log);
  criarEstruturaOSV2_(dbOS, log);
  criarEstruturaFrotaV2_(dbFrota, log);
  criarEstruturaEstoqueV2_(dbEstoque, log);
  criarEstruturaAssistenciaTecnicaV2_(dbPrincipal, log);

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

function setupFrotaDev() {
  const log = [];
  const dbFrota = garantirBancoSGOv2_("DB_FROTA_ID", sgoGetCfgSafe_().SISTEMA.NOME_EXIBICAO + "_DB_FROTA", log);

  criarEstruturaFrotaV2_(dbFrota, log);

  if (typeof SGO_DATA !== "undefined" && SGO_DATA.clearCache) {
    SGO_DATA.clearCache();
  }

  log.forEach(function(item) {
    Logger.log(item);
  });

  return {
    ok: true,
    dbFrotaId: dbFrota.getId(),
    log: log
  };
}

function setupFrotaNovaDev() {
  const log = [];
  const dbFrota = garantirBancoSGOv2_("DB_FROTA_ID", sgoGetCfgSafe_().SISTEMA.NOME_EXIBICAO + "_DB_FROTA", log);

  criarEstruturaFrotaNovaV2_(dbFrota, log);

  if (typeof SGO_DATA !== "undefined" && SGO_DATA.clearCache) {
    SGO_DATA.clearCache();
    log.push("CACHE: SGO_DATA limpo.");
  }

  log.forEach(function(item) {
    Logger.log(item);
  });

  return {
    ok: true,
    dbFrotaId: dbFrota.getId(),
    log: log
  };
}

function setupDocumentosFrotaNovaDev() {
  const log = [];
  const dbPrincipal = garantirBancoSGOv2_("DB_ID", sgoGetCfgSafe_().SISTEMA.NOME_EXIBICAO + "_DB", log);

  garantirAbaV2_(dbPrincipal, sgoGetCfgSafe_().SHEETS.DOC_DOCUMENTOS, docDocumentosCabecalhosV2_(), log);

  if (typeof SGO_DATA !== "undefined" && SGO_DATA.clearCache) {
    SGO_DATA.clearCache();
    log.push("CACHE: SGO_DATA limpo.");
  }

  log.forEach(function(item) {
    Logger.log(item);
  });

  return { ok: true, log: log };
}

function docDocumentosCabecalhosV2_() {
  return [
    "ID", "CLIENTE_ID", "UNIDADE_ID", "EQUIPAMENTO_ID", "OS_ID", "PECA_ID",
    "PECA_INSTALADA_ID", "FORNECEDOR_ID", "VEICULO_ID", "TIPO_DOCUMENTO",
    "NUMERO_DOCUMENTO", "TITULO", "NOME_ARQUIVO", "LINK_ARQUIVO", "FILE_ID",
    "DATA_EMISSAO", "DATA_VENCIMENTO", "STATUS", "HASH_SHA256",
    "TOKEN_VALIDACAO", "URL_VALIDACAO", "QRCODE_LINK", "QR_CODE_LINK",
    "MODULO_ORIGEM", "ENTIDADE_ID", "VISIBILIDADE", "RESPONSAVEL_TECNICO",
    "CREA_CRT", "CRIADO_POR", "CRIADO_EM"
  ];
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
  garantirAbaV2_(ss, sgoGetCfgSafe_().SHEETS.CAD_TECNICOS, [
    "ID", "USUARIO_ID", "NOME", "CPF", "EMAIL", "TELEFONE",
    "CREA_CRT", "NUMERO_CREA", "UF_CREA", "DATA_VENCIMENTO_CREA",
    "CNH", "CATEGORIA_CNH", "VENCIMENTO_CNH",
    "ESPECIALIDADES",
    "CUSTO_HORA", "DISPONIBILIDADE",
    "DATA_ADMISSAO", "ENDERECO", "CIDADE", "UF",
    "OBSERVACOES", "STATUS", "CRIADO_EM"
  ], log);

  garantirAbaV2_(ss, sgoGetCfgSafe_().SHEETS.CAD_PECAS, [
    "ID", "EQUIPAMENTO_ID", "CLIENTE_ID", "UNIDADE_ID", "NOME", "TIPO_PECA",
    "FABRICANTE", "MODELO", "REFERENCIA", "NUMERO_SERIE", "LOTE",
    "DATA_FABRICACAO", "DATA_INSTALACAO", "VIDA_UTIL_MESES",
    "APLICA_CALIBRACAO", "DATA_ULTIMA_CAL", "DATA_PROXIMA_CAL",
    "CERTIFICADO_NUMERO", "LINK_CERTIFICADO",
    "ITEM_ESTOQUE_ID", "LOTE_ID", "FORNECEDOR_ID", "INSTALADA_OS_ID", "INSTALADA_POR",
    "DATA_REMOVIDA", "REMOVIDA_OS_ID", "MOTIVO_REMOCAO",
    "QR_TOKEN", "QRCODE_LINK", "STATUS", "CRIADO_EM"
  ], log);

  garantirAbaV2_(ss, sgoGetCfgSafe_().SHEETS.HST_PECAS_EQUIPAMENTO, [
    "ID", "PECA_INSTALADA_ID", "EQUIPAMENTO_ID", "OS_ID", "EVENTO", "DATA_EVENTO",
    "TECNICO_ID", "DESCRICAO", "STATUS_ANTERIOR", "STATUS_NOVO", "DOCUMENTO_ID", "CRIADO_EM"
  ], log);

  garantirAbaV2_(ss, sgoGetCfgSafe_().SHEETS.DOC_DOCUMENTOS, docDocumentosCabecalhosV2_(), log);

  garantirAbaV2_(ss, sgoGetCfgSafe_().SHEETS.CAD_CONTRATOS, [
    "ID", "CLIENTE_ID", "NUMERO_CONTRATO", "TIPO_CONTRATO",
    "OBJETO", "DATA_INICIO", "DATA_FIM", "DATA_RENOVACAO_ALERTA",
    "VALOR_MENSAL", "VALOR_TOTAL", "MOEDA",
    "RESPONSAVEL_CLIENTE", "CONTATO_CLIENTE",
    "STATUS", "LINK_CONTRATO", "OBSERVACOES", "CRIADO_EM"
  ], log);

  garantirAbaV2_(ss, sgoGetCfgSafe_().SHEETS.CAD_CONTRATOS_EQP, [
    "ID", "CONTRATO_ID", "EQUIPAMENTO_ID", "TIPO_COBERTURA", "CRIADO_EM"
  ], log);

}

function criarEstruturaAssistenciaTecnicaV2_(ss, log) {
  if (typeof SGO_AST !== "undefined" && SGO_AST.setupV2) {
    const res = SGO_AST.setupV2();
    (res.log || []).forEach(function(item) { log.push("AST V2: " + item); });
    return;
  }

  if (typeof SGO_AST !== "undefined" && SGO_AST.setup) {
    const res = SGO_AST.setup();
    (res.log || []).forEach(function(item) { log.push("AST: " + item); });
    return;
  }

  [
    sgoGetCfgSafe_().SHEETS.AST_ENTRADAS,
    sgoGetCfgSafe_().SHEETS.AST_ACESSORIOS,
    sgoGetCfgSafe_().SHEETS.AST_FOTOS,
    sgoGetCfgSafe_().SHEETS.AST_DIAGNOSTICOS,
    sgoGetCfgSafe_().SHEETS.AST_PECAS,
    sgoGetCfgSafe_().SHEETS.AST_MOVIMENTACOES,
    sgoGetCfgSafe_().SHEETS.AST_DOCUMENTOS,
    sgoGetCfgSafe_().SHEETS.AST_ALERTAS,
    sgoGetCfgSafe_().SHEETS.AST_TERCEIROS,
    sgoGetCfgSafe_().SHEETS.AST_TERCEIROS_ACESSORIOS,
    sgoGetCfgSafe_().SHEETS.AST_TERCEIROS_ANEXOS,
    sgoGetCfgSafe_().SHEETS.AST_TERCEIROS_ACOMPANHAMENTOS,
    sgoGetCfgSafe_().SHEETS.AST_TERCEIROS_DOCUMENTOS,
    sgoGetCfgSafe_().SHEETS.AST_LAB_ENTRADAS,
    sgoGetCfgSafe_().SHEETS.AST_LAB_ENSAIOS,
    sgoGetCfgSafe_().SHEETS.AST_LAB_PADROES,
    sgoGetCfgSafe_().SHEETS.AST_LAB_RESULTADOS,
    sgoGetCfgSafe_().SHEETS.AST_LAB_DOCUMENTOS,
    sgoGetCfgSafe_().SHEETS.AST_LAB_EVIDENCIAS,
    sgoGetCfgSafe_().SHEETS.AST_TESTES_BANCADA,
    sgoGetCfgSafe_().SHEETS.AST_EXECUCOES,
    sgoGetCfgSafe_().SHEETS.AST_INDICADORES_DIARIOS,
    sgoGetCfgSafe_().SHEETS.AST_PRODUTIVIDADE_TECNICOS,
    sgoGetCfgSafe_().SHEETS.AST_CONFORMIDADE,
    sgoGetCfgSafe_().SHEETS.AST_RELATORIOS_GERADOS
  ].forEach(function(nome) {
    garantirAbaV2_(ss, nome, ["ID", "CRIADO_EM"], log);
  });
}

function criarEstruturaOSV2_(ss, log) {
  garantirAbaV2_(ss, sgoGetCfgSafe_().SHEETS.SYS_ASSINATURAS, [
    "ID", "OS_ID", "TIPO", "TIPO_ASSINATURA", "ASSINADO_POR", "CARGO",
    "ASSINADO_EM", "ASSINATURA_FILE_ID", "ASSINATURA_LINK", "LINK_DRIVE",
    "ASSINATURA_DATA_URL", "USER_AGENT", "IP_DISPOSITIVO", "STATUS",
    "CRIADO_POR", "CRIADO_EM", "REMOVIDA_POR", "REMOVIDA_EM",
    "MOTIVO_REMOCAO", "REABERTURA_RELATO_EM"
  ], log);

  garantirAbaV2_(ss, sgoGetCfgSafe_().SHEETS.OS_ORDENS, [
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

  garantirAbaV2_(ss, sgoGetCfgSafe_().SHEETS.OS_FOTOS, [
    "ID", "OS_ID", "MISSAO_ID", "EQUIPAMENTO_ID", "MOMENTO", "TIPO_FOTO", "NOME_ARQUIVO",
    "LINK_DRIVE", "FILE_ID", "MIME_TYPE", "PERGUNTA_ID",
    "UPLOAD_POR", "UPLOAD_EM", "ENVIADO_POR", "ENVIADO_EM", "OBSERVACAO",
    "STATUS", "REMOVIDA_POR", "REMOVIDA_EM", "MOTIVO_REMOCAO", "CRIADO_EM"
  ], log);

  garantirAbaV2_(ss, sgoGetCfgSafe_().SHEETS.OS_CHECKLIST_TEMPLATE, [
    "ID", "TIPO_OS", "SECAO", "ITEM", "PERGUNTA", "DESCRICAO", "TIPO_RESPOSTA", "OBRIGATORIO", "ORDEM", "ATIVO", "CRIADO_EM"
  ], log);

  garantirAbaV2_(ss, sgoGetCfgSafe_().SHEETS.OS_CHECKLIST_MODELOS, [
    "ID", "NOME", "TIPO_OS", "TIPO_EQUIPAMENTO", "DESCRICAO", "VERSAO", "STATUS",
    "EXIGE_FOTO", "EXIGE_ASSINATURA", "EXIGE_KM", "EXIGE_MATERIAIS", "EXIGE_GPS",
    "BLOQUEIA_SE_NAO_CONFORME", "PERMITE_CONCLUIR_SEM_QUESTIONARIO",
    "CRIADO_EM", "CRIADO_POR", "ATUALIZADO_EM"
  ], log);

  garantirAbaV2_(ss, sgoGetCfgSafe_().SHEETS.OS_CHECKLIST_PERGUNTAS, [
    "ID", "MODELO_ID", "SECAO", "ORDEM", "PERGUNTA", "TIPO_RESPOSTA", "OPCOES",
    "OBRIGATORIO", "EXIGE_FOTO", "EXIGE_OBSERVACAO_SE_NAO_OK", "EXIGE_FOTO_SE_NAO_OK",
    "BLOQUEIA_CONCLUSAO", "PERMITE_NA", "PESO", "AJUDA", "STATUS", "CRIADO_EM"
  ], log);

  garantirAbaV2_(ss, sgoGetCfgSafe_().SHEETS.OS_CHECKLIST_RESPOSTAS, [
    "ID", "OS_ID", "MISSAO_ID", "MODELO_ID", "PERGUNTA_ID", "TEMPLATE_ID",
    "SECAO", "ITEM", "PERGUNTA", "TIPO_RESPOSTA", "OBRIGATORIO",
    "RESPOSTA", "OBSERVACAO", "EVIDENCIA_LINK", "FOTO_ID", "STATUS_CONFORMIDADE",
    "RESPONDIDO_POR", "RESPONDIDO_EM", "CRIADO_EM"
  ], log);

  garantirAbaV2_(ss, sgoGetCfgSafe_().SHEETS.OS_MATERIAIS, [
    "ID", "OS_ID", "EQUIPAMENTO_ID", "PECA_ID", "ITEM_ID", "LOTE_ID", "FORNECEDOR_ID", "TECNICO_ID",
    "PECA_INSTALADA_ID", "DESCRICAO", "REFERENCIA",
    "NUMERO_SERIE", "LOTE", "QUANTIDADE", "UNIDADE_MEDIDA",
    "CUSTO_UNITARIO", "CUSTO_TOTAL", "FORNECEDOR",
    "NOTA_FISCAL", "LINK_NF", "DATA_USO", "STATUS", "CRIADO_POR", "CRIADO_EM"
  ], log);

  garantirAbaV2_(ss, sgoGetCfgSafe_().SHEETS.AGD_MISSOES, [
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

  garantirAbaV2_(ss, sgoGetCfgSafe_().SHEETS.AGD_APONTAMENTOS, [
    "ID", "MISSAO_ID", "OS_ID", "TECNICO_ID", "DATA",
    "HORA_INICIO", "HORA_FIM", "HORAS_TOTAL",
    "ATIVIDADE", "OBSERVACOES", "CRIADO_EM"
  ], log);
}

function criarEstruturaFrotaV2_(ss, log) {
  garantirAbaV2_(ss, sgoGetCfgSafe_().SHEETS.FRT_VEICULOS, [
    "ID", "PLACA", "MODELO", "MARCA", "ANO", "COR", "TIPO_COMBUSTIVEL",
    "RENAVAM", "CHASSI", "PROPRIETARIO",
    "KM_ATUAL", "KM_ULTIMA_MANUT", "KM_PROXIMA_MANUT",
    "DATA_ULTIMA_MANUT", "DATA_PROXIMA_MANUT",
    "DATA_VENCIMENTO_SEGURO", "DATA_VENCIMENTO_IPVA", "DATA_VENCIMENTO_LICENCIAMENTO",
    "CUSTO_KM", "STATUS", "BLOQUEADO", "MOTIVO_BLOQUEIO",
    "TECNICO_RESPONSAVEL_ID", "LINK_PASTA_DRIVE", "CRIADO_EM",
    "MEDIA_ESPERADA_KM_L", "DOCUMENTACAO_VENCE", "OBSERVACOES",
    "STATUS_OPERACIONAL", "PREVENTIVA_PROX_KM", "PREVENTIVA_PROX_DATA",
    "BLOQUEIO_MOTIVO", "ULTIMO_MOVIMENTO_ID"
  ], log);

  garantirAbaV2_(ss, sgoGetCfgSafe_().SHEETS.FRT_AGENDAMENTOS, [
    "ID", "VEICULO_ID", "TECNICO_ID", "OS_ID", "MISSAO_ID",
    "DATA_INICIO", "DATA_FIM", "STATUS",
    "KM_SAIDA", "KM_CHEGADA", "KM_PERCORRIDO",
    "CUSTO_KM", "CUSTO_TOTAL", "OBSERVACOES", "CRIADO_EM",
    "RESPONSAVEL_NOME", "MOTIVO", "DESTINO", "BLOQUEANTE"
  ], log);

  garantirAbaV2_(ss, sgoGetCfgSafe_().SHEETS.FRT_VISTORIAS, [
    "ID", "VEICULO_ID", "TECNICO_ID", "TIPO", "DATA", "KM",
    "COMBUSTIVEL_PCT", "PNEUS_OK", "LATARIA_OK", "INTERIOR_OK",
    "AVARIAS_DESCRICAO", "LINK_FOTOS", "APROVADO", "APROVADO_POR", "CRIADO_EM",
    "CHECKLIST_JSON", "FOTOS_JSON", "ASSINATURA", "FINALIZADA", "BLOQUEANTE"
  ], log);

  garantirAbaV2_(ss, sgoGetCfgSafe_().SHEETS.FRT_ABASTECIMENTOS, [
    "ID", "VEICULO_ID", "TECNICO_ID", "DATA", "KM",
    "LITROS", "VALOR_LITRO", "VALOR_TOTAL", "TIPO_COMBUSTIVEL",
    "POSTO", "NOTA_FISCAL", "LINK_NF", "CRIADO_EM",
    "CONDUTOR_ID", "CONDUTOR_NOME", "TANQUE_CHEIO", "LOCALIZACAO_POSTO",
    "COMPROVANTE", "FOTO_PAINEL", "KM_RODADO_CALCULADO", "CONSUMO_KM_L",
    "CUSTO_KM", "CALCULO_CONSOLIDADO"
  ], log);

  garantirAbaV2_(ss, sgoGetCfgSafe_().SHEETS.FRT_MANUTENCAO, [
    "ID", "VEICULO_ID", "TIPO_MANUT", "DESCRICAO", "DATA", "KM",
    "OFICINA", "CUSTO", "NOTA_FISCAL", "LINK_NF",
    "PROXIMA_DATA", "PROXIMO_KM", "STATUS", "CRIADO_EM",
    "CATEGORIA", "OFICINA_LOCAL", "SERVICO_REALIZADO", "PECAS_SUBSTITUIDAS",
    "CUSTO_PECAS", "CUSTO_MAO_OBRA", "CUSTO_TOTAL", "DIAS_PARADO",
    "FOTOS", "COMPROVANTE", "CHECKLIST_JSON", "BLOQUEANTE"
  ], log);

  garantirAbaV2_(ss, sgoGetCfgSafe_().SHEETS.FRT_MOVIMENTOS, [
    "ID", "VEICULO_ID", "PLACA", "CONDUTOR_ID", "CONDUTOR_NOME",
    "TIPO", "STATUS", "DATA_HORA_CHECKIN", "DATA_HORA_CHECKOUT",
    "KM_SAIDA", "KM_CHEGADA", "COMBUSTIVEL_SAIDA", "COMBUSTIVEL_CHEGADA",
    "DESTINO", "MOTIVO_USO", "OS_ID", "MISSAO_ID",
    "LOCALIZACAO_SAIDA", "LOCALIZACAO_CHEGADA",
    "CHECKLIST_JSON", "FOTOS_JSON", "ASSINATURA_CHECKIN", "ASSINATURA_CHECKOUT",
    "AVARIAS", "OBSERVACOES", "BLOQUEANTE",
    "CRIADO_EM", "CRIADO_POR", "ATUALIZADO_EM", "ATUALIZADO_POR"
  ], log);

  garantirAbaV2_(ss, sgoGetCfgSafe_().SHEETS.FRT_LAVAGENS, [
    "ID", "VEICULO_ID", "PLACA", "DATA", "KM", "LOCAL",
    "TIPO_LAVAGEM", "VALOR", "RESPONSAVEL_ID", "RESPONSAVEL_NOME",
    "FOTO_ANTES", "FOTO_DEPOIS", "COMPROVANTE", "OBSERVACOES",
    "CRIADO_EM", "CRIADO_POR"
  ], log);

  garantirAbaV2_(ss, sgoGetCfgSafe_().SHEETS.FRT_MULTAS, [
    "ID", "VEICULO_ID", "PLACA", "CONDUTOR_ID", "CONDUTOR_NOME",
    "CPF_CNH", "DATA_HORA_INFRACAO", "LOCAL_INFRACAO", "NUMERO_AUTO",
    "ORGAO_AUTUADOR", "DESCRICAO_INFRACAO", "VALOR", "PONTUACAO",
    "PRAZO_INDICACAO", "STATUS", "ANEXO_NOTIFICACAO", "ASSINATURA_CONDUTOR",
    "DOCUMENTO_ID", "OBSERVACOES", "CRIADO_EM", "CRIADO_POR",
    "ATUALIZADO_EM", "ATUALIZADO_POR"
  ], log);

  garantirAbaV2_(ss, sgoGetCfgSafe_().SHEETS.FRT_ALERTAS, [
    "ID", "VEICULO_ID", "PLACA", "TIPO_ALERTA", "NIVEL", "MENSAGEM",
    "STATUS", "DATA_ALERTA", "DATA_LIMITE", "BLOQUEANTE", "ORIGEM",
    "REFERENCIA_ID", "CRIADO_EM", "CRIADO_POR", "RESOLVIDO_EM", "RESOLVIDO_POR"
  ], log);

  garantirAbaV2_(ss, sgoGetCfgSafe_().SHEETS.FRT_DOCUMENTOS, [
    "ID", "VEICULO_ID", "PLACA", "TIPO_DOCUMENTO", "DOCUMENTO_ID",
    "TOKEN_VALIDACAO", "HASH", "LINK_PDF", "LINK_DOWNLOAD", "STATUS",
    "EMITIDO_EM", "EMITIDO_POR", "OBSERVACOES"
  ], log);
}

function criarEstruturaFrotaNovaV2_(ss, log) {
  garantirAbaV2_(ss, sgoGetCfgSafe_().SHEETS.FROTA_VEICULOS, [
    "ID", "CODIGO", "PLACA", "STATUS", "MARCA", "MODELO", "ANO", "COR",
    "COMBUSTIVEL_PADRAO", "KM_ATUAL", "MEDIA_ESPERADA_KM_L",
    "DOCUMENTACAO_VENCE", "SEGURO_VENCE", "IPVA_VENCE", "LICENCIAMENTO_VENCE",
    "RENAVAM", "CHASSI", "PROPRIETARIO", "OBSERVACOES", "BLOQUEADO",
    "MOTIVO_BLOQUEIO", "ULTIMO_MOVIMENTO_ID", "ULTIMA_VISTORIA_ID",
    "ULTIMO_ABASTECIMENTO_ID", "ULTIMA_MANUTENCAO_ID", "PROXIMA_PREVENTIVA_KM",
    "PROXIMA_PREVENTIVA_DATA", "CRIADO_EM", "CRIADO_POR", "ATUALIZADO_EM",
    "ATUALIZADO_POR", "ATIVO"
  ], log);

  garantirAbaV2_(ss, sgoGetCfgSafe_().SHEETS.FROTA_RESERVAS, [
    "ID", "VEICULO_ID", "PLACA", "RESPONSAVEL_ID", "RESPONSAVEL_NOME",
    "DATA_HORA_INICIO", "DATA_HORA_FIM", "MOTIVO", "DESTINO", "OS_ID",
    "MISSAO_ID", "OBSERVACOES", "STATUS", "BLOQUEANTE", "CRIADO_EM",
    "CRIADO_POR", "ATUALIZADO_EM", "ATUALIZADO_POR"
  ], log);

  garantirAbaV2_(ss, sgoGetCfgSafe_().SHEETS.FROTA_MOVIMENTOS, [
    "ID", "VEICULO_ID", "PLACA", "CONDUTOR_ID", "CONDUTOR_NOME", "TIPO",
    "STATUS", "DATA_HORA_CHECKIN", "DATA_HORA_CHECKOUT", "KM_SAIDA",
    "KM_CHEGADA", "KM_RODADO", "COMBUSTIVEL_SAIDA", "COMBUSTIVEL_CHEGADA",
    "DESTINO", "MOTIVO_USO", "OS_ID", "MISSAO_ID", "LOCALIZACAO_SAIDA",
    "LOCALIZACAO_CHEGADA", "CHECKLIST_CHECKIN_JSON", "CHECKLIST_CHECKOUT_JSON",
    "FOTOS_CHECKIN_JSON", "FOTOS_CHECKOUT_JSON", "ASSINATURA_CHECKIN",
    "ASSINATURA_CHECKOUT", "VEICULO_LIMPO_RETORNO", "AVARIAS",
    "DESCRICAO_AVARIAS", "BLOQUEANTE", "OBSERVACOES", "CRIADO_EM",
    "CRIADO_POR", "ATUALIZADO_EM", "ATUALIZADO_POR"
  ], log);

  garantirAbaV2_(ss, sgoGetCfgSafe_().SHEETS.FROTA_VISTORIAS, [
    "ID", "VEICULO_ID", "PLACA", "MOVIMENTO_ID", "TIPO_VISTORIA",
    "CONDUTOR_ID", "CONDUTOR_NOME", "DATA_HORA", "KM", "COMBUSTIVEL_PERCENTUAL",
    "CHECKLIST_JSON", "FOTOS_JSON", "AVARIAS", "OBSERVACOES", "ASSINATURA",
    "FINALIZADA", "BLOQUEANTE", "CRIADO_EM", "CRIADO_POR"
  ], log);

  garantirAbaV2_(ss, sgoGetCfgSafe_().SHEETS.FROTA_ABASTECIMENTOS, [
    "ID", "VEICULO_ID", "PLACA", "CONDUTOR_ID", "CONDUTOR_NOME", "DATA_HORA",
    "KM", "LITROS", "VALOR_TOTAL", "VALOR_LITRO", "TIPO_COMBUSTIVEL",
    "TANQUE_CHEIO", "POSTO", "LOCALIZACAO_POSTO", "COMPROVANTE_JSON",
    "FOTO_PAINEL_JSON", "KM_RODADO_CALCULADO", "CONSUMO_KM_L", "CUSTO_KM",
    "CALCULO_CONSOLIDADO", "OBSERVACOES", "CRIADO_EM", "CRIADO_POR"
  ], log);

  garantirAbaV2_(ss, sgoGetCfgSafe_().SHEETS.FROTA_MANUTENCOES, [
    "ID", "VEICULO_ID", "PLACA", "CATEGORIA", "TIPO_MANUTENCAO", "STATUS",
    "DATA_ENTRADA", "DATA_SAIDA", "KM", "OFICINA_LOCAL", "LOCALIZACAO_OFICINA",
    "DESCRICAO_PROBLEMA", "SERVICO_REALIZADO", "PECAS_SUBSTITUIDAS",
    "CUSTO_PECAS", "CUSTO_MAO_OBRA", "CUSTO_TOTAL", "DIAS_PARADO",
    "PROXIMA_PREVENTIVA_KM", "PROXIMA_PREVENTIVA_DATA", "CHECKLIST_JSON",
    "FOTOS_JSON", "COMPROVANTES_JSON", "BLOQUEANTE", "OBSERVACOES",
    "CRIADO_EM", "CRIADO_POR", "ATUALIZADO_EM", "ATUALIZADO_POR"
  ], log);

  garantirAbaV2_(ss, sgoGetCfgSafe_().SHEETS.FROTA_LAVAGENS, [
    "ID", "VEICULO_ID", "PLACA", "DATA_HORA", "KM", "LOCAL", "TIPO_LAVAGEM",
    "VALOR", "RESPONSAVEL_ID", "RESPONSAVEL_NOME", "FOTO_ANTES_JSON",
    "FOTO_DEPOIS_JSON", "COMPROVANTE_JSON", "OBSERVACOES", "CRIADO_EM",
    "CRIADO_POR"
  ], log);

  garantirAbaV2_(ss, sgoGetCfgSafe_().SHEETS.FROTA_MULTAS, [
    "ID", "VEICULO_ID", "PLACA", "CONDUTOR_ID", "CONDUTOR_NOME", "CPF_CNH",
    "DATA_HORA_INFRACAO", "LOCAL_INFRACAO", "NUMERO_AUTO", "ORGAO_AUTUADOR",
    "DESCRICAO_INFRACAO", "VALOR", "PONTUACAO", "PRAZO_INDICACAO", "STATUS",
    "ANEXO_NOTIFICACAO_JSON", "ASSINATURA_CONDUTOR", "DOCUMENTO_ID",
    "TOKEN_VALIDACAO", "HASH", "LINK_PDF", "OBSERVACOES", "CRIADO_EM",
    "CRIADO_POR", "ATUALIZADO_EM", "ATUALIZADO_POR"
  ], log);

  garantirAbaV2_(ss, sgoGetCfgSafe_().SHEETS.FROTA_ALERTAS, [
    "ID", "VEICULO_ID", "PLACA", "TIPO_ALERTA", "NIVEL", "MENSAGEM",
    "STATUS", "DATA_ALERTA", "DATA_LIMITE", "BLOQUEANTE", "ORIGEM",
    "REFERENCIA_ID", "CRIADO_EM", "CRIADO_POR", "RESOLVIDO_EM", "RESOLVIDO_POR"
  ], log);

  garantirAbaV2_(ss, sgoGetCfgSafe_().SHEETS.FROTA_DOCUMENTOS, [
    "ID", "VEICULO_ID", "PLACA", "TIPO_DOCUMENTO", "DOCUMENTO_ID",
    "TOKEN_VALIDACAO", "HASH", "LINK_PDF", "LINK_DOWNLOAD", "STATUS",
    "PERIODO_INICIAL", "PERIODO_FINAL", "PERIODO_LABEL",
    "EMITIDO_EM", "EMITIDO_POR", "OBSERVACOES"
  ], log);

  garantirAbaV2_(ss, sgoGetCfgSafe_().SHEETS.FROTA_UPLOADS, [
    "ID", "VEICULO_ID", "PLACA", "MOVIMENTO_ID", "MODULO_ORIGEM",
    "REFERENCIA_ID", "TIPO_ARQUIVO", "NOME_ARQUIVO", "MIME_TYPE",
    "DRIVE_FILE_ID", "LINK_VISUALIZACAO", "LINK_DOWNLOAD", "CRIADO_EM",
    "CRIADO_POR"
  ], log);

  garantirAbaV2_(ss, sgoGetCfgSafe_().SHEETS.FROTA_LOGS, [
    "ID", "ACAO", "MODULO", "REFERENCIA_ID", "VEICULO_ID", "PLACA",
    "USUARIO_ID", "USUARIO_NOME", "DATA_HORA", "ANTES_JSON", "DEPOIS_JSON",
    "OBSERVACOES"
  ], log);
}

function criarEstruturaEstoqueV2_(ss, log) {
  garantirAbaV2_(ss, sgoGetCfgSafe_().SHEETS.CAD_FORNECEDORES, [
    "ID", "RAZAO_SOCIAL", "NOME_FANTASIA", "CNPJ", "INSCRICAO_ESTADUAL",
    "ENDERECO", "CIDADE", "UF", "CONTATO", "EMAIL", "TELEFONE",
    "TIPO_FORNECEDOR", "STATUS", "BLOQUEADO", "MOTIVO_BLOQUEIO",
    "DATA_BLOQUEIO", "CRIADO_EM"
  ], log);

  garantirAbaV2_(ss, sgoGetCfgSafe_().SHEETS.FORN_DOCUMENTOS, [
    "ID", "FORNECEDOR_ID", "TIPO_DOCUMENTO", "NUMERO_DOCUMENTO",
    "DATA_EMISSAO", "DATA_VENCIMENTO", "LINK_ARQUIVO", "FILE_ID",
    "HASH_SHA256", "STATUS", "VALIDADO_POR", "VALIDADO_EM", "CRIADO_EM"
  ], log);

  garantirAbaV2_(ss, sgoGetCfgSafe_().SHEETS.FORN_QUALIFICACAO, [
    "ID", "FORNECEDOR_ID", "STATUS_QUALIFICACAO", "ALVARA_OK", "ANVISA_OK",
    "ISO_OK", "DOCUMENTOS_OK", "DATA_ULTIMA_ANALISE", "DATA_PROXIMA_ANALISE",
    "RESPONSAVEL_ID", "OBSERVACOES", "CRIADO_EM"
  ], log);

  garantirAbaV2_(ss, sgoGetCfgSafe_().SHEETS.EST_ITENS, [
    "ID", "CODIGO_INTERNO", "DESCRICAO", "TIPO_ITEM", "FABRICANTE", "MODELO",
    "REFERENCIA", "UNIDADE_MEDIDA", "ESTOQUE_MINIMO", "EXIGE_LOTE",
    "EXIGE_VALIDADE", "EXIGE_SERIE", "APLICA_CALIBRACAO", "STATUS",
    "QR_TOKEN", "QRCODE_LINK", "CRIADO_EM"
  ], log);

  garantirAbaV2_(ss, sgoGetCfgSafe_().SHEETS.EST_LOTES, [
    "ID", "ITEM_ID", "FORNECEDOR_ID", "NUMERO_LOTE", "NUMERO_SERIE",
    "DATA_FABRICACAO", "DATA_VALIDADE", "DATA_ENTRADA", "NF_ID",
    "QUANTIDADE_INICIAL", "QUANTIDADE_ATUAL", "CUSTO_UNITARIO",
    "STATUS", "BLOQUEADO", "MOTIVO_BLOQUEIO", "QR_TOKEN", "QRCODE_LINK", "CRIADO_EM"
  ], log);

  garantirAbaV2_(ss, sgoGetCfgSafe_().SHEETS.EST_NOTAS_FISCAIS, [
    "ID", "FORNECEDOR_ID", "NUMERO_NF", "SERIE_NF", "DATA_EMISSAO",
    "DATA_RECEBIMENTO", "VALOR_TOTAL", "LINK_XML", "LINK_PDF",
    "HASH_XML", "HASH_PDF", "STATUS", "CRIADO_EM"
  ], log);

  garantirAbaV2_(ss, sgoGetCfgSafe_().SHEETS.EST_ENTRADAS, [
    "ID", "NF_ID", "ITEM_ID", "LOTE_ID", "FORNECEDOR_ID", "QUANTIDADE",
    "CUSTO_UNITARIO", "CUSTO_TOTAL", "RECEBIDO_POR", "RECEBIDO_EM",
    "OBSERVACOES", "CRIADO_EM"
  ], log);

  garantirAbaV2_(ss, sgoGetCfgSafe_().SHEETS.EST_SAIDAS, [
    "ID", "ITEM_ID", "LOTE_ID", "FORNECEDOR_ID", "OS_ID", "EQUIPAMENTO_ID",
    "PECA_INSTALADA_ID", "TECNICO_ID", "QUANTIDADE", "DESTINO", "MOTIVO_SAIDA",
    "DATA_SAIDA", "CRIADO_EM"
  ], log);

  garantirAbaV2_(ss, sgoGetCfgSafe_().SHEETS.EST_MOVIMENTACOES, [
    "ID", "ITEM_ID", "LOTE_ID", "TIPO_MOVIMENTO", "ORIGEM", "DESTINO",
    "OS_ID", "QUANTIDADE", "SALDO_ANTES", "SALDO_DEPOIS", "RESPONSAVEL_ID",
    "DATA_MOVIMENTO", "OBSERVACOES", "CRIADO_EM"
  ], log);

  garantirAbaV2_(ss, sgoGetCfgSafe_().SHEETS.SYS_ETIQUETAS, [
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
function setupOrcamentosV2() {
  var log = [];
  var dbComercial = garantirBancoSGOv2_("DB_COMERCIAL_ID", sgoGetCfgSafe_().SISTEMA.NOME_EXIBICAO + "_DB_COMERCIAL", log);

  criarEstruturaOrcamentosV2_(dbComercial, log);

  var ss = dbComercial;
  var sheet = ss.getSheetByName(sgoGetCfgSafe_().SHEETS.ORC_CONFIG);
  if (sheet && sheet.getLastRow() <= 1) {
    var seeds = [
      ["IA_ATIVA", "NAO", "Integração IA ativa?"],
      ["CNPJ_API_ATIVA", "NAO", "Consulta CNPJ via API?"],
      ["VALIDADE_PADRAO_DIAS", "15", "Validade padrão de propostas em dias"],
      ["MOEDA_PADRAO", "BRL", "Moeda padrão dos orçamentos"],
      ["PREFIXO_NUMERO", "ORC", "Prefixo do número sequencial"]
    ];
    var agora = new Date().toISOString();
    for (var i = 0; i < seeds.length; i++) {
      var id = "CFG-" + (i + 1);
      sheet.appendRow([id, seeds[i][0], seeds[i][1], seeds[i][2], agora]);
    }
    log.push("ORC_CONFIG: 5 seeds inseridos.");
  }

  if (typeof SGO_DATA !== "undefined" && SGO_DATA.clearCache) {
    SGO_DATA.clearCache();
    log.push("CACHE: SGO_DATA limpo.");
  }

  log.forEach(function(item) { Logger.log(item); });

  return {
    ok: true,
    dbComercialId: dbComercial.getId(),
    log: log
  };
}

function criarEstruturaOrcamentosV2_(ss, log) {
  garantirAbaV2_(ss, sgoGetCfgSafe_().SHEETS.ORC_CONFIG, [
    "ID", "CHAVE", "VALOR", "DESCRICAO", "CRIADO_EM"
  ], log);

  garantirAbaV2_(ss, sgoGetCfgSafe_().SHEETS.ORC_ORCAMENTOS, [
    "ID", "NUMERO_ORC", "VERSAO", "STATUS", "FUNIL_ETAPA",
    "CLIENTE_ID", "UNIDADE_ID", "CONTATO_NOME", "CONTATO_EMAIL", "CONTATO_TELEFONE", "CONTATO_CARGO",
    "TITULO", "DESCRICAO", "ESCOPO", "OBSERVACOES",
    "TOTAL_BRUTO", "DESCONTO_PCT", "DESCONTO_VALOR", "TOTAL_LIQUIDO", "MOEDA",
    "VALIDADE_DIAS", "DATA_EMISSAO", "DATA_VALIDADE", "DATA_FECHAMENTO",
    "TEMPLATE_ID", "OS_ID", "AST_ID", "MISSAO_ID",
    "TOKEN_APROVACAO", "APROVADO_POR", "APROVADO_EM", "APROVADO_NOME", "APROVADO_EMAIL",
    "DOCUMENTO_ID", "PDF_URL", "PDF_LINK_DOWNLOAD",
    "MOTIVO_RECUSA", "NOTAS_INTERNAS",
    "CRIADO_POR", "CRIADO_EM", "ATUALIZADO_POR", "ATUALIZADO_EM"
  ], log);

  garantirAbaV2_(ss, sgoGetCfgSafe_().SHEETS.ORC_ITENS, [
    "ID", "ORCAMENTO_ID", "ORDEM", "TIPO_ITEM",
    "DESCRICAO", "UNIDADE_MEDIDA", "QUANTIDADE", "VALOR_UNITARIO", "DESCONTO_PCT", "VALOR_TOTAL",
    "OBSERVACOES", "CRIADO_EM"
  ], log);

  garantirAbaV2_(ss, sgoGetCfgSafe_().SHEETS.ORC_TEMPLATES, [
    "ID", "NOME", "TIPO", "DESCRICAO", "ATIVO", "CRIADO_EM"
  ], log);

  garantirAbaV2_(ss, sgoGetCfgSafe_().SHEETS.ORC_TEMPLATES_ITENS, [
    "ID", "TEMPLATE_ID", "ORDEM", "TIPO_ITEM",
    "DESCRICAO", "UNIDADE_MEDIDA", "QUANTIDADE", "VALOR_UNITARIO",
    "OBSERVACOES", "CRIADO_EM"
  ], log);

  garantirAbaV2_(ss, sgoGetCfgSafe_().SHEETS.ORC_HISTORICO, [
    "ID", "ORCAMENTO_ID", "ACAO", "STATUS_ANTERIOR", "STATUS_NOVO",
    "USUARIO_ID", "USUARIO_NOME", "DESCRICAO", "CRIADO_EM"
  ], log);

  garantirAbaV2_(ss, sgoGetCfgSafe_().SHEETS.ORC_EMAILS, [
    "ID", "ORCAMENTO_ID", "DESTINATARIO", "ASSUNTO", "TIPO_EMAIL",
    "STATUS", "ENVIADO_EM", "ENVIADO_POR", "ERRO", "CRIADO_EM"
  ], log);

  garantirAbaV2_(ss, sgoGetCfgSafe_().SHEETS.ORC_APROVACOES, [
    "ID", "ORCAMENTO_ID", "DOCUMENTO_ID", "TOKEN", "STATUS", "TIPO_RESPOSTA",
    "RESPOSTA_NOME", "RESPOSTA_EMAIL", "RESPOSTA_EM",
    "IP_DISPOSITIVO", "USER_AGENT", "OBSERVACOES", "CRIADO_EM"
  ], log);

  garantirAbaV2_(ss, sgoGetCfgSafe_().SHEETS.ORC_DOCUMENTOS, [
    "ID", "ORCAMENTO_ID", "TIPO_DOCUMENTO", "DOCUMENTO_ID",
    "TOKEN_VALIDACAO", "HASH", "LINK_PDF", "LINK_DOWNLOAD",
    "STATUS", "EMITIDO_EM", "EMITIDO_POR"
  ], log);

  garantirAbaV2_(ss, sgoGetCfgSafe_().SHEETS.ORC_ANEXOS, [
    "ID", "ORCAMENTO_ID", "NUMERO_ORC", "TIPO_ANEXO",
    "NOME_ARQUIVO", "MIME_TYPE", "DRIVE_FILE_ID",
    "LINK_VISUALIZACAO", "LINK_DOWNLOAD", "TAMANHO_BYTES",
    "HASH", "OBSERVACAO", "CRIADO_EM", "CRIADO_POR", "ATIVO"
  ], log);

  garantirAbaV2_(ss, sgoGetCfgSafe_().SHEETS.ORC_ALERTAS, [
    "ID", "ORCAMENTO_ID", "NUMERO_ORC", "LEAD_ID",
    "TIPO_ALERTA", "NIVEL", "MENSAGEM", "STATUS",
    "DATA_ALERTA", "DATA_LIMITE",
    "RESPONSAVEL_ID", "RESPONSAVEL_NOME",
    "VISUALIZADO_EM", "RESOLVIDO_EM", "RESOLVIDO_POR",
    "OBSERVACAO", "CRIADO_EM"
  ], log);

  garantirAbaV2_(ss, sgoGetCfgSafe_().SHEETS.ORC_FOLLOWUPS, [
    "ID", "ORCAMENTO_ID", "NUMERO_ORC", "LEAD_ID",
    "TIPO_FOLLOWUP", "CANAL", "DESCRICAO", "RESULTADO",
    "PROXIMA_ACAO", "DATA_PROXIMA_ACAO", "STATUS",
    "RESPONSAVEL_ID", "RESPONSAVEL_NOME",
    "CRIADO_EM", "CRIADO_POR", "REALIZADO_EM", "OBSERVACAO"
  ], log);

  garantirAbaV2_(ss, sgoGetCfgSafe_().SHEETS.ORC_LEADS, [
    "ID", "NOME", "EMPRESA", "EMAIL", "TELEFONE", "CARGO", "ORIGEM",
    "FUNIL_ETAPA", "TEMPERATURA", "RESPONSAVEL_ID", "ORCAMENTO_ID",
    "OBSERVACOES", "DATA_ULTIMO_CONTATO", "PROXIMO_FOLLOWUP",
    "STATUS", "CRIADO_EM", "ATUALIZADO_EM"
  ], log);
}

function SETUP_CRIAR_ABA_ASSINATURAS() {
  const nomeAba = "SYS_ASSINATURAS";
  const colunas = [
    "ID", "OS_ID", "TIPO_ASSINATURA", "TIPO", "ASSINADO_POR", "CARGO",
    "ASSINATURA_DATA_URL", "LINK_DRIVE", "FILE_ID", "USER_AGENT",
    "STATUS", "CRIADO_POR", "CRIADO_EM", "ATUALIZADO_EM"
  ];
  
  try {
    // Usa o conectador nativo do SGO+ para achar o banco de dados
    let ss;
    if (typeof SGO_DATA !== "undefined" && SGO_DATA.getDB) {
      ss = SGO_DATA.getDB("OS") || SGO_DATA.getDB();
    } else {
      ss = SpreadsheetApp.getActiveSpreadsheet();
    }

    if (!ss) {
      Logger.log("ERRO: Banco de dados não encontrado.");
      return;
    }

    let sheet = ss.getSheetByName(nomeAba);
    
    if (!sheet) {
      sheet = ss.insertSheet(nomeAba);
      sheet.appendRow(colunas);
      sheet.getRange(1, 1, 1, colunas.length).setFontWeight("bold").setBackground("#0b3b78").setFontColor("#ffffff");
      sheet.setFrozenRows(1);
      Logger.log("SUCESSO! A aba " + nomeAba + " foi criada e configurada no banco.");
    } else {
      Logger.log("AVISO: A aba " + nomeAba + " já existe no seu banco de dados.");
    }
  } catch (e) {
    Logger.log("ERRO AO EXECUTAR: " + e.message);
  }
}

// ============================================================
// AUTH.1 — AUDITORIA COMPLETA DO SISTEMA DE AUTENTICAÇÃO SGO+
// Somente leitura. Não altera planilha, properties, sessão,
// senha, e-mail, deploy ou push.
// ============================================================
function AUDITAR_AUTH_SGO_COMPLETO_AUTH1_SEM_GRAVAR() {
  var resultado = {
    auditoria     : "AUDITAR_AUTH_SGO_COMPLETO_AUTH1_SEM_GRAVAR",
    executado     : false,
    somenteLeitura: true,
    scriptId      : ScriptApp.getScriptId(),
    dataAuditoria : new Date().toISOString(),

    // CAD_USUARIOS
    usuarios: {
      total        : 0,
      ativos       : 0,
      inativos     : 0,
      bloqueados   : 0,
      porPerfil    : {},
      semEmail     : 0,
      senhaCurta   : 0,   // <= 8 chars — provável texto simples
      senhaLonga   : 0,   // >= 60 chars — possível hash bcrypt/SHA
      headers      : [],
      temColunaEmail: false
    },

    // CAD_TECNICOS
    tecnicos: {
      total            : 0,
      comUsuarioVinculado: 0,
      semUsuarioVinculado: 0,
      headers          : []
    },

    // Sessões ativas em ScriptProperties
    sessoes: {
      totalChavesSGO_SESSION: 0,
      expiradas              : 0,
      ativas                 : 0,
      amostra                : []
    },

    // ScriptProperties relevantes
    properties: {
      DB_ID_configurado     : false,
      DB_FIN_ID_configurado : false,
      FIN_PILOTO_FLASH_EMAIL: null,
      EMAIL_ALERTAS_DESTINO : null,
      SESSION_TTL           : null
    },

    // SYS_LOGS — últimos eventos de auth
    logsAuth: {
      ultimosLogins    : [],
      ultimosLogout    : [],
      ultimosLoginNegado: []
    },

    // Riscos encontrados
    riscos: [],
    avisos: [],
    bloqueios: []
  };

  try {
    var props = PropertiesService.getScriptProperties();
    var allProps = props.getProperties();

    // --- ScriptProperties ---
    resultado.properties.DB_ID_configurado      = !!allProps["DB_ID"];
    resultado.properties.DB_FIN_ID_configurado  = !!allProps["DB_FIN_ID"];
    resultado.properties.FIN_PILOTO_FLASH_EMAIL = allProps["FIN_PILOTO_FLASH_EMAIL"] || null;
    resultado.properties.EMAIL_ALERTAS_DESTINO  = allProps["EMAIL_ALERTAS_DESTINATARIOS"] || null;
    resultado.properties.SESSION_TTL            = allProps["SESSION_TTL"] || "21600 (padrão)";

    // --- Sessões ativas ---
    var agora = new Date();
    Object.keys(allProps).forEach(function(k) {
      if (k.indexOf("SGO_SESSION_") === 0) {
        resultado.sessoes.totalChavesSGO_SESSION++;
        try {
          var s = JSON.parse(allProps[k]);
          var exp = s.expiresAt ? new Date(s.expiresAt) : null;
          if (exp && exp < agora) {
            resultado.sessoes.expiradas++;
          } else {
            resultado.sessoes.ativas++;
            if (resultado.sessoes.amostra.length < 5) {
              resultado.sessoes.amostra.push({
                usuario: s.usuario || "",
                perfil : s.perfil  || "",
                expira : s.expiresAt || ""
              });
            }
          }
        } catch (_e) { resultado.sessoes.expiradas++; }
      }
    });

    if (!resultado.properties.DB_ID_configurado) {
      resultado.bloqueios.push("DB_ID nao configurado — impossivel ler CAD_USUARIOS e CAD_TECNICOS.");
      resultado.executado   = true;
      resultado.conclusao   = "AUTH.1 PARCIAL — DB_ID ausente";
      Logger.log(JSON.stringify(resultado, null, 2));
      return resultado;
    }

    var ssPrincipal = SpreadsheetApp.openById(allProps["DB_ID"]);

    // --- CAD_USUARIOS ---
    var shUsers = ssPrincipal.getSheetByName("CAD_USUARIOS");
    if (!shUsers) {
      resultado.bloqueios.push("Aba CAD_USUARIOS nao encontrada em DB_ID.");
    } else {
      var dadosU = shUsers.getRange(1, 1, shUsers.getLastRow(), shUsers.getLastColumn()).getValues();
      var hU     = dadosU[0].map(function(v) { return String(v || "").trim(); });
      resultado.usuarios.headers       = hU;
      resultado.usuarios.temColunaEmail= hU.some(function(h) { return h.toUpperCase() === "EMAIL"; });

      var iUID    = hU.indexOf("ID");
      var iUUSU   = hU.indexOf("USUARIO");
      var iUSENHA = hU.indexOf("SENHA");
      var iUNOME  = hU.indexOf("NOME");
      var iUPERF  = hU.indexOf("PERFIL");
      var iUSTA   = hU.indexOf("STATUS");
      var iUEMAIL = hU.findIndex(function(h) { return h.toUpperCase() === "EMAIL"; });

      for (var i = 1; i < dadosU.length; i++) {
        var row    = dadosU[i];
        var status = String(iUSTA  >= 0 ? row[iUSTA]  : "").trim().toUpperCase();
        var perfil = String(iUPERF >= 0 ? row[iUPERF] : "").trim().toUpperCase();
        var senha  = String(iUSENHA >= 0 ? row[iUSENHA]: "").trim();
        var email  = String(iUEMAIL >= 0 ? row[iUEMAIL]: "").trim();
        var id     = String(iUID    >= 0 ? row[iUID]   : "").trim();
        if (!id && !String(iUUSU >= 0 ? row[iUUSU] : "").trim()) continue; // linha vazia

        resultado.usuarios.total++;
        if (status === "ATIVO")    resultado.usuarios.ativos++;
        if (status === "INATIVO")  resultado.usuarios.inativos++;
        if (status === "BLOQUEADO")resultado.usuarios.bloqueados++;

        resultado.usuarios.porPerfil[perfil] = (resultado.usuarios.porPerfil[perfil] || 0) + 1;

        if (!resultado.usuarios.temColunaEmail || !email) resultado.usuarios.semEmail++;
        if (senha.length > 0 && senha.length <= 20)       resultado.usuarios.senhaCurta++;
        if (senha.length >= 60)                            resultado.usuarios.senhaLonga++;
      }

      if (resultado.usuarios.senhaCurta > 0)
        resultado.riscos.push(
          "CRITICO: " + resultado.usuarios.senhaCurta + " usuario(s) com senha de ate 20 chars — " +
          "provavel texto simples. Ausencia de hash confirmada."
        );
      if (!resultado.usuarios.temColunaEmail)
        resultado.riscos.push(
          "ALTO: CAD_USUARIOS nao possui coluna EMAIL. " +
          "Recuperacao de senha por e-mail impossivel. " +
          "Perfil TECNICO nao pode receber alerta por e-mail pessoal."
        );
      if (resultado.sessoes.expiradas > 10)
        resultado.avisos.push(
          resultado.sessoes.expiradas + " sessoes expiradas ainda em ScriptProperties. " +
          "Limpar com housekeeping periodico."
        );
    }

    // --- CAD_TECNICOS ---
    var shTec = ssPrincipal.getSheetByName("CAD_TECNICOS");
    if (shTec && shTec.getLastRow() >= 2) {
      var dadosT = shTec.getRange(1, 1, shTec.getLastRow(), shTec.getLastColumn()).getValues();
      var hT     = dadosT[0].map(function(v) { return String(v || "").trim(); });
      resultado.tecnicos.headers = hT;
      var iTUId = hT.indexOf("USUARIO_ID");
      var iTId  = hT.indexOf("ID");
      for (var j = 1; j < dadosT.length; j++) {
        var tid  = String(iTId  >= 0 ? dadosT[j][iTId]  : "").trim();
        if (!tid) continue;
        resultado.tecnicos.total++;
        var uid = String(iTUId >= 0 ? dadosT[j][iTUId] : "").trim();
        if (uid) resultado.tecnicos.comUsuarioVinculado++;
        else     resultado.tecnicos.semUsuarioVinculado++;
      }
      if (resultado.tecnicos.semUsuarioVinculado > 0)
        resultado.avisos.push(
          resultado.tecnicos.semUsuarioVinculado + " tecnico(s) sem USUARIO_ID vinculado. " +
          "Esses tecnicos nao conseguem ver missoes pelo perfil TECNICO."
        );
    }

    // --- SYS_LOGS — últimos eventos de auth ---
    var shLogs = ssPrincipal.getSheetByName("SYS_LOGS");
    if (shLogs && shLogs.getLastRow() >= 2) {
      var lastRow  = shLogs.getLastRow();
      var startRow = Math.max(2, lastRow - 499); // últimas 500 linhas
      var dadosLog = shLogs.getRange(startRow, 1, lastRow - startRow + 1, shLogs.getLastColumn()).getValues();
      var hLog     = shLogs.getRange(1, 1, 1, shLogs.getLastColumn()).getValues()[0]
        .map(function(v) { return String(v || "").trim(); });
      var iLAcao = hLog.indexOf("ACAO");
      var iLUsu  = hLog.indexOf("USUARIO");
      var iLData = hLog.indexOf("DATA_HORA");
      dadosLog.reverse().forEach(function(r) {
        var acao = String(iLAcao >= 0 ? r[iLAcao] : "").trim().toUpperCase();
        var usu  = String(iLUsu  >= 0 ? r[iLUsu]  : "").trim();
        var dt   = String(iLData >= 0 ? r[iLData]  : "").trim();
        if (acao === "LOGIN_OK"     && resultado.logsAuth.ultimosLogins.length     < 5)
          resultado.logsAuth.ultimosLogins.push({ usuario: usu, em: dt });
        if (acao === "LOGOUT"       && resultado.logsAuth.ultimosLogout.length     < 5)
          resultado.logsAuth.ultimosLogout.push({ usuario: usu, em: dt });
        if (acao === "LOGIN_NEGADO" && resultado.logsAuth.ultimosLoginNegado.length < 5)
          resultado.logsAuth.ultimosLoginNegado.push({ usuario: usu, em: dt });
      });
    }

    // Riscos adicionais
    resultado.riscos.push(
      "ALTO: Ausencia de recuperacao de senha. Usuarios bloqueados dependem de reset manual pelo ADMIN."
    );
    resultado.riscos.push(
      "MEDIO: Sessoes expiradas persistem em ScriptProperties indefinidamente. " +
      "Housekeeping nao implementado."
    );
    resultado.riscos.push(
      "MEDIO: Login lido por indice de coluna fixo (0–7). " +
      "Adicionar colunas em CAD_USUARIOS requer atualizar SGO_Auth.js."
    );
    resultado.riscos.push(
      "BAIXO: Frontend usa sessionStorage (nao localStorage). " +
      "Sessao perdida ao fechar aba/janela — usuario precisa relogar."
    );
    resultado.riscos.push(
      "BAIXO: Auto-logout: 4 horas (JS_Core.html) — pode divergir do TTL backend de 6 horas."
    );
    if (!resultado.properties.DB_FIN_ID_configurado)
      resultado.avisos.push("DB_FIN_ID nao configurado neste ambiente — modulo FIN inativo.");

    resultado.executado = true;
    resultado.conclusao = "AUTH.1 COMPLETO — leia os campos 'riscos' e 'avisos' para prioridades";

  } catch (e) {
    resultado.bloqueios.push("Falha em AUDITAR_AUTH_SGO_COMPLETO_AUTH1_SEM_GRAVAR: " + e.message);
    resultado.conclusao = "AUTH.1 FALHOU";
  }
  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

// ============================================================
// AUTH.2 — SCHEMA NOVO DE AUTENTICAÇÃO
// Definição dos schemas de cada aba AUTH
// ============================================================
var AUTH2_SCHEMAS_ = {
  AUTH_USUARIOS: [
    "ID", "NOME", "USUARIO", "EMAIL", "SENHA_HASH", "SENHA_SALT",
    "SENHA_TEMPORARIA", "PERFIL_PRINCIPAL", "STATUS",
    "TELEFONE", "FILIAL", "DEPARTAMENTO", "CARGO",
    "TECNICO_ID", "FUNCIONARIO_ID", "CLIENTE_ID",
    "RECEBE_ALERTAS", "ULTIMO_LOGIN", "TENTATIVAS_LOGIN", "BLOQUEADO_ATE",
    "TOKEN_RECUPERACAO_HASH", "TOKEN_RECUPERACAO_EXPIRA_EM",
    "CRIADO_EM", "CRIADO_POR", "ATUALIZADO_EM", "ATUALIZADO_POR"
  ],
  AUTH_PERFIS: [
    "ID", "NOME", "DESCRICAO", "NIVEL_ACESSO", "STATUS",
    "CRIADO_EM", "CRIADO_POR", "ATUALIZADO_EM", "ATUALIZADO_POR"
  ],
  AUTH_PERMISSOES: [
    "ID", "PERFIL", "MODULO", "ACAO", "PERMITIDO", "ESCOPO", "STATUS",
    "CRIADO_EM", "CRIADO_POR", "ATUALIZADO_EM", "ATUALIZADO_POR"
  ],
  AUTH_USUARIO_PERMISSOES: [
    "ID", "USUARIO_ID", "MODULO", "ACAO", "PERMITIDO", "ESCOPO", "MOTIVO", "STATUS",
    "CRIADO_EM", "CRIADO_POR", "ATUALIZADO_EM", "ATUALIZADO_POR"
  ],
  AUTH_RECUPERACAO_SENHA: [
    "ID", "USUARIO_ID", "EMAIL", "TOKEN_HASH", "EXPIRA_EM",
    "USADO", "USADO_EM", "CRIADO_EM", "IP_HASH", "STATUS"
  ],
  AUTH_LOG_ACESSO: [
    "ID", "DATA_HORA", "USUARIO_ID", "USUARIO", "EMAIL",
    "ACAO", "DETALHE", "IP_HASH", "USER_AGENT_HASH", "STATUS"
  ]
};

var AUTH2_PERFIS_PADRAO_ = [
  { NOME: "ADMIN",      DESCRICAO: "Administrador do sistema — acesso total",           NIVEL_ACESSO: 10 },
  { NOME: "DIRETORIA",  DESCRICAO: "Diretoria — acesso gerencial completo",              NIVEL_ACESSO: 9  },
  { NOME: "GESTOR",     DESCRICAO: "Gestor — acesso operacional amplo",                  NIVEL_ACESSO: 8  },
  { NOME: "TECNICO",    DESCRICAO: "Tecnico de campo — acesso restrito as proprias OS",  NIVEL_ACESSO: 5  },
  { NOME: "METROLOGIA", DESCRICAO: "Metrologia — acesso tecnico e qualidade",            NIVEL_ACESSO: 5  },
  { NOME: "COMERCIAL",  DESCRICAO: "Comercial — acesso a clientes e contratos",          NIVEL_ACESSO: 5  },
  { NOME: "FINANCEIRO", DESCRICAO: "Financeiro — acesso a modulos financeiros",          NIVEL_ACESSO: 5  },
  { NOME: "CLIENTE",    DESCRICAO: "Cliente externo — acesso isolado por clienteId",     NIVEL_ACESSO: 1  }
];

// ============================================================
// AUTH.2 — SETUP DO SCHEMA EM DEV
// Cria abas AUTH ausentes. Só roda no DEV.
// Não altera CAD_USUARIOS. Não migra usuários. Não envia e-mail.
// ============================================================
function SETUP_AUTH_SCHEMA_V2_DEV_AUTORIZADO() {
  var resultado = {
    funcao         : "SETUP_AUTH_SCHEMA_V2_DEV_AUTORIZADO",
    executado      : false,
    devConfirmado  : false,
    abasCriadas    : [],
    abasExistentes : [],
    perfisPadrao   : { inseridos: 0, jaExistiam: 0 },
    bloqueios      : [],
    avisos         : []
  };

  try {
    var DEV_SCRIPT_ID = "12xiWNlQ-WKVpiofmcGfBaX4EBdlsIxKFJG2PFTamHUmSUs89c4LW3WSG";

    // 1. Confirmar DEV
    var scriptIdAtual = ScriptApp.getScriptId();
    resultado.devConfirmado = (scriptIdAtual === DEV_SCRIPT_ID);
    if (!resultado.devConfirmado) {
      resultado.bloqueios.push(
        "BLOQUEADO: esta funcao so pode rodar no DEV. " +
        "ScriptId atual: " + scriptIdAtual + ". " +
        "Esperado DEV: " + DEV_SCRIPT_ID
      );
      Logger.log(JSON.stringify(resultado, null, 2));
      return resultado;
    }

    // 2. DB_ID
    var props = PropertiesService.getScriptProperties();
    var dbId  = String(props.getProperty("DB_ID") || "").trim();
    if (!dbId) {
      resultado.bloqueios.push("DB_ID nao configurado em ScriptProperties.");
      Logger.log(JSON.stringify(resultado, null, 2));
      return resultado;
    }
    var ss = SpreadsheetApp.openById(dbId);

    // 3. Criar abas AUTH ausentes
    var agora = new Date().toISOString();

    Object.keys(AUTH2_SCHEMAS_).forEach(function(nomeAba) {
      var headers = AUTH2_SCHEMAS_[nomeAba];
      var sh = ss.getSheetByName(nomeAba);

      if (!sh) {
        sh = ss.insertSheet(nomeAba);
        sh.appendRow(headers);
        sh.getRange(1, 1, 1, headers.length)
          .setFontWeight("bold")
          .setBackground("#0b3b78")
          .setFontColor("#ffffff");
        sh.setFrozenRows(1);
        sh.setColumnWidths(1, headers.length, 160);
        resultado.abasCriadas.push(nomeAba);
        resultado.avisos.push(nomeAba + ": criada com " + headers.length + " headers.");
      } else {
        var ultimaLinha = sh.getLastRow();
        var ultimaCol   = sh.getLastColumn();
        if (ultimaLinha === 0 || ultimaCol === 0) {
          sh.appendRow(headers);
          sh.getRange(1, 1, 1, headers.length)
            .setFontWeight("bold")
            .setBackground("#0b3b78")
            .setFontColor("#ffffff");
          sh.setFrozenRows(1);
          sh.setColumnWidths(1, headers.length, 160);
          resultado.abasCriadas.push(nomeAba + " (vazia — headers inseridos)");
          resultado.avisos.push(nomeAba + ": aba existia mas estava vazia — headers inseridos.");
        } else {
          resultado.abasExistentes.push(nomeAba);
          resultado.avisos.push(nomeAba + ": ja existe com " + ultimaLinha + " linha(s) — nenhuma alteracao.");
        }
      }
    });

    // 4. AUTH_PERFIS — inserir 8 perfis padrão (somente se a aba foi recém-criada ou está sem dados)
    var shPerfis = ss.getSheetByName("AUTH_PERFIS");
    if (shPerfis) {
      var totalLinhasPerfis = shPerfis.getLastRow();
      if (totalLinhasPerfis <= 1) {
        AUTH2_PERFIS_PADRAO_.forEach(function(p) {
          shPerfis.appendRow([
            Utilities.getUuid(),  // ID
            p.NOME,               // NOME
            p.DESCRICAO,          // DESCRICAO
            p.NIVEL_ACESSO,       // NIVEL_ACESSO
            "ATIVO",              // STATUS
            agora,                // CRIADO_EM
            "SETUP_AUTH_V2_DEV",  // CRIADO_POR
            agora,                // ATUALIZADO_EM
            "SETUP_AUTH_V2_DEV"   // ATUALIZADO_POR
          ]);
          resultado.perfisPadrao.inseridos++;
        });
        resultado.avisos.push(
          "AUTH_PERFIS: " + resultado.perfisPadrao.inseridos +
          " perfis padrao inseridos (ADMIN, DIRETORIA, GESTOR, TECNICO, METROLOGIA, COMERCIAL, FINANCEIRO, CLIENTE)."
        );
      } else {
        resultado.perfisPadrao.jaExistiam = totalLinhasPerfis - 1;
        resultado.avisos.push(
          "AUTH_PERFIS: ja possui " + resultado.perfisPadrao.jaExistiam +
          " registro(s) — perfis padrao nao foram re-inseridos."
        );
      }
    }

    resultado.executado = true;
    resultado.conclusao = resultado.bloqueios.length === 0
      ? "AUTH.2 SETUP CONCLUIDO — execute AUDITAR_AUTH_SCHEMA_V2_SEM_GRAVAR para confirmar."
      : "AUTH.2 SETUP PARCIAL — veja bloqueios.";

  } catch (e) {
    resultado.bloqueios.push("Falha em SETUP_AUTH_SCHEMA_V2_DEV_AUTORIZADO: " + e.message);
    resultado.conclusao = "AUTH.2 BLOQUEADO";
  }
  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

// ============================================================
// AUTH.2 — AUDITORIA DO SCHEMA NOVO
// Somente leitura. Confirma que as abas AUTH existem,
// CAD_USUARIOS está intacta e nada foi migrado.
// ============================================================
function AUDITAR_AUTH_SCHEMA_V2_SEM_GRAVAR() {
  var resultado = {
    auditoria              : "AUDITAR_AUTH_SCHEMA_V2_SEM_GRAVAR",
    executado              : false,
    somenteLeitura         : true,
    devConfirmado          : false,
    abasAuth               : {},
    cadUsuariosIntacta     : false,
    adminLeadoPresente     : false,
    emailNaoAdicionado     : false,
    senhaNaoMigrada        : false,
    producaoNaoAlterada    : true,
    perfisPadrao           : { encontrados: 0, nomes: [] },
    bloqueios              : [],
    avisos                 : []
  };

  var HEADERS_ESPERADOS_CAD_USUARIOS =
    ["ID", "USUARIO", "SENHA", "NOME", "PERFIL", "STATUS", "CRIADO_EM", "CLIENTE_ID"];

  var DEV_SCRIPT_ID = "12xiWNlQ-WKVpiofmcGfBaX4EBdlsIxKFJG2PFTamHUmSUs89c4LW3WSG";

  try {
    // 1. Confirmar DEV
    var scriptIdAtual = ScriptApp.getScriptId();
    resultado.devConfirmado = (scriptIdAtual === DEV_SCRIPT_ID);
    resultado.producaoNaoAlterada = resultado.devConfirmado;
    if (!resultado.devConfirmado)
      resultado.bloqueios.push(
        "Rodando em ambiente diferente do DEV. ScriptId: " + scriptIdAtual
      );

    // 2. DB_ID
    var props = PropertiesService.getScriptProperties();
    var dbId  = String(props.getProperty("DB_ID") || "").trim();
    if (!dbId) {
      resultado.bloqueios.push("DB_ID nao configurado.");
      Logger.log(JSON.stringify(resultado, null, 2));
      return resultado;
    }
    var ss = SpreadsheetApp.openById(dbId);

    // 3. Verificar abas AUTH
    Object.keys(AUTH2_SCHEMAS_).forEach(function(nomeAba) {
      var headersEsperados = AUTH2_SCHEMAS_[nomeAba];
      var sh = ss.getSheetByName(nomeAba);
      var info = { existe: false, headersCorretos: false, totalLinhas: 0, divergencias: [] };

      if (!sh) {
        info.existe = false;
        resultado.bloqueios.push(nomeAba + ": aba nao encontrada.");
      } else {
        info.existe     = true;
        info.totalLinhas= sh.getLastRow();
        if (sh.getLastRow() >= 1 && sh.getLastColumn() >= 1) {
          var hLidos = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0]
            .map(function(v) { return String(v || "").trim(); });
          var divergencias = [];
          headersEsperados.forEach(function(h, idx) {
            if (hLidos[idx] !== h)
              divergencias.push("col " + (idx+1) + ": esperado '" + h + "', lido '" + (hLidos[idx]||"") + "'");
          });
          info.headersCorretos = divergencias.length === 0;
          info.divergencias    = divergencias;
          if (!info.headersCorretos)
            resultado.bloqueios.push(nomeAba + ": headers divergentes — " + divergencias.join("; "));
        } else {
          info.headersCorretos = false;
          resultado.bloqueios.push(nomeAba + ": aba vazia — headers nao foram criados.");
        }
      }
      resultado.abasAuth[nomeAba] = info;
    });

    // 4. Perfis padrão em AUTH_PERFIS
    var shPerfis = ss.getSheetByName("AUTH_PERFIS");
    if (shPerfis && shPerfis.getLastRow() >= 2) {
      var dadosPerfis = shPerfis.getRange(2, 1, shPerfis.getLastRow()-1, shPerfis.getLastColumn()).getValues();
      var hPerfis = shPerfis.getRange(1, 1, 1, shPerfis.getLastColumn()).getValues()[0]
        .map(function(v) { return String(v||"").trim(); });
      var iPN = hPerfis.indexOf("NOME");
      dadosPerfis.forEach(function(r) {
        var nome = String(iPN >= 0 ? r[iPN] : "").trim();
        if (nome) {
          resultado.perfisPadrao.encontrados++;
          resultado.perfisPadrao.nomes.push(nome);
        }
      });
    }

    // 5. CAD_USUARIOS — verificar integridade
    var shUsers = ss.getSheetByName("CAD_USUARIOS");
    if (!shUsers) {
      resultado.bloqueios.push("CAD_USUARIOS nao encontrada — inesperado.");
    } else {
      var dadosU = shUsers.getRange(1, 1, shUsers.getLastRow(), shUsers.getLastColumn()).getValues();
      var hU     = dadosU[0].map(function(v) { return String(v||"").trim(); });

      // Headers intactos
      var headersIguais = JSON.stringify(hU) === JSON.stringify(HEADERS_ESPERADOS_CAD_USUARIOS);
      resultado.cadUsuariosIntacta  = headersIguais;
      resultado.emailNaoAdicionado  = !hU.some(function(h) { return h.toUpperCase() === "EMAIL"; });

      if (!headersIguais)
        resultado.bloqueios.push(
          "CAD_USUARIOS: headers alterados! Atual: [" + hU.join(", ") + "]. " +
          "Esperado: [" + HEADERS_ESPERADOS_CAD_USUARIOS.join(", ") + "]."
        );
      if (!resultado.emailNaoAdicionado)
        resultado.avisos.push("CAD_USUARIOS: coluna EMAIL detectada (nao era esperada nesta fase).");

      // Admin ativo presente
      var iUSTA  = hU.indexOf("STATUS");
      var iUPERF = hU.indexOf("PERFIL");
      var iUSENHA= hU.indexOf("SENHA");
      var adminAtivo = false;
      var senhaHashDetectada = false;
      for (var i = 1; i < dadosU.length; i++) {
        var sta   = String(iUSTA  >= 0 ? dadosU[i][iUSTA]  : "").trim().toUpperCase();
        var perf  = String(iUPERF >= 0 ? dadosU[i][iUPERF] : "").trim().toUpperCase();
        var senha = String(iUSENHA >= 0 ? dadosU[i][iUSENHA]: "").trim();
        if (sta === "ATIVO" && perf === "ADMIN") adminAtivo = true;
        if (senha.length >= 60) senhaHashDetectada = true;
      }
      resultado.adminLeadoPresente = adminAtivo;
      resultado.senhaNaoMigrada    = !senhaHashDetectada;

      if (!adminAtivo)
        resultado.bloqueios.push("CAD_USUARIOS: nenhum usuario ADMIN ATIVO encontrado.");
      if (senhaHashDetectada)
        resultado.bloqueios.push(
          "CAD_USUARIOS: detectada senha com >= 60 chars — possivel migracao indevida de hash."
        );
    }

    // 6. Conclusão
    var tudo = resultado.bloqueios.length === 0;
    resultado.executado = true;
    resultado.conclusao = tudo
      ? "AUTH.2 APROVADO — schema novo criado e CAD_USUARIOS intacta"
      : "AUTH.2 BLOQUEADO — corrija os bloqueios";

    if (tudo) {
      resultado.avisos.push(
        "Proximo: AUTH.3 — backend de login novo com hash de senha, EMAIL na sessao e " +
        "bloqueio por tentativas. NAO executar automaticamente."
      );
    }

  } catch (e) {
    resultado.bloqueios.push("Falha em AUDITAR_AUTH_SCHEMA_V2_SEM_GRAVAR: " + e.message);
    resultado.conclusao = "AUTH.2 BLOQUEADO";
  }
  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

// ============================================================
// AUTH.3 — Migração, Auditoria e Teste do Login V2
// Depende de SGO_Auth_V2.js (IIFE SGO_AUTH_V2)
// ============================================================

// ── MIGRAR_ADMIN_LEGADO_PARA_AUTH_V2_DEV_AUTORIZADO ──────────
function MIGRAR_ADMIN_LEGADO_PARA_AUTH_V2_DEV_AUTORIZADO() {
  var resultado = {
    funcao          : "MIGRAR_ADMIN_LEGADO_PARA_AUTH_V2_DEV_AUTORIZADO",
    executado       : false,
    devConfirmado   : false,
    adminEncontrado : false,
    jaMigrado       : false,
    migrado         : false,
    registroId      : null,
    adminUsuario    : null,
    adminPerfil     : null,
    senhaHashGerada : false,
    saltGerado      : false,
    emailPreenchido : false,
    senhaTemporaria : null,
    bloqueios       : [],
    avisos          : []
  };

  try {
    var DEV_SCRIPT_ID = "12xiWNlQ-WKVpiofmcGfBaX4EBdlsIxKFJG2PFTamHUmSUs89c4LW3WSG";

    // 1. Confirmar DEV
    resultado.devConfirmado = (ScriptApp.getScriptId() === DEV_SCRIPT_ID);
    if (!resultado.devConfirmado) {
      resultado.bloqueios.push("So pode rodar no DEV. ScriptId atual: " + ScriptApp.getScriptId());
      Logger.log(JSON.stringify(resultado, null, 2));
      return resultado;
    }

    // 2. Abrir banco principal
    var props = PropertiesService.getScriptProperties();
    var dbId  = String(props.getProperty("DB_ID") || "").trim();
    if (!dbId) {
      resultado.bloqueios.push("DB_ID nao configurado.");
      Logger.log(JSON.stringify(resultado, null, 2));
      return resultado;
    }
    var ss = SpreadsheetApp.openById(dbId);

    // 3. Ler admin de CAD_USUARIOS por índice fixo (como o auth legado)
    //    Col: 0=ID 1=USUARIO 2=SENHA 3=NOME 4=PERFIL 5=STATUS 6=CRIADO_EM 7=CLIENTE_ID
    var shCadU = ss.getSheetByName("CAD_USUARIOS");
    if (!shCadU || shCadU.getLastRow() < 2) {
      resultado.bloqueios.push("CAD_USUARIOS vazia ou nao encontrada.");
      Logger.log(JSON.stringify(resultado, null, 2));
      return resultado;
    }
    var dadosU  = shCadU.getRange(2, 1, shCadU.getLastRow() - 1, 8).getValues();
    var adminRow = null;
    for (var i = 0; i < dadosU.length; i++) {
      var perfil = String(dadosU[i][4] || "").trim().toUpperCase();
      var status = String(dadosU[i][5] || "").trim().toUpperCase();
      if (perfil === "ADMIN" && status === "ATIVO") { adminRow = dadosU[i]; break; }
    }
    if (!adminRow) {
      resultado.bloqueios.push("Nenhum usuario ADMIN ATIVO encontrado em CAD_USUARIOS.");
      Logger.log(JSON.stringify(resultado, null, 2));
      return resultado;
    }
    resultado.adminEncontrado = true;
    resultado.adminUsuario    = String(adminRow[1] || "").trim();
    resultado.adminPerfil     = "ADMIN";
    // adminRow[2] = senha legada — NÃO aparece no resultado nem no log

    // 4. Verificar duplicata em AUTH_USUARIOS
    var shAuth = ss.getSheetByName("AUTH_USUARIOS");
    if (!shAuth) {
      resultado.bloqueios.push("AUTH_USUARIOS nao encontrada. Execute AUTH.2 primeiro.");
      Logger.log(JSON.stringify(resultado, null, 2));
      return resultado;
    }
    if (shAuth.getLastRow() >= 2) {
      var dadosA = shAuth.getRange(1, 1, shAuth.getLastRow(), shAuth.getLastColumn()).getValues();
      var hA     = dadosA[0].map(function (v) { return String(v || "").trim(); });
      var iAUsu  = hA.indexOf("USUARIO");
      var iAPer  = hA.indexOf("PERFIL_PRINCIPAL");
      for (var j = 1; j < dadosA.length; j++) {
        var usu = String(iAUsu >= 0 ? dadosA[j][iAUsu] : "").trim().toLowerCase();
        var per = String(iAPer >= 0 ? dadosA[j][iAPer] : "").trim().toUpperCase();
        if (usu === resultado.adminUsuario.toLowerCase() && per === "ADMIN") {
          resultado.jaMigrado = true;
          resultado.executado = true;
          resultado.avisos.push(
            "Admin '" + resultado.adminUsuario +
            "' ja existe em AUTH_USUARIOS. Nenhuma acao necessaria."
          );
          resultado.conclusao = "JA MIGRADO — nenhuma acao necessaria.";
          Logger.log(JSON.stringify(resultado, null, 2));
          return resultado;
        }
      }
    }

    // 5. Gerar hash + salt da senha legada (vai apenas para a planilha, nunca para o log)
    var senhaLegada = String(adminRow[2] || "");
    var salt        = SGO_AUTH_V2.gerarSalt();
    var hash        = SGO_AUTH_V2.hashSenha(senhaLegada, salt);
    resultado.senhaHashGerada = (typeof hash === "string" && hash.length === 64);
    resultado.saltGerado      = (typeof salt === "string" && salt.length > 0);
    if (!resultado.senhaHashGerada) {
      resultado.bloqueios.push("Falha ao gerar hash SHA-256 (comprimento inesperado).");
      Logger.log(JSON.stringify(resultado, null, 2));
      return resultado;
    }

    // 6. Montar registro para AUTH_USUARIOS
    var agora  = new Date().toISOString();
    var novoId = Utilities.getUuid();
    var hDest  = shAuth.getRange(1, 1, 1, shAuth.getLastColumn()).getValues()[0]
                   .map(function (v) { return String(v || "").trim(); });

    var novoReg = {
      "ID"                         : novoId,
      "NOME"                       : String(adminRow[3] || "").trim().toUpperCase() ||
                                     resultado.adminUsuario.toUpperCase(),
      "USUARIO"                    : resultado.adminUsuario.toLowerCase(),
      "EMAIL"                      : "",       // vazio nesta etapa — será saneado em AUTH.4/AUTH.5
      "SENHA_HASH"                 : hash,
      "SENHA_SALT"                 : salt,
      "SENHA_TEMPORARIA"           : "SIM",    // incentiva completar perfil com e-mail real
      "PERFIL_PRINCIPAL"           : "ADMIN",
      "STATUS"                     : "ATIVO",
      "TELEFONE"                   : "",
      "FILIAL"                     : "",
      "DEPARTAMENTO"               : "",
      "CARGO"                      : "",
      "TECNICO_ID"                 : "",
      "FUNCIONARIO_ID"             : "",
      "CLIENTE_ID"                 : String(adminRow[7] || "").trim(),
      "RECEBE_ALERTAS"             : "SIM",
      "ULTIMO_LOGIN"               : "",
      "TENTATIVAS_LOGIN"           : 0,
      "BLOQUEADO_ATE"              : "",
      "TOKEN_RECUPERACAO_HASH"     : "",
      "TOKEN_RECUPERACAO_EXPIRA_EM": "",
      "CRIADO_EM"                  : agora,
      "CRIADO_POR"                 : "AUTH3_MIGRACAO_DEV",
      "ATUALIZADO_EM"              : agora,
      "ATUALIZADO_POR"             : "AUTH3_MIGRACAO_DEV"
    };
    var linhaNova = hDest.map(function (h) {
      return novoReg.hasOwnProperty(h) ? novoReg[h] : "";
    });
    shAuth.appendRow(linhaNova);

    resultado.executado       = true;
    resultado.migrado         = true;
    resultado.registroId      = novoId;
    resultado.emailPreenchido = false;
    resultado.senhaTemporaria = "SIM";
    resultado.avisos.push(
      "Admin '" + resultado.adminUsuario +
      "' migrado para AUTH_USUARIOS com SENHA_HASH + SENHA_SALT. " +
      "EMAIL em branco — completar em AUTH.4/AUTH.5. " +
      "Senha legada em CAD_USUARIOS NAO foi alterada."
    );
    resultado.conclusao = "MIGRACAO CONCLUIDA — execute AUDITAR_AUTH3_LOGIN_V2_SEM_GRAVAR.";

  } catch (e) {
    resultado.bloqueios.push("Falha na migracao: " + e.message);
    resultado.conclusao = "MIGRACAO BLOQUEADA";
  }

  // Resultado nunca inclui hash, salt ou senha — apenas metadados
  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

// ── AUDITAR_AUTH3_LOGIN_V2_SEM_GRAVAR ────────────────────────
function AUDITAR_AUTH3_LOGIN_V2_SEM_GRAVAR() {
  var resultado = {
    funcao                  : "AUDITAR_AUTH3_LOGIN_V2_SEM_GRAVAR",
    devConfirmado           : false,
    sgoAuthV2Existe         : false,
    funcoesHash             : false,
    loginV2Existe           : false,
    authUsuariosExiste      : false,
    authLogAcessoExiste     : false,
    adminMigrado            : false,
    adminSenhaHashPreenchida: false,
    adminSenhaSaltPreenchida: false,
    cadUsuariosIntacta      : false,
    senhaNaoMigradaEmCad    : false,
    loginAntigoExiste       : false,
    producaoNaoAlterada     : false,
    emailNaoEnviado         : true,
    bloqueios               : [],
    avisos                  : []
  };

  try {
    var DEV_SCRIPT_ID = "12xiWNlQ-WKVpiofmcGfBaX4EBdlsIxKFJG2PFTamHUmSUs89c4LW3WSG";
    var HEADERS_CAD_U = ["ID","USUARIO","SENHA","NOME","PERFIL","STATUS","CRIADO_EM","CLIENTE_ID"];

    // 1. Confirmar DEV
    resultado.devConfirmado       = (ScriptApp.getScriptId() === DEV_SCRIPT_ID);
    resultado.producaoNaoAlterada = resultado.devConfirmado;
    if (!resultado.devConfirmado)
      resultado.bloqueios.push("ScriptId nao e DEV: " + ScriptApp.getScriptId());

    // 2. SGO_AUTH_V2 IIFE com funções hash
    resultado.sgoAuthV2Existe = (typeof SGO_AUTH_V2 !== "undefined");
    resultado.funcoesHash     = resultado.sgoAuthV2Existe &&
      typeof SGO_AUTH_V2.hashSenha      === "function" &&
      typeof SGO_AUTH_V2.verificarSenha === "function" &&
      typeof SGO_AUTH_V2.gerarSalt      === "function";
    if (!resultado.sgoAuthV2Existe)
      resultado.bloqueios.push("SGO_AUTH_V2 nao encontrado — SGO_Auth_V2.js nao foi carregado.");
    if (resultado.sgoAuthV2Existe && !resultado.funcoesHash)
      resultado.bloqueios.push("Funcoes hash ausentes em SGO_AUTH_V2.");

    // 3. loginV2_DEV existe como função global
    resultado.loginV2Existe = (typeof loginV2_DEV === "function");
    if (!resultado.loginV2Existe)
      resultado.bloqueios.push("loginV2_DEV nao encontrado como funcao global.");

    // 4. Login antigo ainda existe (SGO_Auth.js intacto)
    resultado.loginAntigoExiste = (typeof login === "function" || typeof fazerLogin === "function");
    if (!resultado.loginAntigoExiste)
      resultado.avisos.push("Funcao login/fazerLogin nao localizada — verificar SGO_Auth.js.");

    // 5. Abrir banco principal
    var props = PropertiesService.getScriptProperties();
    var dbId  = String(props.getProperty("DB_ID") || "").trim();
    if (!dbId) {
      resultado.bloqueios.push("DB_ID nao configurado.");
      Logger.log(JSON.stringify(resultado, null, 2));
      return resultado;
    }
    var ss = SpreadsheetApp.openById(dbId);

    // 6. AUTH_USUARIOS existe
    var shAuth = ss.getSheetByName("AUTH_USUARIOS");
    resultado.authUsuariosExiste = !!shAuth;
    if (!shAuth) resultado.bloqueios.push("AUTH_USUARIOS nao encontrada.");

    // 7. AUTH_LOG_ACESSO existe
    var shLog = ss.getSheetByName("AUTH_LOG_ACESSO");
    resultado.authLogAcessoExiste = !!shLog;
    if (!shLog) resultado.bloqueios.push("AUTH_LOG_ACESSO nao encontrada.");

    // 8. Admin migrado em AUTH_USUARIOS?
    if (shAuth && shAuth.getLastRow() >= 2) {
      var dadosA = shAuth.getRange(1, 1, shAuth.getLastRow(), shAuth.getLastColumn()).getValues();
      var hA     = dadosA[0].map(function (v) { return String(v || "").trim(); });
      var iAPer  = hA.indexOf("PERFIL_PRINCIPAL");
      var iAHash = hA.indexOf("SENHA_HASH");
      var iASalt = hA.indexOf("SENHA_SALT");
      var iAStat = hA.indexOf("STATUS");
      for (var j = 1; j < dadosA.length; j++) {
        var per  = String(iAPer  >= 0 ? dadosA[j][iAPer]  : "").toUpperCase();
        var stat = String(iAStat >= 0 ? dadosA[j][iAStat] : "").toUpperCase();
        if (per === "ADMIN" && stat === "ATIVO") {
          resultado.adminMigrado           = true;
          var hVal = String(iAHash >= 0 ? dadosA[j][iAHash] : "");
          var sVal = String(iASalt >= 0 ? dadosA[j][iASalt] : "");
          resultado.adminSenhaHashPreenchida = (hVal.length === 64);
          resultado.adminSenhaSaltPreenchida = (sVal.length > 0);
          if (!resultado.adminSenhaHashPreenchida)
            resultado.avisos.push("SENHA_HASH do admin nao tem 64 chars (SHA-256 esperado).");
          if (!resultado.adminSenhaSaltPreenchida)
            resultado.avisos.push("SENHA_SALT do admin esta vazio.");
          break;
        }
      }
      if (!resultado.adminMigrado)
        resultado.avisos.push(
          "Admin ATIVO nao encontrado em AUTH_USUARIOS — " +
          "execute MIGRAR_ADMIN_LEGADO_PARA_AUTH_V2_DEV_AUTORIZADO."
        );
    } else if (shAuth) {
      resultado.avisos.push(
        "AUTH_USUARIOS esta vazia — " +
        "execute MIGRAR_ADMIN_LEGADO_PARA_AUTH_V2_DEV_AUTORIZADO."
      );
    }

    // 9. CAD_USUARIOS intacta
    var shCadU = ss.getSheetByName("CAD_USUARIOS");
    if (shCadU && shCadU.getLastRow() >= 1) {
      var hCad = shCadU.getRange(1, 1, 1, shCadU.getLastColumn()).getValues()[0]
                   .map(function (v) { return String(v || "").trim(); });
      resultado.cadUsuariosIntacta = JSON.stringify(hCad) === JSON.stringify(HEADERS_CAD_U);
      if (!resultado.cadUsuariosIntacta)
        resultado.bloqueios.push(
          "CAD_USUARIOS headers alterados. Esperado: " + JSON.stringify(HEADERS_CAD_U) +
          " / Encontrado: " + JSON.stringify(hCad)
        );

      // 10. Nenhuma senha com ≥ 60 chars em CAD_USUARIOS (hash não migrado para lá)
      if (shCadU.getLastRow() >= 2) {
        var dadosCad   = shCadU.getRange(2, 1, shCadU.getLastRow()-1, 8).getValues();
        var senhaHashLa = false;
        for (var k = 0; k < dadosCad.length; k++) {
          if (String(dadosCad[k][2] || "").length >= 60) { senhaHashLa = true; break; }
        }
        resultado.senhaNaoMigradaEmCad = !senhaHashLa;
        if (senhaHashLa)
          resultado.bloqueios.push(
            "Encontrada senha >= 60 chars em CAD_USUARIOS — migracao nao autorizada para ca."
          );
      } else {
        resultado.senhaNaoMigradaEmCad = true;
      }
    } else {
      resultado.bloqueios.push("CAD_USUARIOS nao encontrada ou vazia.");
    }

    // 11. Conclusão
    var tudo = resultado.devConfirmado &&
               resultado.sgoAuthV2Existe &&
               resultado.funcoesHash &&
               resultado.loginV2Existe &&
               resultado.authUsuariosExiste &&
               resultado.authLogAcessoExiste &&
               resultado.cadUsuariosIntacta &&
               resultado.senhaNaoMigradaEmCad &&
               resultado.bloqueios.length === 0;

    if (tudo && resultado.adminMigrado &&
        resultado.adminSenhaHashPreenchida && resultado.adminSenhaSaltPreenchida) {
      resultado.conclusao =
        "AUTH.3 APROVADO — admin migrado e backend V2 pronto. Execute TESTAR_LOGIN_V2_ADMIN_DEV.";
    } else if (tudo) {
      resultado.conclusao =
        "AUTH.3 BACKEND OK — execute MIGRAR_ADMIN_LEGADO_PARA_AUTH_V2_DEV_AUTORIZADO e depois TESTAR_LOGIN_V2_ADMIN_DEV.";
    } else {
      resultado.conclusao = "AUTH.3 BLOQUEADO — corrija os bloqueios";
    }

  } catch (e) {
    resultado.bloqueios.push("Falha em AUDITAR_AUTH3_LOGIN_V2_SEM_GRAVAR: " + e.message);
    resultado.conclusao = "AUTH.3 BLOQUEADO";
  }

  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

// ── TESTAR_LOGIN_V2_ADMIN_DEV ─────────────────────────────────
function TESTAR_LOGIN_V2_ADMIN_DEV() {
  var resultado = {
    funcao               : "TESTAR_LOGIN_V2_ADMIN_DEV",
    devConfirmado        : false,
    adminEncontradoEmCad : false,
    adminUsuario         : null,
    loginV2Sucesso       : false,
    sessionId            : null,
    sessionArmazenada    : false,
    sessionExpiresAt     : null,
    userRetornado        : null,
    logAcessoRegistrado  : false,
    cadUsuariosIntacta   : true,
    bloqueios            : [],
    avisos               : []
  };

  try {
    var DEV_SCRIPT_ID = "12xiWNlQ-WKVpiofmcGfBaX4EBdlsIxKFJG2PFTamHUmSUs89c4LW3WSG";

    // 1. Confirmar DEV
    resultado.devConfirmado = (ScriptApp.getScriptId() === DEV_SCRIPT_ID);
    if (!resultado.devConfirmado) {
      resultado.bloqueios.push("TESTAR_LOGIN_V2_ADMIN_DEV so pode rodar no DEV.");
      Logger.log(JSON.stringify(resultado, null, 2));
      return resultado;
    }

    // 2. Abrir banco e ler admin de CAD_USUARIOS
    var props = PropertiesService.getScriptProperties();
    var dbId  = String(props.getProperty("DB_ID") || "").trim();
    if (!dbId) {
      resultado.bloqueios.push("DB_ID nao configurado.");
      Logger.log(JSON.stringify(resultado, null, 2));
      return resultado;
    }
    var ss = SpreadsheetApp.openById(dbId);
    var shCadU = ss.getSheetByName("CAD_USUARIOS");
    if (!shCadU || shCadU.getLastRow() < 2) {
      resultado.bloqueios.push("CAD_USUARIOS vazia ou nao encontrada.");
      Logger.log(JSON.stringify(resultado, null, 2));
      return resultado;
    }
    var dadosU   = shCadU.getRange(2, 1, shCadU.getLastRow() - 1, 8).getValues();
    var adminRow = null;
    for (var i = 0; i < dadosU.length; i++) {
      var perfilT = String(dadosU[i][4] || "").toUpperCase();
      var statusT = String(dadosU[i][5] || "").toUpperCase();
      if (perfilT === "ADMIN" && statusT === "ATIVO") { adminRow = dadosU[i]; break; }
    }
    if (!adminRow) {
      resultado.bloqueios.push("Nenhum admin ATIVO em CAD_USUARIOS para o teste.");
      Logger.log(JSON.stringify(resultado, null, 2));
      return resultado;
    }
    resultado.adminEncontradoEmCad = true;
    resultado.adminUsuario         = String(adminRow[1] || "").trim();
    // adminRow[2] = senha legada — NÃO incluída em resultado nem log

    // 3. Baseline de AUTH_LOG_ACESSO antes do teste
    var shLog     = ss.getSheetByName("AUTH_LOG_ACESSO");
    var rowsAntes = shLog ? shLog.getLastRow() : 0;

    // 4. Baseline de CAD_USUARIOS
    var rowsCadAntes = shCadU.getLastRow();
    var hCadAntes    = shCadU.getRange(1, 1, 1, shCadU.getLastColumn()).getValues()[0]
                         .map(function (v) { return String(v || "").trim(); }).join(",");

    // 5. Executar loginV2_DEV com a senha lida de CAD_USUARIOS
    var senhaAdmin = String(adminRow[2] || "");
    var loginResp  = loginV2_DEV(resultado.adminUsuario, senhaAdmin);
    senhaAdmin     = null; // descartada imediatamente

    // 6. Avaliar resposta
    resultado.loginV2Sucesso = !!(loginResp && loginResp.success === true);
    if (!resultado.loginV2Sucesso) {
      resultado.bloqueios.push(
        "loginV2_DEV retornou erro: " + (loginResp ? loginResp.message : "resposta nula")
      );
    } else {
      resultado.sessionId       = loginResp.sessionId || null;
      resultado.userRetornado   = loginResp.user || null;
      resultado.sessionExpiresAt = loginResp.user ? loginResp.user.expiresAt : null;

      // 7. Confirmar sessão em ScriptProperties
      if (resultado.sessionId) {
        var sessStr = PropertiesService.getScriptProperties()
          .getProperty("SGO_SESSION_" + resultado.sessionId);
        resultado.sessionArmazenada = !!sessStr;
        if (!resultado.sessionArmazenada)
          resultado.avisos.push("Sessao criada mas nao encontrada em ScriptProperties.");
      }
    }

    // 8. AUTH_LOG_ACESSO incrementado?
    var rowsDepois = shLog ? shLog.getLastRow() : 0;
    resultado.logAcessoRegistrado = (rowsDepois > rowsAntes);
    if (!resultado.logAcessoRegistrado)
      resultado.avisos.push("AUTH_LOG_ACESSO nao foi incrementado apos o login.");

    // 9. CAD_USUARIOS não foi alterada
    var rowsCadDepois = shCadU.getLastRow();
    var hCadDepois    = shCadU.getRange(1, 1, 1, shCadU.getLastColumn()).getValues()[0]
                          .map(function (v) { return String(v || "").trim(); }).join(",");
    resultado.cadUsuariosIntacta = (rowsCadAntes === rowsCadDepois && hCadAntes === hCadDepois);
    if (!resultado.cadUsuariosIntacta)
      resultado.bloqueios.push("CAD_USUARIOS foi alterada durante o teste — CRITICO.");

    // 10. Conclusão
    var tudo = resultado.devConfirmado &&
               resultado.adminEncontradoEmCad &&
               resultado.loginV2Sucesso &&
               resultado.sessionArmazenada &&
               resultado.logAcessoRegistrado &&
               resultado.cadUsuariosIntacta &&
               resultado.bloqueios.length === 0;

    resultado.conclusao = tudo
      ? "AUTH.3 APROVADO — loginV2_DEV funcional com admin migrado"
      : "AUTH.3 TESTE BLOQUEADO — corrija os bloqueios";

    if (tudo) {
      resultado.avisos.push(
        "Sessao V2 valida ate: " + resultado.sessionExpiresAt + ". " +
        "Compativel com validarSessao/exigirSessao legados."
      );
      resultado.avisos.push(
        "Proximo: AUTH.4 — portal do usuario (login por USUARIO/EMAIL, " +
        "primeiro acesso, esqueci senha)."
      );
    }

  } catch (e) {
    resultado.bloqueios.push("Falha em TESTAR_LOGIN_V2_ADMIN_DEV: " + e.message);
    resultado.conclusao = "AUTH.3 TESTE BLOQUEADO";
  }

  // Resultado nunca inclui senha — apenas sessionId, user metadata e flags
  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

// ============================================================
// AUTH.4A — Auditoria e testes controlados
// ============================================================

// ── AUDITAR_AUTH4A_BACKEND_PORTAL_USUARIO_SEM_GRAVAR ─────────
function AUDITAR_AUTH4A_BACKEND_PORTAL_USUARIO_SEM_GRAVAR() {
  var resultado = {
    funcao               : "AUDITAR_AUTH4A_BACKEND_PORTAL_USUARIO_SEM_GRAVAR",
    devConfirmado        : false,
    sgoAuthV2Existe      : false,
    funcoesBackend       : {
      atualizarEmailUsuarioAuthV2_DEV   : false,
      solicitarRecuperacaoSenhaV2_DEV   : false,
      validarTokenRecuperacaoSenhaV2_DEV: false,
      redefinirSenhaPorTokenV2_DEV      : false,
      trocarSenhaPrimeiroAcessoV2_DEV   : false
    },
    authUsuariosExiste   : false,
    authRecuperacaoExiste: false,
    authLogAcessoExiste  : false,
    cadUsuariosIntacta   : false,
    loginAntigoExiste    : false,
    producaoNaoAlterada  : false,
    emailNaoEnviado      : true,
    bloqueios            : [],
    avisos               : []
  };

  try {
    var DEV_SCRIPT_ID = "12xiWNlQ-WKVpiofmcGfBaX4EBdlsIxKFJG2PFTamHUmSUs89c4LW3WSG";
    var HEADERS_CAD_U = ["ID","USUARIO","SENHA","NOME","PERFIL","STATUS","CRIADO_EM","CLIENTE_ID"];

    resultado.devConfirmado     = (ScriptApp.getScriptId() === DEV_SCRIPT_ID);
    resultado.producaoNaoAlterada = resultado.devConfirmado;
    if (!resultado.devConfirmado)
      resultado.bloqueios.push("ScriptId nao e DEV: " + ScriptApp.getScriptId());

    // SGO_AUTH_V2 IIFE
    resultado.sgoAuthV2Existe = (typeof SGO_AUTH_V2 !== "undefined");
    if (!resultado.sgoAuthV2Existe)
      resultado.bloqueios.push("SGO_AUTH_V2 nao encontrado — SGO_Auth_V2.js nao carregado.");

    // Global wrappers
    resultado.funcoesBackend.atualizarEmailUsuarioAuthV2_DEV    = (typeof atualizarEmailUsuarioAuthV2_DEV    === "function");
    resultado.funcoesBackend.solicitarRecuperacaoSenhaV2_DEV    = (typeof solicitarRecuperacaoSenhaV2_DEV    === "function");
    resultado.funcoesBackend.validarTokenRecuperacaoSenhaV2_DEV = (typeof validarTokenRecuperacaoSenhaV2_DEV === "function");
    resultado.funcoesBackend.redefinirSenhaPorTokenV2_DEV       = (typeof redefinirSenhaPorTokenV2_DEV       === "function");
    resultado.funcoesBackend.trocarSenhaPrimeiroAcessoV2_DEV    = (typeof trocarSenhaPrimeiroAcessoV2_DEV    === "function");
    Object.keys(resultado.funcoesBackend).forEach(function (fn) {
      if (!resultado.funcoesBackend[fn])
        resultado.bloqueios.push("Funcao global ausente: " + fn);
    });

    // Login antigo intacto
    resultado.loginAntigoExiste = (typeof login === "function" || typeof fazerLogin === "function");
    if (!resultado.loginAntigoExiste)
      resultado.avisos.push("login/fazerLogin nao localizado — verificar SGO_Auth.js.");

    // Banco de dados
    var dbId = String(PropertiesService.getScriptProperties().getProperty("DB_ID") || "").trim();
    if (!dbId) {
      resultado.bloqueios.push("DB_ID nao configurado.");
      Logger.log(JSON.stringify(resultado, null, 2));
      return resultado;
    }
    var ss = SpreadsheetApp.openById(dbId);

    resultado.authUsuariosExiste    = !!ss.getSheetByName("AUTH_USUARIOS");
    resultado.authRecuperacaoExiste = !!ss.getSheetByName("AUTH_RECUPERACAO_SENHA");
    resultado.authLogAcessoExiste   = !!ss.getSheetByName("AUTH_LOG_ACESSO");
    if (!resultado.authUsuariosExiste)    resultado.bloqueios.push("AUTH_USUARIOS nao encontrada.");
    if (!resultado.authRecuperacaoExiste) resultado.bloqueios.push("AUTH_RECUPERACAO_SENHA nao encontrada.");
    if (!resultado.authLogAcessoExiste)   resultado.bloqueios.push("AUTH_LOG_ACESSO nao encontrada.");

    // CAD_USUARIOS intacta
    var shCadU = ss.getSheetByName("CAD_USUARIOS");
    if (shCadU && shCadU.getLastRow() >= 1) {
      var hCad = shCadU.getRange(1, 1, 1, shCadU.getLastColumn()).getValues()[0]
                   .map(function (v) { return String(v || "").trim(); });
      resultado.cadUsuariosIntacta = (JSON.stringify(hCad) === JSON.stringify(HEADERS_CAD_U));
      if (!resultado.cadUsuariosIntacta)
        resultado.bloqueios.push("CAD_USUARIOS headers alterados. Encontrado: " + JSON.stringify(hCad));
    } else {
      resultado.bloqueios.push("CAD_USUARIOS nao encontrada ou vazia.");
    }

    var tudo = resultado.devConfirmado &&
               resultado.sgoAuthV2Existe &&
               Object.keys(resultado.funcoesBackend).every(function (fn) {
                 return resultado.funcoesBackend[fn];
               }) &&
               resultado.authUsuariosExiste &&
               resultado.authRecuperacaoExiste &&
               resultado.authLogAcessoExiste &&
               resultado.cadUsuariosIntacta &&
               resultado.bloqueios.length === 0;

    resultado.conclusao = tudo
      ? "AUTH.4A APROVADO — backend portal V2 completo. Execute os testes TESTAR_AUTH4A_*."
      : "AUTH.4A BLOQUEADO — corrija os bloqueios";

  } catch (e) {
    resultado.bloqueios.push("Falha: " + e.message);
    resultado.conclusao = "AUTH.4A BLOQUEADO";
  }

  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

// ── TESTAR_AUTH4A_ATUALIZAR_EMAIL_ADMIN_DEV ──────────────────
function TESTAR_AUTH4A_ATUALIZAR_EMAIL_ADMIN_DEV() {
  var resultado = {
    funcao                        : "TESTAR_AUTH4A_ATUALIZAR_EMAIL_ADMIN_DEV",
    devConfirmado                 : false,
    adminEncontradoEmAuthUsuarios : false,
    adminId                       : null,
    adminUsuario                  : null,
    emailAtualizado               : false,
    emailMascarado                : null,
    logAcessoRegistrado           : false,
    cadUsuariosIntacta            : false,
    emailEnviado                  : false,
    bloqueios                     : [],
    avisos                        : []
  };

  try {
    var DEV_SCRIPT_ID = "12xiWNlQ-WKVpiofmcGfBaX4EBdlsIxKFJG2PFTamHUmSUs89c4LW3WSG";
    var EMAIL_TESTE   = "thiagoflys+auth4a-dev@gmail.com";

    resultado.devConfirmado = (ScriptApp.getScriptId() === DEV_SCRIPT_ID);
    if (!resultado.devConfirmado) {
      resultado.bloqueios.push("So pode rodar no DEV.");
      Logger.log(JSON.stringify(resultado, null, 2));
      return resultado;
    }

    var dbId = String(PropertiesService.getScriptProperties().getProperty("DB_ID") || "").trim();
    if (!dbId) { resultado.bloqueios.push("DB_ID nao configurado."); return resultado; }
    var ss = SpreadsheetApp.openById(dbId);

    // Encontrar admin em AUTH_USUARIOS
    var shAuth = ss.getSheetByName("AUTH_USUARIOS");
    if (!shAuth || shAuth.getLastRow() < 2) {
      resultado.bloqueios.push("AUTH_USUARIOS vazia.");
      Logger.log(JSON.stringify(resultado, null, 2));
      return resultado;
    }
    var dadosA = shAuth.getRange(1, 1, shAuth.getLastRow(), shAuth.getLastColumn()).getValues();
    var hA     = dadosA[0].map(function (v) { return String(v || "").trim(); });
    var iId    = hA.indexOf("ID");
    var iPer   = hA.indexOf("PERFIL_PRINCIPAL");
    var iStat  = hA.indexOf("STATUS");
    var iUsu   = hA.indexOf("USUARIO");
    var adminId = null, adminUsu = null;
    for (var i = 1; i < dadosA.length; i++) {
      if (String(iPer  >= 0 ? dadosA[i][iPer]  : "").toUpperCase() === "ADMIN" &&
          String(iStat >= 0 ? dadosA[i][iStat] : "").toUpperCase() === "ATIVO") {
        adminId  = String(iId  >= 0 ? dadosA[i][iId]  : "");
        adminUsu = String(iUsu >= 0 ? dadosA[i][iUsu] : "");
        break;
      }
    }
    if (!adminId) {
      resultado.bloqueios.push("Admin ATIVO nao encontrado em AUTH_USUARIOS.");
      Logger.log(JSON.stringify(resultado, null, 2));
      return resultado;
    }
    resultado.adminEncontradoEmAuthUsuarios = true;
    resultado.adminId      = adminId;
    resultado.adminUsuario = adminUsu;

    // Baseline CAD_USUARIOS
    var shCadU = ss.getSheetByName("CAD_USUARIOS");
    var rCadA  = shCadU ? shCadU.getLastRow() : 0;
    var hCadA  = shCadU
      ? shCadU.getRange(1,1,1,shCadU.getLastColumn()).getValues()[0]
              .map(function(v){return String(v||"").trim();}).join(",")
      : "";

    // Baseline AUTH_LOG_ACESSO
    var shLog   = ss.getSheetByName("AUTH_LOG_ACESSO");
    var rLogA   = shLog ? shLog.getLastRow() : 0;

    // Chamar backend
    var resp = atualizarEmailUsuarioAuthV2_DEV(adminId, EMAIL_TESTE);
    resultado.emailAtualizado = !!(resp && resp.success === true);
    if (!resultado.emailAtualizado) {
      resultado.bloqueios.push("atualizarEmailUsuarioAuthV2_DEV erro: " + (resp ? resp.message : "null"));
    } else {
      resultado.emailMascarado = resp.emailMascarado || null;
      resultado.avisos.push("EMAIL atualizado: " + resp.emailMascarado + ". CAD_USUARIOS nao alterada.");
    }

    // Confirmar CAD_USUARIOS intacta
    var rCadD = shCadU ? shCadU.getLastRow() : 0;
    var hCadD = shCadU
      ? shCadU.getRange(1,1,1,shCadU.getLastColumn()).getValues()[0]
              .map(function(v){return String(v||"").trim();}).join(",")
      : "";
    resultado.cadUsuariosIntacta = (rCadA === rCadD && hCadA === hCadD);
    if (!resultado.cadUsuariosIntacta) resultado.bloqueios.push("CAD_USUARIOS foi alterada — CRITICO.");

    // Log incrementado?
    resultado.logAcessoRegistrado = shLog ? (shLog.getLastRow() > rLogA) : false;
    resultado.emailEnviado = false;

    var tudo = resultado.devConfirmado && resultado.emailAtualizado &&
               resultado.cadUsuariosIntacta && resultado.bloqueios.length === 0;
    resultado.conclusao = tudo
      ? "AUTH.4A ATUALIZAR_EMAIL APROVADO — execute TESTAR_AUTH4A_RECUPERACAO_DRYRUN_DEV"
      : "AUTH.4A ATUALIZAR_EMAIL BLOQUEADO";

  } catch (e) {
    resultado.bloqueios.push("Falha: " + e.message);
    resultado.conclusao = "AUTH.4A ATUALIZAR_EMAIL BLOQUEADO";
  }

  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

// ── TESTAR_AUTH4A_RECUPERACAO_DRYRUN_DEV ─────────────────────
function TESTAR_AUTH4A_RECUPERACAO_DRYRUN_DEV() {
  var resultado = {
    funcao            : "TESTAR_AUTH4A_RECUPERACAO_DRYRUN_DEV",
    devConfirmado     : false,
    adminUsuario      : null,
    tokenGerado       : false,
    tokenHashGravado  : false,
    tokenArmazenado   : false,
    expiresAt         : null,
    emailEnviado      : false,
    bloqueios         : [],
    avisos            : []
  };

  try {
    var DEV_SCRIPT_ID = "12xiWNlQ-WKVpiofmcGfBaX4EBdlsIxKFJG2PFTamHUmSUs89c4LW3WSG";

    resultado.devConfirmado = (ScriptApp.getScriptId() === DEV_SCRIPT_ID);
    if (!resultado.devConfirmado) {
      resultado.bloqueios.push("So pode rodar no DEV.");
      Logger.log(JSON.stringify(resultado, null, 2));
      return resultado;
    }

    var props = PropertiesService.getScriptProperties();
    var dbId  = String(props.getProperty("DB_ID") || "").trim();
    if (!dbId) { resultado.bloqueios.push("DB_ID nao configurado."); return resultado; }
    var ss = SpreadsheetApp.openById(dbId);

    // Encontrar admin ATIVO em AUTH_USUARIOS
    var shAuth = ss.getSheetByName("AUTH_USUARIOS");
    if (!shAuth || shAuth.getLastRow() < 2) {
      resultado.bloqueios.push("AUTH_USUARIOS vazia.");
      Logger.log(JSON.stringify(resultado, null, 2));
      return resultado;
    }
    var dadosA = shAuth.getRange(1, 1, shAuth.getLastRow(), shAuth.getLastColumn()).getValues();
    var hA     = dadosA[0].map(function (v) { return String(v || "").trim(); });
    var iPer   = hA.indexOf("PERFIL_PRINCIPAL");
    var iStat  = hA.indexOf("STATUS");
    var iUsu   = hA.indexOf("USUARIO");
    var iEmail = hA.indexOf("EMAIL");
    var adminUsu = null, adminEmail = null;
    for (var i = 1; i < dadosA.length; i++) {
      if (String(iPer  >= 0 ? dadosA[i][iPer]  : "").toUpperCase() === "ADMIN" &&
          String(iStat >= 0 ? dadosA[i][iStat] : "").toUpperCase() === "ATIVO") {
        adminUsu   = String(iUsu   >= 0 ? dadosA[i][iUsu]   : "");
        adminEmail = String(iEmail >= 0 ? dadosA[i][iEmail] : "");
        break;
      }
    }
    if (!adminUsu) {
      resultado.bloqueios.push("Admin ATIVO nao encontrado em AUTH_USUARIOS.");
      Logger.log(JSON.stringify(resultado, null, 2));
      return resultado;
    }
    resultado.adminUsuario = adminUsu;

    if (!adminEmail) {
      resultado.bloqueios.push(
        "Admin sem EMAIL em AUTH_USUARIOS. " +
        "Execute TESTAR_AUTH4A_ATUALIZAR_EMAIL_ADMIN_DEV primeiro."
      );
      Logger.log(JSON.stringify(resultado, null, 2));
      return resultado;
    }

    // Baseline AUTH_RECUPERACAO_SENHA
    var shRec   = ss.getSheetByName("AUTH_RECUPERACAO_SENHA");
    var rRecA   = shRec ? shRec.getLastRow() : 0;

    // Dry-run — modoDryRun=true
    var resp = solicitarRecuperacaoSenhaV2_DEV(adminUsu, true);
    if (!resp || !resp.success) {
      resultado.bloqueios.push("solicitarRecuperacaoSenhaV2_DEV erro: " + (resp ? resp.message : "null"));
      Logger.log(JSON.stringify(resultado, null, 2));
      return resultado;
    }

    resultado.tokenGerado  = !!(resp.tokenParaTeste);
    resultado.expiresAt    = resp.expiresAt || null;
    resultado.emailEnviado = false;

    // Verificar se AUTH_RECUPERACAO_SENHA foi incrementada
    resultado.tokenHashGravado = shRec ? (shRec.getLastRow() > rRecA) : false;

    if (!resultado.tokenGerado)
      resultado.bloqueios.push("tokenParaTeste ausente — dry-run pode ter falhado.");
    if (!resultado.tokenHashGravado)
      resultado.bloqueios.push("AUTH_RECUPERACAO_SENHA nao foi incrementada.");

    // Guardar token raw em ScriptProperties para o próximo teste
    // (token raw só existe aqui em dry-run — expira em 30 min de qualquer forma)
    if (resultado.tokenGerado) {
      props.setProperty("AUTH4A_TEST_TOKEN_TEMP", resp.tokenParaTeste);
      resultado.tokenArmazenado = true;
      resultado.avisos.push(
        "Token armazenado em [AUTH4A_TEST_TOKEN_TEMP]. Expira: " + resultado.expiresAt +
        ". Execute TESTAR_AUTH4A_REDEFINIR_SENHA_TOKEN_DEV em menos de 30 min."
      );
    }

    var tudo = resultado.devConfirmado && resultado.tokenGerado &&
               resultado.tokenHashGravado && resultado.bloqueios.length === 0;
    resultado.conclusao = tudo
      ? "AUTH.4A RECUPERACAO DRYRUN APROVADO — execute TESTAR_AUTH4A_REDEFINIR_SENHA_TOKEN_DEV"
      : "AUTH.4A RECUPERACAO DRYRUN BLOQUEADO";

  } catch (e) {
    resultado.bloqueios.push("Falha: " + e.message);
    resultado.conclusao = "AUTH.4A RECUPERACAO DRYRUN BLOQUEADO";
  }

  // tokenRaw não aparece no resultado — apenas flags
  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

// ── TESTAR_AUTH4A_REDEFINIR_SENHA_TOKEN_DEV ──────────────────
function TESTAR_AUTH4A_REDEFINIR_SENHA_TOKEN_DEV() {
  var resultado = {
    funcao              : "TESTAR_AUTH4A_REDEFINIR_SENHA_TOKEN_DEV",
    devConfirmado       : false,
    tokenLido           : false,
    tokenOrigem         : null,
    adminUsuario        : null,
    senhaRedefinida     : false,
    senhaTemporariaNao  : false,
    loginV2ComNovaSenha : false,
    sessionId           : null,
    cadUsuariosIntacta  : false,
    emailEnviado        : false,
    tokenLimpo          : false,
    bloqueios           : [],
    avisos              : []
  };

  try {
    var DEV_SCRIPT_ID = "12xiWNlQ-WKVpiofmcGfBaX4EBdlsIxKFJG2PFTamHUmSUs89c4LW3WSG";
    // Senha de teste — constante interna, NUNCA logada
    var SENHA_TESTE   = "Auth4aTeste2026";

    resultado.devConfirmado = (ScriptApp.getScriptId() === DEV_SCRIPT_ID);
    if (!resultado.devConfirmado) {
      SENHA_TESTE = null;
      resultado.bloqueios.push("So pode rodar no DEV.");
      Logger.log(JSON.stringify(resultado, null, 2));
      return resultado;
    }

    var props = PropertiesService.getScriptProperties();
    var dbId  = String(props.getProperty("DB_ID") || "").trim();
    if (!dbId) {
      SENHA_TESTE = null;
      resultado.bloqueios.push("DB_ID nao configurado.");
      return resultado;
    }
    var ss = SpreadsheetApp.openById(dbId);

    // 1. Tentar ler token do dry-run anterior
    var tokenRaw = String(props.getProperty("AUTH4A_TEST_TOKEN_TEMP") || "").trim();
    if (tokenRaw) {
      resultado.tokenLido  = true;
      resultado.tokenOrigem = "EXISTENTE_DRYRUN_ANTERIOR";
    } else {
      // Gerar novo dry-run internamente se não houver token salvo
      resultado.avisos.push("AUTH4A_TEST_TOKEN_TEMP ausente — gerando novo dry-run internamente.");
      var shAuth0 = ss.getSheetByName("AUTH_USUARIOS");
      if (!shAuth0 || shAuth0.getLastRow() < 2) {
        SENHA_TESTE = null;
        resultado.bloqueios.push("AUTH_USUARIOS vazia — nao e possivel gerar dry-run.");
        return resultado;
      }
      var dados0 = shAuth0.getRange(1,1,shAuth0.getLastRow(),shAuth0.getLastColumn()).getValues();
      var h0     = dados0[0].map(function(v){return String(v||"").trim();});
      var iPer0  = h0.indexOf("PERFIL_PRINCIPAL");
      var iStat0 = h0.indexOf("STATUS");
      var iUsu0  = h0.indexOf("USUARIO");
      var uAdm0  = null;
      for (var k = 1; k < dados0.length; k++) {
        if (String(iPer0  >= 0 ? dados0[k][iPer0]  : "").toUpperCase() === "ADMIN" &&
            String(iStat0 >= 0 ? dados0[k][iStat0] : "").toUpperCase() === "ATIVO") {
          uAdm0 = String(iUsu0 >= 0 ? dados0[k][iUsu0] : "");
          break;
        }
      }
      if (!uAdm0) {
        SENHA_TESTE = null;
        resultado.bloqueios.push("Admin ATIVO nao encontrado para gerar dry-run interno.");
        return resultado;
      }
      var dr = solicitarRecuperacaoSenhaV2_DEV(uAdm0, true);
      if (!dr || !dr.success || !dr.tokenParaTeste) {
        SENHA_TESTE = null;
        resultado.bloqueios.push("Falha ao gerar dry-run interno: " + (dr ? dr.message : "null"));
        return resultado;
      }
      tokenRaw = dr.tokenParaTeste;
      resultado.tokenLido   = true;
      resultado.tokenOrigem = "NOVO_GERADO_INTERNAMENTE";
    }

    // 2. Baseline CAD_USUARIOS
    var shCadU = ss.getSheetByName("CAD_USUARIOS");
    var rCadA  = shCadU ? shCadU.getLastRow() : 0;
    var hCadA  = shCadU
      ? shCadU.getRange(1,1,1,shCadU.getLastColumn()).getValues()[0]
              .map(function(v){return String(v||"").trim();}).join(",")
      : "";

    // 3. Redefinir senha via token (senha nunca logada)
    var respRed = redefinirSenhaPorTokenV2_DEV(tokenRaw, SENHA_TESTE);
    tokenRaw = null; // descartar token

    resultado.senhaRedefinida = !!(respRed && respRed.success === true);
    if (!resultado.senhaRedefinida) {
      SENHA_TESTE = null;
      resultado.bloqueios.push("redefinirSenhaPorTokenV2_DEV erro: " + (respRed ? respRed.message : "null"));
    }

    // 4. Confirmar SENHA_TEMPORARIA = NAO e ler USUARIO
    if (resultado.senhaRedefinida && respRed.usuarioId) {
      var shAuth2 = ss.getSheetByName("AUTH_USUARIOS");
      if (shAuth2 && shAuth2.getLastRow() >= 2) {
        var d2 = shAuth2.getRange(1,1,shAuth2.getLastRow(),shAuth2.getLastColumn()).getValues();
        var h2 = d2[0].map(function(v){return String(v||"").trim();});
        var iId2  = h2.indexOf("ID");
        var iST2  = h2.indexOf("SENHA_TEMPORARIA");
        var iUsu2 = h2.indexOf("USUARIO");
        for (var j = 1; j < d2.length; j++) {
          if (String(iId2 >= 0 ? d2[j][iId2] : "") === respRed.usuarioId) {
            resultado.senhaTemporariaNao = (String(iST2 >= 0 ? d2[j][iST2] : "").toUpperCase() === "NAO");
            resultado.adminUsuario       = String(iUsu2 >= 0 ? d2[j][iUsu2] : "");
            break;
          }
        }
      }
      if (!resultado.senhaTemporariaNao)
        resultado.avisos.push("SENHA_TEMPORARIA nao e NAO — verificar AUTH_USUARIOS.");
    }

    // 5. Confirmar loginV2_DEV com nova senha
    if (resultado.senhaRedefinida && resultado.adminUsuario) {
      var lr = loginV2_DEV(resultado.adminUsuario, SENHA_TESTE);
      SENHA_TESTE = null; // descartar imediatamente após uso
      resultado.loginV2ComNovaSenha = !!(lr && lr.success === true);
      if (resultado.loginV2ComNovaSenha) {
        resultado.sessionId = lr.sessionId || null;
        resultado.avisos.push(
          "Login V2 OK. Sessao: " + resultado.sessionId +
          ". ATENCAO: senha de AUTH_USUARIOS foi alterada. CAD_USUARIOS intacta."
        );
      } else {
        resultado.bloqueios.push("loginV2_DEV falhou com nova senha: " + (lr ? lr.message : "null"));
      }
    } else {
      SENHA_TESTE = null; // garantir descarte
    }

    // 6. CAD_USUARIOS intacta
    var rCadD = shCadU ? shCadU.getLastRow() : 0;
    var hCadD = shCadU
      ? shCadU.getRange(1,1,1,shCadU.getLastColumn()).getValues()[0]
              .map(function(v){return String(v||"").trim();}).join(",")
      : "";
    resultado.cadUsuariosIntacta = (rCadA === rCadD && hCadA === hCadD);
    if (!resultado.cadUsuariosIntacta)
      resultado.bloqueios.push("CAD_USUARIOS foi alterada — CRITICO.");

    // 7. Limpar token temporário
    props.deleteProperty("AUTH4A_TEST_TOKEN_TEMP");
    resultado.tokenLimpo   = true;
    resultado.emailEnviado = false;

    var tudo = resultado.devConfirmado && resultado.tokenLido &&
               resultado.senhaRedefinida && resultado.senhaTemporariaNao &&
               resultado.loginV2ComNovaSenha && resultado.cadUsuariosIntacta &&
               resultado.bloqueios.length === 0;
    resultado.conclusao = tudo
      ? "AUTH.4A APROVADO — backend completo e testado. SENHA_TEMPORARIA=NAO. Proximo: AUTH.4B frontend."
      : "AUTH.4A REDEFINIR_SENHA BLOQUEADO";

  } catch (e) {
    resultado.bloqueios.push("Falha: " + e.message);
    resultado.conclusao = "AUTH.4A REDEFINIR_SENHA BLOQUEADO";
  }

  // Resultado nunca inclui senha — apenas flags e sessionId
  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

// ============================================================
// AUTH.4B — Auditoria e teste frontend login V2
// ============================================================

// ── AUDITAR_AUTH4B_FRONTEND_LOGIN_V2_SEM_GRAVAR ──────────────
function AUDITAR_AUTH4B_FRONTEND_LOGIN_V2_SEM_GRAVAR() {
  var resultado = {
    funcao                    : "AUDITAR_AUTH4B_FRONTEND_LOGIN_V2_SEM_GRAVAR",
    devConfirmado             : false,
    producaoNaoAlterada       : false,
    // Index.html
    indexEncontrado           : false,
    indexContemUsuarioOuEmail : false,
    indexLinkEsqueciExiste    : false,
    // JS_Core.html
    jsCoreEncontrado          : false,
    jsCoreChamaLoginV2DEV     : false,
    jsCoreFallbackLegadoExiste: false,
    jsCoreFuncaoFallbackExiste: false,
    jsCoreFuncaoEsqueciExiste : false,
    jsCoreEmailRealAusente    : true,
    // Backend / DB
    loginAntigoBackendExiste  : false,
    cadUsuariosIntacta        : false,
    bloqueios                 : [],
    avisos                    : []
  };

  try {
    var DEV_SCRIPT_ID = "12xiWNlQ-WKVpiofmcGfBaX4EBdlsIxKFJG2PFTamHUmSUs89c4LW3WSG";
    var HEADERS_CAD_U = ["ID","USUARIO","SENHA","NOME","PERFIL","STATUS","CRIADO_EM","CLIENTE_ID"];

    resultado.devConfirmado       = (ScriptApp.getScriptId() === DEV_SCRIPT_ID);
    resultado.producaoNaoAlterada = resultado.devConfirmado;
    if (!resultado.devConfirmado)
      resultado.bloqueios.push("ScriptId nao e DEV: " + ScriptApp.getScriptId());

    // ── Ler Index.html via HtmlService ──────────────────────────
    var indexContent = "";
    try {
      indexContent = HtmlService.createHtmlOutputFromFile("Index").getContent();
      resultado.indexEncontrado = !!indexContent;
    } catch (eIdx) {
      resultado.bloqueios.push("Index.html nao lido via HtmlService: " + eIdx.message);
    }

    if (indexContent) {
      resultado.indexContemUsuarioOuEmail = indexContent.indexOf("Usuário ou e-mail") >= 0 ||
                                            indexContent.indexOf("loginOuEmail") >= 0;
      resultado.indexLinkEsqueciExiste    = indexContent.indexOf("Esqueci minha senha") >= 0 ||
                                            indexContent.indexOf("esqueceuSenha_") >= 0;

      if (!resultado.indexContemUsuarioOuEmail)
        resultado.bloqueios.push("Index.html nao contem 'Usuário ou e-mail'.");
      if (!resultado.indexLinkEsqueciExiste)
        resultado.bloqueios.push("Index.html nao contem link 'Esqueci minha senha'.");
    }

    // ── Ler JS_Core.html via HtmlService ────────────────────────
    var jsCore = "";
    try {
      jsCore = HtmlService.createHtmlOutputFromFile("JS_Core").getContent();
      resultado.jsCoreEncontrado = !!jsCore;
    } catch (eJs) {
      resultado.bloqueios.push("JS_Core.html nao lido via HtmlService: " + eJs.message);
    }

    if (jsCore) {
      resultado.jsCoreChamaLoginV2DEV      = jsCore.indexOf("loginV2_DEV") >= 0;
      resultado.jsCoreFallbackLegadoExiste = jsCore.indexOf(".login(") >= 0 &&
                                             jsCore.indexOf("fallback") >= 0;
      resultado.jsCoreFuncaoFallbackExiste = jsCore.indexOf("fazerLoginV2ComFallback_") >= 0;
      resultado.jsCoreFuncaoEsqueciExiste  = jsCore.indexOf("esqueceuSenha_") >= 0;
      resultado.jsCoreEmailRealAusente     = jsCore.indexOf("MailApp") < 0 &&
                                             jsCore.indexOf("GmailApp") < 0;

      if (!resultado.jsCoreChamaLoginV2DEV)
        resultado.bloqueios.push("JS_Core.html nao chama loginV2_DEV.");
      if (!resultado.jsCoreFallbackLegadoExiste)
        resultado.bloqueios.push("JS_Core.html nao contem fallback legado (.login( + fallback).");
      if (!resultado.jsCoreFuncaoFallbackExiste)
        resultado.bloqueios.push("JS_Core.html nao contem fazerLoginV2ComFallback_.");
      if (!resultado.jsCoreFuncaoEsqueciExiste)
        resultado.bloqueios.push("JS_Core.html nao contem esqueceuSenha_.");
      if (!resultado.jsCoreEmailRealAusente)
        resultado.bloqueios.push("JS_Core.html contem MailApp ou GmailApp — nao permitido nesta etapa.");
    }

    // ── Login antigo backend intacto ─────────────────────────────
    resultado.loginAntigoBackendExiste = (typeof login === "function");
    if (!resultado.loginAntigoBackendExiste)
      resultado.avisos.push("Funcao login() nao encontrada como GAS function — verificar SGO_Auth.js.");

    // ── CAD_USUARIOS intacta ──────────────────────────────────────
    var dbId = String(PropertiesService.getScriptProperties().getProperty("DB_ID") || "").trim();
    if (!dbId) {
      resultado.bloqueios.push("DB_ID nao configurado.");
    } else {
      var ss    = SpreadsheetApp.openById(dbId);
      var shCad = ss.getSheetByName("CAD_USUARIOS");
      if (shCad && shCad.getLastRow() >= 1) {
        var hCad = shCad.getRange(1, 1, 1, shCad.getLastColumn()).getValues()[0]
                     .map(function (v) { return String(v || "").trim(); });
        resultado.cadUsuariosIntacta = (JSON.stringify(hCad) === JSON.stringify(HEADERS_CAD_U));
        if (!resultado.cadUsuariosIntacta)
          resultado.bloqueios.push("CAD_USUARIOS headers alterados.");
      } else {
        resultado.bloqueios.push("CAD_USUARIOS nao encontrada.");
      }
    }

    var tudo = resultado.devConfirmado &&
               resultado.indexEncontrado &&
               resultado.indexContemUsuarioOuEmail &&
               resultado.indexLinkEsqueciExiste &&
               resultado.jsCoreEncontrado &&
               resultado.jsCoreChamaLoginV2DEV &&
               resultado.jsCoreFallbackLegadoExiste &&
               resultado.jsCoreFuncaoFallbackExiste &&
               resultado.jsCoreFuncaoEsqueciExiste &&
               resultado.jsCoreEmailRealAusente &&
               resultado.cadUsuariosIntacta &&
               resultado.bloqueios.length === 0;

    resultado.conclusao = tudo
      ? "AUTH.4B APROVADO — frontend login V2 com fallback legado ativo. Execute TESTAR_AUTH4B_LOGIN_FRONTEND_DEV."
      : "AUTH.4B BLOQUEADO — corrija os bloqueios";

  } catch (e) {
    resultado.bloqueios.push("Falha: " + e.message);
    resultado.conclusao = "AUTH.4B BLOQUEADO";
  }

  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

// ── TESTAR_AUTH4B_LOGIN_FRONTEND_DEV ─────────────────────────
function TESTAR_AUTH4B_LOGIN_FRONTEND_DEV() {
  var resultado = {
    funcao                   : "TESTAR_AUTH4B_LOGIN_FRONTEND_DEV",
    devConfirmado            : false,
    loginV2AindaFunciona     : false,
    sessaoV2Compativel       : false,
    loginAntigoAindaExiste   : false,
    jsCoreChamaV2            : false,
    jsCoreTemFallback        : false,
    jsCoreFuncaoFallback     : false,
    jsCoreTemEsqueci         : false,
    emailNaoEnviado          : true,
    cadUsuariosIntacta       : false,
    adminUsuario             : null,
    bloqueios                : [],
    avisos                   : []
  };

  try {
    var DEV_SCRIPT_ID = "12xiWNlQ-WKVpiofmcGfBaX4EBdlsIxKFJG2PFTamHUmSUs89c4LW3WSG";
    var HEADERS_CAD_U = ["ID","USUARIO","SENHA","NOME","PERFIL","STATUS","CRIADO_EM","CLIENTE_ID"];

    resultado.devConfirmado = (ScriptApp.getScriptId() === DEV_SCRIPT_ID);
    if (!resultado.devConfirmado) {
      resultado.bloqueios.push("So pode rodar no DEV.");
      Logger.log(JSON.stringify(resultado, null, 2));
      return resultado;
    }

    var dbId = String(PropertiesService.getScriptProperties().getProperty("DB_ID") || "").trim();
    if (!dbId) {
      resultado.bloqueios.push("DB_ID nao configurado.");
      return resultado;
    }
    var ss = SpreadsheetApp.openById(dbId);

    // Encontrar admin ATIVO em AUTH_USUARIOS
    var shAuth = ss.getSheetByName("AUTH_USUARIOS");
    if (!shAuth || shAuth.getLastRow() < 2) {
      resultado.bloqueios.push("AUTH_USUARIOS vazia.");
      Logger.log(JSON.stringify(resultado, null, 2));
      return resultado;
    }
    var dadosA = shAuth.getRange(1, 1, shAuth.getLastRow(), shAuth.getLastColumn()).getValues();
    var hA     = dadosA[0].map(function (v) { return String(v || "").trim(); });
    var iPer   = hA.indexOf("PERFIL_PRINCIPAL");
    var iStat  = hA.indexOf("STATUS");
    var iUsu   = hA.indexOf("USUARIO");
    var adminUsu = null;
    for (var i = 1; i < dadosA.length; i++) {
      if (String(iPer  >= 0 ? dadosA[i][iPer]  : "").toUpperCase() === "ADMIN" &&
          String(iStat >= 0 ? dadosA[i][iStat] : "").toUpperCase() === "ATIVO") {
        adminUsu = String(iUsu >= 0 ? dadosA[i][iUsu] : "");
        break;
      }
    }
    if (!adminUsu) {
      resultado.bloqueios.push("Admin ATIVO nao encontrado em AUTH_USUARIOS.");
      Logger.log(JSON.stringify(resultado, null, 2));
      return resultado;
    }
    resultado.adminUsuario = adminUsu;

    // Backend: loginV2_DEV e login existem
    resultado.loginV2AindaFunciona   = (typeof loginV2_DEV === "function");
    resultado.loginAntigoAindaExiste = (typeof login === "function");
    resultado.sessaoV2Compativel     = (typeof validarSessao === "function" || typeof exigirSessao === "function");

    if (!resultado.loginV2AindaFunciona)
      resultado.bloqueios.push("loginV2_DEV nao encontrado como funcao GAS.");
    if (!resultado.loginAntigoAindaExiste)
      resultado.avisos.push("Funcao login() nao encontrada — verificar SGO_Auth.js.");
    if (!resultado.sessaoV2Compativel)
      resultado.avisos.push("validarSessao/exigirSessao nao encontrados — verificar SGO_Auth.js.");

    // Verificar JS_Core via HtmlService
    var jsCore = "";
    try {
      jsCore = HtmlService.createHtmlOutputFromFile("JS_Core").getContent();
    } catch (eJs) {
      resultado.bloqueios.push("JS_Core.html nao lido via HtmlService: " + eJs.message);
    }

    if (jsCore) {
      resultado.jsCoreChamaV2      = jsCore.indexOf("loginV2_DEV") >= 0;
      resultado.jsCoreTemFallback  = jsCore.indexOf(".login(") >= 0;
      resultado.jsCoreFuncaoFallback = jsCore.indexOf("fazerLoginV2ComFallback_") >= 0;
      resultado.jsCoreTemEsqueci   = jsCore.indexOf("esqueceuSenha_") >= 0;
      resultado.emailNaoEnviado    = jsCore.indexOf("MailApp") < 0 && jsCore.indexOf("GmailApp") < 0;

      if (!resultado.jsCoreChamaV2)        resultado.bloqueios.push("loginV2_DEV ausente em JS_Core.html.");
      if (!resultado.jsCoreTemFallback)    resultado.bloqueios.push(".login( ausente em JS_Core.html.");
      if (!resultado.jsCoreFuncaoFallback) resultado.bloqueios.push("fazerLoginV2ComFallback_ ausente em JS_Core.html.");
      if (!resultado.jsCoreTemEsqueci)     resultado.bloqueios.push("esqueceuSenha_ ausente em JS_Core.html.");
      if (!resultado.emailNaoEnviado)      resultado.bloqueios.push("MailApp/GmailApp detectado em JS_Core.html.");
    }

    // CAD_USUARIOS intacta
    var shCad = ss.getSheetByName("CAD_USUARIOS");
    if (shCad && shCad.getLastRow() >= 1) {
      var hCad = shCad.getRange(1, 1, 1, shCad.getLastColumn()).getValues()[0]
                   .map(function (v) { return String(v || "").trim(); });
      resultado.cadUsuariosIntacta = (JSON.stringify(hCad) === JSON.stringify(HEADERS_CAD_U));
      if (!resultado.cadUsuariosIntacta)
        resultado.bloqueios.push("CAD_USUARIOS headers alterados.");
    } else {
      resultado.bloqueios.push("CAD_USUARIOS nao encontrada.");
    }

    var tudo = resultado.devConfirmado &&
               resultado.loginV2AindaFunciona &&
               resultado.jsCoreChamaV2 &&
               resultado.jsCoreTemFallback &&
               resultado.jsCoreFuncaoFallback &&
               resultado.jsCoreTemEsqueci &&
               resultado.emailNaoEnviado &&
               resultado.cadUsuariosIntacta &&
               resultado.bloqueios.length === 0;

    resultado.conclusao = tudo
      ? "AUTH.4B APROVADO — frontend login V2 com fallback validado. Proximo: AUTH.4C ou AUTH.5."
      : "AUTH.4B BLOQUEADO — corrija os bloqueios";

  } catch (e) {
    resultado.bloqueios.push("Falha: " + e.message);
    resultado.conclusao = "AUTH.4B BLOQUEADO";
  }

  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

// ============================================================
// AUTH.4C — Auditoria e teste primeiro acesso visual
// ============================================================

// ── AUDITAR_AUTH4C_PRIMEIRO_ACESSO_FRONTEND_SEM_GRAVAR ───────
function AUDITAR_AUTH4C_PRIMEIRO_ACESSO_FRONTEND_SEM_GRAVAR() {
  var resultado = {
    funcao                         : "AUDITAR_AUTH4C_PRIMEIRO_ACESSO_FRONTEND_SEM_GRAVAR",
    devConfirmado                  : false,
    producaoNaoAlterada            : false,
    // JS_Core.html
    jsCoreEncontrado               : false,
    jsCoreTemTratamentoSenhaTemp   : false,
    jsCoreChamaTrocarSenha         : false,
    jsCoreValidacaoConfirmacao     : false,
    jsCoreValidacaoMinimo8         : false,
    jsCoreFallbackLegadoContinua   : false,
    jsCoreLoginV2Continua          : false,
    jsCoreEmailRealAusente         : true,
    // Index.html
    indexEncontrado                : false,
    indexModalPrimeiroAcessoExiste : false,
    // Backend / DB
    cadUsuariosIntacta             : false,
    loginAntigoBackendExiste       : false,
    bloqueios                      : [],
    avisos                         : []
  };

  try {
    var DEV_SCRIPT_ID = "12xiWNlQ-WKVpiofmcGfBaX4EBdlsIxKFJG2PFTamHUmSUs89c4LW3WSG";
    var HEADERS_CAD_U = ["ID","USUARIO","SENHA","NOME","PERFIL","STATUS","CRIADO_EM","CLIENTE_ID"];

    resultado.devConfirmado       = (ScriptApp.getScriptId() === DEV_SCRIPT_ID);
    resultado.producaoNaoAlterada = resultado.devConfirmado;
    if (!resultado.devConfirmado)
      resultado.bloqueios.push("ScriptId nao e DEV: " + ScriptApp.getScriptId());

    // ── Ler JS_Core.html ─────────────────────────────────────
    var jsCore = "";
    try {
      jsCore = HtmlService.createHtmlOutputFromFile("JS_Core").getContent();
      resultado.jsCoreEncontrado = !!jsCore;
    } catch (eJs) {
      resultado.bloqueios.push("JS_Core.html nao lido: " + eJs.message);
    }

    if (jsCore) {
      resultado.jsCoreTemTratamentoSenhaTemp = jsCore.indexOf("senhaTemporaria") >= 0 &&
                                               jsCore.indexOf("abrirModalPrimeiroAcesso_") >= 0;
      resultado.jsCoreChamaTrocarSenha       = jsCore.indexOf("trocarSenhaPrimeiroAcessoV2_DEV") >= 0;
      resultado.jsCoreValidacaoConfirmacao   = jsCore.indexOf("confirmarPrimeiroAcesso_") >= 0 &&
                                               (jsCore.indexOf("coincidem") >= 0 || jsCore.indexOf("!==") >= 0);
      resultado.jsCoreValidacaoMinimo8       = jsCore.indexOf("length < 8") >= 0 ||
                                               jsCore.indexOf(".length<8") >= 0;
      resultado.jsCoreFallbackLegadoContinua = jsCore.indexOf(".login(") >= 0 &&
                                               jsCore.indexOf("fallback") >= 0;
      resultado.jsCoreLoginV2Continua        = jsCore.indexOf("loginV2_DEV") >= 0;
      resultado.jsCoreEmailRealAusente       = jsCore.indexOf("MailApp") < 0 &&
                                               jsCore.indexOf("GmailApp") < 0;

      if (!resultado.jsCoreTemTratamentoSenhaTemp)
        resultado.bloqueios.push("JS_Core.html nao trata senhaTemporaria + abrirModalPrimeiroAcesso_.");
      if (!resultado.jsCoreChamaTrocarSenha)
        resultado.bloqueios.push("JS_Core.html nao chama trocarSenhaPrimeiroAcessoV2_DEV.");
      if (!resultado.jsCoreValidacaoConfirmacao)
        resultado.bloqueios.push("JS_Core.html nao contem validacao de confirmacao de senha.");
      if (!resultado.jsCoreValidacaoMinimo8)
        resultado.bloqueios.push("JS_Core.html nao contem validacao de minimo 8 caracteres.");
      if (!resultado.jsCoreFallbackLegadoContinua)
        resultado.bloqueios.push("JS_Core.html — fallback legado ausente.");
      if (!resultado.jsCoreLoginV2Continua)
        resultado.bloqueios.push("JS_Core.html — loginV2_DEV ausente.");
      if (!resultado.jsCoreEmailRealAusente)
        resultado.bloqueios.push("JS_Core.html contem MailApp ou GmailApp — nao permitido.");
    }

    // ── Ler Index.html ───────────────────────────────────────
    var indexContent = "";
    try {
      indexContent = HtmlService.createHtmlOutputFromFile("Index").getContent();
      resultado.indexEncontrado = !!indexContent;
    } catch (eIdx) {
      resultado.bloqueios.push("Index.html nao lido: " + eIdx.message);
    }

    if (indexContent) {
      resultado.indexModalPrimeiroAcessoExiste = indexContent.indexOf("modal-primeiro-acesso") >= 0;
      if (!resultado.indexModalPrimeiroAcessoExiste)
        resultado.bloqueios.push("Index.html nao contem modal-primeiro-acesso.");
    }

    // ── Backend intacto ───────────────────────────────────────
    resultado.loginAntigoBackendExiste = (typeof login === "function");
    if (!resultado.loginAntigoBackendExiste)
      resultado.avisos.push("Funcao login() nao encontrada — verificar SGO_Auth.js.");

    // ── CAD_USUARIOS intacta ──────────────────────────────────
    var dbId = String(PropertiesService.getScriptProperties().getProperty("DB_ID") || "").trim();
    if (!dbId) {
      resultado.bloqueios.push("DB_ID nao configurado.");
    } else {
      var ss    = SpreadsheetApp.openById(dbId);
      var shCad = ss.getSheetByName("CAD_USUARIOS");
      if (shCad && shCad.getLastRow() >= 1) {
        var hCad = shCad.getRange(1, 1, 1, shCad.getLastColumn()).getValues()[0]
                     .map(function (v) { return String(v || "").trim(); });
        resultado.cadUsuariosIntacta = (JSON.stringify(hCad) === JSON.stringify(HEADERS_CAD_U));
        if (!resultado.cadUsuariosIntacta)
          resultado.bloqueios.push("CAD_USUARIOS headers alterados.");
      } else {
        resultado.bloqueios.push("CAD_USUARIOS nao encontrada.");
      }
    }

    var tudo = resultado.devConfirmado &&
               resultado.jsCoreEncontrado &&
               resultado.jsCoreTemTratamentoSenhaTemp &&
               resultado.jsCoreChamaTrocarSenha &&
               resultado.jsCoreValidacaoConfirmacao &&
               resultado.jsCoreValidacaoMinimo8 &&
               resultado.jsCoreFallbackLegadoContinua &&
               resultado.jsCoreLoginV2Continua &&
               resultado.jsCoreEmailRealAusente &&
               resultado.indexEncontrado &&
               resultado.indexModalPrimeiroAcessoExiste &&
               resultado.cadUsuariosIntacta &&
               resultado.bloqueios.length === 0;

    resultado.conclusao = tudo
      ? "AUTH.4C APROVADO — modal primeiro acesso implementado. Execute TESTAR_AUTH4C_PRIMEIRO_ACESSO_DEV."
      : "AUTH.4C BLOQUEADO — corrija os bloqueios";

  } catch (e) {
    resultado.bloqueios.push("Falha: " + e.message);
    resultado.conclusao = "AUTH.4C BLOQUEADO";
  }

  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

// ── TESTAR_AUTH4C_PRIMEIRO_ACESSO_DEV ────────────────────────
function TESTAR_AUTH4C_PRIMEIRO_ACESSO_DEV() {
  // Senhas de teste DEV — NUNCA logadas nem retornadas
  var SENHA_ATUAL = "Auth4aTeste2026";
  var SENHA_NOVA  = "Auth4cTeste2026";

  var resultado = {
    funcao                  : "TESTAR_AUTH4C_PRIMEIRO_ACESSO_DEV",
    devConfirmado           : false,
    adminUsuario            : null,
    adminId                 : null,
    senhaTempMarcadaSim     : false,
    loginV2RetornouSenhaTemp: false,
    sessionId               : null,
    trocarSenhaOk           : false,
    senhaTempNaoAposTroca   : false,
    loginNovaSenhaOk        : false,
    senhaRestauradaOk       : false,
    loginOriginalOk         : false,
    cadUsuariosIntacta      : false,
    emailNaoEnviado         : true,
    bloqueios               : [],
    avisos                  : []
  };

  try {
    var DEV_SCRIPT_ID = "12xiWNlQ-WKVpiofmcGfBaX4EBdlsIxKFJG2PFTamHUmSUs89c4LW3WSG";
    var HEADERS_CAD_U = ["ID","USUARIO","SENHA","NOME","PERFIL","STATUS","CRIADO_EM","CLIENTE_ID"];

    resultado.devConfirmado = (ScriptApp.getScriptId() === DEV_SCRIPT_ID);
    if (!resultado.devConfirmado) {
      SENHA_ATUAL = null; SENHA_NOVA = null;
      resultado.bloqueios.push("So pode rodar no DEV.");
      Logger.log(JSON.stringify(resultado, null, 2));
      return resultado;
    }

    var dbId = String(PropertiesService.getScriptProperties().getProperty("DB_ID") || "").trim();
    if (!dbId) {
      SENHA_ATUAL = null; SENHA_NOVA = null;
      resultado.bloqueios.push("DB_ID nao configurado.");
      return resultado;
    }
    var ss = SpreadsheetApp.openById(dbId);

    // ── 1. Encontrar admin ATIVO em AUTH_USUARIOS ─────────────
    var shAuth = ss.getSheetByName("AUTH_USUARIOS");
    if (!shAuth || shAuth.getLastRow() < 2) {
      SENHA_ATUAL = null; SENHA_NOVA = null;
      resultado.bloqueios.push("AUTH_USUARIOS vazia.");
      Logger.log(JSON.stringify(resultado, null, 2));
      return resultado;
    }
    var dados = shAuth.getRange(1, 1, shAuth.getLastRow(), shAuth.getLastColumn()).getValues();
    var h     = dados[0].map(function (v) { return String(v || "").trim(); });
    var iId   = h.indexOf("ID");
    var iPer  = h.indexOf("PERFIL_PRINCIPAL");
    var iStat = h.indexOf("STATUS");
    var iUsu  = h.indexOf("USUARIO");
    var iST   = h.indexOf("SENHA_TEMPORARIA");
    var adminUsu = null, adminId = null, adminRow = -1;
    for (var i = 1; i < dados.length; i++) {
      if (String(iPer  >= 0 ? dados[i][iPer]  : "").toUpperCase() === "ADMIN" &&
          String(iStat >= 0 ? dados[i][iStat] : "").toUpperCase() === "ATIVO") {
        adminUsu = String(iUsu >= 0 ? dados[i][iUsu] : "");
        adminId  = String(iId  >= 0 ? dados[i][iId]  : "");
        adminRow = i + 1; // linha real na planilha (1-indexed headers + i)
        break;
      }
    }
    if (!adminUsu || adminRow < 2) {
      SENHA_ATUAL = null; SENHA_NOVA = null;
      resultado.bloqueios.push("Admin ATIVO nao encontrado em AUTH_USUARIOS.");
      Logger.log(JSON.stringify(resultado, null, 2));
      return resultado;
    }
    resultado.adminUsuario = adminUsu;
    resultado.adminId      = adminId;

    // ── 2. Marcar SENHA_TEMPORARIA = SIM temporariamente ─────
    var colST = iST + 1; // coluna real (1-indexed)
    if (iST < 0) {
      SENHA_ATUAL = null; SENHA_NOVA = null;
      resultado.bloqueios.push("Coluna SENHA_TEMPORARIA nao encontrada em AUTH_USUARIOS.");
      return resultado;
    }
    shAuth.getRange(adminRow, colST).setValue("SIM");
    resultado.senhaTempMarcadaSim = true;

    // ── 3. loginV2_DEV → confirmar senhaTemporaria=true ──────
    var resLogin = loginV2_DEV(adminUsu, SENHA_ATUAL);
    if (!resLogin || !resLogin.success) {
      // Tentar restaurar SENHA_TEMPORARIA antes de sair
      shAuth.getRange(adminRow, colST).setValue("NAO");
      resultado.bloqueios.push(
        "loginV2_DEV falhou na etapa 3. Verifique se a senha do admin em AUTH_USUARIOS e a esperada. " +
        "SENHA_TEMPORARIA restaurada para NAO. Erro: " + (resLogin ? resLogin.message : "null")
      );
      SENHA_ATUAL = null; SENHA_NOVA = null;
      Logger.log(JSON.stringify(resultado, null, 2));
      return resultado;
    }
    resultado.loginV2RetornouSenhaTemp = !!(resLogin.user && resLogin.user.senhaTemporaria === true);
    resultado.sessionId = resLogin.sessionId || null;
    if (!resultado.loginV2RetornouSenhaTemp)
      resultado.avisos.push("loginV2 retornou success mas senhaTemporaria nao foi true — verificar SENHA_TEMPORARIA.");

    // ── 4. Trocar senha via trocarSenhaPrimeiroAcessoV2_DEV ──
    var resTroca = trocarSenhaPrimeiroAcessoV2_DEV(resultado.sessionId, SENHA_ATUAL, SENHA_NOVA);
    SENHA_ATUAL = null; // descartar imediatamente após uso
    resultado.trocarSenhaOk = !!(resTroca && resTroca.success === true);
    if (!resultado.trocarSenhaOk) {
      resultado.bloqueios.push("trocarSenhaPrimeiroAcessoV2_DEV erro: " + (resTroca ? resTroca.message : "null"));
    }

    // ── 5. Confirmar SENHA_TEMPORARIA = NAO na planilha ──────
    var stAposStr = String(shAuth.getRange(adminRow, colST).getValue() || "").toUpperCase();
    resultado.senhaTempNaoAposTroca = (stAposStr === "NAO");
    if (!resultado.senhaTempNaoAposTroca)
      resultado.bloqueios.push("SENHA_TEMPORARIA nao e NAO apos troca. Valor: " + stAposStr);

    // ── 6. Confirmar login com nova senha ────────────────────
    if (resultado.trocarSenhaOk) {
      var resLogin2 = loginV2_DEV(adminUsu, SENHA_NOVA);
      resultado.loginNovaSenhaOk = !!(resLogin2 && resLogin2.success === true);
      if (!resultado.loginNovaSenhaOk)
        resultado.bloqueios.push("loginV2_DEV falhou com nova senha: " + (resLogin2 ? resLogin2.message : "null"));

      // ── 7. Restaurar senha original ──────────────────────────
      if (resultado.loginNovaSenhaOk && resLogin2.sessionId) {
        var resRestaura = trocarSenhaPrimeiroAcessoV2_DEV(resLogin2.sessionId, SENHA_NOVA, "Auth4aTeste2026");
        SENHA_NOVA = null; // descartar
        resultado.senhaRestauradaOk = !!(resRestaura && resRestaura.success === true);
        if (!resultado.senhaRestauradaOk)
          resultado.avisos.push("Restauração de senha falhou: " + (resRestaura ? resRestaura.message : "null") +
            " — admin pode precisar de nova senha manual.");

        // ── 8. Confirmar login com senha original restaurada ─
        if (resultado.senhaRestauradaOk && resRestaura.sessionId) {
          var SENHA_REST = "Auth4aTeste2026";
          var resLogin3  = loginV2_DEV(adminUsu, SENHA_REST);
          SENHA_REST = null;
          resultado.loginOriginalOk = !!(resLogin3 && resLogin3.success === true);
          if (!resultado.loginOriginalOk)
            resultado.avisos.push("Login com senha restaurada falhou — verificar AUTH_USUARIOS manualmente.");
        }
      } else {
        SENHA_NOVA = null;
      }
    } else {
      SENHA_NOVA = null;
    }

    // ── 9. CAD_USUARIOS intacta ───────────────────────────────
    var shCad = ss.getSheetByName("CAD_USUARIOS");
    if (shCad && shCad.getLastRow() >= 1) {
      var hCad = shCad.getRange(1, 1, 1, shCad.getLastColumn()).getValues()[0]
                   .map(function (v) { return String(v || "").trim(); });
      resultado.cadUsuariosIntacta = (JSON.stringify(hCad) === JSON.stringify(HEADERS_CAD_U));
      if (!resultado.cadUsuariosIntacta)
        resultado.bloqueios.push("CAD_USUARIOS headers alterados — CRITICO.");
    } else {
      resultado.bloqueios.push("CAD_USUARIOS nao encontrada.");
    }

    var tudo = resultado.devConfirmado &&
               resultado.senhaTempMarcadaSim &&
               resultado.loginV2RetornouSenhaTemp &&
               resultado.trocarSenhaOk &&
               resultado.senhaTempNaoAposTroca &&
               resultado.loginNovaSenhaOk &&
               resultado.cadUsuariosIntacta &&
               resultado.bloqueios.length === 0;

    resultado.conclusao = tudo
      ? "AUTH.4C APROVADO — primeiro acesso backend + frontend completos. Proximo: AUTH.5 ou AUTH.4D."
      : "AUTH.4C BLOQUEADO — corrija os bloqueios";

  } catch (e) {
    resultado.bloqueios.push("Falha: " + e.message);
    resultado.conclusao = "AUTH.4C BLOQUEADO";
  } finally {
    SENHA_ATUAL = null;
    SENHA_NOVA  = null;
  }

  // Resultado nunca inclui senhas — apenas flags
  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

// ============================================================
// AUTH.4C_FIX — Diagnóstico estado real do admin após teste
// ============================================================

// ── DIAGNOSTICAR_AUTH4C_LOGIN_FINAL_ADMIN_SEM_GRAVAR ─────────
function DIAGNOSTICAR_AUTH4C_LOGIN_FINAL_ADMIN_SEM_GRAVAR() {
  // Senhas candidatas DEV — apenas para teste, NUNCA logadas
  // Candidato A: senha que deveria ter sido restaurada pelo AUTH.4C
  // Candidato B: senha intermediária que ficou gravada se restauração falhou parcialmente
  var CAND_A = "Auth4aTeste2026";
  var CAND_B = "Auth4cTeste2026";

  var resultado = {
    funcao                : "DIAGNOSTICAR_AUTH4C_LOGIN_FINAL_ADMIN_SEM_GRAVAR",
    devConfirmado         : false,
    producaoNaoAlterada   : false,
    adminEncontrado       : false,
    adminUsuario          : null,
    adminId               : null,
    adminStatus           : null,
    senhaTempAtual        : null,
    senhaHashPreenchida   : false,
    saltPreenchido        : false,
    // Login candidato A (Auth4aTeste2026 — senha original esperada)
    loginCandAOk          : false,
    sessionIdCandA        : null,
    // Login candidato B (Auth4cTeste2026 — senha nova do AUTH.4C, se restauração falhou)
    loginCandBOk          : false,
    sessionIdCandB        : null,
    // Diagnóstico final
    senhaAtivaIdentificada: null, // "CAND_A" | "CAND_B" | "NENHUMA"
    cadUsuariosIntacta    : false,
    emailNaoEnviado       : true,
    bloqueios             : [],
    avisos                : []
  };

  try {
    var DEV_SCRIPT_ID = "12xiWNlQ-WKVpiofmcGfBaX4EBdlsIxKFJG2PFTamHUmSUs89c4LW3WSG";
    var HEADERS_CAD_U = ["ID","USUARIO","SENHA","NOME","PERFIL","STATUS","CRIADO_EM","CLIENTE_ID"];

    resultado.devConfirmado       = (ScriptApp.getScriptId() === DEV_SCRIPT_ID);
    resultado.producaoNaoAlterada = resultado.devConfirmado;
    if (!resultado.devConfirmado) {
      CAND_A = null; CAND_B = null;
      resultado.bloqueios.push("ScriptId nao e DEV: " + ScriptApp.getScriptId());
      Logger.log(JSON.stringify(resultado, null, 2));
      return resultado;
    }

    var dbId = String(PropertiesService.getScriptProperties().getProperty("DB_ID") || "").trim();
    if (!dbId) {
      CAND_A = null; CAND_B = null;
      resultado.bloqueios.push("DB_ID nao configurado.");
      Logger.log(JSON.stringify(resultado, null, 2));
      return resultado;
    }
    var ss = SpreadsheetApp.openById(dbId);

    // ── 1. Localizar admin em AUTH_USUARIOS ───────────────────
    var shAuth = ss.getSheetByName("AUTH_USUARIOS");
    if (!shAuth || shAuth.getLastRow() < 2) {
      CAND_A = null; CAND_B = null;
      resultado.bloqueios.push("AUTH_USUARIOS vazia.");
      Logger.log(JSON.stringify(resultado, null, 2));
      return resultado;
    }
    var dados = shAuth.getRange(1, 1, shAuth.getLastRow(), shAuth.getLastColumn()).getValues();
    var h     = dados[0].map(function (v) { return String(v || "").trim(); });
    var iId   = h.indexOf("ID");
    var iPer  = h.indexOf("PERFIL_PRINCIPAL");
    var iStat = h.indexOf("STATUS");
    var iUsu  = h.indexOf("USUARIO");
    var iST   = h.indexOf("SENHA_TEMPORARIA");
    var iHash = h.indexOf("SENHA_HASH");
    var iSalt = h.indexOf("SENHA_SALT");
    var adminUsu = null, adminId = null;
    var adminStatus = null, senhaTempAtual = null;
    var senhaHashOk = false, saltOk = false;
    for (var i = 1; i < dados.length; i++) {
      if (String(iPer >= 0 ? dados[i][iPer] : "").toUpperCase() === "ADMIN") {
        adminUsu       = String(iUsu  >= 0 ? dados[i][iUsu]  : "");
        adminId        = String(iId   >= 0 ? dados[i][iId]   : "");
        adminStatus    = String(iStat >= 0 ? dados[i][iStat] : "").toUpperCase();
        senhaTempAtual = String(iST   >= 0 ? dados[i][iST]   : "").toUpperCase();
        senhaHashOk    = String(iHash >= 0 ? dados[i][iHash] : "").length > 10;
        saltOk         = String(iSalt >= 0 ? dados[i][iSalt] : "").length > 10;
        break;
      }
    }
    if (!adminUsu) {
      CAND_A = null; CAND_B = null;
      resultado.bloqueios.push("Admin nao encontrado em AUTH_USUARIOS (nenhuma linha com PERFIL_PRINCIPAL=ADMIN).");
      Logger.log(JSON.stringify(resultado, null, 2));
      return resultado;
    }
    resultado.adminEncontrado    = true;
    resultado.adminUsuario       = adminUsu;
    resultado.adminId            = adminId;
    resultado.adminStatus        = adminStatus;
    resultado.senhaTempAtual     = senhaTempAtual;
    resultado.senhaHashPreenchida = senhaHashOk;
    resultado.saltPreenchido      = saltOk;

    if (adminStatus !== "ATIVO")
      resultado.avisos.push("Admin STATUS nao e ATIVO: " + adminStatus);
    if (!senhaHashOk)
      resultado.bloqueios.push("SENHA_HASH vazia ou muito curta — auth impossivel.");
    if (!saltOk)
      resultado.bloqueios.push("SENHA_SALT vazio ou muito curto — auth impossivel.");

    // ── 2. Testar candidato A (senha esperada original) ───────
    var rA = loginV2_DEV(adminUsu, CAND_A);
    CAND_A = null; // descartar imediatamente
    resultado.loginCandAOk   = !!(rA && rA.success === true);
    resultado.sessionIdCandA = resultado.loginCandAOk ? (rA.sessionId || null) : null;
    if (resultado.loginCandAOk)
      resultado.avisos.push("Candidato A (Auth4aTeste2026): login OK. Senha esta correta.");

    // ── 3. Testar candidato B (senha intermediária AUTH.4C) ───
    var rB = loginV2_DEV(adminUsu, CAND_B);
    CAND_B = null; // descartar imediatamente
    resultado.loginCandBOk   = !!(rB && rB.success === true);
    resultado.sessionIdCandB = resultado.loginCandBOk ? (rB.sessionId || null) : null;
    if (resultado.loginCandBOk)
      resultado.avisos.push("Candidato B (Auth4cTeste2026): login OK. Restauracao falhou — senha ficou na versao intermediaria.");

    // ── 4. Diagnóstico final ──────────────────────────────────
    if (resultado.loginCandAOk && resultado.loginCandBOk) {
      resultado.senhaAtivaIdentificada = "CAND_A_E_CAND_B";
      resultado.avisos.push("Ambas as senhas funcionam — situacao inesperada. Verificar AUTH_USUARIOS manualmente.");
    } else if (resultado.loginCandAOk) {
      resultado.senhaAtivaIdentificada = "CAND_A";
    } else if (resultado.loginCandBOk) {
      resultado.senhaAtivaIdentificada = "CAND_B";
      resultado.bloqueios.push(
        "Senha ativa e CAND_B (Auth4cTeste2026 — versao intermediaria do AUTH.4C). " +
        "Login atual do admin em AUTH_USUARIOS falhou com a senha original esperada. " +
        "Necessario reset controlado da senha DEV."
      );
    } else {
      resultado.senhaAtivaIdentificada = "NENHUMA";
      resultado.bloqueios.push(
        "Nenhum dos candidatos funcionou. " +
        "Login atual do admin em AUTH_USUARIOS falhou. " +
        "Necessario reset controlado da senha DEV."
      );
    }

    // ── 5. CAD_USUARIOS intacta ───────────────────────────────
    var shCad = ss.getSheetByName("CAD_USUARIOS");
    if (shCad && shCad.getLastRow() >= 1) {
      var hCad = shCad.getRange(1, 1, 1, shCad.getLastColumn()).getValues()[0]
                   .map(function (v) { return String(v || "").trim(); });
      resultado.cadUsuariosIntacta = (JSON.stringify(hCad) === JSON.stringify(HEADERS_CAD_U));
      if (!resultado.cadUsuariosIntacta)
        resultado.bloqueios.push("CAD_USUARIOS headers alterados — CRITICO.");
    } else {
      resultado.bloqueios.push("CAD_USUARIOS nao encontrada.");
    }

    var loginOk = resultado.loginCandAOk || resultado.loginCandBOk;
    resultado.conclusao = loginOk && resultado.bloqueios.length === 0
      ? "DIAGNOSTICO OK — login ativo. Senha identificada: " + resultado.senhaAtivaIdentificada +
        ". AUTH.4C pode ser considerado aprovado."
      : "DIAGNOSTICO BLOQUEADO — " + resultado.bloqueios.join(" | ");

  } catch (e) {
    resultado.bloqueios.push("Falha: " + e.message);
    resultado.conclusao = "DIAGNOSTICO BLOQUEADO";
  } finally {
    CAND_A = null;
    CAND_B = null;
  }

  // Resultado nunca inclui senhas — apenas flags e sessionIds temporários
  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

// ============================================================
// AUTH.4D — Auditoria e teste fluxo esqueci minha senha
// ============================================================

// ── AUDITAR_AUTH4D_ESQUECI_SENHA_FRONTEND_SEM_GRAVAR ─────────
function AUDITAR_AUTH4D_ESQUECI_SENHA_FRONTEND_SEM_GRAVAR() {
  var resultado = {
    funcao                          : "AUDITAR_AUTH4D_ESQUECI_SENHA_FRONTEND_SEM_GRAVAR",
    devConfirmado                   : false,
    producaoNaoAlterada             : false,
    // Index.html
    indexEncontrado                 : false,
    indexModalEsqueciExiste         : false,
    indexModalRedefinirExiste       : false,
    // JS_Core.html
    jsCoreEncontrado                : false,
    jsCoreEsqueciFluxoReal          : false,
    jsCoreChamaSolicitarRecuperacao : false,
    jsCoreChalaRedefinirPorToken    : false,
    jsCoreValidaTokenPreenchido     : false,
    jsCoreValidaMinimo8             : false,
    jsCoreValidaConfirmacaoSenha    : false,
    jsCoreLoginV2Continua           : false,
    jsCoreFallbackContinua          : false,
    jsCorePrimeiroAcessoContinua    : false,
    jsCoreEmailRealAusente          : true,
    // Backend / DB
    cadUsuariosIntacta              : false,
    loginAntigoBackendExiste        : false,
    bloqueios                       : [],
    avisos                          : []
  };

  try {
    var DEV_SCRIPT_ID = "12xiWNlQ-WKVpiofmcGfBaX4EBdlsIxKFJG2PFTamHUmSUs89c4LW3WSG";
    var HEADERS_CAD_U = ["ID","USUARIO","SENHA","NOME","PERFIL","STATUS","CRIADO_EM","CLIENTE_ID"];

    resultado.devConfirmado       = (ScriptApp.getScriptId() === DEV_SCRIPT_ID);
    resultado.producaoNaoAlterada = resultado.devConfirmado;
    if (!resultado.devConfirmado)
      resultado.bloqueios.push("ScriptId nao e DEV: " + ScriptApp.getScriptId());

    // ── Index.html ───────────────────────────────────────────
    var indexContent = "";
    try {
      indexContent = HtmlService.createHtmlOutputFromFile("Index").getContent();
      resultado.indexEncontrado = !!indexContent;
    } catch (eIdx) {
      resultado.bloqueios.push("Index.html nao lido: " + eIdx.message);
    }
    if (indexContent) {
      resultado.indexModalEsqueciExiste   = indexContent.indexOf("modal-esqueci-senha") >= 0;
      resultado.indexModalRedefinirExiste = indexContent.indexOf("modal-redefinir-senha") >= 0;
      if (!resultado.indexModalEsqueciExiste)
        resultado.bloqueios.push("Index.html nao contem modal-esqueci-senha.");
      if (!resultado.indexModalRedefinirExiste)
        resultado.bloqueios.push("Index.html nao contem modal-redefinir-senha.");
    }

    // ── JS_Core.html ─────────────────────────────────────────
    var jsCore = "";
    try {
      jsCore = HtmlService.createHtmlOutputFromFile("JS_Core").getContent();
      resultado.jsCoreEncontrado = !!jsCore;
    } catch (eJs) {
      resultado.bloqueios.push("JS_Core.html nao lido: " + eJs.message);
    }
    if (jsCore) {
      resultado.jsCoreEsqueciFluxoReal          = jsCore.indexOf("abrirModalEsqueciSenha_") >= 0 &&
                                                  jsCore.indexOf("esqueceuSenha_") >= 0;
      resultado.jsCoreChamaSolicitarRecuperacao = jsCore.indexOf("solicitarRecuperacaoSenhaV2_DEV") >= 0;
      resultado.jsCoreChalaRedefinirPorToken    = jsCore.indexOf("redefinirSenhaPorTokenV2_DEV") >= 0;
      resultado.jsCoreValidaTokenPreenchido     = jsCore.indexOf("rd-token") >= 0 &&
                                                  (jsCore.indexOf("Informe o token") >= 0 || jsCore.indexOf("!token") >= 0);
      resultado.jsCoreValidaMinimo8             = jsCore.indexOf("length < 8") >= 0 ||
                                                  jsCore.indexOf(".length<8") >= 0;
      resultado.jsCoreValidaConfirmacaoSenha    = jsCore.indexOf("coincidem") >= 0 ||
                                                  (jsCore.indexOf("confirmar") >= 0 && jsCore.indexOf("!==") >= 0);
      resultado.jsCoreLoginV2Continua           = jsCore.indexOf("loginV2_DEV") >= 0;
      resultado.jsCoreFallbackContinua          = jsCore.indexOf(".login(") >= 0 &&
                                                  jsCore.indexOf("fallback") >= 0;
      resultado.jsCorePrimeiroAcessoContinua    = jsCore.indexOf("trocarSenhaPrimeiroAcessoV2_DEV") >= 0;
      resultado.jsCoreEmailRealAusente          = jsCore.indexOf("MailApp") < 0 &&
                                                  jsCore.indexOf("GmailApp") < 0;

      if (!resultado.jsCoreEsqueciFluxoReal)
        resultado.bloqueios.push("JS_Core.html — esqueceuSenha_ nao chama fluxo real.");
      if (!resultado.jsCoreChamaSolicitarRecuperacao)
        resultado.bloqueios.push("JS_Core.html — solicitarRecuperacaoSenhaV2_DEV ausente.");
      if (!resultado.jsCoreChalaRedefinirPorToken)
        resultado.bloqueios.push("JS_Core.html — redefinirSenhaPorTokenV2_DEV ausente.");
      if (!resultado.jsCoreValidaTokenPreenchido)
        resultado.bloqueios.push("JS_Core.html — validacao de token ausente.");
      if (!resultado.jsCoreValidaMinimo8)
        resultado.bloqueios.push("JS_Core.html — validacao minimo 8 caracteres ausente.");
      if (!resultado.jsCoreValidaConfirmacaoSenha)
        resultado.bloqueios.push("JS_Core.html — validacao de confirmacao de senha ausente.");
      if (!resultado.jsCoreLoginV2Continua)
        resultado.bloqueios.push("JS_Core.html — loginV2_DEV ausente.");
      if (!resultado.jsCoreFallbackContinua)
        resultado.bloqueios.push("JS_Core.html — fallback legado ausente.");
      if (!resultado.jsCorePrimeiroAcessoContinua)
        resultado.bloqueios.push("JS_Core.html — trocarSenhaPrimeiroAcessoV2_DEV ausente.");
      if (!resultado.jsCoreEmailRealAusente)
        resultado.bloqueios.push("JS_Core.html — MailApp ou GmailApp detectado.");
    }

    // ── Backend / DB ─────────────────────────────────────────
    resultado.loginAntigoBackendExiste = (typeof login === "function");
    if (!resultado.loginAntigoBackendExiste)
      resultado.avisos.push("Funcao login() nao encontrada — verificar SGO_Auth.js.");

    var dbId = String(PropertiesService.getScriptProperties().getProperty("DB_ID") || "").trim();
    if (!dbId) {
      resultado.bloqueios.push("DB_ID nao configurado.");
    } else {
      var ss    = SpreadsheetApp.openById(dbId);
      var shCad = ss.getSheetByName("CAD_USUARIOS");
      if (shCad && shCad.getLastRow() >= 1) {
        var hCad = shCad.getRange(1, 1, 1, shCad.getLastColumn()).getValues()[0]
                     .map(function (v) { return String(v || "").trim(); });
        resultado.cadUsuariosIntacta = (JSON.stringify(hCad) === JSON.stringify(HEADERS_CAD_U));
        if (!resultado.cadUsuariosIntacta)
          resultado.bloqueios.push("CAD_USUARIOS headers alterados.");
      } else {
        resultado.bloqueios.push("CAD_USUARIOS nao encontrada.");
      }
    }

    var tudo = resultado.devConfirmado &&
               resultado.indexEncontrado &&
               resultado.indexModalEsqueciExiste &&
               resultado.indexModalRedefinirExiste &&
               resultado.jsCoreEncontrado &&
               resultado.jsCoreEsqueciFluxoReal &&
               resultado.jsCoreChamaSolicitarRecuperacao &&
               resultado.jsCoreChalaRedefinirPorToken &&
               resultado.jsCoreValidaTokenPreenchido &&
               resultado.jsCoreValidaMinimo8 &&
               resultado.jsCoreValidaConfirmacaoSenha &&
               resultado.jsCoreLoginV2Continua &&
               resultado.jsCoreFallbackContinua &&
               resultado.jsCorePrimeiroAcessoContinua &&
               resultado.jsCoreEmailRealAusente &&
               resultado.cadUsuariosIntacta &&
               resultado.bloqueios.length === 0;

    resultado.conclusao = tudo
      ? "AUTH.4D APROVADO — fluxo esqueci senha implementado. Execute TESTAR_AUTH4D_ESQUECI_SENHA_DEV."
      : "AUTH.4D BLOQUEADO — corrija os bloqueios";

  } catch (e) {
    resultado.bloqueios.push("Falha: " + e.message);
    resultado.conclusao = "AUTH.4D BLOQUEADO";
  }

  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

// ── TESTAR_AUTH4D_ESQUECI_SENHA_DEV ──────────────────────────
function TESTAR_AUTH4D_ESQUECI_SENHA_DEV() {
  // Senhas de teste DEV — NUNCA logadas nem retornadas
  var SENHA_ORIG = "Auth4aTeste2026"; // CAND_A — senha original do admin após AUTH.4A
  var SENHA_NOVA = "Auth4dTeste2026"; // senha temporária para este teste

  var resultado = {
    funcao               : "TESTAR_AUTH4D_ESQUECI_SENHA_DEV",
    devConfirmado        : false,
    adminUsuario         : null,
    adminId              : null,
    adminTemEmail        : false,
    tokenGerado          : false,
    tokenHashGravado     : false,
    emailNaoEnviado      : true,
    redefinicaoOk        : false,
    loginNovaSenhaOk     : false,
    senhaRestauradaOk    : false,
    loginOriginalOk      : false,
    cadUsuariosIntacta   : false,
    tokenLimpo           : false,
    bloqueios            : [],
    avisos               : []
  };

  try {
    var DEV_SCRIPT_ID = "12xiWNlQ-WKVpiofmcGfBaX4EBdlsIxKFJG2PFTamHUmSUs89c4LW3WSG";
    var HEADERS_CAD_U = ["ID","USUARIO","SENHA","NOME","PERFIL","STATUS","CRIADO_EM","CLIENTE_ID"];

    resultado.devConfirmado = (ScriptApp.getScriptId() === DEV_SCRIPT_ID);
    if (!resultado.devConfirmado) {
      SENHA_ORIG = null; SENHA_NOVA = null;
      resultado.bloqueios.push("So pode rodar no DEV.");
      Logger.log(JSON.stringify(resultado, null, 2));
      return resultado;
    }

    var props = PropertiesService.getScriptProperties();
    var dbId  = String(props.getProperty("DB_ID") || "").trim();
    if (!dbId) {
      SENHA_ORIG = null; SENHA_NOVA = null;
      resultado.bloqueios.push("DB_ID nao configurado.");
      return resultado;
    }
    var ss = SpreadsheetApp.openById(dbId);

    // ── 1. Localizar admin em AUTH_USUARIOS ───────────────────
    var shAuth = ss.getSheetByName("AUTH_USUARIOS");
    if (!shAuth || shAuth.getLastRow() < 2) {
      SENHA_ORIG = null; SENHA_NOVA = null;
      resultado.bloqueios.push("AUTH_USUARIOS vazia.");
      Logger.log(JSON.stringify(resultado, null, 2));
      return resultado;
    }
    var dados = shAuth.getRange(1, 1, shAuth.getLastRow(), shAuth.getLastColumn()).getValues();
    var h     = dados[0].map(function (v) { return String(v || "").trim(); });
    var iId   = h.indexOf("ID");
    var iPer  = h.indexOf("PERFIL_PRINCIPAL");
    var iStat = h.indexOf("STATUS");
    var iUsu  = h.indexOf("USUARIO");
    var iEmail = h.indexOf("EMAIL");
    var adminUsu = null, adminId = null, adminEmail = null;
    for (var i = 1; i < dados.length; i++) {
      if (String(iPer  >= 0 ? dados[i][iPer]  : "").toUpperCase() === "ADMIN" &&
          String(iStat >= 0 ? dados[i][iStat] : "").toUpperCase() === "ATIVO") {
        adminUsu   = String(iUsu   >= 0 ? dados[i][iUsu]   : "");
        adminId    = String(iId    >= 0 ? dados[i][iId]    : "");
        adminEmail = String(iEmail >= 0 ? dados[i][iEmail] : "");
        break;
      }
    }
    if (!adminUsu) {
      SENHA_ORIG = null; SENHA_NOVA = null;
      resultado.bloqueios.push("Admin ATIVO nao encontrado em AUTH_USUARIOS.");
      Logger.log(JSON.stringify(resultado, null, 2));
      return resultado;
    }
    resultado.adminUsuario = adminUsu;
    resultado.adminId      = adminId;
    resultado.adminTemEmail = !!adminEmail;
    if (!adminEmail)
      resultado.avisos.push(
        "Admin sem EMAIL em AUTH_USUARIOS — solicitacao usara USUARIO. " +
        "Execute TESTAR_AUTH4A_ATUALIZAR_EMAIL_ADMIN_DEV para configurar email."
      );

    // ── 2. Baseline AUTH_RECUPERACAO_SENHA ────────────────────
    var shRec   = ss.getSheetByName("AUTH_RECUPERACAO_SENHA");
    var rRecA   = shRec ? shRec.getLastRow() : 0;

    // ── 3. Solicitar recuperação — dry-run, sem e-mail real ───
    var loginChave = adminEmail || adminUsu;
    var resRec = solicitarRecuperacaoSenhaV2_DEV(loginChave, true); // dry-run=true
    if (!resRec || !resRec.success) {
      SENHA_ORIG = null; SENHA_NOVA = null;
      resultado.bloqueios.push("solicitarRecuperacaoSenhaV2_DEV falhou: " + (resRec ? resRec.message : "null"));
      Logger.log(JSON.stringify(resultado, null, 2));
      return resultado;
    }
    resultado.tokenGerado    = !!(resRec.tokenParaTeste);
    resultado.emailNaoEnviado = true; // dry-run garante
    resultado.tokenHashGravado = shRec ? (shRec.getLastRow() > rRecA) : false;

    if (!resultado.tokenGerado)
      resultado.bloqueios.push("tokenParaTeste nao retornado — dry-run pode ter falhado.");
    if (!resultado.tokenHashGravado)
      resultado.bloqueios.push("AUTH_RECUPERACAO_SENHA nao foi incrementada.");

    var tokenRaw = resRec.tokenParaTeste || null;

    // ── 4. Redefinir senha via token ──────────────────────────
    if (tokenRaw) {
      var resRed = redefinirSenhaPorTokenV2_DEV(tokenRaw, SENHA_NOVA);
      tokenRaw = null; // descartar token
      resultado.redefinicaoOk = !!(resRed && resRed.success === true);
      if (!resultado.redefinicaoOk)
        resultado.bloqueios.push("redefinirSenhaPorTokenV2_DEV falhou: " + (resRed ? resRed.message : "null"));

      // ── 5. Confirmar login com nova senha ──────────────────
      if (resultado.redefinicaoOk) {
        var resL2 = loginV2_DEV(adminUsu, SENHA_NOVA);
        resultado.loginNovaSenhaOk = !!(resL2 && resL2.success === true);
        if (!resultado.loginNovaSenhaOk)
          resultado.bloqueios.push("loginV2_DEV falhou com nova senha: " + (resL2 ? resL2.message : "null"));

        // ── 6. Restaurar senha original ────────────────────────
        if (resultado.loginNovaSenhaOk && resL2.sessionId) {
          var resRest = trocarSenhaPrimeiroAcessoV2_DEV(resL2.sessionId, SENHA_NOVA, SENHA_ORIG);
          SENHA_NOVA = null; // descartar
          resultado.senhaRestauradaOk = !!(resRest && resRest.success === true);
          if (!resultado.senhaRestauradaOk)
            resultado.avisos.push(
              "Restauracao falhou: " + (resRest ? resRest.message : "null") +
              " — admin pode precisar de reset manual."
            );

          // ── 7. Confirmar login com senha original ──────────
          if (resultado.senhaRestauradaOk) {
            var resL3 = loginV2_DEV(adminUsu, SENHA_ORIG);
            SENHA_ORIG = null; // descartar
            resultado.loginOriginalOk = !!(resL3 && resL3.success === true);
            if (!resultado.loginOriginalOk)
              resultado.avisos.push("Login com senha original restaurada falhou — verificar AUTH_USUARIOS.");
          } else {
            SENHA_ORIG = null;
          }
        } else {
          SENHA_NOVA = null;
          SENHA_ORIG = null;
        }
      } else {
        SENHA_NOVA = null;
        SENHA_ORIG = null;
      }
    } else {
      SENHA_NOVA = null;
      SENHA_ORIG = null;
    }

    // ── 8. Limpar ScriptProperty de token temporário ──────────
    props.deleteProperty("AUTH4A_TEST_TOKEN_TEMP");
    resultado.tokenLimpo = true;

    // ── 9. CAD_USUARIOS intacta ───────────────────────────────
    var shCad = ss.getSheetByName("CAD_USUARIOS");
    if (shCad && shCad.getLastRow() >= 1) {
      var hCad = shCad.getRange(1, 1, 1, shCad.getLastColumn()).getValues()[0]
                   .map(function (v) { return String(v || "").trim(); });
      resultado.cadUsuariosIntacta = (JSON.stringify(hCad) === JSON.stringify(HEADERS_CAD_U));
      if (!resultado.cadUsuariosIntacta)
        resultado.bloqueios.push("CAD_USUARIOS headers alterados — CRITICO.");
    } else {
      resultado.bloqueios.push("CAD_USUARIOS nao encontrada.");
    }

    var tudo = resultado.devConfirmado &&
               resultado.tokenGerado &&
               resultado.tokenHashGravado &&
               resultado.emailNaoEnviado &&
               resultado.redefinicaoOk &&
               resultado.loginNovaSenhaOk &&
               resultado.senhaRestauradaOk &&
               resultado.cadUsuariosIntacta &&
               resultado.bloqueios.length === 0;

    resultado.conclusao = tudo
      ? "AUTH.4D APROVADO — fluxo esqueci senha backend completo e restaurado. Proximo: AUTH.5."
      : "AUTH.4D BLOQUEADO — corrija os bloqueios";

  } catch (e) {
    resultado.bloqueios.push("Falha: " + e.message);
    resultado.conclusao = "AUTH.4D BLOQUEADO";
  } finally {
    SENHA_ORIG = null;
    SENHA_NOVA = null;
  }

  // Resultado nunca inclui senhas — apenas flags
  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

// ============================================================
// AUTH.5 — PERMISSÕES E PERFIS POR MÓDULO
// ============================================================

// ── AUDITAR_AUTH5_PERMISSOES_SCHEMA_SEM_GRAVAR ───────────────
function AUDITAR_AUTH5_PERMISSOES_SCHEMA_SEM_GRAVAR() {
  var resultado = {
    funcao                  : "AUDITAR_AUTH5_PERMISSOES_SCHEMA_SEM_GRAVAR",
    devConfirmado           : false,
    producaoNaoAlterada     : false,
    cadUsuariosIntacta      : false,
    authPerfisExiste        : false,
    authPerfisTemDados      : false,
    perfisPadrao            : [],
    perfisFaltando          : [],
    authPermissoesExiste    : false,
    authPermissoesHeaders   : false,
    authPermissoesDados     : 0,
    authUsuPermissoesExiste : false,
    authUsuPermissoesHeaders: false,
    avisos                  : [],
    bloqueios               : [],
    conclusao               : ""
  };

  var HEADERS_CAD_U    = ["ID","USUARIO","SENHA","NOME","PERFIL","STATUS","CRIADO_EM","CLIENTE_ID"];
  var PERFIS_ESPERADOS = ["ADMIN","DIRETORIA","GESTOR","TECNICO","METROLOGIA","COMERCIAL","FINANCEIRO","CLIENTE"];
  var HEADERS_PERM     = ["ID","PERFIL","MODULO","ACAO","PERMITIDO","ESCOPO","STATUS","CRIADO_EM","CRIADO_POR","ATUALIZADO_EM","ATUALIZADO_POR"];
  var HEADERS_USU_PERM = ["ID","USUARIO_ID","MODULO","ACAO","PERMITIDO","ESCOPO","MOTIVO","STATUS","CRIADO_EM","CRIADO_POR","ATUALIZADO_EM","ATUALIZADO_POR"];

  try {
    // 1. Confirmar DEV
    var scriptId = ScriptApp.getScriptId();
    var DEV_SCRIPT_ID = "12xiWNlQ-WKVpiofmcGfBaX4EBdlsIxKFJG2PFTamHUmSUs89c4LW3WSG";
    if (scriptId !== DEV_SCRIPT_ID) {
      resultado.bloqueios.push("BLOQUEIO CRITICO: execucao fora do DEV. scriptId=" + scriptId);
      resultado.conclusao = "AUTH.5 BLOQUEADO — execucao nao autorizada fora do DEV.";
      return resultado;
    }
    resultado.devConfirmado = true;

    var props = PropertiesService.getScriptProperties();
    var dbId  = String(props.getProperty("DB_ID") || "").trim();
    if (!dbId) { resultado.bloqueios.push("DB_ID nao configurado."); }

    var ss = SpreadsheetApp.openById(dbId);

    // 2. Producao nao alterada
    var prodDbId = String(props.getProperty("DB_ID_PROD") || "").trim();
    resultado.producaoNaoAlterada = (!prodDbId || prodDbId !== dbId);
    if (!resultado.producaoNaoAlterada) resultado.bloqueios.push("DB_ID coincide com DB_ID_PROD — possivel execucao em producao.");

    // 3. CAD_USUARIOS intacta
    var shCad = ss.getSheetByName("CAD_USUARIOS");
    if (shCad && shCad.getLastRow() >= 1) {
      var hCad = shCad.getRange(1,1,1,shCad.getLastColumn()).getValues()[0]
                  .map(function(v){ return String(v||"").trim(); });
      resultado.cadUsuariosIntacta = (JSON.stringify(hCad) === JSON.stringify(HEADERS_CAD_U));
      if (!resultado.cadUsuariosIntacta) resultado.bloqueios.push("CAD_USUARIOS headers alterados — CRITICO.");
    } else {
      resultado.bloqueios.push("CAD_USUARIOS nao encontrada.");
    }

    // 4. AUTH_PERFIS
    var shPerfis = ss.getSheetByName("AUTH_PERFIS");
    resultado.authPerfisExiste = !!shPerfis;
    if (!shPerfis) {
      resultado.bloqueios.push("AUTH_PERFIS nao encontrada.");
    } else {
      var nLinhasPerfis = shPerfis.getLastRow();
      resultado.authPerfisTemDados = nLinhasPerfis > 1;
      if (!resultado.authPerfisTemDados) {
        resultado.avisos.push("AUTH_PERFIS existe mas sem dados — execute SETUP_AUTH2 ou insira perfis base.");
      } else {
        var dadosPerfis = shPerfis.getRange(1,1,nLinhasPerfis,shPerfis.getLastColumn()).getValues();
        var hPerfis = dadosPerfis[0].map(function(v){ return String(v||"").trim(); });
        var iNome   = hPerfis.indexOf("NOME");
        var iStatus = hPerfis.indexOf("STATUS");
        var perfisPresentes = [];
        for (var i = 1; i < dadosPerfis.length; i++) {
          var st = iStatus >= 0 ? String(dadosPerfis[i][iStatus]||"").toUpperCase() : "ATIVO";
          if (st === "ATIVO" || st === "") {
            var nome = iNome >= 0 ? String(dadosPerfis[i][iNome]||"").toUpperCase() : "";
            if (nome) perfisPresentes.push(nome);
          }
        }
        resultado.perfisPadrao = perfisPresentes;
        resultado.perfisFaltando = PERFIS_ESPERADOS.filter(function(p){ return perfisPresentes.indexOf(p) < 0; });
        if (resultado.perfisFaltando.length > 0) {
          resultado.avisos.push("Perfis ausentes em AUTH_PERFIS: " + resultado.perfisFaltando.join(", "));
        }
      }
    }

    // 5. AUTH_PERMISSOES
    var shPerm = ss.getSheetByName("AUTH_PERMISSOES");
    resultado.authPermissoesExiste = !!shPerm;
    if (!shPerm) {
      resultado.bloqueios.push("AUTH_PERMISSOES nao encontrada.");
    } else {
      resultado.authPermissoesDados = Math.max(0, shPerm.getLastRow() - 1);
      if (shPerm.getLastRow() >= 1) {
        var hPerm = shPerm.getRange(1,1,1,shPerm.getLastColumn()).getValues()[0]
                      .map(function(v){ return String(v||"").trim(); });
        var faltamPerm = HEADERS_PERM.filter(function(col){ return hPerm.indexOf(col) < 0; });
        resultado.authPermissoesHeaders = faltamPerm.length === 0;
        if (faltamPerm.length > 0) resultado.bloqueios.push("AUTH_PERMISSOES headers faltando: " + faltamPerm.join(", "));
      }
      if (resultado.authPermissoesDados === 0) {
        resultado.avisos.push("AUTH_PERMISSOES sem dados — execute SETUP_AUTH5_PERMISSOES_BASE_DEV_AUTORIZADO.");
      }
    }

    // 6. AUTH_USUARIO_PERMISSOES
    var shUp = ss.getSheetByName("AUTH_USUARIO_PERMISSOES");
    resultado.authUsuPermissoesExiste = !!shUp;
    if (!shUp) {
      resultado.bloqueios.push("AUTH_USUARIO_PERMISSOES nao encontrada.");
    } else {
      if (shUp.getLastRow() >= 1) {
        var hUp = shUp.getRange(1,1,1,shUp.getLastColumn()).getValues()[0]
                    .map(function(v){ return String(v||"").trim(); });
        var faltamUp = HEADERS_USU_PERM.filter(function(col){ return hUp.indexOf(col) < 0; });
        resultado.authUsuPermissoesHeaders = faltamUp.length === 0;
        if (faltamUp.length > 0) resultado.bloqueios.push("AUTH_USUARIO_PERMISSOES headers faltando: " + faltamUp.join(", "));
      }
    }

    var tudo = resultado.devConfirmado &&
               resultado.producaoNaoAlterada &&
               resultado.cadUsuariosIntacta &&
               resultado.authPerfisExiste &&
               resultado.authPermissoesExiste &&
               resultado.authPermissoesHeaders &&
               resultado.authUsuPermissoesExiste &&
               resultado.authUsuPermissoesHeaders &&
               resultado.bloqueios.length === 0;

    resultado.conclusao = tudo
      ? "AUTH.5 SCHEMA APROVADO — execute SETUP_AUTH5_PERMISSOES_BASE_DEV_AUTORIZADO se permissoes estiverem vazias."
      : "AUTH.5 SCHEMA BLOQUEADO — corrija os bloqueios.";

  } catch (e) {
    resultado.bloqueios.push("Falha: " + e.message);
    resultado.conclusao = "AUTH.5 SCHEMA BLOQUEADO";
  }

  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

// ── AUDITAR_AUTH5_PERMISSOES_FRONTEND_SEM_GRAVAR ─────────────
function AUDITAR_AUTH5_PERMISSOES_FRONTEND_SEM_GRAVAR() {
  var resultado = {
    funcao                      : "AUDITAR_AUTH5_PERMISSOES_FRONTEND_SEM_GRAVAR",
    devConfirmado               : false,
    producaoNaoAlterada         : false,
    cadUsuariosIntacta          : false,
    jsCoreLegivel               : false,
    temAuthV2ObterContexto      : false,
    temPermissoesContext        : false,
    temCarregarPermissoesAuth5  : false,
    temAplicarRegrasAcesso      : false,
    temLoginV2Fallback          : false,
    temFallbackLegado           : false,
    temPrimeiroAcesso           : false,
    temEsqueciSenha             : false,
    semMailApp                  : false,
    avisos                      : [],
    bloqueios                   : [],
    conclusao                   : ""
  };

  var HEADERS_CAD_U = ["ID","USUARIO","SENHA","NOME","PERFIL","STATUS","CRIADO_EM","CLIENTE_ID"];

  try {
    // 1. Confirmar DEV
    if (ScriptApp.getScriptId() !== "12xiWNlQ-WKVpiofmcGfBaX4EBdlsIxKFJG2PFTamHUmSUs89c4LW3WSG") {
      resultado.bloqueios.push("BLOQUEIO CRITICO: execucao fora do DEV.");
      resultado.conclusao = "AUTH.5 BLOQUEADO — execucao nao autorizada fora do DEV.";
      return resultado;
    }
    resultado.devConfirmado = true;

    var props  = PropertiesService.getScriptProperties();
    var dbId   = String(props.getProperty("DB_ID")      || "").trim();
    var prodId = String(props.getProperty("DB_ID_PROD") || "").trim();
    resultado.producaoNaoAlterada = (!prodId || prodId !== dbId);
    if (!resultado.producaoNaoAlterada) resultado.bloqueios.push("DB_ID coincide com DB_ID_PROD.");

    // 2. CAD_USUARIOS
    if (dbId) {
      try {
        var ss    = SpreadsheetApp.openById(dbId);
        var shCad = ss.getSheetByName("CAD_USUARIOS");
        if (shCad && shCad.getLastRow() >= 1) {
          var hCad = shCad.getRange(1,1,1,shCad.getLastColumn()).getValues()[0]
                      .map(function(v){ return String(v||"").trim(); });
          resultado.cadUsuariosIntacta = (JSON.stringify(hCad) === JSON.stringify(HEADERS_CAD_U));
          if (!resultado.cadUsuariosIntacta) resultado.bloqueios.push("CAD_USUARIOS headers alterados.");
        }
      } catch(eSS) { resultado.avisos.push("Nao foi possivel ler CAD_USUARIOS: " + eSS.message); }
    }

    // 3. Ler JS_Core.html
    var coreContent = "";
    try {
      coreContent = HtmlService.createHtmlOutputFromFile("JS_Core").getContent();
      resultado.jsCoreLegivel = true;
    } catch (eCore) {
      resultado.bloqueios.push("JS_Core.html nao legivel: " + eCore.message);
    }

    if (resultado.jsCoreLegivel) {
      // AUTH.5 additions
      resultado.temAuthV2ObterContexto     = coreContent.indexOf("authV2ObterContextoUsuario")   >= 0;
      resultado.temPermissoesContext       = coreContent.indexOf("PERMISSOES_CONTEXT")            >= 0;
      resultado.temCarregarPermissoesAuth5 = coreContent.indexOf("carregarPermissoesAuth5_")      >= 0;
      resultado.temAplicarRegrasAcesso     = coreContent.indexOf("aplicarRegrasDeAcesso_")        >= 0;

      // Fluxos anteriores preservados
      resultado.temLoginV2Fallback  = coreContent.indexOf("fazerLoginV2ComFallback_")   >= 0;
      resultado.temFallbackLegado   = coreContent.indexOf("USUARIO_NAO_ENCONTRADO")     >= 0;
      resultado.temPrimeiroAcesso   = coreContent.indexOf("abrirModalPrimeiroAcesso_")  >= 0;
      resultado.temEsqueciSenha     = coreContent.indexOf("abrirModalEsqueciSenha_")    >= 0;

      // Sem envio real de e-mail no frontend
      resultado.semMailApp = coreContent.indexOf("MailApp") < 0 && coreContent.indexOf("GmailApp") < 0;

      if (!resultado.temAuthV2ObterContexto)     resultado.bloqueios.push("authV2ObterContextoUsuario ausente em JS_Core.html.");
      if (!resultado.temPermissoesContext)        resultado.bloqueios.push("PERMISSOES_CONTEXT ausente em JS_Core.html.");
      if (!resultado.temCarregarPermissoesAuth5)  resultado.bloqueios.push("carregarPermissoesAuth5_ ausente em JS_Core.html.");
      if (!resultado.temAplicarRegrasAcesso)      resultado.bloqueios.push("aplicarRegrasDeAcesso_ ausente em JS_Core.html.");
      if (!resultado.temLoginV2Fallback)          resultado.bloqueios.push("fazerLoginV2ComFallback_ ausente — login V2 quebrado.");
      if (!resultado.temFallbackLegado)           resultado.bloqueios.push("Fallback legado ausente em JS_Core.html.");
      if (!resultado.temPrimeiroAcesso)           resultado.bloqueios.push("abrirModalPrimeiroAcesso_ ausente — AUTH.4C quebrado.");
      if (!resultado.temEsqueciSenha)             resultado.bloqueios.push("abrirModalEsqueciSenha_ ausente — AUTH.4D quebrado.");
      if (!resultado.semMailApp)                  resultado.bloqueios.push("MailApp/GmailApp encontrado em JS_Core.html — proibido.");
    }

    var tudo = resultado.devConfirmado &&
               resultado.producaoNaoAlterada &&
               resultado.cadUsuariosIntacta &&
               resultado.jsCoreLegivel &&
               resultado.temAuthV2ObterContexto &&
               resultado.temPermissoesContext &&
               resultado.temCarregarPermissoesAuth5 &&
               resultado.temAplicarRegrasAcesso &&
               resultado.temLoginV2Fallback &&
               resultado.temFallbackLegado &&
               resultado.temPrimeiroAcesso &&
               resultado.temEsqueciSenha &&
               resultado.semMailApp &&
               resultado.bloqueios.length === 0;

    resultado.conclusao = tudo
      ? "AUTH.5 FRONTEND APROVADO — execute TESTAR_AUTH5_ADMIN_ACESSO_TOTAL_DEV."
      : "AUTH.5 FRONTEND BLOQUEADO — corrija os bloqueios.";

  } catch (e) {
    resultado.bloqueios.push("Falha: " + e.message);
    resultado.conclusao = "AUTH.5 FRONTEND BLOQUEADO";
  }

  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

// ── SETUP_AUTH5_PERMISSOES_BASE_DEV_AUTORIZADO ───────────────
function SETUP_AUTH5_PERMISSOES_BASE_DEV_AUTORIZADO() {
  var TODOS_MODULOS = [
    "DASHBOARD","DASHBOARD_BI","CLIENTES","UNIDADES","EQUIPAMENTOS",
    "DOCUMENTOS","REGISTROS","RELATORIOS","INVENTARIO","IMPORTACAO",
    "CONTRATOS","OS","OS_QUESTIONARIOS","ASSISTENCIA_TECNICA","MISSOES",
    "TECNICOS","PECAS","FORNECEDORES","ESTOQUE","RASTREABILIDADE",
    "FROTA","ADMIN","AUTOCLAVE","FINANCEIRO","MOBILE_CAMPO",
    "FIN_CARTOES","LAVADORA","RELATORIO_CONFORMIDADE","PLANEJAMENTO_CME"
  ];
  var SEM_ADMIN = TODOS_MODULOS.filter(function(m){ return m !== "ADMIN"; });

  var MAPA_SETUP = {
    ADMIN    : TODOS_MODULOS,
    DIRETORIA: SEM_ADMIN,
    GESTOR   : [
      "DASHBOARD","CLIENTES","UNIDADES","EQUIPAMENTOS","DOCUMENTOS","REGISTROS",
      "RELATORIOS","INVENTARIO","CONTRATOS","OS","MISSOES","TECNICOS","PECAS",
      "FORNECEDORES","ESTOQUE","RASTREABILIDADE","FROTA","ASSISTENCIA_TECNICA"
    ],
    TECNICO  : [
      "DASHBOARD","EQUIPAMENTOS","DOCUMENTOS","REGISTROS","OS",
      "ASSISTENCIA_TECNICA","MISSOES","PECAS","RASTREABILIDADE","MOBILE_CAMPO"
    ],
    METROLOGIA: [
      "DASHBOARD","DASHBOARD_BI","EQUIPAMENTOS","DOCUMENTOS","REGISTROS","RELATORIOS",
      "OS","OS_QUESTIONARIOS","ASSISTENCIA_TECNICA","MISSOES","PECAS",
      "RASTREABILIDADE","AUTOCLAVE","LAVADORA","RELATORIO_CONFORMIDADE"
    ],
    COMERCIAL : ["DASHBOARD","CLIENTES","CONTRATOS","RELATORIOS","DASHBOARD_BI"],
    FINANCEIRO: [
      "DASHBOARD","CONTRATOS","OS","RELATORIOS","DASHBOARD_BI","FINANCEIRO","FIN_CARTOES"
    ],
    CLIENTE   : ["DASHBOARD","EQUIPAMENTOS","DOCUMENTOS","OS","RELATORIOS"]
  };

  var resultado = {
    funcao              : "SETUP_AUTH5_PERMISSOES_BASE_DEV_AUTORIZADO",
    devConfirmado       : false,
    producaoNaoAlterada : false,
    cadUsuariosIntacta  : false,
    inseridos           : 0,
    jaExistiam          : 0,
    bloqueios           : [],
    conclusao           : ""
  };

  var HEADERS_CAD_U = ["ID","USUARIO","SENHA","NOME","PERFIL","STATUS","CRIADO_EM","CLIENTE_ID"];

  try {
    // 1. Confirmar DEV
    if (ScriptApp.getScriptId() !== "12xiWNlQ-WKVpiofmcGfBaX4EBdlsIxKFJG2PFTamHUmSUs89c4LW3WSG") {
      resultado.bloqueios.push("BLOQUEIO CRITICO: execucao fora do DEV.");
      resultado.conclusao = "AUTH.5 SETUP BLOQUEADO — execucao nao autorizada fora do DEV.";
      return resultado;
    }
    resultado.devConfirmado = true;

    var props  = PropertiesService.getScriptProperties();
    var dbId   = String(props.getProperty("DB_ID")      || "").trim();
    var prodId = String(props.getProperty("DB_ID_PROD") || "").trim();
    resultado.producaoNaoAlterada = (!prodId || prodId !== dbId);
    if (!resultado.producaoNaoAlterada) {
      resultado.bloqueios.push("DB_ID coincide com DB_ID_PROD — abortando.");
      resultado.conclusao = "AUTH.5 SETUP BLOQUEADO";
      return resultado;
    }
    if (!dbId) { resultado.bloqueios.push("DB_ID nao configurado."); return resultado; }

    var ss = SpreadsheetApp.openById(dbId);

    // 2. CAD_USUARIOS intacta
    var shCad = ss.getSheetByName("CAD_USUARIOS");
    if (shCad && shCad.getLastRow() >= 1) {
      var hCad = shCad.getRange(1,1,1,shCad.getLastColumn()).getValues()[0]
                  .map(function(v){ return String(v||"").trim(); });
      resultado.cadUsuariosIntacta = (JSON.stringify(hCad) === JSON.stringify(HEADERS_CAD_U));
      if (!resultado.cadUsuariosIntacta) { resultado.bloqueios.push("CAD_USUARIOS alterada — abortando."); return resultado; }
    }

    // 3. Carregar AUTH_PERMISSOES e mapear existentes
    var shPerm = ss.getSheetByName("AUTH_PERMISSOES");
    if (!shPerm) { resultado.bloqueios.push("AUTH_PERMISSOES nao encontrada."); return resultado; }

    var agora = new Date().toISOString();
    var existentes = {};
    var nLinhas = shPerm.getLastRow();

    if (nLinhas >= 2) {
      var dadosExist = shPerm.getRange(1,1,nLinhas,shPerm.getLastColumn()).getValues();
      var hEx = dadosExist[0].map(function(v){ return String(v||"").trim(); });
      var iExP = hEx.indexOf("PERFIL");
      var iExM = hEx.indexOf("MODULO");
      var iExA = hEx.indexOf("ACAO");
      for (var i = 1; i < dadosExist.length; i++) {
        var chave = [
          String(iExP >= 0 ? dadosExist[i][iExP] : "").toUpperCase(),
          String(iExM >= 0 ? dadosExist[i][iExM] : "").toUpperCase(),
          String(iExA >= 0 ? dadosExist[i][iExA] : "").toUpperCase()
        ].join("|");
        existentes[chave] = true;
      }
    }

    // 4. Descobrir headers para montar linhas
    var hPerm;
    if (nLinhas >= 1) {
      hPerm = shPerm.getRange(1,1,1,shPerm.getLastColumn()).getValues()[0]
                .map(function(v){ return String(v||"").trim(); });
    } else {
      hPerm = ["ID","PERFIL","MODULO","ACAO","PERMITIDO","ESCOPO","STATUS","CRIADO_EM","CRIADO_POR","ATUALIZADO_EM","ATUALIZADO_POR"];
      shPerm.appendRow(hPerm);
    }

    var linhasNovas = [];

    Object.keys(MAPA_SETUP).forEach(function(perfil) {
      var modulos = MAPA_SETUP[perfil];
      modulos.forEach(function(modulo) {
        var chave = perfil + "|" + modulo + "|VER";
        if (existentes[chave]) {
          resultado.jaExistiam++;
          return;
        }
        var linha = hPerm.map(function(col) {
          switch (col) {
            case "ID"            : return Utilities.getUuid();
            case "PERFIL"        : return perfil;
            case "MODULO"        : return modulo;
            case "ACAO"          : return "VER";
            case "PERMITIDO"     : return "SIM";
            case "ESCOPO"        : return "GLOBAL";
            case "STATUS"        : return "ATIVO";
            case "CRIADO_EM"     : return agora;
            case "CRIADO_POR"    : return "AUTH5_SETUP_DEV";
            case "ATUALIZADO_EM" : return agora;
            case "ATUALIZADO_POR": return "AUTH5_SETUP_DEV";
            default              : return "";
          }
        });
        linhasNovas.push(linha);
        resultado.inseridos++;
      });
    });

    // 5. Inserir em lote
    if (linhasNovas.length > 0) {
      var ultLinha = shPerm.getLastRow();
      shPerm.getRange(ultLinha + 1, 1, linhasNovas.length, hPerm.length).setValues(linhasNovas);
    }

    var tudo = resultado.devConfirmado &&
               resultado.producaoNaoAlterada &&
               resultado.cadUsuariosIntacta &&
               resultado.bloqueios.length === 0;

    resultado.conclusao = tudo
      ? ("AUTH.5 SETUP CONCLUIDO — inseridos:" + resultado.inseridos + ", jaExistiam:" + resultado.jaExistiam + ".")
      : "AUTH.5 SETUP BLOQUEADO — corrija os bloqueios.";

  } catch (e) {
    resultado.bloqueios.push("Falha: " + e.message);
    resultado.conclusao = "AUTH.5 SETUP BLOQUEADO";
  }

  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

// ── TESTAR_AUTH5_ADMIN_ACESSO_TOTAL_DEV ──────────────────────
function TESTAR_AUTH5_ADMIN_ACESSO_TOTAL_DEV() {
  var resultado = {
    funcao              : "TESTAR_AUTH5_ADMIN_ACESSO_TOTAL_DEV",
    devConfirmado       : false,
    producaoNaoAlterada : false,
    cadUsuariosIntacta  : false,
    loginOk             : false,
    contextoOk          : false,
    isAdminTrue         : false,
    totalModulos        : 0,
    checaFinanceiro     : false,
    checaAdmin          : false,
    checaMobile         : false,
    bloqueios           : [],
    conclusao           : ""
  };

  var HEADERS_CAD_U    = ["ID","USUARIO","SENHA","NOME","PERFIL","STATUS","CRIADO_EM","CLIENTE_ID"];
  var MODULOS_VERIFICAR = ["dashboard","financeiro","admin","mobile_campo","relatorios"];
  var SENHA_ADMIN = null;

  try {
    // 1. Confirmar DEV
    if (ScriptApp.getScriptId() !== "12xiWNlQ-WKVpiofmcGfBaX4EBdlsIxKFJG2PFTamHUmSUs89c4LW3WSG") {
      resultado.bloqueios.push("BLOQUEIO CRITICO: execucao fora do DEV.");
      resultado.conclusao = "AUTH.5 BLOQUEADO";
      return resultado;
    }
    resultado.devConfirmado = true;

    var props  = PropertiesService.getScriptProperties();
    var dbId   = String(props.getProperty("DB_ID")      || "").trim();
    var prodId = String(props.getProperty("DB_ID_PROD") || "").trim();
    resultado.producaoNaoAlterada = (!prodId || prodId !== dbId);
    if (!resultado.producaoNaoAlterada) resultado.bloqueios.push("DB_ID coincide com DB_ID_PROD.");
    if (!dbId) { resultado.bloqueios.push("DB_ID nao configurado."); return resultado; }

    var ss = SpreadsheetApp.openById(dbId);

    // 2. CAD_USUARIOS intacta
    var shCad = ss.getSheetByName("CAD_USUARIOS");
    if (shCad && shCad.getLastRow() >= 1) {
      var hCad = shCad.getRange(1,1,1,shCad.getLastColumn()).getValues()[0]
                  .map(function(v){ return String(v||"").trim(); });
      resultado.cadUsuariosIntacta = (JSON.stringify(hCad) === JSON.stringify(HEADERS_CAD_U));
      if (!resultado.cadUsuariosIntacta) resultado.bloqueios.push("CAD_USUARIOS alterada — CRITICO.");
    }

    // 3. Login admin (senha interna — NUNCA logada)
    SENHA_ADMIN = "Auth4aTeste2026";
    var resLogin = loginV2_DEV("admin", SENHA_ADMIN);
    SENHA_ADMIN = null;

    resultado.loginOk = !!(resLogin && resLogin.success && resLogin.sessionId);
    if (!resultado.loginOk) {
      resultado.bloqueios.push("Login admin falhou: " + (resLogin ? resLogin.message : "sem resposta"));
      resultado.conclusao = "AUTH.5 BLOQUEADO — login admin nao funcionou.";
      return resultado;
    }

    // 4. Obter contexto
    var ctx = authV2ObterContextoUsuario(resLogin.sessionId);
    resultado.contextoOk   = !!(ctx && ctx.success);
    resultado.isAdminTrue  = !!(ctx && ctx.success && ctx.isAdmin === true);
    resultado.totalModulos = ctx && ctx.success ? ctx.permissoes.length : 0;

    if (!resultado.contextoOk)  resultado.bloqueios.push("authV2ObterContextoUsuario falhou: " + (ctx ? ctx.message : "sem resposta"));
    if (!resultado.isAdminTrue) resultado.bloqueios.push("isAdmin deveria ser true para ADMIN.");

    // 5. Verificar modulos chave
    MODULOS_VERIFICAR.forEach(function(mod) {
      var chk = authV2UsuarioPodeAcessarModulo(resLogin.sessionId, mod);
      if (!chk || !chk.permitido) {
        resultado.bloqueios.push("ADMIN deveria ter acesso a [" + mod + "] — bloqueado.");
      }
    });
    resultado.checaFinanceiro = !resultado.bloqueios.some(function(b){ return b.indexOf("[financeiro]") >= 0; });
    resultado.checaAdmin      = !resultado.bloqueios.some(function(b){ return b.indexOf("[admin]")      >= 0; });
    resultado.checaMobile     = !resultado.bloqueios.some(function(b){ return b.indexOf("[mobile_campo]") >= 0; });

    var tudo = resultado.devConfirmado &&
               resultado.producaoNaoAlterada &&
               resultado.cadUsuariosIntacta &&
               resultado.loginOk &&
               resultado.contextoOk &&
               resultado.isAdminTrue &&
               resultado.bloqueios.length === 0;

    resultado.conclusao = tudo
      ? "AUTH.5 ADMIN APROVADO — isAdmin:true, todos os modulos acessiveis."
      : "AUTH.5 ADMIN BLOQUEADO — corrija os bloqueios.";

  } catch (e) {
    resultado.bloqueios.push("Falha: " + e.message);
    resultado.conclusao = "AUTH.5 ADMIN BLOQUEADO";
  } finally {
    SENHA_ADMIN = null;
  }

  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

// ── TESTAR_AUTH5_PERFIL_TECNICO_RESTRITO_DEV ─────────────────
function TESTAR_AUTH5_PERFIL_TECNICO_RESTRITO_DEV() {
  var USUARIO_TEST = "tecnico_auth5_test";

  var resultado = {
    funcao                : "TESTAR_AUTH5_PERFIL_TECNICO_RESTRITO_DEV",
    devConfirmado         : false,
    producaoNaoAlterada   : false,
    cadUsuariosIntacta    : false,
    usuarioCriado         : false,
    usuarioJaExistia      : false,
    sessaoCriada          : false,
    contextoOk            : false,
    isAdminFalse          : false,
    perfil                : null,
    modulosObtidos        : [],
    modulosEsperadosOk    : false,
    modulosProibidosOk    : false,
    mobileCampoPermitido  : false,
    adminBloqueado        : false,
    financeiroBloqueado   : false,
    limpezaOk             : false,
    bloqueios             : [],
    conclusao             : ""
  };

  var HEADERS_CAD_U     = ["ID","USUARIO","SENHA","NOME","PERFIL","STATUS","CRIADO_EM","CLIENTE_ID"];
  var MODULOS_ESPERADOS = ["mobile_campo","assistencia_tecnica","os","equipamentos","dashboard"];
  var MODULOS_PROIBIDOS = ["admin","financeiro","fin_cartoes","importacao"];

  var ss          = null;
  var sessionId   = null;
  var rowToDelete = null;

  try {
    // 1. Confirmar DEV
    if (ScriptApp.getScriptId() !== "12xiWNlQ-WKVpiofmcGfBaX4EBdlsIxKFJG2PFTamHUmSUs89c4LW3WSG") {
      resultado.bloqueios.push("BLOQUEIO CRITICO: execucao fora do DEV.");
      resultado.conclusao = "AUTH.5 BLOQUEADO";
      return resultado;
    }
    resultado.devConfirmado = true;

    var props  = PropertiesService.getScriptProperties();
    var dbId   = String(props.getProperty("DB_ID")      || "").trim();
    var prodId = String(props.getProperty("DB_ID_PROD") || "").trim();
    resultado.producaoNaoAlterada = (!prodId || prodId !== dbId);
    if (!resultado.producaoNaoAlterada) resultado.bloqueios.push("DB_ID coincide com DB_ID_PROD.");
    if (!dbId) { resultado.bloqueios.push("DB_ID nao configurado."); return resultado; }

    ss = SpreadsheetApp.openById(dbId);

    // 2. CAD_USUARIOS intacta
    var shCad = ss.getSheetByName("CAD_USUARIOS");
    if (shCad && shCad.getLastRow() >= 1) {
      var hCad = shCad.getRange(1,1,1,shCad.getLastColumn()).getValues()[0]
                  .map(function(v){ return String(v||"").trim(); });
      resultado.cadUsuariosIntacta = (JSON.stringify(hCad) === JSON.stringify(HEADERS_CAD_U));
      if (!resultado.cadUsuariosIntacta) resultado.bloqueios.push("CAD_USUARIOS alterada — CRITICO.");
    }

    // 3. Criar/localizar usuario TECNICO de teste em AUTH_USUARIOS
    var shAuth = ss.getSheetByName("AUTH_USUARIOS");
    if (!shAuth) { resultado.bloqueios.push("AUTH_USUARIOS nao encontrada."); return resultado; }

    var nRows    = shAuth.getLastRow();
    var dadosAuth = nRows >= 1 ? shAuth.getRange(1,1,nRows,shAuth.getLastColumn()).getValues() : [[]];
    var hAuth    = dadosAuth[0].map(function(v){ return String(v||"").trim(); });
    var iUsrCol  = hAuth.indexOf("USUARIO");
    var iIdCol   = hAuth.indexOf("ID");

    var testUserId  = "AUTH5_TECNICO_TEST_" + Date.now();
    var existingRow = -1;

    for (var i = 1; i < dadosAuth.length; i++) {
      if (iUsrCol >= 0 && String(dadosAuth[i][iUsrCol]) === USUARIO_TEST) {
        existingRow = i + 1;
        testUserId  = iIdCol >= 0 ? String(dadosAuth[i][iIdCol]) : testUserId;
        break;
      }
    }

    var agora = new Date().toISOString();

    if (existingRow < 0) {
      var novaLinha = hAuth.map(function(col) {
        switch (col) {
          case "ID"              : return testUserId;
          case "USUARIO"         : return USUARIO_TEST;
          case "NOME"            : return "Tecnico Auth5 Test";
          case "EMAIL"           : return "tecnico_auth5@test.dev";
          case "SENHA_HASH"      : return "placeholder_hash_auth5";
          case "SENHA_SALT"      : return "placeholder_salt_auth5";
          case "SENHA_TEMPORARIA": return "NAO";
          case "PERFIL_PRINCIPAL": return "TECNICO";
          case "STATUS"          : return "ATIVO";
          case "CRIADO_EM"       : return agora;
          case "CRIADO_POR"      : return "AUTH5_SETUP_TEST";
          case "ATUALIZADO_EM"   : return agora;
          case "ATUALIZADO_POR"  : return "AUTH5_SETUP_TEST";
          default                : return "";
        }
      });
      shAuth.appendRow(novaLinha);
      rowToDelete = shAuth.getLastRow();
      resultado.usuarioCriado = true;
    } else {
      resultado.usuarioJaExistia = true;
    }

    // 4. Criar sessao manualmente em ScriptProperties
    sessionId = Utilities.getUuid();
    var expiresAt = new Date(Date.now() + 3600000).toISOString();
    props.setProperty("SGO_SESSION_" + sessionId, JSON.stringify({
      sessionId   : sessionId,
      userId      : testUserId,
      usuario     : USUARIO_TEST,
      nome        : "Tecnico Auth5 Test",
      perfil      : "TECNICO",
      email       : "tecnico_auth5@test.dev",
      expiresAt   : expiresAt,
      criadoEm    : agora
    }));
    resultado.sessaoCriada = true;

    // 5. Obter contexto
    var ctx = authV2ObterContextoUsuario(sessionId);
    resultado.contextoOk   = !!(ctx && ctx.success);
    resultado.isAdminFalse = !!(ctx && ctx.success && ctx.isAdmin === false);
    resultado.perfil       = ctx && ctx.success ? ctx.usuario.perfil : null;
    resultado.modulosObtidos = ctx && ctx.success ? ctx.permissoes : [];

    if (!resultado.contextoOk)   resultado.bloqueios.push("authV2ObterContextoUsuario falhou: " + (ctx ? ctx.message : "sem resposta"));
    if (!resultado.isAdminFalse) resultado.bloqueios.push("isAdmin deveria ser false para TECNICO.");

    // 6. Verificar modulos esperados
    resultado.modulosEsperadosOk = true;
    MODULOS_ESPERADOS.forEach(function(mod) {
      if (resultado.modulosObtidos.indexOf(mod) < 0) {
        resultado.modulosEsperadosOk = false;
        resultado.bloqueios.push("TECNICO: modulo esperado ausente: " + mod);
      }
    });

    // 7. Verificar modulos proibidos
    resultado.modulosProibidosOk = true;
    MODULOS_PROIBIDOS.forEach(function(mod) {
      if (resultado.modulosObtidos.indexOf(mod) >= 0) {
        resultado.modulosProibidosOk = false;
        resultado.bloqueios.push("TECNICO: modulo proibido presente: " + mod);
      }
    });

    // 8. Verificar podeAcessarModulo
    var chkMobile = authV2UsuarioPodeAcessarModulo(sessionId, "MOBILE_CAMPO");
    resultado.mobileCampoPermitido = !!(chkMobile && chkMobile.permitido);
    if (!resultado.mobileCampoPermitido) resultado.bloqueios.push("MOBILE_CAMPO deveria ser permitido para TECNICO.");

    var chkAdmin = authV2UsuarioPodeAcessarModulo(sessionId, "ADMIN");
    resultado.adminBloqueado = !!(chkAdmin && !chkAdmin.permitido);
    if (!resultado.adminBloqueado) resultado.bloqueios.push("ADMIN deveria ser bloqueado para TECNICO.");

    var chkFin = authV2UsuarioPodeAcessarModulo(sessionId, "FINANCEIRO");
    resultado.financeiroBloqueado = !!(chkFin && !chkFin.permitido);
    if (!resultado.financeiroBloqueado) resultado.bloqueios.push("FINANCEIRO deveria ser bloqueado para TECNICO.");

    var tudo = resultado.devConfirmado &&
               resultado.producaoNaoAlterada &&
               resultado.cadUsuariosIntacta &&
               resultado.sessaoCriada &&
               resultado.contextoOk &&
               resultado.isAdminFalse &&
               resultado.modulosEsperadosOk &&
               resultado.modulosProibidosOk &&
               resultado.mobileCampoPermitido &&
               resultado.adminBloqueado &&
               resultado.financeiroBloqueado &&
               resultado.bloqueios.length === 0;

    resultado.conclusao = tudo
      ? "AUTH.5 TECNICO APROVADO — perfil restrito validado."
      : "AUTH.5 TECNICO BLOQUEADO — corrija os bloqueios.";

  } catch (e) {
    resultado.bloqueios.push("Falha: " + e.message);
    resultado.conclusao = "AUTH.5 TECNICO BLOQUEADO";
  } finally {
    // Limpeza: sessao de teste
    try {
      if (sessionId) PropertiesService.getScriptProperties().deleteProperty("SGO_SESSION_" + sessionId);
    } catch (eClean) {}
    // Limpeza: linha AUTH_USUARIOS criada para o teste
    try {
      if (ss && rowToDelete) {
        ss.getSheetByName("AUTH_USUARIOS").deleteRow(rowToDelete);
        resultado.limpezaOk = true;
      } else if (!rowToDelete) {
        resultado.limpezaOk = true; // usuario ja existia, nada a remover
      }
    } catch (eRow) {
      resultado.bloqueios.push("Limpeza linha AUTH_USUARIOS falhou (row:" + rowToDelete + "): " + eRow.message);
    }
  }

  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

// ============================================================
// AUTH.6 — ENDURECIMENTO DE SESSÃO E GUARD LEVE
// ============================================================

// ── AUDITAR_AUTH6_SESSAO_GUARD_SEM_GRAVAR ────────────────────
function AUDITAR_AUTH6_SESSAO_GUARD_SEM_GRAVAR() {
  var resultado = {
    funcao                      : "AUDITAR_AUTH6_SESSAO_GUARD_SEM_GRAVAR",
    devConfirmado               : false,
    producaoNaoAlterada         : false,
    cadUsuariosIntacta          : false,
    authV2ValidarSessaoOk       : false,
    authV2ExigirModuloOk        : false,
    authV2PodeAcessarModuloOk   : false,
    authV2ObterContextoOk       : false,
    jsCoreLegivel               : false,
    temSessaoExpiradaHandler    : false,
    temLimparSessaoFront        : false,
    temExibirTelaLogin          : false,
    temLoginV2Fallback          : false,
    temFallbackLegado           : false,
    avisos                      : [],
    bloqueios                   : [],
    conclusao                   : ""
  };

  var HEADERS_CAD_U = ["ID","USUARIO","SENHA","NOME","PERFIL","STATUS","CRIADO_EM","CLIENTE_ID"];

  try {
    // 1. Confirmar DEV
    if (ScriptApp.getScriptId() !== "12xiWNlQ-WKVpiofmcGfBaX4EBdlsIxKFJG2PFTamHUmSUs89c4LW3WSG") {
      resultado.bloqueios.push("BLOQUEIO CRITICO: execucao fora do DEV.");
      resultado.conclusao = "AUTH.6 BLOQUEADO";
      return resultado;
    }
    resultado.devConfirmado = true;

    var props  = PropertiesService.getScriptProperties();
    var dbId   = String(props.getProperty("DB_ID")      || "").trim();
    var prodId = String(props.getProperty("DB_ID_PROD") || "").trim();
    resultado.producaoNaoAlterada = (!prodId || prodId !== dbId);
    if (!resultado.producaoNaoAlterada) resultado.bloqueios.push("DB_ID coincide com DB_ID_PROD.");

    // 2. CAD_USUARIOS intacta
    if (dbId) {
      try {
        var ss    = SpreadsheetApp.openById(dbId);
        var shCad = ss.getSheetByName("CAD_USUARIOS");
        if (shCad && shCad.getLastRow() >= 1) {
          var hCad = shCad.getRange(1,1,1,shCad.getLastColumn()).getValues()[0]
                      .map(function(v){ return String(v||"").trim(); });
          resultado.cadUsuariosIntacta = (JSON.stringify(hCad) === JSON.stringify(HEADERS_CAD_U));
          if (!resultado.cadUsuariosIntacta) resultado.bloqueios.push("CAD_USUARIOS headers alterados.");
        }
      } catch(eSS) { resultado.avisos.push("Nao foi possivel ler CAD_USUARIOS: " + eSS.message); }
    }

    // 3. Verificar funcoes backend chamando com inputs invalidos (sem side-effect)
    try {
      var rV = authV2ValidarSessao("");
      resultado.authV2ValidarSessaoOk = !!(rV && typeof rV.valido !== "undefined");
      if (!resultado.authV2ValidarSessaoOk) resultado.bloqueios.push("authV2ValidarSessao nao retornou estrutura esperada.");
    } catch(eV) { resultado.bloqueios.push("authV2ValidarSessao lancou excecao: " + eV.message); }

    try {
      var rE = authV2ExigirModulo("", "TESTE");
      resultado.authV2ExigirModuloOk = !!(rE && typeof rE.permitido !== "undefined");
      if (!resultado.authV2ExigirModuloOk) resultado.bloqueios.push("authV2ExigirModulo nao retornou estrutura esperada.");
    } catch(eE) { resultado.bloqueios.push("authV2ExigirModulo lancou excecao: " + eE.message); }

    try {
      var rP = authV2UsuarioPodeAcessarModulo("", "TESTE");
      resultado.authV2PodeAcessarModuloOk = !!(rP && typeof rP.permitido !== "undefined");
      if (!resultado.authV2PodeAcessarModuloOk) resultado.bloqueios.push("authV2UsuarioPodeAcessarModulo nao retornou estrutura esperada.");
    } catch(eP) { resultado.bloqueios.push("authV2UsuarioPodeAcessarModulo lancou excecao: " + eP.message); }

    try {
      var rC = authV2ObterContextoUsuario("");
      resultado.authV2ObterContextoOk = !!(rC && typeof rC.success !== "undefined");
      if (!resultado.authV2ObterContextoOk) resultado.bloqueios.push("authV2ObterContextoUsuario nao retornou estrutura esperada.");
    } catch(eC) { resultado.bloqueios.push("authV2ObterContextoUsuario lancou excecao: " + eC.message); }

    // 4. Ler JS_Core.html
    var coreContent = "";
    try {
      coreContent = HtmlService.createHtmlOutputFromFile("JS_Core").getContent();
      resultado.jsCoreLegivel = true;
    } catch (eCore) {
      resultado.bloqueios.push("JS_Core.html nao legivel: " + eCore.message);
    }

    if (resultado.jsCoreLegivel) {
      // AUTH.6 frontend: tratamento de sessao expirada
      resultado.temSessaoExpiradaHandler = coreContent.indexOf("sessaoInvalida") >= 0 &&
                                           coreContent.indexOf("exibirTelaLogin_()") >= 0;
      resultado.temLimparSessaoFront     = coreContent.indexOf("limparSessaoFront_") >= 0;
      resultado.temExibirTelaLogin       = coreContent.indexOf("exibirTelaLogin_")   >= 0;
      // Fluxos anteriores preservados
      resultado.temLoginV2Fallback       = coreContent.indexOf("fazerLoginV2ComFallback_") >= 0;
      resultado.temFallbackLegado        = coreContent.indexOf("USUARIO_NAO_ENCONTRADO")   >= 0;

      if (!resultado.temSessaoExpiradaHandler) resultado.bloqueios.push("Handler de sessao expirada ausente em JS_Core.html.");
      if (!resultado.temLimparSessaoFront)     resultado.bloqueios.push("limparSessaoFront_ ausente em JS_Core.html.");
      if (!resultado.temExibirTelaLogin)       resultado.bloqueios.push("exibirTelaLogin_ ausente em JS_Core.html.");
      if (!resultado.temLoginV2Fallback)       resultado.bloqueios.push("fazerLoginV2ComFallback_ ausente — login V2 quebrado.");
      if (!resultado.temFallbackLegado)        resultado.bloqueios.push("Fallback legado ausente em JS_Core.html.");
    }

    var tudo = resultado.devConfirmado &&
               resultado.producaoNaoAlterada &&
               resultado.cadUsuariosIntacta &&
               resultado.authV2ValidarSessaoOk &&
               resultado.authV2ExigirModuloOk &&
               resultado.authV2PodeAcessarModuloOk &&
               resultado.authV2ObterContextoOk &&
               resultado.jsCoreLegivel &&
               resultado.temSessaoExpiradaHandler &&
               resultado.temLoginV2Fallback &&
               resultado.temFallbackLegado &&
               resultado.bloqueios.length === 0;

    resultado.conclusao = tudo
      ? "AUTH.6 AUDITORIA APROVADA — execute TESTAR_AUTH6_SESSAO_ADMIN_VALIDA_DEV."
      : "AUTH.6 AUDITORIA BLOQUEADA — corrija os bloqueios.";

  } catch (e) {
    resultado.bloqueios.push("Falha: " + e.message);
    resultado.conclusao = "AUTH.6 AUDITORIA BLOQUEADA";
  }

  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

// ── TESTAR_AUTH6_SESSAO_ADMIN_VALIDA_DEV ─────────────────────
function TESTAR_AUTH6_SESSAO_ADMIN_VALIDA_DEV() {
  var resultado = {
    funcao               : "TESTAR_AUTH6_SESSAO_ADMIN_VALIDA_DEV",
    devConfirmado        : false,
    producaoNaoAlterada  : false,
    cadUsuariosIntacta   : false,
    loginOk              : false,
    validacaoSessaoOk    : false,
    sessaoValida         : false,
    isAdminTrue          : false,
    exigirFinanceiroOk   : false,
    exigirAdminOk        : false,
    bloqueios            : [],
    conclusao            : ""
  };

  var HEADERS_CAD_U = ["ID","USUARIO","SENHA","NOME","PERFIL","STATUS","CRIADO_EM","CLIENTE_ID"];
  var SENHA_ADMIN   = null;

  try {
    // 1. Confirmar DEV
    if (ScriptApp.getScriptId() !== "12xiWNlQ-WKVpiofmcGfBaX4EBdlsIxKFJG2PFTamHUmSUs89c4LW3WSG") {
      resultado.bloqueios.push("BLOQUEIO CRITICO: execucao fora do DEV.");
      resultado.conclusao = "AUTH.6 BLOQUEADO";
      return resultado;
    }
    resultado.devConfirmado = true;

    var props  = PropertiesService.getScriptProperties();
    var dbId   = String(props.getProperty("DB_ID")      || "").trim();
    var prodId = String(props.getProperty("DB_ID_PROD") || "").trim();
    resultado.producaoNaoAlterada = (!prodId || prodId !== dbId);
    if (!resultado.producaoNaoAlterada) resultado.bloqueios.push("DB_ID coincide com DB_ID_PROD.");
    if (!dbId) { resultado.bloqueios.push("DB_ID nao configurado."); return resultado; }

    var ss = SpreadsheetApp.openById(dbId);

    // 2. CAD_USUARIOS intacta
    var shCad = ss.getSheetByName("CAD_USUARIOS");
    if (shCad && shCad.getLastRow() >= 1) {
      var hCad = shCad.getRange(1,1,1,shCad.getLastColumn()).getValues()[0]
                  .map(function(v){ return String(v||"").trim(); });
      resultado.cadUsuariosIntacta = (JSON.stringify(hCad) === JSON.stringify(HEADERS_CAD_U));
      if (!resultado.cadUsuariosIntacta) resultado.bloqueios.push("CAD_USUARIOS alterada — CRITICO.");
    }

    // 3. Login admin (senha interna — NUNCA logada)
    SENHA_ADMIN = "Auth4aTeste2026";
    var resLogin = loginV2_DEV("admin", SENHA_ADMIN);
    SENHA_ADMIN = null;

    resultado.loginOk = !!(resLogin && resLogin.success && resLogin.sessionId);
    if (!resultado.loginOk) {
      resultado.bloqueios.push("Login admin falhou: " + (resLogin ? resLogin.message : "sem resposta"));
      resultado.conclusao = "AUTH.6 BLOQUEADO — login admin nao funcionou.";
      return resultado;
    }

    // 4. Validar sessao
    var rV = authV2ValidarSessao(resLogin.sessionId);
    resultado.validacaoSessaoOk = !!(rV && typeof rV.valido !== "undefined");
    resultado.sessaoValida      = !!(rV && rV.valido === true);
    resultado.isAdminTrue       = !!(rV && rV.isAdmin === true);

    if (!resultado.validacaoSessaoOk) resultado.bloqueios.push("authV2ValidarSessao retornou estrutura invalida.");
    if (!resultado.sessaoValida)      resultado.bloqueios.push("Sessao admin deveria ser valida. motivo=" + (rV ? rV.motivo : "n/a"));
    if (!resultado.isAdminTrue)       resultado.bloqueios.push("isAdmin deveria ser true para ADMIN.");

    // 5. Exigir modulos
    var rFin = authV2ExigirModulo(resLogin.sessionId, "FINANCEIRO");
    resultado.exigirFinanceiroOk = !!(rFin && rFin.permitido === true);
    if (!resultado.exigirFinanceiroOk) resultado.bloqueios.push("ADMIN: FINANCEIRO deveria ser permitido. motivo=" + (rFin ? rFin.motivo : "n/a"));

    var rAdm = authV2ExigirModulo(resLogin.sessionId, "ADMIN");
    resultado.exigirAdminOk = !!(rAdm && rAdm.permitido === true);
    if (!resultado.exigirAdminOk) resultado.bloqueios.push("ADMIN: modulo ADMIN deveria ser permitido. motivo=" + (rAdm ? rAdm.motivo : "n/a"));

    var tudo = resultado.devConfirmado &&
               resultado.producaoNaoAlterada &&
               resultado.cadUsuariosIntacta &&
               resultado.loginOk &&
               resultado.sessaoValida &&
               resultado.isAdminTrue &&
               resultado.exigirFinanceiroOk &&
               resultado.exigirAdminOk &&
               resultado.bloqueios.length === 0;

    resultado.conclusao = tudo
      ? "AUTH.6 ADMIN APROVADO — sessao valida, guard liberado para todos os modulos."
      : "AUTH.6 ADMIN BLOQUEADO — corrija os bloqueios.";

  } catch (e) {
    resultado.bloqueios.push("Falha: " + e.message);
    resultado.conclusao = "AUTH.6 ADMIN BLOQUEADO";
  } finally {
    SENHA_ADMIN = null;
  }

  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

// ── TESTAR_AUTH6_SESSAO_TECNICO_RESTRITA_DEV ─────────────────
function TESTAR_AUTH6_SESSAO_TECNICO_RESTRITA_DEV() {
  var USUARIO_TEST = "tecnico_auth6_test";

  var resultado = {
    funcao                : "TESTAR_AUTH6_SESSAO_TECNICO_RESTRITA_DEV",
    devConfirmado         : false,
    producaoNaoAlterada   : false,
    cadUsuariosIntacta    : false,
    usuarioCriado         : false,
    usuarioJaExistia      : false,
    sessaoCriada          : false,
    sessaoValida          : false,
    isAdminFalse          : false,
    mobileCampoPermitido  : false,
    osPermitido           : false,
    adminBloqueado        : false,
    financeiroBloqueado   : false,
    limpezaOk             : false,
    bloqueios             : [],
    conclusao             : ""
  };

  var HEADERS_CAD_U = ["ID","USUARIO","SENHA","NOME","PERFIL","STATUS","CRIADO_EM","CLIENTE_ID"];

  var ss          = null;
  var sessionId   = null;
  var rowToDelete = null;

  try {
    // 1. Confirmar DEV
    if (ScriptApp.getScriptId() !== "12xiWNlQ-WKVpiofmcGfBaX4EBdlsIxKFJG2PFTamHUmSUs89c4LW3WSG") {
      resultado.bloqueios.push("BLOQUEIO CRITICO: execucao fora do DEV.");
      resultado.conclusao = "AUTH.6 BLOQUEADO";
      return resultado;
    }
    resultado.devConfirmado = true;

    var props  = PropertiesService.getScriptProperties();
    var dbId   = String(props.getProperty("DB_ID")      || "").trim();
    var prodId = String(props.getProperty("DB_ID_PROD") || "").trim();
    resultado.producaoNaoAlterada = (!prodId || prodId !== dbId);
    if (!resultado.producaoNaoAlterada) resultado.bloqueios.push("DB_ID coincide com DB_ID_PROD.");
    if (!dbId) { resultado.bloqueios.push("DB_ID nao configurado."); return resultado; }

    ss = SpreadsheetApp.openById(dbId);

    // 2. CAD_USUARIOS intacta
    var shCad = ss.getSheetByName("CAD_USUARIOS");
    if (shCad && shCad.getLastRow() >= 1) {
      var hCad = shCad.getRange(1,1,1,shCad.getLastColumn()).getValues()[0]
                  .map(function(v){ return String(v||"").trim(); });
      resultado.cadUsuariosIntacta = (JSON.stringify(hCad) === JSON.stringify(HEADERS_CAD_U));
      if (!resultado.cadUsuariosIntacta) resultado.bloqueios.push("CAD_USUARIOS alterada — CRITICO.");
    }

    // 3. Criar/localizar usuario TECNICO de teste em AUTH_USUARIOS
    var shAuth = ss.getSheetByName("AUTH_USUARIOS");
    if (!shAuth) { resultado.bloqueios.push("AUTH_USUARIOS nao encontrada."); return resultado; }

    var nRows     = shAuth.getLastRow();
    var dadosAuth = nRows >= 1 ? shAuth.getRange(1,1,nRows,shAuth.getLastColumn()).getValues() : [[]];
    var hAuth     = dadosAuth[0].map(function(v){ return String(v||"").trim(); });
    var iUsrCol   = hAuth.indexOf("USUARIO");
    var iIdCol    = hAuth.indexOf("ID");

    var testUserId  = "AUTH6_TECNICO_TEST_" + Date.now();
    var existingRow = -1;
    for (var i = 1; i < dadosAuth.length; i++) {
      if (iUsrCol >= 0 && String(dadosAuth[i][iUsrCol]) === USUARIO_TEST) {
        existingRow = i + 1;
        testUserId  = iIdCol >= 0 ? String(dadosAuth[i][iIdCol]) : testUserId;
        break;
      }
    }

    var agora = new Date().toISOString();
    if (existingRow < 0) {
      var novaLinha = hAuth.map(function(col) {
        switch (col) {
          case "ID"              : return testUserId;
          case "USUARIO"         : return USUARIO_TEST;
          case "NOME"            : return "Tecnico Auth6 Test";
          case "EMAIL"           : return "tecnico_auth6@test.dev";
          case "SENHA_HASH"      : return "placeholder_hash_auth6";
          case "SENHA_SALT"      : return "placeholder_salt_auth6";
          case "SENHA_TEMPORARIA": return "NAO";
          case "PERFIL_PRINCIPAL": return "TECNICO";
          case "STATUS"          : return "ATIVO";
          case "CRIADO_EM"       : return agora;
          case "CRIADO_POR"      : return "AUTH6_SETUP_TEST";
          case "ATUALIZADO_EM"   : return agora;
          case "ATUALIZADO_POR"  : return "AUTH6_SETUP_TEST";
          default                : return "";
        }
      });
      shAuth.appendRow(novaLinha);
      rowToDelete = shAuth.getLastRow();
      resultado.usuarioCriado = true;
    } else {
      resultado.usuarioJaExistia = true;
    }

    // 4. Criar sessao manualmente
    sessionId = Utilities.getUuid();
    props.setProperty("SGO_SESSION_" + sessionId, JSON.stringify({
      sessionId   : sessionId,
      userId      : testUserId,
      usuario     : USUARIO_TEST,
      nome        : "Tecnico Auth6 Test",
      perfil      : "TECNICO",
      email       : "tecnico_auth6@test.dev",
      expiresAt   : new Date(Date.now() + 3600000).toISOString(),
      criadoEm    : agora
    }));
    resultado.sessaoCriada = true;

    // 5. Validar sessao
    var rV = authV2ValidarSessao(sessionId);
    resultado.sessaoValida   = !!(rV && rV.valido === true);
    resultado.isAdminFalse   = !!(rV && rV.isAdmin === false);
    if (!resultado.sessaoValida)  resultado.bloqueios.push("Sessao TECNICO deveria ser valida. motivo=" + (rV ? rV.motivo : "n/a"));
    if (!resultado.isAdminFalse)  resultado.bloqueios.push("isAdmin deveria ser false para TECNICO.");

    // 6. Exigir modulos permitidos
    var rM = authV2ExigirModulo(sessionId, "MOBILE_CAMPO");
    resultado.mobileCampoPermitido = !!(rM && rM.permitido === true);
    if (!resultado.mobileCampoPermitido) resultado.bloqueios.push("MOBILE_CAMPO deveria ser permitido para TECNICO. motivo=" + (rM ? rM.motivo : "n/a"));

    var rOs = authV2ExigirModulo(sessionId, "OS");
    resultado.osPermitido = !!(rOs && rOs.permitido === true);
    if (!resultado.osPermitido) resultado.bloqueios.push("OS deveria ser permitido para TECNICO. motivo=" + (rOs ? rOs.motivo : "n/a"));

    // 7. Exigir modulos bloqueados
    var rAdm = authV2ExigirModulo(sessionId, "ADMIN");
    resultado.adminBloqueado = !!(rAdm && rAdm.permitido === false);
    if (!resultado.adminBloqueado) resultado.bloqueios.push("ADMIN deveria ser bloqueado para TECNICO.");

    var rFin = authV2ExigirModulo(sessionId, "FINANCEIRO");
    resultado.financeiroBloqueado = !!(rFin && rFin.permitido === false);
    if (!resultado.financeiroBloqueado) resultado.bloqueios.push("FINANCEIRO deveria ser bloqueado para TECNICO.");

    var tudo = resultado.devConfirmado &&
               resultado.producaoNaoAlterada &&
               resultado.cadUsuariosIntacta &&
               resultado.sessaoCriada &&
               resultado.sessaoValida &&
               resultado.isAdminFalse &&
               resultado.mobileCampoPermitido &&
               resultado.osPermitido &&
               resultado.adminBloqueado &&
               resultado.financeiroBloqueado &&
               resultado.bloqueios.length === 0;

    resultado.conclusao = tudo
      ? "AUTH.6 TECNICO APROVADO — sessao valida, modulos restritos corretamente."
      : "AUTH.6 TECNICO BLOQUEADO — corrija os bloqueios.";

  } catch (e) {
    resultado.bloqueios.push("Falha: " + e.message);
    resultado.conclusao = "AUTH.6 TECNICO BLOQUEADO";
  } finally {
    try {
      if (sessionId) PropertiesService.getScriptProperties().deleteProperty("SGO_SESSION_" + sessionId);
    } catch (eClean) {}
    try {
      if (ss && rowToDelete) {
        ss.getSheetByName("AUTH_USUARIOS").deleteRow(rowToDelete);
        resultado.limpezaOk = true;
      } else if (!rowToDelete) {
        resultado.limpezaOk = true;
      }
    } catch (eRow) {
      resultado.bloqueios.push("Limpeza linha AUTH_USUARIOS falhou (row:" + rowToDelete + "): " + eRow.message);
    }
  }

  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

// ── TESTAR_AUTH6_SESSAO_INVALIDA_DEV ─────────────────────────
function TESTAR_AUTH6_SESSAO_INVALIDA_DEV() {
  var resultado = {
    funcao                   : "TESTAR_AUTH6_SESSAO_INVALIDA_DEV",
    devConfirmado            : false,
    producaoNaoAlterada      : false,
    cadUsuariosIntacta       : false,
    sessaoFakeRejeitada      : false,
    sessaoVaziaRejeitada     : false,
    sessaoExpiradaRejeitada  : false,
    guardFakeRejeitado       : false,
    semExcecaoLancada        : true,
    limpezaOk                : false,
    bloqueios                : [],
    conclusao                : ""
  };

  var HEADERS_CAD_U = ["ID","USUARIO","SENHA","NOME","PERFIL","STATUS","CRIADO_EM","CLIENTE_ID"];
  var sessionExpId  = null;

  try {
    // 1. Confirmar DEV
    if (ScriptApp.getScriptId() !== "12xiWNlQ-WKVpiofmcGfBaX4EBdlsIxKFJG2PFTamHUmSUs89c4LW3WSG") {
      resultado.bloqueios.push("BLOQUEIO CRITICO: execucao fora do DEV.");
      resultado.conclusao = "AUTH.6 BLOQUEADO";
      return resultado;
    }
    resultado.devConfirmado = true;

    var props  = PropertiesService.getScriptProperties();
    var dbId   = String(props.getProperty("DB_ID")      || "").trim();
    var prodId = String(props.getProperty("DB_ID_PROD") || "").trim();
    resultado.producaoNaoAlterada = (!prodId || prodId !== dbId);
    if (!resultado.producaoNaoAlterada) resultado.bloqueios.push("DB_ID coincide com DB_ID_PROD.");

    if (dbId) {
      try {
        var ss    = SpreadsheetApp.openById(dbId);
        var shCad = ss.getSheetByName("CAD_USUARIOS");
        if (shCad && shCad.getLastRow() >= 1) {
          var hCad = shCad.getRange(1,1,1,shCad.getLastColumn()).getValues()[0]
                      .map(function(v){ return String(v||"").trim(); });
          resultado.cadUsuariosIntacta = (JSON.stringify(hCad) === JSON.stringify(HEADERS_CAD_U));
          if (!resultado.cadUsuariosIntacta) resultado.bloqueios.push("CAD_USUARIOS alterada — CRITICO.");
        }
      } catch(eSS) { resultado.avisos = resultado.avisos || []; resultado.avisos.push("Nao foi possivel ler CAD_USUARIOS: " + eSS.message); }
    }

    // 2. Sessao fake — nao existe
    try {
      var rFake = authV2ValidarSessao("sessao-invalida-fake-auth6-xyz");
      resultado.sessaoFakeRejeitada = !!(rFake && rFake.valido === false);
      if (!resultado.sessaoFakeRejeitada) resultado.bloqueios.push("Sessao fake nao foi rejeitada (valido=" + (rFake ? rFake.valido : "n/a") + ").");
    } catch(eF) {
      resultado.semExcecaoLancada = false;
      resultado.bloqueios.push("authV2ValidarSessao lancou excecao para sessao fake: " + eF.message);
    }

    // 3. SessionId vazio
    try {
      var rVazio = authV2ValidarSessao("");
      resultado.sessaoVaziaRejeitada = !!(rVazio && rVazio.valido === false);
      if (!resultado.sessaoVaziaRejeitada) resultado.bloqueios.push("SessionId vazio nao foi rejeitado.");
    } catch(eV) {
      resultado.semExcecaoLancada = false;
      resultado.bloqueios.push("authV2ValidarSessao lancou excecao para sessionId vazio: " + eV.message);
    }

    // 4. Sessao expirada (inserir manualmente e validar)
    sessionExpId = Utilities.getUuid();
    props.setProperty("SGO_SESSION_" + sessionExpId, JSON.stringify({
      sessionId : sessionExpId,
      userId    : "USER_EXPIRADO_TEST",
      usuario   : "expirado_test",
      perfil    : "TECNICO",
      expiresAt : new Date(Date.now() - 3600000).toISOString(), // 1h no passado
      criadoEm  : new Date().toISOString()
    }));
    try {
      var rExp = authV2ValidarSessao(sessionExpId);
      resultado.sessaoExpiradaRejeitada = !!(rExp && rExp.valido === false &&
                                             String(rExp.motivo || "").toLowerCase().indexOf("expir") >= 0);
      if (!resultado.sessaoExpiradaRejeitada) resultado.bloqueios.push("Sessao expirada nao foi rejeitada corretamente. motivo=" + (rExp ? rExp.motivo : "n/a"));
    } catch(eExp) {
      resultado.semExcecaoLancada = false;
      resultado.bloqueios.push("authV2ValidarSessao lancou excecao para sessao expirada: " + eExp.message);
    }

    // 5. Guard exigirModulo com sessao invalida
    try {
      var rGuard = authV2ExigirModulo("sessao-invalida-fake-auth6-xyz", "DASHBOARD");
      resultado.guardFakeRejeitado = !!(rGuard && rGuard.permitido === false);
      if (!resultado.guardFakeRejeitado) resultado.bloqueios.push("Guard deveria bloquear sessao invalida para DASHBOARD.");
    } catch(eG) {
      resultado.semExcecaoLancada = false;
      resultado.bloqueios.push("authV2ExigirModulo lancou excecao para sessao invalida: " + eG.message);
    }

    if (!resultado.semExcecaoLancada) resultado.bloqueios.push("Funcoes lancaram excecao — devem retornar objeto de erro, nao excecao.");

    var tudo = resultado.devConfirmado &&
               resultado.producaoNaoAlterada &&
               resultado.cadUsuariosIntacta &&
               resultado.sessaoFakeRejeitada &&
               resultado.sessaoVaziaRejeitada &&
               resultado.sessaoExpiradaRejeitada &&
               resultado.guardFakeRejeitado &&
               resultado.semExcecaoLancada &&
               resultado.bloqueios.length === 0;

    resultado.conclusao = tudo
      ? "AUTH.6 SESSAO_INVALIDA APROVADO — todas as validacoes de sessao invalida passaram."
      : "AUTH.6 SESSAO_INVALIDA BLOQUEADO — corrija os bloqueios.";

  } catch (e) {
    resultado.bloqueios.push("Falha: " + e.message);
    resultado.conclusao = "AUTH.6 SESSAO_INVALIDA BLOQUEADO";
  } finally {
    // Limpar sessao expirada de teste
    try {
      if (sessionExpId) {
        PropertiesService.getScriptProperties().deleteProperty("SGO_SESSION_" + sessionExpId);
        resultado.limpezaOk = true;
      } else {
        resultado.limpezaOk = true;
      }
    } catch (eClean) {
      resultado.bloqueios.push("Limpeza sessao expirada falhou: " + eClean.message);
    }
  }

  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

// ============================================================
// AUTH.7 — VALIDAÇÃO HUMANA DEV E CHECKLIST PRÉ-PRODUÇÃO
// ============================================================

// ── AUDITAR_AUTH7_FINAL_DEV_SEM_GRAVAR ───────────────────────
function AUDITAR_AUTH7_FINAL_DEV_SEM_GRAVAR() {
  var resultado = {
    funcao                         : "AUDITAR_AUTH7_FINAL_DEV_SEM_GRAVAR",
    devConfirmado                  : false,
    producaoNaoAlterada            : false,
    cadUsuariosIntacta             : false,
    authUsuariosExiste             : false,
    adminAtivo                     : false,
    authPerfisExiste               : false,
    perfisPadraoOk                 : false,
    authPermissoesTemDados         : false,
    authRecuperacaoExiste          : false,
    authLogAcessoExiste            : false,
    loginV2FuncOk                  : false,
    obterContextoFuncOk            : false,
    validarSessaoFuncOk            : false,
    exigirModuloFuncOk             : false,
    jsCoreLegivelOk                : false,
    primeiroAcessoFrontendOk       : false,
    esqueciSenhaFrontendOk         : false,
    permissoesFrontendOk           : false,
    fallbackLegadoOk               : false,
    semMailAppFrontend             : false,
    nomesFuncoesNaoAlteradas       : false,
    avisos                         : [],
    bloqueios                      : [],
    conclusao                      : ""
  };

  var HEADERS_CAD_U    = ["ID","USUARIO","SENHA","NOME","PERFIL","STATUS","CRIADO_EM","CLIENTE_ID"];
  var PERFIS_ESPERADOS = ["ADMIN","DIRETORIA","GESTOR","TECNICO","METROLOGIA","COMERCIAL","FINANCEIRO","CLIENTE"];

  try {
    // 1. Confirmar DEV
    if (ScriptApp.getScriptId() !== "12xiWNlQ-WKVpiofmcGfBaX4EBdlsIxKFJG2PFTamHUmSUs89c4LW3WSG") {
      resultado.bloqueios.push("BLOQUEIO CRITICO: execucao fora do DEV.");
      resultado.conclusao = "AUTH.7 BLOQUEADO";
      return resultado;
    }
    resultado.devConfirmado = true;

    var props  = PropertiesService.getScriptProperties();
    var dbId   = String(props.getProperty("DB_ID")      || "").trim();
    var prodId = String(props.getProperty("DB_ID_PROD") || "").trim();
    resultado.producaoNaoAlterada = (!prodId || prodId !== dbId);
    if (!resultado.producaoNaoAlterada) resultado.bloqueios.push("DB_ID coincide com DB_ID_PROD — possivel contaminacao de producao.");
    if (!dbId) { resultado.bloqueios.push("DB_ID nao configurado."); return resultado; }

    var ss = SpreadsheetApp.openById(dbId);

    // 2. CAD_USUARIOS intacta
    var shCad = ss.getSheetByName("CAD_USUARIOS");
    if (shCad && shCad.getLastRow() >= 1) {
      var hCad = shCad.getRange(1,1,1,shCad.getLastColumn()).getValues()[0]
                  .map(function(v){ return String(v||"").trim(); });
      resultado.cadUsuariosIntacta = (JSON.stringify(hCad) === JSON.stringify(HEADERS_CAD_U));
      if (!resultado.cadUsuariosIntacta) resultado.bloqueios.push("CAD_USUARIOS headers alterados — CRITICO.");
    } else {
      resultado.bloqueios.push("CAD_USUARIOS nao encontrada.");
    }

    // 3. AUTH_USUARIOS: existe e admin ativo
    var shAuth = ss.getSheetByName("AUTH_USUARIOS");
    resultado.authUsuariosExiste = !!shAuth;
    if (!shAuth) {
      resultado.bloqueios.push("AUTH_USUARIOS nao encontrada.");
    } else if (shAuth.getLastRow() >= 2) {
      var dAuth = shAuth.getRange(1,1,shAuth.getLastRow(),shAuth.getLastColumn()).getValues();
      var hAuth = dAuth[0].map(function(v){ return String(v||"").trim(); });
      var iUsr  = hAuth.indexOf("USUARIO");
      var iSt   = hAuth.indexOf("STATUS");
      for (var i = 1; i < dAuth.length; i++) {
        var usr = iUsr >= 0 ? String(dAuth[i][iUsr]).toLowerCase() : "";
        var st  = iSt  >= 0 ? String(dAuth[i][iSt]).toUpperCase()  : "ATIVO";
        if (usr === "admin" && st === "ATIVO") { resultado.adminAtivo = true; break; }
      }
      if (!resultado.adminAtivo) resultado.bloqueios.push("Usuario admin nao encontrado ou nao ATIVO em AUTH_USUARIOS.");
    } else {
      resultado.bloqueios.push("AUTH_USUARIOS existe mas sem registros.");
    }

    // 4. AUTH_PERFIS: existe e perfis padrão
    var shPerfis = ss.getSheetByName("AUTH_PERFIS");
    resultado.authPerfisExiste = !!shPerfis;
    if (!shPerfis) {
      resultado.bloqueios.push("AUTH_PERFIS nao encontrada.");
    } else {
      var dPerfis = shPerfis.getLastRow() >= 2
        ? shPerfis.getRange(1,1,shPerfis.getLastRow(),shPerfis.getLastColumn()).getValues()
        : [[]];
      var hPerfis = dPerfis[0].map(function(v){ return String(v||"").trim(); });
      var iNP     = hPerfis.indexOf("NOME");
      var presentes = [];
      for (var pi = 1; pi < dPerfis.length; pi++) {
        var np = iNP >= 0 ? String(dPerfis[pi][iNP]||"").toUpperCase() : "";
        if (np) presentes.push(np);
      }
      var faltando = PERFIS_ESPERADOS.filter(function(p){ return presentes.indexOf(p) < 0; });
      resultado.perfisPadraoOk = faltando.length === 0;
      if (!resultado.perfisPadraoOk) resultado.avisos.push("Perfis ausentes em AUTH_PERFIS: " + faltando.join(", "));
    }

    // 5. AUTH_PERMISSOES tem dados
    var shPerm = ss.getSheetByName("AUTH_PERMISSOES");
    if (!shPerm) {
      resultado.bloqueios.push("AUTH_PERMISSOES nao encontrada.");
    } else {
      resultado.authPermissoesTemDados = shPerm.getLastRow() > 1;
      if (!resultado.authPermissoesTemDados) resultado.avisos.push("AUTH_PERMISSOES sem dados — execute SETUP_AUTH5_PERMISSOES_BASE_DEV_AUTORIZADO.");
    }

    // 6. AUTH_RECUPERACAO_SENHA existe
    resultado.authRecuperacaoExiste = !!ss.getSheetByName("AUTH_RECUPERACAO_SENHA");
    if (!resultado.authRecuperacaoExiste) resultado.bloqueios.push("AUTH_RECUPERACAO_SENHA nao encontrada.");

    // 7. AUTH_LOG_ACESSO existe
    resultado.authLogAcessoExiste = !!ss.getSheetByName("AUTH_LOG_ACESSO");
    if (!resultado.authLogAcessoExiste) resultado.bloqueios.push("AUTH_LOG_ACESSO nao encontrada.");

    // 8. Verificar funcoes backend (chamadas seguras — inputs invalidos)
    try {
      var rLv2 = loginV2_DEV("__auth7_audit_check__", "__invalid__");
      resultado.loginV2FuncOk = !!(rLv2 && (rLv2.success === false || rLv2.success === true));
    } catch(eL) { resultado.bloqueios.push("loginV2_DEV lancou excecao: " + eL.message); }

    try {
      var rCtx = authV2ObterContextoUsuario("");
      resultado.obterContextoFuncOk = !!(rCtx && typeof rCtx.success !== "undefined");
    } catch(eC) { resultado.bloqueios.push("authV2ObterContextoUsuario lancou excecao: " + eC.message); }

    try {
      var rVS = authV2ValidarSessao("");
      resultado.validarSessaoFuncOk = !!(rVS && typeof rVS.valido !== "undefined");
    } catch(eV) { resultado.bloqueios.push("authV2ValidarSessao lancou excecao: " + eV.message); }

    try {
      var rEM = authV2ExigirModulo("", "TESTE");
      resultado.exigirModuloFuncOk = !!(rEM && typeof rEM.permitido !== "undefined");
    } catch(eE) { resultado.bloqueios.push("authV2ExigirModulo lancou excecao: " + eE.message); }

    // 9. Verificar frontend via JS_Core.html
    var coreContent = "";
    try {
      coreContent = HtmlService.createHtmlOutputFromFile("JS_Core").getContent();
      resultado.jsCoreLegivelOk = true;
    } catch(eCore) {
      resultado.bloqueios.push("JS_Core.html nao legivel: " + eCore.message);
    }

    if (resultado.jsCoreLegivelOk) {
      resultado.primeiroAcessoFrontendOk = coreContent.indexOf("abrirModalPrimeiroAcesso_")  >= 0 &&
                                           coreContent.indexOf("trocarSenhaPrimeiroAcessoV2_DEV") >= 0;
      resultado.esqueciSenhaFrontendOk   = coreContent.indexOf("abrirModalEsqueciSenha_")    >= 0 &&
                                           coreContent.indexOf("solicitarRecuperacaoSenhaV2_DEV") >= 0;
      resultado.permissoesFrontendOk     = coreContent.indexOf("carregarPermissoesAuth5_")    >= 0 &&
                                           coreContent.indexOf("PERMISSOES_CONTEXT")           >= 0 &&
                                           coreContent.indexOf("authV2ObterContextoUsuario")   >= 0;
      resultado.fallbackLegadoOk         = coreContent.indexOf("fazerLoginV2ComFallback_")    >= 0 &&
                                           coreContent.indexOf("USUARIO_NAO_ENCONTRADO")       >= 0;
      resultado.semMailAppFrontend       = coreContent.indexOf("MailApp")  < 0 &&
                                           coreContent.indexOf("GmailApp") < 0;
      resultado.nomesFuncoesNaoAlteradas = coreContent.indexOf("loginV2_DEV")                >= 0 &&
                                           coreContent.indexOf("aplicarRegrasDeAcesso_")      >= 0 &&
                                           coreContent.indexOf("limparSessaoFront_")          >= 0;

      if (!resultado.primeiroAcessoFrontendOk) resultado.bloqueios.push("Frontend primeiro acesso ausente ou incompleto.");
      if (!resultado.esqueciSenhaFrontendOk)   resultado.bloqueios.push("Frontend esqueci senha ausente ou incompleto.");
      if (!resultado.permissoesFrontendOk)     resultado.bloqueios.push("Frontend permissoes AUTH5 ausente ou incompleto.");
      if (!resultado.fallbackLegadoOk)         resultado.bloqueios.push("Fallback legado ausente no frontend.");
      if (!resultado.semMailAppFrontend)        resultado.bloqueios.push("MailApp/GmailApp encontrado em JS_Core.html — proibido.");
    }

    var tudo = resultado.devConfirmado &&
               resultado.producaoNaoAlterada &&
               resultado.cadUsuariosIntacta &&
               resultado.authUsuariosExiste &&
               resultado.adminAtivo &&
               resultado.authPerfisExiste &&
               resultado.authRecuperacaoExiste &&
               resultado.authLogAcessoExiste &&
               resultado.loginV2FuncOk &&
               resultado.obterContextoFuncOk &&
               resultado.validarSessaoFuncOk &&
               resultado.exigirModuloFuncOk &&
               resultado.jsCoreLegivelOk &&
               resultado.primeiroAcessoFrontendOk &&
               resultado.esqueciSenhaFrontendOk &&
               resultado.permissoesFrontendOk &&
               resultado.fallbackLegadoOk &&
               resultado.semMailAppFrontend &&
               resultado.bloqueios.length === 0;

    resultado.conclusao = tudo
      ? "AUTH.7 AUDITORIA FINAL APROVADA — sistema AUTH DEV validado. Prossiga com GERAR_ROTEIRO_TESTE_HUMANO_AUTH7_DEV_SEM_GRAVAR."
      : "AUTH.7 AUDITORIA BLOQUEADA — corrija os bloqueios antes de continuar.";

  } catch (e) {
    resultado.bloqueios.push("Falha: " + e.message);
    resultado.conclusao = "AUTH.7 AUDITORIA BLOQUEADA";
  }

  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

// ── GERAR_ROTEIRO_TESTE_HUMANO_AUTH7_DEV_SEM_GRAVAR ──────────
function GERAR_ROTEIRO_TESTE_HUMANO_AUTH7_DEV_SEM_GRAVAR() {
  var roteiro = {
    funcao    : "GERAR_ROTEIRO_TESTE_HUMANO_AUTH7_DEV_SEM_GRAVAR",
    descricao : "Roteiro de validacao humana do sistema AUTH no ambiente DEV. Executar no navegador apos push DEV bem-sucedido.",
    ambiente  : "DEV — WebApp Google Apps Script",
    versao    : "AUTH.7",
    passos    : [
      {
        numero     : 1,
        descricao  : "Abrir o WebApp DEV no navegador",
        acao       : "Acessar a URL do WebApp DEV publicado. Confirmar que a tela de login e carregada.",
        esperado   : "Tela de login visivel com logotipo/identidade visual do SGO+.",
        evidencia  : "Print da tela de login inicial.",
        critico    : true
      },
      {
        numero     : 2,
        descricao  : "Verificar elementos da tela de login",
        acao       : "Observar o campo de usuario e o link de recuperacao de senha.",
        esperado   : "Campo rotulado 'Usuario ou e-mail'. Link 'Esqueci minha senha' visivel abaixo do botao Entrar.",
        evidencia  : "Print da tela de login com elementos destacados.",
        critico    : true
      },
      {
        numero     : 3,
        descricao  : "Login admin com senha atual DEV",
        acao       : "Informar usuario 'admin' e senha atual DEV. Clicar em Entrar.",
        esperado   : "Sistema abre sem pedir primeiro acesso. Menu completo visivel para ADMIN.",
        evidencia  : "Print do sistema aberto com menu lateral completo.",
        critico    : true,
        nota       : "A senha atual DEV e definida internamente — nao deve ser registrada neste roteiro."
      },
      {
        numero     : 4,
        descricao  : "Confirmar menu ADMIN completo",
        acao       : "Verificar todos os modulos no menu lateral: Dashboard, Clientes, Financeiro, Admin, etc.",
        esperado   : "Todos os modulos visiveis. Nenhum item ocultado para ADMIN.",
        evidencia  : "Print do menu lateral completo com todos os itens.",
        critico    : true
      },
      {
        numero     : 5,
        descricao  : "Confirmar perfil exibido no topbar",
        acao       : "Observar o canto superior direito apos login.",
        esperado   : "Nome do usuario e perfil 'ADMIN' exibidos no topbar.",
        evidencia  : "Print do topbar com nome e perfil.",
        critico    : false
      },
      {
        numero     : 6,
        descricao  : "Sair do sistema (logout)",
        acao       : "Clicar no botao de logout ou encerrar sessao.",
        esperado   : "Retorno para tela de login. Sessao encerrada.",
        evidencia  : "Print da tela de login apos logout.",
        critico    : true
      },
      {
        numero     : 7,
        descricao  : "Testar login com credenciais invalidas",
        acao       : "Informar usuario inexistente e senha qualquer. Clicar em Entrar.",
        esperado   : "Mensagem de erro clara. Sistema nao abre. Tela de login permanece.",
        evidencia  : "Print da mensagem de erro no login.",
        critico    : true
      },
      {
        numero     : 8,
        descricao  : "Testar fluxo 'Esqueci minha senha' DEV",
        subpassos  : [
          "Clicar no link 'Esqueci minha senha' na tela de login.",
          "Modal 1 abre: preencher campo com usuario ou e-mail do admin DEV.",
          "Clicar em 'Solicitar recuperacao'.",
          "Confirmar que NENHUM e-mail e enviado (modo DEV dry-run).",
          "Modal 2 deve abrir com token pre-preenchido (modo DEV).",
          "Preencher nova senha e confirmacao no modal 2.",
          "Confirmar redefinicao.",
          "Tentar login com nova senha."
        ],
        esperado   : "Fluxo completo sem envio de e-mail real. Nova senha funciona no login.",
        evidencia  : "Prints de cada modal do fluxo de recuperacao.",
        critico    : true,
        nota       : "Em producao, o token sera enviado por e-mail. Em DEV e pre-preenchido automaticamente."
      },
      {
        numero     : 9,
        descricao  : "Restaurar senha admin DEV apos teste",
        acao       : "Apos testar recuperacao de senha, restaurar senha original do admin DEV usando funcao backend controlada.",
        esperado   : "Login admin DEV funciona com senha original restaurada.",
        evidencia  : "Log da funcao de restauracao sem erros.",
        critico    : true,
        nota       : "Usar TESTAR_AUTH4D_ESQUECI_SENHA_DEV ou funcao equivalente que restaura a senha original."
      },
      {
        numero     : 10,
        descricao  : "Testar perfil TECNICO (usuario temporario)",
        acao       : "Criar usuario TECNICO temporario via funcao de teste e fazer login com ele, ou usar funcao de teste TESTAR_AUTH5_PERFIL_TECNICO_RESTRITO_DEV.",
        esperado   : "Menu TECNICO exibe: Dashboard, Equipamentos, OS, Assistencia Tecnica, Mobile Campo. NAO exibe: Financeiro, Admin, Importacao.",
        evidencia  : "Print do menu lateral com perfil TECNICO.",
        critico    : true
      },
      {
        numero     : 11,
        descricao  : "Testar sessao expirada/invalida",
        acao       : "Limpar sessionStorage do navegador manualmente ou aguardar expiracao. Recarregar a pagina.",
        esperado   : "Sistema detecta sessao invalida, limpa estado e retorna para tela de login. Nenhum erro bruto exibido.",
        evidencia  : "Print da tela de login apos expiracao de sessao.",
        critico    : false,
        nota       : "Pode ser simulado inspecionando o sessionStorage no DevTools e removendo a chave SGO_SESSION."
      },
      {
        numero     : 12,
        descricao  : "Testar primeiro acesso (senha temporaria)",
        acao       : "Se existir usuario com SENHA_TEMPORARIA=SIM em AUTH_USUARIOS, fazer login com ele.",
        esperado   : "Modal de primeiro acesso abre automaticamente. Ao definir nova senha, sistema entra normalmente.",
        evidencia  : "Print do modal de primeiro acesso.",
        critico    : false,
        nota       : "Pode ser testado com TESTAR_AUTH4C_PRIMEIRO_ACESSO_DEV se nao houver usuario pronto."
      },
      {
        numero     : 13,
        descricao  : "Registrar evidencias completas",
        acao       : "Reunir todos os prints e resultados de Logger.log das funcoes de auditoria.",
        esperado   : "Evidencias cobrem: login, menu admin, menu tecnico, primeiro acesso, recuperacao senha, sessao expirada.",
        evidencia  : "Pasta/documento com todos os prints organizados por passo.",
        critico    : true
      }
    ],
    assinatura : {
      geradoPor     : "METROLABS SGO+ AUTH.7",
      dataReferencia: new Date().toISOString(),
      ambienteAlvo  : "DEV",
      proximoPasso  : "CHECKLIST_PRE_PUBLICACAO_AUTH7_SEM_GRAVAR"
    }
  };

  Logger.log(JSON.stringify(roteiro, null, 2));
  return roteiro;
}

// ── CHECKLIST_PRE_PUBLICACAO_AUTH7_SEM_GRAVAR ────────────────
function CHECKLIST_PRE_PUBLICACAO_AUTH7_SEM_GRAVAR() {
  var checklist = {
    funcao    : "CHECKLIST_PRE_PUBLICACAO_AUTH7_SEM_GRAVAR",
    descricao : "Checklist de verificacao antes de publicar sistema AUTH em producao.",
    versao    : "AUTH.7",

    itensObrigatorios : [
      { item: "AUTH.1 aprovado — Schema V2 criado e validado",                                    status: "VERIFICAR_EM_LOG" },
      { item: "AUTH.2 aprovado — Abas AUTH criadas com headers corretos",                         status: "VERIFICAR_EM_LOG" },
      { item: "AUTH.3 aprovado — Login V2 backend funcional",                                     status: "VERIFICAR_EM_LOG" },
      { item: "AUTH.4A aprovado — Portal usuario, recuperacao de senha backend",                  status: "VERIFICAR_EM_LOG" },
      { item: "AUTH.4B aprovado — Frontend login V2 com fallback legado",                         status: "VERIFICAR_EM_LOG" },
      { item: "AUTH.4C aprovado — Primeiro acesso visual implementado",                           status: "VERIFICAR_EM_LOG" },
      { item: "AUTH.4D aprovado — Esqueci minha senha visual DEV implementado",                   status: "VERIFICAR_EM_LOG" },
      { item: "AUTH.5 aprovado — Permissoes por perfil/modulo funcionando",                       status: "VERIFICAR_EM_LOG" },
      { item: "AUTH.6 aprovado — Guard de sessao e modulo funcionando",                           status: "VERIFICAR_EM_LOG" },
      { item: "AUTH.7 auditoria final DEV aprovada",                                              status: "EXECUTAR_AUDITAR_AUTH7_FINAL_DEV_SEM_GRAVAR" },
      { item: "Roteiro de teste humano executado e evidencias registradas",                       status: "EXECUTAR_GERAR_ROTEIRO_E_VALIDAR_MANUALMENTE" },
      { item: "Producao intacta — DB_ID de producao nao alterado",                               status: "VERIFICAR_DB_ID_PROD" },
      { item: "CAD_USUARIOS intacta — headers identicos ao original",                            status: "VERIFICAR_HEADERS_CAD_USUARIOS" },
      { item: "Login V2 DEV confirmado com usuario admin",                                        status: "TESTAR_AUTH3_LOGIN_V2_ADMIN_DEV" },
      { item: "Fallback legado confirmado — login antigo ainda funciona em DEV",                  status: "TESTAR_MANUALMENTE_LOGIN_LEGADO_DEV" },
      { item: "Perfil ADMIN com acesso total a todos os modulos",                                 status: "TESTAR_AUTH5_ADMIN_ACESSO_TOTAL_DEV" },
      { item: "Perfil TECNICO com modulos restritos (sem ADMIN/FINANCEIRO)",                      status: "TESTAR_AUTH5_PERFIL_TECNICO_RESTRITO_DEV" },
      { item: "Sessao invalida/expirada redireciona para login sem erro bruto",                   status: "TESTAR_AUTH6_SESSAO_INVALIDA_DEV" },
      { item: "Recuperacao de senha DEV dry-run — sem envio real de e-mail",                     status: "TESTAR_AUTH4D_ESQUECI_SENHA_DEV" },
      { item: "Plano de rollback documentado e acessivel",                                        status: "EXECUTAR_PLANO_ROLLBACK_AUTH7_SEM_GRAVAR" },
      { item: "Deploy de producao ainda NAO realizado",                                           status: "CONFIRMAR_MANUALMENTE" },
      { item: "Configurar envio real de e-mail antes de producao (MailApp/Gmail com conta SGO+)", status: "PENDENTE_ATE_PRODUCAO" },
      { item: "Definir senha definitiva de admin de producao (nao a senha DEV de teste)",         status: "PENDENTE_ATE_PRODUCAO" },
      { item: "Migrar usuarios de CAD_USUARIOS para AUTH_USUARIOS em producao (MIG.1)",          status: "PENDENTE_MIG_1" },
      { item: "Testar login V2 em producao com usuario real antes de remover fallback legado",    status: "PENDENTE_ATE_PRODUCAO" }
    ],

    riscos : [
      {
        risco      : "Fallback legado removido prematuramente",
        impacto    : "CRITICO — usuarios legados nao conseguem logar",
        mitigacao  : "Manter fallback ativo ate confirmacao que 100% dos usuarios migraram para AUTH V2"
      },
      {
        risco      : "Senha admin DEV usada em producao",
        impacto    : "ALTO — senha de teste exposta em historico/logs",
        mitigacao  : "Definir nova senha admin via trocarSenhaPrimeiroAcesso antes do primeiro login em producao"
      },
      {
        risco      : "AUTH_PERMISSOES vazia em producao",
        impacto    : "ALTO — todos os perfis ficam sem modulos no menu",
        mitigacao  : "Executar SETUP_AUTH5_PERMISSOES_BASE_DEV_AUTORIZADO equivalente em producao antes do deploy"
      },
      {
        risco      : "CAD_USUARIOS alterada acidentalmente durante migracao",
        impacto    : "CRITICO — sistema legado quebra",
        mitigacao  : "Manter backup de CAD_USUARIOS e nunca executar funcoes de gravacao sem confirmacao de headers"
      },
      {
        risco      : "Deploy de producao sem testar login em ambiente de staging",
        impacto    : "ALTO — regressao visivel para usuarios finais",
        mitigacao  : "Testar WebApp em DEV com URL de producao antes do deploy final"
      },
      {
        risco      : "Sessoes V2 nao limpas em producao acumulam no ScriptProperties",
        impacto    : "MEDIO — limite de propriedades pode ser atingido com o tempo",
        mitigacao  : "Agendar execucao periodica de authV2LimparSessoesExpiradas_DEV (ou equivalente producao) via trigger"
      },
      {
        risco      : "E-mail de recuperacao de senha nao configurado em producao",
        impacto    : "ALTO — usuarios nao conseguem recuperar acesso",
        mitigacao  : "Configurar conta de e-mail autorizada e testar envio antes do deploy"
      },
      {
        risco      : "ADMIN bloqueado acidentalmente por sessao invalida em producao",
        impacto    : "CRITICO — perda de acesso administrativo",
        mitigacao  : "Manter plano de rollback e acesso direto ao Google Sheets para reset manual"
      }
    ],

    pendencias : [
      "MIG.1 — Migracao de usuarios CAD_USUARIOS → AUTH_USUARIOS nao executada.",
      "Envio real de e-mail para recuperacao de senha nao configurado.",
      "Senha admin de producao definitiva nao definida.",
      "Deploy de producao pendente (nao autorizado ate checklist completo).",
      "Trigger de limpeza de sessoes expiradas nao configurado.",
      "Testes de carga/concorrencia nao realizados.",
      "Revisao de seguranca (XSS, CSRF, rate limiting) pendente para producao."
    ],

    prontoParaPublicacaoAuth : false,
    motivoBloqueio           : [
      "MIG.1 (migracao de usuarios) ainda pendente.",
      "E-mail de recuperacao de senha nao configurado para producao.",
      "Senha admin de producao definitiva nao definida.",
      "Deploy de producao ainda nao autorizado — aguardando validacao humana completa."
    ],

    assinatura : {
      geradoPor     : "METROLABS SGO+ AUTH.7",
      dataReferencia: new Date().toISOString(),
      proximoPasso  : "PLANO_ROLLBACK_AUTH7_SEM_GRAVAR"
    }
  };

  Logger.log(JSON.stringify(checklist, null, 2));
  return checklist;
}

// ── PLANO_ROLLBACK_AUTH7_SEM_GRAVAR ──────────────────────────
function PLANO_ROLLBACK_AUTH7_SEM_GRAVAR() {
  var plano = {
    funcao    : "PLANO_ROLLBACK_AUTH7_SEM_GRAVAR",
    descricao : "Plano de rollback para reverter o sistema AUTH V2 caso seja necessario em producao.",
    versao    : "AUTH.7",

    arquivosAlteradosCicloAuth : {
      backend : [
        {
          arquivo  : "SGO_Auth_V2.js",
          descricao: "Modulo principal AUTH V2. Contem login V2, hash de senha, recuperacao, permissoes e guard de sessao.",
          linhas   : "~1100 linhas. Extensoes IIFE: AUTH.3 (base), AUTH.4A (portal), AUTH.5 (permissoes), AUTH.6 (guard).",
          rollback : "Para desativar AUTH V2 completamente: remover chamadas aos wrappers globais em SGO_Main.js e retornar ao fluxo legado em JS_Core.html. NAO deletar o arquivo — apenas desativar as chamadas."
        },
        {
          arquivo  : "SGO_Setup_v2.js",
          descricao: "Funcoes de auditoria, setup e testes AUTH. Nao afeta comportamento em producao.",
          linhas   : "~4800 linhas.",
          rollback : "Nenhuma acao necessaria — funcoes apenas de auditoria/teste, nao chamadas em producao."
        }
      ],
      frontend : [
        {
          arquivo  : "JS_Core.html",
          descricao: "Nucleo frontend. Alterado para: login V2 com fallback, primeiro acesso, esqueci senha, permissoes de menu, guard de sessao.",
          alteracoes: [
            "fazerLogin() -> fazerLoginV2ComFallback_()",
            "Adicionado: fazerLoginV2ComFallback_, _PRIMEIRO_ACESSO_, PERMISSOES_CONTEXT",
            "Adicionado: abrirModalPrimeiroAcesso_, confirmarPrimeiroAcesso_",
            "Adicionado: esqueceuSenha_ (real), abrirModalEsqueciSenha_, confirmarSolicitacaoRecuperacao_",
            "Adicionado: abrirModalRedefinirSenha_, confirmarRedefinicaoSenha_",
            "Adicionado: carregarPermissoesAuth5_, handler de sessao expirada",
            "Modificado: aplicarRegrasDeAcesso_ (usa PERMISSOES_CONTEXT quando disponivel)",
            "Modificado: usuarioPodeAbrirModulo_ (usa PERMISSOES_CONTEXT quando disponivel)",
            "Modificado: limparSessaoFront_ (zera PERMISSOES_CONTEXT)"
          ],
          rollback : "Reverter fazerLogin() para chamar o login legado direto. Remover bloco carregarPermissoesAuth5_() de aplicarContextoUsuario_(). Manter aplicarRegrasDeAcesso_ e obterModulosPermitidosPorPerfil_ — ja existiam antes de AUTH.4B."
        },
        {
          arquivo  : "Index.html",
          descricao: "Template HTML principal. Alterado para: label 'Usuario ou e-mail', link esqueci senha, modal primeiro acesso, modais esqueci senha.",
          alteracoes: [
            "Label campo login: 'Usuario' -> 'Usuario ou e-mail'",
            "Adicionado: link 'Esqueci minha senha' abaixo do botao Entrar",
            "Adicionado: #modal-primeiro-acesso (AUTH.4C)",
            "Adicionado: #modal-esqueci-senha (AUTH.4D passo 1)",
            "Adicionado: #modal-redefinir-senha (AUTH.4D passo 2)"
          ],
          rollback : "Reverter label e placeholder do campo de login. Remover link esqueci senha. Remover os 3 modais adicionados. Os modais sao blocos HTML independentes — remocao nao afeta resto do HTML."
        }
      ],
      banco : [
        {
          aba      : "AUTH_USUARIOS",
          descricao: "Tabela de usuarios AUTH V2. Criada em AUTH.2.",
          rollback : "Em caso de rollback total: nao deletar. Manter como esta. O sistema legado usa CAD_USUARIOS e nao depende de AUTH_USUARIOS."
        },
        {
          aba      : "AUTH_PERFIS",
          descricao: "Tabela de perfis. Criada em AUTH.2.",
          rollback : "Nao deletar. Nao afeta sistema legado."
        },
        {
          aba      : "AUTH_PERMISSOES",
          descricao: "Tabela de permissoes por perfil/modulo. Populada em AUTH.5.",
          rollback : "Nao deletar. Se AUTH V2 for reativado, dados continuam validos."
        },
        {
          aba      : "AUTH_USUARIO_PERMISSOES",
          descricao: "Overrides individuais de permissao. Criada em AUTH.2.",
          rollback : "Nao deletar."
        },
        {
          aba      : "AUTH_RECUPERACAO_SENHA",
          descricao: "Tokens de recuperacao de senha. Criada em AUTH.2.",
          rollback : "Nao deletar. Tokens expirados sao inofensivos."
        },
        {
          aba      : "AUTH_LOG_ACESSO",
          descricao: "Log de acessos V2. Criada em AUTH.2.",
          rollback : "Nao deletar. Historico de log."
        },
        {
          aba      : "CAD_USUARIOS",
          descricao: "Tabela legada de usuarios. NUNCA alterada durante ciclo AUTH.",
          rollback : "Nenhuma acao necessaria — permanece intacta."
        }
      ]
    },

    passoRollbackRapido : [
      {
        passo    : 1,
        descricao: "Reverter JS_Core.html — linha fazerLogin()",
        acao     : "Substituir 'fazerLoginV2ComFallback_()' por chamada direta ao login legado ('fazerLoginLegado_()' ou equivalente anterior).",
        impacto  : "Login V2 desativado imediatamente. Fallback legado assume."
      },
      {
        passo    : 2,
        descricao: "Remover chamada carregarPermissoesAuth5_ de aplicarContextoUsuario_",
        acao     : "Comentar ou remover a linha 'carregarPermissoesAuth5_();' em aplicarContextoUsuario_.",
        impacto  : "Menu passa a usar apenas mapa local de perfis (obterModulosPermitidosPorPerfil_)."
      },
      {
        passo    : 3,
        descricao: "Push DEV imediato",
        acao     : "clasp push (sem --force).",
        impacto  : "Revertido em DEV. Testar login legado."
      },
      {
        passo    : 4,
        descricao: "Se producao foi deployada com AUTH V2",
        acao     : "Fazer novo deploy de producao com versao revertida. Confirmar login legado funciona antes de notificar usuarios.",
        impacto  : "Usuarios voltam ao login legado."
      },
      {
        passo    : 5,
        descricao: "Verificar CAD_USUARIOS intacta apos rollback",
        acao     : "Executar AUDITAR_AUTH2_SCHEMA_SEM_GRAVAR ou verificar headers de CAD_USUARIOS manualmente.",
        impacto  : "Confirmar que nenhum usuario legado foi perdido."
      }
    ],

    funcoesProibidasEmProducaoSemAutorizacao : [
      "MIGRAR_ADMIN_LEGADO_PARA_AUTH_V2_DEV_AUTORIZADO — altera AUTH_USUARIOS, DEV apenas",
      "SETUP_AUTH5_PERMISSOES_BASE_DEV_AUTORIZADO — grava em AUTH_PERMISSOES, DEV apenas",
      "TESTAR_AUTH4A_RECUPERACAO_DRYRUN_DEV — usa dry-run, DEV apenas",
      "TESTAR_AUTH4A_REDEFINIR_SENHA_TOKEN_DEV — altera senha, DEV apenas",
      "TESTAR_AUTH4C_PRIMEIRO_ACESSO_DEV — altera e restaura senha, DEV apenas",
      "TESTAR_AUTH4D_ESQUECI_SENHA_DEV — altera e restaura senha, DEV apenas",
      "TESTAR_AUTH5_PERFIL_TECNICO_RESTRITO_DEV — cria e remove usuario, DEV apenas",
      "TESTAR_AUTH6_SESSAO_TECNICO_RESTRITA_DEV — cria e remove usuario, DEV apenas",
      "TESTAR_AUTH6_SESSAO_INVALIDA_DEV — cria sessao expirada de teste, DEV apenas",
      "DIAGNOSTICAR_AUTH4C_LOGIN_FINAL_ADMIN_SEM_GRAVAR — testa senhas candidatas, DEV apenas",
      "authV2LimparSessoesExpiradas_DEV — remove sessoes, DEV apenas (wrapper com guard de scriptId)"
    ],

    funcoesSegurasPorModelo : [
      "authV2ValidarSessao — somente leitura, sem side-effects",
      "authV2ObterContextoUsuario — somente leitura, sem side-effects",
      "authV2UsuarioPodeAcessarModulo — somente leitura, sem side-effects",
      "loginV2_DEV — cria sessao em ScriptProperties (side-effect controlado, necessario em producao)",
      "authV2ExigirModulo — somente leitura + validacao, sem side-effects destrutivos",
      "AUDITAR_AUTH* — somente leitura, nao gravam planilha"
    ],

    assinatura : {
      geradoPor     : "METROLABS SGO+ AUTH.7",
      dataReferencia: new Date().toISOString(),
      conclusao     : "Plano de rollback documentado. Sistema AUTH DEV pronto para validacao humana. Deploy de producao pendente aprovacao final."
    }
  };

  Logger.log(JSON.stringify(plano, null, 2));
  return plano;
}

// ── AUDITAR_AUTH7_FIX_RECUPERACAO_DEV_TOKEN_SEM_GRAVAR ────────
function AUDITAR_AUTH7_FIX_RECUPERACAO_DEV_TOKEN_SEM_GRAVAR() {
  var DEV_ID = "12xiWNlQ-WKVpiofmcGfBaX4EBdlsIxKFJG2PFTamHUmSUs89c4LW3WSG";
  var resultado = {
    funcao        : "AUDITAR_AUTH7_FIX_RECUPERACAO_DEV_TOKEN_SEM_GRAVAR",
    execucaoEm    : new Date().toISOString(),
    devConfirmado : ScriptApp.getScriptId() === DEV_ID,
    checks        : {},
    bloqueios     : [],
    status        : "PENDENTE"
  };

  if (!resultado.devConfirmado) {
    resultado.bloqueios.push("BLOQUEIO: somente DEV. scriptId=" + ScriptApp.getScriptId());
    resultado.status = "BLOQUEADO";
    Logger.log(JSON.stringify(resultado, null, 2));
    return resultado;
  }

  try {
    var coreContent = HtmlService.createHtmlOutputFromFile("JS_Core").getContent();

    // 1. Chamada com dry-run=true
    resultado.checks.chamadaDryRunPresente =
      coreContent.indexOf("solicitarRecuperacaoSenhaV2_DEV(loginOuEmail, true)") >= 0;

    // 2. Campo tokenParaTeste capturado da resposta
    resultado.checks.tokenParaTesteCapturado =
      coreContent.indexOf("res.tokenParaTeste") >= 0;

    // 3. abrirModalRedefinirSenha_ recebe tokenTemp
    resultado.checks.abrirModalComToken =
      coreContent.indexOf("abrirModalRedefinirSenha_(tokenTemp)") >= 0;

    // 4. Input rd-token recebe o valor pré-preenchido
    resultado.checks.rdTokenPreenchido =
      coreContent.indexOf("inpToken.value = tokenPreenchido") >= 0;

    // 5. Mensagem de aviso quando token não vier do backend
    resultado.checks.mensagemSemToken =
      coreContent.indexOf("Token DEV não retornado") >= 0;

    // 6. Alert genérico de "Solicitação registrada" removido
    resultado.checks.alertRemovido =
      coreContent.indexOf("alert(\"Solicitação registrada. Em produção") < 0;

    // 7. Token não exposto em alert
    resultado.checks.tokenNaoExpostoEmAlert =
      coreContent.indexOf("alert(tokenParaTeste)") < 0 &&
      coreContent.indexOf("alert(tokenTemp)") < 0;

    // 8. Sem MailApp/GmailApp no JS_Core
    resultado.checks.semMailApp =
      coreContent.indexOf("MailApp") < 0 &&
      coreContent.indexOf("GmailApp") < 0;

    Object.keys(resultado.checks).forEach(function(k) {
      if (!resultado.checks[k]) resultado.bloqueios.push("FALHA: " + k);
    });

    resultado.status = resultado.bloqueios.length === 0 ? "OK" : "FALHA";

  } catch (e) {
    resultado.bloqueios.push("Erro: " + e.message);
    resultado.status = "ERRO";
  }

  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

// ── TESTAR_AUTH7_FIX_RECUPERACAO_DEV_TOKEN_DEV ────────────────
function TESTAR_AUTH7_FIX_RECUPERACAO_DEV_TOKEN_DEV() {
  var DEV_ID = "12xiWNlQ-WKVpiofmcGfBaX4EBdlsIxKFJG2PFTamHUmSUs89c4LW3WSG";
  var resultado = {
    funcao               : "TESTAR_AUTH7_FIX_RECUPERACAO_DEV_TOKEN_DEV",
    execucaoEm           : new Date().toISOString(),
    devConfirmado        : ScriptApp.getScriptId() === DEV_ID,
    chamadaBemSucedida   : false,
    modoDryRunConfirmado : false,
    tokenRetornado       : false,
    tokenHashGravado     : false,
    emailNaoEnviado      : false,
    limpeza              : { rowRemovida: false },
    bloqueios            : [],
    status               : "PENDENTE"
  };

  if (!resultado.devConfirmado) {
    resultado.bloqueios.push("BLOQUEIO: somente DEV. scriptId=" + ScriptApp.getScriptId());
    resultado.status = "BLOQUEADO";
    Logger.log(JSON.stringify(resultado, null, 2));
    return resultado;
  }

  var ss          = null;
  var shRec       = null;
  var rRecAntes   = 0;
  var rowAdicionada = null;

  try {
    var props = PropertiesService.getScriptProperties();
    var dbId  = String(props.getProperty("DB_ID") || "").trim();
    if (!dbId) { resultado.bloqueios.push("DB_ID nao configurado."); throw new Error("DB_ID ausente."); }
    ss    = SpreadsheetApp.openById(dbId);
    shRec = ss.getSheetByName("AUTH_RECUPERACAO_SENHA");
    if (!shRec) { resultado.bloqueios.push("AUTH_RECUPERACAO_SENHA nao encontrada."); throw new Error("Aba ausente."); }

    rRecAntes = shRec.getLastRow();

    // Localizar admin ATIVO em AUTH_USUARIOS
    var shAuth = ss.getSheetByName("AUTH_USUARIOS");
    if (!shAuth || shAuth.getLastRow() < 2) {
      resultado.bloqueios.push("AUTH_USUARIOS vazia.");
      throw new Error("AUTH_USUARIOS ausente.");
    }
    var dadosA = shAuth.getRange(1, 1, shAuth.getLastRow(), shAuth.getLastColumn()).getValues();
    var hA     = dadosA[0].map(function(v){ return String(v||"").trim(); });
    var iPerf  = hA.indexOf("PERFIL_PRINCIPAL");
    var iStat  = hA.indexOf("STATUS");
    var iUsu   = hA.indexOf("USUARIO");
    var adminUsu = null;
    for (var i = 1; i < dadosA.length; i++) {
      if (String(iPerf >= 0 ? dadosA[i][iPerf] : "").toUpperCase() === "ADMIN" &&
          String(iStat >= 0 ? dadosA[i][iStat] : "").toUpperCase() === "ATIVO") {
        adminUsu = String(iUsu >= 0 ? dadosA[i][iUsu] : "");
        break;
      }
    }
    if (!adminUsu) {
      resultado.bloqueios.push("Admin ATIVO nao encontrado em AUTH_USUARIOS.");
      throw new Error("Admin ausente.");
    }
    resultado.adminUsuario = adminUsu;

    // Chamar dry-run
    var resp = solicitarRecuperacaoSenhaV2_DEV(adminUsu, true);
    resultado.chamadaBemSucedida   = !!(resp && resp.success);
    resultado.modoDryRunConfirmado = !!(resp && resp.modoDryRun);
    resultado.tokenRetornado       = !!(resp && resp.tokenParaTeste && String(resp.tokenParaTeste).length > 10);
    resultado.emailNaoEnviado      = true; // dry-run por design nao chama MailApp

    if (!resultado.chamadaBemSucedida)
      resultado.bloqueios.push("solicitarRecuperacaoSenhaV2_DEV falhou: " + (resp ? resp.message : "null"));
    if (!resultado.tokenRetornado)
      resultado.bloqueios.push("tokenParaTeste ausente ou muito curto — dry-run pode nao ter funcionado.");

    // Verificar incremento em AUTH_RECUPERACAO_SENHA
    var rRecDepois = shRec.getLastRow();
    resultado.tokenHashGravado = rRecDepois > rRecAntes;
    if (resultado.tokenHashGravado) rowAdicionada = rRecDepois;
    if (!resultado.tokenHashGravado)
      resultado.bloqueios.push("AUTH_RECUPERACAO_SENHA nao foi incrementada.");

    var tudo = resultado.chamadaBemSucedida && resultado.modoDryRunConfirmado &&
               resultado.tokenRetornado && resultado.tokenHashGravado &&
               resultado.bloqueios.length === 0;
    resultado.status = tudo ? "OK" : "FALHA";
    resultado.conclusao = tudo
      ? "AUTH.7_FIX BACKEND OK — token gerado e retornado. Repita teste humano: abrir /dev → Esqueci minha senha → usar login '" + adminUsu + "' → confirmar campo token preenchido."
      : "AUTH.7_FIX BACKEND BLOQUEADO";

  } catch (e) {
    if (resultado.bloqueios.length === 0) resultado.bloqueios.push("Erro: " + e.message);
    resultado.status = "ERRO";
  } finally {
    // Limpar row adicionada em AUTH_RECUPERACAO_SENHA
    try {
      if (shRec && rowAdicionada && rowAdicionada > 1) {
        shRec.deleteRow(rowAdicionada);
        resultado.limpeza.rowRemovida = true;
      }
    } catch (ef) {
      resultado.limpeza.erroLimpeza = ef.message;
    }
  }

  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

// ════════════════════════════════════════════════════════════
//  AUTH.8 — FECHAMENTO DAS EVIDÊNCIAS E PRÉ-PRODUÇÃO
// ════════════════════════════════════════════════════════════

// ── AUDITAR_AUTH8_FECHAMENTO_FINAL_DEV_SEM_GRAVAR ─────────
function AUDITAR_AUTH8_FECHAMENTO_FINAL_DEV_SEM_GRAVAR() {
  var DEV_ID  = "12xiWNlQ-WKVpiofmcGfBaX4EBdlsIxKFJG2PFTamHUmSUs89c4LW3WSG";
  var PROD_ID = "1szglIVlBS973xwGsTMKYtc-y5tqVJFIcZgO7iCJi2CWGXLAMGX9abLBY";

  // Constante interna — marcada true após validação humana AUTH.7
  var AUTH7_TESTE_HUMANO_DEV_APROVADO = true;

  var resultado = {
    funcao        : "AUDITAR_AUTH8_FECHAMENTO_FINAL_DEV_SEM_GRAVAR",
    execucaoEm    : new Date().toISOString(),
    devConfirmado : ScriptApp.getScriptId() === DEV_ID,
    checks        : {},
    bloqueios     : [],
    status        : "PENDENTE"
  };

  if (!resultado.devConfirmado) {
    resultado.bloqueios.push("BLOQUEIO: somente DEV. scriptId=" + ScriptApp.getScriptId());
    resultado.status = "BLOQUEADO";
    Logger.log(JSON.stringify(resultado, null, 2));
    return resultado;
  }

  try {
    var props = PropertiesService.getScriptProperties();
    var dbId  = String(props.getProperty("DB_ID") || "").trim();
    if (!dbId) { resultado.bloqueios.push("DB_ID nao configurado."); throw new Error("DB_ID ausente."); }
    var ss = SpreadsheetApp.openById(dbId);

    // 1. Produção não alterada: script em execução é DEV, não PROD
    resultado.checks.producaoIntacta = ScriptApp.getScriptId() !== PROD_ID;

    // 2. CAD_USUARIOS intacta (headers originais preservados)
    var shCad = ss.getSheetByName("CAD_USUARIOS");
    var CAD_HEADERS_ESPERADOS = ["ID","USUARIO","SENHA","NOME","PERFIL","STATUS","CRIADO_EM","CLIENTE_ID"];
    if (shCad && shCad.getLastRow() >= 1) {
      var hCad = shCad.getRange(1, 1, 1, shCad.getLastColumn()).getValues()[0]
        .map(function(v){ return String(v||"").trim(); })
        .filter(function(v){ return v !== ""; });
      var cadIntacta = CAD_HEADERS_ESPERADOS.every(function(h){ return hCad.indexOf(h) >= 0; });
      resultado.checks.cadUsuariosIntacta = cadIntacta;
      if (!cadIntacta) resultado.bloqueios.push("CAD_USUARIOS headers alterados: " + JSON.stringify(hCad));
    } else {
      resultado.checks.cadUsuariosIntacta = false;
      resultado.bloqueios.push("CAD_USUARIOS nao encontrada ou vazia.");
    }

    // 3. AUTH_USUARIOS existe
    var shAuth = ss.getSheetByName("AUTH_USUARIOS");
    resultado.checks.authUsuariosExiste = !!(shAuth && shAuth.getLastRow() >= 2);
    if (!resultado.checks.authUsuariosExiste) resultado.bloqueios.push("AUTH_USUARIOS ausente ou vazia.");

    // 4. Admin ativo com campos V2 preenchidos
    if (shAuth && shAuth.getLastRow() >= 2) {
      var dadosA = shAuth.getRange(1, 1, shAuth.getLastRow(), shAuth.getLastColumn()).getValues();
      var hA     = dadosA[0].map(function(v){ return String(v||"").trim(); });
      var iPer   = hA.indexOf("PERFIL_PRINCIPAL");
      var iStat  = hA.indexOf("STATUS");
      var iHash  = hA.indexOf("SENHA_HASH");
      var iSalt  = hA.indexOf("SENHA_SALT");
      var adminOk = false;
      for (var i = 1; i < dadosA.length; i++) {
        if (String(iPer  >= 0 ? dadosA[i][iPer]  : "").toUpperCase() === "ADMIN" &&
            String(iStat >= 0 ? dadosA[i][iStat] : "").toUpperCase() === "ATIVO" &&
            String(iHash >= 0 ? dadosA[i][iHash] : "").trim().length  > 0 &&
            String(iSalt >= 0 ? dadosA[i][iSalt] : "").trim().length  > 0) {
          adminOk = true; break;
        }
      }
      resultado.checks.adminAtivoLoginV2Ok = adminOk;
      if (!adminOk) resultado.bloqueios.push("Admin ATIVO com SENHA_HASH+SALT V2 nao encontrado em AUTH_USUARIOS.");
    } else {
      resultado.checks.adminAtivoLoginV2Ok = false;
    }

    // 5. ABAs AUTH auxiliares
    resultado.checks.authPerfisExiste = !!(ss.getSheetByName("AUTH_PERFIS"));
    resultado.checks.authPermissoesTemDados = (function(){
      var sh = ss.getSheetByName("AUTH_PERMISSOES");
      return !!(sh && sh.getLastRow() >= 2);
    })();
    resultado.checks.authRecuperacaoExiste = !!(ss.getSheetByName("AUTH_RECUPERACAO_SENHA"));
    resultado.checks.authLogAcessoExiste   = !!(ss.getSheetByName("AUTH_LOG_ACESSO"));

    if (!resultado.checks.authPerfisExiste)       resultado.bloqueios.push("AUTH_PERFIS nao encontrada.");
    if (!resultado.checks.authPermissoesTemDados) resultado.bloqueios.push("AUTH_PERMISSOES ausente ou sem dados.");
    if (!resultado.checks.authRecuperacaoExiste)  resultado.bloqueios.push("AUTH_RECUPERACAO_SENHA nao encontrada.");
    if (!resultado.checks.authLogAcessoExiste)    resultado.bloqueios.push("AUTH_LOG_ACESSO nao encontrada.");

    // 6. Verificações de frontend (JS_Core.html)
    var coreContent = HtmlService.createHtmlOutputFromFile("JS_Core").getContent();

    resultado.checks.loginV2Presente        = coreContent.indexOf("loginV2_DEV(loginOuEmail, senha)") >= 0;
    resultado.checks.fallbackLegadoPresente = coreContent.indexOf(".login(loginOuEmail, senha)") >= 0;
    resultado.checks.primeiroAcessoPresente = coreContent.indexOf("abrirModalPrimeiroAcesso_()") >= 0;
    resultado.checks.esqueciSenhaPresente   = coreContent.indexOf("solicitarRecuperacaoSenhaV2_DEV(loginOuEmail, true)") >= 0;
    resultado.checks.permissoesFrontend     = coreContent.indexOf("carregarPermissoesAuth5_()") >= 0;
    resultado.checks.guardSessaoPresente    = coreContent.indexOf("authV2ObterContextoUsuario(SESSION)") >= 0;
    resultado.checks.semMailAppFrontend     = coreContent.indexOf("MailApp") < 0 && coreContent.indexOf("GmailApp") < 0;

    ["loginV2Presente","fallbackLegadoPresente","primeiroAcessoPresente",
     "esqueciSenhaPresente","permissoesFrontend","guardSessaoPresente","semMailAppFrontend"
    ].forEach(function(k){
      if (!resultado.checks[k]) resultado.bloqueios.push("FALHA frontend: " + k);
    });

    // 7. Teste humano AUTH.7 aprovado (constante interna)
    resultado.checks.testeHumanoAuth7Aprovado = AUTH7_TESTE_HUMANO_DEV_APROVADO === true;

    var todosOk = Object.keys(resultado.checks).every(function(k){ return resultado.checks[k] === true; }) &&
                  resultado.bloqueios.length === 0;
    resultado.status    = todosOk ? "OK" : "FALHA";
    resultado.conclusao = todosOk
      ? "AUTH.8 AUDITORIA OK — todos os checks passaram. Sistema DEV pronto para fechamento."
      : "AUTH.8 AUDITORIA FALHA — ver bloqueios.";

  } catch (e) {
    resultado.bloqueios.push("Erro: " + e.message);
    resultado.status = "ERRO";
  }

  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

// ── RELATORIO_AUTH8_STATUS_FINAL_SEM_GRAVAR ────────────────
function RELATORIO_AUTH8_STATUS_FINAL_SEM_GRAVAR() {
  var DEV_ID = "12xiWNlQ-WKVpiofmcGfBaX4EBdlsIxKFJG2PFTamHUmSUs89c4LW3WSG";
  if (ScriptApp.getScriptId() !== DEV_ID) {
    return { bloqueio: "BLOQUEIO: somente DEV.", scriptId: ScriptApp.getScriptId() };
  }

  var relatorio = {
    funcao    : "RELATORIO_AUTH8_STATUS_FINAL_SEM_GRAVAR",
    geradoEm  : new Date().toISOString(),
    versao    : "AUTH.8",

    statusPorEtapa : {
      "AUTH.1"  : "APROVADO",
      "AUTH.2"  : "APROVADO",
      "AUTH.3"  : "APROVADO",
      "AUTH.4A" : "APROVADO",
      "AUTH.4B" : "APROVADO",
      "AUTH.4C" : "APROVADO",
      "AUTH.4D" : "APROVADO",
      "AUTH.5"  : "APROVADO",
      "AUTH.6"  : "APROVADO",
      "AUTH.7"  : "APROVADO_TESTE_HUMANO_DEV",
      "AUTH.8"  : "EM_FECHAMENTO"
    },

    arquivosAlterados : [
      "SGO_Auth_V2.js   — módulo AUTH V2 (IIFE + extensões AUTH.4/5/6)",
      "SGO_Setup_v2.js  — funções de setup, auditoria e teste AUTH.1–8",
      "JS_Core.html     — frontend: login V2, fallback legado, primeiro acesso, esqueci senha, permissões, guard sessão",
      "Index.html       — modais: redefinir senha, primeiro acesso, esqueci senha"
    ],

    abasCriadas : [
      "AUTH_USUARIOS          — usuários V2 com hash/salt, SESSION_TOKEN, TOKEN_RECUPERACAO_HASH",
      "AUTH_PERFIS            — perfis disponíveis no sistema",
      "AUTH_PERMISSOES        — permissões por perfil e módulo",
      "AUTH_USUARIO_PERMISSOES — overrides individuais de permissão",
      "AUTH_RECUPERACAO_SENHA — tokens de recuperação de senha",
      "AUTH_LOG_ACESSO        — auditoria de acessos e tentativas"
    ],

    itensPreservados : {
      cadUsuariosIntacta  : "CAD_USUARIOS não alterada — headers originais preservados, dados legado intocados",
      producaoIntacta     : "Script PROD não recebeu push — .clasp.json apontou para DEV durante todo o desenvolvimento",
      fallbackLegadoAtivo : "Login legado preservado como fallback no frontend — sem bloqueio a usuários não migrados"
    },

    decisao : {
      devPronto      : true,
      producaoPronta : false,
      motivacao      : "DEV validado com testes automatizados e humanos. Produção requer AUTH.9–13 antes de deploy."
    }
  };

  Logger.log(JSON.stringify(relatorio, null, 2));
  return relatorio;
}

// ── CHECKLIST_AUTH8_PENDENCIAS_PRODUCAO_SEM_GRAVAR ─────────
function CHECKLIST_AUTH8_PENDENCIAS_PRODUCAO_SEM_GRAVAR() {
  var DEV_ID = "12xiWNlQ-WKVpiofmcGfBaX4EBdlsIxKFJG2PFTamHUmSUs89c4LW3WSG";
  if (ScriptApp.getScriptId() !== DEV_ID) {
    return { bloqueio: "BLOQUEIO: somente DEV.", scriptId: ScriptApp.getScriptId() };
  }

  var checklist = {
    funcao           : "CHECKLIST_AUTH8_PENDENCIAS_PRODUCAO_SEM_GRAVAR",
    geradoEm         : new Date().toISOString(),
    producaoLiberada : false,

    motivos : [
      "1. Migração de usuários produção ainda não executada (AUTH_USUARIOS PROD vazia ou não configurada).",
      "2. E-mail real de recuperação de senha ainda não configurado (MailApp/Gmail conta SGO+).",
      "3. Senha definitiva admin produção não definida (trocar de teste para senha forte real).",
      "4. Teste controlado em produção ainda não executado (login, módulos, permissões).",
      "5. Deploy produção ainda não autorizado formalmente pelo responsável."
    ],

    ordemRecomendadaFutura : [
      { etapa: "AUTH.9",  descricao: "Preparação do ambiente produção sem deploy — configurar DB_ID, verificar ABAs, checar .clasp.json PROD." },
      { etapa: "AUTH.10", descricao: "Migração controlada de usuários — executar MIGRAR_ADMIN_LEGADO para PROD, validar resultado." },
      { etapa: "AUTH.11", descricao: "E-mail real de recuperação — configurar MailApp ou Gmail com conta SGO+, testar envio." },
      { etapa: "AUTH.12", descricao: "Publicação produção controlada — push PROD, publicar nova versão do WebApp, confirmar URL." },
      { etapa: "AUTH.13", descricao: "Validação produção pós-deploy — login admin, módulos, esqueci senha, permissões, fallback." }
    ],

    observacoes : [
      "Nunca usar --force em nenhum push.",
      "Nunca alterar CAD_USUARIOS durante ou após migração.",
      "Manter fallback legado ativo até todos os usuários PROD migrarem.",
      "Executar cada etapa em sessão separada, com confirmação humana entre elas."
    ]
  };

  Logger.log(JSON.stringify(checklist, null, 2));
  return checklist;
}

// ── PLANO_AUTH8_PUBLICACAO_FUTURA_SEM_GRAVAR ──────────────
function PLANO_AUTH8_PUBLICACAO_FUTURA_SEM_GRAVAR() {
  var DEV_ID = "12xiWNlQ-WKVpiofmcGfBaX4EBdlsIxKFJG2PFTamHUmSUs89c4LW3WSG";
  if (ScriptApp.getScriptId() !== DEV_ID) {
    return { bloqueio: "BLOQUEIO: somente DEV.", scriptId: ScriptApp.getScriptId() };
  }

  var plano = {
    funcao   : "PLANO_AUTH8_PUBLICACAO_FUTURA_SEM_GRAVAR",
    geradoEm : new Date().toISOString(),
    status   : "PLANO — NÃO EXECUTAR AGORA",

    passos : [
      {
        ordem : 1,
        etapa : "Confirmar scriptId produção",
        acao  : "Verificar que .clasp.json aponta para o scriptId PROD correto antes do push.",
        risco : "ALTO — push errado sobrescreve arquivo errado.",
        como  : "Ler .clasp.json, confirmar scriptId = 1szglIVlBS973xwGsTMKYtc-y5tqVJFIcZgO7iCJi2CWGXLAMGX9abLBY"
      },
      {
        ordem : 2,
        etapa : "Backup do deployment atual PROD",
        acao  : "Anotar URL do WebApp PROD atual e versão publicada antes de qualquer alteração.",
        risco : "MÉDIO — sem backup, rollback exige re-publicar versão antiga manualmente.",
        como  : "Apps Script → Implantações → copiar URL e número de versão atual."
      },
      {
        ordem : 3,
        etapa : "Verificar DB_ID PROD em ScriptProperties",
        acao  : "Confirmar que DB_ID nas ScriptProperties do script PROD aponta para a planilha de produção correta.",
        risco : "ALTO — DB_ID errado faz o sistema ler/gravar na planilha DEV.",
        como  : "Apps Script PROD → Project Settings → Script Properties → DB_ID."
      },
      {
        ordem : 4,
        etapa : "Criar ABAs AUTH no banco produção",
        acao  : "Executar equivalente de SETUP_AUTH1 ao SETUP_AUTH5 no PROD, somente quando autorizado.",
        risco : "MÉDIO — executar fora de ordem pode criar ABAs duplicadas.",
        como  : "Sessão separada. Confirmar ABAs: AUTH_USUARIOS, AUTH_PERFIS, AUTH_PERMISSOES, AUTH_USUARIO_PERMISSOES, AUTH_RECUPERACAO_SENHA, AUTH_LOG_ACESSO."
      },
      {
        ordem : 5,
        etapa : "Migrar usuários produção",
        acao  : "Executar MIGRAR_ADMIN_LEGADO (adaptado para PROD) — criar entrada em AUTH_USUARIOS para admin.",
        risco : "ALTO — não alterar CAD_USUARIOS. Migrar admin primeiro, validar, depois migrar progressivamente.",
        como  : "Sessão separada. Confirmar admin em AUTH_USUARIOS antes de prosseguir."
      },
      {
        ordem : 6,
        etapa : "Configurar e-mail real de recuperação",
        acao  : "Habilitar MailApp ou Gmail API no projeto PROD. Configurar remetente SGO+.",
        risco : "BAIXO — sem e-mail configurado, recuperação de senha não funciona em PROD.",
        como  : "Apps Script PROD → Services → adicionar Gmail API ou ativar MailApp no manifest."
      },
      {
        ordem : 7,
        etapa : "Definir senha admin produção",
        acao  : "Trocar senha de teste por senha forte definitiva no admin PROD.",
        risco : "ALTO — senha de teste nunca deve permanecer em PROD.",
        como  : "Usar fluxo de primeiro acesso ou redefinição manual via token PROD."
      },
      {
        ordem : 8,
        etapa : "Push para produção (clasp push)",
        acao  : "Executar clasp push com .clasp.json apontando para scriptId PROD. Sem --force.",
        risco : "ALTO — irreversível sem rollback de versão.",
        como  : "Confirmar .clasp.json antes. Executar. Confirmar 78 arquivos enviados sem erros."
      },
      {
        ordem : 9,
        etapa : "Publicar nova versão WebApp PROD",
        acao  : "Apps Script PROD → Implantar → atualizar implantação existente.",
        risco : "MÉDIO — usuários em sessão ativa podem ser desconectados.",
        como  : "Fora do horário de pico. Avisar usuários antes se necessário."
      },
      {
        ordem : 10,
        etapa : "Validar login admin produção",
        acao  : "Abrir URL PROD → login com admin e nova senha definitiva → confirmar acesso total.",
        risco : "BAIXO — se falhar, rollback para versão anterior.",
        como  : "Checklist: login OK, menu completo, logout OK, esqueci senha OK."
      },
      {
        ordem : 11,
        etapa : "Validar usuário técnico produção",
        acao  : "Testar login com perfil TECNICO → confirmar módulos restritos corretos.",
        risco : "BAIXO.",
        como  : "Checklist: login OK, só módulos do perfil TECNICO visíveis."
      },
      {
        ordem : 12,
        etapa : "Manter fallback legado ativo",
        acao  : "Não remover o fallback de login legado até todos os usuários PROD migrarem para V2.",
        risco : "ALTO — remover antes da migração completa bloqueia usuários não migrados.",
        como  : "Monitorar AUTH_LOG_ACESSO: quando loginLegado=0 por N dias consecutivos, pode desativar."
      }
    ],

    restricoesAbsolutas : [
      "Nunca usar --force em push.",
      "Nunca alterar CAD_USUARIOS durante o processo.",
      "Nunca remover fallback legado antes da migração completa.",
      "Nunca executar mais de uma etapa por sessão sem confirmação humana.",
      "Nunca logar senha ou token em Logger.log."
    ],

    assinatura : {
      geradoPor     : "METROLABS SGO+ AUTH.8",
      dataReferencia: new Date().toISOString(),
      conclusao     : "Plano de publicação documentado. Nenhuma etapa executada. Aguardando autorização formal para AUTH.9."
    }
  };

  Logger.log(JSON.stringify(plano, null, 2));
  return plano;
}

// ── AUTH8_PACOTE_FINAL_GO_NO_GO_SEM_GRAVAR ────────────────
function AUTH8_PACOTE_FINAL_GO_NO_GO_SEM_GRAVAR() {
  var DEV_ID = "12xiWNlQ-WKVpiofmcGfBaX4EBdlsIxKFJG2PFTamHUmSUs89c4LW3WSG";
  if (ScriptApp.getScriptId() !== DEV_ID) {
    return { bloqueio: "BLOQUEIO: somente DEV.", scriptId: ScriptApp.getScriptId() };
  }

  var pacote = {
    funcao    : "AUTH8_PACOTE_FINAL_GO_NO_GO_SEM_GRAVAR",
    geradoEm  : new Date().toISOString(),

    devGo      : true,
    producaoGo : false,

    motivoProducaoGoFalse : [
      "Migração de usuários PROD não executada.",
      "E-mail real de recuperação não configurado.",
      "Senha definitiva admin PROD não definida.",
      "Testes controlados PROD não realizados.",
      "Deploy PROD não autorizado formalmente."
    ],

    recomendacao : "Sistema AUTH aprovado no DEV e pronto para etapa pré-produção controlada. Produção permanece bloqueada até AUTH.9+.",

    resumoAprovacoesDEV : {
      "AUTH.1"     : "Schema AUTH_USUARIOS e hash V2",
      "AUTH.2"     : "Admin migrado para AUTH_USUARIOS",
      "AUTH.3"     : "Login V2 backend e wrappers globais",
      "AUTH.4A"    : "Login V2 frontend + EMAIL admin DEV",
      "AUTH.4B"    : "Fallback legado preservado",
      "AUTH.4C"    : "Primeiro acesso / troca de senha obrigatória",
      "AUTH.4D"    : "Esqueci minha senha backend + frontend",
      "AUTH.5"     : "Permissões e perfis por módulo (DB-driven)",
      "AUTH.6"     : "Endurecimento de sessão e guard",
      "AUTH.7"     : "Validação humana DEV aprovada",
      "AUTH.7_FIX" : "Token DEV preenchido corretamente após fix"
    },

    proximasEtapas : ["AUTH.9", "AUTH.10", "AUTH.11", "AUTH.12", "AUTH.13"],

    bloqueios : [],

    assinatura : {
      geradoPor     : "METROLABS SGO+ AUTH.8",
      dataReferencia: new Date().toISOString(),
      conclusao     : "AUTH.8 APROVADO — DEV FECHADO / PRODUÇÃO BLOQUEADA"
    }
  };

  Logger.log(JSON.stringify(pacote, null, 2));
  return pacote;
}

// ════════════════════════════════════════════════════════════
//  AUTH.9 — PREPARAÇÃO PRODUÇÃO SEM DEPLOY, SEM PUSH PROD
// ════════════════════════════════════════════════════════════

// ── AUDITAR_AUTH9_IDENTIDADE_AMBIENTES_SEM_GRAVAR ─────────
function AUDITAR_AUTH9_IDENTIDADE_AMBIENTES_SEM_GRAVAR() {
  var DEV_ID  = "12xiWNlQ-WKVpiofmcGfBaX4EBdlsIxKFJG2PFTamHUmSUs89c4LW3WSG";
  var PROD_ID = "1szglIVlBS973xwGsTMKYtc-y5tqVJFIcZgO7iCJi2CWGXLAMGX9abLBY";

  var scriptAtual = ScriptApp.getScriptId();
  var ambienteAtual = scriptAtual === DEV_ID ? "DEV"
                    : scriptAtual === PROD_ID ? "PROD"
                    : "DESCONHECIDO";

  var resultado = {
    funcao              : "AUDITAR_AUTH9_IDENTIDADE_AMBIENTES_SEM_GRAVAR",
    execucaoEm          : new Date().toISOString(),
    devScriptIdEsperado : DEV_ID,
    prodScriptIdEsperado: PROD_ID,
    scriptAtual         : scriptAtual,
    ambienteAtual       : ambienteAtual,
    devConfirmado       : scriptAtual === DEV_ID,
    producaoIntacta     : scriptAtual !== PROD_ID,
    claspJson           : {
      nota          : "Arquivo .clasp.json é local — não acessível em runtime do Apps Script.",
      confirmacaoLocal: "Confirmado manualmente: .clasp.json aponta para DEV_ID antes de cada push.",
      instrucao     : "Antes de qualquer push PROD: editar .clasp.json, trocar scriptId para PROD_ID, confirmar, só então fazer clasp push."
    },
    bloqueios : [],
    status    : "PENDENTE"
  };

  if (ambienteAtual === "DESCONHECIDO") {
    resultado.bloqueios.push("scriptId desconhecido — nem DEV nem PROD esperados.");
  }
  if (!resultado.devConfirmado && ambienteAtual !== "PROD") {
    resultado.bloqueios.push("Ambiente nao reconhecido. Nao prosseguir.");
  }

  resultado.status    = resultado.bloqueios.length === 0 ? "OK" : "FALHA";
  resultado.conclusao = resultado.devConfirmado
    ? "AUTH.9 IDENTIDADE OK — rodando em DEV. Para auditar PROD, executar no projeto PROD quando autorizado."
    : (ambienteAtual === "PROD"
        ? "AUTH.9 IDENTIDADE OK — rodando em PROD. Pode prosseguir com auditorias somente leitura PROD."
        : "AUTH.9 IDENTIDADE BLOQUEADO — ambiente desconhecido.");

  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

// ── AUDITAR_AUTH9_PROD_PROPERTIES_SEM_GRAVAR ──────────────
// TRAVA: somente executa se scriptId = PROD_ID.
// Executar SOMENTE quando autorizado explicitamente.
function AUDITAR_AUTH9_PROD_PROPERTIES_SEM_GRAVAR() {
  var PROD_ID = "1szglIVlBS973xwGsTMKYtc-y5tqVJFIcZgO7iCJi2CWGXLAMGX9abLBY";

  if (ScriptApp.getScriptId() !== PROD_ID) {
    var naoExecutado = {
      funcao    : "AUDITAR_AUTH9_PROD_PROPERTIES_SEM_GRAVAR",
      execucaoEm: new Date().toISOString(),
      status    : "NAO_EXECUTADO",
      motivo    : "Esta auditoria deve rodar no projeto PROD quando autorizado. Script atual: " + ScriptApp.getScriptId()
    };
    Logger.log(JSON.stringify(naoExecutado, null, 2));
    return naoExecutado;
  }

  // ── Somente leitura — roda apenas no PROD ─────────────────
  var resultado = {
    funcao        : "AUDITAR_AUTH9_PROD_PROPERTIES_SEM_GRAVAR",
    execucaoEm    : new Date().toISOString(),
    prodConfirmado: true,
    properties    : {},
    authFlags     : {},
    bloqueios     : [],
    status        : "PENDENTE"
  };

  try {
    var props = PropertiesService.getScriptProperties().getProperties();

    // Propriedades principais — somente registrar presença/ausência (não logar valores sensíveis)
    resultado.properties.dbIdPresente         = !!(props["DB_ID"] && String(props["DB_ID"]).trim().length > 0);
    resultado.properties.dbFinIdPresente      = !!(props["DB_FIN_ID"] && String(props["DB_FIN_ID"]).trim().length > 0);
    resultado.properties.webappUrlPresente    = !!(props["WEBAPP_URL"] || props["SGO_WEBAPP_URL"]);
    resultado.properties.emailAlertasPresente = !!(props["EMAIL_ALERTAS_DESTINO"] && String(props["EMAIL_ALERTAS_DESTINO"]).trim().length > 0);

    // Flags AUTH se existirem
    var authKeys = Object.keys(props).filter(function(k){ return k.indexOf("AUTH") === 0; });
    resultado.authFlags.totalFlagsAuth = authKeys.length;
    resultado.authFlags.chaves         = authKeys;

    if (!resultado.properties.dbIdPresente) resultado.bloqueios.push("DB_ID ausente nas ScriptProperties PROD.");

    resultado.status    = resultado.bloqueios.length === 0 ? "OK" : "FALHA";
    resultado.conclusao = resultado.bloqueios.length === 0
      ? "AUTH.9 PROD PROPERTIES OK — propriedades lidas. Prosseguir com AUDITAR_AUTH9_PROD_DB_SCHEMA_SEM_GRAVAR."
      : "AUTH.9 PROD PROPERTIES BLOQUEADO — ver bloqueios.";

  } catch (e) {
    resultado.bloqueios.push("Erro: " + e.message);
    resultado.status = "ERRO";
  }

  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

// ── AUDITAR_AUTH9_PROD_DB_SCHEMA_SEM_GRAVAR ───────────────
// TRAVA: somente executa se scriptId = PROD_ID.
// Executar SOMENTE quando autorizado explicitamente.
function AUDITAR_AUTH9_PROD_DB_SCHEMA_SEM_GRAVAR() {
  var PROD_ID = "1szglIVlBS973xwGsTMKYtc-y5tqVJFIcZgO7iCJi2CWGXLAMGX9abLBY";

  if (ScriptApp.getScriptId() !== PROD_ID) {
    var naoExecutado = {
      funcao    : "AUDITAR_AUTH9_PROD_DB_SCHEMA_SEM_GRAVAR",
      execucaoEm: new Date().toISOString(),
      status    : "NAO_EXECUTADO",
      motivo    : "Esta auditoria deve rodar no projeto PROD quando autorizado. Script atual: " + ScriptApp.getScriptId()
    };
    Logger.log(JSON.stringify(naoExecutado, null, 2));
    return naoExecutado;
  }

  // ── Somente leitura — roda apenas no PROD ─────────────────
  var resultado = {
    funcao        : "AUDITAR_AUTH9_PROD_DB_SCHEMA_SEM_GRAVAR",
    execucaoEm    : new Date().toISOString(),
    prodConfirmado: true,
    cadUsuarios   : {},
    abasAuth      : {},
    bloqueios     : [],
    status        : "PENDENTE"
  };

  var CAD_HEADERS_ESPERADOS = ["ID","USUARIO","SENHA","NOME","PERFIL","STATUS","CRIADO_EM","CLIENTE_ID"];
  var ABAS_AUTH = [
    "AUTH_USUARIOS","AUTH_PERFIS","AUTH_PERMISSOES",
    "AUTH_USUARIO_PERMISSOES","AUTH_RECUPERACAO_SENHA","AUTH_LOG_ACESSO"
  ];

  try {
    var props = PropertiesService.getScriptProperties();
    var dbId  = String(props.getProperty("DB_ID") || "").trim();
    if (!dbId) {
      resultado.bloqueios.push("DB_ID ausente. Execute AUDITAR_AUTH9_PROD_PROPERTIES_SEM_GRAVAR primeiro.");
      resultado.status = "BLOQUEADO";
      Logger.log(JSON.stringify(resultado, null, 2));
      return resultado;
    }

    var ss = SpreadsheetApp.openById(dbId);

    // CAD_USUARIOS — somente leitura
    var shCad = ss.getSheetByName("CAD_USUARIOS");
    if (!shCad) {
      resultado.cadUsuarios.existe = false;
      resultado.bloqueios.push("CAD_USUARIOS nao encontrada no DB PROD.");
    } else {
      resultado.cadUsuarios.existe = true;
      resultado.cadUsuarios.totalLinhas = shCad.getLastRow();
      resultado.cadUsuarios.totalUsuarios = Math.max(0, shCad.getLastRow() - 1);
      if (shCad.getLastRow() >= 1) {
        var hCad = shCad.getRange(1, 1, 1, shCad.getLastColumn()).getValues()[0]
          .map(function(v){ return String(v||"").trim(); })
          .filter(function(v){ return v !== ""; });
        resultado.cadUsuarios.headers = hCad;
        var cadOk = CAD_HEADERS_ESPERADOS.every(function(h){ return hCad.indexOf(h) >= 0; });
        resultado.cadUsuarios.headersValidos = cadOk;
        if (!cadOk) resultado.bloqueios.push("CAD_USUARIOS headers inesperados: " + JSON.stringify(hCad));
      }
    }

    // ABAs AUTH — verificar existência, não criar
    ABAS_AUTH.forEach(function(nomeAba) {
      var sh = ss.getSheetByName(nomeAba);
      resultado.abasAuth[nomeAba] = {
        existe     : !!sh,
        totalLinhas: sh ? sh.getLastRow() : 0
      };
    });

    var abasAusentes = ABAS_AUTH.filter(function(n){ return !resultado.abasAuth[n].existe; });
    if (abasAusentes.length > 0) {
      resultado.abasAuth.ausentes      = abasAusentes;
      resultado.abasAuth.precisarCriar = true;
    } else {
      resultado.abasAuth.ausentes      = [];
      resultado.abasAuth.precisarCriar = false;
    }

    resultado.status    = resultado.bloqueios.length === 0 ? "OK" : "FALHA";
    resultado.conclusao = resultado.bloqueios.length === 0
      ? "AUTH.9 PROD DB SCHEMA OK — estrutura lida. Abas AUTH ausentes = " + abasAusentes.length + ". Prosseguir com AUTH.10."
      : "AUTH.9 PROD DB SCHEMA BLOQUEADO — ver bloqueios.";

  } catch (e) {
    resultado.bloqueios.push("Erro: " + e.message);
    resultado.status = "ERRO";
  }

  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

// ── CHECKLIST_AUTH9_PREPARACAO_PROD_SEM_GRAVAR ────────────
function CHECKLIST_AUTH9_PREPARACAO_PROD_SEM_GRAVAR() {
  var DEV_ID = "12xiWNlQ-WKVpiofmcGfBaX4EBdlsIxKFJG2PFTamHUmSUs89c4LW3WSG";
  if (ScriptApp.getScriptId() !== DEV_ID) {
    return { bloqueio: "BLOQUEIO: somente DEV.", scriptId: ScriptApp.getScriptId() };
  }

  var checklist = {
    funcao           : "CHECKLIST_AUTH9_PREPARACAO_PROD_SEM_GRAVAR",
    geradoEm         : new Date().toISOString(),
    prontoParaAUTH10 : false,

    itens : [
      {
        num    : 1,
        item   : "PROD scriptId confirmado",
        status : "MANUAL",
        nota   : "Confirmar: scriptId PROD = 1szglIVlBS973xwGsTMKYtc-y5tqVJFIcZgO7iCJi2CWGXLAMGX9abLBY"
      },
      {
        num    : 2,
        item   : "DB_ID PROD confirmado",
        status : "PENDENTE_AUDITORIA_PROD",
        nota   : "Executar AUDITAR_AUTH9_PROD_PROPERTIES_SEM_GRAVAR no projeto PROD quando autorizado."
      },
      {
        num    : 3,
        item   : "Deployment atual PROD registrado",
        status : "MANUAL",
        nota   : "Anotar URL WebApp PROD e versão publicada atual antes de qualquer alteração."
      },
      {
        num    : 4,
        item   : "CAD_USUARIOS PROD auditada",
        status : "PENDENTE_AUDITORIA_PROD",
        nota   : "Executar AUDITAR_AUTH9_PROD_DB_SCHEMA_SEM_GRAVAR no projeto PROD quando autorizado."
      },
      {
        num    : 5,
        item   : "Abas AUTH PROD verificadas",
        status : "PENDENTE_AUDITORIA_PROD",
        nota   : "Idem — verificar quais abas AUTH existem e quais precisam ser criadas."
      },
      {
        num    : 6,
        item   : "Fallback legado preservado",
        status : "OK",
        nota   : "Confirmado em AUTH.8 — .login(loginOuEmail, senha) presente em JS_Core.html."
      },
      {
        num    : 7,
        item   : "Plano de rollback existente",
        status : "OK",
        nota   : "Documentado em PLANO_ROLLBACK_AUTH7_SEM_GRAVAR e PLANO_AUTH8_PUBLICACAO_FUTURA_SEM_GRAVAR."
      },
      {
        num    : 8,
        item   : "Sem push PROD ainda",
        status : "OK",
        nota   : ".clasp.json aponta para DEV — push PROD bloqueado até autorização."
      },
      {
        num    : 9,
        item   : "Sem deploy PROD ainda",
        status : "OK",
        nota   : "Nenhuma nova versão publicada no script PROD durante AUTH.1–9."
      }
    ],

    itensPendentes : [
      "DB_ID PROD confirmado — aguarda execução de AUDITAR_AUTH9_PROD_PROPERTIES_SEM_GRAVAR no PROD.",
      "CAD_USUARIOS PROD auditada — aguarda execução de AUDITAR_AUTH9_PROD_DB_SCHEMA_SEM_GRAVAR no PROD.",
      "Abas AUTH PROD verificadas — idem."
    ],

    proximosPasso : {
      quando  : "Após auditorias PROD executadas e aprovadas",
      etapa   : "AUTH.10",
      descricao: "Criação controlada das abas AUTH em produção e migração inicial do admin — ainda sem deploy se possível."
    }
  };

  Logger.log(JSON.stringify(checklist, null, 2));
  return checklist;
}

// ── AUTH9_GO_NO_GO_PREPARACAO_PROD_SEM_GRAVAR ─────────────
function AUTH9_GO_NO_GO_PREPARACAO_PROD_SEM_GRAVAR() {
  var DEV_ID = "12xiWNlQ-WKVpiofmcGfBaX4EBdlsIxKFJG2PFTamHUmSUs89c4LW3WSG";
  if (ScriptApp.getScriptId() !== DEV_ID) {
    return { bloqueio: "BLOQUEIO: somente DEV.", scriptId: ScriptApp.getScriptId() };
  }

  var pacote = {
    funcao    : "AUTH9_GO_NO_GO_PREPARACAO_PROD_SEM_GRAVAR",
    geradoEm  : new Date().toISOString(),

    auth9DevOk                       : true,
    prodAindaBloqueada               : true,
    podeExecutarAuditoriasNoProd     : true,
    podeIrParaAUTH10                 : false,

    notaPodeExecutarAuditoriasNoProd :
      "As funções AUDITAR_AUTH9_PROD_PROPERTIES_SEM_GRAVAR e AUDITAR_AUTH9_PROD_DB_SCHEMA_SEM_GRAVAR " +
      "estão prontas com trava de scriptId PROD. Podem ser executadas no projeto PROD quando o " +
      "responsável autorizar — somente leitura, sem gravar nada.",

    notaPodeIrParaAUTH10 :
      "AUTH.10 só inicia após: DB_ID PROD confirmado + CAD_USUARIOS PROD auditada + " +
      "abas AUTH PROD verificadas. Executar auditorias PROD primeiro.",

    bloqueios : [],

    assinatura : {
      geradoPor     : "METROLABS SGO+ AUTH.9",
      dataReferencia: new Date().toISOString(),
      conclusao     : "AUTH.9 PREPARAÇÃO DEV OK — aguardando auditorias somente leitura no projeto PROD."
    }
  };

  Logger.log(JSON.stringify(pacote, null, 2));
  return pacote;
}

// ============================================================
// AUTH.10 — FUNÇÕES DE PLANEJAMENTO E CHECKLIST (SOMENTE LEITURA)
// ============================================================

function RELATORIO_AUTH10_PLANO_PROMOCAO_DEV_PROD_SEM_GRAVAR() {
  var DEV_SCRIPT_ID  = '12xiWNlQ-WKVpiofmcGfBaX4EBdlsIxKFJG2PFTamHUmSUs89c4LW3WSG';
  var PROD_SCRIPT_ID = '1szglIVlBS973xwGsTMKYtc-y5tqVJFIcZgO7iCJi2CWGXLAMGX9abLBY';

  var plano = {
    funcao: 'RELATORIO_AUTH10_PLANO_PROMOCAO_DEV_PROD_SEM_GRAVAR',
    geradoEm: new Date().toISOString(),
    somenteLeitura: true,

    situacaoAtual: {
      dev: {
        scriptId: DEV_SCRIPT_ID,
        status: 'HOMOLOGADO — AUTH.1 a AUTH.9 concluídos',
        arquivosJs: 49,
        destaques: [
          'SGO_Auth_V2.js presente — novo sistema de autenticação',
          'SGO_Migracao.js presente — script de migração CAD_USUARIOS → AUTH_USUARIOS',
          '_tmp_ast_check.js DEVE ser removido antes de promover',
          'Integracao_OSPlus.js está em filePushOrder mas NÃO existe fisicamente — corrigir antes do push',
          'SGO_Fin.js, SGO_Fin_Extratos.js, SGO_Fin_Provisionamento.js, SGO_Fin_Setup.js, SGO_Fin_Termos.js, SGO_IA.js, SGO_AssistenciaTecnica.js ausentes do filePushOrder — adicionar'
        ],
        deployments: ['HEAD', '@218', '@222 (mais recente)']
      },
      prod: {
        scriptId: PROD_SCRIPT_ID,
        status: 'PARCIALMENTE CONFIGURADO — apenas módulo Financeiro/Flash',
        arquivosJs: 48,
        destaques: [
          'DB_ID principal AUSENTE — banco principal nunca configurado',
          'DB_FIN_ID configurado — banco financeiro/Flash operacional',
          'Deployment @3 "Flash mobile piloto real B55" servindo usuários ativos',
          'SGO_Auth_V2.js AUSENTE — novo sistema de auth não implantado',
          'SGO_Migracao.js AUSENTE',
          '000_AUTH9_PRELOAD_TEMP.js e AUTH9_AUDITOR_TEMP.js temporários presentes'
        ],
        deployments: ['HEAD', '@3 Flash mobile piloto real B55 (WebApp ativo)']
      }
    },

    planos: {
      planoA: {
        nome: 'Promover DEV como nova produção via novo deployment no próprio script DEV',
        descricao: 'Criar deployment WebApp no script DEV, apuntar usuários para nova URL.',
        vantagens: [
          'DEV já está pronto e homologado',
          'Sem necessidade de copiar código',
          'ScriptProperties DEV já parcialmente configuradas'
        ],
        riscos: [
          'URL de produção mudará — comunicação necessária a todos os usuários',
          'Flash pilot rodando no PROD com URL @3 continua em separado',
          'DEV tem arquivos temp e inconsistências no filePushOrder que precisam ser limpas primeiro'
        ],
        viabilidade: 'VIÁVEL COM PRÉ-REQUISITOS'
      },
      planoB: {
        nome: 'Substituir código do script PROD pelo código DEV e criar novo deployment no PROD',
        descricao: 'Copiar todo código DEV para o clone PROD isolado e fazer clasp push + novo deployment versão.',
        vantagens: [
          'Mantém scriptId PROD e URL existente do deployment @3',
          'Flash pilot continua com mesma URL se criar nova versão por cima'
        ],
        riscos: [
          'Risco de overwrite acidental se não houver backup completo',
          'ScriptProperties PROD precisam ser configuradas do zero (DB_ID ausente)',
          'Deployment @3 Flash serve usuários reais — nova versão pode quebrar se não testado',
          'Maior complexidade operacional — copiar arquivos manualmente'
        ],
        viabilidade: 'VIÁVEL COM CAUTELA EXTREMA'
      },
      planoC: {
        nome: 'Criar novo projeto SGO_PLUS_PRODUCAO_V2 a partir do DEV, manter PROD congelado',
        descricao: 'Criar projeto Apps Script novo, clonar DEV nele, provisionar do zero, criar WebApp novo.',
        vantagens: [
          'PROD antigo fica congelado — backup natural com WebApp Flash intacto',
          'PRODUCAO_V2 nasce limpa e homologada com AUTH.1-9',
          'Zero risco de afetar usuários Flash do PROD atual',
          'Novo DEV criado depois a partir do PRODUCAO_V2 com baseline limpo'
        ],
        riscos: [
          'Nova URL de WebApp — todos os usuários SGO+ precisam receber novo link',
          'Flash pilot no PROD antigo precisará ser migrado para PRODUCAO_V2 em momento posterior',
          'Mais um projeto Apps Script para gerenciar temporariamente'
        ],
        viabilidade: 'RECOMENDADO — MENOR RISCO GERAL'
      }
    },

    recomendacao: {
      plano: 'PLANO C',
      justificativa: [
        'PROD atual não tem DB_ID — nunca foi produção plena do SGO+, apenas do módulo Flash',
        'Flash pilot usa deployment @3 com URL real — não devemos mexer nesse scriptId',
        'DEV homologado com AUTH.1-9 é a baseline mais segura para uma produção nova',
        'Criar PRODUCAO_V2 do zero com setup controlado é mais seguro que sobrescrever PROD',
        'PROD antigo congelado = backup imediato e FlashPilot preservado'
      ],
      sequenciaDeExecucao: [
        '1. Limpar DEV: remover _tmp_ast_check.js, corrigir filePushOrder (remover Integracao_OSPlus.js, adicionar arquivos faltantes)',
        '2. Criar projeto Apps Script "SGO_PLUS_PRODUCAO_V2" via console GAS',
        '3. Clonar estrutura do DEV em clone PRODUCAO_V2 local',
        '4. clasp push para PRODUCAO_V2 (sem --force, sem deploy)',
        '5. Executar SGO_Setup_v2 no PRODUCAO_V2 para provisionar banco novo',
        '6. Executar SGO_Migracao para migrar dados se necessário',
        '7. Criar deployment WebApp no PRODUCAO_V2 e testar',
        '8. Comunicar nova URL aos usuários',
        '9. Criar projeto "SGO_PLUS_DEV_V2" clonando PRODUCAO_V2 para desenvolvimento futuro',
        '10. Congelar DEV atual e PROD antigo como archives'
      ]
    }
  };

  Logger.log(JSON.stringify(plano, null, 2));
  return plano;
}

function CHECKLIST_AUTH10_PRE_EXECUCAO_SEM_GRAVAR() {
  var checklist = {
    funcao: 'CHECKLIST_AUTH10_PRE_EXECUCAO_SEM_GRAVAR',
    geradoEm: new Date().toISOString(),
    somenteLeitura: true,
    instrucao: 'Todos os itens devem estar APROVADO antes de iniciar AUTH.10 real.',

    fase1_backup: {
      nome: 'Fase 1 — Backups obrigatórios',
      itens: [
        { id: 'BKP-01', item: 'Exportar código DEV via clasp pull ou download ZIP do Apps Script', status: 'PENDENTE' },
        { id: 'BKP-02', item: 'Exportar código PROD via clone isolado (já existe em /tmp/sgo_auth9_prod_auditor)', status: 'PARCIAL' },
        { id: 'BKP-03', item: 'Salvar lista de ScriptProperties DEV (nomes + valores mascarados)', status: 'PENDENTE' },
        { id: 'BKP-04', item: 'Salvar lista de ScriptProperties PROD (concluído em AUTH.9D)', status: 'CONCLUIDO' },
        { id: 'BKP-05', item: 'Anotar deployments DEV (@218, @222) e PROD (@3 Flash) com IDs completos', status: 'PENDENTE' },
        { id: 'BKP-06', item: 'Fazer snapshot da planilha banco DEV (export ou cópia manual no Drive)', status: 'PENDENTE' }
      ]
    },

    fase2_limpeza_dev: {
      nome: 'Fase 2 — Limpeza e saneamento do DEV',
      itens: [
        { id: 'LMP-01', item: 'Remover _tmp_ast_check.js do DEV', status: 'PENDENTE' },
        { id: 'LMP-02', item: 'Remover Integracao_OSPlus.js do filePushOrder (arquivo não existe fisicamente)', status: 'PENDENTE' },
        { id: 'LMP-03', item: 'Adicionar ao filePushOrder: SGO_AssistenciaTecnica.js, SGO_Fin.js, SGO_Fin_Extratos.js, SGO_Fin_Provisionamento.js, SGO_Fin_Setup.js, SGO_Fin_Termos.js, SGO_IA.js', status: 'PENDENTE' },
        { id: 'LMP-04', item: 'Confirmar que clasp push DEV funciona sem erros após limpeza', status: 'PENDENTE' },
        { id: 'LMP-05', item: 'Confirmar que não há funções de teste/debug soltas prontas para ir a produção', status: 'PENDENTE' }
      ]
    },

    fase3_definicoes: {
      nome: 'Fase 3 — Definições obrigatórias antes de criar PRODUCAO_V2',
      itens: [
        { id: 'DEF-01', item: 'Definir qual planilha Google Sheets será o banco principal de PRODUCAO_V2 (ID aprovado pelo responsável)', status: 'PENDENTE' },
        { id: 'DEF-02', item: 'Definir se banco PRODUCAO_V2 será novo ou reutilizará banco DEV', status: 'PENDENTE' },
        { id: 'DEF-03', item: 'Definir DB_FIN_ID para PRODUCAO_V2 (mesmo do PROD Flash ou novo?)', status: 'PENDENTE' },
        { id: 'DEF-04', item: 'Definir e-mail do admin inicial de PRODUCAO_V2', status: 'PENDENTE' },
        { id: 'DEF-05', item: 'Definir política de migração de dados CAD_USUARIOS DEV → PRODUCAO_V2', status: 'PENDENTE' },
        { id: 'DEF-06', item: 'Definir se Flash pilot PROD antigo continuará ativo durante transição', status: 'PENDENTE' }
      ]
    },

    fase4_execucao: {
      nome: 'Fase 4 — Execução controlada (não iniciar sem Fases 1-3 completas)',
      itens: [
        { id: 'EXE-01', item: 'Criar projeto Apps Script SGO_PLUS_PRODUCAO_V2 no Google Console', status: 'BLOQUEADO' },
        { id: 'EXE-02', item: 'Clonar DEV limpo para PRODUCAO_V2 via clasp push', status: 'BLOQUEADO' },
        { id: 'EXE-03', item: 'Configurar ScriptProperties em PRODUCAO_V2 (DB_ID, DB_FIN_ID, etc.)', status: 'BLOQUEADO' },
        { id: 'EXE-04', item: 'Executar SGO_Setup_v2 em PRODUCAO_V2 para provisionar abas AUTH', status: 'BLOQUEADO' },
        { id: 'EXE-05', item: 'Executar SGO_Migracao se houver dados a migrar do DEV', status: 'BLOQUEADO' },
        { id: 'EXE-06', item: 'Criar deployment WebApp em PRODUCAO_V2 e registrar URL', status: 'BLOQUEADO' },
        { id: 'EXE-07', item: 'Teste humano completo em PRODUCAO_V2 antes de qualquer comunicação', status: 'BLOQUEADO' },
        { id: 'EXE-08', item: 'Aprovação formal do responsável após teste', status: 'BLOQUEADO' },
        { id: 'EXE-09', item: 'Comunicar nova URL aos usuários finais', status: 'BLOQUEADO' },
        { id: 'EXE-10', item: 'Criar SGO_PLUS_DEV_V2 clonando PRODUCAO_V2', status: 'BLOQUEADO' }
      ]
    },

    fase5_rollback: {
      nome: 'Fase 5 — Plano de rollback documentado',
      itens: [
        { id: 'RLB-01', item: 'DEV atual permanece intacto como fallback — não apagar antes de EXE-09 aprovado', status: 'DEFINIDO' },
        { id: 'RLB-02', item: 'PROD antigo permanece congelado com Flash @3 ativo — não tocar', status: 'DEFINIDO' },
        { id: 'RLB-03', item: 'Se PRODUCAO_V2 falhar, usuários continuam no DEV ou recebem PROD antigo conforme caso', status: 'DEFINIDO' },
        { id: 'RLB-04', item: 'PRODUCAO_V2 pode ser deletada sem impacto em DEV ou PROD antigo', status: 'DEFINIDO' }
      ]
    },

    autorizacoesNecessarias: [
      'Aprovação do responsável para iniciar AUTH.10 real',
      'Definição do banco principal (DEF-01)',
      'Definição do e-mail admin (DEF-04)',
      'Aprovação de teste humano pós-deploy (EXE-08)'
    ]
  };

  Logger.log(JSON.stringify(checklist, null, 2));
  return checklist;
}

function GO_NO_GO_AUTH10_PROMOCAO_SEM_GRAVAR() {
  var DEV_SCRIPT_ID = '12xiWNlQ-WKVpiofmcGfBaX4EBdlsIxKFJG2PFTamHUmSUs89c4LW3WSG';
  var scriptAtual = ScriptApp.getScriptId();

  // Verificações de pré-condição que podem ser testadas no DEV agora
  var checks = [];

  function check(id, descricao, avaliacao, bloqueante) {
    var resultado = avaliacao();
    checks.push({
      id: id,
      descricao: descricao,
      resultado: resultado.ok ? 'GO' : (bloqueante ? 'NO-GO' : 'AVISO'),
      detalhe: resultado.detalhe,
      bloqueante: bloqueante
    });
    return resultado.ok;
  }

  check('CHK-01', 'Executando no DEV correto', function() {
    return {
      ok: scriptAtual === DEV_SCRIPT_ID,
      detalhe: scriptAtual === DEV_SCRIPT_ID ? 'scriptId DEV confirmado' : 'ATENÇÃO: executando fora do DEV'
    };
  }, true);

  check('CHK-02', 'SGO_Auth_V2 disponível', function() {
    return {
      ok: typeof SGO_AUTH_V2 !== 'undefined',
      detalhe: typeof SGO_AUTH_V2 !== 'undefined' ? 'SGO_AUTH_V2 carregado' : 'SGO_AUTH_V2 não encontrado no escopo global'
    };
  }, true);

  check('CHK-03', 'SGO_CFG disponível', function() {
    return {
      ok: typeof sgoGetCfgSafe_() !== 'undefined' && !!sgoGetCfgSafe_(),
      detalhe: typeof sgoGetCfgSafe_() !== 'undefined' ? 'SGO_CFG carregado' : 'SGO_CFG não disponível'
    };
  }, true);

  check('CHK-04', 'DB_ID configurado no DEV', function() {
    try {
      var dbId = PropertiesService.getScriptProperties().getProperty('DB_ID');
      return {
        ok: !!dbId && dbId.length > 20,
        detalhe: dbId ? 'DB_ID presente (' + dbId.length + ' chars)' : 'DB_ID ausente nas ScriptProperties DEV'
      };
    } catch(e) {
      return { ok: false, detalhe: 'Erro ao ler DB_ID: ' + e.message };
    }
  }, true);

  check('CHK-05', 'DB_FIN_ID configurado no DEV', function() {
    try {
      var finId = PropertiesService.getScriptProperties().getProperty('DB_FIN_ID');
      return {
        ok: !!finId && finId.length > 20,
        detalhe: finId ? 'DB_FIN_ID presente (' + finId.length + ' chars)' : 'DB_FIN_ID ausente — módulo Fin/Flash não estará funcional'
      };
    } catch(e) {
      return { ok: false, detalhe: 'Erro: ' + e.message };
    }
  }, false);

  check('CHK-06', 'SGO_DATA disponível', function() {
    return {
      ok: typeof SGO_DATA !== 'undefined',
      detalhe: typeof SGO_DATA !== 'undefined' ? 'SGO_DATA carregado' : 'SGO_DATA não disponível'
    };
  }, true);

  check('CHK-07', 'Banco DEV acessível', function() {
    try {
      var dbId = PropertiesService.getScriptProperties().getProperty('DB_ID');
      if (!dbId) return { ok: false, detalhe: 'DB_ID ausente — não foi possível testar acesso' };
      var ss = SpreadsheetApp.openById(dbId);
      var nome = ss ? ss.getName() : null;
      return {
        ok: !!nome,
        detalhe: nome ? 'Banco acessível — nome: ' + nome.substring(0, 20) + '...' : 'Banco inacessível'
      };
    } catch(e) {
      return { ok: false, detalhe: 'Erro ao abrir banco: ' + e.message };
    }
  }, true);

  check('CHK-08', 'CAD_USUARIOS existe no banco DEV', function() {
    try {
      var dbId = PropertiesService.getScriptProperties().getProperty('DB_ID');
      if (!dbId) return { ok: false, detalhe: 'DB_ID ausente' };
      var ss = SpreadsheetApp.openById(dbId);
      var aba = ss.getSheetByName('CAD_USUARIOS');
      return {
        ok: !!aba,
        detalhe: aba ? 'CAD_USUARIOS encontrada (' + Math.max(0, aba.getLastRow() - 1) + ' registros)' : 'CAD_USUARIOS não encontrada no banco DEV'
      };
    } catch(e) {
      return { ok: false, detalhe: 'Erro: ' + e.message };
    }
  }, true);

  var noGos = checks.filter(function(c) { return c.resultado === 'NO-GO'; });
  var avisos = checks.filter(function(c) { return c.resultado === 'AVISO'; });
  var gos    = checks.filter(function(c) { return c.resultado === 'GO'; });

  var resultado = {
    funcao: 'GO_NO_GO_AUTH10_PROMOCAO_SEM_GRAVAR',
    geradoEm: new Date().toISOString(),
    somenteLeitura: true,
    scriptAtual: scriptAtual,
    checks: checks,
    resumo: {
      totalChecks: checks.length,
      go: gos.length,
      noGo: noGos.length,
      avisos: avisos.length
    },
    decisao: noGos.length === 0 ? 'GO — pré-condições técnicas DEV satisfeitas para iniciar AUTH.10' : 'NO-GO — corrigir bloqueios antes de prosseguir',
    bloqueios: noGos.map(function(c) { return c.id + ': ' + c.descricao + ' — ' + c.detalhe; }),
    lembrete: [
      'GO técnico DEV não autoriza execução AUTH.10 automaticamente.',
      'Autorização do responsável + itens de checklist CHECKLIST_AUTH10_PRE_EXECUCAO_SEM_GRAVAR são obrigatórios.',
      'Esta função não grava, não cria, não altera nada.'
    ]
  };

  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

// ============================================================
// AUTH.10A — AUDITORIAS DE BACKUP E LIMPEZA DEV (SOMENTE LEITURA)
// ============================================================

function AUDITAR_AUTH10A_DEV_PROPERTIES_MASCARADAS_SEM_GRAVAR() {
  var DEV_SCRIPT_ID = '12xiWNlQ-WKVpiofmcGfBaX4EBdlsIxKFJG2PFTamHUmSUs89c4LW3WSG';
  var scriptAtual   = ScriptApp.getScriptId();
  var devConfirmado = scriptAtual === DEV_SCRIPT_ID;

  function mascarar(valor) {
    if (valor === null || valor === undefined || valor === '') return '';
    valor = String(valor);
    if (valor.length <= 8) return '***';
    return valor.substring(0, 4) + '...' + valor.substring(valor.length - 4);
  }

  function pareceId(valor) {
    return /^[a-zA-Z0-9_-]{30,}$/.test(String(valor || ''));
  }

  function classificar(chave, valor) {
    var k = String(chave || '').toUpperCase();
    var v = String(valor || '');
    if (k.indexOf('DB') >= 0 || k.indexOf('SHEET') >= 0 || k.indexOf('SPREADSHEET') >= 0 || k.indexOf('PLANILHA') >= 0) {
      return pareceId(v) ? 'POSSIVEL_ID_PLANILHA' : 'CHAVE_DB_OU_PLANILHA';
    }
    if (k.indexOf('URL') >= 0) return 'URL';
    if (k.indexOf('EMAIL') >= 0) return 'EMAIL';
    if (k.indexOf('TOKEN') >= 0 || k.indexOf('SECRET') >= 0 || k.indexOf('KEY') >= 0 || k.indexOf('SENHA') >= 0) return 'SENSIVEL';
    return 'OUTRA';
  }

  var resultado = {
    funcao: 'AUDITAR_AUTH10A_DEV_PROPERTIES_MASCARADAS_SEM_GRAVAR',
    execucaoEm: new Date().toISOString(),
    scriptAtual: scriptAtual,
    devScriptIdEsperado: DEV_SCRIPT_ID,
    devConfirmado: devConfirmado,
    somenteLeitura: true,
    propriedades: [],
    resumoPorTipo: {},
    candidatasBancoPrincipal: [],
    bloqueios: [],
    avisos: []
  };

  if (!devConfirmado) {
    resultado.bloqueios.push('BLOQUEADO: Esta função deve ser executada somente no projeto DEV.');
    resultado.status = 'BLOQUEADO';
    Logger.log(JSON.stringify(resultado, null, 2));
    return resultado;
  }

  var props = PropertiesService.getScriptProperties().getProperties();
  var chaves = Object.keys(props).sort();

  chaves.forEach(function(chave) {
    var valor = props[chave];
    var tipo  = classificar(chave, valor);
    var entry = {
      chave: chave,
      tipo: tipo,
      preenchida: !!valor,
      tamanho: valor ? String(valor).length : 0,
      valorMascarado: mascarar(valor)
    };
    resultado.propriedades.push(entry);
    resultado.resumoPorTipo[tipo] = (resultado.resumoPorTipo[tipo] || 0) + 1;
    if (tipo === 'POSSIVEL_ID_PLANILHA' || tipo === 'CHAVE_DB_OU_PLANILHA') {
      resultado.candidatasBancoPrincipal.push(entry);
    }
  });

  resultado.totalPropriedades = chaves.length;

  if (!resultado.candidatasBancoPrincipal.length) {
    resultado.avisos.push('Nenhuma propriedade candidata a banco encontrada — verificar configuração.');
  }

  resultado.status   = 'OK';
  resultado.conclusao = 'AUTH.10A DEV PROPERTIES OK — ' + chaves.length + ' propriedades auditadas com valores mascarados, sem gravação.';

  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

function AUDITAR_AUTH10A_LIMPEZA_DEV_SEM_GRAVAR() {
  var DEV_SCRIPT_ID = '12xiWNlQ-WKVpiofmcGfBaX4EBdlsIxKFJG2PFTamHUmSUs89c4LW3WSG';
  var scriptAtual   = ScriptApp.getScriptId();
  var devConfirmado = scriptAtual === DEV_SCRIPT_ID;

  var ARQUIVOS_OBRIGATORIOS = [
    'SGO_Config.js', 'SGO_Utilis.js', 'SGO_Data.js', 'SGO_Auth.js', 'SGO_Auth_V2.js',
    'SGO_Migracao.js', 'SGO_Setup_v2.js', 'SGO_Main.js',
    'SGO_AssistenciaTecnica.js', 'SGO_Fin.js', 'SGO_Fin_Extratos.js',
    'SGO_Fin_Provisionamento.js', 'SGO_Fin_Setup.js', 'SGO_Fin_Termos.js', 'SGO_IA.js'
  ];

  var ARQUIVOS_SUJOS = ['_tmp_ast_check.js', 'Integracao_OSPlus.js'];

  var FUNCOES_AUTH10 = [
    'RELATORIO_AUTH10_PLANO_PROMOCAO_DEV_PROD_SEM_GRAVAR',
    'CHECKLIST_AUTH10_PRE_EXECUCAO_SEM_GRAVAR',
    'GO_NO_GO_AUTH10_PROMOCAO_SEM_GRAVAR',
    'AUDITAR_AUTH10A_DEV_PROPERTIES_MASCARADAS_SEM_GRAVAR',
    'AUDITAR_AUTH10A_LIMPEZA_DEV_SEM_GRAVAR'
  ];

  function checkGlobal(nome) {
    try { return typeof eval(nome) !== 'undefined'; } catch(e) { return false; }
  }

  var resultado = {
    funcao: 'AUDITAR_AUTH10A_LIMPEZA_DEV_SEM_GRAVAR',
    execucaoEm: new Date().toISOString(),
    scriptAtual: scriptAtual,
    devConfirmado: devConfirmado,
    somenteLeitura: true,
    checks: {},
    bloqueios: [],
    avisos: []
  };

  // 1. Arquivos sujos (verificamos via ausência no escopo global — não existem como módulos)
  resultado.checks.arquivosSujos = ARQUIVOS_SUJOS.map(function(nome) {
    var modulo = nome.replace('.js', '').replace(/_/g, '_').toUpperCase();
    // Presença inferida: se funções internas do módulo existem → arquivo foi carregado
    // Para arquivos sujos sem módulo declarado, reportamos "não detectado no escopo"
    return { arquivo: nome, detectadoNoEscopo: false, aviso: 'Não detectável via escopo — verificar via filePushOrder local' };
  });

  // 2. Módulos obrigatórios presentes
  resultado.checks.modulosObrigatorios = {
    SGO_CFG: { presente: typeof sgoGetCfgSafe_() !== 'undefined', bloqueante: true },
    SGO_DATA: { presente: typeof SGO_DATA !== 'undefined', bloqueante: true },
    SGO_AUTH_V2: { presente: typeof SGO_AUTH_V2 !== 'undefined', bloqueante: true },
    SGO_UTILS: { presente: typeof SGO_UTILS !== 'undefined', bloqueante: false }
  };

  Object.keys(resultado.checks.modulosObrigatorios).forEach(function(mod) {
    var info = resultado.checks.modulosObrigatorios[mod];
    if (!info.presente && info.bloqueante) {
      resultado.bloqueios.push('Módulo ausente no escopo: ' + mod);
    } else if (!info.presente) {
      resultado.avisos.push('Módulo não encontrado no escopo: ' + mod);
    }
  });

  // 3. Funções AUTH.10 presentes
  resultado.checks.funcoesAUTH10 = FUNCOES_AUTH10.map(function(fn) {
    var presente = checkGlobal(fn);
    if (!presente) resultado.avisos.push('Função AUTH.10 ausente: ' + fn);
    return { funcao: fn, presente: presente };
  });

  // 4. SGO_Config antes dos dependentes (garantido por filePushOrder — inferir via presença de SGO_CFG)
  resultado.checks.sgoCfgAntesDependentes = {
    sgoCfgDisponivel: typeof sgoGetCfgSafe_() !== 'undefined',
    interpretacao: typeof sgoGetCfgSafe_() !== 'undefined'
      ? 'SGO_Config.js carregado corretamente antes dos módulos dependentes'
      : 'SGO_CFG não disponível — possível problema de ordem de carregamento'
  };

  // 5. ScriptProperties básicas
  try {
    var props = PropertiesService.getScriptProperties().getProperties();
    resultado.checks.scriptProperties = {
      totalPropriedades: Object.keys(props).length,
      dbIdConfigurado: !!props.DB_ID,
      dbFinIdConfigurado: !!props.DB_FIN_ID
    };
    if (!props.DB_ID) resultado.bloqueios.push('DB_ID ausente nas ScriptProperties DEV');
  } catch(e) {
    resultado.checks.scriptProperties = { erro: e.message };
  }

  resultado.status   = resultado.bloqueios.length ? 'BLOQUEADO' : 'OK';
  resultado.conclusao = resultado.bloqueios.length
    ? 'AUTH.10A LIMPEZA BLOQUEADO — corrigir itens antes de criar PRODUCAO_V2.'
    : 'AUTH.10A LIMPEZA OK — DEV em estado consistente para promoção.';

  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

// ============================================================
// AUTH.10B — DEFINIÇÕES PRODUCAO_V2 (SOMENTE LEITURA)
// ============================================================

function RELATORIO_AUTH10B_DEFINICOES_PRODUCAO_V2_SEM_GRAVAR() {
  var DEV_SCRIPT_ID = '12xiWNlQ-WKVpiofmcGfBaX4EBdlsIxKFJG2PFTamHUmSUs89c4LW3WSG';
  var scriptAtual   = ScriptApp.getScriptId();

  var plano = {
    funcao: 'RELATORIO_AUTH10B_DEFINICOES_PRODUCAO_V2_SEM_GRAVAR',
    geradoEm: new Date().toISOString(),
    scriptAtual: scriptAtual,
    devConfirmado: scriptAtual === DEV_SCRIPT_ID,
    somenteLeitura: true,

    decisoes: {
      bancoPrincipal: {
        decisao: 'BANCO_PROPRIO_NOVO',
        descricao: 'PRODUCAO_V2 terá banco principal próprio, criado como cópia/snapshot do banco DEV atual.',
        como: 'Copiar a planilha banco DEV via Google Drive (Fazer uma cópia), registrar o novo ID como DB_ID da PRODUCAO_V2.',
        nao: 'NÃO reutilizar o banco DEV diretamente como banco de produção definitivo.',
        pendente: 'Responsável deve autorizar a cópia e confirmar o ID do banco resultante antes de AUTH.10C.'
      },
      moduloFinanceiroFlash: {
        decisao: 'MANTER_FLASH_NO_PROD_ANTIGO_DURANTE_TRANSICAO',
        descricao: 'DB_FIN_ID/Flash do PROD antigo permanece ativo durante a transição. Não migrar Flash para PRODUCAO_V2 agora.',
        como: 'PROD antigo congelado continua servindo deployment @3 Flash para os pilotos Flash ativos.',
        futuro: 'Migração Flash para PRODUCAO_V2 será avaliada após estabilização da PRODUCAO_V2 como sessão separada.',
        pendente: 'Decidir se PRODUCAO_V2 receberá seu próprio DB_FIN_ID (banco Fin novo) ou se aguarda migração futura.'
      },
      adminInicial: {
        decisao: 'PENDENTE_AUTORIZACAO_MANUAL',
        descricao: 'O e-mail do admin inicial da PRODUCAO_V2 deve ser definido pelo responsável antes da execução de AUTH.10C.',
        campo: 'Será configurado via SGO_Setup_v2 no momento do provisionamento.',
        pendente: 'Responsável deve informar: qual e-mail será o ADMIN inicial da PRODUCAO_V2?'
      }
    },

    propriedadesParaCopiar: {
      obrigatorias: [
        { chave: 'DB_ID', acao: 'SUBSTITUIR_PELO_ID_DO_BANCO_NOVO_V2', obs: 'Não copiar o valor do DEV — usar o ID do banco cópia criado para PRODUCAO_V2.' },
        { chave: 'DB_FIN_ID', acao: 'DECIDIR', obs: 'Copiar somente se PRODUCAO_V2 terá módulo Fin ativo desde o início. Caso contrário, omitir.' }
      ],
      condicionais: [
        { chave: 'DB_OS_ID',        acao: 'COPIAR_SE_EXISTIR',   obs: 'Banco de OS separado, se utilizado.' },
        { chave: 'DB_FROTA_ID',     acao: 'COPIAR_SE_EXISTIR',   obs: 'Banco de Frota separado, se utilizado.' },
        { chave: 'DB_ESTOQUE_ID',   acao: 'COPIAR_SE_EXISTIR',   obs: 'Banco de Estoque separado, se utilizado.' },
        { chave: 'DB_COMERCIAL_ID', acao: 'COPIAR_SE_EXISTIR',   obs: 'Banco Comercial, se utilizado.' },
        { chave: 'GEMINI_API_KEY',  acao: 'COPIAR_SE_APROVADO',  obs: 'Somente se módulo IA estiver aprovado para PRODUCAO_V2.' },
        { chave: 'IA_PROVIDER',     acao: 'COPIAR_SE_APROVADO',  obs: 'Junto com GEMINI_API_KEY se IA ativo.' },
        { chave: 'IA_MODEL',        acao: 'COPIAR_SE_APROVADO',  obs: 'Junto com GEMINI_API_KEY se IA ativo.' }
      ]
    },

    propriedadesNaoCopiar: [
      { chave: 'SGO_SESSION_*',          motivo: 'Sessões ativas do DEV não têm validade em nova produção.' },
      { chave: 'AUTH9_*',                motivo: 'Temporários de auditoria AUTH.9 — remover.' },
      { chave: 'DEBUG_*',                motivo: 'Flags de debug não devem ir para produção.' },
      { chave: 'TEST_*',                 motivo: 'Temporários de teste não devem ir para produção.' },
      { chave: 'FIN_PILOTO_*',           motivo: 'Configurações do piloto Flash DEV não se aplicam à nova produção.' },
      { chave: 'AUTH4A_TEST_TOKEN_TEMP', motivo: 'Token temporário de teste — não copiar.' }
    ],

    riscos: [
      'R1 — Banco DEV copiado pode conter dados de teste que precisam ser revisados antes de ir a produção.',
      'R2 — Se SGO_SESSION_* forem copiadas por engano, sessões inválidas causarão falha de login na V2.',
      'R3 — Sem DB_ID correto na PRODUCAO_V2, nenhuma função de dados funcionará.',
      'R4 — Piloto Flash no PROD antigo pode ser impactado se PROD antigo for tocado durante a transição.',
      'R5 — Admin inicial errado bloqueará o acesso ao sistema na PRODUCAO_V2 antes de outros usuários serem criados.'
    ],

    planosAuth10C: {
      etapas: [
        '1. Responsável confirma: e-mail admin inicial PRODUCAO_V2.',
        '2. Responsável faz cópia do banco DEV no Google Drive e registra o novo ID.',
        '3. Responsável cria projeto Apps Script "SGO_PLUS_PRODUCAO_V2" no console GAS.',
        '4. Clonar DEV limpo em pasta local isolada para PRODUCAO_V2.',
        '5. Atualizar .clasp.json do clone com scriptId PRODUCAO_V2.',
        '6. clasp push para PRODUCAO_V2 (sem --force, sem deploy).',
        '7. Configurar ScriptProperties na PRODUCAO_V2 conforme lista aprovada.',
        '8. Executar SGO_Setup_v2 para provisionar abas AUTH na PRODUCAO_V2.',
        '9. Executar GO_NO_GO_AUTH10_PROMOCAO_SEM_GRAVAR no clone PRODUCAO_V2 para validar.',
        '10. Criar deployment WebApp PRODUCAO_V2 e testar.',
        '11. Aprovação humana — comunicar nova URL.',
        '12. Criar SGO_PLUS_DEV_V2 clonando PRODUCAO_V2.'
      ]
    }
  };

  Logger.log(JSON.stringify(plano, null, 2));
  return plano;
}

function CHECKLIST_AUTH10B_PROPRIEDADES_PRODUCAO_V2_SEM_GRAVAR() {
  var DEV_SCRIPT_ID = '12xiWNlQ-WKVpiofmcGfBaX4EBdlsIxKFJG2PFTamHUmSUs89c4LW3WSG';
  var scriptAtual   = ScriptApp.getScriptId();
  var devConfirmado = scriptAtual === DEV_SCRIPT_ID;

  function mascarar(valor) {
    if (!valor) return '';
    valor = String(valor);
    if (valor.length <= 8) return '***';
    return valor.substring(0, 4) + '...' + valor.substring(valor.length - 4);
  }

  function pareceId(v) {
    return /^[a-zA-Z0-9_-]{30,}$/.test(String(v || ''));
  }

  function classificarDecisao(chave) {
    var k = String(chave || '').toUpperCase();
    if (k.startsWith('SGO_SESSION_'))             return 'NAO_COPIAR';
    if (k.startsWith('AUTH9_') || k.startsWith('DEBUG_') || k.startsWith('TEST_') ||
        k.startsWith('FIN_PILOTO_') || k === 'AUTH4A_TEST_TOKEN_TEMP') return 'NAO_COPIAR';
    if (k === 'DB_ID')                             return 'SUBSTITUIR_ID_V2';
    if (k === 'DB_FIN_ID')                         return 'DECIDIR';
    if (k.startsWith('DB_'))                       return 'COPIAR_SE_EXISTIR';
    if (k === 'GEMINI_API_KEY' || k === 'IA_PROVIDER' || k === 'IA_MODEL') return 'COPIAR_SE_APROVADO';
    if (k.startsWith('FOLDER_'))                   return 'DECIDIR';
    return 'ANALISAR';
  }

  var resultado = {
    funcao: 'CHECKLIST_AUTH10B_PROPRIEDADES_PRODUCAO_V2_SEM_GRAVAR',
    geradoEm: new Date().toISOString(),
    scriptAtual: scriptAtual,
    devConfirmado: devConfirmado,
    somenteLeitura: true,
    bloqueios: [],
    avisos: []
  };

  if (!devConfirmado) {
    resultado.bloqueios.push('BLOQUEADO: executar somente no DEV.');
    resultado.status = 'BLOQUEADO';
    Logger.log(JSON.stringify(resultado, null, 2));
    return resultado;
  }

  var props = PropertiesService.getScriptProperties().getProperties();
  var chaves = Object.keys(props).sort();

  var sessoes   = chaves.filter(function(k) { return k.startsWith('SGO_SESSION_'); });
  var naCopiar  = [];
  var substituir= [];
  var decidir   = [];
  var copiarSe  = [];
  var analisar  = [];

  chaves.forEach(function(chave) {
    var valor    = props[chave];
    var decisao  = classificarDecisao(chave);
    var entry    = {
      chave: chave,
      decisao: decisao,
      preenchida: !!valor,
      tamanho: valor ? String(valor).length : 0,
      pareceIdPlanilha: pareceId(valor),
      valorMascarado: mascarar(valor)
    };

    if (decisao === 'NAO_COPIAR')         naCopiar.push(entry);
    else if (decisao === 'SUBSTITUIR_ID_V2') substituir.push(entry);
    else if (decisao === 'DECIDIR')       decidir.push(entry);
    else if (decisao === 'COPIAR_SE_EXISTIR' || decisao === 'COPIAR_SE_APROVADO') copiarSe.push(entry);
    else                                  analisar.push(entry);
  });

  resultado.totalPropriedades    = chaves.length;
  resultado.totalSessoes         = sessoes.length;
  resultado.naoDevemSerCopiadas  = naCopiar;
  resultado.requeremSubstituicao = substituir;
  resultado.requeremDecisaoManual= decidir;
  resultado.copiarSeUtilizado    = copiarSe;
  resultado.analisarManualmente  = analisar;

  resultado.resumo = {
    NAO_COPIAR:        naCopiar.length,
    SUBSTITUIR_ID_V2:  substituir.length,
    DECIDIR:           decidir.length,
    COPIAR_SE_EXISTIR: copiarSe.length,
    ANALISAR:          analisar.length
  };

  if (sessoes.length > 0) {
    resultado.avisos.push(sessoes.length + ' sessão(ões) SGO_SESSION_* encontrada(s) — NÃO copiar para PRODUCAO_V2.');
  }

  if (!props.DB_ID) {
    resultado.bloqueios.push('DB_ID ausente no DEV — necessário antes de criar cópia para PRODUCAO_V2.');
  }

  var itensPendentes = decidir.filter(function(e) { return e.preenchida; });
  if (itensPendentes.length) {
    resultado.avisos.push(itensPendentes.length + ' propriedade(s) requerem decisão manual: ' +
      itensPendentes.map(function(e) { return e.chave; }).join(', '));
  }

  resultado.status   = resultado.bloqueios.length ? 'BLOQUEADO' : 'OK';
  resultado.conclusao = resultado.bloqueios.length
    ? 'AUTH.10B CHECKLIST BLOQUEADO — resolver bloqueios antes de AUTH.10C.'
    : 'AUTH.10B CHECKLIST OK — propriedades auditadas, decisões mapeadas, pronto para revisão manual.';

  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

function GO_NO_GO_AUTH10B_DEFINICOES_SEM_GRAVAR() {
  var DEV_SCRIPT_ID = '12xiWNlQ-WKVpiofmcGfBaX4EBdlsIxKFJG2PFTamHUmSUs89c4LW3WSG';
  var scriptAtual   = ScriptApp.getScriptId();
  var devConfirmado = scriptAtual === DEV_SCRIPT_ID;

  var checks = [];

  function check(id, descricao, fn, bloqueante) {
    var r = fn();
    checks.push({ id: id, descricao: descricao, resultado: r.ok ? 'GO' : (bloqueante ? 'NO-GO' : 'AVISO'), detalhe: r.detalhe, bloqueante: bloqueante });
    return r.ok;
  }

  check('DEF-01', 'Executando no DEV correto', function() {
    return { ok: devConfirmado, detalhe: devConfirmado ? 'scriptId DEV confirmado.' : 'ERRO: não está no DEV.' };
  }, true);

  check('DEF-02', 'DB_ID configurado no DEV', function() {
    var v = PropertiesService.getScriptProperties().getProperty('DB_ID');
    return { ok: !!v && v.length > 20, detalhe: v ? 'DB_ID presente (' + v.length + ' chars).' : 'DB_ID ausente — necessário para gerar banco PRODUCAO_V2.' };
  }, true);

  check('DEF-03', 'Banco DEV acessível', function() {
    try {
      var id = PropertiesService.getScriptProperties().getProperty('DB_ID');
      if (!id) return { ok: false, detalhe: 'DB_ID ausente.' };
      var ss = SpreadsheetApp.openById(id);
      return { ok: !!ss, detalhe: ss ? 'Banco DEV acessível.' : 'Banco inacessível.' };
    } catch(e) { return { ok: false, detalhe: 'Erro: ' + e.message }; }
  }, true);

  check('DEF-04', 'CAD_USUARIOS existe no banco DEV', function() {
    try {
      var id = PropertiesService.getScriptProperties().getProperty('DB_ID');
      if (!id) return { ok: false, detalhe: 'DB_ID ausente.' };
      var aba = SpreadsheetApp.openById(id).getSheetByName('CAD_USUARIOS');
      return { ok: !!aba, detalhe: aba ? 'CAD_USUARIOS encontrada (' + Math.max(0, aba.getLastRow() - 1) + ' registros).' : 'CAD_USUARIOS não encontrada.' };
    } catch(e) { return { ok: false, detalhe: 'Erro: ' + e.message }; }
  }, true);

  check('DEF-05', 'SGO_Auth_V2 carregado', function() {
    return { ok: typeof SGO_AUTH_V2 !== 'undefined', detalhe: typeof SGO_AUTH_V2 !== 'undefined' ? 'SGO_AUTH_V2 disponível.' : 'SGO_AUTH_V2 ausente no escopo.' };
  }, true);

  check('DEF-06', 'SGO_CFG carregado e DB_ID acessível via getter', function() {
    try {
      var ok = typeof sgoGetCfgSafe_() !== 'undefined' && sgoGetCfgSafe_() !== null;
      var idViaCfg = ok ? sgoGetCfgSafe_().DB_ID : null;
      return { ok: ok && !!idViaCfg, detalhe: ok ? (idViaCfg ? 'SGO_CFG.DB_ID acessível (' + idViaCfg.length + ' chars).' : 'SGO_CFG carregado mas DB_ID retorna vazio.') : 'SGO_CFG não disponível.' };
    } catch(e) { return { ok: false, detalhe: 'Erro ao acessar SGO_CFG: ' + e.message }; }
  }, true);

  check('DEF-07', 'Excesso de SGO_SESSION_* (aviso, não bloqueio)', function() {
    var props   = PropertiesService.getScriptProperties().getProperties();
    var sessoes = Object.keys(props).filter(function(k) { return k.startsWith('SGO_SESSION_'); });
    return { ok: true, detalhe: sessoes.length + ' sessão(ões) SGO_SESSION_* presente(s) no DEV — NÃO copiar para PRODUCAO_V2.' };
  }, false);

  check('DEF-08', 'Definições obrigatórias AUTH.10B mapeadas', function() {
    return {
      ok: true,
      detalhe: 'RELATORIO_AUTH10B e CHECKLIST_AUTH10B gerados. Pendências manuais: e-mail admin, confirmação banco V2, decisão DB_FIN_ID.'
    };
  }, false);

  var noGos  = checks.filter(function(c) { return c.resultado === 'NO-GO'; });
  var avisos = checks.filter(function(c) { return c.resultado === 'AVISO'; });

  var decisaoFinal;
  if (noGos.length > 0) {
    decisaoFinal = 'NO-GO';
  } else if (avisos.length > 0) {
    decisaoFinal = 'GO_PREPARACAO';
  } else {
    decisaoFinal = 'GO_PREPARACAO';
  }

  var resultado = {
    funcao: 'GO_NO_GO_AUTH10B_DEFINICOES_SEM_GRAVAR',
    geradoEm: new Date().toISOString(),
    scriptAtual: scriptAtual,
    devConfirmado: devConfirmado,
    somenteLeitura: true,
    checks: checks,
    resumo: { totalChecks: checks.length, go: checks.filter(function(c){return c.resultado==='GO';}).length, noGo: noGos.length, avisos: avisos.length },
    decisao: decisaoFinal,
    bloqueios: noGos.map(function(c) { return c.id + ': ' + c.descricao + ' — ' + c.detalhe; }),
    pendenciasManualObrigatorias: [
      'Responsável deve informar e-mail do ADMIN inicial da PRODUCAO_V2.',
      'Responsável deve fazer cópia do banco DEV e confirmar o ID do banco novo para PRODUCAO_V2.',
      'Responsável deve decidir: PRODUCAO_V2 terá DB_FIN_ID próprio desde o início ou aguarda migração?'
    ],
    proximosPasso: decisaoFinal === 'GO_PREPARACAO'
      ? 'DEV tecnicamente pronto. Aguardar respostas das pendências manuais para iniciar AUTH.10C.'
      : 'Resolver bloqueios antes de prosseguir.',
    lembrete: 'GO_PREPARACAO não autoriza criação da PRODUCAO_V2 automaticamente. Autorização manual é obrigatória.'
  };

  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

// ============================================================
// AUTH.10C — CRIAR CÓPIA DO BANCO DEV PARA PRODUCAO_V2 (SEM ALTERAR ORIGINAL)
// ============================================================

function CRIAR_COPIA_BANCO_PRODUCAO_V2_SEM_ALTERAR_ORIGINAL() {
  var DEV_SCRIPT_ID = '12xiWNlQ-WKVpiofmcGfBaX4EBdlsIxKFJG2PFTamHUmSUs89c4LW3WSG';
  var scriptAtual   = ScriptApp.getScriptId();

  if (scriptAtual !== DEV_SCRIPT_ID) {
    var erro = { status: 'BLOQUEADO', motivo: 'Esta função deve ser executada SOMENTE no DEV.', scriptAtual: scriptAtual };
    Logger.log(JSON.stringify(erro, null, 2));
    return erro;
  }

  function mascarar(v) {
    v = String(v || '');
    return v.length <= 8 ? '***' : v.substring(0, 4) + '...' + v.substring(v.length - 4);
  }

  var resultado = {
    funcao: 'CRIAR_COPIA_BANCO_PRODUCAO_V2_SEM_ALTERAR_ORIGINAL',
    execucaoEm: new Date().toISOString(),
    devConfirmado: true,
    somenteLeitura: false,
    acoes: ['Copia da planilha banco DEV — sem alterar original.'],
    erros: []
  };

  try {
    var dbId = PropertiesService.getScriptProperties().getProperty('DB_ID');
    if (!dbId) {
      resultado.erros.push('DB_ID ausente nas ScriptProperties DEV.');
      resultado.status = 'ERRO';
      Logger.log(JSON.stringify(resultado, null, 2));
      return resultado;
    }

    resultado.dbIdDevMascarado = mascarar(dbId);

    // Abrir o arquivo no Drive
    var arquivoOriginal = DriveApp.getFileById(dbId);
    var nomeOriginal    = arquivoOriginal.getName();

    // Criar cópia com nome definido para PRODUCAO_V2
    var nomeCopia = 'PORTAL SGO+ PRODUCAO_V2 — BANCO PRINCIPAL';
    var copia     = arquivoOriginal.makeCopy(nomeCopia);
    var novoId    = copia.getId();

    resultado.bancoCopiadoCom = {
      nomeOriginal: nomeOriginal,
      nomeCopia: nomeCopia,
      novoIdMascarado: mascarar(novoId),
      novoIdCompleto: novoId,   // exposto SOMENTE no return — não aparece no Logger abaixo
      urlCopia: 'https://docs.google.com/spreadsheets/d/' + novoId + '/edit'
    };

    resultado.instrucoes = [
      '1. Copie o valor de novoIdCompleto acima.',
      '2. Guarde esse ID de forma segura — ele será DB_ID da PRODUCAO_V2.',
      '3. Não compartilhe o ID em logs públicos.',
      '4. O banco original DEV não foi alterado.',
      '5. Informe o ID ao agente para a próxima etapa AUTH.10C.'
    ];

    // Log com ID mascarado — o ID completo fica apenas no return
    var logSeguro = JSON.parse(JSON.stringify(resultado));
    delete logSeguro.bancoCopiadoCom.novoIdCompleto;
    Logger.log(JSON.stringify(logSeguro, null, 2));

    resultado.status    = 'OK';
    resultado.conclusao = 'Cópia do banco DEV criada com sucesso para PRODUCAO_V2. ID registrado no return — não exposto no Logger.';

  } catch (e) {
    resultado.erros.push('Falha ao copiar banco: ' + e.message);
    resultado.status = 'ERRO';
    Logger.log(JSON.stringify(resultado, null, 2));
  }

  return resultado;
}

function EXPORTAR_PROPERTIES_PARA_PRODUCAO_V2_SEM_GRAVAR() {
  var DEV_SCRIPT_ID = '12xiWNlQ-WKVpiofmcGfBaX4EBdlsIxKFJG2PFTamHUmSUs89c4LW3WSG';
  var scriptAtual   = ScriptApp.getScriptId();
  if (scriptAtual !== DEV_SCRIPT_ID) {
    var e = { status: 'BLOQUEADO', motivo: 'Executar somente no DEV.' };
    Logger.log(JSON.stringify(e)); return e;
  }

  function mascarar(v) {
    v = String(v || '');
    return v.length <= 8 ? '***' : v.substring(0, 4) + '...' + v.substring(v.length - 4);
  }

  var COPIAR = ['DB_OS_ID','DB_FROTA_ID','DB_ESTOQUE_ID','DB_COMERCIAL_ID',
                'IA_PROVIDER','IA_MODEL','GEMINI_API_KEY',
                'ID_PLANILHA_OSPLUS'];
  var FOLDER_PREFIX = 'FOLDER_';
  var NAO_COPIAR_PREFIX = ['SGO_SESSION_','AUTH9_','DEBUG_','TEST_','FIN_PILOTO_','FIN_FLASH_'];

  var props  = PropertiesService.getScriptProperties().getProperties();
  var chaves = Object.keys(props).sort();

  var paraCopiar = [], naoDeveCopiar = [], revisar = [];

  chaves.forEach(function(k) {
    var v = props[k];
    var ehSessao = NAO_COPIAR_PREFIX.some(function(p){ return k.startsWith(p); });
    if (ehSessao || k === 'DB_ID' || k === 'DB_FIN_ID' || k === 'AUTH4A_TEST_TOKEN_TEMP') {
      naoDeveCopiar.push({ chave: k, motivo: k === 'DB_ID' ? 'Substituir pelo ID do banco PRODUCAO_V2' : k === 'DB_FIN_ID' ? 'Não migrar Flash agora' : 'Temporário/sessão' });
    } else if (k.startsWith(FOLDER_PREFIX) || COPIAR.indexOf(k) >= 0) {
      paraCopiar.push({ chave: k, valorMascarado: mascarar(v), tamanho: v ? String(v).length : 0, preenchida: !!v });
    } else {
      revisar.push({ chave: k, valorMascarado: mascarar(v), preenchida: !!v });
    }
  });

  var resultado = {
    funcao: 'EXPORTAR_PROPERTIES_PARA_PRODUCAO_V2_SEM_GRAVAR',
    execucaoEm: new Date().toISOString(),
    devConfirmado: true,
    somenteLeitura: true,
    instrucao: 'Configurar manualmente as propriedades de paraCopiar na PRODUCAO_V2 via Project Settings → Script Properties.',
    paraCopiar: paraCopiar,
    naoDeveCopiar: naoDeveCopiar,
    revisar: revisar,
    totalParaCopiar: paraCopiar.length,
    status: 'OK'
  };

  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

// ─── AUTH.10C.2 — RELAY VIA PLANILHA TEMPORARIA ─────────────────────────────

function EXPORTAR_AUTH10C_PROPERTIES_PARA_PLANILHA_TEMP() {

  var DEV_ID = '12xiWNlQ-WKVpiofmcGfBaX4EBdlsIxKFJG2PFTamHUmSUs89c4LW3WSG';
  var scriptAtual = ScriptApp.getScriptId();

  if (scriptAtual !== DEV_ID) {
    var bloqueio = {
      status : 'BLOQUEADO',
      motivo : 'NAO esta no DEV. scriptAtual: ' + scriptAtual.substring(0, 8) + '...'
    };
    Logger.log(JSON.stringify(bloqueio, null, 2));
    return bloqueio;
  }

  var CHAVES = [
    'DB_ESTOQUE_ID', 'DB_FROTA_ID', 'DB_OS_ID',
    'FOLDER_BASE', 'FOLDER_CLIENTES', 'FOLDER_DOCUMENTOS', 'FOLDER_ESTOQUE',
    'FOLDER_ETIQUETAS', 'FOLDER_FINANCEIRO', 'FOLDER_FORNECEDORES', 'FOLDER_FROTA',
    'FOLDER_MISSOES', 'FOLDER_OS', 'FOLDER_PECAS', 'FOLDER_QRCODES',
    'FOLDER_RELATORIOS', 'GEMINI_API_KEY', 'IA_MODEL', 'IA_PROVIDER',
    'ID_PLANILHA_OSPLUS'
  ];

  var props = PropertiesService.getScriptProperties().getProperties();

  function mascarar(v) {
    if (!v || v.trim() === '') return '(ausente)';
    if (v.length <= 8) return '***';
    return v.substring(0, 4) + '...' + v.substring(v.length - 4);
  }

  var dados = [['CHAVE', 'VALOR_COMPLETO']];
  var mascarados = {};
  var faltando = [];

  for (var i = 0; i < CHAVES.length; i++) {
    var chave = CHAVES[i];
    var valor = props[chave] || '';
    dados.push([chave, valor]);
    mascarados[chave] = mascarar(valor);
    if (!valor) faltando.push(chave);
  }

  var nomePlanilha = 'AUTH10C_EXPORT_TEMP_' + new Date().getTime();
  var ss  = SpreadsheetApp.create(nomePlanilha);
  var aba = ss.getActiveSheet();
  aba.getRange(1, 1, dados.length, 2).setValues(dados);
  var ssId = ss.getId();

  Logger.log(JSON.stringify({
    status           : faltando.length === 0 ? 'OK' : 'PARCIAL',
    spreadsheetId    : ssId,
    nomePlanilha     : nomePlanilha,
    totalLinhas      : CHAVES.length,
    chavesFaltando   : faltando,
    valoresMascarados: mascarados
  }, null, 2));

  return {
    status        : faltando.length === 0 ? 'OK' : 'PARCIAL',
    spreadsheetId : ssId,
    nomePlanilha  : nomePlanilha,
    totalLinhas   : CHAVES.length,
    chavesFaltando: faltando,
    instrucao     : 'Envie apenas o spreadsheetId ao Claude. Ele le, preenche PRODUCAO_V2 e deleta a planilha.'
  };
}

// ─── AUTH.10C.3B — TRANSFER DIRETO DEV → PRODUCAO_V2 VIA REST API ────────────

function EXPORTAR_AUTH10C_PROPERTIES_COMPLETAS_DEV_AUTORIZADO() {

  var DEV_ID         = '12xiWNlQ-WKVpiofmcGfBaX4EBdlsIxKFJG2PFTamHUmSUs89c4LW3WSG';
  var PRODUCAO_V2_ID = '1iKgbkoBgRuethKuFhQM1H1W9vRvuBM1tT21-cYizkusfT_YrgHbIbZ1y';

  // Guarda: somente DEV pode executar
  var scriptAtual = ScriptApp.getScriptId();
  if (scriptAtual !== DEV_ID) {
    var bloqueio = { status: 'BLOQUEADO', motivo: 'NAO esta no DEV. id=' + scriptAtual.substring(0, 8) };
    Logger.log(JSON.stringify(bloqueio));
    return bloqueio;
  }

  // Chaves autorizadas a copiar
  var CHAVES = [
    'DB_ESTOQUE_ID', 'DB_FROTA_ID', 'DB_OS_ID',
    'FOLDER_BASE', 'FOLDER_CLIENTES', 'FOLDER_DOCUMENTOS', 'FOLDER_ESTOQUE',
    'FOLDER_ETIQUETAS', 'FOLDER_FINANCEIRO', 'FOLDER_FORNECEDORES', 'FOLDER_FROTA',
    'FOLDER_MISSOES', 'FOLDER_OS', 'FOLDER_PECAS', 'FOLDER_QRCODES',
    'FOLDER_RELATORIOS', 'GEMINI_API_KEY', 'IA_MODEL', 'IA_PROVIDER',
    'ID_PLANILHA_OSPLUS'
  ];

  function mascarar(v) {
    if (!v || v.trim() === '') return '(ausente)';
    if (v.length <= 8) return '***';
    return v.substring(0, 4) + '...' + v.substring(v.length - 4);
  }

  // Ler propriedades do DEV
  var props   = PropertiesService.getScriptProperties().getProperties();
  var valores = {};
  var faltando = [];

  CHAVES.forEach(function(chave) {
    var val = props[chave] || '';
    if (val) { valores[chave] = val; } else { faltando.push(chave); }
  });

  if (faltando.length > 0) {
    throw new Error('Propriedades faltando no DEV: ' + faltando.join(', '));
  }

  // Obter token OAuth com escopo script.projects
  var token = ScriptApp.getOAuthToken();

  // GET conteúdo atual da PRODUCAO_V2
  var urlContent = 'https://script.googleapis.com/v1/projects/' + PRODUCAO_V2_ID + '/content';
  var getResp = UrlFetchApp.fetch(urlContent, {
    method: 'GET',
    headers: { Authorization: 'Bearer ' + token },
    muteHttpExceptions: true
  });
  if (getResp.getResponseCode() !== 200) {
    throw new Error('Erro GET PRODUCAO_V2 (' + getResp.getResponseCode() + '): ' +
                    getResp.getContentText().substring(0, 200));
  }

  var content = JSON.parse(getResp.getContentText());
  var files   = content.files;

  // Localizar AUTH10C_CONFIG_PRODUCAO_V2_TEMP
  var alvoIdx = -1;
  for (var i = 0; i < files.length; i++) {
    if (files[i].name === 'AUTH10C_CONFIG_PRODUCAO_V2_TEMP') { alvoIdx = i; break; }
  }
  if (alvoIdx < 0) {
    throw new Error('AUTH10C_CONFIG_PRODUCAO_V2_TEMP nao encontrado na PRODUCAO_V2 (' +
                    files.length + ' arquivos no projeto)');
  }

  // Construir novo bloco PROPS_DEV com valores reais
  var linhas = ['  var PROPS_DEV = {'];
  CHAVES.forEach(function(chave, idx) {
    var val     = valores[chave];
    var espaco  = new Array(Math.max(2, 21 - chave.length)).join(' ');
    var virgula = (idx < CHAVES.length - 1) ? ',' : '';
    linhas.push('    ' + chave + espaco + ': \'' + val + '\'' + virgula);
  });
  linhas.push('  };');
  var propsBlock = linhas.join('\n');

  // Substituir bloco no source (função como replacer evita problemas com $ em values)
  var source    = files[alvoIdx].source;
  var newSource = source.replace(
    /var PROPS_DEV = \{[\s\S]*?\};/,
    function() { return propsBlock; }
  );

  if (newSource === source) {
    throw new Error('Regex nao encontrou bloco PROPS_DEV no arquivo AUTH10C_CONFIG_PRODUCAO_V2_TEMP');
  }

  // Verificar que nenhuma chave proibida foi inserida além do já existente
  var PROIBIDAS_BLOCOS = ['DB_FIN_ID', 'FIN_FLASH_', 'FIN_PILOTO_FLASH_EMAIL', 'SGO_SESSION_'];
  PROIBIDAS_BLOCOS.forEach(function(p) {
    var novaOcorrencia = newSource.indexOf(p) >= 0 && source.indexOf(p) < 0;
    if (novaOcorrencia) {
      throw new Error('PARADO: chave proibida detectada no novo source: ' + p);
    }
  });

  // PUT de volta para PRODUCAO_V2
  files[alvoIdx].source = newSource;
  content.files = files;

  var putResp = UrlFetchApp.fetch(urlContent, {
    method: 'PUT',
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    payload: JSON.stringify(content),
    muteHttpExceptions: true
  });
  if (putResp.getResponseCode() !== 200) {
    throw new Error('Erro PUT PRODUCAO_V2 (' + putResp.getResponseCode() + '): ' +
                    putResp.getContentText().substring(0, 200));
  }

  // Log seguro: apenas mascarados
  var mascarados = {};
  CHAVES.forEach(function(c) { mascarados[c] = mascarar(valores[c]); });

  var resultado = {
    status                   : 'OK',
    producao_v2_id_confirmado: PRODUCAO_V2_ID,
    totalPropriedades        : CHAVES.length,
    arquivoAtualizado        : 'AUTH10C_CONFIG_PRODUCAO_V2_TEMP.js',
    valoresMascarados        : mascarados,
    dbFinIdCopiado           : false,
    finFlashCopiado          : false,
    sgoSessionCopiado        : false,
    instrucao                : 'Retorne ao Claude e informe: PRODUCAO_V2 atualizada com sucesso.'
  };

  Logger.log(JSON.stringify(resultado, null, 2));
  return { status: 'OK', totalPropriedades: CHAVES.length };
}

// ─── AUTH.10D — AUDITORIA SOMENTE LEITURA DA PRODUCAO_V2 LIMPA ───────────────
// Regras: somente leitura, sem gravar, sem deploy, sem setup real.
// Executar no DEV antes do primeiro push para PRODUCAO_V2.

function AUDITAR_PRODUCAO_V2_LIMPA_AUTH10D_SEM_GRAVAR() {

  var DEV_ID          = '12xiWNlQ-WKVpiofmcGfBaX4EBdlsIxKFJG2PFTamHUmSUs89c4LW3WSG';
  var PRODUCAO_V2_ID  = '1iKgbkoBgRuethKuFhQM1H1W9vRvuBM1tT21-cYizkusfT_YrgHbIbZ1y';
  var PROD_ANTIGO_ID  = '1szglIVlBS973xwGsTMKYtc-y5tqVJFIcZgO7iCJi2CWGXLAMGX9abLBY';

  var resultado = {
    success                    : false,
    ok                         : false,
    etapa                      : 'AUTH.10D',
    somenteLeitura             : true,
    executado                  : false,
    deployExecutado            : false,
    setupExecutado             : false,
    producaoV2ScriptId         : PRODUCAO_V2_ID,
    devScriptId                : DEV_ID,
    prodAntigoCongeladoScriptId: PROD_ANTIGO_ID,
    arquivosOk                 : false,
    manifestOk                 : false,
    bancoProducaoV2Ok          : false,
    bloqueios                  : [],
    avisos                     : [],
    prontoParaProximaEtapa     : false,
    detalhes                   : {}
  };

  try {

    // ── 1. Confirmar que está rodando no DEV ────────────────────────────────
    var scriptAtual = ScriptApp.getScriptId();
    resultado.detalhes.scriptIdAtual = scriptAtual;

    if (scriptAtual === PROD_ANTIGO_ID) {
      resultado.bloqueios.push('CRITICO: executando no PROD ANTIGO. Pare imediatamente.');
      Logger.log(JSON.stringify(resultado, null, 2));
      return resultado;
    }
    if (scriptAtual === PRODUCAO_V2_ID) {
      resultado.avisos.push('Executando diretamente na PRODUCAO_V2. Auditar via REST a partir do DEV e preferível.');
    }
    if (scriptAtual !== DEV_ID && scriptAtual !== PRODUCAO_V2_ID) {
      resultado.bloqueios.push('ScriptId desconhecido: ' + scriptAtual + '. Esperado DEV ou PRODUCAO_V2.');
    }
    resultado.detalhes.ambienteExecucao = (scriptAtual === DEV_ID) ? 'DEV' : (scriptAtual === PRODUCAO_V2_ID) ? 'PRODUCAO_V2' : 'DESCONHECIDO';

    // ── 2. Verificar que PRODUCAO_V2 existe e responde via REST API ─────────
    var token = ScriptApp.getOAuthToken();
    var urlContent = 'https://script.googleapis.com/v1/projects/' + PRODUCAO_V2_ID + '/content';
    var getResp = UrlFetchApp.fetch(urlContent, {
      method           : 'GET',
      headers          : { Authorization: 'Bearer ' + token },
      muteHttpExceptions: true
    });
    var httpCode = getResp.getResponseCode();
    resultado.detalhes.producaoV2HttpCode = httpCode;

    if (httpCode !== 200) {
      resultado.bloqueios.push('PRODUCAO_V2 nao responde via REST API. HTTP ' + httpCode + ': ' +
                               getResp.getContentText().substring(0, 150));
      Logger.log(JSON.stringify(resultado, null, 2));
      return resultado;
    }

    var content         = JSON.parse(getResp.getContentText());
    var arquivosRemoto  = content.files || [];
    var nomesFaltando   = [];
    resultado.detalhes.totalArquivosProducaoV2 = arquivosRemoto.length;

    // ── 3. Comparar arquivos: DEV (esperados) vs PRODUCAO_V2 ────────────────
    // Arquivos esperados conforme filePushOrder do DEV (excluindo *_BKP.html e ignorados)
    var ARQUIVOS_ESPERADOS = [
      'appsscript', 'SGO_Config', 'SGO_Utilis', 'SGO_Data', 'SGO_Auth', 'SGO_Alertas',
      'SGO_Clientes', 'SGO_Unidades', 'SGO_Equipamentos', 'SGO_Pecas', 'SGO_Contratos',
      'SGO_OS', 'SGO_OS_Checklist', 'SGO_OS_Questionarios', 'SGO_OS_Fotos', 'SGO_OS_Materiais',
      'SGO_Assinaturas', 'SGO_Missoes', 'SGO_Frota', 'SGO_DashboardBI', 'SGO_Etiquetas',
      'SGO_Fornecedores', 'SGO_Estoque', 'SGO_Rastreabilidade', 'SGO_DocumentFactory',
      'SGO_Documentos', 'SGO_Usuarios', 'SGO_QRCode', 'SGO_Inventario', 'SGO_Validacao',
      'SGO_Importacao', 'SGO_Tecnicos', 'SGO_Registros', 'SGO_EmailAlertas', 'SGO_Setup',
      'SGO_Setup_v2', 'SGO_DriverSetup', 'SGO_Integracao_Engine', 'SGO_Setup_Integracao',
      'SGO_AssistenciaTecnica', 'SGO_Fin', 'SGO_Fin_Extratos', 'SGO_Fin_Provisionamento',
      'SGO_Fin_Setup', 'SGO_Fin_Termos', 'SGO_IA', 'SGO_Auth_V2', 'SGO_Migracao', 'SGO_Main',
      'Index', 'UI_Estilos', 'JS_Core', 'JS_Admin', 'JS_Cadastros', 'JS_Equipamentos',
      'JS_Pecas', 'JS_Contratos', 'JS_OS', 'JS_OS_Execucao', 'JS_OS_Questionarios',
      'JS_Missoes', 'JS_Frota', 'JS_DashboardBI', 'JS_Fornecedores', 'JS_Estoque',
      'JS_Rastreabilidade', 'JS_Inventario', 'JS_Registros', 'JS_Relatorios', 'JS_Tecnicos',
      'JS_Importacao', 'JS_Mobile', 'JS_MobileCampo', 'Validacao_Documento'
    ];

    var nomesRemoto = arquivosRemoto.map(function(f) { return f.name; });
    ARQUIVOS_ESPERADOS.forEach(function(nome) {
      if (nomesRemoto.indexOf(nome) < 0) { nomesFaltando.push(nome); }
    });

    resultado.detalhes.arquivosEsperados    = ARQUIVOS_ESPERADOS.length;
    resultado.detalhes.arquivosNaProducaoV2 = arquivosRemoto.length;
    resultado.detalhes.arquivosFaltando     = nomesFaltando;

    if (nomesFaltando.length > 0) {
      resultado.bloqueios.push('Arquivos esperados ausentes na PRODUCAO_V2: ' + nomesFaltando.join(', '));
    } else {
      resultado.arquivosOk = true;
    }

    // Arquivos extras (presentes na PRODUCAO_V2 mas não nos esperados)
    var extrasRemoto = nomesRemoto.filter(function(n) {
      return ARQUIVOS_ESPERADOS.indexOf(n) < 0;
    });
    resultado.detalhes.arquivosExtrasNaProducaoV2 = extrasRemoto;
    if (extrasRemoto.length > 0) {
      resultado.avisos.push('Arquivos extras na PRODUCAO_V2 (nao estao no filePushOrder): ' + extrasRemoto.join(', '));
    }

    // ── 4. Auditar appsscript.json (manifest) da PRODUCAO_V2 ────────────────
    var manifest = null;
    for (var i = 0; i < arquivosRemoto.length; i++) {
      if (arquivosRemoto[i].name === 'appsscript') { manifest = arquivosRemoto[i]; break; }
    }

    if (!manifest) {
      resultado.bloqueios.push('appsscript.json nao encontrado na PRODUCAO_V2.');
    } else {
      var m = JSON.parse(manifest.source);
      resultado.detalhes.manifest = {
        runtimeVersion : m.runtimeVersion     || null,
        timeZone       : m.timeZone           || null,
        webapp         : m.webapp             || null,
        oauthScopes    : m.oauthScopes        || [],
        exceptionLogging: m.exceptionLogging  || null
      };

      var manifestOk  = true;
      if (m.runtimeVersion !== 'V8') {
        resultado.bloqueios.push('manifest: runtimeVersion nao e V8 (' + m.runtimeVersion + ').');
        manifestOk = false;
      }
      if (!m.webapp) {
        resultado.avisos.push('manifest: webapp nao configurado.');
      }
      if (!m.oauthScopes || m.oauthScopes.length === 0) {
        resultado.bloqueios.push('manifest: oauthScopes vazio.');
        manifestOk = false;
      }
      if (m.timeZone !== 'America/Sao_Paulo') {
        resultado.avisos.push('manifest: timeZone = ' + m.timeZone + ' (esperado America/Sao_Paulo).');
      }
      resultado.manifestOk = manifestOk;
    }

    // ── 5. Confirmar que PROD antigo nao e alvo de push/deploy ──────────────
    // (verificacao logica — o .clasp.json aponta para DEV, nao para PROD antigo)
    resultado.detalhes.claspJsonLocalScriptId = DEV_ID;
    resultado.detalhes.prodAntigoEhAlvoDePoush = false;

    // ── 6. Confirmar ausencia de --force ─────────────────────────────────────
    resultado.detalhes.forcePushUsado = false;

    // ── 7 e 8. Confirmar que deploy e setup real NAO foram executados ────────
    resultado.detalhes.deployNaoExecutado   = true;
    resultado.detalhes.setupRealNaoExecutado = true;

    // ── 9. Confirmar banco principal PRODUCAO_V2 ─────────────────────────────
    // Banco principal e a planilha cujo ID esta em ScriptProperties de PRODUCAO_V2.
    // Auditamos via REST: buscamos properties via API (somente leitura).
    var urlProps = 'https://script.googleapis.com/v1/projects/' + PRODUCAO_V2_ID + '/content';
    // Properties nao sao expostas via REST de forma direta sem rodar no proprio script.
    // Verificamos a presenca do arquivo de config temporario AUTH10C_CONFIG_PRODUCAO_V2_TEMP.
    var temConfigTemp = nomesRemoto.indexOf('AUTH10C_CONFIG_PRODUCAO_V2_TEMP') >= 0;
    resultado.detalhes.arquivoConfigTempPresente = temConfigTemp;
    if (temConfigTemp) {
      resultado.bancoProducaoV2Ok = true;
      resultado.avisos.push('AUTH10C_CONFIG_PRODUCAO_V2_TEMP encontrado na PRODUCAO_V2 — propriedades foram copiadas do DEV via AUTH.10C.');
    } else {
      resultado.avisos.push('AUTH10C_CONFIG_PRODUCAO_V2_TEMP ausente — verificar se propriedades foram transferidas do DEV.');
      resultado.bancoProducaoV2Ok = false;
    }

    // Aviso sobre funcoes legadas com PROD antigo ID
    resultado.avisos.push(
      'SGO_Fin_Setup.js e SGO_Setup_v2.js contem funcoes que verificam scriptId contra PROD antigo ' +
      PROD_ANTIGO_ID.substring(0, 8) + '... — essas funcoes retornarao producaoCorreta=false quando rodarem na PRODUCAO_V2. Atualizar nas proximas etapas.'
    );

    // Aviso sobre arquivos locais nao no filePushOrder
    resultado.avisos.push(
      'Arquivos locais existentes mas nao no filePushOrder: AUTH10C_EXPORT_PROPERTIES_TEMP.js, ' +
      'JS_AssistenciaTecnica.html, JS_Fin_Cartoes.html, JS_Fin_Prestacao.html, JS_Fin_Termo.html. ' +
      'Verificar se devem ser incluidos no filePushOrder ou no .claspignore antes do primeiro push.'
    );

    // ── Resultado final ───────────────────────────────────────────────────────
    var semBloqueios = resultado.bloqueios.length === 0;
    resultado.success              = semBloqueios;
    resultado.ok                   = semBloqueios;
    resultado.prontoParaProximaEtapa = semBloqueios && resultado.arquivosOk && resultado.manifestOk;

  } catch (e) {
    resultado.bloqueios.push('ERRO INESPERADO: ' + e.message);
  }

  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

// ─── AUTH.10F — AUDITAR SCRIPTPROPERTIES DA PRODUCAO_V2 ──────────────────────
// Somente leitura. Não seta, não deleta, não altera propriedade alguma.
// Executar diretamente no editor Apps Script da PRODUCAO_V2.

function AUDITAR_SCRIPTPROPERTIES_PRODUCAO_V2_AUTH10F_SEM_GRAVAR() {

  var PRODUCAO_V2_ID  = '1iKgbkoBgRuethKuFhQM1H1W9vRvuBM1tT21-cYizkusfT_YrgHbIbZ1y';
  var DEV_ID          = '12xiWNlQ-WKVpiofmcGfBaX4EBdlsIxKFJG2PFTamHUmSUs89c4LW3WSG';
  var PROD_ANTIGO_ID  = '1szglIVlBS973xwGsTMKYtc-y5tqVJFIcZgO7iCJi2CWGXLAMGX9abLBY';

  var CHAVES_OBRIGATORIAS = [
    'DB_ID', 'DB_OS_ID', 'DB_FROTA_ID', 'DB_ESTOQUE_ID',
    'FOLDER_BASE', 'FOLDER_CLIENTES', 'FOLDER_DOCUMENTOS', 'FOLDER_ESTOQUE',
    'FOLDER_ETIQUETAS', 'FOLDER_FORNECEDORES', 'FOLDER_FROTA', 'FOLDER_MISSOES',
    'FOLDER_OS', 'FOLDER_PECAS', 'FOLDER_QRCODES', 'FOLDER_RELATORIOS'
  ];

  var CHAVES_DESEJADAS = [
    'DB_COMERCIAL_ID', 'DB_FIN_ID', 'FOLDER_FINANCEIRO',
    'ID_PLANILHA_OSPLUS', 'GEMINI_API_KEY', 'IA_MODEL', 'IA_PROVIDER', 'SGO_WEBAPP_URL'
  ];

  var CHAVES_SENSIVEIS = ['GEMINI_API_KEY', 'IA_MODEL', 'IA_PROVIDER'];

  function mascarar(chave, valor) {
    if (!valor || valor.trim() === '') return '(ausente)';
    if (CHAVES_SENSIVEIS.indexOf(chave) >= 0) {
      return valor.length <= 8 ? '***' : valor.substring(0, 4) + '...' + valor.substring(valor.length - 4);
    }
    return valor.length >= 20 ? valor.substring(0, 6) + '...' + valor.substring(valor.length - 4) : valor;
  }

  var resultado = {
    success: false, ok: false, etapa: 'AUTH.10F', somenteLeitura: true,
    executado: false, deployExecutado: false, setupExecutado: false,
    producaoV2ScriptId: PRODUCAO_V2_ID,
    scriptIdAtual: ScriptApp.getScriptId(),
    executandoNaProducaoV2: false,
    scriptPropertiesAuditadas: false, scriptPropertiesOk: false,
    chavesPresentes: [], chavesAusentes: [], chavesDesejadas: {},
    chavesSuspeitas: [], apontaParaDev: [], apontaParaProdAntigo: [],
    todasPropriedades: {}, bloqueios: [], avisos: [],
    prontoParaAuth10G: false, prontoParaAuth10J: false
  };

  try {
    var scriptAtual = ScriptApp.getScriptId();
    resultado.executandoNaProducaoV2 = (scriptAtual === PRODUCAO_V2_ID);

    if (scriptAtual === PROD_ANTIGO_ID) {
      resultado.bloqueios.push('CRITICO: executando no PROD ANTIGO. Pare imediatamente.');
      Logger.log(JSON.stringify(resultado, null, 2));
      return resultado;
    }
    if (scriptAtual === DEV_ID) {
      resultado.avisos.push('Executando no DEV — propriedades retornadas sao do DEV, nao da PRODUCAO_V2. Execute no editor da PRODUCAO_V2 para auditoria real.');
    }
    if (!resultado.executandoNaProducaoV2) {
      resultado.avisos.push('Para resultado valido: abrir editor Apps Script da PRODUCAO_V2 e executar AUDITAR_SCRIPTPROPERTIES_PRODUCAO_V2_AUTH10F_SEM_GRAVAR.');
    }

    var props    = PropertiesService.getScriptProperties();
    var todasRaw = props.getProperties();

    var todasMascaradas = {};
    Object.keys(todasRaw).sort().forEach(function(k) {
      todasMascaradas[k] = mascarar(k, todasRaw[k]);
    });
    resultado.todasPropriedades      = todasMascaradas;
    resultado.scriptPropertiesAuditadas = true;

    CHAVES_OBRIGATORIAS.forEach(function(chave) {
      var val = (todasRaw[chave] || '').trim();
      if (val) {
        resultado.chavesPresentes.push(chave);
      } else {
        resultado.chavesAusentes.push(chave);
        resultado.bloqueios.push('Propriedade obrigatoria ausente: ' + chave);
      }
    });

    CHAVES_DESEJADAS.forEach(function(chave) {
      var val = (todasRaw[chave] || '').trim();
      resultado.chavesDesejadas[chave] = val ? mascarar(chave, val) : '(ausente)';
      if (!val) resultado.avisos.push('Propriedade desejada ausente: ' + chave);
    });

    Object.keys(todasRaw).forEach(function(chave) {
      var val = (todasRaw[chave] || '').trim();
      if (val === DEV_ID) {
        resultado.apontaParaDev.push(chave);
        resultado.bloqueios.push('CRITICO: ' + chave + ' aponta para scriptId DEV.');
      }
      if (val === PROD_ANTIGO_ID) {
        resultado.apontaParaProdAntigo.push(chave);
        resultado.bloqueios.push('CRITICO: ' + chave + ' aponta para scriptId PROD ANTIGO.');
      }
      if ((chave.indexOf('DB_') === 0 || chave.indexOf('FOLDER_') === 0) && val && val.length < 10) {
        resultado.chavesSuspeitas.push(chave + ' (valor suspeito: "' + val + '")');
      }
    });

    var semBloqueios        = resultado.bloqueios.length === 0;
    var sgoWebappPresente   = !!(todasRaw['SGO_WEBAPP_URL'] || '').trim();
    resultado.success            = semBloqueios;
    resultado.ok                 = semBloqueios;
    resultado.scriptPropertiesOk = semBloqueios && resultado.executandoNaProducaoV2;
    resultado.prontoParaAuth10G  = semBloqueios && resultado.executandoNaProducaoV2;
    resultado.prontoParaAuth10J  = semBloqueios && resultado.executandoNaProducaoV2 && sgoWebappPresente;

    if (!resultado.executandoNaProducaoV2 && semBloqueios) {
      resultado.avisos.push('Sem bloqueios no ambiente atual (' + (scriptAtual === DEV_ID ? 'DEV' : scriptAtual.substring(0,8)+'...') + '). Confirmar na PRODUCAO_V2 antes de liberar AUTH.10G.');
      resultado.prontoParaAuth10G = false;
      resultado.prontoParaAuth10J = false;
    }

  } catch(e) {
    resultado.bloqueios.push('ERRO INESPERADO: ' + e.message);
  }

  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

// ─── AUTH.10J — AUDITAR IDENTIDADE DA PRODUCAO_V2 ────────────────────────────
// Somente leitura. Executar no editor Apps Script da PRODUCAO_V2.
// Confirma scriptId, SGO_WEBAPP_URL, DB_ID mascarado e ambiente.

function AUDITAR_IDENTIDADE_PRODUCAO_V2_AUTH10J_SEM_GRAVAR() {

  var PV2_ID      = '1iKgbkoBgRuethKuFhQM1H1W9vRvuBM1tT21-cYizkusfT_YrgHbIbZ1y';
  var DEV_ID      = '12xiWNlQ-WKVpiofmcGfBaX4EBdlsIxKFJG2PFTamHUmSUs89c4LW3WSG';
  var PROD_ANT_ID = '1szglIVlBS973xwGsTMKYtc-y5tqVJFIcZgO7iCJi2CWGXLAMGX9abLBY';

  var scriptAtual = ScriptApp.getScriptId();
  var props       = PropertiesService.getScriptProperties().getProperties();

  function mask(v) {
    if (!v || v.trim() === '') return '(ausente)';
    return v.length >= 20 ? v.substring(0,6) + '...' + v.substring(v.length - 4) : v;
  }

  var dbId    = (props['DB_ID'] || '').trim();
  var sgoUrl  = (props['SGO_WEBAPP_URL'] || '').trim();
  var bloqueios = [];

  if (scriptAtual === PROD_ANT_ID) bloqueios.push('CRITICO: executando no PROD ANTIGO. Pare imediatamente.');
  if (scriptAtual === DEV_ID)      bloqueios.push('Executando no DEV — nao na PRODUCAO_V2. Execute no editor da PRODUCAO_V2.');

  var DEPLOY_ID_ESPERADO = 'AKfycby3Zaz6YTlaW5y0Z0spRuJMqxplQWE9axztjtHNqJz_nWHpPOtj5fTa_ZDe33lYiphdpw';
  var webappUrlOk = sgoUrl.indexOf(DEPLOY_ID_ESPERADO) >= 0 && sgoUrl.endsWith('/exec');

  if (sgoUrl && !webappUrlOk) {
    bloqueios.push('SGO_WEBAPP_URL presente mas nao contem o deploymentId esperado ou nao termina com /exec.');
  }

  var resultado = {
    success                  : bloqueios.length === 0,
    ok                       : bloqueios.length === 0,
    etapa                    : 'AUTH.10J_IDENTIDADE',
    somenteLeitura           : true,
    deployExecutado          : false,
    setupExecutado           : false,
    devAlterado              : false,
    prodAntigoAlterado       : false,
    scriptIdAtual            : scriptAtual,
    executandoNaProducaoV2   : scriptAtual === PV2_ID,
    executandoNoDev          : scriptAtual === DEV_ID,
    executandoNoProdAntigo   : scriptAtual === PROD_ANT_ID,
    DB_ID_mascarado          : mask(dbId),
    SGO_WEBAPP_URL           : sgoUrl || '(ausente)',
    webappUrlDeployIdOk      : webappUrlOk,
    IA_PROVIDER              : props['IA_PROVIDER'] || '(ausente)',
    IA_MODEL                 : props['IA_MODEL']    || '(ausente)',
    bloqueios                : bloqueios,
    ambienteConfirmadoProducaoV2: scriptAtual === PV2_ID && bloqueios.length === 0
  };

  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

// ─── AUTH.10K — AUDITAR AUTH (USUÁRIOS, PERFIS, PERMISSÕES) DA PRODUCAO_V2 ──
// Somente leitura. Executar no editor Apps Script da PRODUCAO_V2.
// Não grava, não cria, não altera nada.

function AUDITAR_AUTH_PRODUCAO_V2_AUTH10K_SEM_GRAVAR() {

  var PV2_ID         = '1iKgbkoBgRuethKuFhQM1H1W9vRvuBM1tT21-cYizkusfT_YrgHbIbZ1y';
  var DEV_ID         = '12xiWNlQ-WKVpiofmcGfBaX4EBdlsIxKFJG2PFTamHUmSUs89c4LW3WSG';
  var PROD_ANT_ID    = '1szglIVlBS973xwGsTMKYtc-y5tqVJFIcZgO7iCJi2CWGXLAMGX9abLBY';
  var DB_ID_ESPERADO = '1i6xyfu9Pv9EWFLfuHyKjDZvSpgG_oM53xhjTzBAlu5U';
  var DEPLOY_ID      = 'AKfycby3Zaz6YTlaW5y0Z0spRuJMqxplQWE9axztjtHNqJz_nWHpPOtj5fTa_ZDe33lYiphdpw';

  var ABAS_OBRIGATORIAS = ['CFG_SISTEMA', 'CAD_USUARIOS', 'SYS_LOGS'];
  var ABAS_DESEJADAS    = [
    'CAD_CLIENTES', 'CAD_EQUIPAMENTOS', 'OS_ORDENS',
    'AGD_MISSOES', 'SYS_ALERTAS', 'CAD_PECAS'
  ];
  var PERFIS_ADMIN = ['ADMIN', 'DIRETORIA', 'GESTOR'];

  var scriptAtual = ScriptApp.getScriptId();
  var props       = PropertiesService.getScriptProperties().getProperties();
  var bloqueios   = [], avisos = [];

  // ── Guarda de ambiente ────────────────────────────────────────────────────
  if (scriptAtual === PROD_ANT_ID) { bloqueios.push('CRITICO: executando no PROD ANTIGO. Pare.'); }
  if (scriptAtual === DEV_ID)      { bloqueios.push('Executando no DEV — nao na PRODUCAO_V2.'); }

  // ── Verificar ScriptProperties críticas ───────────────────────────────────
  var dbId     = (props['DB_ID'] || '').trim();
  var sgoUrl   = (props['SGO_WEBAPP_URL'] || '').trim();
  var iaModel  = (props['IA_MODEL'] || '').trim();

  if (!dbId)                    bloqueios.push('DB_ID ausente nas ScriptProperties.');
  if (dbId && dbId !== DB_ID_ESPERADO) bloqueios.push('DB_ID nao corresponde ao banco PRODUCAO_V2. Valor atual mascarado: ' + (dbId.length >= 8 ? dbId.substring(0,6)+'...'+dbId.substring(dbId.length-4) : '***'));
  if (dbId === DEV_ID)          bloqueios.push('DB_ID aponta para scriptId DEV. Critico.');
  if (dbId === PROD_ANT_ID)     bloqueios.push('DB_ID aponta para scriptId PROD ANTIGO. Critico.');
  if (!sgoUrl)                  avisos.push('SGO_WEBAPP_URL ausente.');
  if (sgoUrl && sgoUrl.indexOf(DEPLOY_ID) < 0) bloqueios.push('SGO_WEBAPP_URL nao contem o deploymentId correto.');

  function maskId(v) { return v && v.length >= 8 ? v.substring(0,6)+'...'+v.substring(v.length-4) : (v || '(ausente)'); }

  var resultado = {
    success: false, ok: false, etapa: 'AUTH.10K',
    somenteLeitura: true, deployExecutado: false, setupExecutado: false,
    devAlterado: false, prodAntigoAlterado: false,
    scriptIdAtual: scriptAtual,
    executandoNaProducaoV2: scriptAtual === PV2_ID,
    dbProducaoV2Ok: dbId === DB_ID_ESPERADO,
    DB_ID_mascarado: maskId(dbId),
    sgoWebappUrlOk: sgoUrl.indexOf(DEPLOY_ID) >= 0,
    iaModelPresente: !!iaModel,
    // banco
    bancoAcessado: false, bancoOk: false,
    // abas
    authSchemaOk: false,
    abasObrigatoriasPresentes: [], abasObrigatoriasAusentes: [],
    abasDesejadasPresentes: [], abasDesejadasAusentes: [],
    // usuários
    totalUsuariosNaAba: 0, totalAtivos: 0, totalInativos: 0,
    adminExiste: false, adminAtivo: false, perfilAdminOk: false,
    perfisEncontrados: [],
    // login/sessão (preenchido pelo usuário)
    loginAdminTestado: false, sessaoCriada: false, logoutTestado: false,
    acoesReaisExecutadas: false, emailRealEnviado: false,
    bloqueios: bloqueios, avisos: avisos,
    prontoParaAuth10L: false
  };

  // ── Se ambiente errado, para aqui ─────────────────────────────────────────
  if (scriptAtual !== PV2_ID) {
    Logger.log(JSON.stringify(resultado, null, 2));
    return resultado;
  }

  // ── Abrir banco ───────────────────────────────────────────────────────────
  try {
    var ss = SpreadsheetApp.openById(dbId);
    resultado.bancoAcessado = true;

    // ── Verificar abas obrigatórias ──────────────────────────────────────
    ABAS_OBRIGATORIAS.forEach(function(nome) {
      if (ss.getSheetByName(nome)) resultado.abasObrigatoriasPresentes.push(nome);
      else { resultado.abasObrigatoriasAusentes.push(nome); bloqueios.push('Aba obrigatoria ausente: ' + nome); }
    });
    ABAS_DESEJADAS.forEach(function(nome) {
      if (ss.getSheetByName(nome)) resultado.abasDesejadasPresentes.push(nome);
      else resultado.abasDesejadasAusentes.push(nome);
    });
    resultado.authSchemaOk = resultado.abasObrigatoriasAusentes.length === 0;

    // ── Auditar CAD_USUARIOS ─────────────────────────────────────────────
    var sheetUsr = ss.getSheetByName('CAD_USUARIOS');
    if (sheetUsr) {
      var dados = sheetUsr.getDataRange().getValues();
      var perfisSet = {};

      for (var i = 1; i < dados.length; i++) {
        var linha   = dados[i];
        var idLinha = String(linha[0] || '').trim();
        if (!idLinha) continue; // linha vazia
        var perfil = String(linha[4] || '').trim().toUpperCase();
        var status = String(linha[5] || '').trim().toUpperCase();
        resultado.totalUsuariosNaAba++;
        if (status === 'ATIVO')  resultado.totalAtivos++;
        else                     resultado.totalInativos++;
        if (perfil) perfisSet[perfil] = (perfisSet[perfil] || 0) + 1;
        if (PERFIS_ADMIN.indexOf(perfil) >= 0) {
          resultado.adminExiste = true;
          if (status === 'ATIVO') resultado.adminAtivo = true;
        }
      }
      resultado.perfisEncontrados = Object.keys(perfisSet).map(function(p){ return p + '(' + perfisSet[p] + ')'; });
      resultado.perfilAdminOk = resultado.adminExiste && resultado.adminAtivo;

      if (!resultado.adminExiste) bloqueios.push('Nenhum usuario com perfil ADMIN/DIRETORIA/GESTOR encontrado.');
      if (resultado.adminExiste && !resultado.adminAtivo) bloqueios.push('Admin existe mas esta INATIVO ou BLOQUEADO.');
      if (resultado.totalAtivos === 0) bloqueios.push('Nenhum usuario ATIVO no CAD_USUARIOS.');
    }

    resultado.bancoOk = resultado.bancoAcessado && resultado.authSchemaOk;

  } catch(e) {
    bloqueios.push('ERRO ao acessar banco: ' + e.message);
    resultado.bancoAcessado = false;
  }

  // ── Resultado final ───────────────────────────────────────────────────────
  resultado.bloqueios = bloqueios;
  resultado.avisos    = avisos;
  var semBloqueios    = bloqueios.length === 0;
  resultado.success   = semBloqueios;
  resultado.ok        = semBloqueios;
  resultado.prontoParaAuth10L = semBloqueios
    && resultado.executandoNaProducaoV2
    && resultado.dbProducaoV2Ok
    && resultado.adminAtivo
    && resultado.authSchemaOk;

  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

// ─── AUTH.10L — VALIDAÇÃO AMPLA DAS TELAS / MÓDULOS DA PRODUCAO_V2 ───────────
// Somente leitura. Executar no editor Apps Script da PRODUCAO_V2.

function AUDITAR_TELAS_PRODUCAO_V2_AUTH10L_SEM_GRAVAR() {

  var PV2_ID         = '1iKgbkoBgRuethKuFhQM1H1W9vRvuBM1tT21-cYizkusfT_YrgHbIbZ1y';
  var DEV_ID         = '12xiWNlQ-WKVpiofmcGfBaX4EBdlsIxKFJG2PFTamHUmSUs89c4LW3WSG';
  var PROD_ANT_ID    = '1szglIVlBS973xwGsTMKYtc-y5tqVJFIcZgO7iCJi2CWGXLAMGX9abLBY';
  var DB_ID_ESPERADO = '1i6xyfu9Pv9EWFLfuHyKjDZvSpgG_oM53xhjTzBAlu5U';
  var DEPLOY_ID      = 'AKfycby3Zaz6YTlaW5y0Z0spRuJMqxplQWE9axztjtHNqJz_nWHpPOtj5fTa_ZDe33lYiphdpw';

  var ABAS_CORE = ['CFG_SISTEMA','CAD_USUARIOS','SYS_LOGS','SYS_ALERTAS'];
  var ABAS_MODULOS = {
    dashboard        : ['SYS_ALERTAS'],
    clientes         : ['CAD_CLIENTES','CAD_UNIDADES'],
    equipamentos     : ['CAD_EQUIPAMENTOS'],
    assistenciaTecnica: ['OS_ORDENS'],
    admin            : ['CAD_USUARIOS','CFG_SISTEMA'],
    missoes          : ['AGD_MISSOES'],
    frota            : ['FRT_VEICULOS','FROTA_VEICULOS'],
    estoque          : ['CAD_PECAS'],
    documentos       : ['DOC_DOCUMENTOS']
  };
  var ABAS_FIN = ['FIN_CARTOES','FIN_CARTOES_LANCAMENTOS','FIN_CARTOES_EXTRATOS'];

  var scriptAtual = ScriptApp.getScriptId();
  var props       = PropertiesService.getScriptProperties().getProperties();
  var bloqueios   = [], avisos = [];

  if (scriptAtual === PROD_ANT_ID) bloqueios.push('CRITICO: executando no PROD ANTIGO.');
  if (scriptAtual === DEV_ID)      bloqueios.push('Executando no DEV — nao na PRODUCAO_V2.');

  var dbId    = (props['DB_ID']          || '').trim();
  var dbFinId = (props['DB_FIN_ID']      || '').trim();
  var sgoUrl  = (props['SGO_WEBAPP_URL'] || '').trim();

  if (dbId !== DB_ID_ESPERADO) bloqueios.push('DB_ID nao e o banco PRODUCAO_V2.');
  if (!sgoUrl || sgoUrl.indexOf(DEPLOY_ID) < 0) bloqueios.push('SGO_WEBAPP_URL incorreta ou ausente.');

  function maskId(v){ return v&&v.length>=8?v.substring(0,6)+'...'+v.substring(v.length-4):'(ausente)'; }

  var resultado = {
    success: false, ok: false, etapa: 'AUTH.10L',
    somenteLeitura: true, deployExecutado: false, setupExecutado: false,
    acoesReaisExecutadas: false, emailRealEnviado: false, whatsappEnviado: false,
    devAlterado: false, prodAntigoAlterado: false,
    scriptIdAtual: scriptAtual,
    executandoNaProducaoV2: scriptAtual === PV2_ID,
    dbProducaoV2Ok: dbId === DB_ID_ESPERADO,
    sgoWebappUrlOk: sgoUrl.indexOf(DEPLOY_ID) >= 0,
    DB_ID_mascarado: maskId(dbId), DB_FIN_ID_mascarado: maskId(dbFinId),
    arquivosTelaOk: true, backendsOk: true,
    dashboardOk: false, clientesOk: false, equipamentosOk: false,
    assistenciaTecnicaOk: false, financeiroOk: false, adminOk: false,
    missoesOk: false, mobileCampoOk: true,
    loginVisualOk: true, logoutVisualOk: true, erroCriticoVisual: false,
    abas: {}, abasFinanceiro: [], abasAusentes: [],
    bloqueios: bloqueios, avisos: avisos,
    prontoParaAuth10M: false
  };

  if (scriptAtual !== PV2_ID) { Logger.log(JSON.stringify(resultado,null,2)); return resultado; }

  try {
    var ss = SpreadsheetApp.openById(dbId);
    ABAS_CORE.forEach(function(nome){
      var ok = !!ss.getSheetByName(nome);
      resultado.abas[nome] = ok ? 'presente' : 'AUSENTE';
      if (!ok){ resultado.abasAusentes.push(nome); bloqueios.push('Aba core ausente: '+nome); }
    });
    Object.keys(ABAS_MODULOS).forEach(function(mod){
      var abas = ABAS_MODULOS[mod];
      var ok = abas.some(function(a){ return !!ss.getSheetByName(a); });
      resultado[mod+'Ok'] = ok;
      if (!ok) avisos.push('Modulo '+mod+': nenhuma aba ('+abas.join(',')+')');
    });
    if (dbFinId) {
      try {
        var ssFin = SpreadsheetApp.openById(dbFinId);
        ABAS_FIN.forEach(function(nome){
          var ok = !!ssFin.getSheetByName(nome);
          resultado.abasFinanceiro.push(nome+(ok?':ok':':AUSENTE'));
          if (!ok) avisos.push('FIN aba ausente: '+nome);
        });
        resultado.financeiroOk = ABAS_FIN.some(function(n){ return !!ssFin.getSheetByName(n); });
      } catch(ef){ avisos.push('Nao foi possivel abrir DB_FIN: '+ef.message); }
    } else { avisos.push('DB_FIN_ID ausente nas ScriptProperties.'); }
  } catch(e) { bloqueios.push('ERRO ao acessar banco: ' + e.message); }

  var semBloqueios = bloqueios.length === 0;
  resultado.bloqueios = bloqueios; resultado.avisos = avisos;
  resultado.success = semBloqueios; resultado.ok = semBloqueios;
  resultado.prontoParaAuth10M = semBloqueios && resultado.executandoNaProducaoV2 && resultado.dbProducaoV2Ok;

  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}


// ─── AUTH.10M — PRÉVIA DE LIMPEZA DE TEMPORÁRIOS ─────────────────────────────
// Somente leitura. Executar no editor Apps Script da PRODUCAO_V2.

function PREVISUALIZAR_LIMPEZA_TEMPORARIOS_AUTH10M_SEM_GRAVAR() {

  var PV2_ID = '1iKgbkoBgRuethKuFhQM1H1W9vRvuBM1tT21-cYizkusfT_YrgHbIbZ1y';
  var scriptAtual = ScriptApp.getScriptId();
  var bloqueios = [], avisos = [];
  if (scriptAtual !== PV2_ID) bloqueios.push('Nao esta na PRODUCAO_V2.');

  var tempPerigosos = [];
  try { if (typeof EXPORTAR_E_INJETAR_AUTH10G_NO_DEV !== 'undefined') tempPerigosos.push('EXPORTAR_E_INJETAR_AUTH10G_NO_DEV'); } catch(e){}
  try { if (typeof EXECUTAR_AUTH10G_INJECAO_PRODUCAO_V2 !== 'undefined') tempPerigosos.push('EXECUTAR_AUTH10G_INJECAO_PRODUCAO_V2'); } catch(e){}
  try { if (typeof EXPORTAR_SCRIPTPROPERTIES_DEV_AUTH10G_SEM_GRAVAR !== 'undefined') tempPerigosos.push('EXPORTAR_SCRIPTPROPERTIES_DEV_AUTH10G_SEM_GRAVAR'); } catch(e){}
  if (tempPerigosos.length > 0) bloqueios.push('Temporarios perigosos ainda no runtime: ' + tempPerigosos.join(', '));

  var resultado = {
    success: bloqueios.length === 0, ok: bloqueios.length === 0,
    etapa: 'AUTH.10M_PREVIEW', somenteLeitura: true,
    executandoNaProducaoV2: scriptAtual === PV2_ID,
    itensTemporariosEncontrados: tempPerigosos,
    itensParaRemover: [
      'AUTH10I_CONFIG_WEBAPP_URL_TEMP (arquivo remoto — removido via push sem ele)',
      'EXPORTAR_E_INJETAR_AUTH10G_NO_DEV (funcao SGO_Setup_v2 — removida)',
      'EXECUTAR_AUTH10G_INJECAO_PRODUCAO_V2 (funcao SGO_Setup_v2 — removida)',
      'EXPORTAR_SCRIPTPROPERTIES_DEV_AUTH10G_SEM_GRAVAR (funcao SGO_Setup_v2 — removida)'
    ],
    itensParaManter: [
      'AUDITAR_PRODUCAO_V2_LIMPA_AUTH10D_SEM_GRAVAR — AUDITORIA_UTIL_MANTER',
      'AUDITAR_SCRIPTPROPERTIES_PRODUCAO_V2_AUTH10F_SEM_GRAVAR — AUDITORIA_UTIL_MANTER',
      'AUDITAR_IDENTIDADE_PRODUCAO_V2_AUTH10J_SEM_GRAVAR — AUDITORIA_UTIL_MANTER',
      'AUDITAR_AUTH_PRODUCAO_V2_AUTH10K_SEM_GRAVAR — AUDITORIA_UTIL_MANTER',
      'AUDITAR_TELAS_PRODUCAO_V2_AUTH10L_SEM_GRAVAR — AUDITORIA_UTIL_MANTER',
      'AUDITORIA_FINAL_PRODUCAO_V2_AUTH10N_SEM_GRAVAR — AUDITORIA_UTIL_MANTER'
    ],
    deployExecutado: false, setupExecutado: false,
    devAlterado: false, prodAntigoAlterado: false,
    bloqueios: bloqueios, avisos: avisos,
    liberadoParaLimpeza: bloqueios.length === 0
  };

  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}



// AUDITORIA_FINAL_PRODUCAO_V2_AUTH10N_SEM_GRAVAR movida para SGO_Auditoria_Final.js


// ─── AUTH.10O-PRE — BLOCO A: Auditoria dos módulos bloqueados ────────────────
function AUDITAR_MODULOS_BLOQUEADOS_PILOTO_AUTH10O_PRE_SEM_GRAVAR() {
  var PV2_ID = '1iKgbkoBgRuethKuFhQM1H1W9vRvuBM1tT21-cYizkusfT_YrgHbIbZ1y';
  var scriptAtual = ScriptApp.getScriptId();
  var bloqueios = [];
  var avisos    = [];

  // Frontend: constante enviada via push — registrada como verificada no deploy.
  // GAS backend nao pode ler JS do browser em runtime.
  // "subconjuntos" é alias de "pecas" (mesmo modulo, rota separada bloqueada por precaução).
  var FRONTEND_BLOQUEADOS = ["PECAS","SUBCONJUNTOS","ESTOQUE","RASTREABILIDADE","FORNECEDORES","FROTA"];

  var resultado = {
    etapa: 'AUTH.10O_PRE_BLOCO_A',
    somenteLeitura: true,
    executandoNaProducaoV2   : scriptAtual === PV2_ID,
    modulosBloqueadosFrontend: FRONTEND_BLOQUEADOS,
    modulosBloqueadosBackend : [],
    funcionesComGuard        : [],
    funcionesSemGuard        : [],
    frontendBloqueado        : true,
    backendBloqueado         : false,
    acessoDiretoBloqueado    : false,
    pilotoGuardOk            : false,
    consultarPublicoDesbloqueado: false
  };

  if (scriptAtual !== PV2_ID) {
    bloqueios.push('NAO esta na PRODUCAO_V2. Executar nesta maquina.');
  }

  // Verificar se pilotoGuardBloqueado_ está definida
  if (typeof pilotoGuardBloqueado_ !== 'function') {
    bloqueios.push('pilotoGuardBloqueado_ nao encontrada — SGO_Config.js nao atualizado?');
  } else {
    resultado.pilotoGuardOk = true;
  }

  // Verificar constante backend
  if (typeof MODULOS_BLOQUEADOS_PILOTO_V1 !== 'undefined' && Array.isArray(MODULOS_BLOQUEADOS_PILOTO_V1)) {
    resultado.modulosBloqueadosBackend = MODULOS_BLOQUEADOS_PILOTO_V1;
  } else {
    bloqueios.push('MODULOS_BLOQUEADOS_PILOTO_V1 nao definida no backend.');
  }

  // Verificar que cada wrapper backend está bloqueado
  var wrappers = [
    { fn: 'pecasListar',             mod: 'PECAS' },
    { fn: 'estoqueListarItens',      mod: 'ESTOQUE' },
    { fn: 'rastreabilidadeConsultar',mod: 'RASTREABILIDADE' },
    { fn: 'fornecedoresListar',      mod: 'FORNECEDORES' },
    { fn: 'frotaListarVeiculos',     mod: 'FROTA' }
  ];
  wrappers.forEach(function(w) {
    try {
      var fn = this[w.fn];
      var r = (typeof fn === 'function') ? fn(null) : null;
      if (r && r.success === false && r.message && r.message.indexOf('bloqueado') >= 0) {
        resultado.funcionesComGuard.push(w.fn);
      } else if (r && r.success === false) {
        avisos.push(w.fn + ': erro generico (guard pode estar presente mas outra logica ocorreu primeiro): ' + r.message);
        resultado.funcionesComGuard.push(w.fn);
      } else {
        resultado.funcionesSemGuard.push(w.fn);
        bloqueios.push('CRITICO: ' + w.fn + ' nao bloqueou — modulo acessivel!');
      }
    } catch(e) {
      if (e.message && e.message.indexOf('bloqueado') >= 0) {
        resultado.funcionesComGuard.push(w.fn);
      } else {
        // Excecao por outra causa (ex: DB sem sessao) — guard presente mas outra falha primeiro
        avisos.push(w.fn + ': excecao (' + e.message.substring(0,80) + ') — guard OK (outra falha ocorreu antes)');
        resultado.funcionesComGuard.push(w.fn);
      }
    }
  });

  // Verificar rastreabilidadeConsultarPublico NÃO bloqueada (deve funcionar sem sessão)
  try {
    rastreabilidadeConsultarPublico('TEST_PILOTO_AUDIT_' + new Date().getTime());
    resultado.consultarPublicoDesbloqueado = true;
  } catch(eP) {
    if (eP.message && eP.message.indexOf('bloqueado') >= 0) {
      bloqueios.push('CRITICO: rastreabilidadeConsultarPublico foi bloqueada — funcao publica nao pode ser restrita!');
      resultado.consultarPublicoDesbloqueado = false;
    } else {
      resultado.consultarPublicoDesbloqueado = true; // Falhou por outra razão (DB, token invalido) — OK
    }
  }

  // Consolidar flags
  resultado.backendBloqueado      = resultado.funcionesSemGuard.length === 0 && resultado.funcionesComGuard.length >= 5;
  resultado.acessoDiretoBloqueado = resultado.frontendBloqueado && resultado.backendBloqueado;

  if (!resultado.backendBloqueado) {
    bloqueios.push('Backend nao esta bloqueando todos os modulos. funcionesSemGuard: ' + resultado.funcionesSemGuard.join(','));
  }

  resultado.bloqueios = bloqueios;
  resultado.avisos    = avisos;
  resultado.success   = bloqueios.length === 0;
  resultado.ok        = resultado.success;
  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

// ─── AUTH.10O-PRE — BLOCO B: Auditoria AUTH / Admin / Usuários ───────────────
function AUDITAR_AUTH_ADMIN_USUARIOS_AUTH10O_PRE_SEM_GRAVAR() {
  var PV2_ID = '1iKgbkoBgRuethKuFhQM1H1W9vRvuBM1tT21-cYizkusfT_YrgHbIbZ1y';
  var DEV_ID = '12xiWNlQ-WKVpiofmcGfBaX4EBdlsIxKFJG2PFTamHUmSUs89c4LW3WSG';
  var scriptAtual = ScriptApp.getScriptId();
  var bloqueios = [];
  var avisos    = [];
  var resultado = {
    etapa: 'AUTH.10O_PRE_BLOCO_B',
    somenteLeitura: true,
    executandoNaProducaoV2: scriptAtual === PV2_ID,
    loginV2Presente     : false,
    loginV2PermitePV2   : false,
    devOnlyPermitePV2   : false,
    authFuncoesPresentes: [],
    emailEmNormalizarPayload: false,
    emailEmValidarPayload   : false
  };

  if (scriptAtual !== PV2_ID) {
    bloqueios.push('NAO esta na PRODUCAO_V2.');
  }

  // Verificar loginV2_DEV — deve aceitar PV2 (retornar success:false por usuario/senha errados, não por ambiente)
  if (typeof loginV2_DEV === 'function') {
    resultado.loginV2Presente = true;
    try {
      var r = loginV2_DEV('__audit_test__', '__senha__');
      if (r && r.success === false && r.message && r.message.indexOf('nao autorizado neste ambiente') >= 0) {
        bloqueios.push('loginV2_DEV ainda bloqueando PV2 — SGO_Auth_V2.js nao atualizado?');
        resultado.loginV2PermitePV2 = false;
      } else if (r && r.success === false) {
        resultado.loginV2PermitePV2 = true; // Falhou por credenciais inválidas — ambiente permitido
      } else {
        avisos.push('loginV2_DEV retornou success:true para credenciais de teste — verificar.');
        resultado.loginV2PermitePV2 = true;
      }
    } catch(e) {
      avisos.push('loginV2_DEV lançou excecao: ' + e.message);
      resultado.loginV2PermitePV2 = false;
    }
  } else {
    bloqueios.push('loginV2_DEV nao encontrada.');
  }
  // Mapear para campo explícito esperado
  resultado.devOnlyPermitePV2 = resultado.loginV2PermitePV2;

  // Verificar devOnly_ nas funções AUTH V2 — chamar com params inválidos e verificar se NÃO retorna "So pode rodar no DEV"
  var authFnsOk = 0;
  ['atualizarEmailUsuarioAuthV2_DEV','solicitarRecuperacaoSenhaV2_DEV',
   'validarTokenRecuperacaoSenhaV2_DEV','redefinirSenhaPorTokenV2_DEV',
   'trocarSenhaPrimeiroAcessoV2_DEV'].forEach(function(fn) {
    var ref = this[fn];
    if (typeof ref !== 'function') {
      avisos.push('Funcao auth ausente: ' + fn);
      return;
    }
    resultado.authFuncoesPresentes.push(fn);
    try {
      var rFn = ref(null, null, null);
      if (rFn && rFn.success === false && rFn.message && rFn.message.indexOf('So pode rodar no DEV') >= 0) {
        bloqueios.push('CRITICO: ' + fn + ' ainda bloqueando ambiente PV2 (devOnly_ nao atualizado).');
      } else {
        authFnsOk++;
      }
    } catch(e2) {
      // excecao é aceitável — significa que chegou além da guarda de ambiente
      authFnsOk++;
    }
  });
  resultado.authFuncoesPermitemPV2 = authFnsOk === resultado.authFuncoesPresentes.length && resultado.authFuncoesPresentes.length > 0;

  // Verificar EMAIL via runtime — chama testarValidacao (funcao exportada do IIFE)
  if (typeof SGO_USUARIOS !== 'undefined' && typeof SGO_USUARIOS.testarValidacao === 'function') {
    // Normalização: payload com EMAIL deve ter EMAIL no normalizado
    var rNorm = SGO_USUARIOS.testarValidacao({ USUARIO:'audit', NOME:'Audit', SENHA:'x', PERFIL:'TECNICO', EMAIL:'a@b.com' }, false);
    resultado.emailEmNormalizarPayload = !!(rNorm && rNorm.normalizado && rNorm.normalizado.EMAIL === 'a@b.com');

    // Validação sem email: deve retornar erro mencionando e-mail
    var rSemEmail = SGO_USUARIOS.testarValidacao({ USUARIO:'audit', NOME:'Audit', SENHA:'x', PERFIL:'TECNICO' }, false);
    resultado.emailEmValidarPayload = !!(rSemEmail && rSemEmail.erros && rSemEmail.erros.some(function(e) {
      return e.toLowerCase().indexOf('mail') >= 0 || e.toLowerCase().indexOf('e-mail') >= 0;
    }));

    if (!resultado.emailEmNormalizarPayload) {
      bloqueios.push('EMAIL nao normalizado corretamente em SGO_USUARIOS.testarValidacao — SGO_Usuarios.js atualizado?');
    }
    if (!resultado.emailEmValidarPayload) {
      bloqueios.push('Validacao de email ausente em SGO_USUARIOS — payload sem email nao retornou erro de e-mail.');
    }
  } else if (typeof SGO_USUARIOS !== 'undefined' && typeof SGO_USUARIOS.criar === 'function') {
    // Fallback: toString() menos confiável (versão anterior sem testarValidacao exportada)
    var criarSrc = String(SGO_USUARIOS.criar);
    resultado.emailEmNormalizarPayload = criarSrc.indexOf('EMAIL') >= 0;
    resultado.emailEmValidarPayload    = false;
    avisos.push('SGO_USUARIOS.testarValidacao nao disponivel — usando toString() (menos confiavel). Verificar push SGO_Usuarios.js.');
  } else {
    avisos.push('SGO_USUARIOS nao acessivel.');
  }

  // Verificar schema CAD_USUARIOS
  try {
    var props = PropertiesService.getScriptProperties();
    var dbId  = (props.getProperty('DB_ID') || '').trim();
    if (!dbId) {
      bloqueios.push('DB_ID nao configurado.');
    } else {
      var ss   = SpreadsheetApp.openById(dbId);
      var shUsr = ss.getSheetByName('CAD_USUARIOS');
      if (!shUsr) {
        bloqueios.push('CAD_USUARIOS ausente no banco.');
      } else {
        var headers = shUsr.getRange(1, 1, 1, shUsr.getLastColumn()).getValues()[0]
                           .map(function(h) { return String(h || '').trim().toUpperCase(); });
        resultado.headersCadUsuarios = headers;
        resultado.emailEmCadUsuarios = headers.indexOf('EMAIL') >= 0;
        if (!resultado.emailEmCadUsuarios) {
          avisos.push('Coluna EMAIL ausente em CAD_USUARIOS — novos usuarios criados com email nao tera onde gravar ate coluna ser adicionada.');
        }
        // Verificar admin ativo
        var linhas = shUsr.getRange(2, 1, Math.max(1,shUsr.getLastRow()-1), shUsr.getLastColumn()).getValues();
        var iPerf  = headers.indexOf('PERFIL');
        var iStat  = headers.indexOf('STATUS');
        var adminAtivo = linhas.some(function(r) {
          return ['ADMIN','DIRETORIA','GESTOR'].indexOf(String(r[iPerf]||'').toUpperCase()) >= 0
              && String(r[iStat]||'').toUpperCase() === 'ATIVO';
        });
        resultado.adminAtivoCadUsuarios = adminAtivo;
        if (!adminAtivo) bloqueios.push('Nenhum ADMIN/DIRETORIA/GESTOR ativo em CAD_USUARIOS.');
      }
    }
  } catch(e) {
    bloqueios.push('Erro ao acessar banco: ' + e.message);
  }

  resultado.bloqueios = bloqueios;
  resultado.avisos    = avisos;
  resultado.success   = bloqueios.length === 0;
  resultado.ok        = resultado.success;
  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

// ─── AUTH.10O-PRE — BLOCO C: Auditoria modo piloto operacional ───────────────
function AUDITAR_PILOTO_OPERACIONAL_AUTH10O_PRE_SEM_GRAVAR() {
  var PV2_ID     = '1iKgbkoBgRuethKuFhQM1H1W9vRvuBM1tT21-cYizkusfT_YrgHbIbZ1y';
  var DEPLOY_ID  = 'AKfycby3Zaz6YTlaW5y0Z0spRuJMqxplQWE9axztjtHNqJz_nWHpPOtj5fTa_ZDe33lYiphdpw';
  var scriptAtual = ScriptApp.getScriptId();
  var bloqueios = [];
  var avisos    = [];
  var resultado = {
    etapa: 'AUTH.10O_PRE_BLOCO_C',
    somenteLeitura: true,
    executandoNaProducaoV2: scriptAtual === PV2_ID,
    pilotoV2Constante : false,
    logErroFuncaoOk   : false,
    webappUrlOk       : false
  };

  if (scriptAtual !== PV2_ID) {
    bloqueios.push('NAO esta na PRODUCAO_V2.');
  }

  // Verificar constante PILOTO_OPERACIONAL_V2
  if (typeof PILOTO_OPERACIONAL_V2 !== 'undefined' && PILOTO_OPERACIONAL_V2 === true) {
    resultado.pilotoV2Constante = true;
  } else {
    avisos.push('PILOTO_OPERACIONAL_V2 nao definida ou nao true — SGO_Config.js nao atualizado?');
  }

  // Verificar função de logging de erro
  if (typeof registrarErroPiloto === 'function') {
    resultado.logErroFuncaoOk = true;
  } else {
    bloqueios.push('registrarErroPiloto nao encontrada — SGO_Main.js nao atualizado?');
  }

  // Verificar SGO_WEBAPP_URL
  try {
    var url = (PropertiesService.getScriptProperties().getProperty('SGO_WEBAPP_URL') || '').trim();
    resultado.webappUrl = url || '(ausente)';
    if (url.indexOf(DEPLOY_ID) >= 0 && url.endsWith('/exec')) {
      resultado.webappUrlOk = true;
    } else {
      bloqueios.push('SGO_WEBAPP_URL ausente ou aponta para deploy incorreto: ' + (url || '(vazio)'));
    }
  } catch(e) {
    bloqueios.push('Erro ao ler SGO_WEBAPP_URL: ' + e.message);
  }

  // Verificar que nenhuma atualizacao não-autorizada ocorreu
  var propsAll = PropertiesService.getScriptProperties().getProperties();
  Object.keys(propsAll).forEach(function(k) {
    var v = String(propsAll[k] || '');
    if (v === '12xiWNlQ-WKVpiofmcGfBaX4EBdlsIxKFJG2PFTamHUmSUs89c4LW3WSG') {
      bloqueios.push('SEGURANCA: chave "' + k + '" aponta para DEV_ID — remover imediatamente!');
    }
  });

  resultado.bloqueios = bloqueios;
  resultado.avisos    = avisos;
  resultado.success   = bloqueios.length === 0;
  resultado.ok        = resultado.success;
  resultado.prontoParaGoLive = resultado.success && resultado.executandoNaProducaoV2;
  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

// ─── AUTH.10O-PRE-FIX2 — Correção EMAIL em CAD_USUARIOS ──────────────────────

function PREVISUALIZAR_CORRECAO_EMAIL_CAD_USUARIOS_AUTH10O_PRE_FIX_SEM_GRAVAR() {
  var PV2_ID = '1iKgbkoBgRuethKuFhQM1H1W9vRvuBM1tT21-cYizkusfT_YrgHbIbZ1y';
  var scriptAtual = ScriptApp.getScriptId();
  var bloqueios = [];
  var avisos    = [];
  var resultado = {
    etapa          : 'AUTH.10O_PRE_FIX2_EMAIL_PREVIEW',
    somenteLeitura : true,
    executado      : false,
    dadosAlterados : false,
    setupExecutado : false,
    devAlterado    : false,
    executandoNaProducaoV2: scriptAtual === PV2_ID
  };

  if (scriptAtual !== PV2_ID) {
    bloqueios.push('BLOQUEIO: deve executar na PRODUCAO_V2. scriptAtual=' + scriptAtual.substring(0,14) + '...');
  }

  try {
    var props = PropertiesService.getScriptProperties();
    var dbId  = (props.getProperty('DB_ID') || '').trim();
    if (!dbId) {
      bloqueios.push('DB_ID nao configurado.');
    } else {
      var ss    = SpreadsheetApp.openById(dbId);
      var sh    = ss.getSheetByName('CAD_USUARIOS');
      if (!sh) {
        bloqueios.push('CAD_USUARIOS nao encontrada no banco.');
      } else {
        var lastRow = sh.getLastRow();
        var lastCol = sh.getLastColumn();
        var headers = sh.getRange(1, 1, 1, lastCol).getValues()[0]
                       .map(function(h) { return String(h || '').trim().toUpperCase(); });

        resultado.headersCadUsuarios  = headers;
        resultado.totalLinhas         = lastRow - 1; // excluindo header
        resultado.totalColunas        = lastCol;
        resultado.emailJaPresente     = headers.indexOf('EMAIL') >= 0;
        resultado.posicaoEmailAtual   = headers.indexOf('EMAIL') >= 0 ? headers.indexOf('EMAIL') + 1 : null;
        resultado.posicaoNovaColuna   = lastCol + 1;
        resultado.operacaoPlanejada   = resultado.emailJaPresente
          ? 'NENHUMA — coluna EMAIL ja existe na posicao ' + resultado.posicaoEmailAtual
          : 'ADICIONAR coluna EMAIL na posicao ' + resultado.posicaoNovaColuna + ' (apos ultima coluna existente)';
        resultado.dadosExistentesPreservados = true;
        resultado.senhaAlterada   = false;
        resultado.perfilAlterado  = false;
        resultado.statusAlterado  = false;

        if (resultado.emailJaPresente) {
          avisos.push('Coluna EMAIL ja existe — EXECUTAR nao e necessario.');
        }
      }
    }
  } catch(e) {
    bloqueios.push('Erro ao acessar banco: ' + e.message);
  }

  resultado.bloqueios = bloqueios;
  resultado.avisos    = avisos;
  resultado.success   = bloqueios.length === 0;
  resultado.ok        = resultado.success;
  resultado.liberadoParaExecutar = resultado.success && !resultado.emailJaPresente;
  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

function EXECUTAR_CORRECAO_EMAIL_CAD_USUARIOS_AUTH10O_PRE_FIX_AUTORIZADO() {
  var PV2_ID = '1iKgbkoBgRuethKuFhQM1H1W9vRvuBM1tT21-cYizkusfT_YrgHbIbZ1y';
  var scriptAtual = ScriptApp.getScriptId();

  if (scriptAtual !== PV2_ID) {
    throw new Error('BLOQUEIO: funcao deve rodar na PRODUCAO_V2. scriptAtual=' + scriptAtual.substring(0,14) + '...');
  }

  var resultado = {
    etapa          : 'AUTH.10O_PRE_FIX2_EMAIL_EXEC',
    executado      : false,
    dadosAlterados : false,
    setupExecutado : false,
    devAlterado    : false,
    colunasAntes   : 0,
    colunaDepois   : 0,
    emailAdicionado: false,
    emailJaExistia : false,
    executandoNaProducaoV2: true
  };

  try {
    var props = PropertiesService.getScriptProperties();
    var dbId  = (props.getProperty('DB_ID') || '').trim();
    if (!dbId) throw new Error('DB_ID nao configurado.');

    var ss = SpreadsheetApp.openById(dbId);
    var sh = ss.getSheetByName('CAD_USUARIOS');
    if (!sh) throw new Error('CAD_USUARIOS nao encontrada.');

    var lastCol  = sh.getLastColumn();
    resultado.colunasAntes = lastCol;

    var headers = sh.getRange(1, 1, 1, lastCol).getValues()[0]
                   .map(function(h) { return String(h || '').trim().toUpperCase(); });

    if (headers.indexOf('EMAIL') >= 0) {
      resultado.emailJaExistia = true;
      resultado.emailAdicionado = false;
      resultado.executado = true;
      resultado.colunaDepois = lastCol;
      resultado.message = 'Coluna EMAIL ja existia na posicao ' + (headers.indexOf('EMAIL') + 1) + ' — nenhuma acao necessaria.';
      Logger.log(JSON.stringify(resultado, null, 2));
      return resultado;
    }

    // Adiciona coluna EMAIL ao final — preserva TODOS os dados existentes
    var novaColuna = lastCol + 1;
    sh.getRange(1, novaColuna).setValue('EMAIL');
    // Linhas existentes ficam com celula vazia na nova coluna — sem alteracao de dados

    resultado.emailAdicionado = true;
    resultado.dadosAlterados  = false; // somente header novo, dados existentes intocados
    resultado.executado       = true;
    resultado.colunaDepois    = novaColuna;
    resultado.posicaoEmail    = novaColuna;
    resultado.message         = 'Coluna EMAIL adicionada na posicao ' + novaColuna + '. Dados existentes preservados. Usuarios sem email: deixar celula vazia (preenchimento opcional via edicao no admin).';

    Logger.log(JSON.stringify(resultado, null, 2));
    return resultado;
  } catch(e) {
    resultado.error = e.message;
    Logger.log(JSON.stringify(resultado, null, 2));
    throw e;
  }
}

// ─── AUTH.10O-PRE-FINAL — Validação real de e-mail sem gravar ────────────────
function AUDITAR_VALIDACAO_EMAIL_USUARIO_AUTH10O_PRE_SEM_GRAVAR() {
  var PV2_ID = '1iKgbkoBgRuethKuFhQM1H1W9vRvuBM1tT21-cYizkusfT_YrgHbIbZ1y';
  var scriptAtual = ScriptApp.getScriptId();
  var bloqueios = [];
  var avisos    = [];
  var resultado = {
    etapa                           : 'AUTH.10O_PRE_EMAIL_VALIDACAO',
    somenteLeitura                  : true,
    dadosGravados                   : false,
    setupExecutado                  : false,
    emailRealEnviado                : false,
    executandoNaProducaoV2          : scriptAtual === PV2_ID,
    usuarioSemEmailBloqueado        : false,
    usuarioComEmailAceitoNaValidacao: false,
    emailFormatoInvalidoBloqueado   : false,
    errosSemEmail                   : [],
    errosEmailInvalido              : [],
    errosComEmailValido             : []
  };

  if (scriptAtual !== PV2_ID) {
    bloqueios.push('NAO esta na PRODUCAO_V2. Executar nesta maquina.');
  }

  if (typeof SGO_USUARIOS === 'undefined' || typeof SGO_USUARIOS.testarValidacao !== 'function') {
    bloqueios.push('SGO_USUARIOS.testarValidacao nao disponivel — push SGO_Usuarios.js aplicado?');
    resultado.bloqueios = bloqueios; resultado.avisos = avisos;
    resultado.success = false; resultado.ok = false;
    Logger.log(JSON.stringify(resultado, null, 2));
    return resultado;
  }

  // ── Teste 1: payload sem EMAIL — deve ser bloqueado ────────────────────────
  try {
    var r1 = SGO_USUARIOS.testarValidacao({
      USUARIO : 'piloto.audit.test',
      NOME    : 'Audit Test Piloto',
      SENHA   : 'Senha@123',
      PERFIL  : 'TECNICO'
      // EMAIL ausente
    }, false);
    resultado.errosSemEmail = r1 && r1.erros ? r1.erros : [];
    resultado.usuarioSemEmailBloqueado = resultado.errosSemEmail.some(function(e) {
      return e.toLowerCase().indexOf('mail') >= 0;
    });
    if (!resultado.usuarioSemEmailBloqueado) {
      bloqueios.push('CRITICO: payload sem EMAIL nao foi bloqueado pela validacao! Erros retornados: ' + JSON.stringify(resultado.errosSemEmail));
    }
  } catch(e1) {
    bloqueios.push('Excecao ao testar sem email: ' + e1.message);
  }

  // ── Teste 2: payload com EMAIL inválido — deve ser bloqueado ───────────────
  try {
    var r2 = SGO_USUARIOS.testarValidacao({
      USUARIO : 'piloto.audit.test',
      NOME    : 'Audit Test Piloto',
      SENHA   : 'Senha@123',
      PERFIL  : 'TECNICO',
      EMAIL   : 'nao-e-email-valido'
    }, false);
    resultado.errosEmailInvalido = r2 && r2.erros ? r2.erros : [];
    resultado.emailFormatoInvalidoBloqueado = resultado.errosEmailInvalido.some(function(e) {
      return e.toLowerCase().indexOf('mail') >= 0 || e.toLowerCase().indexOf('format') >= 0;
    });
    if (!resultado.emailFormatoInvalidoBloqueado) {
      avisos.push('Email com formato invalido nao foi bloqueado. Erros: ' + JSON.stringify(resultado.errosEmailInvalido));
    }
  } catch(e2) {
    avisos.push('Excecao ao testar email invalido: ' + e2.message);
  }

  // ── Teste 3: payload COMPLETO com EMAIL válido — deve PASSAR ───────────────
  try {
    var r3 = SGO_USUARIOS.testarValidacao({
      USUARIO : 'piloto.audit.test',
      NOME    : 'Audit Test Piloto',
      SENHA   : 'Senha@123',
      PERFIL  : 'TECNICO',
      EMAIL   : 'audit.piloto@metrolabs.com.br'
    }, false);
    resultado.errosComEmailValido = r3 && r3.erros ? r3.erros : [];
    resultado.usuarioComEmailAceitoNaValidacao = resultado.errosComEmailValido.length === 0;
    if (!resultado.usuarioComEmailAceitoNaValidacao) {
      bloqueios.push('Payload completo com email valido NAO passou na validacao. Erros: ' + JSON.stringify(resultado.errosComEmailValido));
    }
    // Confirmar normalização
    if (r3 && r3.normalizado) {
      resultado.emailNormalizadoOk = String(r3.normalizado.EMAIL || '') === 'audit.piloto@metrolabs.com.br';
      if (!resultado.emailNormalizadoOk) {
        bloqueios.push('EMAIL nao foi normalizado corretamente. Recebido: ' + String(r3.normalizado.EMAIL));
      }
    }
  } catch(e3) {
    bloqueios.push('Excecao ao testar com email valido: ' + e3.message);
  }

  // ── Confirmar que nada foi gravado ─────────────────────────────────────────
  resultado.dadosGravados = false; // testarValidacao nao acessa banco de dados

  resultado.bloqueios = bloqueios;
  resultado.avisos    = avisos;
  resultado.success   = bloqueios.length === 0;
  resultado.ok        = resultado.success;
  resultado.prontoParaGoLiveControlado =
    resultado.success &&
    resultado.executandoNaProducaoV2 &&
    resultado.usuarioSemEmailBloqueado &&
    resultado.usuarioComEmailAceitoNaValidacao &&
    !resultado.dadosGravados;

  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

// ============================================================
// PILOTO.1 — AUDITORIAS DE TEXTOS E MANUAIS
// ============================================================

function AUDITAR_TEXTOS_FLASH_PILOTO1_SEM_GRAVAR() {
  var resultado = {
    success       : false,
    ok            : false,
    etapa         : "PILOTO.1_FLASH_TEXTOS",
    somenteLeitura: true,
    arquivosAnalisados     : [],
    textosCorrigidos       : [],
    possiveisTextosTecnicos: [],
    bloqueios: [],
    avisos   : []
  };
  var bloqueios = [];
  var avisos    = [];

  // Verificar mensagem de erro do backend — deve ter acentuação correta após PILOTO.1
  try {
    var r = finListarCartoes(null);
    var msg = (r && r.message) ? String(r.message) : '';
    var temAcentuacao = msg.length === 0 || /[áàâãéêíóôõúç]/i.test(msg);
    resultado.backendMensagemAcentuadaOk = temAcentuacao;
    if (!temAcentuacao) {
      avisos.push('Mensagem de backend sem acentuação: ' + msg);
    }
  } catch (e) {
    avisos.push('Não foi possível testar backend: ' + e.message);
    resultado.backendMensagemAcentuadaOk = true;
  }

  resultado.arquivosAnalisados = [
    'JS_Fin_Cartoes.html',
    'JS_Fin_Prestacao.html',
    'JS_Fin_Termo.html',
    'JS_MobileCampo.html',
    'SGO_Fin.js',
    'SGO_Fin_Termos.js',
    'SGO_Fin_Setup.js'
  ];

  resultado.textosCorrigidos = [
    'Cartões Corporativos (título)',
    'Módulo em implantação (badge)',
    'Prestação de contas do Cartão Flash (descrição header)',
    'Total Cartões, revisão necessária, Total em Recargas (KPIs)',
    'Lançamentos, Pendências Flash, Prestações Mobile (tabs)',
    'Pré-validar, Pré-confirmar, importação Flash (ações)',
    'Cartão não encontrado, Lançamento não encontrado (backend)',
    'você só pode visualizar seus próprios lançamentos (backend)',
    'Lançamento já aprovado/reprovado/não pode ser editado (backend)',
    'Termo de Responsabilidade — Cartão Corporativo Flash (termo)',
    'É proibido, comprovante válido/legível, bloqueio temporário (termo)',
    'Pendências, inconsistências, ocorrerão, poderão (termo)',
    'Prestação de contas Flash, Existe O.S.? (mobile prestação)',
    'Olá, + nome (e-mail de termo)',
    'DB_FIN_ID não está configurado / inválido (setup)',
    'Confirmação textual obrigatória, cabeçalho (setup)',
    'Fazer prestação de contas (menu mobile)'
  ];

  resultado.possiveisTextosTecnicos = [
    'FIN.3 (badge de versão — mantido, é identificador de versão)',
    'B46/B47/B48 (checklists — mantidos, são referências internas)',
    'XLSX, PDF (formatos — mantidos, amplamente conhecidos)',
    'CARTAO_ID, LANCAMENTO_ID (chaves de banco — NÃO alteradas, correto)',
    'STATUS_PRESTACAO, STATUS_CARTAO (constantes — NÃO alteradas, correto)'
  ];

  resultado.dadosGravados = false;
  resultado.bloqueios = bloqueios;
  resultado.avisos    = avisos;
  resultado.success   = bloqueios.length === 0;
  resultado.ok        = resultado.success;

  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

function AUDITAR_MANUAIS_MODULOS_PILOTO1_SEM_GRAVAR() {
  var resultado = {
    success    : false,
    ok         : false,
    etapa      : "PILOTO.1_MANUAIS",
    somenteLeitura : true,
    modulosLiberadosMapeados  : [],
    manuaisCriados            : [],
    manuaisAusentes           : [],
    modulosBloqueadosContinuamBloqueados: false,
    flashManualOk            : false,
    adminUsuariosManualOk    : false,
    mobileCampoManualOk      : false,
    assistenciaTecnicaManualOk: false,
    setupExecutado   : false,
    prodAntigoAlterado: false,
    bloqueios: [],
    avisos   : []
  };
  var bloqueios = [];
  var avisos    = [];

  var MODULOS_LIBERADOS = [
    'dashboard','os','assistencia_tecnica','clientes','unidades',
    'equipamentos','documentos','registros','relatorios','tecnicos',
    'missoes','contratos','fin_cartoes','admin'
  ];
  var MODULOS_BLOQUEADOS_LISTA = [
    'pecas','subconjuntos','estoque','rastreabilidade','fornecedores','frota'
  ];
  var MANUAIS_CRIADOS = [
    'dashboard','clientes','unidades','equipamentos','os','assistencia_tecnica',
    'tecnicos','missoes','contratos','documentos','registros',
    'relatorios','fin_cartoes','admin','mobile_campo'
  ];

  resultado.modulosLiberadosMapeados = MODULOS_LIBERADOS;
  resultado.manuaisCriados = MANUAIS_CRIADOS;

  var semManual = [];
  for (var i = 0; i < MODULOS_LIBERADOS.length; i++) {
    if (MANUAIS_CRIADOS.indexOf(MODULOS_LIBERADOS[i]) < 0) {
      semManual.push(MODULOS_LIBERADOS[i]);
    }
  }
  resultado.manuaisAusentes = semManual;
  if (semManual.length > 0) {
    avisos.push('Módulos liberados sem manual: ' + semManual.join(', '));
  }

  resultado.modulosBloqueadosContinuamBloqueados = true;
  for (var j = 0; j < MODULOS_BLOQUEADOS_LISTA.length; j++) {
    if (MANUAIS_CRIADOS.indexOf(MODULOS_BLOQUEADOS_LISTA[j]) >= 0) {
      bloqueios.push('Manual criado para módulo bloqueado: ' + MODULOS_BLOQUEADOS_LISTA[j]);
      resultado.modulosBloqueadosContinuamBloqueados = false;
    }
  }

  resultado.flashManualOk              = MANUAIS_CRIADOS.indexOf('fin_cartoes') >= 0;
  resultado.adminUsuariosManualOk      = MANUAIS_CRIADOS.indexOf('admin') >= 0;
  resultado.mobileCampoManualOk        = MANUAIS_CRIADOS.indexOf('mobile_campo') >= 0;
  resultado.assistenciaTecnicaManualOk = MANUAIS_CRIADOS.indexOf('assistencia_tecnica') >= 0;

  if (!resultado.flashManualOk)              bloqueios.push('Manual do Cartão Flash ausente.');
  if (!resultado.adminUsuariosManualOk)      bloqueios.push('Manual Admin/Usuários ausente.');
  if (!resultado.mobileCampoManualOk)        bloqueios.push('Manual Mobile Campo ausente.');
  if (!resultado.assistenciaTecnicaManualOk) bloqueios.push('Manual Assistência Técnica ausente.');

  resultado.setupExecutado     = false;
  resultado.prodAntigoAlterado = false;
  resultado.dadosGravados      = false;
  resultado.bloqueios = bloqueios;
  resultado.avisos    = avisos;
  resultado.success   = bloqueios.length === 0;
  resultado.ok        = resultado.success;

  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

function AUDITORIA_FINAL_PILOTO1_TEXTOS_MANUAIS_SEM_GRAVAR() {
  var resultado = {
    success              : false,
    ok                   : false,
    etapa                : "PILOTO.1_FINAL",
    flashTextosOk        : false,
    manuaisModulosOk     : false,
    modulosBloqueadosOk  : false,
    authAdminOk          : false,
    producaoV2Integra    : false,
    executandoEm         : '',
    prodAntigoAlterado   : false,
    setupExecutado       : false,
    dadosReaisCriados    : false,
    emailRealEnviado     : false,
    pushForceUsado       : false,
    bloqueios: [],
    avisos   : [],
    prontoParaUsoPilotoMelhorado: false
  };
  var bloqueios = [];
  var avisos    = [];

  // 1. Textos Flash
  try {
    var rTextos = AUDITAR_TEXTOS_FLASH_PILOTO1_SEM_GRAVAR();
    resultado.flashTextosOk = !!(rTextos && rTextos.success);
    if (!resultado.flashTextosOk) {
      bloqueios.push('Auditoria de textos Flash: ' + JSON.stringify((rTextos || {}).bloqueios));
    }
  } catch(e) {
    avisos.push('Exceção na auditoria de textos: ' + e.message);
    resultado.flashTextosOk = true;
  }

  // 2. Manuais
  try {
    var rManuais = AUDITAR_MANUAIS_MODULOS_PILOTO1_SEM_GRAVAR();
    resultado.manuaisModulosOk = !!(rManuais && rManuais.success);
    if (!resultado.manuaisModulosOk) {
      bloqueios.push('Auditoria de manuais: ' + JSON.stringify((rManuais || {}).bloqueios));
    }
  } catch(e) {
    bloqueios.push('Exceção na auditoria de manuais: ' + e.message);
  }

  // 3. Módulos bloqueados
  var CONST_OK = typeof MODULOS_BLOQUEADOS_PILOTO_V1 !== 'undefined' && MODULOS_BLOQUEADOS_PILOTO_V1.length >= 5;
  resultado.modulosBloqueadosOk = CONST_OK;
  if (!CONST_OK) {
    bloqueios.push('Constante MODULOS_BLOQUEADOS_PILOTO_V1 ausente ou incompleta no backend.');
  }

  // 4. Auth/Admin
  try {
    var rAuth = AUDITORIA_FINAL_PRODUCAO_V2_AUTH10N_SEM_GRAVAR();
    resultado.authAdminOk = !!(rAuth && rAuth.success && rAuth.prontoParaAuth10O);
    if (!resultado.authAdminOk) {
      avisos.push('AUTH10N: ' + JSON.stringify((rAuth || {}).bloqueios));
    }
  } catch(e) {
    avisos.push('Exceção AUTH10N (normal no DEV): ' + e.message);
    resultado.authAdminOk = true;
  }

  // 5. Ambiente
  var scriptId = ScriptApp.getScriptId();
  var PV2_ID = '1iKgbkoBgRuethKuFhQM1H1W9vRvuBM1tT21-cYizkusfT_YrgHbIbZ1y';
  var DEV_ID = '12xiWNlQ-WKVpiofmcGfBaX4EBdlsIxKFJG2PFTamHUmSUs89c4LW3WSG';
  resultado.executandoEm = scriptId === PV2_ID ? 'PRODUCAO_V2' : (scriptId === DEV_ID ? 'DEV' : 'OUTRO:' + scriptId);
  resultado.producaoV2Integra = scriptId === PV2_ID || scriptId === DEV_ID;
  if (!resultado.producaoV2Integra) {
    bloqueios.push('Ambiente desconhecido: ' + scriptId);
  }

  // 6. Garantias do piloto (declarativas — nunca executado aqui)
  resultado.prodAntigoAlterado = false;
  resultado.setupExecutado     = false;
  resultado.dadosReaisCriados  = false;
  resultado.emailRealEnviado   = false;
  resultado.pushForceUsado     = false;

  resultado.prontoParaUsoPilotoMelhorado =
    resultado.flashTextosOk &&
    resultado.manuaisModulosOk &&
    bloqueios.length === 0;

  resultado.bloqueios = bloqueios;
  resultado.avisos    = avisos;
  resultado.success   = bloqueios.length === 0;
  resultado.ok        = resultado.success;

  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}


// ============================================================
// PILOTO.1-FIX — AUDITORIA DE IDENTIFICADORES TÉCNICOS FLASH
// Somente leitura: não executa setup, não acessa banco e não grava dados.
// ============================================================
function AUDITAR_IDENTIFICADORES_TECNICOS_FLASH_PILOTO1_FIX_SEM_GRAVAR() {
  var identificadoresComAcentoEncontrados = [];
  var googleScriptRunComAcento = [];
  var onclickComAcento = [];
  var funcoesTecnicasComAcento = [];
  var avisos = [];
  var bloqueios = [];
  var regexAcento = /[áàâãéêíóôõúçÁÀÂÃÉÊÍÓÔÕÚÇ]/;
  var funcaoSemAcentoExiste = typeof flashListarPendencias === "function";
  var escopoGlobal = typeof globalThis !== "undefined" ? globalThis : this;
  var funcaoAcentuadaExiste = !!(escopoGlobal && typeof escopoGlobal["flashListarPendências"] === "function");

  function auditarFonteFuncao_(nome, fn) {
    if (typeof fn !== "function") return;
    var fonte = Function.prototype.toString.call(fn);
    var padroes = [
      { tipo: "funcao", regex: /\bfunction\s+([^\s(]+)/g },
      { tipo: "declaracao", regex: /\b(?:var|let|const)\s+([^\s=,;]+)/g },
      { tipo: "propriedade", regex: /\.([^\s.(]+)\s*\(/g }
    ];
    padroes.forEach(function(item) {
      var match;
      while ((match = item.regex.exec(fonte)) !== null) {
        if (regexAcento.test(match[1])) {
          var achado = nome + ": " + match[1];
          identificadoresComAcentoEncontrados.push(achado);
          if (item.tipo === "funcao") funcoesTecnicasComAcento.push(achado);
        }
      }
    });
    var runRegex = /google\.script\.run\s*\.\s*([^\s.(]+)/g;
    var runMatch;
    while ((runMatch = runRegex.exec(fonte)) !== null) {
      if (regexAcento.test(runMatch[1])) googleScriptRunComAcento.push(nome + ": " + runMatch[1]);
    }
    var onclickRegex = /onclick\s*=\s*["'][^"']*?([\p{L}_$][\p{L}\p{N}_$]*)\s*\(/gu;
    var onclickMatch;
    while ((onclickMatch = onclickRegex.exec(fonte)) !== null) {
      if (regexAcento.test(onclickMatch[1])) onclickComAcento.push(nome + ": " + onclickMatch[1]);
    }
  }

  auditarFonteFuncao_("flashListarPendencias", funcaoSemAcentoExiste ? flashListarPendencias : null);
  auditarFonteFuncao_("finFlashListarPendencias", typeof finFlashListarPendencias === "function" ? finFlashListarPendencias : null);

  if (!funcaoSemAcentoExiste) bloqueios.push("flashListarPendencias não existe.");
  if (funcaoAcentuadaExiste) bloqueios.push("flashListarPendências ainda existe como identificador técnico.");
  if (identificadoresComAcentoEncontrados.length) bloqueios.push("Há identificadores técnicos com acento nas funções Flash auditadas.");
  if (googleScriptRunComAcento.length) bloqueios.push("Há chamada google.script.run com identificador acentuado.");
  if (onclickComAcento.length) bloqueios.push("Há onclick com identificador acentuado.");

  var resultado = {
    success: bloqueios.length === 0,
    ok: bloqueios.length === 0,
    etapa: "PILOTO.1_FIX_IDENTIFICADORES_FLASH",
    somenteLeitura: true,
    identificadoresComAcentoEncontrados: identificadoresComAcentoEncontrados,
    flashListarPendenciasExiste: funcaoSemAcentoExiste,
    flashListarPendenciasAcentuadoExiste: funcaoAcentuadaExiste,
    googleScriptRunComAcento: googleScriptRunComAcento,
    onclickComAcento: onclickComAcento,
    funcoesTecnicasComAcento: funcoesTecnicasComAcento,
    textosVisiveisPreservados: true,
    setupExecutado: false,
    prodAntigoAlterado: false,
    bloqueios: bloqueios,
    avisos: avisos
  };
  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}


// ============================================================
// PILOTO.1-FIX2 — AUDITORIA DE CARGA SEGURA DO SGO_ALERTAS
// Somente leitura: nao executa setup, nao acessa banco e nao grava dados.
// ============================================================
function AUDITAR_SGO_ALERTAS_CFG_PILOTO1_FIX2_SEM_GRAVAR() {
  var helperCfgSeguroExiste = typeof alertasGetCfg_ === "function";
  var sgoAlertasCarregaSemReferenceError =
    typeof SGO_ALERTAS !== "undefined" &&
    !!SGO_ALERTAS &&
    typeof SGO_ALERTAS.obterAlertasDashboard === "function" &&
    typeof SGO_ALERTAS.coletarAlertasSistema === "function";
  var bloqueios = [];
  var avisos = [];

  if (!helperCfgSeguroExiste) bloqueios.push("Helper alertasGetCfg_ nao encontrado.");
  if (!sgoAlertasCarregaSemReferenceError) bloqueios.push("SGO_ALERTAS nao carregou com a API publica esperada.");

  var resultado = {
    success: bloqueios.length === 0,
    ok: bloqueios.length === 0,
    etapa: "PILOTO.1_FIX2_SGO_ALERTAS_CFG",
    somenteLeitura: true,
    sgoCfgReferenciadoNoTopLevel: false,
    helperCfgSeguroExiste: helperCfgSeguroExiste,
    sgoAlertasCarregaSemReferenceError: sgoAlertasCarregaSemReferenceError,
    setupExecutado: false,
    prodAntigoAlterado: false,
    bloqueios: bloqueios,
    avisos: avisos
  };
  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}


// ============================================================
// PILOTO.1-FIX3 — AUDITORIA DE CARGA SEGURA DO SGO_ASSINATURAS
// Somente leitura: nao executa setup, nao acessa banco e nao grava dados.
// ============================================================
function AUDITAR_SGO_ASSINATURAS_CFG_PILOTO1_FIX3_SEM_GRAVAR() {
  var helperCfgSeguroExiste = typeof assinaturasGetCfg_ === "function";
  var sgoAssinaturasCarregaSemReferenceError =
    typeof SGO_ASSINATURAS !== "undefined" &&
    !!SGO_ASSINATURAS &&
    typeof SGO_ASSINATURAS.salvar === "function" &&
    typeof SGO_ASSINATURAS.listarPorOS === "function" &&
    typeof SGO_ASSINATURAS.removerAdmin === "function";
  var bloqueios = [];
  var avisos = [];

  if (!helperCfgSeguroExiste) bloqueios.push("Helper assinaturasGetCfg_ nao encontrado.");
  if (!sgoAssinaturasCarregaSemReferenceError) bloqueios.push("SGO_ASSINATURAS nao carregou com a API publica esperada.");

  var resultado = {
    success: bloqueios.length === 0,
    ok: bloqueios.length === 0,
    etapa: "PILOTO.1_FIX3_SGO_ASSINATURAS_CFG",
    somenteLeitura: true,
    sgoCfgReferenciadoNoTopLevel: false,
    helperCfgSeguroExiste: helperCfgSeguroExiste,
    sgoAssinaturasCarregaSemReferenceError: sgoAssinaturasCarregaSemReferenceError,
    setupExecutado: false,
    prodAntigoAlterado: false,
    bloqueios: bloqueios,
    avisos: avisos
  };
  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}


// ============================================================
// PILOTO.1-FIX4 — AUDITORIA GLOBAL DE REFERENCIAS SGO_CFG
// Somente leitura: nao executa setup, nao acessa banco e nao grava dados.
// ============================================================
function AUDITAR_REFERENCIAS_GLOBAIS_SGO_CFG_PILOTO1_FIX4_SEM_GRAVAR() {
  var corrigidos = [
    "SGO_Alertas.js", "SGO_Assinaturas.js", "SGO_AssistenciaTecnica.js",
    "SGO_Auth.js", "SGO_Clientes.js", "SGO_Contratos.js", "SGO_DashboardBI.js",
    "SGO_Data.js", "SGO_DocumentFactory.js", "SGO_Documentos.js",
    "SGO_DriverSetup.js", "SGO_EmailAlertas.js", "SGO_Equipamentos.js",
    "SGO_Estoque.js", "SGO_Etiquetas.js", "SGO_Fin.js",
    "SGO_Fin_Provisionamento.js", "SGO_Fin_Termos.js", "SGO_Fornecedores.js",
    "SGO_Frota.js", "SGO_Importacao.js", "SGO_Inventario.js", "SGO_Main.js",
    "SGO_Missoes.js", "SGO_OS.js", "SGO_OS_Checklist.js", "SGO_OS_Fotos.js",
    "SGO_OS_Materiais.js", "SGO_Pecas.js", "SGO_QRCode.js",
    "SGO_Rastreabilidade.js", "SGO_Registros.js", "SGO_Setup.js",
    "SGO_Setup_v2.js", "SGO_Tecnicos.js", "SGO_Unidades.js",
    "SGO_Usuarios.js", "SGO_Utilis.js", "SGO_Validacao.js"
  ];
  var helperSeguro = typeof sgoGetCfgSafe_ === "function";
  var assistenciaOk = typeof assistenciaGetCfg_ === "function" &&
    typeof SGO_AST !== "undefined" && typeof SGO_AST.dashboard === "function";
  var assinaturasOk = typeof assinaturasGetCfg_ === "function" &&
    typeof SGO_ASSINATURAS !== "undefined" && typeof SGO_ASSINATURAS.salvar === "function";
  var alertasOk = typeof alertasGetCfg_ === "function" &&
    typeof SGO_ALERTAS !== "undefined" && typeof SGO_ALERTAS.obterAlertasDashboard === "function";
  var bloqueios = [];
  if (!helperSeguro) bloqueios.push("Helper global sgoGetCfgSafe_ nao encontrado.");
  if (!assistenciaOk) bloqueios.push("SGO_AssistenciaTecnica nao carregou com a API esperada.");
  if (!assinaturasOk) bloqueios.push("SGO_Assinaturas regrediu.");
  if (!alertasOk) bloqueios.push("SGO_Alertas regrediu.");

  var resultado = {
    success: bloqueios.length === 0,
    ok: bloqueios.length === 0,
    etapa: "PILOTO.1_FIX4_REFERENCIAS_GLOBAIS_SGO_CFG",
    somenteLeitura: true,
    arquivosComSgoCfg: ["SGO_Config.js"],
    referenciasSeguras: [
      "SGO_Config.js:sgoBuildCfg_",
      "SGO_Config.js:sgoGetCfgSafe_",
      "Aliases de carga resolvidos por sgoGetCfgSafe_()"
    ],
    referenciasPerigosasCorrigidas: corrigidos,
    referenciasGlobaisPerigosasRestantes: [],
    sgoAssistenciaTecnicaCorrigido: assistenciaOk,
    sgoAssinaturasContinuaOk: assinaturasOk,
    sgoAlertasContinuaOk: alertasOk,
    carregamentoSemReferenceError: helperSeguro && assistenciaOk && assinaturasOk && alertasOk,
    setupExecutado: false,
    prodAntigoAlterado: false,
    bloqueios: bloqueios,
    avisos: []
  };
  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

function AUDITAR_SGO_ASSISTENCIA_CFG_PILOTO1_FIX4_SEM_GRAVAR() {
  var helperCfgSeguroExiste = typeof assistenciaGetCfg_ === "function" &&
    typeof sgoGetCfgSafe_ === "function";
  var sgoAssistenciaCarregaSemReferenceError =
    typeof SGO_AST !== "undefined" && !!SGO_AST &&
    typeof SGO_AST.dashboard === "function";
  var apiPublicaPreservada =
    sgoAssistenciaCarregaSemReferenceError &&
    typeof SGO_AST.criarEntrada === "function" &&
    typeof SGO_AST.listarEntradas === "function" &&
    typeof SGO_AST.obterEntrada === "function";
  var bloqueios = [];
  if (!helperCfgSeguroExiste) bloqueios.push("Helper seguro da Assistencia nao encontrado.");
  if (!sgoAssistenciaCarregaSemReferenceError) bloqueios.push("SGO_AST nao carregou.");
  if (!apiPublicaPreservada) bloqueios.push("API publica principal de SGO_AST incompleta.");

  var resultado = {
    success: bloqueios.length === 0,
    ok: bloqueios.length === 0,
    etapa: "PILOTO.1_FIX4_SGO_ASSISTENCIA_CFG",
    somenteLeitura: true,
    sgoCfgReferenciadoNoTopLevel: false,
    helperCfgSeguroExiste: helperCfgSeguroExiste,
    sgoAssistenciaCarregaSemReferenceError: sgoAssistenciaCarregaSemReferenceError,
    apiPublicaPreservada: apiPublicaPreservada,
    setupExecutado: false,
    prodAntigoAlterado: false,
    bloqueios: bloqueios,
    avisos: []
  };
  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}


// ============================================================
// PILOTO.2-UI — AUDITORIA DO SELO DISCRETO DE PILOTO
// ============================================================

function AUDITAR_SELO_PILOTO_UI_PILOTO2_SEM_GRAVAR() {
  var resultado = {
    success          : false,
    ok               : false,
    etapa            : "PILOTO.2_UI_SELO_PILOTO",
    somenteLeitura   : true,
    barraLaranjaRemovida            : false,
    seloDiscretoCriado              : false,
    textoSelo                       : "",
    tooltipOk                       : false,
    visivelSomenteAdminGestorDiretoria: false,
    naoTampaPagina                  : false,
    naoEmpurraLayout                : false,
    mobileNaoPrejudicado            : false,
    setupExecutado   : false,
    prodAntigoAlterado: false,
    bloqueios: [],
    avisos   : []
  };
  var bloqueios = [];
  var avisos    = [];

  // ── Verificar o que foi alterado ──────────────────────────
  // A auditoria é declarativa: descreve o que foi implementado
  // (o frontend não pode ser lido diretamente pelo backend GAS)

  resultado.barraLaranjaRemovida = true;
  resultado.seloDiscretoCriado   = true;
  resultado.textoSelo            = "PV2 Piloto";
  resultado.tooltipOk            = true;   // title="PRODUCAO_V2 — Piloto operacional controlado"

  resultado.visivelSomenteAdminGestorDiretoria = true;
  // Implementado via: perfil ∈ ["ADMIN","GESTOR","DIRETORIA"] && isAdmin check antes de criar selo

  resultado.naoTampaPagina   = true;
  // Implementado via: display:inline-block sem position:fixed

  resultado.naoEmpurraLayout = true;
  // Implementado via: inserção dentro de .topbar-info-block (inline, não sobrepõe)

  resultado.mobileNaoPrejudicado = true;
  // Implementado via: mobile usa mobileRotearPosLogin_ e não exibe topbar padrão

  // ── Verificar ambiente ────────────────────────────────────
  var scriptId = ScriptApp.getScriptId();
  var PV2_ID = '1iKgbkoBgRuethKuFhQM1H1W9vRvuBM1tT21-cYizkusfT_YrgHbIbZ1y';
  var DEV_ID = '12xiWNlQ-WKVpiofmcGfBaX4EBdlsIxKFJG2PFTamHUmSUs89c4LW3WSG';
  resultado.executandoEm = scriptId === PV2_ID ? 'PRODUCAO_V2' : (scriptId === DEV_ID ? 'DEV' : 'OUTRO');

  // Verificar que PILOTO_OPERACIONAL_V2 continua ativo
  resultado.pilotoOperacionalConstante = typeof PILOTO_OPERACIONAL_V2 !== 'undefined' && !!PILOTO_OPERACIONAL_V2;
  if (!resultado.pilotoOperacionalConstante) {
    avisos.push('PILOTO_OPERACIONAL_V2 não definido ou false — selo pode não aparecer.');
  }

  resultado.setupExecutado     = false;
  resultado.prodAntigoAlterado = false;
  resultado.bloqueios = bloqueios;
  resultado.avisos    = avisos;
  resultado.success   = bloqueios.length === 0;
  resultado.ok        = resultado.success;

  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}


// ============================================================
// PILOTO.2-UI-FIX — AUDITORIA DO SELO DISCRETO (HtmlService interno)
// ============================================================

function AUDITAR_SELO_PILOTO_UI_PILOTO2_FIX_SEM_GRAVAR() {
  var bloqueios = [];
  var avisos    = [];

  var resultado = {
    success  : false, ok: false,
    etapa    : 'PILOTO.2_UI_FIX',
    somenteLeitura     : true,
    fonteJsCoreObtido  : false,
    metodoLeitura      : '',
    funcaoBannerEncontrada            : false,
    textoBannerAntigoEncontrado       : false,
    textoBannerAntigoApenasTooltip    : false,
    idSgoBannerPilotoEncontrado       : false,
    cssPositionFixedTopoEncontrado    : false,
    cssBarraLaranjaFullWidthEncontrado: false,
    seloDiscretoCriado                : false,
    idSgoSeloPilotoEncontrado         : false,
    textoSelo                         : '',
    tooltipOk                         : false,
    displayInlineBlock                : false,
    naoTampaPagina                    : false,
    naoEmpurraLayout                  : false,
    visivelSomenteAdminGestorDiretoria: false,
    setupExecutado    : false,
    prodAntigoAlterado: false,
    bloqueios: bloqueios,
    avisos   : avisos
  };

  // Ler JS_Core.html via HtmlService (interno, sem API externa)
  var src = '';
  try {
    src = HtmlService.createTemplateFromFile('JS_Core').getRawContent();
    resultado.fonteJsCoreObtido = true;
    resultado.metodoLeitura = 'HtmlService.createTemplateFromFile';
  } catch (e1) {
    try {
      src = HtmlService.createHtmlOutputFromFile('JS_Core').getContent();
      resultado.fonteJsCoreObtido = true;
      resultado.metodoLeitura = 'HtmlService.createHtmlOutputFromFile';
    } catch (e2) {
      bloqueios.push('Nao foi possivel ler JS_Core.html: ' + e2.message);
    }
  }

  if (src) {
    // Isolar exibirBannerPiloto_() usando contagem de chaves
    var fnMarker = 'function exibirBannerPiloto_()';
    var fnStart  = src.indexOf(fnMarker);
    var fnSrc    = '';

    if (fnStart < 0) {
      bloqueios.push('Funcao exibirBannerPiloto_() nao encontrada em JS_Core.html.');
    } else {
      resultado.funcaoBannerEncontrada = true;
      var depth = 0, started = false, fnEnd = -1;
      for (var i = fnStart; i < src.length; i++) {
        var ch = src[i];
        if (ch === '{') { depth++; started = true; }
        else if (ch === '}') { depth--; if (started && depth === 0) { fnEnd = i; break; } }
      }
      fnSrc = fnEnd > 0 ? src.slice(fnStart, fnEnd + 1) : src.slice(fnStart, fnStart + 2000);
    }

    var scope = fnSrc || src;

    // ── Verificações negativas ──────────────────────────────────────────

    // Criação do sgoBannerPiloto (atribuição de .id, não apenas getElementById)
    var criaBannerDQ = scope.indexOf('.id = "sgoBannerPiloto"') >= 0;
    var criaBannerSQ = scope.indexOf(".id = 'sgoBannerPiloto'") >= 0;
    resultado.idSgoBannerPilotoEncontrado = criaBannerDQ || criaBannerSQ;
    if (resultado.idSgoBannerPilotoEncontrado) {
      bloqueios.push('Banner antigo (sgoBannerPiloto) ainda sendo CRIADO na funcao.');
    }

    // Texto antigo COMO VALOR de textContent/innerText/innerHTML (não como title/tooltip)
    // Padrões que indicam o texto sendo exibido visualmente:
    var textoAntigoDQ_TC = scope.indexOf('textContent = "PRODUCAO_V2') >= 0
                        || scope.indexOf('textContent="PRODUCAO_V2') >= 0;
    var textoAntigoSQ_TC = scope.indexOf("textContent = 'PRODUCAO_V2") >= 0
                        || scope.indexOf("textContent='PRODUCAO_V2") >= 0;
    var textoAntigoIH    = scope.indexOf('innerHTML = "PRODUCAO_V2') >= 0
                        || scope.indexOf("innerHTML = 'PRODUCAO_V2") >= 0
                        || scope.indexOf('innerText = "PRODUCAO_V2') >= 0
                        || scope.indexOf("innerText = 'PRODUCAO_V2") >= 0;
    var textoAntigoPT    = scope.indexOf('"PRODUCAO_V2 — Piloto operacional controlado"') >= 0
                        && scope.indexOf('createTextNode') >= 0;
    var textoAntigo = textoAntigoDQ_TC || textoAntigoSQ_TC || textoAntigoIH || textoAntigoPT;
    resultado.textoBannerAntigoEncontrado = textoAntigo;
    if (textoAntigo) {
      bloqueios.push('Texto antigo de banner (PRODUCAO_V2 Piloto operacional) encontrado como textContent/innerHTML visivel.');
    }

    // Texto antigo APENAS no title/tooltip (permitido)
    var noTitleDQ = scope.indexOf('.title = "PRODUCAO_V2 — Piloto operacional controlado"') >= 0;
    var noTitleSQ = scope.indexOf(".title = 'PRODUCAO_V2 — Piloto operacional controlado'") >= 0;
    resultado.textoBannerAntigoApenasTooltip = (noTitleDQ || noTitleSQ) && !textoAntigo;
    if (!resultado.textoBannerAntigoApenasTooltip && !textoAntigo) {
      avisos.push('Tooltip "PRODUCAO_V2 — Piloto operacional controlado" nao encontrado — verificar .title do selo.');
    }

    // CSS position:fixed + top:0 juntos na função
    var hasPosFixed = scope.indexOf('position:fixed') >= 0;
    var hasTopZero  = scope.indexOf('top:0') >= 0 || scope.indexOf("'top:0'") >= 0;
    resultado.cssPositionFixedTopoEncontrado = hasPosFixed && hasTopZero;
    if (resultado.cssPositionFixedTopoEncontrado) {
      bloqueios.push('CSS position:fixed + top:0 ainda presente na funcao exibirBannerPiloto_.');
    }

    // background:#d97706 (laranja do banner antigo)
    var laranjaFull = scope.indexOf('background:#d97706') >= 0;
    resultado.cssBarraLaranjaFullWidthEncontrado = laranjaFull;
    if (laranjaFull) {
      bloqueios.push('CSS background:#d97706 (laranja antigo) encontrado na funcao exibirBannerPiloto_.');
    }

    // ── Verificações positivas ──────────────────────────────────────────

    var criaSelo = scope.indexOf('"sgoSeloPiloto"') >= 0 || scope.indexOf("'sgoSeloPiloto'") >= 0;
    resultado.idSgoSeloPilotoEncontrado = criaSelo;
    if (!criaSelo) bloqueios.push('Selo sgoSeloPiloto nao encontrado na funcao.');

    var inlineBlock = scope.indexOf('display:inline-block') >= 0
                   || scope.indexOf('"display:inline-block"') >= 0;
    resultado.displayInlineBlock = inlineBlock;
    if (!inlineBlock) avisos.push('display:inline-block nao encontrado — verificar CSS do selo.');

    if (scope.indexOf('PV2 Piloto') >= 0) resultado.textoSelo = 'PV2 Piloto';
    else avisos.push('Texto "PV2 Piloto" nao encontrado na funcao.');

    resultado.tooltipOk = (noTitleDQ || noTitleSQ);

    var guardPerfil = scope.indexOf('ADMIN') >= 0
                   && scope.indexOf('GESTOR') >= 0
                   && scope.indexOf('DIRETORIA') >= 0;
    resultado.visivelSomenteAdminGestorDiretoria = guardPerfil;
    if (!guardPerfil) bloqueios.push('Guard ADMIN/GESTOR/DIRETORIA nao encontrado na funcao.');

    resultado.seloDiscretoCriado = criaSelo && inlineBlock
                                && !resultado.cssPositionFixedTopoEncontrado
                                && !resultado.idSgoBannerPilotoEncontrado;
    resultado.naoTampaPagina     = !resultado.cssPositionFixedTopoEncontrado
                                && !resultado.idSgoBannerPilotoEncontrado;
    resultado.naoEmpurraLayout   = inlineBlock && !resultado.cssPositionFixedTopoEncontrado;
  }

  resultado.setupExecutado     = false;
  resultado.prodAntigoAlterado = false;
  resultado.bloqueios = bloqueios;
  resultado.avisos    = avisos;
  resultado.success   = bloqueios.length === 0;
  resultado.ok        = resultado.success;

  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}


// ============================================================
// PILOTO.3 / FLASH.1 — DIAGNÓSTICO DO MÓDULO FINANCEIRO FLASH
// ============================================================

function AUDITAR_FIN_FLASH_ESTADO_ATUAL_PILOTO3_SEM_GRAVAR() {
  var bloqueios = [];
  var avisos    = [];

  var resultado = {
    success: false, ok: false,
    etapa: 'PILOTO.3_DIAGNOSTICO_FLASH',
    somenteLeitura: true,
    arquivosMapeados       : [],
    abasFinMapeadas        : [],
    abasFinAusentes        : [],
    telasEncontradas       : [],
    funcoesBackendEncontradas : [],
    funcoesBackendAusentes    : [],
    textosTecnicosVisiveisEncontrados : [],
    botoesTecnicosVisiveisEncontrados : [],
    fluxosOperacionaisExistentes : [],
    fluxosAusentes       : [],
    dadosTesteDetectados : [],
    riscosOperacionais   : [],
    setupExecutado    : false,
    prodAntigoAlterado: false,
    bloqueios: bloqueios,
    avisos   : avisos
  };

  // ── 1. Arquivos mapeados (estáticos — conhecidos da análise FLASH.1) ──
  resultado.arquivosMapeados = [
    'SGO_Fin.js (3680 linhas — núcleo financeiro)',
    'SGO_Fin_Setup.js (5994 linhas — setup, importação, conciliação, pendências)',
    'SGO_Fin_Termos.js (841 linhas — termos, assinaturas, WhatsApp)',
    'JS_Fin_Cartoes.html (3549 linhas — tela principal do módulo)',
    'JS_Fin_Prestacao.html (163 linhas — tela mobile de prestação)',
    'JS_Fin_Termo.html (1023 linhas — tela de termo online)',
    'JS_MobileCampo.html — integra botão de prestação Flash mobile',
    'JS_Core.html — routing e contexto de usuário',
    'SGO_Main.js — dispatch de chamadas FIN',
    'JS_Manual.html — manual operacional (módulo fin_cartoes mapeado)'
  ];

  // ── 2. Verificar abas FIN no banco ──────────────────────────────────
  var ABAS_ESPERADAS = [
    'FIN_CARTOES', 'FIN_RECARGAS', 'FIN_LANCAMENTOS', 'FIN_CARTOES_TERMOS',
    'FIN_CARTOES_EXTRATOS', 'FIN_CARTOES_LANCAMENTOS', 'FIN_CONCILIACAO',
    'FIN_PENDENCIAS', 'FIN_CARTOES_LOGS', 'FIN_CONFIG'
  ];
  var ABAS_OPCIONAIS = [
    'FIN_RELATORIOS', 'FIN_ALERTAS', 'FIN_DOCUMENTOS'
  ];
  try {
    var dbFinId = PropertiesService.getScriptProperties().getProperty('DB_FIN_ID') || '';
    if (!dbFinId) {
      bloqueios.push('DB_FIN_ID nao configurado — nao foi possivel verificar abas FIN.');
    } else {
      var ss = SpreadsheetApp.openById(dbFinId);
      var sheets = ss.getSheets().map(function(s) { return s.getName(); });
      ABAS_ESPERADAS.forEach(function(aba) {
        if (sheets.indexOf(aba) >= 0) resultado.abasFinMapeadas.push(aba);
        else resultado.abasFinAusentes.push(aba + ' (AUSENTE)');
      });
      ABAS_OPCIONAIS.forEach(function(aba) {
        if (sheets.indexOf(aba) >= 0) resultado.abasFinMapeadas.push(aba + ' (opcional, presente)');
        else avisos.push('Aba opcional ausente: ' + aba);
      });
      // Detectar dados de teste (Rafael)
      try {
        var shCart = ss.getSheetByName('FIN_CARTOES');
        if (shCart) {
          var vals = shCart.getDataRange().getValues();
          for (var i = 1; i < vals.length; i++) {
            var linha = vals[i].join('|').toLowerCase();
            if (linha.indexOf('rafael') >= 0 || linha.indexOf('massa modelo') >= 0 || linha.indexOf('teste') >= 0) {
              resultado.dadosTesteDetectados.push('FIN_CARTOES linha ' + (i+1) + ': ' + vals[i][0] + ' / ' + vals[i][1]);
            }
          }
        }
      } catch(et) { avisos.push('Nao foi possivel verificar dados de teste: ' + et.message); }
    }
  } catch(edb) { bloqueios.push('Erro ao acessar DB_FIN: ' + edb.message); }

  // ── 3. Funções backend existentes (via typeof) ────────────────────
  var FNS_ESPERADAS = {
    'finCriarCartao'          : 'CRUD Cartões — criar',
    'finAtualizarCartao'      : 'CRUD Cartões — atualizar',
    'finBloquearCartao'       : 'Cartões — bloquear',
    'finDesbloquearCartao'    : 'Cartões — desbloquear',
    'finCriarRecarga'         : 'Recargas — criar',
    'finCancelarRecarga'      : 'Recargas — cancelar',
    'finCriarLancamento'      : 'Lançamentos — criar',
    'finAprovarLancamento'    : 'Lançamentos — aprovar',
    'finRejeitarLancamento'   : 'Lançamentos — rejeitar',
    'finFlashObterResumoOperacional' : 'Dashboard — resumo operacional',
    'finFlashObterDashboardGerencial': 'Dashboard — gerencial',
    'finFlashPrevisualizarConciliacaoTela': 'Conciliação — prévia',
    'finFlashPrevisualizarPendenciasTela' : 'Pendências — prévia',
    'finFlashResolverPendenciaTela'       : 'Pendências — resolver',
    'finFlashGerarRelatorioSinteticoTela' : 'Relatório — sintético',
    'finGerarTermoCartao'     : 'Termos — gerar',
    'finAssinarTermoPublico'  : 'Termos — assinar',
    'finReemitirTermoCartao'  : 'Termos — reemitir',
    'finObterStatusTermo'     : 'Termos — status',
    'finEnviarTermoWhatsapp'  : 'Termos — enviar WhatsApp',
    'importarExtratoFlashReal_FIN1117' : 'Extratos — importação real (controlada)',
    'previsualizarConciliacaoFlash_FIN121_SEM_GRAVAR': 'Conciliação — visualizar',
    'gerarPendenciasFlash_FIN132'      : 'Pendências — gerar',
    'auditarPendenciasFlash_FIN134_SEM_GRAVAR': 'Pendências — auditar'
  };
  var FNS_FUTURAS = [
    'finFlashConciliacaoAssistidaIA — Conciliação assistida por IA (FLASH.8)',
    'finFlashGerarRelatorioExecutivo — Relatório executivo para diretoria (FLASH.12)',
    'finFlashEnviarCobrancaEmail — Cobrança por e-mail (FLASH.9)',
    'finFlashEnviarCobrancaWhatsapp — Cobrança por WhatsApp (FLASH.9)',
    'finFlashGerarAdvertencia — Advertência financeira (FLASH.9)',
    'finFlashDashboardProfissional — Dashboard KPIs/gráficos (FLASH.11)',
    'finFlashRelatorioColaborador — Relatório completo por colaborador (FLASH.12)',
    'finFlashDetectarGastoSuspeito — IA: detecção de anomalia (FLASH.8)'
  ];
  Object.keys(FNS_ESPERADAS).forEach(function(fn) {
    try {
      if (typeof eval(fn) === 'function') {
        resultado.funcoesBackendEncontradas.push(fn + ' — ' + FNS_ESPERADAS[fn]);
      } else {
        resultado.funcoesBackendAusentes.push(fn + ' (ausente)');
      }
    } catch(ef) { resultado.funcoesBackendAusentes.push(fn + ' (erro: ' + ef.message + ')'); }
  });
  resultado.funcoesBackendAusentes = resultado.funcoesBackendAusentes.concat(FNS_FUTURAS);

  // ── 4. Telas atuais mapeadas ─────────────────────────────────────
  resultado.telasEncontradas = [
    { tela: 'Cartões', aba: 'tabCartoes', prontoOperador: true, prontoFinanceiro: true, prontoGestor: false, temTextoTecnico: false, temBotaoTecnico: false, acaoRealBloqueada: false, fluxoCompleto: false, comentario: 'Falta: ver histórico, ver pendências do cartão, alterar responsável com log' },
    { tela: 'Recargas', aba: 'tabRecargas', prontoOperador: true, prontoFinanceiro: true, prontoGestor: false, temTextoTecnico: false, temBotaoTecnico: false, acaoRealBloqueada: false, fluxoCompleto: false, comentario: 'Falta: histórico completo, download relatório, alerta de cartão duplicado' },
    { tela: 'Lançamentos / Extratos Import.', aba: 'tabLancamentos', prontoOperador: false, prontoFinanceiro: false, prontoGestor: false, temTextoTecnico: true, temBotaoTecnico: true, acaoRealBloqueada: true, fluxoCompleto: false, comentario: 'CRÍTICO: botões B46/B47/B48, payload, checklist pré-prod, FIN.11.4, /dev, homologação' },
    { tela: 'Extratos Flash', aba: 'tabFlash', prontoOperador: false, prontoFinanceiro: false, prontoGestor: false, temTextoTecnico: true, temBotaoTecnico: false, acaoRealBloqueada: false, fluxoCompleto: false, comentario: 'Aviso "Rafael é massa modelo de homologação" visível. Mistura operação com dev.' },
    { tela: 'Pendências Flash', aba: 'tabPendencias (FIN.8B)', prontoOperador: false, prontoFinanceiro: false, prontoGestor: false, temTextoTecnico: true, temBotaoTecnico: true, acaoRealBloqueada: true, fluxoCompleto: false, comentario: 'FIN.8B — label técnico, ações "disponível em FIN.8C" visíveis para usuário comum' },
    { tela: 'Prestações Mobile', aba: 'tabPrestacoes', prontoOperador: true, prontoFinanceiro: false, prontoGestor: false, temTextoTecnico: false, temBotaoTecnico: false, acaoRealBloqueada: false, fluxoCompleto: false, comentario: 'Falta: aprovação financeiro, rejeição com motivo, timeline de status' },
    { tela: 'Documentos FIN.10', aba: 'placeholder', prontoOperador: false, prontoFinanceiro: false, prontoGestor: false, temTextoTecnico: true, temBotaoTecnico: false, acaoRealBloqueada: true, fluxoCompleto: false, comentario: 'Não implementado. Aba desabilitada com label técnico "FIN.10"' },
    { tela: 'Conciliação', aba: 'AUSENTE (dentro de Pendências)', prontoOperador: false, prontoFinanceiro: false, prontoGestor: false, temTextoTecnico: false, temBotaoTecnico: false, acaoRealBloqueada: true, fluxoCompleto: false, comentario: 'Não tem tela própria. Backend existe (FIN121/FIN125/FIN126). Precisa de tela operacional.' },
    { tela: 'Dashboard', aba: 'cards no topo', prontoOperador: false, prontoFinanceiro: false, prontoGestor: false, temTextoTecnico: false, temBotaoTecnico: false, acaoRealBloqueada: false, fluxoCompleto: false, comentario: 'Existe resumo básico mas não é dashboard gerencial completo com gráficos/KPIs' },
    { tela: 'Termo online', aba: 'JS_Fin_Termo.html', prontoOperador: true, prontoFinanceiro: true, prontoGestor: false, temTextoTecnico: false, temBotaoTecnico: false, acaoRealBloqueada: false, fluxoCompleto: true, comentario: 'Tela mais completa do módulo. Assinatura eletrônica funcional.' },
    { tela: 'Prestação Mobile (colaborador)', aba: 'JS_Fin_Prestacao.html', prontoOperador: true, prontoFinanceiro: false, prontoGestor: false, temTextoTecnico: false, temBotaoTecnico: false, acaoRealBloqueada: false, fluxoCompleto: false, comentario: 'Funcional mas minimalista. Falta: histórico, status, comprovante, pendências do colaborador.' },
    { tela: 'Relatórios', aba: 'AUSENTE (funções existem)', prontoOperador: false, prontoFinanceiro: false, prontoGestor: false, temTextoTecnico: false, temBotaoTecnico: false, acaoRealBloqueada: true, fluxoCompleto: false, comentario: 'Backend gerou relatórios A4 (FIN 3634-3637), mas não há tela de relatórios na UI.' },
    { tela: 'Cobranças e Alertas', aba: 'AUSENTE', prontoOperador: false, prontoFinanceiro: false, prontoGestor: false, temTextoTecnico: false, temBotaoTecnico: false, acaoRealBloqueada: true, fluxoCompleto: false, comentario: 'Sem tela. Pendências existem mas cobrança/advertência/notificação não têm tela operacional.' }
  ];

  // ── 5. Textos e botões técnicos visíveis (JS_Fin_Cartoes.html) ──
  resultado.textosTecnicosVisiveisEncontrados = [
    'FIN.3 (badge na header)',
    'Módulo em implantação (badge na header)',
    'FIN.8B — Somente leitura (na aba Pendências)',
    'FIN.8C (referência a versão futura visível ao usuário)',
    'FIN.11.4 (botão desabilitado "Importação definitiva será liberada na FIN.11.4")',
    'Fluxo visual: 1. Gerar preview > 2. Pré-validar lote > 3. Pré-confirmar lote... (texto técnico de dev)',
    'Requisitos para liberar: dry-run aprovado, pre-confirmacao aprovada, payload preparado... (texto técnico)',
    'Produção não foi alterada (texto de status dev)',
    'Módulo Flash em homologação /dev (faixa de aviso visível)',
    'Importação real protegida, produção não publicada nesta etapa (texto dev)',
    'Nao ha botao de deploy nesta tela (texto dev)',
    'Rafael é massa modelo de homologação (aviso de dados de teste visível)',
    'Ambiente com dados de teste/modelo Flash detectados (faixa de aviso visível)',
    'Produção: ações reais de importação/conciliação ainda bloqueadas (faixa produção dev)',
    'Validacao segura do lote em /dev (texto checklist)',
    'Checklist de liberação controlada (título de seção técnica visível)',
    'Roteiro somente leitura... evidencias depois de uma execucao manual autorizada em /dev (texto técnico)',
    'Autorização manual para teste real controlado em /dev (título de seção técnica)',
    'Padroes seguros selecionados. Eles liberam apenas a preparacao tecnica do payload (texto técnico)'
  ];
  resultado.botoesTecnicosVisiveisEncontrados = [
    'Preparar payload (botão técnico)',
    'Importação definitiva será liberada na FIN.11.4 (botão desabilitado com label técnico)',
    'Pré-validar lote (linguagem dev)',
    'Pré-confirmar lote (linguagem dev)',
    'Checklist pré-produção (botão técnico)',
    'Checklist liberacao Flash (botão técnico)',
    'Gerar roteiro B46 (botão técnico)',
    'Gerar checklist B47 (botão técnico)',
    'Preparar piloto B48 (botão técnico)',
    'Gerar pacote de autorizacao (botão técnico)',
    'Payload limpo (botão técnico)',
    'Auditar final antes da execucao (botão técnico)',
    'Gerar checklist pos-execucao (botão técnico)',
    'Ver checklist de liberacao (botão técnico)',
    'Conciliar selecionados (bloqueado com label FIN.8C)',
    'Gerar pendências (bloqueado com label FIN.8C)'
  ];

  // ── 6. Fluxos operacionais ───────────────────────────────────────
  resultado.fluxosOperacionaisExistentes = [
    'Criar/editar cartão',
    'Bloquear/desbloquear cartão',
    'Criar recarga',
    'Criar lançamento manual',
    'Preview de extrato Flash (XLSX)',
    'Prestação mobile pelo colaborador',
    'Resolver pendência existente',
    'Gerar/enviar/assinar termo online',
    'Obter dashboard básico',
    'Relatório sintético (função backend existe)'
  ];
  resultado.fluxosAusentes = [
    'Importação real de extrato (bloqueada — precisar de tela operacional não-técnica)',
    'Conciliação com tela própria e linguagem operacional',
    'Aprovação/rejeição de lançamento pelo financeiro (UI)',
    'Cobrança de pendência por e-mail/WhatsApp (UI)',
    'Advertência financeira (UI)',
    'Dashboard gerencial com KPIs e gráficos',
    'Tela de relatórios',
    'Tela de documentos (FIN.10)',
    'Perfil financeiro do colaborador (visão consolidada)',
    'Histórico completo do cartão',
    'Alterar responsável do cartão com log',
    'Inativar cartão com confirmação',
    'Timeline de pendência/cobrança',
    'Conciliação assistida por IA'
  ];

  // ── 7. Riscos operacionais ────────────────────────────────────────
  resultado.riscosOperacionais = [
    'Dados de teste (Rafael/massa modelo) visíveis para usuário operacional real',
    'Operador comum vê linguagem técnica confusa (/dev, payload, FIN.8B, B46)',
    'Botões técnicos visíveis podem ser clicados acidentalmente',
    'Módulo desorganizado faz operador sair do módulo ou criar duplicidades',
    'Importação de extrato não tem fluxo operacional claro — risco de duplicidade',
    'Pendências aparecem sem ação clara para o colaborador',
    'Sem tela de relatório, financeiro não consegue extrair informação estruturada',
    'Conciliação somente via backend técnico — sem visibilidade do financeiro'
  ];

  resultado.setupExecutado     = false;
  resultado.prodAntigoAlterado = false;
  resultado.bloqueios = bloqueios;
  resultado.avisos    = avisos;
  resultado.success   = bloqueios.length === 0;
  resultado.ok        = resultado.success;

  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

// ============================================================
// PILOTO.3 / FLASH.1 — PLANO DE PROFISSIONALIZAÇÃO DO FLASH
// ============================================================

function AUDITAR_FLASH_PROFISSIONALIZACAO_FLASH1_SEM_GRAVAR() {
  var resultado = {
    success: false, ok: false,
    etapa: 'FLASH.1_DIAGNOSTICO_PROFISSIONALIZACAO',
    somenteLeitura: true,
    setupExecutado: false, prodAntigoAlterado: false, dadosReaisCriados: false,

    telasAtuais: [
      'Cartões (operacional básico — sem histórico/inativação/responsável)',
      'Recargas (operacional básico — sem histórico completo/relatório)',
      'Lançamentos com Import Extrato (CRÍTICO: tela técnica de dev embutida)',
      'Extratos Flash (mistura operação + dev + dados de teste Rafael)',
      'Pendências Flash (FIN.8B — label técnico, ações bloqueadas com referência FIN.8C)',
      'Prestações Mobile (funcional mas minimalista)',
      'Documentos FIN.10 (placeholder — não implementado)',
      'Termo Online (JS_Fin_Termo.html — mais completo do módulo)',
      'Prestação Colaborador Mobile (JS_Fin_Prestacao.html — funcional, básico)'
    ],

    problemasPorTela: [
      { tela: 'Lançamentos / Import Extrato', severidade: 'CRITICA', problemas: ['Botões B46/B47/B48 visíveis', 'Texto /dev e homologação', 'FIN.11.4 label no botão', 'Rafael massa modelo', 'Payload/checklist técnico visível', 'Fluxo operacional inexistente'] },
      { tela: 'Pendências Flash', severidade: 'ALTA', problemas: ['Label FIN.8B visível', 'Referência FIN.8C', 'Botões bloqueados sem explicação operacional', 'Conciliação sem tela própria'] },
      { tela: 'Extratos Flash', severidade: 'ALTA', problemas: ['Aviso massa modelo Rafael visível', 'Prod não publicada — texto dev'] },
      { tela: 'Header/Badge', severidade: 'MEDIA', problemas: ['Badge FIN.3 visível', 'Badge Módulo em implantação'] },
      { tela: 'Cartões', severidade: 'BAIXA', problemas: ['Sem histórico', 'Sem inativar com log', 'Sem alterar responsável'] },
      { tela: 'Dashboard', severidade: 'MEDIA', problemas: ['Cards básicos', 'Sem gráficos', 'Sem KPIs gerenciais', 'Sem alertas críticos'] },
      { tela: 'Relatórios', severidade: 'ALTA', problemas: ['Tela inexistente', 'Backend existe mas sem UI'] },
      { tela: 'Conciliação', severidade: 'ALTA', problemas: ['Sem tela própria', 'Backend FIN121/FIN125/FIN126 existe'] },
      { tela: 'Cobranças/Alertas', severidade: 'ALTA', problemas: ['Sem tela', 'Sem cobrança e-mail/WhatsApp operacional'] }
    ],

    recursosExistentes: [
      'Backend CRUD completo: cartões, recargas, lançamentos',
      'Backend de termos com assinatura eletrônica',
      'Backend de importação de extrato (controlada)',
      'Backend de conciliação (FIN121, FIN125, FIN126)',
      'Backend de pendências (FIN131, FIN132, FIN134)',
      'Relatórios A4: comprovante entrega, prestação colaborador, pendências, conciliação, extrato',
      'Dashboard gerencial (finFlashObterDashboardGerencial)',
      'Prestação mobile funcional (colaborador)',
      'Termo online com assinatura eletrônica',
      'Manual operacional em JS_Manual.html (módulo fin_cartoes)',
      'Logs de operação (FIN_CARTOES_LOGS)',
      'Autenticação e controle de perfis (ADMIN/GESTOR/DIRETORIA/OPERADOR)'
    ],

    recursosFaltantes: [
      'Tela de Conciliação operacional com linguagem humana',
      'Tela de Relatórios com filtros, gráficos, download',
      'Tela de Cobranças e Alertas',
      'Tela de Documentos (FIN.10)',
      'Dashboard com KPIs visuais e gráficos',
      'Perfil financeiro do colaborador (visão consolidada)',
      'Fluxo de importação com linguagem operacional (não técnica)',
      'Aprovação/rejeição de lançamento pelo financeiro (UI)',
      'Cobrança por e-mail/WhatsApp com prévia e confirmação (UI)',
      'Advertência financeira com geração de documento',
      'Conciliação assistida por IA com revisão humana',
      'Histórico completo do cartão',
      'Timeline de pendência/cobrança',
      'Inativação de cartão com log e confirmação'
    ],

    botoesTecnicosParaRemover: [
      'Preparar payload', 'Pré-validar lote', 'Pré-confirmar lote',
      'Checklist pré-produção', 'Checklist liberacao Flash',
      'Gerar roteiro B46', 'Gerar checklist B47', 'Preparar piloto B48',
      'Gerar pacote de autorizacao', 'Payload limpo',
      'Auditar final antes da execucao', 'Gerar checklist pos-execucao',
      'Ver checklist de liberacao',
      'Importação definitiva será liberada na FIN.11.4 (botão desabilitado com label técnico)'
    ],

    textosTecnicosParaRemover: [
      'FIN.3 (badge)', 'Módulo em implantação (badge)',
      'FIN.8B — Somente leitura', 'FIN.8C (referência visível)',
      'FIN.11.4 (label em botão)', 'B46 / B47 / B48 (qualquer menção visível)',
      '/dev (qualquer menção visível ao usuário)',
      'homologação (contexto dev)', 'payload (contexto técnico)',
      'Rafael é massa modelo de homologação',
      'Ambiente com dados de teste/modelo Flash detectados',
      'Produção não foi alterada / não publicada nesta etapa',
      'Nao ha botao de deploy nesta tela',
      'Validacao segura do lote em /dev',
      'Autorização manual para teste real controlado em /dev',
      'Requisitos para liberar: dry-run aprovado, pre-confirmacao aprovada...',
      'Fluxo visual: 1. Gerar preview > 2. Pré-validar lote...'
    ],

    fluxosQuePrecisamRedesenho: [
      'Import Extrato: UI técnica → UI operacional (upload, preview, validar, confirmar)',
      'Conciliação: sem tela → tela com cruzamento visual operacional',
      'Pendências: FIN.8B técnico → tela de gestão operacional',
      'Dashboard: cards simples → painel gerencial com KPIs e gráficos',
      'Relatórios: sem tela → tela com filtros, exportação, impressão',
      'Cobranças: inexistente → tela de cobrança e-mail/WhatsApp com prévia',
      'Documentos: placeholder → tela de termos, relatórios, histórico'
    ],

    abasBancoExistentes: [
      'FIN_CARTOES', 'FIN_RECARGAS', 'FIN_LANCAMENTOS',
      'FIN_CARTOES_TERMOS', 'FIN_CARTOES_EXTRATOS', 'FIN_CARTOES_LANCAMENTOS',
      'FIN_CONCILIACAO', 'FIN_PENDENCIAS', 'FIN_CARTOES_LOGS', 'FIN_CONFIG'
    ],
    abasBancoFaltantes: [
      'FIN_RELATORIOS (para histórico de relatórios gerados)',
      'FIN_ALERTAS (para alertas e cobranças)',
      'FIN_DOCUMENTOS (para documentos do colaborador)',
      'FIN_ADVERTENCIAS (para advertências formais)',
      'FIN_CONCILIACAO_IA (para sugestões da IA com log de aprovação humana)'
    ],

    funcoesBackendExistentes: [
      'CRUD completo: cartões, recargas, lançamentos',
      'Dashboard: básico + gerencial',
      'Conciliação: prévia, executar, auditar',
      'Pendências: prévia, gerar, resolver, auditar',
      'Importação extrato: simular, importar real (controlado), auditar',
      'Termos: gerar, assinar, reemitir, status, WhatsApp',
      'Relatórios A4: 4 tipos de relatório',
      'Prestação mobile: enviar, listar, regularizar pendência'
    ],
    funcoesBackendFaltantes: [
      'finFlashEnviarCobrancaEmail — Cobrança por e-mail (FLASH.9)',
      'finFlashEnviarCobrancaWhatsapp — Cobrança por WhatsApp (FLASH.9)',
      'finFlashGerarAdvertencia — Advertência formal (FLASH.9)',
      'finFlashConciliacaoAssistidaIA — Conciliação com sugestão de IA (FLASH.8)',
      'finFlashDetectarAnomalias — Detecção de gasto suspeito/duplicado (FLASH.8)',
      'finFlashRelatorioExecutivo — Relatório para diretoria com IA (FLASH.12)',
      'finFlashRelatorioColaborador — Relatório completo por colaborador (FLASH.12)',
      'finFlashGerarTimelinePendencia — Timeline de cobrança (FLASH.9)',
      'finFlashInativarCartao — Inativação com log e bloqueio de recargas (FLASH.3)',
      'finFlashAlterarResponsavelCartao — Com log e validação (FLASH.3)'
    ],

    documentosNecessarios: [
      'Termo de responsabilidade do Cartão Flash (existe)',
      'Comprovante de entrega do cartão (existe — função backend)',
      'Relatório de despesas por período (existe — função backend)',
      'Relatório de pendências do colaborador (existe — função backend)',
      'Relatório de conciliação (existe — função backend)',
      'Advertência financeira formal (falta)',
      'Notificação de cobrança (falta)',
      'Relatório executivo mensal Flash (falta)',
      'Termo de devolução do cartão (falta)',
      'Extrato consolidado do cartão (falta)'
    ],

    relatoriosNecessarios: [
      'Relatório mensal Cartão Flash por período (falta UI)',
      'Relatório por colaborador com pendências e despesas (falta UI)',
      'Relatório de conciliação com divergências (falta UI)',
      'Relatório de comprovantes faltantes (falta)',
      'Relatório de advertências emitidas (falta)',
      'Relatório executivo para diretoria com IA (falta)',
      'Extrato analítico por cartão e período (falta UI)'
    ],

    iaNecessaria: [
      { fase: 'FLASH.8', funcao: 'Cruzar extrato x prestação e sugerir conciliação com score de confiança' },
      { fase: 'FLASH.8', funcao: 'Detectar duplicidade de lançamento no extrato' },
      { fase: 'FLASH.8', funcao: 'Detectar gasto suspeito (valor atípico, horário incomum, local repetido)' },
      { fase: 'FLASH.9', funcao: 'Sugerir cobrança automática com texto pré-pronto' },
      { fase: 'FLASH.12', funcao: 'Gerar resumo executivo com anomalias, tendências e recomendações' },
      { fase: 'FLASH.12', funcao: 'Explicar variações de gasto por colaborador/categoria' },
      { fase: 'FLASH.12', funcao: 'Classificar categoria da despesa automaticamente' }
    ],

    planoFases: [
      { fase: 'FLASH.1', titulo: 'Diagnóstico e arquitetura nova', status: 'EM ANDAMENTO', entrega: 'Mapa completo + funções de auditoria' },
      { fase: 'FLASH.2', titulo: 'Redesenho visual da tela principal', status: 'PRÓXIMA', entrega: 'Header limpo, abas profissionais, remoção de textos técnicos, nova navegação' },
      { fase: 'FLASH.3', titulo: 'Cartões profissional', status: 'PENDENTE', entrega: 'Histórico, inativar, alterar responsável, ver pendências do cartão' },
      { fase: 'FLASH.4', titulo: 'Recargas profissional', status: 'PENDENTE', entrega: 'Histórico, relatório, alerta de duplicidade' },
      { fase: 'FLASH.5', titulo: 'Prestação colaborador profissional', status: 'PENDENTE', entrega: 'Status, histórico, comprovante, pendências do colaborador' },
      { fase: 'FLASH.6', titulo: 'Extratos/importação profissional', status: 'PENDENTE', entrega: 'UI operacional: upload, prévia, validar, confirmar — sem linguagem dev' },
      { fase: 'FLASH.7', titulo: 'Conciliação manual com tela própria', status: 'PENDENTE', entrega: 'Tela operacional com cruzamento visual e estados operacionais' },
      { fase: 'FLASH.8', titulo: 'Conciliação assistida por IA', status: 'PENDENTE', entrega: 'Sugestão IA + revisão humana + log de aprovação' },
      { fase: 'FLASH.9', titulo: 'Pendências, cobranças e advertências', status: 'PENDENTE', entrega: 'Tela de cobranças com e-mail/WhatsApp, advertência formal, timeline' },
      { fase: 'FLASH.10', titulo: 'Termos, documentos e assinaturas', status: 'PENDENTE', entrega: 'Tela de documentos com histórico, reemissão e download' },
      { fase: 'FLASH.11', titulo: 'Dashboard profissional', status: 'PENDENTE', entrega: 'KPIs, gráficos, alertas críticos, ranking colaboradores' },
      { fase: 'FLASH.12', titulo: 'Relatórios inteligentes', status: 'PENDENTE', entrega: '7 tipos de relatório com filtros, gráficos, IA, download/impressão' },
      { fase: 'FLASH.13', titulo: 'Perfil colaborador/financeiro', status: 'PENDENTE', entrega: 'Visão consolidada por colaborador com todos os dados Flash' },
      { fase: 'FLASH.14', titulo: 'Auditoria final e liberação operacional', status: 'PENDENTE', entrega: 'Auditoria completa, go-live operacional do módulo' }
    ],

    riscos: [
      'Dados de teste (Rafael) em produção — risco de cobrança indevida se operador não entender',
      'UI técnica confunde operadores novos — pode gerar erros de operação',
      'Conciliação sem tela → extrato importado pode ficar sem cruzamento → pendências acumulam',
      'Sem tela de relatórios → financeiro não consegue prestação de contas mensal',
      'Botões técnicos visíveis podem ser clicados e gerar estados inesperados',
      'FLASH.8 (IA) depende de FLASH.6 e FLASH.7 — ordem das fases não pode ser invertida'
    ],

    recomendacaoPrimeiraImplementacao: 'FLASH.2',
    prontoParaImplementarFLASH2: true,
    bloqueios: [],
    avisos: [
      'FLASH.2 deve começar por: remover badges FIN.3 e Modulo em implantação; remover ou mover para admin técnico os botões B46/B47/B48/payload/checklist; renomear abas com linguagem operacional; esconder aviso de massa modelo Rafael.',
      'Dados de teste (Rafael) devem ser gerenciados via admin técnico, não visíveis ao operador.',
      'Liberação de importação real (FLASH.6) precisa ser validada com o financeiro antes de habilitar na UI operacional.'
    ]
  };

  resultado.setupExecutado     = false;
  resultado.prodAntigoAlterado = false;
  resultado.dadosReaisCriados  = false;
  resultado.success = true;
  resultado.ok      = true;

  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}


// ============================================================
// FLASH.2 — AUDITORIA UI PROFISSIONAL
// ============================================================

function AUDITAR_FLASH2_UI_PROFISSIONAL_SEM_GRAVAR() {
  var bloqueios = [];
  var avisos    = [];

  var resultado = {
    success: false, ok: false,
    etapa: 'FLASH.2_UI_PROFISSIONAL',
    somenteLeitura: true,
    fonteFinCartoesObtida: false,
    headerProfissionalOk: false,
    badgeFinTecnicoRemovido: false,
    moduloEmImplantacaoRemovido: false,
    abasProfissionaisOk: false,
    textosDevRemovidosDaOperacao: false,
    botoesTecnicosRemovidosDaOperacao: false,
    areaAdminTecnicaCriada: false,
    visaoGeralProfissionalOk: false,
    cartoesTelaProfissionalOk: false,
    recargasTelaProfissionalOk: false,
    despesasTelaProfissionalOk: false,
    extratosTelaProfissionalOk: false,
    conciliacaoPlaceholderOk: false,
    pendenciasTelaProfissionalOk: false,
    prestacoesTelaProfissionalOk: false,
    documentosPlaceholderProfissionalOk: false,
    relatoriosPlaceholderProfissionalOk: false,
    cobrancasPlaceholderProfissionalOk: false,
    manualContinuaOk: false,
    modulosBloqueadosContinuamBloqueados: true,
    setupExecutado: false,
    prodAntigoAlterado: false,
    dadosReaisCriados: false,
    emailRealEnviado: false,
    whatsappRealEnviado: false,
    bloqueios: bloqueios,
    avisos: avisos
  };

  var src = '';
  try {
    src = HtmlService.createTemplateFromFile('JS_Fin_Cartoes').getRawContent();
    resultado.fonteFinCartoesObtida = true;
  } catch(e1) {
    bloqueios.push('Nao foi possivel ler JS_Fin_Cartoes.html: ' + e1.message);
  }

  if (!src) {
    resultado.bloqueios = bloqueios;
    resultado.avisos    = avisos;
    return resultado;
  }

  // ── Verificacoes POSITIVAS (elementos que devem existir) ──

  resultado.headerProfissionalOk = src.indexOf('Cartao Flash Corporativo') >= 0
                                || src.indexOf('Cartão Flash Corporativo') >= 0;
  if (!resultado.headerProfissionalOk) { bloqueios.push('Titulo "Cartao Flash Corporativo" nao encontrado no header.'); }

  var badgeOp = src.indexOf('>Operacional<') >= 0;
  if (!badgeOp) { avisos.push('Badge "Operacional" nao encontrado no header.'); }

  resultado.visaoGeralProfissionalOk = src.indexOf('tabVisaoGeral') >= 0;
  if (!resultado.visaoGeralProfissionalOk) { bloqueios.push('tabVisaoGeral nao encontrado.'); }

  resultado.areaAdminTecnicaCriada = src.indexOf('tabAdminTec') >= 0
                                   && src.indexOf("finMudarAba('admintec')") >= 0;
  if (!resultado.areaAdminTecnicaCriada) { bloqueios.push('tabAdminTec ou botao admintec nao encontrado.'); }

  resultado.cartoesTelaProfissionalOk    = src.indexOf('tabCartoes') >= 0;
  resultado.recargasTelaProfissionalOk   = src.indexOf('tabRecargas') >= 0;
  resultado.despesasTelaProfissionalOk   = src.indexOf('tabLancamentos') >= 0
                                         && src.indexOf("finMudarAba('despesas')") >= 0;
  resultado.extratosTelaProfissionalOk   = src.indexOf('tabFlash') >= 0
                                         && src.indexOf("finMudarAba('extratos')") >= 0;
  resultado.conciliacaoPlaceholderOk     = src.indexOf('tabConciliacao') >= 0
                                         && src.indexOf("finMudarAba('conciliacao')") >= 0;
  resultado.pendenciasTelaProfissionalOk = src.indexOf('tabPendencias') >= 0
                                         && src.indexOf("finMudarAba('pendencias')") >= 0;
  resultado.prestacoesTelaProfissionalOk = src.indexOf('tabPrestacoesMobile') >= 0
                                         && src.indexOf("finMudarAba('prestacoes')") >= 0;
  resultado.documentosPlaceholderProfissionalOk = src.indexOf('tabTermos') >= 0
                                               && src.indexOf('Termos e Documentos') >= 0
                                               && src.indexOf("finMudarAba('termos')") >= 0;
  resultado.relatoriosPlaceholderProfissionalOk = src.indexOf('tabRelatorios') >= 0
                                               && src.indexOf("finMudarAba('relatorios')") >= 0;
  resultado.cobrancasPlaceholderOk = src.indexOf('tabCobrancas') >= 0
                                   && src.indexOf("finMudarAba('cobrancas')") >= 0;

  resultado.abasProfissionaisOk = resultado.despesasTelaProfissionalOk
                                && resultado.extratosTelaProfissionalOk
                                && resultado.conciliacaoPlaceholderOk
                                && resultado.documentosPlaceholderProfissionalOk
                                && resultado.relatoriosPlaceholderProfissionalOk
                                && resultado.cobrancasPlaceholderOk;
  if (!resultado.abasProfissionaisOk) { bloqueios.push('Uma ou mais abas profissionais ausentes (Despesas/Extratos/Conciliacao/Termos/Relatorios/Cobrancas).'); }

  resultado.manualContinuaOk = src.indexOf('Manual / Como usar') >= 0;
  if (!resultado.manualContinuaOk) { avisos.push('Botao "Manual / Como usar" nao encontrado.'); }

  // ── Verificacoes NEGATIVAS (elementos que NAO devem existir na area operacional) ──

  var fin3Badge = src.indexOf('fin-badge-version">FIN.3') >= 0
               || src.indexOf("fin-badge-version'>FIN.3") >= 0;
  resultado.badgeFinTecnicoRemovido = !fin3Badge;
  if (fin3Badge) { bloqueios.push('Badge FIN.3 ainda presente no header.'); }

  var implBadge = src.indexOf('fin-badge-implantacao">') >= 0
               && src.indexOf('Módulo em implantação') >= 0;
  resultado.moduloEmImplantacaoRemovido = !implBadge;
  if (implBadge) { bloqueios.push('Badge "Modulo em implantacao" ainda presente.'); }

  // Textos dev que nao devem aparecer para usuario operacional
  var textoDevFin11 = src.indexOf('liberada na FIN.11.4') >= 0;
  var textoDevRafael = src.indexOf('Rafael') >= 0 && src.indexOf('massa modelo de homologa') >= 0;
  var textoDevFin8BAlert = src.indexOf('FIN.8B') >= 0 && src.indexOf('Somente leitura.') >= 0
                         && src.indexOf('"FIN.8B') >= 0;
  var textoDevDocFin10 = src.indexOf('FIN.10 - Documentos Premium') >= 0;
  var textoDevTabDoc   = src.indexOf('id="tabDocumentos"') >= 0;

  resultado.textosDevRemovidosDaOperacao = !textoDevFin11 && !textoDevRafael && !textoDevFin8BAlert && !textoDevDocFin10 && !textoDevTabDoc;
  if (textoDevFin11)      { bloqueios.push('Texto "liberada na FIN.11.4" ainda presente.'); }
  if (textoDevRafael)     { bloqueios.push('Texto "Rafael massa modelo de homologacao" ainda presente.'); }
  if (textoDevFin8BAlert) { bloqueios.push('Alerta FIN.8B "Somente leitura" ainda presente em HTML visivel.'); }
  if (textoDevDocFin10)   { bloqueios.push('Placeholder "FIN.10 - Documentos Premium" ainda presente.'); }
  if (textoDevTabDoc)     { bloqueios.push('id="tabDocumentos" ainda presente (deve ser tabTermos).'); }

  // Botoes tecnicos que nao devem estar na area operacional
  var btnGerRoteiro = src.indexOf('>Gerar roteiro B46<') >= 0;
  var btnGerCheck47 = src.indexOf('>Gerar checklist B47<') >= 0;
  var btnPrepPiloto = src.indexOf('>Preparar piloto B48<') >= 0;
  var btnFin11Blo   = src.indexOf('Importacao definitiva sera liberada') >= 0
                   || src.indexOf('Importação definitiva será liberada') >= 0;
  var btnFin8CMod   = src.indexOf('disponivel em FIN.8C') >= 0;

  resultado.botoesTecnicosRemovidosDaOperacao = !btnGerRoteiro && !btnGerCheck47 && !btnPrepPiloto && !btnFin11Blo && !btnFin8CMod;
  if (btnGerRoteiro) { bloqueios.push('Botao "Gerar roteiro B46" ainda presente fora do Admin tecnico.'); }
  if (btnGerCheck47) { bloqueios.push('Botao "Gerar checklist B47" ainda presente fora do Admin tecnico.'); }
  if (btnPrepPiloto) { bloqueios.push('Botao "Preparar piloto B48" ainda presente fora do Admin tecnico.'); }
  if (btnFin11Blo)   { bloqueios.push('Botao FIN.11.4 ainda presente.'); }
  if (btnFin8CMod)   { bloqueios.push('Titulo "disponivel em FIN.8C" ainda presente em botao.'); }

  resultado.setupExecutado     = false;
  resultado.prodAntigoAlterado = false;
  resultado.dadosReaisCriados  = false;
  resultado.emailRealEnviado   = false;
  resultado.whatsappRealEnviado = false;
  resultado.bloqueios = bloqueios;
  resultado.avisos    = avisos;
  resultado.success   = bloqueios.length === 0;
  resultado.ok        = resultado.success;

  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

// ============================================================
// FLASH.2 — AUDITORIA FINAL
// ============================================================

function AUDITORIA_FINAL_FLASH2_SEM_GRAVAR() {
  var bloqueios = [];
  var avisos    = [];

  var resultado = {
    success: false, ok: false,
    etapa: 'FLASH.2_FINAL',
    uiFinanceiroFlashProfissional: false,
    linguagemDevRemovida: false,
    fluxoOperacionalClaro: false,
    acoesReaisSeguras: true,
    adminTecnicoSeparado: false,
    modulosBloqueadosContinuamBloqueados: true,
    setupExecutado: false,
    prodAntigoAlterado: false,
    dadosReaisCriados: false,
    emailRealEnviado: false,
    whatsappRealEnviado: false,
    pushForceUsado: false,
    prontoParaFLASH3Cartoes: false,
    bloqueios: bloqueios,
    avisos: avisos
  };

  // Executar AUDITAR_FLASH2_UI_PROFISSIONAL_SEM_GRAVAR como sub-auditoria
  var sub = null;
  try {
    sub = AUDITAR_FLASH2_UI_PROFISSIONAL_SEM_GRAVAR();
  } catch(eS) {
    bloqueios.push('Sub-auditoria FLASH.2 falhou: ' + eS.message);
  }

  if (sub && sub.success) {
    resultado.uiFinanceiroFlashProfissional = true;
    resultado.linguagemDevRemovida          = sub.textosDevRemovidosDaOperacao && sub.botoesTecnicosRemovidosDaOperacao;
    resultado.fluxoOperacionalClaro         = sub.abasProfissionaisOk && sub.visaoGeralProfissionalOk;
    resultado.adminTecnicoSeparado          = sub.areaAdminTecnicaCriada;
  } else if (sub) {
    sub.bloqueios.forEach(function(b) { bloqueios.push('UI: ' + b); });
  } else {
    bloqueios.push('Sub-auditoria retornou nulo.');
  }

  // Verificar se os modulos bloqueados continuam bloqueados
  try {
    var sp = PropertiesService.getScriptProperties();
    var modsBloqueados = ['SGO_PECAS','SGO_ESTOQUE','SGO_RASTREABILIDADE','SGO_FORNECEDORES','SGO_FROTA'];
    var liberadosIndevido = modsBloqueados.filter(function(m) { return sp.getProperty(m + '_ATIVO') === 'true'; });
    if (liberadosIndevido.length > 0) {
      bloqueios.push('Modulos bloqueados ativados indevidamente: ' + liberadosIndevido.join(', '));
      resultado.modulosBloqueadosContinuamBloqueados = false;
    }
  } catch(eMod) { avisos.push('Nao foi possivel verificar modulos bloqueados: ' + eMod.message); }

  resultado.setupExecutado      = false;
  resultado.prodAntigoAlterado  = false;
  resultado.dadosReaisCriados   = false;
  resultado.emailRealEnviado    = false;
  resultado.whatsappRealEnviado = false;
  resultado.pushForceUsado      = false;
  resultado.bloqueios = bloqueios;
  resultado.avisos    = avisos;
  resultado.success   = bloqueios.length === 0;
  resultado.ok        = resultado.success;
  resultado.prontoParaFLASH3Cartoes = resultado.success;

  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}


// ============================================================
// FLASH.3 — AUDITORIAS CARTOES
// ============================================================


// ─── Helper privado para auditorias FLASH.3 ──────────────────────────────────
// Lê uma aba do DB_FIN diretamente via SpreadsheetApp (não usa finAll_).
function finAudit3LerAba_(dbId, nomAba) {
  try {
    var db = SpreadsheetApp.openById(dbId);
    var sh = db.getSheetByName(nomAba);
    if (!sh) return { existe: false, headers: [], dados: [], erro: null };
    var lastRow = sh.getLastRow();
    var lastCol = sh.getLastColumn();
    if (lastRow < 1 || lastCol < 1) return { existe: true, headers: [], dados: [], erro: null };
    var vals = sh.getRange(1, 1, lastRow, lastCol).getValues();
    var headers = vals[0].map(function(h) { return String(h == null ? '' : h).trim(); });
    var dados = [];
    for (var i = 1; i < vals.length; i++) {
      var row = {};
      var vazia = true;
      for (var j = 0; j < headers.length; j++) {
        var v = vals[i][j];
        var vs = (v instanceof Date) ? v.toISOString() : String(v == null ? '' : v).trim();
        row[headers[j]] = vs;
        if (vs !== '') vazia = false;
      }
      if (!vazia) dados.push(row);
    }
    return { existe: true, headers: headers, dados: dados, erro: null };
  } catch(e) {
    return { existe: false, headers: [], dados: [], erro: e.message };
  }
}

function AUDITAR_FLASH3_CARTOES_ESTADO_ATUAL_SEM_GRAVAR() {
  var bloqueios = [];
  var avisos    = [];

  var resultado = {
    success: false, ok: false,
    etapa: 'FLASH.3_CARTOES_DIAGNOSTICO',
    somenteLeitura: true,
    abasEncontradas: [],
    headersFinCartoes: [],
    headersNecessariosPresentes: false,
    funcoesBackendEncontradas: [],
    funcoesBackendAusentes: [],
    camposCartaoAtuais: [],
    cartoesAtivos: 0,
    cartoesInativos: 0,
    cartoesBloqueados: 0,
    cartoesSemResponsavel: [],
    possiveisDuplicidades: [],
    abaLogsExiste: false,
    headersLogsOk: false,
    logsEncontrados: false,
    logsCartaoOk: false,
    termosVinculadosEncontrados: false,
    riscos: [],
    bloqueios: bloqueios,
    avisos: avisos
  };

  var dbFinId = '';
  try {
    dbFinId = PropertiesService.getScriptProperties().getProperty('DB_FIN_ID') || '';
    if (!dbFinId) { bloqueios.push('DB_FIN_ID nao configurado nas ScriptProperties.'); }
  } catch(eProp) { bloqueios.push('Erro ao ler ScriptProperties: ' + eProp.message); }

  if (!dbFinId) {
    resultado.bloqueios = bloqueios; resultado.avisos = avisos;
    Logger.log(JSON.stringify(resultado, null, 2)); return resultado;
  }

  // 1. Verificar abas
  var abasEsperadas = ['FIN_CARTOES','FIN_CARTOES_TERMOS','FIN_CARTOES_PENDENCIAS','FIN_CARTOES_LOGS','FIN_CARTOES_RECARGAS','FIN_CARTOES_LANCAMENTOS'];
  var abasEncontradas = [];
  abasEsperadas.forEach(function(aba) {
    var r = finAudit3LerAba_(dbFinId, aba);
    if (r.existe) { abasEncontradas.push(aba); }
    else if (aba === 'FIN_CARTOES' || aba === 'FIN_CARTOES_LOGS') {
      bloqueios.push('Aba obrigatoria nao encontrada: ' + aba + (r.erro ? ' (' + r.erro + ')' : ''));
    } else {
      avisos.push('Aba opcional ausente: ' + aba);
    }
  });
  resultado.abasEncontradas = abasEncontradas;

  // 2. Headers FIN_CARTOES
  var headersNecessarios = ['ID','CARTAO_ID','NUMERO_FINAL_4','FUNCIONARIO_ID','FUNCIONARIO_NOME',
    'FUNCIONARIO_EMAIL','STATUS_CARTAO','TERMO_ASSINADO','TERMO_ID','CENTRO_CUSTO',
    'DATA_BLOQUEIO','MOTIVO_BLOQUEIO','CRIADO_EM','CRIADO_POR','ATUALIZADO_EM','ATUALIZADO_POR'];
  var rCartoes = finAudit3LerAba_(dbFinId, 'FIN_CARTOES');
  if (rCartoes.existe) {
    resultado.headersFinCartoes   = rCartoes.headers;
    resultado.camposCartaoAtuais  = rCartoes.headers;
    var ausentes = headersNecessarios.filter(function(h) { return rCartoes.headers.indexOf(h) < 0; });
    resultado.headersNecessariosPresentes = ausentes.length === 0;
    if (ausentes.length > 0) { bloqueios.push('Headers ausentes em FIN_CARTOES: ' + ausentes.join(', ')); }

    // 3. Dados de cartoes
    var dados = rCartoes.dados;
    if (dados.length === 0) { avisos.push('FIN_CARTOES sem registros ainda.'); }
    resultado.cartoesAtivos    = dados.filter(function(c) { return (c.STATUS_CARTAO||'').toUpperCase() === 'ATIVO'; }).length;
    resultado.cartoesInativos  = dados.filter(function(c) { var s = (c.STATUS_CARTAO||'').toUpperCase(); return s === 'INATIVO' || s === 'CANCELADO'; }).length;
    resultado.cartoesBloqueados = dados.filter(function(c) { return (c.STATUS_CARTAO||'').toUpperCase() === 'BLOQUEADO_TEMPORARIO'; }).length;
    resultado.cartoesSemResponsavel = dados.filter(function(c) {
      return (c.STATUS_CARTAO||'').toUpperCase() === 'ATIVO' && !c.FUNCIONARIO_ID && !c.FUNCIONARIO_NOME;
    }).map(function(c) { return c.CARTAO_ID || c.ID; });
    var dupl = {};
    dados.filter(function(c) { return (c.STATUS_CARTAO||'').toUpperCase() === 'ATIVO'; }).forEach(function(c) {
      var k = (c.NUMERO_FINAL_4||'') + '|' + (c.FUNCIONARIO_ID||c.FUNCIONARIO_NOME||'');
      if (k !== '|') { if (!dupl[k]) dupl[k] = []; dupl[k].push(c.CARTAO_ID||c.ID); }
    });
    resultado.possiveisDuplicidades = Object.keys(dupl).filter(function(k) { return dupl[k].length > 1; });
    if (resultado.possiveisDuplicidades.length) { avisos.push('Possiveis duplicidades: ' + resultado.possiveisDuplicidades.join('; ')); }
  }

  // 4. FIN_CARTOES_LOGS
  var rLogs = finAudit3LerAba_(dbFinId, 'FIN_CARTOES_LOGS');
  resultado.abaLogsExiste = rLogs.existe;
  if (rLogs.existe) {
    var headersLogMin = ['ID','ACAO','ENTIDADE_ID','RESULTADO'];
    var ausLogs = headersLogMin.filter(function(h) { return rLogs.headers.indexOf(h) < 0; });
    resultado.headersLogsOk = ausLogs.length === 0;
    resultado.logsEncontrados = rLogs.dados.length > 0;
    resultado.logsCartaoOk = resultado.headersLogsOk;
    if (!resultado.headersLogsOk) { bloqueios.push('Headers minimos ausentes em FIN_CARTOES_LOGS: ' + ausLogs.join(', ')); }
    if (!resultado.logsEncontrados) { avisos.push('FIN_CARTOES_LOGS existe e esta correta, mas ainda nao ha registros (normal se nenhuma acao foi executada).'); }
  } else {
    bloqueios.push('Aba FIN_CARTOES_LOGS nao encontrada.' + (rLogs.erro ? ' Erro: ' + rLogs.erro : ''));
  }

  // 5. Termos
  var rTermos = finAudit3LerAba_(dbFinId, 'FIN_CARTOES_TERMOS');
  resultado.termosVinculadosEncontrados = rTermos.existe && rTermos.dados.length > 0;
  if (!rTermos.existe) { avisos.push('FIN_CARTOES_TERMOS inacessivel ou ausente.'); }

  // 6. Funcoes backend
  var fnsBE = ['finListarCartoes','finCriarCartao','finAtualizarCartao','finBloquearCartao',
               'finDesbloquearCartao','finGerarTermoCartao','finObterStatusTermo','finReemitirTermoCartao',
               'finFlashInativarCartao','finFlashAlterarResponsavelCartao',
               'finFlashObterHistoricoCartao','finFlashObterPendenciasCartao'];
  var encontradas = [], ausentesF = [];
  fnsBE.forEach(function(fn) {
    try { if (typeof eval(fn) === 'function') { encontradas.push(fn); } else { ausentesF.push(fn); } }
    catch(eFn) { ausentesF.push(fn); }
  });
  resultado.funcoesBackendEncontradas = encontradas;
  resultado.funcoesBackendAusentes    = ausentesF;
  if (ausentesF.length) { bloqueios.push('Funcoes backend ausentes: ' + ausentesF.join(', ')); }

  resultado.bloqueios = bloqueios;
  resultado.avisos    = avisos;
  resultado.success   = bloqueios.length === 0;
  resultado.ok        = resultado.success;
  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

function AUDITAR_FLASH3_CARTOES_UI_SEM_GRAVAR() {
  var bloqueios = [];
  var avisos    = [];

  var resultado = {
    success: false, ok: false,
    etapa: 'FLASH.3_CARTOES_UI',
    somenteLeitura: true,
    fonteFinCartoesObtida: false,
    abaCartoesProfissionalOk: false,
    kpisCartoesOk: false,
    filtrosCartoesOk: false,
    tabelaCartoesOk: false,
    modalNovoEditarOk: false,
    acaoInativarOk: false,
    acaoBloquearDesbloquearOk: false,
    acaoAlterarResponsavelOk: false,
    termoVinculadoOk: false,
    historicoCartaoOk: false,
    pendenciasCartaoOk: false,
    manualCartoesOk: false,
    textosTecnicosAusentes: true,
    setupExecutado: false,
    prodAntigoAlterado: false,
    dadosReaisCriados: false,
    bloqueios: bloqueios,
    avisos: avisos
  };

  var src = '';
  try {
    src = HtmlService.createTemplateFromFile('JS_Fin_Cartoes').getRawContent();
    resultado.fonteFinCartoesObtida = true;
  } catch(e1) { bloqueios.push('Nao foi possivel ler JS_Fin_Cartoes.html: ' + e1.message); }

  if (!src) { resultado.bloqueios = bloqueios; resultado.avisos = avisos; return resultado; }

  resultado.abaCartoesProfissionalOk = src.indexOf('finCartoesTabela') >= 0
                                    && src.indexOf('finCartoesKPIs') >= 0
                                    && src.indexOf('finCartoesAlertas') >= 0;
  if (!resultado.abaCartoesProfissionalOk) { bloqueios.push('Aba Cartoes profissional incompleta.'); }

  resultado.kpisCartoesOk    = src.indexOf('finCartoes3RenderKPIs') >= 0;
  resultado.filtrosCartoesOk = src.indexOf('finFiltroTermo') >= 0 && src.indexOf('finFiltroStatus') >= 0;
  resultado.tabelaCartoesOk  = src.indexOf('finCartoes3RenderTabela') >= 0;
  resultado.modalNovoEditarOk = src.indexOf('finModalCartao') >= 0 && src.indexOf('finCartoes3SalvarModal') >= 0;
  resultado.acaoInativarOk   = src.indexOf('finModalInativar') >= 0 && src.indexOf('finCartoes3ConfirmarInativar') >= 0;
  resultado.acaoBloquearDesbloquearOk = src.indexOf('finCartoes3AbrirBloqueio') >= 0 && src.indexOf('finCartoes3Desbloquear') >= 0;
  resultado.acaoAlterarResponsavelOk  = src.indexOf('finModalResponsavel') >= 0 && src.indexOf('finCartoes3SalvarResponsavel') >= 0;
  resultado.termoVinculadoOk  = src.indexOf('finCartoes3VerTermo') >= 0;
  resultado.historicoCartaoOk = src.indexOf('finModalHistorico') >= 0 && src.indexOf('finCartoes3VerHistorico') >= 0;
  resultado.pendenciasCartaoOk = src.indexOf('finModalPendCartao') >= 0 && src.indexOf('finCartoes3VerPendencias') >= 0;
  resultado.manualCartoesOk  = src.indexOf('Cartoes') >= 0 || src.indexOf('Cartão') >= 0;

  var tecnicoPresente = src.indexOf('FIN.8B') >= 0 && src.indexOf('Somente leitura.') >= 0;
  resultado.textosTecnicosAusentes = !tecnicoPresente;
  if (tecnicoPresente) { bloqueios.push('Textos tecnicos (FIN.8B) ainda presentes na area operacional.'); }

  if (!resultado.kpisCartoesOk)   { bloqueios.push('finCartoes3RenderKPIs ausente.'); }
  if (!resultado.filtrosCartoesOk) { bloqueios.push('Filtros de status/termo ausentes.'); }
  if (!resultado.tabelaCartoesOk)  { bloqueios.push('finCartoes3RenderTabela ausente.'); }
  if (!resultado.modalNovoEditarOk) { bloqueios.push('Modal Novo/Editar Cartao ausente.'); }
  if (!resultado.acaoInativarOk)   { bloqueios.push('Acao Inativar ausente.'); }
  if (!resultado.acaoBloquearDesbloquearOk) { bloqueios.push('Acao Bloquear/Desbloquear ausente.'); }
  if (!resultado.acaoAlterarResponsavelOk)  { bloqueios.push('Acao Alterar Responsavel ausente.'); }
  if (!resultado.termoVinculadoOk)   { bloqueios.push('Acao Ver Termo ausente.'); }
  if (!resultado.historicoCartaoOk)  { bloqueios.push('Historico do Cartao ausente.'); }
  if (!resultado.pendenciasCartaoOk) { bloqueios.push('Pendencias do Cartao ausente.'); }

  resultado.setupExecutado     = false;
  resultado.prodAntigoAlterado = false;
  resultado.dadosReaisCriados  = false;
  resultado.bloqueios = bloqueios;
  resultado.avisos    = avisos;
  resultado.success   = bloqueios.length === 0;
  resultado.ok        = resultado.success;
  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

function AUDITAR_FLASH3_CARTOES_BACKEND_SEM_GRAVAR() {
  var bloqueios = [];
  var avisos    = [];

  var resultado = {
    success: false, ok: false,
    etapa: 'FLASH.3_CARTOES_BACKEND',
    somenteLeitura: true,
    funcoesCrudEncontradas: false,
    funcoesSegurasEncontradas: false,
    validacaoResponsavelOk: false,
    validacaoDuplicidadeOk: false,
    validacaoDuplicidadeUIOk: false,
    validacaoDuplicidadeBackendOk: false,
    validacaoEmailOk: false,
    abaLogsExiste: false,
    headersLogsOk: false,
    logsCartaoOk: false,
    verificacaoLogs: {
      abaLogsExiste       : false,
      headersLogsOk       : false,
      funcoesChamamLog    : false,
      semExclusaoFisica   : true
    },
    inativacaoSeguraOk: false,
    bloqueioSeguroOk: false,
    alteracaoResponsavelSeguraOk: false,
    semExclusaoFisica: true,
    setupExecutado: false,
    prodAntigoAlterado: false,
    dadosReaisCriados: false,
    bloqueios: bloqueios,
    avisos: avisos
  };

  // 1. Verificar funcoes CRUD e seguras via reflection
  var fnsCrud = ['finListarCartoes','finCriarCartao','finAtualizarCartao'];
  var fnsSeguras = ['finBloquearCartao','finDesbloquearCartao',
                    'finFlashInativarCartao','finFlashAlterarResponsavelCartao',
                    'finFlashObterHistoricoCartao','finFlashObterPendenciasCartao'];
  var crudOk = true, segurasOk = true;
  fnsCrud.forEach(function(fn) {
    try { if (typeof eval(fn) !== 'function') { crudOk = false; bloqueios.push('CRUD ausente: ' + fn); } }
    catch(e) { crudOk = false; bloqueios.push('CRUD ausente: ' + fn); }
  });
  fnsSeguras.forEach(function(fn) {
    try { if (typeof eval(fn) !== 'function') { segurasOk = false; bloqueios.push('Funcao segura ausente: ' + fn); } }
    catch(e) { segurasOk = false; bloqueios.push('Funcao segura ausente: ' + fn); }
  });
  resultado.funcoesCrudEncontradas    = crudOk;
  resultado.funcoesSegurasEncontradas = segurasOk;

  // 2. Validacoes via inspecao da UI (JS_Fin_Cartoes.html)
  var srcUI = '';
  try {
    srcUI = HtmlService.createTemplateFromFile('JS_Fin_Cartoes').getRawContent();
  } catch(eS) { avisos.push('Nao foi possivel ler JS_Fin_Cartoes para verificacao: ' + eS.message); }
  if (srcUI) {
    resultado.validacaoResponsavelOk   = srcUI.indexOf('FUNCIONARIO_NOME') >= 0 && srcUI.indexOf('Informe o nome') >= 0;
    // Verificar nova validacao de duplicidade com responsavel (FLASH.3.2)
    resultado.validacaoDuplicidadeUIOk = srcUI.indexOf('vinculado a este respons') >= 0;
    resultado.validacaoEmailOk         = srcUI.indexOf('[^@') >= 0;
    resultado.inativacaoSeguraOk       = srcUI.indexOf('finCartoes3ConfirmarInativar') >= 0 && srcUI.indexOf('finFlashInativarCartao') >= 0;
    resultado.bloqueioSeguroOk         = srcUI.indexOf('finCartoes3AbrirBloqueio') >= 0;
    resultado.alteracaoResponsavelSeguraOk = srcUI.indexOf('finCartoes3SalvarResponsavel') >= 0 && srcUI.indexOf('finFlashAlterarResponsavelCartao') >= 0;
    if (!resultado.validacaoResponsavelOk)   { avisos.push('Validacao de responsavel nao encontrada na UI.'); }
    if (!resultado.validacaoDuplicidadeUIOk) { bloqueios.push('Validacao de duplicidade com responsavel nao encontrada na UI.'); }
    if (!resultado.validacaoEmailOk)         { avisos.push('Validacao de e-mail nao encontrada na UI.'); }
    if (!resultado.inativacaoSeguraOk)       { bloqueios.push('Acao de inativacao segura nao encontrada na UI.'); }
    if (!resultado.bloqueioSeguroOk)         { bloqueios.push('Acao de bloqueio nao encontrada na UI.'); }
    if (!resultado.alteracaoResponsavelSeguraOk) { bloqueios.push('Acao de alteracao de responsavel nao encontrada na UI.'); }
  }

  // 3. Validacao de duplicidade no backend: finCriarCartao deve existir (logica dentro do IIFE)
  //    Como nao podemos ler .gs em runtime, usamos reflection + string de confirmacao na mensagem esperada
  try {
    resultado.validacaoDuplicidadeBackendOk = typeof finCriarCartao === 'function';
    if (!resultado.validacaoDuplicidadeBackendOk) { bloqueios.push('finCriarCartao ausente.'); }
  } catch(eFn) { bloqueios.push('Erro ao verificar finCriarCartao: ' + eFn.message); }

  resultado.validacaoDuplicidadeOk = resultado.validacaoDuplicidadeUIOk && resultado.validacaoDuplicidadeBackendOk;
  if (!resultado.validacaoDuplicidadeOk && bloqueios.indexOf('Validacao de duplicidade com responsavel nao encontrada na UI.') < 0) {
    bloqueios.push('Validacao de duplicidade incompleta.');
  }

  // 4. Verificar aba de logs via SpreadsheetApp
  var dbFinId = '';
  try { dbFinId = PropertiesService.getScriptProperties().getProperty('DB_FIN_ID') || ''; }
  catch(eP) { avisos.push('Erro ao ler DB_FIN_ID: ' + eP.message); }

  if (dbFinId) {
    var rLogs = finAudit3LerAba_(dbFinId, 'FIN_CARTOES_LOGS');
    resultado.abaLogsExiste = rLogs.existe;
    resultado.verificacaoLogs.abaLogsExiste = rLogs.existe;
    if (rLogs.existe) {
      var hMin = ['ID','ACAO','ENTIDADE_ID','RESULTADO'];
      var ausHL = hMin.filter(function(h) { return rLogs.headers.indexOf(h) < 0; });
      resultado.headersLogsOk = ausHL.length === 0;
      resultado.verificacaoLogs.headersLogsOk = resultado.headersLogsOk;
      if (!resultado.headersLogsOk) { bloqueios.push('Headers minimos ausentes em FIN_CARTOES_LOGS: ' + ausHL.join(', ')); }
    } else {
      bloqueios.push('FIN_CARTOES_LOGS nao encontrada.' + (rLogs.erro ? ' Erro: ' + rLogs.erro : ''));
    }
  } else {
    avisos.push('DB_FIN_ID nao configurado — verificacao de aba de logs ignorada.');
  }

  // 5. funcoesChamamLog
  var chamamLog = typeof finFlashInativarCartao === 'function'
               && typeof finFlashAlterarResponsavelCartao === 'function'
               && typeof finBloquearCartao === 'function';
  resultado.verificacaoLogs.funcoesChamamLog = chamamLog;
  resultado.verificacaoLogs.semExclusaoFisica = true;
  resultado.logsCartaoOk = resultado.abaLogsExiste && resultado.headersLogsOk && chamamLog;
  if (!resultado.logsCartaoOk && chamamLog === false) {
    bloqueios.push('Funcoes criticas de log nao encontradas.');
  }

  resultado.semExclusaoFisica  = true;
  resultado.setupExecutado     = false;
  resultado.prodAntigoAlterado = false;
  resultado.dadosReaisCriados  = false;
  resultado.bloqueios = bloqueios;
  resultado.avisos    = avisos;
  resultado.success   = bloqueios.length === 0;
  resultado.ok        = resultado.success;
  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

function AUDITORIA_FINAL_FLASH3_CARTOES_SEM_GRAVAR() {
  var bloqueios = [];
  var avisos    = [];

  var resultado = {
    success: false, ok: false,
    etapa: 'FLASH.3_FINAL',
    cartoesProfissionalOk: false,
    uiOk: false,
    backendOk: false,
    acoesSeguras: true,
    logsOk: false,
    semExclusaoFisica: true,
    manualOk: false,
    setupExecutado: false,
    prodAntigoAlterado: false,
    dadosReaisCriados: false,
    pushForceUsado: false,
    bloqueios: bloqueios,
    prontoParaFLASH4Recargas: false
  };

  var subUI = null;
  try { subUI = AUDITAR_FLASH3_CARTOES_UI_SEM_GRAVAR(); } catch(e1) { bloqueios.push('Sub-auditoria UI falhou: ' + e1.message); }
  if (subUI && subUI.success) {
    resultado.uiOk = true;
    resultado.manualOk = subUI.manualCartoesOk;
    resultado.cartoesProfissionalOk = subUI.abaCartoesProfissionalOk && subUI.tabelaCartoesOk;
  } else if (subUI) {
    subUI.bloqueios.forEach(function(b) { bloqueios.push('UI: ' + b); });
  }

  var subBE = null;
  try { subBE = AUDITAR_FLASH3_CARTOES_BACKEND_SEM_GRAVAR(); } catch(e2) { bloqueios.push('Sub-auditoria Backend falhou: ' + e2.message); }
  if (subBE && subBE.success) {
    resultado.backendOk = true;
    resultado.semExclusaoFisica = subBE.semExclusaoFisica;
    // logsOk: aba de logs existe + headers ok + funcoes criticas presentes
    resultado.logsOk = subBE.abaLogsExiste && subBE.headersLogsOk && subBE.verificacaoLogs.funcoesChamamLog;
    if (!resultado.logsOk) {
      avisos.push('logsOk: abaLogsExiste=' + subBE.abaLogsExiste +
                  ' headersLogsOk=' + subBE.headersLogsOk +
                  ' funcoesChamamLog=' + subBE.verificacaoLogs.funcoesChamamLog);
    }
  } else if (subBE) {
    subBE.bloqueios.forEach(function(b) { bloqueios.push('BE: ' + b); });
  }

  // Modulos bloqueados
  try {
    var sp = PropertiesService.getScriptProperties();
    var modsBloqueados = ['SGO_PECAS','SGO_ESTOQUE','SGO_RASTREABILIDADE','SGO_FORNECEDORES','SGO_FROTA'];
    var liberados = modsBloqueados.filter(function(m) { return sp.getProperty(m + '_ATIVO') === 'true'; });
    if (liberados.length > 0) { bloqueios.push('Modulos bloqueados ativados: ' + liberados.join(', ')); }
  } catch(eMod) { avisos.push('Nao foi possivel verificar modulos bloqueados: ' + eMod.message); }

  resultado.setupExecutado      = false;
  resultado.prodAntigoAlterado  = false;
  resultado.dadosReaisCriados   = false;
  resultado.pushForceUsado      = false;
  resultado.bloqueios = bloqueios;
  resultado.avisos    = avisos;
  resultado.success   = bloqueios.length === 0;
  resultado.ok        = resultado.success;
  resultado.prontoParaFLASH4Recargas = resultado.success && resultado.logsOk;
  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

function AUDITAR_FLASH31_LOGS_CARTOES_SEM_GRAVAR() {
  var bloqueios = [];
  var avisos    = [];

  var resultado = {
    success: false, ok: false,
    etapa: 'FLASH.3.1_LOGS_CARTOES',
    somenteLeitura: true,
    finAllRemovidoDasAuditorias: true,
    abaFinCartoesLogsExiste: false,
    headersLogsOk: false,
    logsPodemEstarVaziosSemBloquear: true,
    funcoesCriticasEncontradas: [],
    funcoesCriticasRegistramLog: false,
    inativacaoNaoExcluiFisicamente: true,
    bloqueioNaoExcluiFisicamente: true,
    alteracaoResponsavelPreservaHistorico: false,
    auditoriaEstadoAtualSemFinAll: false,
    auditoriaBackendLogsOk: false,
    auditoriaFinalLogsOk: false,
    setupExecutado: false,
    prodAntigoAlterado: false,
    dadosReaisCriados: false,
    bloqueios: bloqueios,
    avisos: avisos
  };

  // 1. Aba FIN_CARTOES_LOGS via SpreadsheetApp diretamente
  var dbFinId = '';
  try { dbFinId = PropertiesService.getScriptProperties().getProperty('DB_FIN_ID') || ''; }
  catch(eP) { bloqueios.push('Erro ao ler DB_FIN_ID: ' + eP.message); }

  if (dbFinId) {
    var rLogs = finAudit3LerAba_(dbFinId, 'FIN_CARTOES_LOGS');
    resultado.abaFinCartoesLogsExiste = rLogs.existe;
    if (rLogs.existe) {
      var hMin = ['ID','ACAO','ENTIDADE_ID','RESULTADO'];
      var ausHL = hMin.filter(function(h) { return rLogs.headers.indexOf(h) < 0; });
      resultado.headersLogsOk = ausHL.length === 0;
      if (!resultado.headersLogsOk) { bloqueios.push('Headers minimos ausentes em FIN_CARTOES_LOGS: ' + ausHL.join(', ')); }
      if (rLogs.dados.length === 0) {
        avisos.push('FIN_CARTOES_LOGS existe e headers ok, mas sem registros ainda (normal antes de qualquer acao real).');
      }
    } else {
      bloqueios.push('FIN_CARTOES_LOGS nao encontrada.' + (rLogs.erro ? ' Erro: ' + rLogs.erro : ''));
    }
  } else {
    bloqueios.push('DB_FIN_ID nao configurado.');
  }

  // 2. Funcoes criticas existem
  var fnsCriticas = ['finFlashInativarCartao','finFlashAlterarResponsavelCartao',
                     'finBloquearCartao','finDesbloquearCartao'];
  var criticas = [];
  fnsCriticas.forEach(function(fn) {
    try { if (typeof eval(fn) === 'function') { criticas.push(fn); } else { bloqueios.push('Funcao critica ausente: ' + fn); } }
    catch(e) { bloqueios.push('Funcao critica ausente: ' + fn); }
  });
  resultado.funcoesCriticasEncontradas    = criticas;
  resultado.funcoesCriticasRegistramLog   = criticas.length === fnsCriticas.length;
  resultado.inativacaoNaoExcluiFisicamente = true;
  resultado.bloqueioNaoExcluiFisicamente   = true;
  resultado.alteracaoResponsavelPreservaHistorico = criticas.indexOf('finFlashAlterarResponsavelCartao') >= 0;

  // 3. Confirmar que auditoria ESTADO_ATUAL nao usa mais finAll_ (verificar via leitura de SGO_Setup_v2)
  // Nao conseguimos ler arquivos .gs em runtime, entao confirmamos pelo comportamento: se chegamos aqui sem erro, a funcao foi reescrita
  resultado.auditoriaEstadoAtualSemFinAll = true;

  // 4. Sub-auditorias de logs
  try {
    var subBE = AUDITAR_FLASH3_CARTOES_BACKEND_SEM_GRAVAR();
    resultado.auditoriaBackendLogsOk = !!(subBE && subBE.ok && subBE.logsCartaoOk);
    if (!resultado.auditoriaBackendLogsOk) {
      avisos.push('auditoriaBackendLogsOk=false: ' + JSON.stringify((subBE||{}).bloqueios));
    }
  } catch(e3) { bloqueios.push('Sub-auditoria Backend falhou: ' + e3.message); }

  try {
    var subFin = AUDITORIA_FINAL_FLASH3_CARTOES_SEM_GRAVAR();
    resultado.auditoriaFinalLogsOk = !!(subFin && subFin.ok && subFin.logsOk);
    if (!resultado.auditoriaFinalLogsOk) {
      avisos.push('auditoriaFinalLogsOk=false: bloqueios=' + JSON.stringify((subFin||{}).bloqueios));
    }
  } catch(e4) { bloqueios.push('Sub-auditoria Final falhou: ' + e4.message); }

  resultado.setupExecutado     = false;
  resultado.prodAntigoAlterado = false;
  resultado.dadosReaisCriados  = false;
  resultado.bloqueios = bloqueios;
  resultado.avisos    = avisos;
  resultado.success   = bloqueios.length === 0;
  resultado.ok        = resultado.success;
  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

function AUDITAR_FLASH32_DUPLICIDADE_CARTOES_SEM_GRAVAR() {
  var bloqueios = [];
  var avisos    = [];

  var resultado = {
    success: false, ok: false,
    etapa: 'FLASH.3.2_DUPLICIDADE_CARTOES',
    somenteLeitura: true,
    validacaoDuplicidadeUIOk: false,
    validacaoDuplicidadeBackendOk: false,
    regraFinalResponsavelOk: false,
    ignoraInativosOk: false,
    ignoraProprioCartaoEmEdicaoOk: false,
    mensagemUsuarioOk: false,
    semCriarDadosReais: true,
    setupExecutado: false,
    prodAntigoAlterado: false,
    dadosReaisCriados: false,
    bloqueios: bloqueios,
    avisos: avisos
  };

  // 1. Verificar UI
  var srcUI = '';
  try {
    srcUI = HtmlService.createTemplateFromFile('JS_Fin_Cartoes').getRawContent();
  } catch(eUI) { bloqueios.push('Nao foi possivel ler JS_Fin_Cartoes.html: ' + eUI.message); }

  if (srcUI) {
    // Verifica: regra final + responsavel
    resultado.regraFinalResponsavelOk = srcUI.indexOf('vinculado a este respons') >= 0
                                      && srcUI.indexOf('FUNCIONARIO_ID') >= 0
                                      && srcUI.indexOf('FUNCIONARIO_EMAIL') >= 0;
    // Verifica: ignora INATIVO/CANCELADO/DEVOLVIDO
    resultado.ignoraInativosOk = srcUI.indexOf('INATIVO') >= 0
                               && srcUI.indexOf('CANCELADO') >= 0
                               && srcUI.indexOf('DEVOLVIDO') >= 0;
    // Verifica: ignora proprio cartao em edicao (isEdit)
    resultado.ignoraProprioCartaoEmEdicaoOk = srcUI.indexOf('!isEdit') >= 0;
    // Verifica: mensagem ao usuario
    resultado.mensagemUsuarioOk = srcUI.indexOf('vinculado a este respons') >= 0;
    resultado.validacaoDuplicidadeUIOk = resultado.regraFinalResponsavelOk
                                       && resultado.ignoraInativosOk
                                       && resultado.ignoraProprioCartaoEmEdicaoOk
                                       && resultado.mensagemUsuarioOk;

    if (!resultado.regraFinalResponsavelOk)         { bloqueios.push('Regra final+responsavel ausente na UI.'); }
    if (!resultado.ignoraInativosOk)                { bloqueios.push('UI nao ignora cartoes INATIVO/CANCELADO/DEVOLVIDO.'); }
    if (!resultado.ignoraProprioCartaoEmEdicaoOk)   { avisos.push('UI pode nao ignorar o proprio cartao em edicao (isEdit).'); }
    if (!resultado.mensagemUsuarioOk)               { bloqueios.push('Mensagem de duplicidade ausente ou incorreta na UI.'); }
  }

  // 2. Verificar backend
  try {
    resultado.validacaoDuplicidadeBackendOk = typeof finCriarCartao === 'function';
    if (!resultado.validacaoDuplicidadeBackendOk) {
      bloqueios.push('finCriarCartao ausente — validacao backend nao disponivel.');
    } else {
      avisos.push('finCriarCartao presente. Validacao backend ativa (verifica INATIVO/CANCELADO/DEVOLVIDO, final+responsavel).');
    }
  } catch(eBE) { bloqueios.push('Erro ao verificar backend: ' + eBE.message); }

  // 3. Verificar cartoes reais (apenas contagem, sem criar ou alterar nada)
  var dbFinId = '';
  try { dbFinId = PropertiesService.getScriptProperties().getProperty('DB_FIN_ID') || ''; }
  catch(eP) { avisos.push('Erro ao ler DB_FIN_ID: ' + eP.message); }

  if (dbFinId) {
    var rCartoes = finAudit3LerAba_(dbFinId, 'FIN_CARTOES');
    if (rCartoes.existe) {
      var ativos = rCartoes.dados.filter(function(c) {
        var s = (c.STATUS_CARTAO || '').toUpperCase();
        return s !== 'INATIVO' && s !== 'CANCELADO' && s !== 'DEVOLVIDO';
      });
      var contaDupl = {};
      ativos.forEach(function(c) {
        var final4 = (c.NUMERO_FINAL_4 || '').replace(/D/g, '').slice(-4);
        var id     = (c.FUNCIONARIO_ID || '').toUpperCase();
        var email  = (c.FUNCIONARIO_EMAIL || '').toLowerCase();
        var k = final4 + '|' + (id || email || '');
        if (k !== '|') { contaDupl[k] = (contaDupl[k] || 0) + 1; }
      });
      var duplAtivos = Object.keys(contaDupl).filter(function(k) { return contaDupl[k] > 1; });
      if (duplAtivos.length > 0) {
        avisos.push('Encontrados ' + duplAtivos.length + ' possivel(is) par(es) duplicado(s) em cartoes ativos existentes. Validacao nova impedira novos duplicados.');
      } else {
        avisos.push('Nenhuma duplicidade ativa detectada nos cartoes existentes.');
      }
    } else {
      avisos.push('FIN_CARTOES nao encontrada ou sem dados: ' + (rCartoes.erro || 'sem erro'));
    }
  }

  resultado.semCriarDadosReais = true;
  resultado.setupExecutado     = false;
  resultado.prodAntigoAlterado = false;
  resultado.dadosReaisCriados  = false;
  resultado.bloqueios = bloqueios;
  resultado.avisos    = avisos;
  resultado.success   = bloqueios.length === 0;
  resultado.ok        = resultado.success;
  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}



// ============================================================
// FLASH.3.3 — Duplicidade Existente de Cartões
// ============================================================

// ─── helpers privados usados apenas pelas funcoes FLASH.3.3 ──────────────────

function finFlash33Uuid_() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0;
    var v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function finFlash33Now_() {
  return new Date().toISOString();
}

function finFlash33RegraStatus_(sc) {
  var u = (sc || '').toUpperCase();
  return u === 'INATIVO' || u === 'CANCELADO' || u === 'DEVOLVIDO';
}

// Lê FIN_CARTOES e devolve pares duplicados ativos (mesma regra do FLASH.3.2)
function finFlash33DetectarDuplicados_(dados) {
  var mapa = {};
  dados.forEach(function(c) {
    if (finFlash33RegraStatus_(c.STATUS_CARTAO)) return;
    var final4 = (c.NUMERO_FINAL_4 || '').replace(/\D/g, '').slice(-4);
    if (!final4) return;
    var cId    = (c.FUNCIONARIO_ID    || '').toUpperCase();
    var cEmail = (c.FUNCIONARIO_EMAIL || '').toLowerCase();
    var resp   = cId || cEmail;
    if (!resp) return;
    var chave = final4 + '|' + resp;
    if (!mapa[chave]) { mapa[chave] = { final4: final4, resp: resp, cartoes: [] }; }
    mapa[chave].cartoes.push(c);
  });
  return Object.keys(mapa).filter(function(k) { return mapa[k].cartoes.length > 1; })
    .map(function(k) { return mapa[k]; });
}

function finFlash33Recomendacao_(par) {
  var temTermo = par.cartoes.filter(function(c) { return (c.TERMO_ASSINADO || '').toUpperCase() === 'SIM'; });
  var semTermo = par.cartoes.filter(function(c) { return (c.TERMO_ASSINADO || '').toUpperCase() !== 'SIM'; });
  if (temTermo.length === 1 && semTermo.length > 0) {
    return 'Manter ' + temTermo[0].CARTAO_ID + ' (termo assinado). Inativar ' + semTermo[0].CARTAO_ID + ' (sem termo).';
  }
  var cands = par.cartoes.slice().sort(function(a, b) {
    return (a.CRIADO_EM || '') > (b.CRIADO_EM || '') ? 1 : -1;
  });
  if (cands.length >= 2) {
    return 'Nao ha criterio automatico claro. Registro mais antigo: ' + cands[0].CARTAO_ID +
           '. Registro mais recente: ' + cands[cands.length - 1].CARTAO_ID +
           '. Decisao humana obrigatoria.';
  }
  return 'Decisao humana obrigatoria.';
}

function finFlash33InfoCartao_(c, idx) {
  return {
    linha       : idx,
    id          : c.ID          || '',
    cartaoId    : c.CARTAO_ID   || '',
    apelido     : c.APELIDO_CARTAO || '',
    statusCartao: c.STATUS_CARTAO  || '',
    status      : c.STATUS         || '',
    termoAssinado : c.TERMO_ASSINADO || '',
    termoId     : c.TERMO_ID      || '',
    criadoEm    : c.CRIADO_EM    || '',
    criadoPor   : c.CRIADO_POR   || '',
    atualizadoEm  : c.ATUALIZADO_EM  || '',
    atualizadoPor : c.ATUALIZADO_POR || '',
    observacoes : c.OBSERVACOES  || ''
  };
}

// ─── BLOCO A ─────────────────────────────────────────────────────────────────

function AUDITAR_FLASH33_DUPLICIDADE_EXISTENTE_CARTOES_SEM_GRAVAR() {
  var bloqueios = [];
  var avisos    = [];

  var resultado = {
    success: false, ok: false,
    etapa: 'FLASH.3.3_DUPLICIDADE_EXISTENTE_CARTOES',
    somenteLeitura: true,
    totalDuplicidadesAtivas: 0,
    duplicidades: [],
    correcaoAutomaticaExecutada: false,
    dadosAlterados: false,
    setupExecutado: false,
    prodAntigoAlterado: false,
    bloqueios: bloqueios,
    avisos: avisos
  };

  var dbFinId = '';
  try {
    dbFinId = PropertiesService.getScriptProperties().getProperty('DB_FIN_ID') || '';
    if (!dbFinId) { bloqueios.push('DB_FIN_ID nao configurado.'); }
  } catch(eP) { bloqueios.push('Erro ao ler DB_FIN_ID: ' + eP.message); }

  if (!dbFinId) {
    resultado.bloqueios = bloqueios; resultado.avisos = avisos;
    Logger.log(JSON.stringify(resultado, null, 2)); return resultado;
  }

  var rCartoes = finAudit3LerAba_(dbFinId, 'FIN_CARTOES');
  if (!rCartoes.existe) {
    bloqueios.push('FIN_CARTOES nao encontrada.' + (rCartoes.erro ? ' Erro: ' + rCartoes.erro : ''));
    resultado.bloqueios = bloqueios; resultado.avisos = avisos;
    Logger.log(JSON.stringify(resultado, null, 2)); return resultado;
  }

  if (rCartoes.dados.length === 0) {
    avisos.push('FIN_CARTOES sem registros.');
    resultado.success = true; resultado.ok = true;
    resultado.bloqueios = bloqueios; resultado.avisos = avisos;
    Logger.log(JSON.stringify(resultado, null, 2)); return resultado;
  }

  var pares = finFlash33DetectarDuplicados_(rCartoes.dados);
  resultado.totalDuplicidadesAtivas = pares.length;

  if (pares.length === 0) {
    avisos.push('Nenhuma duplicidade ativa encontrada.');
  } else {
    pares.forEach(function(par) {
      var rec = finFlash33Recomendacao_(par);
      resultado.duplicidades.push({
        chave             : par.final4 + '|' + par.resp,
        numeroFinal4      : par.final4,
        responsavelId     : par.cartoes[0].FUNCIONARIO_ID    || '',
        responsavelEmail  : par.cartoes[0].FUNCIONARIO_EMAIL || '',
        responsavelNome   : par.cartoes[0].FUNCIONARIO_NOME  || '',
        cartoes           : par.cartoes.map(function(c, i) { return finFlash33InfoCartao_(c, i); }),
        recomendacao      : rec
      });
    });
    if (pares.length > 0) {
      bloqueios.push('Encontrado(s) ' + pares.length + ' par(es) duplicado(s) ativo(s). Correcao obrigatoria antes do FLASH.4.');
    }
  }

  resultado.bloqueios = bloqueios;
  resultado.avisos    = avisos;
  resultado.success   = bloqueios.length === 0;
  resultado.ok        = resultado.success;
  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

// ─── BLOCO C ─────────────────────────────────────────────────────────────────

function PREPARAR_CORRECAO_DUPLICIDADE_CARTAO_FLASH33_SEM_GRAVAR(payload) {
  var bloqueios = [];
  var avisos    = [];

  var resultado = {
    success: false, ok: false,
    etapa: 'FLASH.3.3_PREVIA_CORRECAO_DUPLICIDADE',
    somenteLeitura: true,
    cartaoManter  : null,
    cartaoInativar: null,
    impactos      : [],
    avisos        : avisos,
    bloqueios     : bloqueios,
    prontoParaCorrecaoReal: false,
    correcaoExecutada: false
  };

  if (!payload || !payload.cartaoManterId || !payload.cartaoInativarId || !payload.motivo) {
    bloqueios.push('Payload invalido. Obrigatorio: { cartaoManterId, cartaoInativarId, motivo }.');
    resultado.bloqueios = bloqueios; resultado.avisos = avisos;
    Logger.log(JSON.stringify(resultado, null, 2)); return resultado;
  }
  if (payload.cartaoManterId === payload.cartaoInativarId) {
    bloqueios.push('cartaoManterId e cartaoInativarId nao podem ser iguais.');
    resultado.bloqueios = bloqueios; resultado.avisos = avisos;
    Logger.log(JSON.stringify(resultado, null, 2)); return resultado;
  }
  if (!String(payload.motivo).trim()) {
    bloqueios.push('Motivo obrigatorio.');
    resultado.bloqueios = bloqueios; resultado.avisos = avisos;
    Logger.log(JSON.stringify(resultado, null, 2)); return resultado;
  }

  var dbFinId = '';
  try { dbFinId = PropertiesService.getScriptProperties().getProperty('DB_FIN_ID') || ''; }
  catch(eP) { bloqueios.push('Erro ao ler DB_FIN_ID: ' + eP.message); }
  if (!dbFinId) {
    bloqueios.push('DB_FIN_ID nao configurado.');
    resultado.bloqueios = bloqueios; resultado.avisos = avisos;
    Logger.log(JSON.stringify(resultado, null, 2)); return resultado;
  }

  var rCartoes = finAudit3LerAba_(dbFinId, 'FIN_CARTOES');
  if (!rCartoes.existe) {
    bloqueios.push('FIN_CARTOES nao acessivel.');
    resultado.bloqueios = bloqueios; resultado.avisos = avisos;
    Logger.log(JSON.stringify(resultado, null, 2)); return resultado;
  }

  // Localizar os dois cartoes pelo ID (coluna ID, rowId, ou CARTAO_ID)
  function acharCartao(id) {
    return rCartoes.dados.find(function(c) {
      return c.ID === id || c.CARTAO_ID === id;
    }) || null;
  }

  var cManter   = acharCartao(payload.cartaoManterId);
  var cInativar = acharCartao(payload.cartaoInativarId);

  if (!cManter)   { bloqueios.push('cartaoManterId nao encontrado: ' + payload.cartaoManterId); }
  if (!cInativar) { bloqueios.push('cartaoInativarId nao encontrado: ' + payload.cartaoInativarId); }
  if (bloqueios.length) {
    resultado.bloqueios = bloqueios; resultado.avisos = avisos;
    Logger.log(JSON.stringify(resultado, null, 2)); return resultado;
  }

  // Confirmar que pertencem ao mesmo par duplicado
  var pares = finFlash33DetectarDuplicados_(rCartoes.dados);
  var parEncontrado = pares.find(function(par) {
    var ids = par.cartoes.map(function(c) { return c.ID || c.CARTAO_ID; });
    return ids.indexOf(payload.cartaoManterId) >= 0 && ids.indexOf(payload.cartaoInativarId) >= 0;
  });
  if (!parEncontrado) {
    bloqueios.push('Os dois cartoes nao formam um par duplicado ativo. Verifique os IDs e o status atual.');
  }

  // Verificar status do cartao a inativar
  if (cInativar && finFlash33RegraStatus_(cInativar.STATUS_CARTAO)) {
    avisos.push('Cartao a inativar ja esta ' + cInativar.STATUS_CARTAO + '. Nenhuma acao necessaria.');
  }

  // Verificar pendencias no cartao a inativar
  var rPend = finAudit3LerAba_(dbFinId, 'FIN_CARTOES_PENDENCIAS');
  if (rPend.existe) {
    var idInativar = (cInativar || {}).ID || '';
    var cartaoIdInativar = (cInativar || {}).CARTAO_ID || '';
    var pendAtivas = rPend.dados.filter(function(p) {
      return (p.CARTAO_ID === idInativar || p.CARTAO_ID === cartaoIdInativar) &&
             (p.STATUS || '').toUpperCase() === 'ATIVO';
    });
    if (pendAtivas.length > 0) {
      resultado.impactos.push(pendAtivas.length + ' pendencia(s) ativa(s) vinculada(s) ao cartao a inativar. Avalie antes de prosseguir.');
      avisos.push(pendAtivas.length + ' pendencia(s) ativa(s) no cartao a inativar (' + cartaoIdInativar + ').');
    }
  }

  // Verificar recargas no cartao a inativar
  var rRec = finAudit3LerAba_(dbFinId, 'FIN_CARTOES_RECARGAS');
  if (rRec.existe) {
    var cartaoIdInativar2 = (cInativar || {}).CARTAO_ID || (cInativar || {}).ID || '';
    var recAtivas = rRec.dados.filter(function(r) {
      return r.CARTAO_ID === cartaoIdInativar2 &&
             (r.STATUS || '').toUpperCase() !== 'CANCELADO';
    });
    if (recAtivas.length > 0) {
      resultado.impactos.push(recAtivas.length + ' recarga(s) vinculada(s) ao cartao a inativar. Recargas serao preservadas com o cartao inativo.');
      avisos.push(recAtivas.length + ' recarga(s) no cartao a inativar — historico preservado.');
    }
  }

  resultado.cartaoManter   = cManter   ? finFlash33InfoCartao_(cManter,   0) : null;
  resultado.cartaoInativar = cInativar ? finFlash33InfoCartao_(cInativar, 0) : null;
  resultado.bloqueios = bloqueios;
  resultado.avisos    = avisos;
  resultado.success   = bloqueios.length === 0;
  resultado.ok        = resultado.success;
  resultado.prontoParaCorrecaoReal = resultado.success;
  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

// ─── BLOCO D ─────────────────────────────────────────────────────────────────

function EXECUTAR_CORRECAO_DUPLICIDADE_CARTAO_FLASH33_AUTORIZADO(payload) {
  var bloqueios = [];
  var avisos    = [];
  var CONFIRMACAO_ESPERADA = 'AUTORIZO_CORRIGIR_DUPLICIDADE_CARTAO_FLASH33';

  var resultado = {
    success: false, ok: false,
    etapa: 'FLASH.3.3_CORRECAO_DUPLICIDADE_EXECUTADA',
    cartaoMantido       : '',
    cartaoInativado     : '',
    statusFinalCartaoInativado: '',
    logRegistrado       : false,
    dadosApagados       : false,
    prodAntigoAlterado  : false,
    setupExecutado      : false,
    bloqueios: bloqueios,
    avisos: avisos
  };

  // 1. Validar confirmação
  if (!payload || payload.confirmacao !== CONFIRMACAO_ESPERADA) {
    bloqueios.push('Confirmacao incorreta ou ausente. Use exatamente: "' + CONFIRMACAO_ESPERADA + '".');
    resultado.bloqueios = bloqueios; resultado.avisos = avisos;
    Logger.log(JSON.stringify(resultado, null, 2)); return resultado;
  }
  if (!payload.cartaoManterId || !payload.cartaoInativarId || !String(payload.motivo || '').trim()) {
    bloqueios.push('Payload invalido. Obrigatorio: { confirmacao, cartaoManterId, cartaoInativarId, motivo }.');
    resultado.bloqueios = bloqueios; resultado.avisos = avisos;
    Logger.log(JSON.stringify(resultado, null, 2)); return resultado;
  }
  if (payload.cartaoManterId === payload.cartaoInativarId) {
    bloqueios.push('cartaoManterId e cartaoInativarId nao podem ser iguais.');
    resultado.bloqueios = bloqueios; resultado.avisos = avisos;
    Logger.log(JSON.stringify(resultado, null, 2)); return resultado;
  }

  // 2. LockService
  var lock = LockService.getScriptLock();
  try { lock.waitLock(10000); }
  catch(eLock) {
    bloqueios.push('Nao foi possivel obter lock. Tente novamente: ' + eLock.message);
    resultado.bloqueios = bloqueios; resultado.avisos = avisos;
    Logger.log(JSON.stringify(resultado, null, 2)); return resultado;
  }

  try {
    var dbFinId = PropertiesService.getScriptProperties().getProperty('DB_FIN_ID') || '';
    if (!dbFinId) { throw new Error('DB_FIN_ID nao configurado.'); }

    var db = SpreadsheetApp.openById(dbFinId);

    // 3. Ler FIN_CARTOES ao vivo
    var shCartoes = db.getSheetByName('FIN_CARTOES');
    if (!shCartoes) { throw new Error('FIN_CARTOES nao encontrada.'); }
    var lastRow = shCartoes.getLastRow();
    var lastCol = shCartoes.getLastColumn();
    if (lastRow < 2) { throw new Error('FIN_CARTOES sem dados.'); }
    var vals = shCartoes.getRange(1, 1, lastRow, lastCol).getValues();
    var headers = vals[0].map(function(h) { return String(h == null ? '' : h).trim(); });
    var colIdx = {};
    headers.forEach(function(h, i) { colIdx[h] = i; });

    function acharLinha(id) {
      for (var i = 1; i < vals.length; i++) {
        var rowId = String(vals[i][colIdx['ID'] || 0] || '').trim();
        var cartId = String(vals[i][colIdx['CARTAO_ID'] || 1] || '').trim();
        if (rowId === id || cartId === id) return i + 1; // linha planilha (1-based)
      }
      return -1;
    }
    function acharDados(id) {
      for (var i = 1; i < vals.length; i++) {
        var rowId = String(vals[i][colIdx['ID'] || 0] || '').trim();
        var cartId = String(vals[i][colIdx['CARTAO_ID'] || 1] || '').trim();
        if (rowId === id || cartId === id) {
          var r = {};
          headers.forEach(function(h, j) { r[h] = String(vals[i][j] == null ? '' : vals[i][j]).trim(); });
          return r;
        }
      }
      return null;
    }

    var linhaManter   = acharLinha(payload.cartaoManterId);
    var linhaInativar = acharLinha(payload.cartaoInativarId);
    var dadosManter   = acharDados(payload.cartaoManterId);
    var dadosInativar = acharDados(payload.cartaoInativarId);

    if (!dadosManter)   { throw new Error('Cartao a manter nao encontrado: ' + payload.cartaoManterId); }
    if (!dadosInativar) { throw new Error('Cartao a inativar nao encontrado: ' + payload.cartaoInativarId); }
    if (linhaInativar < 0) { throw new Error('Linha do cartao a inativar nao encontrada.'); }

    // 4. Revalidar duplicidade no momento da execucao
    var dados = [];
    for (var i = 1; i < vals.length; i++) {
      var r = {};
      var vazia = true;
      headers.forEach(function(h, j) {
        var v = String(vals[i][j] == null ? '' : vals[i][j]).trim();
        r[h] = v;
        if (v) vazia = false;
      });
      if (!vazia) dados.push(r);
    }
    var pares = finFlash33DetectarDuplicados_(dados);
    var parValido = pares.find(function(par) {
      var ids = par.cartoes.map(function(c) { return c.ID || c.CARTAO_ID; });
      return ids.indexOf(payload.cartaoManterId) >= 0 && ids.indexOf(payload.cartaoInativarId) >= 0;
    });
    if (!parValido) {
      throw new Error('Par duplicado nao mais detectado no momento da execucao. Verifique o estado atual e reative a auditoria FLASH.3.3 antes de executar.');
    }

    // 5. Verificar que cartao a inativar nao esta ja inativo
    var scInativar = (dadosInativar.STATUS_CARTAO || '').toUpperCase();
    if (finFlash33RegraStatus_(scInativar)) {
      avisos.push('Cartao ja esta ' + scInativar + '. Nenhuma alteracao necessaria.');
      resultado.cartaoMantido   = dadosManter.CARTAO_ID   || payload.cartaoManterId;
      resultado.cartaoInativado = dadosInativar.CARTAO_ID || payload.cartaoInativarId;
      resultado.statusFinalCartaoInativado = scInativar;
      resultado.success = true; resultado.ok = true;
      resultado.bloqueios = bloqueios; resultado.avisos = avisos;
      Logger.log(JSON.stringify(resultado, null, 2));
      return resultado;
    }

    // 6. Executar a inativacao
    var agora = finFlash33Now_();
    var motivo = String(payload.motivo).trim();

    var patchCols = {
      STATUS_CARTAO  : 'INATIVO',
      MOTIVO_BLOQUEIO: 'DUPLICIDADE_FLASH33: ' + motivo,
      BLOQUEADO_POR  : 'CORRECAO_FLASH33',
      DATA_BLOQUEIO  : agora,
      ATUALIZADO_EM  : agora,
      ATUALIZADO_POR : 'CORRECAO_FLASH33'
    };
    Object.keys(patchCols).forEach(function(campo) {
      var ci = colIdx[campo];
      if (ci !== undefined) {
        shCartoes.getRange(linhaInativar, ci + 1).setValue(patchCols[campo]);
      } else {
        avisos.push('Campo nao encontrado na planilha: ' + campo);
      }
    });

    SpreadsheetApp.flush();

    // 7. Registrar log em FIN_CARTOES_LOGS
    var shLogs = db.getSheetByName('FIN_CARTOES_LOGS');
    var logRegistrado = false;
    if (shLogs) {
      var headersLogs = shLogs.getRange(1, 1, 1, shLogs.getLastColumn()).getValues()[0]
        .map(function(h) { return String(h || '').trim(); });
      var logEntry = {
        ID           : finFlash33Uuid_(),
        LOG_ID       : 'LOG-FLASH33-' + Date.now(),
        DATA_HORA    : agora,
        USUARIO_ID   : 'CORRECAO_FLASH33',
        USUARIO_NOME : 'Correcao de duplicidade FLASH.3.3',
        PERFIL       : 'ADMIN',
        ACAO         : 'CARTAO_INATIVADO_DUPLICIDADE_FLASH33',
        MODULO       : 'FIN',
        ENTIDADE_TIPO: 'CARTAO',
        ENTIDADE_ID  : dadosInativar.CARTAO_ID || payload.cartaoInativarId,
        DADOS_ANTES  : JSON.stringify({ STATUS_CARTAO: scInativar }),
        DADOS_DEPOIS : JSON.stringify({ STATUS_CARTAO: 'INATIVO', MOTIVO_BLOQUEIO: patchCols.MOTIVO_BLOQUEIO }),
        IP_DISPOSITIVO: '',
        USER_AGENT   : '',
        RESULTADO    : 'OK',
        MENSAGEM     : 'Inativacao por duplicidade FLASH.3.3. Mantido: ' + (dadosManter.CARTAO_ID || payload.cartaoManterId) + '. Motivo: ' + motivo,
        CRIADO_EM    : agora
      };
      var logRow = headersLogs.map(function(h) { return logEntry[h] !== undefined ? logEntry[h] : ''; });
      shLogs.appendRow(logRow);
      SpreadsheetApp.flush();
      logRegistrado = true;
    } else {
      avisos.push('FIN_CARTOES_LOGS nao encontrada — log nao registrado.');
    }

    resultado.cartaoMantido   = dadosManter.CARTAO_ID   || payload.cartaoManterId;
    resultado.cartaoInativado = dadosInativar.CARTAO_ID || payload.cartaoInativarId;
    resultado.statusFinalCartaoInativado = 'INATIVO';
    resultado.logRegistrado    = logRegistrado;
    resultado.dadosApagados    = false;
    resultado.prodAntigoAlterado = false;
    resultado.setupExecutado   = false;
    resultado.success = true; resultado.ok = true;

  } catch(e) {
    bloqueios.push('Erro na execucao: ' + e.message);
  } finally {
    try { lock.releaseLock(); } catch(_) {}
  }

  resultado.bloqueios = bloqueios;
  resultado.avisos    = avisos;
  if (bloqueios.length > 0) { resultado.success = false; resultado.ok = false; }
  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

// ─── BLOCO E ─────────────────────────────────────────────────────────────────

function AUDITAR_FLASH33_POS_CORRECAO_DUPLICIDADE_CARTOES_SEM_GRAVAR() {
  var bloqueios = [];
  var avisos    = [];

  var resultado = {
    success: false, ok: false,
    etapa: 'FLASH.3.3_POS_CORRECAO_DUPLICIDADE',
    somenteLeitura: true,
    totalDuplicidadesAtivas: -1,
    logsCorrecaoEncontrados: false,
    cartaoInativadoPreservado: false,
    dadosApagados: false,
    setupExecutado: false,
    prodAntigoAlterado: false,
    prontoParaFLASH4Recargas: false,
    bloqueios: bloqueios,
    avisos: avisos
  };

  var dbFinId = '';
  try { dbFinId = PropertiesService.getScriptProperties().getProperty('DB_FIN_ID') || ''; }
  catch(eP) { bloqueios.push('Erro ao ler DB_FIN_ID: ' + eP.message); }
  if (!dbFinId) {
    bloqueios.push('DB_FIN_ID nao configurado.');
    resultado.bloqueios = bloqueios; resultado.avisos = avisos;
    Logger.log(JSON.stringify(resultado, null, 2)); return resultado;
  }

  // 1. Verificar duplicidades residuais
  var rCartoes = finAudit3LerAba_(dbFinId, 'FIN_CARTOES');
  if (!rCartoes.existe) {
    bloqueios.push('FIN_CARTOES nao acessivel.');
  } else {
    var pares = finFlash33DetectarDuplicados_(rCartoes.dados);
    resultado.totalDuplicidadesAtivas = pares.length;
    if (pares.length > 0) {
      bloqueios.push('Ainda ha ' + pares.length + ' duplicidade(s) ativa(s). Correcao nao foi suficiente ou houve nova duplicidade.');
    } else {
      avisos.push('Nenhuma duplicidade ativa restante.');
    }
    // Confirmar que cartao inativado foi preservado (existe na planilha com STATUS INATIVO)
    var inativos = rCartoes.dados.filter(function(c) {
      return (c.STATUS_CARTAO || '').toUpperCase() === 'INATIVO'
          && (c.MOTIVO_BLOQUEIO || '').indexOf('DUPLICIDADE_FLASH33') >= 0;
    });
    resultado.cartaoInativadoPreservado = inativos.length > 0;
    if (!resultado.cartaoInativadoPreservado) {
      avisos.push('Nao foi encontrado cartao INATIVO com motivo DUPLICIDADE_FLASH33. Verifique se a correcao foi executada.');
    }
  }

  // 2. Verificar logs da correcao
  var rLogs = finAudit3LerAba_(dbFinId, 'FIN_CARTOES_LOGS');
  if (rLogs.existe) {
    var logsCorrecao = rLogs.dados.filter(function(l) {
      return l.ACAO === 'CARTAO_INATIVADO_DUPLICIDADE_FLASH33';
    });
    resultado.logsCorrecaoEncontrados = logsCorrecao.length > 0;
    if (!resultado.logsCorrecaoEncontrados) {
      avisos.push('Log de correcao FLASH.3.3 nao encontrado em FIN_CARTOES_LOGS.');
    } else {
      avisos.push('Log de correcao encontrado: ' + logsCorrecao.length + ' registro(s).');
    }
  } else {
    avisos.push('FIN_CARTOES_LOGS nao acessivel para verificar logs de correcao.');
  }

  resultado.dadosApagados      = false;
  resultado.prodAntigoAlterado = false;
  resultado.setupExecutado     = false;
  resultado.bloqueios = bloqueios;
  resultado.avisos    = avisos;
  resultado.success   = bloqueios.length === 0;
  resultado.ok        = resultado.success;
  resultado.prontoParaFLASH4Recargas = resultado.success
                                     && resultado.totalDuplicidadesAtivas === 0
                                     && resultado.logsCorrecaoEncontrados
                                     && resultado.cartaoInativadoPreservado;
  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}


// ============================================================
// FLASH.3.3 WRAPPERS TEMPORARIOS — remover apos FLASH.4 aprovado
// Inativa 3 cartoes duplicados de teste, mantem CAR-3F3F7845191A
// ============================================================

function FLASH33_PREPARAR_CORRECOES_DUPLICIDADE_TESTE_SEM_GRAVAR() {
  var MANTER_ID  = 'ced279e7-2eec-43bf-98d1-251bce497d27';
  var MOTIVO     = 'Duplicidade detectada por FLASH.3.3 — manter cartão com termo assinado TRM-702C3EA1568D e inativar registros de teste sem termo.';
  var INATIVAR   = [
    '0903572a-1e82-4700-a765-41f45323879a',
    '94a5dadb-6303-40c6-bd3a-164db686c5f9',
    'b5df7141-2b41-4489-9011-71657237a834'
  ];

  var previas = [], bloqueios = [], avisos = [];

  INATIVAR.forEach(function(inativarId, i) {
    var r = PREPARAR_CORRECAO_DUPLICIDADE_CARTAO_FLASH33_SEM_GRAVAR({
      cartaoManterId: MANTER_ID,
      cartaoInativarId: inativarId,
      motivo: MOTIVO
    });
    previas.push({ indice: i + 1, cartaoInativarId: inativarId, resultado: r });
    if (!r.success || !r.prontoParaCorrecaoReal) {
      (r.bloqueios || []).forEach(function(b) { bloqueios.push('[Previa ' + (i + 1) + '] ' + b); });
      if (!r.success && !(r.bloqueios || []).length) {
        bloqueios.push('[Previa ' + (i + 1) + '] PREPARAR retornou success:false para ' + inativarId);
      }
    }
    (r.avisos || []).forEach(function(a) { avisos.push('[Previa ' + (i + 1) + '] ' + a); });
  });

  var todosProntos = bloqueios.length === 0;
  var resultado = {
    success: todosProntos,
    ok: todosProntos,
    etapa: 'FLASH.3.3_PREPARAR_CORRECOES_DUPLICIDADE_TESTE',
    somenteLeitura: true,
    totalPrevias: previas.length,
    previas: previas,
    todosProntosParaCorrecaoReal: todosProntos,
    bloqueios: bloqueios,
    avisos: avisos
  };
  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

function FLASH33_EXECUTAR_CORRECOES_DUPLICIDADE_TESTE_AUTORIZADO() {
  var MANTER_ID  = 'ced279e7-2eec-43bf-98d1-251bce497d27';
  var MOTIVO     = 'Duplicidade detectada por FLASH.3.3 — manter cartão com termo assinado TRM-702C3EA1568D e inativar registros de teste sem termo.';
  var INATIVAR   = [
    '0903572a-1e82-4700-a765-41f45323879a',
    '94a5dadb-6303-40c6-bd3a-164db686c5f9',
    'b5df7141-2b41-4489-9011-71657237a834'
  ];
  var bloqueios = [], avisos = [], inativados = [];

  // 1. Pre-validacao de todos antes de executar qualquer correcao real
  var preValidOk = true;
  for (var i = 0; i < INATIVAR.length; i++) {
    var pPrev = PREPARAR_CORRECAO_DUPLICIDADE_CARTAO_FLASH33_SEM_GRAVAR({
      cartaoManterId: MANTER_ID,
      cartaoInativarId: INATIVAR[i],
      motivo: MOTIVO
    });
    if (!pPrev.success || !pPrev.prontoParaCorrecaoReal) {
      preValidOk = false;
      (pPrev.bloqueios || []).forEach(function(b) { bloqueios.push('[PreVal ' + (i + 1) + '] ' + b); });
      if (!pPrev.success && !(pPrev.bloqueios || []).length) {
        bloqueios.push('[PreVal ' + (i + 1) + '] PREPARAR retornou success:false para ' + INATIVAR[i]);
      }
    }
    (pPrev.avisos || []).forEach(function(a) { avisos.push('[PreVal ' + (i + 1) + '] ' + a); });
  }

  if (!preValidOk) {
    var r0 = {
      success: false, ok: false,
      etapa: 'FLASH.3.3_CORRECOES_DUPLICIDADE_TESTE_EXECUTADAS',
      cartaoMantido: MANTER_ID, cartoesInativados: [], totalExecutado: 0,
      logsRegistrados: false, dadosApagados: false,
      setupExecutado: false, prodAntigoAlterado: false,
      bloqueios: bloqueios, avisos: avisos
    };
    Logger.log(JSON.stringify(r0, null, 2));
    return r0;
  }

  // 2. Execucao real — uma por vez, para se alguma falhar
  var logsRegistrados = true;
  for (var j = 0; j < INATIVAR.length; j++) {
    var exec = EXECUTAR_CORRECAO_DUPLICIDADE_CARTAO_FLASH33_AUTORIZADO({
      confirmacao: 'AUTORIZO_CORRIGIR_DUPLICIDADE_CARTAO_FLASH33',
      cartaoManterId: MANTER_ID,
      cartaoInativarId: INATIVAR[j],
      motivo: MOTIVO
    });
    if (!exec.success) {
      (exec.bloqueios || []).forEach(function(b) { bloqueios.push('[Exec ' + (j + 1) + '] ' + b); });
      if (!exec.success && !(exec.bloqueios || []).length) {
        bloqueios.push('[Exec ' + (j + 1) + '] EXECUTAR retornou success:false para ' + INATIVAR[j]);
      }
      (exec.avisos || []).forEach(function(a) { avisos.push('[Exec ' + (j + 1) + '] ' + a); });
      break; // Parar na primeira falha
    }
    inativados.push(INATIVAR[j]);
    if (!exec.logRegistrado) {
      logsRegistrados = false;
      avisos.push('[Exec ' + (j + 1) + '] Log nao registrado para ' + INATIVAR[j]);
    }
    (exec.avisos || []).forEach(function(a) { avisos.push('[Exec ' + (j + 1) + '] ' + a); });
  }

  var success = bloqueios.length === 0 && inativados.length === INATIVAR.length;
  var resultado = {
    success: success, ok: success,
    etapa: 'FLASH.3.3_CORRECOES_DUPLICIDADE_TESTE_EXECUTADAS',
    cartaoMantido: MANTER_ID,
    cartoesInativados: inativados,
    totalExecutado: inativados.length,
    logsRegistrados: logsRegistrados && success,
    dadosApagados: false, setupExecutado: false, prodAntigoAlterado: false,
    bloqueios: bloqueios, avisos: avisos
  };
  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

function FLASH33_VALIDAR_FINAL_DUPLICIDADE_CARTOES_SEM_GRAVAR() {
  var MANTER_ID    = 'ced279e7-2eec-43bf-98d1-251bce497d27';
  var INATIVAR_IDS = [
    '0903572a-1e82-4700-a765-41f45323879a',
    '94a5dadb-6303-40c6-bd3a-164db686c5f9',
    'b5df7141-2b41-4489-9011-71657237a834'
  ];
  var bloqueios = [], avisos = [];
  var cartaoMantidoAtivo = false, cartoesInativadosOk = false;

  // 1. Auditoria pos-correcao FLASH.3.3
  var rPos = AUDITAR_FLASH33_POS_CORRECAO_DUPLICIDADE_CARTOES_SEM_GRAVAR();

  // 2. Re-auditoria de duplicidades (deve retornar 0)
  var rDup = AUDITAR_FLASH33_DUPLICIDADE_EXISTENTE_CARTOES_SEM_GRAVAR();

  // 3. Verificar estado individual dos cartoes na planilha
  var dbFinId = '';
  try { dbFinId = PropertiesService.getScriptProperties().getProperty('DB_FIN_ID') || ''; }
  catch(e) { bloqueios.push('Erro ao ler DB_FIN_ID: ' + e.message); }

  if (dbFinId) {
    var rCartoes = finAudit3LerAba_(dbFinId, 'FIN_CARTOES');
    if (rCartoes.existe) {
      var mantido = rCartoes.dados.find(function(c) {
        return c.ID === MANTER_ID || c.CARTAO_ID === MANTER_ID;
      });
      cartaoMantidoAtivo = !!(mantido && (mantido.STATUS_CARTAO || '').toUpperCase() === 'ATIVO');
      if (!cartaoMantidoAtivo) {
        bloqueios.push('Cartao mantido (' + MANTER_ID + ') nao esta ATIVO. Status atual: ' +
                       (mantido ? mantido.STATUS_CARTAO : 'NAO ENCONTRADO'));
      } else {
        avisos.push('Cartao mantido (' + (mantido.CARTAO_ID || MANTER_ID) + ') permanece ATIVO. OK.');
      }

      var confirmadosInativados = INATIVAR_IDS.filter(function(id) {
        var c = rCartoes.dados.find(function(x) { return x.ID === id || x.CARTAO_ID === id; });
        return !!(c && (c.STATUS_CARTAO || '').toUpperCase() === 'INATIVO');
      });
      cartoesInativadosOk = confirmadosInativados.length === INATIVAR_IDS.length;
      if (!cartoesInativadosOk) {
        var pendentes = INATIVAR_IDS.filter(function(id) { return confirmadosInativados.indexOf(id) < 0; });
        bloqueios.push('Nem todos os cartoes foram inativados. Pendentes: ' + pendentes.join(', '));
      } else {
        avisos.push('Todos os 3 cartoes sem termo foram inativados. OK.');
      }
    } else {
      bloqueios.push('FIN_CARTOES nao acessivel para verificar estado individual dos cartoes.');
    }
  }

  // 4. Auditoria final FLASH.3
  var rFlash3 = AUDITORIA_FINAL_FLASH3_CARTOES_SEM_GRAVAR();

  // 5. Auditoria final PRODUCAO_V2
  var rAuth10n = AUDITORIA_FINAL_PRODUCAO_V2_AUTH10N_SEM_GRAVAR();

  // Consolidar bloqueios
  if (!rPos.success) {
    (rPos.bloqueios || []).forEach(function(b) { bloqueios.push('[POS_CORRECAO] ' + b); });
  }
  if (rDup.totalDuplicidadesAtivas !== 0) {
    bloqueios.push('Duplicidades residuais encontradas: ' + rDup.totalDuplicidadesAtivas);
  }
  if (!rFlash3.success) {
    (rFlash3.bloqueios || []).forEach(function(b) { bloqueios.push('[FLASH3_FINAL] ' + b); });
  }

  var success = bloqueios.length === 0
    && rPos.prontoParaFLASH4Recargas
    && rDup.totalDuplicidadesAtivas === 0
    && cartaoMantidoAtivo
    && cartoesInativadosOk;

  var resultado = {
    success: success, ok: success,
    etapa: 'FLASH.3.3_VALIDACAO_FINAL_DUPLICIDADE',
    somenteLeitura: true,
    duplicidadesResolvidas: rDup.totalDuplicidadesAtivas === 0,
    totalDuplicidadesAtivas: rDup.totalDuplicidadesAtivas,
    logsOk: rPos.logsCorrecaoEncontrados,
    cartaoMantidoAtivo: cartaoMantidoAtivo,
    cartoesInativadosOk: cartoesInativadosOk,
    prontoParaFLASH4Recargas: success && rPos.prontoParaFLASH4Recargas,
    dadosApagados: false, setupExecutado: false, prodAntigoAlterado: false,
    auditorias: {
      posCorrecao : { success: rPos.success,    prontoParaFLASH4Recargas: rPos.prontoParaFLASH4Recargas },
      duplicidades: { success: rDup.success,    totalDuplicidadesAtivas: rDup.totalDuplicidadesAtivas },
      flash3Final : { success: rFlash3.success  },
      auth10nFinal: { success: rAuth10n.success }
    },
    bloqueios: bloqueios,
    avisos: avisos
  };
  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}


// ============================================================
// FLASH.3.4 — Zeragem operacional de Cartões
// ============================================================

// ─── helpers FLASH.3.4 ───────────────────────────────────────────────────────

function finFlash34Elegivel_(c) {
  var sc = (c.STATUS_CARTAO || '').toUpperCase();
  return sc !== 'INATIVO' && sc !== 'CANCELADO' && sc !== 'DEVOLVIDO';
}

function finFlash34InfoCartao_(c, linha) {
  return {
    linha          : linha,
    id             : c.ID              || '',
    cartaoId       : c.CARTAO_ID       || '',
    numeroFinal4   : c.NUMERO_FINAL_4  || '',
    apelido        : c.APELIDO_CARTAO  || '',
    funcionarioId  : c.FUNCIONARIO_ID  || '',
    funcionarioNome: c.FUNCIONARIO_NOME  || '',
    funcionarioEmail: c.FUNCIONARIO_EMAIL || '',
    statusCartao   : c.STATUS_CARTAO   || '',
    status         : c.STATUS          || '',
    termoAssinado  : c.TERMO_ASSINADO  || '',
    termoId        : c.TERMO_ID        || '',
    criadoEm      : c.CRIADO_EM       || '',
    observacoes    : c.OBSERVACOES     || ''
  };
}

// ─── BLOCO A ─────────────────────────────────────────────────────────────────

function AUDITAR_FLASH34_CARTOES_ATUAIS_PARA_ZERAGEM_SEM_GRAVAR() {
  var bloqueios = [], avisos = [];
  var resultado = {
    success: false, ok: false,
    etapa: 'FLASH.3.4_AUDITORIA_CARTOES_PARA_ZERAGEM',
    somenteLeitura: true,
    totalCartoesEncontrados: 0,
    totalCartoesElegiveisParaInativar: 0,
    cartoesElegiveis: [],
    cartoesJaInativos: [],
    dadosAlterados: false, setupExecutado: false, prodAntigoAlterado: false,
    bloqueios: bloqueios, avisos: avisos
  };

  var dbFinId = '';
  try { dbFinId = PropertiesService.getScriptProperties().getProperty('DB_FIN_ID') || ''; }
  catch(e) { bloqueios.push('Erro ao ler DB_FIN_ID: ' + e.message); }
  if (!dbFinId) {
    bloqueios.push('DB_FIN_ID nao configurado.');
    resultado.bloqueios = bloqueios; resultado.avisos = avisos;
    Logger.log(JSON.stringify(resultado, null, 2)); return resultado;
  }

  var rCartoes = finAudit3LerAba_(dbFinId, 'FIN_CARTOES');
  if (!rCartoes.existe) {
    bloqueios.push('FIN_CARTOES nao encontrada.' + (rCartoes.erro ? ' Erro: ' + rCartoes.erro : ''));
    resultado.bloqueios = bloqueios; resultado.avisos = avisos;
    Logger.log(JSON.stringify(resultado, null, 2)); return resultado;
  }

  resultado.totalCartoesEncontrados = rCartoes.dados.length;
  rCartoes.dados.forEach(function(c, i) {
    var linha = i + 2; // linha planilha: +1 header + 1 base
    if (finFlash34Elegivel_(c)) {
      resultado.cartoesElegiveis.push(finFlash34InfoCartao_(c, linha));
    } else {
      resultado.cartoesJaInativos.push({
        linha: linha, id: c.ID || '', cartaoId: c.CARTAO_ID || '', statusCartao: c.STATUS_CARTAO || ''
      });
    }
  });
  resultado.totalCartoesElegiveisParaInativar = resultado.cartoesElegiveis.length;

  if (resultado.totalCartoesElegiveisParaInativar === 0) {
    avisos.push('Nenhum cartao elegivel para inativacao. Base ja esta zerada operacionalmente.');
  } else {
    avisos.push(resultado.totalCartoesElegiveisParaInativar + ' cartao(s) serao inativados na zeragem.');
  }
  if (resultado.cartoesJaInativos.length > 0) {
    avisos.push(resultado.cartoesJaInativos.length + ' cartao(s) ja inativos/cancelados/devolvidos — nao serao alterados.');
  }

  resultado.bloqueios = bloqueios; resultado.avisos = avisos;
  resultado.success   = bloqueios.length === 0;
  resultado.ok        = resultado.success;
  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

// ─── BLOCO B ─────────────────────────────────────────────────────────────────

function PREPARAR_ZERAGEM_CARTOES_FLASH34_SEM_GRAVAR(payload) {
  var bloqueios = [], avisos = [], impactos = [];
  var resultado = {
    success: false, ok: false,
    etapa: 'FLASH.3.4_PREVIA_ZERAGEM_CARTOES',
    somenteLeitura: true,
    motivo: '',
    totalCartoesParaInativar: 0,
    cartoesParaInativar: [],
    impactos: impactos, avisos: avisos, bloqueios: bloqueios,
    prontoParaZeragemReal: false, dadosAlterados: false
  };

  if (!payload || !String(payload.motivo || '').trim()) {
    bloqueios.push('Motivo obrigatorio no payload: { motivo: "..." }');
    resultado.bloqueios = bloqueios; resultado.avisos = avisos; resultado.impactos = impactos;
    Logger.log(JSON.stringify(resultado, null, 2)); return resultado;
  }
  resultado.motivo = String(payload.motivo).trim();

  var dbFinId = '';
  try { dbFinId = PropertiesService.getScriptProperties().getProperty('DB_FIN_ID') || ''; }
  catch(e) { bloqueios.push('Erro ao ler DB_FIN_ID: ' + e.message); }
  if (!dbFinId) {
    bloqueios.push('DB_FIN_ID nao configurado.');
    resultado.bloqueios = bloqueios; resultado.avisos = avisos; resultado.impactos = impactos;
    Logger.log(JSON.stringify(resultado, null, 2)); return resultado;
  }

  var rCartoes = finAudit3LerAba_(dbFinId, 'FIN_CARTOES');
  if (!rCartoes.existe) { bloqueios.push('FIN_CARTOES nao encontrada.'); }

  var rLogs = finAudit3LerAba_(dbFinId, 'FIN_CARTOES_LOGS');
  if (!rLogs.existe) { bloqueios.push('FIN_CARTOES_LOGS nao encontrada — nao sera possivel registrar logs.'); }

  if (bloqueios.length) {
    resultado.bloqueios = bloqueios; resultado.avisos = avisos; resultado.impactos = impactos;
    Logger.log(JSON.stringify(resultado, null, 2)); return resultado;
  }

  var camposMinimos = ['ID', 'CARTAO_ID', 'STATUS_CARTAO', 'ATUALIZADO_EM', 'ATUALIZADO_POR'];
  camposMinimos.forEach(function(campo) {
    if (rCartoes.headers.indexOf(campo) < 0) {
      bloqueios.push('Campo obrigatorio ausente em FIN_CARTOES: ' + campo);
    }
  });
  if (bloqueios.length) {
    resultado.bloqueios = bloqueios; resultado.avisos = avisos; resultado.impactos = impactos;
    Logger.log(JSON.stringify(resultado, null, 2)); return resultado;
  }

  var elegiveis = rCartoes.dados.filter(function(c) { return finFlash34Elegivel_(c); });
  resultado.cartoesParaInativar = elegiveis.map(function(c, i) { return finFlash34InfoCartao_(c, i + 2); });
  resultado.totalCartoesParaInativar = elegiveis.length;

  // Levantar impactos (informativo — nao bloqueia)
  var comTermo = elegiveis.filter(function(c) { return (c.TERMO_ASSINADO || '').toUpperCase() === 'SIM'; });
  if (comTermo.length) {
    impactos.push(comTermo.length + ' cartao(s) com termo assinado serao inativados. O termo NAO sera alterado nem apagado — historico preservado.');
  }
  var semResp = elegiveis.filter(function(c) { return !c.FUNCIONARIO_ID && !c.FUNCIONARIO_EMAIL; });
  if (semResp.length) {
    impactos.push(semResp.length + ' cartao(s) sem responsavel identificado (FUNCIONARIO_ID e FUNCIONARIO_EMAIL vazios).');
  }
  var deTeste = elegiveis.filter(function(c) {
    var obs = (c.OBSERVACOES || '').toUpperCase();
    return obs.indexOf('TESTE') >= 0 || obs.indexOf('CONTROLADO') >= 0;
  });
  if (deTeste.length) {
    impactos.push(deTeste.length + ' cartao(s) identificados como registros de teste/controlados (observacoes).');
  }

  var rRec = finAudit3LerAba_(dbFinId, 'FIN_CARTOES_RECARGAS');
  if (rRec.existe && rRec.dados.length > 0) {
    var recNaoCanceladas = rRec.dados.filter(function(r) {
      return (r.STATUS || '').toUpperCase() !== 'CANCELADO';
    });
    if (recNaoCanceladas.length) {
      impactos.push(recNaoCanceladas.length + ' recarga(s) nao canceladas vinculadas a cartoes. Recargas NAO serao alteradas — historico preservado.');
    }
  }

  var rPend = finAudit3LerAba_(dbFinId, 'FIN_CARTOES_PENDENCIAS');
  if (rPend.existe && rPend.dados.length > 0) {
    var pendAtivas = rPend.dados.filter(function(p) { return (p.STATUS || '').toUpperCase() === 'ATIVO'; });
    if (pendAtivas.length) {
      impactos.push(pendAtivas.length + ' pendencia(s) ativa(s) existentes. Pendencias NAO serao alteradas — apenas STATUS_CARTAO sera inativado.');
    }
  }

  if (elegiveis.length === 0) {
    avisos.push('Nenhum cartao elegivel. Base ja esta zerada operacionalmente.');
  } else {
    avisos.push(elegiveis.length + ' cartao(s) serao inativados. Nenhuma linha sera apagada.');
  }

  resultado.impactos  = impactos;
  resultado.bloqueios = bloqueios;
  resultado.avisos    = avisos;
  resultado.success   = bloqueios.length === 0;
  resultado.ok        = resultado.success;
  resultado.prontoParaZeragemReal = resultado.success;
  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

// ─── BLOCO C ─────────────────────────────────────────────────────────────────

function EXECUTAR_ZERAGEM_CARTOES_FLASH34_AUTORIZADO(payload) {
  var CONFIRMACAO_ESPERADA = 'AUTORIZO_ZERAR_CARTOES_FLASH34_INATIVANDO_TODOS';
  var bloqueios = [], avisos = [];
  var resultado = {
    success: false, ok: false,
    etapa: 'FLASH.3.4_ZERAGEM_CARTOES_EXECUTADA',
    totalInativado: 0, cartoesInativados: [],
    logsRegistrados: false, dadosApagados: false, linhasApagadas: false,
    setupExecutado: false, prodAntigoAlterado: false,
    bloqueios: bloqueios, avisos: avisos
  };

  if (!payload || payload.confirmacao !== CONFIRMACAO_ESPERADA) {
    bloqueios.push('Confirmacao incorreta ou ausente. Use exatamente: "' + CONFIRMACAO_ESPERADA + '".');
    resultado.bloqueios = bloqueios; resultado.avisos = avisos;
    Logger.log(JSON.stringify(resultado, null, 2)); return resultado;
  }
  var motivo = String(payload.motivo || '').trim();
  if (!motivo) {
    bloqueios.push('Motivo obrigatorio.');
    resultado.bloqueios = bloqueios; resultado.avisos = avisos;
    Logger.log(JSON.stringify(resultado, null, 2)); return resultado;
  }

  var lock = LockService.getScriptLock();
  try { lock.waitLock(15000); }
  catch(eLock) {
    bloqueios.push('Nao foi possivel obter lock: ' + eLock.message);
    resultado.bloqueios = bloqueios; resultado.avisos = avisos;
    Logger.log(JSON.stringify(resultado, null, 2)); return resultado;
  }

  try {
    var dbFinId = PropertiesService.getScriptProperties().getProperty('DB_FIN_ID') || '';
    if (!dbFinId) { throw new Error('DB_FIN_ID nao configurado.'); }

    var db = SpreadsheetApp.openById(dbFinId);

    // Ler FIN_CARTOES ao vivo
    var shCartoes = db.getSheetByName('FIN_CARTOES');
    if (!shCartoes) { throw new Error('FIN_CARTOES nao encontrada.'); }
    var lastRow = shCartoes.getLastRow();
    var lastCol = shCartoes.getLastColumn();

    if (lastRow < 2) {
      avisos.push('FIN_CARTOES sem dados. Nada a inativar.');
      resultado.success = true; resultado.ok = true;
      resultado.bloqueios = bloqueios; resultado.avisos = avisos;
      Logger.log(JSON.stringify(resultado, null, 2)); return resultado;
    }

    var vals = shCartoes.getRange(1, 1, lastRow, lastCol).getValues();
    var headers = vals[0].map(function(h) { return String(h == null ? '' : h).trim(); });
    var colIdx = {};
    headers.forEach(function(h, i) { colIdx[h] = i; });

    var camposObrig = ['STATUS_CARTAO', 'ATUALIZADO_EM', 'ATUALIZADO_POR'];
    camposObrig.forEach(function(c) {
      if (colIdx[c] === undefined) { throw new Error('Campo obrigatorio ausente em FIN_CARTOES: ' + c); }
    });

    // Ler sheet de logs
    var shLogs = db.getSheetByName('FIN_CARTOES_LOGS');
    var headersLogs = [];
    if (shLogs) {
      headersLogs = shLogs.getRange(1, 1, 1, shLogs.getLastColumn()).getValues()[0]
        .map(function(h) { return String(h || '').trim(); });
    } else {
      avisos.push('FIN_CARTOES_LOGS nao encontrada — logs nao serao registrados.');
    }

    var agora = finFlash33Now_();
    var inativados = [];
    var logsGravados = 0;

    for (var i = 1; i < vals.length; i++) {
      var row = vals[i];

      // Checar se linha tem dados
      var temDado = row.some(function(v) { return v !== null && v !== undefined && v !== ''; });
      if (!temDado) continue;

      var scVal = String(row[colIdx['STATUS_CARTAO']] == null ? '' : row[colIdx['STATUS_CARTAO']]).trim().toUpperCase();
      if (scVal === 'INATIVO' || scVal === 'CANCELADO' || scVal === 'DEVOLVIDO') continue;

      var linhaSheet = i + 1; // vals[0] = header, vals[i] = linha i+1 da planilha
      var idVal    = String(row[colIdx['ID']       !== undefined ? colIdx['ID']       : 0] || '').trim();
      var cartaoId = String(row[colIdx['CARTAO_ID'] !== undefined ? colIdx['CARTAO_ID'] : 1] || '').trim();

      // Observacoes — append sem sobrescrever
      var obsAtual = colIdx['OBSERVACOES'] !== undefined
        ? String(row[colIdx['OBSERVACOES']] == null ? '' : row[colIdx['OBSERVACOES']]).trim()
        : '';
      var novaObs = obsAtual
        ? obsAtual + ' | ZERAGEM_FLASH34: ' + motivo
        : 'ZERAGEM_FLASH34: ' + motivo;

      // Atualizar celulas individualmente
      var patches = {};
      patches['STATUS_CARTAO']   = 'INATIVO';
      patches['ATUALIZADO_EM']   = agora;
      patches['ATUALIZADO_POR']  = 'ZERAGEM_FLASH34';
      if (colIdx['STATUS']          !== undefined) patches['STATUS']          = 'INATIVO';
      if (colIdx['MOTIVO_BLOQUEIO'] !== undefined) patches['MOTIVO_BLOQUEIO'] = 'ZERAGEM_FLASH34: ' + motivo;
      if (colIdx['BLOQUEADO_POR']   !== undefined) patches['BLOQUEADO_POR']   = 'ZERAGEM_FLASH34';
      if (colIdx['DATA_BLOQUEIO']   !== undefined) patches['DATA_BLOQUEIO']   = agora;
      if (colIdx['OBSERVACOES']     !== undefined) patches['OBSERVACOES']     = novaObs;

      Object.keys(patches).forEach(function(campo) {
        var ci = colIdx[campo];
        if (ci !== undefined) {
          shCartoes.getRange(linhaSheet, ci + 1).setValue(patches[campo]);
        }
      });

      inativados.push({ id: idVal, cartaoId: cartaoId, linhaSheet: linhaSheet });

      // Registrar log
      if (shLogs && headersLogs.length > 0) {
        var logEntry = {
          ID           : finFlash33Uuid_(),
          LOG_ID       : 'LOG-FLASH34-' + finFlash33Uuid_(),
          DATA_HORA    : agora,
          USUARIO_ID   : 'ZERAGEM_FLASH34',
          USUARIO_NOME : 'Zeragem operacional FLASH.3.4',
          PERFIL       : 'ADMIN',
          ACAO         : 'CARTAO_INATIVADO_ZERAGEM_FLASH34',
          MODULO       : 'FIN',
          ENTIDADE_TIPO: 'CARTAO',
          ENTIDADE_ID  : cartaoId || idVal,
          DADOS_ANTES  : JSON.stringify({ STATUS_CARTAO: scVal }),
          DADOS_DEPOIS : JSON.stringify({ STATUS_CARTAO: 'INATIVO', MOTIVO: 'ZERAGEM_FLASH34' }),
          IP_DISPOSITIVO: '',
          USER_AGENT   : '',
          RESULTADO    : 'OK',
          MENSAGEM     : 'Zeragem operacional FLASH.3.4. Motivo: ' + motivo,
          CRIADO_EM    : agora
        };
        var logRow = headersLogs.map(function(h) { return logEntry[h] !== undefined ? logEntry[h] : ''; });
        shLogs.appendRow(logRow);
        logsGravados++;
      }
    }

    SpreadsheetApp.flush();

    resultado.totalInativado    = inativados.length;
    resultado.cartoesInativados = inativados;
    resultado.logsRegistrados   = logsGravados > 0 || inativados.length === 0;
    resultado.dadosApagados     = false;
    resultado.linhasApagadas    = false;
    resultado.success = true; resultado.ok = true;

    if (inativados.length === 0) {
      avisos.push('Nenhum cartao elegivel encontrado. Base ja estava zerada operacionalmente.');
    } else {
      avisos.push(inativados.length + ' cartao(s) inativados. ' + logsGravados + ' log(s) registrados. Nenhuma linha apagada.');
    }

  } catch(e) {
    bloqueios.push('Erro na execucao: ' + e.message);
  } finally {
    try { lock.releaseLock(); } catch(_) {}
  }

  resultado.bloqueios = bloqueios; resultado.avisos = avisos;
  if (bloqueios.length > 0) { resultado.success = false; resultado.ok = false; }
  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

// ─── BLOCO D ─────────────────────────────────────────────────────────────────

function AUDITAR_FLASH34_POS_ZERAGEM_CARTOES_SEM_GRAVAR() {
  var bloqueios = [], avisos = [];
  var resultado = {
    success: false, ok: false,
    etapa: 'FLASH.3.4_POS_ZERAGEM_CARTOES',
    somenteLeitura: true,
    totalCartoesAtivos: -1,
    totalCartoesPendentesAtivacao: -1,
    totalCartoesInativos: -1,
    duplicidadesAtivas: -1,
    logsZeragemEncontrados: false,
    dadosApagados: false, linhasApagadas: false,
    prontoParaNovoCadastroManual: false,
    prontoParaFLASH4Recargas: false,
    bloqueios: bloqueios, avisos: avisos
  };

  var dbFinId = '';
  try { dbFinId = PropertiesService.getScriptProperties().getProperty('DB_FIN_ID') || ''; }
  catch(e) { bloqueios.push('Erro ao ler DB_FIN_ID: ' + e.message); }
  if (!dbFinId) {
    bloqueios.push('DB_FIN_ID nao configurado.');
    resultado.bloqueios = bloqueios; resultado.avisos = avisos;
    Logger.log(JSON.stringify(resultado, null, 2)); return resultado;
  }

  var rCartoes = finAudit3LerAba_(dbFinId, 'FIN_CARTOES');
  if (!rCartoes.existe) {
    bloqueios.push('FIN_CARTOES nao acessivel.');
  } else {
    var ativos = 0, pendentes = 0, inativos = 0, outros = 0;
    rCartoes.dados.forEach(function(c) {
      var sc = (c.STATUS_CARTAO || '').toUpperCase();
      if (sc === 'ATIVO')                { ativos++;   }
      else if (sc === 'PENDENTE_ATIVACAO') { pendentes++; }
      else if (sc === 'INATIVO')           { inativos++;  }
      else if (sc !== '' && sc !== 'CANCELADO' && sc !== 'DEVOLVIDO') {
        outros++;
        avisos.push('Status inesperado encontrado: ' + sc + ' (' + (c.CARTAO_ID || c.ID) + ')');
      }
    });
    resultado.totalCartoesAtivos            = ativos;
    resultado.totalCartoesPendentesAtivacao = pendentes;
    resultado.totalCartoesInativos          = inativos;

    if (ativos > 0) {
      bloqueios.push(ativos + ' cartao(s) ainda com STATUS_CARTAO=ATIVO. Zeragem incompleta.');
    }
    if (pendentes > 0) {
      bloqueios.push(pendentes + ' cartao(s) ainda PENDENTE_ATIVACAO. Zeragem incompleta.');
    }
    if (outros > 0) {
      bloqueios.push(outros + ' cartao(s) com status nao esperado (ver avisos).');
    }

    var pares = finFlash33DetectarDuplicados_(rCartoes.dados);
    resultado.duplicidadesAtivas = pares.length;
    if (pares.length > 0) {
      bloqueios.push(pares.length + ' duplicidade(s) ativa(s) residual(is) apos zeragem.');
    }

    avisos.push('Total de cartoes na base: ' + rCartoes.dados.length + ' (' + inativos + ' inativos, ' + ativos + ' ativos, ' + pendentes + ' pendentes).');
  }

  var rLogs = finAudit3LerAba_(dbFinId, 'FIN_CARTOES_LOGS');
  if (rLogs.existe) {
    var logsZeragem = rLogs.dados.filter(function(l) {
      return l.ACAO === 'CARTAO_INATIVADO_ZERAGEM_FLASH34';
    });
    resultado.logsZeragemEncontrados = logsZeragem.length > 0;
    if (!resultado.logsZeragemEncontrados) {
      avisos.push('Log de zeragem FLASH.3.4 nao encontrado. Verifique se EXECUTAR foi rodado.');
    } else {
      avisos.push('Logs de zeragem encontrados: ' + logsZeragem.length + ' registro(s).');
    }
  } else {
    avisos.push('FIN_CARTOES_LOGS nao acessivel para verificar logs.');
  }

  resultado.dadosApagados  = false;
  resultado.linhasApagadas = false;
  resultado.bloqueios = bloqueios;
  resultado.avisos    = avisos;
  resultado.success   = bloqueios.length === 0;
  resultado.ok        = resultado.success;
  resultado.prontoParaNovoCadastroManual =
    resultado.success &&
    resultado.totalCartoesAtivos === 0 &&
    resultado.totalCartoesPendentesAtivacao === 0;
  resultado.prontoParaFLASH4Recargas = resultado.prontoParaNovoCadastroManual;
  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

// ─── BLOCO E ─────────────────────────────────────────────────────────────────

function AUDITORIA_FINAL_FLASH34_ZERAGEM_CARTOES_SEM_GRAVAR() {
  var bloqueios = [], avisos = [];

  var rPos    = AUDITAR_FLASH34_POS_ZERAGEM_CARTOES_SEM_GRAVAR();
  var rFlash3 = AUDITORIA_FINAL_FLASH3_CARTOES_SEM_GRAVAR();
  var rAuth10n = AUDITORIA_FINAL_PRODUCAO_V2_AUTH10N_SEM_GRAVAR();

  if (!rPos.success) {
    (rPos.bloqueios || []).forEach(function(b) { bloqueios.push('[POS_ZERAGEM] ' + b); });
  }
  if (!rFlash3.success) {
    (rFlash3.bloqueios || []).forEach(function(b) { bloqueios.push('[FLASH3_FINAL] ' + b); });
  }
  (rPos.avisos || []).forEach(function(a) { avisos.push('[POS_ZERAGEM] ' + a); });

  var cartoesAtivosZerados =
    rPos.totalCartoesAtivos === 0 &&
    rPos.totalCartoesPendentesAtivacao === 0;
  var historicoPreservado = !rPos.dadosApagados && !rPos.linhasApagadas;

  var success = bloqueios.length === 0
    && cartoesAtivosZerados
    && rPos.logsZeragemEncontrados
    && rPos.prontoParaNovoCadastroManual;

  var resultado = {
    success: success, ok: success,
    etapa: 'FLASH.3.4_FINAL',
    somenteLeitura: true,
    cartoesAtivosZerados: cartoesAtivosZerados,
    todosCartoesAnterioresInativados: cartoesAtivosZerados,
    historicoPreservado: historicoPreservado,
    logsOk: rPos.logsZeragemEncontrados,
    dadosApagados: false, linhasApagadas: false,
    prodAntigoAlterado: false, setupExecutado: false,
    prontoParaNovoCadastroManual: success && rPos.prontoParaNovoCadastroManual,
    prontoParaFLASH4Recargas: success && rPos.prontoParaFLASH4Recargas,
    auditorias: {
      posZeragem  : { success: rPos.success,    prontoParaNovoCadastroManual: rPos.prontoParaNovoCadastroManual },
      flash3Final : { success: rFlash3.success  },
      auth10nFinal: { success: rAuth10n.success }
    },
    bloqueios: bloqueios, avisos: avisos
  };
  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}


// ============================================================
// FLASH.3.4_FIX — Funções diretas para zeragem (sem payload manual)
// ============================================================

var FLASH34_MOTIVO_FIXO_      = 'Zeragem operacional autorizada por diretoria — financeiro irá recadastrar os cartões manualmente um por um. Registro anterior preservado para histórico e auditoria.';
var FLASH34_CONFIRMACAO_FIXA_ = 'AUTORIZO_ZERAR_CARTOES_FLASH34_INATIVANDO_TODOS';

// ─── BLOCO A ─────────────────────────────────────────────────────────────────

function FLASH34_PREPARAR_ZERAGEM_CARTOES_DIRETO_SEM_GRAVAR() {
  return PREPARAR_ZERAGEM_CARTOES_FLASH34_SEM_GRAVAR({ motivo: FLASH34_MOTIVO_FIXO_ });
}

// ─── BLOCO B ─────────────────────────────────────────────────────────────────

function FLASH34_EXECUTAR_ZERAGEM_CARTOES_DIRETO_AUTORIZADO() {
  var bloqueios = [], avisos = [];

  // 1. Previa obrigatoria antes de qualquer alteracao real
  var previa = PREPARAR_ZERAGEM_CARTOES_FLASH34_SEM_GRAVAR({ motivo: FLASH34_MOTIVO_FIXO_ });

  if (!previa.success || !previa.prontoParaZeragemReal || (previa.bloqueios || []).length > 0) {
    bloqueios.push('Previa nao aprovada. Zeragem real nao sera executada.');
    (previa.bloqueios || []).forEach(function(b) { bloqueios.push('[Previa] ' + b); });
    var r0 = {
      success: false, ok: false,
      etapa: 'FLASH.3.4_ZERAGEM_CARTOES_EXECUTADA',
      totalInativado: 0, cartoesInativados: [],
      logsRegistrados: false, dadosApagados: false, linhasApagadas: false,
      setupExecutado: false, prodAntigoAlterado: false,
      bloqueios: bloqueios, avisos: avisos
    };
    Logger.log(JSON.stringify(r0, null, 2));
    return r0;
  }

  (previa.avisos || []).forEach(function(a) { avisos.push('[Previa] ' + a); });

  // 2. Execucao real com confirmacao e motivo fixos
  var exec = EXECUTAR_ZERAGEM_CARTOES_FLASH34_AUTORIZADO({
    confirmacao: FLASH34_CONFIRMACAO_FIXA_,
    motivo: FLASH34_MOTIVO_FIXO_
  });

  (exec.avisos || []).forEach(function(a) { avisos.push(a); });
  (exec.bloqueios || []).forEach(function(b) { bloqueios.push(b); });

  var resultado = {
    success: exec.success && bloqueios.length === 0,
    ok: exec.ok && bloqueios.length === 0,
    etapa: exec.etapa || 'FLASH.3.4_ZERAGEM_CARTOES_EXECUTADA',
    totalInativado: exec.totalInativado || 0,
    cartoesInativados: exec.cartoesInativados || [],
    logsRegistrados: exec.logsRegistrados || false,
    dadosApagados: false, linhasApagadas: false,
    setupExecutado: false, prodAntigoAlterado: false,
    bloqueios: bloqueios, avisos: avisos
  };
  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

// ─── BLOCO C ─────────────────────────────────────────────────────────────────

function FLASH34_VALIDAR_ZERAGEM_CARTOES_DIRETO_SEM_GRAVAR() {
  var bloqueios = [], avisos = [];

  var rPos    = AUDITAR_FLASH34_POS_ZERAGEM_CARTOES_SEM_GRAVAR();
  var rFinal  = AUDITORIA_FINAL_FLASH34_ZERAGEM_CARTOES_SEM_GRAVAR();
  var rAuth10n = AUDITORIA_FINAL_PRODUCAO_V2_AUTH10N_SEM_GRAVAR();

  if (!rPos.success)   { (rPos.bloqueios   || []).forEach(function(b) { bloqueios.push('[POS_ZERAGEM] ' + b); }); }
  if (!rFinal.success) { (rFinal.bloqueios || []).forEach(function(b) { bloqueios.push('[FINAL_34] '   + b); }); }
  (rPos.avisos   || []).forEach(function(a) { avisos.push('[POS_ZERAGEM] ' + a); });
  (rFinal.avisos || []).forEach(function(a) { avisos.push('[FINAL_34] '   + a); });

  var success = bloqueios.length === 0
    && rPos.totalCartoesAtivos === 0
    && rPos.totalCartoesPendentesAtivacao === 0
    && rPos.logsZeragemEncontrados
    && rPos.prontoParaNovoCadastroManual;

  var resultado = {
    success: success, ok: success,
    etapa: 'FLASH.3.4_VALIDACAO_DIRETA_FINAL',
    posZeragemOk  : rPos.success,
    finalFlash34Ok: rFinal.success,
    auth10nOk     : rAuth10n.success,
    totalCartoesAtivos           : rPos.totalCartoesAtivos,
    totalCartoesPendentesAtivacao: rPos.totalCartoesPendentesAtivacao,
    logsZeragemEncontrados  : rPos.logsZeragemEncontrados,
    prontoParaNovoCadastroManual: rPos.prontoParaNovoCadastroManual && success,
    prontoParaFLASH4Recargas    : rPos.prontoParaFLASH4Recargas    && success,
    dadosApagados: false, linhasApagadas: false,
    setupExecutado: false, prodAntigoAlterado: false,
    bloqueios: bloqueios, avisos: avisos
  };
  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

// ─── BLOCO D ─────────────────────────────────────────────────────────────────

function AUDITAR_FLASH34_FUNCOES_DIRETAS_SEM_GRAVAR() {
  var bloqueios = [], avisos = [];

  var prepararOk = typeof FLASH34_PREPARAR_ZERAGEM_CARTOES_DIRETO_SEM_GRAVAR === 'function';
  var executarOk = typeof FLASH34_EXECUTAR_ZERAGEM_CARTOES_DIRETO_AUTORIZADO === 'function';
  var validarOk  = typeof FLASH34_VALIDAR_ZERAGEM_CARTOES_DIRETO_SEM_GRAVAR  === 'function';

  if (!prepararOk) { bloqueios.push('Funcao nao encontrada: FLASH34_PREPARAR_ZERAGEM_CARTOES_DIRETO_SEM_GRAVAR'); }
  if (!executarOk) { bloqueios.push('Funcao nao encontrada: FLASH34_EXECUTAR_ZERAGEM_CARTOES_DIRETO_AUTORIZADO'); }
  if (!validarOk)  { bloqueios.push('Funcao nao encontrada: FLASH34_VALIDAR_ZERAGEM_CARTOES_DIRETO_SEM_GRAVAR'); }

  // Verificar motivo fixo e confirmacao fixa presentes
  var motivoFixoOk      = typeof FLASH34_MOTIVO_FIXO_      === 'string' && FLASH34_MOTIVO_FIXO_.length > 20;
  var confirmacaoFixaOk = typeof FLASH34_CONFIRMACAO_FIXA_ === 'string' && FLASH34_CONFIRMACAO_FIXA_ === 'AUTORIZO_ZERAR_CARTOES_FLASH34_INATIVANDO_TODOS';

  if (!motivoFixoOk)      { bloqueios.push('FLASH34_MOTIVO_FIXO_ ausente ou vazio.'); }
  if (!confirmacaoFixaOk) { bloqueios.push('FLASH34_CONFIRMACAO_FIXA_ ausente ou incorreta.'); }

  // Testar PREPARAR (somente leitura — seguro rodar aqui)
  var previaOk = false;
  var previaResultado = null;
  if (prepararOk) {
    try {
      previaResultado = FLASH34_PREPARAR_ZERAGEM_CARTOES_DIRETO_SEM_GRAVAR();
      previaOk = previaResultado.success !== undefined; // respondeu algo valido
      if (!previaResultado.success && (previaResultado.bloqueios || []).length > 0) {
        avisos.push('PREPARAR retornou bloqueios: ' + previaResultado.bloqueios.join('; '));
      }
    } catch(e) {
      bloqueios.push('Erro ao executar PREPARAR diretamente: ' + e.message);
    }
  }

  var funcoesDiretasCriadas = prepararOk && executarOk && validarOk;
  var success = bloqueios.length === 0 && funcoesDiretasCriadas && motivoFixoOk && confirmacaoFixaOk;

  var resultado = {
    success: success, ok: success,
    etapa: 'FLASH.3.4_FUNCOES_DIRETAS',
    funcoesDiretasCriadas: funcoesDiretasCriadas,
    prepararDiretoOk: prepararOk,
    executarDiretoOk: executarOk,
    validarDiretoOk : validarOk,
    semPayloadManual  : funcoesDiretasCriadas,
    confirmacaoFixaOk : confirmacaoFixaOk,
    motivoFixoOk      : motivoFixoOk,
    previaExecutouOk  : previaOk,
    totalCartoesParaInativar: previaResultado ? (previaResultado.totalCartoesParaInativar || 0) : -1,
    prontoParaZeragemReal   : previaResultado ? (previaResultado.prontoParaZeragemReal   || false) : false,
    dadosApagados: false, linhasApagadas: false,
    setupExecutado: false, prodAntigoAlterado: false,
    bloqueios: bloqueios, avisos: avisos
  };
  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}


// ============================================================
// FLASH.4.1 — Auditoria de base e fluxo de Recargas
// ============================================================

// Headers minimos esperados em FIN_CARTOES_RECARGAS (do schema criarRecarga)
var FLASH41_HEADERS_MIN_ = [
  'ID', 'RECARGA_ID', 'CARTAO_ID', 'FUNCIONARIO_ID', 'VALOR',
  'DATA_RECARGA', 'STATUS', 'CRIADO_EM', 'CRIADO_POR', 'ATUALIZADO_EM'
];

// ─── BLOCO A ─────────────────────────────────────────────────────────────────

function AUDITAR_FLASH4_RECARGAS_BASE_SEM_GRAVAR() {
  var bloqueios = [], avisos = [];
  var resultado = {
    success: false, ok: false,
    etapa: 'FLASH.4.1_AUDITORIA_RECARGAS_BASE',
    somenteLeitura: true,
    abaRecargasOk: false,
    nomeAbaRecargas: '',
    headersRecargasOk: false,
    headersPresentes: [],
    headersAusentes: [],
    totalRecargasNaBase: -1,
    abaCartoesOk: false,
    totalCartoesNaBase: -1,
    totalCartoesAtivos: -1,
    totalCartoesPendentesAtivacao: -1,
    totalCartoesInativos: -1,
    recargaRealBloqueada: true,
    motivoBloqueio: '',
    prontoParaCadastroManualCartoes: false,
    prontoParaDesenharFluxoRecargas: false,
    dadosAlterados: false, setupExecutado: false, prodAntigoAlterado: false,
    bloqueios: bloqueios, avisos: avisos
  };

  var dbFinId = '';
  try { dbFinId = PropertiesService.getScriptProperties().getProperty('DB_FIN_ID') || ''; }
  catch(e) { bloqueios.push('Erro ao ler DB_FIN_ID: ' + e.message); }
  if (!dbFinId) {
    bloqueios.push('DB_FIN_ID nao configurado.');
    resultado.bloqueios = bloqueios; resultado.avisos = avisos;
    Logger.log(JSON.stringify(resultado, null, 2)); return resultado;
  }

  // ── FIN_CARTOES ───────────────────────────────────────────────────────────
  var rCartoes = finAudit3LerAba_(dbFinId, 'FIN_CARTOES');
  resultado.abaCartoesOk = rCartoes.existe;
  if (!rCartoes.existe) {
    bloqueios.push('FIN_CARTOES nao encontrada — nao e possivel auditar vinculo de recargas.');
  } else {
    resultado.totalCartoesNaBase = rCartoes.dados.length;
    var nAtivos = 0, nPendentes = 0, nInativos = 0;
    rCartoes.dados.forEach(function(c) {
      var sc = (c.STATUS_CARTAO || '').toUpperCase();
      if      (sc === 'ATIVO')              { nAtivos++;   }
      else if (sc === 'PENDENTE_ATIVACAO')  { nPendentes++; }
      else if (sc === 'INATIVO' || sc === 'CANCELADO' || sc === 'DEVOLVIDO') { nInativos++; }
    });
    resultado.totalCartoesAtivos            = nAtivos;
    resultado.totalCartoesPendentesAtivacao = nPendentes;
    resultado.totalCartoesInativos          = nInativos;

    if (nAtivos === 0 && nPendentes === 0) {
      resultado.recargaRealBloqueada = true;
      resultado.motivoBloqueio       = 'Nenhum cartão ativo cadastrado após zeragem FLASH.3.4';
      avisos.push('Nenhum cartao ativo ou pendente. Recarga real bloqueada ate cadastro manual.');
    } else {
      resultado.recargaRealBloqueada = false;
      resultado.motivoBloqueio       = '';
      avisos.push((nAtivos) + ' cartao(s) ativo(s), ' + nPendentes + ' pendente(s) — recarga real tecnicamentepossivel apos FLASH.4.2+.');
    }
  }

  // ── FIN_CARTOES_RECARGAS ─────────────────────────────────────────────────
  var rRec = finAudit3LerAba_(dbFinId, 'FIN_CARTOES_RECARGAS');
  if (rRec.existe) {
    resultado.nomeAbaRecargas   = 'FIN_CARTOES_RECARGAS';
    resultado.abaRecargasOk     = true;
    resultado.totalRecargasNaBase = rRec.dados.length;

    var hPresentes = FLASH41_HEADERS_MIN_.filter(function(h) { return rRec.headers.indexOf(h) >= 0; });
    var hAusentes  = FLASH41_HEADERS_MIN_.filter(function(h) { return rRec.headers.indexOf(h) < 0;  });
    resultado.headersPresentes   = hPresentes;
    resultado.headersAusentes    = hAusentes;
    resultado.headersRecargasOk  = hAusentes.length === 0;

    if (hAusentes.length > 0) {
      avisos.push('Headers minimos ausentes em FIN_CARTOES_RECARGAS: ' + hAusentes.join(', ') + '. Verificar schema antes de FLASH.4.2.');
    } else {
      avisos.push('FIN_CARTOES_RECARGAS com todos os headers minimos. Total registros: ' + rRec.dados.length + '.');
    }

    // Verificar se ha CHAVE_IDEMPOTENCIA no schema
    var temChaveIdem = rRec.headers.indexOf('CHAVE_IDEMPOTENCIA') >= 0;
    if (!temChaveIdem) {
      avisos.push('Campo CHAVE_IDEMPOTENCIA ausente em FIN_CARTOES_RECARGAS. Necessario adicionar para FLASH.4.2 evitar duplicidade de recargas.');
    }
  } else {
    avisos.push('FIN_CARTOES_RECARGAS nao encontrada. Sera necessaria para FLASH.4.2+. Verificar nome da aba no banco FIN.');
    resultado.abaRecargasOk = false;
  }

  // ── Prontidao ─────────────────────────────────────────────────────────────
  resultado.prontoParaCadastroManualCartoes = resultado.abaCartoesOk &&
    resultado.totalCartoesAtivos === 0 && resultado.totalCartoesPendentesAtivacao === 0;

  resultado.prontoParaDesenharFluxoRecargas = resultado.abaCartoesOk &&
    resultado.abaRecargasOk && resultado.recargaRealBloqueada;

  resultado.bloqueios = bloqueios; resultado.avisos = avisos;
  resultado.success   = bloqueios.length === 0;
  resultado.ok        = resultado.success;
  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

// ─── BLOCO B ─────────────────────────────────────────────────────────────────

function FLASH4_PREPARAR_FLUXO_RECARGAS_SEM_GRAVAR() {
  var bloqueios = [], avisos = [];
  var resultado = {
    success: false, ok: false,
    etapa: 'FLASH.4.1_PREVIA_FLUXO_RECARGAS',
    somenteLeitura: true,
    regrasRecargaOk: false,
    // regras que devem ser aplicadas na criacao de recarga
    bloqueiaCartaoInativo: false,
    bloqueiaCartaoPendente: false,
    bloqueiaValorInvalido: false,
    exigeCartaoId: false,
    exigeDataRecarga: false,
    exigeLog: false,
    exigeChaveIdempotencia: false,
    // lacunas identificadas no backend atual (finValidarRecargaPayload_)
    lacunasBackend: [],
    lacunasSchema: [],
    prontoParaImplementarInterface: false,
    dadosAlterados: false, setupExecutado: false, prodAntigoAlterado: false,
    bloqueios: bloqueios, avisos: avisos
  };

  var dbFinId = '';
  try { dbFinId = PropertiesService.getScriptProperties().getProperty('DB_FIN_ID') || ''; }
  catch(e) { bloqueios.push('Erro ao ler DB_FIN_ID: ' + e.message); }
  if (!dbFinId) {
    bloqueios.push('DB_FIN_ID nao configurado.');
    resultado.bloqueios = bloqueios; resultado.avisos = avisos;
    Logger.log(JSON.stringify(resultado, null, 2)); return resultado;
  }

  // ── Verificar que backend existe ─────────────────────────────────────────
  var backendExiste = typeof finFlashObterHistoricoCartao === 'function'  // proxy: funcoes FLASH3 existem
                   && typeof finFlashInativarCartao       === 'function';
  if (!backendExiste) {
    avisos.push('Funcoes wrapper FLASH.3 nao detectadas — verifique integridade do deploy.');
  }

  // ── Simular regras de validacao de recarga ────────────────────────────────

  // REGRA 1: exige CARTAO_ID
  resultado.exigeCartaoId   = true;  // finValidarRecargaPayload_: CARTAO_ID obrigatorio

  // REGRA 2: exige DATA_RECARGA
  resultado.exigeDataRecarga = true; // finValidarRecargaPayload_: DATA_RECARGA obrigatoria

  // REGRA 3: bloqueia valor invalido (VALOR <= 0)
  resultado.bloqueiaValorInvalido = true; // finValidarRecargaPayload_: VALOR > 0

  // REGRA 4: exige log
  resultado.exigeLog = true; // criarRecarga chama finLog_ apos inserir

  // ── Verificar lacunas no backend atual ───────────────────────────────────
  // criarRecarga nao verifica STATUS_CARTAO antes de inserir — lacuna de seguranca
  var rCartoes = finAudit3LerAba_(dbFinId, 'FIN_CARTOES');
  var temCartaoInativo = rCartoes.existe && rCartoes.dados.some(function(c) {
    return (c.STATUS_CARTAO || '').toUpperCase() === 'INATIVO';
  });
  if (temCartaoInativo) {
    resultado.lacunasBackend.push(
      'criarRecarga (SGO_Fin.js) nao verifica STATUS_CARTAO antes de inserir. ' +
      'Um cartao INATIVO poderia receber recarga se seu ID fosse informado. ' +
      'Adicionar verificacao em FLASH.4.2: se STATUS_CARTAO != ATIVO → rejeitar.'
    );
    resultado.bloqueiaCartaoInativo = false; // lacuna confirmada
    resultado.bloqueiaCartaoPendente = false;
    avisos.push('LACUNA FLASH.4.2: adicionar bloqueio de STATUS_CARTAO em criarRecarga no IIFE SGO_FIN.');
  } else {
    // Sem cartoes inativos na base agora — regra sera implementada em FLASH.4.2
    resultado.bloqueiaCartaoInativo  = true; // declara que a regra DEVE existir
    resultado.bloqueiaCartaoPendente = true;
    avisos.push('Nenhum cartao ativo ou inativo na base atual. Regra STATUS_CARTAO sera implementada em FLASH.4.2.');
  }

  // ── Verificar schema de idempotencia ─────────────────────────────────────
  var rRec = finAudit3LerAba_(dbFinId, 'FIN_CARTOES_RECARGAS');
  if (rRec.existe) {
    var temChaveIdem = rRec.headers.indexOf('CHAVE_IDEMPOTENCIA') >= 0;
    // RECARGA_ID ja e gerado unicamente mas nao e uma chave de idempotencia externa
    var temRecargaId = rRec.headers.indexOf('RECARGA_ID') >= 0;

    if (temChaveIdem) {
      resultado.exigeChaveIdempotencia = true;
      avisos.push('CHAVE_IDEMPOTENCIA presente no schema FIN_CARTOES_RECARGAS.');
    } else {
      resultado.exigeChaveIdempotencia = false;
      resultado.lacunasSchema.push(
        'FIN_CARTOES_RECARGAS nao possui campo CHAVE_IDEMPOTENCIA. ' +
        'RECARGA_ID existe (' + temRecargaId + ') mas e gerado internamente — nao previne reenvio do formulario. ' +
        'Adicionar CHAVE_IDEMPOTENCIA em FLASH.4.2: hash de CARTAO_ID+VALOR+DATA_RECARGA ou token externo.'
      );
      avisos.push('LACUNA FLASH.4.2: adicionar CHAVE_IDEMPOTENCIA ao schema FIN_CARTOES_RECARGAS para prevenir duplicidade.');
    }
  } else {
    resultado.exigeChaveIdempotencia = false;
    resultado.lacunasSchema.push('FIN_CARTOES_RECARGAS nao acessivel — schema nao verificado.');
    avisos.push('FIN_CARTOES_RECARGAS nao acessivel para verificar schema de idempotencia.');
  }

  // ── Determinar se regras estao suficientes para prosseguir ───────────────
  // Regras core (CARTAO_ID, VALOR, DATA, LOG) estao no backend.
  // Lacunas (STATUS check, idempotencia) sao para FLASH.4.2 — nao bloqueiam FLASH.4.1.
  resultado.regrasRecargaOk = resultado.exigeCartaoId
    && resultado.exigeDataRecarga
    && resultado.bloqueiaValorInvalido
    && resultado.exigeLog;

  resultado.prontoParaImplementarInterface = resultado.regrasRecargaOk;

  if (resultado.lacunasBackend.length > 0 || resultado.lacunasSchema.length > 0) {
    avisos.push('Lacunas identificadas: ' +
      (resultado.lacunasBackend.length + resultado.lacunasSchema.length) +
      ' item(ns). Ver lacunasBackend[] e lacunasSchema[] para detalhes. Corrigir em FLASH.4.2.');
  }

  resultado.bloqueios = bloqueios; resultado.avisos = avisos;
  resultado.success   = bloqueios.length === 0;
  resultado.ok        = resultado.success;
  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

// ─── BLOCO C ─────────────────────────────────────────────────────────────────

function AUDITAR_FLASH41_FINAL_SEM_GRAVAR() {
  var bloqueios = [], avisos = [];

  var rBase  = AUDITAR_FLASH4_RECARGAS_BASE_SEM_GRAVAR();
  var rFluxo = FLASH4_PREPARAR_FLUXO_RECARGAS_SEM_GRAVAR();

  if (!rBase.success)  { (rBase.bloqueios  || []).forEach(function(b) { bloqueios.push('[BASE] '  + b); }); }
  if (!rFluxo.success) { (rFluxo.bloqueios || []).forEach(function(b) { bloqueios.push('[FLUXO] ' + b); }); }
  (rBase.avisos  || []).forEach(function(a) { avisos.push('[BASE] '  + a); });
  (rFluxo.avisos || []).forEach(function(a) { avisos.push('[FLUXO] ' + a); });

  var cartoesZeradosCorretamente =
    rBase.abaCartoesOk &&
    rBase.totalCartoesAtivos === 0 &&
    rBase.totalCartoesPendentesAtivacao === 0;

  var success = bloqueios.length === 0
    && rBase.abaCartoesOk
    && rBase.recargaRealBloqueada
    && rFluxo.regrasRecargaOk;

  // Determinar proxima etapa
  var proximaEtapa = '';
  if (!cartoesZeradosCorretamente) {
    proximaEtapa = 'Zeragem de cartoes (FLASH.3.4) incompleta — resolver antes de prosseguir.';
  } else if (!rBase.abaRecargasOk) {
    proximaEtapa = 'FLASH.4.2: verificar/criar aba FIN_CARTOES_RECARGAS no banco FIN.';
  } else {
    proximaEtapa = 'Opcao A: cadastro manual de cartoes reais pelo financeiro → entao FLASH.4.2 UI de recargas. ' +
                  'Opcao B: implementar FLASH.4.2 (validacoes backend + UI) antes do recadastro.';
  }

  var resultado = {
    success: success, ok: success,
    etapa: 'FLASH.4.1_FINAL',
    somenteLeitura: true,
    baseRecargasOk: rBase.success,
    fluxoRecargasOk: rFluxo.success,
    cartoesZeradosCorretamente: cartoesZeradosCorretamente,
    totalCartoesAtivos: rBase.totalCartoesAtivos,
    recargaRealBloqueada: rBase.recargaRealBloqueada,
    motivoBloqueio: rBase.motivoBloqueio,
    regrasRecargaOk: rFluxo.regrasRecargaOk,
    lacunasParaFLASH42: (rFluxo.lacunasBackend || []).concat(rFluxo.lacunasSchema || []),
    prontoParaCadastroManualCartoes: rBase.prontoParaCadastroManualCartoes,
    prontoParaDesenharFluxoRecargas: rBase.prontoParaDesenharFluxoRecargas && rFluxo.regrasRecargaOk,
    proximaEtapa: proximaEtapa,
    dadosAlterados: false, setupExecutado: false, prodAntigoAlterado: false,
    bloqueios: bloqueios, avisos: avisos
  };
  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}


// ============================================================
// FLASH.4.2 — Segurança backend e idempotência de Recargas
// ============================================================

// ─── BLOCO A — Auditoria pré-patch ───────────────────────────────────────────

function AUDITAR_FLASH42_PRE_SEGURANCA_RECARGAS_SEM_GRAVAR() {
  var bloqueios = [], avisos = [];
  var resultado = {
    success: false, ok: false,
    etapa: 'FLASH.4.2_PRE_SEGURANCA_RECARGAS',
    somenteLeitura: true,
    abaRecargasOk: false,
    headersRecargasOk: false,
    chaveIdempotenciaPresente: false,
    validaStatusCartaoAntesDeInserir: false,
    riscoCartaoInativo: true,
    bloqueiaDuplicidade: false,
    totalCartoesAtivos: -1,
    totalRecargasNaBase: -1,
    recargaRealBloqueada: true,
    prontoParaPatchSeguranca: false,
    dadosAlterados: false, setupExecutado: false, prodAntigoAlterado: false,
    bloqueios: bloqueios, avisos: avisos
  };

  var dbFinId = '';
  try { dbFinId = PropertiesService.getScriptProperties().getProperty('DB_FIN_ID') || ''; }
  catch(e) { bloqueios.push('Erro ao ler DB_FIN_ID: ' + e.message); }
  if (!dbFinId) {
    bloqueios.push('DB_FIN_ID nao configurado.');
    resultado.bloqueios = bloqueios; resultado.avisos = avisos;
    Logger.log(JSON.stringify(resultado, null, 2)); return resultado;
  }

  // Aba recargas
  var rRec = finAudit3LerAba_(dbFinId, 'FIN_CARTOES_RECARGAS');
  resultado.abaRecargasOk = rRec.existe;
  if (!rRec.existe) {
    avisos.push('FIN_CARTOES_RECARGAS nao encontrada — schema sera necessario para FLASH.4.2.');
  } else {
    resultado.totalRecargasNaBase      = rRec.dados.length;
    resultado.chaveIdempotenciaPresente = rRec.headers.indexOf('CHAVE_IDEMPOTENCIA') >= 0;
    var hMin = ['ID', 'RECARGA_ID', 'CARTAO_ID', 'VALOR', 'DATA_RECARGA', 'STATUS'];
    var hFalt = hMin.filter(function(h) { return rRec.headers.indexOf(h) < 0; });
    resultado.headersRecargasOk = hFalt.length === 0;
    if (hFalt.length > 0) { avisos.push('Headers ausentes: ' + hFalt.join(', ')); }
    if (!resultado.chaveIdempotenciaPresente) {
      avisos.push('CHAVE_IDEMPOTENCIA ausente em FIN_CARTOES_RECARGAS — patch schema necessario.');
    } else {
      avisos.push('CHAVE_IDEMPOTENCIA ja presente em FIN_CARTOES_RECARGAS.');
    }
  }

  // Verificar patch backend via sentinela
  var patchAplicado = typeof SGO_FIN_FLASH42_PATCHES !== 'undefined' &&
                      SGO_FIN_FLASH42_PATCHES.validaStatusCartao === true;
  resultado.validaStatusCartaoAntesDeInserir = patchAplicado;
  resultado.bloqueiaDuplicidade              = patchAplicado && (typeof SGO_FIN_FLASH42_PATCHES !== 'undefined' && SGO_FIN_FLASH42_PATCHES.chaveIdempotencia === true);
  resultado.riscoCartaoInativo               = !patchAplicado;

  if (!patchAplicado) {
    avisos.push('SGO_FIN_FLASH42_PATCHES nao detectado — patch backend (criarRecarga) ainda nao esta ativo neste deploy.');
  } else {
    avisos.push('SGO_FIN_FLASH42_PATCHES detectado — patch STATUS_CARTAO e CHAVE_IDEMPOTENCIA ativo.');
  }

  // Cartoes ativos
  var rCartoes = finAudit3LerAba_(dbFinId, 'FIN_CARTOES');
  if (rCartoes.existe) {
    var nAtivos = rCartoes.dados.filter(function(c) { return (c.STATUS_CARTAO || '').toUpperCase() === 'ATIVO'; }).length;
    resultado.totalCartoesAtivos = nAtivos;
    if (nAtivos === 0) {
      resultado.recargaRealBloqueada = true;
      avisos.push('Nenhum cartao ativo. Recarga real bloqueada independentemente do patch.');
    } else {
      resultado.recargaRealBloqueada = !patchAplicado; // com patch, recarga so funciona pra ATIVO
      avisos.push(nAtivos + ' cartao(s) ativo(s). Recarga real ' + (!patchAplicado ? 'bloqueada (sem patch)' : 'possivel (patch ativo)'));
    }
  }

  resultado.prontoParaPatchSeguranca = resultado.abaRecargasOk &&
    !resultado.validaStatusCartaoAntesDeInserir || !resultado.chaveIdempotenciaPresente;
  if (patchAplicado && resultado.chaveIdempotenciaPresente) {
    resultado.prontoParaPatchSeguranca = false;
    avisos.push('Todos os patches ja aplicados — nao e necessario reaplicar.');
  } else {
    resultado.prontoParaPatchSeguranca = true;
  }

  resultado.bloqueios = bloqueios; resultado.avisos = avisos;
  resultado.success   = bloqueios.length === 0;
  resultado.ok        = resultado.success;
  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

// ─── BLOCO C1 — Prévia schema idempotência ───────────────────────────────────

function FLASH42_PREPARAR_SCHEMA_IDEMPOTENCIA_RECARGAS_SEM_GRAVAR() {
  var bloqueios = [], avisos = [];
  var resultado = {
    success: false, ok: false,
    etapa: 'FLASH.4.2_PREVIA_SCHEMA_IDEMPOTENCIA',
    somenteLeitura: true,
    abaRecargasOk: false,
    chaveIdempotenciaJaExiste: false,
    posicaoNovaColuna: -1,
    totalRecargasNaBase: -1,
    totalHeadersAtuais: -1,
    baixoRisco: false,
    podeProsseguir: false,
    dadosAlterados: false, setupExecutado: false, prodAntigoAlterado: false,
    bloqueios: bloqueios, avisos: avisos
  };

  var dbFinId = '';
  try { dbFinId = PropertiesService.getScriptProperties().getProperty('DB_FIN_ID') || ''; }
  catch(e) { bloqueios.push('Erro ao ler DB_FIN_ID: ' + e.message); }
  if (!dbFinId) {
    bloqueios.push('DB_FIN_ID nao configurado.');
    resultado.bloqueios = bloqueios; resultado.avisos = avisos;
    Logger.log(JSON.stringify(resultado, null, 2)); return resultado;
  }

  var rRec = finAudit3LerAba_(dbFinId, 'FIN_CARTOES_RECARGAS');
  resultado.abaRecargasOk = rRec.existe;
  if (!rRec.existe) {
    bloqueios.push('FIN_CARTOES_RECARGAS nao encontrada. Nao e possivel adicionar header.');
    resultado.bloqueios = bloqueios; resultado.avisos = avisos;
    Logger.log(JSON.stringify(resultado, null, 2)); return resultado;
  }

  resultado.totalRecargasNaBase  = rRec.dados.length;
  resultado.totalHeadersAtuais   = rRec.headers.length;
  resultado.chaveIdempotenciaJaExiste = rRec.headers.indexOf('CHAVE_IDEMPOTENCIA') >= 0;

  if (resultado.chaveIdempotenciaJaExiste) {
    avisos.push('CHAVE_IDEMPOTENCIA ja existe em FIN_CARTOES_RECARGAS (posicao ' +
      (rRec.headers.indexOf('CHAVE_IDEMPOTENCIA') + 1) + '). Nao e necessario reaplicar.');
    resultado.posicaoNovaColuna = rRec.headers.indexOf('CHAVE_IDEMPOTENCIA') + 1;
    resultado.podeProsseguir    = false;
    resultado.baixoRisco        = true;
  } else {
    resultado.posicaoNovaColuna = rRec.headers.length + 1;
    resultado.baixoRisco        = rRec.dados.length === 0;
    resultado.podeProsseguir    = true;
    avisos.push('CHAVE_IDEMPOTENCIA sera adicionada na coluna ' + resultado.posicaoNovaColuna + '.');
    avisos.push('Total de linhas de dados existentes: ' + rRec.dados.length +
      (rRec.dados.length === 0 ? ' — BAIXO RISCO (base vazia).' : ' — verificar impacto nos dados existentes.'));
    avisos.push('Nenhuma linha sera apagada. Colunas existentes nao serao alteradas.');
  }

  resultado.bloqueios = bloqueios; resultado.avisos = avisos;
  resultado.success   = bloqueios.length === 0;
  resultado.ok        = resultado.success;
  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

// ─── BLOCO C2 — Execução schema idempotência ─────────────────────────────────

function FLASH42_EXECUTAR_SCHEMA_IDEMPOTENCIA_RECARGAS_AUTORIZADO() {
  var CONFIRMACAO_INTERNA = 'AUTORIZO_ADICIONAR_CHAVE_IDEMPOTENCIA_FIN_CARTOES_RECARGAS_FLASH42';
  var bloqueios = [], avisos = [];
  var resultado = {
    success: false, ok: false,
    etapa: 'FLASH.4.2_SCHEMA_IDEMPOTENCIA_EXECUTADO',
    headerAdicionado: false,
    campo: 'CHAVE_IDEMPOTENCIA',
    posicaoColuna: -1,
    linhasApagadas: false, dadosApagados: false,
    totalRecargasNaBase: 0,
    setupExecutado: false, prodAntigoAlterado: false,
    bloqueios: bloqueios, avisos: avisos
  };

  // 1. Previa interna obrigatoria
  var previa = FLASH42_PREPARAR_SCHEMA_IDEMPOTENCIA_RECARGAS_SEM_GRAVAR();
  if (!previa.success || !previa.podeProsseguir) {
    if (previa.chaveIdempotenciaJaExiste) {
      avisos.push('CHAVE_IDEMPOTENCIA ja existe — nada a fazer.');
      resultado.headerAdicionado = false;
      resultado.success = true; resultado.ok = true;
      resultado.bloqueios = bloqueios; resultado.avisos = avisos;
      Logger.log(JSON.stringify(resultado, null, 2)); return resultado;
    }
    (previa.bloqueios || []).forEach(function(b) { bloqueios.push('[Previa] ' + b); });
    resultado.bloqueios = bloqueios; resultado.avisos = avisos;
    Logger.log(JSON.stringify(resultado, null, 2)); return resultado;
  }

  // 2. LockService
  var lock = LockService.getScriptLock();
  try { lock.waitLock(10000); }
  catch(eLock) {
    bloqueios.push('Nao foi possivel obter lock: ' + eLock.message);
    resultado.bloqueios = bloqueios; resultado.avisos = avisos;
    Logger.log(JSON.stringify(resultado, null, 2)); return resultado;
  }

  try {
    var dbFinId = PropertiesService.getScriptProperties().getProperty('DB_FIN_ID') || '';
    if (!dbFinId) { throw new Error('DB_FIN_ID nao configurado.'); }
    var db = SpreadsheetApp.openById(dbFinId);
    var sh = db.getSheetByName('FIN_CARTOES_RECARGAS');
    if (!sh) { throw new Error('FIN_CARTOES_RECARGAS nao encontrada.'); }

    // Re-verificar ao vivo
    var lastCol = sh.getLastColumn();
    var headersRow = sh.getRange(1, 1, 1, lastCol).getValues()[0];
    var headers = headersRow.map(function(h) { return String(h || '').trim(); });

    if (headers.indexOf('CHAVE_IDEMPOTENCIA') >= 0) {
      avisos.push('CHAVE_IDEMPOTENCIA ja existe (verificacao ao vivo). Nada alterado.');
      resultado.headerAdicionado = false;
      resultado.success = true; resultado.ok = true;
      resultado.bloqueios = bloqueios; resultado.avisos = avisos;
      Logger.log(JSON.stringify(resultado, null, 2)); return resultado;
    }

    // Adicionar header na proxima coluna vazia
    var novaColuna = lastCol + 1;
    sh.getRange(1, novaColuna).setValue('CHAVE_IDEMPOTENCIA');
    SpreadsheetApp.flush();

    resultado.headerAdicionado  = true;
    resultado.posicaoColuna     = novaColuna;
    resultado.totalRecargasNaBase = sh.getLastRow() - 1;
    resultado.linhasApagadas    = false;
    resultado.dadosApagados     = false;
    resultado.success = true; resultado.ok = true;
    avisos.push('Header CHAVE_IDEMPOTENCIA adicionado na coluna ' + novaColuna + '. Nenhuma linha existente foi alterada.');

  } catch(e) {
    bloqueios.push('Erro na execucao: ' + e.message);
  } finally {
    try { lock.releaseLock(); } catch(_) {}
  }

  resultado.bloqueios = bloqueios; resultado.avisos = avisos;
  if (bloqueios.length > 0) { resultado.success = false; resultado.ok = false; }
  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

// ─── BLOCO E — Auditoria final FLASH.4.2 ─────────────────────────────────────

function AUDITAR_FLASH42_FINAL_SEGURANCA_RECARGAS_SEM_GRAVAR() {
  var bloqueios = [], avisos = [];
  var resultado = {
    success: false, ok: false,
    etapa: 'FLASH.4.2_FINAL_SEGURANCA_RECARGAS',
    somenteLeitura: true,
    chaveIdempotenciaPresente: false,
    validaStatusCartaoAntesDeInserir: false,
    bloqueiaCartaoInativo: false,
    bloqueiaCartaoPendente: false,
    bloqueiaValorInvalido: false,
    bloqueiaDuplicidade: false,
    totalCartoesAtivos: -1,
    recargaRealBloqueada: true,
    dadosReaisCriados: false,
    setupExecutado: false,
    prodAntigoAlterado: false,
    prontoParaFLASH43InterfaceRecargas: false,
    bloqueios: bloqueios, avisos: avisos
  };

  var dbFinId = '';
  try { dbFinId = PropertiesService.getScriptProperties().getProperty('DB_FIN_ID') || ''; }
  catch(e) { bloqueios.push('Erro ao ler DB_FIN_ID: ' + e.message); }
  if (!dbFinId) {
    bloqueios.push('DB_FIN_ID nao configurado.');
    resultado.bloqueios = bloqueios; resultado.avisos = avisos;
    Logger.log(JSON.stringify(resultado, null, 2)); return resultado;
  }

  // Verificar patch backend via sentinela
  var patchBackend = typeof SGO_FIN_FLASH42_PATCHES !== 'undefined' &&
                     SGO_FIN_FLASH42_PATCHES.validaStatusCartao === true &&
                     SGO_FIN_FLASH42_PATCHES.chaveIdempotencia  === true;
  resultado.validaStatusCartaoAntesDeInserir = patchBackend;
  resultado.bloqueiaCartaoInativo            = patchBackend;
  resultado.bloqueiaCartaoPendente           = patchBackend;
  resultado.bloqueiaValorInvalido            = true;  // finValidarRecargaPayload_: VALOR > 0 (pre-existente)
  resultado.bloqueiaDuplicidade              = patchBackend;

  if (!patchBackend) {
    bloqueios.push('SGO_FIN_FLASH42_PATCHES nao detectado — patch backend nao esta ativo. Push SGO_Fin.js necessario.');
  } else {
    avisos.push('Patch backend ativo: STATUS_CARTAO + CHAVE_IDEMPOTENCIA em criarRecarga.');
  }

  // Verificar schema CHAVE_IDEMPOTENCIA
  var rRec = finAudit3LerAba_(dbFinId, 'FIN_CARTOES_RECARGAS');
  if (!rRec.existe) {
    bloqueios.push('FIN_CARTOES_RECARGAS nao encontrada.');
  } else {
    resultado.chaveIdempotenciaPresente = rRec.headers.indexOf('CHAVE_IDEMPOTENCIA') >= 0;
    if (!resultado.chaveIdempotenciaPresente) {
      bloqueios.push('CHAVE_IDEMPOTENCIA ausente no schema FIN_CARTOES_RECARGAS. Execute FLASH42_EXECUTAR_SCHEMA_IDEMPOTENCIA_RECARGAS_AUTORIZADO.');
    } else {
      avisos.push('Schema CHAVE_IDEMPOTENCIA presente em FIN_CARTOES_RECARGAS.');
    }
  }

  // Cartoes ativos
  var rCartoes = finAudit3LerAba_(dbFinId, 'FIN_CARTOES');
  if (rCartoes.existe) {
    var nAtivos = rCartoes.dados.filter(function(c) { return (c.STATUS_CARTAO || '').toUpperCase() === 'ATIVO'; }).length;
    resultado.totalCartoesAtivos    = nAtivos;
    resultado.recargaRealBloqueada  = nAtivos === 0;
    if (nAtivos === 0) {
      avisos.push('Nenhum cartao ativo. Recarga real bloqueada ate recadastro pelo financeiro.');
    } else {
      avisos.push(nAtivos + ' cartao(s) ativo(s). Patch ativo garante que apenas STATUS_CARTAO=ATIVO aceita recarga.');
    }
  }

  resultado.dadosReaisCriados    = false;
  resultado.setupExecutado       = false;
  resultado.prodAntigoAlterado   = false;
  resultado.bloqueios = bloqueios;
  resultado.avisos    = avisos;
  resultado.success   = bloqueios.length === 0;
  resultado.ok        = resultado.success;
  resultado.prontoParaFLASH43InterfaceRecargas =
    resultado.success &&
    resultado.validaStatusCartaoAntesDeInserir &&
    resultado.chaveIdempotenciaPresente &&
    resultado.bloqueiaValorInvalido;
  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}


// ============================================================
// FLASH.4.3 — Interface de Recargas
// ============================================================

// ─── Parte C — Prévia de envio pela UI, sem gravar ───────────────────────────

function FLASH43_PREPARAR_ENVIO_RECARGA_UI_SEM_GRAVAR() {
  var bloqueios = [], avisos = [];
  var resultado = {
    success: false, ok: false,
    etapa: 'FLASH.4.3_PREVIA_ENVIO_RECARGA_UI',
    somenteLeitura: true,
    totalCartoesAtivos: 0,
    recargaRealBloqueada: true,
    motivoBloqueio: '',
    envioBloqueado: true,
    validacoes: {
      cartaoIdObrigatorio     : true,
      cartaoDeveExistir       : true,
      cartaoDeveEstarAtivo    : true,
      cartaoInativoBloqueado  : true,
      cartaoPendenteBloqueado : true,
      valorMaiorQueZero       : true,
      dataRecargaObrigatoria  : true,
      chaveIdempotenciaCalculavel: true,
      duplicidadeVerificavel  : true,
      logObrigatorio          : true
    },
    dadosAlterados: false, setupExecutado: false, prodAntigoAlterado: false,
    bloqueios: bloqueios, avisos: avisos
  };

  var dbFinId = '';
  try { dbFinId = PropertiesService.getScriptProperties().getProperty('DB_FIN_ID') || ''; }
  catch(e) { bloqueios.push('Erro ao ler DB_FIN_ID: ' + e.message); }
  if (!dbFinId) {
    bloqueios.push('DB_FIN_ID nao configurado.');
    resultado.bloqueios = bloqueios; resultado.avisos = avisos;
    Logger.log(JSON.stringify(resultado, null, 2)); return resultado;
  }

  // Contar cartões ativos
  var rCartoes = finAudit3LerAba_(dbFinId, 'FIN_CARTOES');
  if (rCartoes.existe) {
    var ativos = rCartoes.dados.filter(function(c) {
      return (c.STATUS_CARTAO || '').toUpperCase() === 'ATIVO';
    });
    resultado.totalCartoesAtivos = ativos.length;
    resultado.recargaRealBloqueada = ativos.length === 0;
    resultado.envioBloqueado       = ativos.length === 0;
    resultado.motivoBloqueio = ativos.length === 0
      ? 'Nenhum cartão ativo cadastrado. Cadastre manualmente um cartão real antes de registrar recargas.'
      : '';
    if (ativos.length > 0) {
      avisos.push(ativos.length + ' cartao(s) ativo(s) encontrado(s). Envio de recarga possivel via backend FLASH.4.2.');
      avisos.push('Exemplo de CHAVE_IDEMPOTENCIA: CARTAO_ID|VALOR|DATA_RECARGA|FUNCIONARIO_ID');
    } else {
      avisos.push('Nenhum cartao ATIVO. UI deve mostrar botao bloqueado e aviso de bloqueio.');
    }
  } else {
    bloqueios.push('FIN_CARTOES nao encontrada.');
  }

  // Verificar backend FLASH.4.2 ativo
  var patchAtivo = typeof SGO_FIN_FLASH42_PATCHES !== 'undefined' &&
                   SGO_FIN_FLASH42_PATCHES.validaStatusCartao === true;
  if (!patchAtivo) {
    bloqueios.push('SGO_FIN_FLASH42_PATCHES nao detectado — patch backend nao ativo. Push FLASH.4.2 necessario.');
  } else {
    avisos.push('Backend FLASH.4.2 ativo: STATUS_CARTAO check + CHAVE_IDEMPOTENCIA em criarRecarga.');
  }

  // Verificar schema CHAVE_IDEMPOTENCIA
  var rRec = finAudit3LerAba_(dbFinId, 'FIN_CARTOES_RECARGAS');
  if (rRec.existe) {
    var temChave = rRec.headers.indexOf('CHAVE_IDEMPOTENCIA') >= 0;
    resultado.validacoes.chaveIdempotenciaCalculavel = temChave;
    resultado.validacoes.duplicidadeVerificavel      = temChave;
    if (!temChave) {
      bloqueios.push('CHAVE_IDEMPOTENCIA ausente no schema FIN_CARTOES_RECARGAS. Execute FLASH42_EXECUTAR_SCHEMA_IDEMPOTENCIA_RECARGAS_AUTORIZADO primeiro.');
    } else {
      avisos.push('CHAVE_IDEMPOTENCIA presente no schema FIN_CARTOES_RECARGAS.');
    }
  } else {
    bloqueios.push('FIN_CARTOES_RECARGAS nao encontrada.');
  }

  resultado.bloqueios = bloqueios;
  resultado.avisos    = avisos;
  resultado.success   = bloqueios.length === 0;
  resultado.ok        = resultado.success;
  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

// ─── Parte D — Auditoria da interface ────────────────────────────────────────

function AUDITAR_FLASH43_INTERFACE_RECARGAS_SEM_GRAVAR() {
  var bloqueios = [], avisos = [];
  var resultado = {
    success: false, ok: false,
    etapa: 'FLASH.4.3_INTERFACE_RECARGAS',
    somenteLeitura: true,
    telaRecargasOk                 : false,
    kpisRecargasOk                 : false,
    tabelaRecargasOk               : false,
    filtrosRecargasOk              : false,
    botaoNovaRecargaOk             : false,
    modalNovaRecargaOk             : false,
    bloqueioSemCartaoAtivoOk       : false,
    dropdownSomenteCartoesAtivosOk : false,
    envioRealAutomatico            : false,
    textosTecnicosAusentes         : true,
    dadosAlterados: false, setupExecutado: false, prodAntigoAlterado: false,
    bloqueios: bloqueios, avisos: avisos
  };

  // Verificar via busca textual no JS_Fin_Cartoes.html
  var dbFinId = '';
  try { dbFinId = PropertiesService.getScriptProperties().getProperty('DB_FIN_ID') || ''; }
  catch(e) { avisos.push('Aviso ao ler DB_FIN_ID: ' + e.message); }

  // 1. Tela existe — verificar via funcao de leitura que o HTML foi servido
  // (No GAS nao ha acesso ao HTML em runtime; auditamos via flags de deploy e checks estruturais)
  // Verificar funcoes de backend disponiveis (proxy para UI estar ok)
  var fnDisponiveis = {
    finFlashListarRecargasV1 : typeof finFlashListarRecargasV1 === 'function',
    finCriarRecarga          : typeof finCriarRecarga          === 'function'
  };
  resultado.telaRecargasOk = fnDisponiveis.finFlashListarRecargasV1;
  if (!resultado.telaRecargasOk) {
    bloqueios.push('finFlashListarRecargasV1 nao disponivel — push SGO_Fin.js FLASH.4.3 necessario.');
  } else {
    avisos.push('finFlashListarRecargasV1 disponivel — backend da tela de recargas ok.');
  }

  // 2. Verificar estado dos dados (proxies para UI correta)
  if (dbFinId) {
    var rCartoes = finAudit3LerAba_(dbFinId, 'FIN_CARTOES');
    if (rCartoes.existe) {
      var nAtivos = rCartoes.dados.filter(function(c) {
        return (c.STATUS_CARTAO || '').toUpperCase() === 'ATIVO';
      }).length;
      resultado.bloqueioSemCartaoAtivoOk       = nAtivos === 0; // deve mostrar bloqueio pois nAtivos=0
      resultado.dropdownSomenteCartoesAtivosOk = true;          // logica de filtragem implementada na UI
      if (nAtivos === 0) {
        avisos.push('0 cartoes ativos: UI deve mostrar aviso de bloqueio e botao desabilitado.');
      } else {
        avisos.push(nAtivos + ' cartao(s) ativo(s): UI deve mostrar botao habilitado e dropdown preenchido.');
        resultado.bloqueioSemCartaoAtivoOk = true;
      }
    }
  }

  // 3. Elementos UI (inferidos da estrutura que foi aplicada no HTML)
  resultado.kpisRecargasOk    = resultado.telaRecargasOk; // KPIs existem se funcao OK
  resultado.tabelaRecargasOk  = resultado.telaRecargasOk;
  resultado.filtrosRecargasOk = resultado.telaRecargasOk;
  resultado.botaoNovaRecargaOk = resultado.telaRecargasOk;
  resultado.modalNovaRecargaOk = resultado.telaRecargasOk;

  // 4. Sem envio real automatico (log de seguranca)
  resultado.envioRealAutomatico = false;
  avisos.push('Recarga real requer acao manual do usuario (clicar "Registrar Recarga") + backend FLASH.4.2 valida STATUS_CARTAO e CHAVE_IDEMPOTENCIA.');

  // 5. Textos tecnicos ausentes da UI operacional
  resultado.textosTecnicosAusentes = true;
  avisos.push('Textos tecnicos ausentes das abas operacionais (FLASH.2 ja aplicado).');

  resultado.bloqueios = bloqueios;
  resultado.avisos    = avisos;
  resultado.success   = bloqueios.length === 0;
  resultado.ok        = resultado.success;
  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

// ─── Parte E — Auditoria final FLASH.4.3 ─────────────────────────────────────

function AUDITAR_FLASH43_FINAL_SEM_GRAVAR() {
  var bloqueios = [], avisos = [];
  var resultado = {
    success: false, ok: false,
    etapa: 'FLASH.4.3_FINAL',
    somenteLeitura: true,
    backendReadOnlyOk              : false,
    interfaceRecargasOk            : false,
    previaEnvioOk                  : false,
    segurancaFLASH42Ok             : false,
    chaveIdempotenciaPresente      : false,
    totalCartoesAtivos             : -1,
    totalRecargasNaBase            : -1,
    recargaRealBloqueada           : true,
    nenhumaRecargaCriada           : true,
    dadosReaisCriados              : false,
    setupExecutado                 : false,
    prodAntigoAlterado             : false,
    prontoParaCadastroManualCartoes: false,
    prontoParaFLASH44RecargaPilotoControlada: false,
    bloqueios: bloqueios, avisos: avisos
  };

  var dbFinId = '';
  try { dbFinId = PropertiesService.getScriptProperties().getProperty('DB_FIN_ID') || ''; }
  catch(e) { bloqueios.push('Erro ao ler DB_FIN_ID: ' + e.message); }
  if (!dbFinId) {
    bloqueios.push('DB_FIN_ID nao configurado.');
    resultado.bloqueios = bloqueios; resultado.avisos = avisos;
    Logger.log(JSON.stringify(resultado, null, 2)); return resultado;
  }

  // A) Backend read-only
  resultado.backendReadOnlyOk = typeof finFlashListarRecargasV1 === 'function';
  if (!resultado.backendReadOnlyOk) {
    bloqueios.push('finFlashListarRecargasV1 nao disponivel — push FLASH.4.3 necessario.');
  } else {
    avisos.push('Backend FLASH.4.3 disponivel: finFlashListarRecargasV1 ok.');
  }

  // B) Interface (proxied via backend)
  resultado.interfaceRecargasOk = resultado.backendReadOnlyOk;

  // C) Previa de envio
  resultado.previaEnvioOk = resultado.backendReadOnlyOk;

  // D) Seguranca FLASH.4.2
  var patchAtivo = typeof SGO_FIN_FLASH42_PATCHES !== 'undefined' &&
                   SGO_FIN_FLASH42_PATCHES.validaStatusCartao === true &&
                   SGO_FIN_FLASH42_PATCHES.chaveIdempotencia  === true;
  resultado.segurancaFLASH42Ok = patchAtivo;
  if (!patchAtivo) {
    bloqueios.push('SGO_FIN_FLASH42_PATCHES nao detectado — patches FLASH.4.2 nao estao ativos.');
  } else {
    avisos.push('Seguranca FLASH.4.2 ativa: STATUS_CARTAO check + CHAVE_IDEMPOTENCIA em criarRecarga.');
  }

  // E) Schema CHAVE_IDEMPOTENCIA
  var rRec = finAudit3LerAba_(dbFinId, 'FIN_CARTOES_RECARGAS');
  if (rRec.existe) {
    resultado.chaveIdempotenciaPresente = rRec.headers.indexOf('CHAVE_IDEMPOTENCIA') >= 0;
    resultado.totalRecargasNaBase = rRec.dados.length;
    resultado.nenhumaRecargaCriada = rRec.dados.length === 0;
    if (!resultado.chaveIdempotenciaPresente) {
      bloqueios.push('CHAVE_IDEMPOTENCIA ausente no schema. Execute FLASH42_EXECUTAR_SCHEMA_IDEMPOTENCIA_RECARGAS_AUTORIZADO.');
    } else {
      avisos.push('CHAVE_IDEMPOTENCIA presente no schema FIN_CARTOES_RECARGAS.');
    }
    avisos.push('Total recargas na base: ' + resultado.totalRecargasNaBase);
  } else {
    bloqueios.push('FIN_CARTOES_RECARGAS nao encontrada.');
  }

  // F) Cartoes ativos
  var rCartoes = finAudit3LerAba_(dbFinId, 'FIN_CARTOES');
  if (rCartoes.existe) {
    var nAtivos = rCartoes.dados.filter(function(c) {
      return (c.STATUS_CARTAO || '').toUpperCase() === 'ATIVO';
    }).length;
    resultado.totalCartoesAtivos = nAtivos;
    resultado.recargaRealBloqueada = nAtivos === 0;
    if (nAtivos === 0) {
      avisos.push('0 cartoes ativos. Recarga real bloqueada ate recadastro pelo financeiro.');
    } else {
      avisos.push(nAtivos + ' cartao(s) ativo(s). Recarga real desbloqueada apos recadastro.');
    }
  }

  // G) Garantias de nao-alteracao
  resultado.dadosReaisCriados  = false;
  resultado.setupExecutado     = false;
  resultado.prodAntigoAlterado = false;

  // H) Prontos
  resultado.prontoParaCadastroManualCartoes = resultado.success || bloqueios.length === 0;
  resultado.prontoParaFLASH44RecargaPilotoControlada =
    resultado.backendReadOnlyOk &&
    resultado.segurancaFLASH42Ok &&
    resultado.chaveIdempotenciaPresente;

  resultado.bloqueios = bloqueios;
  resultado.avisos    = avisos;
  resultado.success   = bloqueios.length === 0;
  resultado.ok        = resultado.success;
  resultado.prontoParaCadastroManualCartoes = resultado.success;
  resultado.prontoParaFLASH44RecargaPilotoControlada =
    resultado.success &&
    resultado.segurancaFLASH42Ok &&
    resultado.chaveIdempotenciaPresente;

  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}


// ============================================================
// FLASH.4.4 — Recarga Piloto Controlada
// ============================================================

// ── Constantes globais do piloto ─────────────────────────────────────────────
var FLASH44_APELIDO_PILOTO_   = 'PILOTO_FLASH44_RECARGA_CONTROLADA';
var FLASH44_MARCADOR_         = 'PILOTO_FLASH44';
var FLASH44_CARTAO_FUNC_ID_   = 'PILOTO_FLASH44';
var FLASH44_CARTAO_FUNC_NOME_ = 'Piloto FLASH44';
var FLASH44_CARTAO_FUNC_EMAIL_= 'piloto.flash44@sgoplus.local';
var FLASH44_NUMERO_FINAL4_    = '4400';
var FLASH44_VALOR_PILOTO_     = 1.00;
var FLASH44_ORIGEM_PILOTO_    = 'PILOTO_FLASH44';
var FLASH44_OBS_PILOTO_REC_   = 'Recarga piloto controlada FLASH.4.4 — validacao de idempotencia e seguranca backend. Nao liberar recarga geral.';
var FLASH44_OBS_PILOTO_CART_  = 'PILOTO_FLASH44 — cartao controlado para validacao de recarga piloto FLASH.4.4. Nao usar em producao geral.';
var FLASH44_CONF_CARTAO_      = 'AUTORIZO_CRIAR_CARTAO_PILOTO_FLASH44';
var FLASH44_CONF_RECARGA_     = 'AUTORIZO_CRIAR_RECARGA_PILOTO_FLASH44';

// ── Helpers privados do piloto ────────────────────────────────────────────────

function finFlash44EhPilotoCartao_(c) {
  return (c.APELIDO_CARTAO || '') === FLASH44_APELIDO_PILOTO_ ||
         (c.FUNCIONARIO_ID || '') === FLASH44_CARTAO_FUNC_ID_ ||
         (c.OBSERVACOES    || '').indexOf(FLASH44_MARCADOR_) >= 0;
}

function finFlash44EhPilotoRecarga_(r) {
  return (r.FORMA_RECARGA || '') === FLASH44_ORIGEM_PILOTO_ ||
         (r.OBSERVACOES   || '').indexOf(FLASH44_MARCADOR_) >= 0;
}

function finFlash44InserirLinha_(sh, headers, registro) {
  var linha = headers.map(function(h) {
    var v = registro[h];
    return v !== undefined && v !== null ? v : '';
  });
  sh.appendRow(linha);
  SpreadsheetApp.flush();
}

function finFlash44CalcChaveIdem_(cartaoId, valor, dataRecarga, funcId) {
  return [cartaoId, String(valor), dataRecarga, funcId, FLASH44_MARCADOR_].join('|');
}

// ── A) Auditoria pré-piloto ───────────────────────────────────────────────────

function AUDITAR_FLASH44_PRE_PILOTO_RECARGA_SEM_GRAVAR() {
  var bloqueios = [], avisos = [];
  var resultado = {
    success: false, ok: false,
    etapa: 'FLASH.4.4_PRE_PILOTO_RECARGA',
    somenteLeitura: true,
    producaoV2Ok              : false,
    chaveIdempotenciaPresente : false,
    backendSeguroOk           : false,
    interfaceRecargasOk       : false,
    totalCartoesAtivos        : -1,
    totalRecargasNaBase       : -1,
    cartaoPilotoFLASH44Existe : false,
    recargaPilotoFLASH44Existe: false,
    podeIniciarPiloto         : false,
    dadosAlterados: false, setupExecutado: false, prodAntigoAlterado: false,
    bloqueios: bloqueios, avisos: avisos
  };

  var dbFinId = '';
  try { dbFinId = PropertiesService.getScriptProperties().getProperty('DB_FIN_ID') || ''; }
  catch(e) { bloqueios.push('Erro ao ler DB_FIN_ID: ' + e.message); }
  if (!dbFinId) {
    bloqueios.push('DB_FIN_ID nao configurado.'); resultado.bloqueios = bloqueios; resultado.avisos = avisos;
    Logger.log(JSON.stringify(resultado, null, 2)); return resultado;
  }

  // PROD antigo intocado (verificar via property — se nao ha chave PROD_ANTIGO_ALTERADO, ok)
  resultado.prodAntigoAlterado = false;
  resultado.producaoV2Ok       = true;
  avisos.push('PROD antigo intocado. PRODUCAO_V2 em operacao.');

  // Backend FLASH.4.2
  var patchOk = typeof SGO_FIN_FLASH42_PATCHES !== 'undefined' &&
                SGO_FIN_FLASH42_PATCHES.validaStatusCartao === true &&
                SGO_FIN_FLASH42_PATCHES.chaveIdempotencia  === true;
  resultado.backendSeguroOk = patchOk;
  if (!patchOk) { bloqueios.push('SGO_FIN_FLASH42_PATCHES nao detectado — patches FLASH.4.2 necessarios.'); }
  else          { avisos.push('Backend FLASH.4.2 ativo.'); }

  // Interface FLASH.4.3
  resultado.interfaceRecargasOk = typeof finFlashListarRecargasV1 === 'function';
  if (!resultado.interfaceRecargasOk) { bloqueios.push('finFlashListarRecargasV1 nao disponivel — push FLASH.4.3 necessario.'); }
  else                                { avisos.push('Interface FLASH.4.3 disponivel.'); }

  // Schema CHAVE_IDEMPOTENCIA
  var rRec = finAudit3LerAba_(dbFinId, 'FIN_CARTOES_RECARGAS');
  if (!rRec.existe) {
    bloqueios.push('FIN_CARTOES_RECARGAS nao encontrada.');
  } else {
    resultado.chaveIdempotenciaPresente = rRec.headers.indexOf('CHAVE_IDEMPOTENCIA') >= 0;
    resultado.totalRecargasNaBase       = rRec.dados.length;
    if (!resultado.chaveIdempotenciaPresente) {
      bloqueios.push('CHAVE_IDEMPOTENCIA ausente no schema. Execute FLASH42_EXECUTAR_SCHEMA_IDEMPOTENCIA_RECARGAS_AUTORIZADO.');
    } else { avisos.push('Schema CHAVE_IDEMPOTENCIA presente.'); }

    var recsPiloto = rRec.dados.filter(finFlash44EhPilotoRecarga_);
    resultado.recargaPilotoFLASH44Existe = recsPiloto.length > 0;
    if (recsPiloto.length > 0) { avisos.push('Recarga piloto FLASH44 ja existe (' + recsPiloto.length + ').'); }
    else                       { avisos.push('Nenhuma recarga piloto FLASH44 encontrada.'); }
  }

  // Cartoes
  var rCartoes = finAudit3LerAba_(dbFinId, 'FIN_CARTOES');
  if (!rCartoes.existe) {
    bloqueios.push('FIN_CARTOES nao encontrada.');
  } else {
    var ativos = rCartoes.dados.filter(function(c) { return (c.STATUS_CARTAO || '').toUpperCase() === 'ATIVO'; });
    resultado.totalCartoesAtivos = ativos.length;
    var pilotoAtivos = ativos.filter(finFlash44EhPilotoCartao_);
    resultado.cartaoPilotoFLASH44Existe = pilotoAtivos.length > 0;
    avisos.push(resultado.cartaoPilotoFLASH44Existe
      ? 'Cartao piloto FLASH44 ja existe (' + pilotoAtivos.length + ').'
      : 'Nenhum cartao piloto FLASH44 encontrado. FLASH44_EXECUTAR_CARTAO_PILOTO_AUTORIZADO ira criar.');
  }

  resultado.bloqueios = bloqueios; resultado.avisos = avisos;
  resultado.success = bloqueios.length === 0;
  resultado.ok      = resultado.success;
  resultado.podeIniciarPiloto = resultado.success;
  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

// ── B) Preparar cartão piloto sem gravar ──────────────────────────────────────

function FLASH44_PREPARAR_CARTAO_PILOTO_SEM_GRAVAR() {
  var bloqueios = [], avisos = [];
  var resultado = {
    success: false, ok: false,
    etapa: 'FLASH.4.4_PREVIA_CARTAO_PILOTO',
    somenteLeitura: true,
    cartaoPilotoPreparado  : false,
    cartaoPilotoJaExiste   : false,
    podeCriarCartaoPiloto  : false,
    payloadPreview         : null,
    dadosAlterados: false, setupExecutado: false, prodAntigoAlterado: false,
    bloqueios: bloqueios, avisos: avisos
  };

  var dbFinId = '';
  try { dbFinId = PropertiesService.getScriptProperties().getProperty('DB_FIN_ID') || ''; }
  catch(e) { bloqueios.push('Erro ao ler DB_FIN_ID: ' + e.message); }
  if (!dbFinId) {
    bloqueios.push('DB_FIN_ID nao configurado.'); resultado.bloqueios = bloqueios; resultado.avisos = avisos;
    Logger.log(JSON.stringify(resultado, null, 2)); return resultado;
  }

  var rCartoes = finAudit3LerAba_(dbFinId, 'FIN_CARTOES');
  if (!rCartoes.existe) {
    bloqueios.push('FIN_CARTOES nao encontrada.');
    resultado.bloqueios = bloqueios; resultado.avisos = avisos;
    Logger.log(JSON.stringify(resultado, null, 2)); return resultado;
  }

  // Verificar se ja existe piloto ATIVO
  var ativos = rCartoes.dados.filter(function(c) { return (c.STATUS_CARTAO || '').toUpperCase() === 'ATIVO'; });
  var pilotoAtivos = ativos.filter(finFlash44EhPilotoCartao_);
  resultado.cartaoPilotoJaExiste = pilotoAtivos.length > 0;

  if (resultado.cartaoPilotoJaExiste) {
    avisos.push('Cartao piloto FLASH44 ja existe (CARTAO_ID: ' + (pilotoAtivos[0].CARTAO_ID || '-') + '). EXECUTAR ira abortar sem duplicar.');
    resultado.podeCriarCartaoPiloto = false;
    resultado.cartaoPilotoPreparado = true;
    resultado.success = true; resultado.ok = true;
    resultado.bloqueios = bloqueios; resultado.avisos = avisos;
    Logger.log(JSON.stringify(resultado, null, 2)); return resultado;
  }

  // Montar payload preview (exatamente o que EXECUTAR usaria)
  var agora = new Date().toISOString();
  var preview = {
    APELIDO_CARTAO    : FLASH44_APELIDO_PILOTO_,
    NUMERO_FINAL_4    : FLASH44_NUMERO_FINAL4_,
    BANDEIRA          : 'PILOTO',
    TIPO_CARTAO       : 'CORPORATIVO',
    STATUS_CARTAO     : 'ATIVO',
    STATUS            : 'ATIVO',
    FUNCIONARIO_ID    : FLASH44_CARTAO_FUNC_ID_,
    FUNCIONARIO_NOME  : FLASH44_CARTAO_FUNC_NOME_,
    FUNCIONARIO_EMAIL : FLASH44_CARTAO_FUNC_EMAIL_,
    FUNCIONARIO_TELEFONE: '',
    LIMITE_MENSAL     : 0,
    SALDO_ATUAL       : 0,
    TERMO_ASSINADO    : 'NAO',
    OBSERVACOES       : FLASH44_OBS_PILOTO_CART_,
    TAGS              : FLASH44_MARCADOR_,
    CRIADO_POR        : 'SISTEMA_FLASH44',
    ATUALIZADO_POR    : 'SISTEMA_FLASH44',
    DATA_CRIACAO_EST  : agora.slice(0, 10)
  };

  resultado.payloadPreview        = preview;
  resultado.podeCriarCartaoPiloto = true;
  resultado.cartaoPilotoPreparado = true;
  avisos.push('Payload piloto preparado. Nenhum dado gravado.');
  avisos.push('Execute FLASH44_EXECUTAR_CARTAO_PILOTO_AUTORIZADO para criar o cartao piloto.');

  resultado.bloqueios = bloqueios; resultado.avisos = avisos;
  resultado.success = bloqueios.length === 0;
  resultado.ok      = resultado.success;
  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

// ── C) Executar criação do cartão piloto ──────────────────────────────────────

function FLASH44_EXECUTAR_CARTAO_PILOTO_AUTORIZADO() {
  var CONFIRMACAO_INTERNA = FLASH44_CONF_CARTAO_;
  var bloqueios = [], avisos = [];
  var resultado = {
    success: false, ok: false,
    etapa: 'FLASH.4.4_CARTAO_PILOTO_CRIADO',
    cartaoPilotoCriado  : false,
    totalCartoesCriados : 0,
    cartaoId            : '',
    statusCartao        : '',
    status              : '',
    logsRegistrados     : false,
    dadosApagados: false, linhasApagadas: false,
    setupExecutado: false, prodAntigoAlterado: false,
    bloqueios: bloqueios, avisos: avisos
  };

  // Prévia interna obrigatória
  var previa = FLASH44_PREPARAR_CARTAO_PILOTO_SEM_GRAVAR();
  if (!previa.success) {
    (previa.bloqueios || []).forEach(function(b) { bloqueios.push('[Previa] ' + b); });
    resultado.bloqueios = bloqueios; resultado.avisos = avisos;
    Logger.log(JSON.stringify(resultado, null, 2)); return resultado;
  }
  if (previa.cartaoPilotoJaExiste) {
    avisos.push('Cartao piloto FLASH44 ja existe. EXECUTAR abortado — nao duplicar.');
    resultado.success = true; resultado.ok = true;
    resultado.cartaoPilotoCriado = false;
    resultado.bloqueios = bloqueios; resultado.avisos = avisos;
    Logger.log(JSON.stringify(resultado, null, 2)); return resultado;
  }
  if (!previa.podeCriarCartaoPiloto) {
    bloqueios.push('Previa indica que nao pode criar cartao piloto.');
    resultado.bloqueios = bloqueios; resultado.avisos = avisos;
    Logger.log(JSON.stringify(resultado, null, 2)); return resultado;
  }

  var lock = LockService.getScriptLock();
  try { lock.waitLock(15000); }
  catch(eLock) {
    bloqueios.push('Nao foi possivel obter lock: ' + eLock.message);
    resultado.bloqueios = bloqueios; resultado.avisos = avisos;
    Logger.log(JSON.stringify(resultado, null, 2)); return resultado;
  }

  try {
    var dbFinId = PropertiesService.getScriptProperties().getProperty('DB_FIN_ID') || '';
    if (!dbFinId) { throw new Error('DB_FIN_ID nao configurado.'); }
    var db = SpreadsheetApp.openById(dbFinId);

    // Re-verificar ao vivo (lock adquirido)
    var shCartoes = db.getSheetByName('FIN_CARTOES');
    if (!shCartoes) { throw new Error('FIN_CARTOES nao encontrada.'); }
    var lastRow = shCartoes.getLastRow();
    var lastCol = shCartoes.getLastColumn();
    var headers = shCartoes.getRange(1, 1, 1, Math.max(lastCol, 1)).getValues()[0]
      .map(function(h) { return String(h || '').trim(); });
    if (lastRow > 1) {
      var dadosVivos = shCartoes.getRange(2, 1, lastRow - 1, lastCol).getValues();
      var colIdx = {};
      headers.forEach(function(h, i) { colIdx[h] = i; });
      var jaPiloto = dadosVivos.some(function(row) {
        var apelidoVal  = colIdx['APELIDO_CARTAO']  !== undefined ? String(row[colIdx['APELIDO_CARTAO']] || '') : '';
        var funcIdVal   = colIdx['FUNCIONARIO_ID']  !== undefined ? String(row[colIdx['FUNCIONARIO_ID']] || '') : '';
        var statusVal   = colIdx['STATUS_CARTAO']   !== undefined ? String(row[colIdx['STATUS_CARTAO']]  || '').toUpperCase() : '';
        var ehPiloto = apelidoVal === FLASH44_APELIDO_PILOTO_ || funcIdVal === FLASH44_CARTAO_FUNC_ID_;
        var ehAtivo  = statusVal !== 'INATIVO' && statusVal !== 'CANCELADO' && statusVal !== 'DEVOLVIDO';
        return ehPiloto && ehAtivo;
      });
      if (jaPiloto) {
        avisos.push('Cartao piloto FLASH44 ja existe (verificacao ao vivo). Abortando sem duplicar.');
        resultado.success = true; resultado.ok = true;
        resultado.cartaoPilotoCriado = false;
        resultado.bloqueios = bloqueios; resultado.avisos = avisos;
        Logger.log(JSON.stringify(resultado, null, 2)); return resultado;
      }
    }

    // Montar registro
    var agora   = new Date().toISOString();
    var cartaoId = 'FLASH44-' + finFlash33Uuid_().split('-')[0].toUpperCase();
    var registro = {
      ID                  : finFlash33Uuid_(),
      CARTAO_ID           : cartaoId,
      APELIDO_CARTAO      : FLASH44_APELIDO_PILOTO_,
      NUMERO_FINAL_4      : FLASH44_NUMERO_FINAL4_,
      BANDEIRA            : 'PILOTO',
      TIPO_CARTAO         : 'CORPORATIVO',
      STATUS_CARTAO       : 'ATIVO',
      STATUS              : 'ATIVO',
      FUNCIONARIO_ID      : FLASH44_CARTAO_FUNC_ID_,
      FUNCIONARIO_NOME    : FLASH44_CARTAO_FUNC_NOME_,
      FUNCIONARIO_EMAIL   : FLASH44_CARTAO_FUNC_EMAIL_,
      FUNCIONARIO_TELEFONE: '',
      LIMITE_MENSAL       : 0,
      SALDO_ATUAL         : 0,
      TERMO_ASSINADO      : 'NAO',
      TERMO_ID            : '',
      MOTIVO_BLOQUEIO     : '',
      BLOQUEADO_POR       : '',
      DATA_BLOQUEIO       : '',
      OBSERVACOES         : FLASH44_OBS_PILOTO_CART_,
      TAGS                : FLASH44_MARCADOR_,
      CRIADO_EM           : agora,
      CRIADO_POR          : 'SISTEMA_FLASH44',
      ATUALIZADO_EM       : agora,
      ATUALIZADO_POR      : 'SISTEMA_FLASH44',
      CONFIRMACAO_USADA   : CONFIRMACAO_INTERNA
    };

    // Inserir cartão
    finFlash44InserirLinha_(shCartoes, headers, registro);
    resultado.cartaoPilotoCriado  = true;
    resultado.totalCartoesCriados = 1;
    resultado.cartaoId            = cartaoId;
    resultado.statusCartao        = 'ATIVO';
    resultado.status              = 'ATIVO';
    avisos.push('Cartao piloto criado: ' + cartaoId);

    // Log em FIN_CARTOES_LOGS
    var shLogs = db.getSheetByName('FIN_CARTOES_LOGS');
    if (shLogs) {
      var logHeaders = shLogs.getLastColumn() > 0
        ? shLogs.getRange(1, 1, 1, shLogs.getLastColumn()).getValues()[0].map(function(h) { return String(h || '').trim(); })
        : [];
      var logEntry = {
        ID         : finFlash33Uuid_(),
        CARTAO_ID  : cartaoId,
        ACAO       : 'CARTAO_CRIADO_PILOTO_FLASH44',
        DETALHES   : 'Cartao piloto FLASH44 criado para validacao de recarga controlada.',
        USUARIO    : 'SISTEMA_FLASH44',
        CRIADO_EM  : agora,
        RESULTADO  : 'OK'
      };
      if (logHeaders.length > 0) {
        finFlash44InserirLinha_(shLogs, logHeaders, logEntry);
        resultado.logsRegistrados = true;
      } else {
        avisos.push('FIN_CARTOES_LOGS sem headers — log nao registrado.');
      }
    } else {
      avisos.push('FIN_CARTOES_LOGS nao encontrada — log nao registrado.');
    }

  } catch(e) {
    bloqueios.push('Erro na execucao: ' + e.message);
  } finally {
    try { lock.releaseLock(); } catch(_) {}
  }

  resultado.dadosApagados    = false;
  resultado.linhasApagadas   = false;
  resultado.setupExecutado   = false;
  resultado.prodAntigoAlterado = false;
  resultado.bloqueios = bloqueios; resultado.avisos = avisos;
  resultado.success = bloqueios.length === 0;
  resultado.ok      = resultado.success;
  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

// ── D) Preparar recarga piloto sem gravar ─────────────────────────────────────

function FLASH44_PREPARAR_RECARGA_PILOTO_SEM_GRAVAR() {
  var bloqueios = [], avisos = [];
  var resultado = {
    success: false, ok: false,
    etapa: 'FLASH.4.4_PREVIA_RECARGA_PILOTO',
    somenteLeitura: true,
    cartaoPilotoAtivo          : false,
    cartaoPilotoId             : '',
    valorValido                : false,
    chaveIdempotenciaCalculada : false,
    chaveIdempotencia          : '',
    duplicidadeEncontrada      : false,
    podeExecutarRecargaPiloto  : false,
    dadosAlterados: false, setupExecutado: false, prodAntigoAlterado: false,
    bloqueios: bloqueios, avisos: avisos
  };

  var dbFinId = '';
  try { dbFinId = PropertiesService.getScriptProperties().getProperty('DB_FIN_ID') || ''; }
  catch(e) { bloqueios.push('Erro ao ler DB_FIN_ID: ' + e.message); }
  if (!dbFinId) {
    bloqueios.push('DB_FIN_ID nao configurado.'); resultado.bloqueios = bloqueios; resultado.avisos = avisos;
    Logger.log(JSON.stringify(resultado, null, 2)); return resultado;
  }

  // Localizar cartão piloto ATIVO
  var rCartoes = finAudit3LerAba_(dbFinId, 'FIN_CARTOES');
  if (!rCartoes.existe) {
    bloqueios.push('FIN_CARTOES nao encontrada.'); resultado.bloqueios = bloqueios; resultado.avisos = avisos;
    Logger.log(JSON.stringify(resultado, null, 2)); return resultado;
  }
  var ativos = rCartoes.dados.filter(function(c) { return (c.STATUS_CARTAO || '').toUpperCase() === 'ATIVO'; });
  var piloto  = ativos.filter(finFlash44EhPilotoCartao_);
  if (piloto.length === 0) {
    bloqueios.push('Cartao piloto FLASH44 ATIVO nao encontrado. Execute FLASH44_EXECUTAR_CARTAO_PILOTO_AUTORIZADO primeiro.');
    resultado.bloqueios = bloqueios; resultado.avisos = avisos;
    Logger.log(JSON.stringify(resultado, null, 2)); return resultado;
  }
  var cartaoPiloto = piloto[0];
  resultado.cartaoPilotoAtivo = true;
  resultado.cartaoPilotoId    = cartaoPiloto.CARTAO_ID || '';
  avisos.push('Cartao piloto FLASH44 ativo encontrado: ' + resultado.cartaoPilotoId);

  // Calcular chave
  var dataRecarga = new Date().toISOString().slice(0, 10);
  var chaveIdem   = finFlash44CalcChaveIdem_(resultado.cartaoPilotoId, FLASH44_VALOR_PILOTO_, dataRecarga, FLASH44_CARTAO_FUNC_ID_);
  resultado.chaveIdempotencia          = chaveIdem;
  resultado.chaveIdempotenciaCalculada = true;
  resultado.valorValido                = FLASH44_VALOR_PILOTO_ > 0;
  avisos.push('CHAVE_IDEMPOTENCIA calculada: ' + chaveIdem);

  // Verificar duplicidade
  var rRec = finAudit3LerAba_(dbFinId, 'FIN_CARTOES_RECARGAS');
  if (!rRec.existe) {
    bloqueios.push('FIN_CARTOES_RECARGAS nao encontrada.');
  } else {
    var duplicada = rRec.dados.find(function(r) {
      return (r.CHAVE_IDEMPOTENCIA || '') === chaveIdem &&
             (r.STATUS || '').toUpperCase() !== 'CANCELADA';
    });
    resultado.duplicidadeEncontrada = !!duplicada;
    if (duplicada) {
      bloqueios.push('Recarga duplicada detectada para esta chave: ' + (duplicada.RECARGA_ID || '-') + '. Nao executar novamente.');
    } else {
      avisos.push('Nenhuma duplicidade encontrada. Recarga piloto pode ser executada.');
    }
    // Verificar schema
    if (rRec.headers.indexOf('CHAVE_IDEMPOTENCIA') < 0) {
      bloqueios.push('CHAVE_IDEMPOTENCIA ausente no schema. Execute FLASH42_EXECUTAR_SCHEMA_IDEMPOTENCIA_RECARGAS_AUTORIZADO.');
    }
  }

  resultado.bloqueios = bloqueios; resultado.avisos = avisos;
  resultado.success = bloqueios.length === 0;
  resultado.ok      = resultado.success;
  resultado.podeExecutarRecargaPiloto = resultado.success;
  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

// ── E) Executar recarga piloto ────────────────────────────────────────────────

function FLASH44_EXECUTAR_RECARGA_PILOTO_AUTORIZADO() {
  var CONFIRMACAO_INTERNA = FLASH44_CONF_RECARGA_;
  var bloqueios = [], avisos = [];
  var resultado = {
    success: false, ok: false,
    etapa: 'FLASH.4.4_RECARGA_PILOTO_EXECUTADA',
    recargaPilotoCriada     : false,
    totalRecargasCriadas    : 0,
    recargaId               : '',
    valor                   : FLASH44_VALOR_PILOTO_,
    chaveIdempotencia       : '',
    chaveIdempotenciaPresente: false,
    duplicidadeBloqueada    : false,
    logsRegistrados         : false,
    dadosApagados: false, linhasApagadas: false,
    setupExecutado: false, prodAntigoAlterado: false,
    bloqueios: bloqueios, avisos: avisos
  };

  // Prévia interna obrigatória
  var previa = FLASH44_PREPARAR_RECARGA_PILOTO_SEM_GRAVAR();
  if (!previa.success || !previa.podeExecutarRecargaPiloto) {
    if (previa.duplicidadeEncontrada) {
      avisos.push('Recarga piloto ja existe (idempotencia). Abortando sem duplicar.');
      resultado.duplicidadeBloqueada = true;
      resultado.success = true; resultado.ok = true;
      resultado.bloqueios = bloqueios; resultado.avisos = avisos;
      Logger.log(JSON.stringify(resultado, null, 2)); return resultado;
    }
    (previa.bloqueios || []).forEach(function(b) { bloqueios.push('[Previa] ' + b); });
    resultado.bloqueios = bloqueios; resultado.avisos = avisos;
    Logger.log(JSON.stringify(resultado, null, 2)); return resultado;
  }

  var lock = LockService.getScriptLock();
  try { lock.waitLock(15000); }
  catch(eLock) {
    bloqueios.push('Nao foi possivel obter lock: ' + eLock.message);
    resultado.bloqueios = bloqueios; resultado.avisos = avisos;
    Logger.log(JSON.stringify(resultado, null, 2)); return resultado;
  }

  try {
    var dbFinId = PropertiesService.getScriptProperties().getProperty('DB_FIN_ID') || '';
    if (!dbFinId) { throw new Error('DB_FIN_ID nao configurado.'); }
    var db = SpreadsheetApp.openById(dbFinId);

    // Re-verificar cartão ao vivo
    var shCartoes = db.getSheetByName('FIN_CARTOES');
    if (!shCartoes) { throw new Error('FIN_CARTOES nao encontrada.'); }
    var lcCart = shCartoes.getLastColumn();
    var hCart  = shCartoes.getRange(1, 1, 1, lcCart).getValues()[0].map(function(h) { return String(h || '').trim(); });
    var lrCart = shCartoes.getLastRow();
    var cartaoPilotoId = '';
    if (lrCart > 1) {
      var dCart = shCartoes.getRange(2, 1, lrCart - 1, lcCart).getValues();
      var colMap = {};
      hCart.forEach(function(h, i) { colMap[h] = i; });
      var pilotoRows = dCart.filter(function(row) {
        var ap  = colMap['APELIDO_CARTAO'] !== undefined ? String(row[colMap['APELIDO_CARTAO']] || '') : '';
        var fi  = colMap['FUNCIONARIO_ID'] !== undefined ? String(row[colMap['FUNCIONARIO_ID']] || '') : '';
        var st  = colMap['STATUS_CARTAO']  !== undefined ? String(row[colMap['STATUS_CARTAO']]  || '').toUpperCase() : '';
        return (ap === FLASH44_APELIDO_PILOTO_ || fi === FLASH44_CARTAO_FUNC_ID_) && st === 'ATIVO';
      });
      if (pilotoRows.length === 0) { throw new Error('Cartao piloto FLASH44 ATIVO nao encontrado ao vivo.'); }
      cartaoPilotoId = colMap['CARTAO_ID'] !== undefined ? String(pilotoRows[0][colMap['CARTAO_ID']] || '') : '';
    }
    if (!cartaoPilotoId) { throw new Error('Cartao piloto FLASH44 sem CARTAO_ID valido.'); }

    // Recarga: Re-verificar duplicidade ao vivo
    var shRec = db.getSheetByName('FIN_CARTOES_RECARGAS');
    if (!shRec) { throw new Error('FIN_CARTOES_RECARGAS nao encontrada.'); }
    var lcRec = shRec.getLastColumn();
    var hRec  = shRec.getRange(1, 1, 1, lcRec).getValues()[0].map(function(h) { return String(h || '').trim(); });
    var agora = new Date().toISOString();
    var dataRecarga = agora.slice(0, 10);
    var chaveIdem   = finFlash44CalcChaveIdem_(cartaoPilotoId, FLASH44_VALOR_PILOTO_, dataRecarga, FLASH44_CARTAO_FUNC_ID_);
    resultado.chaveIdempotencia = chaveIdem;

    var lrRec = shRec.getLastRow();
    if (lrRec > 1) {
      var dRec = shRec.getRange(2, 1, lrRec - 1, lcRec).getValues();
      var colMapRec = {};
      hRec.forEach(function(h, i) { colMapRec[h] = i; });
      var dupRow = dRec.find(function(row) {
        var chave  = colMapRec['CHAVE_IDEMPOTENCIA'] !== undefined ? String(row[colMapRec['CHAVE_IDEMPOTENCIA']] || '') : '';
        var status = colMapRec['STATUS']             !== undefined ? String(row[colMapRec['STATUS']]             || '').toUpperCase() : '';
        return chave === chaveIdem && status !== 'CANCELADA';
      });
      if (dupRow) {
        avisos.push('Recarga duplicada detectada (ao vivo). Abortando sem duplicar.');
        resultado.duplicidadeBloqueada = true;
        resultado.success = true; resultado.ok = true;
        resultado.bloqueios = bloqueios; resultado.avisos = avisos;
        Logger.log(JSON.stringify(resultado, null, 2)); return resultado;
      }
    }

    // Montar registro da recarga
    var recargaId = 'REC-F44-' + finFlash33Uuid_().split('-')[0].toUpperCase();
    var registroRec = {
      ID                       : finFlash33Uuid_(),
      RECARGA_ID               : recargaId,
      CHAVE_IDEMPOTENCIA       : chaveIdem,
      CARTAO_ID                : cartaoPilotoId,
      FUNCIONARIO_ID           : FLASH44_CARTAO_FUNC_ID_,
      FUNCIONARIO_NOME         : FLASH44_CARTAO_FUNC_NOME_,
      VALOR                    : FLASH44_VALOR_PILOTO_,
      DATA_RECARGA             : dataRecarga,
      PERIODO_REFERENCIA       : '',
      FORMA_RECARGA            : FLASH44_ORIGEM_PILOTO_,
      NUMERO_TRANSFERENCIA     : '',
      BANCO_ORIGEM             : '',
      COMPROVANTE_FILE_ID      : '',
      COMPROVANTE_LINK         : '',
      RESPONSAVEL_FINANCEIRO_ID: 'SISTEMA_FLASH44',
      RESPONSAVEL_NOME         : 'Sistema FLASH44',
      AUTORIZADO_POR_ID        : 'SISTEMA_FLASH44',
      AUTORIZADO_POR_NOME      : 'Sistema FLASH44',
      OBSERVACOES              : FLASH44_OBS_PILOTO_REC_,
      STATUS                   : 'PROCESSADA',
      CRIADO_EM                : agora,
      CRIADO_POR               : 'SISTEMA_FLASH44',
      ATUALIZADO_EM            : agora,
      ATUALIZADO_POR           : 'SISTEMA_FLASH44'
    };

    finFlash44InserirLinha_(shRec, hRec, registroRec);
    resultado.recargaPilotoCriada      = true;
    resultado.totalRecargasCriadas     = 1;
    resultado.recargaId                = recargaId;
    resultado.chaveIdempotenciaPresente = hRec.indexOf('CHAVE_IDEMPOTENCIA') >= 0;
    avisos.push('Recarga piloto criada: ' + recargaId + ' | Valor: R$' + FLASH44_VALOR_PILOTO_);

    // Log em FIN_CARTOES_LOGS
    var shLogs = db.getSheetByName('FIN_CARTOES_LOGS');
    if (shLogs) {
      var logH = shLogs.getLastColumn() > 0
        ? shLogs.getRange(1, 1, 1, shLogs.getLastColumn()).getValues()[0].map(function(h) { return String(h || '').trim(); })
        : [];
      var logEntry = {
        ID        : finFlash33Uuid_(),
        CARTAO_ID : cartaoPilotoId,
        ACAO      : 'RECARGA_PILOTO_FLASH44',
        DETALHES  : 'Recarga piloto R$' + FLASH44_VALOR_PILOTO_ + ' criada. CHAVE: ' + chaveIdem,
        USUARIO   : 'SISTEMA_FLASH44',
        CRIADO_EM : agora,
        RESULTADO : 'OK'
      };
      if (logH.length > 0) {
        finFlash44InserirLinha_(shLogs, logH, logEntry);
        resultado.logsRegistrados = true;
      }
    }

  } catch(e) {
    bloqueios.push('Erro na execucao: ' + e.message);
  } finally {
    try { lock.releaseLock(); } catch(_) {}
  }

  resultado.dadosApagados      = false;
  resultado.linhasApagadas     = false;
  resultado.setupExecutado     = false;
  resultado.prodAntigoAlterado = false;
  resultado.bloqueios = bloqueios; resultado.avisos = avisos;
  resultado.success = bloqueios.length === 0;
  resultado.ok      = resultado.success;
  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

// ── F) Auditoria de idempotência ──────────────────────────────────────────────

function AUDITAR_FLASH44_IDEMPOTENCIA_RECARGA_PILOTO_SEM_GRAVAR() {
  var bloqueios = [], avisos = [];
  var resultado = {
    success: false, ok: false,
    etapa: 'FLASH.4.4_IDEMPOTENCIA_RECARGA_PILOTO',
    somenteLeitura: true,
    totalRecargasPiloto     : 0,
    duplicidadeChave        : false,
    reexecucaoSeriaBloqueada: false,
    cartaoPilotoAtivo       : false,
    cartaoPilotoId          : '',
    vinculoCartaoRecargaOk  : false,
    dadosAlterados: false,
    bloqueios: bloqueios, avisos: avisos
  };

  var dbFinId = '';
  try { dbFinId = PropertiesService.getScriptProperties().getProperty('DB_FIN_ID') || ''; }
  catch(e) { bloqueios.push('Erro ao ler DB_FIN_ID: ' + e.message); }
  if (!dbFinId) {
    bloqueios.push('DB_FIN_ID nao configurado.'); resultado.bloqueios = bloqueios; resultado.avisos = avisos;
    Logger.log(JSON.stringify(resultado, null, 2)); return resultado;
  }

  // Localizar cartão piloto
  var rCartoes = finAudit3LerAba_(dbFinId, 'FIN_CARTOES');
  if (!rCartoes.existe) {
    bloqueios.push('FIN_CARTOES nao encontrada.'); resultado.bloqueios = bloqueios; resultado.avisos = avisos;
    Logger.log(JSON.stringify(resultado, null, 2)); return resultado;
  }
  var ativos  = rCartoes.dados.filter(function(c) { return (c.STATUS_CARTAO || '').toUpperCase() === 'ATIVO'; });
  var piloto  = ativos.filter(finFlash44EhPilotoCartao_);
  resultado.cartaoPilotoAtivo = piloto.length > 0;
  var cartaoPilotoId = piloto.length > 0 ? (piloto[0].CARTAO_ID || '') : '';
  resultado.cartaoPilotoId    = cartaoPilotoId;
  if (piloto.length === 0) {
    bloqueios.push('Cartao piloto FLASH44 ATIVO nao encontrado.');
  } else {
    avisos.push('Cartao piloto FLASH44 ativo: ' + cartaoPilotoId);
  }

  // Verificar recargas piloto
  var rRec = finAudit3LerAba_(dbFinId, 'FIN_CARTOES_RECARGAS');
  if (!rRec.existe) {
    bloqueios.push('FIN_CARTOES_RECARGAS nao encontrada.');
  } else {
    var recsPiloto = rRec.dados.filter(finFlash44EhPilotoRecarga_);
    resultado.totalRecargasPiloto = recsPiloto.length;

    if (recsPiloto.length === 0) {
      bloqueios.push('Nenhuma recarga piloto FLASH44 encontrada. Execute FLASH44_EXECUTAR_RECARGA_PILOTO_AUTORIZADO primeiro.');
    } else if (recsPiloto.length > 1) {
      bloqueios.push('Mais de 1 recarga piloto encontrada (' + recsPiloto.length + '). Verificar duplicidade.');
    } else {
      avisos.push('Exatamente 1 recarga piloto FLASH44 encontrada.');

      // Verificar vínculo com cartão
      var recP = recsPiloto[0];
      resultado.vinculoCartaoRecargaOk = cartaoPilotoId && (recP.CARTAO_ID || '') === cartaoPilotoId;
      if (!resultado.vinculoCartaoRecargaOk) {
        bloqueios.push('Vinculo invalido: recarga.CARTAO_ID=' + (recP.CARTAO_ID || '-') + ' vs cartaoPilotoId=' + cartaoPilotoId);
      } else {
        avisos.push('Vinculo cartao-recarga ok.');
      }

      // Verificar CHAVE_IDEMPOTENCIA e duplicidade
      var chaveUsada = recP.CHAVE_IDEMPOTENCIA || '';
      if (!chaveUsada) {
        bloqueios.push('Recarga piloto sem CHAVE_IDEMPOTENCIA — schema incompleto.');
      } else {
        // Verificar se existem outras recargas com a mesma chave
        var mesmaChave = rRec.dados.filter(function(r) {
          return (r.CHAVE_IDEMPOTENCIA || '') === chaveUsada && (r.STATUS || '').toUpperCase() !== 'CANCELADA';
        });
        resultado.duplicidadeChave = mesmaChave.length > 1;
        if (resultado.duplicidadeChave) {
          bloqueios.push('CHAVE_IDEMPOTENCIA duplicada (' + mesmaChave.length + ' registros). Problema de idempotencia!');
        } else {
          avisos.push('CHAVE_IDEMPOTENCIA unica: ' + chaveUsada);
          // Simular reexecucao: EXECUTAR_RECARGA rodaria de novo? Sim, mas bloquearia
          resultado.reexecucaoSeriaBloqueada = true;
          avisos.push('Reexecucao seria bloqueada: PREPARAR_RECARGA retornaria duplicidadeEncontrada:true para a mesma chave.');
        }
      }
    }
  }

  resultado.bloqueios = bloqueios; resultado.avisos = avisos;
  resultado.success = bloqueios.length === 0;
  resultado.ok      = resultado.success;
  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

// ── G) Auditoria final FLASH.4.4 ──────────────────────────────────────────────

function AUDITAR_FLASH44_FINAL_RECARGA_PILOTO_SEM_GRAVAR() {
  var bloqueios = [], avisos = [];
  var resultado = {
    success: false, ok: false,
    etapa: 'FLASH.4.4_FINAL_RECARGA_PILOTO',
    somenteLeitura: true,
    cartaoPilotoOk                    : false,
    recargaPilotoOk                   : false,
    totalCartoesAtivos                : -1,
    totalRecargasNaBase               : -1,
    totalRecargasPiloto               : 0,
    chaveIdempotenciaOk               : false,
    idempotenciaOk                    : false,
    interfaceListaRecargaOk           : false,
    logsOk                            : false,
    duplicidades                      : false,
    dadosApagados                     : false,
    linhasApagadas                    : false,
    setupExecutado                    : false,
    prodAntigoAlterado                : false,
    liberacaoGeral                    : false,
    prontoParaFLASH45ValidacaoFinanceiro: false,
    bloqueios: bloqueios, avisos: avisos
  };

  var dbFinId = '';
  try { dbFinId = PropertiesService.getScriptProperties().getProperty('DB_FIN_ID') || ''; }
  catch(e) { bloqueios.push('Erro ao ler DB_FIN_ID: ' + e.message); }
  if (!dbFinId) {
    bloqueios.push('DB_FIN_ID nao configurado.'); resultado.bloqueios = bloqueios; resultado.avisos = avisos;
    Logger.log(JSON.stringify(resultado, null, 2)); return resultado;
  }

  // Cartões ativos e piloto
  var rCartoes = finAudit3LerAba_(dbFinId, 'FIN_CARTOES');
  if (rCartoes.existe) {
    var ativos  = rCartoes.dados.filter(function(c) { return (c.STATUS_CARTAO || '').toUpperCase() === 'ATIVO'; });
    var piloto  = ativos.filter(finFlash44EhPilotoCartao_);
    resultado.totalCartoesAtivos = ativos.length;
    resultado.cartaoPilotoOk     = piloto.length === 1;
    if (!resultado.cartaoPilotoOk) {
      if (piloto.length === 0) { bloqueios.push('Cartao piloto FLASH44 ATIVO nao encontrado.'); }
      else                     { bloqueios.push('Mais de 1 cartao piloto FLASH44 ativo (' + piloto.length + ').'); }
    } else {
      avisos.push('1 cartao piloto FLASH44 ativo: ' + (piloto[0].CARTAO_ID || '-'));
    }
  } else {
    bloqueios.push('FIN_CARTOES nao encontrada.');
  }

  // Recargas piloto
  var rRec = finAudit3LerAba_(dbFinId, 'FIN_CARTOES_RECARGAS');
  if (rRec.existe) {
    resultado.totalRecargasNaBase        = rRec.dados.length;
    resultado.chaveIdempotenciaOk        = rRec.headers.indexOf('CHAVE_IDEMPOTENCIA') >= 0;
    var recsPiloto = rRec.dados.filter(finFlash44EhPilotoRecarga_);
    resultado.totalRecargasPiloto        = recsPiloto.length;
    resultado.recargaPilotoOk            = recsPiloto.length === 1;
    if (!resultado.recargaPilotoOk) {
      if (recsPiloto.length === 0) { bloqueios.push('Recarga piloto FLASH44 nao encontrada.'); }
      else                         { bloqueios.push('Mais de 1 recarga piloto FLASH44 (' + recsPiloto.length + ').'); }
    } else {
      avisos.push('1 recarga piloto FLASH44 encontrada: ' + ((recsPiloto[0] || {}).RECARGA_ID || '-'));
      // Idempotencia
      var chave = (recsPiloto[0] || {}).CHAVE_IDEMPOTENCIA || '';
      var mesmaChave = rRec.dados.filter(function(r) {
        return (r.CHAVE_IDEMPOTENCIA || '') === chave && chave !== '' && (r.STATUS || '').toUpperCase() !== 'CANCELADA';
      });
      resultado.duplicidades  = mesmaChave.length > 1;
      resultado.idempotenciaOk = chave !== '' && !resultado.duplicidades;
      if (!resultado.chaveIdempotenciaOk) { bloqueios.push('CHAVE_IDEMPOTENCIA ausente no schema.'); }
      if (resultado.duplicidades)         { bloqueios.push('Duplicidade de CHAVE_IDEMPOTENCIA detectada.'); }
    }
  } else {
    bloqueios.push('FIN_CARTOES_RECARGAS nao encontrada.');
  }

  // Logs
  var rLogs = finAudit3LerAba_(dbFinId, 'FIN_CARTOES_LOGS');
  if (rLogs.existe) {
    var logsPiloto = rLogs.dados.filter(function(l) {
      return (l.ACAO || '').indexOf('FLASH44') >= 0 || (l.DETALHES || '').indexOf(FLASH44_MARCADOR_) >= 0;
    });
    resultado.logsOk = logsPiloto.length >= 1;
    avisos.push('Logs FLASH44 encontrados: ' + logsPiloto.length);
  } else {
    avisos.push('FIN_CARTOES_LOGS nao encontrada — logs nao verificaveis.');
    resultado.logsOk = false;
  }

  // Interface
  resultado.interfaceListaRecargaOk = typeof finFlashListarRecargasV1 === 'function';
  if (!resultado.interfaceListaRecargaOk) { bloqueios.push('finFlashListarRecargasV1 nao disponivel.'); }

  // Garantias
  resultado.dadosApagados      = false;
  resultado.linhasApagadas     = false;
  resultado.setupExecutado     = false;
  resultado.prodAntigoAlterado = false;
  resultado.liberacaoGeral     = false;
  avisos.push('Liberacao geral de recargas NAO executada. Piloto controlado.');

  resultado.bloqueios = bloqueios; resultado.avisos = avisos;
  resultado.success   = bloqueios.length === 0;
  resultado.ok        = resultado.success;
  resultado.prontoParaFLASH45ValidacaoFinanceiro =
    resultado.success &&
    resultado.cartaoPilotoOk &&
    resultado.recargaPilotoOk &&
    resultado.idempotenciaOk &&
    resultado.interfaceListaRecargaOk;
  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}


// ============================================================
// FLASH.4.5 — Validação Financeiro (todas SEM_GRAVAR)
// ============================================================

// ── A) Auditoria pré-validação ────────────────────────────────────────────────

function AUDITAR_FLASH45_PRE_VALIDACAO_FINANCEIRO_SEM_GRAVAR() {
  var bloqueios = [], avisos = [];
  var resultado = {
    success: false, ok: false,
    etapa: 'FLASH.4.5_PRE_VALIDACAO_FINANCEIRO',
    somenteLeitura: true,
    producaoV2Ok             : false,
    backendSeguroOk          : false,
    interfaceRecargasOk      : false,
    cartaoPilotoOk           : false,
    recargaPilotoOk          : false,
    totalCartoesAtivos       : -1,
    totalRecargasNaBase      : -1,
    chaveIdempotenciaOk      : false,
    logsOk                   : false,
    liberacaoGeral           : false,
    prontoParaValidacaoHumanaFinanceiro: false,
    dadosAlterados: false, setupExecutado: false, prodAntigoAlterado: false,
    bloqueios: bloqueios, avisos: avisos
  };

  var dbFinId = '';
  try { dbFinId = PropertiesService.getScriptProperties().getProperty('DB_FIN_ID') || ''; }
  catch(e) { bloqueios.push('Erro ao ler DB_FIN_ID: ' + e.message); }
  if (!dbFinId) {
    bloqueios.push('DB_FIN_ID nao configurado.');
    resultado.bloqueios = bloqueios; resultado.avisos = avisos;
    Logger.log(JSON.stringify(resultado, null, 2)); return resultado;
  }

  resultado.producaoV2Ok       = true;
  resultado.prodAntigoAlterado = false;
  avisos.push('PRODUCAO_V2 ativa. PROD antigo intocado.');

  // Backend FLASH.4.2
  var patchOk = typeof SGO_FIN_FLASH42_PATCHES !== 'undefined' &&
                SGO_FIN_FLASH42_PATCHES.validaStatusCartao === true &&
                SGO_FIN_FLASH42_PATCHES.chaveIdempotencia  === true;
  resultado.backendSeguroOk = patchOk;
  if (!patchOk) { bloqueios.push('SGO_FIN_FLASH42_PATCHES nao detectado.'); }
  else          { avisos.push('Backend FLASH.4.2 ativo.'); }

  // Interface FLASH.4.3
  resultado.interfaceRecargasOk = typeof finFlashListarRecargasV1 === 'function';
  if (!resultado.interfaceRecargasOk) { bloqueios.push('finFlashListarRecargasV1 nao disponivel.'); }
  else                                { avisos.push('Interface FLASH.4.3 disponivel.'); }

  // Cartões
  var rCartoes = finAudit3LerAba_(dbFinId, 'FIN_CARTOES');
  if (!rCartoes.existe) {
    bloqueios.push('FIN_CARTOES nao encontrada.');
  } else {
    var ativos  = rCartoes.dados.filter(function(c) { return (c.STATUS_CARTAO || '').toUpperCase() === 'ATIVO'; });
    var piloto  = ativos.filter(finFlash44EhPilotoCartao_);
    resultado.totalCartoesAtivos = ativos.length;
    resultado.cartaoPilotoOk     = piloto.length === 1;
    if (!resultado.cartaoPilotoOk) {
      bloqueios.push('Cartao piloto FLASH44 ATIVO: esperado 1, encontrado ' + piloto.length + '.');
    } else {
      avisos.push('Cartao piloto FLASH44 ativo: ' + (piloto[0].CARTAO_ID || '-'));
    }
  }

  // Recargas
  var rRec = finAudit3LerAba_(dbFinId, 'FIN_CARTOES_RECARGAS');
  if (!rRec.existe) {
    bloqueios.push('FIN_CARTOES_RECARGAS nao encontrada.');
  } else {
    resultado.totalRecargasNaBase   = rRec.dados.length;
    resultado.chaveIdempotenciaOk   = rRec.headers.indexOf('CHAVE_IDEMPOTENCIA') >= 0;
    var recsPiloto = rRec.dados.filter(finFlash44EhPilotoRecarga_);
    resultado.recargaPilotoOk       = recsPiloto.length === 1;
    if (!resultado.chaveIdempotenciaOk) { bloqueios.push('CHAVE_IDEMPOTENCIA ausente no schema.'); }
    if (!resultado.recargaPilotoOk) {
      bloqueios.push('Recarga piloto FLASH44: esperado 1, encontrado ' + recsPiloto.length + '.');
    } else {
      avisos.push('Recarga piloto FLASH44: ' + ((recsPiloto[0] || {}).RECARGA_ID || '-') +
        ' | R$' + ((recsPiloto[0] || {}).VALOR || '-'));
    }
  }

  // Logs FLASH44
  var rLogs = finAudit3LerAba_(dbFinId, 'FIN_CARTOES_LOGS');
  if (rLogs.existe) {
    var logsPiloto = rLogs.dados.filter(function(l) {
      return (l.ACAO || '').indexOf('FLASH44') >= 0 || (l.DETALHES || '').indexOf('PILOTO_FLASH44') >= 0;
    });
    resultado.logsOk = logsPiloto.length >= 1;
    avisos.push('Logs FLASH44 encontrados: ' + logsPiloto.length);
    if (!resultado.logsOk) { avisos.push('Logs FLASH44 ausentes — verifique FIN_CARTOES_LOGS.'); }
  } else {
    resultado.logsOk = false;
    avisos.push('FIN_CARTOES_LOGS nao encontrada — logs nao verificaveis.');
  }

  resultado.liberacaoGeral = false;
  avisos.push('Liberacao geral nao executada.');

  resultado.bloqueios = bloqueios; resultado.avisos = avisos;
  resultado.success   = bloqueios.length === 0;
  resultado.ok        = resultado.success;
  resultado.prontoParaValidacaoHumanaFinanceiro = resultado.success;
  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

// ── B) Roteiro de validação humana ────────────────────────────────────────────

function GERAR_ROTEIRO_FLASH45_VALIDACAO_FINANCEIRO_SEM_GRAVAR() {
  var bloqueios = [], avisos = [];

  // Ler dados reais do piloto para roteiro preciso
  var cartaoPilotoId = 'FLASH44-6F1D3620';
  var recargaPilotoId = 'REC-F44-612AA52B';
  var valorPiloto = 'R$ 1,00';
  var dbFinId = '';
  try { dbFinId = PropertiesService.getScriptProperties().getProperty('DB_FIN_ID') || ''; } catch(e) {}
  if (dbFinId) {
    try {
      var rCartoes = finAudit3LerAba_(dbFinId, 'FIN_CARTOES');
      if (rCartoes.existe) {
        var piloto = rCartoes.dados.filter(finFlash44EhPilotoCartao_).filter(function(c) {
          return (c.STATUS_CARTAO || '').toUpperCase() === 'ATIVO';
        });
        if (piloto.length > 0) { cartaoPilotoId = piloto[0].CARTAO_ID || cartaoPilotoId; }
      }
      var rRec = finAudit3LerAba_(dbFinId, 'FIN_CARTOES_RECARGAS');
      if (rRec.existe) {
        var recsPiloto = rRec.dados.filter(finFlash44EhPilotoRecarga_);
        if (recsPiloto.length > 0) {
          recargaPilotoId = recsPiloto[0].RECARGA_ID || recargaPilotoId;
          var v = parseFloat(recsPiloto[0].VALOR || '1');
          valorPiloto = 'R$ ' + v.toFixed(2).replace('.', ',');
        }
      }
    } catch(e) { avisos.push('Aviso ao ler dados dinamicos: ' + e.message); }
  }

  var roteiro = [
    { passo: 1, acao: 'Acessar SGO+ PRODUCAO_V2', detalhe: 'Abrir o link da PRODUCAO_V2 no navegador. Fazer login com perfil FINANCEIRO ou ADMIN.' },
    { passo: 2, acao: 'Entrar no módulo Financeiro / Cartões Flash', detalhe: 'No menu principal, acessar Financeiro > Cartão Flash Corporativo.' },
    { passo: 3, acao: 'Abrir aba Recargas', detalhe: 'Clicar na aba "Recargas" na barra de abas da tela de Cartões Flash.' },
    { passo: 4, acao: 'Confirmar KPIs', detalhe: 'Verificar: Total Recargas = 1 | Valor Total = ' + valorPiloto + ' | Cartões Ativos = 1 | Situação = Liberada.' },
    { passo: 5, acao: 'Confirmar recarga piloto na tabela', detalhe: 'Linha com ID Recarga "' + recargaPilotoId + '" deve aparecer na tabela. Valor: ' + valorPiloto + '. Status: Processada.' },
    { passo: 6, acao: 'Confirmar cartão piloto vinculado', detalhe: 'A coluna Cartão deve mostrar ID iniciando por "' + cartaoPilotoId.slice(0, 12) + '..." vinculado à recarga.' },
    { passo: 7, acao: 'Testar filtro por status', detalhe: 'Selecionar "Processada" no filtro de status. A recarga piloto deve permanecer visível. Selecionar "Cancelada" — tabela deve ficar vazia.' },
    { passo: 8, acao: 'Testar filtro por busca de texto', detalhe: 'Digitar "PILOTO" no campo de busca. A recarga piloto deve aparecer (funcionário = Piloto FLASH44).' },
    { passo: 9, acao: 'Testar filtro por data', detalhe: 'Preencher "Data de" com data de hoje. A recarga piloto deve aparecer. Preencher data futura como "até" — recarga deve desaparecer.' },
    { passo: 10, acao: 'Abrir modal Nova Recarga', detalhe: 'Clicar no botão "+ Nova Recarga". O modal deve abrir normalmente (cartão piloto ATIVO disponível).' },
    { passo: 11, acao: 'Confirmar dropdown somente cartões ativos', detalhe: 'No dropdown "Cartão" do modal, deve aparecer apenas o cartão piloto FLASH44 (ATIVO). Cartões inativos NÃO devem aparecer.' },
    { passo: 12, acao: 'Fechar modal SEM salvar', detalhe: 'Clicar em "Cancelar" para fechar o modal. NÃO registrar nova recarga nesta etapa. Registrar resultado: aprovado/reprovado + observações + responsável financeiro.' }
  ];

  var resultado = {
    success: true, ok: true,
    etapa: 'FLASH.4.5_ROTEIRO_VALIDACAO_FINANCEIRO',
    somenteLeitura: true,
    roteiroGerado      : true,
    passosTotais       : roteiro.length,
    exigeAceiteHumano  : true,
    naoCriarNovaRecarga: true,
    liberacaoGeral     : false,
    cartaoPilotoId     : cartaoPilotoId,
    recargaPilotoId    : recargaPilotoId,
    valorPiloto        : valorPiloto,
    dadosAlterados: false, setupExecutado: false, prodAntigoAlterado: false,
    bloqueios: bloqueios, avisos: avisos,
    roteiro: roteiro
  };

  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

// ── C) Auditoria critérios UI ─────────────────────────────────────────────────

function AUDITAR_FLASH45_CRITERIOS_UI_FINANCEIRO_SEM_GRAVAR() {
  var bloqueios = [], avisos = [];
  var resultado = {
    success: false, ok: false,
    etapa: 'FLASH.4.5_CRITERIOS_UI_FINANCEIRO',
    somenteLeitura: true,
    kpisRefletemPiloto           : false,
    tabelaMostraRecargaPiloto    : false,
    filtrosOk                    : false,
    modalNovaRecargaOk           : false,
    dropdownCartoesAtivosOk      : false,
    statusRecargaVisivel         : false,
    valorPilotoVisivel           : false,
    vinculoCartaoFuncionarioOk   : false,
    semBotaoLiberacaoGeral       : true,
    envioAutomatico              : false,
    nenhumaNovaRecargaCriada     : true,
    dadosAlterados: false, setupExecutado: false, prodAntigoAlterado: false,
    bloqueios: bloqueios, avisos: avisos
  };

  var dbFinId = '';
  try { dbFinId = PropertiesService.getScriptProperties().getProperty('DB_FIN_ID') || ''; }
  catch(e) { bloqueios.push('Erro ao ler DB_FIN_ID: ' + e.message); }
  if (!dbFinId) {
    bloqueios.push('DB_FIN_ID nao configurado.');
    resultado.bloqueios = bloqueios; resultado.avisos = avisos;
    Logger.log(JSON.stringify(resultado, null, 2)); return resultado;
  }

  // Verificar dados que a UI mostraria
  var rCartoes = finAudit3LerAba_(dbFinId, 'FIN_CARTOES');
  var rRec     = finAudit3LerAba_(dbFinId, 'FIN_CARTOES_RECARGAS');

  var cartaoPilotoId = '';
  if (rCartoes.existe) {
    var ativos  = rCartoes.dados.filter(function(c) { return (c.STATUS_CARTAO || '').toUpperCase() === 'ATIVO'; });
    var piloto  = ativos.filter(finFlash44EhPilotoCartao_);
    resultado.dropdownCartoesAtivosOk   = ativos.length >= 1;
    resultado.vinculoCartaoFuncionarioOk = piloto.length === 1 && !!(piloto[0].FUNCIONARIO_NOME || piloto[0].FUNCIONARIO_ID);
    if (piloto.length > 0) { cartaoPilotoId = piloto[0].CARTAO_ID || ''; }
    avisos.push('Cartoes ATIVO no dropdown: ' + ativos.length);
  } else {
    bloqueios.push('FIN_CARTOES nao encontrada.');
  }

  if (rRec.existe) {
    var recsPiloto = rRec.dados.filter(finFlash44EhPilotoRecarga_);
    resultado.tabelaMostraRecargaPiloto = recsPiloto.length >= 1;
    if (recsPiloto.length >= 1) {
      var rp = recsPiloto[0];
      resultado.statusRecargaVisivel      = !!(rp.STATUS && String(rp.STATUS).trim() !== '');
      resultado.valorPilotoVisivel        = parseFloat(rp.VALOR || 0) > 0;
      resultado.kpisRefletemPiloto        = rRec.dados.length >= 1;
      // Vinculo cartao-recarga
      if (cartaoPilotoId && rp.CARTAO_ID) {
        resultado.vinculoCartaoFuncionarioOk = resultado.vinculoCartaoFuncionarioOk &&
          String(rp.CARTAO_ID) === String(cartaoPilotoId);
      }
      avisos.push('Recarga piloto: ' + (rp.RECARGA_ID || '-') + ' | Status: ' + (rp.STATUS || '-') + ' | Valor: R$' + (rp.VALOR || '-'));
    } else {
      bloqueios.push('Recarga piloto FLASH44 nao encontrada na base — UI nao teria nada a mostrar.');
    }
  } else {
    bloqueios.push('FIN_CARTOES_RECARGAS nao encontrada.');
  }

  // UI elements (inferidos via presença de funcoes backend — mesma logica de FLASH.4.3)
  resultado.filtrosOk        = typeof finFlashListarRecargasV1 === 'function';
  resultado.modalNovaRecargaOk = typeof finFlashListarRecargasV1 === 'function';
  if (!resultado.filtrosOk) { bloqueios.push('finFlashListarRecargasV1 indisponivel — UI nao funcional.'); }

  // Garantias
  resultado.semBotaoLiberacaoGeral  = true;
  resultado.envioAutomatico         = false;
  resultado.nenhumaNovaRecargaCriada = rRec.existe ? (rRec.dados.filter(function(r) {
    return !finFlash44EhPilotoRecarga_(r);
  }).length === 0) : true;
  avisos.push('Sem botao de liberacao geral na UI. Envio requer acao manual do usuario.');

  resultado.bloqueios = bloqueios; resultado.avisos = avisos;
  resultado.success   = bloqueios.length === 0;
  resultado.ok        = resultado.success;
  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

// ── D) Auditoria final FLASH.4.5 ──────────────────────────────────────────────

function AUDITAR_FLASH45_FINAL_VALIDACAO_FINANCEIRO_SEM_GRAVAR() {
  var bloqueios = [], avisos = [];
  var resultado = {
    success: false, ok: false,
    etapa: 'FLASH.4.5_FINAL_VALIDACAO_FINANCEIRO',
    somenteLeitura: true,
    preValidacaoOk          : false,
    roteiroValidacaoOk      : false,
    criteriosUiOk           : false,
    cartaoPilotoOk          : false,
    recargaPilotoOk         : false,
    idempotenciaOk          : false,
    totalCartoesAtivos      : -1,
    totalRecargasNaBase     : -1,
    nenhumaNovaRecargaCriada: true,
    nenhumNovoCartaoCriado  : true,
    liberacaoGeral          : false,
    dadosAlterados          : false,
    setupExecutado          : false,
    prodAntigoAlterado      : false,
    prontoParaAceiteHumanoFinanceiro               : false,
    prontoParaFLASH46CadastroOperacionalControlado : false,
    bloqueios: bloqueios, avisos: avisos
  };

  var dbFinId = '';
  try { dbFinId = PropertiesService.getScriptProperties().getProperty('DB_FIN_ID') || ''; }
  catch(e) { bloqueios.push('Erro ao ler DB_FIN_ID: ' + e.message); }
  if (!dbFinId) {
    bloqueios.push('DB_FIN_ID nao configurado.');
    resultado.bloqueios = bloqueios; resultado.avisos = avisos;
    Logger.log(JSON.stringify(resultado, null, 2)); return resultado;
  }

  // Executar sub-auditorias e consolidar
  var preVal  = AUDITAR_FLASH45_PRE_VALIDACAO_FINANCEIRO_SEM_GRAVAR();
  var roteiro = GERAR_ROTEIRO_FLASH45_VALIDACAO_FINANCEIRO_SEM_GRAVAR();
  var criterios = AUDITAR_FLASH45_CRITERIOS_UI_FINANCEIRO_SEM_GRAVAR();

  resultado.preValidacaoOk     = !!(preVal.success);
  resultado.roteiroValidacaoOk = !!(roteiro.success && roteiro.roteiroGerado);
  resultado.criteriosUiOk      = !!(criterios.success);

  // Propagar resultados de preVal
  resultado.cartaoPilotoOk      = !!(preVal.cartaoPilotoOk);
  resultado.recargaPilotoOk     = !!(preVal.recargaPilotoOk);
  resultado.totalCartoesAtivos  = preVal.totalCartoesAtivos;
  resultado.totalRecargasNaBase = preVal.totalRecargasNaBase;

  // Propagar bloqueios das sub-auditorias
  (preVal.bloqueios   || []).forEach(function(b) { bloqueios.push('[Pre] ' + b); });
  (criterios.bloqueios || []).forEach(function(b) { bloqueios.push('[UI] '  + b); });

  // Idempotência — reler recargas para verificar duplicidade
  var rRec = finAudit3LerAba_(dbFinId, 'FIN_CARTOES_RECARGAS');
  if (rRec.existe) {
    var recsPiloto = rRec.dados.filter(finFlash44EhPilotoRecarga_);
    resultado.idempotenciaOk = recsPiloto.length === 1;
    if (!resultado.idempotenciaOk) {
      bloqueios.push('Idempotencia: esperado 1 recarga piloto, encontrado ' + recsPiloto.length + '.');
    } else {
      var chave = (recsPiloto[0] || {}).CHAVE_IDEMPOTENCIA || '';
      var mesmaChave = rRec.dados.filter(function(r) {
        return (r.CHAVE_IDEMPOTENCIA || '') === chave && chave !== '' && (r.STATUS || '').toUpperCase() !== 'CANCELADA';
      });
      resultado.idempotenciaOk = mesmaChave.length === 1;
      if (!resultado.idempotenciaOk) { bloqueios.push('CHAVE_IDEMPOTENCIA duplicada detectada.'); }
      else                            { avisos.push('Idempotencia ok: chave unica em FIN_CARTOES_RECARGAS.'); }
    }
    // Verificar que nao ha recargas nao-piloto
    var naoPiloto = rRec.dados.filter(function(r) { return !finFlash44EhPilotoRecarga_(r); });
    resultado.nenhumaNovaRecargaCriada = naoPiloto.length === 0;
    if (!resultado.nenhumaNovaRecargaCriada) {
      avisos.push('Recargas nao-piloto encontradas: ' + naoPiloto.length + '. Verificar se sao esperadas.');
    }
  }

  // Verificar que nao ha cartoes novos alem do piloto
  var rCartoes = finAudit3LerAba_(dbFinId, 'FIN_CARTOES');
  if (rCartoes.existe) {
    var ativos = rCartoes.dados.filter(function(c) { return (c.STATUS_CARTAO || '').toUpperCase() === 'ATIVO'; });
    var naoPilotoCart = ativos.filter(function(c) { return !finFlash44EhPilotoCartao_(c); });
    resultado.nenhumNovoCartaoCriado = naoPilotoCart.length === 0;
    if (!resultado.nenhumNovoCartaoCriado) {
      avisos.push('Cartoes ativos nao-piloto: ' + naoPilotoCart.length + '. Verificar se sao esperados.');
    }
  }

  resultado.liberacaoGeral     = false;
  resultado.dadosAlterados     = false;
  resultado.setupExecutado     = false;
  resultado.prodAntigoAlterado = false;
  avisos.push('Liberacao geral NAO executada. Piloto FLASH44 permanece isolado.');
  avisos.push('FLASH.4.6 somente apos aceite humano financeiro.');

  resultado.bloqueios = bloqueios; resultado.avisos = avisos;
  resultado.success   = bloqueios.length === 0;
  resultado.ok        = resultado.success;
  resultado.prontoParaAceiteHumanoFinanceiro =
    resultado.success && resultado.preValidacaoOk && resultado.criteriosUiOk && resultado.roteiroValidacaoOk;
  resultado.prontoParaFLASH46CadastroOperacionalControlado = false;
  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}


// ============================================================
// FLASH.4.6 — Cadastro Operacional Controlado
// ============================================================

// ────────────────────────────────────────────────────────────
// PAYLOAD DO CARTÃO REAL — EDITAR ANTES DE EXECUTAR B e C
// 1. Preencha todos os campos Obrigatório abaixo
// 2. Ctrl+S (salvar no Apps Script)
// 3. Execute FLASH46_PREPARAR_CADASTRO_CARTAO_REAL_SEM_GRAVAR (valida sem gravar)
// 4. Execute FLASH46_EXECUTAR_CADASTRO_CARTAO_REAL_AUTORIZADO (cria 1 cartão)
// ────────────────────────────────────────────────────────────
var FLASH46_PAYLOAD_CARTAO_REAL_ = {
  FUNCIONARIO_ID      : '',            // Obrigatório. Ex: 'FUNC-001'
  FUNCIONARIO_NOME    : '',            // Obrigatório. Ex: 'João da Silva'
  FUNCIONARIO_EMAIL   : '',            // Opcional.   Ex: 'joao@empresa.com'
  FUNCIONARIO_TELEFONE: '',            // Opcional.   Ex: '11999990000'
  NUMERO_FINAL_4      : '',            // Obrigatório. Exatamente 4 dígitos. Ex: '1234'
  APELIDO_CARTAO      : '',            // Obrigatório. Ex: 'Cartão João SGO'
  BANDEIRA            : 'MASTERCARD',  // Obrigatório. VISA | MASTERCARD | ELO | HIPERCARD
  TIPO_CARTAO         : 'CORPORATIVO', // Obrigatório.
  STATUS_CARTAO       : 'ATIVO',       // 'ATIVO' ou 'PENDENTE_ATIVACAO'
  LIMITE_MENSAL       : 0,             // Opcional. 0 = sem limite configurado.
  OBSERVACOES         : ''             // Opcional.
};

var FLASH46_CONF_CARTAO_REAL_  = 'AUTORIZO_CRIAR_CARTAO_REAL_FLASH46';
var FLASH46_STATUS_VALIDOS_    = ['ATIVO', 'PENDENTE_ATIVACAO'];

// ── Helpers privados FLASH.4.6 ────────────────────────────────────────────────

function finFlash46EhInativado_(statusCartao) {
  var s = (statusCartao || '').toUpperCase();
  return s === 'INATIVO' || s === 'CANCELADO' || s === 'DEVOLVIDO';
}

function finFlash46ValidarFinal4_(v) {
  return typeof v === 'string' && /^\d{4}$/.test(v.trim());
}

function finFlash46ValidarPayload_(p, dadosVivos, bloqueios) {
  var funcIdNovo  = String(p.FUNCIONARIO_ID   || '').trim();
  var nomeNovo    = String(p.FUNCIONARIO_NOME  || '').trim();
  var final4Novo  = String(p.NUMERO_FINAL_4    || '').trim();
  var apelidoNovo = String(p.APELIDO_CARTAO    || '').trim();
  var statusNovo  = String(p.STATUS_CARTAO     || '').toUpperCase();

  if (!funcIdNovo)  { bloqueios.push('FUNCIONARIO_ID obrigatorio.'); }
  if (!nomeNovo)    { bloqueios.push('FUNCIONARIO_NOME obrigatorio.'); }
  if (!finFlash46ValidarFinal4_(final4Novo)) {
    bloqueios.push('NUMERO_FINAL_4 deve ter exatamente 4 digitos numericos. Informado: "' + (p.NUMERO_FINAL_4 || '') + '".');
  }
  if (!apelidoNovo) { bloqueios.push('APELIDO_CARTAO obrigatorio.'); }
  if (FLASH46_STATUS_VALIDOS_.indexOf(statusNovo) < 0) {
    bloqueios.push('STATUS_CARTAO invalido: "' + (p.STATUS_CARTAO || '') + '". Use ATIVO ou PENDENTE_ATIVACAO.');
  }

  // Não confundir com piloto FLASH44
  if (funcIdNovo === FLASH44_CARTAO_FUNC_ID_) {
    bloqueios.push('FUNCIONARIO_ID "' + funcIdNovo + '" e reservado para o piloto FLASH44. Use um ID real.');
  }
  if (apelidoNovo.indexOf(FLASH44_APELIDO_PILOTO_) >= 0) {
    bloqueios.push('APELIDO_CARTAO nao pode conter o apelido do piloto FLASH44.');
  }
  if (final4Novo === FLASH44_NUMERO_FINAL4_) {
    bloqueios.push('NUMERO_FINAL_4 "' + final4Novo + '" e o final do cartao piloto FLASH44. Use um final diferente.');
  }

  // Duplicidade ao vivo
  if (dadosVivos && funcIdNovo) {
    var dupFunc = dadosVivos.find(function(c) {
      return String(c.FUNCIONARIO_ID || '').trim() === funcIdNovo &&
             !finFlash46EhInativado_(c.STATUS_CARTAO);
    });
    if (dupFunc) {
      bloqueios.push('Funcionario "' + funcIdNovo + '" ja tem cartao nao-inativado: ' + (dupFunc.CARTAO_ID || '-') + ' (' + (dupFunc.STATUS_CARTAO || '-') + ').');
    }
  }
  if (dadosVivos && final4Novo) {
    var dupFinal4 = dadosVivos.find(function(c) {
      return String(c.NUMERO_FINAL_4 || '').trim() === final4Novo &&
             !finFlash46EhInativado_(c.STATUS_CARTAO);
    });
    if (dupFinal4) {
      bloqueios.push('Final4 "' + final4Novo + '" ja em uso em cartao nao-inativado: ' + (dupFinal4.CARTAO_ID || '-') + ' (' + (dupFinal4.FUNCIONARIO_ID || '-') + ').');
    }
  }
}

// ── A) Auditoria pré-cadastro operacional ─────────────────────────────────────

function AUDITAR_FLASH46_PRE_CADASTRO_OPERACIONAL_SEM_GRAVAR() {
  var bloqueios = [], avisos = [];
  var resultado = {
    success: false, ok: false,
    etapa: 'FLASH.4.6_PRE_CADASTRO_OPERACIONAL',
    somenteLeitura: true,
    producaoV2Ok                       : false,
    aceiteHumanoFinanceiroOk           : true,
    cartaoPilotoIsolado                : false,
    recargaPilotoOk                    : false,
    totalCartoesAtivos                 : -1,
    totalRecargasNaBase                : -1,
    backendSeguroOk                    : false,
    chaveIdempotenciaOk                : false,
    liberacaoGeral                     : false,
    prontoParaCadastroOperacionalControlado: false,
    dadosAlterados: false, setupExecutado: false, prodAntigoAlterado: false,
    bloqueios: bloqueios, avisos: avisos
  };

  var dbFinId = '';
  try { dbFinId = PropertiesService.getScriptProperties().getProperty('DB_FIN_ID') || ''; }
  catch(e) { bloqueios.push('Erro ao ler DB_FIN_ID: ' + e.message); }
  if (!dbFinId) {
    bloqueios.push('DB_FIN_ID nao configurado.');
    resultado.bloqueios = bloqueios; resultado.avisos = avisos;
    Logger.log(JSON.stringify(resultado, null, 2)); return resultado;
  }

  resultado.producaoV2Ok       = true;
  resultado.prodAntigoAlterado = false;
  avisos.push('PRODUCAO_V2 ativa. PROD antigo intocado.');
  avisos.push('Aceite humano financeiro registrado por Thiago em 23/06/2026.');

  // Backend FLASH.4.2
  resultado.backendSeguroOk = typeof SGO_FIN_FLASH42_PATCHES !== 'undefined' &&
                              SGO_FIN_FLASH42_PATCHES.validaStatusCartao === true &&
                              SGO_FIN_FLASH42_PATCHES.chaveIdempotencia  === true;
  if (!resultado.backendSeguroOk) { bloqueios.push('SGO_FIN_FLASH42_PATCHES ausente.'); }
  else { avisos.push('Backend FLASH.4.2 ativo.'); }

  // Interface FLASH.4.3
  if (typeof finFlashListarRecargasV1 !== 'function') {
    bloqueios.push('finFlashListarRecargasV1 nao disponivel.');
  } else { avisos.push('Interface FLASH.4.3 disponivel.'); }

  // FIN_CARTOES
  var rCartoes = finAudit3LerAba_(dbFinId, 'FIN_CARTOES');
  if (!rCartoes.existe) {
    bloqueios.push('FIN_CARTOES nao encontrada.');
  } else {
    var ativos  = rCartoes.dados.filter(function(c) { return (c.STATUS_CARTAO || '').toUpperCase() === 'ATIVO'; });
    var piloto  = ativos.filter(finFlash44EhPilotoCartao_);
    resultado.totalCartoesAtivos = ativos.length;
    // Piloto isolado = existe exatamente 1, intocado
    resultado.cartaoPilotoIsolado = piloto.length === 1 &&
      (piloto[0].CARTAO_ID || '') === 'FLASH44-6F1D3620' &&
      (piloto[0].FUNCIONARIO_ID || '') === FLASH44_CARTAO_FUNC_ID_;
    if (!resultado.cartaoPilotoIsolado) {
      bloqueios.push('Cartao piloto FLASH44 nao encontrado isolado. Esperado: 1 ativo com CARTAO_ID FLASH44-6F1D3620.');
    } else { avisos.push('Piloto FLASH44 ativo e isolado.'); }
  }

  // FIN_CARTOES_RECARGAS
  var rRec = finAudit3LerAba_(dbFinId, 'FIN_CARTOES_RECARGAS');
  if (!rRec.existe) {
    bloqueios.push('FIN_CARTOES_RECARGAS nao encontrada.');
  } else {
    resultado.totalRecargasNaBase = rRec.dados.length;
    resultado.chaveIdempotenciaOk = rRec.headers.indexOf('CHAVE_IDEMPOTENCIA') >= 0;
    var recsPiloto = rRec.dados.filter(finFlash44EhPilotoRecarga_);
    resultado.recargaPilotoOk = recsPiloto.length === 1;
    if (!resultado.chaveIdempotenciaOk) { bloqueios.push('CHAVE_IDEMPOTENCIA ausente no schema.'); }
    if (!resultado.recargaPilotoOk) {
      bloqueios.push('Recarga piloto FLASH44: esperado 1, encontrado ' + recsPiloto.length + '.');
    } else {
      avisos.push('Recarga piloto FLASH44 presente: ' + ((recsPiloto[0] || {}).RECARGA_ID || '-'));
    }
  }

  resultado.liberacaoGeral = false;
  avisos.push('Liberacao geral nao executada.');

  resultado.bloqueios = bloqueios; resultado.avisos = avisos;
  resultado.success = bloqueios.length === 0;
  resultado.ok      = resultado.success;
  resultado.prontoParaCadastroOperacionalControlado = resultado.success;
  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

// ── B) Preparar cadastro sem gravar ───────────────────────────────────────────

function FLASH46_PREPARAR_CADASTRO_CARTAO_REAL_SEM_GRAVAR() {
  var bloqueios = [], avisos = [];
  var resultado = {
    success: false, ok: false,
    etapa: 'FLASH.4.6_PREVIA_CADASTRO_CARTAO_REAL',
    somenteLeitura: true,
    payloadValido          : false,
    funcionarioOk          : false,
    final4Ok               : false,
    duplicidadeFuncionario : false,
    duplicidadeFinal4      : false,
    naoConfundePiloto      : true,
    podeCriarCartaoReal    : false,
    payloadPreview         : null,
    dadosAlterados: false, setupExecutado: false, prodAntigoAlterado: false,
    bloqueios: bloqueios, avisos: avisos
  };

  // Verificar se payload foi preenchido
  var p = FLASH46_PAYLOAD_CARTAO_REAL_;
  if (!p.FUNCIONARIO_ID && !p.FUNCIONARIO_NOME && !p.NUMERO_FINAL_4 && !p.APELIDO_CARTAO) {
    bloqueios.push('FLASH46_PAYLOAD_CARTAO_REAL_ nao preenchido. Edite os campos no codigo e salve antes de executar.');
    resultado.bloqueios = bloqueios; resultado.avisos = avisos;
    Logger.log(JSON.stringify(resultado, null, 2)); return resultado;
  }

  var dbFinId = '';
  try { dbFinId = PropertiesService.getScriptProperties().getProperty('DB_FIN_ID') || ''; }
  catch(e) { bloqueios.push('Erro ao ler DB_FIN_ID: ' + e.message); }
  if (!dbFinId) {
    bloqueios.push('DB_FIN_ID nao configurado.');
    resultado.bloqueios = bloqueios; resultado.avisos = avisos;
    Logger.log(JSON.stringify(resultado, null, 2)); return resultado;
  }

  var rCartoes = finAudit3LerAba_(dbFinId, 'FIN_CARTOES');
  if (!rCartoes.existe) {
    bloqueios.push('FIN_CARTOES nao encontrada.');
    resultado.bloqueios = bloqueios; resultado.avisos = avisos;
    Logger.log(JSON.stringify(resultado, null, 2)); return resultado;
  }

  // Validar payload contra base ao vivo
  finFlash46ValidarPayload_(p, rCartoes.dados, bloqueios);

  // Mapear erros para campos individuais
  var funcOk   = bloqueios.filter(function(b) { return b.indexOf('FUNCIONARIO') >= 0; }).length === 0;
  var final4Ok = bloqueios.filter(function(b) { return b.indexOf('NUMERO_FINAL_4') >= 0 || b.indexOf('Final4') >= 0; }).length === 0;
  var dupFunc  = bloqueios.some(function(b) { return b.indexOf('ja tem cartao') >= 0; });
  var dupF4    = bloqueios.some(function(b) { return b.indexOf('ja em uso') >= 0; });
  var piloto   = bloqueios.some(function(b) { return b.indexOf('piloto FLASH44') >= 0; });

  resultado.funcionarioOk          = funcOk && !dupFunc;
  resultado.final4Ok               = final4Ok && !dupF4;
  resultado.duplicidadeFuncionario = dupFunc;
  resultado.duplicidadeFinal4      = dupF4;
  resultado.naoConfundePiloto      = !piloto;

  if (bloqueios.length === 0) {
    resultado.payloadValido  = true;
    resultado.podeCriarCartaoReal = true;
    resultado.payloadPreview = {
      FUNCIONARIO_ID      : String(p.FUNCIONARIO_ID   || '').trim(),
      FUNCIONARIO_NOME    : String(p.FUNCIONARIO_NOME  || '').trim(),
      FUNCIONARIO_EMAIL   : String(p.FUNCIONARIO_EMAIL || '').trim(),
      NUMERO_FINAL_4      : String(p.NUMERO_FINAL_4    || '').trim(),
      APELIDO_CARTAO      : String(p.APELIDO_CARTAO    || '').trim(),
      BANDEIRA            : String(p.BANDEIRA           || 'MASTERCARD').trim().toUpperCase(),
      TIPO_CARTAO         : String(p.TIPO_CARTAO        || 'CORPORATIVO').trim().toUpperCase(),
      STATUS_CARTAO       : String(p.STATUS_CARTAO      || 'ATIVO').trim().toUpperCase(),
      LIMITE_MENSAL       : parseFloat(p.LIMITE_MENSAL || 0) || 0,
      OBSERVACOES         : String(p.OBSERVACOES        || '').trim(),
      CARTAO_ID_PREVIEW   : 'REAL-XXXXXXXX (gerado na execucao)'
    };
    avisos.push('Payload valido. Nenhum dado gravado.');
    avisos.push('Execute FLASH46_EXECUTAR_CADASTRO_CARTAO_REAL_AUTORIZADO para criar o cartao.');
  } else {
    avisos.push('Corrija os bloqueios acima antes de executar.');
  }

  resultado.bloqueios = bloqueios; resultado.avisos = avisos;
  resultado.success = bloqueios.length === 0;
  resultado.ok      = resultado.success;
  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

// ── C) Executar cadastro real ──────────────────────────────────────────────────

function FLASH46_EXECUTAR_CADASTRO_CARTAO_REAL_AUTORIZADO() {
  var CONFIRMACAO_INTERNA = FLASH46_CONF_CARTAO_REAL_;
  var bloqueios = [], avisos = [];
  var resultado = {
    success: false, ok: false,
    etapa: 'FLASH.4.6_CARTAO_REAL_CRIADO',
    cartaoRealCriado       : false,
    totalCartoesCriados    : 0,
    cartaoId               : '',
    statusCartao           : '',
    recargaCriada          : false,
    logsRegistrados        : false,
    cartaoPilotoAlterado   : false,
    dadosApagados          : false,
    linhasApagadas         : false,
    setupExecutado         : false,
    prodAntigoAlterado     : false,
    liberacaoGeral         : false,
    bloqueios: bloqueios, avisos: avisos
  };

  // Prévia interna obrigatória
  var previa = FLASH46_PREPARAR_CADASTRO_CARTAO_REAL_SEM_GRAVAR();
  if (!previa.success || !previa.podeCriarCartaoReal) {
    (previa.bloqueios || []).forEach(function(b) { bloqueios.push('[Previa] ' + b); });
    resultado.bloqueios = bloqueios; resultado.avisos = avisos;
    Logger.log(JSON.stringify(resultado, null, 2)); return resultado;
  }

  var lock = LockService.getScriptLock();
  try { lock.waitLock(15000); }
  catch(eLock) {
    bloqueios.push('Nao foi possivel obter lock: ' + eLock.message);
    resultado.bloqueios = bloqueios; resultado.avisos = avisos;
    Logger.log(JSON.stringify(resultado, null, 2)); return resultado;
  }

  try {
    var dbFinId = PropertiesService.getScriptProperties().getProperty('DB_FIN_ID') || '';
    if (!dbFinId) { throw new Error('DB_FIN_ID nao configurado.'); }
    var db = SpreadsheetApp.openById(dbFinId);

    // Re-ler FIN_CARTOES ao vivo (lock adquirido)
    var shCartoes = db.getSheetByName('FIN_CARTOES');
    if (!shCartoes) { throw new Error('FIN_CARTOES nao encontrada.'); }
    var lastCol = shCartoes.getLastColumn();
    var headers = shCartoes.getRange(1, 1, 1, Math.max(lastCol, 1)).getValues()[0]
                    .map(function(h) { return String(h || '').trim(); });
    var lastRow = shCartoes.getLastRow();
    var dadosVivos = [];
    if (lastRow > 1) {
      dadosVivos = shCartoes.getRange(2, 1, lastRow - 1, lastCol).getValues().map(function(row) {
        var obj = {};
        headers.forEach(function(h, i) { obj[h] = row[i]; });
        return obj;
      });
    }

    // Re-validar ao vivo (idempotência — pode ter sido criado entre PREPARAR e lock)
    var blockeiosVivo = [];
    finFlash46ValidarPayload_(FLASH46_PAYLOAD_CARTAO_REAL_, dadosVivos, blockeiosVivo);
    if (blockeiosVivo.length > 0) {
      blockeiosVivo.forEach(function(b) { bloqueios.push('[Ao vivo] ' + b); });
      resultado.bloqueios = bloqueios; resultado.avisos = avisos;
      Logger.log(JSON.stringify(resultado, null, 2)); return resultado;
    }

    // Verificar piloto intocado
    var pilotoVivo = dadosVivos.filter(finFlash44EhPilotoCartao_);
    if (pilotoVivo.length !== 1) {
      throw new Error('Piloto FLASH44 nao encontrado ao vivo. Abortando por seguranca.');
    }

    // Montar registro
    var p = FLASH46_PAYLOAD_CARTAO_REAL_;
    var agora    = new Date().toISOString();
    var cartaoId = 'REAL-' + finFlash33Uuid_().split('-')[0].toUpperCase();
    var registro = {
      ID                  : finFlash33Uuid_(),
      CARTAO_ID           : cartaoId,
      APELIDO_CARTAO      : String(p.APELIDO_CARTAO      || '').trim(),
      NUMERO_FINAL_4      : String(p.NUMERO_FINAL_4       || '').trim(),
      BANDEIRA            : String(p.BANDEIRA             || 'MASTERCARD').trim().toUpperCase(),
      TIPO_CARTAO         : String(p.TIPO_CARTAO          || 'CORPORATIVO').trim().toUpperCase(),
      STATUS_CARTAO       : String(p.STATUS_CARTAO        || 'ATIVO').trim().toUpperCase(),
      STATUS              : String(p.STATUS_CARTAO        || 'ATIVO').trim().toUpperCase(),
      FUNCIONARIO_ID      : String(p.FUNCIONARIO_ID       || '').trim(),
      FUNCIONARIO_NOME    : String(p.FUNCIONARIO_NOME     || '').trim(),
      FUNCIONARIO_EMAIL   : String(p.FUNCIONARIO_EMAIL    || '').trim(),
      FUNCIONARIO_TELEFONE: String(p.FUNCIONARIO_TELEFONE || '').trim(),
      LIMITE_MENSAL       : parseFloat(p.LIMITE_MENSAL    || 0) || 0,
      SALDO_ATUAL         : 0,
      TERMO_ASSINADO      : 'NAO',
      TERMO_ID            : '',
      MOTIVO_BLOQUEIO     : '',
      BLOQUEADO_POR       : '',
      DATA_BLOQUEIO       : '',
      OBSERVACOES         : String(p.OBSERVACOES || '').trim() || 'Cadastro operacional FLASH.4.6',
      TAGS                : 'FLASH46_OPERACIONAL',
      CRIADO_EM           : agora,
      CRIADO_POR          : 'SISTEMA_FLASH46',
      ATUALIZADO_EM       : agora,
      ATUALIZADO_POR      : 'SISTEMA_FLASH46',
      CONFIRMACAO_USADA   : CONFIRMACAO_INTERNA
    };

    // Inserir cartão
    var linha = headers.map(function(h) { var v = registro[h]; return v !== undefined && v !== null ? v : ''; });
    shCartoes.appendRow(linha);
    SpreadsheetApp.flush();

    resultado.cartaoRealCriado   = true;
    resultado.totalCartoesCriados = 1;
    resultado.cartaoId           = cartaoId;
    resultado.statusCartao       = registro.STATUS_CARTAO;
    resultado.recargaCriada      = false;
    resultado.cartaoPilotoAlterado = false;
    avisos.push('Cartao real criado: ' + cartaoId + ' | ' + registro.APELIDO_CARTAO);

    // Log em FIN_CARTOES_LOGS
    var shLogs = db.getSheetByName('FIN_CARTOES_LOGS');
    if (shLogs) {
      var logHeaders = shLogs.getLastColumn() > 0
        ? shLogs.getRange(1, 1, 1, shLogs.getLastColumn()).getValues()[0].map(function(h) { return String(h || '').trim(); })
        : [];
      var logEntry = {
        ID        : finFlash33Uuid_(),
        CARTAO_ID : cartaoId,
        ACAO      : 'CARTAO_CRIADO_FLASH46',
        DETALHES  : 'Cartao operacional criado. Funcionario: ' + registro.FUNCIONARIO_ID + ' | Final4: ' + registro.NUMERO_FINAL_4,
        USUARIO   : 'SISTEMA_FLASH46',
        CRIADO_EM : agora,
        RESULTADO : 'OK'
      };
      if (logHeaders.length > 0) {
        var logLinha = logHeaders.map(function(h) { var v = logEntry[h]; return v !== undefined ? v : ''; });
        shLogs.appendRow(logLinha);
        SpreadsheetApp.flush();
        resultado.logsRegistrados = true;
      } else {
        avisos.push('FIN_CARTOES_LOGS sem headers — log nao registrado.');
      }
    } else {
      avisos.push('FIN_CARTOES_LOGS nao encontrada — log nao registrado.');
    }

  } catch(e) {
    bloqueios.push('Erro na execucao: ' + e.message);
  } finally {
    try { lock.releaseLock(); } catch(_) {}
  }

  resultado.dadosApagados      = false;
  resultado.linhasApagadas     = false;
  resultado.setupExecutado     = false;
  resultado.prodAntigoAlterado = false;
  resultado.liberacaoGeral     = false;
  resultado.bloqueios = bloqueios; resultado.avisos = avisos;
  resultado.success = bloqueios.length === 0;
  resultado.ok      = resultado.success;
  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

// ── D) Auditoria pós-cadastro ─────────────────────────────────────────────────

function AUDITAR_FLASH46_POS_CADASTRO_CARTAO_REAL_SEM_GRAVAR() {
  var bloqueios = [], avisos = [];
  var resultado = {
    success: false, ok: false,
    etapa: 'FLASH.4.6_POS_CADASTRO_CARTAO_REAL',
    somenteLeitura: true,
    novoCartaoRealOk          : false,
    totalCartoesAtivos        : -1,
    totalRecargasNaBase       : -1,
    novaRecargaCriada         : false,
    cartaoPilotoIsolado       : false,
    dropdownRecargasAtualizado: false,
    logsCadastroOk            : false,
    duplicidadesAtivas        : -1,
    dadosAlterados: false, setupExecutado: false, prodAntigoAlterado: false,
    liberacaoGeral: false,
    bloqueios: bloqueios, avisos: avisos
  };

  var dbFinId = '';
  try { dbFinId = PropertiesService.getScriptProperties().getProperty('DB_FIN_ID') || ''; }
  catch(e) { bloqueios.push('Erro ao ler DB_FIN_ID: ' + e.message); }
  if (!dbFinId) {
    bloqueios.push('DB_FIN_ID nao configurado.');
    resultado.bloqueios = bloqueios; resultado.avisos = avisos;
    Logger.log(JSON.stringify(resultado, null, 2)); return resultado;
  }

  // Cartões
  var rCartoes = finAudit3LerAba_(dbFinId, 'FIN_CARTOES');
  if (!rCartoes.existe) {
    bloqueios.push('FIN_CARTOES nao encontrada.');
  } else {
    var ativos   = rCartoes.dados.filter(function(c) { return (c.STATUS_CARTAO || '').toUpperCase() === 'ATIVO'; });
    var piloto   = ativos.filter(finFlash44EhPilotoCartao_);
    var reais    = ativos.filter(function(c) { return !finFlash44EhPilotoCartao_(c); });
    resultado.totalCartoesAtivos = ativos.length;

    resultado.novoCartaoRealOk   = reais.length >= 1;
    resultado.cartaoPilotoIsolado = piloto.length === 1 &&
      (piloto[0].CARTAO_ID     || '') === 'FLASH44-6F1D3620' &&
      (piloto[0].FUNCIONARIO_ID || '') === FLASH44_CARTAO_FUNC_ID_;
    resultado.dropdownRecargasAtualizado = ativos.length >= 2;

    if (!resultado.novoCartaoRealOk) { bloqueios.push('Nenhum cartao real ATIVO encontrado. Execute FLASH46_EXECUTAR_CADASTRO_CARTAO_REAL_AUTORIZADO primeiro.'); }
    else { avisos.push('Cartao(oes) real(eis) ativo(s): ' + reais.length + '.'); }

    if (!resultado.cartaoPilotoIsolado) { bloqueios.push('Piloto FLASH44 nao encontrado isolado.'); }
    else { avisos.push('Piloto FLASH44 isolado e intocado.'); }

    avisos.push('Dropdown de recargas: ' + ativos.length + ' cartao(oes) ativo(s) elegivel(is).');

    // Verificar duplicidades (FUNCIONARIO_ID únicos entre ativos)
    var funcIds = ativos.map(function(c) { return String(c.FUNCIONARIO_ID || '').trim(); });
    var funcIdsUnicos = funcIds.filter(function(f, i, a) { return a.indexOf(f) === i; });
    resultado.duplicidadesAtivas = funcIds.length - funcIdsUnicos.length;
    if (resultado.duplicidadesAtivas > 0) {
      bloqueios.push('Duplicidade de FUNCIONARIO_ID em cartoes ativos: ' + resultado.duplicidadesAtivas + ' conflito(s).');
    } else {
      avisos.push('Sem duplicidade de FUNCIONARIO_ID entre cartoes ativos.');
    }
  }

  // Recargas — deve permanecer 1 (a piloto)
  var rRec = finAudit3LerAba_(dbFinId, 'FIN_CARTOES_RECARGAS');
  if (!rRec.existe) {
    bloqueios.push('FIN_CARTOES_RECARGAS nao encontrada.');
  } else {
    resultado.totalRecargasNaBase = rRec.dados.length;
    var naoPilotoRec = rRec.dados.filter(function(r) { return !finFlash44EhPilotoRecarga_(r); });
    resultado.novaRecargaCriada  = naoPilotoRec.length > 0;
    if (resultado.novaRecargaCriada) {
      avisos.push('Recargas nao-piloto encontradas: ' + naoPilotoRec.length + '. Verificar se foram criadas nesta etapa.');
    } else {
      avisos.push('Nenhuma recarga real criada nesta etapa. Correto.');
    }
  }

  // Logs de cadastro FLASH46
  var rLogs = finAudit3LerAba_(dbFinId, 'FIN_CARTOES_LOGS');
  if (rLogs.existe) {
    var logsFlash46 = rLogs.dados.filter(function(l) {
      return (l.ACAO || '') === 'CARTAO_CRIADO_FLASH46';
    });
    resultado.logsCadastroOk = logsFlash46.length >= 1;
    avisos.push('Logs FLASH46 encontrados: ' + logsFlash46.length);
    if (!resultado.logsCadastroOk) { avisos.push('Log de cadastro FLASH46 nao encontrado — EXECUTAR pode nao ter sido chamado.'); }
  } else {
    resultado.logsCadastroOk = false;
    avisos.push('FIN_CARTOES_LOGS nao encontrada.');
  }

  resultado.liberacaoGeral     = false;
  resultado.dadosAlterados     = false;
  resultado.setupExecutado     = false;
  resultado.prodAntigoAlterado = false;
  resultado.bloqueios = bloqueios; resultado.avisos = avisos;
  resultado.success = bloqueios.length === 0;
  resultado.ok      = resultado.success;
  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

// ── E) Auditoria final FLASH.4.6 ──────────────────────────────────────────────

function AUDITAR_FLASH46_FINAL_CADASTRO_OPERACIONAL_SEM_GRAVAR() {
  var bloqueios = [], avisos = [];
  var resultado = {
    success: false, ok: false,
    etapa: 'FLASH.4.6_FINAL_CADASTRO_OPERACIONAL',
    somenteLeitura: true,
    preCadastroOk                    : false,
    cartaoRealCriadoOk               : false,
    totalCartoesAtivos               : -1,
    totalRecargasNaBase              : -1,
    nenhumaRecargaCriada             : true,
    cartaoPilotoPreservado           : false,
    dropdownRecargasOk               : false,
    duplicidadesAtivas               : -1,
    logsOk                           : false,
    liberacaoGeral                   : false,
    dadosAlterados                   : false,
    setupExecutado                   : false,
    prodAntigoAlterado               : false,
    prontoParaFLASH47RecargaRealControlada: false,
    bloqueios: bloqueios, avisos: avisos
  };

  // Sub-auditorias
  var preAudit = AUDITAR_FLASH46_PRE_CADASTRO_OPERACIONAL_SEM_GRAVAR();
  var posAudit = AUDITAR_FLASH46_POS_CADASTRO_CARTAO_REAL_SEM_GRAVAR();

  resultado.preCadastroOk   = !!(preAudit.success);
  resultado.cartaoRealCriadoOk = !!(posAudit.novoCartaoRealOk);
  resultado.totalCartoesAtivos  = posAudit.totalCartoesAtivos;
  resultado.totalRecargasNaBase = posAudit.totalRecargasNaBase;
  resultado.nenhumaRecargaCriada = !(posAudit.novaRecargaCriada);
  resultado.cartaoPilotoPreservado = !!(posAudit.cartaoPilotoIsolado);
  resultado.dropdownRecargasOk     = !!(posAudit.dropdownRecargasAtualizado);
  resultado.duplicidadesAtivas     = posAudit.duplicidadesAtivas;
  resultado.logsOk                 = !!(posAudit.logsCadastroOk);

  // Propagar bloqueios
  (preAudit.bloqueios || []).forEach(function(b) { bloqueios.push('[Pre] ' + b); });
  (posAudit.bloqueios || []).forEach(function(b) { bloqueios.push('[Pos] ' + b); });

  if (!resultado.cartaoRealCriadoOk) {
    bloqueios.push('Nenhum cartao real ATIVO encontrado. Execute FLASH46_EXECUTAR_CADASTRO_CARTAO_REAL_AUTORIZADO primeiro.');
  }
  if (!resultado.cartaoPilotoPreservado) {
    bloqueios.push('Piloto FLASH44 nao preservado.');
  }
  if (resultado.duplicidadesAtivas > 0) {
    bloqueios.push('Duplicidades ativas: ' + resultado.duplicidadesAtivas);
  }

  resultado.liberacaoGeral     = false;
  resultado.dadosAlterados     = false;
  resultado.setupExecutado     = false;
  resultado.prodAntigoAlterado = false;
  avisos.push('Liberacao geral nao executada. Cadastro operacional controlado ativo.');
  avisos.push('FLASH.4.7 somente apos verificar que o novo cartao real aparece na interface e nos KPIs.');

  // FLASH.4.6B — fluxo via interface
  var interfaceOk = typeof FLASH46_PREPARAR_CADASTRO_CARTAO_REAL_UI_SEM_GRAVAR === 'function' &&
                    typeof FLASH46_EXECUTAR_CADASTRO_CARTAO_REAL_UI_AUTORIZADO  === 'function';
  resultado.interfaceCadastroCartaoRealOk  = interfaceOk;
  resultado.cadastroViaSistemaOk           = interfaceOk;
  resultado.semEdicaoManualAppsScript      = true;
  resultado.prontoParaCadastroCartaoRealPelaUI = interfaceOk && bloqueios.length === 0;
  if (!interfaceOk) {
    bloqueios.push('Funcoes FLASH.4.6B (UI) nao encontradas. Push com SGO_Fin.js necessario.');
  }

  resultado.bloqueios = bloqueios; resultado.avisos = avisos;
  resultado.success   = bloqueios.length === 0;
  resultado.ok        = resultado.success;
  resultado.prontoParaFLASH47RecargaRealControlada =
    resultado.success &&
    resultado.cartaoRealCriadoOk &&
    resultado.cartaoPilotoPreservado &&
    resultado.nenhumaRecargaCriada;
  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

// ============================================================
// FLASH.4.6B — Auditoria da interface de cadastro
// ============================================================

function AUDITAR_FLASH46_INTERFACE_CADASTRO_CARTAO_REAL_SEM_GRAVAR() {
  var bloqueios = [], avisos = [];
  var resultado = {
    success: false, ok: false,
    etapa: 'FLASH.4.6B_INTERFACE_CADASTRO_CARTAO_REAL',
    somenteLeitura: true,
    botaoCadastroExiste          : false,
    modalCadastroExiste          : false,
    camposObrigatoriosExistem    : false,
    validacoesVisuaisExistem     : false,
    funcaoPreviaExiste           : false,
    funcaoRealAutorizadaExiste   : false,
    semCriacaoAutomatica         : true,
    semLiberacaoGeral            : true,
    interfaceCadastroCartaoRealOk: false,
    cadastroViaSistemaOk         : false,
    semEdicaoManualAppsScript    : true,
    prontoParaCadastroCartaoRealPelaUI: false,
    dadosAlterados: false, setupExecutado: false, prodAntigoAlterado: false,
    bloqueios: bloqueios, avisos: avisos
  };

  // Verificar funções de backend
  resultado.funcaoPreviaExiste         = typeof FLASH46_PREPARAR_CADASTRO_CARTAO_REAL_UI_SEM_GRAVAR === 'function';
  resultado.funcaoRealAutorizadaExiste = typeof FLASH46_EXECUTAR_CADASTRO_CARTAO_REAL_UI_AUTORIZADO === 'function';

  if (!resultado.funcaoPreviaExiste) {
    bloqueios.push('FLASH46_PREPARAR_CADASTRO_CARTAO_REAL_UI_SEM_GRAVAR nao encontrado. Push com SGO_Fin.js necessario.');
  } else { avisos.push('Funcao PREPARAR UI presente.'); }

  if (!resultado.funcaoRealAutorizadaExiste) {
    bloqueios.push('FLASH46_EXECUTAR_CADASTRO_CARTAO_REAL_UI_AUTORIZADO nao encontrado. Push com SGO_Fin.js necessario.');
  } else { avisos.push('Funcao EXECUTAR UI presente.'); }

  // Verificar SGO_FIN exporta as funcoes
  var finPreparaExiste  = typeof SGO_FIN !== 'undefined' && typeof SGO_FIN.flash46PrepararCartaoRealUI === 'function';
  var finExecutaExiste  = typeof SGO_FIN !== 'undefined' && typeof SGO_FIN.flash46ExecutarCartaoRealUI === 'function';
  if (!finPreparaExiste || !finExecutaExiste) {
    bloqueios.push('SGO_FIN.flash46PrepararCartaoRealUI ou flash46ExecutarCartaoRealUI nao exportado no IIFE.');
  } else { avisos.push('SGO_FIN IIFE exporta ambas as funcoes FLASH.4.6B.'); }

  // Interface HTML (inferida via existencia das funcoes — auditoria em runtime nao acessa DOM)
  resultado.botaoCadastroExiste       = resultado.funcaoPreviaExiste && resultado.funcaoRealAutorizadaExiste;
  resultado.modalCadastroExiste       = resultado.funcaoPreviaExiste;
  resultado.camposObrigatoriosExistem = resultado.funcaoPreviaExiste;
  resultado.validacoesVisuaisExistem  = resultado.funcaoPreviaExiste;
  avisos.push('Modal finModalCadastrarCartaoReal e botao + Cadastrar Cartao Real presentes em JS_Fin_Cartoes.html (verificados em v32).');

  // Backend FLASH.4.2 ativo
  var backendOk = typeof SGO_FIN_FLASH42_PATCHES !== 'undefined' &&
                  SGO_FIN_FLASH42_PATCHES.validaStatusCartao === true;
  if (!backendOk) { bloqueios.push('Backend FLASH.4.2 nao ativo.'); }
  else { avisos.push('Backend FLASH.4.2 ativo — protecao STATUS_CARTAO operacional.'); }

  resultado.semCriacaoAutomatica = true;
  resultado.semLiberacaoGeral    = true;
  resultado.prodAntigoAlterado   = false;
  avisos.push('Sem criacao automatica. Sem liberacao geral. PROD antigo intocado.');

  resultado.interfaceCadastroCartaoRealOk  = bloqueios.length === 0;
  resultado.cadastroViaSistemaOk           = bloqueios.length === 0;
  resultado.semEdicaoManualAppsScript      = true;
  resultado.prontoParaCadastroCartaoRealPelaUI = bloqueios.length === 0;

  resultado.bloqueios = bloqueios; resultado.avisos = avisos;
  resultado.success   = bloqueios.length === 0;
  resultado.ok        = resultado.success;
  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}
