/****************************************************
 * METROLABS — AUTOCLAVE — RELATÓRIO DE ENSAIO TÉRMICO (INTERPRETAÇÃO TÉCNICA)
 *
 * Documento HTML A4 de UM ciclo/ensaio (ciclo térmico ou teste de
 * estanqueidade), no padrão comum SGO_DocA4 (capa, sumário, cabeçalho e
 * rodapé em todas as páginas, numeração, gráficos em SVG), salvo em HTML +
 * PDF na pasta do cliente. Os números vêm de AutoRel_acExecutarAnaliseCompleta_
 * (ciclo térmico, Main.js) ou AutoRel_acExecutarAnaliseLeakTestCompleta_
 * (LeakTest.js): este arquivo nunca recalcula resultado por conta própria.
 *
 * Fluxo (20/10/2026):
 * 1. AutoRel_apiGerarRascunhoCertificado — análise determinística. Dado com
 *    problema (travas) devolve a lista do que corrigir e não redige nada.
 *    Sem travas: a IA redige; o texto é conferido (SGO_QualifIA_Verificador.js)
 *    e, se reprovar na conferência, entra o texto padrão determinístico.
 * 2. Emissão só com aprovação registrada do responsável técnico
 *    (SGO_QualifEmissao.js): aprovador emite direto (AutoRel_apiMontarCertificadoFinal,
 *    com a confirmação de revisão); os demais enviam para aprovação
 *    (AutoRel_apiEnviarParaAprovacao) e o aprovador confere a prévia e emite
 *    (AutoRel_apiAprovarEmitir) ou devolve com o motivo.
 * Reemissão do mesmo número gera nova revisão; as anteriores ficam na pasta.
 ****************************************************/

var AUTOREL_MODULO_EMISSAO = 'AUTOCLAVE';

/** Normas citáveis no documento e pela IA (lista fechada da configuração). */
function AutoRel_acListarNormasAplicaveis_(tipoRelatorio) {
  const todas = (AutoRel_UCFG && AutoRel_UCFG.NORMAS_CITAVEIS) || [];
  if (tipoRelatorio === 'LEAK_TEST') {
    return todas.filter(function(n) { return /^RDC|NBR 11816|^EN 285|^EN 13060/.test(n); });
  }
  return todas.slice();
}

function AutoRel_acLabelCiclo_(motor, cicloCfg) {
  const base = 'Ciclo de Esterilização ' + motor + ' °C';
  if (cicloCfg && cicloCfg.tipoProcesso === 'BAIXA_TEMPERATURA') return 'Ciclo de Baixa Temperatura ' + motor + ' °C';
  return base;
}

/** Conformidade por sensor (F0 acumulado + temperaturas na exposição). */
function AutoRel_acMontarConformidadePorSensor_(analise, sensoresAtivos, f0MinNormativo) {
  const lista = [];
  const f0PorSensor = analise.f0PorSensor || [];
  const statsSensores = (analise.stats && analise.stats.sensores) || [];

  for (let s = 0; s < f0PorSensor.length; s++) {
    if (!sensoresAtivos[s]) continue;
    const f0 = f0PorSensor[s];
    if (f0 === null || f0 === undefined) continue;
    const st = statsSensores[s] || {};
    lista.push({
      sensor: 'S' + (s + 1),
      f0: f0,
      statusSensor: f0 >= f0MinNormativo ? 'CONFORME' : 'NAO_CONFORME',
      minTemp: st.minExposicao !== null && st.minExposicao !== undefined ? st.minExposicao : null,
      maxTemp: st.maxExposicao !== null && st.maxExposicao !== undefined ? st.maxExposicao : null,
      mediaTemp: st.mediaExposicao !== null && st.mediaExposicao !== undefined ? st.mediaExposicao : null
    });
  }

  return lista;
}

/** Texto curto de tipo de remoção de ar (campo da tela). */
function AutoRel_acTextoRemocaoAr_(modo) {
  const m = String(modo || '').toUpperCase();
  if (m === 'PRE_VACUO') return 'Pré-vácuo pulsado';
  if (m === 'GRAVITACIONAL') return 'Gravitacional';
  if (m === 'SFPP') return 'Pulsos de pressão positiva (SFPP)';
  return 'Identificação automática pelo registro';
}

function AutoRel_acSituacaoCriterio_(situacao) {
  if (situacao === 'CONFORME') return true;
  if (situacao === 'NAO_CONFORME') return false;
  return null;
}

/**
 * Travas do registrador (rastreabilidade): sem identificação, fora do cadastro de
 * padrões ou com certificado vencido na data do ensaio, o documento não é emitido.
 */
function AutoRel_acTravasRegistrador_(registradores, simulado) {
  const cfgQ = (AutoRel_UCFG && AutoRel_UCFG.QUALIDADE_DADOS) || {};
  if (simulado || cfgQ.exigirRegistradorValido === false) return [];
  const travas = [];
  const itens = (registradores && registradores.itens) || [];
  if (!itens.length) {
    travas.push({ codigo: 'REGISTRADOR_NAO_INFORMADO', oQue: 'O registrador de dados (datalogger) usado no ensaio não foi informado.',
      porQue: 'Sem ele não há como demonstrar a rastreabilidade metrológica das temperaturas.',
      comoCorrigir: 'Preencha o campo "Registrador(es) usado(s)" na seção do relatório com a identificação cadastrada em Padrões de referência (ex.: DTL-01).' });
  }
  itens.forEach(function(it) {
    if (!it.encontrado) {
      travas.push({ codigo: 'REGISTRADOR_NAO_CADASTRADO', oQue: 'O registrador "' + it.tag + '" não está no cadastro de padrões.',
        porQue: 'Sem o cadastro não é possível conferir o certificado de calibração e a validade.',
        comoCorrigir: 'Cadastre o registrador em Cadastros › Padrões de referência (com o certificado e a validade) ou corrija a identificação digitada.' });
    } else if (it.conforme === false) {
      travas.push({ codigo: 'REGISTRADOR_VENCIDO', oQue: 'O certificado de calibração do registrador ' + it.tag + ' (' + (it.certificado || 'sem número') + ') estava vencido na data do ensaio (validade ' + it.validade + ').',
        porQue: 'Medição feita com instrumento fora da validade de calibração não tem rastreabilidade.',
        comoCorrigir: 'Se o certificado foi renovado antes do ensaio: no menu Calibração › Padrões de referência, procure ' + it.tag + ', clique em Editar, atualize o número do certificado, a validade (dd/mm/aaaa) e o PDF do certificado novo, salve e gere de novo. Se não foi renovado, o ensaio precisa ser repetido com registrador calibrado.' });
    } else if (it.conforme === null) {
      travas.push({ codigo: 'REGISTRADOR_SEM_VALIDADE', oQue: 'O registrador ' + it.tag + ' está cadastrado sem a validade do certificado de calibração.',
        porQue: 'Sem a validade não dá para confirmar que a calibração cobria a data do ensaio.',
        comoCorrigir: 'Informe a validade do certificado em Cadastros › Padrões de referência.' });
    }
  });
  return travas;
}

/** Incerteza do F0 do pior sensor pela incerteza do registrador (maior U95 entre os registradores cadastrados). */
function AutoRel_acIncertezaF0_(registradores, minF0, z) {
  const us = ((registradores && registradores.itens) || []).map(function(i) { return i.incertezaU95; })
    .filter(function(u) { return typeof u === 'number' && isFinite(u) && u > 0 && u < 5; });
  if (!us.length || !isFinite(minF0) || minF0 <= 0) return null;
  const uT = Math.max.apply(null, us);
  const uF0 = SGO_QT_incertezaLetalidade_(minF0, uT, z);
  return uF0 === null ? null : { uTemperatura: uT, uF0: AutoRel_roundAnalise_(uF0, 2), relativo: AutoRel_roundAnalise_(uF0 / minF0 * 100, 1) };
}

/**
 * Pacote de fatos único: alimenta a IA, a verificação dos textos e as partes fixas
 * do documento. interno (opcional): recebe { resultado } com os dados lidos, para
 * os gráficos — fica fora do contexto (que vai para a tela e é assinado).
 */
