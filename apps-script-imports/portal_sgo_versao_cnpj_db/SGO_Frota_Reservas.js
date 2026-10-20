/****************************************************
 * FROTA — RESERVAS DE VEÍCULO (20/10/2026)
 *
 * Problema que resolve (relato do dono): viagem marcada para o dia seguinte, a equipe chega e o carro foi
 * retirado por outra pessoa para outra coisa; horas de espera e viagem atrasada. A reserva garante o veículo.
 *
 * Regras (padrão seguro; confirmar com o dono):
 *  1. Qualquer condutor ativo com CNH válida até o fim do período reserva um veículo (início e fim previstos,
 *     destino, motivo, passageiros opcionais, ligação opcional a O.S. do Auvo, atividade ou cliente). Sem
 *     aprovação. A gestão (Administrador, Gestor, Diretoria) reserva em nome de outro e cancela com
 *     justificativa; o reservante é avisado.
 *  2. Sem sobreposição: o mesmo veículo não tem duas reservas no mesmo horário, nem reserva sobre manutenção
 *     programada, parada registrada ou retirada em andamento (até a devolução prevista). O sistema sugere os
 *     veículos livres no mesmo período. A conferência final é feita dentro da trava do sistema (LockService),
 *     relendo o banco: dois pedidos ao mesmo tempo não gravam as duas reservas.
 *  3. A retirada respeita a reserva: ao retirar, a pessoa informa a devolução prevista. Se o veículo tem
 *     reserva de outra pessoa (ou manutenção programada) começando antes da devolução prevista mais a folga
 *     (padrão 60 min, configurável), a retirada é recusada com quem reservou, para quando e os veículos livres
 *     agora. Só a gestão libera, com justificativa; o reservante é avisado na hora, com a sugestão de outro
 *     veículo. O dono da reserva retira normalmente (até 2 h antes do início) e a reserva vira "iniciada".
 *  4. Devolução prevista vencida com reserva a seguir (nas próximas 24 h): cobrança ao condutor atual (aviso no
 *     sistema, atividade em Minhas atividades e e-mail no expediente; WhatsApp só se a reserva seguinte for no
 *     mesmo dia, dentro da regra sutil do notificador: vínculo CLT, dia útil, horário de trabalho, uma mensagem
 *     por pessoa por dia) e aviso à gestão e ao próximo reservante. Se a reserva começar com o veículo ainda
 *     fora, o atraso conta como "atraso que afetou reserva".
 *  5. Véspera (último dia útil antes do início, a partir das 14:00): lembrete ao reservante (sistema; e-mail no
 *     expediente) e conferência: veículo ativo, sem parada ou manutenção programada no período, sem manutenção
 *     vencida, documentos válidos na data, CNH válida e veículo de volta a tempo. Problema avisa o reservante e
 *     a gestão, com os veículos livres para troca. Problema que aparece depois da véspera avisa de novo.
 *  6. Não comparecimento: reserva não iniciada até 1 h (configurável) após o início vira "não utilizada" e
 *     libera o veículo (o reservante é avisado). Se o veículo ainda estava fora com outra pessoa, a tolerância
 *     conta da devolução. O reservante cancela a qualquer momento antes de retirar.
 *  7. Manutenção programada (só a gestão) ocupa a agenda do veículo: bloqueia reserva e retirada no período.
 *  8. Nada é apagado: cancelada, não utilizada e concluída ficam no histórico, com quem e quando.
 *
 * Tabelas (criadas sob demanda, só colunas novas): REG_FROTA_RESERVA, REG_FROTA_RESERVA_EVENTO (indicadores:
 * recusa por sobreposição, retirada bloqueada, liberação pela gestão, atraso, não utilizada, conferência) e
 * REG_FROTA_RESERVA_AVISO (fila dos avisos: e-mail só no expediente). Na movimentação: devolução prevista,
 * reserva iniciada e reserva liberada.
 *
 * Datas: dd/mm/aaaa e hh:mm no horário de Brasília, na mesma régua das retiradas (Frota_parseDataHora_ e
 * Frota_agoraSP_). Para a tela vão só textos e minutos relativos (nunca um instante cru: o fuso do servidor
 * pode ser outro).
 * Tela: SGO_Frota_ReservasTela.js. Rotina: chamada pela rotina da Frota (Frota_rastreadorRotina, a cada
 * 2 min), no máximo a cada 4 min. COMMAND: ponte assinada (frota.reservas.*).
 ****************************************************/

var FROTA_RES_ABA = 'REG_FROTA_RESERVA';
var FROTA_RES_COLUNAS = [
  'ID', 'CODIGO', 'TIPO', 'VEICULO_ID', 'PLACA', 'CONDUTOR_ID', 'CONDUTOR_NOME', 'USUARIO_ID',
  'DATA_INICIO', 'HORA_INICIO', 'DATA_FIM', 'HORA_FIM', 'DESTINO', 'MOTIVO', 'PASSAGEIROS',
  'VINCULO_TIPO', 'VINCULO_ID', 'VINCULO_TEXTO', 'SITUACAO',
  'CRIADA_POR_ID', 'CRIADA_POR_NOME', 'PELA_GESTAO',
  'MOVIMENTACAO_ID', 'INICIADA_EM', 'CONCLUIDA_EM',
  'CANCELADA_EM', 'CANCELADA_POR_ID', 'CANCELADA_POR_NOME', 'MOTIVO_CANCELAMENTO', 'NAO_UTILIZADA_EM',
  'LIBERADA_EM', 'LIBERADA_POR_NOME', 'LIBERADA_JUSTIFICATIVA', 'LIBERADA_MOV_ID',
  'LEMBRETE_EM', 'CONFERENCIA_EM', 'CONFERENCIA_PROBLEMAS', 'HISTORICO_JSON', 'ATUALIZADO_EM', 'CRIADO_EM'
];
var FROTA_RES_ABA_EVENTOS = 'REG_FROTA_RESERVA_EVENTO';
var FROTA_RES_COLUNAS_EVENTOS = ['ID', 'QUANDO', 'TIPO', 'CHAVE', 'RESERVA_ID', 'CODIGO', 'VEICULO_ID', 'PLACA', 'USUARIO_ID', 'USUARIO_NOME',
  'AFETADO_ID', 'AFETADO_NOME', 'MOVIMENTACAO_ID', 'ATIVIDADE_ID', 'DATA_REF', 'JUSTIFICATIVA', 'DETALHE', 'CRIADO_EM'];
var FROTA_RES_ABA_AVISOS = 'REG_FROTA_RESERVA_AVISO';
var FROTA_RES_COLUNAS_AVISOS = ['ID', 'QUANDO', 'TIPO', 'RESERVA_ID', 'DESTINATARIO_ID', 'DESTINATARIO_NOME', 'TITULO', 'TEXTO',
  'EMAIL_SITUACAO', 'EMAIL_EM', 'EMAIL_MOTIVO', 'WHATSAPP_SITUACAO', 'WHATSAPP_MOTIVO', 'CRIADO_EM'];
var FROTA_RES_COLUNAS_MOV = ['DEVOLUCAO_PREVISTA_DATA', 'DEVOLUCAO_PREVISTA_HORA', 'DEVOLUCAO_PREVISTA_ORIGEM', 'RESERVA_ID', 'RESERVA_LIBERADA_ID', 'RESERVA_LIBERADA_JUSTIFICATIVA'];

var FROTA_RES_PROP_CFG = 'FROTA_RESERVAS_CFG';
var FROTA_RES_CFG_PADRAO = { folgaMin: 60, toleranciaMin: 60, antecipacaoMin: 120, horaVespera: '14:00', antecedenciaMaxDias: 90, duracaoMaxDias: 15 };
var FROTA_RES_SITUACOES = { RESERVADA: 'Reservada', INICIADA: 'Em uso (retirada feita)', CONCLUIDA: 'Concluída', CANCELADA: 'Cancelada', NAO_UTILIZADA: 'Não utilizada' };
var FROTA_RES_VINCULOS = { AUVO: 'O.S. do Auvo', ATIVIDADE: 'Atividade', CLIENTE: 'Cliente' };
var FROTA_RES_SEM_PREVISTA_H = 2;          // retirada antiga sem devolução prevista: ocupa até agora + 2 h
var FROTA_RES_ATRASO_JANELA_H = 24;        // devolução vencida cobra quando a próxima reserva começa em até 24 h
var FROTA_RES_AVISO_INFO_DIAS = 3;         // avisos informativos (cancelada, não utilizada, liberada) ficam 3 dias no Início
var FROTA_RES_AVISO_EMAIL_VALIDADE_DIAS = 3;
var FROTA_RES_PROBLEMA_JANELA_DIAS = 7;    // pendência de reserva com problema: reservas dos próximos 7 dias
var FROTA_RES_RODADA_SEG = 240;
var FROTA_RES_SISTEMA = { userId: '', usuario: 'sistema', nome: 'Rotina das reservas da Frota', perfil: 'SISTEMA', gestao: true };
var FROTA_RES_GESTAO_TXT = 'a gestão (Administrador, Gestor ou Diretoria)';

// ------------------------------------------------------------
// INFRA
// ------------------------------------------------------------
function FrotaRes_garantirAbas_() {
  CertCal_garantirTabela_(FROTA_RES_ABA, FROTA_RES_COLUNAS);
  FROTA_RES_COLUNAS.forEach(function (c) { CertCal_garantirColuna_(FROTA_RES_ABA, c); });
  CertCal_garantirTabela_(FROTA_RES_ABA_EVENTOS, FROTA_RES_COLUNAS_EVENTOS);
  FROTA_RES_COLUNAS_EVENTOS.forEach(function (c) { CertCal_garantirColuna_(FROTA_RES_ABA_EVENTOS, c); });
  CertCal_garantirTabela_(FROTA_RES_ABA_AVISOS, FROTA_RES_COLUNAS_AVISOS);
  FROTA_RES_COLUNAS_AVISOS.forEach(function (c) { CertCal_garantirColuna_(FROTA_RES_ABA_AVISOS, c); });
  FROTA_RES_COLUNAS_MOV.forEach(function (c) { CertCal_garantirColuna_(SGO_CFG.SHEETS.REG_FROTA_MOVIMENTACAO, c); });
  // Datas e horas são texto (a planilha antiga convertia "08:00" num horário de 1899).
  ['DATA_INICIO', 'HORA_INICIO', 'DATA_FIM', 'HORA_FIM'].forEach(function (c) { CertCal_forcarColunaTexto_(FROTA_RES_ABA, c); });
  CertCal_forcarColunaTexto_(SGO_CFG.SHEETS.REG_FROTA_MOVIMENTACAO, 'DEVOLUCAO_PREVISTA_DATA');
  CertCal_forcarColunaTexto_(SGO_CFG.SHEETS.REG_FROTA_MOVIMENTACAO, 'DEVOLUCAO_PREVISTA_HORA');
}

function FrotaRes_cfg_() {
  var c = Object.assign({}, FROTA_RES_CFG_PADRAO), g = null;
  try { g = JSON.parse(PropertiesService.getScriptProperties().getProperty(FROTA_RES_PROP_CFG) || 'null'); } catch (e) { g = null; }
  if (g && typeof g === 'object') {
    var faixa = function (v, min, max) { v = Number(v); return isFinite(v) && v >= min && v <= max ? Math.round(v) : null; };
    if (faixa(g.folgaMin, 0, 240) !== null) c.folgaMin = faixa(g.folgaMin, 0, 240);
    if (faixa(g.toleranciaMin, 15, 240) !== null) c.toleranciaMin = faixa(g.toleranciaMin, 15, 240);
    if (faixa(g.antecipacaoMin, 0, 480) !== null) c.antecipacaoMin = faixa(g.antecipacaoMin, 0, 480);
    if (faixa(g.antecedenciaMaxDias, 1, 365) !== null) c.antecedenciaMaxDias = faixa(g.antecedenciaMaxDias, 1, 365);
    if (faixa(g.duracaoMaxDias, 1, 60) !== null) c.duracaoMaxDias = faixa(g.duracaoMaxDias, 1, 60);
    if (/^([01]\d|2[0-3]):[0-5]\d$/.test(String(g.horaVespera || ''))) c.horaVespera = g.horaVespera;
  }
  return c;
}

function FrotaRes_s_(v) { return SGO_UTILS.safe(v); }
function FrotaRes_up_(v) { return SGO_UTILS.safeUpper(v); }
function FrotaRes_agora_() { return Frota_agoraSP_().quando.getTime(); }
function FrotaRes_2_(n) { return ('0' + n).slice(-2); }

/** "dd/mm/aaaa" ou "aaaa-mm-dd" + "hh:mm" -> ms na régua das retiradas, ou null. */
function FrotaRes_ms_(data, hora) {
  var d = String(data || '').trim();
  var iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d);
  if (iso) d = iso[3] + '/' + iso[2] + '/' + iso[1];
  var h = String(hora || '').trim();
  if (/^\d:\d{2}$/.test(h)) h = '0' + h;
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(d) || !/^\d{2}:\d{2}$/.test(h)) return null;
  var q = Frota_parseDataHora_(d, h);
  return q ? q.getTime() : null;
}
function FrotaRes_data_(ms) { var d = new Date(ms); return FrotaRes_2_(d.getDate()) + '/' + FrotaRes_2_(d.getMonth() + 1) + '/' + d.getFullYear(); }
function FrotaRes_hora_(ms) { var d = new Date(ms); return FrotaRes_2_(d.getHours()) + ':' + FrotaRes_2_(d.getMinutes()); }
function FrotaRes_txt_(ms) { return ms === null || ms === undefined ? '' : FrotaRes_data_(ms) + ' ' + FrotaRes_hora_(ms); }
function FrotaRes_iniDia_(ms) { var d = new Date(ms); d.setHours(0, 0, 0, 0); return d.getTime(); }
var FROTA_RES_SEMANA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

/** "hoje 14:00", "amanhã 08:00", "qua 22/10 08:00". */
function FrotaRes_quando_(ms, agora) {
  var dia = FrotaRes_iniDia_(ms), hoje = FrotaRes_iniDia_(agora || FrotaRes_agora_());
  var dif = Math.round((dia - hoje) / 86400000);
  var d = new Date(ms);
  if (dif === 0) return 'hoje ' + FrotaRes_hora_(ms);
  if (dif === 1) return 'amanhã ' + FrotaRes_hora_(ms);
  if (dif === -1) return 'ontem ' + FrotaRes_hora_(ms);
  return FROTA_RES_SEMANA[d.getDay()] + ' ' + FrotaRes_2_(d.getDate()) + '/' + FrotaRes_2_(d.getMonth() + 1) + ' ' + FrotaRes_hora_(ms);
}
function FrotaRes_periodo_(ini, fim) {
  if (FrotaRes_iniDia_(ini) === FrotaRes_iniDia_(fim)) return FrotaRes_txt_(ini) + ' às ' + FrotaRes_hora_(fim);
  return FrotaRes_txt_(ini) + ' a ' + FrotaRes_txt_(fim);
}
function FrotaRes_iniMs_(r) { return FrotaRes_ms_(Frota_textoData_(r.DATA_INICIO), Frota_textoHora_(r.HORA_INICIO)); }
function FrotaRes_fimMs_(r) { return FrotaRes_ms_(Frota_textoData_(r.DATA_FIM), Frota_textoHora_(r.HORA_FIM)); }
function FrotaRes_previstaMs_(m) { return FrotaRes_ms_(Frota_textoData_(m.DEVOLUCAO_PREVISTA_DATA), Frota_textoHora_(m.DEVOLUCAO_PREVISTA_HORA)); }
function FrotaRes_saidaMs_(m) { var q = Frota_parseDataHora_(m.DATA_SAIDA, m.HORA_SAIDA); return q ? q.getTime() : null; }
function FrotaRes_chegadaMs_(m) { var q = Frota_parseDataHora_(m.DATA_CHEGADA, m.HORA_CHEGADA); return q ? q.getTime() : null; }

function FrotaRes_ehGestaoPerfil_(perfil) { return ['ADMIN', 'GESTOR', 'DIRETORIA'].indexOf(FrotaRes_up_(perfil)) >= 0; }

/** Sessão da equipe (cliente não usa a Frota) com a marca de gestão. */
function FrotaRes_sessao_(sessionId) {
  var s = Frota_exigirEquipe_(sessionId);
  return { userId: FrotaRes_s_(s.userId), usuario: FrotaRes_s_(s.usuario), nome: FrotaRes_s_(s.nome) || FrotaRes_s_(s.usuario), perfil: FrotaRes_up_(s.perfil), gestao: FrotaRes_ehGestaoPerfil_(s.perfil) };
}

function FrotaRes_todas_() { return Frota_lerSeExistir_(FROTA_RES_ABA); }
function FrotaRes_eventos_() { return Frota_lerSeExistir_(FROTA_RES_ABA_EVENTOS); }
function FrotaRes_condutores_() { var m = {}; Frota_lerSeExistir_(SGO_CFG.SHEETS.CAD_CONDUTORES).forEach(function (c) { m[FrotaRes_s_(c.ID)] = c; }); return m; }
function FrotaRes_veiculos_() { var m = {}; Frota_lerSeExistir_(SGO_CFG.SHEETS.CAD_VEICULOS).forEach(function (v) { m[FrotaRes_s_(v.ID)] = v; }); return m; }
function FrotaRes_veiculosAtivos_() {
  return Frota_lerSeExistir_(SGO_CFG.SHEETS.CAD_VEICULOS).filter(function (v) { return FrotaRes_up_(v.STATUS) !== 'INATIVO'; })
    .sort(function (a, b) { return FrotaRes_s_(a.PLACA).localeCompare(FrotaRes_s_(b.PLACA)); });
}
function FrotaRes_gestores_() {
  return Frota_lerSeExistir_(SGO_CFG.SHEETS.CAD_USUARIOS).filter(function (u) { return FrotaRes_ehGestaoPerfil_(u.PERFIL) && FrotaRes_up_(u.STATUS || 'ATIVO') !== 'INATIVO'; })
    .map(function (u) { return FrotaRes_s_(u.ID); });
}
function FrotaRes_hist_(r, sessao, acao, texto) {
  var h = [];
  try { h = JSON.parse(String(r && r.HISTORICO_JSON || '[]')); if (!Array.isArray(h)) h = []; } catch (e) { h = []; }
  h.push({ em: Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'dd/MM/yyyy HH:mm'), por: FrotaRes_s_(sessao && (sessao.nome || sessao.usuario)) || 'Sistema', acao: acao, texto: String(texto || '').slice(0, 600) });
  return JSON.stringify(h.slice(-60));
}
function FrotaRes_texto_(v, min, rotulo, max, exemplo) {
  var t = String(v || '').replace(/\s+/g, ' ').trim();
  if (t.length < min) throw new Error('Preencha ' + rotulo + ' (mínimo de ' + min + ' caracteres' + (exemplo ? ', por exemplo: "' + exemplo + '"' : '') + ') e toque em Reservar de novo.');
  return t.slice(0, max || 300);
}
function FrotaRes_proximoCodigo_(todas, agora) {
  var ano = new Date(agora || FrotaRes_agora_()).getFullYear(), max = 0, pre = 'RV-' + ano + '-';
  todas.forEach(function (r) { var c = FrotaRes_s_(r.CODIGO); if (c.indexOf(pre) === 0) { var n = Number(c.slice(pre.length)); if (n > max) max = n; } });
  return pre + ('000' + (max + 1)).slice(-4);
}
function FrotaRes_comTrava_(fn) {
  var lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try { return fn(); } finally {
    try { SpreadsheetApp.flush(); } catch (e) {}
    lock.releaseLock();
  }
}
function FrotaRes_evento_(tipo, o) {
  try {
    var reg = SGO_DATA.normalizarObjetoParaSheet(FROTA_RES_ABA_EVENTOS, SGO_DATA.gerarRegistroBase({
      QUANDO: Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'dd/MM/yyyy HH:mm'), TIPO: tipo, CHAVE: o.chave || '',
      RESERVA_ID: o.reservaId || '', CODIGO: o.codigo || '', VEICULO_ID: o.veiculoId || '', PLACA: o.placa || '',
      USUARIO_ID: FrotaRes_s_(o.sessao && o.sessao.userId), USUARIO_NOME: FrotaRes_s_(o.sessao && (o.sessao.nome || o.sessao.usuario)),
      AFETADO_ID: o.afetadoId || '', AFETADO_NOME: o.afetadoNome || '', MOVIMENTACAO_ID: o.movimentacaoId || '', ATIVIDADE_ID: o.atividadeId || '',
      DATA_REF: o.dataRef || '', JUSTIFICATIVA: String(o.justificativa || '').slice(0, 500), DETALHE: String(o.detalhe || '').slice(0, 1000)
    }));
    SGO_DATA.insert(FROTA_RES_ABA_EVENTOS, reg);
    return reg;
  } catch (e) { console.error('Reservas, evento ' + tipo + ': ' + ((e && e.message) || e)); return null; }
}
function FrotaRes_temEvento_(chave) {
  return FrotaRes_eventos_().some(function (e) { return FrotaRes_s_(e.CHAVE) === chave; });
}
function FrotaRes_usuarioDoCondutor_(condutor) { return FrotaRes_s_(condutor && condutor.USUARIO_ID); }

