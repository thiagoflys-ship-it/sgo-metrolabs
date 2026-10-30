/****************************************************
 * MÓDULO REPRESENTAÇÃO — PAINEL DE ABERTURA E ACOMPANHAMENTO (29/10/2026)
 *
 * Pedido do dono (29/10/2026): "quero página igual à do SGO+ [...] todos os perfis contenham dash com Kanban, com gráfico
 * Gantt, com índices com informação de acompanhamento e abertura".
 *
 * Uma chamada por tela: Representacao_api(sessionId, 'painel', { dias }) devolve os índices, as colunas do Kanban e as
 * barras do Gantt já filtrados pelo escopo de quem pede:
 *  - representada (RepA_painel_): só os pedidos e chamados dela (Rep_escopo_), sem técnico fora da visita, sem nota interna,
 *    sem valor, sem primeiro contato interno;
 *  - equipe da Metrolabs (RepI_painel_): todas as representadas ou uma (filtro), só os chamados que a pessoa pode ver
 *    (AstC_podeVer_), com SLA de aceite, primeiro contato, visita por prioridade, fila, carga por técnico e por representada.
 * O painel do cliente final ("Meus chamados") fica na Assistência (AstP_painelCliente_, SGO_Assistencia_Painel.js) e usa as
 * mesmas regras de tempo.
 *
 * Regras de tempo (iguais em todos os índices):
 *  - horas úteis pelo expediente da Metrolabs (SGO_Expediente.js: dias e horário; Ast_minUteisEntre_);
 *  - "tempo até X" conta do envio do pedido pela representada (ATEC_SOLICITACOES.CRIADO_EM) e desconta o tempo em que o
 *    pedido esperou o complemento da representada (PAUSA_MIN);
 *  - período (30, 90, 180 ou 365 dias corridos até hoje) vale para o que aconteceu no período: aceite pelo dia do aceite,
 *    visita pelo dia da chegada, conclusão pelo dia da conclusão, distribuições pelo dia do envio. "Agora" (abertos, fila,
 *    em risco, vencidos, pendências) não depende do período.
 * Nenhuma função devolve Date cru: datas vão em ms (número) e em texto dd/mm/aaaa hh:mm.
 ****************************************************/

var REPP_PERIODOS = [30, 90, 180, 365];
var REPP_PERIODO_PADRAO = 90;
/** Etapas da representada que já terminaram (não contam como abertas): Recusado, Concluído, Encerrado, Cancelado. */
var REPP_FECHADAS = [3, 10, 11, 12];
/** Reincidência: outro chamado do mesmo equipamento aberto até 90 dias antes. */
var REPP_REINCIDENCIA_DIAS = 90;
/** Kanban: cartões das colunas fechadas só dos últimos 30 dias (no máximo 30 por coluna). */
var REPP_KANBAN_FECHADOS_DIAS = 30;
var REPP_COR_PRAZO = { NO_PRAZO: 'No prazo', EM_RISCO: 'Em risco', VENCIDO: 'Vencido', PAUSADO: 'Pausado', CUMPRIDO: 'Cumprido', FORA_DO_PRAZO: 'Fora do prazo', SEM_PRAZO: 'Sem prazo' };

function RepP_media_(l) { return l.length ? Math.round(l.reduce(function (s, x) { return s + x; }, 0) / l.length) : null; }
function RepP_pct_(a, b) { return b ? Math.round(a * 1000 / b) / 10 : null; }
function RepP_minDia_() { var cfg = Ast_expediente_(); return Math.max(60, (Ast_minDe_(cfg.fim) || 1050) - (Ast_minDe_(cfg.ini) || 480)); }
function RepP_uteis_(a, b, pausa) { return a === null || b === null ? null : Math.max(0, Ast_minUteisEntre_(a, b) - (Number(pausa) || 0)); }
function RepP_conta_(mapa, k, n) { k = Rep_s_(k) || 'Não informado'; mapa[k] = (mapa[k] || 0) + (n === undefined ? 1 : n); }
function RepP_ordenar_(mapa, max) {
  return Object.keys(mapa).map(function (k) { return { t: k, n: mapa[k] }; }).sort(function (a, b) { return b.n - a.n || a.t.localeCompare(b.t, 'pt-BR'); }).slice(0, max || 10);
}

