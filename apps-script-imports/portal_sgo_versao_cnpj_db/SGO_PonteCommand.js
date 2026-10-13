/**
 * PONTE COMMAND → SGO+ (arquivo novo do SGO+; não altera nenhuma tela nem regra existente).
 * O COMMAND pede e o PRÓPRIO SGO+ grava, usando as regras dele (SGO_DATA: validação de vínculo,
 * cadastro único, CNPJ como texto, trava e log). Assim cliente/unidade/equipamento criados no COMMAND
 * (ex.: o comercial cadastra um cliente para orçar) existem no SGO+ na mesma hora, com o mesmo ID ligando os dois.
 *
 * Segurança: cada chamada vem assinada (HMAC-SHA256) com o segredo compartilhado "ponte_segredo"
 * (planilha "METROLABS — Comunicação", só acessível à conta dona dos dois sistemas) ou a propriedade
 * PONTE_COMMAND_SEGREDO; carimbo de tempo de no máximo 5 minutos. Sem segredo configurado, recusa tudo.
 *
 * Ações SÓ DE LEITURA para o Prontuário do equipamento no COMMAND (sem log, sem gravar nada, limite de linhas,
 * cada aba em try/catch — aba inexistente é ignorada):
 *   docs.equipamento { equipamento_id_sgo, cliente_id_sgo, serie, tag } → documentos emitidos para o equipamento
 *   docs.desde       { desde_iso, limite }                               → documentos criados desde a data (sincronização)
 * Abas e colunas usadas (onde o SGO+ registra o que emite por equipamento):
 *   CERT_CALIBRACAO (Certificado de Calibração): ID, NUMERO_CERTIFICADO, CLIENTE_ID, EQUIPAMENTO_ID, DATA_CALIBRACAO,
 *     DATA_EMISSAO (dd/MM/yyyy), DATA_VALIDADE (hoje sempre vazio) + DADOS_JSON.proximaCalibracao.data, LINK_PDF_CERTIFICADO,
 *     LINK_PDF_RELATORIO_INTERPRETATIVO, STATUS (ATIVO), CRIADO_EM
 *   NR13_LAUDOS (Laudo NR-13): ID, NUMERO_LAUDO, CLIENTE_ID, EQUIPAMENTO_ID, NUMERO_SERIE, TIPO_INSPECAO, DATA_TERMINO_INSPECAO,
 *     DATA_PROXIMA_INSPECAO, VEREDITO, STATUS (só EMITIDO; RASCUNHO fica de fora), LINK_PDF, CRIADO_EM
 *   DOC_DOCUMENTOS (documentos por equipamento — inclui Relatório de Calibração "vinculado", relatórios de manutenção/
 *     qualificação, OS e as cópias que CertCal/NR-13 registram): ID, CLIENTE_ID, EQUIPAMENTO_ID, TIPO_DOCUMENTO, NOME_ARQUIVO,
 *     LINK_ARQUIVO, DATA_EMISSAO, DATA_VENCIMENTO, STATUS (ATIVO/PENDENTE; INATIVO fica de fora), CRIADO_EM
 *     (linha com o mesmo link de um certificado/laudo acima não se repete)
 *   CAD_EQUIPAMENTOS: ID, CLIENTE_ID, SERIE, TAG (achar o equipamento quando o COMMAND só tem série/TAG)
 * Declaração/QI-QO, Relatório de Calibração (sem vincular), Autoclave, Lavadora, Cadeia de Frio e Estufa/Banho NÃO gravam
 * linha no banco do SGO+ (só arquivo no Drive ou HTML) — por isso não aparecem até serem registrados em DOC_DOCUMENTOS.
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
  var s = "";
  try { s = typeof comConfigLer_ === "function" ? (comConfigLer_("ponte_segredo") || "") : ""; } catch (e) { s = ""; }
  // vale a primeira chave recebida: fica gravada aqui e quem editar a planilha depois não troca a chave da ponte
  if (s) { try { PropertiesService.getScriptProperties().setProperty("PONTE_COMMAND_SEGREDO", s); } catch (e) { } }
  return s;
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
    case "alertas.padroes": return PonteCmd_alertasPadroes_();
    case "alertas.painel": return PonteCmd_alertasPainel_();
    case "docs.equipamento": return PonteCmd_docsEquipamento_(d);
    case "docs.desde": return PonteCmd_docsDesde_(d);
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

/**
 * Mesmos alertas de padrões de calibração que o SGO+ mostra em balão (SGO_AlertasPadroes.js: mesma configuração
 * e mesma classificação de validade), para o COMMAND mostrar também. Só leitura.
 */
