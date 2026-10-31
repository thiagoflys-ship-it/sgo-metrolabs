/****************************************************
 * SEGURANÇA DO ACESSO — troca de senha obrigatória e código no celular (31/10/2026)
 *
 * Pedido do dono (31/10/2026): "Quero que da próxima vez que todos entrarem no sistema apareça uma tela de mude
 * sua senha e isso é obrigatório, também queria que gerasse token e enviasse ao celular cadastrado, temos que
 * proteger o sistema de invasões."
 *
 * 1. TROCA DE SENHA OBRIGATÓRIA
 *    - Marca por pessoa: CAD_USUARIOS.PRECISA_TROCAR_SENHA = "SIM". Senha definida pela gestão em Usuários
 *      (conta nova ou "redefinir senha") também marca: a senha provisória só serve para criar a definitiva.
 *    - Login com a marca: a sessão nasce PENDENTE (SGO_Auth.js, criarSessaoLoginAuth_). validarSessao devolve
 *      valid:false com pendente "TROCA_SENHA", então exigirSessao e todas as telas recusam; o servidor recusa
 *      antes (sgo_servidor, FUNCOES_TROCA_SENHA). Só trocarSenhaAcesso aceita a sessão pendente.
 *    - Marca aplicada depois do login: em até 5 minutos a sessão aberta também fica pendente (pede a senha atual).
 *    - Regras: 8 caracteres ou mais, letra e número, sem espaço no começo/fim, diferente da atual, não óbvia
 *      (sequências, nome, login, empresa), confirmação igual. Hash forte (PBKDF2, SGO_Auth.js).
 *    - Trocar a senha aumenta SEGURANCA_VERSAO: derruba os aparelhos confiados e as outras sessões da pessoa.
 *
 * 2. CÓDIGO NO CELULAR (segundo fator), configuração SEGA_CONFIG (propriedade do script):
 *      modo DESLIGADO (padrão) | EMAIL (só e-mail) | WHATSAPP (WhatsApp oficial com e-mail de reserva);
 *      perfis: [] = todos; senão só os perfis da lista (para começar por alguns).
 *    - Depois da senha certa: código de 6 dígitos, 10 minutos, uso único, no máximo 5 tentativas por login,
 *      reenvio depois de 60 s e no máximo 3 por login. Sem sessão até o código certo (verificarCodigoAcesso).
 *    - WhatsApp só pela Meta (Cloud API), modelo de autenticação sgo_codigo_acesso (SEGA_MODELO_META). Falhou ou
 *      a pessoa não tem celular: e-mail. Nenhuma outra mensagem vai pelo WhatsApp neste fluxo. O código é pedido
 *      pela própria pessoa naquela hora: sai em qualquer horário (não passa pela matriz de avisos nem pelo piloto;
 *      o servidor libera só este modelo, sgo_servidor whatsappPiloto.ts regra 5).
 *    - Aparelho confiado por 30 dias: token aleatório só no cookie HttpOnly sgo_aparelho (o servidor põe e tira);
 *      aqui fica só o resumo SHA-256 (SEGA_APR_<resumo>) com a pessoa e a versão de segurança.
 *
 * 3. RECUPERAÇÃO: o Administrador "exige nova senha" e "zera o segundo fator" de uma pessoa (motivo obrigatório);
 *    zerar derruba os aparelhos confiados e as sessões e dispensa o código por 24 h. O dono nunca fica trancado:
 *    script do servidor sgo_servidor/scripts/seguranca_recuperar_acesso.ts (SegAcesso_recuperarAcesso_).
 *
 * 4. REGISTRO DE SEGURANÇA: aba SYS_SEGURANCA_ACESSO (quem, quando, evento, IP, aparelho, detalhe, por quem).
 *    Nunca guarda senha, código nem token.
 *
 * 5. ENTRADA PELO E-MAIL E "ESQUECI MINHA SENHA" (31/10/2026, pedido do dono: "Redefinição de senha e esqueci senha, você
 *    tem que implantar, e acho que o usuário tem que ser o e-mail cadastrado"):
 *    - login(e-mail, senha) em SGO_Auth.js; o nome de usuário (CAD_USUARIOS.USUARIO) fica só por dentro.
 *    - pedirRedefinicaoSenha(e-mail): resposta SEMPRE igual ("Se o e-mail estiver cadastrado, enviamos um link"). O link
 *      (#redefinir=<token> na URL pública do sistema) leva um token aleatório de 32 bytes; aqui fica só o resumo SHA-256
 *      (SEGA_RED_<resumo>), uso único, 30 minutos, um link vivo por pessoa (o novo apaga o anterior). Limite: 3 pedidos por
 *      e-mail por hora (aqui) e por conexão (servidor, limiteLogin.ts).
 *    - Ao abrir o link: se o perfil exige o código e o modo é WhatsApp com celular válido, pede também o código no
 *      WhatsApp (reserva por e-mail): só invadir o e-mail não basta. Depois, a senha nova com as regras de sempre.
 *    - Concluir: grava a senha, derruba TODAS as sessões e aparelhos confiados da pessoa, avisa por e-mail ("sua senha foi
 *      alterada; se não foi você, avise a gestão") e grava no registro.
 *    - A gestão envia o link em Administração > Usuários ("Enviar link de redefinição", com motivo). O link do tipo MP
 *      (Modo personalizado) apaga a senha do modo personalizado para a pessoa criar outra (SGO_ModoPersonalizado.js).
 *    - Trocar minha senha (menu da pessoa): trocarSenhaAcesso com a senha atual; derruba as outras sessões dela.
 *
 * Tela: Administração > Segurança do acesso (JS_SegurancaAcesso.html), pela função SegAcesso_api.
 * Nenhuma função devolve Date ao navegador: só texto.
 ****************************************************/

var SEGA_CONFIG_PROP = 'SEGA_CONFIG';
var SEGA_MODELO_PROP = 'SEGA_MODELO_SITUACAO';
var SEGA_MODOS = ['DESLIGADO', 'EMAIL', 'WHATSAPP'];
var SEGA_ROTULO_MODO = { DESLIGADO: 'Desligado', EMAIL: 'Só e-mail', WHATSAPP: 'WhatsApp com e-mail de reserva' };
var SEGA_CODIGO_VALIDADE_MS = 10 * 60 * 1000;
var SEGA_DESAFIO_VIDA_MS = 30 * 60 * 1000;
var SEGA_MAX_TENTATIVAS = 5;
var SEGA_REENVIO_ESPERA_MS = 60 * 1000;
var SEGA_MAX_REENVIOS = 3;
var SEGA_APARELHO_DIAS = 30;
var SEGA_DISPENSA_HORAS = 24;
var SEGA_MAX_ERROS_SENHA_ATUAL = 5;
var SEGA_FUSO = 'America/Sao_Paulo';
var SEGA_ABA = 'SYS_SEGURANCA_ACESSO';
var SEGA_COLUNAS = ['ID', 'QUANDO', 'EVENTO', 'USUARIO', 'USUARIO_ID', 'PERFIL', 'IP', 'APARELHO', 'DETALHE', 'POR'];
var SEGA_COLUNAS_USUARIO = ['PRECISA_TROCAR_SENHA', 'SEGURANCA_VERSAO', 'SENHA_TROCADA_EM'];
/** Perfis técnicos (integração), fora da troca obrigatória e do código. */
var SEGA_PERFIS_FORA = ['AUVO_SYNC'];
/**
 * Modelo da Meta para o código (categoria AUTHENTICATION). A Meta não aceita texto livre nesta categoria: o corpo é o
 * texto fixo dela em português ("*{{1}}* é seu código de verificação.") com a recomendação de segurança ("Para sua
 * segurança, não compartilhe este código.") e o rodapé de validade ("Este código expira em 10 minutos."), mais o botão
 * "Copiar código". Cadastro: botão em Segurança do acesso ou sgo_servidor/scripts/cadastrar_modelo_codigo_meta.ts.
 */
var SEGA_MODELO_META = { nome: 'sgo_codigo_acesso', idioma: 'pt_BR', categoria: 'AUTHENTICATION', validadeMin: 10, botao: 'Copiar código' };
var SEGA_EVENTOS = {
  LOGIN_OK: 'Entrou no sistema', LOGIN_FALHA: 'Senha errada', LOGIN_NEGADO: 'Entrada recusada', LOGOUT: 'Saiu',
  CODIGO_ENVIADO: 'Código enviado', CODIGO_REENVIADO: 'Código reenviado', CODIGO_OK: 'Código certo', CODIGO_ERRADO: 'Código errado',
  CODIGO_VENCIDO: 'Código vencido', CODIGO_BLOQUEADO: 'Login cancelado (5 códigos errados)', CODIGO_FALHA_ENVIO: 'Código não enviado',
  CODIGO_DISPENSADO: 'Sem código (aparelho confiado ou liberação)', APARELHO_CONFIADO: 'Aparelho confiado por 30 dias',
  SENHA_TROCADA: 'Senha trocada', SENHA_TROCA_FALHA: 'Troca de senha recusada', TROCA_EXIGIDA: 'Troca de senha exigida',
  TROCA_EXIGIDA_TODOS: 'Troca de senha exigida de todos', SEGUNDO_FATOR_ZERADO: 'Segundo fator zerado',
  CONFIG_ALTERADA: 'Configuração alterada', RECUPERACAO: 'Acesso recuperado pelo servidor', MODELO_META: 'Modelo da Meta',
  // 31/10/2026: "esqueci minha senha" e redefinição pelo link
  REDEFINICAO_PEDIDA: 'Pediu o link de nova senha', REDEFINICAO_LINK_ENVIADO: 'Link de nova senha enviado', REDEFINICAO_IGNORADA: 'Pedido de link sem envio',
  REDEFINICAO_LINK_GESTAO: 'Link de nova senha enviado pela gestão', REDEFINICAO_LINK_INVALIDO: 'Link de nova senha vencido ou usado',
  REDEFINICAO_CODIGO_ENVIADO: 'Código do link enviado', REDEFINICAO_CODIGO_ERRADO: 'Código do link errado', REDEFINICAO_CONCLUIDA: 'Senha redefinida pelo link',
  REDEFINICAO_MP_CONCLUIDA: 'Senha do modo personalizado liberada pelo link', SESSOES_DERRUBADAS: 'Sessões e aparelhos desconectados'
};

// ------------------------------------------------------------
// BÁSICOS
// ------------------------------------------------------------
function SegAcesso_txt_(v) { return v === null || v === undefined ? '' : String(v).trim(); }

/** Contexto do servidor ({ ip, agente, aparelho }); nada disso vem da tela. */
function SegAcesso_ctx_(ctx) {
  ctx = ctx && typeof ctx === 'object' ? ctx : {};
  return {
    ip: SegAcesso_txt_(ctx.ip).slice(0, 60),
    agente: SegAcesso_txt_(ctx.agente).slice(0, 200),
    aparelho: /^[0-9a-f]{64}$/.test(SegAcesso_txt_(ctx.aparelho)) ? SegAcesso_txt_(ctx.aparelho) : ''
  };
}

function SegAcesso_agora_() { return Utilities.formatDate(new Date(), SEGA_FUSO, "yyyy-MM-dd'T'HH:mm:ss"); }
function SegAcesso_dataBr_(v) {
  if (!v) return '';
  var d = Object.prototype.toString.call(v) === '[object Date]' ? v : new Date(String(v).length === 19 ? String(v) + '-03:00' : String(v));
  if (isNaN(d.getTime())) return String(v);
  return Utilities.formatDate(d, SEGA_FUSO, 'dd/MM/yyyy HH:mm:ss');
}

function SegAcesso_cripto_() { return typeof criptoNativaAuth_ === 'function' ? criptoNativaAuth_() : null; }
function SegAcesso_sha256_(t) {
  var c = SegAcesso_cripto_();
  return c && typeof c.sha256Hex === 'function' ? String(c.sha256Hex(String(t))) : hashHexAuth_(String(t));
}
/** Hexadecimal aleatório (bytes*2 caracteres). */
function SegAcesso_hex_(bytes) {
  var c = SegAcesso_cripto_();
  if (c && typeof c.aleatorioHex === 'function') return String(c.aleatorioHex(bytes));
  var s = '';
  while (s.length < bytes * 2) s += Utilities.getUuid().replace(/-/g, '');
  return s.slice(0, bytes * 2);
}
/** Código de 6 dígitos (aleatório seguro no servidor). */
function SegAcesso_gerarCodigo_() {
  var n = parseInt(SegAcesso_hex_(6), 16) % 1000000;
  return ('000000' + n).slice(-6);
}

function SegAcesso_props_() { return PropertiesService.getScriptProperties(); }
function SegAcesso_lerJson_(chave) {
  try { var t = SegAcesso_props_().getProperty(chave); return t ? JSON.parse(t) : null; } catch (e) { return null; }
}
function SegAcesso_primeiroNome_(nome) {
  var p = SegAcesso_txt_(nome).split(/\s+/)[0] || '';
  return p ? p.charAt(0).toUpperCase() + p.slice(1).toLowerCase() : '';
}
function SegAcesso_celular_(u) {
  var d = SegAcesso_txt_(u && u.CELULAR).replace(/\D/g, '').replace(/^0+/, '');
  if (d.length === 10 || d.length === 11) d = '55' + d;
  return /^55\d{10,11}$/.test(d) ? d : '';
}
function SegAcesso_email_(u) {
  var e = SegAcesso_txt_(u && u.EMAIL).toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) ? e : '';
}
function SegAcesso_mascararEmail_(e) {
  var p = String(e || '').split('@');
  if (p.length !== 2) return '';
  return p[0].charAt(0) + '•••' + (p[0].length > 1 ? p[0].slice(-1) : '') + '@' + p[1];
}
function SegAcesso_versao_(u) { return Number(u && u.SEGURANCA_VERSAO) || 0; }
function SegAcesso_foraDoFluxo_(perfil) { return SEGA_PERFIS_FORA.indexOf(SegAcesso_txt_(perfil).toUpperCase()) >= 0; }

/** "Celular Android · Chrome", "Computador Windows · Edge"... (sem guardar o texto inteiro do navegador). */
function SegAcesso_descreverAgente_(ua) {
  ua = String(ua || '');
  if (!ua) return '';
  var so = /Android/i.test(ua) ? 'Celular Android' : /iPhone|iPod/i.test(ua) ? 'iPhone' : /iPad/i.test(ua) ? 'iPad' :
    /Windows/i.test(ua) ? 'Computador Windows' : /Macintosh|Mac OS X/i.test(ua) ? 'Computador Mac' : /Linux/i.test(ua) ? 'Computador Linux' : 'Aparelho';
  var nav = /Edg\//.test(ua) ? 'Edge' : /OPR\//.test(ua) ? 'Opera' : /SamsungBrowser/.test(ua) ? 'Samsung Internet' : /Firefox\//.test(ua) ? 'Firefox' :
    /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : 'navegador';
  return so + ' · ' + nav;
}

