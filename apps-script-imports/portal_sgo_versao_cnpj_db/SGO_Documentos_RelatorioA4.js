/****************************************************
 * MOLDURA A4 DOS RELATÓRIOS GERENCIAIS
 *
 * Usada pelos relatórios da Frota (geral e por veículo), do Programa de
 * conduta (fechamento mensal, semanal, missões, extrato e prévia), do Painel
 * de qualidade, do Auvo e do Inventário de equipamentos.
 *
 * 18/10/2026: passou a seguir o padrão comum dos documentos A4
 * (docs/DOCUMENTOS_PADRAO_A4_20261018.md). A abertura, o cabeçalho e o
 * rodapé corridos (logo, título curto, nº e revisão; empresa e "Página X de
 * Y"), a capa, o sumário com páginas e as páginas em paisagem vêm da
 * SGO_DocA4. Aqui ficam:
 *  - os blocos prontos (seção e subseção numeradas, indicadores, tabela com
 *    legenda "Tabela N", gráficos em SVG com "Figura N" e legenda, marcas de
 *    situação, caixas, assinaturas);
 *  - a numeração automática de seções, figuras e tabelas (o chamador não
 *    numera nada à mão);
 *  - o fecho: sumário só quando o documento passa de 3 páginas e capa
 *    quando passa de 8 (decidido pelo próprio PDF);
 *  - a análise do período pela IA (Gemini com raciocínio ligado), sempre
 *    com um texto padrão montado dos mesmos números quando a IA não está
 *    disponível — o relatório nunca deixa de sair;
 *  - a gravação do HTML + PDF na pasta (SGO_DocSalvar), sem nunca lançar.
 *
 * Nenhuma função devolve Date: só texto.
 ****************************************************/

var RELA4_TZ = 'America/Sao_Paulo';
var RELA4_MODELO_PADRAO = 'gemini-2.5-flash';
var RELA4_FALLBACKS_PADRAO = ['gemini-2.0-flash-lite'];
var RELA4_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/';
/** Sumário só a partir de 4 páginas; capa só a partir de 9 (padrão A4, item 3). */
var RELA4_PAGINAS_SUMARIO = 4;
var RELA4_PAGINAS_CAPA = 9;
/** Paleta dos gráficos (a mesma da SGO_DocA4). */
var RELA4_CORES = { azul: '#1f5fa8', verde: '#1d6b3f', vermelho: '#a61b1b', laranja: '#b45309', ambar: '#c98a12', cinza: '#7b8794', roxo: '#7b4fb0', petroleo: '#0f8b8d' };

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
function RelA4_moeda_(v) { var n = Number(v); return 'R$ ' + SGO_DocA4_num_(isFinite(n) ? n : 0, 2); }
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

/** Número do documento sem numeração própria: SIGLA-aaaammdd-hhmm (padrão A4, item 2). */
function RelA4_numero_(sigla) {
  return String(sigla || 'REL').toUpperCase() + '-' + Utilities.formatDate(new Date(), RELA4_TZ, 'yyyyMMdd-HHmm');
}

