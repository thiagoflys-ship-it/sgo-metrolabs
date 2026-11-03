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
  'ACIONAMENTO', 'HOMOLOGADO_FECHAR', 'HOMOLOGADO_FECHAR_POR', 'HOMOLOGADO_FECHAR_EM', 'AUTO_ABRIR', 'AUTO_ABRIR_POR', 'AUTO_ABRIR_EM', 'ULT_CMD_COMANDO', 'PERCURSO_S',
  'AUTO_ABRIR_POR_ID', 'EVENTOS_VALIDADO', 'EVENTOS_VALIDADO_EM', 'EVENTOS_VALIDADO_POR', 'EVENTOS_VALIDADO_DETALHE',
  'CANAL', 'CANAL_POR', 'CANAL_POR_ID', 'CANAL_EM', 'CANAL_MOTIVO', 'ONLINE_EM', 'MODELO_JSON', 'LEITURA_EM', 'LEITURA_LINHA_EM', 'LEITURA_ASSINATURA', 'REFRIG_CFG_JSON', 'REFRIG_ALERTA_JSON'];
var AUT_COLUNAS_NOVAS_20261022 = ['ACIONAMENTO', 'HOMOLOGADO_FECHAR', 'HOMOLOGADO_FECHAR_POR', 'HOMOLOGADO_FECHAR_EM', 'AUTO_ABRIR', 'AUTO_ABRIR_POR', 'AUTO_ABRIR_EM', 'ULT_CMD_COMANDO', 'PERCURSO_S',
  // 27/10/2026: quem ligou a abertura automática (id) e a validação por eventos (informativa)
  'AUTO_ABRIR_POR_ID', 'EVENTOS_VALIDADO', 'EVENTOS_VALIDADO_EM', 'EVENTOS_VALIDADO_POR', 'EVENTOS_VALIDADO_DETALHE',
  // 03/11/2026: canal de cada dispositivo (ponte local ou nuvem Tuya) e o refrigerador/freezer (só leitura, histórico e faixa)
  'CANAL', 'CANAL_POR', 'CANAL_POR_ID', 'CANAL_EM', 'CANAL_MOTIVO', 'ONLINE_EM', 'MODELO_JSON', 'LEITURA_EM', 'LEITURA_LINHA_EM', 'LEITURA_ASSINATURA', 'REFRIG_CFG_JSON', 'REFRIG_ALERTA_JSON'];
// 03/11/2026: histórico das leituras do refrigerador/freezer (só inclusão; grava quando muda ou a cada leitura agendada)
var AUT_ABA_LEITURAS = 'AUT_LEITURAS';
var AUT_COLUNAS_LEITURAS = ['ID', 'QUANDO', 'QUANDO_EM', 'DISPOSITIVO_ID', 'DEVICE_ID', 'DISPOSITIVO_NOME', 'CANAL', 'MOTIVO', 'ONLINE', 'LIGADO', 'MODO',
  'A_ATIVO', 'A_TEMP_C', 'A_AJUSTE_C', 'B_ATIVO', 'B_TEMP_C', 'B_AJUSTE_C', 'TRAVA', 'BATERIA_PCT', 'TENSAO_V', 'ERROS', 'PONTOS_JSON', 'CRIADO_EM'];
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
// CANAL DE CADA DISPOSITIVO (03/11/2026, dono: "os portões estão funcionando bem pela ponte do celular, deixa só a fechadura
// pela Tuya; cria um botão em cada dispositivo para escolhermos se queremos que ele trabalhe pela ponte ou pela Tuya")
//   PONTE  comandos e leituras SÓ pela ponte local (celular na rede da empresa); zero chamada à nuvem, inclusive as leituras
//          automáticas e de tela. Ponte fora do ar: a tela diz "ponte fora do ar desde ..." e o que fazer; NUNCA cai sozinho
//          para a nuvem (a Diretoria ou o Administrador troca para a Tuya com um toque, com motivo).
//   TUYA   como antes: nuvem do Smart Life (cota, bloqueio, eventos da nuvem); a ponte não é usada.
// Padrão sem escolha gravada: portão cadastrado no celular da ponte (servidor próprio) = PONTE; fechadura e demais = TUYA.
// O padrão do portão é fixado na primeira rotina (AutPred_fixarCanaisPadrao_), para nunca mudar sozinho depois.
// O caminho único para a nuvem (Tuya_chamar_, SGO_Automacao_Tuya.js) confere o canal em toda chamada.
// ------------------------------------------------------------
var AUT_CANAIS = { PONTE: 'Ponte local (celular)', TUYA: 'Nuvem Tuya' };
var AUT_CANAL_MEMO = { em: 0, mapa: null };
function AutPred_canalMemoLimpar_() { AUT_CANAL_MEMO.em = 0; AUT_CANAL_MEMO.mapa = null; }
function AutPred_ponteExiste_() { return typeof SGO_PORTOES_LOCAIS !== 'undefined'; }
function AutPred_ehRefrig_(d) { return AutPred_s_(d && d.TIPO) === 'REFRIGERADOR'; }

/** Canal que vale para o dispositivo: o gravado (CANAL); sem escolha, o padrão. */
function AutPred_canal_(d) {
  var g = AutPred_s_(d && d.CANAL).toUpperCase();
  if (g === 'PONTE' || g === 'TUYA') return g;
  return AutPred_canalPadrao_(d);
}
/** Padrão: portão cadastrado no celular da ponte (servidor próprio) = PONTE; o resto = TUYA. */
function AutPred_canalPadrao_(d) {
  if (!d || AutPred_s_(d.TIPO) !== 'PORTAO' || !AutPred_ponteExiste_()) return 'TUYA';
  return Tuya_ponteSituacao_(AutPred_s_(d.DEVICE_ID)).naPonte ? 'PONTE' : 'TUYA';
}
/** Canal pelo identificador da Tuya (usado por Tuya_chamar_). '' = fora do cadastro. Lista guardada por 2 s. */
function AutPred_canalDoDevice_(deviceId) {
  var id = AutPred_s_(deviceId);
  if (!id) return '';
  if (!AUT_CANAL_MEMO.mapa || Date.now() - AUT_CANAL_MEMO.em > 2000) {
    var m = {};
    AutPred_dispositivos_().forEach(function (d) { var k = AutPred_s_(d.DEVICE_ID); if (k) m[k] = { CANAL: d.CANAL, TIPO: d.TIPO, DEVICE_ID: k }; });
    AUT_CANAL_MEMO.mapa = m; AUT_CANAL_MEMO.em = Date.now();
  }
  var d = AUT_CANAL_MEMO.mapa[id];
  return d ? AutPred_canal_(d) : '';
}
/** Dispositivo do canal Ponte que a ponte não atende agora: a situação (Tuya_ponteSituacao_); senão null. */
function AutPred_ponteFora_(d) {
  if (AutPred_canal_(d) !== 'PONTE') return null;
  var s = Tuya_ponteSituacao_(AutPred_s_(d.DEVICE_ID));
  return s.atende ? null : s;
}
/** Frase para quem tentou usar o dispositivo com a ponte fora: o quê, por quê e o que fazer. */
function AutPred_textoPonteFora_(d, s, sessao, verbo) {
  var nome = AutPred_s_(d.NOME || d.NOME_PROVEDOR) || 'o dispositivo';
  return (verbo ? 'Não foi possível ' + verbo + ': ' : '') + nome + ' trabalha pela ponte local (celular na rede da empresa) e ' + s.texto + '. Nada foi enviado: o SGO+ não troca sozinho para a nuvem da Tuya. ' +
    (AutPred_ehRefrig_(d) ? 'Confira o equipamento no local.' : 'Use o controle ou o aplicativo Smart Life.') +
    (sessao && AutPred_administra_(sessao) ? ' Para usar a nuvem da Tuya enquanto isso: no cartão do dispositivo, toque em "Trabalhar pela Nuvem Tuya". Para religar a ponte: confira o celular da ponte (carregador, Wi-Fi da empresa, Termux aberto).' : ' A gestão pode trocar o dispositivo para a nuvem da Tuya.');
}

/** Primeira rotina com a ponte: o padrão PONTE do portão vira escolha gravada (nunca muda sozinho depois). Devolve quantos. */
function AutPred_fixarCanaisPadrao_() {
  if (!AutPred_ponteExiste_()) return 0;
  var n = 0;
  AutPred_dispositivos_().forEach(function (d) {
    if (AutPred_s_(d.CANAL) || AutPred_canalPadrao_(d) !== 'PONTE') return;
    var upd = { CANAL: 'PONTE', CANAL_POR: 'Padrão do SGO+', CANAL_POR_ID: '', CANAL_EM: SGO_UTILS.nowIso(), CANAL_MOTIVO: 'portão cadastrado no celular da ponte local (padrão: portões pela ponte)', ATUALIZADO_EM: SGO_UTILS.nowIso() };
    SGO_DATA.update(AUT_ABA_DISPOSITIVOS, d.ID, upd);
    AutPred_auditar_({ evento: 'CANAL_ALTERADO', quem: AUT_SISTEMA, disp: Object.assign({}, d, upd), resultado: 'OK', detalhe: 'Trabalhar pela: Ponte local (celular), padrão dos portões cadastrados no celular da ponte.' });
    n++;
  });
  if (n) AutPred_canalMemoLimpar_();
  return n;
}

/**
 * Troca o canal (Diretoria ou Administrador; dispositivo restrito, só diretor). dados = { id, canal: PONTE|TUYA, motivo }.
 * PONTE só para dispositivo cadastrado no celular da ponte (senão ficaria sem funcionar pelo SGO+).
 */
function AutPred_definirCanal_(sessao, dados) {
  dados = dados || {};
  var disp = AutPred_dispositivo_(dados.id);
  AutPred_exigirAdministrador_(sessao, disp);
  var novo = AutPred_s_(dados.canal).toUpperCase();
  if (!AUT_CANAIS[novo]) throw new Error('Não foi possível gravar: escolha "Ponte local (celular)" ou "Nuvem Tuya".');
  var motivo = AutPred_s_(dados.motivo);
  if (motivo.length < 5) throw new Error('Não foi possível trocar o canal: escreva o motivo (mínimo de 5 caracteres). Fica registrado com o seu nome.');
  var atual = AutPred_canal_(disp), nome = AutPred_s_(disp.NOME || disp.NOME_PROVEDOR);
  if (novo === atual && AutPred_s_(disp.CANAL)) return { mensagem: nome + ' já trabalha pela ' + AUT_CANAIS[novo] + '.' };
  if (novo === 'PONTE') {
    if (!AutPred_ponteExiste_()) throw new Error('Não foi possível trocar para a ponte: a ponte local só existe no servidor próprio do SGO+. Continue pela Nuvem Tuya.');
    var s = Tuya_ponteSituacao_(AutPred_s_(disp.DEVICE_ID));
    if (!s.naPonte) throw new Error('Não foi possível trocar para a ponte: ' + nome + ' não está cadastrado no celular da ponte, e ficaria sem funcionar pelo SGO+. Peça ao responsável pelo sistema para incluí-lo na ponte (portoes_local/LEIAME.md, "Cadastrar um dispositivo na ponte") e tente de novo quando ele aparecer como cadastrado.');
  }
  AutPred_bootstrap_();
  var upd = { CANAL: novo, CANAL_POR: AutPred_nome_(sessao), CANAL_POR_ID: AutPred_s_(sessao.userId), CANAL_EM: SGO_UTILS.nowIso(), CANAL_MOTIVO: motivo.slice(0, 300), ATUALIZADO_EM: SGO_UTILS.nowIso() };
  SGO_DATA.update(AUT_ABA_DISPOSITIVOS, disp.ID, upd);
  AutPred_canalMemoLimpar_();
  // a leitura compartilhada da tela recomeça pelo canal novo
  try { CacheService.getScriptCache().remove(AUT_ESTADO_CACHE + AutPred_s_(disp.DEVICE_ID)); } catch (eC) {}
  AutPred_auditar_({ evento: 'CANAL_ALTERADO', quem: sessao, disp: Object.assign({}, disp, upd), resultado: 'OK', detalhe: 'Trabalhar pela: ' + AUT_CANAIS[atual] + ' -> ' + AUT_CANAIS[novo] + '. Motivo: ' + motivo });
  try { SGO_DATA.log('AUT_CANAL', AutPred_s_(sessao.usuario), nome + ': ' + AUT_CANAIS[novo] + ' (' + motivo + ')', 'AUTOMACAO'); } catch (eL) {}
  var extra = '';
  if (novo === 'TUYA') {
    var u = Tuya_uso_();
    extra = u.bloqueio ? ' Atenção: a nuvem da Tuya está bloqueada agora (' + (u.bloqueio.tipo === 'PLANO' ? 'plano vencido' : 'cota esgotada') + '); pela nuvem, nada sai até ela voltar.' : ' As chamadas deste dispositivo passam a contar na cota da Tuya.';
  } else {
    var s2 = Tuya_ponteSituacao_(AutPred_s_(disp.DEVICE_ID));
    extra = s2.atende ? ' A ponte está no ar e atende este dispositivo; nenhuma chamada dele vai à nuvem.' : ' Atenção: ' + s2.texto + '; até a ponte voltar, nada sai pelo SGO+ para este dispositivo.';
  }
  return { mensagem: nome + ' passa a trabalhar pela ' + AUT_CANAIS[novo] + '.' + extra };
}