/** Colunas novas em CAD_USUARIOS e a aba do registro (uma vez a cada 6 h). Nunca lança. */
function SegAcesso_garantirEstrutura_() {
  var cache = null;
  try { cache = CacheService.getScriptCache(); if (cache.get('SEGA_ESTRUTURA_OK_V1')) return; } catch (e) { cache = null; }
  try {
    var aba = (SGO_CFG.SHEETS && SGO_CFG.SHEETS.CAD_USUARIOS) || 'CAD_USUARIOS';
    if (typeof CertCal_garantirColuna_ === 'function') SEGA_COLUNAS_USUARIO.forEach(function (c) { CertCal_garantirColuna_(aba, c); });
    if (typeof CertCal_garantirTabela_ === 'function') CertCal_garantirTabela_(SEGA_ABA, SEGA_COLUNAS);
    if (typeof CertCal_forcarColunaTexto_ === 'function') { CertCal_forcarColunaTexto_(SEGA_ABA, 'QUANDO'); CertCal_forcarColunaTexto_(aba, 'SENHA_TROCADA_EM'); }
    if (typeof SGO_DATA !== 'undefined') { SGO_DATA._headersCache = {}; SGO_DATA._headerMapCache = {}; }
    if (cache) cache.put('SEGA_ESTRUTURA_OK_V1', '1', 21600);
  } catch (e) {
    try { console.warn('Segurança do acesso: não foi possível preparar as colunas: ' + ((e && e.message) || e)); } catch (x) {}
  }
}

/** Uma linha no registro de segurança. Nunca lança; nunca recebe senha, código nem token. */
function SegAcesso_registrar_(evento, u, ctx, detalhe, por) {
  try {
    SegAcesso_garantirEstrutura_();
    var sh = SpreadsheetApp.openById(SGO_CFG.DB_ID).getSheetByName(SEGA_ABA);
    if (!sh) return;
    var c = ctx || {};
    sh.appendRow([
      Utilities.getUuid(), SegAcesso_agora_(), String(evento || ''), SegAcesso_txt_(u && u.USUARIO).toLowerCase(), SegAcesso_txt_(u && u.ID),
      SegAcesso_txt_(u && u.PERFIL).toUpperCase(), SegAcesso_txt_(c.ip), SegAcesso_descreverAgente_(c.agente), SegAcesso_txt_(detalhe).slice(0, 500), SegAcesso_txt_(por)
    ]);
  } catch (e) {
    // o registro não pode derrubar o login
  }
}

/** Registro de CAD_USUARIOS por ID (com as contas de representada), já no formato da sessão, com a SENHA à parte. */
function SegAcesso_usuarioPorId_(id) {
  var alvo = SegAcesso_txt_(id);
  if (!alvo) return null;
  var antes = typeof SGO_DATA_REP_VISIVEL === 'undefined' ? false : SGO_DATA_REP_VISIVEL;
  SGO_DATA_REP_VISIVEL = true;
  try {
    var r = SGO_DATA.getAll(SGO_CFG.SHEETS.CAD_USUARIOS).filter(function (x) { return SegAcesso_txt_(x.ID) === alvo; })[0];
    if (!r) return null;
    var u = usuarioParaSessaoAuth_(r);
    u.SENHA = r.SENHA;
    return u;
  } finally { SGO_DATA_REP_VISIVEL = antes; }
}

// ------------------------------------------------------------
// CONFIGURAÇÃO
// ------------------------------------------------------------
function SegAcesso_config_() {
  var j = SegAcesso_lerJson_(SEGA_CONFIG_PROP) || {};
  var modo = SegAcesso_txt_(j.modo).toUpperCase();
  if (SEGA_MODOS.indexOf(modo) < 0) modo = 'DESLIGADO';
  var perfis = (Array.isArray(j.perfis) ? j.perfis : []).map(function (p) { return SegAcesso_txt_(p).toUpperCase(); }).filter(Boolean);
  return { modo: modo, perfis: perfis, alteradoEm: SegAcesso_txt_(j.alteradoEm), alteradoPor: SegAcesso_txt_(j.alteradoPor) };
}

function SegAcesso_exigeCodigo_(u, cfg) {
  if (!cfg || cfg.modo === 'DESLIGADO') return false;
  var perfil = SegAcesso_txt_(u && u.PERFIL).toUpperCase();
  if (SegAcesso_foraDoFluxo_(perfil)) return false;
  return !cfg.perfis.length || cfg.perfis.indexOf(perfil) >= 0;
}

/** Liberação temporária do código dada pelo Administrador ou pelo script de recuperação (até a data gravada). */
function SegAcesso_dispensado_(u) {
  var j = SegAcesso_lerJson_('SEGA_DISPENSA_' + SegAcesso_txt_(u && u.ID));
  return !!(j && Date.parse(j.ate) > Date.now() && Number(j.v) === SegAcesso_versao_(u));
}

// ------------------------------------------------------------
// APARELHO CONFIADO (30 dias)
// ------------------------------------------------------------
function SegAcesso_chaveAparelho_(hash) { return 'SEGA_APR_' + hash; }

function SegAcesso_aparelhoValido_(token, u) {
  if (!/^[0-9a-f]{64}$/.test(String(token || '')) || !u) return false;
  var hash = SegAcesso_sha256_(token);
  var j = SegAcesso_lerJson_(SegAcesso_chaveAparelho_(hash));
  if (!j) return false;
  if (SegAcesso_txt_(j.u) !== SegAcesso_txt_(u.ID) || Number(j.v) !== SegAcesso_versao_(u) || !(Date.parse(j.exp) > Date.now())) {
    try { SegAcesso_props_().deleteProperty(SegAcesso_chaveAparelho_(hash)); } catch (e) {}
    return false;
  }
  return true;
}

/** Cria o aparelho confiado: { token (só para o cookie), hash (para a sessão) }. */
function SegAcesso_criarAparelho_(u, ctx) {
  var token = SegAcesso_hex_(32), hash = SegAcesso_sha256_(token);
  SegAcesso_props_().setProperty(SegAcesso_chaveAparelho_(hash), JSON.stringify({
    u: SegAcesso_txt_(u.ID), v: SegAcesso_versao_(u), exp: new Date(Date.now() + SEGA_APARELHO_DIAS * 86400000).toISOString(),
    em: SegAcesso_agora_(), ag: SegAcesso_descreverAgente_(ctx && ctx.agente)
  }));
  return { token: token, hash: hash };
}

/** Mantém o aparelho confiado deste login depois da troca de senha (a versão nova vale só para ele). */
function SegAcesso_reestamparAparelho_(hash, u, versao) {
  var j = SegAcesso_lerJson_(SegAcesso_chaveAparelho_(hash));
  if (!j || SegAcesso_txt_(j.u) !== SegAcesso_txt_(u.ID)) return false;
  j.v = versao;
  SegAcesso_props_().setProperty(SegAcesso_chaveAparelho_(hash), JSON.stringify(j));
  return true;
}

// ------------------------------------------------------------
// DESAFIO (o login entre a senha certa e o código certo)
// ------------------------------------------------------------
function SegAcesso_chaveDesafio_(id) { return 'SEGA_DSF_' + id; }
function SegAcesso_lerDesafio_(id) {
  if (!/^DSF_[0-9a-f]{32}$/.test(String(id || ''))) return null;
  try {
    var t = CacheService.getScriptCache().get(SegAcesso_chaveDesafio_(id));
    var d = t ? JSON.parse(t) : null;
    if (!d || d.id !== id || Date.now() - Number(d.criadoMs) > SEGA_DESAFIO_VIDA_MS) return null;
    return d;
  } catch (e) { return null; }
}
function SegAcesso_guardarDesafio_(d) {
  var resta = Math.ceil((SEGA_DESAFIO_VIDA_MS - (Date.now() - Number(d.criadoMs))) / 1000);
  CacheService.getScriptCache().put(SegAcesso_chaveDesafio_(d.id), JSON.stringify(d), Math.max(1, Math.min(21600, resta)));
}
function SegAcesso_apagarDesafio_(id) { try { CacheService.getScriptCache().remove(SegAcesso_chaveDesafio_(id)); } catch (e) {} }

function SegAcesso_travar_(fn) {
  var trava = null;
  try { trava = LockService.getScriptLock(); trava.waitLock(15000); } catch (e) { trava = null; }
  try { return fn(); } finally { try { if (trava) trava.releaseLock(); } catch (e) {} }
}

/** Resposta da etapa do código (sem nada secreto). */
function SegAcesso_respostaCodigo_(d, u, extra) {
  var r = {
    success: true, etapa: 'CODIGO', desafio: d.id, canal: d.canal, destino: d.destino,
    validadeMin: Math.round(SEGA_CODIGO_VALIDADE_MS / 60000),
    reenviarEmS: Math.max(0, Math.ceil((Number(d.ultimoEnvioMs) + SEGA_REENVIO_ESPERA_MS - Date.now()) / 1000)),
    reenviosRestantes: Math.max(0, SEGA_MAX_REENVIOS - (Number(d.reenvios) || 0)),
    tentativasRestantes: Math.max(0, SEGA_MAX_TENTATIVAS - (Number(d.tentativas) || 0)),
    podeEmail: d.canal !== 'EMAIL' && !!SegAcesso_email_(u),
    nome: SegAcesso_primeiroNome_(u.NOME),
    message: 'Enviamos um código de 6 números para ' + (d.canal === 'WHATSAPP' ? 'o ' : 'o seu ') + d.destino + '.' +
      (d.reserva ? (/sem celular/.test(String(d.motivoReserva || '')) ? ' O seu cadastro não tem celular válido, por isso o código foi para o e-mail (peça à gestão para cadastrar o celular).' : ' O WhatsApp não funcionou agora, por isso o código foi para o e-mail.') : '') +
      ' Ele vale por 10 minutos e só pode ser usado uma vez.'
  };
  if (extra) Object.keys(extra).forEach(function (k) { r[k] = extra[k]; });
  return r;
}

/** Gera um código novo para o desafio e envia. Devolve { ok, message? } e preenche o desafio. */
function SegAcesso_novoCodigo_(d, u, cfg, preferir) {
  var codigo = SegAcesso_gerarCodigo_();
  var envio = SegAcesso_enviarCodigo_(u, codigo, cfg, preferir);
  if (!envio.ok) return envio;
  d.codigoHash = SegAcesso_sha256_(d.id + ':' + codigo);
  d.expiraMs = Date.now() + SEGA_CODIGO_VALIDADE_MS;
  d.ultimoEnvioMs = Date.now();
  d.canal = envio.canal;
  d.destino = envio.destino;
  d.reserva = !!envio.reserva;
  d.motivoReserva = envio.motivoReserva || '';
  return { ok: true };
}

/**
 * Depois da senha certa (SGO_Auth.js, login). null = segue o login normal (cria a sessão);
 * senão a resposta da etapa do código (sem sessão) ou do problema no envio.
 */
function SegAcesso_aposSenhaCerta_(u, ctx) {
  SegAcesso_garantirEstrutura_();
  var cfg = SegAcesso_config_();
  if (!SegAcesso_exigeCodigo_(u, cfg)) return null;
  ctx = SegAcesso_ctx_(ctx);
  if (ctx.aparelho && SegAcesso_aparelhoValido_(ctx.aparelho, u)) {
    SegAcesso_registrar_('CODIGO_DISPENSADO', u, ctx, 'Aparelho confiado (cookie de 30 dias válido).');
    return null;
  }
  if (SegAcesso_dispensado_(u)) {
    SegAcesso_registrar_('CODIGO_DISPENSADO', u, ctx, 'Liberação temporária dada pelo Administrador (segundo fator zerado).');
    return null;
  }
  var d = { id: 'DSF_' + SegAcesso_hex_(16), userId: u.ID, criadoMs: Date.now(), tentativas: 0, reenvios: 0, ip: ctx.ip };
  var envio = SegAcesso_novoCodigo_(d, u, cfg, '');
  if (!envio.ok) {
    SegAcesso_registrar_('CODIGO_FALHA_ENVIO', u, ctx, envio.motivo || envio.message);
    return { success: true, etapa: 'SEM_ENVIO', message: envio.message };
  }
  SegAcesso_guardarDesafio_(d);
  SegAcesso_registrar_('CODIGO_ENVIADO', u, ctx, 'Para ' + d.destino + (d.reserva ? ' (reserva por e-mail: ' + d.motivoReserva + ')' : '') + '.');
  return SegAcesso_respostaCodigo_(d, u);
}

// ------------------------------------------------------------
// ENVIO DO CÓDIGO
// ------------------------------------------------------------
function SegAcesso_credMeta_() {
  if (typeof Notificar_credenciaisMeta_ === 'function') return Notificar_credenciaisMeta_();
  var p = SegAcesso_props_();
  return { token: SegAcesso_txt_(p.getProperty('META_WA_TOKEN')), phoneId: SegAcesso_txt_(p.getProperty('META_WA_PHONE_ID')).replace(/\D/g, ''), wabaId: SegAcesso_txt_(p.getProperty('META_WA_WABA_ID')).replace(/\D/g, '') };
}
function SegAcesso_versaoMeta_() { return typeof NTF_META_VERSAO !== 'undefined' && NTF_META_VERSAO ? NTF_META_VERSAO : 'v21.0'; }
function SegAcesso_limparSegredos_(t, segredos) {
  var s = String(t || '');
  (segredos || []).forEach(function (x) { if (x && String(x).length > 4) s = s.split(String(x)).join('••••'); });
  return s;
}

/** Corpo do envio do modelo de autenticação (código no corpo e no botão "Copiar código"). */
function SegAcesso_corpoEnvioMeta_(telefone, codigo) {
  return {
    messaging_product: 'whatsapp', recipient_type: 'individual', to: telefone, type: 'template',
    template: {
      name: SEGA_MODELO_META.nome, language: { code: SEGA_MODELO_META.idioma },
      components: [
        { type: 'body', parameters: [{ type: 'text', text: codigo }] },
        { type: 'button', sub_type: 'url', index: '0', parameters: [{ type: 'text', text: codigo }] }
      ]
    }
  };
}

