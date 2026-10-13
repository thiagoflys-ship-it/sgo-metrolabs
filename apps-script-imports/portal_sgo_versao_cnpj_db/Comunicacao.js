/**
 * METROLABS — Comunicação compartilhada entre o SGO+ e o METROLABS COMMAND.
 *
 * ESTE ARQUIVO É IDÊNTICO NOS DOIS SISTEMAS (o mesmo Comunicacao.js vai para o
 * COMMAND e para o SGO+). Nada aqui é específico de um sistema: tudo o que muda
 * fica no ADAPTADOR de cada um (ComunicacaoAdaptador.js no COMMAND,
 * SGO_ComunicacaoAdaptador.js no SGO+), que define:
 *   comAdaptador_()          -> { sistema: "COMMAND"|"SGO", podeCriarBanco, urlSistema }
 *   comUsuarioDoToken_(tok)  -> { id, login, nome, setor, admin, gestao }  (lança "SESSAO")
 *   comUsuariosAtivos_()     -> [{ id, login, nome, setor }]
 *   comLinkRegistro_(ref)    -> URL que abre um registro DESTE sistema
 *   comAdaptadorConfigExtra_() (opcional) -> { chave: valor } gravado em COM_CONFIG
 *
 * Os dois projetos Apps Script conversam por uma planilha compartilhada
 * "METROLABS — Comunicação". Não existe trava entre projetos diferentes, então:
 *  - MENSAGENS, AVISOS, LEITURAS e CIÊNCIAS só recebem appendRow (atômico);
 *  - nenhum contador compartilhado: ids são uuid; conversas diretas, de setor e a
 *    geral têm id determinístico (duas criações simultâneas dão o mesmo id e a
 *    leitura descarta a repetida);
 *  - a leitura é incremental pelo número da linha (o navegador guarda o cursor).
 * COM_PESSOAS e COM_CONFIG mudam raramente e usam setValues na linha (o último
 * a gravar vence).
 */

var COM_NOME_DB = "METROLABS — Comunicação";
var COM_PROP_DB = "COM_DB_ID";
var COM_TABS = {
  COM_PESSOAS: ["pessoa_id", "nome", "setor", "cmd_id", "cmd_login", "sgo_id", "sgo_login", "ativo", "criado_em", "atualizado_em", "vinculo"],
  COM_CONVERSAS: ["conversa_id", "tipo", "titulo", "membros", "criado_por", "criado_em"],
  COM_MENSAGENS: ["msg_id", "conversa_id", "de_pessoa", "de_nome", "de_sistema", "texto", "criado_em", "ref_sistema", "ref_tipo", "ref_id", "ref_codigo", "resposta_a"],
  COM_AVISOS: ["aviso_id", "origem_sistema", "para", "titulo", "texto", "prioridade", "tipo", "exige_ciencia", "ref_sistema", "ref_tipo", "ref_id", "ref_codigo", "criado_por", "criado_em", "expira_em"],
  COM_LEITURAS: ["pessoa_id", "conversa_id", "lido_ate", "em"],
  COM_CIENCIAS: ["aviso_id", "pessoa_id", "em", "sistema"],
  COM_CONFIG: ["chave", "valor", "sistema", "atualizado_em"]
};
var COM_MAX_TEXTO = 4000;
var COM_JANELA_MSG = 3000;       // mensagens consideradas para "não lidas"
var COM_JANELA_LEIT = 10000;     // leituras consideradas (vale a mais recente)
var COM_JANELA_AVISO = 1500;     // avisos/comunicados considerados
var COM_MAX_NOVAS = 400;         // linhas novas por aba numa chamada de novidades
var COM_PRESENCA_S = 1800;       // "visto por último" gravado no máximo a cada 30 min
var COM_CURSOR_TABS = ["COM_MENSAGENS", "COM_AVISOS", "COM_LEITURAS", "COM_CIENCIAS", "COM_CONVERSAS"];

/** Memória de UMA execução (zerada em cada entrada pública). */
var COM_MEMO_ = {};

/* ======================================================================
 * utilitários
 * ====================================================================== */

function comAgora_() { return new Date().toISOString(); }
function comUuid_() { return Utilities.getUuid(); }
function comFalha_(msg) { throw new Error("COM: " + msg); }
function comLog_(msg) { try { console.log("[COM] " + msg); } catch (e) { } }

/** Texto sem acento, minúsculo, espaços simples. */
function comNorm_(s) {
  var t = String(s === null || s === undefined ? "" : s).trim().toLowerCase();
  try { t = t.normalize("NFD").replace(/[̀-ͯ]/g, ""); } catch (e) { }
  return t.replace(/\s+/g, " ");
}
function comNormLogin_(s) { return comNorm_(s).replace(/\s+/g, ""); }

function comVerdade_(v) { return v === true || /^(true|sim|1)$/i.test(String(v)); }

/** Valor lido da planilha → texto (data vira ISO). */
function comVal_(v) {
  if (v instanceof Date) return isNaN(v.getTime()) ? "" : v.toISOString();
  if (v === null || v === undefined) return "";
  return v;
}

/**
 * Valor para gravar: texto que começa com = + - @ ' ou dígito vai com apóstrofo
 * (planilha não interpreta fórmula, número nem data; ao ler, o apóstrofo some).
 */
