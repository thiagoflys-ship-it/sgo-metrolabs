/****************************************************
 * CAJU — CLIENTE DA API DE PARCEIROS (11/11/2026, pedido do dono: "usar todos os recursos da API do Caju")
 *
 * Fonte da verdade: output/deposito-viagem-20261111/ESTUDO_API_CAJU.md (docs.caju.com.br, acesso de parceiro).
 * Usado pelo módulo Conciliação Caju (SGO_Caju*.js) e pela carga automática do Depósito de viagem.
 *
 * ACESSO: OAuth2 "password grant" no servidor de autenticação do Caju (form-urlencoded) com client_id, client_secret,
 * username = ID da integração e password = senha da integração. O token (JWT) vale 600 s: fica guardado e é renovado
 * 60 s antes de vencer (ou na hora, se o Caju responder 401). A conta da empresa (sponsorId) vem na claim "sponsorId".
 *
 * CREDENCIAIS: só em Administração > Chaves e senhas (SGO_Chaves.js, grupo "Caju", gravadas só pelo dono): CAJU_CLIENT_ID,
 * CAJU_CLIENT_SECRET, CAJU_INTEGRACAO_ID, CAJU_INTEGRACAO_SENHA e CAJU_AMBIENTE (homologacao | producao). Endereços opcionais
 * CAJU_URL_AUTH e CAJU_URL_API trocam o padrão do ambiente (o host da API de homologação não está na documentação lida:
 * confirmar com o Caju). Nunca no código, nunca na tela, nunca no registro: as mensagens de erro passam por CajuApi_limpar_.
 *
 * REGISTRO: cada chamada vira uma linha em CJU_CHAMADAS (quando, ambiente, método, caminho, código HTTP, tempo, resultado,
 * quem e de onde). Sem corpo, sem CPF, sem token, sem segredo.
 *
 * CAMINHOS: os documentados estão em CJA_ROTAS. Os marcados "A CONFIRMAR" (arquivar, desarquivar, cancelar e a paginação da
 * lista) não têm o formato exato no estudo: ficam aqui, num lugar só, para ajustar na homologação sem mexer no resto.
 * Nenhuma função devolve Date cru. Este arquivo só define funções e constantes literais (pode carregar antes de qualquer outro).
 ****************************************************/

var CJA_AMBIENTES = {
  homologacao: { nome: 'Homologação (conta fictícia do Caju)', auth: 'https://auth-staging.caju.com.br', api: 'https://services.caju.com.br/partners' },
  producao: { nome: 'Produção (conta real da Metrolabs)', auth: 'https://auth.caju.com.br', api: 'https://services.caju.com.br/partners' }
};
var CJA_PROPS = { CLIENT_ID: 'CAJU_CLIENT_ID', CLIENT_SECRET: 'CAJU_CLIENT_SECRET', USUARIO: 'CAJU_INTEGRACAO_ID', SENHA: 'CAJU_INTEGRACAO_SENHA', AMBIENTE: 'CAJU_AMBIENTE',
  URL_AUTH: 'CAJU_URL_AUTH', URL_API: 'CAJU_URL_API' };
var CJA_ROTAS = {
  token: '/realms/partner/protocol/openid-connect/token',
  colaboradores: '/v1/employee',                          // GET (lista da conta) e POST (cadastrar)
  arquivar: '/v1/employee/{id}/archive',                  // A CONFIRMAR na homologação (método POST)
  desarquivar: '/v1/employee/{id}/unarchive',             // A CONFIRMAR na homologação (método POST)
  pedidos: '/v1/voucher/allowance_order',                 // POST cria o rascunho
  pedido: '/v1/voucher/allowance_order/{id}',             // GET consulta; POST efetiva (paymentStrategies)
  cancelar: '/v1/voucher/allowance_order/{id}/cancel'     // A CONFIRMAR na homologação (método POST)
};
var CJA_TOKEN_VIDA_PADRAO = 600;
var CJA_TOKEN_FOLGA = 60;
var CJA_ABA_CHAMADAS = 'CJU_CHAMADAS';
var CJA_COLUNAS_CHAMADAS = ['ID', 'EM', 'AMBIENTE', 'METODO', 'CAMINHO', 'HTTP', 'MS', 'RESULTADO', 'MENSAGEM', 'ORIGEM', 'REF', 'POR_ID', 'POR_NOME'];
/** Status do pedido de crédito (consulta), na ordem do caminho. */
var CJA_STATUS_PEDIDO = { DRAFT: 'Rascunho no Caju', PREPROCESSING: 'Em pré-processamento', PROCESSING: 'Em processamento', PAYMENT_PENDING: 'Aguardando o pagamento',
  PAID: 'Pago', SCHEDULED: 'Agendado', REDEMPTION_IN_PROGRESS: 'Crédito em andamento', REDEEMED: 'Creditado no cartão', CANCELED: 'Cancelado' };