// ------------------------------------------------------------
// AVISOS (sistema: central de pendências; e-mail: fila, só no expediente; WhatsApp: regra sutil do notificador)
// ------------------------------------------------------------
function FrotaRes_noExpediente_(o) {
  if (o && typeof o.expediente === 'boolean') return o.expediente;
  return typeof SGO_dentroDoExpediente_ === 'function' ? !!SGO_dentroDoExpediente_(new Date()).dentro : true;
}

/**
 * Guarda o aviso (um por destinatário) para o e-mail sair no expediente; WhatsApp só quando pedido e só pelo
 * notificador com a categoria FROTA_RESERVAS (vínculo CLT, dia útil, horário de trabalho, uma por pessoa por dia).
 * Nunca derruba a ação principal.
 */
function FrotaRes_avisar_(o) {
  try {
    var destinos = [];
    (o.destinos || []).forEach(function (d) { d = FrotaRes_s_(d); if (d && destinos.indexOf(d) < 0 && d !== FrotaRes_s_(o.exceto)) destinos.push(d); });
    var usuarios = {};
    Frota_lerSeExistir_(SGO_CFG.SHEETS.CAD_USUARIOS).forEach(function (u) { usuarios[FrotaRes_s_(u.ID)] = u; });
    destinos.forEach(function (uid) {
      var reg = SGO_DATA.normalizarObjetoParaSheet(FROTA_RES_ABA_AVISOS, SGO_DATA.gerarRegistroBase({
        QUANDO: SGO_UTILS.nowIso(), TIPO: o.tipo || '', RESERVA_ID: o.reservaId || '', DESTINATARIO_ID: uid, DESTINATARIO_NOME: FrotaRes_s_((usuarios[uid] || {}).NOME),
        TITULO: String(o.titulo || 'Reserva de veículo').slice(0, 180), TEXTO: String(o.texto || '').slice(0, 3000),
        EMAIL_SITUACAO: o.email === false ? '' : 'PENDENTE', EMAIL_EM: '', EMAIL_MOTIVO: '', WHATSAPP_SITUACAO: '', WHATSAPP_MOTIVO: ''
      }));
      if (o.whatsapp && typeof SGO_notificar_ === 'function') {
        var r = SGO_notificar_({ usuarios: [uid], canais: ['whatsapp'], titulo: o.titulo, texto: o.textoWhatsapp || o.texto, origem: 'FROTA_RESERVAS', refId: reg.ID, categoria: 'FROTA_RESERVAS' });
        reg.WHATSAPP_SITUACAO = r && r.ok ? 'ENVIADO' : (r && r.erro ? 'ERRO' : 'PULADO');
        reg.WHATSAPP_MOTIVO = String((r && r.motivo) || '').slice(0, 300);
      }
      SGO_DATA.insert(FROTA_RES_ABA_AVISOS, reg);
    });
  } catch (e) { console.error('Reservas, aviso: ' + ((e && e.message) || e)); }
}

/** Envia os e-mails guardados (só no expediente; os de mais de 3 dias ficam PULADO). */
function FrotaRes_enviarEmails_(o) {
  if (!FrotaRes_noExpediente_(o)) return { enviados: 0, guardados: true };
  var enviados = 0, limite = Date.now() - FROTA_RES_AVISO_EMAIL_VALIDADE_DIAS * 86400000;
  Frota_lerSeExistir_(FROTA_RES_ABA_AVISOS).forEach(function (a) {
    if (FrotaRes_s_(a.EMAIL_SITUACAO) !== 'PENDENTE') return;
    var quando = new Date(FrotaRes_s_(a.QUANDO)).getTime();
    if (isFinite(quando) && quando < limite) { SGO_DATA.update(FROTA_RES_ABA_AVISOS, a.ID, { EMAIL_SITUACAO: 'PULADO', EMAIL_EM: SGO_UTILS.nowIso(), EMAIL_MOTIVO: 'guardado há mais de ' + FROTA_RES_AVISO_EMAIL_VALIDADE_DIAS + ' dias' }); return; }
    var r = { ok: 0 };
    try { r = typeof SGO_notificar_ === 'function' ? SGO_notificar_({ usuarios: [FrotaRes_s_(a.DESTINATARIO_ID)], canais: ['email'], titulo: a.TITULO, texto: a.TEXTO, origem: 'FROTA_RESERVAS', refId: a.ID }) : { pulado: 1, motivo: 'notificador ausente' }; }
    catch (e) { r = { erro: 1, motivo: String((e && e.message) || e) }; }
    SGO_DATA.update(FROTA_RES_ABA_AVISOS, a.ID, { EMAIL_SITUACAO: r.ok ? 'ENVIADO' : (r.erro ? 'ERRO' : 'PULADO'), EMAIL_EM: SGO_UTILS.nowIso(), EMAIL_MOTIVO: String(r.motivo || '').slice(0, 300) });
    if (r.ok) enviados++;
  });
  return { enviados: enviados };
}

// ------------------------------------------------------------
// OCUPAÇÃO DO VEÍCULO E CONFLITOS
// ------------------------------------------------------------
/** Tudo o que ocupa a agenda do veículo: reservas ativas, manutenção programada, paradas e retirada em andamento. */
function FrotaRes_ocupacoes_(vid, o) {
  o = o || {};
  var agora = o.agora || FrotaRes_agora_(), out = [];
  var cnd = o.condutores || FrotaRes_condutores_();
  (o.reservas || FrotaRes_todas_()).forEach(function (r) {
    if (FrotaRes_s_(r.VEICULO_ID) !== vid || FrotaRes_up_(r.SITUACAO) !== 'RESERVADA' || FrotaRes_s_(r.ID) === FrotaRes_s_(o.ignorarReservaId)) return;
    var ini = FrotaRes_iniMs_(r), fim = FrotaRes_fimMs_(r);
    if (ini === null || fim === null) return;
    var manut = FrotaRes_up_(r.TIPO) === 'MANUTENCAO';
    out.push({ tipo: manut ? 'MANUTENCAO' : 'RESERVA', ini: ini, fim: fim, reserva: r, condutorId: FrotaRes_s_(r.CONDUTOR_ID),
      texto: manut ? 'manutenção programada' + (r.MOTIVO ? ' (' + FrotaRes_s_(r.MOTIVO) + ')' : '') + ' de ' + FrotaRes_periodo_(ini, fim)
        : 'reserva ' + FrotaRes_s_(r.CODIGO) + ' de ' + (FrotaRes_s_(r.CONDUTOR_NOME) || 'outro condutor') + ' de ' + FrotaRes_periodo_(ini, fim) });
  });
  (o.movs || Frota_lerSeExistir_(SGO_CFG.SHEETS.REG_FROTA_MOVIMENTACAO)).forEach(function (m) {
    if (FrotaRes_s_(m.VEICULO_ID) !== vid || FrotaRes_up_(m.STATUS) !== 'EM_ANDAMENTO') return;
    var ini = FrotaRes_saidaMs_(m), prev = FrotaRes_previstaMs_(m);
    if (ini === null) ini = agora;
    var fim = prev !== null ? Math.max(prev, agora) : agora + FROTA_RES_SEM_PREVISTA_H * 3600000;
    var nome = FrotaRes_s_((cnd[FrotaRes_s_(m.CONDUTOR_ID)] || {}).NOME) || 'outro condutor';
    out.push({ tipo: 'RETIRADA', ini: ini, fim: fim, mov: m, condutorId: FrotaRes_s_(m.CONDUTOR_ID), semPrevista: prev === null, atrasada: prev !== null && prev < agora,
      texto: 'retirado por ' + nome + ' desde ' + FrotaRes_txt_(ini) + (prev !== null ? ', devolução prevista ' + FrotaRes_txt_(prev) + (prev < agora ? ' (atrasada)' : '') : ' (sem devolução prevista informada)') });
  });
  (o.paradas || Frota_lerSeExistir_(SGO_CFG.SHEETS.REG_FROTA_PARADA)).forEach(function (p) {
    if (FrotaRes_s_(p.VEICULO_ID) !== vid || FrotaRes_s_(p.EXCLUIDO_EM)) return;
    var a = FrotaRes_ms_(Frota_textoData_(p.DATA_INICIO), '00:00');
    if (a === null) return;
    var b = FrotaRes_s_(p.DATA_FIM) ? FrotaRes_ms_(Frota_textoData_(p.DATA_FIM), '23:59') : agora + 400 * 86400000;
    if (b === null || b < agora - 86400000) return;
    out.push({ tipo: 'PARADA', ini: a, fim: b, parada: p, texto: 'parada registrada (' + (FrotaRes_s_(p.MOTIVO) || 'sem motivo') + ') ' + (FrotaRes_s_(p.DATA_FIM) ? 'de ' + Frota_textoData_(p.DATA_INICIO) + ' a ' + Frota_textoData_(p.DATA_FIM) : 'desde ' + Frota_textoData_(p.DATA_INICIO) + ', sem data de fim') });
  });
  return out;
}

/** Ocupações que cruzam [ini, fim). A retirada e as reservas do próprio condutor não contam (são dele). */
function FrotaRes_conflitos_(vid, ini, fim, o) {
  o = o || {};
  return FrotaRes_ocupacoes_(vid, o).filter(function (x) {
    if (!(x.ini < fim && x.fim > ini)) return false;
    if (o.condutorId && x.tipo === 'RETIRADA' && x.condutorId === o.condutorId) return false;
    return true;
  }).sort(function (a, b) { return a.ini - b.ini; });
}

/** Veículos ativos sem conflito no período (sugestão de troca). */
function FrotaRes_livres_(ini, fim, o) {
  o = o || {};
  var base = { reservas: o.reservas || FrotaRes_todas_(), movs: o.movs || Frota_lerSeExistir_(SGO_CFG.SHEETS.REG_FROTA_MOVIMENTACAO),
    paradas: o.paradas || Frota_lerSeExistir_(SGO_CFG.SHEETS.REG_FROTA_PARADA), condutores: o.condutores || FrotaRes_condutores_(), agora: o.agora, condutorId: o.condutorId };
  return FrotaRes_veiculosAtivos_().filter(function (v) { return FrotaRes_s_(v.ID) !== FrotaRes_s_(o.exceto); }).filter(function (v) {
    return !FrotaRes_conflitos_(FrotaRes_s_(v.ID), ini, fim, base).length;
  }).map(function (v) { return { id: FrotaRes_s_(v.ID), placa: FrotaRes_s_(v.PLACA), modelo: FrotaRes_s_(v.MODELO), km: Frota_num_(v.KM_ATUAL, 0) }; });
}
function FrotaRes_listaPlacas_(livres) {
  if (!livres.length) return 'nenhum veículo livre no mesmo período';
  return livres.slice(0, 6).map(function (l) { return l.placa + (l.modelo ? ' (' + l.modelo + ')' : ''); }).join(', ') + (livres.length > 6 ? ' e mais ' + (livres.length - 6) : '');
}

/** Problema de CNH para dirigir até o fim do período ('' = ok). */
function FrotaRes_problemaCnh_(condutor, fimMs) {
  if (!condutor) return 'condutor não encontrado';
  var v = Frota_dataDia_(condutor.CNH_VALIDADE);
  if (!v) return 'a validade da CNH de ' + FrotaRes_s_(condutor.NOME) + ' não está cadastrada';
  var fimDia = FrotaRes_iniDia_(fimMs);
  if (v.getTime() < fimDia) return 'a CNH de ' + FrotaRes_s_(condutor.NOME) + ' vence em ' + Frota_textoData_(condutor.CNH_VALIDADE) + ', antes do fim da reserva';
  return '';
}

/** Condutor da reserva: o do próprio login; a gestão escolhe outro. */
function FrotaRes_condutorDaReserva_(sessao, condutorId) {
  var vinculado = Frota_obterCondutorPorUsuario_(sessao.userId);
  var id = sessao.gestao ? (FrotaRes_s_(condutorId) || (vinculado && vinculado.ID)) : (vinculado && vinculado.ID);
  if (!id) {
    throw new Error(sessao.gestao ? 'Escolha o condutor da reserva no campo "Condutor" (seu login não tem condutor vinculado) e toque em Reservar de novo.'
      : 'Seu login ainda não tem condutor vinculado, então a reserva não pode ser feita em seu nome. Peça à gestão (Administrador, Gestor ou Diretoria) para vincular o seu usuário em Frota > Veículos e condutores > Condutores e abra a Frota de novo.');
  }
  var c = SGO_DATA.getById(SGO_CFG.SHEETS.CAD_CONDUTORES, id);
  if (!c || FrotaRes_up_(c.STATUS) === 'INATIVO') throw new Error('O condutor escolhido não foi encontrado ou está inativo. Atualize a tela e escolha de novo; se continuar, fale com a gestão.');
  return c;
}

// ------------------------------------------------------------
// CRIAR, CANCELAR E TROCAR O VEÍCULO
// ------------------------------------------------------------
/**
 * Cria a reserva (USO) ou a manutenção programada (MANUTENCAO, só gestão).
 * Devolve { ok:true, id, codigo, mensagem } ou, com o veículo ocupado, { ok:false, conflito:true, message, livres }.
 */
function FrotaRes_criar_(sessao, p, o) {
  p = p || {}; o = o || {};
  FrotaRes_garantirAbas_();
  var cfg = FrotaRes_cfg_(), agora = o.agora || FrotaRes_agora_();
  var tipo = FrotaRes_up_(p.tipo) === 'MANUTENCAO' ? 'MANUTENCAO' : 'USO';
  if (tipo === 'MANUTENCAO' && !sessao.gestao) throw new Error('A manutenção programada é lançada só pela gestão (Administrador, Gestor ou Diretoria). Para usar o veículo, faça uma reserva comum.');
  var ini = FrotaRes_ms_(p.dataInicio, p.horaInicio), fim = FrotaRes_ms_(p.dataFim, p.horaFim);
  if (ini === null) throw new Error('Informe a data e a hora de início (dd/mm/aaaa e hh:mm) e toque em Reservar de novo.');
  if (fim === null) throw new Error('Informe a data e a hora de fim (devolução prevista, dd/mm/aaaa e hh:mm) e toque em Reservar de novo.');
  if (ini < agora - 5 * 60000) throw new Error('O início (' + FrotaRes_txt_(ini) + ') já passou. Agora são ' + FrotaRes_txt_(agora) + ' (horário de Brasília). Para usar o veículo agora, faça a retirada em Frota > Situação e retiradas; para depois, corrija o início.');
  if (fim <= ini + 15 * 60000) throw new Error('O fim (' + FrotaRes_txt_(fim) + ') precisa ser pelo menos 15 minutos depois do início (' + FrotaRes_txt_(ini) + '). Corrija o horário de fim.');
  if (fim - ini > cfg.duracaoMaxDias * 86400000) throw new Error('A reserva vai de ' + FrotaRes_txt_(ini) + ' a ' + FrotaRes_txt_(fim) + ': mais que o máximo de ' + cfg.duracaoMaxDias + ' dias. Divida em reservas menores ou fale com a gestão.');
  if (ini > agora + cfg.antecedenciaMaxDias * 86400000) throw new Error('O início está a mais de ' + cfg.antecedenciaMaxDias + ' dias de hoje. Reservas abrem com até ' + cfg.antecedenciaMaxDias + ' dias de antecedência: reserve mais perto da data.');
  var vid = FrotaRes_s_(p.veiculoId);
  var veic = vid ? SGO_DATA.getById(SGO_CFG.SHEETS.CAD_VEICULOS, vid) : null;
  if (!veic) throw new Error('Escolha o veículo da reserva (a lista mostra os livres no período) e toque em Reservar de novo.');
  if (FrotaRes_up_(veic.STATUS) === 'INATIVO') throw new Error('O veículo ' + veic.PLACA + ' está inativo e não pode ser reservado. Escolha outro veículo.');

  var cond = null, destino = '', motivo = '', passageiros = '', vinculo = { tipo: '', id: '', texto: '' };
  if (tipo === 'USO') {
    cond = FrotaRes_condutorDaReserva_(sessao, p.condutorId);
    var cnh = FrotaRes_problemaCnh_(cond, fim);
    if (cnh) throw new Error('Reserva não feita: ' + cnh + '. Para dirigir veículo da frota a CNH precisa estar válida em todo o período. O que fazer: peça à gestão para atualizar a validade da CNH em Frota > Veículos e condutores > Condutores > Editar (com a CNH nova anexada) e depois reserve de novo.');
    destino = FrotaRes_texto_(p.destino, 3, 'o destino', 200, 'Hospital Exemplo, Anápolis');
    motivo = FrotaRes_texto_(p.motivo, 3, 'o motivo', 300, 'manutenção preventiva da autoclave');
    passageiros = String(p.passageiros || '').replace(/\s+/g, ' ').trim().slice(0, 300);
    vinculo = FrotaRes_vinculo_(sessao, p);
  } else {
    motivo = FrotaRes_texto_(p.motivo, 5, 'a descrição da manutenção', 300, 'revisão dos 60.000 km na oficina');
    destino = String(p.destino || '').replace(/\s+/g, ' ').trim().slice(0, 200);
  }
  var emNomeDeOutro = tipo === 'USO' && sessao.gestao && FrotaRes_s_(cond.USUARIO_ID) !== sessao.userId;
  var condutorId = cond ? FrotaRes_s_(cond.ID) : '';

  var conferir = function () {
    var todas = FrotaRes_todas_();
    var conf = FrotaRes_conflitos_(vid, ini, fim, { reservas: todas, agora: agora, condutorId: condutorId });
    if (conf.length) return { todas: todas, conf: conf, motivo: 'VEICULO' };
    if (tipo === 'USO') {
      var minha = todas.filter(function (r) {
        if (FrotaRes_up_(r.SITUACAO) !== 'RESERVADA' || FrotaRes_up_(r.TIPO) === 'MANUTENCAO' || FrotaRes_s_(r.CONDUTOR_ID) !== condutorId) return false;
        var a = FrotaRes_iniMs_(r), b = FrotaRes_fimMs_(r);
        return a !== null && b !== null && a < fim && b > ini;
      })[0];
      if (minha) return { todas: todas, minha: minha, motivo: 'CONDUTOR' };
    }
    return { todas: todas };
  };
  var recusa = function (c) {
    if (c.motivo === 'CONDUTOR') {
      return { ok: false, conflito: true, message: 'Reserva não feita: ' + (emNomeDeOutro ? cond.NOME + ' já tem' : 'você já tem') + ' a reserva ' + c.minha.CODIGO + ' (veículo ' + c.minha.PLACA + ', ' +
        FrotaRes_periodo_(FrotaRes_iniMs_(c.minha), FrotaRes_fimMs_(c.minha)) + ') no mesmo horário. Uma pessoa não segura dois veículos ao mesmo tempo. Se quer trocar de veículo, abra a reserva em Minhas reservas e use "Trocar veículo".', livres: [] };
    }
    var livres = FrotaRes_livres_(ini, fim, { reservas: c.todas, agora: agora, exceto: vid, condutorId: condutorId });
    FrotaRes_evento_('RECUSA_SOBREPOSICAO', { sessao: sessao, veiculoId: vid, placa: FrotaRes_s_(veic.PLACA), dataRef: FrotaRes_data_(ini), reservaId: c.conf[0].reserva ? FrotaRes_s_(c.conf[0].reserva.ID) : '',
      chave: 'RECUSA|' + vid + '|' + sessao.userId + '|' + FrotaRes_txt_(ini), detalhe: 'Pedido de ' + FrotaRes_periodo_(ini, fim) + ' recusado: ' + c.conf[0].texto + '.' });
    return { ok: false, conflito: true, livres: livres,
      message: 'O veículo ' + veic.PLACA + ' não está livre de ' + FrotaRes_periodo_(ini, fim) + ': ' + c.conf.map(function (x) { return x.texto; }).join('; ') + '. ' +
        (livres.length ? 'Livres no mesmo período: ' + FrotaRes_listaPlacas_(livres) + '. Escolha um deles na lista "Veículo" e toque em Reservar de novo.' : 'Nenhum veículo está livre no mesmo período. Mude o horário ou fale com a gestão.') };
  };
  var pre = conferir();
  if (pre.conf || pre.minha) return recusa(pre);

  var reg;
  var resultado = FrotaRes_comTrava_(function () {
    // Dentro da trava, relê tudo: outro pedido pode ter reservado o mesmo veículo agora há pouco.
    var c = conferir();
    if (c.conf || c.minha) return recusa(c);
    reg = SGO_DATA.normalizarObjetoParaSheet(FROTA_RES_ABA, SGO_DATA.gerarRegistroBase({
      CODIGO: FrotaRes_proximoCodigo_(c.todas, agora), TIPO: tipo, VEICULO_ID: vid, PLACA: FrotaRes_s_(veic.PLACA),
      CONDUTOR_ID: condutorId, CONDUTOR_NOME: cond ? FrotaRes_s_(cond.NOME) : '', USUARIO_ID: cond ? FrotaRes_s_(cond.USUARIO_ID) : '',
      DATA_INICIO: FrotaRes_data_(ini), HORA_INICIO: FrotaRes_hora_(ini), DATA_FIM: FrotaRes_data_(fim), HORA_FIM: FrotaRes_hora_(fim),
      DESTINO: destino, MOTIVO: motivo, PASSAGEIROS: passageiros, VINCULO_TIPO: vinculo.tipo, VINCULO_ID: vinculo.id, VINCULO_TEXTO: vinculo.texto,
      SITUACAO: 'RESERVADA', CRIADA_POR_ID: sessao.userId, CRIADA_POR_NOME: sessao.nome, PELA_GESTAO: emNomeDeOutro ? 'SIM' : '',
      MOVIMENTACAO_ID: '', INICIADA_EM: '', CONCLUIDA_EM: '', CANCELADA_EM: '', CANCELADA_POR_ID: '', CANCELADA_POR_NOME: '', MOTIVO_CANCELAMENTO: '', NAO_UTILIZADA_EM: '',
      LIBERADA_EM: '', LIBERADA_POR_NOME: '', LIBERADA_JUSTIFICATIVA: '', LIBERADA_MOV_ID: '', LEMBRETE_EM: '', CONFERENCIA_EM: '', CONFERENCIA_PROBLEMAS: '', ATUALIZADO_EM: SGO_UTILS.nowIso()
    }));
    reg.HISTORICO_JSON = FrotaRes_hist_(null, sessao, tipo === 'MANUTENCAO' ? 'MANUTENCAO_PROGRAMADA' : 'CRIADA',
      (tipo === 'MANUTENCAO' ? 'Manutenção programada' : 'Reserva') + ' de ' + FrotaRes_periodo_(ini, fim) + (emNomeDeOutro ? ' em nome de ' + cond.NOME : '') + '.');
    SGO_DATA.insert(FROTA_RES_ABA, reg);
    return null;
  });
  if (resultado) return resultado;
  try { SGO_DATA.log('FROTA_RESERVA_' + (tipo === 'MANUTENCAO' ? 'MANUTENCAO' : 'CRIAR'), sessao.usuario, reg.CODIGO + ' ' + reg.PLACA + ' ' + FrotaRes_periodo_(ini, fim) + (cond ? ' — ' + cond.NOME : ''), 'FROTA'); } catch (eL) {}
  if (emNomeDeOutro && FrotaRes_s_(cond.USUARIO_ID)) {
    FrotaRes_avisar_({ tipo: 'CRIADA_PELA_GESTAO', reservaId: reg.ID, destinos: [cond.USUARIO_ID], titulo: 'Reserva de veículo em seu nome: ' + reg.PLACA + ' (' + FrotaRes_quando_(ini, agora) + ')',
      texto: sessao.nome + ' reservou para você o veículo ' + reg.PLACA + ' de ' + FrotaRes_periodo_(ini, fim) + '.\nDestino: ' + destino + '\nMotivo: ' + motivo + (passageiros ? '\nPassageiros: ' + passageiros : '') +
        '\nCódigo da reserva: ' + reg.CODIGO + '\n\nNo horário, retire o veículo em Frota > Situação e retiradas. Se não for usar, cancele em Frota > Reservas > Minhas reservas para liberar o veículo para outra pessoa.' });
    FrotaRes_enviarEmails_(o);
  }
  try { if (typeof SGO_Pendencias_invalidar_ === 'function') SGO_Pendencias_invalidar_(); } catch (eP) {}
  return { ok: true, id: reg.ID, codigo: reg.CODIGO, placa: reg.PLACA,
    mensagem: (tipo === 'MANUTENCAO' ? 'Manutenção programada ' + reg.CODIGO + ' lançada: o veículo ' + reg.PLACA + ' fica bloqueado para reserva e retirada de ' : 'Reserva ' + reg.CODIGO + ' feita: veículo ' + reg.PLACA + ' de ') +
      FrotaRes_periodo_(ini, fim) + (emNomeDeOutro ? ', em nome de ' + cond.NOME + ' (avisado)' : '') + '.' };
}

