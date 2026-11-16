/****************************************************
 * MÓDULO REPRESENTAÇÃO — RÉGUA DE PRAZOS DO CHAMADO DA REPRESENTADA (11/11/2026)
 *
 * Decisão do dono (11/11/2026): "Não é um prazo único. Três dias úteis para estudar o caso e agendar o atendimento; depois
 * vêm os prazos: de fazermos o relatório do atendimento, 2 dias; depois, se precisar de peça, a Brasmedical tem que informar
 * quanto tempo [para a peça chegar]; depois que chegar a peça, pedimos mais 2 dias para avaliar; se precisar, solicitamos
 * mais prazos até a finalização."
 *
 * Etapas (dias úteis do expediente da Metrolabs, SGO_Expediente.js; prazos por representada em PRAZOS_JSON):
 *  1. ESTUDO (Metrolabs): da abertura do chamado até o atendimento AGENDADO (atendimentoMin, padrão 1710 = 3 dias úteis).
 *     Cumprida quando o chamado vai para "Agendado" (ou quando o estudo conclui que precisa de peça, quando há visita
 *     aberta em campo ou quando o chamado é resolvido). O tempo com o cliente (aguardando orçamento ou o cliente) não conta.
 *  2. RELATORIO (Metrolabs): de cada atendimento realizado (saída do técnico do local: execução concluída, falta de peça,
 *     voltar outro dia) até o relatório do atendimento na versão da representada gerado pela Metrolabs (relatorioDiasUteis,
 *     padrão 2). Um relatório gerado depois de várias visitas cumpre todas as que estavam abertas.
 *  3. PECA_PREVISAO (representada): o chamado entrou em "Aguardando peça". A representada informa no portal a data prevista de
 *     chegada. Enquanto não informa, a pendência é dela e o prazo da Metrolabs fica pausado (alerta RP09 a ela).
 *     PECA_CHEGADA (representada): da previsão informada até a chegada da peça, registrada pela Metrolabs (ou pelo Compras,
 *     ou ao liberar o chamado para agendar).
 *  4. AVALIACAO (Metrolabs): da chegada da peça até a avaliação (novo atendimento realizado, chamado concluído ou o próximo
 *     passo registrado pela Metrolabs), avaliacaoDiasUteis (padrão 2).
 *  5. PRORROGAÇÃO: em qualquer etapa da Metrolabs com prazo, pedido com motivo e nova data; a representada aceita ou recusa
 *     (com motivo). Aceita, vale a nova data; recusada, segue o prazo vigente. Repetível; tudo no histórico e no A4.
 *
 * De onde vem cada marco (nada é duplicado): as mudanças de situação do chamado vêm do histórico da Assistência
 * (ATEC_EVENTOS, DE/PARA com os nomes de AST_SITUACOES); o relatório vem de REP_DOCUMENTOS; o que só a régua sabe (previsão da
 * peça, chegada registrada, avaliação, prorrogações e marcas de alerta) fica em ATEC_CHAMADOS.REP_REGUA_JSON.
 * Vale para o chamado da representada com o prazo dela (Rep_usaPrazoRepresentada_). Os outros chamados não mudam.
 * Nenhuma função devolve Date cru.
 ****************************************************/

var REPR_COLUNA = 'REP_REGUA_JSON';
/** Situações em que o técnico está no local: sair delas (para outra que não é de campo) = atendimento realizado. */
var REPR_CAMPO = ['NO_LOCAL', 'EM_EXECUCAO', 'PAUSADO', 'AGUARDANDO_CLIENTE'];
/** Situações em que a espera é do cliente final: o relógio da etapa da Metrolabs não corre. */
var REPR_PAUSA_CLIENTE = ['AGUARDANDO_ORCAMENTO', 'AGUARDANDO_CLIENTE'];
var REPR_NOMES = {
  ESTUDO: 'Estudar o caso e agendar o atendimento', VISITA: 'Atendimento agendado', RELATORIO: 'Relatório do atendimento',
  PECA_PREVISAO: 'Previsão de chegada da peça', PECA_CHEGADA: 'Chegada da peça', AVALIACAO: 'Avaliação depois da chegada da peça',
  REAVALIACAO: 'Reavaliação (peça dispensada)', ANDAMENTO: 'Próximo passo da Metrolabs', CLIENTE: 'Com o cliente final', CONCLUIDA: 'Régua concluída', CANCELADA: 'Chamado cancelado'
};
var REPR_RESP = { METROLABS: 'Metrolabs', REPRESENTADA: 'Representada', CLIENTE: 'Cliente final' };
var REPR_ESTADOS = {
  NO_PRAZO: 'No prazo', EM_RISCO: 'Em risco', VENCIDO: 'Vencido', PAUSADO: 'Pausado (com o cliente)', CUMPRIDO: 'Cumprido no prazo', FORA_DO_PRAZO: 'Cumprido fora do prazo',
  AGUARDANDO: 'Aguardando a representada', ATRASADA: 'Data prevista vencida', FEITO: 'Feito', EM_ANDAMENTO: 'Em andamento', ENCERRADA: 'Encerrada sem conclusão'
};
var REPR_PRORROGACAO = { PENDENTE: 'Aguardando a resposta da representada', ACEITA: 'Aceita pela representada', RECUSADA: 'Recusada pela representada' };
var REPR_SIT_NOME = null;

function RepR_sitPorNome_() {
  if (!REPR_SIT_NOME) { REPR_SIT_NOME = {}; Object.keys(AST_SITUACOES).forEach(function (k) { REPR_SIT_NOME[AST_SITUACOES[k]] = k; }); }
  return REPR_SIT_NOME;
}
function RepR_br_(ms) { return ms === null || ms === undefined || !isFinite(ms) ? '' : Ast_br_(Ast_agora_(ms)); }
function RepR_brDia_(dia) { var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(Rep_s_(dia)); return m ? m[3] + '/' + m[2] + '/' + m[1] : ''; }
/** A régua vale para este chamado? Chamado da representada com o prazo dela (nasceu de pedido dela, ou já está com esse prazo). */
function RepR_aplica_(c) { return !!c && !!Rep_s_(c.REPRESENTADA_ID) && typeof Rep_usaPrazoRepresentada_ === 'function' && Rep_usaPrazoRepresentada_(c); }
/** Representada pela memória da Assistência (limpa a cada chamada da Assistência e da Representação). */
function RepR_representada_(id) { try { return Ast_mapa_(REP_ABAS.REPRESENTADAS)[Rep_s_(id)] || null; } catch (e) { return null; } }
/** Prazos da régua deste chamado (em minutos úteis) e os textos. Etapa 1: o prazo gravado no chamado (SLA_MIN_UTEIS) quando ele já nasceu com o prazo da representada. */
function RepR_prazos_(c) {
  var pz = Rep_prazos_(RepR_representada_(c.REPRESENTADA_ID)), dia = Rep_minDia_();
  var estudo = Rep_up_(c.SLA_FONTE) === 'REPRESENTACAO' && Number(c.SLA_MIN_UTEIS) > 0 ? Number(c.SLA_MIN_UTEIS) : Number(pz.atendimentoMin) || REP_PRAZOS_PADRAO.atendimentoMin;
  var rel = (Number(pz.relatorioDiasUteis) || REP_PRAZOS_PADRAO.relatorioDiasUteis) * dia, av = (Number(pz.avaliacaoDiasUteis) || REP_PRAZOS_PADRAO.avaliacaoDiasUteis) * dia;
  return { estudoMin: estudo, relatorioMin: rel, avaliacaoMin: av, alertaFracao: Number(pz.alertaFracao) || 0.75, minDia: dia,
    textos: { estudo: Rep_prazoTxt_(estudo), relatorio: Rep_prazoTxt_(rel), avaliacao: Rep_prazoTxt_(av) } };
}
/** Dados próprios da régua gravados no chamado. */
function RepR_dados_(c) {
  var d = Rep_json_(c && c[REPR_COLUNA], {}) || {};
  if (!d.pecas || typeof d.pecas !== 'object') d.pecas = {};
  if (!Array.isArray(d.prorrogacoes)) d.prorrogacoes = [];
  if (!Array.isArray(d.avaliacoes)) d.avaliacoes = [];
  if (!d.alertas || typeof d.alertas !== 'object') d.alertas = {};
  return d;
}
/** Histórico do chamado na ordem (um índice por chamada, refeito quando a tabela de eventos muda). */
function RepR_eventos_(id) {
  var l = Ast_ler_(AST_ABAS.EVENTOS), m = AST_MEMO.__repr_ev;
  if (!m || m.fonte !== l) {
    var mapa = {};
    l.forEach(function (e, i) { if (Ast_up_(e.ENTIDADE) !== 'CHAMADO') return; var k = Ast_s_(e.ENTIDADE_ID); (mapa[k] = mapa[k] || []).push({ e: e, i: i }); });
    m = AST_MEMO.__repr_ev = { fonte: l, mapa: mapa };
  }
  return (m.mapa[Ast_s_(id)] || []).slice().sort(function (a, b) { return String(a.e.EM).localeCompare(String(b.e.EM)) || a.i - b.i; }).map(function (x) { return x.e; });
}
/** Relatórios do atendimento na versão da representada gerados pela Metrolabs (ms, em ordem). */
function RepR_relatorios_(id) {
  var l = [];
  try {
    Ast_ler_(REP_ABAS.DOCUMENTOS).forEach(function (r) {
      if (Rep_s_(r.CHAMADO_ID) !== Rep_s_(id) || Rep_up_(r.TIPO) !== 'ATENDIMENTO' || Rep_up_(r.PUBLICO) !== 'REPRESENTADA' || Rep_s_(r.DESLIGADO_EM)) return;
      if (Rep_up_(r.GERADO_POR_LADO) && Rep_up_(r.GERADO_POR_LADO) !== 'METROLABS') return;
      var ms = Ast_ms_(r.EM); if (ms !== null) l.push(ms);
    });
  } catch (e) { l = []; }
  return l.sort(function (a, b) { return a - b; });
}
/** Fim do expediente de um dia (YYYY-MM-DD) em ms. */
function RepR_fimDoDia_(dia) { var cfg = Ast_expediente_(); return Ast_ms_(Rep_s_(dia).slice(0, 10) + 'T' + (Rep_s_(cfg.fim) || '17:30') + ':00'); }

