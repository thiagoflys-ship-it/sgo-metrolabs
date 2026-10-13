/****************************************************
 * CRONOGRAMA DE EXECUÇÃO — módulo nativo do Portal SGO+ CNPJ/DB (2026-08-11)
 *
 * Backend principal: roteador único (CronExec_apiDispatch, mesmo padrão
 * de PlanCME_apiDispatch/CadeiaFrioRel_apiDispatch/RelCal_apiDispatch)
 * + bootstrap + persistência própria (planilha separada, não a base
 * central do Portal — mesmo padrão de Cadeia de Frio/Estufa/RelCal/
 * Planejamento CME).
 ****************************************************/

function CronExec_apiDispatch(req) {
  req = req || {};
  exigirSessao(String(req.sessionId || '')); // SEGURANCA: exige sessao valida do portal (SGO_Auth)
  var fn = String(req.fn || '').trim();
  var payload = req.payload || {};

  var allow = {
    apiConsultarCnpj: CronExec_apiConsultarCnpj,
    apiSugerirGrupos: CronExec_apiSugerirGrupos,
    apiFinalizar: CronExec_apiFinalizar,
    apiMontarDocumentoFinal: CronExec_apiMontarDocumentoFinal,
    apiSalvarDocumento: CronExec_apiSalvarDocumento
  };

  if (!fn) throw new Error('Função não informada.');
  if (!allow[fn] || typeof allow[fn] !== 'function') throw new Error('Função não permitida ou não encontrada: ' + fn);

  return allow[fn](payload);
}

function CronExec_getAppBootstrap() {
  var props = PropertiesService.getScriptProperties();
  return {
    appNome: props.getProperty("CRONEXEC_APP_NOME") || CRONEXEC_CFG.APP.NOME,
    versao: props.getProperty("CRONEXEC_APP_VERSAO") || CRONEXEC_CFG.APP.VERSAO,
    whatsappMsg: props.getProperty("CRONEXEC_WHATSAPP_MSG") || CRONEXEC_CFG.WHATSAPP.MENSAGEM_PADRAO,
    empresaNome: props.getProperty("CRONEXEC_EMPRESA_NOME") || CRONEXEC_CFG.EMPRESA.NOME,
    responsavelTecnico: props.getProperty("CRONEXEC_RESPONSAVEL_TECNICO") || CRONEXEC_CFG.EMPRESA.RESPONSAVEL_TECNICO,
    limiarUnidadeUnicoGrupo: Number(props.getProperty("CRONEXEC_LIMIAR_UNIDADE_UNICO_GRUPO")) || CRONEXEC_CFG.GRUPOS.LIMIAR_UNIDADE_UNICO_GRUPO,
    maxUnidadesPorGrupo: Number(props.getProperty("CRONEXEC_MAX_UNIDADES_POR_GRUPO")) || CRONEXEC_CFG.GRUPOS.MAX_UNIDADES_POR_GRUPO,
    diasUteisPorGrupo: Number(props.getProperty("CRONEXEC_DIAS_UTEIS_POR_GRUPO")) || CRONEXEC_CFG.GRUPOS.DIAS_UTEIS_POR_GRUPO,
    gapDiasUteisEntreGrupos: Number(props.getProperty("CRONEXEC_GAP_DIAS_UTEIS_ENTRE_GRUPOS")) || CRONEXEC_CFG.GRUPOS.GAP_DIAS_UTEIS_ENTRE_GRUPOS,
    orientacoesCliente: CRONEXEC_CFG.TEXTOS.ORIENTACOES_CLIENTE
  };
}

