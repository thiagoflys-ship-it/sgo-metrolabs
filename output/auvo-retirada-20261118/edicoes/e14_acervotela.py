ARQ = r'C:\Users\venda\projetos\google-script-dev\output\financeiro-20261116\cand31\SGO_AuvoAcervo_Tela.js'
PARES = [
(""" * Parte "Acervo do Auvo" da tela Integração Auvo (21/10/2026).
 * Servida por AuvoAcervo_obterConteudo (SGO_AuvoAcervo.js) só para Administrador
 * e Diretoria; montada por JS_Auvo.html no topo da tela, depois do painel do Auvo.""",
 """ * Tela "Histórico do Auvo" (21/10/2026; somente consulta desde 18/11/2026, quando o
 * dono descontinuou o Auvo). Servida por AuvoAcervo_obterConteudo (SGO_AuvoAcervo.js)
 * só para Administrador e Diretoria; montada por JS_Auvo.html.
 * Sem botões que falem com o Auvo: situação da cópia, relatório de conferência,
 * falhas registradas e consulta de uma tarefa copiada."""),
("""  var casa = document.getElementById('tplAuvo_viewPainel') || document.getElementById('tplAuvoContainer');""",
 """  var casa = document.getElementById('tplAuvoContainer');"""),
("""      '<div class="acv-cab"><h3>Acervo do Auvo (cópia de segurança)</h3>' +
        '<button type="button" class="acv-btn sec" onclick="acv_ajuda()">Como usar esta parte</button></div>' +
      '<p class="acv-sub">Copia para o servidor do SGO+ tudo o que está no Auvo: o registro completo de cada tarefa, as fotos, as assinaturas e os anexos. ' +
        'Só lê o Auvo: não altera nada lá nem nos atendimentos que o SGO+ já mostra. Visível só para o Administrador e a Diretoria.</p>' +
      '<div class="acv-linha">' +
        '<label>Começar em <input type="month" id="acvInicio" value="2022-01"></label>' +
        '<button type="button" class="acv-btn sec" id="acvBtnContar" onclick="acv_contar()">Contar o acervo</button>' +
        '<button type="button" class="acv-btn" id="acvBtnCopiar" onclick="acv_copiar()">Iniciar cópia</button>' +
        '<button type="button" class="acv-btn sec" id="acvBtnPausar" onclick="acv_acao(&quot;apiPausar&quot;)">Pausar</button>' +
        '<button type="button" class="acv-btn sec" id="acvBtnContinuar" onclick="acv_acao(&quot;apiContinuar&quot;)">Continuar</button>' +
      '</div>' +
      '<div class="acv-linha">' +
        '<button type="button" class="acv-btn sec" id="acvBtnRepetir" onclick="acv_repetir()">Tentar de novo as falhas</button>' +
        '<button type="button" class="acv-btn sec" id="acvBtnConferir" onclick="acv_acao(&quot;apiConferir&quot;)">Conferir arquivos</button>' +
        '<button type="button" class="acv-btn sec" onclick="acv_atualizar()">Atualizar</button>' +
      '</div>' +""",
 """      '<div class="acv-cab"><h3>Histórico do Auvo (sistema descontinuado em 18/11/2026) — somente consulta</h3>' +
        '<button type="button" class="acv-btn sec" onclick="acv_ajuda()">Como usar esta tela</button></div>' +
      '<p class="acv-sub">O Auvo não faz mais parte do SGO+. Aqui fica a cópia que o SGO+ fez do Auvo antes do cancelamento: o registro completo de cada tarefa, as fotos, as assinaturas e os anexos. ' +
        'Nada aqui fala com o Auvo, e nada é apagado. O histórico ligado a cada equipamento continua aparecendo no prontuário, no QR e no Portal do cliente. Visível só para o Administrador e a Diretoria.</p>' +
      '<div class="acv-linha">' +
        '<button type="button" class="acv-btn sec" onclick="acv_atualizar()">Atualizar</button>' +
      '</div>' +"""),
("""  var set = function (id, on) { var b = document.getElementById(id); if (b) b.disabled = !on; };
  set('acvBtnContar', !rodando); set('acvBtnCopiar', !rodando); set('acvBtnPausar', rodando && !e.pausaPedida);
  set('acvBtnContinuar', (sit === 'PAUSADO' || sit === 'ERRO') && !!e.modo);
  set('acvBtnRepetir', !rodando && e.modo === 'COPIA'); set('acvBtnConferir', !rodando && e.modo === 'COPIA');
  if (e.inicio) { var ip = document.getElementById('acvInicio'); if (ip && !ip.dataset.mexido) ip.value = e.inicio; }
""", ""),
("""    h += '<div class="acv-caixa info">Nada foi iniciado ainda. Comece por "Contar o acervo": mostra quantas tarefas, fotos e assinaturas existem e quanto espaço a cópia vai ocupar, sem baixar nada.</div>';""",
 """    h += '<div class="acv-caixa info">Não há cópia registrada do Auvo neste sistema.</div>';"""),
("""    if (e.pausaPedida) h += '<br>Pausa pedida: o lote em andamento termina o passo atual e para.';
    if (sit === 'ERRO') h += '<br>O Auvo ou o servidor falhou ' + acv_n(e.lotesComErro) + ' vezes seguidas. Confira a conexão em "Testar conexão" e toque em "Continuar": a cópia retoma de onde parou.';""",
 """    if (sit !== 'CONCLUIDO') h += '<br>A cópia não será retomada: o Auvo foi descontinuado em 18/11/2026. O que foi copiado até aqui fica guardado para consulta.';"""),
("""      '. Toque em "Tentar de novo as falhas" para colocá-los de volta na fila.</div>' +""",
 """      '. A cópia foi encerrada com o Auvo (18/11/2026): estes arquivos não serão mais copiados.</div>' +"""),
("""    if (!r.achou) { el.innerHTML = '<div class="acv-caixa aviso">A tarefa ' + acv_esc(id) + ' ainda não está no acervo. Se a cópia não terminou, espere; se terminou, confira o número no Auvo.</div>'; return; }""",
 """    if (!r.achou) { el.innerHTML = '<div class="acv-caixa aviso">A tarefa ' + acv_esc(id) + ' não está no histórico copiado. Confira o número (só números) no relatório ou no documento em que ele aparece.</div>'; return; }"""),
('__RE__', r"function acv_inicio\(\) \{.*?\n}\n\n(function acv_atualizar\(\) \{.*?\n}\n\n)function acv_contar\(\) \{.*?\n}\n\nfunction acv_num\(",
 r"\1function acv_num(", 1),
]
