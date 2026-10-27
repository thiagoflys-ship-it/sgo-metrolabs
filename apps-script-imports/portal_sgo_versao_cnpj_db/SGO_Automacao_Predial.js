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
 *  3. Portões: toda a equipe interna vê, abre e fecha (23/10/2026, dono: "os colaboradores no celular não estão vendo
 *     Portões; somente a porta da Diretoria fica oculta para eles"). No registro, o colaborador vê só os próprios
 *     comandos; o Administrador e os diretores veem todos. A porta da Diretoria exige permissão ACIONAR mesmo para a
 *     Diretoria (usuário expressamente autorizado), concedida só pelo responsável pelo sistema a diretores.
 *  4. Comando: identificador da operação (idempotente: o mesmo id devolve o mesmo resultado, nunca executa de novo);
 *     no máximo 1 comando por dispositivo a cada AUT_INTERVALO_DISPOSITIVO_S, AUT_LIMITE_USUARIO_MIN por pessoa por
 *     minuto e nunca o mesmo comando enquanto o anterior está sem resultado; todo comando só com a confirmação da janela
 *     ("Sim, abrir agora"): token de uso único de 60 s emitido pelo servidor (AutPred_prepararComando_), sem nada digitado.
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
  'ULT_CMD_ID', 'ULT_CMD_EM', 'ULT_CMD_SITUACAO', 'SINCRONIZADO_EM', 'ATUALIZADO_EM', 'CRIADO_EM',
  'ACIONAMENTO', 'HOMOLOGADO_FECHAR', 'HOMOLOGADO_FECHAR_POR', 'HOMOLOGADO_FECHAR_EM', 'AUTO_ABRIR', 'AUTO_ABRIR_POR', 'AUTO_ABRIR_EM', 'ULT_CMD_COMANDO', 'PERCURSO_S'];
var AUT_COLUNAS_NOVAS_20261022 = ['ACIONAMENTO', 'HOMOLOGADO_FECHAR', 'HOMOLOGADO_FECHAR_POR', 'HOMOLOGADO_FECHAR_EM', 'AUTO_ABRIR', 'AUTO_ABRIR_POR', 'AUTO_ABRIR_EM', 'ULT_CMD_COMANDO', 'PERCURSO_S'];
var AUT_COLUNAS_PERMISSOES = ['ID', 'USUARIO_ID', 'USUARIO_LOGIN', 'USUARIO_NOME', 'USUARIO_PERFIL', 'DISPOSITIVO_ID', 'DEVICE_ID', 'DISPOSITIVO_NOME', 'PERMISSAO',
  'VIGENCIA_INICIO', 'VIGENCIA_FIM', 'CONCEDIDA_POR_ID', 'CONCEDIDA_POR', 'CONCEDIDA_EM', 'MOTIVO', 'STATUS', 'REVOGADA_POR', 'REVOGADA_EM', 'REVOGADA_MOTIVO', 'CRIADO_EM'];
var AUT_COLUNAS_COMANDOS = ['ID', 'OPERACAO_ID', 'QUANDO', 'QUANDO_EM', 'SOLICITANTE_ID', 'SOLICITANTE', 'PERFIL', 'UNIDADE', 'DISPOSITIVO_ID', 'DEVICE_ID', 'DISPOSITIVO_NOME', 'TIPO',
  'COMANDO', 'COMANDO_JSON', 'MODO', 'AUTORIZACAO', 'AUTORIZACAO_MOTIVO', 'SITUACAO', 'API_HTTP', 'API_CODIGO', 'API_TID', 'API_RESPOSTA',
  'ESTADO_ANTES_JSON', 'ESTADO_DEPOIS_JSON', 'CONFIRMADO_EM', 'CONFIRMACAO_DETALHE', 'CORRELACAO', 'ATUALIZADO_EM', 'CRIADO_EM', 'ORIGEM'];
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
/** Responsável pelo sistema (SGO_DONOS, SGO_Chaves.js), pelo login. */
function AutPred_ehDonoLogin_(login) {
  try { return typeof Chaves_ehDonoUsuario_ === 'function' && !!Chaves_ehDonoUsuario_(login); } catch (e) { return false; }
}
function AutPred_ehDono_(s) { return AutPred_ehDonoLogin_(s && s.usuario); }
/** Linha de CAD_USUARIOS é de diretor? Mesma regra de AutPred_ehDiretor_. */
function AutPred_usuarioEhDiretor_(u) {
  return !!u && (AutPred_s_(u.PERFIL).toUpperCase() === 'DIRETORIA' || AutPred_s_(u.VINCULO_TRABALHO).toUpperCase() === 'DIRETORIA' || AutPred_ehDonoLogin_(u.USUARIO));
}
/**
 * QUEM É DIRETOR (decisão do dono, 22/10/2026) — helper único do módulo: perfil DIRETORIA, OU vínculo de trabalho
 * DIRETORIA no cadastro de usuários (SGO_Usuarios.js, 7b5dcdf), OU responsável pelo sistema (SGO_DONOS). O vínculo
 * não está na sessão: é lido do cadastro uma vez por chamada.
 */
function AutPred_ehDiretor_(s) {
  if (!s) return false;
  if (s._autDiretor !== undefined) return s._autDiretor;
  var r = AutPred_perfil_(s) === 'DIRETORIA' || AutPred_ehDono_(s);
  if (!r && s.userId) {
    try { var u = SGO_DATA.getById(SGO_CFG.SHEETS.CAD_USUARIOS, s.userId); r = !!(u && AutPred_s_(u.VINCULO_TRABALHO).toUpperCase() === 'DIRETORIA'); } catch (e) {}
  }
  try { s._autDiretor = r; } catch (e2) {}
  return r;
}
function AutPred_ehAdmin_(s) { return AutPred_perfil_(s) === 'ADMIN'; }
/** Administra o módulo: Administrador e diretores (o Gestor não entra aqui de propósito). */
function AutPred_administra_(s) { return AutPred_ehAdmin_(s) || AutPred_ehDiretor_(s); }
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
  // garantirTabela_ não acrescenta coluna a aba que já existe (em produção, AUT_DISPOSITIVOS veio antes destas)
  if (typeof CertCal_garantirColuna_ === 'function') {
    AUT_COLUNAS_NOVAS_20261022.forEach(function (col) { CertCal_garantirColuna_(AUT_ABA_DISPOSITIVOS, col); });
    CertCal_garantirColuna_(AUT_ABA_COMANDOS, 'ORIGEM');
  }
}

// ------------------------------------------------------------
// ABRIR E FECHAR (22/10/2026, dono: "o portão da GARAGEM tem que ter abrir e fechar; o de PEDESTRE é só um pulso")
// Medido em produção, só leitura: os dois portões são módulos de pulso (categoria ckmkzq) com switch_1 (pulso) e
// door_control_1 (open/close); o da garagem tem o sensor doorcontact_state. Nenhum aceita "stop".
// ACIONAMENTO: 'PULSO' (só abrir; fecha manualmente) ou 'ABRIR_FECHAR'. A escolha é do Administrador ou de um diretor em
// Administrar; a tela mostra a sugestão da descoberta.
// 23/10/2026 (dono: "o portão só abre e não fecha; no Smart Life ele mostra abrindo e fechando"): sem escolha gravada, o
// portão com sensor de posição (doorcontact_state) e fechar pela nuvem já entra com abrir e fechar, como no aplicativo;
// sem sensor (pedestre) continua pulso. O fechar passa a valer com a mesma homologação do abrir.
// ------------------------------------------------------------
function AutPred_temSensor_(d) { return (AutPred_deJson_(d && d.ESTADO_JSON, []) || []).some(function (s) { return s && s.code === 'doorcontact_state'; }); }
function AutPred_acionamento_(d) {
  var a = AutPred_s_(d && d.ACIONAMENTO).toUpperCase();
  if (a === 'ABRIR_FECHAR' || a === 'PULSO') return a;
  // 23/10/2026 (dono): o pedestre é só abrir (fecha à mão), mesmo com sensor e door_control_1 na nuvem, iguais aos da
  // garagem; sem escolha gravada, o nome decide
  if (/pedestre/i.test(AutPred_s_(d && (d.NOME || d.NOME_PROVEDOR)))) return 'PULSO';
  return AutPred_comandosPortao_(d).fechar && AutPred_temSensor_(d) ? 'ABRIR_FECHAR' : 'PULSO';
}

/** Função pura: comandos que o portão aceita, pelas funções lidas da nuvem. { abrir, fechar, parar } (cada um {code, value} ou null). */
function AutPred_comandosPortao_(d) {
  var funcoes = AutPred_deJson_(d && d.FUNCOES_JSON, []), por = {};
  (funcoes || []).forEach(function (fn) { if (fn && fn.code) por[String(fn.code)] = fn; });
  var faixa = function (code) { var v = AutPred_deJson_(por[code] && por[code].values, {}); return (v && v.range) || []; };
  var out = { abrir: AutPred_deJson_(d && d.COMANDO_ABRIR_JSON, null), fechar: null, parar: null, sugestao: 'PULSO' };
  ['door_control_1', 'control'].some(function (code) {
    var r = faixa(code);
    if (r.indexOf('close') < 0) return false;
    out.fechar = { code: code, value: 'close' };
    if (r.indexOf('open') >= 0) out.abrirControle = { code: code, value: 'open' };
    if (r.indexOf('stop') >= 0) out.parar = { code: code, value: 'stop' };
    out.sugestao = 'ABRIR_FECHAR';
    return true;
  });
  return out;
}

/**
 * Controle booleano com sensor. Comparação real com Smart Life em 23/10/2026:
 * switch_1=true abre; switch_1=false fecha. door_control_1 pertence ao controle
 * por voz (desativado neste módulo). A confirmação continua sendo pelo sensor.
 */
function AutPred_pulsoComSensor_(d) {
  if (!d || d.TIPO === 'FECHADURA' || !AutPred_temSensor_(d)) return false;
  var cmd = AutPred_deJson_(d.COMANDO_ABRIR_JSON, null);
  return !!(cmd && /^switch/.test(AutPred_s_(cmd.code)) && cmd.value === true);
}
/** Posição pelo sensor: true aberto, false fechado, null sem sensor. */
function AutPred_sensorAberto_(estado) {
  var v = null;
  (estado || []).forEach(function (x) { if (x && x.code === 'doorcontact_state') v = x.value === true; });
  return v;
}
/**
 * Tempo de percurso do portão em segundos. 23/10/2026, medido na garagem real: o módulo informa door_time_1 = 20, mas o
 * portão leva cerca de 40 s (14:20:01 pulso de fechar, 14:20:41 sensor fechado); um pulso aos 29 s parou o motor. Vale o
 * tempo gravado em Administrar (PERCURSO_S); sem ele, o maior entre o informado pelo módulo e 45 s.
 */
function AutPred_percursoS_(d) {
  var gravado = Number(d && d.PERCURSO_S);
  if (gravado > 0) return gravado;
  var m = {};
  (AutPred_deJson_(d && d.ESTADO_JSON, []) || []).forEach(function (x) { if (x && x.code) m[x.code] = x.value; });
  return Math.max(Number(m.door_time_1) || 0, Number(m.tr_timecon) || 0, AUT_PERCURSO_PADRAO_S);
}
/**
 * Hora (ms) da última mudança do sensor de posição, pela sombra do dispositivo (cada ponto vem com a hora). 23/10/2026: o
 * sensor oscila (aberto/fechado no mesmo segundo) quando o portão passa por ele; logo depois de mudar, a posição não é confiável.
 * 0 quando a nuvem não informa. Só leitura.
 */
function AutPred_sensorMudouEm_(c, disp) {
  try {
    var r = Tuya_chamar_(c, 'GET', '/v2.0/cloud/thing/' + encodeURIComponent(AutPred_s_(disp.DEVICE_ID)) + '/shadow/properties', { codes: 'doorcontact_state' });
    var props = (r.j && r.j.success === true && r.j.result && r.j.result.properties) || [];
    var p = props.filter(function (x) { return x && x.code === 'doorcontact_state'; })[0];
    return p ? Number(p.time) || 0 : 0;
  } catch (e) { return 0; }
}
/**
 * Proteção do pulso com sensor (função pura): '' = pode; senão o motivo. Em movimento (dentro do percurso depois do último
 * comando) não manda outro pulso (pararia ou inverteria o portão); abrir só fechado, fechar só aberto.
 */
/** Segundos até o próximo pulso ser aceito (fim do percurso do último comando); 0 = liberado. A tela conta no botão. */
function AutPred_liberaEmS_(d, agoraMs) {
  if (!AutPred_pulsoComSensor_(d) || AutPred_acionamento_(d) !== 'ABRIR_FECHAR') return 0;
  if (['SOLICITADO', 'ACEITO', 'CONFIRMADO'].indexOf(AutPred_s_(d.ULT_CMD_SITUACAO)) < 0) return 0;
  var ult = AutPred_ms_(d.ULT_CMD_EM);
  return ult ? Math.max(0, Math.ceil(AutPred_percursoS_(d) + 2 - ((agoraMs || Date.now()) - ult) / 1000)) : 0;
}

function AutPred_travaPulsoSensor_(d, acao, estado, agoraMs) {
  if (!AutPred_pulsoComSensor_(d) || AutPred_acionamento_(d) !== 'ABRIR_FECHAR') return '';
  agoraMs = agoraMs || Date.now();
  var ult = AutPred_ms_(d.ULT_CMD_EM), perc = AutPred_percursoS_(d);
  var falta = Math.ceil(perc + 2 - (agoraMs - ult) / 1000);
  if (ult && falta > 0 && ['SOLICITADO', 'ACEITO', 'CONFIRMADO'].indexOf(AutPred_s_(d.ULT_CMD_SITUACAO)) >= 0)
    return 'o portão ainda está em movimento (comando das ' + AutPred_hora_(ult) + '); um novo pulso pararia ou inverteria o portão. Aguarde ' + falta + ' s';
  var aberto = AutPred_sensorAberto_(estado);
  if (aberto === null) return 'o sensor do portão não informou a posição; toque em "Ler estado" e tente de novo';
  if (acao === 'ABRIR' && aberto) return 'o portão já está aberto pelo sensor; um pulso agora o fecharia. Para fechar, use "Fechar portão"';
  if (acao === 'FECHAR' && !aberto) return 'o portão já está fechado pelo sensor; um pulso agora o abriria. Para abrir, use "Abrir portão"';
  return '';
}