function PonteCmd_alertasPadroes_() {
  if (typeof AlertasPadroes_config_ !== "function" || typeof CertCal_classificarValidadePadrao_ !== "function" || !SGO_CFG.SHEETS.CAD_PADROES)
    return { ok: true, disponivel: false };
  var config = AlertasPadroes_config_();
  var lista = [], vencidos = 0, invalidos = 0, vencendo = 0;
  SGO_DATA.getAll(SGO_CFG.SHEETS.CAD_PADROES).forEach(function (p) {
    if (SGO_UTILS.safeUpper(p.STATUS) !== "ATIVO") return;
    var v = CertCal_classificarValidadePadrao_(p.VALIDADE), sit = "";
    if (v.diasRestantes === null) { invalidos++; sit = "SEM_VALIDADE"; }
    else if (Number(v.diasRestantes) < 0) { vencidos++; sit = "VENCIDO"; }
    else if (Number(v.diasRestantes) <= config.antecedenciaDias) { vencendo++; sit = "VENCENDO"; }
    if (sit && lista.length < 30) lista.push({ codigo: String(p.CODIGO || p.TAG || p.ID || ""), descricao: String(p.DESCRICAO || p.NOME || p.INSTRUMENTO || ""), validade: String(p.VALIDADE || ""), dias: v.diasRestantes, situacao: sit });
  });
  return { ok: true, disponivel: true, ativo: !!config.ativo, perfis: config.perfis || [], antecedenciaDias: config.antecedenciaDias,
    resumo: { total: vencidos + invalidos + vencendo, vencidos: vencidos, vencendo: vencendo, invalidos: invalidos },
    critico: !!config.alertaCriticoAtivo && (vencidos > 0 || invalidos > 0), mensagem: config.mensagem || "", lista: lista, em: new Date().toISOString() };
}

/**
 * Os mesmos avisos do painel do SGO+ (SGO_Alertas.js: documentos vencendo/vencidos, padrões de referência e frota),
 * na visão interna (sem trava de cliente), mesmo cálculo e mesmas mensagens. Só leitura, sem log (o COMMAND consulta a cada 15 min).
 */
