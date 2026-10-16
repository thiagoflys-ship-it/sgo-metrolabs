/****************************************************
 * CHAVES E SENHAS — servidor (2026-10-16)
 *
 * Módulo exclusivo do responsável pelo sistema (lista SGO_DONOS, comparada
 * com o USUARIO da sessão sem diferenciar maiúsculas). Grava as chaves de
 * integração e as senhas administrativas em
 * PropertiesService.getScriptProperties() — no servidor próprio isso é a
 * tabela "propriedades", escopo 'script', onde o carteiro de e-mail, o envio
 * de WhatsApp e os demais módulos leem.
 *
 *  - O valor gravado nunca volta para a tela: no máximo os 4 últimos
 *    caracteres de chaves de API ("••••7Q2x"); senhas, nem isso. Os
 *    identificadores não secretos (provedor, Phone ID, WABA ID) aparecem
 *    inteiros.
 *  - Data/hora da alteração em CHV_ALTERADO_<CHAVE> ("aaaa-mm-ddThh:mm:ss",
 *    horário de Brasília).
 *  - Auditoria em SYS_LOGS (SGO_DATA.log, módulo CHAVES): quem, quando e
 *    qual chave — nunca o valor.
 *  - SIMULADOR_ADMIN_SENHA e MODO_PERSONALIZADO_SENHA são comparadas em
 *    texto puro pelos relatórios técnicos (AutoRel/LavRel/CadeiaFrio/
 *    EstufaBanho: senha !== senhaEsperada); por isso são gravadas como
 *    texto, o único formato que o sistema aceita hoje.
 *
 * Tela em JS_Chaves.html. Toda Chaves_api*(sessionId, payload) confere a
 * sessão e o dono; quem não for dono recebe a mensagem de módulo exclusivo.
 ****************************************************/

/** Quem pode ver e usar o módulo (login do usuário, sem diferenciar maiúsculas). Troque aqui. */
var SGO_DONOS = ['admin'];

var CHV_FUSO = 'America/Sao_Paulo';
var CHV_PREFIXO_ALTERADO = 'CHV_ALTERADO_';
var CHV_MSG_EXCLUSIVO = 'Não foi possível abrir: este módulo é exclusivo do responsável pelo sistema.';

var CHV_GRUPOS = ['Inteligência artificial', 'Auvo', 'Relatórios técnicos (senhas)', 'E-mail', 'WhatsApp', 'COMMAND'];

/**
 * tipo: 'chave' (segredo, mostra os 4 últimos), 'senha' (segredo, não mostra nada),
 *       'aberto' (não secreto, mostra inteiro).
 * teste: qual botão "Testar" aparece no item.
 */
