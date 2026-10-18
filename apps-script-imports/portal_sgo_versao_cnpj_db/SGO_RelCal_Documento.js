function RelCalDoc_escaparHtml_(s){return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}function RelCalDoc_paragrafosHtml_(texto){var partes=String(texto||"").split(/\n{2,}/).map(function(p){return p.trim()}).filter(Boolean);if(!partes.length)return"<p>-</p>";return partes.map(function(p){return"<p>"+RelCalDoc_escaparHtml_(RelCalDoc_formatarProsaMedicoes_(p))+"</p>"}).join("\n")}function RelCalDoc_formatarProsaMedicoes_(texto){return String(texto||"").replace(/(\b(?:tendência|incerteza(?: expandida)?|rotação|temperatura|pressão|massa|tempo|leitura|indicação|média|U95|U)\s*(?:(?:de|igual a|é)\s+|[:=]\s*)?)([+-]?(?:\d{1,3}(?:\.\d{3})+,\d+|\d+(?:[.,]\d+)?)(?:[eE][+-]?\d+)?\s*(?:°C|ºC|%UR|rpm|mmHg|kPa|hPa|Pa|kg|mg|g|min|s|Hz|%))(?=$|[^\w–—-])/gi,function(_,prefixo,valor){return prefixo+RelCalDoc_formatarMedicao_(valor)})}function RelCalDoc_ehCelulaNumerica_(s){return/^-?\d+([.,]\d+)?$/.test(String(s||"").trim())}function RelCalDoc_splitCelulas_(linha){return linha.split(" | ").map(function(c){return c.trim()})}function RelCalDoc_veff_(valor){return CertCalCalculo.formatarVeff(String(valor==null?"":valor).trim())}function RelCalDoc_formatarMedicao_(valor){var s=String(valor||"").trim();var m=s.match(/^([+-]?(?:\d{1,3}(?:\.\d{3})+,\d+|\d+(?:[.,]\d+)?)(?:[eE][+-]?\d+)?)(\s*(?:°C|ºC|%UR|%|rpm|mmHg|Pa|kPa|hPa|g|kg|mg|s|min|Hz))?$/i);if(!m)return s;var numeral=m[1].indexOf(",")!==-1?m[1].replace(/\./g,"").replace(",","."):m[1];var n=Number(numeral);if(!isFinite(n)||Math.abs(n)>=1e21)return s;return(Math.abs(n)<.005?0:n).toFixed(2).replace(".",",")+(m[2]||"")}
/* ============================================================
 * Relatório de calibração em A4 retrato (padrão de 18/10/2026,
 * docs/DOCUMENTOS_PADRAO_A4_20261018.md): estilos da SGO_DocA4, cabeçalho e
 * rodapé corridos da SGO_RelTecA4, seções numeradas, tabelas e figuras
 * numeradas, normas listadas uma vez, fecho (conclusão, nota de escopo e
 * assinaturas) na mesma folha.
 * ============================================================ */

/**
 * Texto dos resultados (IA ou padrão): linhas com " | " viram tabela numerada ("Tabela N —"),
 * a linha "[CERTIFICADO: peça]" abre uma subseção da peça (secao.N), o resto vira parágrafo.
 */
