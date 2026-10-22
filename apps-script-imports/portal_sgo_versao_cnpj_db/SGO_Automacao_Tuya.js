/****************************************************
 * SEGURANÇA E AUTOMAÇÃO PREDIAL — CLIENTE DA API DA TUYA (Smart Life) (22/10/2026)
 *
 * Fala com a plataforma Tuya Cloud (OpenAPI), a mesma nuvem do aplicativo Smart Life, em nome do projeto
 * cloud da Metrolabs. Construído sobre o padrão de SGO_Frota_Rastreador.js (chamadas HTTP com limite de
 * frequência, erros traduzidos e nenhum segredo em texto que vai para tela, log ou aviso).
 *
 * CREDENCIAIS (Chaves e senhas > Automação predial (Tuya); nunca no código, nunca na tela):
 *   TUYA_ACCESS_ID      Access ID / Client ID do projeto cloud (platform.tuya.com > Cloud > projeto > Overview)
 *   TUYA_ACCESS_SECRET  Access Secret do mesmo projeto
 *   TUYA_REGIAO         centro de dados do projeto (us, ue, eu, we, in, cn, sg); contas do Brasil costumam ser "us"
 *   TUYA_LIGADO         0 = nenhuma chamada sai do SGO+ (o botão Testar conexão continua funcionando); 1 = ligado
 *   TUYA_ENDPOINT       (sem tela) endereço alternativo só para ensaio local (https:// ou http://localhost)
 *
 * ASSINATURA (documentação "Sign requests", conferida bit a bit contra o exemplo oficial em tests/automacao-predial-tuya.test.cjs):
 *   cabeçalhos: client_id, t (13 dígitos), nonce (UUID), sign_method = HMAC-SHA256, sign, access_token (fora do token),
 *               Signature-Headers (opcional; não usado aqui)
 *   stringToSign = METODO + "\n" + SHA256(corpo) + "\n" + "" (cabeçalhos assinados) + "\n" + caminho[?consulta ordenada por chave]
 *   token:    sign = HMAC-SHA256(client_id + t + nonce + stringToSign, secret), em hexadecimal maiúsculo
 *   negócio:  sign = HMAC-SHA256(client_id + access_token + t + nonce + stringToSign, secret)
 *
 * ENDPOINTS USADOS (todos relativos ao centro de dados):
 *   GET  /v1.0/token?grant_type=1                      token (access_token, refresh_token, expire_time em s, uid)
 *   GET  /v1.0/token/{refresh_token}                   renovação
 *   GET  /v1.0/iot-01/associated-users/devices         dispositivos das contas do app ligadas ao projeto (paginado)
 *   GET  /v1.0/users/{uid}/devices                     alternativa, com o UID da conta do app (TUYA_UID, opcional)
 *   GET  /v1.0/devices/{id}                            detalhe (categoria, produto, online, status)
 *   GET  /v1.0/devices/{id}/functions                  comandos suportados (code, type, values)
 *   GET  /v1.0/devices/{id}/status                     estado atual (lista de code/value)
 *   POST /v1.0/devices/{id}/commands                   {"commands":[{"code":..,"value":..}]}
 *   GET  /v1.0/devices/{id}/door-lock/remote-unlocks   fechadura: métodos de abertura remota disponíveis
 *   POST /v1.0/devices/{id}/door-lock/password-ticket  fechadura: bilhete temporário
 *   POST /v1.0/devices/{id}/door-lock/password-free/open-door  fechadura: destravar sem senha, com o bilhete
 *   GET  /v1.1/devices/{id}/door-lock/open-logs        fechadura: registros de abertura
 *
 * ERROS DA TUYA (código no corpo, HTTP quase sempre 200):
 *   1004 assinatura inválida · 1010 token vencido · 1011/1400 token inválido · 1013 relógio fora de hora ·
 *   1100 parâmetro vazio · 1106 sem permissão (API não autorizada no projeto ou dispositivo não ligado à conta) ·
 *   1109 parâmetro inválido · 2001 dispositivo desligado da internet · 2002 conta sem dispositivos ·
 *   2008 comando não suportado · 2009 dispositivo não suportado · 2010 dispositivo não existe ·
 *   28841001 sem plano · 28841002 plano (trial) vencido · 28841101/28841106 API não assinada ·
 *   28841104 cota esgotada · 28841105 projeto sem autorização para a API
 *
 * LIMITES: no mínimo 300 ms entre chamadas e no máximo 30 por minuto, contando todas as execuções (cache do script).
 * Token em cache de memória do servidor (CacheService), nunca em planilha; renovado 60 s antes de vencer e em 1010/1011/1400.
 ****************************************************/

