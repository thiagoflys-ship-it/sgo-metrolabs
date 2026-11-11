/**
 * SGO_SimuladorCodigo.js — CÓDIGO PELO WHATSAPP DO DONO para abrir o modo de dados reconstituídos (11/11/2026).
 *
 * Além da senha administrativa do simulador (que continua igual), o modo de dados reconstituídos (simulação
 * didática) exige um código de 6 dígitos enviado ao WhatsApp do DONO (usuário "admin" do cadastro, celular de
 * CAD_USUARIOS.CELULAR), pelo mesmo envio do código de acesso do login (SGO_SegurancaAcesso.js, modelo de
 * autenticação da Meta). Regras:
 *  - quem pode pedir: a regra atual do botão "Relatório interno" (perfil ADMIN ou o Bento autorizado);
 *  - o código vale 10 minutos, só uma vez, com no máximo 5 tentativas; guardado só o resumo (hash), nunca o código;
 *  - registro de cada pedido, liberação e recusa (quem, quando) no registro de segurança e no log do sistema;
 *  - o dono recebe um aviso a cada pedido (quem pediu e quando);
 *  - liberado, vale para a sessão da pessoa por 2 horas (não pede a cada clique);
 *  - sem WhatsApp configurado (ou sem celular do dono), a tela explica e NÃO libera.
 * A conferência fica nos despachos dos módulos (SGO_SimCodigo_exigirNaChamada_): sem liberação, nenhuma chamada do
 * simulador passa, nem a validação da senha.
 */

var SGO_SIMCOD_VALIDADE_MS = 10 * 60 * 1000;
var SGO_SIMCOD_SESSAO_MS = 2 * 60 * 60 * 1000;
var SGO_SIMCOD_MAX_TENTATIVAS = 5;
var SGO_SIMCOD_ESPERA_REENVIO_MS = 60 * 1000;
var SGO_SIMCOD_PROP_DONO = 'SIMULADOR_CODIGO_DONO'; // login do dono (padrão: admin)
var SGO_SIMCOD_PREFIXO_ERRO = 'CÓDIGO DO DONO NECESSÁRIO: ';
// Regra atual do botão "Relatório interno" (SGO_podeRelatorioInterno_ nas telas): ADMIN ou o Bento autorizado.
var SGO_SIMCOD_AUTORIZADOS = [{ usuario: 'bento', id: 'b36756b2-d5e1-474d-9ae3-f5e5826a6c13' }];

function SGO_SimCodigo_s_(v) { return v === null || v === undefined ? '' : String(v).trim(); }
function SGO_SimCodigo_agora_() { return new Date().getTime(); }
function SGO_SimCodigo_props_() { return PropertiesService.getScriptProperties(); }
function SGO_SimCodigo_ler_(k) { try { var t = SGO_SimCodigo_props_().getProperty(k); return t ? JSON.parse(t) : null; } catch (e) { return null; } }
function SGO_SimCodigo_gravar_(k, o) { SGO_SimCodigo_props_().setProperty(k, JSON.stringify(o)); }
function SGO_SimCodigo_apagar_(k) { try { SGO_SimCodigo_props_().deleteProperty(k); } catch (e) {} }

function SGO_SimCodigo_hash_(t) {
  if (typeof SegAcesso_sha256_ === 'function') return SegAcesso_sha256_(t);
  var d = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(t), Utilities.Charset.UTF_8);
  return d.map(function (b) { var h = ((b < 0 ? b + 256 : b)).toString(16); return h.length === 1 ? '0' + h : h; }).join('');
}
function SGO_SimCodigo_gerar_() {
  if (typeof SegAcesso_gerarCodigo_ === 'function') return SegAcesso_gerarCodigo_();
  var n = parseInt(Utilities.getUuid().replace(/-/g, '').slice(0, 12), 16) % 1000000;
  return ('000000' + n).slice(-6);
}
function SGO_SimCodigo_hora_(ms) {
  try { return Utilities.formatDate(new Date(ms), 'America/Sao_Paulo', 'dd/MM/yyyy HH:mm'); } catch (e) { return new Date(ms).toISOString(); }
}

