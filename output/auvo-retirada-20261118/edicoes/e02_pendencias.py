ARQ = r'C:\Users\venda\projetos\google-script-dev\output\financeiro-20261116\cand31\SGO_Auvo_Pendencias.js'
PARES = [
("""function Auvo_pendAgendarContinuacao_() {
  var jaExiste = ScriptApp.getProjectTriggers().some(function(t) {
    return t.getHandlerFunction() === 'Auvo_pendContinuarViaTrigger_';
  });
  if (jaExiste) return;
  ScriptApp.newTrigger('Auvo_pendContinuarViaTrigger_').timeBased().after(60 * 1000).create();
}

function Auvo_pendContinuarViaTrigger_() {
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (t.getHandlerFunction() === 'Auvo_pendContinuarViaTrigger_') ScriptApp.deleteTrigger(t);
  });
  var resultado = Auvo_pendExecutarLote_();
  if (!resultado.concluido) Auvo_pendAgendarContinuacao_();
}

// Sempre começa uma rodada nova do zero (não retoma um checkpoint velho
// parcial) — usado tanto pelo botão manual quanto pelo trigger diário.
function Auvo_pendIniciarAtualizacao_() {
  Auvo_pendLimparCheckpoint_();
  var resultado = Auvo_pendExecutarLote_();
  if (!resultado.concluido) Auvo_pendAgendarContinuacao_();
  return resultado;
}

function Auvo_pendConfigurarTriggerDiario_() {
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (t.getHandlerFunction() === 'Auvo_pendDispararDiario_') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('Auvo_pendDispararDiario_')
    .timeBased().atHour(5).everyDays(1).inTimezone('America/Sao_Paulo').create();
}

function Auvo_pendDispararDiario_() {
  Auvo_pendIniciarAtualizacao_();
}""",
"""// 18/11/2026: Auvo descontinuado pelo dono (SGO_Auvo_Retirada.js). A varredura de O.S. abertas não roda mais e nada é
// agendado; as funções de gatilho que ainda estiverem na agenda só se removem. A aba AUVO_PENDENCIAS fica como histórico.
function Auvo_pendAgendarContinuacao_() {
  Auvo_retirarGatilhos_('Auvo_pendContinuarViaTrigger_');
}

function Auvo_pendContinuarViaTrigger_() {
  return Auvo_retirarGatilhos_('Auvo_pendContinuarViaTrigger_');
}

function Auvo_pendIniciarAtualizacao_() {
  throw Auvo_erroDescontinuado_();
}

function Auvo_pendConfigurarTriggerDiario_() {
  Auvo_retirarGatilhos_('Auvo_pendDispararDiario_');
  throw Auvo_erroDescontinuado_();
}

function Auvo_pendDispararDiario_() {
  return Auvo_retirarGatilhos_('Auvo_pendDispararDiario_');
}"""),
]
