/**
 * Relatório interno para lavadoras.
 * Gera dados reconstituídos com ruído controlado e marcação explícita de auditoria.
 */
function validarSenhaSimuladorAdmin_(senhaInformada) {
  const cfgSim = (UCFG && UCFG.SIMULADOR_ADMIN) ? UCFG.SIMULADOR_ADMIN : {};
  const senha = String(senhaInformada || '').trim();

  let senhaEsperada = '';
  try {
    senhaEsperada = String(PropertiesService.getScriptProperties().getProperty('SIMULADOR_ADMIN_SENHA') || '').trim();
  } catch (e) {}

  if (!senhaEsperada) {
    senhaEsperada = String(cfgSim.senhaFallback || 'METROLABS@2026').trim();
  }

  if (!senha || !senhaEsperada || senha !== senhaEsperada) {
    throw new Error('Senha administrativa inválida para gerar relatório interno.');
  }

  return true;
}
function gerarDadosSimuladosAdminLavadoras_(payload) {
  payload = payload || {};
  const cfgSim = (UCFG && UCFG.SIMULADOR_ADMIN) ? UCFG.SIMULADOR_ADMIN : {};
  validarSenhaSimuladorAdmin_(payload.simulacaoSenha);

  const motor = String(payload.motor || 'TERMO').toUpperCase().trim();
  if (motor !== 'TERMO' && motor !== 'ULTRASSOM') {
    throw new Error('Equipamento inválido para relatório interno: ' + motor);
  }

  const sim = payload.simulacao || {};
  const nSensores = clampIntSeguro_(payload.nSensores, 1, 60, UCFG.DEFAULT_N || 12);
  const intervaloSeg = Math.max(10, clampIntSeguro_(sim.intervaloSegundos, 10, 300, cfgSim.intervaloSegundos || 30));
  const setpoint = parseFloatSeguro_(sim.temperaturaAlvo || payload.setpoint, motor === 'TERMO' ? 90 : 45);

  const inicioCiclo = parseDataSimuladorLavadoras_(sim.inicioCiclo, 'início do ciclo');
  const fimCiclo = parseDataSimuladorLavadoras_(sim.fimCiclo, 'fim do ciclo');
  const inicioPrincipal = parseDataSimuladorLavadoras_(sim.inicioFasePrincipal, 'início da fase principal');
  const fimPrincipal = parseDataSimuladorLavadoras_(sim.fimFasePrincipal, 'fim da fase principal');

  if (!(inicioCiclo < fimCiclo)) throw new Error('No relatório interno, o fim do ciclo deve ser posterior ao início.');
  if (!(inicioCiclo <= inicioPrincipal && inicioPrincipal < fimPrincipal && fimPrincipal <= fimCiclo)) {
    throw new Error('No relatório interno, a fase principal deve ficar dentro do início/fim do ciclo.');
  }

  const inicioPreparo = sim.inicioPreparo ? parseDataSimuladorLavadoras_(sim.inicioPreparo, 'início do preparo') : inicioCiclo;
  const fimPreparo = sim.fimPreparo ? parseDataSimuladorLavadoras_(sim.fimPreparo, 'fim do preparo') : new Date(Math.max(inicioCiclo.getTime(), inicioPrincipal.getTime() - 5 * 60000));
  const inicioFinal = sim.inicioFinalizacao ? parseDataSimuladorLavadoras_(sim.inicioFinalizacao, 'início da finalização') : new Date(Math.min(fimCiclo.getTime(), fimPrincipal.getTime() + intervaloSeg * 1000));
  const fimFinal = sim.fimFinalizacao ? parseDataSimuladorLavadoras_(sim.fimFinalizacao, 'fim da finalizacao') : fimCiclo;

  if (!(inicioCiclo <= inicioPreparo && inicioPreparo <= fimPreparo && fimPreparo <= inicioPrincipal)) {
    throw new Error('No relatório interno, o preparo deve ocorrer antes da fase principal.');
  }
  if (!(fimPrincipal <= inicioFinal && inicioFinal <= fimFinal && fimFinal <= fimCiclo)) {
    throw new Error('No relatório interno, a finalização/secagem/drenagem deve ocorrer após a fase principal e dentro do ciclo.');
  }

  const seed = hashSimuladorLavadoras_([
    motor, nSensores, intervaloSeg, setpoint,
    inicioCiclo.getTime(), fimCiclo.getTime(), inicioPrincipal.getTime(), fimPrincipal.getTime(),
    String(payload.cliente || ''), String(payload.tag || ''), String(payload.cicloNum || '')
  ].join('|'));
  const rnd = criarRandomSimuladorLavadoras_(seed);

  const rows = [];
  for (let t = inicioCiclo.getTime(), idx = 0; t <= fimCiclo.getTime() + 250; t += intervaloSeg * 1000, idx++) {
    const dt = new Date(t);
    const temps = [];
    const base = motor === 'TERMO'
      ? temperaturaTermoSimulada_(dt, inicioCiclo, fimCiclo, inicioPreparo, fimPreparo, inicioPrincipal, fimPrincipal, inicioFinal, fimFinal, setpoint, rnd)
      : temperaturaUltraSimulada_(dt, inicioCiclo, fimCiclo, inicioPreparo, fimPreparo, inicioPrincipal, fimPrincipal, inicioFinal, fimFinal, setpoint, rnd);

    for (let s = 0; s < nSensores; s++) {
      const offsetSensor = ((s % 5) - 2) * 0.08 + (rnd() - 0.5) * 0.10;
      const atrasoSensor = motor === 'TERMO' ? Math.sin((idx + s) / 9) * 0.05 : Math.sin((idx + s) / 5) * 0.08;
      temps.push(roundSimuladorLavadoras_(base + offsetSensor + atrasoSensor, 2));
    }

    const pressao = motor === 'TERMO'
      ? sinalTermoSimulado_(dt, inicioCiclo, fimCiclo, inicioPreparo, fimPreparo, inicioPrincipal, fimPrincipal, inicioFinal, fimFinal, rnd)
      : sinalUltraSimulado_(dt, inicioCiclo, fimCiclo, inicioPreparo, fimPreparo, inicioPrincipal, fimPrincipal, inicioFinal, fimFinal, rnd);

    rows.push({
      tempoStr: Utilities.formatDate(dt, UCFG.TZ, 'dd/MM/yyyy HH:mm:ss'),
      tempoDate: dt,
      temperaturas: temps,
      pressao: pressao
    });
  }

  const header = ['Tempo'];
  for (let i = 1; i <= nSensores; i++) header.push('S' + i + ' (C)');
  header.push('Sinal analogico');

  const preview = [header].concat(rows.slice(0, UCFG.PREVIEW_ROWS || 20).map(function(r) {
    return [r.tempoStr].concat(r.temperaturas).concat([r.pressao]);
  }));

  return {
    rows: rows,
    preview: preview,
    diagnostico: {
      simulated: true,
      detectedDateStyle: 'BR',
      qtdTemperaturas: nSensores,
      hasPressao: true,
      pressaoEncontrada: true,
      motor: motor,
      intervaloSegundos: intervaloSeg,
      aviso: 'Dados reconstituídos gerados por senha administrativa e analisados manualmente pelo laboratório de metrologia.'
    },
    meta: {
      motor: motor,
      setpoint: setpoint,
      intervaloSegundos: intervaloSeg,
      seed: seed,
      inicioCiclo: Utilities.formatDate(inicioCiclo, UCFG.TZ, 'dd/MM/yyyy HH:mm:ss'),
      fimCiclo: Utilities.formatDate(fimCiclo, UCFG.TZ, 'dd/MM/yyyy HH:mm:ss'),
      inicioFasePrincipal: Utilities.formatDate(inicioPrincipal, UCFG.TZ, 'dd/MM/yyyy HH:mm:ss'),
      fimFasePrincipal: Utilities.formatDate(fimPrincipal, UCFG.TZ, 'dd/MM/yyyy HH:mm:ss')
    }
  };
}