/** Prazo de aceite do pedido (Rep_prazoAceite_) no vocabulário do painel. */
function RepP_prazoPedido_(s, agoraMs, prazos) {
  var p = Rep_prazoAceite_(s, agoraMs, prazos), e = { EM_DIA: 'NO_PRAZO', EM_RISCO: 'EM_RISCO', VENCIDO: 'VENCIDO', PAUSADO: 'PAUSADO' }[p.estado] || 'SEM_PRAZO';
  return { estado: e, de: 'ACEITE', ateMs: Ast_ms_(p.ate), ate: Rep_br_(p.ate), texto: e === 'SEM_PRAZO' ? '' : p.texto };
}
/** Prazo de atendimento do chamado (Ast_slaEstado_: prioridade e contrato) no vocabulário do painel. */
function RepP_prazoChamado_(c, agoraMs, regras) {
  var p = Ast_slaEstado_(c, agoraMs, regras);
  var e = { EM_DIA: 'NO_PRAZO', EM_RISCO: 'EM_RISCO', ESTOURADO: 'VENCIDO', PAUSADO: 'PAUSADO', CUMPRIDO: 'CUMPRIDO', FORA_DO_PRAZO: 'FORA_DO_PRAZO' }[p.estado] || 'SEM_PRAZO';
  return { estado: e, de: 'ATENDIMENTO', ateMs: Ast_ms_(p.ate), ate: Rep_br_(p.ate), texto: e === 'SEM_PRAZO' ? '' : p.texto };
}

/**
 * Um ciclo (pedido ainda sem chamado, ou chamado com o pedido que o originou), com tudo o que os índices, o Kanban e o
 * Gantt precisam. ctx: { agoraMs, regras, os (mapa), eqs (mapa), uns (mapa), reps (mapa), msgs (primeira mensagem da
 * Metrolabs por ref) }.
 */
