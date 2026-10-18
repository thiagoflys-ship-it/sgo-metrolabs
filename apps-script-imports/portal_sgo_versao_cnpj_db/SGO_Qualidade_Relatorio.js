/****************************************************
 * SGO_Qualidade_Relatorio.js
 * RELATÓRIO DE GESTÃO DA QUALIDADE — A4 PARA IMPRESSÃO
 *
 * 18/10/2026: montado na moldura comum dos relatórios gerenciais
 * (SGO_Documentos_RelatorioA4.js), com gráficos em SVG, texto padrão quando
 * a IA não está disponível (o aviso fica só na tela) e cópia HTML + PDF na
 * pasta "Painel de qualidade - Relatórios". Nome de pessoa aparece só nas tabelas (Reconhecimento/
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

var QUALIDADEREL_TIPO = { COBRANCA: 'Cobrança', ELOGIO: 'Elogio', OBSERVACAO: 'Observação' };
var QUALIDADEREL_AREA = { AUVO: 'Atendimentos', FROTA: 'Frota' };

function QualidadeRel_dataBr_(v) {
  var d = v ? new Date(v) : null;
  return d && !isNaN(d.getTime()) ? Utilities.formatDate(d, 'America/Sao_Paulo', 'dd/MM/yyyy') : '—';
}
function QualidadeRel_pct_(v) { return RelA4_num_(Number(v) || 0, 0) + '%'; }

/** Texto padrão (sem IA): só os números agregados, sem nome de pessoa. */
function QualidadeRel_textoPadrao_(ctx) {
  var a = ctx.auvo || {}, f = ctx.frota || {};
  var resumo = 'No período de ' + ((/\((.*)\)/.exec(ctx.periodoLabel) || [])[1] || ctx.periodoLabel) + ' foram registrados ' + RelA4_plural_(a.total || 0, 'atendimento de campo', 'atendimentos de campo') + ' e ' +
    RelA4_plural_(f.totalMovimentacoes || 0, 'retirada de veículo', 'retiradas de veículo') + '.' +
    (a.finalizadas ? ' Entre os atendimentos finalizados, ' + QualidadeRel_pct_(a.pctSemRelato) + ' ficaram sem relato de serviço e ' + QualidadeRel_pct_(a.pctSemFoto) + ' sem foto.' : '') +
    ' A gestão registrou ' + RelA4_plural_(ctx.totalOcorrencias, 'ocorrência', 'ocorrências') + ' no período (' + RelA4_plural_(ctx.qtdCobrancas, 'cobrança', 'cobranças') + ', ' + RelA4_plural_(ctx.qtdElogios, 'elogio', 'elogios') + ' e ' + RelA4_plural_(ctx.qtdObservacoes, 'observação', 'observações') + ').';
  var pontos = [];
  if (a.finalizadasSemCheckout) pontos.push(RelA4_plural_(a.finalizadasSemCheckout, 'atendimento finalizado sem check-out', 'atendimentos finalizados sem check-out'));
  if (a.semVinculo) pontos.push(RelA4_plural_(a.semVinculo, 'atendimento sem cliente ou técnico vinculado', 'atendimentos sem cliente ou técnico vinculado'));
  if (f.viagensPenduradas) pontos.push(RelA4_plural_(f.viagensPenduradas, 'retirada em aberto há dois dias ou mais', 'retiradas em aberto há dois dias ou mais'));
  if (f.totalIncompletas) pontos.push(RelA4_plural_(f.totalIncompletas, 'retirada ou devolução sem checklist ou foto', 'retiradas ou devoluções sem checklist ou foto'));
  if (f.documentosVencidos) pontos.push(RelA4_plural_(f.documentosVencidos, 'documento de veículo vencido', 'documentos de veículo vencidos'));
  if (f.multasAbertas) pontos.push(RelA4_plural_(f.multasAbertas, 'multa em aberto', 'multas em aberto') + ' (' + RelA4_moeda_(f.valorMultasAbertas || 0) + ')');
  var atencao = pontos.length ? 'Merecem acompanhamento da gestão: ' + pontos.join('; ') + '.' : 'Os indicadores do período não mostram desvio que exija ação imediata.';
  return { resumoExecutivo: resumo, pontosDeAtencao: atencao };
}

