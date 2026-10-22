/****************************************************
 * NR13 — LAUDO DE INSPEÇÃO DE VASO DE PRESSÃO — MONTAGEM DO DOCUMENTO
 * HTML (A4)
 *
 * Documento oficial (Relatório de Inspeção de Segurança, item 13.5.4.11
 * da NR-13). Segue o padrão comum dos documentos A4
 * (docs/DOCUMENTOS_PADRAO_A4_20261018.md): estilos de SGO_DocA4_estilos_,
 * moldura da frente técnica (SGO_RelTecA4.js: cabeçalho e rodapé corridos,
 * "Página X de Y"), seções numeradas, tabelas "Tabela N —" e figuras
 * "Figura N —". O quadro de resultado (Aprovado / Aprovado com ressalvas /
 * Reprovado) fica só na abertura; o parecer conclusivo, as datas e a
 * assinatura do PLH ficam juntos no fecho. Sumário com páginas só quando o
 * laudo passa de 3 páginas (NR13Doc_finalizar_).
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

/** Grandezas em MPa, m³ e MPa·m³: as mesmas casas (até 6) em todo o laudo, da identificação à memória de cálculo. */
var NR13DOC_CASAS_SI = 6;

function NR13Doc_numSi_(v) {
  return NR13Doc_numVar_(v, NR13DOC_CASAS_SI);
}

function NR13Doc_paragrafosHtml_(texto) {
  var partes = String(texto || '').replace(/\r\n/g, '\n').split(/\n{2,}/).map(function(p) { return p.replace(/\s*\n\s*/g, ' ').trim(); }).filter(Boolean);
  if (!partes.length) return '<p class="nota">—</p>';
  return partes.map(function(p) { return '<p>' + NR13Doc_escaparHtml_(p) + '</p>'; }).join('\n');
}

/**
 * Texto fixo de reserva, caso a geração por IA falhe — a emissão do laudo nunca trava.
 * A citação completa da NR-13 fica só na seção "Referências normativas"; aqui ela é citada pela seção.
 */
function NR13Doc_textoIntroducaoFixo_(ctx) {
  var vaso = ctx.vaso || {};
  var ident = [vaso.tipo || 'vaso de pressão', vaso.tag ? 'TAG ' + vaso.tag : ''].filter(Boolean).join(', ');
  return 'O presente laudo apresenta os resultados da inspeção de segurança ' +
    (ctx.inspecao && ctx.inspecao.tipo ? String(ctx.inspecao.tipo).toLowerCase() + ' ' : '') +
    'realizada no vaso de pressão ' + ident + ', de propriedade de ' + ((ctx.cliente && ctx.cliente.razaoSocial) || 'cliente não identificado') +
    ', identificado na seção 1, em atendimento aos requisitos da NR-13 para vasos de pressão (item 13.5), conforme a redação citada na seção 4.';
}

function NR13Doc_textoObjetivoFixo_(ctx) {
  return 'O objetivo deste laudo é verificar as condições de integridade estrutural e segurança operacional do ' +
    'vaso de pressão descrito, por meio de inspeção visual e exames técnicos, determinando sua aptidão para ' +
    'permanecer em operação até a próxima inspeção de segurança, em conformidade com os critérios estabelecidos ' +
    'pela NR-13.';
}

function NR13Doc_vereditoLabel_(veredito) {
  if (veredito === NR13_CFG.VEREDITOS.REPROVADO) return 'Reprovado';
  if (veredito === NR13_CFG.VEREDITOS.APROVADO_COM_RESSALVAS) return 'Aprovado com ressalvas';
  return 'Aprovado';
}

function NR13Doc_vereditoClasse_(veredito) {
  if (veredito === NR13_CFG.VEREDITOS.REPROVADO) return 'nok';
  if (veredito === NR13_CFG.VEREDITOS.APROVADO_COM_RESSALVAS) return 'ressalva';
  return 'ok';
}

function NR13Doc_vereditoMotivo_(veredito) {
  if (veredito === NR13_CFG.VEREDITOS.REPROVADO) return 'O vaso não deve permanecer em operação até a execução das providências da seção 7 e nova inspeção. Fundamentação no parecer conclusivo (seção 8).';
  if (veredito === NR13_CFG.VEREDITOS.APROVADO_COM_RESSALVAS) return 'Integridade mantida condicionada às recomendações da seção 7. Fundamentação no parecer conclusivo (seção 8).';
  return 'Fundamentação no parecer conclusivo (seção 8).';
}

