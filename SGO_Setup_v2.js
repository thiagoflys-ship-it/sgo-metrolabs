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
  const dbFrota = garantirBancoSGOv2_("DB_FROTA_ID", SGO_CFG.SISTEMA.NOME_EXIBICAO + "_DB_FROTA", log);

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
  const dbFrota = garantirBancoSGOv2_("DB_FROTA_ID", SGO_CFG.SISTEMA.NOME_EXIBICAO + "_DB_FROTA", log);

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
  const dbPrincipal = garantirBancoSGOv2_("DB_ID", SGO_CFG.SISTEMA.NOME_EXIBICAO + "_DB", log);

  garantirAbaV2_(dbPrincipal, SGO_CFG.SHEETS.DOC_DOCUMENTOS, docDocumentosCabecalhosV2_(), log);

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

  garantirAbaV2_(ss, SGO_CFG.SHEETS.DOC_DOCUMENTOS, docDocumentosCabecalhosV2_(), log);

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
    SGO_CFG.SHEETS.AST_ENTRADAS,
    SGO_CFG.SHEETS.AST_ACESSORIOS,
    SGO_CFG.SHEETS.AST_FOTOS,
    SGO_CFG.SHEETS.AST_DIAGNOSTICOS,
    SGO_CFG.SHEETS.AST_PECAS,
    SGO_CFG.SHEETS.AST_MOVIMENTACOES,
    SGO_CFG.SHEETS.AST_DOCUMENTOS,
    SGO_CFG.SHEETS.AST_ALERTAS,
    SGO_CFG.SHEETS.AST_TERCEIROS,
    SGO_CFG.SHEETS.AST_TERCEIROS_ACESSORIOS,
    SGO_CFG.SHEETS.AST_TERCEIROS_ANEXOS,
    SGO_CFG.SHEETS.AST_TERCEIROS_ACOMPANHAMENTOS,
    SGO_CFG.SHEETS.AST_TERCEIROS_DOCUMENTOS,
    SGO_CFG.SHEETS.AST_LAB_ENTRADAS,
    SGO_CFG.SHEETS.AST_LAB_ENSAIOS,
    SGO_CFG.SHEETS.AST_LAB_PADROES,
    SGO_CFG.SHEETS.AST_LAB_RESULTADOS,
    SGO_CFG.SHEETS.AST_LAB_DOCUMENTOS,
    SGO_CFG.SHEETS.AST_LAB_EVIDENCIAS,
    SGO_CFG.SHEETS.AST_TESTES_BANCADA,
    SGO_CFG.SHEETS.AST_EXECUCOES,
    SGO_CFG.SHEETS.AST_INDICADORES_DIARIOS,
    SGO_CFG.SHEETS.AST_PRODUTIVIDADE_TECNICOS,
    SGO_CFG.SHEETS.AST_CONFORMIDADE,
    SGO_CFG.SHEETS.AST_RELATORIOS_GERADOS
  ].forEach(function(nome) {
    garantirAbaV2_(ss, nome, ["ID", "CRIADO_EM"], log);
  });
}

