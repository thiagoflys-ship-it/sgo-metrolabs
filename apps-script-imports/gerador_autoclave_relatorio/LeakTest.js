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
 * - apiConverterLeakTest_(payload): orquestra o fluxo do
 *   Leak Test reaproveitando a ingestão de dados já
 *   existente (Parser.js) e o simulador admin
 *   (Simulador.js), chamado a partir de Main.js quando
 *   payload.tipoRelatorio === 'LEAK_TEST'.
 * - analisarLeakTest_(...): calcula a taxa de vazamento
 *   (mbar/min) entre o início e o fim do período
 *   informado e compara com o limite de referência
 *   definido em Config.js (UCFG.LEAK_TEST).
 * - Funções auxiliares de conversão de unidade, registro
 *   térmico complementar (apenas informativo) e textos
 *   técnicos (memória de cálculo / disclaimer).
 *
 * REGRA TÉCNICA (não reavaliar temperatura aqui):
 * Taxa de vazamento = |Pressão final - Pressão inicial| / tempo (min)
 * Aprovação: taxa <= UCFG.LEAK_TEST.limiteTaxaVazamentoMbarMin
 *
 * TERMINOLOGIA (não misturar no relatório):
 * - "Pressão Absoluta da Câmara": leitura direta do datalogger,
 *   na unidade informada pelo usuário (mbar/bar/kPa).
 * - "Vácuo Relativo": Pressão Absoluta - referência atmosférica
 *   (UCFG.LEAK_TEST.referenciaAtmosfericaMbar), sempre em mbar,
 *   usada apenas no gráfico de ciclo completo (atmosfera = 0).
 *
 * Reaproveita funções globais já existentes:
 * - lerDadosEntradaRich_ / normalizarMatrizParaAnalise (Parser.js)
 * - gerarDadosSimuladosAdmin_ (Simulador.js)
 * - localizarIndicePorTempo_ / calcularDiferencaTempo /
 *   parseFloatSeguroAnalise_ / roundAnalise_ /
 *   normalizarSensoresAtivos_ (AnaliseCiclo.js)
 * - clampIntSeguro_ / normalizarSensoresAtivosMain_ (Main.js)
 * - construirLinkPdfPaisagem (Main.js)
 ****************************************************/

// ------------------------------------------------------------
// ORQUESTRADOR DO LEAK TEST (chamado por apiConverter em Main.js)
// ------------------------------------------------------------
/**
 * Pipeline reaproveitável do Leak Test: leitura + normalização + análise.
 * Compartilhado pelo laudo em Planilha (apiConverterLeakTest_) e pelo
 * Certificado em HTML (CertificadoRelatorio.js) — mesma motivação de
 * acExecutarAnaliseCompleta_ (Main.js) para o ciclo térmico.
 */
