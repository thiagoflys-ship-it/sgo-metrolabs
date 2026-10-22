/****************************************************
 * METROLABS — CADEIA DE FRIO — RELATÓRIO DE ENSAIO TÉRMICO, A4 RETRATO (21/10/2026)
 *
 * Documento HTML A4 do ensaio (um arquivo de registrador com um ou mais estudos:
 * distribuição em vazio ou com carga, abertura de porta, queda de energia, autonomia),
 * no padrão comum SGO_DocA4 (capa, sumário, cabeçalho e rodapé em todas as páginas,
 * numeração, gráficos em SVG estático), salvo em HTML + PDF na pasta do equipamento.
 * Mesma estrutura do relatório de ensaio da Autoclave a vapor. Os números vêm do
 * pacote de fatos (CadeiaFrioRel_qContexto_): este arquivo não recalcula resultado.
 * O documento nunca cita marca, fabricante nem modelo comercial.
 ****************************************************/

/** Cores dos sensores nos gráficos: sem vermelho (reservado aos limites); depois de 16 sensores, as cores repetem tracejadas. */
var CADEIAFRIO_RE_PALETA = ['#1f5fa8', '#2a9d5b', '#7b4fb0', '#e08a00', '#0f8b8d', '#6d7f12', '#5d4037', '#3949ab', '#ef6c00', '#00897b', '#8e24aa', '#546e7a', '#b8860b', '#1b5e20', '#283593', '#8d6e63'];

/** Situação de um critério: decide (Conforme/Não conforme), método (Atende/Desvio) ou não avaliado. */
function CadeiaFrioRel_reCelSituacao_(c) {
  if (c.naoAvaliado) return { html: '<span class="info-txt">Não avaliado</span>' };
  if (c.metodo) return c.conforme ? { html: '<span class="ok-txt">Atende</span>' } : { html: '<span class="info-txt">Desvio do método</span>' };
  return SGO_DocA4_celSituacao_(c.conforme);
}

/** Análise do motor correspondente a um estudo do contexto. */
function CadeiaFrioRel_reAnaliseDoEstudo_(resultado, tipo) {
  return ((resultado && resultado.analises) || []).filter(function (a) { return String(a.tipoEstudo || '').toUpperCase() === tipo; })[0] || null;
}

/**
 * Gráfico de um estudo: temperatura de cada sensor considerado ao longo do recorte do estudo,
 * com a faixa de aceitação (verde), os limites com a tolerância (vermelho) e, sombreados, o
 * período de estabilização (distribuição) ou o evento (porta aberta, sem energia). {svg, nota} ou null.
 */