function AutoRel_acMontarContextoCertificado_(payload, interno) {
  // 22/10/2026: patrimônio, capacidade, câmaras e ano do cadastro vão ao documento fora do contexto assinado (envios e emissões antigas continuam válidos).
  if (interno) interno.equipamentoCadastro = { patrimonio: String(payload.patrimonio || '').trim(), capacidade: String(payload.capacidade || '').trim(), numCamaras: String(payload.numCamaras || '').trim(), anoFabricacao: String(payload.anoFabricacao || '').trim() };
  const tipoRelatorio = String(payload.tipoRelatorio || '').toUpperCase().trim() === 'LEAK_TEST' ? 'LEAK_TEST' : 'CICLO';
  const comPressao = AutoRel_analisaPressao_(payload);
  const justificativaSemPressao = comPressao ? '' : String(payload.justificativaSemPressao || '').trim();

  let estudo;
  let statusConsolidado;
  let equipamentoLabel;
  let tempoInicioCicloBruto = '';
  let assinaturaLeituras = '';
  let criterios = [];
  let resumo = '';
  let parametros = [];
  let travas = [];
  let patamar = null;
  let mesclagem = null;

  if (tipoRelatorio === 'LEAK_TEST') {
    const resultado = AutoRel_acExecutarAnaliseLeakTestCompleta_(payload);
    if (interno) interno.resultado = resultado;
    payload = resultado.payload;
    assinaturaLeituras = AutoRel_acAssinatura_({ dados: resultado.dadosNormalizados || [], sensoresAtivos: resultado.sensoresAtivos || [] });
    const a = resultado.analiseLeak;
    travas = ((a.qualidadeDados || {}).travas || []).slice();

    equipamentoLabel = 'Autoclave — Teste de estanqueidade da câmara';
    statusConsolidado = AutoRel_acNormalizarStatus_(a.statusAprovacao || (a.aprovado ? 'APROVADO' : 'REPROVADO'));
    tempoInicioCicloBruto = a.tempoInicioLeakTest || '';

    estudo = {
      tipoEstudo: 'LEAK_TEST',
      label: 'Teste de estanqueidade',
      tituloSecao: 'Teste de estanqueidade',
      statusAprovacao: statusConsolidado,
      fatos: {
        tempoInicio: a.tempoInicioLeakTest,
        tempoFim: a.tempoFimLeakTest,
        tempoDecorridoMinutos: a.tempoDecorridoMinutos,
        unidadePressaoOriginal: a.unidadePressaoOriginal,
        pressaoInicioMbar: a.pressaoInicioMbar,
        pressaoFimMbar: a.pressaoFimMbar,
        deltaPressaoMbar: a.deltaPressaoMbar,
        taxaVazamentoMbarMin: a.taxaVazamentoMbarMin,
        limiteTaxaVazamentoMbarMin: a.limiteTaxaVazamentoMbarMin,
        duracaoMinimaJanelaMin: a.duracaoMinimaJanelaMin
      },
      motivosReprovacao: a.motivosReprovacao || [],
      alertasAnalise: a.alertasAnalise || [],
      observacoesAnalise: a.observacoesAnalise || []
    };

    const conformeTaxa = isFinite(a.taxaVazamentoMbarMin) && isFinite(a.limiteTaxaVazamentoMbarMin) ? a.taxaVazamentoMbarMin <= a.limiteTaxaVazamentoMbarMin : null;
    criterios = [{
      chave: 'taxaVazamento',
      criterio: 'Taxa de vazamento da câmara',
      requisito: '≤ ' + SGO_DocA4_val_(a.limiteTaxaVazamentoMbarMin, 2, 'mbar/min') + (a.duracaoMinimaJanelaMin ? ', numa janela de ao menos ' + SGO_DocA4_val_(a.duracaoMinimaJanelaMin, 0, 'min') : ''),
      referencia: ((AutoRel_UCFG.LEAK_TEST || {}).normaReferencia) || 'Limite configurado',
      obtido: SGO_DocA4_val_(a.taxaVazamentoMbarMin, 2, 'mbar/min') + ' em ' + SGO_DocA4_val_(a.tempoDecorridoMinutos, 2, 'min'),
      conforme: conformeTaxa
    }];
    resumo = 'Taxa de vazamento de ' + SGO_DocA4_val_(a.taxaVazamentoMbarMin, 2, 'mbar/min') + ', ' +
      (conformeTaxa === false ? 'acima' : 'dentro') + ' do limite de ' + SGO_DocA4_val_(a.limiteTaxaVazamentoMbarMin, 2, 'mbar/min') + '.';
    parametros = [
      ['Unidade de pressão do registro', String(a.unidadePressaoOriginal || '—').toLowerCase().replace('kpa', 'kPa')],
      ['Janela do teste', (a.tempoInicioLeakTest || '—') + ' a ' + (a.tempoFimLeakTest || '—')]
    ];
  } else {
    const resultado = AutoRel_acExecutarAnaliseCompleta_(payload);
    if (interno) interno.resultado = resultado;
    payload = resultado.payload;
    assinaturaLeituras = AutoRel_acAssinatura_({ dados: resultado.dadosNormalizados || [], sensoresAtivos: resultado.sensoresAtivos || [] });
    const a = resultado.analise;
    const cicloCfg = resultado.cicloCfg || {};
    const refs = AutoRel_UCFG.CRITERIOS_REFERENCIAS || {};
    const f0MinNormativo = a.limitesAprovacao && typeof a.limitesAprovacao.f0MinNormativo === 'number'
      ? a.limitesAprovacao.f0MinNormativo
      : AutoRel_parseFloatSeguro_(cicloCfg.f0MinNormativo, 0);
    const exigeF0 = !!(cicloCfg.f0MinNormativo || cicloCfg.f0Min);
    travas = ((a.qualidadeDados || {}).travas || []).slice();
    patamar = (a.criteriosPatamar && a.criteriosPatamar.patamar) || null;
    mesclagem = payload._mesclagem || null;

    equipamentoLabel = AutoRel_acLabelCiclo_(resultado.motor, cicloCfg);
    statusConsolidado = AutoRel_acNormalizarStatus_(a.statusAprovacao || (a.aprovado ? 'APROVADO' : 'REPROVADO'));
    tempoInicioCicloBruto = a.tempoInicioCiclo || '';
    const conformidade = AutoRel_acMontarConformidadePorSensor_(a, resultado.sensoresAtivos, f0MinNormativo);

    const fatos = {
      exigeF0: exigeF0,
      f0MinNormativo: f0MinNormativo,
      minF0: a.minF0,
      mediaF0: a.mediaF0,
      maxF0: a.maxF0,
      tempoInicioExposicao: a.tempoInicioExposicao || '',
      tempoFimExposicao: a.tempoFimExposicao || '',
      tempoExposicaoMinutos: a.tempoExposicaoMinutos,
      tempoTotalMinutos: a.tempoTotalMinutos,
      quantidadeSensoresInstalados: a.quantidadeSensoresInstalados,
      quantidadeSensoresUtilizados: a.quantidadeSensoresUtilizados,
      sensoresDesabilitados: a.sensoresDesabilitados || [],
      sensorReferencia: a.sensorReferencia || '',
      piorSensorF0: a.piorSensorF0 || null,
      piorSensorTemperatura: a.piorSensorTemperatura || null,
      patamar: patamar,
      conformidadePorSensor: conformidade,
      temperaturaReferencia: { tMin: cicloCfg.tMin, tMax: cicloCfg.tMax, tBase: (a.configuracaoCiclo || {}).tBase, z: (a.configuracaoCiclo || {}).z },
      intervaloLeiturasSegundos: isFinite(a.deltaMinutosEstimado) ? Math.round(a.deltaMinutosEstimado * 60 * 10) / 10 : null
    };
    if (comPressao) {
      fatos.fasesProcesso = (a.fasesProcesso && a.fasesProcesso.resumo) || {};
      fatos.diagnosticoPreVacuo = (a.fasesProcesso && a.fasesProcesso.diagnostico) || { status: 'INDETERMINADO', limitacoes: ['Diagnóstico de pré-vácuo indisponível; zero pulsos detectados não comprova ausência de remoção de ar.'] };
      fatos.pressaoRegistrada = (a.stats && a.stats.globalPres) || {};
    }

    estudo = {
      tipoEstudo: 'CICLO_TERMICO',
      label: equipamentoLabel,
      tituloSecao: 'Ciclo de esterilização — ' + resultado.motor + ' °C',
      statusAprovacao: statusConsolidado,
      fatos: fatos,
      motivosReprovacao: a.motivosReprovacao || [],
      alertasAnalise: a.alertasAnalise || [],
      observacoesAnalise: a.observacoesAnalise || []
    };

    const exposicaoOk = !!(a.tempoInicioExposicao && a.tempoFimExposicao) && a.tempoExposicaoMinutos > 0;
    criterios.push({
      chave: 'exposicao',
      criterio: 'Identificação da fase de exposição',
      requisito: 'Patamar de esterilização reconhecido nos dados de todos os sensores ativos',
      referencia: (refs.exposicao || {}).referencia || 'ABNT NBR ISO 17665-1',
      obtido: exposicaoOk ? (AutoRel_acSoHora_(a.tempoInicioExposicao) + ' a ' + AutoRel_acSoHora_(a.tempoFimExposicao) + ' (' + SGO_DocA4_val_(a.tempoExposicaoMinutos, 2, 'min') + ')') : 'Não identificada',
      conforme: exposicaoOk
    });
    ((a.criteriosPatamar && a.criteriosPatamar.lista) || []).forEach(function(c) {
      criterios.push({
        chave: c.chave, criterio: c.criterio, requisito: c.requisito, referencia: c.referencia,
        obtido: c.situacao === 'NAO_AVALIADO' ? c.motivo : c.obtido,
        conforme: AutoRel_acSituacaoCriterio_(c.situacao), naoAvaliado: c.situacao === 'NAO_AVALIADO', obrigatorio: c.obrigatorio
      });
    });
    if (exigeF0) {
      const pior = a.piorSensorF0 ? a.piorSensorF0.sensor : '';
      const f0Ok = conformidade.length ? a.minF0 >= f0MinNormativo : false;
      criterios.push({
        chave: 'f0',
        criterio: 'Letalidade térmica (F0) no pior sensor',
        requisito: 'F0 ≥ ' + SGO_DocA4_val_(f0MinNormativo, 2, 'min') + ' em todos os sensores ativos',
        referencia: (refs.f0 || {}).referencia || 'ABNT NBR ISO 17665-1',
        obtido: conformidade.length ? (SGO_DocA4_val_(a.minF0, 2, 'min') + (pior ? ' (' + pior + ')' : '')) : 'Não calculado',
        conforme: f0Ok
      });
    }
    const ncs = criterios.filter(function(c) { return c.conforme === false; });
    if (statusConsolidado === 'REPROVADO') {
      resumo = ncs.length ? 'Não atendido: ' + ncs.map(function(c) { return c.criterio.toLowerCase(); }).join('; ') + '.' : 'O ciclo não atende aos critérios de aceitação.';
    } else if (exigeF0 && conformidade.length) {
      resumo = 'Todos os critérios avaliados foram atendidos. F0 mínimo de ' + SGO_DocA4_val_(a.minF0, 2, 'min') + (a.piorSensorF0 ? ' no sensor ' + a.piorSensorF0.sensor : '') + ' para o mínimo de ' + SGO_DocA4_val_(f0MinNormativo, 2, 'min') + '.';
    } else {
      resumo = exposicaoOk ? 'Fase de exposição identificada com ' + SGO_DocA4_val_(a.tempoExposicaoMinutos, 2, 'min') + ' de duração.' : 'Fase de exposição não identificada.';
    }
    const eq = payload.equipamento || {};
    parametros = [
      ['Temperatura programada', payload.setpoint ? SGO_DocA4_val_(Number(String(payload.setpoint).replace(',', '.')), 1, '°C') : (resultado.motor + ' °C')],
      ['Faixa de esterilização de referência', (isFinite(cicloCfg.tMin) && isFinite(cicloCfg.tMax)) ? SGO_DocA4_val_(cicloCfg.tMin, 1, '°C') + ' a ' + SGO_DocA4_val_(cicloCfg.tMax, 1, '°C') : '—'],
      comPressao ? ['Remoção de ar', AutoRel_acTextoRemocaoAr_(eq.modoRemocaoAr)] : null,
      ['Intervalo entre leituras', fatos.intervaloLeiturasSegundos ? SGO_DocA4_val_(fatos.intervaloLeiturasSegundos, 0, 's') : '—'],
      ['Sensores utilizados', (a.quantidadeSensoresUtilizados || 0) + ' de ' + (a.quantidadeSensoresInstalados || 0) + ' instalados' + ((a.sensoresDesabilitados || []).length ? ' (desconsiderados: ' + a.sensoresDesabilitados.join(', ') + ')' : '')],
      a.sensorReferencia ? ['Sensor de referência da câmara', a.sensorReferencia] : null,
      ['Correção de temperatura aplicada', AutoRel_parseFloatSeguro_(payload.offsetTemp, 0) ? SGO_DocA4_val_(AutoRel_parseFloatSeguro_(payload.offsetTemp, 0), 2, '°C') : 'Nenhuma'],
      ['Origem dos dados', String(payload.modoEntrada || '').toUpperCase() === 'ARQUIVO_POR_SENSOR' ? 'Um arquivo por sensor (registradores individuais), alinhados pelo horário' : (payload.modoRelatorioSimulado ? 'Dados reconstituídos (uso interno)' : 'Arquivo único do registrador')]
    ].filter(Boolean);
  }

  const dataDoEnsaio = AutoRel_acExtrairDataDoTexto_(estudo.fatos.tempoInicioExposicao || estudo.fatos.tempoInicio || tempoInicioCicloBruto || '');
  const dtl = String(payload.certDataLogger || '').trim();
  const registradores = SGO_DocA4_registradores_(dtl, dataDoEnsaio);
  travas = travas.concat(AutoRel_acTravasRegistrador_(registradores, !!payload.modoRelatorioSimulado));
  if (estudo.tipoEstudo === 'CICLO_TERMICO' && estudo.fatos.exigeF0) {
    estudo.fatos.incertezaF0 = AutoRel_acIncertezaF0_(registradores, estudo.fatos.minF0, (estudo.fatos.temperaturaReferencia || {}).z);
  }

  const escopo = [
    'Este relatório refere-se exclusivamente ao ciclo aqui identificado, com os dados do registrador informado; numa campanha de qualificação, cada ciclo tem o seu relatório.',
    tipoRelatorio === 'LEAK_TEST'
      ? 'O teste de estanqueidade avalia a manutenção do vácuo na câmara isolada; não avalia o desempenho térmico do ciclo.'
      : 'A aprovação térmica e o F0 não demonstram, isoladamente, a remoção completa do ar nem a ausência de gases não condensáveis, que dependem de ensaios específicos (por exemplo, o ensaio de Bowie-Dick com indicador químico).',
    'Critérios configurados pela empresa executante e revisáveis pelo responsável técnico; ' + String(((AutoRel_UCFG.EMISSAO || {}).regraDecisao) || '').replace(/^A/, 'a')
  ];
  if (!comPressao) escopo.push('Este ensaio considerou somente a temperatura: ' + justificativaSemPressao.replace(/[.\s]+$/, '') + '.');

  return {
    tipoRelatorio: tipoRelatorio,
    assinaturaLeituras: assinaturaLeituras,
    simulado: !!payload.modoRelatorioSimulado,
    origemDados: payload.modoRelatorioSimulado ? 'SIMULADO — USO INTERNO; NÃO REPRESENTA ENSAIO REAL' : 'DADOS INFORMADOS PARA O ENSAIO',
    // Ensaio só de temperatura: a norma específica de esterilizadores com vácuo não é citada (nada de vácuo foi avaliado).
    normas: AutoRel_acListarNormasAplicaveis_(tipoRelatorio).filter(function(n) { return comPressao || !/NBR 11816/.test(n); }),
    statusConsolidado: statusConsolidado,
    resumoResultado: resumo,
    criterios: criterios,
    parametros: parametros,
    registradores: registradores,
    travas: travas,
    emissaoBloqueada: travas.length > 0 && !payload.modoRelatorioSimulado,
    analisarPressao: comPressao,
    justificativaSemPressao: justificativaSemPressao,
    escopo: escopo,
    mesclagem: mesclagem,
    equipamentoLabel: equipamentoLabel,
    tag: String(payload.tag || payload.tagEquipamento || '').trim(),
    cliente: String(payload.cliente || '').trim(),
    setor: String(payload.setor || payload.localizacao || payload.local || '').trim(),
    identificacao: {
      cliente: String(payload.cliente || '').trim(),
      cnpj: String(payload.cnpj || '').trim(),
      endereco: String(payload.endereco || '').trim(),
      setor: String(payload.setor || payload.localizacao || payload.local || '').trim(),
      equipamento: equipamentoLabel,
      equipamentoTipo: comPressao ? 'Autoclave a vapor' : 'Autoclave a vapor de pequeno porte (cassete)',
      tag: String(payload.tag || payload.tagEquipamento || '').trim(),
      dtl: dtl,
      certificadoNumero: String(payload.certNumero || '').trim(),
      revisao: String(payload.certRevisao || '0').trim() || '0',
      dataDoEnsaio: dataDoEnsaio,
      tecnicoExecutor: String(payload.responsavelTecnico || payload.respTecnico || payload.operador || '').trim(),
      operador: String(payload.operador || '').trim(),
      marca: String(payload.marca || '').trim(),
      modelo: String(payload.modelo || '').trim(),
      numeroSerie: String(payload.numSerie || '').trim(),
      programa: String(payload.programa || '').trim(),
      tipoEnsaio: String(payload.ensaio || '').trim(),
      cicloNumero: String(payload.cicloNum || '').trim(),
      lote: String(payload.lote || '').trim(),
      responsavelAceite: String(payload.certResponsavelAceite || '').trim(),
      tarefaOrigem: String(payload.certTarefaOrigem || '').trim(),
      empresaExecutante: AutoRel_UCFG.EMPRESA_EXECUTANTE
    },
    estudos: [estudo]
  };
}

