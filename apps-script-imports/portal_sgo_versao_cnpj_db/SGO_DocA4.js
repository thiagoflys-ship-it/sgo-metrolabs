/**
 * SGO_DocA4.js — padrão comum dos documentos A4 impressos do SGO+.
 *
 * Funções antigas (usadas por vários módulos; não mudar o comportamento):
 * SGO_DocA4_css_()          → CSS base (justificação, hifenização, viúvas/órfãs,
 *                              cabeçalho de tabela repetido, quebras de página,
 *                              colunas numéricas e numeração "Página X de Y").
 *                              Deve ser concatenado DEPOIS do CSS do documento.
 *                              Não define margens de página (cada documento mantém as suas).
 * SGO_DocA4_num_(v, casas)  → número pt-BR com milhar "." e decimal ","; '—' para vazio/NaN.
 *
 * Padrão dos documentos de qualificação (17/10/2026: Autoclave, Lavadora,
 * Cadeia de Frio, Estufa/Banho-maria/Secadora, memória de cálculo e folha do
 * "Preencher modelo"):
 *  - SGO_DocA4_inicioDocumento_(doc) / SGO_DocA4_fimDocumento_()
 *      página A4 com margens fixas, cabeçalho corrido (logo + nº do documento e
 *      revisão) e rodapé corrido (empresa + "Página X de Y") em TODAS as páginas,
 *      bloco de título, ficha do documento e quadro de resultado.
 *  - tabelas, listas, figuras, assinaturas, fotos e registradores (padrões).
 *  - gráficos em SVG estático (o PDF é gerado sem JavaScript).
 *  - redação por IA: regras comuns + chamada ao Gemini com raciocínio ligado
 *    e temperatura baixa (SGO_DocA4_chamarGemini_).
 * Nenhuma função devolve Date: só strings.
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

/* ============================================================
 * Utilidades de texto
 * ============================================================ */

function SGO_DocA4_esc_(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/** Texto para content:"..." de CSS (aspas, barras e quebras). */
function SGO_DocA4_txtCss_(s) {
  return '"' + String(s == null ? '' : s).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/[\r\n]+/g, ' ') + '"';
}

/** Valor com unidade (pt-BR, espaço inseparável). Vazio → '—'. */
function SGO_DocA4_val_(v, casas, unidade) {
  if (v === null || v === undefined || v === '') return '—';
  var n = typeof v === 'number' ? v : (/^\s*-?\d+(\.\d+)?\s*$/.test(String(v)) ? Number(v) : NaN);
  var txt = isFinite(n) ? SGO_DocA4_num_(n, casas === undefined ? 2 : casas) : String(v);
  return txt + (unidade ? '\u00a0' + unidade : '');
}

/** Texto corrido (parágrafos separados por linha em branco) → <p> escapados. */
function SGO_DocA4_paragrafos_(texto) {
  var partes = String(texto || '').replace(/\r\n/g, '\n').split(/\n\s*\n/)
    .map(function (p) { return p.replace(/\s*\n\s*/g, ' ').trim(); }).filter(Boolean);
  if (!partes.length) return '<p class="nota">—</p>';
  return partes.map(function (p) { return '<p>' + SGO_DocA4_esc_(p) + '</p>'; }).join('');
}

/** Números com ponto decimal seguidos de unidade (mensagens antigas dos motores) → vírgula. */
function SGO_DocA4_ptbrTexto_(t) {
  return String(t == null ? '' : t).replace(/(\d)\.(\d+)(\s?(?:°C|min\b|h\b|%|s\b|bar\b|mbar\b))/g, '$1,$2$3');
}

function SGO_DocA4_lista_(itens, classe) {
  var l = (itens || []).map(function (i) { return SGO_DocA4_ptbrTexto_(String(i == null ? '' : i).trim()); }).filter(Boolean);
  if (!l.length) return '';
  return '<ul class="lista' + (classe ? ' ' + classe : '') + '">' + l.map(function (i) { return '<li>' + SGO_DocA4_esc_(i) + '</li>'; }).join('') + '</ul>';
}

function SGO_DocA4_hoje_(tz, formato) {
  try { return Utilities.formatDate(new Date(), tz || 'America/Sao_Paulo', formato || 'dd/MM/yyyy'); } catch (e) { return ''; }
}

/* ============================================================
 * Resultado (veredito)
 * Decisão do dono (17/10/2026): não existe "aprovado com alerta". Abaixo do
 * mínimo da norma = reprovado; acima do mínimo, mesmo perto do limite, =
 * aprovado (a proximidade vai para as observações).
 * ============================================================ */

function SGO_DocA4_classeStatus_(status) {
  var s = String(status || '').toUpperCase();
  if (s.indexOf('REPROVADO') !== -1 || s.indexOf('NAO_CONFORME') !== -1) return 'nok';
  if (s.indexOf('APROVADO') !== -1 || s === 'CONFORME') return 'ok';
  return 'info';
}

function SGO_DocA4_rotuloStatus_(status) {
  var c = SGO_DocA4_classeStatus_(status);
  return c === 'nok' ? 'Reprovado' : (c === 'ok' ? 'Aprovado' : 'Informativo');
}

/* ============================================================
 * Logo (cópia reduzida do logo compartilhado, 600 × 199 px, fundo branco)
 * Gerada a partir de SGO_DocLogoCompartilhado_() em 17/10/2026 — o original
 * tem 750 KB e ia inteiro em cada documento. Se o logo mudar, regerar.
 * ============================================================ */

function SGO_DocA4_logoJpegBase64_() {
  return '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kZpo7GN5l5tIAOp7hgd91gbilzY6S0O2a26d6NRX2PLT7mdijgft7+X8I7n0Y+rdpa4s7qKvFLmJ1nxSM9JU1QtWn5Mj7E0DiGPb6QxLJ76bZ2CD0sPS0+GCMrGVotNffrnTWy10VTXXGqJbDTU0ZkkkxucNG5AG5PYDJOwUzR8n0anOVa9ieq/bvI6ou2V0KdO37IXHr/idqnidcm1upbpJVCN3VBSMHRTU3f8Ai4xsDuR1HLiNi44Xp8G4uIb9Xsfw3ZXm7N6fdBgwKfo3IFQXfa+kgOwH75z0+lhZ64WcmE0zoLlxDqzFEQHCy0EuXnPScTTt7d3NLYvYRJ5KXen9NWnStrhtdlt1NbrdBnop6aMMaCe5OO5J3JO5O5JWdZeKaFiwU7Ucn/5/f3rMaa3zvfzszlRfE87RFsuVssFKy80tpp71K50tc2zte2kdKdi5geARkAE58ye/c3MgAHZFUl1rqTBPNRETCBEReHoREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAF8cMgjt7V9RAY54ncE9IcVqb/DtvLbkxgjhulIRHVRNGcDrwQ5oLnHpeHNyScZ3UIuK3LJq/hoya4U7Ps7p9mSa2ijIkgaMbyxblo3PpNLm4aS4tyAtka4lue2yk6K6z0mpq5buX03HHU0MVQmXJhd5pzBBAI3BGRhZX4WcvesuKpiq6KlFtsL8E3WuaWxubtvEz30pwcjGGHBBeCp21nATh3XasZqefSlC66sJcQ0FsEjySfEfCD4b35JPU5pOcHuARkdsbWAAAYGwA7BS1TyjVWYgbhd69XD32HBDZmo7Mq5QxTwq5fNH8LGR1NFSfZC/NHpXauaHStJBBEQ7RDDiPR3IwHOdjKyw1vSPX8a+oq1LNJM7TkXKkwyNsbdFqYQIiLWZhERAcS3OcbFYH4r8rGk+IctTc7b/wAX9QzOMj6qljDoKh5OS6WHIBcSSS5pa4k5cXYws9It0FRJTv04nYU1yRMlbovTKGqniLwk1bwrrWwajthjp5XdENdTuMlLOcdmyYGD39Fwa7YnpxurIe8Nb1OIa0dyTgBbgLnaaK80FRQXCkgrKGpYY5qapjEkUjT3DmkEEH1FWJpHgRw/0RfJ71ZtNU0Nykf4kc0znTe5jvnwQ8nwvfH3uNjjsABZYOUiJH/ys6X02L9vEhpbMiv/AON2EIf8K+UrVOtm01y1I9+nLFJ6XTKz7umbt72IjEecuHVJuC3+LcDlTX0Fww0tw2tho9NWmKi8VoE9QR1VFRgkgySH0nYLnYB2bkgADZXe1vSO+T6yuShK25z1a4euE3Js/ck6ejip06Ca9/WAAERFHnUEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQH//2Q==';
}

function SGO_DocA4_logoDataUri_() {
  return 'data:image/jpeg;base64,' + SGO_DocA4_logoJpegBase64_();
}

/** Logo para o cabeçalho corrido (@page): SVG com tamanho físico fixo. */
function SGO_DocA4_logoCabecalhoUri_() {
  var svg = '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="39mm" height="13mm" viewBox="0 0 600 199">' +
    '<image width="600" height="199" xlink:href="' + SGO_DocA4_logoDataUri_() + '"/></svg>';
  return 'data:image/svg+xml;base64,' + Utilities.base64Encode(svg);
}

/* ============================================================
 * Folha de estilo do documento de qualificação
 * ============================================================ */