function RepP_ciclo_(sol, c, ctx) {
  var rep = ctx.reps[Rep_s_((c || sol).REPRESENTADA_ID)] || null, prazos = Rep_prazos_(rep);
  var eq = ctx.eqs[Rep_s_((c || sol).EQUIPAMENTO_ID)] || {}, un = ctx.uns[Rep_s_((c || sol).UNIDADE_ID)] || {};
  var et = c ? Rep_etapaChamado_(c) : Rep_etapaSol_(sol);
  var x = {
    tipo: c ? 'CHAMADO' : 'SOLICITACAO', id: Rep_s_((c || sol).ID), numero: Rep_s_((c || sol).NUMERO), pedidoNumero: sol ? Rep_s_(sol.NUMERO) : '',
    etapa: et.n, etapaNome: et.nome, representadaId: Rep_s_((c || sol).REPRESENTADA_ID), representadaNome: Rep_s_((c || sol).REPRESENTADA_NOME) || Rep_s_(rep && rep.NOME),
    clienteNome: Rep_s_((c || sol).CLIENTE_NOME), unidade: Rep_s_(c ? c.UNIDADE_NOME : un.NOME_UNIDADE) || Rep_s_(un.NOME_UNIDADE), cidade: Rep_s_(un.CIDADE), uf: Rep_up_(un.UF),
    equipamentoId: Rep_s_(eq.ID), modelo: Rep_s_(eq.MODELO) || Rep_s_((c || sol).EQUIPAMENTO_TEXTO), serie: Rep_s_(eq.SERIE),
    garantia: Rep_s_(eq.ID) ? Rep_garantia_(eq).estado : 'NAO_COMPROVADA', enquadramento: Rep_up_((c || sol).ENQUADRAMENTO_PRETENDIDO),
    prioridade: c ? (Rep_up_(c.PRIORIDADE) || 'P3') : (Rep_up_(sol.PARADA) === 'TOTAL' ? 'P2' : 'P3'), prioridadePrevista: !c,
    protocolo: Rep_s_((c || sol).PROTOCOLO_REPRESENTADA), tecnicoId: c ? Rep_s_(c.TECNICO_ID) : '', tecnicoNome: c ? Rep_s_(c.TECNICO_NOME) : '',
    situacao: Rep_up_((c || sol).SITUACAO)
  };
  var pausa = sol ? Number(sol.PAUSA_MIN) || 0 : 0;
  x.enviadoMs = Ast_ms_(sol ? sol.CRIADO_EM : c.ABERTO_EM);
  x.pausaMin = pausa;
  // aceite (pedido convertido em chamado): minutos úteis líquidos da pausa do complemento x prazo do pedido
  if (sol && Rep_up_(sol.SITUACAO) === 'CONVERTIDA') {
    x.aceiteMs = Ast_ms_(sol.TRATADA_EM) !== null ? Ast_ms_(sol.TRATADA_EM) : (c ? Ast_ms_(c.ABERTO_EM) : null);
    x.aceiteMin = RepP_uteis_(x.enviadoMs, x.aceiteMs, pausa);
    x.aceitePrazoMin = Number(sol.ACEITE_MIN_UTEIS) || prazos.aceiteMin;
    x.aceiteNoPrazo = x.aceiteMin === null ? null : x.aceiteMin <= x.aceitePrazoMin;
  } else { x.aceiteMs = null; x.aceiteMin = null; x.aceitePrazoMin = sol ? Number(sol.ACEITE_MIN_UTEIS) || prazos.aceiteMin : null; x.aceiteNoPrazo = null; }
  if (sol && Rep_up_(sol.SITUACAO) === 'DESCARTADA') x.recusaMs = Ast_ms_(sol.TRATADA_EM);
  // primeiro contato (só a Metrolabs vê): primeiro registro da Metrolabs depois do aceite (triagem assumida ou iniciada,
  // mensagem à representada no pedido ou no chamado). Sem campo próprio de "contato com o cliente feito" (decisão pendente).
  if (c && x.aceiteMs !== null) {
    var cand = [Ast_ms_(c.ASSUMIDO_EM), Ast_ms_(c.TRIAGEM_INICIO_EM), ctx.msgs['CHAMADO|' + x.id], sol ? ctx.msgs['SOLICITACAO|' + Rep_s_(sol.ID)] : null]
      .filter(function (v) { return v !== null && v !== undefined && v >= x.aceiteMs; });
    x.primeiroContatoMs = cand.length ? Math.min.apply(null, cand) : null;
    x.primeiroContatoMin = RepP_uteis_(x.aceiteMs, x.primeiroContatoMs, 0);
    x.primeiroContatoPrazoMin = prazos.primeiroContatoMin;
  }
  // visita e conclusão
  var os = c ? ctx.os[Rep_s_(c.OS_ID)] || null : null;
  x.visitaPrevMs = c ? Ast_ms_(c.AGENDADO_PARA) : null;
  x.visitaMs = os ? Ast_ms_(os.CHEGOU_EM) : null;
  x.visitaMin = RepP_uteis_(x.enviadoMs, x.visitaMs, pausa);
  x.conclusaoMs = c ? (Ast_ms_(c.ATENDIDO_EM) !== null ? Ast_ms_(c.ATENDIDO_EM) : (['RESOLVIDO_REMOTO', 'ENCERRADO'].indexOf(x.situacao) >= 0 ? Ast_ms_(c.ENCERRADO_EM) : null)) : null;
  x.conclusaoMin = RepP_uteis_(x.enviadoMs, x.conclusaoMs, pausa);
  x.canceladoMs = c ? Ast_ms_(c.CANCELADO_EM) : (sol && Rep_up_(sol.SITUACAO) === 'CANCELADA' ? Ast_ms_(sol.CANCELADA_EM) : null);
  x.encerradoMs = c ? Ast_ms_(c.ENCERRADO_EM) : null;
  // prazo que vale agora: aceite (pedido) ou atendimento (chamado)
  x.prazo = c ? RepP_prazoChamado_(c, ctx.agoraMs, ctx.regras) : (['NOVA', 'COMPLEMENTO'].indexOf(x.situacao) >= 0 ? RepP_prazoPedido_(sol, ctx.agoraMs, prazos) : { estado: 'SEM_PRAZO', de: '', ateMs: null, ate: '', texto: '' });
  x.aberto = REPP_FECHADAS.indexOf(x.etapa) < 0;
  x.comQuem = !x.aberto ? '' : x.situacao === 'COMPLEMENTO' ? 'REPRESENTADA' : (x.situacao === 'AGUARDANDO_ORCAMENTO' || x.situacao === 'AGUARDANDO_CLIENTE') ? 'CLIENTE' : 'METROLABS';
  x.fimMs = x.aberto ? null : [x.conclusaoMs, x.encerradoMs, x.canceladoMs, x.recusaMs].filter(function (v) { return v !== null && v !== undefined; })[0] || null;
  if (!x.aberto && x.fimMs === null) x.fimMs = Ast_ms_((c || sol).ATUALIZADO_EM) || x.enviadoMs;
  x.complemento = sol && x.situacao === 'COMPLEMENTO' ? { pergunta: Rep_s_(sol.COMPLEMENTO_PERGUNTA), desdeMs: Ast_ms_(sol.COMPLEMENTO_EM || sol.PAUSA_DESDE), desde: Rep_br_(sol.COMPLEMENTO_EM || sol.PAUSA_DESDE),
    esperaMin: RepP_uteis_(Ast_ms_(sol.COMPLEMENTO_EM || sol.PAUSA_DESDE), ctx.agoraMs, 0) } : null;
  return x;
}

