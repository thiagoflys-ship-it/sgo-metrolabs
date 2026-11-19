ARQ = r'C:\Users\venda\projetos\google-script-dev\output\financeiro-20261116\cand31\SGO_Assistencia_Relatorio.js'
PARES = [
("""  var auvoMes = 0;
  try { if (typeof SGO_Atendimentos_linhas_ === 'function') auvoMes = SGO_Atendimentos_linhas_({ origem: 'AUVO' }).filter(function (t) { return no(t.DATA_TAREFA); }).length; } catch (e) {}
""", "  // 18/11/2026: sem a contagem de tarefas do Auvo no mês (Auvo descontinuado pelo dono).\n"),
(", tarefasAuvoMes: auvoMes\n", "\n"),
("""    '<p class="nota">Uso em paralelo ao Auvo: ' + ind.osSgoMes + ' O.S. no SGO+ e ' + ind.tarefasAuvoMes + ' tarefa(s) no Auvo no mês. Reclamações: '""",
 """    '<p class="nota">O.S. no SGO+ no mês: ' + ind.osSgoMes + '. Reclamações: '"""),
]
