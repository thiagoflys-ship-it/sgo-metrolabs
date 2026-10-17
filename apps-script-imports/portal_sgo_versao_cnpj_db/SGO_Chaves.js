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
  { chave: 'AUVO_API_KEY', grupo: 'Auvo', tipo: 'chave', teste: 'auvo', nome: 'Auvo: chave de acesso',
    ajuda: 'No Auvo: Menu → Integrações → API, campo da chave de acesso (API Key).' },
  { chave: 'AUVO_API_TOKEN', grupo: 'Auvo', tipo: 'chave', teste: 'auvo', nome: 'Auvo: token de acesso',
    ajuda: 'No Auvo, na mesma tela da chave de acesso, campo do token (API Token).' },
  { chave: 'AUVO_AVISOS_WHATSAPP', grupo: 'Auvo', tipo: 'aberto', exemplo: '1', nome: 'Avisos de O.S. do Auvo por WhatsApp e e-mail: 1 liga, 0 desliga',
    ajuda: 'Digite 1 para ligar ou 0 para desligar (vazio = desligado). Ligado, a sincronização do Auvo avisa o técnico, a gestão e o contato do cliente quando um chamado é aberto e quando é concluído (modelos sgo_chamado_aberto e sgo_chamado_concluido; ligue depois que a Meta aprovar os dois). Cada evento avisa uma vez. Na primeira sincronização com os avisos ligados, o SGO+ grava a data de corte AUVO_AVISOS_DESDE; O.S. abertas ou concluídas antes dela não geram aviso.' },
  { chave: 'AUVO_AVISAR_GESTAO', grupo: 'Auvo', tipo: 'aberto', exemplo: 'joao, maria', nome: 'Avisos de O.S.: quem da gestão recebe (logins)',
    ajuda: 'Logins (campo Usuário do cadastro de usuários) separados por vírgula. Vazio = todos os usuários ativos com perfil Gestor ou Diretoria.' },
  { chave: 'MODO_PERSONALIZADO_SENHA', grupo: 'Relatórios técnicos (senhas)', tipo: 'senha', nome: 'Senha do Modo Personalizado (relatórios)',
    ajuda: 'A mesma senha usada hoje no Modo Personalizado dos relatórios técnicos.' },
  { chave: 'SIMULADOR_ADMIN_SENHA', grupo: 'Relatórios técnicos (senhas)', tipo: 'senha', nome: 'Senha do Simulador (relatórios)',
    ajuda: 'A mesma senha usada hoje no Simulador dos relatórios técnicos.' },
  { chave: 'SMTP_SENHA', grupo: 'E-mail', tipo: 'senha', teste: 'email', nome: 'Senha do e-mail sistema@metrolabs.com.br',
    ajuda: 'A senha da caixa sistema@metrolabs.com.br (servidor mail.metrolabs.com.br, porta 465). Os e-mails do SGO+ saem por ela.' },
  { chave: 'WHATSAPP_PROVEDOR', grupo: 'WhatsApp', tipo: 'aberto', teste: 'whatsapp', exemplo: 'meta', nome: 'Provedor do WhatsApp: meta ou zapi',
    ajuda: 'Digite meta (WhatsApp oficial da Meta, por modelos aprovados) ou zapi (Z-API). Vazio: usa a Meta se o token da Meta estiver gravado; senão a Z-API, se as 3 chaves dela estiverem gravadas.' },
  { chave: 'META_WA_TOKEN', grupo: 'WhatsApp', tipo: 'chave', teste: 'whatsapp', nome: 'WhatsApp oficial (Meta): token permanente',
    ajuda: 'No Gerenciador de Negócios da Meta: Configurações do negócio → Usuários → Usuários do sistema → crie (ou abra) um usuário do sistema com acesso ao app e à conta do WhatsApp → Gerar novo token, sem validade, com as permissões whatsapp_business_messaging e whatsapp_business_management. Não use o token temporário de 24 h da tela de teste. As mensagens só saem por modelos aprovados (docs/MODELOS_WHATSAPP_META.md).' },
  { chave: 'META_WA_PHONE_ID', grupo: 'WhatsApp', tipo: 'aberto', exemplo: '1409597008899044', nome: 'WhatsApp oficial (Meta): identificação do número de telefone',
    ajuda: 'No painel de desenvolvedores da Meta (developers.facebook.com) → seu app → WhatsApp → Configuração da API: campo "Identificação do número de telefone" (Phone Number ID). O da Metrolabs (+55 62 98241-7106) é 1409597008899044. Não é o número de telefone.' },
  { chave: 'META_WA_WABA_ID', grupo: 'WhatsApp', tipo: 'aberto', exemplo: '1406451067859707', nome: 'WhatsApp oficial (Meta): identificação da conta comercial',
    ajuda: 'Na mesma tela da Configuração da API: "Identificação da conta do WhatsApp Business" (WABA ID). O da Metrolabs é 1406451067859707. Usado para conferir os modelos de mensagem cadastrados.' },
  { chave: 'ZAPI_INSTANCIA', grupo: 'WhatsApp', tipo: 'chave', teste: 'whatsapp', nome: 'Z-API: identificação da instância',
    ajuda: 'No painel da Z-API (app.z-api.io): Instâncias → abra a instância do WhatsApp da Metrolabs → copie o campo "ID da instância". Sem as 3 chaves Z-API, o WhatsApp por Z-API fica desligado.' },
  { chave: 'ZAPI_TOKEN', grupo: 'WhatsApp', tipo: 'chave', teste: 'whatsapp', nome: 'Z-API: token da instância',
    ajuda: 'Na mesma tela da instância na Z-API, copie o campo "Token da instância" (não é o Client-Token). Se a instância for recriada, o token muda e precisa ser gravado de novo aqui.' },
  { chave: 'ZAPI_CLIENT_TOKEN', grupo: 'WhatsApp', tipo: 'chave', teste: 'whatsapp', nome: 'Z-API: token de segurança da conta',
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
  if (item.chave === 'AUVO_AVISOS_WHATSAPP' && v !== '1' && v !== '0') {
    throw new Error('Não foi possível gravar: os avisos de O.S. aceitam só 1 (liga) ou 0 (desliga).');
  }
  if (item.chave === 'AUVO_AVISAR_GESTAO' && !/^[A-Za-z0-9._@-]+([\s,;]+[A-Za-z0-9._@-]+)*$/.test(v)) {
    throw new Error('Não foi possível gravar: informe os logins separados por vírgula (ex.: joao, maria), sem outros sinais.');
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
    pv.provedor === 'meta' ? 'confira o token e o Phone Number ID; o modelo sgo_aviso_geral precisa estar aprovado na Meta em pt_BR (use "Cadastrar modelos na Meta" abaixo).' : 'confira as 3 chaves da Z-API e se a instância está conectada ao celular.');
}

