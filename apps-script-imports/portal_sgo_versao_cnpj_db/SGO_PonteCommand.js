/**
 * PONTE COMMAND → SGO+ (arquivo novo do SGO+; não altera nenhuma tela nem regra existente).
 * O COMMAND pede e o PRÓPRIO SGO+ grava, usando as regras dele (SGO_DATA: validação de vínculo,
 * cadastro único, CNPJ como texto, trava e log). Assim cliente/unidade/equipamento criados no COMMAND
 * (ex.: o comercial cadastra um cliente para orçar) existem no SGO+ na mesma hora, com o mesmo ID ligando os dois.
 *
 * Segurança: cada chamada vem assinada (HMAC-SHA256) com o segredo compartilhado "ponte_segredo"
 * (planilha "METROLABS — Comunicação", só acessível à conta dona dos dois sistemas) ou a propriedade
 * PONTE_COMMAND_SEGREDO; carimbo de tempo de no máximo 5 minutos. Sem segredo configurado, recusa tudo.
 */

var PONTE_CMD_JANELA_MS = 5 * 60 * 1000;

function doPost(e) {
  var out;
  try {
    var req = JSON.parse((e && e.postData && e.postData.contents) || "{}");
    out = PonteCmd_tratar_(req);
  } catch (err) {
    out = { ok: false, erro: String((err && err.message) || err).slice(0, 500) };
  }
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
}

function PonteCmd_segredo_() {
  var p = PropertiesService.getScriptProperties().getProperty("PONTE_COMMAND_SEGREDO");
  if (p) return p;
  try { return typeof comConfigLer_ === "function" ? (comConfigLer_("ponte_segredo") || "") : ""; } catch (e) { return ""; }
}

function PonteCmd_hex_(bytes) {
  return bytes.map(function (b) { var v = b < 0 ? b + 256 : b; return (v < 16 ? "0" : "") + v.toString(16); }).join("");
}

function PonteCmd_assinatura_(segredo, ts, acao, dados) {
  return PonteCmd_hex_(Utilities.computeHmacSha256Signature(String(ts) + "|" + acao + "|" + JSON.stringify(dados || {}), segredo));
}

