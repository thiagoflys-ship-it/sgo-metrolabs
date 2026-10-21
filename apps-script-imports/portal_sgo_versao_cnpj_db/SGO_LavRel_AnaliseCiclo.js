/****************************************************
 * METROLABS — LAVADORAS — MOTOR DE ANÁLISE DO CICLO (revisado em 21/10/2026)
 * Termodesinfectora (A0) e lavadora ultrassônica (patamar do banho).
 *
 * Revisão no molde da autoclave a vapor (SGO_AutoRel_AnaliseCiclo.js):
 *  - fase de desinfecção (ou patamar do banho) = o PRIMEIRO trecho em que todos os
 *    sensores ativos atingem e mantêm a temperatura programada, com leituras consecutivas
 *    e histerese (antes era o trecho em volta do pico, que podia ser a secagem com ar quente);
 *  - A0 por sensor pela regra dos trapézios com o intervalo REAL entre leituras
 *    (SGO_QualifTermica_Calculos.js). Antes: Σ 10^((T−80)/z) · Δt com Δt = mediana do arquivo e
 *    uma parcela por leitura (N leituras somavam N intervalos para um patamar de N − 1);
 *    lacunas no registro não eram vistas. A0 só soma com T ≥ 65 °C, do aquecimento da fase de
 *    desinfecção até o fim do patamar;
 *  - a "correção de letalidade" digitada na tela não é mais somada ao A0 (o resultado vem só das
 *    temperaturas medidas; a correção de temperatura do certificado do registrador continua valendo);
 *  - fases do ciclo pelo perfil de temperatura (cada entrada de água nova abre uma etapa), no lugar
 *    da divisão em proporções fixas, que inventava os horários das fases;
 *  - critérios com a referência, decisivos ou informativos (CICLOS[...].criterios, CRITERIOS_REFERENCIAS);
 *  - travas de qualidade dos dados (leitura impossível, sensor parado, pico no patamar, poucas leituras,
 *    leitura faltando, lacuna) que impedem o documento e dizem o que corrigir.
 ****************************************************/

