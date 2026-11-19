ARQ = r'C:\Users\venda\projetos\google-script-dev\output\financeiro-20261116\cand31\SGO_Ajuda_Gestao.js'
PARES = [
("pedidos de nova data das atividades, padrões e O.S. do Auvo. Cada item diz", "pedidos de nova data das atividades, padrões e chamados da Assistência técnica. Cada item diz"),
('__RE__', r"        \{ titulo: 'Sanear o acúmulo do Auvo \(11/11/2026\)', itens: \[[^\n]*\] \},\n",
 r"        { titulo: 'Itens do Auvo (18/11/2026)', itens: ['O Auvo foi descontinuado pelo dono em 18/11/2026. As O.S. abertas e sem vínculo do Auvo saíram da caixa na primeira atualização depois disso, marcadas como \"Retirada (Auvo descontinuado)\": não contam como decisão, nem como resolvidas, nem na avaliação.', 'O histórico fica guardado. O que já tinha sido saneado continua registrado.'] },\n", 1),
("Itens do Auvo dependem da próxima sincronização; documentos dependem do cadastro do documento novo.", "Documentos dependem do cadastro do documento novo."),
('__RE__', r"        \{ situacao: 'Aparece \"Há uma providência sendo escrita\" ao tro([^\n]*)' \},\n        \{ situacao: 'No saneamento aparece \"entrou na Caixa[^\n]*\n        \{ situacao: 'No saneamento aparece \"é de\"[^\n]*\n        \{ situacao: 'Marquei uma O\.S\. por engano\.'[^\n]*\n",
 r"        { situacao: 'Aparece \"Há uma providência sendo escrita\" ao tro\1' }\n", 1),
(" e o acúmulo antigo do Auvo à parte (saneamento, fora da nota). A nota oficial", ". A nota oficial"),
('__RE__', r"        \{ titulo: 'Tratar o acúmulo do Auvo', itens: \[[^\n]*\] \},\n", r"", 1),
(""" Em "O.S. do Auvo fica fora da nota quando chega à Caixa com mais de quantos dias", escolha de 7 a 365 (padrão 30).""", ""),
("""        { situacao: 'O gestor tem muitos itens abertos, mas a nota não caiu por eles.', oQueFazer: 'Veja a coluna "Abertos" ("+N no saneamento"): O.S. do Auvo que já chegaram antigas e O.S. sem vínculo ficam fora da nota. Trate-as no saneamento da Caixa.' },""",
 """        { situacao: 'O gestor tem muitos itens abertos, mas a nota não caiu por eles.', oQueFazer: 'Veja a coluna "Abertos": itens de acompanhamento (vencimentos de clientes) e os saneados antes de 18/11/2026 ficam fora da nota.' },"""),
('__RE__', r"        \{ p: 'Por que as O\.S\. antigas do Auvo não contam\?'[^\n]*\n",
 r"        { p: 'E os itens do Auvo que estavam na caixa?', r: 'Saíram em 18/11/2026, quando o Auvo foi descontinuado, marcados como \"Retirada (Auvo descontinuado)\". Não contam como decisão, nem como resolvidos, nem na nota de ninguém. O registro fica guardado.' },\n", 1),
]