/** Situação do canal para a tela: { canal, nome, padrao, ponteOk, ponteTexto }. */
function AutPred_canalParaTela_(d) {
  var canal = AutPred_canal_(d), s = canal === 'PONTE' ? Tuya_ponteSituacao_(AutPred_s_(d.DEVICE_ID)) : null;
  return { canal: canal, nome: AUT_CANAIS[canal], padrao: !AutPred_s_(d.CANAL), ponteOk: s ? s.atende : null, ponteTexto: s && !s.atende ? s.texto : '' };
}

// ------------------------------------------------------------
// REFRIGERADOR / FREEZER (03/11/2026, dono: "se tiver como, colocar o refrigerador pela ponte também")
// "Car Refrigerator" (categoria xbx, freezer usado em calibração). Só leitura: nenhum comando sai do SGO+. Pela nuvem, a
// sombra v2.0 (/v2.0/cloud/thing/{id}/shadow/properties) a cada refrigIntervaloMin (padrão 10 min, 5 a 60, na Saúde; conta
// na cota; pausa no bloqueio e no modo econômico); pela ponte, a mesma sombra vem do celular, sem nuvem. Pontos (dp/código):
// 101 OnOff, 102 Lock (trava infantil), 103 Mode (MAX/ECO/HEAT), 104 BatteryProtect (L/M/H), 105 TempUnit, 106 Error (bits
// E1..E9), 107 Switch (divisória dupla), 108 HeatBox, 109 Spdt, 110 A_BoxOnOff, 111 B_BoxOnOff, 112 A_Temp_C, 113 B_Temp_C,
// 114 A_TempSet_C, 115 B_TempSet_C, 116 HeatTemp_Set_C, 122 A_BatteryVoltage (x0,1 V provável), 123 BatteryPencent.
// Histórico em AUT_LEITURAS: grava quando muda ou a cada leitura agendada. Alerta de faixa por dispositivo (desligado por
// padrão): fora da faixa em 2 leituras seguidas avisa a gestão uma vez (S79) e de novo quando volta.
// ------------------------------------------------------------
var AUT_REFRIG_ESCALA_PADRAO = { A_BatteryVoltage: 1 };   // x0,1 V; o modelo da nuvem (MODELO_JSON) confirma na sincronização
var AUT_REFRIG_ONLINE_MS = 3600000;                       // pela nuvem, "online" conferido no detalhe de hora em hora
var AUT_REFRIG_MODOS = { MAX: 'MAX (resfriamento máximo)', ECO: 'ECO (econômico)', HEAT: 'Aquecimento' };
var AUT_REFRIG_PROTECAO = { L: 'baixa', M: 'média', H: 'alta' };

/** Escalas dos pontos pelo modelo (/v2.0/cloud/thing/{id}/model) -> { código: { dp, tipo, scale, unit } }. Função pura. */
function AutPred_modeloEscalas_(res) {
  var m = res && res.model !== undefined ? res.model : res, out = {};
  if (typeof m === 'string') m = AutPred_deJson_(m, null);
  ((m && m.services) || []).forEach(function (s) {
    ((s && s.properties) || []).forEach(function (p) {
      if (!p || !p.code) return;
      var ts = p.typeSpec || {};
      out[String(p.code)] = { dp: Number(p.abilityId) || 0, tipo: AutPred_s_(ts.type), scale: Number(ts.scale) || 0, unit: AutPred_s_(ts.unit) };
    });
  });
  return out;
}
/** Pontos guardados do dispositivo: { código: valor } (ESTADO_JSON). */
function AutPred_pontosDe_(d) { var m = {}; (AutPred_deJson_(d && d.ESTADO_JSON, []) || []).forEach(function (s) { if (s && s.code) m[s.code] = s.value; }); return m; }
function AutPred_refrigEscala_(d, code) {
  var m = AutPred_deJson_(d && d.MODELO_JSON, {}) || {};
  if (m[code] && isFinite(Number(m[code].scale))) return Number(m[code].scale);
  return AUT_REFRIG_ESCALA_PADRAO[code] || 0;
}
function AutPred_refrigNum_(v, escala) {
  if (v === null || v === undefined || v === '' || typeof v === 'boolean' || !isFinite(Number(v))) return null;
  var n = Number(v) / Math.pow(10, Number(escala) || 0);
  return Math.round(n * 100) / 100;
}
/** Número em pt-BR (vírgula decimal; "-0" vira "0"). */
function AutPred_numBr_(n, casas) {
  if (n === null || n === undefined || !isFinite(Number(n))) return '';
  var t = Number(n).toFixed(casas || 0);
  if (Number(t) === 0) t = t.replace('-', '');
  return t.replace('.', ',');
}
function AutPred_grausBr_(n) { if (n === null || n === undefined) return ''; return AutPred_numBr_(n, Math.round(n) === n ? 0 : 1) + ' °C'; }
/** Erros do equipamento (bitmap E1..E9, ou texto com "E1, E3"). Função pura. */
function AutPred_refrigErros_(v) {
  if (v === null || v === undefined || v === '' || v === false || v === 0 || v === '0') return [];
  if (typeof v === 'number' || /^\d+$/.test(String(v))) {
    var n = Number(v), out = [];
    for (var i = 0; i < 9; i++) if (n & (1 << i)) out.push('E' + (i + 1));
    return out;
  }
  return (String(v).toUpperCase().match(/E\d/g) || []).filter(function (x, i, a) { return a.indexOf(x) === i; });
}

/**
 * Leitura legível do refrigerador (função pura sobre o dispositivo e os pontos { código: valor }):
 * { ligado, trava, modo, modoTexto, protecaoTexto, aquecimento, erros, erroTexto, a: { ativo, temp, ajuste }, b: {...}, bateriaPct, tensaoV, texto }.
 * Compartimento B só com a divisória dupla (Switch) não desligada e o B ligado. Temperaturas em °C.
 */
function AutPred_refrigLeitura_(d, pontos) {
  var p = pontos || {};
  var bool = function (k) { return p[k] === true ? true : p[k] === false ? false : null; };
  var num = function (k) { return AutPred_refrigNum_(p[k], AutPred_refrigEscala_(d, k)); };
  var modo = AutPred_s_(p.Mode).toUpperCase(), erros = AutPred_refrigErros_(p.Error);
  var dupla = bool('Switch'), aLig = bool('A_BoxOnOff'), bLig = bool('B_BoxOnOff');
  var a = { ativo: aLig !== false && (p.A_Temp_C !== undefined || p.A_TempSet_C !== undefined), temp: num('A_Temp_C'), ajuste: num('A_TempSet_C') };
  var b = { ativo: dupla !== false && bLig !== false && p.B_Temp_C !== undefined, temp: num('B_Temp_C'), ajuste: num('B_TempSet_C') };
  var l = { ligado: bool('OnOff'), trava: bool('Lock'), modo: modo, modoTexto: AUT_REFRIG_MODOS[modo] || (modo ? modo : ''), protecaoTexto: AUT_REFRIG_PROTECAO[AutPred_s_(p.BatteryProtect).toUpperCase()] || '',
    aquecimento: bool('HeatBox'), erros: erros, erroTexto: erros.length ? erros.join(', ') + ' (código de erro do equipamento; consulte o manual do refrigerador)' : 'nenhum',
    a: a, b: b, bateriaPct: num('BatteryPencent'), tensaoV: num('A_BatteryVoltage'), temPontos: Object.keys(p).length > 0 };
  var partes = [];
  var comp = function (nome, x) { if (!x.ativo) return; partes.push(nome + ' ' + (x.temp !== null ? AutPred_grausBr_(x.temp) : 'sem leitura') + (x.ajuste !== null ? ' (ajuste ' + AutPred_grausBr_(x.ajuste) + ')' : '')); };
  comp(b.ativo ? 'Compartimento A' : 'Temperatura', a); comp('Compartimento B', b);
  if (l.ligado === false) partes.push('desligado');
  if (l.modoTexto) partes.push('modo ' + l.modoTexto);
  if (erros.length) partes.push('erro ' + erros.join(', '));
  l.texto = l.temPontos ? (partes.join(' · ') || 'sem temperatura informada') : 'ainda sem leitura';
  return l;
}
/** O que entra na comparação "mudou" (a tensão oscila e fica de fora). */
function AutPred_refrigAssinatura_(l, online) {
  return AutPred_json_([online, l.ligado, l.modo, l.a.ativo, l.a.temp, l.a.ajuste, l.b.ativo, l.b.temp, l.b.ajuste, l.trava, l.erros.join(','), l.bateriaPct]);
}
/** Faixa configurada (REFRIG_CFG_JSON): { alerta, aMin, aMax, bMin, bMax } (números ou null). */
function AutPred_refrigCfg_(d) {
  var c = AutPred_deJson_(d && d.REFRIG_CFG_JSON, {}) || {};
  var n = function (v) { return v === null || v === undefined || v === '' || !isFinite(Number(v)) ? null : Number(v); };
  return { alerta: c.alerta === true, aMin: n(c.aMin), aMax: n(c.aMax), bMin: n(c.bMin), bMax: n(c.bMax) };
}
/** Fora da faixa? (função pura) { fora, partes: [frase] }. Só compartimento ativo com temperatura lida. */
function AutPred_refrigForaDaFaixa_(cfg, l) {
  var partes = [];
  [['a', 'A'], ['b', 'B']].forEach(function (k) {
    var x = l[k[0]], min = cfg[k[0] + 'Min'], max = cfg[k[0] + 'Max'];
    if (!x || !x.ativo || x.temp === null) return;
    if (min !== null && x.temp < min) partes.push('compartimento ' + k[1] + ' em ' + AutPred_grausBr_(x.temp) + ' (mínimo ' + AutPred_grausBr_(min) + ')');
    else if (max !== null && x.temp > max) partes.push('compartimento ' + k[1] + ' em ' + AutPred_grausBr_(x.temp) + ' (máximo ' + AutPred_grausBr_(max) + ')');
  });
  return { fora: partes.length > 0, partes: partes };
}
function AutPred_faixaTexto_(cfg) {
  var f = function (min, max) { return min !== null && max !== null ? AutPred_grausBr_(min) + ' a ' + AutPred_grausBr_(max) : min !== null ? 'mínimo ' + AutPred_grausBr_(min) : max !== null ? 'máximo ' + AutPred_grausBr_(max) : ''; };
  var a = f(cfg.aMin, cfg.aMax), b = f(cfg.bMin, cfg.bMax);
  return [a ? 'A: ' + a : '', b ? 'B: ' + b : ''].filter(Boolean).join('; ');
}