function CadeiaFrioRel_reGraficoEstudo_(analise, ctx, opcoes) {
  opcoes = opcoes || {};
  if (!analise) return null;
  var tz = CadeiaFrioRel_CFCFG.TZ || 'America/Sao_Paulo';
  var linhas = analise._dadosFatia || [];
  var faixa = ctx.faixa || {};
  var series = SGO_DocA4_seriesTemperatura_(linhas, { sensoresAtivos: analise.sensoresAtivos, tz: tz });
  if (!series.series.length) return null;
  series.series.forEach(function (se, i) { se.cor = CADEIAFRIO_RE_PALETA[i % CADEIAFRIO_RE_PALETA.length]; if (i >= CADEIAFRIO_RE_PALETA.length) se.tracejado = true; });
  var t0 = series.t0Ms;
  function xDeTexto(txt) { var ms = CadeiaFrioRel_cfConverterTempoParaMs_(txt); return (t0 !== null && isFinite(ms)) ? (ms - t0) / 60000 : NaN; }
  var duracaoMin = 0;
  series.series.forEach(function (s) { var p = s.pontos; if (p.length) duracaoMin = Math.max(duracaoMin, p[p.length - 1][0]); });
  var refs = [];
  var tol = Number(faixa.tolerancia) || 0;
  refs.push({ y: faixa.tMin, rotulo: 'Mínima ' + SGO_DocA4_val_(faixa.tMin, 1, '°C'), cor: '#1d6b3f', tracejado: false });
  refs.push({ y: faixa.tMax, rotulo: 'Máxima ' + SGO_DocA4_val_(faixa.tMax, 1, '°C'), cor: '#1d6b3f', tracejado: false });
  if (tol > 0) {
    refs.push({ y: faixa.tMin - tol, rotulo: 'Limite com tolerância ' + SGO_DocA4_val_(faixa.tMin - tol, 1, '°C'), cor: '#a61b1b', lado: 'esq' });
    refs.push({ y: faixa.tMax + tol, rotulo: 'Limite com tolerância ' + SGO_DocA4_val_(faixa.tMax + tol, 1, '°C'), cor: '#a61b1b', lado: 'esq' });
  }
  var faixasX = [], sombra = '';
  var t = String(analise.tipoEstudo || '').toUpperCase();
  if (analise.rampaEstabilizacao) {
    var xr = xDeTexto(analise.rampaEstabilizacao.fimRampaStr);
    // Rótulo só quando a faixa é larga o bastante para o texto (senão a legenda da figura explica).
    faixasX.push({ x0: 0, x1: xr, rotulo: (duracaoMin > 0 && xr / duracaoMin > 0.2) ? 'Estabilização (fora do julgamento)' : '', cor: '#f1f3f5' });
    sombra = ' Área cinza: estabilização inicial, fora do julgamento.';
  }
  if (t === 'ABERTURA_PORTA' || t === 'QUEDA_ENERGIA') {
    var x0 = xDeTexto(analise.tempoInicioEvento);
    var x1 = analise.tempoFimEvento ? xDeTexto(analise.tempoFimEvento) : (t === 'QUEDA_ENERGIA' ? duracaoMin : x0);
    if (isFinite(x0) && isFinite(x1) && x1 > x0) {
      faixasX.push({ x0: x0, x1: x1, rotulo: t === 'QUEDA_ENERGIA' ? 'Sem energia' : 'Porta aberta', cor: '#eef3fb' });
      sombra = ' Área azul: ' + (t === 'QUEDA_ENERGIA' ? 'período sem energia elétrica' : 'porta aberta') + '.';
    }
  }
  var longo = duracaoMin > 36 * 60;
  var o = {
    series: series.series, rotuloX: longo ? 'Data e horário' : 'Horário', rotuloY: 'Temperatura (°C)', referencias: refs, faixasX: faixasX,
    faixaY: { y0: faixa.tMin, y1: faixa.tMax, cor: '#edf6f0' }, largura: opcoes.largura || 680, altura: opcoes.altura || 300,
    formatarX: function (x) {
      if (t0 === null) return SGO_DocA4_num_(x, 0) + ' min';
      try { return Utilities.formatDate(new Date(t0 + x * 60000), tz, longo ? 'dd/MM HH:mm' : 'HH:mm'); } catch (e) { return SGO_DocA4_num_(x, 0); }
    }
  };
  var svg = SGO_DocA4_graficoLinhas_(o);
  if (!svg) return null;
  return { svg: svg, nota: 'Faixa verde: faixa de aceitação' + (tol > 0 ? '; linhas vermelhas tracejadas: limites com a tolerância operacional' : '') + '.' + sombra + SGO_DocA4_notaCorte_(o, '°C') };
}