/** Valor e unidade sem quebra de linha entre eles. */
function NR13Doc_val_(texto, unidade) {
  return texto + (unidade ? ' ' + NR13Doc_escaparHtml_(unidade) : '');
}

function NR13Doc_anos_(n) {
  return n + (Number(n) === 1 ? ' ano' : ' anos');
}

/** Fotos do exame em figuras numeradas: legenda do técnico na legenda da figura, interpretação técnica embaixo. */
function NR13Doc_montarFotos_(fotos, num) {
  var lista = (fotos || []).filter(function(f) { return f && f.base64; });
  if (!lista.length) return '';
  var html = ['<div class="nr13-fotos">'];
  lista.forEach(function(f, i) {
    var mime = /^image\/(png|jpe?g|gif|webp)$/i.test(String(f.mimeType || '')) ? f.mimeType : 'image/jpeg';
    var legenda = String(f.legendaUsuario || '').trim() || ('Registro fotográfico ' + (i + 1));
    var fig = num.figura('<div class="q"><img src="data:' + mime + ';base64,' + String(f.base64).replace(/[^A-Za-z0-9+\/=]/g, '') + '" alt="Foto do exame"></div>', legenda);
    html.push('<div class="nr13-foto">' + fig +
      (f.interpretacaoIA ? '<p class="interp"><b>Interpretação técnica:</b> ' + NR13Doc_escaparHtml_(f.interpretacaoIA) + '</p>' : '') + '</div>');
  });
  html.push('</div>');
  return html.join('\n');
}

/** Passo "redondo" de grade (1, 2, 2,5 ou 5 × 10^n) para uns 4 a 6 intervalos. */
function NR13Doc_passoGrade_(maximo) {
  var bruto = maximo / 5;
  if (!(bruto > 0)) return 1;
  var pot = Math.pow(10, Math.floor(Math.log(bruto) / Math.LN10));
  var passo = 10 * pot;
  [1, 2, 2.5, 5, 10].some(function(k) { if (k * pot >= bruto) { passo = k * pot; return true; } return false; });
  return passo;
}

/**
 * Gráfico SVG estático (o PDF é gerado sem JavaScript) da curva de pressão do
 * Teste Hidrostático: rampa de subida → patamar (com a perda visível como
 * leve inclinação) → rampa de descida, com a pressão de teste tracejada.
 */