// ------------------------------------------------------------
// ESTILOS PRÓPRIOS DOS BLOCOS GERENCIAIS (somados aos da SGO_DocA4)
// ------------------------------------------------------------
function RelA4_estilosExtra_(paisagem) {
  return '' +
    '.secao{margin:0}' +
    '.kpis{display:grid;grid-template-columns:repeat(' + (paisagem ? 6 : 4) + ',1fr);gap:2.2mm;margin:1.6mm 0 3.4mm;break-inside:avoid;page-break-inside:avoid}' +
    '.kpi{border:.5pt solid #bcc5cf;border-top:2pt solid #0b3d6e;padding:2mm 2.4mm 1.8mm;background:#fff}' +
    '.kpi .v{display:block;font-size:12.5pt;font-weight:700;color:#0b3d6e;line-height:1.2;font-variant-numeric:tabular-nums;white-space:nowrap}' +
    '.kpi .r{display:block;font-size:7.8pt;color:#52606d;margin-top:.6mm;line-height:1.3}' +
    '.kpi.ok{border-top-color:#1d6b3f}.kpi.ok .v{color:#1d6b3f}.kpi.aviso{border-top-color:#b45309}.kpi.aviso .v{color:#8a4b00}.kpi.critico{border-top-color:#a61b1b}.kpi.critico .v{color:#a61b1b}' +
    '.marca{display:inline-block;padding:.2mm 1.8mm;border-radius:1.6mm;font-size:7.8pt;font-weight:700;white-space:nowrap;line-height:1.5}' +
    '.marca.ok{background:#e7f3ec;color:#1d6b3f}.marca.aviso{background:#fdf1dc;color:#8a4b00}.marca.critico{background:#fbe9e9;color:#a61b1b}.marca.neutra{background:#eef2f6;color:#3e4c59}' +
    '.caixa{border:.5pt solid #bcc5cf;border-left:3pt solid #1f5fa8;background:#f5f7fa;padding:2.2mm 3.2mm;margin:2mm 0 3mm;break-inside:avoid;page-break-inside:avoid}' +
    '.caixa p{margin:0 0 1.2mm}.caixa p:last-child{margin-bottom:0}' +
    '.caixa.aviso{border-left-color:#b45309;background:#fdf8ee}.caixa.critico{border-left-color:#a61b1b;background:#fcf3f3}.caixa.ok{border-left-color:#1d6b3f;background:#f2f8f4}' +
    'figure.grafico svg{max-width:177mm;height:auto}td.nw,th.nw{white-space:nowrap}' +
    '.leg-grafico{display:flex;flex-wrap:wrap;gap:1mm 5mm;margin:1mm 0 0;font-size:8pt;color:#3e4c59}' +
    '.leg-grafico span{display:inline-flex;align-items:center;gap:1.4mm}.leg-grafico i{display:inline-block;width:3.2mm;height:3.2mm;border-radius:.5mm}' +
    '.leg-grafico i.tracejado{height:0;border-top:1.2pt dashed currentColor;border-radius:0}' +
    '.duas{display:grid;grid-template-columns:1fr 1fr;gap:6mm}' +
    '.gauge-kpis{display:grid;grid-template-columns:44mm 1fr;gap:4mm;align-items:center;break-inside:avoid;page-break-inside:avoid}' +
    '.gauge-kpis .kpis{margin:0;grid-template-columns:repeat(3,1fr)}' +
    '.analise ul{margin:0 0 2.4mm 4.5mm;padding:0;break-inside:avoid;page-break-inside:avoid}.analise li{margin:0 0 1.1mm}' +
    'ol.conferencia{margin:0 0 2.4mm 5mm;padding:0}ol.conferencia li{margin:0 0 1.1mm}' +
    'table.t td .sub{display:block;font-size:7.6pt;color:#52606d}' +
    '.aviso-tela{max-width:210mm;margin:10px auto 0;padding:9px 12px;border-radius:4px;font:12.5px/1.45 Arial,sans-serif}' +
    (paisagem ? '.aviso-tela{max-width:297mm}' : '') +
    '.aviso-tela.ok{background:#ecfdf5;border:1px solid #a7f3d0;color:#065f46}' +
    '.aviso-tela.alerta{background:#fffbeb;border:1px solid #fcd34d;color:#78350f}' +
    '.aviso-tela a{color:inherit;font-weight:700}' +
    '@media print{.aviso-tela,.no-print{display:none!important}}' +
    '@media screen and (max-width:640px){.folha{padding:6mm 4mm}.kpis,.gauge-kpis .kpis{grid-template-columns:repeat(2,1fr)}.duas,.gauge-kpis{grid-template-columns:1fr}' +
    'table.t{display:block;overflow-x:auto}.cab-tela .meta{font-size:10px}.barra-tela{padding:0 8px}}';
}

// ------------------------------------------------------------
// DOCUMENTO
// ------------------------------------------------------------
/** Documentos montados nesta execução: guarda a variante com capa para o fecho. */
var RELA4_DOCS = [];