/** Ligação opcional: O.S. do Auvo (número), atividade (das minhas abertas) ou cliente (cadastro). */
function FrotaRes_vinculo_(sessao, p) {
  var tipo = FrotaRes_up_(p.vinculoTipo);
  if (!FROTA_RES_VINCULOS[tipo]) return { tipo: '', id: '', texto: '' };
  var id = FrotaRes_s_(p.vinculoId).slice(0, 80);
  if (!id) return { tipo: '', id: '', texto: '' };
  if (tipo === 'AUVO') {
    var t = Frota_lerSeExistir_(SGO_CFG.SHEETS.AUVO_TAREFAS || 'AUVO_TAREFAS').filter(function (x) { return FrotaRes_s_(x.AUVO_TASK_ID) === id; })[0];
    return { tipo: tipo, id: id, texto: 'O.S. ' + id + (t ? ' — ' + (FrotaRes_s_(t.CLIENTE_NOME_AUVO) || 'cliente') : ' (não encontrada na integração do Auvo)') };
  }
  if (tipo === 'ATIVIDADE') {
    var a = typeof Atividades_todas_ === 'function' ? Atividades_todas_().filter(function (x) { return FrotaRes_s_(x.ID) === id; })[0] : null;
    if (!a) throw new Error('A atividade escolhida não foi encontrada. Escolha de novo em "Ligar a" ou deixe sem ligação.');
    return { tipo: tipo, id: id, texto: 'Atividade: ' + FrotaRes_s_(a.TITULO).slice(0, 150) };
  }
  var c = SGO_DATA.getById(SGO_CFG.SHEETS.CAD_CLIENTES, id);
  if (!c) throw new Error('O cliente escolhido não foi encontrado. Escolha de novo em "Ligar a" ou deixe sem ligação.');
  return { tipo: tipo, id: id, texto: 'Cliente: ' + (FrotaRes_s_(c.NOME_FANTASIA) || FrotaRes_s_(c.RAZAO_SOCIAL)) };
}

function FrotaRes_ehDono_(sessao, r) {
  return !!sessao.userId && (FrotaRes_s_(r.USUARIO_ID) === sessao.userId || FrotaRes_s_(r.CRIADA_POR_ID) === sessao.userId);
}

/** Cancela (nunca apaga). Reservante: antes de retirar, com o motivo. Gestão: com justificativa; o reservante é avisado. */
function FrotaRes_cancelar_(sessao, p, o) {
  p = p || {}; o = o || {};
  FrotaRes_garantirAbas_();
  var r = SGO_DATA.getById(FROTA_RES_ABA, FrotaRes_s_(p.id));
  if (!r) throw new Error('Reserva não encontrada. Atualize a tela.');
  var dono = FrotaRes_ehDono_(sessao, r);
  if (!dono && !sessao.gestao) throw new Error('A reserva ' + r.CODIGO + ' é de ' + (FrotaRes_s_(r.CONDUTOR_NOME) || 'outra pessoa') + '. Só quem reservou ou ' + FROTA_RES_GESTAO_TXT + ' pode cancelar. Se o veículo for necessário, fale com ' + (FrotaRes_s_(r.CONDUTOR_NOME) || 'quem reservou') + ' ou com a gestão.');
  var sit = FrotaRes_up_(r.SITUACAO);
  if (sit !== 'RESERVADA') throw new Error('A reserva ' + r.CODIGO + ' não pode ser cancelada: ela está "' + (FROTA_RES_SITUACOES[sit] || sit) + '". ' + (sit === 'INICIADA' ? 'O veículo já foi retirado: registre a devolução quando terminar.' : 'Atualize a tela.'));
  var pelaGestao = !dono || (sessao.gestao && FrotaRes_s_(r.USUARIO_ID) !== sessao.userId && FrotaRes_up_(r.TIPO) !== 'MANUTENCAO');
  var min = pelaGestao ? FROTA_JUSTIFICATIVA_MIN : 5;
  var motivo = String(p.motivo || '').replace(/\s+/g, ' ').trim();
  if (motivo.length < min) throw new Error((pelaGestao ? 'Escreva a justificativa do cancelamento (mínimo de ' + min + ' caracteres): ' + (FrotaRes_s_(r.CONDUTOR_NOME) || 'quem reservou') + ' recebe o motivo. Exemplo: "veículo vai para a oficina por defeito no freio".' : 'Escreva o motivo do cancelamento (mínimo de ' + min + ' caracteres), por exemplo: "visita remarcada".') + ' Depois toque em Cancelar reserva de novo.');
  var agora = o.agora || FrotaRes_agora_();
  FrotaRes_comTrava_(function () {
    var atual = SGO_DATA.getById(FROTA_RES_ABA, r.ID);
    if (FrotaRes_up_(atual.SITUACAO) !== 'RESERVADA') throw new Error('A reserva ' + r.CODIGO + ' acabou de mudar (está "' + (FROTA_RES_SITUACOES[FrotaRes_up_(atual.SITUACAO)] || atual.SITUACAO) + '"). Atualize a tela.');
    SGO_DATA.update(FROTA_RES_ABA, r.ID, { SITUACAO: 'CANCELADA', CANCELADA_EM: SGO_UTILS.nowIso(), CANCELADA_POR_ID: sessao.userId, CANCELADA_POR_NOME: sessao.nome,
      MOTIVO_CANCELAMENTO: motivo.slice(0, 500), ATUALIZADO_EM: SGO_UTILS.nowIso(), HISTORICO_JSON: FrotaRes_hist_(atual, sessao, 'CANCELADA', (pelaGestao ? 'Cancelada pela gestão: ' : 'Cancelada: ') + motivo) });
  });
  var ini = FrotaRes_iniMs_(r), fim = FrotaRes_fimMs_(r);
  if (pelaGestao) {
    FrotaRes_evento_('CANCELADA_GESTAO', { sessao: sessao, reservaId: r.ID, codigo: r.CODIGO, veiculoId: r.VEICULO_ID, placa: r.PLACA, afetadoId: r.USUARIO_ID, afetadoNome: r.CONDUTOR_NOME, justificativa: motivo, dataRef: FrotaRes_s_(r.DATA_INICIO), detalhe: 'Cancelada pela gestão.' });
    if (FrotaRes_s_(r.USUARIO_ID)) {
      var livres = ini !== null && fim !== null && fim > agora ? FrotaRes_livres_(Math.max(ini, agora), fim, { agora: agora, exceto: r.VEICULO_ID, condutorId: r.CONDUTOR_ID }) : [];
      FrotaRes_avisar_({ tipo: 'CANCELADA_GESTAO', reservaId: r.ID, destinos: [r.USUARIO_ID], exceto: sessao.userId, titulo: 'Sua reserva do veículo ' + r.PLACA + ' foi cancelada pela gestão',
        texto: sessao.nome + ' cancelou a sua reserva ' + r.CODIGO + ' (veículo ' + r.PLACA + ', ' + FrotaRes_periodo_(ini, fim) + ').\nJustificativa: ' + motivo +
          (livres.length ? '\n\nVeículos livres no mesmo período: ' + FrotaRes_listaPlacas_(livres) + '. Para reservar outro, abra Frota > Reservas > Reservar.' : '\n\nNenhum veículo está livre no mesmo período; fale com a gestão.') });
      FrotaRes_enviarEmails_(o);
    }
  }
  try { SGO_DATA.log('FROTA_RESERVA_CANCELAR', sessao.usuario, r.CODIGO + ' ' + r.PLACA + ': ' + motivo.slice(0, 200), 'FROTA'); } catch (eL) {}
  try { if (typeof SGO_Pendencias_invalidar_ === 'function') SGO_Pendencias_invalidar_(); } catch (eP) {}
  return { ok: true, mensagem: 'Reserva ' + r.CODIGO + ' cancelada. O veículo ' + r.PLACA + ' ficou livre nesse horário' + (pelaGestao && FrotaRes_s_(r.USUARIO_ID) ? '; ' + r.CONDUTOR_NOME + ' foi avisado' : '') + '. A reserva continua no histórico.' };
}

/** Troca o veículo da reserva por outro livre no mesmo período (quem reservou ou a gestão). */
function FrotaRes_trocarVeiculo_(sessao, p, o) {
  p = p || {}; o = o || {};
  FrotaRes_garantirAbas_();
  var r = SGO_DATA.getById(FROTA_RES_ABA, FrotaRes_s_(p.id));
  if (!r) throw new Error('Reserva não encontrada. Atualize a tela.');
  if (!FrotaRes_ehDono_(sessao, r) && !sessao.gestao) throw new Error('Só quem reservou ou ' + FROTA_RES_GESTAO_TXT + ' troca o veículo da reserva ' + r.CODIGO + '.');
  if (FrotaRes_up_(r.SITUACAO) !== 'RESERVADA') throw new Error('Só reserva ainda não retirada troca de veículo (a ' + r.CODIGO + ' está "' + (FROTA_RES_SITUACOES[FrotaRes_up_(r.SITUACAO)] || r.SITUACAO) + '").');
  var novo = SGO_DATA.getById(SGO_CFG.SHEETS.CAD_VEICULOS, FrotaRes_s_(p.veiculoId));
  if (!novo || FrotaRes_up_(novo.STATUS) === 'INATIVO') throw new Error('Escolha um veículo ativo da lista de livres.');
  if (FrotaRes_s_(novo.ID) === FrotaRes_s_(r.VEICULO_ID)) return { ok: true, semMudanca: true, mensagem: 'A reserva já está com o veículo ' + novo.PLACA + '.' };
  var ini = FrotaRes_iniMs_(r), fim = FrotaRes_fimMs_(r), agora = o.agora || FrotaRes_agora_();
  var out = FrotaRes_comTrava_(function () {
    var conf = FrotaRes_conflitos_(FrotaRes_s_(novo.ID), Math.max(ini, agora), fim, { agora: agora, ignorarReservaId: r.ID, condutorId: FrotaRes_s_(r.CONDUTOR_ID) });
    if (conf.length) {
      var livres = FrotaRes_livres_(Math.max(ini, agora), fim, { agora: agora, exceto: r.VEICULO_ID, condutorId: FrotaRes_s_(r.CONDUTOR_ID) });
      return { ok: false, conflito: true, livres: livres, message: 'O veículo ' + novo.PLACA + ' não está livre: ' + conf[0].texto + '. Livres no período: ' + FrotaRes_listaPlacas_(livres) + '.' };
    }
    var atual = SGO_DATA.getById(FROTA_RES_ABA, r.ID);
    SGO_DATA.update(FROTA_RES_ABA, r.ID, { VEICULO_ID: FrotaRes_s_(novo.ID), PLACA: FrotaRes_s_(novo.PLACA), CONFERENCIA_EM: '', CONFERENCIA_PROBLEMAS: '', ATUALIZADO_EM: SGO_UTILS.nowIso(),
      HISTORICO_JSON: FrotaRes_hist_(atual, sessao, 'TROCA_VEICULO', 'Veículo trocado de ' + r.PLACA + ' para ' + novo.PLACA + '.') });
    return null;
  });
  if (out) return out;
  FrotaRes_evento_('TROCA_VEICULO', { sessao: sessao, reservaId: r.ID, codigo: r.CODIGO, veiculoId: novo.ID, placa: novo.PLACA, afetadoId: r.USUARIO_ID, afetadoNome: r.CONDUTOR_NOME, dataRef: FrotaRes_s_(r.DATA_INICIO), detalhe: 'De ' + r.PLACA + ' para ' + novo.PLACA + '.' });
  if (!FrotaRes_ehDono_(sessao, r) && FrotaRes_s_(r.USUARIO_ID)) {
    FrotaRes_avisar_({ tipo: 'TROCA_VEICULO', reservaId: r.ID, destinos: [r.USUARIO_ID], exceto: sessao.userId, titulo: 'Sua reserva mudou de veículo: agora é o ' + novo.PLACA,
      texto: sessao.nome + ' trocou o veículo da sua reserva ' + r.CODIGO + ' (' + FrotaRes_periodo_(ini, fim) + ') de ' + r.PLACA + ' para ' + novo.PLACA + (novo.MODELO ? ' (' + novo.MODELO + ')' : '') + '. No horário, retire o ' + novo.PLACA + '.' });
    FrotaRes_enviarEmails_(o);
  }
  try { if (typeof SGO_Pendencias_invalidar_ === 'function') SGO_Pendencias_invalidar_(); } catch (eP) {}
  return { ok: true, mensagem: 'Reserva ' + r.CODIGO + ' passou para o veículo ' + novo.PLACA + '.' };
}

// ------------------------------------------------------------
// RETIRADA E DEVOLUÇÃO (chamadas por SGO_Frota_Main.js)
// ------------------------------------------------------------
/**
 * Devolução prevista informada na retirada. Sem ela (tela antiga ainda aberta), vale o fim do expediente de
 * hoje ou 2 horas depois da saída, o que for mais tarde, marcada como "PADRAO".
 */
function FrotaRes_previstaRetirada_(payload, saidaMs) {
  var ms = FrotaRes_ms_(payload.devolucaoPrevistaData, payload.devolucaoPrevistaHora);
  if (ms === null && (String(payload.devolucaoPrevistaData || '').trim() || String(payload.devolucaoPrevistaHora || '').trim())) {
    throw new Error('A devolução prevista (' + String(payload.devolucaoPrevistaData || '') + ' ' + String(payload.devolucaoPrevistaHora || '') + ') não é uma data e hora válidas. Use dd/mm/aaaa e hh:mm e toque em Confirmar de novo.');
  }
  if (ms === null) {
    var fimExp = (typeof SGO_expediente_ === 'function' ? SGO_expediente_().fim : '17:30') || '17:30';
    var hoje = FrotaRes_ms_(FrotaRes_data_(saidaMs), fimExp);
    return { ms: Math.max(hoje || 0, saidaMs + 2 * 3600000), origem: 'PADRAO' };
  }
  if (ms <= saidaMs + 5 * 60000) throw new Error('A devolução prevista (' + FrotaRes_txt_(ms) + ') precisa ser depois da saída (' + FrotaRes_txt_(saidaMs) + '). Corrija o campo "Devolução prevista" e toque em Confirmar de novo.');
  if (ms > saidaMs + 30 * 86400000) throw new Error('A devolução prevista passa de 30 dias. Informe uma data mais próxima; para uso longo, combine com a gestão.');
  return { ms: ms, origem: 'INFORMADA' };
}

/**
 * A retirada respeita a reserva. Devolve { minha, bloqueio, proxima }:
 *  minha    = reserva do próprio condutor neste veículo, com a saída entre 2 h antes do início e o fim;
 *  bloqueio = reserva de outra pessoa (ou manutenção programada) que começa antes da devolução prevista + folga;
 *  proxima  = a próxima reserva do veículo depois da saída (para mostrar na tela).
 */
