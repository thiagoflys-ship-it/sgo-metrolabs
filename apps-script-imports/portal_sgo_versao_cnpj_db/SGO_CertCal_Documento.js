function CertCalDoc_escaparHtml_(s){return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}function CertCalDoc_num_(v, casas) {
  if (v === null || v === undefined || typeof v === "boolean" || String(v).trim() === "") return "\u2014";
  var n = typeof v === "number" ? v : Number(String(v).indexOf(",") >= 0 ? String(v).replace(/\./g, "").replace(",", ".") : v);
  if (!isFinite(n)) return "\u2014";
  var c = (casas === undefined || casas === null || isNaN(Number(casas))) ? 2 : Math.max(0, Math.min(8, Math.floor(Number(casas))));
  var txt = SGO_DocA4_num_(n, c);
  return /^-0(,0+)?$/.test(txt) ? txt.slice(1) : txt;
}
/** Casas decimais de um bloco: no mínimo 2, as da resolução do instrumento e as necessárias para
 *  exprimir a menor incerteza expandida com dois algarismos significativos (máximo 6). */
function CertCalDoc_casasBloco_(bloco) {
  var casas = 2;
  var res = Number(bloco && bloco.resolucao);
  if (isFinite(res) && res > 0) casas = Math.max(casas, Math.min(6, Math.max(0, -Math.floor(Math.log10(res) + 1e-9))));
  (bloco && bloco.resultados || []).forEach(function (r) {
    var u = Number(r.incertezaU95);
    if (isFinite(u) && u > 0) casas = Math.max(casas, Math.min(6, 1 - Math.floor(Math.log10(u) + 1e-9)));
  });
  return casas;
}
function CertCalDoc_veff_(v){return CertCalCalculo.formatarVeff(v)}function CertCalDoc_dataHora_(v){var s=String(v==null?"":v).trim();if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(s))return s;var d=new Date(s);if(!isFinite(d.getTime()))return s;try{return Utilities.formatDate(d,Session.getScriptTimeZone()||"America/Sao_Paulo","dd/MM/yyyy HH:mm")}catch(e){return s}}function CertCalDoc_assinaturasAprovadores_(assinaturasPadrao){return(assinaturasPadrao||[]).filter(function(a){var nome=String(a.nome||"").toLowerCase();return nome.indexOf("charles")!==-1||nome.indexOf("douglas")!==-1})}function CertCalDoc_capturarDocumento_(sessao){var cfg=typeof CadeiaFrioRel_CFCFG!=="undefined"?CadeiaFrioRel_CFCFG:{};return JSON.parse(JSON.stringify({schemaVersion:1,templateVersion:"certcal-20261018.1",textosVersion:"certcal-20261017.1",emitidoEm:(new Date).toISOString(),emissor:{userId:sessao.userId||"",usuario:sessao.usuario||"",nome:sessao.nome||""},empresa:cfg.EMPRESA_EXECUTANTE||{nome:"Metrolab Soluções em Engenharia Clínica LTDA",cnpj:"",site:"",telefone:"",endereco:""},logo:cfg.LOGO_BASE64||null,assinaturas:CertCalDoc_assinaturasAprovadores_(cfg.ASSINATURAS_PADRAO||[]),textos:{semData:CERTCAL_CFG.PROXIMA_CALIBRACAO_SEM_DATA,comData:CERTCAL_CFG.PROXIMA_CALIBRACAO_COM_DATA,observacoes:CERTCAL_CFG.OBSERVACOES,probabilidade:CERTCAL_CFG.PROBABILIDADE_ABRANGENCIA_TEXTO}}))}function CertCalDoc_configuracao_(ctx){if(ctx.documento){var d=ctx.documento;if(d.schemaVersion!==1||!d.empresa||!d.textos||!Array.isArray(d.textos.observacoes)||!Array.isArray(d.assinaturas)){throw new Error("Snapshot documental incompleto ou versão não suportada. Emissão bloqueada.")}return d}return CertCalDoc_capturarDocumento_({})}

/* ============================================================
 * Certificado de calibração e relatório interpretativo (A4)
 * Padrão de 18/10/2026 (docs/DOCUMENTOS_PADRAO_A4_20261018.md): seções numeradas,
 * "Tabela N —" acima das tabelas de resultado, "Figura N —" abaixo dos gráficos,
 * identificação numa tabela só, cada informação uma vez, fecho com as assinaturas.
 * A moldura (cabeçalho e rodapé corridos, margens) vem de RelTecA4_css_.
 * ============================================================ */

/** Casas decimais da resolução (0,1 → 1; 1 → 0). */
function CertCalDoc_casasResolucao_(res) {
  return Math.max(0, Math.min(6, -Math.floor(Math.log10(res) + 1e-9)));
}

/** Numerador de tabelas e figuras (moldura RelTecA4; sem ela, numeração local equivalente). */
function CertCalDoc_numerador_() {
  if (typeof RelTecA4_numerador_ === 'function') return RelTecA4_numerador_();
  var t = 0, f = 0;
  return {
    proximaTabela: function () { return t + 1; },
    proximaFigura: function () { return f + 1; },
    tabela: function (texto) { t++; return '<p class="reltec-leg"><b>Tabela ' + t + '</b>' + (texto ? ' — ' + CertCalDoc_escaparHtml_(texto) : '') + '</p>'; },
    figura: function (svg, texto) { if (!svg) return ''; f++; return '<figure class="reltec-fig">' + svg + '<figcaption><b>Figura ' + f + '</b>' + (texto ? ' — ' + CertCalDoc_escaparHtml_(texto) : '') + '</figcaption></figure>'; }
  };
}