/** Valor gravado do campo "Tipo de ensaio" → texto do documento. */
function AutoRel_acTextoTipoEnsaio_(v) {
  const s = String(v || '').trim();
  const mapa = {
    'QD (Carga)': 'Qualificação de desempenho (com carga)',
    'QO (Vazio)': 'Qualificação operacional (câmara vazia)',
    'QI (Instalação)': 'Qualificação de instalação',
    'Rotina': 'Monitoramento de rotina'
  };
  return mapa[s] || s || '—';
}

function AutoRel_acSoHora_(tempoStr) {
  const s = String(tempoStr || '').trim();
  const m = s.match(/(\d{1,2}:\d{2}(:\d{2})?)\s*$/);
  return m ? m[1] : (s || '—');
}

function AutoRel_acExtrairDataDoTexto_(texto) {
  const s = String(texto || '').trim();

  let m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) return m[1].padStart(2, '0') + '/' + m[2].padStart(2, '0') + '/' + m[3];

  m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return m[3] + '/' + m[2] + '/' + m[1];

  return '';
}

/** Status único do documento: APROVADO, REPROVADO ou INFORMATIVO (não existe mais "com alerta"). */
function AutoRel_acNormalizarStatus_(status) {
  const s = String(status || '').toUpperCase();
  if (s === 'REPROVADO') return 'REPROVADO';
  if (s.indexOf('APROVADO') === 0) return 'APROVADO';
  return 'INFORMATIVO';
}