var TUYA_REGIOES = [
  ['us', 'https://openapi.tuyaus.com', 'América (Oeste) — padrão das contas do Brasil'],
  ['ue', 'https://openapi-ueaz.tuyaus.com', 'América (Leste)'],
  ['eu', 'https://openapi.tuyaeu.com', 'Europa Central'],
  ['we', 'https://openapi-weaz.tuyaeu.com', 'Europa Ocidental'],
  ['in', 'https://openapi.tuyain.com', 'Índia'],
  ['cn', 'https://openapi.tuyacn.com', 'China'],
  ['sg', 'https://openapi-sg.iotbing.com', 'Singapura']
];
var TUYA_REGIAO_PADRAO = 'us';
var TUYA_CACHE_TOKEN = 'TUYA_TOKEN_V1';
var TUYA_CACHE_ULTIMA = 'TUYA_ULTIMA_CHAMADA_MS';
var TUYA_CACHE_MINUTO = 'TUYA_CHAMADAS_MIN_';
var TUYA_ESPACO_MS = 300;
var TUYA_LIMITE_MINUTO = 30;
var TUYA_TOKEN_FOLGA_S = 60;
var TUYA_SHA256_VAZIO = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';

// Categorias da Tuya (código do produto) que o módulo reconhece. Portões e acessos: comando de abertura;
// fechaduras: só pelo fluxo de bilhete das Smart Lock Open APIs, quando o modelo aceita abertura remota.
var TUYA_CATEGORIAS_PORTAO = { ckmkzq: 'Abridor de portão/garagem', cl: 'Motor de portão ou cortina', clkg: 'Interruptor de motor', kg: 'Interruptor', cz: 'Tomada inteligente', pc: 'Régua de tomadas', tdq: 'Disjuntor inteligente', dlq: 'Disjuntor', szjqr: 'Acionador de botão' };
var TUYA_CATEGORIAS_FECHADURA = { ms: 'Fechadura residencial', jtmspro: 'Fechadura residencial Pro', mk: 'Controle de acesso', hotelms: 'Fechadura de hotel', gyms: 'Fechadura comercial', jtmsbh: 'Fechadura (sempre ativa)', videolock: 'Fechadura com câmera', photolock: 'Fechadura com áudio e vídeo', bxx: 'Cofre', ms_category: 'Acessório de fechadura' };

// ------------------------------------------------------------
// CONFIGURAÇÃO E SEGREDOS
// ------------------------------------------------------------
function Tuya_regiao_(cod) {
  cod = String(cod || '').trim().toLowerCase();
  for (var i = 0; i < TUYA_REGIOES.length; i++) if (TUYA_REGIOES[i][0] === cod) return TUYA_REGIOES[i];
  return null;
}

function Tuya_cfg_() {
  var p = PropertiesService.getScriptProperties();
  var g = function (k) { return String(p.getProperty(k) || '').trim(); };
  var reg = Tuya_regiao_(g('TUYA_REGIAO')) || Tuya_regiao_(TUYA_REGIAO_PADRAO);
  var url = reg[1];
  // Ensaio local: endereço alternativo aceito só em https ou no próprio computador (nunca aparece na tela).
  var alt = g('TUYA_ENDPOINT').replace(/\/+$/, '');
  if (alt && (/^https:\/\/[A-Za-z0-9.-]+(:\d+)?$/.test(alt) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(alt))) url = alt;
  return {
    accessId: g('TUYA_ACCESS_ID'), accessSecret: g('TUYA_ACCESS_SECRET'), regiao: reg[0], regiaoNome: reg[2], url: url,
    uid: g('TUYA_UID'), ligado: g('TUYA_LIGADO') === '1', temCredencial: !!(g('TUYA_ACCESS_ID') && g('TUYA_ACCESS_SECRET'))
  };
}

