/****************************************************
 * MODO PERSONALIZADO — parâmetros dos geradores de documentos técnicos (21/10/2026)
 *
 * Componente comum a todos os geradores que têm parâmetros normativos ajustáveis
 * (hoje: Estufa, banho-maria e secadora). Substitui a senha única do modo
 * personalizado, que ficava guardada em texto (MODO_PERSONALIZADO_SENHA).
 *
 * Quem usa
 *  - Só os RESPONSÁVEIS TÉCNICOS designados pelo Administrador ou pelo responsável
 *    pelo sistema (SGO_DONOS), entre usuários ativos dos perfis de SGO_MP_CFG.PERFIS_ELEGIVEIS.
 *  - Além de estar na lista, o responsável entra com a SENHA PRÓPRIA do modo, criada por ele
 *    (guardada só como resumo SHA-256 com sal e 2.000 repetições; nunca em texto). Cinco
 *    senhas erradas bloqueiam a entrada por 15 minutos. A redefinição é só do Administrador.
 *  - O modo fica aberto por 30 minutos sem uso, preso à sessão de login em que a senha foi
 *    digitada; cada chamada renova o prazo.
 *  - Toda função do modo confere no servidor: sessão de login, responsável na lista, perfil
 *    habilitado e modo aberto (SGO_MP_exigirModo_). A tela só reflete o que o servidor libera.
 *
 * Ferramentas
 *  - Parâmetros: cada gerador declara os parâmetros ajustáveis com o valor de referência
 *    normativo, a fonte e a faixa permitida (SGO_MP_geradores_). O ajuste vale para um perfil
 *    de equipamento, para todos os clientes ou para um cliente, com justificativa obrigatória.
 *  - Diferenças do padrão: tudo o que está diferente da referência, lado a lado.
 *  - Restaurar o padrão: volta à referência (um parâmetro ou todos), também com justificativa.
 *  - Aprovação: o gerador aplica os valores (SGO_MP_aplicar_), o documento sai com a seção
 *    "Parâmetros personalizados" (SGO_MP_secaoDocumento_) e a emissão final exige um
 *    responsável técnico com o modo aberto (SGO_MP_exigirAprovacao_).
 *  - Auditoria: MODO_PERS_AUDITORIA, só inclusão, cada linha com o SHA-256 da anterior
 *    (conferência de integridade na tela). Nunca guarda senha.
 *
 * Guardado em
 *  - Propriedades do script: MODO_PERS_RESPONSAVEIS (lista), MODO_PERS_SENHA_<id> (resumo),
 *    MODO_PERS_TENTATIVAS_<id> (bloqueio) e MODO_PERS_SESSAO_<id> (modo aberto).
 *  - Abas do banco: MODO_PERS_PARAMETROS (valores em uso, uma linha por parâmetro) e
 *    MODO_PERS_AUDITORIA. Sem banco (testes), ficam na memória.
 *
 * Tela: JS_ModoPersonalizado.html (Qualificação e inspeção > Modo personalizado).
 * Ajuda: SGO_Ajuda_ModoPersonalizado.js (só para o responsável e o Administrador).
 ****************************************************/

var SGO_MP_CFG = {
  PROP_RESPONSAVEIS: 'MODO_PERS_RESPONSAVEIS',
  PROP_SENHA: 'MODO_PERS_SENHA_',
  PROP_TENTATIVAS: 'MODO_PERS_TENTATIVAS_',
  PROP_SESSAO: 'MODO_PERS_SESSAO_',
  PROP_SENHA_ANTIGA: 'MODO_PERSONALIZADO_SENHA',
  ABA_PARAMETROS: 'MODO_PERS_PARAMETROS',
  ABA_AUDITORIA: 'MODO_PERS_AUDITORIA',
  PERFIS_ELEGIVEIS: ['ADMIN', 'DIRETORIA', 'GESTOR', 'METROLOGIA'],
  TENTATIVAS_MAX: 5,
  BLOQUEIO_MIN: 15,
  SESSAO_MIN: 30,
  ITERACOES: 2000,
  SENHA_MIN: 8,
  JUSTIFICATIVA_MIN: 20,
  TZ: 'America/Sao_Paulo',
  CAMINHO_TELA: 'Qualificação e inspeção > Modo personalizado',
  CAMINHO_ADMIN: 'Administração > Configurações > Responsáveis técnicos do modo personalizado'
};
var SGO_MP_CAMPOS_PARAMETROS = ['CHAVE', 'GERADOR', 'PERFIL', 'CLIENTE_ID', 'CLIENTE', 'PARAMETRO', 'VALOR', 'VALOR_NORMATIVO', 'JUSTIFICATIVA',
  'USUARIO', 'NOME', 'ATUALIZADO_EM', 'ATIVO'];
var SGO_MP_CAMPOS_AUDITORIA = ['ID', 'EM', 'USUARIO', 'NOME', 'PERFIL_USUARIO', 'ACAO', 'GERADOR', 'PERFIL', 'CLIENTE_ID', 'CLIENTE', 'PARAMETRO',
  'ROTULO', 'VALOR_NORMATIVO', 'VALOR_ANTERIOR', 'VALOR_NOVO', 'MOTIVO', 'REFERENCIA', 'HASH_ANTERIOR', 'HASH'];
var SGO_MP_ACOES = {
  RESPONSAVEL_INCLUIDO: 'Responsável técnico incluído', RESPONSAVEL_REMOVIDO: 'Responsável técnico removido',
  SENHA_CRIADA: 'Senha criada', SENHA_TROCADA: 'Senha trocada', SENHA_REDEFINIDA: 'Senha apagada pelo Administrador',
  LINK_SENHA_ENVIADO: 'Link de senha nova enviado por e-mail', SENHA_REDEFINIDA_LINK: 'Senha apagada pelo link do e-mail',
  SENHA_ANTIGA_REMOVIDA: 'Senha única antiga apagada', DESBLOQUEIO: 'Entrada desbloqueada pelo Administrador',
  ENTRADA: 'Entrada no modo', ENTRADA_RECUSADA: 'Senha incorreta', BLOQUEIO: 'Entrada bloqueada (5 senhas erradas)', SAIDA: 'Saída do modo',
  ACESSO_RECUSADO: 'Acesso recusado', PARAMETRO_ALTERADO: 'Parâmetro ajustado', PARAMETRO_RESTAURADO: 'Padrão restaurado',
  DOCUMENTO_APROVADO: 'Documento com parâmetros personalizados aprovado'
};
var SGO_MP_MEMORIA_ = null; // só nos testes (sem banco)

/* ============================================================
 * Utilitários
 * ============================================================ */

function SGO_MP_s_(v) { return v === null || v === undefined ? '' : String(v).trim(); }
function SGO_MP_up_(v) { return SGO_MP_s_(v).toUpperCase(); }
function SGO_MP_agoraMs_() { return Date.now(); }
function SGO_MP_fmtData_(ms, formato) {
  try { return Utilities.formatDate(new Date(ms), SGO_MP_CFG.TZ, formato || 'dd/MM/yyyy HH:mm:ss'); } catch (e) { return new Date(ms).toISOString(); }
}
function SGO_MP_agoraTxt_() { return SGO_MP_fmtData_(SGO_MP_agoraMs_()); }
function SGO_MP_props_() { return PropertiesService.getScriptProperties(); }
function SGO_MP_lerJson_(chave, padrao) {
  try { var v = SGO_MP_props_().getProperty(chave); return v ? JSON.parse(v) : padrao; } catch (e) { return padrao; }
}
function SGO_MP_gravarJson_(chave, valor) { SGO_MP_props_().setProperty(chave, JSON.stringify(valor)); }
function SGO_MP_apagar_(chave) { try { SGO_MP_props_().deleteProperty(chave); } catch (e) {} }

/** SHA-256 em hexadecimal (texto UTF-8). */
function SGO_MP_hex_(texto) {
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(texto), Utilities.Charset.UTF_8);
  return bytes.map(function (b) { var v = b < 0 ? b + 256 : b; return (v < 16 ? '0' : '') + v.toString(16); }).join('');
}

/** Número digitado (aceita vírgula). Vazio ou inválido = null. */
function SGO_MP_num_(v) {
  if (v === null || v === undefined || String(v).trim() === '') return null;
  if (typeof v === 'number') return isFinite(v) ? v : null;
  var s = String(v).trim().replace(/\s/g, '').replace(',', '.');
  if (!/^[+-]?(\d+(\.\d*)?|\.\d+)$/.test(s)) return null;
  return Number(s);
}

/** Número em português (vírgula), sem zeros sobrando, com a unidade. */
function SGO_MP_fmt_(v, unidade, casas) {
  if (v === null || v === undefined || v === '' || !isFinite(Number(v))) return '—';
  var p = Math.pow(10, casas === undefined ? 3 : casas);
  var t = String(Math.round(Number(v) * p) / p).replace('.', ',');
  return t + (unidade ? ' ' + unidade : '');
}

function SGO_MP_resposta_(fn) {
  try {
    var r = fn();
    return JSON.parse(JSON.stringify(Object.assign({ ok: true }, r || {})));
  } catch (e) {
    return { ok: false, message: String((e && e.message) || e) };
  }
}

/* ============================================================
 * Abas (valores em uso e auditoria). Sem banco: memória.
 * ============================================================ */

function SGO_MP_aba_(nome, campos) {
  if (typeof SGO_DATA === 'undefined' || !SGO_DATA || typeof SGO_DATA.getDB !== 'function') return null;
  var ss = SGO_DATA.getDB();
  var aba = ss.getSheetByName(nome);
  if (!aba) {
    aba = ss.insertSheet(nome);
    var cab = aba.getRange(1, 1, 1, campos.length);
    cab.setNumberFormat('@');
    cab.setValues([campos]);
  } else {
    var ultCol = aba.getLastColumn();
    var atual = ultCol ? aba.getRange(1, 1, 1, ultCol).getValues()[0].map(String) : [];
    var faltam = campos.filter(function (c) { return atual.indexOf(c) < 0; });
    if (faltam.length) aba.getRange(1, ultCol + 1, 1, faltam.length).setValues([faltam]);
  }
  return aba;
}

