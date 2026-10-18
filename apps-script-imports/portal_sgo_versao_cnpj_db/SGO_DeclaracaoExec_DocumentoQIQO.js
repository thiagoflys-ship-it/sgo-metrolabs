function DeclExecQIQO_formatarMedicoes_(texto){return String(texto||"").replace(/(^|[^\w.,/])([+-]?(?:\d{1,3}(?:\.\d{3})+(?:,\d+)?|\d+(?:[.,]\d+)?)(?:[eE][+-]?\d+)?)\s*(°C|°F|%|rpm|RPM|mmHg|hPa|kPa|MPa|bar|mbar|kg|mg|g|ms|min|s|Hz|V|mA|A|W|mL|L)(?=$|[^A-Za-z])/g,function(all,prefixo,valor,unidade){var n=Number(valor.indexOf(",")>=0?valor.replace(/\./g,"").replace(",","."):/^[-+]?[1-9]\d{0,2}(?:\.\d{3})+$/.test(valor)?valor.replace(/\./g,""):valor);if(!isFinite(n))return all;/* Mínimo de 2 casas, sem nunca cortar casas que o valor já tem (antes "0,035 °C" de um certificado virava "0,04 °C") e com milhar pt-BR. */var milhar=valor.indexOf(",")<0&&/^[-+]?[1-9]\d{0,2}(?:\.\d{3})+$/.test(valor);var mDec=/[.,](\d+)(?:[eE][+-]?\d+)?$/.exec(valor);var dec=(!milhar&&mDec)?mDec[1].length:0;return prefixo+SGO_DocA4_num_(n,Math.max(2,Math.min(dec,6)))+" "+unidade})}function DeclExecQIQO_validarTextos_(textos){var resultado={};["introducao","objetivo","qiTexto","qoTexto","qdTexto","conclusao"].forEach(function(chave){var texto=String(textos[chave]||"").trim();if(/\b(?:aprovad[oa]s?|reprovad[oa]s?|apto|inapto)\b/i.test(texto))throw new Error("Remova o julgamento de aprovação do texto: "+chave+". A decisão cabe à qualidade do cliente.");resultado[chave]=DeclExecQIQO_formatarMedicoes_(texto)});return resultado}function DeclExecQIQO_escaparHtml_(s){return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}function DeclExecQIQO_paragrafosHtml_(texto){var partes=String(texto||"").split(/\n{2,}/).map(function(p){return p.trim()}).filter(Boolean);if(!partes.length)return"<p>-</p>";return partes.map(function(p){return"<p>"+DeclExecQIQO_escaparHtml_(p)+"</p>"}).join("\n")}
/* ---------- Relatório QI/QO/QD em A4 (padrão de 18/10/2026; peças comuns DeclExecA4_* em SGO_DeclaracaoExec_Documento.js) ---------- */

/* Texto que já passou pela conferência (sem veredito, medições pt-BR). */
function DeclExecQIQO_limpo_(texto) {
  return DeclExecQIQO_validarTextos_({ qiTexto: texto }).qiTexto;
}

/* Itens verificados de uma etapa: tabela com a observação do técnico (o achado aparece aqui, uma vez só). */
function DeclExecQIQO_montarTabelaItens_(itens) {
  var marcados = (itens || []).filter(function (it) { return it && it.marcado; });
  if (!marcados.length) return '';
  var temObs = marcados.some(function (it) { return it.observacao; });
  var colunas = [{ t: 'Item verificado' }].concat(temObs ? [{ t: 'Achado técnico registrado' }] : []);
  return SGO_DocA4_tabela_(colunas, marcados.map(function (it) {
    var l = [it.label || '—'];
    if (temObs) l.push(it.observacao ? { html: '<span class="obs">' + DeclExecQIQO_escaparHtml_(DeclExecQIQO_limpo_(it.observacao)) + '</span>' } : '—');
    return l;
  }));
}

/* Leitura padrão do certificado (sem IA): o texto da seção QD já diz o mesmo, então não se repete por instrumento. */
function DeclExecQIQO_leituraPadrao_(leitura) {
  return /^Certificado de calibração de .+ apresentado neste atendimento\./.test(String(leitura || '').trim());
}

