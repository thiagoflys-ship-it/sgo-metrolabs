/****************************************************
 * ASSISTENTE DO PONTO — ROTINA DE 5 MINUTOS (21/10/2026)
 *
 * Gatilho Ponto_rotina (a cada 5 min; instalado por Ponto_garantirRotina_ ao ligar e por
 * sgo_servidor/scripts/instalar_gatilhos.ts). Desligado, não lê nada e não manda nada.
 *
 * Em cada rodada:
 *  1. fecha os dias que passaram: lembrado e não confirmado vira "não confirmado" (não é prova de falta);
 *  2. em dia útil, para cada participante, manda o lembrete da marcação cujo horário chegou (janela de 20 min):
 *     um por marcação, nunca um segundo, nunca antes da entrada menos 5 min nem depois da saída da pessoa;
 *     ausente ou em atendimento no Auvo = não lembra (fica registrado como "não lembrado", com o motivo);
 *  3. 3º esquecimento no mês: resumo no sistema e por e-mail ao RH e à gestão da pessoa e sugestão no Programa de
 *     conduta (nunca ocorrência; nunca pelo WhatsApp);
 *  4. e-mails guardados (respostas do RH, resumos, pedidos novos) saem só dentro do expediente comum.
 * A linha da marcação é gravada ANTES do envio: se a execução cair no meio, o lembrete não é repetido.
 ****************************************************/

var PONTO_FUNCAO_ROTINA = 'Ponto_rotina';

function Ponto_garantirRotina_() {
  var tem = ScriptApp.getProjectTriggers().some(function (t) { return t.getHandlerFunction() === PONTO_FUNCAO_ROTINA; });
  if (tem) return 'já instalada';
  ScriptApp.newTrigger(PONTO_FUNCAO_ROTINA).timeBased().everyMinutes(5).create();
  return 'instalada';
}
function Ponto_rotinaInstalada_() {
  try { return ScriptApp.getProjectTriggers().some(function (t) { return t.getHandlerFunction() === PONTO_FUNCAO_ROTINA; }); } catch (e) { return false; }
}

/** Gatilho (nome sem "_" para o gatilho achar). Recusado quando chamado pelo navegador. */
function Ponto_rotina() {
  if (!SGO_execucaoInterna_()) return null;
  return Ponto_rodada_(new Date());
}

function Ponto_travar_() {
  var lock;
  try { lock = LockService.getScriptLock(); if (!lock.tryLock(10000)) return false; } catch (e) { return false; }
  try {
    var p = PropertiesService.getScriptProperties(), atual = Number(p.getProperty('PONTO_RODANDO') || 0);
    if (atual && Math.abs(Date.now() - atual) < 4 * 60000) return false;
    p.setProperty('PONTO_RODANDO', String(Date.now()));
    return true;
  } finally { try { lock.releaseLock(); } catch (e) {} }
}
function Ponto_destravar_() { try { PropertiesService.getScriptProperties().deleteProperty('PONTO_RODANDO'); } catch (e) {} }

/** Uma rodada. quando (Date) é opcional: testes e ensaio simulam o relógio. Devolve as contagens e o motivo. */
function Ponto_rodada_(quando) {
  quando = quando || new Date();
  var res = { lembretes: 0, whatsapp: 0, email: 0, semCanal: 0, dispensados: 0, fechados: 0, resumos: 0, sugestoes: 0, emails: 0, motivo: '' };
  var cfg = Ponto_cfg_();
  if (!cfg.ligado) { res.motivo = 'assistente desligado'; return res; }
  if (!Ponto_travar_()) { res.motivo = 'outra rodada em andamento'; return res; }
  try {
    Ponto_garantirAbas_();
    var R = { quando: quando, agora: quando.getTime(), p: Pto_partes_(quando), cfg: cfg, res: res, us: Ponto_usuarios_(), pessoas: Ponto_pessoas_(), piloto: Ponto_pilotoCfg_() };
    Ponto_fechar_(R);
    var motivoDia = Pto_motivoDia_(R.p.dia);
    if (motivoDia) res.motivo = 'sem lembretes hoje (' + motivoDia + ')';
    else {
      R.M = Ponto_indice_(function (r, dia) { return dia === R.p.dia; });
      R.aus = Ponto_ausencias_(R.p.dia);
      R.auvo = Ponto_tarefasAuvo_(R.p.dia);
      Ponto_participantes_(cfg, R.us, R.pessoas, R.piloto).forEach(function (part) { Ponto_lembretesDe_(R, part); });
    }
    Ponto_resumos_(R);
    var em = Ponto_enviarEmailsPendentes_(quando);
    res.emails = em.enviados || 0;
  } catch (x) {
    res.motivo = 'erro: ' + String((x && x.message) || x).slice(0, 200);
    console.error('Assistente do ponto (rodada): ' + res.motivo);
  } finally { Ponto_destravar_(); }
  try { PropertiesService.getScriptProperties().setProperty('PONTO_ULTIMA', JSON.stringify({ em: Pto_agoraIso_(quando), res: res })); } catch (e) {}
  if (typeof SGO_Pendencias_invalidar_ === 'function' && (res.lembretes || res.fechados || res.resumos)) { try { SGO_Pendencias_invalidar_(); } catch (e) {} }
  return res;
}

