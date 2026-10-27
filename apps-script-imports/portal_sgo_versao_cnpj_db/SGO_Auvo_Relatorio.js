/****************************************************
 * SGO_Auvo_Relatorio.js
 * RELATÓRIO DE ATENDIMENTOS (AUVO) — A4 PARA IMPRESSÃO
 *
 * 18/10/2026: montado na moldura comum dos relatórios gerenciais
 * (SGO_Documentos_RelatorioA4.js, padrão A4 de 18/10): cabeçalho e rodapé
 * corridos, sumário com páginas quando longo, gráficos em SVG (antes eram
 * desenhados por script e saíam em branco no PDF), seção de pendências de
 * fechamento e cópia HTML + PDF na pasta "Auvo - Relatórios".
 ****************************************************/

function AuvoRel_escaparHtml_(v) {
  return String(v == null ? '' : v).replace(/[&<>"']/g, function(c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

function AuvoRel_parseData_(v) {
  if (!v) return null;
  // 18/10/2026: "dd/mm/aaaa [hh:mm]" era lido como mês/dia (10/09 virava 9 de outubro) e dia > 12 sumia do relatório.
  var m = (v instanceof Date) ? null : /^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2}))?/.exec(String(v));
  var d = (v instanceof Date) ? v : (m ? new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]), Number(m[4] || 0), Number(m[5] || 0)) : new Date(String(v)));
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
// HTML A4 — moldura comum dos relatórios gerenciais (18/10/2026:
// gráficos em SVG, que saem no PDF; antes eram desenhados por script e o
// PDF saía com os quadros em branco).
// ------------------------------------------------------------

/** Pendências de fechamento (foto da última atualização), no mesmo escopo de técnicos. */
function AuvoRel_pendencias_(tecnicosIds) {
  try {
    Auvo_pendBootstrap_();
    var filtro = Array.isArray(tecnicosIds) ? tecnicosIds.map(String).filter(Boolean) : [];
    var itens = SGO_DATA.getAll(SGO_CFG.SHEETS.AUVO_PENDENCIAS).filter(function (p) {
      if (!Auvo_pendDentroDaJanela_(p)) return false;
      if (!filtro.length) return true;
      var chave = SGO_UTILS.safe(p.TECNICO_ID_SGO) ? 'sgo:' + SGO_UTILS.safe(p.TECNICO_ID_SGO) : (SGO_UTILS.safe(p.TECNICO_AUVO_ID) ? 'auvo:' + SGO_UTILS.safe(p.TECNICO_AUVO_ID) : '');
      return filtro.indexOf(chave) !== -1;
    }).sort(function (a, b) { return Number(b.DIAS_ABERTA || 0) - Number(a.DIAS_ABERTA || 0); });
    var ultima = PropertiesService.getScriptProperties().getProperty(AUVO_PEND_CFG.ULTIMA_COMPLETA_KEY) || '';
    var d = ultima ? new Date(ultima) : null;
    return { itens: itens, ultima: d && !isNaN(d.getTime()) ? Utilities.formatDate(d, 'America/Sao_Paulo', 'dd/MM/yyyy HH:mm') : '' };
  } catch (e) {
    return { itens: [], ultima: '', erro: String((e && e.message) || e) };
  }
}

/** Texto padrão (sem IA), só com os números do contexto. */
function AuvoRel_textoPadrao_(ctx) {
  var maior = ctx.rankingTecnicos[0];
  var resumo = 'No período de ' + ((/\((.*)\)/.exec(ctx.periodoLabel) || [])[1] || ctx.periodoLabel) + ' foram registrados ' + RelA4_plural_(ctx.total, 'atendimento', 'atendimentos') + ', ' +
    RelA4_plural_(ctx.concluidas, 'concluído', 'concluídos') + ' e ' + RelA4_plural_(ctx.abertas, 'em aberto', 'em aberto') + '.' +
    (ctx.rankingTecnicos.length ? ' A média foi de ' + RelA4_num_(ctx.mediaTecnico, 1) + ' atendimentos por colaborador' + (maior ? ', com o maior volume em ' + RelA4_plural_(maior.qtd, 'atendimento', 'atendimentos') : '') + '.' : '') +
    (ctx.porTipo.length ? ' O tipo mais frequente foi ' + ctx.porTipo[0].tipo.toLowerCase() + ' (' + RelA4_num_(ctx.porTipo[0].qtd, 0) + ').' : '');
  var pontos = [];
  if (ctx.pctSemRelato) pontos.push(RelA4_num_(ctx.pctSemRelato, 0) + '% das O.S. sem relato de serviço');
  if (ctx.finalizadasSemCheckout) pontos.push(RelA4_plural_(ctx.finalizadasSemCheckout, 'O.S. finalizada sem check-out', 'O.S. finalizadas sem check-out'));
  if (ctx.pendencias && ctx.pendencias.itens.length) pontos.push(RelA4_plural_(ctx.pendencias.itens.length, 'O.S. em aberto no Auvo', 'O.S. em aberto no Auvo') + ' na última atualização das pendências');
  return { resumoExecutivo: resumo, pontosDeAtencao: pontos.length ? 'Merecem acompanhamento da gestão: ' + pontos.join('; ') + '.' : 'Os indicadores do período não mostram desvio que exija ação imediata.' };
}

