/****************************************************
 * ASSISTENTE DO PONTO — TELAS, PÁGINA DO LINK, PENDÊNCIAS E RESUMO A4 (21/10/2026)
 *
 * Telas (JS_Ponto.html): uma porta só, Ponto_api(sessionId, acao, dados). O servidor confere o papel em toda
 * chamada (SGO_Ponto_Config.js › Ponto_eu_). Página do link (PontoPagina.html, ?ponto=<token>, sem login):
 * Ponto_paginaAbrir(token) e Ponto_paginaResponder(token, acao, dados) — mostram só o primeiro nome, o dia, a
 * marcação e o horário previsto; nada de cliente, telefone, e-mail, valor ou documento.
 ****************************************************/

var PONTO_MSG_INVALIDO = 'Este link não é válido. Use o botão da mensagem mais recente do assistente do ponto. Se continuar, fale com o RH.';

// ------------------------------------------------------------
// PÁGINA DO LINK (sem login)
// ------------------------------------------------------------
/** doGet com ?ponto=<token>: página leve de confirmação. */
function Ponto_pagina_(token) {
  var t = HtmlService.createTemplateFromFile('PontoPagina');
  t.token = String(token || '').replace(/[^A-Za-z0-9._-]/g, '').slice(0, 120);
  return t.evaluate()
    .setTitle('Assistente do ponto — Metrolabs')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, viewport-fit=cover')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.DEFAULT);
}

function Ponto_msgToken_(t) {
  if (t.motivo === 'VENCIDO') return 'Este link valia só para ' + Pto_br_(t.dia) + ' e já venceu. Se você esqueceu de bater o ponto nesse dia, peça o ajuste no SGO+, em Assistente do ponto > Meus lembretes > Pedir ajuste ao RH, ou fale com o RH.';
  if (t.motivo === 'FUTURO') return 'Este link vale só para ' + Pto_br_(t.dia) + '. Abra de novo nesse dia.';
  return PONTO_MSG_INVALIDO;
}

/** Resolve o token na marcação (ou na pré-visualização). { ok, t, row, u, previa } | { ok:false, motivo, mensagem }. */
function Ponto_resolverToken_(token, quando) {
  var t = Ponto_lerToken_(token, quando);
  if (!t.ok) return { ok: false, motivo: t.motivo, mensagem: Ponto_msgToken_(t) };
  var us = Ponto_usuarios_(), row = null, u = null, marc = '';
  if (t.previa) {
    var pv = Pto_json_(CacheService.getScriptCache().get('PONTO_PREVIA_' + t.nonce), null);
    if (!pv || pv.dia !== t.dia) return { ok: false, motivo: 'INVALIDO', mensagem: 'A pré-visualização vale por 1 hora. Gere outra em Assistente do ponto > Configuração.' };
    u = us[pv.uid]; marc = pv.marc;
    row = { ID: '', USUARIO_ID: pv.uid, DIA: t.dia, MARCACAO: marc, PREVISTO: pv.previsto || '', SITUACAO: 'LEMBRADO' };
  } else {
    row = Ponto_marcacaoPorToken_(t.nonce);
    if (!row || row.DIA !== t.dia) return { ok: false, motivo: 'INVALIDO', mensagem: PONTO_MSG_INVALIDO };
    u = us[Pto_s_(row.USUARIO_ID)]; marc = Pto_up_(row.MARCACAO);
  }
  if (!u || !u.ativo || !PONTO_MARC[marc]) return { ok: false, motivo: 'INVALIDO', mensagem: PONTO_MSG_INVALIDO };
  return { ok: true, t: t, row: row, u: u, marc: marc, previa: !!t.previa };
}

/** O que a página mostra: só o primeiro nome, o dia, a marcação, o horário previsto e a situação. */
function Ponto_estadoPagina_(x) {
  var r = x.row, def = PONTO_MARC[x.marc], sit = Pto_up_(r.SITUACAO);
  var aj = r.AJUSTE_ID ? SGO_DATA.getById(PONTO_ABAS.AJUSTES, r.AJUSTE_ID) : null;
  return { ok: true, previa: x.previa, primeiroNome: Pto_primeiroNome_(x.u.nome), marcacao: x.marc, rotulo: def.rotulo, botao: def.botao, rotuloEsqueci: def.esqueci,
    dia: Pto_br_(x.t.dia), diaSemana: PONTO_DIAS_SEMANA[Pto_semanaDe_(x.t.dia)], previsto: Pto_normHora_(r.PREVISTO), situacao: sit,
    usado: sit === 'CONFIRMADO' || sit === 'ESQUECI', confirmadoAs: Pto_horaDe_(r.CONFIRMADO_EM), horarioInformado: Pto_normHora_(r.HORARIO_INFORMADO),
    ajuste: aj ? { codigo: Pto_s_(aj.CODIGO), situacao: Pto_up_(aj.SITUACAO), situacaoTexto: PONTO_AJ_SIT[Pto_up_(aj.SITUACAO)] || '' } : null, rodape: PONTO_RODAPE };
}

/** Página: abre o link. Nunca lança. */
function Ponto_paginaAbrir(token) { return Ponto_paginaAbrirExec_(token, new Date()); }
function Ponto_paginaAbrirExec_(token, quando) {
  try {
    var x = Ponto_resolverToken_(token, quando);
    if (!x.ok) return { ok: false, motivo: x.motivo, mensagem: x.mensagem };
    return Ponto_estadoPagina_(x);
  } catch (e) { return { ok: false, motivo: 'ERRO', mensagem: 'Não foi possível abrir agora. Tente de novo em instantes; se continuar, fale com o RH.' }; }
}

/**
 * Página: "Já bati" (CONFIRMAR) ou "Esqueci de bater" (ESQUECI, dados = { horario, justificativa }). Uso único: depois de
 * confirmar ou pedir o ajuste, o link só mostra a situação. Repetir (a conexão do celular caiu) não duplica nada.
 */
function Ponto_paginaResponder(token, acao, dados) { return Ponto_paginaResponderExec_(token, acao, dados, new Date()); }
function Ponto_paginaResponderExec_(token, acao, dados, quando) {
  try {
    var x = Ponto_resolverToken_(token, quando);
    if (!x.ok) return { ok: false, motivo: x.motivo, mensagem: x.mensagem };
    acao = Pto_up_(acao);
    if (['CONFIRMAR', 'ESQUECI'].indexOf(acao) < 0) return { ok: false, mensagem: 'Escolha uma das opções da página.' };
    var fim = function (o) { var e = Ponto_estadoPagina_(x); return Object.assign(e, o); };
    if (x.previa) return fim({ gravado: false, mensagem: 'Pré-visualização: nada foi gravado. É assim que o colaborador vê a página.' });
    return Pto_comTrava_(function () {
      var row = SGO_DATA.getById(PONTO_ABAS.MARCACOES, x.row.ID) || x.row;
      row.DIA = Pto_dia_(row.DIA);
      x.row = row;
      var sit = Pto_up_(row.SITUACAO), def = PONTO_MARC[x.marc], agoraIso = Pto_agoraIso_(quando);
      if (sit === 'CONFIRMADO') return fim({ gravado: false, usado: true, mensagem: 'Este link já foi usado: confirmado às ' + Pto_horaDe_(row.CONFIRMADO_EM) + '. Obrigado.' });
      if (sit === 'ESQUECI') return fim({ gravado: false, usado: true, mensagem: 'Este link já foi usado: o pedido de ajuste desta marcação já está com o RH.' });
      if (acao === 'CONFIRMAR') {
        SGO_DATA.update(PONTO_ABAS.MARCACOES, row.ID, { SITUACAO: 'CONFIRMADO', CONFIRMADO_EM: agoraIso, CONFIRMADO_POR: 'LINK', ATUALIZADO_EM: agoraIso });
        x.row = SGO_DATA.getById(PONTO_ABAS.MARCACOES, row.ID); x.row.DIA = Pto_dia_(x.row.DIA);
        return fim({ gravado: true, mensagem: def.rotulo + ' confirmada às ' + Pto_horaDe_(agoraIso) + '. Obrigado. Este link não serve mais (uso único).' });
      }
      var d = dados || {};
      var v = Ponto_validarEsqueci_(x.t.dia, d, quando);
      if (v.erro) return { ok: false, mensagem: v.erro };
      var aj = Ponto_criarAjuste_(x.u, x.t.dia, x.marc, v.hora, v.just, 'LINK', row, null);
      x.row = SGO_DATA.getById(PONTO_ABAS.MARCACOES, row.ID); x.row.DIA = Pto_dia_(x.row.DIA);
      return fim({ gravado: true, mensagem: 'Pedido de ajuste enviado ao RH (' + aj.CODIGO + '). O RH lança no ponto e a resposta aparece no SGO+ e no seu e-mail.' });
    });
  } catch (e) { return { ok: false, mensagem: 'Não foi possível registrar agora. Tente de novo em instantes (não duplica); se continuar, fale com o RH.' }; }
}

