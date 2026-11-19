ARQ = r'C:\Users\venda\projetos\google-script-dev\output\financeiro-20261116\cand31\SGO_Auvo_Reverso.js'
PARES = [
("""function Auvo_agendarContinuacaoReversa_() {
  var jaExiste = ScriptApp.getProjectTriggers().some(function(t) {
    return t.getHandlerFunction() === 'Auvo_continuarViaTrigger_';
  });
  if (jaExiste) return;
  ScriptApp.newTrigger('Auvo_continuarViaTrigger_').timeBased().after(60 * 1000).create();
}

function Auvo_continuarViaTrigger_() {
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (t.getHandlerFunction() === 'Auvo_continuarViaTrigger_') ScriptApp.deleteTrigger(t);
  });
  var resultado;
  try { resultado = Auvo_executarLoteReverso_(); } catch (e) { Auvo_registrarErroReverso_(e); throw e; }
  if (!resultado.concluido && resultado.fase !== 'CONCLUIDO') {
    Auvo_agendarContinuacaoReversa_();
  }
}

function Auvo_configurarTriggerDiarioReverso_() {
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (t.getHandlerFunction() === 'Auvo_dispararSincronizacaoReversaDiaria_') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('Auvo_dispararSincronizacaoReversaDiaria_')
    .timeBased().atHour(4).everyDays(1).inTimezone('America/Sao_Paulo').create();
}

function Auvo_dispararSincronizacaoReversaDiaria_() {
  Auvo_bootstrap_();
  Auvo_gravarCheckpointReverso_({ fase: 'CLIENTES', indice: 0 });
  var resultado = Auvo_executarLoteReverso_();
  if (!resultado.concluido && resultado.fase !== 'CONCLUIDO') {
    Auvo_agendarContinuacaoReversa_();
  }
}""",
"""// 18/11/2026: Auvo descontinuado pelo dono (SGO_Auvo_Retirada.js). A importação Auvo -> SGO+ não roda mais e nada é
// agendado; as funções de gatilho que ainda estiverem na agenda só se removem. Os cadastros já importados ficam como estão.
function Auvo_agendarContinuacaoReversa_() {
  Auvo_retirarGatilhos_('Auvo_continuarViaTrigger_');
}

function Auvo_continuarViaTrigger_() {
  return Auvo_retirarGatilhos_('Auvo_continuarViaTrigger_');
}

function Auvo_configurarTriggerDiarioReverso_() {
  Auvo_retirarGatilhos_('Auvo_dispararSincronizacaoReversaDiaria_');
  throw Auvo_erroDescontinuado_();
}

function Auvo_dispararSincronizacaoReversaDiaria_() {
  return Auvo_retirarGatilhos_('Auvo_dispararSincronizacaoReversaDiaria_');
}"""),
]