function SGO_MP_celula_(v) {
  if (v === null || v === undefined) return '';
  if (v instanceof Date || (v && typeof v.getTime === 'function' && typeof v.getFullYear === 'function')) return SGO_MP_fmtData_(v.getTime());
  return String(v);
}

function SGO_MP_ler_(nome, campos) {
  var aba = SGO_MP_aba_(nome, campos);
  if (!aba) {
    SGO_MP_MEMORIA_ = SGO_MP_MEMORIA_ || {};
    return (SGO_MP_MEMORIA_[nome] || []).map(function (r, i) { return Object.assign({ _linha: i }, r); });
  }
  var ult = aba.getLastRow();
  if (ult < 2) return [];
  var cab = aba.getRange(1, 1, 1, aba.getLastColumn()).getValues()[0].map(String);
  return aba.getRange(2, 1, ult - 1, cab.length).getValues().map(function (l, i) {
    var o = { _linha: i + 2 };
    cab.forEach(function (c, k) { o[c] = SGO_MP_celula_(l[k]); });
    return o;
  });
}

/** Grava uma linha nova como texto (o número e a data não viram outro formato na planilha). */
function SGO_MP_incluirLinha_(nome, campos, reg) {
  var aba = SGO_MP_aba_(nome, campos);
  var linha = {};
  campos.forEach(function (c) { linha[c] = reg[c] === undefined || reg[c] === null ? '' : String(reg[c]); });
  if (!aba) {
    SGO_MP_MEMORIA_ = SGO_MP_MEMORIA_ || {};
    (SGO_MP_MEMORIA_[nome] = SGO_MP_MEMORIA_[nome] || []).push(linha);
    return;
  }
  var cab = aba.getRange(1, 1, 1, aba.getLastColumn()).getValues()[0].map(String);
  var prox = aba.getLastRow() + 1;
  if (typeof aba.getMaxRows === 'function' && prox > aba.getMaxRows()) aba.insertRowsAfter(aba.getMaxRows(), 100);
  var r = aba.getRange(prox, 1, 1, cab.length);
  r.setNumberFormat('@');
  r.setValues([cab.map(function (c) { return linha[c] === undefined ? '' : linha[c]; })]);
}

function SGO_MP_atualizarLinha_(nome, campos, atual, novos) {
  var aba = SGO_MP_aba_(nome, campos);
  if (!aba) {
    var m = SGO_MP_MEMORIA_[nome][atual._linha];
    Object.keys(novos).forEach(function (k) { m[k] = String(novos[k]); });
    return;
  }
  var cab = aba.getRange(1, 1, 1, aba.getLastColumn()).getValues()[0].map(String);
  var valores = cab.map(function (c) { return novos[c] !== undefined ? String(novos[c]) : (atual[c] === undefined ? '' : String(atual[c])); });
  var r = aba.getRange(atual._linha, 1, 1, cab.length);
  r.setNumberFormat('@');
  r.setValues([valores]);
}

function SGO_MP_trava_(fn) {
  var lock = null;
  try { lock = LockService.getScriptLock(); lock.waitLock(20000); } catch (e) { lock = null; }
  try { return fn(); } finally { if (lock) { try { lock.releaseLock(); } catch (e2) {} } }
}

/* ============================================================
 * Auditoria (só inclusão, encadeada por SHA-256)
 * ============================================================ */

function SGO_MP_hashLinha_(reg) {
  return SGO_MP_hex_(SGO_MP_CAMPOS_AUDITORIA.filter(function (c) { return c !== 'HASH'; }).map(function (c) { return c + '=' + SGO_MP_s_(reg[c]); }).join('|'));
}

/** eu = { usuario, nome, perfil } (ou null para a rotina). dados = campos da auditoria. */
function SGO_MP_auditar_(eu, acao, dados) {
  dados = dados || {};
  SGO_MP_trava_(function () {
    var linhas = SGO_MP_ler_(SGO_MP_CFG.ABA_AUDITORIA, SGO_MP_CAMPOS_AUDITORIA);
    var anterior = linhas.length ? SGO_MP_s_(linhas[linhas.length - 1].HASH) : '';
    var reg = Object.assign({}, dados, {
      ID: 'MPA-' + Utilities.getUuid().replace(/-/g, '').slice(0, 10).toUpperCase(),
      EM: SGO_MP_agoraTxt_(), USUARIO: eu ? eu.usuario : 'sistema', NOME: eu ? eu.nome : 'Sistema', PERFIL_USUARIO: eu ? eu.perfil : '',
      ACAO: acao, HASH_ANTERIOR: anterior
    });
    SGO_MP_CAMPOS_AUDITORIA.forEach(function (c) { reg[c] = SGO_MP_s_(reg[c]).slice(0, 2000); });
    reg.HASH = SGO_MP_hashLinha_(reg);
    SGO_MP_incluirLinha_(SGO_MP_CFG.ABA_AUDITORIA, SGO_MP_CAMPOS_AUDITORIA, reg);
  });
  try { if (typeof SGO_DATA !== 'undefined' && SGO_DATA.log) SGO_DATA.log('MODO_PERS_' + acao, eu ? eu.usuario : 'sistema', SGO_MP_ACOES[acao] || acao, 'MODO_PERSONALIZADO'); } catch (e) {}
}

/** Confere a corrente inteira. { ok, total, problemas:[texto] } */
function SGO_MP_conferirAuditoria_() {
  var linhas = SGO_MP_ler_(SGO_MP_CFG.ABA_AUDITORIA, SGO_MP_CAMPOS_AUDITORIA);
  var problemas = [], anterior = '';
  linhas.forEach(function (l, i) {
    if (SGO_MP_s_(l.HASH_ANTERIOR) !== anterior) problemas.push('Linha ' + (i + 1) + ' (' + l.EM + '): não está ligada à linha anterior (linha apagada ou fora de ordem).');
    if (SGO_MP_hashLinha_(l) !== SGO_MP_s_(l.HASH)) problemas.push('Linha ' + (i + 1) + ' (' + l.EM + '): o conteúdo foi alterado depois de gravado.');
    anterior = SGO_MP_s_(l.HASH);
  });
  return { ok: !problemas.length, total: linhas.length, problemas: problemas.slice(0, 20) };
}

/* ============================================================
 * Sessão, responsáveis, senha e modo aberto
 * ============================================================ */

function SGO_MP_sessao_(sessionId) {
  var s = exigirSessao(String(sessionId || ''));
  return { sessionId: String(sessionId || ''), userId: SGO_MP_s_(s.userId), usuario: SGO_MP_s_(s.usuario), nome: SGO_MP_s_(s.nome) || SGO_MP_s_(s.usuario), perfil: SGO_MP_up_(s.perfil) };
}

/** Sessão já validada pelo módulo (objeto da sessão de login). */
function SGO_MP_euDe_(sessao) {
  sessao = sessao || {};
  return { sessionId: SGO_MP_s_(sessao.sessionId), userId: SGO_MP_s_(sessao.userId), usuario: SGO_MP_s_(sessao.usuario), nome: SGO_MP_s_(sessao.nome) || SGO_MP_s_(sessao.usuario), perfil: SGO_MP_up_(sessao.perfil) };
}

/** Administrador do sistema ou responsável pelo sistema (Chaves e senhas). */
function SGO_MP_ehAdmin_(eu) {
  if (!eu) return false;
  if (eu.perfil === 'ADMIN') return true;
  try { return typeof Chaves_ehDonoUsuario_ === 'function' && Chaves_ehDonoUsuario_(eu.usuario); } catch (e) { return false; }
}

function SGO_MP_responsaveis_() {
  var l = SGO_MP_lerJson_(SGO_MP_CFG.PROP_RESPONSAVEIS, []);
  return Array.isArray(l) ? l.filter(function (r) { return r && r.userId; }) : [];
}

function SGO_MP_ehResponsavel_(eu) {
  if (!eu || !eu.userId || SGO_MP_CFG.PERFIS_ELEGIVEIS.indexOf(eu.perfil) < 0) return false;
  return SGO_MP_responsaveis_().some(function (r) { return String(r.userId) === eu.userId; });
}

function SGO_MP_temSenha_(userId) { return !!SGO_MP_lerJson_(SGO_MP_CFG.PROP_SENHA + userId, null); }

function SGO_MP_tentativas_(userId) { return SGO_MP_lerJson_(SGO_MP_CFG.PROP_TENTATIVAS + userId, { n: 0, ate: 0 }) || { n: 0, ate: 0 }; }

function SGO_MP_bloqueadoAte_(userId) {
  var t = SGO_MP_tentativas_(userId);
  return t.ate && t.ate > SGO_MP_agoraMs_() ? t.ate : 0;
}

function SGO_MP_derivar_(senha, sal, iteracoes) {
  var h = SGO_MP_hex_(sal + '|' + senha);
  for (var i = 1; i < iteracoes; i++) h = SGO_MP_hex_(h + '|' + sal);
  return h;
}

function SGO_MP_senhaConfere_(userId, senha) {
  var g = SGO_MP_lerJson_(SGO_MP_CFG.PROP_SENHA + userId, null);
  if (!g || !g.sal || !g.hash) return false;
  var calc = SGO_MP_derivar_(String(senha || ''), g.sal, Number(g.it) || SGO_MP_CFG.ITERACOES);
  var dif = calc.length ^ String(g.hash).length;
  for (var i = 0; i < calc.length && i < g.hash.length; i++) dif |= calc.charCodeAt(i) ^ g.hash.charCodeAt(i);
  return dif === 0;
}

function SGO_MP_gravarSenha_(userId, senha) {
  var sal = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '').slice(0, 8);
  SGO_MP_gravarJson_(SGO_MP_CFG.PROP_SENHA + userId, { v: 1, alg: 'SHA-256', it: SGO_MP_CFG.ITERACOES, sal: sal, hash: SGO_MP_derivar_(senha, sal, SGO_MP_CFG.ITERACOES), em: SGO_MP_agoraTxt_() });
}

