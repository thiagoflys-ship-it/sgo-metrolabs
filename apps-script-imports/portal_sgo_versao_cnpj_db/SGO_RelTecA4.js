/**
 * SGO_RelTecA4.js — moldura comum dos documentos técnicos impressos em A4
 * (Certificado e Relatório de calibração, relatórios gerenciais de padrões, inventário
 * e orçamento de padrões, Laudo NR-13, Declaração de execução, Relatório QI/QO/QD, PGT,
 * POP, Planejamento CME, Cronograma de execução e Registros operacionais).
 * Segue docs/DOCUMENTOS_PADRAO_A4_20261018.md (padrão comum das três frentes).
 *
 * RelTecA4_css_(opcoes) → CSS de página: tamanho e margens do padrão (retrato
 *   25/15/18/18 mm, paisagem 22/15/16/15 mm), cabeçalho corrido com o logo à esquerda
 *   e, à direita, em duas linhas, o título curto e "Nº … · Revisão …"; rodapé corrido
 *   com a empresa (razão social e CNPJ) e "Página X de Y". A 1ª página fica sem o
 *   cabeçalho corrido, porque ela já abre com o logo, o título e o número do documento;
 *   o rodapé sai em todas. Inclui o CSS do sumário, das legendas de tabela e das
 *   páginas de outra orientação (SGO_DocA4). Concatenar DEPOIS do CSS do documento e
 *   de SGO_DocA4_css_(): o rodapé daqui substitui o dele, sem duplicar.
 *   opcoes: { titulo, numero, revisao, empresa, orientacao: 'retrato' | 'paisagem' }
 *
 * RelTecA4_revisao_(valor) → revisão com dois dígitos ("00", "01"...); vazio vira "00".
 * RelTecA4_empresa_()      → nome da empresa executante da configuração dos documentos.
 * RelTecA4_numeroAuto_(sigla, data) → "<SIGLA>-aaaammdd-hhmm" (documento sem número próprio).
 * RelTecA4_numerador_()    → { tabela(texto), figura(svg, texto), proximaTabela(), proximaFigura() }
 *   com numeração contínua "Tabela N — …" (acima da tabela) e "Figura N — …" (abaixo).
 * RelTecA4_sumario_()      → marcador do sumário automático (preenchido por RelTecA4_paginar_).
 * RelTecA4_paginar_(html, nome) → { html, pdfBlob, aviso }: ids nos títulos, sumário com as
 *   páginas lidas do PDF e o PDF final para gravar (SGO_DocA4_paginar_). Nunca lança.
 * RelTecA4_graficoIncerteza_(o) → SVG estático: tendência com barra de ±U95 por ponto.
 */

var RELTECA4_MARGEM_RETRATO = '25mm 15mm 18mm 18mm';
var RELTECA4_MARGEM_PAISAGEM = '22mm 15mm 16mm 15mm';

function RelTecA4_textoCss_(s) {
  return '"' + String(s == null ? '' : s)
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"') + '"';
}