/**
 * Linha do tempo do chamado pelo histórico: agendamentos, atendimentos realizados, pedidos de peça (com o fim automático:
 * liberado para agendar, dispensado ou cancelado), peça disponível no Compras, períodos de cada situação e o fim do chamado.
 * Sem nenhuma mudança de situação no histórico (registro antigo), usa a situação atual com o que o chamado guarda.
 */
function RepR_linha_(c) {
  var nomes = RepR_sitPorNome_(), tr = [], pecaDisp = [];
  RepR_eventos_(c.ID).forEach(function (e) {
    var ms = Ast_ms_(e.EM); if (ms === null) return;
    var de = nomes[Ast_s_(e.DE)], para = nomes[Ast_s_(e.PARA)];
    if (de && para && de !== para) tr.push({ de: de, para: para, ms: ms, tipo: Ast_up_(e.TIPO) });
    if (Ast_up_(e.TIPO) === 'PECA_DISPONIVEL') pecaDisp.push(ms);
  });
  var sit = Ast_up_(c.SITUACAO), aberto = Ast_ms_(c.ABERTO_EM), L = { tr: tr, pecaDisp: pecaDisp, ags: [], visitas: [], pecas: [], agSemData: false, fimMs: null, periodos: [] };
  tr.forEach(function (t) {
    if (t.para === 'AGENDADO') L.ags.push(t.ms);
    if (REPR_CAMPO.indexOf(t.de) >= 0 && REPR_CAMPO.indexOf(t.para) < 0) L.visitas.push(t.ms);
    if (t.para === 'AGUARDANDO_PECA') L.pecas.push({ ini: t.ms, fimAuto: null, comoAuto: '', compras: null });
    if (t.de === 'AGUARDANDO_PECA') { var p = L.pecas[L.pecas.length - 1]; if (p && p.fimAuto === null) { p.fimAuto = t.ms; p.comoAuto = t.para === 'PLANEJADO' ? 'LIBERADO' : t.para === 'CANCELADO' ? 'CANCELADO' : 'DISPENSADA'; } }
  });
  if (!tr.length) {
    // registro sem histórico de situações: o que a situação atual garante que já aconteceu
    var depoisDoAgendamento = ['AGENDADO', 'EM_DESLOCAMENTO', 'DOC_PENDENTE'].concat(REPR_CAMPO).indexOf(sit) >= 0 || (sit === 'ENCERRADO' && Rep_s_(c.OS_ID));
    if (depoisDoAgendamento) L.agSemData = true;
    var at = Ast_ms_(c.ATENDIDO_EM);
    if (at !== null && (sit === 'DOC_PENDENTE' || (sit === 'ENCERRADO' && Rep_s_(c.OS_ID)))) L.visitas.push(at);
    if (sit === 'AGUARDANDO_PECA') { var ini = Ast_ms_(c.PAUSA_DESDE); if (ini === null) ini = Ast_ms_(c.ATUALIZADO_EM); if (ini === null) ini = aberto; L.pecas.push({ ini: ini, fimAuto: null, comoAuto: '', compras: null }); }
  }
  pecaDisp.forEach(function (ms) { L.pecas.forEach(function (p) { if (p.ini <= ms && (p.fimAuto === null || p.fimAuto >= ms - 60000) && p.compras === null) p.compras = ms; }); });
  // fim do chamado (situação terminal ou resolvido a distância agora)
  if (['ENCERRADO', 'CANCELADO', 'RESOLVIDO_REMOTO'].indexOf(sit) >= 0) {
    var ult = tr.filter(function (t) { return t.para === sit; }).pop();
    L.fimMs = ult ? ult.ms : (Ast_ms_(sit === 'CANCELADO' ? c.CANCELADO_EM : c.ENCERRADO_EM) || Ast_ms_(c.ATENDIDO_EM) || Ast_ms_(c.ATUALIZADO_EM));
  }
  // períodos de cada situação (para o tempo com o cliente)
  var atual = 'ABERTO', desde = aberto;
  tr.forEach(function (t) { if (desde !== null) L.periodos.push({ sit: atual, de: desde, ate: t.ms }); atual = t.para; desde = t.ms; });
  if (!tr.length) atual = sit;
  L.periodos.push({ sit: atual, de: desde, ate: null });
  return L;
}
/** Minutos úteis com o cliente (orçamento ou retorno do cliente) entre a e b. */
function RepR_pausaCliente_(L, a, b) {
  var t = 0;
  L.periodos.forEach(function (p) {
    if (REPR_PAUSA_CLIENTE.indexOf(p.sit) < 0 || p.de === null) return;
    var de = Math.max(p.de, a), ate = Math.min(p.ate === null ? b : p.ate, b);
    if (ate > de) t += Ast_minUteisEntre_(de, ate);
  });
  return t;
}
function RepR_primeiro_(l, desde) { for (var i = 0; i < l.length; i++) if (l[i] !== null && l[i] >= desde) return l[i]; return null; }

/**
 * Régua do chamado agora: { aplica, etapas: [...], atual, comQuem, pendenciasRepresentada, prorrogacoes, prazos, sla }.
 * null quando a régua não vale para o chamado.
 */