/** Passo 3 do wizard: sugestão determinística de grupos, sem IA — pode ser chamada quantas vezes o técnico quiser. */
function CronExec_apiSugerirGrupos(payload) {
  var equipamentos = Array.isArray(payload.equipamentos) ? payload.equipamentos : [];
  if (equipamentos.length === 0) {
    return { ok: false, mensagem: "Adicione ao menos um equipamento antes de sugerir os grupos." };
  }

  var params = payload.params || {};
  try {
    var resultado = CronExec_sugerirGrupos_(equipamentos, {
      limiarUnidadeUnicoGrupo: params.limiarUnidadeUnicoGrupo,
      maxUnidadesPorGrupo: params.maxUnidadesPorGrupo,
      dataInicioGrupo1: params.dataInicioGrupo1,
      diasUteisPorGrupo: params.diasUteisPorGrupo,
      gapDiasUteisEntreGrupos: params.gapDiasUteisEntreGrupos
    });
    return { ok: true, resultado: resultado };
  } catch (e) {
    return { ok: false, mensagem: "Erro ao sugerir grupos: " + e.message };
  }
}

/**
 * Passo 4 do wizard: valida a composição final dos grupos (possivelmente
 * editada manualmente pelo técnico), chama a IA UMA VEZ e persiste o
 * registro do cronograma. O resultado (incluindo textosIA) é reutilizado
 * sem nova chamada de IA pelos passos de documento/salvamento.
 */
function CronExec_apiFinalizar(payload) {
  var cliente = payload.cliente || {};
  var equipamentos = Array.isArray(payload.equipamentos) ? payload.equipamentos : [];
  var grupos = payload.grupos || null;
  var params = payload.params || {};

  if (equipamentos.length === 0) {
    return { ok: false, mensagem: "Nenhum equipamento informado." };
  }

  // Se o front não mandou grupos (ex.: técnico nunca clicou "Sugerir"),
  // gera agora a partir dos parâmetros.
  var agrupamento = grupos || CronExec_sugerirGrupos_(equipamentos, params);

  CronExec_validarConsistenciaGrupos_(equipamentos, agrupamento);

  var textosIA;
  try {
    textosIA = CronExec_gerarTextosIA_(cliente, equipamentos, agrupamento);
  } catch (e) {
    return { ok: false, mensagem: "Erro ao gerar os textos do cronograma: " + e.message };
  }

  var resultado = {
    cliente: cliente,
    equipamentos: equipamentos,
    params: params,
    agrupamento: agrupamento,
    textosIA: textosIA
  };

  var salvo = CronExec_salvarCronograma_(resultado);
  resultado.cronogramaId = salvo.cronogramaId;

  return { ok: true, resultado: resultado };
}

/** Confere que a soma das quantidades por equipamento nos grupos bate com o informado originalmente. */
function CronExec_validarConsistenciaGrupos_(equipamentos, agrupamento) {
  var totalPorId = {};
  equipamentos.forEach(function (e) { totalPorId[e.id] = Number(e.quantidade) || 0; });

  var somaPorId = {};
  (agrupamento.grupos || []).forEach(function (grupo) {
    (grupo.itens || []).forEach(function (item) {
      somaPorId[item.equipamentoId] = (somaPorId[item.equipamentoId] || 0) + Number(item.quantidade || 0);
    });
  });

  Object.keys(totalPorId).forEach(function (id) {
    var esperado = totalPorId[id];
    var obtido = somaPorId[id] || 0;
    if (esperado !== obtido) {
      throw new Error("A quantidade de equipamento nos grupos não bate com a lista informada (equipamento " + id + ": esperado " + esperado + ", encontrado " + obtido + "). Revise a distribuição antes de gerar.");
    }
  });
}

