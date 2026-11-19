import io, sys
p = r'C:\Users\venda\projetos\google-script-dev\tests\etapa6-administracao-configuracao.test.cjs'
raw = io.open(p, encoding='utf-8', newline='').read(); crlf = '\r\n' in raw; s = raw.replace('\r\n', '\n')
P = [
("""test('Integração Auvo: o texto ao lado da chave liga e desliga, com 44 px no celular; o módulo continua carregando', () => {""",
 """// 18/11/2026: Auvo descontinuado pelo dono. A tela Integração Auvo não é mais servida (Auvo_obterConteudoModulo devolve vazio); o arquivo
// dela fica como registro e continua válido, por isso as conferências de marcação seguem, e a última linha mudou.
test('Integração Auvo: o texto ao lado da chave liga e desliga, com 44 px no celular; o módulo antigo fica válido e não é mais servido', () => {"""),
("""  assert.match(ler('SGO_Auvo_Main.js'), /return AUVO_CONTEUDO_MODULO;/);""",
 """  assert.match(ler('SGO_Auvo_Main.js'), /function Auvo_obterConteudoModulo\(\) \{\n  return '';\n\}/);"""),
("""  assert.match(ler('SGO_Ajuda_Auvo.js'), /Toque também no texto ao lado da chave/);""",
 """  // 18/11/2026: a ajuda da Integração Auvo saiu com a tela (Auvo descontinuado); fica a do Histórico do Auvo.
  assert.match(ler('SGO_Ajuda_Auvo.js'), /"auvo_historico"/);"""),
]
for a, b in P:
    if s.count(a) != 1: sys.exit('ERRO %r' % a[:80])
    s = s.replace(a, b)
if crlf: s = s.replace('\n', '\r\n')
io.open(p, 'w', encoding='utf-8', newline='').write(s); print('ok')
