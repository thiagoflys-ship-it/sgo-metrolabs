/**
 * ============================================================================
 * SETUP AUTOMÁTICO + AGENDADOR DE MADRUGADA - METROLABS INTEGRATOR
 * ============================================================================
 * Objetivo: Configurar o destino e ativar a sincronização diária às 03:00 AM.
 * ============================================================================
 */

function executarSetupIntegracao() {
  const ID_OS_PLUS = "1eYZLYGXHWg5s_MzZsbBFTMzk6VXbHsWxnFwOOdYCy0g";
  const props = PropertiesService.getScriptProperties();
  const NOME_FUNCAO_SINC = 'dispararSincronizacaoTotal';
  
  try {
    // 1. GRAVAÇÃO DAS PROPRIEDADES
    props.setProperty("ID_PLANILHA_OSPLUS", ID_OS_PLUS);
    const dbId = props.getProperty("DB_ID");

    // 2. CONFIGURAÇÃO DO GATILHO (TRIGGER) DE MADRUGADA
    // Limpa gatilhos antigos para evitar duplicidade
    const gatilhos = ScriptApp.getProjectTriggers();
    for (var i = 0; i < gatilhos.length; i++) {
      if (gatilhos[i].getHandlerFunction() === NOME_FUNCAO_SINC) {
        ScriptApp.deleteTrigger(gatilhos[i]);
      }
    }

    // Cria o novo agendamento para as 03:00 AM todo dia
    ScriptApp.newTrigger(NOME_FUNCAO_SINC)
      .timeBased()
      .atHour(3)
      .everyDays(1)
      .inTimezone("America/Sao_Paulo")
      .create();

    // 3. FEEDBACK DE DIRETORIA
    const statusBanco = dbId ? "banco do SGO+ localizado." : "banco do SGO+ não localizado (DB_ID vazio). Abra o SGO+ uma vez e rode este ajuste de novo.";
    const msg = `Envio automático ao OS+ ativado.\n\n` +
                `• Destino: OS+\n` +
                `• Agendamento: todos os dias às 03:00\n` +
                `• Situação: ${statusBanco}\n\n` +
                `O envio passa a rodar sozinho todas as madrugadas.`;

    console.log(msg);
    try { SpreadsheetApp.getUi().alert(msg); } catch(e) { /* Caso rode do editor */ }

  } catch (e) {
    const erroMsg = "Não foi possível ativar o envio automático ao OS+. Tente de novo; se repetir, avise o administrador.";
    console.error("Falha no ajuste da integração OS+: " + ((e && e.stack) || e));
    try { SpreadsheetApp.getUi().alert(erroMsg); } catch(err) {}
  }
}