function PonteCmd_alertasPainel_() {
  var itens = [], hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  var diasAviso = (SGO_CFG.ALERTAS && SGO_CFG.ALERTAS.DIAS_ANTECEDENCIA_PADRAO) ? SGO_CFG.ALERTAS.DIAS_ANTECEDENCIA_PADRAO : 30;
  try {
    SGO_DATA.getAll("DOC_DOCUMENTOS").forEach(function (doc) {
      if (SGO_UTILS.safeUpper(doc.STATUS) !== "ATIVO" || !doc.DATA_VENCIMENTO) return;
      var p = String(doc.DATA_VENCIMENTO).split("T")[0].split("-");
      if (p.length !== 3) return;
      var dv = new Date(p[0], p[1] - 1, p[2]); dv.setHours(0, 0, 0, 0);
      var d = Math.ceil((dv.getTime() - hoje.getTime()) / 86400000);
      if (d < 0) itens.push({ tipo: "CRÍTICO", origem: "DOCUMENTO", dias: d, mensagem: "O documento '" + doc.NOME_ARQUIVO + "' (" + doc.TIPO_DOCUMENTO + ") ESTÁ VENCIDO há " + Math.abs(d) + " dia(s)!" });
      else if (d <= diasAviso) itens.push({ tipo: "ATENÇÃO", origem: "DOCUMENTO", dias: d, mensagem: "O documento '" + doc.NOME_ARQUIVO + "' (" + doc.TIPO_DOCUMENTO + ") vence em " + d + " dia(s)." });
    });
  } catch (e) { }
  try {
    var ss = SGO_DATA.getDB();
    if (SGO_CFG.SHEETS.CAD_PADROES && ss.getSheetByName(SGO_CFG.SHEETS.CAD_PADROES) && typeof CertCal_classificarValidadePadrao_ === "function") {
      SGO_DATA.getAll(SGO_CFG.SHEETS.CAD_PADROES).forEach(function (pd) {
        if (SGO_UTILS.safeUpper(pd.STATUS) !== "ATIVO") return;
        var v = CertCal_classificarValidadePadrao_(pd.VALIDADE);
        if (v.diasRestantes === null) { itens.push({ tipo: "ATENÇÃO", origem: "PADRAO", dias: null, mensagem: "O padrão de referência '" + pd.TAG + "': " + v.label + "." }); return; }
        var d = v.diasRestantes;
        if (d < 0) itens.push({ tipo: "CRÍTICO", origem: "PADRAO", dias: d, mensagem: "O padrão de referência '" + pd.TAG + "' (" + pd.DESCRICAO + ") ESTÁ VENCIDO há " + Math.abs(d) + " dia(s)!" });
        else if (d <= diasAviso) itens.push({ tipo: "ATENÇÃO", origem: "PADRAO", dias: d, mensagem: "O padrão de referência '" + pd.TAG + "' (" + pd.DESCRICAO + ") vence em " + d + " dia(s)." });
      });
    }
  } catch (e) { }
  try {
    var ss2 = SGO_DATA.getDB();
    if (SGO_CFG.SHEETS.CAD_VEICULOS && ss2.getSheetByName(SGO_CFG.SHEETS.CAD_VEICULOS) && typeof Frota_calcularAlertasManutencao_ === "function") {
      Frota_calcularAlertasManutencao_().forEach(function (a) {
        if (a.categoria === "QUALIDADE") { itens.push({ tipo: "ATENÇÃO", origem: "FROTA", dias: 0, mensagem: "O veículo '" + a.veiculoPlaca + "' tem uma multa (" + a.vencimento + ") sem condutor vinculado — indique em Frota > Multas." }); return; }
        var critico = a.status === "VENCIDO", cnh = a.categoria === "CNH", doc = a.categoria === "DOCUMENTO";
        var rot = cnh ? "a CNH" : (doc ? "o documento '" + a.tipoLabel + "'" : "a manutenção '" + a.tipoLabel + "'");
        var suj = cnh ? "O condutor '" + a.veiculoPlaca + "'" : "O veículo '" + a.veiculoPlaca + "'";
        itens.push({ tipo: critico ? "CRÍTICO" : "ATENÇÃO", origem: "FROTA", dias: critico ? -1 : 15, mensagem: critico ? suj + " está com " + rot + " VENCIDO(A)!" : suj + " está com " + rot + " vencendo em breve." });
      });
    }
  } catch (e) { }
  itens.sort(function (a, b) { return (a.dias === null ? 999 : a.dias) - (b.dias === null ? 999 : b.dias); });
  return { ok: true, itens: itens.slice(0, 200), total: itens.length, criticos: itens.filter(function (i) { return i.tipo === "CRÍTICO"; }).length, em: new Date().toISOString() };
}

function PonteCmd_atualizar_(sheet, id, campos, quem, modulo) {
  var atual = id ? SGO_DATA.getById(sheet, id) : null;
  if (!atual) return { ok: false, erro: "Registro não encontrado no SGO+." };
  // nunca sobrescreve o cadastro do SGO+: o COMMAND só completa campos que estão vazios lá
  var novos = {};
  Object.keys(campos).forEach(function (k) { if (String(atual[k] == null ? "" : atual[k]).trim() === "") novos[k] = campos[k]; });
  campos = novos;
  if (!Object.keys(campos).length) return { ok: true, id: id, nada: true };
  SGO_DATA.update(sheet, id, campos);
  SGO_DATA.log(modulo + "_ATUALIZAR", quem, "Atualizado pelo COMMAND: " + id, modulo);
  return { ok: true, id: id };
}

/* ================= Prontuário do equipamento no COMMAND: documentos emitidos (SÓ LEITURA, sem log) ================= */

var PONTE_CMD_DOCS_MAX = 500;

/** Lê uma aba sem quebrar: aba inexistente (SGO_DATA.getAll lança) → []. */
function PonteCmd_lerSeguro_(aba) {
  try { return SGO_DATA.getAll(aba) || []; } catch (e) { return []; }
}

/** Data → "yyyy-MM-dd" (só dia) ou ISO (com hora). Aceita Date, ISO, yyyy-MM-dd e dd/MM/yyyy. Inválida → "". */
function PonteCmd_data_(v) {
  if (v === null || v === undefined || v === "") return "";
  if (Object.prototype.toString.call(v) === "[object Date]") return isNaN(v.getTime()) ? "" : v.toISOString();
  var s = String(v).trim(), m = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(s);
  if (m) return m[3] + "-" + m[2] + "-" + m[1];
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  var t = new Date(s).getTime();
  return isNaN(t) ? "" : new Date(t).toISOString();
}
function PonteCmd_ms_(v) {
  var s = PonteCmd_data_(v);
  if (!s) return null;
  var t = new Date(/^\d{4}-\d{2}-\d{2}$/.test(s) ? s + "T12:00:00-03:00" : s).getTime();
  return isNaN(t) ? null : t;
}