/** Contador de seções: secao('Identificação') → <h2>1. Identificação</h2>; sub('…') → <h3>1.1 …</h3>. */
function CertCalDoc_secoes_() {
  var n = 0, m = 0;
  return {
    secao: function (titulo, classe) { n++; m = 0; return '<h2' + (classe ? ' class="' + classe + '"' : '') + '>' + n + '. ' + CertCalDoc_escaparHtml_(titulo) + '</h2>'; },
    sub: function (titulo) { m++; return '<h3>' + n + '.' + m + ' ' + CertCalDoc_escaparHtml_(titulo) + '</h3>'; },
    atual: function () { return n; }
  };
}

function CertCalDoc_montarTabelaResultados_(bloco, documento, numerador, resumida) {
  var c = CertCalDoc_casasBloco_(bloco);
  var un = CertCalDoc_escaparHtml_(bloco.unidade);
  var nL = bloco.numLeituras || 0;
  var h = [];
  if (numerador) h.push(numerador.tabela('Resultados da calibração — ' + bloco.titulo + ' (' + bloco.unidade + ')'));
  h.push('<div class="tabela-wrap"><table class="tabela-resultados' + (nL > 5 ? ' compacta' : '') + '">');
  h.push('<thead><tr><th>Valor de referência</th>' + Array.from({ length: nL }, function (_, i) {
    return '<th>Leitura ' + (i + 1) + '</th>';
  }).join('') + '<th>Média</th><th>Tendência</th><th>U95</th><th>k</th><th>Veff</th><th>|Tendência| + U95</th></tr></thead>');
  h.push('<tbody>');
  bloco.resultados.forEach(function (r) {
    h.push('<tr>');
    h.push('<td class="num">' + CertCalDoc_num_(r.nominal, c) + '</td>');
    for (var i = 0; i < nL; i++) {
      h.push('<td class="num">' + (r.leituras[i] !== undefined ? CertCalDoc_num_(r.leituras[i], c) : '—') + '</td>');
    }
    h.push('<td class="num">' + CertCalDoc_num_(r.media, c) + '</td>');
    h.push('<td class="num">' + CertCalDoc_num_(r.tendencia, c) + '</td>');
    h.push('<td class="num">' + CertCalDoc_num_(r.incertezaU95, c) + '</td>');
    h.push('<td class="num">' + CertCalDoc_num_(r.k, 2) + '</td>');
    h.push('<td class="num">' + CertCalDoc_veff_(r.veff) + '</td>');
    h.push('<td class="num">' + CertCalDoc_num_(r.erroMaximo, c) + '</td>');
    h.push('</tr>');
  });
  h.push('</tbody></table></div>');
  h.push('<p class="nota-tabela">Valores em ' + un + (resumida ? '.' : '; k (fator de abrangência) e Veff (graus de liberdade efetivos) são adimensionais. Definições na seção Observações.') + '</p>');
  return h.join('');
}

function CertCalDoc_componentesPonto_(r) {
  var comp = (r.memoriaCalculo && r.memoriaCalculo.componentes) || [];
  var uA = 0, uRes = 0, somaPad = 0, temRes = false;
  comp.forEach(function (x) {
    var u = Number(x.incertezaPadrao) || 0;
    if (x.tipo === 'A') uA = u;
    else if (/^Resolu/.test(String(x.origem || ''))) { uRes = u; temRes = true; }
    else somaPad += u * u;
  });
  return { uA: uA, uRes: uRes, temRes: temRes, uPad: Math.sqrt(somaPad) };
}