/** Comando a enviar para a ação ('ABRIR' | 'FECHAR' | 'PARAR') no modo do portão; null = não disponível. */
function AutPred_comandoDaAcao_(d, acao) {
  var cp = AutPred_comandosPortao_(d);
  if (AutPred_acionamento_(d) === 'ABRIR_FECHAR' && AutPred_pulsoComSensor_(d)) return acao === 'PARAR' ? null : { code: cp.abrir.code, value: acao !== 'FECHAR' };
  if (AutPred_acionamento_(d) !== 'ABRIR_FECHAR') return acao === 'ABRIR' ? cp.abrir : null;
  if (acao === 'FECHAR') return cp.fechar;
  if (acao === 'PARAR') return cp.parar;
  return cp.abrirControle || cp.abrir;
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
 * Restrito à Diretoria: só diretor vê (AutPred_ehDiretor_); o responsável pelo sistema aciona por padrão ("minha sala
 * é para o meu login ter acesso", dono, 22/10/2026); os outros diretores só com a permissão ACIONAR que ele concede.
 * Portão: toda a equipe interna vê, abre e fecha (23/10/2026; o cliente nem entra no módulo, AutPred_sessao_).
 */
function AutPred_direitos_(sessao, disp, perms) {
  var perm = AutPred_s_((perms || {})[AutPred_s_(disp.ID)]).toUpperCase();
  if (AutPred_restrito_(disp)) {
    if (!AutPred_ehDiretor_(sessao)) return { ver: false, acionar: false, motivo: 'dispositivo restrito à Diretoria' };
    if (AutPred_ehDono_(sessao)) return { ver: true, acionar: true, motivo: '', padraoDono: true };
    if (perm === 'ACIONAR') return { ver: true, acionar: true, motivo: '' };
    return { ver: true, acionar: false, motivo: 'a porta da Diretoria é destravada pelo responsável pelo sistema; outro diretor só destrava se ele conceder a permissão "Acionar" em Segurança e automação predial > Permissões' };
  }
  if (AutPred_perfil_(sessao) === 'CLIENTE') return { ver: false, acionar: false, motivo: 'área da equipe interna' };
  return { ver: true, acionar: true, motivo: '' };
}

/** Registro: o colaborador vê só os próprios comandos; o Administrador e os diretores veem todos (23/10/2026). */
function AutPred_veComando_(sessao, c) { return AutPred_administra_(sessao) || (!!AutPred_s_(sessao && sessao.userId) && AutPred_s_(c.SOLICITANTE_ID) === AutPred_s_(sessao.userId)); }

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
function AutPred_modo_(c, disp, acao) {
  if (!c.podeLer) return { modo: 'SIMULACAO', motivo: 'Simulação: ' + c.faltas.join('; ') + '. O SGO+ registra o que teria feito e nada sai do servidor.' };
  if (AutPred_s_(disp.HOMOLOGADO).toUpperCase() !== 'SIM') return { modo: 'SIMULACAO', motivo: 'Simulação: este dispositivo ainda não foi homologado pela Diretoria (botão "Homologar" na administração, depois do teste presencial). Nada sai do servidor.' };
  // 23/10/2026: o fechar vale com a mesma homologação do abrir (a homologação própria do fechar deixava o portão só abrindo)
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
  try { if (lista.some(function (d) { return TUYA_CATEGORIAS_FECHADURA[String(d.categoria || '').toLowerCase()]; })) AutPred_garantirRotina_(); } catch (eRot) {}
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
    if (m.door_control_1 !== undefined) partes.push('último comando: ' + ({ open: 'abrir', close: 'fechar' }[String(m.door_control_1)] || m.door_control_1));
    if (m.control !== undefined) partes.push('último comando: ' + m.control);
    if (m.switch_1 !== undefined) partes.push(m.switch_1 === true ? 'acionador ligado' : 'acionador em repouso');
    else if (m.switch !== undefined) partes.push(m.switch === true ? 'acionador ligado' : 'acionador em repouso');
    if (m.percent_control !== undefined) partes.push('abertura ' + m.percent_control + '%');
    if (!partes.length) partes.push(st && st.length ? 'estado sem tradução' : 'estado não informado');
  }
  return partes.join(', ');
}

// ------------------------------------------------------------
// ESTADO DO PORTÃO NA TELA (23/10/2026, dono: "no Smart Life ele mostra abrindo e fechando e avisa que o portão abriu")
// Aberto/Fechado pelo sensor de posição (doorcontact_state); Abrindo…/Fechando… durante o percurso (tr_timecon, ou 30 s)
// depois de um comando de abrir/fechar. A tela aberta relê a cada 5 s pela leitura compartilhada (AutPred_estadosPortoes_).
// ------------------------------------------------------------
var AUT_PERCURSO_PADRAO_S = 60;   // 23/10/2026, medido na garagem real: pulso de fechar às 15:06:22, sensor fechado às 15:07:16 (~55 s)
var AUT_SENSOR_ASSENTAR_S = 5;   // o sensor oscila ao passar o portão; depois de mudar, espera 5 s antes de confiar
var AUT_ESTADO_CACHE = 'AUT_ESTADO_';
var AUT_ESTADO_CACHE_MS = 8000;        // portão em movimento (logo depois de um comando): leitura compartilhada a cada 8 s (27/10/2026; antes 4,5 s)
var AUT_ESTADO_OCIOSO_MS = 600000;     // 27/10/2026: portão parado e sem eventos da Tuya: a nuvem é relida no máximo a cada 10 min
var AUT_ESTADO_RESERVA = 70;   // a tela não lê se o minuto já tem 70 chamadas à Tuya: a folga fica para os comandos e a abertura automática

/** { codigo: 'ABERTO'|'FECHADO'|'ABRINDO'|'FECHANDO'|'', texto, sensor }. Função pura (agoraMs para os testes). */
function AutPred_estadoPortao_(d, agoraMs) {
  agoraMs = agoraMs || Date.now();
  var m = {};
  (AutPred_deJson_(d && d.ESTADO_JSON, []) || []).forEach(function (s) { if (s && s.code) m[s.code] = s.value; });
  var sensor = m.doorcontact_state !== undefined;
  // o alvo é o comando que o SGO+ mandou (o door_control_1 guardado na nuvem não reflete o portão de pulso)
  var alvo = { ABRIR: 'open', FECHAR: 'close' }[AutPred_s_(d && d.ULT_CMD_COMANDO)] || '';
  var percurso = AutPred_percursoS_(d);
  var ult = AutPred_ms_(d && d.ULT_CMD_EM);
  var emCurso = AutPred_acionamento_(d) === 'ABRIR_FECHAR' && ult > 0 && agoraMs - ult >= 0 && agoraMs - ult < (percurso + 5) * 1000 &&
    ['SOLICITADO', 'ACEITO', 'CONFIRMADO'].indexOf(AutPred_s_(d.ULT_CMD_SITUACAO)) >= 0;
  if (emCurso && alvo === 'open' && !(sensor && m.doorcontact_state === true && agoraMs - ult >= percurso * 1000)) return { codigo: 'ABRINDO', texto: 'Abrindo…', sensor: sensor };
  if (emCurso && alvo === 'close' && !(sensor && m.doorcontact_state === false)) return { codigo: 'FECHANDO', texto: 'Fechando…', sensor: sensor };
  if (sensor) return m.doorcontact_state === true ? { codigo: 'ABERTO', texto: 'Aberto', sensor: true } : { codigo: 'FECHADO', texto: 'Fechado', sensor: true };
  return { codigo: '', texto: 'sem sensor de posição', sensor: false };
}

/** Portão dentro do percurso do último comando do SGO+ (mais 15 s de folga): a tela acelera a releitura. */
function AutPred_emMovimento_(disp, agoraMs) {
  var ult = AutPred_ms_(disp && disp.ULT_CMD_EM);
  return !!ult && disp.TIPO !== 'FECHADURA' && (agoraMs || Date.now()) - ult < (AutPred_percursoS_(disp) + 15) * 1000;
}

/**
 * Relê o estado para a tela; grava só quando mudou. 27/10/2026 (cota da Tuya): com eventos da Tuya chegando, usa o que o
 * servidor recebeu (nenhuma chamada); sem eventos, leitura compartilhada entre todas as telas a cada 8 s só no percurso
 * de um comando e a cada 10 min com o portão parado; no modo econômico ou com a cota esgotada, não lê.
 * Devolve 'evento', true (leu a nuvem) ou false (usou o guardado).
 */
function AutPred_lerEstadoCompartilhado_(c, disp) {
  var ev = AutPred_eventoDisp_(disp.DEVICE_ID);
  if (ev) { AutPred_aplicarEvento_(disp, ev, true); return 'evento'; }
  var k = AUT_ESTADO_CACHE + AutPred_s_(disp.DEVICE_ID), cache = null;
  var limite = AutPred_emMovimento_(disp) ? AUT_ESTADO_CACHE_MS : AUT_ESTADO_OCIOSO_MS;
  try { cache = CacheService.getScriptCache(); if (Date.now() - Number(cache.get(k) || 0) <= limite) return false; } catch (e) {}
  if (Tuya_motivoPausa_('TELA')) return false;
  if (typeof Tuya_chamadasNoMinuto_ === 'function' && Tuya_chamadasNoMinuto_() >= AUT_ESTADO_RESERVA) return false;
  try { if (cache) cache.put(k, String(Date.now()), 900); } catch (e2) {}
  var d = Tuya_comOrigem_('TELA', function () { return Tuya_dispositivo_(c, disp.DEVICE_ID); });
  var upd = { ONLINE: d.online ? 'SIM' : 'NAO', ESTADO_JSON: AutPred_json_(d.status) };
  if (upd.ONLINE !== AutPred_s_(disp.ONLINE) || upd.ESTADO_JSON !== AutPred_s_(disp.ESTADO_JSON)) {
    upd.ESTADO_EM = SGO_UTILS.nowIso(); upd.ATUALIZADO_EM = SGO_UTILS.nowIso();
    SGO_DATA.update(AUT_ABA_DISPOSITIVOS, disp.ID, upd);
  }
  Object.assign(disp, upd);
  return true;
}

/**
 * Confirmação tardia (23/10/2026): comando de portão aceito e ainda sem confirmação nos últimos 15 minutos é confirmado
 * quando o sensor chega à posição pedida (o fechar da garagem leva mais que a espera do comando). Usa o estado já lido.
 */
function AutPred_confirmarTardio_(disp) {
  var sit = AutPred_s_(disp.ULT_CMD_SITUACAO);
  if (disp.TIPO === 'FECHADURA' || (sit !== 'ACEITO' && sit !== 'INCERTO') || !AutPred_s_(disp.ULT_CMD_ID)) return false;
  if (Date.now() - AutPred_ms_(disp.ULT_CMD_EM) > AUT_CONFIRMACAO_JANELA_MIN * 60000) return false;
  var cmd = AutPred_comandos_().filter(function (x) { return AutPred_s_(x.ID) === AutPred_s_(disp.ULT_CMD_ID); })[0];
  if (!cmd || ['ACEITO', 'INCERTO'].indexOf(AutPred_s_(cmd.SITUACAO)) < 0) return false;
  var r = AutPred_confirmarPeloSensor_(disp, cmd.COMANDO, AutPred_deJson_(disp.ESTADO_JSON, []));
  if (!r || !r.confirmado) return false;
  var agora = SGO_UTILS.nowIso();
  var upd = { SITUACAO: 'CONFIRMADO', CONFIRMADO_EM: agora, ESTADO_DEPOIS_JSON: AutPred_s_(disp.ESTADO_JSON), CONFIRMACAO_DETALHE: r.detalhe + ' Confirmado pelo sensor às ' + AutPred_hora_(Date.now()) + '.', ATUALIZADO_EM: agora };
  SGO_DATA.update(AUT_ABA_COMANDOS, cmd.ID, upd);
  SGO_DATA.update(AUT_ABA_DISPOSITIVOS, disp.ID, { ULT_CMD_SITUACAO: 'CONFIRMADO', ATUALIZADO_EM: agora });
  disp.ULT_CMD_SITUACAO = 'CONFIRMADO';
  AutPred_auditar_({ evento: 'EXECUCAO_CONFIRMADA', quem: AUT_SISTEMA, disp: disp, operacaoId: cmd.OPERACAO_ID, resultado: 'CONFIRMADO', detalhe: upd.CONFIRMACAO_DETALHE });
  return true;
}

/**
 * Consulta leve da tela (enquanto ela está aberta e visível): estado dos portões que a sessão vê. 27/10/2026: devolve
 * proximaS, o ritmo da próxima consulta da tela (3 s no percurso de um comando; 10 s com eventos; 30 s parado sem eventos;
 * a consulta à tela não gasta cota: só a releitura na nuvem gasta, e ela segue AutPred_lerEstadoCompartilhado_).
 */
function AutPred_estadosPortoes_(sessao) {
  var c = AutPred_cfg_(), perms = AutPred_permissoesDe_(sessao.userId), itens = [], movendo = false, comEventos = false;
  AutPred_dispositivos_().forEach(function (d) {
    if (d.TIPO === 'FECHADURA' || AutPred_s_(d.ATIVO).toUpperCase() === 'NAO') return;
    if (!AutPred_direitos_(sessao, d, perms).ver) return;
    var erro = '', fonte = '';
    if (c.podeLer && (AutPred_temSensor_(d) || AutPred_acionamento_(d) === 'ABRIR_FECHAR')) {
      try { var lido = AutPred_lerEstadoCompartilhado_(c, d); fonte = lido === 'evento' ? 'eventos' : 'consulta'; if (lido === 'evento') comEventos = true; }
      catch (e) { erro = AutPred_erroNuvem_(e, Tuya_limpar_(e && e.message, c), sessao).message; }
    }
    if (AutPred_emMovimento_(d)) movendo = true;
    try { AutPred_confirmarTardio_(d); } catch (eT) {}
    itens.push({ id: AutPred_s_(d.ID), online: AutPred_s_(d.ONLINE).toUpperCase() === 'SIM', estadoPortao: AutPred_estadoPortao_(d), estado: AutPred_estadoTexto_(d),
      ultComandoEm: AutPred_dataBr_(d.ULT_CMD_EM), ultComandoSituacao: AutPred_situacaoTexto_(d.ULT_CMD_SITUACAO), ultComandoCodigo: AutPred_s_(d.ULT_CMD_SITUACAO),
      ultComandoRecente: Date.now() - AutPred_ms_(d.ULT_CMD_EM) < AUT_CONFIRMACAO_JANELA_MIN * 60000, liberaEmS: AutPred_liberaEmS_(d), erro: erro, fonte: fonte,
      estadoLidoEm: AutPred_dataBr_(d.ESTADO_EM) });
  });
  return { itens: itens, hora: AutPred_hora_(Date.now()), proximaS: movendo ? 3 : (comEventos ? 10 : 30), infra: AutPred_infraTela_() };
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

/**
 * Portão com sensor de posição e abrir/fechar (23/10/2026): a execução é o sensor na posição pedida (aberto para ABRIR,
 * fechado para FECHAR), não o eco do comando. null quando a regra não se aplica. Função pura.
 */
function AutPred_confirmarPeloSensor_(disp, comando, estado) {
  if (disp.TIPO === 'FECHADURA' || AutPred_acionamento_(disp) !== 'ABRIR_FECHAR') return null;
  var acao = AutPred_s_(comando);
  if (acao !== 'ABRIR' && acao !== 'FECHAR') return null;
  var v;
  (estado || []).forEach(function (s) { if (s && s.code === 'doorcontact_state') v = s.value; });
  if (v === undefined) return null;
  var quer = acao === 'ABRIR';
  return v === quer ? { confirmado: true, detalhe: 'O sensor do portão informa ' + (quer ? 'aberto' : 'fechado') + '.' }
    : { confirmado: false, emCurso: true, detalhe: 'A nuvem aceitou e o portão ainda não chegou: o sensor informa ' + (v ? 'aberto' : 'fechado') + '. O SGO+ confirma quando o sensor mudar.' };
}

/**
 * Relê o estado (e, na fechadura, os registros de abertura) e atualiza o comando. silencioso = leitura intermediária:
 * sem confirmação, não grava nem registra nada (a última leitura é que registra).
 */
function AutPred_conferirExecucao_(c, disp, cmd, quem, silencioso) {
  var antes = AutPred_deJson_(cmd.ESTADO_ANTES_JSON, []);
  var depois = [];
  try { depois = AutPred_lerEstado_(c, disp).status; } catch (e) {
    return { confirmado: false, detalhe: 'Não foi possível reler o estado: ' + Tuya_limpar_(e && e.message, c) };
  }
  var enviado = AutPred_deJson_(cmd.COMANDO_JSON, null);
  var r = AutPred_confirmarPeloSensor_(disp, cmd.COMANDO, depois) ||
    AutPred_confirmarPorEstado_(disp.TIPO, AutPred_s_(disp.ESTADO_CODIGOS).split(',').map(function (x) { return x.trim(); }).concat(['doorcontact_state']), antes, depois, enviado && enviado.code ? enviado : AutPred_deJson_(disp.COMANDO_ABRIR_JSON, null));
  if (!r.confirmado && disp.TIPO === 'FECHADURA') {
    var regs = Tuya_fechaduraRegistros_(c, disp.DEVICE_ID, AutPred_ms_(cmd.QUANDO_EM) - 5000, Date.now());
    // modo pedido: só conta a abertura remota (unlock_app); digital, senha ou cartão de quem está na porta não confirmam o SGO+
    if (AutPred_ehPedido_(disp)) regs = regs.filter(function (x) { return /unlock_app|unlock_remote/.test(JSON.stringify((x && x.status) || x || '')); });
    if (AutPred_s_(cmd.COMANDO) === 'RECUSAR') {
      var pd = null;
      try { pd = AutPred_pedidoFechadura_(c, disp, 0); } catch (eR) {}
      r = pd && !pd.ativo && !regs.length ? { confirmado: true, detalhe: 'Pedido recusado: a fechadura encerrou o pedido sem abrir.' } : { confirmado: false, detalhe: 'A nuvem aceitou a recusa, mas o pedido ' + (regs.length ? 'terminou com abertura registrada.' : 'ainda aparece ativo.') };
    } else if (regs.length) r = { confirmado: true, detalhe: 'A fechadura registrou a abertura remota depois da solicitação (' + regs.length + ' registro(s)).' };
  }
  if (!r.confirmado && silencioso) return r;
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

/**
 * Regras de frequência e repetição. Função pura: devolve '' (pode) ou o motivo. comando (ABRIR, FECHAR, DESTRAVAR...):
 * a espera pelo resultado do anterior vale só para repetir o MESMO comando (23/10/2026: abrir sem confirmação travava o fechar).
 */
function AutPred_podeAgora_(comandos, dispId, userId, agoraMs, comando) {
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
    // portão: o resultado do pulso sem sensor nunca vem (pedestre); a proteção do portão é o intervalo de 10 s e o percurso
    var mesmo = (!comando || AutPred_s_(ultDisp.COMANDO) === AutPred_s_(comando)) && !/^(ABRIR|FECHAR|PARAR)$/.test(AutPred_s_(comando));
    if (mesmo && (sit === 'SOLICITADO' || sit === 'ACEITO') && dt < AUT_SEM_RESULTADO_S) return 'o comando anterior (' + AutPred_s_(ultDisp.QUANDO).slice(-5) + ') ainda está sem resultado; use "Conferir agora" ou aguarde ' + Math.ceil(AUT_SEM_RESULTADO_S - dt) + ' s';
  }
  return '';
}

function AutPred_gravarComando_(cmd, upd) {
  upd.ATUALIZADO_EM = SGO_UTILS.nowIso();
  SGO_DATA.update(AUT_ABA_COMANDOS, cmd.ID, upd);
  Object.assign(cmd, upd);
}

// ------------------------------------------------------------
// PEDIDO DE ABERTURA PELA CAMPAINHA (22/10/2026, fechadura real da Porta da Diretoria)
// Medido em produção, só leitura: "Wifi Smart Lock" (categoria ms) não tem abertura remota livre; quando tocam a campainha,
// o ponto unlock_request conta o tempo do pedido (até 90 s, de 2 em 2 s) e a única função gravável é reply_unlock_request
// (true abre, false recusa), aceita só dentro dessa janela. É o mesmo botão que o aplicativo Smart Life mostra.
// ------------------------------------------------------------
var AUT_PEDIDO_CACHE = 'AUT_PEDIDO_';
var AUT_PEDIDO_CACHE_MS = 2500;          // leituras de várias telas a cada 3 s viram uma chamada só
var AUT_PROP_PEDIDO_AVISADO = 'AUT_PEDIDO_AVISADO_';
var AUT_FUNCAO_ROTINA = 'AutPred_rotinaPedidos';

function AutPred_ehPedido_(d) { return AutPred_s_(d && d.REMOTO_FECHADURA).toUpperCase() === 'PEDIDO'; }
function AutPred_hora_(ms) { return ms ? Utilities.formatDate(new Date(ms), AUT_FUSO, 'HH:mm:ss') : ''; }

/** Função pura: estado guardado -> { ativo, restanteS, campainhaEm, campainhaTexto, pedidoId, porta }. */
function AutPred_pedidoAgora_(g, agoraMs) {
  agoraMs = agoraMs || Date.now();
  g = g || {};
  var valor = Number(g.valor) || 0, em = Number(g.valorEm) || 0;
  var restante = valor > 0 ? Math.max(0, Math.floor(valor - (agoraMs - em) / 1000)) : 0;
  var camp = Number(g.campainhaEm) || 0;
  var campRecente = camp && em && Math.abs(em - camp) <= 120000;
  var marco = campRecente ? camp : (em ? Math.floor(em / 120000) * 120000 : 0);
  return { ativo: restante > 0, restanteS: restante, campainhaEm: campRecente ? camp : 0, campainhaTexto: campRecente ? AutPred_hora_(camp) : '',
    pedidoId: marco ? 'P' + marco : '', porta: AutPred_s_(g.porta), lidoEm: AutPred_hora_(g.lidoMs) };
}

// ------------------------------------------------------------
// EVENTOS DA TUYA (27/10/2026, cota da Tuya esgotada às 07:45 pela consulta da campainha a cada 3 s)
// O servidor recebe os eventos dos dispositivos pelo serviço de mensagens da Tuya (src/servicos/tuyaMensagens.ts) e grava:
//   TUYA_MSG_ESTADO    { conectado, vivoEm (ms), desde, mensagensDia, mensagensMes, erro } — atualizado a cada minuto
//   TUYA_EVT_<device>  { props: { code: { value, time } }, online, onlineEm, recebidoEm, primeiroEm }
// Com a conexão viva e pelo menos um evento já recebido daquele dispositivo, o SGO+ usa o que chegou e não chama a nuvem.
// Sem isso, cai na CONSULTA ECONÔMICA: só na janela configurada (AUT_SAUDE_CFG, padrão dias úteis 08:00-18:00) e no
// máximo uma leitura a cada consultaIntervaloS (padrão 120 s), compartilhada por telas, rotina rápida e rotina de 1 minuto.
// Nunca volta à leitura a cada 3 s.
// ------------------------------------------------------------
var AUT_MSG_ESTADO = 'TUYA_MSG_ESTADO';
var AUT_EVT_PREFIXO = 'TUYA_EVT_';
var AUT_MSG_VIVO_MS = 180000;
var AUT_SAUDE_CFG = 'AUT_SAUDE_CFG';
var AUT_SAUDE_PADRAO = { orcamentoMes: 26000, avisoPct: 70, economicoPct: 90, consultaInicio: '08:00', consultaFim: '18:00', consultaDias: [1, 2, 3, 4, 5], consultaIntervaloS: 120 };

function AutPred_saudeCfg_() {
  var g = {};
  try { g = JSON.parse(PropertiesService.getScriptProperties().getProperty(AUT_SAUDE_CFG) || '{}') || {}; } catch (e) { g = {}; }
  var c = {};
  Object.keys(AUT_SAUDE_PADRAO).forEach(function (k) { c[k] = g[k] !== undefined && g[k] !== null && g[k] !== '' ? g[k] : AUT_SAUDE_PADRAO[k]; });
  c.orcamentoMes = Math.max(1000, Math.round(Number(c.orcamentoMes) || AUT_SAUDE_PADRAO.orcamentoMes));
  c.avisoPct = Math.min(99, Math.max(10, Number(c.avisoPct) || 70));
  c.economicoPct = Math.min(100, Math.max(c.avisoPct + 1, Number(c.economicoPct) || 90));
  c.consultaIntervaloS = Math.min(1800, Math.max(60, Math.round(Number(c.consultaIntervaloS) || 120)));
  if (!/^\d{2}:\d{2}$/.test(String(c.consultaInicio))) c.consultaInicio = AUT_SAUDE_PADRAO.consultaInicio;
  if (!/^\d{2}:\d{2}$/.test(String(c.consultaFim))) c.consultaFim = AUT_SAUDE_PADRAO.consultaFim;
  c.consultaDias = Array.isArray(c.consultaDias) ? c.consultaDias.map(Number).filter(function (n) { return n >= 0 && n <= 6; }) : AUT_SAUDE_PADRAO.consultaDias.slice();
  return c;
}

/** Dentro da janela de consulta econômica (dia da semana e horário em São Paulo)? Função pura com agoraMs. */
function AutPred_naJanela_(cfg, agoraMs) {
  var d = new Date(agoraMs || Date.now());
  var ymd = Utilities.formatDate(d, AUT_FUSO, 'yyyy-MM-dd').split('-').map(Number);
  var dia = new Date(Date.UTC(ymd[0], ymd[1] - 1, ymd[2])).getUTCDay(); // 0 = domingo ... 6 = sábado
  var hm = Utilities.formatDate(d, AUT_FUSO, 'HH:mm');
  return (cfg.consultaDias || []).indexOf(dia) >= 0 && hm >= String(cfg.consultaInicio) && hm < String(cfg.consultaFim);
}

/** Pode a rotina consultar a nuvem por conta própria agora? { ok, motivo, intervaloMs }. */
function AutPred_consultaAutomatica_() {
  var cfg = AutPred_saudeCfg_();
  var pausa = Tuya_motivoPausa_('AUTOMATICA');
  if (pausa) return { ok: false, motivo: 'consulta automática pausada: ' + pausa, intervaloMs: cfg.consultaIntervaloS * 1000 };
  if (!AutPred_naJanela_(cfg)) return { ok: false, motivo: 'fora da janela de consulta (' + cfg.consultaInicio + ' às ' + cfg.consultaFim + ')', intervaloMs: cfg.consultaIntervaloS * 1000 };
  return { ok: true, motivo: '', intervaloMs: cfg.consultaIntervaloS * 1000 };
}

function AutPred_msgEstado_() {
  try { return JSON.parse(PropertiesService.getScriptProperties().getProperty(AUT_MSG_ESTADO) || '{}') || {}; } catch (e) { return {}; }
}
function AutPred_eventosVivos_(m) { m = m || AutPred_msgEstado_(); return !!m.conectado && Date.now() - Number(m.vivoEm || 0) < AUT_MSG_VIVO_MS; }

/** Eventos do dispositivo que valem agora (conexão viva e algum evento já recebido dele), ou null. */
function AutPred_eventoDisp_(deviceId) {
  if (!AutPred_s_(deviceId) || !AutPred_eventosVivos_()) return null;
  try {
    var e = JSON.parse(PropertiesService.getScriptProperties().getProperty(AUT_EVT_PREFIXO + AutPred_s_(deviceId)) || 'null');
    return e && e.props ? e : null;
  } catch (x) { return null; }
}

/** Aplica os pontos recebidos por evento ao dispositivo (ESTADO_JSON e ONLINE); grava só quando mudou e gravar = true. */
function AutPred_aplicarEvento_(disp, ev, gravar) {
  var lista = AutPred_deJson_(disp.ESTADO_JSON, []) || [], vistos = {};
  var novo = lista.map(function (s) {
    if (!s || !s.code) return s;
    vistos[s.code] = true;
    return ev.props[s.code] ? { code: s.code, value: ev.props[s.code].value } : s;
  });
  Object.keys(ev.props || {}).forEach(function (k) { if (!vistos[k] && /^(doorcontact_state|switch_1|switch|control|door_control_1|percent_control|closed_opened|lock_motor_state|residual_electricity)$/.test(k)) novo.push({ code: k, value: ev.props[k].value }); });
  var upd = { ESTADO_JSON: AutPred_json_(novo) };
  if (ev.online === true || ev.online === false) upd.ONLINE = ev.online ? 'SIM' : 'NAO';
  var mudou = upd.ESTADO_JSON !== AutPred_s_(disp.ESTADO_JSON) || (upd.ONLINE && upd.ONLINE !== AutPred_s_(disp.ONLINE));
  if (mudou && gravar) { upd.ESTADO_EM = SGO_UTILS.nowIso(); upd.ATUALIZADO_EM = SGO_UTILS.nowIso(); SGO_DATA.update(AUT_ABA_DISPOSITIVOS, disp.ID, upd); }
  if (mudou) Object.assign(disp, upd);
  return mudou;
}

/** Pedido da campainha a partir dos eventos (mesmo formato de AutPred_pedidoAgora_). */
function AutPred_pedidoDoEvento_(ev) {
  var p = ev.props || {}, u = p.unlock_request || { value: 0, time: 0 }, db = p.doorbell || {}, co = p.closed_opened || {};
  return AutPred_pedidoAgora_({ lidoMs: Date.now(), valor: Number(u.value) || 0, valorEm: Number(u.time) || Number(ev.recebidoEm) || 0, campainhaEm: Number(db.time) || 0, porta: AutPred_s_(co.value) });
}

/** Lê o pedido na nuvem (sombra do dispositivo, com a hora de cada ponto); guarda 2,5 s para todas as telas. Só leitura. */
function AutPred_pedidoFechadura_(c, disp, maxIdadeMs) {
  var lim = maxIdadeMs === undefined ? AUT_PEDIDO_CACHE_MS : maxIdadeMs;
  // 27/10/2026: com eventos da Tuya, o pedido vem do que o servidor recebeu (nenhuma chamada); o comando (0) relê na nuvem
  if (lim !== 0) { var ev = AutPred_eventoDisp_(disp.DEVICE_ID); if (ev) return AutPred_pedidoDoEvento_(ev); }
  var k = AUT_PEDIDO_CACHE + AutPred_s_(disp.DEVICE_ID), cache = null;
  try { cache = CacheService.getScriptCache(); var g0 = JSON.parse(cache.get(k) || 'null'); if (g0 && Date.now() - g0.lidoMs <= lim) return AutPred_pedidoAgora_(g0); } catch (e) {}
  var props = {}, agora = Date.now();
  var r = Tuya_chamar_(c, 'GET', '/v2.0/cloud/thing/' + encodeURIComponent(AutPred_s_(disp.DEVICE_ID)) + '/shadow/properties', {});
  if (r.j && r.j.success === true && r.j.result) {
    (r.j.result.properties || []).forEach(function (p) { if (p && p.code) props[p.code] = { value: p.value, time: Number(p.time) || 0 }; });
  } else {
    Tuya_estado_(c, disp.DEVICE_ID).forEach(function (x) { props[x.code] = { value: x.value, time: agora }; });
  }
  var u = props.unlock_request || { value: 0, time: 0 }, db = props.doorbell || {}, co = props.closed_opened || {};
  var g = { lidoMs: Date.now(), valor: Number(u.value) || 0, valorEm: Number(u.time) || agora, campainhaEm: Number(db.time) || 0, porta: AutPred_s_(co.value) };
  // 27/10/2026: guardado por até 15 min (a consulta econômica usa a mesma leitura por consultaIntervaloS)
  try { if (cache) cache.put(k, JSON.stringify(g), 900); } catch (e2) {}
  return AutPred_pedidoAgora_(g);
}

/**
 * Pedidos ativos das fechaduras que a sessão pode destravar (consulta leve da tela, enquanto ela está aberta e visível).
 * 27/10/2026: com eventos, nenhuma chamada à nuvem; sem eventos, a leitura compartilhada vale consultaIntervaloS (padrão
 * 120 s) e para no modo econômico ou com a cota esgotada. agora = true: botão "Verificar campainha agora" (uma leitura
 * pedida pela pessoa, que vale mesmo no modo econômico).
 */
function AutPred_pedidosDaSessao_(sessao, agora) {
  var c = AutPred_cfg_();
  if (!c.podeLer) return { itens: [], semLeitura: c.faltas.join('; ') };
  var perms = AutPred_permissoesDe_(sessao.userId), itens = [], cfg = AutPred_saudeCfg_(), fonteGeral = '';
  AutPred_dispositivos_().forEach(function (d) {
    if (!AutPred_ehPedido_(d) || AutPred_s_(d.ATIVO).toUpperCase() === 'NAO') return;
    if (!AutPred_direitos_(sessao, d, perms).acionar) return;
    var p, fonte = 'consulta', ev = agora ? null : AutPred_eventoDisp_(d.DEVICE_ID);
    if (ev) { p = AutPred_pedidoDoEvento_(ev); fonte = 'eventos'; }
    else {
      var pausa = agora ? '' : Tuya_motivoPausa_('TELA');
      if (pausa) { fonte = 'pausada'; p = null; }
      else {
        try { p = Tuya_comOrigem_(agora ? 'MANUAL' : 'TELA', function () { return AutPred_pedidoFechadura_(c, d, agora ? AUT_PEDIDO_CACHE_MS : cfg.consultaIntervaloS * 1000); }); }
        catch (e) { itens.push({ id: AutPred_s_(d.ID), erro: AutPred_erroNuvem_(e, 'Não foi possível ler a campainha agora. Toque em "Verificar campainha agora" em alguns segundos; se continuar, use o aplicativo Smart Life.', sessao).message, fonte: fonte }); return; }
      }
    }
    fonteGeral = fonteGeral || fonte;
    if (!p) { itens.push({ id: AutPred_s_(d.ID), nome: AutPred_s_(d.NOME || d.NOME_PROVEDOR), ativo: false, pausada: true, fonte: fonte, autoAbrir: AutPred_autoAbrir_(d),
      aviso: 'Consulta automática da campainha pausada (' + Tuya_motivoPausa_('TELA') + '). Toque em "Verificar campainha agora" quando alguém tocar.' }); return; }
    var resp = AutPred_respostaDoPedido_(AutPred_comandos_(), d.ID, p.pedidoId);
    var auto = resp && AutPred_s_(resp.ORIGEM) === 'AUTOMATICO';
    itens.push({ id: AutPred_s_(d.ID), nome: AutPred_s_(d.NOME || d.NOME_PROVEDOR), ativo: p.ativo && !resp, restanteS: p.restanteS, campainhaTexto: p.campainhaTexto, pedidoId: p.pedidoId,
      respondido: resp ? (auto ? 'aberto automaticamente' : (AutPred_s_(resp.COMANDO) === 'RECUSAR' ? 'recusado' : 'aberto') + ' por ' + AutPred_s_(resp.SOLICITANTE)) + ' às ' + AutPred_s_(resp.QUANDO).slice(-5) : '', porta: p.porta,
      autoAbrir: AutPred_autoAbrir_(d), autoAbrirPor: AutPred_s_(d.AUTO_ABRIR_POR), autoAbrirEm: AutPred_dataBr_(d.AUTO_ABRIR_EM), fonte: fonte,
      aviso: fonte === 'consulta' ? 'A campainha aparece aqui com até ' + cfg.consultaIntervaloS + ' s de atraso (serviço de mensagens da Tuya não ativo). Se alguém tocou, use "Verificar campainha agora".' : '' });
  });
  return { itens: itens, fonte: fonteGeral, proximaS: fonteGeral === 'eventos' ? 3 : 15, infra: AutPred_infraTela_() };
}

/** Comando já autorizado para este pedido (um pedido = uma resposta). */
function AutPred_respostaDoPedido_(comandos, dispId, pedidoId) {
  if (!pedidoId) return null;
  return (comandos || []).filter(function (x) {
    return AutPred_s_(x.DISPOSITIVO_ID) === AutPred_s_(dispId) && AutPred_s_(x.CORRELACAO) === pedidoId && AutPred_s_(x.AUTORIZACAO) === 'AUTORIZADO' &&
      ['SOLICITADO', 'ACEITO', 'CONFIRMADO', 'SIMULADO'].indexOf(AutPred_s_(x.SITUACAO)) >= 0;
  })[0] || null;
}

/** Quem é avisado do pedido: quem pode destravar a porta (o responsável pelo sistema e os diretores com "Acionar" vigente). */
function AutPred_quemDestrava_(disp) {
  var perms = AutPred_ler_(AUT_ABA_PERMISSOES), out = [];
  SGO_DATA.getAll(SGO_CFG.SHEETS.CAD_USUARIOS).forEach(function (u) {
    if (AutPred_s_(u.STATUS).toUpperCase() !== 'ATIVO') return;
    var s = { userId: AutPred_s_(u.ID), usuario: AutPred_s_(u.USUARIO), perfil: AutPred_s_(u.PERFIL) };
    if (AutPred_direitos_(s, disp, AutPred_permissoesDe_(s.userId, perms)).acionar) out.push(s.userId);
  });
  return out;
}

/**
 * Rotina de 1 minuto (gatilho): se houver pedido ativo numa fechadura homologada, avisa uma vez quem pode destravar
 * (no sistema; WhatsApp só se o piloto estiver liberado para a pessoa; evento S67). Não responde nada sozinha.
 */
function AutPred_rotinaPedidos() {
  if (typeof SGO_execucaoInterna_ === 'function' && !SGO_execucaoInterna_()) return null;
  var c = AutPred_cfg_();
  if (!c.podeLer || !AutPred_emUso_(c)) return { texto: 'automação desligada ou em implantação: nada lido' };
  var avisos = 0;
  // 23/10/2026: portão aceito sem confirmação nos últimos 15 min é confirmado pelo sensor mesmo sem tela aberta
  // 27/10/2026: com eventos, pelo que chegou (nenhuma chamada); sem eventos, uma leitura (pausada no modo econômico)
  AutPred_dispositivos_().forEach(function (d) {
    var sit = AutPred_s_(d.ULT_CMD_SITUACAO);
    if (d.TIPO === 'FECHADURA' || (sit !== 'ACEITO' && sit !== 'INCERTO') || !AutPred_temSensor_(d) || Date.now() - AutPred_ms_(d.ULT_CMD_EM) > AUT_CONFIRMACAO_JANELA_MIN * 60000) return;
    try {
      var ev = AutPred_eventoDisp_(d.DEVICE_ID);
      if (ev) AutPred_aplicarEvento_(d, ev, true); else Tuya_comOrigem_('AUTOMATICA', function () { AutPred_lerEstado_(c, d); });
      AutPred_confirmarTardio_(d);
    } catch (eT) {}
  });
  var consulta = AutPred_consultaAutomatica_();
  AutPred_dispositivos_().forEach(function (d) {
    if (!AutPred_ehPedido_(d) || AutPred_s_(d.HOMOLOGADO).toUpperCase() !== 'SIM' || AutPred_s_(d.ATIVO).toUpperCase() === 'NAO') return;
    var p, ev = AutPred_eventoDisp_(d.DEVICE_ID);
    if (ev) p = AutPred_pedidoDoEvento_(ev);
    else {
      if (!consulta.ok) return;
      try { p = Tuya_comOrigem_('AUTOMATICA', function () { return AutPred_pedidoFechadura_(c, d, consulta.intervaloMs); }); } catch (e) { return; }
    }
    if (AutPred_tratarPedido_(c, d, p, ev ? 'EVENTO' : 'AUTOMATICA')) avisos++;
  });
  return { avisos: avisos };
}

/**
 * Pedido da campainha lido (por evento ou consulta): com a abertura automática ligada, responde "abrir" uma vez por pedido;
 * sem ela, avisa uma vez quem pode destravar (S67). Devolve true quando abriu ou avisou.
 */
function AutPred_tratarPedido_(c, d, p, origem) {
  if (!p || !p.ativo) return false;
  var props = PropertiesService.getScriptProperties();
  // abertura automática ligada: a resposta é uma por pedido (rotina rápida, evento e rotina de 1 minuto sob a mesma trava).
  // A resposta é um comando (não é leitura automática): vale também no modo econômico quando o pedido veio por evento.
  if (AutPred_autoAbrir_(d)) return !AutPred_respostaDoPedido_(AutPred_comandos_(), d.ID, p.pedidoId) && !!Tuya_comOrigem_('EVENTO', function () { return AutPred_abrirAutomatico_(c, d, p); });
  if (props.getProperty(AUT_PROP_PEDIDO_AVISADO + d.ID) === p.pedidoId) return false;
  props.setProperty(AUT_PROP_PEDIDO_AVISADO + d.ID, p.pedidoId);
  var nome = AutPred_s_(d.NOME || d.NOME_PROVEDOR);
  AutPred_auditar_({ evento: 'PEDIDO_CAMPAINHA', quem: AUT_SISTEMA, disp: d, operacaoId: p.pedidoId, resultado: 'AVISADO', detalhe: 'A campainha tocou' + (p.campainhaTexto ? ' às ' + p.campainhaTexto : '') + '; pedido de abertura ativo por ' + p.restanteS + ' s.' });
  try {
    if (typeof SGO_notificar_ === 'function') SGO_notificar_({ usuarios: AutPred_quemDestrava_(d), titulo: 'Pedido de abertura na ' + nome, canais: ['sgo', 'whatsapp'], origem: 'AUTOMACAO', refId: p.pedidoId, evento: 'S67',
      texto: 'A campainha da ' + nome + ' tocou' + (p.campainhaTexto ? ' às ' + p.campainhaTexto : '') + '. Para abrir, toque em "Abrir agora" em Segurança predial (o pedido vale por cerca de ' + p.restanteS + ' segundos).',
      textoWhatsapp: 'SGO+: campainha da ' + nome + (p.campainhaTexto ? ' às ' + p.campainhaTexto : '') + '. Para abrir: Segurança predial > Abrir agora.' });
    return true;
  } catch (eN) { console.error('Automação predial, aviso do pedido: ' + ((eN && eN.message) || eN)); }
  return false;
}

/**
 * Evento da Tuya recebido pelo servidor (src/servicos/tuyaMensagens.ts chama ao chegar unlock_request > 0 ou mudança do
 * sensor do portão). Usa só o que chegou: nenhuma leitura na nuvem; a abertura automática responde na hora.
 */
function AutPred_aoEventoTuya(deviceId) {
  if (typeof SGO_execucaoInterna_ === 'function' && !SGO_execucaoInterna_()) return null;
  var c = AutPred_cfg_();
  if (!c.podeLer) return { texto: 'automação desligada: nada feito' };
  var d = AutPred_dispositivos_().filter(function (x) { return AutPred_s_(x.DEVICE_ID) === AutPred_s_(deviceId) && AutPred_s_(x.ATIVO).toUpperCase() !== 'NAO'; })[0];
  if (!d) return { texto: 'dispositivo fora do cadastro do SGO+' };
  var ev = AutPred_eventoDisp_(d.DEVICE_ID);
  if (!ev) return { texto: 'sem eventos válidos' };
  if (d.TIPO !== 'FECHADURA') {
    AutPred_aplicarEvento_(d, ev, true);
    try { AutPred_confirmarTardio_(d); } catch (eT) {}
    return { texto: 'estado do portão atualizado' };
  }
  if (!AutPred_ehPedido_(d) || AutPred_s_(d.HOMOLOGADO).toUpperCase() !== 'SIM' || !AutPred_emUso_(c)) return { texto: 'fechadura sem pedido homologado' };
  return { tratado: AutPred_tratarPedido_(c, d, AutPred_pedidoDoEvento_(ev), 'EVENTO') };
}

/** Instala a rotina de 1 minuto (uma vez). Chamada ao ligar a automação e ao sincronizar. */
function AutPred_garantirRotina_() {
  try {
    if (ScriptApp.getProjectTriggers().some(function (t) { return t.getHandlerFunction() === AUT_FUNCAO_ROTINA; })) return 'já instalada';
    ScriptApp.newTrigger(AUT_FUNCAO_ROTINA).timeBased().everyMinutes(1).create();
    return 'instalada';
  } catch (e) { return 'não instalada: ' + ((e && e.message) || e); }
}

// ------------------------------------------------------------
// ABERTURA AUTOMÁTICA PELA CAMPAINHA (23/10/2026, dono: "uma opção para os diretores marcarem abertura automática quando
// alguém tocar a campainha; quando desmarcar, continua da forma que construiu")
// Marcada por quem destrava a porta (AUTO_ABRIR = SIM). O servidor consulta o pedido a cada 3 s (AutPred_rotinaRapida,
// chamada pela rotina rápida do servidor só enquanto AUT_AUTO_ABRIR_LIGADO = 1) e responde "abrir" sozinho, uma vez por
// pedido, com o registro e o aviso S68 a quem pode destravar. A rotina de 1 minuto faz o mesmo como reserva.
// ------------------------------------------------------------
var AUT_PROP_AUTO_LIGADO = 'AUT_AUTO_ABRIR_LIGADO';
var AUT_AUTOMATICO = { userId: '', usuario: 'sistema', nome: 'Abertura automática', perfil: 'SISTEMA' };
var AUT_AUTO_TENTATIVAS = 2;   // por pedido (a 2ª só se a 1ª falhou na nuvem)

function AutPred_autoAbrir_(d) { return AutPred_s_(d && d.AUTO_ABRIR).toUpperCase() === 'SIM'; }

/** Sinal lido pelo servidor (tabela de propriedades) para chamar a rotina rápida só quando há porta com a opção ligada. */
function AutPred_atualizarSinalAuto_() {
  var algum = AutPred_dispositivos_().some(function (d) { return AutPred_autoAbrir_(d) && AutPred_ehPedido_(d) && AutPred_s_(d.ATIVO).toUpperCase() !== 'NAO'; });
  var p = PropertiesService.getScriptProperties();
  if (algum) p.setProperty(AUT_PROP_AUTO_LIGADO, '1'); else p.deleteProperty(AUT_PROP_AUTO_LIGADO);
  return algum;
}

/** Liga ou desliga. dados = { id, ligado }. Só quem destrava a porta (o responsável pelo sistema ou o diretor com "Acionar"). */
function AutPred_definirAutoAbrir_(sessao, dados) {
  dados = dados || {};
  var disp = AutPred_dispositivo_(dados.id);
  var dir = AutPred_direitos_(sessao, disp, AutPred_permissoesDe_(sessao.userId));
  if (!dir.ver) throw new Error('Não foi possível continuar: o dispositivo não foi encontrado ou não está liberado para você. Clique em "Atualizar".');
  if (!AutPred_ehPedido_(disp)) throw new Error('Não foi possível gravar: a abertura automática só existe na fechadura que abre pela campainha.');
  if (!dir.acionar || !AutPred_ehDiretor_(sessao)) throw new Error('Não foi possível gravar: só quem destrava a porta liga ou desliga a abertura automática (' + (dir.motivo || 'diretor com a permissão "Acionar"') + ').');
  var ligar = !!dados.ligado, nome = AutPred_s_(disp.NOME || disp.NOME_PROVEDOR);
  if (ligar === AutPred_autoAbrir_(disp)) return { mensagem: 'A abertura automática já estava ' + (ligar ? 'ligada' : 'desligada') + '.' };
  var upd = { AUTO_ABRIR: ligar ? 'SIM' : 'NAO', AUTO_ABRIR_POR: AutPred_nome_(sessao), AUTO_ABRIR_EM: SGO_UTILS.nowIso(), ATUALIZADO_EM: SGO_UTILS.nowIso() };
  SGO_DATA.update(AUT_ABA_DISPOSITIVOS, disp.ID, upd);
  Object.assign(disp, upd);
  AutPred_atualizarSinalAuto_();
  if (ligar) AutPred_garantirRotina_();
  AutPred_auditar_({ evento: ligar ? 'AUTO_ABRIR_LIGADA' : 'AUTO_ABRIR_DESLIGADA', quem: sessao, disp: disp, resultado: 'OK',
    detalhe: ligar ? 'Abertura automática pela campainha ligada: a porta abre sozinha quando tocarem.' : 'Abertura automática desligada: a porta só abre por "Abrir agora".' });
  try {
    var outros = AutPred_quemDestrava_(disp).filter(function (id) { return id !== AutPred_s_(sessao.userId); });
    if (outros.length && typeof SGO_notificar_ === 'function') SGO_notificar_({ usuarios: outros, titulo: 'Abertura automática ' + (ligar ? 'ligada' : 'desligada') + ' na ' + nome, canais: ['sgo'], origem: 'AUTOMACAO', refId: disp.ID, evento: 'S68',
      texto: AutPred_nome_(sessao) + (ligar ? ' ligou a abertura automática da ' + nome + ': quando tocarem a campainha, o SGO+ abre a porta sozinho.' : ' desligou a abertura automática da ' + nome + ': a porta volta a abrir só por "Abrir agora".') });
  } catch (eN) {}
  var modo = AutPred_modo_(AutPred_cfg_(), disp, 'ABRIR');
  return { mensagem: ligar ? 'Abertura automática ligada: quando tocarem a campainha da ' + nome + ', o SGO+ abre a porta sozinho e avisa quem pode destravar.' + (modo.modo === 'SIMULACAO' ? ' ' + modo.motivo : '')
    : 'Abertura automática desligada: a porta só abre quando alguém toca em "Abrir agora" durante o pedido.' };
}

/**
 * Rotina rápida do servidor (a cada 3 s, só com AUT_AUTO_ABRIR_LIGADO = 1). Nada lido nem enviado sem porta com a opção ligada.
 * 27/10/2026 (cota da Tuya esgotada por esta rotina, ~28.800 leituras por dia): com eventos da Tuya, usa o que o servidor
 * recebeu e não chama a nuvem; sem eventos, consulta econômica (janela e intervalo de AUT_SAUDE_CFG, leitura compartilhada);
 * no modo econômico ou com a cota esgotada, a consulta para (a abertura por evento continua).
 */
function AutPred_rotinaRapida() {
  if (typeof SGO_execucaoInterna_ === 'function' && !SGO_execucaoInterna_()) return null;
  if (PropertiesService.getScriptProperties().getProperty(AUT_PROP_AUTO_LIGADO) !== '1') return { texto: 'abertura automática desligada' };
  var c = AutPred_cfg_();
  if (!c.podeLer) return { texto: 'automação desligada: nada lido' };
  var abertas = 0, consulta = null;
  AutPred_dispositivos_().forEach(function (d) {
    if (!AutPred_autoAbrir_(d) || !AutPred_ehPedido_(d) || AutPred_s_(d.ATIVO).toUpperCase() === 'NAO') return;
    var p, ev = AutPred_eventoDisp_(d.DEVICE_ID);
    if (ev) p = AutPred_pedidoDoEvento_(ev);
    else {
      consulta = consulta || AutPred_consultaAutomatica_();
      if (!consulta.ok) return;
      try { p = Tuya_comOrigem_('AUTOMATICA', function () { return AutPred_pedidoFechadura_(c, d, consulta.intervaloMs); }); } catch (e) { return; }
    }
    if (!p.ativo || AutPred_respostaDoPedido_(AutPred_comandos_(), d.ID, p.pedidoId)) return;
    if (Tuya_comOrigem_('EVENTO', function () { return AutPred_abrirAutomatico_(c, d, p); })) abertas++;
  });
  return { abertas: abertas, consulta: consulta ? (consulta.ok ? 'econômica' : consulta.motivo) : 'eventos' };
}

/**
 * Responde "abrir" ao pedido da campainha em nome da abertura automática. Conferência e gravação sob a trava do script
 * (uma resposta por pedido, mesmo com a rotina rápida e a de 1 minuto ao mesmo tempo). Devolve o comando ou null.
 */
function AutPred_abrirAutomatico_(c, disp, pedido) {
  var trava = null;
  try { trava = LockService.getScriptLock(); trava.waitLock(10000); } catch (e) { trava = null; }
  var soltar = function () { if (trava) { try { trava.releaseLock(); } catch (e2) {} trava = null; } };
  var cmd, modo, nome = AutPred_s_(disp.NOME || disp.NOME_PROVEDOR);
  try {
    AutPred_bootstrap_();
    var comandos = AutPred_comandos_();
    if (AutPred_respostaDoPedido_(comandos, disp.ID, pedido.pedidoId)) return null;
    var prefixo = 'auto-' + pedido.pedidoId + '-' + AutPred_s_(disp.ID) + '-';
    var tentativas = comandos.filter(function (x) { return AutPred_s_(x.OPERACAO_ID).indexOf(prefixo) === 0; }).length;
    if (tentativas >= AUT_AUTO_TENTATIVAS) return null;
    modo = AutPred_modo_(c, disp, 'ABRIR');
    cmd = SGO_DATA.insert(AUT_ABA_COMANDOS, SGO_DATA.normalizarObjetoParaSheet(AUT_ABA_COMANDOS, SGO_DATA.gerarRegistroBase({
      OPERACAO_ID: prefixo + (tentativas + 1), QUANDO: AutPred_agoraTexto_(), QUANDO_EM: SGO_UTILS.nowIso(), SOLICITANTE_ID: '', SOLICITANTE: AUT_AUTOMATICO.nome, PERFIL: AUT_AUTOMATICO.perfil,
      UNIDADE: AutPred_s_(disp.UNIDADE_NOME), DISPOSITIVO_ID: AutPred_s_(disp.ID), DEVICE_ID: AutPred_s_(disp.DEVICE_ID), DISPOSITIVO_NOME: nome, TIPO: AutPred_s_(disp.TIPO),
      COMANDO: 'DESTRAVAR', COMANDO_JSON: AutPred_json_({ code: 'reply_unlock_request', value: true }), MODO: modo.modo, AUTORIZACAO: 'AUTORIZADO',
      AUTORIZACAO_MOTIVO: 'abertura automática pela campainha, ligada por ' + (AutPred_s_(disp.AUTO_ABRIR_POR) || 'um diretor') + (disp.AUTO_ABRIR_EM ? ' em ' + AutPred_dataBr_(disp.AUTO_ABRIR_EM) : ''),
      SITUACAO: 'SOLICITADO', ESTADO_ANTES_JSON: AutPred_s_(disp.ESTADO_JSON), CORRELACAO: pedido.pedidoId, ORIGEM: 'AUTOMATICO', ATUALIZADO_EM: SGO_UTILS.nowIso()
    })));
    SGO_DATA.update(AUT_ABA_DISPOSITIVOS, disp.ID, { ULT_CMD_ID: cmd.ID, ULT_CMD_EM: cmd.QUANDO_EM, ULT_CMD_SITUACAO: 'SOLICITADO', ULT_CMD_COMANDO: AutPred_s_(cmd.COMANDO), ATUALIZADO_EM: SGO_UTILS.nowIso() });
  } finally { soltar(); }
  var quando = pedido.campainhaTexto ? ' às ' + pedido.campainhaTexto : '';
  AutPred_auditar_({ evento: 'COMANDO_SOLICITADO', quem: AUT_AUTOMATICO, disp: disp, operacaoId: cmd.OPERACAO_ID, resultado: 'AUTORIZADO', detalhe: 'Abertura automática: a campainha tocou' + quando + ' (' + modo.modo + ').' + (modo.motivo ? ' ' + modo.motivo : '') });
  var avisar = function (titulo, texto) {
    try {
      if (typeof SGO_notificar_ === 'function') SGO_notificar_({ usuarios: AutPred_quemDestrava_(disp), titulo: titulo, canais: ['sgo', 'whatsapp'], origem: 'AUTOMACAO', refId: cmd.ID, evento: 'S68', texto: texto,
        textoWhatsapp: 'SGO+: ' + texto });
    } catch (eN) { console.error('Automação predial, aviso da abertura automática: ' + ((eN && eN.message) || eN)); }
  };
  if (modo.modo === 'SIMULACAO') {
    AutPred_gravarComando_(cmd, { SITUACAO: 'SIMULADO', CONFIRMACAO_DETALHE: 'Simulação: a abertura automática teria respondido "abrir" ao pedido da campainha. Nada foi enviado. ' + modo.motivo });
    SGO_DATA.update(AUT_ABA_DISPOSITIVOS, disp.ID, { ULT_CMD_SITUACAO: 'SIMULADO', ATUALIZADO_EM: SGO_UTILS.nowIso() });
    AutPred_auditar_({ evento: 'COMANDO_SIMULADO', quem: AUT_AUTOMATICO, disp: disp, operacaoId: cmd.OPERACAO_ID, resultado: 'SIMULADO', detalhe: cmd.CONFIRMACAO_DETALHE });
    avisar('Campainha da ' + nome + ' (teste)', 'A campainha da ' + nome + ' tocou' + quando + '. Abertura automática em simulação: nada foi enviado à fechadura. ' + modo.motivo);
    return cmd;
  }
  var r;
  try { r = Tuya_enviarComando_(c, disp.DEVICE_ID, [{ code: 'reply_unlock_request', value: true }]); }
  catch (e) { r = { aceito: false, http: e && e.tuyaHttp || 0, codigo: e && e.tuyaCodigo || 0, msg: Tuya_limpar_(e && e.message, c), resposta: '', incerto: !!(e && e.tuyaRede) }; }
  if (!r.aceito) {
    var sit = r.incerto ? 'INCERTO' : 'RECUSADO';
    AutPred_gravarComando_(cmd, { SITUACAO: sit, API_HTTP: r.http ? String(r.http) : '', API_CODIGO: r.codigo ? String(r.codigo) : '', API_TID: AutPred_s_(r.tid), API_RESPOSTA: AutPred_s_(r.resposta), CONFIRMACAO_DETALHE: r.msg });
    SGO_DATA.update(AUT_ABA_DISPOSITIVOS, disp.ID, { ULT_CMD_SITUACAO: sit, ATUALIZADO_EM: SGO_UTILS.nowIso() });
    AutPred_auditar_({ evento: 'COMANDO_RECUSADO', quem: AUT_AUTOMATICO, disp: disp, operacaoId: cmd.OPERACAO_ID, resultado: sit, detalhe: r.msg, dados: { http: r.http, codigo: r.codigo, tid: r.tid } });
    AutPred_registrarFalhaNuvem_(r);
    avisar('Campainha da ' + nome + ': não abriu sozinha', 'A campainha da ' + nome + ' tocou' + quando + ' e a abertura automática não conseguiu abrir (' + r.msg + '). Se ainda der tempo, toque em "Abrir agora" em Segurança predial.');
    return cmd;
  }
  AutPred_gravarComando_(cmd, { SITUACAO: 'ACEITO', API_HTTP: String(r.http || ''), API_CODIGO: '0', API_TID: AutPred_s_(r.tid), API_RESPOSTA: AutPred_s_(r.resposta) });
  SGO_DATA.update(AUT_ABA_DISPOSITIVOS, disp.ID, { ULT_CMD_SITUACAO: 'ACEITO', ATUALIZADO_EM: SGO_UTILS.nowIso() });
  AutPred_auditar_({ evento: 'COMANDO_ACEITO', quem: AUT_AUTOMATICO, disp: disp, operacaoId: cmd.OPERACAO_ID, resultado: 'ACEITO', detalhe: 'A API da Tuya aceitou a resposta ao pedido (HTTP ' + r.http + (r.tid ? ', tid ' + r.tid : '') + '). Aguardando a confirmação da fechadura.' });
  Utilities.sleep(AUT_CONFIRMACAO_ESPERA_MS);
  var conf = AutPred_conferirExecucao_(c, disp, cmd, AUT_AUTOMATICO);
  avisar('Porta aberta automaticamente: ' + nome, 'A campainha da ' + nome + ' tocou' + quando + ' e o SGO+ abriu a porta automaticamente (abertura automática ligada por ' + (AutPred_s_(disp.AUTO_ABRIR_POR) || 'um diretor') + '). ' +
    (conf.confirmado ? 'A fechadura confirmou a abertura.' : 'A fechadura ainda não confirmou: confira no local.'));
  return cmd;
}

// ------------------------------------------------------------
// CONFIRMAÇÃO SEM DIGITAR (22/10/2026, decisão do dono): token de uso único da janela
// ------------------------------------------------------------
var AUT_CONF_PREFIXO = 'AUT_CONF_';
var AUT_CONF_VALIDADE_MS = 60000;

/**
 * Toque em "Abrir portão" / "Destravar a porta": confere tudo o que o comando conferiria (sem gravar nada) e, se puder,
 * emite o token da janela de confirmação. dados = { dispositivoId, operacaoId }. Recusa com o motivo antes de abrir a janela.
 */
function AutPred_prepararComando_(sessao, dados) {
  dados = dados || {};
  var opId = AutPred_s_(dados.operacaoId);
  if (!/^[A-Za-z0-9_-]{8,80}$/.test(opId)) throw new Error('Não foi possível preparar o comando: a solicitação veio sem o identificador da operação. Atualize a página (F5) e tente de novo.');
  AutPred_bootstrap_();
  var comandos = AutPred_comandos_();
  if (comandos.some(function (x) { return AutPred_s_(x.OPERACAO_ID) === opId; })) throw new Error('Esta solicitação já foi processada. Toque de novo no botão para um comando novo.');
  var disp = AutPred_dispositivo_(dados.dispositivoId);
  var dir = AutPred_direitos_(sessao, disp, AutPred_permissoesDe_(sessao.userId));
  if (!dir.ver) throw new Error('Não foi possível continuar: o dispositivo não foi encontrado ou não está liberado para você. Clique em "Atualizar"; se precisar dele, peça ao Administrador ou à Diretoria.');
  var verbo = disp.TIPO === 'FECHADURA' ? 'destravar' : 'abrir';
  if (!dir.acionar) throw new Error('Não foi possível ' + verbo + ': ' + dir.motivo + '.');
  if (AutPred_s_(disp.ATIVO).toUpperCase() !== 'SIM') throw new Error('Não foi possível ' + verbo + ': o dispositivo está desativado no SGO+ (o Administrador ou um diretor reativa em Administrar).');
  if (AutPred_s_(disp.COMPAT_OK).toUpperCase() !== 'SIM') throw new Error('Não foi possível ' + verbo + ': não disponível pela API: ' + AutPred_s_(disp.COMPAT_MOTIVO));
  var c = AutPred_cfg_();
  var acaoP = AutPred_acaoPedida_(dados, disp);
  // O segundo toque depende da posição lida AGORA, não da linha guardada nem do rótulo no celular.
  var alternar = AutPred_s_(dados.acao).toUpperCase() === 'ALTERNAR';
  var alternavel = AutPred_pulsoComSensor_(disp) && AutPred_acionamento_(disp) === 'ABRIR_FECHAR';
  if (alternar && !alternavel) throw new Error('Este dispositivo não usa o botão alternado da garagem.');
  if (alternavel && AutPred_modo_(c, disp, acaoP).modo === 'REAL') {
    try {
      var atualP = AutPred_lerEstado_(c, disp);
      if (!atualP.online || AutPred_sensorAberto_(atualP.status) === null) throw new Error('dispositivo offline ou sensor sem posição');
    } catch (ePAtual) { throw AutPred_erroNuvem_(ePAtual, 'Não foi possível consultar a posição atual da garagem. Nenhum pulso foi enviado; tente novamente.', sessao); }
  }
  if (alternar) {
    var abertoP = AutPred_sensorAberto_(AutPred_deJson_(disp.ESTADO_JSON, []));
    if (abertoP === null) throw new Error('Não foi possível consultar a posição do portão. Nenhum pulso foi enviado.');
    acaoP = abertoP ? 'FECHAR' : 'ABRIR';
  }
  var freq = AutPred_podeAgora_(comandos, disp.ID, sessao.userId, Date.now(), disp.TIPO === 'FECHADURA' ? (acaoP === 'RECUSAR' ? 'RECUSAR' : 'DESTRAVAR') : acaoP);
  if (freq) throw new Error('Não foi possível ' + verbo + ' agora: ' + freq + '.');
  if (disp.TIPO !== 'FECHADURA' && !AutPred_comandoDaAcao_(disp, acaoP)) throw new Error(AutPred_textoSemAcao_(disp, acaoP));
  var travaP = AutPred_travaPulsoSensor_(disp, acaoP, AutPred_deJson_(disp.ESTADO_JSON, []));
  if (travaP) throw new Error('Não foi possível ' + (acaoP === 'FECHAR' ? 'fechar' : 'abrir') + ' agora: ' + travaP + '.');
  var pedido = null;
  if (AutPred_ehPedido_(disp) && c.podeLer) {
    pedido = AutPred_pedidoFechadura_(c, disp);
    if (!pedido.ativo) throw new Error('Não foi possível abrir: não há pedido de abertura ativo. A abertura remota da porta só vale enquanto a campainha está chamando; peça para tocarem a campainha e toque em "Abrir agora" dentro do tempo.');
    var ja = AutPred_respostaDoPedido_(comandos, disp.ID, pedido.pedidoId);
    if (ja) throw new Error('Este pedido de abertura já foi respondido por ' + AutPred_s_(ja.SOLICITANTE) + ' às ' + AutPred_s_(ja.QUANDO).slice(-5) + '.');
  }
  var modo = AutPred_modo_(c, disp, acaoP);
  var token = String(Utilities.getUuid()).replace(/-/g, '') + String(Utilities.getUuid()).replace(/-/g, '').slice(0, 8);
  CacheService.getScriptCache().put(AUT_CONF_PREFIXO + token, JSON.stringify({ u: AutPred_s_(sessao.userId), d: AutPred_s_(disp.ID), o: opId, a: acaoP, ate: Date.now() + AUT_CONF_VALIDADE_MS }), 120);
  return { confirmacaoToken: token, validadeS: AUT_CONF_VALIDADE_MS / 1000, operacaoId: opId, acao: acaoP, modo: modo.modo, modoMotivo: modo.motivo, pedido: pedido,
    dispositivo: AutPred_dispositivoParaTela_(disp, dir, sessao, c) };
}

/** Confere e consome (uso único) o token da janela. { ok, motivo }. */
/** Ação pedida: portão ABRIR | FECHAR | PARAR; fechadura em modo pedido ABRIR | RECUSAR. */
function AutPred_acaoPedida_(dados, disp) {
  dados = dados || {};
  if (AutPred_ehPedido_(disp)) return AutPred_s_(dados.resposta).toUpperCase() === 'RECUSAR' ? 'RECUSAR' : 'ABRIR';
  var a = AutPred_s_(dados.acao).toUpperCase();
  return a === 'FECHAR' || a === 'PARAR' ? a : 'ABRIR';
}
function AutPred_textoSemAcao_(disp, acao) {
  if (acao === 'ABRIR') return 'Não foi possível abrir: o dispositivo não informa um comando de abertura. Peça ao Administrador para conferir em Administrar.';
  if (AutPred_acionamento_(disp) !== 'ABRIR_FECHAR') return 'Não foi possível ' + (acao === 'FECHAR' ? 'fechar' : 'parar') + ': este portão está como "Pulso (só abrir)" e fecha manualmente. Se ele tiver fechar pela nuvem, o Administrador ou um diretor muda o acionamento em Administrar.';
  return 'Não foi possível ' + (acao === 'FECHAR' ? 'fechar' : 'parar') + ': o dispositivo não aceita este comando pela nuvem.';
}

function AutPred_consumirConfirmacao_(token, sessao, disp, opId, acao) {
  var motivo = 'a confirmação na janela não foi feita ou venceu (vale 60 segundos); toque de novo no botão e confirme em "Sim, abrir agora"';
  token = AutPred_s_(token);
  if (!/^[a-f0-9]{20,80}$/i.test(token)) return { ok: false, motivo: motivo };
  var cache = CacheService.getScriptCache(), j = null;
  try { j = JSON.parse(cache.get(AUT_CONF_PREFIXO + token) || 'null'); } catch (e) { j = null; }
  try { cache.remove(AUT_CONF_PREFIXO + token); } catch (e2) {}
  if (!j || !(Number(j.ate) >= Date.now())) return { ok: false, motivo: motivo };
  if (j.u !== AutPred_s_(sessao.userId) || j.d !== AutPred_s_(disp.ID) || j.o !== AutPred_s_(opId) || (acao && j.a && j.a !== acao)) return { ok: false, motivo: 'a confirmação não é deste usuário, deste dispositivo ou desta solicitação; toque de novo no botão e confirme na janela' };
  return { ok: true };
}

/**
 * Executa (ou simula) a abertura. dados = { dispositivoId, operacaoId, confirmacaoToken }.
 * Devolve { comando (registro), texto }. Lança erro com o quê/por quê/o que fazer quando recusa antes de registrar.
 */
/**
 * 22/10/2026: duas linhas iguais no mesmo segundo (duplo toque, duas operações) passavam juntas pela conferência do
 * intervalo de 10 s, porque cada uma lia os comandos antes de a outra gravar. Agora a conferência e a gravação da
 * solicitação acontecem sob a trava do script; a trava é solta logo depois de gravar (a espera pela confirmação fica fora).
 */
function AutPred_executar_(sessao, dados) {
  var trava = null;
  try { trava = LockService.getScriptLock(); trava.waitLock(15000); } catch (e) { trava = null; }
  var soltar = function () { if (trava) { try { trava.releaseLock(); } catch (e2) {} trava = null; } };
  try { return AutPred_executarComTrava_(sessao, dados, soltar); } finally { soltar(); }
}

function AutPred_executarComTrava_(sessao, dados, soltar) {
  soltar = soltar || function () {};
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
  var pedidoModo = AutPred_ehPedido_(disp);
  var acao = AutPred_acaoPedida_(dados, disp);
  var modo = AutPred_modo_(c, disp, acao);
  var recusar = pedidoModo && acao === 'RECUSAR';
  var verbo = disp.TIPO === 'FECHADURA' ? (recusar ? 'RECUSAR' : 'DESTRAVAR') : acao;
  var cmdPortao = disp.TIPO === 'FECHADURA' ? null : AutPred_comandoDaAcao_(disp, acao);
  var pedido = null;
  if (pedidoModo && c.podeLer) { try { pedido = AutPred_pedidoFechadura_(c, disp, 0); } catch (eP) { pedido = { ativo: false, erro: Tuya_limpar_(eP && eP.message, c) }; } }
  var base = {
    OPERACAO_ID: opId, QUANDO: AutPred_agoraTexto_(), QUANDO_EM: SGO_UTILS.nowIso(), SOLICITANTE_ID: AutPred_s_(sessao.userId), SOLICITANTE: AutPred_nome_(sessao), PERFIL: AutPred_perfil_(sessao),
    UNIDADE: AutPred_s_(disp.UNIDADE_NOME), DISPOSITIVO_ID: AutPred_s_(disp.ID), DEVICE_ID: AutPred_s_(disp.DEVICE_ID), DISPOSITIVO_NOME: AutPred_s_(disp.NOME || disp.NOME_PROVEDOR), TIPO: AutPred_s_(disp.TIPO),
    COMANDO: verbo, COMANDO_JSON: pedidoModo ? AutPred_json_({ code: 'reply_unlock_request', value: !recusar }) : disp.TIPO === 'FECHADURA' ? '{"fluxo":"password-ticket + password-free/open-door"}' : (cmdPortao ? AutPred_json_(cmdPortao) : AutPred_s_(disp.COMANDO_ABRIR_JSON)), MODO: modo.modo,
    CORRELACAO: pedidoModo && pedido && pedido.pedidoId ? pedido.pedidoId : AutPred_s_(disp.ULT_CMD_ID),
    ORIGEM: AutPred_origem_(dados.origem)
  };
  var negar = function (motivo, evento) {
    var reg = SGO_DATA.insert(AUT_ABA_COMANDOS, SGO_DATA.normalizarObjetoParaSheet(AUT_ABA_COMANDOS, SGO_DATA.gerarRegistroBase(Object.assign({}, base, { AUTORIZACAO: 'NEGADO', AUTORIZACAO_MOTIVO: motivo, SITUACAO: 'NEGADO', ATUALIZADO_EM: SGO_UTILS.nowIso() }))));
    AutPred_auditar_({ evento: evento || 'COMANDO_NEGADO', quem: sessao, disp: disp, operacaoId: opId, resultado: 'NEGADO', detalhe: motivo });
    throw new Error('Não foi possível ' + verbo.toLowerCase() + ': ' + motivo + '.');
  };
  if (!dir.acionar) negar(dir.motivo, 'COMANDO_NAO_AUTORIZADO');
  if (AutPred_s_(disp.ATIVO).toUpperCase() !== 'SIM') negar('o dispositivo está desativado no SGO+ (Administrador ou Diretoria reativa em Administrar dispositivos)');
  // 22/10/2026 (dono): sem digitar. A confirmação é o toque em "Sim, abrir agora" na janela, que só existe com o token de uso
  // único emitido por prepararComando (60 s, ligado ao usuário, ao dispositivo e ao id da operação). Chamada direta sem a janela = recusada.
  var conf = AutPred_consumirConfirmacao_(dados.confirmacaoToken, sessao, disp, opId, acao);
  if (!conf.ok) negar(conf.motivo, 'COMANDO_SEM_CONFIRMACAO');
  if (AutPred_s_(disp.COMPAT_OK).toUpperCase() !== 'SIM') negar('não disponível pela API: ' + AutPred_s_(disp.COMPAT_MOTIVO));
  if (disp.TIPO !== 'FECHADURA' && !cmdPortao) negar(AutPred_textoSemAcao_(disp, acao).replace(/^Não foi possível [^:]+: /, ''), 'COMANDO_NAO_DISPONIVEL');
  if (pedidoModo && c.podeLer) {
    if (!pedido || !pedido.ativo) negar('não há pedido de abertura ativo' + (pedido && pedido.erro ? ' (' + pedido.erro + ')' : '') + ': a abertura remota da porta só vale enquanto a campainha está chamando (cerca de 60 a 90 segundos). Peça para tocarem a campainha e toque em "Abrir agora" dentro do tempo', 'PEDIDO_EXPIRADO');
    var jaResp = AutPred_respostaDoPedido_(comandos, disp.ID, pedido.pedidoId);
    if (jaResp) negar('este pedido de abertura já foi respondido por ' + AutPred_s_(jaResp.SOLICITANTE) + ' às ' + AutPred_s_(jaResp.QUANDO).slice(-5) + ' (' + AutPred_situacaoTexto_(jaResp.SITUACAO) + ')', 'PEDIDO_JA_RESPONDIDO');
  }
  var freq = AutPred_podeAgora_(comandos, disp.ID, sessao.userId, Date.now(), verbo);
  if (freq) negar(freq, 'COMANDO_LIMITE');

  // Estado "antes" lido agora na nuvem quando o comando é real: o guardado pode ser velho (ex.: o pulso do acionador já
  // voltou ao repouso depois do último comando) e faria a confirmação não ver a mudança. Se a leitura falhar, usa o guardado.
  var antes = AutPred_deJson_(disp.ESTADO_JSON, []);
  if (modo.modo === 'REAL') {
    var falhouLeituraAntes = false, leituraAntes = null;
    try {
      leituraAntes = AutPred_lerEstado_(c, disp); antes = leituraAntes.status;
    } catch (eAntes) { falhouLeituraAntes = true; }
    if (AutPred_pulsoComSensor_(disp) && AutPred_acionamento_(disp) === 'ABRIR_FECHAR' &&
        (falhouLeituraAntes || !leituraAntes || !leituraAntes.online || AutPred_sensorAberto_(antes) === null))
      negar('não foi possível consultar a posição atual da garagem; nenhum pulso foi enviado', 'COMANDO_POSICAO');
  }
  var travaE = disp.TIPO !== 'FECHADURA' ? AutPred_travaPulsoSensor_(disp, acao, antes) : '';
  if (!travaE && modo.modo === 'REAL' && AutPred_pulsoComSensor_(disp) && AutPred_acionamento_(disp) === 'ABRIR_FECHAR') {
    var mudou = AutPred_sensorMudouEm_(c, disp), haS = (Date.now() - mudou) / 1000;
    if (mudou && haS >= 0 && haS < AUT_SENSOR_ASSENTAR_S) travaE = 'o sensor do portão acabou de mudar (o portão está passando por ele); a posição ainda não é confiável. Aguarde ' + Math.ceil(AUT_SENSOR_ASSENTAR_S - haS) + ' s';
  }
  if (travaE) negar(travaE, 'COMANDO_POSICAO');
  var cmd = SGO_DATA.insert(AUT_ABA_COMANDOS, SGO_DATA.normalizarObjetoParaSheet(AUT_ABA_COMANDOS, SGO_DATA.gerarRegistroBase(Object.assign({}, base, {
    AUTORIZACAO: 'AUTORIZADO', AUTORIZACAO_MOTIVO: dir.padraoDono ? 'responsável pelo sistema (padrão da porta da Diretoria)' : (!AutPred_restrito_(disp) ? (AutPred_ehDiretor_(sessao) ? 'diretor' : 'perfil ' + AutPred_perfil_(sessao) + ' (portões liberados à equipe interna)') : 'permissão individual ACIONAR'),
    SITUACAO: 'SOLICITADO', ESTADO_ANTES_JSON: AutPred_json_(antes), ATUALIZADO_EM: SGO_UTILS.nowIso()
  }))));
  SGO_DATA.update(AUT_ABA_DISPOSITIVOS, disp.ID, { ULT_CMD_ID: cmd.ID, ULT_CMD_EM: cmd.QUANDO_EM, ULT_CMD_SITUACAO: 'SOLICITADO', ULT_CMD_COMANDO: AutPred_s_(cmd.COMANDO), ATUALIZADO_EM: SGO_UTILS.nowIso() });
  soltar();
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
    if (pedidoModo) {
      r = Tuya_enviarComando_(c, disp.DEVICE_ID, [{ code: 'reply_unlock_request', value: !recusar }]);
    } else if (disp.TIPO === 'FECHADURA') {
      var tk = Tuya_fechaduraTicket_(c, disp.DEVICE_ID);
      r = tk.aceito ? Tuya_fechaduraAbrir_(c, disp.DEVICE_ID, tk.ticketId) : tk;
    } else {
      r = Tuya_enviarComando_(c, disp.DEVICE_ID, [cmdPortao]);
    }
  } catch (e) {
    r = { aceito: false, http: e && e.tuyaHttp || 0, codigo: e && e.tuyaCodigo || 0, msg: Tuya_limpar_(e && e.message, c), resposta: '', incerto: !!(e && e.tuyaRede) };
  }
  if (!r.aceito) {
    var sit = r.incerto ? 'INCERTO' : 'RECUSADO';
    AutPred_gravarComando_(cmd, { SITUACAO: sit, API_HTTP: r.http ? String(r.http) : '', API_CODIGO: r.codigo ? String(r.codigo) : '', API_TID: AutPred_s_(r.tid), API_RESPOSTA: AutPred_s_(r.resposta), CONFIRMACAO_DETALHE: r.msg });
    SGO_DATA.update(AUT_ABA_DISPOSITIVOS, disp.ID, { ULT_CMD_SITUACAO: sit, ATUALIZADO_EM: SGO_UTILS.nowIso() });
    AutPred_auditar_({ evento: 'COMANDO_RECUSADO', quem: sessao, disp: disp, operacaoId: opId, resultado: sit, detalhe: r.msg, dados: { http: r.http, codigo: r.codigo, tid: r.tid } });
    // 27/10/2026: falha da nuvem inteira (cota, plano, credencial) vira a mensagem para a equipe, e a gestão é avisada na hora
    var tipoF = AutPred_registrarFalhaNuvem_(r);
    if (tipoF && tipoF !== 'REDE') return { comando: AutPred_comandoParaTela_(cmd), foraDoAr: true, texto: AUT_TEXTO_FORA_DO_AR + (AutPred_administra_(sessao) ? ' Detalhe para a gestão: ' + r.msg + '.' : '') };
    return { comando: AutPred_comandoParaTela_(cmd), texto: (r.incerto ? 'Sem resposta da Tuya: não se sabe se o comando chegou (' : 'A Tuya não aceitou o comando (') + r.msg + '). Use "Conferir agora" para reler o estado antes de tentar de novo.' };
  }
  AutPred_gravarComando_(cmd, { SITUACAO: 'ACEITO', API_HTTP: String(r.http || ''), API_CODIGO: '0', API_TID: AutPred_s_(r.tid), API_RESPOSTA: AutPred_s_(r.resposta) });
  SGO_DATA.update(AUT_ABA_DISPOSITIVOS, disp.ID, { ULT_CMD_SITUACAO: 'ACEITO', ATUALIZADO_EM: SGO_UTILS.nowIso() });
  AutPred_auditar_({ evento: 'COMANDO_ACEITO', quem: sessao, disp: disp, operacaoId: opId, resultado: 'ACEITO', detalhe: 'A API da Tuya aceitou o comando (HTTP ' + r.http + (r.tid ? ', tid ' + r.tid : '') + '). Aguardando a confirmação do dispositivo.' });
  // 23/10/2026: o sensor do portão leva alguns segundos para mudar; até 3 leituras (cerca de 8 s) antes de responder.
  // Se o portão ainda está no percurso (fechar da garagem), a confirmação vem depois pelo sensor (AutPred_confirmarTardio_).
  var sensor = disp.TIPO !== 'FECHADURA' && AutPred_acionamento_(disp) === 'ABRIR_FECHAR' && AutPred_temSensor_(disp);
  var esperas = sensor ? [AUT_CONFIRMACAO_ESPERA_MS, 2500, 3000] : [AUT_CONFIRMACAO_ESPERA_MS];
  var conf = null;
  for (var i = 0; i < esperas.length; i++) {
    Utilities.sleep(esperas[i]);
    conf = AutPred_conferirExecucao_(c, disp, cmd, sessao, i < esperas.length - 1);
    if (conf.confirmado) break;
  }
  if (conf.confirmado) return { comando: AutPred_comandoParaTela_(cmd), texto: 'Execução confirmada: ' + conf.detalhe };
  if (conf.emCurso) return { comando: AutPred_comandoParaTela_(cmd), texto: 'Comando aceito: o portão está ' + (verbo === 'FECHAR' ? 'fechando' : 'abrindo') + '. Acompanhe a posição no selo; o SGO+ confirma pelo sensor quando ele chegar.' };
  AutPred_avisarSemConfirmacao_(disp, cmd, sessao);
  return { comando: AutPred_comandoParaTela_(cmd), texto: 'Comando aceito pela API, mas a execução ainda não foi confirmada pelo dispositivo. ' + conf.detalhe + ' Use "Conferir agora" em alguns segundos; se a porta não abriu, trate como não executado.' };
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
      if (AutPred_usuarioEhDiretor_(u) || (!soDiretoria && p === 'ADMIN')) out.push(AutPred_s_(u.ID));
    });
  } catch (e) {}
  return out;
}

