/****************************************************
 * METROLABS  CONVERSOR UNIVERSAL DATALOGGER  V4.9
 * ARQUIVO: AnaliseCiclo.gs
 * SISTEMA UNIFICADO: TERMO E ULTRASSOM
 * DESCRICAO:
 * - Algoritmo de Vales e Picos para maquinas multistage
 * - Cálculo de A0 isolado na janela real de desinfecção
 * - Cálculo de tempo de cavitação (ultrassom)
 * - Histerese térmica para não interromper exposição por microqueda
 * - Início/fim por leituras consecutivas
 * - Trava de seguranca robusta para ciclos abortados
 * - FIX: Busca de pico atrelada ao pior caso térmico (Anti-Crash de Janela)
 ****************************************************/

function LavRel_analisarCiclo(dados, tipoCiclo, offsetTemp, offsetParametro, sensoresAtivos, opcoesAnalise) {
  if (!dados || !dados.length) {
    throw new Error('Nenhum dado normalizado foi recebido para análise.');
  }

  const cfg = LavRel_UCFG && LavRel_UCFG.CICLOS ? LavRel_UCFG.CICLOS[tipoCiclo] : null;
  if (!cfg) {
    throw new Error('Parâmetros normativos não encontrados para o equipamento: ' + tipoCiclo);
  }

  const nSensores = Array.isArray(dados[0].temperaturas) ? dados[0].temperaturas.length : 0;
  if (!nSensores) {
    throw new Error('Não foi possível identificar sensores válidos no conjunto de dados.');
  }

  const offTemp = LavRel_parseFloatSeguroAnalise_(offsetTemp, 0);
  const offParam = LavRel_parseFloatSeguroAnalise_(offsetParametro, 0);

  const ativos = LavRel_normalizarSensoresAtivos_(sensoresAtivos, nSensores);
  const sensoresAtivosIdx = [];
  const sensoresDesabilitadosIdx = [];

  for (let s = 0; s < nSensores; s++) {
    if (ativos[s]) sensoresAtivosIdx.push(s);
    else sensoresDesabilitadosIdx.push(s);
  }

  if (!sensoresAtivosIdx.length) {
    throw new Error('Nenhum sensor ativo foi selecionado para análise.');
  }

  const dtMin = LavRel_estimarDeltaMinutos_(dados);
  const paramsAnalise = LavRel_obterParametrosRobustosExposicao_(cfg, dtMin, opcoesAnalise);

  let linhas = dados.map(function(row, idx) {
    const tempsOriginais = Array.isArray(row.temperaturas) ? row.temperaturas : [];
    const tempsCorrigidas = [];

    for (let s = 0; s < nSensores; s++) {
      const bruto = s < tempsOriginais.length ? tempsOriginais[s] : null;
      const t = LavRel_parseFloatSeguroAnalise_(bruto, null);
      tempsCorrigidas.push(t === null ? null : (t + offTemp));
    }

    const tempsAtivas = sensoresAtivosIdx
      .map(function(s) { return tempsCorrigidas[s]; })
      .filter(function(v) { return v !== null && isFinite(v); });

    const tMediaAtiva = tempsAtivas.length ? LavRel_mediaArrayAnalise_(tempsAtivas) : null;
    const tMinAtiva = tempsAtivas.length ? Math.min.apply(null, tempsAtivas) : null;
    const tMaxAtiva = tempsAtivas.length ? Math.max.apply(null, tempsAtivas) : null;

    return {
      idxOriginal: idx,
      idx: idx,
      tempoStr: row.tempoStr || '',
      tempoDate: row.tempoDate instanceof Date && !isNaN(row.tempoDate.getTime()) ? row.tempoDate : null,
      pressao: LavRel_parseFloatSeguroAnalise_(row.pressao, null),
      temperaturas: tempsCorrigidas,
      tMediaAtiva: tMediaAtiva,
      tMinAtiva: tMinAtiva,
      tMaxAtiva: tMaxAtiva
    };
  });

  let parametroNormativo = 0;
  let parametroOperacional = 0;
  let toleranciaParametro = 0;

  if (tipoCiclo === 'TERMO') {
    parametroNormativo = LavRel_parseFloatSeguroAnalise_(cfg.parametroNormativo, 600);
    parametroOperacional = LavRel_parseFloatSeguroAnalise_(cfg.parametroOperacional, 600);
    toleranciaParametro = LavRel_parseFloatSeguroAnalise_(cfg.toleranciaParametro, 10);
  } else if (tipoCiclo === 'ULTRASSOM') {
    parametroNormativo = LavRel_parseFloatSeguroAnalise_(cfg.parametroNormativo, 10);
    parametroOperacional = LavRel_parseFloatSeguroAnalise_(cfg.parametroOperacional, 10);
    toleranciaParametro = LavRel_parseFloatSeguroAnalise_(cfg.toleranciaParametro, 0.5);
  }

  let analise = {
    tipoCiclo: tipoCiclo,
    configuracaoCiclo: {
      tMin: (opcoesAnalise && opcoesAnalise.setpoint) ? opcoesAnalise.setpoint : LavRel_parseFloatSeguroAnalise_(cfg.tMin, 20),
      tMax: LavRel_parseFloatSeguroAnalise_(cfg.tMax, 100),
      tBase: LavRel_parseFloatSeguroAnalise_(cfg.tBase, 80.0),
      z: LavRel_parseFloatSeguroAnalise_(cfg.z, 10),
      parametroNormativo: parametroNormativo,
      parametroOperacional: parametroOperacional,
      toleranciaParametro: toleranciaParametro
    },

    configuracaoDeteccaoExposicao: {
      consecutivasInicio: paramsAnalise.consecutivasInicio,
      consecutivasFim: paramsAnalise.consecutivasFim,
      histereseTemperatura: paramsAnalise.histereseTemperatura,
      toleranciaEntrada: paramsAnalise.toleranciaEntrada,
      toleranciaSaida: paramsAnalise.toleranciaSaida,
      limiteInicio: LavRel_roundAnalise_(paramsAnalise.limiteInicio, 3),
      limiteManutencao: LavRel_roundAnalise_(paramsAnalise.limiteManutencao, 3),
      modoReconhecimentoExposicao: paramsAnalise.modoReconhecimentoExposicao,
      percentualMinimoSensores: paramsAnalise.percentualMinimoSensores
    },

    sensoresAtivos: ativos.slice(),
    sensoresUtilizados: sensoresAtivosIdx.map(function(s) { return 'S' + (s + 1); }),
    sensoresDesabilitados: sensoresDesabilitadosIdx.map(function(s) { return 'S' + (s + 1); }),
    quantidadeSensoresInstalados: nSensores,
    quantidadeSensoresUtilizados: sensoresAtivosIdx.length,

    faseInicioRampa: -1,
    faseInicioExp: -1,
    faseFimExp: -1,

    indiceInicioCiclo: 0,
    indiceFimCiclo: linhas.length - 1,

    tempoInicioCiclo: linhas[0] ? linhas[0].tempoStr : '',
    tempoFimCiclo: linhas[linhas.length - 1] ? linhas[linhas.length - 1].tempoStr : '',

    tempoInicioExposicao: '',
    tempoFimExposicao: '',

    origemJanelaCiclo: 'AUTO',
    origemJanelaExposicao: 'AUTO',

    minA0: 0,
    mediaA0: 0,
    maxA0: 0,
    piorSensorA0: null,
    tempoCavitacao: 0,
    
    piorSensorTemperatura: null,
    motivosReprovacao: [],
    observacoesAnalise: [],
    alertasAnalise: [],

    debugExposicao: {
      totalLinhas: linhas.length,
      totalLinhasValidasNoLimiarInicio: 0,
      totalLinhasValidasNoLimiarManutencao: 0,
      totalQuedasAbaixoManutencao: 0,
      modoReconhecimentoExposicao: paramsAnalise.modoReconhecimentoExposicao,
      percentualMinimoSensores: paramsAnalise.percentualMinimoSensores,
      detalheLinhas: []
    },

    aprovado: true,
    statusAprovacao: 'APROVADO',

    stats: {
      globalTemp: { min: null, max: null, soma: 0, count: 0, media: 0 },
      globalPres: { min: null, max: null, soma: 0, count: 0, media: 0 },
      exposicaoTemp: { min: null, max: null, soma: 0, count: 0, media: 0 },
      sensores: Array.from({ length: nSensores }, function(_, s) {
        return {
          sensor: 'S' + (s + 1),
          ativo: !!ativos[s],
          min: null,
          max: null,
          soma: 0,
          count: 0,
          media: null,
          minExposicao: null,
          maxExposicao: null,
          somaExposicao: 0,
          countExposicao: 0,
          mediaExposicao: null
        };
      })
    }
  };

  const override = LavRel_extrairOverrideJanela_(opcoesAnalise);

  if (override && override.habilitado && (override.inicioCiclo || override.fimCiclo)) {
    const idxInicioCicloManual = override.inicioCiclo
      ? LavRel_localizarIndicePorTempo_(linhas, override.inicioCiclo, '>=', 0)
      : 0;

    const idxFimCicloManual = override.fimCiclo
      ? LavRel_localizarIndicePorTempo_(linhas, override.fimCiclo, '<=', linhas.length - 1)
      : (linhas.length - 1);

    if (idxInicioCicloManual !== null && idxFimCicloManual !== null && idxFimCicloManual >= idxInicioCicloManual) {
      linhas = linhas.slice(idxInicioCicloManual, idxFimCicloManual + 1).map(function(row, i) {
        row.idx = i;
        return row;
      });

      analise.indiceInicioCiclo = 0;
      analise.indiceFimCiclo = linhas.length - 1;
      analise.tempoInicioCiclo = linhas[0] ? linhas[0].tempoStr : '';
      analise.tempoFimCiclo = linhas[linhas.length - 1] ? linhas[linhas.length - 1].tempoStr : '';
      analise.origemJanelaCiclo = 'MANUAL';
      analise.observacoesAnalise.push('Janela do ciclo definida manualmente por intervenção técnica.');
    } else {
      analise.alertasAnalise.push('Override manual de ciclo informado, porém não foi possível localizar integralmente os horários no arquivo. Mantida janela automática.');
    }
  }

  if (!linhas.length) {
    throw new Error('Não restaram linhas válidas após o recorte da janela de ciclo.');
  }

  analise.indiceInicioCiclo = 0;
  analise.indiceFimCiclo = linhas.length - 1;
  analise.tempoInicioCiclo = linhas[0] ? linhas[0].tempoStr : '';
  analise.tempoFimCiclo = linhas[linhas.length - 1] ? linhas[linhas.length - 1].tempoStr : '';

  // ==========================================================
  // PASSO 1  Estatsticas globais do ciclo e Busca de Pico
  // ==========================================================
  let picoAbsolutoIdx = 0;
  let maxPiorSensor = -Infinity;

  for (let i = 0; i < linhas.length; i++) {
    const row = linhas[i];
    const pressao = row.pressao;

    if (row.tMinAtiva !== null && row.tMinAtiva > maxPiorSensor) {
      maxPiorSensor = row.tMinAtiva;
      picoAbsolutoIdx = i;
    }

    if (pressao !== null && isFinite(pressao)) {
      if (analise.stats.globalPres.min === null || pressao < analise.stats.globalPres.min) {
        analise.stats.globalPres.min = pressao;
      }
      if (analise.stats.globalPres.max === null || pressao > analise.stats.globalPres.max) {
        analise.stats.globalPres.max = pressao;
      }
      analise.stats.globalPres.soma += pressao;
      analise.stats.globalPres.count++;
    }

    for (let s = 0; s < nSensores; s++) {
      if (!ativos[s]) continue;

      const t = row.temperaturas[s];
      if (t === null || !isFinite(t)) continue;

      if (analise.stats.globalTemp.min === null || t < analise.stats.globalTemp.min) {
        analise.stats.globalTemp.min = t;
      }
      if (analise.stats.globalTemp.max === null || t > analise.stats.globalTemp.max) {
        analise.stats.globalTemp.max = t;
      }
      analise.stats.globalTemp.soma += t;
      analise.stats.globalTemp.count++;

      if (analise.stats.sensores[s].min === null || t < analise.stats.sensores[s].min) {
        analise.stats.sensores[s].min = t;
      }
      if (analise.stats.sensores[s].max === null || t > analise.stats.sensores[s].max) {
        analise.stats.sensores[s].max = t;
      }

      analise.stats.sensores[s].soma += t;
      analise.stats.sensores[s].count++;
    }
  }

  // ==========================================================
  // PASSO 2  Detectar inicio/fim da exposicao (Logica Multistage)
  // ==========================================================
  let inicioManualAplicado = false;

  if (override && override.habilitado && override.inicioExposicao && override.fimExposicao) {
    const idxInicioExpManual = LavRel_localizarIndicePorTempo_(linhas, override.inicioExposicao, '>=', 0);
    const idxFimExpManual = LavRel_localizarIndicePorTempo_(linhas, override.fimExposicao, '<=', linhas.length - 1);

    if (idxInicioExpManual !== null && idxFimExpManual !== null && idxFimExpManual >= idxInicioExpManual) {
      const linhaInicioManualValida = LavRel_avaliarLinhaParaExposicao_(linhas[idxInicioExpManual], sensoresAtivosIdx, paramsAnalise, 'INICIO').valida;
      const linhaFimManualValida = LavRel_avaliarLinhaParaExposicao_(linhas[idxFimExpManual], sensoresAtivosIdx, paramsAnalise, 'MANUTENCAO').valida;

      if (linhaInicioManualValida && linhaFimManualValida) {
        analise.faseInicioExp = idxInicioExpManual;
        analise.faseFimExp = idxFimExpManual;
        analise.tempoInicioExposicao = linhas[idxInicioExpManual].tempoStr || '';
        analise.tempoFimExposicao = linhas[idxFimExpManual].tempoStr || '';
        analise.origemJanelaExposicao = 'MANUAL';
        analise.observacoesAnalise.push('Janela da fase principal definida manualmente por intervenção técnica.');
        inicioManualAplicado = true;
      } else {
        analise.alertasAnalise.push('Janela manual da fase principal ignorada: os horários informados não atendem ao critério térmico configurado. Mantida detecção automática.');
      }
    } else {
      analise.alertasAnalise.push('Override manual de fase principal informado, porém não foi possível localizar os horários. Mantida detecção automática.');
    }
  }

  if (!inicioManualAplicado) {
    // SEGURANCA: Trava para ciclos abortados prematuramente ou sensores frios
    if (maxPiorSensor < paramsAnalise.limiteInicio) {
      analise.faseInicioExp = -1;
      analise.faseFimExp = -1;
      analise.observacoesAnalise.push('Ciclo abortado/insuficiente. O pior sensor atingiu apenas ' + LavRel_roundAnalise_(maxPiorSensor, 2) + '°C, nunca cruzando a linha do setpoint para início de contagem.');
    } else {
      // Busca do Fim da Exposicao (do pico para a frente)
      let contFim = 0;
      for (let i = picoAbsolutoIdx; i < linhas.length; i++) {
        const okManutencao = LavRel_avaliarLinhaParaExposicao_(linhas[i], sensoresAtivosIdx, paramsAnalise, 'MANUTENCAO').valida;
        if (!okManutencao) {
          contFim++;
          if (contFim >= paramsAnalise.consecutivasFim) {
            analise.faseFimExp = i - paramsAnalise.consecutivasFim;
            break;
          }
        } else {
          contFim = 0;
        }
      }
      if (analise.faseFimExp === -1) analise.faseFimExp = linhas.length - 1; 

      // Busca do início da exposição (do pico para trás)
      let contInicio = 0;
      for (let i = picoAbsolutoIdx; i >= 0; i--) {
        const okInicio = LavRel_avaliarLinhaParaExposicao_(linhas[i], sensoresAtivosIdx, paramsAnalise, 'INICIO').valida;
        if (!okInicio) {
          contInicio++;
          if (contInicio >= paramsAnalise.consecutivasInicio) {
            analise.faseInicioExp = i + paramsAnalise.consecutivasInicio;
            break;
          }
        } else {
          contInicio = 0;
        }
      }
      if (analise.faseInicioExp === -1) analise.faseInicioExp = 0; 
    }

    // SEGURANCA: Previne array out of bounds se o arquivo foi cortado
    if (analise.faseInicioExp >= linhas.length) analise.faseInicioExp = linhas.length - 1;
    if (analise.faseInicioExp < 0) analise.faseInicioExp = -1;
    if (analise.faseFimExp >= linhas.length) analise.faseFimExp = linhas.length - 1;
    if (analise.faseFimExp < 0) analise.faseFimExp = -1;

    if (analise.faseInicioExp !== -1) {
      analise.tempoInicioExposicao = linhas[analise.faseInicioExp].tempoStr || '';
    }

    if (analise.faseFimExp !== -1) {
      analise.tempoFimExposicao = linhas[analise.faseFimExp].tempoStr || '';
    }
  }

  // ==========================================================
  // PASSO 3  Detectar inicio da rampa / enchimento
  // ==========================================================
  analise.faseInicioRampa = 0;
  if (analise.faseInicioExp > 0) {
    for (let i = analise.faseInicioExp; i >= 0; i--) {
      const minLocal = linhas[i].tMinAtiva;
      if (minLocal !== null && isFinite(minLocal) && minLocal < analise.configuracaoCiclo.tMin - 10) {
        analise.faseInicioRampa = Math.min(i + 1, analise.faseInicioExp);
        break;
      }
    }
  }

  // ==========================================================
  // PASSO 4 - Cálculos de tempo e A0 na janela validada
  // ==========================================================
  analise.tempoTotalMinutos = LavRel_calcularDiferencaTempo(linhas[0].tempoStr, linhas[linhas.length - 1].tempoStr, linhas[0].tempoDate, linhas[linhas.length - 1].tempoDate);

  if (analise.faseInicioExp !== -1 && analise.faseFimExp !== -1) {
    analise.tempoExposicaoMinutos = LavRel_calcularDiferencaTempo(
      linhas[analise.faseInicioExp].tempoStr,
      linhas[analise.faseFimExp].tempoStr,
      linhas[analise.faseInicioExp].tempoDate,
      linhas[analise.faseFimExp].tempoDate
    );

    if (analise.tempoExposicaoMinutos === 0 && (analise.faseFimExp - analise.faseInicioExp) > 0) {
      analise.tempoExposicaoMinutos = LavRel_roundAnalise_(Math.max(0, (analise.faseFimExp - analise.faseInicioExp) - 1) * dtMin, 2);
    }
  } else {
    analise.tempoExposicaoMinutos = 0;
  }

  analise.deltaMinutosEstimado = LavRel_roundAnalise_(dtMin, 4);

  let a0Acumulado = new Array(nSensores).fill(null);
  if (tipoCiclo === 'TERMO') {
    for (let s = 0; s < nSensores; s++) { if (ativos[s]) a0Acumulado[s] = 0; }
  }

  if (analise.faseInicioExp !== -1 && analise.faseFimExp !== -1 && analise.faseFimExp >= analise.faseInicioExp) {
    for (let i = analise.faseInicioExp; i <= analise.faseFimExp; i++) {
      const row = linhas[i];

      for (let s = 0; s < nSensores; s++) {
        if (!ativos[s]) continue;

        const t = row.temperaturas[s];
        if (t === null || !isFinite(t)) continue;

        if (tipoCiclo === 'TERMO') {
          a0Acumulado[s] += Math.pow(10, (t - cfg.tBase) / cfg.z) * (dtMin * 60);
        }

        if (analise.stats.exposicaoTemp.min === null || t < analise.stats.exposicaoTemp.min) { analise.stats.exposicaoTemp.min = t; }
        if (analise.stats.exposicaoTemp.max === null || t > analise.stats.exposicaoTemp.max) { analise.stats.exposicaoTemp.max = t; }
        analise.stats.exposicaoTemp.soma += t;
        analise.stats.exposicaoTemp.count++;

        if (analise.stats.sensores[s].minExposicao === null || t < analise.stats.sensores[s].minExposicao) { analise.stats.sensores[s].minExposicao = t; }
        if (analise.stats.sensores[s].maxExposicao === null || t > analise.stats.sensores[s].maxExposicao) { analise.stats.sensores[s].maxExposicao = t; }
        analise.stats.sensores[s].somaExposicao += t;
        analise.stats.sensores[s].countExposicao++;
      }
    }
  }

  if (tipoCiclo === 'TERMO') {
    analise.a0PorSensor = a0Acumulado.map(function(v, s) {
      if (!ativos[s]) return null;
      return LavRel_roundAnalise_(v + offParam, 2); 
    });

    const a0Ativos = analise.a0PorSensor.filter(function(v) { return v !== null && isFinite(v); });
    analise.mediaA0 = a0Ativos.length ? LavRel_roundAnalise_(LavRel_mediaArrayAnalise_(a0Ativos), 2) : 0;
    analise.minA0 = a0Ativos.length ? LavRel_roundAnalise_(Math.min.apply(null, a0Ativos), 2) : 0;
    analise.maxA0 = a0Ativos.length ? LavRel_roundAnalise_(Math.max.apply(null, a0Ativos), 2) : 0;
    analise.piorSensorA0 = LavRel_encontrarPiorSensorParametro_(analise.a0PorSensor, ativos);

  } else if (tipoCiclo === 'ULTRASSOM') {
    analise.tempoCavitacao = LavRel_roundAnalise_(analise.tempoExposicaoMinutos + offParam, 2);
  }

  // ==========================================================
  // PASSO 5  Médias finais e pior sensor térmico
  // ==========================================================
  analise.stats.globalTemp.media = analise.stats.globalTemp.count ? LavRel_roundAnalise_(analise.stats.globalTemp.soma / analise.stats.globalTemp.count, 2) : 0;
  analise.stats.globalPres.media = analise.stats.globalPres.count ? LavRel_roundAnalise_(analise.stats.globalPres.soma / analise.stats.globalPres.count, 3) : 0;
  analise.stats.exposicaoTemp.media = analise.stats.exposicaoTemp.count ? LavRel_roundAnalise_(analise.stats.exposicaoTemp.soma / analise.stats.exposicaoTemp.count, 2) : 0;

  analise.stats.globalTemp.min = analise.stats.globalTemp.min !== null ? LavRel_roundAnalise_(analise.stats.globalTemp.min, 2) : 0;
  analise.stats.globalTemp.max = analise.stats.globalTemp.max !== null ? LavRel_roundAnalise_(analise.stats.globalTemp.max, 2) : 0;
  analise.stats.globalPres.min = analise.stats.globalPres.min !== null ? LavRel_roundAnalise_(analise.stats.globalPres.min, 3) : 0;
  analise.stats.globalPres.max = analise.stats.globalPres.max !== null ? LavRel_roundAnalise_(analise.stats.globalPres.max, 3) : 0;
  analise.stats.exposicaoTemp.min = analise.stats.exposicaoTemp.min !== null ? LavRel_roundAnalise_(analise.stats.exposicaoTemp.min, 2) : 0;
  analise.stats.exposicaoTemp.max = analise.stats.exposicaoTemp.max !== null ? LavRel_roundAnalise_(analise.stats.exposicaoTemp.max, 2) : 0;

  for (let s = 0; s < nSensores; s++) {
    if (!ativos[s]) continue;

    analise.stats.sensores[s].media = analise.stats.sensores[s].count ? LavRel_roundAnalise_(analise.stats.sensores[s].soma / analise.stats.sensores[s].count, 2) : 0;
    analise.stats.sensores[s].min = analise.stats.sensores[s].min !== null ? LavRel_roundAnalise_(analise.stats.sensores[s].min, 2) : 0;
    analise.stats.sensores[s].max = analise.stats.sensores[s].max !== null ? LavRel_roundAnalise_(analise.stats.sensores[s].max, 2) : 0;
    analise.stats.sensores[s].mediaExposicao = analise.stats.sensores[s].countExposicao ? LavRel_roundAnalise_(analise.stats.sensores[s].somaExposicao / analise.stats.sensores[s].countExposicao, 2) : null;
    analise.stats.sensores[s].minExposicao = analise.stats.sensores[s].minExposicao !== null ? LavRel_roundAnalise_(analise.stats.sensores[s].minExposicao, 2) : null;
    analise.stats.sensores[s].maxExposicao = analise.stats.sensores[s].maxExposicao !== null ? LavRel_roundAnalise_(analise.stats.sensores[s].maxExposicao, 2) : null;
  }

  analise.piorSensorTemperatura = LavRel_encontrarPiorSensorTemperaturaExposicao_(analise.stats.sensores, ativos);

  // ==========================================================
  // PASSO 6  Aprovacao / Reprovacao
  // ==========================================================
  analise.aprovado = true;
  analise.statusAprovacao = 'APROVADO';

  const limiteAprovacaoFinal = Math.max(0, parametroOperacional - toleranciaParametro);

  analise.limitesAprovacao = {
    parametroNormativo: LavRel_roundAnalise_(parametroNormativo, 2),
    parametroOperacional: LavRel_roundAnalise_(parametroOperacional, 2),
    toleranciaParametro: LavRel_roundAnalise_(toleranciaParametro, 2),
    limiteAprovacaoFinal: LavRel_roundAnalise_(limiteAprovacaoFinal, 2)
  };

  if (analise.faseInicioExp === -1) {
    analise.aprovado = false;
    analise.statusAprovacao = 'REPROVADO';
    analise.motivosReprovacao.push('Fase principal não identificada: os sensores ativos não atingiram a temperatura mínima configurada de forma robusta.');
  }

  if (analise.faseInicioExp !== -1 && analise.faseFimExp === -1) {
    analise.aprovado = false;
    analise.statusAprovacao = 'REPROVADO';
    analise.motivosReprovacao.push('Fim da fase principal não identificado adequadamente.');
  }

  if (analise.faseInicioExp !== -1 && analise.faseFimExp !== -1 && analise.faseFimExp < analise.faseInicioExp) {
    analise.aprovado = false;
    analise.statusAprovacao = 'REPROVADO';
    analise.motivosReprovacao.push('Janela de fase inconsistente: término anterior ao início.');
  }

  if (tipoCiclo === 'TERMO') {
    if (analise.a0PorSensor && analise.a0PorSensor.filter(v => v !== null).length > 0) {
      if (analise.minA0 < limiteAprovacaoFinal) {
        analise.aprovado = false;
        analise.statusAprovacao = 'REPROVADO';
        analise.motivosReprovacao.push('A0 mínimo insuficiente: pior sensor ativo (' + (analise.piorSensorA0 ? analise.piorSensorA0.sensor : 'N/A') + ') obteve ' + analise.minA0 + ', abaixo do limite operacional configurado de ' + limiteAprovacaoFinal + '.');
      } else if (analise.minA0 < parametroNormativo) {
        analise.statusAprovacao = analise.aprovado ? 'APROVADO_COM_ALERTA' : analise.statusAprovacao;
        analise.alertasAnalise.push('A0 mínimo abaixo do valor normativo estrito, porém dentro da tolerância operacional configurada. Pior sensor: ' + (analise.piorSensorA0 ? analise.piorSensorA0.sensor : 'N/A') + ' | A0: ' + analise.minA0 + '.');
      }
    } else {
      analise.aprovado = false;
      analise.statusAprovacao = 'REPROVADO';
      analise.motivosReprovacao.push('Não foi possível calcular o A0 válido para os sensores ativos.');
    }
  } else if (tipoCiclo === 'ULTRASSOM') {
    if (analise.tempoCavitacao < limiteAprovacaoFinal) {
      analise.aprovado = false;
      analise.statusAprovacao = 'REPROVADO';
      analise.motivosReprovacao.push('Tempo de cavitação insuficiente: obteve ' + analise.tempoCavitacao + ' min, abaixo do limite operacional configurado de ' + limiteAprovacaoFinal + ' min.');
    } else if (analise.tempoCavitacao < parametroNormativo) {
        analise.statusAprovacao = analise.aprovado ? 'APROVADO_COM_ALERTA' : analise.statusAprovacao;
        analise.alertasAnalise.push('Tempo de cavitação abaixo do valor normativo estrito, porém dentro da tolerância operacional configurada.');
    }
  }

  if (analise.tempoTotalMinutos <= 0 && linhas.length > 1) {
    analise.alertasAnalise.push('Tempo total calculado igual ou inferior a zero; foi utilizada a sequência temporal disponível para a análise.');
  }

  if (analise.tempoExposicaoMinutos > analise.tempoTotalMinutos && analise.tempoTotalMinutos > 0) {
    analise.alertasAnalise.push('Tempo de fase principal maior que o tempo total do ciclo. Verifique a integridade da linha do tempo.');
  }

  analise.fasesProcesso = LavRel_detectarFasesProcessoLavadoras_(linhas, analise, tipoCiclo);

  if (!analise.aprovado && !analise.motivosReprovacao.length) {
    analise.motivosReprovacao.push('O ciclo foi reprovado por critério global de análise.');
  }

  if (analise.aprovado && !analise.alertasAnalise.length) {
    analise.observacoesAnalise.push('Todos os critérios configurados para os sensores ativos foram atendidos.');
  }

  return analise;
}

