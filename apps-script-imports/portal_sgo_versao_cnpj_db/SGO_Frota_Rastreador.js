/****************************************************
 * FROTA — RASTREADOR (17/10/2026; API real do rastreador em 19/10/2026)
 *
 * Integração com o rastreador dos veículos pela API do rastreador (somente leitura):
 *   URL base: https://api.itrackergo.com.br/v1/   (chave RASTREADOR_URL; vazio = esta)
 *   Autenticação: cabeçalho "Authorization: Bearer <RASTREADOR_TOKEN>" em toda chamada.
 *   GET /devices                       veículos (id, nome, situação, última atualização)
 *   GET /positions[?deviceId=]          última posição de cada veículo (uma leitura por rodada)
 *   GET /reports/summary?deviceId=&from=&to=   distância no período da retirada (até 7 dias)
 *   Só HTTPS (http apenas para testes em localhost), só os veículos da Metrolabs.
 *   O acesso liberado hoje é SOMENTE LEITURA (só GET): o SGO+ monitora (RASTR_TEXTO_SOMENTE_LEITURA).
 *
 * Bloqueio da partida (objetivo: a partida só libera com a retirada registrada no SGO+):
 *   o caminho completo continua aqui (seção COMANDOS), com as travas de segurança: nunca bloquear em
 *   movimento, só com ignição desligada e posição dos últimos 30 minutos, liberação de emergência pela
 *   gestão. Fica desligado enquanto a empresa do rastreador não liberar um acesso com comandos. Para encaixar a API
 *   de comando sem reescrever, o envio é configurável em Chaves e senhas:
 *     RASTREADOR_CMD_BLOQUEIO_URL / RASTREADOR_CMD_LIBERACAO_URL: endereço completo (https://...) ou
 *       caminho a partir da URL base (ex.: /commands); {deviceId} no endereço é trocado pelo ID.
 *       Envio: POST com corpo JSON { deviceId, type } (type = engineStop no bloqueio, engineResume na liberação).
 *     RASTREADOR_TOKEN_COMANDOS: chave própria dos comandos (vazio = a mesma chave de leitura).
 *   Os dois endereços vazios = aviso "acesso somente leitura"; preenchidos e com
 *   RASTREADOR_BLOQUEIO_LIGADO = 1, a retirada libera e a devolução bloqueia (com as travas).
 *
 * Limites do rastreador: /positions no máximo a cada 30 segundos; 2 requisições por segundo por IP
 * (o SGO+ espaça as chamadas em 600 ms); HTTP 429 = espera (Retry-After, até 10 s) e tenta de
 * novo até 2 vezes. Erros: 401 chave inválida, 403 acesso negado/sem HTTPS, 404 caminho,
 * 429 limite, 503 indisponível — cada um com mensagem própria (Rastreador_exigirOk_).
 *
 * Chaves (só o dono, em Chaves e senhas; ficam só nas propriedades do script):
 *   RASTREADOR_URL, RASTREADOR_TOKEN (chave de acesso Bearer), RASTREADOR_LIGADO (1 liga;
 *   padrão desligado), RASTREADOR_RETENCAO_DIAS (padrão 90) e RASTREADOR_BLOQUEIO_LIGADO
 *   (só tem efeito com os dois endereços de comando preenchidos).
 *   Com RASTREADOR_LIGADO desligado nenhuma chamada sai daqui (retirada, devolução, rotina e
 *   telas), exceto o botão "Testar conexão" do dono.
 *
 * Monitoramento (rotina a cada 2 minutos):
 *   - ignição ligada ou veículo andando sem retirada aberta = alerta crítico "uso sem registro"
 *     (ignição desligada abaixo de 20 km/h é oscilação do GPS: parado; Rastreador_movimento_);
 *   - KM (19/10/2026): o hodômetro do aparelho conta desde a instalação, não é o do painel. Compara-se
 *     o KM RODADO: chegada - saída informados x hodômetro na devolução - hodômetro na retirada; sem os
 *     dois hodômetros, x distância do /reports/summary no período. Diferença acima de 20 km ou de 5%
 *     = "KM a conferir" (Rastreador_kmRodadoConferencia_);
 *   - falha de conexão = um alerta único (não um por rodada);
 *   - na devolução, o ponto de chegada (hora, endereço, mapa) fica para a gestão.
 *
 * LGPD (a guarda dos dados de localização passa a ser da Metrolabs):
 *   - 20/10/2026 (decisão do dono: guardar rotas): cada posição lida vira ponto da rota do veículo, numa tabela
 *     própria do servidor (SGO_Frota_Rastreamento.js), apagada pelo mesmo prazo de retenção abaixo; a trilha de
 *     quem consultou mapa e rotas fica em REG_FROTA_RASTREADOR_CONSULTAS;
 *   - ficam gravados só o ponto de chegada de cada devolução (REG_FROTA_RASTREADOR_PONTOS) e o
 *     local do alerta de uso sem registro (REG_FROTA_RASTREADOR_ALERTAS);
 *   - a trilha de auditoria e os avisos por e-mail/WhatsApp não levam a localização;
 *   - depois de RASTREADOR_RETENCAO_DIAS (padrão 90) os pontos são apagados e o local dos
 *     alertas é retirado (Rastreador_limparRetencao_, uma vez por dia pela rotina);
 *   - só a gestão (ADMIN, GESTOR, DIRETORIA) vê localização; o técnico não vê, nem na retirada.
 *
 * Sem os endereços de comando, Rastreador_chamar_ recusa qualquer método que não seja GET.
 *
 * Segurança: as chaves nunca vão para log, e-mail, tela ou retorno de API (Rastreador_limpar_).
 *
 * Velocidade vem em nós: km/h = nós x 1,852. Datas da API em UTC (ISO).
 ****************************************************/

var RASTR_URL_PADRAO = 'https://api.itrackergo.com.br/v1';
var RASTR_URLS_ANTIGAS = ['https://acesso.itrackergo.com.br']; // padrão da versão de 17/10 (Traccar): vira a URL da API
// 19/10/2026: uma frase com o que funciona e o que não funciona (o dono não entendia a tela).
var RASTR_TEXTO_SOMENTE_LEITURA = 'Acesso somente leitura: funcionam a localização, o aviso de uso sem registro, a conferência do KM e o ponto de chegada; não funciona bloquear nem liberar a partida pelo SGO+ (depende de a empresa do rastreador liberar o acesso com comandos).';
var RASTR_ABA_COMANDOS = 'REG_FROTA_RASTREADOR_COMANDOS';
var RASTR_ABA_ALERTAS = 'REG_FROTA_RASTREADOR_ALERTAS';
var RASTR_ABA_PONTOS = 'REG_FROTA_RASTREADOR_PONTOS';
var RASTR_COLUNAS_COMANDOS = ['ID', 'VEICULO_ID', 'PLACA', 'DEVICE_ID', 'MOVIMENTACAO_ID', 'ACAO', 'ORIGEM', 'SITUACAO', 'PEDIDO_EM',
  'PEDIDO_POR_ID', 'PEDIDO_POR_NOME', 'JUSTIFICATIVA', 'TENTATIVAS', 'ULTIMA_TENTATIVA_EM', 'MOTIVO', 'ENVIADO_EM', 'ALERTA_ATRASO_EM',
  'ENCERRADO_EM', 'ENCERRADO_MOTIVO', 'CRIADO_EM'];
var RASTR_COLUNAS_ALERTAS = ['ID', 'TIPO', 'CHAVE', 'VEICULO_ID', 'PLACA', 'DEVICE_ID', 'PRIMEIRO_EM', 'ULTIMO_EM', 'OCORRENCIAS', 'QUANDO',
  'LOCAL', 'LINK_MAPA', 'DETALHE', 'SITUACAO', 'RESOLVIDO_EM', 'RESOLVIDO_POR', 'RESOLUCAO', 'CRIADO_EM'];
var RASTR_COLUNAS_PONTOS = ['ID', 'TIPO', 'VEICULO_ID', 'PLACA', 'DEVICE_ID', 'MOVIMENTACAO_ID', 'QUANDO', 'QUANDO_EM', 'VELOCIDADE_KMH', 'IGNICAO',
  'LATITUDE', 'LONGITUDE', 'LOCAL', 'LINK_MAPA', 'CRIADO_EM'];
var RASTR_COLUNAS_VEICULO = ['RASTREADOR_DEVICE_ID', 'RASTREADOR_DEVICE_NOME', 'RASTREADOR_ACEITA_BLOQUEIO', 'RASTREADOR_COMANDOS_CONFERIDOS_EM',
  'RASTREADOR_VINCULADO_EM', 'RASTREADOR_VINCULADO_POR'];
var RASTR_COLUNAS_MOV = ['KM_RASTREADOR_SAIDA', 'KM_RASTREADOR_DIVERGENCIA_SAIDA', 'KM_CONFERIDO_RASTREADOR_SAIDA_EM', 'KM_CONFERIDO_RASTREADOR_SAIDA_POR',
  'KM_RASTREADOR_CHEGADA', 'KM_RASTREADOR_DIVERGENCIA_CHEGADA', 'KM_CONFERIDO_RASTREADOR_CHEGADA_EM', 'KM_CONFERIDO_RASTREADOR_CHEGADA_POR',
  'KM_RASTREADOR_RODADO', 'KM_RASTREADOR_OBS'];

// 19/10/2026 (revisão da Frota): abaixo de 5 km/h = parado. Com a ignição desligada, velocidade abaixo de
// 20 km/h é oscilação do GPS (o aparelho parado marca 5, 11 km/h): o veículo está parado e não é "uso".
// Ignição desligada a 20 km/h ou mais = andando (reboque ou sensor com defeito): nunca é tratado como parado.
var RASTR_VEL_PARADO_KMH = 5;              // abaixo disso = parado
var RASTR_VEL_DERIVA_MAX_KMH = 20;         // ignição desligada e abaixo disso = oscilação do GPS (parado)
var RASTR_NOS_PARA_KMH = 1.852;            // a API grava a velocidade em nós
var RASTR_POSICAO_MAX_IDADE_BLOQUEIO_MIN = 30; // posição mais velha que isso não autoriza o bloqueio (provedor com comandos)
var RASTR_POSICAO_RECENTE_USO_MIN = 15;    // "uso sem registro" só com posição dos últimos 15 min
var RASTR_POSICAO_CHEGADA_MAX_MIN = 30;    // ponto de chegada só com posição dos últimos 30 min
var RASTR_CARENCIA_DEVOLUCAO_MIN = 10;     // estacionar depois de registrar a devolução não é uso sem registro
var RASTR_MIN_BLOQUEIO_ATRASADO = 30;      // bloqueio pendente há 30 min = alerta para a gestão (provedor com comandos)
var RASTR_KM_TOLERANCIA = 20;              // divergência acima de 20 km...
var RASTR_KM_TOLERANCIA_PCT = 5;           // ...ou acima de 5% = KM a conferir
var RASTR_KM_MIN_PCT_RESUMO = 2;           // no KM rodado (resumo), o critério de 5% só conta acima de 2 km (arredondamento)
var RASTR_INTERVALO_ROTINA_SEG = 100;      // rotina: no mínimo ~2 min entre rodadas
var RASTR_INTERVALO_MANUAL_SEG = 30;       // "Ler o rastreador agora" da gestão
var RASTR_POSICOES_MIN_SEG = 30;           // limite do rastreador: /positions no máximo a cada 30 s
var RASTR_ESPACO_MS = 600;                 // limite do rastreador: 2 requisições por segundo por IP
var RASTR_429_TENTATIVAS = 2;              // HTTP 429: tenta de novo até 2 vezes...
var RASTR_429_ESPERA_MAX_SEG = 10;         // ...esperando o Retry-After (no máximo 10 s)
var RASTR_RESUMO_MAX_DIAS = 7;             // relatórios do rastreador: períodos de até 7 dias
var RASTR_RESUMOS_POR_RODADA = 3;          // no máximo 3 consultas de resumo por rodada
var RASTR_RETENCAO_PADRAO_DIAS = 90;
var RASTR_ORCAMENTO_RODADA_MS = 45000;     // depois disso o resto fica para a próxima rodada
var RASTR_CACHE_POSICOES = 'RASTR_POSICOES_V2';
var RASTR_CACHE_DISPOSITIVOS = 'RASTR_DISPOSITIVOS_V2';
var RASTR_CACHE_RODADA = 'RASTR_RODADA_EM_CURSO';
var RASTR_CACHE_ULTIMA_CHAMADA = 'RASTR_ULTIMA_CHAMADA_MS';
var RASTR_CACHE_ULTIMAS_POSICOES = 'RASTR_ULTIMAS_POSICOES_MS';
var RASTR_PROP_ULTIMA_RODADA = 'RASTR_ULTIMA_RODADA_EM';
var RASTR_PROP_ULTIMA_LEITURA = 'RASTR_ULTIMA_LEITURA_OK_EM';
var RASTR_PROP_ULTIMA_LIMPEZA = 'RASTR_ULTIMA_LIMPEZA_EM';
var RASTR_FUNCAO_ROTINA = 'Frota_rastreadorRotina';
var RASTR_SISTEMA = { userId: '', usuario: 'sistema', nome: 'Rotina do rastreador', perfil: 'SISTEMA' };

// ------------------------------------------------------------
// CONFIGURAÇÃO E SEGREDOS
// ------------------------------------------------------------
function Rastreador_cfg_() {
  var p = PropertiesService.getScriptProperties();
  var g = function (k) { return String(p.getProperty(k) || '').trim(); };
  var url = (g('RASTREADOR_URL') || RASTR_URL_PADRAO).replace(/\/+$/, '');
  if (RASTR_URLS_ANTIGAS.indexOf(url.toLowerCase()) >= 0) url = RASTR_URL_PADRAO;
  var ret = parseInt(g('RASTREADOR_RETENCAO_DIAS'), 10);
  var pedido = g('RASTREADOR_BLOQUEIO_LIGADO') === '1';
  var cmdBlq = g('RASTREADOR_CMD_BLOQUEIO_URL'), cmdLib = g('RASTREADOR_CMD_LIBERACAO_URL');
  // Os dois endereços são exigidos: sem o de liberação não haveria como sair de uma emergência pelo SGO+.
  var comandos = !!(cmdBlq && cmdLib);
  return {
    url: url, token: g('RASTREADOR_TOKEN'), tokenComandos: g('RASTREADOR_TOKEN_COMANDOS'),
    cmdBloqueio: cmdBlq, cmdLiberacao: cmdLib, comandosIncompletos: !comandos && !!(cmdBlq || cmdLib),
    // usuário e senha da versão Traccar: não são mais usados; ficam aqui só para Rastreador_limpar_ tirá-los de qualquer texto.
    usuario: g('RASTREADOR_USUARIO'), senha: g('RASTREADOR_SENHA'),
    ligado: g('RASTREADOR_LIGADO') === '1',
    provedor: { id: 'itracker', nome: 'iTracker' }, comandos: comandos,
    bloqueioPedido: pedido, bloqueio: comandos && pedido,
    retencaoDias: ret >= 7 && ret <= 1825 ? ret : RASTR_RETENCAO_PADRAO_DIAS
  };
}

function Rastreador_temCredencial_(c) { return !!c.token; }

/** Tira a chave (e usuário/senha antigos) de qualquer texto que possa ir para tela, log ou aviso. */
function Rastreador_limpar_(msg, c) {
  var s = String(msg === null || msg === undefined ? '' : msg);
  s = s.replace(/(Bearer\s+)[^\s"'<>,;]+/gi, '$1***').replace(/([?&](token|password|email|key|apikey)=)[^&\s"'<>]+/gi, '$1***').replace(/JSESSIONID=[^;,\s"'<>]+/gi, 'JSESSIONID=***');
  if (c) {
    [c.token, c.tokenComandos, c.senha, c.usuario].forEach(function (x) {
      if (!x || String(x).length < 3) return;
      s = s.split(String(x)).join('***');
      try { s = s.split(encodeURIComponent(String(x))).join('***'); } catch (e) {}
    });
  }
  return s.replace(/\s+/g, ' ').trim().slice(0, 300);
}

/** Erro do rastreador. rede = falha temporária (sem resposta, 429, 5xx); http = código da resposta. */
function Rastreador_erro_(texto, rede, http) {
  var e = new Error(texto);
  e.rastreadorRede = !!rede;
  e.rastreadorHttp = http || 0;
  return e;
}

