/****************************************************
 * METROLABS - MÓDULO LEAK TEST / TESTE DE ESTANQUEIDADE
 * ARQUIVO: LeakTest.js (NOVO)
 *
 * FUNÇÃO:
 * Implementa o ensaio de Leak Test (validação de
 * estanqueidade/vácuo da câmara) como um tipo de relatório
 * adicional, sem alterar a lógica do ciclo térmico
 * (AnaliseCiclo.js) já existente.
 *
 * O QUE ESTE ARQUIVO FAZ:
 * - AutoRel_apiConverterLeakTest_(payload): orquestra o fluxo do
 *   Leak Test reaproveitando a ingestão de dados já
 *   existente (Parser.js) e o simulador admin
 *   (Simulador.js), chamado a partir de Main.js quando
 *   payload.tipoRelatorio === 'LEAK_TEST'.
 * - AutoRel_analisarLeakTest_(...): calcula a taxa de vazamento
 *   (mbar/min) entre o início e o fim do período
 *   informado e compara com o limite de referência
 *   definido em Config.js (AutoRel_UCFG.LEAK_TEST).
 * - Funções auxiliares de conversão de unidade, registro
 *   térmico complementar (apenas informativo) e textos
 *   técnicos (memória de cálculo / disclaimer).
 *
 * REGRA TÉCNICA (não reavaliar temperatura aqui):
 * Taxa de vazamento = |Pressão final - Pressão inicial| / tempo (min)
 * Aprovação: taxa <= AutoRel_UCFG.LEAK_TEST.limiteTaxaVazamentoMbarMin
 *
 * TERMINOLOGIA (não misturar no relatório):
 * - "Pressão Absoluta da Câmara": leitura direta do datalogger,
 *   na unidade informada pelo usuário (mbar/bar/kPa).
 * - "Vácuo Relativo": Pressão Absoluta - referência atmosférica
 *   (AutoRel_UCFG.LEAK_TEST.referenciaAtmosfericaMbar), sempre em mbar,
 *   usada apenas no gráfico de ciclo completo (atmosfera = 0).
 *
 * Reaproveita funções globais já existentes:
 * - AutoRel_lerDadosEntradaRich_ / AutoRel_normalizarMatrizParaAnalise (Parser.js)
 * - AutoRel_gerarDadosSimuladosAdmin_ (Simulador.js)
 * - AutoRel_localizarIndicePorTempo_ / AutoRel_calcularDiferencaTempo /
 *   AutoRel_parseFloatSeguroAnalise_ / AutoRel_roundAnalise_ /
 *   AutoRel_normalizarSensoresAtivos_ (AnaliseCiclo.js)
 * - AutoRel_clampIntSeguro_ / AutoRel_normalizarSensoresAtivosMain_ (Main.js)
 * - AutoRel_construirLinkPdfPaisagem (Main.js)
 ****************************************************/

// ------------------------------------------------------------
// ORQUESTRADOR DO LEAK TEST (chamado por AutoRel_apiConverter em Main.js)
// ------------------------------------------------------------
/**
 * Pipeline reaproveitável do Leak Test: leitura + normalização + análise.
 * Compartilhado pelo laudo em Planilha (AutoRel_apiConverterLeakTest_) e
 * pela Interpretação Técnica do Ensaio (AutoRel_CertificadoRelatorio.js).
 */
function AutoRel_acExecutarAnaliseLeakTestCompleta_(payload) {
  payload = payload || {};

  const nSensores = AutoRel_clampIntSeguro_(payload.nSensores, 1, 60, AutoRel_UCFG.DEFAULT_N || 12);
  const dateStyle = String(payload.dateStyle || AutoRel_UCFG.DEFAULT_DATE_STYLE || 'AUTO').toUpperCase().trim();
  const sensoresAtivos = AutoRel_normalizarSensoresAtivosMain_(payload.sensoresAtivos, nSensores);
  const modoEntradaNormalizado = String(payload.modoEntrada || 'FILE_ID').toUpperCase().trim();

  let dadosNormalizados = null;

  if (modoEntradaNormalizado === 'LEAK_TEST_RECONSTITUIDO') {
    dadosNormalizados = AutoRel_gerarDadosSimuladosLeakTest_(payload, { converter: true });
  } else if (modoEntradaNormalizado === 'SIMULADO_ADMIN') {
    dadosNormalizados = AutoRel_gerarDadosSimuladosAdmin_(payload, { converter: true });
  } else {
    const rich = AutoRel_lerDadosEntradaRich_(payload);
    if (!rich || !rich.matrix || !rich.matrix.length) {
      throw new Error('Não foi possível ler os dados de entrada do teste de estanqueidade.');
    }

    dadosNormalizados = AutoRel_normalizarMatrizParaAnalise(
      rich.matrix,
      rich.displayMatrix,
      nSensores,
      dateStyle
    );
  }

  if (!dadosNormalizados || !dadosNormalizados.length) {
    throw new Error('Não foi possível normalizar os dados para o teste de estanqueidade.');
  }

  const analiseLeak = AutoRel_analisarLeakTest_(dadosNormalizados, payload, {
    sensoresAtivos: sensoresAtivos,
    nSensores: nSensores
  });

  return {
    payload: payload,
    nSensores: nSensores,
    sensoresAtivos: sensoresAtivos,
    dadosNormalizados: dadosNormalizados,
    analiseLeak: analiseLeak
  };
}

