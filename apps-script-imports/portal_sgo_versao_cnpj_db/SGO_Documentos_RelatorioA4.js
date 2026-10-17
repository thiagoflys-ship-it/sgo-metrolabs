/****************************************************
 * MOLDURA A4 DOS RELATÓRIOS GERENCIAIS (17/10/2026)
 *
 * Usada pelos relatórios da Frota (por veículo e geral), do Programa de
 * conduta (fechamento mensal, relatório semanal, prestação de missões e
 * extrato do colaborador) e do Inventário de equipamentos.
 *
 * Segue o padrão SGO_DocA4 (SGO_DocA4_css_ / SGO_DocA4_num_): texto
 * justificado, cabeçalho de tabela repetido, quebras de página e
 * "Página X de Y" no rodapé. Aqui só se acrescenta:
 *  - topo com a logo na primeira página e cabeçalho corrido nas demais
 *    (caixas de margem do @page: empresa/título à esquerda, identificação
 *    à direita, emissão no rodapé à esquerda);
 *  - blocos prontos (seção, indicadores, tabela, gráfico em SVG);
 *  - análise do período pela IA (Gemini com raciocínio ligado), sempre
 *    com um texto padrão montado dos mesmos números quando a IA não está
 *    disponível — o relatório nunca deixa de sair;
 *  - gravação do HTML + PDF na pasta (SGO_DocSalvar), sem nunca lançar.
 *
 * Nenhuma função devolve Date: só texto.
 ****************************************************/

var RELA4_TZ = 'America/Sao_Paulo';
var RELA4_MODELO_PADRAO = 'gemini-2.5-flash';
var RELA4_FALLBACKS_PADRAO = ['gemini-2.0-flash-lite'];
var RELA4_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/';

function RelA4_esc_(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/** Número pt-BR (1.234,56). Texto/NaN vira "—". Nunca toFixed cru. */
function RelA4_num_(v, casas) {
  if (v === null || v === undefined || v === '') return '—';
  var n = typeof v === 'number' ? v : Number(v);
  if (!isFinite(n)) return '—';
  return SGO_DocA4_num_(n, casas === undefined ? (Math.round(n) === n ? 0 : 2) : casas);
}
function RelA4_moeda_(v) { var n = Number(v); return 'R$ ' + SGO_DocA4_num_(isFinite(n) ? n : 0, 2); }
function RelA4_plural_(n, singular, plural) { return RelA4_num_(n, 0) + ' ' + (Number(n) === 1 ? singular : plural); }
function RelA4_agora_() { return Utilities.formatDate(new Date(), RELA4_TZ, 'dd/MM/yyyy HH:mm'); }

var RELA4_MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
/** '2026-09' -> 'setembro de 2026'. */
function RelA4_competencia_(comp) {
  var m = /^(\d{4})-(\d{2})/.exec(String(comp || ''));
  if (!m) return String(comp || '');
  return RELA4_MESES[Number(m[2]) - 1] + ' de ' + m[1];
}
/** 'aaaa-mm-dd' (ou ISO completo) -> 'dd/mm/aaaa'; outro formato passa como está. */
function RelA4_dataBr_(v) {
  var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(v || ''));
  return m ? m[3] + '/' + m[2] + '/' + m[1] : String(v || '');
}

function RelA4_empresa_() {
  var e = (typeof CadeiaFrioRel_CFCFG !== 'undefined' && CadeiaFrioRel_CFCFG.EMPRESA_EXECUTANTE) || {};
  return { nome: e.nome || 'Metrolab Soluções em Engenharia Clínica LTDA', cnpj: e.cnpj || '', site: e.site || '', telefone: e.telefone || '' };
}
function RelA4_logo_() {
  var l = (typeof CadeiaFrioRel_CFCFG !== 'undefined' && CadeiaFrioRel_CFCFG.LOGO_BASE64) || null;
  return l && l.data ? 'data:' + (l.mimeType || 'image/png') + ';base64,' + l.data : '';
}
function RelA4_cssTexto_(s) {
  return '"' + String(s == null ? '' : s).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/[\r\n]+/g, ' ') + '"';
}