/**
 * Numeração automática do corpo: seções (h2) "1.", subseções (h3) "1.1",
 * figuras e tabelas na ordem em que aparecem. Número escrito à mão no
 * título (ex.: "3. Abastecimentos") é trocado pelo automático.
 */
function RelA4_numerar_(corpo) {
  var s = 0, ss = 0, fig = 0, tab = 0;
  function semNumero(t) { return String(t).replace(/^\s*\d+(?:\.\d+)*\.?\s+/, ''); }
  return String(corpo || '').replace(/<h2 data-rela4-sec>([\s\S]*?)<\/h2>|<h3 data-rela4-sub>([\s\S]*?)<\/h3>|<b data-rela4-fig>Figura<\/b>|<b data-rela4-tab>Tabela<\/b>/g, function (m, h2, h3) {
    if (h2 !== undefined) { s++; ss = 0; return '<h2>' + s + '. ' + semNumero(h2) + '</h2>'; }
    if (h3 !== undefined) { ss++; return '<h3>' + (s || 1) + '.' + ss + ' ' + semNumero(h3) + '</h3>'; }
    if (m.indexOf('fig') > 0) { fig++; return '<b>Figura ' + fig + '</b>'; }
    tab++; return '<b>Tabela ' + tab + '</b>';
  });
}

/**
 * Documento completo.
 * o: { titulo, subtitulo, identificacao (texto da referência: período, competência...),
 *      rotuloIdentificacao ('Período' por padrão), corpo, paisagem, emitidoPor,
 *      sigla (para o nº), numero, ficha: [[rótulo, valor]] extra, tituloCurto,
 *      tipoCapa ('Relatório gerencial'), sumario (padrão true), capa (padrão 'auto') }
 * O sumário e a capa entram ou saem no fecho (RelA4_finalizar_), pelo nº de páginas.
 */
function RelA4_documento_(o) {
  o = o || {};
  var paisagem = !!o.paisagem;
  var empresa = RelA4_empresa_();
  var numero = o.numero || RelA4_numero_(o.sigla);
  var ficha = [];
  if (o.identificacao) ficha.push([o.rotuloIdentificacao || 'Período', o.identificacao]);
  ficha.push(['Emissão', RelA4_agora_()]);
  if (o.emitidoPor) ficha.push(['Emitido por', o.emitidoPor]);
  (o.ficha || []).forEach(function (p) { if (p && p[0]) ficha.push(p); });
  // número ímpar de itens: o último ocupa a linha inteira (sem célula vazia na ficha)
  if (ficha.length % 2 === 1) ficha[ficha.length - 1] = [ficha[ficha.length - 1][0], ficha[ficha.length - 1][1], { largo: true }];
  var corpo = RelA4_numerar_(o.corpo || '');
  var base = {
    titulo: o.titulo || 'Relatório', subtitulo: o.subtitulo || '', tituloCurto: o.tituloCurto || o.titulo || 'Relatório',
    rotuloNumero: 'Nº', numero: numero, revisao: '00', empresa: { nome: empresa.nome, cnpj: empresa.cnpj },
    orientacao: paisagem ? 'paisagem' : 'retrato'
  };
  function montar(comCapa, comSumario) {
    var doc = {};
    Object.keys(base).forEach(function (k) { doc[k] = base[k]; });
    if (comCapa) doc.capa = { tipo: o.tipoCapa || 'Relatório gerencial', linhas: ficha };
    else doc.ficha = ficha;
    doc.sumario = !!comSumario;
    var h = SGO_DocA4_inicioDocumento_(doc);
    h = h.replace('</head>', '<style>' + RelA4_estilosExtra_(paisagem) + '</style></head>')
      .replace('<main class="folha">', '<!--RELA4_AVISOS--><main class="folha">');
    return h + corpo + SGO_DocA4_fimDocumento_();
  }
  var comSumario = o.sumario !== false;
  var html = montar(o.capa === true, comSumario);
  RELA4_DOCS.push({
    html: html, numero: numero, tipo: o.tituloArquivo || o.titulo || 'Relatorio',
    semSumario: comSumario ? function () { return montar(o.capa === true, false); } : null,
    comCapa: (o.capa === true || o.capa === false) ? null : function () { return montar(true, comSumario); }
  });
  if (RELA4_DOCS.length > 8) RELA4_DOCS.shift();
  return html;
}