// ------------------------------------------------------------
// MODELOS DO WHATSAPP OFICIAL (Meta) — cadastro e situação
// As definições (nome, texto, exemplos) ficam só em NTF_MODELOS_META
// (SGO_Notificar.js), as mesmas usadas no envio.
// ------------------------------------------------------------

/** Token e WABA ID gravados; lança erro dizendo o que gravar. Nunca devolve o token para a tela. */
function Chaves_credMetaGestao_() {
  var c = Notificar_credenciaisMeta_();
  var falta = [];
  if (!c.token) falta.push('META_WA_TOKEN');
  if (!c.wabaId) falta.push('META_WA_WABA_ID');
  if (falta.length) throw new Error('Não foi possível falar com a Meta: falta gravar ' + falta.join(' e ') + ' no grupo WhatsApp desta tela.');
  return c;
}

function Chaves_urlGraph_(caminho) {
  return 'https://graph.facebook.com/' + NTF_META_VERSAO + '/' + caminho;
}

/** Erros que valem para a conta inteira (token, permissão, WABA ID, limite): não adianta tentar os outros modelos. */
function Chaves_erroMetaGeral_(http, er) {
  var cod = er && er.code !== undefined ? String(er.code) : '';
  var sub = er && er.error_subcode !== undefined ? String(er.error_subcode) : '';
  return http === 401 || http === 403 || http === 429 || ['190', '200', '10', '3', '4', '80008', '613', '368'].indexOf(cod) >= 0 || (cod === '100' && sub === '33');
}

/** A Meta disse que o modelo já existe neste idioma? */
function Chaves_erroMetaDuplicado_(er) {
  var sub = er && er.error_subcode !== undefined ? String(er.error_subcode) : '';
  var txt = String((er && (er.error_user_title || '')) + ' ' + (er && (er.error_user_msg || '')) + ' ' + (er && er.message || ''));
  return sub === '2388024' || /already exists|already .{0,40}content|duplicate|já existe|já há conteúdo/i.test(txt);
}