function Ponto_validarEsqueci_(dia, d, quando) {
  var hora = Pto_normHora_(d.horario), just = Pto_texto_(d.justificativa, 200);
  if (!hora) return { erro: 'Informe o horário (horas e minutos).' };
  if (Pto_ms_(dia, Pto_min_(hora)) > (quando || new Date()).getTime() + 5 * 60000) return { erro: 'O horário informado ainda não chegou. Informe o horário em que você bateu (ou deveria ter batido) o ponto.' };
  if (just.replace(/\s/g, '').length < 5) return { erro: 'Escreva uma frase curta contando o que aconteceu (pelo menos 5 letras).' };
  return { hora: hora, just: just };
}

// ------------------------------------------------------------
// PEDIDO DE AJUSTE AO RH
// ------------------------------------------------------------
/** Cria o pedido (e a marcação, se não houver), avisa o RH no sistema (e-mail no expediente) e, se ligado, cria a atividade do RH. */
function Ponto_criarAjuste_(u, dia, marc, hora, just, origem, row, criadoPor) {
  var def = PONTO_MARC[marc], cfg = Ponto_cfg_(), us = Ponto_usuarios_(), agoraIso = Pto_agoraIso_(new Date());
  var codigo = 'AJ-' + dia.replace(/-/g, '') + '-' + def.cod + '-' + Utilities.getUuid().replace(/-/g, '').slice(0, 4).toUpperCase();
  var aj = SGO_DATA.insert(PONTO_ABAS.AJUSTES, { CODIGO: codigo, USUARIO_ID: u.id, USUARIO_NOME: u.nome, DIA: dia, MARCACAO: marc, HORARIO_INFORMADO: hora,
    JUSTIFICATIVA: just, EVIDENCIA: Pto_texto_(Ponto_evidencia_(u.id, dia), 1500), ORIGEM: origem, SITUACAO: 'PENDENTE', OBSERVACAO: '', TRATADO_POR_ID: '', TRATADO_POR_NOME: '',
    TRATADO_EM: '', MARCACAO_ID: row && row.ID ? row.ID : '', ATIVIDADE_ID: '', CRIADO_POR_ID: Pto_s_(criadoPor || u.id), ATUALIZADO_EM: agoraIso });
  var campos = { SITUACAO: 'ESQUECI', HORARIO_INFORMADO: hora, JUSTIFICATIVA: just, AJUSTE_ID: aj.ID, CONFIRMADO_EM: '', ATUALIZADO_EM: agoraIso };
  var marcId = row && row.ID;
  if (marcId) SGO_DATA.update(PONTO_ABAS.MARCACOES, marcId, campos);
  else {
    marcId = SGO_DATA.insert(PONTO_ABAS.MARCACOES, Object.assign({ USUARIO_ID: u.id, USUARIO_NOME: u.nome, DIA: dia, MARCACAO: marc, PREVISTO: '', CANAL: 'NENHUM', OBS: 'pedido feito pela tela, sem lembrete' }, campos)).ID;
    SGO_DATA.update(PONTO_ABAS.AJUSTES, aj.ID, { MARCACAO_ID: marcId });
  }
  var titulo = 'Pedido de ajuste do ponto: ' + u.nome;
  var texto = def.rotulo + ' de ' + Pto_br_(dia) + ', horário informado ' + hora + ' (' + codigo + '). Motivo: ' + just + '\nTrate em Assistente do ponto > Pedidos de ajuste.';
  Ponto_destinosRh_(cfg, us).forEach(function (id) { if (id !== u.id) Ponto_avisar_(id, 'AJUSTE_NOVO', titulo, texto, { tipo: 'AJUSTE', id: aj.ID }, true); });
  if (cfg.atividadeRh) {
    var atv = Ponto_criarAtividadeRh_(aj, u, def, cfg, us);
    if (atv) SGO_DATA.update(PONTO_ABAS.AJUSTES, aj.ID, { ATIVIDADE_ID: atv });
  }
  return SGO_DATA.getById(PONTO_ABAS.AJUSTES, aj.ID);
}

/** Atividade do RH em Minhas atividades (restrita, sem dado além do necessário). Nunca lança: o pedido já existe. */
function Ponto_criarAtividadeRh_(aj, u, def, cfg, us) {
  try {
    if (typeof Atividades_apiCriar !== 'function') return '';
    var rh = Ponto_rhIds_(cfg, us).filter(function (id) { return id !== u.id; });
    var resp = rh.filter(function (id) { return cfg.rhIds.indexOf(id) >= 0; })[0] || rh[0];
    if (!resp) return '';
    if (typeof Atividades_garantirAbas_ === 'function') Atividades_garantirAbas_();
    var hoje = Pto_partes_(new Date()).dia;
    var dia2 = typeof Ges_somarDiasUteis_ === 'function' ? Ges_somarDiasUteis_(hoje, PONTO_AJUSTE_PARADO_DU, typeof SGO_expediente_ === 'function' ? SGO_expediente_() : null) : Pto_somarDias_(hoje, 2);
    var payload = { titulo: 'Ajuste do ponto: ' + u.nome + ' — ' + def.curto + ' de ' + Pto_curto_(Pto_dia_(aj.DIA)), prazo: dia2 + 'T17:00', prioridade: 'Normal', responsavelId: resp,
      descricao: 'Pedido ' + aj.CODIGO + ': ' + def.rotulo + ' de ' + Pto_br_(Pto_dia_(aj.DIA)) + ', horário informado ' + Pto_normHora_(aj.HORARIO_INFORMADO) + '.\nLance no relógio ou no sistema de ponto e marque em Assistente do ponto > Pedidos de ajuste (a atividade é concluída sozinha).',
      modulo: 'ponto', moduloNome: 'Assistente do ponto', porQue: 'O colaborador informou que esqueceu de bater o ponto.', onde: 'Relógio ou sistema de ponto', como: 'Assistente do ponto > Pedidos de ajuste', restrita: 'SIM' };
    var anterior = typeof ATV_PONTE_CTX !== 'undefined' ? ATV_PONTE_CTX : null, tk = 'PONTO-' + Utilities.getUuid();
    ATV_PONTE_CTX = { token: tk, eu: { id: 'PONTO', usuario: 'sistema', nome: 'Assistente do ponto', perfil: 'SISTEMA', gestor: true, sistema: 'SGO+' } };
    var r;
    try { r = Atividades_apiCriar(tk, payload); } finally { ATV_PONTE_CTX = anterior; }
    return r && r.ok && r.item ? Pto_s_(r.item.ID) : '';
  } catch (e) { console.error('Assistente do ponto, atividade do RH: ' + ((e && e.message) || e)); return ''; }
}
function Ponto_concluirAtividade_(id, texto) {
  if (!id || typeof Atividades_apiMudarSituacao !== 'function') return;
  try {
    var anterior = typeof ATV_PONTE_CTX !== 'undefined' ? ATV_PONTE_CTX : null, tk = 'PONTO-' + Utilities.getUuid();
    ATV_PONTE_CTX = { token: tk, eu: { id: 'PONTO', usuario: 'sistema', nome: 'Assistente do ponto', perfil: 'SISTEMA', gestor: true, sistema: 'SGO+' } };
    try { Atividades_apiMudarSituacao(tk, { id: id, situacao: 'Concluída', observacao: Pto_s_(texto).slice(0, 1500) }); } finally { ATV_PONTE_CTX = anterior; }
  } catch (e) {}
}