function AutoRel_apiConverterLeakTest_(payload) {
  const pipeline = AutoRel_acExecutarAnaliseLeakTestCompleta_(payload);
  payload = pipeline.payload;
  const nSensores = pipeline.nSensores;
  const dadosNormalizados = pipeline.dadosNormalizados;
  const analiseLeak = pipeline.analiseLeak;

  const infoPlanilha = AutoRel_gerarPlanilhaLeakTest_(dadosNormalizados, analiseLeak, payload);
  if (!infoPlanilha || !infoPlanilha.spreadsheetId) {
    throw new Error('Falha ao gerar a planilha do teste de estanqueidade.');
  }

  const ss = SpreadsheetApp.openById(infoPlanilha.spreadsheetId);
  AutoRel_gerarGraficosLeakTest_(ss, analiseLeak, nSensores);
  SpreadsheetApp.flush();

  const pdfUrl = AutoRel_construirLinkPdfPaisagem(infoPlanilha.spreadsheetId);
  // Regra do dono: o PDF da planilha (relatório de dados) também fica na pasta do cliente. Nunca lança.
  const salvoPlanilha = SGO_DocSalvar_salvarPdfPlanilha_(pdfUrl, payload, function() {
    return SGO_DocSalvar_pastaPersistente_('AUTOREL_LAUDOS_FOLDER_ID', 'Autoclave - Laudos', AutoRel_UCFG.LAUDOS_FOLDER_ID);
  }, 'Relatório de dados Autoclave - estanqueidade', AutoRel_UCFG.TZ);

  return {
    ok: true,
    tipoRelatorio: 'LEAK_TEST',
    aprovado: !!analiseLeak.aprovado,
    statusAprovacao: analiseLeak.statusAprovacao,
    spreadsheetId: infoPlanilha.spreadsheetId,
    spreadsheetUrl: infoPlanilha.spreadsheetUrl || ss.getUrl(),
    pdfUrl: pdfUrl,
    salvoNaPasta: salvoPlanilha.salvoNaPasta,
    pdfId: salvoPlanilha.pdfId,
    pdfSalvoUrl: salvoPlanilha.pdfSalvoUrl,
    pdfNome: salvoPlanilha.pdfNome,
    pastaUrl: salvoPlanilha.pastaUrl,
    avisoSalvar: salvoPlanilha.avisoSalvar,
    leakTestResumo: {
      tempoInicioLeakTest: analiseLeak.tempoInicioLeakTest,
      tempoFimLeakTest: analiseLeak.tempoFimLeakTest,
      tempoDecorridoMinutos: analiseLeak.tempoDecorridoMinutos,
      unidadePressaoOriginal: analiseLeak.unidadePressaoOriginal,
      pressaoInicioMbar: analiseLeak.pressaoInicioMbar,
      pressaoFimMbar: analiseLeak.pressaoFimMbar,
      deltaPressaoMbar: analiseLeak.deltaPressaoMbar,
      taxaVazamentoMbarMin: analiseLeak.taxaVazamentoMbarMin,
      limiteTaxaVazamentoMbarMin: analiseLeak.limiteTaxaVazamentoMbarMin,
      motivosReprovacao: analiseLeak.motivosReprovacao,
      observacoesAnalise: analiseLeak.observacoesAnalise,
      alertasAnalise: analiseLeak.alertasAnalise
    }
  };
}