/** Contexto de leitura (uma leitura de cada tabela por chamada). */
function RepP_ctx_(agoraMs) {
  var reps = {};
  Rep_ler_(REP_ABAS.REPRESENTADAS).forEach(function (r) { reps[Rep_s_(r.ID)] = r; });
  var msgs = {};
  Rep_ler_(REP_ABAS.MENSAGENS).forEach(function (m) {
    if (Rep_up_(m.AUTOR_LADO) !== 'METROLABS' || Rep_up_(m.INTERNA) === 'SIM') return;
    var k = Rep_up_(m.REF_TIPO) + '|' + Rep_s_(m.REF_ID), t = Ast_ms_(m.EM);
    if (t !== null && (msgs[k] === undefined || t < msgs[k])) msgs[k] = t;
  });
  return { agoraMs: agoraMs, regras: Ast_regras_(), os: Ast_mapa_(AST_ABAS.OS), eqs: Ast_mapa_(SGO_CFG.SHEETS.CAD_EQUIPAMENTOS), uns: Ast_mapa_(SGO_CFG.SHEETS.CAD_UNIDADES), reps: reps, msgs: msgs };
}
/** Ciclos a partir das solicitações e dos chamados já filtrados pelo escopo: um por chamado; pedido só enquanto não virou chamado. */
function RepP_ciclos_(sols, chamados, ctx) {
  var solPorId = {};
  sols.forEach(function (s) { solPorId[Rep_s_(s.ID)] = s; });
  var l = chamados.map(function (c) { return RepP_ciclo_(solPorId[Rep_s_(c.SOLICITACAO_ID)] || null, c, ctx); });
  sols.forEach(function (s) { if (Rep_up_(s.SITUACAO) !== 'CONVERTIDA') l.push(RepP_ciclo_(s, null, ctx)); });
  return l;
}

/** Reincidência: marca x.reincidente (outro chamado do mesmo equipamento até 90 dias antes do envio). */
function RepP_marcarReincidencia_(ciclos) {
  var porEq = {};
  ciclos.filter(function (x) { return x.tipo === 'CHAMADO' && x.equipamentoId && x.situacao !== 'CANCELADO'; }).forEach(function (x) { (porEq[x.equipamentoId] = porEq[x.equipamentoId] || []).push(x); });
  Object.keys(porEq).forEach(function (k) {
    var l = porEq[k].sort(function (a, b) { return (a.enviadoMs || 0) - (b.enviadoMs || 0); });
    for (var i = 1; i < l.length; i++) if (l[i].enviadoMs !== null && l[i - 1].enviadoMs !== null && l[i].enviadoMs - l[i - 1].enviadoMs <= REPP_REINCIDENCIA_DIAS * 864e5) { l[i].reincidente = true; l[i].reincidenteDe = l[i - 1].numero; }
  });
}

/**
 * Índices (fórmulas no manual: docs/MANUAL_MODULO_REPRESENTACAO.md, seção "Painel"). interno: inclui primeiro contato,
 * SLA por prioridade, fila, carga por técnico e por representada.
 */