function SegAcesso_enviarWhatsapp_(telefone, codigo) {
  var cred = SegAcesso_credMeta_();
  if (!cred.token || !cred.phoneId) return { ok: false, motivo: 'WhatsApp oficial (Meta) sem token ou número configurado em Chaves e senhas' };
  var sit = SegAcesso_lerJson_(SEGA_MODELO_PROP);
  if (sit && sit.status && sit.status !== 'APPROVED') return { ok: false, motivo: 'modelo ' + SEGA_MODELO_META.nome + ' ainda não aprovado pela Meta (' + sit.status + ')' };
  var r;
  try {
    r = UrlFetchApp.fetch('https://graph.facebook.com/' + SegAcesso_versaoMeta_() + '/' + cred.phoneId + '/messages', {
      method: 'post', contentType: 'application/json', muteHttpExceptions: true,
      headers: { Authorization: 'Bearer ' + cred.token }, payload: JSON.stringify(SegAcesso_corpoEnvioMeta_(telefone, codigo))
    });
  } catch (e) { return { ok: false, motivo: 'sem resposta da Meta (' + SegAcesso_limparSegredos_(e && e.message, [cred.token]).slice(0, 160) + ')' }; }
  var http = r.getResponseCode(), j = null;
  try { j = JSON.parse(String(r.getContentText() || '')); } catch (e) {}
  if (http >= 200 && http < 300 && j && !j.error && j.messages && j.messages[0] && j.messages[0].id) return { ok: true };
  var er = (j && j.error) || {};
  return { ok: false, motivo: 'Meta recusou (HTTP ' + http + (er.code !== undefined ? ', código ' + er.code : '') + '): ' + SegAcesso_limparSegredos_(er.message || '', [cred.token]).slice(0, 200) };
}

function SegAcesso_enviarEmail_(email, codigo, u) {
  var nome = SegAcesso_primeiroNome_(u.NOME);
  var quando = Utilities.formatDate(new Date(), SEGA_FUSO, "dd/MM/yyyy 'às' HH:mm");
  var texto = (nome ? 'Olá, ' + nome + '.' : 'Olá.') + '\n\n' +
    'Seu código de acesso ao SGO+ é ' + codigo + '.\n\n' +
    'Ele vale por 10 minutos e só pode ser usado uma vez. Não compartilhe este código com ninguém: a Metrolabs nunca pede o código por telefone, e-mail ou mensagem.\n\n' +
    'Se não foi você que tentou entrar, não use o código, troque a sua senha e avise o administrador do SGO+.\n\n' +
    'Pedido feito em ' + quando + ' (horário de Brasília).\nMetrolabs · SGO+';
  var html = '<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#1f2937;max-width:520px">' +
    '<p>' + (nome ? 'Olá, ' + nome + '.' : 'Olá.') + '</p><p>Seu código de acesso ao SGO+ é:</p>' +
    '<p style="font-size:30px;font-weight:700;letter-spacing:6px;margin:12px 0;font-family:Consolas,monospace">' + codigo + '</p>' +
    '<p>Ele vale por <b>10 minutos</b> e só pode ser usado uma vez. Não compartilhe este código com ninguém: a Metrolabs nunca pede o código por telefone, e-mail ou mensagem.</p>' +
    '<p>Se não foi você que tentou entrar, não use o código, troque a sua senha e avise o administrador do SGO+.</p>' +
    '<p style="color:#6b7280;font-size:13px">Pedido feito em ' + quando + ' (horário de Brasília).<br>Metrolabs · SGO+</p></div>';
  try {
    MailApp.sendEmail({ to: email, subject: 'Seu código de acesso ao SGO+', body: texto, htmlBody: html, name: 'SGO+ Metrolabs' });
    return { ok: true };
  } catch (e) {
    return { ok: false, motivo: 'e-mail não saiu (' + String((e && e.message) || e).slice(0, 160) + ')' };
  }
}

/** Envia pelo canal da configuração, com o e-mail de reserva. { ok, canal, destino, reserva, motivoReserva } ou { ok:false, message, motivo }. */
function SegAcesso_enviarCodigo_(u, codigo, cfg, preferir) {
  var motivos = [];
  if (cfg.modo === 'WHATSAPP' && preferir !== 'EMAIL') {
    var tel = SegAcesso_celular_(u);
    if (tel) {
      var w = SegAcesso_enviarWhatsapp_(tel, codigo);
      if (w.ok) return { ok: true, canal: 'WHATSAPP', destino: 'WhatsApp terminado em ' + tel.slice(-2) };
      motivos.push(w.motivo);
    } else motivos.push('sem celular válido no cadastro');
  }
  var email = SegAcesso_email_(u);
  if (email) {
    var m = SegAcesso_enviarEmail_(email, codigo, u);
    if (m.ok) return { ok: true, canal: 'EMAIL', destino: 'e-mail ' + SegAcesso_mascararEmail_(email), reserva: motivos.length > 0 && preferir !== 'EMAIL', motivoReserva: motivos.join('; ') };
    motivos.push(m.motivo);
  } else motivos.push('sem e-mail válido no cadastro');
  return {
    ok: false, motivo: motivos.join('; '),
    message: 'Não foi possível enviar o código de acesso. Por quê: ' + motivos.join('; ') + '. O que fazer: peça ao administrador do SGO+ para conferir o seu celular e o seu e-mail em Administração > Usuários e tente entrar de novo.'
  };
}

// ------------------------------------------------------------
// FUNÇÕES DO NAVEGADOR (login)
// ------------------------------------------------------------
var SEGA_MSG_DESAFIO_VENCIDO = 'Este código não vale mais. Por quê: cada login tem até 30 minutos para receber e digitar o código, e ele só pode ser usado uma vez. O que fazer: toque em "Voltar" e entre de novo com o e-mail e a senha.';

/** Confere o código. Certo = cria a sessão (e o aparelho confiado, se pedido). ctx vem do servidor. */
function verificarCodigoAcesso(desafioId, codigo, confiar, ctx) {
  try {
    var c = SegAcesso_ctx_(ctx);
    return JSON.parse(JSON.stringify(SegAcesso_travar_(function () {
      var d = SegAcesso_lerDesafio_(SegAcesso_txt_(desafioId));
      if (!d) return { success: false, etapa: 'LOGIN', message: SEGA_MSG_DESAFIO_VENCIDO };
      var u = SegAcesso_usuarioPorId_(d.userId);
      var digitado = String(codigo === null || codigo === undefined ? '' : codigo).replace(/\D/g, '');
      if (!/^\d{6}$/.test(digitado)) return { success: false, etapa: 'CODIGO', message: 'Digite os 6 números do código que chegou para você.', tentativasRestantes: SEGA_MAX_TENTATIVAS - d.tentativas };
      if (Date.now() > Number(d.expiraMs)) {
        SegAcesso_registrar_('CODIGO_VENCIDO', u || { ID: d.userId }, c, 'Código digitado depois de 10 minutos.');
        var podeReenviar = (Number(d.reenvios) || 0) < SEGA_MAX_REENVIOS;
        if (!podeReenviar) { SegAcesso_apagarDesafio_(d.id); return { success: false, etapa: 'LOGIN', message: 'O código venceu (ele vale 10 minutos) e este login já usou os 3 reenvios. O que fazer: toque em "Voltar" e entre de novo com o e-mail e a senha.' }; }
        return { success: false, etapa: 'CODIGO', message: 'O código venceu: ele vale 10 minutos. O que fazer: toque em "Reenviar código" para receber outro.', vencido: true, reenviarEmS: 0 };
      }
      if (!textosIguaisAuth_(SegAcesso_sha256_(d.id + ':' + digitado), d.codigoHash)) {
        d.tentativas = (Number(d.tentativas) || 0) + 1;
        var restam = SEGA_MAX_TENTATIVAS - d.tentativas;
        if (restam <= 0) {
          SegAcesso_apagarDesafio_(d.id);
          SegAcesso_registrar_('CODIGO_BLOQUEADO', u || { ID: d.userId }, c, '5 códigos errados: login cancelado.');
          return { success: false, etapa: 'LOGIN', message: 'Código errado 5 vezes. Por segurança, este login foi cancelado. O que fazer: toque em "Voltar" e entre de novo com o e-mail e a senha para receber um código novo. Se não foi você, troque a sua senha.' };
        }
        SegAcesso_guardarDesafio_(d);
        SegAcesso_registrar_('CODIGO_ERRADO', u || { ID: d.userId }, c, 'Restam ' + restam + ' tentativa(s).');
        return { success: false, etapa: 'CODIGO', message: 'Código errado. Confira os 6 números da mensagem mais recente e digite de novo. Restam ' + restam + ' tentativa' + (restam > 1 ? 's' : '') + '.', tentativasRestantes: restam };
      }
      // código certo: uso único
      SegAcesso_apagarDesafio_(d.id);
      if (!u || u.STATUS !== SGO_CFG.STATUS.ATIVO) return { success: false, etapa: 'LOGIN', message: 'Usuário inativo ou bloqueado. Contate o administrador.' };
      if (u.PERFIL === 'REPRESENTADA' && typeof motivoRepresentadaAuth_ === 'function') {
        var motivoRep = motivoRepresentadaAuth_(u.REPRESENTADA_ID);
        if (motivoRep) return { success: false, etapa: 'LOGIN', message: motivoRep };
      }
      SegAcesso_registrar_('CODIGO_OK', u, c, 'Código conferido.');
      var aparelho = null;
      if (confiar === true) {
        try { aparelho = SegAcesso_criarAparelho_(u, c); SegAcesso_registrar_('APARELHO_CONFIADO', u, c, 'Este aparelho entra sem código por 30 dias (ou até a próxima troca de senha).'); } catch (eAp) { aparelho = null; }
      }
      var resp = criarSessaoLoginAuth_(u, c, { via: 'codigo', aparelhoHash: aparelho ? aparelho.hash : '' });
      if (aparelho && resp.success) resp.aparelhoToken = aparelho.token;
      return resp;
    })));
  } catch (e) {
    return { success: false, etapa: 'CODIGO', message: 'Não foi possível conferir o código agora. Tente de novo em alguns segundos; se continuar, volte e entre de novo com o e-mail e a senha.' };
  }
}

/** Reenvia o código (60 s de espera, até 3 por login). opcoes.canal = "EMAIL" manda pelo e-mail. */
function reenviarCodigoAcesso(desafioId, opcoes, ctx) {
  try {
    var c = SegAcesso_ctx_(ctx);
    opcoes = opcoes || {};
    return JSON.parse(JSON.stringify(SegAcesso_travar_(function () {
      var d = SegAcesso_lerDesafio_(SegAcesso_txt_(desafioId));
      if (!d) return { success: false, etapa: 'LOGIN', message: SEGA_MSG_DESAFIO_VENCIDO };
      var espera = Math.ceil((Number(d.ultimoEnvioMs) + SEGA_REENVIO_ESPERA_MS - Date.now()) / 1000);
      if (espera > 0) return { success: false, etapa: 'CODIGO', message: 'Aguarde ' + espera + ' segundo' + (espera > 1 ? 's' : '') + ' para pedir outro código.', reenviarEmS: espera };
      if ((Number(d.reenvios) || 0) >= SEGA_MAX_REENVIOS) return { success: false, etapa: 'CODIGO', message: 'Você já pediu 3 códigos novos neste login. O que fazer: use o último código que chegou ou toque em "Voltar" e entre de novo com o e-mail e a senha.', reenviosRestantes: 0 };
      var u = SegAcesso_usuarioPorId_(d.userId);
      if (!u || u.STATUS !== SGO_CFG.STATUS.ATIVO) { SegAcesso_apagarDesafio_(d.id); return { success: false, etapa: 'LOGIN', message: 'Usuário inativo ou bloqueado. Contate o administrador.' }; }
      var preferir = SegAcesso_txt_(opcoes.canal).toUpperCase() === 'EMAIL' ? 'EMAIL' : '';
      var envio = SegAcesso_novoCodigo_(d, u, SegAcesso_config_(), preferir);
      d.reenvios = (Number(d.reenvios) || 0) + 1;
      if (!envio.ok) {
        d.ultimoEnvioMs = Date.now();
        SegAcesso_guardarDesafio_(d);
        SegAcesso_registrar_('CODIGO_FALHA_ENVIO', u, c, envio.motivo || envio.message);
        return { success: false, etapa: 'CODIGO', message: envio.message, reenviarEmS: Math.round(SEGA_REENVIO_ESPERA_MS / 1000), reenviosRestantes: Math.max(0, SEGA_MAX_REENVIOS - d.reenvios) };
      }
      SegAcesso_guardarDesafio_(d);
      SegAcesso_registrar_('CODIGO_REENVIADO', u, c, 'Para ' + d.destino + '. Reenvio ' + d.reenvios + ' de ' + SEGA_MAX_REENVIOS + '.');
      return SegAcesso_respostaCodigo_(d, u, { message: 'Código novo enviado para ' + (d.canal === 'WHATSAPP' ? 'o ' : 'o seu ') + d.destino + '. Use só o código mais recente: o anterior não vale mais.' });
    })));
  } catch (e) {
    return { success: false, etapa: 'CODIGO', message: 'Não foi possível reenviar agora. Aguarde alguns segundos e toque de novo em "Reenviar código".' };
  }
}

// ------------------------------------------------------------
// TROCA DE SENHA
// ------------------------------------------------------------
var SEGA_SENHAS_OBVIAS = ['123456', '1234567', '12345678', '123456789', '1234567890', '12345678a', 'a12345678', 'a1234567', '1234567a', 'abc12345', 'abc123456',
  'abcd1234', 'senha123', 'senha1234', 'senha12345', 'mudar123', 'trocar123', 'password1', 'passw0rd', 'qwerty123', 'qwe12345', '1q2w3e4r', 'q1w2e3r4', '1q2w3e4r5t',
  'admin123', 'admin1234', 'sgo12345', 'sgo123456', 'teste123', 'teste1234', 'brasil123', 'iloveyou1', 'mudar1234', 'senha2025', 'senha2026', 'metrolabs1'];
var SEGA_PALAVRAS_OBVIAS = ['senha', 'password', 'pass', 'mudar', 'trocar', 'teste', 'admin', 'qwerty', 'qwe', 'abc', 'abcd', 'abcde', 'asdf', 'qwer', 'sgo', 'usuario', 'brasil', 'metrolabs', 'a', 'aa', 'aaa'];