function SGO_DocA4_estilos_(doc) {
  doc = doc || {};
  var empresa = doc.empresa || {};
  // Duas linhas no canto superior direito: "\A" é a quebra de linha do CSS (com white-space:pre).
  var topoDireita = SGO_DocA4_txtCss_(doc.tituloCurto || doc.titulo || 'Documento') + ' "\\A " ' +
    SGO_DocA4_txtCss_((doc.rotuloNumero || 'Nº') + ' ' + (doc.numero || '—') + ' · Revisão ' + SGO_DocA4_revisao_(doc.revisao));
  var rodapeEsq = (empresa.nome || 'Metrolab Soluções em Engenharia Clínica LTDA') + (empresa.cnpj ? ' · CNPJ ' + empresa.cnpj : '');
  var linhaTopo = 'border-bottom:.6pt solid #9aa5b1;';
  var linhaRodape = 'border-top:.6pt solid #9aa5b1;';
  // Orientação do documento (18/10/2026): retrato é o padrão; paisagem só quando o documento pede.
  var paisagem = SGO_DocA4_ehPaisagem_(doc);
  return '' +
    '@page{size:A4 ' + (paisagem ? 'landscape' : 'portrait') + ';margin:' + (paisagem ? SGO_DocA4_MARGEM_PAISAGEM : SGO_DocA4_MARGEM_RETRATO) + ';' +
      '@top-left{content:url("' + SGO_DocA4_logoCabecalhoUri_() + '");vertical-align:bottom;padding-bottom:2.2mm;' + linhaTopo + '}' +
      '@top-center{content:"";' + linhaTopo + '}' +
      '@top-right{content:' + topoDireita + ';white-space:pre;text-align:right;vertical-align:bottom;padding-bottom:2.2mm;font:7.8pt/1.35 Arial,Helvetica,sans-serif;color:#3e4c59;' + linhaTopo + '}' +
      '@bottom-left{content:' + SGO_DocA4_txtCss_(rodapeEsq) + ';vertical-align:top;padding-top:2.2mm;font:7.3pt Arial,Helvetica,sans-serif;color:#616e7c;' + linhaRodape + '}' +
      '@bottom-center{content:"";' + linhaRodape + '}' +
      '@bottom-right{content:"Página " counter(page) " de " counter(pages);vertical-align:top;padding-top:2.2mm;font:7.3pt Arial,Helvetica,sans-serif;color:#616e7c;' + linhaRodape + '}' +
    '}' +
    '*{box-sizing:border-box}' +
    'html{-webkit-print-color-adjust:exact;print-color-adjust:exact}' +
    'body{margin:0;font-family:Arial,Helvetica,sans-serif;font-size:9.6pt;line-height:1.45;color:#1f2933;background:#e4e8ed}' +
    '.folha{background:#fff;width:210mm;max-width:100%;margin:14px auto 40px;padding:14mm 15mm 18mm 18mm;box-shadow:0 1px 6px rgba(0,0,0,.18)}' +
    '.barra-tela{max-width:210mm;margin:12px auto 0;display:flex;gap:8px;justify-content:flex-end;font:13px Arial,sans-serif}' +
    '.barra-tela button{background:#0b3d6e;color:#fff;border:0;border-radius:4px;padding:8px 16px;font-weight:700;cursor:pointer}' +
    '.cab-tela{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:.6pt solid #9aa5b1;padding-bottom:2.2mm;margin-bottom:6mm}' +
    '.cab-tela img{height:13mm;width:auto;display:block}' +
    '.cab-tela .meta{text-align:right;font-size:7.8pt;line-height:1.35;color:#3e4c59}' +
    '@media print{body{background:#fff}.folha{width:auto;margin:0;padding:0;box-shadow:none}.cab-tela,.barra-tela,.so-tela{display:none!important}}' +
    'h1{font-size:15.5pt;line-height:1.2;margin:0 0 1.2mm;color:#0b3d6e;font-weight:700}' +
    '.subtitulo{margin:0 0 4mm;color:#3e4c59;font-size:10.2pt;text-align:left}' +
    'h2{font-size:11pt;color:#0b3d6e;margin:6.5mm 0 2.4mm;padding-bottom:1mm;border-bottom:.8pt solid #0b3d6e;break-after:avoid;page-break-after:avoid}' +
    'h3{font-size:10pt;color:#243b53;margin:4.5mm 0 1.6mm;break-after:avoid;page-break-after:avoid}' +
    'h4{font-size:9.6pt;color:#243b53;margin:3mm 0 1mm;break-after:avoid}' +
    'p{margin:0 0 2.2mm;text-align:justify;hyphens:auto;-webkit-hyphens:auto;orphans:3;widows:3}' +
    'li{text-align:justify;hyphens:auto;-webkit-hyphens:auto}' +
    'section{margin:0}' +
    '.manter{break-inside:avoid;page-break-inside:avoid}' +
    '.quebra{break-before:page;page-break-before:always}' +
    'table.t{width:100%;border-collapse:collapse;margin:1.6mm 0 3.2mm;font-size:8.6pt;line-height:1.32}' +
    'table.t th,table.t td{border:.5pt solid #bcc5cf;padding:1.2mm 1.8mm;vertical-align:top;text-align:left}' +
    'table.t thead th{background:#eef2f6;color:#243b53;font-weight:700}' +
    'table.t thead{display:table-header-group}' +
    'table.t tr{break-inside:avoid;page-break-inside:avoid}' +
    'table.t td.num,table.t th.num{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}' +
    'table.t td.cen,table.t th.cen{text-align:center}' +
    'table.t tr.total td{font-weight:700;background:#f5f7fa}' +
    'table.t.compacta{font-size:8pt;line-height:1.2}table.t.compacta th,table.t.compacta td{padding:.55mm 1.6mm}' +
    'table.ident th{width:19%;background:#f5f7fa;font-weight:600;color:#3e4c59}' +
    'table.ident td{width:31%}' +
    'table.ficha{font-size:8.3pt}' +
    'table.ficha th{width:auto;white-space:nowrap}' +
    '.ok-txt{color:#1d6b3f;font-weight:700}.nok-txt{color:#a61b1b;font-weight:700}.info-txt{color:#3e4c59;font-weight:700}' +
    '.resultado{border:1pt solid #52606d;border-left-width:4pt;padding:2.6mm 4mm;margin:3mm 0 4mm;break-inside:avoid;page-break-inside:avoid}' +
    '.resultado .rot{font-size:8.4pt;color:#52606d;margin:0 0 .6mm}' +
    '.resultado .val{font-size:13.5pt;font-weight:700;margin:0 0 .8mm}' +
    '.resultado .mot{font-size:9pt;color:#1f2933;margin:0;text-align:left}' +
    '.resultado.ok{border-color:#1d6b3f;background:#f2f8f4}.resultado.ok .val{color:#1d6b3f}' +
    '.resultado.nok{border-color:#a61b1b;background:#fcf3f3}.resultado.nok .val{color:#a61b1b}' +
    '.resultado.info{border-color:#52606d;background:#f5f7fa}.resultado.info .val{color:#3e4c59}' +
    '.aviso-simulado{border:1pt dashed #a61b1b;color:#a61b1b;padding:2mm 3mm;margin:0 0 3mm;font-weight:700;font-size:9pt}' +
    'ul.lista{margin:0 0 2.4mm 4.5mm;padding:0}ul.lista li{margin:0 0 1.1mm}' +
    '.nota{font-size:8.3pt;color:#52606d;text-align:left}' +
    '.leigo{background:#f5f7fa;border-left:2.5pt solid #9fb3c8;padding:2.6mm 3.6mm .8mm;margin:1mm 0 3mm}' +
    'figure{margin:2mm 0 4mm;break-inside:avoid;page-break-inside:avoid}' +
    'figure svg{display:block;width:100%;height:auto}' +
    'figcaption{font-size:8.3pt;color:#3e4c59;margin-top:1.2mm;text-align:left}' +
    'figcaption b{color:#1f2933}' +
    '.assinaturas{display:flex;flex-wrap:wrap;gap:8mm 12mm;margin-top:5mm;break-inside:avoid;page-break-inside:avoid}' +
    '.assinatura{flex:1 1 48mm;text-align:center}' +
    '.assinatura .img{height:19mm;display:flex;align-items:flex-end;justify-content:center}' +
    '.assinatura .img svg,.assinatura .img img{max-height:19mm;max-width:100%;width:auto;height:auto;display:block}' +
    '.assinatura .linha{border-top:.6pt solid #3e4c59;margin-top:1mm;padding-top:1.2mm;font-weight:700;font-size:9pt}' +
    '.assinatura .cargo{font-size:8pt;color:#52606d;line-height:1.35}' +
    '.fotos{display:flex;flex-wrap:wrap;gap:4mm}' +
    '.foto{flex:1 1 76mm;border:.5pt solid #bcc5cf;break-inside:avoid;page-break-inside:avoid}' +
    '.foto .q{height:60mm;display:flex;align-items:center;justify-content:center;background:#fafbfc}' +
    '.foto img{max-width:100%;max-height:60mm;display:block}' +
    '.foto .leg{font-size:8pt;padding:1.2mm 2mm;color:#3e4c59;text-align:left}' +
    '.formula{font-family:"Times New Roman",Times,serif;font-style:italic;font-size:11pt;text-align:center;margin:2mm 0 3mm}' +
    SGO_DocA4_estilosPaginacao_(paisagem);
}

/* ============================================================
 * Orientação, capa, sumário e numeração (padrão de 18/10/2026,
 * docs/DOCUMENTOS_PADRAO_A4_20261018.md)
 * ============================================================ */

var SGO_DocA4_MARGEM_RETRATO = '25mm 15mm 18mm 18mm';
var SGO_DocA4_MARGEM_PAISAGEM = '22mm 15mm 16mm 15mm';

/** Revisão com dois dígitos ("0" → "00", "1" → "01"); texto livre (ex.: data da edição) fica como está. */
function SGO_DocA4_revisao_(r) {
  var t = String(r == null ? '' : r).trim();
  if (!t) return '00';
  return /^\d$/.test(t) ? '0' + t : t;
}

function SGO_DocA4_ehPaisagem_(doc) {
  return !!doc && String(doc.orientacao || '').toLowerCase() === 'paisagem';
}

/**
 * CSS das páginas nomeadas (paisagem/retrato dentro do documento e capa), do
 * sumário e das legendas de tabela. As páginas nomeadas herdam o cabeçalho e o
 * rodapé corridos do @page geral; a capa não tem cabeçalho nem rodapé.
 */
function SGO_DocA4_estilosPaginacao_(paisagem) {
  var semCaixa = '@top-left{content:none}@top-center{content:none}@top-right{content:none}@bottom-left{content:none}@bottom-center{content:none}@bottom-right{content:none}';
  return '' +
    '@page paisagem{size:A4 landscape;margin:' + SGO_DocA4_MARGEM_PAISAGEM + '}' +
    '@page retrato{size:A4 portrait;margin:' + SGO_DocA4_MARGEM_RETRATO + '}' +
    '@page capa{size:A4 ' + (paisagem ? 'landscape' : 'portrait') + ';margin:18mm 18mm 16mm 18mm;' + semCaixa + '}' +
    '.pg-paisagem{page:paisagem}.pg-retrato{page:retrato}' +
    (paisagem ? '.folha{width:297mm}.barra-tela{max-width:297mm}' : '') +
    '.pg-paisagem,.pg-retrato{overflow-x:auto}' +
    // capa
    '.capa{page:capa;display:flex;flex-direction:column;min-height:' + (paisagem ? '170mm' : '255mm') + ';break-after:page;page-break-after:always}' +
    '.capa .logo img{height:22mm;width:auto;display:block}' +
    '.capa .meio{margin-top:' + (paisagem ? '18mm' : '58mm') + ';border-left:3pt solid #0b3d6e;padding:2mm 0 2mm 7mm}' +
    '.capa .tipo{font-size:10pt;letter-spacing:.04em;color:#52606d;margin:0 0 2mm;text-align:left}' +
    '.capa h1{font-size:23pt;line-height:1.15;margin:0 0 3mm}' +
    '.capa .sub{font-size:11pt;color:#3e4c59;margin:0 0 6mm;text-align:left}' +
    '.capa table.t{max-width:150mm}' +
    '.capa .texto{margin-top:4mm;max-width:150mm}' +
    '.capa .pe{margin-top:auto;border-top:.6pt solid #9aa5b1;padding-top:2.4mm;font-size:8pt;color:#52606d;display:flex;justify-content:space-between;gap:6mm}' +
    '.capa .pe p{margin:0;text-align:left}' +
    '@media screen{.capa{min-height:0;border-bottom:.6pt dashed #bcc5cf;padding-bottom:8mm;margin-bottom:8mm}.capa .meio{margin-top:14mm}}' +
    // sumário (números de página preenchidos por SGO_DocA4_paginar_)
    'nav.sumario{margin:4mm 0 5mm;break-inside:auto}' +
    'nav.sumario .sumario-tit{font-size:11pt;font-weight:700;color:#0b3d6e;margin:0 0 2mm;padding-bottom:1mm;border-bottom:.8pt solid #0b3d6e;text-align:left}' +
    'nav.sumario ol{list-style:none;margin:0;padding:0}' +
    'nav.sumario li{margin:0;break-inside:avoid;page-break-inside:avoid}' +
    'nav.sumario a{display:flex;align-items:baseline;color:#1f2933;text-decoration:none;padding:.55mm 0}' +
    'nav.sumario li.n2>a{font-weight:700;margin-top:.8mm}' +
    'nav.sumario li.n3>a{padding-left:6mm;font-size:9pt}' +
    'nav.sumario .t{flex:0 1 auto}' +
    'nav.sumario .pt{flex:1 1 auto;border-bottom:.7pt dotted #9aa5b1;margin:0 1.6mm .9mm;min-width:6mm}' +
    'nav.sumario .pg{flex:0 0 9mm;text-align:right;font-variant-numeric:tabular-nums}' +
    // legenda de tabela (fica presa à tabela seguinte)
    '.leg-tabela{font-size:8.3pt;color:#3e4c59;margin:2.6mm 0 0;text-align:left;break-after:avoid;page-break-after:avoid}' +
    '.leg-tabela b{color:#1f2933}' +
    '.leg-tabela+table.t{margin-top:1mm}' +
    'table.ident3 th{width:12%}table.ident3 td{width:21.33%}' +
    '.assinatura .papel{font-size:8pt;font-weight:700;color:#52606d;text-align:center;margin:0 0 1mm}' +
    '.parecer-final{margin:3mm 0 2mm;padding:2mm 3.4mm;border-left:3pt solid #52606d;background:#f5f7fa;text-align:left;break-inside:avoid}' +
    '.parecer-final.ok{border-left-color:#1d6b3f}.parecer-final.nok{border-left-color:#a61b1b}';
}

/** Trecho do documento numa folha em paisagem (tabela larga, gráfico longo). Começa e termina em folha nova. */
function SGO_DocA4_paginaPaisagem_(html) {
  return html ? '<section class="pg-paisagem">' + html + '</section>' : '';
}

/** Trecho do documento numa folha em retrato, dentro de um documento em paisagem. */
function SGO_DocA4_paginaRetrato_(html) {
  return html ? '<section class="pg-retrato">' + html + '</section>' : '';
}

/** Legenda numerada de tabela: "Tabela N — texto" (vai acima da tabela). */
function SGO_DocA4_legendaTabela_(numero, texto) {
  return '<p class="leg-tabela"><b>Tabela ' + SGO_DocA4_esc_(numero) + '</b>' + (texto ? ' — ' + SGO_DocA4_esc_(texto) : '') + '</p>';
}

/**
 * Capa (1ª folha, sem cabeçalho e rodapé corridos).
 * capa: { tipo, linhas:[[rótulo, valor]], texto }; usa titulo/subtitulo/numero/revisao/empresa do doc.
 */