function RepP_indices_(ciclos, dias, agoraMs, interno) {
  var de = agoraMs - dias * 864e5, no = function (ms) { return ms !== null && ms !== undefined && ms >= de && ms <= agoraMs; };
  var abertos = ciclos.filter(function (x) { return x.aberto; });
  var noPeriodo = ciclos.filter(function (x) { return no(x.enviadoMs); });
  var aceitos = ciclos.filter(function (x) { return x.aceiteMin !== null && no(x.aceiteMs); });
  var visitas = ciclos.filter(function (x) { return x.visitaMin !== null && no(x.visitaMs); });
  var concl = ciclos.filter(function (x) { return x.conclusaoMin !== null && no(x.conclusaoMs); });
  var porEtapa = {}, porPrio = {}, porCli = {}, porUf = {}, gar = { EM_GARANTIA: 0, FORA: 0, NAO_COMPROVADA: 0 }, porMod = {}, porModRe = {}, porEqRe = {};
  REP_ETAPAS.forEach(function (e) { porEtapa[e.n] = 0; });
  // por etapa: os abertos agora e os que fecharam no período (o retrato da carteira)
  ciclos.forEach(function (x) { if (x.aberto || no(x.fimMs)) porEtapa[x.etapa]++; });
  abertos.forEach(function (x) { RepP_conta_(porPrio, x.prioridade); });
  noPeriodo.forEach(function (x) {
    RepP_conta_(porCli, x.clienteNome); RepP_conta_(porUf, x.uf || 'UF não informada');
    if (x.tipo === 'CHAMADO' || x.situacao === 'NOVA' || x.situacao === 'COMPLEMENTO') gar[x.garantia] = (gar[x.garantia] || 0) + 1;
    if (x.tipo === 'CHAMADO' && x.situacao !== 'CANCELADO') { RepP_conta_(porMod, x.modelo || 'Modelo não informado'); if (x.reincidente) { RepP_conta_(porModRe, x.modelo || 'Modelo não informado'); RepP_conta_(porEqRe, (x.modelo || 'Equipamento') + (x.serie ? ' · série ' + x.serie : '') + ' · ' + x.clienteNome); } }
  });
  var chamPer = noPeriodo.filter(function (x) { return x.tipo === 'CHAMADO' && x.situacao !== 'CANCELADO'; });
  var reinc = chamPer.filter(function (x) { return x.reincidente; });
  var r = {
    dias: dias, de: Rep_br_(Ast_agora_(de)).slice(0, 10), ate: Rep_br_(Ast_agora_(agoraMs)).slice(0, 10), minDia: RepP_minDia_(),
    abertos: abertos.length,
    aguardandoMetrolabs: abertos.filter(function (x) { return x.comQuem === 'METROLABS'; }).length,
    aguardandoRepresentada: abertos.filter(function (x) { return x.comQuem === 'REPRESENTADA'; }).length,
    aguardandoCliente: abertos.filter(function (x) { return x.comQuem === 'CLIENTE'; }).length,
    emRisco: abertos.filter(function (x) { return x.prazo.estado === 'EM_RISCO'; }).length,
    vencidos: abertos.filter(function (x) { return x.prazo.estado === 'VENCIDO'; }).length,
    enviadosPeriodo: noPeriodo.length,
    aceite: { total: aceitos.length, noPrazo: aceitos.filter(function (x) { return x.aceiteNoPrazo; }).length, mediaMin: RepP_media_(aceitos.map(function (x) { return x.aceiteMin; })) },
    visita: { total: visitas.length, mediaMin: RepP_media_(visitas.map(function (x) { return x.visitaMin; })) },
    conclusao: { total: concl.length, mediaMin: RepP_media_(concl.map(function (x) { return x.conclusaoMin; })) },
    porEtapa: REP_ETAPAS.filter(function (e) { return porEtapa[e.n]; }).map(function (e) { return { etapa: e.n, t: e.nome, n: porEtapa[e.n] }; }),
    porPrioridade: ['P1', 'P2', 'P3', 'P4'].map(function (p) { return { codigo: p, t: AST_PRIORIDADES[p], n: porPrio[p] || 0 }; }),
    porCliente: RepP_ordenar_(porCli, 10), porUf: RepP_ordenar_(porUf, 27),
    garantia: [{ codigo: 'EM_GARANTIA', t: 'Em garantia', n: gar.EM_GARANTIA }, { codigo: 'FORA', t: 'Fora de garantia', n: gar.FORA }, { codigo: 'NAO_COMPROVADA', t: 'Garantia não comprovada', n: gar.NAO_COMPROVADA }],
    reincidencia: { chamados: chamPer.length, reincidentes: reinc.length, pct: RepP_pct_(reinc.length, chamPer.length), porEquipamento: RepP_ordenar_(porEqRe, 10),
      porModelo: RepP_ordenar_(porMod, 10).map(function (m) { return { t: m.t, n: m.n, reincidentes: porModRe[m.t] || 0 }; }) }
  };
  r.aceite.pct = RepP_pct_(r.aceite.noPrazo, r.aceite.total);
  if (!interno) return r;
  // só a Metrolabs
  var contato = ciclos.filter(function (x) { return x.primeiroContatoMin !== null && x.primeiroContatoMin !== undefined && no(x.primeiroContatoMs); });
  r.primeiroContato = { total: contato.length, noPrazo: contato.filter(function (x) { return x.primeiroContatoMin <= x.primeiroContatoPrazoMin; }).length, mediaMin: RepP_media_(contato.map(function (x) { return x.primeiroContatoMin; })),
    semRegistro: ciclos.filter(function (x) { return x.tipo === 'CHAMADO' && x.aberto && x.aceiteMs !== null && (x.primeiroContatoMs === null || x.primeiroContatoMs === undefined); }).length };
  r.primeiroContato.pct = RepP_pct_(r.primeiroContato.noPrazo, r.primeiroContato.total);
  r.slaPorPrioridade = ['P1', 'P2', 'P3', 'P4'].map(function (p) {
    var at = ciclos.filter(function (x) { return x.tipo === 'CHAMADO' && x.prioridade === p && (x.prazo.estado === 'CUMPRIDO' || x.prazo.estado === 'FORA_DO_PRAZO') && no(x.conclusaoMs || x.visitaMs); });
    var vi = ciclos.filter(function (x) { return x.tipo === 'CHAMADO' && x.prioridade === p && x.visitaMin !== null && no(x.visitaMs); });
    var ab = abertos.filter(function (x) { return x.tipo === 'CHAMADO' && x.prioridade === p; });
    var ok = at.filter(function (x) { return x.prazo.estado === 'CUMPRIDO'; }).length;
    return { codigo: p, t: AST_PRIORIDADES[p], atendidos: at.length, noPrazo: ok, pct: RepP_pct_(ok, at.length), mediaVisitaMin: RepP_media_(vi.map(function (x) { return x.visitaMin; })),
      abertos: ab.length, vencidos: ab.filter(function (x) { return x.prazo.estado === 'VENCIDO'; }).length, emRisco: ab.filter(function (x) { return x.prazo.estado === 'EM_RISCO'; }).length };
  });
  r.fila = abertos.filter(function (x) { return x.tipo === 'SOLICITACAO'; }).map(function (x) {
    return { id: x.id, numero: x.numero, representada: x.representadaNome, cliente: x.clienteNome, idadeMin: RepP_uteis_(x.enviadoMs, agoraMs, x.situacao === 'COMPLEMENTO' ? 0 : x.pausaMin), prazo: x.prazo, situacao: x.situacao, parada: x.prioridade === 'P2' };
  }).sort(function (a, b) { return (a.prazo.ateMs || 0) - (b.prazo.ateMs || 0); });
  var carga = {};
  abertos.filter(function (x) { return x.tipo === 'CHAMADO'; }).forEach(function (x) {
    var k = x.tecnicoNome || 'Sem técnico definido', g = carga[k] = carga[k] || { nome: k, abertos: 0, agendados: 0, vencidos: 0, emRisco: 0 };
    g.abertos++; if (x.visitaPrevMs !== null && x.etapa >= 7) g.agendados++; if (x.prazo.estado === 'VENCIDO') g.vencidos++; if (x.prazo.estado === 'EM_RISCO') g.emRisco++;
  });
  r.cargaTecnico = Object.keys(carga).map(function (k) { return carga[k]; }).sort(function (a, b) { return b.abertos - a.abertos || a.nome.localeCompare(b.nome, 'pt-BR'); });
  var porRep = {};
  ciclos.forEach(function (x) {
    var g = porRep[x.representadaId] = porRep[x.representadaId] || { id: x.representadaId, nome: x.representadaNome, abertos: 0, fila: 0, vencidos: 0, enviados: 0, aceitos: 0, aceitosNoPrazo: 0 };
    if (x.aberto) { g.abertos++; if (x.prazo.estado === 'VENCIDO') g.vencidos++; }
    if (x.aberto && x.tipo === 'SOLICITACAO') g.fila++;
    if (no(x.enviadoMs)) g.enviados++;
    if (x.aceiteMin !== null && no(x.aceiteMs)) { g.aceitos++; if (x.aceiteNoPrazo) g.aceitosNoPrazo++; }
  });
  r.porRepresentada = Object.keys(porRep).map(function (k) { var g = porRep[k]; g.aceitePct = RepP_pct_(g.aceitosNoPrazo, g.aceitos); return g; }).sort(function (a, b) { return b.abertos - a.abertos || a.nome.localeCompare(b.nome, 'pt-BR'); });
  return r;
}