/**
 * Documento completo.
 * o: { titulo, subtitulo, identificacao, corpo, cor, paisagem, emitidoPor }
 */
function RelA4_documento_(o) {
  o = o || {};
  var cor = o.cor || '#0b4ea2';
  var empresa = RelA4_empresa_();
  var logo = RelA4_logo_();
  var emissao = RelA4_agora_();
  var largura = o.paisagem ? 1180 : 900;
  var css = [
    '@page { size: A4' + (o.paisagem ? ' landscape' : '') + '; margin: 19mm 14mm 17mm 14mm;',
    '  @top-left { content: ' + RelA4_cssTexto_("Metrolab's · " + (o.titulo || '')) + '; font: 8px Arial, Helvetica, sans-serif; color: #6b7280; }',
    '  @top-right { content: ' + RelA4_cssTexto_(o.identificacao || '') + '; font: 8px Arial, Helvetica, sans-serif; color: #6b7280; }',
    '  @bottom-left { content: ' + RelA4_cssTexto_('Emitido pelo SGO+ em ' + emissao) + '; font: 8px Arial, Helvetica, sans-serif; color: #6b7280; } }',
    '@page :first { @top-left { content: none; } @top-right { content: none; } }',
    '* { box-sizing: border-box; }',
    'body { font-family: Arial, Helvetica, sans-serif; color: #1f2937; font-size: 11.5px; line-height: 1.5; margin: 0; background: #eef1f5; }',
    '.folha { max-width: ' + largura + 'px; margin: 18px auto 30px; background: #fff; padding: 26px 32px 30px; box-shadow: 0 1px 8px rgba(15,23,42,.12); }',
    '.barra-tela { max-width: ' + largura + 'px; margin: 14px auto 0; display: flex; justify-content: flex-end; gap: 8px; }',
    '.barra-tela button { background: ' + cor + '; color: #fff; border: 0; padding: 9px 16px; border-radius: 4px; font-weight: 700; font-size: 12.5px; cursor: pointer; }',
    '.aviso-tela { max-width: ' + largura + 'px; margin: 10px auto 0; padding: 9px 12px; border-radius: 4px; font-size: 12.5px; line-height: 1.45; }',
    '.aviso-tela.ok { background: #ecfdf5; border: 1px solid #a7f3d0; color: #065f46; }',
    '.aviso-tela.alerta { background: #fffbeb; border: 1px solid #fcd34d; color: #78350f; }',
    '.aviso-tela a { color: inherit; font-weight: 700; }',
    '.topo { display: flex; align-items: center; justify-content: space-between; gap: 18px; border-bottom: 3px solid ' + cor + '; padding-bottom: 12px; margin-bottom: 16px; }',
    '.topo img { height: 46px; max-width: 190px; object-fit: contain; }',
    '.topo .titulos { text-align: right; }',
    '.topo h1 { font-size: 18px; margin: 0 0 3px; color: ' + cor + '; font-weight: 800; }',
    '.topo .sub { font-size: 11.5px; color: #4b5563; margin: 0; text-align: right; }',
    '.topo .ident { display: inline-block; margin-top: 6px; font-size: 10.5px; font-weight: 700; color: ' + cor + '; border: 1px solid ' + cor + '; border-radius: 3px; padding: 2px 8px; }',
    '.secao { margin-top: 18px; }',
    '.secao > h2 { font-size: 13px; color: #111827; margin: 0 0 9px; padding: 0 0 5px 10px; border-left: 4px solid ' + cor + '; border-bottom: 1px solid #e5e7eb; font-weight: 700; }',
    '.secao > h3, .secao h3 { font-size: 12px; color: #1f2937; margin: 12px 0 6px; }',
    '.secao p { margin: 6px 0; }',
    '.kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin: 6px 0 4px; }',
    '.kpi { border: 1px solid #dbe1ea; border-radius: 4px; padding: 8px 10px; text-align: center; break-inside: avoid; }',
    '.kpi .v { display: block; font-size: 17px; font-weight: 800; color: ' + cor + '; line-height: 1.25; }',
    '.kpi .r { display: block; font-size: 10px; color: #4b5563; margin-top: 2px; }',
    'table.dados { width: 100%; border-collapse: collapse; font-size: 10.5px; margin: 6px 0 10px; }',
    'table.dados th { background: #f1f5f9; color: #1f2937; font-weight: 700; text-align: left; padding: 5px 6px; border: 1px solid #dbe1ea; }',
    'table.dados td { padding: 4px 6px; border: 1px solid #e2e8f0; vertical-align: top; overflow-wrap: anywhere; }',
    'table.dados tbody tr:nth-child(even) td { background: #fafbfc; }',
    'table.dados tr.total td { font-weight: 700; background: #f1f5f9; }',
    'table.ident { width: 100%; border-collapse: collapse; font-size: 11px; margin: 4px 0 8px; }',
    'table.ident td { border: 1px solid #e2e8f0; padding: 5px 8px; vertical-align: top; }',
    'table.ident td.rot { width: 28%; background: #f8fafc; color: #374151; font-weight: 700; }',
    '.analise p { text-align: justify; margin: 6px 0; }',
    '.analise ul { margin: 6px 0 6px 18px; padding: 0; } .analise li { margin: 3px 0; }',
    '.nota { font-size: 10px; color: #4b5563; margin: 6px 0; }',
    '.marca { display: inline-block; padding: 1px 7px; border-radius: 9px; font-size: 10px; font-weight: 700; white-space: nowrap; }',
    '.marca.ok { background: #dcfce7; color: #14532d; } .marca.aviso { background: #fef3c7; color: #78350f; } .marca.critico { background: #fee2e2; color: #7f1d1d; } .marca.neutra { background: #e5e7eb; color: #374151; }',
    '.caixa { border: 1px solid #dbe1ea; border-left: 4px solid ' + cor + '; background: #f8fafc; padding: 8px 11px; margin: 8px 0; break-inside: avoid; }',
    '.caixa.aviso { border-left-color: #d97706; background: #fffbeb; } .caixa.critico { border-left-color: #dc2626; background: #fef2f2; } .caixa.ok { border-left-color: #16a34a; background: #f0fdf4; }',
    '.grafico { margin: 8px 0 12px; break-inside: avoid; } .grafico .tit { font-size: 11px; font-weight: 700; color: #1f2937; margin-bottom: 4px; }',
    '.duas { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }',
    '.assinaturas { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 46px; }',
    '.assinaturas .linha { border-top: 1px solid #374151; text-align: center; padding-top: 5px; font-size: 10.5px; }',
    '.fim { margin-top: 22px; padding-top: 8px; border-top: 1px solid #e5e7eb; font-size: 9.5px; color: #6b7280; text-align: center; }',
    '@media print { body { background: #fff; } .folha { box-shadow: none; margin: 0; padding: 0; max-width: none; } .no-print { display: none !important; } }',
    '@media (max-width: 640px) { .folha { padding: 16px; margin: 8px; } .kpis { grid-template-columns: repeat(2, 1fr); } .duas { grid-template-columns: 1fr; } .topo { flex-direction: column; align-items: flex-start; } .topo .titulos, .topo .sub { text-align: left; } table.dados { font-size: 10px; } }',
    SGO_DocA4_css_()
  ].join('\n');

  var h = [];
  h.push('<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">');
  h.push('<title>' + RelA4_esc_((o.titulo || 'Relatório') + (o.identificacao ? ' — ' + o.identificacao : '')) + '</title>');
  h.push('<style>' + css + '</style></head><body>');
  h.push('<div class="barra-tela no-print"><button type="button" onclick="window.print()">Imprimir ou salvar em PDF</button></div>');
  h.push('<!--RELA4_AVISOS-->');
  h.push('<main class="folha">');
  h.push('<header class="topo">' + (logo ? '<img src="' + logo + '" alt="Metrolab\'s">' : '<div></div>') +
    '<div class="titulos"><h1>' + RelA4_esc_(o.titulo || 'Relatório') + '</h1>' +
    (o.subtitulo ? '<p class="sub">' + RelA4_esc_(o.subtitulo) + '</p>' : '') +
    (o.identificacao ? '<span class="ident">' + RelA4_esc_(o.identificacao) + '</span>' : '') + '</div></header>');
  h.push(o.corpo || '');
  h.push('<div class="fim">' + RelA4_esc_(empresa.nome) + (empresa.cnpj ? ' · CNPJ ' + RelA4_esc_(empresa.cnpj) : '') +
    '<br>Documento emitido pelo SGO+ em ' + RelA4_esc_(emissao) + (o.emitidoPor ? ' por ' + RelA4_esc_(o.emitidoPor) : '') + '.</div>');
  h.push('</main></body></html>');
  return h.join('\n');
}

