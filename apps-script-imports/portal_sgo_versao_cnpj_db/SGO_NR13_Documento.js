/****************************************************
 * NR13 — LAUDO DE INSPEÇÃO DE VASO DE PRESSÃO — MONTAGEM DO DOCUMENTO
 * HTML (A4)
 *
 * Documento oficial (Relatório de Inspeção de Segurança, item 13.5.4.11
 * da NR-13). Reaproveita o mesmo esqueleto visual/CSS do Certificado de
 * Calibração (SGO_CertCal_Documento.js) — timbre, tabelas, botão de
 * impressão — mas com paleta de 3 estados no veredito (Aprovado/
 * Aprovado com Ressalvas/Reprovado) em vez de 2, e seções próprias da
 * NR-13 (categorização, periodicidade, registro fotográfico com
 * interpretação técnica ao lado de cada foto).
 ****************************************************/

function NR13Doc_escaparHtml_(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function NR13Doc_num_(v, casas) {
  if (v === null || v === undefined || !isFinite(v)) return '—';
  return SGO_DocA4_num_(Number(v), casas === undefined ? 2 : casas);
}

/** Número pt-BR com 2 casas, ou até maxCasas (padrão 4) quando o valor tem mais precisão: não arredonda 0,215 MPa para 0,22 nem P.V pequeno para 0,00. */
function NR13Doc_numVar_(v, maxCasas) {
  if (v === null || v === undefined || v === '' || !isFinite(v)) return '—';
  var n = Number(v);
  var max = maxCasas === undefined ? 4 : maxCasas;
  var casas = 2;
  while (casas < max && Math.abs(Number(n.toFixed(casas)) - n) > Math.abs(n) * 1e-9) casas++;
  return SGO_DocA4_num_(n, casas);
}

function NR13Doc_paragrafosHtml_(texto) {
  var partes = String(texto || '').split(/\n{2,}/).map(function(p) { return p.trim(); }).filter(Boolean);
  if (!partes.length) return '<p>-</p>';
  return partes.map(function(p) { return '<p>' + NR13Doc_escaparHtml_(p) + '</p>'; }).join('\n');
}

/** Texto fixo de reserva, caso a geração por IA falhe — a emissão do laudo nunca trava. */
function NR13Doc_textoIntroducaoFixo_(ctx) {
  return 'O presente laudo apresenta os resultados da inspeção de segurança realizada no vaso de pressão ' +
    'identificado abaixo, de propriedade de ' + (ctx.cliente.razaoSocial || 'cliente não identificado') +
    ', em atendimento aos requisitos da ' + NR13_CFG.NORMA_REFERENCIA;
}

function NR13Doc_textoObjetivoFixo_(ctx) {
  return 'O objetivo deste laudo é verificar as condições de integridade estrutural e segurança operacional do ' +
    'vaso de pressão descrito, por meio de inspeção visual e exames técnicos, determinando sua aptidão para ' +
    'permanecer em operação até a próxima inspeção de segurança, em conformidade com os critérios estabelecidos ' +
    'pela NR-13.';
}

function NR13Doc_vereditoLabel_(veredito) {
  if (veredito === NR13_CFG.VEREDITOS.REPROVADO) return 'Reprovado';
  if (veredito === NR13_CFG.VEREDITOS.APROVADO_COM_RESSALVAS) return 'Aprovado com Ressalvas';
  return 'Aprovado';
}

function NR13Doc_vereditoClasse_(veredito) {
  if (veredito === NR13_CFG.VEREDITOS.REPROVADO) return 'reprovado';
  if (veredito === NR13_CFG.VEREDITOS.APROVADO_COM_RESSALVAS) return 'ressalvas';
  return 'aprovado';
}

function NR13Doc_montarFotos_(fotos) {
  if (!fotos || !fotos.length) return '';
  var html = ['<div class="fotos-grid">'];
  fotos.forEach(function(f) {
    if (!f.base64) return;
    html.push('<div class="foto-item"><div class="foto-frame"><img src="data:' + (f.mimeType || 'image/jpeg') + ';base64,' + f.base64 + '" alt="Foto do exame"></div>');
    html.push('<div class="foto-textos">');
    if (f.legendaUsuario) html.push('<div class="legenda-tecnico"><strong>Registro do técnico:</strong> ' + NR13Doc_escaparHtml_(f.legendaUsuario) + '</div>');
    if (f.interpretacaoIA) html.push('<div class="interpretacao-ia"><strong>Interpretação técnica:</strong> ' + NR13Doc_escaparHtml_(f.interpretacaoIA) + '</div>');
    html.push('</div></div>');
  });
  html.push('</div>');
  return html.join('\n');
}

/**
 * Gráfico SVG (estático, sem JS/canvas — Apps Script converte HTML→PDF
 * sem executar script, então tem que ser markup puro; mesma técnica já
 * usada pelas assinaturas em CadeiaFrioRel_CFCFG.ASSINATURAS_PADRAO, que
 * já se provou compatível com o conversor de PDF) da curva de pressão do
 * Teste Hidrostático: rampa de subida → patamar (com a perda visível
 * como leve inclinação) → rampa de descida.
 */
function NR13Doc_montarGraficoTH_(th) {
  var W = 640, H = 300;
  var margemEsq = 55, margemDir = 20, margemTopo = 20, margemBase = 45;
  var chartW = W - margemEsq - margemDir;
  var chartH = H - margemTopo - margemBase;

  var t1 = Math.max(th.tempoSubidaMin, 0.01);
  var t2 = t1 + Math.max(th.tempoEnsaioMin, 0.01);
  var t3 = t2 + Math.max(th.tempoDescidaMin, 0.01);
  var pMax = Math.max(th.pressaoTeste, th.pressaoInicial, th.pressaoFinal, 0.01) * 1.15;

  function px(t) { return margemEsq + (t / t3) * chartW; }
  function py(p) { return margemTopo + chartH - (p / pMax) * chartH; }

  var pontos = [
    [0, 0], [t1, th.pressaoInicial], [t2, th.pressaoFinal], [t3, 0]
  ];
  var polylinePontos = pontos.map(function(p) { return px(p[0]).toFixed(1) + ',' + py(p[1]).toFixed(1); }).join(' ');
  var areaPontos = polylinePontos + ' ' + px(t3).toFixed(1) + ',' + py(0).toFixed(1) + ' ' + px(0).toFixed(1) + ',' + py(0).toFixed(1);

  var svg = [];
  svg.push('<svg viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-width:640px;height:auto;">');
  svg.push('<rect x="0" y="0" width="' + W + '" height="' + H + '" fill="#ffffff"/>');

  // Gridlines horizontais (pressão) — 4 faixas
  for (var i = 0; i <= 4; i++) {
    var pVal = (pMax / 4) * i;
    var y = py(pVal);
    svg.push('<line x1="' + margemEsq + '" y1="' + y.toFixed(1) + '" x2="' + (W - margemDir) + '" y2="' + y.toFixed(1) + '" stroke="#e5e7eb" stroke-width="1"/>');
    svg.push('<text x="' + (margemEsq - 8) + '" y="' + (y + 4).toFixed(1) + '" font-size="10" fill="#6b7280" text-anchor="end" font-family="Arial,sans-serif">' + NR13Doc_num_(pVal, 2) + '</text>');
  }

  // Linha de referência tracejada na pressão de teste (alvo)
  if (th.pressaoTeste > 0) {
    var yTeste = py(th.pressaoTeste);
    svg.push('<line x1="' + margemEsq + '" y1="' + yTeste.toFixed(1) + '" x2="' + (W - margemDir) + '" y2="' + yTeste.toFixed(1) + '" stroke="#c98a12" stroke-width="1.3" stroke-dasharray="5,4"/>');
    svg.push('<text x="' + (W - margemDir - 4) + '" y="' + (yTeste - 5).toFixed(1) + '" font-size="9.5" fill="#c98a12" text-anchor="end" font-family="Arial,sans-serif">Pressão de teste (' + NR13Doc_num_(th.pressaoTeste, 2) + ' ' + th.unidade + ')</text>');
  }

  // Eixos
  svg.push('<line x1="' + margemEsq + '" y1="' + margemTopo + '" x2="' + margemEsq + '" y2="' + (H - margemBase) + '" stroke="#9aa8b8" stroke-width="1.4"/>');
  svg.push('<line x1="' + margemEsq + '" y1="' + (H - margemBase) + '" x2="' + (W - margemDir) + '" y2="' + (H - margemBase) + '" stroke="#9aa8b8" stroke-width="1.4"/>');

  // Área preenchida + curva
  svg.push('<polygon points="' + areaPontos + '" fill="#1f6f45" fill-opacity="0.12"/>');
  svg.push('<polyline points="' + polylinePontos + '" fill="none" stroke="#1f6f45" stroke-width="2.4" stroke-linejoin="round"/>');
  pontos.forEach(function(p) {
    svg.push('<circle cx="' + px(p[0]).toFixed(1) + '" cy="' + py(p[1]).toFixed(1) + '" r="3.2" fill="#1f6f45"/>');
  });

  // Marcações de tempo no eixo X
  var marcasTempo = [
    [0, '0 min'],
    [t1, NR13Doc_num_(t1, 0) + ' min'],
    [t2, NR13Doc_num_(t2, 0) + ' min'],
    [t3, NR13Doc_num_(t3, 0) + ' min']
  ];
  marcasTempo.forEach(function(m) {
    var x = px(m[0]);
    svg.push('<line x1="' + x.toFixed(1) + '" y1="' + (H - margemBase) + '" x2="' + x.toFixed(1) + '" y2="' + (H - margemBase + 5) + '" stroke="#9aa8b8" stroke-width="1"/>');
    svg.push('<text x="' + x.toFixed(1) + '" y="' + (H - margemBase + 18) + '" font-size="10" fill="#374151" text-anchor="middle" font-family="Arial,sans-serif">' + m[1] + '</text>');
  });

  // Rótulos das 3 fases
  svg.push('<text x="' + px(t1 / 2).toFixed(1) + '" y="' + (H - margemBase + 32) + '" font-size="9.5" fill="#6b7280" text-anchor="middle" font-family="Arial,sans-serif">Rampa de subida</text>');
  svg.push('<text x="' + px((t1 + t2) / 2).toFixed(1) + '" y="' + (H - margemBase + 32) + '" font-size="9.5" fill="#6b7280" text-anchor="middle" font-family="Arial,sans-serif">Patamar (ensaio)</text>');
  svg.push('<text x="' + px((t2 + t3) / 2).toFixed(1) + '" y="' + (H - margemBase + 32) + '" font-size="9.5" fill="#6b7280" text-anchor="middle" font-family="Arial,sans-serif">Rampa de descida</text>');

  svg.push('<text x="' + (margemEsq - 40) + '" y="' + (margemTopo + 4) + '" font-size="10" fill="#374151" text-anchor="end" font-family="Arial,sans-serif" transform="rotate(-90 ' + (margemEsq - 40) + ' ' + (margemTopo + 4) + ')">Pressão (' + th.unidade + ')</text>');

  svg.push('</svg>');
  return svg.join('');
}

function NR13Doc_montarTabelaTH_(th) {
  var h = [];
  h.push('<table class="dados">');
  h.push('<tr><td class="rotulo">Pressão de teste</td><td>' + NR13Doc_num_(th.pressaoTeste, 2) + ' ' + th.unidade + '</td></tr>');
  h.push('<tr><td class="rotulo">Tempo de subida até a pressão de teste</td><td>' + NR13Doc_num_(th.tempoSubidaMin, 0) + ' min</td></tr>');
  h.push('<tr><td class="rotulo">Pressão inicial do patamar</td><td>' + NR13Doc_num_(th.pressaoInicial, 2) + ' ' + th.unidade + '</td></tr>');
  h.push('<tr><td class="rotulo">Tempo de ensaio (patamar)</td><td>' + NR13Doc_num_(th.tempoEnsaioMin, 0) + ' min</td></tr>');
  h.push('<tr><td class="rotulo">Pressão final do patamar</td><td>' + NR13Doc_num_(th.pressaoFinal, 2) + ' ' + th.unidade + '</td></tr>');
  h.push('<tr><td class="rotulo">Tempo de descida/despressurização</td><td>' + NR13Doc_num_(th.tempoDescidaMin, 0) + ' min</td></tr>');
  h.push('<tr><td class="rotulo">Rampa de subida (calculada)</td><td>' + NR13Doc_num_(th.rampaSubida, 2) + ' ' + th.unidade + '/min</td></tr>');
  h.push('<tr><td class="rotulo">Rampa de descida (calculada)</td><td>' + NR13Doc_num_(th.rampaDescida, 2) + ' ' + th.unidade + '/min</td></tr>');
  h.push('<tr><td class="rotulo">Perda de pressão no patamar (calculada)</td><td>' + NR13Doc_num_(th.perda, 2) + ' ' + th.unidade + ' (' + NR13Doc_num_(th.perdaPercentual, 1) + '%)</td></tr>');
  h.push('</table>');
  return h.join('');
}

function NR13Doc_montarTabelaValvulas_(valvulas) {
  if (!valvulas || !valvulas.length) return '';
  var h = [];
  h.push('<div class="subfaixa">Válvulas de segurança inspecionadas</div>');
  h.push('<div class="tabela-wrap"><table class="tabela-fontes"><thead><tr><th>Identificação</th><th>Nº certificado de inspeção/teste</th><th>Pressão de abertura ajustada</th><th>Resultado</th></tr></thead><tbody>');
  valvulas.forEach(function(v) {
    var corResultado = v.resultado === 'Reprovado' ? 'color:#b91c1c;font-weight:700;' : 'color:#1f6f45;font-weight:700;';
    h.push('<tr><td>' + NR13Doc_escaparHtml_(v.identificacao || '—') + '</td><td>' + NR13Doc_escaparHtml_(v.certificado || '—') +
      '</td><td>' + NR13Doc_escaparHtml_(v.pressaoAbertura || '—') + '</td><td style="' + corResultado + '">' + NR13Doc_escaparHtml_(v.resultado || 'Aprovado') + '</td></tr>');
  });
  h.push('</tbody></table></div>');
  return h.join('');
}

function NR13Doc_montarTabelaManometros_(manometros) {
  if (!manometros || !manometros.length) return '';
  var h = [];
  h.push('<div class="subfaixa">Manômetros utilizados na inspeção</div>');
  h.push('<div class="tabela-wrap"><table class="tabela-fontes"><thead><tr><th>Identificação</th><th>Faixa de indicação</th><th>Nº certificado de aferição</th><th>Resultado</th></tr></thead><tbody>');
  manometros.forEach(function(m) {
    var corResultado = m.resultado === 'Reprovado' ? 'color:#b91c1c;font-weight:700;' : 'color:#1f6f45;font-weight:700;';
    h.push('<tr><td>' + NR13Doc_escaparHtml_(m.identificacao || '—') + '</td><td>' + NR13Doc_escaparHtml_(m.faixaIndicacao || '—') +
      '</td><td>' + NR13Doc_escaparHtml_(m.certificado || '—') + '</td><td style="' + corResultado + '">' + NR13Doc_escaparHtml_(m.resultado || 'Aprovado') + '</td></tr>');
  });
  h.push('</tbody></table></div>');
  return h.join('');
}

/**
 * @param {Object} ctx Ver formato completo em NR13_apiEmitirLaudo
 *   (SGO_NR13_Main.js) — cliente/vaso/categoria já calculados,
 *   veredito+parecer manuais, fotos com legenda+interpretação, textos
 *   de introdução/objetivo (IA ou fallback fixo).
 */
function NR13Doc_montarDocumentoHtml_(ctx) {
  var empresa = (typeof CadeiaFrioRel_CFCFG !== 'undefined' && CadeiaFrioRel_CFCFG.EMPRESA_EXECUTANTE) ||
    { nome: 'Metrolab Soluções em Engenharia Clínica LTDA', cnpj: '', site: '', telefone: '', endereco: '' };
  var logo = (typeof CadeiaFrioRel_CFCFG !== 'undefined' && CadeiaFrioRel_CFCFG.LOGO_BASE64) || null;
  var assinaturasPadrao = (typeof CadeiaFrioRel_CFCFG !== 'undefined' && CadeiaFrioRel_CFCFG.ASSINATURAS_PADRAO) || [];
  var assinante = assinaturasPadrao.filter(function(a) { return a.nome === ctx.assinantePh; })[0] || assinaturasPadrao[0] || null;

  var vereditoLabel = NR13Doc_vereditoLabel_(ctx.veredito);
  var vereditoClasse = NR13Doc_vereditoClasse_(ctx.veredito);
  var textosIA = ctx.textosIA || { introducao: NR13Doc_textoIntroducaoFixo_(ctx), objetivo: NR13Doc_textoObjetivoFixo_(ctx) };

  var html = [];
  html.push('<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">');
  html.push('<title>Laudo NR-13' + (ctx.numeroLaudo ? (' nº ' + NR13Doc_escaparHtml_(ctx.numeroLaudo)) : '') + '</title>');
  html.push('<style>');
  html.push('@page { size: A4; margin: 16mm 15mm; }');
  html.push('* { box-sizing: border-box; }');
  html.push('body { font-family: Arial, Helvetica, sans-serif; color: #1f2937; font-size: 12.5px; line-height: 1.5; margin: 0; background: #f3f4f6; }');
  html.push('.folha { max-width: 900px; margin: 24px auto; background: #ffffff; padding: 26px 32px 40px; box-shadow: 0 2px 10px rgba(0,0,0,.12); }');
  html.push('.topo { display:flex; align-items:center; justify-content:space-between; border-bottom: 3px solid #1f6f45; padding-bottom: 12px; margin-bottom: 16px; }');
  html.push('.logo-topo { height: 44px; }');
  html.push('.numero-doc { border:1px solid #1f6f45; color:#1f6f45; font-weight:700; padding:5px 12px; border-radius:4px; font-size:12px; }');
  html.push('h1.titulo-cert { text-align:center; font-size:18px; color:#1f6f45; margin: 6px 0 2px; }');
  html.push('p.subtitulo-cert { text-align:center; font-size:11.5px; color:#6b7280; margin: 0 0 16px; }');
  html.push('table.dados { width:100%; border-collapse: collapse; margin-bottom: 14px; }');
  html.push('table.dados td { border: 1px solid #cfe8d8; padding: 5px 9px; font-size: 12px; }');
  html.push('table.dados td.rotulo { background:#eafbf0; font-weight:700; width: 190px; color:#14532d; }');
  html.push('.faixa-secao { background:#1f6f45; color:#fff; font-weight:700; font-size:12.5px; padding:7px 12px; margin: 18px 0 0; }');
  html.push('.subfaixa { background:#8fe0a8; color:#14532d; font-weight:700; font-size:11.5px; padding:5px 12px; text-align:center; }');
  html.push('.secao-prosa { margin: 10px 0 16px; }');
  html.push('.secao-prosa p { text-align: justify; margin: 6px 0; }');
  html.push('.categoria-destaque { display:flex; gap: 14px; margin: 10px 0 16px; flex-wrap: wrap; }');
  html.push('.categoria-box { flex:1; min-width: 150px; border:1px solid #cfe8d8; border-radius:4px; padding:10px 14px; background:#f7fdf9; text-align:center; }');
  html.push('.categoria-box .valor { font-size: 22px; font-weight:800; color:#1f6f45; }');
  html.push('.categoria-box .rotulo-mini { font-size: 10.5px; color:#6b7280; }');
  html.push('table.tabela-fontes { border-collapse: collapse; width: 100%; font-size: 11px; margin: 4px 0 10px; }');
  html.push('table.tabela-fontes th, table.tabela-fontes td { border: 1px solid #cfe8d8; padding: 5px 7px; text-align: center; }');
  html.push('table.tabela-fontes thead th { background: #eafbf0; color:#14532d; }');
  html.push('.veredito-box { margin: 18px 0; padding: 12px 14px; border-radius: 4px; font-size: 12.5px; border: 1px solid; }');
  html.push('.veredito-box.aprovado { background:#eafbf0; border-color:#1f6f45; }');
  html.push('.veredito-box.ressalvas { background:#fff8e6; border-color:#c98a12; }');
  html.push('.veredito-box.reprovado { background:#fdecec; border-color:#b91c1c; }');
  html.push('.veredito-box strong.selo { padding: 2px 10px; border-radius: 3px; color:#fff; }');
  html.push('.veredito-box.aprovado strong.selo { background:#1f6f45; }');
  html.push('.veredito-box.ressalvas strong.selo { background:#c98a12; }');
  html.push('.veredito-box.reprovado strong.selo { background:#b91c1c; }');
  html.push('.observacoes { font-size: 11px; color:#374151; margin-top:8px; }');
  html.push('.observacoes p { margin: 5px 0; text-align: justify; }');
  html.push('.fotos-grid { display:flex; flex-wrap:wrap; gap: 14px; margin-top: 10px; }');
  html.push('.foto-item { width: 47%; border:1px solid #cfe8d8; border-radius:4px; overflow:hidden; background:#fff; page-break-inside: avoid; }');
  html.push('.foto-item .foto-frame { height: 190px; display:flex; align-items:center; justify-content:center; background:#f9fafb; border-bottom:1px solid #cfe8d8; }');
  html.push('.foto-item .foto-frame img { max-width:100%; max-height:100%; object-fit:contain; display:block; }');
  html.push('.foto-textos { padding: 6px 9px; }');
  html.push('.legenda-tecnico { font-size: 10.5px; color:#374151; margin-bottom:4px; }');
  html.push('.interpretacao-ia { font-size: 10.5px; color:#4b5563; text-align: justify; }');
  html.push('.rodape-datas { display:flex; justify-content:space-between; margin-top: 22px; font-size: 12px; page-break-inside: avoid; }');
  html.push('.assinaturas { display:flex; justify-content:center; margin-top: 44px; page-break-inside: avoid; }');
  html.push('.assinatura-item { text-align:center; width: 55%; }');
  html.push('.assinatura-item svg, .assinatura-item img { height: 60px; }');
  html.push('.assinatura-linha { border-top: 1px solid #1f2937; margin-top: 4px; padding-top: 4px; font-size: 11px; }');
  html.push('.rodape-empresa { margin-top: 30px; padding-top: 8px; border-top: 1px solid #cfe8d8; font-size: 10px; color:#6b7280; text-align:center; }');
  html.push('.barra-imprimir { max-width: 900px; margin: 0 auto 12px; text-align: right; }');
  html.push('.barra-imprimir button { background:#1f6f45; color:#fff; border:none; padding:10px 18px; border-radius:4px; font-weight:700; cursor:pointer; font-size:13px; }');
  html.push('@media print { body { background:#ffffff; } .folha { box-shadow:none; margin:0; padding:0; max-width:none; } .no-print { display:none !important; } }');
  html.push(SGO_DocA4_css_() + RelTecA4_css_({ titulo: 'Laudo de Inspeção de Segurança — NR-13', numero: ctx.numeroLaudo || '', revisao: ctx.revisao || '00' }) + '</style></head><body>');

  html.push('<div class="barra-imprimir no-print"><button onclick="window.print()">Imprimir / Salvar como PDF</button></div>');
  html.push('<div class="folha">');

  html.push('<div class="topo">');
  if (logo && logo.data) {
    html.push('<img class="logo-topo" src="data:' + logo.mimeType + ';base64,' + logo.data + '" alt="Metrolabs">');
  } else {
    html.push('<div></div>');
  }
  html.push('<div class="numero-doc">Laudo nº ' + NR13Doc_escaparHtml_(ctx.numeroLaudo || '—') + ' · Revisão ' + NR13Doc_escaparHtml_(RelTecA4_revisao_(ctx.revisao)) + '</div>');
  html.push('</div>');

  html.push('<h1 class="titulo-cert">Laudo de Inspeção de Segurança — Vaso de Pressão</h1>');
  html.push('<p class="subtitulo-cert">Emitido em conformidade com a NR-13 (item 13.5) — Ministério do Trabalho e Emprego</p>');

  html.push('<div class="faixa-secao">EMPRESA EXECUTANTE</div>');
  html.push('<table class="dados">');
  html.push('<tr><td class="rotulo">Razão Social</td><td>' + NR13Doc_escaparHtml_(empresa.nome || '—') + '</td></tr>');
  html.push('<tr><td class="rotulo">CNPJ</td><td>' + NR13Doc_escaparHtml_(empresa.cnpj || '—') + '</td></tr>');
  if (empresa.endereco) html.push('<tr><td class="rotulo">Endereço</td><td>' + NR13Doc_escaparHtml_(empresa.endereco) + '</td></tr>');
  html.push('<tr><td class="rotulo">Site</td><td>' + NR13Doc_escaparHtml_(empresa.site || '—') + '</td></tr>');
  html.push('<tr><td class="rotulo">Telefone</td><td>' + NR13Doc_escaparHtml_(empresa.telefone || '—') + '</td></tr>');
  html.push('</table>');

  html.push('<div class="faixa-secao">DADOS DO CLIENTE</div>');
  html.push('<table class="dados">');
  html.push('<tr><td class="rotulo">CNPJ</td><td>' + NR13Doc_escaparHtml_(ctx.cliente.cnpj || '—') + '</td></tr>');
  html.push('<tr><td class="rotulo">Nome da empresa</td><td>' + NR13Doc_escaparHtml_(ctx.cliente.razaoSocial || '—') + '</td></tr>');
  html.push('<tr><td class="rotulo">Endereço</td><td>' + NR13Doc_escaparHtml_(ctx.cliente.endereco || '—') + '</td></tr>');
  if (ctx.unidade && ctx.unidade.nome) html.push('<tr><td class="rotulo">Unidade</td><td>' + NR13Doc_escaparHtml_(ctx.unidade.nome) + '</td></tr>');
  html.push('</table>');

  html.push('<div class="secao-prosa"><div class="faixa-secao">INTRODUÇÃO</div>' + NR13Doc_paragrafosHtml_(textosIA.introducao) + '</div>');
  html.push('<div class="secao-prosa"><div class="faixa-secao">OBJETIVO</div>' + NR13Doc_paragrafosHtml_(textosIA.objetivo) + '</div>');

  html.push('<div class="faixa-secao">NORMAS E REFERÊNCIAS TÉCNICAS</div>');
  html.push('<table class="dados"><tr><td>' + NR13Doc_escaparHtml_(NR13_CFG.NORMA_REFERENCIA) +
    (ctx.vaso.codigoConstrucao ? ('<br>Código de construção do vaso: ' + NR13Doc_escaparHtml_(ctx.vaso.codigoConstrucao)) : '') +
    '</td></tr></table>');

  html.push('<div class="faixa-secao">IDENTIFICAÇÃO DO VASO DE PRESSÃO</div>');
  html.push('<table class="dados">');
  html.push('<tr><td class="rotulo">Tipo de vaso</td><td>' + NR13Doc_escaparHtml_(ctx.vaso.tipo || '—') + '</td></tr>');
  html.push('<tr><td class="rotulo">Identificação (TAG)</td><td>' + NR13Doc_escaparHtml_(ctx.vaso.tag || '—') + '</td></tr>');
  html.push('<tr><td class="rotulo">Fabricante</td><td>' + NR13Doc_escaparHtml_(ctx.vaso.fabricante || '—') + '</td></tr>');
  html.push('<tr><td class="rotulo">Modelo</td><td>' + NR13Doc_escaparHtml_(ctx.vaso.modelo || '—') + '</td></tr>');
  html.push('<tr><td class="rotulo">Nº de série</td><td>' + NR13Doc_escaparHtml_(ctx.vaso.numeroSerie || '—') + '</td></tr>');
  html.push('<tr><td class="rotulo">Ano de fabricação</td><td>' + NR13Doc_escaparHtml_(ctx.vaso.anoFabricacao || '—') + '</td></tr>');
  html.push('<tr><td class="rotulo">Localização</td><td>' + NR13Doc_escaparHtml_(ctx.vaso.setor || '—') + '</td></tr>');
  html.push('<tr><td class="rotulo">PMTA (informada na plaqueta)</td><td>' + NR13Doc_numVar_(ctx.vaso.pmtaValor) + ' ' + NR13Doc_escaparHtml_(ctx.vaso.pmtaUnidade || 'MPa') +
    (ctx.vaso.pmtaUnidade !== 'MPa' ? (' &nbsp;=&nbsp; <strong>' + NR13Doc_numVar_(ctx.vaso.pmtaMpa) + ' MPa</strong> (convertido)') : '') + '</td></tr>');
  html.push('<tr><td class="rotulo">Volume (informado)</td><td>' + NR13Doc_numVar_(ctx.vaso.volumeValor) + ' ' + NR13Doc_escaparHtml_(ctx.vaso.volumeUnidade || 'm³') +
    (ctx.vaso.volumeUnidade !== 'm³' ? (' &nbsp;=&nbsp; <strong>' + NR13Doc_numVar_(ctx.vaso.volumeM3) + ' m³</strong> (convertido)') : '') + '</td></tr>');
  html.push('<tr><td class="rotulo">Classe do fluido</td><td>' + NR13Doc_escaparHtml_(ctx.vaso.classeFluido || '—') + '</td></tr>');
  html.push('<tr><td class="rotulo">Fluido de serviço</td><td>' + NR13Doc_escaparHtml_(ctx.vaso.fluidoServico || '—') + '</td></tr>');
  html.push('</table>');

  html.push('<div class="faixa-secao">CATEGORIZAÇÃO (NR-13, Tabela 1) E PERIODICIDADE (Tabela 2)</div>');
  html.push('<div class="categoria-destaque">');
  html.push('<div class="categoria-box"><div class="valor">' + NR13Doc_escaparHtml_(ctx.categoria.categoria || '—') + '</div><div class="rotulo-mini">Categoria</div></div>');
  html.push('<div class="categoria-box"><div class="valor">' + NR13Doc_escaparHtml_(String(ctx.categoria.grupo || '—')) + '</div><div class="rotulo-mini">Grupo de Potencial de Risco</div></div>');
  html.push('<div class="categoria-box"><div class="valor">' + NR13Doc_numVar_(ctx.categoria.pv, 6) + '</div><div class="rotulo-mini">P.V (MPa·m³)</div></div>');
  html.push('<div class="categoria-box"><div class="valor">' + NR13Doc_escaparHtml_(String(ctx.categoria.periodicidade.externo)) + ' / ' + NR13Doc_escaparHtml_(String(ctx.categoria.periodicidade.interno)) + '</div><div class="rotulo-mini">Prazo máx. (anos) Externo / Interno</div></div>');
  html.push('</div>');
  html.push('<table class="dados"><tr><td><strong>Memória de cálculo:</strong> P.V = P (MPa) × Volume (m³), adotando como P a PMTA informada (critério conservador: a pressão máxima de operação não excede a PMTA) = ' +
    NR13Doc_numVar_(ctx.vaso.pmtaMpa, 6) + ' × ' + NR13Doc_numVar_(ctx.vaso.volumeM3, 6) + ' = <strong>' + NR13Doc_numVar_(ctx.categoria.pv, 6) + ' MPa·m³</strong> ' +
    '→ Grupo de Potencial de Risco ' + ctx.categoria.grupo + ' (item 13.5.1.1.3) → cruzado com a Classe do Fluido "' + NR13Doc_escaparHtml_(ctx.vaso.classeFluido) +
    '" na Tabela 1 da NR-13 → <strong>Categoria ' + NR13Doc_escaparHtml_(ctx.categoria.categoria) + '</strong>. A periodicidade máxima de inspeção (Tabela 2, ' +
    'estabelecimento sem SPIE) para esta categoria é de ' + ctx.categoria.periodicidade.externo + (Number(ctx.categoria.periodicidade.externo) === 1 ? ' ano' : ' anos') + ' para o exame externo e ' + ctx.categoria.periodicidade.interno +
    (Number(ctx.categoria.periodicidade.interno) === 1 ? ' ano' : ' anos') + ' para o exame interno.</td></tr></table>');
  // Campo de aplicação (item 13.2.1): aviso quando P.V (kPa·m³) não passa de 8
  // e o fluido não é da classe A. Só aparece nesse caso.
  if (ctx.categoria.foraDoCampoAplicacao) {
    html.push('<table class="dados"><tr><td><strong>Observação sobre o campo de aplicação:</strong> com a PMTA em kPa, o produto P.V deste vaso é ' +
      NR13Doc_numVar_(ctx.categoria.pvKpa, 4) + ' kPa·m³, não superior a 8, e o fluido não é da classe A. Pelo item 13.2.1 da NR-13 o vaso não se enquadra ' +
      'obrigatoriamente na norma; a inspeção seguiu os mesmos critérios, a pedido do cliente ou por boa prática, e a categoria acima é informada apenas como referência.</td></tr></table>');
  }

  html.push('<div class="faixa-secao">DADOS DA INSPEÇÃO</div>');
  html.push('<table class="dados">');
  html.push('<tr><td class="rotulo">Tipo de inspeção</td><td>' + NR13Doc_escaparHtml_(ctx.inspecao.tipo || '—') + '</td></tr>');
  html.push('<tr><td class="rotulo">Data de início</td><td>' + NR13Doc_escaparHtml_(ctx.inspecao.dataInicio || '—') + '</td></tr>');
  html.push('<tr><td class="rotulo">Data de término</td><td>' + NR13Doc_escaparHtml_(ctx.inspecao.dataTermino || '—') + '</td></tr>');
  html.push('</table>');

  html.push(NR13Doc_montarTabelaValvulas_(ctx.valvulas));
  html.push(NR13Doc_montarTabelaManometros_(ctx.manometros));

  if (ctx.testeHidrostatico && ctx.testeHidrostatico.realizado) {
    html.push('<div class="faixa-secao">TESTE HIDROSTÁTICO (TH)</div>');
    html.push(NR13Doc_montarTabelaTH_(ctx.testeHidrostatico));
    html.push('<div style="text-align:center;margin:12px 0;">' + NR13Doc_montarGraficoTH_(ctx.testeHidrostatico) + '</div>');
  }

  html.push('<div class="subfaixa">Descrição das inspeções, exames e testes executados</div>');
  html.push('<div class="observacoes">' + NR13Doc_paragrafosHtml_(ctx.inspecao.descricao) + '</div>');

  var fotos = NR13Doc_montarFotos_(ctx.fotos);
  if (fotos) {
    html.push('<div class="faixa-secao">REGISTRO FOTOGRÁFICO</div>');
    html.push(fotos);
  }

  html.push('<div class="subfaixa">Resultado das inspeções e intervenções executadas</div>');
  html.push('<div class="observacoes">' + NR13Doc_paragrafosHtml_(ctx.inspecao.resultado) + '</div>');

  html.push('<div class="subfaixa">Recomendações e providências necessárias</div>');
  html.push('<div class="observacoes">' + NR13Doc_paragrafosHtml_(ctx.inspecao.recomendacoes) + '</div>');

  if (ctx.inspecao.observacoes) {
    html.push('<div class="subfaixa">Observações adicionais</div>');
    html.push('<div class="observacoes">' + NR13Doc_paragrafosHtml_(ctx.inspecao.observacoes) + '</div>');
  }

  html.push('<div class="faixa-secao">PARECER CONCLUSIVO</div>');
  html.push('<div class="veredito-box ' + vereditoClasse + '">');
  html.push('<div>Veredito: <strong class="selo">' + NR13Doc_escaparHtml_(vereditoLabel) + '</strong></div>');
  html.push('<div style="margin-top:8px;">' + NR13Doc_paragrafosHtml_(ctx.parecerConclusivo) + '</div>');
  html.push('</div>');

  if (ctx.registroOrigemInfo) {
    html.push('<table class="dados"><tr><td><strong>Reinspeção referente ao Laudo NR13 nº</strong> ' +
      NR13Doc_escaparHtml_(ctx.registroOrigemInfo.numeroLaudo || '—') + ', emitido anteriormente com veredito "Aprovado com Ressalvas".</td></tr></table>');
  }

  html.push('<div class="rodape-datas">');
  html.push('<div><strong>Data de emissão:</strong> ' + NR13Doc_escaparHtml_(ctx.dataEmissao || '—') + '</div>');
  html.push('<div><strong>Próxima inspeção de segurança prevista:</strong> ' + NR13Doc_escaparHtml_(ctx.dataProximaInspecao || '—') + '</div>');
  html.push('</div>');

  html.push('<div class="assinaturas">');
  if (assinante) {
    html.push('<div class="assinatura-item">');
    if (assinante.imagemSvg) html.push(assinante.imagemSvg);
    html.push('<div class="assinatura-linha"><strong>' + NR13Doc_escaparHtml_(assinante.nome) + '</strong><br>' + NR13Doc_escaparHtml_(assinante.cargo) + '<br>' + NR13Doc_escaparHtml_(assinante.registro) + '<br>Profissional Legalmente Habilitado (PLH) responsável (NR-13, item 13.3.2)</div>');
    html.push('</div>');
  }
  html.push('</div>');

  html.push('<div class="rodape-empresa">' + NR13Doc_escaparHtml_(empresa.nome) + (empresa.cnpj ? (' — CNPJ ' + NR13Doc_escaparHtml_(empresa.cnpj)) : '') + '<br>Departamento de Inspeções e Ensaios Científicos</div>');

  html.push('</div>');
  html.push('</body></html>');
  return html.join('\n');
}