function Ponto_ajusteTela_(a, us) {
  var dia = Pto_dia_(a.DIA), m = Pto_up_(a.MARCACAO), sit = Pto_up_(a.SITUACAO);
  return { id: Pto_s_(a.ID), codigo: Pto_s_(a.CODIGO), usuarioId: Pto_s_(a.USUARIO_ID), pessoa: (us[Pto_s_(a.USUARIO_ID)] || {}).nome || Pto_s_(a.USUARIO_NOME) || '(usuário removido)',
    dia: dia, diaBr: Pto_br_(dia), marcacao: m, rotulo: (PONTO_MARC[m] || {}).rotulo || m, horario: Pto_normHora_(a.HORARIO_INFORMADO), justificativa: Pto_s_(a.JUSTIFICATIVA),
    evidencia: Pto_s_(a.EVIDENCIA), origem: Pto_up_(a.ORIGEM) === 'LINK' ? 'pelo link do lembrete' : 'pela tela do SGO+', situacao: sit, situacaoTexto: PONTO_AJ_SIT[sit] || sit,
    observacao: Pto_s_(a.OBSERVACAO), tratadoPor: Pto_s_(a.TRATADO_POR_NOME), tratadoEm: Pto_s_(a.TRATADO_EM).replace('T', ' ').slice(0, 16), criadoEm: Pto_s_(a.CRIADO_EM).replace('T', ' ').slice(0, 16) };
}

// ------------------------------------------------------------
// PAINÉIS
// ------------------------------------------------------------
function Ponto_marcTela_(r) {
  var m = Pto_up_(r.MARCACAO), sit = Pto_up_(r.SITUACAO);
  return { id: Pto_s_(r.ID), dia: Pto_dia_(r.DIA), marcacao: m, rotulo: (PONTO_MARC[m] || {}).rotulo || m, previsto: Pto_normHora_(r.PREVISTO), situacao: sit, situacaoTexto: PONTO_SIT[sit] || sit,
    canal: Pto_up_(r.CANAL), confirmadoAs: Pto_horaDe_(r.CONFIRMADO_EM), confirmadoPor: Pto_up_(r.CONFIRMADO_POR), horarioInformado: Pto_normHora_(r.HORARIO_INFORMADO), obs: Pto_s_(r.OBS),
    envioMotivo: Pto_s_(r.ENVIO_MOTIVO), lembreteAs: Pto_horaDe_(r.LEMBRETE_EM) };
}
function Ponto_jornadaTexto_(j) {
  return 'entrada ' + Pto_hhmm_(j.entrada) + (j.almoco === null ? ', sem intervalo registrado' : ', almoço ' + Pto_hhmm_(j.almoco) + ' (' + j.retorno_min + ' min)') + ', saída ' + Pto_hhmm_(j.saida);
}

/** Painel do dia: cada pessoa visível com a situação de cada marcação. */
function Ponto_painelDia_(eu, dia) {
  var cfg = Ponto_cfg_(), us = Ponto_usuarios_(), pessoas = Ponto_pessoas_(), piloto = Ponto_pilotoCfg_(), vis = Ponto_idsVisiveis_(eu, us);
  var M = Ponto_indice_(function (r, d) { return d === dia; }), linhas = [], conta = { lembradas: 0, confirmadas: 0, esqueci: 0, pendentes: 0, dispensadas: 0, semCanal: 0 };
  Object.keys(us).forEach(function (id) {
    var u = us[id];
    if (vis && vis.indexOf(id) < 0) return;
    var fora = Ponto_motivoFora_(u, pessoas[id], piloto, cfg);
    var marcas = PONTO_ORDEM.map(function (m) { var r = M[Ponto_chave_(id, dia, m)]; return r ? Ponto_marcTela_(r) : null; });
    if (fora && !marcas.some(Boolean)) return;
    marcas.forEach(function (x) {
      if (!x) return;
      if (x.situacao === 'LEMBRADO' || x.situacao === 'CONFIRMADO' || x.situacao === 'ESQUECI' || x.situacao === 'NAO_CONFIRMADO') conta.lembradas++;
      if (x.situacao === 'CONFIRMADO') conta.confirmadas++;
      if (x.situacao === 'ESQUECI') conta.esqueci++;
      if (x.situacao === 'LEMBRADO') conta.pendentes++;
      if (x.situacao === 'DISPENSADO') conta.dispensadas++;
      if (x.situacao === 'NAO_ENVIADO') conta.semCanal++;
    });
    linhas.push({ usuarioId: id, pessoa: u.nome, area: u.areaNome, jornada: Ponto_jornadaTexto_(Ponto_jornada_(cfg, pessoas[id], dia)), fora: fora, foraTexto: fora ? PONTO_FORA_TEXTO[fora] : '', marcacoes: marcas });
  });
  linhas.sort(function (a, b) { return a.pessoa.localeCompare(b.pessoa, 'pt-BR'); });
  return { dia: dia, diaBr: Pto_br_(dia), diaSemana: PONTO_DIAS_SEMANA[Pto_semanaDe_(dia)], motivoDia: Pto_motivoDia_(dia), marcacoesLembradas: cfg.marcacoes, linhas: linhas, conta: conta };
}

/** Painel do mês por pessoa (só as visíveis). */
function Ponto_painelMes_(eu, mes) {
  var us = Ponto_usuarios_(), vis = Ponto_idsVisiveis_(eu, us), por = {};
  var linha = function (uid, nome) { return por[uid] = por[uid] || { usuarioId: uid, pessoa: (us[uid] || {}).nome || nome || '(usuário removido)', vinculo: (us[uid] || {}).vinculo || '', lembradas: 0, confirmadas: 0, esqueci: 0, naoConfirmadas: 0, dispensadas: 0, naoEnviadas: 0, ajPendentes: 0, ajLancados: 0, ajRecusados: 0 }; };
  Pto_ler_(PONTO_ABAS.MARCACOES).forEach(function (r) {
    var uid = Pto_s_(r.USUARIO_ID), dia = Pto_dia_(r.DIA);
    if (Pto_mes_(dia) !== mes || (vis && vis.indexOf(uid) < 0)) return;
    var l = linha(uid, r.USUARIO_NOME), s = Pto_up_(r.SITUACAO);
    if (s === 'LEMBRADO' || s === 'CONFIRMADO' || s === 'ESQUECI' || s === 'NAO_CONFIRMADO') l.lembradas += Pto_s_(r.LEMBRETE_EM) ? 1 : 0;
    if (s === 'CONFIRMADO') l.confirmadas++;
    if (s === 'ESQUECI') l.esqueci++;
    if (s === 'NAO_CONFIRMADO') l.naoConfirmadas++;
    if (s === 'DISPENSADO') l.dispensadas++;
    if (s === 'NAO_ENVIADO') l.naoEnviadas++;
  });
  Pto_ler_(PONTO_ABAS.AJUSTES).forEach(function (a) {
    var uid = Pto_s_(a.USUARIO_ID);
    if (Pto_mes_(Pto_dia_(a.DIA)) !== mes || (vis && vis.indexOf(uid) < 0)) return;
    var l = linha(uid, a.USUARIO_NOME), s = Pto_up_(a.SITUACAO);
    if (s === 'PENDENTE') l.ajPendentes++; else if (s === 'LANCADO') l.ajLancados++; else if (s === 'RECUSADO') l.ajRecusados++;
  });
  var cfg = Ponto_cfg_();
  var pessoas = Object.keys(por).map(function (k) {
    var l = por[k];
    if (l.vinculo !== 'CLT') { l.naoContam = l.esqueci + l.naoConfirmadas; }
    l.esquecimentos = l.vinculo === 'CLT' ? l.esqueci + l.naoConfirmadas : 0;
    l.pct = l.lembradas ? Math.round(100 * l.confirmadas / l.lembradas) : null;
    l.resumo = l.esquecimentos >= cfg.resumoAPartir;
    return l;
  }).sort(function (a, b) { return b.esquecimentos - a.esquecimentos || a.pessoa.localeCompare(b.pessoa, 'pt-BR'); });
  var tot = { lembradas: 0, confirmadas: 0, esqueci: 0, naoConfirmadas: 0, dispensadas: 0, naoEnviadas: 0, ajPendentes: 0, ajLancados: 0, ajRecusados: 0 };
  pessoas.forEach(function (l) { Object.keys(tot).forEach(function (c) { tot[c] += l[c]; }); });
  tot.pct = tot.lembradas ? Math.round(100 * tot.confirmadas / tot.lembradas) : null;
  return { mes: mes, mesNome: Pto_mesNome_(mes), pessoas: pessoas, total: tot, resumoAPartir: cfg.resumoAPartir };
}

