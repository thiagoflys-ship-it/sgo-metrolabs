/****************************************************
 * MÓDULO REPRESENTAÇÃO — AVISOS, CENTRAL DE PENDÊNCIAS E CAIXA DE DECISÕES (29/10/2026)
 *
 * Como a Assistência (SGO_Pendencias_Assistencia.js): só acrescenta o que ainda não existe nas tabelas compartilhadas
 * (PEND_TIPOS, PEND_FONTES, GES_TIPOS, MTZ_PADRAO). Prazos (seção 5.4 do estudo, configuráveis por representada):
 *  - aceite do pedido: 4 h úteis. A 75% do prazo, alerta ao responsável pela representação (Regras da assistência >
 *    Representação); vencido, alerta à gestão da área Técnica e item na Caixa de decisões. O tempo com o complemento
 *    pedido não conta (prazo pausado).
 *  - chamado da representada sem nenhum registro (histórico ou conversa) em 3 dias úteis: responsável e Caixa de decisões.
 * Rotina: Assistencia_rotinaGatilho chama Representacao_rotina_ (alerta por e-mail uma vez por marco).
 ****************************************************/

var REP_PEND_TIPOS = {
  rep_aceite: { modulo: 'representacao', um: 'pedido de representada perto do fim do prazo de aceite', varios: 'pedidos de representada perto do fim do prazo de aceite', rotulo: 'Aceitar pedido', fazer: 'aceite, peça complemento ou recuse em Representação > Pedidos', tela: { tipo: 'representacao', mod: 'representacao' }, origem: 'REPRESENTACAO' },
  rep_aceite_vencido: { modulo: 'representacao', um: 'pedido de representada com prazo de aceite vencido', varios: 'pedidos de representada com prazo de aceite vencido', rotulo: 'Aceite vencido', fazer: 'trate agora em Representação > Pedidos', tela: { tipo: 'representacao', mod: 'representacao' }, origem: 'REPRESENTACAO' },
  rep_novo: { modulo: 'representacao', um: 'pedido de representada na fila', varios: 'pedidos de representada na fila', rotulo: 'Pedido da representada', fazer: 'aceite, peça complemento ou recuse em Representação > Pedidos', tela: { tipo: 'representacao', mod: 'representacao' }, origem: 'REPRESENTACAO' },
  rep_sem_registro: { modulo: 'representacao', um: 'chamado de representada sem registro há dias úteis', varios: 'chamados de representada sem registro há dias úteis', rotulo: 'Sem registro', fazer: 'registre o andamento no chamado ou responda na conversa', tela: { tipo: 'representacao', mod: 'representacao' }, origem: 'REPRESENTACAO' }
};
var REP_GES_TIPOS = { rep_aceite_vencido: { prazo: 1 }, rep_sem_registro: { prazo: 1 } };
var REP_MTZ_EVENTOS = [
  { cod: 'RP01', modulo: 'representacao', evento: 'Pedido de atendimento da representada na fila', origem: 'SGO_Representacao.js', publico: 'Responsável pela representação', email: 'HORA', whatsapp: 'NAO', limite: '1 por pedido', obs: 'Prazo de aceite de 4 horas úteis (configurável por representada).', area: 'TECNICA', obrigatorio: true },
  { cod: 'RP02', modulo: 'representacao', evento: 'Pedido da representada com equipamento parado', origem: 'SGO_Representacao.js', publico: 'Responsável pela representação', email: 'HORA', whatsapp: 'NAO', limite: '1 por pedido', area: 'TECNICA', obrigatorio: true },
  { cod: 'RP03', modulo: 'representacao', evento: 'Complemento respondido pela representada', origem: 'SGO_Representacao.js', publico: 'Responsável pela representação', email: 'HORA', whatsapp: 'NAO', limite: '1 por resposta', area: 'TECNICA' },
  { cod: 'RP04', modulo: 'representacao', evento: 'Pedido ou chamado cancelado pela representada', origem: 'SGO_Representacao.js', publico: 'Responsável pela representação; gestão da área Técnica', email: 'HORA', whatsapp: 'NAO', limite: '1 por cancelamento', area: 'TECNICA' },
  { cod: 'RP05', modulo: 'representacao', evento: 'Mensagem da representada na conversa', origem: 'SGO_Representacao.js', publico: 'Responsável pela representação; técnico do chamado', email: 'RESUMO', whatsapp: 'NAO', limite: 'No resumo do dia', area: 'TECNICA' },
  { cod: 'RP06', modulo: 'representacao', evento: 'Pedido aceito, complemento pedido, pedido recusado ou mensagem da Metrolabs (à representada)', origem: 'SGO_Representacao.js; SGO_Assistencia_Chamados.js', publico: 'Representada (quem abriu e o administrador dela)', email: 'HORA', whatsapp: 'NAO', limite: '1 por evento', obs: 'Só e-mail nesta etapa; WhatsApp à representada depende dos modelos aprovados pela Meta.' },
  { cod: 'RP07', modulo: 'representacao', evento: 'Prazo de aceite do pedido da representada em risco (75%) ou vencido', origem: 'SGO_Representacao_Avisos.js (rotina da Assistência)', publico: 'Responsável pela representação; vencido: gestão da área Técnica', email: 'HORA', whatsapp: 'NAO', limite: '1 por marco', area: 'TECNICA', obrigatorio: true },
  { cod: 'RP08', modulo: 'representacao', evento: 'Chamado de representada sem registro em 3 dias úteis', origem: 'SGO_Representacao_Avisos.js (rotina da Assistência)', publico: 'Responsável pela representação', email: 'HORA', whatsapp: 'NAO', limite: '1 por chamado por período parado', area: 'TECNICA' }
];