function FrotaRes_conferirRetirada_(veiculoId, condutorId, saidaMs, previstaMs, o) {
  o = o || {};
  var cfg = o.cfg || FrotaRes_cfg_();
  var lista = FrotaRes_todas_().filter(function (r) { return FrotaRes_s_(r.VEICULO_ID) === veiculoId && FrotaRes_up_(r.SITUACAO) === 'RESERVADA'; })
    .map(function (r) { return { r: r, ini: FrotaRes_iniMs_(r), fim: FrotaRes_fimMs_(r), manut: FrotaRes_up_(r.TIPO) === 'MANUTENCAO' }; })
    .filter(function (x) { return x.ini !== null && x.fim !== null; }).sort(function (a, b) { return a.ini - b.ini; });
  var minha = lista.filter(function (x) { return !x.manut && FrotaRes_s_(x.r.CONDUTOR_ID) === condutorId && saidaMs >= x.ini - cfg.antecipacaoMin * 60000 && saidaMs < x.fim; })[0] || null;
  var bloqueio = lista.filter(function (x) {
    if (minha && x.r === minha.r) return false;
    if (!x.manut && FrotaRes_s_(x.r.CONDUTOR_ID) === condutorId) return false;
    return x.ini < previstaMs + cfg.folgaMin * 60000 && x.fim > saidaMs;
  })[0] || null;
  var proxima = lista.filter(function (x) { return x.fim > saidaMs && (!minha || x.r !== minha.r); })[0] || null;
  return { minha: minha, bloqueio: bloqueio, proxima: proxima, cfg: cfg };
}

/** Resposta da retirada recusada pela reserva (operador nunca no limbo: quem, quando, o que fazer). */
function FrotaRes_respostaBloqueio_(chk, veiculo, condutor, sessao, saidaMs, previstaMs, gestao) {
  var x = chk.bloqueio, cfg = chk.cfg, r = x.r;
  // para retirar agora: só veículo livre no período e que não esteja retirado por ninguém (nem pelo próprio condutor)
  var foraAgora = {};
  Frota_lerSeExistir_(SGO_CFG.SHEETS.REG_FROTA_MOVIMENTACAO).forEach(function (m) { if (FrotaRes_up_(m.STATUS) === 'EM_ANDAMENTO') foraAgora[FrotaRes_s_(m.VEICULO_ID)] = 1; });
  var livres = FrotaRes_livres_(saidaMs, previstaMs, { exceto: veiculo.ID, condutorId: FrotaRes_s_(condutor.ID) }).filter(function (l) { return !foraAgora[l.id]; });
  var limite = x.ini - cfg.folgaMin * 60000;
  var quem = x.manut ? 'manutenção programada' + (r.MOTIVO ? ' (' + FrotaRes_s_(r.MOTIVO) + ')' : '') : FrotaRes_s_(r.CONDUTOR_NOME) || 'outro condutor';
  var chave = 'BLOQ|' + r.ID + '|' + FrotaRes_s_(sessao.userId) + '|' + FrotaRes_data_(saidaMs);
  if (!FrotaRes_temEvento_(chave)) {
    FrotaRes_evento_('RETIRADA_BLOQUEADA', { sessao: sessao, chave: chave, reservaId: r.ID, codigo: r.CODIGO, veiculoId: veiculo.ID, placa: veiculo.PLACA, afetadoId: r.USUARIO_ID, afetadoNome: r.CONDUTOR_NOME,
      dataRef: FrotaRes_data_(saidaMs), detalhe: 'Retirada de ' + FrotaRes_s_(condutor.NOME) + ' com devolução prevista ' + FrotaRes_txt_(previstaMs) + ' recusada pela ' + (x.manut ? 'manutenção programada ' : 'reserva ') + r.CODIGO + ' (' + FrotaRes_periodo_(x.ini, x.fim) + ').' });
  }
  var msg = 'Retirada não registrada: o veículo ' + veiculo.PLACA + ' está ' + (x.manut ? 'bloqueado para ' + quem : 'reservado por ' + quem) + ' de ' + FrotaRes_periodo_(x.ini, x.fim) + ' (' + r.CODIGO + '). ' +
    'A devolução prevista (' + FrotaRes_txt_(previstaMs) + ') mais a folga de ' + cfg.folgaMin + ' min passa do início da ' + (x.manut ? 'manutenção' : 'reserva') + ', e a regra da frota é que quem reservou encontra o veículo no horário. ' +
    'O que fazer: ' + (livres.length ? 'retire um veículo livre agora (' + FrotaRes_listaPlacas_(livres) + ')' : 'nenhum veículo está livre até a sua devolução prevista; fale com a gestão') +
    (limite > saidaMs + 10 * 60000 ? '; ou, se você devolve antes, corrija a devolução prevista para até ' + FrotaRes_txt_(limite) : '') + '. ' +
    (gestao ? 'Você é da gestão: para liberar mesmo assim, marque "Liberar mesmo com a reserva" em Opções da gestão, escreva a justificativa e toque em Confirmar de novo; ' + (x.manut ? 'a manutenção continua lançada.' : quem + ' é avisado na hora, com a sugestão de outro veículo.')
      : 'Se a retirada for necessária mesmo assim, só ' + FROTA_RES_GESTAO_TXT + ' pode liberar, com justificativa' + (x.manut ? '.' : ', e ' + quem + ' é avisado.'));
  return { ok: false, bloqueadoPorReserva: true, podeLiberar: !!gestao, message: msg, livres: livres,
    reserva: { id: FrotaRes_s_(r.ID), codigo: FrotaRes_s_(r.CODIGO), tipo: x.manut ? 'MANUTENCAO' : 'USO', quem: quem, periodo: FrotaRes_periodo_(x.ini, x.fim), devolverAte: limite > saidaMs ? FrotaRes_txt_(limite) : '' } };
}

/** Depois da retirada gravada: reserva do condutor vira "iniciada"; liberação pela gestão avisa o reservante. */
function FrotaRes_aposRetirada_(sessao, registro, veiculo, condutor, chk, liberacao, previstaMs, o) {
  o = o || {};
  var out = {};
  try {
    if (chk && chk.minha) {
      var m = chk.minha.r;
      SGO_DATA.update(FROTA_RES_ABA, m.ID, { SITUACAO: 'INICIADA', MOVIMENTACAO_ID: registro.ID, INICIADA_EM: SGO_UTILS.nowIso(), ATUALIZADO_EM: SGO_UTILS.nowIso(),
        HISTORICO_JSON: FrotaRes_hist_(m, sessao, 'INICIADA', 'Retirada registrada em ' + registro.DATA_SAIDA + ' ' + registro.HORA_SAIDA + ', devolução prevista ' + FrotaRes_txt_(previstaMs) + '.') });
      out.reservaIniciada = FrotaRes_s_(m.CODIGO);
    }
    if (liberacao && chk && chk.bloqueio) {
      var b = chk.bloqueio.r, ini = chk.bloqueio.ini, fim = chk.bloqueio.fim;
      SGO_DATA.update(FROTA_RES_ABA, b.ID, { LIBERADA_EM: SGO_UTILS.nowIso(), LIBERADA_POR_NOME: sessao.nome, LIBERADA_JUSTIFICATIVA: liberacao, LIBERADA_MOV_ID: registro.ID, ATUALIZADO_EM: SGO_UTILS.nowIso(),
        HISTORICO_JSON: FrotaRes_hist_(b, sessao, 'LIBERADA', 'Veículo liberado pela gestão para a retirada de ' + FrotaRes_s_(condutor.NOME) + ' (devolução prevista ' + FrotaRes_txt_(previstaMs) + '). Justificativa: ' + liberacao) });
      FrotaRes_evento_('LIBERACAO_GESTAO', { sessao: sessao, reservaId: b.ID, codigo: b.CODIGO, veiculoId: veiculo.ID, placa: veiculo.PLACA, afetadoId: b.USUARIO_ID, afetadoNome: b.CONDUTOR_NOME,
        movimentacaoId: registro.ID, justificativa: liberacao, dataRef: FrotaRes_s_(b.DATA_INICIO), detalhe: 'Retirada de ' + FrotaRes_s_(condutor.NOME) + ' liberada sobre a ' + (chk.bloqueio.manut ? 'manutenção programada ' : 'reserva ') + b.CODIGO + '.' });
      out.reservaLiberada = FrotaRes_s_(b.CODIGO);
      if (!chk.bloqueio.manut && FrotaRes_s_(b.USUARIO_ID)) {
        var agora = o.agora || FrotaRes_agora_();
        var livres = FrotaRes_livres_(Math.max(ini, agora), fim, { agora: agora, exceto: veiculo.ID, condutorId: FrotaRes_s_(b.CONDUTOR_ID) });
        var mesmoDia = FrotaRes_iniDia_(ini) === FrotaRes_iniDia_(agora);
        FrotaRes_avisar_({ tipo: 'LIBERACAO_GESTAO', reservaId: b.ID, destinos: [b.USUARIO_ID], exceto: sessao.userId, whatsapp: mesmoDia,
          titulo: 'Atenção: o veículo ' + veiculo.PLACA + ' da sua reserva foi liberado para outra retirada',
          texto: sessao.nome + ' liberou o veículo ' + veiculo.PLACA + ', que você reservou (' + b.CODIGO + ', ' + FrotaRes_periodo_(ini, fim) + '), para a retirada de ' + FrotaRes_s_(condutor.NOME) +
            ' com devolução prevista ' + FrotaRes_txt_(previstaMs) + '.\nJustificativa: ' + liberacao + '\n\n' +
            (livres.length ? 'Veículos livres no seu horário: ' + FrotaRes_listaPlacas_(livres) + '. Para garantir, troque o veículo da reserva em Frota > Reservas > Minhas reservas > Trocar veículo.' : 'Nenhum outro veículo está livre no seu horário; fale com a gestão.') +
            ' A sua reserva continua valendo: se o ' + veiculo.PLACA + ' voltar a tempo, retire normalmente.',
          textoWhatsapp: 'O veículo ' + veiculo.PLACA + ' da sua reserva de ' + FrotaRes_quando_(ini, agora) + ' foi liberado pela gestão para outra retirada. ' + (livres.length ? 'Livres no seu horário: ' + FrotaRes_listaPlacas_(livres.slice(0, 3)) + '.' : '') + ' Veja em Frota > Reservas.' });
        FrotaRes_enviarEmails_(o);
      }
    }
  } catch (e) { console.error('Reservas após a retirada: ' + ((e && e.message) || e)); }
  return out;
}

/** Depois da devolução: reserva iniciada vira concluída; cobrança de atraso é encerrada e o próximo reservante sabe que o veículo voltou. */
function FrotaRes_aposDevolucao_(sessao, mov, veiculo, o) {
  o = o || {};
  try {
    var resId = FrotaRes_s_(mov.RESERVA_ID);
    if (resId) {
      var r = SGO_DATA.getById(FROTA_RES_ABA, resId);
      if (r && FrotaRes_up_(r.SITUACAO) === 'INICIADA') {
        SGO_DATA.update(FROTA_RES_ABA, r.ID, { SITUACAO: 'CONCLUIDA', CONCLUIDA_EM: SGO_UTILS.nowIso(), ATUALIZADO_EM: SGO_UTILS.nowIso(), HISTORICO_JSON: FrotaRes_hist_(r, sessao, 'CONCLUIDA', 'Devolução registrada.') });
      }
    }
    var agora = o.agora || FrotaRes_agora_();
    FrotaRes_eventos_().filter(function (e) { return FrotaRes_s_(e.TIPO) === 'ATRASO_DEVOLUCAO' && FrotaRes_s_(e.MOVIMENTACAO_ID) === FrotaRes_s_(mov.ID); }).forEach(function (e) {
      if (FrotaRes_s_(e.ATIVIDADE_ID)) FrotaRes_mudarAtividade_(e.ATIVIDADE_ID, 'Concluída', 'Veículo ' + FrotaRes_s_(veiculo.PLACA) + ' devolvido em ' + FrotaRes_txt_(agora) + '.');
      var prox = SGO_DATA.getById(FROTA_RES_ABA, FrotaRes_s_(e.RESERVA_ID));
      if (prox && FrotaRes_up_(prox.SITUACAO) === 'RESERVADA' && FrotaRes_s_(prox.USUARIO_ID) && FrotaRes_up_(prox.TIPO) !== 'MANUTENCAO') {
        FrotaRes_avisar_({ tipo: 'DEVOLVIDO', reservaId: prox.ID, destinos: [prox.USUARIO_ID], titulo: 'O veículo ' + FrotaRes_s_(veiculo.PLACA) + ' da sua reserva foi devolvido',
          texto: 'O veículo ' + FrotaRes_s_(veiculo.PLACA) + ' foi devolvido em ' + FrotaRes_txt_(agora) + ' e está disponível para a sua reserva ' + prox.CODIGO + ' (' + FrotaRes_periodo_(FrotaRes_iniMs_(prox), FrotaRes_fimMs_(prox)) + '). Retire em Frota > Situação e retiradas.' });
      }
    });
    FrotaRes_enviarEmails_(o);
  } catch (e2) { console.error('Reservas após a devolução: ' + ((e2 && e2.message) || e2)); }
}

// ------------------------------------------------------------
// MINHAS ATIVIDADES (cobrança da devolução que ameaça a reserva)
// ------------------------------------------------------------
/** Roda fn com a identidade da rotina (gestão) nas APIs de Minhas atividades; o identificador vale só nesta execução. */
function FrotaRes_comoSistema_(fn) {
  var anterior = typeof ATV_PONTE_CTX !== 'undefined' ? ATV_PONTE_CTX : null;
  var token = 'FROTA-RES-' + Utilities.getUuid();
  ATV_PONTE_CTX = { token: token, eu: { id: 'FROTA_RESERVAS', usuario: 'sistema', nome: 'Frota (reservas)', perfil: 'SISTEMA', gestor: true, sistema: 'SGO+' } };
  try { return fn(token); } finally { ATV_PONTE_CTX = anterior; }
}
function FrotaRes_criarCobranca_(uid, titulo, descricao, prazoMs, placa) {
  if (!uid || typeof Atividades_apiCriar !== 'function') return '';
  try {
    var prazo = new Date(prazoMs);
    var iso = prazo.getFullYear() + '-' + FrotaRes_2_(prazo.getMonth() + 1) + '-' + FrotaRes_2_(prazo.getDate()) + 'T' + FrotaRes_2_(prazo.getHours()) + ':' + FrotaRes_2_(prazo.getMinutes());
    var r = FrotaRes_comoSistema_(function (t) {
      return Atividades_apiCriar(t, { titulo: titulo.slice(0, 200), descricao: descricao, prazo: iso, prioridade: 'Urgente', responsavelId: uid, modulo: 'frota', moduloNome: 'Frota',
        porQue: 'Há reserva do veículo ' + placa + ' a seguir: quem reservou precisa encontrar o veículo no horário.', onde: 'Frota > Situação e retiradas', como: 'Devolva o veículo e registre a devolução (KM, foto do painel e vistoria).' });
    });
    return r && r.ok && r.item ? FrotaRes_s_(r.item.ID) : '';
  } catch (e) { console.error('Reservas, cobrança em Minhas atividades: ' + ((e && e.message) || e)); return ''; }
}
function FrotaRes_mudarAtividade_(id, situacao, obs) {
  if (!id || typeof Atividades_apiMudarSituacao !== 'function') return;
  try { FrotaRes_comoSistema_(function (t) { return Atividades_apiMudarSituacao(t, { id: id, situacao: situacao, observacao: obs, motivo: obs }); }); } catch (e) {}
}

// ------------------------------------------------------------
// CONFERÊNCIA (véspera e pendências)
// ------------------------------------------------------------
/** Problemas que impedem a reserva de acontecer como planejada. Lista de textos (vazia = tudo certo). */
function FrotaRes_problemas_(r, o) {
  o = o || {};
  var agora = o.agora || FrotaRes_agora_(), out = [];
  var ini = FrotaRes_iniMs_(r), fim = FrotaRes_fimMs_(r);
  if (ini === null || fim === null) return ['datas da reserva inválidas'];
  var vid = FrotaRes_s_(r.VEICULO_ID);
  var v = (o.veiculos || FrotaRes_veiculos_())[vid];
  if (!v) return ['o veículo da reserva não existe mais no cadastro'];
  if (FrotaRes_up_(v.STATUS) === 'INATIVO') out.push('o veículo ' + v.PLACA + ' foi inativado');
  var base = { reservas: o.reservas, movs: o.movs, paradas: o.paradas, condutores: o.condutores, agora: agora, ignorarReservaId: r.ID, condutorId: FrotaRes_s_(r.CONDUTOR_ID) };
  FrotaRes_conflitos_(vid, ini, fim, base).forEach(function (x) {
    if (x.tipo === 'RETIRADA') {
      var cfg = o.cfg || FrotaRes_cfg_();
      if (x.fim + cfg.folgaMin * 60000 > ini) out.push('o veículo está ' + x.texto);
      return;
    }
    if (x.tipo === 'RESERVA') return; // duas reservas não se sobrepõem (conferido na gravação); reserva antiga não é problema do reservante
    out.push(x.tipo === 'MANUTENCAO' ? 'há ' + x.texto : 'há ' + x.texto);
  });
  if (o.manut !== false) {
    var ult = o.ultimas || Frota_ultimasManutencoesPorVeiculo_();
    Object.keys(ult).forEach(function (k) {
      var m = ult[k];
      if (FrotaRes_s_(m.VEICULO_ID) !== vid) return;
      if (Frota_classificarManutencao_(m, v) !== 'VENCIDO') return;
      var t = FROTA_CFG.TIPOS_MANUTENCAO.filter(function (x) { return x.codigo === m.TIPO; })[0];
      out.push('manutenção vencida: ' + (t ? t.label : FrotaRes_s_(m.TIPO)));
    });
  }
  var docs = o.docs || Frota_registrosValidos_(SGO_CFG.SHEETS.REG_FROTA_DOCUMENTO);
  var vig = Frota_documentosVigentes_(docs);
  docs.forEach(function (d) {
    if (FrotaRes_s_(d.VEICULO_ID) !== vid) return;
    if (Frota_statusDocumento_(d, vig) === 'SUBSTITUIDO') return;
    var val = Frota_dataDia_(d.VALIDADE);
    if (val && val.getTime() < FrotaRes_iniDia_(fim)) out.push('documento ' + FrotaRes_s_(d.TIPO_DOCUMENTO) + ' vence em ' + Frota_textoData_(d.VALIDADE) + ', antes do fim da reserva');
  });
  if (FrotaRes_up_(r.TIPO) !== 'MANUTENCAO') {
    var c = (o.condutores || FrotaRes_condutores_())[FrotaRes_s_(r.CONDUTOR_ID)];
    var cnh = FrotaRes_problemaCnh_(c, fim);
    if (cnh) out.push(cnh);
  }
  return out;
}

/** Hora do lembrete: último dia útil antes do início, na hora configurada (padrão 14:00). */
function FrotaRes_vesperaMs_(iniMs, cfg) {
  var d = new Date(FrotaRes_iniDia_(iniMs));
  for (var i = 0; i < 10; i++) {
    d.setDate(d.getDate() - 1);
    if (FrotaRes_diaUtil_(d)) break;
  }
  var h = String(cfg.horaVespera || '14:00').split(':');
  d.setHours(Number(h[0]), Number(h[1]), 0, 0);
  return d.getTime();
}
function FrotaRes_diaUtil_(diaRegua) {
  if (typeof SGO_ehDiaUtil_ !== 'function') { var s = diaRegua.getDay(); return s >= 1 && s <= 5; }
  return SGO_ehDiaUtil_(new Date(Date.UTC(diaRegua.getFullYear(), diaRegua.getMonth(), diaRegua.getDate(), 15, 0, 0)));
}

// ------------------------------------------------------------
// ROTINA
// ------------------------------------------------------------
/**
 * Não comparecimento, manutenção encerrada, atraso com reserva a seguir, véspera e e-mails guardados.
 * o: { forcar, agora (ms na régua, testes), expediente (boolean, testes) }.
 */
