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
    // 19/10/2026: o Assistente do ponto manda o resumo do 3º esquecimento do mês. Vira
    // sugestão INFORMATIVA no Programa de conduta (a gestão decide; nada é automático).
    // dados: { sgoUsuarioId, mes 'aaaa-mm', quantidade, texto, chave }.
    case "conduta.sugestao": return typeof Conduta_sugestaoDoPonto_ === "function" ? Conduta_sugestaoDoPonto_(d) : { ok: false, erro: "Programa de conduta indisponível." };
  }
  // 19/10/2026: Minhas atividades no COMMAND. Uma fonte só (as atividades ficam aqui); o COMMAND lê e grava
  // em nome do usuário do SGO+ ligado à conta (dados: { sgoUsuarioId, payload }), com as mesmas regras das
  // telas do SGO+ (SGO_Atividades.js, Atividades_ponte_).
  // 20/10/2026: Frota no COMMAND (SGO_Frota_Rastreamento.js, FrotaR_ponte_): só leitura; frota.painel só para a gestão do SGO+
  // (localização do veículo, nunca para controlar a pessoa: o ponto do COMMAND não usa isto); frota.pedidos = comprovantes pedidos à própria pessoa.
  if (/^frota\.(painel|pedidos)$/.test(String(req.acao || ""))) {
    return typeof FrotaR_ponte_ === "function" ? FrotaR_ponte_(String(req.acao), d) : { ok: false, erro: "Frota indisponível no SGO+." };
  }
  if (/^atividades\.[a-z]+$/.test(String(req.acao || ""))) {
    return typeof Atividades_ponte_ === "function" ? Atividades_ponte_(String(req.acao), d) : { ok: false, erro: "Minhas atividades indisponível no SGO+." };
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
 * Mesmos alertas de padrões de calibração que o SGO+ mostra em balão, para o COMMAND mostrar também. Só leitura.
 * 17/10/2026: contagem e lista vêm da central de pendências (SGO_Alertas_Central.js) — a mesma do Início e do balão.
 */
function PonteCmd_alertasPadroes_() {
  if (typeof SGO_Pendencias_interno_ !== "function" || typeof AlertasPadroes_config_ !== "function") return { ok: true, disponivel: false };
  var config = AlertasPadroes_config_();
  var r = SGO_Pendencias_interno_({});
  var sit = { padrao_vencido: "VENCIDO", padrao_vencendo: "VENCENDO", padrao_sem_validade: "SEM_VALIDADE" };
  var itens = (r.itens || []).filter(function (i) { return i.modulo === "padroes"; });
  var porTipo = r.resumo.porTipo || {};
  var vencidos = porTipo.padrao_vencido || 0, vencendo = porTipo.padrao_vencendo || 0, invalidos = porTipo.padrao_sem_validade || 0;
  var lista = itens.slice(0, 30).map(function (i) {
    return { id: i.id, codigo: i.nome, descricao: i.detalhe, validade: i.vencimento, dias: i.dias, situacao: sit[i.tipo] || "", titulo: i.titulo, oQueFazer: i.oQueFazer };
  });
  return { ok: true, disponivel: true, ativo: !!config.ativo, perfis: config.perfis || [], antecedenciaDias: config.antecedenciaDias,
    resumo: { total: vencidos + invalidos + vencendo, vencidos: vencidos, vencendo: vencendo, invalidos: invalidos },
    critico: !!config.alertaCriticoAtivo && (vencidos > 0 || invalidos > 0), mensagem: config.mensagem || "", lista: lista, em: new Date().toISOString() };
}

/**
 * Os mesmos vencimentos do painel de alertas do SGO+ (documentos, calibrações, NR-13, padrões e Frota), na visão
 * interna (sem trava de cliente e sem nada pessoal). Só leitura, sem log (o COMMAND consulta a cada 15 min).
 * 17/10/2026: lidos da central de pendências (SGO_Alertas_Central.js). A "mensagem" agora é ESTÁVEL (traz a data
 * do vencimento, não "há N dias"): o COMMAND avisa no sino o que tem mensagem nova, e o texto que mudava todo dia
 * fazia o mesmo vencimento ser avisado de novo a cada dia. Campos novos: id (estável), modulo, gravidade, titulo,
 * detalhe, oQueFazer, vencimento; resumo por módulo igual ao do SGO+.
 */
function PonteCmd_alertasPainel_() {
  if (typeof SGO_Pendencias_interno_ !== "function") return { ok: false, erro: "Central de pendências indisponível no SGO+." };
  var r = SGO_Pendencias_interno_({});
  var venc = (r.itens || []).filter(function (i) { return i.vencimentoTipo && (i.origem === "DOCUMENTO" || i.origem === "PADRAO" || i.origem === "FROTA"); });
  var itens = venc.map(function (i) {
    return { id: i.id, tipo: i.gravidade === "CRITICO" ? "CRÍTICO" : "ATENÇÃO", origem: i.origem, dias: i.dias, modulo: i.modulo, gravidade: i.gravidade,
      mensagem: PonteCmd_mensagemEstavel_(i), titulo: i.titulo, detalhe: i.detalhe, oQueFazer: i.oQueFazer, vencimento: i.vencimento };
  });
  var porModulo = {};
  venc.forEach(function (i) { var m = porModulo[i.modulo] = porModulo[i.modulo] || { total: 0, criticos: 0 }; m.total++; if (i.gravidade === "CRITICO") m.criticos++; });
  return { ok: true, itens: itens.slice(0, 200), total: itens.length, criticos: itens.filter(function (i) { return i.tipo === "CRÍTICO"; }).length,
    porModulo: porModulo, naoVerificado: r.naoVerificado || [], em: new Date().toISOString() };
}

/** Texto que não muda de um dia para o outro enquanto a situação for a mesma (vencendo -> vencido muda, de propósito). */
function PonteCmd_mensagemEstavel_(i) {
  if (i.textoEstavel) return i.textoEstavel;
  return i.titulo + ".";
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
