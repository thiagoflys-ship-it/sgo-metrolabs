function CertCalGest_esc_(v){return String(v==null?"":v).replace(/[&<>"']/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]})}
function CertCalGest_numero_(v){if(v==null||String(v).trim()==="")return"—";var n=Number(typeof v==="string"?v.replace(",","."):v);if(!isFinite(n))return"—";return SGO_DocA4_num_(Math.abs(n)<0.005?0:n,2)}
function CertCalGest_veff_(v){return CertCalCalculo.formatarVeff(v)}
function CertCalGest_logoSrc_(){var cfg=typeof CadeiaFrioRel_CFCFG!=="undefined"?CadeiaFrioRel_CFCFG:{};var l=cfg.LOGO_BASE64;if(l&&l.data)return"data:"+(l.mimeType||"image/png")+";base64,"+l.data;return SGO_CFG.LOGO_URL||""}
function CertCalGest_desc_(p){return SGO_UTILS.safe(p.DESCRICAO)||"Não informada"}
function CertCalGest_grandeza_(desc){var s=SGO_UTILS.safe(desc),u=SGO_UTILS.safeUpper(s);if(/TEMPERAT|°C/.test(u))return"Temperatura";if(/UMIDADE|%UR/.test(u))return"Umidade";if(/TEMPO|CRON[ÔO]MET|\bSEGUND|\bMINUTO/.test(u)||/^(S|MIN|H)$/.test(u))return"Tempo";if(/PRESS|MAN[ÔO]MET|BAR|PSI|MPA|MMHG/.test(u))return"Pressão";if(/MASSA|PESO|BALAN[ÇC]A|KG|GRAM/.test(u)||/^(G|MG)$/.test(u))return"Massa";if(/RPM|ROTA|M\/MIN/.test(u))return"Rotação/velocidade";if(/TENS|VAC/.test(u))return"Tensão elétrica";if(/RESIST|OHM/.test(u))return"Resistência elétrica";if(/CORREN|ΜA|UA/.test(u))return"Corrente elétrica";return"Outra/não identificada"}
function CertCalGest_faixa_(desc){var s=SGO_UTILS.safe(desc);var m=s.match(/(?:-?\d+(?:[.,]\d+)?\s*)(?:a|até|–|—|-)\s*(-?\d+(?:[.,]\d+)?\s*(?:°C|%UR|bar|psi|MPa|mmHg|kg|g|rpm|m\/min|Vac|ohm|µA)?)/i);return m?m[0]:s}
function CertCalGest_contextoPadroes_(){var itens=SGO_DATA.getAll(SGO_CFG.SHEETS.CAD_PADROES).filter(function(p){return SGO_UTILS.safeUpper(p.STATUS)!=="INATIVO"}).map(function(p){var c=CertCal_classificarValidadePadrao_(p.VALIDADE);var erros=[];if(!SGO_UTILS.safe(p.CERTIFICADO_NUMERO))erros.push("número do certificado ausente");if(!SGO_UTILS.safe(p.LINK_CERTIFICADO_PDF))erros.push("PDF não anexado");if(!(Number(p.INCERTEZA_U95)>0))erros.push("U95 ausente ou inválida");if(!(Number(p.FATOR_K)>0))erros.push("K ausente ou inválido");if(c.status==="SEM_VALIDADE")erros.push("certificado sem data de validade");if(c.status==="VALIDADE_INVALIDA")erros.push("data de validade inválida");return{id:p.ID,tag:p.TAG||"",descricao:CertCalGest_desc_(p),grandeza:CertCalGest_grandeza_(p.DESCRICAO),faixa:CertCalGest_faixa_(p.DESCRICAO),certificado:p.CERTIFICADO_NUMERO||"",validade:p.VALIDADE||"",situacao:c.status,label:c.label,diasRestantes:c.diasRestantes,u95:p.INCERTEZA_U95,k:p.FATOR_K,veff:p.VEFF,status:p.STATUS||"",pdf:p.LINK_CERTIFICADO_PDF||"",erros:erros}});var cont={OK:0,VENCENDO:0,VENCIDO:0,SEM_VALIDADE:0,VALIDADE_INVALIDA:0};itens.forEach(function(i){cont[i.situacao]=(cont[i.situacao]||0)+1});var porGrandeza={};itens.forEach(function(i){porGrandeza[i.grandeza]=(porGrandeza[i.grandeza]||0)+1});return{geradoEm:Utilities.formatDate(new Date,Session.getScriptTimeZone()||"America/Sao_Paulo","dd/MM/yyyy HH:mm"),total:itens.length,contagens:cont,comErros:itens.filter(function(i){return i.erros.length}).length,porGrandeza:porGrandeza,itens:itens}}
/** Texto da análise (IA ou padrão): parágrafos separados por linha em branco; "1. … 2. …" vira lista numerada. */
function CertCalGest_iaHtml_(texto) {
  var s = String(texto || '').replace(/\*\*/g, '').replace(/\r/g, '').trim();
  if (!s) return '<p>—</p>';
  return s.split(/\n\s*\n/).map(function (bloco) {
    var b = bloco.replace(/\s*\n\s*/g, ' ').trim();
    var partes = b.split(/\s+(?=\d+[.)]\s+)/).map(function (x) { return x.replace(/^\d+[.)]\s*/, '').trim(); }).filter(Boolean);
    if (partes.length > 1 && /^\d+[.)]\s/.test(b)) return '<ol>' + partes.map(function (x) { return '<li>' + CertCalGest_esc_(x) + '</li>'; }).join('') + '</ol>';
    return '<p>' + CertCalGest_esc_(b) + '</p>';
  }).filter(Boolean).join('');
}
function CertCalGest_prioridade_(i){if(i.situacao==="VENCIDO")return{n:1,classe:"p1",texto:"P1 — Vencido"};if(i.situacao==="SEM_VALIDADE"||i.situacao==="VALIDADE_INVALIDA")return{n:2,classe:"p2",texto:"P2 — Validade ausente/inválida"};if(i.situacao==="VENCENDO")return{n:3,classe:"p3",texto:"P3 — Vence em até 30 dias"};if(i.erros.length)return{n:4,classe:"p4",texto:"P4 — Cadastro incompleto"};return{n:5,classe:"p5",texto:"P5 — Regular"}}