function FrotaRes_rodada_(o) {
  o = o || {};
  var cache = null;
  if (!o.forcar) {
    try { cache = CacheService.getScriptCache(); if (cache.get('FROTA_RES_RODADA_V1')) return { pulada: true }; cache.put('FROTA_RES_RODADA_V1', '1', FROTA_RES_RODADA_SEG); } catch (e) {}
  }
  if (!Frota_lerSeExistir_(FROTA_RES_ABA).length && !o.forcar) { return { vazia: true }; }
  FrotaRes_garantirAbas_();
  var cfg = FrotaRes_cfg_(), agora = o.agora || FrotaRes_agora_();
  var res = { naoUtilizadas: 0, concluidas: 0, iniciadas: 0, atrasos: 0, afetadas: 0, lembretes: 0, problemas: 0 };
  var movs = Frota_lerSeExistir_(SGO_CFG.SHEETS.REG_FROTA_MOVIMENTACAO);
  var cnd = FrotaRes_condutores_(), veics = FrotaRes_veiculos_();
  var abertasPorVeic = {};
  movs.forEach(function (m) { if (FrotaRes_up_(m.STATUS) === 'EM_ANDAMENTO') abertasPorVeic[FrotaRes_s_(m.VEICULO_ID)] = m; });
  var gestores = FrotaRes_gestores_();

  // 1. situação das reservas
  FrotaRes_todas_().forEach(function (r) {
    var sit = FrotaRes_up_(r.SITUACAO), ini = FrotaRes_iniMs_(r), fim = FrotaRes_fimMs_(r), vid = FrotaRes_s_(r.VEICULO_ID);
    if (ini === null || fim === null) return;
    if (sit === 'RESERVADA' && FrotaRes_up_(r.TIPO) === 'MANUTENCAO') {
      if (fim < agora) { SGO_DATA.update(FROTA_RES_ABA, r.ID, { SITUACAO: 'CONCLUIDA', CONCLUIDA_EM: SGO_UTILS.nowIso(), ATUALIZADO_EM: SGO_UTILS.nowIso(), HISTORICO_JSON: FrotaRes_hist_(r, FROTA_RES_SISTEMA, 'CONCLUIDA', 'Período da manutenção programada encerrado.') }); res.concluidas++; }
      return;
    }
    if (sit === 'INICIADA') {
      var mv = movs.filter(function (m) { return FrotaRes_s_(m.ID) === FrotaRes_s_(r.MOVIMENTACAO_ID); })[0];
      if (mv && FrotaRes_up_(mv.STATUS) === 'FINALIZADO') { SGO_DATA.update(FROTA_RES_ABA, r.ID, { SITUACAO: 'CONCLUIDA', CONCLUIDA_EM: SGO_UTILS.nowIso(), ATUALIZADO_EM: SGO_UTILS.nowIso() }); res.concluidas++; }
      return;
    }
    if (sit !== 'RESERVADA' || agora <= ini + cfg.toleranciaMin * 60000) return;
    var aberta = abertasPorVeic[vid];
    // retirada do próprio condutor que não ficou ligada à reserva (registro antigo ou pela gestão): liga agora
    if (aberta && FrotaRes_s_(aberta.CONDUTOR_ID) === FrotaRes_s_(r.CONDUTOR_ID)) {
      var s = FrotaRes_saidaMs_(aberta);
      if (s !== null && s >= ini - cfg.antecipacaoMin * 60000) {
        SGO_DATA.update(FROTA_RES_ABA, r.ID, { SITUACAO: 'INICIADA', MOVIMENTACAO_ID: aberta.ID, INICIADA_EM: SGO_UTILS.nowIso(), ATUALIZADO_EM: SGO_UTILS.nowIso(), HISTORICO_JSON: FrotaRes_hist_(r, FROTA_RES_SISTEMA, 'INICIADA', 'Retirada do mesmo condutor ligada à reserva.') });
        res.iniciadas++;
        return;
      }
    }
    if (aberta) return; // o veículo ainda está fora com outra pessoa: a reserva espera (o atraso está sendo cobrado)
    // voltou atrasado: a tolerância conta da devolução
    var voltou = ini;
    movs.forEach(function (m) {
      if (FrotaRes_s_(m.VEICULO_ID) !== vid || FrotaRes_up_(m.STATUS) !== 'FINALIZADO') return;
      var a = FrotaRes_saidaMs_(m), b = FrotaRes_chegadaMs_(m);
      if (a !== null && b !== null && a < ini && b > voltou) voltou = b;
    });
    if (agora <= voltou + cfg.toleranciaMin * 60000) return;
    FrotaRes_comTrava_(function () {
      var atual = SGO_DATA.getById(FROTA_RES_ABA, r.ID);
      if (!atual || FrotaRes_up_(atual.SITUACAO) !== 'RESERVADA') return;
      SGO_DATA.update(FROTA_RES_ABA, r.ID, { SITUACAO: 'NAO_UTILIZADA', NAO_UTILIZADA_EM: SGO_UTILS.nowIso(), ATUALIZADO_EM: SGO_UTILS.nowIso(),
        HISTORICO_JSON: FrotaRes_hist_(atual, FROTA_RES_SISTEMA, 'NAO_UTILIZADA', 'Sem retirada até ' + cfg.toleranciaMin + ' min depois do início' + (voltou > ini ? ' (contados da devolução do veículo em ' + FrotaRes_txt_(voltou) + ')' : '') + ': veículo liberado.') });
      res.naoUtilizadas++;
      FrotaRes_evento_('NAO_UTILIZADA', { sessao: FROTA_RES_SISTEMA, reservaId: r.ID, codigo: r.CODIGO, veiculoId: vid, placa: r.PLACA, afetadoId: r.USUARIO_ID, afetadoNome: r.CONDUTOR_NOME, dataRef: FrotaRes_s_(r.DATA_INICIO),
        chave: 'NAOUTIL|' + r.ID, detalhe: 'Reserva de ' + FrotaRes_periodo_(ini, fim) + ' sem retirada.' });
      if (FrotaRes_s_(r.USUARIO_ID)) {
        FrotaRes_avisar_({ tipo: 'NAO_UTILIZADA', reservaId: r.ID, destinos: [r.USUARIO_ID], titulo: 'Reserva não utilizada: veículo ' + r.PLACA + ' liberado',
          texto: 'A sua reserva ' + r.CODIGO + ' (veículo ' + r.PLACA + ', ' + FrotaRes_periodo_(ini, fim) + ') não teve retirada até ' + cfg.toleranciaMin + ' minutos depois do início e virou "não utilizada". O veículo foi liberado para outras pessoas.\n\n' +
            'Se ainda precisa do veículo, faça uma reserva nova (Frota > Reservas > Reservar) ou retire um veículo livre. Da próxima vez, se não for usar, cancele a reserva antes: assim o veículo fica livre para quem precisa.' });
      }
    });
  });

  // 2. devolução prevista vencida com reserva a seguir
  var reservasAtivas = FrotaRes_todas_().filter(function (r) { return FrotaRes_up_(r.SITUACAO) === 'RESERVADA'; });
  Object.keys(abertasPorVeic).forEach(function (vid) {
    var m = abertasPorVeic[vid], prev = FrotaRes_previstaMs_(m), saida = FrotaRes_saidaMs_(m);
    if (prev === null || prev >= agora) return;
    var prox = reservasAtivas.filter(function (r) {
      if (FrotaRes_s_(r.VEICULO_ID) !== vid) return false;
      if (FrotaRes_up_(r.TIPO) !== 'MANUTENCAO' && FrotaRes_s_(r.CONDUTOR_ID) === FrotaRes_s_(m.CONDUTOR_ID)) return false;
      var a = FrotaRes_iniMs_(r), b = FrotaRes_fimMs_(r);
      return a !== null && b !== null && b > agora && a <= agora + FROTA_RES_ATRASO_JANELA_H * 3600000 && (saida === null || a >= saida - 60000);
    }).sort(function (x, y) { return FrotaRes_iniMs_(x) - FrotaRes_iniMs_(y); })[0];
    if (!prox) return;
    var c = cnd[FrotaRes_s_(m.CONDUTOR_ID)] || {}, v = veics[vid] || {}, uidAtual = FrotaRes_usuarioDoCondutor_(c), pIni = FrotaRes_iniMs_(prox);
    var manut = FrotaRes_up_(prox.TIPO) === 'MANUTENCAO';
    var quem = manut ? 'a manutenção programada' : FrotaRes_s_(prox.CONDUTOR_NOME) || 'outro condutor';
    var chave = 'ATRASO|' + m.ID + '|' + prox.ID;
    if (!FrotaRes_temEvento_(chave)) {
      var prazo = Math.max(pIni - cfg.folgaMin * 60000, agora + 30 * 60000);
      var atvId = FrotaRes_criarCobranca_(uidAtual, 'Devolver o veículo ' + FrotaRes_s_(v.PLACA) + ': ' + (manut ? 'manutenção programada' : 'reserva de ' + quem) + ' ' + FrotaRes_quando_(pIni, agora),
        'A devolução prevista do veículo ' + FrotaRes_s_(v.PLACA) + ' era ' + FrotaRes_txt_(prev) + ' e ele ainda não foi devolvido. ' + (manut ? 'Ele tem manutenção programada' : quem + ' reservou o veículo') + ' a partir de ' + FrotaRes_txt_(pIni) + '.\n' +
        'Devolva o veículo e registre a devolução em Frota > Situação e retiradas (botão verde "Devolver ' + FrotaRes_s_(v.PLACA) + '"). Esta atividade é concluída sozinha quando a devolução for registrada. Se não for possível devolver a tempo, avise a gestão agora.', prazo, FrotaRes_s_(v.PLACA));
      FrotaRes_evento_('ATRASO_DEVOLUCAO', { sessao: FROTA_RES_SISTEMA, chave: chave, reservaId: prox.ID, codigo: prox.CODIGO, veiculoId: vid, placa: v.PLACA, afetadoId: uidAtual, afetadoNome: FrotaRes_s_(c.NOME),
        movimentacaoId: m.ID, atividadeId: atvId, dataRef: FrotaRes_data_(pIni), detalhe: 'Devolução prevista ' + FrotaRes_txt_(prev) + ' vencida; ' + (manut ? 'manutenção programada ' : 'reserva ') + prox.CODIGO + ' a partir de ' + FrotaRes_txt_(pIni) + '.' });
      res.atrasos++;
      var livres = FrotaRes_livres_(Math.max(pIni, agora), FrotaRes_fimMs_(prox), { agora: agora, exceto: vid, condutorId: FrotaRes_s_(prox.CONDUTOR_ID) });
      if (uidAtual) {
        FrotaRes_avisar_({ tipo: 'ATRASO_DEVOLUCAO', reservaId: prox.ID, destinos: [uidAtual], whatsapp: FrotaRes_iniDia_(pIni) === FrotaRes_iniDia_(agora),
          titulo: 'Devolução do veículo ' + FrotaRes_s_(v.PLACA) + ' atrasada: há reserva às ' + FrotaRes_hora_(pIni),
          texto: 'A devolução prevista do veículo ' + FrotaRes_s_(v.PLACA) + ' era ' + FrotaRes_txt_(prev) + '. ' + (manut ? 'O veículo tem manutenção programada' : quem + ' reservou o veículo') + ' a partir de ' + FrotaRes_txt_(pIni) + '.\n\n' +
            'Devolva o veículo e registre a devolução em Frota > Situação e retiradas. Se não for possível, avise a gestão agora para que ' + (manut ? 'a manutenção seja remarcada.' : quem + ' troque de veículo.'),
          textoWhatsapp: 'Devolução do veículo ' + FrotaRes_s_(v.PLACA) + ' prevista para ' + FrotaRes_hora_(prev) + '. Há reserva a partir de ' + FrotaRes_hora_(pIni) + '. Devolva e registre no SGO+ ou avise a gestão.' });
      }
      if (!manut && FrotaRes_s_(prox.USUARIO_ID)) {
        FrotaRes_avisar_({ tipo: 'ATRASO_RESERVANTE', reservaId: prox.ID, destinos: [prox.USUARIO_ID],
          titulo: 'O veículo ' + FrotaRes_s_(v.PLACA) + ' da sua reserva ainda não voltou',
          texto: 'O veículo ' + FrotaRes_s_(v.PLACA) + ' está com ' + (FrotaRes_s_(c.NOME) || 'outro condutor') + ', que previa devolver em ' + FrotaRes_txt_(prev) + '. A sua reserva ' + prox.CODIGO + ' começa ' + FrotaRes_quando_(pIni, agora) + '.\n\n' +
            (livres.length ? 'Veículos livres no seu horário: ' + FrotaRes_listaPlacas_(livres) + '. Se preferir garantir, troque o veículo em Frota > Reservas > Minhas reservas > Trocar veículo.' : 'Nenhum outro veículo está livre no seu horário; a gestão foi avisada.') });
      }
      FrotaRes_avisar_({ tipo: 'ATRASO_GESTAO', reservaId: prox.ID, destinos: gestores, exceto: uidAtual,
        titulo: 'Frota: devolução atrasada do ' + FrotaRes_s_(v.PLACA) + ' com reserva às ' + FrotaRes_hora_(pIni),
        texto: 'O veículo ' + FrotaRes_s_(v.PLACA) + ' está com ' + (FrotaRes_s_(c.NOME) || 'condutor não identificado') + ' (devolução prevista ' + FrotaRes_txt_(prev) + '). ' + (manut ? 'Manutenção programada' : 'Reserva ' + prox.CODIGO + ' de ' + quem) + ' a partir de ' + FrotaRes_txt_(pIni) + '.\n' +
          (livres.length ? 'Livres no período da reserva: ' + FrotaRes_listaPlacas_(livres) + '.' : 'Nenhum outro veículo está livre no período da reserva.') + ' O condutor recebeu a cobrança no sistema e em Minhas atividades.' });
    }
    if (pIni <= agora) {
      var chaveAf = 'AFETOU|' + m.ID + '|' + prox.ID;
      if (!FrotaRes_temEvento_(chaveAf)) {
        FrotaRes_evento_('ATRASO_AFETOU', { sessao: FROTA_RES_SISTEMA, chave: chaveAf, reservaId: prox.ID, codigo: prox.CODIGO, veiculoId: vid, placa: v.PLACA, afetadoId: uidAtual, afetadoNome: FrotaRes_s_(c.NOME),
          movimentacaoId: m.ID, dataRef: FrotaRes_data_(pIni), detalhe: 'A ' + (manut ? 'manutenção programada' : 'reserva') + ' ' + prox.CODIGO + ' começou às ' + FrotaRes_hora_(pIni) + ' com o veículo ainda fora (devolução prevista ' + FrotaRes_txt_(prev) + ').' });
        res.afetadas++;
      }
    }
  });

  // 3. véspera: lembrete e conferência (e novo aviso se surgir problema depois)
  var docs = Frota_registrosValidos_(SGO_CFG.SHEETS.REG_FROTA_DOCUMENTO), ultimas = Frota_ultimasManutencoesPorVeiculo_();
  var paradas = Frota_lerSeExistir_(SGO_CFG.SHEETS.REG_FROTA_PARADA);
  var noExp = FrotaRes_noExpediente_(o);
  FrotaRes_todas_().forEach(function (r) {
    if (FrotaRes_up_(r.SITUACAO) !== 'RESERVADA' || FrotaRes_up_(r.TIPO) === 'MANUTENCAO') return;
    var ini = FrotaRes_iniMs_(r), fim = FrotaRes_fimMs_(r);
    if (ini === null || ini <= agora || ini - agora > 5 * 86400000) return;
    var criado = new Date(FrotaRes_s_(r.CRIADO_EM)).getTime();
    var probs = FrotaRes_problemas_(r, { agora: agora, veiculos: veics, condutores: cnd, movs: movs, paradas: paradas, docs: docs, ultimas: ultimas, cfg: cfg });
    var assinatura = probs.slice().sort().join(' | ');
    var jaLembrado = !!FrotaRes_s_(r.LEMBRETE_EM);
    var hora = agora >= FrotaRes_vesperaMs_(ini, cfg);
    var novoProblema = jaLembrado && probs.length && assinatura !== FrotaRes_s_(r.CONFERENCIA_PROBLEMAS);
    if (!noExp || (!hora && !novoProblema) || (jaLembrado && !novoProblema)) {
      // já lembrado e sem problema novo: só guarda a conferência atual (problema resolvido some da assinatura)
      if (jaLembrado && assinatura !== FrotaRes_s_(r.CONFERENCIA_PROBLEMAS) && !probs.length) SGO_DATA.update(FROTA_RES_ABA, r.ID, { CONFERENCIA_EM: SGO_UTILS.nowIso(), CONFERENCIA_PROBLEMAS: '' });
      return;
    }
    if (!jaLembrado && isFinite(criado) && Date.now() - criado < 60 * 60000 && !probs.length) return; // acabou de reservar: não precisa de lembrete
    var livres = probs.length ? FrotaRes_livres_(ini, fim, { agora: agora, exceto: r.VEICULO_ID, condutorId: FrotaRes_s_(r.CONDUTOR_ID) }) : [];
    var cab = 'Reserva ' + r.CODIGO + ': veículo ' + r.PLACA + ', ' + FrotaRes_periodo_(ini, fim) + '.\nDestino: ' + FrotaRes_s_(r.DESTINO) + '\nMotivo: ' + FrotaRes_s_(r.MOTIVO);
    var probTxt = probs.length ? '\n\nA conferência automática encontrou problema: ' + probs.join('; ') + '.\n' + (livres.length ? 'Veículos livres no mesmo período: ' + FrotaRes_listaPlacas_(livres) + '. Troque em Frota > Reservas > Minhas reservas > Trocar veículo.' : 'Nenhum veículo está livre no mesmo período; a gestão foi avisada.') : '';
    if (!jaLembrado && FrotaRes_s_(r.USUARIO_ID)) {
      FrotaRes_avisar_({ tipo: 'LEMBRETE', reservaId: r.ID, destinos: [r.USUARIO_ID], titulo: 'Lembrete: sua reserva do veículo ' + r.PLACA + ' ' + FrotaRes_quando_(ini, agora) + (probs.length ? ' (com problema)' : ''),
        texto: cab + (probs.length ? probTxt : '\n\nA conferência automática não encontrou problema: veículo ativo, sem parada nem manutenção no período e documentos válidos.') + '\n\nNo horário, retire o veículo em Frota > Situação e retiradas. Se não for usar, cancele em Frota > Reservas > Minhas reservas.' });
      res.lembretes++;
    } else if (novoProblema && FrotaRes_s_(r.USUARIO_ID)) {
      FrotaRes_avisar_({ tipo: 'CONFERENCIA_PROBLEMA', reservaId: r.ID, destinos: [r.USUARIO_ID], titulo: 'Problema na sua reserva do veículo ' + r.PLACA + ' (' + FrotaRes_quando_(ini, agora) + ')', texto: cab + probTxt });
    }
    if (probs.length) {
      FrotaRes_evento_('CONFERENCIA_PROBLEMA', { sessao: FROTA_RES_SISTEMA, reservaId: r.ID, codigo: r.CODIGO, veiculoId: r.VEICULO_ID, placa: r.PLACA, afetadoId: r.USUARIO_ID, afetadoNome: r.CONDUTOR_NOME, dataRef: FrotaRes_s_(r.DATA_INICIO),
        chave: 'CONF|' + r.ID + '|' + FrotaRes_hash_(assinatura), detalhe: probs.join('; ') });
      FrotaRes_avisar_({ tipo: 'CONFERENCIA_GESTAO', reservaId: r.ID, destinos: gestores, exceto: r.USUARIO_ID, titulo: 'Frota: reserva ' + r.CODIGO + ' (' + r.PLACA + ', ' + FrotaRes_quando_(ini, agora) + ') com problema',
        texto: 'Reserva de ' + FrotaRes_s_(r.CONDUTOR_NOME) + ': veículo ' + r.PLACA + ', ' + FrotaRes_periodo_(ini, fim) + '.\nProblema: ' + probs.join('; ') + '.\n' + (livres.length ? 'Livres no período: ' + FrotaRes_listaPlacas_(livres) + '. A troca pode ser feita pela gestão em Frota > Reservas (abrir a reserva > Trocar veículo).' : 'Nenhum veículo livre no período.') });
      res.problemas++;
    }
    SGO_DATA.update(FROTA_RES_ABA, r.ID, { LEMBRETE_EM: jaLembrado ? r.LEMBRETE_EM : SGO_UTILS.nowIso(), CONFERENCIA_EM: SGO_UTILS.nowIso(), CONFERENCIA_PROBLEMAS: assinatura });
  });

  res.emails = FrotaRes_enviarEmails_(o).enviados || 0;
  if (res.naoUtilizadas || res.concluidas || res.atrasos || res.problemas) { try { if (typeof SGO_Pendencias_invalidar_ === 'function') SGO_Pendencias_invalidar_(); } catch (eP) {} }
  return res;
}
function FrotaRes_hash_(s) {
  if (typeof Notificar_hash_ === 'function') return Notificar_hash_(s);
  var h = 5381; s = String(s || ''); for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return (h >>> 0).toString(36);
}