function Auvo_montarRelatorioHtml_(ctx, ia) {
  var c = [], pend = ctx.pendencias || { itens: [] };
  var comRelato = 100 - ctx.pctSemRelato;
  c.push(RelA4_secao_('Resumo do período', RelA4_kpis_([
    [RelA4_num_(ctx.total, 0), 'Atendimentos no período'], [RelA4_num_(ctx.concluidas, 0), 'Concluídos', 'ok'], [RelA4_num_(ctx.abertas, 0), 'Em aberto', ctx.abertas ? 'aviso' : ''],
    [RelA4_num_(comRelato, 0) + '%', 'O.S. com relato preenchido', comRelato < 90 ? 'aviso' : 'ok'],
    [RelA4_num_(ctx.finalizadasSemCheckout, 0), 'Finalizadas sem check-out', ctx.finalizadasSemCheckout ? 'aviso' : 'ok'], [RelA4_num_(ctx.rankingTecnicos.length, 0), 'Colaboradores com atendimento'],
    [RelA4_num_(ctx.mediaTecnico, 1), 'Média por colaborador'], [RelA4_num_(pend.itens.length, 0), 'Pendências de fechamento', pend.itens.length ? 'critico' : 'ok']
  ])));
  c.push(RelA4_secao_('Interpretação do período', RelA4_paragrafos_(ia.resumoExecutivo) + RelA4_subsecao_('Pontos de atenção', RelA4_paragrafos_(ia.pontosDeAtencao))));
  c.push(RelA4_secao_('Distribuição dos atendimentos',
    RelA4_barras_(ctx.rankingTecnicos.map(function (r) { return { rotulo: r.nome, valor: r.qtd, rotuloValor: RelA4_plural_(r.qtd, 'atendimento', 'atendimentos') + ' · ' + RelA4_num_(ctx.total ? r.qtd / ctx.total * 100 : 0, 0) + '%' }; }),
      { titulo: 'Atendimentos por colaborador no período (quantidade e parcela do total)', vazio: 'Nenhum atendimento com colaborador identificado.' }) +
    RelA4_barras_(ctx.porTipo.map(function (t) { return { rotulo: t.tipo, valor: t.qtd, rotuloValor: RelA4_num_(t.qtd, 0) + ' · ' + RelA4_num_(ctx.total ? t.qtd / ctx.total * 100 : 0, 0) + '%' }; }),
      { titulo: 'Atendimentos por tipo no período (quantidade e parcela do total)', cor: RELA4_CORES.petroleo, vazio: 'Nenhum atendimento no período.' })));
  c.push(RelA4_secao_('Pendências de fechamento', (pend.itens.length
    ? RelA4_tabela_([{ t: 'O.S.' }, { t: 'Data' }, { t: 'Tipo' }, { t: 'Cliente' }, { t: 'Responsável' }, { t: 'Dias em aberto', num: true }, { t: 'Evidência' }],
      pend.itens.map(function (p) {
        var os = p.TASK_URL ? { html: '<a href="' + RelA4_esc_(p.TASK_URL) + '" target="_blank" rel="noopener">' + RelA4_esc_(p.AUVO_TASK_ID) + '</a>' } : String(p.AUVO_TASK_ID || '—');
        return [os, RelA4_dataBr_(p.TASK_DATE) || '—', p.TASK_TYPE_DESCRICAO || '—', p.CLIENTE_NOME || '—', p.TECNICO_NOME || '—', RelA4_num_(Number(p.DIAS_ABERTA) || 0, 0),
          p.TEM_EVIDENCIA === 'SIM' ? RelA4_marca_('Com evidência', 'aviso') : RelA4_marca_('Sem evidência', 'critico')];
      }), { legenda: 'O.S. ainda não finalizadas no Auvo, da mais antiga para a mais recente' })
    : RelA4_caixa_('Nenhuma O.S. em aberto na última atualização das pendências.', 'ok')) +
    '<p class="nota">' + RelA4_esc_((pend.ultima ? 'Situação da última atualização das pendências, em ' + pend.ultima + '. ' : 'As pendências ainda não foram atualizadas pelo menos uma vez. ') +
      '"Com evidência" quer dizer que há relato, questionário, check-in ou assinatura: o serviço provavelmente foi feito e falta só fechar a O.S.; "sem evidência" pede conferência antes de cobrar.') + '</p>'));
  c.push(RelA4_secao_('Atendimentos do período', RelA4_tabela_([{ t: 'O.S.' }, { t: 'Data' }, { t: 'Cliente' }, { t: 'Responsável' }, { t: 'Tipo' }, { t: 'Situação' }],
    ctx.tabela.map(function (t) {
      return [t.osUrl ? { html: '<a href="' + RelA4_esc_(t.osUrl) + '" target="_blank" rel="noopener">' + RelA4_esc_(t.osNumero) + '</a>' } : t.osNumero, t.data, t.cliente, t.tecnico, t.tipo,
        RelA4_marca_(t.status, t.status === 'Concluído' ? 'ok' : 'aviso')];
    }), { vazio: 'Nenhum atendimento no período e escopo selecionados.', legenda: 'Atendimentos do período, do mais recente para o mais antigo', compacta: ctx.tabela.length > 40 }) +
    '<p class="nota">Dados da sincronização do Auvo com o SGO+. A interpretação usa somente os números calculados neste relatório.</p>'));
  return RelA4_documento_({ titulo: 'Relatório de atendimentos de campo', subtitulo: 'Atendimentos sincronizados do Auvo: volume, distribuição e pendências', tituloArquivo: 'Relatório de atendimentos (Auvo)',
    sigla: 'AUV', identificacao: ctx.periodoLabel, ficha: [['Escopo', ctx.escopoLabel]], corpo: c.join('\n') });
}

