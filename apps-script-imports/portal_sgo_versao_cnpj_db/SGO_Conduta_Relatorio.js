/****************************************************
 * PROGRAMA DE CONDUTA — RELATÓRIO MENSAL A4
 *
 * Mesmo padrão de Qualidade_montarRelatorioHtml_ (SGO_Qualidade_
 * Relatorio.js, mesma casa): @page{size:A4}, .secao{page-break-inside:
 * avoid}, botão .no-print de imprimir/salvar PDF.
 *
 * Os 8 blocos fixos da seção 8 do briefing: cabeçalho · narrativa (IA)
 * · composição do demérito · top 5 códigos · comparativo de 6 meses ·
 * missões · contestações · recomendação (IA). Só narrativa/recomendação
 * passam pela IA — o resto é tabela/número montado direto do dado já
 * congelado em qual_fechamento. O CONTEXTO mandado pra IA (ctx) NUNCA
 * inclui o array porColaborador (que tem nome+ID) — estrutural, não só
 * uma instrução de prompt.
 ****************************************************/

function CondutaRel_escaparHtml_(v) {
  return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

function CondutaRel_competenciaAnterior_(competencia) {
  var partes = competencia.split('-');
  var d = new Date(Number(partes[0]), Number(partes[1]) - 1 - 1, 1);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
}

/**
 * Monta o contexto agregado (sem nenhum nome de pessoa) a partir de um
 * fechamento JÁ congelado — exige que a competência tenha sido fechada
 * antes (Conduta_apiFecharCompetencia).
 */
function Conduta_montarContextoRelatorio_(competencia) {
  var todosFechamentos = SGO_DATA.getAll(CONDUTA_SHEETS.FECHAMENTO);
  var fechamento = todosFechamentos.find(function (f) { return Conduta_soComp_(f.COMPETENCIA) === competencia; });
  if (!fechamento) throw new Error('A competência ' + competencia + ' ainda não foi fechada — feche antes de gerar o relatório.');

  var porColaborador = JSON.parse(fechamento.RESULTADO_JSON || '[]');
  var sombra = SGO_UTILS.safeUpper(fechamento.SOMBRA) === 'TRUE' || fechamento.SOMBRA === true;

  var fechamentoAnterior = todosFechamentos.find(function (f) { return Conduta_soComp_(f.COMPETENCIA) === CondutaRel_competenciaAnterior_(competencia); });

  var ocorrenciasCompetencia = SGO_DATA.getAll(CONDUTA_SHEETS.OCORRENCIA).filter(function (o) { return Conduta_soComp_(o.COMPETENCIA) === competencia; });
  var ocorrenciasFirmes = ocorrenciasCompetencia.filter(function (o) { return SGO_UTILS.safeUpper(o.STATUS) === 'FIRME'; });
  var catalogo = SGO_DATA.getAll(CONDUTA_SHEETS.OCORRENCIA_TIPO);
  function tipoDe_(codigo) { return catalogo.find(function (t) { return SGO_UTILS.safeUpper(t.CODIGO) === SGO_UTILS.safeUpper(codigo); }); }

  var porGrupo = {};
  ocorrenciasFirmes.forEach(function (o) {
    var tipo = tipoDe_(o.TIPO_CODIGO);
    var grupo = tipo ? tipo.GRUPO : 'Outro';
    if (!porGrupo[grupo]) porGrupo[grupo] = { grupo: grupo, somaPeso: 0, qtdOcorrencias: 0 };
    porGrupo[grupo].somaPeso += Number(o.PESO_APLICADO) || 0;
    porGrupo[grupo].qtdOcorrencias += 1;
  });
  var composicaoPorGrupo = Object.keys(porGrupo).map(function (k) { return porGrupo[k]; })
    .sort(function (a, b) { return b.somaPeso - a.somaPeso; });

  var porCodigo = {};
  ocorrenciasFirmes.forEach(function (o) {
    if (!porCodigo[o.TIPO_CODIGO]) porCodigo[o.TIPO_CODIGO] = { codigo: o.TIPO_CODIGO, somaPeso: 0, qtdOcorrencias: 0 };
    porCodigo[o.TIPO_CODIGO].somaPeso += Number(o.PESO_APLICADO) || 0;
    porCodigo[o.TIPO_CODIGO].qtdOcorrencias += 1;
  });
  var top5Codigos = Object.keys(porCodigo).map(function (k) {
    var item = porCodigo[k];
    var tipo = tipoDe_(item.codigo);
    item.descricao = tipo ? tipo.DESCRICAO : '';
    return item;
  }).sort(function (a, b) { return b.somaPeso - a.somaPeso; }).slice(0, 5);

  var partesComp = competencia.split('-');
  var dataRef = new Date(Number(partesComp[0]), Number(partesComp[1]) - 1, 1);
  var comparativo6Meses = [];
  for (var i = 5; i >= 0; i--) {
    var d = new Date(dataRef.getFullYear(), dataRef.getMonth() - i, 1);
    var comp = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
    var f = todosFechamentos.find(function (x) { return Conduta_soComp_(x.COMPETENCIA) === comp; });
    comparativo6Meses.push({ competencia: comp, ico: f ? f.ICO : null, farol: f ? f.FAROL : null });
  }

  var missoesCompetencia = SGO_DATA.getAll(CONDUTA_SHEETS.MISSAO).filter(function (m) {
    return Conduta_soComp_(m.COMPETENCIA) === competencia && (SGO_UTILS.safeUpper(m.QUALIFICA) === 'TRUE' || m.QUALIFICA === true);
  });
  var valorTotalMissoes = porColaborador.reduce(function (soma, c) {
    return soma + (sombra ? (Number(c.valorSimuladoIncentivo) || 0) : (Number(c.valorIncentivo) || 0));
  }, 0);

  var qtdContestadas = ocorrenciasCompetencia.filter(function (o) { return !!o.CONTESTADA_EM; }).length;
  var qtdAnuladas = ocorrenciasCompetencia.filter(function (o) { return SGO_UTILS.safeUpper(o.STATUS) === 'ANULADA'; }).length;
  var qtdMantidas = ocorrenciasCompetencia.filter(function (o) { return !!o.CONTESTADA_EM && SGO_UTILS.safeUpper(o.STATUS) === 'FIRME'; }).length;

  var qtdColaboradoresComBonus = porColaborador.filter(function (c) { return c.recebeBonus; }).length;

  return {
    competencia: competencia,
    farol: fechamento.FAROL,
    ico: fechamento.ICO,
    D: fechamento.D,
    n: fechamento.N,
    temGG: SGO_UTILS.safeUpper(fechamento.TEM_GG) === 'TRUE' || fechamento.TEM_GG === true,
    sombra: sombra,
    icoMesAnterior: fechamentoAnterior ? fechamentoAnterior.ICO : null,
    qtdColaboradoresComBonus: qtdColaboradoresComBonus,
    qtdColaboradoresTotal: porColaborador.length,
    composicaoPorGrupo: composicaoPorGrupo,
    top5Codigos: top5Codigos,
    comparativo6Meses: comparativo6Meses,
    missoes: { qtdQualificadas: missoesCompetencia.length, valorTotal: valorTotalMissoes },
    contestacoes: { qtdContestadas: qtdContestadas, qtdAnuladas: qtdAnuladas, qtdMantidas: qtdMantidas }
  };
}

function CondutaRel_corFarol_(farol) {
  if (farol === 'VERDE') return '#059669';
  if (farol === 'AMARELO') return '#b45309';
  return '#dc2626';
}

// ---------------------------------------------------------------
// GAUGE/SINALEIRO — mesma geometria do gauge ao vivo do Portal
// (Conduta_montarGaugeSvg_, JS_Core.html), mas gerado aqui no servidor
// (documento é HTML estático, sem JS do Portal disponível) e com cores
// fixas em vez de var(--cor), já que o relatório é sempre tema claro
// pra impressão A4.
// ---------------------------------------------------------------
var CONDUTAREL_AMARELO_MIN = 70, CONDUTAREL_VERDE_MIN = 85;

function CondutaRel_anguloDoValor_(v) { return 180 - (v / 100) * 180; }
function CondutaRel_pontoGauge_(cx, cy, r, anguloGraus) {
  var rad = anguloGraus * Math.PI / 180;
  return { x: cx + r * Math.cos(rad), y: cy - r * Math.sin(rad) };
}
function CondutaRel_arcoGaugePath_(cx, cy, r, a1, a2) {
  var p1 = CondutaRel_pontoGauge_(cx, cy, r, a1), p2 = CondutaRel_pontoGauge_(cx, cy, r, a2);
  var largeArc = Math.abs(a1 - a2) > 180 ? 1 : 0;
  return 'M ' + p1.x.toFixed(2) + ' ' + p1.y.toFixed(2) + ' A ' + r + ' ' + r + ' 0 ' + largeArc + ' 1 ' + p2.x.toFixed(2) + ' ' + p2.y.toFixed(2);
}

function CondutaRel_montarGaugeSvg_(ico, farol) {
  var cx = 100, cy = 92, r = 76, sw = 14, gap = 2.2;
  var corFarol = CondutaRel_corFarol_(farol);

  function zona(v0, v1, cor) {
    var a0 = CondutaRel_anguloDoValor_(v0) - (v0 === 0 ? 0 : gap / 2);
    var a1 = CondutaRel_anguloDoValor_(v1) + (v1 === 100 ? 0 : gap / 2);
    return '<path d="' + CondutaRel_arcoGaugePath_(cx, cy, r, a0, a1) + '" fill="none" stroke="' + cor + '" stroke-width="' + sw + '" stroke-linecap="round"/>';
  }

  var zonas = zona(0, CONDUTAREL_AMARELO_MIN, '#dc2626') +
    zona(CONDUTAREL_AMARELO_MIN, CONDUTAREL_VERDE_MIN, '#b45309') +
    zona(CONDUTAREL_VERDE_MIN, 100, '#059669');

  var icoClamp = Math.max(0, Math.min(100, Number(ico) || 0));
  var anguloP = CondutaRel_anguloDoValor_(icoClamp);
  var pontaP = CondutaRel_pontoGauge_(cx, cy, r - sw / 2 - 10, anguloP);
  var baseEsq = CondutaRel_pontoGauge_(cx, cy, 7, anguloP + 90);
  var baseDir = CondutaRel_pontoGauge_(cx, cy, 7, anguloP - 90);
  var ponteiro = '<polygon points="' + pontaP.x.toFixed(2) + ',' + pontaP.y.toFixed(2) + ' ' + baseEsq.x.toFixed(2) + ',' + baseEsq.y.toFixed(2) + ' ' + baseDir.x.toFixed(2) + ',' + baseDir.y.toFixed(2) + '" fill="#1f2937"/>' +
    '<circle cx="' + cx + '" cy="' + cy + '" r="8.5" fill="#1f2937"/>' +
    '<circle cx="' + cx + '" cy="' + cy + '" r="4" fill="' + corFarol + '"/>';

  return '<svg viewBox="0 0 200 148" width="150" style="display:block;margin:0 auto">' + zonas + ponteiro +
    '<text x="' + cx + '" y="' + cy + '" text-anchor="middle" dy="26" font-size="28" font-weight="800" fill="#1f2937">' + Math.round(icoClamp) + '</text>' +
    '<text x="' + cx + '" y="' + cy + '" text-anchor="middle" dy="40" font-size="9.5" font-weight="700" letter-spacing="1" fill="#6b7280">ICO</text>' +
    '</svg>';
}

function Conduta_montarRelatorioHtml_(ctx, ia) {
  var cor = CondutaRel_corFarol_(ctx.farol);
  var html = [];
  html.push('<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">');
  html.push('<title>Relatório do Programa de Conduta — ' + CondutaRel_escaparHtml_(ctx.competencia) + '</title>');
  html.push('<script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js"></script>');
  html.push('<style>');
  html.push('@page { size: A4; margin: 16mm 15mm; }');
  html.push('* { box-sizing: border-box; }');
  html.push('body { font-family: Arial, Helvetica, sans-serif; color: #1f2937; font-size: 12.5px; line-height: 1.55; margin: 0; background: #f3f4f6; }');
  html.push('.folha { max-width: 900px; margin: 24px auto; background: #ffffff; padding: 26px 32px 40px; box-shadow: 0 2px 10px rgba(0,0,0,.12); }');
  html.push('.topo { display:flex; align-items:center; justify-content:space-between; border-bottom: 3px solid #0b4ea2; padding-bottom: 14px; margin-bottom: 18px; }');
  html.push('.logo-topo { height: 42px; }');
  html.push('.titulo-doc { text-align:right; }');
  html.push('.titulo-doc h1 { font-size: 17px; margin: 0; color:#0b4ea2; }');
  html.push('.titulo-doc small { color:#6b7280; }');
  html.push('.farol-badge { display:inline-block; padding: 4px 14px; border-radius: 999px; color:#fff; font-weight:700; font-size:12px; background:' + cor + '; }');
  html.push('.kpis { display:flex; gap: 10px; margin-bottom: 20px; flex-wrap: wrap; }');
  html.push('.kpi { flex: 1 1 21%; border: 1px solid #d1d5db; border-radius: 6px; padding: 10px 12px; text-align: center; }');
  html.push('.kpi .valor { font-size: 21px; font-weight: 800; color: #0b4ea2; }');
  html.push('.kpi .rotulo { font-size: 10.5px; color: #6b7280; }');
  html.push('.secao { margin-top: 22px; }');
  html.push('.secao h2 { font-size: 13px; color:#ffffff; background:#0b4ea2; padding: 8px 12px; margin: 0 0 12px; border-left: 6px solid #059669; }');
  html.push('p { text-align: justify; margin: 8px 0; }');
  html.push('table.tabela-q { border-collapse: collapse; width: 100%; font-size: 11px; }');
  html.push('table.tabela-q th, table.tabela-q td { border: 1px solid #d1d5db; padding: 5px 8px; text-align: left; }');
  html.push('table.tabela-q thead th { background: #0b4ea2; color: #fff; text-align: center; }');
  html.push('table.tabela-q tbody tr:nth-child(even) { background: #f3f4f6; }');
  html.push('table.tabela-q td.num, table.tabela-q th.num { text-align: center; font-variant-numeric: tabular-nums; }');
  html.push('.barra-imprimir { max-width: 900px; margin: 0 auto 12px; text-align: right; }');
  html.push('.barra-imprimir button { background:#0b4ea2; color:#fff; border:none; padding:10px 18px; border-radius:4px; font-weight:700; cursor:pointer; font-size:13px; }');
  html.push('.aviso-sombra { background:#fffbeb; border:1px solid #f59e0b; border-radius:6px; padding:8px 12px; margin-bottom:16px; font-size:11.5px; }');
  html.push('.cabecalho-flex { display:flex; align-items:center; gap:20px; margin-bottom:20px; flex-wrap:wrap; }');
  html.push('.cabecalho-flex .kpis { flex:1; min-width:260px; margin-bottom:0; }');
  html.push('.grafico-box { height:230px; margin:6px 0 14px; }');
  html.push('.grafico-box.baixo { height:190px; }');
  html.push('@media print { body { background:#ffffff; } .folha { box-shadow:none; margin:0; padding:0; max-width:none; } .no-print { display:none !important; } }');
  html.push(SGO_DocA4_css_() + '</style></head><body>');

  html.push('<div class="barra-imprimir no-print"><button onclick="window.print()">Imprimir / Salvar como PDF</button></div>');
  html.push('<div class="folha">');

  html.push('<div class="topo">');
  html.push('<img class="logo-topo" src="' + CondutaRel_escaparHtml_(SGO_CFG.LOGO_URL || '') + '" alt="Metrolab\'s">');
  html.push('<div class="titulo-doc"><h1>Programa de Conduta, Pontuação e Bonificação</h1><small>Competência ' + CondutaRel_escaparHtml_(ctx.competencia) + '</small></div>');
  html.push('</div>');

  if (ctx.sombra) {
    html.push('<div class="aviso-sombra"><strong>Modo sombra:</strong> este mês apura e publica os números, mas nenhum valor é pago ainda — os valores abaixo são simulados.</div>');
  }

  // ---------------- 1. Cabeçalho (gauge + KPIs, sem IA) ----------------
  html.push('<div class="cabecalho-flex">');
  html.push('<div style="flex:0 0 auto">' + CondutaRel_montarGaugeSvg_(ctx.ico, ctx.farol) + '</div>');
  html.push('<div class="kpis">');
  html.push('<div class="kpi"><div class="valor"><span class="farol-badge">' + CondutaRel_escaparHtml_(ctx.farol) + '</span></div><div class="rotulo">Farol do mês</div></div>');
  html.push('<div class="kpi"><div class="valor">' + ctx.ico + '</div><div class="rotulo">ICO (Índice de Conduta)</div></div>');
  html.push('<div class="kpi"><div class="valor">' + ctx.qtdColaboradoresComBonus + ' / ' + ctx.qtdColaboradoresTotal + '</div><div class="rotulo">Colaboradores com Bônus Coletivo</div></div>');
  html.push('<div class="kpi"><div class="valor">' + ctx.missoes.qtdQualificadas + '</div><div class="rotulo">Missões qualificadas (≥200km)</div></div>');
  html.push('</div>');
  html.push('</div>');

  // ---------------- 2. Narrativa (IA) ----------------
  html.push('<div class="secao"><h2>Interpretação do mês</h2>');
  html.push('<p>' + CondutaRel_escaparHtml_(ia.narrativa) + '</p>');
  html.push('</div>');

  // ---------------- 3. Composição do demérito (sem IA) ----------------
  html.push('<div class="secao"><h2>Composição do demérito por grupo</h2>');
  if (ctx.composicaoPorGrupo.length) {
    html.push('<div class="grafico-box"><canvas id="graficoComposicao"></canvas></div>');
    html.push('<table class="tabela-q"><thead><tr><th>Grupo</th><th class="num">Ocorrências</th><th class="num">Pontos</th></tr></thead><tbody>');
    ctx.composicaoPorGrupo.forEach(function (g) {
      html.push('<tr><td>' + CondutaRel_escaparHtml_(g.grupo) + '</td><td class="num">' + g.qtdOcorrencias + '</td><td class="num">' + g.somaPeso + '</td></tr>');
    });
    html.push('</tbody></table>');
  } else {
    html.push('<p>Nenhuma ocorrência firme no mês — demérito zerado.</p>');
  }
  html.push('</div>');

  // ---------------- 4. Top 5 códigos (sem IA) ----------------
  html.push('<div class="secao"><h2>Top 5 códigos do mês</h2>');
  if (ctx.top5Codigos.length) {
    html.push('<div class="grafico-box baixo"><canvas id="graficoTop5"></canvas></div>');
    html.push('<table class="tabela-q"><thead><tr><th>Código</th><th>Descrição</th><th class="num">Ocorrências</th><th class="num">Pontos</th></tr></thead><tbody>');
    ctx.top5Codigos.forEach(function (c) {
      html.push('<tr><td>' + CondutaRel_escaparHtml_(c.codigo) + '</td><td>' + CondutaRel_escaparHtml_(c.descricao) + '</td><td class="num">' + c.qtdOcorrencias + '</td><td class="num">' + c.somaPeso + '</td></tr>');
    });
    html.push('</tbody></table>');
  } else {
    html.push('<p>Nenhuma ocorrência firme no mês.</p>');
  }
  html.push('</div>');

  // ---------------- 5. Comparativo de 6 meses (sem IA) ----------------
  html.push('<div class="secao"><h2>Comparativo — últimos 6 meses</h2>');
  html.push('<div class="grafico-box"><canvas id="graficoComparativo"></canvas></div>');
  html.push('<table class="tabela-q"><thead><tr><th>Competência</th><th class="num">ICO</th><th class="num">Farol</th></tr></thead><tbody>');
  ctx.comparativo6Meses.forEach(function (m) {
    html.push('<tr><td>' + CondutaRel_escaparHtml_(m.competencia) + '</td><td class="num">' + (m.ico === null ? '—' : m.ico) + '</td><td class="num">' + (m.farol || '—') + '</td></tr>');
  });
  html.push('</tbody></table>');
  html.push('</div>');

  // ---------------- 6. Missões (sem IA) ----------------
  html.push('<div class="secao"><h2>Incentivo de Missão</h2>');
  html.push('<p>' + ctx.missoes.qtdQualificadas + ' missão(ões) qualificada(s) (≥200km da sede) no mês — ' +
    (ctx.sombra ? 'valor simulado' : 'valor devido') + ' total: R$ ' + ctx.missoes.valorTotal.toFixed(2).replace('.', ',') +
    '. O Incentivo de Missão é independente do farol do mês.</p>');
  html.push('</div>');

  // ---------------- 7. Contestações (sem IA) ----------------
  html.push('<div class="secao"><h2>Contestações</h2>');
  html.push('<p>' + ctx.contestacoes.qtdContestadas + ' contestação(ões) no mês — ' +
    ctx.contestacoes.qtdAnuladas + ' anulada(s), ' + ctx.contestacoes.qtdMantidas + ' mantida(s)/firme(s).</p>');
  html.push('</div>');

  // ---------------- 8. Recomendação (IA) ----------------
  html.push('<div class="secao"><h2>Recomendação</h2>');
  html.push('<p>' + CondutaRel_escaparHtml_(ia.recomendacao) + '</p>');
  html.push('</div>');

  html.push('<div style="margin-top:26px;font-size:10px;color:#6b7280;">Gerado automaticamente pelo módulo Conduta, Pontuação e Bonificação. ' +
    'A interpretação (narrativa/recomendação) é gerada por IA a partir dos números já calculados e congelados nesta competência — ' +
    'nunca recalcula o ICO, e nunca recebe nome de colaborador.</div>');

  html.push('</div>');
  html.push(CondutaRel_montarScriptGraficos_(ctx));
  html.push('</body></html>');
  return html.join('\n');
}

/**
 * Script final do relatório: instancia os 3 gráficos (Chart.js, CDN
 * carregado no <head>) a partir dos MESMOS números já calculados em
 * ctx — nenhum dado novo, só visualização do que já está nas tabelas
 * logo abaixo de cada gráfico.
 */
function CondutaRel_montarScriptGraficos_(ctx) {
  var dadosComposicao = ctx.composicaoPorGrupo.map(function (g) { return { grupo: g.grupo, pontos: g.somaPeso }; });
  var dadosTop5 = ctx.top5Codigos.map(function (c) { return { codigo: c.codigo, pontos: c.somaPeso }; });
  var dadosComparativo = ctx.comparativo6Meses.map(function (m) { return { competencia: m.competencia, ico: m.ico, farol: m.farol }; });

  // JSON.stringify não escapa "<" — se algum texto do catálogo algum
  // dia tiver "</script>" dentro, quebraria a tag; neutralizado aqui.
  function jsonSeguroParaScript_(v) { return JSON.stringify(v).replace(/</g, '\\u003c'); }

  return '<script>\n' +
    'var DADOS_COMPOSICAO = ' + jsonSeguroParaScript_(dadosComposicao) + ';\n' +
    'var DADOS_TOP5 = ' + jsonSeguroParaScript_(dadosTop5) + ';\n' +
    'var DADOS_COMPARATIVO = ' + jsonSeguroParaScript_(dadosComparativo) + ';\n' +
    'function corDoFarol(f) { if (f === "VERDE") return "#059669"; if (f === "AMARELO") return "#b45309"; if (f === "VERMELHO") return "#dc2626"; return "#9ca3af"; }\n' +
    'function quandoChartPronto(cb) { if (window.Chart) { cb(); } else { window.addEventListener("load", cb); } }\n' +
    'quandoChartPronto(function () {\n' +
    '  Chart.defaults.font.family = "Arial, Helvetica, sans-serif";\n' +
    '  Chart.defaults.font.size = 11;\n' +
    '  var elComposicao = document.getElementById("graficoComposicao");\n' +
    '  if (elComposicao && DADOS_COMPOSICAO.length) {\n' +
    '    new Chart(elComposicao, { type: "bar", data: { labels: DADOS_COMPOSICAO.map(function(d){return d.grupo;}), ' +
    'datasets: [{ label: "Pontos de demérito", data: DADOS_COMPOSICAO.map(function(d){return d.pontos;}), backgroundColor: "#dc2626", borderRadius: 4 }] }, ' +
    'options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } } });\n' +
    '  }\n' +
    '  var elTop5 = document.getElementById("graficoTop5");\n' +
    '  if (elTop5 && DADOS_TOP5.length) {\n' +
    '    new Chart(elTop5, { type: "bar", data: { labels: DADOS_TOP5.map(function(d){return d.codigo;}), ' +
    'datasets: [{ label: "Pontos de demérito", data: DADOS_TOP5.map(function(d){return d.pontos;}), backgroundColor: "#b45309", borderRadius: 4 }] }, ' +
    'options: { indexAxis: "y", responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true, ticks: { precision: 0 } } } } });\n' +
    '  }\n' +
    '  var elComparativo = document.getElementById("graficoComparativo");\n' +
    '  if (elComparativo && DADOS_COMPARATIVO.length) {\n' +
    '    var labels = DADOS_COMPARATIVO.map(function(d){return d.competencia;});\n' +
    '    var valores = DADOS_COMPARATIVO.map(function(d){return d.ico;});\n' +
    '    var cores = DADOS_COMPARATIVO.map(function(d){return corDoFarol(d.farol);});\n' +
    '    new Chart(elComparativo, { type: "line", data: { labels: labels, datasets: [\n' +
    '      { label: "ICO", data: valores, borderColor: "#0b4ea2", backgroundColor: "#0b4ea2", tension: 0.25, spanGaps: true, ' +
    'pointBackgroundColor: cores, pointBorderColor: cores, pointRadius: 5, segment: {} },\n' +
    '      { label: "Limite verde (85)", data: labels.map(function(){return 85;}), borderColor: "#059669", borderDash: [5,4], pointRadius: 0, borderWidth: 1 },\n' +
    '      { label: "Limite vermelho (70)", data: labels.map(function(){return 70;}), borderColor: "#dc2626", borderDash: [5,4], pointRadius: 0, borderWidth: 1 }\n' +
    '    ] }, options: { responsive: true, maintainAspectRatio: false, scales: { y: { min: 0, max: 100 } }, plugins: { legend: { labels: { boxWidth: 12 } } } } });\n' +
    '  }\n' +
    '});\n' +
    '<\/script>';
}

/**
 * Gera (ou regenera) o relatório de uma competência já fechada e
 * persiste em qual_relatorio (upsert por competência), guardando o
 * contexto exato mandado pra IA junto, pra auditoria (seção 8 do
 * briefing: "O JSON é gravado junto com o relatório para auditoria").
 */
function Conduta_gerarRelatorio_(competencia) {
  var ctx = Conduta_montarContextoRelatorio_(competencia);
  var ia = CondutaIA_gerarInterpretacao_(ctx);
  var html = Conduta_montarRelatorioHtml_(ctx, ia);

  var existente = SGO_DATA.getAll(CONDUTA_SHEETS.RELATORIO).find(function (r) { return Conduta_soComp_(r.COMPETENCIA) === competencia && (!r.TIPO || r.TIPO === 'MENSAL'); });
  var dados = { TIPO:'MENSAL', VISIBILIDADE:'EQUIPE', COMPETENCIA: competencia, HTML: html, CONTEXTO_JSON: JSON.stringify(ctx), GERADO_EM: Conduta_hojeISO_() };
  if (existente) {
    SGO_DATA.update(CONDUTA_SHEETS.RELATORIO, existente.ID, dados);
  } else {
    SGO_DATA.insert(CONDUTA_SHEETS.RELATORIO, dados);
  }
  return html;
}

function Conduta_apiGerarRelatorio(sessionId, payload) {
  Conduta_exigirGestor_(sessionId);
  payload = payload || {};
  var competencia = String(payload.competencia || '').trim();
  if (!/^\d{4}-\d{2}$/.test(competencia)) throw new Error('Competência inválida (use AAAA-MM).');
  var html = Conduta_gerarRelatorio_(competencia);
  return { ok: true, html: html };
}

function Conduta_apiObterRelatorio(sessionId, payload) {
  Conduta_exigirEquipe_(sessionId);
  payload = payload || {};
  var relatorio = SGO_DATA.getAll(CONDUTA_SHEETS.RELATORIO).find(function (r) { return Conduta_soComp_(r.COMPETENCIA) === Conduta_soComp_(payload.competencia) && (!r.TIPO || r.TIPO === 'MENSAL'); });
  if (!relatorio) return null;
  return { competencia: relatorio.COMPETENCIA, html: relatorio.HTML, geradoEm: relatorio.GERADO_EM };
}

function Conduta_apiListarRelatorios(sessionId) {
  Conduta_exigirEquipe_(sessionId);
  return SGO_DATA.getAll(CONDUTA_SHEETS.RELATORIO).filter(function(r){return !r.TIPO || r.TIPO === 'MENSAL';})
    .map(function (r) { return { competencia: r.COMPETENCIA, geradoEm: r.GERADO_EM }; })
    .sort(function (a, b) { return String(b.competencia).localeCompare(String(a.competencia)); });
}