function LavRel_analisarCiclo(dados, tipoCiclo, offsetTemp, offsetParametro, sensoresAtivos, opcoesAnalise) {
  if (!dados || !dados.length) {
    throw new Error('Nenhum dado normalizado foi recebido para análise.');
  }
  opcoesAnalise = opcoesAnalise || {};

  const cfg = LavRel_UCFG && LavRel_UCFG.CICLOS ? LavRel_UCFG.CICLOS[tipoCiclo] : null;
  if (!cfg) {
    throw new Error('Parâmetros normativos não encontrados para o equipamento: ' + tipoCiclo);
  }
  const termo = tipoCiclo === 'TERMO';

  const nSensores = Array.isArray(dados[0].temperaturas) ? dados[0].temperaturas.length : 0;
  if (!nSensores) {
    throw new Error('Não foi possível identificar sensores válidos no conjunto de dados.');
  }

  const tProg = LavRel_parseFloatSeguroAnalise_(opcoesAnalise.setpoint, NaN);
  if (!isFinite(tProg)) {
    throw new Error('Informe a temperatura programada do ciclo (campo "Temperatura programada", em °C): ela define a fase de ' +
      (termo ? 'desinfecção' : 'patamar do banho') + ' e os critérios. Use a temperatura da receita do equipamento.');
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
  const crit = cfg.criterios || {};
  const refs = (LavRel_UCFG && LavRel_UCFG.CRITERIOS_REFERENCIAS) || {};

  let linhas = dados.map(function(row, idx) {
    const tempsOriginais = Array.isArray(row.temperaturas) ? row.temperaturas : [];
    const tempsCorrigidas = [];
    for (let s = 0; s < nSensores; s++) {
      const bruto = s < tempsOriginais.length ? tempsOriginais[s] : null;
      const t = LavRel_parseFloatSeguroAnalise_(bruto, null);
      tempsCorrigidas.push(t === null ? null : (t + offTemp));
    }
    const tempsAtivas = sensoresAtivosIdx.map(function(s) { return tempsCorrigidas[s]; }).filter(function(v) { return v !== null && isFinite(v); });
    return {
      idxOriginal: idx,
      idx: idx,
      tempoStr: row.tempoStr || '',
      tempoDate: row.tempoDate instanceof Date && !isNaN(row.tempoDate.getTime()) ? row.tempoDate : null,
      pressao: LavRel_parseFloatSeguroAnalise_(row.pressao, null),
      temperaturas: tempsCorrigidas,
      tMediaAtiva: tempsAtivas.length ? LavRel_mediaArrayAnalise_(tempsAtivas) : null,
      tMinAtiva: tempsAtivas.length ? Math.min.apply(null, tempsAtivas) : null,
      tMaxAtiva: tempsAtivas.length ? Math.max.apply(null, tempsAtivas) : null
    };
  });

  // Limite de aprovação: A0 pela classificação do artigo (decisão do dono de 17/10/2026) ou tempo mínimo do banho.
  const classeArtigo = String(opcoesAnalise.classeArtigo || '').toUpperCase() === 'CRITICO' ? 'CRITICO' : 'SEMICRITICO';
  const parametroNormativo = termo
    ? (classeArtigo === 'CRITICO' ? LavRel_parseFloatSeguroAnalise_(cfg.parametroNormativoCritico, 3000) : LavRel_parseFloatSeguroAnalise_(cfg.parametroNormativo, 600))
    : LavRel_parseFloatSeguroAnalise_(cfg.parametroNormativo, 10);
  const margemObservacao = LavRel_parseFloatSeguroAnalise_(cfg.margemObservacaoPercentual, 10);

  const analise = {
    tipoCiclo: tipoCiclo,
    configuracaoCiclo: {
      tMin: tProg,
      tProgramada: tProg,
      tMax: LavRel_parseFloatSeguroAnalise_(cfg.tMax, 100),
      tBase: LavRel_parseFloatSeguroAnalise_(cfg.tBase, 80.0),
      z: LavRel_parseFloatSeguroAnalise_(cfg.z, 10),
      tLimiteA0: termo ? LavRel_parseFloatSeguroAnalise_(cfg.tLimiteA0, 65) : null,
      parametroNormativo: parametroNormativo,
      parametroOperacional: parametroNormativo,
      toleranciaParametro: 0,
      classeArtigo: termo ? classeArtigo : ''
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
    tempoInicioCiclo: '',
    tempoFimCiclo: '',
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
    aprovado: true,
    statusAprovacao: 'APROVADO',
    stats: {
      globalTemp: { min: null, max: null, soma: 0, count: 0, media: 0 },
      globalPres: { min: null, max: null, soma: 0, count: 0, media: 0 },
      exposicaoTemp: { min: null, max: null, soma: 0, count: 0, media: 0 },
      sensores: Array.from({ length: nSensores }, function(_, s) {
        return { sensor: 'S' + (s + 1), ativo: !!ativos[s], min: null, max: null, soma: 0, count: 0, media: null,
          minExposicao: null, maxExposicao: null, somaExposicao: 0, countExposicao: 0, mediaExposicao: null };
      })
    }
  };

  if (offParam) {
    analise.alertasAnalise.push('A correção de letalidade informada na tela (' + SGO_DocA4_num_(offParam, 2) + ') não foi aplicada: o ' +
      (termo ? 'A0' : 'tempo do banho') + ' é calculado só a partir das temperaturas medidas. Para corrigir o registrador, use a correção de temperatura do certificado de calibração.');
  }

  // Janela do ciclo informada pelo técnico (recorte do arquivo).
  const override = LavRel_extrairOverrideJanela_(opcoesAnalise);
  if (override && override.habilitado && (override.inicioCiclo || override.fimCiclo)) {
    const i0 = override.inicioCiclo ? LavRel_localizarIndicePorTempo_(linhas, override.inicioCiclo, '>=', 0) : 0;
    const i1 = override.fimCiclo ? LavRel_localizarIndicePorTempo_(linhas, override.fimCiclo, '<=', linhas.length - 1) : (linhas.length - 1);
    if (i0 !== null && i1 !== null && i1 >= i0) {
      linhas = linhas.slice(i0, i1 + 1).map(function(row, i) { row.idx = i; return row; });
      analise.origemJanelaCiclo = 'MANUAL';
      analise.observacoesAnalise.push('Janela do ciclo definida manualmente pelo técnico.');
    } else {
      analise.alertasAnalise.push('A janela do ciclo informada não foi encontrada no arquivo; foi mantido o arquivo inteiro.');
    }
  }
  if (!linhas.length) throw new Error('Não restaram leituras válidas depois do recorte da janela do ciclo.');

  analise.indiceInicioCiclo = 0;
  analise.indiceFimCiclo = linhas.length - 1;
  analise.tempoInicioCiclo = linhas[0].tempoStr || '';
  analise.tempoFimCiclo = linhas[linhas.length - 1].tempoStr || '';

  // PASSO 1 — Estatísticas globais
  let maxPiorSensor = -Infinity;
  linhas.forEach(function(row) {
    if (row.tMinAtiva !== null && row.tMinAtiva > maxPiorSensor) maxPiorSensor = row.tMinAtiva;
    const p = row.pressao;
    if (p !== null && isFinite(p)) {
      const gp = analise.stats.globalPres;
      if (gp.min === null || p < gp.min) gp.min = p;
      if (gp.max === null || p > gp.max) gp.max = p;
      gp.soma += p; gp.count++;
    }
    sensoresAtivosIdx.forEach(function(s) {
      const t = row.temperaturas[s];
      if (t === null || !isFinite(t)) return;
      const g = analise.stats.globalTemp, st = analise.stats.sensores[s];
      if (g.min === null || t < g.min) g.min = t;
      if (g.max === null || t > g.max) g.max = t;
      g.soma += t; g.count++;
      if (st.min === null || t < st.min) st.min = t;
      if (st.max === null || t > st.max) st.max = t;
      st.soma += t; st.count++;
    });
  });

  // PASSO 2 — Fase de desinfecção (ou patamar do banho)
  let manualAplicado = false;
  if (override && override.habilitado && override.inicioExposicao && override.fimExposicao) {
    const a = LavRel_localizarIndicePorTempo_(linhas, override.inicioExposicao, '>=', 0);
    const b = LavRel_localizarIndicePorTempo_(linhas, override.fimExposicao, '<=', linhas.length - 1);
    if (a !== null && b !== null && b >= a) {
      const okA = LavRel_avaliarLinhaParaExposicao_(linhas[a], sensoresAtivosIdx, paramsAnalise, 'INICIO').valida;
      const okB = LavRel_avaliarLinhaParaExposicao_(linhas[b], sensoresAtivosIdx, paramsAnalise, 'MANUTENCAO').valida;
      if (okA && okB) {
        analise.faseInicioExp = a; analise.faseFimExp = b;
        analise.origemJanelaExposicao = 'MANUAL';
        analise.observacoesAnalise.push('Janela da fase ' + (termo ? 'de desinfecção' : 'do banho') + ' definida manualmente pelo técnico.');
        manualAplicado = true;
      } else {
        analise.alertasAnalise.push('A janela manual da fase ' + (termo ? 'de desinfecção' : 'do banho') + ' foi ignorada: os horários informados não atendem ao critério de temperatura. Mantida a identificação automática.');
      }
    } else {
      analise.alertasAnalise.push('A janela manual da fase ' + (termo ? 'de desinfecção' : 'do banho') + ' não foi encontrada no arquivo. Mantida a identificação automática.');
    }
  }
  if (!manualAplicado) {
    if (maxPiorSensor < paramsAnalise.limiteInicio) {
      analise.observacoesAnalise.push('O sensor mais frio chegou no máximo a ' + SGO_DocA4_num_(LavRel_roundAnalise_(maxPiorSensor, 2), 2) + ' °C e não atingiu ' +
        SGO_DocA4_num_(paramsAnalise.limiteInicio, 1) + ' °C, o limite de início da fase ' + (termo ? 'de desinfecção' : 'do banho') + '.');
    } else {
      const trechos = LavRel_trechosExposicao_(linhas, sensoresAtivosIdx, paramsAnalise);
      if (trechos.length) {
        analise.faseInicioExp = trechos[0][0];
        analise.faseFimExp = trechos[0][1];
        if (trechos.length > 1) {
          analise.observacoesAnalise.push('Os sensores voltaram a ficar acima de ' + SGO_DocA4_num_(paramsAnalise.limiteInicio, 1) + ' °C depois da fase ' + (termo ? 'de desinfecção' : 'do banho') +
            ' (' + (trechos.length - 1) + ' trecho(s), por exemplo na secagem). Foi considerado o primeiro trecho; os seguintes não entram no cálculo.');
        }
      }
    }
  }
  if (analise.faseInicioExp >= 0) analise.tempoInicioExposicao = linhas[analise.faseInicioExp].tempoStr || '';
  if (analise.faseFimExp >= 0) analise.tempoFimExposicao = linhas[analise.faseFimExp].tempoStr || '';

  const ms = LavRel_converterTempoLinhaParaMsAnalise_;
  const ini = analise.faseInicioExp, fimExp = analise.faseFimExp;
  const temFase = ini >= 0 && fimExp >= ini;

  // PASSO 3 — Fases do ciclo pelo perfil de temperatura
  analise.fasesProcesso = LavRel_detectarFasesProcessoLavadoras_(linhas, analise, tipoCiclo, crit);
  analise.faseInicioRampa = analise.fasesProcesso.inicioEstagioPrincipal >= 0 ? analise.fasesProcesso.inicioEstagioPrincipal : 0;

  // PASSO 4 — Tempos (minutos com 4 casas: nada é arredondado antes de ser comparado)
  analise.tempoTotalMinutos = LavRel_calcularDiferencaTempo(linhas[0].tempoStr, linhas[linhas.length - 1].tempoStr, linhas[0].tempoDate, linhas[linhas.length - 1].tempoDate);
  analise.tempoExposicaoMinutos = temFase ? LavRel_roundAnalise_((ms(linhas[fimExp]) - ms(linhas[ini])) / 60000, 4) : 0;
  analise.deltaMinutosEstimado = LavRel_roundAnalise_(dtMin, 4);

  // Patamar: do início da fase até a última leitura com todos os sensores no limite de início
  // (a descida mantida pela histerese fica fora dos critérios de tempo e de faixa).
  const r2 = function(v) { return LavRel_roundAnalise_(v, 2); };
  let patamar = null;
  if (temFase) {
    let fimT = fimExp;
    const todosNoLimite = function(i) {
      const l = LavRel_leiturasAtivasLinha_(linhas[i], sensoresAtivosIdx);
      return l.length > 0 && l.every(function(x) { return r2(x.t) >= paramsAnalise.limiteInicio; });
    };
    while (fimT > ini && !todosNoLimite(fimT)) fimT--;
    patamar = { inicioIdx: ini, fimIdx: fimT, inicio: linhas[ini].tempoStr || '', fim: linhas[fimT].tempoStr || '',
      duracaoMin: r2((ms(linhas[fimT]) - ms(linhas[ini])) / 60000), leituras: fimT - ini + 1 };
  }
  analise.patamar = patamar;

  // PASSO 5 — A0 (termodesinfecção) pela regra dos trapézios, do aquecimento ao fim do patamar
  const qd = (LavRel_UCFG && LavRel_UCFG.QUALIDADE_DADOS) || {};
  const maxIntervaloMs = Math.max(1, Number(qd.lacunaMaxIntervalos) || 3) * dtMin * 60000;
  const memoriaA0 = Array.from({ length: nSensores }, function() { return []; });
  analise.lacunasA0 = [];
  analise.janelaA0 = null;
  if (termo) {
    const tLim = analise.configuracaoCiclo.tLimiteA0;
    const dIni = Math.max(0, analise.fasesProcesso.inicioEstagioPrincipal >= 0 ? analise.fasesProcesso.inicioEstagioPrincipal : ini);
    const a0 = new Array(nSensores).fill(null);
    let janelaIni = ini;
    if (temFase) {
      sensoresAtivosIdx.forEach(function(s) {
        // Início do sensor: volta do início do patamar enquanto ele está a 65 °C ou mais, sem sair da etapa.
        // A leitura anterior (abaixo de 65 °C) não entra: o trapézio até ela superestimaria a subida (conservador).
        let i0 = ini;
        while (i0 - 1 >= dIni) {
          const t = linhas[i0 - 1].temperaturas[s];
          if (t === null || !isFinite(t) || t < tLim) break;
          i0--;
        }
        janelaIni = Math.min(janelaIni, i0);
        const pontos = [];
        for (let i = i0; i <= fimExp; i++) pontos.push({ ms: ms(linhas[i]), t: linhas[i].temperaturas[s] });
        const integ = SGO_QT_letalidadeTrapezio_(pontos, analise.configuracaoCiclo.tBase, analise.configuracaoCiclo.z, { maxIntervaloMs: maxIntervaloMs, tMinContagem: tLim });
        a0[s] = integ.total * 60;
        integ.lacunas.forEach(function(l) { analise.lacunasA0.push({ sensor: 'S' + (s + 1), motivo: l.motivo, ms0: l.ms0, ms1: l.ms1 }); });
        integ.linhas.forEach(function(l, k) {
          if (l.t === null) return;
          memoriaA0[s].push({ tempoStr: linhas[i0 + k].tempoStr || '', ms: l.ms, temperatura: l.t, fator: l.fator, dtSeg: l.dtMin * 60, contribuicao: l.contribuicao * 60, acumulado: l.acumulado * 60 });
        });
      });
      analise.janelaA0 = { inicioIdx: janelaIni, fimIdx: fimExp, inicio: linhas[janelaIni].tempoStr || '', fim: linhas[fimExp].tempoStr || '' };
    } else {
      sensoresAtivosIdx.forEach(function(s) { a0[s] = 0; });
    }
    Object.defineProperty(analise, 'memoriaA0PorSensor', { value: memoriaA0, enumerable: false, writable: true });
    analise.a0PorSensor = a0.map(function(v, s) { return ativos[s] && v !== null ? LavRel_roundAnalise_(v, 2) : null; });
    const vals = analise.a0PorSensor.filter(function(v) { return v !== null && isFinite(v); });
    analise.mediaA0 = vals.length ? LavRel_roundAnalise_(LavRel_mediaArrayAnalise_(vals), 2) : 0;
    analise.minA0 = vals.length ? LavRel_roundAnalise_(Math.min.apply(null, vals), 2) : 0;
    analise.maxA0 = vals.length ? LavRel_roundAnalise_(Math.max.apply(null, vals), 2) : 0;
    analise.piorSensorA0 = LavRel_encontrarPiorSensorParametro_(analise.a0PorSensor, ativos);
  } else {
    analise.tempoCavitacao = patamar ? patamar.duracaoMin : 0;
  }

  // PASSO 6 — Temperaturas por sensor na fase (do início ao fim, com a histerese)
  if (temFase) {
    for (let i = ini; i <= fimExp; i++) {
      sensoresAtivosIdx.forEach(function(s) {
        const t = linhas[i].temperaturas[s];
        if (t === null || !isFinite(t)) return;
        const ge = analise.stats.exposicaoTemp, st = analise.stats.sensores[s];
        if (ge.min === null || t < ge.min) ge.min = t;
        if (ge.max === null || t > ge.max) ge.max = t;
        ge.soma += t; ge.count++;
        if (st.minExposicao === null || t < st.minExposicao) st.minExposicao = t;
        if (st.maxExposicao === null || t > st.maxExposicao) st.maxExposicao = t;
        st.somaExposicao += t; st.countExposicao++;
      });
    }
  }
  LavRel_fecharEstatisticas_(analise, ativos);
  analise.piorSensorTemperatura = LavRel_encontrarPiorSensorTemperaturaExposicao_(analise.stats.sensores, ativos);

  // PASSO 7 — Critérios e decisão
  analise.limitesAprovacao = {
    parametroNormativo: LavRel_roundAnalise_(parametroNormativo, 2),
    parametroOperacional: LavRel_roundAnalise_(parametroNormativo, 2),
    toleranciaParametro: 0,
    limiteAprovacaoFinal: LavRel_roundAnalise_(parametroNormativo, 2)
  };
  analise.criterios = LavRel_avaliarCriterios_(linhas, analise, cfg, crit, refs, sensoresAtivosIdx, dtMin, paramsAnalise);
  analise.criterios.forEach(function(c) {
    if (c.situacao !== 'NAO_CONFORME') return;
    if (c.decisivo) {
      analise.aprovado = false;
      analise.statusAprovacao = 'REPROVADO';
      analise.motivosReprovacao.push(c.motivo);
    } else {
      analise.alertasAnalise.push(c.motivo + ' Este critério é informativo e não decide o resultado; avalie a causa.');
    }
  });
  if (termo && analise.aprovado && analise.minA0 >= parametroNormativo && analise.minA0 < parametroNormativo * (1 + margemObservacao / 100)) {
    analise.observacoesAnalise.push('A0 mínimo próximo do limite: ' + SGO_DocA4_num_(analise.minA0, 2) + ' s no sensor ' + (analise.piorSensorA0 ? analise.piorSensorA0.sensor : '—') +
      ', a menos de ' + margemObservacao + '% acima do mínimo de ' + SGO_DocA4_num_(parametroNormativo, 0) + ' s. Recomenda-se acompanhar este ponto nas próximas requalificações.');
  }

  // PASSO 8 — Qualidade dos dados (travas de emissão)
  analise.qualidadeDados = LavRel_avaliarQualidadeDados_(linhas, analise, sensoresAtivosIdx, dtMin);
  analise.emissaoBloqueada = analise.qualidadeDados.travas.length > 0;
  analise.qualidadeDados.alertas.forEach(function(t) { analise.alertasAnalise.push(t); });

  if (analise.tempoExposicaoMinutos > analise.tempoTotalMinutos && analise.tempoTotalMinutos > 0) {
    analise.alertasAnalise.push('Duração da fase maior que a duração do ciclo. Confira a linha do tempo do arquivo.');
  }
  if (!analise.aprovado && !analise.motivosReprovacao.length) analise.motivosReprovacao.push('O ciclo não atende aos critérios de aceitação.');
  if (analise.aprovado && !analise.alertasAnalise.length) analise.observacoesAnalise.push('Todos os critérios decisivos foram atendidos pelos sensores ativos.');

  return analise;
}

/** Trechos [início, fim] em que todos os sensores ativos atingem e mantêm o limite (leituras consecutivas e histerese). */
function LavRel_trechosExposicao_(linhas, idxAtivos, params) {
  const n = linhas.length, out = [];
  const valida = function(i, etapa) { return LavRel_avaliarLinhaParaExposicao_(linhas[i], idxAtivos, params, etapa).valida; };
  let i = 0;
  while (i < n) {
    let s = -1;
    for (let k = i; k <= n - params.consecutivasInicio; k++) {
      let ok = true;
      for (let j = 0; j < params.consecutivasInicio; j++) if (!valida(k + j, 'INICIO')) { ok = false; break; }
      if (ok) { s = k; break; }
    }
    if (s < 0) break;
    let fim = n - 1, cont = 0;
    for (let k = s; k < n; k++) {
      if (!valida(k, 'MANUTENCAO')) {
        cont++;
        if (cont >= params.consecutivasFim) { fim = k - params.consecutivasFim; break; }
      } else {
        cont = 0;
      }
    }
    // Leituras finais inválidas sem completar a contagem: o trecho termina na última leitura válida.
    while (fim > s && !valida(fim, 'MANUTENCAO')) fim--;
    out.push([s, fim]);
    i = fim + 1;
  }
  return out;
}

function LavRel_leiturasAtivasLinha_(row, idxAtivos) {
  const out = [];
  idxAtivos.forEach(function(s) {
    const t = row.temperaturas[s];
    if (t !== null && t !== undefined && isFinite(t)) out.push({ s: s, t: t });
  });
  return out;
}

function LavRel_horaLinhaAnalise_(row) {
  const s = String((row && row.tempoStr) || '').trim();
  const m = s.match(/(\d{1,2}:\d{2}:\d{2})\s*$/);
  return m ? m[1] : (s || '—');
}

function LavRel_horaMsAnalise_(msValor) {
  try { return Utilities.formatDate(new Date(msValor), LavRel_UCFG.TZ || 'America/Sao_Paulo', 'HH:mm:ss'); } catch (e) { return '—'; }
}

function LavRel_fecharEstatisticas_(analise, ativos) {
  const st = analise.stats, r = LavRel_roundAnalise_;
  st.globalTemp.media = st.globalTemp.count ? r(st.globalTemp.soma / st.globalTemp.count, 2) : 0;
  st.globalPres.media = st.globalPres.count ? r(st.globalPres.soma / st.globalPres.count, 3) : 0;
  st.exposicaoTemp.media = st.exposicaoTemp.count ? r(st.exposicaoTemp.soma / st.exposicaoTemp.count, 2) : 0;
  ['globalTemp', 'exposicaoTemp'].forEach(function(k) {
    st[k].min = st[k].min !== null ? r(st[k].min, 2) : 0;
    st[k].max = st[k].max !== null ? r(st[k].max, 2) : 0;
  });
  st.globalPres.min = st.globalPres.min !== null ? r(st.globalPres.min, 3) : 0;
  st.globalPres.max = st.globalPres.max !== null ? r(st.globalPres.max, 3) : 0;
  st.sensores.forEach(function(s, i) {
    if (!ativos[i]) return;
    s.media = s.count ? r(s.soma / s.count, 2) : 0;
    s.min = s.min !== null ? r(s.min, 2) : 0;
    s.max = s.max !== null ? r(s.max, 2) : 0;
    s.mediaExposicao = s.countExposicao ? r(s.somaExposicao / s.countExposicao, 2) : null;
    s.minExposicao = s.minExposicao !== null ? r(s.minExposicao, 2) : null;
    s.maxExposicao = s.maxExposicao !== null ? r(s.maxExposicao, 2) : null;
  });
}

/* ------------------------------------------------------------
 * CRITÉRIOS (21/10/2026)
 * Situação: CONFORME | NAO_CONFORME | NAO_AVALIADO | INFORMATIVO.
 * Só critério decisivo reprova. Comparações com os valores arredondados
 * a 2 casas, os mesmos mostrados no documento.
 * ------------------------------------------------------------ */
function LavRel_avaliarCriterios_(linhas, analise, cfg, crit, refs, idxAtivos, dtMin, params) {
  const termo = analise.tipoCiclo === 'TERMO';
  const num = SGO_DocA4_num_;
  const r2 = function(v) { return LavRel_roundAnalise_(v, 2); };
  const ms = LavRel_converterTempoLinhaParaMsAnalise_;
  const tProg = analise.configuracaoCiclo.tProgramada;
  const ini = analise.faseInicioExp, fimExp = analise.faseFimExp, pat = analise.patamar;
  const temFase = ini >= 0 && fimExp >= ini && !!pat;
  const lista = [];
  const nomeFase = termo ? 'fase de desinfecção' : 'patamar do banho';
  function ref(chave) { const r = refs[chave] || {}; return (!termo && r.referenciaUltra) ? r.referenciaUltra : (r.referencia || ''); }
  function item(chave, criterio, requisito, obtido, situacao, motivo, decisivo, extra) {
    lista.push(Object.assign({ chave: chave, criterio: criterio, requisito: requisito, obtido: obtido, situacao: situacao, motivo: motivo || '',
      referencia: ref(chave), decisivo: !!decisivo }, extra || {}));
  }
  const naoAv = 'Não avaliado: a ' + nomeFase + ' não foi identificada.';

  // 1. Identificação da fase
  item('fase', termo ? 'Identificação da fase de desinfecção' : 'Identificação do patamar do banho',
    termo ? 'Todos os sensores ativos atingem e mantêm a temperatura programada (' + num(tProg, 1) + ' °C)'
      : 'Todos os sensores ativos atingem a temperatura programada menos a tolerância (' + num(params.limiteInicio, 1) + ' °C)',
    temFase ? LavRel_horaLinhaAnalise_(linhas[ini]) + ' a ' + LavRel_horaLinhaAnalise_(linhas[fimExp]) + ' (' + num(analise.tempoExposicaoMinutos, 2) + ' min)' : 'Não identificada',
    temFase ? 'CONFORME' : 'NAO_CONFORME',
    temFase ? '' : 'A ' + nomeFase + ' não foi identificada: os sensores ativos não atingiram e mantiveram ' + num(params.limiteInicio, 1) + ' °C.', true);

  if (termo) {
    // 2. A0
    const lim = analise.limitesAprovacao ? analise.limitesAprovacao.limiteAprovacaoFinal : analise.configuracaoCiclo.parametroNormativo;
    const classe = analise.configuracaoCiclo.classeArtigo === 'CRITICO' ? 'artigo crítico' : 'artigo semicrítico ou não crítico';
    const reqA0 = 'A0 ≥ ' + num(lim, 0) + ' s em todos os sensores ativos (' + classe + ')';
    if (!temFase) item('a0', 'Letalidade térmica (A0) no pior sensor', reqA0, naoAv, 'NAO_AVALIADO', naoAv, true);
    else {
      const ok = r2(analise.minA0) >= lim;
      const pior = analise.piorSensorA0 ? analise.piorSensorA0.sensor : '—';
      item('a0', 'Letalidade térmica (A0) no pior sensor', reqA0, num(analise.minA0, 2) + ' s (' + pior + ')', ok ? 'CONFORME' : 'NAO_CONFORME',
        ok ? '' : 'A0 insuficiente: o pior sensor (' + pior + ') acumulou ' + num(analise.minA0, 2) + ' s, abaixo do mínimo de ' + num(lim, 0) + ' s exigido para ' + classe + '.', true,
        { valor: analise.minA0, limite: lim });
    }
  }

  // 3. Faixa no patamar
  let minG = null, maxG = null, varG = null, varHora = '';
  if (temFase) {
    for (let i = pat.inicioIdx; i <= pat.fimIdx; i++) {
      const l = LavRel_leiturasAtivasLinha_(linhas[i], idxAtivos);
      l.forEach(function(x) {
        if (!minG || x.t < minG.t) minG = { t: x.t, s: x.s, hora: LavRel_horaLinhaAnalise_(linhas[i]) };
        if (!maxG || x.t > maxG.t) maxG = { t: x.t, s: x.s, hora: LavRel_horaLinhaAnalise_(linhas[i]) };
      });
      if (l.length > 1) {
        const v = Math.max.apply(null, l.map(function(x) { return x.t; })) - Math.min.apply(null, l.map(function(x) { return x.t; }));
        if (varG === null || v > varG) { varG = v; varHora = LavRel_horaLinhaAnalise_(linhas[i]); }
      }
    }
    // A descida mantida pela histerese (até o fim da fase) também conta para a temperatura mínima.
    for (let i = pat.fimIdx + 1; i <= fimExp; i++) {
      LavRel_leiturasAtivasLinha_(linhas[i], idxAtivos).forEach(function(x) {
        if (!minG || x.t < minG.t) minG = { t: x.t, s: x.s, hora: LavRel_horaLinhaAnalise_(linhas[i]) };
      });
    }
  }
  if (termo) {
    const req = 'Temperatura ≥ ' + num(tProg, 1) + ' °C (programada) em todos os sensores ativos durante a fase';
    if (!temFase || !minG) item('faixa', 'Temperatura de desinfecção mantida', req, naoAv, 'NAO_AVALIADO', naoAv, true);
    else {
      const ok = r2(minG.t) >= tProg;
      item('faixa', 'Temperatura de desinfecção mantida', req, 'Mínima ' + num(minG.t, 2) + ' °C (S' + (minG.s + 1) + ', às ' + minG.hora + ')', ok ? 'CONFORME' : 'NAO_CONFORME',
        ok ? '' : 'Temperatura abaixo da programada na fase de desinfecção: ' + num(minG.t, 2) + ' °C no sensor S' + (minG.s + 1) + ' às ' + minG.hora + ', abaixo de ' + num(tProg, 1) + ' °C.', true,
        { valor: r2(minG.t), limite: tProg });
    }
    const acima = crit.faixaAcimaK;
    if (acima !== null && acima !== undefined && isFinite(Number(acima))) {
      const tTeto = tProg + Number(acima);
      const reqA = 'Temperatura ≤ ' + num(tTeto, 1) + ' °C (programada + ' + num(acima, 0) + ' °C) no patamar';
      if (!temFase || !maxG) item('faixaAcima', 'Faixa de temperatura de desinfecção (limite superior)', reqA, naoAv, 'NAO_AVALIADO', naoAv, !!crit.faixaAcimaDecisivo);
      else {
        const ok = r2(maxG.t) <= tTeto;
        item('faixaAcima', 'Faixa de temperatura de desinfecção (limite superior)', reqA, 'Máxima ' + num(maxG.t, 2) + ' °C (S' + (maxG.s + 1) + ', às ' + maxG.hora + ')', ok ? 'CONFORME' : 'NAO_CONFORME',
          ok ? '' : 'Temperatura acima da faixa de referência no patamar: ' + num(maxG.t, 2) + ' °C no sensor S' + (maxG.s + 1) + ' às ' + maxG.hora + ', acima de ' + num(tTeto, 1) + ' °C.', !!crit.faixaAcimaDecisivo,
          { valor: r2(maxG.t), limite: tTeto });
      }
    }
    // Tempo de patamar (decide só se o RT configurar o mínimo).
    const tMinPat = crit.tempoMinimoPatamarMin;
    if (tMinPat !== null && tMinPat !== undefined && isFinite(Number(tMinPat)) && Number(tMinPat) > 0) {
      const reqT = '≥ ' + num(tMinPat, 0) + ' min com todos os sensores na temperatura programada';
      if (!temFase) item('tempoPatamar', 'Tempo de patamar', reqT, naoAv, 'NAO_AVALIADO', naoAv, true);
      else {
        const ok = pat.duracaoMin >= Number(tMinPat);
        item('tempoPatamar', 'Tempo de patamar', reqT, num(pat.duracaoMin, 2) + ' min', ok ? 'CONFORME' : 'NAO_CONFORME',
          ok ? '' : 'Tempo de patamar insuficiente: ' + num(pat.duracaoMin, 2) + ' min, abaixo de ' + num(tMinPat, 0) + ' min.', true, { valor: pat.duracaoMin, limite: Number(tMinPat) });
      }
    } else if (temFase) {
      item('tempoPatamar', 'Tempo de patamar', 'Informativo (o A0 já integra tempo e temperatura)', num(pat.duracaoMin, 2) + ' min (' + LavRel_horaLinhaAnalise_(linhas[pat.inicioIdx]) + ' a ' + LavRel_horaLinhaAnalise_(linhas[pat.fimIdx]) + ')', 'INFORMATIVO', '', false, { valor: pat.duracaoMin });
    }
  } else {
    // Lavadora ultrassônica: tempo no patamar do banho e tolerância de ±3 °C.
    const lim = analise.limitesAprovacao.limiteAprovacaoFinal;
    const reqT = '≥ ' + num(lim, 0) + ' min com o banho na temperatura programada (tolerância de ' + num(crit.toleranciaBanhoK, 0) + ' °C)';
    if (!temFase) item('tempoBanho', 'Tempo no patamar do banho', reqT, naoAv, 'NAO_AVALIADO', naoAv, true);
    else {
      const ok = pat.duracaoMin >= lim;
      item('tempoBanho', 'Tempo no patamar do banho', reqT, num(pat.duracaoMin, 2) + ' min (' + LavRel_horaLinhaAnalise_(linhas[pat.inicioIdx]) + ' a ' + LavRel_horaLinhaAnalise_(linhas[pat.fimIdx]) + ')', ok ? 'CONFORME' : 'NAO_CONFORME',
        ok ? '' : 'Tempo no patamar do banho insuficiente: ' + num(pat.duracaoMin, 2) + ' min, abaixo do mínimo de ' + num(lim, 0) + ' min.', true, { valor: pat.duracaoMin, limite: lim });
    }
    const tol = Number(crit.toleranciaBanhoK);
    if (isFinite(tol) && tol > 0) {
      const reqF = 'De ' + num(tProg - tol, 1) + ' °C a ' + num(tProg + tol, 1) + ' °C (programada ± ' + num(tol, 0) + ' °C) em todos os sensores no patamar';
      if (!temFase || !minG || !maxG) item('faixaBanho', 'Temperatura do banho dentro da tolerância', reqF, naoAv, 'NAO_AVALIADO', naoAv, true);
      else {
        const ok = r2(minG.t) >= tProg - tol && r2(maxG.t) <= tProg + tol;
        let mot = '';
        if (r2(minG.t) < tProg - tol) mot = 'Temperatura do banho abaixo da tolerância: ' + num(minG.t, 2) + ' °C no sensor S' + (minG.s + 1) + ' às ' + minG.hora + ', abaixo de ' + num(tProg - tol, 1) + ' °C.';
        if (r2(maxG.t) > tProg + tol) mot += (mot ? ' ' : '') + 'Temperatura do banho acima da tolerância: ' + num(maxG.t, 2) + ' °C no sensor S' + (maxG.s + 1) + ' às ' + maxG.hora + ', acima de ' + num(tProg + tol, 1) + ' °C.';
        item('faixaBanho', 'Temperatura do banho dentro da tolerância', reqF, 'Mínima ' + num(minG.t, 2) + ' °C (S' + (minG.s + 1) + '); máxima ' + num(maxG.t, 2) + ' °C (S' + (maxG.s + 1) + ')',
          ok ? 'CONFORME' : 'NAO_CONFORME', mot, true, { valorMin: r2(minG.t), valorMax: r2(maxG.t) });
      }
    }
  }

  // 4. Diferença entre sensores (uniformidade)
  if (temFase) {
    const lv = crit.variacaoMaxEntreSensoresK;
    const temLim = lv !== null && lv !== undefined && isFinite(Number(lv)) && Number(lv) > 0;
    if (varG === null) item('variacao', 'Diferença de temperatura entre sensores', temLim ? '≤ ' + num(lv, 1) + ' °C em cada leitura do patamar' : 'Informativo (limite a definir pelo responsável técnico)', 'Não avaliado: é preciso mais de um sensor ativo.', 'NAO_AVALIADO', 'Não avaliado: é preciso mais de um sensor ativo.', false);
    else if (temLim) {
      const ok = r2(varG) <= Number(lv);
      item('variacao', 'Diferença de temperatura entre sensores', '≤ ' + num(lv, 1) + ' °C em cada leitura do patamar', 'Maior diferença: ' + num(varG, 2) + ' °C (às ' + varHora + ')', ok ? 'CONFORME' : 'NAO_CONFORME',
        ok ? '' : 'Diferença de temperatura entre sensores acima do limite no patamar: ' + num(varG, 2) + ' °C às ' + varHora + ', acima de ' + num(lv, 1) + ' °C.', true, { valor: r2(varG), limite: Number(lv) });
    } else {
      item('variacao', 'Diferença de temperatura entre sensores', 'Informativo (limite a definir pelo responsável técnico)', 'Maior diferença: ' + num(varG, 2) + ' °C (às ' + varHora + ')', 'INFORMATIVO', '', false, { valor: r2(varG) });
    }
  }

  // 5. Equilíbrio e aquecimento (informativos salvo limite configurado)
  if (temFase) {
    const lim = params.limiteInicio;
    let iPrim = -1, iTodos = -1;
    const dIni = analise.fasesProcesso.inicioEstagioPrincipal >= 0 ? analise.fasesProcesso.inicioEstagioPrincipal : 0;
    for (let i = dIni; i <= ini && (iPrim < 0 || iTodos < 0); i++) {
      const l = LavRel_leiturasAtivasLinha_(linhas[i], idxAtivos);
      if (iPrim < 0 && l.some(function(x) { return r2(x.t) >= lim; })) iPrim = i;
      if (iTodos < 0 && l.length === idxAtivos.length && l.every(function(x) { return r2(x.t) >= lim; })) iTodos = i;
    }
    if (iTodos < 0) iTodos = ini;
    if (termo) {
      const eqMax = crit.tempoEquilibrioMaxSeg;
      const temLim = eqMax !== null && eqMax !== undefined && isFinite(Number(eqMax)) && Number(eqMax) > 0;
      const req = temLim ? '≤ ' + num(eqMax, 0) + ' s entre o primeiro e o último sensor atingirem a temperatura programada' : 'Informativo (limite a definir pelo responsável técnico)';
      if (iPrim < 0 || idxAtivos.length < 2) item('equilibrio', 'Tempo de equilíbrio entre sensores', req, 'Não avaliado: é preciso mais de um sensor ativo.', 'NAO_AVALIADO', 'Não avaliado: é preciso mais de um sensor ativo.', false);
      else {
        const eqSeg = Math.max(0, (ms(linhas[iTodos]) - ms(linhas[iPrim])) / 1000);
        const obtido = num(eqSeg, 0) + ' s (resolução de ' + num(dtMin * 60, 0) + ' s)';
        if (temLim) {
          const ok = eqSeg <= Number(eqMax);
          item('equilibrio', 'Tempo de equilíbrio entre sensores', req, obtido, ok ? 'CONFORME' : 'NAO_CONFORME', ok ? '' : 'Tempo de equilíbrio acima do limite: ' + num(eqSeg, 0) + ' s, acima de ' + num(eqMax, 0) + ' s.', true, { valor: eqSeg, limite: Number(eqMax) });
        } else item('equilibrio', 'Tempo de equilíbrio entre sensores', req, obtido, 'INFORMATIVO', '', false, { valor: eqSeg });
      }
    }
    // Aquecimento: do início da etapa até todos os sensores atingirem a temperatura (tempo e taxa média).
    const tIniEtapa = linhas[dIni].tMediaAtiva;
    const tChegada = linhas[iTodos].tMediaAtiva;
    const minAq = (ms(linhas[iTodos]) - ms(linhas[dIni])) / 60000;
    if (minAq > 0 && isFinite(tIniEtapa) && isFinite(tChegada) && tIniEtapa !== null && tChegada !== null) {
      const taxa = (tChegada - tIniEtapa) / minAq;
      item('aquecimento', 'Tempo e taxa de aquecimento', 'Informativo (registro do tempo até a temperatura prescrita)',
        num(minAq, 2) + ' min, de ' + num(tIniEtapa, 1) + ' °C a ' + num(tChegada, 1) + ' °C (média dos sensores; taxa média de ' + num(taxa, 2) + ' °C/min)', 'INFORMATIVO', '', false,
        { valor: LavRel_roundAnalise_(minAq, 2), taxa: LavRel_roundAnalise_(taxa, 2) });
    }
  }

  // 6. Pré-lavagem / pré-enxágue (estimada pelo perfil; não decide)
  const pre = (analise.fasesProcesso.segmentos || []).filter(function(sg) { return sg.codigo === 'PRE_LAVAGEM'; })[0];
  const preMax = crit.preLavagemMaxC;
  if (preMax !== null && preMax !== undefined && isFinite(Number(preMax))) {
    const nomePre = termo ? 'Temperatura da pré-lavagem' : 'Temperatura do pré-enxágue';
    const reqP = (termo ? '≤ ' : '< ') + num(preMax, 0) + ' °C (água fria)';
    if (!pre) item('preLavagem', nomePre, reqP, 'Não avaliado: etapa não identificada no perfil de temperatura.', 'NAO_AVALIADO', 'Não avaliado: etapa não identificada no perfil de temperatura.', false);
    else {
      const ok = termo ? r2(pre.tMax) <= Number(preMax) : r2(pre.tMax) < Number(preMax);
      item('preLavagem', nomePre, reqP, 'Máxima ' + num(pre.tMax, 2) + ' °C (' + LavRel_horaLinhaAnalise_(linhas[pre.inicioIndice]) + ' a ' + LavRel_horaLinhaAnalise_(linhas[pre.fimIndice]) + ')',
        ok ? 'CONFORME' : 'NAO_CONFORME', ok ? '' : nomePre + ' acima da referência: ' + num(pre.tMax, 2) + ' °C (referência ' + reqP + ').', false, { valor: r2(pre.tMax), limite: Number(preMax) });
    }
  }
  return lista;
}

/**
 * Travas de qualidade dos dados: cada uma diz o que aconteceu, por que impede o
 * documento e como corrigir.
 */
function LavRel_avaliarQualidadeDados_(linhas, analise, idxAtivos, dtMin) {
  const q = (LavRel_UCFG && LavRel_UCFG.QUALIDADE_DADOS) || {};
  const out = { travas: [], alertas: [] };
  const num = SGO_DocA4_num_;
  const faixa = Array.isArray(q.faixaFisicaC) ? q.faixaFisicaC : [-5, 150];
  const termo = analise.tipoCiclo === 'TERMO';
  const ini = analise.janelaA0 ? analise.janelaA0.inicioIdx : analise.faseInicioExp;
  const fimExp = analise.faseFimExp;
  const comoSensor = 'Se o sensor falhou durante o ensaio, desmarque-o em "Sensores considerados na análise" e registre a falha nas observações; se o arquivo saiu errado, exporte de novo do registrador e envie.';
  function trava(codigo, oQue, porQue, comoCorrigir) { out.travas.push({ codigo: codigo, oQue: oQue, porQue: porQue, comoCorrigir: comoCorrigir }); }
  const ms = LavRel_converterTempoLinhaParaMsAnalise_;
  const media = linhas.map(function(r) { return { ms: ms(r), t: r.tMediaAtiva }; });

  idxAtivos.forEach(function(s) {
    const nome = 'S' + (s + 1);
    const serie = linhas.map(function(r) { return { ms: ms(r), t: r.temperaturas[s] }; });
    const qs = SGO_QT_qualidadeSensor_(serie, {
      faixaFisica: faixa, paradoMinLeituras: q.paradoMinLeituras, paradoVariacaoProcesso: q.paradoVariacaoProcessoC,
      picoMin: q.picoMinC, referencia: idxAtivos.length > 1 ? media : null
    });
    if (qs.foraFaixa.length) {
      const p = qs.foraFaixa[0];
      trava('LEITURA_IMPOSSIVEL', 'O sensor ' + nome + ' registrou ' + qs.foraFaixa.length + ' leitura(s) fora da faixa possível do processo; a primeira, ' + num(p.t, 2) + ' °C às ' + LavRel_horaLinhaAnalise_(linhas[p.i]) + '.',
        'Leitura fora de ' + num(faixa[0], 0) + ' °C a ' + num(faixa[1], 0) + ' °C indica sensor desconectado, danificado ou arquivo exportado com erro; usar esses valores falsearia o resultado.', comoSensor);
    }
    // Sensor parado: a variação dos outros sensores é conferida no miolo do trecho (sem as 2 leituras de cada ponta).
    // Num patamar de água estável, o sensor que demora alguns segundos a mais para acompanhar a queda seguinte
    // (água nova) não pode virar "sensor parado" só porque os outros caíram na última leitura do trecho.
    const varMin = Number(q.paradoVariacaoProcessoC) > 0 ? Number(q.paradoVariacaoProcessoC) : 5;
    qs.parado = qs.parado.filter(function(p) {
      let mn = Infinity, mx = -Infinity;
      for (let k = p.i0 + 2; k <= p.i1 - 2; k++) { const r = media[k] && media[k].t; if (r === null || r === undefined || !isFinite(r)) continue; mn = Math.min(mn, r); mx = Math.max(mx, r); }
      return isFinite(mn) && mx - mn >= varMin;
    });
    if (qs.parado.length) {
      const p = qs.parado[0];
      trava('SENSOR_PARADO', 'O sensor ' + nome + ' ficou com o mesmo valor (' + num(p.t, 2) + ' °C) em ' + (p.i1 - p.i0 + 1) + ' leituras seguidas, de ' + LavRel_horaLinhaAnalise_(linhas[p.i0]) + ' a ' + LavRel_horaLinhaAnalise_(linhas[p.i1]) + ', enquanto os outros sensores variaram.',
        'Valor que não acompanha o processo indica sensor travado ou desconectado.', comoSensor);
    }
    qs.picos.forEach(function(p) {
      const naFase = ini >= 0 && fimExp >= 0 && p.i >= ini && p.i <= fimExp;
      const texto = 'O sensor ' + nome + ' tem um pico isolado de ' + num(p.t, 2) + ' °C às ' + LavRel_horaLinhaAnalise_(linhas[p.i]) + ' (diferente das leituras vizinhas em mais de ' + num(q.picoMinC || 10, 0) + ' °C).';
      if (naFase) trava('PICO_NA_FASE', texto, 'Um pico isolado dentro da fase ' + (termo ? 'de desinfecção altera o A0' : 'do banho altera o tempo e a faixa') + ' sem representar a temperatura real.', comoSensor);
      else out.alertas.push(texto + ' Fora da fase avaliada: não altera o resultado.');
    });
  });

  if (analise.faseInicioExp >= 0 && fimExp >= analise.faseInicioExp) {
    const n = fimExp - analise.faseInicioExp + 1;
    const minL = Number(q.minLeiturasPatamar) || 5;
    if (n < minL) {
      trava('POUCAS_LEITURAS', 'A fase ' + (termo ? 'de desinfecção' : 'do banho') + ' tem só ' + n + ' leitura(s) por sensor (intervalo entre leituras de ' + num(dtMin * 60, 0) + ' s).',
        'Com menos de ' + minL + ' leituras ' + (termo ? 'o A0 e os critérios' : 'o tempo e a faixa do banho') + ' ficam sem base suficiente.',
        'Repita o ensaio com o registrador programado com intervalo menor (por exemplo, 5 ou 10 s).');
    }
    const maxFalta = Number(q.maxLeiturasFaltandoPatamar) || 0;
    idxAtivos.forEach(function(s) {
      let falta = 0, primeira = -1;
      for (let i = Math.max(0, ini); i <= fimExp; i++) { const t = linhas[i].temperaturas[s]; if (t === null || t === undefined || !isFinite(t)) { falta++; if (primeira < 0) primeira = i; } }
      if (falta > maxFalta) {
        trava('LEITURA_FALTANDO', 'O sensor S' + (s + 1) + ' não tem ' + falta + ' leitura(s) dentro da fase avaliada (a primeira às ' + LavRel_horaLinhaAnalise_(linhas[primeira]) + ').',
          'Sem a leitura, ' + (termo ? 'o A0' : 'o tempo e a faixa') + ' daquele trecho não podem ser calculados para o sensor.',
          'No modo um arquivo por sensor, confira se o arquivo do sensor cobre todo o ciclo e se os relógios dos registradores estavam acertados; no arquivo único, confira a coluna do sensor. Se o sensor falhou, desmarque-o e registre a falha.');
      }
    });
    // Lacunas: intervalo grande entre leituras dentro da fase (A0 não soma o trecho; tempo do banho ficaria sem base).
    const vistas = {};
    const lacunas = (analise.lacunasA0 || []).slice();
    if (!termo) {
      const maxMs = Math.max(1, Number(q.lacunaMaxIntervalos) || 3) * dtMin * 60000;
      for (let i = analise.faseInicioExp + 1; i <= fimExp; i++) {
        const d = ms(linhas[i]) - ms(linhas[i - 1]);
        if (d > maxMs) lacunas.push({ motivo: 'LACUNA', ms0: ms(linhas[i - 1]), ms1: ms(linhas[i]) });
      }
    }
    lacunas.forEach(function(l) {
      if (l.motivo === 'LEITURA_AUSENTE' || vistas[l.ms0]) return;
      vistas[l.ms0] = true;
      trava('LACUNA_NA_FASE', 'Há um intervalo sem leituras dentro da fase avaliada, de ' + LavRel_horaMsAnalise_(l.ms0) + ' a ' + LavRel_horaMsAnalise_(l.ms1) + '.',
        'Um intervalo maior que ' + (Number(q.lacunaMaxIntervalos) || 3) + ' vezes o intervalo normal de leitura não permite calcular ' + (termo ? 'o A0' : 'o tempo do banho') + ' daquele trecho.',
        'Confira se o arquivo do registrador está completo (exporte de novo, sem filtros) e envie.');
    });
  }
  return out;
}

function LavRel_obterParametrosRobustosExposicao_(cfg, dtMin, opcoesAnalise) {
  const raizCfg = (LavRel_UCFG && LavRel_UCFG.ANALISE) ? LavRel_UCFG.ANALISE : {};
  const cfgCiclo = (cfg && cfg.analise) ? cfg.analise : {};
  const cfgOpcoes = (opcoesAnalise && opcoesAnalise.robustez) ? opcoesAnalise.robustez : {};

  const histerese = LavRel_valorNumericoPrioritario_([cfgOpcoes.histereseTemperatura, cfgCiclo.histereseTemperatura, raizCfg.histereseTemperatura, 0.5], 0.5);
  const consecutivasInicio = Math.max(1, LavRel_parseIntPrioritario_([cfgOpcoes.consecutivasInicio, cfgCiclo.consecutivasInicio, raizCfg.consecutivasInicio, 2], 2));
  const consecutivasFim = Math.max(1, LavRel_parseIntPrioritario_([cfgOpcoes.consecutivasFim, cfgCiclo.consecutivasFim, raizCfg.consecutivasFim, 3], 3));
  // Lavadora ultrassônica: a tolerância de entrada e saída é a do banho (±3 °C, configuração do ciclo) e não
  // a dos ajustes avançados da tela, para a detecção do patamar ser coerente com o critério de faixa do banho.
  const tolBanho = cfg && cfg.criterios && isFinite(Number(cfg.criterios.toleranciaBanhoK)) && cfg.criterios.toleranciaBanhoK !== null;
  const toleranciaEntrada = tolBanho ? Number(cfgCiclo.toleranciaEntrada) : LavRel_valorNumericoPrioritario_([cfgOpcoes.toleranciaEntrada, cfgCiclo.toleranciaEntrada, raizCfg.toleranciaEntrada, 0.0], 0.0);
  const toleranciaSaida = tolBanho ? Number(cfgCiclo.toleranciaSaida) : LavRel_valorNumericoPrioritario_([cfgOpcoes.toleranciaSaida, cfgCiclo.toleranciaSaida, raizCfg.toleranciaSaida, histerese], histerese);
  const modoReconhecimentoExposicao = String(LavRel_valorPrioritario_([cfgOpcoes.modoReconhecimentoExposicao, cfgCiclo.modoReconhecimentoExposicao, raizCfg.modoReconhecimentoExposicao, 'PIOR_SENSOR'], 'PIOR_SENSOR')).toUpperCase().trim();
  const percentualMinimoSensores = LavRel_limitarEntre_(LavRel_valorNumericoPrioritario_([cfgOpcoes.percentualMinimoSensores, cfgCiclo.percentualMinimoSensores, raizCfg.percentualMinimoSensores, 1.0], 1.0), 0.01, 1.0);
  const tMin = LavRel_parseFloatSeguroAnalise_(opcoesAnalise && opcoesAnalise.setpoint, LavRel_parseFloatSeguroAnalise_(cfg.tMin, 20));

  return {
    histereseTemperatura: histerese, consecutivasInicio: consecutivasInicio, consecutivasFim: consecutivasFim,
    toleranciaEntrada: toleranciaEntrada, toleranciaSaida: toleranciaSaida, limiteInicio: tMin - toleranciaEntrada,
    limiteManutencao: tMin - toleranciaSaida, modoReconhecimentoExposicao: modoReconhecimentoExposicao,
    percentualMinimoSensores: percentualMinimoSensores, dtMin: dtMin
  };
}

function LavRel_avaliarLinhaParaExposicao_(row, sensoresAtivosIdx, paramsAnalise, etapa) {
  etapa = String(etapa || 'INICIO').toUpperCase();
  const limite = etapa === 'MANUTENCAO' ? paramsAnalise.limiteManutencao : paramsAnalise.limiteInicio;
  let sensoresValidos = 0; let sensoresComLeitura = 0;
  for (let i = 0; i < sensoresAtivosIdx.length; i++) {
    const t = row.temperaturas[sensoresAtivosIdx[i]];
    if (t === null || !isFinite(t)) continue;
    sensoresComLeitura++;
    if (LavRel_roundAnalise_(t, 2) >= limite) sensoresValidos++;
  }
  if (!sensoresComLeitura) return { valida: false, sensoresValidos: 0, sensoresComLeitura: 0, percentualValido: 0 };
  const modo = String(paramsAnalise.modoReconhecimentoExposicao || 'PIOR_SENSOR').toUpperCase();
  const pct = sensoresValidos / sensoresComLeitura;
  const valida = modo === 'PERCENTUAL' ? pct >= paramsAnalise.percentualMinimoSensores : sensoresValidos === sensoresComLeitura;
  return { valida: valida, sensoresValidos: sensoresValidos, sensoresComLeitura: sensoresComLeitura, percentualValido: LavRel_roundAnalise_(pct, 4) };
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
    for (let i = 0; i < linhas.length; i++) { const v = LavRel_converterTempoLinhaParaMsAnalise_(linhas[i]); if (isFinite(v) && v >= alvoMs) return i; }
    return fallback === undefined ? null : fallback;
  }
  if (comparador === '<=') {
    for (let i = linhas.length - 1; i >= 0; i--) { const v = LavRel_converterTempoLinhaParaMsAnalise_(linhas[i]); if (isFinite(v) && v <= alvoMs) return i; }
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
  const out = []; for (let i = 0; i < nSensores; i++) out.push(sensoresAtivos[i] === undefined ? true : !!sensoresAtivos[i]);
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

/** Diferença em minutos (4 casas; antes 1 casa, o que encurtava o tempo antes da comparação). */
function LavRel_calcularDiferencaTempo(str1, str2, dt1, dt2) {
  try {
    if (dt1 instanceof Date && !isNaN(dt1.getTime()) && dt2 instanceof Date && !isNaN(dt2.getTime())) {
      const d = dt2.getTime() - dt1.getTime(); return d > 0 ? LavRel_roundAnalise_(d / 60000, 4) : 0;
    }
    const ms1 = LavRel_parseTempoSeguroAnalise_(str1); const ms2 = LavRel_parseTempoSeguroAnalise_(str2);
    if (!isFinite(ms1) || !isFinite(ms2)) return 0;
    const d = ms2 - ms1; return d > 0 ? LavRel_roundAnalise_(d / 60000, 4) : 0;
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
  const n = Number(String(valor).replace(',', '.').trim());
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
  for (let i = 0; i < lista.length; i++) { if (lista[i] === null || lista[i] === undefined || lista[i] === '') continue; const n = Number(lista[i]); if (isFinite(n)) return n; } return fallback;
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
      const d = partes[0].trim().split('/');
      const t = partes.slice(1).join(' ').trim().split(':');
      if (d.length === 3 && t.length >= 2) {
        const dia = parseInt(d[0], 10), mes = parseInt(d[1], 10), ano = parseInt(d[2], 10);
        const hh = parseInt(t[0], 10) || 0, mm = parseInt(t[1], 10) || 0, ss = parseInt(t[2], 10) || 0;
        if (isFinite(dia) && isFinite(mes) && isFinite(ano) && dia >= 1 && dia <= 31 && mes >= 1 && mes <= 12) {
          return new Date(ano, mes - 1, dia, hh, mm, ss).getTime();
        }
      }
    }
    const direta = new Date(s).getTime();
    return !isNaN(direta) ? direta : NaN;
  } catch (e) {
    return NaN;
  }
}

/* ------------------------------------------------------------
 * FASES DO CICLO PELO PERFIL DE TEMPERATURA (21/10/2026)
 * Cada queda da temperatura média de FASES.quedaMinK ou mais (água nova entrando
 * na câmara ou no tanque) abre uma etapa. A etapa que contém a fase principal é
 * dividida em aquecimento e patamar; o que vem depois do patamar é um trecho só
 * (drenagem, secagem e resfriamento). As etapas anteriores recebem o nome pela
 * temperatura: a primeira, se fria, é a pré-lavagem (pré-enxágue na ultrassônica);
 * a mais quente é a lavagem; as seguintes, enxágues. Só a fase principal decide.
 * Devolve { segmentos, fasePorIndice, eventosPorIndice, resumo, inicioEstagioPrincipal }.
 * ------------------------------------------------------------ */
function LavRel_detectarFasesProcessoLavadoras_(linhas, analise, tipoCiclo, crit) {
  crit = crit || {};
  const total = Array.isArray(linhas) ? linhas.length : 0;
  const out = { fasePorIndice: {}, eventosPorIndice: {}, segmentos: [], resumo: [], inicioEstagioPrincipal: -1 };
  if (!total) return out;
  const termo = tipoCiclo === 'TERMO';
  const cfgF = (LavRel_UCFG && LavRel_UCFG.FASES) || {};
  const queda = Number(cfgF.quedaMinK) > 0 ? Number(cfgF.quedaMinK) : 5;
  const subida = Number(cfgF.subidaMinK) > 0 ? Number(cfgF.subidaMinK) : 2;
  const ms = LavRel_converterTempoLinhaParaMsAnalise_;
  const m = linhas.map(function(r) { return r.tMediaAtiva; });

  // Início de cada etapa: logo depois do máximo que antecede uma queda grande.
  const inicios = [0];
  let maxV = null, maxI = 0, descendo = false, minV = null;
  for (let i = 0; i < total; i++) {
    const v = m[i];
    if (v === null || !isFinite(v)) continue;
    if (maxV === null) { maxV = v; maxI = i; continue; }
    if (!descendo) {
      if (v > maxV) { maxV = v; maxI = i; }
      else if (maxV - v >= queda) {
        // A etapa termina na última leitura ainda no patamar (até 1 °C abaixo do máximo), não no primeiro máximo.
        let j = i - 1;
        while (j > maxI && !(m[j] !== null && m[j] >= maxV - 1)) j--;
        descendo = true; minV = v;
        if (j + 1 > inicios[inicios.length - 1]) inicios.push(j + 1);
      }
    } else {
      if (v < minV) minV = v;
      else if (v - minV >= subida) { descendo = false; maxV = v; maxI = i; }
    }
  }

  const ini = analise.faseInicioExp, fim = analise.faseFimExp;
  const temFase = ini >= 0 && fim >= ini;
  const rot = termo ? {
    PRE_LAVAGEM: 'Pré-lavagem', LAVAGEM_AQUECIMENTO: 'Lavagem', ENXAGUE_INTERMEDIARIO: 'Enxágue intermediário',
    AQUECIMENTO_DESINFECCAO: 'Enxágue final e aquecimento para a desinfecção', DESINFECCAO_TERMICA: 'Desinfecção térmica (patamar)',
    SECAGEM_RESFRIAMENTO: 'Drenagem, secagem e resfriamento', PREPARO_INCOMPLETO: 'Ciclo sem fase de desinfecção identificada'
  } : {
    PRE_LAVAGEM: 'Pré-enxágue', LAVAGEM_AQUECIMENTO: 'Etapa anterior ao banho', ENXAGUE_INTERMEDIARIO: 'Etapa anterior ao banho',
    AQUECIMENTO_DESINFECCAO: 'Aquecimento do banho', DESINFECCAO_TERMICA: 'Patamar do banho (cavitação)',
    SECAGEM_RESFRIAMENTO: 'Enxágue, drenagem e fim do ciclo', PREPARO_INCOMPLETO: 'Ciclo sem patamar do banho identificado'
  };
  const codigoUltra = { AQUECIMENTO_DESINFECCAO: 'AQUECIMENTO_BANHO', DESINFECCAO_TERMICA: 'CAVITACAO_ULTRASSOM', SECAGEM_RESFRIAMENTO: 'DRENAGEM_FINAL' };
  function add(a, b, codigo, estimada) {
    if (b < a) return;
    let tMin = null, tMax = null, soma = 0, n = 0;
    for (let i = a; i <= b; i++) {
      const r = linhas[i];
      if (r.tMinAtiva !== null && (tMin === null || r.tMinAtiva < tMin)) tMin = r.tMinAtiva;
      if (r.tMaxAtiva !== null && (tMax === null || r.tMaxAtiva > tMax)) tMax = r.tMaxAtiva;
      if (r.tMediaAtiva !== null) { soma += r.tMediaAtiva; n++; }
    }
    const cod = (!termo && codigoUltra[codigo]) ? codigoUltra[codigo] : codigo;
    out.segmentos.push({
      codigo: cod, nome: rot[codigo], inicioIndice: a, fimIndice: b, inicio: linhas[a].tempoStr || '', fim: linhas[b].tempoStr || '',
      duracaoMin: LavRel_roundAnalise_((ms(linhas[b]) - ms(linhas[a])) / 60000, 2),
      tMin: tMin === null ? null : LavRel_roundAnalise_(tMin, 2), tMax: tMax === null ? null : LavRel_roundAnalise_(tMax, 2), tMedia: n ? LavRel_roundAnalise_(soma / n, 2) : null,
      estimada: !!estimada
    });
    for (let i = a; i <= b; i++) out.fasePorIndice[i] = cod;
  }

  if (!temFase) {
    add(0, total - 1, 'PREPARO_INCOMPLETO', true);
  } else {
    let d = 0;
    inicios.forEach(function(x) { if (x <= ini) d = x; });
    out.inicioEstagioPrincipal = d;
    const antes = [];
    inicios.forEach(function(x, k) { if (x < d) antes.push([x, (k + 1 < inicios.length ? Math.min(inicios[k + 1], d) : d) - 1]); });
    if (antes.length) {
      const tMaxEtapa = antes.map(function(e) { let mx = -Infinity; for (let i = e[0]; i <= e[1]; i++) if (m[i] !== null && m[i] > mx) mx = m[i]; return mx; });
      const preMax = isFinite(Number(crit.preLavagemMaxC)) ? Number(crit.preLavagemMaxC) : (termo ? 45 : 35);
      let k0 = 0;
      const nomes = new Array(antes.length).fill('');
      if (tMaxEtapa[0] <= preMax && antes.length > 0) { nomes[0] = 'PRE_LAVAGEM'; k0 = 1; }
      let kLav = -1, mx = -Infinity;
      for (let k = k0; k < antes.length; k++) if (tMaxEtapa[k] > mx) { mx = tMaxEtapa[k]; kLav = k; }
      for (let k = k0; k < antes.length; k++) nomes[k] = k < kLav ? 'PRE_LAVAGEM' : (k === kLav ? 'LAVAGEM_AQUECIMENTO' : 'ENXAGUE_INTERMEDIARIO');
      // Pré-lavagens seguidas viram um trecho só.
      let a = antes[0][0];
      for (let k = 0; k < antes.length; k++) {
        const ultimo = k === antes.length - 1 || nomes[k + 1] !== nomes[k] || nomes[k] !== 'PRE_LAVAGEM';
        if (ultimo) { add(a, antes[k][1], nomes[k], true); if (k + 1 < antes.length) a = antes[k + 1][0]; }
      }
    }
    add(d, ini - 1, 'AQUECIMENTO_DESINFECCAO', true);
    add(ini, fim, 'DESINFECCAO_TERMICA', false);
    add(fim + 1, total - 1, 'SECAGEM_RESFRIAMENTO', true);
  }

  out.segmentos.forEach(function(seg) {
    const nome = String(seg.nome || '').toUpperCase();
    out.eventosPorIndice[seg.inicioIndice] = (out.eventosPorIndice[seg.inicioIndice] ? out.eventosPorIndice[seg.inicioIndice] + ' | ' : '') + 'INÍCIO - ' + nome;
    out.eventosPorIndice[seg.fimIndice] = (out.eventosPorIndice[seg.fimIndice] ? out.eventosPorIndice[seg.fimIndice] + ' | ' : '') + 'TÉRMINO - ' + nome;
  });
  out.eventosPorIndice[0] = out.eventosPorIndice[0] ? 'INÍCIO DO CICLO | ' + out.eventosPorIndice[0] : 'INÍCIO DO CICLO';
  out.eventosPorIndice[total - 1] = out.eventosPorIndice[total - 1] ? out.eventosPorIndice[total - 1] + ' | TÉRMINO DO CICLO' : 'TÉRMINO DO CICLO';
  out.resumo = out.segmentos.map(function(s) { return s.nome + ': ' + s.inicio + ' a ' + s.fim; });
  return out;
}