function RepR_calcular_(c, agoraMs) {
  if (!RepR_aplica_(c)) return null;
  var aberto = Ast_ms_(c.ABERTO_EM);
  if (aberto === null) return null;
  agoraMs = agoraMs || Date.now();
  var pz = RepR_prazos_(c), dados = RepR_dados_(c), L = RepR_linha_(c), sit = Ast_up_(c.SITUACAO), cancelado = sit === 'CANCELADO', terminal = AST_TERMINAIS.indexOf(sit) >= 0 || sit === 'RESOLVIDO_REMOTO';
  var rels = RepR_relatorios_(c.ID), etapas = [], pausaAgora = REPR_PAUSA_CLIENTE.indexOf(sit) >= 0;
  var avaliacoes = dados.avaliacoes.map(function (a) { return { ms: Ast_ms_(a.em), peca: Number(a.peca) || 0 }; }).filter(function (a) { return a.ms !== null; });
  var prorrog = function (chave) { return dados.prorrogacoes.filter(function (p) { return p.etapa === chave; }); };
  var etapa = function (o) {
    o.nome = o.nome || REPR_NOMES[o.codigo]; o.respNome = REPR_RESP[o.resp] || '';
    o.fechada = o.fimMs !== null && o.fimMs !== undefined;
    if (o.baseAteMs !== undefined && o.baseAteMs !== null) {
      // prorrogação: a última aceita vale; a pendente não muda o prazo
      var ps = prorrog(o.chave), aceitas = ps.filter(function (p) { return p.situacao === 'ACEITA'; }).sort(function (a, b) { return String(a.respondidaEm).localeCompare(String(b.respondidaEm)); });
      o.ateMs = aceitas.length ? Ast_ms_(aceitas[aceitas.length - 1].novaAte) : o.baseAteMs;
      o.prorrogada = !!aceitas.length;
      o.prorrogacoes = ps.map(function (p) { return p.id; });
      var pend = ps.filter(function (p) { return p.situacao === 'PENDENTE'; })[0];
      o.prorrogacaoPendente = pend && !o.fechada ? { id: pend.id, novaAte: Rep_br_(pend.novaAte), novaAteMs: Ast_ms_(pend.novaAte), motivo: pend.motivo, pedidaPor: pend.pedidaPorNome, pedidaEm: Rep_br_(pend.pedidaEm), pedidaEmMs: Ast_ms_(pend.pedidaEm) } : null;
      if (o.fechada) o.estado = o.encerradaSemConclusao ? 'ENCERRADA' : (o.fimMs <= o.ateMs ? 'CUMPRIDO' : 'FORA_DO_PRAZO');
      else if (o.pausada) o.estado = 'PAUSADO';
      else if (agoraMs > o.ateMs) o.estado = 'VENCIDO';
      else {
        var total = Math.max(1, Ast_minUteisEntre_(o.iniMs, o.ateMs) - (o.pausaMin || 0)), usado = Math.max(0, Ast_minUteisEntre_(o.iniMs, agoraMs) - (o.pausaMin || 0));
        o.restaMin = Ast_minUteisEntre_(agoraMs, o.ateMs); o.fracao = usado / total;
        o.estado = o.fracao >= pz.alertaFracao ? 'EM_RISCO' : 'NO_PRAZO';
      }
      o.podeProrrogar = !o.fechada && !o.prorrogacaoPendente && o.resp === 'METROLABS' && !cancelado;
    } else { o.ateMs = null; o.podeProrrogar = false; o.prorrogacaoPendente = null; }
    o.estadoNome = REPR_ESTADOS[o.estado] || '';
    etapas.push(o);
    return o;
  };

  // 1. estudar o caso e agendar
  var cand = [];
  if (L.ags.length) cand.push([L.ags[0], 'AGENDADO']);
  if (L.pecas.length) cand.push([L.pecas[0].ini, 'PECA']);
  if (L.visitas.length) cand.push([L.visitas[0], 'VISITA']);
  if (L.fimMs !== null) cand.push([L.fimMs, cancelado ? 'CANCELADO' : 'CONCLUIDO']);
  cand.sort(function (a, b) { return a[0] - b[0]; });
  var fimEst = cand.length ? cand[0][0] : (L.agSemData ? aberto : null), comoEst = cand.length ? cand[0][1] : L.agSemData ? 'AGENDADO_SEM_DATA' : '';
  var pausaEst = RepR_pausaCliente_(L, aberto, fimEst !== null ? fimEst : agoraMs);
  var est = etapa({ chave: 'ESTUDO', codigo: 'ESTUDO', resp: 'METROLABS', iniMs: aberto, duracao: pz.textos.estudo, pausaMin: pausaEst, baseAteMs: Ast_somarMinUteis_(aberto, pz.estudoMin + pausaEst),
    fimMs: fimEst, como: comoEst, encerradaSemConclusao: comoEst === 'CANCELADO', pausada: fimEst === null && pausaAgora });
  est.comoTexto = { AGENDADO: 'atendimento agendado', AGENDADO_SEM_DATA: 'atendimento agendado (o histórico não guarda a hora do agendamento)', PECA: 'estudo concluído: precisa de peça', VISITA: 'atendimento aberto em campo', CONCLUIDO: 'chamado resolvido', CANCELADO: 'chamado cancelado' }[comoEst] || '';

  // 2. relatório de cada atendimento realizado
  L.visitas.forEach(function (v, i) {
    var fim = RepR_primeiro_(rels, v), semRel = fim === null && cancelado;
    etapa({ chave: 'RELATORIO:' + (i + 1), codigo: 'RELATORIO', resp: 'METROLABS', ordem: i + 1, iniMs: v, duracao: pz.textos.relatorio, baseAteMs: Ast_somarMinUteis_(v, pz.relatorioMin),
      fimMs: semRel ? L.fimMs : fim, encerradaSemConclusao: semRel, nome: REPR_NOMES.RELATORIO + (L.visitas.length > 1 ? ' (' + (i + 1) + 'º atendimento)' : '') });
  });

  // 3 e 4. peça: previsão (representada), chegada (representada) e avaliação (Metrolabs)
  L.pecas.forEach(function (p, j) {
    var n = j + 1, reg = dados.pecas[String(n)] || {}, sufixo = L.pecas.length > 1 ? ' (' + n + 'ª peça)' : '';
    var chegada = Ast_ms_(reg.chegouEm), comoCheg = chegada !== null ? 'REGISTRADA' : '';
    if (chegada === null && p.compras !== null) { chegada = p.compras; comoCheg = 'COMPRAS'; }
    if (chegada === null && p.comoAuto === 'LIBERADO') { chegada = p.fimAuto; comoCheg = 'LIBERADO'; }
    var dispensa = chegada === null && (p.comoAuto === 'DISPENSADA' || p.comoAuto === 'CANCELADO') ? p.fimAuto : null;
    var informada = Ast_ms_(reg.informadaEm), fechouSem = chegada !== null ? chegada : dispensa !== null ? dispensa : (cancelado ? L.fimMs : null);
    var desc = Rep_s_(reg.descricao) || (n === L.pecas.length ? Rep_s_(c.PECA_DESCRICAO) : '');
    var pv = etapa({ chave: 'PECA_PREVISAO:' + n, codigo: 'PECA_PREVISAO', resp: 'REPRESENTADA', ordem: n, iniMs: p.ini, fimMs: informada !== null ? informada : fechouSem, nome: REPR_NOMES.PECA_PREVISAO + sufixo,
      pecaDescricao: desc, previsao: Rep_s_(reg.previsao), informadaPor: Rep_s_(reg.informadaPor), informadaLado: Rep_s_(reg.informadaLado), avisoEm: Rep_s_(reg.avisoEm) });
    pv.estado = informada !== null ? 'FEITO' : pv.fechada ? 'ENCERRADA' : 'AGUARDANDO'; pv.estadoNome = REPR_ESTADOS[pv.estado];
    if (informada !== null || chegada !== null) {
      var prevMs = Rep_s_(reg.previsao) ? RepR_fimDoDia_(reg.previsao) : null;
      var ch = etapa({ chave: 'PECA_CHEGADA:' + n, codigo: 'PECA_CHEGADA', resp: 'REPRESENTADA', ordem: n, iniMs: informada !== null ? informada : p.ini, fimMs: chegada !== null ? chegada : (dispensa !== null ? dispensa : (cancelado ? L.fimMs : null)),
        nome: REPR_NOMES.PECA_CHEGADA + sufixo, previstoMs: prevMs, previsao: Rep_s_(reg.previsao), pecaDescricao: desc, comoChegada: comoCheg, chegadaPor: Rep_s_(reg.chegouPor), chegadaObs: Rep_s_(reg.chegadaObs) });
      ch.estado = chegada !== null ? (prevMs === null || chegada <= prevMs ? 'CUMPRIDO' : 'FORA_DO_PRAZO') : ch.fechada ? 'ENCERRADA' : (prevMs !== null && agoraMs > prevMs ? 'ATRASADA' : 'AGUARDANDO');
      ch.estadoNome = ch.estado === 'CUMPRIDO' ? 'Chegou até a data prevista' : ch.estado === 'FORA_DO_PRAZO' ? 'Chegou depois da data prevista' : REPR_ESTADOS[ch.estado];
    }
    var iniAv = chegada !== null ? chegada : dispensa;
    if (iniAv !== null && !(dispensa !== null && p.comoAuto === 'CANCELADO')) {
      var fimAv = [RepR_primeiro_(L.visitas, iniAv), RepR_primeiro_(avaliacoes.filter(function (a) { return !a.peca || a.peca === n; }).map(function (a) { return a.ms; }).sort(function (a, b) { return a - b; }), iniAv),
        L.fimMs !== null && L.fimMs >= iniAv ? L.fimMs : null].filter(function (x) { return x !== null; }).sort(function (a, b) { return a - b; })[0];
      if (fimAv === undefined) fimAv = null;
      var pausaAv = RepR_pausaCliente_(L, iniAv, fimAv !== null ? fimAv : agoraMs);
      etapa({ chave: 'AVALIACAO:' + n, codigo: 'AVALIACAO', resp: 'METROLABS', ordem: n, iniMs: iniAv, duracao: pz.textos.avaliacao, pausaMin: pausaAv, baseAteMs: Ast_somarMinUteis_(iniAv, pz.avaliacaoMin + pausaAv),
        fimMs: fimAv, encerradaSemConclusao: fimAv !== null && cancelado && fimAv === L.fimMs, pausada: fimAv === null && pausaAgora,
        nome: (dispensa !== null ? REPR_NOMES.REAVALIACAO : REPR_NOMES.AVALIACAO) + sufixo });
    }
  });
  // atendimento agendado e ainda não realizado (informativo: a régua não tem prazo entre o agendamento e a visita)
  var ultAg = L.ags.length ? L.ags[L.ags.length - 1] : null, ultVis = L.visitas.length ? L.visitas[L.visitas.length - 1] : null;
  if (['AGENDADO', 'EM_DESLOCAMENTO'].concat(REPR_CAMPO).indexOf(sit) >= 0 && (ultAg === null || ultVis === null || ultAg > ultVis)) {
    var noLocal = REPR_CAMPO.indexOf(sit) >= 0, agMs = Ast_ms_(c.AGENDADO_PARA);
    var vis = etapa({ chave: 'VISITA', codigo: 'VISITA', resp: 'METROLABS', iniMs: ultAg !== null ? ultAg : aberto, fimMs: null, previstoMs: agMs, nome: noLocal ? 'Atendimento em andamento no local' : REPR_NOMES.VISITA });
    vis.estado = 'EM_ANDAMENTO'; vis.estadoNome = REPR_ESTADOS.EM_ANDAMENTO;
  }

  // o que falta em cada etapa aberta (quem, o quê, até quando)
  etapas.forEach(function (e) { e.falta = RepR_falta_(e, c, pz, false); e.faltaRep = RepR_falta_(e, c, pz, true); });
  var abertas = etapas.filter(function (e) { return !e.fechada; });
  var daMet = abertas.filter(function (e) { return e.resp === 'METROLABS' && e.ateMs !== null; }).sort(function (a, b) { return a.ateMs - b.ateMs; });
  var daRep = abertas.filter(function (e) { return e.resp === 'REPRESENTADA'; });
  var info = abertas.filter(function (e) { return e.resp === 'METROLABS' && e.ateMs === null; });
  var atual = daMet[0] || daRep[0] || info[0] || null;
  if (!atual) {
    if (cancelado) atual = { chave: 'FIM', codigo: 'CANCELADA', nome: REPR_NOMES.CANCELADA, resp: '', estado: 'ENCERRADA', falta: 'Chamado cancelado: nada pendente na régua.', faltaRep: 'Chamado cancelado: nada pendente.' };
    else if (terminal) atual = { chave: 'FIM', codigo: 'CONCLUIDA', nome: REPR_NOMES.CONCLUIDA, resp: '', estado: 'FEITO', falta: 'Régua concluída: todas as etapas fechadas.', faltaRep: 'Atendimento concluído: nenhuma etapa pendente.' };
    else if (pausaAgora) atual = { chave: 'CLIENTE', codigo: 'CLIENTE', nome: REPR_NOMES.CLIENTE, resp: 'CLIENTE', estado: 'PAUSADO', falta: 'Com o cliente final (' + (AST_SITUACOES[sit] || sit).toLowerCase() + '): a régua da Metrolabs não corre.', faltaRep: 'Aguardando o cliente final (' + (AST_SITUACOES[sit] || sit).toLowerCase() + ').' };
    else atual = { chave: 'ANDAMENTO', codigo: 'ANDAMENTO', nome: REPR_NOMES.ANDAMENTO, resp: 'METROLABS', estado: 'EM_ANDAMENTO',
      falta: 'Próximo passo: ' + (Rep_s_(c.PROXIMA_ACAO) || (AST_SITUACOES[sit] || sit)) + '. Esta fase não tem prazo na régua; se precisar combinar uma data com a representada, use a conversa do chamado.',
      faltaRep: 'Com a Metrolabs: ' + (sit === 'PLANEJADO' ? 'retorno do técnico a agendar.' : sit === 'DOC_PENDENTE' ? 'fechamento do relatório da ordem de serviço.' : 'análise técnica em andamento.') };
    atual.respNome = REPR_RESP[atual.resp] || ''; atual.estadoNome = REPR_ESTADOS[atual.estado] || '';
  }
  var comQuem = terminal ? '' : daRep.length && !daMet.length ? 'REPRESENTADA' : pausaAgora && !daMet.length ? 'CLIENTE' : 'METROLABS';
  // pendências da representada: informar a previsão da peça e responder os pedidos de mais prazo
  var pend = [];
  daRep.filter(function (e) { return e.codigo === 'PECA_PREVISAO'; }).forEach(function (e) {
    pend.push({ tipo: 'PECA_PREVISAO', chave: e.chave, peca: e.ordem, pecaDescricao: e.pecaDescricao, desdeMs: e.iniMs, desde: RepR_br_(e.iniMs), texto: 'Informe a data prevista de chegada da peça' + (e.pecaDescricao ? ' (' + e.pecaDescricao.slice(0, 120) + ')' : '') + '. Enquanto ela não for informada, o atendimento fica aguardando a sua empresa.' });
  });
  daRep.filter(function (e) { return e.codigo === 'PECA_CHEGADA' && e.estado === 'ATRASADA'; }).forEach(function (e) {
    pend.push({ tipo: 'PECA_ATRASADA', chave: e.chave, peca: e.ordem, pecaDescricao: e.pecaDescricao, desdeMs: e.previstoMs, desde: RepR_br_(e.previstoMs), previsao: e.previsao, texto: 'A data prevista para a peça (' + RepR_brDia_(e.previsao) + ') passou e a chegada não foi registrada. Atualize a previsão.' });
  });
  etapas.filter(function (e) { return e.prorrogacaoPendente; }).forEach(function (e) {
    var p = e.prorrogacaoPendente;
    pend.push({ tipo: 'PRORROGACAO', chave: e.chave, prorrogacaoId: p.id, etapaNome: e.nome, novaAte: p.novaAte, prazoAtual: RepR_br_(e.ateMs), motivo: p.motivo, pedidaPor: p.pedidaPor, desdeMs: p.pedidaEmMs, desde: p.pedidaEm,
      texto: 'A Metrolabs pediu mais prazo para "' + e.nome + '": até ' + p.novaAte + '. Motivo: ' + p.motivo + '. Aceite ou recuse (com o motivo); até a resposta vale o prazo atual (até ' + RepR_br_(e.ateMs) + ').' });
  });
  var R = { aplica: true, chamadoId: Rep_s_(c.ID), numero: Rep_s_(c.NUMERO), etapas: etapas, atual: atual, comQuem: comQuem, pendenciasRepresentada: pend, agoraMs: agoraMs,
    prazos: pz.textos, terminal: terminal, cancelado: cancelado,
    prorrogacoes: dados.prorrogacoes.map(function (p) {
      var e = etapas.filter(function (x) { return x.chave === p.etapa; })[0];
      return { id: p.id, etapa: p.etapa, etapaNome: e ? e.nome : Rep_s_(p.etapaNome), situacao: p.situacao, situacaoNome: REPR_PRORROGACAO[p.situacao] || p.situacao, pedidaEm: Rep_br_(p.pedidaEm), pedidaPor: Rep_s_(p.pedidaPorNome),
        motivo: Rep_s_(p.motivo), prazoAntes: Rep_br_(p.prazoAntes), novaAte: Rep_br_(p.novaAte), respondidaEm: Rep_br_(p.respondidaEm), respondidaPor: Rep_s_(p.respondidaPorNome), respostaMotivo: Rep_s_(p.respostaMotivo) };
    }),
    pecaAberta: null };
  var pAb = daRep.filter(function (e) { return e.codigo === 'PECA_PREVISAO' || e.codigo === 'PECA_CHEGADA'; }).sort(function (a, b) { return b.ordem - a.ordem; })[0];
  if (pAb) R.pecaAberta = { peca: pAb.ordem, descricao: pAb.pecaDescricao, previsao: pAb.previsao || '', previsaoTexto: RepR_brDia_(pAb.previsao), informada: pAb.codigo === 'PECA_CHEGADA', desde: RepR_br_(pAb.iniMs) };
  var avAb = abertas.filter(function (e) { return e.codigo === 'AVALIACAO'; })[0];
  R.avaliacaoAberta = avAb ? { peca: avAb.ordem, chave: avAb.chave, ate: RepR_br_(avAb.ateMs) } : null;
  R.sla = RepR_sla_(R, c, agoraMs);
  return R;
}