function PonteCmd_iguais_(a, b) {
  a = String(a || ""); b = String(b || "");
  if (a.length !== b.length) return false;
  var d = 0;
  for (var i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

function PonteCmd_tratar_(req) {
  var segredo = PonteCmd_segredo_();
  if (!segredo) return { ok: false, erro: "Ponte COMMAND não configurada no SGO+." };
  var ts = Number(req.ts || 0);
  if (!ts || Math.abs(Date.now() - ts) > PONTE_CMD_JANELA_MS) return { ok: false, erro: "Pedido expirado." };
  if (!PonteCmd_iguais_(PonteCmd_assinatura_(segredo, ts, String(req.acao || ""), req.dados), req.assinatura)) return { ok: false, erro: "Assinatura inválida." };
  var d = req.dados || {}, quem = "COMMAND:" + String(req.usuario || "sistema").slice(0, 60);
  switch (String(req.acao)) {
    case "ping": return { ok: true, sistema: "SGO+", agora: new Date().toISOString() };
    case "cliente.criar": return PonteCmd_clienteCriar_(d, quem);
    case "cliente.atualizar": return PonteCmd_atualizar_(SGO_CFG.SHEETS.CAD_CLIENTES, d.ID, PonteCmd_cliente_(d), quem, "CLIENTES");
    case "unidade.criar": return PonteCmd_unidadeCriar_(d, quem);
    case "unidade.atualizar": var u = PonteCmd_unidade_(d); delete u.CLIENTE_ID; return PonteCmd_atualizar_(SGO_CFG.SHEETS.CAD_UNIDADES, d.ID, u, quem, "UNIDADES");
    case "equipamento.criar": return PonteCmd_equipCriar_(d, quem);
    case "equipamento.atualizar": var q = PonteCmd_equip_(d); delete q.CLIENTE_ID; delete q.UNIDADE_ID; return PonteCmd_atualizar_(SGO_CFG.SHEETS.CAD_EQUIPAMENTOS, d.ID, q, quem, "EQUIPAMENTOS");
  }
  return { ok: false, erro: "Ação desconhecida." };
}

/* ----- normalização igual às telas do SGO+ (SGO_Clientes / SGO_Unidades / SGO_Equipamentos) ----- */
function PonteCmd_soPreenchidos_(o) {
  var r = {};
  Object.keys(o).forEach(function (k) { if (o[k] !== "" && o[k] !== null && o[k] !== undefined) r[k] = o[k]; });
  return r;
}
function PonteCmd_cliente_(p) {
  return PonteCmd_soPreenchidos_({ RAZAO_SOCIAL: SGO_UTILS.safeUpper(p.RAZAO_SOCIAL), NOME_FANTASIA: SGO_UTILS.safeUpper(p.NOME_FANTASIA), CNPJ: SGO_UTILS.normalizeCnpj(p.CNPJ),
    ENDERECO: SGO_UTILS.safeUpper(p.ENDERECO), CONTATO: SGO_UTILS.safeUpper(p.CONTATO), EMAIL: SGO_UTILS.safeLower(p.EMAIL), TELEFONE: SGO_UTILS.onlyDigits(p.TELEFONE) });
}
function PonteCmd_unidade_(p) {
  return PonteCmd_soPreenchidos_({ CLIENTE_ID: SGO_UTILS.safe(p.CLIENTE_ID), NOME_UNIDADE: SGO_UTILS.safeUpper(p.NOME_UNIDADE), CNPJ_UNIDADE: SGO_UTILS.normalizeCnpj(p.CNPJ_UNIDADE),
    ENDERECO: SGO_UTILS.safeUpper(p.ENDERECO), CIDADE: SGO_UTILS.safeUpper(p.CIDADE), UF: SGO_UTILS.safeUpper(p.UF), RESPONSAVEL: SGO_UTILS.safeUpper(p.RESPONSAVEL), TELEFONE: SGO_UTILS.onlyDigits(p.TELEFONE) });
}
function PonteCmd_equip_(p) {
  return PonteCmd_soPreenchidos_({ CLIENTE_ID: SGO_UTILS.safe(p.CLIENTE_ID), UNIDADE_ID: SGO_UTILS.safe(p.UNIDADE_ID), TIPO: SGO_UTILS.safeUpper(p.TIPO), FABRICANTE: SGO_UTILS.safeUpper(p.FABRICANTE),
    MODELO: SGO_UTILS.safeUpper(p.MODELO), SERIE: SGO_UTILS.safeUpper(p.SERIE), TAG: SGO_UTILS.safeUpper(p.TAG), SETOR: SGO_UTILS.safeUpper(p.SETOR) });
}

function PonteCmd_ativo_(sheet, id) {
  var r = id ? SGO_DATA.getById(sheet, id) : null;
  return r && SGO_UTILS.safeUpper(r.STATUS) !== "INATIVO" ? r : null;
}

function PonteCmd_clienteCriar_(p, quem) {
  var d = PonteCmd_cliente_(p);
  if (!d.RAZAO_SOCIAL) return { ok: false, erro: "Razão social é obrigatória." };
  if (d.EMAIL && !SGO_UTILS.isEmail(d.EMAIL)) delete d.EMAIL;
  if (d.CNPJ && !SGO_UTILS.isCnpj(d.CNPJ)) return { ok: false, erro: "O CNPJ informado não é válido no SGO+." };
  // idempotente: mesmo CNPJ já cadastrado → devolve o existente (vincula em vez de duplicar)
  if (d.CNPJ) {
    var ja = SGO_DATA.getAll(SGO_CFG.SHEETS.CAD_CLIENTES).filter(function (r) { return SGO_UTILS.normalizeCnpj(r.CNPJ) === d.CNPJ; })[0];
    if (ja) return { ok: true, id: ja.ID, existente: true };
  }
  var reg = SGO_DATA.gerarRegistroBase(Object.assign({ STATUS: "ATIVO" }, d));
  SGO_DATA.insert(SGO_CFG.SHEETS.CAD_CLIENTES, reg);
  SGO_DATA.log("CLIENTES_CRIAR", quem, "Cliente criado pelo COMMAND: " + d.RAZAO_SOCIAL, "CLIENTES");
  return { ok: true, id: reg.ID };
}

function PonteCmd_unidadeCriar_(p, quem) {
  var d = PonteCmd_unidade_(p);
  if (!d.NOME_UNIDADE) return { ok: false, erro: "Nome da unidade é obrigatório." };
  if (!PonteCmd_ativo_(SGO_CFG.SHEETS.CAD_CLIENTES, d.CLIENTE_ID)) return { ok: false, erro: "Cliente não encontrado (ou inativo) no SGO+." };
  var ja = SGO_DATA.getAll(SGO_CFG.SHEETS.CAD_UNIDADES).filter(function (r) { return String(r.CLIENTE_ID) === d.CLIENTE_ID && SGO_UTILS.safeUpper(r.NOME_UNIDADE) === d.NOME_UNIDADE; })[0];
  if (ja) return { ok: true, id: ja.ID, existente: true };
  var reg = SGO_DATA.gerarRegistroBase(Object.assign({ STATUS: "ATIVO" }, d));
  SGO_DATA.insert(SGO_CFG.SHEETS.CAD_UNIDADES, reg);
  SGO_DATA.log("UNIDADES_CRIAR", quem, "Unidade criada pelo COMMAND: " + d.NOME_UNIDADE, "UNIDADES");
  return { ok: true, id: reg.ID };
}

function PonteCmd_equipCriar_(p, quem) {
  var d = PonteCmd_equip_(p);
  if (!d.TIPO) return { ok: false, erro: "Tipo do equipamento é obrigatório." };
  if (!PonteCmd_ativo_(SGO_CFG.SHEETS.CAD_CLIENTES, d.CLIENTE_ID)) return { ok: false, erro: "Cliente não encontrado (ou inativo) no SGO+." };
  if (d.UNIDADE_ID && !PonteCmd_ativo_(SGO_CFG.SHEETS.CAD_UNIDADES, d.UNIDADE_ID)) return { ok: false, erro: "Unidade não encontrada (ou inativa) no SGO+." };
  if (d.SERIE) {
    var ja = SGO_DATA.getAll(SGO_CFG.SHEETS.CAD_EQUIPAMENTOS).filter(function (r) { return String(r.CLIENTE_ID) === d.CLIENTE_ID && SGO_UTILS.safeUpper(r.SERIE) === d.SERIE &&
      SGO_UTILS.safeUpper(r.FABRICANTE) === (d.FABRICANTE || "") && SGO_UTILS.safeUpper(r.MODELO) === (d.MODELO || ""); })[0];
    if (ja) return { ok: true, id: ja.ID, existente: true };
  }
  var reg = SGO_DATA.gerarRegistroBase(Object.assign({ STATUS: "ATIVO", QR_TOKEN: SGO_UTILS.uuid() }, d));
  SGO_DATA.insert(SGO_CFG.SHEETS.CAD_EQUIPAMENTOS, reg);
  SGO_DATA.log("EQUIPAMENTOS_CRIAR", quem, "Equipamento criado pelo COMMAND TAG=" + (d.TAG || "") + " SERIE=" + (d.SERIE || ""), "EQUIPAMENTOS");
  return { ok: true, id: reg.ID };
}

function PonteCmd_atualizar_(sheet, id, campos, quem, modulo) {
  if (!id || !SGO_DATA.getById(sheet, id)) return { ok: false, erro: "Registro não encontrado no SGO+." };
  if (!Object.keys(campos).length) return { ok: true, id: id, nada: true };
  SGO_DATA.update(sheet, id, campos);
  SGO_DATA.log(modulo + "_ATUALIZAR", quem, "Atualizado pelo COMMAND: " + id, modulo);
  return { ok: true, id: id };
}