/*
 * QD: "Tabela N — Certificados de calibração" (instrumento e situação) e, logo depois, só as
 * imagens dos certificados anexados, em figuras numeradas de altura limitada, com a leitura
 * do certificado (quando não for a leitura padrão) e a observação do técnico.
 */
function DeclExecQIQO_montarCertificadosQD_(certificados, num) {
  var lista = certificados || [];
  if (!lista.length) return '';
  var nFig = num.proximaFigura();
  var figuras = [];
  var temObs = lista.some(function (c) { return c.temCertificado && c.observacao; });
  var linhas = lista.map(function (c) {
    var situacao;
    if (c.temCertificado) {
      if (!String(c.leituraIA || '').trim()) throw new Error('Leitura QD ausente para ' + c.label + '.');
      var ehImagem = c.mimeType && c.mimeType.indexOf('image/') === 0 && c.base64;
      if (ehImagem) {
        situacao = 'Anexado (Figura ' + (nFig + figuras.length) + ')';
        figuras.push(c);
      } else {
        situacao = c.mimeType === 'application/pdf' ? 'Anexado (arquivo PDF, não reproduzido neste documento)' : 'Anexado';
        if (!DeclExecQIQO_leituraPadrao_(c.leituraIA)) figuras.push(Object.assign({}, c, { semImagem: true }));
      }
    } else {
      situacao = 'Não anexado nesta visita';
    }
    var l = [c.label || '—', { html: c.temCertificado ? '<span class="ok-txt">' + DeclExecQIQO_escaparHtml_(situacao) + '</span>' : '<span class="info-txt">' + situacao + '</span>' }];
    if (temObs) l.push(c.temCertificado && c.observacao ? DeclExecQIQO_limpo_(c.observacao) : '—');
    return l;
  });
  var h = [num.tabela('Certificados de calibração dos instrumentos'),
    SGO_DocA4_tabela_([{ t: 'Instrumento' }, { t: 'Situação' }].concat(temObs ? [{ t: 'Observação do técnico' }] : []), linhas)];
  figuras.forEach(function (c) {
    var leitura = DeclExecQIQO_leituraPadrao_(c.leituraIA) ? '' : DeclExecQIQO_validarTextos_({ qdTexto: c.leituraIA }).qdTexto;
    var textoLeitura = leitura ? '<p class="interp"><b>Leitura do certificado de ' + DeclExecQIQO_escaparHtml_(c.label) + ':</b> ' + DeclExecQIQO_escaparHtml_(leitura) + '</p>' : '';
    if (c.semImagem) { h.push(textoLeitura); return; }
    var mime = /^image\/(png|jpe?g|gif|webp)$/i.test(String(c.mimeType || '')) ? c.mimeType : 'image/jpeg';
    h.push('<div class="de-cert">' + num.figura('<div class="q"><img src="data:' + mime + ';base64,' + String(c.base64).replace(/[^A-Za-z0-9+\/=]/g, '') + '" alt="Certificado de calibração"></div>',
      'Certificado de calibração: ' + c.label) + '</div>' + textoLeitura);
  });
  return h.join('\n');
}

/**
 * @param {Object} ctx ver DeclExec_apiMontarDocumentoQIQO (SGO_DeclaracaoExec_Main.js)
 * @param {Object} opcoes { sumario: bool } — marcador do sumário (documento com mais de 3 páginas)
 */