/** Fecha os dias anteriores a hoje: LEMBRADO -> NAO_CONFIRMADO; ENVIANDO (execução caiu no envio) -> NAO_ENVIADO. */
function Ponto_fechar_(R) {
  var props = PropertiesService.getScriptProperties(), ontem = Pto_somarDias_(R.p.dia, -1);
  if (Pto_s_(props.getProperty('PONTO_FECHADO')) >= ontem) return;
  var agora = Pto_agoraIso_(R.quando);
  Pto_ler_(PONTO_ABAS.MARCACOES).forEach(function (r) {
    var dia = Pto_dia_(r.DIA), sit = Pto_up_(r.SITUACAO);
    if (!dia || dia >= R.p.dia) return;
    if (sit === 'LEMBRADO') {
      SGO_DATA.update(PONTO_ABAS.MARCACOES, r.ID, { SITUACAO: 'NAO_CONFIRMADO', OBS: 'sem confirmação até o fim do dia (a pessoa pode ter batido o ponto sem tocar no botão)', ATUALIZADO_EM: agora });
      R.res.fechados++;
    } else if (sit === 'ENVIANDO') {
      SGO_DATA.update(PONTO_ABAS.MARCACOES, r.ID, { SITUACAO: 'NAO_ENVIADO', ENVIO_MOTIVO: 'a rotina parou no meio do envio; não se sabe se o lembrete chegou (não conta como esquecimento)', ATUALIZADO_EM: agora });
      R.res.fechados++;
    }
  });
  props.setProperty('PONTO_FECHADO', ontem);
}

/** Lembretes de uma pessoa hoje (no máximo um por marcação). */
function Ponto_lembretesDe_(R, part) {
  var u = part.u, dia = R.p.dia, j = Ponto_jornada_(R.cfg, part.pessoa, dia);
  var inicio = Pto_ms_(dia, j.entrada) - PONTO_ANTES_MIN * 60000, fim = Pto_ms_(dia, j.saida);
  R.cfg.marcacoes.forEach(function (marc) {
    var k = Ponto_chave_(u.id, dia, marc);
    if (R.M[k]) return;   // já lembrada, confirmada, pedida ao RH ou dispensada: nunca um segundo lembrete
    var hr = Ponto_horario_(marc, dia, j, R.M[Ponto_chave_(u.id, dia, 'ALMOCO')] || null);
    if (!hr) return;
    if (hr.lembrete < inicio || hr.lembrete > fim) return;   // fora do horário da pessoa: não manda
    if (R.agora < hr.lembrete || R.agora >= hr.lembrete + PONTO_JANELA_MIN * 60000 || R.agora > fim) return;
    var prev = Pto_horaDe_(new Date(hr.ref)), agora = Pto_agoraIso_(R.quando);
    var base = { USUARIO_ID: u.id, USUARIO_NOME: u.nome, DIA: dia, MARCACAO: marc, PREVISTO: prev, ATUALIZADO_EM: agora };
    var aus = (R.aus[u.id] || [])[0];
    var at = aus ? null : Ponto_emAtendimento_(R.auvo, u.id, R.agora);
    if (aus || at) {
      R.M[k] = SGO_DATA.insert(PONTO_ABAS.MARCACOES, Object.assign(base, { SITUACAO: 'DISPENSADO', CANAL: 'NENHUM',
        OBS: aus ? 'não lembrado: ' + aus.motivo : 'não lembrado: em atendimento no Auvo (tarefa ' + at.id + ', check-in ' + Pto_horaDe_(new Date(at.ci)) + ')' }));
      R.res.dispensados++;
      return;
    }
    // linha ANTES do envio: se a execução cair no meio, este lembrete não é repetido
    var nonce = Ponto_nonce_(), token = Ponto_token_(dia, nonce);
    var reg = SGO_DATA.insert(PONTO_ABAS.MARCACOES, Object.assign(base, { SITUACAO: 'ENVIANDO', LEMBRETE_EM: agora, TOKEN_ID: nonce }));
    R.M[k] = reg;
    var env = Ponto_enviarLembrete_(R, u, marc, prev, reg.ID, token);
    var sit = env.canal === 'NENHUM' ? 'NAO_ENVIADO' : 'LEMBRADO';
    var campos = { SITUACAO: sit, CANAL: env.canal, ENVIO_MOTIVO: Pto_texto_(env.motivo, 480), ATUALIZADO_EM: Pto_agoraIso_(new Date()) };
    // a pessoa pode ter confirmado pela página enquanto o envio acontecia: não apaga a confirmação
    var atual = SGO_DATA.getById(PONTO_ABAS.MARCACOES, reg.ID);
    if (atual && Pto_up_(atual.SITUACAO) !== 'ENVIANDO') delete campos.SITUACAO;
    SGO_DATA.update(PONTO_ABAS.MARCACOES, reg.ID, campos);
    R.M[k] = Object.assign({}, reg, campos);
    if (env.canal === 'NENHUM') R.res.semCanal++; else { R.res.lembretes++; R.res[env.canal === 'WHATSAPP' ? 'whatsapp' : 'email']++; }
  });
}