function Representacao_registrarTipos_() {
  try {
    if (typeof PEND_TIPOS !== 'undefined' && PEND_TIPOS) Object.keys(REP_PEND_TIPOS).forEach(function (k) { if (!PEND_TIPOS[k]) PEND_TIPOS[k] = REP_PEND_TIPOS[k]; });
    if (typeof PEND_MODULOS !== 'undefined' && PEND_MODULOS && !PEND_MODULOS.representacao) PEND_MODULOS.representacao = 'Representação';
    if (typeof PEND_FONTES !== 'undefined' && Array.isArray(PEND_FONTES) && !PEND_FONTES.some(function (f) { return f && f.nome === 'Representacao'; })) {
      PEND_FONTES.push({ nome: 'Representacao', fn: function (add, ctx) { if (!ctx.cliente && typeof Representacao_fontePendencias_ === 'function') Representacao_fontePendencias_(add, ctx); } });
    }
    if (typeof GES_TIPOS !== 'undefined' && GES_TIPOS) Object.keys(REP_GES_TIPOS).forEach(function (k) { if (!GES_TIPOS[k]) GES_TIPOS[k] = REP_GES_TIPOS[k]; });
    if (typeof GES_AREA_MODULO_PADRAO !== 'undefined' && GES_AREA_MODULO_PADRAO && !GES_AREA_MODULO_PADRAO.representacao) GES_AREA_MODULO_PADRAO.representacao = 'TECNICA';
    if (typeof GES_MODULOS_CONFIG !== 'undefined' && Array.isArray(GES_MODULOS_CONFIG) && !GES_MODULOS_CONFIG.some(function (m) { return m && m[0] === 'representacao'; })) GES_MODULOS_CONFIG.push(['representacao', 'Representação']);
    if (typeof MTZ_PADRAO !== 'undefined' && Array.isArray(MTZ_PADRAO)) REP_MTZ_EVENTOS.forEach(function (ev) { if (!MTZ_PADRAO.some(function (x) { return x && x.cod === ev.cod; })) MTZ_PADRAO.push(ev); });
    if (typeof MTZ_MODULOS_NOMES !== 'undefined' && MTZ_MODULOS_NOMES && !MTZ_MODULOS_NOMES.representacao) MTZ_MODULOS_NOMES.representacao = 'Representação';
  } catch (e) { try { console.error('Representação, registro na central: ' + ((e && e.message) || e)); } catch (x) {} }
}
Representacao_registrarTipos_();