function AutPred_situacaoTexto_(s) {
  return { SOLICITADO: 'Solicitado', ACEITO: 'Aceito pela API, sem confirmação', CONFIRMADO: 'Execução confirmada', RECUSADO: 'Recusado pela API', INCERTO: 'Sem resposta (incerto)',
    NEGADO: 'Negado pelo SGO+', SIMULADO: 'Simulado (nada enviado)' }[AutPred_s_(s)] || AutPred_s_(s);
}

// ------------------------------------------------------------
// REGISTRO DE RASTREABILIDADE LEGÍVEL (22/10/2026, dono: "era para isso se tornar a rastreabilidade")
// A tabela mostra quando, dispositivo, quem, ação, resultado em frase curta e origem; o técnico (JSON, código de função,
// identificadores, resposta da nuvem) fica guardado e aparece só recolhido em "Detalhes técnicos".
// ------------------------------------------------------------
var AUT_ORIGENS = { CELULAR: 'Celular', COMPUTADOR: 'Computador', ATALHO_INICIO: 'Atalho no Início', ATALHO_PORTOES: 'Atalho Portões', AUTOMATICO: 'Abertura automática (campainha)' };
function AutPred_origem_(o) { o = AutPred_s_(o).toUpperCase(); return AUT_ORIGENS[o] ? o : ''; }
function AutPred_quandoCompleto_(iso) { var t = AutPred_ms_(iso); return t ? Utilities.formatDate(new Date(t), AUT_FUSO, 'dd/MM/yyyy HH:mm:ss') : ''; }
function AutPred_diaChave_(iso) { var t = AutPred_ms_(iso); return t ? Utilities.formatDate(new Date(t), AUT_FUSO, 'yyyy-MM-dd') : ''; }
var AUT_ACOES_TEXTO = { ABRIR: 'Abrir', FECHAR: 'Fechar', PARAR: 'Parar', DESTRAVAR: 'Destravar', RECUSAR: 'Recusar pedido' };
var AUT_FEITO_TEXTO = { ABRIR: 'Aberto', FECHAR: 'Fechado', PARAR: 'Parado', DESTRAVAR: 'Destravado', RECUSAR: 'Pedido recusado' };