var CJA_TOKEN_MEMO = null;

// ------------------------------------------------------------
// CONFIGURAÇÃO (lida das Chaves e senhas; o valor secreto nunca sai daqui)
// ------------------------------------------------------------
function CajuApi_s_(v) { return v === null || v === undefined ? '' : String(v).trim(); }
function CajuApi_cfg_() {
  var p = PropertiesService.getScriptProperties(), g = function (k) { return CajuApi_s_(p.getProperty(k)); };
  var amb = g(CJA_PROPS.AMBIENTE).toLowerCase().replace(/[çã]/g, function (c) { return c === 'ç' ? 'c' : 'a'; });
  if (amb === 'homolog' || amb === 'staging' || amb === 'teste') amb = 'homologacao';
  if (amb === 'prod') amb = 'producao';
  var base = CJA_AMBIENTES[amb] || null;
  var cfg = { ambiente: base ? amb : '', ambienteNome: base ? base.nome : '', clientId: g(CJA_PROPS.CLIENT_ID), clientSecret: g(CJA_PROPS.CLIENT_SECRET), usuario: g(CJA_PROPS.USUARIO),
    senha: g(CJA_PROPS.SENHA), urlAuth: (g(CJA_PROPS.URL_AUTH) || (base ? base.auth : '')).replace(/\/+$/, ''), urlApi: (g(CJA_PROPS.URL_API) || (base ? base.api : '')).replace(/\/+$/, ''),
    urlAuthPropria: !!g(CJA_PROPS.URL_AUTH), urlApiPropria: !!g(CJA_PROPS.URL_API) };
  var faltam = [];
  if (!cfg.ambiente) faltam.push('Ambiente (homologacao ou producao)');
  if (!cfg.clientId) faltam.push('Client ID');
  if (!cfg.clientSecret) faltam.push('Client Secret');
  if (!cfg.usuario) faltam.push('ID da integração');
  if (!cfg.senha) faltam.push('Senha da integração');
  cfg.faltam = faltam; cfg.completo = faltam.length === 0;
  return cfg;
}
/** O que a tela pode saber da integração: nada secreto. */
function CajuApi_situacao_() {
  var c = CajuApi_cfg_();
  return { configurada: c.completo, ambiente: c.ambiente, ambienteNome: c.ambienteNome, faltam: c.faltam, urlAuth: c.urlAuth, urlApi: c.urlApi, urlPropria: c.urlAuthPropria || c.urlApiPropria,
    producao: c.ambiente === 'producao' };
}
function CajuApi_naoConfigurada_(c) {
  var e = new Error('A integração com o Caju ainda não está configurada (falta: ' + c.faltam.join(', ') + '). O que fazer: o responsável pelo sistema grava as credenciais em Administração > Chaves e senhas, grupo "Caju". Enquanto isso, a carga continua pelo registro manual (Depósito de viagem > Carga no cartão) e a conciliação do extrato funciona pelo arquivo CSV.');
  e.cajuHttp = -1; e.cajuCodigo = 'NAO_CONFIGURADA';
  return e;
}