/** Linhas da ficha de um estudo (período, evento, tempos). */
function CadeiaFrioRel_reFichaEstudo_(e) {
  var f = e.fatos || {}, val = SGO_DocA4_val_, dur = CadeiaFrioRel_qDuracao_;
  var l = [];
  if (CadeiaFrioRel_qEhDistribuicao_(e.tipoEstudo)) {
    l.push(['Início do estudo', f.periodoInicio || '—'], ['Fim do estudo', f.periodoFim || '—']);
    if (f.rampa) l.push(['Fim da estabilização', f.rampa.fim + ' (' + dur(f.rampa.duracaoMinutos) + ')']);
    l.push(['Período avaliado', dur(f.duracaoAvaliadaMinutos)], ['Leituras por sensor', String(f.leiturasAvaliadas)]);
  } else if (CadeiaFrioRel_qEhEvento_(e.tipoEstudo)) {
    var energia = e.tipoEstudo === 'QUEDA_ENERGIA';
    l.push([energia ? 'Interrupção da energia' : 'Abertura da porta', f.inicioEvento || '—'], [energia ? 'Retorno da energia' : 'Fechamento da porta', f.fimEvento || 'Não informado']);
    if (f.duracaoEventoMinutos !== null && f.duracaoEventoMinutos !== undefined) l.push([energia ? 'Tempo sem energia' : 'Tempo com a porta aberta', dur(f.duracaoEventoMinutos)]);
    if (!energia && f.tipoAbertura) l.push(['Tipo de abertura', f.tipoAbertura === 'TOTAL' ? 'Porta totalmente aberta' : 'Porta semiaberta']);
    l.push(['Saiu da faixa?', f.rompeu ? 'Sim, após ' + val(f.tempoAteRupturaMinutos, 1, 'min') + (f.ruptura ? ' (' + f.ruptura.sensor + ', ' + val(f.ruptura.valor, 2, '°C') + ')' : '') : 'Não']);
    if (f.rompeu) l.push(['Retorno de todos os sensores à faixa', f.recuperouTotalmente ? val(f.tempoAteRecuperacaoMinutos, 1, 'min') : 'Não ocorreu no período registrado']);
    l.push(['Monitoramento depois do evento', val(f.minutosMonitoradosAposEvento, 1, 'min')]);
  } else {
    l.push(['Início do período', f.periodoInicio || '—'], ['Fim do período', f.periodoFim || '—'], ['Período gravado', dur(f.duracaoTotalMinutos)]);
    l.push(['Autonomia medida', f.rompeu ? val(f.autonomiaMinutos, 1, 'min') + (f.ruptura ? ' (até ' + f.ruptura.sensor + ' sair da faixa)' : '') : 'Maior que o período gravado']);
  }
  if (f.intervaloLeiturasSegundos !== null && f.intervaloLeiturasSegundos !== undefined) l.push(['Intervalo entre leituras', val(f.intervaloLeiturasSegundos, 0, 's')]);
  return l;
}

/** Tabela das estatísticas do trecho avaliado (todos os sensores considerados juntos). */
function CadeiaFrioRel_reTabelaEstatistica_(f) {
  var e = f.estatisticas;
  if (!e) return '<p class="nota">Sem leituras válidas no trecho avaliado.</p>';
  var col = [{ t: 'Mínima', cls: 'num' }, { t: 'Máxima', cls: 'num' }, { t: 'Média', cls: 'num' }, { t: 'Mediana', cls: 'num' }, { t: 'Desvio-padrão', cls: 'num' }, { t: 'Máx. − mín.', cls: 'num' }, { t: 'Média − mín.', cls: 'num' }, { t: 'Máx. − média', cls: 'num' }];
  var lin = [SGO_DocA4_val_(e.min, 2, '°C'), SGO_DocA4_val_(e.max, 2, '°C'), SGO_DocA4_val_(e.media, 2, '°C'), SGO_DocA4_val_(e.mediana, 2, '°C'), SGO_DocA4_val_(e.desvio, 2, '°C'), SGO_DocA4_val_(e.maxMin, 2, '°C'), SGO_DocA4_val_(e.mediaMin, 2, '°C'), SGO_DocA4_val_(e.maxMedia, 2, '°C')];
  if (f.mkt !== null && f.mkt !== undefined) { col.push({ t: 'MKT', cls: 'num' }); lin.push(SGO_DocA4_val_(f.mkt, 2, '°C')); }
  return SGO_DocA4_tabela_(col, [lin], { classe: 'compacta' });
}

