/****************************************************
 * METROLABS - RELATÓRIO INTERNO / DADOS RECONSTITUÍDOS
 * Gera uma série temporal para relatório interno,
 * usando os mesmos objetos esperados pelo motor de análise.
 ****************************************************/

function AutoRel_gerarDadosSimuladosAdmin_(payload, options) {
  payload = payload || {};
  options = options || {};

  AutoRel_validarSenhaSimuladorAdmin_(payload.simulacaoSenha);

  const sim = payload.simulacao || {};
  const nSensores = AutoRel_clampIntSeguro_(payload.nSensores, 1, 60, AutoRel_UCFG.DEFAULT_N || 12);
  const intervaloSeg = AutoRel_clampIntSeguro_(sim.intervaloSegundos, 10, 600, 30);
  const alvo = AutoRel_parseFloatSeguro_(sim.temperaturaAlvo || payload.setpoint || payload.motor, Number(payload.motor || 134));

  const inicioCiclo = AutoRel_parseDataHoraSimulador_(sim.inicioCiclo);
  const fimCiclo = AutoRel_parseDataHoraSimulador_(sim.fimCiclo);
  const inicioExp = AutoRel_parseDataHoraSimulador_(sim.inicioEsterilizacao || sim.inicioExposicao);
  const fimExp = AutoRel_parseDataHoraSimulador_(sim.fimEsterilizacao || sim.fimExposicao);
  const inicioPreVacuoRaw = AutoRel_parseDataHoraSimulador_(sim.inicioPreVacuo);
  const fimPreVacuoRaw = AutoRel_parseDataHoraSimulador_(sim.fimPreVacuo);
  const inicioSecagemRaw = AutoRel_parseDataHoraSimulador_(sim.inicioSecagem);
  const fimSecagemRaw = AutoRel_parseDataHoraSimulador_(sim.fimSecagem);
  const pulsosPreVacuo = AutoRel_clampIntSeguro_(sim.pulsosPreVacuo, 0, 12, 3);
  const pressaoPulsoPositiva = AutoRel_limitarSimulador_(AutoRel_parseFloatSeguro_(sim.pressaoPulsoPositiva, 1.50), 1.05, 2.50);
  const pressaoVacuoMin = AutoRel_limitarSimulador_(AutoRel_parseFloatSeguro_(sim.pressaoVacuoMin, 0.35), 0.05, 0.95);

  if (!inicioCiclo || !fimCiclo || !inicioExp || !fimExp) {
    throw new Error('Informe data/hora válidas para início/fim do ciclo e início/fim da esterilização.');
  }

  if (!(inicioCiclo.getTime() < inicioExp.getTime() && inicioExp.getTime() < fimExp.getTime() && fimExp.getTime() < fimCiclo.getTime())) {
    throw new Error('A ordem temporal deve ser: início do ciclo < início da esterilização < fim da esterilização < fim do ciclo.');
  }

  const totalSeg = Math.round((fimCiclo.getTime() - inicioCiclo.getTime()) / 1000);
  const expSeg = Math.round((fimExp.getTime() - inicioExp.getTime()) / 1000);
  if (totalSeg < 5 * 60) {
    throw new Error('O ciclo do relatório interno deve ter pelo menos 5 minutos.');
  }
  if (expSeg < intervaloSeg * 2) {
    throw new Error('A esterilização do relatório interno deve conter pelo menos 3 leituras.');
  }

  const seedBase = AutoRel_sementeSimulacaoDeterministica_(payload, sim, 'Simulador');

  const rand = AutoRel_criarRandomSimulador_(seedBase);
  const sensorOffsets = [];
  const sensorFase = [];
  for (let s = 0; s < nSensores; s++) {
    sensorOffsets.push((rand() - 0.5) * 0.42);
    sensorFase.push(rand() * Math.PI * 2);
  }

  const inicioMs = inicioCiclo.getTime();
  const fimMs = fimCiclo.getTime();
  const inicioExpMs = inicioExp.getTime();
  const fimExpMs = fimExp.getTime();
  const margemLeituraMs = intervaloSeg * 1000;
  const inicioPreVacuoMs = inicioPreVacuoRaw ? inicioPreVacuoRaw.getTime() : inicioMs;
  const fimPreVacuoMs = fimPreVacuoRaw ? fimPreVacuoRaw.getTime() : Math.max(inicioMs + margemLeituraMs, inicioExpMs - Math.min(12 * 60000, Math.max(margemLeituraMs, (inicioExpMs - inicioMs) * 0.28)));
  const inicioSecagemMs = inicioSecagemRaw ? inicioSecagemRaw.getTime() : Math.min(fimMs - margemLeituraMs, fimExpMs + margemLeituraMs);
  const fimSecagemMs = fimSecagemRaw ? fimSecagemRaw.getTime() : Math.max(inicioSecagemMs + margemLeituraMs, fimMs - Math.min(3 * 60000, Math.max(margemLeituraMs, (fimMs - fimExpMs) * 0.18)));

  if (!(inicioMs <= inicioPreVacuoMs && inicioPreVacuoMs < fimPreVacuoMs && fimPreVacuoMs < inicioExpMs)) {
    throw new Error('Pré-vácuo do relatório interno deve ficar entre início do ciclo e início da esterilização.');
  }
  if (!(fimExpMs < inicioSecagemMs && inicioSecagemMs < fimSecagemMs && fimSecagemMs <= fimMs)) {
    throw new Error('Secagem do relatório interno deve ficar entre fim da esterilização e fim do ciclo.');
  }

  const rows = [];

  for (let ms = inicioMs, idx = 0; ms <= fimMs; ms += intervaloSeg * 1000, idx++) {
    const d = new Date(ms);
    const tempBase = AutoRel_calcularTemperaturaBaseSimulada_(ms, {
      inicioMs: inicioMs,
      fimMs: fimMs,
      inicioExpMs: inicioExpMs,
      fimExpMs: fimExpMs,
      inicioPreVacuoMs: inicioPreVacuoMs,
      fimPreVacuoMs: fimPreVacuoMs,
      inicioSecagemMs: inicioSecagemMs,
      fimSecagemMs: fimSecagemMs,
      pulsosPreVacuo: pulsosPreVacuo,
      pressaoPulsoPositiva: pressaoPulsoPositiva,
      pressaoVacuoMin: pressaoVacuoMin,
      alvo: alvo,
      rand: rand,
      idx: idx
    });

    const pressao = AutoRel_calcularPressaoSimulada_(ms, {
      inicioMs: inicioMs,
      fimMs: fimMs,
      inicioExpMs: inicioExpMs,
      fimExpMs: fimExpMs,
      inicioPreVacuoMs: inicioPreVacuoMs,
      fimPreVacuoMs: fimPreVacuoMs,
      inicioSecagemMs: inicioSecagemMs,
      fimSecagemMs: fimSecagemMs,
      pulsosPreVacuo: pulsosPreVacuo,
      pressaoPulsoPositiva: pressaoPulsoPositiva,
      pressaoVacuoMin: pressaoVacuoMin,
      alvo: alvo,
      rand: rand,
      idx: idx
    });

    const temps = [];
    for (let s = 0; s < nSensores; s++) {
      const ondaLenta = Math.sin((idx / 11) + sensorFase[s]) * 0.07;
      const ruido = (rand() - 0.5) * AutoRel_obterAmplitudeRuidoTemp_(ms, inicioExpMs, fimExpMs);
      const ajusteBorda = AutoRel_calcularAjusteSensorBorda_(ms, inicioMs, fimMs, inicioExpMs, fimExpMs, s, nSensores);
      temps.push(AutoRel_roundSimulador_(tempBase + sensorOffsets[s] + ondaLenta + ruido + ajusteBorda, 2));
    }

    rows.push({
      tempoStr: Utilities.formatDate(d, AutoRel_UCFG.TZ, 'dd/MM/yyyy HH:mm:ss'),
      tempoDate: d,
      temperaturas: temps,
      pressao: AutoRel_roundSimulador_(pressao, 3)
    });
  }

  payload.modoRelatorioSimulado = true;
  payload._simulacaoMeta = {
    origem: 'ANALISE_MANUAL_RECONSTITUIDA',
    geradoEm: Utilities.formatDate(new Date(), AutoRel_UCFG.TZ, 'dd/MM/yyyy HH:mm:ss'),
    operador: String(payload.operador || '').trim(),
    inicioCiclo: Utilities.formatDate(inicioCiclo, AutoRel_UCFG.TZ, 'dd/MM/yyyy HH:mm:ss'),
    fimCiclo: Utilities.formatDate(fimCiclo, AutoRel_UCFG.TZ, 'dd/MM/yyyy HH:mm:ss'),
    inicioEsterilizacao: Utilities.formatDate(inicioExp, AutoRel_UCFG.TZ, 'dd/MM/yyyy HH:mm:ss'),
    fimEsterilizacao: Utilities.formatDate(fimExp, AutoRel_UCFG.TZ, 'dd/MM/yyyy HH:mm:ss'),
    inicioPreVacuo: Utilities.formatDate(new Date(inicioPreVacuoMs), AutoRel_UCFG.TZ, 'dd/MM/yyyy HH:mm:ss'),
    fimPreVacuo: Utilities.formatDate(new Date(fimPreVacuoMs), AutoRel_UCFG.TZ, 'dd/MM/yyyy HH:mm:ss'),
    pulsosPreVacuo: pulsosPreVacuo,
    pressaoPulsoPositiva: pressaoPulsoPositiva,
    pressaoVacuoMin: pressaoVacuoMin,
    inicioSecagem: Utilities.formatDate(new Date(inicioSecagemMs), AutoRel_UCFG.TZ, 'dd/MM/yyyy HH:mm:ss'),
    fimSecagem: Utilities.formatDate(new Date(fimSecagemMs), AutoRel_UCFG.TZ, 'dd/MM/yyyy HH:mm:ss'),
    temperaturaAlvo: alvo,
    intervaloSegundos: intervaloSeg,
    linhasGeradas: rows.length
  };

  return rows;
}