// ------------------------------------------------------------
// SEGREDOS FORA DAS MENSAGENS
// ------------------------------------------------------------
/** Tira das mensagens qualquer credencial, token, CPF ou texto longo. */
function CajuApi_limpar_(msg, extras) {
  var s = CajuApi_s_(msg);
  var c = null;
  try { c = CajuApi_cfg_(); } catch (e) { c = null; }
  var segredos = (extras || []).slice();
  if (c) segredos.push(c.clientSecret, c.senha, c.clientId, c.usuario);
  if (CJA_TOKEN_MEMO && CJA_TOKEN_MEMO.token) segredos.push(CJA_TOKEN_MEMO.token);
  segredos.forEach(function (x) { x = CajuApi_s_(x); if (x.length >= 4) s = s.split(x).join('***'); });
  s = s.replace(/eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*/g, '***')           // JWT
    .replace(/(bearer|token|secret|password|senha)(["':=\s]+)[^\s"',}]+/gi, '$1$2***')
    .replace(/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g, '***CPF***');
  return s.length > 300 ? s.slice(0, 300) + '…' : s;
}

// ------------------------------------------------------------
// REGISTRO DE CADA CHAMADA (sem dados sensíveis). Nunca lança.
// ------------------------------------------------------------
var CJA_ABA_OK = false;
function CajuApi_registrar_(c, metodo, caminho, http, ms, ok, mensagem, ctx) {
  try {
    if (!CJA_ABA_OK && typeof CertCal_garantirTabela_ === 'function') {
      CertCal_garantirTabela_(CJA_ABA_CHAMADAS, CJA_COLUNAS_CHAMADAS);
      CJA_COLUNAS_CHAMADAS.forEach(function (k) { CertCal_garantirColuna_(CJA_ABA_CHAMADAS, k); });
      if (typeof CertCal_forcarColunaTexto_ === 'function') CertCal_forcarColunaTexto_(CJA_ABA_CHAMADAS, 'EM');
      CJA_ABA_OK = true;
    }
    ctx = ctx || {};
    var em = Utilities.formatDate(new Date(), 'America/Sao_Paulo', "yyyy-MM-dd'T'HH:mm:ss");
    var id = '';
    try { id = Utilities.getUuid(); } catch (e) { id = 'cja-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
    SGO_DATA.insert(CJA_ABA_CHAMADAS, { ID: id, EM: em, AMBIENTE: c ? c.ambiente : '', METODO: metodo, CAMINHO: String(caminho || '').split('?')[0].slice(0, 200), HTTP: http, MS: Math.round(ms || 0),
      RESULTADO: ok ? 'OK' : 'ERRO', MENSAGEM: CajuApi_limpar_(mensagem).slice(0, 300), ORIGEM: CajuApi_s_(ctx.origem).slice(0, 40) || 'tela', REF: CajuApi_s_(ctx.ref).slice(0, 80),
      POR_ID: CajuApi_s_(ctx.porId), POR_NOME: CajuApi_s_(ctx.porNome) });
  } catch (e) { try { console.error('Caju, registro da chamada: ' + CajuApi_limpar_((e && e.message) || e)); } catch (x) {} }
}

// ------------------------------------------------------------
// TOKEN (cache de 10 min menos a folga) E A CONTA DA EMPRESA (sponsorId)
// ------------------------------------------------------------
function CajuApi_chaveToken_(c) {
  var t = c.ambiente + '|' + c.clientId + '|' + c.usuario + '|' + c.urlAuth, h = 5381;
  for (var i = 0; i < t.length; i++) h = ((h << 5) + h + t.charCodeAt(i)) | 0;
  return 'CJA_TOKEN_' + c.ambiente + '_' + (h >>> 0).toString(16);
}
function CajuApi_esquecerToken_() {
  CJA_TOKEN_MEMO = null;
  try { var c = CajuApi_cfg_(); CacheService.getScriptCache().remove(CajuApi_chaveToken_(c)); } catch (e) {}
}
/** Lê as claims do JWT (sem conferir assinatura: quem confere é o Caju a cada chamada). */
function CajuApi_claims_(jwt) {
  var partes = CajuApi_s_(jwt).split('.');
  if (partes.length < 2) return {};
  var b = partes[1].replace(/-/g, '+').replace(/_/g, '/');
  while (b.length % 4) b += '=';
  try {
    var bytes = Utilities.base64Decode(b);
    var txt = Utilities.newBlob(bytes).getDataAsString();
    return JSON.parse(txt) || {};
  } catch (e) { return {}; }
}
function CajuApi_token_(c, forcar, ctx) {
  var agora = Date.now(), chave = CajuApi_chaveToken_(c);
  if (!forcar) {
    if (CJA_TOKEN_MEMO && CJA_TOKEN_MEMO.chave === chave && CJA_TOKEN_MEMO.vence - agora > CJA_TOKEN_FOLGA * 1000) return CJA_TOKEN_MEMO;
    try {
      var g = CacheService.getScriptCache().get(chave);
      if (g) { var o = JSON.parse(g); if (o && o.token && o.vence - agora > CJA_TOKEN_FOLGA * 1000) { CJA_TOKEN_MEMO = o; return o; } }
    } catch (e) {}
  }
  var corpo = ['client_id=' + encodeURIComponent(c.clientId), 'client_secret=' + encodeURIComponent(c.clientSecret), 'grant_type=password',
    'username=' + encodeURIComponent(c.usuario), 'password=' + encodeURIComponent(c.senha)].join('&');
  var t0 = Date.now(), resp, http = 0, txt = '';
  try {
    resp = UrlFetchApp.fetch(c.urlAuth + CJA_ROTAS.token, { method: 'post', contentType: 'application/x-www-form-urlencoded', payload: corpo, muteHttpExceptions: true, headers: { Accept: 'application/json' } });
    http = resp.getResponseCode(); txt = String(resp.getContentText() || '');
  } catch (e) {
    CajuApi_registrar_(c, 'POST', '/token', 0, Date.now() - t0, false, 'falha de rede: ' + ((e && e.message) || e), ctx);
    var er = new Error('Não foi possível entrar no Caju: o servidor de acesso não respondeu (rede). Nada foi alterado. O que fazer: tente de novo em alguns minutos; se continuar, confira a internet do servidor e o endereço de acesso (' + c.urlAuth + ').');
    er.cajuHttp = 0; er.cajuRede = true; throw er;
  }
  var j = {}; try { j = JSON.parse(txt); } catch (e) { j = {}; }
  if (http !== 200 || !j.access_token) {
    CajuApi_registrar_(c, 'POST', '/token', http, Date.now() - t0, false, CajuApi_s_(j.error) + ' ' + CajuApi_s_(j.error_description), ctx);
    var cod = CajuApi_s_(j.error).toLowerCase(), m;
    if (cod === 'invalid_client' || http === 401) m = 'o Caju recusou o Client ID ou o Client Secret (' + (c.ambienteNome || c.ambiente) + '). O que fazer: confira as duas chaves do grupo "Caju" em Chaves e senhas (cada ambiente tem as suas) e grave de novo.';
    else if (cod === 'invalid_grant') m = 'o Caju recusou o ID ou a senha da integração (' + (c.ambienteNome || c.ambiente) + '). O que fazer: em produção, gere a credencial de novo no Portal do RH do Caju (Integrações) e grave em Chaves e senhas; em homologação, use a credencial que o Caju mandou no setup.';
    else if (http >= 500) m = 'o servidor de acesso do Caju está com erro (código ' + http + '). Nada foi alterado. Tente de novo em alguns minutos.';
    else m = 'o Caju não entregou o acesso (código ' + http + (cod ? ', ' + CajuApi_limpar_(cod) : '') + '). Confira as credenciais do grupo "Caju" em Chaves e senhas.';
    var e2 = new Error('Não foi possível entrar no Caju: ' + m); e2.cajuHttp = http; e2.cajuCodigo = 'ACESSO'; throw e2;
  }
  var claims = CajuApi_claims_(j.access_token);
  var sponsor = CajuApi_s_(claims.sponsorId || claims.sponsor_id || (claims.sponsor && claims.sponsor.id));
  CajuApi_registrar_(c, 'POST', '/token', http, Date.now() - t0, !!sponsor, sponsor ? 'acesso concedido' : 'token sem sponsorId', ctx);
  if (!sponsor) { var e3 = new Error('Não foi possível usar o acesso do Caju: o token não traz a conta da empresa (sponsorId). O que fazer: peça ao Caju para conferir o cadastro da integração (a claim sponsorId precisa vir no token).'); e3.cajuHttp = http; e3.cajuCodigo = 'SEM_SPONSOR'; throw e3; }
  var vida = Number(j.expires_in) > 0 ? Number(j.expires_in) : CJA_TOKEN_VIDA_PADRAO;
  if (Number(claims.exp) > 0) vida = Math.min(vida, Math.max(0, Number(claims.exp) - Math.floor(agora / 1000)));
  var o2 = { chave: chave, token: j.access_token, sponsorId: sponsor, vence: agora + vida * 1000 };
  CJA_TOKEN_MEMO = o2;
  try { var ttl = Math.max(1, vida - CJA_TOKEN_FOLGA); CacheService.getScriptCache().put(chave, JSON.stringify(o2), ttl); } catch (e) {}
  return o2;
}

// ------------------------------------------------------------
// CHAMADA À API (401 renova o token uma vez; 4xx/5xx viram mensagem clara)
// ------------------------------------------------------------
/**
 * caminho pode ter {sponsorId}; corpo pode ser função (sponsorId) -> objeto. ctx: { origem, ref, porId, porNome, oQue } (oQue
 * entra na mensagem: "criar o pedido de crédito"). Devolve { http, json }. Lança Error com cajuHttp / cajuCodigo / cajuRede.
 */
function CajuApi_chamar_(metodo, caminho, corpo, ctx) {
  ctx = ctx || {};
  var c = CajuApi_cfg_();
  if (!c.completo) throw CajuApi_naoConfigurada_(c);
  var http = 0, txt = '', t0, url, caminhoFinal = '';
  for (var tentativa = 0; tentativa < 2; tentativa++) {
    var tk = CajuApi_token_(c, tentativa > 0, ctx);
    caminhoFinal = String(caminho).replace(/\{sponsorId\}/g, encodeURIComponent(tk.sponsorId));
    url = c.urlApi + caminhoFinal;
    var op = { method: String(metodo).toLowerCase(), muteHttpExceptions: true, headers: { Authorization: 'Bearer ' + tk.token, Accept: 'application/json' } };
    var b = typeof corpo === 'function' ? corpo(tk.sponsorId) : corpo;
    if (b !== undefined && b !== null) { op.contentType = 'application/json'; op.payload = JSON.stringify(b); }
    t0 = Date.now();
    try {
      var resp = UrlFetchApp.fetch(url, op);
      http = resp.getResponseCode(); txt = String(resp.getContentText() || '');
    } catch (e) {
      CajuApi_registrar_(c, metodo, caminhoFinal, 0, Date.now() - t0, false, 'falha de rede: ' + ((e && e.message) || e), ctx);
      var er = new Error('Não foi possível ' + (ctx.oQue || 'falar com o Caju') + ': o Caju não respondeu (rede ou tempo esgotado). ' + (metodo === 'GET' ? 'Nada foi alterado; tente de novo em alguns minutos.' : 'Não dá para saber se o Caju recebeu o pedido: o SGO+ confere antes de repetir.'));
      er.cajuHttp = 0; er.cajuRede = true; throw er;
    }
    if (http === 401 && tentativa === 0) { CajuApi_registrar_(c, metodo, caminhoFinal, http, Date.now() - t0, false, 'token recusado, renovando', ctx); CajuApi_esquecerToken_(); continue; }
    break;
  }
  var j = null; try { j = txt ? JSON.parse(txt) : {}; } catch (e) { j = null; }
  var ok = http >= 200 && http < 300;
  CajuApi_registrar_(c, metodo, caminhoFinal, http, Date.now() - t0, ok, ok ? '' : CajuApi_msgDoCaju_(j, txt), ctx);
  if (ok) return { http: http, json: j || {} };
  throw CajuApi_erro_(http, j, txt, ctx);
}
/** A mensagem que o próprio Caju mandou (limpa). */
function CajuApi_msgDoCaju_(j, txt) {
  var m = '';
  if (j && typeof j === 'object') {
    m = CajuApi_s_(j.message || j.error_description || j.detail || j.title || j.error);
    var lista = j.errors || j.violations || j.fieldErrors;
    if (Array.isArray(lista) && lista.length) m += (m ? ': ' : '') + lista.slice(0, 4).map(function (x) { return typeof x === 'string' ? x : CajuApi_s_((x.field || x.propertyPath || '') + ' ' + (x.message || x.defaultMessage || '')); }).join('; ');
  }
  if (!m) m = CajuApi_s_(txt).slice(0, 200);
  return CajuApi_limpar_(m);
}
function CajuApi_erro_(http, j, txt, ctx) {
  var msg = CajuApi_msgDoCaju_(j, txt), oQue = ctx.oQue || 'concluir no Caju', cod = '', fazer;
  var bruto = (msg + ' ' + CajuApi_s_(txt)).toLowerCase();
  if (/insufficient|saldo insuf|not enough balance|balance/.test(bruto)) cod = 'SALDO_INSUFICIENTE';
  if (cod === 'SALDO_INSUFICIENTE') fazer = 'o saldo da conta da empresa no Caju não cobre o pedido. O que fazer: coloque saldo na conta Caju da empresa e toque em "Tentar de novo com o saldo", ou pague este pedido por PIX (o código aparece aqui).';
  else if (http === 400 || http === 422) fazer = 'o Caju recusou os dados' + (msg ? ' (' + msg + ')' : '') + '. Nada foi alterado. O que fazer: confira o que a mensagem aponta (CPF, nome, celular, valor ou categoria) e tente de novo; se a mensagem não ajudar, guarde o horário e avise o suporte do SGO+.';
  else if (http === 401) fazer = 'o Caju recusou o acesso mesmo depois de renovar. O que fazer: confira as credenciais do grupo "Caju" em Chaves e senhas.';
  else if (http === 403) fazer = 'a integração não tem permissão para isto no Caju' + (msg ? ' (' + msg + ')' : '') + '. O que fazer: peça ao Caju para liberar este recurso na integração da Metrolabs.';
  else if (http === 404) fazer = 'o Caju não encontrou o registro' + (msg ? ' (' + msg + ')' : '') + '. Ele pode ter sido apagado ou cancelado no portal do Caju; confira lá.';
  else if (http === 409) fazer = 'o Caju diz que isto já existe ou mudou de situação' + (msg ? ' (' + msg + ')' : '') + '. Atualize a tela e confira no portal do Caju.';
  else if (http === 429) fazer = 'o Caju pediu para esperar (muitas chamadas seguidas). Tente de novo em um minuto.';
  else if (http >= 500) fazer = 'o Caju está com erro do lado dele (código ' + http + '). Nada foi alterado no SGO+. Tente de novo em alguns minutos.';
  else fazer = 'resposta inesperada do Caju (código ' + http + (msg ? ', ' + msg : '') + '). Tente de novo; se continuar, avise o suporte do SGO+.';
  var e = new Error('Não foi possível ' + oQue + ': ' + fazer);
  e.cajuHttp = http; e.cajuCodigo = cod || ('HTTP_' + http); e.cajuMensagem = msg;
  return e;
}

// ------------------------------------------------------------
// RECURSOS
// ------------------------------------------------------------
/** Testa o acesso: pede o token e lê a conta da empresa. { ok, ambiente, sponsorFinal }. */
function CajuApi_testar_(ctx) {
  var c = CajuApi_cfg_();
  if (!c.completo) throw CajuApi_naoConfigurada_(c);
  CajuApi_esquecerToken_();
  var tk = CajuApi_token_(c, true, ctx);
  return { ok: true, ambiente: c.ambiente, ambienteNome: c.ambienteNome, sponsorFinal: String(tk.sponsorId).slice(-6), validoAte: Utilities.formatDate(new Date(tk.vence), 'America/Sao_Paulo', 'HH:mm:ss') };
}
/** Lista de um retorno: array direto ou { content | data | items | employees | results }. */
function CajuApi_lista_(j) {
  if (Array.isArray(j)) return j;
  if (!j || typeof j !== 'object') return [];
  var k = ['content', 'data', 'items', 'employees', 'results', 'elements'].filter(function (x) { return Array.isArray(j[x]); })[0];
  return k ? j[k] : [];
}
function CajuApi_colaboradorLimpo_(x) {
  x = x || {};
  var st = CajuApi_s_(x.status || x.situation).toUpperCase();
  return { employeeId: CajuApi_s_(x.employeeId || x.id || x.uuid), cpf: CajuApi_s_(x.cpf || x.document || x.documentNumber).replace(/\D/g, ''), nome: CajuApi_s_(x.fullName || x.name || x.socialName),
    nomeSocial: CajuApi_s_(x.socialName), email: CajuApi_s_(x.email).toLowerCase(), celular: CajuApi_s_(x.phoneNumber || x.phone).replace(/\D/g, ''),
    arquivado: x.archived === true || x.isArchived === true || st === 'ARCHIVED' || st === 'INACTIVE' };
}
/** Todos os colaboradores da conta (pagina enquanto vier página cheia; teto de 50 páginas). */
function CajuApi_listarColaboradores_(ctx) {
  var todos = [], vistos = {}, tam = 100;
  for (var pag = 0; pag < 50; pag++) {
    var r = CajuApi_chamar_('GET', CJA_ROTAS.colaboradores + '?sponsorId={sponsorId}&page=' + pag + '&size=' + tam, null, Object.assign({ oQue: 'ler a lista de colaboradores do Caju' }, ctx || {}));
    var l = CajuApi_lista_(r.json).map(CajuApi_colaboradorLimpo_).filter(function (x) { return x.employeeId && !vistos[x.employeeId]; });
    l.forEach(function (x) { vistos[x.employeeId] = true; todos.push(x); });
    var j = r.json || {}, totalPag = Number(j.totalPages || (j.page && j.page.totalPages)) || 0;
    // o Caju pode limitar o tamanho da página abaixo do pedido: com totalPages, vale ele; sem, página incompleta é a última
    if (Array.isArray(r.json) || !l.length || (totalPag ? pag + 1 >= totalPag : l.length < tam)) break;
  }
  return todos;
}
/** Cadastra no Caju. d: { cpf, nome, nomeSocial, email, celular, nascimento (aaaa-mm-dd) }. Devolve o employeeId. */
function CajuApi_criarColaborador_(d, ctx) {
  var r = CajuApi_chamar_('POST', CJA_ROTAS.colaboradores, function (sponsor) {
    var b = { cpf: d.cpf, sponsorId: sponsor, fullName: d.nome };
    if (d.nomeSocial) b.socialName = d.nomeSocial;
    if (d.email) b.email = d.email;
    if (d.celular) b.phoneNumber = d.celular;
    if (d.nascimento) b.birthdate = d.nascimento;
    return b;
  }, Object.assign({ oQue: 'cadastrar o colaborador no Caju' }, ctx || {}));
  var j = r.json || {}, id = CajuApi_s_(j.employeeId || j.id || (j.employee && j.employee.id));
  if (!id) { var e = new Error('O Caju aceitou o cadastro, mas não devolveu o número do colaborador (employeeId). O que fazer: toque em "Atualizar a lista do Caju" e vincule pelo CPF.'); e.cajuHttp = r.http; throw e; }
  return id;
}
function CajuApi_arquivarColaborador_(id, arquivar, ctx) {
  CajuApi_chamar_('POST', (arquivar ? CJA_ROTAS.arquivar : CJA_ROTAS.desarquivar).replace('{id}', encodeURIComponent(id)), {}, Object.assign({ oQue: (arquivar ? 'arquivar' : 'desarquivar') + ' o colaborador no Caju' }, ctx || {}));
  return true;
}
/** Cria o rascunho do pedido de crédito para uma pessoa. Devolve { id, status }. */
function CajuApi_criarPedido_(nome, employeeId, categoria, centavos, ctx) {
  var r = CajuApi_chamar_('POST', CJA_ROTAS.pedidos, function (sponsor) {
    return { sponsorId: sponsor, name: String(nome).slice(0, 27), allowances: [{ employeeId: employeeId, amounts: [{ category: categoria, amount: centavos }] }] };
  }, Object.assign({ oQue: 'criar o pedido de crédito no Caju' }, ctx || {}));
  var j = r.json || {}, id = CajuApi_s_(j.allowanceOrderId || j.id);
  if (!id) { var e = new Error('O Caju respondeu sem o número do pedido de crédito (allowanceOrderId). O que fazer: confira no portal do Caju se o pedido existe e informe o número aqui.'); e.cajuHttp = r.http; e.cajuSemId = true; throw e; }
  return { id: id, status: CajuApi_s_(j.status).toUpperCase() || 'DRAFT' };
}
function CajuApi_centavos_(v) { if (v === null || v === undefined || v === '') return null; var n = Number(typeof v === 'object' && v ? (v.amount !== undefined ? v.amount : v.value) : v); return isFinite(n) ? Math.round(n) : null; }
function CajuApi_pedidoLimpo_(j, id) {
  j = j || {};
  var url = function (x) { if (!x) return ''; if (typeof x === 'string') return /^https:\/\//.test(x) ? x : ''; return CajuApi_s_(x.url || x.link || x.pdfUrl || x.downloadUrl); };
  var pix = j.pixCode;
  return { id: CajuApi_s_(j.allowanceOrderId || j.id || id), status: CajuApi_s_(j.status).toUpperCase(), tipo: CajuApi_s_(j.type).toUpperCase(), nome: CajuApi_s_(j.name),
    total: CajuApi_centavos_(j.total), allowanceTotal: CajuApi_centavos_(j.allowanceTotal), taxa: CajuApi_centavos_(j.serviceFee), pessoas: Number(j.employeeCount) || 0,
    disponivelEm: CajuApi_s_(j.availableFrom).slice(0, 10), venceEm: CajuApi_s_(j.expiresAt).slice(0, 19), criadoEm: CajuApi_s_(j.createdAt).slice(0, 19),
    pix: typeof pix === 'string' ? pix : CajuApi_s_(pix && (pix.code || pix.emv || pix.copyPaste || pix.qrCode)), pixVence: CajuApi_s_(pix && typeof pix === 'object' ? pix.expiresAt || pix.expiration : '').slice(0, 19),
    notaUrl: url(j.invoice), notaNumero: CajuApi_s_(j.invoice && typeof j.invoice === 'object' ? j.invoice.number || j.invoice.id : ''), boletoUrl: url(j.bankSlip),
    boletoLinha: CajuApi_s_(j.bankSlip && typeof j.bankSlip === 'object' ? j.bankSlip.digitableLine || j.bankSlip.barcode : ''), credito: CajuApi_centavos_(j.credit) };
}
function CajuApi_consultarPedido_(id, ctx) {
  var r = CajuApi_chamar_('GET', CJA_ROTAS.pedido.replace('{id}', encodeURIComponent(id)), null, Object.assign({ oQue: 'consultar o pedido de crédito no Caju' }, ctx || {}));
  return CajuApi_pedidoLimpo_(r.json, id);
}
/** Efetiva o pedido. tipo: EXISTING_BALANCE | PIX_CODE | BANK_SLIP; centavos: o total a pagar (com a taxa). */
function CajuApi_efetivarPedido_(id, tipo, centavos, ctx) {
  CajuApi_chamar_('POST', CJA_ROTAS.pedido.replace('{id}', encodeURIComponent(id)), { paymentStrategies: [{ paymentType: tipo, amount: centavos }] },
    Object.assign({ oQue: tipo === 'EXISTING_BALANCE' ? 'pagar o pedido com o saldo da conta Caju' : 'gerar o PIX do pedido' }, ctx || {}));
  return true;
}
function CajuApi_cancelarPedido_(id, ctx) {
  CajuApi_chamar_('POST', CJA_ROTAS.cancelar.replace('{id}', encodeURIComponent(id)), {}, Object.assign({ oQue: 'cancelar o pedido de crédito no Caju' }, ctx || {}));
  return true;
}