function SGO_DocA4_capa_(doc) {
  var c = doc.capa || {};
  var empresa = doc.empresa || {};
  var h = '<section class="capa"><div class="logo"><img src="' + SGO_DocA4_logoDataUri_() + '" alt="Metrolabs"></div>';
  h += '<div class="meio">' + (c.tipo ? '<p class="tipo">' + SGO_DocA4_esc_(c.tipo) + '</p>' : '') +
    '<h1>' + SGO_DocA4_esc_(doc.titulo || '') + '</h1>' +
    (doc.subtitulo ? '<p class="sub">' + SGO_DocA4_esc_(doc.subtitulo) + '</p>' : '');
  if (c.linhas && c.linhas.length) {
    h += '<table class="t ident ficha"><tbody>' + c.linhas.filter(function (l) { return l && l[0]; }).map(function (l) {
      return '<tr><th>' + SGO_DocA4_esc_(l[0]) + '</th><td>' + SGO_DocA4_esc_(String(l[1] == null ? '' : l[1]).trim() || '—') + '</td></tr>';
    }).join('') + '</tbody></table>';
  }
  if (c.texto) h += '<div class="texto">' + SGO_DocA4_paragrafos_(c.texto) + '</div>';
  h += '</div><div class="pe"><p>' + SGO_DocA4_esc_((empresa.nome || 'Metrolab Soluções em Engenharia Clínica LTDA') + (empresa.cnpj ? ' · CNPJ ' + empresa.cnpj : '')) + '</p>' +
    '<p>' + SGO_DocA4_esc_((doc.rotuloNumero || 'Nº') + ' ' + (doc.numero || '—') + ' · Revisão ' + SGO_DocA4_revisao_(doc.revisao)) + '</p></div></section>';
  return h;
}

/**
 * Parecer final em uma linha (fim da conclusão). O quadro de resultado fica só
 * na abertura do documento: regra de não repetir conteúdo (padrão de 18/10/2026).
 */
function SGO_DocA4_linhaParecer_(status, rotulo, textoAprovado, textoReprovado, textoInfo) {
  var c = SGO_DocA4_classeStatus_(status);
  var v = c === 'nok' ? (textoReprovado || 'Reprovado') : (c === 'ok' ? (textoAprovado || 'Aprovado') : (textoInfo || 'Informativo'));
  return '<p class="parecer-final ' + c + '"><b>' + SGO_DocA4_esc_(rotulo || 'Parecer') + ':</b> <span class="' + c + '-txt">' + SGO_DocA4_esc_(v) + '</span></p>';
}

/** Marcador do sumário automático (preenchido por SGO_DocA4_paginar_). */
function SGO_DocA4_marcadorSumario_() {
  return '<nav class="sumario" data-sgo-sumario></nav>';
}

function SGO_DocA4_textoTitulo_(htmlInterno) {
  return String(htmlInterno || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

/**
 * Dá id aos títulos h2/h3 (quando faltar) e, se houver o marcador do sumário,
 * monta a lista com um espaço reservado para o número da página.
 * Título com class "sem-sumario" fica fora. Devolve { html, temSumario, itens }.
 */
function SGO_DocA4_prepararSumario_(html) {
  var h = String(html || '');
  var marcador = /<nav class="sumario" data-sgo-sumario><\/nav>/;
  var pos = h.search(marcador);
  var itens = [], usados = {}, k = 0;
  h.replace(/\sid="([^"]+)"/g, function (m, id) { usados[id] = true; return m; });
  h = h.replace(/<h([23])((?:\s[^>]*)?)>([\s\S]*?)<\/h\1>/gi, function (m, nivel, attrs, interno, offset) {
    if (pos >= 0 && offset < pos) return m;
    if (/class="[^"]*\bsem-sumario\b/.test(attrs || '')) return m;
    var texto = SGO_DocA4_textoTitulo_(interno);
    if (!texto) return m;
    var idm = /\sid="([^"]+)"/.exec(attrs || '');
    var id = idm ? idm[1] : '';
    if (!id) {
      do { k++; id = 'sec-' + k; } while (usados[id]);
      usados[id] = true;
      attrs = (attrs || '') + ' id="' + id + '"';
    }
    itens.push({ nivel: Number(nivel), id: id, texto: texto });
    return '<h' + nivel + attrs + '>' + interno + '</h' + nivel + '>';
  });
  if (pos < 0 || !itens.length) return { html: h.replace(marcador, ''), temSumario: false, itens: itens };
  var lista = '<nav class="sumario" data-sgo-sumario="1"><p class="sumario-tit">Sumário</p><ol>' + itens.map(function (it) {
    return '<li class="n' + it.nivel + '"><a href="#' + it.id + '"><span class="t">' + it.texto + '</span><span class="pt"></span>' +
      '<span class="pg" data-sgo-pg="' + it.id + '"></span></a></li>';
  }).join('') + '</ol></nav>';
  return { html: h.replace(marcador, lista), temSumario: true, itens: itens };
}

/** HTML → PDF (Blob), pelo mesmo caminho que a gravação usa. */
function SGO_DocA4_pdfDeHtml_(html, nome) {
  var base = String(nome || 'Documento').replace(/\.(pdf|html?)$/i, '');
  var conteudo = typeof SGO_DocSalvar_garantirCharset_ === 'function' ? SGO_DocSalvar_garantirCharset_(html) : String(html || '');
  var origem = Utilities.newBlob('', MimeType.HTML, base + '.html');
  origem.setDataFromString(conteudo, 'UTF-8');
  origem.setContentType(MimeType.HTML);
  var pdf = origem.getAs(MimeType.PDF);
  pdf.setName(base + '.pdf');
  return pdf;
}

/** Conteúdo do PDF como texto de 1 byte por caractere (para ler a estrutura). */
function SGO_DocA4_pdfTexto_(pdf) {
  if (typeof pdf === 'string') return pdf;
  try { return pdf.getDataAsString('ISO-8859-1'); } catch (e) {}
  var b = pdf.getBytes(), partes = [];
  for (var i = 0; i < b.length; i += 8192) {
    var fatia = [];
    for (var j = i; j < Math.min(b.length, i + 8192); j++) fatia.push(b[j] & 255);
    partes.push(String.fromCharCode.apply(null, fatia));
  }
  return partes.join('');
}

/**
 * Página (1, 2, ...) de cada destino interno do PDF ({ 'sec-1': 2, ... }).
 * Lê o catálogo, a árvore de páginas e os destinos nomeados (/Dests do
 * catálogo ou árvore /Names). Só os destinos usados por links existem no PDF.
 * Nunca lança: devolve {} se não reconhecer a estrutura.
 */
function SGO_DocA4_paginasDoPdf_(pdf) {
  var saida = {};
  try {
    var s = SGO_DocA4_pdfTexto_(pdf);
    var objs = {}, re = /(\d+)\s+0\s+obj\b/g, m;
    while ((m = re.exec(s))) {
      var fim = s.indexOf('endobj', re.lastIndex);
      if (!objs[m[1]]) objs[m[1]] = s.substring(re.lastIndex, fim < 0 ? s.length : fim);
      if (fim > 0) re.lastIndex = fim;
    }
    var catalogo = null;
    Object.keys(objs).some(function (n) { if (/\/Type\s*\/Catalog\b/.test(objs[n])) { catalogo = objs[n]; return true; } return false; });
    if (!catalogo) return saida;
    var raiz = /\/Pages\s+(\d+)\s+0\s+R/.exec(catalogo);
    if (!raiz) return saida;
    var ordem = {}, total = 0, visto = {};
    (function andar(n) {
      if (visto[n] || !objs[n]) return;
      visto[n] = true;
      var o = objs[n];
      if (/\/Type\s*\/Pages\b/.test(o)) {
        var kids = /\/Kids\s*\[([^\]]*)\]/.exec(o);
        if (kids) kids[1].replace(/(\d+)\s+0\s+R/g, function (x, k) { andar(k); return x; });
      } else if (/\/Type\s*\/Page\b/.test(o)) {
        total++; ordem[n] = total;
      }
    })(raiz[1]);
    function nome(t) { return t.replace(/#([0-9A-Fa-f]{2})/g, function (x, hx) { return String.fromCharCode(parseInt(hx, 16)); }); }
    function lerDicionario(txt) {
      txt.replace(/\/([^\s\/\[\]<>()]+)\s*\[\s*(\d+)\s+0\s+R/g, function (x, n, p) { if (ordem[p]) saida[nome(n)] = ordem[p]; return x; });
    }
    var dests = /\/Dests\s+(\d+)\s+0\s+R/.exec(catalogo);
    if (dests && objs[dests[1]]) lerDicionario(objs[dests[1]]);
    var inline = /\/Dests\s*<<([\s\S]*?)>>/.exec(catalogo);
    if (inline) lerDicionario(inline[1]);
    // Árvore de nomes (/Names << /Dests N 0 R >>): ( nome ) [ página 0 R ... ]
    var names = /\/Names\s+(\d+)\s+0\s+R/.exec(catalogo);
    var namesTxt = names ? (objs[names[1]] || '') : ((/\/Names\s*<<([\s\S]*?)>>/.exec(catalogo) || [])[1] || '');
    var arvore = /\/Dests\s+(\d+)\s+0\s+R/.exec(namesTxt);
    if (arvore) {
      var vistoN = {};
      (function no(n) {
        if (vistoN[n] || !objs[n]) return;
        vistoN[n] = true;
        var o = objs[n];
        o.replace(/\(([^)]*)\)\s*\[\s*(\d+)\s+0\s+R/g, function (x, nm, p) { if (ordem[p]) saida[nm] = ordem[p]; return x; });
        o.replace(/\(([^)]*)\)\s*(\d+)\s+0\s+R/g, function (x, nm, ref) {
          var d = /\[\s*(\d+)\s+0\s+R/.exec(objs[ref] || '');
          if (d && ordem[d[1]]) saida[nm] = ordem[d[1]];
          return x;
        });
        var kids = /\/Kids\s*\[([^\]]*)\]/.exec(o);
        if (kids) kids[1].replace(/(\d+)\s+0\s+R/g, function (x, k) { no(k); return x; });
      })(arvore[1]);
    }
    saida._total = total;
  } catch (e) { /* estrutura desconhecida: sem números */ }
  return saida;
}

/**
 * Finaliza a paginação de um documento A4: ids nos títulos, sumário com as
 * páginas lidas do PDF (duas passagens, porque o PDF é gerado sem JavaScript e
 * o Chromium ainda não implementa target-counter) e o PDF final pronto para
 * gravar. Nunca lança; sem sumário, gera o PDF só se opcoes.gerarPdf.
 * opcoes: { nome, gerarPdf }
 * Devolve { html, pdfBlob, paginas, totalPaginas, sumarioComPaginas, aviso }.
 */
function SGO_DocA4_paginar_(html, opcoes) {
  opcoes = opcoes || {};
  var saida = { html: String(html || ''), pdfBlob: null, paginas: {}, totalPaginas: 0, sumarioComPaginas: false, aviso: '' };
  try {
    var prep = SGO_DocA4_prepararSumario_(saida.html);
    saida.html = prep.html;
    if (!prep.temSumario) {
      if (opcoes.gerarPdf) saida.pdfBlob = SGO_DocA4_pdfDeHtml_(saida.html, opcoes.nome);
      return saida;
    }
    var pdf1 = SGO_DocA4_pdfDeHtml_(saida.html, opcoes.nome);
    var pags = SGO_DocA4_paginasDoPdf_(pdf1);
    var achou = prep.itens.filter(function (it) { return pags[it.id]; }).length;
    if (!achou) { saida.pdfBlob = pdf1; saida.aviso = 'O sumário saiu sem os números de página (o PDF não informou a posição das seções).'; return saida; }
    saida.html = saida.html.replace(/<span class="pg" data-sgo-pg="([^"]+)"><\/span>/g, function (x, id) {
      return '<span class="pg" data-sgo-pg="' + id + '">' + (pags[id] ? pags[id] : '') + '</span>';
    });
    saida.pdfBlob = SGO_DocA4_pdfDeHtml_(saida.html, opcoes.nome);
    saida.paginas = pags;
    saida.totalPaginas = pags._total || 0;
    saida.sumarioComPaginas = achou === prep.itens.length;
  } catch (e) {
    saida.aviso = 'O sumário saiu sem os números de página: ' + (e && e.message ? e.message : e);
  }
  return saida;
}

/* ============================================================
 * Abertura e fecho do documento
 * doc: { titulo, subtitulo, tituloCurto, rotuloNumero, numero, revisao,
 *        emissao, empresa:{nome,cnpj}, ficha:[[rótulo, valor]...],
 *        resultado:{status, rotulo?, texto?} (opcional), simulado:bool,
 *        avisoSimulado:'...',
 *        orientacao:'retrato'|'paisagem' (18/10), sumario:bool (18/10),
 *        capa:{ tipo, linhas, texto } (18/10) }
 * ============================================================ */