function criarEstruturaOSV2_(ss, log) {
  garantirAbaV2_(ss, SGO_CFG.SHEETS.SYS_ASSINATURAS, [
    "ID", "OS_ID", "TIPO", "TIPO_ASSINATURA", "ASSINADO_POR", "CARGO",
    "ASSINADO_EM", "ASSINATURA_FILE_ID", "ASSINATURA_LINK", "LINK_DRIVE",
    "ASSINATURA_DATA_URL", "USER_AGENT", "IP_DISPOSITIVO", "STATUS",
    "CRIADO_POR", "CRIADO_EM", "REMOVIDA_POR", "REMOVIDA_EM",
    "MOTIVO_REMOCAO", "REABERTURA_RELATO_EM"
  ], log);

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
    "UPLOAD_POR", "UPLOAD_EM", "ENVIADO_POR", "ENVIADO_EM", "OBSERVACAO",
    "STATUS", "REMOVIDA_POR", "REMOVIDA_EM", "MOTIVO_REMOCAO", "CRIADO_EM"
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
    "TECNICO_RESPONSAVEL_ID", "LINK_PASTA_DRIVE", "CRIADO_EM",
    "MEDIA_ESPERADA_KM_L", "DOCUMENTACAO_VENCE", "OBSERVACOES",
    "STATUS_OPERACIONAL", "PREVENTIVA_PROX_KM", "PREVENTIVA_PROX_DATA",
    "BLOQUEIO_MOTIVO", "ULTIMO_MOVIMENTO_ID"
  ], log);

  garantirAbaV2_(ss, SGO_CFG.SHEETS.FRT_AGENDAMENTOS, [
    "ID", "VEICULO_ID", "TECNICO_ID", "OS_ID", "MISSAO_ID",
    "DATA_INICIO", "DATA_FIM", "STATUS",
    "KM_SAIDA", "KM_CHEGADA", "KM_PERCORRIDO",
    "CUSTO_KM", "CUSTO_TOTAL", "OBSERVACOES", "CRIADO_EM",
    "RESPONSAVEL_NOME", "MOTIVO", "DESTINO", "BLOQUEANTE"
  ], log);

  garantirAbaV2_(ss, SGO_CFG.SHEETS.FRT_VISTORIAS, [
    "ID", "VEICULO_ID", "TECNICO_ID", "TIPO", "DATA", "KM",
    "COMBUSTIVEL_PCT", "PNEUS_OK", "LATARIA_OK", "INTERIOR_OK",
    "AVARIAS_DESCRICAO", "LINK_FOTOS", "APROVADO", "APROVADO_POR", "CRIADO_EM",
    "CHECKLIST_JSON", "FOTOS_JSON", "ASSINATURA", "FINALIZADA", "BLOQUEANTE"
  ], log);

  garantirAbaV2_(ss, SGO_CFG.SHEETS.FRT_ABASTECIMENTOS, [
    "ID", "VEICULO_ID", "TECNICO_ID", "DATA", "KM",
    "LITROS", "VALOR_LITRO", "VALOR_TOTAL", "TIPO_COMBUSTIVEL",
    "POSTO", "NOTA_FISCAL", "LINK_NF", "CRIADO_EM",
    "CONDUTOR_ID", "CONDUTOR_NOME", "TANQUE_CHEIO", "LOCALIZACAO_POSTO",
    "COMPROVANTE", "FOTO_PAINEL", "KM_RODADO_CALCULADO", "CONSUMO_KM_L",
    "CUSTO_KM", "CALCULO_CONSOLIDADO"
  ], log);

  garantirAbaV2_(ss, SGO_CFG.SHEETS.FRT_MANUTENCAO, [
    "ID", "VEICULO_ID", "TIPO_MANUT", "DESCRICAO", "DATA", "KM",
    "OFICINA", "CUSTO", "NOTA_FISCAL", "LINK_NF",
    "PROXIMA_DATA", "PROXIMO_KM", "STATUS", "CRIADO_EM",
    "CATEGORIA", "OFICINA_LOCAL", "SERVICO_REALIZADO", "PECAS_SUBSTITUIDAS",
    "CUSTO_PECAS", "CUSTO_MAO_OBRA", "CUSTO_TOTAL", "DIAS_PARADO",
    "FOTOS", "COMPROVANTE", "CHECKLIST_JSON", "BLOQUEANTE"
  ], log);

  garantirAbaV2_(ss, SGO_CFG.SHEETS.FRT_MOVIMENTOS, [
    "ID", "VEICULO_ID", "PLACA", "CONDUTOR_ID", "CONDUTOR_NOME",
    "TIPO", "STATUS", "DATA_HORA_CHECKIN", "DATA_HORA_CHECKOUT",
    "KM_SAIDA", "KM_CHEGADA", "COMBUSTIVEL_SAIDA", "COMBUSTIVEL_CHEGADA",
    "DESTINO", "MOTIVO_USO", "OS_ID", "MISSAO_ID",
    "LOCALIZACAO_SAIDA", "LOCALIZACAO_CHEGADA",
    "CHECKLIST_JSON", "FOTOS_JSON", "ASSINATURA_CHECKIN", "ASSINATURA_CHECKOUT",
    "AVARIAS", "OBSERVACOES", "BLOQUEANTE",
    "CRIADO_EM", "CRIADO_POR", "ATUALIZADO_EM", "ATUALIZADO_POR"
  ], log);

  garantirAbaV2_(ss, SGO_CFG.SHEETS.FRT_LAVAGENS, [
    "ID", "VEICULO_ID", "PLACA", "DATA", "KM", "LOCAL",
    "TIPO_LAVAGEM", "VALOR", "RESPONSAVEL_ID", "RESPONSAVEL_NOME",
    "FOTO_ANTES", "FOTO_DEPOIS", "COMPROVANTE", "OBSERVACOES",
    "CRIADO_EM", "CRIADO_POR"
  ], log);

  garantirAbaV2_(ss, SGO_CFG.SHEETS.FRT_MULTAS, [
    "ID", "VEICULO_ID", "PLACA", "CONDUTOR_ID", "CONDUTOR_NOME",
    "CPF_CNH", "DATA_HORA_INFRACAO", "LOCAL_INFRACAO", "NUMERO_AUTO",
    "ORGAO_AUTUADOR", "DESCRICAO_INFRACAO", "VALOR", "PONTUACAO",
    "PRAZO_INDICACAO", "STATUS", "ANEXO_NOTIFICACAO", "ASSINATURA_CONDUTOR",
    "DOCUMENTO_ID", "OBSERVACOES", "CRIADO_EM", "CRIADO_POR",
    "ATUALIZADO_EM", "ATUALIZADO_POR"
  ], log);

  garantirAbaV2_(ss, SGO_CFG.SHEETS.FRT_ALERTAS, [
    "ID", "VEICULO_ID", "PLACA", "TIPO_ALERTA", "NIVEL", "MENSAGEM",
    "STATUS", "DATA_ALERTA", "DATA_LIMITE", "BLOQUEANTE", "ORIGEM",
    "REFERENCIA_ID", "CRIADO_EM", "CRIADO_POR", "RESOLVIDO_EM", "RESOLVIDO_POR"
  ], log);

  garantirAbaV2_(ss, SGO_CFG.SHEETS.FRT_DOCUMENTOS, [
    "ID", "VEICULO_ID", "PLACA", "TIPO_DOCUMENTO", "DOCUMENTO_ID",
    "TOKEN_VALIDACAO", "HASH", "LINK_PDF", "LINK_DOWNLOAD", "STATUS",
    "EMITIDO_EM", "EMITIDO_POR", "OBSERVACOES"
  ], log);
}

