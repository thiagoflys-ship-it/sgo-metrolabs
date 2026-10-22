/****************************************************
 * METROLABS — LAVADORAS — PLANILHA DE DADOS DO ENSAIO (modelo novo, 21/10/2026)
 *
 * Documento A4 em PAISAGEM (HTML para impressão + PDF na pasta do equipamento), no
 * molde da planilha de dados da autoclave (SGO_AutoRel_PlanilhaDados.js, de onde vêm
 * as peças genéricas de desenho: gráfico de linhas com fases, tabela paginada com
 * cabeçalho em todas as folhas, estilos de página). Capa com a ficha do ensaio,
 * sumário, quadro-resumo dos critérios (valor medido × critério × fonte × situação),
 * condições e escopo, resultados por sensor e por fase, gráficos em SVG estático,
 * memória de cálculo (A0 pela regra dos trapézios, incerteza, tempo do banho),
 * não conformidades, assinaturas e as leituras paginadas.
 *
 * Substitui a planilha do Google Planilhas (SGO_LavRel_Planilha.js, "modelo
 * anterior"), que continua no código e volta a ser usada só se o responsável pelo
 * sistema gravar LAVREL_PLANILHA_MODELO = ANTERIOR em Chaves e senhas. Documentos
 * já emitidos continuam na pasta como estão.
 *
 * Números: os mesmos do relatório de ensaio (LavRel_lvMontarContextoCertificado_);
 * aqui só se acrescentam estatísticas descritivas e a demonstração dos cálculos.
 * Emissão pelo fluxo de QUALIF_EMISSOES, módulo LAVADORA_DADOS (revisões próprias).
 ****************************************************/

var LAVREL_PD_PROP_MODELO = 'LAVREL_PLANILHA_MODELO';

/** Modelo da planilha de dados em uso: 'NOVO' (padrão) ou 'ANTERIOR' (Chaves e senhas). */
function LavRel_planilhaModelo_() {
  try {
    var v = String(PropertiesService.getScriptProperties().getProperty(LAVREL_PD_PROP_MODELO) || '').trim().toUpperCase();
    return v === 'ANTERIOR' ? 'ANTERIOR' : 'NOVO';
  } catch (e) {
    return 'NOVO';
  }
}

function LavRel_pdN_(v, casas) { return SGO_DocA4_num_(v, casas); }
function LavRel_pdV_(v, casas, un) { return SGO_DocA4_val_(v, casas, un); }
function LavRel_pdE_(s) { return SGO_DocA4_esc_(s); }
function LavRel_pdR2_(v) { return Math.round(v * 100) / 100; }

function LavRel_pdMs_(row) {
  var ms = LavRel_converterTempoLinhaParaMsAnalise_(row);
  return isFinite(ms) ? ms : null;
}

var LAVREL_PD_FASE_CURTA = {
  PRE_LAVAGEM: 'Pré-lavagem', LAVAGEM_AQUECIMENTO: 'Lavagem', ENXAGUE_INTERMEDIARIO: 'Enxágue', AQUECIMENTO_DESINFECCAO: 'Aquecimento',
  DESINFECCAO_TERMICA: 'Desinfecção', SECAGEM_RESFRIAMENTO: 'Secagem', PREPARO_INCOMPLETO: '—',
  AQUECIMENTO_BANHO: 'Aquecimento', CAVITACAO_ULTRASSOM: 'Banho', DRENAGEM_FINAL: 'Final'
};

/** Prepara as leituras (mesma correção de temperatura do motor) e as estatísticas descritivas. */
function LavRel_pdPreparar_(contexto, resultado) {
  var a = resultado.analise || {};
  var payload = resultado.payload || {};
  var dados = resultado.dadosNormalizados || [];
  var ativos = resultado.sensoresAtivos || a.sensoresAtivos || [];
  var f = contexto.estudos[0].fatos || {};
  var termo = contexto.tipoCiclo === 'TERMO';
  var desloc = LavRel_parseFloatSeguro_(payload.offsetTemp, 0);
  var tz = LavRel_UCFG.TZ || 'America/Sao_Paulo';
  var crit = ((LavRel_UCFG.CICLOS[contexto.tipoCiclo] || {}).criterios) || {};
  var tProg = Number(f.temperaturaProgramada);
  var tMin = termo ? tProg : tProg - Number(crit.toleranciaBanhoK || 0);
  var tMax = termo ? (crit.faixaAcimaK !== null && isFinite(Number(crit.faixaAcimaK)) ? tProg + Number(crit.faixaAcimaK) : null) : tProg + Number(crit.toleranciaBanhoK || 0);

  var nInst = 0;
  dados.forEach(function(r) { if (r && r.temperaturas && r.temperaturas.length > nInst) nInst = r.temperaturas.length; });
  var idxAtivos = [];
  for (var s = 0; s < nInst; s++) if (ativos[s]) idxAtivos.push(s);
  var porIdx = (a.fasesProcesso && a.fasesProcesso.fasePorIndice) || {};
  var comPressao = !!contexto.analisarPressao;
  var linhas = dados.map(function(r, i) {
    var t = [];
    for (var k = 0; k < nInst; k++) {
      var v = LavRel_parseFloatSeguroAnalise_(r && r.temperaturas ? r.temperaturas[k] : null, null);
      t.push(v === null ? null : v + desloc);
    }
    return { i: i, hora: LavRel_lvSoHora_(r.tempoStr), ms: LavRel_pdMs_(r), t: t, p: comPressao ? LavRel_parseFloatSeguroAnalise_(r.pressao, null) : null, fase: porIdx[i] || porIdx[String(i)] || '' };
  });

  var ini = a.faseInicioExp, fim = a.faseFimExp;
  var temFase = isFinite(ini) && ini >= 0 && isFinite(fim) && fim >= ini;
  var janelaIni = a.janelaA0 ? a.janelaA0.inicioIdx : ini;
  var patamar = a.patamar || null;
  function leit(l, k) { var v = l.t[k]; return v === null || !isFinite(v) ? null : v; }
  var conf = {};
  (f.conformidadePorSensor || []).forEach(function(c) { conf[c.sensor] = c; });
  var primeiro = {}, iPrim = -1;
  idxAtivos.forEach(function(k) {
    var lim = temFase ? fim : linhas.length - 1;
    var de = a.fasesProcesso && a.fasesProcesso.inicioEstagioPrincipal >= 0 ? a.fasesProcesso.inicioEstagioPrincipal : 0;
    for (var i = de; i <= lim; i++) { var v = leit(linhas[i], k); if (v !== null && LavRel_pdR2_(v) >= tMin) { primeiro[k] = i; break; } }
    if (primeiro[k] !== undefined && (iPrim < 0 || primeiro[k] < iPrim)) iPrim = primeiro[k];
  });
  var porSensor = idxAtivos.map(function(k) {
    var nome = 'S' + (k + 1), c = conf[nome] || {};
    var vals = [], tempoFaixa = 0;
    if (temFase) {
      for (var i = ini; i <= fim; i++) { var v = leit(linhas[i], k); if (v !== null) vals.push(v); }
      if (patamar) {
        for (var j = patamar.inicioIdx + 1; j <= patamar.fimIdx; j++) {
          var v0 = leit(linhas[j - 1], k), v1 = leit(linhas[j], k);
          if (v0 === null || v1 === null || linhas[j].ms === null || linhas[j - 1].ms === null) continue;
          var dentro = function(x) { return LavRel_pdR2_(x) >= tMin && (tMax === null || LavRel_pdR2_(x) <= tMax); };
          if (dentro(v0) && dentro(v1)) tempoFaixa += (linhas[j].ms - linhas[j - 1].ms) / 60000;
        }
      }
    }
    var media = vals.length ? vals.reduce(function(x, y) { return x + y; }, 0) / vals.length : null;
    var desvio = vals.length > 1 ? Math.sqrt(vals.reduce(function(x, y) { return x + (y - media) * (y - media); }, 0) / (vals.length - 1)) : null;
    var p = primeiro[k];
    return {
      sensor: nome, idx: k, n: vals.length, min: c.minTemp, max: c.maxTemp, media: c.mediaTemp, a0: termo ? c.a0 : null,
      conforme: termo && c.statusSensor ? c.statusSensor === 'CONFORME' : null, desvio: desvio, tempoFaixaMin: patamar ? tempoFaixa : null,
      primeiraHora: p !== undefined ? linhas[p].hora : '',
      atrasoSeg: (p !== undefined && iPrim >= 0 && linhas[p].ms !== null && linhas[iPrim].ms !== null) ? Math.max(0, (linhas[p].ms - linhas[iPrim].ms) / 1000) : null,
      pior: !!(termo && f.piorSensorA0 && f.piorSensorA0.sensor === nome)
    };
  });
  var fases = ((a.fasesProcesso && a.fasesProcesso.segmentos) || []).map(function(sg) {
    var mn = null, mx = null, soma = 0, n = 0, pmn = null, pmx = null;
    for (var i = sg.inicioIndice; i <= sg.fimIndice; i++) {
      idxAtivos.forEach(function(k) { var v = leit(linhas[i], k); if (v === null) return; if (mn === null || v < mn) mn = v; if (mx === null || v > mx) mx = v; soma += v; n++; });
      var pp = linhas[i].p;
      if (pp !== null && isFinite(pp)) { if (pmn === null || pp < pmn) pmn = pp; if (pmx === null || pp > pmx) pmx = pp; }
    }
    var a0r = linhas[sg.inicioIndice], a1r = linhas[sg.fimIndice];
    return { codigo: sg.codigo, nome: sg.nome, ini: sg.inicioIndice, fim: sg.fimIndice, inicio: a0r ? a0r.hora : '', termino: a1r ? a1r.hora : '',
      duracaoMin: (a0r && a1r && a0r.ms !== null && a1r.ms !== null) ? (a1r.ms - a0r.ms) / 60000 : null, leituras: sg.fimIndice - sg.inicioIndice + 1,
      tMin: mn, tMax: mx, tMed: n ? soma / n : null, pMin: pmn, pMax: pmx, estimada: sg.estimada };
  });
  return {
    termo: termo, tz: tz, linhas: linhas, idxAtivos: idxAtivos, nInst: nInst, desloc: desloc, comPressao: comPressao,
    temFase: temFase, ini: ini, fim: fim, janelaIni: janelaIni, patamar: patamar, tProg: tProg, tMin: tMin, tMax: tMax,
    limite: f.limiteAprovacaoFinal, porSensor: porSensor, fases: fases, t0: linhas.length ? linhas[0].ms : null, iPrimeiro: iPrim,
    dtSeg: isFinite(a.deltaMinutosEstimado) ? a.deltaMinutosEstimado * 60 : null,
    memoriaA0: a.memoriaA0PorSensor || [], analise: a, fatos: f
  };
}

