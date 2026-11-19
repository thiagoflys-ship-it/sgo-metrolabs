ARQ = r'C:\Users\venda\projetos\google-script-dev\output\financeiro-20261116\cand31\SGO_Qualidade_ConteudoModulo.js'
PARES = [
("  var nomes = { frota: 'Frota', auvo: 'Auvo', qualidade: 'Registros', conduta: 'Programa de conduta' };",
 "  var nomes = { frota: 'Frota', qualidade: 'Registros', conduta: 'Programa de conduta' };"),
(""":(res.auvoConfigurado===false?'<span class="stat-num alerta">!</span> Auvo: conexão não configurada — peça ao administrador (Chaves e senhas)':'<span class="stat-num ok">OK</span> integrações respondendo');""",
 """:'<span class="stat-num ok">OK</span> leituras respondendo';"""),
("""'<div class="panel"><h2>Auvo indisponível</h2>""", """'<div class="panel"><h2>Atendimentos indisponíveis</h2>"""),
("""<span class="stat-label">atendimentos Auvo</span>""", """<span class="stat-label">atendimentos da Assistência</span>"""),
("""        '<div class="secao-titulo">Auvo — técnicos e atendimentos</div>' +""",
 """        '<div class="secao-titulo">Assistência técnica — técnicos e atendimentos</div>' +"""),
("""// ------------------------------------------------------------
// AUVO
// ------------------------------------------------------------""",
 """// ------------------------------------------------------------
// ATENDIMENTOS DA ASSISTÊNCIA (área "auvo" até 18/11/2026; só O.S. do SGO+ desde que o Auvo foi descontinuado)
// ------------------------------------------------------------"""),
("""    return '<div class="panel"><h2>Atendimentos do Auvo</h2><p class="indisponivel">Nenhum atendimento do Auvo no período.</p>' +
      '<p class="vazio-orienta">Os atendimentos chegam pela sincronização automática (Integração Auvo › Sincronização automática de tarefas). Se ela estiver desligada, ligue-a lá ou clique em Sincronizar agora.</p></div>';""",
 """    return '<div class="panel"><h2>Atendimentos da Assistência técnica</h2><p class="indisponivel">Nenhuma O.S. da Assistência técnica no período.</p>' +
      '<p class="vazio-orienta">Os atendimentos entram aqui quando a O.S. é registrada em Assistência técnica. Se o período está vazio, confira as O.S. agendadas ou aumente o período.</p></div>';"""),
]
