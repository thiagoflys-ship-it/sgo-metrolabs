import io, re
p = r'C:\Users\venda\projetos\google-script-dev\tests\etapa6-administracao-configuracao.test.cjs'
raw = io.open(p, encoding='utf-8', newline='').read()
crlf = '\r\n' in raw
s = raw.replace('\r\n', '\n')
novo, n = re.subn(r"  assert\.match\(ler\('SGO_Auvo_Main\.js'\), /function Auvo_obterConteudoModulo\\\(\\\) \\\{\n  return '';\n\\\}/\);",
                  lambda m: r"  assert.match(ler('SGO_Auvo_Main.js'), /function Auvo_obterConteudoModulo\(\) \{\s*return '';\s*\}/);", s)
assert n == 1, n
s = novo
if crlf: s = s.replace('\n', '\r\n')
io.open(p, 'w', encoding='utf-8', newline='').write(s)
print('ok')
