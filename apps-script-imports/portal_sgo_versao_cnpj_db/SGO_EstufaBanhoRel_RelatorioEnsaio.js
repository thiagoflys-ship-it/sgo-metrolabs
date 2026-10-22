/****************************************************
 * ESTUFA, BANHO-MARIA E SECADORA — RELATÓRIO DE ENSAIO TÉRMICO (A4 RETRATO), MODELO NOVO (21/10/2026)
 *
 * Documento HTML A4 no padrão comum SGO_DocA4 (capa, sumário, cabeçalho e rodapé em todas as páginas,
 * gráficos em SVG estático), salvo em HTML + PDF na pasta do equipamento dentro da pasta do cliente.
 * Os números vêm do contexto (EstufaQ_montarContexto_, SGO_EstufaBanhoRel_Qualif.js): este arquivo
 * nunca recalcula resultado. As figuras (EstufaDoc_figuras_) também são usadas pela planilha de dados.
 ****************************************************/

/* ============================================================
 * Figuras (SVG estático)
 * ============================================================ */

function EstufaDoc_formatadorX_(t0, duracaoMin) {
  var tz = EstufaQ_tz_();
  return function (x) {
    if (t0 === null) return SGO_DocA4_num_(x, 0) + ' min';
    try { return Utilities.formatDate(new Date(t0 + x * 60000), tz, duracaoMin > 36 * 60 ? 'dd/MM HH:mm' : 'HH:mm'); } catch (e) { return SGO_DocA4_num_(x, 0); }
  };
}

/** Perfil de temperatura por sensor com a faixa de aceitação (e o trecho avaliado ou o evento sombreado). */
function EstufaDoc_figPerfil_(linhas, ctx, s, largura) {
  var ativos = [];
  var nomes = {};
  ctx.sensores.ativos.forEach(function (n) { nomes[Number(n.slice(1)) - 1] = true; });
  var n = 0;
  (linhas || []).forEach(function (r) { if (r.temperaturas && r.temperaturas.length > n) n = r.temperaturas.length; });
  for (var i = 0; i < n; i++) ativos.push(!!nomes[i]);
  var ser = SGO_DocA4_seriesTemperatura_(linhas, { sensoresAtivos: ativos, tz: EstufaQ_tz_() });
  if (!ser.series.length) return null;
  var dur = 0;
  ser.series.forEach(function (x) { var p = x.pontos; if (p.length) dur = Math.max(dur, p[p.length - 1][0]); });
  var faixasX = [];
  if (s && s.avaliadas && s.avaliadas.length && s.avaliadas.length < linhas.length && ser.t0Ms !== null) {
    var a0 = (EstufaQ_ms_(s.avaliadas[0]) - ser.t0Ms) / 60000, a1 = (EstufaQ_ms_(s.avaliadas[s.avaliadas.length - 1]) - ser.t0Ms) / 60000;
    if (s.evento) {
      var e0 = (EstufaBanhoRel_ebConverterTempoParaMs_(s.evento.inicio) - ser.t0Ms) / 60000;
      var e1 = s.evento.fim ? (EstufaBanhoRel_ebConverterTempoParaMs_(s.evento.fim) - ser.t0Ms) / 60000 : e0;
      if (isFinite(e0) && isFinite(e1)) faixasX.push({ x0: e0, x1: Math.max(e1, e0 + dur / 200), rotulo: 'Evento', cor: '#fdf1e2' });
    } else if (a0 > 0) {
      faixasX.push({ x0: 0, x1: a0, rotulo: 'Estabilização', cor: '#f3f4f6' });
    }
    void a1;
  }
  var refs = [{ y: ctx.faixa.tMin, rotulo: 'Mínima ' + SGO_DocA4_val_(ctx.faixa.tMin, 1, '°C'), cor: '#1d6b3f', tracejado: false },
    { y: ctx.faixa.tMax, rotulo: 'Máxima ' + SGO_DocA4_val_(ctx.faixa.tMax, 1, '°C'), cor: '#1d6b3f', tracejado: false }];
  if (ctx.parametros.setpoint !== null) refs.push({ y: ctx.parametros.setpoint, rotulo: '', cor: '#3e4c59' });
  var o = { series: ser.series, rotuloX: dur > 36 * 60 ? 'Data e horário' : 'Horário', rotuloY: 'Temperatura (°C)', referencias: refs, faixasX: faixasX,
    faixaY: { y0: ctx.faixa.tMin, y1: ctx.faixa.tMax, cor: '#edf6f0' }, formatarX: EstufaDoc_formatadorX_(ser.t0Ms, dur), largura: largura || 680 };
  var svg = SGO_DocA4_graficoLinhas_(o);
  return svg ? { svg: svg, nota: SGO_DocA4_notaCorte_(o, '°C') } : null;
}