/** Depois de trocar URL ou chave (Chaves e senhas): o que estava guardado deixa de valer. */
function Rastreador_esquecerSessao_() {
  try {
    var cache = CacheService.getScriptCache();
    cache.remove(RASTR_CACHE_DISPOSITIVOS); cache.remove(RASTR_CACHE_POSICOES);
  } catch (e) {}
}

function Rastreador_agoraTexto_(d) {
  return Utilities.formatDate(d || new Date(), 'America/Sao_Paulo', 'dd/MM/yyyy HH:mm');
}

function Rastreador_num_(n, casas) {
  var v = Number(n);
  if (!isFinite(v)) return '';
  var fixo = v.toFixed(casas || 0).split('.');
  return (fixo[0].charAt(0) === '-' ? '-' : '') + fixo[0].replace('-', '').replace(/\B(?=(\d{3})+(?!\d))/g, '.') + (fixo[1] ? ',' + fixo[1] : '');
}

function Rastreador_textoSomenteLeitura_() { return RASTR_TEXTO_SOMENTE_LEITURA; }

// ------------------------------------------------------------
// HTTP (API do rastreador: Bearer, só GET)
// ------------------------------------------------------------
/** 2 requisições por segundo por IP: no mínimo 600 ms entre chamadas, contando todas as execuções (cache do script). */
function Rastreador_esperarVez_() {
  var cache = null;
  try { cache = CacheService.getScriptCache(); } catch (e) {}
  var ult = cache ? Number(cache.get(RASTR_CACHE_ULTIMA_CHAMADA) || 0) : 0;
  var falta = ult + RASTR_ESPACO_MS - Date.now();
  if (falta > 0) Utilities.sleep(Math.min(falta, RASTR_ESPACO_MS));
  try { if (cache) cache.put(RASTR_CACHE_ULTIMA_CHAMADA, String(Date.now()), 60); } catch (e2) {}
}

function Rastreador_cabecalho_(r, nome) {
  var cab = {};
  try { cab = (r.getAllHeaders ? r.getAllHeaders() : r.getHeaders()) || {}; } catch (e) {}
  var achado = '';
  Object.keys(cab).forEach(function (k) { if (!achado && String(k).toLowerCase() === nome) achado = String(Array.isArray(cab[k]) ? cab[k][0] : cab[k]); });
  return achado;
}

/** Segundos de espera depois de um 429 (Retry-After em segundos; padrão 2; no máximo 10). */
function Rastreador_esperaDo429_(r) {
  var s = Number(Rastreador_cabecalho_(r, 'retry-after'));
  if (!isFinite(s) || s <= 0) s = 2;
  return Math.min(Math.ceil(s), RASTR_429_ESPERA_MAX_SEG);
}

function Rastreador_consulta_(params) {
  var partes = [];
  (params || []).forEach(function (p) {
    if (p && p[1] !== undefined && p[1] !== null && p[1] !== '') partes.push(encodeURIComponent(p[0]) + '=' + encodeURIComponent(String(p[1])));
  });
  return partes.length ? '?' + partes.join('&') : '';
}

/**
 * Uma chamada à API. params = [[nome, valor], ...] (deviceId pode repetir). Devolve { http, txt, j, esperas429 }.
 * Sem resposta vira erro com rastreadorRede=true, sem segredo. Só GET: com o acesso atual (sem comandos) qualquer outro
 * método é recusado aqui, antes de sair.
 */
