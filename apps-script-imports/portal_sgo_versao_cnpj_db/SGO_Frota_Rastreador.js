/****************************************************
 * FROTA — RASTREADOR (17/10/2026)
 *
 * Integração com o rastreador dos veículos (iTracker Rastreamento Veicular,
 * plataforma Tarkan sobre o Traccar; API REST padrão do Traccar):
 *   POST /api/session (formulário email/password) ou GET /api/session?token=
 *   GET  /api/devices
 *   GET  /api/positions            (uma leitura por rodada da rotina)
 *   GET  /api/commands/types?deviceId=
 *   POST /api/commands/send        { deviceId, type: "engineStop" | "engineResume" }
 *
 * Chaves (só o dono, em Chaves e senhas; ficam só nas propriedades do script):
 *   RASTREADOR_URL (vazio = https://acesso.itrackergo.com.br), RASTREADOR_USUARIO +
 *   RASTREADOR_SENHA ou RASTREADOR_TOKEN, RASTREADOR_LIGADO (1 liga; padrão desligado) e
 *   RASTREADOR_BLOQUEIO_LIGADO (1 liga os comandos; dá para só monitorar).
 *   Com RASTREADOR_LIGADO desligado nenhuma chamada sai daqui (retirada, devolução,
 *   rotina e telas), exceto o botão "Testar conexão" do dono.
 *
 * Fluxo:
 *   - retirada confirmada -> engineResume (falhou: a retirada vale, a tela avisa e a gestão
 *     recebe o alerta; a rotina tenta de novo enquanto a retirada estiver aberta);
 *   - devolução confirmada -> bloqueio PENDENTE; só é enviado quando a última posição
 *     (dos últimos 30 minutos) mostrar o veículo parado (abaixo de 3 km/h, sem movimento) e a
 *     ignição desligada. Nunca com o veículo em movimento. A rotina (a cada 2 minutos)
 *     tenta os pendentes; 30 minutos sem conseguir = alerta para a gestão;
 *   - gestão: "Liberar partida" e "Bloquear agora" (justificativa + confirmação; o bloquear
 *     segue a mesma regra do veículo parado), vínculo veículo x dispositivo, trilha em
 *     REG_FROTA_AUDITORIA.
 * Monitoramento (rotina): ignição ligada ou veículo andando sem retirada aberta = alerta
 * crítico "uso sem registro"; hodômetro do rastreador x KM digitado acima de 20 km ou 5% =
 * "KM a conferir"; falha de conexão = um alerta único (não um por rodada).
 *
 * Segurança: usuário, senha, token e cookie de sessão nunca vão para log, e-mail, tela ou
 * retorno de API (Rastreador_limpar_). Só ADMIN, GESTOR e DIRETORIA comandam; o técnico
 * só aciona pela própria retirada/devolução.
 *
 * Velocidade do Traccar vem em nós: km/h = nós x 1,852. Hodômetro: atributo "odometer"
 * (do veículo) ou, na falta, "totalDistance" (calculado pela plataforma), ambos em metros.
 ****************************************************/

var RASTR_URL_PADRAO = 'https://acesso.itrackergo.com.br';
var RASTR_ABA_COMANDOS = 'REG_FROTA_RASTREADOR_COMANDOS';
var RASTR_ABA_ALERTAS = 'REG_FROTA_RASTREADOR_ALERTAS';
var RASTR_COLUNAS_COMANDOS = ['ID', 'VEICULO_ID', 'PLACA', 'DEVICE_ID', 'MOVIMENTACAO_ID', 'ACAO', 'ORIGEM', 'SITUACAO', 'PEDIDO_EM',
  'PEDIDO_POR_ID', 'PEDIDO_POR_NOME', 'JUSTIFICATIVA', 'TENTATIVAS', 'ULTIMA_TENTATIVA_EM', 'MOTIVO', 'ENVIADO_EM', 'ALERTA_ATRASO_EM',
  'ENCERRADO_EM', 'ENCERRADO_MOTIVO', 'CRIADO_EM'];
var RASTR_COLUNAS_ALERTAS = ['ID', 'TIPO', 'CHAVE', 'VEICULO_ID', 'PLACA', 'DEVICE_ID', 'PRIMEIRO_EM', 'ULTIMO_EM', 'OCORRENCIAS', 'QUANDO',
  'LOCAL', 'LINK_MAPA', 'DETALHE', 'SITUACAO', 'RESOLVIDO_EM', 'RESOLVIDO_POR', 'RESOLUCAO', 'CRIADO_EM'];
var RASTR_COLUNAS_VEICULO = ['RASTREADOR_DEVICE_ID', 'RASTREADOR_DEVICE_NOME', 'RASTREADOR_ACEITA_BLOQUEIO', 'RASTREADOR_COMANDOS_CONFERIDOS_EM',
  'RASTREADOR_VINCULADO_EM', 'RASTREADOR_VINCULADO_POR'];
var RASTR_COLUNAS_MOV = ['KM_RASTREADOR_SAIDA', 'KM_RASTREADOR_DIVERGENCIA_SAIDA', 'KM_CONFERIDO_RASTREADOR_SAIDA_EM', 'KM_CONFERIDO_RASTREADOR_SAIDA_POR',
  'KM_RASTREADOR_CHEGADA', 'KM_RASTREADOR_DIVERGENCIA_CHEGADA', 'KM_CONFERIDO_RASTREADOR_CHEGADA_EM', 'KM_CONFERIDO_RASTREADOR_CHEGADA_POR'];

var RASTR_VEL_PARADO_KMH = 3;              // abaixo disso = parado
var RASTR_NOS_PARA_KMH = 1.852;            // Traccar grava a velocidade em nós
var RASTR_POSICAO_MAX_IDADE_BLOQUEIO_MIN = 30; // posição mais velha que isso não autoriza o bloqueio
var RASTR_POSICAO_RECENTE_USO_MIN = 15;    // "uso sem registro" só com posição dos últimos 15 min
var RASTR_CARENCIA_DEVOLUCAO_MIN = 10;     // estacionar depois de registrar a devolução não é uso sem registro
var RASTR_MIN_BLOQUEIO_ATRASADO = 30;      // bloqueio pendente há 30 min = alerta para a gestão
var RASTR_KM_TOLERANCIA = 20;              // divergência de hodômetro acima de 20 km...
var RASTR_KM_TOLERANCIA_PCT = 5;           // ...ou acima de 5% = KM a conferir
var RASTR_INTERVALO_ROTINA_SEG = 100;      // rotina: no mínimo ~2 min entre rodadas
var RASTR_INTERVALO_MANUAL_SEG = 20;       // "Ler o rastreador agora" da gestão
var RASTR_ORCAMENTO_RODADA_MS = 45000;     // depois disso os comandos ficam para a próxima rodada
var RASTR_CACHE_SESSAO = 'RASTR_SESSAO_V1';
var RASTR_CACHE_POSICOES = 'RASTR_POSICOES_V1';
var RASTR_CACHE_DISPOSITIVOS = 'RASTR_DISPOSITIVOS_V1';
var RASTR_CACHE_RODADA = 'RASTR_RODADA_EM_CURSO';
var RASTR_PROP_ULTIMA_RODADA = 'RASTR_ULTIMA_RODADA_EM';
var RASTR_PROP_ULTIMA_LEITURA = 'RASTR_ULTIMA_LEITURA_OK_EM';
var RASTR_FUNCAO_ROTINA = 'Frota_rastreadorRotina';
var RASTR_SISTEMA = { userId: '', usuario: 'sistema', nome: 'Rotina do rastreador', perfil: 'SISTEMA' };
var RASTR_TEXTO_EMERGENCIA = 'a gestão (Administrador, Gestor ou Diretoria) libera em Frota > Rastreador ou pelo app da iTracker';

