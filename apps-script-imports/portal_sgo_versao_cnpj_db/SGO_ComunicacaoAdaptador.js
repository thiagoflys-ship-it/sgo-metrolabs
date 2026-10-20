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
 *  - o SGO+ não cria a planilha compartilhada: espera o COMMAND criar;
 *  - área (20/10/2026): CAD_USUARIOS.AREA (código de CAD_AREAS) vai para COM_PESSOAS.area/area_nome — é o que decide
 *    quem está na conversa de área; o SGO+ é a fonte (o COMMAND nunca mexe na área).
 */

var SGO_COM_SETORES = { ADMIN: "Administração", DIRETORIA: "Diretoria", GESTOR: "Gestão", TECNICO: "Técnico", METROLOGIA: "Metrologia", COMERCIAL: "Comercial", FINANCEIRO: "Financeiro", RH: "RH" };

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

/**
 * CAD_USUARIOS e CAD_AREAS lidos uma vez por execução: { porId: { id: { area, area_nome } }, temArea }.
 * Sem a coluna AREA (base antiga), temArea = false e a área não é informada (fica como está).
 */
function sgoComCadastro_() {
  if (COM_MEMO_.sgoCad) return COM_MEMO_.sgoCad;
  var r = { porId: {}, temArea: false };
  try {
    var ss = SpreadsheetApp.openById(SGO_CFG.DB_ID);
    var nomes = {}, sa = ss.getSheetByName((SGO_CFG.SHEETS && SGO_CFG.SHEETS.CAD_AREAS) || "CAD_AREAS");
    if (sa && sa.getLastRow() >= 2) {
      var va = sa.getRange(1, 1, sa.getLastRow(), Math.max(1, sa.getLastColumn())).getValues(), ha = va[0].map(function (h) { return String(h || "").trim().toUpperCase(); });
      var cC = ha.indexOf("CODIGO"), cN = ha.indexOf("NOME");
      if (cC >= 0) for (var i = 1; i < va.length; i++) { var cod = sgoComCodigoArea_(va[i][cC]); if (cod) nomes[cod] = String(cN >= 0 ? va[i][cN] || "" : "").trim() || cod; }
    }
    var sh = ss.getSheetByName((SGO_CFG.SHEETS && SGO_CFG.SHEETS.CAD_USUARIOS) || "CAD_USUARIOS");
    if (sh && sh.getLastRow() >= 2) {
      var v = sh.getRange(1, 1, sh.getLastRow(), Math.max(1, sh.getLastColumn())).getValues(), h = v[0].map(function (x) { return String(x || "").trim().toUpperCase(); });
      var cId = h.indexOf("ID") >= 0 ? h.indexOf("ID") : 0, cAr = h.indexOf("AREA");
      r.temArea = cAr >= 0;
      for (var j = 1; j < v.length; j++) {
        var id = String(v[j][cId] || "").trim();
        if (!id) continue;
        var ar = cAr >= 0 ? sgoComCodigoArea_(v[j][cAr]) : "";
        r.porId[id] = { area: ar, area_nome: ar ? (nomes[ar] || ar) : "" };
      }
    }
  } catch (e) { r = { porId: {}, temArea: false }; }
  COM_MEMO_.sgoCad = r;
  return r;
}

/** "Técnica " → "TECNICA" (o mesmo código de CAD_AREAS). */
function sgoComCodigoArea_(v) {
  var s = String(v === null || v === undefined ? "" : v).trim().toUpperCase();
  try { s = s.normalize("NFD").replace(/[\u0300-\u036f]/g, ""); } catch (e) { }
  return s.replace(/[^A-Z0-9_]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 40);
}

/** Acrescenta area/area_nome ao usuário (só quando a base tem a coluna AREA). */
function sgoComComArea_(o) {
  var cad = sgoComCadastro_();
  if (!cad.temArea) return o;
  var x = cad.porId[String(o.id)] || { area: "", area_nome: "" };
  o.area = x.area; o.area_nome = x.area_nome;
  return o;
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
  return sgoComComArea_({ id: id, login: String(data.usuario || ""), nome: String(data.nome || data.usuario || ""), setor: sgoComSetor_(perfil),
    // gestão = os mesmos perfis de isAdminPerfilAuth_ (SGO_Auth.js); antes a Diretoria ficava de fora.
    admin: perfil === "ADMIN", gestao: perfil === "ADMIN" || perfil === "GESTOR" || perfil === "DIRETORIA" });
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
    out.push(sgoComComArea_({ id: id, login: String(l[cUs] || "").trim(), nome: String(l[cNome] || l[cUs] || "").trim(), setor: sgoComSetor_(perfil) }));
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
  // Rotina do gatilho: recusada quando chamada pelo navegador (SGO_Main.js SGO_execucaoInterna_).
  if (!SGO_execucaoInterna_()) return { ok: false, message: "Rotina interna: roda só pelo gatilho diário." };
  return comSincronizarPessoas_();
}

/**
 * Instala as rotinas da Comunicação (uma vez; pode rodar de novo): pessoas às 07h e, desde 20/10/2026, a ponte com o
 * WhatsApp a cada 5 min (SGO_comWhatsappRodada, SGO_ComunicacaoWhatsapp.js: não envia nada com a ponte desligada).
 */
function SGO_comInstalarGatilho() {
  var gat = ScriptApp.getProjectTriggers();
  var existe = function (fn) { return gat.some(function (t) { return t.getHandlerFunction() === fn; }); };
  if (!existe("SGO_comSincronizarPessoasDiario")) ScriptApp.newTrigger("SGO_comSincronizarPessoasDiario").timeBased().everyDays(1).atHour(7).create();
  if (typeof SGO_comWhatsappRodada === "function" && !existe("SGO_comWhatsappRodada")) ScriptApp.newTrigger("SGO_comWhatsappRodada").timeBased().everyMinutes(5).create();
  return SGO_comSincronizarPessoasDiario();
}