/** Alerta de faixa (opcional, desligado por padrão): 2 leituras seguidas fora avisam uma vez; a volta avisa de novo. */
function AutPred_refrigAlerta_(d, l) {
  var cfg = AutPred_refrigCfg_(d), st = AutPred_deJson_(d.REFRIG_ALERTA_JSON, {}) || {}, antes = AutPred_json_(st);
  var nome = AutPred_s_(d.NOME || d.NOME_PROVEDOR), agora = Date.now();
  var avisar = function (titulo, texto) {
    try { if (typeof SGO_notificar_ === 'function') SGO_notificar_({ usuarios: AutPred_usuariosGestao_(AutPred_restrito_(d)), titulo: titulo, canais: ['sgo', 'email'], origem: 'AUTOMACAO', refId: AutPred_s_(d.ID) + '-' + (st.desde || agora), evento: 'S79', texto: texto }); }
    catch (eN) { console.error('Automação predial, aviso do refrigerador: ' + ((eN && eN.message) || eN)); }
  };
  if (!cfg.alerta) st = {};
  else if (AutPred_s_(d.ONLINE).toUpperCase() !== 'NAO') {
    var f = AutPred_refrigForaDaFaixa_(cfg, l);
    if (f.fora) {
      st.seguidas = (Number(st.seguidas) || 0) + 1;
      if (!st.desde) st.desde = agora;
      if (st.seguidas >= 2 && !st.avisado) {
        st.avisado = true; st.avisadoEm = agora;
        var t = f.partes.join('; ');
        AutPred_auditar_({ evento: 'REFRIG_FORA_DA_FAIXA', quem: AUT_SISTEMA, disp: d, resultado: 'AVISADO', detalhe: 'Fora da faixa em 2 leituras seguidas: ' + t + '. Faixa: ' + AutPred_faixaTexto_(cfg) + '.' });
        avisar('Refrigerador fora da faixa: ' + nome, 'O quê: ' + nome + ' com ' + t + ' (leitura de ' + AutPred_hora_(agora) + '). Por quê: 2 leituras seguidas fora da faixa configurada (' + AutPred_faixaTexto_(cfg) + '). O que fazer: confira o equipamento no local (porta fechada, energia, ajuste de temperatura) e o material guardado nele. O SGO+ avisa de novo quando a temperatura voltar à faixa.');
      }
    } else {
      if (st.avisado) {
        AutPred_auditar_({ evento: 'REFRIG_NORMALIZADO', quem: AUT_SISTEMA, disp: d, resultado: 'OK', detalhe: 'Temperatura de volta à faixa (' + AutPred_faixaTexto_(cfg) + '): ' + l.texto + '.' });
        avisar('Refrigerador de volta à faixa: ' + nome, nome + ' voltou à faixa configurada (' + AutPred_faixaTexto_(cfg) + ') às ' + AutPred_hora_(agora) + ': ' + l.texto + '.');
      }
      st = {};
    }
  }
  if (AutPred_json_(st) !== antes) { var upd = { REFRIG_ALERTA_JSON: AutPred_json_(st) }; SGO_DATA.update(AUT_ABA_DISPOSITIVOS, d.ID, upd); d.REFRIG_ALERTA_JSON = upd.REFRIG_ALERTA_JSON; }
  return st;
}

/**
 * Lê o refrigerador agora e grava o estado. Canal Ponte: pela ponte (nenhuma chamada à nuvem; ponte fora = erro "ponte fora
 * do ar"); canal Tuya: sombra v2.0 (1 chamada) e, de hora em hora ou a pedido, o detalhe para o "online". agendada = leitura
 * do horário (sempre vira linha do histórico); senão só vira linha quando mudou. Devolve { leitura, gravou }.
 */
function AutPred_refrigLer_(c, d, origem, agendada) {
  var canal = AutPred_canal_(d), dev = AutPred_s_(d.DEVICE_ID), agora = SGO_UTILS.nowIso();
  if (canal === 'PONTE') { var pf = AutPred_ponteFora_(d); if (pf) throw Tuya_erroPonte_(dev); }
  var r = Tuya_comOrigem_(origem, function () { return Tuya_chamar_(c, 'GET', '/v2.0/cloud/thing/' + encodeURIComponent(dev) + '/shadow/properties', {}); });
  var j = Tuya_exigirOk_(r, c, 'a leitura do refrigerador');
  var lista = ((j.result && j.result.properties) || []).filter(function (p) { return p && p.code && (p.value === null || typeof p.value !== 'object'); })
    .map(function (p) { return { code: String(p.code), value: p.value }; });
  var upd = { ESTADO_JSON: AutPred_json_(lista).slice(0, 8000), ESTADO_EM: agora, LEITURA_EM: agora, ATUALIZADO_EM: agora };
  if (canal === 'PONTE') { upd.ONLINE = Tuya_ponteSituacao_(dev).online ? 'SIM' : 'NAO'; upd.ONLINE_EM = agora; }
  else if (origem === 'MANUAL' || Date.now() - AutPred_ms_(d.ONLINE_EM) >= AUT_REFRIG_ONLINE_MS) {
    try { var dd = Tuya_comOrigem_(origem, function () { return Tuya_dispositivo_(c, dev); }); upd.ONLINE = dd.online ? 'SIM' : 'NAO'; upd.ONLINE_EM = agora; } catch (eO) { upd.ONLINE_EM = agora; }
  }
  SGO_DATA.update(AUT_ABA_DISPOSITIVOS, d.ID, upd);
  Object.assign(d, upd);
  var l = AutPred_refrigLeitura_(d, AutPred_pontosDe_(d));
  var gravou = AutPred_refrigRegistrar_(d, l, canal, agendada ? 'AGENDADA' : '');
  try { AutPred_refrigAlerta_(d, l); } catch (eA) { console.error('Automação predial, faixa do refrigerador: ' + ((eA && eA.message) || eA)); }
  return { leitura: l, gravou: gravou };
}

/** Linha do histórico (AUT_LEITURAS): quando mudou ou na leitura agendada. Devolve true quando gravou. */
function AutPred_refrigRegistrar_(d, l, canal, motivo) {
  var ass = AutPred_refrigAssinatura_(l, AutPred_s_(d.ONLINE));
  var mudou = ass !== AutPred_s_(d.LEITURA_ASSINATURA);
  if (!l.temPontos || (motivo !== 'AGENDADA' && !mudou)) return false;
  var agora = new Date(), b = function (v) { return v === true ? 'SIM' : v === false ? 'NAO' : ''; }, n = function (v) { return v === null || v === undefined ? '' : v; };
  CertCal_garantirTabela_(AUT_ABA_LEITURAS, AUT_COLUNAS_LEITURAS);
  SGO_DATA.insert(AUT_ABA_LEITURAS, SGO_DATA.normalizarObjetoParaSheet(AUT_ABA_LEITURAS, SGO_DATA.gerarRegistroBase({
    QUANDO: Utilities.formatDate(agora, AUT_FUSO, 'dd/MM/yyyy HH:mm:ss'), QUANDO_EM: agora.toISOString(), DISPOSITIVO_ID: AutPred_s_(d.ID), DEVICE_ID: AutPred_s_(d.DEVICE_ID), DISPOSITIVO_NOME: AutPred_s_(d.NOME || d.NOME_PROVEDOR),
    CANAL: canal, MOTIVO: motivo === 'AGENDADA' ? 'AGENDADA' : 'MUDOU', ONLINE: AutPred_s_(d.ONLINE), LIGADO: b(l.ligado), MODO: l.modo,
    A_ATIVO: b(l.a.ativo), A_TEMP_C: n(l.a.temp), A_AJUSTE_C: n(l.a.ajuste), B_ATIVO: b(l.b.ativo), B_TEMP_C: n(l.b.temp), B_AJUSTE_C: n(l.b.ajuste),
    TRAVA: b(l.trava), BATERIA_PCT: n(l.bateriaPct), TENSAO_V: n(l.tensaoV), ERROS: l.erros.join(','), PONTOS_JSON: AutPred_s_(d.ESTADO_JSON).slice(0, 4000)
  })));
  var upd = { LEITURA_LINHA_EM: agora.toISOString(), LEITURA_ASSINATURA: ass };
  SGO_DATA.update(AUT_ABA_DISPOSITIVOS, d.ID, upd);
  Object.assign(d, upd);
  return true;
}

/**
 * Rotina (dentro da de 1 minuto): canal Ponte = lê pela ponte a cada minuto (sem nuvem) e grava quando muda ou a cada
 * refrigIntervaloMin; canal Tuya = uma leitura da sombra a cada refrigIntervaloMin (24 h; para no bloqueio e no modo
 * econômico, como toda leitura automática). Devolve quantas leituras fez.
 */
function AutPred_rotinaRefrigeradores_(c, agoraMs) {
  agoraMs = agoraMs || Date.now();
  var lista = AutPred_dispositivos_().filter(function (d) { return AutPred_ehRefrig_(d) && AutPred_s_(d.ATIVO).toUpperCase() !== 'NAO'; });
  if (!lista.length) return 0;
  var intervalo = AutPred_saudeCfg_().refrigIntervaloMin * 60000, n = 0;
  lista.forEach(function (d) {
    try {
      if (AutPred_canal_(d) === 'PONTE') {
        if (AutPred_ponteFora_(d)) return;
        AutPred_refrigLer_(c, d, 'AUTOMATICA', agoraMs - AutPred_ms_(d.LEITURA_LINHA_EM) >= intervalo);
      } else {
        if (!c.podeLer || agoraMs - AutPred_ms_(d.LEITURA_EM) < intervalo || Tuya_motivoPausa_('AUTOMATICA')) return;
        AutPred_refrigLer_(c, d, 'AUTOMATICA', true);
      }
      n++;
    } catch (e) { console.error('Automação predial, leitura do refrigerador: ' + Tuya_limpar_((e && e.message) || e, c)); }
  });
  return n;
}

/** Cartão do refrigerador: textos prontos (°C e números em pt-BR). */
function AutPred_refrigParaTela_(d) {
  var l = AutPred_refrigLeitura_(d, AutPred_pontosDe_(d)), cfg = AutPred_refrigCfg_(d), st = AutPred_deJson_(d.REFRIG_ALERTA_JSON, {}) || {};
  var comp = function (x) { return { ativo: !!x.ativo, temp: x.temp, ajuste: x.ajuste, tempTexto: x.temp !== null ? AutPred_grausBr_(x.temp) : 'sem leitura', ajusteTexto: x.ajuste !== null ? AutPred_grausBr_(x.ajuste) : '' }; };
  return { temPontos: l.temPontos, texto: l.texto, ligado: l.ligado, ligadoTexto: l.ligado === true ? 'Ligado' : l.ligado === false ? 'Desligado' : 'não informado',
    trava: l.trava, travaTexto: l.trava === true ? 'ligada' : l.trava === false ? 'desligada' : 'não informada', modoTexto: l.modoTexto || 'não informado', protecaoTexto: l.protecaoTexto,
    aquecimento: l.aquecimento === true, a: comp(l.a), b: comp(l.b), dupla: !!l.b.ativo,
    bateriaTexto: [l.bateriaPct !== null ? AutPred_numBr_(l.bateriaPct, 0) + '%' : '', l.tensaoV !== null ? AutPred_numBr_(l.tensaoV, 1) + ' V' : ''].filter(Boolean).join(' · ') || 'não informada',
    erros: l.erros, erroTexto: l.erroTexto, lidoEm: AutPred_dataBr_(d.LEITURA_EM || d.ESTADO_EM), lidoEmHora: AutPred_quandoCompleto_(d.LEITURA_EM || d.ESTADO_EM),
    alerta: { ligado: cfg.alerta, faixaTexto: AutPred_faixaTexto_(cfg), fora: !!st.avisado, aMin: cfg.aMin, aMax: cfg.aMax, bMin: cfg.bMin, bMax: cfg.bMax } };
}