// ------------------------------------------------------------
// CONFIGURAÇÃO E SEGREDOS
// ------------------------------------------------------------
function Rastreador_cfg_() {
  var p = PropertiesService.getScriptProperties();
  var g = function (k) { return String(p.getProperty(k) || '').trim(); };
  return {
    url: (g('RASTREADOR_URL') || RASTR_URL_PADRAO).replace(/\/+$/, ''),
    usuario: g('RASTREADOR_USUARIO'), senha: g('RASTREADOR_SENHA'), token: g('RASTREADOR_TOKEN'),
    ligado: g('RASTREADOR_LIGADO') === '1', bloqueio: g('RASTREADOR_BLOQUEIO_LIGADO') === '1'
  };
}

function Rastreador_temCredencial_(c) { return !!(c.token || (c.usuario && c.senha)); }

/** Tira usuário, senha, token e cookie de qualquer texto que possa ir para tela, log ou aviso. */
function Rastreador_limpar_(msg, c) {
  var s = String(msg === null || msg === undefined ? '' : msg);
  s = s.replace(/([?&](token|password|email)=)[^&\s"'<>]+/gi, '$1***').replace(/JSESSIONID=[^;,\s"'<>]+/gi, 'JSESSIONID=***');
  if (c) {
    [c.senha, c.token, c.usuario].forEach(function (x) {
      if (!x || String(x).length < 3) return;
      s = s.split(String(x)).join('***');
      try { s = s.split(encodeURIComponent(String(x))).join('***'); } catch (e) {}
    });
  }
  return s.replace(/\s+/g, ' ').trim().slice(0, 300);
}

function Rastreador_erro_(texto, rede) {
  var e = new Error(texto);
  e.rastreadorRede = !!rede;
  return e;
}

/** Depois de trocar URL, usuário, senha ou token (Chaves e senhas): a sessão guardada deixa de valer. */
function Rastreador_esquecerSessao_() {
  try {
    var cache = CacheService.getScriptCache();
    cache.remove(RASTR_CACHE_SESSAO); cache.remove(RASTR_CACHE_DISPOSITIVOS); cache.remove(RASTR_CACHE_POSICOES);
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

// ------------------------------------------------------------
// HTTP (API do Traccar)
// ------------------------------------------------------------
/** Uma chamada HTTP; devolve { http, txt, j, r }. Erro de rede vira erro com rastreadorRede=true, sem segredo. */
function Rastreador_fetch_(c, metodo, caminho, o) {
  o = o || {};
  var op = { method: metodo, muteHttpExceptions: true, followRedirects: false, headers: Object.assign({ Accept: 'application/json' }, o.headers || {}) };
  if (o.json !== undefined) { op.contentType = 'application/json'; op.payload = JSON.stringify(o.json); }
  if (o.form) { op.contentType = 'application/x-www-form-urlencoded'; op.payload = o.form; }
  var r;
  try { r = UrlFetchApp.fetch(c.url + caminho, op); }
  catch (e) { throw Rastreador_erro_('sem resposta do rastreador (' + Rastreador_limpar_(e && e.message, c) + ')', true); }
  var txt = '';
  try { txt = String(r.getContentText() || ''); } catch (e2) {}
  var j = null;
  try { j = JSON.parse(txt); } catch (e3) {}
  return { http: r.getResponseCode(), txt: txt, j: j, r: r };
}

function Rastreador_cookieDaResposta_(r) {
  var cab = {};
  try { cab = (r.getAllHeaders ? r.getAllHeaders() : r.getHeaders()) || {}; } catch (e) {}
  var achado = '';
  Object.keys(cab).forEach(function (k) {
    if (achado || String(k).toLowerCase() !== 'set-cookie') return;
    var v = cab[k];
    (Array.isArray(v) ? v : [v]).forEach(function (x) {
      var m = /(JSESSIONID=[^;,\s]+)/.exec(String(x || ''));
      if (m && !achado) achado = m[1];
    });
  });
  return achado;
}

/** Entra na plataforma (token ou usuário/senha) e guarda o cookie da sessão por 20 minutos. */
function Rastreador_login_(c) {
  if (!Rastreador_temCredencial_(c)) {
    throw Rastreador_erro_('faltam as credenciais do rastreador: o responsável pelo sistema grava RASTREADOR_TOKEN, ou RASTREADOR_USUARIO e RASTREADOR_SENHA, em Chaves e senhas', false);
  }
  var res = c.token
    ? Rastreador_fetch_(c, 'get', '/api/session?token=' + encodeURIComponent(c.token), {})
    : Rastreador_fetch_(c, 'post', '/api/session', { form: { email: c.usuario, password: c.senha } });
  if (res.http === 401 || res.http === 403) throw Rastreador_erro_('o rastreador recusou as credenciais (HTTP ' + res.http + '); confira o usuário e a senha, ou o token, em Chaves e senhas', false);
  if (res.http < 200 || res.http >= 300) throw Rastreador_erro_('o rastreador respondeu HTTP ' + res.http + ' ao entrar (' + Rastreador_limpar_(res.txt.slice(0, 120), c) + ')', res.http >= 500);
  var cookie = Rastreador_cookieDaResposta_(res.r);
  if (!cookie) throw Rastreador_erro_('o rastreador aceitou o login mas não devolveu a sessão (cookie JSESSIONID); confira se o endereço RASTREADOR_URL é o da API', false);
  try { CacheService.getScriptCache().put(RASTR_CACHE_SESSAO, JSON.stringify({ url: c.url, cookie: cookie }), 1200); } catch (e) {}
  return cookie;
}

/** Chamada autenticada; refaz o login uma vez se a sessão venceu (HTTP 401). */
function Rastreador_api_(c, metodo, caminho, o) {
  o = o || {};
  var cache = null, cookie = '';
  try { cache = CacheService.getScriptCache(); var s = JSON.parse(cache.get(RASTR_CACHE_SESSAO) || 'null'); if (s && s.url === c.url) cookie = s.cookie; } catch (e) {}
  if (!cookie) cookie = Rastreador_login_(c);
  var chamar = function () { return Rastreador_fetch_(c, metodo, caminho, { json: o.json, headers: { Cookie: cookie } }); };
  var res = chamar();
  if (res.http === 401) {
    try { if (cache) cache.remove(RASTR_CACHE_SESSAO); } catch (e) {}
    cookie = Rastreador_login_(c);
    res = chamar();
  }
  return res;
}

function Rastreador_exigirOk_(res, c, oQue) {
  if (res.http >= 200 && res.http < 300) return res;
  if (res.http === 401 || res.http === 403) throw Rastreador_erro_('o rastreador recusou o acesso a ' + oQue + ' (HTTP ' + res.http + '); o usuário de integração precisa ter acesso aos veículos', false);
  throw Rastreador_erro_('o rastreador respondeu HTTP ' + res.http + ' em ' + oQue + (res.txt ? ' (' + Rastreador_limpar_(res.txt.slice(0, 160), c) + ')' : ''), res.http >= 500);
}

// ------------------------------------------------------------
// LEITURAS
// ------------------------------------------------------------
function Rastreador_lerDispositivos_(c, usarCache) {
  var cache = null;
  if (usarCache) {
    try { cache = CacheService.getScriptCache(); var em = JSON.parse(cache.get(RASTR_CACHE_DISPOSITIVOS) || 'null'); if (em && em.url === c.url) return em.lista; } catch (e) {}
  }
  var res = Rastreador_exigirOk_(Rastreador_api_(c, 'get', '/api/devices'), c, 'a lista de dispositivos');
  var lista = (Array.isArray(res.j) ? res.j : []).map(function (d) {
    return { id: String(d.id), nome: SGO_UTILS.safe(d.name), identificador: SGO_UTILS.safe(d.uniqueId), situacao: SGO_UTILS.safe(d.status),
      placa: SGO_UTILS.safe((d.attributes || {}).placa || (d.attributes || {}).plate || ''), ultimaAtualizacao: d.lastUpdate ? String(d.lastUpdate) : '' };
  });
  try { (cache || CacheService.getScriptCache()).put(RASTR_CACHE_DISPOSITIVOS, JSON.stringify({ url: c.url, lista: lista }), 300); } catch (e) {}
  return lista;
}

/** Posição do Traccar -> o que o SGO+ usa (km/h, ignição, hodômetro em km, hora em Brasília). */
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
    lat: lat, lon: lon, endereco: SGO_UTILS.safe(p.address),
    link: lat !== null && lon !== null ? 'https://www.google.com/maps?q=' + lat + ',' + lon : ''
  };
}

function Rastreador_localTexto_(pos) {
  if (!pos) return 'local não informado';
  if (pos.endereco) return pos.endereco;
  if (pos.lat === null || pos.lon === null) return 'local não informado';
  return 'latitude ' + Rastreador_num_(pos.lat, 5) + ', longitude ' + Rastreador_num_(pos.lon, 5);
}

/** GET /api/positions (todas, uma chamada) ou só de um dispositivo. Devolve mapa deviceId -> posição. */
function Rastreador_lerPosicoes_(c, deviceId) {
  var caminho = '/api/positions' + (deviceId ? '?deviceId=' + encodeURIComponent(deviceId) : '');
  var res = Rastreador_exigirOk_(Rastreador_api_(c, 'get', caminho), c, 'as posições');
  var mapa = {};
  (Array.isArray(res.j) ? res.j : []).forEach(function (p) {
    if (!p || p.deviceId === undefined) return;
    var pos = Rastreador_posicao_(p);
    if (!mapa[pos.deviceId] || pos.quandoMs > mapa[pos.deviceId].quandoMs) mapa[pos.deviceId] = pos;
  });
  return mapa;
}

/** Pode bloquear? Só com posição recente, parado (abaixo de 3 km/h, sem movimento) e ignição desligada. */
function Rastreador_avaliarParado_(pos) {
  if (!pos) return { pode: false, motivo: 'o rastreador não tem posição deste veículo' };
  var idadeMin = pos.quandoMs ? (Date.now() - pos.quandoMs) / 60000 : Infinity;
  if (idadeMin > RASTR_POSICAO_MAX_IDADE_BLOQUEIO_MIN) {
    return { pode: false, motivo: 'a última posição é de ' + (pos.quandoTexto || 'data desconhecida') + ' (mais de ' + RASTR_POSICAO_MAX_IDADE_BLOQUEIO_MIN +
      ' minutos); sem posição recente o bloqueio não é enviado, para o comando não ficar na fila do rastreador e chegar com o veículo andando' };
  }
  if (pos.kmh === null) return { pode: false, motivo: 'a última posição (' + pos.quandoTexto + ') não informa a velocidade' };
  if (pos.kmh >= RASTR_VEL_PARADO_KMH || pos.movimento === true) {
    return { pode: false, motivo: 'veículo em movimento (' + Rastreador_num_(pos.kmh, 0) + ' km/h às ' + pos.quandoTexto.slice(-5) + ')' };
  }
  if (pos.ignicao === null) return { pode: false, motivo: 'o rastreador não informa a ignição; sem confirmar a ignição desligada o bloqueio não é enviado' };
  if (pos.ignicao === true) return { pode: false, motivo: 'ignição ligada (às ' + pos.quandoTexto.slice(-5) + ')' };
  return { pode: true, motivo: '' };
}

function Rastreador_lerTiposComando_(c, deviceId) {
  var res = Rastreador_exigirOk_(Rastreador_api_(c, 'get', '/api/commands/types?deviceId=' + encodeURIComponent(deviceId)), c, 'os comandos aceitos pelo dispositivo');
  return (Array.isArray(res.j) ? res.j : []).map(function (t) { return String((t && t.type) || t || ''); }).filter(String);
}

/** Envia engineStop / engineResume. { ok, naFila, motivo, rede }. Nunca lança erro. */
function Rastreador_enviar_(c, deviceId, tipo) {
  try {
    var res = Rastreador_api_(c, 'post', '/api/commands/send', { json: { deviceId: Number(deviceId), type: tipo } });
    if (res.http === 200) return { ok: true, naFila: false, motivo: '' };
    if (res.http === 202) return { ok: true, naFila: true, motivo: 'aceito pela plataforma e guardado na fila: o aparelho recebe quando se conectar' };
    if (res.http === 401 || res.http === 403) return { ok: false, motivo: 'o rastreador recusou o comando por permissão (HTTP ' + res.http + '); o usuário de integração precisa poder enviar comandos' };
    if (res.http >= 400 && res.http < 500) return { ok: false, motivo: 'o rastreador recusou o comando (HTTP ' + res.http + (res.txt ? ': ' + Rastreador_limpar_(res.txt.slice(0, 160), c) : '') + '); confira em Frota > Rastreador se o dispositivo aceita bloquear e liberar' };
    return { ok: false, rede: res.http >= 500, motivo: 'o rastreador respondeu HTTP ' + res.http + ' ao comando' };
  } catch (e) {
    return { ok: false, rede: !!(e && e.rastreadorRede), motivo: Rastreador_limpar_(e && e.message, c) };
  }
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

/**
 * Uma tentativa de enviar o comando, respeitando as regras. Atualiza a linha.
 * Devolve { enviado, naFila, motivo, rede }.
 */
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

/** Usuários ativos da gestão (ADMIN, GESTOR, DIRETORIA) para os avisos do rastreador. */
function Rastreador_gestores_() {
  return Frota_lerSeExistir_(SGO_CFG.SHEETS.CAD_USUARIOS).filter(function (u) {
    var p = SGO_UTILS.safeUpper(u.PERFIL);
    return SGO_UTILS.safeUpper(u.STATUS) === 'ATIVO' && (p === 'ADMIN' || p === 'GESTOR' || p === 'DIRETORIA');
  }).map(function (u) { return SGO_UTILS.safe(u.ID); }).filter(String);
}

function Rastreador_avisarGestao_(titulo, texto, refId) {
  if (typeof SGO_notificar_ !== 'function') return;
  try {
    var ids = Rastreador_gestores_();
    if (ids.length) SGO_notificar_({ usuarios: ids, titulo: titulo, texto: texto, canais: ['sgo', 'email', 'whatsapp'], origem: 'FROTA', refId: refId });
  } catch (e) { console.error('Rastreador aviso: ' + ((e && e.message) || e)); }
}

// ------------------------------------------------------------
// KM: hodômetro do rastreador x KM digitado
// ------------------------------------------------------------
function Rastreador_kmDivergente_(kmDigitado, odometroKm) {
  var dif = kmDigitado - odometroKm;
  var pct = odometroKm > 0 ? Math.abs(dif) / odometroKm * 100 : (dif !== 0 ? 100 : 0);
  return { dif: dif, divergente: Math.abs(dif) > RASTR_KM_TOLERANCIA || pct > RASTR_KM_TOLERANCIA_PCT };
}

/** Grava o hodômetro lido na retirada (SAIDA) ou devolução (CHEGADA) e marca "KM a conferir" se divergir. */
function Rastreador_conferirKm_(mov, veiculo, etapa, pos, sessao) {
  if (!pos || pos.odometroKm === null || !mov) return null;
  var kmDig = Frota_num_(etapa === 'SAIDA' ? mov.KM_SAIDA : mov.KM_CHEGADA, NaN);
  if (!isFinite(kmDig)) return null;
  var k = Rastreador_kmDivergente_(kmDig, pos.odometroKm);
  var upd = {};
  upd['KM_RASTREADOR_' + etapa] = pos.odometroKm;
  upd['KM_RASTREADOR_DIVERGENCIA_' + etapa] = k.divergente ? k.dif : '';
  SGO_DATA.update(SGO_CFG.SHEETS.REG_FROTA_MOVIMENTACAO, mov.ID, upd);
  Object.assign(mov, upd);
  if (k.divergente) {
    Frota_auditar_(sessao || RASTR_SISTEMA, {
      acao: 'RASTREADOR_KM_DIVERGENTE_' + etapa, veiculoId: SGO_UTILS.safe(veiculo.ID), placa: SGO_UTILS.safe(veiculo.PLACA), movimentacaoId: SGO_UTILS.safe(mov.ID),
      condutorId: SGO_UTILS.safe(mov.CONDUTOR_ID), campo: etapa === 'SAIDA' ? 'KM_SAIDA' : 'KM_CHEGADA', antes: pos.odometroKm, depois: kmDig,
      detalhe: 'KM ' + (etapa === 'SAIDA' ? 'de saída' : 'de chegada') + ' digitado ' + Frota_kmTexto_(kmDig) + ' e hodômetro do rastreador ' + Frota_kmTexto_(pos.odometroKm) +
        ' (diferença de ' + Frota_kmTexto_(k.dif) + ' km; tolerância de ' + RASTR_KM_TOLERANCIA + ' km ou ' + RASTR_KM_TOLERANCIA_PCT + '%). A gestão confere em KM a conferir.'
    });
  }
  return { odometroKm: pos.odometroKm, dif: k.dif, divergente: k.divergente };
}

// ------------------------------------------------------------
// GANCHOS DA RETIRADA E DA DEVOLUÇÃO (nunca lançam erro; a movimentação já está gravada)
// Pontos de entrada únicos chamados por Frota_apiIniciarViagem / Frota_apiFinalizarViagem,
// depois de gravar e de soltar a trava. Quem mexer nas telas de retirada/devolução só precisa
// manter estas duas chamadas e mostrar resultado.aviso (retirada) e resultado.texto.
// ------------------------------------------------------------
function Frota_rastreadorAoRetirar_(sessao, veiculoId, movId) {
  try { return typeof Rastreador_aposRetirada_ === 'function' ? Rastreador_aposRetirada_(sessao, veiculoId, movId) : { ativo: false }; }
  catch (e) { console.error('Rastreador (retirada): ' + Rastreador_limpar_(e && e.message, null)); return { ativo: false, erro: true }; }
}

function Frota_rastreadorAoDevolver_(sessao, veiculoId, movId) {
  try { return typeof Rastreador_aposDevolucao_ === 'function' ? Rastreador_aposDevolucao_(sessao, veiculoId, movId) : { ativo: false }; }
  catch (e) { console.error('Rastreador (devolução): ' + Rastreador_limpar_(e && e.message, null)); return { ativo: false, erro: true }; }
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
    // Nova retirada: bloqueio pendente da devolução anterior não vale mais.
    Rastreador_cancelarPendentes_(veiculoId, 'BLOQUEAR', 'Nova retirada registrada antes de o bloqueio ser enviado.');
    var mov = SGO_DATA.getById(SGO_CFG.SHEETS.REG_FROTA_MOVIMENTACAO, movId);
    var km = null, erroLeitura = '';
    try {
      var pos = Rastreador_lerPosicoes_(c, dev)[dev];
      km = Rastreador_conferirKm_(mov, veiculo, 'SAIDA', pos, sessao);
    } catch (eLe) { erroLeitura = Rastreador_limpar_(eLe && eLe.message, c); }
    if (!c.bloqueio || SGO_UTILS.safeUpper(veiculo.RASTREADOR_ACEITA_BLOQUEIO) === 'NAO') {
      return { ativo: true, bloqueio: false, km: km, liberado: null, texto: '' };
    }
    var cmd = Rastreador_novoComando_(veiculo, 'LIBERAR', 'RETIRADA', movId, sessao, '');
    var r = Rastreador_tentar_(c, cmd, veiculo, null, sessao);
    if (r.rede) Rastreador_falhaConexao_(r.motivo); else if (r.enviado) Rastreador_conexaoOk_();
    if (r.enviado) return { ativo: true, bloqueio: true, liberado: true, km: km, texto: 'Partida liberada pelo rastreador.' + (r.naFila ? ' O comando está na fila da plataforma e chega ao veículo quando o aparelho se conectar.' : '') };
    var aviso = 'Partida não liberada pelo rastreador: ' + r.motivo + '. Peça à gestão para liberar.';
    Rastreador_avisarGestao_('Partida não liberada: veículo ' + placa,
      'A retirada do veículo ' + placa + ' foi registrada por ' + SGO_UTILS.safe(sessao && (sessao.nome || sessao.usuario)) + ', mas o rastreador não liberou a partida (' + r.motivo + ').\n' +
      'O condutor está aguardando. Libere em Frota > Rastreador > "Liberar partida" ou pelo app da iTracker. O SGO+ tenta de novo a cada 2 minutos enquanto a retirada estiver aberta.', cmd.ID);
    return { ativo: true, bloqueio: true, liberado: false, km: km, aviso: aviso, erroLeitura: erroLeitura };
  } catch (e) {
    var m = Rastreador_limpar_(e && e.message, c);
    console.error('Rastreador após retirada: ' + m);
    return { ativo: true, liberado: false, aviso: 'Partida não liberada pelo rastreador: falha interna do SGO+ (' + m + '). Peça à gestão para liberar.' };
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
      pos = Rastreador_lerPosicoes_(c, dev)[dev] || null;
      km = Rastreador_conferirKm_(mov, veiculo, 'CHEGADA', pos, sessao);
      Rastreador_conexaoOk_();
    } catch (eLe) {
      erroLeitura = Rastreador_limpar_(eLe && eLe.message, c);
      if (eLe && eLe.rastreadorRede) Rastreador_falhaConexao_(erroLeitura);
    }
    if (!c.bloqueio || SGO_UTILS.safeUpper(veiculo.RASTREADOR_ACEITA_BLOQUEIO) === 'NAO') return { ativo: true, bloqueio: false, km: km, texto: '' };
    var cmd = Rastreador_novoComando_(veiculo, 'BLOQUEAR', 'DEVOLUCAO', movId, sessao, '');
    if (erroLeitura) {
      SGO_DATA.update(RASTR_ABA_COMANDOS, cmd.ID, { MOTIVO: 'Aguardando: ' + erroLeitura + '.', ULTIMA_TENTATIVA_EM: SGO_UTILS.nowIso() });
      return { ativo: true, bloqueio: true, bloqueado: false, km: km, texto: 'Bloqueio da partida pendente: o SGO+ envia quando o rastreador mostrar o veículo parado com a ignição desligada.' };
    }
    var r = Rastreador_tentar_(c, cmd, veiculo, pos, sessao);
    if (r.enviado) return { ativo: true, bloqueio: true, bloqueado: true, km: km, texto: 'Partida bloqueada pelo rastreador.' };
    return { ativo: true, bloqueio: true, bloqueado: false, km: km, texto: 'Bloqueio da partida pendente (' + r.motivo + '): o SGO+ envia sozinho quando o veículo estiver parado com a ignição desligada. Desligue o veículo normalmente.' };
  } catch (e) {
    console.error('Rastreador após devolução: ' + Rastreador_limpar_(e && e.message, c));
    return { ativo: true, bloqueado: false, texto: '' };
  }
}

// ------------------------------------------------------------
// ROTINA (a cada 2 minutos; nada acontece com RASTREADOR_LIGADO desligado)
// ------------------------------------------------------------
/** Gatilho de tempo. Nome sem "_" no fim para o Google achar; recusada quando chamada pelo navegador. */
function Frota_rastreadorRotina() {
  if (!SGO_execucaoInterna_()) return null;
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
    if (Date.now() - ultima < intervalo) return { ligado: true, pulada: true, texto: 'O rastreador foi lido há menos de ' + Math.round(intervalo / 1000) + ' segundos. Aguarde e tente de novo.' };
    props.setProperty(RASTR_PROP_ULTIMA_RODADA, String(Date.now()));
    cache.put(RASTR_CACHE_RODADA, '1', 120);
  } finally { lock.releaseLock(); }

  var out = { ligado: true, bloqueio: c.bloqueio, posicoes: 0, enviados: [], pendentes: [], cancelados: 0, usoSemRegistro: [], km: [], erro: '' };
  try {
    Rastreador_garantirAbas_();
    var posicoes;
    try {
      posicoes = Rastreador_lerPosicoes_(c);
    } catch (e) {
      out.erro = Rastreador_limpar_(e && e.message, c);
      Rastreador_falhaConexao_(out.erro);
      Rastreador_pendentes_().forEach(function (cmd) {
        SGO_DATA.update(RASTR_ABA_COMANDOS, cmd.ID, { MOTIVO: 'Aguardando: ' + out.erro + '.', ULTIMA_TENTATIVA_EM: SGO_UTILS.nowIso() });
      });
      Rastreador_verificarAtrasos_();
      return out;
    }
    Rastreador_conexaoOk_();
    out.posicoes = Object.keys(posicoes).length;
    try { cache.put(RASTR_CACHE_POSICOES, JSON.stringify({ url: c.url, em: Date.now(), posicoes: posicoes }), 900); } catch (eC) {}

    var inicio = Date.now();
    var veiculos = Frota_lerSeExistir_(SGO_CFG.SHEETS.CAD_VEICULOS);
    var porId = {};
    veiculos.forEach(function (v) { porId[SGO_UTILS.safe(v.ID)] = v; });
    var movs = Frota_lerSeExistir_(SGO_CFG.SHEETS.REG_FROTA_MOVIMENTACAO);
    var abertas = {}, ultimaDevolucao = {};
    movs.forEach(function (m) {
      var vid = SGO_UTILS.safe(m.VEICULO_ID);
      if (Frota_movimentoAberto_(m)) abertas[vid] = m;
      var fim = new Date(SGO_UTILS.safe(m.FINALIZADO_EM)).getTime();
      if (isFinite(fim) && (!ultimaDevolucao[vid] || fim > ultimaDevolucao[vid])) ultimaDevolucao[vid] = fim;
    });

    // 1) comandos pendentes
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

    // 2) uso sem registro e 3) hodômetro que não foi lido na hora da retirada/devolução
    var agora = Date.now();
    veiculos.forEach(function (v) {
      var dev = SGO_UTILS.safe(v.RASTREADOR_DEVICE_ID);
      if (!dev || SGO_UTILS.safeUpper(v.STATUS) === 'INATIVO') return;
      var pos = posicoes[dev];
      if (!pos) return;
      var vid = SGO_UTILS.safe(v.ID);
      var recente = pos.quandoMs && (agora - pos.quandoMs) <= RASTR_POSICAO_RECENTE_USO_MIN * 60000;
      var emUso = pos.ignicao === true || pos.movimento === true || (pos.kmh !== null && pos.kmh >= RASTR_VEL_PARADO_KMH);
      var carencia = ultimaDevolucao[vid] && (agora - ultimaDevolucao[vid]) < RASTR_CARENCIA_DEVOLUCAO_MIN * 60000;
      if (!abertas[vid] && recente && emUso && !carencia) {
        var estado = [pos.ignicao === true ? 'ignição ligada' : '', pos.kmh !== null ? Rastreador_num_(pos.kmh, 0) + ' km/h' : ''].filter(String).join(', ');
        var local = Rastreador_localTexto_(pos);
        var a = Rastreador_abrirAlerta_('USO_SEM_REGISTRO', 'USO:' + vid, {
          veiculoId: vid, placa: SGO_UTILS.safe(v.PLACA), deviceId: dev, quando: pos.quandoTexto, local: local, link: pos.link,
          detalhe: 'Veículo ' + SGO_UTILS.safe(v.PLACA) + ' em uso sem retirada registrada no SGO+ (' + estado + ') às ' + pos.quandoTexto + ', em ' + local + '.'
        });
        out.usoSemRegistro.push(SGO_UTILS.safe(v.PLACA));
        if (a.novo) {
          Frota_auditar_(RASTR_SISTEMA, { acao: 'RASTREADOR_USO_SEM_REGISTRO', veiculoId: vid, placa: SGO_UTILS.safe(v.PLACA), campo: 'USO',
            detalhe: 'Uso sem registro: ' + estado + ' às ' + pos.quandoTexto + ', em ' + local + (pos.link ? ' (' + pos.link + ')' : '') + '.' });
          Rastreador_avisarGestao_('Uso sem registro: veículo ' + SGO_UTILS.safe(v.PLACA),
            'O rastreador mostra o veículo ' + SGO_UTILS.safe(v.PLACA) + ' em uso sem retirada registrada no SGO+.\nHora: ' + pos.quandoTexto + '\nSituação: ' + estado +
            '\nLocal: ' + local + (pos.link ? '\nMapa: ' + pos.link : '') +
            '\n\nConfirme com a equipe quem está com o veículo. Se foi esquecimento, a gestão registra a retirada no lugar do condutor, com justificativa. Depois de conferir, marque o alerta como conferido em Frota > Rastreador.', a.alerta.ID);
        }
      }
      // hodômetro: devolução recente sem leitura (veículo já parado) ou retirada dos últimos 10 min sem leitura
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
        if (SGO_UTILS.safeUpper(m.STATUS) === 'FINALIZADO' && String(m.KM_RASTREADOR_CHEGADA === undefined ? '' : m.KM_RASTREADOR_CHEGADA).trim() === '' &&
            isFinite(fim) && agora - fim < 2 * 3600000 && Rastreador_avaliarParado_(pos).pode) {
          var k2 = Rastreador_conferirKm_(m, v, 'CHEGADA', pos, RASTR_SISTEMA); if (k2) out.km.push(SGO_UTILS.safe(v.PLACA) + ' chegada');
        }
      });
    });

    // 4) bloqueio pendente há mais de 30 minutos: alerta para a gestão (uma vez)
    Rastreador_verificarAtrasos_();
    return out;
  } finally {
    try { cache.remove(RASTR_CACHE_RODADA); } catch (e) {}
    try { if (typeof SGO_Pendencias_invalidar_ === 'function') SGO_Pendencias_invalidar_(); } catch (e2) {}
  }
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
      '\n\nO SGO+ só bloqueia com o veículo parado e a ignição desligada. Confira onde está o veículo em Frota > Rastreador; se precisar, bloqueie pelo app da iTracker.', cmd.ID);
  });
}