/* ============================================================
 * Relatórios gerenciais dos padrões e da emissão de certificados (A4, uso interno)
 * Padrão de 18/10/2026: número próprio (REN-/DES-aaaammdd-hhmm), seções numeradas,
 * "Tabela N —" e "Figura N —", gráficos SVG estáticos em largura total (o PDF é
 * gerado sem JavaScript), sem termos de sistema no texto. Pasta fixa (documento interno).
 * ============================================================ */

/** "1 certificado" / "2 certificados". */
function CertCalGest_plural_(n, singular, plural) {
  var v = Number(n) || 0;
  return SGO_DocA4_num_(v, 0) + ' ' + (v === 1 ? singular : plural);
}

function CertCalGest_dataBr_(d) {
  try { return Utilities.formatDate(d, Session.getScriptTimeZone() || 'America/Sao_Paulo', 'dd/MM/yyyy'); } catch (e) { return ''; }
}

function CertCalGest_contextoDesempenho_(dias) {
  var agora = new Date();
  var corte = dias > 0 ? new Date(agora.getTime() - dias * 864e5) : null;
  var certs = SGO_DATA.getAll(SGO_CFG.SHEETS.CERT_CALIBRACAO).filter(function (c) {
    var d = c.CRIADO_EM ? new Date(c.CRIADO_EM) : null;
    return !corte || d && !isNaN(d.getTime()) && d >= corte;
  });
  var grandezas = {}, clientesSet = {}, equipSet = {}, comIA = 0, pontos = 0;
  certs.forEach(function (c) {
    if (c.LINK_PDF_RELATORIO_INTERPRETATIVO) comIA++;
    if (c.CLIENTE_ID) clientesSet[c.CLIENTE_ID] = 1;
    if (c.EQUIPAMENTO_ID) equipSet[c.EQUIPAMENTO_ID] = 1;
    try {
      var j = JSON.parse(c.DADOS_JSON || '{}');
      (j.blocos || []).forEach(function (b) {
        var g = CertCalGest_grandeza_((b.titulo || '') + ' ' + (b.unidade || ''));
        // Pontos do bloco: o resumo do snapshot grande guarda a quantidade; o snapshot completo, a lista.
        var qtd = j.snapshotVersion === 1 ? Number(b.quantidadePontos) || 0
          : (Array.isArray(b.resultados) ? b.resultados : Array.isArray(b.pontos) ? b.pontos : []).length;
        grandezas[g] = (grandezas[g] || 0) + qtd;
        pontos += qtd;
      });
    } catch (e) { /* registro antigo sem dados legíveis: entra só na contagem de certificados */ }
  });
  var p = CertCalGest_contextoPadroes_();
  var periodo = dias > 0
    ? CertCalGest_dataBr_(corte) + ' a ' + CertCalGest_dataBr_(agora) + ' (últimos ' + SGO_DocA4_num_(dias, 0) + ' dias)'
    : 'Todo o histórico, até ' + CertCalGest_dataBr_(agora);
  return {
    periodo: periodo, totalCertificados: certs.length,
    clientesAtendidos: Object.keys(clientesSet).length, equipamentosAtendidos: Object.keys(equipSet).length,
    pontosCalibrados: pontos, comRelatorioIA: comIA, semRelatorioIA: certs.length - comIA,
    coberturaIA: certs.length ? comIA * 100 / certs.length : 0, grandezas: grandezas,
    padroes: { total: p.total, validos: p.contagens.OK, vencidos: p.contagens.VENCIDO, vencendo: p.contagens.VENCENDO, semValidade: p.contagens.SEM_VALIDADE, invalidos: p.comErros }
  };
}