/** Tabela por sensor: mínima, média, máxima, desvio, tempo fora da faixa e situação. */
function CadeiaFrioRel_reTabelaSensores_(e) {
  var f = e.fatos || {};
  var conf = {};
  (f.conformidadePorSensor || []).forEach(function (c) { conf[c.sensor] = c; });
  var evento = CadeiaFrioRel_qEhEvento_(e.tipoEstudo);
  var temMkt = (f.porSensor || []).some(function (p) { return p.mkt !== null && p.mkt !== undefined; });
  var col = [{ t: 'Sensor' }, { t: 'Mínima (°C)', cls: 'num' }, { t: 'Média (°C)', cls: 'num' }, { t: 'Máxima (°C)', cls: 'num' }, { t: 'Desvio-padrão (°C)', cls: 'num' }].concat(temMkt ? [{ t: 'MKT (°C)', cls: 'num' }] : []).concat([{ t: 'Fora da faixa', cls: 'num' }, { t: 'Situação' }]);
  return SGO_DocA4_tabela_(col, (f.porSensor || []).map(function (p) {
    var c = conf[p.sensor] || {};
    var s = String(c.statusSensor || '').toUpperCase();
    var sit = s === 'NAO_CONFORME' ? { html: '<span class="nok-txt">' + (evento ? 'Saiu da faixa' : 'Fora da faixa') + '</span>' } : (s === 'CONFORME_COM_RESSALVA' ? { html: '<span class="ok-txt">Dentro da tolerância</span>' } : { html: '<span class="ok-txt">' + (evento ? 'Permaneceu na faixa' : 'Na faixa') + '</span>' });
    var linha = [p.sensor + ((f.piorSensor && f.piorSensor.sensor === p.sensor) ? ' (maior afastamento)' : ''), SGO_DocA4_val_(p.min, 2), SGO_DocA4_val_(p.media, 2), SGO_DocA4_val_(p.max, 2), SGO_DocA4_val_(p.desvio, 2)];
    if (temMkt) linha.push(SGO_DocA4_val_(p.mkt, 2));
    linha.push(c.minutosForaFaixa ? SGO_DocA4_val_(c.minutosForaFaixa, 1, 'min') : '—');
    linha.push(sit);
    return linha;
  }), { classe: (f.porSensor || []).length > 12 ? 'compacta' : '' });
}

/**
 * Documento completo. o = { ctx, resultado, textos:{analisePorEstudo, conclusaoGeral, conclusaoLeigo}, fotos,
 *   aprovacao:{nome, perfil, em}|null, minuta:bool, geradoEm, assinaturas }.
 */
