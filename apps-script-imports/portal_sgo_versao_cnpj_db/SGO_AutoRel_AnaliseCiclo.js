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

function AutoRel_analisarCiclo(dados, tipoCiclo, offsetTemp, offsetF0, sensoresAtivos, opcoesAnalise) {
  if (!dados || !dados.length) {
    throw new Error('Nenhum dado normalizado foi recebido para análise.');
  }

  const cfg = AutoRel_UCFG && AutoRel_UCFG.CICLOS ? AutoRel_UCFG.CICLOS[tipoCiclo] : null;
  if (!cfg) {
    throw new Error('Parâmetros normativos não encontrados para o ciclo: ' + tipoCiclo);
  }

  const nSensores = Array.isArray(dados[0].temperaturas) ? dados[0].temperaturas.length : 0;
  if (!nSensores) {
    throw new Error('Não foi possível identificar sensores válidos no conjunto de dados.');
  }

  const offTemp = AutoRel_parseFloatSeguroAnalise_(offsetTemp, 0);

  // Mantido por compatibilidade externa.
  const offF0 = AutoRel_parseFloatSeguroAnalise_(offsetF0, 0);
  void offF0;

  const ativos = AutoRel_normalizarSensoresAtivos_(sensoresAtivos, nSensores);
  const sensoresAtivosIdx = [];
  const sensoresDesabilitadosIdx = [];

  for (let s = 0; s < nSensores; s++) {
    if (ativos[s]) sensoresAtivosIdx.push(s);
    else sensoresDesabilitadosIdx.push(s);
  }

  if (!sensoresAtivosIdx.length) {
    throw new Error('Nenhum sensor ativo foi selecionado para análise.');
  }

  const dtMin = AutoRel_estimarDeltaMinutos_(dados);
  const paramsAnalise = AutoRel_obterParametrosRobustosExposicao_(cfg, dtMin, opcoesAnalise);

  let linhas = dados.map(function(row, idx) {
    const tempsOriginais = Array.isArray(row.temperaturas) ? row.temperaturas : [];
    const tempsCorrigidas = [];

    for (let s = 0; s < nSensores; s++) {
      const bruto = s < tempsOriginais.length ? tempsOriginais[s] : null;
      const t = AutoRel_parseFloatSeguroAnalise_(bruto, null);
      tempsCorrigidas.push(t === null ? null : (t + offTemp));
    }

    const tempsAtivas = sensoresAtivosIdx
      .map(function(s) { return tempsCorrigidas[s]; })
      .filter(function(v) { return v !== null && isFinite(v); });

    const tMediaAtiva = tempsAtivas.length ? AutoRel_mediaArrayAnalise_(tempsAtivas) : null;
    const tMinAtiva = tempsAtivas.length ? Math.min.apply(null, tempsAtivas) : null;
    const tMaxAtiva = tempsAtivas.length ? Math.max.apply(null, tempsAtivas) : null;

    return {
      idxOriginal: idx,
      idx: idx,
      tempoStr: row.tempoStr || '',
      tempoDate: row.tempoDate instanceof Date && !isNaN(row.tempoDate.getTime()) ? row.tempoDate : null,
      pressao: AutoRel_parseFloatSeguroAnalise_(row.pressao, null),
      temperaturas: tempsCorrigidas,
      tMediaAtiva: tMediaAtiva,
      tMinAtiva: tMinAtiva,
      tMaxAtiva: tMaxAtiva
    };
  });

  let analise = {
    tipoCiclo: tipoCiclo,
    configuracaoCiclo: {
      tMin: AutoRel_parseFloatSeguroAnalise_(cfg.tMin, 0),
      tMax: AutoRel_parseFloatSeguroAnalise_(cfg.tMax, 0),
      tBase: AutoRel_parseFloatSeguroAnalise_(cfg.tBase, 121.1),
      z: AutoRel_parseFloatSeguroAnalise_(cfg.z, 10),
      f0Min: AutoRel_parseFloatSeguroAnalise_(cfg.f0Min, 0),
      f0MinNormativo: AutoRel_parseFloatSeguroAnalise_(cfg.f0MinNormativo, AutoRel_parseFloatSeguroAnalise_(cfg.f0Min, 0)),
      f0MinOperacional: AutoRel_parseFloatSeguroAnalise_(cfg.f0MinOperacional, AutoRel_parseFloatSeguroAnalise_(cfg.f0Min, 0)),
      toleranciaF0: AutoRel_parseFloatSeguroAnalise_(cfg.toleranciaF0, 0)
    },

    configuracaoDeteccaoExposicao: {
      consecutivasInicio: paramsAnalise.consecutivasInicio,
      consecutivasFim: paramsAnalise.consecutivasFim,
      histereseTemperatura: paramsAnalise.histereseTemperatura,
      toleranciaEntrada: paramsAnalise.toleranciaEntrada,
      toleranciaSaida: paramsAnalise.toleranciaSaida,
      limiteInicio: AutoRel_roundAnalise_(paramsAnalise.limiteInicio, 3),
      limiteManutencao: AutoRel_roundAnalise_(paramsAnalise.limiteManutencao, 3),
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
  const override = AutoRel_extrairOverrideJanela_(opcoesAnalise);

  if (override && override.habilitado && (override.inicioCiclo || override.fimCiclo)) {
    const idxInicioCicloManual = override.inicioCiclo
      ? AutoRel_localizarIndicePorTempo_(linhas, override.inicioCiclo, '>=', 0)
      : 0;

    const idxFimCicloManual = override.fimCiclo
      ? AutoRel_localizarIndicePorTempo_(linhas, override.fimCiclo, '<=', linhas.length - 1)
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

    const infoLinhaInicio = AutoRel_avaliarLinhaParaExposicao_(row, sensoresAtivosIdx, paramsAnalise, 'INICIO');
    const infoLinhaManut = AutoRel_avaliarLinhaParaExposicao_(row, sensoresAtivosIdx, paramsAnalise, 'MANUTENCAO');

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
        minimoAtivo: row.tMinAtiva !== null ? AutoRel_roundAnalise_(row.tMinAtiva, 3) : null,
        maximoAtivo: row.tMaxAtiva !== null ? AutoRel_roundAnalise_(row.tMaxAtiva, 3) : null,
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
    const idxInicioExpManual = AutoRel_localizarIndicePorTempo_(linhas, override.inicioExposicao, '>=', 0);
    const idxFimExpManual = AutoRel_localizarIndicePorTempo_(linhas, override.fimExposicao, '<=', linhas.length - 1);

    if (idxInicioExpManual !== null && idxFimExpManual !== null && idxFimExpManual >= idxInicioExpManual) {
      const inicioManualTermicamenteValido = AutoRel_avaliarLinhaParaExposicao_(
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
        const okInicio = AutoRel_avaliarLinhaParaExposicao_(row, sensoresAtivosIdx, paramsAnalise, 'INICIO').valida;
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

      const okManutencao = AutoRel_avaliarLinhaParaExposicao_(row, sensoresAtivosIdx, paramsAnalise, 'MANUTENCAO').valida;
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
  analise.fasesProcesso = AutoRel_detectarFasesProcesso_(linhas, analise, cfg, opcoesAnalise);

  let f0Acumulado = new Array(nSensores).fill(null);
  for (let s = 0; s < nSensores; s++) {
    if (ativos[s]) f0Acumulado[s] = 0;
  }

  // Memória de cálculo leitura-a-leitura por sensor, usada pelo documento
  // "Memória de Cálculo do F0" (SGO_AutoRel_MemoriaF0.js) — construída DENTRO
  // deste mesmo laço que soma f0Acumulado, nunca recalculada à parte, pra
  // garantir que o total exibido bata exatamente com analise.f0PorSensor.
  let memoriaF0PorSensor = new Array(nSensores).fill(null);
  for (let s = 0; s < nSensores; s++) {
    if (ativos[s]) memoriaF0PorSensor[s] = [];
  }

  // 20/10/2026: F0 pela regra dos trapézios com o intervalo REAL entre leituras
  // (SGO_QualifTermica_Calculos.js). Antes era Σ L(T)·Δt com Δt = mediana do
  // arquivo e uma parcela por leitura: N leituras somavam N intervalos para um
  // patamar que dura N − 1 intervalos (ex.: 3 min a cada 30 s = 7 leituras →
  // 3,5 min contados, F0 superestimado em 1/6) e lacunas no registro não eram
  // vistas. Intervalo maior que QUALIDADE_DADOS.lacunaMaxIntervalos × Δt não soma
  // (vira trava de qualidade dos dados).
  const qdCfg = (AutoRel_UCFG && AutoRel_UCFG.QUALIDADE_DADOS) || {};
  const maxIntervaloF0Ms = Math.max(1, Number(qdCfg.lacunaMaxIntervalos) || 3) * dtMin * 60000;
  analise.lacunasF0 = [];
  if (analise.faseInicioExp !== -1 && analise.faseFimExp !== -1 && analise.faseFimExp >= analise.faseInicioExp) {
    for (let s = 0; s < nSensores; s++) {
      if (!ativos[s]) continue;
      const pontos = [];
      for (let i = analise.faseInicioExp; i <= analise.faseFimExp; i++) {
        pontos.push({ ms: AutoRel_converterTempoLinhaParaMsAnalise_(linhas[i]), t: linhas[i].temperaturas[s] });
      }
      const integ = SGO_QT_letalidadeTrapezio_(pontos, cfg.tBase, cfg.z, { maxIntervaloMs: maxIntervaloF0Ms });
      f0Acumulado[s] = integ.total;
      integ.lacunas.forEach(function(l) { analise.lacunasF0.push({ sensor: 'S' + (s + 1), motivo: l.motivo, ms0: l.ms0, ms1: l.ms1 }); });
      integ.linhas.forEach(function(l, k) {
        if (l.t === null) return;
        memoriaF0PorSensor[s].push({
          tempoStr: linhas[analise.faseInicioExp + k].tempoStr || '',
          ms: l.ms,
          temperatura: l.t,
          fator: l.fator,
          dtMin: l.dtMin,
          contribuicao: l.contribuicao,
          acumulado: l.acumulado
        });
      });
    }

    for (let i = analise.faseInicioExp; i <= analise.faseFimExp; i++) {
      const row = linhas[i];

      for (let s = 0; s < nSensores; s++) {
        if (!ativos[s]) continue;

        const t = row.temperaturas[s];
        if (t === null || !isFinite(t)) continue;

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
    return AutoRel_roundAnalise_(v, 4);
  });

  analise.memoriaF0PorSensor = memoriaF0PorSensor;

  const f0Ativos = analise.f0PorSensor.filter(function(v) {
    return v !== null && isFinite(v);
  });

  analise.mediaF0 = f0Ativos.length ? AutoRel_roundAnalise_(AutoRel_mediaArrayAnalise_(f0Ativos), 4) : 0;
  analise.minF0 = f0Ativos.length ? AutoRel_roundAnalise_(Math.min.apply(null, f0Ativos), 4) : 0;
  analise.maxF0 = f0Ativos.length ? AutoRel_roundAnalise_(Math.max.apply(null, f0Ativos), 4) : 0;

  // ==========================================================
  // PASSO 5 — Médias finais e pior sensor
  // ==========================================================
  analise.stats.globalTemp.media = analise.stats.globalTemp.count
    ? AutoRel_roundAnalise_(analise.stats.globalTemp.soma / analise.stats.globalTemp.count, 2)
    : 0;

  analise.stats.globalPres.media = analise.stats.globalPres.count
    ? AutoRel_roundAnalise_(analise.stats.globalPres.soma / analise.stats.globalPres.count, 3)
    : 0;

  analise.stats.exposicaoTemp.media = analise.stats.exposicaoTemp.count
    ? AutoRel_roundAnalise_(analise.stats.exposicaoTemp.soma / analise.stats.exposicaoTemp.count, 2)
    : 0;

  analise.stats.globalTemp.min = analise.stats.globalTemp.min !== null ? AutoRel_roundAnalise_(analise.stats.globalTemp.min, 2) : 0;
  analise.stats.globalTemp.max = analise.stats.globalTemp.max !== null ? AutoRel_roundAnalise_(analise.stats.globalTemp.max, 2) : 0;
  analise.stats.globalPres.min = analise.stats.globalPres.min !== null ? AutoRel_roundAnalise_(analise.stats.globalPres.min, 3) : 0;
  analise.stats.globalPres.max = analise.stats.globalPres.max !== null ? AutoRel_roundAnalise_(analise.stats.globalPres.max, 3) : 0;
  analise.stats.exposicaoTemp.min = analise.stats.exposicaoTemp.min !== null ? AutoRel_roundAnalise_(analise.stats.exposicaoTemp.min, 2) : 0;
  analise.stats.exposicaoTemp.max = analise.stats.exposicaoTemp.max !== null ? AutoRel_roundAnalise_(analise.stats.exposicaoTemp.max, 2) : 0;

  for (let s = 0; s < nSensores; s++) {
    if (!ativos[s]) continue;

    analise.stats.sensores[s].media = analise.stats.sensores[s].count
      ? AutoRel_roundAnalise_(analise.stats.sensores[s].soma / analise.stats.sensores[s].count, 2)
      : 0;

    analise.stats.sensores[s].min = analise.stats.sensores[s].min !== null
      ? AutoRel_roundAnalise_(analise.stats.sensores[s].min, 2)
      : 0;

    analise.stats.sensores[s].max = analise.stats.sensores[s].max !== null
      ? AutoRel_roundAnalise_(analise.stats.sensores[s].max, 2)
      : 0;

    analise.stats.sensores[s].mediaExposicao = analise.stats.sensores[s].countExposicao
      ? AutoRel_roundAnalise_(analise.stats.sensores[s].somaExposicao / analise.stats.sensores[s].countExposicao, 2)
      : null;

    analise.stats.sensores[s].minExposicao = analise.stats.sensores[s].minExposicao !== null
      ? AutoRel_roundAnalise_(analise.stats.sensores[s].minExposicao, 2)
      : null;

    analise.stats.sensores[s].maxExposicao = analise.stats.sensores[s].maxExposicao !== null
      ? AutoRel_roundAnalise_(analise.stats.sensores[s].maxExposicao, 2)
      : null;
  }

  analise.piorSensorF0 = AutoRel_encontrarPiorSensorF0_(analise.f0PorSensor, ativos);
  analise.piorSensorTemperatura = AutoRel_encontrarPiorSensorTemperaturaExposicao_(analise.stats.sensores, ativos);

  // ==========================================================
  // PASSO 6 — Tempos
  // ==========================================================
  analise.tempoExposicao = (analise.faseInicioExp !== -1 && analise.faseFimExp !== -1)
    ? Math.max(0, analise.faseFimExp - analise.faseInicioExp + 1)
    : 0;

  analise.tempoTotalMinutos = AutoRel_calcularDiferencaTempo(
    linhas[0].tempoStr,
    linhas[linhas.length - 1].tempoStr,
    linhas[0].tempoDate,
    linhas[linhas.length - 1].tempoDate
  );

  if (analise.faseInicioExp !== -1 && analise.faseFimExp !== -1) {
    analise.tempoExposicaoMinutos = AutoRel_calcularDiferencaTempo(
      linhas[analise.faseInicioExp].tempoStr,
      linhas[analise.faseFimExp].tempoStr,
      linhas[analise.faseInicioExp].tempoDate,
      linhas[analise.faseFimExp].tempoDate
    );

    if (analise.tempoExposicaoMinutos === 0 && analise.tempoExposicao > 0) {
      analise.tempoExposicaoMinutos = AutoRel_roundAnalise_(Math.max(0, analise.tempoExposicao - 1) * dtMin, 2);
    }
  } else {
    analise.tempoExposicaoMinutos = 0;
  }

  analise.deltaMinutosEstimado = AutoRel_roundAnalise_(dtMin, 4);

  // ==========================================================
  // PASSO 7 — Aprovação / Reprovação
  // ==========================================================
  analise.aprovado = true;
  analise.statusAprovacao = 'APROVADO';

  // Decisão do dono (17/10/2026): nada é aprovado abaixo do mínimo da norma.
  // O limite de aprovação é o F0 mínimo normativo; a antiga faixa "aprovado
  // com alerta" (operacional − tolerância) deixou de existir. Acima do mínimo,
  // mas a menos de 10% dele, o ciclo é aprovado com observação.
  const f0MinNormativo = AutoRel_parseFloatSeguroAnalise_(cfg.f0MinNormativo, AutoRel_parseFloatSeguroAnalise_(cfg.f0Min, 0));
  const f0MinOperacional = f0MinNormativo;
  const toleranciaF0 = 0;
  const limiteAprovacaoF0 = Math.max(0, f0MinNormativo);
  const margemObservacaoF0 = AutoRel_parseFloatSeguroAnalise_(cfg.margemObservacaoPercentual, 10);

  analise.limitesAprovacao = {
    f0MinNormativo: AutoRel_roundAnalise_(f0MinNormativo, 4),
    f0MinOperacional: AutoRel_roundAnalise_(f0MinOperacional, 4),
    toleranciaF0: AutoRel_roundAnalise_(toleranciaF0, 4),
    limiteAprovacaoF0: AutoRel_roundAnalise_(limiteAprovacaoF0, 4)
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
        ') obteve ' + SGO_DocA4_num_(analise.minF0, 2) +
        ' min, abaixo do F0 mínimo normativo de ' + SGO_DocA4_num_(limiteAprovacaoF0, 2) + ' min.'
      );
    } else if (limiteAprovacaoF0 > 0 && analise.minF0 < limiteAprovacaoF0 * (1 + margemObservacaoF0 / 100)) {
      analise.observacoesAnalise.push(
        'F0 mínimo próximo do limite: o pior sensor ativo (' + (analise.piorSensorF0 ? analise.piorSensorF0.sensor : 'N/A') +
        ') obteve ' + SGO_DocA4_num_(analise.minF0, 2) + ' min, acima do mínimo normativo de ' +
        SGO_DocA4_num_(limiteAprovacaoF0, 2) + ' min, porém a menos de ' + SGO_DocA4_num_(margemObservacaoF0) +
        '% dele. Recomenda-se acompanhar este ponto nas próximas requalificações.'
      );
    }
  } else {
    analise.aprovado = false;
    analise.statusAprovacao = 'REPROVADO';
    analise.motivosReprovacao.push('Não foi possível calcular F0 válido para os sensores ativos.');
  }

  // ==========================================================
  // PASSO 7B — Critérios do patamar (vapor) e qualidade dos dados (20/10/2026)
  // ==========================================================
  const sensorRefIdx = AutoRel_sensorReferenciaIdx_(opcoesAnalise, ativos);
  analise.sensorReferencia = sensorRefIdx >= 0 ? 'S' + (sensorRefIdx + 1) : '';
  analise.semPressao = !!(opcoesAnalise && opcoesAnalise.semPressao);
  analise.criteriosPatamar = AutoRel_avaliarCriteriosPatamar_(linhas, analise, cfg, sensoresAtivosIdx, dtMin, sensorRefIdx);
  analise.qualidadeDados = AutoRel_avaliarQualidadeDados_(linhas, analise, cfg, sensoresAtivosIdx, dtMin);
  (analise.criteriosPatamar.lista || []).forEach(function(c) {
    if (c.situacao === 'NAO_CONFORME') {
      analise.aprovado = false;
      analise.statusAprovacao = 'REPROVADO';
      analise.motivosReprovacao.push(c.motivo);
    }
  });
  analise.emissaoBloqueada = analise.qualidadeDados.travas.length > 0;
  analise.qualidadeDados.alertas.forEach(function(t) { analise.alertasAnalise.push(t); });

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
function AutoRel_detectarFasesProcesso_(linhas, analise, cfg, opcoesAnalise) {
  const equipamento = Object.assign({}, (cfg && cfg.equipamento) || {}, (opcoesAnalise && opcoesAnalise.equipamento) || {});
  const modo = String(equipamento.modoRemocaoAr || 'AUTO').toUpperCase();
  const unidade = String(equipamento.unidadePressao || 'BAR_ABS').toUpperCase();
  const referencia = AutoRel_parseFloatSeguroAnalise_(equipamento.referenciaAtmosfericaBar, 1.01325);
  const amplitude = Math.max(0.001, AutoRel_parseFloatSeguroAnalise_(equipamento.minimoAmplitudeEvacuacaoBar, 0.05));
  const histerese = Math.min(amplitude / 2, Math.max(0, AutoRel_parseFloatSeguroAnalise_(equipamento.histeresePressaoBar, 0.01)));
  const duracao = Math.max(0, AutoRel_parseFloatSeguroAnalise_(equipamento.minimoDuracaoEvacuacaoSeg, 2));
  const limites = { vacuo: referencia - amplitude, recuperacao: referencia - amplitude + histerese,
    amplitude: amplitude, duracaoSeg: duracao, pulsoPositivo: referencia + 0.2, atmosfericoMin: referencia - 0.1, atmosfericoMax: referencia + 0.14 };
  const fases = { versao: '2.0', unidadePressao: 'bar abs', limites: limites, segmentos: [], pulsosPreVacuo: [], eventosPorIndice: {}, fasePorIndice: {} };
  const diagnostico = { status: 'INDETERMINADO', aplicabilidade: 'INDETERMINADO', modoRemocaoAr: modo,
    origem: equipamento.modoRemocaoAr && modo !== 'AUTO' ? 'CONFIGURADO' : 'AUTO', unidadePressaoOriginal: unidade,
    referenciaAtmosfericaBar: referencia, contagemEvacuacoes: 0, pressaoMinimaBarAbs: null,
    limitacoes: [], criteriosObservacionais: { minimoAmplitudeEvacuacaoBar: amplitude, minimoDuracaoEvacuacaoSeg: duracao, histeresePressaoBar: histerese } };
  fases.diagnostico = diagnostico;
  if (!linhas || !linhas.length) return fases;
  const unidadesValidas = ['BAR_ABS', 'BAR_REL', 'MBAR_ABS', 'KPA_ABS'];
  const modosValidos = ['AUTO', 'PRE_VACUO', 'GRAVITACIONAL', 'SFPP'];
  const valido = unidadesValidas.indexOf(unidade) >= 0 && modosValidos.indexOf(modo) >= 0 && referencia > 0;
  if (!valido) diagnostico.limitacoes.push('Configuração de pressão ou remoção de ar inválida; classificação observacional indisponível.');
  const observadas = linhas.map(function(row) {
    let p = AutoRel_parseFloatSeguroAnalise_(row.pressao, null);
    if (p !== null && isFinite(p) && valido) {
      if (unidade === 'BAR_REL') p += referencia;
      if (unidade === 'MBAR_ABS') p /= 1000;
      if (unidade === 'KPA_ABS') p /= 100;
      if (p < 0) p = null;
    } else p = null;
    return Object.assign({}, row, { pressao: p });
  });
  const fim = linhas.length - 1;
  const inicioExp = typeof analise.faseInicioExp === 'number' ? analise.faseInicioExp : -1;
  const fimExp = typeof analise.faseFimExp === 'number' ? analise.faseFimExp : -1;
  const fimBusca = inicioExp >= 0 ? inicioExp - 1 : -1;
  const dadosPre = observadas.slice(0, Math.max(0, fimBusca + 1));
  const validas = dadosPre.filter(function(r) { return r.pressao !== null && isFinite(r.pressao); });
  const intervalos = [];
  for (let i = 1; i < dadosPre.length; i++) {
    const antes = dadosPre[i - 1].tempoDate, depois = dadosPre[i].tempoDate;
    const dt = antes && depois && typeof antes.getTime === 'function' && typeof depois.getTime === 'function' ? (depois.getTime() - antes.getTime()) / 1000 : NaN;
    if (isFinite(dt) && dt > 0) intervalos.push(dt);
  }
  const ordenados = intervalos.slice().sort(function(x, y) { return x - y; });
  const meio = Math.floor(ordenados.length / 2);
  const mediana = ordenados.length ? (ordenados.length % 2 ? ordenados[meio] : (ordenados[meio - 1] + ordenados[meio]) / 2) : null;
  limites.maxIntervaloSeg = mediana === null ? null : mediana * 3;
  diagnostico.intervaloAmostralMedianoSeg = mediana;
  diagnostico.intervaloAmostralMaximoSeg = intervalos.length ? Math.max.apply(null, intervalos) : null;
  diagnostico.limitacoes.push('Contagem mínima observada na frequência registrada; pulsos entre amostras podem não ser identificados.');
  if (validas.length < 3) diagnostico.limitacoes.push('Menos de três leituras de pressão antes da exposição; dados insuficientes para excluir evacuações.');
  if (validas.length) diagnostico.pressaoMinimaBarAbs = AutoRel_roundAnalise_(Math.min.apply(null, validas.map(function(r) { return r.pressao; })), 4);
  if (validas.length !== dadosPre.length) diagnostico.limitacoes.push('Pressão ausente ou inválida no condicionamento; trechos incompletos não permitem excluir evacuações.');
  if (inicioExp < 0) diagnostico.limitacoes.push('Exposição não identificada; o limite final do condicionamento é indeterminado.');
  if (!equipamento.unidadePressao) diagnostico.limitacoes.push('Unidade não informada: leitura interpretada como bar absoluto por compatibilidade; confirmar na fonte.');
  AutoRel_adicionarEventoFase_(fases, 0, 'INÍCIO DO CICLO');
  AutoRel_adicionarSegmentoFase_(fases, 'CICLO', 0, fim, linhas);
  if (valido && modo !== 'GRAVITACIONAL' && modo !== 'SFPP') {
    fases.pulsosPreVacuo = AutoRel_detectarPulsosPreVacuo_(observadas, 0, fimBusca, limites);
    if (fases.pulsosPreVacuo.limitacoes) diagnostico.limitacoes = diagnostico.limitacoes.concat(fases.pulsosPreVacuo.limitacoes);
  }
  diagnostico.contagemEvacuacoes = fases.pulsosPreVacuo.length;
  const incompleto = validas.length !== dadosPre.length || validas.length < 3 || inicioExp < 0 || !valido || fases.pulsosPreVacuo.incompleto;
  diagnostico.status = modo === 'GRAVITACIONAL' || modo === 'SFPP' ? 'NAO_APLICAVEL' : fases.pulsosPreVacuo.length ? 'DETECTADO' : incompleto ? 'INDETERMINADO' : 'NAO_DETECTADO';
  diagnostico.aplicabilidade = diagnostico.status;
  diagnostico.limitacoes.push('Contagem observacional de evacuações recuperadas; não comprova remoção de ar, eficácia da bomba ou conformidade normativa.');
  fases.pulsosPreVacuo.forEach(function(pulso) {
    AutoRel_adicionarSegmentoFase_(fases, 'PRE_VACUO', pulso.inicioIdx, pulso.fimIdx, linhas, { numero: pulso.numero });
    AutoRel_adicionarEventoFase_(fases, pulso.inicioIdx, 'INÍCIO DA EVACUAÇÃO OBSERVADA ' + pulso.numero);
    AutoRel_adicionarEventoFase_(fases, pulso.minPressaoIdx, 'MÍNIMO DE PRESSÃO ' + pulso.numero + ' (' + SGO_DocA4_num_(pulso.pressaoMin, 3) + ' bar abs)');
    AutoRel_adicionarEventoFase_(fases, pulso.fimIdx, 'RECUPERAÇÃO DA PRESSÃO - EVACUAÇÃO ' + pulso.numero);
  });
  const inicioRampaLegado = typeof analise.faseInicioRampa === 'number' && analise.faseInicioRampa >= 0 ? analise.faseInicioRampa : 0;
  const ultimoPulso = fases.pulsosPreVacuo.length ? fases.pulsosPreVacuo[fases.pulsosPreVacuo.length - 1] : null;
  const inicioRampa = ultimoPulso ? Math.max(inicioRampaLegado, ultimoPulso.fimIdx + 1) : inicioRampaLegado;
  if (inicioExp > inicioRampa) {
    AutoRel_adicionarSegmentoFase_(fases, 'RAMPA_AQUECIMENTO', inicioRampa, inicioExp - 1, linhas);
    AutoRel_adicionarEventoFase_(fases, inicioRampa, 'INÍCIO DA RAMPA DE AQUECIMENTO');
  }
  if (inicioExp >= 0 && fimExp >= inicioExp) {
    AutoRel_adicionarSegmentoFase_(fases, 'ESTERILIZACAO', inicioExp, fimExp, linhas);
    AutoRel_adicionarEventoFase_(fases, inicioExp, 'INÍCIO DA ESTERILIZAÇÃO / EXPOSIÇÃO');
    AutoRel_adicionarEventoFase_(fases, fimExp, 'TÉRMINO DA ESTERILIZAÇÃO / EXPOSIÇÃO');
  }
  const pos = valido ? AutoRel_detectarSecagemDespressurizacao_(observadas, fimExp >= 0 ? fimExp + 1 : -1, fim, limites) : {};
  fases.posExposicao = {
    descricaoObservacional: pos.descricaoObservacional || '',
    retornoAtmosfericoConfirmado: !!pos.retornoAtmosfericoConfirmado,
    inicioDespressurizacaoIdx: pos.inicioDespressurizacaoIdx,
    diagnostico: pos.diagnostico || {}, secagem: pos.secagem || null,
    despressurizacao: pos.despressurizacao || null
  };
  if (pos.secagem && fimExp >= 0 && pos.secagem.inicioIdx > fimExp + 1) {
    AutoRel_adicionarSegmentoFase_(fases, 'DESPRESSURIZACAO', fimExp + 1, pos.secagem.inicioIdx - 1, linhas);
    AutoRel_adicionarEventoFase_(fases, fimExp + 1, 'DESPRESSURIZAÇÃO PÓS-EXPOSIÇÃO OBSERVADA');
  }
  if (pos.diagnostico && pos.diagnostico.limitacoes) {
    diagnostico.limitacoes = diagnostico.limitacoes.concat(pos.diagnostico.limitacoes);
  }
  ['secagem', 'despressurizacao'].forEach(function(nome) {
    const seg = pos[nome];
    if (!seg) return;
    const tipo = nome === 'secagem' ? 'SECAGEM' : 'DESPRESSURIZACAO';
    AutoRel_adicionarSegmentoFase_(fases, tipo, seg.inicioIdx, seg.fimIdx, linhas);
    const evento = nome === 'secagem'
      ? 'VÁCUO PÓS-EXPOSIÇÃO OBSERVADO (SECAGEM NÃO COMPROVADA)'
      : pos.retornoAtmosfericoConfirmado ? 'RECUPERAÇÃO ATMOSFÉRICA OBSERVADA' : 'DESPRESSURIZAÇÃO PÓS-EXPOSIÇÃO OBSERVADA';
    AutoRel_adicionarEventoFase_(fases, seg.inicioIdx, evento);
  });
  AutoRel_adicionarEventoFase_(fases, fim, 'TÉRMINO DO CICLO / FIM DA GRAVAÇÃO');
  fases.resumo = { pulsosPreVacuo: fases.pulsosPreVacuo.length, contagemEvacuacoes: fases.pulsosPreVacuo.length,
    statusPreVacuo: diagnostico.status, inicioRampa: inicioExp > inicioRampa && linhas[inicioRampa] ? linhas[inicioRampa].tempoStr : '',
    inicioEsterilizacao: inicioExp >= 0 && linhas[inicioExp] ? linhas[inicioExp].tempoStr : '',
    fimEsterilizacao: fimExp >= 0 && linhas[fimExp] ? linhas[fimExp].tempoStr : '',
    secagemDetectada: !!pos.secagem, vacuoPosExposicaoDetectado: !!pos.secagem,
    retornoAtmosfericoConfirmado: !!pos.retornoAtmosfericoConfirmado,
    despressurizacaoDetectada: !!pos.despressurizacao || !!(pos.secagem && pos.inicioDespressurizacaoIdx >= 0 && pos.inicioDespressurizacaoIdx < pos.secagem.inicioIdx) };
  return fases;
}

function AutoRel_detectarPulsosPreVacuo_(linhas, inicio, fim, limites) {
  const pulsos = [];
  pulsos.limitacoes = [];
  pulsos.incompleto = false;
  if (inicio < 0 || fim < inicio) return pulsos;
  let vale = null;
  let anterior = null;
  let picoAnterior = null;
  for (let i = inicio; i <= fim; i++) {
    const p = AutoRel_parseFloatSeguroAnalise_(linhas[i].pressao, null);
    const tempo = linhas[i].tempoDate;
    const ms = tempo && typeof tempo.getTime === 'function' ? tempo.getTime() : NaN;
    if (p === null || !isFinite(p) || !isFinite(ms)) {
      if (vale) pulsos.incompleto = true;
      vale = null; anterior = null; picoAnterior = null;
      continue;
    }
    if (anterior && limites.maxIntervaloSeg && (ms - anterior.ms) / 1000 > limites.maxIntervaloSeg) {
      pulsos.incompleto = true;
      if (!pulsos.limitacoes.some(function(t) { return t.indexOf('Lacuna temporal') === 0; })) pulsos.limitacoes.push('Lacuna temporal maior que três intervalos medianos; evacuações não são conectadas através da lacuna.');
      vale = null; anterior = null;
    }
    if (anterior && ms <= anterior.ms) { pulsos.incompleto = true; vale = null; anterior = null; }
    if (!vale && p <= limites.vacuo) {
      vale = { inicioIdx: anterior ? anterior.idx : i, inicioVacuoIdx: i, minPressaoIdx: i,
        min: p, inicioMs: ms, parcial: !anterior, picoAnterior: picoAnterior };
      if (vale.parcial) { pulsos.incompleto = true; pulsos.limitacoes.push('Registro começa em vácuo ou após lacuna: início da evacuação não observado.'); }
    }
    if (vale) {
      if (p < vale.min) { vale.min = p; vale.minPressaoIdx = i; }
      if (p >= limites.recuperacao && p - vale.min >= limites.amplitude) {
        const segundos = (ms - vale.inicioMs) / 1000;
        if (segundos >= limites.duracaoSeg && i > vale.inicioVacuoIdx &&
            (vale.parcial || (vale.picoAnterior !== null && vale.picoAnterior - vale.min >= limites.amplitude))) {
          pulsos.push({ numero: pulsos.length + 1, inicioIdx: vale.inicioIdx, fimIdx: i,
            inicioVacuoIdx: vale.inicioVacuoIdx, minPressaoIdx: vale.minPressaoIdx, picoPressaoIdx: i,
            pressaoMin: AutoRel_roundAnalise_(vale.min, 4), pressaoMax: AutoRel_roundAnalise_(p, 4),
            duracaoSegundos: segundos, inicioParcial: vale.parcial });
        }
        vale = null;
        picoAnterior = p;
      }
    }
    if (!vale && (picoAnterior === null || p > picoAnterior)) picoAnterior = p;
    anterior = { idx: i, ms: ms };
  }
  if (vale) { pulsos.incompleto = true; pulsos.limitacoes.push('Evacuação sem recuperação observada antes da exposição ou do fim do arquivo; não contada como pulso completo.'); }
  return pulsos;
}
function AutoRel_detectarSecagemDespressurizacao_(linhas, inicio, fim, limites) {
  const out = { secagem: null, despressurizacao: null,
    descricaoObservacional: 'Intervalo pós-exposição: pressão registrada, sem comprovação de secagem ou liberação.',
    retornoAtmosfericoConfirmado: false, inicioDespressurizacaoIdx: inicio,
    diagnostico: { natureza: 'OBSERVACIONAL', vacuoPosExposicaoObservado: false,
      retornoAtmosfericoObservado: false, limitacoes: ['Pressão pós-exposição não comprova secagem da carga nem condição de liberação.'] } };
  if (inicio < 0 || fim < inicio) return out;

  let inicioSec = -1;
  let idxMin = -1;
  let minP = null;

  for (let i = inicio; i <= fim; i++) {
    const p = AutoRel_parseFloatSeguroAnalise_(linhas[i].pressao, null);
    if (p === null || !isFinite(p)) continue;
    if (inicioSec === -1 && p < limites.vacuo) inicioSec = i;
    if (minP === null || p < minP) {
      minP = p;
      idxMin = i;
    }
  }

  if (inicioSec === -1) {
    // Queda de pressão sem vácuo observado não constitui evidência de secagem.
    if (idxMin !== -1) out.despressurizacao = { inicioIdx: inicio, fimIdx: fim };
    return out;
  }
  out.diagnostico.vacuoPosExposicaoObservado = true;
  out.descricaoObservacional = 'Vácuo pós-exposição observado; a curva de pressão não comprova secagem da carga.';

  let inicioDespress = -1;
  const baseBusca = Math.max(inicioSec, idxMin);
  for (let j = baseBusca; j <= fim; j++) {
    const p1 = AutoRel_parseFloatSeguroAnalise_(linhas[j].pressao, null);
    const p2 = j + 1 <= fim ? AutoRel_parseFloatSeguroAnalise_(linhas[j + 1].pressao, null) : p1;
    if (j < fim && p1 !== null && p2 !== null &&
        p1 >= limites.atmosfericoMin && p1 <= limites.atmosfericoMax &&
        p2 >= limites.atmosfericoMin && p2 <= limites.atmosfericoMax) {
      inicioDespress = j;
      break;
    }
  }

  if (inicioDespress > inicioSec) {
    out.diagnostico.retornoAtmosfericoObservado = true;
    out.retornoAtmosfericoConfirmado = true;
    out.inicioDespressurizacaoIdx = inicioDespress;
    out.secagem = { inicioIdx: inicioSec, fimIdx: inicioDespress - 1 };
    out.despressurizacao = { inicioIdx: inicioDespress, fimIdx: fim };
  } else {
    out.secagem = { inicioIdx: inicioSec, fimIdx: fim };
  }

  return out;
}

function AutoRel_adicionarSegmentoFase_(fases, tipo, inicioIdx, fimIdx, linhas, extra) {
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

function AutoRel_adicionarEventoFase_(fases, idx, texto) {
  idx = Number(idx);
  if (!isFinite(idx) || idx < 0) return;
  const k = String(idx);
  if (!fases.eventosPorIndice[k]) fases.eventosPorIndice[k] = [];
  if (fases.eventosPorIndice[k].indexOf(texto) === -1) fases.eventosPorIndice[k].push(texto);
}
function AutoRel_obterParametrosRobustosExposicao_(cfg, dtMin, opcoesAnalise) {
  const raizCfg = (AutoRel_UCFG && AutoRel_UCFG.ANALISE) ? AutoRel_UCFG.ANALISE : {};
  const cfgCiclo = (cfg && cfg.analise) ? cfg.analise : {};
  const cfgOpcoes = (opcoesAnalise && opcoesAnalise.robustez) ? opcoesAnalise.robustez : {};

  const histerese = AutoRel_valorNumericoPrioritario_([
    cfgOpcoes.histereseTemperatura,
    cfgCiclo.histereseTemperatura,
    raizCfg.histereseTemperatura,
    0.5
  ], 0.5);

  const consecutivasInicio = Math.max(1, AutoRel_parseIntPrioritario_([
    cfgOpcoes.consecutivasInicio,
    cfgCiclo.consecutivasInicio,
    raizCfg.consecutivasInicio,
    2
  ], 2));

  const consecutivasFim = Math.max(1, AutoRel_parseIntPrioritario_([
    cfgOpcoes.consecutivasFim,
    cfgCiclo.consecutivasFim,
    raizCfg.consecutivasFim,
    3
  ], 3));

  const toleranciaEntrada = AutoRel_valorNumericoPrioritario_([
    cfgOpcoes.toleranciaEntrada,
    cfgCiclo.toleranciaEntrada,
    raizCfg.toleranciaEntrada,
    0.0
  ], 0.0);

  const toleranciaSaida = AutoRel_valorNumericoPrioritario_([
    cfgOpcoes.toleranciaSaida,
    cfgCiclo.toleranciaSaida,
    raizCfg.toleranciaSaida,
    histerese
  ], histerese);

  const modoReconhecimentoExposicao = String(AutoRel_valorPrioritario_([
    cfgOpcoes.modoReconhecimentoExposicao,
    cfgCiclo.modoReconhecimentoExposicao,
    raizCfg.modoReconhecimentoExposicao,
    'PIOR_SENSOR'
  ], 'PIOR_SENSOR')).toUpperCase().trim();

  const percentualMinimoSensores = AutoRel_limitarEntre_(
    AutoRel_valorNumericoPrioritario_([
      cfgOpcoes.percentualMinimoSensores,
      cfgCiclo.percentualMinimoSensores,
      raizCfg.percentualMinimoSensores,
      1.0
    ], 1.0),
    0.01,
    1.0
  );

  const tMin = AutoRel_parseFloatSeguroAnalise_(cfg.tMin, 0);

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
function AutoRel_avaliarLinhaParaExposicao_(row, sensoresAtivosIdx, paramsAnalise, etapa) {
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
      percentualValido: AutoRel_roundAnalise_(percentualValido, 4)
    };
  }

  valida = sensoresValidos === sensoresComLeitura;
  return {
    valida: valida,
    sensoresValidos: sensoresValidos,
    sensoresComLeitura: sensoresComLeitura,
    percentualValido: sensoresComLeitura ? AutoRel_roundAnalise_(sensoresValidos / sensoresComLeitura, 4) : 0
  };
}

// ------------------------------------------------------------
// EXTRAI OVERRIDE MANUAL
// ------------------------------------------------------------
function AutoRel_extrairOverrideJanela_(opcoesAnalise) {
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
function AutoRel_localizarIndicePorTempo_(linhas, alvo, comparador, fallback) {
  const alvoMs = AutoRel_converterTempoParaMsAnalise_(alvo);
  if (!isFinite(alvoMs)) return null;

  if (comparador === '>=') {
    for (let i = 0; i < linhas.length; i++) {
      const ms = AutoRel_converterTempoLinhaParaMsAnalise_(linhas[i]);
      if (isFinite(ms) && ms >= alvoMs) return i;
    }
    return fallback === undefined ? null : fallback;
  }

  if (comparador === '<=') {
    for (let i = linhas.length - 1; i >= 0; i--) {
      const ms = AutoRel_converterTempoLinhaParaMsAnalise_(linhas[i]);
      if (isFinite(ms) && ms <= alvoMs) return i;
    }
    return fallback === undefined ? null : fallback;
  }

  return null;
}

function AutoRel_converterTempoLinhaParaMsAnalise_(row) {
  if (row && row.tempoDate instanceof Date && !isNaN(row.tempoDate.getTime())) {
    return row.tempoDate.getTime();
  }
  return AutoRel_parseTempoSeguroAnalise_(row ? row.tempoStr : '');
}

function AutoRel_converterTempoParaMsAnalise_(valor) {
  if (valor instanceof Date && !isNaN(valor.getTime())) {
    return valor.getTime();
  }
  return AutoRel_parseTempoSeguroAnalise_(valor);
}

// ------------------------------------------------------------
// AUXILIAR: normaliza vetor de sensores ativos
// ------------------------------------------------------------
function AutoRel_normalizarSensoresAtivos_(sensoresAtivos, nSensores) {
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
function AutoRel_encontrarPiorSensorF0_(f0PorSensor, ativos) {
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
    valor: AutoRel_roundAnalise_(piorValor, 4)
  };
}

// ------------------------------------------------------------
// AUXILIAR: pior sensor térmico na exposição
// ------------------------------------------------------------
function AutoRel_encontrarPiorSensorTemperaturaExposicao_(statsSensores, ativos) {
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
    valor: AutoRel_roundAnalise_(piorValor, 2)
  };
}

// ------------------------------------------------------------
// FUNÇÃO AUXILIAR PARA CÁLCULO DE TEMPO
// ------------------------------------------------------------
// 20/10/2026: minutos com 4 casas (antes 1: a taxa de vazamento era dividida por um tempo já
// arredondado e a exposição de 3,83 min aparecia como 3,80 min).
function AutoRel_calcularDiferencaTempo(str1, str2, dt1, dt2) {
  try {
    if (dt1 instanceof Date && !isNaN(dt1.getTime()) && dt2 instanceof Date && !isNaN(dt2.getTime())) {
      const diffMs = dt2.getTime() - dt1.getTime();
      return diffMs > 0 ? AutoRel_roundAnalise_(diffMs / 60000, 4) : 0;
    }

    const ms1 = AutoRel_parseTempoSeguroAnalise_(str1);
    const ms2 = AutoRel_parseTempoSeguroAnalise_(str2);

    if (!isFinite(ms1) || !isFinite(ms2)) return 0;

    const diffMs = ms2 - ms1;
    return diffMs > 0 ? AutoRel_roundAnalise_(diffMs / 60000, 4) : 0;
  } catch (e) {
    return 0;
  }
}

// ------------------------------------------------------------
// ESTIMAÇÃO DE DELTA DE TEMPO ENTRE LINHAS
// ------------------------------------------------------------
function AutoRel_estimarDeltaMinutos_(dados) {
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
function AutoRel_parseFloatSeguroAnalise_(valor, fallback) {
  if (valor === null || valor === undefined || valor === '') return fallback;

  if (typeof valor === 'number') {
    return isFinite(valor) ? valor : fallback;
  }

  const normalizado = String(valor).replace(',', '.').trim();
  const n = Number(normalizado);
  return isFinite(n) ? n : fallback;
}

function AutoRel_mediaArrayAnalise_(arr) {
  if (!arr || !arr.length) return 0;
  return arr.reduce(function(a, b) { return a + b; }, 0) / arr.length;
}

function AutoRel_roundAnalise_(n, d) {
  const p = Math.pow(10, d || 0);
  return Math.round((Number(n) || 0) * p) / p;
}

function AutoRel_valorNumericoPrioritario_(lista, fallback) {
  for (let i = 0; i < lista.length; i++) {
    const n = Number(lista[i]);
    if (isFinite(n)) return n;
  }
  return fallback;
}

function AutoRel_valorPrioritario_(lista, fallback) {
  for (let i = 0; i < lista.length; i++) {
    const v = lista[i];
    if (v !== null && v !== undefined && String(v).trim() !== '') return v;
  }
  return fallback;
}

function AutoRel_parseIntPrioritario_(lista, fallback) {
  for (let i = 0; i < lista.length; i++) {
    const n = parseInt(lista[i], 10);
    if (isFinite(n)) return n;
  }
  return fallback;
}

function AutoRel_limitarEntre_(valor, min, max) {
  valor = Number(valor);
  if (!isFinite(valor)) return min;
  return Math.max(min, Math.min(max, valor));
}

function AutoRel_parseTempoSeguroAnalise_(valor) {
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



// ------------------------------------------------------------
// CRITÉRIOS DO PATAMAR (VAPOR) E QUALIDADE DOS DADOS — 20/10/2026
// Os limites vêm de CICLOS[...].criterios (Config). Cada critério devolve
// situacao CONFORME | NAO_CONFORME | NAO_AVALIADO, com requisito, valor
// obtido e motivo em texto pt-BR. A comparação usa os valores arredondados
// a 2 casas, as mesmas mostradas no documento (o documento nunca mostra
// "3,00 min" reprovado por 2,999 min).
// ------------------------------------------------------------
function AutoRel_sensorReferenciaIdx_(opcoesAnalise, ativos) {
  const n = parseInt(opcoesAnalise && opcoesAnalise.sensorReferencia, 10);
  if (isFinite(n) && n >= 1 && n <= ativos.length && ativos[n - 1]) return n - 1;
  return -1;
}

function AutoRel_horaLinhaAnalise_(row) {
  const s = String((row && row.tempoStr) || '').trim();
  const m = s.match(/(\d{1,2}:\d{2}:\d{2})\s*$/);
  return m ? m[1] : (s || '—');
}

function AutoRel_horaMsAnalise_(msValor) {
  try { return Utilities.formatDate(new Date(msValor), AutoRel_UCFG.TZ || 'America/Sao_Paulo', 'HH:mm:ss'); } catch (e) { return '—'; }
}

function AutoRel_leiturasAtivasLinha_(row, idxAtivos) {
  const out = [];
  idxAtivos.forEach(function(s) {
    const t = row.temperaturas[s];
    if (t !== null && t !== undefined && isFinite(t)) out.push({ s: s, t: t });
  });
  return out;
}

function AutoRel_avaliarCriteriosPatamar_(linhas, analise, cfg, idxAtivos, dtMin, refIdx) {
  const crit = cfg && cfg.criterios;
  const refs = (AutoRel_UCFG && AutoRel_UCFG.CRITERIOS_REFERENCIAS) || {};
  const out = { aplicavel: !!crit && String(cfg.tipoProcesso || '') === 'VAPOR', lista: [], patamar: null };
  if (!out.aplicavel) return out;

  const num = SGO_DocA4_num_;
  const r2 = function(v) { return AutoRel_roundAnalise_(v, 2); };
  const tMin = Number(cfg.tMin), tMax = Number(cfg.tMax);
  const ini = analise.faseInicioExp, fimExp = analise.faseFimExp;
  const ms = AutoRel_converterTempoLinhaParaMsAnalise_;

  function item(chave, criterio, requisito, obtido, situacao, motivo, extra) {
    const ref = refs[chave] || {};
    out.lista.push(Object.assign({
      chave: chave, criterio: criterio, requisito: requisito, obtido: obtido, situacao: situacao, motivo: motivo || '',
      referencia: ref.referencia || '', obrigatorio: ref.obrigatorio !== false
    }, extra || {}));
  }

  const tReq = Number(crit.tempoMinimoPatamarMin);
  const varMax = Number(crit.variacaoMaxEntreSensoresK);
  const eqMax = Number(crit.tempoEquilibrioMaxSeg);
  const vsMax = Number(crit.desvioMaxVaporSaturadoK);
  const reqTempo = '≥ ' + num(tReq, 0) + ' min com todos os sensores ativos na temperatura de esterilização';
  const reqFaixa = 'De ' + num(tMin, 1) + ' °C a ' + num(tMax, 1) + ' °C em todos os sensores ativos durante o patamar';
  const reqVar = '≤ ' + num(varMax, 1) + ' °C entre o sensor mais quente e o mais frio, em cada leitura do patamar';
  const reqEq = '≤ ' + num(eqMax, 0) + ' s entre a referência atingir a temperatura de esterilização e todos os sensores a atingirem';
  const reqVs = 'Diferença ≤ ' + num(vsMax, 1) + ' °C entre a temperatura medida e a do vapor saturado calculada pela pressão';

  if (ini < 0 || fimExp < ini) {
    const motivo = 'Não avaliado: a fase de exposição não foi identificada.';
    item('tempoPatamar', 'Tempo de patamar na temperatura de esterilização', reqTempo, 'Não avaliado', 'NAO_AVALIADO', motivo);
    item('faixa', 'Faixa de temperatura de esterilização', reqFaixa, 'Não avaliado', 'NAO_AVALIADO', motivo);
    item('variacao', 'Diferença de temperatura entre sensores', reqVar, 'Não avaliado', 'NAO_AVALIADO', motivo);
    item('equilibrio', 'Tempo de equilíbrio', reqEq, 'Não avaliado', 'NAO_AVALIADO', motivo);
    if (!analise.semPressao) item('vaporSaturado', 'Temperatura medida × vapor saturado', reqVs, 'Não avaliado', 'NAO_AVALIADO', motivo);
    return out;
  }

  // Patamar avaliado: do início da exposição até a última leitura com todos os
  // sensores ativos na temperatura de esterilização (a descida final, que a
  // histerese mantém na janela do F0, não entra nos critérios de faixa e tempo).
  function todosAcima(i) {
    const l = AutoRel_leiturasAtivasLinha_(linhas[i], idxAtivos);
    return l.length > 0 && l.every(function(x) { return r2(x.t) >= tMin; });
  }
  let fimT = fimExp;
  while (fimT > ini && !todosAcima(fimT)) fimT--;
  const duracaoMin = r2((ms(linhas[fimT]) - ms(linhas[ini])) / 60000);
  out.patamar = {
    inicioIdx: ini, fimIdx: fimT, inicio: linhas[ini].tempoStr || '', fim: linhas[fimT].tempoStr || '',
    duracaoMin: duracaoMin, leituras: fimT - ini + 1
  };

  // 1. Tempo de patamar
  if (isFinite(tReq) && tReq > 0) {
    const ok = duracaoMin >= tReq;
    item('tempoPatamar', 'Tempo de patamar na temperatura de esterilização', reqTempo,
      num(duracaoMin, 2) + ' min (' + AutoRel_horaLinhaAnalise_(linhas[ini]) + ' a ' + AutoRel_horaLinhaAnalise_(linhas[fimT]) + ')',
      ok ? 'CONFORME' : 'NAO_CONFORME',
      ok ? '' : 'Tempo de patamar insuficiente: ' + num(duracaoMin, 2) + ' min com todos os sensores ativos na temperatura de esterilização, abaixo do mínimo configurado de ' + num(tReq, 0) + ' min.',
      { valor: duracaoMin, limite: tReq });
  }

  // 2. Faixa e 3. diferença entre sensores
  let minG = null, maxG = null, varG = null, varHora = '';
  for (let i = ini; i <= fimT; i++) {
    const l = AutoRel_leiturasAtivasLinha_(linhas[i], idxAtivos);
    if (!l.length) continue;
    l.forEach(function(x) {
      if (!minG || x.t < minG.t) minG = { t: x.t, s: x.s, hora: AutoRel_horaLinhaAnalise_(linhas[i]) };
      if (!maxG || x.t > maxG.t) maxG = { t: x.t, s: x.s, hora: AutoRel_horaLinhaAnalise_(linhas[i]) };
    });
    if (l.length > 1) {
      const v = Math.max.apply(null, l.map(function(x) { return x.t; })) - Math.min.apply(null, l.map(function(x) { return x.t; }));
      if (varG === null || v > varG) { varG = v; varHora = AutoRel_horaLinhaAnalise_(linhas[i]); }
    }
  }
  if (minG && maxG) {
    const okFaixa = r2(minG.t) >= tMin && r2(maxG.t) <= tMax;
    let motivoFaixa = '';
    if (r2(minG.t) < tMin) motivoFaixa = 'Temperatura abaixo da faixa de esterilização no patamar: ' + num(minG.t, 2) + ' °C no sensor S' + (minG.s + 1) + ' às ' + minG.hora + ', abaixo de ' + num(tMin, 1) + ' °C.';
    if (r2(maxG.t) > tMax) motivoFaixa += (motivoFaixa ? ' ' : '') + 'Temperatura acima da faixa de esterilização no patamar: ' + num(maxG.t, 2) + ' °C no sensor S' + (maxG.s + 1) + ' às ' + maxG.hora + ', acima de ' + num(tMax, 1) + ' °C.';
    item('faixa', 'Faixa de temperatura de esterilização', reqFaixa,
      'Mínima ' + num(minG.t, 2) + ' °C (S' + (minG.s + 1) + '); máxima ' + num(maxG.t, 2) + ' °C (S' + (maxG.s + 1) + ')',
      okFaixa ? 'CONFORME' : 'NAO_CONFORME', motivoFaixa, { valorMin: r2(minG.t), valorMax: r2(maxG.t) });
  }
  if (isFinite(varMax) && varMax > 0) {
    if (varG === null) {
      item('variacao', 'Diferença de temperatura entre sensores', reqVar, 'Não avaliado', 'NAO_AVALIADO', 'Não avaliado: é preciso mais de um sensor ativo.');
    } else {
      const okVar = r2(varG) <= varMax;
      item('variacao', 'Diferença de temperatura entre sensores', reqVar, 'Maior diferença: ' + num(varG, 2) + ' °C (às ' + varHora + ')',
        okVar ? 'CONFORME' : 'NAO_CONFORME',
        okVar ? '' : 'Diferença de temperatura entre sensores acima do limite no patamar: ' + num(varG, 2) + ' °C às ' + varHora + ', acima de ' + num(varMax, 1) + ' °C.',
        { valor: r2(varG), limite: varMax });
    }
  }

  // 4. Tempo de equilíbrio
  if (isFinite(eqMax) && eqMax > 0) {
    const dtSeg = dtMin * 60;
    let iRef = -1, iTodos = -1;
    for (let i = 0; i <= ini && (iRef < 0 || iTodos < 0); i++) {
      const l = AutoRel_leiturasAtivasLinha_(linhas[i], idxAtivos);
      if (iRef < 0) {
        if (refIdx >= 0) { const t = linhas[i].temperaturas[refIdx]; if (t !== null && isFinite(t) && r2(t) >= tMin) iRef = i; }
        else if (l.some(function(x) { return r2(x.t) >= tMin; })) iRef = i;
      }
      if (iTodos < 0 && l.length === idxAtivos.length && l.every(function(x) { return r2(x.t) >= tMin; })) iTodos = i;
    }
    const origem = refIdx >= 0 ? 'referência: sensor S' + (refIdx + 1) + ', informado como ponto de referência da câmara' : 'referência: primeiro sensor a atingir a temperatura, pois nenhum sensor de referência da câmara foi informado';
    if (dtSeg > eqMax) {
      item('equilibrio', 'Tempo de equilíbrio', reqEq, 'Não avaliado', 'NAO_AVALIADO',
        'Não avaliado: o intervalo entre leituras (' + num(dtSeg, 0) + ' s) é maior que o limite de ' + num(eqMax, 0) + ' s. Para avaliar, programe o registrador com intervalo de até ' + num(eqMax, 0) + ' s.');
    } else if (iRef < 0 || iTodos < 0) {
      item('equilibrio', 'Tempo de equilíbrio', reqEq, 'Não avaliado', 'NAO_AVALIADO', 'Não avaliado: os sensores não atingiram a temperatura de esterilização antes do início da exposição identificada.');
    } else {
      const eqSeg = Math.max(0, (ms(linhas[iTodos]) - ms(linhas[iRef])) / 1000);
      const okEq = eqSeg <= eqMax;
      item('equilibrio', 'Tempo de equilíbrio', reqEq, num(eqSeg, 0) + ' s (' + origem + '; resolução de ' + num(dtSeg, 0) + ' s)',
        okEq ? 'CONFORME' : 'NAO_CONFORME',
        okEq ? '' : 'Tempo de equilíbrio acima do limite: ' + num(eqSeg, 0) + ' s, acima de ' + num(eqMax, 0) + ' s (' + origem + ').',
        { valor: eqSeg, limite: eqMax });
    }
  }

  // 5. Temperatura medida × vapor saturado (pressão absoluta da câmara). Ensaio só de
  // temperatura (pressão desligada): o critério não existe neste ensaio.
  if (isFinite(vsMax) && vsMax > 0 && !analise.semPressao) {
    let n = 0, maior = null, piorHora = '', tsMin = null, tsMax = null;
    for (let i = ini; i <= fimT; i++) {
      const p = linhas[i].pressao;
      if (p === null || !isFinite(p) || p <= 0) continue;
      const ts = SGO_QT_tSatVaporC_(p);
      if (ts === null) continue;
      let tCam = null;
      if (refIdx >= 0) tCam = linhas[i].temperaturas[refIdx];
      else { const l = AutoRel_leiturasAtivasLinha_(linhas[i], idxAtivos); if (l.length) tCam = AutoRel_mediaArrayAnalise_(l.map(function(x) { return x.t; })); }
      if (tCam === null || !isFinite(tCam)) continue;
      n++;
      const d = tCam - ts;
      if (maior === null || Math.abs(d) > Math.abs(maior)) { maior = d; piorHora = AutoRel_horaLinhaAnalise_(linhas[i]); }
      tsMin = tsMin === null ? ts : Math.min(tsMin, ts);
      tsMax = tsMax === null ? ts : Math.max(tsMax, ts);
    }
    const base = refIdx >= 0 ? 'sensor de referência S' + (refIdx + 1) : 'média dos sensores ativos';
    if (n < 2) {
      item('vaporSaturado', 'Temperatura medida × vapor saturado', reqVs, 'Não avaliado', 'NAO_AVALIADO', 'Não avaliado: a pressão da câmara não foi registrada no patamar.');
    } else if (Math.abs(maior) > 3 * vsMax) {
      item('vaporSaturado', 'Temperatura medida × vapor saturado', reqVs, 'Não avaliado', 'NAO_AVALIADO',
        'Pressão incompatível com a temperatura: a ' + base + ' difere ' + num(Math.abs(maior), 2) + ' °C da temperatura do vapor saturado calculada pela pressão (às ' + piorHora + ').',
        { incoerente: true, valor: r2(maior) });
    } else {
      const okVs = r2(Math.abs(maior)) <= vsMax;
      item('vaporSaturado', 'Temperatura medida × vapor saturado', reqVs,
        'Maior diferença: ' + num(maior, 2) + ' °C (' + base + ' menos a do vapor saturado, que variou de ' + num(tsMin, 2) + ' °C a ' + num(tsMax, 2) + ' °C)',
        okVs ? 'CONFORME' : 'NAO_CONFORME',
        okVs ? '' : 'Temperatura medida diferente da do vapor saturado: ' + num(maior, 2) + ' °C às ' + piorHora + ' (' + base + '), acima de ' + num(vsMax, 1) + ' °C. Pode indicar ar ou gases não condensáveis na câmara, ou vapor superaquecido.',
        { valor: r2(maior), limite: vsMax, tSatMin: r2(tsMin), tSatMax: r2(tsMax) });
    }
  }
  return out;
}

/**
 * Travas de qualidade dos dados: cada uma diz o que aconteceu, por que impede o
 * documento e como corrigir (o operador nunca fica sem saber o próximo passo).
 */
function AutoRel_avaliarQualidadeDados_(linhas, analise, cfg, idxAtivos, dtMin) {
  const q = (AutoRel_UCFG && AutoRel_UCFG.QUALIDADE_DADOS) || {};
  const out = { travas: [], alertas: [] };
  const num = SGO_DocA4_num_;
  const faixa = Array.isArray(q.faixaFisicaC) ? q.faixaFisicaC : [-10, 160];
  const ini = analise.faseInicioExp, fimExp = analise.faseFimExp;
  const comoSensor = 'Se o sensor falhou durante o ensaio, desmarque-o em "Sensores considerados na análise" (seção Dados do registrador) e registre a falha nas observações; se o arquivo saiu errado, exporte de novo do registrador e envie.';
  function trava(codigo, oQue, porQue, comoCorrigir) { out.travas.push({ codigo: codigo, oQue: oQue, porQue: porQue, comoCorrigir: comoCorrigir }); }

  const ms = AutoRel_converterTempoLinhaParaMsAnalise_;
  const media = linhas.map(function(r) {
    const l = AutoRel_leiturasAtivasLinha_(r, idxAtivos);
    return { ms: ms(r), t: l.length ? AutoRel_mediaArrayAnalise_(l.map(function(x) { return x.t; })) : null };
  });
  idxAtivos.forEach(function(s) {
    const nome = 'S' + (s + 1);
    const serie = linhas.map(function(r) { return { ms: ms(r), t: r.temperaturas[s] }; });
    const qs = SGO_QT_qualidadeSensor_(serie, {
      faixaFisica: faixa, paradoMinLeituras: q.paradoMinLeituras, paradoVariacaoProcesso: q.paradoVariacaoProcessoC,
      picoMin: q.picoMinC, referencia: idxAtivos.length > 1 ? media : null
    });
    if (qs.foraFaixa.length) {
      const p = qs.foraFaixa[0];
      trava('LEITURA_IMPOSSIVEL', 'O sensor ' + nome + ' registrou ' + qs.foraFaixa.length + ' leitura(s) fora da faixa possível do processo; a primeira, ' + num(p.t, 2) + ' °C às ' + AutoRel_horaLinhaAnalise_(linhas[p.i]) + '.',
        'Leitura fora de ' + num(faixa[0], 0) + ' °C a ' + num(faixa[1], 0) + ' °C indica sensor desconectado, danificado ou arquivo exportado com erro; usar esses valores falsearia o resultado.', comoSensor);
    }
    if (qs.parado.length) {
      const p = qs.parado[0];
      trava('SENSOR_PARADO', 'O sensor ' + nome + ' ficou com o mesmo valor (' + num(p.t, 2) + ' °C) em ' + (p.i1 - p.i0 + 1) + ' leituras seguidas, de ' + AutoRel_horaLinhaAnalise_(linhas[p.i0]) + ' a ' + AutoRel_horaLinhaAnalise_(linhas[p.i1]) + ', enquanto os outros sensores variaram.',
        'Valor que não acompanha o processo indica sensor travado ou desconectado.', comoSensor);
    }
    qs.picos.forEach(function(p) {
      const noPatamar = ini >= 0 && p.i >= ini && p.i <= fimExp;
      const texto = 'O sensor ' + nome + ' tem um pico isolado de ' + num(p.t, 2) + ' °C às ' + AutoRel_horaLinhaAnalise_(linhas[p.i]) + ' (diferente das leituras vizinhas em mais de ' + num(q.picoMinC || 10, 0) + ' °C).';
      if (noPatamar) trava('PICO_NO_PATAMAR', texto, 'Um pico isolado dentro da exposição altera o F0 e os critérios do patamar sem representar a temperatura real.', comoSensor);
      else out.alertas.push(texto + ' Fora da exposição: não altera o resultado.');
    });
  });

  if (ini >= 0 && fimExp >= ini) {
    const n = fimExp - ini + 1;
    const minL = Number(q.minLeiturasPatamar) || 5;
    if (n < minL) {
      trava('POUCAS_LEITURAS', 'A exposição tem só ' + n + ' leitura(s) por sensor (intervalo entre leituras de ' + num(dtMin * 60, 0) + ' s).',
        'Com menos de ' + minL + ' leituras o F0 e os critérios do patamar ficam sem base suficiente.',
        'Repita o ensaio com o registrador programado com intervalo menor (por exemplo, 5 ou 10 s).');
    }
    const maxFalta = Number(q.maxLeiturasFaltandoPatamar) || 0;
    idxAtivos.forEach(function(s) {
      let falta = 0, primeira = -1;
      for (let i = ini; i <= fimExp; i++) { const t = linhas[i].temperaturas[s]; if (t === null || t === undefined || !isFinite(t)) { falta++; if (primeira < 0) primeira = i; } }
      if (falta > maxFalta) {
        trava('LEITURA_FALTANDO', 'O sensor S' + (s + 1) + ' não tem ' + falta + ' leitura(s) dentro da exposição (a primeira às ' + AutoRel_horaLinhaAnalise_(linhas[primeira]) + ').',
          'Sem a leitura, o F0 e os critérios daquele trecho não podem ser calculados para o sensor.',
          'No modo um arquivo por sensor, confira se o arquivo do sensor cobre todo o ciclo e se os relógios dos registradores estavam acertados; no arquivo único, confira a coluna do sensor. Se o sensor falhou, desmarque-o e registre a falha.');
      }
    });
    const vistas = {};
    (analise.lacunasF0 || []).forEach(function(l) {
      if (l.motivo === 'LEITURA_AUSENTE' || vistas[l.ms0]) return;
      vistas[l.ms0] = true;
      trava('LACUNA_NO_PATAMAR', 'Há um intervalo sem leituras dentro da exposição, de ' + AutoRel_horaMsAnalise_(l.ms0) + ' a ' + AutoRel_horaMsAnalise_(l.ms1) + '.',
        'Um intervalo maior que ' + (Number(q.lacunaMaxIntervalos) || 3) + ' vezes o intervalo normal de leitura não permite calcular o F0 daquele trecho.',
        'Confira se o arquivo do registrador está completo (exporte de novo, sem filtros) e envie.');
    });
  }

  const vs = ((analise.criteriosPatamar && analise.criteriosPatamar.lista) || []).filter(function(c) { return c.chave === 'vaporSaturado' && c.incoerente; })[0];
  if (vs) {
    trava('PRESSAO_INCOERENTE', vs.motivo, 'Diferença tão grande costuma indicar pressão registrada em outra unidade (relativa em vez de absoluta, kPa ou mbar), e não uma condição real da câmara.',
      'Confira a unidade da coluna de pressão do registrador: o ciclo usa bar absoluto. Converta a coluna (bar relativo + pressão atmosférica local) e envie de novo.');
  }
  return out;
}
