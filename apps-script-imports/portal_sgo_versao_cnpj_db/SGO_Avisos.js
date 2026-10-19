/****************************************************
 * AVISOS DA GESTÃO COM CIÊNCIA — servidor (2026-10-16)
 *
 * Gestor, Admin e Diretoria publicam avisos (título, texto, anexos,
 * público, importância, prazo de ciência opcional). Todo usuário do
 * público vê o aviso numa janela ao entrar e confirma com "Li e estou
 * ciente" (data/hora registradas). Aviso não confirmado volta a aparecer
 * a cada entrada e fica na lista "Avisos" do menu (grupo Principal).
 * Tela em JS_Avisos.html.
 *
 * Ideia do registro de ciência herdada do Conduta (SGO_Conduta_Ciencia.js:
 * primeira/última exibição, quantas vezes viu, quando confirmou), mas com
 * abas próprias — nada é misturado com qual_ciencia:
 *  AVS_AVISOS  — um aviso por linha; DESTINATARIOS_IDS é a lista de
 *                pessoas do público fotografada na publicação (quem leu /
 *                quem não leu é sempre contra essa lista).
 *  AVS_CIENCIA — uma linha por (aviso, pessoa): exibições e CIENTE_EM.
 *  AVS_ANEXOS  — anexos gravados no Drive, pasta "SGO+ Avisos",
 *                compartilhamento restrito. O navegador nunca recebe o
 *                endereço do Drive: o arquivo vem por Avisos_apiAnexo,
 *                que confere sessão e público.
 *
 * Público: usuários ATIVOS, sem o perfil Cliente (aviso interno), todos ou
 * por perfil ou pessoas escolhidas. CAD_USUARIOS não tem setor hoje.
 * Ao publicar e ao reenviar: e-mail (aviso completo) e WhatsApp (resumo +
 * endereço) por SGO_notificar_ (SGO_Notificar.js), depois de soltar a trava.
 *
 * Datas gravadas como texto no horário de Brasília "aaaa-mm-ddThh:mm:ss".
 ****************************************************/

var AVS_FUSO = 'America/Sao_Paulo';
var AVS_PASTA_NOME = 'SGO+ Avisos';
var AVS_IMPORTANCIAS = ['Normal', 'Importante'];
var AVS_MAX_ANEXOS = 6;
var AVS_MAX_BYTES_ARQUIVO = 10 * 1024 * 1024;
var AVS_MAX_BYTES_TOTAL = 20 * 1024 * 1024;
var AVS_EXTENSOES = {
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp',
  pdf: 'application/pdf', txt: 'text/plain', csv: 'text/csv',
  doc: 'application/msword', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt: 'application/vnd.ms-powerpoint', pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  odt: 'application/vnd.oasis.opendocument.text', ods: 'application/vnd.oasis.opendocument.spreadsheet'
};

var AVS_COLUNAS = [
  'ID', 'TITULO', 'TEXTO', 'IMPORTANCIA', 'PUBLICO_TIPO', 'PUBLICO_PERFIS', 'PUBLICO_IDS', 'DESTINATARIOS_IDS',
  'PRAZO_CIENCIA', 'SITUACAO', 'PUBLICADO_POR_ID', 'PUBLICADO_POR_NOME', 'PUBLICADO_EM',
  'ARQUIVADO_EM', 'ARQUIVADO_POR_NOME', 'QTD_REENVIOS', 'ULTIMO_REENVIO_EM', 'QTD_ANEXOS', 'CRIADO_EM'
];
var AVS_COLUNAS_CIENCIA = ['ID', 'AVISO_ID', 'USUARIO_ID', 'USUARIO_NOME', 'PRIMEIRA_EXIBICAO_EM', 'ULTIMA_EXIBICAO_EM', 'QTD_EXIBICOES', 'CIENTE_EM', 'CRIADO_EM'];
var AVS_COLUNAS_ANEXOS = ['ID', 'AVISO_ID', 'NOME', 'TIPO', 'TAMANHO', 'EH_IMAGEM', 'ARQUIVO_ID', 'ORDEM', 'CRIADO_EM'];

// ------------------------------------------------------------
// INFRA
// ------------------------------------------------------------
function Avisos_abas_() {
  return {
    AVISOS: SGO_CFG.SHEETS.AVS_AVISOS || 'AVS_AVISOS',
    CIENCIA: SGO_CFG.SHEETS.AVS_CIENCIA || 'AVS_CIENCIA',
    ANEXOS: SGO_CFG.SHEETS.AVS_ANEXOS || 'AVS_ANEXOS'
  };
}

function Avisos_garantirAbas_() {
  var cache = CacheService.getScriptCache();
  if (cache.get('AVS_ABAS_OK_V1')) return;
  var abas = Avisos_abas_();
  CertCal_garantirTabela_(abas.AVISOS, AVS_COLUNAS);
  CertCal_garantirTabela_(abas.CIENCIA, AVS_COLUNAS_CIENCIA);
  CertCal_garantirTabela_(abas.ANEXOS, AVS_COLUNAS_ANEXOS);
  AVS_COLUNAS.forEach(function (c) { CertCal_garantirColuna_(abas.AVISOS, c); });
  AVS_COLUNAS_CIENCIA.forEach(function (c) { CertCal_garantirColuna_(abas.CIENCIA, c); });
  AVS_COLUNAS_ANEXOS.forEach(function (c) { CertCal_garantirColuna_(abas.ANEXOS, c); });
  ['PRAZO_CIENCIA', 'PUBLICADO_EM', 'ARQUIVADO_EM', 'ULTIMO_REENVIO_EM'].forEach(function (c) { CertCal_forcarColunaTexto_(abas.AVISOS, c); });
  ['PRIMEIRA_EXIBICAO_EM', 'ULTIMA_EXIBICAO_EM', 'CIENTE_EM'].forEach(function (c) { CertCal_forcarColunaTexto_(abas.CIENCIA, c); });
  cache.put('AVS_ABAS_OK_V1', '1', 21600);
}