function CadeiaFrioRel_reMontarHtml_(o) {
  var ctx = o.ctx, id = ctx.identificacao, textos = o.textos || {}, esc = SGO_DocA4_esc_;
  var st = String(ctx.statusConsolidado || '').toUpperCase();
  var nFig = 0;
  var h = [];
  var estudosTxt = ctx.estudos.map(function (e) { return e.label.toLowerCase(); }).join('; ');
  h.push(SGO_DocA4_inicioDocumento_({
    titulo: 'Relatório de ensaio térmico — Cadeia de frio',
    subtitulo: 'Interpretação técnica dos estudos de ' + estudosTxt + ' do equipamento identificado. O resultado refere-se exclusivamente aos estudos aqui identificados.',
    tituloCurto: 'Relatório de ensaio térmico — Cadeia de frio',
    rotuloNumero: 'Relatório nº', numero: id.certificadoNumero || 'sem número', revisao: id.revisao, empresa: id.empresaExecutante,
    capa: { tipo: 'Qualificação térmica — cadeia de frio', linhas: [['Cliente', id.cliente], ['Equipamento', id.equipamentoTipo + (id.tag ? ' — TAG ' + id.tag : '')], ['Perfil', ctx.equipamentoLabel], ['Estudos', estudosTxt.charAt(0).toUpperCase() + estudosTxt.slice(1)]] },
    ficha: [['Data do ensaio', id.dataDoEnsaio || '—'], ['Emissão', o.geradoEm || '—'], ['Registrador', id.dtl || '—'], ['Faixa de aceitação', SGO_DocA4_val_(ctx.faixa.tMin, 1, '°C') + ' a ' + SGO_DocA4_val_(ctx.faixa.tMax, 1, '°C')]],
    simulado: ctx.simulado || o.minuta,
    avisoSimulado: o.minuta ? 'MINUTA PARA CONFERÊNCIA DO RESPONSÁVEL TÉCNICO — documento ainda não aprovado; não entregar ao cliente.' : undefined,
    resultado: { status: st, rotulo: 'Resultado do ensaio', texto: ctx.resumoResultado },
    sumario: true
  }));

  // 1. Identificação (campos opcionais vazios não aparecem; 22/10/2026: fabricante e modelo do cadastro aparecem)
  var opc = function (r, v, x) { return String(v || '').trim() ? [[r, v].concat(x ? [x] : [])] : []; };
  h.push('<h2>1. Identificação</h2>');
  h.push(SGO_DocA4_tabelaIdent_([['Cliente', id.cliente], ['CNPJ', id.cnpj]].concat(opc('Endereço', id.endereco, { largo: true }), opc('Setor', id.setor), [['TAG', id.tag], ['Equipamento', id.equipamentoTipo]],
    opc('Nº de série', id.numeroSerie), opc('Fabricante (marca)', id.marca), opc('Modelo', id.modelo), opc('Patrimônio', id.patrimonio), opc('Capacidade ou volume', id.capacidade), opc('Câmaras ou portas', id.numCamaras), opc('Ano de fabricação', id.anoFabricacao), [['Perfil do ensaio', ctx.equipamentoLabel], ['Técnico executor', id.tecnicoExecutor]], opc('Responsável pelo aceite', id.responsavelAceite),
    [['Empresa executante', (id.empresaExecutante || {}).nome + ' — CNPJ ' + (id.empresaExecutante || {}).cnpj, { largo: true }]], opc('Tarefa de origem', id.tarefaOrigem, { largo: true }))));
  h.push('<p class="nota">A identificação vem do cadastro do equipamento no SGO+ (Cadastros › Equipamentos).</p>');

  // 2. Instrumentação
  h.push('<h2>2. Instrumentação e rastreabilidade</h2>');
  h.push('<p>As temperaturas foram registradas por registrador de dados com sensores distribuídos no volume útil do equipamento, sem contato com as superfícies internas. Todos os registradores e padrões informados no ensaio e a situação de cada certificado de calibração na data do ensaio, conforme o cadastro de padrões da empresa executante, estão identificados abaixo.</p>');
  h.push(SGO_DocA4_tabelaRegistradores_(ctx.registradores));
  var u95 = ctx.estudos.map(function (e) { return e.fatos.incertezaRegistrador; }).filter(function (x) { return x !== null && x !== undefined; })[0];
  if (u95) h.push('<p class="nota">Incerteza expandida do registrador considerada: ' + esc(SGO_DocA4_val_(u95, 2, '°C')) + ' (k = 2, certificado de calibração). ' + esc(CADEIAFRIO_QCFG.EMISSAO.regraDecisao) + '</p>');
  h.push(SGO_DocA4_tabelaIdent_(ctx.parametros || []));

  // 3. Metodologia
  h.push('<h2>3. Metodologia, critérios de aceitação e referências</h2>');
  var temDist = ctx.estudos.some(function (e) { return CadeiaFrioRel_qEhDistribuicao_(e.tipoEstudo); });
  var temEv = ctx.estudos.some(function (e) { return CadeiaFrioRel_qEhEvento_(e.tipoEstudo); });
  var temAut = ctx.estudos.some(function (e) { return e.tipoEstudo === 'AUTONOMIA'; });
  var temMkt = ctx.estudos.some(function (e) { return e.fatos.mkt !== null && e.fatos.mkt !== undefined; });
  if (temDist) h.push('<p>No estudo de distribuição, cada sensor registra a temperatura durante 24 h consecutivas a partir da estabilização do equipamento, com um sensor junto ao sensor de controle de temperatura. Leituras anteriores ao fim da estabilização, quando informado, aparecem nos gráficos e nas leituras, mas não entram no julgamento.</p>');
  if (temEv) h.push('<p>Nos estudos de abertura de porta e de queda de energia, com a mesma montagem de sensores, mede-se o tempo do início do evento até o primeiro sensor sair da faixa de aceitação (confirmado por leituras consecutivas, para que uma oscilação isolada não seja tomada como saída da faixa) e o tempo para todos os sensores voltarem à faixa. O estudo começa com todos os sensores na faixa.</p>');
  if (temAut) h.push('<p>No estudo de autonomia da caixa térmica, mede-se o tempo em que todos os sensores permanecem na faixa de aceitação sem refrigeração ativa, até o primeiro sensor sair da faixa.</p>');
  h.push('<p>Para o trecho avaliado de cada estudo calculam-se a mínima, a máxima, a média, a mediana, o desvio-padrão (populacional, n leituras) e as indicações máxima − mínima, média − mínima e máxima − média das leituras dos sensores considerados, além da situação de cada sensor em relação à faixa. Leituras impossíveis, sensores parados, picos isolados, leituras faltando, lacunas e registrador sem calibração válida impedem a emissão do documento até serem corrigidos.</p>');
  if (temMkt) h.push('<p>A temperatura cinética média (MKT), informativa e sem critério de aceitação, é calculada por:</p><p class="formula">T<sub>K</sub> = (ΔH/R) / [−ln(Σ e<sup>−ΔH/(R·T<sub>i</sub>)</sup> / n)]</p><p>com ΔH = ' + esc(SGO_DocA4_num_(CADEIAFRIO_QCFG.MKT.energiaAtivacaoKJmol, 3)) + ' kJ/mol, R = ' + esc(SGO_DocA4_num_(CADEIAFRIO_QCFG.MKT.constanteGasJmolK, 4)) + ' J/(mol·K) e T<sub>i</sub> cada leitura em kelvin (resultado convertido para °C).</p>');
  h.push('<h3>3.1 Critérios de aceitação</h3>');
  h.push('<p class="nota">Os critérios marcados como "decide" definem o resultado; os de método conferem a forma do ensaio e, quando não atendidos, aparecem como desvio do método, sem mudar o resultado. Critérios configurados pela empresa executante e revisáveis pelo responsável técnico; a coluna Referência indica a fonte.</p>');
  h.push(SGO_DocA4_tabela_([{ t: 'Estudo' }, { t: 'Critério' }, { t: 'Requisito' }, { t: 'Tipo', cls: 'cen' }, { t: 'Referência' }],
    ctx.criterios.map(function (c) { return [c.estudo, c.criterio, c.requisito, { t: c.metodo ? 'Método' : 'Decide', cls: 'cen' }, c.referencia]; }), { classe: 'compacta' }));
  h.push('<h3>3.2 Escopo e limitações</h3>' + SGO_DocA4_lista_(ctx.escopo || []));
  h.push('<h3>3.3 Referências normativas</h3>' + SGO_DocA4_lista_(ctx.normas || []));

  // 4. Resultados
  h.push('<h2>4. Resultados</h2>');
  ctx.estudos.forEach(function (e, i) {
    var analise = CadeiaFrioRel_reAnaliseDoEstudo_(o.resultado, e.tipoEstudo);
    h.push('<h3>4.' + (i + 1) + ' ' + esc(e.label) + '</h3>');
    h.push(SGO_DocA4_tabelaIdent_(CadeiaFrioRel_reFichaEstudo_(e)));
    h.push('<h4>Estatísticas do trecho avaliado</h4>' + CadeiaFrioRel_reTabelaEstatistica_(e.fatos));
    h.push('<h4>Resultados por sensor</h4>' + CadeiaFrioRel_reTabelaSensores_(e));
    var g = CadeiaFrioRel_reGraficoEstudo_(analise, ctx);
    if (g) { nFig++; h.push(SGO_DocA4_figura_(g.svg, nFig, 'Temperatura por sensor — ' + e.label + '. ' + g.nota)); }
    h.push('<h4>Análise técnica</h4><div class="prosa">' + SGO_DocA4_paragrafos_((textos.analisePorEstudo || {})[e.tipoEstudo]) + '</div>');
    var s = e.statusAprovacao;
    h.push('<p class="nota"><b>Resultado do estudo:</b> ' + (s === 'APROVADO' ? '<span class="ok-txt">Aprovado</span>' : (s === 'REPROVADO' ? '<span class="nok-txt">Reprovado</span>' : '<span class="info-txt">Informativo (sem critério de aprovação)</span>')) + '</p>');
  });
  h.push('<h3>4.' + (ctx.estudos.length + 1) + ' Verificação dos critérios de aceitação</h3>');
  h.push('<p class="nota">O requisito de cada critério está na seção 3.1. Critério não avaliado não aprova nem reprova; o motivo está no resultado obtido.</p>');
  h.push(SGO_DocA4_tabela_([{ t: 'Estudo' }, { t: 'Critério' }, { t: 'Resultado obtido' }, { t: 'Situação', cls: 'cen' }],
    ctx.criterios.map(function (c) { return [c.estudo, c.criterio, c.obtido, Object.assign(CadeiaFrioRel_reCelSituacao_(c), { cls: 'cen' })]; }), { classe: 'compacta' }));

  // 5. Não conformidades, desvios e observações
  var ncs = [], desvios = [], obs = [];
  ctx.estudos.forEach(function (e) {
    (e.motivosReprovacao || []).forEach(function (m) { ncs.push(e.label + ': ' + m); });
    (e.desviosMetodo || []).forEach(function (m) { desvios.push(e.label + ': ' + m); });
    (e.alertasAnalise || []).concat(e.observacoesAnalise || []).forEach(function (m) { obs.push(e.label + ': ' + m); });
  });
  ((ctx.registradores && ctx.registradores.observacoes) || []).forEach(function (m) { obs.push(m); });
  h.push('<h2>5. Não conformidades, desvios do método e observações</h2>');
  h.push('<h3>5.1 Não conformidades</h3>' + (ncs.length ? SGO_DocA4_lista_(ncs) : '<p>Nenhuma não conformidade foi registrada neste ensaio.</p>'));
  h.push('<h3>5.2 Desvios do método</h3>' + (desvios.length ? SGO_DocA4_lista_(desvios) : '<p>Nenhum desvio do método foi registrado.</p>'));
  h.push('<h3>5.3 Observações</h3>' + (obs.length ? SGO_DocA4_lista_(obs) : '<p>Sem observações adicionais.</p>'));

  // 6. Conclusão
  h.push('<h2>6. Conclusão</h2><div class="prosa">' + SGO_DocA4_paragrafos_(textos.conclusaoGeral) + '</div>');
  h.push('<h3>6.1 Em linguagem simples</h3><div class="leigo">' + SGO_DocA4_paragrafos_(textos.conclusaoLeigo) + '</div>');
  h.push(SGO_DocA4_linhaParecer_(st, 'Parecer deste ensaio', 'Aprovado — o ensaio atende aos critérios de aceitação', 'Reprovado — o ensaio não atende aos critérios de aceitação', 'Informativo — sem critério de aprovação aplicável'));

  // 7. Responsabilidade técnica
  h.push('<div class="manter"><h2>7. Responsabilidade técnica</h2>');
  h.push('<p>Este relatório refere-se exclusivamente ao ensaio identificado. A qualificação do equipamento é declarada no relatório de qualificação, que consolida os relatórios de ensaio aprovados. O resultado foi calculado pelo sistema a partir das leituras do registrador; os textos foram revisados antes da emissão. A reprodução parcial deste documento depende de autorização da empresa executante.</p>');
  if (o.aprovacao) h.push('<p><b>Revisado e aprovado para emissão por</b> ' + esc(o.aprovacao.nome || '—') + (o.aprovacao.perfil ? ' (' + esc(String(o.aprovacao.perfil).toLowerCase()) + ')' : '') + ', em ' + esc(o.aprovacao.em) + ', com registro no sistema. Revisão ' + esc(id.revisao || '0') + ' deste relatório' + (Number(id.revisao) > 0 ? '; as revisões anteriores continuam arquivadas e são substituídas por esta' : '') + '.</p>');
  else if (o.minuta) h.push('<p><b>Aguardando a aprovação do responsável técnico.</b></p>');
  h.push(SGO_DocA4_assinaturas_(o.assinaturas) + '</div>');

  // Anexos
  var letra = 'A';
  var m = ctx.mesclagem;
  if (m && m.sensores && m.sensores.length) {
    h.push('<h2 class="quebra">Anexo ' + letra + ' — Alinhamento dos registradores individuais</h2>');
    h.push('<p>Cada sensor foi registrado por um registrador próprio. As leituras foram alinhadas pela linha do tempo do ' + esc(m.referencia) + ', com tolerância de ' + esc(SGO_DocA4_val_(m.toleranciaSeg, 1, 's')) + ' (metade do intervalo médio). Leitura sem correspondência dentro da tolerância fica em branco e, acima do limite configurado, impede a emissão.</p>');
    h.push(SGO_DocA4_tabela_([{ t: 'Sensor' }, { t: 'Leituras', cls: 'num' }, { t: 'Primeira leitura' }, { t: 'Última leitura' }, { t: 'Sem correspondência', cls: 'num' }, { t: 'Maior diferença de horário (s)', cls: 'num' }],
      m.sensores.map(function (r) { return [r.sensor, String(r.leituras), r.inicio, r.fim, String(r.semCorrespondencia), SGO_DocA4_num_(r.maiorDefasagemSeg, 0)]; }), { classe: 'compacta' }));
    letra = 'B';
  }
  if (o.fotos && o.fotos.length) h.push('<h2 class="quebra">Anexo ' + letra + ' — Registro fotográfico</h2>' + SGO_DocA4_fotos_(o.fotos));
  h.push(SGO_DocA4_fimDocumento_());
  return h.join('\n');
}
