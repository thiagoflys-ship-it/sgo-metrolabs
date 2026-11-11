/* CSS próprio do inventário e da solicitação de orçamento de padrões (folha A4 paisagem).
 * Vai DEPOIS de SGO_DocA4_estilos_() e de RelTecA4_css_(): só acrescenta o que é deste documento
 * (abertura da 1ª página, colunas das tabelas largas, fichas técnicas, referências). Padrão de
 * 18/10/2026: docs/DOCUMENTOS_PADRAO_A4_20261018.md. */
var PAD_DOC_CSS = '' +
  '.pd-abertura{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:.8pt solid #0b3d6e;padding-bottom:2.4mm;margin:0 0 4.5mm}' +
  '.pd-abertura img{height:13mm;width:auto;display:block}' +
  '.pd-abertura .meta{text-align:right;font-size:8pt;line-height:1.4;color:#3e4c59}' +
  '.pd-abertura .meta b{color:#1f2933}' +
  // A barra da janela do portal (paddoc-tools) já tem o botão de imprimir: evita dois botões.
  '.paddoc-tools~.barra-tela{display:none}' +
  'h2 .n,h3 .n{display:inline-block;min-width:7mm}' +
  'table.t td,table.t th{overflow-wrap:anywhere}' +
  'table.pd-rel{table-layout:fixed}' +
  'table.pd-rel td{font-size:8.2pt}' +
  'table.pd-rel td .sub{display:block;color:#52606d}' +
  'table.pd-kpi{table-layout:fixed}' +
  'table.pd-ficha3 th{width:11%}table.pd-ficha3 td{width:22.3%}' +
  'table.pd-kpi th{font-size:8pt;text-align:right;white-space:normal}table.pd-kpi td{font-size:10.5pt;font-weight:700}' +
  'tr.pd-vencido td{background:#fcf3f3}tr.pd-vencendo td{background:#fff8e6}' +
  '.warn-txt{color:#8a5a00;font-weight:700}' +
  'table.pd-detalhe{font-size:8.2pt}table.pd-detalhe td{white-space:pre-wrap}' +
  '.pd-ficha{break-inside:auto}' +
  '.pd-ficha>h3{margin-top:5mm}' +
  '.pd-ficha .pd-foto{float:right;max-width:52mm;max-height:42mm;object-fit:contain;margin:0 0 3mm 5mm;border:.5pt solid #bcc5cf}' +
  '.pd-ficha::after{content:"";display:block;clear:both}' +
  '.pd-pend{border-left:2.5pt solid #b7791f;background:#fffaf0;padding:1.6mm 3mm;margin:1.4mm 0 2mm;text-align:left;font-size:8.6pt}' +
  '.pd-aviso{border-left:2.5pt solid #b7791f;background:#fffaf0;padding:2mm 3.4mm;margin:1.6mm 0 3mm}' +
  'ol.pd-exig{margin:0 0 2.4mm 5mm;padding:0}ol.pd-exig li{margin:0 0 1.6mm;padding-left:1mm}' +
  'ul.pd-fontes{margin:0 0 2mm 4.5mm;padding:0;columns:2;column-gap:10mm;font-size:8.3pt}' +
  'ul.pd-fontes li{break-inside:avoid;margin:0 0 1.2mm;text-align:left;hyphens:none}' +
  'ul.pd-fontes .url{display:block;color:#52606d;font-size:7.6pt;overflow-wrap:anywhere}' +
  'a{color:inherit;text-decoration:none}' +
  '.pd-fecho{margin-top:4mm}' +
  '.pd-fecho p{margin-bottom:0}.pd-fecho .assinaturas{justify-content:flex-start;margin-top:1mm}.pd-fecho .assinatura{flex:0 1 80mm}.pd-fecho .assinatura .img{height:11mm}' +
  '.so-tela iframe{width:100%;height:130px;border:0}' +
  '@media print{.so-tela{display:none!important}}';