/** Histórico das leituras para o gráfico. dados = { dispositivoId, horas (padrão 48, máximo 720) }. Até 1.500 pontos. */
function AutPred_leituras_(sessao, dados) {
  dados = dados || {};
  var v = AutPred_dispositivoVisivel_(sessao, dados.dispositivoId);
  if (!AutPred_ehRefrig_(v.disp)) throw new Error('Não foi possível mostrar: o histórico de temperaturas é só dos refrigeradores.');
  var horas = Math.min(720, Math.max(1, Math.round(Number(dados.horas) || 48))), de = Date.now() - horas * 3600000;
  var lista = AutPred_ler_(AUT_ABA_LEITURAS).filter(function (r) { return AutPred_s_(r.DISPOSITIVO_ID) === AutPred_s_(v.disp.ID) && AutPred_ms_(r.QUANDO_EM) >= de; })
    .sort(function (a, b) { return AutPred_ms_(a.QUANDO_EM) - AutPred_ms_(b.QUANDO_EM); });
  var passo = Math.max(1, Math.ceil(lista.length / 1500));
  var num = function (x) { return x === '' || x === null || x === undefined || !isFinite(Number(x)) ? null : Number(x); };
  var itens = lista.filter(function (r, i) { return i % passo === 0 || i === lista.length - 1; }).map(function (r) {
    return { em: AutPred_ms_(r.QUANDO_EM), quando: AutPred_quandoCompleto_(r.QUANDO_EM), aTemp: num(r.A_TEMP_C), aAjuste: num(r.A_AJUSTE_C), bTemp: AutPred_s_(r.B_ATIVO) === 'SIM' ? num(r.B_TEMP_C) : null,
      bAjuste: AutPred_s_(r.B_ATIVO) === 'SIM' ? num(r.B_AJUSTE_C) : null, ligado: AutPred_s_(r.LIGADO), online: AutPred_s_(r.ONLINE), erros: AutPred_s_(r.ERROS), motivo: AutPred_s_(r.MOTIVO), canal: AutPred_s_(r.CANAL) };
  });
  return { itens: itens, total: lista.length, horas: horas, dispositivo: AutPred_dispositivoParaTela_(v.disp, v.direitos, sessao, AutPred_cfg_()) };
}

// ------------------------------------------------------------
// DESCOBERTA (sincronização com o Smart Life)
// ------------------------------------------------------------
function AutPred_tipoNome_(tipo) { return tipo === 'PORTAO' ? 'Portão ou acesso' : tipo === 'FECHADURA' ? 'Fechadura' : tipo === 'REFRIGERADOR' ? 'Refrigerador ou freezer (só leitura)' : 'Outro'; }

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
    var ex = existentes[d.deviceId];
    // 03/11/2026: dispositivo do canal Ponte não é lido na nuvem (nem comandos, nem estado): só o nome e o produto
    if (ex && AutPred_canal_(ex) === 'PONTE') {
      SGO_DATA.update(AUT_ABA_DISPOSITIVOS, ex.ID, { NOME_PROVEDOR: d.nome, PRODUTO_ID: d.produtoId, PRODUTO_NOME: d.produtoNome, SINCRONIZADO_EM: agora, ATUALIZADO_EM: agora });
      atualizados++;
      return;
    }
    var funcoes = { categoria: d.categoria, funcoes: [] }, metodos = [], modelo = null;
    var catLista = String(d.categoria || '').toLowerCase();
    // refrigeração: só leitura (a nuvem responde 2009 às funções); o modelo (escala de cada ponto) vem da v2.0
    if (TUYA_CATEGORIAS_REFRIGERACAO[catLista]) {
      try { var rm = Tuya_chamar_(c, 'GET', '/v2.0/cloud/thing/' + encodeURIComponent(d.deviceId) + '/model', {}); if (rm.j && rm.j.success === true) modelo = AutPred_modeloEscalas_(rm.j.result); } catch (eM) { problemas.push(d.nome + ': modelo não lido (' + Tuya_limpar_(eM && eM.message, c) + ')'); }
    } else {
      try { funcoes = Tuya_funcoes_(c, d.deviceId); } catch (e) { problemas.push(d.nome + ': comandos não lidos (' + Tuya_limpar_(e && e.message, c) + ')'); }
    }
    var cat = (funcoes.categoria || d.categoria || '').toLowerCase();
    if (TUYA_CATEGORIAS_FECHADURA[cat]) {
      try { var mr = Tuya_fechaduraMetodosRemotos_(c, d.deviceId); metodos = mr.metodos || []; } catch (e2) {}
    }
    var compat = Tuya_compatibilidade_(cat, funcoes.funcoes, metodos);
    var catNome = TUYA_CATEGORIAS_PORTAO[cat] || TUYA_CATEGORIAS_FECHADURA[cat] || TUYA_CATEGORIAS_REFRIGERACAO[cat] || (cat ? 'Categoria ' + cat : 'Sem categoria');
    var upd = {
      PROVEDOR: 'TUYA', NOME_PROVEDOR: d.nome, CATEGORIA: cat, CATEGORIA_NOME: catNome, PRODUTO_ID: d.produtoId, PRODUTO_NOME: d.produtoNome, TIPO: compat.tipo,
      ONLINE: d.online ? 'SIM' : 'NAO', ONLINE_EM: agora, ESTADO_JSON: AutPred_json_(d.status), ESTADO_EM: agora, FUNCOES_JSON: AutPred_json_(funcoes.funcoes).slice(0, 8000),
      COMANDO_ABRIR_JSON: compat.comandoAbrir ? AutPred_json_(compat.comandoAbrir) : '', ESTADO_CODIGOS: compat.estadoCodigos.join(','), COMPAT_OK: compat.ok ? 'SIM' : 'NAO',
      COMPAT_MOTIVO: compat.motivo, REMOTO_FECHADURA: compat.remotoFechadura, SINCRONIZADO_EM: agora, ATUALIZADO_EM: agora
    };
    if (modelo) upd.MODELO_JSON = AutPred_json_(modelo).slice(0, 8000);
    // a lista da nuvem não traz o estado do refrigerador (a sombra traz): o guardado não é apagado
    if (compat.tipo === 'REFRIGERADOR' && !(d.status || []).length) { delete upd.ESTADO_JSON; delete upd.ESTADO_EM; }
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
  AutPred_canalMemoLimpar_();
  // a rotina de 1 minuto acompanha a campainha das fechaduras e as leituras do refrigerador
  try { if (lista.some(function (d) { var k = String(d.categoria || '').toLowerCase(); return TUYA_CATEGORIAS_FECHADURA[k] || TUYA_CATEGORIAS_REFRIGERACAO[k]; })) AutPred_garantirRotina_(); } catch (eRot) {}
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
  if (AutPred_ehRefrig_(disp)) return AutPred_refrigLeitura_(disp, AutPred_pontosDe_(disp)).texto;
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
var AUT_ESTADO_CACHE_MS = 4000;        // portão em movimento (percurso de um comando + 15 s): leitura compartilhada a cada 4 s (27/10/2026, dono: não ficar mais lento que os 4,5 s originais)
var AUT_ESTADO_TETO_S = 60;            // acima do teto do dia: portão parado relido a cada 60 s (em vez de portaoParadoS)
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
 * Intervalo da leitura compartilhada do portão parado sem eventos (ms), adaptado ao consumo do dia: portaoParadoS (20 s);
 * passou da média diária do orçamento, 60 s; passou do teto do dia (2 vezes a média), 120 s. Comandos não mudam.
 */
function AutPred_portaoParadoMs_() {
  var cfg = AutPred_saudeCfg_(), s = cfg.portaoParadoS;
  try {
    if (typeof AutPred_orcamentoAgora_ === 'function') {
      var o = AutPred_orcamentoAgora_(cfg);
      if (o.tetoDia && o.diaUsado >= o.tetoDia) s = Math.max(s, AUT_ESTADO_TETO_S * 2);
      else if (o.diaUsado >= Math.ceil(o.valor / Math.max(1, o.diasPeriodo))) s = Math.max(s, AUT_ESTADO_TETO_S);
    }
  } catch (e) {}
  return s * 1000;
}
/** Folga do minuto para os comandos: a tela não lê se o minuto já tem 70 chamadas (10 na recuperação depois de um bloqueio). */
function AutPred_reservaMinuto_() { return Tuya_fase_(Tuya_uso_()) === 'NORMAL' ? AUT_ESTADO_RESERVA : Math.floor(TUYA_LIMITE_MINUTO_RECUPERACAO / 2); }

/**
 * Relê o estado para a tela; grava só quando mudou. 27/10/2026 (cota da Tuya; depois, dono: "preservar a experiência"): com
 * eventos da Tuya chegando, usa o que o servidor recebeu (nenhuma chamada); sem eventos, UMA leitura central compartilhada
 * por todas as telas visíveis: a cada 4 s no percurso de um comando (+15 s) e a cada portaoParadoS (20 s) com o portão
 * parado. Só lê quando alguma tela visível pede (aba escondida não consulta). Bloqueio, recuperação e modo econômico pausam.
 * Devolve 'evento', true (leu a nuvem) ou false (usou o guardado).
 */