function AutoRel_acLabelStatus_(status) {
  return AutoRel_acNormalizarStatus_(status);
}

// ------------------------------------------------------------
// CONFERÊNCIA DOS TEXTOS (IA ou técnico) — SGO_QualifIA_Verificador.js
// ------------------------------------------------------------
var AUTOREL_TERMOS_PRESSAO = [/press[aã]o|press[oõ]es|\bkpa\b|\bm?bar\b|v[aá]cuo|estanqueidade|vapor saturado|pr[eé]-v[aá]cuo/i];

function AutoRel_acRegrasTexto_(ctx, exigirVeredito, verificarNumeros) {
  return {
    numeros: SGO_QIAV_numerosDe_([ctx.criterios, ctx.parametros, ctx.estudos.map(function(e) { return [e.fatos, e.motivosReprovacao, e.alertasAnalise, e.observacoesAnalise]; }), ctx.registradores, ctx.normas, ctx.escopo]),
    normas: ctx.normas,
    veredito: ctx.statusConsolidado,
    exigirVeredito: !!exigirVeredito,
    verificarNumeros: verificarNumeros !== false,
    termosProibidos: ctx.analisarPressao === false ? AUTOREL_TERMOS_PRESSAO : []
  };
}

/** Confere os três blocos. verificarNumeros=false para texto escrito pelo técnico (só veredito, normas e termos). */
function AutoRel_acConferirTextos_(ctx, textos, verificarNumeros) {
  const blocos = {
    'Conclusão técnica': { texto: textos.conclusaoGeral, regras: AutoRel_acRegrasTexto_(ctx, true, verificarNumeros) },
    'Conclusão em linguagem simples': { texto: textos.conclusaoLeigo, regras: AutoRel_acRegrasTexto_(ctx, false, verificarNumeros) }
  };
  ctx.estudos.forEach(function(e) {
    blocos['Análise técnica'] = { texto: (textos.analisePorEstudo || {})[e.tipoEstudo], regras: AutoRel_acRegrasTexto_(ctx, false, verificarNumeros) };
  });
  return SGO_QIAV_verificarBlocos_(blocos);
}

/**
 * Texto padrão determinístico (sem IA): montado só com os resultados do motor.
 * Usado quando a IA não está disponível ou quando o texto dela não passa na conferência.
 */
function AutoRel_acTextosPadrao_(ctx) {
  const e = ctx.estudos[0];
  const f = e.fatos || {};
  const st = ctx.statusConsolidado;
  const crit = ctx.criterios || [];
  const avaliados = crit.filter(function(c) { return c.conforme !== null; });
  const nc = crit.filter(function(c) { return c.conforme === false; });
  const naoAv = crit.filter(function(c) { return c.naoAvaliado; });
  const p = [];
  if (e.tipoEstudo === 'LEAK_TEST') {
    p.push('O teste de estanqueidade foi avaliado na janela de ' + AutoRel_acSoHora_(f.tempoInicio) + ' a ' + AutoRel_acSoHora_(f.tempoFim) + ', com duração de ' + SGO_DocA4_val_(f.tempoDecorridoMinutos, 2, 'min') + '. A pressão absoluta da câmara passou de ' + SGO_DocA4_val_(f.pressaoInicioMbar, 2, 'mbar') + ' para ' + SGO_DocA4_val_(f.pressaoFimMbar, 2, 'mbar') + ', o que corresponde a uma taxa de vazamento de ' + SGO_DocA4_val_(f.taxaVazamentoMbarMin, 2, 'mbar/min') + ', para o limite configurado de ' + SGO_DocA4_val_(f.limiteTaxaVazamentoMbarMin, 2, 'mbar/min') + '.');
  } else {
    p.push('A fase de exposição foi identificada de ' + AutoRel_acSoHora_(f.tempoInicioExposicao) + ' a ' + AutoRel_acSoHora_(f.tempoFimExposicao) + ', com ' + SGO_DocA4_val_(f.tempoExposicaoMinutos, 2, 'min') + ' de duração, considerando ' + f.quantidadeSensoresUtilizados + ' sensores ativos.' +
      (f.patamar ? ' O patamar com todos os sensores na temperatura de esterilização durou ' + SGO_DocA4_val_(f.patamar.duracaoMin, 2, 'min') + '.' : ''));
    if (f.exigeF0 && f.conformidadePorSensor && f.conformidadePorSensor.length) {
      p.push('O F0 acumulado na exposição variou de ' + SGO_DocA4_val_(f.minF0, 2, 'min') + ' a ' + SGO_DocA4_val_(f.maxF0, 2, 'min') + ', com média de ' + SGO_DocA4_val_(f.mediaF0, 2, 'min') + '. O menor valor ocorreu no sensor ' + (f.piorSensorF0 ? f.piorSensorF0.sensor : '—') + ', comparado ao mínimo configurado de ' + SGO_DocA4_val_(f.f0MinNormativo, 2, 'min') + '.' +
        (f.incertezaF0 ? ' A incerteza expandida estimada desse valor, propagada da incerteza do registrador, é de ' + SGO_DocA4_val_(f.incertezaF0.uF0, 2, 'min') + '.' : ''));
    }
  }
  // Sem repetir a tabela de critérios: o texto padrão só comenta o que não foi atendido e o que não foi avaliado.
  if (nc.length) p.push('Não foram atendidos: ' + nc.map(function(c) { return c.criterio.toLowerCase() + ' (obtido ' + c.obtido + '; requisito ' + c.requisito + ')'; }).join('; ') + '.');
  else if (avaliados.length) p.push((avaliados.length === 1 ? 'O critério avaliado foi atendido' : 'Os ' + avaliados.length + ' critérios avaliados foram atendidos') + '; os valores obtidos estão na tabela de verificação dos critérios.');
  naoAv.forEach(function(c) { p.push(c.criterio + ': ' + c.obtido.replace(/^Não avaliado:s*/, 'não avaliado, porque ')); });
  const analise = p.join('\n\n');
  const conclusao = [
    (avaliados.length === 1 ? 'Foi avaliado 1 critério de aceitação' : 'Foram avaliados ' + avaliados.length + ' critérios de aceitação') + (naoAv.length ? ' (' + naoAv.length + ' não avaliado(s) por limitação dos dados, sem efeito no resultado)' : '') + '. ' +
      (nc.length ? 'Não foram atendidos: ' + nc.map(function(c) { return c.criterio.toLowerCase(); }).join('; ') + '.' : (avaliados.length === 1 ? 'O critério foi atendido.' : 'Todos os critérios avaliados foram atendidos.')),
    st === 'APROVADO' ? 'O ensaio está APROVADO.' : (st === 'REPROVADO' ? 'O ensaio está REPROVADO.' : 'O ensaio tem caráter informativo, sem critério de aprovação aplicável.')
  ].join('\n\n');
  const leigo = st === 'APROVADO'
    ? 'O equipamento atingiu e manteve as condições de temperatura e tempo exigidas para a esterilização em todos os pontos medidos neste ciclo. O resultado deste ensaio é aprovado.'
    : (st === 'REPROVADO'
      ? 'Neste ciclo o equipamento não atingiu ou não manteve alguma das condições exigidas para a esterilização, conforme indicado nos critérios acima. O resultado deste ensaio é reprovado; o equipamento deve ser avaliado e o ensaio repetido antes da liberação para uso.'
      : 'Este ensaio registra o comportamento do equipamento para consulta, sem critério de aprovação aplicável.');
  if (e.tipoEstudo === 'LEAK_TEST') {
    return { analisePorEstudo: { LEAK_TEST: analise }, conclusaoGeral: conclusao,
      conclusaoLeigo: st === 'APROVADO' ? 'A câmara manteve o vácuo dentro do limite configurado: a vedação está adequada neste ensaio. O resultado é aprovado.' : 'A câmara perdeu vácuo acima do limite configurado: a vedação precisa ser avaliada antes do próximo uso. O resultado é reprovado.' };
  }
  return { analisePorEstudo: { CICLO_TERMICO: analise }, conclusaoGeral: conclusao, conclusaoLeigo: leigo };
}

