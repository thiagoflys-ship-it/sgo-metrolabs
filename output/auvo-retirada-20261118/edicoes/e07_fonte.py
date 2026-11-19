ARQ = r'C:\Users\venda\projetos\google-script-dev\output\financeiro-20261116\cand31\SGO_Assistencia_Fonte.js'
PARES = [
("""/**
 * Atendimentos das duas origens. opcoes: { origem: 'AUVO'|'SGO', semCanceladas (padrão true) }. Leitura curta guardada por 5 s
 * (a gravação da Assistência limpa). Nunca lança: sem a aba, a origem fica vazia.
 */""",
"""/**
 * Atendimentos. opcoes: { origem: 'SGO' (padrão) | 'AUVO' | 'TODAS', semCanceladas (padrão true) }. Leitura curta guardada por 5 s
 * (a gravação da Assistência limpa). Nunca lança: sem a aba, a origem fica vazia.
 * 18/11/2026: Auvo descontinuado pelo dono (SGO_Auvo_Retirada.js). Sem origem, só as O.S. do SGO+: agenda, qualidade,
 * Conduta, ponto, Frota, recarga semanal e indicadores deixam de contar tarefa do Auvo. As tarefas do Auvo (AUVO_TAREFAS)
 * ficam como histórico: origem 'AUVO' (só elas) ou 'TODAS' (histórico do equipamento, prontuário e Portal do cliente).
 */"""),
("""  if (Ast_up_(o.origem) === 'AUVO') return AST_FONTE_MEMO.auvo.slice();
  if (Ast_up_(o.origem) === 'SGO') return sgoL.slice();
  return AST_FONTE_MEMO.auvo.concat(sgoL);""",
"""  if (Ast_up_(o.origem) === 'AUVO') return AST_FONTE_MEMO.auvo.slice();
  if (Ast_up_(o.origem) === 'TODAS') return AST_FONTE_MEMO.auvo.concat(sgoL);
  return sgoL.slice();"""),
("""/** Abertos agora (para o ponto): check-in sem check-out, não finalizado, das duas origens, por técnico. */""",
 """/** Abertos agora (para o ponto): check-in sem check-out, não finalizado, por técnico (só O.S. do SGO+ desde 18/11/2026). */"""),
("""  var saida = [], vistosAuvo = {};
  SGO_Atendimentos_linhas_().forEach(function (t) {""",
 """  var saida = [], vistosAuvo = {};
  // 18/11/2026: o histórico do Auvo continua aparecendo aqui (prontuário, QR, documentos e Portal do cliente), só para consulta.
  SGO_Atendimentos_linhas_({ origem: 'TODAS' }).forEach(function (t) {"""),
]
