/****************************************************
 * SEGURANÇA E AUTOMAÇÃO PREDIAL (22/10/2026)
 *
 * Portões e a porta da Diretoria administrados pelo SGO+ pela nuvem do Smart Life (Tuya). Cliente da API em
 * SGO_Automacao_Tuya.js; tela em JS_AutomacaoPredial.html; ajuda em SGO_Ajuda_AutomacaoPredial.js.
 *
 * REGRAS (ordem de desenvolvimento do dono, 22/10/2026)
 *  1. Sessão e permissão conferidas no servidor em toda chamada (AutPred_api). Nenhum endereço público.
 *  2. Dispositivo RESTRITO À DIRETORIA (fechaduras entram assim na sincronização): só o perfil DIRETORIA o vê, lista,
 *     consulta ou aciona. Para os demais ele não existe (nem nome, nem estado, nem histórico). O Administrador vê
 *     apenas a contagem "n restrito(s) à Diretoria", sem dados.
 *  3. Portões: Administrador e Diretoria veem e acionam. Os outros perfis só com permissão individual por dispositivo
 *     (VER = estado e histórico; ACIONAR = também abrir), com vigência, concedida por ADMIN (portões) ou DIRETORIA (tudo)
 *     e registrada. A porta da Diretoria exige permissão ACIONAR mesmo para a Diretoria (usuário expressamente
 *     autorizado), concedida só por DIRETORIA a usuários DIRETORIA.
 *  4. Comando: identificador da operação (idempotente: o mesmo id devolve o mesmo resultado, nunca executa de novo);
 *     no máximo 1 comando por dispositivo a cada AUT_INTERVALO_DISPOSITIVO_S, AUT_LIMITE_USUARIO_MIN por pessoa por
 *     minuto e nunca o mesmo comando enquanto o anterior está sem resultado; fechadura só com a confirmação "ABRIR".
 *  5. COMANDO SOLICITADO -> COMANDO ACEITO (a API disse success) -> EXECUÇÃO CONFIRMADA (o estado do dispositivo mudou
 *     ou o registro da fechadura mostra a abertura). A API aceitar NÃO é porta aberta: fica "aceito, sem confirmação".
 *  6. Execução real só com TUYA_LIGADO = 1 E o dispositivo HOMOLOGADO = SIM pela Diretoria. Antes disso, SIMULAÇÃO:
 *     registra o que teria feito, nada sai do servidor.
 *  7. Registro só-inclusão AUT_AUDITORIA, cada linha com o SHA-256 da anterior (conferência de integridade), no padrão
 *     de SGO_Frota_Bloqueio.js. Nenhum segredo, senha, código de abertura ou token em planilha.
 *
 * Abas (criadas sob demanda; nada é apagado): AUT_DISPOSITIVOS, AUT_PERMISSOES, AUT_COMANDOS, AUT_AUDITORIA.
 ****************************************************/

var AUT_ABA_DISPOSITIVOS = 'AUT_DISPOSITIVOS';
var AUT_ABA_PERMISSOES = 'AUT_PERMISSOES';
var AUT_ABA_COMANDOS = 'AUT_COMANDOS';
var AUT_ABA_AUDITORIA = 'AUT_AUDITORIA';
var AUT_COLUNAS_DISPOSITIVOS = ['ID', 'PROVEDOR', 'DEVICE_ID', 'NOME', 'NOME_PROVEDOR', 'CATEGORIA', 'CATEGORIA_NOME', 'PRODUTO_ID', 'PRODUTO_NOME', 'TIPO',
  'UNIDADE_ID', 'UNIDADE_NOME', 'LOCALIZACAO', 'RESTRITO_DIRETORIA', 'HOMOLOGADO', 'HOMOLOGADO_POR', 'HOMOLOGADO_EM', 'ATIVO',
  'ONLINE', 'ESTADO_JSON', 'ESTADO_EM', 'FUNCOES_JSON', 'COMANDO_ABRIR_JSON', 'ESTADO_CODIGOS', 'COMPAT_OK', 'COMPAT_MOTIVO', 'REMOTO_FECHADURA',
  'ULT_CMD_ID', 'ULT_CMD_EM', 'ULT_CMD_SITUACAO', 'SINCRONIZADO_EM', 'ATUALIZADO_EM', 'CRIADO_EM'];
var AUT_COLUNAS_PERMISSOES = ['ID', 'USUARIO_ID', 'USUARIO_LOGIN', 'USUARIO_NOME', 'USUARIO_PERFIL', 'DISPOSITIVO_ID', 'DEVICE_ID', 'DISPOSITIVO_NOME', 'PERMISSAO',
  'VIGENCIA_INICIO', 'VIGENCIA_FIM', 'CONCEDIDA_POR_ID', 'CONCEDIDA_POR', 'CONCEDIDA_EM', 'MOTIVO', 'STATUS', 'REVOGADA_POR', 'REVOGADA_EM', 'REVOGADA_MOTIVO', 'CRIADO_EM'];
var AUT_COLUNAS_COMANDOS = ['ID', 'OPERACAO_ID', 'QUANDO', 'QUANDO_EM', 'SOLICITANTE_ID', 'SOLICITANTE', 'PERFIL', 'UNIDADE', 'DISPOSITIVO_ID', 'DEVICE_ID', 'DISPOSITIVO_NOME', 'TIPO',
  'COMANDO', 'COMANDO_JSON', 'MODO', 'AUTORIZACAO', 'AUTORIZACAO_MOTIVO', 'SITUACAO', 'API_HTTP', 'API_CODIGO', 'API_TID', 'API_RESPOSTA',
  'ESTADO_ANTES_JSON', 'ESTADO_DEPOIS_JSON', 'CONFIRMADO_EM', 'CONFIRMACAO_DETALHE', 'CORRELACAO', 'ATUALIZADO_EM', 'CRIADO_EM'];
var AUT_COLUNAS_AUDITORIA = ['ID', 'QUANDO', 'QUANDO_EM', 'EVENTO', 'USUARIO_ID', 'USUARIO', 'PERFIL', 'UNIDADE', 'DISPOSITIVO_ID', 'DEVICE_ID', 'DISPOSITIVO_NOME', 'RESTRITO',
  'OPERACAO_ID', 'RESULTADO', 'DETALHE', 'DADOS_JSON', 'HASH_ANTERIOR', 'HASH', 'CRIADO_EM'];

var AUT_PROP_HASH = 'AUT_AUDITORIA_ULTIMO_HASH';
var AUT_INTERVALO_DISPOSITIVO_S = 10;   // 1 comando por dispositivo a cada 10 s
var AUT_LIMITE_USUARIO_MIN = 5;         // por pessoa por minuto
var AUT_SEM_RESULTADO_S = 60;           // não repete o comando enquanto o anterior está sem resultado há menos de 60 s
var AUT_CONFIRMACAO_ESPERA_MS = 2500;   // espera antes de reler o estado para confirmar
var AUT_CONFIRMACAO_JANELA_MIN = 15;    // "Conferir agora" vale até 15 min depois do comando
var AUT_HISTORICO_MAX = 40;
var AUT_FUSO = 'America/Sao_Paulo';
var AUT_SISTEMA = { userId: '', usuario: 'sistema', nome: 'Automação predial', perfil: 'SISTEMA' };
var AUT_PERMISSOES_VALIDAS = { VER: 'Ver estado e histórico', ACIONAR: 'Acionar (abrir) e ver' };
var AUT_PERFIS_INTERNOS = ['ADMIN', 'DIRETORIA', 'GESTOR', 'RH', 'FINANCEIRO', 'TECNICO', 'METROLOGIA', 'COMERCIAL'];

// ------------------------------------------------------------
// UTILITÁRIOS
// ------------------------------------------------------------
function AutPred_s_(v) { return String(v === null || v === undefined ? '' : v).trim(); }
function AutPred_agoraTexto_(d) { return Utilities.formatDate(d || new Date(), AUT_FUSO, 'dd/MM/yyyy HH:mm'); }
function AutPred_dataBr_(iso) { var t = new Date(AutPred_s_(iso)).getTime(); return isFinite(t) && t ? AutPred_agoraTexto_(new Date(t)) : ''; }
function AutPred_ms_(iso) { var t = new Date(AutPred_s_(iso)).getTime(); return isFinite(t) ? t : 0; }
function AutPred_json_(v) { try { return v === undefined ? '' : JSON.stringify(v); } catch (e) { return ''; } }
function AutPred_deJson_(s, padrao) { try { var j = JSON.parse(AutPred_s_(s) || 'null'); return j === null || j === undefined ? padrao : j; } catch (e) { return padrao; } }
function AutPred_nome_(s) { return AutPred_s_(s && (s.nome || s.usuario)) || 'sistema'; }
function AutPred_perfil_(s) { return AutPred_s_(s && s.perfil).toUpperCase(); }
function AutPred_ehDiretoria_(s) { return AutPred_perfil_(s) === 'DIRETORIA'; }
function AutPred_ehAdmin_(s) { return AutPred_perfil_(s) === 'ADMIN'; }
/** Administra o módulo: Administrador e Diretoria (o Gestor não entra aqui de propósito). */
function AutPred_administra_(s) { return AutPred_ehAdmin_(s) || AutPred_ehDiretoria_(s); }
function AutPred_restrito_(d) { return AutPred_s_(d && d.RESTRITO_DIRETORIA).toUpperCase() === 'SIM'; }
function AutPred_ler_(aba) {
  try { if (!SGO_DATA.getDB().getSheetByName(aba)) return []; } catch (e) { return []; }
  return SGO_DATA.getAll(aba);
}
function AutPred_hash_(texto) {
  var b = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(texto), Utilities.Charset.UTF_8);
  return b.map(function (x) { var h = (x < 0 ? x + 256 : x).toString(16); return h.length === 1 ? '0' + h : h; }).join('');
}