// ------------------------------------------------------------
// SIMULADOR DEDICADO DO LEAK TEST (RELATÓRIO INTERNO / ADMIN)
//
// Independente do simulador do ciclo térmico (Simulador.js,
// AutoRel_gerarDadosSimuladosAdmin_), que não é alterado por esta função.
// Pede apenas início/fim do Leak Test (já preenchidos na tela),
// temperatura da câmara e senha administrativa, e gera uma curva
// sintética de pressão (mbar) e temperatura entre esses horários.
//
// Reaproveita apenas helpers genéricos já existentes em
// Simulador.js (AutoRel_validarSenhaSimuladorAdmin_, AutoRel_parseDataHoraSimulador_,
// AutoRel_criarRandomSimulador_, AutoRel_roundSimulador_), sem modificá-los.
// ------------------------------------------------------------
function AutoRel_gerarDadosSimuladosLeakTest_(payload, options) {
  payload = payload || {};
  options = options || {};

  const sim = payload.leakTestSimulado || {};
  AutoRel_validarSenhaSimuladorAdmin_(sim.senha);

  const nSensores = AutoRel_clampIntSeguro_(payload.nSensores, 1, 60, AutoRel_UCFG.DEFAULT_N || 12);
  const temperatura = AutoRel_parseFloatSeguroAnalise_(sim.temperatura, 25.0);

  const leakIn = payload.leakTest || {};
  const inicio = AutoRel_parseDataHoraSimulador_(leakIn.inicio);
  const fim = AutoRel_parseDataHoraSimulador_(leakIn.fim);

  if (!inicio || !fim) {
    throw new Error('Informe data/hora válidas de início e fim do teste de estanqueidade para gerar o relatório interno.');
  }

  if (fim.getTime() <= inicio.getTime()) {
    throw new Error('O horário de fim do teste de estanqueidade deve ser posterior ao horário de início.');
  }

  const totalSeg = Math.round((fim.getTime() - inicio.getTime()) / 1000);
  if (totalSeg < 60) {
    throw new Error('O teste de estanqueidade do relatório interno deve ter pelo menos 1 minuto de duração.');
  }

  const intervaloSeg = totalSeg >= 300 ? 30 : Math.max(5, Math.floor(totalSeg / 8));

  const seedBase = AutoRel_sementeSimulacaoDeterministica_(Object.assign({}, payload, { leakTest: { inicio: inicio.getTime(), fim: fim.getTime(), unidadePressao: 'MBAR' } }), sim, 'LeakTest');
  const rand = AutoRel_criarRandomSimulador_(seedBase);

  const pressaoInicialMbar = 40 + rand() * 30; // câmara em vácuo, 40 a 70 mbar

  const cfgLeak = (AutoRel_UCFG && AutoRel_UCFG.LEAK_TEST) ? AutoRel_UCFG.LEAK_TEST : { limiteTaxaVazamentoMbarMin: 1.3 };
  const limiteTaxa = AutoRel_parseFloatSeguroAnalise_(cfgLeak.limiteTaxaVazamentoMbarMin, 1.3);
  const resultadoDesejado = String(sim.resultadoDesejado || 'ALEATORIO').toUpperCase().trim();

  let taxaVazamentoMbarMin;
  if (resultadoDesejado === 'APROVADO') {
    // fica confortavelmente abaixo do limite de referência
    taxaVazamentoMbarMin = 0.05 + rand() * (limiteTaxa * 0.85 - 0.05);
  } else if (resultadoDesejado === 'REPROVADO') {
    // fica confortavelmente acima do limite de referência
    taxaVazamentoMbarMin = (limiteTaxa * 1.15) + rand() * (limiteTaxa * 1.5);
  } else {
    taxaVazamentoMbarMin = 0.1 + rand() * 2.5; // aleatório, varia entre casos aprovados e reprovados
  }

  const sensorOffsets = [];
  for (let s = 0; s < nSensores; s++) {
    sensorOffsets.push((rand() - 0.5) * 0.6);
  }

  const rows = [];
  for (let seg = 0, idx = 0; seg <= totalSeg; seg += intervaloSeg, idx++) {
    const d = new Date(inicio.getTime() + seg * 1000);
    const minutos = seg / 60;
    const pressao = pressaoInicialMbar + taxaVazamentoMbarMin * minutos + Math.sin(idx / 4) * 0.05;

    const temperaturas = sensorOffsets.map(function(o) {
      return AutoRel_roundSimulador_(temperatura + o + Math.sin(idx / 7) * 0.08, 2);
    });

    rows.push({
      tempoStr: Utilities.formatDate(d, AutoRel_UCFG.TZ, 'dd/MM/yyyy HH:mm:ss'),
      tempoDate: d,
      temperaturas: temperaturas,
      pressao: AutoRel_roundSimulador_(pressao, 3)
    });
  }

  // Garante casamento exato com a busca de horários feita por AutoRel_analisarLeakTest_.
  payload.leakTest = payload.leakTest || {};
  payload.leakTest.inicio = rows[0].tempoStr;
  payload.leakTest.fim = rows[rows.length - 1].tempoStr;
  payload.leakTest.unidadePressao = 'MBAR';

  payload.modoRelatorioSimulado = true;
  payload._simulacaoMeta = {
    origem: 'ANALISE_MANUAL_RECONSTITUIDA',
    geradoEm: Utilities.formatDate(new Date(), AutoRel_UCFG.TZ, 'dd/MM/yyyy HH:mm:ss'),
    operador: String(payload.operador || '').trim(),
    temperaturaAlvo: temperatura,
    linhasGeradas: rows.length
  };

  return rows;
}