function AutPred_lerEstadoCompartilhado_(c, disp) {
  var ev = AutPred_eventoDisp_(disp.DEVICE_ID);
  if (ev) { AutPred_aplicarEvento_(disp, ev, true); return 'evento'; }
  var k = AUT_ESTADO_CACHE + AutPred_s_(disp.DEVICE_ID), cache = null;
  var limite = AutPred_emMovimento_(disp) ? AUT_ESTADO_CACHE_MS : AutPred_portaoParadoMs_();
  try { cache = CacheService.getScriptCache(); if (Date.now() - Number(cache.get(k) || 0) < limite) return false; } catch (e) {}
  if (Tuya_motivoPausa_('TELA')) return false;
  if (typeof Tuya_chamadasNoMinuto_ === 'function' && Tuya_chamadasNoMinuto_() >= AutPred_reservaMinuto_()) return false;
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
    if (d.TIPO === 'FECHADURA' || AutPred_ehRefrig_(d) || AutPred_s_(d.ATIVO).toUpperCase() === 'NAO') return;
    if (!AutPred_direitos_(sessao, d, perms).ver) return;
    var erro = '', fonte = '', canal = AutPred_canal_(d), pf = AutPred_ponteFora_(d);
    // 03/11/2026: canal Ponte com a ponte fora do ar: nenhuma leitura (nem na nuvem); a tela diz desde quando e o que fazer
    if (pf) { erro = 'Posição sem atualização: ' + AutPred_textoPonteFora_(d, pf, sessao); fonte = 'ponte'; }
    else if ((c.podeLer || canal === 'PONTE') && (AutPred_temSensor_(d) || AutPred_acionamento_(d) === 'ABRIR_FECHAR')) {
      try { var lido = AutPred_lerEstadoCompartilhado_(c, d); fonte = lido === 'evento' ? (canal === 'PONTE' ? 'ponte' : 'eventos') : 'consulta'; if (lido === 'evento') comEventos = true; }
      catch (e) { erro = AutPred_erroNuvem_(e, Tuya_limpar_(e && e.message, c), sessao).message; }
    }
    if (AutPred_emMovimento_(d)) movendo = true;
    try { AutPred_confirmarTardio_(d); } catch (eT) {}
    itens.push({ id: AutPred_s_(d.ID), online: AutPred_s_(d.ONLINE).toUpperCase() === 'SIM', estadoPortao: AutPred_estadoPortao_(d), estado: AutPred_estadoTexto_(d),
      ultComandoEm: AutPred_dataBr_(d.ULT_CMD_EM), ultComandoSituacao: AutPred_situacaoTexto_(d.ULT_CMD_SITUACAO), ultComandoCodigo: AutPred_s_(d.ULT_CMD_SITUACAO),
      ultComandoRecente: Date.now() - AutPred_ms_(d.ULT_CMD_EM) < AUT_CONFIRMACAO_JANELA_MIN * 60000, liberaEmS: AutPred_liberaEmS_(d), erro: erro, fonte: fonte,
      estadoLidoEm: AutPred_dataBr_(d.ESTADO_EM), canal: AutPred_canalParaTela_(d) });
  });
  return { itens: itens, hora: AutPred_hora_(Date.now()), proximaS: movendo ? 3 : 10, infra: AutPred_infraTela_() };
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
  if (r.confirmado) AutPred_validarPorEventos_(disp, cmd); // 27/10/2026: informativo (Saúde da infraestrutura)
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
  // 27/10/2026: o pedido nunca vale mais que a janela da fechadura (valor fora do normal não estica o prazo)
  var valor = Math.min(AUT_PEDIDO_MAX_S, Number(g.valor) || 0), em = Number(g.valorEm) || 0;
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
// Sem isso, cai na CONSULTA da fechadura: só no horário configurado (AUT_SAUDE_CFG, padrão dias úteis 08:00-18:00) e no
// máximo uma leitura a cada consultaIntervaloS (27/10/2026, dono: 60 s, menor que a janela de ~90 s do pedido, para a
// abertura automática e o aviso S67 continuarem sem eventos), compartilhada por telas, rotina rápida e rotina de 1 minuto.
// Volta a zero consulta assim que os eventos chegam. Nunca volta à leitura a cada 3 s.
// ------------------------------------------------------------
var AUT_MSG_ESTADO = 'TUYA_MSG_ESTADO';
var AUT_EVT_PREFIXO = 'TUYA_EVT_';
var AUT_MSG_VIVO_MS = 180000;
var AUT_SAUDE_CFG = 'AUT_SAUDE_CFG';
// 27/10/2026 (dono: "nada que funcionava pode ficar mais lento; o único problema era o consumo"):
//   consultaIntervaloS  consulta da fechadura SEM eventos (abertura automática, aviso S67 e telas, leitura única
//                       compartilhada): 60 s, sempre menor que a janela do pedido (~90 s), de 30 a 85 s. Só no horário
//                       configurado (padrão: dias úteis, 08:00 às 18:00; 24 h não cabe no orçamento provisório, ver manual).
//   portaoParadoS       posição do portão parado SEM eventos, com alguma tela visível: 20 s (60 s acima do teto do dia);
//                       no percurso de um comando, 4 s. Ninguém olhando = nenhuma leitura (salvo a confirmação do comando).
//   orcamento           confirmado pela gestão (SGO_Automacao_Saude.js); sem ele, referência provisória (sem degradar nada).
//   refrigIntervaloMin  (03/11/2026) leitura do refrigerador/freezer: pela nuvem, 1 chamada a cada 10 min (5 a 60), 24 h;
//                       pela ponte, sem nuvem (o histórico grava quando muda e neste mesmo intervalo).
var AUT_SAUDE_PADRAO = { avisoPct: 70, economicoPct: 90, consultaInicio: '08:00', consultaFim: '18:00', consultaDias: [1, 2, 3, 4, 5], consultaIntervaloS: 60, portaoParadoS: 20, refrigIntervaloMin: 10, orcamento: null };
var AUT_PEDIDO_MAX_S = 90;              // o pedido da campainha dura até 90 s (medido em 22/10/2026)

