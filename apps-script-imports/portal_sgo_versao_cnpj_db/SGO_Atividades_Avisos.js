/****************************************************
 * MINHAS ATIVIDADES — AVISOS FORA DA TELA (2026-10-19)
 *
 * Regra do dono: excesso de mensagem pode gerar ação trabalhista. Por isso:
 *  1. No sistema (SGO+ e COMMAND): na hora. O aviso (ATV_AVISOS) aparece
 *     na tela e a central de pendências cobra a atividade vencida até ela
 *     ser concluída ou justificada (a janela de justificativa não fecha).
 *  2. E-mail (conta de e-mail do usuário no cadastro, enviado pelo e-mail
 *     do sistema): só no expediente. Aviso que nasce fora do horário fica
 *     guardado (EMAIL_SITUACAO = PENDENTE) e sai na primeira rodada do
 *     próximo expediente, num e-mail só por pessoa.
 *  3. WhatsApp: só o RESUMO DO DIA, no máximo um por pessoa por dia, em dia
 *     útil, dentro do horário de trabalho, a partir da hora do resumo
 *     (padrão 09:00) e só quando há novidade: atividade nova, que vence
 *     hoje ou que venceu desde o último resumo. Atraso que já foi resumido
 *     não é cobrado de novo pelo WhatsApp (a cobrança continua no sistema).
 *     Vínculo: padrão só CLT; PJ e vínculo vazio ficam no sistema e no
 *     e-mail (Avisos e horários permite incluir). O notificador confere de
 *     novo vínculo, horário e o limite diário (SGO_Notificar.js, categoria
 *     ATIVIDADES), venha a chamada de onde vier.
 *     Modelo da Meta: sgo_atividades_resumo_dia quando aprovado; até lá, o
 *     resumo usa os modelos já aprovados (sgo_atividade_atrasada ou
 *     sgo_atividade_atribuida) com uma atividade e "e mais N".
 *
 * Configuração: propriedade ATV_AVISOS_CFG (JSON) e SGO_EXPEDIENTE
 * (SGO_Expediente.js), pela tela Atividades da equipe > Avisos e horários
 * (Admin e Diretoria). Registro de cada resumo do dia: aba ATV_RESUMOS.
 ****************************************************/

var ATV_AVISOS_CFG_PADRAO = { whatsappResumo: true, horaResumo: '09:00', vinculosWhatsapp: ['CLT'] };
var ATV_VINCULOS_OPCOES = ['CLT', 'PJ', 'VAZIO'];
var ATV_MODELO_RESUMO = 'sgo_atividades_resumo_dia';
var ATV_COLUNAS_RESUMOS = ['ID', 'USUARIO_ID', 'USUARIO_NOME', 'DIA', 'SITUACAO', 'NOVAS', 'VENCEM_HOJE', 'VENCIDAS_NOVAS', 'MODELO', 'MOTIVO', 'AVALIADO_EM', 'CRIADO_EM'];
var ATV_EMAIL_VALIDADE_DIAS = 7; // aviso com e-mail guardado há mais que isso não sai mais (fica PULADO)

function Atividades_abaResumos_() {
  return (SGO_CFG.SHEETS && SGO_CFG.SHEETS.ATV_RESUMOS) || 'ATV_RESUMOS';
}

function Atividades_garantirAbaResumos_() {
  var cache = CacheService.getScriptCache();
  if (cache.get('ATV_RESUMOS_OK_V1')) return;
  var aba = Atividades_abaResumos_();
  CertCal_garantirTabela_(aba, ATV_COLUNAS_RESUMOS);
  ATV_COLUNAS_RESUMOS.forEach(function (c) { CertCal_garantirColuna_(aba, c); });
  CertCal_forcarColunaTexto_(aba, 'DIA');
  CertCal_forcarColunaTexto_(aba, 'AVALIADO_EM');
  cache.put('ATV_RESUMOS_OK_V1', '1', 21600);
}

/** Configuração dos avisos (padrão + o que estiver gravado). Nunca lança. */
function Atividades_avisosCfg_() {
  var g = null;
  try { g = JSON.parse(PropertiesService.getScriptProperties().getProperty('ATV_AVISOS_CFG') || 'null'); } catch (e) { g = null; }
  var c = Object.assign({}, ATV_AVISOS_CFG_PADRAO);
  if (g && typeof g === 'object') {
    if (g.whatsappResumo === false) c.whatsappResumo = false;
    if (SGO_expedienteHoraValida_(g.horaResumo)) c.horaResumo = g.horaResumo;
    if (Array.isArray(g.vinculosWhatsapp)) c.vinculosWhatsapp = g.vinculosWhatsapp.map(function (v) { return String(v).toUpperCase(); }).filter(function (v) { return ATV_VINCULOS_OPCOES.indexOf(v) >= 0; });
  }
  return c;
}

