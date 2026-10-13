/****************************************************
 * METROLABS — AUTOCLAVE — MEMÓRIA DE CÁLCULO DO F0
 * Terceira forma de documento do módulo (além do Relatório de Auditoria
 * em Planilha/PDF e da Interpretação Técnica do Ensaio em
 * SGO_AutoRel_CertificadoRelatorio.js): mostra, leitura a leitura e por
 * sensor ativo, exatamente como o F0 certificado foi calculado — pra o
 * técnico usar na explicação ao cliente de por que o F0 (ex.: 117,55 min)
 * é muito maior que o tempo relógio de exposição (ex.: 4,5 min).
 *
 * REGRA DE OURO (pedido explícito do usuário, 2026-08-21): os números
 * aqui têm que ser IDÊNTICOS aos do certificado/relatório de auditoria,
 * nunca uma segunda conta em paralelo. Por isso este arquivo nunca
 * recalcula F0 — ele só formata analise.memoriaF0PorSensor e
 * analise.f0PorSensor, que SGO_AutoRel_AnaliseCiclo.js já monta dentro do
 * mesmíssimo laço que soma o F0 oficial (ver comentário lá, PASSO 4).
 *
 * Documento só existe pra CICLO_TERMICO — Leak Test não tem F0/sensores
 * de temperatura, então essa opção nem aparece nesse modo.
 ****************************************************/

/**
 * Monta o "pacote de fatos" da memória de F0 a partir do mesmo payload já
 * usado pela Interpretação Técnica (reaproveita
 * AutoRel_acExecutarAnaliseCompleta_ — nunca uma segunda leitura/análise
 * dos dados brutos).
 */
function AutoRel_mf0MontarContexto_(payload) {
  payload = payload || {};

  if (String(payload.tipoRelatorio || '').toUpperCase().trim() === 'LEAK_TEST') {
    throw new Error('A Memória de Cálculo do F0 está disponível apenas para ciclos térmicos (não se aplica ao Leak Test).');
  }

  const resultado = AutoRel_acExecutarAnaliseCompleta_(payload);
  const a = resultado.analise;
  const cicloCfg = resultado.cicloCfg || {};

  const f0MinNormativo = a.limitesAprovacao && typeof a.limitesAprovacao.f0MinNormativo === 'number'
    ? a.limitesAprovacao.f0MinNormativo
    : AutoRel_parseFloatSeguro_(cicloCfg.f0MinNormativo, 0);

  const sensores = [];
  (a.sensoresAtivos || []).forEach(function(ativo, s) {
    if (!ativo) return;
    const f0 = (a.f0PorSensor || [])[s];
    sensores.push({
      sensor: 'S' + (s + 1),
      f0: (f0 === null || f0 === undefined) ? null : f0,
      leituras: (a.memoriaF0PorSensor && a.memoriaF0PorSensor[s]) || [],
      conforme: (f0 !== null && f0 !== undefined) ? (f0 >= f0MinNormativo) : null
    });
  });

  return {
    equipamentoLabel: AutoRel_acLabelCiclo_(resultado.motor, cicloCfg),
    identificacao: {
      cliente: String(payload.cliente || '').trim(),
      setor: String(payload.setor || payload.localizacao || payload.local || '').trim(),
      tag: String(payload.tag || payload.tagEquipamento || '').trim(),
      dataDoEnsaio: AutoRel_acExtrairDataDoTexto_(a.tempoInicioExposicao || a.tempoInicioCiclo || ''),
      tecnicoExecutor: String(payload.responsavelTecnico || payload.respTecnico || payload.operador || '').trim(),
      empresaExecutante: AutoRel_UCFG.EMPRESA_EXECUTANTE
    },
    tBase: a.configuracaoCiclo.tBase,
    z: a.configuracaoCiclo.z,
    dtMin: a.deltaMinutosEstimado,
    f0MinNormativo: f0MinNormativo,
    piorSensorF0: a.piorSensorF0 || null,
    tempoInicioExposicao: a.tempoInicioExposicao || '',
    tempoFimExposicao: a.tempoFimExposicao || '',
    tempoExposicaoMinutos: a.tempoExposicaoMinutos,
    statusAprovacao: a.statusAprovacao,
    quantidadeSensoresUtilizados: a.quantidadeSensoresUtilizados,
    sensores: sensores
  };
}