function AutPred_bootstrap_() {
  CertCal_garantirTabela_(AUT_ABA_DISPOSITIVOS, AUT_COLUNAS_DISPOSITIVOS);
  CertCal_garantirTabela_(AUT_ABA_PERMISSOES, AUT_COLUNAS_PERMISSOES);
  CertCal_garantirTabela_(AUT_ABA_COMANDOS, AUT_COLUNAS_COMANDOS);
  CertCal_garantirTabela_(AUT_ABA_AUDITORIA, AUT_COLUNAS_AUDITORIA);
}

// ------------------------------------------------------------
// REGISTRO INVIOLÁVEL (só inclusão; cada linha leva o resumo da anterior)
// ------------------------------------------------------------
function AutPred_camposHash_(r) {
  return [r.ID, r.QUANDO_EM, r.EVENTO, r.USUARIO_ID, r.USUARIO, r.PERFIL, r.UNIDADE, r.DISPOSITIVO_ID, r.DEVICE_ID, r.DISPOSITIVO_NOME, r.RESTRITO, r.OPERACAO_ID, r.RESULTADO, r.DETALHE, r.DADOS_JSON, r.HASH_ANTERIOR]
    .map(function (x) { return String(x === undefined || x === null ? '' : x); }).join('|');
}

/** o: { evento, quem (sessão), disp, operacaoId, resultado, detalhe, dados } */
function AutPred_auditar_(o) {
  var d = o.disp || {};
  var lock = null;
  try { lock = LockService.getScriptLock(); if (lock.hasLock && lock.hasLock()) lock = null; else lock.waitLock(10000); } catch (eL) { lock = null; }
  try {
    var props = PropertiesService.getScriptProperties();
    var anterior = String(props.getProperty(AUT_PROP_HASH) || 'INICIO');
    var agora = new Date();
    var r = SGO_DATA.gerarRegistroBase({
      QUANDO: AutPred_agoraTexto_(agora), QUANDO_EM: agora.toISOString(), EVENTO: AutPred_s_(o.evento),
      USUARIO_ID: AutPred_s_(o.quem && o.quem.userId), USUARIO: AutPred_nome_(o.quem), PERFIL: AutPred_perfil_(o.quem),
      UNIDADE: AutPred_s_(d.UNIDADE_NOME), DISPOSITIVO_ID: AutPred_s_(d.ID), DEVICE_ID: AutPred_s_(d.DEVICE_ID), DISPOSITIVO_NOME: AutPred_s_(d.NOME || d.NOME_PROVEDOR),
      RESTRITO: AutPred_restrito_(d) ? 'SIM' : 'NAO', OPERACAO_ID: AutPred_s_(o.operacaoId), RESULTADO: AutPred_s_(o.resultado),
      DETALHE: String(o.detalhe || '').slice(0, 1000), DADOS_JSON: String(AutPred_json_(o.dados) || '').slice(0, 2000), HASH_ANTERIOR: anterior
    });
    r.HASH = AutPred_hash_(AutPred_camposHash_(r));
    SGO_DATA.insert(AUT_ABA_AUDITORIA, SGO_DATA.normalizarObjetoParaSheet(AUT_ABA_AUDITORIA, r));
    props.setProperty(AUT_PROP_HASH, r.HASH);
    return r;
  } catch (e) {
    console.error('Automação predial, registro: ' + ((e && e.message) || e));
    return null;
  } finally { if (lock) try { lock.releaseLock(); } catch (e2) {} }
}

function AutPred_conferirIntegridade_() {
  var lista = AutPred_ler_(AUT_ABA_AUDITORIA);
  var problemas = [], porAnterior = {};
  lista.forEach(function (r) { porAnterior[AutPred_s_(r.HASH_ANTERIOR)] = r; });
  var vistos = 0, anterior = 'INICIO', atual = porAnterior['INICIO'];
  while (atual && vistos <= lista.length) {
    vistos++;
    if (AutPred_hash_(AutPred_camposHash_(atual)) !== AutPred_s_(atual.HASH)) problemas.push('Linha ' + AutPred_s_(atual.ID) + ' (' + AutPred_s_(atual.QUANDO) + '): o conteúdo não bate com o resumo gravado (linha alterada depois de registrada).');
    anterior = AutPred_s_(atual.HASH);
    atual = porAnterior[anterior];
  }
  if (vistos < lista.length) problemas.push((lista.length - vistos) + ' linha(s) fora da corrente (linha apagada, incluída à mão ou alterada no resumo).');
  var ultimo = String(PropertiesService.getScriptProperties().getProperty(AUT_PROP_HASH) || 'INICIO');
  if (lista.length && anterior !== ultimo) problemas.push('O último resumo guardado não é o fim da corrente (linha do fim apagada ou alterada).');
  return { ok: !problemas.length, total: lista.length, problemas: problemas,
    texto: problemas.length ? 'Registro com problema: ' + problemas.join(' ') : 'Registro íntegro: ' + lista.length + ' linha(s) conferidas, nenhuma alterada ou apagada.' };
}

// ------------------------------------------------------------
// SESSÃO, VISIBILIDADE E PERMISSÕES (sempre no servidor)
// ------------------------------------------------------------
function AutPred_sessao_(sessionId) {
  var s = exigirSessao(sessionId);
  if (AutPred_perfil_(s) === 'CLIENTE') throw new Error('Não foi possível abrir a Segurança e automação predial: esta área é da equipe interna da Metrolabs. Use o menu para voltar ao Início.');
  return s;
}

/** Permissões ativas e vigentes do usuário: { dispositivoId: 'VER'|'ACIONAR' }. */
function AutPred_permissoesDe_(userId, lista) {
  var out = {}, agora = Date.now(), uid = AutPred_s_(userId);
  (lista || AutPred_ler_(AUT_ABA_PERMISSOES)).forEach(function (p) {
    if (AutPred_s_(p.USUARIO_ID) !== uid || AutPred_s_(p.STATUS) !== 'ATIVA') return;
    var ini = AutPred_ms_(p.VIGENCIA_INICIO), fim = AutPred_ms_(p.VIGENCIA_FIM);
    if (ini && ini > agora) return;
    if (fim && fim < agora) return;
    var k = AutPred_s_(p.DISPOSITIVO_ID), perm = AutPred_s_(p.PERMISSAO).toUpperCase();
    if (perm === 'ACIONAR' || !out[k]) out[k] = perm;
  });
  return out;
}

/**
 * O que a sessão pode no dispositivo: { ver, acionar, motivo }. Função pura sobre sessão + dispositivo + permissões.
 * Restrito à Diretoria: só DIRETORIA vê; acionar só com permissão ACIONAR expressa. Portão: ADMIN/DIRETORIA tudo;
 * os demais pelo que foi concedido.
 */
function AutPred_direitos_(sessao, disp, perms) {
  var perm = AutPred_s_((perms || {})[AutPred_s_(disp.ID)]).toUpperCase();
  if (AutPred_restrito_(disp)) {
    if (!AutPred_ehDiretoria_(sessao)) return { ver: false, acionar: false, motivo: 'dispositivo restrito à Diretoria' };
    if (perm === 'ACIONAR') return { ver: true, acionar: true, motivo: '' };
    return { ver: true, acionar: false, motivo: 'a porta da Diretoria só é destravada por usuário expressamente autorizado: peça a um diretor para conceder a permissão "Acionar" em Permissões' };
  }
  if (AutPred_administra_(sessao)) return { ver: true, acionar: true, motivo: '' };
  if (perm === 'ACIONAR') return { ver: true, acionar: true, motivo: '' };
  if (perm === 'VER') return { ver: true, acionar: false, motivo: 'você tem permissão só para ver este dispositivo; para abrir, peça ao Administrador ou à Diretoria a permissão "Acionar"' };
  return { ver: false, acionar: false, motivo: 'você não tem permissão neste dispositivo; peça ao Administrador ou à Diretoria' };
}

function AutPred_dispositivos_() { return AutPred_ler_(AUT_ABA_DISPOSITIVOS); }
function AutPred_dispositivo_(id) {
  var d = AutPred_dispositivos_().filter(function (x) { return AutPred_s_(x.ID) === AutPred_s_(id); })[0];
  if (!d) throw new Error('Não foi possível continuar: o dispositivo não foi encontrado. Clique em "Atualizar" e, se ele não aparecer, peça ao Administrador para sincronizar com o Smart Life.');
  return d;
}
/** Dispositivo que a sessão pode ver, ou erro igual ao de "não existe" (não revela o restrito). */
function AutPred_dispositivoVisivel_(sessao, id, perms) {
  var d = AutPred_dispositivo_(id);
  var dir = AutPred_direitos_(sessao, d, perms || AutPred_permissoesDe_(sessao.userId));
  if (!dir.ver) throw new Error('Não foi possível continuar: o dispositivo não foi encontrado ou não está liberado para você. Clique em "Atualizar"; se precisar dele, peça ao Administrador ou à Diretoria.');
  return { disp: d, direitos: dir };
}

// ------------------------------------------------------------
// CONFIGURAÇÃO VISTA PELO MÓDULO
// ------------------------------------------------------------
function AutPred_cfg_() {
  var c = Tuya_cfg_();
  var faltas = [];
  if (!c.temCredencial) faltas.push('faltam o Access ID e o Access Secret da Tuya (Chaves e senhas > Automação predial (Tuya))');
  if (!c.ligado) faltas.push('a automação predial está Desligada no SGO+ (Chaves e senhas > Automação predial (Tuya) > "Automação predial ligada")');
  c.podeLer = !faltas.length;
  c.faltas = faltas;
  return c;
}