/** Regras da senha nova. Lança o que corrigir. */
function SGO_MP_validarSenhaNova_(eu, nova, confirmar) {
  var s = String(nova === null || nova === undefined ? '' : nova);
  if (s.length < SGO_MP_CFG.SENHA_MIN) throw new Error('A senha precisa ter pelo menos ' + SGO_MP_CFG.SENHA_MIN + ' caracteres, com letras e números. Digite outra e confirme.');
  if (s.length > 128) throw new Error('A senha pode ter no máximo 128 caracteres.');
  if (!/[A-Za-zÀ-ÿ]/.test(s) || !/\d/.test(s)) throw new Error('A senha precisa ter letras e números. Digite outra e confirme.');
  if (eu.usuario && s.toLowerCase().indexOf(eu.usuario.toLowerCase()) >= 0) throw new Error('A senha não pode conter o seu login. Digite outra e confirme.');
  if (String(confirmar === null || confirmar === undefined ? '' : confirmar) !== s) throw new Error('A confirmação não é igual à senha. Digite as duas de novo.');
  return s;
}

function SGO_MP_chaveSid_(sessionId) { return SGO_MP_hex_('sid|' + sessionId).slice(0, 40); }

/** Situação do modo aberto do usuário: { aberto, expiraMs }. renovar = estende o prazo. */
function SGO_MP_modoAberto_(eu, renovar) {
  if (!eu || !eu.userId || !eu.sessionId) return { aberto: false, expiraMs: 0 };
  var s = SGO_MP_lerJson_(SGO_MP_CFG.PROP_SESSAO + eu.userId, null);
  if (!s || s.sid !== SGO_MP_chaveSid_(eu.sessionId)) return { aberto: false, expiraMs: 0 };
  var agora = SGO_MP_agoraMs_(), limite = SGO_MP_CFG.SESSAO_MIN * 60000;
  if (!(Number(s.uso) > 0) || agora - Number(s.uso) > limite) {
    SGO_MP_apagar_(SGO_MP_CFG.PROP_SESSAO + eu.userId);
    return { aberto: false, expiraMs: 0, venceu: true };
  }
  if (renovar) { s.uso = agora; SGO_MP_gravarJson_(SGO_MP_CFG.PROP_SESSAO + eu.userId, s); }
  return { aberto: true, expiraMs: Number(s.uso) + limite };
}

var SGO_MP_MSG_NAO_RESPONSAVEL = 'Não foi possível abrir: o modo personalizado é exclusivo dos responsáveis técnicos designados pelo Administrador. ' +
  'Se você deveria ter acesso, peça ao Administrador para incluir o seu usuário em ' + SGO_MP_CFG.CAMINHO_ADMIN + '.';

/** Sessão de login + responsável na lista (sem exigir o modo aberto). */
function SGO_MP_exigirResponsavel_(sessionId) {
  var eu = SGO_MP_sessao_(sessionId);
  if (!SGO_MP_ehResponsavel_(eu)) {
    SGO_MP_auditar_(eu, 'ACESSO_RECUSADO', { MOTIVO: 'Usuário fora da lista de responsáveis técnicos ou com perfil não habilitado.' });
    throw new Error(SGO_MP_MSG_NAO_RESPONSAVEL);
  }
  return eu;
}

/** Sessão + responsável + senha já digitada nesta sessão há menos de 30 minutos sem uso. Renova o prazo. */
function SGO_MP_exigirModo_(sessionId) {
  var eu = SGO_MP_exigirResponsavel_(sessionId);
  if (!SGO_MP_temSenha_(eu.userId)) throw new Error('Você ainda não tem a senha do modo personalizado. Crie a sua em ' + SGO_MP_CFG.CAMINHO_TELA + ' > Criar minha senha.');
  var m = SGO_MP_modoAberto_(eu, true);
  if (!m.aberto) throw new Error('O modo personalizado está fechado' + (m.venceu ? ' (fecha sozinho depois de ' + SGO_MP_CFG.SESSAO_MIN + ' minutos sem uso)' : '') + '. Entre de novo com a sua senha em ' + SGO_MP_CFG.CAMINHO_TELA + '. Nada foi alterado.');
  eu.expiraMs = m.expiraMs;
  return eu;
}

function SGO_MP_exigirAdmin_(sessionId) {
  var eu = SGO_MP_sessao_(sessionId);
  if (!SGO_MP_ehAdmin_(eu)) {
    SGO_MP_auditar_(eu, 'ACESSO_RECUSADO', { MOTIVO: 'Tentativa de designar responsáveis ou redefinir senha sem ser Administrador.' });
    throw new Error('Não foi possível concluir: designar os responsáveis técnicos do modo personalizado, apagar a senha e desbloquear são do Administrador do sistema.');
  }
  return eu;
}

/** A senha única antiga (texto, em Chaves e senhas) sai na primeira vez que o modo novo é usado. */
function SGO_MP_migrarSenhaAntiga_() {
  try {
    var p = SGO_MP_props_();
    if (p.getProperty(SGO_MP_CFG.PROP_SENHA_ANTIGA) === null) return false;
    p.deleteProperty(SGO_MP_CFG.PROP_SENHA_ANTIGA);
    try { p.deleteProperty('CHV_ALTERADO_' + SGO_MP_CFG.PROP_SENHA_ANTIGA); } catch (e) {}
    SGO_MP_auditar_(null, 'SENHA_ANTIGA_REMOVIDA', { MOTIVO: 'A senha única do modo personalizado, guardada em texto, foi apagada. Cada responsável técnico designado cria a própria senha.' });
    return true;
  } catch (e) { return false; }
}

/* ============================================================
 * Geradores e parâmetros
 * ============================================================ */

/**
 * Definição de cada gerador: { codigo, rotulo, tela, perfis:[{chave, rotulo}], parametros(perfil) -> [
 *   { chave, rotulo, unidade, inteiro, casas, normativo, fonte, min, max, caminho:['a','b'], campoFonte } ] }.
 * Só entra o gerador que aplica os valores no cálculo (SGO_MP_aplicar_ chamado no motor).
 */
function SGO_MP_geradores_() {
  var g = {};
  if (typeof ESTUFAQ_CFG !== 'undefined') g.ESTUFA = SGO_MP_defEstufa_();
  return g;
}

function SGO_MP_defEstufa_() {
  var rotulos = {};
  try { Object.keys(EstufaBanhoRel_EBCFG.PERFIS || {}).forEach(function (k) { rotulos[k] = EstufaBanhoRel_EBCFG.PERFIS[k].label; }); } catch (e) {}
  var nomesGrupo = { DISTRIBUICAO: 'distribuição', EVENTO: 'abertura de porta e queda de energia', PENETRACAO: 'penetração com carga' };
  return {
    codigo: 'ESTUFA', rotulo: 'Estufa, banho-maria e secadora', tela: 'estufa_banhomaria', modulosEmissao: ['ESTUFA', 'ESTUFA_DADOS'],
    perfis: Object.keys(ESTUFAQ_CFG.PERFIS).map(function (k) { return { chave: k, rotulo: rotulos[k] || k }; }),
    parametros: function (perfil) {
      var c = ESTUFAQ_CFG.PERFIS[perfil];
      if (!c) return [];
      var out = [];
      if (c.sensoresMinimos) {
        out.push({ chave: 'sensoresMinimos', rotulo: 'Mínimo de sensores', unidade: 'sensores', inteiro: true, normativo: c.sensoresMinimos, fonte: c.fonteSensores,
          min: Math.max(1, Math.ceil(c.sensoresMinimos / 2)), max: 60, caminho: ['sensoresMinimos'], campoFonte: 'fonteSensores' });
      }
      if (c.duracaoMinimaHoras) {
        out.push({ chave: 'duracaoMinimaHoras', rotulo: 'Duração mínima da distribuição', unidade: 'h', inteiro: false, casas: 2, normativo: c.duracaoMinimaHoras, fonte: c.fonteDuracao,
          min: 1, max: 72, caminho: ['duracaoMinimaHoras'], campoFonte: 'fonteDuracao' });
      }
      Object.keys(c.intervaloMaxSeg || {}).forEach(function (grupo) {
        out.push({ chave: 'intervaloMaxSeg.' + grupo, rotulo: 'Intervalo máximo de registro (' + (nomesGrupo[grupo] || grupo.toLowerCase()) + ')', unidade: 's', inteiro: true,
          normativo: c.intervaloMaxSeg[grupo], fonte: c.fonteIntervalo, min: 1, max: 300, caminho: ['intervaloMaxSeg', grupo], campoFonte: 'fonteIntervalo' });
      });
      return out;
    }
  };
}

function SGO_MP_gerador_(codigo) {
  var d = SGO_MP_geradores_()[SGO_MP_up_(codigo)];
  if (!d) throw new Error('Gerador não encontrado. Escolha um gerador da lista e tente de novo.');
  return d;
}

function SGO_MP_param_(def, perfil, chave) {
  if (!def.perfis.some(function (p) { return p.chave === perfil; })) throw new Error('Equipamento não encontrado neste gerador. Escolha o equipamento na lista.');
  var p = def.parametros(perfil).filter(function (x) { return x.chave === chave; })[0];
  if (!p) throw new Error('Parâmetro não encontrado para este equipamento. Atualize a tela e tente de novo.');
  return p;
}

function SGO_MP_faixaTxt_(p) { return SGO_MP_fmt_(p.min, '', p.casas) + ' a ' + SGO_MP_fmt_(p.max, p.unidade, p.casas); }

function SGO_MP_chaveLinha_(gerador, perfil, clienteId, parametro) { return [gerador, perfil, clienteId || '*', parametro].join('|'); }

function SGO_MP_linhasAtivas_() {
  return SGO_MP_ler_(SGO_MP_CFG.ABA_PARAMETROS, SGO_MP_CAMPOS_PARAMETROS).filter(function (l) { return l.ATIVO === 'SIM'; });
}

function SGO_MP_nomeCliente_(clienteId) {
  if (!clienteId) return '';
  var c = null;
  try { c = SGO_DATA.getById((typeof SGO_CFG !== 'undefined' && SGO_CFG.SHEETS && SGO_CFG.SHEETS.CAD_CLIENTES) || 'CAD_CLIENTES', clienteId); } catch (e) { c = null; }
  if (!c) throw new Error('Cliente não encontrado no cadastro. Escolha o cliente na lista ou deixe "Todos os clientes".');
  return SGO_MP_s_(c.NOME_FANTASIA) || SGO_MP_s_(c.RAZAO_SOCIAL) || clienteId;
}

