/****************************************************
 * METROLABS — CADEIA DE FRIO — PLANILHA DE DADOS DO ENSAIO (modelo novo, 21/10/2026)
 *
 * Documento A4 em PAISAGEM (HTML para impressão + PDF salvo na pasta do equipamento),
 * no padrão comum SGO_DocA4 e no mesmo molde da planilha de dados da Autoclave a vapor:
 * capa com a ficha do ensaio, índice com as páginas, quadro-resumo dos critérios
 * (valor medido × critério × fonte × situação), condições do ensaio, resultados de
 * cada estudo por sensor, gráficos em SVG estático (perfil de temperatura com a faixa
 * e o evento; mapa dos sensores do mais frio ao mais quente), memória de cálculo
 * (estatísticas, indicações do Anexo G, temperatura cinética média, tempos dos
 * eventos), não conformidades e desvios do método, aprovação e assinaturas e as
 * leituras do registrador folha a folha (cabeçalho em todas as folhas, blocos de 12
 * sensores, marcação dos eventos).
 *
 * Substitui a planilha do Google Planilhas (SGO_CadeiaFrioRel_Planilha.js, "modelo
 * anterior"), que continua no código, sem mudança de conteúdo, e volta só com
 * CADEIAFRIO_PLANILHA_MODELO = ANTERIOR em Chaves e senhas. Documentos já emitidos
 * continuam na pasta do cliente como estão.
 *
 * Os números vêm do mesmo pacote de fatos do relatório de ensaio (CadeiaFrioRel_qContexto_).
 * Emissão pelo fluxo de QUALIF_EMISSOES (módulo CADEIA_FRIO_DADOS, revisões próprias):
 * o responsável técnico emite direto (com a confirmação); os demais enviam para aprovação
 * e recebem a minuta. Dado com problema (travas) não vira documento.
 ****************************************************/

var CADEIAFRIO_PD_LINHAS_FOLHA = 36;
var CADEIAFRIO_PD_LINHAS_PRIMEIRA = 32;
var CADEIAFRIO_PD_SENSORES_POR_BLOCO = 12;

function CadeiaFrioRel_pdE_(s) { return SGO_DocA4_esc_(s); }

/* ============================================================
 * Leituras para as tabelas (com os marcadores dos eventos)
 * ============================================================ */

/** Marcadores de uma análise: { índice da linha no recorte: texto }. */
function CadeiaFrioRel_pdMarcadores_(analise) {
  var m = {}, linhas = analise._dadosFatia || [];
  function marcar(txt, rotulo) {
    if (!txt) return;
    var ms = CadeiaFrioRel_cfConverterTempoParaMs_(txt);
    if (!isFinite(ms)) return;
    for (var i = 0; i < linhas.length; i++) {
      if (CadeiaFrioRel_qMs_(linhas[i]) >= ms) { m[i] = m[i] ? m[i] + '; ' + rotulo : rotulo; return; }
    }
  }
  var t = String(analise.tipoEstudo || '').toUpperCase();
  if (linhas.length) m[0] = 'Início do recorte';
  if (analise.rampaEstabilizacao) marcar(analise.rampaEstabilizacao.fimRampaStr, 'Fim da estabilização');
  if (t === 'ABERTURA_PORTA') { marcar(analise.tempoInicioEvento, 'Abertura da porta'); marcar(analise.tempoFimEvento, 'Fechamento da porta'); }
  if (t === 'QUEDA_ENERGIA') { marcar(analise.tempoInicioEvento, 'Interrupção da energia'); marcar(analise.tempoFimEvento, 'Retorno da energia'); }
  if (analise.primeiraRuptura) marcar(analise.primeiraRuptura.tempoStr, 'Saída da faixa (' + analise.primeiraRuptura.sensor + ')');
  if (analise.primeiraRupturaGlobal) marcar(analise.primeiraRupturaGlobal.tempoStr, 'Primeira leitura fora da faixa (' + analise.primeiraRupturaGlobal.sensor + ')');
  return m;
}

/**
 * Linhas impressas de um estudo: o recorte (eventos: a partir de 5 min antes do evento). Acima do limite
 * configurado, uma leitura a cada intervalo da norma (60 s ou 10 s) ou o passo que caiba; as linhas marcadas
 * sempre entram. Devolve { linhas:[{i, row, marcador, avaliado}], passo, total }.
 */
function CadeiaFrioRel_pdLinhasImpressas_(analise) {
  var linhas = analise._dadosFatia || [];
  var t = String(analise.tipoEstudo || '').toUpperCase();
  var marc = CadeiaFrioRel_pdMarcadores_(analise);
  var ini = 0;
  if (CadeiaFrioRel_qEhEvento_(t) && isFinite(analise.idxInicioEvento)) {
    var msEv = CadeiaFrioRel_qMs_(linhas[analise.idxInicioEvento]) - 5 * 60000;
    while (ini < analise.idxInicioEvento && CadeiaFrioRel_qMs_(linhas[ini]) < msEv) ini++;
  }
  var idxAval = CadeiaFrioRel_qEhDistribuicao_(t) ? (analise.idxInicioAvaliado || 0) : (CadeiaFrioRel_qEhEvento_(t) ? (analise.idxInicioEvento || 0) : 0);
  var total = linhas.length - ini;
  var max = Number(CADEIAFRIO_QCFG.LEITURAS_MAX_IMPRESSAS) || 2000;
  var passo = 1;
  if (total > max) {
    var intervaloMin = CadeiaFrioRel_qIntervaloMin_(linhas) || 1;
    var normaSeg = CadeiaFrioRel_qEhEvento_(t) ? CADEIAFRIO_QCFG.CRITERIOS.intervaloEventoSeg.valor : CADEIAFRIO_QCFG.CRITERIOS.intervaloDistribuicaoSeg.valor;
    passo = Math.max(1, Math.round(normaSeg / (intervaloMin * 60)), Math.ceil(total / max));
  }
  var out = [];
  for (var i = ini; i < linhas.length; i++) {
    if (passo > 1 && (i - ini) % passo !== 0 && !marc[i] && i !== linhas.length - 1) continue;
    out.push({ i: i, row: linhas[i], marcador: marc[i] || (i === linhas.length - 1 ? 'Fim do recorte' : ''), avaliado: i >= idxAval });
  }
  if (marc[0] && out.length && out[0].i !== 0 && ini > 0) out[0].marcador = out[0].marcador || 'Início das leituras impressas';
  return { linhas: out, passo: passo, total: total };
}