// ------------------------------------------------------------
// TELA: AGENDA, MINHAS RESERVAS, LIVRES
// ------------------------------------------------------------
function FrotaRes_paraTela_(r, sessao, agora) {
  var ini = FrotaRes_iniMs_(r), fim = FrotaRes_fimMs_(r), sit = FrotaRes_up_(r.SITUACAO);
  var dono = FrotaRes_ehDono_(sessao, r), ve = dono || sessao.gestao;
  var hist = [];
  if (ve) { try { hist = JSON.parse(String(r.HISTORICO_JSON || '[]')); } catch (e) { hist = []; } }
  return {
    id: FrotaRes_s_(r.ID), codigo: FrotaRes_s_(r.CODIGO), tipo: FrotaRes_up_(r.TIPO) === 'MANUTENCAO' ? 'MANUTENCAO' : 'USO', veiculoId: FrotaRes_s_(r.VEICULO_ID), placa: FrotaRes_s_(r.PLACA),
    condutor: FrotaRes_s_(r.CONDUTOR_NOME), minha: FrotaRes_s_(r.USUARIO_ID) === sessao.userId && !!sessao.userId,
    inicio: FrotaRes_txt_(ini), fim: FrotaRes_txt_(fim), periodo: ini !== null && fim !== null ? FrotaRes_periodo_(ini, fim) : '', quando: ini !== null ? FrotaRes_quando_(ini, agora) : '',
    dataInicio: Frota_textoData_(r.DATA_INICIO), horaInicio: Frota_textoHora_(r.HORA_INICIO), dataFim: Frota_textoData_(r.DATA_FIM), horaFim: Frota_textoHora_(r.HORA_FIM),
    situacao: sit, situacaoTexto: FROTA_RES_SITUACOES[sit] || sit,
    destino: ve ? FrotaRes_s_(r.DESTINO) : '', motivo: ve || FrotaRes_up_(r.TIPO) === 'MANUTENCAO' ? FrotaRes_s_(r.MOTIVO) : '', passageiros: ve ? FrotaRes_s_(r.PASSAGEIROS) : '', vinculo: ve ? FrotaRes_s_(r.VINCULO_TEXTO) : '',
    criadaPor: FrotaRes_s_(r.CRIADA_POR_NOME), pelaGestao: FrotaRes_up_(r.PELA_GESTAO) === 'SIM',
    canceladaPor: FrotaRes_s_(r.CANCELADA_POR_NOME), motivoCancelamento: ve ? FrotaRes_s_(r.MOTIVO_CANCELAMENTO) : '',
    liberada: !!FrotaRes_s_(r.LIBERADA_EM), liberadaPor: FrotaRes_s_(r.LIBERADA_POR_NOME), liberadaJustificativa: ve ? FrotaRes_s_(r.LIBERADA_JUSTIFICATIVA) : '',
    problemas: ve && sit === 'RESERVADA' ? FrotaRes_s_(r.CONFERENCIA_PROBLEMAS) : '',
    podeCancelar: sit === 'RESERVADA' && (dono || sessao.gestao), podeTrocar: sit === 'RESERVADA' && (dono || sessao.gestao) && FrotaRes_up_(r.TIPO) !== 'MANUTENCAO',
    historico: hist.slice(-12)
  };
}

/** Agenda (semana ou dia) + minhas reservas + opções do formulário. Leitura. */
function FrotaRes_painel_(sessao, p) {
  p = p || {};
  FrotaRes_garantirAbas_();
  try { FrotaRes_rodada_(); } catch (eR) { console.error('Reservas, rodada ao abrir: ' + ((eR && eR.message) || eR)); }
  var agora = FrotaRes_agora_(), cfg = FrotaRes_cfg_();
  var dias = Number(p.dias) === 1 ? 1 : 7;
  var de = FrotaRes_ms_(p.de, '00:00');
  if (de === null) {
    de = FrotaRes_iniDia_(agora);
    if (dias === 7) { var d0 = new Date(de); var dow = (d0.getDay() + 6) % 7; d0.setDate(d0.getDate() - dow); de = d0.getTime(); }
  }
  var ate = new Date(de); ate.setDate(ate.getDate() + dias); var ateMs = ate.getTime();
  var total = (ateMs - de) / 60000;
  var pos = function (ms) { return Math.round((Math.max(de, Math.min(ateMs, ms)) - de) / 60000); };
  var todas = FrotaRes_todas_(), movs = Frota_lerSeExistir_(SGO_CFG.SHEETS.REG_FROTA_MOVIMENTACAO), paradas = Frota_lerSeExistir_(SGO_CFG.SHEETS.REG_FROTA_PARADA);
  var cnd = FrotaRes_condutores_();
  var veiculos = FrotaRes_veiculosAtivos_().map(function (v) {
    var vid = FrotaRes_s_(v.ID), itens = [];
    todas.forEach(function (r) {
      if (FrotaRes_s_(r.VEICULO_ID) !== vid) return;
      var sit = FrotaRes_up_(r.SITUACAO);
      if (sit === 'CANCELADA') return;
      var a = FrotaRes_iniMs_(r), b = FrotaRes_fimMs_(r);
      if (a === null || b === null || !(a < ateMs && b > de)) return;
      var t = FrotaRes_paraTela_(r, sessao, agora);
      itens.push({ tipo: t.tipo === 'MANUTENCAO' ? 'MANUTENCAO' : 'RESERVA', a: pos(a), b: pos(b), id: t.id, codigo: t.codigo, minha: t.minha, situacao: sit,
        rotulo: t.tipo === 'MANUTENCAO' ? 'Manutenção' : t.condutor, periodo: t.periodo, detalhe: (t.tipo === 'MANUTENCAO' ? 'Manutenção programada: ' + t.motivo : 'Reserva ' + t.codigo + ' de ' + t.condutor + (t.destino ? ' — ' + t.destino : '')) + ' (' + t.periodo + ', ' + t.situacaoTexto.toLowerCase() + ')' });
    });
    movs.forEach(function (m) {
      if (FrotaRes_s_(m.VEICULO_ID) !== vid) return;
      var a = FrotaRes_saidaMs_(m), aberta = FrotaRes_up_(m.STATUS) === 'EM_ANDAMENTO';
      if (a === null) return;
      var prev = FrotaRes_previstaMs_(m);
      var b = aberta ? Math.max(agora, prev !== null ? prev : agora + 30 * 60000) : FrotaRes_chegadaMs_(m);
      if (b === null || !(a < ateMs && b > de)) return;
      var nome = FrotaRes_s_((cnd[FrotaRes_s_(m.CONDUTOR_ID)] || {}).NOME) || 'Condutor';
      itens.push({ tipo: 'RETIRADA', a: pos(a), b: pos(b), aberta: aberta, atrasada: aberta && prev !== null && prev < agora, rotulo: nome,
        detalhe: 'Retirada de ' + nome + ' em ' + FrotaRes_txt_(a) + (aberta ? ' (em uso' + (prev !== null ? ', devolução prevista ' + FrotaRes_txt_(prev) + (prev < agora ? ', atrasada' : '') : '') + ')' : ', devolvido em ' + FrotaRes_txt_(b)) });
    });
    paradas.forEach(function (pa) {
      if (FrotaRes_s_(pa.VEICULO_ID) !== vid || FrotaRes_s_(pa.EXCLUIDO_EM)) return;
      var a = FrotaRes_ms_(Frota_textoData_(pa.DATA_INICIO), '00:00'), b = FrotaRes_s_(pa.DATA_FIM) ? FrotaRes_ms_(Frota_textoData_(pa.DATA_FIM), '23:59') : ateMs;
      if (a === null || b === null || !(a < ateMs && b > de)) return;
      itens.push({ tipo: 'PARADA', a: pos(a), b: pos(b), rotulo: FrotaRes_s_(pa.MOTIVO) || 'Parada', detalhe: 'Parada: ' + (FrotaRes_s_(pa.MOTIVO) || '') + (FrotaRes_s_(pa.DATA_FIM) ? ' até ' + Frota_textoData_(pa.DATA_FIM) : ' (sem data de fim)') });
    });
    itens.sort(function (x, y) { return x.a - y.a; });
    var sitV = movs.some(function (m) { return FrotaRes_s_(m.VEICULO_ID) === vid && FrotaRes_up_(m.STATUS) === 'EM_ANDAMENTO'; }) ? 'EM_USO' : 'DISPONIVEL';
    return { id: vid, placa: FrotaRes_s_(v.PLACA), modelo: FrotaRes_s_(v.MODELO), situacao: sitV, itens: itens };
  });
  var diasLista = [];
  for (var i = 0; i < dias; i++) { var di = new Date(de); di.setDate(di.getDate() + i); diasLista.push({ data: FrotaRes_data_(di.getTime()), rotulo: FROTA_RES_SEMANA[di.getDay()] + ' ' + FrotaRes_2_(di.getDate()) + '/' + FrotaRes_2_(di.getMonth() + 1), a: pos(di.getTime()), hoje: FrotaRes_iniDia_(di.getTime()) === FrotaRes_iniDia_(agora) }); }
  var ant = new Date(de); ant.setDate(ant.getDate() - dias); var prox = new Date(de); prox.setDate(prox.getDate() + dias);
  var condutor = Frota_obterCondutorPorUsuario_(sessao.userId);
  var desde = agora - 45 * 86400000;
  var minhas = todas.filter(function (r) {
    if (FrotaRes_s_(r.USUARIO_ID) !== sessao.userId || !sessao.userId) return false;
    var b = FrotaRes_fimMs_(r);
    return b === null || b >= desde || FrotaRes_up_(r.SITUACAO) === 'RESERVADA';
  }).map(function (r) { return FrotaRes_paraTela_(r, sessao, agora); }).sort(function (x, y) {
    var ax = FrotaRes_ms_(x.dataInicio, x.horaInicio) || 0, ay = FrotaRes_ms_(y.dataInicio, y.horaInicio) || 0;
    var fx = ['RESERVADA', 'INICIADA'].indexOf(x.situacao) >= 0 ? 0 : 1, fy = ['RESERVADA', 'INICIADA'].indexOf(y.situacao) >= 0 ? 0 : 1;
    return fx - fy || (fx === 0 ? ax - ay : ay - ax);
  });
  var gestaoLista = sessao.gestao ? todas.filter(function (r) { var b = FrotaRes_fimMs_(r); return FrotaRes_up_(r.SITUACAO) === 'RESERVADA' || (b !== null && b >= agora - 7 * 86400000); })
    .map(function (r) { return FrotaRes_paraTela_(r, sessao, agora); }).sort(function (x, y) { return (FrotaRes_ms_(x.dataInicio, x.horaInicio) || 0) - (FrotaRes_ms_(y.dataInicio, y.horaInicio) || 0); }).slice(0, 200) : [];
  var hoje = FrotaRes_data_(agora);
  return {
    ok: true, agora: FrotaRes_txt_(agora), hoje: hoje, horaAgora: FrotaRes_hora_(agora), agoraPos: agora >= de && agora < ateMs ? pos(agora) : null,
    de: FrotaRes_data_(de), ate: FrotaRes_data_(ateMs - 60000), dias: dias, totalMin: total, diasLista: diasLista, anterior: FrotaRes_data_(ant.getTime()), proximo: FrotaRes_data_(prox.getTime()),
    veiculos: veiculos, minhas: minhas, todas: gestaoLista, gestor: sessao.gestao,
    condutor: condutor ? { id: FrotaRes_s_(condutor.ID), nome: FrotaRes_s_(condutor.NOME), cnhProblema: FrotaRes_problemaCnh_(condutor, agora) } : null,
    condutores: sessao.gestao ? Frota_lerSeExistir_(SGO_CFG.SHEETS.CAD_CONDUTORES).filter(function (c) { return FrotaRes_up_(c.STATUS) !== 'INATIVO'; }).map(function (c) { return { id: FrotaRes_s_(c.ID), nome: FrotaRes_s_(c.NOME) }; }) : [],
    cfg: cfg, vinculos: FrotaRes_opcoesVinculo_(sessao), situacoes: FROTA_RES_SITUACOES
  };
}

function FrotaRes_opcoesVinculo_(sessao) {
  var atividades = [], clientes = [];
  try {
    if (typeof Atividades_todas_ === 'function') atividades = Atividades_todas_().filter(function (a) { return FrotaRes_s_(a.RESPONSAVEL_ID) === sessao.userId && ['Concluída', 'Cancelada'].indexOf(a.SITUACAO) < 0; })
      .slice(0, 60).map(function (a) { return { id: FrotaRes_s_(a.ID), texto: FrotaRes_s_(a.TITULO).slice(0, 120) }; });
  } catch (e) {}
  try {
    clientes = Frota_lerSeExistir_(SGO_CFG.SHEETS.CAD_CLIENTES).filter(function (c) { return FrotaRes_up_(c.STATUS || 'ATIVO') !== 'INATIVO'; })
      .map(function (c) { return { id: FrotaRes_s_(c.ID), texto: FrotaRes_s_(c.NOME_FANTASIA) || FrotaRes_s_(c.RAZAO_SOCIAL) }; }).filter(function (c) { return c.texto; })
      .sort(function (a, b) { return a.texto.localeCompare(b.texto); }).slice(0, 800);
  } catch (e2) {}
  return { atividades: atividades, clientes: clientes, tipos: FROTA_RES_VINCULOS };
}

/** Veículos livres no período (o formulário Reservar sugere o primeiro). */
function FrotaRes_livresApi_(sessao, p) {
  p = p || {};
  var ini = FrotaRes_ms_(p.dataInicio, p.horaInicio), fim = FrotaRes_ms_(p.dataFim, p.horaFim);
  if (ini === null || fim === null || fim <= ini) return { ok: true, livres: [], ocupados: [], aviso: 'Preencha início e fim para ver os veículos livres.' };
  var condutorId = '';
  try { var c = sessao.gestao && p.condutorId ? SGO_DATA.getById(SGO_CFG.SHEETS.CAD_CONDUTORES, p.condutorId) : Frota_obterCondutorPorUsuario_(sessao.userId); condutorId = c ? FrotaRes_s_(c.ID) : ''; } catch (e) {}
  var base = { reservas: FrotaRes_todas_(), movs: Frota_lerSeExistir_(SGO_CFG.SHEETS.REG_FROTA_MOVIMENTACAO), paradas: Frota_lerSeExistir_(SGO_CFG.SHEETS.REG_FROTA_PARADA), condutores: FrotaRes_condutores_(), condutorId: condutorId };
  var livres = [], ocupados = [];
  FrotaRes_veiculosAtivos_().forEach(function (v) {
    var conf = FrotaRes_conflitos_(FrotaRes_s_(v.ID), ini, fim, base);
    var x = { id: FrotaRes_s_(v.ID), placa: FrotaRes_s_(v.PLACA), modelo: FrotaRes_s_(v.MODELO) };
    if (conf.length) { x.motivo = conf[0].texto; ocupados.push(x); } else livres.push(x);
  });
  return { ok: true, livres: livres, ocupados: ocupados, periodo: FrotaRes_periodo_(ini, fim) };
}

/** Próxima reserva de cada veículo e as minhas (tela inicial da Frota, celular e computador). */
function FrotaRes_resumoInicio_(sessao, condutorId) {
  try {
    var agora = FrotaRes_agora_(), cfg = FrotaRes_cfg_(), porVeiculo = {}, minhas = [];
    FrotaRes_todas_().forEach(function (r) {
      if (FrotaRes_up_(r.SITUACAO) !== 'RESERVADA') return;
      var a = FrotaRes_iniMs_(r), b = FrotaRes_fimMs_(r);
      if (a === null || b === null || b <= agora) return;
      var vid = FrotaRes_s_(r.VEICULO_ID), manut = FrotaRes_up_(r.TIPO) === 'MANUTENCAO';
      var minha = !manut && !!condutorId && FrotaRes_s_(r.CONDUTOR_ID) === condutorId;
      var x = { codigo: FrotaRes_s_(r.CODIGO), quem: manut ? 'Manutenção programada' : FrotaRes_s_(r.CONDUTOR_NOME), minha: minha, manutencao: manut,
        inicio: FrotaRes_txt_(a), fim: FrotaRes_txt_(b), quando: FrotaRes_quando_(a, agora), periodo: FrotaRes_periodo_(a, b), emCurso: a <= agora,
        devolverAte: FrotaRes_quando_(a - cfg.folgaMin * 60000, agora), fimData: FrotaRes_data_(b), fimHora: FrotaRes_hora_(b), placa: FrotaRes_s_(r.PLACA), destino: minha ? FrotaRes_s_(r.DESTINO) : '', ordem: a };
      if (!porVeiculo[vid] || porVeiculo[vid].ordem > a) porVeiculo[vid] = x;
      if (minha && a - agora <= 7 * 86400000) minhas.push(x);
    });
    minhas.sort(function (p, q) { return p.ordem - q.ordem; });
    // o veículo da minha reserva "agora" (dentro da antecipação) aparece como minha, mesmo com outra reserva antes
    return { porVeiculo: porVeiculo, minhas: minhas.slice(0, 5), folgaMin: cfg.folgaMin, antecipacaoMin: cfg.antecipacaoMin, agoraData: FrotaRes_data_(agora), agoraHora: FrotaRes_hora_(agora),
      fimExpediente: (typeof SGO_expediente_ === 'function' ? SGO_expediente_().fim : '17:30') || '17:30' };
  } catch (e) { console.error('Reservas no início da Frota: ' + ((e && e.message) || e)); return null; }
}

// ------------------------------------------------------------
// INDICADORES, COPILOTO, CONDUTA E RELATÓRIO
// ------------------------------------------------------------
function FrotaRes_periodoIndicadores_(p) {
  var agora = FrotaRes_agora_();
  var de = FrotaRes_ms_(p.de, '00:00'), ate = FrotaRes_ms_(p.ate, '23:59');
  if (p.competencia && /^\d{4}-\d{2}$/.test(String(p.competencia))) {
    var a = Number(String(p.competencia).slice(0, 4)), m = Number(String(p.competencia).slice(5));
    de = new Date(a, m - 1, 1, 0, 0, 0).getTime(); ate = new Date(a, m, 0, 23, 59, 0).getTime();
  }
  if (de === null) { var d = new Date(agora); de = new Date(d.getFullYear(), d.getMonth(), 1).getTime(); }
  if (ate === null) ate = FrotaRes_iniDia_(agora) + 86399000;
  if (ate < de) throw new Error('A data final do período é anterior à inicial. Corrija o período.');
  if (ate - de > 400 * 86400000) throw new Error('Escolha um período de até 400 dias.');
  return { de: de, ate: ate, texto: FrotaRes_data_(de) + ' a ' + FrotaRes_data_(ate) };
}

