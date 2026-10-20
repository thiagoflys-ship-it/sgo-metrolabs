/**
 * SGO_QualifTermica_Calculos.js — cálculos comuns da qualificação térmica (20/10/2026).
 *
 * Componentes genéricos, sem dependência de módulo, para a Autoclave a vapor e para
 * outros processos térmicos (podem ser reaproveitados pela qualificação de baixa
 * temperatura e pela Lavadora). Nenhuma função lança por dado ruim: devolvem null ou
 * a lista do que encontraram, e quem chama decide se isso bloqueia o documento.
 *
 *  SGO_QT_tSatVaporC_(pBarAbs)            temperatura de saturação do vapor de água (°C)
 *                                          a partir da pressão absoluta (bar), pela equação
 *                                          de saturação da IAPWS-IF97 (região 4, equação
 *                                          de retorno T(p)).
 *  SGO_QT_letalidadeTrapezio_(pontos, tRef, z, opcoes)
 *                                          letalidade acumulada (F0, A0 ou equivalente) pela
 *                                          regra dos trapézios com o intervalo real entre as
 *                                          leituras.
 *  SGO_QT_qualidadeSensor_(serie, opcoes)  leituras impossíveis, sensor parado (valor que
 *                                          não muda enquanto o processo muda) e picos isolados.
 *  SGO_QT_incertezaLetalidade_(L, uT, z)   incerteza da letalidade por propagação de primeira
 *                                          ordem de um erro constante de temperatura.
 */

/* ------------------------------------------------------------
 * Vapor saturado — IAPWS-IF97, região 4 (equação de retorno T_s(p))
 * Validade: 611,213 Pa a 22,064 MPa. p em bar absoluto; devolve °C ou null.
 * ------------------------------------------------------------ */
var SGO_QT_IF97_N = [
  0.11670521452767e4, -0.72421316598847e6, -0.17073846940092e2, 0.12020824702470e5,
  -0.32325550322333e7, 0.14915108613530e2, -0.48232657361591e4, 0.40511340542057e6,
  -0.23855557567849, 0.65017534844798e3
];

function SGO_QT_tSatVaporC_(pBarAbs) {
  var p = Number(pBarAbs);
  if (!isFinite(p)) return null;
  var pMPa = p / 10;
  if (pMPa < 611.213e-6 || pMPa > 22.064) return null;
  var n = SGO_QT_IF97_N;
  var beta = Math.pow(pMPa, 0.25);
  var E = beta * beta + n[2] * beta + n[5];
  var F = n[0] * beta * beta + n[3] * beta + n[6];
  var G = n[1] * beta * beta + n[4] * beta + n[7];
  var D = 2 * G / (-F - Math.sqrt(F * F - 4 * E * G));
  var T = (n[9] + D - Math.sqrt(Math.pow(n[9] + D, 2) - 4 * (n[8] + n[9] * D))) / 2;
  return T - 273.15;
}

/** Pressão de saturação do vapor de água (bar absoluto) a partir da temperatura (°C), IAPWS-IF97 região 4 (273,15 K a 647,096 K). */
function SGO_QT_pSatVaporBar_(tC) {
  var T = Number(tC) + 273.15;
  if (!isFinite(T) || T < 273.15 || T > 647.096) return null;
  var n = SGO_QT_IF97_N;
  var th = T + n[8] / (T - n[9]);
  var A = th * th + n[0] * th + n[1];
  var B = n[2] * th * th + n[3] * th + n[4];
  var C = n[5] * th * th + n[6] * th + n[7];
  var pMPa = Math.pow(2 * C / (-B + Math.sqrt(B * B - 4 * A * C)), 4);
  return pMPa * 10;
}

/* ------------------------------------------------------------
 * Letalidade acumulada pela regra dos trapézios
 * pontos: [{ ms, t }] em ordem de tempo (t em °C, null quando não há leitura).
 * Cada intervalo entre duas leituras válidas soma
 *   (L(T1) + L(T2)) / 2 · Δt,   L(T) = 10^((T − Tref) / z),   Δt em minutos.
 * Intervalo com leitura ausente, tempo não crescente ou lacuna maior que
 * opcoes.maxIntervaloMs não soma e é devolvido em "lacunas".
 * Devolve { total, linhas:[{ms, t, fator, dtMin, contribuicao, acumulado}], lacunas:[{ms0, ms1, motivo}] }.
 * ------------------------------------------------------------ */