/** Texto "o que falta" de uma etapa (quem, o quê, até quando). rep: texto para a representada. */
function RepR_falta_(e, c, pz, rep) {
  var ate = RepR_br_(e.ateMs);
  if (e.fechada) {
    if (e.codigo === 'ESTUDO') return 'Etapa fechada em ' + RepR_br_(e.fimMs) + (e.comoTexto ? ' (' + e.comoTexto + ')' : '') + '.';
    return 'Etapa fechada em ' + RepR_br_(e.fimMs) + '.';
  }
  var pr = e.prorrogacaoPendente ? ' A Metrolabs pediu mais prazo até ' + e.prorrogacaoPendente.novaAte + ' (aguardando a resposta da representada; até lá vale o prazo atual).' : '';
  var pa = e.pausada ? ' Prazo pausado: aguardando o cliente final.' : '';
  switch (e.codigo) {
    case 'ESTUDO': return (rep ? 'A Metrolabs estuda o caso e agenda o atendimento até ' : 'Falta: estudar o caso e agendar o atendimento (técnico, data e hora) até ') + ate + '.' + pa + pr;
    case 'RELATORIO': return (rep ? 'A Metrolabs envia o relatório do atendimento até ' : 'Falta: gerar o relatório do atendimento na versão da representada (ficha do chamado > Relatórios do atendimento > "Gerar a versão da representada") até ') + ate + '.' + pr;
    case 'PECA_PREVISAO': return rep ? 'Falta: a sua empresa informar a data prevista de chegada da peça' + (e.pecaDescricao ? ' (' + e.pecaDescricao.slice(0, 120) + ')' : '') + '. Até lá, o atendimento aguarda a sua empresa e o prazo da Metrolabs fica pausado.' :
      'Com a representada desde ' + RepR_br_(e.iniMs) + ': ela informa no portal a data prevista de chegada da peça. O prazo da Metrolabs fica pausado. Se ela informar por telefone ou e-mail, registre a previsão em nome dela.';
    case 'PECA_CHEGADA': return e.estado === 'ATRASADA' ? (rep ? 'A data prevista (' + RepR_brDia_(e.previsao) + ') passou e a peça não chegou: atualize a previsão.' : 'A data prevista pela representada (' + RepR_brDia_(e.previsao) + ') passou e a chegada não foi registrada. Se a peça chegou, registre a chegada; senão, peça a nova previsão à representada.') :
      'Peça prevista para chegar até ' + RepR_brDia_(e.previsao) + ' (informado pela representada). ' + (rep ? 'Quando chegar, a Metrolabs registra a chegada e tem ' + pz.textos.avaliacao + ' para avaliar.' : 'Quando chegar, registre a chegada: começa o prazo de ' + pz.textos.avaliacao + ' para avaliar.');
    case 'AVALIACAO': return (rep ? 'A Metrolabs avalia o equipamento com a peça (atendimento concluído ou próximo passo registrado) até ' : 'Falta: avaliar com a peça (atendimento realizado, chamado concluído ou "Registrar avaliação" com o próximo passo) até ') + ate + '.' + pa + pr;
    case 'VISITA': return e.previstoMs ? (e.nome === REPR_NOMES.VISITA ? 'Atendimento marcado para ' + RepR_br_(e.previstoMs) + (Rep_s_(c.TECNICO_NOME) ? ', com ' + Rep_s_(c.TECNICO_NOME) : '') + '. Depois do atendimento, começa o prazo de ' + pz.textos.relatorio + ' para o relatório.' : 'Atendimento em andamento no local.') : 'Atendimento em andamento.';
    default: return '';
  }
}

