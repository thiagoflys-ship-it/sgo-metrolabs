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
  var sessaoCron = exigirSessao(String(req.sessionId || '')); // SEGURANCA: exige sessao valida do portal (SGO_Auth)
  // Módulo interno da equipe técnica: o menu já esconde para o perfil
  // CLIENTE; aqui o servidor também recusa a chamada direta.
  if (String(sessaoCron && sessaoCron.perfil || '').toUpperCase() === 'CLIENTE') {
    throw new Error('O Cronograma de execução é de uso interno da equipe Metrolabs e não está disponível para o perfil Cliente. Em caso de dúvida, fale com o seu contato na Metrolabs.');
  }
  var fn = String(req.fn || '').trim();
  var payload = req.payload || {};

  var allow = {
    apiConsultarCnpj: CronExec_apiConsultarCnpj,
    apiSugerirGrupos: CronExec_apiSugerirGrupos,
    apiFinalizar: CronExec_apiFinalizar,
    apiMontarDocumentoFinal: CronExec_apiMontarDocumentoFinal,
    // PDF + cópia HTML A4 na mesma pasta: a cópia HTML é gravada dentro de
    // CronExec_apiSalvarDocumento, com a pasta do cliente já em mãos (sem
    // depender de descobrir a pasta pela URL do PDF).
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
  var agrupamento;
  try {
    agrupamento = grupos || CronExec_sugerirGrupos_(equipamentos, params);
    agrupamento = CronExec_normalizarAgrupamento_(agrupamento);
    CronExec_validarConsistenciaGrupos_(equipamentos, agrupamento);
  } catch (eVal) {
    return { ok: false, mensagem: eVal.message };
  }

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
  resultado.cronogramaId = salvo.cronogramaId || '';

  var resposta = { ok: true, resultado: resultado };
  if (!salvo.ok) {
    // Os textos já foram gerados: o documento pode ser aberto e salvo;
    // só o registro no histórico do módulo falhou.
    resposta.aviso = (salvo.mensagem || 'Erro ao salvar cronograma.') + ' O documento pode ser aberto e salvo normalmente; se o problema continuar, avise o administrador.';
  }
  return resposta;
}

/**
 * Agrupamento editado à mão na etapa 3: tira grupos que ficaram vazios,
 * renumera, confere as datas de cada grupo e recalcula os totais (o
 * navegador pode mandar totais antigos, ex. depois de "+ Novo grupo vazio").
 */
function CronExec_normalizarAgrupamento_(agrupamento) {
  agrupamento = agrupamento || {};
  var grupos = (agrupamento.grupos || []).map(function (g) {
    var itens = (g.itens || []).filter(function (it) { return it && Number(it.quantidade) > 0; });
    return { ordinal: g.ordinal, dataInicio: String(g.dataInicio || '').trim(), dataFim: String(g.dataFim || '').trim(), itens: itens };
  }).filter(function (g) { return g.itens.length > 0; });
  if (!grupos.length) {
    throw new Error('Nenhum grupo tem equipamento. Clique em "Sugerir Grupos" na etapa 3 (ou distribua os equipamentos nos grupos) antes de gerar.');
  }
  var totalUnidades = 0;
  grupos.forEach(function (g, i) {
    g.ordinal = i + 1;
    if (!CronExec_dataIsoValida_(g.dataInicio) || !CronExec_dataIsoValida_(g.dataFim)) {
      throw new Error('O Grupo ' + g.ordinal + ' está sem data de início ou de fim válida. Corrija as datas do grupo na etapa 3 antes de gerar.');
    }
    if (g.dataFim < g.dataInicio) {
      throw new Error('No Grupo ' + g.ordinal + ' a data de fim é anterior à data de início. Corrija as datas do grupo na etapa 3 antes de gerar.');
    }
    g.itens.forEach(function (it) { it.quantidade = Number(it.quantidade); totalUnidades += it.quantidade; });
  });
  agrupamento.grupos = grupos;
  agrupamento.totalGrupos = grupos.length;
  agrupamento.totalUnidades = totalUnidades;
  agrupamento.modoUnico = grupos.length === 1;
  agrupamento.fundamentacao = agrupamento.fundamentacao || { estrategia: '' };
  return agrupamento;
}

/** Confere que a soma das quantidades por equipamento nos grupos bate com o informado originalmente. */
function CronExec_validarConsistenciaGrupos_(equipamentos, agrupamento) {
  var totalPorId = {};
  var nomePorId = {};
  equipamentos.forEach(function (e) {
    totalPorId[e.id] = Number(e.quantidade) || 0;
    nomePorId[e.id] = [e.tipo, e.marca, e.modelo].filter(function (x) { return String(x || '').trim(); }).join(' ') || 'sem nome';
  });

  var somaPorId = {};
  (agrupamento.grupos || []).forEach(function (grupo) {
    (grupo.itens || []).forEach(function (item) {
      somaPorId[item.equipamentoId] = (somaPorId[item.equipamentoId] || 0) + Number(item.quantidade || 0);
    });
  });

  Object.keys(totalPorId).forEach(function (id) {
    var esperado = totalPorId[id];
    var obtido = somaPorId[id] || 0;
    if (esperado < 1) {
      throw new Error('O equipamento "' + nomePorId[id] + '" está com quantidade ' + esperado + ' na etapa 2. Remova-o e adicione de novo com quantidade 1 ou mais.');
    }
    if (esperado !== obtido) {
      throw new Error('A quantidade de equipamento nos grupos não bate com a lista informada ("' + nomePorId[id] + '": ' + esperado + ' na lista, ' + obtido + ' nos grupos). Revise a distribuição na etapa 3 ou clique em "Sugerir Grupos" de novo antes de gerar.');
    }
  });

  // Equipamento removido da lista (etapa 2) depois de sugerir os grupos
  // continuaria aparecendo no documento.
  Object.keys(somaPorId).forEach(function (id) {
    if (!(id in totalPorId)) {
      throw new Error('Os grupos têm um equipamento que não está mais na lista da etapa 2. Clique em "Sugerir Grupos" de novo na etapa 3 antes de gerar.');
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

  // Consulta com reserva entre várias bases públicas + cache (SGO_CnpjConsulta.js).
  const data = SGO_CNPJ_consultarDados_(cnpj);

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
    fonte: 'consulta pública',
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