/** Modo que vale para o dispositivo agora: REAL só com a integração ligada e o dispositivo homologado pela Diretoria. */
function AutPred_modo_(c, disp) {
  if (!c.podeLer) return { modo: 'SIMULACAO', motivo: 'Simulação: ' + c.faltas.join('; ') + '. O SGO+ registra o que teria feito e nada sai do servidor.' };
  if (AutPred_s_(disp.HOMOLOGADO).toUpperCase() !== 'SIM') return { modo: 'SIMULACAO', motivo: 'Simulação: este dispositivo ainda não foi homologado pela Diretoria (botão "Homologar" na administração, depois do teste presencial). Nada sai do servidor.' };
  return { modo: 'REAL', motivo: '' };
}

// ------------------------------------------------------------
// DESCOBERTA (sincronização com o Smart Life)
// ------------------------------------------------------------
function AutPred_tipoNome_(tipo) { return tipo === 'PORTAO' ? 'Portão ou acesso' : tipo === 'FECHADURA' ? 'Fechadura' : 'Outro'; }

/** Lê a nuvem e cria/atualiza AUT_DISPOSITIVOS. Fechaduras novas entram restritas à Diretoria. Nunca apaga. */
function AutPred_sincronizar_(sessao) {
  var c = AutPred_cfg_();
  if (!c.temCredencial) throw new Error('Não foi possível sincronizar: faltam o Access ID e o Access Secret da Tuya. O responsável pelo sistema grava em Chaves e senhas > Automação predial (Tuya).');
  if (!c.ligado) throw new Error('Não foi possível sincronizar: a automação predial está Desligada no SGO+. O responsável pelo sistema liga em Chaves e senhas > Automação predial (Tuya) > "Automação predial ligada". A sincronização só lê (nenhum comando é enviado).');
  AutPred_bootstrap_();
  var lista = Tuya_listarDispositivos_(c);
  var existentes = {};
  AutPred_dispositivos_().forEach(function (d) { existentes[AutPred_s_(d.DEVICE_ID)] = d; });
  var novos = 0, atualizados = 0, problemas = [], agora = SGO_UTILS.nowIso();
  lista.forEach(function (d) {
    var funcoes = { categoria: d.categoria, funcoes: [] }, metodos = [];
    try { funcoes = Tuya_funcoes_(c, d.deviceId); } catch (e) { problemas.push(d.nome + ': comandos não lidos (' + Tuya_limpar_(e && e.message, c) + ')'); }
    var cat = (funcoes.categoria || d.categoria || '').toLowerCase();
    if (TUYA_CATEGORIAS_FECHADURA[cat]) {
      try { var mr = Tuya_fechaduraMetodosRemotos_(c, d.deviceId); metodos = mr.metodos || []; } catch (e2) {}
    }
    var compat = Tuya_compatibilidade_(cat, funcoes.funcoes, metodos);
    var catNome = TUYA_CATEGORIAS_PORTAO[cat] || TUYA_CATEGORIAS_FECHADURA[cat] || (cat ? 'Categoria ' + cat : 'Sem categoria');
    var upd = {
      PROVEDOR: 'TUYA', NOME_PROVEDOR: d.nome, CATEGORIA: cat, CATEGORIA_NOME: catNome, PRODUTO_ID: d.produtoId, PRODUTO_NOME: d.produtoNome, TIPO: compat.tipo,
      ONLINE: d.online ? 'SIM' : 'NAO', ESTADO_JSON: AutPred_json_(d.status), ESTADO_EM: agora, FUNCOES_JSON: AutPred_json_(funcoes.funcoes).slice(0, 8000),
      COMANDO_ABRIR_JSON: compat.comandoAbrir ? AutPred_json_(compat.comandoAbrir) : '', ESTADO_CODIGOS: compat.estadoCodigos.join(','), COMPAT_OK: compat.ok ? 'SIM' : 'NAO',
      COMPAT_MOTIVO: compat.motivo, REMOTO_FECHADURA: compat.remotoFechadura, SINCRONIZADO_EM: agora, ATUALIZADO_EM: agora
    };
    var ex = existentes[d.deviceId];
    if (ex) {
      // comando de abertura ajustado à mão pelo Administrador é preservado
      if (AutPred_s_(ex.COMANDO_ABRIR_JSON) && AutPred_s_(ex.COMANDO_ABRIR_JSON) !== upd.COMANDO_ABRIR_JSON && compat.tipo !== 'FECHADURA') { upd.COMANDO_ABRIR_JSON = ex.COMANDO_ABRIR_JSON; upd.COMPAT_OK = 'SIM'; }
      SGO_DATA.update(AUT_ABA_DISPOSITIVOS, ex.ID, upd);
      atualizados++;
    } else {
      var reg = SGO_DATA.normalizarObjetoParaSheet(AUT_ABA_DISPOSITIVOS, SGO_DATA.gerarRegistroBase(Object.assign({
        DEVICE_ID: d.deviceId, NOME: d.nome, UNIDADE_ID: '', UNIDADE_NOME: '', LOCALIZACAO: '',
        RESTRITO_DIRETORIA: compat.tipo === 'FECHADURA' ? 'SIM' : 'NAO', HOMOLOGADO: 'NAO', ATIVO: 'SIM'
      }, upd)));
      SGO_DATA.insert(AUT_ABA_DISPOSITIVOS, reg);
      novos++;
      AutPred_auditar_({ evento: 'DISPOSITIVO_DESCOBERTO', quem: sessao, disp: reg, resultado: 'OK', detalhe: 'Dispositivo lido do Smart Life: ' + d.nome + ' (' + catNome + '). ' + compat.motivo + (compat.tipo === 'FECHADURA' ? ' Entrou restrito à Diretoria.' : '') });
    }
  });
  AutPred_auditar_({ evento: 'SINCRONIZACAO', quem: sessao, resultado: 'OK', detalhe: lista.length + ' dispositivo(s) lidos; ' + novos + ' novo(s), ' + atualizados + ' atualizado(s).' + (problemas.length ? ' Problemas: ' + problemas.join('; ') : '') });
  try { SGO_DATA.log('AUT_SINCRONIZACAO', AutPred_s_(sessao.usuario), lista.length + ' dispositivo(s), ' + novos + ' novo(s).', 'AUTOMACAO'); } catch (e3) {}
  return { lidos: lista.length, novos: novos, atualizados: atualizados, problemas: problemas };
}

// ------------------------------------------------------------
// ESTADO (leitura) E CONFIRMAÇÃO
// ------------------------------------------------------------
function AutPred_lerEstado_(c, disp) {
  var d = Tuya_dispositivo_(c, disp.DEVICE_ID);
  var upd = { ONLINE: d.online ? 'SIM' : 'NAO', ESTADO_JSON: AutPred_json_(d.status), ESTADO_EM: SGO_UTILS.nowIso(), ATUALIZADO_EM: SGO_UTILS.nowIso() };
  SGO_DATA.update(AUT_ABA_DISPOSITIVOS, disp.ID, upd);
  Object.assign(disp, upd);
  return d;
}

/** Texto curto do estado para a tela (sem valores técnicos crus quando há tradução). */
function AutPred_estadoTexto_(disp) {
  var st = AutPred_deJson_(disp.ESTADO_JSON, []);
  var m = {};
  (st || []).forEach(function (s) { if (s && s.code) m[s.code] = s.value; });
  var partes = [];
  if (disp.TIPO === 'FECHADURA') {
    if (m.lock_motor_state !== undefined) partes.push(m.lock_motor_state === true ? 'destravada' : 'travada');
    if (m.closed_opened !== undefined) partes.push(String(m.closed_opened) === 'open' ? 'porta aberta' : 'porta fechada');
    if (m.residual_electricity !== undefined) partes.push('bateria ' + m.residual_electricity + '%');
    if (!partes.length) partes.push('a fechadura não informa o estado pela API');
  } else {
    if (m.doorcontact_state !== undefined) partes.push(m.doorcontact_state === true ? 'aberto (sensor)' : 'fechado (sensor)');
    if (m.control !== undefined) partes.push('último comando: ' + m.control);
    if (m.switch_1 !== undefined) partes.push(m.switch_1 === true ? 'acionador ligado' : 'acionador em repouso');
    else if (m.switch !== undefined) partes.push(m.switch === true ? 'acionador ligado' : 'acionador em repouso');
    if (m.percent_control !== undefined) partes.push('abertura ' + m.percent_control + '%');
    if (!partes.length) partes.push(st && st.length ? 'estado sem tradução' : 'estado não informado');
  }
  return partes.join(', ');
}

/** Compara o estado antes e depois nos códigos relevantes. { confirmado, detalhe } — função pura. */
function AutPred_confirmarPorEstado_(tipo, codigos, antes, depois, comandoAbrir) {
  var a = {}, d = {};
  (antes || []).forEach(function (s) { if (s && s.code) a[s.code] = s.value; });
  (depois || []).forEach(function (s) { if (s && s.code) d[s.code] = s.value; });
  var lista = (codigos || []).filter(Boolean);
  if (comandoAbrir && comandoAbrir.code && lista.indexOf(comandoAbrir.code) < 0) lista.push(comandoAbrir.code);
  var mudou = [];
  lista.forEach(function (c) { if (JSON.stringify(a[c]) !== JSON.stringify(d[c])) mudou.push(c + ': ' + JSON.stringify(a[c]) + ' -> ' + JSON.stringify(d[c])); });
  if (comandoAbrir && comandoAbrir.code && JSON.stringify(d[comandoAbrir.code]) === JSON.stringify(comandoAbrir.value) && JSON.stringify(a[comandoAbrir.code]) !== JSON.stringify(comandoAbrir.value)) {
    return { confirmado: true, detalhe: 'O dispositivo informou o estado pedido (' + comandoAbrir.code + ' = ' + JSON.stringify(comandoAbrir.value) + ').' };
  }
  if (tipo === 'FECHADURA' && (d.lock_motor_state === true && a.lock_motor_state !== true)) return { confirmado: true, detalhe: 'A fechadura informou "destravada".' };
  if (mudou.length) return { confirmado: true, detalhe: 'O estado do dispositivo mudou depois do comando: ' + mudou.join('; ') + '.' };
  return { confirmado: false, detalhe: 'O dispositivo não informou mudança de estado (' + (lista.length ? lista.join(', ') : 'sem códigos de estado') + '). A API aceitou o comando, mas a execução não foi confirmada.' };
}

