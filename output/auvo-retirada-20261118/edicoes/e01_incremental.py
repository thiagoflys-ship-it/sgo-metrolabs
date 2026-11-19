ARQ = r'C:\Users\venda\projetos\google-script-dev\output\financeiro-20261116\cand31\SGO_Auvo_Incremental.js'
PARES = [
("""function Auvo_configurarTriggerIncremental_() {
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (t.getHandlerFunction() === 'Auvo_dispararSincronizacaoIncremental_') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('Auvo_dispararSincronizacaoIncremental_')
    .timeBased().everyMinutes(30).create();
}

function Auvo_dispararSincronizacaoIncremental_() {
  Auvo_processarTarefasIncremental_();
}""",
"""// 18/11/2026: Auvo descontinuado pelo dono (SGO_Auvo_Retirada.js). Não agenda mais nada; só remove o que ainda existir.
function Auvo_configurarTriggerIncremental_() {
  Auvo_retirarGatilhos_('Auvo_dispararSincronizacaoIncremental_');
  throw Auvo_erroDescontinuado_();
}

// 18/11/2026: Auvo descontinuado pelo dono. Se o agendador ainda chamar, não fala com o Auvo: remove o próprio gatilho e sai.
function Auvo_dispararSincronizacaoIncremental_() {
  return Auvo_retirarGatilhos_('Auvo_dispararSincronizacaoIncremental_');
}"""),
]