/**
 * Moldura dos relatórios gerenciais. o = { titulo, tituloCurto, numero, ficha:[[rótulo, valor]] }.
 * Sem script: tudo o que vai para o papel sai do HTML e do CSS.
 */
function CertCalGest_baseHtml_(o, corpo) {
  var css = '*{box-sizing:border-box}' +
    'body{font-family:Arial,Helvetica,sans-serif;color:#1f2933;font-size:9.6pt;line-height:1.45;margin:0;background:#eef1f4}' +
    '.no-print{max-width:210mm;margin:12px auto 0;text-align:right}.no-print button{background:#0b4ea2;color:#fff;border:0;padding:10px 16px;border-radius:4px;font-weight:700;cursor:pointer}' +
    '.folha{max-width:210mm;margin:16px auto;background:#fff;padding:16mm 15mm 16mm 18mm;box-shadow:0 2px 10px rgba(0,0,0,.12)}' +
    '.topo{display:flex;align-items:center;justify-content:space-between;border-bottom:2.2pt solid #0b4ea2;padding-bottom:3mm;margin-bottom:4mm}' +
    '.logo-topo{height:13mm;max-width:50mm;object-fit:contain}' +
    '.numero-doc{border:.8pt solid #0b4ea2;color:#0b3d6e;font-weight:700;padding:1.4mm 3.2mm;border-radius:1mm;font-size:9pt;text-align:right;line-height:1.35}' +
    '.numero-doc small{display:block;font-weight:400;color:#3e4c59;font-size:8pt}' +
    'h1{color:#0b3d6e;font-size:15.5pt;margin:1mm 0 3mm}' +
    'table.ficha{width:100%;border-collapse:collapse;margin:0 0 4mm;font-size:8.6pt}table.ficha td{border:.6pt solid #cbd5e1;padding:1.4mm 2mm;vertical-align:top}' +
    'table.ficha td span{display:block;color:#3e4c59;font-size:7.6pt}' +
    'h2{color:#fff;background:#0b4ea2;font-size:10.5pt;padding:1.6mm 3mm;margin:5mm 0 2.4mm;border-left:3pt solid #059669}' +
    'p{margin:1.4mm 0}ol{margin:1mm 0;padding-left:6mm}li{margin:0 0 .8mm}' +
    '.kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:2.4mm;margin:0 0 2mm}.kpi{border:.6pt solid #cbd5e1;border-radius:1mm;padding:2mm;text-align:center;font-size:8.6pt;line-height:1.3}' +
    '.kpi b{display:block;font-size:15pt;color:#0b3d6e;margin-bottom:.6mm;white-space:nowrap}' +
    '.callout{border-left:3pt solid #b45309;background:#fdf6e9;padding:2mm 3mm;margin:2.4mm 0}.callout p,.callout ol{margin:1mm 0}.callout .tit{font-weight:700;text-align:left;margin:0 0 1mm}' +
    '.erro{border-left-color:#a61b1b;background:#fdf0f0}' +
    'table.t{width:100%;border-collapse:collapse;font-size:8.4pt}table.t th,table.t td{border:.6pt solid #cbd5e1;padding:1.1mm 1.6mm;vertical-align:top;text-align:left}' +
    'table.t th{background:#e8eef7;font-weight:700}table.t td.nw{white-space:nowrap}' +
    '.p1{background:#fde8e8}.p2{background:#f3ecfb}.p3{background:#fdf3d8}.p4{background:#e3edfb}.p5{background:#e6f6ec}' +
    '.legenda{display:flex;gap:2mm;flex-wrap:wrap;margin:1.6mm 0;font-size:8.2pt}.legenda span{padding:.8mm 2mm;border-radius:1mm;border:.6pt solid #cbd5e1}' +
    '@media screen and (max-width:760px){.folha{padding:14px 12px;margin:0}.kpis{grid-template-columns:repeat(2,1fr)}.tabela-wrap{overflow-x:auto}}' +
    '@media print{body{background:#fff}.folha{max-width:none;padding:0;margin:0;box-shadow:none}.no-print{display:none}}';
  var ficha = (o.ficha || []).filter(function (f) { return f && f[0]; });
  return '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>' + CertCalGest_esc_(o.titulo) + '</title><style>' +
    css + SGO_DocA4_css_() + RelTecA4_css_({ titulo: o.tituloCurto || o.titulo, numero: o.numero, revisao: '00' }) +
    '</style></head><body><div class="no-print"><button onclick="window.print()">Imprimir ou salvar em PDF</button></div><main class="folha">' +
    '<header class="topo">' + (CertCalGest_logoSrc_() ? '<img class="logo-topo" src="' + CertCalGest_esc_(CertCalGest_logoSrc_()) + '" alt="Metrolabs">' : '<div></div>') + '<div class="numero-doc">Nº ' + CertCalGest_esc_(o.numero) + '<small>Revisão 00 · uso interno</small></div></header>' +
    '<h1>' + CertCalGest_esc_(o.titulo) + '</h1>' +
    (ficha.length ? '<table class="ficha"><tbody><tr>' + ficha.map(function (f) { return '<td><span>' + CertCalGest_esc_(f[0]) + '</span><b>' + CertCalGest_esc_(f[1] || '—') + '</b></td>'; }).join('') + '</tr></tbody></table>' : '') +
    corpo + '</main></body></html>';
}