/** Relê o estado (e, na fechadura, os registros de abertura) e atualiza o comando. */
function AutPred_conferirExecucao_(c, disp, cmd, quem) {
  var antes = AutPred_deJson_(cmd.ESTADO_ANTES_JSON, []);
  var depois = [];
  try { depois = AutPred_lerEstado_(c, disp).status; } catch (e) {
    return { confirmado: false, detalhe: 'Não foi possível reler o estado: ' + Tuya_limpar_(e && e.message, c) };
  }
  var r = AutPred_confirmarPorEstado_(disp.TIPO, AutPred_s_(disp.ESTADO_CODIGOS).split(',').map(function (x) { return x.trim(); }), antes, depois, AutPred_deJson_(disp.COMANDO_ABRIR_JSON, null));
  if (!r.confirmado && disp.TIPO === 'FECHADURA') {
    var regs = Tuya_fechaduraRegistros_(c, disp.DEVICE_ID, AutPred_ms_(cmd.QUANDO_EM) - 5000, Date.now());
    if (regs.length) r = { confirmado: true, detalhe: 'A fechadura registrou abertura depois da solicitação (' + regs.length + ' registro(s)).' };
  }
  var upd = { ESTADO_DEPOIS_JSON: AutPred_json_(depois), CONFIRMACAO_DETALHE: r.detalhe, ATUALIZADO_EM: SGO_UTILS.nowIso() };
  if (r.confirmado) { upd.SITUACAO = 'CONFIRMADO'; upd.CONFIRMADO_EM = SGO_UTILS.nowIso(); }
  SGO_DATA.update(AUT_ABA_COMANDOS, cmd.ID, upd);
  Object.assign(cmd, upd);
  SGO_DATA.update(AUT_ABA_DISPOSITIVOS, disp.ID, { ULT_CMD_SITUACAO: cmd.SITUACAO, ATUALIZADO_EM: SGO_UTILS.nowIso() });
  AutPred_auditar_({ evento: r.confirmado ? 'EXECUCAO_CONFIRMADA' : 'EXECUCAO_NAO_CONFIRMADA', quem: quem, disp: disp, operacaoId: cmd.OPERACAO_ID, resultado: r.confirmado ? 'CONFIRMADO' : 'SEM_CONFIRMACAO', detalhe: r.detalhe });
  return r;
}

// ------------------------------------------------------------
// COMANDO (único caminho que fala com o dispositivo)
// ------------------------------------------------------------
function AutPred_comandos_() { return AutPred_ler_(AUT_ABA_COMANDOS); }

/** Regras de frequência e repetição. Função pura: devolve '' (pode) ou o motivo. */
function AutPred_podeAgora_(comandos, dispId, userId, agoraMs) {
  var ultDisp = null, porUsuario = 0;
  (comandos || []).forEach(function (x) {
    var em = AutPred_ms_(x.QUANDO_EM);
    if (AutPred_s_(x.AUTORIZACAO) !== 'AUTORIZADO') return;
    if (AutPred_s_(x.DISPOSITIVO_ID) === AutPred_s_(dispId) && (!ultDisp || em > AutPred_ms_(ultDisp.QUANDO_EM))) ultDisp = x;
    if (AutPred_s_(x.SOLICITANTE_ID) === AutPred_s_(userId) && agoraMs - em < 60000) porUsuario++;
  });
  if (porUsuario >= AUT_LIMITE_USUARIO_MIN) return 'você já fez ' + porUsuario + ' comandos no último minuto (limite de ' + AUT_LIMITE_USUARIO_MIN + '); aguarde um minuto';
  if (ultDisp) {
    var dt = (agoraMs - AutPred_ms_(ultDisp.QUANDO_EM)) / 1000;
    if (dt < AUT_INTERVALO_DISPOSITIVO_S) return 'este dispositivo recebeu um comando há ' + Math.round(dt) + ' s (intervalo mínimo de ' + AUT_INTERVALO_DISPOSITIVO_S + ' s); aguarde';
    var sit = AutPred_s_(ultDisp.SITUACAO);
    if ((sit === 'SOLICITADO' || sit === 'ACEITO') && dt < AUT_SEM_RESULTADO_S) return 'o comando anterior (' + AutPred_s_(ultDisp.QUANDO).slice(-5) + ') ainda está sem resultado; use "Conferir agora" ou aguarde ' + Math.ceil(AUT_SEM_RESULTADO_S - dt) + ' s';
  }
  return '';
}

function AutPred_gravarComando_(cmd, upd) {
  upd.ATUALIZADO_EM = SGO_UTILS.nowIso();
  SGO_DATA.update(AUT_ABA_COMANDOS, cmd.ID, upd);
  Object.assign(cmd, upd);
}

/**
 * Executa (ou simula) a abertura. dados = { dispositivoId, operacaoId, confirmacao }.
 * Devolve { comando (registro), texto }. Lança erro com o quê/por quê/o que fazer quando recusa antes de registrar.
 */
