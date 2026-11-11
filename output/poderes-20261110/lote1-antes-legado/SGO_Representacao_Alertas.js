/****************************************************
 * MÓDULO REPRESENTAÇÃO — AVISO NA TELA, AVISO COM CIÊNCIA E WHATSAPP DOS PEDIDOS DA REPRESENTADA (03/11/2026)
 *
 * Pedido do dono (03/11/2026): "quando entrar pedido da Brasmedical, a equipe precisa saber na hora".
 *
 * 1) AVISO NA TELA (pop-up e som), para quem trata a fila de pedidos: a gestão da Assistência (Ast_nivelDe_ GESTAO:
 *    Administrador, Diretoria, Gestor da área Técnica, responsáveis da área Técnica), quem faz a triagem (Regras da
 *    assistência > Triagem) e quem responde pela representação (Regras da assistência > Representação). O SGO+ aberto em
 *    qualquer tela pergunta a cada 45 s (ação "alertasPedidos" da entrada do módulo; só a lista curta dos pedidos na fila,
 *    guardada 20 s na memória de curta duração) e mostra no canto: pedido novo, complemento respondido e pedido que chegou a
 *    75% do prazo de aceite sem aceite. "Dispensar" (ou "Abrir pedido") não mostra de novo o mesmo aviso para a mesma pessoa
 *    (propriedade REP_POP_DISP_<id da pessoa>, os 150 mais recentes). A tela nunca redesenha o que está aberto.
 *
 * 2) AVISO COM CIÊNCIA na central de Avisos (AVS_AVISOS, "Li e estou ciente"), para quem responde pela representação (sem
 *    ninguém marcado, quem faz a triagem; Rep_responsaveis_): um ao entrar o pedido e outro a 75% do prazo de aceite. Fica em
 *    Avisos até a ciência; quando o pedido é aceito, recusado ou cancelado, o aviso que ainda não teve ciência é arquivado
 *    (não cobra mais), com o motivo. Um por pedido e por marco (ATEC_SOLICITACOES.AVISO_CIENCIA_ID e AVISO_RISCO_ID).
 *
 * 3) WHATSAPP E E-MAIL pela fila dos avisos da gestão (SGO_Avisos_Gestao.js, modelo sgo_gestao_acao já cadastrado na
 *    Meta): RP01/RP02 (pedido novo) e RP07 (75% e vencido) também vão para quem responde pela representação, mesmo quem não
 *    é da gestão, só no expediente e em dia útil (fora dele, na abertura do próximo expediente), na hora (sem esperar o
 *    agrupamento de 30 minutos), um por pedido e marco por pessoa, com teto diário (AVG_REP_TETO_DIA). O que ainda está na
 *    fila sai como resolvido, sem mensagem, se o pedido foi aceito, recusado ou cancelado antes (RESOLVE_POR = REPSOL:<id>).
 * Nenhuma função devolve Date cru. Nunca lança para quem chamou (aviso não derruba o pedido).
 ****************************************************/

var REP_POP_INTERVALO_SEG = 45;
var REP_POP_CACHE = 'REP_POP_V1';
var REP_POP_CACHE_SEG = 20;
var REP_POP_DISP_MAX = 150;

/** Quem recebe o aviso na tela: gestão da Assistência, triagem e responsáveis pela representação. { pode, motivo }. */
function RepAl_podeReceber_(eu) {
  if (!eu || eu.externo || eu.cliente || !eu.interno) return { pode: false, motivo: 'O aviso de pedido novo é da equipe que trata a fila de pedidos da Metrolabs.' };
  if (eu.gestao) return { pode: true, motivo: 'gestão da Assistência técnica' };
  // a lista de responsáveis e de triagem muda pouco: a resposta de cada pessoa fica 5 minutos na memória de curta duração
  var cache = null, k = 'REP_POP_PODE_' + Rep_s_(eu.id);
  try { cache = CacheService.getScriptCache(); var c = cache.get(k); if (c) return JSON.parse(c); } catch (e0) { cache = null; }
  var r = { pode: false, motivo: 'O aviso de pedido novo vai para a gestão da Assistência, para quem faz a triagem e para quem responde pela representação (Regras da assistência). Você vê os pedidos em Representação > Pedidos.' };
  if (Rep_responsaveis_().ids.indexOf(Rep_s_(eu.id)) >= 0) r = { pode: true, motivo: 'responsável pela representação' };
  else { try { if (typeof AstC_ehDaTriagem_ === 'function' && AstC_ehDaTriagem_(eu)) r = { pode: true, motivo: 'responsável pela triagem' }; } catch (e) {} }
  try { if (cache) cache.put(k, JSON.stringify(r), 300); } catch (e1) {}
  return r;
}