function CertCalGest_kpis_(lista) {
  return '<div class="kpis">' + lista.map(function (k) { return '<div class="kpi"><b>' + CertCalGest_esc_(k[0]) + '</b>' + CertCalGest_esc_(k[1]) + '</div>'; }).join('') + '</div>';
}

function CertCalGest_secoes_() {
  var n = 0;
  return function (titulo) { n++; return '<h2>' + n + '. ' + CertCalGest_esc_(titulo) + '</h2>'; };
}

function CertCalGest_htmlRenovacao_(ctx, ia, meta) {
  meta = meta || {};
  var num = RelTecA4_numerador_(), secao = CertCalGest_secoes_();
  var acao = ctx.itens.slice().sort(function (a, b) {
    var pa = CertCalGest_prioridade_(a), pb = CertCalGest_prioridade_(b);
    return pa.n - pb.n || (Number(a.diasRestantes) || 0) - (Number(b.diasRestantes) || 0) || String(a.tag).localeCompare(String(b.tag));
  });
  var k = ctx.contagens;
  var h = secao('Situação dos padrões');
  h += CertCalGest_kpis_([
    [SGO_DocA4_num_(ctx.total, 0), ctx.total === 1 ? 'Padrão ativo' : 'Padrões ativos'],
    [SGO_DocA4_num_(k.VENCIDO, 0), k.VENCIDO === 1 ? 'Vencido' : 'Vencidos'],
    [SGO_DocA4_num_(k.VENCENDO, 0), 'Vencendo em até 30 dias'],
    [SGO_DocA4_num_(ctx.comErros, 0), ctx.comErros === 1 ? 'Cadastro a revisar' : 'Cadastros a revisar']
  ]);
  var lg = Object.keys(ctx.porGrandeza).sort();
  h += num.figura(CertCalGest_svgBarras_(lg, lg.map(function (g) { return ctx.porGrandeza[g]; }), ['#1f5fa8']), 'Padrões ativos por grandeza (classificação pela descrição do cadastro).');
  h += secao('Análise') + CertCalGest_iaHtml_(ia.resumo) +
    '<div class="callout"><p class="tit">Sequência recomendada</p>' + CertCalGest_iaHtml_(ia.prioridades) + '</div>';
  h += secao('Mapa dos padrões em ordem de prioridade') +
    '<div class="legenda"><span class="p1">P1: vencido</span><span class="p2">P2: sem validade ou data inválida</span><span class="p3">P3: vence em até 30 dias</span><span class="p4">P4: cadastro incompleto</span><span class="p5">P5: regular</span></div>' +
    num.tabela('Padrões ativos, do mais urgente ao regular') +
    '<div class="tabela-wrap"><table class="t"><thead><tr><th>Prioridade</th><th>TAG</th><th>Certificado atual</th><th>Grandeza</th><th>Descrição</th><th>Dados metrológicos</th><th>Validade</th><th>Situação e pendências</th></tr></thead><tbody>' +
    (acao.length ? acao.map(function (i) {
      var p = CertCalGest_prioridade_(i);
      var situacao = i.situacao === 'OK' ? 'Vigente' : i.label;
      return '<tr class="' + p.classe + '"><td class="nw"><b>P' + p.n + '</b></td><td class="nw">' + CertCalGest_esc_(i.tag) + '</td><td class="nw">' + CertCalGest_esc_(i.certificado || '—') + '</td><td>' + CertCalGest_esc_(i.grandeza) + '</td><td>' + CertCalGest_esc_(i.descricao) + '</td><td>U95 ' + CertCalGest_numero_(i.u95) + '; k ' + CertCalGest_numero_(i.k) + '; Veff ' + CertCalGest_veff_(i.veff) + '</td><td class="nw">' + CertCalGest_esc_(i.validade || 'Não informada') + '</td><td>' + CertCalGest_esc_(situacao) + (i.erros.length ? '; ' + CertCalGest_esc_(i.erros.join('; ')) : '') + '</td></tr>';
    }).join('') : '<tr><td colspan="8">Nenhum padrão ativo no cadastro.</td></tr>') +
    '</tbody></table></div>';
  h += '<div class="manter">' + secao('Fluxo para a renovação') + '<ol><li>Separe os itens vencidos e os que vencem em até 30 dias.</li><li>Solicite <b>três orçamentos comparáveis</b>, informando exatamente TAG, grandeza, faixa e pontos necessários.</li><li>Peça proposta e certificado com <b>validade de 3 anos</b>.</li><li>Consulte a base oficial da RBC/Cgcre e confirme que o laboratório tem escopo acreditado para a grandeza, o método e a faixa contratados.</li><li>Compare preço, prazo, frete, ajuste ou manutenção, incerteza oferecida, abrangência dos pontos e tratamento de item fora de tolerância.</li><li>Antes de aprovar, registre a escolha e guarde as três propostas.</li></ol></div>';
  h += secao('Conferência de cada certificado recebido') + '<div class="callout erro"><p><b>Solicite correção imediata ao laboratório</b> se houver ausência ou erro. Não altere o PDF por conta própria e não use o padrão até receber a revisão correta.</p></div>' +
    '<ol><li>Confirme laboratório, número único, cliente, identificação (TAG), fabricante, modelo e série.</li><li>Confira as datas de calibração, de emissão e a validade de 3 anos solicitada.</li><li>Confira grandeza, unidade, método, faixa e todos os pontos contratados.</li><li>Confira resultados, correções ou tendências, U95, fator k, Veff e unidade da incerteza.</li><li>Confirme a rastreabilidade e o escopo RBC/Cgcre compatível; o símbolo sozinho não prova a cobertura daquela faixa.</li><li>Verifique condições ambientais, procedimento, assinaturas, páginas e anexos.</li><li>Compare o certificado com a proposta e com a identificação física do padrão.</li><li>Se a validade estiver ausente, a faixa ou a grandeza estiverem erradas, a TAG não corresponder, houver casas decimais alteradas ou qualquer incoerência, bloqueie o cadastro e peça certificado revisado.</li><li>Cadastre os dados exatamente como aparecem e anexe o PDF corrigido.</li></ol>';
  return CertCalGest_baseHtml_({
    titulo: 'Plano de renovação e auditoria dos padrões', tituloCurto: 'Plano de renovação dos padrões', numero: meta.numero,
    ficha: [['Emitido em', ctx.geradoEm], ['Emitido por', meta.emissor], ['Base', 'Cadastro de padrões de referência ativos']]
  }, h);
}

