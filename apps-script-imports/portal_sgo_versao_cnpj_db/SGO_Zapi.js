/****************************************************
 * WHATSAPP PELA Z-API (2026-10-20) — envio único, proteção do número e botões da tela Chaves e senhas.
 *
 * Com WHATSAPP_PROVEDOR = zapi (Chaves e senhas), todo WhatsApp do SGO+ sai por SGO_zapiEnviarTexto_
 * (SGO_notificar_ usa esta função; outros módulos podem usar direto). A Z-API usa o WhatsApp de um aparelho:
 * envio em massa, em rajada ou repetido pode fazer o WhatsApp bloquear o número da empresa. Por isso:
 *  - só celular brasileiro válido (55 + DDD + 9 + 8 dígitos); fixo, número curto ou vazio = PULADO, nunca enviado;
 *  - fila única com o COMMAND (o mesmo número): no servidor próprio, a global SGO_WHATSAPP (sgo_servidor,
 *    servicos/whatsappCota.ts) reserva o próximo horário livre — o último envio de qualquer um dos dois sistemas
 *    mais um intervalo sorteado entre ZAPI_INTERVALO_MIN_S e ZAPI_INTERVALO_MAX_S (padrão 3 a 8 s) — e barra o aviso
 *    acima de ZAPI_LIMITE_HORA (padrão 40), ZAPI_LIMITE_DIA (padrão 200) e ZAPI_LIMITE_PESSOA_HORA (padrão 6),
 *    somados dos dois sistemas. Sem o servidor (Google, testes): a mesma regra só com os envios deste sistema
 *    (propriedade ZAPI_FILA_LOCAL, contagem por hora cheia e por dia).
 *  - tipo RESPOSTA e TESTE respeitam o intervalo e contam, mas não são barrados pelos limites.
 *  - as regras sutis de cada módulo continuam valendo antes daqui (dia útil, horário de trabalho, um resumo por dia,
 *    vínculo CLT, mesma mensagem não repete em 10 minutos — SGO_Notificar.js).
 *
 * Sem modelo da Meta: cada mensagem vira um TEXTO PRONTO (Notificar_textoZapi_): o texto próprio do módulo
 * (textoWhatsapp); senão o texto do modelo pedido (NTF_MODELOS_META) com as variáveis preenchidas; senão o aviso
 * geral (saudação, assunto, resumo, link). Curto, sem emoji, assinado "Metrolabs — SGO+".
 *
 * Tela Chaves e senhas (grupo Z-API, só o responsável pelo sistema):
 *   Chaves_apiZapiConferir     — situação da instância na Z-API (conectada ou não, celular, número) e da fila.
 *   Chaves_apiZapiReceber      — grava na Z-API o webhook "Ao receber" (update-webhook-received) e o de status
 *                                (update-webhook-message-status) apontando para o COMMAND
 *                                (https://command.metrolabs.com.br/webhook/whatsapp?wh=<segredo>). O segredo é do
 *                                COMMAND, lido e (se faltar) gerado no servidor; nunca aparece na tela, no log ou aqui.
 *   Chaves_apiZapiTesteParaMim — mensagem de teste para o celular do cadastro de quem está logado.
 * Credenciais: ZAPI_INSTANCIA, ZAPI_TOKEN, ZAPI_CLIENT_TOKEN (nunca voltam para a tela, log ou erro).
 ****************************************************/

var ZAPI_BASE = 'https://api.z-api.io/instances/';
var ZAPI_PADRAO = { intervaloMinS: 3, intervaloMaxS: 8, limiteHora: 40, limiteDia: 200, limitePessoaHora: 6, esperaMaxS: 90 };
var ZAPI_FAIXA = { intervaloMinS: [2, 60], intervaloMaxS: [2, 120], limiteHora: [1, 500], limiteDia: [1, 3000], limitePessoaHora: [1, 60] };
var ZAPI_PROPS = { ZAPI_INTERVALO_MIN_S: 'intervaloMinS', ZAPI_INTERVALO_MAX_S: 'intervaloMaxS', ZAPI_LIMITE_HORA: 'limiteHora', ZAPI_LIMITE_DIA: 'limiteDia', ZAPI_LIMITE_PESSOA_HORA: 'limitePessoaHora' };
var ZAPI_ASSINATURA = 'Metrolabs — SGO+';