function FrotaRes_indicadores_(p) {
  p = p || {};
  var per = FrotaRes_periodoIndicadores_(p), agora = FrotaRes_agora_();
  var dentro = function (ms) { return ms !== null && ms >= per.de && ms <= per.ate; };
  var reservas = FrotaRes_todas_().filter(function (r) { return FrotaRes_up_(r.TIPO) !== 'MANUTENCAO' && dentro(FrotaRes_iniMs_(r)); });
  var eventos = FrotaRes_eventos_().filter(function (e) { var ms = FrotaRes_ms_(Frota_textoData_(e.DATA_REF), '12:00'); if (ms === null) { var q = String(e.QUANDO || '').slice(0, 10); ms = FrotaRes_ms_(q, '12:00'); } return dentro(ms); });
  var conta = function (tipo) { var vistos = {}; eventos.forEach(function (e) { if (FrotaRes_s_(e.TIPO) === tipo) vistos[FrotaRes_s_(e.CHAVE) || FrotaRes_s_(e.ID)] = 1; }); return Object.keys(vistos).length; };
  var porSit = { RESERVADA: 0, INICIADA: 0, CONCLUIDA: 0, CANCELADA: 0, NAO_UTILIZADA: 0 };
  var canceladasGestao = 0;
  reservas.forEach(function (r) { var s = FrotaRes_up_(r.SITUACAO); porSit[s] = (porSit[s] || 0) + 1; if (s === 'CANCELADA' && FrotaRes_s_(r.CANCELADA_POR_ID) && FrotaRes_s_(r.CANCELADA_POR_ID) !== FrotaRes_s_(r.USUARIO_ID) && FrotaRes_s_(r.CANCELADA_POR_ID) !== FrotaRes_s_(r.CRIADA_POR_ID)) canceladasGestao++; });
  var cumpridas = porSit.INICIADA + porSit.CONCLUIDA;
  var decididas = cumpridas + porSit.NAO_UTILIZADA;
  var veics = {}, conds = {}, semana = [0, 0, 0, 0, 0, 0, 0], disputaSemana = [0, 0, 0, 0, 0, 0, 0];
  FrotaRes_veiculosAtivos_().forEach(function (v) { veics[FrotaRes_s_(v.ID)] = { placa: FrotaRes_s_(v.PLACA), reservas: 0, horas: 0, recusas: 0, bloqueios: 0, naoUtilizadas: 0 }; });
  reservas.forEach(function (r) {
    var vid = FrotaRes_s_(r.VEICULO_ID), a = FrotaRes_iniMs_(r), b = FrotaRes_fimMs_(r), s = FrotaRes_up_(r.SITUACAO);
    var v = veics[vid] || (veics[vid] = { placa: FrotaRes_s_(r.PLACA), reservas: 0, horas: 0, recusas: 0, bloqueios: 0, naoUtilizadas: 0 });
    if (s !== 'CANCELADA') { v.reservas++; if (a !== null && b !== null) v.horas += (b - a) / 3600000; semana[new Date(a).getDay()]++; }
    if (s === 'NAO_UTILIZADA') v.naoUtilizadas++;
    var cid = FrotaRes_s_(r.CONDUTOR_ID);
    var c = conds[cid] || (conds[cid] = { nome: FrotaRes_s_(r.CONDUTOR_NOME), reservas: 0, cumpridas: 0, naoUtilizadas: 0, canceladas: 0, atrasosAfetaram: 0 });
    if (s !== 'CANCELADA') c.reservas++;
    if (s === 'INICIADA' || s === 'CONCLUIDA') c.cumpridas++;
    if (s === 'NAO_UTILIZADA') c.naoUtilizadas++;
    if (s === 'CANCELADA') c.canceladas++;
  });
  var usuarioCond = {};
  Frota_lerSeExistir_(SGO_CFG.SHEETS.CAD_CONDUTORES).forEach(function (c) { if (FrotaRes_s_(c.USUARIO_ID)) usuarioCond[FrotaRes_s_(c.USUARIO_ID)] = c; });
  var liberacoes = [], afetaram = [];
  eventos.forEach(function (e) {
    var t = FrotaRes_s_(e.TIPO), v = veics[FrotaRes_s_(e.VEICULO_ID)];
    var ms = FrotaRes_ms_(Frota_textoData_(e.DATA_REF), '12:00');
    if (t === 'RECUSA_SOBREPOSICAO') { if (v) v.recusas++; if (ms !== null) disputaSemana[new Date(ms).getDay()]++; }
    if (t === 'RETIRADA_BLOQUEADA') { if (v) v.bloqueios++; if (ms !== null) disputaSemana[new Date(ms).getDay()]++; }
    if (t === 'LIBERACAO_GESTAO') liberacoes.push({ quando: FrotaRes_s_(e.QUANDO), placa: FrotaRes_s_(e.PLACA), codigo: FrotaRes_s_(e.CODIGO), por: FrotaRes_s_(e.USUARIO_NOME), afetado: FrotaRes_s_(e.AFETADO_NOME), justificativa: FrotaRes_s_(e.JUSTIFICATIVA) });
    if (t === 'ATRASO_AFETOU') {
      afetaram.push({ quando: FrotaRes_s_(e.QUANDO), placa: FrotaRes_s_(e.PLACA), codigo: FrotaRes_s_(e.CODIGO), condutor: FrotaRes_s_(e.AFETADO_NOME), detalhe: FrotaRes_s_(e.DETALHE) });
      var c0 = usuarioCond[FrotaRes_s_(e.AFETADO_ID)];
      if (c0) { var k = FrotaRes_s_(c0.ID); var cc = conds[k] || (conds[k] = { nome: FrotaRes_s_(c0.NOME), reservas: 0, cumpridas: 0, naoUtilizadas: 0, canceladas: 0, atrasosAfetaram: 0 }); cc.atrasosAfetaram++; }
    }
  });
  var horasPeriodo = Math.max(1, (per.ate - per.de) / 3600000);
  var listaV = Object.keys(veics).map(function (k) { var v = veics[k]; v.horas = Math.round(v.horas * 10) / 10; v.ocupacaoPct = Math.round(v.horas / horasPeriodo * 1000) / 10; v.disputas = v.recusas + v.bloqueios; return v; })
    .sort(function (a, b) { return b.disputas - a.disputas || b.reservas - a.reservas || a.placa.localeCompare(b.placa); });
  var listaC = Object.keys(conds).map(function (k) { return conds[k]; }).filter(function (c) { return c.nome; }).sort(function (a, b) { return b.reservas - a.reservas || a.nome.localeCompare(b.nome); });
  return {
    ok: true, periodo: per.texto, deTxt: FrotaRes_data_(per.de), ateTxt: FrotaRes_data_(per.ate),
    total: reservas.length, porSituacao: porSit, cumpridas: cumpridas, cumprimentoPct: decididas ? Math.round(cumpridas / decididas * 1000) / 10 : null,
    canceladas: porSit.CANCELADA, canceladasGestao: canceladasGestao, naoUtilizadas: porSit.NAO_UTILIZADA,
    atrasosComReserva: conta('ATRASO_DEVOLUCAO'), atrasosAfetaram: conta('ATRASO_AFETOU'), bloqueadas: conta('RETIRADA_BLOQUEADA'), liberacoes: conta('LIBERACAO_GESTAO'), recusas: conta('RECUSA_SOBREPOSICAO'),
    conferenciasComProblema: conta('CONFERENCIA_PROBLEMA'),
    veiculos: listaV, condutores: listaC, reservasPorDia: semana, disputasPorDia: disputaSemana, diasSemana: FROTA_RES_SEMANA,
    liberacoesLista: liberacoes.slice(-30), afetaramLista: afetaram.slice(-30), geradoEm: FrotaRes_txt_(agora)
  };
}

/** Copiloto da Frota: sugestões a partir das reservas (só sugestão; a gestão decide). */
function FrotaRes_sugestoesCopiloto_(dias) {
  var out = [];
  try {
    var agora = FrotaRes_agora_(), de = FrotaRes_iniDia_(agora) - (dias || 30) * 86400000;
    var ind = FrotaRes_indicadores_({ de: FrotaRes_data_(de), ate: FrotaRes_data_(agora) });
    var mes = new Date(agora).getFullYear() + '-' + FrotaRes_2_(new Date(agora).getMonth() + 1);
    var veics = {}; FrotaRes_veiculosAtivos_().forEach(function (v) { veics[FrotaRes_s_(v.PLACA)] = FrotaRes_s_(v.ID); });
    ind.veiculos.forEach(function (v) {
      if (v.disputas < 3) return;
      out.push({ chave: 'RESDISP|' + v.placa + '|' + mes, tipo: 'USO', gravidade: v.disputas >= 6 ? 'ALTA' : 'MEDIA', veiculoId: veics[v.placa] || '', placa: v.placa,
        titulo: 'Veículo ' + v.placa + ': disputado (' + v.disputas + ' pedidos recusados ou retiradas bloqueadas por reserva)',
        detalhe: 'Nos últimos ' + dias + ' dias: ' + v.recusas + ' pedido(s) de reserva recusado(s) por sobreposição e ' + v.bloqueios + ' retirada(s) bloqueada(s) por reserva; ' + v.reservas + ' reserva(s), ' + String(v.ocupacaoPct).replace('.', ',') + '% do tempo reservado.',
        acao: 'Avaliar se a frota precisa de mais um veículo nos dias de pico, combinar a escala de uso ou reservar com mais antecedência as viagens fixas.', destinos: ['CASO', 'ATIVIDADE'], casoTipo: 'USO' });
    });
    var maxDia = 0, diaPico = -1;
    ind.disputasPorDia.forEach(function (n, i) { if (n > maxDia) { maxDia = n; diaPico = i; } });
    if (maxDia >= 3) {
      var nomes = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
      out.push({ chave: 'RESPICO|' + diaPico + '|' + mes, tipo: 'USO', gravidade: 'MEDIA', veiculoId: '', placa: '',
        titulo: 'Reservas: ' + nomes[diaPico] + ' concentra a disputa por veículo (' + maxDia + ' ocorrências)',
        detalhe: 'Nos últimos ' + dias + ' dias houve ' + maxDia + ' pedido(s) recusado(s) ou retirada(s) bloqueada(s) por reserva em ' + nomes[diaPico] + '.',
        acao: 'Planejar as viagens desse dia da semana com antecedência (reserva na semana anterior) ou remanejar compromissos para outros dias.', destinos: ['ATIVIDADE', 'CASO'], casoTipo: 'USO' });
    }
    ind.condutores.forEach(function (c) {
      if (c.naoUtilizadas >= 2) out.push({ chave: 'RESNAO|' + c.nome + '|' + mes, tipo: 'USO', gravidade: 'MEDIA', veiculoId: '', placa: '', condutorNome: c.nome,
        titulo: 'Condutor ' + c.nome + ': ' + c.naoUtilizadas + ' reservas não utilizadas', detalhe: c.naoUtilizadas + ' de ' + c.reservas + ' reserva(s) nos últimos ' + dias + ' dias ficaram sem retirada e seguraram o veículo à toa.',
        acao: 'Orientar a cancelar a reserva assim que souber que não vai usar o veículo.', destinos: ['ATIVIDADE'], casoTipo: 'USO' });
      if (c.atrasosAfetaram >= 2) out.push({ chave: 'RESATR|' + c.nome + '|' + mes, tipo: 'USO', gravidade: 'ALTA', veiculoId: '', placa: '', condutorNome: c.nome,
        titulo: 'Condutor ' + c.nome + ': ' + c.atrasosAfetaram + ' devoluções atrasadas que afetaram reserva', detalhe: 'Nos últimos ' + dias + ' dias, ' + c.atrasosAfetaram + ' reserva(s) começaram com o veículo ainda com ' + c.nome + '.',
        acao: 'Conversar sobre informar a devolução prevista real e avisar a gestão quando houver atraso.', destinos: ['ATIVIDADE', 'CASO'], casoTipo: 'USO' });
    });
    if (ind.liberacoes >= 3) out.push({ chave: 'RESLIB|' + mes, tipo: 'USO', gravidade: 'MEDIA', veiculoId: '', placa: '',
      titulo: 'Reservas: ' + ind.liberacoes + ' liberações pela gestão no período', detalhe: 'A gestão liberou ' + ind.liberacoes + ' retirada(s) sobre reservas de outras pessoas nos últimos ' + dias + ' dias.',
      acao: 'Revisar as justificativas das liberações (Frota > Reservas > Indicadores) e combinar quando a liberação é aceitável.', destinos: ['ATIVIDADE'], casoTipo: 'USO' });
  } catch (e) { console.error('Reservas no copiloto: ' + ((e && e.message) || e)); }
  return out;
}

/**
 * Programa de conduta: SUGESTÃO apenas (a gestão decide; nada vira ocorrência sozinho).
 * Só a devolução atrasada que prejudicou uma reserva (a reserva começou com o veículo ainda fora).
 * Retirada liberada pela gestão NÃO vira sugestão (a decisão foi da gestão).
 */
function FrotaRes_sugestoesConduta_(desdeIso, usuarioDoCondutor) {
  var saida = [];
  FrotaRes_eventos_().forEach(function (e) {
    if (FrotaRes_s_(e.TIPO) !== 'ATRASO_AFETOU' || !FrotaRes_s_(e.AFETADO_ID)) return;
    var br = Frota_textoData_(e.DATA_REF), m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(br);
    if (!m) return;
    var iso = m[3] + '-' + m[2] + '-' + m[1];
    if (iso < desdeIso) return;
    saida.push({ chave: 'FROTA|RESERVA_AFETADA|' + FrotaRes_s_(e.MOVIMENTACAO_ID) + '|' + FrotaRes_s_(e.RESERVA_ID), origem: 'FROTA', tipo: 'DEVOLUCAO_ATRASADA_RESERVA', origemId: FrotaRes_s_(e.MOVIMENTACAO_ID),
      colaboradorId: FrotaRes_s_(e.AFETADO_ID), dataFato: iso, tipoCodigo: '',
      rotulo: 'Devolução do ' + FrotaRes_s_(e.PLACA) + ' em ' + br,
      titulo: 'Devolução atrasada do veículo ' + FrotaRes_s_(e.PLACA) + ' prejudicou a reserva ' + FrotaRes_s_(e.CODIGO),
      detalhe: FrotaRes_s_(e.DETALHE) + ' O catálogo não tem código próprio para atraso na devolução: escolha o código que se aplica ou descarte (por exemplo, se o atraso foi combinado com a gestão ou causado por imprevisto no atendimento).' });
  });
  return saida;
}

/** Relatório A4 de uso e reservas do mês (HTML + PDF na pasta da Frota). */
function FrotaRes_relatorio_(sessao, p) {
  p = p || {};
  var comp = /^\d{4}-\d{2}$/.test(String(p.competencia || '')) ? String(p.competencia) : (function () { var d = new Date(FrotaRes_agora_()); return d.getFullYear() + '-' + FrotaRes_2_(d.getMonth() + 1); })();
  var ind = FrotaRes_indicadores_({ competencia: comp });
  var meses = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  var nomeMes = meses[Number(comp.slice(5)) - 1] + ' de ' + comp.slice(0, 4);
  var a = Number(comp.slice(0, 4)), mm = Number(comp.slice(5));
  var de = new Date(a, mm - 1, 1).getTime(), ate = new Date(a, mm, 0, 23, 59).getTime();
  // uso realizado (retiradas) por veículo no mês
  var uso = {};
  Frota_lerSeExistir_(SGO_CFG.SHEETS.REG_FROTA_MOVIMENTACAO).forEach(function (m) {
    var s = FrotaRes_saidaMs_(m);
    if (s === null || s < de || s > ate) return;
    var vid = FrotaRes_s_(m.VEICULO_ID), u = uso[vid] || (uso[vid] = { retiradas: 0, horas: 0, km: 0, comReserva: 0, liberadas: 0 });
    u.retiradas++;
    var c = FrotaRes_up_(m.STATUS) === 'FINALIZADO' ? FrotaRes_chegadaMs_(m) : null;
    if (c !== null && c > s) u.horas += (c - s) / 3600000;
    var k = Frota_num_(m.KM_CHEGADA, NaN) - Frota_num_(m.KM_SAIDA, NaN);
    if (isFinite(k) && k > 0) u.km += k;
    if (FrotaRes_s_(m.RESERVA_ID)) u.comReserva++;
    if (FrotaRes_s_(m.RESERVA_LIBERADA_ID)) u.liberadas++;
  });
  var placaId = {}; FrotaRes_veiculosAtivos_().forEach(function (v) { placaId[FrotaRes_s_(v.PLACA)] = FrotaRes_s_(v.ID); });
  var n = function (v, c) { return typeof SGO_DocA4_num_ === 'function' ? SGO_DocA4_num_(v, c || 0) : String(v); };
  var padrao = 'Em ' + nomeMes + ' foram feitas ' + ind.total + ' reserva(s) de veículo. ' + (ind.cumprimentoPct !== null ? n(ind.cumprimentoPct, 1) + '% das reservas que chegaram ao horário foram cumpridas (retirada feita pelo reservante); ' : '') +
    ind.naoUtilizadas + ' ficaram sem uso e ' + ind.canceladas + ' foram canceladas' + (ind.canceladasGestao ? ' (' + ind.canceladasGestao + ' pela gestão)' : '') + '. ' +
    (ind.bloqueadas ? ind.bloqueadas + ' retirada(s) foram bloqueadas porque o veículo estava reservado para outra pessoa, ' : 'Nenhuma retirada precisou ser bloqueada por reserva, ') +
    (ind.liberacoes ? 'e a gestão liberou ' + ind.liberacoes + ' retirada(s) sobre reservas, com justificativa. ' : 'e não houve liberação pela gestão. ') +
    (ind.atrasosAfetaram ? ind.atrasosAfetaram + ' devolução(ões) atrasada(s) afetaram reservas: são os casos que mais atrasam viagens e merecem tratamento. ' : 'Nenhuma devolução atrasada afetou reserva. ') +
    (ind.recusas ? ind.recusas + ' pedido(s) de reserva foram recusados por sobreposição, o que indica disputa pelos veículos.' : '');
  var analise = typeof RelA4_analise_ === 'function' ? RelA4_analise_('Escreva a análise (2 parágrafos curtos) do relatório mensal de uso e reservas dos veículos da frota de uma empresa de engenharia clínica, para a gestão, com recomendações práticas. Use só estes dados:\n' +
    JSON.stringify({ mes: nomeMes, reservas: ind.total, cumprimentoPct: ind.cumprimentoPct, naoUtilizadas: ind.naoUtilizadas, canceladas: ind.canceladas, canceladasPelaGestao: ind.canceladasGestao, retiradasBloqueadas: ind.bloqueadas,
      liberacoesGestao: ind.liberacoes, atrasosQueAfetaramReserva: ind.atrasosAfetaram, recusasPorSobreposicao: ind.recusas, veiculos: ind.veiculos.map(function (v) { return { placa: v.placa, reservas: v.reservas, horasReservadas: v.horas, disputas: v.disputas }; }) }), padrao) : { texto: padrao, origem: 'PADRAO', aviso: '' };
  var tab = function (cols, linhas, o) { return RelA4_tabela_(cols, linhas, o); };
  var corpo = RelA4_secao_('Resumo', RelA4_kpis_([[String(ind.total), 'Reservas no mês'], [ind.cumprimentoPct === null ? '—' : n(ind.cumprimentoPct, 1) + '%', 'Reservas cumpridas', ind.cumprimentoPct !== null && ind.cumprimentoPct < 80 ? 'aviso' : 'ok'],
      [String(ind.naoUtilizadas), 'Não utilizadas', ind.naoUtilizadas ? 'aviso' : 'ok'], [String(ind.atrasosAfetaram), 'Atrasos que afetaram reserva', ind.atrasosAfetaram ? 'critico' : 'ok'],
      [String(ind.bloqueadas), 'Retiradas bloqueadas por reserva'], [String(ind.liberacoes), 'Liberações pela gestão', ind.liberacoes ? 'aviso' : 'ok']]) + RelA4_paragrafos_(analise.texto)) +
    RelA4_secao_('Uso e reservas por veículo', tab([{ t: 'Veículo' }, { t: 'Reservas', num: true }, { t: 'Horas reservadas', num: true }, { t: 'Tempo reservado', num: true }, { t: 'Retiradas', num: true }, { t: 'Horas em uso', num: true }, { t: 'KM rodado', num: true }, { t: 'Disputas', num: true }],
      ind.veiculos.map(function (v) { var u = uso[placaId[v.placa]] || { retiradas: 0, horas: 0, km: 0 }; return [v.placa, String(v.reservas), n(v.horas, 1), n(v.ocupacaoPct, 1) + '%', String(u.retiradas), n(Math.round(u.horas * 10) / 10, 1), n(u.km), v.disputas ? RelA4_marca_(String(v.disputas), v.disputas >= 3 ? 'critico' : 'aviso') : '0']; }),
      { legenda: 'Planejado (reservas) e realizado (retiradas) no mês. Disputas = pedidos recusados por sobreposição + retiradas bloqueadas por reserva.' })) +
    RelA4_secao_('Situação das reservas', tab([{ t: 'Situação' }, { t: 'Quantidade', num: true }],
      [['Cumpridas (retirada feita)', String(ind.cumpridas)], ['Ainda reservadas', String(ind.porSituacao.RESERVADA)], ['Não utilizadas', String(ind.naoUtilizadas)], ['Canceladas pelo reservante', String(ind.canceladas - ind.canceladasGestao)], ['Canceladas pela gestão', String(ind.canceladasGestao)]], { compacta: true }) +
      tab([{ t: 'Condutor' }, { t: 'Reservas', num: true }, { t: 'Cumpridas', num: true }, { t: 'Não utilizadas', num: true }, { t: 'Canceladas', num: true }, { t: 'Atrasos que afetaram reserva', num: true }],
        ind.condutores.map(function (c) { return [c.nome, String(c.reservas), String(c.cumpridas), String(c.naoUtilizadas), String(c.canceladas), c.atrasosAfetaram ? RelA4_marca_(String(c.atrasosAfetaram), 'critico') : '0']; }), { legenda: 'Por condutor', vazio: 'Nenhuma reserva no mês.', compacta: true })) +
    RelA4_secao_('Liberações pela gestão e atrasos que afetaram reserva', tab([{ t: 'Quando', nw: true }, { t: 'Veículo' }, { t: 'Reserva' }, { t: 'Liberado por' }, { t: 'Reservante' }, { t: 'Justificativa' }],
      ind.liberacoesLista.map(function (l) { return [l.quando, l.placa, l.codigo, l.por, l.afetado, l.justificativa]; }), { legenda: 'Retiradas liberadas sobre reserva de outra pessoa', vazio: 'Nenhuma liberação no mês.', compacta: true }) +
      tab([{ t: 'Quando', nw: true }, { t: 'Veículo' }, { t: 'Reserva' }, { t: 'Condutor em atraso' }, { t: 'O que houve' }],
        ind.afetaramLista.map(function (l) { return [l.quando, l.placa, l.codigo, l.condutor, l.detalhe]; }), { legenda: 'Devoluções atrasadas que afetaram reserva', vazio: 'Nenhuma devolução atrasada afetou reserva no mês.', compacta: true })) +
    RelA4_secao_('Método', '<p class="nota">Reserva cumprida: o reservante fez a retirada (a reserva passa a "em uso"). Não utilizada: sem retirada até ' + FrotaRes_cfg_().toleranciaMin + ' minutos depois do início (contados da devolução do veículo quando ele voltou atrasado). Retirada bloqueada: a devolução prevista mais a folga de ' + FrotaRes_cfg_().folgaMin +
      ' minutos passava do início de reserva de outra pessoa (contada uma vez por pessoa, reserva e dia). Atraso que afetou reserva: a reserva começou com o veículo ainda fora depois da devolução prevista. Tempo reservado: horas reservadas sobre as horas do mês. Nada é apagado: canceladas e não utilizadas ficam no histórico.</p>') +
    RelA4_assinaturas_(['Gestão da frota']);
  var html = RelA4_documento_({ titulo: 'Relatório de uso e reservas da frota', tituloCurto: 'Uso e reservas', sigla: 'FRT-RES', identificacao: nomeMes, emitidoPor: sessao.nome, corpo: corpo, tituloArquivo: 'Uso e reservas da frota' });
  var pasta = function () { return RelA4_subpasta_(FrotaRel_obterPastaRelatorios_(), 'Reservas'); };
  var gravacao = RelA4_salvar_(pasta, 'Frota ' + comp, html, { compartilhar: true });
  try { SGO_DATA.log('FROTA_RESERVAS_RELATORIO', sessao.usuario, comp + ' (análise: ' + (analise.origem === 'IA' ? 'IA' : 'texto padrão') + ')', 'FROTA'); } catch (e) {}
  return { ok: true, html: RelA4_injetarAvisos_(gravacao.html, RelA4_avisosPadrao_(gravacao, [analise])), link: gravacao.pdfUrl, htmlUrl: gravacao.htmlUrl, pastaUrl: gravacao.pastaUrl, analise: analise.origem, aviso: [gravacao.aviso, analise.aviso].filter(Boolean).join(' ') };
}