function LavRel_obterParametrosRobustosExposicao_(cfg, dtMin, opcoesAnalise) {
  const raizCfg = (LavRel_UCFG && LavRel_UCFG.ANALISE) ? LavRel_UCFG.ANALISE : {};
  const cfgCiclo = (cfg && cfg.analise) ? cfg.analise : {};
  const cfgOpcoes = (opcoesAnalise && opcoesAnalise.robustez) ? opcoesAnalise.robustez : {};

  const histerese = LavRel_valorNumericoPrioritario_([cfgOpcoes.histereseTemperatura, cfgCiclo.histereseTemperatura, raizCfg.histereseTemperatura, 0.5], 0.5);
  const consecutivasInicio = Math.max(1, LavRel_parseIntPrioritario_([cfgOpcoes.consecutivasInicio, cfgCiclo.consecutivasInicio, raizCfg.consecutivasInicio, 2], 2));
  const consecutivasFim = Math.max(1, LavRel_parseIntPrioritario_([cfgOpcoes.consecutivasFim, cfgCiclo.consecutivasFim, raizCfg.consecutivasFim, 3], 3));
  const toleranciaEntrada = LavRel_valorNumericoPrioritario_([cfgOpcoes.toleranciaEntrada, cfgCiclo.toleranciaEntrada, raizCfg.toleranciaEntrada, 0.0], 0.0);
  const toleranciaSaida = LavRel_valorNumericoPrioritario_([cfgOpcoes.toleranciaSaida, cfgCiclo.toleranciaSaida, raizCfg.toleranciaSaida, histerese], histerese);
  const modoReconhecimentoExposicao = String(LavRel_valorPrioritario_([cfgOpcoes.modoReconhecimentoExposicao, cfgCiclo.modoReconhecimentoExposicao, raizCfg.modoReconhecimentoExposicao, 'PIOR_SENSOR'], 'PIOR_SENSOR')).toUpperCase().trim();
  const percentualMinimoSensores = LavRel_limitarEntre_(LavRel_valorNumericoPrioritario_([cfgOpcoes.percentualMinimoSensores, cfgCiclo.percentualMinimoSensores, raizCfg.percentualMinimoSensores, 1.0], 1.0), 0.01, 1.0);
  
  // AQUI A MGICA: O tMin usa o setpoint digitado na tela!
  const tMin = (opcoesAnalise && opcoesAnalise.setpoint) ? LavRel_parseFloatSeguroAnalise_(opcoesAnalise.setpoint, 20) : LavRel_parseFloatSeguroAnalise_(cfg.tMin, 20);

  const limiteInicio = tMin - toleranciaEntrada;
  const limiteManutencao = tMin - toleranciaSaida;

  return {
    histereseTemperatura: histerese, consecutivasInicio: consecutivasInicio, consecutivasFim: consecutivasFim,
    toleranciaEntrada: toleranciaEntrada, toleranciaSaida: toleranciaSaida, limiteInicio: limiteInicio,
    limiteManutencao: limiteManutencao, modoReconhecimentoExposicao: modoReconhecimentoExposicao,
    percentualMinimoSensores: percentualMinimoSensores, dtMin: dtMin
  };
}

