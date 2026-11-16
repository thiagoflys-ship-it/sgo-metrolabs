/****************************************************
 * DECLARAÇÃO DE EXECUÇÃO DE SERVIÇO — MONTAGEM DO DOCUMENTO HTML (A4)
 *
 * Reaproveita dados da empresa e assinaturas já cadastrados em
 * CadeiaFrioRel_CFCFG (mesmo projeto Apps Script, escopo global).
 *
 * Este documento NUNCA exibe status de aprovação/reprovação — só a
 * declaração de que o serviço foi executado, com metodologia e itens
 * calibrados/qualificados.
 *
 * Padrão A4 de 18/10/2026 (docs/DOCUMENTOS_PADRAO_A4_20261018.md): estilos de
 * SGO_DocA4_estilos_ + moldura técnica SGO_RelTecA4 (cabeçalho e rodapé corridos,
 * "Página X de Y"), seções numeradas, "Tabela N —" e "Figura N —", normas listadas
 * uma vez só, aviso de escopo uma vez só (na declaração final) junto das assinaturas.
 * As funções DeclExecA4_* são usadas também pelo Relatório QI/QO/QD
 * (SGO_DeclaracaoExec_DocumentoQIQO.js).
 ****************************************************/

function DeclExec_escaparHtml_(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function DeclExec_paragrafosHtml_(texto) {
  var partes = String(texto || '').replace(/\r\n/g, '\n').split(/\n{2,}/).map(function(p) { return p.replace(/\s*\n\s*/g, ' ').trim(); }).filter(Boolean);
  if (!partes.length) return '<p class="nota">—</p>';
  return partes.map(function(p) { return '<p>' + DeclExec_escaparHtml_(p) + '</p>'; }).join('\n');
}

/* ---------- Peças comuns à Declaração e ao Relatório QI/QO/QD ---------- */

function DeclExecA4_empresa_() {
  return (typeof CadeiaFrioRel_CFCFG !== 'undefined' && CadeiaFrioRel_CFCFG.EMPRESA_EXECUTANTE) || { nome: 'Metrolab Soluções em Engenharia Clínica LTDA', cnpj: '' };
}

function DeclExecA4_css_() {
  return '' +
    '.abertura{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:.6pt solid #9aa5b1;padding-bottom:2.2mm;margin:0 0 6mm}' +
    '.abertura img{height:13mm;width:auto;display:block}' +
    '.abertura .meta{text-align:right;font-size:7.8pt;line-height:1.35;color:#3e4c59}' +
    'table.t.ident.de-ident th{width:21%}table.t.ident.de-ident td{width:29%}' +
    '.resultado.achado{border-color:#8a5a00;background:#fdf7ec}.resultado.achado .val{color:#8a5a00}' +
    '.de-fotos{display:flex;flex-wrap:wrap;gap:4mm 5mm}' +
    '.de-foto{flex:1 1 76mm;max-width:calc(50% - 2.5mm);break-inside:avoid;page-break-inside:avoid}' +
    '.de-foto figure{margin:0}.de-foto .q{height:58mm;display:flex;align-items:center;justify-content:center;background:#fafbfc;border:.5pt solid #bcc5cf}' +
    '.de-foto .q img{max-width:100%;max-height:58mm;display:block}' +
    'p.interp{font-size:8.3pt;line-height:1.38;margin:1.2mm 0 2.4mm}' +
    '.de-cert .q{height:auto;max-height:118mm;display:flex;align-items:center;justify-content:center;background:#fafbfc;border:.5pt solid #bcc5cf}' +
    '.de-cert .q img{max-width:100%;max-height:118mm;display:block}' +
    '.de-cert{max-width:120mm}' +
    'td .obs{color:#8a5a00}' +
    '.fecho-data{margin:3mm 0 0;font-size:9.2pt;text-align:left}';
}

/** Cabeça do documento: <head> com os estilos do padrão, barra de tela e abertura (logo e número). */
function DeclExecA4_inicio_(o) {
  var esc = DeclExec_escaparHtml_;
  var revisao = RelTecA4_revisao_(o.revisao);
  var h = [];
  h.push('<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">');
  h.push('<meta name="viewport" content="width=device-width, initial-scale=1">');
  h.push('<meta name="sgo-numero" content="' + esc(o.numero || '') + '">');
  h.push('<title>' + esc(o.tituloCurto) + (o.numero ? ' — ' + esc(o.numero) : '') + '</title>');
  h.push('<style>' + SGO_DocA4_estilos_({ orientacao: 'retrato' }) +
    RelTecA4_css_({ titulo: o.tituloCurto, numero: o.numero || '', revisao: revisao }) + DeclExecA4_css_() + '</style></head><body>');
  h.push('<div class="barra-tela"><button type="button" onclick="window.print()">Imprimir ou salvar em PDF</button></div>');
  h.push('<main class="folha">');
  h.push('<div class="abertura"><img src="' + SGO_DocA4_logoDataUri_() + '" alt="Metrolabs"><div class="meta">' + esc(o.tituloCurto) +
    '<br>Nº ' + esc(o.numero || '—') + ' · Revisão ' + esc(revisao) + '</div></div>');
  h.push('<h1>' + esc(o.titulo) + '</h1>');
  if (o.subtitulo) h.push('<p class="subtitulo">' + esc(o.subtitulo) + '</p>');
  return h.join('\n');
}

/** Numeração das seções ("1.", "1.1") na ordem em que aparecem. */
function DeclExecA4_secoes_() {
  var n = 0, s = 0;
  return {
    atual: function() { return n; },
    h2: function(texto) { n++; s = 0; return '<h2>' + n + '. ' + DeclExec_escaparHtml_(texto) + '</h2>'; },
    h3: function(texto) { s++; return '<h3 class="sem-sumario">' + n + '.' + s + ' ' + DeclExec_escaparHtml_(texto) + '</h3>'; }
  };
}

/** Identificação do cliente, do equipamento e do atendimento (uma tabela só). */
function DeclExecA4_identificacao_(ctx) {
  return SGO_DocA4_tabelaIdent_([
    ['Cliente', ctx.cliente || '—', { largo: true }],
    ['Endereço', ctx.endereco || '—', { largo: true }],
    ['Equipamento', ctx.equipamentoLabel || '—'], ['TAG', ctx.tag || '—'],
    // 22/10/2026: fabricante (marca), modelo e nº de série em linhas próprias (série só quando informada).
    ['Fabricante (marca)', ctx.marca || '—'], ['Modelo', ctx.modelo || '—'],
    ctx.numeroSerie ? ['Nº de série', ctx.numeroSerie] : null, ['Localização', ctx.localizacao || '—'],
    ['Período do atendimento', ctx.periodoLabel || '—'], ['Local do atendimento', ctx.localAtendimento === 'LABORATORIO' ? 'Laboratório da Metrolabs' : 'Instalações do cliente'],
    ['Técnico executor', ctx.tecnicoExecutor || '—', { largo: true }]
  ].filter(Boolean), 'de-ident') +
    // 22/10/2026: padrões de referência marcados na tela (todos, com os dados do cadastro de padrões).
    (ctx.padroesUsados ? SGO_DocA4_blocoPadroesUsados_(ctx.padroesUsados, ctx.padroesDataRef || ctx.dataEmissao) : '');
}

/** Referências normativas: a única lista de normas do documento. */
function DeclExecA4_normas_(normas) {
  return '<div class="manter">' + SGO_DocA4_lista_(normas || []) + '</div>';
}

/** Assinaturas (configuração do módulo), no padrão SGO_DocA4. */
function DeclExecA4_assinaturas_(ctx) {
  var padrao = (typeof CadeiaFrioRel_CFCFG !== 'undefined' && CadeiaFrioRel_CFCFG.ASSINATURAS_PADRAO) || [];
  var lista = (ctx.assinantesSelecionados && ctx.assinantesSelecionados.length) ? ctx.assinantesSelecionados : padrao;
  return SGO_DocA4_assinaturas_(lista);
}

/** Fotos em figuras numeradas (legenda do técnico na legenda; análise da imagem, quando houver, embaixo). */
function DeclExecA4_fotos_(fotos, num, rotuloPadrao, limparTexto) {
  var lista = (fotos || []).filter(function(f) { return f && f.base64; });
  if (!lista.length) return '';
  var limpar = typeof limparTexto === 'function' ? limparTexto : function(t) { return t; };
  return '<div class="de-fotos">' + lista.map(function(f, i) {
    var mime = /^image\/(png|jpe?g|gif|webp)$/i.test(String(f.mimeType || '')) ? f.mimeType : 'image/jpeg';
    var legenda = String(f.legendaTecnico || f.legenda || '').trim();
    var fig = num.figura('<div class="q"><img src="data:' + mime + ';base64,' + String(f.base64).replace(/[^A-Za-z0-9+\/=]/g, '') + '" alt="Foto"></div>',
      limpar(legenda) || (rotuloPadrao + ' ' + (i + 1)));
    return '<div class="de-foto">' + fig + (f.legendaIA ? '<p class="interp"><b>Análise da imagem:</b> ' + DeclExec_escaparHtml_(limpar(f.legendaIA)) + '</p>' : '') + '</div>';
  }).join('') + '</div>';
}

/** Fecho: texto final, data de emissão e assinaturas juntos (não se separam entre páginas). */
function DeclExecA4_fecho_(sec, titulo, textoFinal, ctx, notaExtra) {
  return sec.h2(titulo) + '<section class="reltec-fecho">' + DeclExec_paragrafosHtml_(textoFinal) +
    (notaExtra ? '<p class="nota">' + DeclExec_escaparHtml_(notaExtra) + '</p>' : '') +
    '<p class="fecho-data"><b>Data de emissão:</b> ' + DeclExec_escaparHtml_(ctx.dataEmissao || '—') + '</p>' +
    DeclExecA4_assinaturas_(ctx) + '</section>';
}

/**
 * HTML final para a tela e para gravar. Sem sumário quando o documento cabe em até
 * 3 páginas; acima disso, monta de novo com o sumário e preenche as páginas (duas
 * passagens). Nunca lança por causa do sumário. montar(comSumario) → html.
 */
function DeclExec_finalizarHtml_(montar, nome) {
  var html = montar(false);
  try {
    var pdf = SGO_DocA4_pdfDeHtml_(html, nome);
    var paginas = (SGO_DocA4_paginasDoPdf_(pdf) || {})._total || 0;
    if (paginas <= 3) return html;
    var r = RelTecA4_paginar_(montar(true), nome);
    return r && r.html ? r.html : html;
  } catch (e) {
    return html;
  }
}

/* ---------- Declaração ---------- */

function DeclExec_montarSecaoCalibracoes_(calibracoes) {
  if (!calibracoes || !calibracoes.length) return '';
  var temObs = calibracoes.some(function(c) { return c.observacao; });
  var colunas = [{ t: 'Item calibrado' }, { t: 'Quantidade', cls: 'num' }].concat(temObs ? [{ t: 'Observação do técnico' }] : []);
  var linhas = calibracoes.map(function(c) {
    var l = [c.label || '—', String(c.quantidade == null ? '—' : c.quantidade)];
    if (temObs) l.push(c.observacao ? { html: '<span class="obs">' + DeclExec_escaparHtml_(c.observacao) + '</span>' } : '—');
    return l;
  });
  return SGO_DocA4_tabela_(colunas, linhas);
}

/**
 * @param {Object} ctx ver DeclExec_apiMontarDocumentoFinal (SGO_DeclaracaoExec_Main.js)
 * @param {Object} opcoes { sumario: bool } — marcador do sumário (documento com mais de 3 páginas)
 */
function DeclExec_montarDocumentoHtml_(ctx, opcoes) {
  opcoes = opcoes || {};
  var t = ctx.textos || {};
  var num = RelTecA4_numerador_();
  var sec = DeclExecA4_secoes_();
  var html = [];
  html.push(DeclExecA4_inicio_({
    tituloCurto: 'Declaração de execução de serviço', titulo: 'Declaração de execução de serviço',
    subtitulo: [ctx.equipamentoLabel, ctx.tag ? 'TAG ' + ctx.tag : ''].filter(Boolean).join(' — '),
    numero: ctx.numeroDocumento, revisao: ctx.revisao
  }));
  if (opcoes.sumario) html.push(RelTecA4_sumario_());

  html.push(sec.h2('Identificação'));
  html.push(DeclExecA4_identificacao_(ctx));

  html.push(sec.h2('Introdução'));
  html.push(DeclExec_paragrafosHtml_(t.introducao));

  html.push(sec.h2('Metodologia'));
  html.push(DeclExec_paragrafosHtml_(t.metodologia));

  if (t.calibracoes || (ctx.calibracoes && ctx.calibracoes.length)) {
    html.push(sec.h2('Calibrações realizadas'));
    if (t.calibracoes) html.push(DeclExec_paragrafosHtml_(t.calibracoes));
    if (ctx.calibracoes && ctx.calibracoes.length) {
      html.push(num.tabela('Itens calibrados') + DeclExec_montarSecaoCalibracoes_(ctx.calibracoes));
    }
  }

  if (t.qi) { html.push(sec.h2('Qualificação de instalação (QI)')); html.push(DeclExec_paragrafosHtml_(t.qi)); }
  if (t.qo) { html.push(sec.h2('Qualificação de operação (QO)')); html.push(DeclExec_paragrafosHtml_(t.qo)); }
  if (t.qd) { html.push(sec.h2('Qualificação de desempenho (QD)')); html.push(DeclExec_paragrafosHtml_(t.qd)); }

  if (ctx.normas && ctx.normas.length) {
    html.push(sec.h2('Referências normativas'));
    html.push(DeclExecA4_normas_(ctx.normas));
  }

  var fotos = DeclExecA4_fotos_(ctx.fotos, num, 'Registro fotográfico');
  if (fotos) {
    html.push(sec.h2('Registro fotográfico'));
    html.push(fotos);
  }

  // O aviso de escopo ("sem juízo de conformidade") fica só aqui, na declaração final, junto das assinaturas.
  html.push(DeclExecA4_fecho_(sec, 'Declaração', t.declaracaoFinal, ctx));

  html.push('</main></body></html>');
  return html.join('\n');
}