function CertCalDoc_montarFontesIncerteza_(bloco, documento, numerador, resumida) {
  var c = CertCalDoc_casasBloco_(bloco);
  var cu = Math.min(c + 1, 7);
  var un = CertCalDoc_escaparHtml_(bloco.unidade);
  var res = Number(bloco.resolucao);
  var temRes = isFinite(res) && res > 0;
  var nLeit = bloco.numLeituras || 3;
  var nPorPonto = numerador ? numerador.proximaTabela() + 1 : 0;
  var h = [];
  if (numerador) h.push(numerador.tabela('Orçamento de incerteza — ' + bloco.titulo + ': componentes'));
  h.push('<div class="tabela-wrap"><table class="tabela-fontes">');
  h.push('<thead><tr><th>Fonte de incerteza</th><th>Tipo</th><th>Distribuição</th><th>Valor de origem</th><th>Divisor</th><th>Incerteza-padrão (u)</th><th>Graus de liberdade</th></tr></thead><tbody>');
  h.push('<tr><td class="txt">Repetibilidade das leituras</td><td>A</td><td>t de Student</td><td class="txt">s das ' + nLeit + ' leituras</td><td>√' + nLeit + '</td><td class="txt">por ponto' + (nPorPonto ? ' (Tabela ' + nPorPonto + ')' : '') + '</td><td class="num">' + Math.max(nLeit - 1, 1) + '</td></tr>');
  (bloco.fontesIncerteza || []).forEach(function (f) {
    var u = Number(f.incertezaU95) / Number(f.fatorK);
    h.push('<tr><td class="txt">Padrão ' + CertCalDoc_escaparHtml_(f.codigo || '—') + '</td><td>B</td><td>Normal</td><td class="num">U95 = ' + CertCalDoc_num_(f.incertezaU95, Math.max(2, c)) + ' ' + un + '</td><td class="num">k = ' + CertCalDoc_num_(f.fatorK, 2) + '</td><td class="num">' + CertCalDoc_num_(u, cu) + ' ' + un + '</td><td class="num">' + CertCalDoc_veff_(f.veff) + '</td></tr>');
  });
  if (temRes) {
    h.push('<tr><td class="txt">Resolução do instrumento' + (bloco.resolucaoInferida ? '*' : '') + '</td><td>B</td><td>Retangular</td><td class="num">r = ' + CertCalDoc_num_(res, CertCalDoc_casasResolucao_(res)) + ' ' + un + '</td><td>√12</td><td class="num">' + CertCalDoc_num_(res / Math.sqrt(12), cu) + ' ' + un + '</td><td class="num">∞</td></tr>');
  }
  h.push('</tbody></table></div>');
  if (numerador) h.push(numerador.tabela('Orçamento de incerteza — ' + bloco.titulo + ': incerteza por ponto (' + bloco.unidade + ')'));
  h.push('<div class="tabela-wrap"><table class="tabela-fontes"><thead><tr><th>Valor de referência</th><th>u repetibilidade</th><th>u padrão(ões)</th><th>u resolução</th><th>uc combinada</th><th>Veff</th><th>k</th><th>U95</th></tr></thead><tbody>');
  bloco.resultados.forEach(function (r) {
    var cp = CertCalDoc_componentesPonto_(r);
    h.push('<tr><td class="num">' + CertCalDoc_num_(r.nominal, c) + '</td><td class="num">' + CertCalDoc_num_(cp.uA, cu) + '</td><td class="num">' + CertCalDoc_num_(cp.uPad, cu) + '</td><td class="num">' + (cp.temRes ? CertCalDoc_num_(cp.uRes, cu) : '—') + '</td><td class="num">' + CertCalDoc_num_(r.incertezaPadraoCombinada, cu) + '</td><td class="num">' + CertCalDoc_veff_(r.veff) + '</td><td class="num">' + CertCalDoc_num_(r.k, 2) + '</td><td class="num">' + CertCalDoc_num_(r.incertezaU95, c) + '</td></tr>');
  });
  h.push('</tbody></table></div>');
  var notas = [];
  notas.push(resumida ? 'Incertezas-padrão em ' + un + '.' : 'Incertezas-padrão em ' + un + '; s: desvio-padrão das leituras;' + ((bloco.fontesIncerteza || []).length ? ' valor de origem do padrão conforme o certificado de calibração dele (Tabela 1);' : '') + ' uc: raiz da soma dos quadrados das componentes.');
  if (temRes && bloco.resolucaoInferida) notas.push('* Resolução deduzida do menor incremento das leituras registradas, por não ter sido informada no registro do ensaio.');
  if (!temRes) notas.push('A resolução do instrumento não consta do registro deste ensaio e não foi incluída no orçamento.');
  h.push('<p class="nota-tabela">' + notas.join(' ') + '</p>');
  return h.join('');
}

function CertCalDoc_montarBloco_(bloco, documento, numerador, secoes, resumida) {
  var c = CertCalDoc_casasBloco_(bloco);
  var un = CertCalDoc_escaparHtml_(bloco.unidade);
  var h = [];
  h.push('<div class="secao-bloco">');
  h.push(secoes ? secoes.sub(bloco.titulo + ' (' + bloco.unidade + ')') : '<h3>' + CertCalDoc_escaparHtml_(bloco.titulo) + ' (' + un + ')</h3>');
  h.push(CertCalDoc_montarTabelaResultados_(bloco, documento, numerador, resumida));
  h.push('<p class="resumo-pior">Maior tendência em módulo: <b>' + CertCalDoc_num_(Math.abs(Number(bloco.piorTendencia)), c) + ' ' + un + '</b>; maior U95: <b>' + CertCalDoc_num_(bloco.piorIncertezaU95, c) + ' ' + un + '</b> (Veff ' + CertCalDoc_veff_(bloco.piorIncertezaVeff) + '; k ' + CertCalDoc_num_(bloco.piorIncertezaK, 2) + '); maior |tendência| + U95: <b>' + CertCalDoc_num_(bloco.piorErroMaximo, c) + ' ' + un + '</b>.</p>');
  h.push(CertCalDoc_montarFontesIncerteza_(bloco, documento, numerador, resumida));
  h.push('</div>');
  return h.join('');
}

function CertCalDoc_paragrafosHtml_(texto) {
  var partes = String(texto || '').split(/\n{2,}/).map(function (p) { return p.trim(); }).filter(Boolean);
  if (!partes.length) return '<p>—</p>';
  return partes.map(function (p) { return '<p>' + CertCalDoc_escaparHtml_(p) + '</p>'; }).join('\n');
}

/** Linhas da solicitação de próxima calibração (sem repetir a data em dois lugares). */
function CertCalDoc_linhasProxima_(p) {
  return [
    ['Data informada pelo contratante', p.data],
    ['Solicitante', p.solicitante],
    ['Cargo / setor', p.cargoSetor],
    ['Referência da solicitação', p.referencia],
    ['Observação', p.observacao],
    ['Registrado por', p.registradoPor && (p.registradoPor.nome || p.registradoPor.usuario || p.registradoPor.userId) || p.colaborador],
    ['Registrado em', CertCalDoc_dataHora_(p.registradoEm)]
  ].filter(function (item) { return item[1] !== null && item[1] !== undefined && String(item[1]).trim() !== ''; });
}