/** Texto do lembrete para o e-mail (o do WhatsApp é o modelo da Meta). */
function Ponto_textoLembrete_(u, marc, prev, link) {
  var nome = Pto_primeiroNome_(u.nome);
  var abre = { ENTRADA: 'Bom dia, ' + nome + '. Lembrete do ponto: a sua entrada é às ' + prev + '.', ALMOCO: 'Olá, ' + nome + '. Lembrete do ponto: são ' + prev + ', horário da saída para o almoço.',
    RETORNO: 'Olá, ' + nome + '. Lembrete do ponto: o retorno do almoço é às ' + prev + '.', SAIDA: 'Olá, ' + nome + '. Lembrete do ponto: a sua saída é às ' + prev + '.' }[marc];
  return abre + '\n\nSe já bateu o ponto, confirme com um toque no link abaixo. Se esqueceu, a mesma página tem a opção "Esqueci de bater", que vira um pedido de ajuste ao RH.\n\n' +
    'Confirmar: ' + link + '\n\nEste é o único lembrete desta marcação. ' + PONTO_RODAPE;
}

/** Envia pelo WhatsApp oficial (modelo com botão) e, sem ele, por e-mail (reserva). { canal: WHATSAPP|EMAIL|NENHUM, motivo }. */
function Ponto_enviarLembrete_(R, u, marc, prev, rowId, token) {
  var def = PONTO_MARC[marc], link = Ponto_link_(token), titulo = 'Lembrete do ponto: ' + def.rotulo.toLowerCase() + ' às ' + prev;
  var texto = Ponto_textoLembrete_(u, marc, prev, link), motivos = [];
  var w = { ok: 0 };
  try {
    w = SGO_notificar_({ usuarios: [u.id], canais: ['whatsapp'], categoria: 'PONTO', origem: 'PONTO', refId: rowId, titulo: titulo, texto: texto, semLink: true,
      modelo: { nome: def.modelo, parametros: ['@NOME', prev], botao: token }, modeloSemReserva: true, soMeta: true }) || { ok: 0 };
  } catch (e) { w = { ok: 0, motivo: String((e && e.message) || e) }; }
  if (w.ok) return { canal: 'WHATSAPP', motivo: '' };
  motivos.push('WhatsApp: ' + (w.motivo || 'não saiu'));
  if (R.cfg.emailReserva) {
    var m = { ok: 0 };
    try { m = SGO_notificar_({ usuarios: [u.id], canais: ['email'], categoria: 'PONTO', origem: 'PONTO', refId: rowId, titulo: titulo, texto: texto, link: link, rotuloLink: 'Confirmar' }) || { ok: 0 }; }
    catch (e) { m = { ok: 0, motivo: String((e && e.message) || e) }; }
    if (m.ok) return { canal: 'EMAIL', motivo: motivos.join(' ') };
    motivos.push('E-mail: ' + (m.motivo || 'não saiu'));
  }
  return { canal: 'NENHUM', motivo: motivos.join(' ') };
}