/** Faixas só de tela (somem na impressão). avisos: [{tipo:'ok'|'alerta', html}] — html já escapado. */
function RelA4_injetarAvisos_(html, avisos) {
  var faixas = (avisos || []).filter(function (a) { return a && a.html; }).map(function (a) {
    return '<div class="aviso-tela no-print ' + (a.tipo === 'ok' ? 'ok' : 'alerta') + '">' + a.html + '</div>';
  }).join('');
  return String(html || '').replace('<!--RELA4_AVISOS-->', faixas);
}

function RelA4_secao_(titulo, conteudo) {
  return '<section class="secao"><h2>' + RelA4_esc_(titulo) + '</h2>' + (conteudo || '') + '</section>';
}

/** itens: [[valor, rótulo], ...] — valor já formatado (texto). */
function RelA4_kpis_(itens) {
  return '<div class="kpis">' + (itens || []).map(function (k) {
    return '<div class="kpi"><span class="v">' + RelA4_esc_(k[0]) + '</span><span class="r">' + RelA4_esc_(k[1]) + '</span></div>';
  }).join('') + '</div>';
}

/** pares: [[rótulo, valor], ...] em tabela de identificação de 2 colunas. */
function RelA4_identificacao_(pares) {
  return '<table class="ident"><tbody>' + (pares || []).map(function (p) {
    return '<tr><td class="rot">' + RelA4_esc_(p[0]) + '</td><td>' + RelA4_esc_(p[1] === '' || p[1] == null ? '—' : p[1]) + '</td></tr>';
  }).join('') + '</tbody></table>';
}

