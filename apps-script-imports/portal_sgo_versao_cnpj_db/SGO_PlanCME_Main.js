/****************************************************
 * PLANEJAMENTO CME — porte nativo pro Portal SGO+ CNPJ/DB (2026-07-28)
 *
 * Backend principal: roteador único (PlanCME_apiDispatch, mesmo padrão
 * já usado por CadeiaFrioRel_apiDispatch/RelCal_apiDispatch) + bootstrap
 * + persistência própria (planilha separada, não a base central do
 * Portal — mesmo padrão de Cadeia de Frio/Estufa/RelCal/Declaração).
 *
 * Portado de metrolabs_planejamento_cme/Codigo.js — doGet NÃO foi
 * portado (o Portal já tem o seu; a antiga rota "?page=manual" virou o
 * toggle de <div> dentro de SGO_PlanCME_ConteudoModulo.js).
 ****************************************************/

function PlanCME_apiDispatch(req) {
  req = req || {};
  var sessaoPlanCME = exigirSessao(String(req.sessionId || '')); // SEGURANCA: exige sessao valida do portal (SGO_Auth)
  // (2026-10-16) Módulo interno da equipe: o perfil CLIENTE só tinha o menu
  // escondido no navegador; pela API conseguia calcular, gravar planejamento
  // e salvar PDF na pasta de qualquer cliente.
  if (String((sessaoPlanCME && sessaoPlanCME.perfil) || '').trim().toUpperCase() === 'CLIENTE') {
    throw new Error('O módulo Planejamento CME é de uso da equipe Metrolabs e não está disponível para o perfil Cliente. Para receber um planejamento, solicite à Metrolabs.');
  }
  var fn = String(req.fn || '').trim();
  var payload = req.payload || {};

  var allow = {
    apiCalcular: PlanCME_calcularPlanejamento,
    apiMontarDocumentoFinal: PlanCME_apiMontarDocumentoFinal,
    apiSalvarDocumento: SGO_DocSalvar_comCopiaHtml_(PlanCME_apiSalvarDocumento), // PDF + cópia HTML A4 na mesma pasta
    apiRefinarTexto: PlanCME_refinarTextoIA,
    apiSalvarPlanejamento: PlanCME_salvarPlanejamento
  };

  if (!fn) throw new Error('Função não informada.');
  if (!allow[fn] || typeof allow[fn] !== 'function') throw new Error('Função não permitida ou não encontrada: ' + fn);

  return allow[fn](payload);
}

function PlanCME_getAppBootstrap() {
  var props = PropertiesService.getScriptProperties();
  return {
    appNome: props.getProperty("PLANCME_APP_NOME") || PLANCME_CFG.APP.NOME,
    versao: props.getProperty("PLANCME_APP_VERSAO") || PLANCME_CFG.APP.VERSAO,
    whatsappMsg: props.getProperty("PLANCME_WHATSAPP_MSG") || PLANCME_CFG.WHATSAPP.MENSAGEM_PADRAO,
    empresaNome: props.getProperty("PLANCME_EMPRESA_NOME") || PLANCME_CFG.EMPRESA.NOME,
    responsavelTecnico: props.getProperty("PLANCME_RESPONSAVEL_TECNICO") || PLANCME_CFG.EMPRESA.RESPONSAVEL_TECNICO,
    tipoEquipamentoVapor: PLANCME_CFG.TIPOS_EQUIPAMENTO.AUTOCLAVE_VAPOR,
    tipoEquipamentoPeroxido: PLANCME_CFG.TIPOS_EQUIPAMENTO.AUTOCLAVE_PEROXIDO,
    tipoEquipamentoUltr: PLANCME_CFG.TIPOS_EQUIPAMENTO.LAVADORA_ULTR,
    tipoEquipamentoTermo: PLANCME_CFG.TIPOS_EQUIPAMENTO.TERMODESINFECTORA
  };
}

function PlanCME_salvarPlanejamento(dados) {
  try {
    var db = PlanCME_getDB_();
    var aba = db.getSheetByName(PLANCME_CFG.PLANILHA.ABAS.PLANEJAMENTOS);

    var id = PlanCME_gerarId_();
    var agora = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd/MM/yyyy HH:mm:ss");

    var tipoProcesso = (dados.equipamento && dados.equipamento.tipoProcesso) ? dados.equipamento.tipoProcesso : "";
    var usaPrions = PlanCME_verificarSeUsaPrions_(dados.ciclos) ? "SIM" : "NAO";

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

function PlanCME_verificarSeUsaPrions_(ciclos) {
  if (!Array.isArray(ciclos)) return false;
  return ciclos.some(function(ciclo) { return String(ciclo || "").toLowerCase().includes("prion"); });
}

function PlanCME_getDB_() {
  var props = PropertiesService.getScriptProperties();
  var dbId = props.getProperty("PLANCME_DB_ID");
  if (!dbId) {
    // Auto-provisiona na primeira vez (planilha + pastas do Drive), sem
    // exigir um passo manual de admin — mesmo padrão de auto-criação sob
    // demanda já usado por Cadeia de Frio/Estufa (cfObterPastaPersistente_).
    // Achado real 2026-07-28: usuário testou o porte e caiu no erro "Banco
    // de dados não configurado" ao gerar o primeiro documento.
    PlanCME_setupModulo();
    dbId = props.getProperty("PLANCME_DB_ID");
  }
  return SpreadsheetApp.openById(dbId);
}
