import io, sys
T = r'C:\Users\venda\projetos\google-script-dev\tests' + '\\'
def troca(arq, pares):
    p = T + arq
    raw = io.open(p, encoding='utf-8', newline='').read(); crlf = '\r\n' in raw; s = raw.replace('\r\n', '\n')
    for a, b in pares:
        if s.count(a) != 1: sys.exit('ERRO %s %d %r' % (arq, s.count(a), a[:80]))
        s = s.replace(a, b)
    if crlf: s = s.replace('\n', '\r\n')
    io.open(p, 'w', encoding='utf-8', newline='').write(s); print('ok', arq)

COM = "// 18/11/2026: Auvo descontinuado pelo dono; 4 caixas do Auvo saíram do catálogo do lote 0 (150 -> 146).\n"
troca('deposito-viagem-prestacao.test.cjs', [
("test('caixa VIAGEM_CONFERIR no lote 12 (registrada com o módulo; catálogo congelado de 150 intacto) e exceção em Acessos', () => {",
 COM + "test('caixa VIAGEM_CONFERIR no lote 12 (registrada com o módulo; catálogo do lote 0, agora 146, intacto) e exceção em Acessos', () => {"),
("  assert.equal(b.ctx.SGO_poderesCatalogo_().lista.length, 150);", "  assert.equal(b.ctx.SGO_poderesCatalogo_().lista.length, 146);"),
])
troca('deposito-viagem.test.cjs', [
("  assert.equal(cat.lista.length, 158, '150 do catálogo congelado + 8 do lote 12 (E2: VIAGEM_CONFERIR)');\n  // sem o módulo, o catálogo do lote 0 fica como era (150)",
 "  " + COM + "  assert.equal(cat.lista.length, 154, '146 do catálogo do lote 0 + 8 do lote 12 (E2: VIAGEM_CONFERIR)');\n  // sem o módulo, o catálogo do lote 0 fica como era (146)"),
("  assert.equal(b.ctx.SGO_poderesCatalogo_().lista.length, 150);", "  assert.equal(b.ctx.SGO_poderesCatalogo_().lista.length, 146);"),
])
troca('diretoria-informada.test.cjs', [
("test('caixa GESTAO_RELATORIO_DIA: registrada pelo próprio módulo, ligada, padrão Diretoria e dono; sem o módulo o catálogo continua com 150', () => {",
 COM + "test('caixa GESTAO_RELATORIO_DIA: registrada pelo próprio módulo, ligada, padrão Diretoria e dono; sem o módulo o catálogo continua com 146', () => {"),
("  assert.equal(sem.ctx.SGO_poderesCatalogo_().lista.length, 150, 'catálogo congelado do lote 0 sem o módulo');",
 "  assert.equal(sem.ctx.SGO_poderesCatalogo_().lista.length, 146, 'catálogo do lote 0 sem o módulo');"),
])
troca('avisos-gestao-celular.test.cjs', [
("  const t = c.SGO_AvisosMatriz_api('s_dir', 'trilha', {}).trilha[0];",
 "  // 18/11/2026: a trilha também registra a retirada dos eventos do Auvo (S54 a S56); aqui vale a mudança do teste.\n  const t = c.SGO_AvisosMatriz_api('s_dir', 'trilha', {}).trilha.filter((l) => !/^S5[456]$/.test(l.codigo))[0];"),
])