function AutPred_executar_(sessao, dados) {
  dados = dados || {};
  var opId = AutPred_s_(dados.operacaoId);
  if (!/^[A-Za-z0-9_-]{8,80}$/.test(opId)) throw new Error('Não foi possível enviar: a solicitação veio sem o identificador da operação. Atualize a página (F5) e tente de novo.');
  AutPred_bootstrap_();
  var comandos = AutPred_comandos_();
  var repetido = comandos.filter(function (x) { return AutPred_s_(x.OPERACAO_ID) === opId; })[0];
  if (repetido) return { comando: AutPred_comandoParaTela_(repetido), texto: 'Esta solicitação já foi processada (' + AutPred_situacaoTexto_(repetido.SITUACAO) + '). Nada foi enviado de novo.', repetido: true };

  var disp = AutPred_dispositivo_(dados.dispositivoId);
  var perms = AutPred_permissoesDe_(sessao.userId);
  var dir = AutPred_direitos_(sessao, disp, perms);
  if (!dir.ver) throw new Error('Não foi possível continuar: o dispositivo não foi encontrado ou não está liberado para você. Clique em "Atualizar"; se precisar dele, peça ao Administrador ou à Diretoria.');
  var c = AutPred_cfg_();
  var modo = AutPred_modo_(c, disp);
  var verbo = disp.TIPO === 'FECHADURA' ? 'DESTRAVAR' : 'ABRIR';
  var base = {
    OPERACAO_ID: opId, QUANDO: AutPred_agoraTexto_(), QUANDO_EM: SGO_UTILS.nowIso(), SOLICITANTE_ID: AutPred_s_(sessao.userId), SOLICITANTE: AutPred_nome_(sessao), PERFIL: AutPred_perfil_(sessao),
    UNIDADE: AutPred_s_(disp.UNIDADE_NOME), DISPOSITIVO_ID: AutPred_s_(disp.ID), DEVICE_ID: AutPred_s_(disp.DEVICE_ID), DISPOSITIVO_NOME: AutPred_s_(disp.NOME || disp.NOME_PROVEDOR), TIPO: AutPred_s_(disp.TIPO),
    COMANDO: verbo, COMANDO_JSON: disp.TIPO === 'FECHADURA' ? '{"fluxo":"password-ticket + password-free/open-door"}' : AutPred_s_(disp.COMANDO_ABRIR_JSON), MODO: modo.modo,
    CORRELACAO: AutPred_s_(disp.ULT_CMD_ID)
  };
  var negar = function (motivo, evento) {
    var reg = SGO_DATA.insert(AUT_ABA_COMANDOS, SGO_DATA.normalizarObjetoParaSheet(AUT_ABA_COMANDOS, SGO_DATA.gerarRegistroBase(Object.assign({}, base, { AUTORIZACAO: 'NEGADO', AUTORIZACAO_MOTIVO: motivo, SITUACAO: 'NEGADO', ATUALIZADO_EM: SGO_UTILS.nowIso() }))));
    AutPred_auditar_({ evento: evento || 'COMANDO_NEGADO', quem: sessao, disp: disp, operacaoId: opId, resultado: 'NEGADO', detalhe: motivo });
    throw new Error('Não foi possível ' + verbo.toLowerCase() + ': ' + motivo + '.');
  };
  if (!dir.acionar) negar(dir.motivo, 'COMANDO_NAO_AUTORIZADO');
  if (AutPred_s_(disp.ATIVO).toUpperCase() !== 'SIM') negar('o dispositivo está desativado no SGO+ (Administrador ou Diretoria reativa em Administrar dispositivos)');
  if (disp.TIPO === 'FECHADURA' && AutPred_s_(dados.confirmacao).toUpperCase() !== 'ABRIR') negar('a porta da Diretoria exige a confirmação adicional: digite ABRIR na caixa de confirmação e confirme de novo');
  if (AutPred_s_(disp.COMPAT_OK).toUpperCase() !== 'SIM') negar('não disponível pela API: ' + AutPred_s_(disp.COMPAT_MOTIVO));
  var freq = AutPred_podeAgora_(comandos, disp.ID, sessao.userId, Date.now());
  if (freq) negar(freq, 'COMANDO_LIMITE');

  // Estado "antes" lido agora na nuvem quando o comando é real: o guardado pode ser velho (ex.: o pulso do acionador já
  // voltou ao repouso depois do último comando) e faria a confirmação não ver a mudança. Se a leitura falhar, usa o guardado.
  var antes = AutPred_deJson_(disp.ESTADO_JSON, []);
  if (modo.modo === 'REAL') { try { antes = AutPred_lerEstado_(c, disp).status; } catch (eAntes) {} }
  var cmd = SGO_DATA.insert(AUT_ABA_COMANDOS, SGO_DATA.normalizarObjetoParaSheet(AUT_ABA_COMANDOS, SGO_DATA.gerarRegistroBase(Object.assign({}, base, {
    AUTORIZACAO: 'AUTORIZADO', AUTORIZACAO_MOTIVO: dir.motivo || (AutPred_administra_(sessao) && !AutPred_restrito_(disp) ? 'perfil ' + AutPred_perfil_(sessao) : 'permissão individual ACIONAR'),
    SITUACAO: 'SOLICITADO', ESTADO_ANTES_JSON: AutPred_json_(antes), ATUALIZADO_EM: SGO_UTILS.nowIso()
  }))));
  SGO_DATA.update(AUT_ABA_DISPOSITIVOS, disp.ID, { ULT_CMD_ID: cmd.ID, ULT_CMD_EM: cmd.QUANDO_EM, ULT_CMD_SITUACAO: 'SOLICITADO', ATUALIZADO_EM: SGO_UTILS.nowIso() });
  AutPred_auditar_({ evento: 'COMANDO_SOLICITADO', quem: sessao, disp: disp, operacaoId: opId, resultado: 'AUTORIZADO', detalhe: verbo + ' solicitado (' + modo.modo + ').' + (modo.motivo ? ' ' + modo.motivo : ''), dados: { comando: base.COMANDO_JSON } });

  if (modo.modo === 'SIMULACAO') {
    AutPred_gravarComando_(cmd, { SITUACAO: 'SIMULADO', CONFIRMACAO_DETALHE: 'Simulação: o SGO+ teria enviado ' + base.COMANDO_JSON + ' ao dispositivo ' + cmd.DEVICE_ID + '. Nada foi enviado. ' + modo.motivo });
    SGO_DATA.update(AUT_ABA_DISPOSITIVOS, disp.ID, { ULT_CMD_SITUACAO: 'SIMULADO', ATUALIZADO_EM: SGO_UTILS.nowIso() });
    AutPred_auditar_({ evento: 'COMANDO_SIMULADO', quem: sessao, disp: disp, operacaoId: opId, resultado: 'SIMULADO', detalhe: cmd.CONFIRMACAO_DETALHE });
    return { comando: AutPred_comandoParaTela_(cmd), texto: 'Simulação registrada: o SGO+ teria mandado ' + verbo.toLowerCase() + ' (nada foi enviado ao dispositivo). ' + modo.motivo };
  }

  // REAL
  var r;
  try {
    if (disp.TIPO === 'FECHADURA') {
      var tk = Tuya_fechaduraTicket_(c, disp.DEVICE_ID);
      r = tk.aceito ? Tuya_fechaduraAbrir_(c, disp.DEVICE_ID, tk.ticketId) : tk;
    } else {
      r = Tuya_enviarComando_(c, disp.DEVICE_ID, [AutPred_deJson_(disp.COMANDO_ABRIR_JSON, null)]);
    }
  } catch (e) {
    r = { aceito: false, http: e && e.tuyaHttp || 0, codigo: e && e.tuyaCodigo || 0, msg: Tuya_limpar_(e && e.message, c), resposta: '', incerto: !!(e && e.tuyaRede) };
  }
  if (!r.aceito) {
    var sit = r.incerto ? 'INCERTO' : 'RECUSADO';
    AutPred_gravarComando_(cmd, { SITUACAO: sit, API_HTTP: r.http ? String(r.http) : '', API_CODIGO: r.codigo ? String(r.codigo) : '', API_TID: AutPred_s_(r.tid), API_RESPOSTA: AutPred_s_(r.resposta), CONFIRMACAO_DETALHE: r.msg });
    SGO_DATA.update(AUT_ABA_DISPOSITIVOS, disp.ID, { ULT_CMD_SITUACAO: sit, ATUALIZADO_EM: SGO_UTILS.nowIso() });
    AutPred_auditar_({ evento: 'COMANDO_RECUSADO', quem: sessao, disp: disp, operacaoId: opId, resultado: sit, detalhe: r.msg, dados: { http: r.http, codigo: r.codigo, tid: r.tid } });
    return { comando: AutPred_comandoParaTela_(cmd), texto: (r.incerto ? 'Sem resposta da Tuya: não se sabe se o comando chegou (' : 'A Tuya não aceitou o comando (') + r.msg + '). Use "Conferir agora" para reler o estado antes de tentar de novo.' };
  }
  AutPred_gravarComando_(cmd, { SITUACAO: 'ACEITO', API_HTTP: String(r.http || ''), API_CODIGO: '0', API_TID: AutPred_s_(r.tid), API_RESPOSTA: AutPred_s_(r.resposta) });
  SGO_DATA.update(AUT_ABA_DISPOSITIVOS, disp.ID, { ULT_CMD_SITUACAO: 'ACEITO', ATUALIZADO_EM: SGO_UTILS.nowIso() });
  AutPred_auditar_({ evento: 'COMANDO_ACEITO', quem: sessao, disp: disp, operacaoId: opId, resultado: 'ACEITO', detalhe: 'A API da Tuya aceitou o comando (HTTP ' + r.http + (r.tid ? ', tid ' + r.tid : '') + '). Aguardando a confirmação do dispositivo.' });
  Utilities.sleep(AUT_CONFIRMACAO_ESPERA_MS);
  var conf = AutPred_conferirExecucao_(c, disp, cmd, sessao);
  if (!conf.confirmado) AutPred_avisarSemConfirmacao_(disp, cmd, sessao);
  return { comando: AutPred_comandoParaTela_(cmd), texto: conf.confirmado ? 'Execução confirmada: ' + conf.detalhe : 'Comando aceito pela API, mas a execução ainda não foi confirmada pelo dispositivo. ' + conf.detalhe + ' Use "Conferir agora" em alguns segundos; se a porta não abriu, trate como não executado.' };
}

/** Aviso à gestão (matriz S66) quando a API aceitou e o dispositivo não confirmou. Nunca derruba o comando. */
function AutPred_avisarSemConfirmacao_(disp, cmd, quem) {
  try {
    if (typeof SGO_notificar_ !== 'function') return;
    var ids = AutPred_usuariosGestao_(AutPred_restrito_(disp));
    if (!ids.length) return;
    SGO_notificar_({ usuarios: ids, titulo: 'Automação predial: comando sem confirmação', canais: ['sgo', 'email'], origem: 'AUTOMACAO', refId: cmd.ID, evento: 'S66',
      texto: 'O comando "' + AutPred_s_(cmd.COMANDO) + '" em ' + AutPred_s_(disp.NOME || disp.NOME_PROVEDOR) + (disp.UNIDADE_NOME ? ' (' + disp.UNIDADE_NOME + ')' : '') + ', pedido por ' + AutPred_s_(cmd.SOLICITANTE) + ' às ' + AutPred_s_(cmd.QUANDO) + ', foi aceito pela API, mas o dispositivo não confirmou a execução. Confira no local e use "Conferir agora" em Segurança e automação predial.' });
  } catch (e) { console.error('Automação predial, aviso: ' + ((e && e.message) || e)); }
}

/** Ids dos usuários de gestão do módulo: Diretoria (sempre) e Administrador (só quando não é restrito). */
function AutPred_usuariosGestao_(soDiretoria) {
  var out = [];
  try {
    SGO_DATA.getAll(SGO_CFG.SHEETS.CAD_USUARIOS).forEach(function (u) {
      var p = AutPred_s_(u.PERFIL).toUpperCase();
      if (AutPred_s_(u.STATUS).toUpperCase() !== 'ATIVO') return;
      if (p === 'DIRETORIA' || (!soDiretoria && p === 'ADMIN')) out.push(AutPred_s_(u.ID));
    });
  } catch (e) {}
  return out;
}

function AutPred_situacaoTexto_(s) {
  return { SOLICITADO: 'Solicitado', ACEITO: 'Aceito pela API, sem confirmação', CONFIRMADO: 'Execução confirmada', RECUSADO: 'Recusado pela API', INCERTO: 'Sem resposta (incerto)',
    NEGADO: 'Negado pelo SGO+', SIMULADO: 'Simulado (nada enviado)' }[AutPred_s_(s)] || AutPred_s_(s);
}

function AutPred_comandoParaTela_(c) {
  return { id: AutPred_s_(c.ID), operacaoId: AutPred_s_(c.OPERACAO_ID), quando: AutPred_s_(c.QUANDO), quandoEm: AutPred_s_(c.QUANDO_EM), solicitante: AutPred_s_(c.SOLICITANTE), perfil: AutPred_s_(c.PERFIL),
    unidade: AutPred_s_(c.UNIDADE), dispositivoId: AutPred_s_(c.DISPOSITIVO_ID), dispositivo: AutPred_s_(c.DISPOSITIVO_NOME), comando: AutPred_s_(c.COMANDO), modo: AutPred_s_(c.MODO),
    autorizacao: AutPred_s_(c.AUTORIZACAO), autorizacaoMotivo: AutPred_s_(c.AUTORIZACAO_MOTIVO), situacao: AutPred_s_(c.SITUACAO), situacaoTexto: AutPred_situacaoTexto_(c.SITUACAO),
    apiHttp: AutPred_s_(c.API_HTTP), apiCodigo: AutPred_s_(c.API_CODIGO), apiTid: AutPred_s_(c.API_TID), confirmadoEm: AutPred_dataBr_(c.CONFIRMADO_EM), detalhe: AutPred_s_(c.CONFIRMACAO_DETALHE),
    podeConferir: (AutPred_s_(c.SITUACAO) === 'ACEITO' || AutPred_s_(c.SITUACAO) === 'INCERTO') && Date.now() - AutPred_ms_(c.QUANDO_EM) < AUT_CONFIRMACAO_JANELA_MIN * 60000 };
}

