/**
 * SGO_DocA4.js — acabamento tipográfico comum dos documentos A4 impressos.
 *
 * SGO_DocA4_css_()          → CSS base (justificação, hifenização, viúvas/órfãs,
 *                              cabeçalho de tabela repetido, quebras de página,
 *                              colunas numéricas e numeração "Página X de Y").
 *                              Deve ser concatenado DEPOIS do CSS do documento.
 *                              Não define margens de página (cada documento mantém as suas).
 * SGO_DocA4_num_(v, casas)  → número pt-BR com milhar "." e decimal ","; '—' para vazio/NaN.
 */

function SGO_DocA4_css_() {
  return '' +
    'p,li{text-align:justify;hyphens:auto;-webkit-hyphens:auto;orphans:3;widows:3}' +
    'td p,th p,td li,th li{text-align:inherit}' +
    'h1,h2,h3,h4{page-break-after:avoid;break-after:avoid}' +
    'thead{display:table-header-group}' +
    'tr,.assinatura,.assinaturas,.figura-item,.foto-item{break-inside:avoid;page-break-inside:avoid}' +
    'td.num,th.num{text-align:right !important;font-variant-numeric:tabular-nums;white-space:nowrap}' +
    '@page{@bottom-right{content:"Página " counter(page) " de " counter(pages);font:8.5px Arial,Helvetica,sans-serif;color:#6b7280}}';
}

function SGO_DocA4_num_(valor, casas) {
  if (valor === null || valor === undefined) return '—';
  var n;
  if (typeof valor === 'number') {
    n = valor;
  } else {
    var s = String(valor).trim();
    if (!s) return '—';
    if (s.indexOf(',') >= 0) s = s.replace(/\./g, '').replace(',', '.');
    n = Number(s);
  }
  if (!isFinite(n)) return '—';
  var c = (casas === null || casas === undefined || isNaN(Number(casas)))
    ? (Math.round(n) === n ? 0 : 2)
    : Math.max(0, Math.min(10, Math.floor(Number(casas))));
  var neg = n < 0;
  var partes = Math.abs(n).toFixed(c).split('.');
  var inteiro = partes[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  var txt = inteiro + (partes[1] ? ',' + partes[1] : '');
  if (neg && /[1-9]/.test(txt)) txt = '-' + txt;
  return txt;
}