function comSeguro_(v) {
  if (v === null || v === undefined) return "";
  if (typeof v === "boolean") return v;
  var s = String(v);
  if (/^[=+\-@'0-9]/.test(s)) return "'" + s;
  return s;
}

function comTexto_(v, max) {
  var s = String(v === null || v === undefined ? "" : v).replace(/\r\n?/g, "\n").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim();
  return max ? s.slice(0, max) : s;
}

function comPrioridade_(p) {
  var x = comNorm_(p).toUpperCase();
  if (x === "CRITICA" || x === "P1") return "CRITICA";
  if (x === "ALTA") return "ALTA";
  return "INFO";
}

function comOutro_(sistema) { return sistema === "COMMAND" ? "SGO" : "COMMAND"; }
function comPref_(sistema) { return sistema === "COMMAND" ? "cmd" : "sgo"; }

/* ======================================================================
 * banco compartilhado
 * ====================================================================== */

/**
 * Abre (ou localiza, ou cria — só quem pode) a planilha compartilhada.
 * criar=true só no lado que pode criar (COMMAND). Devolve null se não existir.
 */
function comBanco_(criar) {
  if (COM_MEMO_.ss) return COM_MEMO_.ss;
  var ad = comAdaptador_();
  var props = PropertiesService.getScriptProperties();
  var cache = CacheService.getScriptCache();
  var id = props.getProperty(COM_PROP_DB), ss = null;
  if (id) {
    try { ss = SpreadsheetApp.openById(id); } catch (e) { ss = null; }
    if (!ss) comFalha_("Não foi possível abrir a planilha da Comunicação (" + id + "). Confira se ela existe e se a conta que publica o sistema tem acesso.");
    if (!ss.getSheetByName("COM_PESSOAS")) comGarantirAbas_(ss, true);
  } else {
    var podeCriar = !!(criar && ad.podeCriarBanco);
    if (!podeCriar && cache.get("COM_SEM_DB")) return null;
    var trava = null;
    if (podeCriar) { try { trava = LockService.getScriptLock(); trava.waitLock(20000); } catch (e) { trava = null; } }
    try {
      id = props.getProperty(COM_PROP_DB);
      if (id) { try { ss = SpreadsheetApp.openById(id); } catch (e) { ss = null; } }
      if (!ss) {
        var achou = comProcurarNoDrive_();   // lança se o Drive não estiver acessível
        ss = achou;
        if (!ss && podeCriar) {
          ss = SpreadsheetApp.create(COM_NOME_DB);
          comGarantirAbas_(ss, true);
          comLog_("banco da comunicação criado: " + ss.getId());
        }
      }
      if (!ss) { try { cache.put("COM_SEM_DB", "1", 60); } catch (e) { } return null; }
      props.setProperty(COM_PROP_DB, ss.getId());
      props.deleteProperty("COM_SCHEMA_OK");
      try { cache.remove("COM_SEM_DB"); } catch (e) { }
    } finally { if (trava) try { trava.releaseLock(); } catch (e) { } }
  }
  if (props.getProperty("COM_SCHEMA_OK") !== comVersaoEsquema_()) {
    comGarantirAbas_(ss, false);
    props.setProperty("COM_SCHEMA_OK", comVersaoEsquema_());
  }
  COM_MEMO_.ss = ss;
  return ss;
}

/** Procura no Drive a planilha com o nome exato que tenha a aba COM_PESSOAS (a mais antiga, para os dois sistemas acharem a mesma). */
function comProcurarNoDrive_() {
  var it;
  try { it = DriveApp.getFilesByName(COM_NOME_DB); }
  catch (e) { comFalha_("Sem acesso ao Google Drive para localizar a planilha da Comunicação. Autorize o Drive ou grave a propriedade COM_DB_ID."); }
  var melhor = null, melhorData = null;
  while (it.hasNext()) {
    var f = it.next();
    try {
      if (f.isTrashed && f.isTrashed()) continue;
      if (f.getMimeType && f.getMimeType() !== "application/vnd.google-apps.spreadsheet") continue;
      var ss = SpreadsheetApp.openById(f.getId());
      if (!ss.getSheetByName("COM_PESSOAS")) continue;
      var d = f.getDateCreated ? new Date(f.getDateCreated()).getTime() : 0;
      if (!melhor || d < melhorData) { melhor = ss; melhorData = d; }
    } catch (e) { }
  }
  return melhor;
}

function comVersaoEsquema_() {
  return "c1:" + Object.keys(COM_TABS).map(function (k) { return k + "=" + COM_TABS[k].length; }).join(",");
}

/** Cria as abas que faltam, cabeçalhos e a conversa GERAL. Nunca apaga nada. */
function comGarantirAbas_(ss, nova) {
  Object.keys(COM_TABS).forEach(function (nome) {
    var sh = ss.getSheetByName(nome), cols = COM_TABS[nome];
    if (!sh) sh = ss.insertSheet(nome);
    var ult = sh.getLastRow();
    if (ult === 0) {
      sh.getRange(1, 1, 1, cols.length).setValues([cols]);
      try { sh.getRange(1, 1, 1, cols.length).setFontWeight("bold"); sh.setFrozenRows(1); } catch (e) { }
    } else {
      var lc = Math.max(sh.getLastColumn(), 1);
      var head = sh.getRange(1, 1, 1, lc).getValues()[0].map(String);
      if (head.length < cols.length) sh.getRange(1, head.length + 1, 1, cols.length - head.length).setValues([cols.slice(head.length)]);
    }
  });
  if (nova) {
    try { var p1 = ss.getSheetByName("Página1") || ss.getSheetByName("Sheet1"); if (p1 && ss.getSheets().length > 1 && p1.getLastRow() === 0 && ss.deleteSheet) ss.deleteSheet(p1); } catch (e) { }
  }
  var convs = comConversas_(ss);
  if (!convs.some(function (c) { return c.conversa_id === "GERAL"; }))
    comAppend_(ss, "COM_CONVERSAS", { conversa_id: "GERAL", tipo: "GERAL", titulo: "Geral — todos", membros: "TODOS", criado_por: "sistema", criado_em: comAgora_() });
}

function comAba_(ss, nome) {
  var sh = ss.getSheetByName(nome);
  if (!sh) { comGarantirAbas_(ss, false); sh = ss.getSheetByName(nome); }
  return sh;
}

function comAppend_(ss, tab, obj) {
  comAba_(ss, tab).appendRow(COM_TABS[tab].map(function (c) { return comSeguro_(obj[c]); }));
  delete COM_MEMO_["ult_" + tab];
  if (tab === "COM_CONVERSAS") delete COM_MEMO_.conversas;
}

function comUltima_(ss, tab) {
  var k = "ult_" + tab;
  if (COM_MEMO_[k] === undefined) COM_MEMO_[k] = comAba_(ss, tab).getLastRow();
  return COM_MEMO_[k];
}

/** Lê as linhas ini..fim (números de linha da planilha, ini >= 2) como objetos com _linha. */
function comLerLinhas_(ss, tab, ini, fim) {
  ini = Math.max(2, ini); if (fim < ini) return [];
  var cols = COM_TABS[tab];
  var vals = comAba_(ss, tab).getRange(ini, 1, fim - ini + 1, cols.length).getValues();
  var out = [];
  vals.forEach(function (l, i) {
    var o = { _linha: ini + i }, vazio = true;
    cols.forEach(function (c, j) { o[c] = comVal_(l[j]); if (o[c] !== "") vazio = false; o[c] = typeof o[c] === "string" ? o[c] : (typeof o[c] === "boolean" ? o[c] : String(o[c])); });
    if (!vazio) out.push(o);
  });
  return out;
}

/** As últimas n linhas de uma aba. */
function comCauda_(ss, tab, n) {
  var ult = comUltima_(ss, tab);
  return comLerLinhas_(ss, tab, Math.max(2, ult - n + 1), ult);
}

/* ======================================================================
 * COM_CONFIG (chave/valor compartilhado entre os sistemas)
 * ====================================================================== */

/** Lê uma chave de COM_CONFIG. Nunca lança erro; "" se não houver banco ou chave. */
function comConfigLer_(chave) {
  try {
    var ss = comBanco_(false);
    if (!ss) return "";
    delete COM_MEMO_.config; delete COM_MEMO_.ult_COM_CONFIG;   // sempre o valor mais recente
    var mapa = comConfigMapa_(ss);
    return mapa[String(chave)] ? String(mapa[String(chave)].valor) : "";
  } catch (e) { comLog_("comConfigLer_: " + e.message); return ""; }
}

/** Grava/atualiza uma chave de COM_CONFIG. Nunca lança erro; devolve "" se não houver banco, senão o valor gravado. */
function comConfigGravar_(chave, valor) {
  try {
    var ss = comBanco_(false);
    if (!ss) return "";
    chave = comTexto_(chave, 100); valor = valor === null || valor === undefined ? "" : String(valor);
    if (!chave) return "";
    var mapa = comConfigMapa_(ss), atual = mapa[chave], sis = comAdaptador_().sistema;
    if (atual && String(atual.valor) === valor) return valor;
    var linha = [chave, valor, sis, comAgora_()].map(comSeguro_);
    if (atual) comAba_(ss, "COM_CONFIG").getRange(atual._linha, 1, 1, linha.length).setValues([linha]);
    else comAppend_(ss, "COM_CONFIG", { chave: chave, valor: valor, sistema: sis, atualizado_em: comAgora_() });
    delete COM_MEMO_.config;
    return valor;
  } catch (e) { comLog_("comConfigGravar_: " + e.message); return ""; }
}

function comConfigMapa_(ss) {
  if (COM_MEMO_.config) return COM_MEMO_.config;
  var m = {};
  comLerLinhas_(ss, "COM_CONFIG", 2, comUltima_(ss, "COM_CONFIG")).forEach(function (l) { if (l.chave) m[String(l.chave)] = l; });   // a última vence
  COM_MEMO_.config = m;
  return m;
}

/** Cada sistema publica a sua URL e o modelo de link de registro (o outro sistema monta "abrir no ..."). */
function comPublicarConfigSistema_(forcar) {
  try {
    var cache = CacheService.getScriptCache();
    if (!forcar && cache.get("COM_CFG_OK")) return;
    var ad = comAdaptador_(), p = comPref_(ad.sistema);
    comConfigGravar_(p + "_url", ad.urlSistema || "");
    comConfigGravar_(p + "_link", comLinkRegistro_({ tipo: "{TIPO}", id: "{ID}", codigo: "{CODIGO}" }) || "");
    if (typeof comAdaptadorConfigExtra_ === "function") {
      var extra = comAdaptadorConfigExtra_() || {};
      Object.keys(extra).forEach(function (k) { comConfigGravar_(k, extra[k]); });
    }
    cache.put("COM_CFG_OK", "1", 6 * 3600);
  } catch (e) { comLog_("config do sistema: " + e.message); }
}

/** Link para abrir um registro de qualquer dos dois sistemas. */
function comLinkDe_(ss, refSistema, refTipo, refId, refCodigo) {
  if (!refSistema || (!refId && !refTipo)) return "";
  var mapa = comConfigMapa_(ss), p = comPref_(refSistema);
  var modelo = mapa[p + "_link"] ? String(mapa[p + "_link"].valor) : (mapa[p + "_url"] ? String(mapa[p + "_url"].valor) : "");
  if (!modelo) return "";
  return modelo.replace("{TIPO}", encodeURIComponent(refTipo || "")).replace("{ID}", encodeURIComponent(refId || "")).replace("{CODIGO}", encodeURIComponent(refCodigo || ""));
}

/* ======================================================================
 * pessoas
 * ====================================================================== */

function comPessoas_(ss) {
  if (COM_MEMO_.pessoas) return COM_MEMO_.pessoas;
  COM_MEMO_.pessoas = comLerLinhas_(ss, "COM_PESSOAS", 2, comUltima_(ss, "COM_PESSOAS"));
  return COM_MEMO_.pessoas;
}

function comMesclada_(p) { return String(p.ativo).indexOf("MESCLADA:") === 0; }

/** Segue o apontamento de pessoas mescladas até a pessoa real. */
function comReal_(pessoas, id) {
  var porId = {};
  pessoas.forEach(function (p) { porId[p.pessoa_id] = p; });
  for (var i = 0; i < 6 && porId[id] && comMesclada_(porId[id]); i++) id = String(porId[id].ativo).slice(9);
  return id;
}

/** Todos os ids que valem para uma pessoa (o dela + os mesclados nela). */
function comIdsDe_(pessoas, id) {
  var ids = [id];
  pessoas.forEach(function (p) { if (comMesclada_(p) && comReal_(pessoas, p.pessoa_id) === id) ids.push(p.pessoa_id); });
  return ids;
}

function comGravarPessoa_(ss, p, campos) {
  Object.keys(campos).forEach(function (k) { p[k] = campos[k]; });
  p.atualizado_em = comAgora_();
  var cols = COM_TABS.COM_PESSOAS;
  comAba_(ss, "COM_PESSOAS").getRange(p._linha, 1, 1, cols.length).setValues([cols.map(function (c) { return comSeguro_(p[c]); })]);
}

function comNovaPessoa_(ss, sistema, u) {
  var pr = comPref_(sistema), agora = comAgora_();
  var p = { pessoa_id: comUuid_(), nome: comTexto_(u.nome, 120) || u.login, setor: comTexto_(u.setor, 80), ativo: "SIM", criado_em: agora, atualizado_em: agora, vinculo: "" };
  p[pr + "_id"] = String(u.id); p[pr + "_login"] = comTexto_(u.login, 80);
  comAppend_(ss, "COM_PESSOAS", p);
  p._linha = comUltima_(ss, "COM_PESSOAS");   // melhor esforço (só usado nesta execução)
  if (COM_MEMO_.pessoas) COM_MEMO_.pessoas.push(p);
  return p;
}

/** Junta a pessoa "b" na "a" (a mais antiga fica). Mensagens antigas continuam valendo pelos ids mesclados. */
function comMesclar_(ss, a, b, manual) {
  if (String(b.criado_em) < String(a.criado_em)) { var t = a; a = b; b = t; }
  var campos = { ativo: "SIM" };
  ["cmd", "sgo"].forEach(function (pr) {
    if (!a[pr + "_id"] && b[pr + "_id"]) { campos[pr + "_id"] = b[pr + "_id"]; campos[pr + "_login"] = b[pr + "_login"]; }
  });
  if (!a.setor && b.setor) campos.setor = b.setor;
  if (b.cmd_id && !a.cmd_id) { campos.nome = b.nome || a.nome; if (b.setor) campos.setor = b.setor; }   // nome/setor do COMMAND prevalecem
  if (manual) campos.vinculo = "MANUAL";
  comGravarPessoa_(ss, a, campos);
  comGravarPessoa_(ss, b, { cmd_id: "", sgo_id: "", ativo: "MESCLADA:" + a.pessoa_id });
  return a;
}

function comCandidatoVinculo_(pessoas, sistema, u, nomesRepetidos) {
  var pr = comPref_(sistema), ou = comPref_(comOutro_(sistema));
  var livres = pessoas.filter(function (p) {
    return !comMesclada_(p) && !p[pr + "_id"] && p[ou + "_id"] && String(p.vinculo) !== "MANUAL";
  });
  var lg = comNormLogin_(u.login);
  var porLogin = lg ? livres.filter(function (p) { return comNormLogin_(p[ou + "_login"]) === lg; }) : [];
  if (porLogin.length === 1) return porLogin[0];
  var nm = comNorm_(u.nome);
  if (!nm || nomesRepetidos[nm]) return null;
  var porNome = livres.filter(function (p) { return comNorm_(p.nome) === nm; });
  if (porNome.length === 1) return porNome[0];
  return null;
}

/**
 * Sincroniza os usuários ativos DESTE sistema em COM_PESSOAS, com vínculo
 * automático ao outro sistema por login (sem acento, minúsculo) ou nome.
 */
function comSincronizarNucleo_(ss) {
  var ad = comAdaptador_(), sis = ad.sistema, pr = comPref_(sis), ou = comPref_(comOutro_(sis));
  var lista = (comUsuariosAtivos_() || []).filter(function (u) { return u && u.id; });
  var trava = null;
  try { trava = LockService.getScriptLock(); trava.waitLock(20000); } catch (e) { trava = null; }
  var r = { novos: 0, vinculados: 0, atualizados: 0, inativados: 0, total: lista.length };
  try {
    delete COM_MEMO_.pessoas; delete COM_MEMO_.ult_COM_PESSOAS;
    var pessoas = comPessoas_(ss);
    var cont = {};
    lista.forEach(function (u) { var n = comNorm_(u.nome); cont[n] = (cont[n] || 0) + 1; });
    var repetidos = {}; Object.keys(cont).forEach(function (n) { if (cont[n] > 1) repetidos[n] = 1; });
    var ativos = {};
    lista.forEach(function (u) {
      ativos[String(u.id)] = 1;
      var p = pessoas.filter(function (x) { return !comMesclada_(x) && String(x[pr + "_id"]) === String(u.id); })[0];
      if (p) {
        var campos = {};
        if (String(p[pr + "_login"]) !== String(u.login || "")) campos[pr + "_login"] = comTexto_(u.login, 80);
        var dono = sis === "COMMAND" || !p[ou + "_id"];   // nome/setor: COMMAND prevalece quando vinculado
        if (dono && u.nome && String(p.nome) !== comTexto_(u.nome, 120)) campos.nome = comTexto_(u.nome, 120);
        if ((dono || !p.setor) && u.setor && String(p.setor) !== comTexto_(u.setor, 80)) campos.setor = comTexto_(u.setor, 80);
        if (String(p.ativo) !== "SIM") campos.ativo = "SIM";
        if (Object.keys(campos).length) { comGravarPessoa_(ss, p, campos); r.atualizados++; }
        if (!p[ou + "_id"] && String(p.vinculo) !== "MANUAL") {
          var c = comCandidatoVinculo_(pessoas, sis, u, repetidos);
          if (c && c !== p) { comMesclar_(ss, p, c, false); r.vinculados++; }
        }
        return;
      }
      var cand = comCandidatoVinculo_(pessoas, sis, u, repetidos);
      if (cand) {
        var cc = { ativo: "SIM" };
        cc[pr + "_id"] = String(u.id); cc[pr + "_login"] = comTexto_(u.login, 80);
        if (sis === "COMMAND") { if (u.nome) cc.nome = comTexto_(u.nome, 120); if (u.setor) cc.setor = comTexto_(u.setor, 80); }
        else if (!cand.setor && u.setor) cc.setor = comTexto_(u.setor, 80);
        comGravarPessoa_(ss, cand, cc); r.vinculados++;
        return;
      }
      comNovaPessoa_(ss, sis, u); r.novos++;
    });
    pessoas.forEach(function (p) {
      if (comMesclada_(p) || !p[pr + "_id"] || ativos[String(p[pr + "_id"])]) return;
      if (!p[ou + "_id"] && String(p.ativo) !== "NAO") { comGravarPessoa_(ss, p, { ativo: "NAO" }); r.inativados++; }
    });
  } finally { if (trava) try { trava.releaseLock(); } catch (e) { } }
  delete COM_MEMO_.pessoas;
  comPublicarConfigSistema_(true);
  return r;
}

/** Para os sistemas chamarem no servidor (rotina diária). Nunca lança erro. */
function comSincronizarPessoas_() {
  COM_MEMO_ = {};
  try {
    var ss = comBanco_(true);
    if (!ss) return { ok: false, erro: "Comunicação ainda não ativada: abra o COMMAND uma vez." };
    var r = comSincronizarNucleo_(ss);
    r.ok = true;
    return r;
  } catch (e) { comLog_("sincronizar pessoas: " + e.message); return { ok: false, erro: String(e.message || e).replace(/^COM:\s*/, "") }; }
}

/** Pessoa (em COM_PESSOAS) do usuário deste sistema; registra no primeiro acesso. */
function comPessoaDoUsuario_(ss, u, registrar) {
  var sis = comAdaptador_().sistema, pr = comPref_(sis);
  var acha = function () {
    var ps = comPessoas_(ss);
    return ps.filter(function (x) { return !comMesclada_(x) && String(x[pr + "_id"]) === String(u.id); })[0];
  };
  var p = acha();
  if (!p && registrar !== false) {
    comSincronizarNucleo_(ss);
    p = acha();
    if (!p) { delete COM_MEMO_.pessoas; comNovaPessoa_(ss, sis, u); delete COM_MEMO_.pessoas; p = acha(); }
  }
  if (!p) return null;
  var ps = comPessoas_(ss);
  return { pessoa_id: p.pessoa_id, nome: p.nome, setor: p.setor, ids: comIdsDe_(ps, p.pessoa_id), criado_em: p.criado_em, ativo: p.ativo,
    cmd: !!p.cmd_id, sgo: !!p.sgo_id };
}

/* ======================================================================
 * conversas, leituras e contagens
 * ====================================================================== */

function comConversas_(ss) {
  if (COM_MEMO_.conversas) return COM_MEMO_.conversas;
  var ult = comAba_(ss, "COM_CONVERSAS").getLastRow(), cache = null, chave = "COM_CONV_" + String(ss.getId()).slice(-24) + "_" + ult;
  try { cache = CacheService.getScriptCache(); var c = cache.get(chave); if (c) { COM_MEMO_.conversas = JSON.parse(c); return COM_MEMO_.conversas; } } catch (e) { }
  var vistos = {}, lista = [];
  comLerLinhas_(ss, "COM_CONVERSAS", 2, ult).forEach(function (c) {
    if (!c.conversa_id || vistos[c.conversa_id]) return;   // repetida por criação simultânea: vale a primeira
    vistos[c.conversa_id] = 1; lista.push(c);
  });
  try { var js = JSON.stringify(lista); if (cache && js.length < 90000) cache.put(chave, js, 21600); } catch (e) { }
  COM_MEMO_.conversas = lista;
  return lista;
}

function comMembros_(c) { return String(c.membros || "").split(",").map(function (s) { return s.trim(); }).filter(String); }

function comEhMembro_(c, eu) {
  if (!c) return false;
  if (c.tipo === "GERAL") return true;
  if (c.tipo === "SETOR") { var s = String(c.membros || "").replace(/^SETOR:/, ""); return !!eu.setor && comNorm_(s) === comNorm_(eu.setor); }
  var m = comMembros_(c);
  return eu.ids.some(function (id) { return m.indexOf(id) >= 0; });
}

function comParaMim_(a, eu) {
  var para = String(a.para || "");
  if (para === "TODOS") return true;
  if (para.indexOf("SETOR:") === 0) return !!eu.setor && comNorm_(para.slice(6)) === comNorm_(eu.setor);
  return eu.ids.indexOf(para) >= 0;
}

/** Depois do "lido até" (estrito) ou, sem leitura, desde que a pessoa entrou na Comunicação. */
function comNovo_(em, lidoAte, base) { return lidoAte ? String(em) > String(lidoAte) : String(em) >= String(base || ""); }

function comVigente_(a, agora) { return !a.expira_em || String(a.expira_em) > agora; }

/** Mapa conversa_id → lido_ate (vale o mais recente) da pessoa, a partir da cauda de COM_LEITURAS + memória local. */
function comLidoMapa_(ss, eu) {
  if (COM_MEMO_.lido) return COM_MEMO_.lido;
  var m = {}, cache = CacheService.getScriptCache(), chave = "COM_LIDO_" + eu.pessoa_id;
  try { var c = cache.get(chave); if (c) m = JSON.parse(c) || {}; } catch (e) { m = {}; }
  comCauda_(ss, "COM_LEITURAS", COM_JANELA_LEIT).forEach(function (l) {
    if (eu.ids.indexOf(String(l.pessoa_id)) < 0 || !l.conversa_id || l.conversa_id === "*") return;
    if (!m[l.conversa_id] || String(l.lido_ate) > m[l.conversa_id]) m[l.conversa_id] = String(l.lido_ate);
  });
  try { cache.put(chave, JSON.stringify(m), 21600); } catch (e) { }
  COM_MEMO_.lido = m;
  return m;
}

function comCienciasDe_(ss, eu) {
  var s = {};
  comCauda_(ss, "COM_CIENCIAS", COM_JANELA_LEIT).forEach(function (c) { if (eu.ids.indexOf(String(c.pessoa_id)) >= 0) s[c.aviso_id] = c.em || true; });
  return s;
}

function comNomes_(ss) {
  var ps = comPessoas_(ss), m = {};
  ps.forEach(function (p) { m[p.pessoa_id] = p; });
  return m;
}

/** Conversa no formato da tela (título da direta = nome da outra pessoa). */
function comConversaTela_(c, eu, nomes) {
  var o = { conversa_id: c.conversa_id, tipo: c.tipo, titulo: c.titulo, criado_em: c.criado_em, membros: [] };
  if (c.tipo === "GRUPO" || c.tipo === "DIRETA") o.membros = comMembros_(c);
  if (c.tipo === "DIRETA") {
    var outro = o.membros.filter(function (id) { return eu.ids.indexOf(id) < 0; })[0];
    var p = outro && nomes[outro];
    while (p && comMesclada_(p) && nomes[String(p.ativo).slice(9)]) p = nomes[String(p.ativo).slice(9)];
    o.titulo = p ? p.nome : "Conversa";
    o.com = p ? { pessoa_id: p.pessoa_id, cmd: !!p.cmd_id, sgo: !!p.sgo_id } : null;
  }
  if (c.tipo === "SETOR") o.titulo = c.titulo || ("Setor " + String(c.membros).replace(/^SETOR:/, ""));
  return o;
}

function comAvisoTela_(ss, a, eu, ciencias, lido) {
  var o = {};
  COM_TABS.COM_AVISOS.forEach(function (c) { o[c] = a[c]; });
  o.exige_ciencia = comVerdade_(a.exige_ciencia);
  o._linha = a._linha;
  o.ciente = !!(ciencias && ciencias[a.aviso_id]);
  o.link = comLinkDe_(ss, a.ref_sistema, a.ref_tipo, a.ref_id, a.ref_codigo);
  var marca = lido ? (a.tipo === "COMUNICADO" ? lido.COMUNICADOS : lido.AVISOS) : "";
  o.novo = !!lido && comNovo_(a.criado_em, marca, eu.criado_em);
  return o;
}

function comMsgTela_(ss, m) {
  var o = {};
  COM_TABS.COM_MENSAGENS.forEach(function (c) { o[c] = m[c]; });
  o._linha = m._linha;
  o.link = comLinkDe_(ss, m.ref_sistema, m.ref_tipo, m.ref_id, m.ref_codigo);
  return o;
}

/** Avisos que aparecem NESTE sistema: avisos automáticos do outro sistema + comunicados de qualquer um. */
function comAvisoVisivel_(a, eu, sis, agora) {
  if (!a.aviso_id || !comParaMim_(a, eu) || !comVigente_(a, agora)) return false;
  if (a.tipo === "COMUNICADO") return true;
  return a.origem_sistema !== sis;
}

/** Contagens completas (cauda limitada das abas). */
function comContagens_(ss, eu, sis) {
  var lido = comLidoMapa_(ss, eu), agora = comAgora_(), base = String(eu.criado_em || "");
  var convs = comConversas_(ss).filter(function (c) { return comEhMembro_(c, eu); });
  var porConv = {}; convs.forEach(function (c) { porConv[c.conversa_id] = { n: 0, ultima: null }; });
  comCauda_(ss, "COM_MENSAGENS", COM_JANELA_MSG).forEach(function (m) {
    var pc = porConv[m.conversa_id]; if (!pc) return;
    pc.ultima = m;
    if (eu.ids.indexOf(String(m.de_pessoa)) >= 0) return;
    if (comNovo_(m.criado_em, lido[m.conversa_id], base)) pc.n++;
  });
  var ciencias = comCienciasDe_(ss, eu), nAv = 0, nCom = 0, nCien = 0, avisos = [], comunicados = [];
  comCauda_(ss, "COM_AVISOS", COM_JANELA_AVISO).forEach(function (a) {
    if (!comAvisoVisivel_(a, eu, sis, agora)) return;
    var t = comAvisoTela_(ss, a, eu, ciencias, lido);
    if (a.tipo === "COMUNICADO") {
      comunicados.push(t);
      if (t.exige_ciencia && !t.ciente) nCien++; else if (!t.exige_ciencia && t.novo) nCom++;
    } else { avisos.push(t); if (t.novo) nAv++; }
  });
  var nMsg = 0; Object.keys(porConv).forEach(function (k) { nMsg += porConv[k].n; });
  return { convs: convs, porConv: porConv, avisos: avisos, comunicados: comunicados, lido: lido,
    contagens: { mensagens: nMsg, avisos: nAv, comunicados: nCom, ciencia: nCien, total: nMsg + nAv + nCom + nCien } };
}

/** Grava "visto por último" (linha de leitura com conversa "*"), no máximo a cada 30 min por pessoa. */
function comPresenca_(ss, eu) {
  try {
    var cache = CacheService.getScriptCache(), k = "COM_VISTO_" + eu.pessoa_id;
    if (cache.get(k)) return;
    cache.put(k, "1", COM_PRESENCA_S);
    comAppend_(ss, "COM_LEITURAS", { pessoa_id: eu.pessoa_id, conversa_id: "*", lido_ate: comAgora_(), em: comAgora_() });
  } catch (e) { }
}

function comCursores_(ss) {
  var c = {};
  COM_CURSOR_TABS.forEach(function (t) { c[t] = comUltima_(ss, t); });
  return c;
}

/* ======================================================================
 * API única do navegador
 * ====================================================================== */

/**
 * comApi(token, acao, dados) → { ok, ... }
 * Ações: iniciar, novidades, conversa, enviar, abrirDireta, criarGrupo, marcarLido,
 * avisos, ciente, publicarComunicado, pessoas, vincular*, sincronizarPessoas*, status*  (* = admin)
 */
function comApi(token, acao, dados) {
  COM_MEMO_ = {};
  dados = dados || {};
  try {
    var u;
    try { u = comUsuarioDoToken_(token); }
    catch (e) {
      var m = String(e && e.message || e);
      if (/SEM_ACESSO/.test(m)) return { ok: false, erro: "SEM_ACESSO" };
      if (/SESS/i.test(m)) return { ok: false, erro: "SESSAO" };
      throw e;
    }
    if (!u || !u.id) return { ok: false, erro: "SESSAO" };
    var ad = comAdaptador_(), sis = ad.sistema;
    var ss = comBanco_(acao === "iniciar" || acao === "status" || acao === "sincronizarPessoas");
    if (!ss) return { ok: false, erro: "SEM_BANCO", mensagem: "Comunicação ainda não ativada: abra o COMMAND uma vez." };
    var eu = comPessoaDoUsuario_(ss, u, true);
    if (!eu) comFalha_("Não foi possível registrar você na Comunicação.");
    eu.admin = !!u.admin; eu.gestao = !!(u.admin || u.gestao);
    var fn = COM_ACOES_[acao];
    if (!fn) comFalha_("Ação desconhecida.");
    if (COM_ACOES_ADMIN_.indexOf(acao) >= 0 && !eu.admin) comFalha_("Só o administrador pode fazer isso.");
    var r = fn(ss, eu, dados, sis, u) || {};
    r.ok = r.ok === undefined ? true : r.ok;
    return r;
  } catch (e) {
    var msg = String((e && e.message) || e || "Erro");
    if (/^(COM|CMD):/.test(msg)) {
      msg = msg.replace(/^(COM|CMD):\s*/, "");
      if (msg === "SESSAO") return { ok: false, erro: "SESSAO" };
      return { ok: false, erro: msg };
    }
    comLog_("ERRO " + acao + ": " + msg);
    return { ok: false, erro: "Não foi possível concluir na Comunicação. Tente de novo em instantes." };
  }
}

var COM_ACOES_ADMIN_ = ["vincular", "sincronizarPessoas", "status"];

var COM_ACOES_ = {
  iniciar: function (ss, eu, d, sis) {
    comPresenca_(ss, eu);
    comPublicarConfigSistema_(false);
    var k = comContagens_(ss, eu, sis), nomes = comNomes_(ss);
    var conversas = k.convs.map(function (c) {
      var o = comConversaTela_(c, eu, nomes), pc = k.porConv[c.conversa_id];
      o.nao_lidas = pc.n;
      o.lido_ate = k.lido[c.conversa_id] || "";
      o.ultima = pc.ultima ? { de_nome: pc.ultima.de_nome, de_sistema: pc.ultima.de_sistema, texto: String(pc.ultima.texto).slice(0, 140), criado_em: pc.ultima.criado_em } : null;
      return o;
    }).sort(function (a, b) { return String((b.ultima || {}).criado_em || b.criado_em).localeCompare(String((a.ultima || {}).criado_em || a.criado_em)); });
    return {
      sistema: sis, outro: comOutro_(sis),
      eu: { pessoa_id: eu.pessoa_id, nome: eu.nome, setor: eu.setor, admin: eu.admin, gestao: eu.gestao },
      conversas: conversas,
      avisos: k.avisos.slice(-60).reverse(),
      comunicados: k.comunicados.slice(-60).reverse(),
      contagens: k.contagens,
      lido: { AVISOS: k.lido.AVISOS || "", COMUNICADOS: k.lido.COMUNICADOS || "" },
      cursores: comCursores_(ss)
    };
  },

  /** Só linhas novas desde os cursores. Sem novidade: só getLastRow das abas. */
  novidades: function (ss, eu, d, sis) {
    var cur = d.cursores || {}, novo = {}, agora = comAgora_(), saida = { mensagens: [], conversas: [], avisos: [], comunicados: [], leituras: [], ciencias: [], truncado: false };
    var linhas = {};
    COM_CURSOR_TABS.forEach(function (t) {
      var ult = comUltima_(ss, t), c = parseInt(cur[t], 10);
      if (!isFinite(c) || c < 1 || c > ult) { novo[t] = ult; if (isFinite(c) && c > ult) saida.truncado = true; linhas[t] = []; return; }
      novo[t] = ult;
      if (ult <= c) { linhas[t] = []; return; }
      var ini = c + 1;
      if (ult - c > COM_MAX_NOVAS) { ini = ult - COM_MAX_NOVAS + 1; saida.truncado = true; }
      linhas[t] = comLerLinhas_(ss, t, ini, ult);
    });
    saida.cursores = novo;
    var relevante = false;
    if (linhas.COM_CONVERSAS.length) {
      var nomes = comNomes_(ss);
      linhas.COM_CONVERSAS.forEach(function (c) { if (comEhMembro_(c, eu)) saida.conversas.push(comConversaTela_(c, eu, nomes)); });
    }
    if (linhas.COM_MENSAGENS.length) {
      var minhas = {};
      comConversas_(ss).forEach(function (c) { if (comEhMembro_(c, eu)) minhas[c.conversa_id] = 1; });
      linhas.COM_MENSAGENS.forEach(function (m) { if (minhas[m.conversa_id]) saida.mensagens.push(comMsgTela_(ss, m)); });
    }
    linhas.COM_LEITURAS.forEach(function (l) {
      if (eu.ids.indexOf(String(l.pessoa_id)) >= 0 && l.conversa_id && l.conversa_id !== "*") saida.leituras.push({ conversa_id: l.conversa_id, lido_ate: l.lido_ate });
    });
    linhas.COM_CIENCIAS.forEach(function (c) { if (eu.ids.indexOf(String(c.pessoa_id)) >= 0) saida.ciencias.push({ aviso_id: c.aviso_id, em: c.em }); });
    if (linhas.COM_AVISOS.length) {
      var ci = comCienciasDe_(ss, eu);
      linhas.COM_AVISOS.forEach(function (a) {
        if (!comAvisoVisivel_(a, eu, sis, agora)) return;
        var t = comAvisoTela_(ss, a, eu, ci, null); t.novo = true;
        (a.tipo === "COMUNICADO" ? saida.comunicados : saida.avisos).push(t);
      });
    }
    relevante = saida.mensagens.length || saida.conversas.length || saida.avisos.length || saida.comunicados.length || saida.leituras.length || saida.ciencias.length;
    if (relevante) {
      var k = comContagens_(ss, eu, sis);
      saida.contagens = k.contagens;
      saida.naoLidas = {};
      Object.keys(k.porConv).forEach(function (id) { saida.naoLidas[id] = k.porConv[id].n; });
    }
    comPresenca_(ss, eu);
    return saida;
  },

  /** Mensagens de uma conversa, das mais novas para trás (paginado por linha). */
  conversa: function (ss, eu, d) {
    var c = comConversas_(ss).filter(function (x) { return x.conversa_id === String(d.conversa_id || ""); })[0];
    if (!comEhMembro_(c, eu)) comFalha_("Conversa não encontrada.");
    var limite = Math.min(Math.max(parseInt(d.limite, 10) || 50, 1), 200);
    var fim = parseInt(d.antes, 10) ? parseInt(d.antes, 10) - 1 : comUltima_(ss, "COM_MENSAGENS");
    var achadas = [], varrido = 0, ini = fim;
    while (fim >= 2 && achadas.length < limite && varrido < 20000) {
      ini = Math.max(2, fim - 499);
      var bloco = comLerLinhas_(ss, "COM_MENSAGENS", ini, fim).filter(function (m) { return m.conversa_id === c.conversa_id; });
      achadas = bloco.concat(achadas);
      varrido += fim - ini + 1;
      fim = ini - 1;
    }
    var mais = fim >= 2;
    if (achadas.length > limite) { achadas = achadas.slice(achadas.length - limite); mais = true; }
    var antes = achadas.length ? achadas[0]._linha : ini;
    return { conversa: comConversaTela_(c, eu, comNomes_(ss)), mensagens: achadas.map(function (m) { return comMsgTela_(ss, m); }), antes: antes, mais: mais && antes > 2,
      lido_ate: comLidoMapa_(ss, eu)[c.conversa_id] || "" };
  },

  enviar: function (ss, eu, d, sis) {
    var c = comConversas_(ss).filter(function (x) { return x.conversa_id === String(d.conversa_id || ""); })[0];
    if (!comEhMembro_(c, eu)) comFalha_("Conversa não encontrada.");
    var bruto = String(d.texto === null || d.texto === undefined ? "" : d.texto);
    var texto = comTexto_(bruto);
    if (!texto) comFalha_("Escreva a mensagem.");
    if (texto.length > COM_MAX_TEXTO) comFalha_("Mensagem muito longa: o limite é " + COM_MAX_TEXTO + " caracteres.");
    var ref = d.ref || {};
    var m = { msg_id: comUuid_(), conversa_id: c.conversa_id, de_pessoa: eu.pessoa_id, de_nome: eu.nome, de_sistema: sis, texto: texto, criado_em: comAgora_(),
      ref_sistema: ref.tipo || ref.id ? (ref.sistema === "COMMAND" || ref.sistema === "SGO" ? ref.sistema : sis) : "", ref_tipo: comTexto_(ref.tipo, 60), ref_id: comTexto_(ref.id, 120),
      ref_codigo: comTexto_(ref.codigo, 60), resposta_a: comTexto_(d.resposta_a, 60) };
    comAppend_(ss, "COM_MENSAGENS", m);
    return { mensagem: comMsgTela_(ss, m) };
  },

  abrirDireta: function (ss, eu, d) {
    var ps = comPessoas_(ss), alvo = comReal_(ps, String(d.pessoa_id || ""));
    var p = ps.filter(function (x) { return x.pessoa_id === alvo && !comMesclada_(x); })[0];
    if (!p) comFalha_("Pessoa não encontrada.");
    if (eu.ids.indexOf(alvo) >= 0) comFalha_("Escolha outra pessoa.");
    var idsOutro = comIdsDe_(ps, alvo);
    var existente = comConversas_(ss).filter(function (c) {
      if (c.tipo !== "DIRETA") return false;
      var m = comMembros_(c);
      return m.some(function (x) { return eu.ids.indexOf(x) >= 0; }) && m.some(function (x) { return idsOutro.indexOf(x) >= 0; });
    })[0];
    if (!existente) {
      var par = [eu.pessoa_id, alvo].sort();
      existente = { conversa_id: "D:" + par.join("|"), tipo: "DIRETA", titulo: "", membros: par.join(","), criado_por: eu.pessoa_id, criado_em: comAgora_() };
      comAppend_(ss, "COM_CONVERSAS", existente);
      delete COM_MEMO_.conversas;
    }
    return { conversa: comConversaTela_(existente, eu, comNomes_(ss)) };
  },

  criarGrupo: function (ss, eu, d) {
    var ps = comPessoas_(ss);
    if (String(d.tipo) === "SETOR") {
      var setor = comTexto_(d.setor || eu.setor, 80);
      if (!setor) comFalha_("Informe o setor.");
      if (comNorm_(setor) !== comNorm_(eu.setor) && !eu.gestao) comFalha_("Só a gestão cria conversa de outro setor.");
      var sid = "S:" + comNorm_(setor);
      var ex = comConversas_(ss).filter(function (c) { return c.conversa_id === sid; })[0];
      if (!ex) {
        ex = { conversa_id: sid, tipo: "SETOR", titulo: "Setor " + setor, membros: "SETOR:" + setor, criado_por: eu.pessoa_id, criado_em: comAgora_() };
        comAppend_(ss, "COM_CONVERSAS", ex); delete COM_MEMO_.conversas;
      }
      return { conversa: comConversaTela_(ex, eu, comNomes_(ss)) };
    }
    var titulo = comTexto_(d.titulo, 80);
    if (!titulo) comFalha_("Dê um nome ao grupo.");
    var ids = {}; ids[eu.pessoa_id] = 1;
    (d.membros || []).forEach(function (id) {
      var r = comReal_(ps, String(id));
      if (ps.some(function (p) { return p.pessoa_id === r && !comMesclada_(p); })) ids[r] = 1;
    });
    if (Object.keys(ids).length < 2) comFalha_("Escolha pelo menos uma pessoa para o grupo.");
    if (Object.keys(ids).length > 200) comFalha_("Grupo grande demais (máx. 200 pessoas).");
    var g = { conversa_id: comUuid_(), tipo: "GRUPO", titulo: titulo, membros: Object.keys(ids).join(","), criado_por: eu.pessoa_id, criado_em: comAgora_() };
    comAppend_(ss, "COM_CONVERSAS", g); delete COM_MEMO_.conversas;
    return { conversa: comConversaTela_(g, eu, comNomes_(ss)) };
  },

  marcarLido: function (ss, eu, d) {
    var id = String(d.conversa_id || "");
    if (id !== "AVISOS" && id !== "COMUNICADOS") {
      var c = comConversas_(ss).filter(function (x) { return x.conversa_id === id; })[0];
      if (!comEhMembro_(c, eu)) comFalha_("Conversa não encontrada.");
    }
    var agora = comAgora_(), ate = String(d.ate || agora);
    if (!/^\d{4}-\d{2}-\d{2}T/.test(ate) || ate > agora) ate = agora;
    var lido = comLidoMapa_(ss, eu);
    if (lido[id] && lido[id] >= ate) return { lido_ate: lido[id] };
    comAppend_(ss, "COM_LEITURAS", { pessoa_id: eu.pessoa_id, conversa_id: id, lido_ate: ate, em: agora });
    lido[id] = ate;
    try { CacheService.getScriptCache().put("COM_LIDO_" + eu.pessoa_id, JSON.stringify(lido), 21600); } catch (e) { }
    return { lido_ate: ate };
  },

  avisos: function (ss, eu, d, sis) {
    var k = comContagens_(ss, eu, sis);
    return { avisos: k.avisos.slice(-100).reverse(), comunicados: k.comunicados.slice(-100).reverse(), contagens: k.contagens };
  },

  ciente: function (ss, eu, d, sis) {
    var id = String(d.aviso_id || ""), agora = comAgora_();
    var a = comCauda_(ss, "COM_AVISOS", COM_JANELA_AVISO * 2).filter(function (x) { return x.aviso_id === id; })[0];
    if (!a || !comParaMim_(a, eu)) comFalha_("Comunicado não encontrado.");
    if (a.tipo !== "COMUNICADO" || !comVerdade_(a.exige_ciencia)) comFalha_("Este comunicado não pede ciência.");
    var ci = comCienciasDe_(ss, eu);
    if (!ci[id]) comAppend_(ss, "COM_CIENCIAS", { aviso_id: id, pessoa_id: eu.pessoa_id, em: agora, sistema: sis });
    return { aviso_id: id, em: ci[id] || agora };
  },

  publicarComunicado: function (ss, eu, d, sis) {
    if (!eu.gestao) comFalha_("Só a administração ou a gestão publica comunicados.");
    var titulo = comTexto_(d.titulo, 140), texto = comTexto_(d.texto);
    if (!titulo) comFalha_("Informe o título do comunicado.");
    if (!texto) comFalha_("Escreva o comunicado.");
    if (texto.length > COM_MAX_TEXTO) comFalha_("Comunicado muito longo: o limite é " + COM_MAX_TEXTO + " caracteres.");
    var para = String(d.para || "TODOS");
    if (para !== "TODOS") {
      if (para.indexOf("SETOR:") !== 0 || !comTexto_(para.slice(6))) comFalha_("Destino inválido (TODOS ou SETOR:nome).");
      para = "SETOR:" + comTexto_(para.slice(6), 80);
    }
    var expira = "";
    if (d.expira_em) { var x = new Date(d.expira_em); if (isNaN(x.getTime())) comFalha_("Data de validade inválida."); expira = x.toISOString(); }
    var a = { aviso_id: comUuid_(), origem_sistema: sis, para: para, titulo: titulo, texto: texto, prioridade: comPrioridade_(d.prioridade), tipo: "COMUNICADO",
      exige_ciencia: !!comVerdade_(d.exige_ciencia), ref_sistema: "", ref_tipo: "", ref_id: "", ref_codigo: "", criado_por: eu.nome, criado_em: comAgora_(), expira_em: expira };
    comAppend_(ss, "COM_AVISOS", a);
    return { aviso: comAvisoTela_(ss, a, eu, {}, null) };
  },

  /** Diretório: quem é quem, em qual sistema, visto por último. */
  pessoas: function (ss, eu) {
    var ps = comPessoas_(ss), visto = {};
    var marca = function (id, em) { var r = comReal_(ps, String(id)); if (em && (!visto[r] || String(em) > visto[r])) visto[r] = String(em); };
    comCauda_(ss, "COM_LEITURAS", COM_JANELA_LEIT).forEach(function (l) { marca(l.pessoa_id, l.em); });
    comCauda_(ss, "COM_MENSAGENS", COM_JANELA_MSG).forEach(function (m) { marca(m.de_pessoa, m.criado_em); });
    var lista = ps.filter(function (p) { return !comMesclada_(p) && (String(p.ativo) === "SIM" || eu.admin); }).map(function (p) {
      var o = { pessoa_id: p.pessoa_id, nome: p.nome, setor: p.setor, cmd: !!p.cmd_id, sgo: !!p.sgo_id, ativo: String(p.ativo) === "SIM", visto_em: visto[p.pessoa_id] || "", eu: p.pessoa_id === eu.pessoa_id };
      if (eu.admin) { o.cmd_login = p.cmd_login; o.sgo_login = p.sgo_login; o.vinculo = p.vinculo; o.criado_em = p.criado_em; }
      return o;
    }).sort(function (a, b) { return comNorm_(a.nome).localeCompare(comNorm_(b.nome)); });
    var setores = {}; lista.forEach(function (p) { if (p.setor) setores[p.setor] = 1; });
    return { pessoas: lista, setores: Object.keys(setores).sort() };
  },

  /** Admin: { a, b } junta duas pessoas (uma do COMMAND, outra do SGO+); { desvincular: pessoa_id } separa. */
  vincular: function (ss, eu, d) {
    var trava = null;
    try { trava = LockService.getScriptLock(); trava.waitLock(20000); } catch (e) { trava = null; }
    try {
      delete COM_MEMO_.pessoas;
      var ps = comPessoas_(ss), acha = function (id) { return ps.filter(function (p) { return p.pessoa_id === String(id || "") && !comMesclada_(p); })[0]; };
      if (d.desvincular) {
        var p = acha(d.desvincular);
        if (!p) comFalha_("Pessoa não encontrada.");
        if (!p.cmd_id || !p.sgo_id) comFalha_("Esta pessoa não está vinculada aos dois sistemas.");
        var agora = comAgora_();
        var nova = { pessoa_id: comUuid_(), nome: p.nome, setor: p.setor, cmd_id: "", cmd_login: "", sgo_id: p.sgo_id, sgo_login: p.sgo_login, ativo: "SIM", criado_em: agora, atualizado_em: agora, vinculo: "MANUAL" };
        comGravarPessoa_(ss, p, { sgo_id: "", sgo_login: "", vinculo: "MANUAL" });
        comAppend_(ss, "COM_PESSOAS", nova);
        delete COM_MEMO_.pessoas;
        return { pessoa: p.pessoa_id, nova: nova.pessoa_id };
      }
      var a = acha(d.a), b = acha(d.b);
      if (!a || !b || a === b) comFalha_("Escolha duas pessoas diferentes.");
      if ((a.cmd_id && b.cmd_id) || (a.sgo_id && b.sgo_id)) comFalha_("As duas pessoas já usam o mesmo sistema: escolha uma do COMMAND e uma do SGO+.");
      var w = comMesclar_(ss, a, b, true);
      delete COM_MEMO_.pessoas;
      return { pessoa: w.pessoa_id };
    } finally { if (trava) try { trava.releaseLock(); } catch (e) { } }
  },

  sincronizarPessoas: function (ss) { return { resultado: comSincronizarNucleo_(ss) }; },

  status: function (ss) {
    var linhas = {};
    Object.keys(COM_TABS).forEach(function (t) { linhas[t] = Math.max(0, comUltima_(ss, t) - 1); });
    var cfg = comConfigMapa_(ss), conf = {};
    Object.keys(cfg).forEach(function (k) { conf[k] = { valor: k === "sgo_db_id" ? String(cfg[k].valor).slice(0, 6) + "…" : cfg[k].valor, sistema: cfg[k].sistema, atualizado_em: cfg[k].atualizado_em }; });
    return { banco: { id: ss.getId(), url: ss.getUrl ? ss.getUrl() : "", nome: COM_NOME_DB }, linhas: linhas, config: conf };
  }
};

/* ======================================================================
 * avisos automáticos (para os sistemas chamarem no servidor)
 * ====================================================================== */

/**
 * Publica um aviso automático deste sistema (aparece no balão do OUTRO sistema).
 * d = { para_usuario_id (usuário DESTE sistema) | para: "TODOS"|"SETOR:x", titulo, texto, prioridade, ref: { tipo, id, codigo } }
 * NUNCA lança erro (aviso não pode quebrar o fluxo principal) e não cria o banco.
 */
function comPublicarAviso_(d) {
  try {
    d = d || {};
    if (!COM_MEMO_.ss || !COM_MEMO_.em || Date.now() - COM_MEMO_.em > 20000) COM_MEMO_ = { em: Date.now() };
    var ss = comBanco_(false);
    if (!ss) return { ok: false, erro: "SEM_BANCO" };
    var ad = comAdaptador_(), sis = ad.sistema, para = "";
    if (d.para_usuario_id) {
      var pr = comPref_(sis), uid = String(d.para_usuario_id);
      var acha = function () { return comPessoas_(ss).filter(function (p) { return !comMesclada_(p) && String(p[pr + "_id"]) === uid; })[0]; };
      var p = acha();
      if (!p) { comSincronizarNucleo_(ss); delete COM_MEMO_.pessoas; p = acha(); }
      if (!p) return { ok: false, erro: "PESSOA_NAO_ENCONTRADA" };
      para = p.pessoa_id;
    } else {
      para = String(d.para || "");
      if (para !== "TODOS" && para.indexOf("SETOR:") !== 0) return { ok: false, erro: "DESTINO" };
    }
    var titulo = comTexto_(d.titulo, 140), texto = comTexto_(d.texto, COM_MAX_TEXTO);
    if (!titulo && !texto) return { ok: false, erro: "VAZIO" };
    var ref = d.ref || {};
    var a = { aviso_id: comUuid_(), origem_sistema: sis, para: para, titulo: titulo || texto.slice(0, 80), texto: texto, prioridade: comPrioridade_(d.prioridade), tipo: "AVISO",
      exige_ciencia: false, ref_sistema: ref.tipo || ref.id ? sis : "", ref_tipo: comTexto_(ref.tipo, 60), ref_id: comTexto_(ref.id, 120), ref_codigo: comTexto_(ref.codigo, 60),
      criado_por: "sistema", criado_em: comAgora_(), expira_em: d.expira_em || "" };
    comAppend_(ss, "COM_AVISOS", a);
    return { ok: true, aviso_id: a.aviso_id };
  } catch (e) {
    comLog_("comPublicarAviso_: " + (e && e.message || e));
    return { ok: false, erro: "FALHA" };
  }
}