/** Seção "Próxima calibração" do certificado: texto padrão e, se solicitada, a tabela da solicitação. */
function CertCalDoc_proximaCalibracaoHtml_(ctx, secoes) {
  var p = ctx.proximaCalibracao;
  var titulo = secoes ? secoes.secao('Próxima calibração') : '<h2>Próxima calibração</h2>';
  if (!p) {
    return ctx.dataValidade ? '<div class="manter">' + titulo + '<p>Data de validade registrada no documento histórico: ' + CertCalDoc_escaparHtml_(ctx.dataValidade) + '. Origem do prazo não documentada neste registro.</p></div>' : '';
  }
  var solicitada = p.solicitada === true || String(p.solicitada).toUpperCase() === 'SIM';
  var textos = CertCalDoc_configuracao_(ctx).textos;
  var h = ['<div class="manter proxima-calibracao">', titulo, CertCalDoc_paragrafosHtml_(solicitada ? textos.comData : textos.semData)];
  if (solicitada) {
    var linhas = CertCalDoc_linhasProxima_(p);
    h.push('<table class="dados ident"><tbody>');
    for (var i = 0; i < linhas.length; i += 2) {
      var a = linhas[i], b = linhas[i + 1];
      h.push('<tr><td class="rotulo">' + a[0] + '</td><td' + (b ? '' : ' colspan="3"') + '>' + CertCalDoc_escaparHtml_(a[1]) + '</td>' +
        (b ? '<td class="rotulo">' + b[0] + '</td><td>' + CertCalDoc_escaparHtml_(b[1]) + '</td>' : '') + '</tr>');
    }
    h.push('</tbody></table>');
  }
  h.push('</div>');
  return h.join('');
}

/** Fotos do ensaio como figuras numeradas. */
function CertCalDoc_montarFotos_(fotos, numerador) {
  if (!fotos || !fotos.length) return '';
  var html = ['<div class="fotos-grid">'];
  fotos.forEach(function (f) {
    var mime = /^image\/(png|jpe?g|gif|webp)$/i.test(String(f.mimeType || '')) ? f.mimeType : 'image/jpeg';
    var img = '<div class="foto-frame"><img src="data:' + mime + ';base64,' + String(f.base64 || '').replace(/[^A-Za-z0-9+\/=]/g, '') + '" alt="Foto do ensaio"></div>';
    var legenda = String(f.legenda || '').trim() || 'Registro do ensaio';
    html.push('<div class="foto-item">' + (numerador ? numerador.figura(img, legenda) : img + '<div class="legenda-tecnico">' + CertCalDoc_escaparHtml_(legenda) + '</div>') + '</div>');
  });
  html.push('</div>');
  return html.join('\n');
}

/**
 * Observações do certificado (snapshot): termo em negrito, sem repetir o aviso de
 * "sem declaração de conformidade" (ele já está no quadro da abertura) e sem
 * referência ao programa que gerou o documento. Vale também para snapshots antigos.
 */
function CertCalDoc_observacoesHtml_(lista) {
  var itens = (lista || []).map(function (o) { return String(o == null ? '' : o).trim(); }).filter(function (o) {
    return o && !/não contém declaração de conformidade/i.test(o);
  }).map(function (o) {
    o = o.replace(/o sistema não determina/i, 'este certificado não determina')
      .replace(/^Incerteza de Medição Expandida/, 'Incerteza de medição expandida')
      .replace(/fator de abrangência \(K\)/, 'fator de abrangência (k)');
    var m = /^([^:.]{3,70}):\s+([\s\S]+)$/.exec(o);
    return m ? '<li><b>' + CertCalDoc_escaparHtml_(m[1]) + ':</b> ' + CertCalDoc_escaparHtml_(m[2]) + '</li>' : '<li>' + CertCalDoc_escaparHtml_(o) + '</li>';
  });
  var iVeff = -1;
  itens.forEach(function (x, i) { if (/^<li><b>Fator de abrangência/.test(x)) iVeff = i; });
  var notaVeff = '<li><b>Graus de liberdade efetivos (Veff):</b> obtidos pela fórmula de Welch-Satterthwaite. Veff ∞ indica graus de liberdade infinitos (no cadastro do padrão, Veff 0 significa infinito; valores a partir de 10.000 são apresentados como ∞).</li>';
  if (iVeff >= 0) itens.splice(iVeff + 1, 0, notaVeff); else itens.push(notaVeff);
  return itens.length ? '<ul class="observacoes">' + itens.join('') + '</ul>' : '';
}

/** Linha "Empresa — CNPJ" para o rodapé corrido. */
function CertCalDoc_empresaRodape_(empresa) {
  return empresa && empresa.nome ? empresa.nome + (empresa.cnpj ? ' — CNPJ ' + empresa.cnpj : '') : '';
}