/** Erro da Meta traduzido: "Meta recusou (HTTP x, código y): mensagem — o que fazer". Sem o token. */
function Chaves_erroMeta_(http, j, txt, segredos) {
  var er = (j && j.error) || {};
  var cod = er.code !== undefined ? String(er.code) : '';
  var sub = er.error_subcode !== undefined ? String(er.error_subcode) : '';
  var msg = String(er.message || '');
  var msgUsuario = String(er.error_user_msg || '');
  var bruto = Chaves_semSegredos_((msg + (msgUsuario && msg.indexOf(msgUsuario) < 0 ? ' (' + msgUsuario + ')' : '')) || String(txt || '').slice(0, 200), segredos).slice(0, 260);
  var fazer;
  if (cod === '190' || http === 401) {
    fazer = 'o token é inválido ou venceu: gere um token permanente de usuário do sistema (Gerenciador de Negócios → Usuários do sistema → Gerar novo token, sem validade) e grave de novo META_WA_TOKEN.';
  } else if (/whatsapp_business_management|permission/i.test(msg) || cod === '200' || cod === '10' || cod === '3' || http === 403) {
    fazer = 'o token precisa da permissão de gerenciar a conta do WhatsApp: gere um token de usuário do sistema com whatsapp_business_management e whatsapp_business_messaging, com a conta do WhatsApp atribuída a esse usuário, e grave de novo META_WA_TOKEN.';
  } else if (cod === '100' && (sub === '33' || /does not exist|cannot be loaded|Unsupported (get|post) request/i.test(msg))) {
    fazer = 'a Meta não encontrou a conta do WhatsApp com este WABA ID, ou o token não tem acesso a ela: confira META_WA_WABA_ID (Identificação da conta do WhatsApp Business, não o Phone Number ID) e se a conta está atribuída ao usuário do sistema.';
  } else if (cod === '4' || cod === '80008' || cod === '613' || http === 429) {
    fazer = 'limite de chamadas da Meta atingido: aguarde alguns minutos e tente de novo.';
  } else if (cod === '368') {
    fazer = 'a conta está bloqueada temporariamente pela Meta por política: veja o aviso no Gerenciador do WhatsApp (Qualidade da conta).';
  } else if (sub === '2388023') {
    fazer = 'um modelo com este nome foi apagado há pouco e a Meta ainda não libera o nome (pode levar até 4 semanas): aguarde; se for urgente, avise o suporte do SGO+.';
  } else if (sub === '2388299' || sub === '2388293' || /variable|parameter/i.test(msg + ' ' + msgUsuario)) {
    fazer = 'a Meta recusou o texto do modelo (variáveis): avise o suporte do SGO+ para revisar a definição em SGO_Notificar.js (NTF_MODELOS_META).';
  } else {
    fazer = 'confira a mensagem da Meta; se continuar, abra o Gerenciador do WhatsApp (Modelos de mensagem) e veja se há aviso na conta.';
  }
  return 'Meta recusou (HTTP ' + http + (cod ? ', código ' + cod + (sub ? '/' + sub : '') : '') + '): ' + (bruto || 'sem detalhe') + ' — ' + fazer;
}

/** Chamada à Graph API: { http, j, txt } ou lança erro de rede (sem segredos). */
function Chaves_chamarMeta_(cred, url, metodo, corpo) {
  var op = { method: metodo, muteHttpExceptions: true, headers: { Authorization: 'Bearer ' + cred.token } };
  if (corpo) { op.contentType = 'application/json'; op.payload = JSON.stringify(corpo); }
  var r;
  try { r = UrlFetchApp.fetch(url, op); }
  catch (e) { throw new Error('sem resposta da Meta (' + Chaves_semSegredos_(e && e.message, [cred.token]) + ')'); }
  var txt = String(r.getContentText() || ''), j = null;
  try { j = JSON.parse(txt); } catch (e) {}
  return { http: r.getResponseCode(), j: j, txt: txt };
}

var CHV_STATUS_MODELO = {
  APPROVED: 'Aprovado', PENDING: 'Em análise', IN_APPEAL: 'Em análise', REJECTED: 'Recusado',
  PAUSED: 'Pausado', DISABLED: 'Desativado', PENDING_DELETION: 'Em exclusão', DELETED: 'Apagado',
  LIMIT_EXCEEDED: 'Limite de modelos excedido', ARCHIVED: 'Arquivado'
};
var CHV_RECUSA_MODELO = {
  INVALID_FORMAT: 'formato inválido',
  TAG_CONTENT_MISMATCH: 'o texto não combina com a categoria Utilidade',
  INCORRECT_CATEGORY: 'categoria incorreta',
  PROMOTIONAL: 'a Meta considerou o texto promocional',
  ABUSIVE_CONTENT: 'a Meta considerou o conteúdo abusivo',
  SCAM: 'a Meta considerou o texto suspeito de golpe'
};

