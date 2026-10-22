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
  if (typeof SGO_bloquearRH_ === 'function') SGO_bloquearRH_(sessaoCron, 'o Cronograma de execução'); // perfil RH: sem documentos técnicos (SGO_Auth.js)
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
    apiSalvarDocumento: CronExec_apiSalvarDocumento,
    apiEquipamentosDoCadastro: CronExec_apiEquipamentosDoCadastro
  };

  if (!fn) throw new Error('Função não informada.');
  if (!allow[fn] || typeof allow[fn] !== 'function') throw new Error('Função não permitida ou não encontrada: ' + fn);

  return allow[fn](payload, String(req.sessionId || ''));
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
function CronExec_apiFinalizar(payload, sessionId) {
  // 21/10/2026: correção (mesmo número, revisão seguinte, motivo) ou cópia de outro cronograma (SGO_DocRevisao.js)
  var docRev;
  try { docRev = SGO_DocRev_montar_('CRONOGRAMA_EXECUCAO', payload, sessionId, ''); } catch (eRev) { return { ok: false, mensagem: String(eRev && eRev.message ? eRev.message : eRev).replace(/[.\s]+$/, '') + '.' }; }
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

  var textosIA, avisoIA = '';
  try {
    textosIA = CronExec_gerarTextosIA_(cliente, equipamentos, agrupamento);
  } catch (e) {
    // Sem a IA o cronograma sai com o texto padrão: datas, grupos e quantidades não dependem dela.
    textosIA = CronExec_textosPadrao_(cliente, equipamentos, agrupamento);
    avisoIA = 'O cronograma saiu com o texto padrão, sem a redação da IA (' + String(e && e.message ? e.message : e).replace(/^A interpretação por IA não está disponível: /, '').replace(/[.\s]+$/, '') + '). Datas, grupos e quantidades não mudam.';
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

  resultado.numeroDocumento = docRev.numero || SGO_DocRev_numeroLivre_('CRONOGRAMA_EXECUCAO', 'CRN-' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd-HHmm'));
  resultado.revisao = docRev.revisao;
  if (payload._docRev) resultado._docRev = payload._docRev;
  var resposta = { ok: true, resultado: resultado };
  if (avisoIA) resposta.avisoIA = avisoIA;
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

/**
 * Equipamentos do cadastro do cliente (cliente → unidade → equipamentos ativos),
 * para o Cronograma não depender de digitação. Busca o cliente pelo CNPJ.
 * Devolve { ok, encontrado, cliente, unidades:[{id,nome}], equipamentos:[{unidadeId, unidade, tipo, marca, modelo, tag}] }.
 */
function CronExec_apiEquipamentosDoCadastro(payload) {
  payload = payload || {};
  var cnpj = String(payload.cnpj || '').replace(/\D/g, '');
  if (cnpj.length !== 14) {
    return { ok: true, encontrado: false, mensagem: 'Informe o CNPJ do cliente na etapa 1 para trazer os equipamentos do cadastro; sem ele, acrescente os equipamentos à mão.' };
  }
  var cliente = SGO_DATA.getAll(SGO_CFG.SHEETS.CAD_CLIENTES).filter(function (c) {
    return String(c.CNPJ || '').replace(/\D/g, '') === cnpj && String(c.STATUS || 'ATIVO').toUpperCase() !== 'INATIVO';
  })[0];
  if (!cliente) {
    return { ok: true, encontrado: false, mensagem: 'Este CNPJ não está no cadastro de Clientes do SGO+. Acrescente os equipamentos à mão ou cadastre o cliente em Cadastros › Clientes.' };
  }
  var unidades = SGO_DATA.getAll(SGO_CFG.SHEETS.CAD_UNIDADES).filter(function (u) {
    return String(u.CLIENTE_ID) === String(cliente.ID) && String(u.STATUS || 'ATIVO').toUpperCase() !== 'INATIVO';
  }).map(function (u) { return { id: String(u.ID), nome: String(u.NOME_UNIDADE || u.NOME || 'Unidade') }; });
  var nomeUnidade = {};
  unidades.forEach(function (u) { nomeUnidade[u.id] = u.nome; });
  // 20/10/2026: situação da qualificação e próxima requalificação de cada equipamento (SGO_QualifEquipamento.js), para o planejamento.
  var qualif = {};
  try { if (typeof SGO_QEQ_situacoesPorEquipamento_ === 'function') qualif = SGO_QEQ_situacoesPorEquipamento_(); } catch (eQ) { qualif = {}; }
  var equipamentos = SGO_DATA.getAll(SGO_CFG.SHEETS.CAD_EQUIPAMENTOS).filter(function (e) {
    return String(e.CLIENTE_ID) === String(cliente.ID) && String(e.STATUS || 'ATIVO').toUpperCase() === 'ATIVO';
  }).map(function (e) {
    var q = qualif[String(e.ID)] || null;
    return { unidadeId: String(e.UNIDADE_ID || ''), unidade: nomeUnidade[String(e.UNIDADE_ID || '')] || '', tipo: String(e.TIPO || '').trim(), marca: String(e.FABRICANTE || '').trim(), modelo: String(e.MODELO || '').trim(), tag: String(e.TAG || '').trim(),
      situacaoQualificacao: q ? q.situacao : '', proximaRequalificacao: q ? q.validadeAte : '', qualificacaoRotulo: q ? q.rotulo : '' };
  }).filter(function (e) { return e.tipo; });
  return { ok: true, encontrado: true, cliente: { id: String(cliente.ID), razaoSocial: String(cliente.RAZAO_SOCIAL || cliente.NOME_FANTASIA || '') }, unidades: unidades, equipamentos: equipamentos };
}


/** Textos padrão do cronograma (sem IA), escritos a partir dos grupos já calculados. */
function CronExec_textosPadrao_(cliente, equipamentos, agrupamento) {
  var grupos = (agrupamento && agrupamento.grupos) || [];
  var total = 0;
  (equipamentos || []).forEach(function (e) { total += Number(e.quantidade) || 0; });
  var tipos = (equipamentos || []).map(function (e) { return e.tipo; }).filter(function (t, i, a) { return t && a.indexOf(t) === i; });
  var primeiro = grupos[0], ultimo = grupos[grupos.length - 1];
  var periodo = (primeiro && ultimo && primeiro.dataInicio && ultimo.dataFim)
    ? ' entre ' + CronExec_formatarDataBr_(primeiro.dataInicio) + ' e ' + CronExec_formatarDataBr_(ultimo.dataFim) : '';
  return {
    objetivo: 'Este cronograma organiza a execução dos serviços técnicos da Metrolabs nos equipamentos de ' + (cliente && cliente.razaoSocial ? cliente.razaoSocial : 'o cliente') +
      ', ' + total + (total === 1 ? ' unidade' : ' unidades') + ' (' + tipos.join(', ') + '), distribuídas em ' + grupos.length + (grupos.length === 1 ? ' grupo' : ' grupos') + periodo +
      ', para que a rotina do setor seja mantida durante os atendimentos.',
    metodologia: 'Cada equipamento passa pela calibração dos instrumentos e sensores do ensaio e pelas etapas de qualificação contratadas (instalação, operação e desempenho). Os equipamentos foram divididos em grupos de execução, considerando dias úteis e o intervalo entre grupos definido no planejamento.',
    // A frase que só anunciava a tabela saiu: o documento cita a Tabela 2 e a Figura 1 pelo número.
    gruposIntro: (grupos.length > 1 && agrupamento && agrupamento.fundamentacao && agrupamento.fundamentacao.estrategia) ? agrupamento.fundamentacao.estrategia : '',
    consideracoesFinais: 'As datas podem ser ajustadas em comum acordo com o cliente, conforme a disponibilidade dos equipamentos e da equipe. Alterações devem ser registradas em nova revisão deste cronograma.'
  };
}