function Avisos_sessao_(sessionId) {
  var s = exigirSessao(sessionId);
  var perfil = SGO_UTILS.safeUpper(s.perfil);
  if (perfil === 'CLIENTE') {
    throw new Error('Não foi possível abrir os avisos: eles são internos da equipe e o perfil Cliente não os recebe. Se você é da equipe, peça ao administrador um usuário de colaborador.');
  }
  Avisos_garantirAbas_();
  return {
    id: SGO_UTILS.safe(s.userId), usuario: SGO_UTILS.safe(s.usuario),
    nome: SGO_UTILS.safe(s.nome) || SGO_UTILS.safe(s.usuario), perfil: perfil,
    // Publicar comunicados: gestão e, desde 19/10/2026, o perfil RH (comunicados de RH; ver SGO_Auth.js).
    gestor: isAdminPerfilAuth_(perfil) || (typeof SGO_ehPerfilRH_ === 'function' && SGO_ehPerfilRH_(perfil))
  };
}

function Avisos_exigirGestor_(eu, acao) {
  if (!eu.gestor) throw new Error('Não foi possível ' + acao + ': esta ação é só para os perfis Gestor, Admin, Diretoria e RH. Se precisar publicar um aviso, peça a um gestor ou ao RH.');
}

function Avisos_agora_() {
  return Utilities.formatDate(new Date(), AVS_FUSO, "yyyy-MM-dd'T'HH:mm:ss");
}

/** Texto de data vindo da planilha (pode ter virado Date) -> "aaaa-mm-ddThh:mm:ss" ou "aaaa-mm-dd". */
function Avisos_txtData_(v, soDia) {
  if (v === null || v === undefined || v === '') return '';
  if (Object.prototype.toString.call(v) === '[object Date]') {
    if (isNaN(v.getTime())) return '';
    return Utilities.formatDate(v, AVS_FUSO, soDia ? 'yyyy-MM-dd' : "yyyy-MM-dd'T'HH:mm:ss");
  }
  var s = String(v).trim();
  var m = s.match(/^(\d{4}-\d{2}-\d{2})(?:[T ](\d{2}:\d{2})(?::(\d{2}))?)?/);
  if (!m) return '';
  if (soDia) return m[1];
  return m[1] + (m[2] ? 'T' + m[2] + ':' + (m[3] || '00') : '');
}

function Avisos_dataBr_(s) {
  var m = String(s || '').match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/);
  if (!m) return '';
  return m[3] + '/' + m[2] + '/' + m[1] + (m[4] ? ' ' + m[4] + ':' + m[5] : '');
}

function Avisos_lista_(v) {
  return String(v || '').split(',').map(function (x) { return x.trim(); }).filter(Boolean);
}

function Avisos_comTrava_(fn) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try { return fn(); } finally {
    try { SpreadsheetApp.flush(); } catch (e) {}
    lock.releaseLock();
    // toda gravação dos avisos passa por aqui: o Início e a janela ao entrar recalculam as pendências
    if (typeof SGO_Pendencias_invalidar_ === 'function') SGO_Pendencias_invalidar_();
  }
}

// Mesmo aviso publicado de novo em seguida (duplo clique) e reenvio em seguida não repetem e-mail/WhatsApp.
var AVS_JANELA_REPETICAO_MIN = 10;

/** "aaaa-mm-ddThh:mm:ss" de N minutos atrás (horário de Brasília). */
function Avisos_haMinutos_(min) {
  return Utilities.formatDate(new Date(Date.now() - min * 60000), AVS_FUSO, "yyyy-MM-dd'T'HH:mm:ss");
}

/** Resposta padrão; as notificações (e-mail/WhatsApp) saem depois de gravar e de soltar a trava. */
function Avisos_resposta_(fn) {
  var pendentes = [];
  try {
    var r = fn(function (n) { pendentes.push(n); });
    var saida = JSON.parse(JSON.stringify(Object.assign({ ok: true }, r || {})));
    pendentes.forEach(function (n) {
      var res = SGO_notificar_(n);
      saida.notificacoes = saida.notificacoes || { ok: 0, erro: 0, pulado: 0 };
      saida.notificacoes.ok += res.ok; saida.notificacoes.erro += res.erro; saida.notificacoes.pulado += res.pulado;
    });
    return saida;
  } catch (e) {
    return { ok: false, message: String((e && e.message) || e) };
  }
}

// ------------------------------------------------------------
// LEITURA
// ------------------------------------------------------------
function Avisos_usuariosAtivos_() {
  return SGO_DATA.getAll(SGO_CFG.SHEETS.CAD_USUARIOS)
    .filter(function (u) { return SGO_UTILS.safeUpper(u.STATUS || 'ATIVO') === 'ATIVO' && SGO_UTILS.safeUpper(u.PERFIL) !== 'CLIENTE' && String(u.ID || ''); })
    .map(function (u) { return { id: String(u.ID), nome: SGO_UTILS.safe(u.NOME) || SGO_UTILS.safe(u.USUARIO), perfil: SGO_UTILS.safeUpper(u.PERFIL) }; })
    .sort(function (a, b) { return a.nome.localeCompare(b.nome); });
}