/** Diferença entre o sensor mais quente e o mais frio a cada instante (uniformidade), com o limite do protocolo. */
function EstufaDoc_figUniformidade_(serie, lim, largura) {
  if (!serie || serie.length < 2) return null;
  var t0 = serie[0][0];
  var pts = serie.map(function (p) { return [(p[0] - t0) / 60000, p[1]]; });
  var dur = pts[pts.length - 1][0];
  return SGO_DocA4_graficoLinhas_({ series: [{ nome: 'Maior diferença entre sensores', cor: '#1f5fa8', pontos: pts, largura: 1.4 }], rotuloX: dur > 36 * 60 ? 'Data e horário' : 'Horário', rotuloY: 'Diferença (°C)',
    yMin: 0, referencias: lim ? [{ y: lim, rotulo: 'Limite ' + SGO_DocA4_val_(lim, 2, '°C'), cor: '#a61b1b' }] : [], formatarX: EstufaDoc_formatadorX_(t0, dur), largura: largura || 680, altura: 220 });
}

/**
 * Mapa dos sensores: para cada sensor (do mais frio ao mais quente pela média), a faixa entre a mínima e a
 * máxima registradas e o ponto da média, sobre a escala de temperatura com os limites de aceitação.
 */
function EstufaDoc_figMapa_(porSensor, faixa, largura) {
  var itens = (porSensor || []).filter(function (p) { return p.media !== null; }).slice().sort(function (a, b) { return a.media - b.media; });
  if (!itens.length) return null;
  var W = largura || 680, hL = 17, mL = 46, mR = 16, mT = 10, mB = 34;
  var H = mT + mB + itens.length * hL;
  var vmin = Math.min(faixa.tMin, Math.min.apply(null, itens.map(function (i) { return i.min; })));
  var vmax = Math.max(faixa.tMax, Math.max.apply(null, itens.map(function (i) { return i.max; })));
  var folga = (vmax - vmin) * 0.05 || 0.5;
  var passo = SGO_DocA4_passo_(vmax - vmin + 2 * folga, 8);
  var x0 = Math.floor((vmin - folga) / passo) * passo, x1 = Math.ceil((vmax + folga) / passo) * passo;
  var pw = W - mL - mR;
  function X(v) { return mL + (v - x0) / (x1 - x0) * pw; }
  function f1(n) { return (Math.round(n * 10) / 10).toString(); }
  var s = ['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '" font-family="Arial, Helvetica, sans-serif" font-size="9.5"><rect width="' + W + '" height="' + H + '" fill="#fff"/>'];
  s.push('<rect x="' + f1(X(faixa.tMin)) + '" y="' + mT + '" width="' + f1(X(faixa.tMax) - X(faixa.tMin)) + '" height="' + (H - mT - mB) + '" fill="#edf6f0"/>');
  for (var v = x0; v <= x1 + passo / 2; v += passo) {
    s.push('<line x1="' + f1(X(v)) + '" y1="' + mT + '" x2="' + f1(X(v)) + '" y2="' + (H - mB) + '" stroke="#e1e6ec" stroke-width="0.7"/>');
    s.push('<text x="' + f1(X(v)) + '" y="' + (H - mB + 13) + '" text-anchor="middle" fill="#3e4c59">' + SGO_DocA4_esc_(SGO_DocA4_num_(v, passo < 1 ? 1 : 0)) + '</text>');
  }
  [faixa.tMin, faixa.tMax].forEach(function (lim) { s.push('<line x1="' + f1(X(lim)) + '" y1="' + mT + '" x2="' + f1(X(lim)) + '" y2="' + (H - mB) + '" stroke="#1d6b3f" stroke-width="1"/>'); });
  itens.forEach(function (p, k) {
    var y = mT + k * hL + hL / 2;
    var fora = p.min < faixa.tMin || p.max > faixa.tMax;
    var cor = fora ? '#a61b1b' : '#1f5fa8';
    s.push('<text x="' + (mL - 6) + '" y="' + f1(y + 3.2) + '" text-anchor="end" fill="#1f2933">' + SGO_DocA4_esc_(p.sensor) + '</text>');
    s.push('<line x1="' + f1(X(p.min)) + '" y1="' + f1(y) + '" x2="' + f1(Math.max(X(p.max), X(p.min) + 1)) + '" y2="' + f1(y) + '" stroke="' + cor + '" stroke-width="5" stroke-opacity="0.45"/>');
    s.push('<circle cx="' + f1(X(p.media)) + '" cy="' + f1(y) + '" r="3.2" fill="' + cor + '"/>');
  });
  s.push('<text x="' + f1(mL + pw / 2) + '" y="' + (H - 6) + '" text-anchor="middle" fill="#1f2933">Temperatura (°C)</text></svg>');
  return { svg: s.join('') };
}

/** Letalidade acumulada por sensor numa repetição. */
function EstufaDoc_figLetalidade_(porSensor, minimo, rotulo, largura) {
  var t0 = null;
  porSensor.forEach(function (s) { if (s._acum && s._acum.length && (t0 === null || s._acum[0][0] < t0)) t0 = s._acum[0][0]; });
  if (t0 === null) return null;
  var series = porSensor.map(function (s, i) { return { nome: s.sensor, cor: SGO_DocA4_corSerie_(Number(s.sensor.slice(1)) - 1), pontos: s._acum.map(function (p) { return [(p[0] - t0) / 60000, p[1]]; }) }; });
  var dur = 0;
  series.forEach(function (s) { if (s.pontos.length) dur = Math.max(dur, s.pontos[s.pontos.length - 1][0]); });
  return SGO_DocA4_graficoLinhas_({ series: series, rotuloX: 'Horário', rotuloY: rotulo + ' acumulado (min)', yMin: 0, referencias: [{ y: minimo, rotulo: 'Mínimo ' + SGO_DocA4_val_(minimo, 2, 'min'), cor: '#a61b1b' }], formatarX: EstufaDoc_formatadorX_(t0, dur), largura: largura || 680 });
}

/**
 * Figuras do ensaio: [{ estudo, tipo, svg, legenda }]. interno.series vem de EstufaQ_montarContexto_.
 */
function EstufaDoc_figuras_(ctx, interno, largura) {
  var figs = [];
  var series = (interno && interno.series) || [];
  ctx.estudos.forEach(function (e) {
    series.filter(function (s) { return s.tipo === e.tipoEstudo; }).forEach(function (s) {
      var suf = s.repeticao ? ' — repetição ' + s.repeticao : '';
      try {
        if (s.linhas) {
          var p = EstufaDoc_figPerfil_(s.linhas, ctx, s, largura);
          if (p) figs.push({ estudo: e.tipoEstudo, tipo: 'perfil', svg: p.svg, legenda: 'Temperatura por sensor — ' + e.rotulo + suf + ', com a faixa de aceitação sombreada' + (ctx.parametros.setpoint !== null ? ', a temperatura programada em linha tracejada cinza' : '') + (s.evento ? ' e o evento destacado' : (s.avaliadas && s.avaliadas.length < s.linhas.length ? ' e o trecho de estabilização (fora da avaliação) em cinza' : '')) + '.' + p.nota });
        }
        if (s.uniformidade && s.uniformidade.length > 1 && !s.evento) {
          var u = EstufaDoc_figUniformidade_(s.uniformidade, ctx.parametros.limUniformidade, largura);
          if (u) figs.push({ estudo: e.tipoEstudo, tipo: 'uniformidade', svg: u, legenda: 'Uniformidade ao longo do tempo — diferença entre o sensor mais quente e o mais frio em cada leitura (' + e.rotulo + ').' });
        }
        if (s.letalidade) {
          var rep = (e.fatos.repeticoes || [])[s.repeticao - 1] || {};
          var l = rep.letalidade ? EstufaDoc_figLetalidade_(s.letalidade, rep.letalidade.minimo, rep.letalidade.rotulo, largura) : '';
          if (l) figs.push({ estudo: e.tipoEstudo, tipo: 'letalidade', svg: l, legenda: 'Letalidade ' + rep.letalidade.rotulo + ' acumulada por sensor — ' + e.rotulo + suf + ', com o mínimo exigido.' });
        }
      } catch (err) { figs.push({ estudo: e.tipoEstudo, tipo: 'erro', erro: 'Gráfico não gerado (' + EstufaQ_msg_(err) + '); os valores estão nas tabelas.' }); }
    });
    if (e.fatos.porSensor && e.fatos.porSensor.length > 1) {
      var m = EstufaDoc_figMapa_(e.fatos.porSensor, ctx.faixa, largura);
      if (m && m.svg) figs.push({ estudo: e.tipoEstudo, tipo: 'mapa', svg: m.svg, legenda: 'Mapa dos sensores — ' + e.rotulo + ': faixa entre a mínima e a máxima de cada sensor (barra) e a média (ponto), do mais frio ao mais quente; a faixa de aceitação está sombreada e o sensor que saiu dela aparece em vermelho.' });
    }
  });
  return figs;
}

/* ============================================================
 * Blocos de conteúdo comuns aos documentos do ensaio
 * ============================================================ */

function EstufaDoc_identLinhas_(ctx) {
  var id = ctx.identificacao;
  function opc(r, v, x) { return EstufaQ_s_(v) ? [[r, v].concat(x ? [x] : [])] : []; }
  return [['Cliente', id.cliente], ['CNPJ', id.cnpj]].concat(opc('Endereço', id.endereco, { largo: true }), opc('Unidade e local', id.setor, { largo: true }),
    [['TAG', id.tag], ['Equipamento', id.tipoEquipamento]], opc('Nº de série', id.numeroSerie), opc('Volume interno declarado', id.volumeLitros ? id.volumeLitros + ' L' : ''),
    [['Perfil de ensaio', ctx.perfilLabel + (ctx.anexo ? ' (ABNT NBR 16328:2024, Anexo ' + ctx.anexo + ')' : '')]],
    [['Técnico executor', id.tecnicoExecutor || '—']], opc('Responsável pelo aceite', id.responsavelAceite), opc('Tarefa de origem', id.tarefaOrigem),
    [['Empresa executante', id.empresaExecutante.nome + ' — CNPJ ' + id.empresaExecutante.cnpj, { largo: true }]]);
}

function EstufaDoc_tabelaIncerteza_(inc) {
  if (!inc) return '<p class="nota">A incerteza do registrador não está no cadastro de padrões; a incerteza de medição não foi declarada.</p>';
  var l = [['Calibração do registrador (U = ' + SGO_DocA4_val_(inc.U95Certificado, 2, '°C') + ', k = ' + SGO_DocA4_num_(inc.kCertificado, 2) + ')', 'u = U / k', SGO_DocA4_val_(inc.uCal, 3, '°C')]];
  l.push(['Resolução do registrador' + (inc.resolucao ? ' (' + SGO_DocA4_val_(inc.resolucao, 2, '°C') + ')' : ''), 'u = r / (2·√3)', inc.uRes === null ? 'Não informada' : SGO_DocA4_val_(inc.uRes, 3, '°C')]);
  l.push([{ html: '<b>Incerteza expandida de cada leitura (k = 2)</b>' }, 'U = 2·√(u²cal + u²res)', { html: '<b>' + SGO_DocA4_val_(inc.Umedicao, 2, '°C') + '</b>' }]);
  if (inc.Uvolume !== undefined) {
    l.push(['Estabilidade do sensor menos estável', 'u = estabilidade / √3', SGO_DocA4_val_(inc.uEstab, 3, '°C')]);
    l.push(['Uniformidade (maior diferença entre sensores)', 'u = ΔT / (2·√3)', SGO_DocA4_val_(inc.uUnif, 3, '°C')]);
    l.push([{ html: '<b>Incerteza expandida da temperatura do volume útil (k = 2)</b>' }, 'U = 2·√(u²cal + u²res + u²estab + u²unif)', { html: '<b>' + SGO_DocA4_val_(inc.Uvolume, 2, '°C') + '</b>' }]);
  }
  return SGO_DocA4_tabela_([{ t: 'Componente' }, { t: 'Modelo' }, { t: 'Valor', cls: 'num' }], l);
}

function EstufaDoc_tabelaCriterios_(criterios, comResultado) {
  if (!criterios.length) return '<p class="nota">Nenhum critério aplicável aos estudos realizados.</p>';
  if (!comResultado) return SGO_DocA4_tabela_([{ t: 'Estudo' }, { t: 'Critério' }, { t: 'Requisito' }, { t: 'Referência' }], criterios.map(function (c) { return [c.estudo, c.criterio, c.requisito, c.referencia]; }));
  return SGO_DocA4_tabela_([{ t: 'Estudo' }, { t: 'Critério' }, { t: 'Resultado obtido' }, { t: 'Situação' }], criterios.map(function (c) {
    return [c.estudo, c.criterio, c.obtido, c.naoAvaliado ? { html: '<span class="info-txt">Não avaliado</span>' } : SGO_DocA4_celSituacao_(c.conforme)];
  }));
}

function EstufaDoc_tabelaSensores_(porSensor, comFora) {
  // Até 20 sensores a tabela fica inteira na mesma folha (sem linha solta no pé da página).
  var antes = porSensor.length <= 20 ? '<div class="manter">' : '', depois = antes ? '</div>' : '';
  return antes + SGO_DocA4_tabela_([{ t: 'Sensor' }, { t: 'Mínima (°C)', cls: 'num' }, { t: 'Média (°C)', cls: 'num' }, { t: 'Máxima (°C)', cls: 'num' }, { t: 'Desvio-padrão (°C)', cls: 'num' }, { t: 'Estabilidade (± °C)', cls: 'num' }].concat(comFora ? [{ t: 'Fora da faixa (min)', cls: 'num' }] : []),
    porSensor.map(function (p) { return [p.sensor, SGO_DocA4_num_(p.min, 2), SGO_DocA4_num_(p.media, 2), SGO_DocA4_num_(p.max, 2), SGO_DocA4_num_(p.desvioPadrao, 3), SGO_DocA4_num_(p.estabilidade, 2)].concat(comFora ? [SGO_DocA4_num_(p.minutosForaFaixa, 1)] : []); }), { classe: 'compacta' }) + depois;
}

/** Linhas da tabela de resultados de um estudo (sem repetir a tabela de critérios). */
function EstufaDoc_fatosEstudo_(e) {
  var f = e.fatos, l = [];
  if (f.evento) {
    var ev = f.evento;
    l.push(['Início do evento', ev.inicio || '—'], ['Fim do evento', ev.fim || 'não informado'], ['Saída da faixa', ev.rompeu ? SGO_DocA4_val_(ev.tempoAteRupturaMinutos, 1, 'min') + ' após o início' + (ev.primeiraRuptura ? ' (' + ev.primeiraRuptura.sensor + ', ' + SGO_DocA4_val_(ev.primeiraRuptura.valor, 2, '°C') + ')' : '') : 'Não saiu da faixa'],
      ['Recuperação', ev.recuperou ? SGO_DocA4_val_(ev.tempoAteRecuperacaoMinutos, 1, 'min') : (ev.rompeu ? 'Não recuperou no período registrado' : 'Não se aplica')]);
  }
  if (f.global) {
    l.push(['Período avaliado', f.inicio + ' a ' + f.fim], ['Duração avaliada', EstufaQ_duracaoTxt_(f.duracaoMinutos)], ['Intervalo de registro', SGO_DocA4_val_(f.intervaloSeg, 0, 's')],
      ['Mínima registrada', SGO_DocA4_val_(f.global.min, 2, '°C') + ' (' + f.global.sensorMin + ')'], ['Máxima registrada', SGO_DocA4_val_(f.global.max, 2, '°C') + ' (' + f.global.sensorMax + ')'],
      ['Média de todos os sensores', SGO_DocA4_val_(f.global.media, 2, '°C')], ['Uniformidade (maior diferença)', SGO_DocA4_val_(f.uniformidade.max, 2, '°C') + (f.uniformidade.instante ? ' em ' + EstufaQ_hhmm_(f.uniformidade.instante) : '')],
      ['Diferença média entre sensores', SGO_DocA4_val_(f.uniformidade.media, 2, '°C')], ['Estabilidade (pior sensor)', f.piorEstabilidade ? '± ' + SGO_DocA4_val_(f.piorEstabilidade.valor, 2, '°C') + ' (' + f.piorEstabilidade.sensor + ')' : '—']);
    if (f.sensorMaisFrio) l.push(['Posição mais fria / mais quente', f.sensorMaisFrio.sensor + ' (' + SGO_DocA4_val_(f.sensorMaisFrio.media, 2, '°C') + ') / ' + f.sensorMaisQuente.sensor + ' (' + SGO_DocA4_val_(f.sensorMaisQuente.media, 2, '°C') + ')']);
    if (f.estabilizacao) l.push(['Estabilização', f.estabilizacao.marcada ? 'Marcada pelo técnico: ' + EstufaQ_duracaoTxt_(f.estabilizacao.minutos) + ' (até ' + EstufaQ_hhmm_(f.estabilizacao.instante) + ')' : (f.estabilizacao.jaEstavel ? 'Dentro da faixa desde o início do período' : EstufaQ_duracaoTxt_(f.estabilizacao.minutos) + ' até todos os sensores ficarem na faixa')]);
    if (f.umidade) l.push(['Umidade relativa (mín. / média / máx.)', SGO_DocA4_val_(f.umidade.min, 1, '%') + ' / ' + SGO_DocA4_val_(f.umidade.media, 1, '%') + ' / ' + SGO_DocA4_val_(f.umidade.max, 1, '%')]);
  }
  return l;
}

/* ============================================================
 * Documento
 * ============================================================ */

function EstufaRelEnsaio_assinaturas_(ctx, aprovacao) {
  var l = [];
  if (ctx.identificacao.tecnicoExecutor) l.push({ papel: 'Executado por', nome: ctx.identificacao.tecnicoExecutor, cargo: 'Técnico executor do ensaio' });
  (EstufaBanhoRel_EBCFG.ASSINATURAS_PADRAO || []).forEach(function (a) { l.push(Object.assign({ papel: 'Responsável técnico' }, a)); });
  if (aprovacao && aprovacao.nome) l.push({ papel: 'Aprovado para emissão por', nome: aprovacao.nome, cargo: 'Aprovação registrada no sistema em ' + aprovacao.em });
  return l;
}

function EstufaRelEnsaio_html_(ctx, interno, textos, fotos, aprovacao, minuta) {
  var id = ctx.identificacao, st = ctx.statusConsolidado;
  var h = [], nFig = 0, nTab = 0;
  var estudosTxt = ctx.estudos.map(function (e) { return e.rotulo; }).join('; ');
  h.push(SGO_DocA4_inicioDocumento_({
    titulo: 'Relatório de ensaio térmico — ' + ctx.perfilLabel,
    subtitulo: 'Mapeamento térmico do equipamento nos estudos identificados. O resultado refere-se exclusivamente a este ensaio.',
    tituloCurto: 'Relatório de ensaio térmico', rotuloNumero: 'Relatório nº', numero: id.certificadoNumero || '(atribuído na emissão)', revisao: id.revisao,
    empresa: id.empresaExecutante,
    capa: { tipo: 'Qualificação térmica', linhas: [['Cliente', id.cliente], ['Equipamento', id.tipoEquipamento + (id.tag ? ' — TAG ' + id.tag : '')], ['Estudos', estudosTxt]] },
    ficha: [['Data do ensaio', id.dataDoEnsaio || '—'], ['Emissão', SGO_DocA4_hoje_(EstufaQ_tz_())], ['Registrador', id.dtl || '—'], ['Sensores ativos', String(ctx.sensores.ativos.length)]]
      .concat((ctx.parametrosPersonalizados || []).length ? [['Parâmetros', 'Personalizados (ver seção 4)']] : []),
    simulado: ctx.simulado || minuta,
    avisoSimulado: minuta ? 'MINUTA PARA CONFERÊNCIA DO RESPONSÁVEL TÉCNICO — documento ainda não aprovado; não entregar ao cliente.' : 'RELATÓRIO INTERNO — dados reconstituídos pelo laboratório; não representa ensaio real e não pode ser entregue ao cliente.',
    resultado: { status: st, rotulo: 'Resultado do ensaio', texto: ctx.resumoResultado },
    sumario: true
  }));

  h.push('<h2>1. Identificação</h2>' + SGO_DocA4_tabelaIdent_(EstufaDoc_identLinhas_(ctx)));

  h.push('<h2>2. Objetivo e escopo</h2>');
  h.push('<p>Verificar se ' + EstufaQ_equipTexto_(ctx).toLowerCase() + ' mantém a temperatura dentro da faixa de aceitação em todos os pontos medidos do volume útil, nos estudos realizados, e registrar a distribuição de temperatura, a estabilidade no tempo e, quando aplicável, o comportamento em abertura de porta, em queda de energia e a letalidade do ciclo.</p>');
  h.push(SGO_DocA4_lista_(['Sensores ativos: ' + ctx.sensores.ativos.join(', ') + (ctx.sensores.desabilitados.length ? '; desconsiderados pelo técnico: ' + ctx.sensores.desabilitados.join(', ') : '') + '.',
    'Faixa de aceitação: ' + SGO_DocA4_val_(ctx.faixa.tMin, 1, '°C') + ' a ' + SGO_DocA4_val_(ctx.faixa.tMax, 1, '°C') + (ctx.parametros.setpoint !== null ? '; temperatura programada: ' + SGO_DocA4_val_(ctx.parametros.setpoint, 1, '°C') : '') + '.'].concat(ctx.escopo,
    ['O resultado vale para as condições de carga, posição dos sensores e programação deste ensaio.'])));

  h.push('<h2>3. Instrumentação, rastreabilidade e incerteza</h2>');
  h.push('<p>As temperaturas foram registradas por registrador de dados com sensores distribuídos no volume útil. O registrador e a situação do certificado de calibração na data do ensaio, conforme o cadastro de padrões da empresa executante, estão abaixo.</p>');
  h.push(SGO_DocA4_tabelaRegistradores_(ctx.registradores));
  h.push('<h3>3.1 Incerteza de medição</h3>' + EstufaDoc_tabelaIncerteza_(ctx.incerteza));

  h.push('<h2>4. Metodologia e critérios</h2>');
  h.push('<p>Para cada estudo, as leituras de todos os sensores ativos no período avaliado são comparadas à faixa de aceitação. A uniformidade é a maior diferença entre o sensor mais quente e o mais frio no mesmo instante; a estabilidade de cada sensor é a metade da sua variação no período (± (T<sub>máx</sub> − T<sub>mín</sub>) / 2). Quando há período de estabilização, as leituras anteriores a ele aparecem nos gráficos, mas não entram na avaliação.</p>');
  if (ctx.estudos.some(function (e) { return e.tipoEstudo === 'PENETRACAO_CARGA_E'; })) {
    h.push('<p>A letalidade do ciclo em cada sensor é acumulada pela regra dos trapézios, com o intervalo real entre leituras:</p><p class="formula">L = Σ ½ · [10<sup>(T<sub>i−1</sub> − T<sub>ref</sub>) / z</sup> + 10<sup>(T<sub>i</sub> − T<sub>ref</sub>) / z</sup>] · Δt<sub>i</sub></p><p>O ciclo é avaliado pelo sensor de menor letalidade.</p>');
  }
  if (ctx.estudos.some(function (e) { return EstufaQ_ehEvento_(e.tipoEstudo); })) {
    h.push('<p>Nos estudos de abertura de porta e de queda de energia, mede-se o tempo do início do evento até a primeira saída da faixa (confirmada em leituras consecutivas) e o tempo até todos os sensores voltarem à faixa.</p>');
  }
  h.push('<h3>4.1 Critérios de aceitação</h3><p class="nota">Cada critério tem a fonte na coluna Referência. Critério sem limite no protocolo é apresentado como informativo e não aprova nem reprova o ensaio.</p>');
  h.push(EstufaDoc_tabelaCriterios_(ctx.criterios, false));
  h.push('<h3>4.2 Regra de decisão</h3><p>' + SGO_DocA4_esc_(ctx.regraDecisao) + '</p>');
  if (ctx.normas.length) h.push('<h3>4.3 Referências normativas</h3>' + SGO_DocA4_lista_(ctx.normas));
  // 21/10/2026: parâmetros personalizados pelo responsável técnico (referência, valor usado, justificativa e responsável).
  if (typeof SGO_MP_secaoDocumento_ === 'function') h.push(SGO_MP_secaoDocumento_(ctx.parametrosPersonalizados, (ctx.normas.length ? '4.4' : '4.3') + ' Parâmetros personalizados', aprovacao, minuta));

  h.push('<h2>5. Resultados</h2>');
  var figs = EstufaDoc_figuras_(ctx, interno, 680);
  ctx.estudos.forEach(function (e, i) {
    h.push('<h3>5.' + (i + 1) + ' ' + SGO_DocA4_esc_(e.rotulo) + '</h3>');
    var f = e.fatos;
    if (f.repeticoes) {
      h.push(SGO_DocA4_tabela_([{ t: 'Repetição' }, { t: 'Período' }, { t: 'Mín. (°C)', cls: 'num' }, { t: 'Máx. (°C)', cls: 'num' }, { t: 'Maior diferença (°C)', cls: 'num' }].concat(e.tipoEstudo === 'PENETRACAO_CARGA_E' ? [{ t: 'Menor letalidade (min)', cls: 'num' }] : []),
        f.repeticoes.map(function (r) { return [String(r.numero), r.inicio + ' a ' + EstufaQ_hhmm_(r.fim), SGO_DocA4_num_(r.global.min, 2), SGO_DocA4_num_(r.global.max, 2), SGO_DocA4_num_(r.uniformidade.max, 2)].concat(r.letalidade ? [SGO_DocA4_num_(r.letalidade.pior && r.letalidade.pior.valor, 2) + (r.letalidade.pior ? ' (' + r.letalidade.pior.sensor + ')' : '')] : []); })));
      f.repeticoes.forEach(function (r) {
        if (r.letalidade) h.push('<p class="nota">Repetição ' + r.numero + ': ' + r.letalidade.rotulo + ' com T<sub>ref</sub> = ' + SGO_DocA4_val_(r.letalidade.tBase, 1, '°C') + ' e z = ' + SGO_DocA4_val_(r.letalidade.z, 1, '°C') + '; por sensor: ' + r.letalidade.porSensor.map(function (x) { return x.sensor + ' ' + SGO_DocA4_num_(x.valor, 2); }).join(', ') + ' min.' + (r.letalidade.incerteza !== undefined ? ' Incerteza expandida do menor valor, propagada da incerteza de cada leitura: ' + SGO_DocA4_val_(r.letalidade.incerteza, 2, 'min') + '.' : '') + '</p>');
      });
    } else {
      h.push(SGO_DocA4_tabelaIdent_(EstufaDoc_fatosEstudo_(e)));
      if (f.porSensor && f.porSensor.length) { nTab++; h.push(SGO_DocA4_legendaTabela_(nTab, 'Resultados por sensor no período avaliado') + EstufaDoc_tabelaSensores_(f.porSensor, !f.evento)); }
    }
    figs.filter(function (g) { return g.estudo === e.tipoEstudo; }).forEach(function (g) {
      if (g.erro) h.push('<p class="nota">' + SGO_DocA4_esc_(g.erro) + '</p>');
      else { nFig++; h.push(SGO_DocA4_figura_(g.svg, nFig, g.legenda)); }
    });
  });
  h.push('<h3>5.' + (ctx.estudos.length + 1) + ' Verificação dos critérios de aceitação</h3>' + EstufaDoc_tabelaCriterios_(ctx.criterios, true));

  h.push('<h2>6. Análise técnica</h2>');
  ctx.estudos.forEach(function (e) { h.push('<h3 class="sem-sumario">' + SGO_DocA4_esc_(e.rotulo) + '</h3><div class="prosa">' + SGO_DocA4_paragrafos_((textos.analisePorEstudo || {})[e.tipoEstudo]) + '</div>'); });

  h.push('<h2>7. Não conformidades e observações</h2><h3>7.1 Não conformidades</h3>');
  h.push(ctx.naoConformidades.length ? SGO_DocA4_lista_(ctx.naoConformidades) : '<p>Nenhuma não conformidade foi registrada neste ensaio.</p>');
  var obs = ctx.observacoes.concat([].concat.apply([], ctx.estudos.map(function (e) { return e.observacoesAnalise.map(function (o) { return e.rotulo + ': ' + o; }); })));
  h.push('<h3>7.2 Observações</h3>' + (obs.length ? SGO_DocA4_lista_(obs) : '<p>Sem observações adicionais.</p>'));

  h.push('<h2>8. Conclusão</h2><div class="prosa">' + SGO_DocA4_paragrafos_(textos.conclusaoGeral) + '</div>');
  h.push('<h3>8.1 Em linguagem simples</h3><div class="leigo">' + SGO_DocA4_paragrafos_(textos.conclusaoLeigo) + '</div>');
  h.push(SGO_DocA4_linhaParecer_(st, 'Parecer deste ensaio', 'Aprovado — o ensaio atende aos critérios de aceitação', 'Reprovado — o ensaio não atende aos critérios de aceitação', 'Informativo — sem critério de aprovação aplicável'));

  h.push('<div class="manter"><h2>9. Responsabilidade técnica</h2><p>Este relatório refere-se exclusivamente ao ensaio identificado. A qualificação do equipamento é declarada no relatório de qualificação, que consolida os ensaios emitidos. O resultado foi calculado pelo sistema a partir dos dados do registrador; os textos foram revisados antes da emissão. A reprodução parcial deste documento depende de autorização da empresa executante.</p>');
  if (aprovacao) h.push('<p><b>Revisado e aprovado para emissão por</b> ' + SGO_DocA4_esc_(aprovacao.nome || '—') + (aprovacao.perfil ? ' (' + SGO_DocA4_esc_(String(aprovacao.perfil).toLowerCase()) + ')' : '') + ', em ' + SGO_DocA4_esc_(aprovacao.em) + ', com registro no sistema. Revisão ' + SGO_DocA4_esc_(SGO_DocA4_revisao_(id.revisao)) + (Number(id.revisao) > 0 ? '; as revisões anteriores continuam arquivadas e são substituídas por esta' : '') + '.</p>');
  else if (minuta) h.push('<p><b>Aguardando a aprovação do responsável técnico.</b></p>');
  h.push(SGO_DocA4_assinaturas_(EstufaRelEnsaio_assinaturas_(ctx, aprovacao)) + '</div>');

  if (fotos && fotos.length) h.push('<h2 class="quebra">Anexo A — Registro fotográfico</h2>' + SGO_DocA4_fotos_(fotos));
  h.push(SGO_DocA4_fimDocumento_());
  return h.join('\n');
}