// ------------------------------------------------------------
// CENTRAL DE PENDÊNCIAS (chamado por Pend_fonteFrota_)
// ------------------------------------------------------------
function Rastreador_pendencias_(add, veiculos, condutores) {
  if (!Pend_abaExiste_(RASTR_ABA_ALERTAS) && !Pend_abaExiste_(RASTR_ABA_COMANDOS)) return;
  Pend_ler_(RASTR_ABA_ALERTAS).forEach(function (a) {
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
        detalhe: Pend_s_(a.DETALHE) + ' Tentativas sem sucesso: ' + Pend_num_(a.OCORRENCIAS) + '. Enquanto isso não há liberação, bloqueio nem monitoramento pelo SGO+.',
        oQueFazer: 'Confira a internet do servidor e se a plataforma da iTracker está no ar. Se as credenciais mudaram, avise o responsável pelo sistema (Chaves e senhas > Rastreador > Testar conexão). Em emergência, libere ou bloqueie pelo app da iTracker.',
        textoEstavel: 'O SGO+ está sem comunicação com o rastreador.'
      }));
    }
  });
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
        oQueFazer: 'Libere em Frota > Rastreador > "Liberar partida" (com justificativa) ou pelo app da iTracker.',
        oQueFazerOutro: 'A gestão foi avisada e libera a partida pelo SGO+ ou pelo app da iTracker. Aguarde; o aviso some quando a partida for liberada.',
        textoEstavel: 'A partida do veículo \'' + placa + '\' não foi liberada pelo rastreador.'
      }));
    } else if (SGO_UTILS.safeUpper(cmd.ACAO) === 'BLOQUEAR' && !isNaN(desde.getTime()) && Date.now() - desde.getTime() >= RASTR_MIN_BLOQUEIO_ATRASADO * 60000) {
      add(Pend_item_('frota_rastreador_bloqueio', {
        id: 'FROTA:RASTR:BLQ:' + Pend_s_(cmd.ID), nome: placa, publico: 'GESTAO', gravidade: 'ATENCAO', dias: null, vencimento: desdeTxt.slice(0, 10), responsavel: 'Gestão da frota',
        titulo: 'Bloqueio da partida pendente há mais de ' + RASTR_MIN_BLOQUEIO_ATRASADO + ' minutos: veículo ' + placa,
        detalhe: 'Pedido em ' + desdeTxt + ' (' + Pend_s_(cmd.ORIGEM).toLowerCase() + '). ' + Pend_s_(cmd.MOTIVO) + ' O SGO+ só bloqueia com o veículo parado e a ignição desligada.',
        oQueFazer: 'Veja a última posição em Frota > Rastreador. Se o veículo deveria estar parado, confirme com quem devolveu; em emergência, bloqueie pelo app da iTracker. Uma nova retirada cancela o bloqueio pendente.',
        textoEstavel: 'O bloqueio da partida do veículo \'' + placa + '\' está pendente.'
      }));
    }
  });
}

