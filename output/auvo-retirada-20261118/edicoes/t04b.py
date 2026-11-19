import io
p = r'C:\Users\venda\projetos\google-script-dev\tests\matriz-avisos.test.cjs'
s = io.open(p, encoding='utf-8', newline='').read()
a = "  const t = c.SGO_AvisosMatriz_api('s_dir', 'trilha', {}).trilha;\n  assert.equal(t[0].codigo, 'S33');"
b = "  // 18/11/2026: a trilha também traz a retirada dos eventos do Auvo (S54 a S56, datada de 18/11/2026); aqui vale a mudança do teste.\n  const t = c.SGO_AvisosMatriz_api('s_dir', 'trilha', {}).trilha.filter((l) => !/^S5[456]$/.test(l.codigo));\n  assert.equal(t[0].codigo, 'S33');"
assert s.count(a) == 1
s = s.replace(a, b)
a2 = "  assert.deepEqual(t.map((l) => l.codigo).sort(), ['S54', 'S55', 'S56']);"
assert s.count(a2) == 1
s = s.replace(a2, "  assert.deepEqual(JSON.parse(JSON.stringify(t.map((l) => l.codigo).sort())), ['S54', 'S55', 'S56']);")
io.open(p, 'w', encoding='utf-8', newline='').write(s)
print('ok')
