ARQ = r'C:\Users\venda\projetos\google-script-dev\output\financeiro-20261116\cand31\SGO_Conduta_TelaQualidade.js'
PARES = [
("Sugestões geradas pela Frota, pelo Auvo, pelo Painel de qualidade, por Minhas atividades,",
 "Sugestões geradas pela Frota, pela Assistência técnica, pelo Painel de qualidade, por Minhas atividades,"),
("""    var origemBotao = (s.ORIGEM_LINK || s.ORIGEM_TELA) ? '<button type="button" class="conduta-btn cinza" data-origem-tela="' + esc(s.ORIGEM_TELA) + '" data-origem-link="' + esc(s.ORIGEM_LINK) + '">' + (s.ORIGEM_LINK ? 'Abrir no Auvo' : 'Abrir ' + esc(s.ORIGEM_NOME)) + '</button>' : '';""",
 """    // 18/11/2026: Auvo descontinuado pelo dono; sugestão antiga do Auvo não abre mais link para o Auvo.
    var linkOrigem = s.ORIGEM_MODULO === 'AUVO' ? '' : s.ORIGEM_LINK, telaOrigem = s.ORIGEM_MODULO === 'AUVO' ? '' : s.ORIGEM_TELA;
    var origemBotao = (linkOrigem || telaOrigem) ? '<button type="button" class="conduta-btn cinza" data-origem-tela="' + esc(telaOrigem) + '" data-origem-link="' + esc(linkOrigem) + '">' + (linkOrigem ? 'Abrir o registro de origem' : 'Abrir ' + esc(s.ORIGEM_NOME)) + '</button>' : '';"""),
]
