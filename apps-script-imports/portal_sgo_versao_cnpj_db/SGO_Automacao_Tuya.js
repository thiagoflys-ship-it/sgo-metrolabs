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
 *   TUYA_REGIAO         centro de dados do projeto (us, ue, eu, we, in, cn, sg); Brasil: "us" (Western America) ou "ue" (Eastern America, contas mais novas: mudança da Tuya de 25/11/2025)
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
 * LIMITES: no mínimo 300 ms entre chamadas e no máximo TUYA_LIMITE_MINUTO (90) por minuto, contando todas as execuções (cache do script).
 * Token em cache de memória do servidor (CacheService), nunca em planilha; renovado 60 s antes de vencer e em 1010/1011/1400.
 *
 * CONSUMO DA COTA (27/10/2026, depois de a cota do plano de teste acabar às 07:45 com o código 28841004): toda chamada que
 * sai é contada por dia e por mês, com a origem (TUYA_PROP_USO, propriedade do script; nada de segredo). A origem da chamada
 * em curso vem de Tuya_comOrigem_(origem, fn): COMANDO (pedido por pessoa), MANUAL ("Ler estado", "Verificar campainha"),
 * TELA (releitura automática das telas), AUTOMATICA (consultas das rotinas), EVENTO (abertura automática disparada por
 * evento da Tuya), SENTINELA, SINCRONIZAR e TOKEN. Cota esgotada ou plano vencido (28841004, 28841104, 28841002, 28841001)
 * marca o bloqueio: enquanto ele vale, e no modo econômico (AUT_ECONOMICO), as origens TELA e AUTOMATICA não chamam a nuvem.
 *
 * RECUPERAÇÃO DEPOIS DO BLOQUEIO (27/10/2026, decisão do dono: "nunca voltar de uma vez"). Tuya_portao_ decide antes de cada
 * chamada sair (a chamada recusada aqui não sai, não gasta cota e não é repetida):
 *   BLOQUEIO       nenhuma chamada automática (TELA, AUTOMATICA, EVENTO, OUTRA). Só a SONDA verifica a volta, com UMA chamada:
 *                  a da sentinela no horário marcado (recuo de 15 min, 30 min, 1 h e depois de hora em hora; a sentinela só
 *                  sonda no expediente) ou um pedido de pessoa (COMANDO, MANUAL, SINCRONIZAR) no máximo a cada 10 min. A sonda
 *                  libera as chamadas da mesma operação por 30 s, até a primeira recusa. Sonda recusada com código de bloqueio:
 *                  o recuo dobra (teto de 1 h). Token que responde não conta como volta (a cota é da API de negócio).
 *   RECUPERACAO_1  primeiros 30 min depois da volta: só pessoas, eventos e sentinela; leituras automáticas continuam paradas.
 *   RECUPERACAO_2  30 a 60 min: leituras automáticas voltam com teto de 20 chamadas por minuto (no total).
 *   NORMAL         teto de 90 por minuto.
 * Disjuntor: código de bloqueio de novo na recuperação, ou até 24 h depois da volta, rebloqueia na hora e o primeiro recuo
 * dobra (15 -> 30 -> 60 min). Toda chamada que sai é contada, inclusive as recusadas pela Tuya (ela pode cobrá-las).
 ****************************************************/