function AutoRel_validarSenhaSimuladorAdmin_(senhaInformada) {
  const cfg = AutoRel_UCFG.SIMULADOR_ADMIN || {};
  if (cfg.habilitado === false) {
    throw new Error('Relatório interno administrativo desabilitado na configuração.');
  }

  const senha = String(senhaInformada || '').trim();
  if (!senha) {
    throw new Error('Senha administrativa obrigatória para o relatório interno.');
  }

  let senhaEsperada = '';
  try {
    senhaEsperada = String(PropertiesService.getScriptProperties().getProperty('SIMULADOR_ADMIN_SENHA') || '').trim();
  } catch (e) {}

  if (!senhaEsperada) {
    senhaEsperada = String(cfg.senhaFallback || '').trim();
  }

  if (!senhaEsperada || senha !== senhaEsperada) {
    throw new Error('Senha administrativa inválida para o relatório interno.');
  }
}

function AutoRel_parseDataHoraSimulador_(valor) {
  if (valor instanceof Date && !isNaN(valor.getTime())) return valor;
  if (typeof AutoRel_parseDataHoraRobusta_ === 'function') {
    const d = AutoRel_parseDataHoraRobusta_(valor, 'BR', null);
    if (d && !isNaN(d.getTime())) return d;
  }
  const d2 = new Date(String(valor || '').trim());
  return d2 && !isNaN(d2.getTime()) ? d2 : null;
}