// ------------------------------------------------------------
// ESQUECIMENTOS E RESUMO (3º no mês)
// ------------------------------------------------------------
/** Esquecimentos da pessoa no mês: "Esqueci de bater" e não confirmados, em ordem. */
function Ponto_esquecimentos_(linhas, uid, mes) {
  return linhas.filter(function (r) { var s = Pto_up_(r.SITUACAO); return Pto_s_(r.USUARIO_ID) === uid && Pto_mes_(Pto_dia_(r.DIA)) === mes && (s === 'ESQUECI' || s === 'NAO_CONFIRMADO'); })
    .sort(function (a, b) { return (Pto_dia_(a.DIA) + PONTO_ORDEM.indexOf(Pto_up_(a.MARCACAO))).localeCompare(Pto_dia_(b.DIA) + PONTO_ORDEM.indexOf(Pto_up_(b.MARCACAO))); });
}
/** "3 no mês: 1 "Esqueci de bater" (19/10 entrada) e 2 não confirmados (20/10 saída, 21/10 almoço)". */
function Ponto_textoRegistros_(l) {
  var esq = l.filter(function (r) { return Pto_up_(r.SITUACAO) === 'ESQUECI'; }), nc = l.filter(function (r) { return Pto_up_(r.SITUACAO) === 'NAO_CONFIRMADO'; });
  var fmt = function (x) { return x.map(function (r) { return Pto_curto_(Pto_dia_(r.DIA)) + ' ' + ((PONTO_MARC[Pto_up_(r.MARCACAO)] || {}).curto || r.MARCACAO); }).join(', '); };
  var partes = [];
  if (esq.length) partes.push(esq.length + ' "Esqueci de bater" (' + fmt(esq) + ')');
  if (nc.length) partes.push(nc.length + ' não confirmado' + (nc.length > 1 ? 's' : '') + ' (' + fmt(nc) + ')');
  return l.length + ' no mês: ' + partes.join(' e ');
}

/** A partir do Nº esquecimento no mês: um resumo por novo total (no máximo um por pessoa por dia) e uma sugestão no Conduta por mês. */
function Ponto_resumos_(R) {
  var hoje = R.p.dia, meses = [Pto_mes_(hoje)], ontem = Pto_somarDias_(hoje, -1);
  if (Pto_mes_(ontem) !== meses[0]) meses.push(Pto_mes_(ontem));
  var linhas = Pto_ler_(PONTO_ABAS.MARCACOES), resumos = Pto_ler_(PONTO_ABAS.RESUMOS);
  var uids = {};
  linhas.forEach(function (r) { var s = Pto_up_(r.SITUACAO); if (s === 'ESQUECI' || s === 'NAO_CONFIRMADO') uids[Pto_s_(r.USUARIO_ID)] = 1; });
  Object.keys(uids).forEach(function (uid) {
    var u = R.us[uid];
    if (!u || u.vinculo !== 'CLT') return;   // PJ e vínculo vazio não contam esquecimento
    meses.forEach(function (mes) {
      var l = Ponto_esquecimentos_(linhas, uid, mes);
      if (l.length < R.cfg.resumoAPartir) return;
      var chave = 'RES|' + uid + '|' + mes + '|' + l.length, doUid = resumos.filter(function (x) { return Pto_s_(x.USUARIO_ID) === uid; });
      if (doUid.some(function (x) { return Pto_s_(x.CHAVE) === chave; })) return;
      if (doUid.some(function (x) { return Pto_dia_(x.DIA) === hoje; })) return;   // no máximo um resumo por pessoa por dia
      var reg = Ponto_textoRegistros_(l), destinos = [];
      Ponto_destinosRh_(R.cfg, R.us).concat(Ponto_gestaoDe_(uid, R.us)).forEach(function (id) { if (id !== uid && destinos.indexOf(id) < 0) destinos.push(id); });
      var titulo = 'Assistente do ponto: ' + u.nome + ' — ' + l.length + ' esquecimentos em ' + Pto_mesNome_(mes);
      var texto = reg + '.\n\n"Não confirmado" não é prova de falta: a pessoa pode ter batido o ponto sem tocar no botão. Nenhuma medida é tomada automaticamente. ' +
        'Os detalhes estão no SGO+, em Assistente do ponto > Mês. Se for o caso, a gestão decide no Programa de conduta (a sugestão fica em Programa de conduta > Sugestões).';
      destinos.forEach(function (id) { Ponto_avisar_(id, 'RESUMO', titulo, texto, { tipo: 'MES', id: mes }, true); });
      var jaSugerido = doUid.some(function (x) { return Pto_s_(x.MES) === mes && /^SIM/.test(Pto_s_(x.SUGESTAO)); });
      var sug = jaSugerido ? 'SIM (já sugerido neste mês)' : '';
      if (!jaSugerido) {
        try {
          var rs = typeof Conduta_sugestaoDoPonto_ === 'function' ? Conduta_sugestaoDoPonto_({ origem: 'PONTO', sgoUsuarioId: uid, mes: mes, quantidade: l.length, texto: reg + '.', chave: 'PONTO|' + uid + '|' + mes }) : { ok: false, message: 'Programa de conduta indisponível' };
          sug = rs && rs.ok ? 'SIM' : 'NAO: ' + Pto_texto_((rs && rs.message) || 'sem resposta', 200);
          if (rs && rs.ok && !rs.repetida) R.res.sugestoes++;
        } catch (e) { sug = 'NAO: ' + Pto_texto_((e && e.message) || e, 200); }
      }
      var linha = SGO_DATA.insert(PONTO_ABAS.RESUMOS, { CHAVE: chave, USUARIO_ID: uid, USUARIO_NOME: u.nome, MES: mes, QUANTIDADE: l.length, TEXTO: reg, DESTINATARIOS_IDS: destinos.join(','), SUGESTAO: sug, DIA: hoje });
      resumos.push(linha);
      R.res.resumos++;
    });
  });
}