function RelA4_registro_(html) {
  for (var i = RELA4_DOCS.length - 1; i >= 0; i--) if (RELA4_DOCS[i].html === html) return RELA4_DOCS[i];
  return null;
}

/**
 * Fecho do documento: lê o nº de páginas no PDF e decide o sumário (a partir
 * de 4 páginas, com os números de página) e a capa (a partir de 9).
 * Nunca lança. Devolve { html, pdfBlob (ou null), paginas }.
 */
function RelA4_finalizar_(html, nome) {
  var reg = RelA4_registro_(html);
  if (typeof SGO_DocA4_paginar_ !== 'function') return { html: html, pdfBlob: null, paginas: 0 };
  try {
    var p = SGO_DocA4_paginar_(html, { nome: nome, gerarPdf: true });
    var total = p.totalPaginas || 0;
    if (reg && total && total < RELA4_PAGINAS_SUMARIO && reg.semSumario) {
      p = SGO_DocA4_paginar_(reg.semSumario(), { nome: nome, gerarPdf: true });
    } else if (reg && total >= RELA4_PAGINAS_CAPA && reg.comCapa) {
      p = SGO_DocA4_paginar_(reg.comCapa(), { nome: nome, gerarPdf: true });
    }
    return { html: p.html, pdfBlob: p.pdfBlob, paginas: p.totalPaginas || total };
  } catch (e) {
    return { html: html, pdfBlob: null, paginas: 0 };
  }
}

/** Faixas só de tela (somem na impressão). avisos: [{tipo:'ok'|'alerta', html}] — html já escapado. */
function RelA4_injetarAvisos_(html, avisos) {
  var faixas = (avisos || []).filter(function (a) { return a && a.html; }).map(function (a) {
    return '<div class="aviso-tela no-print so-tela ' + (a.tipo === 'ok' ? 'ok' : 'alerta') + '">' + a.html + '</div>';
  }).join('');
  return String(html || '').replace('<!--RELA4_AVISOS-->', faixas);
}

// ------------------------------------------------------------
// BLOCOS
// ------------------------------------------------------------
/** Seção numerada automaticamente (h2). */
function RelA4_secao_(titulo, conteudo) {
  return '<section class="secao"><h2 data-rela4-sec>' + RelA4_esc_(titulo) + '</h2>' + (conteudo || '') + '</section>';
}
/** Subseção numerada automaticamente (h3), dentro da seção corrente. */
function RelA4_subsecao_(titulo, conteudo) {
  return '<h3 data-rela4-sub>' + RelA4_esc_(titulo) + '</h3>' + (conteudo || '');
}
/** Trecho em folha paisagem dentro de documento retrato (tabela larga). */
function RelA4_paisagem_(html) {
  return typeof SGO_DocA4_paginaPaisagem_ === 'function' ? SGO_DocA4_paginaPaisagem_(html) : html;
}

/** itens: [[valor, rótulo, situação opcional 'ok'|'aviso'|'critico'], ...] — valor já formatado (texto). */
function RelA4_kpis_(itens) {
  return '<div class="kpis">' + (itens || []).map(function (k) {
    return '<div class="kpi' + (k[2] ? ' ' + k[2] : '') + '"><span class="v">' + RelA4_esc_(k[0]) + '</span><span class="r">' + RelA4_esc_(k[1]) + '</span></div>';
  }).join('') + '</div>';
}

/** pares: [[rótulo, valor], ...] em tabela de identificação (dois pares por linha). */
function RelA4_identificacao_(pares) {
  return SGO_DocA4_tabelaIdent_((pares || []).map(function (p) { return [p[0], p[1] === '' || p[1] == null ? '—' : p[1], p[2]]; }));
}

