import io, sys
p = r'C:\Users\venda\projetos\google-script-dev\tests\agenda-unica-os.test.cjs'
raw = io.open(p, encoding='utf-8', newline='').read(); crlf = '\r\n' in raw; s = raw.replace('\r\n', '\n')
P = [
("test('painel da equipe: atendimento com o horário vivo da O.S.; O.S. cancelada sai; indicador sem a O.S.; atendimentos do Auvo (gestão vê todos, o técnico os seus)', () => {",
 "// 18/11/2026: Auvo descontinuado pelo dono. A agenda da equipe não mostra mais atendimentos do Auvo (lista vazia), mesmo com tarefas na aba.\ntest('painel da equipe: atendimento com o horário vivo da O.S.; O.S. cancelada sai; indicador sem a O.S.; nenhum atendimento do Auvo (18/11/2026)', () => {"),
("""  assert.deepEqual(Array.from(r.auvo.map((t) => t.TAREFA)).sort(), ['7001', '7002']);
  const t2 = r.auvo.find((t) => t.TAREFA === '7002');
  assert.equal(t2.FIM, '2026-10-21T11:00'); assert.equal(t2.FINALIZADA, true);
  assert.equal(r.auvo.find((t) => t.TAREFA === '7001').FIM, '2026-10-21T15:30', 'sem saída registrada: 90 min');
  const rt = c.Atividades_apiPainelEquipe('s_tec', {});
  assert.deepEqual(Array.from(rt.auvo.map((t) => t.TAREFA)), ['7001'], 'o técnico vê só os seus');""",
 """  assert.equal(r.auvo.length, 0, 'gestão: nenhum atendimento do Auvo');
  const rt = c.Atividades_apiPainelEquipe('s_tec', {});
  assert.equal(rt.auvo.length, 0, 'técnico: nenhum atendimento do Auvo');"""),
]
for a, b in P:
    if s.count(a) != 1: sys.exit('ERRO %r' % a[:80])
    s = s.replace(a, b)
if crlf: s = s.replace('\n', '\r\n')
io.open(p, 'w', encoding='utf-8', newline='').write(s); print('ok')
