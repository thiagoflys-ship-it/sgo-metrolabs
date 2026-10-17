/**
 * LIMPEZA DO GATILHO DO OS+ (2026-10-16)
 *
 * A integração com o OS+ foi removida (SGO_Integracao_Engine.js e
 * SGO_Setup_Integracao.js apagados). Na produção ainda existe um gatilho de
 * tempo, instalado à mão, que chama `dispararSincronizacaoTotal` todo dia às
 * 03h. Sem acesso para apagá-lo de fora, esta função com o mesmo nome fica no
 * lugar: na próxima execução das 03h ela só apaga os gatilhos cujo handler é
 * 'dispararSincronizacaoTotal' e não faz mais nada (não lê planilha, não envia
 * e-mail, não sincroniza).
 *
 * Este arquivo pode ser apagado depois de 1 semana publicado (o gatilho já
 * terá rodado e se removido).
 */
function dispararSincronizacaoTotal() {
  if (!SGO_execucaoInterna_()) return;
  try {
    var gatilhos = ScriptApp.getProjectTriggers();
    var removidos = 0;
    for (var i = 0; i < gatilhos.length; i++) {
      if (gatilhos[i].getHandlerFunction() === 'dispararSincronizacaoTotal') {
        ScriptApp.deleteTrigger(gatilhos[i]);
        removidos++;
      }
    }
    Logger.log('Limpeza OS+: ' + removidos + ' gatilho(s) de dispararSincronizacaoTotal removido(s).');
  } catch (e) {
    Logger.log('Limpeza OS+: falha ao remover gatilho: ' + (e && e.message ? e.message : e));
  }
}