function Rastreador_chamar_(c, metodo, caminho, params, corpo, o) {
  o = o || {};
  metodo = String(metodo || 'get').toLowerCase();
  if (metodo !== 'get' && !c.comandos) throw Rastreador_erro_('o acesso ao rastreador é somente leitura; o SGO+ não envia nada além de consultas', false);
  if (!Rastreador_temCredencial_(c)) {
    throw Rastreador_erro_('falta a chave de acesso do rastreador: o responsável pelo sistema grava a "Chave de acesso (Bearer)" (RASTREADOR_TOKEN) em Chaves e senhas > Rastreador da frota', false);
  }
  var url = (/^https?:\/\//i.test(caminho) ? caminho : c.url + caminho) + Rastreador_consulta_(params);
  if (!/^https:\/\//i.test(url) && !/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/i.test(url)) {
    throw Rastreador_erro_('o endereço do rastreador precisa começar com https:// (a empresa do rastreador só aceita HTTPS); o padrão é ' + RASTR_URL_PADRAO + '/', false);
  }
  var chave = o.comando && c.tokenComandos ? c.tokenComandos : c.token;
  var op = { method: metodo, muteHttpExceptions: true, followRedirects: false, headers: { Authorization: 'Bearer ' + chave, Accept: 'application/json' } };
  if (corpo !== undefined) { op.contentType = 'application/json'; op.payload = JSON.stringify(corpo); }
  for (var t = 0; ; t++) {
    Rastreador_esperarVez_();
    var r;
    try { r = UrlFetchApp.fetch(url, op); }
    catch (e) { throw Rastreador_erro_('sem resposta do rastreador (' + Rastreador_limpar_(e && e.message, c) + ')', true); }
    var http = r.getResponseCode();
    if (http === 429 && t < RASTR_429_TENTATIVAS) { Utilities.sleep(Rastreador_esperaDo429_(r) * 1000); continue; }
    var txt = '';
    try { txt = String(r.getContentText() || ''); } catch (e2) {}
    var j = null;
    try { j = JSON.parse(txt); } catch (e3) {}
    return { http: http, txt: txt, j: j, esperas429: t };
  }
}

/** Resposta 2xx com JSON, ou erro com a mensagem clara de cada código. */
function Rastreador_exigirOk_(res, c, oQue) {
  var h = res.http;
  if (h >= 200 && h < 300) {
    if (res.j === null) throw Rastreador_erro_('a resposta do rastreador para ' + oQue + ' não veio no formato esperado (JSON); confira o endereço RASTREADOR_URL (o padrão é ' + RASTR_URL_PADRAO + '/)', false, h);
    return res;
  }
  if (h === 401) throw Rastreador_erro_('a empresa do rastreador recusou a chave de acesso (HTTP 401: chave inválida ou cancelada); o responsável pelo sistema grava a chave certa em Chaves e senhas > Rastreador da frota', false, h);
  if (h === 403) throw Rastreador_erro_('a empresa do rastreador negou o acesso a ' + oQue + ' (HTTP 403: acesso negado ou chamada sem HTTPS); confira se RASTREADOR_URL começa com https:// e peça à empresa do rastreador para conferir a permissão da chave', false, h);
  if (h === 404) throw Rastreador_erro_('a empresa do rastreador não reconheceu o endereço de ' + oQue + ' (HTTP 404); confira RASTREADOR_URL em Chaves e senhas (o padrão é ' + RASTR_URL_PADRAO + '/)', false, h);
  if (h === 429) throw Rastreador_erro_('a empresa do rastreador recusou por excesso de consultas (HTTP 429; limite de 2 por segundo e posições a cada 30 segundos); o SGO+ esperou, tentou de novo ' + RASTR_429_TENTATIVAS + ' vezes e deixou para a próxima rodada', true, h);
  if (h === 503) throw Rastreador_erro_('a plataforma do rastreador está indisponível no momento (HTTP 503); o SGO+ tenta de novo na próxima rodada', true, h);
  if (h >= 500) throw Rastreador_erro_('a empresa do rastreador respondeu com erro interno (HTTP ' + h + ') em ' + oQue + '; o SGO+ tenta de novo na próxima rodada', true, h);
  throw Rastreador_erro_('a empresa do rastreador respondeu HTTP ' + h + ' em ' + oQue + (res.txt ? ' (' + Rastreador_limpar_(res.txt.slice(0, 160), c) + ')' : ''), false, h);
}

function Rastreador_lista_(j) {
  if (Array.isArray(j)) return j;
  if (j && Array.isArray(j.data)) return j.data;
  if (j && Array.isArray(j.items)) return j.items;
  return [];
}

// ------------------------------------------------------------
// LEITURAS
// ------------------------------------------------------------
function Rastreador_lerDispositivos_(c, usarCache) {
  var cache = null;
  if (usarCache) {
    try { cache = CacheService.getScriptCache(); var em = JSON.parse(cache.get(RASTR_CACHE_DISPOSITIVOS) || 'null'); if (em && em.url === c.url) return em.lista; } catch (e) {}
  }
  var res = Rastreador_exigirOk_(Rastreador_chamar_(c, 'get', '/devices'), c, 'a lista de veículos');
  var lista = Rastreador_lista_(res.j).filter(function (d) { return d && d.id !== undefined && d.id !== null; }).map(function (d) {
    var a = d.attributes || {};
    return { id: String(d.id), nome: SGO_UTILS.safe(d.name || d.nome), identificador: SGO_UTILS.safe(d.uniqueId || d.identificador || ''), situacao: SGO_UTILS.safe(d.status || d.situacao),
      placa: SGO_UTILS.safe(d.placa || d.plate || a.placa || a.plate || ''), ultimaAtualizacao: d.lastUpdate || d.ultimaAtualizacao ? String(d.lastUpdate || d.ultimaAtualizacao) : '' };
  });
  try { (cache || CacheService.getScriptCache()).put(RASTR_CACHE_DISPOSITIVOS, JSON.stringify({ url: c.url, lista: lista }), 300); } catch (e) {}
  return lista;
}

/** Posição da API -> o que o SGO+ usa (km/h, ignição, hodômetro em km, hora em Brasília). */
function Rastreador_posicao_(p) {
  var a = p.attributes || {};
  var bool = function (v) { return v === true || v === 'true' ? true : (v === false || v === 'false' ? false : null); };
  var numero = function (v) { return v === null || v === undefined || v === '' || !isFinite(Number(v)) ? null : Number(v); };
  var nos = numero(p.speed);
  var odo = numero(a.odometer);
  if (odo === null) odo = numero(a.totalDistance);
  var quando = new Date(p.fixTime || p.deviceTime || p.serverTime || '');
  var ok = !isNaN(quando.getTime());
  var lat = numero(p.latitude), lon = numero(p.longitude);
  return {
    deviceId: String(p.deviceId), quandoMs: ok ? quando.getTime() : 0, quandoTexto: ok ? Rastreador_agoraTexto_(quando) : '',
    kmh: nos === null ? null : Math.round(nos * RASTR_NOS_PARA_KMH * 10) / 10,
    ignicao: bool(a.ignition), movimento: bool(a.motion), odometroKm: odo === null ? null : Math.round(odo / 1000),
    valida: p.valid === false || p.valid === 'false' ? false : true,
    lat: lat, lon: lon, endereco: SGO_UTILS.safe(p.address),
    link: lat !== null && lon !== null ? 'https://www.google.com/maps?q=' + lat + ',' + lon : ''
  };
}

/**
 * Estado do veículo pela última posição (19/10/2026): ANDANDO, LIGADO (ignição ligada, parado), PARADO ou SEM_DADO.
 * deriva = a velocidade marcada é oscilação do GPS (ignição desligada, abaixo de 20 km/h): não conta como movimento.
 * texto = frase curta para a tela da gestão.
 */
function Rastreador_movimento_(pos) {
  if (!pos) return { estado: 'SEM_DADO', deriva: false, texto: 'sem posição' };
  var kmh = pos.kmh, ign = pos.ignicao;
  var vel = kmh === null || kmh === undefined ? null : Number(kmh);
  if (ign === false) {
    if (vel !== null && vel >= RASTR_VEL_DERIVA_MAX_KMH) {
      return { estado: 'ANDANDO', deriva: false, texto: 'andando a ' + Rastreador_num_(vel, 0) + ' km/h com a ignição desligada (reboque ou sensor da ignição com defeito)' };
    }
    var deriva = vel !== null && vel >= 1;
    return { estado: 'PARADO', deriva: deriva, texto: 'parado, ignição desligada' + (deriva ? ' (o GPS marcou ' + Rastreador_num_(vel, 0) + ' km/h: oscilação normal do sinal com o veículo parado)' : '') };
  }
  if ((vel !== null && vel >= RASTR_VEL_PARADO_KMH) || pos.movimento === true) {
    return { estado: 'ANDANDO', deriva: false, texto: 'andando' + (vel !== null ? ' a ' + Rastreador_num_(vel, 0) + ' km/h' : '') };
  }
  if (ign === true) return { estado: 'LIGADO', deriva: false, texto: 'parado com a ignição ligada' };
  return { estado: 'PARADO', deriva: false, texto: 'parado (o aparelho não informa a ignição)' };
}

function Rastreador_localTexto_(pos) {
  if (!pos) return 'local não informado';
  if (pos.endereco) return pos.endereco;
  if (pos.lat === null || pos.lon === null) return 'local não informado';
  return 'latitude ' + Rastreador_num_(pos.lat, 5) + ', longitude ' + Rastreador_num_(pos.lon, 5);
}

/** Posições guardadas no cache (só da última leitura; nada de histórico) se não forem mais velhas que maxSeg. */
function Rastreador_posicoesGuardadas_(c, maxSeg) {
  try {
    var em = JSON.parse(CacheService.getScriptCache().get(RASTR_CACHE_POSICOES) || 'null');
    if (em && em.url === c.url && Date.now() - Number(em.em || 0) <= maxSeg * 1000) return em.posicoes || {};
  } catch (e) {}
  return null;
}

function Rastreador_guardarPosicoes_(c, mapa, juntar) {
  try {
    var cache = CacheService.getScriptCache();
    var base = {};
    if (juntar) { var em = JSON.parse(cache.get(RASTR_CACHE_POSICOES) || 'null'); if (em && em.url === c.url) base = em.posicoes || {}; }
    Object.keys(mapa).forEach(function (k) { base[k] = mapa[k]; });
    cache.put(RASTR_CACHE_POSICOES, JSON.stringify({ url: c.url, em: Date.now(), posicoes: base }), 900);
  } catch (e) {}
}

/**
 * GET /positions (todas, uma chamada) ou só de um veículo. Devolve mapa deviceId -> posição.
 * o.aceitarCacheSeg: usa a última leitura guardada se for desta idade ou mais nova (e tiver o veículo pedido).
 * Limite do rastreador (uma leitura a cada 30 s): o.esperar = espera o tempo que falta (só a rotina, em segundo
 * plano); sem esperar, usa a leitura guardada dos últimos 2 minutos ou devolve erro "intervalo".
 * o.fresco: decisão de bloqueio — nunca usa leitura guardada; dentro dos 30 s devolve erro "intervalo" (o comando fica
 * pendente e a rotina decide com a leitura dela).
 */
function Rastreador_lerPosicoes_(c, deviceId, o) {
  o = o || {};
  var dev = deviceId ? String(deviceId) : '';
  if (o.aceitarCacheSeg && !o.fresco) {
    var g0 = Rastreador_posicoesGuardadas_(c, o.aceitarCacheSeg);
    if (g0 && (!dev || g0[dev])) return g0;
  }
  var cache = CacheService.getScriptCache();
  var desde = Date.now() - Number(cache.get(RASTR_CACHE_ULTIMAS_POSICOES) || 0);
  if (desde < RASTR_POSICOES_MIN_SEG * 1000) {
    if (o.esperar) Utilities.sleep(RASTR_POSICOES_MIN_SEG * 1000 - desde + 50);
    else {
      var g1 = o.fresco ? null : Rastreador_posicoesGuardadas_(c, 120);
      if (g1 && (!dev || g1[dev])) return g1;
      var eInt = Rastreador_erro_('as posições foram lidas há menos de ' + RASTR_POSICOES_MIN_SEG + ' segundos (limite do rastreador); a próxima rodada lê de novo', false);
      eInt.rastreadorIntervalo = true;
      throw eInt;
    }
  }
  try { cache.put(RASTR_CACHE_ULTIMAS_POSICOES, String(Date.now()), 300); } catch (e) {}
  var res = Rastreador_exigirOk_(Rastreador_chamar_(c, 'get', '/positions', dev ? [['deviceId', dev]] : []), c, 'as posições');
  var mapa = {};
  Rastreador_lista_(res.j).forEach(function (p) {
    if (!p || p.deviceId === undefined || p.deviceId === null) return;
    var pos = Rastreador_posicao_(p);
    if (!mapa[pos.deviceId] || pos.quandoMs > mapa[pos.deviceId].quandoMs) mapa[pos.deviceId] = pos;
  });
  Rastreador_guardarPosicoes_(c, mapa, !!dev);
  return mapa;
}

/**
 * GET /reports/summary: distância (km) do veículo entre "de" e "ate" (Date). Períodos de até 7 dias.
 * Devolve { km } ou { km: null, motivo }. Erro de chamada lança (como as outras leituras).
 */
function Rastreador_lerDistancia_(c, deviceId, de, ate) {
  if (!(de instanceof Date) || isNaN(de.getTime()) || !(ate instanceof Date) || isNaN(ate.getTime()) || ate <= de) return { km: null, motivo: 'período da retirada sem data e hora válidas' };
  if (ate.getTime() - de.getTime() > RASTR_RESUMO_MAX_DIAS * 86400000) return { km: null, motivo: 'retirada com mais de ' + RASTR_RESUMO_MAX_DIAS + ' dias: o resumo do rastreador cobre no máximo ' + RASTR_RESUMO_MAX_DIAS + ' dias' };
  var res = Rastreador_exigirOk_(Rastreador_chamar_(c, 'get', '/reports/summary', [['deviceId', deviceId], ['from', de.toISOString()], ['to', ate.toISOString()]]), c, 'o resumo do período');
  var itens = Rastreador_lista_(res.j);
  if (!itens.length && res.j && typeof res.j === 'object' && !Array.isArray(res.j)) itens = [res.j];
  var it = itens.filter(function (x) { return x && String(x.deviceId) === String(deviceId); })[0] || (itens.length === 1 ? itens[0] : null);
  if (!it) return { km: null, motivo: 'o resumo do rastreador veio sem este veículo' };
  var numero = function (v) { return v === null || v === undefined || v === '' || !isFinite(Number(v)) ? null : Number(v); };
  var m = numero(it.distance);
  if (m === null && numero(it.endOdometer) !== null && numero(it.startOdometer) !== null) m = numero(it.endOdometer) - numero(it.startOdometer);
  if (m === null || m < 0) return { km: null, motivo: 'o resumo do rastreador veio sem a distância percorrida' };
  return { km: Math.round(m / 1000) };
}

// ------------------------------------------------------------
// TABELAS
// ------------------------------------------------------------
function Rastreador_garantirAbas_() {
  Frota_bootstrap_();
}

/** Chamado por Frota_bootstrapSemTrava_ (só colunas e abas novas; nada existente é apagado). */
function Rastreador_bootstrapSemTrava_() {
  RASTR_COLUNAS_VEICULO.forEach(function (col) { CertCal_garantirColuna_(SGO_CFG.SHEETS.CAD_VEICULOS, col); });
  RASTR_COLUNAS_MOV.forEach(function (col) { CertCal_garantirColuna_(SGO_CFG.SHEETS.REG_FROTA_MOVIMENTACAO, col); });
  CertCal_garantirTabela_(RASTR_ABA_COMANDOS, RASTR_COLUNAS_COMANDOS);
  CertCal_garantirTabela_(RASTR_ABA_ALERTAS, RASTR_COLUNAS_ALERTAS);
  CertCal_garantirTabela_(RASTR_ABA_PONTOS, RASTR_COLUNAS_PONTOS);
}

function Rastreador_comandos_() { return Frota_lerSeExistir_(RASTR_ABA_COMANDOS); }

function Rastreador_pendentes_(veiculoId, acao) {
  return Rastreador_comandos_().filter(function (x) {
    return SGO_UTILS.safeUpper(x.SITUACAO) === 'PENDENTE' && (!veiculoId || SGO_UTILS.safe(x.VEICULO_ID) === veiculoId) && (!acao || SGO_UTILS.safeUpper(x.ACAO) === acao);
  });
}

function Rastreador_encerrar_(cmd, situacao, motivo) {
  var upd = { SITUACAO: situacao, ENCERRADO_EM: SGO_UTILS.nowIso(), ENCERRADO_MOTIVO: String(motivo || '').slice(0, 300) };
  SGO_DATA.update(RASTR_ABA_COMANDOS, cmd.ID, upd);
  Object.assign(cmd, upd);
}

function Rastreador_cancelarPendentes_(veiculoId, acao, motivo) {
  var n = 0;
  Rastreador_pendentes_(veiculoId, acao).forEach(function (cmd) { Rastreador_encerrar_(cmd, 'CANCELADO', motivo); n++; });
  return n;
}

// ------------------------------------------------------------
// PONTO DE CHEGADA (LGPD: só o ponto da devolução; apagado depois do prazo de retenção)
// ------------------------------------------------------------
function Rastreador_pontoDaDevolucao_(movId) {
  return Frota_lerSeExistir_(RASTR_ABA_PONTOS).filter(function (p) { return SGO_UTILS.safe(p.MOVIMENTACAO_ID) === movId && SGO_UTILS.safeUpper(p.TIPO) === 'CHEGADA'; })[0] || null;
}

/** Grava o ponto de chegada (uma vez por devolução) se a posição for recente e tiver local. */
function Rastreador_gravarChegada_(veiculo, movId, pos) {
  if (!pos || !movId || !pos.quandoMs || Date.now() - pos.quandoMs > RASTR_POSICAO_CHEGADA_MAX_MIN * 60000) return null;
  if (!pos.endereco && (pos.lat === null || pos.lon === null)) return null;
  if (Rastreador_pontoDaDevolucao_(movId)) return null;
  var reg = SGO_DATA.normalizarObjetoParaSheet(RASTR_ABA_PONTOS, SGO_DATA.gerarRegistroBase({
    TIPO: 'CHEGADA', VEICULO_ID: SGO_UTILS.safe(veiculo.ID), PLACA: SGO_UTILS.safe(veiculo.PLACA), DEVICE_ID: SGO_UTILS.safe(veiculo.RASTREADOR_DEVICE_ID),
    MOVIMENTACAO_ID: movId, QUANDO: pos.quandoTexto, QUANDO_EM: new Date(pos.quandoMs).toISOString(), VELOCIDADE_KMH: pos.kmh === null ? '' : pos.kmh,
    IGNICAO: pos.ignicao === true ? 'LIGADA' : (pos.ignicao === false ? 'DESLIGADA' : ''), LATITUDE: pos.lat === null ? '' : pos.lat, LONGITUDE: pos.lon === null ? '' : pos.lon,
    LOCAL: Rastreador_localTexto_(pos), LINK_MAPA: pos.link
  }));
  SGO_DATA.insert(RASTR_ABA_PONTOS, reg);
  return reg;
}

// ------------------------------------------------------------
// ALERTAS PRÓPRIOS (uso sem registro, conexão) — um por chave enquanto aberto
// ------------------------------------------------------------
function Rastreador_alertasAbertos_() {
  return Frota_lerSeExistir_(RASTR_ABA_ALERTAS).filter(function (a) { return SGO_UTILS.safeUpper(a.SITUACAO) === 'ABERTO'; });
}

function Rastreador_abrirAlerta_(tipo, chave, d) {
  var aberto = Rastreador_alertasAbertos_().filter(function (a) { return SGO_UTILS.safe(a.CHAVE) === chave; })[0];
  var agora = SGO_UTILS.nowIso();
  if (aberto) {
    var upd = { ULTIMO_EM: agora, OCORRENCIAS: (Number(aberto.OCORRENCIAS) || 1) + 1 };
    if (d.quando) upd.QUANDO = d.quando;
    if (d.local) upd.LOCAL = d.local;
    if (d.link !== undefined) upd.LINK_MAPA = d.link;
    if (d.detalhe) upd.DETALHE = String(d.detalhe).slice(0, 1000);
    SGO_DATA.update(RASTR_ABA_ALERTAS, aberto.ID, upd);
    return { novo: false, alerta: Object.assign(aberto, upd) };
  }
  var reg = SGO_DATA.normalizarObjetoParaSheet(RASTR_ABA_ALERTAS, SGO_DATA.gerarRegistroBase({
    TIPO: tipo, CHAVE: chave, VEICULO_ID: d.veiculoId || '', PLACA: d.placa || '', DEVICE_ID: d.deviceId || '', PRIMEIRO_EM: agora, ULTIMO_EM: agora,
    OCORRENCIAS: 1, QUANDO: d.quando || '', LOCAL: d.local || '', LINK_MAPA: d.link || '', DETALHE: String(d.detalhe || '').slice(0, 1000),
    SITUACAO: 'ABERTO', RESOLVIDO_EM: '', RESOLVIDO_POR: '', RESOLUCAO: ''
  }));
  SGO_DATA.insert(RASTR_ABA_ALERTAS, reg);
  return { novo: true, alerta: reg };
}

function Rastreador_resolverAlertas_(filtro, por, resolucao) {
  var n = 0;
  Rastreador_alertasAbertos_().filter(filtro).forEach(function (a) {
    SGO_DATA.update(RASTR_ABA_ALERTAS, a.ID, { SITUACAO: 'RESOLVIDO', RESOLVIDO_EM: SGO_UTILS.nowIso(), RESOLVIDO_POR: por, RESOLUCAO: String(resolucao || '').slice(0, 500) });
    n++;
  });
  return n;
}

/** Falha de conexão: um alerta só, atualizado a cada rodada que falha (sem repetir). */
function Rastreador_falhaConexao_(motivo) {
  var a = Rastreador_abrirAlerta_('CONEXAO', 'CONEXAO', { quando: Rastreador_agoraTexto_(), detalhe: 'Sem comunicação com o rastreador: ' + motivo + '.' });
  if (a.novo) {
    try { SGO_DATA.log('FROTA_RASTREADOR_CONEXAO', 'sistema', 'Sem comunicação com o rastreador: ' + String(motivo).slice(0, 300), 'FROTA'); } catch (e) {}
  }
  return a;
}

function Rastreador_conexaoOk_() {
  var n = Rastreador_resolverAlertas_(function (a) { return SGO_UTILS.safe(a.CHAVE) === 'CONEXAO'; }, 'sistema', 'Comunicação com o rastreador restabelecida em ' + Rastreador_agoraTexto_() + '.');
  try { PropertiesService.getScriptProperties().setProperty(RASTR_PROP_ULTIMA_LEITURA, SGO_UTILS.nowIso()); } catch (e) {}
  return n;
}

/**
 * Quem recebe os avisos do rastreador. 21/10/2026 (matriz de avisos): o gestor da Frota (Caixa de decisões > Regras e
 * responsáveis, área da Frota; sem gestor, a Diretoria), no lugar de toda a gestão. Sem a matriz: a gestão toda, como antes.
 */
function Rastreador_gestores_() {
  if (typeof SGO_avisoGestoresDe_ === 'function') return SGO_avisoGestoresDe_('frota');
  return Frota_lerSeExistir_(SGO_CFG.SHEETS.CAD_USUARIOS).filter(function (u) {
    var p = SGO_UTILS.safeUpper(u.PERFIL);
    return SGO_UTILS.safeUpper(u.STATUS) === 'ATIVO' && (p === 'ADMIN' || p === 'GESTOR' || p === 'DIRETORIA');
  }).map(function (u) { return SGO_UTILS.safe(u.ID); }).filter(String);
}

/**
 * evento (matriz de avisos): S35 uso sem registro (e-mail e WhatsApp na hora, no expediente; fora dele, resumo do dia seguinte),
 * S36 partida não liberada (só WhatsApp na hora, no expediente), S37 bloqueio pendente (só e-mail na hora). Só CLT recebe WhatsApp.
 */
function Rastreador_avisarGestao_(titulo, texto, refId, evento) {
  if (typeof SGO_notificar_ !== 'function') return;
  try {
    var ids = Rastreador_gestores_();
    if (ids.length) SGO_notificar_({ usuarios: ids, titulo: titulo, texto: texto, canais: ['sgo', 'email', 'whatsapp'], origem: 'FROTA', refId: refId, evento: evento || '' });
  } catch (e) { console.error('Rastreador aviso: ' + ((e && e.message) || e)); }
}

// ------------------------------------------------------------
// KM: hodômetro do rastreador x KM digitado; sem hodômetro, distância do resumo x KM rodado
// ------------------------------------------------------------
/** minAbsPct: no KM rodado, o critério de 5% só vale acima desta diferença (km); no hodômetro, 0. */
function Rastreador_kmDivergente_(kmDigitado, kmRastreador, minAbsPct) {
  var dif = kmDigitado - kmRastreador;
  var pct = kmRastreador > 0 ? Math.abs(dif) / kmRastreador * 100 : (dif !== 0 ? 100 : 0);
  var porPct = pct > RASTR_KM_TOLERANCIA_PCT && Math.abs(dif) > (minAbsPct || 0);
  return { dif: dif, divergente: Math.abs(dif) > RASTR_KM_TOLERANCIA || porPct };
}

/**
 * 19/10/2026 (revisão da Frota): o hodômetro do rastreador conta desde a instalação do aparelho, não é o número do
 * painel (ex.: aparelho em 26.238 km num carro com 189.561 km). Comparar os dois valores dava "KM a conferir" em toda
 * retirada. O que se compara é a VARIAÇÃO: KM rodado informado (chegada - saída) x KM rodado pelo rastreador
 * (hodômetro na devolução - hodômetro na retirada). Na retirada o hodômetro só é guardado, sem comparação.
 *
 * Rastreador_kmRodadoConferencia_(mov): lê só o que está gravado na movimentação. Devolve null (nada a comparar) ou
 * { fonte: 'HODOMETRO'|'RESUMO', rodadoInformado, rodadoRastreador, odoSaida, odoChegada, dif, divergente }.
 */
function Rastreador_numOuNulo_(v) {
  if (v === null || v === undefined || String(v).trim() === '') return null;
  var n = Frota_num_(v, NaN);
  return isFinite(n) ? n : null;
}

function Rastreador_kmRodadoConferencia_(mov) {
  if (!mov || SGO_UTILS.safeUpper(mov.STATUS) !== 'FINALIZADO') return null;
  var ks = Rastreador_numOuNulo_(mov.KM_SAIDA), kc = Rastreador_numOuNulo_(mov.KM_CHEGADA);
  if (ks === null || kc === null) return null;
  var informado = kc - ks;
  var os = Rastreador_numOuNulo_(mov.KM_RASTREADOR_SAIDA), oc = Rastreador_numOuNulo_(mov.KM_RASTREADOR_CHEGADA);
  var r;
  // aparelho trocado ou zerado no meio da retirada (chegada menor que a saída): o hodômetro não serve; vale o resumo
  if (os !== null && oc !== null && oc >= os) r = { fonte: 'HODOMETRO', rodadoRastreador: oc - os, odoSaida: os, odoChegada: oc };
  else {
    var rod = Rastreador_numOuNulo_(mov.KM_RASTREADOR_RODADO);
    if (rod === null) return null;
    r = { fonte: 'RESUMO', rodadoRastreador: rod, odoSaida: os, odoChegada: oc };
  }
  var k = Rastreador_kmDivergente_(informado, r.rodadoRastreador, RASTR_KM_MIN_PCT_RESUMO);
  r.rodadoInformado = informado; r.dif = k.dif; r.divergente = k.divergente;
  return r;
}

/** Frase da conferência para a tela, a trilha e a central ("KM rodado informado 120 km ... e pelo rastreador 118 km"). */
function Rastreador_textoConferencia_(mov, r) {
  return 'KM rodado informado ' + Frota_kmTexto_(r.rodadoInformado) + ' km (saída ' + Frota_kmTexto_(mov.KM_SAIDA) + ', chegada ' + Frota_kmTexto_(mov.KM_CHEGADA) +
    ') e KM rodado medido pelo rastreador ' + Frota_kmTexto_(r.rodadoRastreador) + ' km' +
    (r.fonte === 'HODOMETRO' ? ' (hodômetro do aparelho de ' + Frota_kmTexto_(r.odoSaida) + ' a ' + Frota_kmTexto_(r.odoChegada) + ')' : ' (distância do período da retirada)') +
    ': diferença de ' + Frota_kmTexto_(r.dif) + ' km';
}

/**
 * Grava o hodômetro do rastreador lido na retirada (SAIDA, só guarda) ou na devolução (CHEGADA, compara o KM rodado).
 * Na CHEGADA sem o hodômetro da saída devolve { precisaResumo: true } para quem chamou conferir pela distância do período.
 */
function Rastreador_conferirKm_(mov, veiculo, etapa, pos, sessao) {
  if (!pos || pos.odometroKm === null || !mov) return null;
  var upd = {};
  upd['KM_RASTREADOR_' + etapa] = pos.odometroKm;
  if (etapa === 'SAIDA') {
    SGO_DATA.update(SGO_CFG.SHEETS.REG_FROTA_MOVIMENTACAO, mov.ID, upd);
    Object.assign(mov, upd);
    return { fonte: 'HODOMETRO', odometroKm: pos.odometroKm, guardado: true, divergente: false };
  }
  Object.assign(mov, upd);
  var r = Rastreador_kmRodadoConferencia_(mov);
  if (!r || r.fonte !== 'HODOMETRO') {
    SGO_DATA.update(SGO_CFG.SHEETS.REG_FROTA_MOVIMENTACAO, mov.ID, upd);
    return { fonte: 'HODOMETRO', odometroKm: pos.odometroKm, precisaResumo: true, divergente: false };
  }
  upd.KM_RASTREADOR_RODADO = r.rodadoRastreador;
  upd.KM_RASTREADOR_DIVERGENCIA_CHEGADA = r.divergente ? r.dif : '';
  upd.KM_RASTREADOR_OBS = '';
  SGO_DATA.update(SGO_CFG.SHEETS.REG_FROTA_MOVIMENTACAO, mov.ID, upd);
  Object.assign(mov, upd);
  if (r.divergente) {
    Frota_auditar_(sessao || RASTR_SISTEMA, {
      acao: 'RASTREADOR_KM_DIVERGENTE_CHEGADA', veiculoId: SGO_UTILS.safe(veiculo.ID), placa: SGO_UTILS.safe(veiculo.PLACA), movimentacaoId: SGO_UTILS.safe(mov.ID),
      condutorId: SGO_UTILS.safe(mov.CONDUTOR_ID), campo: 'KM_RODADO', antes: r.rodadoRastreador, depois: r.rodadoInformado,
      detalhe: Rastreador_textoConferencia_(mov, r) + ' (tolerância de ' + RASTR_KM_TOLERANCIA + ' km ou ' + RASTR_KM_TOLERANCIA_PCT + '%). A gestão confere em KM a conferir.'
    });
  }
  return { fonte: 'HODOMETRO', odometroKm: pos.odometroKm, rodado: r.rodadoInformado, rodadoRastreador: r.rodadoRastreador, dif: r.dif, divergente: r.divergente };
}

/** Início e fim da retirada (data e hora digitadas; na falta, a hora do registro). */
function Rastreador_periodoRetirada_(mov) {
  // Vale o período mais largo entre a hora digitada (a gestão pode registrar depois) e a hora do registro.
  var t = function (d) { return d instanceof Date && !isNaN(d.getTime()) ? d.getTime() : NaN; };
  var digSaida = t(typeof Frota_parseDataHora_ === 'function' ? Frota_parseDataHora_(mov.DATA_SAIDA, mov.HORA_SAIDA) : null);
  var regSaida = t(new Date(SGO_UTILS.safe(mov.CRIADO_EM)));
  var digCheg = t(typeof Frota_parseDataHora_ === 'function' && SGO_UTILS.safe(mov.DATA_CHEGADA) ? Frota_parseDataHora_(mov.DATA_CHEGADA, mov.HORA_CHEGADA) : null);
  var regCheg = t(SGO_UTILS.safe(mov.FINALIZADO_EM) ? new Date(SGO_UTILS.safe(mov.FINALIZADO_EM)) : new Date());
  var ini = [digSaida, regSaida].filter(isFinite), fimL = [digCheg, regCheg].filter(isFinite);
  var de = new Date(ini.length ? Math.min.apply(null, ini) : NaN);
  var ate = new Date(fimL.length ? Math.max.apply(null, fimL) : Date.now());
  // margem de 5 minutos para os dois lados (hora digitada sem segundos), nunca no futuro
  return { de: new Date(de.getTime() - 5 * 60000), ate: new Date(Math.min(ate.getTime() + 5 * 60000, Date.now())) };
}

/**
 * Sem hodômetro no rastreador: KM rodado digitado (chegada - saída) x distância do /reports/summary no período.
 * Grava KM_RASTREADOR_RODADO (ou KM_RASTREADOR_OBS com o motivo, para não consultar de novo). Lança em erro de chamada.
 */
function Rastreador_conferirKmPorResumo_(c, mov, veiculo, sessao) {
  if (!mov || SGO_UTILS.safeUpper(mov.STATUS) !== 'FINALIZADO') return null;
  var saida = Frota_num_(mov.KM_SAIDA, NaN), chegada = Frota_num_(mov.KM_CHEGADA, NaN);
  if (!isFinite(saida) || !isFinite(chegada)) return null;
  var per = Rastreador_periodoRetirada_(mov);
  var d = Rastreador_lerDistancia_(c, SGO_UTILS.safe(veiculo.RASTREADOR_DEVICE_ID), per.de, per.ate);
  if (d.km === null) {
    SGO_DATA.update(SGO_CFG.SHEETS.REG_FROTA_MOVIMENTACAO, mov.ID, { KM_RASTREADOR_OBS: ('Sem conferência pelo rastreador: ' + d.motivo + '.').slice(0, 300) });
    mov.KM_RASTREADOR_OBS = d.motivo;
    return { fonte: 'RESUMO', km: null, motivo: d.motivo };
  }
  var rodado = chegada - saida;
  var k = Rastreador_kmDivergente_(rodado, d.km, RASTR_KM_MIN_PCT_RESUMO);
  var upd = { KM_RASTREADOR_RODADO: d.km, KM_RASTREADOR_DIVERGENCIA_CHEGADA: k.divergente ? k.dif : '', KM_RASTREADOR_OBS: '' };
  SGO_DATA.update(SGO_CFG.SHEETS.REG_FROTA_MOVIMENTACAO, mov.ID, upd);
  Object.assign(mov, upd);
  if (k.divergente) {
    Frota_auditar_(sessao || RASTR_SISTEMA, {
      acao: 'RASTREADOR_KM_DIVERGENTE_CHEGADA', veiculoId: SGO_UTILS.safe(veiculo.ID), placa: SGO_UTILS.safe(veiculo.PLACA), movimentacaoId: SGO_UTILS.safe(mov.ID),
      condutorId: SGO_UTILS.safe(mov.CONDUTOR_ID), campo: 'KM_RODADO', antes: d.km, depois: rodado,
      detalhe: 'KM rodado informado ' + Frota_kmTexto_(rodado) + ' km (saída ' + Frota_kmTexto_(saida) + ', chegada ' + Frota_kmTexto_(chegada) + ') e distância medida pelo rastreador no período ' +
        Frota_kmTexto_(d.km) + ' km (diferença de ' + Frota_kmTexto_(k.dif) + ' km; tolerância de ' + RASTR_KM_TOLERANCIA + ' km ou ' + RASTR_KM_TOLERANCIA_PCT + '%). A gestão confere em KM a conferir.'
    });
  }
  return { fonte: 'RESUMO', km: d.km, rodado: rodado, dif: k.dif, divergente: k.divergente };
}

/** Conferência da devolução já feita (pelo hodômetro, pelo resumo ou com o motivo de não ter como conferir). */
function Rastreador_kmChegadaFeito_(m) {
  var v = function (x) { return String(x === undefined || x === null ? '' : x).trim(); };
  return v(m.KM_RASTREADOR_RODADO) !== '' || v(m.KM_RASTREADOR_OBS) !== '';
}

/**
 * Diferença fixa entre o painel e o hodômetro do aparelho, da retirada mais recente que tem os dois
 * (KM de saída - hodômetro na saída). Só para mostrar à gestão o "KM do painel estimado"; não entra em regra.
 */
function Rastreador_deslocamentosPainel_(movs) {
  var out = {};
  (movs || []).forEach(function (m) {
    var vid = SGO_UTILS.safe(m.VEICULO_ID);
    var ks = Rastreador_numOuNulo_(m.KM_SAIDA), os = Rastreador_numOuNulo_(m.KM_RASTREADOR_SAIDA);
    if (!vid || ks === null || os === null) return;
    var em = String(m.CRIADO_EM || '');
    if (!out[vid] || em > out[vid].em) out[vid] = { em: em, deslocamento: ks - os };
  });
  return out;
}

// ------------------------------------------------------------
// GANCHOS DA RETIRADA E DA DEVOLUÇÃO (nunca lançam erro; a movimentação já está gravada)
// Pontos de entrada únicos chamados por Frota_apiIniciarViagem / Frota_apiFinalizarViagem,
// depois de gravar e de soltar a trava. Quem mexer nas telas de retirada/devolução só precisa
// manter estas duas chamadas e mostrar resultado.aviso (retirada) e resultado.texto.
// Nada de localização volta para a tela do técnico.
// ------------------------------------------------------------
function Frota_rastreadorAoRetirar_(sessao, veiculoId, movId) {
  try { return typeof Rastreador_aposRetirada_ === 'function' ? Rastreador_aposRetirada_(sessao, veiculoId, movId) : { ativo: false }; }
  catch (e) { console.error('Rastreador (retirada): ' + Rastreador_limpar_(e && e.message, null)); return { ativo: false, erro: true }; }
}

function Frota_rastreadorAoDevolver_(sessao, veiculoId, movId) {
  try { return typeof Rastreador_aposDevolucao_ === 'function' ? Rastreador_aposDevolucao_(sessao, veiculoId, movId) : { ativo: false }; }
  catch (e) { console.error('Rastreador (devolução): ' + Rastreador_limpar_(e && e.message, null)); return { ativo: false, erro: true }; }
}

/** Resultado do KM para a tela (sem posição nem local). */
function Rastreador_kmParaTela_(k) {
  return k ? { fonte: k.fonte, divergente: !!k.divergente } : null;
}

function Rastreador_aposRetirada_(sessao, veiculoId, movId) {
  var c = Rastreador_cfg_();
  if (!c.ligado) return { ativo: false };
  var placa = '';
  try {
    Rastreador_garantirAbas_();
    var veiculo = SGO_DATA.getById(SGO_CFG.SHEETS.CAD_VEICULOS, veiculoId) || {};
    placa = SGO_UTILS.safe(veiculo.PLACA);
    var dev = SGO_UTILS.safe(veiculo.RASTREADOR_DEVICE_ID);
    if (!dev) return { ativo: false, semDispositivo: true };
    // Nova retirada: bloqueio pendente da devolução anterior não vale mais (só existe com provedor com comandos).
    Rastreador_cancelarPendentes_(veiculoId, 'BLOQUEAR', 'Nova retirada registrada antes de o bloqueio ser enviado.');
    var mov = SGO_DATA.getById(SGO_CFG.SHEETS.REG_FROTA_MOVIMENTACAO, movId);
    var km = null, erroLeitura = '';
    try {
      var pos = Rastreador_lerPosicoes_(c, dev, { aceitarCacheSeg: 150 })[dev];
      km = Rastreador_conferirKm_(mov, veiculo, 'SAIDA', pos, sessao);
      Rastreador_conexaoOk_();
    } catch (eLe) {
      erroLeitura = Rastreador_limpar_(eLe && eLe.message, c);
      if (!eLe.rastreadorIntervalo) Rastreador_falhaConexao_(erroLeitura);
    }
    if (!c.bloqueio || SGO_UTILS.safeUpper(veiculo.RASTREADOR_ACEITA_BLOQUEIO) === 'NAO') {
      return { ativo: true, bloqueio: false, km: Rastreador_kmParaTela_(km), liberado: null, texto: '' };
    }
    return Rastreador_liberarNaRetirada_(c, sessao, veiculo, movId, km, erroLeitura);
  } catch (e) {
    var m = Rastreador_limpar_(e && e.message, c);
    console.error('Rastreador após retirada: ' + m);
    return { ativo: true, bloqueio: !!c.bloqueio, liberado: c.bloqueio ? false : null, aviso: c.bloqueio ? 'Partida não liberada pelo rastreador: falha interna do SGO+ (' + m + '). Peça à gestão para liberar.' : '', texto: '' };
  }
}

function Rastreador_aposDevolucao_(sessao, veiculoId, movId) {
  var c = Rastreador_cfg_();
  if (!c.ligado) return { ativo: false };
  try {
    Rastreador_garantirAbas_();
    var veiculo = SGO_DATA.getById(SGO_CFG.SHEETS.CAD_VEICULOS, veiculoId) || {};
    var dev = SGO_UTILS.safe(veiculo.RASTREADOR_DEVICE_ID);
    if (!dev) return { ativo: false, semDispositivo: true };
    Rastreador_cancelarPendentes_(veiculoId, 'LIBERAR', 'Retirada devolvida antes de a liberação ser enviada.');
    var mov = SGO_DATA.getById(SGO_CFG.SHEETS.REG_FROTA_MOVIMENTACAO, movId);
    var pos = null, erroLeitura = '', km = null;
    try {
      // com o bloqueio ligado a posição decide o comando: sempre leitura nova (nunca a guardada)
      pos = Rastreador_lerPosicoes_(c, dev, c.bloqueio ? { fresco: true } : { aceitarCacheSeg: 60 })[dev] || null;
      Rastreador_gravarChegada_(veiculo, movId, pos);
      km = Rastreador_conferirKm_(mov, veiculo, 'CHEGADA', pos, sessao);
      // sem o hodômetro da retirada (ou aparelho sem hodômetro), confere pela distância do período
      if (pos && (!km || km.precisaResumo)) km = Rastreador_conferirKmPorResumo_(c, mov, veiculo, sessao);
      Rastreador_conexaoOk_();
    } catch (eLe) {
      erroLeitura = Rastreador_limpar_(eLe && eLe.message, c);
      if (!eLe.rastreadorIntervalo) Rastreador_falhaConexao_(erroLeitura);
    }
    if (!c.bloqueio || SGO_UTILS.safeUpper(veiculo.RASTREADOR_ACEITA_BLOQUEIO) === 'NAO') return { ativo: true, bloqueio: false, km: Rastreador_kmParaTela_(km), texto: '' };
    return Rastreador_bloquearNaDevolucao_(c, sessao, veiculo, movId, pos, km, erroLeitura);
  } catch (e) {
    console.error('Rastreador após devolução: ' + Rastreador_limpar_(e && e.message, c));
    return { ativo: true, bloqueado: false, texto: '' };
  }
}

// ------------------------------------------------------------
// ROTINA (a cada 2 minutos; nenhuma chamada com RASTREADOR_LIGADO desligado)
// ------------------------------------------------------------
/** Gatilho de tempo. Nome sem "_" no fim para o Google achar; recusada quando chamada pelo navegador. */
function Frota_rastreadorRotina() {
  if (!SGO_execucaoInterna_()) return null;
  // LGPD: a limpeza do prazo de retenção roda mesmo com o rastreador desligado (não chama a empresa do rastreador).
  try { Rastreador_limparRetencao_(false); } catch (eL) { console.error('Retenção do rastreador: ' + ((eL && eL.message) || eL)); }
  // 20/10/2026: reservas de veículo (não comparecimento, devolução atrasada com reserva a seguir, véspera, e-mails no expediente).
  // Roda mesmo com o rastreador desligado; no máximo a cada 4 minutos (SGO_Frota_Reservas.js).
  try { if (typeof FrotaRes_rodada_ === 'function') FrotaRes_rodada_({}); } catch (eRes) { console.error('Rotina das reservas da Frota: ' + ((eRes && eRes.message) || eRes)); }
  try { return Rastreador_rodada_({}); }
  catch (e) { console.error('Rotina do rastreador: ' + Rastreador_limpar_(e && e.message, Rastreador_cfg_())); return { erro: true }; }
}

/** Instala a rotina (uma só). No Google o menor intervalo é 1 minuto; a própria rodada respeita ~2 min. */
function Frota_rastreadorGarantirRotina_() {
  var tem = ScriptApp.getProjectTriggers().some(function (t) { return t.getHandlerFunction() === RASTR_FUNCAO_ROTINA; });
  if (tem) return 'já instalada';
  var noServidor = false;
  try { noServidor = ScriptApp.getScriptId() === 'sgo-servidor'; } catch (e) {}
  ScriptApp.newTrigger(RASTR_FUNCAO_ROTINA).timeBased().everyMinutes(noServidor ? 2 : 1).create();
  return 'instalada';
}

function Rastreador_rodada_(o) {
  o = o || {};
  var c = Rastreador_cfg_();
  if (!c.ligado) return { ligado: false, texto: 'Rastreador desligado (RASTREADOR_LIGADO): nenhuma chamada feita.' };
  var props = PropertiesService.getScriptProperties();
  var cache = CacheService.getScriptCache();
  var intervalo = (o.manual ? RASTR_INTERVALO_MANUAL_SEG : RASTR_INTERVALO_ROTINA_SEG) * 1000;
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) return { ligado: true, pulada: true, texto: 'O sistema está ocupado; a leitura fica para a próxima rodada.' };
  try {
    var ultima = Number(props.getProperty(RASTR_PROP_ULTIMA_RODADA) || 0);
    if (cache.get(RASTR_CACHE_RODADA)) return { ligado: true, pulada: true, texto: 'Já há uma leitura do rastreador em andamento. Aguarde um minuto.' };
    if (Date.now() - ultima < intervalo) return { ligado: true, pulada: true, texto: 'O rastreador foi lido há menos de ' + Math.round(intervalo / 1000) + ' segundos (limite do rastreador). Aguarde e tente de novo.' };
    if (o.manual) {
      var desdePos = Date.now() - Number(cache.get(RASTR_CACHE_ULTIMAS_POSICOES) || 0);
      if (desdePos < RASTR_POSICOES_MIN_SEG * 1000) return { ligado: true, pulada: true, texto: 'O rastreador só aceita ler as posições a cada ' + RASTR_POSICOES_MIN_SEG + ' segundos. Tente de novo em ' + Math.ceil((RASTR_POSICOES_MIN_SEG * 1000 - desdePos) / 1000) + ' segundos.' };
    }
    props.setProperty(RASTR_PROP_ULTIMA_RODADA, String(Date.now()));
    cache.put(RASTR_CACHE_RODADA, '1', 120);
  } finally { lock.releaseLock(); }

  var out = { ligado: true, bloqueio: c.bloqueio, somenteLeitura: !c.comandos, posicoes: 0, enviados: [], pendentes: [], cancelados: 0, usoSemRegistro: [], km: [], chegadas: 0, erro: '' };
  try {
    Rastreador_garantirAbas_();
    var posicoes;
    try {
      // uma leitura de /positions por rodada; se outra tela leu há menos de 30 s, a rotina espera o que falta
      posicoes = Rastreador_lerPosicoes_(c, '', { esperar: true });
    } catch (e) {
      out.erro = Rastreador_limpar_(e && e.message, c);
      Rastreador_falhaConexao_(out.erro);
      if (c.comandos) {
        Rastreador_pendentes_().forEach(function (cmd) {
          SGO_DATA.update(RASTR_ABA_COMANDOS, cmd.ID, { MOTIVO: 'Aguardando: ' + out.erro + '.', ULTIMA_TENTATIVA_EM: SGO_UTILS.nowIso() });
        });
        Rastreador_verificarAtrasos_();
      }
      return out;
    }
    Rastreador_conexaoOk_();
    out.posicoes = Object.keys(posicoes).length;

    var inicio = Date.now();
    var veiculos = Frota_lerSeExistir_(SGO_CFG.SHEETS.CAD_VEICULOS);
    var porId = {};
    veiculos.forEach(function (v) { porId[SGO_UTILS.safe(v.ID)] = v; });
    // 20/10/2026 (rastreamento): cada leitura vira ponto da rota guardada (tabela própria no servidor) e a rota
    // completa do período é importada aos poucos (SGO_Frota_Rastreamento.js). Nunca lança.
    if (typeof FrotaR_aposLeitura_ === 'function') out.pontosRota = FrotaR_aposLeitura_(c, posicoes, veiculos, inicio).pontos;
    var movs = Frota_lerSeExistir_(SGO_CFG.SHEETS.REG_FROTA_MOVIMENTACAO);
    var abertas = {}, ultimaDevolucao = {};
    movs.forEach(function (m) {
      var vid = SGO_UTILS.safe(m.VEICULO_ID);
      if (Frota_movimentoAberto_(m)) abertas[vid] = m;
      var fim = new Date(SGO_UTILS.safe(m.FINALIZADO_EM)).getTime();
      if (isFinite(fim) && (!ultimaDevolucao[vid] || fim > ultimaDevolucao[vid])) ultimaDevolucao[vid] = fim;
    });

    // 1) comandos pendentes: só com provedor com comandos; com o acesso atual, pendências antigas são canceladas.
    if (!c.comandos) {
      Rastreador_pendentes_().forEach(function (cmd) { Rastreador_encerrar_(cmd, 'CANCELADO', RASTR_TEXTO_SOMENTE_LEITURA); out.cancelados++; });
    } else {
      Rastreador_rodadaComandos_(c, out, porId, abertas, posicoes, inicio);
    }

    // 2) uso sem registro, 3) KM e ponto de chegada que não foram lidos na hora da retirada/devolução
    var agora = Date.now();
    var resumos = 0;
    veiculos.forEach(function (v) {
      var dev = SGO_UTILS.safe(v.RASTREADOR_DEVICE_ID);
      if (!dev || SGO_UTILS.safeUpper(v.STATUS) === 'INATIVO') return;
      var pos = posicoes[dev];
      if (!pos) return;
      var vid = SGO_UTILS.safe(v.ID);
      var recente = pos.quandoMs && (agora - pos.quandoMs) <= RASTR_POSICAO_RECENTE_USO_MIN * 60000;
      // 19/10/2026: ignição desligada com velocidade baixa é oscilação do GPS, não uso (Rastreador_movimento_)
      var mvto = Rastreador_movimento_(pos);
      var emUso = mvto.estado === 'ANDANDO' || mvto.estado === 'LIGADO';
      var carencia = ultimaDevolucao[vid] && (agora - ultimaDevolucao[vid]) < RASTR_CARENCIA_DEVOLUCAO_MIN * 60000;
      if (!abertas[vid] && recente && emUso && !carencia) {
        var estado = mvto.texto;
        var local = Rastreador_localTexto_(pos);
        var a = Rastreador_abrirAlerta_('USO_SEM_REGISTRO', 'USO:' + vid, {
          veiculoId: vid, placa: SGO_UTILS.safe(v.PLACA), deviceId: dev, quando: pos.quandoTexto, local: local, link: pos.link,
          detalhe: 'Veículo ' + SGO_UTILS.safe(v.PLACA) + ' em uso sem retirada registrada no SGO+ (' + estado + ') às ' + pos.quandoTexto + ', em ' + local + '.'
        });
        out.usoSemRegistro.push(SGO_UTILS.safe(v.PLACA));
        if (a.novo) {
          // LGPD: a trilha de auditoria e o aviso por e-mail/WhatsApp não levam a localização; ela fica só no alerta (só a gestão vê).
          Frota_auditar_(RASTR_SISTEMA, { acao: 'RASTREADOR_USO_SEM_REGISTRO', veiculoId: vid, placa: SGO_UTILS.safe(v.PLACA), campo: 'USO',
            detalhe: 'Uso sem registro: ' + estado + ' às ' + pos.quandoTexto + '. Local no alerta ' + SGO_UTILS.safe(a.alerta.ID) + ' (Frota > Rastreador; apagado depois de ' + c.retencaoDias + ' dias).' });
          Rastreador_avisarGestao_('Uso sem registro: veículo ' + SGO_UTILS.safe(v.PLACA),
            'O rastreador mostra o veículo ' + SGO_UTILS.safe(v.PLACA) + ' em uso sem retirada registrada no SGO+.\nHora: ' + pos.quandoTexto + '\nSituação: ' + estado +
            '\nLocal e mapa: na Central de pendências e em Frota > Rastreador (só a gestão).' +
            '\n\nConfirme com a equipe quem está com o veículo. Se foi esquecimento, a gestão registra a retirada no lugar do condutor, com justificativa. Depois de conferir, marque o alerta como conferido em Frota > Rastreador.', a.alerta.ID, 'S35');
        }
      }
      movs.forEach(function (m) {
        if (SGO_UTILS.safe(m.VEICULO_ID) !== vid) return;
        if (Frota_movimentoAberto_(m)) {
          var criado = new Date(SGO_UTILS.safe(m.CRIADO_EM)).getTime();
          if (String(m.KM_RASTREADOR_SAIDA === undefined ? '' : m.KM_RASTREADOR_SAIDA).trim() === '' && isFinite(criado) && agora - criado < 10 * 60000) {
            var k1 = Rastreador_conferirKm_(m, v, 'SAIDA', pos, RASTR_SISTEMA); if (k1) out.km.push(SGO_UTILS.safe(v.PLACA) + ' saída');
          }
          return;
        }
        var fim = new Date(SGO_UTILS.safe(m.FINALIZADO_EM)).getTime();
        if (SGO_UTILS.safeUpper(m.STATUS) !== 'FINALIZADO' || !isFinite(fim)) return;
        // ponto de chegada que faltou (devolução dos últimos 15 minutos, veículo ainda parado)
        if (agora - fim < 15 * 60000 && !emUso && Rastreador_gravarChegada_(v, SGO_UTILS.safe(m.ID), pos)) out.chegadas++;
        if (agora - fim >= 2 * 3600000 || Rastreador_kmChegadaFeito_(m)) return;
        // hodômetro da devolução: lido uma vez só (veículo parado); retirada sem o hodômetro da saída = confere pelo resumo
        var temOdoChegada = Rastreador_numOuNulo_(m.KM_RASTREADOR_CHEGADA) !== null;
        var precisaResumo = pos.odometroKm === null || Rastreador_numOuNulo_(m.KM_RASTREADOR_SAIDA) === null;
        if (!precisaResumo && !temOdoChegada) {
          if (!emUso) { var k2 = Rastreador_conferirKm_(m, v, 'CHEGADA', pos, RASTR_SISTEMA); if (k2 && !k2.precisaResumo) out.km.push(SGO_UTILS.safe(v.PLACA) + ' chegada'); }
        } else if (resumos < RASTR_RESUMOS_POR_RODADA && Date.now() - inicio < RASTR_ORCAMENTO_RODADA_MS) {
          resumos++;
          try { var k3 = Rastreador_conferirKmPorResumo_(c, m, v, RASTR_SISTEMA); if (k3 && k3.km !== null) out.km.push(SGO_UTILS.safe(v.PLACA) + ' rodado'); }
          catch (eR) { if (eR && eR.rastreadorRede) Rastreador_falhaConexao_(Rastreador_limpar_(eR.message, c)); }
        }
      });
    });

    if (c.comandos) Rastreador_verificarAtrasos_();
    return out;
  } finally {
    try { cache.remove(RASTR_CACHE_RODADA); } catch (e) {}
    try { if (typeof SGO_Pendencias_invalidar_ === 'function') SGO_Pendencias_invalidar_(); } catch (e2) {}
  }
}

