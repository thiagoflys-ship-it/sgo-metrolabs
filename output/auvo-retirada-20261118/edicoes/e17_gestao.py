ARQ = r'C:\Users\venda\projetos\google-script-dev\output\financeiro-20261116\cand31\JS_Gestao.html'
PARES = [
("""        '<button type="button" class="btn-secondary" onclick="Gestao_carregarCaixa_(true)"><i class="fas fa-rotate" aria-hidden="true"></i>&nbsp;Atualizar</button>' +
        '<button type="button" class="btn-secondary" onclick="Gestao_abrirSaneamento_()"><i class="fas fa-broom" aria-hidden="true"></i>&nbsp;Saneamento</button>' +""",
 """        '<button type="button" class="btn-secondary" onclick="Gestao_carregarCaixa_(true)"><i class="fas fa-rotate" aria-hidden="true"></i>&nbsp;Atualizar</button>' +"""),
("""      'O.S. do Auvo que chegou à caixa com mais de ' + Gestao_esc_(d.saneamentoDias || 30) + ' dias em aberto e O.S. sem vínculo de técnico ficam no bloco de saneamento: não são decisão parada do gestor e não entram na avaliação.' + (d.eu.areas""",
 """      '' + (d.eu.areas"""),
(""" O acúmulo antigo do Auvo fica à parte, no saneamento. Cada gestor vê os próprios números; a Diretoria vê todos.",""",
 """ Cada gestor vê os próprios números; a Diretoria vê todos.","""),
("""        '<button type="button" class="btn-secondary" onclick="abrir(\\'gestao_decisoes\\')"><i class="fas fa-inbox" aria-hidden="true"></i>&nbsp;Caixa de decisões</button>' +
        (Gestao_ehGestao_() ? '<button type="button" class="btn-secondary" onclick="Gestao_abrirSaneamento_()"><i class="fas fa-broom" aria-hidden="true"></i>&nbsp;Saneamento</button>' : '')) +""",
 """        '<button type="button" class="btn-secondary" onclick="abrir(\\'gestao_decisoes\\')"><i class="fas fa-inbox" aria-hidden="true"></i>&nbsp;Caixa de decisões</button>') +"""),
("""      '<p class="gd-just">Fora da nota (11/11/2026): O.S. do Auvo que chegou à Caixa com mais de ' + Gestao_esc_(r.saneamentoDias || 30) + ' dias em aberto no Auvo (acúmulo antigo), O.S. sem vínculo de técnico ou cliente (cadastro) e O.S. saneadas. Elas ficam no saneamento da Caixa. A O.S. que entrou nova e envelheceu na Caixa continua contando: aí o atraso é da gestão.</p>' +""",
 """      '<p class="gd-just">Fora da nota: itens do Auvo, retirados da Caixa quando o Auvo foi descontinuado (18/11/2026), e os saneados antes disso. O histórico fica guardado e não conta para ninguém.</p>' +"""),
("""        '<div class="gd-linha"><label for="gdSanDias">O.S. do Auvo fica fora da nota quando chega à Caixa com mais de quantos dias em aberto (7 a 365)</label><input type="number" min="7" max="365" id="gdSanDias" value="' + Gestao_esc_(r.saneamentoDias || 30) + '"></div>' +
""", ""),
]