// ------------------------------------------------------------
// E-MAIL: fila em ATV_AVISOS, só no expediente
// ------------------------------------------------------------
/**
 * Envia os e-mails guardados. destinatarios = lista de IDs (só esses) ou null (todos).
 * Fora do expediente não faz nada (ficam guardados). Um e-mail por pessoa por rodada.
 */
function Atividades_enviarEmailsPendentes_(destinatarios) {
  var ex = SGO_dentroDoExpediente_(new Date());
  if (!ex.dentro) return { enviados: 0, guardados: true, motivo: ex.motivo };
  var aba = Atividades_abas_().AVISOS;
  var filtro = destinatarios ? destinatarios.map(String) : null;
  var limite = Atividades_menosDias_(ATV_EMAIL_VALIDADE_DIAS);
  var porPessoa = {}, velhos = [];
  SGO_DATA.getAll(aba).forEach(function (v) {
    if (String(v.EMAIL_SITUACAO || '') !== 'PENDENTE') return;
    var dest = String(v.DESTINATARIO_ID || '');
    if (!dest || (filtro && filtro.indexOf(dest) < 0)) return;
    var data = Atividades_normData_(v.DATA, '00:00');
    if (data && data < limite) { velhos.push(v); return; }
    (porPessoa[dest] = porPessoa[dest] || []).push(v);
  });
  var resultado = [];
  var porId = null;
  Object.keys(porPessoa).forEach(function (dest) {
    if (!porId) { porId = {}; Atividades_todas_().forEach(function (a) { porId[a.ID] = a; }); }
    var lista = porPessoa[dest];
    var titulo, texto;
    var detalhe = function (v) {
      var a = porId[String(v.ATIVIDADE_ID)];
      return v.TEXTO + (a ? '\n' + Atividades_textoNtf_(a, '').replace(/^\n/, '') : '');
    };
    if (lista.length === 1) {
      var a1 = porId[String(lista[0].ATIVIDADE_ID)];
      titulo = String(lista[0].TITULO || 'Aviso de atividade') + (a1 && String(lista[0].TITULO || '').indexOf(a1.TITULO) < 0 ? ': ' + a1.TITULO : '');
      texto = detalhe(lista[0]);
    } else {
      titulo = 'Avisos de atividades (' + lista.length + ')';
      texto = 'Você tem ' + lista.length + ' avisos de atividades:\n\n' + lista.map(function (v, i) { return (i + 1) + '. ' + v.TITULO + '\n' + detalhe(v); }).join('\n\n');
    }
    var r = { ok: 0, erro: 0, pulado: 0 };
    try {
      r = SGO_notificar_({ usuarios: [dest], canais: ['email'], titulo: titulo, texto: texto, origem: 'ATIVIDADES', refId: lista.map(function (v) { return v.ID; }).join(',').slice(0, 80) });
    } catch (e) { r = { ok: 0, erro: 1, pulado: 0, motivo: String((e && e.message) || e) }; }
    var sit = r.ok ? 'ENVIADO' : r.pulado ? 'PULADO' : 'ERRO';
    resultado.push({ dest: dest, ids: lista.map(function (v) { return v.ID; }), sit: sit, motivo: r.motivo || '' });
  });
  if (!resultado.length && !velhos.length) return { enviados: 0 };
  Atividades_comTrava_(function () {
    var agora = Atividades_agora_();
    resultado.forEach(function (x) {
      x.ids.forEach(function (id) { SGO_DATA.update(aba, id, { EMAIL_SITUACAO: x.sit, EMAIL_EM: agora, EMAIL_MOTIVO: Atividades_texto_(x.motivo, 300) }); });
    });
    velhos.forEach(function (v) { SGO_DATA.update(aba, v.ID, { EMAIL_SITUACAO: 'PULADO', EMAIL_EM: agora, EMAIL_MOTIVO: 'aviso guardado há mais de ' + ATV_EMAIL_VALIDADE_DIAS + ' dias; não foi mais enviado' }); });
  });
  return { enviados: resultado.filter(function (x) { return x.sit === 'ENVIADO'; }).length, pessoas: resultado.length };
}