// ------------------------------------------------------------
// LGPD: PRAZO DE RETENÇÃO (RASTREADOR_RETENCAO_DIAS, padrão 90)
// ------------------------------------------------------------
/**
 * Apaga os pontos de chegada mais velhos que o prazo e tira o local (endereço, mapa) dos alertas cujo último
 * registro passou do prazo. Uma vez por dia (forcar = agora). Não chama a empresa do rastreador. Devolve { pontos, alertas }.
 */
function Rastreador_limparRetencao_(forcar) {
  var props = PropertiesService.getScriptProperties();
  var ult = Number(props.getProperty(RASTR_PROP_ULTIMA_LIMPEZA) || 0);
  if (!forcar && Date.now() - ult < 20 * 3600000) return { pulada: true };
  props.setProperty(RASTR_PROP_ULTIMA_LIMPEZA, String(Date.now()));
  var c = Rastreador_cfg_();
  var limite = Date.now() - c.retencaoDias * 86400000;
  var velho = function (iso) { var t = new Date(SGO_UTILS.safe(iso)).getTime(); return isFinite(t) && t < limite; };
  var out = { pontos: 0, alertas: 0, rotas: 0, dias: c.retencaoDias };
  // 20/10/2026: pontos das rotas guardadas (tabela própria no servidor): só os mais velhos que o prazo.
  if (typeof FrotaR_limparRotas_ === 'function') {
    try { out.rotas = FrotaR_limparRotas_(c.retencaoDias); } catch (eR) { console.error('Retenção das rotas: ' + ((eR && eR.message) || eR)); }
  }
  Frota_lerSeExistir_(RASTR_ABA_PONTOS).forEach(function (p) {
    if (velho(p.CRIADO_EM)) { SGO_DATA.remove(RASTR_ABA_PONTOS, p.ID); out.pontos++; }
  });
  var marca = '(local apagado após ' + c.retencaoDias + ' dias)';
  Frota_lerSeExistir_(RASTR_ABA_ALERTAS).forEach(function (a) {
    var local = SGO_UTILS.safe(a.LOCAL), link = SGO_UTILS.safe(a.LINK_MAPA);
    if ((!local && !link) || !velho(a.ULTIMO_EM || a.CRIADO_EM)) return;
    var det = SGO_UTILS.safe(a.DETALHE);
    if (local) det = det.split(local).join(marca);
    if (link) det = det.split(link).join('');
    SGO_DATA.update(RASTR_ABA_ALERTAS, a.ID, { LOCAL: '', LINK_MAPA: '', DETALHE: det.slice(0, 1000) });
    out.alertas++;
  });
  if (out.pontos || out.alertas || out.rotas) {
    try { SGO_DATA.log('FROTA_RASTREADOR_RETENCAO', 'sistema', 'Prazo de ' + c.retencaoDias + ' dias: ' + out.pontos + ' ponto(s) de chegada apagado(s), ' + out.rotas + ' ponto(s) de rota apagado(s) e local retirado de ' + out.alertas + ' alerta(s).', 'FROTA'); } catch (e) {}
  }
  return out;
}

