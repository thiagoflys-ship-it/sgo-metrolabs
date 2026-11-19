ARQ = r'C:\Users\venda\projetos\google-script-dev\output\financeiro-20261116\cand31\SGO_Atividades.js'
PARES = [
("""/**
 * 26/10/2026: atendimentos do Auvo dos técnicos (AUVO_TAREFAS com técnico ligado ao SGO+), de 60 dias atrás a 120 dias à frente,
 * só para leitura na agenda da equipe, com a etiqueta Auvo. A gestão vê todos; os demais só os próprios. Nunca lança.
 */
function Atividades_agendaAuvo_(eu, usuarios) {
  try {""",
"""/**
 * 26/10/2026: atendimentos do Auvo dos técnicos na agenda da equipe (só leitura).
 * 18/11/2026: Auvo descontinuado pelo dono (SGO_Auvo_Retirada.js). A agenda passa a mostrar só o que é do SGO+ (atividades e
 * O.S. da Assistência); a lista do Auvo volta vazia. O corpo antigo fica abaixo do retorno apenas como registro. Nunca lança.
 */
function Atividades_agendaAuvo_(eu, usuarios) {
  return [];
  try {"""),
(""" * O.S. ou tarefa do Auvo da pessoa: avisa na mensagem e não bloqueia (a gestão decide). Atividade só com prazo não conta.""",
 """ * O.S. da pessoa (18/11/2026: tarefa do Auvo não conta mais): avisa na mensagem e não bloqueia (a gestão decide). Atividade só com prazo não conta."""),
]