function Avisos_limpar_(r) {
  var o = {};
  AVS_COLUNAS.forEach(function (c) { o[c] = r[c] === undefined || r[c] === null ? '' : r[c]; });
  o.ID = String(o.ID);
  o.TITULO = String(o.TITULO); o.TEXTO = String(o.TEXTO);
  o.IMPORTANCIA = AVS_IMPORTANCIAS.indexOf(String(o.IMPORTANCIA)) >= 0 ? String(o.IMPORTANCIA) : 'Normal';
  o.PRAZO_CIENCIA = Avisos_txtData_(o.PRAZO_CIENCIA, true);
  o.PUBLICADO_EM = Avisos_txtData_(o.PUBLICADO_EM);
  o.ARQUIVADO_EM = Avisos_txtData_(o.ARQUIVADO_EM);
  o.ULTIMO_REENVIO_EM = Avisos_txtData_(o.ULTIMO_REENVIO_EM);
  o.SITUACAO = String(o.SITUACAO) === 'ARQUIVADO' ? 'ARQUIVADO' : 'PUBLICADO';
  o.QTD_REENVIOS = Number(o.QTD_REENVIOS) || 0;
  o.QTD_ANEXOS = Number(o.QTD_ANEXOS) || 0;
  o.CRIADO_EM = String(o.CRIADO_EM || '');
  o.destinatarios = Avisos_lista_(o.DESTINATARIOS_IDS);
  return o;
}

function Avisos_todos_() {
  return SGO_DATA.getAll(Avisos_abas_().AVISOS).map(Avisos_limpar_)
    .sort(function (a, b) { return a.PUBLICADO_EM < b.PUBLICADO_EM ? 1 : a.PUBLICADO_EM > b.PUBLICADO_EM ? -1 : 0; });
}

function Avisos_obter_(id) {
  var alvo = SGO_UTILS.safe(id);
  if (!alvo) throw new Error('Não foi possível localizar o aviso: identificação não informada. Feche a janela e abra o aviso de novo pela lista.');
  var r = SGO_DATA.getById(Avisos_abas_().AVISOS, alvo);
  if (!r) throw new Error('Não foi possível localizar o aviso: ele não existe mais no banco. Atualize a lista de avisos.');
  return Avisos_limpar_(r);
}

/** Mapa "avisoId|usuarioId" -> linha de ciência. */
function Avisos_ciencias_(filtroUsuario, filtroAviso) {
  var mapa = {};
  SGO_DATA.getAll(Avisos_abas_().CIENCIA).forEach(function (c) {
    var u = String(c.USUARIO_ID), a = String(c.AVISO_ID);
    if (filtroUsuario && u !== filtroUsuario) return;
    if (filtroAviso && a !== filtroAviso) return;
    mapa[a + '|' + u] = {
      ID: String(c.ID), PRIMEIRA: Avisos_txtData_(c.PRIMEIRA_EXIBICAO_EM), ULTIMA: Avisos_txtData_(c.ULTIMA_EXIBICAO_EM),
      QTD: Number(c.QTD_EXIBICOES) || 0, CIENTE_EM: Avisos_txtData_(c.CIENTE_EM)
    };
  });
  return mapa;
}

/** Anexos por aviso (só metadados; o Drive não vai para o navegador). */
function Avisos_anexosPorAviso_() {
  var por = {};
  SGO_DATA.getAll(Avisos_abas_().ANEXOS).forEach(function (x) {
    var a = String(x.AVISO_ID);
    (por[a] = por[a] || []).push({
      ID: String(x.ID), NOME: String(x.NOME || 'anexo'), TIPO: String(x.TIPO || ''), TAMANHO: Number(x.TAMANHO) || 0,
      EH_IMAGEM: x.EH_IMAGEM === true || SGO_UTILS.safeUpper(x.EH_IMAGEM) === 'TRUE' || /^image\//.test(String(x.TIPO || '')),
      ORDEM: Number(x.ORDEM) || 0
    });
  });
  Object.keys(por).forEach(function (k) { por[k].sort(function (a, b) { return a.ORDEM - b.ORDEM; }); });
  return por;
}

function Avisos_paraTela_(a, anexos, ciencia, hojeDia) {
  return {
    ID: a.ID, TITULO: a.TITULO, TEXTO: a.TEXTO, IMPORTANCIA: a.IMPORTANCIA, PRAZO_CIENCIA: a.PRAZO_CIENCIA,
    PRAZO_VENCIDO: !!(a.PRAZO_CIENCIA && a.PRAZO_CIENCIA < hojeDia),
    PUBLICADO_POR_NOME: String(a.PUBLICADO_POR_NOME || ''), PUBLICADO_EM: a.PUBLICADO_EM, SITUACAO: a.SITUACAO,
    ANEXOS: anexos || [], CIENTE_EM: ciencia ? ciencia.CIENTE_EM : ''
  };
}

// ------------------------------------------------------------
// DRIVE
// ------------------------------------------------------------
function Avisos_pasta_() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty('AVS_PASTA_ID');
  if (id) {
    try { var p = DriveApp.getFolderById(id); if (!p.isTrashed()) return p; } catch (e) { /* recria abaixo */ }
  }
  var it = DriveApp.getFoldersByName(AVS_PASTA_NOME), pasta = null;
  while (it.hasNext()) { var f = it.next(); if (!f.isTrashed()) { pasta = f; break; } }
  if (!pasta) pasta = DriveApp.createFolder(AVS_PASTA_NOME);
  try { pasta.setSharing(DriveApp.Access.PRIVATE, DriveApp.Permission.NONE); } catch (e) { /* conta sem permissão de mudar: fica o padrão (restrito) */ }
  props.setProperty('AVS_PASTA_ID', pasta.getId());
  return pasta;
}