/** Situação no vocabulário da Assistência (Ast_slaEstado_): { estado: EM_DIA | EM_RISCO | ESTOURADO | CUMPRIDO | FORA_DO_PRAZO | PAUSADO | CANCELADO, ate, restaMin, texto }. */
function RepR_sla_(R, c, agoraMs) {
  var a = R.atual, ateIso = a && a.ateMs ? Ast_agora_(a.ateMs) : '';
  if (R.cancelado) return { estado: 'CANCELADO', ate: '', texto: 'Cancelado', etapa: 'FIM' };
  if (a && a.resp === 'METROLABS' && a.ateMs) {
    var nome = a.nome;
    if (a.estado === 'VENCIDO') return { estado: 'ESTOURADO', ate: ateIso, restaMin: -Ast_minUteisEntre_(a.ateMs, agoraMs), texto: nome + ': prazo vencido em ' + RepR_br_(a.ateMs), etapa: a.chave };
    if (a.estado === 'PAUSADO') return { estado: 'PAUSADO', ate: ateIso, texto: nome + ': prazo pausado (com o cliente final)', etapa: a.chave };
    if (a.estado === 'EM_RISCO') return { estado: 'EM_RISCO', ate: ateIso, restaMin: a.restaMin, texto: nome + ': em risco, resta ' + Ast_duracaoTxt_(a.restaMin) + ' úteis (até ' + RepR_br_(a.ateMs) + ')', etapa: a.chave };
    return { estado: 'EM_DIA', ate: ateIso, restaMin: a.restaMin, texto: nome + ': em dia, até ' + RepR_br_(a.ateMs), etapa: a.chave };
  }
  if (a && a.resp === 'REPRESENTADA') return { estado: 'PAUSADO', ate: '', texto: 'Prazo da Metrolabs pausado: ' + a.nome.toLowerCase() + ' com a representada', etapa: a.chave };
  var julgadas = R.etapas.filter(function (e) { return e.resp === 'METROLABS' && (e.estado === 'CUMPRIDO' || e.estado === 'FORA_DO_PRAZO'); });
  var fora = julgadas.filter(function (e) { return e.estado === 'FORA_DO_PRAZO'; });
  if (R.terminal || Ast_ms_(c.ATENDIDO_EM) !== null) {
    if (fora.length) return { estado: 'FORA_DO_PRAZO', ate: '', texto: 'Régua com ' + fora.length + (fora.length === 1 ? ' etapa cumprida' : ' etapas cumpridas') + ' fora do prazo: ' + fora.map(function (e) { return e.nome; }).join('; '), etapa: 'FIM' };
    return { estado: 'CUMPRIDO', ate: '', texto: 'Régua cumprida: ' + julgadas.length + (julgadas.length === 1 ? ' etapa' : ' etapas') + ' da Metrolabs no prazo', etapa: 'FIM' };
  }
  if (a && a.resp === 'CLIENTE') return { estado: 'PAUSADO', ate: '', texto: 'Prazo da Metrolabs pausado: com o cliente final', etapa: a.chave };
  return { estado: 'EM_DIA', ate: '', texto: (a ? a.nome : 'Em andamento') + (a && a.codigo === 'VISITA' && a.previstoMs ? ': marcado para ' + RepR_br_(a.previstoMs) : '') + (fora.length ? ' (já houve etapa fora do prazo)' : ''), etapa: a ? a.chave : '' };
}

/** Gancho de Ast_slaEstado_: o chamado da representada segue a régua. null = não vale (os outros chamados não mudam). */
function RepR_slaEstado_(c, agoraMs) {
  try { var R = RepR_calcular_(c, agoraMs); return R ? R.sla : null; } catch (e) { try { console.error('Representação, régua: ' + ((e && e.message) || e)); } catch (x) {} return null; }
}

/** Régua para a tela. externo (representada): sem marcas de alerta, sem identificadores internos. */
function RepR_publico_(R, externo) {
  if (!R) return null;
  var et = function (e) {
    return { chave: e.chave, codigo: e.codigo, nome: e.nome, resp: e.resp || '', respNome: e.respNome || '', estado: e.estado || '', estadoNome: e.estadoNome || '', ini: RepR_br_(e.iniMs), iniMs: e.iniMs === undefined ? null : e.iniMs,
      ate: RepR_br_(e.ateMs), ateMs: e.ateMs === undefined ? null : e.ateMs, baseAte: e.prorrogada ? RepR_br_(e.baseAteMs) : '', prorrogada: !!e.prorrogada, fim: RepR_br_(e.fimMs), fimMs: e.fimMs === undefined ? null : e.fimMs,
      fechada: !!e.fechada, duracao: e.duracao || '', previsto: RepR_br_(e.previstoMs), previsao: RepR_brDia_(e.previsao), pecaDescricao: e.pecaDescricao || '', como: e.comoTexto || '',
      falta: externo ? e.faltaRep || '' : e.falta || '', podeProrrogar: !externo && !!e.podeProrrogar, prorrogacaoPendente: e.prorrogacaoPendente || null,
      chegada: e.comoChegada ? ({ REGISTRADA: 'registrada pela Metrolabs', COMPRAS: 'conferida pelo Compras', LIBERADO: 'ao liberar o chamado para agendar' }[e.comoChegada] || '') : '' };
  };
  var a = R.atual || {};
  return { aplica: true, etapas: R.etapas.map(et), atual: et(a), comQuem: R.comQuem, comQuemNome: { METROLABS: 'Com a Metrolabs', REPRESENTADA: 'Com a representada', CLIENTE: 'Com o cliente final' }[R.comQuem] || '',
    pendencias: R.pendenciasRepresentada, prorrogacoes: R.prorrogacoes, prazos: R.prazos, pecaAberta: R.pecaAberta, avaliacaoAberta: R.avaliacaoAberta, terminal: R.terminal,
    sla: { estado: R.sla.estado, texto: R.sla.texto } };
}
/** Régua de um chamado (registro) para a tela; null se não vale. */
function RepR_daTela_(c, externo) { var R = RepR_calcular_(c, Date.now()); return R ? RepR_publico_(R, externo) : null; }

// ------------------------------------------------------------
// GRAVAÇÃO (na trava da Assistência, relendo o chamado)
// ------------------------------------------------------------
function RepR_gravar_(id, fn) {
  return Ast_comTrava_(function () {
    Ast_memoTirar_(AST_ABAS.CHAMADOS);
    var c = Ast_porId_(AST_ABAS.CHAMADOS, id);
    if (!c) throw Rep_erro_('NAO_ENCONTRADO', 'Chamado não encontrado. Atualize a tela.');
    var d = RepR_dados_(c), r = fn(c, d), campos = {};
    if (r && r.naoGravar) return r;
    campos[REPR_COLUNA] = JSON.stringify(d);
    Ast_atualizar_(AST_ABAS.CHAMADOS, c.ID, campos);
    c[REPR_COLUNA] = campos[REPR_COLUNA];
    return Object.assign({ chamado: c }, r || {});
  });
}
function RepR_id_() { return 'PR' + Date.now().toString(36).toUpperCase() + Math.floor(Math.random() * 1296).toString(36).toUpperCase(); }
function RepR_diaOk_(dia) { return /^\d{4}-\d{2}-\d{2}$/.test(Rep_s_(dia)) && Ast_ms_(dia + 'T12:00:00') !== null; }
function RepR_exigirRegua_(c, acao) {
  if (!RepR_aplica_(c)) throw Rep_erro_('SEM_REGUA', 'Não foi possível ' + acao + ': o chamado ' + Rep_s_(c.NUMERO) + ' não segue a régua de prazos da representada (chamado comum ligado depois mantém o prazo com que nasceu).');
  var R = RepR_calcular_(c, Date.now());
  if (!R) throw Rep_erro_('SEM_REGUA', 'Não foi possível ' + acao + ': o chamado ' + Rep_s_(c.NUMERO) + ' está sem a data de abertura. Fale com o Administrador.');
  return R;
}
/** A Metrolabs pode mexer na régua? Gestão da Assistência e quem responde pela representação. */
function RepR_podeMetrolabs_(eu) { return !!eu && !eu.externo && (!!eu.gestao || (typeof RepI_podeAdministrar_ === 'function' && RepI_podeAdministrar_(eu))); }
function RepR_exigirMetrolabs_(eu, acao) {
  if (!RepR_podeMetrolabs_(eu)) throw Rep_erro_('PERFIL', 'Não foi possível ' + acao + ': a régua de prazos da representada é da gestão da área Técnica e de quem responde pela representação (Regras da assistência > Representação). Peça a um deles.');
}
function RepR_chamadoInterno_(eu, id, acao) {
  var c = Ast_porId_(AST_ABAS.CHAMADOS, id);
  if (!c || !AstC_podeVer_(eu, c)) throw Rep_erro_('NAO_ENCONTRADO', 'Não foi possível ' + acao + ': chamado não encontrado entre os que você acompanha. Atualize a tela.');
  return c;
}
function RepR_resposta_(c, externo, msg) { Ast_memoTirar_(AST_ABAS.CHAMADOS); var atual = Ast_porId_(AST_ABAS.CHAMADOS, c.ID) || c; return { regua: RepR_daTela_(atual, externo), message: msg }; }