function LavRel_avaliarLinhaParaExposicao_(row, sensoresAtivosIdx, paramsAnalise, etapa) {
  etapa = String(etapa || 'INICIO').toUpperCase();
  const limite = etapa === 'MANUTENCAO' ? paramsAnalise.limiteManutencao : paramsAnalise.limiteInicio;

  let sensoresValidos = 0; let sensoresComLeitura = 0;

  for (let i = 0; i < sensoresAtivosIdx.length; i++) {
    const idxSensor = sensoresAtivosIdx[i]; const t = row.temperaturas[idxSensor];
    if (t === null || !isFinite(t)) continue;
    sensoresComLeitura++;
    if (t >= limite) sensoresValidos++;
  }

  if (!sensoresComLeitura) return { valida: false, sensoresValidos: 0, sensoresComLeitura: 0, percentualValido: 0 };

  let valida = false;
  const modo = String(paramsAnalise.modoReconhecimentoExposicao || 'PIOR_SENSOR').toUpperCase();

  if (modo === 'PERCENTUAL') {
    const percentualValido = sensoresValidos / sensoresComLeitura;
    valida = percentualValido >= paramsAnalise.percentualMinimoSensores;
    return { valida: valida, sensoresValidos: sensoresValidos, sensoresComLeitura: sensoresComLeitura, percentualValido: LavRel_roundAnalise_(percentualValido, 4) };
  }

  valida = sensoresValidos === sensoresComLeitura;
  return { valida: valida, sensoresValidos: sensoresValidos, sensoresComLeitura: sensoresComLeitura, percentualValido: sensoresComLeitura ? LavRel_roundAnalise_(sensoresValidos / sensoresComLeitura, 4) : 0 };
}

