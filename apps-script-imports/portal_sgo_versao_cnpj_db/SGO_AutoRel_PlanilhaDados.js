/****************************************************
 * METROLABS — AUTOCLAVE A VAPOR — PLANILHA DE DADOS DO ENSAIO (modelo novo, 20/10/2026)
 *
 * Documento A4 em PAISAGEM (HTML para impressão + PDF salvo na pasta do cliente),
 * no padrão comum SGO_DocA4: capa com a ficha do ensaio, índice com as páginas,
 * quadro-resumo dos critérios, condições do ensaio, resultados por sensor e por
 * fase, gráficos em SVG estático, memória de cálculo (F0, vapor saturado, tempo
 * de equilíbrio, incerteza, estanqueidade), não conformidades, assinaturas e as
 * leituras do registrador paginadas (cabeçalho em todas as folhas).
 *
 * Substitui a planilha do Google Planilhas (SGO_AutoRel_Planilha.js, "modelo
 * anterior"), que continua no código, intacta, e volta a ser usada só se o
 * responsável pelo sistema gravar AUTOREL_PLANILHA_MODELO = ANTERIOR em
 * Chaves e senhas (grupo Relatórios técnicos). Documentos já emitidos com o
 * modelo anterior continuam na pasta do cliente como estão.
 *
 * Os números vêm do mesmo pacote de fatos do relatório de ensaio em retrato
 * (AutoRel_acMontarContextoCertificado_ → motor AutoRel_analisarCiclo /
 * AutoRel_analisarLeakTest_): F0, médias, mínimas e máximas são os do motor.
 * Aqui só se acrescentam estatísticas descritivas (desvio-padrão, tempo na
 * faixa, horário em que cada sensor atingiu a temperatura) e a demonstração
 * passo a passo dos cálculos.
 *
 * Emissão pelo mesmo fluxo do relatório (QUALIF_EMISSOES, SGO_QualifEmissao.js),
 * no módulo AUTOCLAVE_DADOS: o responsável técnico emite direto (com a
 * confirmação); os demais enviam para aprovação e o responsável confere a
 * prévia e emite ou devolve. Reemitir o mesmo número gera nova revisão.
 * Dado com problema (travas do motor ou do registrador) não vira documento.
 * "Analisar pressão" desligado: nenhuma coluna, gráfico ou texto de pressão,
 * só a frase do escopo com a justificativa.
 ****************************************************/

var AUTOREL_MODULO_EMISSAO_DADOS = 'AUTOCLAVE_DADOS';
var AUTOREL_PD_PROP_MODELO = 'AUTOREL_PLANILHA_MODELO';

/** Modelo da planilha de dados em uso: 'NOVO' (padrão) ou 'ANTERIOR' (só pelo responsável pelo sistema, em Chaves e senhas). */
function AutoRel_planilhaModelo_() {
  try {
    var v = String(PropertiesService.getScriptProperties().getProperty(AUTOREL_PD_PROP_MODELO) || '').trim().toUpperCase();
    return v === 'ANTERIOR' ? 'ANTERIOR' : 'NOVO';
  } catch (e) {
    return 'NOVO';
  }
}

/* ============================================================
 * Utilidades
 * ============================================================ */

function AutoRel_pdN_(v, casas) { return SGO_DocA4_num_(v, casas); }
function AutoRel_pdV_(v, casas, un) { return SGO_DocA4_val_(v, casas, un); }
function AutoRel_pdE_(s) { return SGO_DocA4_esc_(s); }
function AutoRel_pdR2_(v) { return Math.round(v * 100) / 100; }

/** Arredonda a incerteza para 2 algarismos significativos e devolve as casas decimais correspondentes. */
function AutoRel_pdCasasIncerteza_(u) {
  if (!(u > 0) || !isFinite(u)) return 2;
  var exp = Math.floor(Math.log(u) / Math.LN10);
  return Math.max(0, 1 - exp);
}

function AutoRel_pdMs_(row) {
  var ms = AutoRel_converterTempoLinhaParaMsAnalise_(row);
  return isFinite(ms) ? ms : null;
}

function AutoRel_pdHora_(row) {
  return AutoRel_acSoHora_(row && row.tempoStr);
}

function AutoRel_pdFmtHora_(ms, tz, comSegundos) {
  try { return Utilities.formatDate(new Date(ms), tz, comSegundos ? 'HH:mm:ss' : 'HH:mm'); } catch (e) { return ''; }
}

function AutoRel_pdDuracao_(min) {
  if (!isFinite(min)) return '—';
  return AutoRel_pdV_(min, 2, 'min');
}

/* ============================================================
 * Preparação dos dados (mesmas leituras e correção do motor)
 * ============================================================ */

var AUTOREL_PD_NOME_FASE = {
  PRE_VACUO: 'Pulso de vácuo',
  RAMPA_AQUECIMENTO: 'Aquecimento',
  ESTERILIZACAO: 'Exposição',
  DESPRESSURIZACAO: 'Despressurização',
  SECAGEM: 'Secagem (vácuo)',
  ANTES: 'Início do registro',
  ENTRE: 'Entre pulsos',
  INTERVALO: 'Sem fase identificada',
  DEPOIS: 'Após a exposição'
};

/** Nome curto da fase na coluna "Fase" das leituras. */
var AUTOREL_PD_FASE_CURTA = {
  PRE_VACUO: 'Pulso de vácuo', RAMPA_AQUECIMENTO: 'Aquecimento', ESTERILIZACAO: 'Exposição', DESPRESSURIZACAO: 'Despressurização',
  SECAGEM: 'Secagem', ANTES: 'Início', ENTRE: 'Entre pulsos', INTERVALO: '—', DEPOIS: 'Após'
};

var AUTOREL_PD_COR_FASE = {
  PRE_VACUO: '#d6e4f5', RAMPA_AQUECIMENTO: '#fbe6c8', ESTERILIZACAO: '#d4ecdc',
  DESPRESSURIZACAO: '#e7def2', SECAGEM: '#dfe5ec', ANTES: '#eef1f4', ENTRE: '#eef1f4', INTERVALO: '#eef1f4', DEPOIS: '#eef1f4'
};

function AutoRel_pdPrepararCiclo_(contexto, resultado) {
  var a = resultado.analise || {};
  var payload = resultado.payload || {};
  var dados = resultado.dadosNormalizados || [];
  var ativos = resultado.sensoresAtivos || a.sensoresAtivos || [];
  var f = contexto.estudos[0].fatos || {};
  var ref = f.temperaturaReferencia || {};
  var comPressao = contexto.analisarPressao !== false;
  var desloc = AutoRel_parseFloatSeguro_(payload.offsetTemp, 0);
  var tz = AutoRel_UCFG.TZ || 'America/Sao_Paulo';
  var unidade = String(((payload.equipamento || {}).unidadePressao) || 'BAR_ABS').toUpperCase();
  var rotuloUnidade = { BAR_ABS: 'bar abs.', BAR_REL: 'bar rel.', MBAR_ABS: 'mbar abs.', KPA_ABS: 'kPa abs.' }[unidade] || 'bar abs.';
  var tMin = Number(ref.tMin), tMax = Number(ref.tMax);

  var idxAtivos = [];
  var nInst = 0;
  dados.forEach(function(r) { if (r && r.temperaturas && r.temperaturas.length > nInst) nInst = r.temperaturas.length; });
  for (var s = 0; s < nInst; s++) if (ativos[s]) idxAtivos.push(s);

  var linhas = dados.map(function(r, i) {
    var t = [];
    for (var k = 0; k < nInst; k++) {
      var v = AutoRel_parseFloatSeguroAnalise_(r && r.temperaturas ? r.temperaturas[k] : null, null);
      t.push(v === null ? null : v + desloc);
    }
    var p = comPressao ? AutoRel_parseFloatSeguroAnalise_(r.pressao, null) : null;
    var tsat = (comPressao && p !== null && p > 0 && unidade === 'BAR_ABS') ? SGO_QT_tSatVaporC_(p) : null;
    return { i: i, hora: AutoRel_pdHora_(r), ms: AutoRel_pdMs_(r), t: t, p: p, tsat: tsat };
  });

  var fp = a.fasesProcesso || {};
  var porIdx = fp.fasePorIndice || {};
  linhas.forEach(function(l) { l.fase = porIdx[String(l.i)] && porIdx[String(l.i)] !== 'CICLO' ? porIdx[String(l.i)] : ''; });

  var ini = a.faseInicioExp, fim = a.faseFimExp;
  var temExp = isFinite(ini) && ini >= 0 && isFinite(fim) && fim >= ini;
  var patamar = f.patamar || null;

  function leit(l, k) { var v = l.t[k]; return v === null || !isFinite(v) ? null : v; }

  // Por sensor: mínima, máxima e média são as do motor (contexto); o resto é descritivo.
  var conf = {};
  (f.conformidadePorSensor || []).forEach(function(c) { conf[c.sensor] = c; });
  var refIdx = f.sensorReferencia ? Number(String(f.sensorReferencia).replace(/\D/g, '')) - 1 : -1;
  var primeiro = {};
  idxAtivos.forEach(function(k) {
    var lim = temExp ? fim : linhas.length - 1;
    for (var i = 0; i <= lim; i++) { var v = leit(linhas[i], k); if (v !== null && AutoRel_pdR2_(v) >= tMin) { primeiro[k] = i; break; } }
  });
  var iRefPrim = -1;
  if (refIdx >= 0 && primeiro[refIdx] !== undefined) iRefPrim = primeiro[refIdx];
  else idxAtivos.forEach(function(k) { if (primeiro[k] !== undefined && (iRefPrim < 0 || primeiro[k] < iRefPrim)) iRefPrim = primeiro[k]; });

  var porSensor = idxAtivos.map(function(k) {
    var nome = 'S' + (k + 1);
    var c = conf[nome] || {};
    var vals = [];
    var tempoFaixa = 0;
    if (temExp) {
      for (var i = ini; i <= fim; i++) { var v = leit(linhas[i], k); if (v !== null) vals.push(v); }
      if (patamar) {
        for (var j = patamar.inicioIdx + 1; j <= patamar.fimIdx; j++) {
          var v0 = leit(linhas[j - 1], k), v1 = leit(linhas[j], k);
          if (v0 === null || v1 === null || linhas[j].ms === null || linhas[j - 1].ms === null) continue;
          if (AutoRel_pdR2_(v0) >= tMin && AutoRel_pdR2_(v0) <= tMax && AutoRel_pdR2_(v1) >= tMin && AutoRel_pdR2_(v1) <= tMax) tempoFaixa += (linhas[j].ms - linhas[j - 1].ms) / 60000;
        }
      }
    }
    var media = vals.length ? vals.reduce(function(x, y) { return x + y; }, 0) / vals.length : null;
    var desvio = vals.length > 1 ? Math.sqrt(vals.reduce(function(x, y) { return x + (y - media) * (y - media); }, 0) / (vals.length - 1)) : null;
    var p = primeiro[k];
    return {
      sensor: nome, idx: k, n: vals.length,
      min: c.minTemp, max: c.maxTemp, media: c.mediaTemp, f0: c.f0, conforme: c.statusSensor ? c.statusSensor === 'CONFORME' : null,
      desvio: desvio, tempoFaixaMin: patamar ? tempoFaixa : null,
      primeiraHora: p !== undefined ? linhas[p].hora : '',
      atrasoSeg: (p !== undefined && iRefPrim >= 0 && linhas[p].ms !== null && linhas[iRefPrim].ms !== null) ? Math.max(0, (linhas[p].ms - linhas[iRefPrim].ms) / 1000) : null,
      pior: !!(f.piorSensorF0 && f.piorSensorF0.sensor === nome),
      referencia: f.sensorReferencia === nome
    };
  });

  // Fases do ciclo (segmentos do motor; trechos sem fase identificada entram como início/após).
  var segs = (fp.segmentos || []).filter(function(sg) { return sg.tipo !== 'CICLO'; }).slice().sort(function(x, y) { return x.inicioIdx - y.inicioIdx; });
  var lista = [];
  var cursor = 0, anterior = null;
  function tipoLacuna(g, proximo) {
    if (g === 0) return 'ANTES';
    if (anterior === 'PRE_VACUO' && proximo === 'PRE_VACUO') return 'ENTRE';
    if (temExp && g < ini) return 'INTERVALO';
    return 'DEPOIS';
  }
  segs.forEach(function(sg) {
    if (sg.inicioIdx > cursor) lista.push({ tipo: tipoLacuna(cursor, sg.tipo), ini: cursor, fim: sg.inicioIdx - 1 });
    if (sg.inicioIdx >= cursor) { lista.push({ tipo: sg.tipo, ini: sg.inicioIdx, fim: sg.fimIdx, numero: sg.numero }); cursor = sg.fimIdx + 1; anterior = sg.tipo; }
  });
  if (cursor <= linhas.length - 1 && linhas.length) lista.push({ tipo: tipoLacuna(cursor, ''), ini: cursor, fim: linhas.length - 1 });
  lista.forEach(function(sg) { for (var q = sg.ini; q <= sg.fim; q++) if (linhas[q]) linhas[q].fase = sg.tipo; });
  var fases = lista.map(function(sg) {
    var mn = null, mx = null, soma = 0, n = 0, pmn = null, pmx = null;
    for (var i = sg.ini; i <= sg.fim; i++) {
      idxAtivos.forEach(function(k) { var v = leit(linhas[i], k); if (v === null) return; if (mn === null || v < mn) mn = v; if (mx === null || v > mx) mx = v; soma += v; n++; });
      var pp = linhas[i].p;
      if (pp !== null && isFinite(pp)) { if (pmn === null || pp < pmn) pmn = pp; if (pmx === null || pp > pmx) pmx = pp; }
    }
    var a0 = linhas[sg.ini], a1 = linhas[sg.fim];
    return {
      tipo: sg.tipo, nome: AUTOREL_PD_NOME_FASE[sg.tipo] + (sg.tipo === 'PRE_VACUO' && sg.numero ? ' ' + sg.numero : ''),
      ini: sg.ini, fim: sg.fim, inicio: a0 ? a0.hora : '', termino: a1 ? a1.hora : '',
      duracaoMin: (a0 && a1 && a0.ms !== null && a1.ms !== null) ? (a1.ms - a0.ms) / 60000 : null,
      leituras: sg.fim - sg.ini + 1, tMin: mn, tMax: mx, tMed: n ? soma / n : null, pMin: pmn, pMax: pmx
    };
  });

  var t0 = linhas.length ? linhas[0].ms : null;
  return {
    leak: false, comPressao: comPressao, tz: tz, linhas: linhas, idxAtivos: idxAtivos, nInst: nInst, desloc: desloc,
    unidadePressao: unidade, rotuloUnidade: rotuloUnidade, temTsat: comPressao && unidade === 'BAR_ABS',
    temExp: temExp, ini: ini, fim: fim, patamar: patamar, ref: ref, tMin: tMin, tMax: tMax, f0Min: f.f0MinNormativo,
    porSensor: porSensor, fases: fases, t0: t0, iRefPrimeiro: iRefPrim, refIdx: refIdx,
    dtSeg: isFinite(a.deltaMinutosEstimado) ? a.deltaMinutosEstimado * 60 : null,
    memoriaF0: a.memoriaF0PorSensor || [], analise: a, fatos: f
  };
}

