/****************************************************
 * METROLABS — CONVERSOR UNIVERSAL DATALOGGER — V4.4
 * ARQUIVO: AnaliseCiclo.gs
 * DESCRIÇÃO:
 * - F0 por sensor ativo
 * - Exposição robusta com política configurável
 * - Histerese térmica para não matar exposição por microqueda
 * - Início/fim por leituras consecutivas
 * - Override manual opcional de ciclo e exposição
 * - F0 calculado apenas na janela válida
 * - Sensores habilitados/desabilitados
 * - Motivos de reprovação estruturados
 * - Cálculo robusto de tempo
 * - Critério operacional + normativo sem quebrar legado
 ****************************************************/

function analisarCiclo(dados, tipoCiclo, offsetTemp, offsetF0, sensoresAtivos, opcoesAnalise) {
  if (!dados || !dados.length) {
    throw new Error('Nenhum dado normalizado foi recebido para análise.');
  }

  const cfg = UCFG && UCFG.CICLOS ? UCFG.CICLOS[tipoCiclo] : null;
  if (!cfg) {
    throw new Error('Parâmetros normativos não encontrados para o ciclo: ' + tipoCiclo);
  }

  const nSensores = Array.isArray(dados[0].temperaturas) ? dados[0].temperaturas.length : 0;
  if (!nSensores) {
    throw new Error('Não foi possível identificar sensores válidos no conjunto de dados.');
  }

  const offTemp = parseFloatSeguroAnalise_(offsetTemp, 0);

  // Mantido por compatibilidade externa.
  const offF0 = parseFloatSeguroAnalise_(offsetF0, 0);
  void offF0;

  const ativos = normalizarSensoresAtivos_(sensoresAtivos, nSensores);
  const sensoresAtivosIdx = [];
  const sensoresDesabilitadosIdx = [];

  for (let s = 0; s < nSensores; s++) {
    if (ativos[s]) sensoresAtivosIdx.push(s);
    else sensoresDesabilitadosIdx.push(s);
  }

  if (!sensoresAtivosIdx.length) {
    throw new Error('Nenhum sensor ativo foi selecionado para análise.');
  }

  const dtMin = estimarDeltaMinutos_(dados);
  const paramsAnalise = obterParametrosRobustosExposicao_(cfg, dtMin, opcoesAnalise);

  let linhas = dados.map(function(row, idx) {
    const tempsOriginais = Array.isArray(row.temperaturas) ? row.temperaturas : [];
    const tempsCorrigidas = [];

    for (let s = 0; s < nSensores; s++) {
      const bruto = s < tempsOriginais.length ? tempsOriginais[s] : null;
      const t = parseFloatSeguroAnalise_(bruto, null);
      tempsCorrigidas.push(t === null ? null : (t + offTemp));
    }

    const tempsAtivas = sensoresAtivosIdx
      .map(function(s) { return tempsCorrigidas[s]; })
      .filter(function(v) { return v !== null && isFinite(v); });

    const tMediaAtiva = tempsAtivas.length ? mediaArrayAnalise_(tempsAtivas) : null;
    const tMinAtiva = tempsAtivas.length ? Math.min.apply(null, tempsAtivas) : null;
    const tMaxAtiva = tempsAtivas.length ? Math.max.apply(null, tempsAtivas) : null;

    return {
      idxOriginal: idx,
      idx: idx,
      tempoStr: row.tempoStr || '',
      tempoDate: row.tempoDate instanceof Date && !isNaN(row.tempoDate.getTime()) ? row.tempoDate : null,
      pressao: parseFloatSeguroAnalise_(row.pressao, null),
      temperaturas: tempsCorrigidas,
      tMediaAtiva: tMediaAtiva,
      tMinAtiva: tMinAtiva,
      tMaxAtiva: tMaxAtiva
    };
  });

  let analise = {
    tipoCiclo: tipoCiclo,
    configuracaoCiclo: {
      tMin: parseFloatSeguroAnalise_(cfg.tMin, 0),
      tMax: parseFloatSeguroAnalise_(cfg.tMax, 0),
      tBase: parseFloatSeguroAnalise_(cfg.tBase, 121.1),
      z: parseFloatSeguroAnalise_(cfg.z, 10),
      f0Min: parseFloatSeguroAnalise_(cfg.f0Min, 0),
      f0MinNormativo: parseFloatSeguroAnalise_(cfg.f0MinNormativo, parseFloatSeguroAnalise_(cfg.f0Min, 0)),
      f0MinOperacional: parseFloatSeguroAnalise_(cfg.f0MinOperacional, parseFloatSeguroAnalise_(cfg.f0Min, 0)),
      toleranciaF0: parseFloatSeguroAnalise_(cfg.toleranciaF0, 0)
    },

    configuracaoDeteccaoExposicao: {
      consecutivasInicio: paramsAnalise.consecutivasInicio,
      consecutivasFim: paramsAnalise.consecutivasFim,
      histereseTemperatura: paramsAnalise.histereseTemperatura,
      toleranciaEntrada: paramsAnalise.toleranciaEntrada,
      toleranciaSaida: paramsAnalise.toleranciaSaida,
      limiteInicio: roundAnalise_(paramsAnalise.limiteInicio, 3),
      limiteManutencao: roundAnalise_(paramsAnalise.limiteManutencao, 3),
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

    piorSensorF0: null,
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

  // ==========================================================
  // PASSO 0 — Override manual opcional de ciclo
  // ==========================================================
  const override = extrairOverrideJanela_(opcoesAnalise);

  if (override && override.habilitado && (override.inicioCiclo || override.fimCiclo)) {
    const idxInicioCicloManual = override.inicioCiclo
      ? localizarIndicePorTempo_(linhas, override.inicioCiclo, '>=', 0)
      : 0;

    const idxFimCicloManual = override.fimCiclo
      ? localizarIndicePorTempo_(linhas, override.fimCiclo, '<=', linhas.length - 1)
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

  // após eventual corte manual, alinhar tempos do ciclo
  analise.indiceInicioCiclo = 0;
  analise.indiceFimCiclo = linhas.length - 1;
  analise.tempoInicioCiclo = linhas[0] ? linhas[0].tempoStr : '';
  analise.tempoFimCiclo = linhas[linhas.length - 1] ? linhas[linhas.length - 1].tempoStr : '';

  // ==========================================================
  // PASSO 1 — Estatísticas globais do ciclo
  // ==========================================================
  for (let i = 0; i < linhas.length; i++) {
    const row = linhas[i];
    const pressao = row.pressao;

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

    const infoLinhaInicio = avaliarLinhaParaExposicao_(row, sensoresAtivosIdx, paramsAnalise, 'INICIO');
    const infoLinhaManut = avaliarLinhaParaExposicao_(row, sensoresAtivosIdx, paramsAnalise, 'MANUTENCAO');

    if (infoLinhaInicio.valida) {
      analise.debugExposicao.totalLinhasValidasNoLimiarInicio++;
    }
    if (infoLinhaManut.valida) {
      analise.debugExposicao.totalLinhasValidasNoLimiarManutencao++;
    } else {
      analise.debugExposicao.totalQuedasAbaixoManutencao++;
    }

    if (i < 30 || i === linhas.length - 1) {
      analise.debugExposicao.detalheLinhas.push({
        idx: i,
        tempoStr: row.tempoStr,
        minimoAtivo: row.tMinAtiva !== null ? roundAnalise_(row.tMinAtiva, 3) : null,
        maximoAtivo: row.tMaxAtiva !== null ? roundAnalise_(row.tMaxAtiva, 3) : null,
        validouInicio: infoLinhaInicio.valida,
        validouManutencao: infoLinhaManut.valida,
        sensoresValidosInicio: infoLinhaInicio.sensoresValidos,
        sensoresValidosManutencao: infoLinhaManut.sensoresValidos
      });
    }
  }

  // ==========================================================
  // PASSO 2 — Detectar início/fim da exposição
  // ==========================================================
  let inicioManualAplicado = false;

  if (override && override.habilitado && override.inicioExposicao && override.fimExposicao) {
    const idxInicioExpManual = localizarIndicePorTempo_(linhas, override.inicioExposicao, '>=', 0);
    const idxFimExpManual = localizarIndicePorTempo_(linhas, override.fimExposicao, '<=', linhas.length - 1);

    if (idxInicioExpManual !== null && idxFimExpManual !== null && idxFimExpManual >= idxInicioExpManual) {
      const inicioManualTermicamenteValido = avaliarLinhaParaExposicao_(
        linhas[idxInicioExpManual],
        sensoresAtivosIdx,
        paramsAnalise,
        'INICIO'
      ).valida;

      if (inicioManualTermicamenteValido) {
        analise.faseInicioExp = idxInicioExpManual;
        analise.faseFimExp = idxFimExpManual;
        analise.tempoInicioExposicao = linhas[idxInicioExpManual].tempoStr || '';
        analise.tempoFimExposicao = linhas[idxFimExpManual].tempoStr || '';
        analise.origemJanelaExposicao = 'MANUAL';
        analise.observacoesAnalise.push('Janela de exposição definida manualmente por intervenção técnica.');
        inicioManualAplicado = true;
      } else {
        analise.alertasAnalise.push('Janela manual de exposição ignorada: o horário inicial informado não atende ao limite térmico do ciclo selecionado. Mantida detecção automática.');
      }
    } else {
      analise.alertasAnalise.push('Override manual de exposição informado, porém não foi possível localizar integralmente os horários no arquivo. Mantida detecção automática.');
    }
  }

  if (!inicioManualAplicado) {
    let contInicio = 0;
    let contFim = 0;

    for (let i = 0; i < linhas.length; i++) {
      const row = linhas[i];

      if (analise.faseInicioExp === -1) {
        const okInicio = avaliarLinhaParaExposicao_(row, sensoresAtivosIdx, paramsAnalise, 'INICIO').valida;
        if (okInicio) {
          contInicio++;
          if (contInicio >= paramsAnalise.consecutivasInicio) {
            analise.faseInicioExp = i - paramsAnalise.consecutivasInicio + 1;
          }
        } else {
          contInicio = 0;
        }
        continue;
      }

      const okManutencao = avaliarLinhaParaExposicao_(row, sensoresAtivosIdx, paramsAnalise, 'MANUTENCAO').valida;
      if (!okManutencao) {
        contFim++;
        if (contFim >= paramsAnalise.consecutivasFim) {
          analise.faseFimExp = Math.max(
            analise.faseInicioExp,
            i - paramsAnalise.consecutivasFim
          );
          break;
        }
      } else {
        contFim = 0;
      }
    }

    if (analise.faseInicioExp !== -1 && analise.faseFimExp === -1) {
      analise.faseFimExp = linhas.length - 1;
      analise.observacoesAnalise.push('A exposição permaneceu ativa até a última linha disponível do arquivo.');
    }

    if (analise.faseInicioExp !== -1) {
      analise.tempoInicioExposicao = linhas[analise.faseInicioExp].tempoStr || '';
    }

    if (analise.faseFimExp !== -1) {
      analise.tempoFimExposicao = linhas[analise.faseFimExp].tempoStr || '';
    }
  }

  // ==========================================================
  // PASSO 3 — Detectar início da rampa
  // ==========================================================
  analise.faseInicioRampa = 0;

  if (analise.faseInicioExp > 0) {
    for (let i = analise.faseInicioExp; i >= 0; i--) {
      const p = linhas[i].pressao;
      if (p !== null && isFinite(p) && p < 1.0) {
        analise.faseInicioRampa = Math.min(i + 1, analise.faseInicioExp);
        break;
      }
    }
  }

  // ==========================================================
  // PASSO 4 — Calcular F0 apenas na janela de exposição
  // ==========================================================
  analise.fasesProcesso = detectarFasesProcesso_(linhas, analise, cfg);

  let f0Acumulado = new Array(nSensores).fill(null);
  for (let s = 0; s < nSensores; s++) {
    if (ativos[s]) f0Acumulado[s] = 0;
  }

  // Memória de cálculo leitura-a-leitura por sensor, usada pelo documento
  // "Memória de Cálculo do F0" (MemoriaF0.js) — construída DENTRO deste
  // mesmo laço que soma f0Acumulado, nunca recalculada à parte, pra
  // garantir que o total exibido bata exatamente com analise.f0PorSensor.
  let memoriaF0PorSensor = new Array(nSensores).fill(null);
  for (let s = 0; s < nSensores; s++) {
    if (ativos[s]) memoriaF0PorSensor[s] = [];
  }

  if (analise.faseInicioExp !== -1 && analise.faseFimExp !== -1 && analise.faseFimExp >= analise.faseInicioExp) {
    for (let i = analise.faseInicioExp; i <= analise.faseFimExp; i++) {
      const row = linhas[i];

      for (let s = 0; s < nSensores; s++) {
        if (!ativos[s]) continue;

        const t = row.temperaturas[s];
        if (t === null || !isFinite(t)) continue;

        const fatorEquivalencia = Math.pow(10, (t - cfg.tBase) / cfg.z);
        const contribuicaoF0 = fatorEquivalencia * dtMin;
        f0Acumulado[s] += contribuicaoF0;

        if (memoriaF0PorSensor[s]) {
          memoriaF0PorSensor[s].push({
            tempoStr: row.tempoStr || '',
            temperatura: t,
            fator: fatorEquivalencia,
            contribuicao: contribuicaoF0,
            acumulado: f0Acumulado[s]
          });
        }

        if (analise.stats.exposicaoTemp.min === null || t < analise.stats.exposicaoTemp.min) {
          analise.stats.exposicaoTemp.min = t;
        }
        if (analise.stats.exposicaoTemp.max === null || t > analise.stats.exposicaoTemp.max) {
          analise.stats.exposicaoTemp.max = t;
        }
        analise.stats.exposicaoTemp.soma += t;
        analise.stats.exposicaoTemp.count++;

        if (analise.stats.sensores[s].minExposicao === null || t < analise.stats.sensores[s].minExposicao) {
          analise.stats.sensores[s].minExposicao = t;
        }
        if (analise.stats.sensores[s].maxExposicao === null || t > analise.stats.sensores[s].maxExposicao) {
          analise.stats.sensores[s].maxExposicao = t;
        }
        analise.stats.sensores[s].somaExposicao += t;
        analise.stats.sensores[s].countExposicao++;
      }
    }
  }

  analise.f0PorSensor = f0Acumulado.map(function(v, s) {
    if (!ativos[s]) return null;
    return roundAnalise_(v, 4);
  });

  analise.memoriaF0PorSensor = memoriaF0PorSensor;

  const f0Ativos = analise.f0PorSensor.filter(function(v) {
    return v !== null && isFinite(v);
  });

  analise.mediaF0 = f0Ativos.length ? roundAnalise_(mediaArrayAnalise_(f0Ativos), 4) : 0;
  analise.minF0 = f0Ativos.length ? roundAnalise_(Math.min.apply(null, f0Ativos), 4) : 0;
  analise.maxF0 = f0Ativos.length ? roundAnalise_(Math.max.apply(null, f0Ativos), 4) : 0;

  // ==========================================================
  // PASSO 5 — Médias finais e pior sensor
  // ==========================================================
  analise.stats.globalTemp.media = analise.stats.globalTemp.count
    ? roundAnalise_(analise.stats.globalTemp.soma / analise.stats.globalTemp.count, 2)
    : 0;

  analise.stats.globalPres.media = analise.stats.globalPres.count
    ? roundAnalise_(analise.stats.globalPres.soma / analise.stats.globalPres.count, 3)
    : 0;

  analise.stats.exposicaoTemp.media = analise.stats.exposicaoTemp.count
    ? roundAnalise_(analise.stats.exposicaoTemp.soma / analise.stats.exposicaoTemp.count, 2)
    : 0;

  analise.stats.globalTemp.min = analise.stats.globalTemp.min !== null ? roundAnalise_(analise.stats.globalTemp.min, 2) : 0;
  analise.stats.globalTemp.max = analise.stats.globalTemp.max !== null ? roundAnalise_(analise.stats.globalTemp.max, 2) : 0;
  analise.stats.globalPres.min = analise.stats.globalPres.min !== null ? roundAnalise_(analise.stats.globalPres.min, 3) : 0;
  analise.stats.globalPres.max = analise.stats.globalPres.max !== null ? roundAnalise_(analise.stats.globalPres.max, 3) : 0;
  analise.stats.exposicaoTemp.min = analise.stats.exposicaoTemp.min !== null ? roundAnalise_(analise.stats.exposicaoTemp.min, 2) : 0;
  analise.stats.exposicaoTemp.max = analise.stats.exposicaoTemp.max !== null ? roundAnalise_(analise.stats.exposicaoTemp.max, 2) : 0;

  for (let s = 0; s < nSensores; s++) {
    if (!ativos[s]) continue;

    analise.stats.sensores[s].media = analise.stats.sensores[s].count
      ? roundAnalise_(analise.stats.sensores[s].soma / analise.stats.sensores[s].count, 2)
      : 0;

    analise.stats.sensores[s].min = analise.stats.sensores[s].min !== null
      ? roundAnalise_(analise.stats.sensores[s].min, 2)
      : 0;

    analise.stats.sensores[s].max = analise.stats.sensores[s].max !== null
      ? roundAnalise_(analise.stats.sensores[s].max, 2)
      : 0;

    analise.stats.sensores[s].mediaExposicao = analise.stats.sensores[s].countExposicao
      ? roundAnalise_(analise.stats.sensores[s].somaExposicao / analise.stats.sensores[s].countExposicao, 2)
      : null;

    analise.stats.sensores[s].minExposicao = analise.stats.sensores[s].minExposicao !== null
      ? roundAnalise_(analise.stats.sensores[s].minExposicao, 2)
      : null;

    analise.stats.sensores[s].maxExposicao = analise.stats.sensores[s].maxExposicao !== null
      ? roundAnalise_(analise.stats.sensores[s].maxExposicao, 2)
      : null;
  }

  analise.piorSensorF0 = encontrarPiorSensorF0_(analise.f0PorSensor, ativos);
  analise.piorSensorTemperatura = encontrarPiorSensorTemperaturaExposicao_(analise.stats.sensores, ativos);

  // ==========================================================
  // PASSO 6 — Tempos
  // ==========================================================
  analise.tempoExposicao = (analise.faseInicioExp !== -1 && analise.faseFimExp !== -1)
    ? Math.max(0, analise.faseFimExp - analise.faseInicioExp + 1)
    : 0;

  analise.tempoTotalMinutos = calcularDiferencaTempo(
    linhas[0].tempoStr,
    linhas[linhas.length - 1].tempoStr,
    linhas[0].tempoDate,
    linhas[linhas.length - 1].tempoDate
  );

  if (analise.faseInicioExp !== -1 && analise.faseFimExp !== -1) {
    analise.tempoExposicaoMinutos = calcularDiferencaTempo(
      linhas[analise.faseInicioExp].tempoStr,
      linhas[analise.faseFimExp].tempoStr,
      linhas[analise.faseInicioExp].tempoDate,
      linhas[analise.faseFimExp].tempoDate
    );

    if (analise.tempoExposicaoMinutos === 0 && analise.tempoExposicao > 0) {
      analise.tempoExposicaoMinutos = roundAnalise_(Math.max(0, analise.tempoExposicao - 1) * dtMin, 2);
    }
  } else {
    analise.tempoExposicaoMinutos = 0;
  }

  analise.deltaMinutosEstimado = roundAnalise_(dtMin, 4);

  // ==========================================================
  // PASSO 7 — Aprovação / Reprovação
  // ==========================================================
  analise.aprovado = true;
  analise.statusAprovacao = 'APROVADO';

  const f0MinNormativo = parseFloatSeguroAnalise_(cfg.f0MinNormativo, parseFloatSeguroAnalise_(cfg.f0Min, 0));
  const f0MinOperacional = parseFloatSeguroAnalise_(cfg.f0MinOperacional, f0MinNormativo);
  const toleranciaF0 = parseFloatSeguroAnalise_(cfg.toleranciaF0, 0);
  const limiteAprovacaoF0 = Math.max(0, f0MinOperacional - toleranciaF0);

  analise.limitesAprovacao = {
    f0MinNormativo: roundAnalise_(f0MinNormativo, 4),
    f0MinOperacional: roundAnalise_(f0MinOperacional, 4),
    toleranciaF0: roundAnalise_(toleranciaF0, 4),
    limiteAprovacaoF0: roundAnalise_(limiteAprovacaoF0, 4)
  };

  if (analise.faseInicioExp === -1) {
    analise.aprovado = false;
    analise.statusAprovacao = 'REPROVADO';
    analise.motivosReprovacao.push(
      'Exposição não identificada: os sensores ativos não atingiram a condição mínima configurada de forma robusta.'
    );
  }

  if (analise.faseInicioExp !== -1 && analise.faseFimExp === -1) {
    analise.aprovado = false;
    analise.statusAprovacao = 'REPROVADO';
    analise.motivosReprovacao.push(
      'Fim de exposição não identificado adequadamente.'
    );
  }

  if (analise.faseInicioExp !== -1 && analise.faseFimExp !== -1 && analise.faseFimExp < analise.faseInicioExp) {
    analise.aprovado = false;
    analise.statusAprovacao = 'REPROVADO';
    analise.motivosReprovacao.push(
      'Janela de exposição inconsistente: término anterior ao início.'
    );
  }

  if (f0Ativos.length) {
    if (analise.minF0 < limiteAprovacaoF0) {
      analise.aprovado = false;
      analise.statusAprovacao = 'REPROVADO';
      analise.motivosReprovacao.push(
        'F0 mínimo insuficiente: pior sensor ativo (' +
        (analise.piorSensorF0 ? analise.piorSensorF0.sensor : 'N/A') +
        ') obteve ' + roundAnalise_(analise.minF0, 2) +
        ' min, abaixo do limite operacional configurado de ' + roundAnalise_(limiteAprovacaoF0, 2) + ' min.'
      );
    } else if (analise.minF0 < f0MinNormativo) {
      analise.statusAprovacao = analise.aprovado ? 'APROVADO_COM_ALERTA' : analise.statusAprovacao;
      analise.alertasAnalise.push(
        'F0 mínimo abaixo do valor normativo estrito, porém dentro da tolerância operacional configurada. ' +
        'Pior sensor: ' + (analise.piorSensorF0 ? analise.piorSensorF0.sensor : 'N/A') +
        ' | F0: ' + roundAnalise_(analise.minF0, 2) + ' min.'
      );
    }
  } else {
    analise.aprovado = false;
    analise.statusAprovacao = 'REPROVADO';
    analise.motivosReprovacao.push('Não foi possível calcular F0 válido para os sensores ativos.');
  }

  if (analise.tempoTotalMinutos <= 0 && linhas.length > 1) {
    analise.alertasAnalise.push('Tempo total calculado igual ou inferior a zero; foi utilizada a sequência temporal disponível para a análise.');
  }

  if (analise.tempoExposicaoMinutos > analise.tempoTotalMinutos && analise.tempoTotalMinutos > 0) {
    analise.alertasAnalise.push('Tempo de exposição maior que o tempo total do ciclo. Verifique a integridade da linha do tempo.');
  }

  if (!analise.aprovado && !analise.motivosReprovacao.length) {
    analise.motivosReprovacao.push('O ciclo foi reprovado por critério global de análise.');
  }

  if (analise.aprovado && !analise.alertasAnalise.length) {
    analise.observacoesAnalise.push('Todos os critérios configurados para os sensores ativos foram atendidos.');
  }

  return analise;
}

// ------------------------------------------------------------
// PARÂMETROS ROBUSTOS DE DETECÇÃO DA EXPOSIÇÃO
// ------------------------------------------------------------
// ------------------------------------------------------------
// DETECÇÃO OBSERVACIONAL DE FASES DO PROCESSO
// ------------------------------------------------------------
function detectarFasesProcesso_(linhas, analise, cfg) {
  const fases = {
    versao: '1.0',
    unidadePressao: 'bar abs',
    limites: { vacuo: 1.0, pulsoPositivo: 1.2, atmosfericoMin: 0.9, atmosfericoMax: 1.15 },
    segmentos: [],
    pulsosPreVacuo: [],
    eventosPorIndice: {},
    fasePorIndice: {}
  };

  if (!linhas || !linhas.length) return fases;

  const fim = linhas.length - 1;
  const inicioExp = typeof analise.faseInicioExp === 'number' ? analise.faseInicioExp : -1;
  const fimExp = typeof analise.faseFimExp === 'number' ? analise.faseFimExp : -1;
  const inicioRampa = typeof analise.faseInicioRampa === 'number' && analise.faseInicioRampa >= 0 ? analise.faseInicioRampa : 0;
  let fimPreVacuo = inicioExp > 0 ? Math.max(0, inicioRampa - 1) : fim;
  if (inicioExp > 0) {
    for (let i = 0; i < inicioExp; i++) {
      const tMedia = parseFloatSeguroAnalise_(linhas[i].tMediaAtiva, null);
      if (tMedia !== null && isFinite(tMedia) && tMedia >= 65) {
        fimPreVacuo = Math.max(0, i - 1);
        break;
      }
    }
  }

  adicionarEventoFase_(fases, 0, 'INÍCIO DO CICLO');
  adicionarSegmentoFase_(fases, 'CICLO', 0, fim, linhas);

  fases.pulsosPreVacuo = detectarPulsosPreVacuo_(linhas, 0, fimPreVacuo, fases.limites);
  fases.pulsosPreVacuo.forEach(function(pulso) {
    adicionarSegmentoFase_(fases, 'PRE_VACUO', pulso.inicioIdx, pulso.fimIdx, linhas, { numero: pulso.numero });
    adicionarEventoFase_(fases, pulso.inicioIdx, 'INÍCIO DO PRÉ-VÁCUO - PULSO ' + pulso.numero);
    if (pulso.picoPressaoIdx >= 0) adicionarEventoFase_(fases, pulso.picoPressaoIdx, 'PULSO POSITIVO ' + pulso.numero + ' (~' + pulso.pressaoMax + ' bar abs)');
    adicionarEventoFase_(fases, pulso.fimIdx, 'FIM DO PRÉ-VÁCUO - PULSO ' + pulso.numero);
  });

  if (inicioRampa >= 0 && inicioExp > inicioRampa) {
    adicionarSegmentoFase_(fases, 'RAMPA_AQUECIMENTO', inicioRampa, inicioExp - 1, linhas);
    adicionarEventoFase_(fases, inicioRampa, 'INÍCIO DA RAMPA DE AQUECIMENTO');
  }

  if (inicioExp >= 0 && fimExp >= inicioExp) {
    adicionarSegmentoFase_(fases, 'ESTERILIZACAO', inicioExp, fimExp, linhas);
    adicionarEventoFase_(fases, inicioExp, 'INÍCIO DA ESTERILIZAÇÃO / EXPOSIÇÃO');
    adicionarEventoFase_(fases, fimExp, 'TÉRMINO DA ESTERILIZAÇÃO / EXPOSIÇÃO');
  }

  const pos = detectarSecagemDespressurizacao_(linhas, fimExp >= 0 ? fimExp + 1 : -1, fim, fases.limites);
  if (pos.secagem) {
    adicionarSegmentoFase_(fases, 'SECAGEM', pos.secagem.inicioIdx, pos.secagem.fimIdx, linhas);
    adicionarEventoFase_(fases, pos.secagem.inicioIdx, 'INÍCIO DA SECAGEM');
    adicionarEventoFase_(fases, pos.secagem.fimIdx, 'FIM DA SECAGEM');
  }
  if (pos.despressurizacao) {
    adicionarSegmentoFase_(fases, 'DESPRESSURIZACAO', pos.despressurizacao.inicioIdx, pos.despressurizacao.fimIdx, linhas);
    adicionarEventoFase_(fases, pos.despressurizacao.inicioIdx, 'INÍCIO DA DESPRESSURIZAÇÃO');
    adicionarEventoFase_(fases, pos.despressurizacao.fimIdx, 'PRESSÃO ATMOSFÉRICA / LIBERAÇÃO FINAL');
  }

  adicionarEventoFase_(fases, fim, 'TÉRMINO DO CICLO / FIM DA GRAVAÇÃO');
  fases.resumo = {
    pulsosPreVacuo: fases.pulsosPreVacuo.length,
    inicioRampa: inicioRampa >= 0 && linhas[inicioRampa] ? linhas[inicioRampa].tempoStr : '',
    inicioEsterilizacao: inicioExp >= 0 && linhas[inicioExp] ? linhas[inicioExp].tempoStr : '',
    fimEsterilizacao: fimExp >= 0 && linhas[fimExp] ? linhas[fimExp].tempoStr : '',
    secagemDetectada: !!pos.secagem,
    despressurizacaoDetectada: !!pos.despressurizacao
  };

  return fases;
}

function detectarPulsosPreVacuo_(linhas, inicio, fim, limites) {
  const pulsos = [];
  if (inicio < 0 || fim < inicio) return pulsos;

  let emPositivo = false;
  let seg = null;

  for (let i = inicio; i <= fim; i++) {
    const p = parseFloatSeguroAnalise_(linhas[i].pressao, null);
    if (p === null || !isFinite(p)) continue;

    if (!emPositivo && p >= limites.pulsoPositivo) {
      emPositivo = true;
      seg = {
        inicioPositivoIdx: i,
        fimPositivoIdx: i,
        picoPressaoIdx: i,
        pressaoMax: p
      };
    }

    if (!emPositivo || !seg) continue;

    if (p > seg.pressaoMax) {
      seg.pressaoMax = p;
      seg.picoPressaoIdx = i;
    }
    if (p >= limites.pulsoPositivo) seg.fimPositivoIdx = i;

    if (p < limites.pulsoPositivo || i === fim) {
      let inicioVac = seg.inicioPositivoIdx;
      for (let j = seg.inicioPositivoIdx; j >= inicio; j--) {
        const pj = parseFloatSeguroAnalise_(linhas[j].pressao, null);
        if (pj !== null && isFinite(pj) && pj < limites.vacuo) inicioVac = j;
        if (pj !== null && isFinite(pj) && pj >= limites.pulsoPositivo && j < seg.inicioPositivoIdx) break;
      }

      let fimPulso = seg.fimPositivoIdx;
      for (let k = seg.fimPositivoIdx; k <= fim; k++) {
        const pk = parseFloatSeguroAnalise_(linhas[k].pressao, null);
        if (pk !== null && isFinite(pk) && pk < limites.vacuo) {
          fimPulso = k;
          break;
        }
        fimPulso = k;
      }

      let pressaoMin = null;
      for (let m = inicioVac; m <= fimPulso; m++) {
        const pm = parseFloatSeguroAnalise_(linhas[m].pressao, null);
        if (pm === null || !isFinite(pm)) continue;
        if (pressaoMin === null || pm < pressaoMin) pressaoMin = pm;
      }

      pulsos.push({
        numero: pulsos.length + 1,
        inicioIdx: inicioVac,
        fimIdx: fimPulso,
        inicioVacuoIdx: inicioVac,
        picoPressaoIdx: seg.picoPressaoIdx,
        pressaoMin: roundAnalise_(pressaoMin === null ? 0 : pressaoMin, 3),
        pressaoMax: roundAnalise_(seg.pressaoMax, 3)
      });

      emPositivo = false;
      seg = null;
    }
  }

  return pulsos;
}
function detectarSecagemDespressurizacao_(linhas, inicio, fim, limites) {
  const out = { secagem: null, despressurizacao: null };
  if (inicio < 0 || fim < inicio) return out;

  let inicioSec = -1;
  let idxMin = -1;
  let minP = null;

  for (let i = inicio; i <= fim; i++) {
    const p = parseFloatSeguroAnalise_(linhas[i].pressao, null);
    if (p === null || !isFinite(p)) continue;
    if (inicioSec === -1 && p < limites.vacuo) inicioSec = i;
    if (minP === null || p < minP) {
      minP = p;
      idxMin = i;
    }
  }

  if (inicioSec === -1) inicioSec = inicio;

  let inicioDespress = -1;
  const baseBusca = Math.max(inicioSec, idxMin);
  for (let j = baseBusca; j <= fim; j++) {
    const p1 = parseFloatSeguroAnalise_(linhas[j].pressao, null);
    const p2 = j + 1 <= fim ? parseFloatSeguroAnalise_(linhas[j + 1].pressao, null) : p1;
    if (p1 !== null && p2 !== null && p1 >= limites.atmosfericoMin && p2 >= limites.atmosfericoMin) {
      inicioDespress = j;
      break;
    }
  }

  if (inicioDespress > inicioSec) {
    out.secagem = { inicioIdx: inicioSec, fimIdx: inicioDespress - 1 };
    out.despressurizacao = { inicioIdx: inicioDespress, fimIdx: fim };
  } else {
    out.secagem = { inicioIdx: inicioSec, fimIdx: fim };
  }

  return out;
}

function adicionarSegmentoFase_(fases, tipo, inicioIdx, fimIdx, linhas, extra) {
  inicioIdx = Math.max(0, Math.min(linhas.length - 1, Number(inicioIdx)));
  fimIdx = Math.max(inicioIdx, Math.min(linhas.length - 1, Number(fimIdx)));
  const seg = Object.assign({
    tipo: tipo,
    inicioIdx: inicioIdx,
    fimIdx: fimIdx,
    tempoInicio: linhas[inicioIdx] ? linhas[inicioIdx].tempoStr : '',
    tempoFim: linhas[fimIdx] ? linhas[fimIdx].tempoStr : ''
  }, extra || {});
  fases.segmentos.push(seg);
  for (let i = inicioIdx; i <= fimIdx; i++) fases.fasePorIndice[String(i)] = tipo;
}

function adicionarEventoFase_(fases, idx, texto) {
  idx = Number(idx);
  if (!isFinite(idx) || idx < 0) return;
  const k = String(idx);
  if (!fases.eventosPorIndice[k]) fases.eventosPorIndice[k] = [];
  if (fases.eventosPorIndice[k].indexOf(texto) === -1) fases.eventosPorIndice[k].push(texto);
}
function obterParametrosRobustosExposicao_(cfg, dtMin, opcoesAnalise) {
  const raizCfg = (UCFG && UCFG.ANALISE) ? UCFG.ANALISE : {};
  const cfgCiclo = (cfg && cfg.analise) ? cfg.analise : {};
  const cfgOpcoes = (opcoesAnalise && opcoesAnalise.robustez) ? opcoesAnalise.robustez : {};

  const histerese = valorNumericoPrioritario_([
    cfgOpcoes.histereseTemperatura,
    cfgCiclo.histereseTemperatura,
    raizCfg.histereseTemperatura,
    0.5
  ], 0.5);

  const consecutivasInicio = Math.max(1, parseIntPrioritario_([
    cfgOpcoes.consecutivasInicio,
    cfgCiclo.consecutivasInicio,
    raizCfg.consecutivasInicio,
    2
  ], 2));

  const consecutivasFim = Math.max(1, parseIntPrioritario_([
    cfgOpcoes.consecutivasFim,
    cfgCiclo.consecutivasFim,
    raizCfg.consecutivasFim,
    3
  ], 3));

  const toleranciaEntrada = valorNumericoPrioritario_([
    cfgOpcoes.toleranciaEntrada,
    cfgCiclo.toleranciaEntrada,
    raizCfg.toleranciaEntrada,
    0.0
  ], 0.0);

  const toleranciaSaida = valorNumericoPrioritario_([
    cfgOpcoes.toleranciaSaida,
    cfgCiclo.toleranciaSaida,
    raizCfg.toleranciaSaida,
    histerese
  ], histerese);

  const modoReconhecimentoExposicao = String(valorPrioritario_([
    cfgOpcoes.modoReconhecimentoExposicao,
    cfgCiclo.modoReconhecimentoExposicao,
    raizCfg.modoReconhecimentoExposicao,
    'PIOR_SENSOR'
  ], 'PIOR_SENSOR')).toUpperCase().trim();

  const percentualMinimoSensores = limitarEntre_(
    valorNumericoPrioritario_([
      cfgOpcoes.percentualMinimoSensores,
      cfgCiclo.percentualMinimoSensores,
      raizCfg.percentualMinimoSensores,
      1.0
    ], 1.0),
    0.01,
    1.0
  );

  const tMin = parseFloatSeguroAnalise_(cfg.tMin, 0);

  const limiteInicio = tMin - toleranciaEntrada;
  const limiteManutencao = tMin - toleranciaSaida;

  return {
    histereseTemperatura: histerese,
    consecutivasInicio: consecutivasInicio,
    consecutivasFim: consecutivasFim,
    toleranciaEntrada: toleranciaEntrada,
    toleranciaSaida: toleranciaSaida,
    limiteInicio: limiteInicio,
    limiteManutencao: limiteManutencao,
    modoReconhecimentoExposicao: modoReconhecimentoExposicao,
    percentualMinimoSensores: percentualMinimoSensores,
    dtMin: dtMin
  };
}

// ------------------------------------------------------------
// AVALIA LINHA PARA RECONHECIMENTO DE EXPOSIÇÃO
// ------------------------------------------------------------
function avaliarLinhaParaExposicao_(row, sensoresAtivosIdx, paramsAnalise, etapa) {
  etapa = String(etapa || 'INICIO').toUpperCase();

  const limite = etapa === 'MANUTENCAO'
    ? paramsAnalise.limiteManutencao
    : paramsAnalise.limiteInicio;

  let sensoresValidos = 0;
  let sensoresComLeitura = 0;

  for (let i = 0; i < sensoresAtivosIdx.length; i++) {
    const idxSensor = sensoresAtivosIdx[i];
    const t = row.temperaturas[idxSensor];

    if (t === null || !isFinite(t)) continue;
    sensoresComLeitura++;

    if (t >= limite) sensoresValidos++;
  }

  if (!sensoresComLeitura) {
    return {
      valida: false,
      sensoresValidos: 0,
      sensoresComLeitura: 0,
      percentualValido: 0
    };
  }

  let valida = false;
  const modo = String(paramsAnalise.modoReconhecimentoExposicao || 'PIOR_SENSOR').toUpperCase();

  if (modo === 'PERCENTUAL') {
    const percentualValido = sensoresValidos / sensoresComLeitura;
    valida = percentualValido >= paramsAnalise.percentualMinimoSensores;
    return {
      valida: valida,
      sensoresValidos: sensoresValidos,
      sensoresComLeitura: sensoresComLeitura,
      percentualValido: roundAnalise_(percentualValido, 4)
    };
  }

  valida = sensoresValidos === sensoresComLeitura;
  return {
    valida: valida,
    sensoresValidos: sensoresValidos,
    sensoresComLeitura: sensoresComLeitura,
    percentualValido: sensoresComLeitura ? roundAnalise_(sensoresValidos / sensoresComLeitura, 4) : 0
  };
}

// ------------------------------------------------------------
// EXTRAI OVERRIDE MANUAL
// ------------------------------------------------------------
function extrairOverrideJanela_(opcoesAnalise) {
  if (!opcoesAnalise || !opcoesAnalise.overrideJanela) return null;

  const ov = opcoesAnalise.overrideJanela || {};

  return {
    habilitado: !!ov.habilitado,
    inicioCiclo: ov.inicioCiclo || '',
    fimCiclo: ov.fimCiclo || '',
    inicioExposicao: ov.inicioExposicao || '',
    fimExposicao: ov.fimExposicao || ''
  };
}

// ------------------------------------------------------------
// LOCALIZA ÍNDICE MAIS PRÓXIMO POR DATA/HORA
// comparador:
//   '>=' retorna o primeiro índice com tempo >= alvo
//   '<=' retorna o último índice com tempo <= alvo
// ------------------------------------------------------------
function localizarIndicePorTempo_(linhas, alvo, comparador, fallback) {
  const alvoMs = converterTempoParaMsAnalise_(alvo);
  if (!isFinite(alvoMs)) return null;

  if (comparador === '>=') {
    for (let i = 0; i < linhas.length; i++) {
      const ms = converterTempoLinhaParaMsAnalise_(linhas[i]);
      if (isFinite(ms) && ms >= alvoMs) return i;
    }
    return fallback === undefined ? null : fallback;
  }

  if (comparador === '<=') {
    for (let i = linhas.length - 1; i >= 0; i--) {
      const ms = converterTempoLinhaParaMsAnalise_(linhas[i]);
      if (isFinite(ms) && ms <= alvoMs) return i;
    }
    return fallback === undefined ? null : fallback;
  }

  return null;
}

function converterTempoLinhaParaMsAnalise_(row) {
  if (row && row.tempoDate instanceof Date && !isNaN(row.tempoDate.getTime())) {
    return row.tempoDate.getTime();
  }
  return parseTempoSeguroAnalise_(row ? row.tempoStr : '');
}

function converterTempoParaMsAnalise_(valor) {
  if (valor instanceof Date && !isNaN(valor.getTime())) {
    return valor.getTime();
  }
  return parseTempoSeguroAnalise_(valor);
}

// ------------------------------------------------------------
// AUXILIAR: normaliza vetor de sensores ativos
// ------------------------------------------------------------
function normalizarSensoresAtivos_(sensoresAtivos, nSensores) {
  if (!Array.isArray(sensoresAtivos) || !sensoresAtivos.length) {
    return Array.from({ length: nSensores }, function() { return true; });
  }

  const out = [];
  for (let i = 0; i < nSensores; i++) {
    out.push(!!sensoresAtivos[i]);
  }
  return out;
}

// ------------------------------------------------------------
// AUXILIAR: pior sensor F0
// ------------------------------------------------------------
function encontrarPiorSensorF0_(f0PorSensor, ativos) {
  let piorIdx = -1;
  let piorValor = Infinity;

  for (let s = 0; s < f0PorSensor.length; s++) {
    if (!ativos[s]) continue;

    const v = f0PorSensor[s];
    if (v === null || !isFinite(v)) continue;

    if (v < piorValor) {
      piorValor = v;
      piorIdx = s;
    }
  }

  if (piorIdx === -1) return null;

  return {
    sensor: 'S' + (piorIdx + 1),
    indice: piorIdx,
    valor: roundAnalise_(piorValor, 4)
  };
}

// ------------------------------------------------------------
// AUXILIAR: pior sensor térmico global (legado)
// ------------------------------------------------------------
function encontrarPiorSensorTemperatura_(statsSensores, ativos) {
  let piorIdx = -1;
  let piorValor = Infinity;

  for (let s = 0; s < statsSensores.length; s++) {
    if (!ativos[s]) continue;

    const v = statsSensores[s].min;
    if (v === null || !isFinite(v)) continue;

    if (v < piorValor) {
      piorValor = v;
      piorIdx = s;
    }
  }

  if (piorIdx === -1) return null;

  return {
    sensor: 'S' + (piorIdx + 1),
    indice: piorIdx,
    valor: roundAnalise_(piorValor, 2)
  };
}

// ------------------------------------------------------------
// AUXILIAR: pior sensor térmico na exposição
// ------------------------------------------------------------
function encontrarPiorSensorTemperaturaExposicao_(statsSensores, ativos) {
  let piorIdx = -1;
  let piorValor = Infinity;

  for (let s = 0; s < statsSensores.length; s++) {
    if (!ativos[s]) continue;

    const v = statsSensores[s].minExposicao !== null && isFinite(statsSensores[s].minExposicao)
      ? statsSensores[s].minExposicao
      : statsSensores[s].min;

    if (v === null || !isFinite(v)) continue;

    if (v < piorValor) {
      piorValor = v;
      piorIdx = s;
    }
  }

  if (piorIdx === -1) return null;

  return {
    sensor: 'S' + (piorIdx + 1),
    indice: piorIdx,
    valor: roundAnalise_(piorValor, 2)
  };
}

// ------------------------------------------------------------
// FUNÇÃO AUXILIAR PARA CÁLCULO DE TEMPO
// ------------------------------------------------------------
function calcularDiferencaTempo(str1, str2, dt1, dt2) {
  try {
    if (dt1 instanceof Date && !isNaN(dt1.getTime()) && dt2 instanceof Date && !isNaN(dt2.getTime())) {
      const diffMs = dt2.getTime() - dt1.getTime();
      return diffMs > 0 ? roundAnalise_(diffMs / 60000, 1) : 0;
    }

    const ms1 = parseTempoSeguroAnalise_(str1);
    const ms2 = parseTempoSeguroAnalise_(str2);

    if (!isFinite(ms1) || !isFinite(ms2)) return 0;

    const diffMs = ms2 - ms1;
    return diffMs > 0 ? roundAnalise_(diffMs / 60000, 1) : 0;
  } catch (e) {
    return 0;
  }
}

// ------------------------------------------------------------
// ESTIMAÇÃO DE DELTA DE TEMPO ENTRE LINHAS
// ------------------------------------------------------------
function estimarDeltaMinutos_(dados) {
  if (!dados || dados.length < 2) return 1;

  const deltas = [];

  for (let i = 1; i < dados.length; i++) {
    const a = dados[i - 1].tempoDate;
    const b = dados[i].tempoDate;

    if (a instanceof Date && !isNaN(a.getTime()) && b instanceof Date && !isNaN(b.getTime())) {
      const diffMin = (b.getTime() - a.getTime()) / 60000;
      if (diffMin > 0 && diffMin < 120) {
        deltas.push(diffMin);
      }
    }
  }

  if (!deltas.length) {
    return 1;
  }

  deltas.sort(function(x, y) { return x - y; });
  const mid = Math.floor(deltas.length / 2);

  return deltas.length % 2
    ? deltas[mid]
    : (deltas[mid - 1] + deltas[mid]) / 2;
}

// ------------------------------------------------------------
// HELPERS INTERNOS
// ------------------------------------------------------------
function parseFloatSeguroAnalise_(valor, fallback) {
  if (valor === null || valor === undefined || valor === '') return fallback;

  if (typeof valor === 'number') {
    return isFinite(valor) ? valor : fallback;
  }

  const normalizado = String(valor).replace(',', '.').trim();
  const n = Number(normalizado);
  return isFinite(n) ? n : fallback;
}

function mediaArrayAnalise_(arr) {
  if (!arr || !arr.length) return 0;
  return arr.reduce(function(a, b) { return a + b; }, 0) / arr.length;
}

function roundAnalise_(n, d) {
  const p = Math.pow(10, d || 0);
  return Math.round((Number(n) || 0) * p) / p;
}

function valorNumericoPrioritario_(lista, fallback) {
  for (let i = 0; i < lista.length; i++) {
    const n = Number(lista[i]);
    if (isFinite(n)) return n;
  }
  return fallback;
}

function valorPrioritario_(lista, fallback) {
  for (let i = 0; i < lista.length; i++) {
    const v = lista[i];
    if (v !== null && v !== undefined && String(v).trim() !== '') return v;
  }
  return fallback;
}

function parseIntPrioritario_(lista, fallback) {
  for (let i = 0; i < lista.length; i++) {
    const n = parseInt(lista[i], 10);
    if (isFinite(n)) return n;
  }
  return fallback;
}

function limitarEntre_(valor, min, max) {
  valor = Number(valor);
  if (!isFinite(valor)) return min;
  return Math.max(min, Math.min(max, valor));
}

function parseTempoSeguroAnalise_(valor) {
  try {
    if (valor instanceof Date && !isNaN(valor.getTime())) {
      return valor.getTime();
    }

    const s = String(valor || '').trim();
    if (!s) return NaN;

    if (s.indexOf('/') === -1) {
      const tentativaDireta = new Date(s).getTime();
      if (!isNaN(tentativaDireta)) return tentativaDireta;
    }

    const partes = s.split(' ');
    if (partes.length < 2) {
      return NaN;
    }

    const dataStr = partes[0].trim();
    const horaStr = partes.slice(1).join(' ').trim();

    const d = dataStr.split('/');
    const t = horaStr.split(':');

    if (d.length !== 3 || t.length < 2) {
      return NaN;
    }

    let p1 = parseInt(d[0], 10);
    let p2 = parseInt(d[1], 10);
    let ano = parseInt(d[2], 10);

    if (!isFinite(p1) || !isFinite(p2) || !isFinite(ano)) {
      return NaN;
    }

    let dia;
    let mes;

    if (p1 > 12) {
      dia = p1;
      mes = p2;
    } else if (p2 > 12) {
      dia = p2;
      mes = p1;
    } else {
      dia = p1;
      mes = p2;
    }

    const hh = parseInt(t[0], 10) || 0;
    const mm = parseInt(t[1], 10) || 0;
    const ss = parseInt(t[2], 10) || 0;

    return new Date(ano, mes - 1, dia, hh, mm, ss).getTime();
  } catch (e) {
    return NaN;
  }
}