/** Valor em uso para (gerador, perfil, cliente): o do cliente; senão o de todos os clientes; senão o padrão. */
function SGO_MP_valorEmUso_(linhas, gerador, perfil, clienteId, p) {
  var proprio = clienteId ? linhas.filter(function (l) { return l.GERADOR === gerador && l.PERFIL === perfil && l.CLIENTE_ID === clienteId && l.PARAMETRO === p.chave; })[0] : null;
  var geral = linhas.filter(function (l) { return l.GERADOR === gerador && l.PERFIL === perfil && !l.CLIENTE_ID && l.PARAMETRO === p.chave; })[0];
  var l = proprio || geral || null;
  if (!l) return null;
  var v = SGO_MP_num_(l.VALOR);
  // Valor fora da faixa permitida atual (a faixa mudou depois do ajuste) não é aplicado: vale o padrão.
  if (v === null || v < p.min || v > p.max || (p.inteiro && Math.round(v) !== v) || v === Number(p.normativo)) return null;
  return { linha: l, valor: v, deCliente: !!proprio };
}

/**
 * Aplicado pelo motor do gerador. Devolve { cfg: cópia de cfgBase com os valores personalizados,
 * personalizados: [...] } (lista vazia = documento só com a referência normativa).
 */
function SGO_MP_aplicar_(gerador, perfil, clienteId, cfgBase) {
  var vazio = { cfg: cfgBase, personalizados: [] };
  var def = SGO_MP_geradores_()[SGO_MP_up_(gerador)];
  if (!def) return vazio;
  var params = def.parametros(perfil);
  if (!params.length) return vazio;
  var linhas = SGO_MP_linhasAtivas_();
  if (!linhas.length) return vazio;
  var cfg = JSON.parse(JSON.stringify(cfgBase || {}));
  var lista = [];
  params.forEach(function (p) {
    var u = SGO_MP_valorEmUso_(linhas, def.codigo, perfil, SGO_MP_s_(clienteId), p);
    if (!u) return;
    var alvo = cfg;
    for (var i = 0; i < p.caminho.length - 1; i++) { alvo[p.caminho[i]] = alvo[p.caminho[i]] || {}; alvo = alvo[p.caminho[i]]; }
    alvo[p.caminho[p.caminho.length - 1]] = u.valor;
    if (p.campoFonte) cfg[p.campoFonte] = SGO_MP_s_(p.fonte).replace(/, com parâmetro personalizado.*$/, '') + ', com parâmetro personalizado pelo responsável técnico (ver "Parâmetros personalizados")';
    lista.push({
      gerador: def.codigo, perfil: perfil, parametro: p.chave, rotulo: p.rotulo, unidade: p.unidade,
      normativo: Number(p.normativo), normativoTxt: SGO_MP_fmt_(p.normativo, p.unidade, p.casas), fonte: SGO_MP_s_(p.fonte),
      usado: u.valor, usadoTxt: SGO_MP_fmt_(u.valor, p.unidade, p.casas),
      escopo: u.deCliente ? 'Cliente ' + (u.linha.CLIENTE || u.linha.CLIENTE_ID) : 'Todos os clientes',
      justificativa: u.linha.JUSTIFICATIVA, responsavel: u.linha.NOME, em: u.linha.ATUALIZADO_EM
    });
  });
  return lista.length ? { cfg: cfg, personalizados: lista } : vazio;
}

/** Resumo de uma linha: "Mínimo de sensores: 9 sensores (referência 12 sensores)". */
function SGO_MP_resumo_(personalizados) {
  return (personalizados || []).map(function (x) { return x.rotulo + ': ' + x.usadoTxt + ' (referência ' + x.normativoTxt + ')'; }).join('; ');
}

/* ============================================================
 * Aprovação e documento
 * ============================================================ */

/** A sessão pode aprovar um documento com parâmetros personalizados? (responsável com o modo aberto) */
function SGO_MP_podeAprovar_(sessao) {
  var eu = SGO_MP_euDe_(sessao);
  return SGO_MP_ehResponsavel_(eu) && SGO_MP_modoAberto_(eu, false).aberto;
}

/**
 * Chamado na emissão final pelo gerador. Sem parâmetro personalizado: não faz nada.
 * Com: exige responsável técnico do modo, com o modo aberto nesta sessão (renova o prazo).
 */
function SGO_MP_exigirAprovacao_(personalizados, sessao) {
  if (!personalizados || !personalizados.length) return;
  var eu = SGO_MP_euDe_(sessao);
  var ehResp = SGO_MP_ehResponsavel_(eu);
  var m = ehResp ? SGO_MP_modoAberto_(eu, true) : { aberto: false };
  if (ehResp && m.aberto) return;
  throw new Error('O documento não foi emitido: ele usa parâmetros personalizados (' + SGO_MP_resumo_(personalizados) + ') e a emissão final precisa da aprovação de um responsável técnico do modo personalizado, com o modo aberto. ' +
    (ehResp ? 'O que fazer: abra ' + SGO_MP_CFG.CAMINHO_TELA + ', entre com a sua senha e volte aqui para aprovar de novo (o documento continua aguardando).'
      : 'O que fazer: envie para aprovação; um responsável técnico abre ' + SGO_MP_CFG.CAMINHO_TELA + ', entra com a senha dele e aprova em "Aguardando aprovação". Para emitir só com a referência normativa, o responsável restaura o padrão e o rascunho é gerado de novo.'));
}

/** Registra na auditoria a aprovação de um documento com parâmetros personalizados (depois da emissão). */
function SGO_MP_registrarAprovacao_(personalizados, sessao, referencia) {
  if (!personalizados || !personalizados.length) return;
  var p0 = personalizados[0];
  SGO_MP_auditar_(SGO_MP_euDe_(sessao), 'DOCUMENTO_APROVADO', { GERADOR: p0.gerador, PERFIL: p0.perfil, REFERENCIA: referencia, MOTIVO: SGO_MP_resumo_(personalizados) });
}

/**
 * Seção do documento A4. titulo: ex. '4.4 Parâmetros personalizados'. aprovacao: { nome, em } na emissão;
 * minuta = true na prévia (aguardando aprovação).
 */
function SGO_MP_secaoDocumento_(personalizados, titulo, aprovacao, minuta) {
  if (!personalizados || !personalizados.length || typeof SGO_DocA4_tabela_ !== 'function') return '';
  var esc = SGO_DocA4_esc_;
  var h = ['<div class="manter"><h3>' + esc(titulo || 'Parâmetros personalizados') + '</h3>'];
  h.push('<p>Este ensaio foi avaliado com parâmetros diferentes do valor de referência, definidos pelo responsável técnico da empresa executante com a justificativa registrada abaixo. Os demais critérios seguem a referência indicada no documento.</p>');
  h.push(SGO_DocA4_tabela_([{ t: 'Parâmetro' }, { t: 'Valor de referência' }, { t: 'Valor usado' }, { t: 'Justificativa' }, { t: 'Definido por' }],
    personalizados.map(function (x) {
      return [x.rotulo, x.normativoTxt + (x.fonte ? ' (' + x.fonte + ')' : ''), x.usadoTxt + (x.escopo && x.escopo !== 'Todos os clientes' ? ' (ajuste para este cliente)' : ''), x.justificativa, (x.responsavel || '—') + (x.em ? ', ' + String(x.em).slice(0, 10) : '')];
    }), { classe: 'compacta' }));
  if (aprovacao && aprovacao.nome) h.push('<p><b>Parâmetros personalizados aprovados para emissão por</b> ' + esc(aprovacao.nome) + ', responsável técnico, em ' + esc(aprovacao.em || '') + ', com registro no sistema.</p>');
  else if (minuta) h.push('<p><b>Aguardando a aprovação do responsável técnico para os parâmetros personalizados.</b></p>');
  h.push('</div>');
  return h.join('');
}

/** Para a ajuda: o responsável técnico (sem exigir o modo aberto) e o Administrador veem a ajuda da tela. */
function SGO_MP_ajudaLiberada_(sessionId) {
  try { var eu = SGO_MP_sessao_(sessionId); return SGO_MP_ehAdmin_(eu) || SGO_MP_ehResponsavel_(eu); } catch (e) { return false; }
}

/* ============================================================
 * Telas: listas
 * ============================================================ */

function SGO_MP_situacao_(eu) {
  var resp = SGO_MP_ehResponsavel_(eu);
  var r = { responsavel: resp, podeDesignar: SGO_MP_ehAdmin_(eu), nome: eu.nome, minutosSessao: SGO_MP_CFG.SESSAO_MIN, tentativasMax: SGO_MP_CFG.TENTATIVAS_MAX, caminhoAdmin: SGO_MP_CFG.CAMINHO_ADMIN };
  if (!resp) return r;
  r.temSenha = SGO_MP_temSenha_(eu.userId);
  var ate = SGO_MP_bloqueadoAte_(eu.userId);
  r.bloqueado = !!ate;
  r.bloqueadoAte = ate ? SGO_MP_fmtData_(ate, 'HH:mm') : '';
  var t = SGO_MP_tentativas_(eu.userId);
  r.tentativasRestantes = Math.max(0, SGO_MP_CFG.TENTATIVAS_MAX - (Number(t.n) || 0));
  var m = SGO_MP_modoAberto_(eu, false);
  r.aberto = m.aberto;
  r.expiraEm = m.aberto ? SGO_MP_fmtData_(m.expiraMs, 'HH:mm') : '';
  r.geradores = m.aberto ? SGO_MP_listaGeradores_() : [];
  return r;
}

function SGO_MP_listaGeradores_() {
  var g = SGO_MP_geradores_();
  return Object.keys(g).map(function (k) { return { codigo: k, rotulo: g[k].rotulo, perfis: g[k].perfis.filter(function (p) { return g[k].parametros(p.chave).length; }) }; });
}