function AutoRel_calcularTemperaturaBaseSimulada_(ms, ctx) {
  const ambiente = 27.5;
  const alvo = ctx.alvo;
  const preSpan = Math.max(1, ctx.fimPreVacuoMs - ctx.inicioPreVacuoMs);
  const rampaSpan = Math.max(1, ctx.inicioExpMs - ctx.fimPreVacuoMs);

  if (ms < ctx.inicioPreVacuoMs) {
    return ambiente + Math.sin((ms - ctx.inicioMs) / 90000) * 0.4;
  }

  if (ms <= ctx.fimPreVacuoMs) {
    const p = AutoRel_limitarSimulador_((ms - ctx.inicioPreVacuoMs) / preSpan, 0, 1);
    const pulso = Math.sin(p * Math.PI * Math.max(1, ctx.pulsosPreVacuo) * 2) * (1 - p) * 1.6;
    return ambiente + (52 - ambiente) * Math.pow(p, 0.75) + pulso;
  }

  if (ms < ctx.inicioExpMs) {
    const p2 = AutoRel_limitarSimulador_((ms - ctx.fimPreVacuoMs) / rampaSpan, 0, 1);
    const curva = Math.pow(p2, 0.68);
    return 52 + (alvo - 52 - 0.25) * curva + Math.sin(p2 * Math.PI * 4) * (1 - p2) * 0.9;
  }

  if (ms <= ctx.fimExpMs) {
    const p3 = AutoRel_limitarSimulador_((ms - ctx.inicioExpMs) / Math.max(1, ctx.fimExpMs - ctx.inicioExpMs), 0, 1);
    return alvo + 0.14 + Math.sin(p3 * Math.PI * 2.4) * 0.11 + p3 * 0.10;
  }

  if (ms <= ctx.fimSecagemMs) {
    const p4 = AutoRel_limitarSimulador_((ms - ctx.inicioSecagemMs) / Math.max(1, ctx.fimSecagemMs - ctx.inicioSecagemMs), 0, 1);
    return alvo - (alvo - 82) * Math.pow(p4, 0.58) + Math.sin(p4 * Math.PI * 5) * (1 - p4) * 1.2;
  }

  const p5 = AutoRel_limitarSimulador_((ms - ctx.fimSecagemMs) / Math.max(1, ctx.fimMs - ctx.fimSecagemMs), 0, 1);
  return 82 - (82 - 66) * Math.pow(p5, 0.72) + Math.sin(p5 * Math.PI * 2) * 0.5;
}
function AutoRel_calcularPressaoSimulada_(ms, ctx) {
  const pAtmos = 1.013;
  const pVapor = AutoRel_obterPressaoVaporAprox_(ctx.alvo);
  const ruido = (ctx.rand() - 0.5) * 0.018;

  if (ms < ctx.inicioPreVacuoMs) {
    return pAtmos + ruido;
  }

  if (ms <= ctx.fimPreVacuoMs && ctx.pulsosPreVacuo > 0) {
    const span = Math.max(1, ctx.fimPreVacuoMs - ctx.inicioPreVacuoMs);
    const global = AutoRel_limitarSimulador_((ms - ctx.inicioPreVacuoMs) / span, 0, 1);
    const local = ((global * ctx.pulsosPreVacuo) % 1);
    const vacMin = ctx.pressaoVacuoMin;
    const pulsoPos = ctx.pressaoPulsoPositiva;

    if (local < 0.42) {
      const q = local / 0.42;
      return pAtmos - (pAtmos - vacMin) * Math.sin(q * Math.PI / 2) + ruido;
    }
    if (local < 0.70) {
      const q2 = (local - 0.42) / 0.28;
      return vacMin + (pulsoPos - vacMin) * Math.sin(q2 * Math.PI / 2) + ruido;
    }
    const q3 = (local - 0.70) / 0.30;
    return pulsoPos - (pulsoPos - vacMin) * Math.sin(q3 * Math.PI / 2) + ruido;
  }

  if (ms < ctx.inicioExpMs) {
    const pRamp = AutoRel_limitarSimulador_((ms - ctx.fimPreVacuoMs) / Math.max(1, ctx.inicioExpMs - ctx.fimPreVacuoMs), 0, 1);
    return ctx.pressaoVacuoMin + (pVapor - ctx.pressaoVacuoMin) * Math.pow(pRamp, 1.45) + Math.sin(pRamp * Math.PI * 2) * 0.025 + ruido;
  }

  if (ms <= ctx.fimExpMs) {
    const pExp = AutoRel_limitarSimulador_((ms - ctx.inicioExpMs) / Math.max(1, ctx.fimExpMs - ctx.inicioExpMs), 0, 1);
    return pVapor + Math.sin(pExp * Math.PI * 5) * 0.018 + ruido;
  }

  if (ms <= ctx.fimSecagemMs) {
    const pSec = AutoRel_limitarSimulador_((ms - ctx.inicioSecagemMs) / Math.max(1, ctx.fimSecagemMs - ctx.inicioSecagemMs), 0, 1);
    const alvoSec = Math.max(0.18, ctx.pressaoVacuoMin - 0.08);
    return pVapor - (pVapor - alvoSec) * Math.pow(pSec, 0.62) + Math.sin(pSec * Math.PI * 4) * 0.035 + ruido;
  }

  const pFim = AutoRel_limitarSimulador_((ms - ctx.fimSecagemMs) / Math.max(1, ctx.fimMs - ctx.fimSecagemMs), 0, 1);
  const base = Math.max(0.18, ctx.pressaoVacuoMin - 0.08);
  return base + (pAtmos - base) * Math.pow(pFim, 0.82) + ruido;
}
function AutoRel_obterPressaoVaporAprox_(temp) {
  const t = Number(temp);
  if (t >= 133) return 3.05;
  if (t >= 126) return 2.45;
  if (t >= 120) return 2.05;
  if (t >= 59) return 1.18;
  return 1.08;
}