// ------------------------------------------------------------
// API — ETAPA 1: RASCUNHO
// ------------------------------------------------------------
function AutoRel_apiGerarRascunhoCertificado(payload, sessao) {
  payload = payload || {};
  const contexto = AutoRel_acMontarContextoCertificado_(payload);
  const podeAprovar = AutoRel_acEhAprovador_(sessao);
  const base = { ok: true, contexto: contexto, assinaturaContexto: AutoRel_acAssinatura_(contexto), podeAprovar: podeAprovar, travas: contexto.emissaoBloqueada ? contexto.travas : [] };

  if (contexto.emissaoBloqueada) {
    return Object.assign(base, {
      bloqueado: true,
      textos: { conclusaoGeral: '', conclusaoLeigo: '', analisePorEstudo: {} },
      avisoIA: 'O documento não pode ser emitido enquanto os problemas dos dados listados abaixo não forem corrigidos. Nada foi redigido.'
    });
  }

  let textos, avisoIA = '', origemTexto = 'IA';
  try {
    textos = AutoRel_acIACriarTextosCertificado_(contexto);
    const conf = AutoRel_acConferirTextos_(contexto, textos, true);
    if (!conf.ok) {
      textos = AutoRel_acTextosPadrao_(contexto);
      origemTexto = 'PADRAO';
      avisoIA = 'O texto redigido automaticamente não passou na conferência (' + conf.problemas.slice(0, 4).join('; ') + '). Foi usado o texto padrão, montado só com os resultados calculados; revise e complete se quiser.';
    }
  } catch (e) {
    textos = AutoRel_acTextosPadrao_(contexto);
    origemTexto = 'PADRAO';
    avisoIA = 'A redação automática não está disponível (' + String(e && e.message ? e.message : e).replace(/[.\s]+$/, '') + '). Foi usado o texto padrão, montado só com os resultados calculados; revise e complete se quiser.';
  }
  return Object.assign(base, { bloqueado: false, textos: textos, avisoIA: avisoIA, origemTexto: origemTexto });
}

function AutoRel_acEhAprovador_(sessao) {
  return SGO_QE_ehAprovador_(sessao, ((AutoRel_UCFG.EMISSAO || {}).perfisAprovadores) || ['ADMIN']);
}

/** Validações comuns antes de emitir ou enviar para aprovação. Devolve { contexto, textos, interno }. */
function AutoRel_acValidarParaEmissao_(payload) {
  const interno = {};
  const contexto = AutoRel_acMontarContextoCertificado_(payload, interno);
  if (!payload.assinaturaContextoCertificado || payload.assinaturaContextoCertificado !== AutoRel_acAssinatura_(contexto)) {
    throw new Error('Os dados ou critérios mudaram desde o rascunho, ou o rascunho não foi gerado. Clique em "Gerar rascunho" de novo, revise os textos e emita.');
  }
  if (contexto.emissaoBloqueada) AutoRel_exigirSemTravas_(contexto.travas);
  const t = payload.textosCertificado || {};
  const textos = { conclusaoGeral: String(t.conclusaoGeral || '').trim(), conclusaoLeigo: String(t.conclusaoLeigo || '').trim(), analisePorEstudo: t.analisePorEstudo || {} };
  if (!textos.conclusaoGeral || !textos.conclusaoLeigo || contexto.estudos.some(function(e) { return !String(textos.analisePorEstudo[e.tipoEstudo] || '').trim(); })) {
    throw new Error('A interpretação está incompleta. Preencha a análise e as duas conclusões antes de emitir (ou gere o rascunho de novo para receber o texto padrão).');
  }
  const conf = AutoRel_acConferirTextos_(contexto, textos, false);
  if (!conf.ok) {
    throw new Error('Os textos revisados não podem ser emitidos: ' + conf.problemas.join('; ') + '. Corrija o texto (o resultado é o calculado pelo sistema) e emita de novo.');
  }
  return { contexto: contexto, textos: textos, interno: interno };
}

/** Monta o HTML do documento (aprovacao: { nome, perfil, em } ou null para prévia). */
function AutoRel_acMontarHtml_(contexto, interno, textos, fotos, aprovacao, minuta) {
  const template = HtmlService.createTemplateFromFile('AutoclaveCertificado');
  template.ctx = contexto;
  template.equipCad = (interno && interno.equipamentoCadastro) || {};
  template.textos = { conclusaoGeral: textos.conclusaoGeral, conclusaoLeigo: textos.conclusaoLeigo, analisePorEstudo: textos.analisePorEstudo || {} };
  template.fotos = (fotos || []).filter(function(f) { return f && f.base64; }).slice(0, 4);
  template.geradoEm = Utilities.formatDate(new Date(), AutoRel_UCFG.TZ, 'dd/MM/yyyy');
  template.graficos = AutoRel_acMontarGraficos_(contexto, interno.resultado || {});
  template.assinaturas = AutoRel_acListaAssinaturas_(contexto, aprovacao);
  template.aprovacao = aprovacao || null;
  template.minuta = !!minuta;
  return template.evaluate().getContent();
}

function AutoRel_acPastaLaudos_() {
  return SGO_DocSalvar_pastaPersistente_('AUTOREL_LAUDOS_FOLDER_ID', 'Autoclave - Laudos', AutoRel_UCFG.LAUDOS_FOLDER_ID);
}