/** Limites e intervalo (propriedades de Chaves e senhas; fora da faixa = padrão). */
function SGO_zapiCfg_() {
  var c = JSON.parse(JSON.stringify(ZAPI_PADRAO));
  var p = PropertiesService.getScriptProperties();
  Object.keys(ZAPI_PROPS).forEach(function (k) {
    var campo = ZAPI_PROPS[k], bruto = String(p.getProperty(k) || '').trim(), v = Number(bruto);
    if (bruto !== '' && isFinite(v) && v >= ZAPI_FAIXA[campo][0] && v <= ZAPI_FAIXA[campo][1]) c[campo] = Math.round(v);
  });
  if (c.intervaloMaxS < c.intervaloMinS) c.intervaloMaxS = c.intervaloMinS;
  return c;
}

/** Celular brasileiro para o WhatsApp: "5562999990001" (55 + DDD + celular). Fixo (começa por 2 a 5) ou inválido = ''. */
function SGO_zapiCelular_(v) {
  var d = typeof Notificar_normalizarTelefone_ === 'function' ? Notificar_normalizarTelefone_(v) : String(v || '').replace(/\D/g, '');
  // 9 + 8 dígitos; ou o formato antigo de 8 dígitos de celular (começa por 6 a 9), que o WhatsApp ainda usa em parte dos números
  return /^55[1-9][1-9](9\d{8}|[6-9]\d{7})$/.test(d) ? d : '';
}

function SGO_zapiCredOk_(cred) { return !!(cred && cred.instancia && cred.token && cred.clientToken); }

/**
 * Reserva o horário do próximo envio. { ok, esperarMs } | { ok:false, motivo }.
 * tipo: 'AVISO' (padrão, barrado pelos limites) | 'RESPOSTA' | 'TESTE'.
 */
function SGO_zapiReservar_(fone, tipo) {
  if (typeof SGO_WHATSAPP !== 'undefined' && SGO_WHATSAPP && typeof SGO_WHATSAPP.reservar === 'function') {
    return SGO_WHATSAPP.reservar({ destino: fone, tipo: tipo || 'AVISO' });
  }
  return SGO_zapiReservarLocal_(fone, tipo, Date.now());
}

/** Fila deste sistema só (Google e testes): hora cheia e dia no fuso da empresa, último horário reservado. */
function SGO_zapiReservarLocal_(fone, tipo, agora) {
  var cfg = SGO_zapiCfg_(), lock = null;
  try { lock = LockService.getScriptLock(); lock.waitLock(20000); } catch (e) { lock = null; }
  try {
    var p = PropertiesService.getScriptProperties(), f = null;
    try { f = JSON.parse(p.getProperty('ZAPI_FILA_LOCAL') || 'null'); } catch (e) { f = null; }
    f = f || {};
    var fuso = typeof NTF_FUSO !== 'undefined' ? NTF_FUSO : 'America/Sao_Paulo';
    var h = Utilities.formatDate(new Date(agora), fuso, 'yyyyMMddHH'), d = h.slice(0, 8);
    if (f.h !== h) { f.h = h; f.nh = 0; }
    if (f.d !== d) { f.d = d; f.nd = 0; }
    if (String(tipo || 'AVISO').toUpperCase() === 'AVISO') {
      if (f.nd >= cfg.limiteDia) return { ok: false, motivo: 'limite de ' + cfg.limiteDia + ' mensagens por dia pelo WhatsApp da empresa atingido; proteção do número contra bloqueio' };
      if (f.nh >= cfg.limiteHora) return { ok: false, motivo: 'limite de ' + cfg.limiteHora + ' mensagens por hora pelo WhatsApp da empresa atingido; proteção do número contra bloqueio' };
    }
    var intervalo = (cfg.intervaloMinS + Math.floor(Math.random() * (cfg.intervaloMaxS - cfg.intervaloMinS + 1))) * 1000;
    // fila local: a espera nunca passa do máximo (o último horário reservado é contado no máximo até lá)
    var vez = Math.min(Math.max(agora, f.u ? Number(f.u) + intervalo : agora), agora + cfg.esperaMaxS * 1000);
    f.u = vez; f.nh++; f.nd++;
    p.setProperty('ZAPI_FILA_LOCAL', JSON.stringify(f));
    return { ok: true, esperarMs: vez - agora };
  } finally { if (lock) try { lock.releaseLock(); } catch (e) {} }
}

