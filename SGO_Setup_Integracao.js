/**
 * ============================================================================
 * SETUP AUTOMATICO + AGENDADOR DE ATUALIZACAO - METROLABS SGO+
 * ============================================================================
 * Objetivo: ativar a atualizacao diaria dos dados internos as 03:00 AM.
 * ============================================================================
 */

function executarSetupIntegracao() {
  return executarSetupAtualizacaoDados();
}

function executarSetupAtualizacaoDados() {
  const props = PropertiesService.getScriptProperties();
  const nomeFuncaoAtualizacao = "dispararSincronizacaoTotal";

  try {
    const dbId = props.getProperty("DB_ID");

    const gatilhos = ScriptApp.getProjectTriggers();
    for (var i = 0; i < gatilhos.length; i++) {
      if (gatilhos[i].getHandlerFunction() === nomeFuncaoAtualizacao) {
        ScriptApp.deleteTrigger(gatilhos[i]);
      }
    }

    ScriptApp.newTrigger(nomeFuncaoAtualizacao)
      .timeBased()
      .atHour(3)
      .everyDays(1)
      .inTimezone("America/Sao_Paulo")
      .create();

    const statusBanco = dbId ? "Banco SGO+ localizado." : "DB_ID nao encontrado. Rode o setup principal do SGO+.";
    const msg = "ATUALIZACAO INTERNA ATIVADA COM SUCESSO!\n\n" +
      "Agendamento: diario as 03:00 AM\n" +
      "Status: " + statusBanco + "\n\n" +
      "O SGO+ verificara os dados internos automaticamente.";

    console.log(msg);
    try { SpreadsheetApp.getUi().alert(msg); } catch (e) {}
    return { sucesso: true, mensagem: msg };
  } catch (e) {
    const erroMsg = "ERRO NO SETUP: " + e.message;
    console.error(erroMsg);
    try { SpreadsheetApp.getUi().alert(erroMsg); } catch (err) {}
    return { sucesso: false, mensagem: erroMsg };
  }
}
