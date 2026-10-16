/****************************************************
 * SGO_Auvo_Relatorio.js
 * RELATÓRIO DE ATENDIMENTOS (AUVO) — A4 PARA IMPRESSÃO
 *
 * Mesmo padrão de RelCalDoc_montarDocumentoHtml_ (SGO_RelCal_Documento.js):
 * HTML com @page{size:A4} + @media print + botão window.print(), aberto
 * numa aba nova pelo cliente. Gráficos via Chart.js embutido na própria
 * página impressa (CDN), igual ao dashboard principal.
 ****************************************************/

function AuvoRel_escaparHtml_(v) {
  return String(v == null ? '' : v).replace(/[&<>"']/g, function(c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

function AuvoRel_parseData_(v) {
  if (!v) return null;
  var d = (v instanceof Date) ? v : new Date(String(v));
  return (d && !isNaN(d.getTime())) ? d : null;
}

// ------------------------------------------------------------
// AGREGAÇÃO — os mesmos números do bloco do dashboard, mas com escopo
// de período configurável e com a tabela detalhada de atendimentos.
// ------------------------------------------------------------
function AuvoRel_chaveTecnico_(t) {
  if (SGO_UTILS.safe(t.TECNICO_ID_SGO)) return 'sgo:' + SGO_UTILS.safe(t.TECNICO_ID_SGO);
  if (SGO_UTILS.safe(t.TECNICO_AUVO_ID)) return 'auvo:' + SGO_UTILS.safe(t.TECNICO_AUVO_ID);
  return '';
}

function Auvo_montarContextoRelatorio_(periodoDias, tecnicosIds) {
  var dias = Number(periodoDias) > 0 ? Number(periodoDias) : 30;
  var agora = new Date();
  var desde = new Date(agora.getTime() - dias * 24 * 3600 * 1000);

  var todasTarefas = SGO_DATA.getAll(SGO_CFG.SHEETS.AUVO_TAREFAS);
  var filtroTecnicos = Array.isArray(tecnicosIds) ? tecnicosIds.map(String).filter(Boolean) : [];
  var tarefas = todasTarefas.filter(function(t) {
    var dt = AuvoRel_parseData_(t.DATA_TAREFA);
    return dt && dt >= desde && dt <= agora && (!filtroTecnicos.length || filtroTecnicos.indexOf(AuvoRel_chaveTecnico_(t)) !== -1);
  });

  var indiceClientes = {};
  SGO_DATA.getAll(SGO_CFG.SHEETS.CAD_CLIENTES).forEach(function(c) { indiceClientes[c.ID] = c; });
  var indiceUsuarios = {};
  SGO_DATA.getAll(SGO_CFG.SHEETS.CAD_USUARIOS).forEach(function(u) { indiceUsuarios[u.ID] = u; });

  var nomeCliente_ = function(t) {
    var c = indiceClientes[t.CLIENTE_ID_SGO];
    if (c) return SGO_UTILS.safe(c.NOME_FANTASIA) || SGO_UTILS.safe(c.RAZAO_SOCIAL);
    if (SGO_UTILS.safe(t.CLIENTE_NOME_AUVO)) return SGO_UTILS.safe(t.CLIENTE_NOME_AUVO);
    return t.CLIENTE_AUVO_ID ? ('Cliente Auvo #' + t.CLIENTE_AUVO_ID) : 'Cliente não identificado';
  };
  var nomeTecnico_ = function(t) {
    var u = indiceUsuarios[t.TECNICO_ID_SGO];
    if (u) return SGO_UTILS.safe(u.NOME);
    if (SGO_UTILS.safe(t.TECNICO_NOME_AUVO)) return SGO_UTILS.safe(t.TECNICO_NOME_AUVO);
    return t.TECNICO_AUVO_ID ? ('Técnico Auvo #' + t.TECNICO_AUVO_ID) : 'Técnico não identificado';
  };

  var abertas = 0, concluidas = 0, comRelato = 0, semRelato = 0, finalizadasSemCheckout = 0;
  var contagemPorTecnico = {}, contagemPorTipo = {};

  tarefas.forEach(function(t) {
    var finalizada = SGO_UTILS.safeUpper(t.FINALIZADA) === 'SIM';
    if (finalizada) concluidas++; else abertas++;
    if (SGO_UTILS.safe(t.RELATO_SERVICO)) comRelato++; else semRelato++;
    if (finalizada && !SGO_UTILS.safe(t.CHECKOUT_EM)) finalizadasSemCheckout++;

    var chaveTecnico = AuvoRel_chaveTecnico_(t);
    if (chaveTecnico) {
      if (!contagemPorTecnico[chaveTecnico]) contagemPorTecnico[chaveTecnico] = { nome: nomeTecnico_(t), qtd: 0 };
      contagemPorTecnico[chaveTecnico].qtd++;
    }

    var tipo = SGO_UTILS.safe(t.TIPO_TAREFA) || 'Não informado';
    contagemPorTipo[tipo] = (contagemPorTipo[tipo] || 0) + 1;
  });

  var rankingTecnicos = Object.keys(contagemPorTecnico)
    .map(function(k) { return contagemPorTecnico[k]; })
    .sort(function(a, b) { return b.qtd - a.qtd; });
  var mediaTecnico = rankingTecnicos.length ? Math.round((tarefas.length / rankingTecnicos.length) * 10) / 10 : 0;

  var porTipo = Object.keys(contagemPorTipo)
    .map(function(k) { return { tipo: k, qtd: contagemPorTipo[k] }; })
    .sort(function(a, b) { return b.qtd - a.qtd; });

  var tabela = tarefas
    .slice()
    .sort(function(a, b) { return (AuvoRel_parseData_(b.DATA_TAREFA) || 0) - (AuvoRel_parseData_(a.DATA_TAREFA) || 0); })
    .map(function(t) {
      var dt = AuvoRel_parseData_(t.DATA_TAREFA);
      return {
        osNumero: SGO_UTILS.safe(t.AUVO_TASK_ID) || 'Não informado',
        osUrl: SGO_UTILS.safe(t.TASK_URL),
        data: dt ? Utilities.formatDate(dt, 'America/Sao_Paulo', 'dd/MM/yyyy HH:mm') : '--/--',
        cliente: nomeCliente_(t),
        tecnico: nomeTecnico_(t),
        tipo: SGO_UTILS.safe(t.TIPO_TAREFA) || 'Atendimento',
        status: SGO_UTILS.safeUpper(t.FINALIZADA) === 'SIM' ? 'Concluído' : 'Em aberto'
      };
    });

  return {
    periodoDias: dias,
    periodoLabel: 'Últimos ' + dias + ' dias (' +
      Utilities.formatDate(desde, 'America/Sao_Paulo', 'dd/MM/yyyy') + ' a ' +
      Utilities.formatDate(agora, 'America/Sao_Paulo', 'dd/MM/yyyy') + ')',
    escopoLabel: filtroTecnicos.length
      ? rankingTecnicos.map(function(r) { return r.nome; }).join(', ')
      : 'Todos os colaboradores',
    total: tarefas.length,
    abertas: abertas,
    concluidas: concluidas,
    pctSemRelato: tarefas.length ? Math.round((semRelato / tarefas.length) * 100) : 0,
    finalizadasSemCheckout: finalizadasSemCheckout,
    rankingTecnicos: rankingTecnicos,
    mediaTecnico: mediaTecnico,
    porTipo: porTipo,
    tabela: tabela
  };
}

// ------------------------------------------------------------
// HTML A4 — mesmo esqueleto de RelCalDoc_montarDocumentoHtml_
// ------------------------------------------------------------
function Auvo_montarRelatorioHtml_(ctx, ia) {
  var html = [];
  html.push('<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">');
  html.push('<title>Relatório de Atendimentos — Auvo</title>');
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
  html.push('.kpis { display:flex; gap: 10px; margin-bottom: 20px; flex-wrap: wrap; }');
  html.push('.kpi { flex: 1 1 21%; border: 1px solid #d1d5db; border-radius: 6px; padding: 10px 12px; text-align: center; }');
  html.push('.kpi .valor { font-size: 21px; font-weight: 800; color: #0b4ea2; }');
  html.push('.kpi .rotulo { font-size: 10.5px; color: #6b7280; }');
  html.push('.secao { margin-top: 22px; }');
  html.push('.secao h2 { font-size: 13px; color:#ffffff; background:#0b4ea2; padding: 8px 12px; margin: 0 0 12px; border-left: 6px solid #059669; }');
  html.push('p { text-align: justify; margin: 8px 0; }');
  html.push('.grafico-box-full { margin: 10px 0; border: 1px solid #d1d5db; border-radius: 6px; padding: 10px 16px; }');
  html.push('.grafico-box-full.tipos { height: 260px; }');
  html.push('table.tabela-atend { border-collapse: collapse; width: 100%; font-size: 11px; }');
  html.push('table.tabela-atend th, table.tabela-atend td { border: 1px solid #d1d5db; padding: 5px 8px; text-align: left; }');
  html.push('table.tabela-atend thead th { background: #0b4ea2; color: #fff; text-align: center; }');
  html.push('table.tabela-atend tbody tr:nth-child(even) { background: #f3f4f6; }');
  html.push('.barra-imprimir { max-width: 900px; margin: 0 auto 12px; text-align: right; }');
  html.push('.barra-imprimir button { background:#0b4ea2; color:#fff; border:none; padding:10px 18px; border-radius:4px; font-weight:700; cursor:pointer; font-size:13px; }');
  html.push('@media print { body { background:#ffffff; } .folha { box-shadow:none; margin:0; padding:0; max-width:none; } .no-print { display:none !important; } }');
  html.push(SGO_DocA4_css_() + '</style></head><body>');

  html.push('<div class="barra-imprimir no-print"><button onclick="window.print()">Imprimir / Salvar como PDF</button></div>');
  html.push('<div class="folha">');

  html.push('<div class="topo">');
  html.push('<img class="logo-topo" src="' + AuvoRel_escaparHtml_(SGO_CFG.LOGO_URL || '') + '" alt="Metrolab\'s">');
  html.push('<div class="titulo-doc"><h1>Relatório de Atendimentos — Auvo</h1><small>' + AuvoRel_escaparHtml_(ctx.periodoLabel) + '<br>Escopo: ' + AuvoRel_escaparHtml_(ctx.escopoLabel) + '</small></div>');
  html.push('</div>');

  html.push('<div class="kpis">');
  html.push('<div class="kpi"><div class="valor">' + ctx.total + '</div><div class="rotulo">Total de atendimentos</div></div>');
  html.push('<div class="kpi"><div class="valor">' + ctx.abertas + '</div><div class="rotulo">Em aberto</div></div>');
  html.push('<div class="kpi"><div class="valor">' + ctx.concluidas + '</div><div class="rotulo">Concluídos</div></div>');
  html.push('<div class="kpi"><div class="valor">' + (100 - ctx.pctSemRelato) + '%</div><div class="rotulo">O.S. com relato preenchido</div></div>');
  html.push('</div>');

  html.push('<div class="secao"><h2>Saúde Operacional — Interpretação</h2>');
  html.push('<p>' + AuvoRel_escaparHtml_(ia.resumoExecutivo) + '</p>');
  html.push('<p><strong>Pontos de atenção:</strong> ' + AuvoRel_escaparHtml_(ia.pontosDeAtencao) + '</p>');
  html.push('</div>');

  // Altura do gráfico de técnico cresce com a quantidade de técnicos —
  // nome composto em português (bem comum) precisa da largura inteira
  // da página pra não cortar (era o que acontecia com 2 gráficos lado
  // a lado); a altura por barra evita as barras ficarem espremidas.
  var alturaTecnicos = Math.max(160, 34 * Math.max(ctx.rankingTecnicos.length, 1) + 40);

  html.push('<div class="secao"><h2>Atendimentos por Técnico</h2>');
  html.push('<div class="grafico-box-full" style="height:' + alturaTecnicos + 'px"><canvas id="graficoTecnicos"></canvas></div>');
  html.push('</div>');

  html.push('<div class="secao"><h2>Atendimentos por Tipo</h2>');
  html.push('<div class="grafico-box-full tipos"><canvas id="graficoTipos"></canvas></div>');
  html.push('</div>');

  html.push('<div class="secao"><h2>Atendimentos do Período (' + ctx.tabela.length + ')</h2>');
  html.push('<table class="tabela-atend"><thead><tr><th>O.S.</th><th>Data</th><th>Cliente</th><th>Responsável</th><th>Tipo</th><th>Status</th></tr></thead><tbody>');
  if (ctx.tabela.length) {
    ctx.tabela.forEach(function(t) {
      var osHtml = t.osUrl ? '<a href="' + AuvoRel_escaparHtml_(t.osUrl) + '" target="_blank">' + AuvoRel_escaparHtml_(t.osNumero) + '</a>' : AuvoRel_escaparHtml_(t.osNumero);
      html.push('<tr><td>' + osHtml + '</td><td>' + AuvoRel_escaparHtml_(t.data) + '</td><td>' + AuvoRel_escaparHtml_(t.cliente) + '</td><td>' +
        AuvoRel_escaparHtml_(t.tecnico) + '</td><td>' + AuvoRel_escaparHtml_(t.tipo) + '</td><td>' + AuvoRel_escaparHtml_(t.status) + '</td></tr>');
    });
  } else {
    html.push('<tr><td colspan="6">Nenhum atendimento no período e escopo selecionados.</td></tr>');
  }
  html.push('</tbody></table>');
  html.push('</div>');

  html.push('<div style="margin-top:26px;font-size:10px;color:#6b7280;">Gerado automaticamente a partir da sincronização Auvo &rarr; Portal SGO+. ' +
    'A interpretação acima é gerada por IA a partir dos números já calculados nesta página — nunca recalcula ou reinterpreta valores.</div>');

  html.push('</div>');

  var dadosGraficos = {
    tecnicos: { labels: ctx.rankingTecnicos.map(function(r) { return r.nome; }), valores: ctx.rankingTecnicos.map(function(r) { return r.qtd; }) },
    tipos: { labels: ctx.porTipo.map(function(t) { return t.tipo; }), valores: ctx.porTipo.map(function(t) { return t.qtd; }) }
  };

  html.push('<script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js"></script>');
  html.push('<script>');
  html.push('var DADOS_GRAFICOS = ' + JSON.stringify(dadosGraficos) + ';');
  html.push('window.addEventListener("load", function() {');
  html.push('  var elT = document.getElementById("graficoTecnicos");');
  html.push('  if (elT) new Chart(elT, { type: "bar", data: { labels: DADOS_GRAFICOS.tecnicos.labels, datasets: [{ data: DADOS_GRAFICOS.tecnicos.valores, backgroundColor: "#0b4ea2", maxBarThickness: 22 }] }, options: { indexAxis: "y", responsive: true, maintainAspectRatio: false, layout: { padding: { left: 4 } }, plugins: { legend: { display: false } }, scales: { y: { ticks: { font: { size: 10.5 } } }, x: { ticks: { precision: 0 } } } } });');
  html.push('  var elP = document.getElementById("graficoTipos");');
  html.push('  if (elP) new Chart(elP, { type: "doughnut", data: { labels: DADOS_GRAFICOS.tipos.labels, datasets: [{ data: DADOS_GRAFICOS.tipos.valores, backgroundColor: ["#0b4ea2","#059669","#f59e0b","#dc2626","#7c3aed","#6b7280"] }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "bottom", labels: { boxWidth: 10, font: { size: 9 } } } } } });');
  html.push('});');
  html.push('</script>');

  html.push('</body></html>');
  return html.join('\n');
}

// ------------------------------------------------------------
// ORQUESTRAÇÃO — junta agregação + IA + HTML, exposta ao painel
// ------------------------------------------------------------
function Auvo_apiGerarRelatorio(sessionId, payload) {
  Auvo_exigirAdmin_(sessionId);
  var periodoDias = (payload || {}).periodoDias || 30;

  var tecnicosIds = Array.isArray((payload || {}).tecnicosIds) ? payload.tecnicosIds : [];
  var ctx = Auvo_montarContextoRelatorio_(periodoDias, tecnicosIds);
  var ia = ctx.total
    ? AuvoRelIA_gerarInterpretacao_(ctx)
    : { resumoExecutivo: 'Nenhum atendimento registrado no período selecionado.', pontosDeAtencao: 'Sem dados suficientes pra análise neste período.' };

  var html = Auvo_montarRelatorioHtml_(ctx, ia);
  return { ok: true, html: html };
}

function Auvo_apiListarColaboradoresRelatorio(sessionId) {
  Auvo_exigirAdmin_(sessionId);
  var usuarios = {};
  SGO_DATA.getAll(SGO_CFG.SHEETS.CAD_USUARIOS).forEach(function(u) { usuarios[u.ID] = u; });
  var mapa = {};
  SGO_DATA.getAll(SGO_CFG.SHEETS.AUVO_TAREFAS).forEach(function(t) {
    var chave = AuvoRel_chaveTecnico_(t);
    if (!chave) return;
    var u = usuarios[t.TECNICO_ID_SGO];
    var nome = (u && SGO_UTILS.safe(u.NOME)) || SGO_UTILS.safe(t.TECNICO_NOME_AUVO) || ('Colaborador Auvo #' + t.TECNICO_AUVO_ID);
    mapa[chave] = nome;
  });
  var items = Object.keys(mapa).map(function(id) { return { id: id, nome: mapa[id] }; })
    .sort(function(a, b) { return a.nome.localeCompare(b.nome); });
  return { ok: true, items: items };
}