/** Lista os modelos da conta (até 5 páginas de 100). { ok, lista } ou { ok:false, motivo, geral }. */
function Chaves_metaListarModelos_(cred) {
  var url = Chaves_urlGraph_(encodeURIComponent(cred.wabaId) + '/message_templates?fields=name,status,language,category,rejected_reason&limit=100');
  var lista = [];
  for (var pag = 0; pag < 5 && url; pag++) {
    var r;
    try { r = Chaves_chamarMeta_(cred, url, 'get', null); }
    catch (e) { return { ok: false, geral: true, motivo: String(e.message) + ' — confira a internet do servidor e tente de novo.' }; }
    if (r.http < 200 || r.http >= 300 || !r.j || r.j.error) {
      return { ok: false, geral: true, motivo: Chaves_erroMeta_(r.http, r.j, r.txt, [cred.token]) };
    }
    (r.j.data || []).forEach(function (m) { lista.push(m || {}); });
    var prox = r.j.paging && r.j.paging.next ? String(r.j.paging.next) : '';
    url = /^https:\/\/graph\.facebook\.com\//.test(prox) ? prox : '';
  }
  return { ok: true, lista: lista };
}

/** Situação dos 7 modelos do SGO+ a partir da lista da Meta. */
function Chaves_situacaoModelos_(lista) {
  var itens = Object.keys(NTF_MODELOS_META).map(function (nome) {
    var achados = lista.filter(function (m) { return String(m.name || '') === nome; });
    var pt = achados.filter(function (m) { return String(m.language || '') === NTF_META_IDIOMA; })[0];
    var it = { nome: nome, uso: NTF_MODELOS_META[nome].uso || '', status: '', situacao: '', motivo: '', categoria: '', falta: !pt };
    if (!pt) {
      var outros = achados.map(function (m) { return String(m.language || ''); }).filter(String);
      it.situacao = 'Não cadastrado';
      it.motivo = outros.length ? 'existe só em ' + outros.join(', ') + '; o SGO+ envia em ' + NTF_META_IDIOMA + '.' : '';
      return it;
    }
    it.status = String(pt.status || '').toUpperCase();
    it.situacao = CHV_STATUS_MODELO[it.status] || it.status || 'Sem situação';
    it.categoria = String(pt.category || '').toUpperCase();
    var obs = [];
    if (it.status === 'REJECTED') {
      var rr = String(pt.rejected_reason || '').toUpperCase();
      obs.push('motivo: ' + (CHV_RECUSA_MODELO[rr] || (rr && rr !== 'NONE' ? rr : 'não informado pela Meta')) +
        '. No Gerenciador do WhatsApp (Modelos de mensagem), abra o modelo e peça nova análise; se a Meta mantiver, avise o suporte do SGO+ para revisar o texto');
    } else if (it.status === 'PAUSED' || it.status === 'DISABLED') {
      obs.push('a Meta suspendeu o modelo por qualidade; veja o aviso no Gerenciador do WhatsApp');
    } else if (it.status === 'PENDING' || it.status === 'IN_APPEAL') {
      obs.push('aguarde a análise da Meta (minutos a 24 h) e clique em Atualizar');
    }
    if (it.categoria && it.categoria !== NTF_META_CATEGORIA) obs.push('categoria alterada pela Meta para ' + it.categoria + ' (o SGO+ cadastra como ' + NTF_META_CATEGORIA + ')');
    it.motivo = obs.join('; ') + (obs.length ? '.' : '');
    return it;
  });
  var faltam = itens.filter(function (x) { return x.falta; }).length;
  var aprovados = itens.filter(function (x) { return x.status === 'APPROVED'; }).length;
  return { itens: itens, faltam: faltam, aprovados: aprovados, total: itens.length };
}

/** Lista "Situação dos modelos". Devolve { funcionou, texto, itens, faltam, aprovados, total }. */
function Chaves_apiModelosSituacao(sessionId, payload) {
  return Chaves_resposta_(function () {
    Chaves_exigirDono_(sessionId);
    var cred = Chaves_credMetaGestao_();
    var l = Chaves_metaListarModelos_(cred);
    if (!l.ok) return { funcionou: false, texto: 'Não foi possível ler os modelos: ' + l.motivo, itens: [] };
    var s = Chaves_situacaoModelos_(l.lista);
    s.funcionou = true;
    s.texto = s.aprovados + ' de ' + s.total + ' modelos aprovados' + (s.faltam ? '; ' + s.faltam + ' não cadastrado(s) em ' + NTF_META_IDIOMA + ' — use "Cadastrar modelos na Meta".' : '.');
    return s;
  });
}