// ------------------------------------------------------------
// WHATSAPP: resumo do dia
// ------------------------------------------------------------
/** O modelo do resumo já foi aprovado pela Meta? (consulta guardada por 6 h; falha = não aprovado). */
function Atividades_modeloResumoAprovado_() {
  var forcado = '';
  try { forcado = String(PropertiesService.getScriptProperties().getProperty('ATV_RESUMO_MODELO_APROVADO') || '').trim().toUpperCase(); } catch (e) {}
  if (forcado === 'SIM') return true;
  if (forcado === 'NAO') return false;
  var cache = CacheService.getScriptCache();
  var guardado = cache.get('ATV_MODELO_RESUMO_OK');
  if (guardado) return guardado === 'SIM';
  var ok = false;
  try {
    if (typeof Chaves_metaListarModelos_ === 'function' && typeof Notificar_credenciaisMeta_ === 'function') {
      var cred = Notificar_credenciaisMeta_();
      if (cred.token && cred.wabaId) {
        var l = Chaves_metaListarModelos_(cred);
        ok = !!(l.ok && (l.lista || []).some(function (m) {
          return String(m.name || '') === ATV_MODELO_RESUMO && String(m.language || '') === NTF_META_IDIOMA && String(m.status || '').toUpperCase() === 'APPROVED';
        }));
      }
    }
  } catch (e) { ok = false; }
  cache.put('ATV_MODELO_RESUMO_OK', ok ? 'SIM' : 'NAO', 21600);
  return ok;
}

/**
 * Conteúdo do resumo de uma pessoa: { novas: [], venceHoje: [], vencidasNovas: [] }.
 * base = quando o último resumo dela foi avaliado (sem resumo anterior: 24 h atrás).
 */
function Atividades_conteudoResumo_(uid, base, agora, todas, avisos) {
  var hoje = agora.slice(0, 10);
  var abertas = todas.filter(function (a) { return a.RESPONSAVEL_ID === uid && Atividades_aberta_(a); });
  var abertasPorId = {};
  abertas.forEach(function (a) { abertasPorId[a.ID] = a; });
  var vistas = {};
  var novas = [];
  avisos.forEach(function (v) {
    if (String(v.DESTINATARIO_ID) !== uid || String(v.TIPO) !== 'NOVA') return;
    var d = Atividades_normData_(v.DATA, '00:00');
    var a = abertasPorId[String(v.ATIVIDADE_ID)];
    if (!a || d <= base || vistas[a.ID]) return;
    vistas[a.ID] = 1; novas.push(a);
  });
  var venceHoje = abertas.filter(function (a) { return a.PREVISAO_ATUAL > agora && String(a.PREVISAO_ATUAL).slice(0, 10) === hoje; });
  var vencidasNovas = abertas.filter(function (a) { return Atividades_vencida_(a, agora) && a.PREVISAO_ATUAL > base; });
  return { novas: novas, venceHoje: venceHoje, vencidasNovas: vencidasNovas };
}

/** Modelo e variáveis do resumo. null = nada a mandar com os modelos disponíveis (motivo em .motivo). */
function Atividades_modeloDoResumo_(c, aprovado) {
  var n = c.novas.length, h = c.venceHoje.length, v = c.vencidasNovas.length;
  if (aprovado) return { nome: ATV_MODELO_RESUMO, parametros: ['@NOME', String(n), String(h), String(v), '@LINK'] };
  var mais = function (lista, rot1, rotN) { return lista.length > 1 ? ' (e mais ' + (lista.length - 1) + ' ' + (lista.length - 1 === 1 ? rot1 : rotN) + ')' : ''; };
  if (v) {
    var a = c.vencidasNovas.slice().sort(function (x, y) { return x.PREVISAO_ATUAL < y.PREVISAO_ATUAL ? -1 : 1; })[0];
    return { nome: 'sgo_atividade_atrasada', parametros: ['@NOME', a.TITULO + mais(c.vencidasNovas, 'atividade vencida', 'atividades vencidas'), Atividades_dataBr_(a.PREVISAO_ATUAL), '@LINK'] };
  }
  if (n) {
    var b = c.novas.slice().sort(function (x, y) { return x.PREVISAO_ATUAL < y.PREVISAO_ATUAL ? -1 : 1; })[0];
    return { nome: 'sgo_atividade_atribuida', parametros: ['@NOME', b.TITULO + mais(c.novas, 'atividade nova', 'atividades novas'), Atividades_dataBr_(b.PREVISAO_ATUAL), '@LINK'] };
  }
  return null;
}