// ------------------------------------------------------------
// COMANDOS (bloqueio e liberação da partida). Caminho completo, com as travas de segurança; só age com os
// endereços RASTREADOR_CMD_BLOQUEIO_URL e RASTREADOR_CMD_LIBERACAO_URL preenchidos (c.comandos). Sem eles
// (acesso somente leitura de hoje) nada aqui envia, e Rastreador_chamar_ recusa qualquer método além de GET.
// ------------------------------------------------------------
/** Endereço do comando: absoluto ou caminho a partir da URL base; {deviceId} é trocado pelo ID do dispositivo. */
function Rastreador_enderecoComando_(c, tipo, deviceId) {
  var e = tipo === 'engineStop' ? c.cmdBloqueio : c.cmdLiberacao;
  return String(e || '').split('{deviceId}').join(encodeURIComponent(String(deviceId)));
}

/** Pode bloquear? Só com posição recente, parado (abaixo de 5 km/h, sem movimento) e ignição desligada. */
function Rastreador_avaliarParado_(pos) {
  if (!pos) return { pode: false, motivo: 'o rastreador não tem posição deste veículo' };
  var idadeMin = pos.quandoMs ? (Date.now() - pos.quandoMs) / 60000 : Infinity;
  if (idadeMin > RASTR_POSICAO_MAX_IDADE_BLOQUEIO_MIN) {
    return { pode: false, motivo: 'a última posição é de ' + (pos.quandoTexto || 'data desconhecida') + ' (mais de ' + RASTR_POSICAO_MAX_IDADE_BLOQUEIO_MIN +
      ' minutos); sem posição recente o bloqueio não é enviado, para o comando não ficar na fila do rastreador e chegar com o veículo andando' };
  }
  if (pos.kmh === null) return { pode: false, motivo: 'a última posição (' + pos.quandoTexto + ') não informa a velocidade' };
  // 19/10/2026: para BLOQUEAR vale a regra mais segura: ignição desligada E menos de 5 km/h, mesmo quando a velocidade é só oscilação do GPS.
  if (pos.ignicao === false && pos.kmh >= RASTR_VEL_PARADO_KMH && pos.kmh < RASTR_VEL_DERIVA_MAX_KMH && pos.movimento !== true) {
    return { pode: false, motivo: 'o GPS marca ' + Rastreador_num_(pos.kmh, 0) + ' km/h com a ignição desligada (oscilação do sinal); por segurança o bloqueio espera a velocidade marcar menos de ' + RASTR_VEL_PARADO_KMH + ' km/h' };
  }
  if (pos.kmh >= RASTR_VEL_PARADO_KMH || pos.movimento === true) {
    return { pode: false, motivo: 'veículo em movimento (' + Rastreador_num_(pos.kmh, 0) + ' km/h às ' + pos.quandoTexto.slice(-5) + ')' };
  }
  if (pos.ignicao === null) return { pode: false, motivo: 'o rastreador não informa a ignição; sem confirmar a ignição desligada o bloqueio não é enviado' };
  if (pos.ignicao === true) return { pode: false, motivo: 'ignição ligada (às ' + pos.quandoTexto.slice(-5) + ')' };
  return { pode: true, motivo: '' };
}

function Rastreador_exigirComandos_(c) {
  if (!c.comandos) throw new Error(RASTR_TEXTO_SOMENTE_LEITURA + ' Nada foi enviado.');
}