/** Emite (aprovação registrada), salva HTML + PDF na pasta do cliente e grava a revisão. */
function AutoRel_acEmitir_(payload, validado, sessao, idPendente) {
  const contexto = validado.contexto;
  const numero = contexto.identificacao.certificadoNumero;
  const simulado = !!payload.modoRelatorioSimulado;
  const revisao = simulado ? (parseInt(contexto.identificacao.revisao, 10) || 0) : SGO_QE_proximaRevisao_(AUTOREL_MODULO_EMISSAO, numero, contexto.identificacao.revisao);
  contexto.identificacao.revisao = String(revisao);
  const aprovacao = { nome: SGO_QE_nomeSessao_(sessao), login: String((sessao && sessao.usuario) || ''), perfil: String((sessao && sessao.perfil) || ''), em: SGO_QE_agora_() };
  const html = AutoRel_acMontarHtml_(contexto, validado.interno, validado.textos, payload.fotosCertificado || [], aprovacao, false);
  const payloadSalvar = Object.assign({}, payload, { certRevisao: String(revisao) });
  const rotulo = contexto.tipoRelatorio === 'LEAK_TEST' ? 'Relatório de ensaio Autoclave - estanqueidade' : 'Relatório de ensaio Autoclave';
  const r = SGO_DocSalvar_finalizarCertificado_(html, payloadSalvar, AutoRel_acPastaLaudos_, rotulo + (revisao ? ' rev ' + revisao : ''), AutoRel_UCFG.TZ);
  if (!simulado) {
    const campos = {
      STATUS: 'EMITIDO', REVISAO: String(revisao), APROVADO_POR: aprovacao.nome, APROVADO_LOGIN: aprovacao.login, APROVADO_PERFIL: aprovacao.perfil,
      APROVADO_EM: aprovacao.em, PDF_ID: r.pdfId || '', HTML_ID: r.htmlId || '', RESULTADO: contexto.statusConsolidado
    };
    // 20/10/2026: resumo dos resultados guardado na emissão, para o relatório de qualificação (SGO_AutoRel_ModeloOficialNovo.js).
    if (typeof AutoOficial_resumoCiclo_ === 'function') { try { campos.RESUMO_JSON = JSON.stringify(AutoOficial_resumoCiclo_(contexto)); } catch (eResumo) { /* recalculado quando for consolidado */ } }
    let id = idPendente;
    if (id) SGO_QE_atualizar_(id, campos);
    else id = SGO_QE_registrar_(Object.assign(AutoRel_acCamposRegistro_(contexto, payload, sessao), campos));
    SGO_QE_marcarSubstituidas_(AUTOREL_MODULO_EMISSAO, numero, id);
    r.emissaoId = id;
  }
  r.revisao = revisao;
  r.aprovadoPor = aprovacao.nome;
  return r;
}

function AutoRel_acCamposRegistro_(contexto, payload, sessao) {
  return {
    MODULO: AUTOREL_MODULO_EMISSAO, NUMERO: contexto.identificacao.certificadoNumero, REVISAO: contexto.identificacao.revisao,
    CLIENTE: contexto.identificacao.cliente, CNPJ: contexto.identificacao.cnpj, TAG: contexto.identificacao.tag, RESULTADO: contexto.statusConsolidado,
    HASH_CONTEXTO: AutoRel_acAssinatura_(contexto), ENVIADO_POR: SGO_QE_nomeSessao_(sessao), ENVIADO_EM: SGO_QE_agora_(),
    JUSTIFICATIVA_ESCOPO: contexto.justificativaSemPressao || '',
    // 20/10/2026: vínculo com o cadastro (cliente, unidade e equipamento escolhidos na tela).
    CLIENTE_ID: String((payload && payload.clienteId) || ''), UNIDADE_ID: String((payload && payload.unidadeId) || ''), EQUIPAMENTO_ID: String((payload && payload.equipamentoId) || '')
  };
}

// ------------------------------------------------------------
// API — ETAPA 2: EMISSÃO PELO APROVADOR
// ------------------------------------------------------------
function AutoRel_apiMontarCertificadoFinal(payload, sessao) {
  payload = payload || {};
  if (!payload.modoRelatorioSimulado && !AutoRel_acEhAprovador_(sessao)) {
    throw new Error('A emissão precisa da aprovação do responsável técnico. Use "Enviar para aprovação": o responsável técnico confere a prévia e emite. Perfis que aprovam: ' + ((AutoRel_UCFG.EMISSAO || {}).perfisAprovadores || []).join(', ') + '.');
  }
  if (!payload.modoRelatorioSimulado && payload.confirmacaoRevisao !== true) {
    throw new Error('Marque "Conferi os dados, os critérios e os textos e aprovo a emissão" antes de emitir.');
  }
  const validado = AutoRel_acValidarParaEmissao_(payload);
  return AutoRel_acEmitir_(payload, validado, sessao, '');
}

// ------------------------------------------------------------
// API — APROVAÇÃO EM DUAS PESSOAS
// ------------------------------------------------------------
function AutoRel_apiEnviarParaAprovacao(payload, sessao) {
  payload = payload || {};
  if (payload.modoRelatorioSimulado) throw new Error('O relatório interno (dados reconstituídos) não passa por aprovação: ele não é entregue ao cliente.');
  const validado = AutoRel_acValidarParaEmissao_(payload);
  // Fotos vão para arquivos próprios (o registro guarda só o endereço).
  const fotos = (Array.isArray(payload.fotosCertificado) ? payload.fotosCertificado : []).slice(0, 4).map(function(f, i) {
    if (!f || !f.base64) return null;
    const blob = Utilities.newBlob(Utilities.base64Decode(f.base64), f.mimeType || 'image/jpeg', 'Foto ' + (i + 1) + ' - ' + (validado.contexto.identificacao.certificadoNumero || 'sem número') + '.jpg');
    const arq = AutoRel_pastaUploads_('').createFile(blob);
    return { fileId: arq.getId(), mimeType: f.mimeType || 'image/jpeg', legenda: f.legenda || '' };
  }).filter(Boolean);
  const guardado = Object.assign({}, payload, { fotosCertificado: [], fotosArquivos: fotos });
  const id = SGO_QE_registrar_(Object.assign(AutoRel_acCamposRegistro_(validado.contexto, payload, sessao), {
    STATUS: 'AGUARDANDO_APROVACAO', PAYLOAD_JSON: JSON.stringify(guardado)
  }));
  return { ok: true, id: id, mensagem: 'Enviado para aprovação do responsável técnico (registro ' + id + '). Ele confere a prévia em "Aguardando aprovação" e emite, ou devolve com o motivo.' };
}

function AutoRel_acExigirAprovador_(sessao) {
  if (!AutoRel_acEhAprovador_(sessao)) throw new Error('Somente o responsável técnico (perfis ' + ((AutoRel_UCFG.EMISSAO || {}).perfisAprovadores || []).join(', ') + ') confere e aprova documentos.');
}

function AutoRel_apiListarAprovacoes(payload, sessao) {
  const aprovador = AutoRel_acEhAprovador_(sessao);
  const nome = SGO_QE_nomeSessao_(sessao);
  // 20/10/2026: relatórios de ensaio e planilhas de dados (modelo novo) na mesma lista.
  const lista = SGO_QE_listar_(AUTOREL_MODULO_EMISSAO).concat(SGO_QE_listar_(AUTOREL_MODULO_EMISSAO_DADOS)).filter(function(r) {
    return r.STATUS === 'AGUARDANDO_APROVACAO' || (r.STATUS === 'DEVOLVIDO' && r.ENVIADO_POR === nome);
  }).filter(function(r) { return aprovador || r.ENVIADO_POR === nome; });
  return { ok: true, podeAprovar: aprovador, itens: lista.map(function(r) {
    return { id: r.ID, documento: r.MODULO === AUTOREL_MODULO_EMISSAO_DADOS ? 'Planilha de dados' : 'Relatório de ensaio', status: r.STATUS, numero: r.NUMERO, cliente: r.CLIENTE, tag: r.TAG, resultado: r.RESULTADO, enviadoPor: r.ENVIADO_POR, enviadoEm: r.ENVIADO_EM, motivoDevolucao: r.DEVOLVIDO_MOTIVO };
  }) };
}