// ------------------------------------------------------------
// ANÁLISE TÉCNICA DO LEAK TEST
// ------------------------------------------------------------
function AutoRel_analisarLeakTest_(dados, payload, opcoes) {
  if (!dados || !dados.length) {
    throw new Error('Nenhum dado normalizado foi recebido para o teste de estanqueidade.');
  }

  payload = payload || {};
  opcoes = opcoes || {};

  const nSensores = Number(opcoes.nSensores) ||
    (Array.isArray(dados[0].temperaturas) ? dados[0].temperaturas.length : 0);

  const leakIn = payload.leakTest || {};
  const inicioStr = String(leakIn.inicio || '').trim();
  const fimStr = String(leakIn.fim || '').trim();

  if (!inicioStr || !fimStr) {
    throw new Error('Informe a hora de início e a hora de fim do teste de estanqueidade.');
  }

  const idxInicio = AutoRel_localizarIndicePorTempo_(dados, inicioStr, '>=', null);
  const idxFim = AutoRel_localizarIndicePorTempo_(dados, fimStr, '<=', null);

  if (idxInicio === null || idxFim === null) {
    throw new Error('Não foi possível localizar os horários informados do teste de estanqueidade dentro dos dados importados do datalogger.');
  }

  if (idxFim <= idxInicio) {
    throw new Error('O horário de fim do teste de estanqueidade deve ser posterior ao horário de início e conter ao menos uma leitura entre eles.');
  }

  const linhaInicio = dados[idxInicio];
  const linhaFim = dados[idxFim];

  const pressaoInicioBruta = AutoRel_parseFloatSeguroAnalise_(linhaInicio.pressao, null);
  const pressaoFimBruta = AutoRel_parseFloatSeguroAnalise_(linhaFim.pressao, null);

  if (pressaoInicioBruta === null || pressaoFimBruta === null) {
    throw new Error('Não foi possível obter leituras de pressão válidas nos horários informados do teste de estanqueidade.');
  }

  const unidade = String(leakIn.unidadePressao || (AutoRel_UCFG.LEAK_TEST && AutoRel_UCFG.LEAK_TEST.unidadePressaoPadrao) || 'MBAR').toUpperCase().trim();
  const fatorParaMbar = AutoRel_obterFatorConversaoParaMbarLeakTest_(unidade);

  const pressaoInicioMbar = pressaoInicioBruta * fatorParaMbar;
  const pressaoFimMbar = pressaoFimBruta * fatorParaMbar;

  const tempoMinutos = AutoRel_calcularDiferencaTempo(
    linhaInicio.tempoStr,
    linhaFim.tempoStr,
    linhaInicio.tempoDate,
    linhaFim.tempoDate
  );

  if (!tempoMinutos || tempoMinutos <= 0) {
    throw new Error('A duração calculada do teste de estanqueidade é inválida. Verifique os horários informados.');
  }

  const deltaPressaoMbar = Math.abs(pressaoFimMbar - pressaoInicioMbar);
  const taxaVazamentoMbarMin = AutoRel_roundAnalise_(deltaPressaoMbar / tempoMinutos, 4);

  const cfgLeak = (AutoRel_UCFG && AutoRel_UCFG.LEAK_TEST) ? AutoRel_UCFG.LEAK_TEST : { limiteTaxaVazamentoMbarMin: 1.3 };
  const limite = AutoRel_parseFloatSeguroAnalise_(cfgLeak.limiteTaxaVazamentoMbarMin, 1.3);
  const normaReferencia = cfgLeak.normaReferencia || 'Prática técnica baseada na EN 285 para esterilizadores a vapor de grande porte';

  const aprovado = taxaVazamentoMbarMin <= limite;
  const statusAprovacao = aprovado ? 'APROVADO' : 'REPROVADO';

  const sensoresAtivos = AutoRel_normalizarSensoresAtivos_(opcoes.sensoresAtivos, nSensores);
  const registroTermico = AutoRel_calcularRegistroTermicoLeakTest_(dados, idxInicio, idxFim, sensoresAtivos, nSensores);
  const estabilidadeCurva = AutoRel_avaliarEstabilidadeCurvaLeakTest_(dados, idxInicio, idxFim, fatorParaMbar);
  const contextoRegistro = AutoRel_avaliarContextoRegistroLeakTest_(dados, idxInicio, idxFim);

  const motivosReprovacao = [];
  if (!aprovado) {
    motivosReprovacao.push(
      'Taxa de vazamento obtida (' + SGO_DocA4_num_(taxaVazamentoMbarMin, 3) + ' mbar/min) acima do limite de referência (' +
      SGO_DocA4_num_(limite, 3) + ' mbar/min).'
    );
  }

  const observacoesAnalise = [
    'A avaliação de aprovação/reprovação do teste de estanqueidade considera exclusivamente a taxa de vazamento calculada a partir da pressão absoluta da câmara no intervalo informado.'
  ];

  const alertasAnalise = [];
  if (unidade === 'MBAR' && pressaoInicioBruta < 15 && pressaoFimBruta < 15) {
    alertasAnalise.push(
      'A pressão informada em mbar resultou em um valor muito baixo (' + SGO_DocA4_num_(pressaoInicioMbar, 3) + ' a ' +
      SGO_DocA4_num_(pressaoFimMbar, 3) + ' mbar). Confirme se a unidade de pressão do datalogger foi selecionada ' +
      'corretamente: muitos dataloggers de autoclave exportam a leitura em bar (ex.: 1,013), não em mbar, o que ' +
      'distorceria a taxa de vazamento calculada.'
    );
  }

  const memoriaCalculo = AutoRel_montarMemoriaCalculoLeakTest_({
    pressaoInicioMbar: pressaoInicioMbar,
    pressaoFimMbar: pressaoFimMbar,
    deltaPressaoMbar: deltaPressaoMbar,
    tempoMinutos: tempoMinutos,
    taxaVazamento: taxaVazamentoMbarMin,
    limite: limite,
    norma: normaReferencia,
    tempoInicio: linhaInicio.tempoStr,
    tempoFim: linhaFim.tempoStr,
    statusAprovacao: statusAprovacao
  });

  return {
    tipoRelatorio: 'LEAK_TEST',
    statusAprovacao: statusAprovacao,
    aprovado: aprovado,

    indiceInicio: idxInicio,
    indiceFim: idxFim,
    tempoInicioLeakTest: linhaInicio.tempoStr,
    tempoFimLeakTest: linhaFim.tempoStr,
    tempoDecorridoMinutos: AutoRel_roundAnalise_(tempoMinutos, 2),

    unidadePressaoOriginal: unidade,
    pressaoInicioOriginal: AutoRel_roundAnalise_(pressaoInicioBruta, 4),
    pressaoFimOriginal: AutoRel_roundAnalise_(pressaoFimBruta, 4),
    pressaoInicioMbar: AutoRel_roundAnalise_(pressaoInicioMbar, 3),
    pressaoFimMbar: AutoRel_roundAnalise_(pressaoFimMbar, 3),
    deltaPressaoMbar: AutoRel_roundAnalise_(deltaPressaoMbar, 3),
    taxaVazamentoMbarMin: taxaVazamentoMbarMin,
    limiteTaxaVazamentoMbarMin: limite,
    normaReferencia: normaReferencia,

    quantidadeSensoresInstalados: nSensores,
    registroTermico: registroTermico,
    estabilidadeCurva: estabilidadeCurva,
    contextoRegistro: contextoRegistro,

    memoriaCalculo: memoriaCalculo,
    textoDisclaimerTermico: AutoRel_montarDisclaimerTermicoLeakTest_(),

    motivosReprovacao: motivosReprovacao,
    observacoesAnalise: observacoesAnalise,
    alertasAnalise: alertasAnalise
  };
}