// ------------------------------------------------------------
// ORQUESTRAÇÃO — junta agregação + IA + HTML, exposta ao painel
// ------------------------------------------------------------
// Sem a chave da IA (ou com falha) o relatório sai com o texto padrão; o aviso fica só na tela.
function Auvo_iaComFallback_(ctx) {
  try {
    var r = AuvoRelIA_gerarInterpretacao_(ctx);
    return { resumoExecutivo: RelA4_limparTextoIa_(r.resumoExecutivo), pontosDeAtencao: RelA4_limparTextoIa_(r.pontosDeAtencao), origem: 'IA', aviso: '' };
  } catch (e) {
    var p = AuvoRel_textoPadrao_(ctx);
    p.origem = 'PADRAO'; p.aviso = RelA4_avisoFalhaIa_(/GEMINI_API_KEY não configurada/.test(String(e && e.message)) ? { semChave: true } : e);
    return p;
  }
}

function AuvoRel_pasta_() {
  return SGO_DocSalvar_pastaPersistente_('AUVO_RELATORIOS_FOLDER_ID', 'Auvo - Relatórios');
}

function Auvo_apiGerarRelatorio(sessionId, payload) {
  Auvo_exigirAdmin_(sessionId);
  Auvo_incBootstrap_(); // antes da 1ª sincronização a aba AUVO_TAREFAS ainda não existe
  var periodoDias = (payload || {}).periodoDias || 30;

  var tecnicosIds = Array.isArray((payload || {}).tecnicosIds) ? payload.tecnicosIds : [];
  var ctx = Auvo_montarContextoRelatorio_(periodoDias, tecnicosIds);
  ctx.pendencias = AuvoRel_pendencias_(tecnicosIds);
  var ia = ctx.total
    ? Auvo_iaComFallback_(ctx)
    : { resumoExecutivo: 'Nenhum atendimento registrado no período selecionado.', pontosDeAtencao: 'Sem dados suficientes para análise neste período.', origem: 'PADRAO', aviso: '' };

  var g = RelA4_salvar_(AuvoRel_pasta_, (tecnicosIds.length ? 'Colaboradores selecionados' : 'Todos os colaboradores') + ' - ' + ctx.periodoDias + ' dias', Auvo_montarRelatorioHtml_(ctx, ia), { compartilhar: false });
  var sessao = null;
  try { sessao = lerSessaoAuth_(sessionId); } catch (eS) {}
  try { SGO_DATA.log('AUVO_RELATORIO', (sessao && sessao.usuario) || '', 'Relatório de atendimentos (' + ctx.periodoDias + ' dias, ' + ctx.escopoLabel + ', análise: ' + (ia.origem === 'IA' ? 'IA' : 'texto padrão') + ')' + (g.salvo ? '' : ' — cópia não gravada'), 'AUVO'); } catch (eL) {}
  return { ok: true, html: RelA4_injetarAvisos_(g.html, RelA4_avisosPadrao_(g, [ia])), link: g.pdfUrl, pastaUrl: g.pastaUrl, aviso: [g.aviso, ia.aviso].filter(Boolean).join(' ') };
}

function Auvo_apiListarColaboradoresRelatorio(sessionId) {
  Auvo_exigirAdmin_(sessionId);
  Auvo_incBootstrap_();
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