/**
 * Resumo do dia pelo WhatsApp (rotina de hora em hora). Cada pessoa é avaliada UMA vez por dia, na
 * primeira rodada do expediente a partir da hora do resumo; o resultado fica em ATV_RESUMOS.
 * Devolve { avaliados, enviados } ou { fora: motivo }.
 */
function Atividades_resumoDiario_(agoraData) {
  var cfg = Atividades_avisosCfg_();
  if (!cfg.whatsappResumo) return { fora: 'resumo desligado' };
  var quando = agoraData || new Date();
  var ex = SGO_dentroDoExpediente_(quando);
  if (!ex.dentro) return { fora: ex.motivo };
  if (ex.hora < cfg.horaResumo) return { fora: 'antes da hora do resumo (' + cfg.horaResumo + ')' };
  // 20/10/2026: o resumo da Caixa de decisões (gestor com decisão parada) sai primeiro e já leva a contagem das
  // atividades da pessoa; quem o recebeu hoje não recebe um segundo WhatsApp de atividades (SGO_Gestao_Escada.js).
  var gestaoHoje = {};
  try {
    if (typeof Gestao_whatsDiario_ === 'function') Gestao_whatsDiario_(quando);
    if (typeof Notificar_whatsAtividadesHoje_ === 'function') gestaoHoje = Notificar_whatsAtividadesHoje_(['GESTAO']);
  } catch (eG) { console.error('Resumo da gestão: ' + ((eG && eG.message) || eG)); }
  Atividades_garantirAbaResumos_();
  var abaR = Atividades_abaResumos_();
  var agora = Atividades_agora_();
  var registros = SGO_DATA.getAll(abaR);
  var jaHoje = {}, ultimo = {};
  registros.forEach(function (r) {
    var uid = String(r.USUARIO_ID || '');
    var dia = String(r.DIA || '').slice(0, 10);
    if (dia === ex.dia) jaHoje[uid] = true;
    var av = Atividades_normData_(r.AVALIADO_EM, '00:00');
    if (av && (!ultimo[uid] || av > ultimo[uid])) ultimo[uid] = av;
  });
  var pessoas = Atividades_usuariosAtivos_().filter(function (u) { return !jaHoje[u.id]; });
  if (!pessoas.length) return { avaliados: 0, enviados: 0 };
  var todas = Atividades_todas_();
  var avisos = SGO_DATA.getAll(Atividades_abas_().AVISOS);
  var aprovado = null;
  var antes24 = Atividades_menosDias_(1);
  var linhas = [], enviados = 0;
  pessoas.forEach(function (u) {
    var c = Atividades_conteudoResumo_(u.id, ultimo[u.id] || antes24, agora, todas, avisos);
    var reg = { USUARIO_ID: u.id, USUARIO_NOME: u.nome, DIA: ex.dia, NOVAS: c.novas.length, VENCEM_HOJE: c.venceHoje.length, VENCIDAS_NOVAS: c.vencidasNovas.length, MODELO: '', MOTIVO: '', AVALIADO_EM: agora };
    if (!c.novas.length && !c.venceHoje.length && !c.vencidasNovas.length) {
      reg.SITUACAO = 'SEM_NOVIDADE'; reg.MOTIVO = 'nada novo desde o último resumo';
      linhas.push(reg); return;
    }
    if (gestaoHoje[u.id]) {
      reg.SITUACAO = 'NO_RESUMO_DA_GESTAO'; reg.MOTIVO = 'o resumo da Caixa de decisões de hoje já levou a contagem das suas atividades (uma mensagem por dia)';
      linhas.push(reg); return;
    }
    if (aprovado === null) aprovado = Atividades_modeloResumoAprovado_();
    var modelo = Atividades_modeloDoResumo_(c, aprovado);
    if (!modelo) {
      reg.SITUACAO = 'PULADO'; reg.MOTIVO = 'só atividades que vencem hoje: o modelo ' + ATV_MODELO_RESUMO + ' ainda não foi aprovado pela Meta (o aviso segue no sistema)';
      linhas.push(reg); return;
    }
    var texto = 'Resumo das suas atividades no SGO+.\nNovas para você: ' + c.novas.length + '\nVencem hoje: ' + c.venceHoje.length + '\nVenceram desde o último resumo: ' + c.vencidasNovas.length;
    var r = { ok: 0, erro: 0, pulado: 0 };
    try {
      r = SGO_notificar_({ usuarios: [u.id], canais: ['whatsapp'], categoria: 'ATIVIDADES', origem: 'ATIVIDADES_RESUMO', refId: 'RESUMO-' + ex.dia + '-' + u.id,
        titulo: 'Resumo das suas atividades', texto: texto, modelo: modelo });
    } catch (e) { r = { ok: 0, erro: 1, pulado: 0, motivo: String((e && e.message) || e) }; }
    reg.MODELO = modelo.nome;
    reg.SITUACAO = r.ok ? 'ENVIADO' : r.pulado ? 'PULADO' : 'ERRO';
    reg.MOTIVO = r.ok ? 'mensagem aceita pelo provedor' : (r.motivo || 'veja Notificações enviadas');
    if (r.ok) enviados++;
    linhas.push(reg);
  });
  if (linhas.length) {
    Atividades_comTrava_(function () { SGO_DATA.insertMany(abaR, linhas); });
  }
  return { avaliados: linhas.length, enviados: enviados };
}