function AutoRel_pdPrepararLeak_(contexto, resultado) {
  var a = resultado.analiseLeak || {};
  var dados = resultado.dadosNormalizados || [];
  var ativos = resultado.sensoresAtivos || [];
  var tz = AutoRel_UCFG.TZ || 'America/Sao_Paulo';
  var fator = AutoRel_obterFatorConversaoParaMbarLeakTest_(a.unidadePressaoOriginal);
  var nInst = 0;
  dados.forEach(function(r) { if (r && r.temperaturas && r.temperaturas.length > nInst) nInst = r.temperaturas.length; });
  var idxAtivos = [];
  for (var s = 0; s < nInst; s++) if (ativos[s]) idxAtivos.push(s);
  var pIni = a.pressaoInicioMbar;
  var linhas = dados.map(function(r, i) {
    var p = AutoRel_parseFloatSeguroAnalise_(r.pressao, null);
    var t = [];
    for (var k = 0; k < nInst; k++) t.push(AutoRel_parseFloatSeguroAnalise_(r && r.temperaturas ? r.temperaturas[k] : null, null));
    return { i: i, hora: AutoRel_pdHora_(r), ms: AutoRel_pdMs_(r), t: t, p: p, pMbar: p === null ? null : p * fator,
      dentro: i >= a.indiceInicio && i <= a.indiceFim };
  });
  linhas.forEach(function(l) { l.variacao = (l.dentro && l.pMbar !== null && isFinite(pIni)) ? l.pMbar - pIni : null; });
  return {
    leak: true, comPressao: true, tz: tz, linhas: linhas, idxAtivos: idxAtivos, nInst: nInst, fator: fator,
    unidade: String(a.unidadePressaoOriginal || 'MBAR').toUpperCase(), analise: a, fatos: contexto.estudos[0].fatos || {},
    t0: linhas.length ? linhas[0].ms : null
  };
}

/* ============================================================
 * Gráficos em SVG estático (sem biblioteca, nítidos na impressão)
 * ============================================================ */

function AutoRel_pdF1_(n) { return (Math.round(n * 10) / 10).toString(); }

/** Passo de tempo "de relógio" (minutos) para o eixo X. */
function AutoRel_pdPassoTempo_(faixaMin, alvo) {
  var passos = [5 / 60, 10 / 60, 15 / 60, 0.5, 1, 2, 5, 10, 15, 20, 30, 60, 120, 240];
  for (var i = 0; i < passos.length; i++) if (faixaMin / passos[i] <= (alvo || 10)) return passos[i];
  return passos[passos.length - 1];
}

/**
 * Gráfico de linhas.
 * o = { largura, altura, series:[{nome, cor, pontos:[[x,y]], largura, tracejado}], x em minutos desde t0Ms (eixo de horário)
 *       ou numérico (eixoNumerico:true, formatarX), rotuloX, rotuloY, casasY, yMin, yMax,
 *       faixaY:{y0,y1,cor}, fases:[{x0,x1,cor,rotulo}] (faixa colorida acima do gráfico e fundo leve),
 *       destaqueX:{x0,x1,cor} (fundo), referencias:[{y,rotulo,cor,tracejado}], bandas:[{pontos:[[x,ymin,ymax]], cor}],
 *       legendaPorLinha, tz, t0Ms }
 * Devolve { svg, cortado }.
 */