function SGO_SimCodigo_chavePedido_(userId) { return 'SIMCOD_P_' + SGO_SimCodigo_hash_('p:' + userId).slice(0, 40); }
function SGO_SimCodigo_chaveSessao_(sessionId) { return 'SIMCOD_L_' + SGO_SimCodigo_hash_('s:' + sessionId).slice(0, 40); }

/** Mesma regra do botão "Relatório interno": perfil ADMIN ou a liberação individual do Bento. */
function SGO_SimCodigo_podePedir_(sessao) {
  var perfil = SGO_SimCodigo_s_(sessao && sessao.perfil).toUpperCase();
  if (perfil === 'ADMIN') return true;
  var id = SGO_SimCodigo_s_(sessao && (sessao.userId || sessao.id)), usuario = SGO_SimCodigo_s_(sessao && sessao.usuario).toLowerCase();
  return SGO_SIMCOD_AUTORIZADOS.some(function (a) { return a.id === id && a.usuario === usuario; });
}

/** Dono: usuário do cadastro com o login configurado (padrão "admin"), ativo. */
function SGO_SimCodigo_dono_() {
  var login = 'admin';
  try { login = SGO_SimCodigo_s_(SGO_SimCodigo_props_().getProperty(SGO_SIMCOD_PROP_DONO)).toLowerCase() || 'admin'; } catch (e) {}
  var lista = [];
  var antes = typeof SGO_DATA_REP_VISIVEL === 'undefined' ? undefined : SGO_DATA_REP_VISIVEL;
  try { lista = SGO_DATA.getAll((typeof SGO_CFG !== 'undefined' && SGO_CFG.SHEETS && SGO_CFG.SHEETS.CAD_USUARIOS) || 'CAD_USUARIOS') || []; } catch (e) { lista = []; }
  if (antes !== undefined) SGO_DATA_REP_VISIVEL = antes;
  return lista.filter(function (u) { return SGO_SimCodigo_s_(u.USUARIO).toLowerCase() === login && SGO_SimCodigo_s_(u.STATUS || 'ATIVO').toUpperCase() === 'ATIVO'; })[0] || null;
}
function SGO_SimCodigo_celular_(u) {
  if (typeof SegAcesso_celular_ === 'function') return SegAcesso_celular_(u);
  var d = SGO_SimCodigo_s_(u && u.CELULAR).replace(/\D/g, '').replace(/^0+/, '');
  if (d.length === 10 || d.length === 11) d = '55' + d;
  return /^55\d{10,11}$/.test(d) ? d : '';
}

/** Registro (quem pediu, quando, liberado ou recusado). Nunca grava o código. Nunca lança. */
function SGO_SimCodigo_registrar_(evento, sessao, detalhe) {
  var quem = SGO_SimCodigo_s_(sessao && (sessao.nome || sessao.usuario)) + ' (' + SGO_SimCodigo_s_(sessao && sessao.perfil) + ')';
  try { if (typeof SegAcesso_registrar_ === 'function') SegAcesso_registrar_(evento, { USUARIO: sessao && sessao.usuario, ID: sessao && (sessao.userId || sessao.id), PERFIL: sessao && sessao.perfil }, {}, detalhe, ''); } catch (e) {}
  try { if (typeof SGO_DATA !== 'undefined' && SGO_DATA.log) SGO_DATA.log(evento, SGO_SimCodigo_s_(sessao && sessao.usuario), quem + ': ' + detalhe, 'SIMULADOR'); } catch (e2) {}
}

/** Aviso ao dono (quem pediu e quando). Nunca leva o código. Nunca lança. */
function SGO_SimCodigo_avisarDono_(dono, titulo, texto) {
  try {
    if (dono && typeof SGO_notificar_ === 'function') SGO_notificar_({ usuarios: [SGO_SimCodigo_s_(dono.ID)], titulo: titulo, texto: texto, canais: ['whatsapp', 'email'], origem: 'SIMULADOR_CODIGO', semLink: true });
  } catch (e) {}
}