var CHV_ITENS = [
  { chave: 'GEMINI_API_KEY', grupo: 'Inteligência artificial', tipo: 'chave', teste: 'gemini', nome: 'Chave da IA (Gemini)',
    ajuda: 'Google AI Studio → Get API key. Usada nas interpretações técnicas, PGT/POP e leitura de documentos.' },
  { chave: 'AUVO_API_KEY', grupo: 'Auvo', tipo: 'chave', teste: 'auvo', nome: 'Auvo — API Key',
    ajuda: 'No Auvo: Menu → Integrações → API (a mesma usada no SGO+ do Google).' },
  { chave: 'AUVO_API_TOKEN', grupo: 'Auvo', tipo: 'chave', teste: 'auvo', nome: 'Auvo — API Token',
    ajuda: 'No Auvo, na mesma tela da API Key.' },
  { chave: 'MODO_PERSONALIZADO_SENHA', grupo: 'Relatórios técnicos (senhas)', tipo: 'senha', nome: 'Senha do Modo Personalizado (relatórios)',
    ajuda: 'A mesma senha usada hoje no Modo Personalizado dos relatórios técnicos.' },
  { chave: 'SIMULADOR_ADMIN_SENHA', grupo: 'Relatórios técnicos (senhas)', tipo: 'senha', nome: 'Senha do Simulador (relatórios)',
    ajuda: 'A mesma senha usada hoje no Simulador dos relatórios técnicos.' },
  { chave: 'SMTP_SENHA', grupo: 'E-mail', tipo: 'senha', teste: 'email', nome: 'Senha do e-mail sistema@metrolabs.com.br',
    ajuda: 'A senha da caixa sistema@metrolabs.com.br (servidor mail.metrolabs.com.br, porta 465). Os e-mails do SGO+ saem por ela.' },
  { chave: 'WHATSAPP_PROVEDOR', grupo: 'WhatsApp', tipo: 'aberto', teste: 'whatsapp', exemplo: 'meta', nome: 'Provedor do WhatsApp: meta ou zapi',
    ajuda: 'Digite meta (WhatsApp oficial da Meta, por modelos aprovados) ou zapi (Z-API). Vazio: usa a Meta se o token da Meta estiver gravado; senão a Z-API, se as 3 chaves dela estiverem gravadas.' },
  { chave: 'META_WA_TOKEN', grupo: 'WhatsApp', tipo: 'chave', teste: 'whatsapp', nome: 'WhatsApp oficial (Meta) — token permanente',
    ajuda: 'No Gerenciador de Negócios da Meta: Configurações do negócio → Usuários → Usuários do sistema → crie (ou abra) um usuário do sistema com acesso ao app e à conta do WhatsApp → Gerar novo token, sem validade, com as permissões whatsapp_business_messaging e whatsapp_business_management. Não use o token temporário de 24 h da tela de teste. As mensagens só saem por modelos aprovados (docs/MODELOS_WHATSAPP_META.md).' },
  { chave: 'META_WA_PHONE_ID', grupo: 'WhatsApp', tipo: 'aberto', exemplo: '1409597008899044', nome: 'WhatsApp oficial — Phone Number ID',
    ajuda: 'No painel de desenvolvedores da Meta (developers.facebook.com) → seu app → WhatsApp → Configuração da API: campo "Identificação do número de telefone" (Phone Number ID). O da Metrolabs (+55 62 98241-7106) é 1409597008899044. Não é o número de telefone.' },
  { chave: 'META_WA_WABA_ID', grupo: 'WhatsApp', tipo: 'aberto', exemplo: '1406451067859707', nome: 'WhatsApp oficial — WABA ID',
    ajuda: 'Na mesma tela da Configuração da API: "Identificação da conta do WhatsApp Business" (WABA ID). O da Metrolabs é 1406451067859707. Usado para conferir os modelos de mensagem cadastrados.' },
  { chave: 'ZAPI_INSTANCIA', grupo: 'WhatsApp', tipo: 'chave', teste: 'whatsapp', nome: 'Z-API — ID da instância',
    ajuda: 'No painel da Z-API (app.z-api.io): Instâncias → abra a instância do WhatsApp da Metrolabs → copie o campo "ID da instância". Sem as 3 chaves Z-API, o WhatsApp por Z-API fica desligado.' },
  { chave: 'ZAPI_TOKEN', grupo: 'WhatsApp', tipo: 'chave', teste: 'whatsapp', nome: 'Z-API — token da instância',
    ajuda: 'Na mesma tela da instância na Z-API, copie o campo "Token da instância" (não é o Client-Token). Se a instância for recriada, o token muda e precisa ser gravado de novo aqui.' },
  { chave: 'ZAPI_CLIENT_TOKEN', grupo: 'WhatsApp', tipo: 'chave', teste: 'whatsapp', nome: 'Z-API — Client-Token (Segurança da conta)',
    ajuda: 'Na Z-API: menu Segurança → "Token de segurança da conta" (Client-Token). Ative o token lá e cole aqui o mesmo valor; sem ele a Z-API recusa os envios.' },
  { chave: 'PONTE_COMMAND_SEGREDO', grupo: 'COMMAND', tipo: 'chave', nome: 'Segredo da ponte com o COMMAND',
    ajuda: 'O mesmo valor configurado no COMMAND para falar com o SGO+.' }
];

// ------------------------------------------------------------
// INFRA
// ------------------------------------------------------------
function Chaves_ehDonoUsuario_(usuario) {
  var u = String(usuario === null || usuario === undefined ? '' : usuario).trim().toLowerCase();
  if (!u) return false;
  return SGO_DONOS.some(function (d) { return String(d || '').trim().toLowerCase() === u; });
}

