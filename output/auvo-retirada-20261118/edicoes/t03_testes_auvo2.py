import io, sys, re
T = r'C:\Users\venda\projetos\google-script-dev\tests' + '\\'
def troca(arq, pares):
    p = T + arq
    raw = io.open(p, encoding='utf-8', newline='').read()
    crlf = '\r\n' in raw
    s = raw.replace('\r\n', '\n')
    for a, b in pares:
        if a.startswith('__RE__'):
            novo, n = re.subn(a[6:], b, s, flags=re.S)
            if n != 1: sys.exit('ERRO %s: regex achou %d' % (arq, n))
            s = novo; continue
        if s.count(a) != 1:
            sys.exit('ERRO %s: achou %d de %r' % (arq, s.count(a), a[:100]))
        s = s.replace(a, b)
    if crlf: s = s.replace('\n', '\r\n')
    io.open(p, 'w', encoding='utf-8', newline='').write(s)
    print('ok', arq, len(pares))

troca('auvo-gestao-envio-cliente.test.cjs', [
("""// Integração Auvo (26/10/2026, pedido do dono): a gestão (Gestor e Diretoria) envia ao Auvo a correção de UM cliente
// e o cadastro pendente; lote, técnicos, importação completa e auditoria continuam só do Administrador.""",
 """// Integração Auvo (26/10/2026, pedido do dono): a gestão (Gestor e Diretoria) enviava ao Auvo a correção de UM cliente
// e o cadastro pendente; lote, técnicos, importação completa e auditoria eram só do Administrador.
// 18/11/2026: Auvo descontinuado pelo dono (SGO_Auvo_Retirada.js). Ninguém envia mais nada ao Auvo: os três testes de quem podia
// enviar o quê viraram um só, que confere a recusa para todos os perfis; a consulta de uma O.S. já copiada continua da gestão."""),
("""  const fonte = fs.readFileSync(path.join(base, 'SGO_Auvo_Main.js'), 'utf8');""",
 """  const fonte = fs.readFileSync(path.join(base, 'SGO_Auvo_Main.js'), 'utf8');
  const retirada = fs.readFileSync(path.join(base, 'SGO_Auvo_Retirada.js'), 'utf8');"""),
("""  vm.runInContext(fonte, ctx, { filename: 'SGO_Auvo_Main.js' });""",
 """  vm.runInContext(retirada, ctx, { filename: 'SGO_Auvo_Retirada.js' });
  vm.runInContext(fonte, ctx, { filename: 'SGO_Auvo_Main.js' });"""),
('__RE__' + r"test\('Gestor e Diretoria enviam a correção de um cliente e o cadastro pendente'.*?\n}\);\n\ntest\('lote, técnicos, importação completa e auditoria continuam só do Administrador'.*?\n}\);\n\ntest\('quem não é da gestão não envia nada ao Auvo'.*?\n}\);\n",
 """test('18/11/2026: ninguém envia nada ao Auvo (nenhum perfil, nenhuma função de envio, sincronização ou implantação)', () => {
  for (const s of ['s_ges', 's_dir', 's_adm', 's_tec']) {
    const { api, chamadas } = ambiente();
    for (const fn of ['apiSincronizarCliente', 'apiSimularEnvioCadastro', 'apiEnviarUnidadesPendentes', 'apiIniciarEnvioEquipamentos', 'apiContinuarEnvioEquipamentos',
      'apiSincronizarTodosClientes', 'apiSincronizarTodosTecnicos', 'apiSincronizarTecnico', 'apiBuscarTecnicoParaSync', 'apiIniciarSincronizacaoReversa',
      'apiAuditarNomesParecidos', 'apiDefinirEmailUsuario', 'apiTestarConexao', 'apiAtivarSincronizacaoIncremental', 'apiListarPendencias', 'apiGerarRelatorio']) {
      assert.throws(() => api(s, fn, { clienteId: 'c1' }), /O Auvo foi descontinuado em 18\\/11\\/2026/, s + ' ' + fn);
    }
    assert.deepEqual(chamadas, [], 'nenhuma função de envio foi chamada');
  }
});
"""),
])