function CertCalGest_htmlDesempenho_(ctx, ia, meta) {
  meta = meta || {};
  var num = RelTecA4_numerador_(), secao = CertCalGest_secoes_();
  var h = secao('Indicadores do período');
  h += CertCalGest_kpis_([
    [SGO_DocA4_num_(ctx.totalCertificados, 0), ctx.totalCertificados === 1 ? 'Certificado emitido' : 'Certificados emitidos'],
    [SGO_DocA4_num_(ctx.clientesAtendidos, 0), ctx.clientesAtendidos === 1 ? 'Cliente atendido' : 'Clientes atendidos'],
    [SGO_DocA4_num_(ctx.equipamentosAtendidos, 0), ctx.equipamentosAtendidos === 1 ? 'Equipamento atendido' : 'Equipamentos atendidos'],
    [SGO_DocA4_num_(ctx.pontosCalibrados, 0), ctx.pontosCalibrados === 1 ? 'Ponto calibrado' : 'Pontos calibrados']
  ]);
  h += num.tabela('Índices do processo no período') +
    '<table class="t"><thead><tr><th>Indicador</th><th class="num">Resultado</th><th>Leitura gerencial</th></tr></thead><tbody>' +
    '<tr><td>Certificados com relatório interpretativo</td><td class="num">' + SGO_DocA4_num_(ctx.comRelatorioIA, 0) + ' de ' + SGO_DocA4_num_(ctx.totalCertificados, 0) + ' (' + SGO_DocA4_num_(ctx.coberturaIA, 2) + ' %)</td><td>Cobertura da explicação técnica complementar.</td></tr>' +
    '<tr><td>Padrões válidos</td><td class="num">' + SGO_DocA4_num_(ctx.padroes.validos, 0) + ' de ' + SGO_DocA4_num_(ctx.padroes.total, 0) + '</td><td>Disponibilidade metrológica atual.</td></tr>' +
    '<tr><td>Padrões vencidos / vencendo em até 30 dias</td><td class="num">' + SGO_DocA4_num_(ctx.padroes.vencidos, 0) + ' / ' + SGO_DocA4_num_(ctx.padroes.vencendo, 0) + '</td><td>Demanda de renovação.</td></tr>' +
    '<tr><td>Padrões sem validade / com cadastro a revisar</td><td class="num">' + SGO_DocA4_num_(ctx.padroes.semValidade, 0) + ' / ' + SGO_DocA4_num_(ctx.padroes.invalidos, 0) + '</td><td>Risco documental a tratar.</td></tr>' +
    '</tbody></table>';
  h += secao('Análise') + CertCalGest_iaHtml_(ia.resumo) +
    '<div class="callout"><p class="tit">Pontos de atenção</p>' + CertCalGest_iaHtml_(ia.prioridades) + '</div>';
  var lg = Object.keys(ctx.grandezas).sort();
  h += secao('Distribuição por grandeza');
  h += num.figura(CertCalGest_svgBarras_(lg, lg.map(function (g) { return ctx.grandezas[g]; }), ['#1f5fa8']), 'Pontos calibrados por grandeza no período (soma dos pontos de todos os certificados).');
  h += secao('Rotina recomendada') + '<ol><li>Acompanhar mensalmente emissões, clientes, equipamentos e pontos calibrados.</li><li>Investigar certificados sem relatório interpretativo quando ele for necessário ao cliente.</li><li>Revisar padrões vencidos, vencendo e sem validade antes de novas emissões.</li><li>Verificar se as grandezas executadas estão cobertas por padrões adequados e dentro da faixa.</li><li>Registrar correções de cadastro e manter o PDF de origem anexado.</li></ol>';
  return CertCalGest_baseHtml_({
    titulo: 'Desempenho da emissão de certificados de calibração', tituloCurto: 'Desempenho dos certificados de calibração', numero: meta.numero,
    ficha: [['Período', ctx.periodo], ['Emitido em', meta.emitidoEm], ['Emitido por', meta.emissor]]
  }, h);
}