function acExecutarAnaliseLeakTestCompleta_(payload) {
  payload = payload || {};

  const nSensores = clampIntSeguro_(payload.nSensores, 1, 60, UCFG.DEFAULT_N || 12);
  const dateStyle = String(payload.dateStyle || UCFG.DEFAULT_DATE_STYLE || 'AUTO').toUpperCase().trim();
  const sensoresAtivos = normalizarSensoresAtivosMain_(payload.sensoresAtivos, nSensores);
  const modoEntradaNormalizado = String(payload.modoEntrada || 'FILE_ID').toUpperCase().trim();

  let dadosNormalizados = null;

  if (modoEntradaNormalizado === 'LEAK_TEST_RECONSTITUIDO') {
    dadosNormalizados = gerarDadosSimuladosLeakTest_(payload, { converter: true });
  } else if (modoEntradaNormalizado === 'SIMULADO_ADMIN') {
    dadosNormalizados = gerarDadosSimuladosAdmin_(payload, { converter: true });
  } else {
    const rich = lerDadosEntradaRich_(payload);
    if (!rich || !rich.matrix || !rich.matrix.length) {
      throw new Error('Não foi possível ler os dados de entrada do Leak Test.');
    }

    dadosNormalizados = normalizarMatrizParaAnalise(
      rich.matrix,
      rich.displayMatrix,
      nSensores,
      dateStyle
    );
  }

  if (!dadosNormalizados || !dadosNormalizados.length) {
    throw new Error('Não foi possível normalizar os dados para o Leak Test.');
  }

  const analiseLeak = analisarLeakTest_(dadosNormalizados, payload, {
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

function apiConverterLeakTest_(payload) {
  const pipeline = acExecutarAnaliseLeakTestCompleta_(payload);
  payload = pipeline.payload;
  const nSensores = pipeline.nSensores;
  const dadosNormalizados = pipeline.dadosNormalizados;
  const analiseLeak = pipeline.analiseLeak;

  const infoPlanilha = gerarPlanilhaLeakTest_(dadosNormalizados, analiseLeak, payload);
  if (!infoPlanilha || !infoPlanilha.spreadsheetId) {
    throw new Error('Falha ao gerar a planilha do Leak Test.');
  }

  const ss = SpreadsheetApp.openById(infoPlanilha.spreadsheetId);
  gerarGraficosLeakTest_(ss, analiseLeak, nSensores);
  SpreadsheetApp.flush();

  const pdfUrl = construirLinkPdfPaisagem(infoPlanilha.spreadsheetId);

  return {
    ok: true,
    tipoRelatorio: 'LEAK_TEST',
    aprovado: !!analiseLeak.aprovado,
    statusAprovacao: analiseLeak.statusAprovacao,
    spreadsheetId: infoPlanilha.spreadsheetId,
    spreadsheetUrl: infoPlanilha.spreadsheetUrl || ss.getUrl(),
    pdfUrl: pdfUrl,
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
// gerarDadosSimuladosAdmin_), que não é alterado por esta função.
// Pede apenas início/fim do Leak Test (já preenchidos na tela),
// temperatura da câmara e senha administrativa, e gera uma curva
// sintética de pressão (mbar) e temperatura entre esses horários.
//
// Reaproveita apenas helpers genéricos já existentes em
// Simulador.js (validarSenhaSimuladorAdmin_, parseDataHoraSimulador_,
// criarRandomSimulador_, roundSimulador_), sem modificá-los.
// ------------------------------------------------------------
function gerarDadosSimuladosLeakTest_(payload, options) {
  payload = payload || {};
  options = options || {};

  const sim = payload.leakTestSimulado || {};
  validarSenhaSimuladorAdmin_(sim.senha);

  const nSensores = clampIntSeguro_(payload.nSensores, 1, 60, UCFG.DEFAULT_N || 12);
  const temperatura = parseFloatSeguroAnalise_(sim.temperatura, 25.0);

  const leakIn = payload.leakTest || {};
  const inicio = parseDataHoraSimulador_(leakIn.inicio);
  const fim = parseDataHoraSimulador_(leakIn.fim);

  if (!inicio || !fim) {
    throw new Error('Informe data/hora válidas de início e fim do Leak Test para gerar o relatório interno.');
  }

  if (fim.getTime() <= inicio.getTime()) {
    throw new Error('O horário de fim do Leak Test deve ser posterior ao horário de início.');
  }

  const totalSeg = Math.round((fim.getTime() - inicio.getTime()) / 1000);
  if (totalSeg < 60) {
    throw new Error('O Leak Test do relatório interno deve ter pelo menos 1 minuto de duração.');
  }

  const intervaloSeg = totalSeg >= 300 ? 30 : Math.max(5, Math.floor(totalSeg / 8));

  const seedBase = [
    Utilities.getUuid(),
    new Date().getTime(),
    leakIn.inicio,
    leakIn.fim,
    temperatura,
    nSensores,
    payload.cliente,
    payload.tag
  ].join('|');
  const rand = criarRandomSimulador_(seedBase);

  const pressaoInicialMbar = 40 + rand() * 30; // câmara em vácuo, 40 a 70 mbar

  const cfgLeak = (UCFG && UCFG.LEAK_TEST) ? UCFG.LEAK_TEST : { limiteTaxaVazamentoMbarMin: 1.3 };
  const limiteTaxa = parseFloatSeguroAnalise_(cfgLeak.limiteTaxaVazamentoMbarMin, 1.3);
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
      return roundSimulador_(temperatura + o + Math.sin(idx / 7) * 0.08, 2);
    });

    rows.push({
      tempoStr: Utilities.formatDate(d, UCFG.TZ, 'dd/MM/yyyy HH:mm:ss'),
      tempoDate: d,
      temperaturas: temperaturas,
      pressao: roundSimulador_(pressao, 3)
    });
  }

  // Garante casamento exato com a busca de horários feita por analisarLeakTest_.
  payload.leakTest = payload.leakTest || {};
  payload.leakTest.inicio = rows[0].tempoStr;
  payload.leakTest.fim = rows[rows.length - 1].tempoStr;
  payload.leakTest.unidadePressao = 'MBAR';

  payload.modoRelatorioSimulado = true;
  payload._simulacaoMeta = {
    origem: 'ANALISE_MANUAL_RECONSTITUIDA',
    geradoEm: Utilities.formatDate(new Date(), UCFG.TZ, 'dd/MM/yyyy HH:mm:ss'),
    operador: String(payload.operador || '').trim(),
    temperaturaAlvo: temperatura,
    linhasGeradas: rows.length
  };

  return rows;
}

// ------------------------------------------------------------
// ANÁLISE TÉCNICA DO LEAK TEST
// ------------------------------------------------------------
function analisarLeakTest_(dados, payload, opcoes) {
  if (!dados || !dados.length) {
    throw new Error('Nenhum dado normalizado foi recebido para o Leak Test.');
  }

  payload = payload || {};
  opcoes = opcoes || {};

  const nSensores = Number(opcoes.nSensores) ||
    (Array.isArray(dados[0].temperaturas) ? dados[0].temperaturas.length : 0);

  const leakIn = payload.leakTest || {};
  const inicioStr = String(leakIn.inicio || '').trim();
  const fimStr = String(leakIn.fim || '').trim();

  if (!inicioStr || !fimStr) {
    throw new Error('Informe a hora de início e a hora de fim do Leak Test.');
  }

  const idxInicio = localizarIndicePorTempo_(dados, inicioStr, '>=', null);
  const idxFim = localizarIndicePorTempo_(dados, fimStr, '<=', null);

  if (idxInicio === null || idxFim === null) {
    throw new Error('Não foi possível localizar os horários informados do Leak Test dentro dos dados importados do datalogger.');
  }

  if (idxFim <= idxInicio) {
    throw new Error('O horário de fim do Leak Test deve ser posterior ao horário de início e conter ao menos uma leitura entre eles.');
  }

  const linhaInicio = dados[idxInicio];
  const linhaFim = dados[idxFim];

  const pressaoInicioBruta = parseFloatSeguroAnalise_(linhaInicio.pressao, null);
  const pressaoFimBruta = parseFloatSeguroAnalise_(linhaFim.pressao, null);

  if (pressaoInicioBruta === null || pressaoFimBruta === null) {
    throw new Error('Não foi possível obter leituras de pressão válidas nos horários informados do Leak Test.');
  }

  const unidade = String(leakIn.unidadePressao || (UCFG.LEAK_TEST && UCFG.LEAK_TEST.unidadePressaoPadrao) || 'MBAR').toUpperCase().trim();
  const fatorParaMbar = obterFatorConversaoParaMbarLeakTest_(unidade);

  const pressaoInicioMbar = pressaoInicioBruta * fatorParaMbar;
  const pressaoFimMbar = pressaoFimBruta * fatorParaMbar;

  const tempoMinutos = calcularDiferencaTempo(
    linhaInicio.tempoStr,
    linhaFim.tempoStr,
    linhaInicio.tempoDate,
    linhaFim.tempoDate
  );

  if (!tempoMinutos || tempoMinutos <= 0) {
    throw new Error('A duração calculada do Leak Test é inválida. Verifique os horários informados.');
  }

  const deltaPressaoMbar = Math.abs(pressaoFimMbar - pressaoInicioMbar);
  const taxaVazamentoMbarMin = roundAnalise_(deltaPressaoMbar / tempoMinutos, 4);

  const cfgLeak = (UCFG && UCFG.LEAK_TEST) ? UCFG.LEAK_TEST : { limiteTaxaVazamentoMbarMin: 1.3 };
  const limite = parseFloatSeguroAnalise_(cfgLeak.limiteTaxaVazamentoMbarMin, 1.3);
  const normaReferencia = cfgLeak.normaReferencia || 'Prática técnica baseada na EN 285 para esterilizadores a vapor de grande porte';

  const aprovado = taxaVazamentoMbarMin <= limite;
  const statusAprovacao = aprovado ? 'APROVADO' : 'REPROVADO';

  const sensoresAtivos = normalizarSensoresAtivos_(opcoes.sensoresAtivos, nSensores);
  const registroTermico = calcularRegistroTermicoLeakTest_(dados, idxInicio, idxFim, sensoresAtivos, nSensores);
  const estabilidadeCurva = avaliarEstabilidadeCurvaLeakTest_(dados, idxInicio, idxFim, fatorParaMbar);
  const contextoRegistro = avaliarContextoRegistroLeakTest_(dados, idxInicio, idxFim);

  const motivosReprovacao = [];
  if (!aprovado) {
    motivosReprovacao.push(
      'Taxa de vazamento obtida (' + taxaVazamentoMbarMin.toFixed(3) + ' mbar/min) acima do limite de referência (' +
      limite.toFixed(3) + ' mbar/min).'
    );
  }

  const observacoesAnalise = [
    'A avaliação de aprovação/reprovação do Leak Test considera exclusivamente a taxa de vazamento calculada a partir da Pressão Absoluta da Câmara no intervalo informado.'
  ];

  const alertasAnalise = [];
  if (unidade === 'MBAR' && pressaoInicioBruta < 15 && pressaoFimBruta < 15) {
    alertasAnalise.push(
      'A pressão informada em mbar resultou em um valor muito baixo (' + pressaoInicioMbar.toFixed(3) + ' a ' +
      pressaoFimMbar.toFixed(3) + ' mbar). Confirme se a unidade de pressão do datalogger foi selecionada ' +
      'corretamente: muitos dataloggers de autoclave exportam a leitura em bar (ex.: 1,013), não em mbar, o que ' +
      'distorceria a taxa de vazamento calculada.'
    );
  }

  const memoriaCalculo = montarMemoriaCalculoLeakTest_({
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
    tempoDecorridoMinutos: roundAnalise_(tempoMinutos, 2),

    unidadePressaoOriginal: unidade,
    pressaoInicioOriginal: roundAnalise_(pressaoInicioBruta, 4),
    pressaoFimOriginal: roundAnalise_(pressaoFimBruta, 4),
    pressaoInicioMbar: roundAnalise_(pressaoInicioMbar, 3),
    pressaoFimMbar: roundAnalise_(pressaoFimMbar, 3),
    deltaPressaoMbar: roundAnalise_(deltaPressaoMbar, 3),
    taxaVazamentoMbarMin: taxaVazamentoMbarMin,
    limiteTaxaVazamentoMbarMin: limite,
    normaReferencia: normaReferencia,

    quantidadeSensoresInstalados: nSensores,
    registroTermico: registroTermico,
    estabilidadeCurva: estabilidadeCurva,
    contextoRegistro: contextoRegistro,

    memoriaCalculo: memoriaCalculo,
    textoDisclaimerTermico: montarDisclaimerTermicoLeakTest_(),

    motivosReprovacao: motivosReprovacao,
    observacoesAnalise: observacoesAnalise,
    alertasAnalise: alertasAnalise
  };
}

// ------------------------------------------------------------
// CONVERSÃO DE UNIDADE DE PRESSÃO PARA MBAR
// ------------------------------------------------------------
function obterFatorConversaoParaMbarLeakTest_(unidade) {
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
function calcularRegistroTermicoLeakTest_(dados, idxInicio, idxFim, sensoresAtivos, nSensores) {
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
        const t = parseFloatSeguroAnalise_(linha && linha.temperaturas ? linha.temperaturas[s] : null, null);
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
      min: min !== null ? roundAnalise_(min, 2) : null,
      max: max !== null ? roundAnalise_(max, 2) : null,
      media: count ? roundAnalise_(soma / count, 2) : null
    });
  }

  return {
    porSensor: porSensor,
    sensoresUtilizados: porSensor.filter(function(s) { return s.ativo; }).map(function(s) { return s.sensor; }),
    sensoresDesabilitados: porSensor.filter(function(s) { return !s.ativo; }).map(function(s) { return s.sensor; }),
    global: {
      min: globalMin !== null ? roundAnalise_(globalMin, 2) : null,
      max: globalMax !== null ? roundAnalise_(globalMax, 2) : null,
      media: countGlobal ? roundAnalise_(somaGlobal / countGlobal, 2) : null
    }
  };
}

// ------------------------------------------------------------
// ESTABILIDADE DA CURVA DE PRESSÃO NO INTERVALO DO LEAK TEST
// (informativo, não interfere na aprovação — usado só para
// enriquecer o parecer técnico com uma leitura da forma da curva)
// ------------------------------------------------------------
function avaliarEstabilidadeCurvaLeakTest_(dados, idxInicio, idxFim, fatorParaMbar) {
  fatorParaMbar = fatorParaMbar || 1;

  const deltasMbar = [];
  for (let i = idxInicio; i < idxFim; i++) {
    const p1 = parseFloatSeguroAnalise_(dados[i] && dados[i].pressao, null);
    const p2 = parseFloatSeguroAnalise_(dados[i + 1] && dados[i + 1].pressao, null);
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

  const percentualConsistente = roundAnalise_(consistentes / deltasMbar.length, 3);
  const estabilidade = percentualConsistente >= 0.75 ? 'ESTAVEL' : 'IRREGULAR';

  return {
    tendencia: tendencia,
    estabilidade: estabilidade,
    percentualConsistente: percentualConsistente,
    amplitudeMaxContraTendencia: roundAnalise_(amplitudeMaxContraTendencia, 3)
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
function avaliarContextoRegistroLeakTest_(dados, idxInicio, idxFim) {
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
function montarMemoriaCalculoLeakTest_(ctx) {
  ctx = ctx || {};

  return [
    'MEMÓRIA DE CÁLCULO DA TAXA DE VAZAMENTO (LEAK TEST)',
    '',
    'Pressão Absoluta da Câmara - início (P1): ' + Number(ctx.pressaoInicioMbar).toFixed(3) + ' mbar, registrada em ' + (ctx.tempoInicio || '-') + '.',
    'Pressão Absoluta da Câmara - fim (P2): ' + Number(ctx.pressaoFimMbar).toFixed(3) + ' mbar, registrada em ' + (ctx.tempoFim || '-') + '.',
    'Variação de pressão (ΔP): |P2 - P1| = ' + Number(ctx.deltaPressaoMbar).toFixed(3) + ' mbar.',
    'Tempo decorrido: T = ' + Number(ctx.tempoMinutos).toFixed(2) + ' minutos.',
    '',
    'Taxa de vazamento = ΔP / T = ' +
      Number(ctx.deltaPressaoMbar).toFixed(3) + ' / ' + Number(ctx.tempoMinutos).toFixed(2) +
      ' = ' + Number(ctx.taxaVazamento).toFixed(4) + ' mbar/min.',
    '',
    'Critério de referência: taxa de vazamento ≤ ' + Number(ctx.limite).toFixed(2) + ' mbar/min (' + (ctx.norma || '-') + ').',
    '',
    'Resultado obtido: ' + Number(ctx.taxaVazamento).toFixed(4) + ' mbar/min → ' + (ctx.statusAprovacao || '-') + '.'
  ].join('\n');
}

function montarDisclaimerTermicoLeakTest_() {
  return 'ACOMPANHAMENTO TÉRMICO COMPLEMENTAR: os valores de temperatura registrados pelos sensores durante o Leak Test são ' +
    'apresentados exclusivamente como registro técnico complementar do ensaio, sem interferência no critério de aceitação. ' +
    'A avaliação de aprovação/reprovação deste ensaio considera unicamente a taxa de vazamento calculada a partir da ' +
    'Pressão Absoluta da Câmara (ΔP / tempo) no intervalo informado.';
}
