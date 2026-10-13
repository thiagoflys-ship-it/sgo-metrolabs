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
    const statusBanco = dbId ? "✅ Banco SGO Localizado." : "⚠️ DB_ID não encontrado (Rode o sistema uma vez).";
    const msg = `🚀 INTEGRAÇÃO ATIVADA COM SUCESSO!\n\n` +
                `• Destino: OS+ (Conectado)\n` +
                `• Agendamento: Diário às 03:00 AM\n` +
                `• Status: ${statusBanco}\n\n` +
                `O sistema agora trabalhará sozinho todas as noites.`;

    console.log(msg);
    try { SpreadsheetApp.getUi().alert(msg); } catch(e) { /* Caso rode do editor */ }

  } catch (e) {
    const erroMsg = "❌ ERRO NO SETUP: " + e.message;
    console.error(erroMsg);
    try { SpreadsheetApp.getUi().alert(erroMsg); } catch(err) {}
  }
}