/** Último registro do chamado (histórico da Assistência ou mensagem da conversa), em ms. */
function Rep_ultimoRegistro_(c) {
  var ult = Rep_ms_(c.ABERTO_EM) || 0, id = Rep_s_(c.ID), osId = Rep_s_(c.OS_ID);
  Rep_lerAst_(AST_ABAS.EVENTOS).forEach(function (e) { var ent = Rep_up_(e.ENTIDADE), eid = Rep_s_(e.ENTIDADE_ID); if ((ent === 'CHAMADO' && eid === id) || (ent === 'OS' && osId && eid === osId)) { var m = Rep_ms_(e.EM); if (m !== null && m > ult) ult = m; } });
  Rep_ler_(REP_ABAS.MENSAGENS).forEach(function (m) { if (Rep_up_(m.REF_TIPO) === 'CHAMADO' && Rep_s_(m.REF_ID) === id) { var x = Rep_ms_(m.EM); if (x !== null && x > ult) ult = x; } });
  return ult;
}
function Rep_diasUteisEntre_(aMs, bMs) {
  var cfg = Ast_expediente_(), n = 0, dia = Ast_agora_(aMs).slice(0, 10), fim = Ast_agora_(bMs).slice(0, 10);
  for (var i = 0; i < 400 && dia < fim; i++) { dia = Ast_somarDias_(dia, 1); if (Ast_diaUtil_(dia, cfg)) n++; }
  return n;
}
/** Situação dos prazos agora: { aceite: [...], semRegistro: [...] } (rotina e central usam a mesma conta). */
function Rep_alertas_(agoraMs) {
  agoraMs = agoraMs || Date.now();
  var reps = {}, out = { aceite: [], semRegistro: [] };
  Rep_ler_(REP_ABAS.REPRESENTADAS).forEach(function (r) { reps[Rep_s_(r.ID)] = r; });
  Rep_lerAst_(AST_ABAS.SOLICITACOES).forEach(function (s) {
    var rep = reps[Rep_s_(s.REPRESENTADA_ID)];
    if (!rep || Rep_up_(s.SITUACAO) !== 'NOVA') return;
    out.aceite.push({ s: s, rep: rep, prazo: Rep_prazoAceite_(s, agoraMs, Rep_prazos_(rep)) });
  });
  Rep_lerAst_(AST_ABAS.CHAMADOS).forEach(function (c) {
    var rep = reps[Rep_s_(c.REPRESENTADA_ID)];
    if (!rep || AST_TERMINAIS.indexOf(Rep_up_(c.SITUACAO)) >= 0) return;
    var ult = Rep_ultimoRegistro_(c), dias = Rep_diasUteisEntre_(ult, agoraMs), lim = Rep_prazos_(rep).semRegistroDiasUteis;
    if (dias >= lim) out.semRegistro.push({ c: c, rep: rep, dias: dias, desde: Rep_agora_(ult) });
  });
  return out;
}

function Representacao_fontePendencias_(add, ctx) {
  if (!ctx || ctx.cliente || typeof Pend_item_ !== 'function') return;
  Representacao_registrarTipos_();
  if (typeof PEND_TIPOS === 'undefined' || !PEND_TIPOS.rep_aceite) return;
  if (typeof Pend_abaExiste_ === 'function' && !Pend_abaExiste_(REP_ABAS.REPRESENTADAS)) return;
  Ast_memoLimpar_(); Rep_memoLimpar_();
  var resp = Rep_responsaveis_(), gest = Ast_gestoresTecnica_(), a = Rep_alertas_(Date.now());
  a.aceite.forEach(function (x) {
    var s = x.s, p = x.prazo, venc = p.estado === 'VENCIDO', risco = p.estado === 'EM_RISCO';
    var base = { nome: Rep_s_(s.NUMERO), publico: 'GESTAO', responsavel: 'Responsável pela representação', clienteId: Rep_s_(s.CLIENTE_ID), dias: null, vencimento: Rep_br_(p.ate),
      detalhe: Rep_s_(x.rep.NOME) + ' · ' + Rep_s_(s.CLIENTE_NOME).slice(0, 60) + ' · ' + Rep_s_(s.EQUIPAMENTO_TEXTO).slice(0, 80) + '. ' + (p.texto || ''),
      oQueFazer: 'Abra Representação > Pedidos, toque no pedido ' + Rep_s_(s.NUMERO) + ' e escolha: aceitar (vira chamado), pedir complemento ou recusar com o motivo.', tela: { tipo: 'representacao', mod: 'representacao', id: Rep_s_(s.ID) },
      extra: { area: 'TECNICA', prazo: Rep_s_(p.ate).slice(0, 10) } };
    var tipo = venc ? 'rep_aceite_vencido' : risco ? 'rep_aceite' : 'rep_novo';
    add(Pend_item_(tipo, Object.assign({}, base, { id: 'REP:ACEITE:' + s.ID, paraUsuarios: venc ? resp.ids.concat(gest) : resp.ids, gravidade: venc || risco ? 'CRITICO' : 'ATENCAO',
      titulo: (venc ? 'Prazo de aceite VENCIDO: ' : risco ? 'Prazo de aceite em risco: ' : 'Pedido da representada: ') + Rep_s_(s.NUMERO) + ' (' + Rep_s_(x.rep.NOME) + ')' })));
  });
  a.semRegistro.forEach(function (x) {
    var c = x.c;
    add(Pend_item_('rep_sem_registro', { id: 'REP:SEMREG:' + c.ID, nome: Rep_s_(c.NUMERO), publico: 'GESTAO', paraUsuarios: resp.ids, responsavel: 'Responsável pela representação', clienteId: Rep_s_(c.CLIENTE_ID),
      gravidade: 'ATENCAO', dias: null, titulo: 'Chamado ' + Rep_s_(c.NUMERO) + ' (' + Rep_s_(x.rep.NOME) + ') sem registro há ' + x.dias + ' dias úteis',
      detalhe: 'Último registro em ' + Rep_br_(x.desde) + '. Situação: ' + (AST_SITUACOES[Rep_up_(c.SITUACAO)] || c.SITUACAO) + '. A representada acompanha pelo SGO+.',
      oQueFazer: 'Registre o andamento no chamado (Assistência técnica > Chamados > Registrar no histórico) ou responda na conversa (Representação > Conversas).', tela: { tipo: 'assistencia', mod: 'assistencia', id: Rep_s_(c.ID) },
      extra: { area: 'TECNICA' } }));
  });
}