function LavRel_extrairOverrideJanela_(opcoesAnalise) {
  if (!opcoesAnalise || !opcoesAnalise.overrideJanela) return null;
  const ov = opcoesAnalise.overrideJanela || {};
  return { habilitado: !!ov.habilitado, inicioCiclo: ov.inicioCiclo || '', fimCiclo: ov.fimCiclo || '', inicioExposicao: ov.inicioExposicao || '', fimExposicao: ov.fimExposicao || '' };
}

function LavRel_localizarIndicePorTempo_(linhas, alvo, comparador, fallback) {
  const alvoMs = LavRel_converterTempoParaMsAnalise_(alvo);
  if (!isFinite(alvoMs)) return null;

  if (comparador === '>=') {
    for (let i = 0; i < linhas.length; i++) { const ms = LavRel_converterTempoLinhaParaMsAnalise_(linhas[i]); if (isFinite(ms) && ms >= alvoMs) return i; }
    return fallback === undefined ? null : fallback;
  }
  if (comparador === '<=') {
    for (let i = linhas.length - 1; i >= 0; i--) { const ms = LavRel_converterTempoLinhaParaMsAnalise_(linhas[i]); if (isFinite(ms) && ms <= alvoMs) return i; }
    return fallback === undefined ? null : fallback;
  }
  return null;
}

