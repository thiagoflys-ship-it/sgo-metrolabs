import io, sys, re
p = r'C:\Users\venda\projetos\google-script-dev\tests\gestao-desempenho.test.cjs'
raw = io.open(p, encoding='utf-8', newline='').read()
crlf = '\r\n' in raw
s = raw.replace('\r\n', '\n')

def sub(padrao, novo):
    global s
    r, n = re.subn(padrao, lambda m: novo, s, flags=re.S)
    if n != 1: sys.exit('ERRO: %d em %r' % (n, padrao[:80]))
    s = r

s = s.replace("""// com volume realista de dados fictícios (tests/_gestao_desempenho_ambiente.cjs). Nada sai de verdade.""",
"""// com volume realista de dados fictícios (tests/_gestao_desempenho_ambiente.cjs). Nada sai de verdade.
// 18/11/2026: Auvo descontinuado pelo dono (SGO_Auvo_Retirada.js). As O.S. do Auvo não entram mais na central nem na Caixa; o que já
// estava aberto sai como RETIRADA (fora da nota, dos resolvidos e do painel). Os testes que mediam o acúmulo do Auvo e o saneamento
// dele foram reescritos para essa regra (comentário datado em cada um); a classificação e a regra da nota continuam como estavam.""", 1)

s = s.replace("const { ambiente, ambienteVolume, osAuvo, atividade } = require('./_gestao_desempenho_ambiente.cjs');",
"""const { ambiente, ambienteVolume, osAuvo, atividade } = require('./_gestao_desempenho_ambiente.cjs');

/** 18/11/2026: itens do Auvo que estavam abertos na Caixa antes da retirada (como na produção), escalados em novembro para o Matheus. */
function sobrasDoAuvo(a, n) {
  for (let k = 0; k < n; k++) a.tabelas.GES_DECISOES.push({ ID: 'sobra' + k, ITEM_ID: 'AUVO:OS:' + (70000000 + k), TIPO: k % 4 ? 'AUVO_OS_ABERTA' : 'AUVO_SEM_VINCULO', MODULO: 'auvo',
    TITULO: 'O.S. nº ' + (70000000 + k) + ' aberta no Auvo há 40 dias', AREA: 'TECNICA', RESPONSAVEIS_IDS: 'u_mat', RESPONSAVEIS_NOMES: 'MATHEUS GESTOR TECNICO TESTE',
    ENTROU_EM: '2026-11-03T10:00', PRAZO_DECISAO: '2026-11-06', ESCALADO_EM: '2026-11-10T10:00', SITUACAO: 'ABERTA', PROVIDENCIAS: 0 });
}""", 1)

sub(r"test\('avaliação: o acúmulo antigo do Auvo e as O\.S\. sem vínculo não pesam na nota; o resto continua igual'.*?\n}\);\n",
"""// 18/11/2026: reescrito. Antes: o acúmulo antigo do Auvo e as O.S. sem vínculo não pesavam na nota. Agora nenhum item do Auvo pesa.
test('avaliação: itens do Auvo que estavam abertos saem como RETIRADA e não pesam na nota; o resto continua igual', () => {
  const a = ambienteVolume();
  assert.equal(a.tabelas.GES_DECISOES.filter((r) => /^AUVO/.test(r.TIPO)).length, 0, 'a central não manda mais O.S. do Auvo para a Caixa');
  sobrasDoAuvo(a, 160);
  a.mudar('2026-11-12T10:00:00-03:00'); a.sincronizar();
  const rows = a.tabelas.GES_DECISOES;
  assert.equal(rows.filter((r) => /^sobra/.test(r.ID) && r.SITUACAO === 'RETIRADA').length, 160);
  const escNov = rows.filter((r) => String(r.ESCALADO_EM).slice(0, 7) === '2026-11' && /u_mat/.test(r.RESPONSAVEIS_IDS));
  const av = ok(a.ctx.Gestao_apiAvaliacao('s_dora', {}));
  const mat = av.gestores.find((g) => g.id === 'u_mat');
  assert.equal(mat.indicadores.escalonamentos, escNov.filter((r) => !/^AUVO/.test(r.TIPO)).length, 'só as decisões de verdade contam');
  assert.ok(mat.indicadores.escalonamentos < 20);
  assert.ok(mat.detalhes.escalados.every((e) => e.tipo && !/^AUVO/.test(String(e.tipo).toUpperCase())), 'detalhe sem item do Auvo');
  const gil = av.gestores.find((g) => g.id === 'u_gil');
  assert.equal(gil.indicadores.escalonamentos, rows.filter((r) => String(r.ESCALADO_EM).slice(0, 7) === '2026-11' && /u_gil/.test(r.RESPONSAVEIS_IDS)).length);
});
""")