/**
 * colunas: [{t:'Título', num:true}] ; linhas: [[célula, ...]] (texto, escapado aqui;
 * objeto {html:'...'} passa sem escapar); opts: { vazio, total: [células] }.
 */
function RelA4_tabela_(colunas, linhas, opts) {
  opts = opts || {};
  if (!linhas || !linhas.length) return '<p class="nota">' + RelA4_esc_(opts.vazio || 'Nenhum registro no período.') + '</p>';
  function cel(v, i, tag) {
    var c = colunas[i] || {};
    var conteudo = v && typeof v === 'object' && v.html !== undefined ? v.html : RelA4_esc_(v === '' || v == null ? '—' : v);
    var data = typeof v === 'string' && /^\d{2}\/\d{2}\/\d{4}$/.test(v);
    return '<' + tag + (c.num ? ' class="num"' : '') + (data ? ' style="white-space:nowrap"' : '') + '>' + conteudo + '</' + tag + '>';
  }
  var h = '<table class="dados"><thead><tr>' + colunas.map(function (c, i) { return cel({ html: RelA4_esc_(c.t) }, i, 'th'); }).join('') + '</tr></thead><tbody>';
  h += linhas.map(function (l) { return '<tr>' + l.map(function (v, i) { return cel(v, i, 'td'); }).join('') + '</tr>'; }).join('');
  if (opts.total) h += '<tr class="total">' + opts.total.map(function (v, i) { return cel(v === '' ? { html: '' } : v, i, 'td'); }).join('') + '</tr>';
  return h + '</tbody></table>';
}