/** CSS comum do certificado e do interpretativo (identidade verde do certificado). */
function CertCalDoc_css_() {
  return [
    '*{box-sizing:border-box}',
    'body{font-family:Arial,Helvetica,sans-serif;color:#1f2933;font-size:9.6pt;line-height:1.45;margin:0;background:#eef1f4}',
    '.folha{max-width:210mm;margin:16px auto;background:#fff;padding:16mm 15mm 16mm 18mm;box-shadow:0 2px 10px rgba(0,0,0,.12)}',
    '.topo{display:flex;align-items:center;justify-content:space-between;border-bottom:2.2pt solid #1f6f45;padding-bottom:3mm;margin-bottom:4mm}',
    '.logo-topo{height:13mm}',
    '.numero-doc{border:.8pt solid #1f6f45;color:#1f6f45;font-weight:700;padding:1.4mm 3.2mm;border-radius:1mm;font-size:9pt;text-align:right;line-height:1.35}',
    '.numero-doc small{display:block;font-weight:400;color:#3e4c59;font-size:8pt}',
    'h1.titulo-cert{text-align:center;font-size:15.5pt;color:#1f6f45;margin:1mm 0 3mm}',
    'table.ficha{width:100%;border-collapse:collapse;margin:0 0 3mm;font-size:8.6pt}',
    'table.ficha td{border:.6pt solid #cfe0d6;padding:1.4mm 2mm;vertical-align:top;width:25%}',
    'table.ficha td span{display:block;color:#3e4c59;font-size:7.6pt}',
    'table.ficha td b{color:#1f2933}',
    '.quadro-info{border:.8pt solid #9aa5b1;border-left:3pt solid #3e4c59;background:#f4f6f8;padding:1.8mm 3.2mm;margin:0 0 3mm;font-size:9pt}',
    '.quadro-info p{margin:0}',
    'h2{font-size:10.5pt;color:#fff;background:#1f6f45;padding:1.4mm 3mm;margin:4.2mm 0 2mm;font-weight:700}',
    'h3{font-size:10pt;color:#14532d;background:#e3f4e8;border-left:3pt solid #1f6f45;padding:1mm 2.6mm;margin:3.2mm 0 1.2mm;font-weight:700}',
    'p{margin:1.4mm 0}',
    'table.dados{width:100%;border-collapse:collapse;margin:0 0 2mm;font-size:8.8pt}',
    'table.dados td{border:.6pt solid #cfe0d6;padding:.9mm 2.2mm;vertical-align:top;text-align:left;line-height:1.3}',
    'table.dados td.rotulo{background:#eef8f1;font-weight:700;color:#14532d;width:21%}',
    'table.dados tr.grupo th{background:#d4eedc;color:#14532d;text-align:left;font-size:8.6pt;padding:1.1mm 2.2mm;border:.6pt solid #cfe0d6}',
    '.tabela-wrap{overflow-x:auto;margin:0 0 1mm}',
    'table.tabela-resultados,table.tabela-fontes{border-collapse:collapse;width:100%;font-size:8.4pt}',
    'table.compacta{font-size:7.8pt}',
    'table.tabela-resultados th,table.tabela-resultados td,table.tabela-fontes th,table.tabela-fontes td{border:.6pt solid #cfe0d6;padding:.8mm 1.6mm;text-align:center;vertical-align:middle;line-height:1.3}',
    'table.tabela-resultados thead th,table.tabela-fontes thead th{background:#d4eedc;color:#14532d;font-weight:700;line-height:1.25}',
    'table.tabela-resultados tbody tr:nth-child(even),table.tabela-fontes tbody tr:nth-child(even){background:#f5fbf7}',
    'td.txt{text-align:left !important}',
    '.nota-tabela{font-size:8pt;color:#3e4c59;margin:.8mm 0 2.4mm;text-align:left;hyphens:auto}',
    '.resumo-pior{font-size:8.6pt;margin:1.4mm 0 1mm;text-align:left}',
    'ul.observacoes{margin:1mm 0 0;padding-left:4.5mm;font-size:8.4pt;line-height:1.4}',
    'ul.observacoes li{margin:0 0 .8mm}',
    '.fotos-grid{display:flex;flex-wrap:wrap;gap:4mm;margin-top:2mm}',
    '.foto-item{width:calc(50% - 2mm);break-inside:avoid;page-break-inside:avoid}',
    '.foto-frame{height:58mm;display:flex;align-items:center;justify-content:center;background:#f7f8fa;border:.6pt solid #cfe0d6}',
    '.foto-frame img{max-width:100%;max-height:100%;object-fit:contain;display:block}',
    '.legenda-tecnico{font-size:8.3pt;color:#3e4c59;margin-top:1mm}',
    '.reltec-fecho .executor{margin:2mm 0 0;text-align:left}',
    '.assinaturas{display:flex;justify-content:space-around;gap:6mm;margin-top:3mm}',
    '.assinatura-item{text-align:center;width:46%}',
    '.assinatura-item svg,.assinatura-item img{height:14mm;max-width:100%}',
    '.assinatura-linha{border-top:.7pt solid #1f2933;margin-top:1mm;padding-top:1.2mm;font-size:8.6pt;line-height:1.35}',
    '.sem-imagem .assinatura-linha{border-top:0;padding-top:0}',
    '.departamento{text-align:center;font-size:8.3pt;color:#3e4c59;margin-top:4mm}',
    'body nav.sumario .sumario-tit{color:#1f6f45;border-bottom-color:#1f6f45}',
    '.barra-imprimir{max-width:210mm;margin:12px auto 0;text-align:right}',
    '.barra-imprimir button{background:#1f6f45;color:#fff;border:none;padding:10px 18px;border-radius:4px;font-weight:700;cursor:pointer;font-size:13px}',
    '@media screen and (max-width:760px){.folha{padding:14px 12px;margin:0}.assinaturas{flex-direction:column;align-items:center}.assinatura-item,.foto-item{width:100%}}',
    '@media print{body{background:#fff}.folha{box-shadow:none;margin:0;padding:0;max-width:none}.no-print{display:none !important}}'
  ].join('');
}