/** "dd/mm/aaaa hh:mm:ss" → "dd/mm hh:mm:ss" (a data completa está no título da folha). */
function CadeiaFrioRel_pdHoraCurta_(tempoStr) {
  var m = String(tempoStr || '').match(/^(\d{2}\/\d{2})\/\d{4}\s+(.+)$/);
  return m ? m[1] + ' ' + m[2] : String(tempoStr || '');
}

/** Tabelas paginadas (cabeçalho em todas as folhas): uma por folha. */
function CadeiaFrioRel_pdTabelaPaginada_(linhas, cols, celulas, opcoes) {
  opcoes = opcoes || {};
  // Painéis: com poucos sensores, duas tabelas lado a lado na mesma folha (metade das folhas).
  var paineis = Math.max(1, opcoes.paineis || 1);
  var porFolha = CADEIAFRIO_PD_LINHAS_FOLHA * paineis, primeira = Math.min(CADEIAFRIO_PD_LINHAS_FOLHA, opcoes.primeira || CADEIAFRIO_PD_LINHAS_PRIMEIRA) * paineis;
  var nFolhas = linhas.length <= primeira ? 1 : 1 + Math.ceil((linhas.length - primeira) / porFolha);
  var folhas = [], i = 0;
  for (var k = 0; k < nFolhas; k++) {
    var alvo = Math.ceil((linhas.length - i) / (nFolhas - k));
    if (paineis > 1) alvo = Math.ceil(alvo / paineis) * paineis;
    var tam = Math.min(k === 0 ? primeira : porFolha, alvo);
    folhas.push(linhas.slice(i, i + tam)); i += tam;
  }
  if (i < linhas.length) folhas.push(linhas.slice(i));
  var cab = '<thead><tr>' + cols.map(function (c) { return '<th' + (c.cls ? ' class="' + c.cls + '"' : '') + (c.w ? ' style="width:' + c.w + '"' : '') + '>' + c.t + '</th>'; }).join('') + '</tr></thead>';
  function tabela(rows) {
    return '<table class="t pd-dados">' + cab + '<tbody>' + rows.map(function (l) {
      var cl = opcoes.classeLinha ? opcoes.classeLinha(l) : '';
      return '<tr' + (cl ? ' class="' + cl + '"' : '') + '>' + celulas(l).map(function (c) {
        return '<td' + (c && c.cls ? ' class="' + c.cls + '"' : '') + '>' + (c && c.html !== undefined ? c.html : CadeiaFrioRel_pdE_(c && c.t !== undefined ? c.t : (c == null ? '—' : c))) + '</td>';
      }).join('') + '</tr>';
    }).join('') + '</tbody></table>';
  }
  return folhas.map(function (rows, n) {
    var corpo;
    if (paineis > 1) {
      var tamP = Math.ceil(rows.length / paineis), partes = [];
      for (var p = 0; p < paineis; p++) partes.push(rows.slice(p * tamP, (p + 1) * tamP));
      corpo = '<div class="pd-paineis">' + partes.map(function (pt) { return '<div class="pd-painel">' + (pt.length ? tabela(pt) : '') + '</div>'; }).join('') + '</div>';
    } else corpo = tabela(rows);
    var leg = opcoes.titulo ? opcoes.titulo(n + 1, folhas.length, rows) : '';
    return '<div class="pd-folha' + (n > 0 ? ' pd-nova' : '') + '">' + (leg ? '<p class="leg-tabela">' + leg + '</p>' : '') + corpo + '</div>';
  }).join('');
}

/* ============================================================
 * Gráficos
 * ============================================================ */