// ------------------------------------------------------------
// AÇÕES DA REPRESENTADA
// ------------------------------------------------------------
/** Representada informa (ou atualiza) a data prevista de chegada da peça. d: { id, peca, previsao: 'AAAA-MM-DD', obs }. */
function RepRA_informarPrevisao_(eu, d) {
  d = d || {};
  Rep_exigirPerm_(eu, 'prazos', 'informar a previsão da peça');
  var c = Rep_escopo_(eu).chamado(d.id);
  return RepR_gravarPrevisao_(c, d, { lado: 'REPRESENTADA', nome: Rep_quem_(eu), ast: Rep_comoAst_(eu), eu: eu });
}
/** Representada aceita ou recusa o pedido de mais prazo. d: { id, prorrogacaoId, aceitar, motivo }. */
function RepRA_responderProrrogacao_(eu, d) {
  d = d || {};
  Rep_exigirPerm_(eu, 'prazos', 'responder o pedido de mais prazo');
  var c = Rep_escopo_(eu).chamado(d.id);
  RepR_exigirRegua_(c, 'responder o pedido de mais prazo');
  var aceitar = d.aceitar === true || d.aceitar === 'true' || d.aceitar === 'SIM', motivo = Rep_txt_(d.motivo, 600);
  if (!aceitar && motivo.length < 5) { var e = Rep_erro_('INCOMPLETO', 'Não foi possível recusar: escreva o motivo da recusa (pelo menos 5 letras). Ele fica no histórico e a Metrolabs é avisada. Nada foi gravado.'); e.faltam = [{ campo: 'prMotivo', texto: 'Escreva o motivo da recusa.' }]; throw e; }
  var quem = Rep_quem_(eu), info = null;
  RepR_gravar_(c.ID, function (atual, dados) {
    var p = dados.prorrogacoes.filter(function (x) { return x.id === Rep_s_(d.prorrogacaoId); })[0];
    if (!p) throw Rep_erro_('NAO_ENCONTRADO', 'Não foi possível responder: o pedido de mais prazo não foi encontrado. Atualize a tela.');
    if (p.situacao !== 'PENDENTE') throw Rep_erro_('ESTADO', 'Não foi possível responder: este pedido de mais prazo já foi ' + (p.situacao === 'ACEITA' ? 'aceito' : 'recusado') + ' por ' + Rep_s_(p.respondidaPorNome) + ' em ' + Rep_br_(p.respondidaEm) + '. Atualize a tela.');
    var R = RepR_calcular_(atual, Date.now()), e = R.etapas.filter(function (x) { return x.chave === p.etapa; })[0];
    if (!e || e.fechada) throw Rep_erro_('ESTADO', 'Não foi possível responder: a etapa "' + (e ? e.nome : p.etapaNome) + '" já foi fechada pela Metrolabs; o pedido de mais prazo não vale mais. Atualize a tela.');
    p.situacao = aceitar ? 'ACEITA' : 'RECUSADA'; p.respondidaEm = Rep_agora_(); p.respondidaPorNome = quem; p.respondidaPorId = eu.id; p.respostaMotivo = motivo;
    info = { p: p, etapaNome: e.nome, prazoAtual: RepR_br_(e.ateMs) };
  });
  var p = info.p, txt = (aceitar ? 'Pedido de mais prazo ACEITO pela representada' : 'Pedido de mais prazo RECUSADO pela representada') + ' (' + info.etapaNome + '): ' + (aceitar ? 'novo prazo até ' + Rep_br_(p.novaAte) : 'segue o prazo até ' + info.prazoAtual) + (motivo ? '. Motivo: ' + motivo : '') + '.';
  Ast_evento_('CHAMADO', c.ID, 'REP_PRORROGACAO_RESPOSTA', Rep_comoAst_(eu), txt, { numero: c.NUMERO, publico: 'REPRESENTADA' });
  Rep_acesso_('PRORROGACAO_' + (aceitar ? 'ACEITA' : 'RECUSADA'), eu, d.ctx, c.NUMERO + ': ' + info.etapaNome + (motivo ? ' · ' + motivo : ''));
  Ast_avisar_(Rep_responsaveis_().ids.concat(Rep_s_(p.pedidaPorId) ? [Rep_s_(p.pedidaPorId)] : []), 'REP_REGUA', (aceitar ? 'Mais prazo aceito: ' : 'Mais prazo recusado: ') + c.NUMERO + ' (' + eu.repNome + ')', txt + '\nAbra o chamado na Assistência técnica para seguir.', c.ID, { evento: 'RP11' });
  return RepR_resposta_(c, true, aceitar ? 'Pedido de mais prazo aceito: vale o novo prazo, até ' + Rep_br_(p.novaAte) + '. A Metrolabs foi avisada.' : 'Pedido de mais prazo recusado: segue o prazo atual (até ' + info.prazoAtual + '). A Metrolabs foi avisada com o motivo.');
}

/** Grava a previsão da peça (pela representada ou, em nome dela, pela Metrolabs). quem: { lado, nome, ast, eu, canal }. */
function RepR_gravarPrevisao_(c, d, quem) {
  RepR_exigirRegua_(c, 'informar a previsão da peça');
  var dia = Rep_s_(d.previsao).slice(0, 10), hoje = Ast_hoje_(), obs = Rep_txt_(d.obs, 600), n = Number(d.peca) || 0, faltam = [];
  if (!RepR_diaOk_(dia)) faltam.push({ campo: 'pcPrevisao', texto: 'informe a data prevista de chegada da peça' });
  else if (dia < hoje) faltam.push({ campo: 'pcPrevisao', texto: 'a data prevista não pode ser anterior a hoje (' + RepR_brDia_(hoje) + ')' });
  else if (dia > Ast_somarDias_(hoje, 365)) faltam.push({ campo: 'pcPrevisao', texto: 'a data prevista passa de um ano; confira a data' });
  if (quem.lado === 'METROLABS' && obs.length < 5) faltam.push({ campo: 'pcObs', texto: 'diga quem da representada informou e por onde (telefone, e-mail ou WhatsApp)' });
  Rep_falhou_(faltam, 'gravar a previsão da peça');
  var info = null;
  RepR_gravar_(c.ID, function (atual, dados) {
    var R = RepR_calcular_(atual, Date.now()), e = R.etapas.filter(function (x) { return (x.codigo === 'PECA_PREVISAO' || x.codigo === 'PECA_CHEGADA') && !x.fechada && (!n || x.ordem === n); }).sort(function (a, b) { return b.ordem - a.ordem; })[0];
    if (!e) throw Rep_erro_('ESTADO', 'Não foi possível gravar a previsão: o chamado ' + atual.NUMERO + ' não está aguardando peça (ou a peça já chegou). Atualize a tela.');
    var k = String(e.ordem), reg = dados.pecas[k] = dados.pecas[k] || {}, atualizacao = !!reg.informadaEm;
    if (atualizacao && quem.lado === 'REPRESENTADA' && obs.length < 5) { var er = Rep_erro_('INCOMPLETO', 'Não foi possível atualizar a previsão: diga o motivo da mudança (pelo menos 5 letras). Nada foi gravado.'); er.faltam = [{ campo: 'pcObs', texto: 'Diga o motivo da mudança da data.' }]; throw er; }
    reg.historico = Array.isArray(reg.historico) ? reg.historico : [];
    reg.historico.push({ previsao: dia, em: Rep_agora_(), por: quem.nome, lado: quem.lado, obs: obs });
    reg.previsao = dia; reg.informadaEm = reg.informadaEm || Rep_agora_(); reg.informadaPor = quem.nome; reg.informadaLado = quem.lado; reg.obs = obs;
    reg.descricao = reg.descricao || e.pecaDescricao || Rep_s_(atual.PECA_DESCRICAO);
    info = { n: e.ordem, atualizacao: atualizacao, descricao: reg.descricao };
  });
  var txt = (info.atualizacao ? 'Previsão de chegada da peça atualizada' : 'Previsão de chegada da peça informada') + (quem.lado === 'METROLABS' ? ' pela Metrolabs em nome da representada' : ' pela representada') + ': ' + RepR_brDia_(dia) +
    (info.descricao ? ' (' + info.descricao.slice(0, 160) + ')' : '') + (obs ? '. ' + (quem.lado === 'METROLABS' ? 'Informado por: ' : 'Observação: ') + obs : '') + '.';
  Ast_evento_('CHAMADO', c.ID, 'REP_PECA_PREVISAO', quem.ast, txt, { numero: c.NUMERO, publico: 'REPRESENTADA' });
  if (quem.lado === 'REPRESENTADA') {
    Rep_acesso_('PECA_PREVISAO', quem.eu, d.ctx, c.NUMERO + ': ' + RepR_brDia_(dia));
    Ast_avisar_(Rep_responsaveis_().ids.concat(Rep_s_(c.TECNICO_ID) ? [Rep_s_(c.TECNICO_ID)] : []), 'REP_REGUA', 'Previsão da peça: ' + c.NUMERO + ' (' + Rep_s_(c.REPRESENTADA_NOME) + ')', txt + '\nQuando a peça chegar, registre a chegada na ficha do chamado: começa o prazo para avaliar.', c.ID, { evento: 'RP11' });
  } else Rep_avisarRepresentada_(c.REPRESENTADA_ID, '', 'Previsão da peça registrada: ' + c.NUMERO, txt + '\nSe a data não estiver certa, atualize a previsão na ficha do chamado.', c.ID, 'RP06');
  return RepR_resposta_(c, quem.lado === 'REPRESENTADA', 'Previsão de chegada da peça gravada: ' + RepR_brDia_(dia) + '. ' + (quem.lado === 'REPRESENTADA' ? 'A Metrolabs foi avisada.' : 'A representada foi avisada por e-mail.'));
}