function NR13Doc_montarGraficoTH_(th) {
  var W = 640, H = 245;
  var margemEsq = 62, margemDir = 18, margemTopo = 16, margemBase = 52;
  var chartW = W - margemEsq - margemDir;
  var chartH = H - margemTopo - margemBase;

  var t1 = Math.max(th.tempoSubidaMin, 0.01);
  var t2 = t1 + Math.max(th.tempoEnsaioMin, 0.01);
  var t3 = t2 + Math.max(th.tempoDescidaMin, 0.01);
  var pRef = Math.max(th.pressaoTeste, th.pressaoInicial, th.pressaoFinal, 0.01);
  var passo = NR13Doc_passoGrade_(pRef * 1.1);
  var pMax = Math.ceil((pRef * 1.1) / passo) * passo;
  var casasEixo = 0;
  while (casasEixo < 4 && Math.abs(Math.round(passo * Math.pow(10, casasEixo)) - passo * Math.pow(10, casasEixo)) > 1e-9) casasEixo++;

  function px(t) { return margemEsq + (t / t3) * chartW; }
  function py(p) { return margemTopo + chartH - (p / pMax) * chartH; }
  var f = 'font-family="Arial,Helvetica,sans-serif"';

  var pontos = [[0, 0], [t1, th.pressaoInicial], [t2, th.pressaoFinal], [t3, 0]];
  var polylinePontos = pontos.map(function(p) { return px(p[0]).toFixed(1) + ',' + py(p[1]).toFixed(1); }).join(' ');
  var areaPontos = polylinePontos + ' ' + px(t3).toFixed(1) + ',' + py(0).toFixed(1) + ' ' + px(0).toFixed(1) + ',' + py(0).toFixed(1);

  var svg = [];
  svg.push('<svg viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H + '" role="img">');
  for (var g = 0; g <= pMax + passo / 2; g += passo) {
    var y = py(g);
    svg.push('<line x1="' + margemEsq + '" y1="' + y.toFixed(1) + '" x2="' + (W - margemDir) + '" y2="' + y.toFixed(1) + '" stroke="#e4e8ed" stroke-width="1"/>');
    svg.push('<text x="' + (margemEsq - 7) + '" y="' + (y + 3.5).toFixed(1) + '" font-size="10" fill="#3e4c59" text-anchor="end" ' + f + '>' + NR13Doc_num_(g, casasEixo) + '</text>');
  }
  if (th.pressaoTeste > 0) {
    var yTeste = py(th.pressaoTeste);
    svg.push('<line x1="' + margemEsq + '" y1="' + yTeste.toFixed(1) + '" x2="' + (W - margemDir) + '" y2="' + yTeste.toFixed(1) + '" stroke="#a61b1b" stroke-width="1.2" stroke-dasharray="5,4"/>');
    svg.push('<text x="' + (W - margemDir - 4) + '" y="' + (yTeste - 5).toFixed(1) + '" font-size="9.5" fill="#a61b1b" text-anchor="end" ' + f + '>Pressão de teste: ' + NR13Doc_num_(th.pressaoTeste, 2) + ' ' + NR13Doc_escaparHtml_(th.unidade) + '</text>');
  }
  svg.push('<line x1="' + margemEsq + '" y1="' + margemTopo + '" x2="' + margemEsq + '" y2="' + (H - margemBase) + '" stroke="#9aa5b1" stroke-width="1.2"/>');
  svg.push('<line x1="' + margemEsq + '" y1="' + (H - margemBase) + '" x2="' + (W - margemDir) + '" y2="' + (H - margemBase) + '" stroke="#9aa5b1" stroke-width="1.2"/>');
  svg.push('<polygon points="' + areaPontos + '" fill="#0b3d6e" fill-opacity="0.08"/>');
  svg.push('<polyline points="' + polylinePontos + '" fill="none" stroke="#0b3d6e" stroke-width="2.2" stroke-linejoin="round"/>');
  pontos.forEach(function(p) {
    svg.push('<circle cx="' + px(p[0]).toFixed(1) + '" cy="' + py(p[1]).toFixed(1) + '" r="3" fill="#0b3d6e"/>');
  });
  [[0, '0'], [t1, NR13Doc_num_(t1, 0)], [t2, NR13Doc_num_(t2, 0)], [t3, NR13Doc_num_(t3, 0)]].forEach(function(m) {
    var x = px(m[0]);
    svg.push('<line x1="' + x.toFixed(1) + '" y1="' + (H - margemBase) + '" x2="' + x.toFixed(1) + '" y2="' + (H - margemBase + 4) + '" stroke="#9aa5b1" stroke-width="1"/>');
    svg.push('<text x="' + x.toFixed(1) + '" y="' + (H - margemBase + 15) + '" font-size="10" fill="#1f2933" text-anchor="middle" ' + f + '>' + m[1] + '</text>');
  });
  svg.push('<text x="' + px(t1 / 2).toFixed(1) + '" y="' + (margemTopo + chartH - 6) + '" font-size="9" fill="#52606d" text-anchor="middle" ' + f + '>subida</text>');
  svg.push('<text x="' + px((t1 + t2) / 2).toFixed(1) + '" y="' + (margemTopo + chartH - 6) + '" font-size="9" fill="#52606d" text-anchor="middle" ' + f + '>patamar (ensaio)</text>');
  svg.push('<text x="' + px((t2 + t3) / 2).toFixed(1) + '" y="' + (margemTopo + chartH - 6) + '" font-size="9" fill="#52606d" text-anchor="middle" ' + f + '>descida</text>');
  svg.push('<text x="' + (margemEsq + chartW / 2) + '" y="' + (H - 12) + '" font-size="10" fill="#3e4c59" text-anchor="middle" ' + f + '>Tempo (min)</text>');
  svg.push('<text transform="translate(14 ' + (margemTopo + chartH / 2) + ') rotate(-90)" font-size="10" fill="#3e4c59" text-anchor="middle" ' + f + '>Pressão (' + NR13Doc_escaparHtml_(th.unidade) + ')</text>');
  svg.push('</svg>');
  return svg.join('');
}

/** Uma linha por fase do ensaio (subida, patamar, descida): pressões, duração e taxa ou perda calculada. */
function NR13Doc_montarTabelaTH_(th) {
  var u = th.unidade;
  function p(v) { return { html: NR13Doc_val_(NR13Doc_num_(v, 2), u) }; }
  function t(v) { return { html: NR13Doc_val_(NR13Doc_num_(v, 0), 'min') }; }
  var linhas = [
    ['Subida até a pressão de teste', p(0), p(th.pressaoTeste), t(th.tempoSubidaMin), { html: 'taxa ' + NR13Doc_val_(NR13Doc_num_(th.rampaSubida, 2), u + '/min') }],
    ['Patamar (ensaio)', p(th.pressaoInicial), p(th.pressaoFinal), t(th.tempoEnsaioMin), { html: 'perda ' + NR13Doc_val_(NR13Doc_num_(th.perda, 2), u) + ' (' + NR13Doc_val_(NR13Doc_num_(th.perdaPercentual, 1), '%') + ')' }],
    ['Descida (despressurização)', p(th.pressaoFinal), p(0), t(th.tempoDescidaMin), { html: 'taxa ' + NR13Doc_val_(NR13Doc_num_(th.rampaDescida, 2), u + '/min') }]
  ];
  return SGO_DocA4_tabela_([{ t: 'Fase' }, { t: 'Pressão no início', cls: 'num' }, { t: 'Pressão no fim', cls: 'num' }, { t: 'Duração', cls: 'num' }, { t: 'Taxa ou perda (calculada)', cls: 'num' }], linhas);
}

function NR13Doc_situacaoItem_(resultado) {
  var r = String(resultado || 'Aprovado');
  return { html: '<span class="' + (r === 'Reprovado' ? 'nok-txt' : 'ok-txt') + '">' + NR13Doc_escaparHtml_(r) + '</span>' };
}

function NR13Doc_montarTabelaValvulas_(valvulas) {
  return SGO_DocA4_tabela_(
    [{ t: 'Identificação' }, { t: 'Nº do certificado de inspeção ou teste' }, { t: 'Pressão de abertura ajustada' }, { t: 'Resultado' }],
    (valvulas || []).map(function(v) { return [v.identificacao || '—', v.certificado || '—', v.pressaoAbertura || '—', NR13Doc_situacaoItem_(v.resultado)]; })
  );
}

function NR13Doc_montarTabelaManometros_(manometros) {
  return SGO_DocA4_tabela_(
    [{ t: 'Identificação' }, { t: 'Faixa de indicação' }, { t: 'Nº do certificado de calibração' }, { t: 'Resultado' }],
    (manometros || []).map(function(m) { return [m.identificacao || '—', m.faixaIndicacao || '—', m.certificado || '—', NR13Doc_situacaoItem_(m.resultado)]; })
  );
}

/** Numeração das seções ("1.", "1.1") na ordem em que aparecem. */
function NR13Doc_secoes_() {
  var n = 0, s = 0;
  return {
    h2: function(texto) { n++; s = 0; return '<h2>' + n + '. ' + NR13Doc_escaparHtml_(texto) + '</h2>'; },
    // Subseções ficam fora do sumário (só as seções): num laudo de 4 a 6 páginas, a lista completa ocuparia meia página.
    h3: function(texto) { s++; return '<h3 class="sem-sumario">' + n + '.' + s + ' ' + NR13Doc_escaparHtml_(texto) + '</h3>'; }
  };
}

function NR13Doc_css_() {
  return '' +
    '.abertura{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:.6pt solid #9aa5b1;padding-bottom:2.2mm;margin:0 0 6mm}' +
    '.abertura img{height:13mm;width:auto;display:block}' +
    '.abertura .meta{text-align:right;font-size:7.8pt;line-height:1.35;color:#3e4c59}' +
    '.resultado.ressalva{border-color:#8a5a00;background:#fdf7ec}.resultado.ressalva .val{color:#8a5a00}' +
    'table.t.ident.nr13-ident th{width:18%}table.t.ident.nr13-ident td{width:32%}' +
    'table.t.nr13-th td:first-child{width:62%}' +
    'table.t.nr13-cat th{width:58%;background:#f5f7fa;font-weight:600;color:#3e4c59}table.t.nr13-cat td{text-align:right;font-variant-numeric:tabular-nums}' +
    'table.t.nr13-cat tr.destaque td,table.t.nr13-cat tr.destaque th{font-weight:700;color:#0b3d6e;background:#eef2f6}' +
    '.nr13-fotos{display:flex;flex-wrap:wrap;gap:4mm 5mm}' +
    '.nr13-foto{flex:1 1 76mm;max-width:calc(50% - 2.5mm);break-inside:avoid;page-break-inside:avoid}' +
    '.nr13-foto figure{margin:0}.nr13-foto .q{height:58mm;display:flex;align-items:center;justify-content:center;background:#fafbfc;border:.5pt solid #bcc5cf}' +
    '.nr13-foto .q img{max-width:100%;max-height:58mm;display:block}' +
    '.nr13-foto p.interp{font-size:8.3pt;line-height:1.38;margin:1.2mm 0 0}' +
    '.reltec-fig.nr13-graf svg{max-height:82mm}' +
    '.fecho-datas{display:flex;flex-wrap:wrap;justify-content:space-between;gap:2mm 8mm;margin:3mm 0 0;font-size:9.2pt}' +
    '.fecho-datas p{margin:0;text-align:left}' +
    '.reltec-fecho .assinaturas{justify-content:center;margin-top:6mm}.reltec-fecho .assinatura{flex:0 1 118mm}';
}

/**
 * @param {Object} ctx Ver formato completo em NR13_apiEmitirLaudo
 *   (SGO_NR13_Main.js) — cliente/vaso/categoria já calculados,
 *   veredito+parecer manuais, fotos com legenda+interpretação, textos
 *   de introdução/objetivo (IA ou fallback fixo).
 * @param {Object} opcoes { sumario: bool } — marcador do sumário automático (laudo com mais de 3 páginas).
 */
function NR13Doc_montarDocumentoHtml_(ctx, opcoes) {
  opcoes = opcoes || {};
  var empresa = (typeof CadeiaFrioRel_CFCFG !== 'undefined' && CadeiaFrioRel_CFCFG.EMPRESA_EXECUTANTE) ||
    { nome: 'Metrolab Soluções em Engenharia Clínica LTDA', cnpj: '', site: '', telefone: '', endereco: '' };
  var assinaturasPadrao = (typeof CadeiaFrioRel_CFCFG !== 'undefined' && CadeiaFrioRel_CFCFG.ASSINATURAS_PADRAO) || [];
  var assinante = assinaturasPadrao.filter(function(a) { return a.nome === ctx.assinantePh; })[0] || assinaturasPadrao[0] || null;
  var vaso = ctx.vaso || {}, cat = ctx.categoria || { periodicidade: {} }, insp = ctx.inspecao || {};
  var textosIA = ctx.textosIA || { introducao: NR13Doc_textoIntroducaoFixo_(ctx), objetivo: NR13Doc_textoObjetivoFixo_(ctx) };
  var numero = ctx.numeroLaudo || '';
  var revisao = RelTecA4_revisao_(ctx.revisao);
  var num = RelTecA4_numerador_();
  var sec = NR13Doc_secoes_();
  var esc = NR13Doc_escaparHtml_;
  var titulo = 'Laudo de inspeção de segurança de vaso de pressão';

  var html = [];
  html.push('<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">');
  html.push('<meta name="viewport" content="width=device-width, initial-scale=1">');
  html.push('<title>Laudo NR-13' + (numero ? (' nº ' + esc(numero)) : '') + '</title>');
  html.push('<style>' + SGO_DocA4_estilos_({ orientacao: 'retrato' }) +
    RelTecA4_css_({ titulo: 'Laudo de inspeção de segurança — NR-13', numero: numero, revisao: revisao }) +
    NR13Doc_css_() + '</style></head><body>');
  html.push('<div class="barra-tela"><button type="button" onclick="window.print()">Imprimir ou salvar em PDF</button></div>');
  html.push('<main class="folha">');

  // Abertura: logo, número, título, ficha do documento e quadro de resultado (só aqui).
  html.push('<div class="abertura"><img src="' + SGO_DocA4_logoDataUri_() + '" alt="Metrolabs"><div class="meta">Laudo de inspeção de segurança — NR-13<br>Nº ' +
    esc(numero || '—') + ' · Revisão ' + esc(revisao) + '</div></div>');
  html.push('<h1>' + titulo + '</h1>');
  html.push('<p class="subtitulo">Relatório de inspeção de segurança conforme o item 13.5.4.11 da NR-13</p>');
  var periodo = insp.dataInicio && insp.dataTermino && insp.dataInicio !== insp.dataTermino ? insp.dataInicio + ' a ' + insp.dataTermino : (insp.dataTermino || insp.dataInicio || '—');
  // Número e revisão já estão no topo da página; a data de emissão fica no fecho, com o parecer.
  html.push(SGO_DocA4_tabelaIdent_([['Tipo de inspeção', insp.tipo || '—'], ['Período da inspeção', periodo]], 'ficha'));
  html.push(SGO_DocA4_quadroResultado_({ classe: NR13Doc_vereditoClasse_(ctx.veredito), rotulo: 'Parecer conclusivo do PLH', valor: NR13Doc_vereditoLabel_(ctx.veredito), texto: NR13Doc_vereditoMotivo_(ctx.veredito) }));
  if (opcoes.sumario) html.push(RelTecA4_sumario_());

  // 1. Identificação
  html.push(sec.h2('Identificação'));
  html.push(sec.h3('Empresa executante'));
  var pe = [['Razão social', empresa.nome || '—'], ['CNPJ', empresa.cnpj || '—']];
  if (empresa.endereco) pe.push(['Endereço', empresa.endereco, { largo: true }]);
  pe.push(['Site', empresa.site || '—'], ['Telefone', empresa.telefone || '—']);
  html.push(SGO_DocA4_tabelaIdent_(pe, 'nr13-ident'));
  html.push(sec.h3('Cliente'));
  var pc = [['Razão social', (ctx.cliente && ctx.cliente.razaoSocial) || '—'], ['CNPJ', (ctx.cliente && ctx.cliente.cnpj) || '—'],
    ['Endereço', (ctx.cliente && ctx.cliente.endereco) || '—', { largo: true }]];
  if (ctx.unidade && ctx.unidade.nome) pc.push(['Unidade', ctx.unidade.nome, { largo: true }]);
  html.push(SGO_DocA4_tabelaIdent_(pc, 'nr13-ident'));
  html.push(sec.h3('Vaso de pressão'));
  var pmta = NR13Doc_val_(NR13Doc_numVar_(vaso.pmtaValor), vaso.pmtaUnidade || 'MPa') +
    (vaso.pmtaUnidade && vaso.pmtaUnidade !== 'MPa' ? ' (' + NR13Doc_val_(NR13Doc_numSi_(vaso.pmtaMpa), 'MPa') + ')' : '');
  var volume = NR13Doc_val_(NR13Doc_numVar_(vaso.volumeValor), vaso.volumeUnidade || 'm³') +
    (vaso.volumeUnidade && vaso.volumeUnidade !== 'm³' ? ' (' + NR13Doc_val_(NR13Doc_numSi_(vaso.volumeM3), 'm³') + ')' : '');
  html.push(SGO_DocA4_tabelaIdent_([
    ['Tipo de vaso', vaso.tipo || '—'], ['Identificação (TAG)', vaso.tag || '—'],
    ['Fabricante', vaso.fabricante || '—'], ['Modelo', vaso.modelo || '—'],
    ['Nº de série', vaso.numeroSerie || '—'], ['Ano de fabricação', vaso.anoFabricacao || '—'],
    ['Localização', vaso.localizacao || vaso.setor || '—'], ['Código de construção', vaso.codigoConstrucao || '—'],
    ['PMTA (plaqueta)', { html: pmta }], ['Volume interno', { html: volume }],
    ['Classe do fluido', vaso.classeFluido || '—'], ['Fluido de serviço', vaso.fluidoServico || '—']
  ], 'nr13-ident'));

  // 2. Introdução / 3. Objetivo / 4. Referências normativas (a citação completa da NR-13 aparece só aqui)
  html.push(sec.h2('Introdução'));
  html.push(NR13Doc_paragrafosHtml_(textosIA.introducao));
  html.push(sec.h2('Objetivo'));
  html.push(NR13Doc_paragrafosHtml_(textosIA.objetivo));
  html.push(sec.h2('Referências normativas'));
  html.push(SGO_DocA4_lista_([NR13_CFG.NORMA_REFERENCIA].concat(vaso.codigoConstrucao ? ['Código de construção do vaso: ' + vaso.codigoConstrucao + '.'] : [])));

  // 5. Categorização e periodicidade (memória de cálculo)
  html.push(sec.h2('Categorização e periodicidade'));
  var nTabCat = num.proximaTabela();
  html.push('<p>A categoria do vaso resulta do grupo de potencial de risco, obtido do produto P.V (item 13.5.1.1.3 da NR-13), cruzado com a classe do fluido na Tabela 1 da NR-13. ' +
    'Adota-se como P a PMTA informada na plaqueta, em MPa, como critério conservador (a pressão máxima de operação não excede a PMTA), e como V o volume interno, em m³. ' +
    'Os prazos máximos de inspeção são os da Tabela 2 da NR-13 para estabelecimento sem Serviço Próprio de Inspeção de Equipamentos (SPIE). A memória de cálculo está na Tabela ' + nTabCat + '.</p>');
  var pv = NR13Doc_numSi_(cat.pv);
  html.push('<div class="manter">' + num.tabela('Memória de cálculo da categoria e da periodicidade') + '<table class="t nr13-cat"><tbody>' +
    '<tr><th>Pressão adotada, P = PMTA</th><td>' + NR13Doc_val_(NR13Doc_numSi_(vaso.pmtaMpa), 'MPa') + '</td></tr>' +
    '<tr><th>Volume interno, V</th><td>' + NR13Doc_val_(NR13Doc_numSi_(vaso.volumeM3), 'm³') + '</td></tr>' +
    '<tr><th>Produto P.V</th><td>' + NR13Doc_numSi_(vaso.pmtaMpa) + ' × ' + NR13Doc_numSi_(vaso.volumeM3) + ' = ' + NR13Doc_val_(pv, 'MPa·m³') + '</td></tr>' +
    '<tr><th>Grupo de potencial de risco (item 13.5.1.1.3)</th><td>' + esc(String(cat.grupo == null ? '—' : cat.grupo)) + '</td></tr>' +
    '<tr><th>Classe do fluido</th><td>' + esc(vaso.classeFluido || '—') + '</td></tr>' +
    '<tr class="destaque"><th>Categoria (Tabela 1 da NR-13)</th><td>' + esc(cat.categoria || '—') + '</td></tr>' +
    '<tr><th>Prazo máximo do exame externo (Tabela 2 da NR-13)</th><td>' + esc(NR13Doc_anos_(cat.periodicidade.externo)) + '</td></tr>' +
    '<tr><th>Prazo máximo do exame interno (Tabela 2 da NR-13)</th><td>' + esc(NR13Doc_anos_(cat.periodicidade.interno)) + '</td></tr>' +
    '</tbody></table></div>');
  // Campo de aplicação (item 13.2.1): aviso quando P.V (kPa·m³) não passa de 8 e o fluido não é da classe A.
  if (cat.foraDoCampoAplicacao) {
    html.push('<p class="nota"><b>Campo de aplicação:</b> com a PMTA em kPa, o produto P.V deste vaso é ' + NR13Doc_val_(NR13Doc_numVar_(cat.pvKpa, 4), 'kPa·m³') +
      ', não superior a 8, e o fluido não é da classe A. Pelo item 13.2.1 da NR-13 o vaso não se enquadra obrigatoriamente na norma; a inspeção seguiu os mesmos critérios, ' +
      'a pedido do cliente ou por boa prática, e a categoria da Tabela ' + nTabCat + ' é informada apenas como referência.</p>');
  }

  // 6. Inspeção executada
  html.push(sec.h2('Inspeção executada'));
  html.push(sec.h3('Inspeções, exames e testes'));
  html.push(NR13Doc_paragrafosHtml_(insp.descricao));
  var temValv = ctx.valvulas && ctx.valvulas.length, temMan = ctx.manometros && ctx.manometros.length;
  if (temValv || temMan) {
    html.push(sec.h3('Dispositivos de segurança e instrumentos'));
    if (temValv) { html.push(num.tabela('Válvulas de segurança inspecionadas')); html.push(NR13Doc_montarTabelaValvulas_(ctx.valvulas)); }
    if (temMan) { html.push(num.tabela('Manômetros utilizados na inspeção')); html.push(NR13Doc_montarTabelaManometros_(ctx.manometros)); }
  }
  if (ctx.testeHidrostatico && ctx.testeHidrostatico.realizado) {
    var th = ctx.testeHidrostatico;
    html.push(sec.h3('Teste hidrostático'));
    var nTabTh = num.proximaTabela(), nFigTh = num.proximaFigura();
    html.push('<p>Teste realizado com pressão de teste de ' + NR13Doc_val_(NR13Doc_num_(th.pressaoTeste, 2), th.unidade) + '. As fases do ensaio estão na Tabela ' + nTabTh +
      ' e a curva de pressão registrada, na Figura ' + nFigTh + '.</p>');
    html.push('<div class="manter">' + num.tabela('Fases do teste hidrostático') + NR13Doc_montarTabelaTH_(th) + '</div>');
    html.push(num.figura(NR13Doc_montarGraficoTH_(th), 'Curva de pressão do teste hidrostático (' + th.unidade + '), com a pressão de teste tracejada').replace('class="reltec-fig"', 'class="reltec-fig nr13-graf"'));
  }
  var fotos = NR13Doc_montarFotos_(ctx.fotos, num);
  if (fotos) {
    html.push(sec.h3('Registro fotográfico'));
    html.push(fotos);
  }

  // 7. Resultados e recomendações
  html.push(sec.h2('Resultados e recomendações'));
  html.push(sec.h3('Resultado das inspeções e intervenções executadas'));
  html.push(NR13Doc_paragrafosHtml_(insp.resultado));
  html.push(sec.h3('Recomendações e providências necessárias'));
  html.push(NR13Doc_paragrafosHtml_(insp.recomendacoes));
  if (insp.observacoes) {
    html.push(sec.h3('Observações adicionais'));
    html.push(NR13Doc_paragrafosHtml_(insp.observacoes));
  }

  // 8. Parecer conclusivo: texto do PLH, datas e assinatura juntos (não se separam entre páginas).
  // Parecer longo: os primeiros parágrafos correm normalmente; o último fica preso às datas e à assinatura.
  var parecer = String(ctx.parecerConclusivo || '').replace(/\r\n/g, '\n').split(/\n{2,}/).map(function(p) { return p.trim(); }).filter(Boolean);
  var ultimo = parecer.length ? parecer.pop() : '';
  html.push(sec.h2('Parecer conclusivo'));
  if (parecer.length) html.push(NR13Doc_paragrafosHtml_(parecer.join('\n\n')));
  html.push('<section class="reltec-fecho">');
  html.push(NR13Doc_paragrafosHtml_(ultimo));
  if (ctx.registroOrigemInfo) {
    html.push('<p class="nota">Reinspeção referente ao laudo NR-13 nº ' + esc(ctx.registroOrigemInfo.numeroLaudo || '—') + ', emitido anteriormente com o parecer "aprovado com ressalvas".</p>');
  }
  html.push('<div class="fecho-datas"><p><b>Data de emissão:</b> ' + esc(ctx.dataEmissao || '—') + '</p><p><b>Próxima inspeção de segurança prevista:</b> ' + esc(ctx.dataProximaInspecao || '—') + '</p></div>');
  if (assinante) {
    var img = (assinante.imagemSvg && /^\s*<svg[\s>]/i.test(assinante.imagemSvg)) ? assinante.imagemSvg : '';
    html.push('<div class="assinaturas"><div class="assinatura"><div class="img">' + img + '</div>' +
      '<div class="linha">' + esc(assinante.nome) + '</div>' +
      '<div class="cargo">' + [assinante.cargo, assinante.registro, 'Profissional Legalmente Habilitado (PLH) responsável, item 13.3.2 da NR-13'].filter(Boolean).map(esc).join('<br>') + '</div></div></div>');
  }
  html.push('</section>');

  if (ctx.historicoRevisoesHtml) html.push(ctx.historicoRevisoesHtml); // histórico de revisões (SGO_DocRevisao.js)
  html.push('</main>');
  html.push('</body></html>');
  return html.join('\n');
}

/**
 * Monta o laudo e o PDF para gravar. Sem sumário quando o laudo cabe em até 3
 * páginas (padrão A4); acima disso, monta de novo com o sumário e preenche os
 * números de página (RelTecA4_paginar_, duas passagens). Nunca lança por causa
 * do sumário: sem conversor de PDF devolve o HTML e pdfBlob nulo.
 * Devolve { html, pdfBlob, paginas, sumario }.
 */
function NR13Doc_finalizar_(ctx, nome) {
  var html = NR13Doc_montarDocumentoHtml_(ctx, { sumario: false });
  var pdf = null, paginas = 0;
  try {
    pdf = SGO_DocA4_pdfDeHtml_(html, nome);
    paginas = (SGO_DocA4_paginasDoPdf_(pdf) || {})._total || 0;
  } catch (e) { return { html: html, pdfBlob: null, paginas: 0, sumario: false }; }
  if (paginas <= 3) return { html: html, pdfBlob: pdf, paginas: paginas, sumario: false };
  var r = RelTecA4_paginar_(NR13Doc_montarDocumentoHtml_(ctx, { sumario: true }), nome);
  if (!r.pdfBlob) return { html: html, pdfBlob: pdf, paginas: paginas, sumario: false };
  return { html: r.html, pdfBlob: r.pdfBlob, paginas: paginas, sumario: true };
}