function CronExec_salvarCronograma_(resultado) {
  try {
    var db = CronExec_getDB_();
    var aba = db.getSheetByName(CRONEXEC_CFG.PLANILHA.ABAS.CRONOGRAMAS);

    var id = CronExec_gerarId_();
    var agora = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd/MM/yyyy HH:mm:ss");
    var agrupamento = resultado.agrupamento || {};
    var grupos = agrupamento.grupos || [];
    var ultimoGrupo = grupos[grupos.length - 1] || {};

    aba.appendRow([
      id,
      agora,
      (resultado.cliente && resultado.cliente.razaoSocial) || "",
      (resultado.cliente && resultado.cliente.cnpj) || "",
      resultado.equipamentos.length,
      agrupamento.totalUnidades || 0,
      agrupamento.modoUnico ? "UNICO" : "MULTIGRUPO",
      agrupamento.totalGrupos || grupos.length,
      (grupos[0] && grupos[0].dataInicio) || "",
      ultimoGrupo.dataFim || "",
      (resultado.params && resultado.params.maxUnidadesPorGrupo) || "",
      (resultado.params && resultado.params.diasUteisPorGrupo) || "",
      (resultado.params && resultado.params.gapDiasUteisEntreGrupos) || "",
      JSON.stringify(resultado.equipamentos || []),
      JSON.stringify(agrupamento),
      JSON.stringify(resultado.textosIA || {})
    ]);

    return { ok: true, cronogramaId: id };
  } catch (e) {
    return { ok: false, mensagem: "Erro ao salvar cronograma: " + e.message };
  }
}

// ------------------------------------------------------------
// CONSULTA PÚBLICA DE CNPJ (mesmo padrão de AutoRel_apiConsultarCnpj)
// ------------------------------------------------------------

function CronExec_apiConsultarCnpj(payload) {
  payload = payload || {};
  const cnpj = String(payload.cnpj || '').replace(/\D/g, '');

  if (!/^\d{14}$/.test(cnpj)) {
    throw new Error('Informe um CNPJ válido com 14 dígitos.');
  }

  const url = 'https://brasilapi.com.br/api/cnpj/v1/' + encodeURIComponent(cnpj);

  let res;
  try {
    res = UrlFetchApp.fetch(url, {
      method: 'get',
      muteHttpExceptions: true,
      followRedirects: true,
      headers: { Accept: 'application/json' }
    });
  } catch (err) {
    throw new Error('Falha ao consultar CNPJ na BrasilAPI: ' + err.message);
  }

  const code = res.getResponseCode();
  const body = res.getContentText() || '';

  if (code === 404) {
    throw new Error('CNPJ não encontrado na base pública.');
  }
  if (code < 200 || code >= 300) {
    throw new Error('BrasilAPI retornou HTTP ' + code + ' ao consultar CNPJ.');
  }

  let data;
  try {
    data = JSON.parse(body);
  } catch (errJson) {
    throw new Error('Resposta inválida da API de CNPJ.');
  }

  // Logradouro e bairro voltam SEPARADOS (bug real, 2026-08-14: antes só
  // existia um "endereco" combinado, e o wizard jogava tudo em Logradouro
  // deixando o campo Bairro sempre vazio — usuário tinha que digitar toda
  // vez).
  const logradouroPartes = [
    data.descricao_tipo_de_logradouro || '',
    data.logradouro || '',
    data.numero || '',
    data.complemento ? ('- ' + data.complemento) : ''
  ].filter(function (v) { return String(v || '').trim(); }).join(' ').replace(/\s+/g, ' ').trim();

  return {
    ok: true,
    fonte: 'BrasilAPI',
    cnpj: CronExec_formatarCnpj_(cnpj),
    razaoSocial: data.razao_social || '',
    cliente: data.razao_social || data.nome_fantasia || '',
    logradouro: logradouroPartes,
    bairro: data.bairro || '',
    municipio: data.municipio || '',
    uf: data.uf || ''
  };
}

function CronExec_formatarCnpj_(cnpj) {
  const s = String(cnpj || '').replace(/\D/g, '');
  if (s.length !== 14) return String(cnpj || '');
  return s.substring(0, 2) + '.' + s.substring(2, 5) + '.' + s.substring(5, 8) + '/' + s.substring(8, 12) + '-' + s.substring(12);
}

function CronExec_getDB_() {
  var props = PropertiesService.getScriptProperties();
  var dbId = props.getProperty("CRONEXEC_DB_ID");
  if (!dbId) {
    // Auto-provisiona na primeira vez (planilha + pastas do Drive), sem
    // exigir um passo manual de admin — mesmo padrão do Planejamento CME.
    CronExec_setupModulo();
    dbId = props.getProperty("CRONEXEC_DB_ID");
  }
  return SpreadsheetApp.openById(dbId);
}
