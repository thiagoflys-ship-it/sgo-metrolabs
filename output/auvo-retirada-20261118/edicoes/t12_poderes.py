import io, sys
p = r'C:\Users\venda\projetos\google-script-dev\tests\poderes-lote0.test.cjs'
raw = io.open(p, encoding='utf-8', newline='').read(); crlf = '\r\n' in raw; s = raw.replace('\r\n', '\n')
P = [
("""const catalogo = JSON.parse(fs.readFileSync(path.join(pastaPoderes, 'catalogo.json'), 'utf8'));""",
 """const catalogo = JSON.parse(fs.readFileSync(path.join(pastaPoderes, 'catalogo.json'), 'utf8'));
// 18/11/2026: Auvo descontinuado pelo dono (SGO_Auvo_Retirada.js). Saíram 4 caixas que só existiam para o Auvo (integração, ferramentas
// de implantação, "Auvo desligado" e faltas do acervo): o catálogo de referência (catalogo.json, congelado em 10/11/2026) é lido sem
// elas, e o total passa de 150 para 146. Outras 8 caixas tiveram só o texto ajustado para não citar mais a integração; nelas o teste
// confere que o texto não fala mais do Auvo ativo, em vez de comparar com o texto antigo do catálogo.
const RETIRADAS_AUVO = ['AST_DESLIGAR_AUVO', 'AST_ACEITAR_FALTAS_ACERVO', 'AUVO_INTEGRACAO', 'AUVO_IMPLANTACAO'];
const TEXTO_AJUSTADO_AUVO = ['SISTEMA_SEGREDOS_SERVIDOR', 'AST_GESTAO', 'AST_REGRAS', 'GESTAO_RESUMO_DIARIO', 'AUVO_ACERVO', 'QUALIDADE_VER_PAINEL', 'QUALIDADE_REGISTRAR', 'INICIO_PENDENCIAS_ADMIN'];
catalogo.poderes = catalogo.poderes.filter((p) => RETIRADAS_AUVO.indexOf(p.codigo) < 0);
const TOTAL_PODERES = 146;"""),
("""  assert.equal(cat.lista.length, 150);
  assert.deepEqual(Array.from(cat.lista, (p) => p.codigo), catalogo.poderes.map((p) => p.codigo));
  for (const p of cat.lista) {
    const ref = catalogo.poderes.find((x) => x.codigo === p.codigo);
    assert.equal(p.modulo, ref.modulo); assert.equal(p.categoria, ref.categoria); assert.equal(p.lote, ref.lote); assert.equal(p.descricao, ref.descricao);""",
 """  assert.equal(cat.lista.length, TOTAL_PODERES);
  assert.equal(catalogo.poderes.length, TOTAL_PODERES);
  assert.deepEqual(Array.from(cat.lista, (p) => p.codigo), catalogo.poderes.map((p) => p.codigo));
  for (const p of cat.lista) {
    const ref = catalogo.poderes.find((x) => x.codigo === p.codigo);
    assert.equal(p.categoria, ref.categoria); assert.equal(p.lote, ref.lote);
    if (TEXTO_AJUSTADO_AUVO.indexOf(p.codigo) >= 0) assert.doesNotMatch(p.modulo + ' ' + p.nome + ' ' + p.descricao, /Integração Auvo|transição do Auvo|questionários do Auvo|resumo do Auvo|revisão do Auvo|O\\.S\\. do Auvo|Omie, Auvo/, p.codigo);
    else { assert.equal(p.modulo, ref.modulo); assert.equal(p.descricao, ref.descricao); }"""),
("""  assert.equal(comparacoes, 150 * 23);""", """  assert.equal(comparacoes, TOTAL_PODERES * 23);"""),
("""'Comparações: ' + comparacoes + ' (150 poderes × 23 contas).""", """'Comparações: ' + comparacoes + ' (' + TOTAL_PODERES + ' poderes × 23 contas)."""),
("""  assert.equal(t.grupos.reduce((s, g) => s + g.itens.length, 0), 150);""", """  assert.equal(t.grupos.reduce((s, g) => s + g.itens.length, 0), TOTAL_PODERES);"""),
]
for a, b in P:
    if s.count(a) != 1: sys.exit('ERRO %d %r' % (s.count(a), a[:80]))
    s = s.replace(a, b)
if crlf: s = s.replace('\n', '\r\n')
io.open(p, 'w', encoding='utf-8', newline='').write(s); print('ok')