function AutPred_dispositivoParaTela_(d, dir, sessao, cfg) {
  var modo = AutPred_modo_(cfg, d);
  return { id: AutPred_s_(d.ID), deviceId: AutPred_s_(d.DEVICE_ID), nome: AutPred_s_(d.NOME || d.NOME_PROVEDOR), nomeProvedor: AutPred_s_(d.NOME_PROVEDOR), categoria: AutPred_s_(d.CATEGORIA), categoriaNome: AutPred_s_(d.CATEGORIA_NOME),
    produto: AutPred_s_(d.PRODUTO_NOME), tipo: AutPred_s_(d.TIPO), tipoNome: AutPred_tipoNome_(d.TIPO), unidadeId: AutPred_s_(d.UNIDADE_ID), unidade: AutPred_s_(d.UNIDADE_NOME) || 'Sem unidade definida', localizacao: AutPred_s_(d.LOCALIZACAO),
    restrito: AutPred_restrito_(d), homologado: AutPred_s_(d.HOMOLOGADO).toUpperCase() === 'SIM', homologadoPor: AutPred_s_(d.HOMOLOGADO_POR), homologadoEm: AutPred_dataBr_(d.HOMOLOGADO_EM), ativo: AutPred_s_(d.ATIVO).toUpperCase() !== 'NAO',
    online: AutPred_s_(d.ONLINE).toUpperCase() === 'SIM', estado: AutPred_estadoTexto_(d), estadoEm: AutPred_dataBr_(d.ESTADO_EM), compatOk: AutPred_s_(d.COMPAT_OK).toUpperCase() === 'SIM', compatMotivo: AutPred_s_(d.COMPAT_MOTIVO),
    comandoAbrir: AutPred_s_(d.COMANDO_ABRIR_JSON), remotoFechadura: AutPred_s_(d.REMOTO_FECHADURA), modo: modo.modo, modoMotivo: modo.motivo, sincronizadoEm: AutPred_dataBr_(d.SINCRONIZADO_EM),
    ultComandoEm: AutPred_dataBr_(d.ULT_CMD_EM), ultComandoSituacao: AutPred_situacaoTexto_(d.ULT_CMD_SITUACAO), podeVer: !!dir.ver, podeAcionar: !!dir.acionar, motivoAcionar: dir.motivo || '' };
}

// ------------------------------------------------------------
// ADMINISTRAÇÃO (dispositivo, permissões)
// ------------------------------------------------------------
function AutPred_exigirAdministrador_(sessao, disp) {
  if (!AutPred_administra_(sessao)) throw new Error('Não foi possível continuar: administrar dispositivos e permissões é do Administrador e da Diretoria. Se precisar de uma alteração, peça a um deles.');
  if (disp && AutPred_restrito_(disp) && !AutPred_ehDiretoria_(sessao)) throw new Error('Não foi possível continuar: o dispositivo não foi encontrado ou não está liberado para você.');
}

function AutPred_salvarDispositivo_(sessao, dados) {
  dados = dados || {};
  var disp = AutPred_dispositivo_(dados.id);
  AutPred_exigirAdministrador_(sessao, disp);
  var upd = {}, mudancas = [];
  var nome = AutPred_s_(dados.nome).slice(0, 80);
  if (nome && nome !== AutPred_s_(disp.NOME)) { upd.NOME = nome; mudancas.push('nome: "' + AutPred_s_(disp.NOME) + '" -> "' + nome + '"'); }
  if (dados.unidadeId !== undefined || dados.unidadeNome !== undefined) {
    var uid = AutPred_s_(dados.unidadeId), unome = AutPred_s_(dados.unidadeNome).slice(0, 120);
    if (uid) {
      var u = SGO_DATA.getById(SGO_CFG.SHEETS.CAD_UNIDADES, uid);
      if (!u) throw new Error('Não foi possível gravar: a unidade escolhida não existe mais. Clique em "Atualizar" e escolha de novo.');
      unome = AutPred_s_(u.NOME_UNIDADE) || unome;
    }
    if (uid !== AutPred_s_(disp.UNIDADE_ID) || unome !== AutPred_s_(disp.UNIDADE_NOME)) { upd.UNIDADE_ID = uid; upd.UNIDADE_NOME = unome; mudancas.push('unidade: "' + AutPred_s_(disp.UNIDADE_NOME) + '" -> "' + unome + '"'); }
  }
  if (dados.localizacao !== undefined) { var loc = AutPred_s_(dados.localizacao).slice(0, 120); if (loc !== AutPred_s_(disp.LOCALIZACAO)) { upd.LOCALIZACAO = loc; mudancas.push('localização: "' + AutPred_s_(disp.LOCALIZACAO) + '" -> "' + loc + '"'); } }
  if (dados.ativo !== undefined) { var at = dados.ativo ? 'SIM' : 'NAO'; if (at !== AutPred_s_(disp.ATIVO).toUpperCase()) { upd.ATIVO = at; mudancas.push(at === 'SIM' ? 'reativado' : 'desativado'); } }
  if (dados.restrito !== undefined) {
    if (!AutPred_ehDiretoria_(sessao)) throw new Error('Não foi possível gravar: só a Diretoria marca ou desmarca "Restrito à Diretoria".');
    var rs = dados.restrito ? 'SIM' : 'NAO';
    if (rs !== (AutPred_restrito_(disp) ? 'SIM' : 'NAO')) { upd.RESTRITO_DIRETORIA = rs; mudancas.push(rs === 'SIM' ? 'passou a restrito à Diretoria' : 'deixou de ser restrito à Diretoria'); }
  }
  if (dados.comandoAbrir !== undefined && disp.TIPO !== 'FECHADURA') {
    var cj = AutPred_s_(dados.comandoAbrir);
    if (cj) {
      var obj = AutPred_deJson_(cj, null);
      if (!obj || !AutPred_s_(obj.code) || obj.value === undefined) throw new Error('Não foi possível gravar: o comando de abertura precisa ser um JSON com "code" e "value", por exemplo {"code":"switch_1","value":true}.');
      var funcoes = AutPred_deJson_(disp.FUNCOES_JSON, []);
      if (funcoes.length && !funcoes.some(function (f) { return AutPred_s_(f.code) === AutPred_s_(obj.code); })) throw new Error('Não foi possível gravar: o dispositivo não informa o comando "' + AutPred_s_(obj.code) + '" (comandos suportados: ' + funcoes.map(function (f) { return f.code; }).join(', ') + ').');
      cj = AutPred_json_({ code: AutPred_s_(obj.code), value: obj.value });
      if (cj !== AutPred_s_(disp.COMANDO_ABRIR_JSON)) { upd.COMANDO_ABRIR_JSON = cj; upd.COMPAT_OK = 'SIM'; upd.COMPAT_MOTIVO = 'Comando de abertura definido pela administração: ' + cj; mudancas.push('comando de abertura: ' + cj); }
    }
  }
  if (!mudancas.length) return { mensagem: 'Nada mudou.' };
  upd.ATUALIZADO_EM = SGO_UTILS.nowIso();
  SGO_DATA.update(AUT_ABA_DISPOSITIVOS, disp.ID, upd);
  AutPred_auditar_({ evento: 'DISPOSITIVO_ALTERADO', quem: sessao, disp: Object.assign({}, disp, upd), resultado: 'OK', detalhe: mudancas.join('; ') });
  return { mensagem: 'Dispositivo gravado: ' + mudancas.join('; ') + '.' };
}

/** Homologação pela Diretoria (depois do teste presencial): libera a execução real quando a integração está ligada. */
function AutPred_homologar_(sessao, dados) {
  dados = dados || {};
  if (!AutPred_ehDiretoria_(sessao)) throw new Error('Não foi possível homologar: só a Diretoria homologa um dispositivo, depois do teste presencial. Peça a um diretor.');
  var disp = AutPred_dispositivo_(dados.id);
  var motivo = AutPred_s_(dados.motivo);
  if (motivo.length < 8) throw new Error('Não foi possível homologar: escreva como foi o teste presencial (mínimo de 8 caracteres).');
  var sim = !!dados.homologado;
  if (sim && AutPred_s_(dados.confirmacao).toUpperCase() !== 'HOMOLOGAR') throw new Error('Não foi possível homologar: digite HOMOLOGAR na confirmação.');
  var upd = { HOMOLOGADO: sim ? 'SIM' : 'NAO', HOMOLOGADO_POR: AutPred_nome_(sessao), HOMOLOGADO_EM: SGO_UTILS.nowIso(), ATUALIZADO_EM: SGO_UTILS.nowIso() };
  SGO_DATA.update(AUT_ABA_DISPOSITIVOS, disp.ID, upd);
  AutPred_auditar_({ evento: sim ? 'DISPOSITIVO_HOMOLOGADO' : 'HOMOLOGACAO_RETIRADA', quem: sessao, disp: Object.assign({}, disp, upd), resultado: 'OK', detalhe: motivo });
  try { SGO_DATA.log(sim ? 'AUT_HOMOLOGADO' : 'AUT_HOMOLOGACAO_RETIRADA', AutPred_s_(sessao.usuario), AutPred_s_(disp.NOME || disp.NOME_PROVEDOR) + ': ' + motivo, 'AUTOMACAO'); } catch (e) {}
  return { mensagem: sim ? 'Dispositivo homologado. Com a automação ligada em Chaves e senhas, os comandos passam a ser reais.' : 'Homologação retirada: o dispositivo volta à simulação.' };
}

function AutPred_usuariosInternos_() {
  return SGO_DATA.getAll(SGO_CFG.SHEETS.CAD_USUARIOS).filter(function (u) { return AutPred_s_(u.STATUS).toUpperCase() === 'ATIVO' && AUT_PERFIS_INTERNOS.indexOf(AutPred_s_(u.PERFIL).toUpperCase()) >= 0; })
    .map(function (u) { return { id: AutPred_s_(u.ID), login: AutPred_s_(u.USUARIO), nome: AutPred_s_(u.NOME) || AutPred_s_(u.USUARIO), perfil: AutPred_s_(u.PERFIL).toUpperCase() }; })
    .sort(function (a, b) { return a.nome.localeCompare(b.nome); });
}