// ------------------------------------------------------------
// CONVERSÃO DE UNIDADE DE PRESSÃO PARA MBAR
// ------------------------------------------------------------
function AutoRel_obterFatorConversaoParaMbarLeakTest_(unidade) {
  switch (String(unidade || 'MBAR').toUpperCase().trim()) {
    case 'BAR':
      return 1000;
    case 'KPA':
      return 10;
    case 'MBAR':
    default:
      return 1;
  }
}

// ------------------------------------------------------------
// REGISTRO TÉRMICO COMPLEMENTAR (NÃO INTERFERE NA APROVAÇÃO)
// ------------------------------------------------------------
function AutoRel_calcularRegistroTermicoLeakTest_(dados, idxInicio, idxFim, sensoresAtivos, nSensores) {
  const porSensor = [];
  let globalMin = null;
  let globalMax = null;
  let somaGlobal = 0;
  let countGlobal = 0;

  for (let s = 0; s < nSensores; s++) {
    const ativo = !!sensoresAtivos[s];
    let min = null;
    let max = null;
    let soma = 0;
    let count = 0;

    if (ativo) {
      for (let i = idxInicio; i <= idxFim; i++) {
        const linha = dados[i];
        const t = AutoRel_parseFloatSeguroAnalise_(linha && linha.temperaturas ? linha.temperaturas[s] : null, null);
        if (t === null || !isFinite(t)) continue;

        if (min === null || t < min) min = t;
        if (max === null || t > max) max = t;
        soma += t;
        count++;

        if (globalMin === null || t < globalMin) globalMin = t;
        if (globalMax === null || t > globalMax) globalMax = t;
        somaGlobal += t;
        countGlobal++;
      }
    }

    porSensor.push({
      sensor: 'S' + (s + 1),
      ativo: ativo,
      min: min !== null ? AutoRel_roundAnalise_(min, 2) : null,
      max: max !== null ? AutoRel_roundAnalise_(max, 2) : null,
      media: count ? AutoRel_roundAnalise_(soma / count, 2) : null
    });
  }

  return {
    porSensor: porSensor,
    sensoresUtilizados: porSensor.filter(function(s) { return s.ativo; }).map(function(s) { return s.sensor; }),
    sensoresDesabilitados: porSensor.filter(function(s) { return !s.ativo; }).map(function(s) { return s.sensor; }),
    global: {
      min: globalMin !== null ? AutoRel_roundAnalise_(globalMin, 2) : null,
      max: globalMax !== null ? AutoRel_roundAnalise_(globalMax, 2) : null,
      media: countGlobal ? AutoRel_roundAnalise_(somaGlobal / countGlobal, 2) : null
    }
  };
}