function LavRel_converterTempoLinhaParaMsAnalise_(row) {
  if (row && row.tempoDate instanceof Date && !isNaN(row.tempoDate.getTime())) return row.tempoDate.getTime();
  return LavRel_parseTempoSeguroAnalise_(row ? row.tempoStr : '');
}

function LavRel_converterTempoParaMsAnalise_(valor) {
  if (valor instanceof Date && !isNaN(valor.getTime())) return valor.getTime();
  return LavRel_parseTempoSeguroAnalise_(valor);
}

function LavRel_normalizarSensoresAtivos_(sensoresAtivos, nSensores) {
  if (!Array.isArray(sensoresAtivos) || !sensoresAtivos.length) return Array.from({ length: nSensores }, function() { return true; });
  const out = []; for (let i = 0; i < nSensores; i++) out.push(!!sensoresAtivos[i]);
  return out;
}

function LavRel_encontrarPiorSensorParametro_(valoresPorSensor, ativos) {
  let piorIdx = -1; let piorValor = Infinity;
  for (let s = 0; s < valoresPorSensor.length; s++) {
    if (!ativos[s]) continue;
    const v = valoresPorSensor[s];
    if (v === null || !isFinite(v)) continue;
    if (v < piorValor) { piorValor = v; piorIdx = s; }
  }
  if (piorIdx === -1) return null;
  return { sensor: 'S' + (piorIdx + 1), indice: piorIdx, valor: LavRel_roundAnalise_(piorValor, 2) };
}