/** Motivo de recusa em poucas palavras, a partir do texto completo guardado. Função pura. */
function AutPred_motivoCurto_(t) {
  t = AutPred_s_(t);
  var regras = [[/intervalo mínimo/i, 'aguarde 10 s entre comandos'], [/no último minuto/i, 'muitos comandos em 1 minuto'], [/sem resultado/i, 'comando anterior ainda sem resultado'],
    [/confirmação na janela|não é deste usuário/i, 'sem a confirmação na janela'], [/pedido de abertura ativo|enquanto a campainha/i, 'fora da janela da campainha'],
    [/já foi respondido/i, 'pedido da campainha já respondido'], [/desativado/i, 'dispositivo desativado no SGO+'], [/Pulso \(só abrir\)|fecha manualmente/i, 'portão só abre (pulso)'],
    [/não disponível pela API|não aceita este comando/i, 'comando não disponível pela nuvem'], [/em movimento/i, 'portão em movimento'], [/já está aberto|já está fechado/i, 'portão já estava nessa posição'], [/sensor do portão não informou/i, 'sem leitura do sensor'], [/permissão|responsável pelo sistema|não está liberado|restrito/i, 'sem permissão'],
    [/código 2001|sem internet|offline/i, 'dispositivo sem internet'], [/sem resposta/i, 'sem resposta da nuvem']];
  for (var i = 0; i < regras.length; i++) if (regras[i][0].test(t)) return regras[i][1];
  return 'não autorizado';
}