function parseDataSimuladorLavadoras_(valor, nome) {
  const s = String(valor || '').trim();
  if (!s) throw new Error('Informe a data/hora de ' + nome + '.');
  let d = null;
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/);
  const br = s.match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (iso) d = new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]), Number(iso[4]), Number(iso[5]), Number(iso[6] || 0));
  else if (br) d = new Date(Number(br[3]), Number(br[2]) - 1, Number(br[1]), Number(br[4]), Number(br[5]), Number(br[6] || 0));
  else d = new Date(s);
  if (!d || isNaN(d.getTime())) throw new Error('Data/hora inválida para ' + nome + ': ' + s);
  return d;
}

function progressoSimuladorLavadoras_(dt, a, b) {
  const den = b.getTime() - a.getTime();
  if (den <= 0) return 1;
  return Math.max(0, Math.min(1, (dt.getTime() - a.getTime()) / den));
}

function easeSimuladorLavadoras_(x) { return x <= 0 ? 0 : (x >= 1 ? 1 : (x * x * (3 - 2 * x))); }
function lerpSimuladorLavadoras_(a, b, p) { return a + (b - a) * easeSimuladorLavadoras_(p); }
function ruidoSimuladorLavadoras_(rnd, amp) { return (rnd() - 0.5) * 2 * amp; }
function roundSimuladorLavadoras_(v, c) { const p = Math.pow(10, c || 2); return Math.round(Number(v) * p) / p; }

