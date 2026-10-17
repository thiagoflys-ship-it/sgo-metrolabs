/****************************************************
 * SGO_Qualidade_Relatorio.js
 * RELATÓRIO DE GESTÃO DA QUALIDADE — A4 PARA IMPRESSÃO
 *
 * Mesmo padrão de Auvo_montarRelatorioHtml_ (SGO_Auvo_Relatorio.js):
 * HTML com @page{size:A4} + @media print + botão window.print(), aberto
 * numa aba nova. Nome de pessoa aparece só nas tabelas (Reconhecimento/
 * Acompanhamento/Ocorrências), montadas direto do dado — nunca passa pela
 * IA (ver SGO_Qualidade_IA.js).
 ****************************************************/

function QualidadeRel_escaparHtml_(v) {
  return String(v == null ? '' : v).replace(/[&<>"']/g, function(c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

function Qualidade_montarContextoRelatorio_(periodoDias) {
  var dias = Number(periodoDias) > 0 ? Number(periodoDias) : 30;
  var agora = new Date();
  var desde = new Date(agora.getTime() - dias * 24 * 3600 * 1000);

  var auvo = QualidadeAuvo_coletar_(desde) || { total: 0 };
  var frota = QualidadeFrota_coletar_(desde) || { totalMovimentacoes: 0 };

  Qualidade_bootstrapOcorrencias_();
  var todasOcorrencias = SGO_DATA.getAll(QUALIDADE_OCORRENCIAS_SHEET);
  var ocorrenciasPeriodo = todasOcorrencias.filter(function(o) {
    var criado = o.CRIADO_EM ? new Date(o.CRIADO_EM) : null;
    return criado && !isNaN(criado.getTime()) && criado >= desde;
  }).sort(function(a, b) { return String(b.CRIADO_EM || '').localeCompare(String(a.CRIADO_EM || '')); });

  var qtdCobrancas = ocorrenciasPeriodo.filter(function(o) { return o.TIPO === 'COBRANCA'; }).length;
  var qtdElogios = ocorrenciasPeriodo.filter(function(o) { return o.TIPO === 'ELOGIO'; }).length;
  var qtdObservacoes = ocorrenciasPeriodo.filter(function(o) { return o.TIPO === 'OBSERVACAO'; }).length;

  return {
    periodoDias: dias,
    periodoLabel: 'Últimos ' + dias + ' dias (' +
      Utilities.formatDate(desde, 'America/Sao_Paulo', 'dd/MM/yyyy') + ' a ' +
      Utilities.formatDate(agora, 'America/Sao_Paulo', 'dd/MM/yyyy') + ')',
    auvo: auvo,
    frota: frota,
    ocorrenciasPeriodo: ocorrenciasPeriodo,
    totalOcorrencias: ocorrenciasPeriodo.length,
    qtdCobrancas: qtdCobrancas, qtdElogios: qtdElogios, qtdObservacoes: qtdObservacoes
  };
}

function QualidadeRel_linhaRank_(nome, valor, numerico) {
  return '<tr><td>' + QualidadeRel_escaparHtml_(nome) + '</td><td' + (numerico ? ' class="num"' : ' style="text-align:center"') + '>' + QualidadeRel_escaparHtml_(valor) + '</td></tr>';
}

function Qualidade_montarRelatorioHtml_(ctx, ia) {
  var a = ctx.auvo || {}, f = ctx.frota || {};
  var html = [];
  html.push('<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">');
  html.push('<title>Relatório de Gestão da Qualidade</title>');
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
  html.push('.secao h2.recon { background: #059669; border-left-color: #0b4ea2; }');
  html.push('.secao h2.atencao { background: #b45309; border-left-color: #dc2626; }');
  html.push('p { text-align: justify; margin: 8px 0; }');
  html.push('.grafico-box-full { margin: 10px 0; border: 1px solid #d1d5db; border-radius: 6px; padding: 10px 16px; height: 220px; }');
  html.push('table.tabela-q { border-collapse: collapse; width: 100%; font-size: 11px; }');
  html.push('table.tabela-q th, table.tabela-q td { border: 1px solid #d1d5db; padding: 5px 8px; text-align: left; }');
  html.push('table.tabela-q thead th { background: #0b4ea2; color: #fff; text-align: center; }');
  html.push('table.tabela-q tbody tr:nth-child(even) { background: #f3f4f6; }');
  html.push('.duas-colunas { display: flex; gap: 16px; flex-wrap: wrap; }');
  html.push('.duas-colunas > div { flex: 1 1 45%; min-width: 260px; }');
  html.push('.barra-imprimir { max-width: 900px; margin: 0 auto 12px; text-align: right; }');
  html.push('.barra-imprimir button { background:#0b4ea2; color:#fff; border:none; padding:10px 18px; border-radius:4px; font-weight:700; cursor:pointer; font-size:13px; }');
  html.push('@media print { body { background:#ffffff; } .folha { box-shadow:none; margin:0; padding:0; max-width:none; } .no-print { display:none !important; } }');
  html.push(SGO_DocA4_css_() + '</style></head><body>');

  html.push('<div class="barra-imprimir no-print"><button onclick="window.print()">Imprimir / Salvar como PDF</button></div>');
  html.push('<div class="folha">');

  html.push('<div class="topo">');
  html.push('<img class="logo-topo" src="' + QualidadeRel_escaparHtml_(SGO_CFG.LOGO_URL || '') + '" alt="Metrolab\'s">');
  html.push('<div class="titulo-doc"><h1>Relatório de Gestão da Qualidade</h1><small>' + QualidadeRel_escaparHtml_(ctx.periodoLabel) + '</small></div>');
  html.push('</div>');

  html.push('<div class="kpis">');
  html.push('<div class="kpi"><div class="valor">' + (a.total || 0) + '</div><div class="rotulo">Atendimentos (Auvo)</div></div>');
  html.push('<div class="kpi"><div class="valor">' + (f.totalMovimentacoes || 0) + '</div><div class="rotulo">Retiradas de veículo</div></div>');
  html.push('<div class="kpi"><div class="valor">' + ctx.totalOcorrencias + '</div><div class="rotulo">Ocorrências registradas</div></div>');
  html.push('<div class="kpi"><div class="valor">' + ctx.qtdElogios + '</div><div class="rotulo">Elogios</div></div>');
  html.push('</div>');

  html.push('<div class="secao"><h2>Saúde da Qualidade — Interpretação</h2>');
  html.push('<p>' + QualidadeRel_escaparHtml_(ia.resumoExecutivo) + '</p>');
  html.push('<p><strong>Pontos de atenção:</strong> ' + QualidadeRel_escaparHtml_(ia.pontosDeAtencao) + '</p>');
  html.push('</div>');

  // ---------------- Reconhecimento (nome + número, sem IA) ----------------
  var linhasRecon = [];
  (a.rankingDestaques || []).forEach(function(r) { linhasRecon.push(QualidadeRel_linhaRank_(r.nome + ' (Auvo)', r.qtd + ' atendimento(s) — sempre com relato e foto')); });
  (f.rankingCondutoresDestaque || []).forEach(function(r) { linhasRecon.push(QualidadeRel_linhaRank_(r.nome + ' (Frota)', r.qtd + ' retirada(s) — sempre com checklist/foto')); });
  html.push('<div class="secao"><h2 class="recon">Reconhecimento</h2>');
  if (linhasRecon.length) {
    html.push('<table class="tabela-q"><thead><tr><th>Pessoa</th><th>Motivo</th></tr></thead><tbody>' + linhasRecon.join('') + '</tbody></table>');
  } else {
    html.push('<p>Nenhum destaque com volume suficiente (3+) no período.</p>');
  }
  html.push('</div>');

  // ---------------- Acompanhamento (nome + número, sem IA) ----------------
  var linhasAcomp = [];
  (a.rankingPiorQualidade || []).forEach(function(r) { linhasAcomp.push(QualidadeRel_linhaRank_(r.nome + ' (Auvo)', r.pctSemRelato + '% sem relato, ' + r.pctSemFoto + '% sem foto (' + r.qtd + ' atend.)')); });
  (f.rankingCondutores || []).filter(function(r) { return r.pendencias > 0; }).forEach(function(r) { linhasAcomp.push(QualidadeRel_linhaRank_(r.nome + ' (Frota)', r.pendencias + ' retirada(s)/devolução(ões) incompleta(s) de ' + r.qtd)); });
  html.push('<div class="secao"><h2 class="atencao">Acompanhamento</h2>');
  if (linhasAcomp.length) {
    html.push('<table class="tabela-q"><thead><tr><th>Pessoa</th><th>Motivo</th></tr></thead><tbody>' + linhasAcomp.join('') + '</tbody></table>');
  } else {
    html.push('<p>Nenhuma pendência de qualidade com volume suficiente (3+) no período.</p>');
  }
  html.push('</div>');

  // ---------------- Veículos — custo/consumo/confiabilidade ----------------
  html.push('<div class="secao"><h2>Frota — custo e confiabilidade</h2><div class="duas-colunas">');
  html.push('<div><strong style="font-size:11px">Maior custo de manutenção</strong>');
  if ((f.rankingCustoManutencao || []).length) {
    html.push('<table class="tabela-q"><thead><tr><th>Veículo</th><th class="num">Custo</th></tr></thead><tbody>' +
      f.rankingCustoManutencao.map(function(r) { return QualidadeRel_linhaRank_(r.nome, 'R$ ' + SGO_DocA4_num_(r.valor, 2), true); }).join('') + '</tbody></table>');
  } else { html.push('<p>Sem manutenção registrada no período.</p>'); }
  html.push('</div><div><strong style="font-size:11px">Consumo abaixo da média da frota</strong>');
  if ((f.consumoAbaixoDaMedia || []).length) {
    html.push('<table class="tabela-q"><thead><tr><th>Veículo</th><th class="num">km/L</th></tr></thead><tbody>' +
      f.consumoAbaixoDaMedia.map(function(r) { return QualidadeRel_linhaRank_(r.nome, SGO_DocA4_num_(r.kmPorLitro, 2) + ' km/L', true); }).join('') + '</tbody></table>');
  } else { html.push('<p>Nenhum veículo abaixo de 70% da média (' + SGO_DocA4_num_(f.mediaFrotaConsumo || 0, 2) + ' km/L).</p>'); }
  html.push('</div></div></div>');

  // ---------------- Ocorrências do período ----------------
  html.push('<div class="secao"><h2>Ocorrências Registradas no Período (' + ctx.totalOcorrencias + ')</h2>');
  if (ctx.ocorrenciasPeriodo.length) {
    html.push('<table class="tabela-q"><thead><tr><th>Tipo</th><th>Pessoa</th><th>Descrição</th><th>Registrado por</th><th>Status</th></tr></thead><tbody>');
    ctx.ocorrenciasPeriodo.forEach(function(o) {
      html.push('<tr><td>' + QualidadeRel_escaparHtml_(o.TIPO) + '</td><td>' + QualidadeRel_escaparHtml_(o.PESSOA_NOME) + '</td><td>' +
        QualidadeRel_escaparHtml_(o.DESCRICAO) + '</td><td>' + QualidadeRel_escaparHtml_(o.CRIADO_POR) + '</td><td>' + QualidadeRel_escaparHtml_(o.STATUS) + '</td></tr>');
    });
    html.push('</tbody></table>');
  } else {
    html.push('<p>Nenhuma ocorrência registrada no período.</p>');
  }
  html.push('</div>');

  html.push('<div style="margin-top:26px;font-size:10px;color:#6b7280;">Gerado automaticamente pelo Painel de Qualidade. ' +
    'A interpretação é gerada por IA a partir dos números já calculados nesta página — nunca recalcula valores, e nunca recebe nome de pessoa.</div>');

  html.push('</div>');
  html.push('</body></html>');
  return html.join('\n');
}

// 16/10/2026: sem a chave da IA (ou com a IA fora do ar) o relatório não saía.
// Os números e tabelas não dependem da IA — sai o relatório com o aviso no lugar da interpretação.
function Qualidade_iaComFallback_(ctx) {
  try { return QualidadeIA_gerarInterpretacao_(ctx); } catch (e) {
    return { resumoExecutivo: 'Interpretação automática indisponível neste momento (' + (e && e.message ? e.message : e) + '). Os números e tabelas deste relatório são reais e não dependem dela.', pontosDeAtencao: 'Consulte as tabelas abaixo.' };
  }
}

function Qualidade_apiGerarRelatorio(sessionId, payload) {
  Qualidade_exigirGestor_(sessionId);
  var periodoDias = (payload || {}).periodoDias || 30;

  var ctx = Qualidade_montarContextoRelatorio_(periodoDias);
  var semDadoNenhum = !(ctx.auvo && ctx.auvo.total) && !(ctx.frota && ctx.frota.totalMovimentacoes);
  var ia = semDadoNenhum
    ? { resumoExecutivo: 'Nenhum atendimento nem movimentação de veículo registrado no período selecionado.', pontosDeAtencao: 'Sem dados suficientes pra análise neste período.' }
    : Qualidade_iaComFallback_(ctx);

  var html = Qualidade_montarRelatorioHtml_(ctx, ia);
  return { ok: true, html: html };
}