function SGO_SimCodigo_enviarWhatsapp_(tel, codigo) {
  if (typeof SegAcesso_enviarWhatsapp_ !== 'function') return { ok: false, motivo: 'o envio de WhatsApp do sistema não está disponível' };
  try { return SegAcesso_enviarWhatsapp_(tel, codigo) || { ok: false, motivo: 'sem resposta do envio' }; } catch (e) { return { ok: false, motivo: SGO_SimCodigo_s_(e && e.message).slice(0, 160) }; }
}

/** A sessão já está liberada? → { liberado, ate } */
function SGO_SimCodigo_liberacao_(sessionId, sessao) {
  var l = SGO_SimCodigo_ler_(SGO_SimCodigo_chaveSessao_(sessionId));
  if (!l || l.ate <= SGO_SimCodigo_agora_()) return { liberado: false };
  var uid = SGO_SimCodigo_s_(sessao && (sessao.userId || sessao.id));
  if (l.userId && uid && l.userId !== uid) return { liberado: false };
  return { liberado: true, ate: l.ate, ateTexto: SGO_SimCodigo_hora_(l.ate) };
}

/** Despachos dos módulos: chamadas do simulador só com a sessão liberada pelo código do dono. */
function SGO_SimCodigo_ehChamadaSimulador_(fn, payload) {
  var f = SGO_SimCodigo_s_(fn), p = payload || {};
  if (f === 'apiValidarSenhaSimuladorAdmin' || f === 'apiSimQualificacao') return true;
  var modo = SGO_SimCodigo_s_(p.modoEntrada).toUpperCase();
  return modo === 'SIMULADO_ADMIN' || modo === 'LEAK_TEST_RECONSTITUIDO' || !!p.modoRelatorioSimulado;
}
function SGO_SimCodigo_exigirNaChamada_(sessionId, fn, payload) {
  if (!SGO_SimCodigo_ehChamadaSimulador_(fn, payload)) return;
  var sessao = exigirSessao(sessionId);
  if (!SGO_SimCodigo_podePedir_(sessao)) throw new Error(SGO_SIMCOD_PREFIXO_ERRO + 'o modo de dados reconstituídos é só do administrador e das pessoas autorizadas por ele.');
  if (!SGO_SimCodigo_liberacao_(sessionId, sessao).liberado) {
    throw new Error(SGO_SIMCOD_PREFIXO_ERRO + 'para abrir o modo de dados reconstituídos, peça o código de 6 dígitos que vai para o WhatsApp do dono e digite-o (vale 10 minutos; depois de liberado, vale 2 horas nesta sessão).');
  }
}

/* ---------------- Chamadas da tela (google.script.run) ---------------- */

function SGO_SimCodigo_resp_(fn) {
  try { return JSON.parse(JSON.stringify(fn())); } catch (e) { return { ok: false, erro: SGO_SimCodigo_s_(e && e.message) || String(e) }; }
}

/** Situação: pode pedir? já liberado? WhatsApp do dono pronto? */
function simuladorCodigoSituacao(sessionId) {
  return SGO_SimCodigo_resp_(function () {
    var sessao = exigirSessao(sessionId);
    var pode = SGO_SimCodigo_podePedir_(sessao), lib = SGO_SimCodigo_liberacao_(sessionId, sessao);
    var dono = SGO_SimCodigo_dono_();
    return { ok: true, podePedir: pode, liberado: lib.liberado, liberadoAte: lib.ateTexto || '', donoComCelular: !!(dono && SGO_SimCodigo_celular_(dono)) };
  });
}