function PonteCmd_semAcento_(s) {
  return String(s || "").toLowerCase().replace(/[áàâã]/g, "a").replace(/[éê]/g, "e").replace(/[í]/g, "i").replace(/[óôõ]/g, "o").replace(/[ú]/g, "u").replace(/[ç]/g, "c");
}

/** Categoria a partir do tipo do documento (mesma ideia do Inventário: "calibra" / "qualifica"). */
function PonteCmd_categoria_(tipo) {
  var t = PonteCmd_semAcento_(tipo);
  if (/calibra/.test(t)) return "CALIBRACAO";
  if (/qualifica/.test(t)) return "QUALIFICACAO";
  if (/nr ?-?13|vaso de press/.test(t)) return "NR13";
  if (/manuten|preventiva/.test(t)) return "PREVENTIVA";
  if (/ordem|ordens de servi/.test(t)) return "OS";
  if (/contrato/.test(t)) return "CONTRATO";
  return "OUTRO";
}

/** Próxima calibração do certificado (só existe dentro de DADOS_JSON; snapshot no Drive não é lido). */
function PonteCmd_proximaCertCal_(json) {
  try {
    var s = String(json || "");
    if (!s || s.charAt(0) !== "{" || s.length > 60000) return "";
    var o = JSON.parse(s), p = o && o.proximaCalibracao;
    return p && p.data ? PonteCmd_data_(p.data) : "";
  } catch (e) { return ""; }
}

/** Todos os documentos emitidos (cada módulo em try/catch). filtro(doc) decide se entra. */
function PonteCmd_docsTodos_(filtro) {
  var out = [], links = {};
  var push = function (d) { if (d.link) links[d.link] = 1; if (d.link2) links[d.link2] = 1; if (!filtro || filtro(d)) out.push(d); };
  try {
    PonteCmd_lerSeguro_((SGO_CFG.SHEETS && SGO_CFG.SHEETS.CERT_CALIBRACAO) || "CERT_CALIBRACAO").forEach(function (r) {
      if (SGO_UTILS.safeUpper(r.STATUS) && SGO_UTILS.safeUpper(r.STATUS) !== "ATIVO") return;
      push({ id: String(r.ID || ""), modulo: "Certificado de Calibração", tipo: "Certificado de calibração", categoria: "CALIBRACAO",
        numero: String(r.NUMERO_CERTIFICADO || ""), data: PonteCmd_data_(r.DATA_EMISSAO) || PonteCmd_data_(r.DATA_CALIBRACAO),
        validade: PonteCmd_data_(r.DATA_VALIDADE) || PonteCmd_proximaCertCal_(r.DADOS_JSON), status: "EMITIDO", link: String(r.LINK_PDF_CERTIFICADO || ""),
        link2: String(r.LINK_PDF_RELATORIO_INTERPRETATIVO || ""), descricao: r.DATA_CALIBRACAO ? "Calibrado em " + r.DATA_CALIBRACAO : "",
        equipamento_id_sgo: String(r.EQUIPAMENTO_ID || ""), cliente_id_sgo: String(r.CLIENTE_ID || ""), serie: "", alterado_em: PonteCmd_data_(r.CRIADO_EM) });
    });
  } catch (e) { }
  try {
    PonteCmd_lerSeguro_("NR13_LAUDOS").forEach(function (r) {
      if (SGO_UTILS.safeUpper(r.STATUS) !== "EMITIDO") return;
      push({ id: String(r.ID || ""), modulo: "NR-13", tipo: "Laudo NR-13" + (r.TIPO_INSPECAO ? " (" + r.TIPO_INSPECAO + ")" : ""), categoria: "NR13",
        numero: String(r.NUMERO_LAUDO || ""), data: PonteCmd_data_(r.DATA_TERMINO_INSPECAO) || PonteCmd_data_(r.CRIADO_EM), validade: PonteCmd_data_(r.DATA_PROXIMA_INSPECAO),
        status: String(r.VEREDITO || "EMITIDO"), link: String(r.LINK_PDF || ""), descricao: "",
        equipamento_id_sgo: String(r.EQUIPAMENTO_ID || ""), cliente_id_sgo: String(r.CLIENTE_ID || ""), serie: String(r.NUMERO_SERIE || ""), alterado_em: PonteCmd_data_(r.CRIADO_EM) });
    });
  } catch (e) { }
  try {
    PonteCmd_lerSeguro_("DOC_DOCUMENTOS").forEach(function (r) {
      var st = SGO_UTILS.safeUpper(r.STATUS);
      if (st === "INATIVO" || !r.EQUIPAMENTO_ID) return;
      var link = String(r.LINK_ARQUIVO || "");
      if (link && links[link]) return;   // cópia do certificado/laudo já listado
      push({ id: String(r.ID || ""), modulo: "Documentos", tipo: String(r.TIPO_DOCUMENTO || "Documento").replace(/^\d+\.\s*/, ""), categoria: PonteCmd_categoria_(r.TIPO_DOCUMENTO),
        numero: "", data: PonteCmd_data_(r.DATA_EMISSAO) || PonteCmd_data_(r.CRIADO_EM), validade: PonteCmd_data_(r.DATA_VENCIMENTO), status: st || "ATIVO", link: link,
        descricao: String(r.NOME_ARQUIVO || ""), equipamento_id_sgo: String(r.EQUIPAMENTO_ID || ""), cliente_id_sgo: String(r.CLIENTE_ID || ""), serie: "",
        alterado_em: PonteCmd_data_(r.CRIADO_EM) });
    });
  } catch (e) { }
  out.forEach(function (d) { delete d.link2; });
  return out;
}