/** Resultado legível: { tom: ok|alerta|info|perigo|neutro, texto }. Função pura sobre a linha de AUT_COMANDOS. */
function AutPred_resultadoLegivel_(c) {
  var sit = AutPred_s_(c.SITUACAO), acao = AutPred_s_(c.COMANDO), alvo = AutPred_s_(c.TIPO) === 'FECHADURA' ? 'pela fechadura' : 'pelo portão';
  var nalvo = AutPred_s_(c.TIPO) === 'FECHADURA' ? 'fechadura' : 'portão';
  var hora = function (iso) { var t = AutPred_ms_(iso); return t ? Utilities.formatDate(new Date(t), AUT_FUSO, 'HH:mm:ss') : ''; };
  if (sit === 'CONFIRMADO') return { tom: 'ok', texto: (AUT_FEITO_TEXTO[acao] || 'Feito') + ' — confirmado ' + alvo + (c.CONFIRMADO_EM ? ' às ' + hora(c.CONFIRMADO_EM) : '') };
  if (sit === 'ACEITO') return { tom: 'alerta', texto: 'Enviado — ' + nalvo + ' não confirmou' };
  if (sit === 'INCERTO') return { tom: 'alerta', texto: 'Enviado — sem resposta da nuvem' };
  if (sit === 'SIMULADO') {
    var d = AutPred_s_(c.CONFIRMACAO_DETALHE);
    var porque = /fechar deste portão ainda não foi homologado/i.test(d) ? 'fechar ainda não homologado' : /não foi homologado|homologado pela Diretoria/i.test(d) ? nalvo + ' ainda não homologado' : /Desligad|faltam o Access|desligada/i.test(d) ? 'automação desligada' : 'modo de teste';
    return { tom: 'info', texto: 'Teste — nada enviado (' + porque + ')' };
  }
  if (sit === 'NEGADO') return { tom: 'perigo', texto: 'Recusado — ' + AutPred_motivoCurto_(c.AUTORIZACAO_MOTIVO) };
  if (sit === 'RECUSADO') return { tom: 'perigo', texto: 'Falhou — ' + (/2001/.test(AutPred_s_(c.API_CODIGO)) ? 'dispositivo sem internet' : 'a nuvem recusou o comando') };
  if (sit === 'SOLICITADO') return { tom: 'neutro', texto: 'Em andamento' };
  return { tom: 'neutro', texto: AutPred_situacaoTexto_(sit) };
}