function temperaturaTermoSimulada_(dt, ini, fim, prepIni, prepFim, expIni, expFim, finIni, finFim, alvo, rnd) {
  let v;
  if (dt < prepFim) v = lerpSimuladorLavadoras_(25 + ruidoSimuladorLavadoras_(rnd, 0.3), 42, progressoSimuladorLavadoras_(dt, ini, prepFim));
  else if (dt < expIni) v = lerpSimuladorLavadoras_(42, alvo + 0.35, progressoSimuladorLavadoras_(dt, prepFim, expIni));
  else if (dt <= expFim) v = alvo + Math.sin(dt.getTime() / 45000) * 0.18 + ruidoSimuladorLavadoras_(rnd, 0.10);
  else if (dt < finFim) v = lerpSimuladorLavadoras_(alvo - 0.2, 52, progressoSimuladorLavadoras_(dt, finIni, finFim)) + ruidoSimuladorLavadoras_(rnd, 0.18);
  else v = 45 + ruidoSimuladorLavadoras_(rnd, 0.25);
  return v;
}

function temperaturaUltraSimulada_(dt, ini, fim, prepIni, prepFim, expIni, expFim, finIni, finFim, alvo, rnd) {
  let v;
  if (dt < prepFim) v = lerpSimuladorLavadoras_(24 + ruidoSimuladorLavadoras_(rnd, 0.25), Math.max(32, alvo - 8), progressoSimuladorLavadoras_(dt, ini, prepFim));
  else if (dt < expIni) v = lerpSimuladorLavadoras_(Math.max(32, alvo - 8), alvo + 0.2, progressoSimuladorLavadoras_(dt, prepFim, expIni));
  else if (dt <= expFim) v = alvo + Math.sin(dt.getTime() / 25000) * 0.25 + ruidoSimuladorLavadoras_(rnd, 0.12);
  else if (dt < finFim) v = lerpSimuladorLavadoras_(alvo - 0.1, 30, progressoSimuladorLavadoras_(dt, finIni, finFim)) + ruidoSimuladorLavadoras_(rnd, 0.20);
  else v = 28 + ruidoSimuladorLavadoras_(rnd, 0.25);
  return v;
}

function sinalTermoSimulado_(dt, ini, fim, prepIni, prepFim, expIni, expFim, finIni, finFim, rnd) {
  let v;
  if (dt < prepFim) v = 0.12 + 0.55 * Math.abs(Math.sin(dt.getTime() / 90000)) + ruidoSimuladorLavadoras_(rnd, 0.03);
  else if (dt < expIni) v = 0.35 + 0.45 * Math.abs(Math.sin(dt.getTime() / 70000)) + ruidoSimuladorLavadoras_(rnd, 0.04);
  else if (dt <= expFim) v = 0.82 + 0.12 * Math.sin(dt.getTime() / 50000) + ruidoSimuladorLavadoras_(rnd, 0.03);
  else if (dt < finFim) v = lerpSimuladorLavadoras_(0.65, 0.06, progressoSimuladorLavadoras_(dt, finIni, finFim)) + ruidoSimuladorLavadoras_(rnd, 0.04);
  else v = 0.04 + ruidoSimuladorLavadoras_(rnd, 0.02);
  return roundSimuladorLavadoras_(Math.max(0, Math.min(1.2, v)), 3);
}

function sinalUltraSimulado_(dt, ini, fim, prepIni, prepFim, expIni, expFim, finIni, finFim, rnd) {
  let v;
  if (dt < prepFim) v = lerpSimuladorLavadoras_(0.05, 0.45, progressoSimuladorLavadoras_(dt, ini, prepFim)) + ruidoSimuladorLavadoras_(rnd, 0.03);
  else if (dt < expIni) v = 0.42 + 0.20 * Math.sin(dt.getTime() / 45000) + ruidoSimuladorLavadoras_(rnd, 0.04);
  else if (dt <= expFim) v = 0.90 + 0.10 * Math.sin(dt.getTime() / 11000) + ruidoSimuladorLavadoras_(rnd, 0.04);
  else if (dt < finFim) v = lerpSimuladorLavadoras_(0.35, 0.02, progressoSimuladorLavadoras_(dt, finIni, finFim)) + ruidoSimuladorLavadoras_(rnd, 0.03);
  else v = 0.02 + ruidoSimuladorLavadoras_(rnd, 0.01);
  return roundSimuladorLavadoras_(Math.max(0, Math.min(1.15, v)), 3);
}

function hashSimuladorLavadoras_(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function criarRandomSimuladorLavadoras_(seed) {
  let x = seed || 123456789;
  return function() {
    x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
    return ((x >>> 0) / 4294967296);
  };
}