// ------------------------------------------------------------
// API DA GESTÃO (Frota_apiDispatch). Só ADMIN, GESTOR, DIRETORIA.
// ------------------------------------------------------------
function Rastreador_exigirGestao_(sessionId) {
  var sessao = Frota_exigirEquipe_(sessionId);
  if (!Frota_ehGestao_(sessionId)) {
    throw new Error('Os comandos e o vínculo do rastreador são só da gestão (Administrador, Gestor ou Diretoria). A partida é liberada sozinha na sua retirada e bloqueada depois da sua devolução; se a partida não liberar, procure a gestão.');
  }
  Frota_bootstrap_();
  return sessao;
}

function Rastreador_exigirLigado_(c, oQue) {
  if (!c.ligado) throw new Error('O rastreador está desligado no SGO+ (Chaves e senhas > Rastreador, RASTREADOR_LIGADO). ' + (oQue || '') + ' Em emergência, use o app da iTracker.');
}

function Rastreador_veiculo_(veiculoId) {
  var v = SGO_DATA.getById(SGO_CFG.SHEETS.CAD_VEICULOS, SGO_UTILS.safe(veiculoId));
  if (!v) throw new Error('Veículo não encontrado. Atualize a tela e escolha de novo.');
  return v;
}

function Rastreador_exigirDispositivo_(v) {
  var dev = SGO_UTILS.safe(v.RASTREADOR_DEVICE_ID);
  if (!dev) throw new Error('O veículo ' + v.PLACA + ' não tem dispositivo do rastreador vinculado. Vincule em Frota > Rastreador > Vínculo veículo e dispositivo.');
  return dev;
}