/** Marco do pedido agora: RISCO (75% ou mais do prazo), RESP<quando> (complemento respondido) ou NOVO. */
function RepAl_marco_(s, p, prazos) {
  if (p.estado === 'VENCIDO' || p.estado === 'EM_RISCO' || (Number(p.fracao) || 0) >= (Number(prazos.alertaFracao) || 0.75)) return 'RISCO';
  if (Rep_s_(s.COMPLEMENTO_RESPONDIDO_EM)) return 'RESP' + Rep_s_(s.COMPLEMENTO_RESPONDIDO_EM).replace(/\D/g, '').slice(0, 14);
  return 'NOVO';
}
/** Texto do tempo que falta para o prazo de aceite (horas úteis do expediente). */
function RepAl_resta_(p, agoraMs) {
  var ateMs = Rep_ms_(p.ate);
  if (ateMs === null) return '';
  if (agoraMs > ateMs) return 'Prazo de aceite vencido há ' + Ast_duracaoTxt_(Ast_minUteisEntre_(ateMs, agoraMs)) + ' úteis (era até ' + Rep_br_(p.ate) + ')';
  return 'Faltam ' + Ast_duracaoTxt_(Ast_minUteisEntre_(agoraMs, ateMs)) + ' úteis para o prazo de aceite (até ' + Rep_br_(p.ate) + ')';
}
/** Pedidos da representada na fila (só NOVA), com o marco e o prazo. Guardado 20 s (todo mundo pergunta a cada 45 s). */
function RepAl_itensAbertos_(agoraMs) {
  var cache = null;
  try { cache = CacheService.getScriptCache(); var c = cache.get(REP_POP_CACHE); if (c) return JSON.parse(c); } catch (e) { cache = null; }
  agoraMs = agoraMs || Date.now();
  var reps = {}, l = [];
  Rep_ler_(REP_ABAS.REPRESENTADAS).forEach(function (r) { reps[Rep_s_(r.ID)] = r; });
  Rep_lerAst_(AST_ABAS.SOLICITACOES).forEach(function (s) {
    var rep = reps[Rep_s_(s.REPRESENTADA_ID)];
    if (!rep || Rep_up_(s.SITUACAO) !== 'NOVA') return;
    var pz = Rep_prazos_(rep), p = Rep_prazoAceite_(s, agoraMs, pz), marco = RepAl_marco_(s, p, pz);
    l.push({ chave: Rep_s_(s.ID) + '|' + marco, id: Rep_s_(s.ID), numero: Rep_s_(s.NUMERO), marco: marco === 'RISCO' ? 'RISCO' : /^RESP/.test(marco) ? 'RESPOSTA' : 'NOVO',
      titulo: (marco === 'RISCO' ? (p.estado === 'VENCIDO' ? 'Prazo de aceite VENCIDO' : 'Prazo de aceite em risco (75%)') : /^RESP/.test(marco) ? 'Complemento respondido' : 'Pedido novo da representada') + ': ' + Rep_s_(s.NUMERO),
      representada: Rep_s_(rep.NOME), cliente: Rep_s_(s.CLIENTE_NOME), equipamento: Rep_s_(s.EQUIPAMENTO_TEXTO), parado: Rep_up_(s.PARADA) === 'TOTAL', estado: p.estado,
      resta: RepAl_resta_(p, agoraMs), ate: Rep_br_(p.ate), criadoEm: Rep_s_(s.CRIADO_EM) });
  });
  l.sort(function (a, b) { return a.criadoEm.localeCompare(b.criadoEm); });
  try { if (cache) cache.put(REP_POP_CACHE, JSON.stringify(l), REP_POP_CACHE_SEG); } catch (e) {}
  return l;
}
function RepAl_invalidar_() { try { CacheService.getScriptCache().remove(REP_POP_CACHE); } catch (e) {} }
function RepAl_dispensados_(uid) {
  try { return Rep_json_(PropertiesService.getScriptProperties().getProperty('REP_POP_DISP_' + Rep_s_(uid)), []) || []; } catch (e) { return []; }
}
/** Marca o aviso como visto por esta pessoa (dispensado ou aberto). Dispensar o de 75% também tira o de pedido novo. */
function RepAl_dispensar_(uid, chave) {
  chave = Rep_s_(chave).slice(0, 80);
  if (!/^[^|]{1,60}\|[A-Z0-9]{3,20}$/.test(chave)) throw Rep_erro_('CHAVE', 'Não foi possível dispensar o aviso: a identificação veio incompleta. Atualize a página (F5); o aviso volta e pode ser dispensado de novo.');
  var l = RepAl_dispensados_(uid).filter(function (x) { return x !== chave; });
  l.push(chave);
  if (/\|RISCO$/.test(chave)) { var n = chave.split('|')[0] + '|NOVO'; if (l.indexOf(n) < 0) l.push(n); }
  try { PropertiesService.getScriptProperties().setProperty('REP_POP_DISP_' + Rep_s_(uid), JSON.stringify(l.slice(-REP_POP_DISP_MAX))); } catch (e) { throw Rep_erro_('FALHOU', 'Não foi possível guardar que você dispensou o aviso (' + ((e && e.message) || e) + '). Ele pode aparecer de novo; tente dispensar mais tarde.'); }
  return l.length;
}
/** Ação interna "alertasPedidos": lista curta para o aviso na tela. Sem acesso: { ligado: false } (a tela para de perguntar). */
function RepI_alertasPedidos_(eu) {
  var p = RepAl_podeReceber_(eu);
  if (!p.pode) return { ligado: false, motivo: p.motivo, itens: [] };
  var disp = {};
  RepAl_dispensados_(eu.id).forEach(function (k) { disp[k] = true; });
  var porPedido = {};
  RepAl_itensAbertos_(Date.now()).forEach(function (x) {
    if (disp[x.chave] || (x.marco === 'NOVO' && disp[x.id + '|RISCO'])) return;
    porPedido[x.id] = x; // um aviso por pedido (o marco de agora)
  });
  var itens = Object.keys(porPedido).map(function (k) { return porPedido[k]; });
  return { ligado: true, motivo: p.motivo, intervaloSeg: REP_POP_INTERVALO_SEG, itens: itens, agora: Rep_agora_() };
}
function RepI_dispensarAlertaPedido_(eu, d) {
  var p = RepAl_podeReceber_(eu);
  if (!p.pode) throw Rep_erro_('PERFIL', 'Não foi possível dispensar: ' + p.motivo);
  RepAl_dispensar_(eu.id, d && d.chave);
  return { message: 'Aviso dispensado. O pedido continua em Representação > Pedidos até ser tratado.' };
}

