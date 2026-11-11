/****************************************************
 * BATE-PAPO -> WHATSAPP (20/10/2026)
 *
 * Mensagem DIRETA, ou MENÇÃO "@Nome" num grupo, para quem não está no
 * sistema vira um aviso no WhatsApp do número da empresa ("Você tem
 * mensagem de Fulano no bate-papo do SGO+", com o texto e o link).
 * Mensagem comum de grupo nunca vai para o WhatsApp.
 *
 * Quem decide QUAIS mensagens viram aviso é o núcleo da Comunicação
 * (Comunicacao.js, comWaPendentes_): direta ou menção, sem leitura há pelo
 * menos N minutos, pessoa sem presença no sistema nesse tempo, que não
 * desligou o aviso e ainda não foi avisada daquela mensagem. Aqui ficam as
 * regras do SGO+, que tem o celular, o vínculo e o expediente:
 *
 *  - rotina SGO_comWhatsappRodada a cada 5 min (SGO_comInstalarGatilho);
 *    com a ponte desligada (padrão) não faz nada;
 *  - só em dia útil e no horário de trabalho (SGO_Expediente.js, a mesma
 *    configuração de Atividades da equipe > Avisos e horários). Fora disso
 *    nada sai: as mensagens ficam sem aviso e saem juntas, num aviso só,
 *    na primeira rodada do expediente seguinte;
 *  - no máximo N avisos por pessoa por hora e M por dia (COM_CONFIG,
 *    padrão 1 por hora e 4 por dia); o que passar espera e entra agrupado
 *    no aviso seguinte. Várias mensagens da mesma pessoa viram UM aviso;
 *  - vínculo: a mesma lista do WhatsApp de Minhas atividades (padrão só
 *    CLT). PJ e vínculo não informado recebem por e-mail, no mesmo horário;
 *  - provedor do WhatsApp: o mesmo do notificador (WHATSAPP_PROVEDOR em
 *    Chaves e senhas; Notificar_provedorWhatsapp_). Z-API (20/10/2026, em uso):
 *    texto livre ("Mensagem de Fulano no bate-papo do SGO+: ...", com o link),
 *    sem modelo, com intervalo de COMWA_INTERVALO_S segundos entre um envio e
 *    o seguinte e no máximo COMWA_MAX_ENVIOS_RODADA envios por rodada (para não
 *    arriscar bloqueio do número). Meta: modelo sgo_bate_papo_mensagem
 *    (SGO_Notificar.js); enquanto a Meta não aprovar, o aviso vai só por e-mail
 *    (nenhum modelo aprovado serve para isso sem confundir quem recebe);
 *  - cada aviso (enviado, com erro ou pulado) fica em COM_WHATSAPP com o id
 *    da mensagem da Meta: é por ele que a resposta da pessoa ("responder a")
 *    volta para a conversa certa (webhook do COMMAND, ComunicacaoWhatsapp.js)
 *    e é o que impede avisar duas vezes a mesma mensagem. E-mail e WhatsApp
 *    também ficam em NTF_ENVIOS, como todo aviso do SGO+.
 * O celular nunca é gravado na Comunicação nem mostrado a colegas.
 ****************************************************/

var COMWA_MODELO = 'sgo_bate_papo_mensagem';
var COMWA_MAX_PESSOAS_RODADA = 25;
var COMWA_MAX_ENVIOS_RODADA = 8;      // WhatsApp por rodada (5 min); o resto espera a próxima, agrupado
var COMWA_INTERVALO_S = 8;            // pausa entre dois envios pelo WhatsApp (Z-API: número comum, sem fila da Meta)
var COMWA_MAX_ITENS_EMAIL = 8;
var COMWA_FUSO = 'America/Sao_Paulo';

/** Gatilho a cada 5 min (nome sem "_" no fim para o agendador achar a função). */
function SGO_comWhatsappRodada(e) {
  if (typeof SGO_execucaoInterna_ === 'function' && !SGO_execucaoInterna_()) return { ok: false, message: 'Rotina interna: roda só pelo gatilho.' };
  return SGO_comWhatsappExec_(Date.now());
}