function SGO_DocA4_inicioDocumento_(doc) {
  doc = doc || {};
  var h = [];
  var tituloAba = [doc.titulo || 'Documento', doc.numero ? ('nº ' + doc.numero) : ''].filter(Boolean).join(' ');
  h.push('<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8">');
  h.push('<meta name="viewport" content="width=device-width, initial-scale=1">');
  h.push('<title>' + SGO_DocA4_esc_(tituloAba) + '</title>');
  h.push('<style>' + SGO_DocA4_estilos_(doc) + '</style></head><body>');
  h.push('<div class="barra-tela"><button type="button" onclick="window.print()">Imprimir ou salvar em PDF</button></div>');
  h.push('<main class="folha">');
  h.push('<div class="cab-tela"><img src="' + SGO_DocA4_logoDataUri_() + '" alt="Metrolabs"><div class="meta">' +
    SGO_DocA4_esc_(doc.tituloCurto || doc.titulo || '') + '<br>' + SGO_DocA4_esc_((doc.rotuloNumero || 'Nº') + ' ' + (doc.numero || '—') + ' · Revisão ' + SGO_DocA4_revisao_(doc.revisao)) + '</div></div>');
  if (doc.capa) h.push(SGO_DocA4_capa_(doc));
  if (doc.simulado) {
    h.push('<div class="aviso-simulado">' + SGO_DocA4_esc_(doc.avisoSimulado || 'Documento de uso interno, gerado com dados simulados. Não representa ensaio real e não pode ser entregue ao cliente.') + '</div>');
  }
  if (!doc.capa) {
    h.push('<h1>' + SGO_DocA4_esc_(doc.titulo || '') + '</h1>');
    if (doc.subtitulo) h.push('<p class="subtitulo">' + SGO_DocA4_esc_(doc.subtitulo) + '</p>');
  }
  if (doc.ficha && doc.ficha.length) h.push(SGO_DocA4_tabelaIdent_(doc.ficha, 'ficha'));
  if (doc.resultado) h.push(SGO_DocA4_quadroResultado_(doc.resultado));
  // Sumário automático: os números de página entram em SGO_DocA4_paginar_ (chamado ao salvar).
  if (doc.sumario) h.push(SGO_DocA4_marcadorSumario_());
  return h.join('');
}

function SGO_DocA4_fimDocumento_() {
  return '</main></body></html>';
}

/** Quadro do resultado: { status, rotulo ('Resultado do ensaio'), valor (texto), texto (motivo) } */
function SGO_DocA4_quadroResultado_(r) {
  r = r || {};
  var classe = r.classe || SGO_DocA4_classeStatus_(r.status);
  return '<div class="resultado ' + classe + '"><p class="rot">' + SGO_DocA4_esc_(r.rotulo || 'Resultado') + '</p>' +
    '<p class="val">' + SGO_DocA4_esc_(r.valor || SGO_DocA4_rotuloStatus_(r.status)) + '</p>' +
    (r.texto ? '<p class="mot">' + SGO_DocA4_esc_(r.texto) + '</p>' : '') + '</div>';
}

/* ============================================================
 * Tabelas
 * ============================================================ */

/**
 * Tabela rótulo/valor em 2 pares por linha (padrão). pares: [[rótulo, valor, {largo:true}]]. Valor vazio → '—'.
 * opcoes (18/10/2026, opcional): { porLinha: 3 } → 3 pares por linha, para página ou documento em paisagem.
 */
function SGO_DocA4_tabelaIdent_(pares, classeExtra, opcoes) {
  var porLinha = (opcoes && Number(opcoes.porLinha) === 3) ? 3 : 2;
  var itens = (pares || []).filter(function (p) { return p && p[0]; });
  var linhas = [], atual = [];
  var vazio = '<th></th><td></td>';
  function completar(l) { var r = l.join(''); for (var k = l.length; k < porLinha; k++) r += vazio; return r; }
  function celula(p) {
    var v = p[1];
    var html = (v && typeof v === 'object' && v.html !== undefined) ? v.html : SGO_DocA4_esc_(String(v == null ? '' : v).trim() || '—');
    return '<th>' + SGO_DocA4_esc_(p[0]) + '</th><td' + ((p[2] && p[2].largo) ? ' colspan="' + (porLinha * 2 - 1) + '"' : '') + '>' + html + '</td>';
  }
  itens.forEach(function (p) {
    if (p[2] && p[2].largo) {
      if (atual.length) { linhas.push(completar(atual)); atual = []; }
      linhas.push(celula(p));
      return;
    }
    atual.push(celula(p));
    if (atual.length === porLinha) { linhas.push(atual.join('')); atual = []; }
  });
  if (atual.length) linhas.push(completar(atual));
  return '<table class="t ident' + (porLinha === 3 ? ' ident3' : '') + (classeExtra ? ' ' + classeExtra : '') + '"><tbody>' + linhas.map(function (l) { return '<tr>' + l + '</tr>'; }).join('') + '</tbody></table>';
}

/**
 * Tabela genérica. colunas: [{t:'Título', cls:'num'|'cen'}]; linhas: arrays de células.
 * Célula: texto (escapado) ou {html:'...', cls:'...'} ou {t:'...', cls:'...'}.
 * opcoes: { rodape: [células], classe: '' }
 */
function SGO_DocA4_tabela_(colunas, linhas, opcoes) {
  opcoes = opcoes || {};
  function cel(tag, c, clsPadrao) {
    var cls = clsPadrao || '', conteudo;
    if (c && typeof c === 'object') {
      if (c.cls) cls = c.cls;
      conteudo = c.html !== undefined ? c.html : SGO_DocA4_esc_(c.t == null ? '' : c.t);
      if (c.colspan) return '<' + tag + ' colspan="' + c.colspan + '"' + (cls ? ' class="' + cls + '"' : '') + '>' + conteudo + '</' + tag + '>';
    } else {
      conteudo = SGO_DocA4_esc_(c == null || c === '' ? '—' : c);
    }
    return '<' + tag + (cls ? ' class="' + cls + '"' : '') + '>' + conteudo + '</' + tag + '>';
  }
  var h = '<table class="t' + (opcoes.classe ? ' ' + opcoes.classe : '') + '"><thead><tr>' +
    colunas.map(function (c) { return cel('th', { t: c.t, cls: c.cls }); }).join('') + '</tr></thead><tbody>';
  h += linhas.map(function (l) {
    return '<tr>' + l.map(function (c, i) { return cel('td', c, colunas[i] && colunas[i].cls); }).join('') + '</tr>';
  }).join('');
  // Linha de total no fim do corpo (tfoot seria repetido em cada página pelo navegador).
  if (opcoes.rodape) h += '<tr class="total">' + opcoes.rodape.map(function (c, i) { return cel('td', c, colunas[i] && colunas[i].cls); }).join('') + '</tr>';
  return h + '</tbody></table>';
}

/** Célula de situação colorida: 'Conforme' / 'Não conforme' / texto livre. */
function SGO_DocA4_celSituacao_(conforme, textoSim, textoNao) {
  if (conforme === null || conforme === undefined) return { html: '<span class="info-txt">Informativo</span>' };
  return conforme
    ? { html: '<span class="ok-txt">' + SGO_DocA4_esc_(textoSim || 'Conforme') + '</span>' }
    : { html: '<span class="nok-txt">' + SGO_DocA4_esc_(textoNao || 'Não conforme') + '</span>' };
}

/* ============================================================
 * Figuras, fotos e assinaturas
 * ============================================================ */

function SGO_DocA4_figura_(svg, numero, legenda) {
  if (!svg) return '';
  return '<figure>' + svg + '<figcaption><b>Figura ' + SGO_DocA4_esc_(numero) + '</b> — ' + SGO_DocA4_esc_(legenda || '') + '</figcaption></figure>';
}

function SGO_DocA4_fotos_(fotos) {
  var l = (fotos || []).filter(function (f) { return f && f.base64; });
  if (!l.length) return '';
  return '<div class="fotos">' + l.map(function (f, i) {
    var mime = /^image\/(png|jpe?g|gif|webp)$/i.test(String(f.mimeType || '')) ? f.mimeType : 'image/jpeg';
    return '<div class="foto"><div class="q"><img src="data:' + mime + ';base64,' + String(f.base64).replace(/[^A-Za-z0-9+\/=]/g, '') + '" alt="Foto ' + (i + 1) + '"></div>' +
      '<div class="leg">Foto ' + (i + 1) + (f.legenda ? ' — ' + SGO_DocA4_esc_(f.legenda) : '') + '</div></div>';
  }).join('') + '</div>';
}

/**
 * Bloco de assinaturas. lista: [{ papel, nome, cargo, registro, imagemSvg, imagemBase64:{mimeType,data} }].
 * papel (18/10/2026, opcional): "Elaborado por", "Revisado por", "Aprovado por"... mostrado acima da assinatura.
 * imagemSvg só é aceito se começar com <svg (vem da configuração do módulo).
 */
function SGO_DocA4_assinaturas_(lista) {
  var l = (lista || []).filter(function (a) { return a && (a.nome || a.cargo); });
  if (!l.length) return '';
  var temPapel = l.some(function (a) { return !!a.papel; });
  return '<div class="assinaturas">' + l.map(function (a) {
    var img = '';
    if (a.imagemSvg && /^\s*<svg[\s>]/i.test(a.imagemSvg)) img = a.imagemSvg;
    else if (a.imagemBase64 && a.imagemBase64.data) img = '<img src="data:' + SGO_DocA4_esc_(a.imagemBase64.mimeType || 'image/png') + ';base64,' + a.imagemBase64.data + '" alt="">';
    // Com papel em alguma assinatura, as outras reservam a mesma linha (as linhas de assinatura ficam alinhadas).
    var papel = a.papel ? SGO_DocA4_esc_(a.papel) : (temPapel ? '&nbsp;' : '');
    return '<div class="assinatura">' + (papel ? '<div class="papel">' + papel + '</div>' : '') + '<div class="img">' + img + '</div>' +
      '<div class="linha">' + SGO_DocA4_esc_(a.nome || ' ') + '</div>' +
      '<div class="cargo">' + [a.cargo, a.registro].filter(Boolean).map(SGO_DocA4_esc_).join('<br>') + '</div></div>';
  }).join('') + '</div>';
}

/* ============================================================
 * Registradores (dataloggers) e padrões de referência
 * Cruza a identificação digitada (ex.: "DTL-01, DTL-02") com o cadastro de
 * padrões (CAD_PADROES): descrição, nº do certificado de calibração e
 * validade. Somente leitura; nunca lança.
 * ============================================================ */

function SGO_DocA4_normTag_(s) {
  return String(s == null ? '' : s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/** Data (Date, dd/mm/aaaa, aaaa-mm-dd, serial de planilha) → Date ou null. */
function SGO_DocA4_lerData_(v) {
  if (v === null || v === undefined || v === '') return null;
  if (Object.prototype.toString.call(v) === '[object Date]') return isNaN(v.getTime()) ? null : v;
  if (typeof v === 'number' && isFinite(v) && v > 20000 && v < 80000) return new Date(Math.round((v - 25569) * 86400000));
  var s = String(v).trim(), m;
  if ((m = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/.exec(s))) {
    var a = Number(m[3]); if (a < 100) a += 2000;
    return new Date(a, Number(m[2]) - 1, Number(m[1]), 12);
  }
  if ((m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s))) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12);
  return null;
}

function SGO_DocA4_fmtData_(d) {
  if (!d) return '';
  function dd(n) { return (n < 10 ? '0' : '') + n; }
  return dd(d.getDate()) + '/' + dd(d.getMonth() + 1) + '/' + d.getFullYear();
}

/**
 * textoDtl: identificação digitada no formulário. dataReferencia: data do ensaio (dd/mm/aaaa) ou ''.
 * Devolve { itens:[{tag, descricao, certificado, validade, situacao, conforme, encontrado}], observacoes:[...] }.
 */