/** Cartão do Kanban e barra do Gantt (o mesmo objeto). externo: tira o que a representada não vê. */
function RepP_cartao_(x, externo) {
  var visitaVisivel = x.etapa >= 7 && x.etapa <= 11;
  var o = { tipo: x.tipo, id: x.id, numero: x.numero, pedidoNumero: x.pedidoNumero, etapa: x.etapa, etapaNome: x.etapaNome, clienteNome: x.clienteNome, unidade: x.unidade,
    cidade: [x.cidade, x.uf].filter(Boolean).join('/'), equipamento: [x.modelo, x.serie ? 'série ' + x.serie : ''].filter(Boolean).join(' · '), protocolo: x.protocolo,
    prioridade: x.prioridade, prioridadePrevista: x.prioridadePrevista, garantia: x.garantia, comQuem: x.comQuem, aberto: x.aberto, reincidente: !!x.reincidente,
    prazo: { estado: x.prazo.estado, nome: REPP_COR_PRAZO[x.prazo.estado] || '', de: x.prazo.de, ateMs: x.prazo.ateMs, ate: x.prazo.ate, texto: x.prazo.texto },
    enviadoMs: x.enviadoMs, enviado: x.enviadoMs !== null ? Rep_br_(Ast_agora_(x.enviadoMs)) : '', aceiteMs: x.aceiteMs, visitaPrevMs: visitaVisivel ? x.visitaPrevMs : null, visitaMs: x.visitaMs,
    conclusaoMs: x.conclusaoMs, fimMs: x.fimMs, podeResponder: x.situacao === 'COMPLEMENTO',
    tecnico: visitaVisivel || !externo ? x.tecnicoNome : '' };
  if (!externo) { o.representadaId = x.representadaId; o.representadaNome = x.representadaNome; o.tecnicoId = x.tecnicoId; o.situacao = x.situacao; }
  return o;
}
function RepP_kanban_(ciclos, agoraMs, externo) {
  var limite = agoraMs - REPP_KANBAN_FECHADOS_DIAS * 864e5;
  return REP_ETAPAS.map(function (e) {
    var fechada = REPP_FECHADAS.indexOf(e.n) >= 0;
    var l = ciclos.filter(function (x) { return x.etapa === e.n && (!fechada || (x.fimMs !== null && x.fimMs >= limite)); });
    l.sort(fechada ? function (a, b) { return (b.fimMs || 0) - (a.fimMs || 0); } : function (a, b) { return (a.prazo.ateMs || 9e15) - (b.prazo.ateMs || 9e15) || (a.enviadoMs || 0) - (b.enviadoMs || 0); });
    return { n: e.n, nome: e.nome, fechada: fechada, qtd: l.length, itens: l.slice(0, fechada ? 30 : 200).map(function (x) { return RepP_cartao_(x, externo); }) };
  });
}
/** Gantt da carteira: abertos e os que fecharam nos últimos 365 dias (a tela escolhe a janela). */
function RepP_gantt_(ciclos, agoraMs, externo) {
  var limite = agoraMs - 365 * 864e5;
  return ciclos.filter(function (x) { return x.enviadoMs !== null && (x.aberto || (x.fimMs !== null && x.fimMs >= limite)); })
    .sort(function (a, b) { return a.enviadoMs - b.enviadoMs; }).map(function (x) { return RepP_cartao_(x, externo); });
}