/** Pede o código: vai para o WhatsApp do dono; o dono recebe também o aviso de quem pediu. */
function simuladorCodigoPedir(sessionId) {
  return SGO_SimCodigo_resp_(function () {
    var sessao = exigirSessao(sessionId);
    if (!SGO_SimCodigo_podePedir_(sessao)) {
      SGO_SimCodigo_registrar_('SIMULADOR_CODIGO_RECUSADO', sessao, 'pedido de pessoa sem autorização para o modo de dados reconstituídos');
      throw new Error('O modo de dados reconstituídos é só do administrador e das pessoas autorizadas por ele. Se você precisa usar, fale com o administrador.');
    }
    var lib = SGO_SimCodigo_liberacao_(sessionId, sessao);
    if (lib.liberado) return { ok: true, jaLiberado: true, mensagem: 'Esta sessão já está liberada até ' + lib.ateTexto + '.' };
    var uid = SGO_SimCodigo_s_(sessao.userId || sessao.id || sessao.usuario);
    var chave = SGO_SimCodigo_chavePedido_(uid), ant = SGO_SimCodigo_ler_(chave), agora = SGO_SimCodigo_agora_();
    if (ant && !ant.usado && ant.expira > agora && agora - ant.criadoEm < SGO_SIMCOD_ESPERA_REENVIO_MS) {
      throw new Error('O código acabou de ser enviado ao WhatsApp do dono. Espere 1 minuto antes de pedir outro; o código enviado vale até ' + SGO_SimCodigo_hora_(ant.expira).slice(11) + '.');
    }
    var dono = SGO_SimCodigo_dono_(), tel = dono ? SGO_SimCodigo_celular_(dono) : '';
    if (!dono || !tel) {
      SGO_SimCodigo_registrar_('SIMULADOR_CODIGO_SEM_WHATSAPP', sessao, !dono ? 'dono não encontrado no cadastro de usuários' : 'dono sem celular válido no cadastro');
      throw new Error('O código não pode ser enviado: ' + (!dono ? 'o usuário dono (admin) não foi encontrado no cadastro de usuários' : 'o dono (admin) não tem celular válido no cadastro de usuários') + '. O modo de dados reconstituídos continua fechado. O que fazer: o administrador confere o celular em Cadastros › Usuários.');
    }
    var codigo = SGO_SimCodigo_gerar_(), id = Utilities.getUuid();
    var envio = SGO_SimCodigo_enviarWhatsapp_(tel, codigo);
    if (!envio.ok) {
      SGO_SimCodigo_registrar_('SIMULADOR_CODIGO_SEM_WHATSAPP', sessao, 'WhatsApp não enviou: ' + SGO_SimCodigo_s_(envio.motivo).slice(0, 200));
      throw new Error('O código não pôde ser enviado pelo WhatsApp (' + SGO_SimCodigo_s_(envio.motivo) + '). O modo de dados reconstituídos continua fechado. O que fazer: o administrador confere o WhatsApp oficial em Chaves e senhas e tenta de novo.');
    }
    SGO_SimCodigo_gravar_(chave, { id: id, hash: SGO_SimCodigo_hash_(id + ':' + codigo), criadoEm: agora, expira: agora + SGO_SIMCOD_VALIDADE_MS, tentativas: 0, usado: false });
    SGO_SimCodigo_registrar_('SIMULADOR_CODIGO_PEDIDO', sessao, 'código enviado ao WhatsApp do dono (final ' + tel.slice(-4) + '), válido até ' + SGO_SimCodigo_hora_(agora + SGO_SIMCOD_VALIDADE_MS));
    SGO_SimCodigo_avisarDono_(dono, 'Pedido de código do modo de dados reconstituídos',
      SGO_SimCodigo_s_(sessao.nome || sessao.usuario) + ' (' + SGO_SimCodigo_s_(sessao.perfil) + ') pediu em ' + SGO_SimCodigo_hora_(agora) + ' o código para abrir o modo de dados reconstituídos (simulação didática). O código chegou em mensagem separada e vale 10 minutos. Se o pedido não foi combinado com você, não passe o código.');
    return { ok: true, mensagem: 'Código enviado ao WhatsApp do dono (celular com final ' + tel.slice(-4) + '). Peça o código a ele e digite aqui. Ele vale 10 minutos e só pode ser usado uma vez.' };
  });
}

