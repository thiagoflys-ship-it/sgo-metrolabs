/****************************************************
 * DECLARAÇÃO DE EXECUÇÃO DE SERVIÇO — MONTAGEM DO DOCUMENTO HTML (A4)
 *
 * Reaproveita logo/dados da empresa/assinaturas já cadastrados em
 * CadeiaFrioRel_CFCFG (mesmo projeto Apps Script, escopo global) —
 * evita duplicar os blobs de imagem em outro arquivo de config.
 *
 * Este documento NUNCA exibe status de aprovação/reprovação — só a
 * declaração de que o serviço foi executado, com metodologia e itens
 * calibrados/qualificados.
 ****************************************************/

function DeclExec_escaparHtml_(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function DeclExec_paragrafosHtml_(texto) {
  var partes = String(texto || '').split(/\n{2,}/).map(function(p) { return p.trim(); }).filter(Boolean);
  if (!partes.length) return '<p>-</p>';
  return partes.map(function(p) { return '<p>' + DeclExec_escaparHtml_(p) + '</p>'; }).join('\n');
}

function DeclExec_montarSecaoCalibracoes_(calibracoes) {
  if (!calibracoes || !calibracoes.length) return '';
  var temAchado = calibracoes.some(function(c) { return c.observacao; });
  var linhas = calibracoes.map(function(c) {
    var cols = '<td>' + DeclExec_escaparHtml_(c.label) + '</td><td class="num">' + DeclExec_escaparHtml_(c.quantidade) + '</td>';
    if (temAchado) cols += '<td style="text-align:center;">' + (c.observacao ? 'Sim — ver texto acima' : '—') + '</td>';
    return '<tr>' + cols + '</tr>';
  }).join('\n');
  var cabecalho = '<tr><th>Item calibrado</th><th class="num">Quantidade</th>' + (temAchado ? '<th>Achado técnico</th>' : '') + '</tr>';
  return (
    '<table class="tabela-itens"><thead>' + cabecalho + '</thead><tbody>' +
    linhas + '</tbody></table>'
  );
}

function DeclExec_montarDocumentoHtml_(ctx) {
  var empresa = (typeof CadeiaFrioRel_CFCFG !== 'undefined' && CadeiaFrioRel_CFCFG.EMPRESA_EXECUTANTE) || { nome: 'Metrolab Soluções em Engenharia Clínica LTDA', cnpj: '' };
  var logo = (typeof CadeiaFrioRel_CFCFG !== 'undefined' && CadeiaFrioRel_CFCFG.LOGO_BASE64) || null;
  var assinaturas = (typeof CadeiaFrioRel_CFCFG !== 'undefined' && CadeiaFrioRel_CFCFG.ASSINATURAS_PADRAO) || [];

  var html = [];
  html.push('<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">');
  html.push('<title>Declaração de Execução de Serviço' + (ctx.numeroDocumento ? (' — ' + DeclExec_escaparHtml_(ctx.numeroDocumento)) : '') + '</title>');
  html.push('<style>');
  html.push('@page { size: A4; margin: 18mm 16mm; }');
  html.push('* { box-sizing: border-box; }');
  html.push('body { font-family: Arial, Helvetica, sans-serif; color: #1f2937; font-size: 13px; line-height: 1.55; margin: 0; background: #f3f4f6; }');
  html.push('.folha { max-width: 900px; margin: 24px auto; background: #ffffff; padding: 28px 34px 40px; box-shadow: 0 2px 10px rgba(0,0,0,.12); }');
  html.push('.topo { display:flex; align-items:center; justify-content:space-between; border-bottom: 3px solid #0b4ea2; padding-bottom: 14px; margin-bottom: 20px; }');
  html.push('.logo-topo { height: 46px; }');
  html.push('.titulo-doc { text-align:right; }');
  html.push('.titulo-doc h1 { font-size: 18px; margin: 0; color:#0b4ea2; }');
  html.push('.titulo-doc small { color:#6b7280; }');
  html.push('table.dados { width:100%; border-collapse: collapse; margin-bottom: 18px; }');
  html.push('table.dados td { border: 1px solid #d1d5db; padding: 6px 10px; font-size: 12.5px; }');
  html.push('table.dados td.rotulo { background:#f3f4f6; font-weight:700; width: 190px; color:#374151; }');
  html.push('.secao { margin-top: 26px; }');
  html.push('.secao h2 { font-size: 13px; color:#ffffff; background:#0b4ea2; padding: 8px 12px; margin: 0 0 12px; border-left: 6px solid #059669; }');
  html.push('p { text-align: justify; margin: 8px 0; }');
  html.push('table.tabela-itens { width:100%; border-collapse: collapse; margin: 10px 0 4px; }');
  html.push('table.tabela-itens th, table.tabela-itens td { border: 1px solid #d1d5db; padding: 6px 10px; font-size: 12.5px; }');
  html.push('table.tabela-itens th { background:#f3f4f6; text-align:left; }');
  html.push('.declaracao-box { background:#f3f4f6; border-left: 4px solid #0b4ea2; padding: 14px 16px; margin-top: 26px; font-weight:500; page-break-inside: avoid; }');
  html.push('.fotos-grid { display:flex; flex-wrap:wrap; gap: 12px; margin-top: 12px; }');
  html.push('.foto-item { width: 47%; border:1px solid #d1d5db; border-radius:4px; overflow:hidden; background:#ffffff; page-break-inside: avoid; }');
  html.push('.foto-item .foto-frame { height: 210px; display:flex; align-items:center; justify-content:center; background:#f9fafb; border-bottom:1px solid #d1d5db; }');
  html.push('.foto-item .foto-frame img { max-width:100%; max-height:100%; width:auto; height:auto; object-fit:contain; display:block; }');
  html.push('.foto-item .legenda { font-size: 11px; color:#6b7280; padding:7px 8px; text-align:center; }');
  html.push('.assinaturas { display:flex; justify-content:space-around; margin-top: 50px; page-break-inside: avoid; }');
  html.push('.assinatura-item { text-align:center; width: 45%; }');
  html.push('.assinatura-item img, .assinatura-item svg { height: 65px; }');
  html.push('.assinatura-linha { border-top: 1px solid #1f2937; margin-top: 4px; padding-top: 4px; font-size: 11.5px; }');
  html.push('.rodape-aviso { margin-top: 34px; padding-top: 10px; border-top: 1px solid #d1d5db; font-size: 10.5px; color:#6b7280; }');
  html.push('.barra-imprimir { max-width: 900px; margin: 0 auto 12px; text-align: right; }');
  html.push('.barra-imprimir button { background:#0b4ea2; color:#fff; border:none; padding:10px 18px; border-radius:4px; font-weight:700; cursor:pointer; font-size:13px; }');
  html.push('@media print { body { background:#ffffff; } .folha { box-shadow:none; margin:0; padding:0; max-width:none; } .no-print { display:none !important; } }');
  html.push(SGO_DocA4_css_() + RelTecA4_css_({ titulo: 'Declaração de Execução de Serviço', numero: ctx.numeroDocumento || '', revisao: ctx.revisao || '00' }) + '</style></head><body>');

  html.push('<div class="barra-imprimir no-print"><button onclick="window.print()">Imprimir / Salvar como PDF</button></div>');
  html.push('<div class="folha">');

  html.push('<div class="topo">');
  if (logo && logo.data) {
    html.push('<img class="logo-topo" src="data:' + logo.mimeType + ';base64,' + logo.data + '" alt="Metrolabs">');
  } else {
    html.push('<div></div>');
  }
  html.push('<div class="titulo-doc"><h1>DECLARAÇÃO DE EXECUÇÃO DE SERVIÇO</h1><small>' + DeclExec_escaparHtml_(ctx.numeroDocumento || '—') + ' | ' + DeclExec_escaparHtml_(ctx.dataEmissao || '') + '</small></div>');
  html.push('</div>');

  html.push('<table class="dados">');
  html.push('<tr><td class="rotulo">Cliente</td><td>' + DeclExec_escaparHtml_(ctx.cliente) + '</td></tr>');
  html.push('<tr><td class="rotulo">Endereço</td><td>' + DeclExec_escaparHtml_(ctx.endereco || '—') + '</td></tr>');
  html.push('<tr><td class="rotulo">Equipamento</td><td>' + DeclExec_escaparHtml_(ctx.equipamentoLabel) + '</td></tr>');
  html.push('<tr><td class="rotulo">TAG</td><td>' + DeclExec_escaparHtml_(ctx.tag || '—') + '</td></tr>');
  html.push('<tr><td class="rotulo">Marca / Modelo</td><td>' + DeclExec_escaparHtml_((ctx.marca || '—') + ' / ' + (ctx.modelo || '—')) + '</td></tr>');
  html.push('<tr><td class="rotulo">Localização</td><td>' + DeclExec_escaparHtml_(ctx.localizacao || '—') + '</td></tr>');
  html.push('<tr><td class="rotulo">Período do atendimento</td><td>' + DeclExec_escaparHtml_(ctx.periodoLabel || '—') + '</td></tr>');
  html.push('<tr><td class="rotulo">Local do atendimento</td><td>' + DeclExec_escaparHtml_(ctx.localAtendimento === 'LABORATORIO' ? 'Laboratório da Metrolabs' : 'Instalações do cliente') + '</td></tr>');
  html.push('<tr><td class="rotulo">Técnico executor</td><td>' + DeclExec_escaparHtml_(ctx.tecnicoExecutor || '—') + '</td></tr>');
  html.push('<tr><td class="rotulo">Empresa executante</td><td>' + DeclExec_escaparHtml_(empresa.nome) + (empresa.cnpj ? (' — CNPJ ' + DeclExec_escaparHtml_(empresa.cnpj)) : '') + '</td></tr>');
  html.push('</table>');

  html.push('<div class="secao"><h2>Introdução</h2>');
  html.push(DeclExec_paragrafosHtml_(ctx.textos.introducao));
  html.push('</div>');

  html.push('<div class="secao"><h2>Metodologia</h2>');
  html.push(DeclExec_paragrafosHtml_(ctx.textos.metodologia));
  html.push('</div>');

  if (ctx.textos.calibracoes) {
    html.push('<div class="secao"><h2>Calibrações Realizadas</h2>');
    html.push(DeclExec_paragrafosHtml_(ctx.textos.calibracoes));
    html.push(DeclExec_montarSecaoCalibracoes_(ctx.calibracoes));
    html.push('</div>');
  }

  if (ctx.textos.qi) {
    html.push('<div class="secao"><h2>Qualificação de Instalação (QI)</h2>');
    html.push(DeclExec_paragrafosHtml_(ctx.textos.qi));
    html.push('</div>');
  }
  if (ctx.textos.qo) {
    html.push('<div class="secao"><h2>Qualificação de Operação (QO)</h2>');
    html.push(DeclExec_paragrafosHtml_(ctx.textos.qo));
    html.push('</div>');
  }
  if (ctx.textos.qd) {
    html.push('<div class="secao"><h2>Qualificação de Desempenho (QD)</h2>');
    html.push(DeclExec_paragrafosHtml_(ctx.textos.qd));
    html.push('</div>');
  }

  if (ctx.normas && ctx.normas.length) {
    html.push('<div class="secao"><h2>Referências Normativas</h2>');
    html.push('<p>' + ctx.normas.map(DeclExec_escaparHtml_).join('<br>') + '</p>');
    html.push('</div>');
  }

  if (ctx.fotos && ctx.fotos.length) {
    html.push('<div class="secao"><h2>Registros Fotográficos</h2>');
    html.push('<div class="fotos-grid">');
    ctx.fotos.forEach(function(f) {
      html.push('<div class="foto-item"><div class="foto-frame"><img src="data:' + f.mimeType + ';base64,' + f.base64 + '" alt="Foto"></div>' +
        (f.legenda ? ('<div class="legenda">' + DeclExec_escaparHtml_(f.legenda) + '</div>') : '') + '</div>');
    });
    html.push('</div>');
    html.push('</div>');
  }

  html.push('<div class="declaracao-box">');
  html.push(DeclExec_paragrafosHtml_(ctx.textos.declaracaoFinal));
  html.push('</div>');

  html.push('<div class="assinaturas">');
  var assinantes = (ctx.assinantesSelecionados && ctx.assinantesSelecionados.length) ? ctx.assinantesSelecionados : assinaturas;
  assinantes.forEach(function(a) {
    html.push('<div class="assinatura-item">');
    if (a.imagemSvg) html.push(a.imagemSvg);
    html.push('<div class="assinatura-linha"><strong>' + DeclExec_escaparHtml_(a.nome) + '</strong><br>' + DeclExec_escaparHtml_(a.cargo) + '<br>' + DeclExec_escaparHtml_(a.registro) + '</div>');
    html.push('</div>');
  });
  html.push('</div>');

  html.push('<div class="rodape-aviso">Este documento declara a execução do serviço técnico descrito acima, segundo a metodologia e o escopo relatados. Não constitui laudo, parecer ou resultado técnico de conformidade — o resultado técnico detalhado será apresentado em relatório específico, emitido separadamente.</div>');

  html.push('</div>');
  html.push('</body></html>');
  return html.join('\n');
}