/** Mapa dos sensores: faixa mínima–máxima de cada sensor (do mais frio ao mais quente pela média), com a faixa de aceitação. */
function CadeiaFrioRel_pdGraficoMapa_(porSensor, faixa) {
  var itens = (porSensor || []).filter(function (p) { return isFinite(p.min) && isFinite(p.max) && isFinite(p.media); }).slice().sort(function (a, b) { return a.media - b.media; });
  if (!itens.length) return '';
  var W = 980, linha = 17, mL = 54, mR = 20, mT = 10, mB = 34;
  var H = mT + mB + itens.length * linha;
  var ymin = Math.min(faixa.tMin, Math.min.apply(null, itens.map(function (i) { return i.min; })));
  var ymax = Math.max(faixa.tMax, Math.max.apply(null, itens.map(function (i) { return i.max; })));
  var folga = (ymax - ymin) * 0.06 || 1;
  var passo = SGO_DocA4_passo_(ymax - ymin + 2 * folga, 8);
  var v0 = Math.floor((ymin - folga) / passo) * passo, v1 = Math.ceil((ymax + folga) / passo) * passo;
  var pw = W - mL - mR;
  function X(v) { return mL + (v - v0) / (v1 - v0) * pw; }
  function f1(n) { return (Math.round(n * 10) / 10).toString(); }
  var s = ['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '" font-family="Arial, Helvetica, sans-serif" font-size="9.5">', '<rect x="0" y="0" width="' + W + '" height="' + H + '" fill="#ffffff"/>'];
  s.push('<rect x="' + f1(X(faixa.tMin)) + '" y="' + mT + '" width="' + f1(Math.max(0, X(faixa.tMax) - X(faixa.tMin))) + '" height="' + (H - mT - mB) + '" fill="#edf6f0"/>');
  for (var v = v0; v <= v1 + passo / 2; v += passo) {
    s.push('<line x1="' + f1(X(v)) + '" y1="' + mT + '" x2="' + f1(X(v)) + '" y2="' + (H - mB) + '" stroke="#e1e6ec" stroke-width="0.7"/>');
    s.push('<text x="' + f1(X(v)) + '" y="' + (H - mB + 13) + '" text-anchor="middle" fill="#3e4c59">' + CadeiaFrioRel_pdE_(SGO_DocA4_num_(v, passo < 1 ? 1 : 0)) + '</text>');
  }
  itens.forEach(function (it, k) {
    var y = mT + k * linha + linha / 2;
    var fora = it.min < faixa.tMin || it.max > faixa.tMax;
    s.push('<text x="' + (mL - 6) + '" y="' + f1(y + 3) + '" text-anchor="end" fill="#1f2933">' + CadeiaFrioRel_pdE_(it.sensor) + '</text>');
    var xa = X(it.min), xb = Math.max(X(it.max), xa + 3);
    s.push('<rect x="' + f1(xa - 1.5) + '" y="' + f1(y - 3.5) + '" width="' + f1(xb - xa + 3) + '" height="7" rx="3" fill="' + (fora ? '#a61b1b' : '#1f5fa8') + '" fill-opacity="0.85"/>');
    s.push('<circle cx="' + f1(X(it.media)) + '" cy="' + f1(y) + '" r="2.6" fill="#ffffff" stroke="#1f2933" stroke-width="0.9"/>');
  });
  s.push('<text x="' + f1(mL + pw / 2) + '" y="' + (H - 6) + '" text-anchor="middle" fill="#1f2933">Temperatura (°C) — barra: mínima a máxima; círculo: média; faixa verde: faixa de aceitação</text>');
  s.push('</svg>');
  return s.join('');
}

function CadeiaFrioRel_pdFigura_(svg, n, legenda, cheia) {
  return '<div class="' + (cheia ? 'pd-cheia' : 'pd-meia') + '"><figure class="pd-fig"><div class="pd-svg">' + svg + '</div><figcaption><b>Figura ' + n + '</b> — ' + CadeiaFrioRel_pdE_(legenda) + '</figcaption></figure></div>';
}

/* ============================================================
 * Documento
 * ============================================================ */

function CadeiaFrioRel_pdEstilos_() {
  return '' +
    '.capa .pd-capa-corpo{display:flex;gap:9mm;margin-top:7mm;align-items:flex-start}' +
    '.capa .pd-capa-esq{flex:1.45 1 0;border-left:3pt solid #0b3d6e;padding:1mm 0 1mm 6mm}' +
    '.capa .pd-capa-dir{flex:1 1 0}' +
    '.capa .pd-capa-esq h1{font-size:21pt;line-height:1.12;margin:0 0 2mm}' +
    '.capa .pd-capa-esq .sub{font-size:10pt;margin:0 0 4mm}' +
    '.capa table.t{max-width:none}.capa table.ident th{width:21%}.capa table.ident td{width:29%}' +
    '.capa .pd-capa-dir .resultado{margin-top:0}.capa .pd-capa-dir h4{margin:3mm 0 1mm;font-size:9pt;color:#243b53}.capa .pd-capa-dir table.t{font-size:8pt}' +
    'nav.sumario{break-after:page;page-break-after:always}nav.sumario ol{columns:2;column-gap:14mm}nav.sumario li{break-inside:avoid}' +
    '.pd-secao{break-before:page;page-break-before:always}' +
    '.pd-cheia{break-inside:avoid;page-break-inside:avoid;margin:0 0 3mm}.pd-meia{break-inside:avoid;page-break-inside:avoid;margin:0 0 3mm}' +
    '.pd-fig{margin:1mm 0 2mm}.pd-svg svg{display:block;width:100%;height:auto}.pd-cheia .pd-svg svg{max-height:128mm}' +
    'table.t.pd-dados{table-layout:fixed;font-size:7.3pt;line-height:1;margin:0.8mm 0 0}' +
    'table.t.pd-dados th,table.t.pd-dados td{padding:0 1mm;height:4.15mm;white-space:nowrap;overflow:hidden;vertical-align:middle}' +
    'table.t.pd-dados thead th{height:auto;padding:.7mm 1mm;line-height:1.15;white-space:normal;text-align:center;vertical-align:bottom;font-size:7.2pt}' +
    'table.t.pd-dados td.num{text-align:right}table.t.pd-dados td.cen{text-align:center}' +
    'table.t.pd-dados td.frio{background:#e7effb}table.t.pd-dados td.quente{background:#fdeee7}table.t.pd-dados td.fora{color:#a61b1b;font-weight:700}' +
    'table.t.pd-dados tr.fora-aval td{color:#7b8794;font-style:italic}table.t.pd-dados tr.marcada td{background:#fff8e1}' +
    'table.t.pd-dados td.marc{white-space:nowrap;font-size:6.8pt;text-overflow:ellipsis}' +
    '.pd-folha{break-inside:avoid;page-break-inside:avoid}.pd-nova{break-before:page;page-break-before:always}' +
    '.pd-paineis{display:flex;gap:5mm;align-items:flex-start}.pd-painel{flex:1 1 0;min-width:0}' +
    '.pd-legenda-cores{font-size:7.8pt;color:#3e4c59;margin:0 0 1.5mm;text-align:left}' +
    '.pd-legenda-cores span{display:inline-block;padding:0 1.6mm;margin:0 1.2mm 0 0;border:.4pt solid #bcc5cf}' +
    '.pd-passo{border:.6pt solid #bcc5cf;background:#f8fafc;padding:2.2mm 3.4mm;margin:1.5mm 0 3mm;break-inside:avoid;page-break-inside:avoid}' +
    '.pd-passo p{margin:0 0 1.2mm;text-align:left}.pd-passo .eq{font-family:"Times New Roman",Times,serif;font-size:10.5pt}' +
    'table.t td.sit{white-space:nowrap}table.t.pd-resumo td,table.t.pd-resumo th{font-size:8.2pt}' +
    '.pd-secao>h2:first-child{margin-top:0}';
}

/** Topo e rodapé corridos: título e identificação do ensaio no topo; número, revisão e página no rodapé. */
function CadeiaFrioRel_pdEstilosPagina_(doc, linhaTopo2) {
  var t = SGO_DocA4_txtCss_;
  var empresa = doc.empresa || {};
  var rodapeEsq = (empresa.nome || '') + (empresa.cnpj ? ' · CNPJ ' + empresa.cnpj : '');
  var linha = 'border-top:.6pt solid #9aa5b1;vertical-align:top;padding-top:2.2mm;font:7.3pt Arial,Helvetica,sans-serif;color:#616e7c;';
  return '@page{' +
    '@top-right{content:' + t(doc.tituloCurto) + ' "\\A " ' + t(linhaTopo2) + '}' +
    '@bottom-left{content:' + t(rodapeEsq) + ';' + linha + '}' +
    '@bottom-center{content:' + t(doc.rotuloNumero + ' ' + doc.numero + ' · Revisão ' + SGO_DocA4_revisao_(doc.revisao)) + ';' + linha + 'text-align:center}' +
    '@bottom-right{content:"Página " counter(page) " de " counter(pages);' + linha + '}' +
    '}';
}

function CadeiaFrioRel_pdCapa_(doc, ctx, aprovacao, minuta, aviso) {
  var id = ctx.identificacao, esc = CadeiaFrioRel_pdE_;
  var periodo = ctx.estudos.length ? (ctx.estudos[0].fatos.inicioAvaliado || '—') : '—';
  var ficha = [
    ['Cliente', id.cliente], ['CNPJ', id.cnpj || '—'],
    ['Unidade / setor', id.setor || '—'], ['Equipamento', id.equipamentoTipo + (id.tag ? ' — TAG ' + id.tag : '')],
    ['Nº de série', id.numeroSerie || '—'], ['Perfil', ctx.equipamentoLabel],
    ['Estudos', ctx.estudos.map(function (e) { return e.label; }).join('; '), { largo: true }],
    ['Data do ensaio', id.dataDoEnsaio || '—'], ['Início das leituras avaliadas', periodo],
    ['Técnico executor', id.tecnicoExecutor || '—'],
    ['Responsável técnico', aprovacao ? aprovacao.nome : (minuta ? 'Aguardando aprovação' : '—')],
    ['Documento', doc.rotuloNumero + ' ' + doc.numero + ' · Revisão ' + SGO_DocA4_revisao_(doc.revisao), { largo: true }]
  ];
  var regs = (ctx.registradores && ctx.registradores.itens) || [];
  var tabReg = regs.length ? SGO_DocA4_tabela_([{ t: 'Registrador' }, { t: 'Certificado' }, { t: 'Validade', cls: 'cen' }, { t: 'U95', cls: 'num' }],
    regs.map(function (r) { return [r.tag, r.certificado || '—', { t: r.validade || '—', cls: 'cen' }, isFinite(r.incertezaU95) && r.incertezaU95 !== null ? SGO_DocA4_val_(r.incertezaU95, 2, '°C') + (r.fatorK ? ' (k = ' + SGO_DocA4_num_(r.fatorK, 0) + ')' : '') : '—']; }))
    : '<p class="nota">Registrador não informado.</p>';
  return '<section class="capa"><div class="logo"><img src="' + SGO_DocA4_logoDataUri_() + '" alt="Metrolabs"></div>' +
    (aviso ? '<div class="aviso-simulado" style="margin:5mm 0 0">' + esc(aviso) + '</div>' : '') +
    '<div class="pd-capa-corpo"><div class="pd-capa-esq"><p class="tipo">Qualificação térmica — dados do ensaio</p><h1>' + esc(doc.titulo) + '</h1><p class="sub">' + esc(doc.subtitulo) + '</p>' +
    SGO_DocA4_tabelaIdent_(ficha, 'ficha') + '</div><div class="pd-capa-dir">' +
    SGO_DocA4_quadroResultado_({ status: ctx.statusConsolidado, rotulo: 'Resultado do ensaio', texto: ctx.resumoResultado }) +
    '<h4>Registrador de dados e rastreabilidade</h4>' + tabReg +
    '<p class="nota">U95: incerteza expandida do certificado de calibração do registrador (cadastro de padrões da empresa executante).</p>' +
    '</div></div><div class="pe"><p>' + esc(((doc.empresa || {}).nome || '') + ((doc.empresa || {}).cnpj ? ' · CNPJ ' + doc.empresa.cnpj : '')) + '</p><p>' + esc(doc.rotuloNumero + ' ' + doc.numero + ' · Revisão ' + SGO_DocA4_revisao_(doc.revisao)) + '</p></div></section>';
}

function CadeiaFrioRel_pdCorpo_(ctx, resultado, op) {
  var esc = CadeiaFrioRel_pdE_, val = SGO_DocA4_val_, num = SGO_DocA4_num_;
  var h = [], nTab = 0, nFig = 0;
  function tab(txt) { nTab++; return SGO_DocA4_legendaTabela_(nTab, txt); }

  // 1. Quadro-resumo
  h.push('<section class="pd-secao"><h2>1. Quadro-resumo dos resultados</h2>');
  h.push('<p>Cada critério avaliado neste ensaio, com o valor medido, o critério de aceitação e a fonte. "Decide" define o resultado; "Método" confere a forma do ensaio e, quando não atendido, é registrado como desvio do método, sem mudar o resultado. O detalhamento está nas seções 3 a 5 e as leituras, na seção 8.</p>');
  h.push('<div class="manter">' + tab('Verificação dos critérios de aceitação'));
  h.push(SGO_DocA4_tabela_([{ t: 'Estudo' }, { t: 'Critério' }, { t: 'Critério de aceitação' }, { t: 'Valor medido' }, { t: 'Fonte do critério' }, { t: 'Tipo', cls: 'cen' }, { t: 'Situação', cls: 'cen' }],
    ctx.criterios.map(function (c) { return [c.estudo, c.criterio, c.requisito, c.obtido, c.referencia, { t: c.metodo ? 'Método' : 'Decide', cls: 'cen' }, Object.assign(CadeiaFrioRel_reCelSituacao_(c), { cls: 'cen sit' })]; }), { classe: 'pd-resumo' }) + '</div>');
  h.push('</section>');

  // 2. Condições
  h.push('<section class="pd-secao"><h2>2. Condições do ensaio</h2>');
  h.push('<h3>2.1 Parâmetros e sensores</h3>' + SGO_DocA4_tabelaIdent_(ctx.parametros, '', { porLinha: 3 }));
  h.push('<h3>2.2 Escopo, limitações e regra de decisão</h3>' + SGO_DocA4_lista_(ctx.escopo));
  h.push('<h3>2.3 Referências normativas</h3>' + SGO_DocA4_lista_(ctx.normas));
  h.push('</section>');

  // 3. Resultados por estudo
  h.push('<section class="pd-secao"><h2>3. Resultados por estudo</h2>');
  ctx.estudos.forEach(function (e, i) {
    h.push('<div class="manter"><h3>3.' + (i + 1) + ' ' + esc(e.label) + '</h3>' + SGO_DocA4_tabelaIdent_(CadeiaFrioRel_reFichaEstudo_(e), '', { porLinha: 3 }) + '</div>');
    h.push('<div class="manter">' + tab('Estatísticas do trecho avaliado — ' + e.label) + CadeiaFrioRel_reTabelaEstatistica_(e.fatos) + '</div>');
    h.push(tab('Resultados por sensor — ' + e.label) + CadeiaFrioRel_reTabelaSensores_(e));
  });
  h.push('</section>');

  // 4. Gráficos
  h.push('<section class="pd-secao"><h2>4. Gráficos</h2>');
  ctx.estudos.forEach(function (e) {
    var a = CadeiaFrioRel_reAnaliseDoEstudo_(resultado, e.tipoEstudo);
    var g = CadeiaFrioRel_reGraficoEstudo_(a, ctx, { largura: 980, altura: 330 });
    if (g) { nFig++; h.push(CadeiaFrioRel_pdFigura_(g.svg, nFig, 'Temperatura por sensor — ' + e.label + '. ' + g.nota, true)); }
    var mapa = CadeiaFrioRel_pdGraficoMapa_(e.fatos.porSensor, ctx.faixa);
    if (mapa) { nFig++; h.push(CadeiaFrioRel_pdFigura_(mapa, nFig, 'Mapa dos sensores no trecho avaliado — ' + e.label + ' (do mais frio ao mais quente pela média).', true)); }
  });
  h.push('</section>');

  // 5. Memória de cálculo
  h.push('<section class="pd-secao"><h2>5. Memória de cálculo</h2>');
  h.push('<p>Os cálculos usam todas as leituras válidas do trecho avaliado de cada estudo, dos sensores considerados, sem arredondamento intermediário; os valores são apresentados com duas casas decimais.</p>');
  ctx.estudos.forEach(function (e, i) {
    var f = e.fatos, s = f.estatisticas || {};
    h.push('<h3>5.' + (i + 1) + ' ' + esc(e.label) + '</h3>');
    h.push('<div class="pd-passo"><p><b>Estatísticas.</b> n = ' + esc(num(s.n, 0)) + ' leituras (' + esc(num(f.leiturasAvaliadas, 0)) + ' por sensor, ' + esc(num((f.porSensor || []).length, 0)) + ' sensores), de ' + esc(f.inicioAvaliado || '—') + ' a ' + esc(f.fimAvaliado || '—') + '.</p>' +
      '<p class="eq">média = Σ T<sub>i</sub> / n = ' + esc(val(s.media, 2, '°C')) + ' &nbsp;·&nbsp; desvio-padrão = √[Σ (T<sub>i</sub> − média)² / n] = ' + esc(val(s.desvio, 2, '°C')) + '</p>' +
      '<p class="eq">máx. − mín. = ' + esc(num(s.max, 2)) + ' − ' + esc(num(s.min, 2)) + ' = ' + esc(val(s.maxMin, 2, '°C')) + ' &nbsp;·&nbsp; média − mín. = ' + esc(val(s.mediaMin, 2, '°C')) + ' &nbsp;·&nbsp; máx. − média = ' + esc(val(s.maxMedia, 2, '°C')) + '</p></div>');
    if (f.mkt !== null && f.mkt !== undefined) {
      var hr = CADEIAFRIO_QCFG.MKT.energiaAtivacaoKJmol * 1000 / CADEIAFRIO_QCFG.MKT.constanteGasJmolK;
      h.push('<div class="pd-passo"><p><b>Temperatura cinética média (informativa).</b> ΔH/R = ' + esc(num(CADEIAFRIO_QCFG.MKT.energiaAtivacaoKJmol, 3)) + ' kJ/mol ÷ ' + esc(num(CADEIAFRIO_QCFG.MKT.constanteGasJmolK, 4)) + ' J/(mol·K) = ' + esc(num(hr, 0)) + ' K.</p>' +
        '<p class="eq">T<sub>K</sub> = (ΔH/R) / [−ln(Σ e<sup>−(ΔH/R)/T<sub>i</sub></sup> / n)] = ' + esc(val(f.mkt + 273.15, 2, 'K')) + ' → MKT = ' + esc(val(f.mkt, 2, '°C')) + '</p><p>Fonte: ' + esc(CADEIAFRIO_QCFG.MKT.fonte) + '.</p></div>');
    }
    if (CadeiaFrioRel_qEhEvento_(e.tipoEstudo)) {
      var energia = e.tipoEstudo === 'QUEDA_ENERGIA';
      h.push('<div class="pd-passo"><p><b>Tempos do evento.</b> ' + esc(energia ? 'Interrupção da energia' : 'Abertura da porta') + ': ' + esc(f.inicioEvento || '—') + (f.fimEvento ? '; ' + esc(energia ? 'retorno da energia' : 'fechamento') + ': ' + esc(f.fimEvento) + ' (' + esc(CadeiaFrioRel_qDuracao_(f.duracaoEventoMinutos)) + ')' : '') + '.</p>' +
        (f.rompeu ? '<p class="eq">tempo até sair da faixa = ' + esc(f.ruptura ? f.ruptura.tempoStr : '—') + ' − ' + esc(f.inicioEvento) + ' = ' + esc(val(f.tempoAteRupturaMinutos, 2, 'min')) + '</p>' : '<p>Nenhum sensor saiu da faixa a partir do início do evento (saída confirmada por leituras consecutivas).</p>') +
        (f.rompeu && f.recuperouTotalmente ? '<p class="eq">tempo até todos voltarem à faixa = ' + esc(val(f.tempoAteRecuperacaoMinutos, 2, 'min')) + ' (contado do ' + esc(f.fimEvento ? (energia ? 'retorno da energia' : 'fechamento da porta') : 'momento da saída da faixa') + ')</p>' : '') +
        (f.tempoAlvoMinutos ? '<p>Critério: tempo na faixa de ao menos ' + esc(val(f.tempoAlvoMinutos, 0, 'min')) + ' → ' + esc(e.statusAprovacao === 'APROVADO' ? 'atendido' : (e.statusAprovacao === 'REPROVADO' ? 'não atendido' : 'não avaliado')) + '.</p>' : '<p>Sem tempo-alvo informado: estudo de caracterização.</p>') + '</div>');
    }
    if (e.tipoEstudo === 'AUTONOMIA') {
      h.push('<div class="pd-passo"><p><b>Autonomia.</b> ' + esc(f.rompeu ? 'tempo até o primeiro sensor sair da faixa = ' + (f.ruptura ? f.ruptura.tempoStr : '—') + ' − ' + (f.periodoInicio || '—') + ' = ' + val(f.autonomiaMinutos, 2, 'min') : 'nenhum sensor saiu da faixa no período gravado de ' + val(f.duracaoTotalMinutos, 2, 'min')) + '.</p></div>');
    }
    if (f.incertezaRegistrador) {
      h.push('<div class="pd-passo"><p><b>Incerteza e regra de decisão.</b> Incerteza expandida do registrador: ' + esc(val(f.incertezaRegistrador, 2, '°C')) + ' (k = 2). ' + esc(CADEIAFRIO_QCFG.EMISSAO.regraDecisao) + (f.leiturasPertoDoLimite ? ' Leituras a menos de U95 de um limite: ' + esc(num(f.leiturasPertoDoLimite, 0)) + '.' : '') + '</p></div>');
    }
  });
  h.push('</section>');

  // 6. Não conformidades, desvios e observações
  var ncs = [], desvios = [], obs = [];
  ctx.estudos.forEach(function (e) {
    (e.motivosReprovacao || []).forEach(function (m) { ncs.push(e.label + ': ' + m); });
    (e.desviosMetodo || []).forEach(function (m) { desvios.push(e.label + ': ' + m); });
    (e.alertasAnalise || []).concat(e.observacoesAnalise || []).forEach(function (m) { obs.push(e.label + ': ' + m); });
  });
  ((ctx.registradores && ctx.registradores.observacoes) || []).forEach(function (m) { obs.push(m); });
  h.push('<section class="pd-secao"><h2>6. Não conformidades, desvios do método e observações</h2>');
  h.push('<h3>6.1 Não conformidades</h3>' + (ncs.length ? SGO_DocA4_lista_(ncs) : '<p>Nenhuma não conformidade foi registrada neste ensaio.</p>'));
  h.push('<h3>6.2 Desvios do método</h3>' + (desvios.length ? SGO_DocA4_lista_(desvios) : '<p>Nenhum desvio do método foi registrado.</p>'));
  h.push('<h3>6.3 Observações</h3>' + (obs.length ? SGO_DocA4_lista_(obs) : '<p>Sem observações adicionais.</p>'));

  // 7. Responsabilidade técnica
  var id = ctx.identificacao;
  h.push('<div class="manter"><h2>7. Responsabilidade técnica</h2><p>Este documento reúne as leituras do registrador e os cálculos do ensaio identificado na capa e acompanha o relatório de ensaio do mesmo número. Os resultados foram calculados pelo sistema a partir das leituras, com os critérios configurados pela empresa executante. A reprodução parcial deste documento depende de autorização da empresa executante.</p>');
  if (op.aprovacao) h.push('<p><b>Revisado e aprovado para emissão por</b> ' + esc(op.aprovacao.nome || '—') + (op.aprovacao.perfil ? ' (' + esc(String(op.aprovacao.perfil).toLowerCase()) + ')' : '') + ', em ' + esc(op.aprovacao.em) + ', com registro no sistema. Revisão ' + esc(id.revisao || '0') + ' desta planilha' + (Number(id.revisao) > 0 ? '; as revisões anteriores continuam arquivadas e são substituídas por esta' : '') + '.</p>');
  else if (op.minuta) h.push('<p><b>Aguardando a aprovação do responsável técnico.</b></p>');
  h.push(SGO_DocA4_assinaturas_(op.assinaturas) + '</div></section>');

  // 8. Leituras
  h.push('<section class="pd-secao"><h2>8. Leituras do registrador</h2>');
  h.push('<p class="pd-legenda-cores">Cores: <span style="background:#e7effb">sensor mais frio da linha</span><span style="background:#fdeee7">sensor mais quente da linha</span><span style="color:#a61b1b;font-weight:700">fora da faixa de aceitação</span><span style="background:#fff8e1">linha com evento marcado</span><span style="color:#7b8794;font-style:italic">fora do trecho avaliado (estabilização ou antes do evento)</span></p>');
  var faixa = ctx.faixa;
  ctx.estudos.forEach(function (e, k) {
    var a = CadeiaFrioRel_reAnaliseDoEstudo_(resultado, e.tipoEstudo);
    if (!a) return;
    var L = CadeiaFrioRel_pdLinhasImpressas_(a);
    var ativos = [];
    (a.sensoresAtivos || []).forEach(function (x, i) { if (x) ativos.push(i); });
    var blocos = [];
    for (var b = 0; b < ativos.length; b += CADEIAFRIO_PD_SENSORES_POR_BLOCO) blocos.push(ativos.slice(b, b + CADEIAFRIO_PD_SENSORES_POR_BLOCO));
    h.push('<h3' + (k > 0 ? ' class="pd-nova"' : '') + '>8.' + (k + 1) + ' ' + esc(e.label) + '</h3>');
    if (L.passo > 1) h.push('<p class="nota">O estudo tem ' + esc(num(L.total, 0)) + ' leituras por sensor; as tabelas mostram uma leitura a cada ' + L.passo + ' (e todas as linhas com evento marcado). Os cálculos usam todas as leituras; o arquivo completo do registrador fica guardado na pasta de envios do módulo.</p>');
    blocos.forEach(function (sens, bi) {
      var paineis = sens.length <= 4 ? 2 : 1;
      var cols = [{ t: 'Data e hora', w: '23mm' }].concat(sens.map(function (s) { return { t: 'S' + (s + 1) + ' (°C)', cls: 'num' }; })).concat([{ t: 'Evento', w: paineis > 1 ? '30mm' : '40mm' }]);
      h.push(CadeiaFrioRel_pdTabelaPaginada_(L.linhas, cols, function (l) {
        var vals = ativos.map(function (s) { return CadeiaFrioRel_qLeitura_(l.row, s); }).filter(function (v) { return v !== null; });
        var mn = vals.length ? Math.min.apply(null, vals) : null, mx = vals.length ? Math.max.apply(null, vals) : null;
        return [{ t: CadeiaFrioRel_pdHoraCurta_(l.row.tempoStr) }].concat(sens.map(function (s) {
          var v = CadeiaFrioRel_qLeitura_(l.row, s);
          if (v === null) return { t: '—', cls: 'num' };
          var cls = 'num';
          if (vals.length > 1 && v === mn) cls += ' frio'; else if (vals.length > 1 && v === mx) cls += ' quente';
          if (l.avaliado && (Math.round(v * 100) / 100 < faixa.tMin || Math.round(v * 100) / 100 > faixa.tMax)) cls += ' fora';
          return { t: num(v, 2), cls: cls };
        })).concat([{ t: l.marcador || '', cls: 'marc' }]);
      }, {
        primeira: bi === 0 ? CADEIAFRIO_PD_LINHAS_PRIMEIRA - (L.passo > 1 ? 3 : 0) : CADEIAFRIO_PD_LINHAS_FOLHA, paineis: paineis,
        classeLinha: function (l) { return [l.avaliado ? '' : 'fora-aval', l.marcador ? 'marcada' : ''].filter(Boolean).join(' '); },
        titulo: function (n, tot, rows) {
          return '<b>' + esc(e.label) + '</b>' + (blocos.length > 1 ? ' — sensores ' + esc('S' + (sens[0] + 1) + ' a S' + (sens[sens.length - 1] + 1)) : '') + ' — folha ' + n + ' de ' + tot + (rows.length ? ' (' + esc(rows[0].row.tempoStr) + ' a ' + esc(rows[rows.length - 1].row.tempoStr) + ')' : '');
        }
      }));
    });
  });
  h.push('</section>');

  var m = ctx.mesclagem;
  if (m && m.sensores && m.sensores.length) {
    h.push('<section class="pd-secao"><h2>Anexo A — Alinhamento dos registradores individuais</h2><p>Cada sensor foi registrado por um registrador próprio (um arquivo por sensor). As leituras foram alinhadas pela linha do tempo do ' + esc(m.referencia) + ', com tolerância de ' + esc(val(m.toleranciaSeg, 1, 's')) + '. Leitura sem correspondência dentro da tolerância fica em branco nas tabelas.</p>' +
      SGO_DocA4_tabela_([{ t: 'Sensor' }, { t: 'Leituras', cls: 'num' }, { t: 'Primeira leitura' }, { t: 'Última leitura' }, { t: 'Sem correspondência', cls: 'num' }, { t: 'Maior diferença de horário (s)', cls: 'num' }],
        m.sensores.map(function (r) { return [r.sensor, String(r.leituras), r.inicio, r.fim, String(r.semCorrespondencia), num(r.maiorDefasagemSeg, 0)]; })) + '</section>');
  }
  return h.join('\n');
}

/** Documento completo. op: { aprovacao:{nome, perfil, em}|null, minuta:bool }. */
function CadeiaFrioRel_pdMontarHtml_(ctx, interno, op) {
  op = op || {};
  var id = ctx.identificacao;
  var numero = id.certificadoNumero || 'sem número';
  var doc = {
    titulo: 'Planilha de dados do ensaio térmico — Cadeia de frio',
    subtitulo: 'Leituras do registrador, cálculos e gráficos dos estudos de ' + ctx.estudos.map(function (e) { return e.label.toLowerCase(); }).join('; ') + '. Acompanha o relatório de ensaio do mesmo número.',
    tituloCurto: 'Planilha de dados do ensaio térmico — Cadeia de frio',
    rotuloNumero: 'Planilha de dados nº', numero: numero, revisao: id.revisao, empresa: id.empresaExecutante, orientacao: 'paisagem'
  };
  var topo2 = [op.minuta ? 'MINUTA — não entregar ao cliente' : '', id.tag ? 'TAG ' + id.tag : '', id.dataDoEnsaio || ''].filter(Boolean).join(' · ');
  var opDoc = { aprovacao: op.aprovacao || null, minuta: !!op.minuta, assinaturas: CadeiaFrioRel_reListaAssinaturas_(ctx, op.aprovacao) };
  var h = [];
  h.push('<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">');
  h.push('<title>' + CadeiaFrioRel_pdE_(doc.titulo + ' nº ' + numero) + '</title>');
  h.push('<style>' + SGO_DocA4_estilos_(doc) + CadeiaFrioRel_pdEstilosPagina_(doc, topo2) + CadeiaFrioRel_pdEstilos_() + '</style></head><body>');
  h.push('<div class="barra-tela"><button type="button" onclick="window.print()">Imprimir ou salvar em PDF</button></div>');
  h.push('<main class="folha">');
  h.push('<div class="cab-tela"><img src="' + SGO_DocA4_logoDataUri_() + '" alt="Metrolabs"><div class="meta">' + CadeiaFrioRel_pdE_(doc.tituloCurto) + '<br>' + CadeiaFrioRel_pdE_(doc.rotuloNumero + ' ' + numero + ' · Revisão ' + SGO_DocA4_revisao_(doc.revisao)) + '</div></div>');
  var aviso = opDoc.minuta ? 'MINUTA PARA CONFERÊNCIA DO RESPONSÁVEL TÉCNICO — documento ainda não aprovado; não entregar ao cliente.'
    : (ctx.simulado ? 'Documento de uso interno, gerado com dados reconstituídos. Não representa ensaio real e não pode ser entregue ao cliente.' : '');
  h.push(CadeiaFrioRel_pdCapa_(doc, ctx, opDoc.aprovacao, opDoc.minuta, aviso));
  h.push(SGO_DocA4_marcadorSumario_());
  h.push(CadeiaFrioRel_pdCorpo_(ctx, (interno && interno.resultado) || {}, opDoc));
  h.push(SGO_DocA4_fimDocumento_());
  // Minuta e prévia não passam pela paginação do PDF: o sumário sai com as seções, sem os números de página.
  return opDoc.minuta ? SGO_DocA4_prepararSumario_(h.join('\n')).html : h.join('\n');
}

/* ============================================================
 * API — geração, emissão e aprovação (QUALIF_EMISSOES, módulo CADEIA_FRIO_DADOS)
 * ============================================================ */

function CadeiaFrioRel_pdValidar_(payload) {
  var interno = {};
  var ctx = CadeiaFrioRel_qContexto_(payload, interno);
  if (ctx.emissaoBloqueada) CadeiaFrioRel_exigirSemTravas_(ctx.travas);
  if (!payload.modoRelatorioSimulado && !ctx.identificacao.certificadoNumero) throw new Error('Informe o número do relatório na seção 6 (a planilha de dados usa o mesmo número) e gere de novo.');
  return { contexto: ctx, interno: interno };
}

function CadeiaFrioRel_pdEmitir_(payload, validado, sessao, idPendente) {
  var ctx = validado.contexto;
  var numero = ctx.identificacao.certificadoNumero;
  var simulado = !!payload.modoRelatorioSimulado;
  var modulo = CADEIAFRIO_QCFG.MODULO_DADOS;
  var revisao = simulado ? (parseInt(ctx.identificacao.revisao, 10) || 0) : SGO_QE_proximaRevisao_(modulo, numero, ctx.identificacao.revisao);
  ctx.identificacao.revisao = String(revisao);
  var aprovacao = simulado ? null : { nome: SGO_QE_nomeSessao_(sessao), login: String((sessao && sessao.usuario) || ''), perfil: String((sessao && sessao.perfil) || ''), em: SGO_QE_agora_() };
  var html = CadeiaFrioRel_pdMontarHtml_(ctx, validado.interno, { aprovacao: aprovacao, minuta: false });
  var r = SGO_DocSalvar_finalizarCertificado_(html, Object.assign({}, payload, { certRevisao: String(revisao) }), CadeiaFrioRel_pastaLaudos_, 'Planilha de dados Cadeia de Frio' + (revisao ? ' rev ' + revisao : ''), CadeiaFrioRel_CFCFG.TZ);
  if (!simulado) {
    var campos = { STATUS: 'EMITIDO', REVISAO: String(revisao), APROVADO_POR: aprovacao.nome, APROVADO_LOGIN: aprovacao.login, APROVADO_PERFIL: aprovacao.perfil, APROVADO_EM: aprovacao.em, PDF_ID: r.pdfId || '', HTML_ID: r.htmlId || '', RESULTADO: ctx.statusConsolidado };
    var id = idPendente;
    if (id) SGO_QE_atualizar_(id, campos);
    else id = SGO_QE_registrar_(Object.assign(CadeiaFrioRel_reCamposRegistro_(ctx, payload, sessao, modulo), campos));
    SGO_QE_marcarSubstituidas_(modulo, numero, id);
    r.emissaoId = id;
  }
  r.revisao = revisao;
  r.aprovadoPor = aprovacao ? aprovacao.nome : '';
  r.statusAprovacao = ctx.statusConsolidado;
  r.estudos = ctx.estudos.map(function (e) { return { tipoEstudo: e.tipoEstudo, statusAprovacao: e.statusAprovacao, motivosReprovacao: e.motivosReprovacao, alertasAnalise: e.alertasAnalise }; });
  r.pdfNome = r.salvoNaPasta ? 'Planilha de dados Cadeia de Frio' + (numero ? ' - ' + numero : '') + (revisao ? ' rev ' + revisao : '') : '';
  return r;
}

/**
 * Botão "Gerar planilha de dados". Responsável técnico: emite (com a confirmação); demais perfis: envia
 * para aprovação e recebe a minuta. Relatório interno: gera sem gravar na pasta do cliente e sem aprovação.
 */
function CadeiaFrioRel_apiGerarPlanilhaDados(payload, sessao) {
  payload = payload || {};
  var validado = CadeiaFrioRel_pdValidar_(payload);
  var base = { ok: true, modeloPlanilha: 'NOVO', statusAprovacao: validado.contexto.statusConsolidado };
  if (payload.modoRelatorioSimulado) {
    return Object.assign(base, CadeiaFrioRel_pdEmitir_(payload, validado, sessao, ''), { emitido: false, mensagem: 'Planilha de dados de uso interno gerada (não é salva na pasta do cliente).' });
  }
  if (CadeiaFrioRel_ehAprovador_(sessao)) {
    if (payload.confirmacaoRevisao !== true) throw new Error('Confirme que conferiu os dados do ensaio e aprova a emissão da planilha de dados (a aprovação fica registrada com o seu nome, a data e a hora).');
    var r = CadeiaFrioRel_pdEmitir_(payload, validado, sessao, '');
    return Object.assign(base, r, { emitido: true, mensagem: 'Planilha de dados emitida (revisão ' + r.revisao + ') e salva na pasta do equipamento.' });
  }
  var id = SGO_QE_registrar_(Object.assign(CadeiaFrioRel_reCamposRegistro_(validado.contexto, payload, sessao, CADEIAFRIO_QCFG.MODULO_DADOS), {
    STATUS: 'AGUARDANDO_APROVACAO', PAYLOAD_JSON: JSON.stringify(Object.assign({}, payload, { fotosCertificado: [] }))
  }));
  return Object.assign(base, { html: CadeiaFrioRel_pdMontarHtml_(validado.contexto, validado.interno, { aprovacao: null, minuta: true }), emitido: false, aguardandoAprovacao: true, id: id,
    mensagem: 'Planilha de dados enviada para aprovação do responsável técnico (registro ' + id + '). A minuta abriu em outra aba para conferência; o responsável técnico emite em "7. Aguardando aprovação".' });
}

function CadeiaFrioRel_pdPreverPendente_(reg, payload) {
  var v = CadeiaFrioRel_pdValidar_(payload);
  if (CadeiaFrioRel_assinaturaCtx_(v.contexto) !== reg.HASH_CONTEXTO) throw new Error('Os dados mudaram desde o envio para aprovação (por exemplo, o cadastro do registrador). Devolva ao técnico para gerar a planilha de novo.');
  return { ok: true, html: CadeiaFrioRel_pdMontarHtml_(v.contexto, v.interno, { aprovacao: null, minuta: true }) };
}

function CadeiaFrioRel_pdAprovarPendente_(reg, payload, sessao) {
  var v = CadeiaFrioRel_pdValidar_(payload);
  if (CadeiaFrioRel_assinaturaCtx_(v.contexto) !== reg.HASH_CONTEXTO) throw new Error('Os dados mudaram desde o envio para aprovação. Devolva ao técnico para gerar a planilha de novo.');
  return CadeiaFrioRel_pdEmitir_(payload, v, sessao, reg.ID);
}