/** Envia engineStop / engineResume. { ok, naFila, motivo, rede }. Nunca lança erro. */
function Rastreador_enviar_(c, deviceId, tipo) {
  if (!c.comandos) return { ok: false, motivo: RASTR_TEXTO_SOMENTE_LEITURA };
  try {
    var dev = /^\d+$/.test(String(deviceId)) ? Number(deviceId) : String(deviceId);
    var res = Rastreador_chamar_(c, 'post', Rastreador_enderecoComando_(c, tipo, deviceId), [], { deviceId: dev, type: tipo }, { comando: true });
    if (res.http === 200 || res.http === 201 || res.http === 204) return { ok: true, naFila: false, motivo: '' };
    if (res.http === 202) return { ok: true, naFila: true, motivo: 'aceito pela plataforma e guardado na fila: o aparelho recebe quando se conectar' };
    if (res.http === 401 || res.http === 403) return { ok: false, motivo: 'a empresa do rastreador recusou o comando por permissão (HTTP ' + res.http + '); a chave de comandos precisa poder bloquear e liberar (Chaves e senhas > Rastreador da frota)' };
    if (res.http === 404) return { ok: false, motivo: 'a empresa do rastreador não reconheceu o endereço do comando (HTTP 404); confira o endereço do comando de ' + (tipo === 'engineStop' ? 'bloqueio' : 'liberação') + ' em Chaves e senhas' };
    if (res.http === 429) return { ok: false, rede: true, motivo: 'a empresa do rastreador limitou as consultas (HTTP 429); o SGO+ tenta de novo na próxima rodada' };
    if (res.http >= 400 && res.http < 500) return { ok: false, rede: res.http === 429, motivo: 'o rastreador recusou o comando (HTTP ' + res.http + (res.txt ? ': ' + Rastreador_limpar_(res.txt.slice(0, 160), c) : '') + ')' };
    return { ok: false, rede: res.http >= 500, motivo: 'o rastreador respondeu HTTP ' + res.http + ' ao comando' };
  } catch (e) {
    return { ok: false, rede: !!(e && e.rastreadorRede), motivo: Rastreador_limpar_(e && e.message, c) };
  }
}

function Rastreador_novoComando_(veiculo, acao, origem, movId, sessao, justificativa) {
  var reg = SGO_DATA.normalizarObjetoParaSheet(RASTR_ABA_COMANDOS, SGO_DATA.gerarRegistroBase({
    VEICULO_ID: SGO_UTILS.safe(veiculo.ID), PLACA: SGO_UTILS.safe(veiculo.PLACA), DEVICE_ID: SGO_UTILS.safe(veiculo.RASTREADOR_DEVICE_ID),
    MOVIMENTACAO_ID: movId || '', ACAO: acao, ORIGEM: origem, SITUACAO: 'PENDENTE', PEDIDO_EM: SGO_UTILS.nowIso(),
    PEDIDO_POR_ID: SGO_UTILS.safe(sessao && sessao.userId), PEDIDO_POR_NOME: SGO_UTILS.safe(sessao && (sessao.nome || sessao.usuario)),
    JUSTIFICATIVA: justificativa || '', TENTATIVAS: 0, ULTIMA_TENTATIVA_EM: '', MOTIVO: '', ENVIADO_EM: '', ALERTA_ATRASO_EM: '', ENCERRADO_EM: '', ENCERRADO_MOTIVO: ''
  }));
  SGO_DATA.insert(RASTR_ABA_COMANDOS, reg);
  return reg;
}

/** Uma tentativa de enviar o comando, respeitando as regras. Atualiza a linha. Devolve { enviado, naFila, motivo, rede }. */
function Rastreador_tentar_(c, cmd, veiculo, pos, sessao) {
  var acao = SGO_UTILS.safeUpper(cmd.ACAO);
  var agora = SGO_UTILS.nowIso();
  var upd = { ULTIMA_TENTATIVA_EM: agora };
  var r;
  if (acao === 'BLOQUEAR') {
    var av = Rastreador_avaliarParado_(pos);
    if (!av.pode) {
      upd.MOTIVO = 'Aguardando: ' + av.motivo + '.';
      SGO_DATA.update(RASTR_ABA_COMANDOS, cmd.ID, upd); Object.assign(cmd, upd);
      return { enviado: false, motivo: av.motivo };
    }
    r = Rastreador_enviar_(c, cmd.DEVICE_ID, 'engineStop');
  } else {
    r = Rastreador_enviar_(c, cmd.DEVICE_ID, 'engineResume');
  }
  upd.TENTATIVAS = (Number(cmd.TENTATIVAS) || 0) + 1;
  if (r.ok) {
    upd.SITUACAO = 'ENVIADO'; upd.ENVIADO_EM = agora; upd.MOTIVO = r.naFila ? r.motivo : '';
    upd.ENCERRADO_EM = agora; upd.ENCERRADO_MOTIVO = acao === 'BLOQUEAR' ? 'Bloqueio enviado com o veículo parado e a ignição desligada.' : 'Liberação enviada.';
  } else {
    upd.MOTIVO = 'Não enviado: ' + r.motivo + '.';
  }
  SGO_DATA.update(RASTR_ABA_COMANDOS, cmd.ID, upd); Object.assign(cmd, upd);
  Frota_auditar_(sessao || RASTR_SISTEMA, {
    acao: r.ok ? (acao === 'BLOQUEAR' ? 'RASTREADOR_BLOQUEIO_ENVIADO' : 'RASTREADOR_LIBERACAO_ENVIADA') : (acao === 'BLOQUEAR' ? 'RASTREADOR_BLOQUEIO_FALHOU' : 'RASTREADOR_LIBERACAO_FALHOU'),
    veiculoId: SGO_UTILS.safe(cmd.VEICULO_ID), placa: SGO_UTILS.safe(cmd.PLACA), movimentacaoId: SGO_UTILS.safe(cmd.MOVIMENTACAO_ID),
    campo: 'PARTIDA', depois: r.ok ? (acao === 'BLOQUEAR' ? 'BLOQUEADA' : 'LIBERADA') : '', justificativa: SGO_UTILS.safe(cmd.JUSTIFICATIVA),
    detalhe: (acao === 'BLOQUEAR' ? 'Bloqueio da partida' : 'Liberação da partida') + ' do veículo ' + SGO_UTILS.safe(cmd.PLACA) + ' (dispositivo ' + SGO_UTILS.safe(cmd.DEVICE_ID) + ', pedido por ' +
      (SGO_UTILS.safe(cmd.PEDIDO_POR_NOME) || 'rotina') + ' em ' + SGO_UTILS.safe(cmd.ORIGEM).toLowerCase() + '): ' + (r.ok ? 'enviado' + (r.naFila ? ' (na fila da plataforma)' : '') + '.' : 'não enviado, ' + r.motivo + '.') +
      (acao === 'BLOQUEAR' && pos ? ' Posição usada: ' + pos.quandoTexto + ', ' + Rastreador_num_(pos.kmh, 0) + ' km/h, ignição ' + (pos.ignicao ? 'ligada' : 'desligada') + '.' : '')
  });
  return { enviado: !!r.ok, naFila: !!r.naFila, motivo: r.motivo || '', rede: !!r.rede };
}

/** Retirada com provedor com comandos: engineResume (falhou: a retirada vale, aviso e alerta à gestão; a rotina tenta de novo). */
function Rastreador_liberarNaRetirada_(c, sessao, veiculo, movId, km, erroLeitura) {
  var placa = SGO_UTILS.safe(veiculo.PLACA);
  var cmd = Rastreador_novoComando_(veiculo, 'LIBERAR', 'RETIRADA', movId, sessao, '');
  var r = Rastreador_tentar_(c, cmd, veiculo, null, sessao);
  if (r.rede) Rastreador_falhaConexao_(r.motivo); else if (r.enviado) Rastreador_conexaoOk_();
  if (r.enviado) return { ativo: true, bloqueio: true, liberado: true, km: Rastreador_kmParaTela_(km), texto: 'Partida liberada pelo rastreador.' + (r.naFila ? ' O comando está na fila da plataforma e chega ao veículo quando o aparelho se conectar.' : '') };
  var aviso = 'Partida não liberada pelo rastreador: ' + r.motivo + '. Peça à gestão para liberar.';
  Rastreador_avisarGestao_('Partida não liberada: veículo ' + placa,
    'A retirada do veículo ' + placa + ' foi registrada por ' + SGO_UTILS.safe(sessao && (sessao.nome || sessao.usuario)) + ', mas o rastreador não liberou a partida (' + r.motivo + ').\n' +
    'O condutor está aguardando. Libere em Frota > Rastreador > "Liberar partida" ou pelo aplicativo do rastreador. O SGO+ tenta de novo a cada 2 minutos enquanto a retirada estiver aberta.', cmd.ID, 'S36');
  return { ativo: true, bloqueio: true, liberado: false, km: Rastreador_kmParaTela_(km), aviso: aviso, erroLeitura: erroLeitura };
}

/** Devolução com provedor com comandos: bloqueio PENDENTE, só enviado com o veículo parado e a ignição desligada. */
function Rastreador_bloquearNaDevolucao_(c, sessao, veiculo, movId, pos, km, erroLeitura) {
  var cmd = Rastreador_novoComando_(veiculo, 'BLOQUEAR', 'DEVOLUCAO', movId, sessao, '');
  if (erroLeitura) {
    SGO_DATA.update(RASTR_ABA_COMANDOS, cmd.ID, { MOTIVO: 'Aguardando: ' + erroLeitura + '.', ULTIMA_TENTATIVA_EM: SGO_UTILS.nowIso() });
    return { ativo: true, bloqueio: true, bloqueado: false, km: Rastreador_kmParaTela_(km), texto: 'Bloqueio da partida pendente: o SGO+ envia quando o rastreador mostrar o veículo parado com a ignição desligada.' };
  }
  var r = Rastreador_tentar_(c, cmd, veiculo, pos, sessao);
  if (r.enviado) return { ativo: true, bloqueio: true, bloqueado: true, km: Rastreador_kmParaTela_(km), texto: 'Partida bloqueada pelo rastreador.' };
  return { ativo: true, bloqueio: true, bloqueado: false, km: Rastreador_kmParaTela_(km), texto: 'Bloqueio da partida pendente (' + r.motivo + '): o SGO+ envia sozinho quando o veículo estiver parado com a ignição desligada. Desligue o veículo normalmente.' };
}

/** Parte da rodada que trata os comandos pendentes (só provedor com comandos). */
function Rastreador_rodadaComandos_(c, out, porId, abertas, posicoes, inicio) {
  Rastreador_pendentes_().forEach(function (cmd) {
    var v = porId[SGO_UTILS.safe(cmd.VEICULO_ID)];
    var dev = v ? SGO_UTILS.safe(v.RASTREADOR_DEVICE_ID) : '';
    if (!v || !dev || dev !== SGO_UTILS.safe(cmd.DEVICE_ID)) { Rastreador_encerrar_(cmd, 'CANCELADO', 'Veículo sem o mesmo dispositivo vinculado.'); out.cancelados++; return; }
    var acao = SGO_UTILS.safeUpper(cmd.ACAO);
    var aberta = abertas[SGO_UTILS.safe(v.ID)];
    if (acao === 'BLOQUEAR' && !c.bloqueio) { Rastreador_encerrar_(cmd, 'CANCELADO', 'Comandos de bloqueio desligados em Chaves e senhas (RASTREADOR_BLOQUEIO_LIGADO).'); out.cancelados++; return; }
    if (acao === 'BLOQUEAR' && SGO_UTILS.safeUpper(cmd.ORIGEM) === 'DEVOLUCAO' && aberta) { Rastreador_encerrar_(cmd, 'CANCELADO', 'Nova retirada registrada antes de o bloqueio ser enviado.'); out.cancelados++; return; }
    if (acao === 'LIBERAR' && SGO_UTILS.safe(cmd.MOVIMENTACAO_ID) && (!aberta || SGO_UTILS.safe(aberta.ID) !== SGO_UTILS.safe(cmd.MOVIMENTACAO_ID))) {
      Rastreador_encerrar_(cmd, 'CANCELADO', 'A retirada já foi devolvida.'); out.cancelados++; return;
    }
    if (Date.now() - inicio > RASTR_ORCAMENTO_RODADA_MS) { out.pendentes.push(SGO_UTILS.safe(cmd.PLACA)); return; }
    var r = Rastreador_tentar_(c, cmd, v, posicoes[dev] || null, RASTR_SISTEMA);
    if (r.enviado) out.enviados.push(acao + ' ' + SGO_UTILS.safe(cmd.PLACA)); else out.pendentes.push(acao + ' ' + SGO_UTILS.safe(cmd.PLACA) + ': ' + r.motivo);
    if (r.rede) Rastreador_falhaConexao_(r.motivo);
  });
}

function Rastreador_verificarAtrasos_() {
  Rastreador_pendentes_(null, 'BLOQUEAR').forEach(function (cmd) {
    var desde = new Date(SGO_UTILS.safe(cmd.PEDIDO_EM)).getTime();
    if (!isFinite(desde) || Date.now() - desde < RASTR_MIN_BLOQUEIO_ATRASADO * 60000 || SGO_UTILS.safe(cmd.ALERTA_ATRASO_EM)) return;
    SGO_DATA.update(RASTR_ABA_COMANDOS, cmd.ID, { ALERTA_ATRASO_EM: SGO_UTILS.nowIso() });
    Frota_auditar_(RASTR_SISTEMA, { acao: 'RASTREADOR_BLOQUEIO_ATRASADO', veiculoId: SGO_UTILS.safe(cmd.VEICULO_ID), placa: SGO_UTILS.safe(cmd.PLACA), movimentacaoId: SGO_UTILS.safe(cmd.MOVIMENTACAO_ID),
      campo: 'PARTIDA', detalhe: 'Bloqueio pendente há mais de ' + RASTR_MIN_BLOQUEIO_ATRASADO + ' minutos. ' + SGO_UTILS.safe(cmd.MOTIVO) });
    Rastreador_avisarGestao_('Bloqueio da partida pendente: veículo ' + SGO_UTILS.safe(cmd.PLACA),
      'O bloqueio da partida do veículo ' + SGO_UTILS.safe(cmd.PLACA) + ' foi pedido em ' + Rastreador_agoraTexto_(new Date(desde)) + ' e ainda não foi enviado.\n' + SGO_UTILS.safe(cmd.MOTIVO) +
      '\n\nO SGO+ só bloqueia com o veículo parado e a ignição desligada. Confira onde está o veículo em Frota > Rastreador; se precisar, bloqueie pelo aplicativo do rastreador.', cmd.ID, 'S37');
  });
}