function AutoRel_pdGraficoLinhas_(o) {
  var W = o.largura || 1000, H = o.altura || 360;
  var series = (o.series || []).map(function(s, i) {
    var pts = (s.pontos || []).filter(function(p) { return p && isFinite(p[0]) && p[1] !== null && isFinite(p[1]); });
    return { nome: s.nome, cor: s.cor || SGO_DocA4_corSerie_(i), pontos: SGO_DocA4_reduzir_(pts, o.pontosMax || 420), largura: s.largura || 1.2, tracejado: !!s.tracejado };
  }).filter(function(s) { return s.pontos.length; });
  if (!series.length) return { svg: '', cortado: null };

  var xmin = Infinity, xmax = -Infinity, ymin = Infinity, ymax = -Infinity;
  series.forEach(function(s) { s.pontos.forEach(function(p) { xmin = Math.min(xmin, p[0]); xmax = Math.max(xmax, p[0]); ymin = Math.min(ymin, p[1]); ymax = Math.max(ymax, p[1]); }); });
  // Escala robusta: leitura isolada muito fora do conjunto não achata o gráfico (fica fora da escala e é citada na legenda).
  var todos = [];
  series.forEach(function(s) { s.pontos.forEach(function(p) { todos.push(p[1]); }); });
  todos.sort(function(x, y) { return x - y; });
  var qlo = todos[Math.floor(todos.length * 0.003)], qhi = todos[Math.min(todos.length - 1, Math.ceil(todos.length * 0.997) - 1)];
  var margemQ = Math.max(1, (qhi - qlo) * 0.25);
  var cortado = null;
  if (!isFinite(o.yMin) && ymin < qlo - margemQ) { cortado = { min: ymin }; ymin = qlo; }
  if (!isFinite(o.yMax) && ymax > qhi + margemQ) { cortado = cortado || {}; cortado.max = ymax; ymax = qhi; }
  (o.referencias || []).forEach(function(r) { if (isFinite(r.y)) { ymin = Math.min(ymin, r.y); ymax = Math.max(ymax, r.y); } });
  if (o.faixaY) { ymin = Math.min(ymin, o.faixaY.y0); ymax = Math.max(ymax, o.faixaY.y1); }
  (o.bandas || []).forEach(function(b) { (b.pontos || []).forEach(function(p) { if (isFinite(p[1])) ymin = Math.min(ymin, p[1]); if (isFinite(p[2])) ymax = Math.max(ymax, p[2]); }); });
  if (isFinite(o.yMin)) ymin = o.yMin;
  if (isFinite(o.yMax)) ymax = o.yMax;
  if (isFinite(o.xMin)) xmin = o.xMin;
  if (isFinite(o.xMax)) xmax = o.xMax;
  if (xmax === xmin) xmax = xmin + 1;
  if (ymax === ymin) { ymax += 1; ymin -= 1; }
  var folga = (ymax - ymin) * 0.05;
  var passoY = SGO_DocA4_passo_(ymax - ymin + 2 * folga, 6);
  var y0 = Math.floor((ymin - folga) / passoY) * passoY, y1 = Math.ceil((ymax + folga) / passoY) * passoY;
  if (isFinite(o.yMin)) y0 = Math.max(y0, Math.floor(o.yMin / passoY) * passoY);
  if (isFinite(o.yMax)) y1 = Math.min(y1, Math.ceil(o.yMax / passoY) * passoY);
  var casasY = o.casasY !== undefined ? o.casasY : (passoY < 1 ? (passoY < 0.1 ? 2 : 1) : 0);

  var porLinha = o.legendaPorLinha || (series.length > 12 ? 8 : (series.length > 6 ? 6 : Math.max(series.length, 1)));
  var linhasLeg = Math.ceil(series.length / porLinha);
  var temFases = !!(o.fases && o.fases.length);
  var mL = 56, mR = 18, mT = temFases ? 30 : 12;
  var mB = 40 + linhasLeg * 15;
  var Htot = H + linhasLeg * 15;
  var pw = W - mL - mR, ph = Htot - mT - mB;
  function X(x) { return mL + (x - xmin) / (xmax - xmin) * pw; }
  function Y(y) { return mT + (1 - (y - y0) / (y1 - y0)) * ph; }
  var f1 = AutoRel_pdF1_, esc = AutoRel_pdE_;
  var sv = [];
  sv.push('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + ' ' + Htot + '" width="' + W + '" height="' + Htot + '" font-family="Arial, Helvetica, sans-serif" font-size="10">');
  sv.push('<rect x="0" y="0" width="' + W + '" height="' + Htot + '" fill="#ffffff"/>');
  // fases: faixa colorida acima do gráfico e fundo muito leve dentro dele
  if (temFases) {
    var semRotulo = [];
    o.fases.forEach(function(fx) {
      var a = Math.max(mL, X(fx.x0)), b = Math.min(mL + pw, X(fx.x1));
      if (!(b > a)) return;
      sv.push('<rect x="' + f1(a) + '" y="' + mT + '" width="' + f1(b - a) + '" height="' + f1(ph) + '" fill="' + fx.cor + '" fill-opacity="0.32"/>');
      sv.push('<rect x="' + f1(a) + '" y="' + (mT - 16) + '" width="' + f1(b - a) + '" height="13" fill="' + fx.cor + '" stroke="#ffffff" stroke-width="0.8"/>');
      var rot = String(fx.rotulo || '');
      if (rot && (b - a) >= rot.length * 5.3 + 6) sv.push('<text x="' + f1((a + b) / 2) + '" y="' + (mT - 6.3) + '" text-anchor="middle" fill="#243b53" font-size="8.6">' + esc(rot) + '</text>');
      else if (fx.curto && (b - a) >= fx.curto.length * 5.3 + 4) sv.push('<text x="' + f1((a + b) / 2) + '" y="' + (mT - 6.3) + '" text-anchor="middle" fill="#243b53" font-size="8.6">' + esc(fx.curto) + '</text>');
      else if (rot) semRotulo.push(rot);
    });
  }
  if (o.destaqueX && isFinite(o.destaqueX.x0) && isFinite(o.destaqueX.x1)) {
    var da = Math.max(mL, X(o.destaqueX.x0)), db = Math.min(mL + pw, X(o.destaqueX.x1));
    if (db > da) sv.push('<rect x="' + f1(da) + '" y="' + mT + '" width="' + f1(db - da) + '" height="' + f1(ph) + '" fill="' + (o.destaqueX.cor || '#eef3fb') + '"/>');
  }
  if (o.faixaY && isFinite(o.faixaY.y0) && isFinite(o.faixaY.y1)) {
    var fy1 = Math.max(mT, Y(o.faixaY.y1)), fy0 = Math.min(mT + ph, Y(o.faixaY.y0));
    if (fy0 > fy1) sv.push('<rect x="' + mL + '" y="' + f1(fy1) + '" width="' + f1(pw) + '" height="' + f1(fy0 - fy1) + '" fill="' + (o.faixaY.cor || '#e3f2e8') + '"/>');
  }
  // grade Y
  for (var v = y0; v <= y1 + passoY / 2; v += passoY) {
    var yy = Y(v);
    sv.push('<line x1="' + mL + '" y1="' + f1(yy) + '" x2="' + (mL + pw) + '" y2="' + f1(yy) + '" stroke="#dfe4ea" stroke-width="0.7"/>');
    sv.push('<text x="' + (mL - 6) + '" y="' + f1(yy + 3.4) + '" text-anchor="end" fill="#3e4c59">' + esc(SGO_DocA4_num_(v, casasY)) + '</text>');
  }
  // grade X
  var ticks = [];
  if (o.eixoNumerico) {
    var pxn = SGO_DocA4_passo_(xmax - xmin, 10);
    for (var xv = Math.ceil(xmin / pxn) * pxn; xv <= xmax + 1e-9; xv += pxn) ticks.push([xv, o.formatarX ? o.formatarX(xv) : SGO_DocA4_num_(xv, pxn < 1 ? 1 : 0)]);
  } else if (isFinite(o.t0Ms)) {
    var passoMin = AutoRel_pdPassoTempo_(xmax - xmin, o.ticksX || 11);
    var passoMs = passoMin * 60000;
    var primeiroMs = Math.ceil((o.t0Ms + xmin * 60000) / passoMs) * passoMs;
    for (var tm = primeiroMs; tm <= o.t0Ms + xmax * 60000 + 1; tm += passoMs) ticks.push([(tm - o.t0Ms) / 60000, AutoRel_pdFmtHora_(tm, o.tz, passoMin < 1)]);
  }
  ticks.forEach(function(tk) {
    var xx = X(tk[0]);
    sv.push('<line x1="' + f1(xx) + '" y1="' + mT + '" x2="' + f1(xx) + '" y2="' + f1(mT + ph) + '" stroke="#e9edf1" stroke-width="0.7"/>');
    sv.push('<line x1="' + f1(xx) + '" y1="' + f1(mT + ph) + '" x2="' + f1(xx) + '" y2="' + f1(mT + ph + 4) + '" stroke="#9aa5b1" stroke-width="0.8"/>');
    sv.push('<text x="' + f1(xx) + '" y="' + f1(mT + ph + 15) + '" text-anchor="middle" fill="#3e4c59">' + esc(tk[1]) + '</text>');
  });
  sv.push('<rect x="' + mL + '" y="' + mT + '" width="' + pw + '" height="' + f1(ph) + '" fill="none" stroke="#9aa5b1" stroke-width="0.8"/>');
  var idClip = 'pdc' + Math.floor(Math.random() * 1e9);
  sv.push('<defs><clipPath id="' + idClip + '"><rect x="' + mL + '" y="' + mT + '" width="' + pw + '" height="' + f1(ph) + '"/></clipPath></defs><g clip-path="url(#' + idClip + ')">');
  (o.bandas || []).forEach(function(b) {
    var pts = (b.pontos || []).filter(function(p) { return isFinite(p[0]) && isFinite(p[1]) && isFinite(p[2]); });
    if (pts.length < 2) return;
    var d = pts.map(function(p, i) { return (i ? 'L' : 'M') + f1(X(p[0])) + ' ' + f1(Y(p[2])); }).join('') +
      pts.slice().reverse().map(function(p) { return 'L' + f1(X(p[0])) + ' ' + f1(Y(p[1])); }).join('') + 'Z';
    sv.push('<path d="' + d + '" fill="' + (b.cor || '#dbe7f5') + '" fill-opacity="0.6" stroke="none"/>');
  });
  series.forEach(function(se) {
    var d = se.pontos.map(function(p, i) { return (i ? 'L' : 'M') + f1(X(p[0])) + ' ' + f1(Y(p[1])); }).join('');
    sv.push('<path d="' + d + '" fill="none" stroke="' + se.cor + '" stroke-width="' + se.largura + '" stroke-linejoin="round"' + (se.tracejado ? ' stroke-dasharray="5 3"' : '') + '/>');
  });
  sv.push('</g>');
  // linhas de referência: rótulo à direita, acima da linha; se colidir com o anterior, abaixo
  var usados = [];
  (o.referencias || []).slice().sort(function(p, q) { return q.y - p.y; }).forEach(function(r) {
    if (!isFinite(r.y)) return;
    var yr = Y(r.y);
    if (yr < mT - 0.5 || yr > mT + ph + 0.5) return;
    sv.push('<line x1="' + mL + '" y1="' + f1(yr) + '" x2="' + (mL + pw) + '" y2="' + f1(yr) + '" stroke="' + (r.cor || '#a61b1b') + '" stroke-width="1.1"' + (r.tracejado === false ? '' : ' stroke-dasharray="6 3"') + '/>');
    if (!r.rotulo) return;
    var ty = yr - 4;
    if (usados.some(function(u) { return Math.abs(u - ty) < 11; }) || ty < mT + 9) ty = yr + 11;
    usados.push(ty);
    var larg = r.rotulo.length * 5.2 + 8;
    sv.push('<rect x="' + f1(mL + pw - 4 - larg) + '" y="' + f1(ty - 8.5) + '" width="' + f1(larg) + '" height="11" fill="#ffffff" fill-opacity="0.85"/>');
    sv.push('<text x="' + (mL + pw - 6) + '" y="' + f1(ty) + '" text-anchor="end" fill="' + (r.cor || '#a61b1b') + '" font-size="9">' + esc(r.rotulo) + '</text>');
  });
  if (o.rotuloY) sv.push('<text transform="translate(13 ' + f1(mT + ph / 2) + ') rotate(-90)" text-anchor="middle" fill="#1f2933">' + esc(o.rotuloY) + '</text>');
  if (o.rotuloX) sv.push('<text x="' + f1(mL + pw / 2) + '" y="' + f1(mT + ph + 30) + '" text-anchor="middle" fill="#1f2933">' + esc(o.rotuloX) + '</text>');
  var larguraItem = pw / porLinha;
  series.forEach(function(se, i) {
    var lin = Math.floor(i / porLinha), col = i % porLinha;
    var lx = mL + col * larguraItem, ly = mT + ph + 46 + lin * 15;
    sv.push('<line x1="' + f1(lx) + '" y1="' + (ly - 3.5) + '" x2="' + f1(lx + 18) + '" y2="' + (ly - 3.5) + '" stroke="' + se.cor + '" stroke-width="2.4"' + (se.tracejado ? ' stroke-dasharray="5 3"' : '') + '/>');
    sv.push('<text x="' + f1(lx + 23) + '" y="' + ly + '" fill="#1f2933">' + esc(se.nome) + '</text>');
  });
  sv.push('</svg>');
  return { svg: sv.join(''), cortado: cortado };
}

/**
 * Mapa dos sensores na fase de exposição: uma linha por sensor, do mais frio ao mais quente
 * (pela média), com a faixa mínima–máxima, a média, a faixa de esterilização e o F0.
 */
function AutoRel_pdGraficoMapa_(itens, tMin, tMax, f0Min, largura) {
  var lista = (itens || []).filter(function(i) { return isFinite(i.min) && isFinite(i.max) && isFinite(i.media); })
    .slice().sort(function(a, b) { return a.media - b.media || a.min - b.min; });
  if (!lista.length) return '';
  var W = largura || 1000, linha = 19, mT = 30, mB = 34, mL = 118, mR = 190;
  var H = mT + mB + lista.length * linha;
  var vmin = Math.min.apply(null, lista.map(function(i) { return i.min; }).concat([tMin])), vmax = Math.max.apply(null, lista.map(function(i) { return i.max; }));
  if (isFinite(tMax) && tMax < vmax + 1.5) vmax = Math.max(vmax, tMax);
  var passo = SGO_DocA4_passo_(vmax - vmin + 0.4, 8);
  var x0 = Math.floor((vmin - passo * 0.3) / passo) * passo, x1 = Math.ceil((vmax + passo * 0.3) / passo) * passo;
  var pw = W - mL - mR;
  function X(v) { return mL + (v - x0) / (x1 - x0) * pw; }
  var f1 = AutoRel_pdF1_, esc = AutoRel_pdE_;
  var casas = passo < 0.1 ? 2 : (passo < 1 ? 1 : 0);
  var s = [];
  s.push('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '" font-family="Arial, Helvetica, sans-serif" font-size="10">');
  s.push('<rect x="0" y="0" width="' + W + '" height="' + H + '" fill="#ffffff"/>');
  if (isFinite(tMin) && isFinite(tMax)) {
    var a = Math.max(mL, X(tMin)), b = Math.min(mL + pw, X(tMax));
    if (b > a) s.push('<rect x="' + f1(a) + '" y="' + (mT - 6) + '" width="' + f1(b - a) + '" height="' + (lista.length * linha + 6) + '" fill="#e3f2e8"/>');
    s.push('<text x="' + f1(Math.max(mL + 2, X(tMin) + 3)) + '" y="' + (mT - 11) + '" fill="#1d6b3f" font-size="9">Faixa de esterilização ' + esc(SGO_DocA4_val_(tMin, 1, '°C') + ' a ' + SGO_DocA4_val_(tMax, 1, '°C')) + '</text>');
  }
  for (var v = x0; v <= x1 + passo / 2; v += passo) {
    var xx = X(v);
    s.push('<line x1="' + f1(xx) + '" y1="' + (mT - 6) + '" x2="' + f1(xx) + '" y2="' + (mT + lista.length * linha) + '" stroke="#e1e6ec" stroke-width="0.7"/>');
    s.push('<text x="' + f1(xx) + '" y="' + (mT + lista.length * linha + 14) + '" text-anchor="middle" fill="#3e4c59">' + esc(SGO_DocA4_num_(v, casas)) + '</text>');
  }
  s.push('<text x="' + f1(mL + pw / 2) + '" y="' + (H - 4) + '" text-anchor="middle" fill="#1f2933">Temperatura na fase de exposição (°C)</text>');
  s.push('<text x="' + (W - 8) + '" y="' + (mT - 11) + '" text-anchor="end" fill="#3e4c59" font-size="9">F0 do sensor</text>');
  lista.forEach(function(it, k) {
    var y = mT + k * linha + linha / 2;
    var cor = it.conforme === false ? '#a61b1b' : (k === 0 ? '#1f5fa8' : (k === lista.length - 1 ? '#c2410c' : '#52606d'));
    var marca = lista.length > 1 ? (k === 0 ? ' — mais frio' : (k === lista.length - 1 ? ' — mais quente' : '')) : '';
    s.push('<text x="' + (mL - 8) + '" y="' + f1(y + 3.5) + '" text-anchor="end" fill="#1f2933"' + (marca ? ' font-weight="700"' : '') + '>' + esc(it.sensor + marca) + '</text>');
    s.push('<line x1="' + f1(X(it.min)) + '" y1="' + f1(y) + '" x2="' + f1(X(it.max)) + '" y2="' + f1(y) + '" stroke="' + cor + '" stroke-width="5" stroke-linecap="round" stroke-opacity="0.55"/>');
    s.push('<circle cx="' + f1(X(it.media)) + '" cy="' + f1(y) + '" r="3.6" fill="' + cor + '" stroke="#ffffff" stroke-width="1"/>');
    s.push('<text x="' + f1(mL + pw + 10) + '" y="' + f1(y + 3.5) + '" fill="#3e4c59" font-size="9">' + esc(SGO_DocA4_num_(it.min, 2) + ' / ' + SGO_DocA4_num_(it.media, 2) + ' / ' + SGO_DocA4_num_(it.max, 2)) + '</text>');
    s.push('<text x="' + (W - 8) + '" y="' + f1(y + 3.5) + '" text-anchor="end" fill="' + (it.conforme === false ? '#a61b1b' : '#1f2933') + '" font-weight="700">' + esc(isFinite(it.f0) ? SGO_DocA4_val_(it.f0, 2, 'min') : '—') + '</text>');
  });
  s.push('<text x="' + f1(mL + pw + 10) + '" y="' + (mT - 11) + '" fill="#3e4c59" font-size="9">mín. / média / máx.</text>');
  s.push('</svg>');
  return s.join('');
}

/** Monta as figuras do ciclo térmico. Devolve [{svg, legenda, largura:'cheia'|'meia'}]. */
function AutoRel_pdFigurasCiclo_(D) {
  var figs = [];
  var L = D.linhas, tz = D.tz, t0 = D.t0;
  if (!L.length || t0 === null) return figs;
  function x(l) { return (l.ms - t0) / 60000; }
  var nome = function(k) { return 'S' + (k + 1); };
  var fases = D.fases.filter(function(fz) { return ['ANTES', 'DEPOIS', 'ENTRE', 'INTERVALO'].indexOf(fz.tipo) < 0; }).map(function(fz) {
    var a = L[fz.ini], b = L[fz.fim < L.length - 1 ? fz.fim + 1 : fz.fim];
    return { x0: x(a), x1: x(b), cor: AUTOREL_PD_COR_FASE[fz.tipo] || '#eef1f4', rotulo: fz.tipo === 'PRE_VACUO' ? 'Pulso ' + (fz.nome.replace(/\D+/g, '') || '') : fz.nome.replace(/ \(.*\)$/, ''), curto: fz.tipo === 'PRE_VACUO' ? (fz.nome.replace(/\D+/g, '') || '') : '' };
  });
  var series = D.idxAtivos.map(function(k) {
    return { nome: nome(k), cor: SGO_DocA4_corSerie_(k), pontos: L.filter(function(l) { return l.ms !== null && l.t[k] !== null; }).map(function(l) { return [x(l), l.t[k]]; }) };
  });
  var refs = [];
  if (isFinite(D.tMin) && D.tMin > 0) refs.push({ y: D.tMin, rotulo: 'Mínima de esterilização ' + SGO_DocA4_val_(D.tMin, 1, '°C') });
  var g1 = AutoRel_pdGraficoLinhas_({ largura: 1000, altura: 400, series: series, t0Ms: t0, tz: tz, fases: fases, referencias: refs, rotuloX: 'Horário', rotuloY: 'Temperatura (°C)' });
  if (g1.svg) {
    var nomesFases = [];
    D.fases.forEach(function(fz) { if (['ANTES', 'DEPOIS', 'ENTRE', 'INTERVALO', 'PRE_VACUO'].indexOf(fz.tipo) < 0 && nomesFases.indexOf(fz.nome.replace(/ \(.*\)$/, '')) < 0) nomesFases.push(fz.nome.replace(/ \(.*\)$/, '')); });
    var nPulsos = D.fases.filter(function(fz) { return fz.tipo === 'PRE_VACUO'; }).length;
    figs.push({ largura: 'cheia', svg: g1.svg, legenda: 'Perfil térmico do ciclo: temperatura de cada sensor ativo ao longo do registro, com as fases identificadas pelo sistema na faixa colorida acima do gráfico' +
      (nPulsos ? ' (' + nPulsos + (nPulsos === 1 ? ' pulso de vácuo' : ' pulsos de vácuo') + ' de remoção de ar, ' : ' (') + nomesFases.join(', ').toLowerCase() + ').' + SGO_DocA4_notaCorte_(g1, '°C') });
  }

  if (D.temExp) {
    var i0 = Math.max(0, D.ini - 4), i1 = Math.min(L.length - 1, D.fim + 4);
    var fat = L.slice(i0, i1 + 1).filter(function(l) { return l.ms !== null; });
    var sp = D.idxAtivos.map(function(k) { return { nome: nome(k), cor: SGO_DocA4_corSerie_(k), pontos: fat.filter(function(l) { return l.t[k] !== null; }).map(function(l) { return [x(l), l.t[k]]; }) }; });
    var refsP = [{ y: D.tMin, rotulo: 'Mínima ' + SGO_DocA4_val_(D.tMin, 1, '°C'), cor: '#1d6b3f' }];
    if (isFinite(D.tMax)) refsP.push({ y: D.tMax, rotulo: 'Máxima ' + SGO_DocA4_val_(D.tMax, 1, '°C'), cor: '#1d6b3f' });
    var vmin = Infinity, vmax = -Infinity;
    sp.forEach(function(s) { s.pontos.forEach(function(p) { if (p[1] < vmin) vmin = p[1]; if (p[1] > vmax) vmax = p[1]; }); });
    var g2 = AutoRel_pdGraficoLinhas_({ largura: 520, altura: 530, series: sp, t0Ms: t0, tz: tz, ticksX: 6, faixaY: { y0: D.tMin, y1: D.tMax, cor: '#e3f2e8' },
      destaqueX: D.patamar ? { x0: x(L[D.patamar.inicioIdx]), x1: x(L[D.patamar.fimIdx]), cor: '#f4f8fd' } : null,
      yMin: Math.max(vmin, D.tMin - 2) - 0.3, yMax: Math.min(Math.max(vmax, D.tMax), D.tMax + 1) + 0.2, referencias: refsP, rotuloX: 'Horário', rotuloY: 'Temperatura (°C)', legendaPorLinha: Math.min(6, sp.length) });
    if (g2.svg) figs.push({ largura: 'meia', svg: g2.svg, legenda: 'Detalhe da fase de exposição com a faixa de esterilização (verde, de ' + SGO_DocA4_val_(D.tMin, 1, '°C') + ' a ' + SGO_DocA4_val_(D.tMax, 1, '°C') + ')' + (D.patamar ? '; o fundo azul-claro marca o patamar avaliado nos critérios (' + D.patamar.inicio.replace(/^.* /, '') + ' a ' + D.patamar.fim.replace(/^.* /, '') + ').' : '.') });

    if (D.fatos.exigeF0) {
      var tExp0 = L[D.ini].ms;
      var sf = [];
      D.idxAtivos.forEach(function(k) {
        var mem = D.memoriaF0[k];
        if (mem && mem.length) sf.push({ nome: nome(k), cor: SGO_DocA4_corSerie_(k), pontos: mem.map(function(m) { return [(m.ms - tExp0) / 60000, m.acumulado]; }) });
      });
      var g3 = AutoRel_pdGraficoLinhas_({ largura: 520, altura: 530, series: sf, eixoNumerico: true, formatarX: function(v) { return SGO_DocA4_num_(v, v % 1 ? 1 : 0); },
        yMin: 0, casasY: 0, referencias: [{ y: D.f0Min, rotulo: 'F0 mínimo ' + SGO_DocA4_val_(D.f0Min, 2, 'min') }], rotuloX: 'Tempo desde o início da exposição (min)', rotuloY: 'F0 acumulado (min)', legendaPorLinha: Math.min(6, sf.length) });
      if (g3.svg) figs.push({ largura: 'meia', svg: g3.svg, legenda: 'F0 acumulado por sensor ao longo da exposição (regra dos trapézios com o intervalo real entre as leituras), com o mínimo exigido (linha tracejada).' });
    }
  }

  if (D.comPressao) {
    var ptsP = L.filter(function(l) { return l.ms !== null && l.p !== null; }).map(function(l) { return [x(l), l.p]; });
    if (ptsP.length >= 10) {
      var g4 = AutoRel_pdGraficoLinhas_({ largura: 520, altura: 530, series: [{ nome: 'Pressão da câmara', cor: '#0f6f8d', pontos: ptsP, largura: 1.5 }], t0Ms: t0, tz: tz, ticksX: 6, fases: fases,
        casasY: 1, yMin: D.unidadePressao === 'BAR_REL' ? undefined : 0, rotuloX: 'Horário', rotuloY: 'Pressão (' + D.rotuloUnidade + ')', legendaPorLinha: 1 });
      if (g4.svg) figs.push({ largura: 'meia', svg: g4.svg, legenda: 'Pressão da câmara ao longo do ciclo (' + D.rotuloUnidade + '), com as mesmas fases do perfil térmico.' });
    }
    if (D.temExp && D.temTsat) {
      var tsat = [], med = [], banda = [];
      var vs = Number(((AutoRel_UCFG.CICLOS || {})[String(D.analise.tipoCiclo)] || {}).criterios ? AutoRel_UCFG.CICLOS[String(D.analise.tipoCiclo)].criterios.desvioMaxVaporSaturadoK : NaN);
      var pf = D.patamar ? D.patamar.fimIdx : D.fim;
      for (var i = D.ini; i <= pf; i++) {
        var l = L[i];
        if (l.ms === null) continue;
        var tCam = null;
        if (D.refIdx >= 0) tCam = l.t[D.refIdx];
        else { var vv = D.idxAtivos.map(function(k) { return l.t[k]; }).filter(function(q) { return q !== null && isFinite(q); }); if (vv.length) tCam = vv.reduce(function(p, q) { return p + q; }, 0) / vv.length; }
        if (tCam !== null) med.push([x(l), tCam]);
        if (l.tsat !== null) { tsat.push([x(l), l.tsat]); if (isFinite(vs)) banda.push([x(l), l.tsat - vs, l.tsat + vs]); }
      }
      if (tsat.length >= 2 && med.length >= 2) {
        var base = D.refIdx >= 0 ? 'Sensor de referência S' + (D.refIdx + 1) : 'Média dos sensores ativos';
        var g5 = AutoRel_pdGraficoLinhas_({ largura: 520, altura: 530, t0Ms: t0, tz: tz, ticksX: 6, series: [{ nome: base, cor: '#d1495b', pontos: med, largura: 1.6 }, { nome: 'Vapor saturado (pela pressão)', cor: '#1f5fa8', pontos: tsat, largura: 1.6, tracejado: true }],
          bandas: banda.length ? [{ pontos: banda, cor: '#dbe7f5' }] : [], casasY: 1, rotuloX: 'Horário', rotuloY: 'Temperatura (°C)', legendaPorLinha: 2 });
        if (g5.svg) figs.push({ largura: 'meia', svg: g5.svg, legenda: 'Patamar: temperatura medida (' + base.charAt(0).toLowerCase() + base.slice(1) + ') e temperatura do vapor saturado calculada pela pressão absoluta (IAPWS-IF97)' + (banda.length ? '; a faixa azul é a diferença aceita de ± ' + SGO_DocA4_val_(vs, 1, '°C') + '.' : '.') });
      }
    }
  }

  if (D.temExp) {
    var mapa = AutoRel_pdGraficoMapa_(D.porSensor, D.tMin, D.tMax, D.f0Min, 1000);
    if (mapa) figs.push({ largura: 'cheia', svg: mapa, legenda: 'Mapa dos sensores na fase de exposição, do mais frio ao mais quente pela temperatura média: barra da mínima à máxima, ponto na média e F0 de cada sensor à direita.' });
  }
  return figs;
}

function AutoRel_pdFigurasLeak_(D) {
  var figs = [];
  var L = D.linhas, a = D.analise, t0 = D.t0;
  if (!L.length || t0 === null) return figs;
  function x(l) { return (l.ms - t0) / 60000; }
  var pts = L.filter(function(l) { return l.ms !== null && l.pMbar !== null; }).map(function(l) { return [x(l), l.pMbar]; });
  var li = L[a.indiceInicio], lf = L[a.indiceFim];
  var g1 = AutoRel_pdGraficoLinhas_({ largura: 1000, altura: 330, series: [{ nome: 'Pressão da câmara', cor: '#0f6f8d', pontos: pts, largura: 1.5 }], t0Ms: t0, tz: D.tz,
    fases: li && lf ? [{ x0: x(li), x1: x(lf), cor: '#d4ecdc', rotulo: 'Janela do teste' }] : [], casasY: 0, rotuloX: 'Horário', rotuloY: 'Pressão (mbar)', legendaPorLinha: 1 });
  if (g1.svg) figs.push({ largura: 'cheia', svg: g1.svg, legenda: 'Pressão absoluta da câmara em todo o registro (mbar), com a janela do teste de estanqueidade.' });
  if (li && lf) {
    var dentro = L.filter(function(l) { return l.dentro && l.ms !== null && l.pMbar !== null; });
    var reta = [[x(li), a.pressaoInicioMbar], [x(lf), a.pressaoFimMbar]];
    var g2 = AutoRel_pdGraficoLinhas_({ largura: 1000, altura: 300, t0Ms: t0, tz: D.tz, series: [{ nome: 'Pressão registrada', cor: '#0f6f8d', pontos: dentro.map(function(l) { return [x(l), l.pMbar]; }), largura: 1.6 },
      { nome: 'Variação média (taxa de vazamento)', cor: '#d1495b', pontos: reta, largura: 1.3, tracejado: true }], casasY: 1, rotuloX: 'Horário', rotuloY: 'Pressão (mbar)', legendaPorLinha: 2 });
    if (g2.svg) figs.push({ largura: 'cheia', svg: g2.svg, legenda: 'Janela do teste: pressão registrada e a reta entre a primeira e a última leitura, cuja inclinação é a taxa de vazamento.' });
  }
  return figs;
}

function AutoRel_pdFiguraHtml_(fig, n) {
  return '<figure class="pd-fig"><div class="pd-svg">' + fig.svg + '</div><figcaption><b>Figura ' + n + '</b> — ' + AutoRel_pdE_(fig.legenda) + '</figcaption></figure>';
}

/** Distribui as figuras em folhas: uma cheia por folha, ou duas meias lado a lado. */
function AutoRel_pdFolhasFiguras_(figs, nFig) {
  var h = [], fila = [];
  function fecharMeias() {
    if (!fila.length) return;
    h.push('<div class="pd-duas">' + fila.map(function(f) { return '<div class="pd-meia">' + AutoRel_pdFiguraHtml_(f.fig, f.n) + '</div>'; }).join('') + (fila.length === 1 ? '<div class="pd-meia"></div>' : '') + '</div>');
    fila = [];
  }
  figs.forEach(function(f) {
    nFig.n++;
    if (f.largura === 'meia') { fila.push({ fig: f, n: nFig.n }); if (fila.length === 2) fecharMeias(); }
    else { fecharMeias(); h.push('<div class="pd-cheia">' + AutoRel_pdFiguraHtml_(f, nFig.n) + '</div>'); }
  });
  fecharMeias();
  return h.join('');
}

/* ============================================================
 * Tabelas de leituras paginadas (cabeçalho em todas as folhas)
 * ============================================================ */

var AUTOREL_PD_LINHAS_FOLHA = 36;          // linhas de dados por folha (paisagem, 7,3 pt)
var AUTOREL_PD_LINHAS_PRIMEIRA = 32;        // primeira folha da seção (título e texto acima)
var AUTOREL_PD_SENSORES_POR_BLOCO = 12;

/**
 * Divide as linhas em folhas e monta uma tabela por folha.
 * cols: [{t, cls, w}] ; celulas(l) → array de {t|html, cls}; titulo(k, total) → legenda.
 * paineis: tabelas lado a lado na mesma folha (anexo compacto).
 */
function AutoRel_pdTabelaPaginada_(linhas, cols, celulas, opcoes) {
  opcoes = opcoes || {};
  var porFolha = opcoes.porFolha || AUTOREL_PD_LINHAS_FOLHA;
  var primeira = Math.min(porFolha, opcoes.primeira || AUTOREL_PD_LINHAS_PRIMEIRA);
  var paineis = Math.max(1, opcoes.paineis || 1);
  // Quantas folhas são necessárias e, depois, linhas distribuídas por igual (a última folha não fica com 1 ou 2 linhas).
  var capPrimeira = primeira * paineis, capDemais = porFolha * paineis;
  var nFolhas = linhas.length <= capPrimeira ? 1 : 1 + Math.ceil((linhas.length - capPrimeira) / capDemais);
  var folhas = [];
  var i = 0;
  for (var k = 0; k < nFolhas; k++) {
    var restantes = linhas.length - i, folhasRest = nFolhas - k;
    var alvo = Math.ceil(restantes / folhasRest);
    if (paineis > 1) alvo = Math.ceil(alvo / paineis) * paineis;
    var tam = Math.min(k === 0 ? capPrimeira : capDemais, alvo);
    folhas.push(linhas.slice(i, i + tam));
    i += tam;
  }
  if (i < linhas.length) folhas.push(linhas.slice(i));
  var cab = '<thead><tr>' + cols.map(function(c) { return '<th' + (c.cls ? ' class="' + c.cls + '"' : '') + (c.w ? ' style="width:' + c.w + '"' : '') + '>' + c.t + '</th>'; }).join('') + '</tr></thead>';
  function tabela(rows) {
    return '<table class="t pd-dados' + (opcoes.classe ? ' ' + opcoes.classe : '') + '">' + cab + '<tbody>' + rows.map(function(l) {
      var cl = opcoes.classeLinha ? opcoes.classeLinha(l) : '';
      return '<tr' + (cl ? ' class="' + cl + '"' : '') + '>' + celulas(l).map(function(c) {
        var cls = c && c.cls ? ' class="' + c.cls + '"' : '';
        return '<td' + cls + '>' + (c && c.html !== undefined ? c.html : AutoRel_pdE_(c && c.t !== undefined ? c.t : (c == null ? '—' : c))) + '</td>';
      }).join('') + '</tr>';
    }).join('') + '</tbody></table>';
  }
  return folhas.map(function(rows, n) {
    var partes = [];
    if (paineis > 1) {
      var tam = Math.ceil(rows.length / paineis);
      for (var p = 0; p < paineis; p++) partes.push(rows.slice(p * tam, (p + 1) * tam));
    } else partes.push(rows);
    var corpo = paineis > 1
      ? '<div class="pd-paineis">' + partes.map(function(pt) { return '<div class="pd-painel">' + (pt.length ? tabela(pt) : '') + '</div>'; }).join('') + '</div>'
      : tabela(rows);
    var leg = opcoes.titulo ? opcoes.titulo(n + 1, folhas.length, rows) : '';
    return '<div class="pd-folha' + (n > 0 ? ' pd-nova' : '') + '">' + (leg ? '<p class="leg-tabela">' + leg + '</p>' : '') + corpo + '</div>';
  }).join('');
}

/** Células de temperatura de um bloco de sensores, com destaque do mais frio/quente da linha e de leitura fora da faixa. */
function AutoRel_pdCelulasTemp_(l, sensoresBloco, D, todosAtivos) {
  var vals = todosAtivos.map(function(k) { return l.t[k]; }).filter(function(v) { return v !== null && isFinite(v); });
  var mn = vals.length ? Math.min.apply(null, vals) : null, mx = vals.length ? Math.max.apply(null, vals) : null;
  // Faixa de esterilização conferida só no patamar (o mesmo trecho do critério de faixa do motor).
  var dentroExp = D.patamar ? (l.i >= D.patamar.inicioIdx && l.i <= D.patamar.fimIdx) : (D.temExp && l.i >= D.ini && l.i <= D.fim);
  return sensoresBloco.map(function(k) {
    var v = l.t[k];
    if (v === null || !isFinite(v)) return { t: '—', cls: 'num' };
    var cls = 'num';
    if (vals.length > 1 && v === mn) cls += ' frio';
    else if (vals.length > 1 && v === mx) cls += ' quente';
    if (dentroExp && isFinite(D.tMin) && (AutoRel_pdR2_(v) < D.tMin || (isFinite(D.tMax) && AutoRel_pdR2_(v) > D.tMax))) cls += ' fora';
    return { t: AutoRel_pdN_(v, 2), cls: cls };
  });
}

/* ============================================================
 * Documento
 * ============================================================ */

function AutoRel_pdEstilos_() {
  return '' +
    '.capa .pd-capa-corpo{display:flex;gap:9mm;margin-top:7mm;align-items:flex-start}' +
    '.capa .pd-capa-esq{flex:1.45 1 0;border-left:3pt solid #0b3d6e;padding:1mm 0 1mm 6mm}' +
    '.capa .pd-capa-dir{flex:1 1 0}' +
    '.capa .pd-capa-esq h1{font-size:21pt;line-height:1.12;margin:0 0 2mm}' +
    '.capa .pd-capa-esq .sub{font-size:10pt;margin:0 0 4mm}' +
    '.capa table.t{max-width:none}' +
    '.capa table.ident th{width:21%}.capa table.ident td{width:29%}' +
    '.capa .pd-capa-dir .resultado{margin-top:0}' +
    '.capa .pd-capa-dir h4{margin:3mm 0 1mm;font-size:9pt;color:#243b53}' +
    '.capa .pd-capa-dir table.t{font-size:8pt}' +
    'nav.sumario{break-after:page;page-break-after:always}' +
    'nav.sumario ol{columns:2;column-gap:14mm}' +
    'nav.sumario li{break-inside:avoid}' +
    '.pd-secao{break-before:page;page-break-before:always}' +
    '.pd-duas{display:flex;gap:7mm;align-items:flex-start;break-inside:avoid;page-break-inside:avoid;margin:0 0 3mm}' +
    '.pd-meia{flex:1 1 0;min-width:0}' +
    '.pd-cheia{break-inside:avoid;page-break-inside:avoid;margin:0 0 3mm}' +
    '.pd-fig{margin:1mm 0 2mm}' +
    '.pd-svg svg{display:block;width:100%;height:auto}' +
    '.pd-cheia .pd-svg svg{max-height:128mm}' +
    '.pd-folha-fig{break-before:page;page-break-before:always}' +
    'table.t.pd-dados{table-layout:fixed;font-size:7.3pt;line-height:1;margin:0.8mm 0 0}' +
    'table.t.pd-dados th,table.t.pd-dados td{padding:0 1mm;height:4.15mm;white-space:nowrap;overflow:hidden;vertical-align:middle}' +
    'table.t.pd-dados thead th{height:auto;padding:.7mm 1mm;line-height:1.15;white-space:normal;text-align:center;vertical-align:bottom;font-size:7.2pt}' +
    'table.t.pd-dados td.num{text-align:right}' +
    'table.t.pd-dados td.cen{text-align:center}' +
    'table.t.pd-dados td.frio{background:#e7effb}' +
    'table.t.pd-dados td.quente{background:#fdeee7}' +
    'table.t.pd-dados td.fora{color:#a61b1b;font-weight:700}' +
    'table.t.pd-dados tr.pos-pat td{color:#7b8794;font-style:italic}' +
    'table.t.pd-compacta{font-size:6.8pt}table.t.pd-compacta th,table.t.pd-compacta td{height:3.75mm}' +
    '.pd-folha{break-inside:avoid;page-break-inside:avoid}' +
    '.pd-nova{break-before:page;page-break-before:always}' +
    '.pd-paineis{display:flex;gap:5mm;align-items:flex-start}.pd-painel{flex:1 1 0;min-width:0}' +
    '.pd-legenda-cores{font-size:7.8pt;color:#3e4c59;margin:0 0 1.5mm;text-align:left}' +
    '.pd-legenda-cores span{display:inline-block;padding:0 1.6mm;margin:0 1.2mm 0 0;border:.4pt solid #bcc5cf}' +
    '.pd-passo{border:.6pt solid #bcc5cf;background:#f8fafc;padding:2.2mm 3.4mm;margin:1.5mm 0 3mm;break-inside:avoid;page-break-inside:avoid}' +
    '.pd-passo p{margin:0 0 1.2mm;text-align:left}' +
    '.pd-passo .eq{font-family:"Times New Roman",Times,serif;font-size:10.5pt}' +
    '.pd-colunas{display:flex;gap:8mm;align-items:flex-start}.pd-colunas>div{flex:1 1 0;min-width:0}' +
    'table.t td.sit{white-space:nowrap}' +
    'table.t.pd-fases td:first-child,table.t.pd-sens td:first-child{white-space:nowrap}' +
    'table.t.pd-resumo td,table.t.pd-resumo th{font-size:8.4pt}' +
    '.pd-secao>h2:first-child,.pd-folha-fig>h2:first-child{margin-top:0}';
}

/** Topo e rodapé corridos próprios: título e identificação do ensaio no topo; número, revisão e página no rodapé. */
function AutoRel_pdEstilosPagina_(doc, linhaTopo2) {
  var t = SGO_DocA4_txtCss_;
  var empresa = doc.empresa || {};
  var rodapeEsq = (empresa.nome || 'Metrolab Soluções em Engenharia Clínica LTDA') + (empresa.cnpj ? ' · CNPJ ' + empresa.cnpj : '');
  var linha = 'border-top:.6pt solid #9aa5b1;vertical-align:top;padding-top:2.2mm;font:7.3pt Arial,Helvetica,sans-serif;color:#616e7c;';
  return '@page{' +
    '@top-right{content:' + t(doc.tituloCurto) + ' "\\A " ' + t(linhaTopo2) + '}' +
    '@bottom-left{content:' + t(rodapeEsq) + ';' + linha + '}' +
    '@bottom-center{content:' + t(doc.rotuloNumero + ' ' + doc.numero + ' · Revisão ' + SGO_DocA4_revisao_(doc.revisao)) + ';' + linha + 'text-align:center}' +
    '@bottom-right{content:"Página " counter(page) " de " counter(pages);' + linha + '}' +
    '}';
}

function AutoRel_pdCapa_(doc, ctx, D, aprovacao, minuta, aviso) {
  var id = ctx.identificacao;
  var esc = AutoRel_pdE_;
  var leak = D.leak;
  var ensaio = leak ? 'Teste de estanqueidade da câmara' : (AutoRel_acTextoTipoEnsaio_(id.tipoEnsaio) + ' — ' + String(ctx.equipamentoLabel || '').replace(/^Ciclo de Esterilização/, 'ciclo de esterilização'));
  var ficha = [
    ['Cliente', id.cliente], ['CNPJ', id.cnpj || '—'],
    ['Unidade / setor', id.setor || '—'], ['Equipamento', id.equipamentoTipo + (id.tag ? ' — TAG ' + id.tag : '')],
    ['Fabricante (marca)', id.marca || '—'], ['Modelo', id.modelo || '—'], ['Nº de série', id.numeroSerie || '—'],
    ['Ensaio', ensaio, { largo: true }],
    ['Ciclo nº', id.cicloNumero || '—'], ['Programa', id.programa || '—'],
    ['Data do ensaio', id.dataDoEnsaio || '—'], ['Lote', id.lote || '—'],
    ['Técnico executor', id.tecnicoExecutor || '—'],
    ['Responsável técnico', aprovacao ? aprovacao.nome : (minuta ? 'Aguardando aprovação' : '—')],
    ['Documento', doc.rotuloNumero + ' ' + doc.numero + ' · Revisão ' + SGO_DocA4_revisao_(doc.revisao), { largo: true }]
  ];
  var regs = (ctx.registradores && ctx.registradores.itens) || [];
  var tabReg = regs.length ? SGO_DocA4_tabelaPadroes_(regs, { unidade: '°C' })
    : '<p class="nota">Registrador não informado.</p>';
  var h = '<section class="capa"><div class="logo"><img src="' + SGO_DocA4_logoDataUri_() + '" alt="Metrolabs"></div>' +
    (aviso ? '<div class="aviso-simulado" style="margin:5mm 0 0">' + esc(aviso) + '</div>' : '') +
    '<div class="pd-capa-corpo"><div class="pd-capa-esq">' +
    '<p class="tipo">Qualificação térmica — dados do ensaio</p>' +
    '<h1>' + esc(doc.titulo) + '</h1>' +
    '<p class="sub">' + esc(doc.subtitulo) + '</p>' +
    SGO_DocA4_tabelaIdent_(ficha, 'ficha') +
    '</div><div class="pd-capa-dir">' +
    SGO_DocA4_quadroResultado_({ status: ctx.statusConsolidado, rotulo: leak ? 'Resultado do teste' : 'Resultado do ensaio', texto: ctx.resumoResultado }) +
    '<h4>Registrador de dados e rastreabilidade</h4>' + tabReg +
    '<p class="nota">' + esc(leak ? 'Pressão e temperatura registradas pelo registrador acima; certificado conferido no cadastro de padrões da empresa executante.' :
      'U95: incerteza expandida do certificado de calibração do registrador (cadastro de padrões da empresa executante), usada na seção de incerteza.') + '</p>' +
    '</div></div>' +
    '<div class="pe"><p>' + esc(((doc.empresa || {}).nome || '') + ((doc.empresa || {}).cnpj ? ' · CNPJ ' + doc.empresa.cnpj : '')) + '</p>' +
    '<p>' + esc(doc.rotuloNumero + ' ' + doc.numero + ' · Revisão ' + SGO_DocA4_revisao_(doc.revisao)) + '</p></div></section>';
  return h;
}

/** Quadro-resumo: um critério por linha (valor medido × critério × fonte × situação). */
function AutoRel_pdQuadroResumo_(ctx) {
  return SGO_DocA4_tabela_([{ t: 'Critério' }, { t: 'Critério de aceitação' }, { t: 'Valor medido' }, { t: 'Fonte do critério' }, { t: 'Situação', cls: 'cen' }],
    (ctx.criterios || []).map(function(c) {
      var sit = c.naoAvaliado ? { html: '<span class="info-txt">Não avaliado</span>', cls: 'cen sit' } : Object.assign(SGO_DocA4_celSituacao_(c.conforme), { cls: 'cen sit' });
      return [c.criterio, c.requisito, c.obtido, c.referencia || '—', sit];
    }), { classe: 'pd-resumo' });
}

function AutoRel_pdSecaoNcObs_(ctx, nSec) {
  var e = ctx.estudos[0];
  var ncs = e.motivosReprovacao || [];
  var obs = [].concat(e.alertasAnalise || [], e.observacoesAnalise || [], (ctx.registradores && ctx.registradores.observacoes) || []);
  return '<h2>' + nSec + '. Não conformidades e observações</h2>' +
    '<h3>' + nSec + '.1 Não conformidades</h3>' + (ncs.length ? SGO_DocA4_lista_(ncs) : '<p>Nenhuma não conformidade foi registrada neste ensaio.</p>') +
    '<h3>' + nSec + '.2 Observações</h3>' + (obs.length ? SGO_DocA4_lista_(obs) : '<p>Sem observações adicionais.</p>');
}

function AutoRel_pdSecaoResponsabilidade_(ctx, nSec, aprovacao, minuta, assinaturas, referenciaDados) {
  var id = ctx.identificacao;
  var h = '<div class="manter"><h2>' + nSec + '. Responsabilidade técnica</h2>' +
    '<p>Este documento reúne os dados do registrador e os cálculos do ensaio identificado na capa e acompanha o relatório de ensaio do mesmo número. Os resultados foram calculados pelo sistema a partir das leituras do registrador, com os critérios configurados pela empresa executante; ' + AutoRel_pdE_(referenciaDados) + ' A reprodução parcial deste documento depende de autorização da empresa executante.</p>';
  if (aprovacao) {
    h += '<p><b>Revisado e aprovado para emissão por</b> ' + AutoRel_pdE_(aprovacao.nome || '—') + (aprovacao.perfil ? ' (' + AutoRel_pdE_(String(aprovacao.perfil).toLowerCase()) + ')' : '') + ', em ' + AutoRel_pdE_(aprovacao.em) +
      ', com registro no sistema. Revisão ' + AutoRel_pdE_(id.revisao || '0') + ' desta planilha' + (Number(id.revisao) > 0 ? '; as revisões anteriores continuam arquivadas e são substituídas por esta' : '') + '.</p>';
  } else if (minuta) {
    h += '<p><b>Aguardando a aprovação do responsável técnico.</b></p>';
  }
  return h + SGO_DocA4_assinaturas_(assinaturas) + '</div>';
}

function AutoRel_pdAnexoMesclagem_(ctx, letra) {
  var m = ctx.mesclagem;
  if (!m || !m.sensores || !m.sensores.length) return '';
  return '<section class="pd-secao"><h2>Anexo ' + letra + ' — Alinhamento dos registradores individuais</h2>' +
    '<p>Cada sensor foi registrado por um registrador próprio (um arquivo por sensor). As leituras foram alinhadas pela linha do tempo do ' + AutoRel_pdE_(m.referencia) + ', com tolerância de ' + AutoRel_pdE_(SGO_DocA4_val_(m.toleranciaSeg, 1, 's')) +
    ' (metade do intervalo típico). Leitura sem correspondência dentro da tolerância fica em branco nas tabelas e, se cair na exposição, impede a emissão.</p>' +
    SGO_DocA4_tabela_([{ t: 'Sensor' }, { t: 'Leituras', cls: 'num' }, { t: 'Primeira leitura' }, { t: 'Última leitura' }, { t: 'Sem correspondência', cls: 'num' }, { t: 'Maior diferença de horário (s)', cls: 'num' }],
      m.sensores.map(function(r) { return [r.sensor, String(r.leituras), r.inicio, r.fim, String(r.semCorrespondencia), SGO_DocA4_num_(r.maiorDefasagemSeg, 0)]; })) +
    (m.pressao ? '<p class="nota">' + AutoRel_pdE_('Pressão: ' + m.pressao.origem + '.') + '</p>' : '') + '</section>';
}

/* ---------------- ciclo térmico ---------------- */

function AutoRel_pdCorpoCiclo_(ctx, D, op) {
  var esc = AutoRel_pdE_, n = AutoRel_pdN_, val = AutoRel_pdV_;
  var f = D.fatos, a = D.analise, L = D.linhas;
  var h = [];
  var nTab = { n: 0 }, nFig = { n: 0 };
  function tab(txt) { nTab.n++; return SGO_DocA4_legendaTabela_(nTab.n, txt); }
  var tRefTxt = val(D.ref.tBase, 1, '°C'), zTxt = val(D.ref.z, 0, '°C');

  // 1. Quadro-resumo
  h.push('<section class="pd-secao"><h2>1. Quadro-resumo dos resultados</h2>');
  h.push('<p>Cada critério de aceitação avaliado pelo sistema neste ensaio, com o valor medido, o critério configurado e a fonte técnica. O resultado do ensaio está na capa; o detalhamento de cada valor está nas seções 3 a 5 e as leituras, na seção 8 e no Anexo A.</p>');
  h.push('<div class="manter">' + tab('Verificação dos critérios de aceitação'));
  h.push(AutoRel_pdQuadroResumo_(ctx) + '</div>');
  h.push('<p class="nota">Critério não avaliado não aprova nem reprova o ensaio; o motivo está na coluna do valor medido. A regra de decisão está na seção 2.2.</p>');
  h.push('</section>');

  // 2. Condições do ensaio
  h.push('<section class="pd-secao"><h2>2. Condições do ensaio</h2>');
  var params = (ctx.parametros || []).slice();
  params.push(['Leituras registradas', String(L.length) + (L.length ? ' (de ' + L[0].hora + ' a ' + L[L.length - 1].hora + ')' : '')]);
  params.push(['Duração total do registro', val(f.tempoTotalMinutos, 2, 'min')]);
  h.push('<h3>2.1 Parâmetros</h3>' + SGO_DocA4_tabelaIdent_(params, '', { porLinha: 3 }));
  h.push('<h3>2.2 Escopo e limitações</h3>' + SGO_DocA4_lista_(ctx.escopo || []));
  h.push('<h3>2.3 Referências normativas</h3>' + SGO_DocA4_lista_(ctx.normas || []));
  h.push('</section>');

  // 3. Resultados por sensor e por fase
  h.push('<section class="pd-secao"><h2>3. Resultados por sensor e por fase do ciclo</h2>');
  h.push('<h3>3.1 Por sensor (fase de exposição)</h3>');
  if (D.porSensor.length && D.temExp) {
    h.push('<div class="manter">' + tab('Estatísticas de cada sensor ativo na fase de exposição (' + (L[D.ini] ? L[D.ini].hora : '—') + ' a ' + (L[D.fim] ? L[D.fim].hora : '—') + ')'));
    h.push(SGO_DocA4_tabela_([
      { t: 'Sensor' }, { t: 'Leituras', cls: 'num' }, { t: 'Mínima (°C)', cls: 'num' }, { t: 'Máxima (°C)', cls: 'num' }, { t: 'Média (°C)', cls: 'num' }, { t: 'Desvio-padrão (°C)', cls: 'num' },
      { t: 'Tempo na faixa no patamar (min)', cls: 'num' }, { t: 'Atingiu ' + n(D.tMin, 1) + ' °C às', cls: 'cen' }, { t: 'Diferença para a referência (s)', cls: 'num' }, { t: 'F0 (min)', cls: 'num' }, { t: 'F0 × mínimo', cls: 'cen' }],
      D.porSensor.map(function(s) {
        return [s.sensor + (s.pior ? ' (pior F0)' : '') + (s.referencia ? ' (referência)' : ''), String(s.n), val(s.min, 2), val(s.max, 2), val(s.media, 2), val(s.desvio, 2), val(s.tempoFaixaMin, 2),
          { t: s.primeiraHora || '—', cls: 'cen' }, s.atrasoSeg === null ? '—' : n(s.atrasoSeg, 0), val(s.f0, 2),
          f.exigeF0 ? Object.assign(SGO_DocA4_celSituacao_(s.conforme, 'Atende', 'Abaixo do mínimo'), { cls: 'cen sit' }) : { html: '<span class="info-txt">Informativo</span>', cls: 'cen' }];
      }), { classe: 'pd-sens' + (D.porSensor.length > 12 ? ' compacta' : '') }) + '</div>');
    h.push('<p class="nota">Mínima, máxima, média e F0 são os valores do cálculo do ensaio (os mesmos do relatório de ensaio). Desvio-padrão amostral das leituras da exposição. Tempo na faixa: soma dos intervalos do patamar em que o sensor ficou entre ' +
      esc(val(D.tMin, 1, '°C')) + ' e ' + esc(val(D.tMax, 1, '°C')) + ' nas duas leituras do intervalo. Diferença para a referência: tempo entre a ' + esc(D.refIdx >= 0 ? 'referência da câmara (S' + (D.refIdx + 1) + ')' : 'primeira leitura de qualquer sensor') + ' e o sensor atingirem a temperatura mínima de esterilização.' +
      (f.sensoresDesabilitados && f.sensoresDesabilitados.length ? ' Sensores desconsiderados pelo técnico: ' + esc(f.sensoresDesabilitados.join(', ')) + '.' : '') + '</p>');
  } else {
    h.push('<p>A fase de exposição não foi identificada nos dados; não há estatísticas por sensor nem F0. As leituras estão no Anexo A.</p>');
  }
  h.push('<h3>3.2 Por fase do ciclo</h3>');
  h.push('<div class="manter">' + tab('Fases identificadas no registro, com a temperatura dos sensores ativos' + (D.comPressao ? ' e a pressão da câmara' : '')));
  var colsFase = [{ t: 'Fase' }, { t: 'Início', cls: 'cen' }, { t: 'Término', cls: 'cen' }, { t: 'Duração (min)', cls: 'num' }, { t: 'Leituras', cls: 'num' }, { t: 'Temp. mínima (°C)', cls: 'num' }, { t: 'Temp. máxima (°C)', cls: 'num' }, { t: 'Temp. média (°C)', cls: 'num' }];
  if (D.comPressao) colsFase.push({ t: 'Pressão mínima (' + D.rotuloUnidade + ')', cls: 'num' }, { t: 'Pressão máxima (' + D.rotuloUnidade + ')', cls: 'num' });
  h.push(SGO_DocA4_tabela_(colsFase, D.fases.map(function(fz) {
    var l = [fz.nome, { t: fz.inicio, cls: 'cen' }, { t: fz.termino, cls: 'cen' }, val(fz.duracaoMin, 2), String(fz.leituras), val(fz.tMin, 2), val(fz.tMax, 2), val(fz.tMed, 2)];
    if (D.comPressao) l.push(val(fz.pMin, 3), val(fz.pMax, 3));
    return l;
  }), { classe: 'pd-fases' + (D.fases.length > 14 ? ' compacta' : '') }) + '</div>');
  if (D.patamar) h.push('<p class="nota">Patamar avaliado nos critérios de tempo e de faixa: de ' + esc(D.patamar.inicio.replace(/^.* /, '')) + ' a ' + esc(D.patamar.fim.replace(/^.* /, '')) + ' (' + esc(val(D.patamar.duracaoMin, 2, 'min')) + ', ' + D.patamar.leituras + ' leituras), do início da exposição até a última leitura com todos os sensores na temperatura de esterilização. A janela do F0 é a fase de exposição inteira.</p>');
  h.push('</section>');

  // 4. Gráficos
  var figs = AutoRel_pdFigurasCiclo_(D);
  h.push('<section class="pd-folha-fig"><h2>4. Gráficos</h2>');
  if (!figs.length) h.push('<p class="nota">Não há leituras com horário suficientes para os gráficos.</p>');
  else h.push(AutoRel_pdFolhasFiguras_(figs, nFig).replace(/<div class="(pd-cheia|pd-duas)">/g, function(m, c, off) { return off === 0 ? m : '<div class="' + c + ' pd-nova">'; }));
  h.push('</section>');

  // 5. Memória de cálculo
  h.push('<section class="pd-secao"><h2>5. Memória de cálculo</h2>');
  var nSub = 0;
  if (f.exigeF0 && D.temExp) {
    nSub++;
    h.push('<h3>5.' + nSub + ' Letalidade térmica (F0)</h3>');
    h.push('<p>O F<sub>0</sub> converte o efeito letal da temperatura real em minutos equivalentes à temperatura de referência, conforme a ABNT NBR ISO 17665-1. Para cada sensor ativo, somam-se os intervalos entre leituras consecutivas da fase de exposição pela regra dos trapézios, com o intervalo real entre as leituras:</p>');
    h.push('<p class="formula">F<sub>0</sub> = Σ ½ · [L(T<sub>i−1</sub>) + L(T<sub>i</sub>)] · Δt<sub>i</sub>, &nbsp; com &nbsp; L(T) = 10<sup>(T − T<sub>ref</sub>) / z</sup></p>');
    h.push('<p>T<sub>ref</sub> = ' + esc(tRefTxt) + ' e z = ' + esc(zTxt) + '. Δt<sub>i</sub> é o intervalo medido entre as leituras (intervalo típico deste registro: ' + esc(val(D.dtSeg, 0, 's')) + '); intervalo maior que o permitido não soma e impede a emissão. A primeira leitura da exposição não tem intervalo anterior e contribui com zero.</p>');
    var piorK = D.porSensor.filter(function(s) { return s.pior; })[0];
    var mem = piorK ? (D.memoriaF0[piorK.idx] || []) : [];
    if (mem.length >= 2) {
      var m1 = mem[1], m0 = mem[0];
      h.push('<div class="pd-passo"><p><b>Exemplo passo a passo — primeiro intervalo do sensor ' + esc(piorK.sensor) + ' (menor F0)</b></p>' +
        '<p class="eq">L(' + n(m0.temperatura, 2) + ') = 10<sup>(' + n(m0.temperatura, 2) + ' − ' + n(D.ref.tBase, 1) + ') / ' + n(D.ref.z, 0) + '</sup> = 10<sup>' + n((m0.temperatura - D.ref.tBase) / D.ref.z, 4) + '</sup> = ' + n(m0.fator, 4) + '</p>' +
        '<p class="eq">L(' + n(m1.temperatura, 2) + ') = 10<sup>' + n((m1.temperatura - D.ref.tBase) / D.ref.z, 4) + '</sup> = ' + n(m1.fator, 4) + '</p>' +
        '<p class="eq">Δt = ' + n(m1.dtMin * 60, 0) + ' s = ' + n(m1.dtMin, 4) + ' min &nbsp;→&nbsp; contribuição = ½ · (' + n(m0.fator, 4) + ' + ' + n(m1.fator, 4) + ') · ' + n(m1.dtMin, 4) + ' = ' + n(m1.contribuicao, 4) + ' min</p>' +
        '<p>Somando as ' + (mem.length - 1) + ' contribuições das ' + mem.length + ' leituras da exposição: F<sub>0</sub>(' + esc(piorK.sensor) + ') = ' + esc(val(piorK.f0, 2, 'min')) + '.</p></div>');
      var amostra = mem.length > 8 ? mem.slice(0, 5).concat([null]).concat(mem.slice(-2)) : mem;
      h.push('<div class="manter">' + tab('Primeiras e últimas leituras do cálculo do F0 do sensor ' + piorK.sensor));
      h.push(SGO_DocA4_tabela_([{ t: 'Horário', cls: 'cen' }, { t: 'Temperatura (°C)', cls: 'num' }, { t: '(T − Tref) / z', cls: 'num' }, { t: 'Fator L(T)', cls: 'num' }, { t: 'Δt (s)', cls: 'num' }, { t: 'Contribuição (min)', cls: 'num' }, { t: 'F0 acumulado (min)', cls: 'num' }],
        amostra.map(function(r) {
          if (!r) return [{ html: '<i>' + (mem.length - 7) + ' leituras intermediárias (todas na seção 8)</i>', colspan: 7, cls: 'cen' }];
          return [{ t: AutoRel_acSoHora_(r.tempoStr), cls: 'cen' }, n(r.temperatura, 2), n((r.temperatura - D.ref.tBase) / D.ref.z, 4), n(r.fator, 4), n((r.dtMin || 0) * 60, 0), n(r.contribuicao, 4), n(r.acumulado, 2)];
        }), { classe: 'compacta' }).replace(/<tr><td colspan="7" class="cen">/, '<tr><td colspan="7" class="cen" style="color:#52606d">') + '</div>');
    }
    h.push('<div class="manter">' + tab('F0 de cada sensor ativo'));
    h.push(SGO_DocA4_tabela_([{ t: 'Sensor' }, { t: 'Leituras na exposição', cls: 'num' }, { t: 'Tempo integrado Σ Δt (min)', cls: 'num' }, { t: 'Fator médio', cls: 'num' }, { t: 'F0 (min)', cls: 'num' }, { t: 'Múltiplo do mínimo exigido', cls: 'num' }],
      D.porSensor.map(function(s) {
        var m = D.memoriaF0[s.idx] || [];
        var soma = m.reduce(function(x, r) { return x + (r.dtMin || 0); }, 0);
        var fm = m.length ? m.reduce(function(x, r) { return x + r.fator; }, 0) / m.length : null;
        return [s.sensor + (s.pior ? ' (pior)' : ''), String(m.length), n(soma, 2), fm === null ? '—' : n(fm, 2), val(s.f0, 2), (D.f0Min > 0 && isFinite(s.f0)) ? n(s.f0 / D.f0Min, 1) + '×' : '—'];
      }), { classe: D.porSensor.length > 12 ? 'compacta' : '' }) + '</div>');
    h.push('<p class="nota">A memória completa, leitura a leitura e por sensor, está no documento "Memória de cálculo do F0" do mesmo ensaio; os valores são os mesmos.</p>');
  }

  // 5.x Vapor saturado (só com pressão)
  var critVs = (ctx.criterios || []).filter(function(c) { return c.chave === 'vaporSaturado'; })[0];
  if (D.comPressao && D.temTsat && D.temExp) {
    nSub++;
    h.push('<div class="manter"><h3>5.' + nSub + ' Temperatura do vapor saturado × temperatura medida</h3>');
    h.push('<p>Para cada leitura do patamar, a temperatura de saturação do vapor de água é calculada pela pressão absoluta da câmara com a equação de retorno da região 4 da IAPWS-IF97 (p em MPa):</p>');
    h.push('<p class="formula">β = p<sup>1/4</sup>; &nbsp; E = β² + n<sub>3</sub>β + n<sub>6</sub>; &nbsp; F = n<sub>1</sub>β² + n<sub>4</sub>β + n<sub>7</sub>; &nbsp; G = n<sub>2</sub>β² + n<sub>5</sub>β + n<sub>8</sub>; &nbsp; D = 2G / (−F − √(F² − 4EG))</p>');
    h.push('<p class="formula">T<sub>s</sub> = ½ · [n<sub>10</sub> + D − √((n<sub>10</sub> + D)² − 4(n<sub>9</sub> + n<sub>10</sub>D))] − 273,15</p>');
    var pior = null;
    var pf = D.patamar ? D.patamar.fimIdx : D.fim;
    var tsMin = null, tsMax = null;
    for (var i = D.ini; i <= pf; i++) {
      var l = L[i];
      if (l.tsat === null) continue;
      var tCam = null;
      if (D.refIdx >= 0) tCam = l.t[D.refIdx];
      else { var vv = D.idxAtivos.map(function(k) { return l.t[k]; }).filter(function(q) { return q !== null && isFinite(q); }); if (vv.length) tCam = vv.reduce(function(p, q) { return p + q; }, 0) / vv.length; }
      if (tCam === null) continue;
      tsMin = tsMin === null ? l.tsat : Math.min(tsMin, l.tsat); tsMax = tsMax === null ? l.tsat : Math.max(tsMax, l.tsat);
      if (!pior || Math.abs(tCam - l.tsat) > Math.abs(pior.d)) pior = { l: l, tCam: tCam, d: tCam - l.tsat };
    }
    if (pior) {
      var pMPa = pior.l.p / 10;
      var base = D.refIdx >= 0 ? 'sensor de referência S' + (D.refIdx + 1) : 'média dos sensores ativos';
      h.push('<div class="pd-passo"><p><b>Exemplo passo a passo — leitura de ' + esc(pior.l.hora) + ' (maior diferença no patamar)</b></p>' +
        '<p class="eq">p = ' + n(pior.l.p, 3) + ' bar abs. = ' + n(pMPa, 4) + ' MPa &nbsp;→&nbsp; β = ' + n(Math.pow(pMPa, 0.25), 5) + ' &nbsp;→&nbsp; T<sub>s</sub> = ' + n(pior.l.tsat, 2) + ' °C</p>' +
        '<p class="eq">T medida (' + esc(base) + ') = ' + n(pior.tCam, 2) + ' °C &nbsp;→&nbsp; diferença = ' + n(pior.tCam, 2) + ' − ' + n(pior.l.tsat, 2) + ' = ' + n(pior.d, 2) + ' °C</p>' +
        '<p>No patamar, a temperatura do vapor saturado variou de ' + esc(val(tsMin, 2, '°C')) + ' a ' + esc(val(tsMax, 2, '°C')) + '.' + (critVs ? ' Critério: ' + esc(critVs.requisito.charAt(0).toLowerCase() + critVs.requisito.slice(1)) + '; resultado: ' + esc(critVs.naoAvaliado ? 'não avaliado' : (critVs.conforme ? 'atende' : 'não atende')) + '.' : '') + ' Os valores de cada leitura estão na seção 8 (colunas da pressão e do vapor saturado).</p></div>');
    }
    h.push('</div>');
  }

  // 5.x Tempo de equilíbrio
  var critEq = (ctx.criterios || []).filter(function(c) { return c.chave === 'equilibrio'; })[0];
  if (critEq && D.temExp) {
    nSub++;
    h.push('<div class="manter"><h3>5.' + nSub + ' Tempo de equilíbrio</h3>');
    var ultimo = null;
    D.porSensor.forEach(function(s) { if (s.atrasoSeg !== null && (!ultimo || s.atrasoSeg > ultimo.atrasoSeg)) ultimo = s; });
    var refNome = D.refIdx >= 0 ? 'S' + (D.refIdx + 1) : (D.iRefPrimeiro >= 0 ? (D.porSensor.filter(function(s) { return s.atrasoSeg === 0; })[0] || {}).sensor : '');
    h.push('<p>Tempo entre a referência da câmara atingir a temperatura mínima de esterilização (' + esc(val(D.tMin, 1, '°C')) + ') e todos os sensores ativos a atingirem. ' +
      (D.refIdx >= 0 ? 'Referência: sensor S' + (D.refIdx + 1) + ', informado como ponto de referência da câmara.' : 'Nenhum sensor de referência da câmara foi informado; a referência é o primeiro sensor a atingir a temperatura.') + ' A resolução do cálculo é o intervalo entre leituras (' + esc(val(D.dtSeg, 0, 's')) + ').</p>');
    if (ultimo && D.iRefPrimeiro >= 0) {
      h.push('<div class="pd-passo"><p class="eq">Referência (' + esc(refNome || '—') + ') às ' + esc(L[D.iRefPrimeiro].hora) + '; último sensor a atingir (' + esc(ultimo.sensor) + ') às ' + esc(ultimo.primeiraHora) + ' &nbsp;→&nbsp; diferença = ' + n(ultimo.atrasoSeg, 0) + ' s</p>' +
        '<p>Resultado do critério: ' + esc(critEq.naoAvaliado ? critEq.obtido : critEq.obtido + (critEq.conforme ? ' — atende' : ' — não atende')) + '. A diferença de cada sensor está na tabela da seção 3.1.</p></div>');
    } else {
      h.push('<p class="nota">' + esc(critEq.obtido) + '</p>');
    }
    h.push('</div>');
  }

  // 5.x Incerteza
  nSub++;
  h.push('<div class="manter"><h3>5.' + nSub + ' Incerteza de medição</h3>');
  var inc = f.incertezaF0;
  if (inc && f.exigeF0) {
    var casasU = AutoRel_pdCasasIncerteza_(inc.uF0);
    var uArr = Math.round(inc.uF0 * Math.pow(10, casasU)) / Math.pow(10, casasU);
    h.push('<p>A incerteza expandida da temperatura é a do certificado de calibração do registrador (a maior entre os registradores usados): U(T) = ' + esc(val(inc.uTemperatura, 2, '°C')) + ' (k = 2). Ela é propagada ao F<sub>0</sub> do pior sensor como erro constante de temperatura durante a exposição (aproximação de primeira ordem):</p>');
    h.push('<p class="formula">U(F<sub>0</sub>) ≈ F<sub>0</sub> · ln 10 / z · U(T)</p>');
    h.push('<div class="pd-passo"><p class="eq">U(F<sub>0</sub>) = ' + n(f.minF0, 2) + ' · 2,3026 / ' + n(D.ref.z, 0) + ' · ' + n(inc.uTemperatura, 2) + ' = ' + n(inc.uF0, 2) + ' min (' + n(inc.relativo, 1) + ' % do valor)</p>' +
      '<p>Resultado declarado do pior sensor' + (f.piorSensorF0 ? ' (' + esc(f.piorSensorF0.sensor) + ')' : '') + ': <b>F<sub>0</sub> = (' + n(f.minF0, casasU) + ' ± ' + n(uArr, casasU) + ') min</b>, k = 2, com a incerteza em dois algarismos significativos. ' +
      'Mínimo exigido: ' + esc(val(f.f0MinNormativo, 2, 'min')) + '; F<sub>0</sub> − U(F<sub>0</sub>) = ' + n(f.minF0 - inc.uF0, casasU) + ' min.</p></div>');
    h.push('<p class="nota">Regra de decisão na seção 2.2. As temperaturas deste documento são apresentadas com duas casas decimais, a mesma resolução da incerteza do registrador.</p>');
  } else if (!D.temExp || !f.exigeF0) {
    h.push('<p>A incerteza expandida da temperatura é a do certificado de calibração do registrador (seção de rastreabilidade na capa). ' + (D.temExp ? 'Este ciclo não tem F<sub>0</sub> mínimo exigido; não há letalidade a declarar com incerteza.' : 'Sem fase de exposição identificada não há F<sub>0</sub> calculado; não há letalidade a declarar com incerteza.') + '</p>');
  } else {
    h.push('<p>A incerteza do registrador não está informada no cadastro de padrões; a incerteza do F<sub>0</sub> não pôde ser estimada neste documento. Para estimá-la, informe a incerteza expandida (U95) do certificado de calibração em Cadastros › Padrões de referência.</p>');
  }
  h.push('</div></section>');

  // 6, 7: não conformidades e responsabilidade
  h.push('<section class="pd-secao">' + AutoRel_pdSecaoNcObs_(ctx, 6));
  h.push(AutoRel_pdSecaoResponsabilidade_(ctx, 7, op.aprovacao, op.minuta, op.assinaturas, 'as leituras da seção 8 e do Anexo A fazem parte deste documento.'));
  h.push('</section>');

  // 8. Leituras da fase de exposição + Anexo A
  var blocos = [];
  for (var b = 0; b < D.idxAtivos.length; b += AUTOREL_PD_SENSORES_POR_BLOCO) blocos.push(D.idxAtivos.slice(b, b + AUTOREL_PD_SENSORES_POR_BLOCO));
  if (!blocos.length) blocos.push([]);
  function colunas(bloco, ultimoBloco, comFase) {
    var c = [{ t: 'Horário', w: '15mm' }];
    if (comFase) c.push({ t: 'Fase', w: '25mm' });
    bloco.forEach(function(k) { c.push({ t: 'S' + (k + 1) + ' (°C)' }); });
    if (ultimoBloco) {
      if (D.comPressao) c.push({ t: 'Pressão (' + esc(D.rotuloUnidade) + ')' });
      if (D.temTsat && !comFase) c.push({ t: 'Vapor saturado (°C)' });
      if (!comFase) c.push({ t: 'Mínima (°C)' }, { t: 'Máxima (°C)' }, { t: 'Diferença (°C)' });
    }
    return c;
  }
  function celulas(bloco, ultimoBloco, comFase) {
    return function(l) {
      var c = [{ t: l.hora, cls: 'cen' }];
      if (comFase) c.push({ t: AUTOREL_PD_FASE_CURTA[l.fase] || '—', cls: '' });
      c = c.concat(AutoRel_pdCelulasTemp_(l, bloco, D, D.idxAtivos));
      if (ultimoBloco) {
        if (D.comPressao) c.push({ t: l.p === null ? '—' : n(l.p, 3), cls: 'num' });
        if (D.temTsat && !comFase) c.push({ t: l.tsat === null ? '—' : n(l.tsat, 2), cls: 'num' });
        if (!comFase) {
          var vals = D.idxAtivos.map(function(k) { return l.t[k]; }).filter(function(v) { return v !== null && isFinite(v); });
          var mn = vals.length ? Math.min.apply(null, vals) : null, mx = vals.length ? Math.max.apply(null, vals) : null;
          c.push({ t: mn === null ? '—' : n(mn, 2), cls: 'num' }, { t: mx === null ? '—' : n(mx, 2), cls: 'num' }, { t: mn === null ? '—' : n(mx - mn, 2), cls: 'num' });
        }
      }
      return c;
    };
  }
  var temPos = D.patamar && D.temExp && D.patamar.fimIdx < D.fim;
  var legCores = '<p class="pd-legenda-cores"><span style="background:#e7effb">azul</span>menor temperatura da linha <span style="background:#fdeee7">laranja</span>maior temperatura da linha <span style="color:#a61b1b;font-weight:700">vermelho</span>leitura do patamar fora da faixa de esterilização' +
    (temPos ? ' <span style="color:#7b8794;font-style:italic">cinza</span>depois do patamar (descida final: entra no F<sub>0</sub>, fica fora dos critérios de tempo e de faixa)' : '') + '</p>';
  h.push('<section class="pd-secao"><h2>8. Leituras da fase de exposição</h2>');
  if (D.temExp) {
    var linhasExp = L.slice(D.ini, D.fim + 1);
    h.push('<p>Leituras do registrador alinhadas no tempo, da primeira à última leitura da fase de exposição (janela do F<sub>0</sub>, ' + linhasExp.length + ' leituras)' + (D.desloc ? ', com a correção de temperatura de ' + esc(val(D.desloc, 2, '°C')) + ' aplicada' : ', sem correção') + '.' +
      (blocos.length > 1 ? ' Com ' + D.idxAtivos.length + ' sensores, a tabela é apresentada em ' + blocos.length + ' blocos de sensores; as colunas de resumo ficam no último bloco.' : '') + '</p>' + legCores);
    blocos.forEach(function(bloco, bi) {
      var ult = bi === blocos.length - 1;
      var titBloco = blocos.length > 1 ? ' — sensores S' + (bloco[0] + 1) + ' a S' + (bloco[bloco.length - 1] + 1) : '';
      var numTab = ++nTab.n;
      h.push((bi > 0 ? '<div class="pd-nova"></div>' : '') + AutoRel_pdTabelaPaginada_(linhasExp, colunas(bloco, ult, false), celulas(bloco, ult, false), {
        primeira: bi === 0 ? AUTOREL_PD_LINHAS_PRIMEIRA : AUTOREL_PD_LINHAS_FOLHA,
        classeLinha: function(l) { return D.patamar && l.i > D.patamar.fimIdx ? 'pos-pat' : ''; },
        titulo: function(k, tot, rows) { return '<b>Tabela ' + numTab + '</b> — Leituras da fase de exposição' + esc(titBloco) + ' (' + esc(rows[0].hora) + ' a ' + esc(rows[rows.length - 1].hora) + ')' + (tot > 1 ? ' · folha ' + k + ' de ' + tot : ''); }
      }));
    });
  } else {
    h.push('<p>A fase de exposição não foi identificada; todas as leituras estão no Anexo A.</p>');
  }
  h.push('</section>');

  var fora = D.temExp ? L.filter(function(l) { return l.i < D.ini || l.i > D.fim; }) : L;
  if (fora.length) {
    h.push('<section class="pd-secao"><h2>Anexo A — Leituras fora da fase de exposição</h2>');
    h.push('<p>Demais leituras do registro (antes e depois da fase de exposição), em formato compacto, com a fase identificada em cada leitura. ' + fora.length + ' leituras.</p>');
    blocos.forEach(function(bloco, bi) {
      var ult = bi === blocos.length - 1;
      var nCols = 2 + bloco.length + (ult && D.comPressao ? 1 : 0);
      var paineis = Math.max(1, Math.min(3, Math.floor(267 / (16 + 25 + (nCols - 2) * 12.5 + 5))));
      var numTab = ++nTab.n;
      var titBloco = blocos.length > 1 ? ' — sensores S' + (bloco[0] + 1) + ' a S' + (bloco[bloco.length - 1] + 1) : '';
      h.push((bi > 0 ? '<div class="pd-nova"></div>' : '') + AutoRel_pdTabelaPaginada_(fora, colunas(bloco, ult, true), celulas(bloco, ult, true), {
        paineis: paineis, classe: 'pd-compacta', porFolha: 40, primeira: bi === 0 ? 34 : 40,
        titulo: function(k, tot, rows) { return '<b>Tabela ' + numTab + '</b> — Leituras fora da fase de exposição' + esc(titBloco) + ' (' + esc(rows[0].hora) + ' a ' + esc(rows[rows.length - 1].hora) + ')' + (tot > 1 ? ' · folha ' + k + ' de ' + tot : ''); }
      }));
    });
    h.push('</section>');
  }
  h.push(AutoRel_pdAnexoMesclagem_(ctx, fora.length ? 'B' : 'A'));
  return h.join('\n');
}

/* ---------------- teste de estanqueidade ---------------- */

function AutoRel_pdCorpoLeak_(ctx, D, op) {
  var esc = AutoRel_pdE_, n = AutoRel_pdN_, val = AutoRel_pdV_;
  var a = D.analise, L = D.linhas;
  var h = [];
  var nTab = { n: 0 }, nFig = { n: 0 };
  function tab(txt) { nTab.n++; return SGO_DocA4_legendaTabela_(nTab.n, txt); }
  var un = { MBAR: 'mbar', BAR: 'bar', KPA: 'kPa' }[D.unidade] || 'mbar';

  h.push('<section class="pd-secao"><h2>1. Quadro-resumo dos resultados</h2>');
  h.push('<p>O critério de aceitação do teste, com o valor medido, o limite configurado e a fonte técnica. O resultado está na capa; o cálculo, na seção 5; as leituras, na seção 8 e no Anexo A.</p>');
  h.push(tab('Verificação do critério de aceitação'));
  h.push(AutoRel_pdQuadroResumo_(ctx));
  h.push('<p class="nota">' + esc(String(((AutoRel_UCFG.EMISSAO || {}).regraDecisao) || '')) + '</p>');
  h.push('<h2>2. Condições do ensaio</h2>');
  var params = (ctx.parametros || []).slice();
  params.push(['Leituras registradas', String(L.length)]);
  params.push(['Leituras na janela do teste', String(a.indiceFim - a.indiceInicio + 1)]);
  if (a.duracaoMinimaJanelaMin) params.push(['Duração mínima da janela', val(a.duracaoMinimaJanelaMin, 0, 'min')]);
  h.push('<h3>2.1 Parâmetros</h3>' + SGO_DocA4_tabelaIdent_(params, '', { porLinha: 3 }));
  h.push('<h3>2.2 Escopo e limitações</h3>' + SGO_DocA4_lista_(ctx.escopo || []));
  h.push('<h3>2.3 Referências normativas</h3>' + SGO_DocA4_lista_(ctx.normas || []));
  h.push('</section>');

  h.push('<section class="pd-secao"><h2>3. Resultados</h2>');
  h.push(tab('Grandezas do teste de estanqueidade'));
  h.push(SGO_DocA4_tabela_([{ t: 'Grandeza' }, { t: 'Valor', cls: 'num' }], [
    ['Início da janela', { t: AutoRel_acSoHora_(a.tempoInicioLeakTest), cls: 'num' }], ['Fim da janela', { t: AutoRel_acSoHora_(a.tempoFimLeakTest), cls: 'num' }],
    ['Duração', val(a.tempoDecorridoMinutos, 2, 'min')], ['Pressão inicial', val(a.pressaoInicioMbar, 2, 'mbar')], ['Pressão final', val(a.pressaoFimMbar, 2, 'mbar')],
    ['Variação de pressão', val(a.deltaPressaoMbar, 2, 'mbar')], ['Taxa de vazamento', val(a.taxaVazamentoMbarMin, 2, 'mbar/min')], ['Limite configurado', val(a.limiteTaxaVazamentoMbarMin, 2, 'mbar/min')]
  ]));
  var rt = a.registroTermico || {};
  var rtAtivos = (rt.porSensor || []).filter(function(s) { return s.ativo; });
  if (rtAtivos.length) {
    h.push(tab('Temperatura registrada na janela do teste (informativa, não entra no resultado)'));
    h.push(SGO_DocA4_tabela_([{ t: 'Sensor' }, { t: 'Mínima (°C)', cls: 'num' }, { t: 'Média (°C)', cls: 'num' }, { t: 'Máxima (°C)', cls: 'num' }],
      rtAtivos.map(function(s) { return [s.sensor, val(s.min, 2), val(s.media, 2), val(s.max, 2)]; })));
  }
  h.push('</section>');

  var figs = AutoRel_pdFigurasLeak_(D);
  h.push('<section class="pd-folha-fig"><h2>4. Gráficos</h2>');
  h.push(figs.length ? AutoRel_pdFolhasFiguras_(figs, nFig).replace(/<div class="(pd-cheia|pd-duas)">/g, function(m, c, off) { return off === 0 ? m : '<div class="' + c + ' pd-nova">'; }) : '<p class="nota">Não há leituras com horário suficientes para os gráficos.</p>');
  h.push('</section>');

  h.push('<section class="pd-secao"><h2>5. Memória de cálculo</h2><h3>5.1 Taxa de vazamento</h3>');
  h.push('<p>Com a câmara isolada após a evacuação, a taxa de vazamento é a variação da pressão absoluta entre a primeira e a última leitura da janela do teste, dividida pelo tempo decorrido:</p>');
  h.push('<p class="formula">taxa = |p<sub>fim</sub> − p<sub>início</sub>| / Δt</p>');
  h.push('<div class="pd-passo">' +
    (D.fator !== 1 ? '<p class="eq">Conversão da unidade do registrador (' + esc(un) + ') para mbar: p(mbar) = p(' + esc(un) + ') × ' + n(D.fator, 0) + ' → p<sub>início</sub> = ' + n(a.pressaoInicioOriginal, 4) + ' × ' + n(D.fator, 0) + ' = ' + n(a.pressaoInicioMbar, 2) + ' mbar; p<sub>fim</sub> = ' + n(a.pressaoFimOriginal, 4) + ' × ' + n(D.fator, 0) + ' = ' + n(a.pressaoFimMbar, 2) + ' mbar</p>' : '') +
    '<p class="eq">Δp = |' + n(a.pressaoFimMbar, 2) + ' − ' + n(a.pressaoInicioMbar, 2) + '| = ' + n(a.deltaPressaoMbar, 2) + ' mbar; &nbsp; Δt = ' + esc(AutoRel_acSoHora_(a.tempoFimLeakTest)) + ' − ' + esc(AutoRel_acSoHora_(a.tempoInicioLeakTest)) + ' = ' + n(a.tempoDecorridoMinutos, 2) + ' min</p>' +
    '<p class="eq">taxa = ' + n(a.deltaPressaoMbar, 2) + ' / ' + n(a.tempoDecorridoMinutos, 2) + ' = ' + n(a.taxaVazamentoMbarMin, 2) + ' mbar/min &nbsp; (limite: ' + n(a.limiteTaxaVazamentoMbarMin, 2) + ' mbar/min)</p></div>');
  h.push('<p class="nota">A taxa usa a pressão das duas leituras extremas da janela; as leituras intermediárias estão na seção 8, com a variação acumulada desde o início. A incerteza da pressão não é declarada neste documento: o certificado do registrador cadastrado informa a incerteza de temperatura.</p>');
  h.push('</section>');

  h.push('<section class="pd-secao">' + AutoRel_pdSecaoNcObs_(ctx, 6));
  h.push(AutoRel_pdSecaoResponsabilidade_(ctx, 7, op.aprovacao, op.minuta, op.assinaturas, 'as leituras da seção 8 e do Anexo A fazem parte deste documento.'));
  h.push('</section>');

  var sens = D.idxAtivos.slice(0, 8);
  var cols = [{ t: 'Horário', w: '16mm' }, { t: 'Pressão registrada (' + esc(un) + ')' }, { t: 'Pressão (mbar)' }, { t: 'Variação desde o início (mbar)' }].concat(sens.map(function(k) { return { t: 'S' + (k + 1) + ' (°C)' }; }));
  function cel(l) {
    return [{ t: l.hora, cls: 'cen' }, { t: l.p === null ? '—' : n(l.p, D.fator === 1 ? 2 : 4), cls: 'num' }, { t: l.pMbar === null ? '—' : n(l.pMbar, 2), cls: 'num' }, { t: l.variacao === null ? '—' : n(l.variacao, 2), cls: 'num' }]
      .concat(sens.map(function(k) { var v = l.t[k]; return { t: v === null ? '—' : n(v, 2), cls: 'num' }; }));
  }
  var dentro = L.filter(function(l) { return l.dentro; });
  h.push('<section class="pd-secao"><h2>8. Leituras da janela do teste</h2><p>Leituras do registrador de ' + esc(AutoRel_acSoHora_(a.tempoInicioLeakTest)) + ' a ' + esc(AutoRel_acSoHora_(a.tempoFimLeakTest)) + ' (' + dentro.length + ' leituras).</p>');
  var nt = ++nTab.n;
  h.push(AutoRel_pdTabelaPaginada_(dentro, cols, cel, { paineis: sens.length <= 3 ? 2 : 1, titulo: function(k, tot, rows) { return '<b>Tabela ' + nt + '</b> — Leituras da janela do teste (' + esc(rows[0].hora) + ' a ' + esc(rows[rows.length - 1].hora) + ')' + (tot > 1 ? ' · folha ' + k + ' de ' + tot : ''); } }));
  h.push('</section>');
  var fora = L.filter(function(l) { return !l.dentro; });
  if (fora.length) {
    var nt2 = ++nTab.n;
    var colsF = [{ t: 'Horário', w: '16mm' }, { t: 'Pressão registrada (' + esc(un) + ')' }, { t: 'Pressão (mbar)' }].concat(sens.map(function(k) { return { t: 'S' + (k + 1) + ' (°C)' }; }));
    h.push('<section class="pd-secao"><h2>Anexo A — Leituras fora da janela do teste</h2><p>Demais leituras do registro (evacuação e após o teste), em formato compacto. ' + fora.length + ' leituras.</p>');
    h.push(AutoRel_pdTabelaPaginada_(fora, colsF, function(l) {
      return [{ t: l.hora, cls: 'cen' }, { t: l.p === null ? '—' : n(l.p, D.fator === 1 ? 2 : 4), cls: 'num' }, { t: l.pMbar === null ? '—' : n(l.pMbar, 2), cls: 'num' }].concat(sens.map(function(k) { var v = l.t[k]; return { t: v === null ? '—' : n(v, 2), cls: 'num' }; }));
    }, { paineis: Math.max(1, Math.min(3, Math.floor(267 / (16 + (2 + sens.length) * 14 + 5)))), classe: 'pd-compacta', porFolha: 38, primeira: 32,
      titulo: function(k, tot, rows) { return '<b>Tabela ' + nt2 + '</b> — Leituras fora da janela do teste (' + esc(rows[0].hora) + ' a ' + esc(rows[rows.length - 1].hora) + ')' + (tot > 1 ? ' · folha ' + k + ' de ' + tot : ''); } }));
    h.push('</section>');
  }
  h.push(AutoRel_pdAnexoMesclagem_(ctx, fora.length ? 'B' : 'A'));
  return h.join('\n');
}

/**
 * Documento completo. op: { aprovacao:{nome, perfil, em} | null, minuta:bool }.
 * interno.resultado: saída do motor (AutoRel_acMontarContextoCertificado_ com interno).
 */
function AutoRel_pdMontarHtml_(contexto, interno, op) {
  op = op || {};
  var ctx = contexto, id = ctx.identificacao;
  var leak = ctx.tipoRelatorio === 'LEAK_TEST';
  var D = leak ? AutoRel_pdPrepararLeak_(ctx, interno.resultado || {}) : AutoRel_pdPrepararCiclo_(ctx, interno.resultado || {});
  var numero = id.certificadoNumero || 'sem número';
  var cicloTxt = leak ? 'teste de estanqueidade da câmara' : String(ctx.equipamentoLabel || '').replace(/^Ciclo de Esterilização/, 'ciclo de esterilização');
  var doc = {
    titulo: 'Planilha de dados do ensaio térmico — Autoclave',
    subtitulo: 'Leituras do registrador, cálculos e gráficos de um ' + cicloTxt + '. Acompanha o relatório de ensaio do mesmo número.',
    tituloCurto: 'Planilha de dados do ensaio térmico — Autoclave',
    rotuloNumero: 'Planilha de dados nº',
    numero: numero, revisao: id.revisao, empresa: id.empresaExecutante, orientacao: 'paisagem'
  };
  var topo2 = [op.minuta ? 'MINUTA — não entregar ao cliente' : '', id.tag ? 'TAG ' + id.tag : '', id.cicloNumero ? 'Ciclo nº ' + id.cicloNumero : '', id.dataDoEnsaio || ''].filter(Boolean).join(' · ');
  var opDoc = { aprovacao: op.aprovacao || null, minuta: !!op.minuta, assinaturas: AutoRel_acListaAssinaturas_(ctx, op.aprovacao) };
  var h = [];
  var tituloAba = doc.titulo + ' nº ' + numero;
  h.push('<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">');
  h.push('<title>' + AutoRel_pdE_(tituloAba) + '</title>');
  h.push('<style>' + SGO_DocA4_estilos_(doc) + AutoRel_pdEstilosPagina_(doc, topo2) + AutoRel_pdEstilos_() + '</style></head><body>');
  h.push('<div class="barra-tela"><button type="button" onclick="window.print()">Imprimir ou salvar em PDF</button></div>');
  h.push('<main class="folha">');
  h.push('<div class="cab-tela"><img src="' + SGO_DocA4_logoDataUri_() + '" alt="Metrolabs"><div class="meta">' + AutoRel_pdE_(doc.tituloCurto) + '<br>' + AutoRel_pdE_(doc.rotuloNumero + ' ' + numero + ' · Revisão ' + SGO_DocA4_revisao_(doc.revisao)) + '</div></div>');
  var aviso = opDoc.minuta ? 'MINUTA PARA CONFERÊNCIA DO RESPONSÁVEL TÉCNICO — documento ainda não aprovado; não entregar ao cliente.'
    : (ctx.simulado ? 'Documento de uso interno, gerado com dados reconstituídos. Não representa ensaio real e não pode ser entregue ao cliente.' : '');
  h.push(AutoRel_pdCapa_(doc, ctx, D, opDoc.aprovacao, opDoc.minuta, aviso));
  h.push(SGO_DocA4_marcadorSumario_());
  h.push(leak ? AutoRel_pdCorpoLeak_(ctx, D, opDoc) : AutoRel_pdCorpoCiclo_(ctx, D, opDoc));
  h.push(SGO_DocA4_fimDocumento_());
  // Minuta e prévia não passam pela paginação do PDF: o sumário sai com as seções, sem os números de página.
  return opDoc.minuta ? SGO_DocA4_prepararSumario_(h.join('\n')).html : h.join('\n');
}

/* ============================================================
 * API — geração, emissão e aprovação (QUALIF_EMISSOES, módulo AUTOCLAVE_DADOS)
 * ============================================================ */

/** Contexto validado: travas do motor e do registrador impedem o documento (com o que corrigir). */
function AutoRel_pdValidar_(payload) {
  var interno = {};
  var contexto = AutoRel_acMontarContextoCertificado_(payload, interno);
  if (contexto.emissaoBloqueada) AutoRel_exigirSemTravas_(contexto.travas);
  return { contexto: contexto, interno: interno };
}

/** Resumo para o registro de atividade da tela (o mesmo formato do modelo anterior). */
function AutoRel_pdResumoTela_(contexto, interno) {
  var r = interno.resultado || {};
  if (contexto.tipoRelatorio === 'LEAK_TEST') {
    var l = r.analiseLeak || {};
    return { tipoRelatorio: 'LEAK_TEST', aprovado: !!l.aprovado, statusAprovacao: l.statusAprovacao, leakTestResumo: {
      tempoInicioLeakTest: l.tempoInicioLeakTest, tempoFimLeakTest: l.tempoFimLeakTest, tempoDecorridoMinutos: l.tempoDecorridoMinutos, unidadePressaoOriginal: l.unidadePressaoOriginal,
      pressaoInicioMbar: l.pressaoInicioMbar, pressaoFimMbar: l.pressaoFimMbar, deltaPressaoMbar: l.deltaPressaoMbar, taxaVazamentoMbarMin: l.taxaVazamentoMbarMin,
      limiteTaxaVazamentoMbarMin: l.limiteTaxaVazamentoMbarMin, motivosReprovacao: l.motivosReprovacao, observacoesAnalise: l.observacoesAnalise, alertasAnalise: l.alertasAnalise } };
  }
  var a = r.analise || {};
  return { aprovado: !!a.aprovado, statusAprovacao: a.statusAprovacao || (a.aprovado ? 'APROVADO' : 'REPROVADO'), analiseResumo: {
    minF0: a.minF0, mediaF0: a.mediaF0, maxF0: a.maxF0, tempoExposicaoMinutos: a.tempoExposicaoMinutos, tempoTotalMinutos: a.tempoTotalMinutos,
    tempoInicioExposicao: a.tempoInicioExposicao || '', tempoFimExposicao: a.tempoFimExposicao || '', tempoInicioCiclo: a.tempoInicioCiclo || '', tempoFimCiclo: a.tempoFimCiclo || '',
    quantidadeSensoresInstalados: a.quantidadeSensoresInstalados, quantidadeSensoresUtilizados: a.quantidadeSensoresUtilizados, sensoresUtilizados: a.sensoresUtilizados || [],
    sensoresDesabilitados: a.sensoresDesabilitados || [], piorSensorF0: a.piorSensorF0 || null, piorSensorTemperatura: a.piorSensorTemperatura || null,
    origemJanelaCiclo: a.origemJanelaCiclo || 'AUTO', origemJanelaExposicao: a.origemJanelaExposicao || 'AUTO', configuracaoDeteccaoExposicao: a.configuracaoDeteccaoExposicao || {},
    limitesAprovacao: a.limitesAprovacao || {}, observacoesAnalise: a.observacoesAnalise || [], alertasAnalise: a.alertasAnalise || [], motivosReprovacao: a.motivosReprovacao || [],
    deltaMinutosEstimado: a.deltaMinutosEstimado || 0, faseInicioRampa: typeof a.faseInicioRampa === 'number' ? a.faseInicioRampa : -1,
    faseInicioExp: typeof a.faseInicioExp === 'number' ? a.faseInicioExp : -1, faseFimExp: typeof a.faseFimExp === 'number' ? a.faseFimExp : -1 } };
}

function AutoRel_pdRotulo_(contexto) {
  return contexto.tipoRelatorio === 'LEAK_TEST' ? 'Planilha de dados Autoclave - estanqueidade' : 'Planilha de dados Autoclave';
}

/** Emite (aprovação registrada), salva HTML + PDF na pasta do cliente e grava a revisão. */
function AutoRel_pdEmitir_(payload, validado, sessao, idPendente) {
  var contexto = validado.contexto;
  var numero = contexto.identificacao.certificadoNumero;
  var simulado = !!payload.modoRelatorioSimulado;
  var revisao = simulado ? (parseInt(contexto.identificacao.revisao, 10) || 0) : SGO_QE_proximaRevisao_(AUTOREL_MODULO_EMISSAO_DADOS, numero, contexto.identificacao.revisao);
  contexto.identificacao.revisao = String(revisao);
  var aprovacao = simulado ? null : { nome: SGO_QE_nomeSessao_(sessao), login: String((sessao && sessao.usuario) || ''), perfil: String((sessao && sessao.perfil) || ''), em: SGO_QE_agora_() };
  var html = AutoRel_pdMontarHtml_(contexto, validado.interno, { aprovacao: aprovacao, minuta: false });
  var payloadSalvar = Object.assign({}, payload, { certRevisao: String(revisao) });
  var r = SGO_DocSalvar_finalizarCertificado_(html, payloadSalvar, AutoRel_acPastaLaudos_, AutoRel_pdRotulo_(contexto) + (revisao ? ' rev ' + revisao : ''), AutoRel_UCFG.TZ);
  if (!simulado) {
    var campos = {
      STATUS: 'EMITIDO', REVISAO: String(revisao), APROVADO_POR: aprovacao.nome, APROVADO_LOGIN: aprovacao.login, APROVADO_PERFIL: aprovacao.perfil,
      APROVADO_EM: aprovacao.em, PDF_ID: r.pdfId || '', HTML_ID: r.htmlId || '', RESULTADO: contexto.statusConsolidado
    };
    var id = idPendente;
    if (id) SGO_QE_atualizar_(id, campos);
    else id = SGO_QE_registrar_(Object.assign(AutoRel_acCamposRegistro_(contexto, payload, sessao), { MODULO: AUTOREL_MODULO_EMISSAO_DADOS }, campos));
    SGO_QE_marcarSubstituidas_(AUTOREL_MODULO_EMISSAO_DADOS, numero, id);
    r.emissaoId = id;
  }
  r.revisao = revisao;
  r.aprovadoPor = aprovacao ? aprovacao.nome : '';
  r.pdfNome = r.salvoNaPasta ? AutoRel_pdRotulo_(contexto) + (numero ? ' - ' + numero : '') + (revisao ? ' rev ' + revisao : '') : '';
  return r;
}

/**
 * Botão "Gerar planilha de dados" (modelo novo). Responsável técnico: emite (com a confirmação);
 * demais perfis: envia para aprovação e recebe a minuta para conferir. Relatório interno
 * (dados reconstituídos): gera sem gravar na pasta do cliente e sem aprovação.
 */
function AutoRel_apiGerarPlanilhaDados(payload, sessao) {
  payload = payload || {};
  var validado = AutoRel_pdValidar_(payload);
  var resumo = AutoRel_pdResumoTela_(validado.contexto, validado.interno);
  var base = Object.assign({ ok: true, modeloPlanilha: 'NOVO' }, resumo);
  if (payload.modoRelatorioSimulado) {
    return Object.assign(base, AutoRel_pdEmitir_(payload, validado, sessao, ''), { emitido: false, mensagem: 'Planilha de dados de uso interno gerada (não é salva na pasta do cliente).' });
  }
  if (AutoRel_acEhAprovador_(sessao)) {
    if (payload.confirmacaoRevisao !== true) throw new Error('Confirme que conferiu os dados do ensaio e aprova a emissão da planilha de dados (a aprovação fica registrada com o seu nome, a data e a hora).');
    var r = AutoRel_pdEmitir_(payload, validado, sessao, '');
    return Object.assign(base, r, { emitido: true, mensagem: 'Planilha de dados emitida (revisão ' + r.revisao + ') e salva na pasta do cliente.' });
  }
  var guardado = Object.assign({}, payload, { fotosCertificado: [] });
  var id = SGO_QE_registrar_(Object.assign(AutoRel_acCamposRegistro_(validado.contexto, payload, sessao), {
    MODULO: AUTOREL_MODULO_EMISSAO_DADOS, STATUS: 'AGUARDANDO_APROVACAO', PAYLOAD_JSON: JSON.stringify(guardado)
  }));
  var html = AutoRel_pdMontarHtml_(validado.contexto, validado.interno, { aprovacao: null, minuta: true });
  return Object.assign(base, { html: html, emitido: false, aguardandoAprovacao: true, id: id,
    mensagem: 'Planilha de dados enviada para aprovação do responsável técnico (registro ' + id + '). A minuta abriu em outra aba para conferência; o responsável técnico emite em "Aguardando aprovação".' });
}

/** Prévia (minuta) de uma planilha aguardando aprovação. */
function AutoRel_pdPreverPendente_(reg, payload) {
  var validado = AutoRel_pdValidar_(payload);
  if (AutoRel_acAssinatura_(validado.contexto) !== reg.HASH_CONTEXTO) throw new Error('Os dados mudaram desde o envio para aprovação (por exemplo, o cadastro do registrador). Devolva ao técnico para gerar a planilha de novo.');
  return { ok: true, html: AutoRel_pdMontarHtml_(validado.contexto, validado.interno, { aprovacao: null, minuta: true }) };
}

function AutoRel_pdAprovarPendente_(reg, payload, sessao) {
  var validado = AutoRel_pdValidar_(payload);
  if (AutoRel_acAssinatura_(validado.contexto) !== reg.HASH_CONTEXTO) throw new Error('Os dados mudaram desde o envio para aprovação. Devolva ao técnico para gerar a planilha de novo.');
  return AutoRel_pdEmitir_(payload, validado, sessao, reg.ID);
}