/** docs.equipamento: pelo ID do SGO+; sem ID (ou além dele), pelos equipamentos do mesmo cliente com a mesma série/TAG. */
function PonteCmd_docsEquipamento_(d) {
  var ids = {}, idSgo = SGO_UTILS.safe(d.equipamento_id_sgo), cli = SGO_UTILS.safe(d.cliente_id_sgo);
  var serie = SGO_UTILS.safeUpper(d.serie), tag = SGO_UTILS.safeUpper(d.tag);
  if (idSgo) ids[idSgo] = 1;
  if (cli && (serie || tag)) {
    try {
      PonteCmd_lerSeguro_(SGO_CFG.SHEETS.CAD_EQUIPAMENTOS).forEach(function (q) {
        if (String(q.CLIENTE_ID) !== cli) return;
        if ((serie && SGO_UTILS.safeUpper(q.SERIE) === serie) || (!idSgo && tag && SGO_UTILS.safeUpper(q.TAG) === tag)) ids[String(q.ID)] = 1;
      });
    } catch (e) { }
  }
  if (!Object.keys(ids).length) return { ok: true, docs: [], agora: new Date().toISOString(), semEquipamento: true };
  var docs = PonteCmd_docsTodos_(function (x) {
    return ids[x.equipamento_id_sgo] || (!x.equipamento_id_sgo && serie && cli && x.cliente_id_sgo === cli && SGO_UTILS.safeUpper(x.serie) === serie);
  });
  docs.sort(function (a, b) { return (PonteCmd_ms_(b.data) || 0) - (PonteCmd_ms_(a.data) || 0); });
  var lim = Math.min(Number(d.limite) || 300, PONTE_CMD_DOCS_MAX);
  return { ok: true, docs: docs.slice(0, lim), total: docs.length, agora: new Date().toISOString() };
}

/** docs.desde: criados a partir de desde_iso, do mais antigo para o mais novo (o COMMAND guarda onde parou). */
function PonteCmd_docsDesde_(d) {
  var desde = PonteCmd_ms_(d.desde_iso);
  if (desde === null) return { ok: false, erro: "Informe desde_iso (data ISO)." };
  var lim = Math.max(1, Math.min(Number(d.limite) || 200, PONTE_CMD_DOCS_MAX));
  var docs = PonteCmd_docsTodos_(function (x) { var t = PonteCmd_ms_(x.alterado_em); return t !== null && t >= desde; });
  docs.sort(function (a, b) { return (PonteCmd_ms_(a.alterado_em) || 0) - (PonteCmd_ms_(b.alterado_em) || 0); });
  var truncado = docs.length > lim;
  docs = docs.slice(0, lim);
  return { ok: true, docs: docs, total: docs.length, truncado: truncado, ultimo_alterado_em: docs.length ? docs[docs.length - 1].alterado_em : "",
    agora: new Date().toISOString() };
}