var TUYA_REGIOES = [
  ['us', 'https://openapi.tuyaus.com', 'Western America (América Oeste)'],
  ['ue', 'https://openapi-ueaz.tuyaus.com', 'Eastern America (América Leste)'],
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
var TUYA_LIMITE_MINUTO = 90;              // 23/10/2026: campainha (3 s, compartilhada) + abertura automática + estado dos portões na tela (5 s)
var TUYA_TOKEN_FOLGA_S = 60;
var TUYA_SHA256_VAZIO = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
var TUYA_PROP_USO = 'TUYA_USO_V1';
var TUYA_PROP_ECONOMICO = 'AUT_ECONOMICO';
// Códigos que querem dizer "a nuvem não atende este projeto agora" (não é falha do dispositivo nem passageira)
var TUYA_CODIGOS_BLOQUEIO = { 28841004: 'COTA', 28841104: 'COTA', 28841002: 'PLANO', 28841001: 'PLANO' };
var TUYA_CODIGOS_CREDENCIAL = { 1004: 1, 1106: 1, 28841101: 1, 28841105: 1, 28841106: 1 };
var TUYA_ORIGENS_PAUSAVEIS = { TELA: 1, AUTOMATICA: 1 };
var Tuya_origemAtual_ = '';
// 27/10/2026 (dono): recuperação depois do bloqueio (cota esgotada ou plano vencido)
var TUYA_RECUOS_MS = [900000, 1800000, 3600000];   // sonda da sentinela: 15 min, 30 min, 1 h; depois de hora em hora
var TUYA_RECUO_MAX_MS = 3600000;
var TUYA_RECUPERACAO_MS = 3600000;                 // 60 min de recuperação depois da volta
var TUYA_RECUPERACAO_FASE1_MS = 1800000;           // primeiros 30 min: só pessoas, eventos e sentinela
var TUYA_DISJUNTOR_MS = 86400000;                  // bloqueio de novo até 24 h depois da volta: o primeiro recuo dobra
var TUYA_SONDA_PESSOA_MS = 600000;                 // bloqueado: um pedido de pessoa a cada 10 min serve de sonda
var TUYA_SONDA_VALE_MS = 30000;                    // a sonda vale para as chamadas da mesma operação por 30 s, até a primeira recusa
var TUYA_LIMITE_MINUTO_RECUPERACAO = 20;
var TUYA_ORIGENS_PESSOA = { COMANDO: 1, MANUAL: 1, SINCRONIZAR: 1 };

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
/** Falso quando o minuto já tem o teto de chamadas (TUYA_LIMITE_MINUTO; 20 na recuperação): a chamada não sai. */
function Tuya_vez_(limite) {
  limite = Number(limite) || TUYA_LIMITE_MINUTO;
  try {
    var cache = CacheService.getScriptCache(), k = TUYA_CACHE_MINUTO + Math.floor(Date.now() / 60000);
    var n = Number(cache.get(k) || 0);
    if (n >= limite) return false;
    cache.put(k, String(n + 1), 120);
  } catch (e) {}
  return true;
}
/** Chamadas já feitas neste minuto (para leituras de tela que cedem a vez aos comandos). */
function Tuya_chamadasNoMinuto_() {
  try { return Number(CacheService.getScriptCache().get(TUYA_CACHE_MINUTO + Math.floor(Date.now() / 60000)) || 0); } catch (e) { return 0; }
}

// ------------------------------------------------------------
// CONSUMO DA COTA (27/10/2026): contador por dia e por mês, último erro, bloqueio e pausa das leituras automáticas
// ------------------------------------------------------------
/** Roda fn com a origem marcada (conta no consumo e decide se a chamada pode ser pausada). */
function Tuya_comOrigem_(origem, fn) {
  var antes = Tuya_origemAtual_;
  Tuya_origemAtual_ = String(origem || '');
  try { return fn(); } finally { Tuya_origemAtual_ = antes; }
}
function Tuya_diaDe_(ms) { return Utilities.formatDate(new Date(ms || Date.now()), 'America/Sao_Paulo', 'yyyy-MM-dd'); }

/** Tipo da falha pela resposta: COTA | PLANO | CREDENCIAL | TOKEN | REDE | DISPOSITIVO | '' (função pura). */
function Tuya_tipoFalha_(codigo, http, rede) {
  codigo = Number(codigo) || 0; http = Number(http) || 0;
  if (TUYA_CODIGOS_BLOQUEIO[codigo]) return TUYA_CODIGOS_BLOQUEIO[codigo];
  if (TUYA_CODIGOS_CREDENCIAL[codigo] || http === 401 || http === 403) return 'CREDENCIAL';
  if (codigo === 1010 || codigo === 1011 || codigo === 1400) return 'TOKEN';
  if (rede || http === 429 || http >= 500) return 'REDE';
  if (codigo === 2001 || codigo === 2008 || codigo === 2009 || codigo === 2010) return 'DISPOSITIVO';
  return codigo ? 'OUTRO' : '';
}
/** A falha é da nuvem inteira (nenhum portão funciona pelo SGO+), não de um dispositivo. */
function Tuya_falhaDaNuvem_(tipo) { return tipo === 'COTA' || tipo === 'PLANO' || tipo === 'CREDENCIAL' || tipo === 'REDE'; }

/** Consumo guardado, já virado para o dia e o mês de agora (função pura sobre o texto da propriedade). */
function Tuya_usoNormalizar_(u, agoraMs) {
  u = u && typeof u === 'object' ? u : {};
  var dia = Tuya_diaDe_(agoraMs), mes = dia.slice(0, 7);
  var out = { dia: dia, diaTotal: 0, diaPor: {}, mes: mes, mesTotal: 0, mesPor: {}, ontemTotal: 0, porDia: {},
    ultimoOkEm: Number(u.ultimoOkEm) || 0, ultimoErro: u.ultimoErro || null, bloqueio: u.bloqueio || null,
    // 27/10/2026: recuperação depois do bloqueio, disjuntor e consumo do pacote único (período com início e fim)
    recuperacao: u.recuperacao || null, voltouEm: Number(u.voltouEm) || 0, recuoInicialMs: Number(u.recuoInicialMs) || 0, periodo: u.periodo || null };
  Object.keys(u.porDia || {}).forEach(function (k) { if (k.slice(0, 7) === mes || k >= Tuya_diaDe_((agoraMs || Date.now()) - 35 * 86400000)) out.porDia[k] = Number(u.porDia[k]) || 0; });
  if (u.dia === dia) { out.diaTotal = Number(u.diaTotal) || 0; out.diaPor = u.diaPor || {}; out.ontemTotal = Number(u.ontemTotal) || 0; }
  else if (u.dia === Tuya_diaDe_((agoraMs || Date.now()) - 86400000)) out.ontemTotal = Number(u.diaTotal) || 0;
  if (u.mes === mes) { out.mesTotal = Number(u.mesTotal) || 0; out.mesPor = u.mesPor || {}; }
  return out;
}
function Tuya_uso_() {
  var t = null;
  try { t = PropertiesService.getScriptProperties().getProperty(TUYA_PROP_USO); } catch (e) {}
  var u = null;
  try { u = JSON.parse(t || 'null'); } catch (e2) { u = null; }
  return Tuya_usoNormalizar_(u, Date.now());
}
function Tuya_usoGravar_(u) { try { PropertiesService.getScriptProperties().setProperty(TUYA_PROP_USO, JSON.stringify(u)); } catch (e) {} }

/**
 * Conta uma chamada que saiu (inclusive a recusada pela Tuya: ela pode cobrá-la). r = { ok, codigo, http, rede, texto }.
 * 27/10/2026: o token que responde não tira o bloqueio nem conta como "nuvem respondendo" (a cota é da API de negócio).
 * Nunca lança erro.
 */
function Tuya_usoRegistrar_(origem, r) {
  try {
    var u = Tuya_uso_(), o = String(origem || 'OUTRA');
    u.diaTotal++; u.mesTotal++;
    u.diaPor[o] = (Number(u.diaPor[o]) || 0) + 1; u.mesPor[o] = (Number(u.mesPor[o]) || 0) + 1;
    u.porDia[u.dia] = u.diaTotal;
    if (u.periodo && u.dia >= String(u.periodo.inicio || '') && u.dia <= String(u.periodo.fim || '')) u.periodo.total = (Number(u.periodo.total) || 0) + 1;
    var agora = Date.now();
    if (r && r.ok) { if (o !== 'TOKEN') { u.ultimoOkEm = agora; Tuya_aoVoltar_(u, agora); } }
    else if (r) {
      var tipo = Tuya_tipoFalha_(r.codigo, r.http, r.rede);
      u.ultimoErro = { codigo: Number(r.codigo) || 0, http: Number(r.http) || 0, tipo: tipo, texto: String(r.texto || '').slice(0, 300), em: agora, origem: o };
      if (TUYA_CODIGOS_BLOQUEIO[Number(r.codigo) || 0]) Tuya_aoBloquear_(u, tipo, Number(r.codigo), String(r.texto || '').slice(0, 300), agora);
    }
    Tuya_usoGravar_(u);
  } catch (e) {}
}

/** Próximo recuo da sonda: 15 min -> 30 min -> 1 h -> 1 h (função pura). */
function Tuya_proximoRecuo_(ms) { return Math.min(TUYA_RECUO_MAX_MS, Math.max(TUYA_RECUOS_MS[0], (Number(ms) || TUYA_RECUOS_MS[0]) * 2)); }

/**
 * Código de bloqueio recebido (função pura sobre o consumo u). Sem bloqueio: marca agora, com o primeiro recuo (15 min; o
 * dobro do anterior quando é rebloqueio na recuperação ou até 24 h depois da volta = disjuntor). Já bloqueado: a sonda em
 * curso falhou, o recuo dobra e a próxima conferência fica marcada.
 */
function Tuya_aoBloquear_(u, tipo, codigo, texto, agora) {
  var b = u.bloqueio;
  if (b) {
    b.tipo = tipo; b.codigo = codigo; b.texto = texto; b.ultimaFalhaEm = agora;
    if (b.sondaEm && !(Number(b.sondaFalhouEm) >= Number(b.sondaEm))) {
      b.sondaFalhouEm = agora; b.sondas = (Number(b.sondas) || 0) + 1;
      b.recuoMs = Tuya_proximoRecuo_(b.recuoMs);
      b.proximaSondaEm = agora + b.recuoMs;
    }
    return u;
  }
  var rebloqueio = !!(u.recuperacao && agora < Number(u.recuperacao.ate)) || !!(u.voltouEm && agora - u.voltouEm < TUYA_DISJUNTOR_MS);
  var inicial = rebloqueio ? Tuya_proximoRecuo_(u.recuoInicialMs || TUYA_RECUOS_MS[0]) : TUYA_RECUOS_MS[0];
  u.recuoInicialMs = inicial;
  u.recuperacao = null;
  u.bloqueio = { tipo: tipo, codigo: codigo, desde: agora, texto: texto, ultimaFalhaEm: agora, recuoMs: inicial, proximaSondaEm: agora + inicial, sondas: 0, rebloqueio: rebloqueio };
  return u;
}

/** Resposta com sucesso de uma chamada de negócio: com bloqueio, começa a recuperação (60 min) em vez de voltar de uma vez. */
function Tuya_aoVoltar_(u, agora) {
  if (!u.bloqueio) return u;
  u.recuperacao = { desde: agora, ate: agora + TUYA_RECUPERACAO_MS, bloqueioDesde: Number(u.bloqueio.desde) || 0, tipo: u.bloqueio.tipo, codigo: u.bloqueio.codigo, sondas: Number(u.bloqueio.sondas) || 0 };
  u.voltouEm = agora;
  u.bloqueio = null;
  return u;
}

/** Fase da nuvem: NORMAL | BLOQUEIO | RECUPERACAO_1 | RECUPERACAO_2 (função pura sobre o consumo). */
function Tuya_fase_(u, agoraMs) {
  agoraMs = agoraMs || Date.now();
  if (u && u.bloqueio) return 'BLOQUEIO';
  var r = u && u.recuperacao;
  if (r && agoraMs < Number(r.ate)) return agoraMs - Number(r.desde) < TUYA_RECUPERACAO_FASE1_MS ? 'RECUPERACAO_1' : 'RECUPERACAO_2';
  return 'NORMAL';
}
/** Teto de chamadas por minuto na fase (90 normal; 20 na recuperação e na sonda). */
function Tuya_limiteMinuto_(fase) { return fase === 'NORMAL' ? TUYA_LIMITE_MINUTO : TUYA_LIMITE_MINUTO_RECUPERACAO; }

/**
 * Modo econômico vigente (AUT_ECONOMICO, só no período do orçamento em que foi ligado: o mês, ou o pacote único). 27/10/2026
 * (dono): é só emergência perto de esgotar (90% do orçamento); orçamento não confirmado NÃO liga o modo econômico.
 */
function Tuya_economico_() {
  var chave = Tuya_diaDe_().slice(0, 7);
  try { if (typeof AutPred_orcamentoAgora_ === 'function') chave = AutPred_orcamentoAgora_().chave || chave; } catch (eO) {}
  try {
    var e = JSON.parse(PropertiesService.getScriptProperties().getProperty(TUYA_PROP_ECONOMICO) || 'null');
    return e && e.mes === chave ? e : null;
  } catch (x) { return null; }
}

function Tuya_hora_(ms) { try { return Utilities.formatDate(new Date(ms), 'America/Sao_Paulo', 'HH:mm'); } catch (e) { return ''; } }

/**
 * Esta origem pode chamar a nuvem agora? '' = pode; senão o motivo (frase para a tela). consumir = toma a vez da sonda
 * (só em Tuya_chamarBruto_). Regras no cabeçalho (BLOQUEIO, RECUPERACAO_1, RECUPERACAO_2, modo econômico).
 */
function Tuya_portao_(origem, consumir, agoraMs) {
  origem = String(origem || ''); agoraMs = agoraMs || Date.now();
  var u = Tuya_uso_(), fase = Tuya_fase_(u, agoraMs), pessoa = !!TUYA_ORIGENS_PESSOA[origem];
  if (fase === 'BLOQUEIO') {
    var b = u.bloqueio;
    var nome = b.tipo === 'PLANO' ? 'o plano do projeto na Tuya está vencido' : 'a cota de chamadas da Tuya acabou';
    var sondaViva = Number(b.sondaEm) && agoraMs - Number(b.sondaEm) < TUYA_SONDA_VALE_MS && !(Number(b.ultimaFalhaEm) >= Number(b.sondaEm));
    if (sondaViva && (pessoa || origem === 'SENTINELA')) return '';
    var devida = origem === 'SENTINELA' ? agoraMs >= Number(b.proximaSondaEm || 0) : (pessoa ? agoraMs - Number(b.ultimaSondaPessoaEm || 0) >= TUYA_SONDA_PESSOA_MS : false);
    if (devida) {
      if (consumir) {
        b.sondaEm = agoraMs; b.sondaOrigem = origem;
        if (pessoa) b.ultimaSondaPessoaEm = agoraMs; else b.proximaSondaEm = agoraMs + (Number(b.recuoMs) || TUYA_RECUOS_MS[0]);
        Tuya_usoGravar_(u);
      }
      return '';
    }
    return nome + '; nada é enviado até a nuvem voltar (próxima conferência automática às ' + Tuya_hora_(Number(b.proximaSondaEm) || agoraMs) + ')';
  }
  if (!TUYA_ORIGENS_PAUSAVEIS[origem]) return '';
  if (fase === 'RECUPERACAO_1') return 'a nuvem da Tuya voltou há pouco e o SGO+ retoma aos poucos (leituras automáticas a partir das ' + Tuya_hora_(Number(u.recuperacao.desde) + TUYA_RECUPERACAO_FASE1_MS) + ')';
  if (Tuya_economico_()) return 'o modo econômico está ligado (consumo da cota perto do limite)';
  return '';
}

/** Motivo para não chamar a nuvem nesta origem ('' = pode), sem tomar a vez da sonda. */
function Tuya_motivoPausa_(origem) { return Tuya_portao_(origem, false); }

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
  // 27/10/2026: bloqueio, recuperação e modo econômico decidem antes de a chamada sair (a recusada aqui não sai nem gasta cota)
  var pausa = Tuya_portao_(Tuya_origemAtual_, true);
  if (pausa) {
    var uP = Tuya_uso_(), ep;
    if (uP.bloqueio) { ep = Tuya_erro_(pausa, uP.bloqueio.codigo, 0, false); ep.tuyaBloqueioLocal = true; }
    else ep = Tuya_erro_('leitura automática pausada: ' + pausa, 0, 0, false);
    ep.tuyaPausa = true;
    throw ep;
  }
  var limiteMin = Tuya_limiteMinuto_(Tuya_fase_(Tuya_uso_()));
  if (!Tuya_vez_(limiteMin)) throw Tuya_erro_('limite de chamadas à Tuya neste minuto (' + limiteMin + '); aguarde um minuto e tente de novo', 0, 0, true);
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
  var r, origemUso = o.semToken ? 'TOKEN' : (Tuya_origemAtual_ || 'OUTRA');
  try { r = UrlFetchApp.fetch(c.url + ass.caminhoCompleto, op); }
  catch (e) {
    var textoRede = 'sem resposta da Tuya (' + Tuya_limpar_(e && e.message, c) + ')';
    Tuya_usoRegistrar_(origemUso, { ok: false, codigo: 0, http: 0, rede: true, texto: textoRede });
    throw Tuya_erro_(textoRede, 0, 0, true);
  }
  var http = r.getResponseCode(), txt = '';
  try { txt = String(r.getContentText() || ''); } catch (e2) {}
  var j = null;
  try { j = JSON.parse(txt); } catch (e3) {}
  var okUso = !!(j && j.success === true), codUso = j && j.code !== undefined ? Number(j.code) : 0;
  Tuya_usoRegistrar_(origemUso, { ok: okUso, codigo: codUso, http: http, rede: http === 429 || http >= 500,
    texto: okUso ? '' : Tuya_limpar_(j && j.msg ? j.msg : String(txt || '').slice(0, 120), c) });
  return { http: http, txt: txt, j: j };
}