/**
 * colunas: [{t:'Título', num:true, cen:true}] ; linhas: [[célula, ...]] (texto, escapado aqui;
 * objeto {html:'...'} passa sem escapar); opts: { vazio, total: [células], legenda, compacta }.
 * Com legenda, sai "Tabela N — legenda" acima (numeração automática).
 */
function RelA4_tabela_(colunas, linhas, opts) {
  opts = opts || {};
  if (!linhas || !linhas.length) return '<p class="nota">' + RelA4_esc_(opts.vazio || 'Nenhum registro no período.') + '</p>';
  function cel(v, i, tag) {
    var c = colunas[i] || {};
    var conteudo = v && typeof v === 'object' && v.html !== undefined ? v.html : RelA4_esc_(v === '' || v == null ? '—' : v);
    var data = typeof v === 'string' && /^\d{2}\/\d{2}\/\d{4}/.test(v);
    var cls = (c.num ? 'num' : (c.cen ? 'cen' : '')) + (c.nw ? ' nw' : '');
    cls = cls.trim();
    return '<' + tag + (cls ? ' class="' + cls + '"' : '') + (data && !cls ? ' style="white-space:nowrap"' : '') + (c.w && tag === 'th' ? ' style="width:' + c.w + '"' : '') + '>' + conteudo + '</' + tag + '>';
  }
  var h = (opts.legenda ? '<p class="leg-tabela"><b data-rela4-tab>Tabela</b> — ' + RelA4_esc_(opts.legenda) + '</p>' : '') +
    '<table class="t' + (opts.compacta ? ' compacta' : '') + '"><thead><tr>' + colunas.map(function (c, i) { return cel({ html: RelA4_esc_(c.t) }, i, 'th'); }).join('') + '</tr></thead><tbody>';
  h += linhas.map(function (l) { return '<tr>' + l.map(function (v, i) { return cel(v, i, 'td'); }).join('') + '</tr>'; }).join('');
  if (opts.total) h += '<tr class="total">' + opts.total.map(function (v, i) { return cel(v === '' ? { html: '' } : v, i, 'td'); }).join('') + '</tr>';
  h += '</tbody></table>';
  // tabela curta não se divide entre folhas (legenda e linhas juntas)
  return linhas.length <= 8 ? '<div class="manter">' + h + '</div>' : h;
}

function RelA4_marca_(texto, tipo) { return { html: '<span class="marca ' + (tipo || 'neutra') + '">' + RelA4_esc_(texto) + '</span>' }; }

/** Caixa de destaque (tipo: ''|'ok'|'aviso'|'critico'); texto simples, escapado. */
function RelA4_caixa_(texto, tipo) { return '<div class="caixa' + (tipo ? ' ' + tipo : '') + '"><p>' + RelA4_esc_(texto) + '</p></div>'; }

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

/** Assinaturas em branco para preenchimento (cargos). */
function RelA4_assinaturas_(cargos) {
  return '<div class="assinaturas manter">' + (cargos || []).map(function (c) {
    return '<div class="assinatura"><div class="img"></div><div class="linha">' + RelA4_esc_(c) + '</div><div class="cargo">Nome e data</div></div>';
  }).join('') + '</div>';
}

// ------------------------------------------------------------
// GRÁFICOS EM SVG (o PDF não executa script). Cada gráfico sai numa
// <figure> com "Figura N — título" e legenda das cores quando houver.
// ------------------------------------------------------------
function RelA4_figura_(svg, titulo, legenda) {
  var leg = (legenda || []).filter(function (l) { return l && l.rotulo; });
  return '<figure class="grafico">' + svg +
    (leg.length ? '<div class="leg-grafico">' + leg.map(function (l) {
      return '<span><i' + (l.tracejado ? ' class="tracejado" style="color:' + l.cor + '"' : ' style="background:' + l.cor + '"') + '></i>' + RelA4_esc_(l.rotulo) + '</span>';
    }).join('') + '</div>' : '') +
    '<figcaption><b data-rela4-fig>Figura</b> — ' + RelA4_esc_(titulo || '') + '</figcaption></figure>';
}