function LavRel_encontrarPiorSensorTemperaturaExposicao_(statsSensores, ativos) {
  let piorIdx = -1; let piorValor = Infinity;
  for (let s = 0; s < statsSensores.length; s++) {
    if (!ativos[s]) continue;
    const v = statsSensores[s].minExposicao !== null && isFinite(statsSensores[s].minExposicao) ? statsSensores[s].minExposicao : statsSensores[s].min;
    if (v === null || !isFinite(v)) continue;
    if (v < piorValor) { piorValor = v; piorIdx = s; }
  }
  if (piorIdx === -1) return null;
  return { sensor: 'S' + (piorIdx + 1), indice: piorIdx, valor: LavRel_roundAnalise_(piorValor, 2) };
}

function LavRel_calcularDiferencaTempo(str1, str2, dt1, dt2) {
  try {
    if (dt1 instanceof Date && !isNaN(dt1.getTime()) && dt2 instanceof Date && !isNaN(dt2.getTime())) {
      const diffMs = dt2.getTime() - dt1.getTime(); return diffMs > 0 ? LavRel_roundAnalise_(diffMs / 60000, 1) : 0;
    }
    const ms1 = LavRel_parseTempoSeguroAnalise_(str1); const ms2 = LavRel_parseTempoSeguroAnalise_(str2);
    if (!isFinite(ms1) || !isFinite(ms2)) return 0;
    const diffMs = ms2 - ms1; return diffMs > 0 ? LavRel_roundAnalise_(diffMs / 60000, 1) : 0;
  } catch (e) { return 0; }
}