function AutoRel_acCarregarPendente_(id) {
  const reg = SGO_QE_obter_(id);
  if (!reg || (reg.MODULO !== AUTOREL_MODULO_EMISSAO && reg.MODULO !== AUTOREL_MODULO_EMISSAO_DADOS)) throw new Error('Registro de aprovação não encontrado. Atualize a lista.');
  if (reg.STATUS !== 'AGUARDANDO_APROVACAO') throw new Error('Este registro não está aguardando aprovação (situação: ' + reg.STATUS + ').');
  const payload = JSON.parse(reg.PAYLOAD_JSON || '{}');
  payload.fotosCertificado = (payload.fotosArquivos || []).map(function(f) {
    try { return { base64: Utilities.base64Encode(DriveApp.getFileById(f.fileId).getBlob().getBytes()), mimeType: f.mimeType, legenda: f.legenda }; } catch (e) { return null; }
  }).filter(Boolean);
  return { reg: reg, payload: payload };
}

function AutoRel_apiPreverAprovacao(payload, sessao) {
  AutoRel_acExigirAprovador_(sessao);
  const p = AutoRel_acCarregarPendente_(payload && payload.id);
  if (p.reg.MODULO === AUTOREL_MODULO_EMISSAO_DADOS) return AutoRel_pdPreverPendente_(p.reg, p.payload);
  const validado = AutoRel_acValidarParaEmissao_(p.payload);
  if (AutoRel_acAssinatura_(validado.contexto) !== p.reg.HASH_CONTEXTO) throw new Error('Os dados mudaram desde o envio para aprovação (por exemplo, o cadastro do registrador). Devolva ao técnico para gerar o rascunho de novo.');
  return { ok: true, html: AutoRel_acMontarHtml_(validado.contexto, validado.interno, validado.textos, p.payload.fotosCertificado, null, true) };
}

function AutoRel_apiAprovarEmitir(payload, sessao) {
  AutoRel_acExigirAprovador_(sessao);
  payload = payload || {};
  if (payload.confirmacaoRevisao !== true) throw new Error('Marque "Conferi os dados, os critérios e os textos e aprovo a emissão" antes de aprovar.');
  const p = AutoRel_acCarregarPendente_(payload.id);
  if (p.reg.MODULO === AUTOREL_MODULO_EMISSAO_DADOS) return AutoRel_pdAprovarPendente_(p.reg, p.payload, sessao);
  const validado = AutoRel_acValidarParaEmissao_(p.payload);
  if (AutoRel_acAssinatura_(validado.contexto) !== p.reg.HASH_CONTEXTO) throw new Error('Os dados mudaram desde o envio para aprovação. Devolva ao técnico para gerar o rascunho de novo.');
  return AutoRel_acEmitir_(p.payload, validado, sessao, p.reg.ID);
}

function AutoRel_apiDevolverAprovacao(payload, sessao) {
  AutoRel_acExigirAprovador_(sessao);
  const motivo = String((payload && payload.motivo) || '').trim();
  if (motivo.length < 10) throw new Error('Escreva o motivo da devolução (ao menos 10 caracteres) para o técnico saber o que corrigir.');
  const reg = SGO_QE_obter_(payload.id);
  if (!reg || reg.STATUS !== 'AGUARDANDO_APROVACAO') throw new Error('Este registro não está aguardando aprovação.');
  SGO_QE_atualizar_(reg.ID, { STATUS: 'DEVOLVIDO', DEVOLVIDO_MOTIVO: motivo, APROVADO_POR: SGO_QE_nomeSessao_(sessao), APROVADO_EM: SGO_QE_agora_() });
  return { ok: true, mensagem: 'Devolvido ao técnico com o motivo registrado.' };
}

/** Técnico executor, responsáveis técnicos da configuração e a aprovação registrada. */
function AutoRel_acListaAssinaturas_(ctx, aprovacao) {
  const lista = [];
  const tecnico = (ctx.identificacao || {}).tecnicoExecutor;
  if (tecnico) lista.push({ papel: 'Executado por', nome: tecnico, cargo: 'Técnico executor do ensaio', registro: '' });
  (AutoRel_UCFG.ASSINATURAS_PADRAO || []).forEach(function(a, i) { lista.push(Object.assign({ papel: i === 0 ? 'Responsável técnico' : 'Responsável técnico' }, a)); });
  return lista;
}

/**
 * Gráficos do documento (SVG). Ciclo térmico: temperatura por sensor no ciclo, detalhe
 * do patamar com a faixa de esterilização, F0 acumulado por sensor, pressão da câmara com
 * a temperatura do vapor saturado (quando a pressão é analisada) e F0 final por sensor.
 * Estanqueidade: pressão na janela do teste.
 */