/** Chamada de negócio: assina com o token e, em token vencido ou inválido (1010/1011/1400), renova uma vez e repete.
 *  27/10/2026: portão atendido pela ponte local (Tuya_local_) não chega à nuvem: nem cota, nem bloqueio, nem token. */
function Tuya_chamar_(c, metodo, caminho, query, corpo) {
  var local = Tuya_local_(metodo, caminho, query, corpo);
  if (local) return local;
  var r = Tuya_chamarBruto_(c, metodo, caminho, query, corpo, {});
  var cod = r.j && r.j.code !== undefined ? Number(r.j.code) : 0;
  if (r.j && r.j.success === false && (cod === 1010 || cod === 1011 || cod === 1400)) {
    Tuya_esquecerToken_();
    r = Tuya_chamarBruto_(c, metodo, caminho, query, corpo, { token: Tuya_token_(c, true) });
  }
  return r;
}

// ------------------------------------------------------------
// PONTE LOCAL DOS PORTÕES (27/10/2026: cota da Tuya esgotada; dono: "voltar a funcionar sem depender da nuvem")
//
// Um celular Android na rede da empresa (agente portoes_local/ponte) fala com os módulos dos portões pelo protocolo LOCAL
// da Tuya (3.5, cifrado com a chave local de cada módulo) e com o servidor do SGO+ por HTTPS de saída, assinado (HMAC).
// Nenhuma porta aberta no roteador; os módulos nunca ficam expostos à internet. O Smart Life continua funcionando.
//
// O servidor (src/servicos/portoesLocais.ts) grava PORTOES_LOCAL_ESTADO { vivoEm, dispositivos: { <devId>: { online } } }
// e os pontos de cada portão em TUYA_EVT_<devId> (o mesmo formato dos eventos da nuvem, então tela, confirmação pelo sensor
// e rotina usam o que chegou, sem chamada). Os comandos passam por SGO_PORTOES_LOCAIS (global só no servidor próprio).
//
// Regra: dispositivo com a ponte viva e online por ela é atendido SÓ pela ponte. Comando nunca cai para a nuvem (evita
// pulso em dobro); sem a ponte, tudo volta a ser exatamente como antes (nuvem, cota e bloqueio). Funções da nuvem que a
// ponte não faz (lista de dispositivos, functions, fechadura) continuam pela nuvem.
// ------------------------------------------------------------
var TUYA_LOCAL_ESTADO = 'PORTOES_LOCAL_ESTADO';
var TUYA_LOCAL_VIVO_MS = 90000;            // a ponte informa a cada 20 s; 90 s sem notícia = não atende
var TUYA_LOCAL_RECUSA = 90001;             // código próprio: recusa vinda da ponte local (o texto é o da ponte, não o de um código da Tuya)