/** Tira o Access ID, o Access Secret e qualquer token de um texto que possa ir para tela, log ou aviso. */
function Tuya_limpar_(msg, c) {
  var s = String(msg === null || msg === undefined ? '' : msg);
  s = s.replace(/(access_token|refresh_token|client_id|sign)["']?\s*[:=]\s*["']?[A-Za-z0-9._-]+/gi, '$1=***');
  if (c) {
    [c.accessId, c.accessSecret].forEach(function (x) { if (x && String(x).length >= 4) s = s.split(String(x)).join('***'); });
  }
  try { var tk = Tuya_tokenGuardado_(); if (tk) [tk.access_token, tk.refresh_token].forEach(function (x) { if (x && String(x).length >= 4) s = s.split(String(x)).join('***'); }); } catch (e) {}
  return s.replace(/\s+/g, ' ').trim().slice(0, 300);
}

/** Erro da Tuya. codigo = código do corpo (ou 0); http = código HTTP; rede = falha temporária (sem resposta, 429, 5xx). */
function Tuya_erro_(texto, codigo, http, rede) {
  var e = new Error(texto);
  e.tuyaCodigo = Number(codigo) || 0;
  e.tuyaHttp = Number(http) || 0;
  e.tuyaRede = !!rede;
  return e;
}

// ------------------------------------------------------------
// ASSINATURA (funções puras, conferidas no teste contra o exemplo oficial)
// ------------------------------------------------------------
function Tuya_hex_(bytes, maiusculo) {
  var h = '';
  for (var i = 0; i < bytes.length; i++) { var v = bytes[i] < 0 ? bytes[i] + 256 : bytes[i]; h += (v < 16 ? '0' : '') + v.toString(16); }
  return maiusculo ? h.toUpperCase() : h;
}
function Tuya_sha256Hex_(texto) {
  if (!texto) return TUYA_SHA256_VAZIO;
  return Tuya_hex_(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(texto), Utilities.Charset.UTF_8), false);
}
function Tuya_hmacHex_(texto, chave) {
  return Tuya_hex_(Utilities.computeHmacSha256Signature(String(texto), String(chave), Utilities.Charset.UTF_8), true);
}

/** Consulta ordenada por chave, como a Tuya exige na assinatura (e a mesma ordem vai no endereço). */
function Tuya_consulta_(query) {
  var chaves = Object.keys(query || {}).filter(function (k) { return query[k] !== undefined && query[k] !== null && query[k] !== ''; }).sort();
  return chaves.map(function (k) { return k + '=' + String(query[k]); }).join('&');
}

/** stringToSign = METODO \n SHA256(corpo) \n cabeçalhos assinados ("chave:valor\n" cada) \n caminho[?consulta]. */
function Tuya_stringToSign_(metodo, corpoTexto, cabecalhosAssinados, caminho, query) {
  var cab = '';
  (cabecalhosAssinados || []).forEach(function (par) { cab += par[0] + ':' + par[1] + '\n'; });
  var consulta = Tuya_consulta_(query);
  return String(metodo || 'GET').toUpperCase() + '\n' + Tuya_sha256Hex_(corpoTexto || '') + '\n' + cab + '\n' + caminho + (consulta ? '?' + consulta : '');
}

/**
 * Assina um pedido. o = { clientId, secret, accessToken (vazio no token), t, nonce, metodo, corpo (texto), caminho, query, cabecalhosAssinados }
 * Devolve { sign, stringToSign, caminhoCompleto }.
 */
function Tuya_assinar_(o) {
  var sts = Tuya_stringToSign_(o.metodo, o.corpo, o.cabecalhosAssinados, o.caminho, o.query);
  var base = String(o.clientId) + String(o.accessToken || '') + String(o.t) + String(o.nonce || '') + sts;
  var consulta = Tuya_consulta_(o.query);
  return { sign: Tuya_hmacHex_(base, o.secret), stringToSign: sts, caminhoCompleto: o.caminho + (consulta ? '?' + consulta : '') };
}

// ------------------------------------------------------------
// LIMITE DE FREQUÊNCIA (todas as execuções, pelo cache do script)
// ------------------------------------------------------------
function Tuya_esperarVez_() {
  var cache = null;
  try { cache = CacheService.getScriptCache(); } catch (e) {}
  var ult = cache ? Number(cache.get(TUYA_CACHE_ULTIMA) || 0) : 0;
  var falta = ult + TUYA_ESPACO_MS - Date.now();
  if (falta > 0) Utilities.sleep(Math.min(falta, TUYA_ESPACO_MS));
  try { if (cache) cache.put(TUYA_CACHE_ULTIMA, String(Date.now()), 60); } catch (e2) {}
}
/** Falso quando o minuto já tem TUYA_LIMITE_MINUTO chamadas (a chamada não sai). */
function Tuya_vez_() {
  try {
    var cache = CacheService.getScriptCache(), k = TUYA_CACHE_MINUTO + Math.floor(Date.now() / 60000);
    var n = Number(cache.get(k) || 0);
    if (n >= TUYA_LIMITE_MINUTO) return false;
    cache.put(k, String(n + 1), 120);
  } catch (e) {}
  return true;
}

// ------------------------------------------------------------
// TOKEN (cache de memória; nunca em planilha)
// ------------------------------------------------------------
function Tuya_tokenGuardado_() {
  try { var j = JSON.parse(CacheService.getScriptCache().get(TUYA_CACHE_TOKEN) || 'null'); return j && j.access_token ? j : null; } catch (e) { return null; }
}
function Tuya_esquecerToken_() {
  try { CacheService.getScriptCache().remove(TUYA_CACHE_TOKEN); } catch (e) {}
}
function Tuya_guardarToken_(r) {
  var exp = Number(r.expire_time) > 0 ? Number(r.expire_time) : 7200;
  var tk = { access_token: String(r.access_token || ''), refresh_token: String(r.refresh_token || ''), uid: String(r.uid || ''), venceEmMs: Date.now() + (exp - TUYA_TOKEN_FOLGA_S) * 1000 };
  try { CacheService.getScriptCache().put(TUYA_CACHE_TOKEN, JSON.stringify(tk), Math.max(60, Math.min(21600, exp - TUYA_TOKEN_FOLGA_S))); } catch (e) {}
  return tk;
}

/** Token válido: o guardado, renovado pelo refresh_token quando vencido, ou um novo. forcar = ignora o guardado. */
function Tuya_token_(c, forcar) {
  if (!c.temCredencial) throw Tuya_erro_('faltam as credenciais da Tuya: o responsável pelo sistema grava o Access ID e o Access Secret em Chaves e senhas > Automação predial (Tuya)', 0, 0, false);
  var tk = forcar ? null : Tuya_tokenGuardado_();
  if (tk && tk.venceEmMs > Date.now()) return tk;
  if (tk && tk.refresh_token) {
    try {
      var rr = Tuya_chamarBruto_(c, 'GET', '/v1.0/token/' + encodeURIComponent(tk.refresh_token), {}, undefined, { semToken: true });
      if (rr.j && rr.j.success && rr.j.result && rr.j.result.access_token) return Tuya_guardarToken_(rr.j.result);
    } catch (e) { /* cai para o token novo */ }
    Tuya_esquecerToken_();
  }
  var r = Tuya_chamarBruto_(c, 'GET', '/v1.0/token', { grant_type: 1 }, undefined, { semToken: true });
  var res = Tuya_exigirOk_(r, c, 'o token de acesso');
  if (!res.result || !res.result.access_token) throw Tuya_erro_('a Tuya respondeu ao pedido de token sem o access_token; confira a região (TUYA_REGIAO) do projeto', 0, r.http, false);
  return Tuya_guardarToken_(res.result);
}

// ------------------------------------------------------------
// HTTP
// ------------------------------------------------------------
/**
 * Uma chamada assinada, sem tratar o código da Tuya. Devolve { http, txt, j }. Sem resposta vira erro com tuyaRede=true.
 * o.semToken = pedido de token (sem access_token na assinatura).
 */
function Tuya_chamarBruto_(c, metodo, caminho, query, corpo, o) {
  o = o || {};
  if (!c.temCredencial) throw Tuya_erro_('faltam as credenciais da Tuya (Chaves e senhas > Automação predial (Tuya))', 0, 0, false);
  if (!/^https:\/\//i.test(c.url) && !/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(c.url)) throw Tuya_erro_('o endereço da Tuya precisa começar com https://', 0, 0, false);
  if (!Tuya_vez_()) throw Tuya_erro_('limite de chamadas à Tuya neste minuto (' + TUYA_LIMITE_MINUTO + '); aguarde um minuto e tente de novo', 0, 0, true);
  metodo = String(metodo || 'GET').toUpperCase();
  var corpoTexto = corpo === undefined || corpo === null ? '' : JSON.stringify(corpo);
  var accessToken = '';
  if (!o.semToken) accessToken = (o.token || Tuya_token_(c)).access_token;
  var t = String(Date.now()), nonce = Utilities.getUuid();
  var ass = Tuya_assinar_({ clientId: c.accessId, secret: c.accessSecret, accessToken: accessToken, t: t, nonce: nonce, metodo: metodo, corpo: corpoTexto, caminho: caminho, query: query || {} });
  var headers = { client_id: c.accessId, sign: ass.sign, sign_method: 'HMAC-SHA256', t: t, nonce: nonce, lang: 'en' };
  if (accessToken) headers.access_token = accessToken;
  var op = { method: metodo.toLowerCase(), muteHttpExceptions: true, followRedirects: false, headers: headers };
  if (corpoTexto) { op.contentType = 'application/json'; op.payload = corpoTexto; }
  Tuya_esperarVez_();
  var r;
  try { r = UrlFetchApp.fetch(c.url + ass.caminhoCompleto, op); }
  catch (e) { throw Tuya_erro_('sem resposta da Tuya (' + Tuya_limpar_(e && e.message, c) + ')', 0, 0, true); }
  var http = r.getResponseCode(), txt = '';
  try { txt = String(r.getContentText() || ''); } catch (e2) {}
  var j = null;
  try { j = JSON.parse(txt); } catch (e3) {}
  return { http: http, txt: txt, j: j };
}

/** Chamada de negócio: assina com o token e, em token vencido ou inválido (1010/1011/1400), renova uma vez e repete. */
function Tuya_chamar_(c, metodo, caminho, query, corpo) {
  var r = Tuya_chamarBruto_(c, metodo, caminho, query, corpo, {});
  var cod = r.j && r.j.code !== undefined ? Number(r.j.code) : 0;
  if (r.j && r.j.success === false && (cod === 1010 || cod === 1011 || cod === 1400)) {
    Tuya_esquecerToken_();
    r = Tuya_chamarBruto_(c, metodo, caminho, query, corpo, { token: Tuya_token_(c, true) });
  }
  return r;
}

/** Texto do erro por código da Tuya: o quê, por quê e o que fazer. */
function Tuya_textoErro_(cod, msg, http, oQue) {
  var m = msg ? ' (' + msg + ')' : '';
  var mapa = {
    1004: 'a Tuya recusou a assinatura do pedido (código 1004)' + m + '; confira o Access Secret gravado em Chaves e senhas > Automação predial (Tuya)',
    1010: 'o token de acesso venceu (código 1010); o SGO+ renova sozinho — tente de novo',
    1011: 'o token de acesso é inválido (código 1011); o SGO+ pede outro — tente de novo',
    1400: 'o token de acesso é inválido (código 1400); o SGO+ pede outro — tente de novo',
    1013: 'o relógio do servidor está fora de hora para a Tuya (código 1013); peça ao responsável pelo servidor para acertar a data e a hora',
    1100: 'faltou um parâmetro obrigatório no pedido à Tuya (código 1100)' + m + '; avise o suporte do SGO+',
    1106: 'a Tuya negou o acesso (código 1106)' + m + ': a API não está autorizada no projeto cloud ou o dispositivo não está na conta do Smart Life ligada ao projeto; no portal da Tuya confira Cloud > projeto > Service API (autorizar) e Devices > Link Tuya App Account',
    1109: 'a Tuya recusou um parâmetro (código 1109)' + m + '; avise o suporte do SGO+',
    2001: 'o dispositivo está desligado da internet (código 2001); confira a energia e a rede sem fio dele',
    2002: 'a conta do Smart Life ligada ao projeto não tem dispositivos (código 2002); no portal da Tuya, Devices > Link Tuya App Account, ligue a conta que tem os portões e a fechadura',
    2008: 'o dispositivo não aceita este comando (código 2008)' + m + '; use "Sincronizar com o Smart Life" para reler os comandos suportados',
    2009: 'dispositivo não suportado pela API (código 2009)' + m,
    2010: 'a Tuya não encontrou o dispositivo (código 2010); ele pode ter sido removido do Smart Life — use "Sincronizar com o Smart Life"',
    28841001: 'o projeto cloud da Tuya não tem plano de desenvolvimento assinado (código 28841001); no portal da Tuya, Cloud > My Services, assine ou renove o IoT Core',
    28841002: 'o plano de desenvolvimento (trial) do projeto cloud da Tuya venceu (código 28841002); no portal da Tuya, Cloud > My Services > IoT Core, peça a extensão do período de teste ou assine o plano',
    28841101: 'a API pedida não está assinada no projeto cloud (código 28841101); no portal da Tuya, Cloud > projeto > Service API, acrescente o serviço (IoT Core, Authorization Token Management, Smart Lock Open Service)',
    28841106: 'a API pedida não está assinada no projeto cloud (código 28841106); no portal da Tuya, Cloud > projeto > Service API, acrescente o serviço',
    28841104: 'a cota de chamadas desta API na Tuya esgotou (código 28841104); aguarde a renovação da cota ou amplie o plano no portal da Tuya',
    28841105: 'o projeto cloud não está autorizado a usar esta API (código 28841105); no portal da Tuya, Cloud > projeto > Service API > Go to Authorize, autorize o serviço'
  };
  if (mapa[cod]) return mapa[cod];
  if (http === 429) return 'a Tuya recusou por excesso de chamadas (HTTP 429); aguarde um minuto e tente de novo';
  if (http >= 500) return 'a plataforma da Tuya respondeu com erro interno (HTTP ' + http + ') em ' + oQue + '; tente de novo em alguns minutos';
  if (http === 401 || http === 403) return 'a Tuya negou o pedido (HTTP ' + http + ')' + m + '; confira as credenciais em Chaves e senhas';
  return 'a Tuya respondeu ' + (cod ? 'o código ' + cod : 'HTTP ' + http) + ' em ' + oQue + m;
}

/** Resposta da Tuya com success=true, ou erro com a mensagem certa (sem segredo). Devolve o corpo (j). */
function Tuya_exigirOk_(r, c, oQue) {
  var j = r.j, h = r.http;
  if (j && j.success === true) return j;
  var cod = j && j.code !== undefined ? Number(j.code) : 0;
  var msg = Tuya_limpar_(j && j.msg ? j.msg : (j ? '' : String(r.txt || '').slice(0, 120)), c);
  var rede = h === 429 || h >= 500 || cod === 28841104;
  throw Tuya_erro_(Tuya_textoErro_(cod, msg, h, oQue), cod, h, rede);
}

// ------------------------------------------------------------
// LEITURAS
// ------------------------------------------------------------
function Tuya_normalizarDispositivo_(d) {
  d = d || {};
  var status = Array.isArray(d.status) ? d.status : [];
  return {
    deviceId: String(d.id || d.device_id || ''), nome: String(d.name || ''), categoria: String(d.category || ''),
    produtoId: String(d.product_id || ''), produtoNome: String(d.product_name || ''), online: d.online === true,
    uid: String(d.uid || ''), ip: String(d.ip || ''), status: status.map(function (s) { return { code: String(s.code), value: s.value }; })
  };
}

/** Dispositivos ligados ao projeto. Primeiro pelas contas do app ligadas; se o SGO+ tiver o UID gravado, pela conta. */
function Tuya_listarDispositivos_(c) {
  var lista = [], erros = [];
  try {
    var ultimo = '', pag = 0;
    do {
      var q = { size: 100 };
      if (ultimo) q.last_row_key = ultimo;
      var r = Tuya_exigirOk_(Tuya_chamar_(c, 'GET', '/v1.0/iot-01/associated-users/devices', q), c, 'a lista de dispositivos');
      var res = r.result || {};
      (Array.isArray(res.devices) ? res.devices : (Array.isArray(res) ? res : [])).forEach(function (d) { lista.push(Tuya_normalizarDispositivo_(d)); });
      ultimo = res.has_more && res.last_row_key ? String(res.last_row_key) : '';
    } while (ultimo && ++pag < 20);
  } catch (e) {
    erros.push(String(e && e.message || e));
    if (e && e.tuyaRede) throw e;
  }
  if (!lista.length && c.uid) {
    var r2 = Tuya_exigirOk_(Tuya_chamar_(c, 'GET', '/v1.0/users/' + encodeURIComponent(c.uid) + '/devices', { page_no: 1, page_size: 100 }), c, 'a lista de dispositivos da conta');
    (Array.isArray(r2.result) ? r2.result : []).forEach(function (d) { lista.push(Tuya_normalizarDispositivo_(d)); });
  } else if (!lista.length && erros.length) {
    throw Tuya_erro_(erros[0], 0, 0, false);
  }
  var vistos = {};
  return lista.filter(function (d) { if (!d.deviceId || vistos[d.deviceId]) return false; vistos[d.deviceId] = true; return true; });
}

function Tuya_dispositivo_(c, deviceId) {
  var r = Tuya_exigirOk_(Tuya_chamar_(c, 'GET', '/v1.0/devices/' + encodeURIComponent(deviceId), {}), c, 'o dispositivo');
  return Tuya_normalizarDispositivo_(r.result);
}

/** Comandos suportados: [{ code, type, values, name }] e a categoria informada pela Tuya. */
function Tuya_funcoes_(c, deviceId) {
  var r = Tuya_exigirOk_(Tuya_chamar_(c, 'GET', '/v1.0/devices/' + encodeURIComponent(deviceId) + '/functions', {}), c, 'os comandos do dispositivo');
  var res = r.result || {};
  return { categoria: String(res.category || ''), funcoes: (Array.isArray(res.functions) ? res.functions : []).map(function (f) { return { code: String(f.code || ''), type: String(f.type || ''), values: String(f.values || ''), name: String(f.name || f.desc || '') }; }) };
}

/** Estado atual: [{ code, value }]. */
function Tuya_estado_(c, deviceId) {
  var r = Tuya_exigirOk_(Tuya_chamar_(c, 'GET', '/v1.0/devices/' + encodeURIComponent(deviceId) + '/status', {}), c, 'o estado do dispositivo');
  return (Array.isArray(r.result) ? r.result : []).map(function (s) { return { code: String(s.code), value: s.value }; });
}

/** POST /commands. Devolve { aceito, http, codigo, msg, tid } sem lançar erro de negócio (o módulo registra tudo). */
function Tuya_enviarComando_(c, deviceId, comandos) {
  var r = Tuya_chamar_(c, 'POST', '/v1.0/devices/' + encodeURIComponent(deviceId) + '/commands', {}, { commands: comandos });
  return Tuya_resultadoComando_(r, c, 'o comando');
}

function Tuya_resultadoComando_(r, c, oQue) {
  var j = r.j || {};
  var cod = j.code !== undefined ? Number(j.code) : 0;
  var aceito = j.success === true && j.result !== false;
  return { aceito: aceito, http: r.http, codigo: aceito ? 0 : cod, tid: String(j.tid || ''), t: j.t || '',
    msg: aceito ? '' : Tuya_textoErro_(cod, Tuya_limpar_(j.msg || (r.j ? '' : String(r.txt || '').slice(0, 120)), c), r.http, oQue),
    resposta: Tuya_limpar_(String(r.txt || '').slice(0, 200), c) };
}

/** Fechadura: métodos de abertura remota que o modelo oferece ([{ remote_unlock_type, open }]) ou [] quando a API recusa. */
function Tuya_fechaduraMetodosRemotos_(c, deviceId) {
  var r = Tuya_chamar_(c, 'GET', '/v1.0/devices/' + encodeURIComponent(deviceId) + '/door-lock/remote-unlocks', {});
  if (!r.j || r.j.success !== true) return { ok: false, metodos: [], motivo: Tuya_resultadoComando_(r, c, 'os métodos de abertura remota').msg };
  var lista = Array.isArray(r.j.result) ? r.j.result : [];
  return { ok: true, metodos: lista.map(function (m) { return { tipo: String(m.remote_unlock_type || ''), ligado: m.open === true }; }) };
}

/** Fechadura: bilhete temporário { ticket_id } para o destravamento sem senha. */
function Tuya_fechaduraTicket_(c, deviceId) {
  var r = Tuya_chamar_(c, 'POST', '/v1.0/devices/' + encodeURIComponent(deviceId) + '/door-lock/password-ticket', {}, {});
  var res = Tuya_resultadoComando_(r, c, 'o bilhete de abertura da fechadura');
  res.ticketId = res.aceito && r.j && r.j.result ? String(r.j.result.ticket_id || '') : '';
  if (res.aceito && !res.ticketId) { res.aceito = false; res.msg = 'a Tuya respondeu ao bilhete de abertura sem o ticket_id'; }
  return res;
}

/** Fechadura: destravar sem senha com o bilhete. */
function Tuya_fechaduraAbrir_(c, deviceId, ticketId) {
  var r = Tuya_chamar_(c, 'POST', '/v1.0/devices/' + encodeURIComponent(deviceId) + '/door-lock/password-free/open-door', {}, { ticket_id: String(ticketId) });
  return Tuya_resultadoComando_(r, c, 'o destravamento');
}

/** Fechadura: registros de abertura do período (v1.1). [] quando a API recusa. */
function Tuya_fechaduraRegistros_(c, deviceId, deMs, ateMs) {
  try {
    var r = Tuya_chamar_(c, 'GET', '/v1.1/devices/' + encodeURIComponent(deviceId) + '/door-lock/open-logs', { page_no: 1, page_size: 20, start_time: deMs, end_time: ateMs });
    if (!r.j || r.j.success !== true) return [];
    var res = r.j.result || {};
    return Array.isArray(res.records) ? res.records : (Array.isArray(res.logs) ? res.logs : []);
  } catch (e) { return []; }
}

// ------------------------------------------------------------
// MATRIZ DE COMPATIBILIDADE (função pura: categoria + comandos suportados -> o que o SGO+ consegue fazer)
// ------------------------------------------------------------
/**
 * Devolve { tipo: 'PORTAO'|'FECHADURA'|'OUTRO', ok, motivo, comandoAbrir: {code,value}|null, estadoCodigos: [...], remotoFechadura: 'BILHETE'|'NAO'|'' }.
 * Não presume que todos os dispositivos aceitam os mesmos comandos: só o que a lista de funções confirma.
 */
function Tuya_compatibilidade_(categoria, funcoes, metodosRemotos) {
  categoria = String(categoria || '').toLowerCase();
  var codes = {};
  (funcoes || []).forEach(function (f) { if (f && f.code) codes[String(f.code)] = f; });
  var tem = function (c) { return Object.prototype.hasOwnProperty.call(codes, c); };
  var out = { tipo: 'OUTRO', ok: false, motivo: '', comandoAbrir: null, estadoCodigos: [], remotoFechadura: '' };
  if (TUYA_CATEGORIAS_FECHADURA[categoria]) {
    out.tipo = 'FECHADURA';
    out.estadoCodigos = ['lock_motor_state', 'closed_opened', 'unlock_remote', 'remote_no_dp_key', 'alarm_lock', 'residual_electricity', 'battery_state'].filter(tem);
    var remoto = tem('remote_no_dp_key') || tem('remote_no_dp_setkey') || tem('unlock_remote') || tem('open_close');
    var metodo = (metodosRemotos || []).filter(function (m) { return m && m.ligado; });
    if (metodo.length || remoto) {
      out.ok = true; out.remotoFechadura = 'BILHETE';
      out.motivo = 'Destravamento remoto pelo bilhete temporário da API (Smart Lock Open API); o SGO+ só confirma a abertura pelo registro da própria fechadura.';
    } else {
      out.remotoFechadura = 'NAO';
      out.motivo = 'Não disponível pela API: este modelo de fechadura não oferece abertura remota pela nuvem (sem os pontos remote_no_dp_key/remote_no_dp_setkey/unlock_remote e sem método de abertura remota ligado). A abertura continua só pelo aplicativo Smart Life ou na própria porta; o SGO+ mostra o estado e os registros quando a API os fornece.';
    }
    return out;
  }
  if (TUYA_CATEGORIAS_PORTAO[categoria] || tem('switch_1') || tem('switch') || tem('control')) {
    out.tipo = 'PORTAO';
    out.estadoCodigos = ['switch_1', 'switch', 'control', 'doorcontact_state', 'percent_control', 'work_state', 'countdown_1'].filter(tem);
    if (tem('control')) { out.comandoAbrir = { code: 'control', value: 'open' }; out.ok = true; out.motivo = 'Comando "control: open" (abrir/fechar/parar).'; }
    else if (tem('switch_1')) { out.comandoAbrir = { code: 'switch_1', value: true }; out.ok = true; out.motivo = 'Comando "switch_1: true" (pulso de abertura; o próprio acionador desliga).'; }
    else if (tem('switch')) { out.comandoAbrir = { code: 'switch', value: true }; out.ok = true; out.motivo = 'Comando "switch: true" (pulso de abertura).'; }
    else { out.motivo = 'Não disponível pela API: o dispositivo não informa um comando de abertura (switch_1, switch ou control). Use "Sincronizar com o Smart Life" depois de conferir o dispositivo no aplicativo.'; }
    return out;
  }
  out.motivo = 'Categoria "' + (categoria || 'desconhecida') + '" sem regra no SGO+: o dispositivo é listado só para consulta.';
  return out;
}

// ------------------------------------------------------------
// TESTE DE CONEXÃO (Chaves e senhas): token e contagem de dispositivos; nenhum comando
// ------------------------------------------------------------
function Tuya_testarConexao_() {
  var c = Tuya_cfg_();
  var falta = [];
  if (!c.accessId) falta.push('TUYA_ACCESS_ID');
  if (!c.accessSecret) falta.push('TUYA_ACCESS_SECRET');
  if (falta.length) return { funcionou: false, texto: 'Não funcionou: falta gravar ' + falta.join(' e ') + ' — copie do portal da Tuya (Cloud > projeto > Overview) e grave acima.', dispositivos: [] };
  try {
    Tuya_esquecerToken_();
    var tk = Tuya_token_(c, true);
    var lista = [];
    try { lista = Tuya_listarDispositivos_(c); }
    catch (e2) {
      return { funcionou: true, texto: 'Funcionou em parte: a Tuya aceitou o Access ID e o Access Secret (região ' + c.regiaoNome + '), mas a lista de dispositivos não veio: ' + Tuya_limpar_(e2 && e2.message, c) + '.', dispositivos: [] };
    }
    var resumo = lista.map(function (d) { return { id: d.deviceId, nome: d.nome || 'sem nome', situacao: d.online ? 'online' : 'offline', categoria: d.categoria }; });
    return { funcionou: true, texto: 'Funcionou: a Tuya aceitou as credenciais (região ' + c.regiaoNome + (tk.uid ? ', conta ' + tk.uid.slice(0, 4) + '…' : '') + ') e informou ' + lista.length + ' dispositivo(s). Nenhum comando foi enviado.' + (c.ligado ? '' : ' A integração continua Desligada até "Automação predial ligada" = Ligado.'), dispositivos: resumo };
  } catch (e) {
    return { funcionou: false, texto: 'Não funcionou: ' + Tuya_limpar_(e && e.message, c) + '.', dispositivos: [] };
  }
}