/** Situação para a configuração: modelos, rotina, piloto, última rodada. */
function Ponto_prontidao_(cfg) {
  var modelos = ['ENTRADA', 'ALMOCO', 'RETORNO', 'SAIDA'].map(function (m) {
    var nome = PONTO_MARC[m].modelo, def = (typeof NTF_MODELOS_META !== 'undefined' && NTF_MODELOS_META[nome]) || {};
    var st = typeof SGO_waModeloSituacao_ === 'function' ? SGO_waModeloSituacao_(nome) : '';
    return { nome: nome, marcacao: m, usado: cfg.marcacoes.indexOf(m) >= 0, status: st, situacao: st === 'APPROVED' ? 'Aprovado' : st === 'PENDING' || st === 'IN_APPEAL' ? 'Em análise' : st === 'REJECTED' ? 'Recusado' : st === 'NAO_CADASTRADO' ? 'Não cadastrado' : st ? st : 'Não conferido',
      texto: Pto_s_(def.texto), botao: def.botao ? def.botao.texto + ' → ' + def.botao.url : '' };
  });
  var piloto = Ponto_pilotoCfg_() || { ligado: false, usuarios: [], areas: [] };
  return { modelos: modelos, aprovados: modelos.filter(function (m) { return m.status === 'APPROVED'; }).length, rotina: Ponto_rotinaInstalada_(),
    ultima: Pto_json_(PropertiesService.getScriptProperties().getProperty('PONTO_ULTIMA'), null),
    piloto: { ligado: !!piloto.ligado, pessoas: (piloto.usuarios || []).length, areas: (piloto.areas || []).length } };
}

// ------------------------------------------------------------
// PENDÊNCIAS (central e Caixa de decisões)
// ------------------------------------------------------------
function Ponto_fontePendencias_(add, ctx) {
  if (!ctx || ctx.cliente || typeof Pend_item_ !== 'function' || typeof PEND_TIPOS === 'undefined' || !PEND_TIPOS.ponto_ajuste) return;
  if (typeof Pend_abaExiste_ === 'function' && !Pend_abaExiste_(PONTO_ABAS.AJUSTES)) return;
  var cfg = Ponto_cfg_(), us = Ponto_usuarios_(), rh = Ponto_destinosRh_(cfg, us), hoje = Pto_partes_(new Date()).dia;
  var cfgExp = typeof SGO_expediente_ === 'function' ? SGO_expediente_() : null;
  Pto_ler_(PONTO_ABAS.AJUSTES).forEach(function (a) {
    if (Pto_up_(a.SITUACAO) !== 'PENDENTE') return;
    var t = Ponto_ajusteTela_(a, us), desde = Pto_dia_(a.CRIADO_EM) || hoje;
    var du = typeof Ges_diasUteisEntre_ === 'function' ? Ges_diasUteisEntre_(desde, hoje, cfgExp) : 0;
    add(Pend_item_('ponto_ajuste', {
      id: 'PONTO:AJ:' + t.id, nome: t.codigo, publico: 'PESSOA', paraUsuarios: rh.filter(function (id) { return id !== t.usuarioId; }), responsavel: t.pessoa, responsavelId: t.usuarioId,
      gravidade: du >= PONTO_AJUSTE_PARADO_DU ? 'CRITICO' : 'ATENCAO', dias: null,
      titulo: 'Pedido de ajuste do ponto: ' + t.pessoa + ' — ' + t.rotulo.toLowerCase() + ' de ' + Pto_curto_(t.dia),
      detalhe: 'Horário informado ' + t.horario + ' (' + t.codigo + ', ' + t.origem + ').',
      oQueFazer: 'Lance no relógio ou no sistema de ponto e marque em Assistente do ponto > Pedidos de ajuste.', tela: { tipo: 'modulo', mod: 'ponto' }
    }));
    if (du >= PONTO_AJUSTE_PARADO_DU) add(Pend_item_('ponto_ajuste_parado', {
      id: 'PONTO:AJPARADO:' + t.id, nome: t.codigo, publico: 'DIRETORIA', responsavel: t.pessoa, responsavelId: t.usuarioId, gravidade: 'CRITICO', dias: null,
      titulo: 'Pedido de ajuste do ponto parado há ' + du + ' dias úteis (' + t.pessoa + ')',
      detalhe: t.rotulo + ' de ' + t.diaBr + ', horário informado ' + t.horario + '. O RH ainda não tratou.',
      oQueFazer: 'Cobre o RH ou trate em Assistente do ponto > Pedidos de ajuste.', tela: { tipo: 'modulo', mod: 'ponto' },
      extra: { area: 'RH', naoPode: [t.usuarioId], desde: desde }
    }));
  });
  if (!ctx.userId) return;
  Pto_ler_(PONTO_ABAS.AVISOS).forEach(function (v) {
    if (Pto_s_(v.DESTINATARIO_ID) !== ctx.userId || Pto_s_(v.LIDO_EM)) return;
    add(Pend_item_('ponto_aviso', { id: 'PONTO:AV:' + v.ID, nome: 'Assistente do ponto', publico: 'PESSOA', paraUsuarios: [ctx.userId], gravidade: 'ATENCAO', dias: null,
      titulo: Pto_s_(v.TITULO), detalhe: Pto_s_(v.TEXTO).split('\n')[0].slice(0, 300), oQueFazer: 'Abra o Assistente do ponto e toque em Ciente.', tela: { tipo: 'modulo', mod: 'ponto' } }));
  });
}