function RelA4_marca_(texto, tipo) { return { html: '<span class="marca ' + (tipo || 'neutra') + '">' + RelA4_esc_(texto) + '</span>' }; }

/** Texto (parágrafos separados por linha em branco; linhas "- " viram lista) em HTML justificado. */
function RelA4_paragrafos_(texto) {
  var linhas = String(texto || '').replace(/\r/g, '').split('\n'), out = [], par = [], itens = [];
  function fp() { if (par.length) { out.push('<p>' + RelA4_esc_(par.join(' ')) + '</p>'); par = []; } }
  function fl() { if (itens.length) { out.push('<ul>' + itens.map(function (i) { return '<li>' + RelA4_esc_(i) + '</li>'; }).join('') + '</ul>'); itens = []; } }
  linhas.forEach(function (l) {
    var t = l.trim(), m = /^(?:[-*•]|\d{1,2}[.)])\s+(.+)$/.exec(t);
    if (!t) { fp(); fl(); } else if (m) { fp(); itens.push(m[1]); } else { fl(); par.push(t); }
  });
  fp(); fl();
  return '<div class="analise">' + (out.join('') || '<p>—</p>') + '</div>';
}

/** Barras horizontais em SVG (o PDF não executa script). itens: [{rotulo, valor, rotuloValor}] */
function RelA4_barras_(itens, opts) {
  opts = opts || {};
  itens = (itens || []).filter(function (i) { return isFinite(Number(i.valor)); });
  if (!itens.length) return '<p class="nota">' + RelA4_esc_(opts.vazio || 'Sem dados no período.') + '</p>';
  var W = 640, hb = 18, gap = 7, esq = 150, dir = 90, topo = 4;
  var H = topo * 2 + itens.length * (hb + gap);
  var larg = W - esq - dir;
  var max = Math.max.apply(null, itens.map(function (i) { return Math.max(Number(i.valor), 0); }).concat([0.0001]));
  var cor = opts.cor || '#0b4ea2';
  var s = ['<svg viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-width:' + W + 'px;height:auto" role="img">'];
  itens.forEach(function (i, k) {
    var y = topo + k * (hb + gap), w = Math.max(Number(i.valor), 0) / max * larg;
    s.push('<text x="' + (esq - 6) + '" y="' + (y + hb / 2 + 4) + '" font-size="10.5" fill="#374151" text-anchor="end" font-family="Arial,sans-serif">' + RelA4_esc_(String(i.rotulo).slice(0, 26)) + '</text>');
    s.push('<rect x="' + esq + '" y="' + y + '" width="' + Math.max(w, 1).toFixed(1) + '" height="' + hb + '" fill="' + (i.cor || cor) + '" rx="2"/>');
    s.push('<text x="' + (esq + w + 5).toFixed(1) + '" y="' + (y + hb / 2 + 4) + '" font-size="10.5" fill="#111827" font-family="Arial,sans-serif">' + RelA4_esc_(i.rotuloValor) + '</text>');
  });
  s.push('</svg>');
  return '<div class="grafico">' + (opts.titulo ? '<div class="tit">' + RelA4_esc_(opts.titulo) + '</div>' : '') + s.join('') + '</div>';
}

/**
 * Colunas verticais em SVG com linhas de referência.
 * itens: [{rotulo, valor (null = sem dado), cor, rotuloValor}] ; opts: {min, max, linhas:[{valor, rotulo, cor}], titulo}
 */
