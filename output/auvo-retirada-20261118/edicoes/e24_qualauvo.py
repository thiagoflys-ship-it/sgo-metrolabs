ARQ = r'C:\Users\venda\projetos\google-script-dev\output\financeiro-20261116\cand31\SGO_Qualidade_Auvo.js'
PARES = [
(""" * PAINEL DE QUALIDADE — coletor da área Auvo (O.S. de campo)
 *""", """ * PAINEL DE QUALIDADE — coletor dos atendimentos de campo (O.S.)
 *
 * 18/11/2026: o Auvo foi descontinuado pelo dono (SGO_Auvo_Retirada.js). O nome
 * do arquivo e das funções ficou (outros módulos chamam), mas o coletor lê só as
 * O.S. da Assistência do SGO+ (fonte única, origem SGO). Tarefa do Auvo não conta.
 *"""),
("""    var tarefas = fonteUnica ? SGO_Atendimentos_linhas_() : SGO_DATA.getAll(aba);""",
 """    if (!fonteUnica) return null;
    var tarefas = SGO_Atendimentos_linhas_({ origem: 'SGO' });"""),
]