/** Confere o código (no máximo 5 tentativas). Certo: libera esta sessão por 2 horas. */
function simuladorCodigoValidarSenhaCodigo(sessionId, codigo) {
  return SGO_SimCodigo_resp_(function () {
    var sessao = exigirSessao(sessionId);
    if (!SGO_SimCodigo_podePedir_(sessao)) throw new Error('O modo de dados reconstituídos é só do administrador e das pessoas autorizadas por ele.');
    var uid = SGO_SimCodigo_s_(sessao.userId || sessao.id || sessao.usuario);
    var chave = SGO_SimCodigo_chavePedido_(uid), p = SGO_SimCodigo_ler_(chave), agora = SGO_SimCodigo_agora_();
    if (!p || p.usado) throw new Error('Não há código pendente para você. Toque em "Pedir código ao dono" para receber um novo.');
    if (p.expira <= agora) { SGO_SimCodigo_apagar_(chave); SGO_SimCodigo_registrar_('SIMULADOR_CODIGO_RECUSADO', sessao, 'código vencido (10 minutos)'); throw new Error('O código venceu (vale 10 minutos). Peça um novo ao dono.'); }
    if (p.tentativas >= SGO_SIMCOD_MAX_TENTATIVAS) { SGO_SimCodigo_apagar_(chave); throw new Error('Tentativas esgotadas. Peça um novo código ao dono.'); }
    var digitado = SGO_SimCodigo_s_(codigo).replace(/\D/g, '');
    if (digitado.length !== 6 || SGO_SimCodigo_hash_(p.id + ':' + digitado) !== p.hash) {
      p.tentativas++;
      var restam = SGO_SIMCOD_MAX_TENTATIVAS - p.tentativas;
      if (restam <= 0) {
        SGO_SimCodigo_apagar_(chave);
        SGO_SimCodigo_registrar_('SIMULADOR_CODIGO_RECUSADO', sessao, 'código errado 5 vezes: pedido cancelado');
        SGO_SimCodigo_avisarDono_(SGO_SimCodigo_dono_(), 'Código do modo de dados reconstituídos recusado',
          SGO_SimCodigo_s_(sessao.nome || sessao.usuario) + ' errou o código 5 vezes em ' + SGO_SimCodigo_hora_(agora) + '. O pedido foi cancelado e o modo continua fechado.');
        throw new Error('Código errado pela 5ª vez. O pedido foi cancelado e o dono foi avisado. Para tentar de novo, peça um novo código.');
      }
      SGO_SimCodigo_gravar_(chave, p);
      SGO_SimCodigo_registrar_('SIMULADOR_CODIGO_RECUSADO', sessao, 'código errado (restam ' + restam + ' tentativas)');
      throw new Error('Código errado. Restam ' + restam + ' tentativa' + (restam === 1 ? '' : 's') + '.');
    }
    SGO_SimCodigo_apagar_(chave);
    var ate = agora + SGO_SIMCOD_SESSAO_MS;
    SGO_SimCodigo_gravar_(SGO_SimCodigo_chaveSessao_(sessionId), { userId: SGO_SimCodigo_s_(sessao.userId || sessao.id), ate: ate });
    SGO_SimCodigo_registrar_('SIMULADOR_CODIGO_LIBERADO', sessao, 'modo de dados reconstituídos liberado nesta sessão até ' + SGO_SimCodigo_hora_(ate));
    return { ok: true, liberadoAte: SGO_SimCodigo_hora_(ate), mensagem: 'Código conferido. O modo de dados reconstituídos está liberado nesta sessão até ' + SGO_SimCodigo_hora_(ate).slice(11) + '. A senha administrativa continua sendo pedida.' };
  });
}