// ------------------------------------------------------------
// CENTRAL DE PENDÊNCIAS (chamado por Pend_fonteFrota_)
// ------------------------------------------------------------
function Rastreador_pendencias_(add, veiculos, condutores) {
  if (!Pend_abaExiste_(RASTR_ABA_ALERTAS) && !Pend_abaExiste_(RASTR_ABA_COMANDOS)) return;
  if (Pend_abaExiste_(RASTR_ABA_ALERTAS)) Pend_ler_(RASTR_ABA_ALERTAS).forEach(function (a) {
    if (SGO_UTILS.safeUpper(a.SITUACAO) !== 'ABERTO') return;
    var tipo = SGO_UTILS.safeUpper(a.TIPO);
    if (tipo === 'USO_SEM_REGISTRO') {
      var placa = Pend_s_(a.PLACA) || 'veículo não identificado';
      add(Pend_item_('frota_rastreador_uso', {
        id: 'FROTA:RASTR:USO:' + Pend_s_(a.ID), nome: placa, publico: 'GESTAO', gravidade: 'CRITICO', dias: null, vencimento: Pend_s_(a.QUANDO).slice(0, 10),
        responsavel: 'Gestão da frota',
        titulo: 'Uso sem registro: veículo ' + placa + ' às ' + Pend_s_(a.QUANDO),
        detalhe: Pend_s_(a.DETALHE) + (Number(a.OCORRENCIAS) > 1 ? ' Visto em ' + Pend_num_(a.OCORRENCIAS) + ' leituras; última em ' + Pend_s_(a.QUANDO) + '.' : '') + (Pend_s_(a.LINK_MAPA) ? ' Mapa: ' + Pend_s_(a.LINK_MAPA) : ''),
        oQueFazer: 'Confirme com a equipe quem está com o veículo. Se foi esquecimento, registre a retirada no lugar do condutor (com justificativa). Depois marque como conferido em Frota > Rastreador.',
        textoEstavel: 'O veículo \'' + placa + '\' foi usado sem retirada registrada (' + Pend_s_(a.QUANDO) + ').'
      }));
    } else if (tipo === 'CONEXAO') {
      add(Pend_item_('frota_rastreador_conexao', {
        id: 'FROTA:RASTR:CONEXAO', nome: 'Rastreador', publico: 'GESTAO', gravidade: 'ATENCAO', dias: null, vencimento: '', responsavel: 'Gestão da frota',
        titulo: 'Sem comunicação com o rastreador desde ' + Rastreador_agoraTexto_(new Date(Pend_s_(a.PRIMEIRO_EM))),
        detalhe: Pend_s_(a.DETALHE) + ' Tentativas sem sucesso: ' + Pend_num_(a.OCORRENCIAS) + '. Enquanto isso o SGO+ não acompanha o uso sem registro nem confere o KM pelo rastreador.',
        oQueFazer: 'Confira a internet do servidor e se a plataforma do rastreador está no ar. Se a chave de acesso foi recusada (HTTP 401) ou mudou, avise o responsável pelo sistema (Chaves e senhas > Rastreador da frota > Testar conexão).',
        textoEstavel: 'O SGO+ está sem comunicação com o rastreador.'
      }));
    }
  });
  if (!Pend_abaExiste_(RASTR_ABA_COMANDOS)) return;
  Pend_ler_(RASTR_ABA_COMANDOS).forEach(function (cmd) {
    if (SGO_UTILS.safeUpper(cmd.SITUACAO) !== 'PENDENTE') return;
    var placa = Pend_s_(cmd.PLACA) || 'veículo não identificado';
    var desde = new Date(Pend_s_(cmd.PEDIDO_EM));
    var desdeTxt = isNaN(desde.getTime()) ? '' : Rastreador_agoraTexto_(desde);
    if (SGO_UTILS.safeUpper(cmd.ACAO) === 'LIBERAR' && Number(cmd.TENTATIVAS) > 0) {
      var mov = null;
      try { mov = SGO_DATA.getById(SGO_CFG.SHEETS.REG_FROTA_MOVIMENTACAO, cmd.MOVIMENTACAO_ID); } catch (e) {}
      var cnd = mov ? (condutores[Pend_s_(mov.CONDUTOR_ID)] || {}) : {};
      add(Pend_item_('frota_rastreador_liberar', {
        id: 'FROTA:RASTR:LIB:' + Pend_s_(cmd.ID), nome: placa, publico: 'GESTAO', paraUsuarios: [Pend_s_(cnd.USUARIO_ID)], gravidade: 'CRITICO', dias: null, vencimento: desdeTxt.slice(0, 10),
        responsavel: 'Gestão da frota',
        titulo: 'Partida não liberada pelo rastreador: veículo ' + placa,
        detalhe: 'Retirada de ' + (Pend_s_(cnd.NOME) || 'condutor não identificado') + ' registrada em ' + desdeTxt + '. ' + Pend_s_(cmd.MOTIVO) + ' O SGO+ tenta de novo a cada 2 minutos.',
        oQueFazer: 'Libere em Frota > Rastreador > "Liberar partida" (com justificativa) ou pelo aplicativo do rastreador.',
        oQueFazerOutro: 'A gestão foi avisada e libera a partida pelo SGO+ ou pelo aplicativo do rastreador. Aguarde; o aviso some quando a partida for liberada.',
        textoEstavel: 'A partida do veículo \'' + placa + '\' não foi liberada pelo rastreador.'
      }));
    } else if (SGO_UTILS.safeUpper(cmd.ACAO) === 'BLOQUEAR' && !isNaN(desde.getTime()) && Date.now() - desde.getTime() >= RASTR_MIN_BLOQUEIO_ATRASADO * 60000) {
      add(Pend_item_('frota_rastreador_bloqueio', {
        id: 'FROTA:RASTR:BLQ:' + Pend_s_(cmd.ID), nome: placa, publico: 'GESTAO', gravidade: 'ATENCAO', dias: null, vencimento: desdeTxt.slice(0, 10), responsavel: 'Gestão da frota',
        titulo: 'Bloqueio da partida pendente há mais de ' + RASTR_MIN_BLOQUEIO_ATRASADO + ' minutos: veículo ' + placa,
        detalhe: 'Pedido em ' + desdeTxt + ' (' + Pend_s_(cmd.ORIGEM).toLowerCase() + '). ' + Pend_s_(cmd.MOTIVO) + ' O SGO+ só bloqueia com o veículo parado e a ignição desligada.',
        oQueFazer: 'Veja a última posição em Frota > Rastreador. Se o veículo deveria estar parado, confirme com quem devolveu; em emergência, bloqueie pelo aplicativo do rastreador. Uma nova retirada cancela o bloqueio pendente.',
        textoEstavel: 'O bloqueio da partida do veículo \'' + placa + '\' está pendente.'
      }));
    }
  });
}

// ------------------------------------------------------------
// API DA GESTÃO (Frota_apiDispatch). Só a gestão da Frota (Frota_ehGestao_: ADMIN, DIRETORIA, GESTOR, RH, FINANCEIRO).
// ------------------------------------------------------------
function Rastreador_exigirGestao_(sessionId) {
  var sessao = Frota_exigirEquipe_(sessionId);
  if (!Frota_ehGestao_(sessionId)) {
    throw new Error('O rastreador (localização, vínculo e alertas) é só da gestão (Administrador, Diretoria, Gestor, RH ou Financeiro). Para retirar e devolver o veículo, use a tela normal da Frota; em caso de dúvida, procure a gestão.');
  }
  Frota_bootstrap_();
  return sessao;
}

function Rastreador_exigirLigado_(c, oQue) {
  if (!c.ligado) throw new Error('O rastreador está desligado no SGO+ (Chaves e senhas > Rastreador da frota, RASTREADOR_LIGADO). ' + (oQue || ''));
}

function Rastreador_veiculo_(veiculoId) {
  var v = SGO_DATA.getById(SGO_CFG.SHEETS.CAD_VEICULOS, SGO_UTILS.safe(veiculoId));
  if (!v) throw new Error('Veículo não encontrado. Atualize a tela e escolha de novo.');
  return v;
}

function Rastreador_exigirDispositivo_(v) {
  var dev = SGO_UTILS.safe(v.RASTREADOR_DEVICE_ID);
  if (!dev) throw new Error('O veículo ' + v.PLACA + ' não tem aparelho do rastreador ligado. Ligue em Frota > Rastreador > Veículos e aparelhos (escolha o aparelho e clique em Gravar vínculo).');
  return dev;
}

function Rastreador_normalizarPlaca_(s) { return String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); }

/** Sugestão de dispositivo pela placa no nome, no identificador ou no campo placa. */
function Rastreador_sugerir_(placa, dispositivos, usados) {
  var p = Rastreador_normalizarPlaca_(placa);
  if (p.length < 5) return null;
  return dispositivos.filter(function (d) {
    if (usados[d.id]) return false;
    return [d.nome, d.identificador, d.placa].some(function (x) { return Rastreador_normalizarPlaca_(x).indexOf(p) >= 0; });
  })[0] || null;
}

/** Último ponto de chegada de cada veículo (só a gestão vê). */
function Rastreador_ultimasChegadas_() {
  var out = {};
  Frota_lerSeExistir_(RASTR_ABA_PONTOS).forEach(function (p) {
    if (SGO_UTILS.safeUpper(p.TIPO) !== 'CHEGADA') return;
    var vid = SGO_UTILS.safe(p.VEICULO_ID);
    if (!out[vid] || String(p.QUANDO_EM || '') > String(out[vid].QUANDO_EM || '')) out[vid] = p;
  });
  return out;
}