/** Sessão válida E dono; senão lança a mensagem certa. */
function Chaves_exigirDono_(sessionId) {
  var v = validarSessao(sessionId);
  if (!v || !v.valid) {
    throw new Error('Não foi possível abrir: a sua sessão expirou. Saia e entre de novo no SGO+.');
  }
  var s = v.data || {};
  if (!Chaves_ehDonoUsuario_(s.usuario)) {
    try { SGO_DATA.log('CHAVES_ACESSO_RECUSADO', SGO_UTILS.safe(s.usuario), 'Tentativa de usar o módulo Chaves e senhas.', 'CHAVES'); } catch (e) {}
    throw new Error(CHV_MSG_EXCLUSIVO);
  }
  return { id: SGO_UTILS.safe(s.userId), usuario: SGO_UTILS.safe(s.usuario), nome: SGO_UTILS.safe(s.nome) || SGO_UTILS.safe(s.usuario) };
}

function Chaves_resposta_(fn) {
  try {
    var r = fn();
    return JSON.parse(JSON.stringify(Object.assign({ ok: true }, r || {})));
  } catch (e) {
    return { ok: false, message: String((e && e.message) || e) };
  }
}

function Chaves_item_(chave) {
  var k = String(chave || '').trim();
  for (var i = 0; i < CHV_ITENS.length; i++) if (CHV_ITENS[i].chave === k) return CHV_ITENS[i];
  return null;
}

function Chaves_agora_() {
  return Utilities.formatDate(new Date(), CHV_FUSO, "yyyy-MM-dd'T'HH:mm:ss");
}

function Chaves_dataBr_(s) {
  var m = String(s || '').match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  return m ? m[3] + '/' + m[2] + '/' + m[1] + ' ' + m[4] + ':' + m[5] : '';
}

/** O que a tela pode ver do valor gravado. */
function Chaves_mascara_(item, valor) {
  var v = String(valor || '');
  if (!v) return '';
  if (item.tipo === 'aberto') return v;
  if (item.tipo === 'senha') return '••••••••';
  return v.length >= 8 ? '••••' + v.slice(-4) : '••••';
}

function Chaves_situacao_(item, props) {
  var valor = String(props[item.chave] || '');
  var em = Chaves_dataBr_(props[CHV_PREFIXO_ALTERADO + item.chave]);
  return {
    chave: item.chave, grupo: item.grupo, nome: item.nome, ajuda: item.ajuda, exemplo: item.exemplo || '',
    tipo: item.tipo, teste: item.teste || '',
    configurado: !!valor.trim(), alteradoEm: em, mascara: Chaves_mascara_(item, valor)
  };
}

function Chaves_lerTodas_() {
  var p = PropertiesService.getScriptProperties();
  var out = {};
  CHV_ITENS.forEach(function (it) {
    out[it.chave] = p.getProperty(it.chave) || '';
    out[CHV_PREFIXO_ALTERADO + it.chave] = p.getProperty(CHV_PREFIXO_ALTERADO + it.chave) || '';
  });
  return out;
}

/** Normaliza e confere o valor antes de gravar. Lança erro com o que fazer. */
function Chaves_validarValor_(item, valor) {
  var v = String(valor === null || valor === undefined ? '' : valor).trim();
  if (!v) throw new Error('Não foi possível gravar: o campo está vazio. Cole o valor e clique em Gravar; para remover a chave, use Apagar.');
  if (/[\r\n\t]/.test(v)) throw new Error('Não foi possível gravar: o valor tem quebra de linha. Copie de novo só o valor, numa linha, e cole.');
  if (v.length > 4000) throw new Error('Não foi possível gravar: o valor tem mais de 4.000 caracteres. Confira se copiou só a chave.');
  if (item.chave === 'WHATSAPP_PROVEDOR') {
    v = v.toLowerCase();
    if (v !== 'meta' && v !== 'zapi') throw new Error('Não foi possível gravar: o provedor do WhatsApp aceita só meta ou zapi.');
  }
  if (item.chave === 'META_WA_PHONE_ID' || item.chave === 'META_WA_WABA_ID') {
    if (!/^\d{6,25}$/.test(v)) throw new Error('Não foi possível gravar: este campo é um número de identificação (só algarismos, ex.: ' + item.exemplo + '), copiado do painel da Meta. Não é o número de telefone.');
  }
  return v;
}