function AutPred_comandoParaTela_(c, locais) {
  var res = AutPred_resultadoLegivel_(c);
  return { quandoCompleto: AutPred_quandoCompleto_(c.QUANDO_EM), dia: AutPred_diaChave_(c.QUANDO_EM), acaoTexto: AUT_ACOES_TEXTO[AutPred_s_(c.COMANDO)] || AutPred_s_(c.COMANDO),
    resultadoTexto: res.texto, resultadoTom: res.tom, local: AutPred_s_(locais && locais[AutPred_s_(c.DISPOSITIVO_ID)]), origemTexto: AUT_ORIGENS[AutPred_s_(c.ORIGEM)] || '', solicitanteId: AutPred_s_(c.SOLICITANTE_ID),
    tecnico: { operacao: AutPred_s_(c.OPERACAO_ID), dispositivo: AutPred_s_(c.DEVICE_ID), comando: AutPred_s_(c.COMANDO_JSON), modo: AutPred_s_(c.MODO), situacao: AutPred_s_(c.SITUACAO),
      autorizacao: AutPred_s_(c.AUTORIZACAO) + (c.AUTORIZACAO_MOTIVO ? ': ' + AutPred_s_(c.AUTORIZACAO_MOTIVO) : ''), http: AutPred_s_(c.API_HTTP), codigo: AutPred_s_(c.API_CODIGO), tid: AutPred_s_(c.API_TID),
      detalhe: AutPred_s_(c.CONFIRMACAO_DETALHE), correlacao: AutPred_s_(c.CORRELACAO) },
    id: AutPred_s_(c.ID), operacaoId: AutPred_s_(c.OPERACAO_ID), quando: AutPred_s_(c.QUANDO), quandoEm: AutPred_s_(c.QUANDO_EM), solicitante: AutPred_s_(c.SOLICITANTE), perfil: AutPred_s_(c.PERFIL),
    unidade: AutPred_s_(c.UNIDADE), dispositivoId: AutPred_s_(c.DISPOSITIVO_ID), dispositivo: AutPred_s_(c.DISPOSITIVO_NOME), comando: AutPred_s_(c.COMANDO), modo: AutPred_s_(c.MODO),
    autorizacao: AutPred_s_(c.AUTORIZACAO), autorizacaoMotivo: AutPred_s_(c.AUTORIZACAO_MOTIVO), situacao: AutPred_s_(c.SITUACAO), situacaoTexto: AutPred_situacaoTexto_(c.SITUACAO),
    apiHttp: AutPred_s_(c.API_HTTP), apiCodigo: AutPred_s_(c.API_CODIGO), apiTid: AutPred_s_(c.API_TID), confirmadoEm: AutPred_dataBr_(c.CONFIRMADO_EM), detalhe: AutPred_s_(c.CONFIRMACAO_DETALHE),
    podeConferir: (AutPred_s_(c.SITUACAO) === 'ACEITO' || AutPred_s_(c.SITUACAO) === 'INCERTO') && Date.now() - AutPred_ms_(c.QUANDO_EM) < AUT_CONFIRMACAO_JANELA_MIN * 60000 };
}