function SGO_QT_letalidadeTrapezio_(pontos, tRef, z, opcoes) {
  opcoes = opcoes || {};
  var maxMs = Number(opcoes.maxIntervaloMs) > 0 ? Number(opcoes.maxIntervaloMs) : Infinity;
  var out = { total: 0, linhas: [], lacunas: [] };
  var lista = Array.isArray(pontos) ? pontos : [];
  var ant = null;
  for (var i = 0; i < lista.length; i++) {
    var pt = lista[i] || {};
    var t = (pt.t === null || pt.t === undefined || pt.t === '') ? NaN : Number(pt.t);
    var ms = Number(pt.ms);
    var valido = isFinite(t) && isFinite(ms);
    var fator = valido ? Math.pow(10, (t - tRef) / z) : null;
    var linha = { ms: ms, t: valido ? t : null, fator: fator, dtMin: 0, contribuicao: 0, acumulado: out.total };
    if (valido && ant) {
      var dtMs = ms - ant.ms;
      if (!(dtMs > 0)) {
        out.lacunas.push({ ms0: ant.ms, ms1: ms, motivo: 'TEMPO_NAO_CRESCENTE' });
      } else if (dtMs > maxMs) {
        out.lacunas.push({ ms0: ant.ms, ms1: ms, motivo: 'LACUNA' });
      } else {
        linha.dtMin = dtMs / 60000;
        linha.contribuicao = (ant.fator + fator) / 2 * linha.dtMin;
        out.total += linha.contribuicao;
        linha.acumulado = out.total;
      }
    } else if (!valido && ant) {
      out.lacunas.push({ ms0: ant.ms, ms1: ms, motivo: 'LEITURA_AUSENTE' });
    }
    out.linhas.push(linha);
    ant = valido ? { ms: ms, fator: fator } : null;
  }
  return out;
}

/** Incerteza expandida da letalidade para um erro constante U(T) de temperatura: U(L) ≈ L · ln(10) / z · U(T). */
function SGO_QT_incertezaLetalidade_(letalidade, uTemperatura, z) {
  var L = Number(letalidade), u = Number(uTemperatura), zz = Number(z);
  if (!isFinite(L) || !isFinite(u) || !(zz > 0) || u < 0) return null;
  return L * Math.LN10 / zz * u;
}

/* ------------------------------------------------------------
 * Qualidade da série de um sensor
 * serie: [{ ms, t }]; opcoes:
 *   faixaFisica: [min, max] (°C)       leitura fora = impossível para o processo;
 *   paradoMinLeituras (10)              leituras idênticas seguidas para suspeitar de sensor parado;
 *   paradoVariacaoProcesso (5)          variação mínima da referência (°C) no mesmo trecho;
 *   referencia: [{ ms, t }]             média dos outros sensores, mesma linha do tempo;
 *   picoMin (10)                        diferença (°C) para os dois vizinhos, no mesmo sentido.
 * Devolve { foraFaixa:[{i, t}], parado:[{i0, i1, t}], picos:[{i, t}] }.
 * ------------------------------------------------------------ */