function SGO_MP_tabelaParametros_(gerador, perfil, clienteId) {
  var def = SGO_MP_gerador_(gerador);
  if (!def.perfis.some(function (p) { return p.chave === perfil; })) throw new Error('Escolha o equipamento na lista.');
  var cli = SGO_MP_s_(clienteId);
  var nomeCli = cli ? SGO_MP_nomeCliente_(cli) : '';
  var linhas = SGO_MP_linhasAtivas_();
  var itens = def.parametros(perfil).map(function (p) {
    var u = SGO_MP_valorEmUso_(linhas, def.codigo, perfil, cli, p);
    var desteEscopo = linhas.filter(function (l) { return l.CHAVE === SGO_MP_chaveLinha_(def.codigo, perfil, cli, p.chave); })[0];
    return {
      chave: p.chave, rotulo: p.rotulo, unidade: p.unidade, inteiro: !!p.inteiro, min: p.min, max: p.max, faixaTxt: SGO_MP_faixaTxt_(p),
      normativo: p.normativo, normativoTxt: SGO_MP_fmt_(p.normativo, p.unidade, p.casas), fonte: SGO_MP_s_(p.fonte),
      emUso: u ? u.valor : p.normativo, emUsoTxt: SGO_MP_fmt_(u ? u.valor : p.normativo, p.unidade, p.casas),
      personalizado: !!u, origem: u ? (u.deCliente ? 'Ajuste deste cliente' : 'Ajuste para todos os clientes') : 'Referência normativa',
      ajusteDesteEscopo: !!desteEscopo,
      justificativa: u ? u.linha.JUSTIFICATIVA : '', por: u ? u.linha.NOME : '', em: u ? u.linha.ATUALIZADO_EM : ''
    };
  });
  return { gerador: def.codigo, geradorRotulo: def.rotulo, perfil: perfil, perfilRotulo: (def.perfis.filter(function (p) { return p.chave === perfil; })[0] || {}).rotulo, clienteId: cli, cliente: nomeCli, itens: itens };
}

function SGO_MP_diferencas_() {
  var g = SGO_MP_geradores_();
  var out = [];
  SGO_MP_linhasAtivas_().forEach(function (l) {
    var def = g[l.GERADOR];
    if (!def) return;
    var p = def.parametros(l.PERFIL).filter(function (x) { return x.chave === l.PARAMETRO; })[0];
    if (!p) return;
    var v = SGO_MP_num_(l.VALOR);
    var aplicado = v !== null && v >= p.min && v <= p.max && v !== Number(p.normativo);
    out.push({
      gerador: def.rotulo, geradorCodigo: def.codigo, perfil: (def.perfis.filter(function (x) { return x.chave === l.PERFIL; })[0] || {}).rotulo || l.PERFIL, perfilChave: l.PERFIL,
      escopo: l.CLIENTE_ID ? l.CLIENTE || l.CLIENTE_ID : 'Todos os clientes', clienteId: l.CLIENTE_ID,
      parametro: p.rotulo, parametroChave: p.chave, normativoTxt: SGO_MP_fmt_(p.normativo, p.unidade, p.casas), fonte: SGO_MP_s_(p.fonte),
      usadoTxt: SGO_MP_fmt_(v, p.unidade, p.casas), diferencaTxt: v === null ? '—' : (v > p.normativo ? '+' : '') + SGO_MP_fmt_(v - p.normativo, p.unidade, p.casas),
      aplicado: aplicado, aviso: aplicado ? '' : 'Fora da faixa permitida atual (' + SGO_MP_faixaTxt_(p) + '): não está sendo aplicado. Ajuste de novo ou restaure o padrão.',
      justificativa: l.JUSTIFICATIVA, por: l.NOME, em: l.ATUALIZADO_EM
    });
  });
  return out;
}

function SGO_MP_aprovacoes_() {
  if (typeof SGO_QE_lerTudo_ !== 'function') return { pendentes: [], recentes: [] };
  var g = SGO_MP_geradores_(), telaDe = {}, rotuloDe = {};
  Object.keys(g).forEach(function (k) { (g[k].modulosEmissao || []).forEach(function (m) { telaDe[m] = g[k].tela; rotuloDe[m] = g[k].rotulo; }); });
  var linhas = SGO_QE_lerTudo_().filter(function (r) { return SGO_MP_s_(r.PARAMETROS_PERSONALIZADOS) && telaDe[r.MODULO]; });
  var item = function (r) {
    return { id: r.ID, gerador: rotuloDe[r.MODULO], tela: telaDe[r.MODULO], numero: r.NUMERO, revisao: r.REVISAO, cliente: r.CLIENTE, tag: r.TAG, situacao: r.STATUS,
      enviadoPor: r.ENVIADO_POR, enviadoEm: r.ENVIADO_EM, aprovadoPor: r.APROVADO_POR, aprovadoEm: r.APROVADO_EM, parametros: r.PARAMETROS_PERSONALIZADOS };
  };
  return {
    pendentes: linhas.filter(function (r) { return r.STATUS === 'AGUARDANDO_APROVACAO'; }).map(item),
    recentes: linhas.filter(function (r) { return r.STATUS === 'EMITIDO' || r.STATUS === 'SUBSTITUIDO'; }).slice(-20).reverse().map(item)
  };
}

function SGO_MP_auditoria_(f) {
  f = f || {};
  var de = SGO_MP_s_(f.de), ate = SGO_MP_s_(f.ate), acao = SGO_MP_up_(f.acao), busca = SGO_MP_s_(f.busca).toLowerCase(), gerador = SGO_MP_up_(f.gerador);
  var paraIso = function (dmy) { var m = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(dmy || ''); return m ? m[3] + '-' + m[2] + '-' + m[1] : ''; };
  var linhas = SGO_MP_ler_(SGO_MP_CFG.ABA_AUDITORIA, SGO_MP_CAMPOS_AUDITORIA).filter(function (l) {
    var dia = paraIso(l.EM);
    if (de && dia < de) return false;
    if (ate && dia > ate) return false;
    if (acao && l.ACAO !== acao) return false;
    if (gerador && l.GERADOR !== gerador) return false;
    if (busca && [l.NOME, l.USUARIO, l.PARAMETRO, l.ROTULO, l.CLIENTE, l.MOTIVO, l.REFERENCIA].join(' ').toLowerCase().indexOf(busca) < 0) return false;
    return true;
  });
  var total = linhas.length;
  return {
    total: total, acoes: Object.keys(SGO_MP_ACOES).map(function (k) { return { codigo: k, rotulo: SGO_MP_ACOES[k] }; }),
    linhas: linhas.slice(-300).reverse().map(function (l) {
      return { em: l.EM, nome: l.NOME, usuario: l.USUARIO, acao: l.ACAO, acaoTxt: SGO_MP_ACOES[l.ACAO] || l.ACAO, gerador: l.GERADOR, perfil: l.PERFIL, cliente: l.CLIENTE || (l.CLIENTE_ID ? l.CLIENTE_ID : ''),
        parametro: l.ROTULO || l.PARAMETRO, normativo: l.VALOR_NORMATIVO, anterior: l.VALOR_ANTERIOR, novo: l.VALOR_NOVO, motivo: l.MOTIVO, referencia: l.REFERENCIA };
    })
  };
}

/* ============================================================
 * API do navegador: SGO_MP_api*(sessionId, payload) -> { ok, ... } ou { ok:false, message }
 * ============================================================ */

/** Situação do usuário (menu e tela). Nunca lança erro; para quem não é responsável nem Administrador não revela nada. */
function SGO_MP_apiSituacao(sessionId, payload) {
  return SGO_MP_resposta_(function () {
    var eu = SGO_MP_sessao_(sessionId);
    if (SGO_MP_ehAdmin_(eu) || SGO_MP_ehResponsavel_(eu)) SGO_MP_migrarSenhaAntiga_();
    return SGO_MP_situacao_(eu);
  });
}

/** Primeira senha (ou nova senha depois que o Administrador apagou a anterior). Abre o modo. */
function SGO_MP_apiCriarSenha(sessionId, payload) {
  return SGO_MP_resposta_(function () {
    var eu = SGO_MP_exigirResponsavel_(sessionId);
    if (SGO_MP_temSenha_(eu.userId)) throw new Error('Você já tem a senha do modo personalizado. Para trocar, use "Trocar minha senha" (pede a senha atual). Se esqueceu, toque em "Esqueci a senha do modo personalizado": o link vai para o seu e-mail.');
    var p = payload || {};
    var s = SGO_MP_validarSenhaNova_(eu, p.nova, p.confirmar);
    SGO_MP_gravarSenha_(eu.userId, s);
    SGO_MP_apagar_(SGO_MP_CFG.PROP_TENTATIVAS + eu.userId);
    SGO_MP_gravarJson_(SGO_MP_CFG.PROP_SESSAO + eu.userId, { sid: SGO_MP_chaveSid_(eu.sessionId), uso: SGO_MP_agoraMs_(), desde: SGO_MP_agoraTxt_() });
    SGO_MP_auditar_(eu, 'SENHA_CRIADA', { MOTIVO: 'Senha própria criada pelo responsável técnico (valor não registrado).' });
    return Object.assign(SGO_MP_situacao_(eu), { mensagem: 'Senha criada. O modo personalizado está aberto e fecha sozinho depois de ' + SGO_MP_CFG.SESSAO_MIN + ' minutos sem uso.' });
  });
}