/** Abertura comum: logo, número, título, ficha e quadro informativo. */
function CertCalDoc_abertura_(logo, rotuloNumero, numero, revisao, titulo, ficha, quadro) {
  var h = [];
  h.push('<div class="topo">');
  h.push(logo && logo.data ? '<img class="logo-topo" src="data:' + logo.mimeType + ';base64,' + logo.data + '" alt="Metrolabs">' : '<div></div>');
  h.push('<div class="numero-doc">' + CertCalDoc_escaparHtml_(rotuloNumero) + ' ' + CertCalDoc_escaparHtml_(numero || '—') + '<small>Revisão ' + CertCalDoc_escaparHtml_(RelTecA4_revisao_(revisao)) + '</small></div>');
  h.push('</div>');
  h.push('<h1 class="titulo-cert">' + CertCalDoc_escaparHtml_(titulo) + '</h1>');
  if (ficha && ficha.length) {
    h.push('<table class="ficha"><tbody><tr>' + ficha.map(function (f) {
      return '<td><span>' + CertCalDoc_escaparHtml_(f[0]) + '</span><b>' + CertCalDoc_escaparHtml_(f[1] || '—') + '</b></td>';
    }).join('') + '</tr></tbody></table>');
  }
  if (quadro) h.push('<div class="quadro-info"><p>' + CertCalDoc_escaparHtml_(quadro) + '</p></div>');
  return h.join('');
}

/** Tabela de identificação em 4 colunas, com linhas de grupo. grupos: [{ titulo, linhas:[[rótulo, valor, larga?]] }] */
function CertCalDoc_tabelaIdentificacao_(grupos) {
  var h = ['<table class="dados ident"><tbody>'];
  grupos.forEach(function (g) {
    if (g.titulo) h.push('<tr class="grupo"><th colspan="4">' + CertCalDoc_escaparHtml_(g.titulo) + '</th></tr>');
    var pend = null;
    var fechar = function () { if (pend) { h.push('<tr><td class="rotulo">' + pend[0] + '</td><td colspan="3">' + CertCalDoc_escaparHtml_(pend[1] || '—') + '</td></tr>'); pend = null; } };
    g.linhas.forEach(function (l) {
      if (l[2]) { fechar(); h.push('<tr><td class="rotulo">' + l[0] + '</td><td colspan="3">' + CertCalDoc_escaparHtml_(l[1] || '—') + '</td></tr>'); return; }
      if (!pend) { pend = l; return; }
      h.push('<tr><td class="rotulo">' + pend[0] + '</td><td>' + CertCalDoc_escaparHtml_(pend[1] || '—') + '</td><td class="rotulo">' + l[0] + '</td><td>' + CertCalDoc_escaparHtml_(l[1] || '—') + '</td></tr>');
      pend = null;
    });
    fechar();
  });
  h.push('</tbody></table>');
  return h.join('');
}

function CertCalDoc_padroesDoCertificado_(ctx) {
  var lista = [], vistos = {};
  (ctx.blocos || []).forEach(function (b) {
    (b.padroesUsados || []).forEach(function (p) {
      var chave = String(p.id || '') + '|' + String(p.tag || '') + '|' + String(p.certificadoNumero || '');
      if (vistos[chave]) return;
      vistos[chave] = true;
      lista.push(p);
    });
  });
  return lista;
}

function CertCalDoc_inicioHtml_(tituloAba, cssMoldura) {
  return '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">' +
    '<title>' + CertCalDoc_escaparHtml_(tituloAba) + '</title><style>' + CertCalDoc_css_() + SGO_DocA4_css_() + cssMoldura + '</style></head><body>' +
    '<div class="barra-imprimir no-print"><button onclick="window.print()">Imprimir ou salvar em PDF</button></div><div class="folha">';
}