function RelCalDoc_renderizarResultados_(texto, secao, num) {
  var linhas = String(texto || '').replace(/\r\n/g, '\n').split('\n');
  var html = [], bufferProsa = [], bufferTabela = [], colunasAtual = null, nPeca = 0, pecaAtual = '';
  function flushProsa() {
    if (!bufferProsa.length) return;
    var paragrafo = bufferProsa.join(' ').trim();
    if (paragrafo) html.push('<p>' + RelCalDoc_escaparHtml_(RelCalDoc_formatarProsaMedicoes_(paragrafo)) + '</p>');
    bufferProsa = [];
  }
  function flushTabela() {
    if (!bufferTabela.length) return;
    var linhasCelulas = bufferTabela.map(RelCalDoc_splitCelulas_);
    var temCabecalho = linhasCelulas.length > 0 && linhasCelulas[0].length > 0 && !RelCalDoc_ehCelulaNumerica_(linhasCelulas[0][0]);
    var cabecalho = temCabecalho ? linhasCelulas[0] : null;
    var corpo = temCabecalho ? linhasCelulas.slice(1) : linhasCelulas;
    var t = [];
    if (num) t.push(num.tabela('Resultados transcritos do certificado' + (pecaAtual ? ' — ' + pecaAtual : '')));
    t.push('<table class="t compacta relcal-res">');
    if (cabecalho) t.push('<thead><tr>' + cabecalho.map(function (c, i) { return '<th' + (i ? ' class="num"' : '') + '>' + RelCalDoc_escaparHtml_(c) + '</th>'; }).join('') + '</tr></thead>');
    if (corpo.length) {
      t.push('<tbody>' + corpo.map(function (linhaCelulas) {
        return '<tr>' + linhaCelulas.map(function (c, i) {
          var coluna = cabecalho && cabecalho[i] || '';
          if (/^(veff|graus de liberdade)/i.test(coluna)) c = RelCalDoc_veff_(c);
          else if (/^(nominal|referência|padrão|indicação|valor medido|leitura|ensaio|média|tendência|incerteza|u95|fator|k$|veff|erro|módulo da tendência|\|tendência\|)/i.test(coluna)) c = RelCalDoc_formatarMedicao_(c);
          return '<td' + (i ? ' class="num"' : '') + '>' + RelCalDoc_escaparHtml_(c === '' ? '—' : c) + '</td>';
        }).join('') + '</tr>';
      }).join('') + '</tbody>');
    }
    t.push('</table>');
    html.push(t.join(''));
    bufferTabela = [];
    colunasAtual = null;
  }
  linhas.forEach(function (linhaBruta) {
    var linha = linhaBruta.trim();
    if (!linha) { flushProsa(); flushTabela(); return; }
    var mc = /^\[CERTIFICADO:\s*(.+?)\s*\]$/i.exec(linha);
    if (mc) {
      flushProsa(); flushTabela();
      pecaAtual = mc[1]; nPeca++;
      html.push('<h3>' + (secao ? '<span class="n">' + secao + '.' + nPeca + '</span> ' : '') + 'Certificado da peça ' + RelCalDoc_escaparHtml_(pecaAtual) + '</h3>');
      return;
    }
    if (linha.indexOf(' | ') !== -1) {
      flushProsa();
      var nColunas = RelCalDoc_splitCelulas_(linha).length;
      if (colunasAtual !== null && nColunas !== colunasAtual) flushTabela();
      colunasAtual = nColunas;
      bufferTabela.push(linha);
    } else {
      flushTabela();
      bufferProsa.push(linha);
    }
  });
  flushProsa();
  flushTabela();
  return html.join('\n');
}

/** Certificados anexados em imagem viram figuras numeradas; PDF vira nota. */
function RelCalDoc_montarCertificados_(certificados, num) {
  if (!certificados || !certificados.length) return '';
  var varios = certificados.length > 1, figs = [], notas = [];
  certificados.forEach(function (c) {
    if (c.temCertificado && c.mimeType && c.mimeType.indexOf('image/') === 0 && c.base64) {
      var mime = /^image\/(png|jpe?g|gif|webp)$/i.test(c.mimeType) ? c.mimeType : 'image/png';
      var img = '<img src="data:' + mime + ';base64,' + String(c.base64).replace(/[^A-Za-z0-9+\/=]/g, '') + '" alt="Certificado de calibração ' + RelCalDoc_escaparHtml_(c.label || '') + '">';
      var fig = num.figura(img, 'Certificado de calibração anexado' + (c.label ? ' (' + c.label + ')' : ''));
      figs.push(fig.replace('<figure class="reltec-fig">', '<figure class="reltec-fig relcal-cert">'));
    } else if (c.temCertificado && c.mimeType === 'application/pdf') {
      notas.push('Certificado ' + (varios ? 'da peça ' + (c.label || c.codigo) + ' ' : '') + 'anexado em PDF; o arquivo original acompanha este relatório e não é reproduzido aqui.');
    }
  });
  var h = notas.length ? '<p class="nota">' + notas.map(RelCalDoc_escaparHtml_).join(' ') + '</p>' : '';
  if (figs.length) h += '<div class="relcal-certs' + (figs.length > 1 ? ' dois' : '') + '">' + figs.join('') + '</div>';
  return h;
}

/** Fotos do atendimento como figuras numeradas; a análise da imagem (quando houver) fica na legenda. */
function RelCalDoc_montarFotos_(fotos, num) {
  if (!fotos || !fotos.length) return '';
  return '<div class="relcal-fotos">' + fotos.map(function (f, i) {
    var mime = /^image\/(png|jpe?g|gif|webp)$/i.test(String(f.mimeType || '')) ? f.mimeType : 'image/jpeg';
    var img = '<div class="q"><img src="data:' + mime + ';base64,' + String(f.base64 || '').replace(/[^A-Za-z0-9+\/=]/g, '') + '" alt="Foto ' + (i + 1) + '"></div>';
    var leg = f.legendaTecnico || ('Registro fotográfico ' + (i + 1));
    var fig = num.figura(img, leg);
    if (f.legendaIA) fig = fig.replace('</figcaption>', '<br>Análise da imagem: ' + RelCalDoc_escaparHtml_(RelCalDoc_formatarProsaMedicoes_(f.legendaIA)) + '</figcaption>');
    return fig;
  }).join('') + '</div>';
}