function SGO_MP_apiEntrar(sessionId, payload) {
  return SGO_MP_resposta_(function () {
    var eu = SGO_MP_exigirResponsavel_(sessionId);
    if (!SGO_MP_temSenha_(eu.userId)) throw new Error('Você ainda não tem a senha do modo personalizado. Toque em "Criar minha senha" nesta tela.');
    var ate = SGO_MP_bloqueadoAte_(eu.userId);
    if (ate) throw new Error('A entrada está bloqueada até ' + SGO_MP_fmtData_(ate, 'HH:mm') + ' por causa de ' + SGO_MP_CFG.TENTATIVAS_MAX + ' senhas erradas seguidas. Aguarde ou peça ao Administrador para desbloquear em ' + SGO_MP_CFG.CAMINHO_ADMIN + '. Se esqueceu a senha, toque em "Esqueci a senha do modo personalizado" (o link vai para o seu e-mail) e crie outra.');
    var senha = String((payload || {}).senha || '');
    if (!senha) throw new Error('Digite a sua senha do modo personalizado e toque em "Entrar".');
    var r = SGO_MP_trava_(function () {
      if (SGO_MP_senhaConfere_(eu.userId, senha)) {
        SGO_MP_apagar_(SGO_MP_CFG.PROP_TENTATIVAS + eu.userId);
        SGO_MP_gravarJson_(SGO_MP_CFG.PROP_SESSAO + eu.userId, { sid: SGO_MP_chaveSid_(eu.sessionId), uso: SGO_MP_agoraMs_(), desde: SGO_MP_agoraTxt_() });
        return { ok: true };
      }
      var t = SGO_MP_tentativas_(eu.userId);
      var n = (Number(t.n) || 0) + 1;
      if (n >= SGO_MP_CFG.TENTATIVAS_MAX) {
        var ateNovo = SGO_MP_agoraMs_() + SGO_MP_CFG.BLOQUEIO_MIN * 60000;
        SGO_MP_gravarJson_(SGO_MP_CFG.PROP_TENTATIVAS + eu.userId, { n: 0, ate: ateNovo });
        return { ok: false, bloqueou: true, ate: ateNovo };
      }
      SGO_MP_gravarJson_(SGO_MP_CFG.PROP_TENTATIVAS + eu.userId, { n: n, ate: 0 });
      return { ok: false, restam: SGO_MP_CFG.TENTATIVAS_MAX - n };
    });
    if (r.ok) {
      SGO_MP_auditar_(eu, 'ENTRADA', {});
      return Object.assign(SGO_MP_situacao_(eu), { mensagem: 'Modo personalizado aberto. Ele fecha sozinho depois de ' + SGO_MP_CFG.SESSAO_MIN + ' minutos sem uso.' });
    }
    if (r.bloqueou) {
      SGO_MP_auditar_(eu, 'BLOQUEIO', { MOTIVO: SGO_MP_CFG.TENTATIVAS_MAX + ' senhas erradas seguidas; bloqueado por ' + SGO_MP_CFG.BLOQUEIO_MIN + ' minutos.' });
      throw new Error('Senha incorreta pela ' + SGO_MP_CFG.TENTATIVAS_MAX + 'ª vez seguida: a entrada ficou bloqueada até ' + SGO_MP_fmtData_(r.ate, 'HH:mm') + '. Aguarde ou peça ao Administrador para desbloquear em ' + SGO_MP_CFG.CAMINHO_ADMIN + '.');
    }
    SGO_MP_auditar_(eu, 'ENTRADA_RECUSADA', {});
    throw new Error('Senha incorreta. ' + (r.restam === 1 ? 'Resta 1 tentativa' : 'Restam ' + r.restam + ' tentativas') + ' antes do bloqueio de ' + SGO_MP_CFG.BLOQUEIO_MIN + ' minutos.');
  });
}

function SGO_MP_apiSair(sessionId, payload) {
  return SGO_MP_resposta_(function () {
    var eu = SGO_MP_sessao_(sessionId);
    if (SGO_MP_ehResponsavel_(eu) && SGO_MP_modoAberto_(eu, false).aberto) SGO_MP_auditar_(eu, 'SAIDA', {});
    SGO_MP_apagar_(SGO_MP_CFG.PROP_SESSAO + eu.userId);
    return Object.assign(SGO_MP_situacao_(eu), { mensagem: 'Modo personalizado fechado.' });
  });
}

/** Troca de senha: exige a atual (erros contam para o bloqueio). */
function SGO_MP_apiTrocarSenha(sessionId, payload) {
  return SGO_MP_resposta_(function () {
    var eu = SGO_MP_exigirModo_(sessionId);
    var p = payload || {};
    var ate = SGO_MP_bloqueadoAte_(eu.userId);
    if (ate) throw new Error('A troca está bloqueada até ' + SGO_MP_fmtData_(ate, 'HH:mm') + ' por causa de senhas erradas seguidas.');
    if (!SGO_MP_senhaConfere_(eu.userId, p.atual)) {
      var t = SGO_MP_tentativas_(eu.userId), n = (Number(t.n) || 0) + 1;
      if (n >= SGO_MP_CFG.TENTATIVAS_MAX) {
        SGO_MP_gravarJson_(SGO_MP_CFG.PROP_TENTATIVAS + eu.userId, { n: 0, ate: SGO_MP_agoraMs_() + SGO_MP_CFG.BLOQUEIO_MIN * 60000 });
        SGO_MP_apagar_(SGO_MP_CFG.PROP_SESSAO + eu.userId);
        SGO_MP_auditar_(eu, 'BLOQUEIO', { MOTIVO: 'Senha atual errada na troca de senha.' });
        throw new Error('Senha atual incorreta pela ' + SGO_MP_CFG.TENTATIVAS_MAX + 'ª vez: o modo foi fechado e a entrada ficou bloqueada por ' + SGO_MP_CFG.BLOQUEIO_MIN + ' minutos.');
      }
      SGO_MP_gravarJson_(SGO_MP_CFG.PROP_TENTATIVAS + eu.userId, { n: n, ate: 0 });
      SGO_MP_auditar_(eu, 'ENTRADA_RECUSADA', { MOTIVO: 'Senha atual errada na troca de senha.' });
      throw new Error('A senha atual não confere. Restam ' + (SGO_MP_CFG.TENTATIVAS_MAX - n) + ' tentativas antes do bloqueio.');
    }
    var s = SGO_MP_validarSenhaNova_(eu, p.nova, p.confirmar);
    if (s === String(p.atual)) throw new Error('A senha nova é igual à atual. Digite outra.');
    SGO_MP_gravarSenha_(eu.userId, s);
    SGO_MP_apagar_(SGO_MP_CFG.PROP_TENTATIVAS + eu.userId);
    SGO_MP_auditar_(eu, 'SENHA_TROCADA', { MOTIVO: 'Valor não registrado.' });
    return Object.assign(SGO_MP_situacao_(eu), { mensagem: 'Senha trocada.' });
  });
}

function SGO_MP_apiParametros(sessionId, payload) {
  return SGO_MP_resposta_(function () {
    SGO_MP_exigirModo_(sessionId);
    var p = payload || {};
    return SGO_MP_tabelaParametros_(p.gerador, SGO_MP_s_(p.perfil), p.clienteId);
  });
}

function SGO_MP_justificativa_(texto) {
  var j = SGO_MP_s_(texto).replace(/\s+/g, ' ');
  if (j.length < SGO_MP_CFG.JUSTIFICATIVA_MIN) throw new Error('Escreva a justificativa (pelo menos ' + SGO_MP_CFG.JUSTIFICATIVA_MIN + ' caracteres): por que o valor muda e o que embasa a decisão (protocolo do cliente, metodologia acordada, estudo). Ela sai no documento e na auditoria.');
  return j.slice(0, 1000);
}

/** Ajusta um parâmetro: { gerador, perfil, clienteId, parametro, valor, justificativa }. */
function SGO_MP_apiAlterar(sessionId, payload) {
  return SGO_MP_resposta_(function () {
    var eu = SGO_MP_exigirModo_(sessionId);
    var p = payload || {};
    var def = SGO_MP_gerador_(p.gerador), perfil = SGO_MP_s_(p.perfil);
    var par = SGO_MP_param_(def, perfil, SGO_MP_s_(p.parametro));
    var cli = SGO_MP_s_(p.clienteId), nomeCli = cli ? SGO_MP_nomeCliente_(cli) : '';
    var v = SGO_MP_num_(p.valor);
    if (v === null) throw new Error('Informe o valor de "' + par.rotulo + '" só com o número (ex.: ' + SGO_MP_fmt_(par.normativo, '', par.casas) + ').');
    if (par.inteiro && Math.round(v) !== v) throw new Error('"' + par.rotulo + '" aceita só número inteiro.');
    if (v < par.min || v > par.max) throw new Error('Valor fora da faixa permitida para "' + par.rotulo + '": de ' + SGO_MP_faixaTxt_(par) + '. A faixa é definida na configuração do sistema; nada foi alterado.');
    if (v === Number(par.normativo)) throw new Error('O valor é igual à referência normativa (' + SGO_MP_fmt_(par.normativo, par.unidade, par.casas) + '). Para voltar à referência, use "Restaurar o padrão".');
    var just = SGO_MP_justificativa_(p.justificativa);
    var chave = SGO_MP_chaveLinha_(def.codigo, perfil, cli, par.chave);
    var anterior = SGO_MP_trava_(function () {
      var atual = SGO_MP_ler_(SGO_MP_CFG.ABA_PARAMETROS, SGO_MP_CAMPOS_PARAMETROS).filter(function (l) { return l.CHAVE === chave; })[0];
      var antes = atual && atual.ATIVO === 'SIM' ? atual.VALOR : '';
      var novos = { CHAVE: chave, GERADOR: def.codigo, PERFIL: perfil, CLIENTE_ID: cli, CLIENTE: nomeCli, PARAMETRO: par.chave, VALOR: String(v), VALOR_NORMATIVO: String(par.normativo),
        JUSTIFICATIVA: just, USUARIO: eu.usuario, NOME: eu.nome, ATUALIZADO_EM: SGO_MP_agoraTxt_(), ATIVO: 'SIM' };
      if (atual) SGO_MP_atualizarLinha_(SGO_MP_CFG.ABA_PARAMETROS, SGO_MP_CAMPOS_PARAMETROS, atual, novos);
      else SGO_MP_incluirLinha_(SGO_MP_CFG.ABA_PARAMETROS, SGO_MP_CAMPOS_PARAMETROS, novos);
      return antes;
    });
    SGO_MP_auditar_(eu, 'PARAMETRO_ALTERADO', { GERADOR: def.codigo, PERFIL: perfil, CLIENTE_ID: cli, CLIENTE: nomeCli || 'Todos os clientes', PARAMETRO: par.chave, ROTULO: par.rotulo,
      VALOR_NORMATIVO: SGO_MP_fmt_(par.normativo, par.unidade, par.casas), VALOR_ANTERIOR: anterior === '' ? SGO_MP_fmt_(par.normativo, par.unidade, par.casas) + ' (referência)' : SGO_MP_fmt_(anterior, par.unidade, par.casas),
      VALOR_NOVO: SGO_MP_fmt_(v, par.unidade, par.casas), MOTIVO: just });
    return Object.assign(SGO_MP_tabelaParametros_(def.codigo, perfil, cli), { mensagem: par.rotulo + ': ' + SGO_MP_fmt_(v, par.unidade, par.casas) + ' gravado' + (nomeCli ? ' para ' + nomeCli : ' para todos os clientes') + '. Os documentos gerados a partir de agora saem com a seção "Parâmetros personalizados" e precisam da aprovação de um responsável técnico.' });
  });
}