/** O modelo sgo_bate_papo_mensagem já foi aprovado pela Meta? Consulta guardada por 6 h; falha = não aprovado. */
function SGO_comWhatsappModeloAprovado_() {
  var forcado = '';
  try { forcado = String(PropertiesService.getScriptProperties().getProperty('COM_WA_MODELO_APROVADO') || '').trim().toUpperCase(); } catch (e) {}
  if (forcado === 'SIM') return true;
  if (forcado === 'NAO') return false;
  var cache = null;
  try { cache = CacheService.getScriptCache(); var g = cache.get('COMWA_MODELO_OK'); if (g) return g === 'SIM'; } catch (e) { cache = null; }
  var ok = false;
  try {
    if (typeof Chaves_metaListarModelos_ === 'function' && typeof Notificar_credenciaisMeta_ === 'function') {
      var cred = Notificar_credenciaisMeta_();
      if (cred.token && cred.wabaId) {
        var l = Chaves_metaListarModelos_(cred);
        ok = !!(l.ok && (l.lista || []).some(function (m) {
          return String(m.name || '') === COMWA_MODELO && String(m.language || '') === NTF_META_IDIOMA && String(m.status || '').toUpperCase() === 'APPROVED';
        }));
      }
    }
  } catch (e) { ok = false; }
  try { if (cache) cache.put('COMWA_MODELO_OK', ok ? 'SIM' : 'NAO', 21600); } catch (e) {}
  return ok;
}

function SGO_comWhatsappCurto_(s, max) {
  var t = String(s === null || s === undefined ? '' : s).replace(/\s+/g, ' ').trim();
  return t.length > max ? t.slice(0, max - 3).replace(/\s+$/, '') + '...' : t;
}

function SGO_comWhatsappOnde_(c) {
  if (!c || c.tipo === 'DIRETA' || c.tipo === 'RECEBIDAS') return '';
  return c.tipo === 'GERAL' ? 'na conversa geral' : 'no grupo ' + c.titulo;
}

/** Texto livre do aviso pela Z-API (sem modelo): curto, sem emoji, com o link e o convite a responder. */
function SGO_comWhatsappTextoLivre_(t, link) {
  return 'SGO+ Metrolabs - bate-papo\n\nMensagem de ' + t.remetentes + ':\n' + t.resumo +
    '\n\nPara responder, responda esta mensagem' + (link ? ' ou abra o SGO+: ' + link : '.');
}

/** Textos do aviso: { titulo, texto (e-mail), remetentes e resumo (variáveis do modelo da Meta) }. */
function SGO_comWhatsappTextos_(x) {
  var itens = x.itens, nomes = [];
  itens.forEach(function (i) { var n = String(i.m.de_nome || 'um colega'); if (nomes.indexOf(n) < 0) nomes.push(n); });
  var remet = nomes.length <= 2 ? comListaNomes_(nomes) : nomes.slice(0, 2).join(', ') + ' e mais ' + (nomes.length - 2);
  var onde = itens.every(function (i) { return i.c.conversa_id === itens[0].c.conversa_id; }) ? SGO_comWhatsappOnde_(itens[0].c) : '';
  if (onde) remet += ' (' + onde + ')';
  var ult = itens[itens.length - 1];
  var resumo = itens.length === 1 ? SGO_comWhatsappCurto_(ult.m.texto, 500)
    : itens.length + ' mensagens. A última: ' + SGO_comWhatsappCurto_(ult.m.texto, 420);
  var hora = function (iso) { try { return Utilities.formatDate(new Date(iso), COMWA_FUSO, "dd/MM 'às' HH:mm"); } catch (e) { return ''; } };
  var linhas = itens.slice(-COMWA_MAX_ITENS_EMAIL).map(function (i) {
    var o = SGO_comWhatsappOnde_(i.c);
    return 'De ' + (i.m.de_nome || 'um colega') + (o ? ', ' + o : ', conversa direta') + ', ' + hora(i.m.criado_em) + ':\n' + SGO_comWhatsappCurto_(i.m.texto, 800);
  });
  if (itens.length > COMWA_MAX_ITENS_EMAIL) linhas.unshift('(e mais ' + (itens.length - COMWA_MAX_ITENS_EMAIL) + ' mensagem(ns) mais antigas)');
  return {
    titulo: itens.length === 1 ? 'Mensagem de ' + (ult.m.de_nome || 'um colega') + ' no bate-papo' : itens.length + ' mensagens no bate-papo',
    texto: 'Você recebeu mensagem no bate-papo do SGO+ enquanto estava fora do sistema.\n\n' + linhas.join('\n\n') +
      '\n\nPara responder, abra o SGO+ (ou o COMMAND) e toque no botão de conversas, no canto da tela.',
    remetentes: remet,
    resumo: resumo
  };
}