// ------------------------------------------------------------
// FORMATAÇÃO (pt-BR, vírgula decimal)
// ------------------------------------------------------------
function AutoRel_mf0Num_(v, casas) {
  if (v === null || v === undefined || !isFinite(v)) return '—';
  return Number(v).toFixed(casas == null ? 2 : casas).replace('.', ',');
}

function AutoRel_mf0SoTempo_(tempoStr) {
  const s = String(tempoStr || '').trim();
  if (!s) return '—';
  const partes = s.split(' ');
  return partes.length > 1 ? partes[partes.length - 1] : s;
}

function AutoRel_mf0MediaLeituras_(leituras) {
  if (!leituras || !leituras.length) return null;
  let soma = 0;
  leituras.forEach(function(r) { soma += r.temperatura; });
  return soma / leituras.length;
}

function AutoRel_mf0MediaFator_(leituras) {
  if (!leituras || !leituras.length) return null;
  let soma = 0;
  leituras.forEach(function(r) { soma += r.fator; });
  return soma / leituras.length;
}

// ------------------------------------------------------------
// MONTAGEM DO DOCUMENTO HTML (A4) — mesma linguagem visual do módulo
// (folha branca A4, topo azul/verde) já usada em Certificado.html
// ------------------------------------------------------------
function AutoRel_mf0MontarDocumentoHtml_(ctx) {
  const empresa = ctx.identificacao.empresaExecutante || { nome: 'Metrolab Soluções em Engenharia Clínica LTDA', cnpj: '' };
  const logo = AutoRel_UCFG.LOGO_BASE64;
  const geradoEm = Utilities.formatDate(new Date(), AutoRel_UCFG.TZ || Session.getScriptTimeZone(), 'dd/MM/yyyy');

  const statusUp = String(ctx.statusAprovacao || '').toUpperCase();
  const classeStatus = statusUp.indexOf('REPROVADO') !== -1 ? 'reprovado' : (statusUp.indexOf('ALERTA') !== -1 ? 'alerta' : 'aprovado');
  const textoStatus = classeStatus === 'reprovado' ? 'REPROVADO' : (classeStatus === 'alerta' ? 'APROVADO COM ALERTA' : 'APROVADO');

  const html = [];
  html.push('<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">');
  html.push('<title>Memória de Cálculo do F0' + (ctx.identificacao.tag ? (' — ' + AutoRel_acEscaparHtml_(ctx.identificacao.tag)) : '') + '</title>');
  html.push('<style>');
  html.push('@page { size: A4; margin: 18mm 16mm; }');
  html.push('* { box-sizing: border-box; }');
  html.push('body { font-family: Arial, Helvetica, sans-serif; color: #1f2937; font-size: 12px; line-height: 1.55; margin: 0; background: #f3f4f6; }');
  html.push('.folha { max-width: 900px; margin: 24px auto; background: #ffffff; padding: 28px 34px 40px; box-shadow: 0 2px 10px rgba(0,0,0,.12); }');
  html.push('.topo { display:flex; justify-content:space-between; align-items:flex-end; border-bottom:3px solid #007b3e; padding-bottom:10px; margin-bottom:22px; }');
  html.push('.topo .marca { font-size:20px; font-weight:800; color:#0b4ea2; }');
  html.push('.topo .marca .logo-topo { display:block; height:42px; width:auto; margin-bottom:4px; }');
  html.push('.topo .marca small { display:block; font-size:10px; font-weight:400; color:#6b7280; }');
  html.push('.topo .meta { text-align:right; font-size:11px; color:#374151; }');
  html.push('.topo .meta strong { color:#0b4ea2; font-size:12px; }');
  html.push('.capa-titulo { text-align:center; margin:10px 0 24px; }');
  html.push('.capa-titulo h1 { font-size:21px; color:#0b4ea2; margin:0 0 6px; }');
  html.push('.capa-titulo p { margin:0; color:#059669; font-weight:600; }');
  html.push('table.info { width:100%; border-collapse:collapse; margin:14px 0 20px; font-size:11.5px; page-break-inside:avoid; }');
  html.push('table.info td { border:1px solid #d1d5db; padding:7px 10px; vertical-align:top; }');
  html.push('table.info td.rotulo { background:#f3f4f6; font-weight:700; width:34%; color:#374151; }');
  html.push('.status-banner { text-align:center; font-weight:800; font-size:13px; padding:12px; border-radius:4px; border:2px solid; margin:18px 0; letter-spacing:.3px; }');
  html.push('.status-banner.aprovado { background:rgba(5,150,105,.10); border-color:#059669; color:#047857; }');
  html.push('.status-banner.alerta { background:rgba(217,119,6,.10); border-color:#d97706; color:#b45309; }');
  html.push('.status-banner.reprovado { background:rgba(220,38,38,.10); border-color:#dc2626; color:#b91c1c; }');
  html.push('.secao { margin-top:26px; page-break-inside:avoid; }');
  html.push('.secao h2 { font-size:13px; color:#ffffff; background:#0b4ea2; padding:8px 12px; margin:0 0 12px; border-left:6px solid #059669; }');
  html.push('.secao h3 { font-size:12.5px; color:#ffffff; background:#374151; padding:7px 12px; margin:22px 0 10px; display:flex; justify-content:space-between; align-items:center; }');
  html.push('.secao h3 .tag-f0 { font-family: "Courier New", monospace; font-weight:700; }');
  html.push('.prosa p { margin:0 0 10px; text-align:justify; }');
  html.push('table.escala { border-collapse:collapse; width:100%; font-size:11.5px; margin:8px 0; }');
  html.push('table.escala th, table.escala td { border:1px solid #d1d5db; padding:6px 9px; text-align:center; }');
  html.push('table.escala thead th { background:#e5e7eb; color:#374151; font-size:10.5px; text-transform:uppercase; }');
  html.push('table.escala td.destaque-linha { background:#eff6ff; font-weight:700; }');
  html.push('.tabela-wrap { overflow-x:auto; margin:6px 0; }');
  html.push('table.leituras { border-collapse:collapse; width:100%; font-size:10.8px; min-width:520px; }');
  html.push('table.leituras thead { display: table-header-group; }');
  html.push('table.leituras th, table.leituras td { border:1px solid #d1d5db; padding:5px 7px; text-align:center; }');
  html.push('table.leituras thead th { background:#dbeafe; color:#1e3a8a; font-size:10px; text-transform:uppercase; }');
  html.push('table.leituras tbody tr:nth-child(even) { background:#f9fafb; }');
  html.push('table.leituras td.temp { color:#b45309; font-weight:600; }');
  html.push('table.leituras tfoot td { font-weight:800; background:#eafbf0; color:#065f46; border-top:2px solid #059669; }');
  html.push('.nota-tabela { font-size:10px; color:#6b7280; margin-top:4px; }');
  html.push('table.comparativo { border-collapse:collapse; width:100%; font-size:11.5px; margin:8px 0; }');
  html.push('table.comparativo th, table.comparativo td { border:1px solid #d1d5db; padding:7px 9px; text-align:center; }');
  html.push('table.comparativo thead th { background:#0b4ea2; color:#fff; font-size:10.5px; text-transform:uppercase; }');
  html.push('table.comparativo td.pior-sensor { background:#fef3c7; font-weight:700; }');
  html.push('table.comparativo td.status-conforme { color:#047857; font-weight:700; }');
  html.push('table.comparativo td.status-nao-conforme { color:#b91c1c; font-weight:700; }');
  html.push('.observacoes { font-size:10.5px; color:#4b5563; margin-top:6px; }');
  html.push('.observacoes p { margin:5px 0; text-align:justify; }');
  html.push('.rodape-doc { margin-top:30px; padding-top:8px; border-top:1px solid #d1d5db; font-size:10px; color:#6b7280; text-align:center; }');
  html.push('.barra-imprimir { max-width:900px; margin:0 auto 12px; text-align:right; }');
  html.push('.barra-imprimir button { background:#0b4ea2; color:#fff; border:none; padding:10px 18px; border-radius:4px; font-weight:700; cursor:pointer; font-size:13px; }');
  html.push('@media print { body { background:#ffffff; } .folha { box-shadow:none; margin:0; padding:0; max-width:none; } .no-print { display:none !important; } .secao { page-break-inside:auto; } }');
  html.push('</style></head><body>');

  html.push('<div class="barra-imprimir no-print"><button onclick="window.print()">Imprimir / Salvar como PDF</button></div>');
  html.push('<div class="folha">');

  html.push('<div class="topo"><div class="marca">');
  if (logo && logo.data) {
    html.push('<img class="logo-topo" src="data:' + logo.mimeType + ';base64,' + logo.data + '" alt="Metrolab\'s">');
  } else {
    html.push('Metrolab\'s');
  }
  html.push('<small>' + AutoRel_acEscaparHtml_(empresa.nome) + (empresa.cnpj ? (' – CNPJ ' + AutoRel_acEscaparHtml_(empresa.cnpj)) : '') + '</small>');
  html.push('</div><div class="meta"><strong>' + AutoRel_acEscaparHtml_(ctx.identificacao.tag || ctx.equipamentoLabel) + '</strong><br>' + AutoRel_acEscaparHtml_(geradoEm) + '</div></div>');

  html.push('<div class="capa-titulo"><h1>MEMÓRIA DE CÁLCULO DO F0</h1><p>Demonstração leitura a leitura, por sensor — complementar à Interpretação Técnica do mesmo ensaio</p></div>');

  html.push('<div class="status-banner ' + classeStatus + '">RESULTADO DESTE ENSAIO: ' + textoStatus + '</div>');

  html.push('<div class="secao"><h2>1. IDENTIFICAÇÃO</h2><table class="info">');
  html.push('<tr><td class="rotulo">Cliente</td><td>' + AutoRel_acEscaparHtml_(ctx.identificacao.cliente || '—') + '</td></tr>');
  html.push('<tr><td class="rotulo">Setor / Local</td><td>' + AutoRel_acEscaparHtml_(ctx.identificacao.setor || '—') + '</td></tr>');
  html.push('<tr><td class="rotulo">Equipamento</td><td>' + AutoRel_acEscaparHtml_(ctx.equipamentoLabel) + (ctx.identificacao.tag ? (' — TAG ' + AutoRel_acEscaparHtml_(ctx.identificacao.tag)) : '') + '</td></tr>');
  html.push('<tr><td class="rotulo">Data do ensaio</td><td>' + AutoRel_acEscaparHtml_(ctx.identificacao.dataDoEnsaio || '—') + '</td></tr>');
  html.push('<tr><td class="rotulo">Janela de exposição</td><td>' + AutoRel_acEscaparHtml_(AutoRel_mf0SoTempo_(ctx.tempoInicioExposicao)) + ' às ' + AutoRel_acEscaparHtml_(AutoRel_mf0SoTempo_(ctx.tempoFimExposicao)) + ' (' + AutoRel_mf0Num_(ctx.tempoExposicaoMinutos, 1) + ' min)</td></tr>');
  html.push('<tr><td class="rotulo">Técnico executor</td><td>' + AutoRel_acEscaparHtml_(ctx.identificacao.tecnicoExecutor || '—') + '</td></tr>');
  html.push('</table></div>');

  html.push('<div class="secao"><h2>2. FUNDAMENTAÇÃO TÉCNICA</h2><div class="prosa">');
  html.push('<p>O F0 não mede tempo de relógio: ele converte o efeito germicida obtido na temperatura real do ensaio para uma escala de referência fixa em ' + AutoRel_mf0Num_(ctx.tBase, 1) + ' °C, conforme ABNT NBR 16328 / ISO 17665-1. Como o efeito do calor sobre microrganismos cresce em degraus multiplicativos com a temperatura — cada ' + AutoRel_mf0Num_(ctx.z, 0) + ' °C acima da referência multiplica a velocidade de esterilização por dez — um minuto de exposição na temperatura real do ciclo vale muito mais que um minuto de F0.</p>');
  html.push('</div>');
  html.push('<table class="escala"><thead><tr><th>Temperatura</th><th>Relação com a referência</th><th>Fator de equivalência</th></tr></thead><tbody>');
  html.push('<tr class="destaque-linha"><td>' + AutoRel_mf0Num_(ctx.tBase, 1) + ' °C</td><td>referência da norma</td><td>1,0×</td></tr>');
  html.push('<tr><td>' + AutoRel_mf0Num_(ctx.tBase + 10, 1) + ' °C</td><td>+10 °C</td><td>10×</td></tr>');

  const piorSensorObj = ctx.sensores.find(function(sv) { return ctx.piorSensorF0 && sv.sensor === ctx.piorSensorF0.sensor; });
  if (piorSensorObj && piorSensorObj.leituras.length) {
    const mediaTempPior = AutoRel_mf0MediaLeituras_(piorSensorObj.leituras);
    const mediaFatorPior = AutoRel_mf0MediaFator_(piorSensorObj.leituras);
    html.push('<tr><td>' + AutoRel_mf0Num_(mediaTempPior, 1) + ' °C</td><td>média do pior sensor (' + AutoRel_acEscaparHtml_(piorSensorObj.sensor) + ') na exposição</td><td>≈ ' + AutoRel_mf0Num_(mediaFatorPior, 1) + '×</td></tr>');
  }
  html.push('<tr><td>' + AutoRel_mf0Num_(ctx.tBase + 20, 1) + ' °C</td><td>+20 °C</td><td>100×</td></tr>');
  html.push('</tbody></table>');
  html.push('<p class="nota-tabela">No ponto mais frio do ciclo, cada minuto real de exposição já equivale a dezenas de minutos na escala de referência — é por isso que o F0 final soma muito mais que o tempo de relógio da exposição.</p>');
  html.push('</div>');

  html.push('<div class="secao"><h2>3. MEMÓRIA DE CÁLCULO — POR SENSOR</h2>');
  html.push('<div class="prosa"><p>Cálculo aplicado a cada leitura do datalogger dentro da janela de exposição: <strong>F0 = 10^((T − ' + AutoRel_mf0Num_(ctx.tBase, 1) + ') / ' + AutoRel_mf0Num_(ctx.z, 0) + ') × Δt</strong>, com Δt = ' + AutoRel_mf0Num_(ctx.dtMin, 2) + ' min entre leituras.</p></div>');

  ctx.sensores.forEach(function(sv) {
    html.push('<h3><span>Sensor ' + AutoRel_acEscaparHtml_(sv.sensor) + '</span><span class="tag-f0">F0 = ' + AutoRel_mf0Num_(sv.f0, 4) + ' min</span></h3>');

    if (!sv.leituras.length) {
      html.push('<p class="nota-tabela">Sem leituras válidas deste sensor na janela de exposição identificada.</p>');
      return;
    }

    html.push('<div class="tabela-wrap"><table class="leituras"><thead><tr><th>Horário</th><th>Temperatura</th><th>Fator (10^Δ⁄' + AutoRel_mf0Num_(ctx.z, 0) + ')</th><th>F0 no intervalo</th><th>F0 acumulado</th></tr></thead><tbody>');
    sv.leituras.forEach(function(r) {
      html.push('<tr><td>' + AutoRel_acEscaparHtml_(AutoRel_mf0SoTempo_(r.tempoStr)) + '</td><td class="temp">' + AutoRel_mf0Num_(r.temperatura, 2) + ' °C</td><td>' + AutoRel_mf0Num_(r.fator, 1) + '×</td><td>' + AutoRel_mf0Num_(r.contribuicao, 2) + ' min</td><td>' + AutoRel_mf0Num_(r.acumulado, 2) + ' min</td></tr>');
    });
    html.push('</tbody><tfoot><tr><td colspan="4">F0 do sensor ' + AutoRel_acEscaparHtml_(sv.sensor) + ' — soma das ' + sv.leituras.length + ' leituras da janela de exposição</td><td>' + AutoRel_mf0Num_(sv.f0, 4) + ' min</td></tr></tfoot></table></div>');
  });
  html.push('</div>');

  html.push('<div class="secao"><h2>4. COMPARATIVO FINAL ENTRE SENSORES</h2>');
  html.push('<table class="comparativo"><thead><tr><th>Sensor</th><th>F0 obtido</th><th>Mínimo normativo</th><th>Múltiplo do mínimo</th><th>Status</th></tr></thead><tbody>');
  ctx.sensores.forEach(function(sv) {
    const ehPior = ctx.piorSensorF0 && sv.sensor === ctx.piorSensorF0.sensor;
    const multiplo = (sv.f0 !== null && ctx.f0MinNormativo) ? (sv.f0 / ctx.f0MinNormativo) : null;
    const claCel = ehPior ? ' class="pior-sensor"' : '';
    const claStatus = sv.conforme === null ? '' : (sv.conforme ? ' status-conforme' : ' status-nao-conforme');
    html.push('<tr><td' + claCel + '>' + AutoRel_acEscaparHtml_(sv.sensor) + (ehPior ? ' (pior sensor)' : '') + '</td>' +
      '<td' + claCel + '>' + AutoRel_mf0Num_(sv.f0, 4) + ' min</td>' +
      '<td' + claCel + '>' + AutoRel_mf0Num_(ctx.f0MinNormativo, 1) + ' min</td>' +
      '<td' + claCel + '>' + (multiplo !== null ? (AutoRel_mf0Num_(multiplo, 1) + '×') : '—') + '</td>' +
      '<td class="' + claStatus.trim() + '">' + (sv.conforme === null ? '—' : (sv.conforme ? 'CONFORME' : 'NÃO CONFORME')) + '</td></tr>');
  });
  html.push('</tbody></table></div>');

  html.push('<div class="secao"><h2>Observações</h2><div class="observacoes">');
  html.push('<p>O F0 mínimo normativo representa o piso de segurança abaixo do qual o ciclo seria reprovado — não é uma meta a ser atingida por pouco, e sim o limiar mínimo aceitável.</p>');
  html.push('<p>O F0 é calculado exclusivamente na janela de exposição térmica do ciclo (fase de patamar/esterilização), conforme ABNT NBR 16328 / ISO 17665-1, não incluindo as fases de aquecimento (rampa) e despressurização/secagem.</p>');
  html.push('<p>Este documento tem caráter explicativo e demonstrativo. Os valores de F0 aqui exibidos são exatamente os mesmos apurados no Relatório de Auditoria e na Interpretação Técnica deste ensaio — este documento não substitui nenhum dos dois.</p>');
  html.push('</div></div>');

  html.push('<div class="rodape-doc">' + AutoRel_acEscaparHtml_(empresa.nome) + (empresa.cnpj ? (' — CNPJ ' + AutoRel_acEscaparHtml_(empresa.cnpj)) : '') + '<br>Documento gerado em ' + AutoRel_acEscaparHtml_(geradoEm) + '</div>');

  html.push('</div></body></html>');
  return html.join('\n');
}

// ------------------------------------------------------------
// API — chamada única (sem IA, sem etapa de rascunho: é cálculo puro)
// ------------------------------------------------------------
function AutoRel_apiGerarMemoriaF0(payload) {
  payload = payload || {};
  const ctx = AutoRel_mf0MontarContexto_(payload);
  const html = AutoRel_mf0MontarDocumentoHtml_(ctx);
  return { ok: true, html: html };
}