// ------------------------------------------------------------
// RESUMO A4 DO MÊS (para o RH; sem justificativa, sem evidência, sem telefone)
// ------------------------------------------------------------
var PONTO_PASTA_RESUMOS = 'RH - Assistente do ponto';
function Ponto_resumoMesHtml_(eu, mes) {
  var pm = Ponto_painelMes_(eu, mes), us = Ponto_usuarios_(), t = pm.total, cfg = Ponto_cfg_();
  var aj = Pto_ler_(PONTO_ABAS.AJUSTES).filter(function (a) { return Pto_mes_(Pto_dia_(a.DIA)) === mes; }).map(function (a) { return Ponto_ajusteTela_(a, us); })
    .sort(function (a, b) { return (a.dia + a.pessoa).localeCompare(b.dia + b.pessoa); });
  var corpo = '';
  corpo += RelA4_secao_('Resumo do mês', RelA4_kpis_([
    [String(t.lembradas), 'Lembretes enviados', ''], [t.pct === null ? '—' : t.pct + '%', 'Confirmados pelo colaborador', t.pct !== null && t.pct >= 90 ? 'ok' : ''],
    [String(t.esqueci), '"Esqueci de bater" (pedidos ao RH)', t.esqueci ? 'aviso' : ''], [String(t.naoConfirmadas), 'Não confirmados', ''],
    [String(t.ajPendentes), 'Pedidos de ajuste pendentes', t.ajPendentes ? 'critico' : 'ok'], [String(t.dispensadas), 'Não lembrados (ausência ou atendimento)', '']
  ]));
  corpo += RelA4_secao_('Por colaborador', RelA4_tabela_([{ t: 'Colaborador' }, { t: 'Lembretes', num: true }, { t: 'Confirmados', num: true }, { t: 'Esqueci de bater', num: true }, { t: 'Não confirmados', num: true },
    { t: 'Não lembrados', num: true }, { t: 'Ajustes lançados', num: true }, { t: 'Ajustes pendentes', num: true }],
    pm.pessoas.map(function (l) { return [l.pessoa + (l.vinculo === 'CLT' ? '' : ' (' + (l.vinculo || 'sem vínculo') + ')'), String(l.lembradas), String(l.confirmadas), String(l.esqueci), String(l.naoConfirmadas), String(l.dispensadas), String(l.ajLancados), String(l.ajPendentes)]; }),
    { legenda: 'Marcações do mês por colaborador', vazio: 'Nenhuma marcação registrada no mês.' }));
  corpo += RelA4_secao_('Pedidos de ajuste do mês', RelA4_tabela_([{ t: 'Código' }, { t: 'Colaborador' }, { t: 'Dia', cen: true }, { t: 'Marcação' }, { t: 'Horário informado', cen: true }, { t: 'Situação' }],
    aj.map(function (a) { return [a.codigo, a.pessoa, a.diaBr, a.rotulo, a.horario, a.situacaoTexto]; }), { legenda: 'Pedidos de ajuste ("Esqueci de bater") do mês', vazio: 'Nenhum pedido de ajuste no mês.' }));
  corpo += RelA4_secao_('Como ler este resumo', RelA4_paragrafos_('O registro oficial é o do relógio ou do aplicativo de ponto (Portaria MTP 671/2021). O assistente só lembra e recebe a confirmação de um toque.\n' +
    '"Não confirmado" não é prova de falta: a pessoa pode ter batido o ponto sem tocar no botão. Nenhuma medida é tomada automaticamente; a partir do ' + cfg.resumoAPartir + 'º esquecimento no mês o RH e a gestão recebem um resumo e o Programa de conduta recebe uma sugestão, que a gestão decide.\n' +
    'Só colaboradores CLT recebem os lembretes. Este resumo não traz justificativas, evidências nem contatos; os detalhes de cada pedido estão no SGO+, em Assistente do ponto.'));
  return RelA4_documento_({ titulo: 'Resumo mensal do assistente do ponto', subtitulo: Pto_mesNome_(mes), tituloCurto: 'Assistente do ponto', tituloArquivo: 'Resumo do ponto', sigla: 'PTO',
    identificacao: Pto_mesNome_(mes), rotuloIdentificacao: 'Mês', emitidoPor: eu.nome, corpo: corpo, capa: false, sumario: false });
}

// ------------------------------------------------------------
// TELAS: uma porta só
// ------------------------------------------------------------
function Ponto_api(sessionId, acao, dados) {
  try {
    var eu = Ponto_eu_(sessionId);
    Ponto_garantirAbas_();
    var d = dados || {}, r = Ponto_acao_(eu, String(acao || ''), d);
    r.ok = true;
    return r;
  } catch (e) {
    // mensagens das regras (Error) vão como estão; falha inesperada do código (TypeError...) ganha o caminho de volta
    var m = String((e && e.message) || e).replace(/^Error:\s*/, '');
    return { ok: false, message: !e || e.name === 'Error' ? m : 'Não foi possível concluir: ' + m + '. Atualize a tela e tente de novo; se continuar, avise o administrador.' };
  }
}