/** Interpretação: IA quando disponível; sem chave ou com falha, texto padrão e aviso só de tela. */
function Qualidade_iaComFallback_(ctx) {
  try {
    var r = QualidadeIA_gerarInterpretacao_(ctx);
    return { resumoExecutivo: RelA4_limparTextoIa_(r.resumoExecutivo), pontosDeAtencao: RelA4_limparTextoIa_(r.pontosDeAtencao), origem: 'IA', aviso: '' };
  } catch (e) {
    var p = QualidadeRel_textoPadrao_(ctx);
    var semChave = /GEMINI_API_KEY não configurada/.test(String(e && e.message));
    p.origem = 'PADRAO'; p.aviso = RelA4_avisoFalhaIa_(semChave ? { semChave: true } : e);
    return p;
  }
}

function Qualidade_montarRelatorioHtml_(ctx, ia) {
  var a = ctx.auvo || {}, f = ctx.frota || {}, c = [];
  c.push(RelA4_secao_('Resumo do período', RelA4_kpis_([
    [RelA4_num_(a.total || 0, 0), 'Atendimentos de campo'], [RelA4_num_(f.totalMovimentacoes || 0, 0), 'Retiradas de veículo'],
    [RelA4_num_(ctx.totalOcorrencias, 0), 'Ocorrências registradas'], [RelA4_num_(ctx.qtdElogios, 0), 'Elogios', ctx.qtdElogios ? 'ok' : ''],
    [QualidadeRel_pct_(a.pctSemRelato), 'Atendimentos finalizados sem relato', a.pctSemRelato > 10 ? 'aviso' : 'ok'], [QualidadeRel_pct_(a.pctSemFoto), 'Atendimentos finalizados sem foto', a.pctSemFoto > 10 ? 'aviso' : 'ok'],
    [RelA4_num_(f.totalIncompletas || 0, 0), 'Retiradas ou devoluções incompletas', f.totalIncompletas ? 'aviso' : 'ok'], [RelA4_num_(f.documentosVencidos || 0, 0), 'Documentos de veículo vencidos', f.documentosVencidos ? 'critico' : 'ok']
  ])));
  c.push(RelA4_secao_('Interpretação do período', RelA4_paragrafos_(ia.resumoExecutivo) + RelA4_subsecao_('Pontos de atenção', RelA4_paragrafos_(ia.pontosDeAtencao))));

  var preenchimento = a.finalizadas ? RelA4_barras_([
    { rotulo: 'Sem relato de serviço', valor: a.pctSemRelato || 0, rotuloValor: QualidadeRel_pct_(a.pctSemRelato) + ' (' + RelA4_num_(a.semRelato || 0, 0) + ')' },
    { rotulo: 'Sem foto anexada', valor: a.pctSemFoto || 0, rotuloValor: QualidadeRel_pct_(a.pctSemFoto) + ' (' + RelA4_num_(a.semFoto || 0, 0) + ')' },
    { rotulo: 'Sem check-in', valor: a.pctSemCheckin || 0, rotuloValor: QualidadeRel_pct_(a.pctSemCheckin) },
    { rotulo: 'Questionário vazio', valor: a.pctQuestionarioVazio || 0, rotuloValor: QualidadeRel_pct_(a.pctQuestionarioVazio) + ' (' + RelA4_num_(a.questionariosVazios || 0, 0) + ')' }
  ], { titulo: 'Atendimentos finalizados com falha de preenchimento (% de ' + RelA4_num_(a.finalizadas, 0) + ' finalizados)', cor: RELA4_CORES.laranja }) +
    '<p class="nota">Finalizados sem check-out: ' + RelA4_num_(a.finalizadasSemCheckout || 0, 0) + '. Sem cliente ou técnico vinculado no SGO+: ' + RelA4_num_(a.semVinculo || 0, 0) + '.</p>'
    : '<p class="nota">Nenhum atendimento finalizado no período.</p>';
  c.push(RelA4_secao_('Atendimentos de campo', preenchimento));

  var recon = [];
  (a.rankingDestaques || []).forEach(function (r) { recon.push([r.nome, 'Atendimentos', RelA4_plural_(r.qtd, 'atendimento', 'atendimentos') + ', todos com relato e foto']); });
  (f.rankingCondutoresDestaque || []).forEach(function (r) { recon.push([r.nome, 'Frota', RelA4_plural_(r.qtd, 'retirada', 'retiradas') + ', todas com checklist e foto']); });
  var acomp = [];
  (a.rankingPiorQualidade || []).forEach(function (r) { acomp.push([r.nome, 'Atendimentos', QualidadeRel_pct_(r.pctSemRelato) + ' sem relato e ' + QualidadeRel_pct_(r.pctSemFoto) + ' sem foto, em ' + RelA4_plural_(r.qtd, 'atendimento', 'atendimentos')]); });
  (f.rankingCondutores || []).filter(function (r) { return r.pendencias > 0; }).forEach(function (r) { acomp.push([r.nome, 'Frota', RelA4_plural_(r.pendencias, 'retirada ou devolução incompleta', 'retiradas ou devoluções incompletas') + ' de ' + RelA4_num_(r.qtd, 0)]); });
  c.push(RelA4_secao_('Pessoas', RelA4_subsecao_('Reconhecimento', RelA4_tabela_([{ t: 'Pessoa' }, { t: 'Área' }, { t: 'Motivo' }], recon, { vazio: 'Nenhum destaque com volume suficiente (três ou mais registros) no período.', legenda: 'Destaques do período' })) +
    RelA4_subsecao_('Acompanhamento', RelA4_tabela_([{ t: 'Pessoa' }, { t: 'Área' }, { t: 'Motivo' }], acomp, { vazio: 'Nenhuma pendência de qualidade com volume suficiente (três ou mais registros) no período.', legenda: 'Pessoas com pendência de preenchimento a acompanhar' }))));

  var frota = RelA4_barras_((f.rankingCustoManutencao || []).map(function (r) { return { rotulo: r.nome, valor: r.valor, rotuloValor: RelA4_moeda_(r.valor) }; }),
    { titulo: 'Veículos com maior custo de manutenção no período', cor: RELA4_CORES.laranja, vazio: 'Sem manutenção registrada no período.' });
  frota += (f.consumoAbaixoDaMedia || []).length
    ? RelA4_tabela_([{ t: 'Veículo' }, { t: 'Consumo', num: true }], f.consumoAbaixoDaMedia.map(function (r) { return [r.nome, RelA4_num_(r.kmPorLitro, 1) + ' km/L']; }),
      { legenda: 'Veículos com consumo abaixo de 70% da média da frota (' + RelA4_num_(f.mediaFrotaConsumo || 0, 1) + ' km/L)' })
    : '<p class="nota">Nenhum veículo abaixo de 70% do consumo médio da frota (' + RelA4_num_(f.mediaFrotaConsumo || 0, 1) + ' km/L).</p>';
  frota += '<p class="nota">Na emissão: ' + RelA4_plural_(f.documentosVencidos || 0, 'documento vencido', 'documentos vencidos') + ' e ' + RelA4_plural_(f.documentosVencendo || 0, 'vencendo', 'vencendo') +
    '; ' + RelA4_plural_(f.cnhVencidas || 0, 'CNH vencida', 'CNH vencidas') + '; ' + RelA4_plural_(f.multasAbertas || 0, 'multa em aberto', 'multas em aberto') + ' (' + RelA4_moeda_(f.valorMultasAbertas || 0) + '), ' +
    RelA4_num_(f.multasSemCondutor || 0, 0) + ' sem condutor vinculado.</p>';
  c.push(RelA4_secao_('Frota: custo e confiabilidade', frota));

  c.push(RelA4_secao_('Ocorrências registradas no período', RelA4_tabela_([{ t: 'Data' }, { t: 'Tipo' }, { t: 'Área' }, { t: 'Pessoa' }, { t: 'Descrição' }, { t: 'Registrado por' }, { t: 'Situação' }],
    ctx.ocorrenciasPeriodo.map(function (o) {
      var tipo = SGO_UTILS.safeUpper(o.TIPO), aberta = SGO_UTILS.safeUpper(o.STATUS) !== 'RESOLVIDA';
      return [QualidadeRel_dataBr_(o.CRIADO_EM), RelA4_marca_(QUALIDADEREL_TIPO[tipo] || o.TIPO, tipo === 'ELOGIO' ? 'ok' : tipo === 'COBRANCA' ? 'aviso' : 'neutra'), QUALIDADEREL_AREA[SGO_UTILS.safeUpper(o.AREA)] || o.AREA || '—',
        o.PESSOA_NOME, o.DESCRICAO, o.CRIADO_POR, aberta ? 'Aberta' : 'Resolvida'];
    }), { vazio: 'Nenhuma ocorrência registrada no período.', legenda: 'Cobranças, elogios e observações do período' }) +
    '<p class="nota">A interpretação do período usa somente os números agregados deste relatório, sem dados pessoais. Nomes aparecem apenas nas tabelas, montadas direto dos registros.</p>'));

  return RelA4_documento_({ titulo: 'Relatório de gestão da qualidade', subtitulo: 'Atendimentos de campo, uso da frota e ações da gestão', tituloArquivo: 'Relatório de gestão da qualidade',
    sigla: 'QLD', identificacao: ctx.periodoLabel, corpo: c.join('\n') });
}