// ------------------------------------------------------------
// AÇÕES DA METROLABS
// ------------------------------------------------------------
/** Pede mais prazo numa etapa da Metrolabs. d: { id, etapa (chave), novaData 'AAAA-MM-DD', hora 'HH:MM' (opcional), motivo }. */
function RepRI_pedirProrrogacao_(eu, d) {
  d = d || {};
  RepR_exigirMetrolabs_(eu, 'pedir mais prazo');
  var c = RepR_chamadoInterno_(eu, d.id, 'pedir mais prazo');
  RepR_exigirRegua_(c, 'pedir mais prazo');
  var dia = Rep_s_(d.novaData).slice(0, 10), hora = /^\d{2}:\d{2}$/.test(Rep_s_(d.hora)) ? Rep_s_(d.hora) : '', motivo = Rep_txt_(d.motivo, 600), faltam = [];
  var novaMs = RepR_diaOk_(dia) ? (hora ? Ast_ms_(dia + 'T' + hora + ':00') : RepR_fimDoDia_(dia)) : null;
  if (novaMs === null) faltam.push({ campo: 'prData', texto: 'informe a nova data do prazo' });
  else if (novaMs <= Date.now()) faltam.push({ campo: 'prData', texto: 'a nova data precisa ser depois de agora' });
  else if (dia > Ast_somarDias_(Ast_hoje_(), 120)) faltam.push({ campo: 'prData', texto: 'a nova data passa de 120 dias; confira a data' });
  if (motivo.length < 10) faltam.push({ campo: 'prMotivo', texto: 'escreva o motivo do pedido (pelo menos 10 letras); a representada lê para decidir' });
  Rep_falhou_(faltam, 'pedir mais prazo');
  var info = null;
  RepR_gravar_(c.ID, function (atual, dados) {
    var R = RepR_calcular_(atual, Date.now()), e = R.etapas.filter(function (x) { return x.chave === Rep_s_(d.etapa); })[0];
    if (!e) throw Rep_erro_('NAO_ENCONTRADO', 'Não foi possível pedir mais prazo: a etapa escolhida não existe neste chamado. Atualize a tela.');
    if (e.fechada) throw Rep_erro_('ESTADO', 'Não foi possível pedir mais prazo: a etapa "' + e.nome + '" já foi fechada em ' + RepR_br_(e.fimMs) + '.');
    if (e.resp !== 'METROLABS' || e.ateMs === null) throw Rep_erro_('ESTADO', 'Não foi possível pedir mais prazo: a etapa "' + e.nome + '" não tem prazo da Metrolabs.');
    if (e.prorrogacaoPendente) throw Rep_erro_('ESTADO', 'Não foi possível pedir mais prazo: já há um pedido para "' + e.nome + '" aguardando a resposta da representada (até ' + e.prorrogacaoPendente.novaAte + '). Espere a resposta ou fale com ela pela conversa.');
    if (novaMs <= e.ateMs) throw Rep_erro_('ESTADO', 'Não foi possível pedir mais prazo: a nova data precisa ser depois do prazo atual (' + RepR_br_(e.ateMs) + ').');
    var p = { id: RepR_id_(), etapa: e.chave, etapaNome: e.nome, pedidaEm: Rep_agora_(), pedidaPorId: eu.id, pedidaPorNome: eu.nome, motivo: motivo, prazoAntes: Ast_agora_(e.ateMs), novaAte: Ast_agora_(novaMs), situacao: 'PENDENTE' };
    dados.prorrogacoes.push(p);
    info = { p: p, e: e };
  });
  var txt = 'A Metrolabs pediu mais prazo para "' + info.e.nome + '": de ' + RepR_br_(info.e.ateMs) + ' para ' + RepR_br_(novaMs) + '. Motivo: ' + motivo + '.';
  Ast_evento_('CHAMADO', c.ID, 'REP_PRORROGACAO_PEDIDA', eu, txt, { numero: c.NUMERO, publico: 'REPRESENTADA' });
  Rep_avisarRepresentada_(c.REPRESENTADA_ID, '', 'Pedido de mais prazo: ' + c.NUMERO, txt + '\nAceite ou recuse (com o motivo) na ficha do chamado. Até a resposta vale o prazo atual.', c.ID, 'RP10');
  return RepR_resposta_(c, false, 'Pedido de mais prazo enviado à representada (até ' + RepR_br_(novaMs) + '). Até ela responder vale o prazo atual (até ' + RepR_br_(info.e.ateMs) + ').');
}
/** Registra a chegada da peça (e libera o chamado para agendar, se ele está aguardando peça). d: { id, peca, quando 'AAAA-MM-DDTHH:MM' (opcional), obs }. */
function RepRI_registrarChegada_(eu, d) {
  d = d || {};
  RepR_exigirMetrolabs_(eu, 'registrar a chegada da peça');
  var c = RepR_chamadoInterno_(eu, d.id, 'registrar a chegada da peça');
  RepR_exigirRegua_(c, 'registrar a chegada da peça');
  var quando = Rep_s_(d.quando), ms = quando ? Ast_ms_(quando.length === 16 ? quando + ':00' : quando) : Date.now(), obs = Rep_txt_(d.obs, 600), n = Number(d.peca) || 0;
  if (ms === null || ms > Date.now() + 60000) { var e0 = Rep_erro_('INCOMPLETO', 'Não foi possível registrar a chegada: informe a data e a hora em que a peça chegou (não pode ser no futuro). Nada foi gravado.'); e0.faltam = [{ campo: 'pcQuando', texto: 'Data e hora da chegada.' }]; throw e0; }
  var info = null;
  RepR_gravar_(c.ID, function (atual, dados) {
    var R = RepR_calcular_(atual, Date.now()), e = R.etapas.filter(function (x) { return (x.codigo === 'PECA_PREVISAO' || x.codigo === 'PECA_CHEGADA') && !x.fechada && (!n || x.ordem === n); }).sort(function (a, b) { return b.ordem - a.ordem; })[0];
    if (!e) throw Rep_erro_('ESTADO', 'Não foi possível registrar a chegada: o chamado ' + atual.NUMERO + ' não tem peça aguardando (ou a chegada já foi registrada). Atualize a tela.');
    var pedido = (R.etapas.filter(function (x) { return x.codigo === 'PECA_PREVISAO' && x.ordem === e.ordem; })[0] || e).iniMs;
    if (ms < pedido - 60000) throw Rep_erro_('ESTADO', 'Não foi possível registrar a chegada: a data informada é anterior ao pedido da peça (' + RepR_br_(pedido) + '). Confira a data e a hora.');
    var k = String(e.ordem), reg = dados.pecas[k] = dados.pecas[k] || {};
    reg.chegouEm = Ast_agora_(ms); reg.chegouPor = eu.nome; reg.chegadaObs = obs; reg.descricao = reg.descricao || e.pecaDescricao || Rep_s_(atual.PECA_DESCRICAO);
    info = { n: e.ordem, descricao: reg.descricao, previsao: Rep_s_(reg.previsao) };
  });
  var pz = RepR_prazos_(c), ateAv = Ast_somarMinUteis_(ms, pz.avaliacaoMin);
  var txt = 'Peça recebida em ' + RepR_br_(ms) + (info.descricao ? ' (' + info.descricao.slice(0, 160) + ')' : '') + (info.previsao ? '; previsão informada pela representada: ' + RepR_brDia_(info.previsao) : '') + '. Prazo para avaliar: ' + pz.textos.avaliacao + ', até ' + RepR_br_(ateAv) + (obs ? '. ' + obs : '') + '.';
  Ast_evento_('CHAMADO', c.ID, 'REP_PECA_CHEGOU', eu, txt, { numero: c.NUMERO, publico: 'REPRESENTADA' });
  // o chamado que esperava a peça volta a "Planejado" (falta agendar), como em "Liberar para agendar"
  Ast_memoTirar_(AST_ABAS.CHAMADOS);
  var atual = Ast_porId_(AST_ABAS.CHAMADOS, c.ID), liberou = false;
  if (atual && Ast_up_(atual.SITUACAO) === 'AGUARDANDO_PECA') {
    Ast_comTrava_(function () { AstC_mudar_(eu, atual, 'PLANEJADO', { PECA_DISPONIVEL_EM: Ast_agora_(ms), PROXIMA_ACAO: 'Peça recebida: avaliar e agendar o retorno até ' + RepR_br_(ateAv) + ' (régua da representada)' }, 'LIBERADO', 'Peça recebida (régua da representada): liberado para agendar'); });
    liberou = true;
  }
  Rep_avisarRepresentada_(c.REPRESENTADA_ID, '', 'Peça recebida: ' + c.NUMERO, txt, c.ID, 'RP06');
  return RepR_resposta_(c, false, 'Chegada da peça registrada.' + (liberou ? ' O chamado voltou para "Planejado" (falta agendar).' : '') + ' Prazo para avaliar até ' + RepR_br_(ateAv) + '. A representada foi avisada.');
}
/** Registra a avaliação depois da peça (o próximo passo). d: { id, texto }. */
function RepRI_registrarAvaliacao_(eu, d) {
  d = d || {};
  RepR_exigirMetrolabs_(eu, 'registrar a avaliação');
  var c = RepR_chamadoInterno_(eu, d.id, 'registrar a avaliação');
  RepR_exigirRegua_(c, 'registrar a avaliação');
  var t = Rep_txt_(d.texto, 1000);
  if (t.length < 10) { var e0 = Rep_erro_('INCOMPLETO', 'Não foi possível registrar a avaliação: escreva o resultado e o próximo passo (pelo menos 10 letras), por exemplo "peça testada; retorno agendado para 14/11". A representada lê este texto. Nada foi gravado.'); e0.faltam = [{ campo: 'avTexto', texto: 'Resultado e próximo passo.' }]; throw e0; }
  var info = null;
  RepR_gravar_(c.ID, function (atual, dados) {
    var R = RepR_calcular_(atual, Date.now()), e = R.etapas.filter(function (x) { return x.codigo === 'AVALIACAO' && !x.fechada; })[0];
    if (!e) throw Rep_erro_('ESTADO', 'Não foi possível registrar a avaliação: o chamado ' + atual.NUMERO + ' não tem avaliação depois da peça em aberto (a peça ainda não chegou, ou a avaliação já foi feita). Atualize a tela.');
    dados.avaliacoes.push({ em: Rep_agora_(), por: eu.nome, porId: eu.id, texto: t, peca: e.ordem });
    info = { e: e };
  });
  Ast_evento_('CHAMADO', c.ID, 'REP_AVALIACAO', eu, 'Avaliação depois da peça (' + info.e.nome + '): ' + t, { numero: c.NUMERO, publico: 'REPRESENTADA' });
  Rep_avisarRepresentada_(c.REPRESENTADA_ID, '', 'Avaliação registrada: ' + c.NUMERO, 'A Metrolabs registrou a avaliação depois da chegada da peça: ' + t, c.ID, 'RP06');
  return RepR_resposta_(c, false, 'Avaliação registrada' + (info.e.ateMs >= Date.now() ? ' no prazo' : ' (fora do prazo de ' + RepR_br_(info.e.ateMs) + ')') + '. A representada foi avisada.');
}
/** Metrolabs registra a previsão informada pela representada por outro canal. d: { id, peca, previsao, obs }. */
function RepRI_registrarPrevisao_(eu, d) {
  RepR_exigirMetrolabs_(eu, 'registrar a previsão da peça');
  var c = RepR_chamadoInterno_(eu, d && d.id, 'registrar a previsão da peça');
  return RepR_gravarPrevisao_(c, d || {}, { lado: 'METROLABS', nome: eu.nome, ast: eu, eu: eu });
}
function RepRI_regua_(eu, d) {
  var c = RepR_chamadoInterno_(eu, d && d.id, 'abrir a régua');
  return { regua: RepR_daTela_(c, false), podeMexer: RepR_podeMetrolabs_(eu) };
}