function Tuya_localEstado_() {
  try { return JSON.parse(PropertiesService.getScriptProperties().getProperty(TUYA_LOCAL_ESTADO) || 'null'); } catch (e) { return null; }
}

/** A ponte local atende este dispositivo agora? (servidor próprio, ponte viva e dispositivo online por ela) */
function Tuya_localAtende_(deviceId) {
  if (typeof SGO_PORTOES_LOCAIS === 'undefined' || !deviceId) return false;
  var e = Tuya_localEstado_();
  if (!e || Date.now() - Number(e.vivoEm || 0) > TUYA_LOCAL_VIVO_MS) return false;
  var d = e.dispositivos && e.dispositivos[String(deviceId)];
  return !!(d && d.online === true);
}

/** Resposta no formato de Tuya_chamarBruto_ ({ http, txt, j }). */
function Tuya_localResposta_(j) { return { http: 200, txt: JSON.stringify(j), j: j }; }

/**
 * Atende pela ponte local, ou null (segue para a nuvem). Caminhos atendidos:
 *   POST /v1.0/devices/{id}/commands             comando (fila da ponte; resposta do módulo em até ~10 s)
 *   GET  /v1.0/devices/{id}/status               estado
 *   GET  /v1.0/devices/{id}                      detalhe (online + estado)
 *   GET  /v2.0/cloud/thing/{id}/shadow/properties sombra (ponto, valor e hora; filtro "codes")
 */