function RelTecA4_esc_(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function RelTecA4_revisao_(valor) {
  var s = String(valor == null ? '' : valor).trim();
  if (!s) return '00';
  if (/^\d+$/.test(s)) { var n = String(Number(s)); return n.length < 2 ? '0' + n : n; }
  return s;
}

function RelTecA4_empresa_() {
  try {
    var cfg = (typeof CadeiaFrioRel_CFCFG !== 'undefined') ? CadeiaFrioRel_CFCFG : null;
    var e = cfg && cfg.EMPRESA_EXECUTANTE;
    if (e && e.nome) return String(e.nome) + (e.cnpj ? ' — CNPJ ' + e.cnpj : '');
  } catch (err) { /* sem configuração: usa o nome padrão */ }
  return 'Metrolab Soluções em Engenharia Clínica LTDA';
}

function RelTecA4_numeroAuto_(sigla, data) {
  var d = data instanceof Date ? data : new Date();
  var tz = 'America/Sao_Paulo';
  try { tz = Session.getScriptTimeZone() || tz; } catch (e) { /* fuso padrão */ }
  var txt;
  try { txt = Utilities.formatDate(d, tz, 'yyyyMMdd-HHmm'); } catch (e2) {
    var p = function (n) { return (n < 10 ? '0' : '') + n; };
    txt = d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + '-' + p(d.getHours()) + p(d.getMinutes());
  }
  return String(sigla || 'DOC') + '-' + txt;
}

function RelTecA4_logoCabecalho_() {
  try { if (typeof SGO_DocA4_logoCabecalhoUri_ === 'function') return SGO_DocA4_logoCabecalhoUri_(); } catch (e) { /* sem logo */ }
  return '';
}

function RelTecA4_css_(opcoes) {
  var o = opcoes || {};
  var paisagem = String(o.orientacao || '').toLowerCase() === 'paisagem';
  var numeroRev = [
    o.numero ? 'Nº ' + o.numero : '',
    (o.revisao !== undefined && o.revisao !== null) ? 'Revisão ' + RelTecA4_revisao_(o.revisao) : ''
  ].filter(Boolean).join(' · ');
  // Duas linhas no canto superior direito: "\A" é a quebra de linha do CSS (com white-space:pre).
  var direita = numeroRev
    ? RelTecA4_textoCss_(o.titulo || '') + ' "\\A " ' + RelTecA4_textoCss_(numeroRev)
    : RelTecA4_textoCss_(o.titulo || '');
  var logo = RelTecA4_logoCabecalho_();
  var linhaTopo = 'border-bottom:.6pt solid #9aa5b1;';
  var linhaPe = 'border-top:.6pt solid #9aa5b1;';
  var fonteTopo = 'font:7.8pt/1.35 Arial,Helvetica,sans-serif;color:#3e4c59;';
  var fontePe = 'font:7.3pt Arial,Helvetica,sans-serif;color:#616e7c;';
  var paginacao = '';
  try { if (typeof SGO_DocA4_estilosPaginacao_ === 'function') paginacao = SGO_DocA4_estilosPaginacao_(paisagem); } catch (e) { paginacao = ''; }
  return '' +
    '@page{size:A4 ' + (paisagem ? 'landscape' : 'portrait') + ';margin:' + (paisagem ? RELTECA4_MARGEM_PAISAGEM : RELTECA4_MARGEM_RETRATO) + ';' +
      (logo
        ? '@top-left{content:url("' + logo + '");vertical-align:bottom;padding-bottom:2.2mm;' + linhaTopo + '}'
        : '@top-left{content:"";' + linhaTopo + '}') +
      '@top-center{content:"";' + linhaTopo + '}' +
      '@top-right{content:' + direita + ';white-space:pre;text-align:right;vertical-align:bottom;padding-bottom:2.2mm;' + fonteTopo + linhaTopo + '}' +
      '@bottom-left{content:' + RelTecA4_textoCss_(o.empresa || RelTecA4_empresa_()) + ';text-align:left;white-space:nowrap;vertical-align:top;padding-top:2.2mm;' + fontePe + linhaPe + '}' +
      '@bottom-center{content:"";' + linhaPe + '}' +
      '@bottom-right{content:"Página " counter(page) " de " counter(pages);text-align:right;vertical-align:top;padding-top:2.2mm;' + fontePe + linhaPe + '}' +
    '}' +
    '@page:first{@top-left{content:none;border:0}@top-center{content:none;border:0}@top-right{content:none;border:0}}' +
    // O Chromium só carrega a imagem de caixa de margem que já foi usada; como a 1ª página não tem
    // cabeçalho, o logo é pré-carregado aqui (invisível), senão as páginas seguintes saem sem ele.
    (logo ? 'html::after{content:url("' + logo + '");position:absolute;left:0;top:0;width:1px;height:1px;overflow:hidden;opacity:0}' : '') +
    paginacao +
    // Regras comuns do padrão (itens 6, 7, 8 e 11): o documento pode reforçar, nunca afrouxar.
    'html{-webkit-print-color-adjust:exact;print-color-adjust:exact}' +
    'img,svg,table{max-width:100%}' +
    'figure{break-inside:avoid;page-break-inside:avoid}' +
    '.reltec-fig{margin:2mm 0 4mm}.reltec-fig svg{display:block;width:100%;height:auto}' +
    '.reltec-fig figcaption,.reltec-leg{font-size:8.3pt;color:#3e4c59;text-align:left}' +
    '.reltec-fig figcaption{margin-top:1.2mm}.reltec-fig figcaption b,.reltec-leg b{color:#1f2933}' +
    '.reltec-leg{margin:2.6mm 0 1mm;break-after:avoid;page-break-after:avoid}' +
    '.manter{break-inside:avoid;page-break-inside:avoid}' +
    '.reltec-fecho{break-inside:avoid;page-break-inside:avoid}';
}

/**
 * Numeração contínua de tabelas e figuras de um documento.
 * tabela(texto) → legenda "Tabela N — texto" (colocar logo acima da tabela).
 * figura(svg, texto) → <figure> com o SVG e a legenda "Figura N — texto" abaixo.
 */
function RelTecA4_numerador_() {
  var t = 0, f = 0;
  return {
    proximaTabela: function () { return t + 1; },
    proximaFigura: function () { return f + 1; },
    tabela: function (texto) {
      t++;
      return '<p class="reltec-leg leg-tabela"><b>Tabela ' + t + '</b>' + (texto ? ' — ' + RelTecA4_esc_(texto) : '') + '</p>';
    },
    figura: function (svg, texto) {
      if (!svg) return '';
      f++;
      return '<figure class="reltec-fig">' + svg + '<figcaption><b>Figura ' + f + '</b>' + (texto ? ' — ' + RelTecA4_esc_(texto) : '') + '</figcaption></figure>';
    }
  };
}

/** Marcador do sumário automático (o padrão só usa sumário em documento com mais de 3 páginas). */
function RelTecA4_sumario_() {
  return '<nav class="sumario" data-sgo-sumario></nav>';
}

/**
 * Prepara o HTML final e o PDF para gravar. Sem a SGO_DocA4_paginar_ (ou se ela falhar),
 * devolve o HTML sem o marcador vazio e pdfBlob nulo (quem grava converte como antes).
 */
function RelTecA4_paginar_(html, nome) {
  var h = String(html || '');
  try {
    if (typeof SGO_DocA4_paginar_ === 'function') {
      var r = SGO_DocA4_paginar_(h, { nome: nome || 'Documento', gerarPdf: true });
      if (r && r.html) return { html: r.html, pdfBlob: r.pdfBlob || null, aviso: r.aviso || '' };
    }
  } catch (e) { /* segue sem sumário paginado */ }
  return { html: h.replace(/<nav class="sumario" data-sgo-sumario><\/nav>/, ''), pdfBlob: null, aviso: '' };
}

/* ============================================================
 * Gráfico: tendência ± U95 por ponto (relatório interpretativo, RelCal)
 * o = { pontos: [{ rotulo, tendencia, u95 }], unidade, casas, largura?, altura? }
 * Barra vertical = intervalo tendência ± U95; ponto = tendência; linha cinza = zero.
 * ============================================================ */

function RelTecA4_num_(v, casas) {
  if (typeof SGO_DocA4_num_ === 'function') return SGO_DocA4_num_(v, casas);
  var n = Number(v);
  if (!isFinite(n)) return '—';
  return n.toFixed(casas == null ? 2 : casas).replace('.', ',');
}

function RelTecA4_graficoIncerteza_(o) {
  o = o || {};
  var pts = (o.pontos || []).filter(function (p) { return p && isFinite(Number(p.tendencia)) && isFinite(Number(p.u95)); });
  if (!pts.length) return '';
  var casas = o.casas == null ? 2 : o.casas;
  var W = o.largura || 640, H = o.altura || 230;
  var mE = 62, mD = 16, mT = 14, mB = 46;
  var lo = 0, hi = 0;
  pts.forEach(function (p) {
    var t = Number(p.tendencia), u = Math.abs(Number(p.u95));
    lo = Math.min(lo, t - u); hi = Math.max(hi, t + u);
  });
  if (hi - lo < 1e-12) { hi += 1; lo -= 1; }
  var folga = (hi - lo) * 0.12; hi += folga; lo -= folga;
  // passo "redondo" para a grade
  var bruto = (hi - lo) / 5, pot = Math.pow(10, Math.floor(Math.log(bruto) / Math.LN10)), passo = pot;
  [1, 2, 2.5, 5, 10].some(function (k) { if (k * pot >= bruto) { passo = k * pot; return true; } return false; });
  lo = Math.floor(lo / passo) * passo; hi = Math.ceil(hi / passo) * passo;
  var casasEixo = Math.max(0, Math.min(6, -Math.floor(Math.log(passo) / Math.LN10) + (passo / pot === 2.5 ? 1 : 0)));
  // eixo com as mesmas casas da grandeza no documento (nunca menos do que o passo exige)
  if (o.casas != null) casasEixo = Math.max(casasEixo, Math.min(6, Number(o.casas) || 0));
  var pw = W - mE - mD, ph = H - mT - mB;
  var y = function (v) { return mT + ph - (v - lo) / (hi - lo) * ph; };
  var dx = pw / pts.length;
  var s = [];
  s.push('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '" font-family="Arial,Helvetica,sans-serif" font-size="10" role="img">');
  for (var g = lo; g <= hi + passo / 2; g += passo) {
    var gy = y(g).toFixed(1);
    s.push('<line x1="' + mE + '" x2="' + (W - mD) + '" y1="' + gy + '" y2="' + gy + '" stroke="#e4e8ed" stroke-width="1"/>');
    s.push('<text x="' + (mE - 6) + '" y="' + (Number(gy) + 3.5) + '" text-anchor="end" fill="#3e4c59">' + RelTecA4_num_(g, casasEixo) + '</text>');
  }
  if (lo < 0 && hi > 0) s.push('<line x1="' + mE + '" x2="' + (W - mD) + '" y1="' + y(0).toFixed(1) + '" y2="' + y(0).toFixed(1) + '" stroke="#7b8794" stroke-width="1.2"/>');
  s.push('<line x1="' + mE + '" x2="' + mE + '" y1="' + mT + '" y2="' + (mT + ph) + '" stroke="#9aa5b1"/>');
  pts.forEach(function (p, i) {
    var cx = mE + dx * (i + 0.5), t = Number(p.tendencia), u = Math.abs(Number(p.u95));
    var y1 = y(t + u), y2 = y(t - u), yt = y(t);
    s.push('<line x1="' + cx.toFixed(1) + '" x2="' + cx.toFixed(1) + '" y1="' + y1.toFixed(1) + '" y2="' + y2.toFixed(1) + '" stroke="#1f5fa8" stroke-width="2"/>');
    s.push('<line x1="' + (cx - 7).toFixed(1) + '" x2="' + (cx + 7).toFixed(1) + '" y1="' + y1.toFixed(1) + '" y2="' + y1.toFixed(1) + '" stroke="#1f5fa8" stroke-width="2"/>');
    s.push('<line x1="' + (cx - 7).toFixed(1) + '" x2="' + (cx + 7).toFixed(1) + '" y1="' + y2.toFixed(1) + '" y2="' + y2.toFixed(1) + '" stroke="#1f5fa8" stroke-width="2"/>');
    s.push('<circle cx="' + cx.toFixed(1) + '" cy="' + yt.toFixed(1) + '" r="3.6" fill="#0b3d6e"/>');
    s.push('<text x="' + cx.toFixed(1) + '" y="' + (mT + ph + 14) + '" text-anchor="middle" fill="#1f2933">' + RelTecA4_esc_(p.rotulo) + '</text>');
  });
  s.push('<text x="' + (mE + pw / 2) + '" y="' + (H - 8) + '" text-anchor="middle" fill="#3e4c59">Valor de referência' + (o.unidade ? ' (' + RelTecA4_esc_(o.unidade) + ')' : '') + '</text>');
  s.push('<text transform="translate(13 ' + (mT + ph / 2) + ') rotate(-90)" text-anchor="middle" fill="#3e4c59">Tendência ± U95' + (o.unidade ? ' (' + RelTecA4_esc_(o.unidade) + ')' : '') + '</text>');
  s.push('</svg>');
  return s.join('');
}