/** Depois de trocar credenciais do Auvo, o token guardado em cache deixa de valer. */
function Chaves_aposAlterar_(chave) {
  if (chave === 'AUVO_API_KEY' || chave === 'AUVO_API_TOKEN') {
    try { if (typeof Auvo_invalidarTokenCache_ === 'function') Auvo_invalidarTokenCache_(); } catch (e) {}
  }
}

function Chaves_lista_() {
  var props = Chaves_lerTodas_();
  return { grupos: CHV_GRUPOS, itens: CHV_ITENS.map(function (it) { return Chaves_situacao_(it, props); }) };
}

// ------------------------------------------------------------
// API
// ------------------------------------------------------------

/** Usado pela casca para mostrar o item do menu. Nunca lança erro; não revela nada além de sim/não. */
function Chaves_apiEhDono(sessionId, payload) {
  try {
    var v = validarSessao(sessionId);
    return { ok: true, dono: !!(v && v.valid && Chaves_ehDonoUsuario_((v.data || {}).usuario)) };
  } catch (e) {
    return { ok: true, dono: false };
  }
}

function Chaves_apiListar(sessionId, payload) {
  return Chaves_resposta_(function () {
    Chaves_exigirDono_(sessionId);
    return Chaves_lista_();
  });
}

function Chaves_apiGravar(sessionId, payload) {
  return Chaves_resposta_(function () {
    var eu = Chaves_exigirDono_(sessionId);
    var p = payload || {};
    var item = Chaves_item_(p.chave);
    if (!item) throw new Error('Não foi possível gravar: chave desconhecida. Atualize a página (F5) e tente de novo.');
    var valor = Chaves_validarValor_(item, p.valor);
    var props = PropertiesService.getScriptProperties();
    props.setProperty(item.chave, valor);
    props.setProperty(CHV_PREFIXO_ALTERADO + item.chave, Chaves_agora_());
    Chaves_aposAlterar_(item.chave);
    SGO_DATA.log('CHAVE_GRAVADA', eu.usuario, 'Chave ' + item.chave + ' gravada (valor não registrado).', 'CHAVES');
    var r = Chaves_lista_();
    r.mensagem = item.nome + ': gravado.';
    return r;
  });
}

function Chaves_apiApagar(sessionId, payload) {
  return Chaves_resposta_(function () {
    var eu = Chaves_exigirDono_(sessionId);
    var p = payload || {};
    var item = Chaves_item_(p.chave);
    if (!item) throw new Error('Não foi possível apagar: chave desconhecida. Atualize a página (F5) e tente de novo.');
    var props = PropertiesService.getScriptProperties();
    props.deleteProperty(item.chave);
    props.setProperty(CHV_PREFIXO_ALTERADO + item.chave, Chaves_agora_());
    Chaves_aposAlterar_(item.chave);
    SGO_DATA.log('CHAVE_APAGADA', eu.usuario, 'Chave ' + item.chave + ' apagada.', 'CHAVES');
    var r = Chaves_lista_();
    r.mensagem = item.nome + ': apagado.';
    return r;
  });
}

/**
 * Testes: payload.tipo = 'gemini' | 'auvo' | 'email' | 'whatsapp' (whatsapp pede payload.telefone).
 * Devolve { ok:true, funcionou:bool, texto } — o texto já diz o que fazer quando falha.
 */
function Chaves_apiTestar(sessionId, payload) {
  return Chaves_resposta_(function () {
    var eu = Chaves_exigirDono_(sessionId);
    var p = payload || {};
    var tipo = String(p.tipo || '');
    var r;
    if (tipo === 'gemini') r = Chaves_testarGemini_();
    else if (tipo === 'auvo') r = Chaves_testarAuvo_();
    else if (tipo === 'email') r = Chaves_testarEmail_(eu);
    else if (tipo === 'whatsapp') r = Chaves_testarWhatsapp_(p.telefone);
    else throw new Error('Não foi possível testar: tipo de teste desconhecido. Atualize a página (F5).');
    try { SGO_DATA.log('CHAVE_TESTADA', eu.usuario, 'Teste ' + tipo + ': ' + (r.funcionou ? 'funcionou' : 'não funcionou') + '.', 'CHAVES'); } catch (e) {}
    return { funcionou: !!r.funcionou, texto: String(r.texto || ''), tipo: tipo };
  });
}