function AutPred_saudeCfg_() {
  var g = {};
  try { g = JSON.parse(PropertiesService.getScriptProperties().getProperty(AUT_SAUDE_CFG) || '{}') || {}; } catch (e) { g = {}; }
  var c = {};
  Object.keys(AUT_SAUDE_PADRAO).forEach(function (k) { c[k] = g[k] !== undefined && g[k] !== null && g[k] !== '' ? g[k] : AUT_SAUDE_PADRAO[k]; });
  c.orcamento = typeof AutPred_orcamentoNormalizar_ === 'function' ? AutPred_orcamentoNormalizar_(g.orcamento) : null;
  c.avisoPct = Math.min(99, Math.max(10, Number(c.avisoPct) || 70));
  c.economicoPct = Math.min(100, Math.max(c.avisoPct + 1, Number(c.economicoPct) || 90));
  c.consultaIntervaloS = Math.min(85, Math.max(30, Math.round(Number(c.consultaIntervaloS) || 60)));
  c.portaoParadoS = Math.min(600, Math.max(10, Math.round(Number(c.portaoParadoS) || 20)));
  c.refrigIntervaloMin = Math.min(60, Math.max(5, Math.round(Number(c.refrigIntervaloMin) || 10)));
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

/**
 * Por onde a fechadura é acompanhada agora: { via: 'EVENTOS' | 'CONSULTA' | 'NENHUM', intervaloS, motivo }. EVENTOS = zero
 * consulta; CONSULTA = leitura compartilhada a cada consultaIntervaloS (abertura automática, aviso S67 e telas); NENHUM =
 * sem eventos e fora do horário da consulta, ou consulta pausada (bloqueio, recuperação, modo econômico).
 */
function AutPred_caminhoFechadura_(d, cfg, agoraMs) {
  cfg = cfg || AutPred_saudeCfg_();
  if (AutPred_eventoDisp_(d && d.DEVICE_ID)) return { via: 'EVENTOS', intervaloS: 0, motivo: '' };
  var pausa = Tuya_motivoPausa_('AUTOMATICA');
  if (pausa) return { via: 'NENHUM', intervaloS: cfg.consultaIntervaloS, motivo: 'consulta pausada: ' + pausa };
  if (!AutPred_naJanela_(cfg, agoraMs)) return { via: 'NENHUM', intervaloS: cfg.consultaIntervaloS, motivo: 'fora do horário da consulta (' + cfg.consultaInicio + ' às ' + cfg.consultaFim + ')' };
  return { via: 'CONSULTA', intervaloS: cfg.consultaIntervaloS, motivo: '' };
}

/**
 * Quem ligou a abertura automática ainda pode destravar a porta? { ok, motivo }. 27/10/2026: só INFORMA (Saúde); a decisão
 * de desligar é da Diretoria. Sem id gravado (ligada antes de 27/10/2026), procura pelo nome.
 */
function AutPred_autoResponsavel_(d) {
  try {
    var id = AutPred_s_(d.AUTO_ABRIR_POR_ID), nome = AutPred_s_(d.AUTO_ABRIR_POR);
    var us = SGO_DATA.getAll(SGO_CFG.SHEETS.CAD_USUARIOS).filter(function (u) { return id ? AutPred_s_(u.ID) === id : AutPred_s_(u.NOME) === nome; });
    var u = us.length === 1 ? us[0] : null;
    if (!u || AutPred_s_(u.STATUS).toUpperCase() !== 'ATIVO') return { ok: false, motivo: 'quem ligou a opção (' + (nome || 'sem nome') + ') não está ativo no SGO+' };
    var s = { userId: AutPred_s_(u.ID), usuario: AutPred_s_(u.USUARIO), perfil: AutPred_s_(u.PERFIL) };
    if (!AutPred_direitos_(s, d, AutPred_permissoesDe_(s.userId)).acionar) return { ok: false, motivo: 'quem ligou a opção (' + nome + ') não pode mais destravar a porta' };
    return { ok: true, motivo: '' };
  } catch (e) { return { ok: true, motivo: '' }; }
}

function AutPred_msgEstado_() {
  try { return JSON.parse(PropertiesService.getScriptProperties().getProperty(AUT_MSG_ESTADO) || '{}') || {}; } catch (e) { return {}; }
}
function AutPred_eventosVivos_(m) { m = m || AutPred_msgEstado_(); return !!m.conectado && Date.now() - Number(m.vivoEm || 0) < AUT_MSG_VIVO_MS; }

/** Eventos do dispositivo que valem agora (conexão viva e algum evento já recebido dele), ou null. */
function AutPred_eventoDisp_(deviceId) {
  // 27/10/2026: a ponte local dos portões grava no mesmo formato; com ela viva, o portão também é acompanhado sem chamada
  // 03/11/2026: pelo canal do dispositivo: Ponte = só o que a ponte gravou (com ela atendendo); Tuya = só os eventos da nuvem
  if (!AutPred_s_(deviceId)) return null;
  var canal = AutPred_canalDoDevice_(deviceId), ponte = typeof Tuya_localAtende_ === 'function' && Tuya_localAtende_(deviceId);
  var vale = canal === 'PONTE' ? ponte : canal === 'TUYA' ? AutPred_eventosVivos_() : (AutPred_eventosVivos_() || ponte);
  if (!vale) return null;
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

/**
 * Pedido da campainha a partir dos eventos (mesmo formato de AutPred_pedidoAgora_, com fonte = 'EVENTO').
 * 27/10/2026 (proteção contra mensagem antiga ou reentregue depois de uma reconexão): vale só com a hora do próprio ponto
 * (nunca a hora em que o servidor recebeu), o prazo conta dessa hora e nunca passa de 90 s; hora no futuro não vale.
 */
function AutPred_pedidoDoEvento_(ev) {
  var p = ev.props || {}, u = p.unlock_request || { value: 0, time: 0 }, db = p.doorbell || {}, co = p.closed_opened || {};
  var t = Number(u.time) || 0, agora = Date.now();
  var valido = t > 0 && t <= agora + 5000 && agora - t <= AUT_PEDIDO_MAX_S * 1000;
  var r = AutPred_pedidoAgora_({ lidoMs: agora, valor: valido ? Number(u.value) || 0 : 0, valorEm: t, campainhaEm: Number(db.time) || 0, porta: AutPred_s_(co.value) });
  r.fonte = 'EVENTO';
  return r;
}

/** Hora (ms) do último pedido da campainha recebido por evento desta fechadura (0 = nenhum). Informativo e validação. */
function AutPred_pedidoEventoEm_(ev) {
  if (!ev) return 0;
  var p = ev.props || {}, u = p.unlock_request || {}, db = p.doorbell || {};
  return Math.max(Number(ev.pedidoEm) || 0, Number(u.value) > 0 ? Number(u.time) || 0 : 0, db.value ? Number(db.time) || 0 : 0);
}
/** Eventos guardados do dispositivo, mesmo com a conexão parada agora (informativo). */
function AutPred_eventoGuardado_(deviceId) {
  try { var e = JSON.parse(PropertiesService.getScriptProperties().getProperty(AUT_EVT_PREFIXO + AutPred_s_(deviceId)) || 'null'); return e && e.props ? e : null; } catch (x) { return null; }
}
function AutPred_eventosValidado_(d) { return AutPred_s_(d && d.EVENTOS_VALIDADO).toUpperCase() === 'SIM'; }

/**
 * Validação por eventos (27/10/2026; dono, depois: só INFORMATIVA, não trava nada): (a) o SGO+ recebeu desta fechadura,
 * pelo serviço de mensagens, o pedido da campainha e (b) a resposta "abrir" pedida por uma pessoa autorizada durante esse
 * pedido foi confirmada pela fechadura. A conexão viva sozinha não conta. Grava EVENTOS_VALIDADO* e a auditoria.
 */
function AutPred_validarPorEventos_(disp, cmd) {
  try {
    if (!AutPred_ehPedido_(disp) || AutPred_eventosValidado_(disp)) return false;
    if (AutPred_s_(cmd.COMANDO) !== 'DESTRAVAR' || AutPred_s_(cmd.ORIGEM) === 'AUTOMATICO' || !AutPred_s_(cmd.SOLICITANTE_ID) || AutPred_s_(cmd.MODO) !== 'REAL' || AutPred_s_(cmd.AUTORIZACAO) !== 'AUTORIZADO') return false;
    var pe = AutPred_pedidoEventoEm_(AutPred_eventoGuardado_(disp.DEVICE_ID)), t = AutPred_ms_(cmd.QUANDO_EM);
    if (!pe || pe > t + 5000 || t - pe > (AUT_PEDIDO_MAX_S + 5) * 1000) return false;
    var agora = SGO_UTILS.nowIso(), detalhe = 'Pedido da campainha recebido por evento às ' + AutPred_hora_(pe) + '; resposta "abrir" de ' + AutPred_s_(cmd.SOLICITANTE) + ' às ' + AutPred_hora_(t) + ' confirmada pela fechadura.';
    var upd = { EVENTOS_VALIDADO: 'SIM', EVENTOS_VALIDADO_EM: agora, EVENTOS_VALIDADO_POR: AutPred_s_(cmd.SOLICITANTE), EVENTOS_VALIDADO_DETALHE: detalhe, ATUALIZADO_EM: agora };
    SGO_DATA.update(AUT_ABA_DISPOSITIVOS, disp.ID, upd);
    Object.assign(disp, upd);
    AutPred_auditar_({ evento: 'EVENTOS_VALIDADOS', quem: { userId: AutPred_s_(cmd.SOLICITANTE_ID), nome: AutPred_s_(cmd.SOLICITANTE), perfil: AutPred_s_(cmd.PERFIL) }, disp: disp, operacaoId: cmd.OPERACAO_ID, resultado: 'OK', detalhe: detalhe });
    return true;
  } catch (e) { console.error('Automação predial, validação por eventos: ' + ((e && e.message) || e)); return false; }
}

/** Lê o pedido na nuvem (sombra do dispositivo, com a hora de cada ponto); guarda 2,5 s para todas as telas. Só leitura. */
function AutPred_pedidoFechadura_(c, disp, maxIdadeMs) {
  var lim = maxIdadeMs === undefined ? AUT_PEDIDO_CACHE_MS : maxIdadeMs;
  // 27/10/2026: com eventos da Tuya, o pedido vem do que o servidor recebeu (nenhuma chamada); o comando (0) relê na nuvem
  if (lim !== 0) { var ev = AutPred_eventoDisp_(disp.DEVICE_ID); if (ev) return AutPred_pedidoDoEvento_(ev); }
  var k = AUT_PEDIDO_CACHE + AutPred_s_(disp.DEVICE_ID), cache = null;
  try { cache = CacheService.getScriptCache(); var g0 = JSON.parse(cache.get(k) || 'null'); if (g0 && Date.now() - g0.lidoMs <= lim) return Object.assign(AutPred_pedidoAgora_(g0), { fonte: 'CONSULTA' }); } catch (e) {}
  var props = {}, agora = Date.now();
  var r = Tuya_chamar_(c, 'GET', '/v2.0/cloud/thing/' + encodeURIComponent(AutPred_s_(disp.DEVICE_ID)) + '/shadow/properties', {});
  if (r.j && r.j.success === true && r.j.result) {
    (r.j.result.properties || []).forEach(function (p) { if (p && p.code) props[p.code] = { value: p.value, time: Number(p.time) || 0 }; });
  } else {
    Tuya_estado_(c, disp.DEVICE_ID).forEach(function (x) { props[x.code] = { value: x.value, time: agora }; });
  }
  var u = props.unlock_request || { value: 0, time: 0 }, db = props.doorbell || {}, co = props.closed_opened || {};
  var g = { lidoMs: Date.now(), valor: Number(u.value) || 0, valorEm: Number(u.time) || agora, campainhaEm: Number(db.time) || 0, porta: AutPred_s_(co.value) };
  // 27/10/2026: guardado por até 15 min (a consulta sem eventos usa a mesma leitura por consultaIntervaloS)
  try { if (cache) cache.put(k, JSON.stringify(g), 900); } catch (e2) {}
  return Object.assign(AutPred_pedidoAgora_(g), { fonte: 'CONSULTA' });
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
        // 27/10/2026: "Verificar campainha agora" (pessoa): no máximo 1 leitura por fechadura a cada 10 s (dentro disso, vale a
        // leitura recente, de qualquer pessoa) e 30 por hora; a tela usa a leitura compartilhada de consultaIntervaloS
        if (agora && !AutPred_verificacaoLiberada_(d)) { itens.push({ id: AutPred_s_(d.ID), nome: AutPred_s_(d.NOME || d.NOME_PROVEDOR), ativo: false, fonte: 'limite', autoAbrir: AutPred_autoAbrir_(d),
          aviso: 'Limite de ' + AUT_VERIF_HORA + ' verificações por hora desta fechadura atingido (proteção da cota). Use o aplicativo Smart Life; a consulta automática continua.' }); return; }
        try { p = Tuya_comOrigem_(agora ? 'MANUAL' : 'TELA', function () { return AutPred_pedidoFechadura_(c, d, agora ? AUT_VERIF_INTERVALO_MS : cfg.consultaIntervaloS * 1000); }); }
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
  return { itens: itens, fonte: fonteGeral, proximaS: fonteGeral === 'eventos' ? 3 : 10, infra: AutPred_infraTela_() };
}

var AUT_VERIF_INTERVALO_MS = 10000;   // "Verificar campainha agora": 1 leitura por fechadura a cada 10 s
var AUT_VERIF_HORA = 30;              // e no máximo 30 leituras por hora por fechadura
/** Conta a verificação pedida pela pessoa (só quando vai sair leitura nova); falso quando a hora já tem o teto. */
function AutPred_verificacaoLiberada_(d) {
  try {
    var cache = CacheService.getScriptCache(), g = JSON.parse(cache.get(AUT_PEDIDO_CACHE + AutPred_s_(d.DEVICE_ID)) || 'null');
    if (g && Date.now() - Number(g.lidoMs) <= AUT_VERIF_INTERVALO_MS) return true; // usa a leitura recente, sem chamada
    var k = 'AUT_VERIF_H_' + AutPred_s_(d.DEVICE_ID) + '_' + Math.floor(Date.now() / 3600000), n = Number(cache.get(k) || 0);
    if (n >= AUT_VERIF_HORA) return false;
    cache.put(k, String(n + 1), 3700);
  } catch (e) {}
  return true;
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
  // 03/11/2026: canal padrão dos portões da ponte fixado; refrigerador pela ponte (sem nuvem) ou pela sombra da nuvem
  var refrig = 0;
  try { AutPred_fixarCanaisPadrao_(); } catch (eCanal) { console.error('Automação predial, canal padrão: ' + ((eCanal && eCanal.message) || eCanal)); }
  try { refrig = AutPred_rotinaRefrigeradores_(c); } catch (eRef) { console.error('Automação predial, refrigeradores: ' + ((eRef && eRef.message) || eRef)); }
  if (!c.podeLer || !AutPred_emUso_(c)) return { texto: 'automação desligada ou em implantação: nada lido', refrigeradores: refrig };
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
  return { avisos: avisos, refrigeradores: refrig };
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
  if (!dir.acionar || !AutPred_ehDiretor_(sessao)) AutPred_auditar_({ evento: 'AUTO_ABRIR_NEGADA', quem: sessao, disp: disp, resultado: 'NEGADO', detalhe: 'Tentou ' + (dados.ligado ? 'ligar' : 'desligar') + ' a abertura automática sem poder destravar a porta.' });
  if (!dir.acionar || !AutPred_ehDiretor_(sessao)) throw new Error('Não foi possível gravar: só quem destrava a porta liga ou desliga a abertura automática (' + (dir.motivo || 'diretor com a permissão "Acionar"') + ').');
  var ligar = !!dados.ligado, nome = AutPred_s_(disp.NOME || disp.NOME_PROVEDOR);
  if (ligar === AutPred_autoAbrir_(disp)) return { mensagem: 'A abertura automática já estava ' + (ligar ? 'ligada' : 'desligada') + '.' };
  AutPred_bootstrap_();
  var upd = { AUTO_ABRIR: ligar ? 'SIM' : 'NAO', AUTO_ABRIR_POR: AutPred_nome_(sessao), AUTO_ABRIR_POR_ID: AutPred_s_(sessao.userId), AUTO_ABRIR_EM: SGO_UTILS.nowIso(), ATUALIZADO_EM: SGO_UTILS.nowIso() };
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
  // 27/10/2026 (segurança): só a resposta reply_unlock_request, só com pedido ATIVO lido agora (evento ou consulta da
  // fechadura), dentro da janela do pedido e com a opção ligada; nunca outro comando de destravar
  if (!pedido || !pedido.ativo || !(pedido.restanteS > 0) || !pedido.pedidoId || (pedido.fonte !== 'EVENTO' && pedido.fonte !== 'CONSULTA')) return null;
  if (!AutPred_autoAbrir_(disp) || !AutPred_ehPedido_(disp)) return null;
  var trava = null;
  try { trava = LockService.getScriptLock(); trava.waitLock(10000); } catch (e) { trava = null; }
  var soltar = function () { if (trava) { try { trava.releaseLock(); } catch (e2) {} trava = null; } };
  var cmd, modo, nome = AutPred_s_(disp.NOME || disp.NOME_PROVEDOR), bloqueio = '';
  try {
    AutPred_bootstrap_();
    var comandos = AutPred_comandos_();
    if (AutPred_respostaDoPedido_(comandos, disp.ID, pedido.pedidoId)) return null;
    var prefixo = 'auto-' + pedido.pedidoId + '-' + AutPred_s_(disp.ID) + '-';
    var anteriores = comandos.filter(function (x) { return AutPred_s_(x.OPERACAO_ID).indexOf(prefixo) === 0; });
    var tentativas = anteriores.length;
    // nuvem bloqueada: uma linha NEGADO por pedido (registro e aviso), nenhuma chamada e nenhuma repetição
    if (tentativas >= AUT_AUTO_TENTATIVAS || anteriores.some(function (x) { return AutPred_s_(x.SITUACAO) === 'NEGADO'; })) return null;
    modo = AutPred_modo_(c, disp, 'ABRIR');
    if (modo.modo === 'REAL') { var uB = Tuya_uso_(); if (uB.bloqueio) bloqueio = Tuya_motivoPausa_('EVENTO'); }
    cmd = SGO_DATA.insert(AUT_ABA_COMANDOS, SGO_DATA.normalizarObjetoParaSheet(AUT_ABA_COMANDOS, SGO_DATA.gerarRegistroBase({
      OPERACAO_ID: prefixo + (tentativas + 1), QUANDO: AutPred_agoraTexto_(), QUANDO_EM: SGO_UTILS.nowIso(), SOLICITANTE_ID: '', SOLICITANTE: AUT_AUTOMATICO.nome, PERFIL: AUT_AUTOMATICO.perfil,
      UNIDADE: AutPred_s_(disp.UNIDADE_NOME), DISPOSITIVO_ID: AutPred_s_(disp.ID), DEVICE_ID: AutPred_s_(disp.DEVICE_ID), DISPOSITIVO_NOME: nome, TIPO: AutPred_s_(disp.TIPO),
      COMANDO: 'DESTRAVAR', COMANDO_JSON: AutPred_json_({ code: 'reply_unlock_request', value: true }), MODO: modo.modo, AUTORIZACAO: bloqueio ? 'NEGADO' : 'AUTORIZADO',
      AUTORIZACAO_MOTIVO: bloqueio ? 'nuvem da Tuya bloqueada: ' + bloqueio : 'abertura automática pela campainha (' + (pedido.fonte === 'EVENTO' ? 'evento da Tuya' : 'consulta da fechadura, sem eventos') + '), ligada por ' + (AutPred_s_(disp.AUTO_ABRIR_POR) || 'um diretor') + (disp.AUTO_ABRIR_EM ? ' em ' + AutPred_dataBr_(disp.AUTO_ABRIR_EM) : ''),
      SITUACAO: bloqueio ? 'NEGADO' : 'SOLICITADO', ESTADO_ANTES_JSON: AutPred_s_(disp.ESTADO_JSON), CORRELACAO: pedido.pedidoId, ORIGEM: 'AUTOMATICO', ATUALIZADO_EM: SGO_UTILS.nowIso()
    })));
    if (!bloqueio) SGO_DATA.update(AUT_ABA_DISPOSITIVOS, disp.ID, { ULT_CMD_ID: cmd.ID, ULT_CMD_EM: cmd.QUANDO_EM, ULT_CMD_SITUACAO: 'SOLICITADO', ULT_CMD_COMANDO: AutPred_s_(cmd.COMANDO), ATUALIZADO_EM: SGO_UTILS.nowIso() });
  } finally { soltar(); }
  var quando = pedido.campainhaTexto ? ' às ' + pedido.campainhaTexto : '';
  if (bloqueio) {
    // 27/10/2026: a preferência continua ligada; nada sai para a nuvem bloqueada e quem destrava sabe na hora
    AutPred_auditar_({ evento: 'COMANDO_BLOQUEADO', quem: AUT_AUTOMATICO, disp: disp, operacaoId: cmd.OPERACAO_ID, resultado: 'NEGADO', detalhe: 'Abertura automática não enviada: ' + bloqueio + '.' });
    try {
      if (typeof SGO_notificar_ === 'function') SGO_notificar_({ usuarios: AutPred_quemDestrava_(disp), titulo: 'Campainha da ' + nome + ': não abriu sozinha', canais: ['sgo', 'whatsapp'], origem: 'AUTOMACAO', refId: cmd.ID, evento: 'S68',
        texto: 'A campainha da ' + nome + ' tocou' + quando + ' e a abertura automática não pôde abrir: a nuvem da Tuya está bloqueada (cota ou plano). Abra pelo aplicativo Smart Life. A abertura automática continua ligada e volta sozinha quando a nuvem voltar.',
        textoWhatsapp: 'SGO+: campainha da ' + nome + quando + '. Abertura automática sem nuvem agora: abra pelo aplicativo Smart Life.' });
    } catch (eN) {}
    return cmd;
  }
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
  // 27/10/2026: aceito pela nuvem não é porta aberta; o título só diz "aberta" com a confirmação da fechadura
  avisar(conf.confirmado ? 'Porta aberta automaticamente: ' + nome : 'Abertura automática enviada, sem confirmação: ' + nome,
    'A campainha da ' + nome + ' tocou' + quando + (conf.confirmado ? ' e o SGO+ abriu a porta automaticamente' : ' e o SGO+ enviou a abertura automática') + ' (abertura automática ligada por ' + (AutPred_s_(disp.AUTO_ABRIR_POR) || 'um diretor') + '). ' +
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
  // 03/11/2026: canal Ponte com a ponte fora do ar: recusa já no toque (nada sai; nunca cai sozinho para a nuvem)
  var pfP = AutPred_modo_(c, disp, acaoP).modo === 'REAL' ? AutPred_ponteFora_(disp) : null;
  if (pfP) {
    AutPred_auditar_({ evento: 'COMANDO_PONTE_FORA', quem: sessao, disp: disp, operacaoId: opId, resultado: 'NEGADO', detalhe: 'Nada enviado: ' + pfP.texto + ' (o dispositivo trabalha pela ponte local).', dados: { origem: AutPred_origem_(dados.origem) } });
    var eP = new Error(AutPred_textoPonteFora_(disp, pfP, sessao, verbo));
    eP.autAmigavel = true; eP.ponteFora = true;
    throw eP;
  }
  // 27/10/2026: nuvem bloqueada e sem a vez da sonda: recusa já no toque, com registro (nenhuma janela de confirmação)
  var bloqP = AutPred_modo_(c, disp, acaoP).modo === 'REAL' ? AutPred_bloqueioParaPessoa_(disp) : '';
  if (bloqP) {
    AutPred_auditar_({ evento: 'COMANDO_BLOQUEADO', quem: sessao, disp: disp, operacaoId: opId, resultado: 'NEGADO', detalhe: 'Nada enviado: ' + bloqP + '.', dados: { origem: AutPred_origem_(dados.origem) } });
    var eB = new Error(AutPred_textoForaDoAr_() + ' Nada foi enviado.' + (AutPred_administra_(sessao) ? ' Detalhe para a gestão: ' + Tuya_textoErro_((Tuya_uso_().bloqueio || {}).codigo, '', 0, 'a chamada') + '; ' + bloqP + '.' : ''));
    eB.autAmigavel = true; eB.foraDoAr = true;
    throw eB;
  }
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
  // 27/10/2026: nuvem bloqueada (cota ou plano) e sem a vez da sonda: nada sai; registro NEGADO com o motivo (mais abaixo)
  var bloqueioNuvem = modo.modo === 'REAL' ? AutPred_bloqueioParaPessoa_(disp) : '';
  if (pedidoModo && c.podeLer && !bloqueioNuvem) { try { pedido = AutPred_pedidoFechadura_(c, disp, 0); } catch (eP) { pedido = { ativo: false, erro: Tuya_limpar_(eP && eP.message, c) }; } }
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
  // 03/11/2026: canal Ponte com a ponte fora do ar: NEGADO com o motivo; nada sai (nem pela nuvem)
  var pfE = modo.modo === 'REAL' ? AutPred_ponteFora_(disp) : null;
  if (pfE) negar('o dispositivo trabalha pela ponte local e ' + pfE.texto + '; nada foi enviado (o SGO+ não troca sozinho para a nuvem da Tuya)', 'COMANDO_PONTE_FORA');
  if (bloqueioNuvem) {
    var regB = SGO_DATA.insert(AUT_ABA_COMANDOS, SGO_DATA.normalizarObjetoParaSheet(AUT_ABA_COMANDOS, SGO_DATA.gerarRegistroBase(Object.assign({}, base, { AUTORIZACAO: 'NEGADO', AUTORIZACAO_MOTIVO: 'nuvem da Tuya bloqueada: ' + bloqueioNuvem, SITUACAO: 'NEGADO', ATUALIZADO_EM: SGO_UTILS.nowIso() }))));
    AutPred_auditar_({ evento: 'COMANDO_BLOQUEADO', quem: sessao, disp: disp, operacaoId: opId, resultado: 'NEGADO', detalhe: 'Nada enviado: ' + bloqueioNuvem + '.', dados: { origem: base.ORIGEM } });
    AutPred_registrarFalhaNuvem_({ codigo: (Tuya_uso_().bloqueio || {}).codigo, http: 0, incerto: false, msg: bloqueioNuvem });
    var bq = Tuya_uso_().bloqueio || {};
    return { comando: AutPred_comandoParaTela_(regB), foraDoAr: true, texto: AutPred_textoForaDoAr_() + ' Nada foi enviado.' + (AutPred_administra_(sessao) ? ' Detalhe para a gestão: ' + Tuya_textoErro_(bq.codigo, '', 0, 'a chamada') + '; ' + bloqueioNuvem + '.' : '') };
  }
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

/** Nuvem bloqueada para um pedido de pessoa agora ('' = pode tentar: sem bloqueio, ou é a vez da sonda de pessoa). */
function AutPred_bloqueioParaPessoa_(disp) {
  // 27/10/2026: portão atendido pela ponte local não depende da nuvem (nem da cota)
  // 03/11/2026: pelo canal: Ponte nunca depende da nuvem (a ponte fora do ar tem a própria recusa); Tuya sempre depende
  if (disp && AutPred_canal_(disp) === 'PONTE') return '';
  return Tuya_uso_().bloqueio ? Tuya_motivoPausa_('COMANDO') : '';
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
  var regras = [[/trabalha pela ponte local/i, 'ponte local fora do ar, nada enviado'], [/nuvem da Tuya bloqueada|cota de chamadas da Tuya acabou|plano do projeto na Tuya/i, 'nuvem bloqueada (cota ou plano), nada enviado'], [/intervalo mínimo/i, 'aguarde 10 s entre comandos'], [/no último minuto/i, 'muitos comandos em 1 minuto'], [/sem resultado/i, 'comando anterior ainda sem resultado'],
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
  var modo = AutPred_modo_(cfg, d), canalT = AutPred_canalParaTela_(d), refrig = AutPred_ehRefrig_(d), portao = d.TIPO !== 'FECHADURA' && !refrig;
  var tela = { id: AutPred_s_(d.ID), deviceId: AutPred_s_(d.DEVICE_ID), nome: AutPred_s_(d.NOME || d.NOME_PROVEDOR), nomeProvedor: AutPred_s_(d.NOME_PROVEDOR), categoria: AutPred_s_(d.CATEGORIA), categoriaNome: AutPred_s_(d.CATEGORIA_NOME),
    produto: AutPred_s_(d.PRODUTO_NOME), tipo: AutPred_s_(d.TIPO), tipoNome: AutPred_tipoNome_(d.TIPO), unidadeId: AutPred_s_(d.UNIDADE_ID), unidade: AutPred_s_(d.UNIDADE_NOME) || 'Sem unidade definida', localizacao: AutPred_s_(d.LOCALIZACAO),
    restrito: AutPred_restrito_(d), homologado: AutPred_s_(d.HOMOLOGADO).toUpperCase() === 'SIM', homologadoPor: AutPred_s_(d.HOMOLOGADO_POR), homologadoEm: AutPred_dataBr_(d.HOMOLOGADO_EM), ativo: AutPred_s_(d.ATIVO).toUpperCase() !== 'NAO',
    online: AutPred_s_(d.ONLINE).toUpperCase() === 'SIM', estado: AutPred_estadoTexto_(d), estadoEm: AutPred_dataBr_(d.ESTADO_EM), compatOk: AutPred_s_(d.COMPAT_OK).toUpperCase() === 'SIM', compatMotivo: AutPred_s_(d.COMPAT_MOTIVO),
    comandoAbrir: AutPred_s_(d.COMANDO_ABRIR_JSON), acionamento: AutPred_acionamento_(d), acionamentoSugerido: AutPred_comandosPortao_(d).sugestao,
    podeFechar: d.TIPO !== 'FECHADURA' && !!AutPred_comandoDaAcao_(d, 'FECHAR'), podeParar: d.TIPO !== 'FECHADURA' && !!AutPred_comandoDaAcao_(d, 'PARAR'), temFecharNaNuvem: !!AutPred_comandosPortao_(d).fechar,
    pulsoAlternado: AutPred_pulsoComSensor_(d) && AutPred_acionamento_(d) === 'ABRIR_FECHAR',
    estadoPortao: portao ? AutPred_estadoPortao_(d) : null, temSensor: AutPred_temSensor_(d), liberaEmS: AutPred_liberaEmS_(d), percursoS: portao ? AutPred_percursoS_(d) : 0, percursoGravado: Number(d.PERCURSO_S) > 0,
    autoAbrir: AutPred_autoAbrir_(d), autoAbrirPor: AutPred_s_(d.AUTO_ABRIR_POR), autoAbrirEm: AutPred_dataBr_(d.AUTO_ABRIR_EM), podeAutoAbrir: AutPred_ehPedido_(d) && !!dir.acionar && AutPred_ehDiretor_(sessao),
    remotoFechadura: AutPred_s_(d.REMOTO_FECHADURA), modo: modo.modo, modoMotivo: modo.motivo, sincronizadoEm: AutPred_dataBr_(d.SINCRONIZADO_EM),
    ultComandoRecente: Date.now() - AutPred_ms_(d.ULT_CMD_EM) < AUT_CONFIRMACAO_JANELA_MIN * 60000,
    ultComandoEm: AutPred_dataBr_(d.ULT_CMD_EM), ultComandoSituacao: AutPred_situacaoTexto_(d.ULT_CMD_SITUACAO), ultComandoCodigo: AutPred_s_(d.ULT_CMD_SITUACAO), podeVer: !!dir.ver, podeAcionar: !!dir.acionar, motivoAcionar: dir.motivo || '',
    // 03/11/2026: por onde trabalha (selo no cartão) e, na Ponte fora do ar, desde quando e o que fazer
    canal: canalT.canal, canalNome: canalT.nome, canalPadrao: canalT.padrao, ponteOk: canalT.ponteOk, ponteTexto: canalT.ponteTexto ? AutPred_textoPonteFora_(d, { texto: canalT.ponteTexto }, sessao) : '',
    podeCanal: AutPred_administra_(sessao) && (!AutPred_restrito_(d) || AutPred_ehDiretor_(sessao)),
    canalPor: AutPred_s_(d.CANAL_POR), canalEm: AutPred_dataBr_(d.CANAL_EM), canalMotivo: AutPred_s_(d.CANAL_MOTIVO),
    naPonte: AutPred_ponteExiste_() && Tuya_ponteSituacao_(AutPred_s_(d.DEVICE_ID)).naPonte, ponteExiste: AutPred_ponteExiste_(),
    refrig: refrig ? AutPred_refrigParaTela_(d) : null };
  // Somente os administradores recebem dados de configuração. A operação conserva
  // as capacidades já calculadas pelo servidor, posição, temporização e permissões.
  if (!AutPred_administra_(sessao)) {
    ['deviceId', 'nomeProvedor', 'categoria', 'categoriaNome', 'produto', 'unidadeId',
      'homologadoPor', 'homologadoEm', 'comandoAbrir', 'acionamentoSugerido',
      'temFecharNaNuvem', 'percursoGravado', 'autoAbrirPor', 'autoAbrirEm',
      'sincronizadoEm', 'modoMotivo', 'canalPor', 'canalEm', 'canalMotivo', 'naPonte', 'ponteExiste'].forEach(function (k) { delete tela[k]; });
    if (tela.refrig) { delete tela.refrig.alerta.aMin; delete tela.refrig.alerta.aMax; delete tela.refrig.alerta.bMin; delete tela.refrig.alerta.bMax; }
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
    MODO_ECONOMICO_DESLIGADO: 'Saiu do modo econômico da cota da Tuya', SAUDE_CONFIGURADA: 'Alterou a consulta sem eventos (horário e intervalos)',
    ORCAMENTO_CONFIRMADO: 'Confirmou o orçamento da cota da Tuya', EVENTOS_VALIDADOS: 'Fechadura validada por eventos (informativo)', AUTO_ABRIR_NEGADA: 'Recusado: ligar ou desligar a abertura automática sem poder destravar',
    CANAL_ALTERADO: 'Trocou por onde o dispositivo trabalha (ponte local ou nuvem Tuya)', REFRIG_FORA_DA_FAIXA: 'Refrigerador fora da faixa de temperatura (gestão avisada)', REFRIG_NORMALIZADO: 'Refrigerador de volta à faixa de temperatura' };
  if (/^(COMANDO_BLOQUEADO|COMANDO_NEGADO|COMANDO_NAO_AUTORIZADO|COMANDO_LIMITE|COMANDO_SEM_CONFIRMACAO|COMANDO_POSICAO|PEDIDO_EXPIRADO|PEDIDO_JA_RESPONDIDO|COMANDO_NAO_DISPONIVEL|COMANDO_PONTE_FORA)$/.test(e)) return 'Recusado: ' + AutPred_motivoCurto_(d);
  var frase = mapa[e] || e;
  // concessões, revogações, homologações e troca de canal: o motivo escrito pela pessoa é legível e fica junto
  if (/^PERMISSAO_|HOMOLOGA|^CANAL_|^REFRIG_/.test(e) && d) frase += ': ' + d.slice(0, 160);
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
  // 03/11/2026: refrigerador: faixa de temperatura do alerta (opcional; desligado por padrão)
  if (AutPred_ehRefrig_(disp) && dados.refrig && typeof dados.refrig === 'object') {
    var rf = dados.refrig, cfgA = AutPred_refrigCfg_(disp);
    var numR = function (v, nome) {
      var t = AutPred_s_(v).replace(',', '.');
      if (t === '') return null;
      var n = Number(t);
      if (!isFinite(n) || n < -50 || n > 60) throw new Error('Não foi possível gravar: a temperatura "' + nome + '" precisa ser um número de -50 a 60 °C (use vírgula para decimais, ex.: -18,5).');
      return Math.round(n * 10) / 10;
    };
    var novoR = { alerta: rf.alerta === true, aMin: numR(rf.aMin, 'mínima do compartimento A'), aMax: numR(rf.aMax, 'máxima do compartimento A'), bMin: numR(rf.bMin, 'mínima do compartimento B'), bMax: numR(rf.bMax, 'máxima do compartimento B') };
    if ((novoR.aMin !== null && novoR.aMax !== null && novoR.aMin >= novoR.aMax) || (novoR.bMin !== null && novoR.bMax !== null && novoR.bMin >= novoR.bMax)) throw new Error('Não foi possível gravar: em cada compartimento, a temperatura mínima precisa ser menor que a máxima.');
    if (novoR.alerta && [novoR.aMin, novoR.aMax, novoR.bMin, novoR.bMax].every(function (x) { return x === null; })) throw new Error('Não foi possível ligar o alerta: informe pelo menos uma temperatura mínima ou máxima.');
    if (AutPred_json_(novoR) !== AutPred_json_(cfgA)) {
      upd.REFRIG_CFG_JSON = AutPred_json_(novoR);
      if (!novoR.alerta) upd.REFRIG_ALERTA_JSON = '{}';
      mudancas.push('alerta de temperatura ' + (novoR.alerta ? 'ligado (' + (AutPred_faixaTexto_(novoR) || 'sem faixa') + ')' : 'desligado'));
    }
  }
  if (dados.percursoS !== undefined && disp.TIPO !== 'FECHADURA' && !AutPred_ehRefrig_(disp) && AutPred_s_(dados.percursoS) !== '') {
    var ps = Math.round(Number(dados.percursoS));
    if (!(ps >= 5 && ps <= 180)) throw new Error('Não foi possível gravar: o tempo de percurso precisa ser de 5 a 180 segundos (o tempo que o portão leva para abrir ou fechar por completo).');
    if (ps !== Number(disp.PERCURSO_S || 0)) { upd.PERCURSO_S = ps; mudancas.push('tempo de percurso: ' + ps + ' s'); }
  }
  if (dados.acionamento !== undefined && disp.TIPO !== 'FECHADURA' && !AutPred_ehRefrig_(disp)) {
    var ac = AutPred_s_(dados.acionamento).toUpperCase() === 'ABRIR_FECHAR' ? 'ABRIR_FECHAR' : 'PULSO';
    if (ac === 'ABRIR_FECHAR' && !AutPred_comandosPortao_(disp).fechar) throw new Error('Não foi possível gravar: este dispositivo não informa um comando de fechar pela nuvem (door_control_1 ou control com "close"). Deixe como "Pulso (só abrir)".');
    if (ac !== AutPred_acionamento_(disp)) { upd.ACIONAMENTO = ac; mudancas.push('acionamento: ' + (ac === 'ABRIR_FECHAR' ? 'portão com abrir e fechar' : 'pulso (só abrir; fecha manualmente)')); }
  }
  if (dados.restrito !== undefined) {
    if (!AutPred_ehDiretor_(sessao)) throw new Error('Não foi possível gravar: só um diretor marca ou desmarca "Restrito à Diretoria".');
    var rs = dados.restrito ? 'SIM' : 'NAO';
    if (rs !== (AutPred_restrito_(disp) ? 'SIM' : 'NAO')) { upd.RESTRITO_DIRETORIA = rs; mudancas.push(rs === 'SIM' ? 'passou a restrito à Diretoria' : 'deixou de ser restrito à Diretoria'); }
  }
  if (dados.comandoAbrir !== undefined && disp.TIPO !== 'FECHADURA' && !AutPred_ehRefrig_(disp)) {
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
var AUT_ORIGEM_ACAO = { estado: 'MANUAL', pedidoAgora: 'MANUAL', sincronizar: 'SINCRONIZAR', preparar: 'COMANDO', comando: 'COMANDO', conferir: 'COMANDO', saudeOrcamento: 'TELA', canal: 'TELA', leituras: 'TELA' };

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
    if (acao === 'saudeOrcamento') return AutPred_saudeOrcamento_(sessao, dados);
    if (acao === 'autoAbrir') { var ma = AutPred_definirAutoAbrir_(sessao, dados); var pa = AutPred_painel_(sessao); pa.mensagem = ma.mensagem; return pa; }
    if (acao === 'sincronizar') { AutPred_exigirAdministrador_(sessao); var r = AutPred_sincronizar_(sessao); var p = AutPred_painel_(sessao); p.mensagem = 'Sincronizado com o Smart Life: ' + r.lidos + ' dispositivo(s) lido(s), ' + r.novos + ' novo(s), ' + r.atualizados + ' atualizado(s).' + (r.problemas.length ? ' Problemas: ' + r.problemas.join('; ') : ''); return p; }
    // 03/11/2026: canal de cada dispositivo (Diretoria e Administrador) e histórico do refrigerador
    if (acao === 'canal') { var mc = AutPred_definirCanal_(sessao, dados); var pc = AutPred_painel_(sessao); pc.mensagem = mc.mensagem; return pc; }
    if (acao === 'leituras') return AutPred_leituras_(sessao, dados);
    if (acao === 'estado') {
      var v = AutPred_dispositivoVisivel_(sessao, dados.dispositivoId);
      var c = AutPred_cfg_();
      // canal Ponte com a ponte fora: diz desde quando, sem tentar a nuvem
      var pfEst = AutPred_ponteFora_(v.disp);
      if (pfEst) return { dispositivo: AutPred_dispositivoParaTela_(v.disp, v.direitos, sessao, c), ponteFora: true, mensagem: 'Estado não relido: ' + AutPred_textoPonteFora_(v.disp, pfEst, sessao) + ' Mostrando o último estado guardado.' };
      if (AutPred_ehRefrig_(v.disp)) {
        if (!c.podeLer && AutPred_canal_(v.disp) !== 'PONTE') return { dispositivo: AutPred_dispositivoParaTela_(v.disp, v.direitos, sessao, c), mensagem: 'Leitura não feita: ' + c.faltas.join('; ') + '. Mostrando a última leitura guardada.' };
        var lr = AutPred_refrigLer_(c, v.disp, 'MANUAL', false);
        return { dispositivo: AutPred_dispositivoParaTela_(v.disp, v.direitos, sessao, c), mensagem: 'Leitura agora (' + AUT_CANAIS[AutPred_canal_(v.disp)] + '): ' + lr.leitura.texto + '.' };
      }
      if (!c.podeLer && AutPred_canal_(v.disp) !== 'PONTE') return { dispositivo: AutPred_dispositivoParaTela_(v.disp, v.direitos, sessao, c), mensagem: 'Estado não relido: ' + c.faltas.join('; ') + '. Mostrando o último estado guardado.' };
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
  try { AutPred_fixarCanaisPadrao_(); } catch (eCanal) {}
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
    rapido: AutPred_rapidos_(sessao, c), emUso: AutPred_emUso_(c), infra: AutPred_infraTela_(), canais: AUT_CANAIS,
    // 27/10/2026: a aba "Saúde da infraestrutura" é da Diretoria e do Administrador (o Gestor não administra o módulo)
    podeVerSaude: AutPred_administra_(sessao)
  };
}