/** Restaura o padrão: { gerador, perfil, clienteId, parametro (vazio = todos deste escopo), justificativa }. */
function SGO_MP_apiRestaurar(sessionId, payload) {
  return SGO_MP_resposta_(function () {
    var eu = SGO_MP_exigirModo_(sessionId);
    var p = payload || {};
    var def = SGO_MP_gerador_(p.gerador), perfil = SGO_MP_s_(p.perfil), cli = SGO_MP_s_(p.clienteId);
    var alvo = SGO_MP_s_(p.parametro);
    if (alvo) SGO_MP_param_(def, perfil, alvo);
    var just = SGO_MP_justificativa_(p.justificativa);
    var params = def.parametros(perfil);
    var feitos = SGO_MP_trava_(function () {
      var r = [];
      SGO_MP_ler_(SGO_MP_CFG.ABA_PARAMETROS, SGO_MP_CAMPOS_PARAMETROS).forEach(function (l) {
        if (l.ATIVO !== 'SIM' || l.GERADOR !== def.codigo || l.PERFIL !== perfil || l.CLIENTE_ID !== cli || (alvo && l.PARAMETRO !== alvo)) return;
        SGO_MP_atualizarLinha_(SGO_MP_CFG.ABA_PARAMETROS, SGO_MP_CAMPOS_PARAMETROS, l, { ATIVO: 'NAO', USUARIO: eu.usuario, NOME: eu.nome, ATUALIZADO_EM: SGO_MP_agoraTxt_(), JUSTIFICATIVA: just });
        r.push(l);
      });
      return r;
    });
    if (!feitos.length) throw new Error('Não há ajuste ' + (cli ? 'deste cliente' : 'para todos os clientes') + ' a restaurar' + (alvo ? ' neste parâmetro' : '') + '. Nada foi alterado.');
    feitos.forEach(function (l) {
      var par = params.filter(function (x) { return x.chave === l.PARAMETRO; })[0] || { rotulo: l.PARAMETRO, unidade: '', normativo: l.VALOR_NORMATIVO };
      SGO_MP_auditar_(eu, 'PARAMETRO_RESTAURADO', { GERADOR: def.codigo, PERFIL: perfil, CLIENTE_ID: cli, CLIENTE: l.CLIENTE || 'Todos os clientes', PARAMETRO: l.PARAMETRO, ROTULO: par.rotulo,
        VALOR_NORMATIVO: SGO_MP_fmt_(par.normativo, par.unidade, par.casas), VALOR_ANTERIOR: SGO_MP_fmt_(l.VALOR, par.unidade, par.casas), VALOR_NOVO: SGO_MP_fmt_(par.normativo, par.unidade, par.casas) + ' (referência)', MOTIVO: just });
    });
    return Object.assign(SGO_MP_tabelaParametros_(def.codigo, perfil, cli), { mensagem: feitos.length + ' parâmetro(s) de volta à referência normativa.' });
  });
}

function SGO_MP_apiDiferencas(sessionId, payload) {
  return SGO_MP_resposta_(function () { SGO_MP_exigirModo_(sessionId); return { itens: SGO_MP_diferencas_() }; });
}

function SGO_MP_apiAprovacoes(sessionId, payload) {
  return SGO_MP_resposta_(function () { SGO_MP_exigirModo_(sessionId); return SGO_MP_aprovacoes_(); });
}

/** Auditoria: responsável com o modo aberto, ou o Administrador (consulta). */
function SGO_MP_apiAuditoria(sessionId, payload) {
  return SGO_MP_resposta_(function () {
    var eu = SGO_MP_sessao_(sessionId);
    if (!SGO_MP_ehAdmin_(eu)) SGO_MP_exigirModo_(sessionId);
    var r = SGO_MP_auditoria_(payload || {});
    if ((payload || {}).conferir) r.integridade = SGO_MP_conferirAuditoria_();
    return r;
  });
}

/** Clientes para o escopo do ajuste (busca por nome ou CNPJ, até 30). */
function SGO_MP_apiClientes(sessionId, payload) {
  return SGO_MP_resposta_(function () {
    SGO_MP_exigirModo_(sessionId);
    var q = SGO_MP_s_((payload || {}).busca).toLowerCase(), qd = q.replace(/\D/g, '');
    var lista = [];
    try { lista = SGO_DATA.getAll((typeof SGO_CFG !== 'undefined' && SGO_CFG.SHEETS && SGO_CFG.SHEETS.CAD_CLIENTES) || 'CAD_CLIENTES'); } catch (e) { lista = []; }
    return { itens: lista.filter(function (c) {
      if (SGO_MP_up_(c.STATUS || 'ATIVO') !== 'ATIVO') return false;
      if (!q) return true;
      var nome = (SGO_MP_s_(c.NOME_FANTASIA) + ' ' + SGO_MP_s_(c.RAZAO_SOCIAL)).toLowerCase();
      return nome.indexOf(q) >= 0 || (qd.length >= 4 && String(c.CNPJ || '').replace(/\D/g, '').indexOf(qd) >= 0);
    }).slice(0, 30).map(function (c) { return { id: SGO_MP_s_(c.ID), nome: SGO_MP_s_(c.NOME_FANTASIA) || SGO_MP_s_(c.RAZAO_SOCIAL) }; }) };
  });
}

/* ---------------- Administração (Administrador ou responsável pelo sistema) ---------------- */

function SGO_MP_usuarios_() {
  try { return SGO_DATA.getAll((typeof SGO_CFG !== 'undefined' && SGO_CFG.SHEETS && SGO_CFG.SHEETS.CAD_USUARIOS) || 'CAD_USUARIOS'); } catch (e) { return []; }
}

function SGO_MP_listaResponsaveis_() {
  var designados = {};
  SGO_MP_responsaveis_().forEach(function (r) { designados[String(r.userId)] = r; });
  var vistos = {};
  var itens = SGO_MP_usuarios_().filter(function (u) {
    var ativo = SGO_MP_up_(u.STATUS || 'ATIVO') === 'ATIVO', eleg = SGO_MP_CFG.PERFIS_ELEGIVEIS.indexOf(SGO_MP_up_(u.PERFIL)) >= 0;
    return (ativo && eleg) || designados[String(u.ID)];
  }).map(function (u) {
    var id = SGO_MP_s_(u.ID), d = designados[id];
    vistos[id] = true;
    var ativo = SGO_MP_up_(u.STATUS || 'ATIVO') === 'ATIVO', eleg = SGO_MP_CFG.PERFIS_ELEGIVEIS.indexOf(SGO_MP_up_(u.PERFIL)) >= 0;
    var ate = d ? SGO_MP_bloqueadoAte_(id) : 0;
    var em = String(u.EMAIL || '').replace(/\s+/g, '').toLowerCase();
    // 31/10/2026: a tela mostra o e-mail (o login interno não aparece mais) e oferece o link quando há e-mail
    return { userId: id, usuario: SGO_MP_s_(u.USUARIO), email: em, temEmail: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em), nome: SGO_MP_s_(u.NOME) || SGO_MP_s_(u.USUARIO), perfil: SGO_MP_up_(u.PERFIL), designado: !!d,
      desde: d ? d.desde : '', por: d ? d.por : '', temSenha: d ? SGO_MP_temSenha_(id) : false, bloqueadoAte: ate ? SGO_MP_fmtData_(ate, 'HH:mm') : '',
      aviso: d && (!ativo || !eleg) ? (!ativo ? 'Usuário inativo: não entra no modo.' : 'Perfil sem habilitação (' + SGO_MP_up_(u.PERFIL) + '): não entra no modo até voltar a um perfil habilitado.') : '' };
  });
  Object.keys(designados).forEach(function (id) {
    if (!vistos[id]) itens.push({ userId: id, usuario: designados[id].usuario, nome: designados[id].nome || id, perfil: '', designado: true, desde: designados[id].desde, por: designados[id].por, temSenha: SGO_MP_temSenha_(id), bloqueadoAte: '', aviso: 'Usuário não encontrado no cadastro: não entra no modo. Remova da lista.' });
  });
  itens.sort(function (a, b) { return (a.designado === b.designado ? 0 : a.designado ? -1 : 1) || a.nome.localeCompare(b.nome); });
  return { itens: itens, perfisElegiveis: SGO_MP_CFG.PERFIS_ELEGIVEIS, total: itens.filter(function (x) { return x.designado; }).length };
}

function SGO_MP_apiResponsaveis(sessionId, payload) {
  return SGO_MP_resposta_(function () {
    SGO_MP_exigirAdmin_(sessionId);
    SGO_MP_migrarSenhaAntiga_();
    return SGO_MP_listaResponsaveis_();
  });
}