function Ponto_acao_(eu, acao, d) {
  var cfg = Ponto_cfg_(), hoje = Pto_partes_(new Date()).dia, us;
  switch (acao) {
    case 'acesso':
      return { papel: eu.papel, ligado: cfg.ligado, verMenu: cfg.ligado || eu.verTodos, configurar: eu.configurar, tratar: eu.tratar, pessoas: eu.verTodos, equipe: eu.verTodos || eu.gestor };
    case 'iniciar': {
      var avisos = Pto_ler_(PONTO_ABAS.AVISOS).filter(function (v) { return Pto_s_(v.DESTINATARIO_ID) === eu.id && !Pto_s_(v.LIDO_EM); })
        .map(function (v) { return { id: Pto_s_(v.ID), titulo: Pto_s_(v.TITULO), texto: Pto_s_(v.TEXTO), data: Pto_s_(v.DATA).replace('T', ' ').slice(0, 16) }; }).reverse().slice(0, 30);
      us = Ponto_usuarios_();
      var pend = eu.tratar ? Pto_ler_(PONTO_ABAS.AJUSTES).filter(function (a) { return Pto_up_(a.SITUACAO) === 'PENDENTE'; }).length : 0;
      var exp = typeof SGO_expediente_ === 'function' ? SGO_expediente_() : { ini: '08:00', fim: '17:30', feriados: '' };
      return { papel: eu.papel, configurar: eu.configurar, tratar: eu.tratar, pessoas: eu.verTodos, equipe: eu.verTodos || eu.gestor, ligado: cfg.ligado,
        conjunto: cfg.conjunto, conjuntoNome: PONTO_CONJUNTOS[cfg.conjunto].nome, marcacoes: cfg.marcacoes.map(function (m) { return PONTO_MARC[m].rotulo; }),
        jornadaGeral: Ponto_jornadaTexto_(Ponto_jornada_(cfg, null, hoje)), expediente: { ini: exp.ini, fim: exp.fim }, avisos: avisos, pendentes: pend, hoje: hoje,
        rhDefinido: Ponto_rhIds_(cfg, us).length > 0, eu: { id: eu.id, nome: eu.nome, vinculo: eu.vinculo } };
    }
    case 'ciente': {
      var v = SGO_DATA.getById(PONTO_ABAS.AVISOS, Pto_s_(d.id));
      if (!v || Pto_s_(v.DESTINATARIO_ID) !== eu.id) throw new Error('Não foi possível marcar como ciente: o aviso não é seu ou não existe mais. Atualize a tela.');
      if (!Pto_s_(v.LIDO_EM)) SGO_DATA.update(PONTO_ABAS.AVISOS, v.ID, { LIDO_EM: Pto_agoraIso_(new Date()) });
      if (typeof SGO_Pendencias_invalidar_ === 'function') { try { SGO_Pendencias_invalidar_(); } catch (e) {} }
      return { message: 'Ciente.' };
    }
    case 'cienteTodos': {
      var ag = Pto_agoraIso_(new Date()), n = 0;
      Pto_ler_(PONTO_ABAS.AVISOS).forEach(function (v) { if (Pto_s_(v.DESTINATARIO_ID) === eu.id && !Pto_s_(v.LIDO_EM)) { SGO_DATA.update(PONTO_ABAS.AVISOS, v.ID, { LIDO_EM: ag }); n++; } });
      if (typeof SGO_Pendencias_invalidar_ === 'function') { try { SGO_Pendencias_invalidar_(); } catch (e) {} }
      return { message: n + ' aviso(s) marcados como ciente.' };
    }
    case 'dia':
      Ponto_exigir_(eu, 'equipe', 'abrir o painel do dia');
      return { painel: Ponto_painelDia_(eu, /^\d{4}-\d{2}-\d{2}$/.test(Pto_s_(d.dia)) ? d.dia : hoje) };
    case 'mes':
      Ponto_exigir_(eu, 'equipe', 'abrir o painel do mês');
      return { painel: Ponto_painelMes_(eu, /^\d{4}-\d{2}$/.test(Pto_s_(d.mes)) ? d.mes : Pto_mes_(hoje)) };
    case 'pedidos': {
      us = Ponto_usuarios_();
      var vis = Ponto_idsVisiveis_(eu, us), filtro = Pto_up_(d.situacao);
      var lista = Pto_ler_(PONTO_ABAS.AJUSTES).filter(function (a) { return !vis || vis.indexOf(Pto_s_(a.USUARIO_ID)) >= 0; })
        .filter(function (a) { return !filtro || Pto_up_(a.SITUACAO) === filtro; }).map(function (a) { return Ponto_ajusteTela_(a, us); })
        .sort(function (a, b) { return (a.situacao === 'PENDENTE' ? 0 : 1) - (b.situacao === 'PENDENTE' ? 0 : 1) || b.dia.localeCompare(a.dia) || b.criadoEm.localeCompare(a.criadoEm); });
      if (!eu.tratar) lista.forEach(function (a) { if (a.usuarioId !== eu.id) { a.justificativa = ''; a.evidencia = ''; } });   // gestão acompanha; o detalhe é do RH
      return { pedidos: lista.slice(0, 300), podeTratar: eu.tratar };
    }
    case 'tratar': {
      Ponto_exigir_(eu, 'tratar', 'tratar o pedido de ajuste');
      var decisao = Pto_up_(d.decisao), obs = Pto_texto_(d.observacao, 300);
      if (['LANCADO', 'RECUSADO'].indexOf(decisao) < 0) throw new Error('Escolha: lançado no ponto ou não lançado.');
      if (decisao === 'RECUSADO' && obs.replace(/\s/g, '').length < 5) throw new Error('Não foi possível registrar: para "não lançado", escreva o motivo (pelo menos 5 letras). A pessoa recebe o motivo e sabe o que fazer.');
      return Pto_comTrava_(function () {
        var a = SGO_DATA.getById(PONTO_ABAS.AJUSTES, Pto_s_(d.id));
        if (!a) throw new Error('Não foi possível tratar: o pedido não foi encontrado. Atualize a lista de pedidos.');
        if (Pto_up_(a.SITUACAO) !== 'PENDENTE') throw new Error('Este pedido já foi tratado (' + (PONTO_AJ_SIT[Pto_up_(a.SITUACAO)] || a.SITUACAO) + ' por ' + (Pto_s_(a.TRATADO_POR_NOME) || 'outra pessoa') + '). Atualize a lista.');
        if (Pto_s_(a.USUARIO_ID) === eu.id) throw new Error('Não foi possível tratar: o pedido é seu. Outra pessoa do RH, a Diretoria ou o Administrador trata; ele continua na fila.');
        var agoraIso = Pto_agoraIso_(new Date());
        SGO_DATA.update(PONTO_ABAS.AJUSTES, a.ID, { SITUACAO: decisao, OBSERVACAO: obs, TRATADO_POR_ID: eu.id, TRATADO_POR_NOME: eu.nome, TRATADO_EM: agoraIso, ATUALIZADO_EM: agoraIso });
        var m = Pto_up_(a.MARCACAO), def = PONTO_MARC[m] || { rotulo: m, curto: m };
        var pedido = def.rotulo + ' de ' + Pto_br_(Pto_dia_(a.DIA)) + ', horário informado ' + Pto_normHora_(a.HORARIO_INFORMADO);
        var sit = decisao === 'LANCADO' ? 'lançado no ponto' + (obs ? ' (' + obs + ')' : '') : 'não lançado: ' + obs + '. Se tiver dúvida, fale com o RH.';
        Ponto_avisar_(a.USUARIO_ID, 'AJUSTE_TRATADO', 'Ajuste do ponto: ' + (decisao === 'LANCADO' ? 'lançado' : 'não lançado'), 'Pedido ' + Pto_s_(a.CODIGO) + ': ' + pedido + '. Situação: ' + sit, { tipo: 'AJUSTE', id: a.ID }, true);
        Ponto_concluirAtividade_(Pto_s_(a.ATIVIDADE_ID), 'Pedido ' + Pto_s_(a.CODIGO) + ' tratado por ' + eu.nome + ': ' + (decisao === 'LANCADO' ? 'lançado no ponto' : 'não lançado') + '.');
        try { SGO_DATA.log('PONTO_AJUSTE_' + decisao, eu.login, Pto_s_(a.CODIGO) + (obs ? ': ' + obs : ''), 'PONTO'); } catch (e) {}
        return { pedido: Ponto_ajusteTela_(SGO_DATA.getById(PONTO_ABAS.AJUSTES, a.ID), Ponto_usuarios_()), message: decisao === 'LANCADO' ? 'Marcado como lançado no ponto. A pessoa é avisada no SGO+ e por e-mail.' : 'Registrado como não lançado, com o motivo. A pessoa é avisada no SGO+ e por e-mail.' };
      });
    }
    case 'meus': {
      var mes = /^\d{4}-\d{2}$/.test(Pto_s_(d.mes)) ? d.mes : Pto_mes_(hoje);
      us = Ponto_usuarios_();
      var pessoas = Ponto_pessoas_(), meu = us[eu.id];
      var fora = meu ? Ponto_motivoFora_(meu, pessoas[eu.id], Ponto_pilotoCfg_(), cfg) : 'INATIVO';
      var marcs = Pto_ler_(PONTO_ABAS.MARCACOES).filter(function (r) { return Pto_s_(r.USUARIO_ID) === eu.id && Pto_mes_(Pto_dia_(r.DIA)) === mes; }).map(Ponto_marcTela_)
        .sort(function (a, b) { return (b.dia + (9 - PONTO_ORDEM.indexOf(b.marcacao))).localeCompare(a.dia + (9 - PONTO_ORDEM.indexOf(a.marcacao))); });
      var aj = Pto_ler_(PONTO_ABAS.AJUSTES).filter(function (a) { return Pto_s_(a.USUARIO_ID) === eu.id; }).map(function (a) { return Ponto_ajusteTela_(a, us); })
        .sort(function (a, b) { return b.criadoEm.localeCompare(a.criadoEm); }).slice(0, 60);
      return { mes: mes, mesNome: Pto_mesNome_(mes), ligado: cfg.ligado, participa: !fora, foraTexto: fora ? PONTO_FORA_TEXTO[fora] : '',
        jornada: Ponto_jornadaTexto_(Ponto_jornada_(cfg, pessoas[eu.id], hoje)), marcacoesLembradas: cfg.marcacoes.map(function (m) { return PONTO_MARC[m].rotulo; }),
        marcacoes: marcs, pedidos: aj, hoje: hoje, prazoDias: PONTO_AJUSTE_PRAZO_DIAS };
    }
    case 'confirmarMeu':
      return Pto_comTrava_(function () {
        var r0 = SGO_DATA.getById(PONTO_ABAS.MARCACOES, Pto_s_(d.id));
        if (!r0 || Pto_s_(r0.USUARIO_ID) !== eu.id) throw new Error('Não foi possível confirmar: a marcação não é sua ou não existe mais. Atualize a tela.');
        if (Pto_dia_(r0.DIA) !== hoje) throw new Error('Não foi possível confirmar: a confirmação vale só no dia. Para um dia que passou, use "Pedir ajuste ao RH".');
        var s0 = Pto_up_(r0.SITUACAO);
        if (s0 === 'CONFIRMADO') return { message: 'Já estava confirmada.' };
        if (s0 !== 'LEMBRADO' && s0 !== 'ENVIANDO' && s0 !== 'NAO_ENVIADO') throw new Error('Não foi possível confirmar: esta marcação está como "' + (PONTO_SIT[s0] || s0) + '". Se esqueceu de bater, use "Pedir ajuste ao RH".');
        var ag = Pto_agoraIso_(new Date());
        SGO_DATA.update(PONTO_ABAS.MARCACOES, r0.ID, { SITUACAO: 'CONFIRMADO', CONFIRMADO_EM: ag, CONFIRMADO_POR: 'TELA', ATUALIZADO_EM: ag });
        return { message: (PONTO_MARC[Pto_up_(r0.MARCACAO)] || {}).rotulo + ' confirmada às ' + Pto_horaDe_(ag) + '. Obrigado.' };
      });
    case 'pedirAjuste': {
      if (!cfg.ligado && !eu.verTodos) throw new Error('Não foi possível pedir o ajuste por aqui: o assistente do ponto está desligado. Fale direto com o RH.');
      var dia = Pto_dia_(d.dia), marc = Pto_up_(d.marcacao);
      if (!dia || dia > hoje || dia < Pto_somarDias_(hoje, -PONTO_AJUSTE_PRAZO_DIAS)) throw new Error('Não foi possível pedir o ajuste: escolha um dia de hoje até ' + PONTO_AJUSTE_PRAZO_DIAS + ' dias atrás. Para um dia mais antigo, fale direto com o RH.');
      if (!PONTO_MARC[marc]) throw new Error('Escolha a marcação: entrada, saída para o almoço, volta do almoço ou saída.');
      var v2 = Ponto_validarEsqueci_(dia, d, new Date());
      if (v2.erro) throw new Error(v2.erro);
      return Pto_comTrava_(function () {
        us = Ponto_usuarios_();
        var meu2 = us[eu.id];
        if (!meu2) throw new Error('Não foi possível pedir o ajuste: o seu cadastro não foi encontrado. Fale com o RH.');
        if (Pto_ler_(PONTO_ABAS.AJUSTES).some(function (a) { return Pto_s_(a.USUARIO_ID) === eu.id && Pto_dia_(a.DIA) === dia && Pto_up_(a.MARCACAO) === marc && Pto_up_(a.SITUACAO) === 'PENDENTE'; })) {
          throw new Error('Já existe um pedido pendente para ' + PONTO_MARC[marc].rotulo.toLowerCase() + ' de ' + Pto_br_(dia) + '. Aguarde o RH; ele aparece em Meus pedidos.');
        }
        var row = Ponto_indice_(function (r, dd) { return dd === dia && Pto_s_(r.USUARIO_ID) === eu.id; })[Ponto_chave_(eu.id, dia, marc)] || null;
        var aj2 = Ponto_criarAjuste_(meu2, dia, marc, v2.hora, v2.just, 'TELA', row, eu.id);
        return { message: 'Pedido enviado ao RH (' + aj2.CODIGO + '). A resposta aparece aqui e no seu e-mail.' };
      });
    }
    case 'pessoas': {
      Ponto_exigir_(eu, 'pessoas', 'ver quem participa');
      us = Ponto_usuarios_();
      var pe = Ponto_pessoas_(), pil = Ponto_pilotoCfg_();
      var lista2 = Object.keys(us).map(function (id) { return us[id]; }).filter(function (u) { return u.ativo && !u.sistema; }).map(function (u) {
        var p = pe[u.id] || {}, fora = Ponto_motivoFora_(u, pe[u.id], pil, cfg);
        return { id: u.id, nome: u.nome, area: u.areaNome, vinculo: u.vinculo || '', celular: Pto_mascara_(u.celular), temEmail: !!u.email, apto: !fora, fora: fora, foraTexto: fora ? PONTO_FORA_TEXTO[fora] : '',
          participa: !(Pto_s_(p.PARTICIPA) && !Pto_verdade_(p.PARTICIPA)), entrada: Pto_normHora_(p.ENTRADA), almoco: Pto_normHora_(p.ALMOCO), retorno_min: Pto_s_(p.RETORNO_MIN),
          saida: Pto_normHora_(p.SAIDA), saida_sexta: Pto_normHora_(p.SAIDA_SEXTA), sem_almoco: Pto_verdade_(p.SEM_ALMOCO), observacao: Pto_s_(p.OBSERVACAO),
          jornada: Ponto_jornadaTexto_(Ponto_jornada_(cfg, pe[u.id], hoje)) };
      }).sort(function (a, b) { return a.nome.localeCompare(b.nome, 'pt-BR'); });
      var disp = Pto_ler_(PONTO_ABAS.DISPENSAS).filter(function (x) { return !Pto_s_(x.EXCLUIDA_EM) && Pto_dia_(x.ATE) >= Pto_somarDias_(hoje, -31); })
        .map(function (x) { return { id: Pto_s_(x.ID), usuarioId: Pto_s_(x.USUARIO_ID), pessoa: (us[Pto_s_(x.USUARIO_ID)] || {}).nome || Pto_s_(x.USUARIO_NOME), de: Pto_dia_(x.DE), ate: Pto_dia_(x.ATE),
          deBr: Pto_br_(Pto_dia_(x.DE)), ateBr: Pto_br_(Pto_dia_(x.ATE)), motivo: PONTO_MOTIVOS_DISPENSA[Pto_up_(x.MOTIVO)] || Pto_s_(x.MOTIVO), observacao: Pto_s_(x.OBSERVACAO) }; })
        .sort(function (a, b) { return b.de.localeCompare(a.de); });
      return { pessoas: lista2, aptos: lista2.filter(function (x) { return x.apto; }).length, dispensas: disp, motivosDispensa: PONTO_MOTIVOS_DISPENSA,
        piloto: { ligado: !!(pil && pil.ligado) }, jornadaGeral: Ponto_jornadaTexto_(Ponto_jornada_(cfg, null, hoje)) };
    }
    case 'salvarPessoa': {
      Ponto_exigir_(eu, 'pessoas', 'salvar a jornada da pessoa');
      us = Ponto_usuarios_();
      var alvo = us[Pto_s_(d.usuarioId)];
      if (!alvo || !alvo.ativo) throw new Error('Não foi possível salvar: escolha um colaborador ativo na lista.');
      var ret = Pto_s_(d.retorno_min);
      if (ret && (!/^\d+$/.test(ret) || +ret < 15 || +ret > 240)) throw new Error('Pausa do almoço: de 15 a 240 minutos (ou vazio para a jornada geral). Corrija e salve de novo.');
      var campos = { USUARIO_ID: alvo.id, PARTICIPA: d.participa === false || Pto_s_(d.participa) === 'false' ? 'NAO' : 'SIM', ENTRADA: Ponto_horaValida_(d.entrada, 'Entrada', true),
        ALMOCO: Ponto_horaValida_(d.almoco, 'Saída para o almoço', true), RETORNO_MIN: ret ? Number(ret) : '', SAIDA: Ponto_horaValida_(d.saida, 'Saída', true),
        SAIDA_SEXTA: Ponto_horaValida_(d.saida_sexta, 'Saída na sexta', true), SEM_ALMOCO: d.sem_almoco === true || Pto_s_(d.sem_almoco) === 'true' ? 'SIM' : '',
        OBSERVACAO: Pto_texto_(d.observacao, 200), ATUALIZADO_POR: eu.nome, ATUALIZADO_EM: Pto_agoraIso_(new Date()) };
      Ponto_conferirJornada_(cfg, campos);
      var atual = Ponto_pessoas_()[alvo.id];
      if (atual) SGO_DATA.update(PONTO_ABAS.PESSOAS, atual.ID, campos); else SGO_DATA.insert(PONTO_ABAS.PESSOAS, campos);
      try { SGO_DATA.log('PONTO_PESSOA', eu.login, alvo.nome + ': ' + JSON.stringify(campos).slice(0, 600), 'PONTO'); } catch (e) {}
      return { message: 'Salvo: ' + alvo.nome + (campos.PARTICIPA === 'NAO' ? ' (fora do assistente)' : '') + '.' };
    }
    case 'salvarDispensa': {
      Ponto_exigir_(eu, 'pessoas', 'lançar a folga ou dispensa');
      us = Ponto_usuarios_();
      var p2 = us[Pto_s_(d.usuarioId)], de = Pto_dia_(d.de), ate = Pto_dia_(d.ate) || de, mot = Pto_up_(d.motivo);
      if (!p2) throw new Error('Não foi possível salvar: escolha o colaborador na lista.');
      if (!de || ate < de) throw new Error('Não foi possível salvar: informe o primeiro e o último dia (o último não pode ser antes do primeiro).');
      if (!PONTO_MOTIVOS_DISPENSA[mot]) throw new Error('Escolha o motivo da lista (folga, férias, atestado, consulta, viagem sem marcação de ponto ou outro).');
      SGO_DATA.insert(PONTO_ABAS.DISPENSAS, { USUARIO_ID: p2.id, USUARIO_NOME: p2.nome, DE: de, ATE: ate, MOTIVO: mot, OBSERVACAO: Pto_texto_(d.observacao, 200), CRIADO_POR_ID: eu.id, CRIADO_POR_NOME: eu.nome, EXCLUIDA_EM: '', EXCLUIDA_POR: '' });
      return { message: 'Lançado: ' + p2.nome + ' não recebe lembretes de ' + Pto_br_(de) + ' a ' + Pto_br_(ate) + '.' };
    }
    case 'removerDispensa': {
      Ponto_exigir_(eu, 'pessoas', 'retirar a folga ou dispensa');
      var x = SGO_DATA.getById(PONTO_ABAS.DISPENSAS, Pto_s_(d.id));
      if (!x || Pto_s_(x.EXCLUIDA_EM)) throw new Error('Não foi possível retirar: a dispensa não foi encontrada (pode já ter sido retirada). Atualize a lista.');
      SGO_DATA.update(PONTO_ABAS.DISPENSAS, x.ID, { EXCLUIDA_EM: Pto_agoraIso_(new Date()), EXCLUIDA_POR: eu.nome });   // nada é apagado: fica marcada
      return { message: 'Dispensa retirada. Os lembretes voltam para esses dias.' };
    }
    case 'config': {
      Ponto_exigir_(eu, 'configurar', 'abrir a configuração');
      us = Ponto_usuarios_();
      var ex2 = typeof SGO_expediente_ === 'function' ? SGO_expediente_() : { ini: '08:00', fim: '17:30', dias: [1, 2, 3, 4, 5], feriados: '' };
      var cand = Object.keys(us).map(function (id) { return us[id]; }).filter(function (u) { return u.ativo && !u.sistema; })
        .map(function (u) { return { id: u.id, nome: u.nome, rhAutomatico: u.perfil === 'RH' || u.area === 'RH', marcado: cfg.rhIds.indexOf(u.id) >= 0 }; }).sort(function (a, b) { return a.nome.localeCompare(b.nome, 'pt-BR'); });
      return { config: cfg, conjuntos: Object.keys(PONTO_CONJUNTOS).map(function (k) { return { codigo: k, nome: PONTO_CONJUNTOS[k].nome }; }),
        jornadaEfetiva: Ponto_jornadaTexto_(Ponto_jornada_(cfg, null, '2026-10-19')), jornadaSexta: Ponto_jornadaTexto_(Ponto_jornada_(cfg, null, '2026-10-23')),
        expediente: { ini: ex2.ini, fim: ex2.fim, dias: ex2.dias, feriados: ex2.feriados }, candidatosRh: cand, prontidao: Ponto_prontidao_(cfg) };
    }
    case 'salvarConfig': {
      Ponto_exigir_(eu, 'configurar', 'salvar a configuração');
      us = Ponto_usuarios_();
      var n = JSON.parse(JSON.stringify(cfg));
      if (d.conjunto !== undefined) { if (!PONTO_CONJUNTOS[Pto_up_(d.conjunto)]) throw new Error('Escolha quais marcações lembrar na lista.'); n.conjunto = Pto_up_(d.conjunto); }
      if (d.rhIds !== undefined) n.rhIds = (Array.isArray(d.rhIds) ? d.rhIds : []).map(Pto_s_).filter(function (id, i, a) { if (id && (!us[id] || !us[id].ativo)) throw new Error('RH: escolha só usuários ativos.'); return id && a.indexOf(id) === i; });
      if (d.emailReserva !== undefined) n.emailReserva = d.emailReserva === true || Pto_s_(d.emailReserva) === 'true';
      if (d.atividadeRh !== undefined) n.atividadeRh = d.atividadeRh === true || Pto_s_(d.atividadeRh) === 'true';
      if (d.resumoAPartir !== undefined) { var ra = Number(d.resumoAPartir); if (!(ra >= 2 && ra <= 10)) throw new Error('O resumo para o RH começa entre o 2º e o 10º esquecimento do mês. Corrija e salve de novo.'); n.resumoAPartir = Math.round(ra); }
      if (d.jornada) {
        var j = d.jornada;
        n.jornada.entrada = Ponto_horaValida_(j.entrada, 'Entrada', true);
        n.jornada.almoco = Ponto_horaValida_(j.almoco, 'Saída para o almoço');
        n.jornada.saida = Ponto_horaValida_(j.saida, 'Saída');
        n.jornada.saida_sexta = Ponto_horaValida_(j.saida_sexta, 'Saída na sexta', true);
        var rm = Number(Pto_s_(j.retorno_min === undefined ? n.jornada.retorno_min : j.retorno_min).replace(',', '.'));
        if (!isFinite(rm) || rm !== Math.round(rm) || rm < 15 || rm > 240) throw new Error('Pausa do almoço: de 15 a 240 minutos. Corrija e salve de novo.');
        n.jornada.retorno_min = rm;
        Ponto_conferirJornada_(n, null);
      }
      var aviso = '';
      if (d.ligado !== undefined) n.ligado = d.ligado === true || Pto_s_(d.ligado) === 'true';
      if (n.ligado && !Ponto_rhIds_(n, us).length) aviso = 'Ligado, mas ninguém está como RH: os pedidos de ajuste vão para a Diretoria até você marcar o RH.';
      var gravada = Ponto_gravarCfg_(n, eu.nome);
      if (gravada.ligado) {
        try { Ponto_garantirRotina_(); } catch (e) { aviso = 'Ligado, mas a rotina de 5 minutos não foi instalada agora (' + ((e && e.message) || e) + '). Peça ao administrador do servidor para rodar o instalador de rotinas.'; }
        var pr = Ponto_prontidao_(gravada), usados = pr.modelos.filter(function (m) { return m.usado; });
        if (usados.some(function (m) { return m.status !== 'APPROVED'; })) aviso = (aviso ? aviso + ' ' : '') + 'Os modelos do WhatsApp ainda não estão todos aprovados na Meta: até lá o lembrete vai por e-mail' + (gravada.emailReserva ? '' : ' (desligado: ligue o e-mail como reserva ou o lembrete não sai)') + '.';
      }
      try { SGO_DATA.log('PONTO_CONFIG', eu.login, JSON.stringify({ de: cfg, para: gravada }).slice(0, 3000), 'PONTO'); } catch (e) {}
      return { config: gravada, aviso: aviso, message: gravada.ligado ? 'Configuração salva. Assistente LIGADO.' : 'Configuração salva. Assistente desligado: nenhum lembrete sai.' };
    }
    case 'salvarFeriados': {
      Ponto_exigir_(eu, 'configurar', 'salvar os feriados do expediente comum');
      if (typeof SGO_expedienteGravar_ !== 'function') throw new Error('Não foi possível salvar: o expediente comum não está disponível neste servidor.');
      var ex3 = SGO_expediente_();
      var gr = SGO_expedienteGravar_({ ini: ex3.ini, fim: ex3.fim, dias: ex3.dias, feriados: Pto_s_(d.feriados) });
      try { SGO_DATA.log('PONTO_FERIADOS', eu.login, Pto_s_(gr.feriados).slice(0, 500), 'PONTO'); } catch (e) {}
      return { feriados: gr.feriados, message: 'Feriados salvos no expediente comum (valem para todos os avisos automáticos do SGO+).' };
    }
    case 'previa': {
      Ponto_exigir_(eu, 'pessoas', 'pré-visualizar a página');
      var mp = PONTO_MARC[Pto_up_(d.marcacao)] ? Pto_up_(d.marcacao) : 'ENTRADA', nn = Ponto_nonce_();
      var jj = Ponto_jornada_(cfg, Ponto_pessoas_()[eu.id] || null, hoje), hr = Ponto_horario_(mp, hoje, jj, null);
      CacheService.getScriptCache().put('PONTO_PREVIA_' + nn, JSON.stringify({ uid: eu.id, marc: mp, dia: hoje, previsto: hr ? Pto_horaDe_(new Date(hr.ref)) : '' }), 3600);
      return { link: Ponto_link_(Ponto_token_(hoje, nn, true)) };
    }
    case 'resumoA4': {
      Ponto_exigir_(eu, 'pessoas', 'gerar o resumo do mês');
      var mesA = /^\d{4}-\d{2}$/.test(Pto_s_(d.mes)) ? d.mes : Pto_mes_(hoje), html = Ponto_resumoMesHtml_(eu, mesA);
      if (!d.pdf) return { html: html };
      var pasta = SGO_DocSalvar_pastaPersistente_('PONTO_PASTA_RESUMOS_ID', PONTO_PASTA_RESUMOS, '');
      var sv = SGO_DocSalvar_salvarHtmlEPdf_(pasta, 'Resumo do ponto ' + mesA, html, {});
      return { pdfUrl: sv.pdfUrl, htmlUrl: sv.htmlUrl, message: 'Resumo salvo na pasta "' + PONTO_PASTA_RESUMOS + '".' };
    }
    default:
      throw new Error('Não foi possível concluir: ação desconhecida (' + acao + '). Atualize a página (F5).');
  }
}