function AutPred_conceder_(sessao, dados) {
  dados = dados || {};
  var disp = AutPred_dispositivo_(dados.dispositivoId);
  AutPred_exigirAdministrador_(sessao, disp);
  var perm = AutPred_s_(dados.permissao).toUpperCase();
  if (!AUT_PERMISSOES_VALIDAS[perm]) throw new Error('Não foi possível conceder: a permissão precisa ser "Ver" ou "Acionar".');
  var u = AutPred_usuariosInternos_().filter(function (x) { return x.id === AutPred_s_(dados.usuarioId); })[0];
  if (!u) throw new Error('Não foi possível conceder: escolha um usuário interno ativo da lista.');
  if (AutPred_restrito_(disp) && u.perfil !== 'DIRETORIA') throw new Error('Não foi possível conceder: a porta da Diretoria só pode ser liberada para usuários do perfil Diretoria.');
  var motivo = AutPred_s_(dados.motivo);
  if (motivo.length < 5) throw new Error('Não foi possível conceder: escreva o motivo (mínimo de 5 caracteres). Fica registrado com o seu nome.');
  var fim = '';
  if (AutPred_s_(dados.vigenciaFim)) {
    var m = AutPred_s_(dados.vigenciaFim).match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) throw new Error('Não foi possível conceder: a data de fim da vigência precisa estar no formato aaaa-mm-dd (use o calendário do campo).');
    var dt = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 23, 59, 59);
    if (dt.getTime() < Date.now()) throw new Error('Não foi possível conceder: a data de fim da vigência já passou.');
    fim = dt.toISOString();
  }
  // a permissão anterior do mesmo usuário no mesmo dispositivo é revogada (uma vigente por vez)
  AutPred_ler_(AUT_ABA_PERMISSOES).forEach(function (p) {
    if (AutPred_s_(p.USUARIO_ID) === u.id && AutPred_s_(p.DISPOSITIVO_ID) === AutPred_s_(disp.ID) && AutPred_s_(p.STATUS) === 'ATIVA') {
      SGO_DATA.update(AUT_ABA_PERMISSOES, p.ID, { STATUS: 'REVOGADA', REVOGADA_POR: AutPred_nome_(sessao), REVOGADA_EM: SGO_UTILS.nowIso(), REVOGADA_MOTIVO: 'Substituída por nova permissão.' });
    }
  });
  var reg = SGO_DATA.insert(AUT_ABA_PERMISSOES, SGO_DATA.normalizarObjetoParaSheet(AUT_ABA_PERMISSOES, SGO_DATA.gerarRegistroBase({
    USUARIO_ID: u.id, USUARIO_LOGIN: u.login, USUARIO_NOME: u.nome, USUARIO_PERFIL: u.perfil, DISPOSITIVO_ID: AutPred_s_(disp.ID), DEVICE_ID: AutPred_s_(disp.DEVICE_ID), DISPOSITIVO_NOME: AutPred_s_(disp.NOME || disp.NOME_PROVEDOR),
    PERMISSAO: perm, VIGENCIA_INICIO: SGO_UTILS.nowIso(), VIGENCIA_FIM: fim, CONCEDIDA_POR_ID: AutPred_s_(sessao.userId), CONCEDIDA_POR: AutPred_nome_(sessao), CONCEDIDA_EM: SGO_UTILS.nowIso(), MOTIVO: motivo, STATUS: 'ATIVA'
  })));
  AutPred_auditar_({ evento: 'PERMISSAO_CONCEDIDA', quem: sessao, disp: disp, resultado: 'OK', detalhe: perm + ' para ' + u.nome + ' (' + u.perfil + ')' + (fim ? ' até ' + AutPred_dataBr_(fim) : ', sem data de fim') + '. Motivo: ' + motivo, dados: { permissaoId: reg.ID, usuarioId: u.id } });
  try { SGO_DATA.log('AUT_PERMISSAO_CONCEDIDA', AutPred_s_(sessao.usuario), perm + ' em ' + AutPred_s_(disp.NOME || disp.NOME_PROVEDOR) + ' para ' + u.login, 'AUTOMACAO'); } catch (e) {}
  return { mensagem: 'Permissão "' + AUT_PERMISSOES_VALIDAS[perm] + '" concedida a ' + u.nome + '.' };
}

function AutPred_revogar_(sessao, dados) {
  dados = dados || {};
  var p = AutPred_ler_(AUT_ABA_PERMISSOES).filter(function (x) { return AutPred_s_(x.ID) === AutPred_s_(dados.id); })[0];
  if (!p) throw new Error('Não foi possível revogar: a permissão não foi encontrada. Clique em "Atualizar".');
  var disp = AutPred_dispositivo_(p.DISPOSITIVO_ID);
  AutPred_exigirAdministrador_(sessao, disp);
  if (AutPred_s_(p.STATUS) !== 'ATIVA') return { mensagem: 'A permissão já estava revogada.' };
  var motivo = AutPred_s_(dados.motivo);
  if (motivo.length < 5) throw new Error('Não foi possível revogar: escreva o motivo (mínimo de 5 caracteres).');
  SGO_DATA.update(AUT_ABA_PERMISSOES, p.ID, { STATUS: 'REVOGADA', REVOGADA_POR: AutPred_nome_(sessao), REVOGADA_EM: SGO_UTILS.nowIso(), REVOGADA_MOTIVO: motivo });
  AutPred_auditar_({ evento: 'PERMISSAO_REVOGADA', quem: sessao, disp: disp, resultado: 'OK', detalhe: AutPred_s_(p.PERMISSAO) + ' de ' + AutPred_s_(p.USUARIO_NOME) + ' revogada. Motivo: ' + motivo, dados: { permissaoId: p.ID } });
  return { mensagem: 'Permissão de ' + AutPred_s_(p.USUARIO_NOME) + ' revogada.' };
}

function AutPred_permissaoParaTela_(p) {
  return { id: AutPred_s_(p.ID), usuarioId: AutPred_s_(p.USUARIO_ID), usuario: AutPred_s_(p.USUARIO_NOME), login: AutPred_s_(p.USUARIO_LOGIN), perfil: AutPred_s_(p.USUARIO_PERFIL), dispositivoId: AutPred_s_(p.DISPOSITIVO_ID),
    dispositivo: AutPred_s_(p.DISPOSITIVO_NOME), permissao: AutPred_s_(p.PERMISSAO), permissaoTexto: AUT_PERMISSOES_VALIDAS[AutPred_s_(p.PERMISSAO)] || AutPred_s_(p.PERMISSAO), vigenciaFim: AutPred_dataBr_(p.VIGENCIA_FIM),
    vencida: !!(AutPred_ms_(p.VIGENCIA_FIM) && AutPred_ms_(p.VIGENCIA_FIM) < Date.now()), concedidaPor: AutPred_s_(p.CONCEDIDA_POR), concedidaEm: AutPred_dataBr_(p.CONCEDIDA_EM), motivo: AutPred_s_(p.MOTIVO), status: AutPred_s_(p.STATUS),
    revogadaPor: AutPred_s_(p.REVOGADA_POR), revogadaEm: AutPred_dataBr_(p.REVOGADA_EM) };
}

// ------------------------------------------------------------
// PENDÊNCIAS (Início): comando aceito sem confirmação nas últimas 24 h
// ------------------------------------------------------------
function AutPred_fontePendencias_(add, ctx) {
  try {
    if (!ctx || ctx.cliente) return;
    var dirs = AutPred_usuariosGestao_(true);
    var agora = Date.now();
    AutPred_comandos_().forEach(function (c) {
      var sit = AutPred_s_(c.SITUACAO), em = AutPred_ms_(c.QUANDO_EM);
      if ((sit !== 'ACEITO' && sit !== 'INCERTO') || agora - em > 86400000 || agora - em < 120000) return;
      var restrito = AutPred_s_(c.TIPO) === 'FECHADURA';
      add(Pend_item_('automacao_sem_confirmacao', { id: 'AUT:' + c.ID, gravidade: 'ATENCAO', titulo: 'Comando sem confirmação: ' + AutPred_s_(c.DISPOSITIVO_NOME) + (c.UNIDADE ? ' (' + c.UNIDADE + ')' : ''),
        detalhe: AutPred_s_(c.COMANDO) + ' pedido por ' + AutPred_s_(c.SOLICITANTE) + ' às ' + AutPred_s_(c.QUANDO) + ': a API aceitou, o dispositivo não confirmou.',
        oQueFazer: 'confira no local e use "Conferir agora" em Segurança e automação predial', publico: restrito ? 'DIRETORIA' : 'GESTAO', paraUsuarios: restrito ? dirs : [], vencimento: '', dias: null }));
    });
  } catch (e) { console.error('Automação predial, pendências: ' + ((e && e.message) || e)); }
}

// ------------------------------------------------------------
// API DA TELA — AutPred_api(sessionId, acao, dados)
// ------------------------------------------------------------
function AutPred_resposta_(fn) {
  try { return JSON.parse(JSON.stringify(Object.assign({ ok: true }, fn() || {}))); }
  catch (e) { return { ok: false, message: String((e && e.message) || e) }; }
}