/**
 * Uma rodada da ponte. agoraMs = hora "agora" (os testes passam uma hora fixa).
 * Devolve { enviados, email, pulados, erros, esperando, motivo }. Nunca lança.
 */
function SGO_comWhatsappExec_(agoraMs) {
  var r = { enviados: 0, email: 0, pulados: 0, erros: 0, esperando: 0, motivo: '' };
  var trava = null;
  try { trava = LockService.getScriptLock(); if (!trava.tryLock(5000)) { r.motivo = 'outra rodada em andamento'; return r; } } catch (e) { trava = null; }
  try {
    COM_MEMO_ = {};
    var ss = comBanco_(false);
    if (!ss) { r.motivo = 'Comunicação ainda não ativada'; return r; }
    var cfg = comWaCfg_(ss);
    if (!cfg.ligado) { r.motivo = 'ponte com o WhatsApp desligada (balão > Preferências, administração)'; return r; }
    // pessoas e áreas em dia, no máximo a cada 15 min (quem mudou de área entra e sai sozinho dos grupos de área)
    try {
      var cache = CacheService.getScriptCache();
      if (!cache.get('COMWA_SYNC')) { cache.put('COMWA_SYNC', '1', 900); comSincronizarNucleo_(ss); delete COM_MEMO_.pessoas; }
    } catch (e) {}
    var ex = SGO_dentroDoExpediente_(new Date(agoraMs));
    if (!ex.dentro) { r.motivo = 'fora do expediente (' + ex.motivo + '): as mensagens ficam guardadas para o início do próximo expediente'; return r; }
    var pend = comWaPendentes_(ss, agoraMs, cfg), ids = Object.keys(pend);
    if (!ids.length) return r;
    var atv = typeof Atividades_avisosCfg_ === 'function' ? Atividades_avisosCfg_() : { vinculosWhatsapp: ['CLT'] };
    var liberados = (atv.vinculosWhatsapp || ['CLT']).map(function (v) { return String(v).toUpperCase(); });
    var modeloOk = null, envios = 0;
    var prov = typeof Notificar_provedorWhatsapp_ === 'function' ? Notificar_provedorWhatsapp_() : { provedor: '' };
    var link = typeof Notificar_linkSgo_ === 'function' ? Notificar_linkSgo_() : '';
    var contatos = Notificar_contatos_(ids.map(function (pid) { return String(pend[pid].pessoa.sgo_id || ''); }).filter(String));
    ids.slice(0, COMWA_MAX_PESSOAS_RODADA).forEach(function (pid) {
      var x = pend[pid], p = x.pessoa, ult = x.itens[x.itens.length - 1];
      var mencao = x.itens.some(function (i) { return i.c.tipo !== 'DIRETA' && i.c.tipo !== 'RECEBIDAS'; });
      var reg = function (sit, canal, motivo, wamid, texto) {
        comWaRegistrar_(ss, { direcao: 'SAIDA', pessoa_id: pid, conversa_id: ult.c.conversa_id, msg_ids: x.itens.map(function (i) { return i.m.msg_id; }).join(','),
          canal: canal, wamid: wamid || '', regra: mencao ? 'MENCAO' : 'DIRETA', situacao: sit, motivo: motivo, texto: texto || '', em: new Date(agoraMs).toISOString() });
      };
      try {
        if (!p.sgo_id) { reg('PULADO', '', 'pessoa sem cadastro no SGO+ (o celular e o e-mail ficam em SGO+ > Administração > Usuários); a mensagem segue no balão'); r.pulados++; return; }
        var c = contatos[String(p.sgo_id)];
        if (!c || !c.ativo) { reg('PULADO', '', 'usuário inativo ou fora do cadastro do SGO+; a mensagem segue no balão'); r.pulados++; return; }
        var conta = comWaContagem_(ss, pid, agoraMs);
        if (conta.hora >= cfg.limite_hora || conta.dia >= cfg.limite_dia) { r.esperando++; return; }   // espera e entra agrupado no próximo aviso
        var v = String(c.vinculo || '').toUpperCase(), porEmail = '';
        if (liberados.indexOf(v || 'VAZIO') < 0) porEmail = v === 'PJ' ? 'PJ: o aviso do bate-papo vai por e-mail, não pelo WhatsApp' : v === 'DIRETORIA' ? 'Diretoria: o aviso do bate-papo vai por e-mail, não pelo WhatsApp (a gestão libera a Diretoria em Avisos e horários)' : v ? 'vínculo ' + v + ' fora da lista do WhatsApp: o aviso vai por e-mail' : 'vínculo de trabalho não informado (Administração > Usuários > Vínculo): o aviso vai por e-mail';
        else if (!c.telefone) porEmail = 'sem celular no cadastro (Administração > Usuários > Celular): o aviso vai por e-mail';
        else if (!prov.provedor) porEmail = 'WhatsApp da empresa não configurado (' + String(prov.motivo || 'Chaves e senhas') + '): o aviso vai por e-mail';
        else if (prov.provedor === 'meta') {
          if (modeloOk === null) modeloOk = SGO_comWhatsappModeloAprovado_();
          if (!modeloOk) porEmail = 'o modelo ' + COMWA_MODELO + ' ainda não foi aprovado pela Meta: o aviso vai por e-mail';
        }
        if (!porEmail && envios >= COMWA_MAX_ENVIOS_RODADA) { r.esperando++; return; }   // limite de envios por rodada: espera a próxima
        if (!porEmail && envios > 0 && COMWA_INTERVALO_S > 0) { try { Utilities.sleep(COMWA_INTERVALO_S * 1000); } catch (e) {} }
        var canal = porEmail ? 'email' : 'whatsapp';
        if (canal === 'email' && (!c.email || c.email.indexOf('@') < 0)) { reg('PULADO', '', porEmail.replace(/: o aviso vai por e-mail$/, '') + ' e sem e-mail no cadastro; a mensagem segue no balão'); r.pulados++; return; }
        var t = SGO_comWhatsappTextos_(x);
        var res = SGO_notificar_({ usuarios: [String(p.sgo_id)], canais: [canal], titulo: t.titulo, texto: t.texto,
          modelo: canal === 'whatsapp' ? { nome: COMWA_MODELO, parametros: ['@NOME', t.remetentes, t.resumo, '@LINK'] } : null,
          textoWhatsapp: canal === 'whatsapp' ? SGO_comWhatsappTextoLivre_(t, link) : '',
          origem: 'BATE_PAPO', refId: ult.m.msg_id, categoria: 'BATE_PAPO' }) || {};
        if (canal === 'whatsapp') envios++;
        var sit = res.ok ? 'OK' : res.erro ? 'ERRO' : 'PULADO';
        var wamid = res.ids && res.ids[String(p.sgo_id)] ? String(res.ids[String(p.sgo_id)]) : '';
        reg(sit, canal, sit === 'OK' ? (canal === 'whatsapp' ? 'aceito pelo WhatsApp (' + (prov.provedor === 'zapi' ? 'Z-API' : 'Meta') + ')' : 'e-mail enviado (' + porEmail + ')') : (res.motivo || 'não enviado'), wamid, t.resumo);
        if (sit === 'OK') { if (canal === 'whatsapp') r.enviados++; else r.email++; } else if (sit === 'ERRO') r.erros++; else r.pulados++;
      } catch (e) {
        try { reg('ERRO', '', String((e && e.message) || e).slice(0, 300)); } catch (x2) {}
        r.erros++;
      }
    });
  } catch (e) {
    r.motivo = 'falha na rodada: ' + String((e && e.message) || e).slice(0, 200);
    try { console.error('SGO_comWhatsappExec_: ' + r.motivo); } catch (x) {}
  } finally { if (trava) try { trava.releaseLock(); } catch (e) {} }
  return r;
}