function CertCalDoc_montarDocumentoHtml_(ctx) {
  var documento = CertCalDoc_configuracao_(ctx);
  var empresa = documento.empresa;
  var assinaturas = documento.assinaturas || [];
  var noCliente = ctx.localCalibracao === 'CLIENTE';
  var localLabel = noCliente ? 'Instalações do cliente' : 'Laboratório da Metrolabs';
  var num = CertCalDoc_numerador_();
  var sec = CertCalDoc_secoes_();
  var blocos = ctx.blocos || [];
  var html = [];
  html.push(CertCalDoc_inicioHtml_('Certificado de Calibração' + (ctx.numeroCertificado ? ' nº ' + ctx.numeroCertificado : ''),
    RelTecA4_css_({ titulo: 'Certificado de Calibração', numero: ctx.numeroCertificado || '', revisao: ctx.revisao || '00', empresa: CertCalDoc_empresaRodape_(empresa) })));
  html.push(CertCalDoc_abertura_(documento.logo, 'Certificado nº', ctx.numeroCertificado, ctx.revisao, 'Certificado de Calibração',
    [['Data da calibração', ctx.dataCalibracao], ['Data de emissão', ctx.dataEmissao], ['Local da calibração', localLabel]],
    'Este certificado apresenta os resultados das medições e suas incertezas, sem declaração de conformidade ou decisão de aptidão para uso. A avaliação dos requisitos da aplicação e a decisão de uso cabem ao setor de qualidade do cliente.'));
  // Com 3 grandezas ou mais (as fotos contam como uma) o certificado passa de 3 páginas: leva sumário
  // (números de página preenchidos na gravação e na reabertura).
  var temFotos = (ctx.fotos || []).some(function (f) { return f && f.base64; });
  if (blocos.length + (temFotos ? 1 : 0) >= 3 && typeof RelTecA4_sumario_ === 'function') html.push(RelTecA4_sumario_());

  html.push(sec.secao('Identificação'));
  var linhasEmpresa = [['Razão social', empresa.nome, true], ['CNPJ', empresa.cnpj], ['Telefone', empresa.telefone]];
  if (empresa.endereco) linhasEmpresa.push(['Endereço', empresa.endereco, true]);
  linhasEmpresa.push(['Site', empresa.site], ['Área responsável', 'Departamento de Inspeções e Ensaios Científicos']);
  html.push(CertCalDoc_tabelaIdentificacao_([
    { titulo: 'Empresa executante', linhas: linhasEmpresa },
    { titulo: 'Cliente', linhas: [['Razão social', ctx.cliente.razaoSocial, true], ['CNPJ', ctx.cliente.cnpj, true], ['Endereço', ctx.cliente.endereco, true]] },
    { titulo: 'Equipamento em calibração', linhas: [['Descrição', ctx.equipamento.descricao, true], ['Identificação (TAG)', ctx.equipamento.tag], ['Nº de série', ctx.equipamento.serie], ctx.equipamento.patrimonio ? ['Patrimônio', ctx.equipamento.patrimonio] : null, ['Fabricante', ctx.equipamento.fabricante], ['Modelo', ctx.equipamento.modelo], ['Localização', ctx.equipamento.localizacao, true]].filter(Boolean) }
  ]));

  var padroes = CertCalDoc_padroesDoCertificado_(ctx);
  html.push(sec.secao('Método, rastreabilidade e condições ambientais'));
  var nTabPadroes = padroes.length ? num.proximaTabela() : 0;
  html.push('<p>' + (padroes.length
    ? 'Calibração por comparação das indicações do instrumento com os padrões de referência da Tabela ' + nTabPadroes
    : 'Medições registradas pelo técnico executor, sem padrão de referência vinculado neste registro') +
    '. O valor de referência de cada ponto corresponde ao valor informado no registro do ensaio. Os resultados e o orçamento de incerteza de cada grandeza estão na seção 3.</p>');
  if (padroes.length) {
    html.push(num.tabela('Padrões de referência utilizados (rastreabilidade das medições)'));
    html.push('<div class="tabela-wrap"><table class="tabela-fontes"><thead><tr><th>Identificação (TAG)</th><th>Descrição</th><th>Certificado do padrão</th><th>Validade</th></tr></thead><tbody>');
    padroes.forEach(function (p) {
      html.push('<tr><td class="txt">' + CertCalDoc_escaparHtml_(p.tag) + '</td><td class="txt">' + CertCalDoc_escaparHtml_(p.descricao) + '</td><td class="txt">' + CertCalDoc_escaparHtml_(p.certificadoNumero || '—') + '</td><td>' + CertCalDoc_escaparHtml_(p.validade || 'não informada') + '</td></tr>');
    });
    html.push('</tbody></table></div>');
  }
  html.push('<p><b>Condições ambientais durante a calibração:</b> ' + CertCalDoc_escaparHtml_(ctx.condicoesAmbientais || 'não registradas neste ensaio.') + '</p>');

  html.push(sec.secao('Resultados e incerteza de medição'));
  // As notas de leitura das tabelas saem completas só na 1ª grandeza (não repetir o mesmo texto).
  blocos.forEach(function (bloco, i) { html.push(CertCalDoc_montarBloco_(bloco, documento, num, sec, i > 0)); });

  var fotos = CertCalDoc_montarFotos_(ctx.fotos, num);
  if (fotos) { html.push(sec.secao('Registro fotográfico do ensaio')); html.push(fotos); }

  html.push(sec.secao('Observações'));
  html.push(CertCalDoc_observacoesHtml_(documento.textos.observacoes));

  html.push(CertCalDoc_proximaCalibracaoHtml_(ctx, sec));

  html.push('<div class="reltec-fecho">');
  html.push(sec.secao('Responsabilidade técnica'));
  html.push('<p>Calibração executada por ' + CertCalDoc_escaparHtml_(ctx.tecnicoExecutor || '—') + '. Revisão e emissão técnica do certificado:</p>');
  html.push('<div class="assinaturas">');
  assinaturas.forEach(function (a) {
    html.push('<div class="assinatura-item">');
    if (a.imagemSvg && /^\s*<svg[\s>]/i.test(a.imagemSvg)) html.push(a.imagemSvg);
    html.push('<div class="assinatura-linha"><b>' + CertCalDoc_escaparHtml_(a.nome) + '</b><br>' + CertCalDoc_escaparHtml_(a.cargo) + '<br>' + CertCalDoc_escaparHtml_(a.registro) + '</div>');
    html.push('</div>');
  });
  html.push('</div>');
  html.push('</div>');
  html.push('</div></body></html>');
  return html.join('\n');
}

/** Figura por grandeza: tendência com barra de ±U95 em cada ponto (relatório interpretativo). */
function CertCalDoc_figurasInterpretativo_(ctx, numerador) {
  if (typeof RelTecA4_graficoIncerteza_ !== 'function') return '';
  return (ctx.blocos || []).map(function (b) {
    var c = CertCalDoc_casasBloco_(b);
    var svg = RelTecA4_graficoIncerteza_({
      pontos: (b.resultados || []).map(function (r) { return { rotulo: CertCalDoc_num_(r.nominal, c), tendencia: Number(r.tendencia), u95: Number(r.incertezaU95) }; }),
      unidade: b.unidade, casas: c, largura: 640, altura: 170
    });
    return numerador.figura(svg, b.titulo + ': tendência (ponto) e intervalo de ±U95 (barra) em cada valor de referência, em ' + b.unidade + '. A distância do zero até a extremidade mais afastada da barra corresponde a |tendência| + U95.');
  }).join('');
}

