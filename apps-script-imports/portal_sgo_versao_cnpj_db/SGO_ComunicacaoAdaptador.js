/**
 * Adaptador da Comunicação compartilhada — lado SGO+.
 * Vai para o projeto do SGO+ junto com Comunicacao.js (idêntico ao do COMMAND) e
 * ComunicacaoWidget.html. Não depende de nada do COMMAND.
 *
 *  - sessão: lê a sessão do SGO+ SEM renová-la (o balão consulta a cada 25 s e não
 *    pode manter viva uma sessão parada); se as funções internas não existirem, usa validarSessao();
 *  - usuários: CAD_USUARIOS (ID, USUARIO, NOME, PERFIL, STATUS, CLIENTE_ID) do banco SGO_CFG.DB_ID;
 *  - usuários do Portal do Cliente (perfil CLIENTE ou CLIENTE_ID preenchido) NÃO entram na Comunicação;
 *  - admin = perfil ADMIN; gestão = ADMIN ou GESTOR;
 *  - o SGO+ não cria a planilha compartilhada: espera o COMMAND criar.
 */

var SGO_COM_SETORES = { ADMIN: "Administração", GESTOR: "Gestão", TECNICO: "Técnico", METROLOGIA: "Metrologia", COMERCIAL: "Comercial", FINANCEIRO: "Financeiro" };

function comAdaptador_() {
  var url = "";
  try { url = ScriptApp.getService().getUrl() || ""; } catch (e) { url = ""; }
  return { sistema: "SGO", podeCriarBanco: false, urlSistema: url };
}

function sgoComSetor_(perfil) {
  var p = String(perfil || "").trim().toUpperCase();
  return SGO_COM_SETORES[p] || (p ? p.charAt(0) + p.slice(1).toLowerCase() : "");
}

function sgoComEhCliente_(perfil, clienteId) {
  return String(perfil || "").trim().toUpperCase() === "CLIENTE" || !!String(clienteId || "").trim();
}

/** sessionId do SGO+ → usuário da Comunicação. Lança "SESSAO" / "SEM_ACESSO". */
function comUsuarioDoToken_(token) {
  var sid = String(token || "").trim(), data = null;
  if (!sid) throw new Error("COM: SESSAO");
  if (typeof lerSessaoAuth_ === "function" && typeof sessaoExpiradaAuth_ === "function") {
    data = lerSessaoAuth_(sid);
    if (!data || sessaoExpiradaAuth_(data)) throw new Error("COM: SESSAO");
  } else {
    var r = validarSessao(sid);
    if (!r || !r.valid || !r.data) throw new Error("COM: SESSAO");
    data = r.data;
  }
  var perfil = String(data.perfil || "").trim().toUpperCase();
  if (sgoComEhCliente_(perfil, data.clienteId)) throw new Error("COM: SEM_ACESSO");
  if (data.status && String(data.status).toUpperCase() !== "ATIVO") throw new Error("COM: SESSAO");
  var id = String(data.userId || data.id || "").trim();
  if (!id) throw new Error("COM: SESSAO");
  return { id: id, login: String(data.usuario || ""), nome: String(data.nome || data.usuario || ""), setor: sgoComSetor_(perfil),
    admin: perfil === "ADMIN", gestao: perfil === "ADMIN" || perfil === "GESTOR" };
}

/** Usuários ativos do SGO+ (sem os do Portal do Cliente). */
function comUsuariosAtivos_() {
  var ss = SpreadsheetApp.openById(SGO_CFG.DB_ID);
  var sh = ss.getSheetByName((SGO_CFG.SHEETS && SGO_CFG.SHEETS.CAD_USUARIOS) || "CAD_USUARIOS");
  if (!sh) return [];
  var ult = sh.getLastRow(), uc = sh.getLastColumn();
  if (ult < 2 || uc < 1) return [];
  var vals = sh.getRange(1, 1, ult, uc).getValues();
  var head = vals[0].map(function (h) { return String(h || "").trim().toUpperCase(); });
  var col = function (n, padrao) { var i = head.indexOf(n); return i >= 0 ? i : padrao; };
  var cId = col("ID", 0), cUs = col("USUARIO", 1), cNome = col("NOME", 3), cPerfil = col("PERFIL", 4), cStatus = col("STATUS", 5), cCli = col("CLIENTE_ID", 7);
  var out = [];
  for (var i = 1; i < vals.length; i++) {
    var l = vals[i], id = String(l[cId] || "").trim();
    if (!id) continue;
    if (String(l[cStatus] || "").trim().toUpperCase() !== "ATIVO") continue;
    var perfil = String(l[cPerfil] || "").trim().toUpperCase();
    if (sgoComEhCliente_(perfil, l[cCli])) continue;
    out.push({ id: id, login: String(l[cUs] || "").trim(), nome: String(l[cNome] || l[cUs] || "").trim(), setor: sgoComSetor_(perfil) });
  }
  return out;
}

/** O SGO+ ainda não abre registro por link: leva para o portal. */
function comLinkRegistro_(ref) {
  return comAdaptador_().urlSistema;
}

/** Chaves que o SGO+ publica em COM_CONFIG (sgo_url e sgo_link o núcleo já grava). */
function comAdaptadorConfigExtra_() {
  var id = "";
  try { id = String(SGO_CFG.DB_ID || ""); } catch (e) { id = ""; }
  return { sgo_db_id: id };
}

/** Rotina diária do SGO+ (instale com SGO_comInstalarGatilho uma vez no editor). */
function SGO_comSincronizarPessoasDiario() {
  return comSincronizarPessoas_();
}

function SGO_comInstalarGatilho() {
  var existe = ScriptApp.getProjectTriggers().some(function (t) { return t.getHandlerFunction() === "SGO_comSincronizarPessoasDiario"; });
  if (!existe) ScriptApp.newTrigger("SGO_comSincronizarPessoasDiario").timeBased().everyDays(1).atHour(7).create();
  return SGO_comSincronizarPessoasDiario();
}