function RelA4_colunas_(itens, opts) {
  opts = opts || {};
  var W = 640, H = 210, esq = 34, dir = 10, topo = 12, base = 30;
  var min = opts.min !== undefined ? opts.min : 0, max = opts.max !== undefined ? opts.max : Math.max.apply(null, itens.map(function (i) { return Number(i.valor) || 0; }).concat([1]));
  var alt = H - topo - base, larg = W - esq - dir, passo = larg / Math.max(itens.length, 1), wb = Math.min(46, passo * 0.6);
  function y(v) { return topo + alt - (Math.max(min, Math.min(max, v)) - min) / (max - min || 1) * alt; }
  var s = ['<svg viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-width:' + W + 'px;height:auto" role="img">'];
  s.push('<line x1="' + esq + '" y1="' + (topo + alt) + '" x2="' + (W - dir) + '" y2="' + (topo + alt) + '" stroke="#9ca3af" stroke-width="1"/>');
  [min, (min + max) / 2, max].forEach(function (v) { s.push('<text x="' + (esq - 4) + '" y="' + (y(v) + 3) + '" font-size="9" fill="#6b7280" text-anchor="end" font-family="Arial,sans-serif">' + RelA4_num_(v, 0) + '</text>'); });
  (opts.linhas || []).forEach(function (l) {
    s.push('<line x1="' + esq + '" y1="' + y(l.valor).toFixed(1) + '" x2="' + (W - dir) + '" y2="' + y(l.valor).toFixed(1) + '" stroke="' + l.cor + '" stroke-width="1" stroke-dasharray="5 4"/>');
    s.push('<text x="' + (esq + 4) + '" y="' + (y(l.valor) - 3).toFixed(1) + '" font-size="9" fill="' + l.cor + '" text-anchor="start" font-family="Arial,sans-serif">' + RelA4_esc_(l.rotulo) + '</text>');
  });
  itens.forEach(function (i, k) {
    var cx = esq + passo * k + passo / 2;
    if (i.valor !== null && i.valor !== undefined && isFinite(Number(i.valor))) {
      var yy = y(Number(i.valor));
      s.push('<rect x="' + (cx - wb / 2).toFixed(1) + '" y="' + yy.toFixed(1) + '" width="' + wb.toFixed(1) + '" height="' + Math.max(topo + alt - yy, 1).toFixed(1) + '" fill="' + (i.cor || '#0b4ea2') + '" rx="2"/>');
      s.push('<text x="' + cx.toFixed(1) + '" y="' + (yy - 4).toFixed(1) + '" font-size="10" fill="#111827" text-anchor="middle" font-family="Arial,sans-serif">' + RelA4_esc_(i.rotuloValor !== undefined ? i.rotuloValor : RelA4_num_(i.valor, 1)) + '</text>');
    } else {
      s.push('<text x="' + cx.toFixed(1) + '" y="' + (topo + alt - 6) + '" font-size="9.5" fill="#9ca3af" text-anchor="middle" font-family="Arial,sans-serif">sem dado</text>');
    }
    s.push('<text x="' + cx.toFixed(1) + '" y="' + (H - base + 14) + '" font-size="10" fill="#374151" text-anchor="middle" font-family="Arial,sans-serif">' + RelA4_esc_(i.rotulo) + '</text>');
  });
  s.push('</svg>');
  return '<div class="grafico">' + (opts.titulo ? '<div class="tit">' + RelA4_esc_(opts.titulo) + '</div>' : '') + s.join('') + '</div>';
}

// ------------------------------------------------------------
// ANÁLISE PELA IA (Gemini) — raciocínio ligado; sem chave ou com falha,
// devolve o texto padrão e o aviso para a tela.
// ------------------------------------------------------------
function RelA4_iaConfig_() {
  var props = PropertiesService.getScriptProperties();
  var modelo = String(props.getProperty('IA_MODEL') || '').trim() || RELA4_MODELO_PADRAO;
  var fb = String(props.getProperty('IA_MODEL_FALLBACKS') || '').trim();
  var lista = [modelo];
  (fb ? fb.split(',').map(function (m) { return m.trim(); }).filter(Boolean) : RELA4_FALLBACKS_PADRAO).forEach(function (m) { if (lista.indexOf(m) < 0) lista.push(m); });
  return { chave: String(props.getProperty('GEMINI_API_KEY') || '').trim(), modelos: lista };
}

/** Modelos 2.5 em diante aceitam raciocínio configurável; os anteriores recusam o campo. */
function RelA4_aceitaRaciocinio_(modelo) { return /gemini-(2\.5|[3-9])/i.test(String(modelo || '')); }