/** Mapa dos sensores na fase: do mais frio ao mais quente pela média, com mínima–máxima e o A0 (termo). */
function LavRel_pdGraficoMapa_(D, largura) {
  var lista = (D.porSensor || []).filter(function(i) { return isFinite(i.min) && isFinite(i.max) && isFinite(i.media) && i.min !== null; })
    .slice().sort(function(a, b) { return a.media - b.media || a.min - b.min; });
  if (!lista.length) return '';
  var W = largura || 1000, linha = 19, mT = 30, mB = 34, mL = 118, mR = 190;
  var H = mT + mB + lista.length * linha;
  var vmin = Math.min.apply(null, lista.map(function(i) { return i.min; }).concat([D.tMin])), vmax = Math.max.apply(null, lista.map(function(i) { return i.max; }));
  if (D.tMax !== null && isFinite(D.tMax) && D.tMax < vmax + 1.5) vmax = Math.max(vmax, D.tMax);
  var passo = SGO_DocA4_passo_(vmax - vmin + 0.4, 8);
  var x0 = Math.floor((vmin - passo * 0.3) / passo) * passo, x1 = Math.ceil((vmax + passo * 0.3) / passo) * passo;
  var pw = W - mL - mR;
  function X(v) { return mL + (v - x0) / (x1 - x0) * pw; }
  var f1 = AutoRel_pdF1_, esc = LavRel_pdE_;
  var casas = passo < 0.1 ? 2 : (passo < 1 ? 1 : 0);
  var s = [];
  s.push('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '" font-family="Arial, Helvetica, sans-serif" font-size="10">');
  s.push('<rect x="0" y="0" width="' + W + '" height="' + H + '" fill="#ffffff"/>');
  var tTopo = (D.tMax !== null && isFinite(D.tMax)) ? D.tMax : x1;
  var a = Math.max(mL, X(D.tMin)), b = Math.min(mL + pw, X(tTopo));
  if (b > a) s.push('<rect x="' + f1(a) + '" y="' + (mT - 6) + '" width="' + f1(b - a) + '" height="' + (lista.length * linha + 6) + '" fill="#e3f2e8"/>');
  s.push('<text x="' + f1(Math.max(mL + 2, X(D.tMin) + 3)) + '" y="' + (mT - 11) + '" fill="#1d6b3f" font-size="9">' + esc(D.termo ? (D.tMax !== null && isFinite(D.tMax) ? 'Faixa de referência ' : 'Temperatura programada ') + SGO_DocA4_val_(D.tProg, 1, '°C') + (D.tMax !== null && isFinite(D.tMax) ? ' a ' + SGO_DocA4_val_(D.tMax, 1, '°C') : ' ou mais') : 'Tolerância ' + SGO_DocA4_val_(D.tMin, 1, '°C') + ' a ' + SGO_DocA4_val_(D.tMax, 1, '°C')) + '</text>');
  for (var v = x0; v <= x1 + passo / 2; v += passo) {
    var xx = X(v);
    s.push('<line x1="' + f1(xx) + '" y1="' + (mT - 6) + '" x2="' + f1(xx) + '" y2="' + (mT + lista.length * linha) + '" stroke="#e1e6ec" stroke-width="0.7"/>');
    s.push('<text x="' + f1(xx) + '" y="' + (mT + lista.length * linha + 14) + '" text-anchor="middle" fill="#3e4c59">' + esc(SGO_DocA4_num_(v, casas)) + '</text>');
  }
  s.push('<text x="' + f1(mL + pw / 2) + '" y="' + (H - 4) + '" text-anchor="middle" fill="#1f2933">Temperatura na fase ' + (D.termo ? 'de desinfecção' : 'do banho') + ' (°C)</text>');
  if (D.termo) s.push('<text x="' + (W - 8) + '" y="' + (mT - 11) + '" text-anchor="end" fill="#3e4c59" font-size="9">A0 do sensor</text>');
  lista.forEach(function(it, k) {
    var y = mT + k * linha + linha / 2;
    var cor = it.conforme === false ? '#a61b1b' : (k === 0 ? '#1f5fa8' : (k === lista.length - 1 ? '#c2410c' : '#52606d'));
    var marca = lista.length > 1 ? (k === 0 ? ' — mais frio' : (k === lista.length - 1 ? ' — mais quente' : '')) : '';
    s.push('<text x="' + (mL - 8) + '" y="' + f1(y + 3.5) + '" text-anchor="end" fill="#1f2933"' + (marca ? ' font-weight="700"' : '') + '>' + esc(it.sensor + marca) + '</text>');
    s.push('<line x1="' + f1(X(it.min)) + '" y1="' + f1(y) + '" x2="' + f1(X(it.max)) + '" y2="' + f1(y) + '" stroke="' + cor + '" stroke-width="5" stroke-linecap="round" stroke-opacity="0.55"/>');
    s.push('<circle cx="' + f1(X(it.media)) + '" cy="' + f1(y) + '" r="3.6" fill="' + cor + '" stroke="#ffffff" stroke-width="1"/>');
    s.push('<text x="' + f1(mL + pw + 10) + '" y="' + f1(y + 3.5) + '" fill="#3e4c59" font-size="9">' + esc(SGO_DocA4_num_(it.min, 2) + ' / ' + SGO_DocA4_num_(it.media, 2) + ' / ' + SGO_DocA4_num_(it.max, 2)) + '</text>');
    if (D.termo) s.push('<text x="' + (W - 8) + '" y="' + f1(y + 3.5) + '" text-anchor="end" fill="' + (it.conforme === false ? '#a61b1b' : '#1f2933') + '" font-weight="700">' + esc(isFinite(it.a0) && it.a0 !== null ? SGO_DocA4_val_(it.a0, 0, 's') : '—') + '</text>');
  });
  s.push('<text x="' + f1(mL + pw + 10) + '" y="' + (mT - 11) + '" fill="#3e4c59" font-size="9">mín. / média / máx.</text>');
  s.push('</svg>');
  return s.join('');
}

/** Nome curto da fase (na ultrassônica a primeira etapa é o pré-enxágue). */
function LavRel_pdFaseCurta_(codigo, termo) { return (!termo && codigo === 'PRE_LAVAGEM') ? 'Pré-enxágue' : (LAVREL_PD_FASE_CURTA[codigo] || ''); }

var LAVREL_PD_COR_FASE = {
  PRE_LAVAGEM: '#d6e4f5', LAVAGEM_AQUECIMENTO: '#cfe0f3', ENXAGUE_INTERMEDIARIO: '#f6ecc4', AQUECIMENTO_DESINFECCAO: '#fbe6c8', AQUECIMENTO_BANHO: '#fbe6c8',
  DESINFECCAO_TERMICA: '#d4ecdc', CAVITACAO_ULTRASSOM: '#d4ecdc', SECAGEM_RESFRIAMENTO: '#e7def2', DRENAGEM_FINAL: '#e7def2', PREPARO_INCOMPLETO: '#eef1f4'
};

/** Figuras do ciclo. Devolve [{svg, legenda, largura:'cheia'|'meia'}]. */
function LavRel_pdFiguras_(D) {
  var figs = [];
  var L = D.linhas, tz = D.tz, t0 = D.t0;
  if (!L.length || t0 === null) return figs;
  function x(l) { return (l.ms - t0) / 60000; }
  var nome = function(k) { return 'S' + (k + 1); };
  var fases = D.fases.map(function(fz) {
    var a = L[fz.ini], b = L[fz.fim < L.length - 1 ? fz.fim + 1 : fz.fim];
    return { x0: x(a), x1: x(b), cor: LAVREL_PD_COR_FASE[fz.codigo] || '#eef1f4', rotulo: LavRel_pdFaseCurta_(fz.codigo, D.termo), curto: '' };
  });
  var series = D.idxAtivos.map(function(k) {
    return { nome: nome(k), cor: SGO_DocA4_corSerie_(k), pontos: L.filter(function(l) { return l.ms !== null && l.t[k] !== null; }).map(function(l) { return [x(l), l.t[k]]; }) };
  });
  var refs = [{ y: D.tProg, rotulo: 'Programada ' + SGO_DocA4_val_(D.tProg, 1, '°C'), cor: '#1f5fa8' }];
  if (D.termo && isFinite(D.fatos.tLimiteA0)) refs.push({ y: D.fatos.tLimiteA0, rotulo: 'Início da soma do A0 ' + SGO_DocA4_val_(D.fatos.tLimiteA0, 0, '°C') });
  var g1 = AutoRel_pdGraficoLinhas_({ largura: 1000, altura: 400, series: series, t0Ms: t0, tz: tz, fases: fases, referencias: refs, rotuloX: 'Horário', rotuloY: 'Temperatura (°C)' });
  if (g1.svg) figs.push({ largura: 'cheia', svg: g1.svg, legenda: 'Perfil térmico do ciclo: temperatura de cada sensor ativo ao longo do registro, com as fases na faixa colorida acima do gráfico (' + D.fases.map(function(fz) { return fz.nome.toLowerCase(); }).join(', ') + '). Só a fase ' + (D.termo ? 'de desinfecção' : 'do banho') + ' decide; as demais são estimadas pelo perfil.' + SGO_DocA4_notaCorte_(g1, '°C') });

  if (D.temFase) {
    var i0 = Math.max(0, D.janelaIni - 4), i1 = Math.min(L.length - 1, D.fim + 4);
    var fat = L.slice(i0, i1 + 1).filter(function(l) { return l.ms !== null; });
    var sp = D.idxAtivos.map(function(k) { return { nome: nome(k), cor: SGO_DocA4_corSerie_(k), pontos: fat.filter(function(l) { return l.t[k] !== null; }).map(function(l) { return [x(l), l.t[k]]; }) }; });
    var refsP = [{ y: D.tMin, rotulo: (D.termo ? 'Programada ' : 'Mínima ') + SGO_DocA4_val_(D.tMin, 1, '°C'), cor: '#1d6b3f' }];
    if (D.tMax !== null && isFinite(D.tMax)) refsP.push({ y: D.tMax, rotulo: (D.termo ? 'Referência superior ' : 'Máxima ') + SGO_DocA4_val_(D.tMax, 1, '°C'), cor: '#1d6b3f' });
    var vmin = Infinity, vmax = -Infinity;
    sp.forEach(function(s) { s.pontos.forEach(function(p) { if (p[1] < vmin) vmin = p[1]; if (p[1] > vmax) vmax = p[1]; }); });
    var g2 = AutoRel_pdGraficoLinhas_({ largura: 520, altura: 530, series: sp, t0Ms: t0, tz: tz, ticksX: 6,
      faixaY: (D.tMax !== null && isFinite(D.tMax)) ? { y0: D.tMin, y1: D.tMax, cor: '#e3f2e8' } : null,
      destaqueX: D.patamar ? { x0: x(L[D.patamar.inicioIdx]), x1: x(L[D.patamar.fimIdx]), cor: '#f4f8fd' } : null,
      yMin: D.termo ? Math.max(vmin, (isFinite(D.fatos.tLimiteA0) ? D.fatos.tLimiteA0 : D.tMin) - 2) - 0.3 : Math.max(vmin, D.tMin - 3) - 0.3,
      referencias: refsP, rotuloX: 'Horário', rotuloY: 'Temperatura (°C)', legendaPorLinha: Math.min(6, sp.length) });
    if (g2.svg) figs.push({ largura: 'meia', svg: g2.svg, legenda: 'Detalhe da fase ' + (D.termo ? 'de desinfecção, com o aquecimento a partir de ' + SGO_DocA4_val_(D.fatos.tLimiteA0, 0, '°C') : 'do banho') + (D.tMax !== null && isFinite(D.tMax) ? ' e a faixa de referência (verde, de ' + SGO_DocA4_val_(D.tMin, 1, '°C') + ' a ' + SGO_DocA4_val_(D.tMax, 1, '°C') + ')' : '') + (D.patamar ? '; o fundo azul-claro marca o patamar (' + D.patamar.inicio.replace(/^.* /, '') + ' a ' + D.patamar.fim.replace(/^.* /, '') + ').' : '.') });

    if (D.termo) {
      var tA = L[D.janelaIni].ms;
      var sf = [];
      D.idxAtivos.forEach(function(k) {
        var mem = D.memoriaA0[k];
        if (mem && mem.length) sf.push({ nome: nome(k), cor: SGO_DocA4_corSerie_(k), pontos: mem.map(function(m) { return [(m.ms - tA) / 60000, m.acumulado]; }) });
      });
      var g3 = AutoRel_pdGraficoLinhas_({ largura: 520, altura: 530, series: sf, eixoNumerico: true, formatarX: function(v) { return SGO_DocA4_num_(v, v % 1 ? 1 : 0); },
        yMin: 0, casasY: 0, referencias: [{ y: D.limite, rotulo: 'A0 mínimo ' + SGO_DocA4_val_(D.limite, 0, 's') }], rotuloX: 'Tempo desde o início da soma do A0 (min)', rotuloY: 'A0 acumulado (s)', legendaPorLinha: Math.min(6, sf.length) });
      if (g3.svg) figs.push({ largura: 'meia', svg: g3.svg, legenda: 'A0 acumulado por sensor (regra dos trapézios com o intervalo real entre as leituras), com o mínimo exigido (linha tracejada).' });
    }
  }

  if (D.comPressao) {
    var ptsP = L.filter(function(l) { return l.ms !== null && l.p !== null; }).map(function(l) { return [x(l), l.p]; });
    if (ptsP.length >= 10) {
      var g4 = AutoRel_pdGraficoLinhas_({ largura: 520, altura: 530, series: [{ nome: 'Pressão registrada', cor: '#0f6f8d', pontos: ptsP, largura: 1.5 }], t0Ms: t0, tz: tz, ticksX: 6, fases: fases, casasY: 2, rotuloX: 'Horário', rotuloY: 'Pressão (unidade do registrador)', legendaPorLinha: 1 });
      if (g4.svg) figs.push({ largura: 'meia', svg: g4.svg, legenda: 'Pressão registrada ao longo do ciclo, apresentada para informação (sem critério de aceitação), com as fases do perfil térmico.' });
    }
  }

  if (D.temFase) {
    var mapa = LavRel_pdGraficoMapa_(D, 1000);
    if (mapa) figs.push({ largura: 'cheia', svg: mapa, legenda: 'Mapa dos sensores na fase ' + (D.termo ? 'de desinfecção' : 'do banho') + ', do mais frio ao mais quente pela temperatura média: barra da mínima à máxima e ponto na média' + (D.termo ? '; A0 de cada sensor à direita.' : '.') });
  }
  return figs;
}

function LavRel_pdCapa_(doc, ctx, D, aprovacao, minuta, aviso) {
  var id = ctx.identificacao;
  var esc = LavRel_pdE_;
  var ficha = [
    ['Cliente', id.cliente], ['CNPJ', id.cnpj || '—'],
    ['Unidade / setor', id.setor || '—'], ['Equipamento', id.equipamentoTipo + (id.tag ? ' — TAG ' + id.tag : '')],
    ['Nº de série', id.numeroSerie || '—'], ['Programa', id.programa || '—'],
    ['Fabricante (marca)', id.marca || '—'], ['Modelo', id.modelo || '—'],
    ['Ensaio', LavRel_lvTextoTipoEnsaio_(id.tipoEnsaio) + ' — ' + String(ctx.equipamentoLabel || '').toLowerCase(), { largo: true }],
    ['Ciclo nº', id.cicloNumero || '—'], ['Data do ensaio', id.dataDoEnsaio || '—'],
    ['Lote', id.lote || '—'], ['Técnico executor', id.tecnicoExecutor || '—'],
    ['Responsável técnico', aprovacao ? aprovacao.nome : (minuta ? 'Aguardando aprovação' : '—')],
    ['Documento', doc.rotuloNumero + ' ' + doc.numero + ' · Revisão ' + SGO_DocA4_revisao_(doc.revisao), { largo: true }]
  ];
  var regs = (ctx.registradores && ctx.registradores.itens) || [];
  var tabReg = regs.length ? SGO_DocA4_tabelaPadroes_(regs, { unidade: '°C' })
    : '<p class="nota">Registrador não informado.</p>';
  return '<section class="capa"><div class="logo"><img src="' + SGO_DocA4_logoDataUri_() + '" alt="Metrolabs"></div>' +
    (aviso ? '<div class="aviso-simulado" style="margin:5mm 0 0">' + esc(aviso) + '</div>' : '') +
    '<div class="pd-capa-corpo"><div class="pd-capa-esq">' +
    '<p class="tipo">Qualificação térmica — dados do ensaio</p>' +
    '<h1>' + esc(doc.titulo) + '</h1>' +
    '<p class="sub">' + esc(doc.subtitulo) + '</p>' +
    SGO_DocA4_tabelaIdent_(ficha, 'ficha') +
    '</div><div class="pd-capa-dir">' +
    SGO_DocA4_quadroResultado_({ status: ctx.statusConsolidado, rotulo: 'Resultado do ensaio', texto: ctx.resumoResultado }) +
    '<h4>Registrador de dados e rastreabilidade</h4>' + tabReg +
    '<p class="nota">U95: incerteza expandida do certificado de calibração do registrador (cadastro de padrões da empresa executante), usada na seção de incerteza.</p>' +
    '</div></div>' +
    '<div class="pe"><p>' + esc(((doc.empresa || {}).nome || '') + ((doc.empresa || {}).cnpj ? ' · CNPJ ' + doc.empresa.cnpj : '')) + '</p>' +
    '<p>' + esc(doc.rotuloNumero + ' ' + doc.numero + ' · Revisão ' + SGO_DocA4_revisao_(doc.revisao)) + '</p></div></section>';
}

function LavRel_pdSituacao_(c) {
  if (c.naoAvaliado) return { html: '<span class="info-txt">Não avaliado</span>', cls: 'cen sit' };
  if (c.informativo) return { html: '<span class="info-txt">Informativo</span>', cls: 'cen sit' };
  if (c.conforme === false && !c.decisivo) return { html: '<span class="info-txt">Fora da referência (não decide)</span>', cls: 'cen sit' };
  return Object.assign(SGO_DocA4_celSituacao_(c.conforme), { cls: 'cen sit' });
}

function LavRel_pdCorpo_(ctx, D, op) {
  var esc = LavRel_pdE_, n = LavRel_pdN_, val = LavRel_pdV_;
  var f = D.fatos, L = D.linhas;
  var h = [];
  var nTab = { n: 0 }, nFig = { n: 0 };
  function tab(txt) { nTab.n++; return SGO_DocA4_legendaTabela_(nTab.n, txt); }
  var nomeFase = D.termo ? 'fase de desinfecção' : 'fase do banho';

  // 1. Quadro-resumo
  h.push('<section class="pd-secao"><h2>1. Quadro-resumo dos resultados</h2>');
  h.push('<p>Cada critério avaliado pelo sistema neste ensaio, com o valor medido, o critério configurado, o tipo (decisivo ou informativo) e a fonte técnica. O resultado está na capa; o detalhamento está nas seções 3 a 5 e as leituras, na seção 8 e no Anexo A.</p>');
  h.push('<div class="manter">' + tab('Verificação dos critérios de aceitação'));
  h.push(SGO_DocA4_tabela_([{ t: 'Critério' }, { t: 'Critério de aceitação' }, { t: 'Valor medido' }, { t: 'Tipo', cls: 'cen' }, { t: 'Fonte do critério' }, { t: 'Situação', cls: 'cen' }],
    (ctx.criterios || []).map(function(c) { return [c.criterio, c.requisito, c.obtido, { t: c.decisivo ? 'Decisivo' : 'Informativo', cls: 'cen' }, c.referencia || '—', LavRel_pdSituacao_(c)]; }), { classe: 'pd-resumo' }) + '</div>');
  h.push('<p class="nota">Só os critérios decisivos aprovam ou reprovam o ensaio. Critério não avaliado ou informativo é registrado sem efeito no resultado. A regra de decisão está na seção 2.2.</p>');
  h.push('</section>');

  // 2. Condições
  h.push('<section class="pd-secao"><h2>2. Condições do ensaio</h2>');
  var params = (ctx.parametros || []).slice();
  params.push(['Leituras registradas', String(L.length) + (L.length ? ' (de ' + L[0].hora + ' a ' + L[L.length - 1].hora + ')' : '')]);
  params.push(['Duração total do registro', val(f.tempoTotalMinutos, 2, 'min')]);
  h.push('<h3>2.1 Parâmetros</h3>' + SGO_DocA4_tabelaIdent_(params, '', { porLinha: 3 }));
  h.push('<h3>2.2 Escopo e limitações</h3>' + LavRel_listaA4_(ctx.escopo || []));
  h.push('<h3>2.3 Referências normativas</h3>' + LavRel_listaA4_(ctx.normas || []));
  h.push('</section>');

  // 3. Por sensor e por fase
  h.push('<section class="pd-secao"><h2>3. Resultados por sensor e por fase do ciclo</h2>');
  h.push('<h3>3.1 Por sensor (' + nomeFase + ')</h3>');
  if (D.porSensor.length && D.temFase) {
    h.push('<div class="manter">' + tab('Estatísticas de cada sensor ativo na ' + nomeFase + ' (' + (L[D.ini] ? L[D.ini].hora : '—') + ' a ' + (L[D.fim] ? L[D.fim].hora : '—') + ')'));
    var cols = [{ t: 'Sensor' }, { t: 'Leituras', cls: 'num' }, { t: 'Mínima (°C)', cls: 'num' }, { t: 'Máxima (°C)', cls: 'num' }, { t: 'Média (°C)', cls: 'num' }, { t: 'Desvio-padrão (°C)', cls: 'num' },
      { t: 'Tempo na faixa no patamar (min)', cls: 'num' }, { t: 'Atingiu ' + n(D.tMin, 1) + ' °C às', cls: 'cen' }, { t: 'Diferença para o primeiro (s)', cls: 'num' }];
    if (D.termo) cols.push({ t: 'A0 (s)', cls: 'num' }, { t: 'A0 × mínimo', cls: 'cen' });
    h.push(SGO_DocA4_tabela_(cols, D.porSensor.map(function(s) {
      var l = [s.sensor + (s.pior ? ' (pior A0)' : ''), String(s.n), val(s.min, 2), val(s.max, 2), val(s.media, 2), val(s.desvio, 2), val(s.tempoFaixaMin, 2), { t: s.primeiraHora || '—', cls: 'cen' }, s.atrasoSeg === null ? '—' : n(s.atrasoSeg, 0)];
      if (D.termo) l.push(val(s.a0, 2), Object.assign(SGO_DocA4_celSituacao_(s.conforme, 'Atende', 'Abaixo do mínimo'), { cls: 'cen sit' }));
      return l;
    }), { classe: 'pd-sens' + (D.porSensor.length > 12 ? ' compacta' : '') }) + '</div>');
    h.push('<p class="nota">Mínima, máxima, média' + (D.termo ? ' e A0' : '') + ' são os valores do cálculo do ensaio (os mesmos do relatório de ensaio). Desvio-padrão amostral das leituras da fase. Tempo na faixa: soma dos intervalos do patamar com as duas leituras ' +
      (D.termo ? 'a partir de ' + esc(val(D.tMin, 1, '°C')) + (D.tMax !== null && isFinite(D.tMax) ? ' e até ' + esc(val(D.tMax, 1, '°C')) : '') : 'entre ' + esc(val(D.tMin, 1, '°C')) + ' e ' + esc(val(D.tMax, 1, '°C'))) + '. Diferença para o primeiro: tempo entre o primeiro sensor e este sensor atingirem ' + esc(val(D.tMin, 1, '°C')) + '.' +
      (f.sensoresDesabilitados && f.sensoresDesabilitados.length ? ' Sensores desconsiderados pelo técnico: ' + esc(f.sensoresDesabilitados.join(', ')) + '.' : '') + '</p>');
  } else {
    h.push('<p>A ' + nomeFase + ' não foi identificada nos dados; não há estatísticas por sensor. As leituras estão no Anexo A.</p>');
  }
  h.push('<h3>3.2 Por fase do ciclo</h3>');
  h.push('<div class="manter">' + tab('Fases identificadas no registro, com a temperatura dos sensores ativos'));
  var colsFase = [{ t: 'Fase' }, { t: 'Início', cls: 'cen' }, { t: 'Término', cls: 'cen' }, { t: 'Duração (min)', cls: 'num' }, { t: 'Leituras', cls: 'num' }, { t: 'Temp. mínima (°C)', cls: 'num' }, { t: 'Temp. máxima (°C)', cls: 'num' }, { t: 'Temp. média (°C)', cls: 'num' }, { t: 'Identificação', cls: 'cen' }];
  if (D.comPressao) colsFase.push({ t: 'Pressão mín.', cls: 'num' }, { t: 'Pressão máx.', cls: 'num' });
  h.push(SGO_DocA4_tabela_(colsFase, D.fases.map(function(fz) {
    var l = [fz.nome, { t: fz.inicio, cls: 'cen' }, { t: fz.termino, cls: 'cen' }, val(fz.duracaoMin, 2), String(fz.leituras), val(fz.tMin, 2), val(fz.tMax, 2), val(fz.tMed, 2), { t: fz.estimada ? 'Estimada' : 'Decide', cls: 'cen' }];
    if (D.comPressao) l.push(val(fz.pMin, 3), val(fz.pMax, 3));
    return l;
  }), { classe: 'pd-fases' }) + '</div>');
  h.push('<p class="nota">Fases pelo perfil da temperatura média: cada queda brusca (água nova) abre uma etapa; os horários das etapas estimadas são aproximados.' + (D.patamar ? ' Patamar avaliado: de ' + esc(D.patamar.inicio.replace(/^.* /, '')) + ' a ' + esc(D.patamar.fim.replace(/^.* /, '')) + ' (' + esc(val(D.patamar.duracaoMin, 2, 'min')) + ', ' + D.patamar.leituras + ' leituras).' : '') + '</p>');
  h.push('</section>');

  // 4. Gráficos
  var figs = LavRel_pdFiguras_(D);
  h.push('<section class="pd-folha-fig"><h2>4. Gráficos</h2>');
  if (!figs.length) h.push('<p class="nota">Não há leituras com horário suficientes para os gráficos.</p>');
  else h.push(AutoRel_pdFolhasFiguras_(figs, nFig).replace(/<div class="(pd-cheia|pd-duas)">/g, function(m, c, off) { return off === 0 ? m : '<div class="' + c + ' pd-nova">'; }));
  h.push('</section>');

  // 5. Memória de cálculo
  h.push('<section class="pd-secao"><h2>5. Memória de cálculo</h2>');
  var nSub = 0;
  if (D.termo && D.temFase) {
    nSub++;
    h.push('<h3>5.' + nSub + ' Letalidade térmica (A0)</h3>');
    h.push('<p>O A<sub>0</sub> é o tempo equivalente, em segundos a 80 °C, do efeito letal do calor úmido na fase de desinfecção. Para cada sensor ativo, somam-se os intervalos entre leituras consecutivas pela regra dos trapézios, com o intervalo real entre as leituras:</p>');
    h.push('<p class="formula">A<sub>0</sub> = Σ ½ · [L(T<sub>i−1</sub>) + L(T<sub>i</sub>)] · Δt<sub>i</sub>, &nbsp; com &nbsp; L(T) = 10<sup>(T − 80) / z</sup> &nbsp; (L = 0 abaixo de ' + esc(val(f.tLimiteA0, 0, '°C')) + ')</p>');
    h.push('<p>z = ' + esc(val(f.z, 0, '°C')) + ' e Δt<sub>i</sub> em segundos (intervalo típico deste registro: ' + esc(val(D.dtSeg, 0, 's')) + '). A soma começa na primeira leitura do aquecimento a ' + esc(val(f.tLimiteA0, 0, '°C')) + ' ou mais e termina no fim do patamar; a descida e a secagem não entram. Intervalo maior que o permitido não soma e impede a emissão.</p>');
    var piorK = D.porSensor.filter(function(s) { return s.pior; })[0];
    var mem = piorK ? (D.memoriaA0[piorK.idx] || []) : [];
    if (mem.length >= 2) {
      var k1 = mem.length > 1 ? 1 : 0, m1 = mem[k1], m0 = mem[k1 - 1];
      h.push('<div class="pd-passo"><p><b>Exemplo passo a passo — primeiro intervalo do sensor ' + esc(piorK.sensor) + ' (menor A0)</b></p>' +
        '<p class="eq">L(' + n(m0.temperatura, 2) + ') = ' + (m0.fator > 0 ? '10<sup>(' + n(m0.temperatura, 2) + ' − 80) / ' + n(f.z, 0) + '</sup> = ' + n(m0.fator, 4) : '0 (abaixo de ' + n(f.tLimiteA0, 0) + ' °C)') + '</p>' +
        '<p class="eq">L(' + n(m1.temperatura, 2) + ') = ' + (m1.fator > 0 ? '10<sup>' + n((m1.temperatura - 80) / f.z, 4) + '</sup> = ' + n(m1.fator, 4) : '0') + '</p>' +
        '<p class="eq">Δt = ' + n(m1.dtSeg, 0) + ' s &nbsp;→&nbsp; contribuição = ½ · (' + n(m0.fator, 4) + ' + ' + n(m1.fator, 4) + ') · ' + n(m1.dtSeg, 0) + ' = ' + n(m1.contribuicao, 2) + ' s</p>' +
        '<p>Somando as ' + (mem.length - 1) + ' contribuições das ' + mem.length + ' leituras: A<sub>0</sub>(' + esc(piorK.sensor) + ') = ' + esc(val(piorK.a0, 2, 's')) + '.</p></div>');
      var amostra = mem.length > 8 ? mem.slice(0, 5).concat([null]).concat(mem.slice(-2)) : mem;
      h.push('<div class="manter">' + tab('Primeiras e últimas leituras do cálculo do A0 do sensor ' + piorK.sensor));
      h.push(SGO_DocA4_tabela_([{ t: 'Horário', cls: 'cen' }, { t: 'Temperatura (°C)', cls: 'num' }, { t: 'Taxa letal L', cls: 'num' }, { t: 'Δt (s)', cls: 'num' }, { t: 'Contribuição (s)', cls: 'num' }, { t: 'A0 acumulado (s)', cls: 'num' }],
        amostra.map(function(r) {
          if (!r) return [{ html: '<i>' + (mem.length - 7) + ' leituras intermediárias (todas na seção 8)</i>', cls: 'cen' }, '', '', '', '', ''];
          return [{ t: LavRel_lvSoHora_(r.tempoStr), cls: 'cen' }, n(r.temperatura, 2), n(r.fator, 4), n(r.dtSeg || 0, 0), n(r.contribuicao, 2), n(r.acumulado, 2)];
        }), { classe: 'compacta' }) + '</div>');
    }
    h.push('<div class="manter">' + tab('A0 de cada sensor ativo'));
    h.push(SGO_DocA4_tabela_([{ t: 'Sensor' }, { t: 'Leituras na janela', cls: 'num' }, { t: 'Tempo integrado Σ Δt (s)', cls: 'num' }, { t: 'A0 (s)', cls: 'num' }, { t: 'Múltiplo do mínimo exigido', cls: 'num' }],
      D.porSensor.map(function(s) {
        var m = D.memoriaA0[s.idx] || [];
        var soma = m.reduce(function(x, r) { return x + (r.dtSeg || 0); }, 0);
        return [s.sensor + (s.pior ? ' (pior)' : ''), String(m.length), n(soma, 0), val(s.a0, 2), (D.limite > 0 && isFinite(s.a0)) ? n(s.a0 / D.limite, 2) + '×' : '—'];
      }), { classe: D.porSensor.length > 12 ? 'compacta' : '' }) + '</div>');
  }
  if (!D.termo && D.temFase && D.patamar) {
    nSub++;
    h.push('<div class="manter"><h3>5.' + nSub + ' Tempo e temperatura do banho</h3>');
    h.push('<p>O patamar do banho vai da primeira leitura com todos os sensores dentro da tolerância (' + esc(val(D.tMin, 1, '°C')) + ' a ' + esc(val(D.tMax, 1, '°C')) + ') até a última nessa condição. O tempo no patamar é a diferença entre os horários dessas leituras:</p>');
    h.push('<div class="pd-passo"><p class="eq">tempo = ' + esc(D.patamar.fim.replace(/^.* /, '')) + ' − ' + esc(D.patamar.inicio.replace(/^.* /, '')) + ' = ' + n(D.patamar.duracaoMin, 2) + ' min &nbsp; (mínimo: ' + n(D.limite, 0) + ' min)</p></div></div>');
  }
  nSub++;
  h.push('<div class="manter"><h3>5.' + nSub + ' Incerteza de medição</h3>');
  var inc = f.incertezaA0;
  if (D.termo && inc && D.temFase) {
    var casasU = AutoRel_pdCasasIncerteza_(inc.uA0);
    var uArr = Math.round(inc.uA0 * Math.pow(10, casasU)) / Math.pow(10, casasU);
    h.push('<p>A incerteza expandida da temperatura é a do certificado de calibração do registrador (a maior entre os registradores usados): U(T) = ' + esc(val(inc.uTemperatura, 2, '°C')) + ' (k = 2). Ela é propagada ao A<sub>0</sub> do pior sensor como erro constante de temperatura (aproximação de primeira ordem):</p>');
    h.push('<p class="formula">U(A<sub>0</sub>) ≈ A<sub>0</sub> · ln 10 / z · U(T)</p>');
    h.push('<div class="pd-passo"><p class="eq">U(A<sub>0</sub>) = ' + n(f.minA0, 2) + ' · 2,3026 / ' + n(f.z, 0) + ' · ' + n(inc.uTemperatura, 2) + ' = ' + n(inc.uA0, 2) + ' s (' + n(inc.relativo, 1) + ' % do valor)</p>' +
      '<p>Resultado declarado do pior sensor' + (f.piorSensorA0 ? ' (' + esc(f.piorSensorA0.sensor) + ')' : '') + ': <b>A<sub>0</sub> = (' + n(f.minA0, casasU) + ' ± ' + n(uArr, casasU) + ') s</b>, k = 2, com a incerteza em dois algarismos significativos. Mínimo exigido: ' + esc(val(D.limite, 0, 's')) + '.</p></div>');
  } else if (D.termo && D.temFase) {
    h.push('<p>A incerteza do registrador não está informada no cadastro de padrões; a incerteza do A<sub>0</sub> não pôde ser estimada. Para estimá-la, informe a incerteza expandida (U95) do certificado em Cadastros › Padrões de referência.</p>');
  } else {
    h.push('<p>A incerteza expandida da temperatura é a do certificado de calibração do registrador (capa). ' + (D.termo ? 'Sem fase de desinfecção identificada não há A<sub>0</sub> a declarar com incerteza.' : 'A tolerância do banho é comparada diretamente às leituras (regra de decisão na seção 2.2).') + '</p>');
  }
  h.push('</div></section>');

  // 6, 7: não conformidades e responsabilidade
  var e = ctx.estudos[0];
  var ncs = e.motivosReprovacao || [];
  var obs = [].concat(e.alertasAnalise || [], e.observacoesAnalise || [], (ctx.registradores && ctx.registradores.observacoes) || []);
  h.push('<section class="pd-secao"><h2>6. Não conformidades e observações</h2>' +
    '<h3>6.1 Não conformidades</h3>' + (ncs.length ? LavRel_listaA4_(ncs) : '<p>Nenhuma não conformidade foi registrada neste ensaio.</p>') +
    '<h3>6.2 Observações</h3>' + (obs.length ? LavRel_listaA4_(obs) : '<p>Sem observações adicionais.</p>'));
  var id = ctx.identificacao;
  var resp = '<div class="manter"><h2>7. Responsabilidade técnica</h2><p>Este documento reúne os dados do registrador e os cálculos do ensaio identificado na capa e acompanha o relatório de ensaio do mesmo número. Os resultados foram calculados pelo sistema a partir das leituras do registrador, com os critérios configurados pela empresa executante; as leituras da seção 8 e do Anexo A fazem parte deste documento. A reprodução parcial deste documento depende de autorização da empresa executante.</p>';
  if (op.aprovacao) resp += '<p><b>Revisado e aprovado para emissão por</b> ' + esc(op.aprovacao.nome || '—') + (op.aprovacao.perfil ? ' (' + esc(String(op.aprovacao.perfil).toLowerCase()) + ')' : '') + ', em ' + esc(op.aprovacao.em) + ', com registro no sistema. Revisão ' + esc(id.revisao || '0') + ' desta planilha' + (Number(id.revisao) > 0 ? '; as revisões anteriores continuam arquivadas e são substituídas por esta' : '') + '.</p>';
  else if (op.minuta) resp += '<p><b>Aguardando a aprovação do responsável técnico.</b></p>';
  h.push(resp + SGO_DocA4_assinaturas_(op.assinaturas) + '</div></section>');

  // 8. Leituras da fase + Anexo A
  var blocos = [];
  for (var b = 0; b < D.idxAtivos.length; b += 12) blocos.push(D.idxAtivos.slice(b, b + 12));
  if (!blocos.length) blocos.push([]);
  function dentroFaixa(l) { return D.patamar ? (l.i >= D.patamar.inicioIdx && l.i <= D.patamar.fimIdx) : false; }
  function colunas(bloco, ultimo, comFase) {
    var c = [{ t: 'Horário', w: '15mm' }];
    if (comFase) c.push({ t: 'Fase', w: '25mm' });
    bloco.forEach(function(k) { c.push({ t: 'S' + (k + 1) + ' (°C)' }); });
    if (ultimo) {
      if (D.comPressao) c.push({ t: 'Pressão' });
      if (!comFase) c.push({ t: 'Mínima (°C)' }, { t: 'Máxima (°C)' }, { t: 'Diferença (°C)' });
    }
    return c;
  }
  function celulas(bloco, ultimo, comFase) {
    return function(l) {
      var c = [{ t: l.hora, cls: 'cen' }];
      if (comFase) c.push({ t: LavRel_pdFaseCurta_(l.fase, D.termo) || '—', cls: '' });
      var vals = D.idxAtivos.map(function(k) { return l.t[k]; }).filter(function(v) { return v !== null && isFinite(v); });
      var mn = vals.length ? Math.min.apply(null, vals) : null, mx = vals.length ? Math.max.apply(null, vals) : null;
      bloco.forEach(function(k) {
        var v = l.t[k];
        if (v === null || !isFinite(v)) { c.push({ t: '—', cls: 'num' }); return; }
        var cls = 'num';
        if (vals.length > 1 && v === mn) cls += ' frio'; else if (vals.length > 1 && v === mx) cls += ' quente';
        if (!comFase && dentroFaixa(l) && (LavRel_pdR2_(v) < D.tMin || (D.tMax !== null && isFinite(D.tMax) && LavRel_pdR2_(v) > D.tMax))) cls += ' fora';
        c.push({ t: n(v, 2), cls: cls });
      });
      if (ultimo) {
        if (D.comPressao) c.push({ t: l.p === null ? '—' : n(l.p, 3), cls: 'num' });
        if (!comFase) c.push({ t: mn === null ? '—' : n(mn, 2), cls: 'num' }, { t: mx === null ? '—' : n(mx, 2), cls: 'num' }, { t: mn === null ? '—' : n(mx - mn, 2), cls: 'num' });
      }
      return c;
    };
  }
  var legCores = '<p class="pd-legenda-cores"><span style="background:#e7effb">azul</span>menor temperatura da linha <span style="background:#fdeee7">laranja</span>maior temperatura da linha <span style="color:#a61b1b;font-weight:700">vermelho</span>leitura do patamar fora da faixa de referência</p>';
  h.push('<section class="pd-secao"><h2>8. Leituras da ' + nomeFase + '</h2>');
  var i0 = D.termo ? D.janelaIni : D.ini;
  if (D.temFase) {
    var linhasFase = L.slice(i0, D.fim + 1);
    h.push('<p>Leituras do registrador alinhadas no tempo, ' + (D.termo ? 'da primeira leitura da janela do A<sub>0</sub> (aquecimento a partir de ' + esc(val(f.tLimiteA0, 0, '°C')) + ')' : 'do início do patamar do banho') + ' ao fim da fase (' + linhasFase.length + ' leituras)' + (D.desloc ? ', com a correção de temperatura de ' + esc(val(D.desloc, 2, '°C')) + ' aplicada' : ', sem correção') + '.' +
      (blocos.length > 1 ? ' Com ' + D.idxAtivos.length + ' sensores, a tabela é apresentada em ' + blocos.length + ' blocos de sensores; as colunas de resumo ficam no último bloco.' : '') + '</p>' + legCores);
    blocos.forEach(function(bloco, bi) {
      var ult = bi === blocos.length - 1;
      var titBloco = blocos.length > 1 ? ' — sensores S' + (bloco[0] + 1) + ' a S' + (bloco[bloco.length - 1] + 1) : '';
      var numTab = ++nTab.n;
      h.push((bi > 0 ? '<div class="pd-nova"></div>' : '') + AutoRel_pdTabelaPaginada_(linhasFase, colunas(bloco, ult, false), celulas(bloco, ult, false), {
        primeira: bi === 0 ? 32 : 36,
        titulo: function(k, tot, rows) { return '<b>Tabela ' + numTab + '</b> — Leituras da ' + esc(nomeFase) + esc(titBloco) + ' (' + esc(rows[0].hora) + ' a ' + esc(rows[rows.length - 1].hora) + ')' + (tot > 1 ? ' · folha ' + k + ' de ' + tot : ''); }
      }));
    });
  } else {
    h.push('<p>A ' + nomeFase + ' não foi identificada; todas as leituras estão no Anexo A.</p>');
  }
  h.push('</section>');
  var fora = D.temFase ? L.filter(function(l) { return l.i < i0 || l.i > D.fim; }) : L;
  if (fora.length) {
    h.push('<section class="pd-secao"><h2>Anexo A — Leituras fora da ' + nomeFase + '</h2>');
    h.push('<p>Demais leituras do registro, em formato compacto, com a fase estimada em cada leitura. ' + fora.length + ' leituras.</p>');
    blocos.forEach(function(bloco, bi) {
      var ult = bi === blocos.length - 1;
      var nCols = 2 + bloco.length + (ult && D.comPressao ? 1 : 0);
      var paineis = Math.max(1, Math.min(3, Math.floor(267 / (16 + 25 + (nCols - 2) * 12.5 + 5))));
      var numTab = ++nTab.n;
      var titBloco = blocos.length > 1 ? ' — sensores S' + (bloco[0] + 1) + ' a S' + (bloco[bloco.length - 1] + 1) : '';
      h.push((bi > 0 ? '<div class="pd-nova"></div>' : '') + AutoRel_pdTabelaPaginada_(fora, colunas(bloco, ult, true), celulas(bloco, ult, true), {
        paineis: paineis, classe: 'pd-compacta', porFolha: 40, primeira: bi === 0 ? 34 : 40,
        titulo: function(k, tot, rows) { return '<b>Tabela ' + numTab + '</b> — Leituras fora da ' + esc(nomeFase) + esc(titBloco) + ' (' + esc(rows[0].hora) + ' a ' + esc(rows[rows.length - 1].hora) + ')' + (tot > 1 ? ' · folha ' + k + ' de ' + tot : ''); }
      }));
    });
    h.push('</section>');
  }
  var m = ctx.mesclagem;
  if (m && m.sensores && m.sensores.length) {
    h.push('<section class="pd-secao"><h2>Anexo ' + (fora.length ? 'B' : 'A') + ' — Alinhamento dos registradores individuais</h2>' +
      '<p>Cada sensor foi registrado por um registrador próprio (um arquivo por sensor). As leituras foram alinhadas pela linha do tempo do ' + esc(m.referencia) + ', com tolerância de ' + esc(SGO_DocA4_val_(m.toleranciaSeg, 1, 's')) +
      ' (metade do intervalo típico). Leitura sem correspondência dentro da tolerância fica em branco e, se cair na fase avaliada, impede a emissão.</p>' +
      SGO_DocA4_tabela_([{ t: 'Sensor' }, { t: 'Leituras', cls: 'num' }, { t: 'Primeira leitura' }, { t: 'Última leitura' }, { t: 'Sem correspondência', cls: 'num' }, { t: 'Maior diferença de horário (s)', cls: 'num' }],
        m.sensores.map(function(r) { return [r.sensor, String(r.leituras), r.inicio, r.fim, String(r.semCorrespondencia), SGO_DocA4_num_(r.maiorDefasagemSeg, 0)]; })) + '</section>');
  }
  return h.join('\n');
}

/** Documento completo. op: { aprovacao | null, minuta }. */
function LavRel_pdMontarHtml_(contexto, interno, op) {
  op = op || {};
  var ctx = contexto, id = ctx.identificacao;
  var D = LavRel_pdPreparar_(ctx, interno.resultado || {});
  var numero = id.certificadoNumero || 'sem número';
  var tipo = ctx.tipoCiclo === 'ULTRASSOM' ? 'Lavadora ultrassônica' : 'Lavadora termodesinfectora';
  var doc = {
    titulo: 'Planilha de dados do ensaio — ' + tipo,
    subtitulo: 'Leituras do registrador, cálculos e gráficos de um ' + String(ctx.equipamentoLabel || '').toLowerCase() + '. Acompanha o relatório de ensaio do mesmo número.',
    tituloCurto: 'Planilha de dados do ensaio — ' + tipo.toLowerCase().replace(/^l/, 'L'),
    rotuloNumero: 'Planilha de dados nº',
    numero: numero, revisao: id.revisao, empresa: id.empresaExecutante, orientacao: 'paisagem'
  };
  var topo2 = [op.minuta ? 'MINUTA — não entregar ao cliente' : '', id.tag ? 'TAG ' + id.tag : '', id.cicloNumero ? 'Ciclo nº ' + id.cicloNumero : '', id.dataDoEnsaio || ''].filter(Boolean).join(' · ');
  var opDoc = { aprovacao: op.aprovacao || null, minuta: !!op.minuta, assinaturas: LavRel_lvListaAssinaturas_(ctx, op.aprovacao) };
  var h = [];
  h.push('<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">');
  h.push('<title>' + LavRel_pdE_(doc.titulo + ' nº ' + numero) + '</title>');
  h.push('<style>' + SGO_DocA4_estilos_(doc) + AutoRel_pdEstilosPagina_(doc, topo2) + AutoRel_pdEstilos_() + '</style></head><body>');
  h.push('<div class="barra-tela"><button type="button" onclick="window.print()">Imprimir ou salvar em PDF</button></div>');
  h.push('<main class="folha">');
  h.push('<div class="cab-tela"><img src="' + SGO_DocA4_logoDataUri_() + '" alt="Metrolabs"><div class="meta">' + LavRel_pdE_(doc.tituloCurto) + '<br>' + LavRel_pdE_(doc.rotuloNumero + ' ' + numero + ' · Revisão ' + SGO_DocA4_revisao_(doc.revisao)) + '</div></div>');
  var aviso = opDoc.minuta ? 'MINUTA PARA CONFERÊNCIA DO RESPONSÁVEL TÉCNICO — documento ainda não aprovado; não entregar ao cliente.'
    : (ctx.simulado ? 'Documento de uso interno, gerado com dados reconstituídos. Não representa ensaio real e não pode ser entregue ao cliente.' : '');
  h.push(LavRel_pdCapa_(doc, ctx, D, opDoc.aprovacao, opDoc.minuta, aviso));
  h.push(SGO_DocA4_marcadorSumario_());
  h.push(LavRel_pdCorpo_(ctx, D, opDoc));
  h.push(SGO_DocA4_fimDocumento_());
  return opDoc.minuta ? SGO_DocA4_prepararSumario_(h.join('\n')).html : h.join('\n');
}

/* ============================================================
 * API — geração, emissão e aprovação (QUALIF_EMISSOES, módulo LAVADORA_DADOS)
 * ============================================================ */

function LavRel_pdValidar_(payload) {
  var interno = {};
  var contexto = LavRel_lvMontarContextoCertificado_(payload, interno);
  if (contexto.emissaoBloqueada) LavRel_exigirSemTravas_(contexto.travas);
  return { contexto: contexto, interno: interno };
}

/** Resumo para o registro de atividade da tela (o mesmo formato do modelo anterior). */
function LavRel_pdResumoTela_(contexto, interno) {
  var a = (interno.resultado || {}).analise || {};
  return { aprovado: !!a.aprovado, statusAprovacao: a.statusAprovacao || (a.aprovado ? 'APROVADO' : 'REPROVADO'), analiseResumo: {
    minA0: a.minA0 || 0, mediaA0: a.mediaA0 || 0, maxA0: a.maxA0 || 0, piorSensorA0: a.piorSensorA0 || null, tempoCavitacao: a.tempoCavitacao || 0,
    tempoExposicaoMinutos: a.tempoExposicaoMinutos, tempoTotalMinutos: a.tempoTotalMinutos, tempoInicioExposicao: a.tempoInicioExposicao || '', tempoFimExposicao: a.tempoFimExposicao || '',
    tempoInicioCiclo: a.tempoInicioCiclo || '', tempoFimCiclo: a.tempoFimCiclo || '', quantidadeSensoresInstalados: a.quantidadeSensoresInstalados, quantidadeSensoresUtilizados: a.quantidadeSensoresUtilizados,
    sensoresUtilizados: a.sensoresUtilizados || [], sensoresDesabilitados: a.sensoresDesabilitados || [], piorSensorTemperatura: a.piorSensorTemperatura || null,
    origemJanelaCiclo: a.origemJanelaCiclo || 'AUTO', origemJanelaExposicao: a.origemJanelaExposicao || 'AUTO', configuracaoDeteccaoExposicao: a.configuracaoDeteccaoExposicao || {},
    limitesAprovacao: a.limitesAprovacao || {}, observacoesAnalise: a.observacoesAnalise || [], alertasAnalise: a.alertasAnalise || [], motivosReprovacao: a.motivosReprovacao || [],
    deltaMinutosEstimado: a.deltaMinutosEstimado || 0, faseInicioRampa: typeof a.faseInicioRampa === 'number' ? a.faseInicioRampa : -1,
    faseInicioExp: typeof a.faseInicioExp === 'number' ? a.faseInicioExp : -1, faseFimExp: typeof a.faseFimExp === 'number' ? a.faseFimExp : -1,
    fasesProcesso: a.fasesProcesso || null } };
}

function LavRel_pdRotulo_(contexto) {
  return contexto.tipoCiclo === 'ULTRASSOM' ? 'Planilha de dados Lavadora ultrassônica' : 'Planilha de dados Termodesinfectora';
}

/** Emite (aprovação registrada), salva HTML + PDF na pasta do equipamento e grava a revisão. */
function LavRel_pdEmitir_(payload, validado, sessao, idPendente) {
  var contexto = validado.contexto;
  var numero = contexto.identificacao.certificadoNumero;
  var simulado = !!payload.modoRelatorioSimulado;
  var revisao = simulado ? (parseInt(contexto.identificacao.revisao, 10) || 0) : SGO_QE_proximaRevisao_(LAVREL_MODULO_EMISSAO_DADOS, numero, contexto.identificacao.revisao);
  contexto.identificacao.revisao = String(revisao);
  var aprovacao = simulado ? null : { nome: SGO_QE_nomeSessao_(sessao), login: String((sessao && sessao.usuario) || ''), perfil: String((sessao && sessao.perfil) || ''), em: SGO_QE_agora_() };
  var html = LavRel_pdMontarHtml_(contexto, validado.interno, { aprovacao: aprovacao, minuta: false });
  var payloadSalvar = Object.assign({}, payload, { certRevisao: String(revisao) });
  var r = SGO_DocSalvar_finalizarCertificado_(html, payloadSalvar, LavRel_lvPastaLaudos_, LavRel_pdRotulo_(contexto) + (revisao ? ' rev ' + revisao : ''), LavRel_UCFG.TZ);
  if (!simulado) {
    var campos = {
      STATUS: 'EMITIDO', REVISAO: String(revisao), APROVADO_POR: aprovacao.nome, APROVADO_LOGIN: aprovacao.login, APROVADO_PERFIL: aprovacao.perfil,
      APROVADO_EM: aprovacao.em, PDF_ID: r.pdfId || '', HTML_ID: r.htmlId || '', RESULTADO: contexto.statusConsolidado
    };
    var id = idPendente;
    if (id) SGO_QE_atualizar_(id, campos);
    else id = SGO_QE_registrar_(Object.assign(LavRel_lvCamposRegistro_(contexto, payload, sessao), { MODULO: LAVREL_MODULO_EMISSAO_DADOS }, campos));
    SGO_QE_marcarSubstituidas_(LAVREL_MODULO_EMISSAO_DADOS, numero, id);
    r.emissaoId = id;
  }
  r.revisao = revisao;
  r.aprovadoPor = aprovacao ? aprovacao.nome : '';
  r.pdfNome = r.salvoNaPasta ? LavRel_pdRotulo_(contexto) + (numero ? ' - ' + numero : '') + (revisao ? ' rev ' + revisao : '') : '';
  return r;
}

/**
 * Botão "Gerar planilha de dados" (modelo novo). Responsável técnico: emite (com a confirmação);
 * demais perfis: enviam para aprovação e recebem a minuta. Relatório interno: gera sem aprovação.
 */
function LavRel_apiGerarPlanilhaDados(payload, sessao) {
  payload = payload || {};
  var validado = LavRel_pdValidar_(payload);
  var base = Object.assign({ ok: true, modeloPlanilha: 'NOVO' }, LavRel_pdResumoTela_(validado.contexto, validado.interno));
  if (payload.modoRelatorioSimulado) {
    return Object.assign(base, LavRel_pdEmitir_(payload, validado, sessao, ''), { emitido: false, mensagem: 'Planilha de dados de uso interno gerada.' });
  }
  if (LavRel_lvEhAprovador_(sessao)) {
    if (payload.confirmacaoRevisao !== true) throw new Error('Confirme que conferiu os dados do ensaio e aprova a emissão da planilha de dados (a aprovação fica registrada com o seu nome, a data e a hora).');
    var r = LavRel_pdEmitir_(payload, validado, sessao, '');
    return Object.assign(base, r, { emitido: true, mensagem: 'Planilha de dados emitida (revisão ' + r.revisao + ') e salva na pasta do equipamento, dentro da pasta do cliente.' });
  }
  var guardado = Object.assign({}, payload, { fotosCertificado: [] });
  var id = SGO_QE_registrar_(Object.assign(LavRel_lvCamposRegistro_(validado.contexto, payload, sessao), {
    MODULO: LAVREL_MODULO_EMISSAO_DADOS, STATUS: 'AGUARDANDO_APROVACAO', PAYLOAD_JSON: JSON.stringify(guardado)
  }));
  var html = LavRel_pdMontarHtml_(validado.contexto, validado.interno, { aprovacao: null, minuta: true });
  return Object.assign(base, { html: html, emitido: false, aguardandoAprovacao: true, id: id,
    mensagem: 'Planilha de dados enviada para aprovação do responsável técnico (registro ' + id + '). A minuta abriu em outra aba para conferência; o responsável técnico emite em "Aguardando aprovação".' });
}

function LavRel_pdPreverPendente_(reg, payload) {
  var validado = LavRel_pdValidar_(payload);
  if (LavRel_lvAssinatura_(validado.contexto) !== reg.HASH_CONTEXTO) throw new Error('Os dados mudaram desde o envio para aprovação (por exemplo, o cadastro do registrador). Devolva ao técnico para gerar a planilha de novo.');
  return { ok: true, html: LavRel_pdMontarHtml_(validado.contexto, validado.interno, { aprovacao: null, minuta: true }) };
}

function LavRel_pdAprovarPendente_(reg, payload, sessao) {
  var validado = LavRel_pdValidar_(payload);
  if (LavRel_lvAssinatura_(validado.contexto) !== reg.HASH_CONTEXTO) throw new Error('Os dados mudaram desde o envio para aprovação. Devolva ao técnico para gerar a planilha de novo.');
  return LavRel_pdEmitir_(payload, validado, sessao, reg.ID);
}
