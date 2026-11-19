ARQ = r'C:\Users\venda\projetos\google-script-dev\output\financeiro-20261116\cand31\SGO_Assistencia_Agenda.js'
PARES = [
(" * Conflito de horário (outra O.S. do SGO+, tarefa aberta do Auvo no mesmo horário, ausência no ponto) é mostrado e só",
 " * Conflito de horário (outra O.S. do SGO+ no mesmo horário, ausência no ponto) é mostrado e só"),
("/** O que ocupa o técnico em [ini, fim): O.S. do SGO+ e tarefas abertas do Auvo (pela fonte única). */",
 "/** O que ocupa o técnico em [ini, fim): O.S. do SGO+ e ausências. 18/11/2026: tarefa do Auvo não conta mais (Auvo descontinuado pelo dono). */"),
("""  if (typeof SGO_Atendimentos_linhas_ === 'function') {
    try {
      SGO_Atendimentos_linhas_({ origem: 'AUVO' }).forEach(function (t) {
        if (Ast_s_(t.TECNICO_ID_SGO) !== Ast_s_(tecnicoId) || Ast_up_(t.FINALIZADA) === 'SIM') return;
        var a = Ast_ms_(t.DATA_TAREFA); if (a === null) return;
        var b = a + 60 * 60000;
        if (a < fimMs && iniMs < b) saida.push({ origem: 'AUVO', numero: Ast_s_(t.AUVO_TASK_ID), texto: 'tarefa ' + Ast_s_(t.AUVO_TASK_ID) + ' do Auvo (' + Ast_s_(t.CLIENTE_NOME_AUVO) + ') às ' + Ast_hora_(Ast_agora_(a)) });
      });
    } catch (e) {}
  }
""", ""),
("""  if (typeof SGO_Atendimentos_linhas_ === 'function') {
    try {
      SGO_Atendimentos_linhas_({ origem: 'AUVO' }).forEach(function (t) {
        var id = Ast_s_(t.TECNICO_ID_SGO), dia = Ast_dia_(t.DATA_TAREFA);
        if (!porTec[id] || !dia || dia < ini || dia > fim) return;
        porTec[id].push({ origem: 'AUVO', id: '', numero: Ast_s_(t.AUVO_TASK_ID), dia: dia, inicio: Ast_hora_(t.DATA_TAREFA), fim: '', inicioMs: Ast_ms_(t.DATA_TAREFA), duracaoMin: 60,
          cliente: Ast_s_(t.CLIENTE_NOME_AUVO), tipo: Ast_s_(t.TIPO_TAREFA), endereco: Ast_s_(t.ENDERECO), situacao: Ast_up_(t.FINALIZADA) === 'SIM' ? 'FINALIZADA_AUVO' : 'ABERTA_AUVO',
          situacaoNome: Ast_up_(t.FINALIZADA) === 'SIM' ? 'Finalizada no Auvo' : 'Aberta no Auvo', link: Ast_s_(t.TASK_URL) });
      });
    } catch (e) {}
  }
""", "  // 18/11/2026: tarefas do Auvo saíram da agenda dos técnicos (Auvo descontinuado pelo dono, SGO_Auvo_Retirada.js).\n"),
]