/**
 * Chamada de texto ao Gemini. Lança erro com mensagem legível.
 * opts: { tokens (resposta, padrão 2048), raciocinio (orçamento, padrão 4096), temperatura }
 */
function RelA4_gemini_(prompt, opts) {
  opts = opts || {};
  var cfg = RelA4_iaConfig_();
  if (!cfg.chave) {
    var e = new Error('A chave da IA não está cadastrada.');
    e.semChave = true;
    throw e;
  }
  var erros = [];
  for (var mi = 0; mi < cfg.modelos.length; mi++) {
    var modelo = cfg.modelos[mi], erroModelo = 'falha não identificada';
    var tokens = opts.tokens || 2048, raciocinio = opts.raciocinio || 4096;
    for (var tent = 0; tent < 3; tent++) {
      if (tent > 0) Utilities.sleep(tent === 1 ? 800 : 1600);
      var geracao = { temperature: opts.temperatura === undefined ? 0.3 : opts.temperatura, maxOutputTokens: tokens };
      if (RelA4_aceitaRaciocinio_(modelo)) {
        geracao.thinkingConfig = { thinkingBudget: raciocinio };
        geracao.maxOutputTokens = tokens + raciocinio;
      }
      var resp = UrlFetchApp.fetch(RELA4_ENDPOINT + modelo + ':generateContent?key=' + encodeURIComponent(cfg.chave), {
        method: 'post', contentType: 'application/json', muteHttpExceptions: true,
        payload: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: geracao })
      });
      var codigo = resp.getResponseCode(), corpo = {};
      try { corpo = JSON.parse(resp.getContentText()); } catch (eJ) {}
      if (codigo === 200) {
        var cand = corpo.candidates && corpo.candidates[0];
        var partes = (cand && cand.content && cand.content.parts) || [];
        var texto = partes.filter(function (p) { return !p.thought; }).map(function (p) { return p.text || ''; }).join('').trim();
        if (cand && cand.finishReason === 'MAX_TOKENS') { erroModelo = 'resposta cortada pelo limite de tamanho'; tokens = Math.min(tokens * 2, 8192); continue; }
        if (!texto) { erroModelo = 'resposta vazia'; continue; }
        return texto;
      }
      var msg = (corpo && corpo.error && (corpo.error.message || corpo.error.status)) || ('HTTP ' + codigo);
      if (codigo === 401 || codigo === 403) throw new Error('a chave da IA foi recusada (HTTP ' + codigo + ')');
      if (codigo === 429) { erroModelo = 'limite de uso da IA atingido; tente mais tarde'; break; }
      if (codigo === 404) { erroModelo = 'modelo não encontrado'; break; }
      erroModelo = 'serviço respondeu HTTP ' + codigo + ' (' + msg + ')';
      if (codigo !== 500 && codigo !== 503) break;
    }
    erros.push(modelo + ': ' + erroModelo);
  }
  throw new Error('a IA não respondeu (' + erros.join('; ') + ')');
}