function RelA4_txtSvg_(x, y, texto, extra) {
  return '<text x="' + Number(x).toFixed(1) + '" y="' + Number(y).toFixed(1) + '" font-family="Arial,Helvetica,sans-serif" ' + (extra || '') + '>' + RelA4_esc_(texto) + '</text>';
}

/**
 * Barras horizontais. itens: [{rotulo, valor, rotuloValor, cor}] ;
 * opts: { titulo (vira a legenda da figura), cor, vazio, unidade, legenda:[{cor, rotulo}] }
 */
function RelA4_barras_(itens, opts) {
  opts = opts || {};
  itens = (itens || []).filter(function (i) { return isFinite(Number(i.valor)); });
  if (!itens.length) return '<p class="nota">' + RelA4_esc_(opts.vazio || 'Sem dados no período.') + '</p>';
  var maiorRotulo = Math.max.apply(null, itens.map(function (i) { return String(i.rotulo).length; }));
  var maiorValor = Math.max.apply(null, itens.map(function (i) { return String(i.rotuloValor !== undefined ? i.rotuloValor : RelA4_num_(i.valor)).length; }).concat([6]));
  var W = 680, hb = 15, gap = 6, esq = Math.min(190, Math.max(70, maiorRotulo * 5.6 + 12)), dir = Math.min(280, Math.max(70, maiorValor * 5.5 + 12)), topo = 6;
  var H = topo * 2 + itens.length * (hb + gap) + (opts.unidade ? 12 : 0);
  var larg = W - esq - dir;
  var max = Math.max.apply(null, itens.map(function (i) { return Math.max(Number(i.valor), 0); }).concat([0.0001]));
  var cor = opts.cor || RELA4_CORES.azul;
  var s = ['<svg viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H + '" role="img">'];
  s.push('<line x1="' + esq + '" y1="' + topo + '" x2="' + esq + '" y2="' + (H - topo - (opts.unidade ? 12 : 0)) + '" stroke="#9aa5b1" stroke-width="0.8"/>');
  itens.forEach(function (i, k) {
    var y = topo + k * (hb + gap), w = Math.max(Number(i.valor), 0) / max * larg;
    s.push(RelA4_txtSvg_(esq - 6, y + hb / 2 + 3.5, String(i.rotulo).slice(0, 34), 'font-size="9.5" fill="#1f2933" text-anchor="end"'));
    s.push('<rect x="' + esq + '" y="' + y + '" width="' + Math.max(w, 1).toFixed(1) + '" height="' + hb + '" fill="' + (i.cor || cor) + '" fill-opacity="0.88"/>');
    s.push(RelA4_txtSvg_(esq + w + 5, y + hb / 2 + 3.5, i.rotuloValor !== undefined ? i.rotuloValor : RelA4_num_(i.valor), 'font-size="9.5" fill="#1f2933"'));
  });
  if (opts.unidade) s.push(RelA4_txtSvg_(W - 4, H - 3, opts.unidade, 'font-size="8.5" fill="#52606d" text-anchor="end"'));
  s.push('</svg>');
  return RelA4_figura_(s.join(''), opts.titulo, opts.legenda);
}

/**
 * Barras horizontais empilhadas. itens: [{rotulo, partes:[n, ...], rotuloValor}] ;
 * series: [{rotulo, cor}] (mesma ordem das partes) ; opts: { titulo, vazio }
 */
function RelA4_barrasEmpilhadas_(itens, series, opts) {
  opts = opts || {};
  itens = (itens || []).filter(function (i) { return (i.partes || []).some(function (p) { return Number(p) > 0; }); });
  if (!itens.length) return '<p class="nota">' + RelA4_esc_(opts.vazio || 'Sem dados no período.') + '</p>';
  var maiorRotulo = Math.max.apply(null, itens.map(function (i) { return String(i.rotulo).length; }));
  var maiorValor = Math.max.apply(null, itens.map(function (i) { return String(i.rotuloValor !== undefined ? i.rotuloValor : RelA4_num_(i.valor)).length; }).concat([6]));
  var W = 680, hb = 15, gap = 6, esq = Math.min(190, Math.max(70, maiorRotulo * 5.6 + 12)), dir = Math.min(280, Math.max(70, maiorValor * 5.5 + 12)), topo = 6;
  var H = topo * 2 + itens.length * (hb + gap);
  var larg = W - esq - dir;
  function soma(i) { return (i.partes || []).reduce(function (a, b) { return a + Math.max(Number(b) || 0, 0); }, 0); }
  var max = Math.max.apply(null, itens.map(soma).concat([0.0001]));
  var s = ['<svg viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H + '" role="img">'];
  s.push('<line x1="' + esq + '" y1="' + topo + '" x2="' + esq + '" y2="' + (H - topo) + '" stroke="#9aa5b1" stroke-width="0.8"/>');
  itens.forEach(function (i, k) {
    var y = topo + k * (hb + gap), x = esq;
    s.push(RelA4_txtSvg_(esq - 6, y + hb / 2 + 3.5, String(i.rotulo).slice(0, 34), 'font-size="9.5" fill="#1f2933" text-anchor="end"'));
    (i.partes || []).forEach(function (p, j) {
      var w = Math.max(Number(p) || 0, 0) / max * larg;
      if (w <= 0) return;
      s.push('<rect x="' + x.toFixed(1) + '" y="' + y + '" width="' + w.toFixed(1) + '" height="' + hb + '" fill="' + ((series[j] || {}).cor || RELA4_CORES.cinza) + '"/>');
      x += w;
    });
    s.push(RelA4_txtSvg_(x + 5, y + hb / 2 + 3.5, i.rotuloValor !== undefined ? i.rotuloValor : RelA4_num_(soma(i)), 'font-size="9.5" fill="#1f2933"'));
  });
  s.push('</svg>');
  return RelA4_figura_(s.join(''), opts.titulo, series);
}

/**
 * Colunas verticais com linhas de referência.
 * itens: [{rotulo, valor (null = sem dado), cor, rotuloValor}] ;
 * opts: {min, max, linhas:[{valor, rotulo, cor}], titulo, legenda:[{cor, rotulo}], unidade}
 */
function RelA4_colunas_(itens, opts) {
  opts = opts || {};
  var W = 680, H = 210, esq = 40, dir = 10, topo = 14, base = 30;
  var min = opts.min !== undefined ? opts.min : 0, max = opts.max !== undefined ? opts.max : Math.max.apply(null, itens.map(function (i) { return Number(i.valor) || 0; }).concat([1]));
  var alt = H - topo - base, larg = W - esq - dir, passo = larg / Math.max(itens.length, 1), wb = Math.min(46, passo * 0.6);
  function y(v) { return topo + alt - (Math.max(min, Math.min(max, v)) - min) / (max - min || 1) * alt; }
  var s = ['<svg viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H + '" role="img">'];
  [min, min + (max - min) / 4, (min + max) / 2, min + 3 * (max - min) / 4, max].forEach(function (v) {
    s.push('<line x1="' + esq + '" y1="' + y(v).toFixed(1) + '" x2="' + (W - dir) + '" y2="' + y(v).toFixed(1) + '" stroke="#e7ebef" stroke-width="0.7"/>');
    s.push(RelA4_txtSvg_(esq - 5, y(v) + 3, RelA4_num_(v, 0), 'font-size="8.5" fill="#52606d" text-anchor="end"'));
  });
  s.push('<line x1="' + esq + '" y1="' + (topo + alt) + '" x2="' + (W - dir) + '" y2="' + (topo + alt) + '" stroke="#9aa5b1" stroke-width="0.8"/>');
  if (opts.unidade) s.push(RelA4_txtSvg_(esq - 5, topo - 5, opts.unidade, 'font-size="8.5" fill="#52606d" text-anchor="start"'));
  (opts.linhas || []).forEach(function (l) {
    s.push('<line x1="' + esq + '" y1="' + y(l.valor).toFixed(1) + '" x2="' + (W - dir) + '" y2="' + y(l.valor).toFixed(1) + '" stroke="' + l.cor + '" stroke-width="1.1" stroke-dasharray="5 4"/>');
  });
  itens.forEach(function (i, k) {
    var cx = esq + passo * k + passo / 2;
    if (i.valor !== null && i.valor !== undefined && isFinite(Number(i.valor))) {
      var yy = y(Number(i.valor));
      s.push('<rect x="' + (cx - wb / 2).toFixed(1) + '" y="' + yy.toFixed(1) + '" width="' + wb.toFixed(1) + '" height="' + Math.max(topo + alt - yy, 1).toFixed(1) + '" fill="' + (i.cor || RELA4_CORES.azul) + '" fill-opacity="0.9"/>');
      s.push(RelA4_txtSvg_(cx, yy - 4, i.rotuloValor !== undefined ? i.rotuloValor : RelA4_num_(i.valor, 1), 'font-size="9.5" font-weight="700" fill="#1f2933" text-anchor="middle"'));
    } else {
      s.push(RelA4_txtSvg_(cx, topo + alt - 6, 'sem fechamento', 'font-size="8.5" fill="#7b8794" text-anchor="middle"'));
    }
    s.push(RelA4_txtSvg_(cx, H - base + 14, i.rotulo, 'font-size="9.5" fill="#1f2933" text-anchor="middle"'));
  });
  s.push('</svg>');
  var leg = (opts.legenda || []).concat((opts.linhas || []).map(function (l) { return { cor: l.cor, rotulo: l.rotulo, tracejado: true }; }));
  return RelA4_figura_(s.join(''), opts.titulo, leg);
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

/** Nome padrão do arquivo: "<Tipo> - <nº> - <identificador> - <aaaa-MM-dd HHmm>" (padrão A4, item 12). */
function RelA4_nomeArquivo_(tipo, numero, identificador) {
  return [tipo, numero, identificador, Utilities.formatDate(new Date(), RELA4_TZ, 'yyyy-MM-dd HHmm')].filter(function (x) { return x && String(x).trim(); }).join(' - ');
}

/**
 * Fecha o documento (sumário com páginas, capa quando longo) e grava
 * HTML + PDF na pasta. obterPasta: função que devolve a pasta (pode lançar).
 * identificador: o que distingue o arquivo (placa, competência, cliente...).
 * O nome final segue o padrão; documento que não veio da moldura usa o
 * identificador como nome.
 * Devolve { salvo, pdfUrl, htmlUrl, pastaUrl, aviso, html (o documento final,
 * para a tela e para guardar), paginas, nome }.
 */
function RelA4_salvar_(obterPasta, identificador, html, opcoes) {
  opcoes = opcoes || {};
  var reg = RelA4_registro_(html);
  var nome = reg ? RelA4_nomeArquivo_(reg.tipo, reg.numero, identificador) : identificador;
  var fin = RelA4_finalizar_(html, nome);
  try {
    var pasta = obterPasta();
    var op = { compartilhar: !!opcoes.compartilhar };
    if (fin.pdfBlob) op.pdfBlob = fin.pdfBlob;
    var r = SGO_DocSalvar_salvarHtmlEPdf_(pasta, nome, fin.html, op);
    var pastaUrl = '';
    try { pastaUrl = pasta.getUrl(); } catch (eU) {}
    return { salvo: true, pdfUrl: r.pdfUrl, htmlUrl: r.htmlUrl, pastaUrl: pastaUrl, aviso: '', html: r.html || fin.html, paginas: fin.paginas, nome: nome };
  } catch (e) {
    return { salvo: false, pdfUrl: '', htmlUrl: '', pastaUrl: '', html: fin.html, paginas: fin.paginas, nome: nome,
      aviso: 'O relatório abriu para revisão, mas a cópia (PDF e HTML) não foi gravada na pasta: ' + String((e && e.message) || e).replace(/[.\s]+$/, '') + '. Use "Imprimir ou salvar em PDF" nesta página e avise o administrador se repetir.' };
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