troca('auvo-pendencias-um-ano.test.cjs', [
("""test('relatório e central de pendências usam o mesmo corte', () => {
  for (const f of ['SGO_Auvo_Relatorio.js', 'SGO_Alertas_Central.js']) {
    assert.match(fs.readFileSync(path.join(base, f), 'utf8'), /Auvo_pendDentroDaJanela_\\(p\\)/, f);
  }
});""",
 """// 18/11/2026: Auvo descontinuado pelo dono. A central de pendências não lê mais o Auvo (a fonte saiu); a lista da tela antiga e o
// relatório ficam só no código, sem tela. O teste confere que a central não usa mais as O.S. do Auvo.
test('relatório usa o corte de 1 ano; a central de pendências não lê mais o Auvo (18/11/2026)', () => {
  assert.match(fs.readFileSync(path.join(base, 'SGO_Auvo_Relatorio.js'), 'utf8'), /Auvo_pendDentroDaJanela_\\(p\\)/);
  const central = fs.readFileSync(path.join(base, 'SGO_Alertas_Central.js'), 'utf8');
  assert.doesNotMatch(central, /Auvo_pendDentroDaJanela_|Pend_fonteAuvo_|AUVO_PENDENCIAS\\)/);
});"""),
])

troca('vinculos-auvo-unidade.test.cjs', [
("""test('excluir: vale o original — unidade que é o cadastro original de um cliente Auvo, ou com tarefa do Auvo nesse cliente, não é excluída (caminho na mensagem)', () => {
  const s = snap();
  s.tables.AUVO_SYNC[0].CHAVE = 'UNIDADE:AUVOID:9000001';
  const p = plano(s, 'EXCLUIR');
  assert.equal(p.blocks.length, 1, p.blocks.join(' | '));
  assert.match(p.blocks[0], /9000001/);
  assert.match(p.blocks[0], /Inativar/);
  assert.match(p.blocks[0], /Consolidar/);
  const s2 = snap({ AUVO_TAREFAS: [{ ID: 't1', AUVO_TASK_ID: '777', CLIENTE_AUVO_ID: 9000001, CLIENTE_ID_SGO: 'cA', FINALIZADA: 'SIM' }] });
  const p2 = plano(s2, 'EXCLUIR');
  assert.ok(p2.blocks.some((b) => /9000001/.test(b) && /Inativar/.test(b)), p2.blocks.join(' | '));
});""",
 """// 18/11/2026: Auvo descontinuado pelo dono. "Vale o original" protegia a ligação viva com o Auvo; sem o Auvo, a ligação é só
// histórico: a unidade original de um cliente Auvo (ou com tarefa do Auvo) pode ser excluída e a ligação fica guardada.
test('excluir: unidade que era o cadastro original de um cliente Auvo, ou com tarefa do Auvo, pode ser excluída (ligação guardada como histórico)', () => {
  const s = snap();
  s.tables.AUVO_SYNC[0].CHAVE = 'UNIDADE:AUVOID:9000001';
  const p = plano(s, 'EXCLUIR');
  assert.deepEqual(p.blocks, [], p.blocks.join(' | '));
  assert.ok(p.warnings.some((w) => /histórico do Auvo/.test(w) && /9000001/.test(w)), p.warnings.join(' | '));
  const s2 = snap({ AUVO_TAREFAS: [{ ID: 't1', AUVO_TASK_ID: '777', CLIENTE_AUVO_ID: 9000001, CLIENTE_ID_SGO: 'cA', FINALIZADA: 'SIM' }] });
  const p2 = plano(s2, 'EXCLUIR');
  assert.equal(p2.blocks.some((b) => /9000001/.test(b)), false, p2.blocks.join(' | '));
});"""),
])
