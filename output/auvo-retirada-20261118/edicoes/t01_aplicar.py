import io
p = r'C:\Users\venda\projetos\google-script-dev\tests\auvo-acervo.test.cjs'
s = io.open(p, encoding='utf-8').read()
i = s.index('/* ---------------- testes ---------------- */')
cab = s[:i]
cab = cab.replace("// Acervo do Auvo — etapa 0 da Assistência técnica (21/10/2026).\n",
"// Acervo do Auvo — etapa 0 da Assistência técnica (21/10/2026).\n"
"// 18/11/2026: Auvo descontinuado pelo dono (SGO_Auvo_Retirada.js). A cópia do acervo terminou de vez: contar, copiar, pausar,\n"
"// continuar, repetir falhas e conferir dependiam da API do Auvo e saíram. Os testes da cópia (contagem, lotes, idempotência,\n"
"// falhas, 403, conferência, paginação, pausa, trava, download pendurado, arquivo grande, 25 mil linhas e retomada) foram\n"
"// retirados com essa justificativa; a versão anterior está em output/auvo-retirada-20261118/tests-antes/auvo-acervo.test.cjs.\n"
"// Ficam aqui: a recusa de toda ação que falaria com o Auvo, o gatilho antigo que só se remove, o acesso (só Administrador e\n"
"// Diretoria) e a consulta do que foi copiado (situação, falhas e tarefa com os arquivos), que continua funcionando.\n", 1)
velho = "['SGO_Auvo_Config.js', 'SGO_Auvo_Main.js', 'SGO_AuvoAcervo.js', 'SGO_AuvoAcervo_Tela.js'].forEach"
assert cab.count(velho) == 1
cab = cab.replace(velho, "['SGO_Auvo_Config.js', 'SGO_Auvo_Retirada.js', 'SGO_Auvo_Main.js', 'SGO_AuvoAcervo.js', 'SGO_AuvoAcervo_Tela.js'].forEach")
novos = io.open(r'C:\Users\venda\projetos\google-script-dev\output\auvo-retirada-20261118\edicoes\t01_acervo_testes.cjs', encoding='utf-8').read()
io.open(p, 'w', encoding='utf-8', newline='').write(cab + novos)
print('ok')