function LavRel_estimarDeltaMinutos_(dados) {
  if (!dados || dados.length < 2) return 1;
  const deltas = [];
  for (let i = 1; i < dados.length; i++) {
    const a = dados[i - 1].tempoDate; const b = dados[i].tempoDate;
    if (a instanceof Date && !isNaN(a.getTime()) && b instanceof Date && !isNaN(b.getTime())) {
      const diffMin = (b.getTime() - a.getTime()) / 60000;
      if (diffMin > 0 && diffMin < 120) deltas.push(diffMin);
    }
  }
  if (!deltas.length) return 1;
  deltas.sort(function(x, y) { return x - y; });
  const mid = Math.floor(deltas.length / 2);
  return deltas.length % 2 ? deltas[mid] : (deltas[mid - 1] + deltas[mid]) / 2;
}

function LavRel_parseFloatSeguroAnalise_(valor, fallback) {
  if (valor === null || valor === undefined || valor === '') return fallback;
  if (typeof valor === 'number') return isFinite(valor) ? valor : fallback;
  const normalizado = String(valor).replace(',', '.').trim();
  const n = Number(normalizado);
  return isFinite(n) ? n : fallback;
}

function LavRel_mediaArrayAnalise_(arr) {
  if (!arr || !arr.length) return 0;
  return arr.reduce(function(a, b) { return a + b; }, 0) / arr.length;
}

function LavRel_roundAnalise_(n, d) {
  const p = Math.pow(10, d || 0); return Math.round((Number(n) || 0) * p) / p;
}

function LavRel_valorNumericoPrioritario_(lista, fallback) {
  for (let i = 0; i < lista.length; i++) { const n = Number(lista[i]); if (isFinite(n)) return n; } return fallback;
}

function LavRel_valorPrioritario_(lista, fallback) {
  for (let i = 0; i < lista.length; i++) { const v = lista[i]; if (v !== null && v !== undefined && String(v).trim() !== '') return v; } return fallback;
}

function LavRel_parseIntPrioritario_(lista, fallback) {
  for (let i = 0; i < lista.length; i++) { const n = parseInt(lista[i], 10); if (isFinite(n)) return n; } return fallback;
}

function LavRel_limitarEntre_(valor, min, max) {
  valor = Number(valor); if (!isFinite(valor)) return min; return Math.max(min, Math.min(max, valor));
}

function LavRel_parseTempoSeguroAnalise_(valor) {
  try {
    if (valor instanceof Date && !isNaN(valor.getTime())) return valor.getTime();
    const s = String(valor || '').trim();
    if (!s) return NaN;

    const partes = s.split(' ');
    if (partes.length >= 2 && partes[0].indexOf('/') !== -1) {
      const dataStr = partes[0].trim();
      const horaStr = partes.slice(1).join(' ').trim();
      const d = dataStr.split('/');
      const t = horaStr.split(':');
      if (d.length === 3 && t.length >= 2) {
        const dia = parseInt(d[0], 10);
        const mes = parseInt(d[1], 10);
        const ano = parseInt(d[2], 10);
        const hh = parseInt(t[0], 10) || 0;
        const mm = parseInt(t[1], 10) || 0;
        const ss = parseInt(t[2], 10) || 0;
        if (isFinite(dia) && isFinite(mes) && isFinite(ano) && dia >= 1 && dia <= 31 && mes >= 1 && mes <= 12) {
          return new Date(ano, mes - 1, dia, hh, mm, ss).getTime();
        }
      }
    }

    const tentativaDireta = new Date(s).getTime();
    return !isNaN(tentativaDireta) ? tentativaDireta : NaN;
  } catch (e) {
    return NaN;
  }
}