/** Rotina (pela rotina da Assistência): e-mail uma vez a 75% do prazo de aceite, uma vez no vencido e uma vez por chamado parado. Nunca lança. */
function Representacao_rotina_(agoraMs) {
  var n = 0;
  try {
    Rep_memoLimpar_();
    if (!Rep_ler_(REP_ABAS.REPRESENTADAS).length) return 0;
    var resp = Rep_responsaveis_(), gest = Ast_gestoresTecnica_(), a = Rep_alertas_(agoraMs || Date.now()), agora = Ast_agora_();
    a.aceite.forEach(function (x) {
      var s = x.s, p = x.prazo;
      if (p.estado === 'VENCIDO' && !Rep_s_(s.ALERTA_VENCIDO_EM)) {
        Ast_atualizar_(AST_ABAS.SOLICITACOES, s.ID, { ALERTA_VENCIDO_EM: agora, ALERTA_RISCO_EM: Rep_s_(s.ALERTA_RISCO_EM) || agora });
        Ast_avisar_(resp.ids.concat(gest), 'REP_ACEITE_VENCIDO', 'Prazo de aceite VENCIDO: ' + s.NUMERO + ' (' + Rep_s_(x.rep.NOME) + ')', Rep_s_(s.CLIENTE_NOME) + ' · ' + Rep_s_(s.EQUIPAMENTO_TEXTO) + '\n' + p.texto + '. Trate em Representação > Pedidos; o item está na Caixa de decisões.', s.ID, { evento: 'RP07' });
        n++;
      } else if (p.estado === 'EM_RISCO' && !Rep_s_(s.ALERTA_RISCO_EM)) {
        Ast_atualizar_(AST_ABAS.SOLICITACOES, s.ID, { ALERTA_RISCO_EM: agora });
        Ast_avisar_(resp.ids, 'REP_ACEITE_RISCO', 'Prazo de aceite em risco: ' + s.NUMERO + ' (' + Rep_s_(x.rep.NOME) + ')', Rep_s_(s.CLIENTE_NOME) + ' · ' + Rep_s_(s.EQUIPAMENTO_TEXTO) + '\n' + p.texto + '. Aceite, peça complemento ou recuse em Representação > Pedidos.', s.ID, { evento: 'RP07' });
        n++;
      }
    });
    a.semRegistro.forEach(function (x) {
      var c = x.c, marca = Rep_s_(c.REP_SEM_REGISTRO_ALERTA_EM);
      if (marca && marca >= x.desde) return; // já avisado neste período parado
      Ast_atualizar_(AST_ABAS.CHAMADOS, c.ID, { REP_SEM_REGISTRO_ALERTA_EM: agora });
      Ast_avisar_(resp.ids, 'REP_SEM_REGISTRO', 'Chamado ' + c.NUMERO + ' (' + Rep_s_(x.rep.NOME) + ') sem registro há ' + x.dias + ' dias úteis', 'Último registro em ' + Rep_br_(x.desde) + '. Registre o andamento ou responda a representada. O item está na Caixa de decisões.', c.ID, { evento: 'RP08' });
      n++;
    });
  } catch (e) { try { console.error('Representação, rotina: ' + ((e && e.message) || e)); } catch (x) {} }
  return n;
}