function SegAcesso_semAcento_(t) {
  return String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/** Números em sequência (1234, 4321, 0123), repetidos (1111) ou ano (19xx/20xx). */
function SegAcesso_numerosObvios_(d) {
  if (!d) return true;
  if (/^(\d)\1+$/.test(d)) return true;
  if (/^(19|20)\d\d$/.test(d)) return true;
  var sobe = true, desce = true;
  for (var i = 1; i < d.length; i++) {
    var a = Number(d.charAt(i - 1)), b = Number(d.charAt(i));
    if ((a + 1) % 10 !== b) sobe = false;
    if ((b + 1) % 10 !== a) desce = false;
  }
  return sobe || desce;
}

function SegAcesso_senhaObvia_(nova, u) {
  var s = SegAcesso_semAcento_(nova);
  if (SEGA_SENHAS_OBVIAS.indexOf(s) >= 0) return true;
  if (/^(.)\1+$/.test(s) || s.indexOf('metrolabs') >= 0) return true;
  var login = SegAcesso_semAcento_(u && u.USUARIO).replace(/[^a-z0-9]/g, '');
  if (login.length >= 3 && s.replace(/[^a-z0-9]/g, '').indexOf(login) >= 0) return true;
  // 31/10/2026: a entrada é pelo e-mail: a parte antes do @ também conta como óbvia
  var caixa = SegAcesso_semAcento_(String((u && u.EMAIL) || '').split('@')[0]).replace(/[^a-z0-9]/g, '');
  if (caixa.length >= 4 && s.replace(/[^a-z0-9]/g, '').indexOf(caixa) >= 0) return true;
  var partes = SegAcesso_semAcento_(u && u.NOME).split(/[^a-z]+/).filter(function (p) { return p.length >= 4; });
  if (partes.some(function (p) { return s.indexOf(p) >= 0; })) return true;
  var letras = s.replace(/[^a-z]/g, ''), numeros = s.replace(/[^0-9]/g, '');
  if (/^[a-z]+\d+$|^\d+[a-z]+$/.test(s) && SEGA_PALAVRAS_OBVIAS.indexOf(letras) >= 0 && SegAcesso_numerosObvios_(numeros)) return true;
  return false;
}

/** Erros da senha nova (lista vazia = aceita). */
function SegAcesso_validarNovaSenha_(nova, confirmacao, u) {
  var e = [];
  nova = nova === null || nova === undefined ? '' : String(nova);
  confirmacao = confirmacao === null || confirmacao === undefined ? '' : String(confirmacao);
  if (!nova) return ['Digite a senha nova.'];
  if (nova !== nova.trim()) e.push('A senha não pode começar nem terminar com espaço.');
  if (nova.length < 8) e.push('A senha precisa ter pelo menos 8 caracteres (a digitada tem ' + nova.length + ').');
  if (nova.length > 128) e.push('A senha pode ter no máximo 128 caracteres.');
  if (!/[A-Za-zÀ-ÿ]/.test(nova) || !/\d/.test(nova)) e.push('Use letras e números juntos (por exemplo, duas palavras e alguns números).');
  if (confirmacao !== nova) e.push('A confirmação não é igual à senha nova: digite a mesma senha nos dois campos.');
  if (u && u.SENHA && verificarSenhaAuth_(nova, u.SENHA)) e.push('A senha nova precisa ser diferente da atual.');
  else if (nova.length >= 8 && SegAcesso_senhaObvia_(nova, u)) e.push('Esta senha é fácil de adivinhar (sequência, repetição, o seu nome, o seu e-mail ou o nome da empresa). Escolha outra.');
  return e;
}

/**
 * Troca a senha. Sessão pendente (troca obrigatória no login): basta a senha nova; a sessão marcada depois do login
 * e a troca voluntária pedem também a senha atual. dados = { senhaAtual, nova, confirmacao }. ctx vem do servidor.
 */
function trocarSenhaAcesso(sessionId, dados, ctx) {
  try {
    var c = SegAcesso_ctx_(ctx);
    dados = dados || {};
    var sid = SegAcesso_txt_(sessionId);
    return JSON.parse(JSON.stringify(SegAcesso_travar_(function () {
      var sess = sid ? lerSessaoAuth_(sid) : null;
      if (!sess || sessaoExpiradaAuth_(sess)) return { success: false, etapa: 'LOGIN', message: 'Sua sessão terminou antes da troca. O que fazer: entre de novo com o e-mail e a senha atual; a tela "Crie sua nova senha" aparece em seguida.' };
      var pendente = sess.pendente === 'TROCA_SENHA';
      SegAcesso_garantirEstrutura_();
      var u = SegAcesso_usuarioPorId_(sess.userId);
      if (!u || u.STATUS !== SGO_CFG.STATUS.ATIVO) { removerSessaoAuth_(sid); return { success: false, etapa: 'LOGIN', message: 'Usuário inativo ou removido. Fale com o administrador do SGO+.' }; }
      if (!pendente || sess.pedirAtual) {
        if (!verificarSenhaAuth_(dados.senhaAtual, u.SENHA)) {
          sess.errosSenhaAtual = (Number(sess.errosSenhaAtual) || 0) + 1;
          SegAcesso_registrar_('SENHA_TROCA_FALHA', u, c, 'Senha atual errada (' + sess.errosSenhaAtual + ' de ' + SEGA_MAX_ERROS_SENHA_ATUAL + ').');
          if (sess.errosSenhaAtual >= SEGA_MAX_ERROS_SENHA_ATUAL) {
            removerSessaoAuth_(sid);
            return { success: false, etapa: 'LOGIN', message: 'A senha atual não conferiu 5 vezes. Por segurança, a sessão foi encerrada. O que fazer: entre de novo com o e-mail e a senha; se esqueceu a senha, use \"Esqueci minha senha\" na tela de entrada.' };
          }
          salvarSessaoAuth_(sess);
          return { success: false, message: 'A senha atual não confere. Digite a senha que você usa hoje para entrar. Restam ' + (SEGA_MAX_ERROS_SENHA_ATUAL - sess.errosSenhaAtual) + ' tentativa(s).', campo: 'atual' };
        }
      }
      var erros = SegAcesso_validarNovaSenha_(dados.nova, dados.confirmacao, u);
      if (erros.length) {
        SegAcesso_registrar_('SENHA_TROCA_FALHA', u, c, 'Senha nova fora das regras.');
        return { success: false, message: erros.join(' '), erros: erros };
      }
      var novaVersao = SegAcesso_versao_(u) + 1;
      var ok = SGO_DATA.update(SGO_CFG.SHEETS.CAD_USUARIOS, u.ID, {
        SENHA: gerarHashSenhaAuth_(String(dados.nova)), PRECISA_TROCAR_SENHA: '', SEGURANCA_VERSAO: String(novaVersao), SENHA_TROCADA_EM: SegAcesso_agora_()
      });
      if (!ok) return { success: false, message: 'Não foi possível gravar a senha nova agora. Nada foi alterado: tente de novo em alguns segundos.' };
      // a sessão deste aparelho segue, já com a versão nova; as outras sessões e os outros aparelhos confiados caem
      var manteveAparelho = false;
      if (sess.aparelhoHash) { try { manteveAparelho = SegAcesso_reestamparAparelho_(sess.aparelhoHash, u, novaVersao); } catch (eAp) { manteveAparelho = false; } }
      delete sess.pendente; delete sess.pedirAtual; delete sess.errosSenhaAtual;
      sess.segVersao = novaVersao;
      sess.conferidoEm = new Date().toISOString();
      salvarSessaoAuth_(sess);
      // 31/10/2026: as outras sessões caem na hora (antes, em até 5 minutos pela versão) e o e-mail avisa a pessoa
      var derrubadas = SegAcesso_derrubarSessoes_(u.ID, sid, manteveAparelho ? sess.aparelhoHash : '');
      SegAcesso_avisarSenhaAlterada_(u, c, pendente ? 'troca obrigatória no login' : 'troca feita pela própria pessoa (Trocar minha senha)');
      if (derrubadas.sessoes || derrubadas.aparelhos) SegAcesso_registrar_('SESSOES_DERRUBADAS', u, c, derrubadas.sessoes + ' sessão(ões) e ' + derrubadas.aparelhos + ' aparelho(s) confiado(s) desconectados na troca da senha.');
      registrarLogAuth_('SENHA_TROCADA', { usuario: u.USUARIO, perfil: u.PERFIL, detalhe: pendente ? 'Troca obrigatória concluída.' : 'Troca feita pela própria pessoa.' });
      SegAcesso_registrar_('SENHA_TROCADA', u, c, (pendente ? 'Troca obrigatória concluída.' : 'Troca feita pela própria pessoa.') + ' Outros aparelhos confiados e sessões foram desconectados.');
      var r = {
        success: true, sessionId: sid,
        message: 'Senha nova criada. A partir de agora, entre com ela. Por segurança, os outros aparelhos e sessões abertas com a senha antiga foram desconectados.',
        user: { id: u.ID, usuario: u.USUARIO, nome: u.NOME, perfil: u.PERFIL, clienteId: u.CLIENTE_ID, representadaId: u.REPRESENTADA_ID || '', representacaoPapel: u.REPRESENTACAO_PAPEL || '' }
      };
      if (!manteveAparelho) r.limparAparelho = true;
      return r;
    })));
  } catch (e) {
    return { success: false, message: 'Não foi possível trocar a senha agora. Nada foi alterado: tente de novo em alguns segundos.' };
  }
}

// ------------------------------------------------------------
// SESSÕES E APARELHOS DE UMA PESSOA (31/10/2026): derrubar na hora
// ------------------------------------------------------------
/**
 * Encerra as sessões da pessoa (menos `exceto`) e apaga os aparelhos confiados dela (menos o `aparelhoMantido`).
 * Antes a troca de senha derrubava as outras sessões em até 5 minutos (versão de segurança); agora é na hora.
 * Devolve { sessoes, aparelhos }. Nunca lança.
 */
function SegAcesso_derrubarSessoes_(userId, exceto, aparelhoMantido) {
  var r = { sessoes: 0, aparelhos: 0 };
  var alvo = SegAcesso_txt_(userId);
  if (!alvo) return r;
  try {
    var todas = SegAcesso_props_().getProperties() || {};
    Object.keys(todas).forEach(function (k) {
      if (k.indexOf('SGO_SESSION_') === 0) {
        var sid = k.slice('SGO_SESSION_'.length);
        if (exceto && sid === exceto) return;
        var d = null; try { d = JSON.parse(todas[k]); } catch (e) { d = null; }
        if (d && SegAcesso_txt_(d.userId) === alvo) { removerSessaoAuth_(sid); r.sessoes++; }
      } else if (k.indexOf('SEGA_APR_') === 0) {
        if (aparelhoMantido && k === SegAcesso_chaveAparelho_(aparelhoMantido)) return;
        var a = null; try { a = JSON.parse(todas[k]); } catch (e) { a = null; }
        if (a && SegAcesso_txt_(a.u) === alvo) { SegAcesso_props_().deleteProperty(k); r.aparelhos++; }
      }
    });
  } catch (e) {
    // sem a lista das propriedades, a versão de segurança derruba as sessões em até 5 minutos (como antes)
  }
  return r;
}

/** E-mail "sua senha foi alterada; se não foi você, avise a gestão". Sem e-mail no cadastro, não envia. Nunca lança. */
function SegAcesso_avisarSenhaAlterada_(u, ctx, como) {
  var email = SegAcesso_email_(u);
  if (!email) return false;
  try {
    var nome = SegAcesso_primeiroNome_(u.NOME), quando = Utilities.formatDate(new Date(), SEGA_FUSO, "dd/MM/yyyy 'às' HH:mm");
    var onde = SegAcesso_descreverAgente_(ctx && ctx.agente);
    var texto = (nome ? 'Olá, ' + nome + '.' : 'Olá.') + '\n\n' +
      'A senha da sua conta do SGO+ (' + email + ') foi alterada em ' + quando + ' (horário de Brasília)' + (onde ? ', em ' + onde : '') + '. Como: ' + como + '.\n\n' +
      'Se foi você, não precisa fazer nada. Por segurança, as sessões abertas com a senha antiga e os aparelhos confiados foram desconectados.\n\n' +
      'Se NÃO foi você, avise a gestão da Metrolabs agora: alguém pode estar usando o seu acesso.\n\nMetrolabs · SGO+';
    var html = '<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#1f2937;max-width:520px">' +
      '<p>' + (nome ? 'Olá, ' + SegAcesso_html_(nome) + '.' : 'Olá.') + '</p>' +
      '<p>A senha da sua conta do SGO+ (<b>' + SegAcesso_html_(email) + '</b>) foi alterada em <b>' + quando + '</b> (horário de Brasília)' + (onde ? ', em ' + SegAcesso_html_(onde) : '') + '. Como: ' + SegAcesso_html_(como) + '.</p>' +
      '<p>Se foi você, não precisa fazer nada. Por segurança, as sessões abertas com a senha antiga e os aparelhos confiados foram desconectados.</p>' +
      '<p style="padding:10px 12px;border:1px solid #f0c36d;background:#fff8e6;border-radius:4px"><b>Se não foi você</b>, avise a gestão da Metrolabs agora: alguém pode estar usando o seu acesso.</p>' +
      '<p style="color:#6b7280;font-size:13px">Metrolabs · SGO+</p></div>';
    MailApp.sendEmail({ to: email, subject: 'Sua senha do SGO+ foi alterada', body: texto, htmlBody: html, name: 'SGO+ Metrolabs' });
    return true;
  } catch (e) { return false; }
}

function SegAcesso_html_(v) { return String(v === null || v === undefined ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

// ------------------------------------------------------------
// ESQUECI MINHA SENHA E LINK DE REDEFINIÇÃO (31/10/2026)
// ------------------------------------------------------------
var SEGA_RED_VALIDADE_MS = 30 * 60 * 1000;
var SEGA_RED_MAX_POR_HORA = 3;
var SEGA_RED_MAX_ENVIOS_CODIGO = 4; // o primeiro e mais 3 reenvios
var SEGA_MSG_RED_PEDIDO = 'Se o e-mail estiver cadastrado, enviamos um link para criar uma senha nova. Ele vale por 30 minutos e só pode ser usado uma vez. ' +
  'O que fazer: abra o seu e-mail (veja também o lixo eletrônico) e toque no link "Criar minha senha nova". Se nada chegar em alguns minutos, confira o e-mail digitado ou peça ajuda à gestão da Metrolabs.';
var SEGA_MSG_RED_USADO = 'Este link não vale mais. Por quê: ele já foi usado ou foi trocado por um link mais novo (cada link só vale uma vez, e pedir outro cancela o anterior). ' +
  'O que fazer: use o link do e-mail mais recente ou, na tela de entrada, toque em "Esqueci minha senha" e peça outro.';
var SEGA_MSG_RED_VENCIDO = 'Este link venceu. Por quê: o link de nova senha vale por 30 minutos depois do pedido. O que fazer: na tela de entrada, toque em "Esqueci minha senha" e peça outro link; ele chega no mesmo e-mail.';

function SegAcesso_chaveRed_(hash) { return 'SEGA_RED_' + hash; }
function SegAcesso_chaveRedPessoa_(id, tipo) { return 'SEGA_REDU_' + (tipo === 'MP' ? 'MP_' : '') + id; }
function SegAcesso_chaveRedLimite_(email) { return 'SEGA_REDL_' + SegAcesso_sha256_('limite:' + email).slice(0, 40); }

/** Contas ATIVAS com este e-mail (sem a conta técnica), no formato da sessão e com a SENHA à parte. */
function SegAcesso_contasPorEmail_(email) {
  var alvo = emailLoginAuth_(email);
  if (!alvo) return [];
  var antes = typeof SGO_DATA_REP_VISIVEL === 'undefined' ? false : SGO_DATA_REP_VISIVEL;
  SGO_DATA_REP_VISIVEL = true;
  try {
    return SGO_DATA.getAll(SGO_CFG.SHEETS.CAD_USUARIOS).filter(function (r) {
      return SegAcesso_txt_(r.ID) && SegAcesso_txt_(r.STATUS).toUpperCase() === SGO_CFG.STATUS.ATIVO && !SegAcesso_foraDoFluxo_(r.PERFIL) && emailLoginAuth_(r.EMAIL) === alvo;
    }).map(function (r) { var u = usuarioParaSessaoAuth_(r); u.SENHA = r.SENHA; return u; });
  } finally { SGO_DATA_REP_VISIVEL = antes; }
}

/** true = o e-mail já fez 3 pedidos na última hora. Com `contar`, conta este pedido (se couber). */
function SegAcesso_limitePedidos_(email, contar) {
  var k = SegAcesso_chaveRedLimite_(email), agora = Date.now();
  var lista = (SegAcesso_lerJson_(k) || []).filter(function (t) { return agora - Number(t) < 3600000; });
  var cheio = lista.length >= SEGA_RED_MAX_POR_HORA;
  if (contar && !cheio) lista.push(agora);
  if (lista.length) SegAcesso_props_().setProperty(k, JSON.stringify(lista)); else SegAcesso_props_().deleteProperty(k);
  return cheio;
}

/** Endereço público do link: https://<domínio do sistema>/#redefinir=<token> ("" sem endereço configurado). O token vai depois do
 *  "#": não chega ao servidor nem aos registros de acesso e não vai como "Referer" para outros sites. */
function SegAcesso_urlLink_(token) {
  var base = '';
  try { base = String(ScriptApp.getService().getUrl() || ''); } catch (e) { base = ''; }
  base = base.replace(/[?#].*$/, '').replace(/^(https?:\/\/[^\/]+).*$/i, '$1');
  if (!/^https?:\/\/[^\/]+$/i.test(base)) return '';
  return base + '/#redefinir=' + token;
}

/** E-mail com o link. dados: { origem: 'PESSOA' | 'GESTAO', porNome, tipo }. */
function SegAcesso_emailLink_(email, url, u, ctx, dados, tipo) {
  var nome = SegAcesso_primeiroNome_(u.NOME), quando = Utilities.formatDate(new Date(), SEGA_FUSO, "dd/MM/yyyy 'às' HH:mm");
  var mp = tipo === 'MP', gestao = dados.origem === 'GESTAO';
  var oQue = mp ? 'liberar uma senha nova do modo personalizado' : 'criar uma senha nova para entrar no SGO+';
  var origem = gestao ? 'A gestão da Metrolabs' + (dados.porNome ? ' (' + dados.porNome + ')' : '') + ' enviou este link para você ' + oQue + '.' :
    'Recebemos um pedido para ' + oQue + ' na sua conta (' + email + ').';
  var botao = mp ? 'Liberar a senha nova do modo personalizado' : 'Criar minha senha nova';
  var texto = (nome ? 'Olá, ' + nome + '.' : 'Olá.') + '\n\n' + origem + '\n\n' +
    botao + ': ' + url + '\n\n' +
    'O link vale por 30 minutos e só pode ser usado uma vez.' + (mp ? '' : ' Se o seu acesso pede o código no celular, ele também vai ser pedido.') + '\n\n' +
    'Se não foi você que pediu, ignore este e-mail: a sua senha atual continua valendo. Se receber vários e-mails assim sem ter pedido, avise a gestão da Metrolabs.\n\n' +
    'Pedido feito em ' + quando + ' (horário de Brasília).\nMetrolabs · SGO+';
  var html = '<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#1f2937;max-width:520px">' +
    '<p>' + (nome ? 'Olá, ' + SegAcesso_html_(nome) + '.' : 'Olá.') + '</p><p>' + SegAcesso_html_(origem) + '</p>' +
    '<p style="margin:22px 0"><a href="' + SegAcesso_html_(url) + '" style="display:inline-block;background:#1f6b2a;color:#ffffff;text-decoration:none;font-weight:700;padding:13px 22px;border-radius:4px">' + botao + '</a></p>' +
    '<p>O link vale por <b>30 minutos</b> e só pode ser usado uma vez.' + (mp ? '' : ' Se o seu acesso pede o código no celular, ele também vai ser pedido.') + '</p>' +
    '<p>Se o botão não abrir, copie este endereço no navegador:<br><span style="font-family:Consolas,monospace;font-size:12.5px;word-break:break-all;color:#374151">' + SegAcesso_html_(url) + '</span></p>' +
    '<p>Se não foi você que pediu, ignore este e-mail: a sua senha atual continua valendo. Se receber vários e-mails assim sem ter pedido, avise a gestão da Metrolabs.</p>' +
    '<p style="color:#6b7280;font-size:13px">Pedido feito em ' + quando + ' (horário de Brasília).<br>Metrolabs · SGO+</p></div>';
  try {
    MailApp.sendEmail({ to: email, subject: mp ? 'Senha nova do modo personalizado do SGO+' : 'Criar sua senha nova do SGO+', body: texto, htmlBody: html, name: 'SGO+ Metrolabs' });
    return { ok: true };
  } catch (e) {
    return { ok: false, motivo: 'e-mail não saiu (' + String((e && e.message) || e).slice(0, 160) + ')', message: 'Não foi possível enviar o e-mail com o link agora. Tente de novo em alguns minutos.' };
  }
}

/**
 * Cria o link (um vivo por pessoa e tipo: o novo cancela o anterior) e manda o e-mail.
 * dados: { origem: 'PESSOA'|'GESTAO', por, porNome, motivo, tipo: 'SENHA'|'MP' }. Devolve { ok, destino } ou { ok:false, message }.
 */
function SegAcesso_criarLinkRedefinicao_(u, ctx, dados) {
  dados = dados || {};
  var tipo = dados.tipo === 'MP' ? 'MP' : 'SENHA';
  var email = SegAcesso_email_(u);
  if (!email) return { ok: false, motivo: 'sem e-mail válido no cadastro', message: 'Esta conta não tem e-mail válido cadastrado. O que fazer: cadastre o e-mail em Administração > Usuários (ou use a senha provisória, para quem não tem e-mail).' };
  var token = SegAcesso_hex_(32), hash = SegAcesso_sha256_(token);
  var url = SegAcesso_urlLink_(token);
  if (!url) return { ok: false, motivo: 'endereço público do sistema não configurado', message: 'Não foi possível montar o link: o endereço público do SGO+ não está configurado neste servidor. Avise o administrador do SGO+.' };
  var props = SegAcesso_props_(), chaveP = SegAcesso_chaveRedPessoa_(u.ID, tipo);
  var anterior = SegAcesso_txt_(props.getProperty(chaveP));
  if (anterior) props.deleteProperty(SegAcesso_chaveRed_(anterior));
  props.setProperty(SegAcesso_chaveRed_(hash), JSON.stringify({
    id: 'RED_' + hash.slice(0, 32), u: SegAcesso_txt_(u.ID), v: SegAcesso_versao_(u), tipo: tipo, exp: Date.now() + SEGA_RED_VALIDADE_MS, em: SegAcesso_agora_(),
    origem: dados.origem === 'GESTAO' ? 'GESTAO' : 'PESSOA', por: SegAcesso_txt_(dados.por).slice(0, 120), ip: SegAcesso_txt_(ctx && ctx.ip), tentativas: 0, envios: 0
  }));
  props.setProperty(chaveP, hash);
  var envio = SegAcesso_emailLink_(email, url, u, ctx, dados, tipo);
  if (!envio.ok) { props.deleteProperty(SegAcesso_chaveRed_(hash)); props.deleteProperty(chaveP); return envio; }
  return { ok: true, destino: SegAcesso_mascararEmail_(email) };
}

/** Lê o link pelo token: { rec, u, hash } válido; { invalido, vencido, rec?, u? } se não vale. Apaga o que não vale mais. */
function SegAcesso_lerRed_(token) {
  token = SegAcesso_txt_(token).toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(token)) return { invalido: true };
  var hash = SegAcesso_sha256_(token), rec = SegAcesso_lerJson_(SegAcesso_chaveRed_(hash));
  if (!rec) return { invalido: true };
  var u = SegAcesso_usuarioPorId_(rec.u);
  var apagar = function () { try { SegAcesso_props_().deleteProperty(SegAcesso_chaveRed_(hash)); if (SegAcesso_props_().getProperty(SegAcesso_chaveRedPessoa_(rec.u, rec.tipo)) === hash) SegAcesso_props_().deleteProperty(SegAcesso_chaveRedPessoa_(rec.u, rec.tipo)); } catch (e) {} };
  if (!(Number(rec.exp) > Date.now())) { apagar(); return { invalido: true, vencido: true, rec: rec, u: u }; }
  var trocado = SegAcesso_props_().getProperty(SegAcesso_chaveRedPessoa_(rec.u, rec.tipo)) !== hash;
  var semConta = !u || u.STATUS !== SGO_CFG.STATUS.ATIVO;
  var senhaMudou = rec.tipo !== 'MP' && u && Number(rec.v) !== SegAcesso_versao_(u);
  if (trocado || semConta || senhaMudou) { apagar(); return { invalido: true, rec: rec, u: u, semConta: semConta }; }
  return { rec: rec, u: u, hash: hash };
}
function SegAcesso_gravarRed_(hash, rec) { SegAcesso_props_().setProperty(SegAcesso_chaveRed_(hash), JSON.stringify(rec)); }
function SegAcesso_apagarRed_(hash, rec) {
  try { SegAcesso_props_().deleteProperty(SegAcesso_chaveRed_(hash)); } catch (e) {}
  try { if (SegAcesso_props_().getProperty(SegAcesso_chaveRedPessoa_(rec.u, rec.tipo)) === hash) SegAcesso_props_().deleteProperty(SegAcesso_chaveRedPessoa_(rec.u, rec.tipo)); } catch (e) {}
}
function SegAcesso_respostaRedInvalida_(r, c) {
  SegAcesso_registrar_('REDEFINICAO_LINK_INVALIDO', (r && r.u) || { USUARIO: '' }, c, r && r.vencido ? 'Link aberto depois de 30 minutos.' : r && r.semConta ? 'Conta inativa ou removida.' : 'Link já usado, trocado por outro ou inexistente.');
  return { success: false, etapa: 'INVALIDO', vencido: !!(r && r.vencido),
    message: r && r.semConta ? 'Este link não vale: a conta está inativa ou não existe mais. O que fazer: fale com a gestão da Metrolabs.' : r && r.vencido ? SEGA_MSG_RED_VENCIDO : SEGA_MSG_RED_USADO };
}

/** O link de senha pede também o código: código ligado para o perfil no modo WhatsApp e celular válido no cadastro. */
function SegAcesso_precisaCodigoRed_(u) {
  var cfg = SegAcesso_config_();
  return cfg.modo === 'WHATSAPP' && SegAcesso_exigeCodigo_(u, cfg) && !!SegAcesso_celular_(u);
}

function SegAcesso_estadoRed_(r) {
  var u = r.u, rec = r.rec;
  var resp = { success: true, tipo: rec.tipo, nome: SegAcesso_primeiroNome_(u.NOME), email: SegAcesso_mascararEmail_(SegAcesso_email_(u)),
    validoAte: Utilities.formatDate(new Date(Number(rec.exp)), SEGA_FUSO, 'HH:mm'), daGestao: rec.origem === 'GESTAO' };
  if (rec.tipo === 'MP') { resp.etapa = 'MP'; return resp; }
  if (SegAcesso_precisaCodigoRed_(u) && !rec.codigoOk) {
    var tel = SegAcesso_celular_(u);
    resp.etapa = 'CODIGO';
    resp.codigoEnviado = !!rec.codigoHash;
    resp.destino = rec.destino || ('WhatsApp terminado em ' + tel.slice(-2));
    resp.reenviarEmS = rec.ultimoEnvioMs ? Math.max(0, Math.ceil((Number(rec.ultimoEnvioMs) + SEGA_REENVIO_ESPERA_MS - Date.now()) / 1000)) : 0;
    resp.enviosRestantes = Math.max(0, SEGA_RED_MAX_ENVIOS_CODIGO - (Number(rec.envios) || 0));
    resp.tentativasRestantes = Math.max(0, SEGA_MAX_TENTATIVAS - (Number(rec.tentativas) || 0));
    resp.podeEmail = !!SegAcesso_email_(u) && rec.canal !== 'EMAIL';
    return resp;
  }
  resp.etapa = 'NOVA_SENHA';
  return resp;
}

/**
 * "Esqueci minha senha" (tela de entrada, sem sessão). A resposta é SEMPRE a mesma, com ou sem conta, com o limite
 * estourado ou não (não revela quem tem conta). Só um e-mail com formato errado recebe outra mensagem. ctx vem do servidor.
 */
function pedirRedefinicaoSenha(email, ctx) {
  var e = emailLoginAuth_(email);
  if (!e) return { success: false, message: 'Digite o e-mail cadastrado no SGO+.' };
  if (!emailValidoAuth_(e)) return { success: false, message: 'Confira o e-mail digitado: ele precisa ter o formato nome@empresa.com.br.' };
  try {
    var c = SegAcesso_ctx_(ctx);
    SegAcesso_garantirEstrutura_();
    SegAcesso_travar_(function () {
      if (SegAcesso_limitePedidos_(e, true)) { SegAcesso_registrar_('REDEFINICAO_IGNORADA', { USUARIO: e }, c, 'Limite de ' + SEGA_RED_MAX_POR_HORA + ' pedidos por hora para este e-mail: nada enviado.'); return; }
      var contas = SegAcesso_contasPorEmail_(e);
      if (!contas.length) { SegAcesso_registrar_('REDEFINICAO_IGNORADA', { USUARIO: e }, c, 'E-mail sem conta ativa no SGO+: nada enviado.'); return; }
      if (contas.length > 1) { contas.forEach(function (u) { SegAcesso_registrar_('REDEFINICAO_IGNORADA', u, c, 'E-mail repetido em ' + contas.length + ' contas ativas: nada enviado (a gestão precisa deixar o e-mail em uma conta só).'); }); return; }
      var u = contas[0];
      SegAcesso_registrar_('REDEFINICAO_PEDIDA', u, c, 'Pedido na tela de entrada ("Esqueci minha senha").');
      var r = SegAcesso_criarLinkRedefinicao_(u, c, { origem: 'PESSOA' });
      SegAcesso_registrar_(r.ok ? 'REDEFINICAO_LINK_ENVIADO' : 'REDEFINICAO_IGNORADA', u, c, r.ok ? 'Link para ' + r.destino + ' (vale 30 minutos, uma vez).' : 'Link não enviado: ' + (r.motivo || r.message));
    });
  } catch (err) {
    // a resposta não muda nem com erro interno
  }
  return { success: true, message: SEGA_MSG_RED_PEDIDO };
}

/** Abre o link (não gasta o link nem envia nada): diz se vale e qual a próxima etapa (CODIGO, NOVA_SENHA ou MP). */
function abrirRedefinicaoSenha(token, ctx) {
  try {
    var c = SegAcesso_ctx_(ctx);
    return JSON.parse(JSON.stringify(SegAcesso_travar_(function () {
      var r = SegAcesso_lerRed_(token);
      if (r.invalido) return SegAcesso_respostaRedInvalida_(r, c);
      return SegAcesso_estadoRed_(r);
    })));
  } catch (e) {
    return { success: false, etapa: 'ERRO', message: 'Não foi possível abrir o link agora. Tente de novo em alguns segundos; se continuar, peça outro link em "Esqueci minha senha".' };
  }
}

/** Envia (ou reenvia) o código do link pelo WhatsApp, com o e-mail de reserva. opcoes.canal = "EMAIL" manda pelo e-mail. */
function codigoRedefinicaoSenha(token, opcoes, ctx) {
  try {
    var c = SegAcesso_ctx_(ctx);
    opcoes = opcoes || {};
    return JSON.parse(JSON.stringify(SegAcesso_travar_(function () {
      var r = SegAcesso_lerRed_(token);
      if (r.invalido) return SegAcesso_respostaRedInvalida_(r, c);
      var rec = r.rec, u = r.u;
      if (rec.tipo === 'MP' || !SegAcesso_precisaCodigoRed_(u) || rec.codigoOk) return SegAcesso_estadoRed_(r);
      var espera = rec.ultimoEnvioMs ? Math.ceil((Number(rec.ultimoEnvioMs) + SEGA_REENVIO_ESPERA_MS - Date.now()) / 1000) : 0;
      if (espera > 0) return Object.assign(SegAcesso_estadoRed_(r), { success: false, message: 'Aguarde ' + espera + ' segundo' + (espera > 1 ? 's' : '') + ' para pedir outro código.' });
      if ((Number(rec.envios) || 0) >= SEGA_RED_MAX_ENVIOS_CODIGO) return Object.assign(SegAcesso_estadoRed_(r), { success: false, message: 'Este link já enviou ' + SEGA_RED_MAX_ENVIOS_CODIGO + ' códigos. O que fazer: use o último código que chegou ou peça outro link em "Esqueci minha senha".' });
      var preferir = SegAcesso_txt_(opcoes.canal).toUpperCase() === 'EMAIL' ? 'EMAIL' : '';
      var envio = SegAcesso_novoCodigo_(rec, u, SegAcesso_config_(), preferir);
      rec.envios = (Number(rec.envios) || 0) + 1;
      if (!envio.ok) {
        rec.ultimoEnvioMs = Date.now();
        SegAcesso_gravarRed_(r.hash, rec);
        SegAcesso_registrar_('CODIGO_FALHA_ENVIO', u, c, 'Link de nova senha: ' + (envio.motivo || envio.message));
        return Object.assign(SegAcesso_estadoRed_(r), { success: false, message: envio.message });
      }
      SegAcesso_gravarRed_(r.hash, rec);
      SegAcesso_registrar_('REDEFINICAO_CODIGO_ENVIADO', u, c, 'Para ' + rec.destino + (rec.reserva ? ' (reserva por e-mail: ' + rec.motivoReserva + ')' : '') + '. Envio ' + rec.envios + ' de ' + SEGA_RED_MAX_ENVIOS_CODIGO + '.');
      return Object.assign(SegAcesso_estadoRed_(r), { message: 'Enviamos um código de 6 números para ' + (rec.canal === 'WHATSAPP' ? 'o ' : 'o seu ') + rec.destino + '. Ele vale por 10 minutos.' +
        (rec.reserva ? ' O WhatsApp não funcionou agora, por isso o código foi para o e-mail.' : '') + (rec.envios > 1 ? ' Use só o código mais recente.' : '') });
    })));
  } catch (e) {
    return { success: false, etapa: 'CODIGO', message: 'Não foi possível enviar o código agora. Aguarde alguns segundos e toque de novo.' };
  }
}

/**
 * Conclui o link. Senha: dados = { codigo (quando pedido), nova, confirmacao }; grava a senha, derruba todas as sessões e
 * aparelhos confiados, avisa por e-mail e registra. MP: apaga a senha do modo personalizado (a pessoa cria outra dentro do SGO+).
 */
function concluirRedefinicaoSenha(token, dados, ctx) {
  try {
    var c = SegAcesso_ctx_(ctx);
    dados = dados || {};
    return JSON.parse(JSON.stringify(SegAcesso_travar_(function () {
      var r = SegAcesso_lerRed_(token);
      if (r.invalido) return SegAcesso_respostaRedInvalida_(r, c);
      var rec = r.rec, u = r.u;
      if (rec.tipo === 'MP') {
        if (typeof SGO_MP_liberarSenhaPorLink_ !== 'function') return { success: false, etapa: 'MP', message: 'O modo personalizado não está disponível neste sistema. Fale com o administrador do SGO+.' };
        var mp = SGO_MP_liberarSenhaPorLink_(u, rec);
        if (!mp || !mp.ok) return { success: false, etapa: 'MP', message: (mp && mp.message) || 'Não foi possível liberar a senha nova agora. Tente de novo em alguns segundos.' };
        SegAcesso_apagarRed_(r.hash, rec);
        SegAcesso_registrar_('REDEFINICAO_MP_CONCLUIDA', u, c, 'Senha do modo personalizado apagada pelo link (' + (rec.origem === 'GESTAO' ? 'enviado pela gestão' : 'pedido pela pessoa') + ').');
        return { success: true, etapa: 'FIM', tipo: 'MP', message: 'Pronto: a senha antiga do modo personalizado foi apagada. O que fazer: entre no SGO+ e abra Qualificação e inspeção > Modo personalizado; lá você cria a senha nova.' };
      }
      if (SegAcesso_precisaCodigoRed_(u) && !rec.codigoOk) {
        var digitado = String(dados.codigo === null || dados.codigo === undefined ? '' : dados.codigo).replace(/\D/g, '');
        if (!rec.codigoHash) return Object.assign(SegAcesso_estadoRed_(r), { success: false, message: 'Primeiro toque em "Enviar o código" para receber o código no celular.' });
        if (!/^\d{6}$/.test(digitado)) return Object.assign(SegAcesso_estadoRed_(r), { success: false, message: 'Digite os 6 números do código que chegou para você.' });
        if (Date.now() > Number(rec.expiraMs)) return Object.assign(SegAcesso_estadoRed_(r), { success: false, vencido: true, message: 'O código venceu: ele vale 10 minutos. O que fazer: toque em "Reenviar código" para receber outro.' });
        if (!textosIguaisAuth_(SegAcesso_sha256_(rec.id + ':' + digitado), rec.codigoHash)) {
          rec.tentativas = (Number(rec.tentativas) || 0) + 1;
          var restam = SEGA_MAX_TENTATIVAS - rec.tentativas;
          if (restam <= 0) {
            SegAcesso_apagarRed_(r.hash, rec);
            SegAcesso_registrar_('REDEFINICAO_CODIGO_ERRADO', u, c, '5 códigos errados: link cancelado.');
            return { success: false, etapa: 'INVALIDO', message: 'Código errado 5 vezes. Por segurança, este link foi cancelado e a senha atual continua valendo. O que fazer: peça outro link em "Esqueci minha senha". Se não foi você, avise a gestão da Metrolabs.' };
          }
          SegAcesso_gravarRed_(r.hash, rec);
          SegAcesso_registrar_('REDEFINICAO_CODIGO_ERRADO', u, c, 'Restam ' + restam + ' tentativa(s).');
          return Object.assign(SegAcesso_estadoRed_(r), { success: false, message: 'Código errado. Confira os 6 números da mensagem mais recente e digite de novo. Restam ' + restam + ' tentativa' + (restam > 1 ? 's' : '') + '.' });
        }
        rec.codigoOk = true;
        delete rec.codigoHash;
        SegAcesso_gravarRed_(r.hash, rec);
        SegAcesso_registrar_('CODIGO_OK', u, c, 'Código do link de nova senha conferido.');
      }
      var erros = SegAcesso_validarNovaSenha_(dados.nova, dados.confirmacao, u);
      if (erros.length) {
        SegAcesso_registrar_('SENHA_TROCA_FALHA', u, c, 'Link de nova senha: senha nova fora das regras.');
        return Object.assign(SegAcesso_estadoRed_(r), { success: false, message: erros.join(' '), erros: erros });
      }
      var novaVersao = SegAcesso_versao_(u) + 1;
      var ok = SGO_DATA.update(SGO_CFG.SHEETS.CAD_USUARIOS, u.ID, {
        SENHA: gerarHashSenhaAuth_(String(dados.nova)), PRECISA_TROCAR_SENHA: '', SEGURANCA_VERSAO: String(novaVersao), SENHA_TROCADA_EM: SegAcesso_agora_()
      });
      if (!ok) return Object.assign(SegAcesso_estadoRed_(r), { success: false, message: 'Não foi possível gravar a senha nova agora. Nada foi alterado: tente de novo em alguns segundos.' });
      SegAcesso_apagarRed_(r.hash, rec);
      var derrubadas = SegAcesso_derrubarSessoes_(u.ID, '', '');
      SegAcesso_avisarSenhaAlterada_(u, c, rec.origem === 'GESTAO' ? 'link de nova senha enviado pela gestão' : 'link de "Esqueci minha senha"');
      registrarLogAuth_('SENHA_REDEFINIDA_LINK', { usuario: u.USUARIO, perfil: u.PERFIL, detalhe: 'Senha nova criada pelo link (' + (rec.origem === 'GESTAO' ? 'enviado pela gestão' : 'Esqueci minha senha') + ').' });
      SegAcesso_registrar_('REDEFINICAO_CONCLUIDA', u, c, 'Senha nova criada pelo link (' + (rec.origem === 'GESTAO' ? 'enviado pela gestão' : 'Esqueci minha senha') + '). ' +
        derrubadas.sessoes + ' sessão(ões) e ' + derrubadas.aparelhos + ' aparelho(s) confiado(s) desconectados; aviso por e-mail.');
      return { success: true, etapa: 'FIM', tipo: 'SENHA', limparAparelho: true,
        message: 'Senha nova criada. O que fazer: entre com o seu e-mail e a senha nova. Por segurança, todas as sessões abertas e os aparelhos confiados foram desconectados, e enviamos um aviso para o seu e-mail.' };
    })));
  } catch (e) {
    return { success: false, message: 'Não foi possível concluir agora. Nada foi alterado: tente de novo em alguns segundos.' };
  }
}

/** Link enviado pela gestão (Administração > Usuários) ou pelo Administrador do modo personalizado. Lança com a mensagem para a tela. */
function SegAcesso_enviarLinkGestao_(alvoId, motivo, sessao, tipo) {
  SegAcesso_garantirEstrutura_();
  var alvo = SegAcesso_usuarioPorId_(alvoId);
  if (!alvo) throw new Error('Pessoa não encontrada. Atualize a tela e tente de novo.');
  if (alvo.STATUS !== SGO_CFG.STATUS.ATIVO) throw new Error('Esta conta está inativa: o link não vale para conta inativa. Reative a conta antes (Mais > Reativar).');
  if (SegAcesso_foraDoFluxo_(alvo.PERFIL)) throw new Error('A conta técnica do Auvo não usa senha de pessoa: o link não se aplica.');
  if (!SegAcesso_email_(alvo)) throw new Error('Esta conta não tem e-mail válido cadastrado. O que fazer: cadastre o e-mail (Editar) ou use "Senha provisória (sem e-mail)".');
  if (tipo !== 'MP' && SegAcesso_contasPorEmail_(alvo.EMAIL).length > 1) throw new Error('O e-mail desta conta está em mais de uma conta ativa. Deixe o e-mail em uma conta só (Editar) antes de enviar o link.');
  var por = SegAcesso_por_(sessao);
  var r = SegAcesso_criarLinkRedefinicao_(alvo, null, { origem: 'GESTAO', por: por, porNome: SegAcesso_primeiroNome_(sessao && sessao.nome) || '', tipo: tipo });
  if (!r.ok) throw new Error(r.message || 'Não foi possível enviar o link agora.');
  SegAcesso_registrar_('REDEFINICAO_LINK_GESTAO', alvo, null, (tipo === 'MP' ? 'Link da senha do modo personalizado' : 'Link de nova senha') + ' para ' + r.destino + ' (vale 30 minutos). Motivo: ' + motivo, por);
  return { destino: r.destino, nome: alvo.NOME };
}

// ------------------------------------------------------------
// GESTÃO (Administração > Segurança do acesso)
// ------------------------------------------------------------
function SegAcesso_ehAdmin_(sessao) {
  var perfil = SegAcesso_txt_(sessao && sessao.perfil).toUpperCase();
  var dono = false;
  try { dono = typeof Chaves_ehDonoUsuario_ === 'function' && Chaves_ehDonoUsuario_(sessao && sessao.usuario); } catch (e) { dono = false; }
  return perfil === 'ADMIN' || dono;
}
function SegAcesso_podeVer_(sessao) {
  return SegAcesso_ehAdmin_(sessao) || (typeof isAdminPerfilAuth_ === 'function' && isAdminPerfilAuth_(sessao && sessao.perfil) && SegAcesso_txt_(sessao.perfil).toUpperCase() !== 'REPRESENTADA');
}
function SegAcesso_motivo_(payload) {
  var m = SegAcesso_txt_(payload && payload.motivo);
  if (m.length < 5) throw new Error('Escreva o motivo (pelo menos 5 letras). Ele fica no registro de segurança com o seu nome.');
  return m.slice(0, 300);
}
// 31/10/2026 (login pelo e-mail): o registro mostra o NOME de quem fez (o login fica só por dentro)
function SegAcesso_por_(sessao) { return SegAcesso_txt_(sessao && sessao.nome) || SegAcesso_txt_(sessao && sessao.usuario); }

/** Nomes para o registro: login (antigo) e e-mail -> nome. */
function SegAcesso_mapaNomes_() {
  var m = {};
  var antes = typeof SGO_DATA_REP_VISIVEL === 'undefined' ? false : SGO_DATA_REP_VISIVEL;
  SGO_DATA_REP_VISIVEL = true;
  try {
    SGO_DATA.getAll(SGO_CFG.SHEETS.CAD_USUARIOS).forEach(function (r) {
      var n = SegAcesso_txt_(r.NOME);
      if (!n) return;
      if (SegAcesso_txt_(r.USUARIO)) m[SegAcesso_txt_(r.USUARIO).toLowerCase()] = n;
      if (emailLoginAuth_(r.EMAIL)) m[emailLoginAuth_(r.EMAIL)] = n;
    });
  } catch (e) {} finally { SGO_DATA_REP_VISIVEL = antes; }
  return m;
}

/** Marca todas as contas ativas (menos perfis técnicos). Devolve { marcados, total }. Usado pelo botão e pelo script. */
function SegAcesso_exigirTrocaTodos_(motivo, por) {
  SegAcesso_garantirEstrutura_();
  var sh = SGO_DATA.getSheet(SGO_CFG.SHEETS.CAD_USUARIOS);
  var n = sh.getLastRow();
  if (n < 2) return { marcados: 0, total: 0 };
  var cab = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(function (h) { return SegAcesso_txt_(h).toUpperCase(); });
  var cMarca = cab.indexOf('PRECISA_TROCAR_SENHA'), cStatus = cab.indexOf('STATUS'), cPerfil = cab.indexOf('PERFIL');
  if (cMarca < 0) throw new Error('A coluna PRECISA_TROCAR_SENHA ainda não existe em CAD_USUARIOS. Abra a tela Segurança do acesso uma vez e tente de novo.');
  var linhas = sh.getRange(2, 1, n - 1, cab.length).getValues();
  var marcas = [], marcados = 0, total = 0;
  linhas.forEach(function (l) {
    var atual = l[cMarca];
    var ativo = SegAcesso_txt_(l[cStatus]).toUpperCase() === SGO_CFG.STATUS.ATIVO, fora = SegAcesso_foraDoFluxo_(l[cPerfil]);
    if (ativo && !fora && SegAcesso_txt_(l[0])) { total++; if (SegAcesso_txt_(atual).toUpperCase() !== 'SIM') marcados++; marcas.push(['SIM']); }
    else marcas.push([atual === null || atual === undefined ? '' : atual]);
  });
  sh.getRange(2, cMarca + 1, marcas.length, 1).setValues(marcas);
  SegAcesso_registrar_('TROCA_EXIGIDA_TODOS', { USUARIO: '(todos)' }, null, total + ' conta(s) ativa(s) marcadas (' + marcados + ' nova(s)). Motivo: ' + motivo, por);
  try { SGO_DATA.log('SEGURANCA_TROCA_TODOS', por, 'Troca de senha exigida de ' + total + ' conta(s) ativa(s). Motivo: ' + motivo, 'SEGURANCA'); } catch (e) {}
  return { marcados: marcados, total: total };
}

function SegAcesso_exigirTrocaUsuario_(alvo, motivo, por) {
  SegAcesso_garantirEstrutura_();
  if (!SGO_DATA.update(SGO_CFG.SHEETS.CAD_USUARIOS, alvo.ID, { PRECISA_TROCAR_SENHA: 'SIM' })) throw new Error('Não foi possível marcar a conta. Atualize a tela e tente de novo.');
  SegAcesso_registrar_('TROCA_EXIGIDA', alvo, null, 'Motivo: ' + motivo, por);
}

/** Zera o segundo fator: derruba os aparelhos confiados e as sessões; dispensa o código por 24 h (para recadastrar o celular). */
function SegAcesso_zerarSegundoFator_(alvo, motivo, por, dispensar) {
  SegAcesso_garantirEstrutura_();
  var v = SegAcesso_versao_(alvo) + 1;
  if (!SGO_DATA.update(SGO_CFG.SHEETS.CAD_USUARIOS, alvo.ID, { SEGURANCA_VERSAO: String(v) })) throw new Error('Não foi possível zerar agora. Atualize a tela e tente de novo.');
  if (dispensar !== false) SegAcesso_props_().setProperty('SEGA_DISPENSA_' + alvo.ID, JSON.stringify({ ate: new Date(Date.now() + SEGA_DISPENSA_HORAS * 3600000).toISOString(), v: v, por: por }));
  SegAcesso_registrar_('SEGUNDO_FATOR_ZERADO', alvo, null, 'Aparelhos confiados e sessões derrubados' + (dispensar !== false ? '; entra sem código nas próximas 24 h' : '') + '. Motivo: ' + motivo, por);
  return v;
}

function SegAcesso_lerRegistro_(filtro) {
  filtro = filtro || {};
  var dias = Math.min(90, Math.max(1, Number(filtro.dias) || 7));
  var quem = SegAcesso_txt_(filtro.usuario).toLowerCase(), evento = SegAcesso_txt_(filtro.evento).toUpperCase();
  var limite = new Date(Date.now() - dias * 86400000);
  var desde = Utilities.formatDate(limite, SEGA_FUSO, "yyyy-MM-dd'T'HH:mm:ss");
  var sh = null;
  try { sh = SpreadsheetApp.openById(SGO_CFG.DB_ID).getSheetByName(SEGA_ABA); } catch (e) { sh = null; }
  if (!sh || sh.getLastRow() < 2) return [];
  var n = sh.getLastRow(), ini = Math.max(2, n - 5000 + 1);
  var vals = sh.getRange(ini, 1, n - ini + 1, SEGA_COLUNAS.length).getValues();
  var out = [], nomes = SegAcesso_mapaNomes_();
  for (var i = vals.length - 1; i >= 0 && out.length < 500; i--) {
    var l = vals[i];
    var q = Object.prototype.toString.call(l[1]) === '[object Date]' ? Utilities.formatDate(l[1], SEGA_FUSO, "yyyy-MM-dd'T'HH:mm:ss") : SegAcesso_txt_(l[1]);
    if (q && q < desde) break;
    // 31/10/2026: a coluna guarda o login (antigo) ou o e-mail digitado; a tela mostra o nome da pessoa
    var gravado = SegAcesso_txt_(l[3]), nome = nomes[gravado.toLowerCase()] || '';
    if (quem && gravado.toLowerCase().indexOf(quem) < 0 && nome.toLowerCase().indexOf(quem) < 0) continue;
    if (evento && SegAcesso_txt_(l[2]).toUpperCase() !== evento) continue;
    out.push({ quando: SegAcesso_dataBr_(q), evento: SegAcesso_txt_(l[2]), rotulo: SEGA_EVENTOS[SegAcesso_txt_(l[2])] || SegAcesso_txt_(l[2]),
      pessoa: nome || (gravado.indexOf('@') >= 0 ? gravado : (gravado ? 'Conta não encontrada' : '')),
      perfil: SegAcesso_txt_(l[5]), ip: SegAcesso_txt_(l[6]), aparelho: SegAcesso_txt_(l[7]), detalhe: SegAcesso_txt_(l[8]), por: SegAcesso_txt_(l[9]).replace(/^\S+ \((.+)\)$/, '$1') });
  }
  return out;
}

function SegAcesso_pessoas_() {
  var antes = typeof SGO_DATA_REP_VISIVEL === 'undefined' ? false : SGO_DATA_REP_VISIVEL;
  SGO_DATA_REP_VISIVEL = true;
  try {
    return SGO_DATA.getAll(SGO_CFG.SHEETS.CAD_USUARIOS).filter(function (r) { return SegAcesso_txt_(r.ID) && !SegAcesso_foraDoFluxo_(r.PERFIL); }).map(function (r) {
      var tel = SegAcesso_celular_(r);
      return {
        // 31/10/2026: a pessoa é identificada pelo nome e pelo e-mail (o login não aparece mais)
        id: SegAcesso_txt_(r.ID), nome: SegAcesso_txt_(r.NOME), email: emailLoginAuth_(r.EMAIL), perfil: SegAcesso_txt_(r.PERFIL).toUpperCase(),
        ativo: SegAcesso_txt_(r.STATUS).toUpperCase() === SGO_CFG.STATUS.ATIVO, trocaPendente: SegAcesso_txt_(r.PRECISA_TROCAR_SENHA).toUpperCase() === 'SIM',
        celularFinal: tel ? tel.slice(-2) : '', temEmail: !!SegAcesso_email_(r), senhaTrocadaEm: SegAcesso_dataBr_(r.SENHA_TROCADA_EM),
        senhaForte: senhaHashForteAuth_(r.SENHA)
      };
    }).sort(function (a, b) { return (a.ativo === b.ativo ? 0 : a.ativo ? -1 : 1) || a.nome.localeCompare(b.nome, 'pt-BR'); });
  } finally { SGO_DATA_REP_VISIVEL = antes; }
}

/**
 * 31/10/2026 (login pelo e-mail): contas ATIVAS sem e-mail válido e e-mails repetidos entre contas ativas (sem a conta
 * técnica do Auvo). Usado pela tela Usuários, pela Segurança do acesso e pelo script do servidor
 * (sgo_servidor/scripts/seguranca_listar_emails.ts), que o dono roda antes de publicar. Só lê; nunca decide nada.
 * Devolve { ativos, semEmail: [{ id, nome, perfil, login, email }], repetidos: [{ email, contas: [{ id, nome, perfil, login }] }] }.
 */
function SegAcesso_relatorioEmails_() {
  var antes = typeof SGO_DATA_REP_VISIVEL === 'undefined' ? false : SGO_DATA_REP_VISIVEL;
  SGO_DATA_REP_VISIVEL = true;
  try {
    var ativos = SGO_DATA.getAll(SGO_CFG.SHEETS.CAD_USUARIOS).filter(function (r) {
      return SegAcesso_txt_(r.ID) && SegAcesso_txt_(r.STATUS).toUpperCase() === SGO_CFG.STATUS.ATIVO && !SegAcesso_foraDoFluxo_(r.PERFIL);
    });
    var item = function (r) { return { id: SegAcesso_txt_(r.ID), nome: SegAcesso_txt_(r.NOME), perfil: SegAcesso_txt_(r.PERFIL).toUpperCase(), login: SegAcesso_txt_(r.USUARIO), email: SegAcesso_txt_(r.EMAIL) }; };
    var semEmail = ativos.filter(function (r) { return !emailValidoAuth_(r.EMAIL); }).map(item);
    var porEmail = {};
    ativos.forEach(function (r) { var e = emailLoginAuth_(r.EMAIL); if (emailValidoAuth_(e)) (porEmail[e] = porEmail[e] || []).push(item(r)); });
    var repetidos = Object.keys(porEmail).filter(function (e) { return porEmail[e].length > 1; }).sort().map(function (e) { return { email: e, contas: porEmail[e] }; });
    return { ativos: ativos.length, semEmail: semEmail, repetidos: repetidos };
  } finally { SGO_DATA_REP_VISIVEL = antes; }
}

/**
 * Entrada única da tela. acao: painel | registro | gravarConfig | exigirTrocaTodos | exigirTrocaUsuario | zerarSegundoFator |
 * modeloSituacao | modeloCadastrar. Ver: Administrador, Diretoria e Gestor. Alterar: Administrador (e o responsável pelo sistema).
 */
function SegAcesso_api(sessionId, acao, payload) {
  try {
    payload = payload || {};
    var sessao = exigirSessao(sessionId);
    if (!SegAcesso_podeVer_(sessao)) throw new Error('Não foi possível abrir: a Segurança do acesso é da gestão (Administrador, Diretoria e Gestor). Use o menu para voltar ao Início.');
    var admin = SegAcesso_ehAdmin_(sessao), por = SegAcesso_por_(sessao);
    var exigirAdmin = function () { if (!admin) throw new Error('Não foi possível concluir: só o Administrador do SGO+ altera a segurança do acesso. Peça a ele; você pode consultar a tela e o registro.'); };
    SegAcesso_garantirEstrutura_();
    var r;
    switch (String(acao || '')) {
      case 'painel': {
        var pessoas = SegAcesso_pessoas_(), ativos = pessoas.filter(function (p) { return p.ativo; });
        var emails = SegAcesso_relatorioEmails_();
        r = {
          // 31/10/2026: quem não consegue entrar (sem e-mail ou e-mail repetido): a tela mostra em destaque
          entrada: { semEmail: emails.semEmail.map(function (x) { return { id: x.id, nome: x.nome, perfil: x.perfil }; }),
            repetidos: emails.repetidos.map(function (g) { return { email: g.email, contas: g.contas.map(function (x) { return { id: x.id, nome: x.nome, perfil: x.perfil }; }) }; }) },
          config: SegAcesso_config_(), rotulos: SEGA_ROTULO_MODO, podeAlterar: admin, eu: SegAcesso_txt_(sessao.userId),
          modelo: Object.assign({ nome: SEGA_MODELO_META.nome }, SegAcesso_lerJson_(SEGA_MODELO_PROP) || {}),
          metaConfigurada: (function () { var c = SegAcesso_credMeta_(); return !!(c.token && c.phoneId); })(),
          perfis: (SGO_CFG.PROFILES || []).slice(),
          contagem: { ativos: ativos.length, trocaPendente: ativos.filter(function (p) { return p.trocaPendente; }).length,
            semCelular: ativos.filter(function (p) { return !p.celularFinal; }).length, semEmail: ativos.filter(function (p) { return !p.temEmail; }).length,
            senhaAntiga: ativos.filter(function (p) { return !p.senhaForte; }).length },
          pessoas: pessoas.map(function (p) { var o = Object.assign({}, p); delete o.senhaForte; return o; }),
          registro: SegAcesso_lerRegistro_({ dias: 7 }).slice(0, 100), eventos: SEGA_EVENTOS
        };
        break;
      }
      case 'registro':
        r = { registro: SegAcesso_lerRegistro_(payload) };
        break;
      case 'gravarConfig': {
        exigirAdmin();
        var modo = SegAcesso_txt_(payload.modo).toUpperCase();
        if (SEGA_MODOS.indexOf(modo) < 0) throw new Error('Escolha uma das opções: Desligado, Só e-mail ou WhatsApp com e-mail de reserva.');
        var validos = (SGO_CFG.PROFILES || []).map(function (p) { return String(p).toUpperCase(); });
        var perfis = (Array.isArray(payload.perfis) ? payload.perfis : []).map(function (p) { return SegAcesso_txt_(p).toUpperCase(); }).filter(function (p) { return validos.indexOf(p) >= 0; });
        var antes = SegAcesso_config_();
        var cfg = { modo: modo, perfis: perfis, alteradoEm: SegAcesso_agora_(), alteradoPor: por };
        SegAcesso_props_().setProperty(SEGA_CONFIG_PROP, JSON.stringify(cfg));
        SegAcesso_registrar_('CONFIG_ALTERADA', { USUARIO: sessao.usuario, ID: sessao.userId, PERFIL: sessao.perfil }, null,
          'Código no celular: ' + SEGA_ROTULO_MODO[antes.modo] + ' -> ' + SEGA_ROTULO_MODO[modo] + '; perfis: ' + (perfis.length ? perfis.join(', ') : 'todos') + '.', por);
        r = { config: SegAcesso_config_(), message: 'Gravado. ' + (modo === 'DESLIGADO' ? 'O código no celular está desligado: as pessoas entram só com a senha.' :
          'A partir do próximo login, ' + (perfis.length ? 'os perfis ' + perfis.join(', ') : 'todos') + ' recebem o código ' + (modo === 'EMAIL' ? 'por e-mail.' : 'pelo WhatsApp (ou por e-mail, se o WhatsApp falhar).')) };
        break;
      }
      case 'exigirTrocaTodos': {
        exigirAdmin();
        var motivoT = SegAcesso_motivo_(payload);
        if (payload.confirmar !== true) throw new Error('Confirme a ação para continuar.');
        var t = SegAcesso_exigirTrocaTodos_(motivoT, por);
        r = { resultado: t, message: 'Pronto: ' + t.total + ' conta(s) ativa(s) vão criar a senha nova no próximo login (quem já está dentro vê a tela em até 5 minutos), inclusive você.' };
        break;
      }
      case 'exigirTrocaUsuario':
      case 'zerarSegundoFator': {
        exigirAdmin();
        var motivoU = SegAcesso_motivo_(payload);
        var alvo = SegAcesso_usuarioPorId_(payload.usuarioId);
        if (!alvo) throw new Error('Pessoa não encontrada. Atualize a tela e tente de novo.');
        if (acao === 'exigirTrocaUsuario') {
          SegAcesso_exigirTrocaUsuario_(alvo, motivoU, por);
          r = { message: SegAcesso_primeiroNome_(alvo.NOME) + ' vai criar a senha nova no próximo login (se estiver dentro do sistema, a tela abre em até 5 minutos).' };
        } else {
          SegAcesso_zerarSegundoFator_(alvo, motivoU, por, true);
          r = { message: 'Segundo fator de ' + SegAcesso_primeiroNome_(alvo.NOME) + ' zerado: os aparelhos confiados e as sessões abertas foram desconectados, e ' +
            'nas próximas 24 horas a pessoa entra só com a senha. Confira o celular dela em Administração > Usuários antes disso.' };
        }
        break;
      }
      case 'modeloSituacao':
        exigirAdmin();
        r = SegAcesso_modeloSituacao_();
        break;
      case 'modeloCadastrar':
        exigirAdmin();
        r = SegAcesso_modeloCadastrar_(por);
        break;
      default:
        throw new Error('Ação desconhecida na Segurança do acesso. Atualize a página (F5).');
    }
    return JSON.parse(JSON.stringify(Object.assign({ ok: true }, r)));
  } catch (e) {
    return { ok: false, message: String((e && e.message) || e) };
  }
}

// ------------------------------------------------------------
// MODELO DA META (AUTHENTICATION) — cadastro e situação
// ------------------------------------------------------------
/** Corpo do cadastro do modelo (POST /<WABA_ID>/message_templates). */
function SegAcesso_corpoCadastroModelo_() {
  return {
    name: SEGA_MODELO_META.nome, language: SEGA_MODELO_META.idioma, category: SEGA_MODELO_META.categoria,
    message_send_ttl_seconds: SEGA_MODELO_META.validadeMin * 60,
    components: [
      { type: 'BODY', add_security_recommendation: true },
      { type: 'FOOTER', code_expiration_minutes: SEGA_MODELO_META.validadeMin },
      { type: 'BUTTONS', buttons: [{ type: 'OTP', otp_type: 'COPY_CODE', text: SEGA_MODELO_META.botao }] }
    ]
  };
}

function SegAcesso_credGestaoMeta_() {
  var c = SegAcesso_credMeta_(), falta = [];
  if (!c.token) falta.push('META_WA_TOKEN');
  if (!c.wabaId) falta.push('META_WA_WABA_ID');
  if (falta.length) throw new Error('Não foi possível falar com a Meta: falta gravar ' + falta.join(' e ') + ' em Chaves e senhas > WhatsApp oficial.');
  return c;
}

function SegAcesso_chamarMeta_(cred, url, metodo, corpo) {
  var op = { method: metodo, muteHttpExceptions: true, headers: { Authorization: 'Bearer ' + cred.token } };
  if (corpo) { op.contentType = 'application/json'; op.payload = JSON.stringify(corpo); }
  var r = UrlFetchApp.fetch(url, op), j = null;
  try { j = JSON.parse(String(r.getContentText() || '')); } catch (e) {}
  return { http: r.getResponseCode(), j: j };
}

/** Situação do modelo na Meta; guarda em SEGA_MODELO_SITUACAO (o envio só tenta o WhatsApp com ele aprovado ou sem situação). */
function SegAcesso_modeloSituacao_() {
  var cred = SegAcesso_credGestaoMeta_();
  var url = 'https://graph.facebook.com/' + SegAcesso_versaoMeta_() + '/' + encodeURIComponent(cred.wabaId) + '/message_templates?fields=name,status,language,category,rejected_reason&name=' + encodeURIComponent(SEGA_MODELO_META.nome) + '&limit=50';
  var r;
  try { r = SegAcesso_chamarMeta_(cred, url, 'get', null); } catch (e) { return { funcionou: false, texto: 'Sem resposta da Meta: ' + SegAcesso_limparSegredos_(e && e.message, [cred.token]) }; }
  if (r.http < 200 || r.http >= 300 || !r.j || r.j.error) return { funcionou: false, texto: 'A Meta recusou a consulta (HTTP ' + r.http + '): ' + SegAcesso_limparSegredos_((r.j && r.j.error && r.j.error.message) || '', [cred.token]).slice(0, 200) };
  var m = (r.j.data || []).filter(function (x) { return x && x.name === SEGA_MODELO_META.nome && x.language === SEGA_MODELO_META.idioma; })[0];
  var sit = m ? { status: String(m.status || '').toUpperCase(), categoria: String(m.category || '').toUpperCase(), motivo: String(m.rejected_reason || ''), em: SegAcesso_agora_() } : { status: 'NAO_CADASTRADO', em: SegAcesso_agora_() };
  // "não cadastrado" não trava o envio (pode ter sido cadastrado pelo Gerenciador e ainda não aparecer): só guarda situação conhecida
  if (m) SegAcesso_props_().setProperty(SEGA_MODELO_PROP, JSON.stringify(sit)); else SegAcesso_props_().deleteProperty(SEGA_MODELO_PROP);
  var rot = { APPROVED: 'Aprovado', PENDING: 'Em análise', REJECTED: 'Recusado', PAUSED: 'Pausado', DISABLED: 'Desativado', NAO_CADASTRADO: 'Não cadastrado' };
  return { funcionou: true, situacao: sit, texto: 'Modelo ' + SEGA_MODELO_META.nome + ': ' + (rot[sit.status] || sit.status) + '.' +
    (sit.status === 'APPROVED' ? ' O código já pode sair pelo WhatsApp.' : sit.status === 'NAO_CADASTRADO' ? ' Use "Cadastrar modelo na Meta".' : sit.status === 'PENDING' ? ' Aguarde a análise da Meta e consulte de novo.' : ' Enquanto não estiver aprovado, o código vai por e-mail.') };
}

/** Cadastra o modelo de autenticação (se ainda não existe). Usado pelo botão e pelo script do servidor. */
function SegAcesso_modeloCadastrar_(por) {
  var cred = SegAcesso_credGestaoMeta_();
  var antes = SegAcesso_modeloSituacao_();
  if (antes.funcionou && antes.situacao && antes.situacao.status !== 'NAO_CADASTRADO') return { funcionou: true, jaExistia: true, situacao: antes.situacao, texto: 'O modelo já está cadastrado na Meta. ' + antes.texto };
  var r;
  try { r = SegAcesso_chamarMeta_(cred, 'https://graph.facebook.com/' + SegAcesso_versaoMeta_() + '/' + encodeURIComponent(cred.wabaId) + '/message_templates', 'post', SegAcesso_corpoCadastroModelo_()); }
  catch (e) { return { funcionou: false, texto: 'Sem resposta da Meta: ' + SegAcesso_limparSegredos_(e && e.message, [cred.token]) }; }
  var er = (r.j && r.j.error) || null;
  if (r.http >= 200 && r.http < 300 && !er) {
    var st = String((r.j && r.j.status) || 'PENDING').toUpperCase();
    SegAcesso_props_().setProperty(SEGA_MODELO_PROP, JSON.stringify({ status: st, categoria: String((r.j && r.j.category) || SEGA_MODELO_META.categoria).toUpperCase(), em: SegAcesso_agora_() }));
    SegAcesso_registrar_('MODELO_META', { USUARIO: String(por || '').split(' ')[0] }, null, 'Modelo ' + SEGA_MODELO_META.nome + ' enviado para análise (' + st + ').', por);
    return { funcionou: true, situacao: { status: st }, texto: 'Modelo enviado para análise da Meta (' + st + '). A aprovação costuma sair em minutos; consulte a situação depois.' };
  }
  var msg = SegAcesso_limparSegredos_((er && (er.error_user_msg || er.message)) || '', [cred.token]).slice(0, 260);
  return { funcionou: false, texto: 'A Meta recusou o cadastro (HTTP ' + r.http + (er && er.code !== undefined ? ', código ' + er.code : '') + '): ' + msg + '. O que fazer: confira o token (permissão whatsapp_business_management) e o WABA ID; ou cadastre pelo Gerenciador do WhatsApp conforme MODELOS_WHATSAPP_META.md.' };
}

// ------------------------------------------------------------
// RECUPERAÇÃO PELO SERVIDOR (script sgo_servidor/scripts/seguranca_recuperar_acesso.ts)
// ------------------------------------------------------------
/** Senha provisória que passa nas regras (12 caracteres, letras e números, sem caracteres confusos). */
function SegAcesso_senhaProvisoria_() {
  var letras = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ', nums = '23456789', h = SegAcesso_hex_(24), s = '';
  for (var i = 0; i < 12; i++) { var v = parseInt(h.substr(i * 2, 2), 16); s += (i % 4 === 3) ? nums.charAt(v % nums.length) : letras.charAt(v % letras.length); }
  return s;
}

/**
 * Recupera o acesso de um login (o dono nunca fica trancado). opcoes: { senhaProvisoria, desligarCodigo, reativar, motivo }.
 * Sempre: zera o segundo fator (aparelhos e sessões caem; 24 h sem código). Devolve a senha provisória só para o script.
 */
function SegAcesso_recuperarAcesso_(login, opcoes) {
  opcoes = opcoes || {};
  var alvoLogin = SegAcesso_txt_(login).toLowerCase();
  if (!alvoLogin) throw new Error('Informe o e-mail (--email) ou o login interno (--usuario).');
  SegAcesso_garantirEstrutura_();
  var antes = typeof SGO_DATA_REP_VISIVEL === 'undefined' ? false : SGO_DATA_REP_VISIVEL;
  SGO_DATA_REP_VISIVEL = true;
  var reg;
  // 31/10/2026: aceita o e-mail (a entrada agora é por ele) ou o login interno (CAD_USUARIOS.USUARIO)
  var porEmail = alvoLogin.indexOf('@') >= 0;
  try {
    var achados = SGO_DATA.getAll(SGO_CFG.SHEETS.CAD_USUARIOS).filter(function (r) { return porEmail ? emailLoginAuth_(r.EMAIL) === emailLoginAuth_(alvoLogin) : SegAcesso_txt_(r.USUARIO).toLowerCase() === alvoLogin; });
    if (porEmail && achados.length > 1) throw new Error('O e-mail "' + alvoLogin + '" está em ' + achados.length + ' contas: use --usuario com o login interno da conta certa.');
    reg = achados[0];
  } finally { SGO_DATA_REP_VISIVEL = antes; }
  if (!reg) throw new Error((porEmail ? 'E-mail' : 'Login') + ' "' + alvoLogin + '" não encontrado em CAD_USUARIOS.');
  var u = usuarioParaSessaoAuth_(reg);
  var por = 'servidor (script de recuperação)';
  var motivo = SegAcesso_txt_(opcoes.motivo) || 'recuperação de acesso pelo servidor';
  var feito = [];
  if (opcoes.reativar && u.STATUS !== SGO_CFG.STATUS.ATIVO) { SGO_DATA.update(SGO_CFG.SHEETS.CAD_USUARIOS, u.ID, { STATUS: SGO_CFG.STATUS.ATIVO }); feito.push('conta reativada'); }
  SegAcesso_zerarSegundoFator_(u, motivo, por, true);
  feito.push('segundo fator zerado (aparelhos e sessões desconectados; 24 h sem código)');
  var senha = '';
  if (opcoes.senhaProvisoria) {
    senha = SegAcesso_senhaProvisoria_();
    SGO_DATA.update(SGO_CFG.SHEETS.CAD_USUARIOS, u.ID, { SENHA: gerarHashSenhaAuth_(senha), PRECISA_TROCAR_SENHA: 'SIM' });
    feito.push('senha provisória gravada (troca obrigatória no próximo login)');
  }
  if (opcoes.desligarCodigo) {
    var cfg = SegAcesso_config_();
    SegAcesso_props_().setProperty(SEGA_CONFIG_PROP, JSON.stringify({ modo: 'DESLIGADO', perfis: cfg.perfis, alteradoEm: SegAcesso_agora_(), alteradoPor: por }));
    feito.push('código no celular desligado para todos');
  }
  SegAcesso_registrar_('RECUPERACAO', u, null, feito.join('; ') + '. Motivo: ' + motivo, por);
  try { SGO_DATA.log('SEGURANCA_RECUPERACAO', por, 'Acesso recuperado para ' + alvoLogin + ': ' + feito.join('; '), 'SEGURANCA'); } catch (e) {}
  return { ok: true, usuario: alvoLogin, nome: u.NOME, perfil: u.PERFIL, feito: feito, senhaProvisoria: senha };
}