function SGO_QT_qualidadeSensor_(serie, opcoes) {
  opcoes = opcoes || {};
  var s = Array.isArray(serie) ? serie : [];
  var faixa = Array.isArray(opcoes.faixaFisica) ? opcoes.faixaFisica : null;
  var nParado = Number(opcoes.paradoMinLeituras) > 1 ? Number(opcoes.paradoMinLeituras) : 10;
  var varProc = Number(opcoes.paradoVariacaoProcesso) > 0 ? Number(opcoes.paradoVariacaoProcesso) : 5;
  var picoMin = Number(opcoes.picoMin) > 0 ? Number(opcoes.picoMin) : 10;
  var ref = Array.isArray(opcoes.referencia) ? opcoes.referencia : null;
  var out = { foraFaixa: [], parado: [], picos: [] };
  function val(i) { var v = s[i] && s[i].t; return (v === null || v === undefined || v === '') ? NaN : Number(v); }
  for (var i = 0; i < s.length; i++) {
    var t = val(i);
    if (!isFinite(t)) continue;
    if (faixa && (t < faixa[0] || t > faixa[1])) out.foraFaixa.push({ i: i, t: t });
    var a = val(i - 1), b = val(i + 1);
    if (isFinite(a) && isFinite(b)) {
      var da = t - a, db = t - b;
      if (Math.abs(da) >= picoMin && Math.abs(db) >= picoMin && (da > 0) === (db > 0)) out.picos.push({ i: i, t: t });
    }
  }
  // Sensor parado: trecho de leituras idênticas enquanto a referência varia.
  var i0 = 0;
  for (var j = 1; j <= s.length; j++) {
    var igual = j < s.length && isFinite(val(j)) && val(j) === val(i0);
    if (igual) continue;
    var n = j - i0;
    if (n >= nParado && isFinite(val(i0))) {
      var variacao = null;
      if (ref) {
        var mn = Infinity, mx = -Infinity;
        for (var k = i0; k < j; k++) {
          var r = ref[k] && ref[k].t;
          if (r === null || r === undefined || !isFinite(Number(r))) continue;
          mn = Math.min(mn, Number(r)); mx = Math.max(mx, Number(r));
        }
        variacao = isFinite(mn) ? mx - mn : null;
      }
      if (variacao !== null && variacao >= varProc) out.parado.push({ i0: i0, i1: j - 1, t: val(i0) });
    }
    i0 = j;
  }
  return out;
}

/* ------------------------------------------------------------
 * Mesclagem de registradores individuais (um arquivo por sensor)
 * series: [ [{ tempoDate, tempoStr, valor }] | null ] (null = sensor sem arquivo).
 * A série com mais leituras é a linha do tempo de referência. Cada sensor entra com a
 * leitura de horário mais próximo dentro da tolerância (metade do intervalo mediano da
 * referência); fora dela, o ponto fica sem leitura (null) e é contado.
 * Devolve { referencia, toleranciaMs, linhas:[{tempoDate, tempoStr, valores:[...]}],
 *           resumo:[{ leituras, semCorrespondencia, maiorDefasagemSeg, inicio, fim } | null] }.
 * ------------------------------------------------------------ */
function SGO_QT_mesclarSeries_(series, opcoes) {
  opcoes = opcoes || {};
  var n = (series || []).length;
  var refIdx = -1, refLen = 0;
  for (var s = 0; s < n; s++) if (Array.isArray(series[s]) && series[s].length > refLen) { refLen = series[s].length; refIdx = s; }
  if (refIdx < 0) throw new Error('Nenhum arquivo de sensor com leituras válidas foi encontrado.');
  var ref = series[refIdx];
  var dts = [];
  for (var i = 1; i < ref.length; i++) { var d = ref[i].tempoDate.getTime() - ref[i - 1].tempoDate.getTime(); if (d > 0) dts.push(d); }
  dts.sort(function (a, b) { return a - b; });
  var mediana = dts.length ? dts[Math.floor(dts.length / 2)] : 60000;
  var tol = Number(opcoes.toleranciaMs) > 0 ? Number(opcoes.toleranciaMs) : Math.round(mediana * 0.5);
  var ponteiro = new Array(n).fill(0);
  var resumo = series.map(function (se) {
    return Array.isArray(se) && se.length ? { leituras: se.length, semCorrespondencia: 0, maiorDefasagemSeg: 0, inicio: se[0].tempoStr, fim: se[se.length - 1].tempoStr } : null;
  });
  var linhas = ref.map(function (lr) {
    var alvo = lr.tempoDate.getTime();
    var valores = new Array(n).fill(null);
    for (var k = 0; k < n; k++) {
      var se = series[k];
      if (!Array.isArray(se) || !se.length) continue;
      var p = ponteiro[k];
      while (p < se.length - 1 && Math.abs(se[p + 1].tempoDate.getTime() - alvo) <= Math.abs(se[p].tempoDate.getTime() - alvo)) p++;
      ponteiro[k] = p;
      var dif = Math.abs(se[p].tempoDate.getTime() - alvo);
      if (dif <= tol) {
        valores[k] = se[p].valor;
        if (dif / 1000 > resumo[k].maiorDefasagemSeg) resumo[k].maiorDefasagemSeg = dif / 1000;
      } else {
        resumo[k].semCorrespondencia++;
      }
    }
    return { tempoDate: lr.tempoDate, tempoStr: lr.tempoStr, valores: valores };
  });
  return { referencia: refIdx, toleranciaMs: tol, linhas: linhas, resumo: resumo };
}