// ------------------------------------------------------------
// ESTABILIDADE DA CURVA DE PRESSÃO NO INTERVALO DO LEAK TEST
// (informativo, não interfere na aprovação — usado só para
// enriquecer o parecer técnico com uma leitura da forma da curva)
// ------------------------------------------------------------
function AutoRel_avaliarEstabilidadeCurvaLeakTest_(dados, idxInicio, idxFim, fatorParaMbar) {
  fatorParaMbar = fatorParaMbar || 1;

  const deltasMbar = [];
  for (let i = idxInicio; i < idxFim; i++) {
    const p1 = AutoRel_parseFloatSeguroAnalise_(dados[i] && dados[i].pressao, null);
    const p2 = AutoRel_parseFloatSeguroAnalise_(dados[i + 1] && dados[i + 1].pressao, null);
    if (p1 === null || p2 === null) continue;
    deltasMbar.push((p2 - p1) * fatorParaMbar);
  }

  if (!deltasMbar.length) {
    return { tendencia: 'INDEFINIDA', estabilidade: 'INDEFINIDA', percentualConsistente: 0, amplitudeMaxContraTendencia: 0 };
  }

  const somaDeltas = deltasMbar.reduce(function(a, b) { return a + b; }, 0);
  const tendencia = somaDeltas > 0.005 ? 'ELEVACAO' : (somaDeltas < -0.005 ? 'QUEDA' : 'ESTAVEL');

  let consistentes = 0;
  let amplitudeMaxContraTendencia = 0;

  deltasMbar.forEach(function(d) {
    const mesmoSentido = tendencia === 'ELEVACAO' ? (d >= -0.01) : (tendencia === 'QUEDA' ? (d <= 0.01) : (Math.abs(d) <= 0.05));
    if (mesmoSentido) {
      consistentes++;
    } else {
      amplitudeMaxContraTendencia = Math.max(amplitudeMaxContraTendencia, Math.abs(d));
    }
  });

  const percentualConsistente = AutoRel_roundAnalise_(consistentes / deltasMbar.length, 3);
  const estabilidade = percentualConsistente >= 0.75 ? 'ESTAVEL' : 'IRREGULAR';

  return {
    tendencia: tendencia,
    estabilidade: estabilidade,
    percentualConsistente: percentualConsistente,
    amplitudeMaxContraTendencia: AutoRel_roundAnalise_(amplitudeMaxContraTendencia, 3)
  };
}