function QualidadeRel_pasta_() {
  return SGO_DocSalvar_pastaPersistente_('QUALIDADE_RELATORIOS_FOLDER_ID', 'Painel de qualidade - Relatórios');
}

function Qualidade_apiGerarRelatorio(sessionId, payload) {
  Qualidade_exigirGestor_(sessionId);
  var sessao = null;
  try { sessao = lerSessaoAuth_(sessionId); } catch (eS) {}
  var periodoDias = (payload || {}).periodoDias || 30;

  var ctx = Qualidade_montarContextoRelatorio_(periodoDias);
  var semDadoNenhum = !(ctx.auvo && ctx.auvo.total) && !(ctx.frota && ctx.frota.totalMovimentacoes);
  var ia = semDadoNenhum
    ? { resumoExecutivo: 'Nenhum atendimento nem retirada de veículo registrado no período selecionado.', pontosDeAtencao: 'Sem dados suficientes para análise neste período.', origem: 'PADRAO', aviso: '' }
    : Qualidade_iaComFallback_(ctx);

  var html = Qualidade_montarRelatorioHtml_(ctx, ia);
  var g = RelA4_salvar_(QualidadeRel_pasta_, 'Últimos ' + ctx.periodoDias + ' dias', html, { compartilhar: false });
  try { SGO_DATA.log('QUALIDADE_RELATORIO', (sessao && sessao.usuario) || '', 'Relatório de gestão da qualidade (' + ctx.periodoDias + ' dias, análise: ' + (ia.origem === 'IA' ? 'IA' : 'texto padrão') + ')' + (g.salvo ? '' : ' — cópia não gravada'), 'QUALIDADE'); } catch (eL) {}
  return { ok: true, html: RelA4_injetarAvisos_(g.html, RelA4_avisosPadrao_(g, [ia])), link: g.pdfUrl, pastaUrl: g.pastaUrl, aviso: [g.aviso, ia.aviso].filter(Boolean).join(' ') };
}