function AutPred_dispositivoParaTela_(d, dir, sessao, cfg) {
  var modo = AutPred_modo_(cfg, d);
  var tela = { id: AutPred_s_(d.ID), deviceId: AutPred_s_(d.DEVICE_ID), nome: AutPred_s_(d.NOME || d.NOME_PROVEDOR), nomeProvedor: AutPred_s_(d.NOME_PROVEDOR), categoria: AutPred_s_(d.CATEGORIA), categoriaNome: AutPred_s_(d.CATEGORIA_NOME),
    produto: AutPred_s_(d.PRODUTO_NOME), tipo: AutPred_s_(d.TIPO), tipoNome: AutPred_tipoNome_(d.TIPO), unidadeId: AutPred_s_(d.UNIDADE_ID), unidade: AutPred_s_(d.UNIDADE_NOME) || 'Sem unidade definida', localizacao: AutPred_s_(d.LOCALIZACAO),
    restrito: AutPred_restrito_(d), homologado: AutPred_s_(d.HOMOLOGADO).toUpperCase() === 'SIM', homologadoPor: AutPred_s_(d.HOMOLOGADO_POR), homologadoEm: AutPred_dataBr_(d.HOMOLOGADO_EM), ativo: AutPred_s_(d.ATIVO).toUpperCase() !== 'NAO',
    online: AutPred_s_(d.ONLINE).toUpperCase() === 'SIM', estado: AutPred_estadoTexto_(d), estadoEm: AutPred_dataBr_(d.ESTADO_EM), compatOk: AutPred_s_(d.COMPAT_OK).toUpperCase() === 'SIM', compatMotivo: AutPred_s_(d.COMPAT_MOTIVO),
    comandoAbrir: AutPred_s_(d.COMANDO_ABRIR_JSON), acionamento: AutPred_acionamento_(d), acionamentoSugerido: AutPred_comandosPortao_(d).sugestao,
    podeFechar: d.TIPO !== 'FECHADURA' && !!AutPred_comandoDaAcao_(d, 'FECHAR'), podeParar: d.TIPO !== 'FECHADURA' && !!AutPred_comandoDaAcao_(d, 'PARAR'), temFecharNaNuvem: !!AutPred_comandosPortao_(d).fechar,
    pulsoAlternado: AutPred_pulsoComSensor_(d) && AutPred_acionamento_(d) === 'ABRIR_FECHAR',
    estadoPortao: d.TIPO !== 'FECHADURA' ? AutPred_estadoPortao_(d) : null, temSensor: AutPred_temSensor_(d), liberaEmS: AutPred_liberaEmS_(d), percursoS: d.TIPO !== 'FECHADURA' ? AutPred_percursoS_(d) : 0, percursoGravado: Number(d.PERCURSO_S) > 0,
    autoAbrir: AutPred_autoAbrir_(d), autoAbrirPor: AutPred_s_(d.AUTO_ABRIR_POR), autoAbrirEm: AutPred_dataBr_(d.AUTO_ABRIR_EM), podeAutoAbrir: AutPred_ehPedido_(d) && !!dir.acionar && AutPred_ehDiretor_(sessao),
    remotoFechadura: AutPred_s_(d.REMOTO_FECHADURA), modo: modo.modo, modoMotivo: modo.motivo, sincronizadoEm: AutPred_dataBr_(d.SINCRONIZADO_EM),
    ultComandoRecente: Date.now() - AutPred_ms_(d.ULT_CMD_EM) < AUT_CONFIRMACAO_JANELA_MIN * 60000,
    ultComandoEm: AutPred_dataBr_(d.ULT_CMD_EM), ultComandoSituacao: AutPred_situacaoTexto_(d.ULT_CMD_SITUACAO), ultComandoCodigo: AutPred_s_(d.ULT_CMD_SITUACAO), podeVer: !!dir.ver, podeAcionar: !!dir.acionar, motivoAcionar: dir.motivo || '' };
  // Somente os administradores recebem dados de configuração. A operação conserva
  // as capacidades já calculadas pelo servidor, posição, temporização e permissões.
  if (!AutPred_administra_(sessao)) {
    ['deviceId', 'nomeProvedor', 'categoria', 'categoriaNome', 'produto', 'unidadeId',
      'homologadoPor', 'homologadoEm', 'comandoAbrir', 'acionamentoSugerido',
      'temFecharNaNuvem', 'percursoGravado', 'autoAbrirPor', 'autoAbrirEm',
      'sincronizadoEm', 'modoMotivo'].forEach(function (k) { delete tela[k]; });
    tela.compatMotivo = tela.compatOk ? '' : 'Dispositivo indisponível para acionamento. Procure a administração.';
  }
  return tela;

}

/** Registro do período para a tela e a exportação: só dispositivos que a sessão vê. dados = { de, ate (aaaa-mm-dd), dispositivoId, pessoaId }. */
function AutPred_registro_(sessao, dados) {
  dados = dados || {};
  var perms = AutPred_permissoesDe_(sessao.userId), vis = {}, locais = {};
  AutPred_dispositivos_().forEach(function (d) {
    if (!AutPred_direitos_(sessao, d, perms).ver) return;
    vis[AutPred_s_(d.ID)] = AutPred_s_(d.NOME || d.NOME_PROVEDOR);
    locais[AutPred_s_(d.ID)] = AutPred_s_(d.LOCALIZACAO) || AutPred_s_(d.UNIDADE_NOME);
  });
  var data = function (t, fim) { var m = AutPred_s_(t).match(/^(\d{4})-(\d{2})-(\d{2})$/); return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), fim ? 23 : 0, fim ? 59 : 0, fim ? 59 : 0).getTime() : 0; };
  var de = data(dados.de, false) || Date.now() - 7 * 86400000, ate = data(dados.ate, true) || Date.now() + 60000;
  var todos = AutPred_comandos_().filter(function (c) { return vis[AutPred_s_(c.DISPOSITIVO_ID)] && AutPred_veComando_(sessao, c); });
  var pessoas = {};
  todos.forEach(function (c) { if (c.SOLICITANTE_ID) pessoas[AutPred_s_(c.SOLICITANTE_ID)] = AutPred_s_(c.SOLICITANTE); });
  var lista = todos.filter(function (c) {
    var t = AutPred_ms_(c.QUANDO_EM);
    if (t < de || t > ate) return false;
    if (dados.dispositivoId && AutPred_s_(c.DISPOSITIVO_ID) !== AutPred_s_(dados.dispositivoId)) return false;
    if (dados.pessoaId && AutPred_s_(c.SOLICITANTE_ID) !== AutPred_s_(dados.pessoaId)) return false;
    return true;
  }).sort(function (a, b) { return AutPred_ms_(b.QUANDO_EM) - AutPred_ms_(a.QUANDO_EM); });
  var limite = 1000;
  return { itens: lista.slice(0, limite).map(function (c) { return AutPred_comandoParaTela_(c, locais); }), total: lista.length, cortado: lista.length > limite,
    hoje: Utilities.formatDate(new Date(), AUT_FUSO, 'yyyy-MM-dd'), ontem: Utilities.formatDate(new Date(Date.now() - 86400000), AUT_FUSO, 'yyyy-MM-dd'),
    de: Utilities.formatDate(new Date(de), AUT_FUSO, 'yyyy-MM-dd'), ate: Utilities.formatDate(new Date(Math.min(ate, Date.now())), AUT_FUSO, 'yyyy-MM-dd'),
    dispositivos: Object.keys(vis).map(function (k) { return { id: k, nome: vis[k] }; }).sort(function (a, b) { return a.nome.localeCompare(b.nome); }),
    pessoas: Object.keys(pessoas).map(function (k) { return { id: k, nome: pessoas[k] }; }).sort(function (a, b) { return a.nome.localeCompare(b.nome); }) };
}

/** Evento da auditoria em frase legível. Função pura sobre a linha de AUT_AUDITORIA. */
function AutPred_eventoLegivel_(r) {
  var e = AutPred_s_(r.EVENTO), d = AutPred_s_(r.DETALHE);
  var mapa = { SINCRONIZACAO: 'Sincronizou com o Smart Life', DISPOSITIVO_DESCOBERTO: 'Dispositivo novo lido do Smart Life', DISPOSITIVO_ALTERADO: 'Alterou o cadastro do dispositivo',
    DISPOSITIVO_HOMOLOGADO: 'Homologou o dispositivo', DISPOSITIVO_HOMOLOGADO_FECHAR: 'Homologou o fechar', HOMOLOGACAO_RETIRADA: 'Retirou a homologação', HOMOLOGACAO_RETIRADA_FECHAR: 'Retirou a homologação do fechar',
    COMANDO_SOLICITADO: 'Pediu o comando', COMANDO_ACEITO: 'A nuvem aceitou o comando', EXECUCAO_CONFIRMADA: 'O dispositivo confirmou a execução', EXECUCAO_NAO_CONFIRMADA: 'O dispositivo não confirmou a execução',
    COMANDO_SIMULADO: 'Teste: nada enviado', COMANDO_RECUSADO: 'A nuvem recusou o comando', ESTADO_CONSULTADO: 'Leu o estado do dispositivo', PERMISSAO_CONCEDIDA: 'Concedeu permissão',
    PERMISSAO_REVOGADA: 'Revogou permissão', INTEGRIDADE_CONFERIDA: 'Conferiu a integridade do registro', PEDIDO_CAMPAINHA: 'A campainha tocou: pedido de abertura',
    AUTO_ABRIR_LIGADA: 'Ligou a abertura automática pela campainha', AUTO_ABRIR_DESLIGADA: 'Desligou a abertura automática pela campainha',
    MODO_ECONOMICO_DESLIGADO: 'Saiu do modo econômico da cota da Tuya', SAUDE_CONFIGURADA: 'Alterou o orçamento da cota e a consulta econômica' };
  if (/^(COMANDO_NEGADO|COMANDO_NAO_AUTORIZADO|COMANDO_LIMITE|COMANDO_SEM_CONFIRMACAO|COMANDO_POSICAO|PEDIDO_EXPIRADO|PEDIDO_JA_RESPONDIDO|COMANDO_NAO_DISPONIVEL)$/.test(e)) return 'Recusado: ' + AutPred_motivoCurto_(d);
  var frase = mapa[e] || e;
  // concessões, revogações e homologações: o motivo escrito pela pessoa é legível e fica junto
  if (/^PERMISSAO_|HOMOLOGA/.test(e) && d) frase += ': ' + d.slice(0, 160);
  return frase;
}