/** Marcos do chamado (previsto x realizado) para a ficha. */
function RepP_marcos_(x) {
  var m = [{ nome: 'Pedido enviado', previstoMs: null, realizadoMs: x.enviadoMs }];
  if (x.tipo === 'SOLICITACAO' || x.aceiteMs !== null) m.push({ nome: 'Aceite pela Metrolabs', previstoMs: x.enviadoMs !== null && x.aceitePrazoMin ? Ast_somarMinUteis_(x.enviadoMs, x.aceitePrazoMin + (x.pausaMin || 0)) : null, realizadoMs: x.aceiteMs });
  if (x.tipo === 'CHAMADO') {
    m.push({ nome: 'Visita', previstoMs: x.visitaPrevMs, realizadoMs: x.visitaMs });
    m.push({ nome: 'Conclusão', previstoMs: x.prazo.de === 'ATENDIMENTO' ? x.prazo.ateMs : null, realizadoMs: x.conclusaoMs });
  }
  return m.map(function (k) {
    var atraso = k.previstoMs !== null && k.realizadoMs !== null && k.realizadoMs !== undefined ? k.realizadoMs > k.previstoMs : null;
    return { nome: k.nome, previstoMs: k.previstoMs, previsto: k.previstoMs ? Rep_br_(Ast_agora_(k.previstoMs)) : '', realizadoMs: k.realizadoMs === undefined ? null : k.realizadoMs,
      realizado: k.realizadoMs ? Rep_br_(Ast_agora_(k.realizadoMs)) : '', atrasado: atraso };
  });
}