// ------------------------------------------------------------
// E-MAILS GUARDADOS (só no expediente; um por pessoa por rodada; nunca WhatsApp)
// ------------------------------------------------------------
function Ponto_enviarEmailsPendentes_(quando) {
  try {
    var ex = typeof SGO_dentroDoExpediente_ === 'function' ? SGO_dentroDoExpediente_(quando || new Date()) : { dentro: true };
    if (!ex.dentro || typeof SGO_notificar_ !== 'function') return { enviados: 0, fora: !ex.dentro };
    var porPessoa = {}, limite = Pto_somarDias_(Pto_partes_(quando || new Date()).dia, -5), velhos = [];
    Pto_ler_(PONTO_ABAS.AVISOS).forEach(function (v) {
      if (Pto_s_(v.EMAIL_SITUACAO) !== 'PENDENTE') return;
      if (Pto_dia_(v.DATA) && Pto_dia_(v.DATA) < limite) { velhos.push(v); return; }
      (porPessoa[Pto_s_(v.DESTINATARIO_ID)] = porPessoa[Pto_s_(v.DESTINATARIO_ID)] || []).push(v);
    });
    var enviados = 0, agora = Pto_agoraIso_(quando || new Date());
    Object.keys(porPessoa).forEach(function (dest) {
      var l = porPessoa[dest];
      var titulo = l.length === 1 ? l[0].TITULO : 'Assistente do ponto: ' + l.length + ' avisos';
      var texto = l.map(function (v, i) { return (l.length > 1 ? (i + 1) + '. ' + v.TITULO + '\n' : '') + v.TEXTO; }).join('\n\n') + '\n\nVeja no SGO+, em Assistente do ponto.';
      var r = { ok: 0 };
      try { r = SGO_notificar_({ usuarios: [dest], canais: ['email'], titulo: titulo, texto: texto, origem: 'PONTO', categoria: 'PONTO', refId: l.map(function (v) { return v.ID; }).join(',').slice(0, 80) }) || { ok: 0 }; }
      catch (e) { r = { ok: 0, motivo: String((e && e.message) || e) }; }
      var sit = r.ok ? 'ENVIADO' : (r.pulado ? 'PULADO' : 'ERRO');
      if (r.ok) enviados++;
      l.forEach(function (v) { SGO_DATA.update(PONTO_ABAS.AVISOS, v.ID, { EMAIL_SITUACAO: sit, EMAIL_EM: agora, EMAIL_MOTIVO: Pto_texto_(r.motivo, 300) }); });
    });
    velhos.forEach(function (v) { SGO_DATA.update(PONTO_ABAS.AVISOS, v.ID, { EMAIL_SITUACAO: 'PULADO', EMAIL_EM: agora, EMAIL_MOTIVO: 'aviso guardado há mais de 5 dias; não foi mais enviado (continua no sistema)' }); });
    return { enviados: enviados };
  } catch (e) { console.error('Assistente do ponto, e-mails: ' + ((e && e.message) || e)); return { enviados: 0, erro: String((e && e.message) || e) }; }
}