function SGO_DocA4_registradores_(textoDtl, dataReferencia) {
  var saida = { itens: [], observacoes: [] };
  var texto = String(textoDtl || '').trim();
  if (!texto) {
    saida.observacoes.push('A identificação do registrador de dados (datalogger) não foi informada no formulário; a rastreabilidade metrológica da medição não pode ser demonstrada neste documento.');
    return saida;
  }
  var padroes = [];
  try {
    if (typeof SGO_DATA !== 'undefined' && SGO_DATA.getAll && typeof SGO_CFG !== 'undefined' && SGO_CFG.SHEETS && SGO_CFG.SHEETS.CAD_PADROES) {
      padroes = SGO_DATA.getAll(SGO_CFG.SHEETS.CAD_PADROES) || [];
    }
  } catch (e) { padroes = []; }
  var ref = SGO_DocA4_lerData_(dataReferencia) || new Date();
  var tokens = texto.split(/[,;\/\n]+|\s+e\s+/i).map(function (t) { return t.trim(); }).filter(Boolean);
  var vistos = {};
  tokens.forEach(function (tok) {
    var n = SGO_DocA4_normTag_(tok);
    if (!n || vistos[n]) return;
    vistos[n] = true;
    var achado = null;
    for (var i = 0; i < padroes.length && !achado; i++) {
      var tp = SGO_DocA4_normTag_(padroes[i].TAG);
      if (tp && tp === n) achado = padroes[i];
    }
    for (var j = 0; j < padroes.length && !achado; j++) {
      var tq = SGO_DocA4_normTag_(padroes[j].TAG);
      if (tq && tq.length >= 4 && n.indexOf(tq) !== -1) achado = padroes[j];
    }
    if (!achado) {
      saida.itens.push({ tag: tok, descricao: '', certificado: '', validade: '', situacao: 'Não localizado no cadastro de padrões', conforme: null, encontrado: false });
      return;
    }
    var val = SGO_DocA4_lerData_(achado.VALIDADE);
    var inativo = String(achado.STATUS || '').toUpperCase() && String(achado.STATUS || '').toUpperCase() !== 'ATIVO';
    var vencido = val ? val.getTime() < new Date(ref.getFullYear(), ref.getMonth(), ref.getDate()).getTime() : null;
    var situacao = val ? (vencido ? 'Vencido na data do ensaio' : 'Válido na data do ensaio') : 'Validade não informada';
    if (inativo) situacao += ' (cadastro inativo)';
    saida.itens.push({
      tag: String(achado.TAG || tok), descricao: String(achado.DESCRICAO || ''), certificado: String(achado.CERTIFICADO_NUMERO || ''),
      validade: SGO_DocA4_fmtData_(val), situacao: situacao, conforme: val ? !vencido : null, encontrado: true
    });
  });
  saida.itens.forEach(function (it) {
    if (!it.encontrado) saida.observacoes.push('O registrador "' + it.tag + '" não foi localizado no cadastro de padrões; o certificado de calibração e a validade não puderam ser conferidos neste documento.');
    else if (it.conforme === false) saida.observacoes.push('O certificado de calibração do registrador ' + it.tag + ' (' + (it.certificado || 'sem número') + ') estava vencido na data do ensaio (validade ' + it.validade + ').');
    else if (it.conforme === null) saida.observacoes.push('A validade do certificado de calibração do registrador ' + it.tag + ' não está informada no cadastro de padrões.');
  });
  return saida;
}

function SGO_DocA4_tabelaRegistradores_(reg) {
  var itens = (reg && reg.itens) || [];
  if (!itens.length) return '<p class="nota">Registrador não informado.</p>';
  return SGO_DocA4_tabela_(
    [{ t: 'Identificação' }, { t: 'Descrição' }, { t: 'Certificado de calibração' }, { t: 'Validade', cls: 'cen' }, { t: 'Situação' }],
    itens.map(function (it) {
      return [it.tag, it.descricao || '—', it.certificado || '—', { t: it.validade || '—', cls: 'cen' },
        it.conforme === true ? { html: '<span class="ok-txt">' + SGO_DocA4_esc_(it.situacao) + '</span>' }
          : (it.conforme === false ? { html: '<span class="nok-txt">' + SGO_DocA4_esc_(it.situacao) + '</span>' } : it.situacao)];
    })
  );
}

/* ============================================================
 * Gráficos em SVG estático (sem JavaScript; nítidos na impressão)
 * ============================================================ */

var SGO_DocA4_PALETA = ['#1f5fa8', '#d1495b', '#2a9d5b', '#e08a00', '#7b4fb0', '#0f8b8d', '#c2185b', '#6d7f12',
  '#5d4037', '#3949ab', '#ef6c00', '#00897b', '#8e24aa', '#546e7a', '#b8860b', '#1b5e20',
  '#ad1457', '#283593', '#4e342e', '#00695c'];

function SGO_DocA4_corSerie_(i) {
  return SGO_DocA4_PALETA[((i % SGO_DocA4_PALETA.length) + SGO_DocA4_PALETA.length) % SGO_DocA4_PALETA.length];
}

/** Passo "redondo" para os eixos (1, 2, 2,5, 5 × 10^n). */
function SGO_DocA4_passo_(faixa, alvo) {
  var bruto = faixa / Math.max(1, alvo || 6);
  if (!(bruto > 0) || !isFinite(bruto)) return 1;
  var mag = Math.pow(10, Math.floor(Math.log(bruto) / Math.LN10));
  var r = bruto / mag;
  var p = r <= 1 ? 1 : (r <= 2 ? 2 : (r <= 2.5 ? 2.5 : (r <= 5 ? 5 : 10)));
  return p * mag;
}

/** Reduz uma série a no máximo ~2×n pontos preservando mínimos e máximos de cada intervalo. */
function SGO_DocA4_reduzir_(pontos, n) {
  if (!pontos || pontos.length <= n * 2) return pontos || [];
  var saida = [], tam = pontos.length / n;
  for (var b = 0; b < n; b++) {
    var ini = Math.floor(b * tam), fim = Math.min(pontos.length, Math.floor((b + 1) * tam));
    var pmin = null, pmax = null;
    for (var i = ini; i < fim; i++) {
      var p = pontos[i];
      if (!pmin || p[1] < pmin[1]) pmin = p;
      if (!pmax || p[1] > pmax[1]) pmax = p;
    }
    if (!pmin) continue;
    if (pmin === pmax) saida.push(pmin);
    else if (pmin[0] <= pmax[0]) { saida.push(pmin); saida.push(pmax); } else { saida.push(pmax); saida.push(pmin); }
  }
  return saida;
}

/**
 * Gráfico de linhas.
 * o = {
 *   series: [{ nome, cor?, pontos: [[x, y], ...] }],   x numérico (ex.: minutos desde o início)
 *   rotuloX, rotuloY, formatarX: function(x) → texto do eixo,
 *   yMin?, yMax?, casasY?,
 *   referencias: [{ y, rotulo, cor?, tracejado? }],
 *   faixasX: [{ x0, x1, rotulo, cor? }],               (janela sombreada, ex.: exposição)
 *   faixaY: { y0, y1, cor? }                             (faixa aceitável sombreada)
 *   largura?, altura?
 * }
 */