function Rastreador_normalizarPlaca_(s) { return String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); }

/** Sugestão de dispositivo pela placa no nome, no identificador ou no atributo placa. */
function Rastreador_sugerir_(placa, dispositivos, usados) {
  var p = Rastreador_normalizarPlaca_(placa);
  if (p.length < 5) return null;
  return dispositivos.filter(function (d) {
    if (usados[d.id]) return false;
    return [d.nome, d.identificador, d.placa].some(function (x) { return Rastreador_normalizarPlaca_(x).indexOf(p) >= 0; });
  })[0] || null;
}

function Frota_apiListarRastreador(sessionId) {
  Rastreador_exigirGestao_(sessionId);
  var c = Rastreador_cfg_();
  var props = PropertiesService.getScriptProperties();
  var out = { ok: true, ligado: c.ligado, bloqueio: c.bloqueio, configurado: Rastreador_temCredencial_(c),
    endereco: c.url.replace(/^https?:\/\//, ''), ultimaRodada: '', ultimaLeituraOk: '', dispositivos: [], dispositivosErro: '', veiculos: [], comandos: [], alertas: [] };
  var ur = Number(props.getProperty(RASTR_PROP_ULTIMA_RODADA) || 0);
  if (ur) out.ultimaRodada = Rastreador_agoraTexto_(new Date(ur));
  var ul = props.getProperty(RASTR_PROP_ULTIMA_LEITURA);
  if (ul) out.ultimaLeituraOk = Rastreador_agoraTexto_(new Date(ul));

  var posicoes = {};
  if (c.ligado) {
    try { out.dispositivos = Rastreador_lerDispositivos_(c, true); }
    catch (e) { out.dispositivosErro = 'Não foi possível ler os dispositivos: ' + Rastreador_limpar_(e && e.message, c) + '.'; }
    try {
      var em = JSON.parse(CacheService.getScriptCache().get(RASTR_CACHE_POSICOES) || 'null');
      if (em && em.url === c.url) posicoes = em.posicoes || {};
      else if (!out.dispositivosErro) {
        posicoes = Rastreador_lerPosicoes_(c);
        CacheService.getScriptCache().put(RASTR_CACHE_POSICOES, JSON.stringify({ url: c.url, em: Date.now(), posicoes: posicoes }), 900);
      }
    } catch (e2) { if (!out.dispositivosErro) out.dispositivosErro = 'Não foi possível ler as posições: ' + Rastreador_limpar_(e2 && e2.message, c) + '.'; }
  }
  var usados = {};
  var veiculos = Frota_veiculosComSituacao_().filter(function (v) { return SGO_UTILS.safeUpper(v.STATUS) !== 'INATIVO'; })
    .sort(function (a, b) { return SGO_UTILS.safe(a.PLACA).localeCompare(SGO_UTILS.safe(b.PLACA)); });
  veiculos.forEach(function (v) { var d = SGO_UTILS.safe(v.RASTREADOR_DEVICE_ID); if (d) usados[d] = SGO_UTILS.safe(v.PLACA); });
  out.dispositivos = out.dispositivos.map(function (d) { return Object.assign({}, d, { vinculadoA: usados[d.id] || '' }); });
  out.veiculos = veiculos.map(function (v) {
    var dev = SGO_UTILS.safe(v.RASTREADOR_DEVICE_ID);
    var pos = dev ? posicoes[dev] : null;
    var sug = !dev ? Rastreador_sugerir_(v.PLACA, out.dispositivos, usados) : null;
    return {
      id: SGO_UTILS.safe(v.ID), placa: SGO_UTILS.safe(v.PLACA), modelo: SGO_UTILS.safe(v.MODELO), situacao: v.SITUACAO, condutorNome: v.CONDUTOR_NOME || '',
      kmAtual: Frota_num_(v.KM_ATUAL, 0), deviceId: dev, deviceNome: SGO_UTILS.safe(v.RASTREADOR_DEVICE_NOME), aceitaBloqueio: SGO_UTILS.safeUpper(v.RASTREADOR_ACEITA_BLOQUEIO),
      comandosConferidosEm: v.RASTREADOR_COMANDOS_CONFERIDOS_EM ? Rastreador_agoraTexto_(new Date(v.RASTREADOR_COMANDOS_CONFERIDOS_EM)) : '',
      sugestao: sug ? { id: sug.id, nome: sug.nome } : null,
      posicao: pos ? { quando: pos.quandoTexto, kmh: pos.kmh, ignicao: pos.ignicao, movimento: pos.movimento, odometroKm: pos.odometroKm, local: Rastreador_localTexto_(pos), link: pos.link,
        parado: Rastreador_avaliarParado_(pos).pode } : null
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
  if (dev && !/^\d{1,12}$/.test(dev)) throw new Error('O ID do dispositivo no rastreador é um número (ex.: 1234), o "ID" da lista de dispositivos, não o IMEI nem a placa.');
  var antes = SGO_UTILS.safe(v.RASTREADOR_DEVICE_ID);
  if (dev === antes) return { placa: v.PLACA, deviceId: dev, deviceNome: SGO_UTILS.safe(v.RASTREADOR_DEVICE_NOME), aceitaBloqueio: SGO_UTILS.safeUpper(v.RASTREADOR_ACEITA_BLOQUEIO), semMudanca: true, aviso: '' };
  if (dev) {
    var outro = SGO_DATA.getAll(SGO_CFG.SHEETS.CAD_VEICULOS).filter(function (x) { return SGO_UTILS.safe(x.ID) !== SGO_UTILS.safe(v.ID) && SGO_UTILS.safe(x.RASTREADOR_DEVICE_ID) === dev; })[0];
    if (outro) throw new Error('O dispositivo ' + dev + ' já está vinculado ao veículo ' + outro.PLACA + '. Desvincule lá primeiro (deixe o campo vazio e grave).');
  }
  var nome = '', aceita = '', conferidoEm = '', aviso = '';
  if (dev && c.ligado) {
    try {
      var d = Rastreador_lerDispositivos_(c, false).filter(function (x) { return x.id === dev; })[0];
      if (!d) throw new Error('O dispositivo ' + dev + ' não aparece para o usuário de integração no rastreador. Confira o ID na lista de dispositivos ou peça à iTracker o acesso a ele.');
      nome = d.nome;
      var tipos = Rastreador_lerTiposComando_(c, dev);
      aceita = tipos.indexOf('engineStop') >= 0 && tipos.indexOf('engineResume') >= 0 ? 'SIM' : 'NAO';
      conferidoEm = SGO_UTILS.nowIso();
      if (aceita === 'NAO') aviso = 'O dispositivo não aceita bloquear e liberar a partida pela plataforma: este veículo fica só com o monitoramento. Peça à iTracker a liberação dos comandos.';
    } catch (e) {
      if (!e.rastreadorRede && /não aparece/.test(String(e.message))) throw e;
      aviso = 'Vínculo gravado sem conferir no rastreador (' + Rastreador_limpar_(e && e.message, c) + '). Depois use "Conferir comandos".';
    }
  } else if (dev) {
    aviso = 'O rastreador está desligado no SGO+: o vínculo foi gravado sem conferir o dispositivo. Depois de ligar, use "Conferir comandos".';
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

function Frota_apiRastreadorConferirComandos(sessionId, payload) {
  var sessao = Rastreador_exigirGestao_(sessionId);
  var c = Rastreador_cfg_();
  Rastreador_exigirLigado_(c, 'Ligue o rastreador para conferir os comandos.');
  var v = Rastreador_veiculo_((payload || {}).veiculoId);
  var dev = Rastreador_exigirDispositivo_(v);
  var tipos;
  try { tipos = Rastreador_lerTiposComando_(c, dev); }
  catch (e) { throw new Error('Não foi possível conferir os comandos: ' + Rastreador_limpar_(e && e.message, c) + '. Tente de novo em alguns minutos.'); }
  var aceita = tipos.indexOf('engineStop') >= 0 && tipos.indexOf('engineResume') >= 0 ? 'SIM' : 'NAO';
  SGO_DATA.update(SGO_CFG.SHEETS.CAD_VEICULOS, v.ID, { RASTREADOR_ACEITA_BLOQUEIO: aceita, RASTREADOR_COMANDOS_CONFERIDOS_EM: SGO_UTILS.nowIso() });
  Frota_auditar_(sessao, { acao: 'RASTREADOR_COMANDOS_CONFERIDOS', veiculoId: SGO_UTILS.safe(v.ID), placa: SGO_UTILS.safe(v.PLACA), campo: 'RASTREADOR_ACEITA_BLOQUEIO',
    antes: SGO_UTILS.safeUpper(v.RASTREADOR_ACEITA_BLOQUEIO), depois: aceita, detalhe: 'Comandos do dispositivo ' + dev + ' conferidos: bloquear ' + (tipos.indexOf('engineStop') >= 0 ? 'sim' : 'não') + ', liberar ' + (tipos.indexOf('engineResume') >= 0 ? 'sim' : 'não') + '.' });
  return { ok: true, placa: v.PLACA, aceitaBloqueio: aceita, bloquear: tipos.indexOf('engineStop') >= 0, liberar: tipos.indexOf('engineResume') >= 0, outros: tipos.length - (tipos.indexOf('engineStop') >= 0 ? 1 : 0) - (tipos.indexOf('engineResume') >= 0 ? 1 : 0) };
}

/** "Liberar partida" (gestão, com justificativa). Cancela bloqueio pendente do veículo. */
function Frota_apiRastreadorLiberar(sessionId, payload) {
  var sessao = Rastreador_exigirGestao_(sessionId);
  payload = payload || {};
  var c = Rastreador_cfg_();
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
    throw new Error('A partida do veículo ' + v.PLACA + ' não foi liberada: ' + r.motivo + '. Tente de novo em alguns minutos ou libere pelo app da iTracker. O pedido ficou na trilha de auditoria.');
  }
  return { ok: true, placa: v.PLACA, texto: 'Partida do veículo ' + v.PLACA + ' liberada.' + (r.naFila ? ' O comando está na fila da plataforma e chega quando o aparelho se conectar.' : '') + (cancelados ? ' O bloqueio pendente foi cancelado.' : '') };
}

/** "Bloquear agora" (gestão, com justificativa). Também só envia com o veículo parado e a ignição desligada. */
function Frota_apiRastreadorBloquear(sessionId, payload) {
  var sessao = Rastreador_exigirGestao_(sessionId);
  payload = payload || {};
  var c = Rastreador_cfg_();
  Rastreador_exigirLigado_(c, 'Nada foi enviado.');
  if (!c.bloqueio) throw new Error('Os comandos de bloqueio estão desligados no SGO+ (Chaves e senhas > Rastreador, RASTREADOR_BLOQUEIO_LIGADO): só o monitoramento está ativo. Nada foi enviado. Em emergência, use o app da iTracker.');
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
  try { pos = Rastreador_lerPosicoes_(c, dev)[dev] || null; Rastreador_conexaoOk_(); }
  catch (e) { erroLeitura = Rastreador_limpar_(e && e.message, c); if (e && e.rastreadorRede) Rastreador_falhaConexao_(erroLeitura); }
  if (erroLeitura) {
    SGO_DATA.update(RASTR_ABA_COMANDOS, cmd.ID, { MOTIVO: 'Aguardando: ' + erroLeitura + '.', ULTIMA_TENTATIVA_EM: SGO_UTILS.nowIso() });
    return { ok: true, placa: v.PLACA, enviado: false, texto: 'Bloqueio pendente: não foi possível ler a posição agora (' + erroLeitura + '). O SGO+ tenta de novo a cada 2 minutos e só envia com o veículo parado e a ignição desligada.' };
  }
  var r = Rastreador_tentar_(c, cmd, v, pos, sessao);
  if (r.enviado) return { ok: true, placa: v.PLACA, enviado: true, texto: 'Partida do veículo ' + v.PLACA + ' bloqueada.' + (r.naFila ? ' O comando está na fila da plataforma.' : '') };
  return { ok: true, placa: v.PLACA, enviado: false, texto: 'Bloqueio pendente (' + r.motivo + '). O SGO+ envia sozinho quando o veículo estiver parado com a ignição desligada; nunca com o veículo em movimento.' };
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
    detalhe: 'Alerta do rastreador conferido: ' + SGO_UTILS.safe(a.DETALHE) });
  return { ok: true };
}

/** "Ler o rastreador agora" (gestão): a mesma rodada da rotina, com intervalo mínimo de 20 segundos. */
function Frota_apiRastreadorAtualizarAgora(sessionId) {
  Rastreador_exigirGestao_(sessionId);
  var c = Rastreador_cfg_();
  Rastreador_exigirLigado_(c, 'Nada foi lido.');
  var r = Rastreador_rodada_({ manual: true });
  if (r.pulada) return { ok: true, texto: r.texto };
  if (r.erro) throw new Error('Não foi possível ler o rastreador: ' + r.erro + '. A gestão recebeu o alerta de conexão; tente de novo em alguns minutos.');
  return { ok: true, texto: 'Rastreador lido: ' + r.posicoes + (r.posicoes === 1 ? ' posição' : ' posições') + '; ' + r.enviados.length + (r.enviados.length === 1 ? ' comando enviado' : ' comandos enviados') +
    (r.pendentes.length ? '; ' + r.pendentes.length + ' pendente(s)' : '') + (r.usoSemRegistro.length ? '; uso sem registro: ' + r.usoSemRegistro.join(', ') : '') + '.' };
}

// ------------------------------------------------------------
// TESTE DE CONEXÃO (Chaves e senhas, só o dono). Lista os dispositivos; nunca mostra segredo.
// ------------------------------------------------------------
function Rastreador_testarConexao_() {
  var c = Rastreador_cfg_();
  if (!Rastreador_temCredencial_(c)) {
    return { funcionou: false, texto: 'Não funcionou: faltam as credenciais — grave RASTREADOR_TOKEN, ou RASTREADOR_USUARIO e RASTREADOR_SENHA, e teste de novo.', dispositivos: [] };
  }
  Rastreador_esquecerSessao_();
  try {
    var lista = Rastreador_lerDispositivos_(c, false);
    return {
      funcionou: true, dispositivos: lista.map(function (d) { return { id: d.id, nome: d.nome, situacao: d.situacao === 'online' ? 'conectado' : (d.situacao === 'offline' ? 'desconectado' : (d.situacao ? 'sem informação' : '')) }; }),
      texto: 'Funcionou: entrou em ' + c.url.replace(/^https?:\/\//, '') + ' e encontrou ' + lista.length + (lista.length === 1 ? ' dispositivo' : ' dispositivos') + '.' +
        (c.ligado ? '' : ' O rastreador continua desligado no SGO+ até RASTREADOR_LIGADO = 1.') + (c.ligado && !c.bloqueio ? ' Bloqueio desligado: só monitoramento.' : '')
    };
  } catch (e) {
    return { funcionou: false, texto: 'Não funcionou: ' + Rastreador_limpar_(e && e.message, c) + '.', dispositivos: [] };
  }
}