function Tuya_local_(metodo, caminho, query, corpo) {
  var m = /^\/(v1\.0\/devices|v2\.0\/cloud\/thing)\/([^\/?]+)(\/[a-z\/-]+)?$/.exec(String(caminho || ''));
  if (!m) return null;
  var dev = decodeURIComponent(m[2]), resto = m[3] || '', v1 = m[1] === 'v1.0/devices';
  metodo = String(metodo || 'GET').toUpperCase();
  var tipo = v1 && metodo === 'POST' && resto === '/commands' ? 'comando'
    : v1 && metodo === 'GET' && resto === '/status' ? 'status'
    : v1 && metodo === 'GET' && resto === '' ? 'detalhe'
    : !v1 && metodo === 'GET' && resto === '/shadow/properties' ? 'sombra' : '';
  if (!tipo || !Tuya_localAtende_(dev)) return null;
  if (tipo === 'comando') {
    var cmds = (corpo && Array.isArray(corpo.commands) ? corpo.commands : []).map(function (x) { return { code: String(x && x.code || ''), value: x ? x.value : null }; });
    var r = SGO_PORTOES_LOCAIS.chamar('comando', { devId: dev, comandos: cmds });
    r = r || {};
    // entregue ao celular e sem resposta do módulo: não se sabe se o portão recebeu (INCERTO; nunca repete sozinho)
    if (r.incerto) throw Tuya_erro_('ponte local: ' + (r.msg || 'sem resposta do módulo do portão'), 0, 0, true);
    if (r.aceito) return Tuya_localResposta_({ success: true, result: true, t: Date.now(), tid: 'local-' + String(r.id || '') });
    return Tuya_localResposta_({ success: false, code: TUYA_LOCAL_RECUSA, msg: 'ponte local: ' + (r.msg || 'o módulo do portão não aceitou o comando'), t: Date.now() });
  }
  var e = SGO_PORTOES_LOCAIS.chamar('estado', { devId: dev }) || {};
  if (!e.ok) return null;
  var props = e.props || {}, codigos = Object.keys(props);
  var lista = codigos.map(function (k) { return { code: k, value: props[k].value }; });
  if (tipo === 'status') return Tuya_localResposta_({ success: true, result: lista, t: Date.now() });
  if (tipo === 'detalhe') return Tuya_localResposta_({ success: true, result: { id: dev, online: e.online === true, status: lista }, t: Date.now() });
  var filtro = query && query.codes ? String(query.codes).split(',').map(function (x) { return x.trim(); }) : null;
  var sombra = codigos.filter(function (k) { return !filtro || filtro.indexOf(k) >= 0; }).map(function (k) { return { code: k, value: props[k].value, time: Number(props[k].time) || 0 }; });
  return Tuya_localResposta_({ success: true, result: { properties: sombra }, t: Date.now() });
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
    // 27/10/2026, resposta real desde as 07:45: {"code":28841004,"msg":"No permissions. Your quota of Trial Edition is used up."}
    28841004: 'a cota de chamadas do plano de teste (Trial Edition) da Tuya acabou (código 28841004); renove em iot.tuya.com › Cloud › Cloud Services › IoT Core (estender o período de teste ou assinar um plano)',
    28841105: 'o projeto cloud não está autorizado a usar esta API (código 28841105); no portal da Tuya, Cloud > projeto > Service API > Go to Authorize, autorize o serviço'
  };
  if (cod === TUYA_LOCAL_RECUSA) return msg || 'ponte local: o módulo do portão não aceitou o comando';
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
  // 27/10/2026: 28841104 (cota) não é falha passageira: nada a repete automaticamente
  var rede = h === 429 || h >= 500;
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
    } else if (tem('reply_unlock_request')) {
      // 22/10/2026, medido na fechadura real (Wifi Smart Lock, categoria ms): sem abertura remota livre; quando tocam a
      // campainha, unlock_request conta o tempo (até 90 s, de 2 em 2 s) e a nuvem aceita a resposta reply_unlock_request
      // (true abre, false recusa) só dentro dessa janela, como o botão do aplicativo Smart Life.
      out.ok = true; out.remotoFechadura = 'PEDIDO';
      out.estadoCodigos = ['closed_opened']; // ponto só de estado (não está nas funções): porta aberta confirma a abertura
      out.motivo = 'Abertura remota só quando tocam a campainha: o SGO+ mostra o pedido de abertura e responde a ele (reply_unlock_request) dentro do tempo que a fechadura dá. Fora disso, não há abertura pela nuvem.';
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
function Tuya_testarConexao_() { return Tuya_comOrigem_('MANUAL', Tuya_testarConexaoAgora_); }
function Tuya_testarConexaoAgora_() {
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