// ------------------------------------------------------------
// AVISO COM CIÊNCIA (central de Avisos)
// ------------------------------------------------------------
/** Cria o aviso com ciência do marco (NOVO ou RISCO) para quem responde pela representação. Um por pedido e marco. Devolve o id ou ''. */
function Rep_avisoCiencia_(s, marco, titulo, texto) {
  try {
    if (typeof Avisos_abas_ !== 'function' || !s || !Rep_s_(s.ID)) return '';
    var col = marco === 'RISCO' ? 'AVISO_RISCO_ID' : 'AVISO_CIENCIA_ID';
    var atual = Ast_porId_(AST_ABAS.SOLICITACOES, s.ID) || s;
    if (Rep_s_(atual[col])) return '';
    if (['NOVA', 'COMPLEMENTO'].indexOf(Rep_up_(atual.SITUACAO)) < 0) return '';
    var ids = Rep_responsaveis_().ids;
    if (!ids.length) return '';
    try { if (typeof Avisos_garantirAbas_ === 'function') Avisos_garantirAbas_(); } catch (e0) {}
    var aba = Avisos_abas_().AVISOS, ref = 'REP:' + Rep_s_(s.ID) + ':' + marco, agora = typeof Avisos_agora_ === 'function' ? Avisos_agora_() : Rep_agora_();
    var ja = null;
    try { ja = (SGO_DATA.getAll(aba) || []).filter(function (a) { return Rep_s_(a.PUBLICADO_POR_ID) === ref; })[0] || null; } catch (e1) { ja = null; }
    var reg = ja || SGO_DATA.insert(aba, { TITULO: Rep_txt_(titulo, 160), TEXTO: Rep_txt_(texto, 4000), IMPORTANCIA: marco === 'RISCO' ? 'Urgente' : 'Importante', PUBLICO_TIPO: 'PESSOAS',
      PUBLICO_PERFIS: '', PUBLICO_IDS: ids.join(','), DESTINATARIOS_IDS: ids.join(','), PRAZO_CIENCIA: '', SITUACAO: 'PUBLICADO', PUBLICADO_POR_ID: ref,
      PUBLICADO_POR_NOME: 'SGO+ (Representação)', PUBLICADO_EM: agora, ARQUIVADO_EM: '', ARQUIVADO_POR_NOME: '', QTD_REENVIOS: 0, ULTIMO_REENVIO_EM: '', QTD_ANEXOS: 0 });
    var campos = {}; campos[col] = Rep_s_(reg && reg.ID);
    Ast_atualizar_(AST_ABAS.SOLICITACOES, s.ID, campos);
    if (typeof SGO_Pendencias_invalidar_ === 'function') { try { SGO_Pendencias_invalidar_(); } catch (e2) {} }
    return Rep_s_(reg && reg.ID);
  } catch (e) { try { console.error('Representação, aviso com ciência: ' + ((e && e.message) || e)); } catch (x) {} return ''; }
}
/**
 * O pedido saiu da fila (aceito, recusado ou cancelado): arquiva os avisos com ciência ainda publicados (quem não leu não é
 * mais cobrado; quem leu continua vendo na lista), limpa o aviso na tela. Nunca lança.
 */