/** Grava a lista: { ids:[userId...] }. Quem sai da lista perde a senha e o modo aberto. */
function SGO_MP_apiDefinirResponsaveis(sessionId, payload) {
  return SGO_MP_resposta_(function () {
    var eu = SGO_MP_exigirAdmin_(sessionId);
    var ids = ((payload || {}).ids || []).map(SGO_MP_s_).filter(Boolean);
    var usuarios = {};
    SGO_MP_usuarios_().forEach(function (u) { usuarios[SGO_MP_s_(u.ID)] = u; });
    var antes = {};
    SGO_MP_responsaveis_().forEach(function (r) { antes[String(r.userId)] = r; });
    var nova = [];
    ids.forEach(function (id) {
      if (nova.some(function (x) { return x.userId === id; })) return;
      var u = usuarios[id];
      if (!u) throw new Error('Um dos usuários marcados não existe mais no cadastro. Atualize a tela (F5) e marque de novo.');
      if (SGO_MP_up_(u.STATUS || 'ATIVO') !== 'ATIVO') throw new Error((SGO_MP_s_(u.NOME) || id) + ' está inativo no cadastro. Ative o usuário em Administração > Usuários ou desmarque.');
      if (SGO_MP_CFG.PERFIS_ELEGIVEIS.indexOf(SGO_MP_up_(u.PERFIL)) < 0 && !antes[id]) throw new Error((SGO_MP_s_(u.NOME) || id) + ' tem o perfil ' + SGO_MP_up_(u.PERFIL) + '. Só os perfis Administrador, Diretoria, Gestor e Metrologia podem ser responsáveis técnicos do modo personalizado.');
      nova.push(antes[id] || { userId: id, usuario: SGO_MP_s_(u.USUARIO), nome: SGO_MP_s_(u.NOME) || SGO_MP_s_(u.USUARIO), desde: SGO_MP_agoraTxt_(), por: eu.nome });
    });
    SGO_MP_gravarJson_(SGO_MP_CFG.PROP_RESPONSAVEIS, nova);
    nova.forEach(function (r) { if (!antes[r.userId]) SGO_MP_auditar_(eu, 'RESPONSAVEL_INCLUIDO', { MOTIVO: r.nome + ' (' + r.usuario + ')' }); });
    Object.keys(antes).forEach(function (id) {
      if (nova.some(function (x) { return x.userId === id; })) return;
      SGO_MP_apagar_(SGO_MP_CFG.PROP_SENHA + id);
      SGO_MP_apagar_(SGO_MP_CFG.PROP_SESSAO + id);
      SGO_MP_apagar_(SGO_MP_CFG.PROP_TENTATIVAS + id);
      SGO_MP_auditar_(eu, 'RESPONSAVEL_REMOVIDO', { MOTIVO: (antes[id].nome || id) + ' (' + (antes[id].usuario || '') + '); senha apagada.' });
    });
    return Object.assign(SGO_MP_listaResponsaveis_(), { mensagem: 'Lista gravada: ' + nova.length + ' responsável(is) técnico(s). Quem foi incluído cria a própria senha em ' + SGO_MP_CFG.CAMINHO_TELA + '.' });
  });
}

/** Apaga a senha de um responsável (esqueceu): ele cria outra na próxima entrada. */
function SGO_MP_apiRedefinirSenha(sessionId, payload) {
  return SGO_MP_resposta_(function () {
    var eu = SGO_MP_exigirAdmin_(sessionId);
    var id = SGO_MP_s_((payload || {}).userId);
    var r = SGO_MP_responsaveis_().filter(function (x) { return String(x.userId) === id; })[0];
    if (!r) throw new Error('Este usuário não está na lista de responsáveis técnicos. Atualize a tela.');
    SGO_MP_apagar_(SGO_MP_CFG.PROP_SENHA + id);
    SGO_MP_apagar_(SGO_MP_CFG.PROP_SESSAO + id);
    SGO_MP_apagar_(SGO_MP_CFG.PROP_TENTATIVAS + id);
    SGO_MP_auditar_(eu, 'SENHA_REDEFINIDA', { MOTIVO: (r.nome || id) + ' (' + (r.usuario || '') + ') vai criar uma senha nova.' });
    return Object.assign(SGO_MP_listaResponsaveis_(), { mensagem: 'Senha de ' + (r.nome || id) + ' apagada. Na próxima vez, ele cria uma senha nova em ' + SGO_MP_CFG.CAMINHO_TELA + '.' });
  });
}

/*
 * 31/10/2026 (pedido do dono, redefinição de senha pelo e-mail): no lugar de "Apagar a senha (esqueceu)", o Administrador
 * envia um LINK para o e-mail do responsável (30 minutos, uso único; SGO_SegurancaAcesso.js, tipo MP). Ao abrir o link, a
 * senha antiga do modo personalizado é apagada e a pessoa cria a nova dentro do SGO+ (com o login e o código de sempre).
 * O próprio responsável também pede o link ("Esqueci a senha do modo personalizado"). Quem não tem e-mail cadastrado
 * continua com o "Apagar a senha agora" do Administrador (alternativa, com registro).
 */
function SGO_MP_emailDe_(userId) {
  var u = (SGO_MP_usuarios_() || []).filter(function (x) { return SGO_MP_s_(x.ID) === SGO_MP_s_(userId); })[0];
  var e = String((u && u.EMAIL) || '').replace(/\s+/g, '').toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) ? e : '';
}

/** Chamado pelo link (SGO_SegurancaAcesso.js > concluirRedefinicaoSenha, tipo MP). u = pessoa do link. */
function SGO_MP_liberarSenhaPorLink_(u, rec) {
  var id = SGO_MP_s_(u && u.ID);
  var r = SGO_MP_responsaveis_().filter(function (x) { return String(x.userId) === id; })[0];
  if (!r) return { ok: false, message: 'Você não está mais na lista de responsáveis técnicos do modo personalizado. Fale com o Administrador do SGO+.' };
  SGO_MP_apagar_(SGO_MP_CFG.PROP_SENHA + id);
  SGO_MP_apagar_(SGO_MP_CFG.PROP_SESSAO + id);
  SGO_MP_apagar_(SGO_MP_CFG.PROP_TENTATIVAS + id);
  SGO_MP_auditar_({ usuario: SGO_MP_s_(u.USUARIO), nome: SGO_MP_s_(u.NOME), perfil: SGO_MP_up_(u.PERFIL) }, 'SENHA_REDEFINIDA_LINK',
    { MOTIVO: (u.NOME || id) + ' abriu o link do e-mail (' + (rec && rec.origem === 'GESTAO' ? 'enviado pelo Administrador' : 'pedido pela própria pessoa') + ') e vai criar uma senha nova.' });
  return { ok: true };
}

/** Administrador: envia o link da senha nova do modo personalizado para o e-mail do responsável. payload = { userId, motivo }. */
function SGO_MP_apiEnviarLinkSenha(sessionId, payload) {
  return SGO_MP_resposta_(function () {
    var eu = SGO_MP_exigirAdmin_(sessionId);
    var id = SGO_MP_s_((payload || {}).userId), motivo = SGO_MP_s_((payload || {}).motivo) || 'esqueceu a senha do modo personalizado';
    var r = SGO_MP_responsaveis_().filter(function (x) { return String(x.userId) === id; })[0];
    if (!r) throw new Error('Este usuário não está na lista de responsáveis técnicos. Atualize a tela.');
    if (typeof SegAcesso_enviarLinkGestao_ !== 'function') throw new Error('O envio do link não está disponível neste sistema. Use "Apagar a senha agora".');
    var env = SegAcesso_enviarLinkGestao_(id, motivo, exigirSessao(String(sessionId || '')), 'MP');
    SGO_MP_auditar_(eu, 'LINK_SENHA_ENVIADO', { MOTIVO: (r.nome || id) + ': link para ' + env.destino + ' (30 minutos, uso único). Motivo: ' + motivo });
    return Object.assign(SGO_MP_listaResponsaveis_(), { mensagem: 'Link enviado para o e-mail ' + env.destino + ' de ' + (r.nome || id) + '. Ele vale por 30 minutos: ao abrir, a senha antiga é apagada e a pessoa cria outra em ' + SGO_MP_CFG.CAMINHO_TELA + '.' });
  });
}

/** O próprio responsável esqueceu a senha do modo personalizado: link para o e-mail dele (3 por hora). */
function SGO_MP_apiEsqueciSenha(sessionId, payload) {
  return SGO_MP_resposta_(function () {
    var eu = SGO_MP_exigirResponsavel_(sessionId);
    if (!SGO_MP_temSenha_(eu.userId)) throw new Error('Você ainda não tem a senha do modo personalizado: toque em "Criar minha senha" nesta tela.');
    var email = SGO_MP_emailDe_(eu.userId);
    if (!email) throw new Error('O seu cadastro não tem e-mail válido, então o link não tem para onde ir. O que fazer: peça ao Administrador para apagar a senha em ' + SGO_MP_CFG.CAMINHO_ADMIN + ' (ou para cadastrar o seu e-mail em Administração > Usuários).');
    if (typeof SegAcesso_criarLinkRedefinicao_ !== 'function') throw new Error('O envio do link não está disponível neste sistema. Peça ao Administrador para apagar a senha em ' + SGO_MP_CFG.CAMINHO_ADMIN + '.');
    if (SegAcesso_limitePedidos_('mp:' + email, true)) throw new Error('Você já pediu 3 links na última hora. Use o link do e-mail mais recente ou aguarde e tente de novo.');
    var u = SegAcesso_usuarioPorId_(eu.userId);
    var r = SegAcesso_criarLinkRedefinicao_(u, null, { origem: 'PESSOA', tipo: 'MP' });
    if (!r.ok) throw new Error(r.message || 'Não foi possível enviar o link agora.');
    SegAcesso_registrar_('REDEFINICAO_LINK_ENVIADO', u, null, 'Link da senha do modo personalizado para ' + r.destino + ' (pedido pela própria pessoa).');
    SGO_MP_auditar_(eu, 'LINK_SENHA_ENVIADO', { MOTIVO: 'Pedido pela própria pessoa: link para ' + r.destino + ' (30 minutos, uso único).' });
    return Object.assign(SGO_MP_situacao_(eu), { mensagem: 'Enviamos um link para o seu e-mail ' + r.destino + '. Ele vale por 30 minutos: ao abrir, a senha antiga é apagada e você cria outra nesta tela.' });
  });
}

function SGO_MP_apiDesbloquear(sessionId, payload) {
  return SGO_MP_resposta_(function () {
    var eu = SGO_MP_exigirAdmin_(sessionId);
    var id = SGO_MP_s_((payload || {}).userId);
    var r = SGO_MP_responsaveis_().filter(function (x) { return String(x.userId) === id; })[0];
    if (!r) throw new Error('Este usuário não está na lista de responsáveis técnicos. Atualize a tela.');
    SGO_MP_apagar_(SGO_MP_CFG.PROP_TENTATIVAS + id);
    SGO_MP_auditar_(eu, 'DESBLOQUEIO', { MOTIVO: (r.nome || id) + ' (' + (r.usuario || '') + ')' });
    return Object.assign(SGO_MP_listaResponsaveis_(), { mensagem: 'Entrada de ' + (r.nome || id) + ' desbloqueada.' });
  });
}