/** Separa o último parágrafo, que entra no fecho junto da nota e das assinaturas. */
function RelCalDoc_dividirUltimo_(texto) {
  var partes = String(texto || '').split(/\n{2,}/).map(function (p) { return p.trim(); }).filter(Boolean);
  if (!partes.length) return { antes: '', ultimo: '' };
  var ultimo = partes.pop();
  return { antes: partes.join('\n\n'), ultimo: ultimo };
}

function RelCalDoc_cnpjFormatado_(c) {
  var d = String(c || '').replace(/\D/g, '');
  return d.length === 14 ? d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5') : '';
}

function RelCalDoc_montarDocumentoHtml_(ctx) {
  var cfg = typeof CadeiaFrioRel_CFCFG !== 'undefined' ? CadeiaFrioRel_CFCFG : {};
  var empresa = cfg.EMPRESA_EXECUTANTE || { nome: 'Metrolab Soluções em Engenharia Clínica LTDA', cnpj: '' };
  var assinaturas = cfg.ASSINATURAS_PADRAO || [];
  var esc = RelCalDoc_escaparHtml_;
  var titulo = 'Relatório de calibração';
  var numero = ctx.numeroDocumento || '';
  var revisao = RelTecA4_revisao_(ctx.revisao);
  var empresaTxt = empresa.nome + (empresa.cnpj ? ' — CNPJ ' + empresa.cnpj : '');
  var num = RelTecA4_numerador_();
  var localCal = ctx.localCalibracao === 'CLIENTE'
    ? 'Instalações do cliente (informado no formulário; confira no certificado de origem)'
    : 'Laboratório (informado no formulário; confira no certificado de origem)';
  var cnpjCli = RelCalDoc_cnpjFormatado_(ctx.cnpjCliente);
  var css = SGO_DocA4_estilos_({ titulo: titulo, tituloCurto: titulo, numero: numero, revisao: revisao, empresa: { nome: empresa.nome, cnpj: empresa.cnpj } }) +
    RelTecA4_css_({ titulo: titulo, numero: numero, revisao: revisao, empresa: empresaTxt }) +
    '.rc-abertura{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:.8pt solid #0b3d6e;padding-bottom:2.4mm;margin:0 0 4.5mm}' +
    '.rc-abertura img{height:13mm;width:auto;display:block}.rc-abertura .meta{text-align:right;font-size:8pt;line-height:1.4;color:#3e4c59}.rc-abertura .meta b{color:#1f2933}' +
    'h2 .n,h3 .n{display:inline-block;min-width:7mm}' +
    'table.ident th{width:21%}table.ident td{width:29%}' +
    'table.relcal-res td,table.relcal-res th{font-size:7.8pt;padding:.7mm 1.3mm}table.relcal-res thead th{white-space:normal;vertical-align:bottom}table.relcal-res td{white-space:nowrap}' +
    '.relcal-certs{display:flex;gap:6mm;justify-content:center;flex-wrap:wrap}' +
    '.relcal-cert{flex:0 1 auto;margin:2mm 0 3mm}' +
    '.relcal-cert img{display:block;margin:0 auto;max-width:100%;max-height:118mm;width:auto;height:auto;border:.5pt solid #bcc5cf}' +
    '.relcal-certs.dois .relcal-cert{flex:0 1 84mm}.relcal-certs.dois .relcal-cert img{max-height:105mm}' +
    '.relcal-cert figcaption{text-align:center}' +
    '.relcal-fotos{display:flex;flex-wrap:wrap;gap:0 6mm}.relcal-fotos figure{flex:1 1 80mm;margin:1mm 0 3mm}' +
    '.relcal-fotos .q{height:62mm;display:flex;align-items:center;justify-content:center;background:#fafbfc;border:.5pt solid #bcc5cf}' +
    '.relcal-fotos .q img{max-width:100%;max-height:62mm;display:block}' +
    'ul.normas{margin:0 0 2.4mm 4.5mm;padding:0}ul.normas li{margin:0 0 1.1mm;text-align:left;hyphens:manual}' +
    '.reltec-fecho .nota{margin-top:2.6mm;text-align:justify}';
  var h = [];
  h.push('<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">');
  // Dados para a gravação na pasta do cliente (RelCal_apiSalvarDocumento); não aparecem no papel.
  h.push('<meta name="sgo-numero" content="' + esc(numero) + '"><meta name="sgo-cnpj" content="' + esc(String(ctx.cnpjCliente || '').replace(/\D/g, '')) + '">');
  h.push('<title>' + esc(titulo + (numero ? ' nº ' + numero : '')) + '</title><style>' + css + '</style></head><body>');
  h.push('<div class="barra-tela"><button type="button" onclick="window.print()">Imprimir ou salvar em PDF</button></div><main class="folha">');
  h.push('<header class="rc-abertura"><img src="' + SGO_DocA4_logoDataUri_() + '" alt="Metrolabs"><div class="meta"><b>Nº ' + esc(numero || '—') + '</b> · Revisão ' + esc(revisao) + '<br>Emissão ' + esc(ctx.dataEmissao || '—') + '</div></header>');
  h.push('<h1>' + titulo + '</h1><p class="subtitulo">' + esc(ctx.instrumentoLabel || '') + (ctx.tag ? ' · TAG ' + esc(ctx.tag) : '') + '</p>');

  var s = 0;
  // 1. Identificação (uma tabela só)
  h.push('<section><h2><span class="n">' + (++s) + '.</span> Identificação</h2>');
  h.push(SGO_DocA4_tabelaIdent_([
    ['Cliente', (ctx.cliente || '—') + (cnpjCli ? ' — CNPJ ' + cnpjCli : ''), { largo: true }],
    ['Endereço', ctx.endereco, { largo: true }],
    ['Instrumento', ctx.instrumentoLabel], ['TAG', ctx.tag],
    ['Marca / modelo', (ctx.marca || '—') + ' / ' + (ctx.modelo || '—')], ['Localização habitual', ctx.localizacao],
    ['Data da calibração', ctx.dataCalibracao], ['Técnico responsável', ctx.tecnicoResponsavel],
    ['Local da calibração', localCal, { largo: true }],
    ['Empresa emitente', empresaTxt, { largo: true }]
  ]));
  h.push('</section>');

  // 2. Introdução
  h.push('<section><h2><span class="n">' + (++s) + '.</span> Introdução</h2>' + RelCalDoc_paragrafosHtml_(ctx.textos.introducao) + '</section>');

  // 3. Resultados: texto e tabelas transcritas; depois, o certificado anexado como figura
  var secRes = ++s;
  h.push('<section><h2><span class="n">' + secRes + '.</span> Resultados da calibração</h2>');
  var ausentes = (ctx.certificados || []).filter(function (c) { return !c.temCertificado; });
  if (ausentes.length) h.push('<p><b>Escopo parcial:</b> não foi anexado certificado para ' + ausentes.map(function (c) { return esc(c.label || c.codigo); }).join('; ') + '. Este relatório não apresenta resultados para essas peças e não comprova a calibração de todos os componentes do instrumento.</p>');
  h.push(RelCalDoc_renderizarResultados_(ctx.textos.resultadosExplicados, secRes, num));
  var comImagem = (ctx.certificados || []).filter(function (c) { return c.temCertificado && c.base64 && String(c.mimeType || '').indexOf('image/') === 0; }).length;
  if (comImagem) {
    var f1 = num.proximaFigura(), fN = f1 + comImagem - 1;
    h.push('<p>' + (comImagem === 1 ? 'A Figura ' + f1 + ' reproduz o certificado anexado.' : 'As Figuras ' + f1 + (comImagem === 2 ? ' e ' : ' a ') + fN + ' reproduzem os certificados anexados.') + '</p>');
  }
  h.push(RelCalDoc_montarCertificados_(ctx.certificados, num));
  h.push('</section>');

  // Registro fotográfico (opcional)
  var fotos = RelCalDoc_montarFotos_(ctx.fotos, num);
  if (fotos) h.push('<section><h2><span class="n">' + (++s) + '.</span> Registro fotográfico</h2>' + fotos + '</section>');

  // Referências normativas: listadas uma única vez no documento
  if (ctx.normas && ctx.normas.length) {
    h.push('<section><h2><span class="n">' + (++s) + '.</span> Referências normativas</h2><ul class="normas">' + ctx.normas.map(function (n) { return '<li>' + esc(n) + '</li>'; }).join('') + '</ul></section>');
  }

  // Conclusão: o último parágrafo, a nota de escopo e as assinaturas ficam juntos na mesma folha
  var conc = RelCalDoc_dividirUltimo_(ctx.textos.conclusao);
  h.push('<section><h2><span class="n">' + (++s) + '.</span> Conclusão e responsabilidade técnica</h2>');
  if (conc.antes) h.push(RelCalDoc_paragrafosHtml_(conc.antes));
  h.push('<div class="reltec-fecho">' + (conc.ultimo ? RelCalDoc_paragrafosHtml_(conc.ultimo) : '') +
    '<p class="nota">Este relatório interpreta exclusivamente os certificados anexados. Não declara a execução de uma nova calibração, não estabelece validade ou intervalo de recalibração e não emite declaração de conformidade. A decisão de uso e a definição da periodicidade cabem ao contratante, por meio do seu setor de qualidade ou de responsável designado.</p>' +
    SGO_DocA4_assinaturas_(assinaturas) + '</div></section>');
  h.push('</main></body></html>');
  return h.join('\n');
}