/** Tira marcações que a IA às vezes devolve (negrito, títulos, crases). */
function RelA4_limparTextoIa_(t) {
  return String(t || '').replace(/\r/g, '').replace(/^```[a-z]*\s*|```\s*$/gim, '').replace(/\*\*|__/g, '').replace(/^#{1,6}\s*/gm, '').replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '').trim();
}

/** Regras comuns de redação passadas à IA em todo relatório. */
var RELA4_REGRAS_REDACAO =
  'Regras de redação, sem exceção: escreva em português do Brasil, tom profissional e sóbrio de relatório técnico de empresa; ' +
  'cite os números reais do contexto exatamente como aparecem (com vírgula decimal); nunca invente dado, causa, nome ou valor que não esteja no contexto; ' +
  'quando algo for hipótese, diga que é hipótese; não use markdown, negrito, títulos, emojis, palavras em inglês nem expressões de propaganda; ' +
  'não mencione que o texto foi escrito por inteligência artificial; não cite fabricante ou marca de produto; parágrafos corridos e justificáveis.';

/**
 * Análise do relatório: tenta a IA; sem chave ou com falha devolve o texto padrão.
 * Devolve { texto, origem: 'IA'|'PADRAO', aviso }.
 */
function RelA4_analise_(prompt, textoPadrao, opts) {
  try {
    var t = RelA4_limparTextoIa_(RelA4_gemini_(prompt + '\n\n' + RELA4_REGRAS_REDACAO, opts));
    if (t.length < 40) throw new Error('a IA devolveu um texto curto demais');
    return { texto: t, origem: 'IA', aviso: '' };
  } catch (e) {
    return { texto: textoPadrao, origem: 'PADRAO', aviso: RelA4_avisoFalhaIa_(e) };
  }
}

/** Aviso de tela quando a análise sai com o texto padrão (sem chave ou com falha da IA). */
function RelA4_avisoFalhaIa_(e) {
  return e && e.semChave
    ? 'A chave da IA não está cadastrada, então a análise saiu com o texto padrão do sistema, montado com os mesmos números do relatório. Para a análise detalhada, o administrador cadastra a chave em Configurações, Chaves e senhas, e o relatório é gerado de novo.'
    : 'A análise detalhada não ficou disponível agora (' + String((e && e.message) || e).replace(/[.\s]+$/, '') + '). O relatório saiu com o texto padrão do sistema, montado com os mesmos números. Gere de novo mais tarde para a análise detalhada.';
}

// ------------------------------------------------------------
// GRAVAÇÃO — HTML + PDF na pasta; nunca lança.
// ------------------------------------------------------------
function RelA4_subpasta_(pai, nome) {
  var n = SGO_DocSalvar_sanitizarNome_(nome);
  var it = pai.getFoldersByName(n);
  return it.hasNext() ? it.next() : pai.createFolder(n);
}

/**
 * obterPasta: função que devolve a pasta de destino (pode lançar).
 * Devolve { salvo, pdfUrl, htmlUrl, pastaUrl, aviso }.
 */
function RelA4_salvar_(obterPasta, nomeBase, html, opcoes) {
  try {
    var pasta = obterPasta();
    var r = SGO_DocSalvar_salvarHtmlEPdf_(pasta, nomeBase, html, opcoes || {});
    var pastaUrl = '';
    try { pastaUrl = pasta.getUrl(); } catch (eU) {}
    return { salvo: true, pdfUrl: r.pdfUrl, htmlUrl: r.htmlUrl, pastaUrl: pastaUrl, aviso: '' };
  } catch (e) {
    return { salvo: false, pdfUrl: '', htmlUrl: '', pastaUrl: '', aviso: 'O relatório abriu para revisão, mas a cópia (PDF e HTML) não foi gravada na pasta: ' + String((e && e.message) || e).replace(/[.\s]+$/, '') + '. Use "Imprimir ou salvar em PDF" nesta página e avise o administrador se repetir.' };
  }
}

/** Faixa de tela padrão com o resultado da gravação e o aviso da análise. */
function RelA4_avisosPadrao_(gravacao, analises) {
  var av = [];
  if (gravacao && gravacao.salvo) {
    av.push({ tipo: 'ok', html: 'Cópia guardada na pasta (PDF e HTML A4).' +
      (gravacao.pdfUrl ? ' <a href="' + RelA4_esc_(gravacao.pdfUrl) + '" target="_blank" rel="noopener">Abrir o PDF</a>' : '') +
      (gravacao.pastaUrl ? ' · <a href="' + RelA4_esc_(gravacao.pastaUrl) + '" target="_blank" rel="noopener">Abrir a pasta</a>' : '') });
  } else if (gravacao && gravacao.aviso) {
    av.push({ tipo: 'alerta', html: RelA4_esc_(gravacao.aviso) });
  }
  var vistos = {};
  (analises || []).forEach(function (a) { if (a && a.aviso && !vistos[a.aviso]) { vistos[a.aviso] = 1; av.push({ tipo: 'alerta', html: RelA4_esc_(a.aviso) }); } });
  return av;
}