function CertCalDoc_hoje_() {
  try { return Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'America/Sao_Paulo', 'dd/MM/yyyy'); } catch (e) { return ''; }
}

/** Próxima calibração numa linha (interpretativo): o texto completo e a solicitação ficam no certificado. */
function CertCalDoc_proximaResumo_(ctx) {
  var p = ctx.proximaCalibracao;
  if (!p) return ctx.dataValidade ? ctx.dataValidade + ' (registro histórico)' : 'Não informada';
  var solicitada = p.solicitada === true || String(p.solicitada).toUpperCase() === 'SIM';
  return solicitada ? (p.data || '—') + ', data informada pelo contratante' : 'Não informada: a periodicidade é definida pelo contratante';
}

function CertCalDoc_montarRelatorioInterpretativoHtml_(ctx, textos, fotos) {
  var documento = CertCalDoc_configuracao_(ctx);
  var empresa = documento.empresa;
  var num = CertCalDoc_numerador_();
  var sec = CertCalDoc_secoes_();
  var titulo = 'Relatório interpretativo do certificado de calibração';
  var html = [];
  html.push(CertCalDoc_inicioHtml_('Relatório interpretativo — Certificado ' + (ctx.numeroCertificado || ''),
    RelTecA4_css_({ titulo: 'Relatório interpretativo do certificado', numero: ctx.numeroCertificado || '', revisao: ctx.revisao || '00', empresa: CertCalDoc_empresaRodape_(empresa) })));
  html.push(CertCalDoc_abertura_(documento.logo, 'Certificado nº', ctx.numeroCertificado, ctx.revisao, titulo,
    [['Data da calibração', ctx.dataCalibracao], ['Emissão do certificado', ctx.dataEmissao], ['Emissão deste relatório', CertCalDoc_hoje_()]],
    'Documento complementar ao Certificado de Calibração nº ' + (ctx.numeroCertificado || '') + ', que ele não substitui: em caso de divergência, prevalece o certificado.'));

  html.push(sec.secao('Identificação'));
  html.push(CertCalDoc_tabelaIdentificacao_([{ linhas: [
    ['Cliente', ctx.cliente.razaoSocial, true],
    ['CNPJ do cliente', ctx.cliente.cnpj], ['Local da calibração', ctx.localCalibracao === 'CLIENTE' ? 'Instalações do cliente' : 'Laboratório da Metrolabs'],
    ['Equipamento', ctx.equipamento.descricao, true],
    ['Identificação (TAG)', ctx.equipamento.tag], ['Nº de série', ctx.equipamento.serie],
    ctx.equipamento.patrimonio ? ['Patrimônio', ctx.equipamento.patrimonio, true] : null,
    ['Fabricante', ctx.equipamento.fabricante], ['Modelo', ctx.equipamento.modelo],
    ['Localização', ctx.equipamento.localizacao, true],
    ['Próxima calibração', CertCalDoc_proximaResumo_(ctx), true],
    ['Empresa executante', CertCalDoc_empresaRodape_(empresa) || empresa.nome, true]
  ].filter(Boolean) }]));

  html.push(sec.secao('Introdução'));
  html.push(CertCalDoc_paragrafosHtml_(textos.introducao));
  html.push(sec.secao('Resultados explicados'));
  html.push(CertCalDoc_paragrafosHtml_(textos.resultadosExplicados));
  html.push(CertCalDoc_figurasInterpretativo_(ctx, num));
  var fotosHtml = CertCalDoc_montarFotos_(fotos, num);
  if (fotosHtml) { html.push(sec.secao('Registro fotográfico do ensaio')); html.push(fotosHtml); }
  html.push('<div class="manter">' + sec.secao('Conclusão técnica') + CertCalDoc_paragrafosHtml_(textos.conclusaoTecnica) + '</div>');
  // A última conclusão e a responsabilidade técnica ficam juntas (sem folha só com os nomes).
  html.push('<div class="reltec-fecho">');
  html.push('<div class="manter">' + sec.secao('Conclusão em linguagem de fácil compreensão') + CertCalDoc_paragrafosHtml_(textos.conclusaoLeigo) + '</div>');
  var resp = (documento.assinaturas || []).filter(function (a) { return a && a.nome; });
  if (resp.length) {
    html.push(sec.secao('Responsabilidade técnica'));
    html.push('<p>Relatório elaborado pela Metrolabs a partir dos resultados do Certificado de Calibração nº ' + CertCalDoc_escaparHtml_(ctx.numeroCertificado || '') + ', emitido sob a responsabilidade técnica de:</p>');
    html.push('<div class="assinaturas sem-imagem">' + resp.map(function (a) {
      return '<div class="assinatura-item"><div class="assinatura-linha"><b>' + CertCalDoc_escaparHtml_(a.nome) + '</b><br>' + CertCalDoc_escaparHtml_(a.cargo) + '<br>' + CertCalDoc_escaparHtml_(a.registro) + '</div></div>';
    }).join('') + '</div>');
  }
  html.push('</div>');
  html.push('</div></body></html>');
  return html.join('\n');
}