function AutoRel_acMontarGraficos_(ctx, resultado) {
  const figuras = [];
  try {
    const dados = resultado.dadosNormalizados || [];
    if (!dados.length) return figuras;
    const tz = AutoRel_UCFG.TZ || 'America/Sao_Paulo';

    if (ctx.tipoRelatorio === 'LEAK_TEST') {
      const a = resultado.analiseLeak || {};
      const fator = typeof AutoRel_obterFatorConversaoParaMbarLeakTest_ === 'function' ? AutoRel_obterFatorConversaoParaMbarLeakTest_(a.unidadePressaoOriginal) : 1;
      const ini = Math.max(0, (a.indiceInicio || 0) - 5), fim = Math.min(dados.length - 1, (isFinite(a.indiceFim) ? a.indiceFim : dados.length - 1) + 5);
      const fatia = dados.slice(ini, fim + 1);
      const base = SGO_DocA4_seriesTemperatura_(fatia, { tz: tz });
      const pts = [];
      fatia.forEach(function(r, i) { const p = Number(r.pressao); if (r.pressao !== null && r.pressao !== '' && isFinite(p)) pts.push([base.xDe(r, i), p * fator]); });
      const x0 = base.xDe(dados[a.indiceInicio] || fatia[0], (a.indiceInicio || 0) - ini), x1 = base.xDe(dados[a.indiceFim] || fatia[fatia.length - 1], (a.indiceFim || 0) - ini);
      const svg = SGO_DocA4_graficoLinhas_({
        series: [{ nome: 'Pressão da câmara', cor: '#1f5fa8', pontos: pts, largura: 1.6 }],
        formatarX: base.formatarX, rotuloX: 'Horário', rotuloY: 'Pressão (mbar)', casasY: 0,
        faixasX: [{ x0: x0, x1: x1, rotulo: 'Janela do teste' }]
      });
      if (svg) figuras.push({ svg: svg, legenda: 'Pressão absoluta da câmara durante o teste de estanqueidade (área sombreada: janela de cálculo da taxa de vazamento).' });
      return figuras;
    }

    const a = resultado.analise || {};
    const inicioCiclo = isFinite(a.indiceInicioCiclo) && a.indiceInicioCiclo >= 0 ? a.indiceInicioCiclo : 0;
    const fimCiclo = isFinite(a.indiceFimCiclo) && a.indiceFimCiclo >= inicioCiclo ? a.indiceFimCiclo : dados.length - 1;
    const fatia = dados.slice(inicioCiclo, fimCiclo + 1);
    const desloc = AutoRel_parseFloatSeguro_((resultado.payload || {}).offsetTemp, 0);
    const series = SGO_DocA4_seriesTemperatura_(fatia, { sensoresAtivos: resultado.sensoresAtivos, deslocamento: desloc, tz: tz, dtMin: a.deltaMinutosEstimado });
    const faixas = [];
    if (a.faseInicioExp >= 0 && a.faseFimExp >= a.faseInicioExp) {
      faixas.push({ x0: series.xDe(dados[a.faseInicioExp], a.faseInicioExp - inicioCiclo), x1: series.xDe(dados[a.faseFimExp], a.faseFimExp - inicioCiclo), rotulo: 'Exposição' });
    }
    const f = ctx.estudos[0].fatos || {};
    const ref = f.temperaturaReferencia || {};
    const referencias = [];
    if (isFinite(ref.tMin) && ref.tMin > 0) referencias.push({ y: ref.tMin, rotulo: 'Mínima de esterilização ' + SGO_DocA4_val_(ref.tMin, 1, '°C') });
    const optT = { series: series.series, formatarX: series.formatarX, rotuloX: 'Horário', rotuloY: 'Temperatura (°C)', faixasX: faixas, referencias: referencias };
    const svgT = SGO_DocA4_graficoLinhas_(optT);
    if (svgT) figuras.push({ svg: svgT, legenda: 'Temperatura registrada por sensor ativo ao longo do ciclo' +
      (faixas.length ? ' (área sombreada: fase de exposição considerada no cálculo do F0).' : '. A fase de exposição não foi identificada, por isso não há janela sombreada.') + SGO_DocA4_notaCorte_(optT, '°C') });

    // Detalhe do patamar: faixa de esterilização (verde) e limites.
    if (a.faseInicioExp >= 0 && a.faseFimExp >= a.faseInicioExp && isFinite(ref.tMin) && isFinite(ref.tMax)) {
      const i0 = Math.max(0, a.faseInicioExp - 3), i1 = Math.min(dados.length - 1, a.faseFimExp + 3);
      const fp = dados.slice(i0, i1 + 1);
      const sp = SGO_DocA4_seriesTemperatura_(fp, { sensoresAtivos: resultado.sensoresAtivos, deslocamento: desloc, tz: tz, dtMin: a.deltaMinutosEstimado });
      const svgP = SGO_DocA4_graficoLinhas_({
        series: sp.series, formatarX: function(x) { try { return Utilities.formatDate(new Date(sp.t0Ms + x * 60000), tz, 'HH:mm:ss'); } catch (e) { return SGO_DocA4_num_(x, 1); } },
        rotuloX: 'Horário', rotuloY: 'Temperatura (°C)', faixaY: { y0: ref.tMin, y1: ref.tMax },
        yMin: ref.tMin - 1.5, yMax: ref.tMax + 0.5,
        referencias: [{ y: ref.tMin, rotulo: 'Mínima ' + SGO_DocA4_val_(ref.tMin, 1, '°C') }, { y: ref.tMax, rotulo: 'Máxima ' + SGO_DocA4_val_(ref.tMax, 1, '°C') }], altura: 260
      });
      if (svgP) figuras.push({ svg: svgP, legenda: 'Detalhe da fase de exposição por sensor, com a faixa de temperatura de esterilização (área verde, de ' + SGO_DocA4_val_(ref.tMin, 1, '°C') + ' a ' + SGO_DocA4_val_(ref.tMax, 1, '°C') + ').' });
    }

    // F0 acumulado na exposição, por sensor (memória de cálculo do motor).
    if (f.exigeF0 && Array.isArray(a.memoriaF0PorSensor)) {
      const t0 = AutoRel_converterTempoLinhaParaMsAnalise_(dados[a.faseInicioExp] || dados[0]);
      const seriesF0 = [];
      a.memoriaF0PorSensor.forEach(function(mem, s) {
        if (!mem || !mem.length) return;
        seriesF0.push({ nome: 'S' + (s + 1), cor: SGO_DocA4_corSerie_(s), pontos: mem.map(function(m) { return [(m.ms - t0) / 60000, m.acumulado]; }) });
      });
      if (seriesF0.length) {
        const svgF = SGO_DocA4_graficoLinhas_({
          series: seriesF0, formatarX: function(x) { return SGO_DocA4_num_(x, 1) + ' min'; }, rotuloX: 'Tempo desde o início da exposição', rotuloY: 'F0 acumulado (min)', casasY: 0, yMin: 0,
          referencias: [{ y: f.f0MinNormativo, rotulo: 'F0 mínimo ' + SGO_DocA4_val_(f.f0MinNormativo, 2, 'min') }], altura: 250
        });
        if (svgF) figuras.push({ svg: svgF, legenda: 'F0 acumulado por sensor ao longo da exposição (regra dos trapézios com o intervalo real entre leituras), com o mínimo exigido (linha tracejada).' });
      }
    }

    if (ctx.analisarPressao !== false) {
      const ptsP = [], ptsTs = [];
      fatia.forEach(function(r, i) {
        const p = Number(r.pressao);
        if (r.pressao !== null && r.pressao !== '' && isFinite(p)) {
          ptsP.push([series.xDe(r, i), p]);
          const ts = SGO_QT_tSatVaporC_(p);
          if (ts !== null && p > 0.5) ptsTs.push([series.xDe(r, i), ts]);
        }
      });
      if (ptsP.length >= 10) {
        const svgPr = SGO_DocA4_graficoLinhas_({
          series: [{ nome: 'Pressão da câmara', cor: '#0f8b8d', pontos: ptsP, largura: 1.4 }], formatarX: series.formatarX,
          rotuloX: 'Horário', rotuloY: 'Pressão (bar abs.)', faixasX: faixas, altura: 230
        });
        if (svgPr) figuras.push({ svg: svgPr, legenda: 'Pressão absoluta da câmara ao longo do ciclo (bar). As fases de remoção de ar, exposição e secagem são identificadas por observação da curva.' });
      }
      if (ptsTs.length >= 5 && faixas.length) {
        const i0 = a.faseInicioExp, i1 = a.faseFimExp;
        const med = [], vs = [];
        for (let i = i0; i <= i1; i++) {
          const r = dados[i], x = series.xDe(r, i - inicioCiclo);
          const vals = (r.temperaturas || []).filter(function(v, s) { return resultado.sensoresAtivos[s] && v !== null && isFinite(v); }).map(function(v) { return v + desloc; });
          if (vals.length) med.push([x, vals.reduce(function(x1, y1) { return x1 + y1; }, 0) / vals.length]);
          const ts = SGO_QT_tSatVaporC_(Number(r.pressao));
          if (ts !== null && r.pressao !== null) vs.push([x, ts]);
        }
        const svgV = SGO_DocA4_graficoLinhas_({
          series: [{ nome: 'Medida (média)', cor: '#d1495b', pontos: med, largura: 1.6 }, { nome: 'Vapor saturado', cor: '#1f5fa8', pontos: vs, largura: 1.6, tracejado: true }],
          formatarX: function(xv) { try { return Utilities.formatDate(new Date(series.t0Ms + xv * 60000), tz, 'HH:mm:ss'); } catch (e) { return SGO_DocA4_num_(xv, 1); } }, rotuloX: 'Horário', rotuloY: 'Temperatura (°C)', altura: 230
        });
        if (svgV && med.length && vs.length) figuras.push({ svg: svgV, legenda: 'Fase de exposição: temperatura média medida comparada à temperatura do vapor saturado calculada pela pressão absoluta (equação de saturação IAPWS-IF97).' });
      }
    }

    if (f.exigeF0 && f.conformidadePorSensor && f.conformidadePorSensor.length) {
      const pior = f.piorSensorF0 ? f.piorSensorF0.sensor : '';
      const svgB = SGO_DocA4_graficoBarras_({
        itens: f.conformidadePorSensor.map(function(c) { return { rotulo: c.sensor, valor: Number(c.f0), destaque: c.sensor === pior }; }),
        limite: { valor: f.f0MinNormativo, rotulo: 'F0 mínimo ' + SGO_DocA4_val_(f.f0MinNormativo, 2, 'min') },
        unidade: 'F0 (min)', casas: 2
      });
      if (svgB) figuras.push({ svg: svgB, legenda: 'F0 final por sensor, comparado ao mínimo exigido (linha tracejada); o pior sensor está destacado.' });
    }
  } catch (e) {
    // Gráfico é complemento: falha aqui não impede o documento.
    figuras.push({ erro: 'Os gráficos não puderam ser montados (' + (e && e.message ? e.message : e) + '). Os resultados numéricos do documento não são afetados.' });
  }
  return figuras;
}

// ------------------------------------------------------------
// HELPERS DE RENDERIZAÇÃO (AutoclaveCertificado.html chama estas funções)
// ------------------------------------------------------------

function AutoRel_acEscaparHtml_(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Quebra texto corrido em parágrafos <p> HTML seguros (escapados). */
function AutoRel_acParagrafosHtml_(texto) {
  return SGO_DocA4_paragrafos_(texto);
}

function AutoRel_acFmtValor_(v, sufixo) {
  return SGO_DocA4_val_(v, 2, String(sufixo || '').replace(/^\s+/, ''));
}

/** Assina fatos e leituras, sem incluir textos editáveis ou fotografias. */
function AutoRel_acAssinatura_(valor) {
  const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, JSON.stringify(valor), Utilities.Charset.UTF_8);
  return digest.map(function(b) { return ('0' + ((b + 256) % 256).toString(16)).slice(-2); }).join('');
}
