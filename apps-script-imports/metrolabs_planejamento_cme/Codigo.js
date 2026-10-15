function doGet(e) {
  var pagina = String((e && e.parameter && e.parameter.page) || "").trim();

  if (pagina === "manual") {
    return HtmlService
      .createTemplateFromFile("Manual")
      .evaluate()
      .setTitle("Manual do Operador — " + CFG.APP.NOME)
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }

  return HtmlService
    .createHtmlOutputFromFile("Index")
    .setTitle(CFG.APP.NOME)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function getAppBootstrap() {
  const props = PropertiesService.getScriptProperties();
  return {
    appNome: props.getProperty("APP_NOME") || CFG.APP.NOME,
    versao: props.getProperty("APP_VERSAO") || CFG.APP.VERSAO,
    whatsappMsg: props.getProperty("WHATSAPP_MSG") || CFG.WHATSAPP.MENSAGEM_PADRAO,
    empresaNome: props.getProperty("EMPRESA_NOME") || CFG.EMPRESA.NOME,
    responsavelTecnico: props.getProperty("RESPONSAVEL_TECNICO") || CFG.EMPRESA.RESPONSAVEL_TECNICO,
    tipoEquipamentoVapor: CFG.TIPOS_EQUIPAMENTO.AUTOCLAVE_VAPOR,
    tipoEquipamentoPeroxido: CFG.TIPOS_EQUIPAMENTO.AUTOCLAVE_PEROXIDO,
    tipoEquipamentoUltrBrasmedical: CFG.TIPOS_EQUIPAMENTO.LAVADORA_ULTR_BRASMEDICAL,
    tipoEquipamentoUltrSanders: CFG.TIPOS_EQUIPAMENTO.LAVADORA_ULTR_SANDERS,
    tipoEquipamentoUltrOutros: CFG.TIPOS_EQUIPAMENTO.LAVADORA_ULTR_OUTROS,
    tipoEquipamentoTermo: CFG.TIPOS_EQUIPAMENTO.TERMODESINFECTORA
  };
}

function salvarPlanejamento(dados) {
  try {
    const db = getDB_();
    const aba = db.getSheetByName(CFG.PLANILHA.ABAS.PLANEJAMENTOS);

    const id = gerarId_();
    const agora = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd/MM/yyyy HH:mm:ss");

    const tipoProcesso = (dados.equipamento && dados.equipamento.tipoProcesso) ? dados.equipamento.tipoProcesso : "";
    const usaPrions = verificarSeUsaPrions_(dados.ciclos) ? "SIM" : "NAO";

    aba.appendRow([
      id,
      agora,
      (dados.cliente && dados.cliente.razaoSocial) || "",
      (dados.cliente && dados.cliente.cnpj) || "",
      (dados.equipamento && dados.equipamento.tipo) || "",
      tipoProcesso,
      (dados.equipamento && dados.equipamento.volume) || "",
      (dados.servicos && dados.servicos.qi) ? "SIM" : "NAO",
      (dados.servicos && dados.servicos.qo) ? "SIM" : "NAO",
      (dados.servicos && dados.servicos.qd) ? "SIM" : "NAO",
      (dados.servicos && dados.servicos.bowieDick) ? "SIM" : "NAO",
      usaPrions,
      JSON.stringify((dados.resultado || {})),
      dados.observacoes || ""
    ]);

    return {
      ok: true,
      planejamentoId: id
    };
  } catch (e) {
    return {
      ok: false,
      mensagem: "Erro ao salvar planejamento: " + e.message
    };
  }
}

function verificarSeUsaPrions_(ciclos) {
  if (!Array.isArray(ciclos)) return false;
  return ciclos.some(ciclo => String(ciclo || "").toLowerCase().includes("prion"));
}

function getDB_() {
  const dbId = PropertiesService.getScriptProperties().getProperty("DB_ID");
  if (!dbId) throw new Error("Banco de dados não configurado. Rode setupMetrolabsCME().");
  return SpreadsheetApp.openById(dbId);
}