s = s.replace("""test('painel: Diretoria vê todos com taxas, áreas e grupos; gestor só o dele; técnico não abre', () => {
  const a = ambienteVolume();
  const p = ok(a.ctx.Gestao_apiPainelDesempenho('s_dora', {}));
  assert.deepEqual(p.gestores.map((g) => g.id).sort(), ['u_bru', 'u_gil', 'u_mat']);
  assert.equal(p.totais.saneamento, 300);
  assert.equal(p.totais.cadastro, 60);
  const mat = p.gestores.find((g) => g.id === 'u_mat');
  assert.ok(mat.carteira >= mat.resolvidos && mat.taxaResolucao !== null);
  assert.equal(mat.foraDaNota, 360);
  assert.ok(p.grupos.some((g) => g.classe === 'SANEAMENTO' && g.qtd === 300 && g.origemMaisAntigaBr));
  assert.ok(p.grupos.some((g) => g.classe === 'CADASTRO' && g.qtd === 60));""",
"""// 18/11/2026: ajustado. Sem o Auvo não há saneamento nem cadastro no painel; as sobras do Auvo retiradas não aparecem.
test('painel: Diretoria vê todos com taxas, áreas e grupos; gestor só o dele; técnico não abre', () => {
  const a = ambienteVolume();
  sobrasDoAuvo(a, 30);
  a.mudar('2026-11-12T10:00:00-03:00'); a.sincronizar();
  const p = ok(a.ctx.Gestao_apiPainelDesempenho('s_dora', {}));
  assert.deepEqual(p.gestores.map((g) => g.id).sort(), ['u_bru', 'u_gil', 'u_mat']);
  assert.equal(p.totais.saneamento, 0);
  assert.equal(p.totais.cadastro, 0);
  const mat = p.gestores.find((g) => g.id === 'u_mat');
  assert.ok(mat.carteira >= mat.resolvidos && mat.taxaResolucao !== null);
  assert.equal(mat.foraDaNota, 0);
  assert.ok(!p.grupos.some((g) => g.classe === 'SANEAMENTO' || g.classe === 'CADASTRO' || /^AUVO/.test(String(g.tipo).toUpperCase())));""", 1)

sub(r"test\('caixa: todos os itens \(sem corte em 400\), classe, repetidos e números só das decisões'.*?\n}\);\n",
"""// 18/11/2026: ajustado. O volume acima de 400 itens vinha das O.S. do Auvo; agora vem de atividades atrasadas da equipe.
test('caixa: todos os itens (sem corte em 400), classe, repetidos e números só das decisões; nada do Auvo', () => {
  const a = ambienteVolume();
  for (let k = 0; k < 120; k++) osAuvo(a, 90000000 + k, 250, '2026-11-11');
  for (let k = 0; k < 420; k++) atividade(a, 'vol' + k, ['u_a1', 'u_a2', 'u_c1', 'u_t1', 'u_t2', 'u_t3'][k % 6], '2026-11-0' + (1 + (k % 5)) + 'T18:00', 'Atividade de volume ' + (k + 1));
  a.sincronizar();
  const c = ok(a.ctx.Gestao_apiCaixa('s_dora', { filtro: 'todas' }));
  assert.ok(c.itens.length > 400, 'antes cortava em 400: ' + c.itens.length);
  assert.equal(c.cortado, false);
  assert.equal(c.resumoTodas.saneamento, 0);
  assert.equal(c.itens.some((i) => /^auvo/.test(i.tipo)), false, 'nenhuma O.S. do Auvo na caixa');
  assert.equal(c.resumoTodas.decisao, c.itens.filter((i) => i.classe === 'DECISAO').length);
  assert.equal(c.resumoTodas.noPrazo + c.resumoTodas.decVencidos >= c.resumoTodas.decisao - c.resumoTodas.decEscalados, true);
  const sug = c.itens.filter((i) => i.tipo === 'conduta_sugestao');
  assert.ok(sug.every((i) => i.repetidos === 3), 'mesmo assunto marcado como repetido');
});
""")

sub(r"test\('saneamento: valida, grava um a um sem apagar, tira da caixa e da avaliação, e o desfazer devolve'.*?\n}\);\n\ntest\('saneamento: dispensar o vínculo das O\.S\. de um técnico do Auvo sem cadastro'.*?\n}\);\n",
"""// 18/11/2026: os dois testes do saneamento (marcar "encerrada fora do SGO+", desfazer e "dispensar o vínculo") saíram: o saneamento
// existia só para as O.S. do Auvo, que não entram mais na Caixa. O que fica: a tela não lista nada, marcar recusa sem gravar e o
// histórico do que já foi saneado continua guardado.
test('saneamento (18/11/2026): sem O.S. do Auvo na caixa não há o que sanear; marcar recusa sem gravar; o histórico fica', () => {
  const a = ambienteVolume();
  sobrasDoAuvo(a, 10);
  a.tabelas.GES_SANEAMENTO = [{ ID: 'h1', ITEM_ID: 'AUVO:OS:1', OS: '1', ACAO: 'ENCERRADA_FORA', MOTIVO: 'Atendimentos de 2025 já faturados', POR_NOME: 'DORA DIRETORA TESTE', CRIADO_EM: '2026-11-11T10:00' }];
  a.mudar('2026-11-12T10:00:00-03:00'); a.sincronizar();
  const s = ok(a.ctx.Gestao_apiSaneamento('s_dora', {}));
  assert.equal(s.os.total, 0);
  assert.equal(s.semVinculo.total, 0);
  const r = a.ctx.Gestao_apiSanear('s_dora', { acao: 'ENCERRADA_FORA', itemIds: ['AUVO:OS:70000001'], motivo: 'Atendimentos antigos já faturados' });
  assert.equal(r.ok, false);
  assert.equal(a.tabelas.GES_SANEAMENTO.length, 1, 'nada gravado; o histórico continua');
  assert.equal(a.tabelas.GES_DECISOES.filter((x) => /^sobra/.test(x.ID) && x.SITUACAO !== 'RETIRADA').length, 0);
});
""")

if crlf: s = s.replace('\n', '\r\n')
io.open(p, 'w', encoding='utf-8', newline='').write(s)
print('ok')