/** Confere nome, tipo e tamanho de cada anexo antes de gravar qualquer coisa. */
function Avisos_validarAnexos_(lista) {
  if (!Array.isArray(lista) || !lista.length) return [];
  if (lista.length > AVS_MAX_ANEXOS) throw new Error('Não foi possível publicar: são ' + lista.length + ' anexos e o limite é ' + AVS_MAX_ANEXOS + '. Tire alguns arquivos (ou junte-os num PDF) e publique de novo.');
  var total = 0;
  return lista.map(function (x, i) {
    var nome = String(x && x.nome || '').replace(/[\\\/:*?"<>|\r\n]+/g, '_').trim().slice(0, 150);
    if (!nome) throw new Error('Não foi possível publicar: o anexo ' + (i + 1) + ' veio sem nome. Escolha o arquivo de novo.');
    var ext = (nome.match(/\.([a-z0-9]{2,5})$/i) || [])[1];
    ext = ext ? ext.toLowerCase() : '';
    var tipo = AVS_EXTENSOES[ext];
    if (!tipo) throw new Error('Não foi possível publicar: o arquivo "' + nome + '" não é de um tipo aceito. Use imagem (PNG, JPG, GIF, WEBP) ou documento (PDF, Word, Excel, PowerPoint, TXT, CSV, ODT/ODS).');
    var b64 = String(x.base64 || '').replace(/^data:[^,]*,/, '').replace(/\s+/g, '');
    if (!b64) throw new Error('Não foi possível publicar: o arquivo "' + nome + '" chegou vazio. Escolha o arquivo de novo e publique.');
    var bytes = Utilities.base64Decode(b64);
    if (!bytes.length) throw new Error('Não foi possível publicar: o arquivo "' + nome + '" está vazio.');
    if (bytes.length > AVS_MAX_BYTES_ARQUIVO) throw new Error('Não foi possível publicar: o arquivo "' + nome + '" tem ' + Math.round(bytes.length / 104857.6) / 10 + ' MB e o limite é 10 MB por arquivo. Reduza o arquivo (ou divida em partes) e publique de novo.');
    total += bytes.length;
    if (total > AVS_MAX_BYTES_TOTAL) throw new Error('Não foi possível publicar: os anexos somam mais de 20 MB. Tire algum arquivo ou reduza o tamanho e publique de novo.');
    return { nome: nome, tipo: tipo, bytes: bytes, imagem: /^image\//.test(tipo) };
  });
}

// ------------------------------------------------------------
// API — todas validam sessão e perfil em toda chamada
// ------------------------------------------------------------

/** Avisos que eu ainda não confirmei. exibir=true registra que a janela apareceu (quando e quantas vezes). */
function Avisos_apiPendentes(sessionId, payload) {
  return Avisos_resposta_(function () {
    var eu = Avisos_sessao_(sessionId);
    var p = payload || {};
    var hoje = Avisos_agora_().slice(0, 10);
    var ciencias = Avisos_ciencias_(eu.id, null);
    var meus = Avisos_todos_().filter(function (a) {
      if (a.SITUACAO !== 'PUBLICADO' || a.destinatarios.indexOf(eu.id) < 0) return false;
      var c = ciencias[a.ID + '|' + eu.id];
      return !(c && c.CIENTE_EM);
    });
    var anexos = meus.length ? Avisos_anexosPorAviso_() : {};
    // Importantes primeiro, depois os mais antigos (ordem de leitura).
    meus.sort(function (a, b) {
      if (a.IMPORTANCIA !== b.IMPORTANCIA) return a.IMPORTANCIA === 'Importante' ? -1 : 1;
      return a.PUBLICADO_EM < b.PUBLICADO_EM ? -1 : a.PUBLICADO_EM > b.PUBLICADO_EM ? 1 : 0;
    });
    if (p.exibir && meus.length) {
      Avisos_comTrava_(function () {
        var aba = Avisos_abas_().CIENCIA, agora = Avisos_agora_();
        var atuais = Avisos_ciencias_(eu.id, null);
        meus.forEach(function (a) {
          var c = atuais[a.ID + '|' + eu.id];
          if (c) SGO_DATA.update(aba, c.ID, { ULTIMA_EXIBICAO_EM: agora, QTD_EXIBICOES: c.QTD + 1 });
          else SGO_DATA.insert(aba, { AVISO_ID: a.ID, USUARIO_ID: eu.id, USUARIO_NOME: eu.nome, PRIMEIRA_EXIBICAO_EM: agora, ULTIMA_EXIBICAO_EM: agora, QTD_EXIBICOES: 1, CIENTE_EM: '' });
        });
      });
    }
    return { avisos: meus.map(function (a) { return Avisos_paraTela_(a, anexos[a.ID], null, hoje); }), total: meus.length, gestor: eu.gestor };
  });
}

/** Lista "Avisos" do menu: tudo o que foi publicado para mim (lidos e não lidos). */
function Avisos_apiMeus(sessionId, payload) {
  return Avisos_resposta_(function () {
    var eu = Avisos_sessao_(sessionId);
    var hoje = Avisos_agora_().slice(0, 10);
    var ciencias = Avisos_ciencias_(eu.id, null);
    var anexos = Avisos_anexosPorAviso_();
    var itens = Avisos_todos_()
      .filter(function (a) { return a.destinatarios.indexOf(eu.id) >= 0 && (a.SITUACAO === 'PUBLICADO' || (ciencias[a.ID + '|' + eu.id] || {}).CIENTE_EM); })
      .map(function (a) { return Avisos_paraTela_(a, anexos[a.ID], ciencias[a.ID + '|' + eu.id], hoje); });
    return { itens: itens, naoLidos: itens.filter(function (x) { return !x.CIENTE_EM && x.SITUACAO === 'PUBLICADO'; }).length, gestor: eu.gestor, eu: { id: eu.id, nome: eu.nome } };
  });
}

/** "Li e estou ciente". */
function Avisos_apiCiente(sessionId, payload) {
  return Avisos_resposta_(function () {
    var eu = Avisos_sessao_(sessionId);
    var id = SGO_UTILS.safe(payload && payload.id);
    return Avisos_comTrava_(function () {
      var a = Avisos_obter_(id);
      if (a.destinatarios.indexOf(eu.id) < 0) throw new Error('Não foi possível registrar a ciência: este aviso não foi enviado para você. Atualize a lista de avisos.');
      var aba = Avisos_abas_().CIENCIA, agora = Avisos_agora_();
      var c = Avisos_ciencias_(eu.id, a.ID)[a.ID + '|' + eu.id];
      if (c && c.CIENTE_EM) return { cienteEm: c.CIENTE_EM, message: 'A ciência já estava registrada em ' + Avisos_dataBr_(c.CIENTE_EM) + '.' };
      if (c) SGO_DATA.update(aba, c.ID, { CIENTE_EM: agora, ULTIMA_EXIBICAO_EM: agora });
      else SGO_DATA.insert(aba, { AVISO_ID: a.ID, USUARIO_ID: eu.id, USUARIO_NOME: eu.nome, PRIMEIRA_EXIBICAO_EM: agora, ULTIMA_EXIBICAO_EM: agora, QTD_EXIBICOES: 1, CIENTE_EM: agora });
      try { SGO_DATA.log('AVISO_CIENCIA', eu.usuario, 'Ciência do aviso ' + a.ID, 'AVISOS'); } catch (e) {}
      return { cienteEm: agora, message: 'Ciência registrada em ' + Avisos_dataBr_(agora) + '.' };
    });
  });
}

/** Conteúdo de um anexo (base64), só para quem recebeu o aviso ou para a gestão. */
function Avisos_apiAnexo(sessionId, payload) {
  return Avisos_resposta_(function () {
    var eu = Avisos_sessao_(sessionId);
    var id = SGO_UTILS.safe(payload && payload.id);
    var x = id ? SGO_DATA.getById(Avisos_abas_().ANEXOS, id) : null;
    if (!x) throw new Error('Não foi possível abrir o anexo: ele não existe mais. Atualize a lista de avisos.');
    var a = Avisos_obter_(x.AVISO_ID);
    if (!eu.gestor && a.destinatarios.indexOf(eu.id) < 0) throw new Error('Não foi possível abrir o anexo: o aviso não foi enviado para você.');
    var arq;
    try { arq = DriveApp.getFileById(String(x.ARQUIVO_ID)); }
    catch (e) { throw new Error('Não foi possível abrir o anexo: o arquivo não foi encontrado na pasta "' + AVS_PASTA_NOME + '". Avise a gestão para publicar o aviso de novo com o anexo.'); }
    var blob = arq.getBlob();
    return { nome: String(x.NOME || arq.getName()), tipo: String(x.TIPO || blob.getContentType() || 'application/octet-stream'), base64: Utilities.base64Encode(blob.getBytes()) };
  });
}

/** Opções do formulário de publicação. */
function Avisos_apiOpcoes(sessionId, payload) {
  return Avisos_resposta_(function () {
    var eu = Avisos_sessao_(sessionId);
    Avisos_exigirGestor_(eu, 'abrir a publicação de avisos');
    var pessoas = Avisos_usuariosAtivos_();
    // Para a confirmação do "Publicar": quantas pessoas recebem por e-mail e por WhatsApp.
    try {
      var contatos = Notificar_contatos_(pessoas.map(function (u) { return u.id; }));
      pessoas.forEach(function (u) { var c = contatos[u.id] || {}; u.temEmail = !!c.email; u.temWhatsapp = !!c.telefone; });
    } catch (e) { /* sem contatos: a confirmação diz só o total */ }
    var perfis = [];
    (SGO_CFG.PROFILES || []).concat(pessoas.map(function (u) { return u.perfil; })).forEach(function (pf) {
      pf = SGO_UTILS.safeUpper(pf);
      if (pf && pf !== 'CLIENTE' && perfis.indexOf(pf) < 0) perfis.push(pf);
    });
    var qtd = {};
    pessoas.forEach(function (u) { qtd[u.perfil] = (qtd[u.perfil] || 0) + 1; });
    return {
      pessoas: pessoas, perfis: perfis.map(function (pf) { return { perfil: pf, qtd: qtd[pf] || 0 }; }),
      importancias: AVS_IMPORTANCIAS, limites: { anexos: AVS_MAX_ANEXOS, mbArquivo: 10, mbTotal: 20 }, hoje: Avisos_agora_().slice(0, 10)
    };
  });
}

function Avisos_apiPublicar(sessionId, payload) {
  return Avisos_resposta_(function (notificar) {
    var eu = Avisos_sessao_(sessionId);
    Avisos_exigirGestor_(eu, 'publicar o aviso');
    var p = payload || {};
    var titulo = SGO_UTILS.safe(p.titulo).replace(/\s+/g, ' ').trim().slice(0, 160);
    if (titulo.length < 3) throw new Error('Não foi possível publicar: o título está vazio ou curto demais. Escreva no campo Título o assunto do aviso (mínimo 3 letras) e clique em Publicar de novo.');
    var texto = String(p.texto === null || p.texto === undefined ? '' : p.texto).replace(/\r\n?/g, '\n').trim().slice(0, 20000);
    if (texto.length < 5) throw new Error('Não foi possível publicar: o texto do aviso está vazio. Escreva a mensagem no campo Texto e clique em Publicar de novo.');
    var importancia = AVS_IMPORTANCIAS.indexOf(p.importancia) >= 0 ? p.importancia : 'Normal';
    var prazo = '';
    if (p.prazo) {
      prazo = Avisos_txtData_(p.prazo, true);
      if (!prazo) throw new Error('Não foi possível publicar: o prazo de ciência é inválido. Corrija a data ou deixe o campo vazio.');
      if (prazo < Avisos_agora_().slice(0, 10)) throw new Error('Não foi possível publicar: o prazo de ciência (' + Avisos_dataBr_(prazo) + ') já passou. Escolha hoje ou uma data futura, ou deixe o campo vazio.');
    }

    var pessoas = Avisos_usuariosAtivos_();
    var tipoPublico = String(p.publicoTipo || 'TODOS').toUpperCase();
    var perfis = [], escolhidos = [], destino;
    if (tipoPublico === 'PERFIS') {
      perfis = (p.perfis || []).map(function (x) { return SGO_UTILS.safeUpper(x); }).filter(Boolean);
      if (!perfis.length) throw new Error('Não foi possível publicar: escolha pelo menos um perfil em Público, ou marque "Todos os usuários".');
      destino = pessoas.filter(function (u) { return perfis.indexOf(u.perfil) >= 0; });
    } else if (tipoPublico === 'PESSOAS') {
      escolhidos = (p.pessoas || []).map(function (x) { return String(x); });
      destino = pessoas.filter(function (u) { return escolhidos.indexOf(u.id) >= 0; });
      if (!destino.length) throw new Error('Não foi possível publicar: nenhuma pessoa foi escolhida em Público (ou as escolhidas não estão mais ativas). Marque as pessoas ou escolha "Todos os usuários".');
    } else {
      tipoPublico = 'TODOS';
      destino = pessoas;
    }
    if (!destino.length) throw new Error('Não foi possível publicar: não há nenhum usuário ativo no público escolhido. Escolha outro perfil ou "Todos os usuários".');
    var ids = destino.map(function (u) { return u.id; });

    var anexos = Avisos_validarAnexos_(p.anexos);

    var res = Avisos_comTrava_(function () {
      var agora = Avisos_agora_();
      // 17/10/2026: o mesmo aviso (mesma pessoa, título e texto) publicado há poucos minutos não é publicado de novo
      var limiteRepeticao = Avisos_haMinutos_(AVS_JANELA_REPETICAO_MIN);
      var repetido = Avisos_todos_().filter(function (a) {
        return String(a.PUBLICADO_POR_ID) === eu.id && a.TITULO === titulo && a.TEXTO === texto && a.PUBLICADO_EM >= limiteRepeticao;
      })[0];
      if (repetido) return { id: repetido.ID, repetido: true };
      var reg = SGO_DATA.insert(Avisos_abas_().AVISOS, {
        TITULO: titulo, TEXTO: texto, IMPORTANCIA: importancia, PUBLICO_TIPO: tipoPublico,
        PUBLICO_PERFIS: perfis.join(','), PUBLICO_IDS: escolhidos.join(','), DESTINATARIOS_IDS: ids.join(','),
        PRAZO_CIENCIA: prazo, SITUACAO: 'PUBLICADO', PUBLICADO_POR_ID: eu.id, PUBLICADO_POR_NOME: eu.nome, PUBLICADO_EM: agora,
        ARQUIVADO_EM: '', ARQUIVADO_POR_NOME: '', QTD_REENVIOS: 0, ULTIMO_REENVIO_EM: '', QTD_ANEXOS: anexos.length
      });
      if (anexos.length) {
        var pasta = Avisos_pasta_();
        anexos.forEach(function (x, i) {
          var arq = pasta.createFile(Utilities.newBlob(x.bytes, x.tipo, x.nome));
          try { arq.setSharing(DriveApp.Access.PRIVATE, DriveApp.Permission.NONE); } catch (e) { /* padrão já é restrito */ }
          try { arq.setDescription('Anexo do aviso "' + titulo + '" (SGO+ Avisos, ' + reg.ID + ')'); } catch (e) {}
          SGO_DATA.insert(Avisos_abas_().ANEXOS, { AVISO_ID: reg.ID, NOME: x.nome, TIPO: x.tipo, TAMANHO: x.bytes.length, EH_IMAGEM: x.imagem, ARQUIVO_ID: arq.getId(), ORDEM: i + 1 });
        });
      }
      try { SGO_DATA.log('AVISO_PUBLICADO', eu.usuario, titulo + ' (' + ids.length + ' pessoa(s))', 'AVISOS'); } catch (e) {}
      return { id: reg.ID };
    });

    if (res.repetido) {
      return { id: res.id, destinatarios: ids.length, repetido: true, message: 'Este aviso já tinha sido publicado por você há menos de ' + AVS_JANELA_REPETICAO_MIN + ' minutos; não foi publicado nem enviado de novo. Ele está no painel de Avisos.' };
    }
    notificar(Avisos_mensagem_({ ID: res.id, TITULO: titulo, TEXTO: texto, IMPORTANCIA: importancia, PRAZO_CIENCIA: prazo, PUBLICADO_POR_NOME: eu.nome, QTD_ANEXOS: anexos.length }, ids, false));
    return { id: res.id, destinatarios: ids.length, message: 'Aviso publicado para ' + ids.length + ' pessoa(s). Elas verão a janela ao entrar no SGO+ e receberão por e-mail e WhatsApp.' };
  });
}

/** Texto do e-mail (aviso completo) e do WhatsApp (resumo + endereço). */
function Avisos_mensagem_(a, ids, reenvio) {
  var importante = a.IMPORTANCIA === 'Importante';
  var titulo = (reenvio ? 'Lembrete de aviso' : (importante ? 'Aviso importante' : 'Novo aviso')) + ': ' + a.TITULO;
  var prazoTxt = a.PRAZO_CIENCIA ? 'Prazo para confirmar a leitura: ' + Avisos_dataBr_(a.PRAZO_CIENCIA) + '.' : '';
  var anexosTxt = a.QTD_ANEXOS ? 'Este aviso tem ' + a.QTD_ANEXOS + ' anexo(s); veja no SGO+.' : '';
  var texto = (reenvio ? 'Você ainda não confirmou a leitura deste aviso.\n\n' : '') +
    a.TEXTO + '\n\n' +
    'Publicado por ' + (a.PUBLICADO_POR_NOME || 'gestão') + '.' + (prazoTxt ? '\n' + prazoTxt : '') + (anexosTxt ? '\n' + anexosTxt : '') +
    '\n\nPara registrar a ciência, entre no SGO+ e clique em "Li e estou ciente" na janela do aviso (ou em Principal > Avisos).';
  var resumo = a.TEXTO.replace(/\s+/g, ' ');
  if (resumo.length > 300) resumo = resumo.slice(0, 297) + '...';
  var whats = 'SGO+ Metrolabs - ' + titulo + '\n\n' + resumo + (prazoTxt ? '\n\n' + prazoTxt : '') + (anexosTxt ? '\n' + anexosTxt : '') +
    '\n\nLeia o aviso completo e confirme a leitura no SGO+.';
  // WhatsApp oficial (Meta): modelo sgo_aviso_geral — {{2}} até 600 caracteres, sem quebra de linha.
  var resumoMeta = a.TEXTO.replace(/\s+/g, ' ').trim();
  var extrasMeta = ((prazoTxt ? ' ' + prazoTxt : '') + (anexosTxt ? ' ' + anexosTxt : '') + ' Confirme a leitura no SGO+.');
  if (resumoMeta.length + extrasMeta.length > 600) resumoMeta = resumoMeta.slice(0, Math.max(0, 597 - extrasMeta.length)).replace(/\s+$/, '') + '...';
  var modelo = { nome: 'sgo_aviso_geral', parametros: [titulo, (resumoMeta + extrasMeta).trim(), '@LINK'] };
  return { usuarios: ids, titulo: titulo, texto: texto, textoWhatsapp: whats, modelo: modelo, canais: ['sgo', 'email', 'whatsapp'], origem: 'AVISOS', refId: a.ID };
}

/** Painel da gestão: avisos publicados com contagem de leitura. */
function Avisos_apiPainel(sessionId, payload) {
  return Avisos_resposta_(function () {
    var eu = Avisos_sessao_(sessionId);
    Avisos_exigirGestor_(eu, 'abrir o painel de avisos');
    var p = payload || {};
    var hoje = Avisos_agora_().slice(0, 10);
    var ciencias = Avisos_ciencias_(null, null);
    var itens = Avisos_todos_()
      .filter(function (a) { return p.arquivados ? true : a.SITUACAO === 'PUBLICADO'; })
      .map(function (a) {
        var lidos = a.destinatarios.filter(function (u) { var c = ciencias[a.ID + '|' + u]; return c && c.CIENTE_EM; }).length;
        return {
          ID: a.ID, TITULO: a.TITULO, IMPORTANCIA: a.IMPORTANCIA, SITUACAO: a.SITUACAO, PUBLICADO_EM: a.PUBLICADO_EM,
          PUBLICADO_POR_NOME: String(a.PUBLICADO_POR_NOME || ''), PRAZO_CIENCIA: a.PRAZO_CIENCIA,
          PRAZO_VENCIDO: !!(a.PRAZO_CIENCIA && a.PRAZO_CIENCIA < hoje), ARQUIVADO_EM: a.ARQUIVADO_EM,
          QTD_REENVIOS: a.QTD_REENVIOS, ULTIMO_REENVIO_EM: a.ULTIMO_REENVIO_EM, QTD_ANEXOS: a.QTD_ANEXOS,
          PUBLICO_TIPO: String(a.PUBLICO_TIPO || 'TODOS'), PUBLICO_PERFIS: String(a.PUBLICO_PERFIS || ''),
          total: a.destinatarios.length, lidos: lidos
        };
      });
    return { itens: itens };
  });
}

/** Quem leu / quem não leu um aviso (com datas). */
function Avisos_apiLeitura(sessionId, payload) {
  return Avisos_resposta_(function () {
    var eu = Avisos_sessao_(sessionId);
    Avisos_exigirGestor_(eu, 'ver quem leu o aviso');
    var a = Avisos_obter_(payload && payload.id);
    var hoje = Avisos_agora_().slice(0, 10);
    var ciencias = Avisos_ciencias_(null, a.ID);
    var nomes = {};
    SGO_DATA.getAll(SGO_CFG.SHEETS.CAD_USUARIOS).forEach(function (u) { nomes[String(u.ID)] = { nome: SGO_UTILS.safe(u.NOME) || SGO_UTILS.safe(u.USUARIO), ativo: SGO_UTILS.safeUpper(u.STATUS || 'ATIVO') === 'ATIVO', perfil: SGO_UTILS.safeUpper(u.PERFIL) }; });
    var pessoas = a.destinatarios.map(function (uid) {
      var c = ciencias[a.ID + '|' + uid], n = nomes[uid] || { nome: 'Usuário removido', ativo: false, perfil: '' };
      return {
        id: uid, nome: n.nome, perfil: n.perfil, ativo: n.ativo,
        situacao: c && c.CIENTE_EM ? 'LEU' : (c ? 'VIU_SEM_CONFIRMAR' : 'NAO_VIU'),
        cienteEm: c ? c.CIENTE_EM : '', primeiraVez: c ? c.PRIMEIRA : '', ultimaVez: c ? c.ULTIMA : '', exibicoes: c ? c.QTD : 0
      };
    }).sort(function (x, y) { return x.nome.localeCompare(y.nome); });
    var anexos = Avisos_anexosPorAviso_()[a.ID] || [];
    return {
      aviso: Avisos_paraTela_(a, anexos, null, hoje),
      pessoas: pessoas, lidos: pessoas.filter(function (x) { return x.situacao === 'LEU'; }).length, total: pessoas.length,
      qtdReenvios: a.QTD_REENVIOS, ultimoReenvioEm: a.ULTIMO_REENVIO_EM
    };
  });
}

/** Reenvia por e-mail e WhatsApp para quem ainda não confirmou (e continua ativo). */
function Avisos_apiReenviar(sessionId, payload) {
  return Avisos_resposta_(function (notificar) {
    var eu = Avisos_sessao_(sessionId);
    Avisos_exigirGestor_(eu, 'reenviar o aviso');
    var r = Avisos_comTrava_(function () {
      var a = Avisos_obter_(payload && payload.id);
      if (a.SITUACAO !== 'PUBLICADO') throw new Error('Não foi possível reenviar: o aviso está arquivado. Reative o aviso no painel antes de reenviar.');
      if (a.ULTIMO_REENVIO_EM && a.ULTIMO_REENVIO_EM >= Avisos_haMinutos_(AVS_JANELA_REPETICAO_MIN)) {
        throw new Error('Não foi possível reenviar agora: este aviso já foi reenviado às ' + a.ULTIMO_REENVIO_EM.slice(11, 16) + '. Para não mandar o mesmo lembrete duas vezes, aguarde ' + AVS_JANELA_REPETICAO_MIN + ' minutos e clique em Reenviar de novo.');
      }
      var ciencias = Avisos_ciencias_(null, a.ID);
      var ativos = {};
      Avisos_usuariosAtivos_().forEach(function (u) { ativos[u.id] = true; });
      var faltam = a.destinatarios.filter(function (u) { var c = ciencias[a.ID + '|' + u]; return ativos[u] && !(c && c.CIENTE_EM); });
      if (!faltam.length) return { a: a, faltam: [] };
      var agora = Avisos_agora_();
      SGO_DATA.update(Avisos_abas_().AVISOS, a.ID, { QTD_REENVIOS: a.QTD_REENVIOS + 1, ULTIMO_REENVIO_EM: agora });
      try { SGO_DATA.log('AVISO_REENVIADO', eu.usuario, a.TITULO + ' (' + faltam.length + ' pessoa(s))', 'AVISOS'); } catch (e) {}
      return { a: a, faltam: faltam };
    });
    if (!r.faltam.length) return { reenviados: 0, message: 'Todas as pessoas ativas do público já confirmaram a leitura; nada a reenviar.' };
    notificar(Avisos_mensagem_(r.a, r.faltam, true));
    return { reenviados: r.faltam.length, message: 'Aviso reenviado por e-mail e WhatsApp para ' + r.faltam.length + ' pessoa(s) que ainda não confirmaram.' };
  });
}

/** Arquiva (some das janelas e da lista de quem não leu) ou reativa. */
function Avisos_apiArquivar(sessionId, payload) {
  return Avisos_resposta_(function () {
    var eu = Avisos_sessao_(sessionId);
    Avisos_exigirGestor_(eu, 'arquivar o aviso');
    var reativar = !!(payload && payload.reativar);
    return Avisos_comTrava_(function () {
      var a = Avisos_obter_(payload && payload.id);
      var agora = Avisos_agora_();
      if (reativar) {
        if (a.SITUACAO === 'PUBLICADO') return { message: 'O aviso já estava publicado.' };
        SGO_DATA.update(Avisos_abas_().AVISOS, a.ID, { SITUACAO: 'PUBLICADO', ARQUIVADO_EM: '', ARQUIVADO_POR_NOME: '' });
        try { SGO_DATA.log('AVISO_REATIVADO', eu.usuario, a.TITULO, 'AVISOS'); } catch (e) {}
        return { message: 'Aviso reativado: quem ainda não confirmou volta a vê-lo ao entrar.' };
      }
      if (a.SITUACAO === 'ARQUIVADO') return { message: 'O aviso já estava arquivado.' };
      SGO_DATA.update(Avisos_abas_().AVISOS, a.ID, { SITUACAO: 'ARQUIVADO', ARQUIVADO_EM: agora, ARQUIVADO_POR_NOME: eu.nome });
      try { SGO_DATA.log('AVISO_ARQUIVADO', eu.usuario, a.TITULO, 'AVISOS'); } catch (e) {}
      return { message: 'Aviso arquivado: ele não aparece mais para quem não leu. O registro de leitura continua guardado.' };
    });
  });
}