// ------------------------------------------------------------
// TESTES
// ------------------------------------------------------------
function Chaves_falhou_(motivo, fazer) {
  return { funcionou: false, texto: 'Não funcionou: ' + motivo + (fazer ? ' — ' + fazer : '') };
}

function Chaves_semSegredos_(msg, segredos) {
  var s = String(msg || '');
  (segredos || []).forEach(function (x) { if (x && String(x).length >= 4) s = s.split(String(x)).join('***'); });
  return s.slice(0, 400);
}

function Chaves_testarGemini_() {
  var chave = String(PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY') || '').trim();
  if (!chave) return Chaves_falhou_('a chave da IA não está gravada', 'cole a GEMINI_API_KEY acima e clique em Gravar.');
  var url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + encodeURIComponent(chave);
  var resp;
  try {
    resp = UrlFetchApp.fetch(url, {
      method: 'post', contentType: 'application/json', muteHttpExceptions: true,
      payload: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: 'Responda apenas: OK' }] }],
        generationConfig: { maxOutputTokens: 8, temperature: 0, thinkingConfig: { thinkingBudget: 0 } }
      })
    });
  } catch (e) {
    return Chaves_falhou_('sem resposta do Google (' + Chaves_semSegredos_(e && e.message, [chave]) + ')', 'confira a internet do servidor e tente de novo.');
  }
  var codigo = resp.getResponseCode(), j = null;
  try { j = JSON.parse(resp.getContentText()); } catch (e) {}
  if (codigo >= 200 && codigo < 300) return { funcionou: true, texto: 'Funcionou: a IA respondeu com esta chave.' };
  var er = (j && j.error) || {};
  var motivoGoogle = Chaves_semSegredos_(er.message || '', [chave]);
  var razao = '';
  try { razao = String(((er.details || [])[0] || {}).reason || ''); } catch (e) {}
  if (razao === 'API_KEY_INVALID' || /API key not valid/i.test(motivoGoogle)) return Chaves_falhou_('o Google não reconheceu a chave', 'gere outra no Google AI Studio (Get API key), cole aqui e grave.');
  if (codigo === 403) return Chaves_falhou_('a chave não tem permissão para a API Gemini (HTTP 403)', 'no Google AI Studio, confira se a chave é do projeto certo e se a API Generative Language está ativa.');
  if (codigo === 429) return Chaves_falhou_('limite de uso da chave esgotado (HTTP 429)', 'aguarde alguns minutos ou confira o faturamento do projeto no Google AI Studio.');
  return Chaves_falhou_('o Google respondeu HTTP ' + codigo + (motivoGoogle ? ' (' + motivoGoogle + ')' : ''), 'tente de novo em alguns minutos; se continuar, gere outra chave.');
}

function Chaves_testarAuvo_() {
  var props = PropertiesService.getScriptProperties();
  var falta = ['AUVO_API_KEY', 'AUVO_API_TOKEN'].filter(function (k) { return !String(props.getProperty(k) || '').trim(); });
  if (falta.length) return Chaves_falhou_('falta gravar ' + falta.join(' e '), 'cole a API Key e o API Token do Auvo acima e clique em Gravar.');
  if (typeof Auvo_autenticar_ !== 'function') return Chaves_falhou_('o módulo do Auvo não está carregado neste sistema', 'avise o suporte do SGO+.');
  try {
    if (typeof Auvo_invalidarTokenCache_ === 'function') Auvo_invalidarTokenCache_();
    Auvo_autenticar_();
    return { funcionou: true, texto: 'Funcionou: o Auvo aceitou o login com a API Key e o API Token gravados.' };
  } catch (e) {
    var m = Chaves_semSegredos_(e && e.message, [props.getProperty('AUVO_API_KEY'), props.getProperty('AUVO_API_TOKEN')]);
    if (/inválid|401|403/i.test(m)) return Chaves_falhou_('o Auvo recusou as credenciais', 'no Auvo (Menu → Integrações → API) copie de novo a API Key e o API Token e grave os dois aqui.');
    return Chaves_falhou_(m, 'tente de novo em alguns minutos; se continuar, confira as credenciais no Auvo.');
  }
}