function AutPred_api(sessionId, acao, dados) {
  return AutPred_resposta_(function () {
    var sessao = AutPred_sessao_(sessionId);
    dados = dados || {};
    acao = String(acao || '');
    var adm = AutPred_administra_(sessao);
    if (acao === 'iniciar') {
      var pm = AutPred_permissoesDe_(sessao.userId);
      return { mostrarMenu: adm || AutPred_ehDiretoria_(sessao) || Object.keys(pm).length > 0, podeAdministrar: adm, ehDiretoria: AutPred_ehDiretoria_(sessao) };
    }
    if (acao === 'painel') return AutPred_painel_(sessao);
    if (acao === 'sincronizar') { AutPred_exigirAdministrador_(sessao); var r = AutPred_sincronizar_(sessao); var p = AutPred_painel_(sessao); p.mensagem = 'Sincronizado com o Smart Life: ' + r.lidos + ' dispositivo(s) lido(s), ' + r.novos + ' novo(s), ' + r.atualizados + ' atualizado(s).' + (r.problemas.length ? ' Problemas: ' + r.problemas.join('; ') : ''); return p; }
    if (acao === 'estado') {
      var v = AutPred_dispositivoVisivel_(sessao, dados.dispositivoId);
      var c = AutPred_cfg_();
      if (!c.podeLer) return { dispositivo: AutPred_dispositivoParaTela_(v.disp, v.direitos, sessao, c), mensagem: 'Estado não relido: ' + c.faltas.join('; ') + '. Mostrando o último estado guardado.' };
      AutPred_lerEstado_(c, v.disp);
      AutPred_auditar_({ evento: 'ESTADO_CONSULTADO', quem: sessao, disp: v.disp, resultado: 'OK', detalhe: AutPred_estadoTexto_(v.disp) });
      return { dispositivo: AutPred_dispositivoParaTela_(v.disp, v.direitos, sessao, c), mensagem: 'Estado lido agora: ' + AutPred_estadoTexto_(v.disp) + '.' };
    }
    if (acao === 'comando') { var e = AutPred_executar_(sessao, dados); e.dispositivo = (function () { var vv = AutPred_dispositivoVisivel_(sessao, dados.dispositivoId); return AutPred_dispositivoParaTela_(vv.disp, vv.direitos, sessao, AutPred_cfg_()); })(); return e; }
    if (acao === 'conferir') {
      var cmd = AutPred_comandos_().filter(function (x) { return AutPred_s_(x.ID) === AutPred_s_(dados.comandoId); })[0];
      if (!cmd) throw new Error('Não foi possível conferir: o comando não foi encontrado. Clique em "Atualizar".');
      var vc = AutPred_dispositivoVisivel_(sessao, cmd.DISPOSITIVO_ID);
      var cc = AutPred_cfg_();
      if (!cc.podeLer) throw new Error('Não foi possível conferir: ' + cc.faltas.join('; ') + '.');
      if (AutPred_s_(cmd.SITUACAO) !== 'ACEITO' && AutPred_s_(cmd.SITUACAO) !== 'INCERTO') return { comando: AutPred_comandoParaTela_(cmd), mensagem: 'Este comando já tem resultado: ' + AutPred_situacaoTexto_(cmd.SITUACAO) + '.' };
      var conf = AutPred_conferirExecucao_(cc, vc.disp, cmd, sessao);
      return { comando: AutPred_comandoParaTela_(cmd), dispositivo: AutPred_dispositivoParaTela_(vc.disp, vc.direitos, sessao, cc), mensagem: conf.confirmado ? 'Execução confirmada: ' + conf.detalhe : conf.detalhe };
    }
    if (acao === 'historico') {
      var vh = AutPred_dispositivoVisivel_(sessao, dados.dispositivoId);
      var lista = AutPred_comandos_().filter(function (x) { return AutPred_s_(x.DISPOSITIVO_ID) === AutPred_s_(vh.disp.ID); })
        .sort(function (a, b) { return AutPred_ms_(b.QUANDO_EM) - AutPred_ms_(a.QUANDO_EM); }).slice(0, AUT_HISTORICO_MAX).map(AutPred_comandoParaTela_);
      return { comandos: lista, dispositivo: AutPred_dispositivoParaTela_(vh.disp, vh.direitos, sessao, AutPred_cfg_()) };
    }
    if (acao === 'dispositivoSalvar') return AutPred_salvarDispositivo_(sessao, dados);
    if (acao === 'homologar') return AutPred_homologar_(sessao, dados);
    if (acao === 'permissoes') {
      AutPred_exigirAdministrador_(sessao);
      var dirPerm = AutPred_ehDiretoria_(sessao);
      var disps = AutPred_dispositivos_().filter(function (d) { return dirPerm || !AutPred_restrito_(d); });
      var ids = {};
      disps.forEach(function (d) { ids[AutPred_s_(d.ID)] = true; });
      return { usuarios: AutPred_usuariosInternos_(), dispositivos: disps.map(function (d) { return { id: AutPred_s_(d.ID), nome: AutPred_s_(d.NOME || d.NOME_PROVEDOR), restrito: AutPred_restrito_(d), unidade: AutPred_s_(d.UNIDADE_NOME) }; }),
        permissoes: AutPred_ler_(AUT_ABA_PERMISSOES).filter(function (p) { return ids[AutPred_s_(p.DISPOSITIVO_ID)]; }).sort(function (a, b) { return AutPred_ms_(b.CONCEDIDA_EM) - AutPred_ms_(a.CONCEDIDA_EM); }).map(AutPred_permissaoParaTela_) };
    }
    if (acao === 'permissaoConceder') return AutPred_conceder_(sessao, dados);
    if (acao === 'permissaoRevogar') return AutPred_revogar_(sessao, dados);
    if (acao === 'auditoria') {
      AutPred_exigirAdministrador_(sessao);
      var dirAud = AutPred_ehDiretoria_(sessao);
      var itens = AutPred_ler_(AUT_ABA_AUDITORIA).filter(function (r) { return dirAud || AutPred_s_(r.RESTRITO) !== 'SIM'; })
        .sort(function (a, b) { return AutPred_ms_(b.QUANDO_EM) - AutPred_ms_(a.QUANDO_EM); }).slice(0, Math.min(500, Number(dados.limite) || 200))
        .map(function (r) { return { id: AutPred_s_(r.ID), quando: AutPred_s_(r.QUANDO), evento: AutPred_s_(r.EVENTO), usuario: AutPred_s_(r.USUARIO), perfil: AutPred_s_(r.PERFIL), unidade: AutPred_s_(r.UNIDADE), dispositivo: AutPred_s_(r.DISPOSITIVO_NOME), resultado: AutPred_s_(r.RESULTADO), detalhe: AutPred_s_(r.DETALHE), operacaoId: AutPred_s_(r.OPERACAO_ID), hash: AutPred_s_(r.HASH).slice(0, 12) }; });
      return { itens: itens };
    }
    if (acao === 'integridade') { AutPred_exigirAdministrador_(sessao); var ci = AutPred_conferirIntegridade_(); AutPred_auditar_({ evento: 'INTEGRIDADE_CONFERIDA', quem: sessao, resultado: ci.ok ? 'OK' : 'PROBLEMA', detalhe: ci.texto }); return ci; }
    if (acao === 'unidades') {
      AutPred_exigirAdministrador_(sessao);
      var clientes = {};
      try { SGO_DATA.getAll(SGO_CFG.SHEETS.CAD_CLIENTES).forEach(function (c2) { clientes[AutPred_s_(c2.ID)] = AutPred_s_(c2.NOME_FANTASIA) || AutPred_s_(c2.RAZAO_SOCIAL); }); } catch (e2) {}
      return { unidades: SGO_DATA.getAll(SGO_CFG.SHEETS.CAD_UNIDADES).filter(function (u) { return AutPred_s_(u.STATUS).toUpperCase() === 'ATIVO'; })
        .map(function (u) { return { id: AutPred_s_(u.ID), nome: AutPred_s_(u.NOME_UNIDADE), cliente: clientes[AutPred_s_(u.CLIENTE_ID)] || '', cidade: AutPred_s_(u.CIDADE) }; })
        .sort(function (a, b) { return (a.cliente + a.nome).localeCompare(b.cliente + b.nome); }) };
    }
    throw new Error('Não foi possível continuar: ação desconhecida. Atualize a página (F5) e tente de novo.');
  });
}

/** Painel: dispositivos visíveis agrupados por unidade, configuração e direitos. Nada restrito sai para quem não é Diretoria. */
function AutPred_painel_(sessao) {
  AutPred_bootstrap_();
  var c = AutPred_cfg_();
  var perms = AutPred_permissoesDe_(sessao.userId);
  var todos = AutPred_dispositivos_();
  var visiveis = [], restritosOcultos = 0, semPermissao = 0;
  todos.forEach(function (d) {
    var dir = AutPred_direitos_(sessao, d, perms);
    if (dir.ver) { if (AutPred_s_(d.ATIVO).toUpperCase() !== 'NAO' || AutPred_administra_(sessao)) visiveis.push(AutPred_dispositivoParaTela_(d, dir, sessao, c)); }
    else if (AutPred_restrito_(d)) restritosOcultos++;
    else semPermissao++;
  });
  var porUnidade = {};
  visiveis.forEach(function (d) { (porUnidade[d.unidade] = porUnidade[d.unidade] || []).push(d); });
  var unidades = Object.keys(porUnidade).sort().map(function (u) { return { nome: u, dispositivos: porUnidade[u].sort(function (a, b) { return a.nome.localeCompare(b.nome); }) }; });
  var ultimos = AutPred_comandos_().filter(function (x) { return visiveis.some(function (d) { return d.id === AutPred_s_(x.DISPOSITIVO_ID); }); })
    .sort(function (a, b) { return AutPred_ms_(b.QUANDO_EM) - AutPred_ms_(a.QUANDO_EM); }).slice(0, 12).map(AutPred_comandoParaTela_);
  return {
    agora: AutPred_agoraTexto_(), unidades: unidades, total: visiveis.length, totalCadastrados: todos.length,
    restritosOcultos: AutPred_ehAdmin_(sessao) ? restritosOcultos : 0, semPermissao: AutPred_administra_(sessao) ? 0 : semPermissao,
    config: { ligado: c.ligado, temCredencial: c.temCredencial, podeLer: c.podeLer, faltas: c.faltas, regiao: c.regiaoNome },
    podeAdministrar: AutPred_administra_(sessao), ehDiretoria: AutPred_ehDiretoria_(sessao), ehAdmin: AutPred_ehAdmin_(sessao), ultimosComandos: ultimos
  };
}