function CertCalGest_meta_(sessionId, sigla) {
  var nome = '';
  try { var s = exigirSessao(sessionId); nome = SGO_UTILS.safe(s.nome) || SGO_UTILS.safe(s.usuario); } catch (e) { nome = ''; }
  var emitidoEm = '';
  try { emitidoEm = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'America/Sao_Paulo', 'dd/MM/yyyy HH:mm'); } catch (e2) { emitidoEm = ''; }
  return { numero: RelTecA4_numeroAuto_(sigla), emissor: nome || '—', emitidoEm: emitidoEm };
}

function CertCal_apiGerarRelatorioRenovacao(sessionId) {
  if (!isAdminSession(sessionId)) throw new Error('Acesso restrito a Gestor/Administrador.');
  CertCal_bootstrap_();
  var ctx = CertCalGest_contextoPadroes_();
  var proximos = ctx.itens.filter(function (i) { return isFinite(Number(i.diasRestantes)) && i.diasRestantes !== null && Number(i.diasRestantes) >= 0; })
    .sort(function (a, b) { return Number(a.diasRestantes) - Number(b.diasRestantes); }).slice(0, 3)
    .map(function (i) { return { tag: i.tag, validade: i.validade, dias: Number(i.diasRestantes) }; });
  var ia = CertCalGestIA_gerarOuAviso_('RENOVACAO', { total: ctx.total, contagens: ctx.contagens, comErros: ctx.comErros, porGrandeza: ctx.porGrandeza, proximos: proximos });
  var meta = CertCalGest_meta_(sessionId, 'REN');
  return CertCalGest_salvar_('Plano de renovacao dos padroes - ' + meta.numero + ' - Padroes ativos', CertCalGest_htmlRenovacao_(ctx, ia, meta), ia);
}