function DeclExecQIQO_montarDocumentoHtml_(ctx, opcoes) {
  opcoes = opcoes || {};
  ctx.textos = DeclExecQIQO_validarTextos_(ctx.textos || {});
  var t = ctx.textos;
  var temCertificadoQD = !!(ctx.usaQD && (ctx.certificadosQD || []).some(function (c) { return c.temCertificado; }));
  var etapas = ['instalação'].concat(ctx.usaQO ? ['operação'] : []).concat(temCertificadoQD ? ['desempenho'] : []);
  var titulo = 'Relatório de qualificação de ' + (etapas.length > 1 ? etapas.slice(0, -1).join(', ') + ' e ' + etapas[etapas.length - 1] : etapas[0]);
  var siglas = ['QI'].concat(ctx.usaQO ? ['QO'] : []).concat(temCertificadoQD ? ['QD'] : []).join('/');
  var num = RelTecA4_numerador_();
  var sec = DeclExecA4_secoes_();
  var html = [];
  html.push(DeclExecA4_inicio_({
    tituloCurto: 'Relatório de qualificação (' + siglas + ')', titulo: titulo,
    subtitulo: [ctx.equipamentoLabel, ctx.tag ? 'TAG ' + ctx.tag : ''].filter(Boolean).join(' — '),
    numero: ctx.numeroDocumento, revisao: ctx.revisao
  }));

  // Quadro de resultado (só na abertura): registro com ou sem achado técnico; nunca aprovação/reprovação.
  var achados = (ctx.itensQI || []).concat(ctx.itensQO || []).filter(function (it) { return it.marcado && it.observacao; }).length;
  html.push(SGO_DocA4_quadroResultado_(achados
    ? { classe: 'achado', rotulo: 'Situação do registro', valor: 'Executado com achado técnico registrado', texto: (achados === 1 ? 'Um item tem achado técnico' : achados + ' itens têm achado técnico') + ', descrito na tabela da etapa correspondente. A avaliação cabe ao setor de qualidade do cliente.' }
    : { classe: 'info', rotulo: 'Situação do registro', valor: 'Executado sem achado técnico registrado', texto: 'Nenhum item verificado tem achado técnico registrado.' }));
  if (opcoes.sumario) html.push(RelTecA4_sumario_());

  html.push(sec.h2('Identificação'));
  html.push(DeclExecA4_identificacao_(ctx));

  html.push(sec.h2('Introdução'));
  html.push(DeclExecQIQO_paragrafosHtml_(t.introducao));
  html.push(sec.h2('Objetivo'));
  html.push(DeclExecQIQO_paragrafosHtml_(t.objetivo));

  html.push(sec.h2('Qualificação de instalação (QI)'));
  html.push(DeclExecQIQO_paragrafosHtml_(t.qiTexto));
  var tabQI = DeclExecQIQO_montarTabelaItens_(ctx.itensQI);
  if (tabQI) html.push(num.tabela('Itens verificados na qualificação de instalação') + tabQI);
  var fotosQI = DeclExecA4_fotos_(ctx.fotosQI, num, 'Registro fotográfico da QI', DeclExecQIQO_limpo_);
  if (fotosQI) { html.push(sec.h3('Registro fotográfico')); html.push(fotosQI); }

  if (ctx.usaQO) {
    html.push(sec.h2('Qualificação de operação (QO)'));
    html.push(DeclExecQIQO_paragrafosHtml_(t.qoTexto));
    var tabQO = DeclExecQIQO_montarTabelaItens_(ctx.itensQO);
    if (tabQO) html.push(num.tabela('Itens verificados na qualificação de operação') + tabQO);
    var fotosQO = DeclExecA4_fotos_(ctx.fotosQO, num, 'Registro fotográfico da QO', DeclExecQIQO_limpo_);
    if (fotosQO) { html.push(sec.h3('Registro fotográfico')); html.push(fotosQO); }
  }

  if (temCertificadoQD) {
    html.push(sec.h2('Qualificação de desempenho (QD)'));
    html.push(DeclExecQIQO_paragrafosHtml_(t.qdTexto));
    html.push(DeclExecQIQO_montarCertificadosQD_(ctx.certificadosQD, num));
  }

  if (ctx.normas && ctx.normas.length) {
    html.push(sec.h2('Referências normativas'));
    html.push(DeclExecA4_normas_(ctx.normas));
  }

  // Conclusão, nota e assinaturas juntas; a nota só diz o que a conclusão não diz.
  html.push(DeclExecA4_fecho_(sec, 'Conclusão', t.conclusao, ctx,
    temCertificadoQD ? 'As datas de próxima calibração são as informadas nos próprios certificados; este relatório não define intervalos de calibração.' : ''));

  html.push('</main></body></html>');
  return html.join('\n');
}