function SGO_DocA4_graficoLinhas_(o) {
  o = o || {};
  var W = o.largura || 680, H = o.altura || 300;
  var series = (o.series || []).map(function (s, i) {
    var pts = (s.pontos || []).filter(function (p) { return p && isFinite(p[0]) && p[1] !== null && p[1] !== undefined && isFinite(p[1]); });
    return { nome: s.nome || ('Série ' + (i + 1)), cor: s.cor || SGO_DocA4_corSerie_(i), pontos: SGO_DocA4_reduzir_(pts, o.pontosMax || 360), largura: s.largura || 1.1, tracejado: !!s.tracejado };
  }).filter(function (s) { return s.pontos.length; });
  if (!series.length) return '';

  var xmin = Infinity, xmax = -Infinity, ymin = Infinity, ymax = -Infinity;
  series.forEach(function (s) { s.pontos.forEach(function (p) { if (p[0] < xmin) xmin = p[0]; if (p[0] > xmax) xmax = p[0]; if (p[1] < ymin) ymin = p[1]; if (p[1] > ymax) ymax = p[1]; }); });
  // Escala robusta: uma leitura espúria isolada (sensor desconectado no início,
  // por exemplo) não pode achatar o gráfico inteiro. Valores muito fora do
  // grosso dos dados ficam fora da escala (cortados) e o chamador é avisado
  // por o.cortado, para citar na legenda.
  var todos = [];
  series.forEach(function (s) { s.pontos.forEach(function (p) { todos.push(p[1]); }); });
  todos.sort(function (a, b) { return a - b; });
  var qlo = todos[Math.floor(todos.length * 0.003)], qhi = todos[Math.min(todos.length - 1, Math.ceil(todos.length * 0.997) - 1)];
  var margemQ = Math.max(1, (qhi - qlo) * 0.25);
  o.cortado = null;
  if (!isFinite(o.yMin) && ymin < qlo - margemQ) { o.cortado = { min: ymin }; ymin = qlo; }
  if (!isFinite(o.yMax) && ymax > qhi + margemQ) { o.cortado = o.cortado || {}; o.cortado.max = ymax; ymax = qhi; }
  (o.referencias || []).forEach(function (r) { if (isFinite(r.y)) { if (r.y < ymin) ymin = r.y; if (r.y > ymax) ymax = r.y; } });
  if (o.faixaY) { if (o.faixaY.y0 < ymin) ymin = o.faixaY.y0; if (o.faixaY.y1 > ymax) ymax = o.faixaY.y1; }
  if (isFinite(o.yMin)) ymin = o.yMin;
  if (isFinite(o.yMax)) ymax = o.yMax;
  if (xmax === xmin) xmax = xmin + 1;
  if (ymax === ymin) { ymax += 1; ymin -= 1; }
  var folga = (ymax - ymin) * 0.06;
  var passoY = SGO_DocA4_passo_(ymax - ymin + 2 * folga, 6);
  var y0 = Math.floor((ymin - folga) / passoY) * passoY, y1 = Math.ceil((ymax + folga) / passoY) * passoY;

  // legenda abaixo do gráfico, em linhas de até 6 itens
  var porLinha = series.length > 12 ? 7 : 6;
  var linhasLeg = Math.ceil(series.length / porLinha);
  var mL = 52, mR = 14, mT = 12, mB = 42 + linhasLeg * 15;
  var Htot = H + linhasLeg * 15;
  var pw = W - mL - mR, ph = Htot - mT - mB;
  function X(x) { return mL + (x - xmin) / (xmax - xmin) * pw; }
  function Y(y) { return mT + (1 - (y - y0) / (y1 - y0)) * ph; }
  function f1(n) { return (Math.round(n * 10) / 10).toString(); }
  var casasY = o.casasY !== undefined ? o.casasY : (passoY < 1 ? (passoY < 0.1 ? 2 : 1) : 0);

  var s = [];
  s.push('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + ' ' + Htot + '" width="' + W + '" height="' + Htot + '" font-family="Arial, Helvetica, sans-serif" font-size="9.5">');
  s.push('<rect x="0" y="0" width="' + W + '" height="' + Htot + '" fill="#ffffff"/>');
  if (o.faixaY && isFinite(o.faixaY.y0) && isFinite(o.faixaY.y1)) {
    s.push('<rect x="' + f1(mL) + '" y="' + f1(Y(o.faixaY.y1)) + '" width="' + f1(pw) + '" height="' + f1(Math.max(0, Y(o.faixaY.y0) - Y(o.faixaY.y1))) + '" fill="' + (o.faixaY.cor || '#e8f3ec') + '"/>');
  }
  (o.faixasX || []).forEach(function (fx) {
    if (!isFinite(fx.x0) || !isFinite(fx.x1)) return;
    var a = Math.max(mL, X(fx.x0)), b = Math.min(mL + pw, X(fx.x1));
    if (b <= a) return;
    s.push('<rect x="' + f1(a) + '" y="' + mT + '" width="' + f1(b - a) + '" height="' + f1(ph) + '" fill="' + (fx.cor || '#eef3fb') + '"/>');
    if (fx.rotulo) s.push('<text x="' + f1((a + b) / 2) + '" y="' + (mT + 10) + '" text-anchor="middle" fill="#3e4c59" font-size="8.5">' + SGO_DocA4_esc_(fx.rotulo) + '</text>');
  });
  // grade e eixo Y
  for (var v = y0; v <= y1 + passoY / 2; v += passoY) {
    var yy = Y(v);
    s.push('<line x1="' + mL + '" y1="' + f1(yy) + '" x2="' + (mL + pw) + '" y2="' + f1(yy) + '" stroke="#e1e6ec" stroke-width="0.7"/>');
    s.push('<text x="' + (mL - 5) + '" y="' + f1(yy + 3.2) + '" text-anchor="end" fill="#3e4c59">' + SGO_DocA4_esc_(SGO_DocA4_num_(v, casasY)) + '</text>');
  }
  // eixo X
  var passoX = SGO_DocA4_passo_(xmax - xmin, 8);
  var xi = Math.ceil(xmin / passoX) * passoX;
  for (var xv = xi; xv <= xmax + 1e-9; xv += passoX) {
    var xx = X(xv);
    s.push('<line x1="' + f1(xx) + '" y1="' + mT + '" x2="' + f1(xx) + '" y2="' + (mT + ph) + '" stroke="#eef1f4" stroke-width="0.7"/>');
    s.push('<text x="' + f1(xx) + '" y="' + (mT + ph + 13) + '" text-anchor="middle" fill="#3e4c59">' + SGO_DocA4_esc_(o.formatarX ? o.formatarX(xv) : SGO_DocA4_num_(xv, passoX < 1 ? 1 : 0)) + '</text>');
  }
  s.push('<rect x="' + mL + '" y="' + mT + '" width="' + pw + '" height="' + f1(ph) + '" fill="none" stroke="#9aa5b1" stroke-width="0.8"/>');
  // séries (recortadas à área do gráfico)
  var idClip = 'clip' + Math.floor(Math.random() * 1e9);
  s.push('<defs><clipPath id="' + idClip + '"><rect x="' + mL + '" y="' + mT + '" width="' + pw + '" height="' + f1(ph) + '"/></clipPath></defs><g clip-path="url(#' + idClip + ')">');
  series.forEach(function (se) {
    var d = se.pontos.map(function (p, i) { return (i ? 'L' : 'M') + f1(X(p[0])) + ' ' + f1(Y(p[1])); }).join('');
    s.push('<path d="' + d + '" fill="none" stroke="' + se.cor + '" stroke-width="' + se.largura + '" stroke-linejoin="round"' + (se.tracejado ? ' stroke-dasharray="4 3"' : '') + '/>');
  });
  s.push('</g>');
  // linhas de referência
  (o.referencias || []).forEach(function (r) {
    if (!isFinite(r.y)) return;
    var yr = Y(r.y);
    s.push('<line x1="' + mL + '" y1="' + f1(yr) + '" x2="' + (mL + pw) + '" y2="' + f1(yr) + '" stroke="' + (r.cor || '#a61b1b') + '" stroke-width="1"' + (r.tracejado === false ? '' : ' stroke-dasharray="5 3"') + '/>');
    if (r.rotulo) s.push('<text x="' + (r.lado === 'esq' ? mL + 4 : mL + pw - 4) + '" y="' + f1(yr - 3) + '" text-anchor="' + (r.lado === 'esq' ? 'start' : 'end') + '" fill="' + (r.cor || '#a61b1b') + '" font-size="8.5">' + SGO_DocA4_esc_(r.rotulo) + '</text>');
  });
  // rótulos dos eixos
  if (o.rotuloY) s.push('<text transform="translate(12 ' + f1(mT + ph / 2) + ') rotate(-90)" text-anchor="middle" fill="#1f2933" font-size="9.5">' + SGO_DocA4_esc_(o.rotuloY) + '</text>');
  if (o.rotuloX) s.push('<text x="' + f1(mL + pw / 2) + '" y="' + (mT + ph + 27) + '" text-anchor="middle" fill="#1f2933" font-size="9.5">' + SGO_DocA4_esc_(o.rotuloX) + '</text>');
  // legenda
  var larguraItem = pw / porLinha;
  series.forEach(function (se, i) {
    var lin = Math.floor(i / porLinha), col = i % porLinha;
    var lx = mL + col * larguraItem, ly = mT + ph + 40 + lin * 15;
    s.push('<line x1="' + f1(lx) + '" y1="' + (ly - 3) + '" x2="' + f1(lx + 16) + '" y2="' + (ly - 3) + '" stroke="' + se.cor + '" stroke-width="2.2"' + (se.tracejado ? ' stroke-dasharray="4 3"' : '') + '/>');
    s.push('<text x="' + f1(lx + 20) + '" y="' + ly + '" fill="#1f2933">' + SGO_DocA4_esc_(se.nome) + '</text>');
  });
  s.push('</svg>');
  return s.join('');
}

/** Frase para a legenda quando o gráfico cortou leituras espúrias da escala. */
function SGO_DocA4_notaCorte_(o, unidade) {
  var c = o && o.cortado;
  if (!c) return '';
  var partes = [];
  if (isFinite(c.min)) partes.push('mínima de ' + SGO_DocA4_val_(c.min, 2, unidade));
  if (isFinite(c.max)) partes.push('máxima de ' + SGO_DocA4_val_(c.max, 2, unidade));
  return ' Leituras isoladas fora da escala do gráfico (' + partes.join(' e ') + ') constam dos dados e foram omitidas do traçado para preservar a legibilidade.';
}

/**
 * Gráfico de barras horizontais (ex.: F0 ou A0 por sensor), com linha do mínimo.
 * o = { itens:[{ rotulo, valor, destaque? }], limite:{ valor, rotulo }, unidade, casas, largura? }
 */
function SGO_DocA4_graficoBarras_(o) {
  o = o || {};
  var itens = (o.itens || []).filter(function (i) { return i && isFinite(i.valor); });
  if (!itens.length) return '';
  var W = o.largura || 680, alturaBarra = 15, gap = 6;
  var mL = 46, mR = 70, mT = 8, mB = 30;
  var H = mT + mB + itens.length * (alturaBarra + gap);
  var pw = W - mL - mR;
  var vmax = 0;
  itens.forEach(function (i) { if (i.valor > vmax) vmax = i.valor; });
  if (o.limite && isFinite(o.limite.valor) && o.limite.valor > vmax) vmax = o.limite.valor;
  var passo = SGO_DocA4_passo_(vmax * 1.08 || 1, 6);
  var xmax = Math.ceil((vmax * 1.08 || 1) / passo) * passo;
  function X(v) { return mL + Math.max(0, v) / xmax * pw; }
  function f1(n) { return (Math.round(n * 10) / 10).toString(); }
  var s = [];
  s.push('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '" font-family="Arial, Helvetica, sans-serif" font-size="9.5">');
  s.push('<rect x="0" y="0" width="' + W + '" height="' + H + '" fill="#ffffff"/>');
  for (var v = 0; v <= xmax + passo / 2; v += passo) {
    s.push('<line x1="' + f1(X(v)) + '" y1="' + mT + '" x2="' + f1(X(v)) + '" y2="' + (H - mB) + '" stroke="#e7ebef" stroke-width="0.7"/>');
    s.push('<text x="' + f1(X(v)) + '" y="' + (H - mB + 13) + '" text-anchor="middle" fill="#3e4c59">' + SGO_DocA4_esc_(SGO_DocA4_num_(v, passo < 1 ? 1 : 0)) + '</text>');
  }
  var lim = o.limite && isFinite(o.limite.valor) ? o.limite.valor : null;
  itens.forEach(function (it, k) {
    var y = mT + k * (alturaBarra + gap);
    var abaixo = lim !== null && it.valor < lim;
    var cor = abaixo ? '#a61b1b' : (it.destaque ? '#b45309' : '#1f5fa8');
    s.push('<text x="' + (mL - 6) + '" y="' + f1(y + alturaBarra - 4) + '" text-anchor="end" fill="#1f2933">' + SGO_DocA4_esc_(it.rotulo) + '</text>');
    s.push('<rect x="' + mL + '" y="' + y + '" width="' + f1(Math.max(1, X(it.valor) - mL)) + '" height="' + alturaBarra + '" fill="' + cor + '" fill-opacity="0.85"/>');
    s.push('<text x="' + f1(X(it.valor) + 4) + '" y="' + f1(y + alturaBarra - 4) + '" fill="#1f2933">' + SGO_DocA4_esc_(SGO_DocA4_num_(it.valor, o.casas === undefined ? 2 : o.casas)) + '</text>');
  });
  if (lim !== null) {
    s.push('<line x1="' + f1(X(lim)) + '" y1="' + (mT - 4) + '" x2="' + f1(X(lim)) + '" y2="' + (H - mB) + '" stroke="#a61b1b" stroke-width="1.2" stroke-dasharray="5 3"/>');
    if (o.limite.rotulo) s.push('<text x="' + f1(Math.min(W - 4, X(lim) + 4)) + '" y="' + (H - mB + 25) + '" text-anchor="' + (X(lim) > W - 160 ? 'end' : 'start') + '" fill="#a61b1b" font-size="8.5">' + SGO_DocA4_esc_(o.limite.rotulo) + '</text>');
  }
  if (o.unidade) s.push('<text x="' + (W - 4) + '" y="' + (H - mB + 13) + '" text-anchor="end" fill="#3e4c59">' + SGO_DocA4_esc_(o.unidade) + '</text>');
  s.push('</svg>');
  return s.join('');
}

/**
 * Séries de temperatura por sensor a partir das linhas normalizadas dos
 * leitores ({ tempoDate, tempoStr, temperaturas:[...] }).
 * Devolve { series, t0Ms, formatarX } com x em minutos desde a 1ª leitura.
 * opcoes: { sensoresAtivos:[bool], deslocamento:°C, rotulo:function(s) → nome, tz }
 */
function SGO_DocA4_seriesTemperatura_(linhas, opcoes) {
  opcoes = opcoes || {};
  var l = linhas || [];
  var t0 = null;
  for (var i = 0; i < l.length && t0 === null; i++) {
    var d = l[i] && l[i].tempoDate;
    if (d && Object.prototype.toString.call(d) === '[object Date]' && !isNaN(d.getTime())) t0 = d.getTime();
  }
  var dtMin = isFinite(opcoes.dtMin) && opcoes.dtMin > 0 ? opcoes.dtMin : 1;
  function xDe(row, idx) {
    var d = row && row.tempoDate;
    if (t0 !== null && d && Object.prototype.toString.call(d) === '[object Date]' && !isNaN(d.getTime())) return (d.getTime() - t0) / 60000;
    return idx * dtMin;
  }
  var n = 0;
  l.forEach(function (r) { if (r && r.temperaturas && r.temperaturas.length > n) n = r.temperaturas.length; });
  var ativos = opcoes.sensoresAtivos || [];
  var desloc = Number(opcoes.deslocamento) || 0;
  var series = [];
  for (var s = 0; s < n; s++) {
    if (ativos.length && !ativos[s]) continue;
    var pts = [];
    l.forEach(function (r, idx) {
      var v = r && r.temperaturas ? r.temperaturas[s] : null;
      var num = (v === null || v === undefined || v === '') ? NaN : Number(v);
      if (isFinite(num)) pts.push([xDe(r, idx), num + desloc]);
    });
    if (pts.length) series.push({ nome: opcoes.rotulo ? opcoes.rotulo(s) : ('S' + (s + 1)), cor: SGO_DocA4_corSerie_(s), pontos: pts });
  }
  var tz = opcoes.tz || 'America/Sao_Paulo';
  return {
    series: series,
    t0Ms: t0,
    xDe: xDe,
    formatarX: function (x) {
      if (t0 === null) return SGO_DocA4_num_(x, 0) + ' min';
      try { return Utilities.formatDate(new Date(t0 + x * 60000), tz, 'HH:mm'); } catch (e) { return SGO_DocA4_num_(x, 0); }
    }
  };
}

/* ============================================================
 * Relatório de qualificação térmica por estudos (Cadeia de Frio e
 * Estufa/Banho-maria/Secadora): o mesmo documento para os dois módulos.
 * ============================================================ */

/** Gráfico de um estudo: temperatura por sensor com a faixa aceitável. */
function SGO_DocA4_graficoEstudoFaixa_(dadosFatia, sensoresAtivos, faixa, tz) {
  var series = SGO_DocA4_seriesTemperatura_(dadosFatia || [], { sensoresAtivos: sensoresAtivos, tz: tz });
  if (!series.series.length) return null;
  faixa = faixa || {};
  var refs = [];
  var tol = Number(faixa.tolerancia) || 0;
  if (isFinite(faixa.tMin)) refs.push({ y: faixa.tMin, rotulo: 'Mínima ' + SGO_DocA4_val_(faixa.tMin, 1, '°C'), cor: '#1d6b3f', tracejado: false });
  if (isFinite(faixa.tMax)) refs.push({ y: faixa.tMax, rotulo: 'Máxima ' + SGO_DocA4_val_(faixa.tMax, 1, '°C'), cor: '#1d6b3f', tracejado: false });
  if (tol > 0 && isFinite(faixa.tMin)) refs.push({ y: faixa.tMin - tol, rotulo: 'Limite com tolerância ' + SGO_DocA4_val_(faixa.tMin - tol, 1, '°C'), cor: '#a61b1b', lado: 'esq' });
  if (tol > 0 && isFinite(faixa.tMax)) refs.push({ y: faixa.tMax + tol, rotulo: 'Limite com tolerância ' + SGO_DocA4_val_(faixa.tMax + tol, 1, '°C'), cor: '#a61b1b', lado: 'esq' });
  var duracaoMin = 0;
  series.series.forEach(function (s) { var p = s.pontos; if (p.length) duracaoMin = Math.max(duracaoMin, p[p.length - 1][0]); });
  var t0 = series.t0Ms;
  var o = {
    series: series.series, rotuloX: duracaoMin > 36 * 60 ? 'Data e horário' : 'Horário', rotuloY: 'Temperatura (°C)', referencias: refs,
    faixaY: (isFinite(faixa.tMin) && isFinite(faixa.tMax)) ? { y0: faixa.tMin, y1: faixa.tMax, cor: '#edf6f0' } : null,
    formatarX: function (x) {
      if (t0 === null) return SGO_DocA4_num_(x, 0) + ' min';
      try { return Utilities.formatDate(new Date(t0 + x * 60000), tz || 'America/Sao_Paulo', duracaoMin > 36 * 60 ? 'dd/MM HH:mm' : 'HH:mm'); } catch (e) { return SGO_DocA4_num_(x, 0); }
    }
  };
  var svg = SGO_DocA4_graficoLinhas_(o);
  return svg ? { svg: svg, nota: SGO_DocA4_notaCorte_(o, '°C') } : null;
}

function SGO_DocA4_situacaoEstudo_(status) {
  var s = String(status || '').toUpperCase();
  if (s === 'REPROVADO') return false;
  if (s.indexOf('APROVADO') === 0) return true;
  return null;
}

/**
 * Critério e resultado de um estudo (texto), para a tabela de critérios.
 * estudo: { tipoEstudo, label, statusAprovacao, fatos }
 */
function SGO_DocA4_criterioEstudo_(estudo, faixa) {
  var f = estudo.fatos || {};
  var e = f.estatisticas || {};
  var tipo = String(estudo.tipoEstudo || '').toUpperCase();
  var faixaTxt = SGO_DocA4_val_(faixa.tMin, 1, '°C') + ' a ' + SGO_DocA4_val_(faixa.tMax, 1, '°C') + (Number(faixa.tolerancia) ? ' (tolerância ± ' + SGO_DocA4_val_(faixa.tolerancia, 1, '°C') + ')' : '');
  var req, obt;
  if (tipo === 'AUTONOMIA') {
    req = 'Caracterização: tempo em que a temperatura permanece na faixa ' + faixaTxt;
    obt = 'Autonomia de ' + SGO_DocA4_val_(f.autonomiaMinutos, 1, 'min');
  } else if (tipo === 'ABERTURA_PORTA' || tipo === 'QUEDA_ENERGIA') {
    req = 'Permanecer na faixa ' + faixaTxt + (f.tempoAlvoMinutos ? ' por pelo menos ' + SGO_DocA4_val_(f.tempoAlvoMinutos, 0, 'min') : ' durante o evento');
    obt = f.rompeu ? ('Saiu da faixa após ' + SGO_DocA4_val_(f.tempoAteRupturaMinutos, 1, 'min')) : 'Permaneceu na faixa';
    if (f.recuperouTotalmente !== undefined && f.rompeu) obt += f.recuperouTotalmente ? '; recuperou em ' + SGO_DocA4_val_(f.tempoAteRecuperacaoMinutos, 1, 'min') : '; não recuperou no período registrado';
  } else if (f.repeticoes && f.repeticoes.length && f.repeticoes.some(function (r) { return r.valorLabel; })) {
    var r0 = f.repeticoes.filter(function (r) { return r.valorLabel; })[0];
    req = r0.valorLabel + ' ≥ ' + SGO_DocA4_val_(r0.minimoExigido, 2, 'min') + ' em cada repetição, com temperatura na faixa ' + faixaTxt;
    obt = f.repeticoes.map(function (r) { return 'Rep. ' + r.numero + ': ' + (r.valorLabel ? SGO_DocA4_val_(r.minimoObtido, 2, 'min') : SGO_DocA4_rotuloStatus_(r.status)); }).join('; ');
  } else {
    req = 'Todas as leituras dos sensores ativos na faixa ' + faixaTxt;
    obt = 'Mínima ' + SGO_DocA4_val_(e.min, 2, '°C') + ' e máxima ' + SGO_DocA4_val_(e.max, 2, '°C');
  }
  return { criterio: estudo.label, requisito: req, obtido: obt, conforme: SGO_DocA4_situacaoEstudo_(estudo.statusAprovacao) };
}

/**
 * Documento completo de qualificação térmica por estudos.
 * o = { ctx, textos:{introducao,objetivo,conclusaoGeral,analisePorEstudo}, fotos, geradoEm,
 *       graficos:{ tipoEstudo: {svg, nota} }, assinaturas:[...], descricaoMetodo, intervaloLeiturasSegundos }
 */
function SGO_DocA4_documentoQualificacaoTermica_(o) {
  var ctx = o.ctx, id = ctx.identificacao, textos = o.textos || {}, faixa = ctx.faixa || {};
  var st = String(ctx.statusConsolidado || '').toUpperCase();
  var classe = SGO_DocA4_classeStatus_(st);
  var parecer = classe === 'nok' ? 'Não qualificado para o uso pretendido' : (classe === 'ok' ? 'Qualificado para o uso pretendido' : 'Caracterização térmica (sem critério de aprovação)');
  var criterios = (ctx.estudos || []).map(function (e) { return SGO_DocA4_criterioEstudo_(e, faixa); });
  var reprovados = criterios.filter(function (c) { return c.conforme === false; }).map(function (c) { return c.criterio; });
  var resumo = reprovados.length
    ? 'Não atendeu ao critério de aceitação em: ' + reprovados.join('; ') + '.'
    : (classe === 'ok' ? 'Todos os estudos realizados atenderam aos critérios de aceitação (' + criterios.length + ' estudo' + (criterios.length > 1 ? 's' : '') + ').' : 'Estudos de caracterização, sem critério de aprovação aplicável.');
  var h = [];
  h.push(SGO_DocA4_inicioDocumento_({
    titulo: 'Relatório de qualificação térmica',
    subtitulo: ctx.equipamentoLabel + '. Certificado de qualificação térmica emitido com base nos estudos descritos neste documento.',
    tituloCurto: 'Relatório de qualificação térmica — ' + ctx.equipamentoLabel,
    rotuloNumero: 'Certificado nº',
    numero: id.certificadoNumero || 'sem número',
    revisao: id.revisao || '0',
    empresa: id.empresaExecutante,
    ficha: [['Data do ensaio', id.dataDoEnsaio || '—'], ['Emissão', o.geradoEm], ['Estudos realizados', String((ctx.estudos || []).length)], ['Faixa de aceitação', SGO_DocA4_val_(faixa.tMin, 1, '°C') + ' a ' + SGO_DocA4_val_(faixa.tMax, 1, '°C')]],
    simulado: ctx.simulado,
    resultado: { status: st, rotulo: 'Parecer', valor: parecer, texto: resumo },
    sumario: true
  }));

  h.push('<h2>1. Identificação</h2>');
  var pares = [
    ['Cliente', id.cliente], ['CNPJ', id.cnpj], ['Endereço', id.endereco, { largo: true }],
    ['Setor', id.setor], ['TAG', id.tag], ['Equipamento', ctx.equipamentoLabel], ['Marca', id.marca],
    ['Modelo', id.modelo], ['Nº de série', id.numeroSerie], ['Técnico executor', id.tecnicoExecutor],
    ['Responsável pelo aceite', id.responsavelAceite]
  ];
  if (id.inicioEnsaio24h) pares.push(['Início do estudo de distribuição', id.inicioEnsaio24h]);
  if (id.inicioEnsaioPorta) pares.push(['Início do ensaio de abertura de porta', id.inicioEnsaioPorta]);
  if (id.inicioEnsaioEnergia) pares.push(['Início do ensaio de queda de energia', id.inicioEnsaioEnergia]);
  pares.push(['Empresa executante', id.empresaExecutante.nome + ' — CNPJ ' + id.empresaExecutante.cnpj, { largo: true }]);
  if (id.tarefaOrigem) pares.push(['Tarefa de origem', id.tarefaOrigem, { largo: true }]);
  h.push(SGO_DocA4_tabelaIdent_(pares));

  h.push('<h2>2. Introdução</h2>' + SGO_DocA4_paragrafos_(textos.introducao));
  h.push('<h2>3. Objetivo</h2>' + SGO_DocA4_paragrafos_(textos.objetivo));

  h.push('<h2>4. Instrumentação e rastreabilidade</h2>');
  h.push('<p>As temperaturas foram registradas por registradores de dados (dataloggers) com sensores distribuídos no volume útil do equipamento. Os registradores utilizados e a situação dos seus certificados de calibração na data do ensaio, conforme o cadastro de padrões da empresa executante, estão identificados nesta seção.</p>');
  h.push(SGO_DocA4_tabelaRegistradores_(ctx.registradores));
  var parametros = [['Sensores utilizados', ctx.sensoresUtilizados || (ctx.quantidadeSensoresAtivos ? ctx.quantidadeSensoresAtivos + ' sensores ativos' : '—')]];
  if (o.intervaloLeiturasSegundos) parametros.push(['Intervalo entre leituras', SGO_DocA4_val_(o.intervaloLeiturasSegundos, 0, 's')]);
  h.push(SGO_DocA4_tabelaIdent_(parametros));

  h.push('<h2>5. Metodologia, critérios de aceitação e referências</h2>');
  h.push('<p>' + SGO_DocA4_esc_(o.descricaoMetodo || 'Os sensores foram distribuídos no volume útil do equipamento e registraram a temperatura durante toda a janela de cada estudo. Para cada estudo calculam-se a mínima, a máxima, a média, a mediana, o desvio-padrão e a amplitude das leituras dos sensores ativos, além da conformidade de cada posição em relação à faixa de aceitação. Períodos de estabilização inicial identificados nos dados aparecem nos gráficos, mas não entram no julgamento.') + '</p>');
  h.push('<h3>5.1 Critérios de aceitação</h3>');
  h.push(SGO_DocA4_tabela_([{ t: 'Estudo' }, { t: 'Requisito' }], criterios.map(function (c) { return [c.criterio, c.requisito]; })));
  h.push('<h3>5.2 Referências normativas</h3>' + SGO_DocA4_lista_(ctx.normas));

  h.push('<h2>6. Resultados</h2>');
  var nFig = 0;
  (ctx.estudos || []).forEach(function (estudo, i) {
    var f = estudo.fatos || {}, e = f.estatisticas;
    h.push('<h3>6.' + (i + 1) + ' ' + SGO_DocA4_esc_(estudo.label) + '</h3>');
    var ficha = [];
    if (f.periodoInicio) { ficha.push(['Início', f.periodoInicio]); ficha.push(['Fim', f.periodoFim]); }
    if (f.duracaoMinutos !== undefined && f.duracaoMinutos !== null) ficha.push(['Duração', SGO_DocA4_val_(f.duracaoMinutos / 60, 1, 'h')]);
    if (f.inicioEvento) { ficha.push(['Início do evento', f.inicioEvento]); if (f.fimEvento) ficha.push(['Término do evento', f.fimEvento]); }
    if (f.rompeu !== undefined) ficha.push(['Saiu da faixa?', f.rompeu ? 'Sim' : 'Não']);
    if (f.rompeu && f.tempoAteRupturaMinutos !== undefined) ficha.push(['Tempo até sair da faixa', SGO_DocA4_val_(f.tempoAteRupturaMinutos, 1, 'min')]);
    if (f.autonomiaMinutos !== undefined) ficha.push(['Autonomia medida', SGO_DocA4_val_(f.autonomiaMinutos, 1, 'min')]);
    if (f.piorSensor && f.piorSensor.sensor) ficha.push(['Leitura mais afastada da faixa', f.piorSensor.sensor + ': ' + SGO_DocA4_val_(f.piorSensor.valor, 2, '°C') + (f.piorSensor.tempoStr ? ' em ' + f.piorSensor.tempoStr : '')]);
    if (ficha.length) h.push(SGO_DocA4_tabelaIdent_(ficha));
    if (e) {
      h.push(SGO_DocA4_tabela_([{ t: 'Mínima', cls: 'num' }, { t: 'Máxima', cls: 'num' }, { t: 'Média', cls: 'num' }, { t: 'Mediana', cls: 'num' }, { t: 'Desvio-padrão', cls: 'num' }, { t: 'Amplitude', cls: 'num' }],
        [[SGO_DocA4_val_(e.min, 2, '°C'), SGO_DocA4_val_(e.max, 2, '°C'), SGO_DocA4_val_(e.media, 2, '°C'), SGO_DocA4_val_(e.mediana, 2, '°C'), SGO_DocA4_val_(e.desvioPadrao, 2, '°C'), SGO_DocA4_val_(e.amplitude, 2, '°C')]]));
    }
    if (f.repeticoes && f.repeticoes.length) {
      h.push(SGO_DocA4_tabela_([{ t: 'Repetição', cls: 'cen' }, { t: 'Período' }, { t: 'Duração', cls: 'num' }, { t: 'Letalidade obtida', cls: 'num' }, { t: 'Resultado' }],
        f.repeticoes.map(function (r) {
          return [{ t: String(r.numero), cls: 'cen' }, (r.inicio || '—') + ' a ' + (r.fim || '—'), SGO_DocA4_val_(r.duracaoMinutos, 1, 'min'),
            r.valorLabel ? r.valorLabel + ' ' + SGO_DocA4_val_(r.minimoObtido, 2, 'min') + ' (mín. ' + SGO_DocA4_val_(r.minimoExigido, 2, 'min') + ')' : '—',
            SGO_DocA4_celSituacao_(SGO_DocA4_situacaoEstudo_(r.status), 'Aprovado', 'Reprovado')];
        })));
    }
    if (f.conformidadePorSensor && f.conformidadePorSensor.length) {
      h.push(SGO_DocA4_tabela_([{ t: 'Sensor' }, { t: 'Mínima (°C)', cls: 'num' }, { t: 'Média (°C)', cls: 'num' }, { t: 'Máxima (°C)', cls: 'num' }, { t: 'Fora da faixa', cls: 'num' }, { t: 'Situação' }],
        f.conformidadePorSensor.map(function (c) {
          var s = String(c.statusSensor || '').toUpperCase();
          var cel = s === 'NAO_CONFORME' ? { html: '<span class="nok-txt">Fora da faixa</span>' } : (s === 'CONFORME_COM_RESSALVA' ? { html: '<span class="ok-txt">Dentro da tolerância</span>' } : { html: '<span class="ok-txt">Na faixa</span>' });
          return [c.sensor, SGO_DocA4_val_(c.min, 2), SGO_DocA4_val_(c.media, 2), SGO_DocA4_val_(c.max, 2), c.minutosForaFaixa ? SGO_DocA4_val_(c.minutosForaFaixa, 1, 'min') : '—', cel];
        }), { classe: f.conformidadePorSensor.length > 12 ? 'compacta' : '' }));
    }
    var g = (o.graficos || {})[estudo.tipoEstudo];
    if (g && g.svg) { nFig++; h.push(SGO_DocA4_figura_(g.svg, nFig, 'Temperatura por sensor ativo — ' + estudo.label + ' (faixa verde: faixa de aceitação; linhas vermelhas: limites com a tolerância).' + (g.nota || ''))); }
    h.push('<h4>Análise</h4>' + SGO_DocA4_paragrafos_((textos.analisePorEstudo || {})[estudo.tipoEstudo]));
    var cs = SGO_DocA4_situacaoEstudo_(estudo.statusAprovacao);
    h.push('<p class="nota"><b>Resultado do estudo:</b> ' + (cs === true ? '<span class="ok-txt">Aprovado</span>' : (cs === false ? '<span class="nok-txt">Reprovado</span>' : '<span class="info-txt">Informativo</span>')) + '</p>');
  });

  h.push('<h3>6.' + ((ctx.estudos || []).length + 1) + ' Verificação dos critérios de aceitação</h3>');
  h.push('<p class="nota">O requisito de cada estudo está na seção 5.1.</p>');
  h.push(SGO_DocA4_tabela_([{ t: 'Estudo' }, { t: 'Resultado obtido' }, { t: 'Situação' }],
    criterios.map(function (c) { return [c.criterio, c.obtido, SGO_DocA4_celSituacao_(c.conforme)]; })));

  h.push('<h2>7. Não conformidades e observações</h2>');
  var ncs = [], obs = [];
  (ctx.estudos || []).forEach(function (e) {
    (e.motivosReprovacao || []).forEach(function (m) { ncs.push(e.label + ': ' + m); });
    (e.alertasAnalise || []).concat(e.observacoesAnalise || []).forEach(function (m) { obs.push(e.label + ': ' + m); });
  });
  ((ctx.registradores && ctx.registradores.observacoes) || []).forEach(function (m) { obs.push(m); });
  h.push('<h3>7.1 Não conformidades</h3>' + (ncs.length ? SGO_DocA4_lista_(ncs) : '<p>Nenhuma não conformidade foi registrada.</p>'));
  h.push('<h3>7.2 Observações</h3>' + (obs.length ? SGO_DocA4_lista_(obs) : '<p>Sem observações adicionais.</p>'));

  h.push('<h2>8. Conclusão</h2>' + SGO_DocA4_paragrafos_(textos.conclusaoGeral));
  h.push(SGO_DocA4_linhaParecer_(st, 'Parecer final', parecer, parecer, parecer));

  h.push('<div class="manter"><h2>9. Responsabilidade técnica</h2>');
  h.push('<p>Os resultados referem-se exclusivamente ao equipamento e às condições de ensaio aqui identificados. A requalificação é recomendada após manutenção corretiva relevante, mudança de local ou de carga, ou no prazo definido pelo plano de qualificação do cliente. A reprodução parcial deste documento depende de autorização da empresa executante.</p>');
  h.push(SGO_DocA4_assinaturas_(o.assinaturas) + '</div>');
  if (o.fotos && o.fotos.length) h.push('<h2 class="quebra">Anexo A — Registro fotográfico</h2>' + SGO_DocA4_fotos_(o.fotos));
  h.push(SGO_DocA4_fimDocumento_());
  return h.join('\n');
}

/* ============================================================
 * Redação técnica por IA (Gemini)
 * ============================================================ */

/** Converte números de um objeto de fatos para texto pt-BR (2 casas), para a IA citar sem reformatar. */
function SGO_DocA4_fatosPtBr_(v, chave) {
  if (v === null || v === undefined) return v;
  if (typeof v === 'number') {
    if (!isFinite(v)) return '';
    // Contagens e índices ficam inteiros; grandezas medidas sempre com 2 casas (igual ao documento).
    if (/indice|quantidade|contagem|pulsos|numero|count|leituras/i.test(String(chave || ''))) return String(Math.round(v));
    return SGO_DocA4_num_(v, 2);
  }
  if (Object.prototype.toString.call(v) === '[object Date]') return isNaN(v.getTime()) ? '' : SGO_DocA4_fmtData_(v);
  if (Array.isArray(v)) return v.map(function (x) { return SGO_DocA4_fatosPtBr_(x, chave); });
  if (typeof v === 'object') {
    var o = {};
    Object.keys(v).forEach(function (k) { if (k.charAt(0) !== '_') o[k] = SGO_DocA4_fatosPtBr_(v[k], k); });
    return o;
  }
  return v;
}

/** Regras de redação comuns a todos os documentos de qualificação. */
function SGO_DocA4_regrasRedacaoIA_() {
  return [
    'REGRAS DE REDAÇÃO (obrigatórias):',
    '- Escreva em português do Brasil, registro técnico formal e impessoal, como o engenheiro responsável pela análise. Não se refira a si mesmo, a inteligência artificial, a "sistema" ou a "modelo".',
    '- Use somente os fatos do contexto. Não invente números, datas, horários, sensores, normas, causas confirmadas nem resultados.',
    '- Cite os valores exatamente como aparecem no contexto (vírgula decimal, mesma quantidade de casas e mesma unidade). Não converta unidades e não arredonde de outro modo.',
    '- Cite os critérios de aceitação e as normas exatamente como listados no contexto. Não cite norma, item ou valor que não esteja no contexto.',
    '- Nunca cite marca, fabricante ou modelo comercial de equipamento, registrador, sensor ou insumo. Quando necessário, use "fabricante do equipamento".',
    '- O veredito é o que consta no contexto e é inequívoco: APROVADO ou REPROVADO (ou o texto equivalente indicado no contexto). É proibido escrever "aprovado com alerta", "aprovado com ressalvas", "parcialmente aprovado", "aprovado condicionalmente" ou qualquer forma intermediária.',
    '- Valor acima do mínimo, mas próximo do limite, continua APROVADO: registre a proximidade como observação de acompanhamento, sem enfraquecer o veredito.',
    '- Texto corrido em parágrafos, sem markdown, sem asteriscos, sem listas, sem títulos, sem emojis e sem aspas decorativas.',
    '- Evite fórmulas de efeito e expressões genéricas ("é importante destacar", "vale ressaltar", "em suma", "neste contexto", "garantindo assim", "robusto", "excelência", "jornada"). Prefira frases diretas com o dado que as sustenta.',
    '- Não use termos em inglês: escreva "teste de estanqueidade", "registrador de dados", "temperatura programada".'
  ].join('\n');
}

/** Remove marcas de formatação que a IA às vezes devolve (negrito, títulos, listas). */
function SGO_DocA4_limparTextoIA_(t) {
  return String(t || '')
    .replace(/\r\n/g, '\n')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/(^|\n)\s*#{1,6}\s+/g, '$1')
    .replace(/(^|\n)\s*[-*•]\s+/g, '$1')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Chamada ao Gemini comum aos documentos de qualificação.
 * Raciocínio (thinking) ligado e dinâmico nos modelos que suportam; temperatura
 * baixa; orçamento de saída generoso (o raciocínio consome do mesmo limite).
 * Resposta cortada (MAX_TOKENS) ou bloqueada nunca é devolvida pela metade:
 * tenta o próximo modelo e, se todos falharem, lança erro com o motivo.
 * opcoes: { tokens, temperatura, msgChave: function(codigo) }
 */
function SGO_DocA4_chamarGemini_(prompt, opcoes) {
  opcoes = opcoes || {};
  var props = PropertiesService.getScriptProperties();
  var chave = props.getProperty('GEMINI_API_KEY') || '';
  var msgChave = opcoes.msgChave || (typeof SGO_DocSalvar_msgChaveIA_ === 'function' ? SGO_DocSalvar_msgChaveIA_ : function (c) { return c ? 'a chave da IA foi recusada (HTTP ' + c + ')' : 'a chave da IA não está cadastrada'; });
  if (!chave) throw new Error(msgChave());
  var modelo = String(props.getProperty('IA_MODEL') || '').trim() || 'gemini-2.5-flash';
  var fb = String(props.getProperty('IA_MODEL_FALLBACKS') || '').trim();
  var modelos = [modelo].concat(fb ? fb.split(',').map(function (m) { return m.trim(); }).filter(Boolean) : ['gemini-2.5-pro', 'gemini-2.5-flash-lite']);
  modelos = modelos.filter(function (m, i) { return modelos.indexOf(m) === i; });
  var tokens = opcoes.tokens || 32768;
  var temperatura = opcoes.temperatura === undefined ? 0.2 : opcoes.temperatura;
  var ultimo = 'A IA está temporariamente indisponível. Tente novamente em alguns instantes.';

  for (var mi = 0; mi < modelos.length; mi++) {
    var m = modelos[mi];
    var config = { maxOutputTokens: tokens, temperature: temperatura };
    // Raciocínio dinâmico (-1) só nos modelos que aceitam o parâmetro (2.5 em diante).
    if (/gemini-(2\.5|[3-9])/.test(m)) config.thinkingConfig = { thinkingBudget: -1 };
    for (var tent = 0; tent < 3; tent++) {
      if (tent > 0) Utilities.sleep(tent === 1 ? 800 : 1600);
      var resp = UrlFetchApp.fetch('https://generativelanguage.googleapis.com/v1beta/models/' + m + ':generateContent?key=' + chave, {
        method: 'post', muteHttpExceptions: true, contentType: 'application/json',
        payload: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt }] }], generationConfig: config })
      });
      var codigo = resp.getResponseCode();
      var corpo = {};
      try { corpo = JSON.parse(resp.getContentText()); } catch (e) {}
      if (codigo === 200) {
        var cand = corpo.candidates && corpo.candidates[0];
        var motivo = cand && cand.finishReason;
        var partes = (cand && cand.content && cand.content.parts) || [];
        var texto = partes.filter(function (p) { return !p.thought; }).map(function (p) { return p.text || ''; }).join('').trim();
        if (motivo && motivo !== 'STOP') { ultimo = 'A IA devolveu uma resposta incompleta (' + motivo + ')'; break; }
        if (!texto) { ultimo = 'A IA devolveu resposta vazia'; break; }
        return texto;
      }
      if (codigo === 401 || codigo === 403) throw new Error(msgChave(codigo));
      var msgApi = (corpo && corpo.error && (corpo.error.message || corpo.error.status)) || ('HTTP ' + codigo);
      if (codigo === 429) { ultimo = 'Limite de uso da IA atingido (HTTP 429). Aguarde alguns minutos e tente novamente'; break; }
      if (codigo === 404 || codigo === 400) { ultimo = 'Modelo ' + m + ' indisponível (' + msgApi + ')'; break; }
      ultimo = 'Serviço de IA indisponível (HTTP ' + codigo + '): ' + msgApi;
      if (codigo !== 500 && codigo !== 503) break;
    }
  }
  throw new Error(ultimo);
}