function LavRel_detectarFasesProcessoLavadoras_(linhas, analise, tipoCiclo) {
  const total = Array.isArray(linhas) ? linhas.length : 0;
  const fasePorIndice = {};
  const eventosPorIndice = {};
  const segmentos = [];
  if (!total) return { fasePorIndice: fasePorIndice, eventosPorIndice: eventosPorIndice, segmentos: segmentos, resumo: [] };

  const idxInicio = Math.max(0, Math.min(total - 1, LavRel_numeroFaseLavadoras_(analise.indiceInicioCiclo, 0)));
  const idxFim = Math.max(0, Math.min(total - 1, LavRel_numeroFaseLavadoras_(analise.indiceFimCiclo, total - 1)));
  const idxRampa = Math.max(idxInicio, Math.min(idxFim, LavRel_numeroFaseLavadoras_(analise.faseInicioRampa, idxInicio)));
  const idxExpIni = LavRel_numeroFaseLavadoras_(analise.faseInicioExp, -1);
  const idxExpFim = LavRel_numeroFaseLavadoras_(analise.faseFimExp, -1);
  const termo = tipoCiclo === 'TERMO';

  function rotulos(fase) {
    const mapaTermo = {
      PREPARO: ['PRE_LAVAGEM', 'Pré-lavagem / entrada de água'],
      LAVAGEM: ['LAVAGEM_AQUECIMENTO', 'Lavagem mecânica / aquecimento'],
      ENXAGUE_INTERMEDIARIO: ['ENXAGUE_INTERMEDIARIO', 'Enxágue intermediário'],
      PRINCIPAL: ['DESINFECCAO_TERMICA', 'Desinfecção térmica - A0'],
      ENXAGUE_FINAL: ['ENXAGUE_FINAL', 'Enxágue final'],
      FINAL: ['SECAGEM_RESFRIAMENTO', 'Secagem / resfriamento / final de ciclo'],
      ABORTADO: ['PREPARO_INCOMPLETO', 'Preparo incompleto / ciclo abortado']
    };
    const mapaUltra = {
      LAVAGEM_AQUECIMENTO: ['LAVAGEM_AQUECIMENTO_ULTRA', 'Lavagem / aquecimento do banho'],
      ENXAGUE_INTERMEDIARIO: ['ENXAGUE_INTERMEDIARIO_ULTRA', 'Enxágue intermediário'],
      DESGASEIFICACAO: ['DESGASEIFICACAO', 'Desgaseificação / preparo do banho'],
      PRINCIPAL: ['CAVITACAO_ULTRASSOM', 'Cavitação ultrassônica'],
      ENXAGUE_FINAL: ['ENXAGUE_FINAL_ULTRA', 'Enxágue final'],
      FINAL: ['DRENAGEM_FINAL', 'Drenagem / final de ciclo'],
      ABORTADO: ['PREPARO_INCOMPLETO', 'Preparo incompleto / ciclo abortado']
    };
    return (termo ? mapaTermo : mapaUltra)[fase];
  }

  function add(inicio, fim, fase) {
    inicio = Math.max(idxInicio, Math.min(idxFim, inicio));
    fim = Math.max(idxInicio, Math.min(idxFim, fim));
    if (fim < inicio) return;
    const r = rotulos(fase);
    if (!r) return;
    for (let i = inicio; i <= fim; i++) fasePorIndice[i] = r[0];
    segmentos.push({ codigo: r[0], nome: r[1], inicioIndice: inicio, fimIndice: fim, inicio: linhas[inicio] ? linhas[inicio].tempoStr : '', fim: linhas[fim] ? linhas[fim].tempoStr : '' });
  }

  function splitRange(inicio, fim, pesos) {
    inicio = Math.max(idxInicio, Math.min(idxFim, inicio));
    fim = Math.max(idxInicio, Math.min(idxFim, fim));
    if (fim < inicio) return [];
    const len = fim - inicio + 1;
    const soma = pesos.reduce(function(a, b) { return a + b; }, 0) || 1;
    let cursor = inicio;
    return pesos.map(function(peso, pos) {
      const restante = fim - cursor + 1;
      let qtd = pos === pesos.length - 1 ? restante : Math.max(1, Math.round(len * peso / soma));
      qtd = Math.min(qtd, restante);
      const a = cursor;
      const b = cursor + qtd - 1;
      cursor = b + 1;
      return [a, b];
    }).filter(function(r) { return r[1] >= r[0]; });
  }

  if (idxExpIni >= 0 && idxExpFim >= idxExpIni) {
    if (termo) {
      const pre = splitRange(idxInicio, Math.max(idxInicio, idxExpIni - 1), [25, 55, 20]);
      if (pre[0]) add(pre[0][0], pre[0][1], 'PREPARO');
      if (pre[1]) add(pre[1][0], pre[1][1], 'LAVAGEM');
      if (pre[2]) add(pre[2][0], pre[2][1], 'ENXAGUE_INTERMEDIARIO');
      add(idxExpIni, idxExpFim, 'PRINCIPAL');
      const pos = splitRange(Math.min(idxFim, idxExpFim + 1), idxFim, [35, 65]);
      if (pos[0]) add(pos[0][0], pos[0][1], 'ENXAGUE_FINAL');
      if (pos[1]) add(pos[1][0], pos[1][1], 'FINAL');
    } else {
      const pre = splitRange(idxInicio, Math.max(idxInicio, idxExpIni - 1), [40, 20, 40]);
      if (pre[0]) add(pre[0][0], pre[0][1], 'LAVAGEM_AQUECIMENTO');
      if (pre[1]) add(pre[1][0], pre[1][1], 'ENXAGUE_INTERMEDIARIO');
      if (pre[2]) add(pre[2][0], pre[2][1], 'DESGASEIFICACAO');
      add(idxExpIni, idxExpFim, 'PRINCIPAL');
      const pos = splitRange(Math.min(idxFim, idxExpFim + 1), idxFim, [45, 55]);
      if (pos[0]) add(pos[0][0], pos[0][1], 'ENXAGUE_FINAL');
      if (pos[1]) add(pos[1][0], pos[1][1], 'FINAL');
    }
  } else {
    add(idxInicio, idxFim, 'ABORTADO');
  }

  if (segmentos.length) {
    segmentos.forEach(function(seg) {
      eventosPorIndice[seg.inicioIndice] = 'INÍCIO - ' + String(seg.nome || '').toUpperCase();
      eventosPorIndice[seg.fimIndice] = eventosPorIndice[seg.fimIndice]
        ? eventosPorIndice[seg.fimIndice] + ' | TÉRMINO - ' + String(seg.nome || '').toUpperCase()
        : 'TÉRMINO - ' + String(seg.nome || '').toUpperCase();
    });
  }
  eventosPorIndice[idxInicio] = eventosPorIndice[idxInicio] ? 'INÍCIO DO CICLO | ' + eventosPorIndice[idxInicio] : 'INÍCIO DO CICLO';
  eventosPorIndice[idxFim] = eventosPorIndice[idxFim] ? eventosPorIndice[idxFim] + ' | TÉRMINO DO CICLO' : 'TÉRMINO DO CICLO';

  return {
    fasePorIndice: fasePorIndice,
    eventosPorIndice: eventosPorIndice,
    segmentos: segmentos,
    resumo: segmentos.map(function(s) { return s.nome + ': ' + s.inicio + ' a ' + s.fim; })
  };
}

function LavRel_numeroFaseLavadoras_(valor, fallback) {
  const n = Number(valor);
  return isFinite(n) ? Math.round(n) : fallback;
}