// ------------------------------------------------------------
// ADMINISTRAÇÃO (dispositivo, permissões)
// ------------------------------------------------------------
function AutPred_exigirAdministrador_(sessao, disp) {
  if (!AutPred_administra_(sessao)) throw new Error('Não foi possível continuar: administrar dispositivos e permissões é do Administrador e dos diretores. Se precisar de uma alteração, peça a um deles.');
  if (disp && AutPred_restrito_(disp) && !AutPred_ehDiretor_(sessao)) throw new Error('Não foi possível continuar: o dispositivo não foi encontrado ou não está liberado para você.');
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
  if (dados.ativo !== undefined) { var at = dados.ativo ? 'SIM' : 'NAO'; if (at !== (AutPred_s_(disp.ATIVO).toUpperCase() === 'NAO' ? 'NAO' : 'SIM')) { upd.ATIVO = at; mudancas.push(at === 'SIM' ? 'reativado' : 'desativado'); } }
  if (dados.percursoS !== undefined && disp.TIPO !== 'FECHADURA' && AutPred_s_(dados.percursoS) !== '') {
    var ps = Math.round(Number(dados.percursoS));
    if (!(ps >= 5 && ps <= 180)) throw new Error('Não foi possível gravar: o tempo de percurso precisa ser de 5 a 180 segundos (o tempo que o portão leva para abrir ou fechar por completo).');
    if (ps !== Number(disp.PERCURSO_S || 0)) { upd.PERCURSO_S = ps; mudancas.push('tempo de percurso: ' + ps + ' s'); }
  }
  if (dados.acionamento !== undefined && disp.TIPO !== 'FECHADURA') {
    var ac = AutPred_s_(dados.acionamento).toUpperCase() === 'ABRIR_FECHAR' ? 'ABRIR_FECHAR' : 'PULSO';
    if (ac === 'ABRIR_FECHAR' && !AutPred_comandosPortao_(disp).fechar) throw new Error('Não foi possível gravar: este dispositivo não informa um comando de fechar pela nuvem (door_control_1 ou control com "close"). Deixe como "Pulso (só abrir)".');
    if (ac !== AutPred_acionamento_(disp)) { upd.ACIONAMENTO = ac; mudancas.push('acionamento: ' + (ac === 'ABRIR_FECHAR' ? 'portão com abrir e fechar' : 'pulso (só abrir; fecha manualmente)')); }
  }
  if (dados.restrito !== undefined) {
    if (!AutPred_ehDiretor_(sessao)) throw new Error('Não foi possível gravar: só um diretor marca ou desmarca "Restrito à Diretoria".');
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
  if (upd.ATIVO) AutPred_atualizarSinalAuto_();
  AutPred_auditar_({ evento: 'DISPOSITIVO_ALTERADO', quem: sessao, disp: Object.assign({}, disp, upd), resultado: 'OK', detalhe: mudancas.join('; ') });
  return { mensagem: 'Dispositivo gravado: ' + mudancas.join('; ') + '.' };
}

/** Homologação pela Diretoria (depois do teste presencial): libera a execução real quando a integração está ligada. */
function AutPred_homologar_(sessao, dados) {
  dados = dados || {};
  if (!AutPred_ehDiretor_(sessao)) throw new Error('Não foi possível homologar: só um diretor homologa um dispositivo, depois do teste presencial. Peça a um diretor.');
  var disp = AutPred_dispositivo_(dados.id);
  var motivo = AutPred_s_(dados.motivo);
  if (motivo.length < 8) throw new Error('Não foi possível homologar: escreva como foi o teste presencial (mínimo de 8 caracteres).');
  var sim = !!dados.homologado;
  var doFechar = AutPred_s_(dados.comando).toUpperCase() === 'FECHAR';
  if (doFechar && sim && !AutPred_comandoDaAcao_(disp, 'FECHAR')) throw new Error('Não foi possível homologar o fechar: este portão está como "Pulso (só abrir)". Mude o acionamento em Administrar primeiro.');
  if (doFechar && sim && AutPred_s_(disp.HOMOLOGADO).toUpperCase() !== 'SIM') throw new Error('Não foi possível homologar o fechar: homologue primeiro o abrir deste portão.');
  var upd = doFechar ? { HOMOLOGADO_FECHAR: sim ? 'SIM' : 'NAO', HOMOLOGADO_FECHAR_POR: AutPred_nome_(sessao), HOMOLOGADO_FECHAR_EM: SGO_UTILS.nowIso(), ATUALIZADO_EM: SGO_UTILS.nowIso() }
    : { HOMOLOGADO: sim ? 'SIM' : 'NAO', HOMOLOGADO_POR: AutPred_nome_(sessao), HOMOLOGADO_EM: SGO_UTILS.nowIso(), ATUALIZADO_EM: SGO_UTILS.nowIso() };
  SGO_DATA.update(AUT_ABA_DISPOSITIVOS, disp.ID, upd);
  AutPred_auditar_({ evento: (sim ? 'DISPOSITIVO_HOMOLOGADO' : 'HOMOLOGACAO_RETIRADA') + (doFechar ? '_FECHAR' : ''), quem: sessao, disp: Object.assign({}, disp, upd), resultado: 'OK', detalhe: (doFechar ? 'Fechar: ' : '') + motivo });
  try { SGO_DATA.log(sim ? 'AUT_HOMOLOGADO' : 'AUT_HOMOLOGACAO_RETIRADA', AutPred_s_(sessao.usuario), AutPred_s_(disp.NOME || disp.NOME_PROVEDOR) + ': ' + motivo, 'AUTOMACAO'); } catch (e) {}
  if (doFechar) return { mensagem: sim ? 'Fechar homologado: com a automação ligada, o "Fechar portão" passa a ser real.' : 'Homologação do fechar retirada: o fechar volta à simulação.' };
  return { mensagem: sim ? 'Dispositivo homologado. Com a automação ligada em Chaves e senhas, os comandos passam a ser reais.' : 'Homologação retirada: o dispositivo volta à simulação.' };
}

function AutPred_usuariosInternos_() {
  return SGO_DATA.getAll(SGO_CFG.SHEETS.CAD_USUARIOS).filter(function (u) { return AutPred_s_(u.STATUS).toUpperCase() === 'ATIVO' && AUT_PERFIS_INTERNOS.indexOf(AutPred_s_(u.PERFIL).toUpperCase()) >= 0; })
    .map(function (u) { return { id: AutPred_s_(u.ID), login: AutPred_s_(u.USUARIO), nome: AutPred_s_(u.NOME) || AutPred_s_(u.USUARIO), perfil: AutPred_s_(u.PERFIL).toUpperCase(), diretor: AutPred_usuarioEhDiretor_(u), dono: AutPred_ehDonoLogin_(u.USUARIO) }; })
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
  if (!AutPred_restrito_(disp)) throw new Error('Não é preciso conceder: os portões são liberados para toda a equipe interna (ver, abrir e fechar). A permissão individual só existe para a porta da Diretoria.');
  if (AutPred_restrito_(disp)) {
    // "Minha sala é para o meu login ter acesso, os demais não" (dono, 22/10/2026): só o responsável pelo sistema libera a porta, e só para diretor.
    if (!AutPred_ehDono_(sessao)) throw new Error('Não foi possível conceder: a porta da Diretoria só é liberada pelo responsável pelo sistema. Peça a ele em Segurança e automação predial > Permissões.');
    if (u.dono) throw new Error('Não foi possível conceder: o responsável pelo sistema já destrava a porta da Diretoria por padrão; não precisa de permissão.');
    if (!u.diretor) throw new Error('Não foi possível conceder: a porta da Diretoria só pode ser liberada para diretores (perfil Diretoria ou vínculo de trabalho Diretoria no cadastro de usuários).');
  }
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
  if (AutPred_restrito_(disp) && !AutPred_ehDono_(sessao)) throw new Error('Não foi possível revogar: a permissão da porta da Diretoria é do responsável pelo sistema. Peça a ele.');
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

// Origem das chamadas à nuvem por ação da tela (consumo da cota, 27/10/2026); o que não está aqui conta como TELA.
var AUT_ORIGEM_ACAO = { estado: 'MANUAL', pedidoAgora: 'MANUAL', sincronizar: 'SINCRONIZAR', preparar: 'COMANDO', comando: 'COMANDO', conferir: 'COMANDO' };

function AutPred_api(sessionId, acao, dados) {
  return AutPred_resposta_(function () {
    var ref = { sessao: null };
    try { return Tuya_comOrigem_(AUT_ORIGEM_ACAO[String(acao || '')] || 'TELA', function () { return AutPred_apiAgir_(sessionId, acao, dados, ref); }); }
    catch (e) { throw AutPred_erroNuvem_(e, null, ref.sessao); }
  });
}

function AutPred_apiAgir_(sessionId, acao, dados, ref) {
  {
    var sessao = AutPred_sessao_(sessionId);
    ref.sessao = sessao;
    dados = dados || {};
    acao = String(acao || '');
    var adm = AutPred_administra_(sessao);
    var cfgApi = AutPred_cfg_();
    var emUso = AutPred_emUso_(cfgApi);
    if (acao === 'iniciar') {
      // 23/10/2026: em uso, toda a equipe interna recebe o menu e o atalho "Portões" (portões liberados a todos)
      var rapidos = adm || emUso ? AutPred_rapidos_(sessao, cfgApi) : [];
      var permite = adm || rapidos.length > 0;
      return { mostrarMenu: permite, podeAcionar: rapidos.length > 0, podeAdministrar: adm, ehDiretoria: AutPred_ehDiretor_(sessao), emUso: emUso };
    }
    // 22/10/2026 (dono): em produção o módulo entra desligado. Até a automação estar ligada e algum dispositivo homologado, só o
    // Administrador e os diretores usam o módulo (implantação); depois, também quem tem permissão. O servidor confere, não só o menu.
    if (!adm && !emUso) throw new Error('Não foi possível abrir: a Segurança e automação predial ainda está em implantação (até a homologação dos dispositivos, só o Administrador e os diretores usam). Use o menu para voltar ao Início; a gestão avisa quando for liberada.');
    if (acao === 'painel') return AutPred_painel_(sessao);
    if (acao === 'rapido') return { itens: AutPred_rapidos_(sessao, cfgApi), emUso: emUso, config: { ligado: cfgApi.ligado, podeLer: cfgApi.podeLer }, agora: AutPred_agoraTexto_(), infra: AutPred_infraTela_() };
    if (acao === 'preparar') return AutPred_prepararComando_(sessao, dados);
    if (acao === 'pedido') return AutPred_pedidosDaSessao_(sessao);
    if (acao === 'pedidoAgora') return AutPred_pedidosDaSessao_(sessao, true);
    if (acao === 'portoes') return AutPred_estadosPortoes_(sessao);
    // 27/10/2026: Saúde da infraestrutura (Diretoria e Administrador), SGO_Automacao_Saude.js
    if (acao === 'saude') return AutPred_saudePainel_(sessao);
    if (acao === 'saudeSairEconomico') return AutPred_saudeSairEconomico_(sessao, dados);
    if (acao === 'saudeCfg') return AutPred_saudeSalvarCfg_(sessao, dados);
    if (acao === 'autoAbrir') { var ma = AutPred_definirAutoAbrir_(sessao, dados); var pa = AutPred_painel_(sessao); pa.mensagem = ma.mensagem; return pa; }
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
    if (acao === 'registro') return AutPred_registro_(sessao, dados);
    if (acao === 'historico') {
      var vh = AutPred_dispositivoVisivel_(sessao, dados.dispositivoId);
      var lista = AutPred_comandos_().filter(function (x) { return AutPred_s_(x.DISPOSITIVO_ID) === AutPred_s_(vh.disp.ID) && AutPred_veComando_(sessao, x); })
        .sort(function (a, b) { return AutPred_ms_(b.QUANDO_EM) - AutPred_ms_(a.QUANDO_EM); }).slice(0, AUT_HISTORICO_MAX).map(function (c) { var lc = {}; lc[AutPred_s_(vh.disp.ID)] = AutPred_s_(vh.disp.LOCALIZACAO); return AutPred_comandoParaTela_(c, lc); });
      return { comandos: lista, dispositivo: AutPred_dispositivoParaTela_(vh.disp, vh.direitos, sessao, AutPred_cfg_()) };
    }
    if (acao === 'dispositivoSalvar') return AutPred_salvarDispositivo_(sessao, dados);
    if (acao === 'homologar') return AutPred_homologar_(sessao, dados);
    if (acao === 'permissoes') {
      AutPred_exigirAdministrador_(sessao);
      // 23/10/2026: portões são de toda a equipe; a permissão individual ficou só para a porta da Diretoria
      var dirPerm = AutPred_ehDiretor_(sessao);
      var disps = AutPred_dispositivos_().filter(function (d) { return dirPerm && AutPred_restrito_(d); });
      var ids = {};
      disps.forEach(function (d) { ids[AutPred_s_(d.ID)] = true; });
      return { usuarios: AutPred_usuariosInternos_(), dispositivos: disps.map(function (d) { return { id: AutPred_s_(d.ID), nome: AutPred_s_(d.NOME || d.NOME_PROVEDOR), restrito: AutPred_restrito_(d), unidade: AutPred_s_(d.UNIDADE_NOME) }; }),
        permissoes: AutPred_ler_(AUT_ABA_PERMISSOES).filter(function (p) { return ids[AutPred_s_(p.DISPOSITIVO_ID)]; }).sort(function (a, b) { return AutPred_ms_(b.CONCEDIDA_EM) - AutPred_ms_(a.CONCEDIDA_EM); }).map(AutPred_permissaoParaTela_) };
    }
    if (acao === 'permissaoConceder') return AutPred_conceder_(sessao, dados);
    if (acao === 'permissaoRevogar') return AutPred_revogar_(sessao, dados);
    if (acao === 'auditoria') {
      AutPred_exigirAdministrador_(sessao);
      var dirAud = AutPred_ehDiretor_(sessao);
      var itens = AutPred_ler_(AUT_ABA_AUDITORIA).filter(function (r) { return dirAud || AutPred_s_(r.RESTRITO) !== 'SIM'; })
        .sort(function (a, b) { return AutPred_ms_(b.QUANDO_EM) - AutPred_ms_(a.QUANDO_EM); }).slice(0, Math.min(500, Number(dados.limite) || 200))
        .map(function (r) { return { frase: AutPred_eventoLegivel_(r), quandoCompleto: AutPred_quandoCompleto_(r.QUANDO_EM), dia: AutPred_diaChave_(r.QUANDO_EM), id: AutPred_s_(r.ID), quando: AutPred_s_(r.QUANDO), evento: AutPred_s_(r.EVENTO), usuario: AutPred_s_(r.USUARIO), perfil: AutPred_s_(r.PERFIL), unidade: AutPred_s_(r.UNIDADE), dispositivo: AutPred_s_(r.DISPOSITIVO_NOME), resultado: AutPred_s_(r.RESULTADO), detalhe: AutPred_s_(r.DETALHE), operacaoId: AutPred_s_(r.OPERACAO_ID), hash: AutPred_s_(r.HASH).slice(0, 12) }; });
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
  }
}

/**
 * Em uso (decisão do dono, 22/10/2026): automação ligada E pelo menos um dispositivo ativo homologado pela Diretoria.
 * Antes disso o módulo é só do Administrador e dos diretores (menu, atalhos e servidor).
 */
function AutPred_emUso_(c) {
  c = c || AutPred_cfg_();
  if (!c.ligado) return false;
  return AutPred_dispositivos_().some(function (d) { return AutPred_s_(d.HOMOLOGADO).toUpperCase() === 'SIM' && AutPred_s_(d.ATIVO).toUpperCase() !== 'NAO'; });
}

/** Botões rápidos: dispositivos que a sessão pode acionar agora (ativo, compatível), portões primeiro. */
function AutPred_rapidos_(sessao, c) {
  c = c || AutPred_cfg_();
  var perms = AutPred_permissoesDe_(sessao.userId);
  var out = [];
  AutPred_dispositivos_().forEach(function (d) {
    if (AutPred_s_(d.ATIVO).toUpperCase() === 'NAO' || AutPred_s_(d.COMPAT_OK).toUpperCase() !== 'SIM') return;
    var dir = AutPred_direitos_(sessao, d, perms);
    if (dir.acionar) out.push(AutPred_dispositivoParaTela_(d, dir, sessao, c));
  });
  return out.sort(function (a, b) { return (a.tipo === 'FECHADURA' ? 1 : 0) - (b.tipo === 'FECHADURA' ? 1 : 0) || a.nome.localeCompare(b.nome); });
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
  var ultimos = AutPred_comandos_().filter(function (x) { return AutPred_veComando_(sessao, x) && visiveis.some(function (d) { return d.id === AutPred_s_(x.DISPOSITIVO_ID); }); })
    .sort(function (a, b) { return AutPred_ms_(b.QUANDO_EM) - AutPred_ms_(a.QUANDO_EM); }).slice(0, 12).map(AutPred_comandoParaTela_);
  return {
    agora: AutPred_agoraTexto_(), unidades: unidades, total: visiveis.length, totalCadastrados: todos.length,
    restritosOcultos: AutPred_ehAdmin_(sessao) ? restritosOcultos : 0, semPermissao: AutPred_administra_(sessao) ? 0 : semPermissao,
    config: AutPred_administra_(sessao) ? { ligado: c.ligado, temCredencial: c.temCredencial, podeLer: c.podeLer, faltas: c.faltas, regiao: c.regiaoNome } : { ligado: c.ligado, podeLer: c.podeLer },
    podeAdministrar: AutPred_administra_(sessao), ehDiretoria: AutPred_ehDiretor_(sessao), ehDono: AutPred_ehDono_(sessao), ehAdmin: AutPred_ehAdmin_(sessao), ultimosComandos: ultimos,
    rapido: AutPred_rapidos_(sessao, c), emUso: AutPred_emUso_(c), infra: AutPred_infraTela_(),
    // 27/10/2026: a aba "Saúde da infraestrutura" é da Diretoria e do Administrador (o Gestor não administra o módulo)
    podeVerSaude: AutPred_administra_(sessao)
  };
}