// ------------------------------------------------------------
// AVISOS (gancho da Assistência e rotina)
// ------------------------------------------------------------
/** Gancho de AstC_mudar_ (depois de gravar): chamado da representada entrou em "Aguardando peça" -> aviso RP09 à representada. Nunca lança. */
function RepR_aoMudar_(eu, c, de, para) {
  try {
    if (para !== 'AGUARDANDO_PECA' || !RepR_aplica_(c)) return;
    Ast_depois_(function () { RepR_avisarPecas_(c.ID, Date.now()); });
  } catch (e) {}
}
/** Aviso RP09 (uma vez por peça) e o lembrete depois de 1 dia útil sem a previsão (à representada e a quem responde pela representação). */
function RepR_avisarPecas_(id, agoraMs) {
  var n = 0;
  try {
    Ast_memoTirar_(AST_ABAS.CHAMADOS);
    var c = Ast_porId_(AST_ABAS.CHAMADOS, id), R = c ? RepR_calcular_(c, agoraMs) : null;
    if (!R) return 0;
    R.etapas.filter(function (e) { return e.codigo === 'PECA_PREVISAO' && !e.fechada; }).forEach(function (e) {
      var k = String(e.ordem), reg = RepR_dados_(c).pecas[k] || {}, desc = e.pecaDescricao ? ' (' + e.pecaDescricao.slice(0, 160) + ')' : '';
      if (!Rep_s_(reg.avisoEm)) {
        RepR_gravar_(c.ID, function (x, dados) { var r = dados.pecas[k] = dados.pecas[k] || {}; if (r.avisoEm) return { naoGravar: true }; r.avisoEm = Rep_agora_(agoraMs); r.descricao = r.descricao || e.pecaDescricao; });
        Rep_avisarRepresentada_(c.REPRESENTADA_ID, '', 'Informe a previsão da peça: ' + c.NUMERO, 'O atendimento do chamado ' + c.NUMERO + ' (' + Rep_s_(c.CLIENTE_NOME) + ') precisa de peça' + desc + '. Informe a data prevista de chegada na ficha do chamado (Representação > Chamados). Enquanto a previsão não for informada, o atendimento aguarda a sua empresa.', c.ID, 'RP09');
        n++;
      } else if (!Rep_s_(reg.lembreteEm) && Rep_diasUteisEntre_(e.iniMs, agoraMs) >= 1) {
        RepR_gravar_(c.ID, function (x, dados) { var r = dados.pecas[k] = dados.pecas[k] || {}; if (r.lembreteEm) return { naoGravar: true }; r.lembreteEm = Rep_agora_(agoraMs); });
        Rep_avisarRepresentada_(c.REPRESENTADA_ID, '', 'Lembrete: previsão da peça do chamado ' + c.NUMERO, 'A previsão de chegada da peça' + desc + ' ainda não foi informada (pedido em ' + RepR_br_(e.iniMs) + '). Informe na ficha do chamado.', c.ID, 'RP09');
        Ast_avisar_(Rep_responsaveis_().ids, 'REP_REGUA', 'Representada sem previsão da peça: ' + c.NUMERO + ' (' + Rep_s_(c.REPRESENTADA_NOME) + ')', 'Desde ' + RepR_br_(e.iniMs) + ' a representada não informou a data prevista da peça' + desc + '. O prazo da Metrolabs está pausado. Se ela informar por outro canal, registre a previsão em nome dela na ficha do chamado.', c.ID, { evento: 'RP12' });
        n++;
      }
    });
  } catch (e) { try { console.error('Representação, aviso da peça: ' + ((e && e.message) || e)); } catch (x) {} }
  return n;
}
/**
 * Rotina (Representacao_rotina_): por chamado aberto com a régua — aviso da peça (RP09), etapa da Metrolabs a 75% do prazo
 * ou vencida (RP12, uma vez por etapa e marco; vencida também à gestão da área Técnica) e lembrete do pedido de mais prazo
 * sem resposta depois de 1 dia útil (RP10). Nunca lança.
 */
function RepR_rotina_(agoraMs) {
  var n = 0;
  try {
    agoraMs = agoraMs || Date.now();
    var resp = null, gest = null;
    Ast_ler_(AST_ABAS.CHAMADOS).filter(function (c) { return RepR_aplica_(c) && AST_TERMINAIS.indexOf(Ast_up_(c.SITUACAO)) < 0; }).forEach(function (c0) {
      try {
        n += RepR_avisarPecas_(c0.ID, agoraMs);
        Ast_memoTirar_(AST_ABAS.CHAMADOS);
        var c = Ast_porId_(AST_ABAS.CHAMADOS, c0.ID), R = c ? RepR_calcular_(c, agoraMs) : null;
        if (!R) return;
        var dados = RepR_dados_(c), marcar = [];
        R.etapas.filter(function (e) { return !e.fechada && e.resp === 'METROLABS' && (e.estado === 'EM_RISCO' || e.estado === 'VENCIDO'); }).forEach(function (e) {
          var k = e.chave + '|' + e.estado + '|' + (e.ateMs || '');
          if (dados.alertas[k]) return;
          resp = resp || Rep_responsaveis_().ids; gest = gest || Ast_gestoresTecnica_();
          var venc = e.estado === 'VENCIDO';
          Ast_avisar_(venc ? resp.concat(gest) : resp, 'REP_REGUA', (venc ? 'Prazo VENCIDO na régua: ' : 'Prazo em risco na régua: ') + c.NUMERO + ' (' + Rep_s_(c.REPRESENTADA_NOME) + ')',
            e.nome + ': ' + (venc ? 'venceu em ' : 'vence em ') + RepR_br_(e.ateMs) + '.\n' + e.falta + '\nSe precisar de mais prazo, peça à representada na ficha do chamado (com o motivo).', c.ID, { evento: 'RP12' });
          marcar.push(k); n++;
        });
        var lembrar = R.etapas.filter(function (e) { return e.prorrogacaoPendente && !e.fechada; }).map(function (e) { return e.prorrogacaoPendente; })
          .filter(function (p) { var x = dados.prorrogacoes.filter(function (y) { return y.id === p.id; })[0]; return x && !x.lembreteEm && Rep_diasUteisEntre_(Ast_ms_(x.pedidaEm), agoraMs) >= 1; });
        lembrar.forEach(function (p) { Rep_avisarRepresentada_(c.REPRESENTADA_ID, '', 'Lembrete: pedido de mais prazo do chamado ' + c.NUMERO, 'A Metrolabs pediu mais prazo (até ' + p.novaAte + '). Motivo: ' + p.motivo + '. Aceite ou recuse na ficha do chamado.', c.ID, 'RP10'); n++; });
        if (marcar.length || lembrar.length) RepR_gravar_(c.ID, function (x, d) {
          marcar.forEach(function (k) { d.alertas[k] = Rep_agora_(agoraMs); });
          lembrar.forEach(function (p) { d.prorrogacoes.forEach(function (y) { if (y.id === p.id) y.lembreteEm = Rep_agora_(agoraMs); }); });
        });
      } catch (e1) { try { console.error('Representação, rotina da régua (' + c0.NUMERO + '): ' + ((e1 && e1.message) || e1)); } catch (x) {} }
    });
  } catch (e) { try { console.error('Representação, rotina da régua: ' + ((e && e.message) || e)); } catch (x) {} }
  return n;
}
/** Para a central de pendências: chamados com pendência da representada há 1 dia útil ou mais (previsão da peça ou mais prazo sem resposta). */
function RepR_pendenciasRepresentada_(agoraMs) {
  var l = [];
  try {
    Ast_ler_(AST_ABAS.CHAMADOS).filter(function (c) { return RepR_aplica_(c) && AST_TERMINAIS.indexOf(Ast_up_(c.SITUACAO)) < 0; }).forEach(function (c) {
      var R = RepR_calcular_(c, agoraMs);
      (R ? R.pendenciasRepresentada : []).forEach(function (p) { if (p.desdeMs && Rep_diasUteisEntre_(p.desdeMs, agoraMs) >= 1) l.push({ c: c, p: p }); });
    });
  } catch (e) { l = []; }
  return l;
}

// ------------------------------------------------------------
// MARCOS (ficha, Gantt da ficha e A4)
// ------------------------------------------------------------
/** Marcos da régua: agendamento, relatórios, previsão e chegada da peça, avaliação. */
function RepR_marcos_(R) {
  if (!R) return [];
  var m = [];
  R.etapas.forEach(function (e) {
    if (e.codigo === 'ESTUDO') m.push({ nome: 'Agendamento do atendimento', previstoMs: e.ateMs, realizadoMs: e.encerradaSemConclusao ? null : e.fimMs, ordem: e.iniMs });
    else if (e.codigo === 'RELATORIO') m.push({ nome: e.nome, previstoMs: e.ateMs, realizadoMs: e.encerradaSemConclusao ? null : e.fimMs, ordem: e.iniMs });
    else if (e.codigo === 'PECA_CHEGADA') m.push({ nome: e.nome, previstoMs: e.previstoMs, realizadoMs: e.estado === 'ENCERRADA' ? null : e.fimMs, ordem: e.iniMs });
    else if (e.codigo === 'AVALIACAO') m.push({ nome: e.nome, previstoMs: e.ateMs, realizadoMs: e.encerradaSemConclusao ? null : e.fimMs, ordem: e.iniMs });
  });
  return m;
}