/**
 * Botão "Cadastrar modelos na Meta": para cada modelo de NTF_MODELOS_META que ainda não
 * existe em pt_BR, POST /<WABA_ID>/message_templates. "Já existe" conta como já cadastrado.
 * Devolve { funcionou, texto, itens: [{ nome, resultado: 'cadastrado'|'ja_existe'|'erro'|'nao_tentado', texto }] }.
 */
function Chaves_apiModelosCadastrar(sessionId, payload) {
  return Chaves_resposta_(function () {
    var eu = Chaves_exigirDono_(sessionId);
    var cred = Chaves_credMetaGestao_();
    var nomes = Object.keys(NTF_MODELOS_META);
    var existentes = {};
    var l = Chaves_metaListarModelos_(cred);
    if (!l.ok) return { funcionou: false, texto: 'Nada foi cadastrado: ' + l.motivo, itens: [] };
    l.lista.forEach(function (m) { if (String(m.language || '') === NTF_META_IDIOMA) existentes[String(m.name || '')] = String(m.status || '').toUpperCase(); });

    var itens = [], parar = '';
    nomes.forEach(function (nome) {
      if (parar) { itens.push({ nome: nome, resultado: 'nao_tentado', texto: 'Não tentado: ' + parar }); return; }
      if (Object.prototype.hasOwnProperty.call(existentes, nome)) {
        var st = existentes[nome];
        itens.push({ nome: nome, resultado: 'ja_existe', texto: 'Já cadastrado (' + (CHV_STATUS_MODELO[st] || st || 'sem situação') + ').' });
        return;
      }
      var corpo;
      try { corpo = Notificar_corpoCadastroMeta_(nome); }
      catch (e) { itens.push({ nome: nome, resultado: 'erro', texto: String(e.message) + ' Avise o suporte do SGO+.' }); return; }
      var r;
      try { r = Chaves_chamarMeta_(cred, Chaves_urlGraph_(encodeURIComponent(cred.wabaId) + '/message_templates'), 'post', corpo); }
      catch (e) {
        parar = 'a chamada anterior falhou.';
        itens.push({ nome: nome, resultado: 'erro', texto: 'Não cadastrado: ' + Notificar_limparSegredos_(e && e.message, [cred.token]) });
        return;
      }
      var er = (r.j && r.j.error) || null;
      if (r.http >= 200 && r.http < 300 && !er) {
        var stN = String((r.j && r.j.status) || 'PENDING').toUpperCase();
        itens.push({ nome: nome, resultado: 'cadastrado', texto: 'Enviado para análise da Meta (' + (CHV_STATUS_MODELO[stN] || stN) + ').' });
        return;
      }
      if (er && Chaves_erroMetaDuplicado_(er)) {
        itens.push({ nome: nome, resultado: 'ja_existe', texto: 'Já cadastrado na Meta.' });
        return;
      }
      var motivo = Chaves_erroMeta_(r.http, r.j, r.txt, [cred.token]);
      itens.push({ nome: nome, resultado: 'erro', texto: 'Não cadastrado: ' + motivo });
      if (Chaves_erroMetaGeral_(r.http, er)) parar = 'o erro acima vale para a conta inteira; corrija e clique de novo.';
    });

    var conta = { cadastrado: 0, ja_existe: 0, erro: 0, nao_tentado: 0 };
    itens.forEach(function (x) { conta[x.resultado]++; });
    try {
      SGO_DATA.log('MODELOS_META_CADASTRO', eu.usuario, 'Cadastro de modelos na Meta: ' + conta.cadastrado + ' enviados, ' + conta.ja_existe + ' já existiam, ' +
        (conta.erro + conta.nao_tentado) + ' com erro ou não tentados.', 'CHAVES');
    } catch (e) {}
    var falhou = conta.erro + conta.nao_tentado;
    return {
      funcionou: falhou === 0, itens: itens,
      texto: (falhou ? 'Concluído com problemas: ' : 'Concluído: ') + conta.cadastrado + ' enviado(s) para análise, ' + conta.ja_existe + ' já cadastrado(s)' +
        (falhou ? ', ' + falhou + ' com erro (veja abaixo).' : '. A aprovação sai em minutos ou até 24 h; acompanhe em "Situação dos modelos".')
    };
  });
}