// ------------------------------------------------------------
// PENDÊNCIAS (central de alertas: sistema, cobra até resolver)
// ------------------------------------------------------------
function FrotaRes_pendencias_(add) {
  var todas = Frota_lerSeExistir_(FROTA_RES_ABA);
  if (!todas.length || typeof Pend_item_ !== 'function') return;
  var agora = FrotaRes_agora_(), cfg = FrotaRes_cfg_();
  var movs = Frota_lerSeExistir_(SGO_CFG.SHEETS.REG_FROTA_MOVIMENTACAO), cnd = FrotaRes_condutores_(), veics = FrotaRes_veiculos_();
  var paradas = Frota_lerSeExistir_(SGO_CFG.SHEETS.REG_FROTA_PARADA), docs = Frota_registrosValidos_(SGO_CFG.SHEETS.REG_FROTA_DOCUMENTO), ultimas = Frota_ultimasManutencoesPorVeiculo_();
  var tela = { tipo: 'frota_reservas' };
  var abertas = {};
  movs.forEach(function (m) { if (FrotaRes_up_(m.STATUS) === 'EM_ANDAMENTO') abertas[FrotaRes_s_(m.VEICULO_ID)] = m; });
  var infoCorte = agora - FROTA_RES_AVISO_INFO_DIAS * 86400000;
  todas.forEach(function (r) {
    var sit = FrotaRes_up_(r.SITUACAO), ini = FrotaRes_iniMs_(r), fim = FrotaRes_fimMs_(r), uid = FrotaRes_s_(r.USUARIO_ID);
    if (ini === null || fim === null) return;
    var manut = FrotaRes_up_(r.TIPO) === 'MANUTENCAO', placa = FrotaRes_s_(r.PLACA);
    if (sit === 'RESERVADA' && !manut) {
      // atraso de quem está com o veículo
      var m = abertas[FrotaRes_s_(r.VEICULO_ID)];
      if (m && FrotaRes_s_(m.CONDUTOR_ID) !== FrotaRes_s_(r.CONDUTOR_ID)) {
        var prev = FrotaRes_previstaMs_(m);
        if (prev !== null && prev < agora && ini <= agora + FROTA_RES_ATRASO_JANELA_H * 3600000 && fim > agora) {
          var c = cnd[FrotaRes_s_(m.CONDUTOR_ID)] || {}, uidAtual = FrotaRes_s_(c.USUARIO_ID);
          add(Pend_item_('frota_reserva_atraso', { id: 'FROTA:RESATRASO:' + m.ID + ':' + r.ID, nome: placa + ' (reserva de ' + FrotaRes_s_(r.CONDUTOR_NOME) + ')', publico: 'GESTAO', paraUsuarios: [uidAtual, uid],
            responsavel: FrotaRes_s_(c.NOME), responsavelId: uidAtual, gravidade: 'CRITICO', dias: null, vencimento: FrotaRes_txt_(prev),
            titulo: 'Devolução atrasada do ' + placa + ': reserva de ' + FrotaRes_s_(r.CONDUTOR_NOME) + ' ' + FrotaRes_quando_(ini, agora),
            detalhe: 'O veículo está com ' + (FrotaRes_s_(c.NOME) || 'condutor não identificado') + ' desde ' + FrotaRes_txt_(FrotaRes_saidaMs_(m)) + '; a devolução prevista era ' + FrotaRes_txt_(prev) + '. A reserva ' + r.CODIGO + ' começa em ' + FrotaRes_txt_(ini) + '.',
            oQueFazer: uidAtual ? 'Devolva o veículo e registre a devolução em Frota > Situação e retiradas (botão verde "Devolver ' + placa + '"). Se não der a tempo, avise a gestão agora.' : '',
            oQueFazerOutro: 'Fale com ' + (FrotaRes_s_(c.NOME) || 'o condutor') + '. Se o veículo não voltar a tempo, troque o veículo da reserva ' + r.CODIGO + ' por um livre em Frota > Reservas (abrir a reserva > Trocar veículo).',
            tela: { tipo: 'modulo', mod: 'frota' }, telaOutro: tela, textoEstavel: 'O veículo \'' + placa + '\' está com devolução atrasada e tem a reserva ' + r.CODIGO + ' a seguir.' }));
        }
      }
      // conferência com problema (próximos 7 dias)
      if (ini > agora - cfg.toleranciaMin * 60000 && ini - agora <= FROTA_RES_PROBLEMA_JANELA_DIAS * 86400000) {
        var probs = FrotaRes_problemas_(r, { agora: agora, veiculos: veics, condutores: cnd, movs: movs, paradas: paradas, docs: docs, ultimas: ultimas, cfg: cfg, reservas: todas });
        if (probs.length) {
          add(Pend_item_('frota_reserva_problema', { id: 'FROTA:RESPROB:' + r.ID, nome: placa + ' (' + FrotaRes_quando_(ini, agora) + ')', publico: 'GESTAO', paraUsuarios: [uid], responsavel: FrotaRes_s_(r.CONDUTOR_NOME), responsavelId: uid,
            gravidade: ini - agora <= 36 * 3600000 ? 'CRITICO' : 'ATENCAO', dias: Math.max(0, Math.floor((FrotaRes_iniDia_(ini) - FrotaRes_iniDia_(agora)) / 86400000)), vencimento: FrotaRes_txt_(ini),
            titulo: 'Reserva ' + r.CODIGO + ' do ' + placa + ' com problema: ' + probs[0],
            detalhe: 'Reserva de ' + FrotaRes_s_(r.CONDUTOR_NOME) + ', ' + FrotaRes_periodo_(ini, fim) + '. Problema: ' + probs.join('; ') + '.',
            oQueFazer: 'Troque o veículo da reserva por um livre em Frota > Reservas > Minhas reservas > Trocar veículo, ou fale com a gestão.',
            oQueFazerOutro: 'Resolva o problema do veículo ou troque o veículo da reserva em Frota > Reservas (abrir a reserva > Trocar veículo); ' + FrotaRes_s_(r.CONDUTOR_NOME) + ' é avisado.',
            tela: tela, textoEstavel: 'A reserva ' + r.CODIGO + ' do veículo \'' + placa + '\' tem problema na conferência.' }));
        }
      }
      // próxima reserva (lembrete pessoal)
      if (uid && ini - agora <= 36 * 3600000 && agora <= ini + cfg.toleranciaMin * 60000) {
        add(Pend_item_('frota_reserva_proxima', { id: 'FROTA:RESPROX:' + r.ID, nome: placa + ' (' + FrotaRes_quando_(ini, agora) + ')', publico: 'PESSOA', paraUsuarios: [uid], responsavel: FrotaRes_s_(r.CONDUTOR_NOME), responsavelId: uid,
          gravidade: 'INFO', dias: null, vencimento: FrotaRes_txt_(ini),
          titulo: 'Sua reserva: veículo ' + placa + ' ' + FrotaRes_quando_(ini, agora) + (FrotaRes_s_(r.DESTINO) ? ' (' + FrotaRes_s_(r.DESTINO) + ')' : ''),
          detalhe: 'Reserva ' + r.CODIGO + ', ' + FrotaRes_periodo_(ini, fim) + '. Pode retirar a partir de ' + FrotaRes_txt_(ini - cfg.antecipacaoMin * 60000) + '; sem retirada até ' + FrotaRes_txt_(ini + cfg.toleranciaMin * 60000) + ' a reserva vira "não utilizada".',
          oQueFazer: 'No horário, retire o veículo em Frota > Situação e retiradas. Se não for usar, cancele em Frota > Reservas > Minhas reservas para liberar o veículo.', tela: { tipo: 'modulo', mod: 'frota' } }));
      }
      if (uid && FrotaRes_s_(r.LIBERADA_EM) && new Date(FrotaRes_s_(r.LIBERADA_EM)).getTime() >= infoCorte && fim > agora) {
        add(Pend_item_('frota_reserva_aviso', { id: 'FROTA:RESLIB:' + r.ID, nome: placa + ' (liberado)', publico: 'PESSOA', paraUsuarios: [uid], responsavel: FrotaRes_s_(r.CONDUTOR_NOME), responsavelId: uid,
          gravidade: 'ATENCAO', dias: null, vencimento: FrotaRes_txt_(ini),
          titulo: 'O veículo ' + placa + ' da sua reserva ' + r.CODIGO + ' foi liberado pela gestão para outra retirada',
          detalhe: 'Liberado por ' + FrotaRes_s_(r.LIBERADA_POR_NOME) + '. Justificativa: ' + FrotaRes_s_(r.LIBERADA_JUSTIFICATIVA) + '. A reserva continua valendo se o veículo voltar a tempo.',
          oQueFazer: 'Para garantir, troque o veículo da reserva por um livre em Frota > Reservas > Minhas reservas > Trocar veículo.', tela: tela }));
      }
    }
    if (uid && (sit === 'CANCELADA' || sit === 'NAO_UTILIZADA')) {
      var em = new Date(FrotaRes_s_(sit === 'CANCELADA' ? r.CANCELADA_EM : r.NAO_UTILIZADA_EM)).getTime();
      var pelaGestao = sit === 'CANCELADA' && FrotaRes_s_(r.CANCELADA_POR_ID) !== uid;
      if (isFinite(em) && em >= infoCorte && (sit === 'NAO_UTILIZADA' || pelaGestao)) {
        add(Pend_item_('frota_reserva_aviso', { id: 'FROTA:RESINFO:' + r.ID, nome: placa + ' (' + (sit === 'CANCELADA' ? 'cancelada' : 'não utilizada') + ')', publico: 'PESSOA', paraUsuarios: [uid], responsavel: FrotaRes_s_(r.CONDUTOR_NOME), responsavelId: uid,
          gravidade: 'INFO', dias: null, vencimento: FrotaRes_txt_(ini),
          titulo: sit === 'CANCELADA' ? 'Sua reserva ' + r.CODIGO + ' (' + placa + ') foi cancelada pela gestão' : 'Sua reserva ' + r.CODIGO + ' (' + placa + ') ficou sem uso e o veículo foi liberado',
          detalhe: sit === 'CANCELADA' ? 'Cancelada por ' + FrotaRes_s_(r.CANCELADA_POR_NOME) + '. Justificativa: ' + FrotaRes_s_(r.MOTIVO_CANCELAMENTO) + '.' : 'Sem retirada até ' + cfg.toleranciaMin + ' minutos depois do início (' + FrotaRes_txt_(ini) + ').',
          oQueFazer: 'Se ainda precisa de um veículo, faça uma reserva nova em Frota > Reservas > Reservar. Este aviso some sozinho em ' + FROTA_RES_AVISO_INFO_DIAS + ' dias.', tela: tela }));
      }
    }
  });
}

// ------------------------------------------------------------
// API (Frota_apiDispatch) E PONTE DO COMMAND
// ------------------------------------------------------------
function Frota_apiReservaPainel(sessionId, payload) { return FrotaRes_painel_(FrotaRes_sessao_(sessionId), payload || {}); }
function Frota_apiReservaLivres(sessionId, payload) { return FrotaRes_livresApi_(FrotaRes_sessao_(sessionId), payload || {}); }
function Frota_apiReservaCriar(sessionId, payload) { Frota_bootstrap_(); return FrotaRes_criar_(FrotaRes_sessao_(sessionId), payload || {}); }
function Frota_apiReservaCancelar(sessionId, payload) { Frota_bootstrap_(); return FrotaRes_cancelar_(FrotaRes_sessao_(sessionId), payload || {}); }
function Frota_apiReservaTrocarVeiculo(sessionId, payload) { Frota_bootstrap_(); return FrotaRes_trocarVeiculo_(FrotaRes_sessao_(sessionId), payload || {}); }
function Frota_apiReservaIndicadores(sessionId, payload) {
  var s = FrotaRes_sessao_(sessionId);
  if (!s.gestao) throw new Error('Os indicadores das reservas são da gestão (Administrador, Gestor ou Diretoria). As suas reservas estão em Minhas reservas.');
  return FrotaRes_indicadores_(payload || {});
}
function Frota_apiReservaRelatorio(sessionId, payload) {
  var s = FrotaRes_sessao_(sessionId);
  if (!s.gestao) throw new Error('O relatório de uso e reservas é gerado pela gestão (Administrador, Gestor ou Diretoria).');
  return FrotaRes_relatorio_(s, payload || {});
}
/** Regras configuráveis (gestão): folga, tolerância, antecipação, hora do lembrete, antecedência e duração máximas. */
function Frota_apiReservaConfig(sessionId, payload) {
  var s = FrotaRes_sessao_(sessionId);
  payload = payload || {};
  if (!payload.salvar) return { ok: true, cfg: FrotaRes_cfg_(), padrao: FROTA_RES_CFG_PADRAO, gestor: s.gestao };
  if (!s.gestao) throw new Error('As regras das reservas são alteradas só pela gestão (Administrador, Gestor ou Diretoria).');
  var c = payload.cfg || {}, antes = FrotaRes_cfg_();
  var novo = { folgaMin: Number(c.folgaMin), toleranciaMin: Number(c.toleranciaMin), antecipacaoMin: Number(c.antecipacaoMin), horaVespera: String(c.horaVespera || ''), antecedenciaMaxDias: Number(c.antecedenciaMaxDias), duracaoMaxDias: Number(c.duracaoMaxDias) };
  PropertiesService.getScriptProperties().setProperty(FROTA_RES_PROP_CFG, JSON.stringify(novo));
  var depois = FrotaRes_cfg_();
  var ignorados = Object.keys(novo).filter(function (k) { return String(novo[k]) !== String(depois[k]); });
  Frota_auditar_({ userId: s.userId, usuario: s.usuario, nome: s.nome, perfil: s.perfil }, { acao: 'RESERVAS_REGRAS', campo: 'FROTA_RESERVAS_CFG', antes: JSON.stringify(antes), depois: JSON.stringify(depois), detalhe: 'Regras das reservas alteradas.' });
  return { ok: true, cfg: depois, mensagem: 'Regras gravadas.' + (ignorados.length ? ' Fora da faixa aceita e mantidos como estavam: ' + ignorados.join(', ') + '.' : '') };
}

/**
 * COMMAND (ponte assinada): reservas em nome do usuário do SGO+ ligado à conta (dados.sgoUsuarioId).
 *  frota.reservas.painel   { de, dias }  -> agenda (gestão vê todas) + minhas reservas
 *  frota.reservas.livres   { dataInicio, horaInicio, dataFim, horaFim }
 *  frota.reservas.criar    { veiculoId, dataInicio, horaInicio, dataFim, horaFim, destino, motivo, passageiros }
 *  frota.reservas.cancelar { id, motivo }
 * As mesmas regras da tela do SGO+ (inclusive a trava contra duas reservas ao mesmo tempo).
 */
function FrotaRes_ponte_(acao, dados) {
  dados = dados || {};
  var u = SGO_DATA.getById(SGO_CFG.SHEETS.CAD_USUARIOS, FrotaRes_s_(dados.sgoUsuarioId));
  if (!u || FrotaRes_up_(u.STATUS || 'ATIVO') !== 'ATIVO' || FrotaRes_up_(u.PERFIL) === 'CLIENTE') {
    return { ok: false, erro: 'A sua conta do COMMAND não está ligada a um usuário ativo da equipe no SGO+. Peça ao administrador para ligar a conta em Usuários e papéis (Migrar do SGO+).' };
  }
  var sessao = { userId: FrotaRes_s_(u.ID), usuario: FrotaRes_s_(u.USUARIO), nome: FrotaRes_s_(u.NOME) || FrotaRes_s_(u.USUARIO), perfil: FrotaRes_up_(u.PERFIL), gestao: FrotaRes_ehGestaoPerfil_(u.PERFIL) };
  var p = dados.payload || {};
  try {
    try { Frota_bootstrap_(); } catch (e0) {}
    if (acao === 'frota.reservas.painel') {
      var r = FrotaRes_painel_(sessao, p);
      r.vinculos = { atividades: r.vinculos.atividades, clientes: [], tipos: { ATIVIDADE: FROTA_RES_VINCULOS.ATIVIDADE } };
      if (!sessao.gestao) r.veiculos = [];
      return r;
    }
    if (acao === 'frota.reservas.livres') return FrotaRes_livresApi_(sessao, p);
    if (acao === 'frota.reservas.criar') { var c = FrotaRes_criar_(sessao, Object.assign({}, p, { tipo: 'USO' })); if (c && c.ok === false && !c.erro) c.erro = c.message; return c; }
    if (acao === 'frota.reservas.cancelar') return FrotaRes_cancelar_(sessao, p);
    return { ok: false, erro: 'Ação de reservas desconhecida.' };
  } catch (e) { var m = String((e && e.message) || e); return { ok: false, erro: m, message: m }; }
}