/**
 * ENVIO ÚNICO pela Z-API (para qualquer módulo do SGO+). Nunca lança erro.
 * op = { tipo: 'AVISO'|'RESPOSTA'|'TESTE', cred (opcional) }.
 * Devolve { ok:true, id } | { ok:false, pulado:true, motivo } (não tentou: sem celular, sem chaves, limite) | { ok:false, motivo } (a Z-API recusou).
 */
function SGO_zapiEnviarTexto_(telefone, texto, op) {
  op = op || {};
  var cred = op.cred || Notificar_credenciaisZapi_();
  var segredos = [cred.instancia, cred.token, cred.clientToken];
  try {
    var fone = SGO_zapiCelular_(telefone);
    if (!fone) return { ok: false, pulado: true, motivo: 'Sem celular válido para o WhatsApp (DDD + 9 + 8 dígitos) no cadastro; telefone fixo não recebe pela Z-API.' };
    if (!SGO_zapiCredOk_(cred)) return { ok: false, pulado: true, motivo: 'WhatsApp pela Z-API não configurado: grave ZAPI_INSTANCIA, ZAPI_TOKEN e ZAPI_CLIENT_TOKEN em Chaves e senhas.' };
    var msg = String(texto || '').replace(/\r\n?/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
    if (!msg) return { ok: false, pulado: true, motivo: 'Mensagem vazia: nada foi enviado.' };
    var res = SGO_zapiReservar_(fone, op.tipo || 'AVISO') || {};
    if (!res.ok) return { ok: false, pulado: true, motivo: String(res.motivo || 'fila do WhatsApp indisponível') + '; o aviso continua no SGO+.' };
    if (res.esperarMs > 0) Utilities.sleep(Math.min(Number(res.esperarMs) || 0, ZAPI_PADRAO.esperaMaxS * 1000));
    var r = Notificar_enviarWhatsapp_(cred, fone, msg.slice(0, 4000));
    if (r && r.ok) return { ok: true, id: String(r.id || '') };
    return { ok: false, motivo: Notificar_limparSegredos_(SGO_zapiExplicar_((r && r.motivo) || 'a Z-API não aceitou o envio'), segredos) };
  } catch (e) {
    return { ok: false, motivo: Notificar_limparSegredos_('Sem comunicação com a Z-API: ' + String((e && e.message) || e), segredos) };
  }
}

/** Mensagens da Z-API que pedem uma ação: diz o que fazer. */
function SGO_zapiExplicar_(msg) {
  var s = String(msg || '');
  if (/client-token is not configured/i.test(s)) return 'a Z-API exige o token de segurança da conta: no painel da Z-API, Segurança > Token de segurança da conta > ative e copie; grave em Chaves e senhas (ZAPI_CLIENT_TOKEN). Detalhe: ' + s;
  if (/client-token/i.test(s)) return 'token de segurança da conta (Client-Token) recusado pela Z-API: confira o valor gravado em Chaves e senhas. Detalhe: ' + s;
  if (/not connected|disconnected|desconectad/i.test(s)) return 'o WhatsApp da instância está desconectado: no painel da Z-API, leia o QR Code com o celular da empresa. Detalhe: ' + s;
  return s;
}

/* ---------- texto pronto (sem modelo) ---------- */

/**
 * Texto da Z-API para um destinatário. b = { textoWhatsapp, modelo (só o pedido por quem chamou), params(c), titulo, texto, link }.
 * 1) texto próprio do módulo; 2) texto do modelo pedido com as variáveis preenchidas; 3) aviso geral.
 */
function Notificar_textoZapi_(b, c) {
  var link = String(b.link || '');
  if (b.textoWhatsapp) {
    var t = String(b.textoWhatsapp);
    if (link && t.indexOf(link) < 0) t += '\n\nAbra o SGO+: ' + link;
    return t;
  }
  var def = b.modelo && b.modelo.nome !== 'sgo_aviso_geral' && Object.prototype.hasOwnProperty.call(NTF_MODELOS_META, b.modelo.nome) ? NTF_MODELOS_META[b.modelo.nome] : null;
  var ps = def && typeof b.params === 'function' ? b.params(c) : null;
  if (def && ps && ps.length === def.limites.length) {
    return def.texto.replace(/\{\{(\d+)\}\}/g, function (m, n) { var i = Number(n) - 1; return Notificar_paramMeta_(ps[i], def.limites[i]); });
  }
  var nome = c && !c.externo ? Notificar_primeiroNome_(c.nome) : '';
  var resumo = String(b.texto || '').replace(/\r\n?/g, '\n').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
  if (resumo.length > 700) resumo = resumo.slice(0, 697).replace(/\s+$/, '') + '...';
  return (nome ? 'Olá, ' + nome + '.\n\n' : '') + String(b.titulo || 'Aviso do SGO+') + (resumo ? '\n\n' + resumo : '') +
    (link ? '\n\nPara ver os detalhes, acesse o SGO+: ' + link : '') + '\n\n' + ZAPI_ASSINATURA;
}

/** Com a Z-API em uso não há modelo a aprovar: os módulos que esperam aprovação da Meta podem mandar o texto completo. */
function Notificar_whatsappSemModelo_() {
  try { return Notificar_provedorWhatsapp_().provedor === 'zapi'; } catch (e) { return false; }
}

/* ---------- tela Chaves e senhas ---------- */

/** Chamada à Z-API com as chaves gravadas. { cod, corpo, erro } — nunca expõe instância nem tokens. */
function SGO_zapiChamar_(metodo, caminho, corpo) {
  var cred = Notificar_credenciaisZapi_(), segredos = [cred.instancia, cred.token, cred.clientToken];
  if (!SGO_zapiCredOk_(cred)) return { cod: 0, corpo: {}, erro: 'faltam chaves da Z-API: grave a identificação da instância, o token da instância e o token de segurança da conta (acima) e clique de novo' };
  var opc = { method: metodo, muteHttpExceptions: true, headers: { 'Client-Token': cred.clientToken } };
  if (corpo !== undefined) { opc.contentType = 'application/json'; opc.payload = JSON.stringify(corpo); }
  var r;
  try { r = UrlFetchApp.fetch(ZAPI_BASE + encodeURIComponent(cred.instancia) + '/token/' + encodeURIComponent(cred.token) + '/' + caminho, opc); }
  catch (e) { return { cod: 0, corpo: {}, erro: Notificar_limparSegredos_('sem comunicação com a Z-API (' + String((e && e.message) || e) + ')', segredos).replace(/\/token\/[^\/\s]+/g, '/token/***') }; }
  var c = {};
  try { c = JSON.parse(r.getContentText() || '{}') || {}; } catch (e) { c = {}; }
  var erro = '';
  if (r.getResponseCode() < 200 || r.getResponseCode() >= 300) {
    erro = Notificar_limparSegredos_(SGO_zapiExplicar_('Z-API respondeu ' + r.getResponseCode() + ': ' + String(c.error || c.message || r.getContentText() || '').slice(0, 200)), segredos);
  }
  return { cod: r.getResponseCode(), corpo: c, erro: erro };
}

/** "5562982417106" -> "(62) 98241-7106". */
function SGO_zapiFoneBr_(f) {
  var d = String(f || '').replace(/\D/g, '').replace(/^55/, '');
  return d.length === 11 ? '(' + d.slice(0, 2) + ') ' + d.slice(2, 7) + '-' + d.slice(7) : d.length === 10 ? '(' + d.slice(0, 2) + ') ' + d.slice(2, 6) + '-' + d.slice(6) : d;
}

function SGO_zapiFila_() {
  var cfg = SGO_zapiCfg_();
  var txtCfg = 'intervalo de ' + cfg.intervaloMinS + ' a ' + cfg.intervaloMaxS + ' s entre mensagens; até ' + cfg.limiteHora + ' por hora, ' + cfg.limiteDia + ' por dia e ' + cfg.limitePessoaHora + ' por hora para o mesmo celular';
  try {
    if (typeof SGO_WHATSAPP !== 'undefined' && SGO_WHATSAPP && typeof SGO_WHATSAPP.situacao === 'function') {
      var s = SGO_WHATSAPP.situacao() || {};
      return { texto: 'Proteção do número: ' + txtCfg + ' (SGO+ e COMMAND juntos). Na última hora: ' + (Number(s.hora) || 0) + ' mensagem(ns); nas últimas 24 h: ' + (Number(s.dia) || 0) + '.', hora: Number(s.hora) || 0, dia: Number(s.dia) || 0 };
    }
  } catch (e) {}
  return { texto: 'Proteção do número: ' + txtCfg + '.', hora: null, dia: null };
}

/** Botão "Conferir conexão": a instância está ligada ao WhatsApp do celular? Qual número? */
function Chaves_apiZapiConferir(sessionId, payload) {
  return Chaves_resposta_(function () {
    var eu = Chaves_exigirDono_(sessionId);
    var st = SGO_zapiChamar_('get', 'status');
    var fila = SGO_zapiFila_(), r;
    if (!st.cod || st.erro) {
      r = { funcionou: false, conectado: false, texto: 'Não foi possível conferir: ' + (st.erro || 'sem resposta da Z-API') + '.' };
    } else {
      var conectado = st.corpo.connected === true, numero = '';
      if (conectado) {
        var dv = SGO_zapiChamar_('get', 'device');
        numero = dv.cod >= 200 && dv.cod < 300 && dv.corpo ? SGO_zapiFoneBr_(dv.corpo.phone || '') : '';
      }
      r = conectado
        ? { funcionou: true, conectado: true, numero: numero, texto: 'Conectada: a instância da Z-API está ligada ao WhatsApp' + (numero ? ' do número ' + numero : '') + '.' + (st.corpo.smartphoneConnected === false ? ' Atenção: o celular está sem internet; deixe-o ligado e conectado.' : '') }
        : { funcionou: false, conectado: false, texto: 'Desconectada: a instância existe, mas o WhatsApp não está conectado. No painel da Z-API, abra a instância e leia o QR Code com o WhatsApp do celular da empresa; depois clique em Conferir de novo.' + (st.corpo.error ? ' (' + Notificar_limparSegredos_(String(st.corpo.error), []) + ')' : '') };
    }
    var prov = Notificar_provedorWhatsapp_().provedor;
    r.provedor = prov;
    r.fila = fila.texto;
    if (prov !== 'zapi') r.texto += ' O provedor em uso ainda não é a Z-API: escolha "Z-API" em "Provedor do WhatsApp em uso" (grupo WhatsApp oficial) para os avisos saírem por ela.';
    try { PropertiesService.getScriptProperties().setProperty('ZAPI_ULTIMA_CONFERENCIA', JSON.stringify({ em: Chaves_agora_(), emBr: Chaves_dataBr_(Chaves_agora_()), conectado: !!r.conectado, numero: r.numero || '' })); } catch (e) {}
    try { SGO_DATA.log('ZAPI_CONFERIDA', eu.usuario, 'Conexão da Z-API conferida: ' + (r.conectado ? 'conectada' : 'não conectada') + '.', 'CHAVES'); } catch (e) {}
    return r;
  });
}

/** Botão "Configurar recebimento": a Z-API passa a entregar as mensagens recebidas ao COMMAND. */
function Chaves_apiZapiReceber(sessionId, payload) {
  return Chaves_resposta_(function () {
    var eu = Chaves_exigirDono_(sessionId);
    if (typeof SGO_WHATSAPP === 'undefined' || !SGO_WHATSAPP || typeof SGO_WHATSAPP.webhookCommand !== 'function') {
      return { funcionou: false, texto: 'Não foi possível configurar daqui: este botão funciona no SGO+ do servidor próprio (sgo.metrolabs.com.br). Use o COMMAND, Integrações > Z-API > Cadastrar webhook.' };
    }
    var w = SGO_WHATSAPP.webhookCommand() || {};
    var url = String(w.url || '');
    if (!/^https:\/\/[^\s?]+\/webhook\/whatsapp\?wh=[^\s&]{16,}$/.test(url)) return { funcionou: false, texto: 'Não foi possível montar o endereço de recebimento do COMMAND. Avise o suporte do sistema.' };
    var rec = SGO_zapiChamar_('put', 'update-webhook-received', { value: url });
    var sta = SGO_zapiChamar_('put', 'update-webhook-message-status', { value: url });
    var ok = function (x) { return x.cod >= 200 && x.cod < 300 && !x.erro && x.corpo.value !== false; };
    var limpa = function (s) { return String(s || '').split(url).join('(endereço do COMMAND)').replace(/wh=[^\s&"]+/g, 'wh=***'); };
    var r;
    if (!ok(rec)) r = { funcionou: false, texto: 'A Z-API não aceitou o endereço de recebimento: ' + limpa(rec.erro || ('resposta ' + rec.cod)) + '.' };
    else r = { funcionou: true, texto: 'Recebimento configurado: a Z-API entrega as mensagens recebidas no WhatsApp da empresa ao COMMAND (https://command.metrolabs.com.br/webhook/whatsapp, protegido por segredo)' +
      (ok(sta) ? ' e também a situação das mensagens enviadas (entregue, lida).' : '. A situação das mensagens enviadas não foi configurada (' + limpa(sta.erro || ('resposta ' + sta.cod)) + '); as mensagens recebidas funcionam assim mesmo.') +
      ' Mensagens de grupo e as enviadas pelo próprio celular são ignoradas.' + (w.gerado ? ' O segredo do endereço foi criado agora e gravado no COMMAND.' : '') };
    try { SGO_DATA.log('ZAPI_WEBHOOK', eu.usuario, 'Recebimento da Z-API: ' + (r.funcionou ? 'configurado' : 'recusado') + (w.gerado ? ' (segredo novo gravado no COMMAND)' : '') + '.', 'CHAVES'); } catch (e) {}
    return r;
  });
}

/** Botão "Enviar mensagem de teste para mim": para o celular do cadastro de quem está logado. */
function Chaves_apiZapiTesteParaMim(sessionId, payload) {
  return Chaves_resposta_(function () {
    var eu = Chaves_exigirDono_(sessionId);
    var c = Notificar_contatos_([eu.id])[eu.id] || {};
    var fone = SGO_zapiCelular_(c.telefone);
    var r;
    if (!fone) r = { funcionou: false, texto: 'Não foi possível enviar: o seu cadastro não tem celular válido. Cadastre em Administração > Usuários > Celular (com DDD) e clique de novo.' };
    else {
      var env = SGO_zapiEnviarTexto_(fone, 'Olá, ' + Notificar_primeiroNome_(c.nome || eu.nome) + '. Esta é uma mensagem de teste do SGO+: o WhatsApp da Metrolabs pela Z-API está funcionando.\n\nEnviada pelo botão "Enviar mensagem de teste para mim", em Chaves e senhas.\n\n' + ZAPI_ASSINATURA, { tipo: 'TESTE' });
      r = env.ok ? { funcionou: true, texto: 'Funcionou: a Z-API aceitou a mensagem para ' + SGO_zapiFoneBr_(fone) + '. Confira no seu celular.' }
        : { funcionou: false, texto: 'Não funcionou: ' + (env.motivo || 'a Z-API não aceitou o envio') + ' Confira as 3 chaves e clique em Conferir conexão.' };
    }
    try { PropertiesService.getScriptProperties().setProperty(CHV_PREFIXO_TESTE + 'whatsapp', JSON.stringify({ funcionou: !!r.funcionou, em: Chaves_agora_(), emBr: Chaves_dataBr_(Chaves_agora_()), texto: String(r.texto || '').slice(0, 400) })); } catch (e) {}
    try { SGO_DATA.log('CHAVE_TESTADA', eu.usuario, 'Teste zapi para mim: ' + (r.funcionou ? 'funcionou' : 'não funcionou') + '.', 'CHAVES'); } catch (e) {}
    return r;
  });
}