// ------------------------------------------------------------
// TELA: Avisos e horários (Admin e Diretoria)
// ------------------------------------------------------------
/** payload.salvar = { expediente: { ini, fim, dias, feriados }, avisos: { whatsappResumo, horaResumo, vinculosWhatsapp } } grava; sem salvar só lê. */
function Atividades_apiConfigAvisos(sessionId, payload) {
  return Atividades_resposta_(function () {
    var eu = Atividades_sessao_(sessionId);
    if (eu.perfil !== 'ADMIN' && eu.perfil !== 'DIRETORIA') {
      throw new Error('Não foi possível abrir Avisos e horários: esta configuração é dos perfis Admin e Diretoria. Os avisos continuam funcionando com o que já está configurado.');
    }
    var p = payload || {};
    if (p.salvar) {
      var s = p.salvar;
      var exp = SGO_expedienteGravar_(s.expediente || {});
      var a = s.avisos || {};
      var hora = String(a.horaResumo || '');
      if (!SGO_expedienteHoraValida_(hora)) throw new Error('Não foi possível salvar: a hora do resumo precisa estar no formato HH:MM (por exemplo 09:00).');
      if (hora < exp.ini || hora >= exp.fim) throw new Error('Não foi possível salvar: a hora do resumo (' + hora + ') precisa ficar dentro do horário de trabalho (' + exp.ini + ' a ' + exp.fim + ').');
      var vinc = (Array.isArray(a.vinculosWhatsapp) ? a.vinculosWhatsapp : []).map(function (v) { return String(v).toUpperCase(); }).filter(function (v, i, l) { return ATV_VINCULOS_OPCOES.indexOf(v) >= 0 && l.indexOf(v) === i; });
      var cfg = { whatsappResumo: a.whatsappResumo !== false, horaResumo: hora, vinculosWhatsapp: vinc };
      PropertiesService.getScriptProperties().setProperty('ATV_AVISOS_CFG', JSON.stringify(cfg));
      try { SGO_DATA.log('ATIVIDADES_AVISOS_CFG', eu.usuario, 'Avisos e horários: ' + JSON.stringify({ expediente: { ini: exp.ini, fim: exp.fim, dias: exp.dias, feriados: exp.feriados }, avisos: cfg }).slice(0, 900), 'ATIVIDADES'); } catch (e) {}
    }
    var e2 = SGO_expediente_();
    var agoraEx = SGO_dentroDoExpediente_(new Date(), e2);
    Atividades_garantirAbaResumos_();
    var hoje = agoraEx.dia;
    var resumosHoje = SGO_DATA.getAll(Atividades_abaResumos_()).filter(function (r) { return String(r.DIA || '').slice(0, 10) === hoje; })
      .map(function (r) { return { nome: SGO_UTILS.safe(r.USUARIO_NOME), situacao: SGO_UTILS.safe(r.SITUACAO), motivo: SGO_UTILS.safe(r.MOTIVO), novas: Number(r.NOVAS) || 0, venceHoje: Number(r.VENCEM_HOJE) || 0, vencidasNovas: Number(r.VENCIDAS_NOVAS) || 0 }; });
    var emailsGuardados = SGO_DATA.getAll(Atividades_abas_().AVISOS).filter(function (v) { return String(v.EMAIL_SITUACAO || '') === 'PENDENTE'; }).length;
    return {
      expediente: { ini: e2.ini, fim: e2.fim, dias: e2.dias, feriados: e2.feriados }, avisos: Atividades_avisosCfg_(),
      agora: agoraEx, vinculosOpcoes: ATV_VINCULOS_OPCOES, resumosHoje: resumosHoje, emailsGuardados: emailsGuardados,
      modeloResumo: ATV_MODELO_RESUMO, message: p.salvar ? 'Avisos e horários salvos.' : ''
    };
  });
}
