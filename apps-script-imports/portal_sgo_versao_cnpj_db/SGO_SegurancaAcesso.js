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
  CONFIG_ALTERADA: 'Configuração alterada', RECUPERACAO: 'Acesso recuperado pelo servidor', MODELO_META: 'Modelo da Meta'
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
var SEGA_MSG_DESAFIO_VENCIDO = 'Este código não vale mais. Por quê: cada login tem até 30 minutos para receber e digitar o código, e ele só pode ser usado uma vez. O que fazer: toque em "Voltar" e entre de novo com o usuário e a senha.';

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
        if (!podeReenviar) { SegAcesso_apagarDesafio_(d.id); return { success: false, etapa: 'LOGIN', message: 'O código venceu (ele vale 10 minutos) e este login já usou os 3 reenvios. O que fazer: toque em "Voltar" e entre de novo com o usuário e a senha.' }; }
        return { success: false, etapa: 'CODIGO', message: 'O código venceu: ele vale 10 minutos. O que fazer: toque em "Reenviar código" para receber outro.', vencido: true, reenviarEmS: 0 };
      }
      if (!textosIguaisAuth_(SegAcesso_sha256_(d.id + ':' + digitado), d.codigoHash)) {
        d.tentativas = (Number(d.tentativas) || 0) + 1;
        var restam = SEGA_MAX_TENTATIVAS - d.tentativas;
        if (restam <= 0) {
          SegAcesso_apagarDesafio_(d.id);
          SegAcesso_registrar_('CODIGO_BLOQUEADO', u || { ID: d.userId }, c, '5 códigos errados: login cancelado.');
          return { success: false, etapa: 'LOGIN', message: 'Código errado 5 vezes. Por segurança, este login foi cancelado. O que fazer: toque em "Voltar" e entre de novo com o usuário e a senha para receber um código novo. Se não foi você, troque a sua senha.' };
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
    return { success: false, etapa: 'CODIGO', message: 'Não foi possível conferir o código agora. Tente de novo em alguns segundos; se continuar, volte e entre de novo com o usuário e a senha.' };
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
      if ((Number(d.reenvios) || 0) >= SEGA_MAX_REENVIOS) return { success: false, etapa: 'CODIGO', message: 'Você já pediu 3 códigos novos neste login. O que fazer: use o último código que chegou ou toque em "Voltar" e entre de novo com o usuário e a senha.', reenviosRestantes: 0 };
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
  else if (nova.length >= 8 && SegAcesso_senhaObvia_(nova, u)) e.push('Esta senha é fácil de adivinhar (sequência, repetição, o seu nome, o seu login ou o nome da empresa). Escolha outra.');
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
      if (!sess || sessaoExpiradaAuth_(sess)) return { success: false, etapa: 'LOGIN', message: 'Sua sessão terminou antes da troca. O que fazer: entre de novo com o usuário e a senha atual; a tela "Crie sua nova senha" aparece em seguida.' };
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
            return { success: false, etapa: 'LOGIN', message: 'A senha atual não conferiu 5 vezes. Por segurança, a sessão foi encerrada. O que fazer: entre de novo com o usuário e a senha; se esqueceu a senha, peça ao administrador para redefinir.' };
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
function SegAcesso_por_(sessao) { return SegAcesso_txt_(sessao.usuario) + (sessao.nome ? ' (' + SegAcesso_txt_(sessao.nome) + ')' : ''); }

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
  var out = [];
  for (var i = vals.length - 1; i >= 0 && out.length < 500; i--) {
    var l = vals[i];
    var q = Object.prototype.toString.call(l[1]) === '[object Date]' ? Utilities.formatDate(l[1], SEGA_FUSO, "yyyy-MM-dd'T'HH:mm:ss") : SegAcesso_txt_(l[1]);
    if (q && q < desde) break;
    if (quem && SegAcesso_txt_(l[3]).toLowerCase().indexOf(quem) < 0) continue;
    if (evento && SegAcesso_txt_(l[2]).toUpperCase() !== evento) continue;
    out.push({ quando: SegAcesso_dataBr_(q), evento: SegAcesso_txt_(l[2]), rotulo: SEGA_EVENTOS[SegAcesso_txt_(l[2])] || SegAcesso_txt_(l[2]), usuario: SegAcesso_txt_(l[3]),
      perfil: SegAcesso_txt_(l[5]), ip: SegAcesso_txt_(l[6]), aparelho: SegAcesso_txt_(l[7]), detalhe: SegAcesso_txt_(l[8]), por: SegAcesso_txt_(l[9]) });
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
        id: SegAcesso_txt_(r.ID), nome: SegAcesso_txt_(r.NOME), usuario: SegAcesso_txt_(r.USUARIO).toLowerCase(), perfil: SegAcesso_txt_(r.PERFIL).toUpperCase(),
        ativo: SegAcesso_txt_(r.STATUS).toUpperCase() === SGO_CFG.STATUS.ATIVO, trocaPendente: SegAcesso_txt_(r.PRECISA_TROCAR_SENHA).toUpperCase() === 'SIM',
        celularFinal: tel ? tel.slice(-2) : '', temEmail: !!SegAcesso_email_(r), senhaTrocadaEm: SegAcesso_dataBr_(r.SENHA_TROCADA_EM),
        senhaForte: senhaHashForteAuth_(r.SENHA)
      };
    }).sort(function (a, b) { return (a.ativo === b.ativo ? 0 : a.ativo ? -1 : 1) || a.nome.localeCompare(b.nome, 'pt-BR'); });
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
        r = {
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
  if (!alvoLogin) throw new Error('Informe o login (--usuario).');
  SegAcesso_garantirEstrutura_();
  var antes = typeof SGO_DATA_REP_VISIVEL === 'undefined' ? false : SGO_DATA_REP_VISIVEL;
  SGO_DATA_REP_VISIVEL = true;
  var reg;
  try { reg = SGO_DATA.getAll(SGO_CFG.SHEETS.CAD_USUARIOS).filter(function (r) { return SegAcesso_txt_(r.USUARIO).toLowerCase() === alvoLogin; })[0]; } finally { SGO_DATA_REP_VISIVEL = antes; }
  if (!reg) throw new Error('Login "' + alvoLogin + '" não encontrado em CAD_USUARIOS.');
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