function criarEstruturaFrotaNovaV2_(ss, log) {
  garantirAbaV2_(ss, SGO_CFG.SHEETS.FROTA_VEICULOS, [
    "ID", "CODIGO", "PLACA", "STATUS", "MARCA", "MODELO", "ANO", "COR",
    "COMBUSTIVEL_PADRAO", "KM_ATUAL", "MEDIA_ESPERADA_KM_L",
    "DOCUMENTACAO_VENCE", "SEGURO_VENCE", "IPVA_VENCE", "LICENCIAMENTO_VENCE",
    "RENAVAM", "CHASSI", "PROPRIETARIO", "OBSERVACOES", "BLOQUEADO",
    "MOTIVO_BLOQUEIO", "ULTIMO_MOVIMENTO_ID", "ULTIMA_VISTORIA_ID",
    "ULTIMO_ABASTECIMENTO_ID", "ULTIMA_MANUTENCAO_ID", "PROXIMA_PREVENTIVA_KM",
    "PROXIMA_PREVENTIVA_DATA", "CRIADO_EM", "CRIADO_POR", "ATUALIZADO_EM",
    "ATUALIZADO_POR", "ATIVO"
  ], log);

  garantirAbaV2_(ss, SGO_CFG.SHEETS.FROTA_RESERVAS, [
    "ID", "VEICULO_ID", "PLACA", "RESPONSAVEL_ID", "RESPONSAVEL_NOME",
    "DATA_HORA_INICIO", "DATA_HORA_FIM", "MOTIVO", "DESTINO", "OS_ID",
    "MISSAO_ID", "OBSERVACOES", "STATUS", "BLOQUEANTE", "CRIADO_EM",
    "CRIADO_POR", "ATUALIZADO_EM", "ATUALIZADO_POR"
  ], log);

  garantirAbaV2_(ss, SGO_CFG.SHEETS.FROTA_MOVIMENTOS, [
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

  garantirAbaV2_(ss, SGO_CFG.SHEETS.FROTA_VISTORIAS, [
    "ID", "VEICULO_ID", "PLACA", "MOVIMENTO_ID", "TIPO_VISTORIA",
    "CONDUTOR_ID", "CONDUTOR_NOME", "DATA_HORA", "KM", "COMBUSTIVEL_PERCENTUAL",
    "CHECKLIST_JSON", "FOTOS_JSON", "AVARIAS", "OBSERVACOES", "ASSINATURA",
    "FINALIZADA", "BLOQUEANTE", "CRIADO_EM", "CRIADO_POR"
  ], log);

  garantirAbaV2_(ss, SGO_CFG.SHEETS.FROTA_ABASTECIMENTOS, [
    "ID", "VEICULO_ID", "PLACA", "CONDUTOR_ID", "CONDUTOR_NOME", "DATA_HORA",
    "KM", "LITROS", "VALOR_TOTAL", "VALOR_LITRO", "TIPO_COMBUSTIVEL",
    "TANQUE_CHEIO", "POSTO", "LOCALIZACAO_POSTO", "COMPROVANTE_JSON",
    "FOTO_PAINEL_JSON", "KM_RODADO_CALCULADO", "CONSUMO_KM_L", "CUSTO_KM",
    "CALCULO_CONSOLIDADO", "OBSERVACOES", "CRIADO_EM", "CRIADO_POR"
  ], log);

  garantirAbaV2_(ss, SGO_CFG.SHEETS.FROTA_MANUTENCOES, [
    "ID", "VEICULO_ID", "PLACA", "CATEGORIA", "TIPO_MANUTENCAO", "STATUS",
    "DATA_ENTRADA", "DATA_SAIDA", "KM", "OFICINA_LOCAL", "LOCALIZACAO_OFICINA",
    "DESCRICAO_PROBLEMA", "SERVICO_REALIZADO", "PECAS_SUBSTITUIDAS",
    "CUSTO_PECAS", "CUSTO_MAO_OBRA", "CUSTO_TOTAL", "DIAS_PARADO",
    "PROXIMA_PREVENTIVA_KM", "PROXIMA_PREVENTIVA_DATA", "CHECKLIST_JSON",
    "FOTOS_JSON", "COMPROVANTES_JSON", "BLOQUEANTE", "OBSERVACOES",
    "CRIADO_EM", "CRIADO_POR", "ATUALIZADO_EM", "ATUALIZADO_POR"
  ], log);

  garantirAbaV2_(ss, SGO_CFG.SHEETS.FROTA_LAVAGENS, [
    "ID", "VEICULO_ID", "PLACA", "DATA_HORA", "KM", "LOCAL", "TIPO_LAVAGEM",
    "VALOR", "RESPONSAVEL_ID", "RESPONSAVEL_NOME", "FOTO_ANTES_JSON",
    "FOTO_DEPOIS_JSON", "COMPROVANTE_JSON", "OBSERVACOES", "CRIADO_EM",
    "CRIADO_POR"
  ], log);

  garantirAbaV2_(ss, SGO_CFG.SHEETS.FROTA_MULTAS, [
    "ID", "VEICULO_ID", "PLACA", "CONDUTOR_ID", "CONDUTOR_NOME", "CPF_CNH",
    "DATA_HORA_INFRACAO", "LOCAL_INFRACAO", "NUMERO_AUTO", "ORGAO_AUTUADOR",
    "DESCRICAO_INFRACAO", "VALOR", "PONTUACAO", "PRAZO_INDICACAO", "STATUS",
    "ANEXO_NOTIFICACAO_JSON", "ASSINATURA_CONDUTOR", "DOCUMENTO_ID",
    "TOKEN_VALIDACAO", "HASH", "LINK_PDF", "OBSERVACOES", "CRIADO_EM",
    "CRIADO_POR", "ATUALIZADO_EM", "ATUALIZADO_POR"
  ], log);

  garantirAbaV2_(ss, SGO_CFG.SHEETS.FROTA_ALERTAS, [
    "ID", "VEICULO_ID", "PLACA", "TIPO_ALERTA", "NIVEL", "MENSAGEM",
    "STATUS", "DATA_ALERTA", "DATA_LIMITE", "BLOQUEANTE", "ORIGEM",
    "REFERENCIA_ID", "CRIADO_EM", "CRIADO_POR", "RESOLVIDO_EM", "RESOLVIDO_POR"
  ], log);

  garantirAbaV2_(ss, SGO_CFG.SHEETS.FROTA_DOCUMENTOS, [
    "ID", "VEICULO_ID", "PLACA", "TIPO_DOCUMENTO", "DOCUMENTO_ID",
    "TOKEN_VALIDACAO", "HASH", "LINK_PDF", "LINK_DOWNLOAD", "STATUS",
    "PERIODO_INICIAL", "PERIODO_FINAL", "PERIODO_LABEL",
    "EMITIDO_EM", "EMITIDO_POR", "OBSERVACOES"
  ], log);

  garantirAbaV2_(ss, SGO_CFG.SHEETS.FROTA_UPLOADS, [
    "ID", "VEICULO_ID", "PLACA", "MOVIMENTO_ID", "MODULO_ORIGEM",
    "REFERENCIA_ID", "TIPO_ARQUIVO", "NOME_ARQUIVO", "MIME_TYPE",
    "DRIVE_FILE_ID", "LINK_VISUALIZACAO", "LINK_DOWNLOAD", "CRIADO_EM",
    "CRIADO_POR"
  ], log);

  garantirAbaV2_(ss, SGO_CFG.SHEETS.FROTA_LOGS, [
    "ID", "ACAO", "MODULO", "REFERENCIA_ID", "VEICULO_ID", "PLACA",
    "USUARIO_ID", "USUARIO_NOME", "DATA_HORA", "ANTES_JSON", "DEPOIS_JSON",
    "OBSERVACOES"
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
function setupOrcamentosV2() {
  var log = [];
  var dbComercial = garantirBancoSGOv2_("DB_COMERCIAL_ID", SGO_CFG.SISTEMA.NOME_EXIBICAO + "_DB_COMERCIAL", log);

  criarEstruturaOrcamentosV2_(dbComercial, log);

  var ss = dbComercial;
  var sheet = ss.getSheetByName(SGO_CFG.SHEETS.ORC_CONFIG);
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
  garantirAbaV2_(ss, SGO_CFG.SHEETS.ORC_CONFIG, [
    "ID", "CHAVE", "VALOR", "DESCRICAO", "CRIADO_EM"
  ], log);

  garantirAbaV2_(ss, SGO_CFG.SHEETS.ORC_ORCAMENTOS, [
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

  garantirAbaV2_(ss, SGO_CFG.SHEETS.ORC_ITENS, [
    "ID", "ORCAMENTO_ID", "ORDEM", "TIPO_ITEM",
    "DESCRICAO", "UNIDADE_MEDIDA", "QUANTIDADE", "VALOR_UNITARIO", "DESCONTO_PCT", "VALOR_TOTAL",
    "OBSERVACOES", "CRIADO_EM"
  ], log);

  garantirAbaV2_(ss, SGO_CFG.SHEETS.ORC_TEMPLATES, [
    "ID", "NOME", "TIPO", "DESCRICAO", "ATIVO", "CRIADO_EM"
  ], log);

  garantirAbaV2_(ss, SGO_CFG.SHEETS.ORC_TEMPLATES_ITENS, [
    "ID", "TEMPLATE_ID", "ORDEM", "TIPO_ITEM",
    "DESCRICAO", "UNIDADE_MEDIDA", "QUANTIDADE", "VALOR_UNITARIO",
    "OBSERVACOES", "CRIADO_EM"
  ], log);

  garantirAbaV2_(ss, SGO_CFG.SHEETS.ORC_HISTORICO, [
    "ID", "ORCAMENTO_ID", "ACAO", "STATUS_ANTERIOR", "STATUS_NOVO",
    "USUARIO_ID", "USUARIO_NOME", "DESCRICAO", "CRIADO_EM"
  ], log);

  garantirAbaV2_(ss, SGO_CFG.SHEETS.ORC_EMAILS, [
    "ID", "ORCAMENTO_ID", "DESTINATARIO", "ASSUNTO", "TIPO_EMAIL",
    "STATUS", "ENVIADO_EM", "ENVIADO_POR", "ERRO", "CRIADO_EM"
  ], log);

  garantirAbaV2_(ss, SGO_CFG.SHEETS.ORC_APROVACOES, [
    "ID", "ORCAMENTO_ID", "DOCUMENTO_ID", "TOKEN", "STATUS", "TIPO_RESPOSTA",
    "RESPOSTA_NOME", "RESPOSTA_EMAIL", "RESPOSTA_EM",
    "IP_DISPOSITIVO", "USER_AGENT", "OBSERVACOES", "CRIADO_EM"
  ], log);

  garantirAbaV2_(ss, SGO_CFG.SHEETS.ORC_DOCUMENTOS, [
    "ID", "ORCAMENTO_ID", "TIPO_DOCUMENTO", "DOCUMENTO_ID",
    "TOKEN_VALIDACAO", "HASH", "LINK_PDF", "LINK_DOWNLOAD",
    "STATUS", "EMITIDO_EM", "EMITIDO_POR"
  ], log);

  garantirAbaV2_(ss, SGO_CFG.SHEETS.ORC_ANEXOS, [
    "ID", "ORCAMENTO_ID", "NUMERO_ORC", "TIPO_ANEXO",
    "NOME_ARQUIVO", "MIME_TYPE", "DRIVE_FILE_ID",
    "LINK_VISUALIZACAO", "LINK_DOWNLOAD", "TAMANHO_BYTES",
    "HASH", "OBSERVACAO", "CRIADO_EM", "CRIADO_POR", "ATIVO"
  ], log);

  garantirAbaV2_(ss, SGO_CFG.SHEETS.ORC_ALERTAS, [
    "ID", "ORCAMENTO_ID", "NUMERO_ORC", "LEAD_ID",
    "TIPO_ALERTA", "NIVEL", "MENSAGEM", "STATUS",
    "DATA_ALERTA", "DATA_LIMITE",
    "RESPONSAVEL_ID", "RESPONSAVEL_NOME",
    "VISUALIZADO_EM", "RESOLVIDO_EM", "RESOLVIDO_POR",
    "OBSERVACAO", "CRIADO_EM"
  ], log);

  garantirAbaV2_(ss, SGO_CFG.SHEETS.ORC_FOLLOWUPS, [
    "ID", "ORCAMENTO_ID", "NUMERO_ORC", "LEAD_ID",
    "TIPO_FOLLOWUP", "CANAL", "DESCRICAO", "RESULTADO",
    "PROXIMA_ACAO", "DATA_PROXIMA_ACAO", "STATUS",
    "RESPONSAVEL_ID", "RESPONSAVEL_NOME",
    "CRIADO_EM", "CRIADO_POR", "REALIZADO_EM", "OBSERVACAO"
  ], log);

  garantirAbaV2_(ss, SGO_CFG.SHEETS.ORC_LEADS, [
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