function Rep_aoTratarSolicitacao_(s, situacaoTexto) {
  try {
    RepAl_invalidar_();
    if (!s || typeof Avisos_abas_ !== 'function') return 0;
    var atual = Ast_porId_(AST_ABAS.SOLICITACOES, s.ID) || s, n = 0, aba = Avisos_abas_().AVISOS, agora = typeof Avisos_agora_ === 'function' ? Avisos_agora_() : Rep_agora_();
    [Rep_s_(atual.AVISO_CIENCIA_ID), Rep_s_(atual.AVISO_RISCO_ID)].filter(Boolean).forEach(function (id) {
      var a = SGO_DATA.getById(aba, id);
      if (!a || Rep_up_(a.SITUACAO) === 'ARQUIVADO') return;
      SGO_DATA.update(aba, id, { SITUACAO: 'ARQUIVADO', ARQUIVADO_EM: agora, ARQUIVADO_POR_NOME: Rep_txt_('SGO+ (pedido ' + Rep_s_(atual.NUMERO) + ' ' + (situacaoTexto || 'tratado') + ')', 120) });
      n++;
    });
    if (n && typeof SGO_Pendencias_invalidar_ === 'function') { try { SGO_Pendencias_invalidar_(); } catch (e2) {} }
    return n;
  } catch (e) { return 0; }
}

// ------------------------------------------------------------
// GANCHOS DOS AVISOS DA GESTÃO (SGO_Avisos_Gestao.js)
// ------------------------------------------------------------
/** Quem responde pela representação (para o WhatsApp dos eventos RP01, RP02 e RP07, mesmo sem ser da gestão). */
function Rep_responsaveisWhatsapp_() { try { return Rep_responsaveis_().ids.slice(); } catch (e) { return []; } }
/** O pedido já saiu da fila? Devolve o texto da resolução ('' = continua na fila). */
function Rep_solicitacaoTratada_(id) {
  try {
    var s = SGO_DATA.getById(AST_ABAS.SOLICITACOES, id);
    if (!s) return 'O pedido não existe mais na fila.';
    var sit = Rep_up_(s.SITUACAO);
    if (sit === 'NOVA' || sit === 'COMPLEMENTO') return '';
    return 'O pedido ' + Rep_s_(s.NUMERO) + ' já foi ' + ({ CONVERTIDA: 'aceito (chamado ' + Rep_s_(s.CHAMADO_NUMERO) + ')', DESCARTADA: 'recusado', CANCELADA: 'cancelado pela representada' }[sit] || 'tratado') + '.';
  } catch (e) { return ''; }
}