function Frota_apiListarRastreador(sessionId) {
  Rastreador_exigirGestao_(sessionId);
  var c = Rastreador_cfg_();
  var props = PropertiesService.getScriptProperties();
  var out = { ok: true, ligado: c.ligado, bloqueio: c.bloqueio, bloqueioPedido: c.bloqueioPedido, somenteLeitura: !c.comandos, textoSomenteLeitura: c.comandos ? '' : RASTR_TEXTO_SOMENTE_LEITURA,
    comandosIncompletos: !!c.comandosIncompletos, provedor: c.provedor.nome, configurado: Rastreador_temCredencial_(c), retencaoDias: c.retencaoDias,
    endereco: c.url.replace(/^https?:\/\//, ''), ultimaRodada: '', ultimaLeituraOk: '', dispositivos: [], dispositivosErro: '', veiculos: [], comandos: [], alertas: [] };
  var ur = Number(props.getProperty(RASTR_PROP_ULTIMA_RODADA) || 0);
  if (ur) out.ultimaRodada = Rastreador_agoraTexto_(new Date(ur));
  var ul = props.getProperty(RASTR_PROP_ULTIMA_LEITURA);
  if (ul) out.ultimaLeituraOk = Rastreador_agoraTexto_(new Date(ul));

  // A tela usa o que a rotina já leu (cache); só lê na hora se não houver nada guardado e a empresa do rastreador permitir.
  var posicoes = {};
  if (c.ligado && Rastreador_temCredencial_(c)) {
    try { out.dispositivos = Rastreador_lerDispositivos_(c, true); }
    catch (e) { out.dispositivosErro = 'Não foi possível ler a lista de veículos do rastreador: ' + Rastreador_limpar_(e && e.message, c) + '.'; }
    var g = Rastreador_posicoesGuardadas_(c, 900);
    if (g) posicoes = g;
    else if (!out.dispositivosErro) {
      try { posicoes = Rastreador_lerPosicoes_(c, '', {}); }
      catch (e2) { if (!e2.rastreadorIntervalo) out.dispositivosErro = 'Não foi possível ler as posições: ' + Rastreador_limpar_(e2 && e2.message, c) + '.'; }
    }
  }
  var usados = {};
  var chegadas = Rastreador_ultimasChegadas_();
  var deslocamentos = Rastreador_deslocamentosPainel_(Frota_lerSeExistir_(SGO_CFG.SHEETS.REG_FROTA_MOVIMENTACAO));
  var veiculos = Frota_veiculosComSituacao_().filter(function (v) { return SGO_UTILS.safeUpper(v.STATUS) !== 'INATIVO'; })
    .sort(function (a, b) { return SGO_UTILS.safe(a.PLACA).localeCompare(SGO_UTILS.safe(b.PLACA)); });
  veiculos.forEach(function (v) { var d = SGO_UTILS.safe(v.RASTREADOR_DEVICE_ID); if (d) usados[d] = SGO_UTILS.safe(v.PLACA); });
  out.dispositivos = out.dispositivos.map(function (d) { return Object.assign({}, d, { vinculadoA: usados[d.id] || '' }); });
  out.veiculos = veiculos.map(function (v) {
    var dev = SGO_UTILS.safe(v.RASTREADOR_DEVICE_ID);
    var pos = dev ? posicoes[dev] : null;
    var sug = !dev ? Rastreador_sugerir_(v.PLACA, out.dispositivos, usados) : null;
    var ch = chegadas[SGO_UTILS.safe(v.ID)];
    return {
      id: SGO_UTILS.safe(v.ID), placa: SGO_UTILS.safe(v.PLACA), modelo: SGO_UTILS.safe(v.MODELO), situacao: v.SITUACAO, condutorNome: v.CONDUTOR_NOME || '',
      kmAtual: Frota_num_(v.KM_ATUAL, 0), deviceId: dev, deviceNome: SGO_UTILS.safe(v.RASTREADOR_DEVICE_NOME), aceitaBloqueio: c.comandos ? SGO_UTILS.safeUpper(v.RASTREADOR_ACEITA_BLOQUEIO) : '',
      comandosConferidosEm: c.comandos && v.RASTREADOR_COMANDOS_CONFERIDOS_EM ? Rastreador_agoraTexto_(new Date(v.RASTREADOR_COMANDOS_CONFERIDOS_EM)) : '',
      sugestao: sug ? { id: sug.id, nome: sug.nome } : null,
      posicao: pos ? (function () {
        var mv = Rastreador_movimento_(pos), d = deslocamentos[SGO_UTILS.safe(v.ID)];
        // parado = estado do veículo para a tela (oscilação do GPS com a ignição desligada conta como parado);
        // podeBloquear = a regra mais estrita do bloqueio (Rastreador_avaliarParado_).
        return { quando: pos.quandoTexto, kmh: pos.kmh, ignicao: pos.ignicao, movimento: pos.movimento, odometroKm: pos.odometroKm, local: Rastreador_localTexto_(pos), link: pos.link,
          estado: mv.estado, estadoTexto: mv.texto, deriva: mv.deriva, parado: mv.estado === 'PARADO', podeBloquear: Rastreador_avaliarParado_(pos).pode,
          kmPainelEstimado: pos.odometroKm !== null && d ? Math.round(pos.odometroKm + d.deslocamento) : null };
      })() : null,
      ultimaChegada: ch ? { quando: SGO_UTILS.safe(ch.QUANDO), local: SGO_UTILS.safe(ch.LOCAL), link: SGO_UTILS.safe(ch.LINK_MAPA) } : null
    };
  });
  out.comandos = Rastreador_comandos_().sort(function (a, b) { return String(b.CRIADO_EM || '').localeCompare(String(a.CRIADO_EM || '')); }).slice(0, 40).map(function (x) {
    return { id: SGO_UTILS.safe(x.ID), placa: SGO_UTILS.safe(x.PLACA), acao: SGO_UTILS.safeUpper(x.ACAO), origem: SGO_UTILS.safeUpper(x.ORIGEM), situacao: SGO_UTILS.safeUpper(x.SITUACAO),
      pedidoEm: x.PEDIDO_EM ? Rastreador_agoraTexto_(new Date(x.PEDIDO_EM)) : '', pedidoPor: SGO_UTILS.safe(x.PEDIDO_POR_NOME) || 'Rotina',
      enviadoEm: x.ENVIADO_EM ? Rastreador_agoraTexto_(new Date(x.ENVIADO_EM)) : '', tentativas: Number(x.TENTATIVAS) || 0,
      motivo: SGO_UTILS.safe(x.MOTIVO), encerramento: SGO_UTILS.safe(x.ENCERRADO_MOTIVO), justificativa: SGO_UTILS.safe(x.JUSTIFICATIVA) };
  });
  out.alertas = Rastreador_alertasAbertos_().map(function (a) {
    return { id: SGO_UTILS.safe(a.ID), tipo: SGO_UTILS.safeUpper(a.TIPO), placa: SGO_UTILS.safe(a.PLACA), quando: SGO_UTILS.safe(a.QUANDO), local: SGO_UTILS.safe(a.LOCAL),
      link: SGO_UTILS.safe(a.LINK_MAPA), detalhe: SGO_UTILS.safe(a.DETALHE), ocorrencias: Number(a.OCORRENCIAS) || 1 };
  });
  return out;
}

/** Vincula (ou desvincula, com deviceId vazio) o dispositivo ao veículo. Usado também pelo "Editar veículo". */
function Rastreador_vincular_(sessao, veiculoId, deviceId) {
  var c = Rastreador_cfg_();
  var v = Rastreador_veiculo_(veiculoId);
  var dev = String(deviceId === null || deviceId === undefined ? '' : deviceId).trim();
  if (dev && !/^[A-Za-z0-9_-]{1,40}$/.test(dev)) throw new Error('O ID do dispositivo no rastreador é o "ID" da lista de veículos do rastreador (ex.: 1234), sem espaços; não é a placa.');
  var antes = SGO_UTILS.safe(v.RASTREADOR_DEVICE_ID);
  if (dev === antes) {
    return { placa: v.PLACA, deviceId: dev, deviceNome: SGO_UTILS.safe(v.RASTREADOR_DEVICE_NOME), aceitaBloqueio: SGO_UTILS.safeUpper(v.RASTREADOR_ACEITA_BLOQUEIO), semMudanca: true, aviso: '',
      mensagem: dev ? 'Vínculo já estava gravado: o veículo ' + v.PLACA + ' continua ligado ao aparelho ' + (SGO_UTILS.safe(v.RASTREADOR_DEVICE_NOME) || dev) + '.' : 'O veículo ' + v.PLACA + ' já estava sem aparelho do rastreador.' };
  }
  if (dev) {
    var outro = SGO_DATA.getAll(SGO_CFG.SHEETS.CAD_VEICULOS).filter(function (x) { return SGO_UTILS.safe(x.ID) !== SGO_UTILS.safe(v.ID) && SGO_UTILS.safe(x.RASTREADOR_DEVICE_ID) === dev; })[0];
    if (outro) throw new Error('O dispositivo ' + dev + ' já está vinculado ao veículo ' + outro.PLACA + '. Desvincule lá primeiro (deixe o campo vazio e grave).');
  }
  var nome = '', aceita = '', conferidoEm = '', aviso = '';
  if (dev && c.ligado) {
    try {
      var d = Rastreador_lerDispositivos_(c, false).filter(function (x) { return x.id === dev; })[0];
      if (!d) throw new Error('O dispositivo ' + dev + ' não aparece na lista de veículos do rastreador para esta chave de acesso. Confira o ID na lista ou peça à empresa do rastreador o acesso a ele.');
      nome = d.nome;
    } catch (e) {
      if (!e.rastreadorRede && /não aparece/.test(String(e.message))) throw e;
      aviso = 'Vínculo gravado sem conferir na plataforma do rastreador (' + Rastreador_limpar_(e && e.message, c) + ').';
    }
  } else if (dev) {
    aviso = 'O rastreador está desligado no SGO+: o vínculo foi gravado sem conferir o dispositivo na plataforma do rastreador.';
  }
  SGO_DATA.update(SGO_CFG.SHEETS.CAD_VEICULOS, v.ID, {
    RASTREADOR_DEVICE_ID: dev, RASTREADOR_DEVICE_NOME: nome, RASTREADOR_ACEITA_BLOQUEIO: aceita, RASTREADOR_COMANDOS_CONFERIDOS_EM: conferidoEm,
    RASTREADOR_VINCULADO_EM: SGO_UTILS.nowIso(), RASTREADOR_VINCULADO_POR: SGO_UTILS.safe(sessao.nome || sessao.usuario)
  });
  if (antes && antes !== dev) {
    Rastreador_pendentes_(SGO_UTILS.safe(v.ID)).forEach(function (cmd) { Rastreador_encerrar_(cmd, 'CANCELADO', 'Dispositivo do veículo trocado.'); });
  }
  Frota_auditar_(sessao, { acao: 'RASTREADOR_VINCULO', veiculoId: SGO_UTILS.safe(v.ID), placa: SGO_UTILS.safe(v.PLACA), campo: 'RASTREADOR_DEVICE_ID', antes: antes, depois: dev,
    detalhe: dev ? 'Veículo ' + v.PLACA + ' vinculado ao dispositivo ' + dev + (nome ? ' (' + nome + ')' : '') + (aceita ? '; aceita bloquear e liberar: ' + (aceita === 'SIM' ? 'sim' : 'não') : '') + '.'
      : 'Veículo ' + v.PLACA + ' desvinculado do dispositivo ' + antes + '.' });
  return { placa: v.PLACA, deviceId: dev, deviceNome: nome, aceitaBloqueio: aceita, aviso: aviso };
}

function Frota_apiRastreadorVincular(sessionId, payload) {
  var sessao = Rastreador_exigirGestao_(sessionId);
  payload = payload || {};
  var r = Rastreador_vincular_(sessao, payload.veiculoId, payload.deviceId);
  return Object.assign({ ok: true }, r);
}

/**
 * "Bloqueio neste veículo" (gestão): a API do rastreador não informa quais aparelhos aceitam o corte da partida.
 * Depois do teste no pátio, a gestão marca se o veículo usa o bloqueio (SIM) ou fica só no monitoramento (NAO).
 */
function Frota_apiRastreadorConferirComandos(sessionId, payload) {
  var sessao = Rastreador_exigirGestao_(sessionId);
  payload = payload || {};
  var c = Rastreador_cfg_();
  Rastreador_exigirComandos_(c);
  var v = Rastreador_veiculo_(payload.veiculoId);
  Rastreador_exigirDispositivo_(v);
  var aceita = SGO_UTILS.safeUpper(payload.aceita) === 'NAO' ? 'NAO' : 'SIM';
  SGO_DATA.update(SGO_CFG.SHEETS.CAD_VEICULOS, v.ID, { RASTREADOR_ACEITA_BLOQUEIO: aceita, RASTREADOR_COMANDOS_CONFERIDOS_EM: SGO_UTILS.nowIso() });
  if (aceita === 'NAO') Rastreador_cancelarPendentes_(SGO_UTILS.safe(v.ID), null, 'Veículo marcado pela gestão como só monitoramento.');
  Frota_auditar_(sessao, { acao: 'RASTREADOR_COMANDOS_CONFERIDOS', veiculoId: SGO_UTILS.safe(v.ID), placa: SGO_UTILS.safe(v.PLACA), campo: 'RASTREADOR_ACEITA_BLOQUEIO',
    antes: SGO_UTILS.safeUpper(v.RASTREADOR_ACEITA_BLOQUEIO), depois: aceita, detalhe: 'Bloqueio da partida neste veículo marcado pela gestão: ' + (aceita === 'SIM' ? 'usa o bloqueio' : 'só monitoramento') + '.' });
  return { ok: true, placa: v.PLACA, aceitaBloqueio: aceita };
}

/** "Liberar partida" (gestão, com justificativa). Só com provedor com comandos; com o acesso atual é recusado com a explicação. */
function Frota_apiRastreadorLiberar(sessionId, payload) {
  var sessao = Rastreador_exigirGestao_(sessionId);
  payload = payload || {};
  var c = Rastreador_cfg_();
  Rastreador_exigirComandos_(c);
  Rastreador_exigirLigado_(c, 'Nada foi enviado.');
  var v = Rastreador_veiculo_(payload.veiculoId);
  Rastreador_exigirDispositivo_(v);
  var just = Frota_exigirJustificativa_(payload.justificativa, ['liberação da partida do veículo ' + v.PLACA + ' pela gestão'], 'condutor sem sinal no celular, retirada confirmada por telefone');
  var cancelados = Rastreador_cancelarPendentes_(SGO_UTILS.safe(v.ID), 'BLOQUEAR', 'Partida liberada pela gestão (' + (sessao.nome || sessao.usuario) + ').');
  Rastreador_cancelarPendentes_(SGO_UTILS.safe(v.ID), 'LIBERAR', 'Substituído pela liberação feita pela gestão.');
  var aberta = Frota_veiculosComSituacao_().filter(function (x) { return SGO_UTILS.safe(x.ID) === SGO_UTILS.safe(v.ID); })[0] || {};
  var cmd = Rastreador_novoComando_(v, 'LIBERAR', 'GESTAO', SGO_UTILS.safe(aberta.MOVIMENTACAO_ID), sessao, just);
  Frota_auditar_(sessao, { acao: 'RASTREADOR_LIBERAR_GESTAO', veiculoId: SGO_UTILS.safe(v.ID), placa: SGO_UTILS.safe(v.PLACA), movimentacaoId: SGO_UTILS.safe(aberta.MOVIMENTACAO_ID),
    campo: 'PARTIDA', depois: 'LIBERAR', justificativa: just, detalhe: 'Liberação da partida pedida pela gestão' + (cancelados ? '; bloqueio pendente cancelado' : '') + '.' });
  var r = Rastreador_tentar_(c, cmd, v, null, sessao);
  if (r.rede) Rastreador_falhaConexao_(r.motivo); else if (r.enviado) Rastreador_conexaoOk_();
  if (!r.enviado) {
    Rastreador_encerrar_(cmd, 'FALHOU', r.motivo);
    throw new Error('A partida do veículo ' + v.PLACA + ' não foi liberada: ' + r.motivo + '. Tente de novo em alguns minutos ou libere pelo aplicativo do rastreador. O pedido ficou na trilha de auditoria.');
  }
  return { ok: true, placa: v.PLACA, texto: 'Partida do veículo ' + v.PLACA + ' liberada.' + (r.naFila ? ' O comando está na fila da plataforma e chega quando o aparelho se conectar.' : '') + (cancelados ? ' O bloqueio pendente foi cancelado.' : '') };
}

/** "Bloquear agora" (gestão, com justificativa). Só com provedor com comandos; também só envia com o veículo parado e a ignição desligada. */
function Frota_apiRastreadorBloquear(sessionId, payload) {
  var sessao = Rastreador_exigirGestao_(sessionId);
  payload = payload || {};
  var c = Rastreador_cfg_();
  Rastreador_exigirComandos_(c);
  Rastreador_exigirLigado_(c, 'Nada foi enviado.');
  if (!c.bloqueio) throw new Error('Os comandos de bloqueio estão desligados no SGO+ (Chaves e senhas > Rastreador, RASTREADOR_BLOQUEIO_LIGADO): só o monitoramento está ativo. Nada foi enviado.');
  var v = Rastreador_veiculo_(payload.veiculoId);
  var dev = Rastreador_exigirDispositivo_(v);
  if (SGO_UTILS.safeUpper(v.RASTREADOR_ACEITA_BLOQUEIO) === 'NAO') throw new Error('O dispositivo do veículo ' + v.PLACA + ' não aceita bloquear pela plataforma (conferido em Frota > Rastreador). Nada foi enviado.');
  var just = Frota_exigirJustificativa_(payload.justificativa, ['bloqueio da partida do veículo ' + v.PLACA + ' pela gestão'], 'veículo devolvido sem registro, bloqueio até a conferência');
  var jaPendente = Rastreador_pendentes_(SGO_UTILS.safe(v.ID), 'BLOQUEAR')[0];
  if (jaPendente) {
    return { ok: true, placa: v.PLACA, enviado: false, texto: 'Já existe um bloqueio pendente para o veículo ' + v.PLACA + ' desde ' + Rastreador_agoraTexto_(new Date(jaPendente.PEDIDO_EM)) + '. ' + SGO_UTILS.safe(jaPendente.MOTIVO) };
  }
  Rastreador_cancelarPendentes_(SGO_UTILS.safe(v.ID), 'LIBERAR', 'Bloqueio pedido pela gestão.');
  var aberta = Frota_veiculosComSituacao_().filter(function (x) { return SGO_UTILS.safe(x.ID) === SGO_UTILS.safe(v.ID); })[0] || {};
  var cmd = Rastreador_novoComando_(v, 'BLOQUEAR', 'GESTAO', SGO_UTILS.safe(aberta.MOVIMENTACAO_ID), sessao, just);
  Frota_auditar_(sessao, { acao: 'RASTREADOR_BLOQUEAR_GESTAO', veiculoId: SGO_UTILS.safe(v.ID), placa: SGO_UTILS.safe(v.PLACA), movimentacaoId: SGO_UTILS.safe(aberta.MOVIMENTACAO_ID),
    campo: 'PARTIDA', depois: 'BLOQUEAR', justificativa: just, detalhe: 'Bloqueio da partida pedido pela gestão' + (aberta.MOVIMENTACAO_ID ? ' com retirada aberta de ' + (aberta.CONDUTOR_NOME || 'condutor não localizado') : '') + '.' });
  var pos = null, erroLeitura = '';
  try { pos = Rastreador_lerPosicoes_(c, dev, { fresco: true })[dev] || null; Rastreador_conexaoOk_(); }
  catch (e) { erroLeitura = Rastreador_limpar_(e && e.message, c); if (e && e.rastreadorRede) Rastreador_falhaConexao_(erroLeitura); }
  if (erroLeitura) {
    SGO_DATA.update(RASTR_ABA_COMANDOS, cmd.ID, { MOTIVO: 'Aguardando: ' + erroLeitura + '.', ULTIMA_TENTATIVA_EM: SGO_UTILS.nowIso() });
    return { ok: true, placa: v.PLACA, enviado: false, texto: 'Bloqueio pendente: não foi possível ler a posição agora (' + erroLeitura + '). O SGO+ tenta de novo a cada 2 minutos e só envia com o veículo parado e a ignição desligada.' };
  }
  var r = Rastreador_tentar_(c, cmd, v, pos, sessao);
  if (r.enviado) return { ok: true, placa: v.PLACA, enviado: true, texto: 'Partida do veículo ' + v.PLACA + ' bloqueada.' + (r.naFila ? ' O comando está na fila da plataforma.' : '') };
  return { ok: true, placa: v.PLACA, enviado: false, texto: 'Bloqueio pendente (' + r.motivo + '). O SGO+ envia sozinho quando o veículo estiver parado com a ignição desligada; nunca em movimento.' };
}

function Frota_apiRastreadorConferirAlerta(sessionId, payload) {
  var sessao = Rastreador_exigirGestao_(sessionId);
  payload = payload || {};
  var id = SGO_UTILS.safe(payload.alertaId);
  var a = SGO_DATA.getById(RASTR_ABA_ALERTAS, id);
  if (!a || SGO_UTILS.safeUpper(a.SITUACAO) !== 'ABERTO') throw new Error('Este alerta já foi conferido ou não existe mais. Atualize a tela.');
  var obs = String(payload.observacao || '').replace(/\s+/g, ' ').trim();
  if (obs.length < 10) throw new Error('Escreva o que foi conferido (mínimo de 10 caracteres), por exemplo: "Gestor levou o veículo à oficina; retirada registrada depois".');
  SGO_DATA.update(RASTR_ABA_ALERTAS, id, { SITUACAO: 'RESOLVIDO', RESOLVIDO_EM: SGO_UTILS.nowIso(), RESOLVIDO_POR: SGO_UTILS.safe(sessao.nome || sessao.usuario), RESOLUCAO: obs.slice(0, 500) });
  Frota_auditar_(sessao, { acao: 'RASTREADOR_ALERTA_CONFERIDO', veiculoId: SGO_UTILS.safe(a.VEICULO_ID), placa: SGO_UTILS.safe(a.PLACA), campo: SGO_UTILS.safe(a.TIPO), justificativa: obs,
    detalhe: 'Alerta do rastreador ' + SGO_UTILS.safe(a.ID) + ' (' + (SGO_UTILS.safeUpper(a.TIPO) === 'USO_SEM_REGISTRO' ? 'uso sem registro às ' + SGO_UTILS.safe(a.QUANDO) : 'sem comunicação') + ') conferido.' });
  return { ok: true };
}

/** "Ler o rastreador agora" (gestão): a mesma rodada da rotina, com intervalo mínimo de 30 segundos (limite do rastreador). */
function Frota_apiRastreadorAtualizarAgora(sessionId) {
  Rastreador_exigirGestao_(sessionId);
  var c = Rastreador_cfg_();
  Rastreador_exigirLigado_(c, 'Nada foi lido.');
  var r = Rastreador_rodada_({ manual: true });
  if (r.pulada) return { ok: true, texto: r.texto };
  if (r.erro) throw new Error('Não foi possível ler o rastreador: ' + r.erro + '. A gestão recebeu o alerta de conexão; tente de novo em alguns minutos.');
  return { ok: true, texto: 'Rastreador lido: ' + r.posicoes + (r.posicoes === 1 ? ' posição' : ' posições') +
    (r.usoSemRegistro.length ? '; uso sem registro: ' + r.usoSemRegistro.join(', ') : '; nenhum uso sem registro') + (r.km.length ? '; KM conferido: ' + r.km.join(', ') : '') +
    (c.comandos ? '; ' + r.enviados.length + (r.enviados.length === 1 ? ' comando enviado' : ' comandos enviados') + (r.pendentes.length ? '; ' + r.pendentes.length + ' pendente(s)' : '') : '') + '.' };
}

// ------------------------------------------------------------
// TESTE DE CONEXÃO (Chaves e senhas, só o dono). GET /devices; nunca mostra a chave.
// ------------------------------------------------------------
function Rastreador_testarConexao_() {
  var c = Rastreador_cfg_();
  if (!Rastreador_temCredencial_(c)) {
    return { funcionou: false, texto: 'Não funcionou: falta a chave de acesso do rastreador. Grave a "Chave de acesso (Bearer)" e teste de novo.', dispositivos: [] };
  }
  Rastreador_esquecerSessao_();
  try {
    var lista = Rastreador_lerDispositivos_(c, false);
    return {
      funcionou: true, total: lista.length,
      dispositivos: lista.map(function (d) { return { id: d.id, nome: d.nome, situacao: d.situacao === 'online' ? 'conectado' : (d.situacao === 'offline' ? 'desconectado' : (d.situacao ? 'sem informação' : '')) }; }),
      texto: 'Funcionou: a empresa do rastreador respondeu (' + c.url.replace(/^https?:\/\//, '') + ') e encontrou ' + lista.length + (lista.length === 1 ? ' veículo' : ' veículos') + '.' +
        (c.comandos ? ' Endereços de comando preenchidos (o teste não envia comando); bloqueio da partida ' + (c.bloqueioPedido ? 'ligado.' : 'ainda desligado.')
          : ' Acesso somente leitura: o SGO+ monitora, mas não bloqueia nem libera a partida.' + (c.comandosIncompletos ? ' Falta um dos dois endereços de comando (bloqueio e liberação).' : '')) + (c.ligado ? '' : ' O rastreador continua desligado no SGO+ até "Rastreador ligado no SGO+" = Ligado.')
    };
  } catch (e) {
    return { funcionou: false, texto: 'Não funcionou: ' + Rastreador_limpar_(e && e.message, c) + '.', dispositivos: [] };
  }
}