function CertCal_apiGerarRelatorioDesempenho(sessionId, payload) {
  if (!isAdminSession(sessionId)) throw new Error('Acesso restrito a Gestor/Administrador.');
  CertCal_bootstrap_();
  var dias = Number((payload || {}).periodoDias);
  if (!isFinite(dias) || dias < 0) dias = 90;
  var ctx = CertCalGest_contextoDesempenho_(dias);
  var ia = CertCalGestIA_gerarOuAviso_('DESEMPENHO', ctx);
  var meta = CertCalGest_meta_(sessionId, 'DES');
  return CertCalGest_salvar_('Desempenho dos certificados de calibracao - ' + meta.numero + ' - ' + (dias > 0 ? dias + ' dias' : 'Todo o historico'), CertCalGest_htmlDesempenho_(ctx, ia, meta), ia);
}

/**
 * Gráfico de barras horizontais em SVG para a largura total da coluna (177 mm):
 * 640 unidades → texto de 11 unidades sai com cerca de 8,5 pt no papel.
 */
function CertCalGest_svgBarras_(rotulos, valores, cores) {
  rotulos = rotulos || []; valores = (valores || []).map(function (v) { return Number(v) || 0; });
  cores = cores || ['#1f5fa8'];
  var W = 640, esq = 190, dir = 50, alt = 24, topo = 6;
  if (!rotulos.length) {
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + ' 40" width="' + W + '" height="40" font-family="Arial,Helvetica,sans-serif" font-size="11"><text x="0" y="24" fill="#3e4c59">Sem dados no período.</text></svg>';
  }
  var max = Math.max.apply(null, [1].concat(valores));
  var larg = W - esq - dir;
  var H = topo + rotulos.length * alt + 6;
  var s = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '" font-family="Arial,Helvetica,sans-serif" font-size="11" role="img">';
  s += '<line x1="' + esq + '" x2="' + esq + '" y1="' + topo + '" y2="' + (H - 6) + '" stroke="#9aa5b1" stroke-width="1"/>';
  rotulos.forEach(function (r, i) {
    var y = topo + i * alt, w = Math.round(larg * valores[i] / max);
    s += '<text x="' + (esq - 8) + '" y="' + (y + 16) + '" text-anchor="end" fill="#1f2933">' + CertCalGest_esc_(String(r).slice(0, 34)) + '</text>';
    s += '<rect x="' + esq + '" y="' + (y + 4) + '" width="' + Math.max(w, valores[i] > 0 ? 2 : 0) + '" height="16" fill="' + (cores[i] || cores[0]) + '"/>';
    s += '<text x="' + (esq + w + 6) + '" y="' + (y + 16) + '" fill="#1f2933" font-weight="700">' + SGO_DocA4_num_(valores[i], 0) + '</text>';
  });
  return s + '</svg>';
}

/** Grava HTML + PDF do relatório gerencial na pasta do laboratório (documento interno). Nunca impede a exibição. */
function CertCalGest_salvar_(nomeBase, html, ia) {
  var r = { ok: true, html: html, avisos: [] };
  if (ia && ia.aviso) r.avisos.push(ia.aviso);
  try {
    var raiz = CertCal_obterPastaDocumentos_();
    var it = raiz.getFoldersByName('Relatorios gerenciais dos padroes');
    var pasta = it.hasNext() ? it.next() : raiz.createFolder('Relatorios gerenciais dos padroes');
    var tz = Session.getScriptTimeZone() || 'America/Sao_Paulo';
    var s = SGO_DocSalvar_salvarHtmlEPdf_(pasta, nomeBase + ' - ' + Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd HHmm'), html);
    r.pdfUrl = s.pdfUrl; r.htmlUrl = s.htmlUrl; r.linkPdf = s.pdfUrl;
    if (s.html) r.html = s.html;
  } catch (e) {
    r.avisos.push('O relatório foi gerado, mas não foi gravado na pasta dos relatórios gerenciais: ' + (e && e.message ? e.message : e) + '. Use "Imprimir ou salvar em PDF" para guardar esta via.');
  }
  return r;
}