/** Representada: o painel dela (só o escopo da sessão). d: { dias }. */
function RepA_painel_(eu, d) {
  var esc = Rep_escopo_(eu), agoraMs = Date.now(), dias = REPP_PERIODOS.indexOf(Number(d && d.dias)) >= 0 ? Number(d.dias) : REPP_PERIODO_PADRAO;
  var ctx = RepP_ctx_(agoraMs), ciclos = RepP_ciclos_(esc.solicitacoes(), esc.chamados(), ctx);
  RepP_marcarReincidencia_(ciclos);
  var ind = RepP_indices_(ciclos, dias, agoraMs, false);
  var pend = ciclos.filter(function (x) { return x.complemento; }).map(function (x) {
    return { tipo: x.tipo, id: x.id, numero: x.numero, clienteNome: x.clienteNome, pergunta: x.complemento.pergunta, desde: x.complemento.desde, esperaMin: x.complemento.esperaMin,
      texto: 'A Metrolabs pediu complemento. O prazo de aceite fica pausado até a sua resposta.' };
  });
  return { painel: { indices: ind, kanban: RepP_kanban_(ciclos, agoraMs, true), gantt: RepP_gantt_(ciclos, agoraMs, true), pendencias: pend, agoraMs: agoraMs, periodos: REPP_PERIODOS, externo: true },
    ganttJs: typeof SGOGantt_codigoNavegador_ === 'function' ? SGOGantt_codigoNavegador_() : '' };
}

/** Metrolabs: painel de todas as representadas (ou uma). Só os chamados que a pessoa pode ver. d: { dias, representadaId }. */
function RepI_painel_(eu, d) {
  var agoraMs = Date.now(), dias = REPP_PERIODOS.indexOf(Number(d && d.dias)) >= 0 ? Number(d.dias) : REPP_PERIODO_PADRAO, rid = Rep_s_(d && d.representadaId);
  var daRep = function (r) { return Rep_s_(r.REPRESENTADA_ID) && (!rid || Rep_s_(r.REPRESENTADA_ID) === rid); };
  var chamados = Rep_lerAst_(AST_ABAS.CHAMADOS).filter(function (c) { return daRep(c) && AstC_podeVer_(eu, c); });
  var sols = Rep_lerAst_(AST_ABAS.SOLICITACOES).filter(daRep);
  var ctx = RepP_ctx_(agoraMs), ciclos = RepP_ciclos_(sols, chamados, ctx);
  RepP_marcarReincidencia_(ciclos);
  return { painel: { indices: RepP_indices_(ciclos, dias, agoraMs, true), kanban: RepP_kanban_(ciclos, agoraMs, false), gantt: RepP_gantt_(ciclos, agoraMs, false), agoraMs: agoraMs, periodos: REPP_PERIODOS, externo: false,
    representadaId: rid }, ganttJs: typeof SGOGantt_codigoNavegador_ === 'function' ? SGOGantt_codigoNavegador_() : '' };
}

/** Marcos do pedido ou chamado da representada (ficha). reg: registro já conferido pelo escopo. */
function RepP_marcosDe_(tipo, reg, sol) {
  var ctx = RepP_ctx_(Date.now());
  return RepP_marcos_(RepP_ciclo_(tipo === 'SOLICITACAO' ? reg : sol, tipo === 'SOLICITACAO' ? null : reg, ctx));
}