// ------------------------------------------------------------
// CONTEXTO DO REGISTRO: detecta se o datalogger tem leituras
// suficientes ANTES e DEPOIS da janela do Leak Test para
// caracterizar rampa de formação de vácuo e retorno à atmosfera,
// ou se o registro contém apenas o intervalo monitorado. Usado
// só para adaptar título/texto do gráfico de ciclo completo -
// não interfere na análise nem no cálculo da taxa de vazamento.
// ------------------------------------------------------------
function AutoRel_avaliarContextoRegistroLeakTest_(dados, idxInicio, idxFim) {
  const margemMinimaLeituras = 3;
  const temRampaAntes = idxInicio >= margemMinimaLeituras;
  const temRampaDepois = (dados.length - 1 - idxFim) >= margemMinimaLeituras;

  return {
    temRampaAntes: temRampaAntes,
    temRampaDepois: temRampaDepois,
    temRegistroCompleto: temRampaAntes && temRampaDepois
  };
}

// ------------------------------------------------------------
// TEXTOS TÉCNICOS: MEMÓRIA DE CÁLCULO E DISCLAIMER TÉRMICO
// ------------------------------------------------------------
function AutoRel_montarMemoriaCalculoLeakTest_(ctx) {
  ctx = ctx || {};

  return [
    'MEMÓRIA DE CÁLCULO DA TAXA DE VAZAMENTO',
    '',
    'Pressão Absoluta da Câmara - início (P1): ' + SGO_DocA4_num_(Number(ctx.pressaoInicioMbar), 3) + ' mbar, registrada em ' + (ctx.tempoInicio || '-') + '.',
    'Pressão Absoluta da Câmara - fim (P2): ' + SGO_DocA4_num_(Number(ctx.pressaoFimMbar), 3) + ' mbar, registrada em ' + (ctx.tempoFim || '-') + '.',
    'Variação de pressão (ΔP): |P2 - P1| = ' + SGO_DocA4_num_(Number(ctx.deltaPressaoMbar), 3) + ' mbar.',
    'Tempo decorrido: T = ' + SGO_DocA4_num_(Number(ctx.tempoMinutos), 2) + ' minutos.',
    '',
    'Taxa de vazamento = ΔP / T = ' +
      SGO_DocA4_num_(Number(ctx.deltaPressaoMbar), 3) + ' / ' + SGO_DocA4_num_(Number(ctx.tempoMinutos), 2) +
      ' = ' + SGO_DocA4_num_(Number(ctx.taxaVazamento), 4) + ' mbar/min.',
    '',
    'Critério de referência: taxa de vazamento ≤ ' + SGO_DocA4_num_(Number(ctx.limite), 2) + ' mbar/min (' + (ctx.norma || '-') + ').',
    '',
    'Resultado obtido: ' + SGO_DocA4_num_(Number(ctx.taxaVazamento), 4) + ' mbar/min → ' + (ctx.statusAprovacao || '-') + '.'
  ].join('\n');
}

function AutoRel_montarDisclaimerTermicoLeakTest_() {
  return 'ACOMPANHAMENTO TÉRMICO COMPLEMENTAR: os valores de temperatura registrados pelos sensores durante o teste de estanqueidade são ' +
    'apresentados exclusivamente como registro técnico complementar do ensaio, sem interferência no critério de aceitação. ' +
    'A avaliação de aprovação/reprovação deste ensaio considera unicamente a taxa de vazamento calculada a partir da ' +
    'Pressão Absoluta da Câmara (ΔP / tempo) no intervalo informado.';
}