function AutoRel_obterAmplitudeRuidoTemp_(ms, inicioExpMs, fimExpMs) {
  if (ms >= inicioExpMs && ms <= fimExpMs) return 0.18;
  return 0.65;
}

function AutoRel_calcularAjusteSensorBorda_(ms, inicioMs, fimMs, inicioExpMs, fimExpMs, sensorIdx, totalSensores) {
  const borda = (sensorIdx === 0 || sensorIdx === totalSensores - 1) ? -0.16 : 0;
  if (ms >= inicioExpMs && ms <= fimExpMs) return borda;
  const p = AutoRel_limitarSimulador_((ms - inicioMs) / Math.max(1, fimMs - inicioMs), 0, 1);
  return borda * (0.3 + 0.7 * Math.sin(p * Math.PI));
}

function AutoRel_criarRandomSimulador_(seedText) {
  let h = 2166136261;
  const s = String(seedText || 'simulador');
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return function() {
    h += 0x6D2B79F5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function AutoRel_limitarSimulador_(valor, min, max) {
  const n = Number(valor);
  if (!isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}

function AutoRel_roundSimulador_(n, d) {
  const p = Math.pow(10, d || 0);
  return Math.round(Number(n || 0) * p) / p;
}




// The same settings must reproduce the same synthetic readings between draft and final.
// Authentication credentials are excluded; this helper does not read clock or UUID.
function AutoRel_sementeSimulacaoDeterministica_(payload, sim, contexto) {
  function ordenar(valor) {
    if (Array.isArray(valor)) return valor.map(ordenar);
    if (valor && typeof valor === 'object') {
      const out = {};
      Object.keys(valor).sort().forEach(function(k) { if (k !== 'senha' && k !== 'password') out[k] = ordenar(valor[k]); });
      return out;
    }
    return valor;
  }
  return JSON.stringify(ordenar({ versao: 1, contexto: contexto, motor: payload.motor || '134', setpoint: payload.setpoint || null,
    nSensores: payload.nSensores || AutoRel_UCFG.DEFAULT_N || 12, simulacao: sim,
    leakTest: contexto === 'LeakTest' ? payload.leakTest || {} : null,
    cliente: payload.cliente || '', tag: payload.tag || '' }));
}