function Chaves_testarEmail_(eu) {
  var u = null;
  try { u = SGO_DATA.getById(SGO_CFG.SHEETS.CAD_USUARIOS, eu.id); } catch (e) {}
  var email = SGO_UTILS.safeLower(u && u.EMAIL).trim();
  if (!email || email.indexOf('@') < 1) return Chaves_falhou_('o seu usuário não tem e-mail cadastrado', 'cadastre o seu e-mail em Administração → Usuários e teste de novo.');
  var noServidor = false;
  try { noServidor = ScriptApp.getScriptId() === 'sgo-servidor'; } catch (e) {}
  if (noServidor && !String(PropertiesService.getScriptProperties().getProperty('SMTP_SENHA') || '').trim()) {
    return Chaves_falhou_('a senha do e-mail do sistema (SMTP_SENHA) não está gravada; sem ela os e-mails ficam parados na fila', 'grave a senha da caixa sistema@metrolabs.com.br acima e teste de novo.');
  }
  var quando = Chaves_dataBr_(Chaves_agora_());
  var texto = 'Este é um e-mail de teste enviado pelo módulo Chaves e senhas em ' + quando + '.\nSe chegou, o envio de e-mails do SGO+ está funcionando.';
  try {
    MailApp.sendEmail({
      to: email, subject: 'SGO+ — teste de e-mail', name: 'SGO+ Metrolabs',
      body: Notificar_textoEmail_('Teste de e-mail', texto, ''),
      htmlBody: Notificar_htmlEmail_('Teste de e-mail', texto, '')
    });
  } catch (e) {
    return Chaves_falhou_(Chaves_semSegredos_(e && e.message, []), 'confira a senha do e-mail do sistema e tente de novo.');
  }
  return { funcionou: true, texto: 'Funcionou: o e-mail de teste foi entregue ao sistema para ' + email + '. Deve chegar em alguns minutos; confira também o lixo eletrônico. Se não chegar, confira a SMTP_SENHA.' };
}

function Chaves_testarWhatsapp_(telefone) {
  var tel = Notificar_normalizarTelefone_(telefone);
  if (!tel) return Chaves_falhou_('número de celular inválido', 'digite o celular com DDD, ex.: (62) 98241-7106.');
  var pv = Notificar_provedorWhatsapp_();
  if (!pv.provedor) return Chaves_falhou_(pv.motivo, '');
  var res;
  try {
    if (pv.provedor === 'meta') {
      res = Notificar_enviarMeta_(pv.cred, tel, 'sgo_aviso_geral', [
        'Teste do SGO+', 'Mensagem de teste enviada pelo módulo Chaves e senhas.', Notificar_linkSgo_() || 'https://sgo.metrolabs.com.br'
      ]);
    } else {
      res = Notificar_enviarWhatsapp_(pv.cred, tel, 'SGO+ Metrolabs: mensagem de teste enviada pelo módulo Chaves e senhas.');
    }
  } catch (e) {
    res = { ok: false, motivo: String((e && e.message) || e) };
  }
  var nomeProv = pv.provedor === 'meta' ? 'WhatsApp oficial (Meta), modelo sgo_aviso_geral' : 'Z-API';
  if (res && res.ok) return { funcionou: true, texto: 'Funcionou: mensagem aceita pelo ' + nomeProv + ' para ' + tel + '. Confira no celular.' };
  return Chaves_falhou_(Notificar_limparSegredos_(res && res.motivo, pv.segredos || []),
    pv.provedor === 'meta' ? 'confira o token e o Phone Number ID; o modelo sgo_aviso_geral precisa estar aprovado na Meta em pt_BR.' : 'confira as 3 chaves da Z-API e se a instância está conectada ao celular.');
}
