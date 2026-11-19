import io, sys
p = r'C:\Users\venda\projetos\google-script-dev\tests\ponto.test.cjs'
raw = io.open(p, encoding='utf-8', newline='').read(); crlf = '\r\n' in raw; s = raw.replace('\r\n', '\n')
P = [
("""test('PJ, vínculo vazio e fora do piloto não recebem nada; Auvo em atendimento e ausência não são lembrados', () => {
  const a = ambiente();
  a.tabelas.AUVO_TAREFAS.push({ ID: 't1', AUVO_TASK_ID: '9001', TECNICO_ID_SGO: 'u_beto', CHECKIN_EM: '2026-10-19T17:20:00-03:00', CHECKOUT_EM: '', FINALIZADA: 'NAO', CLIENTE_NOME_AUVO: 'Cliente de teste' });""",
 """// 18/11/2026: Auvo descontinuado pelo dono. "Em atendimento" vem só da O.S. do SGO+ (fonte única, origem SGO); a tarefa do Auvo na aba
// não conta mais. O teste usa a O.S. do SGO+ (fonte única simulada) e mantém a tarefa do Auvo para provar que ela é ignorada.
test('PJ, vínculo vazio e fora do piloto não recebem nada; em atendimento numa O.S. e ausência não são lembrados', () => {
  const a = ambiente();
  a.tabelas.AUVO_TAREFAS.push({ ID: 't1', AUVO_TASK_ID: '9001', TECNICO_ID_SGO: 'u_fabio', CHECKIN_EM: '2026-10-19T17:20:00-03:00', CHECKOUT_EM: '', FINALIZADA: 'NAO', CLIENTE_NOME_AUVO: 'Cliente de teste' });
  a.ctx.SGO_Atendimentos_linhas_ = (o) => (o && o.origem === 'SGO' ? [{ ORIGEM: 'SGO', AUVO_TASK_ID: 'OS-2026-0001', TECNICO_ID_SGO: 'u_beto', CHECKIN_EM: '2026-10-19T17:20:00-03:00', CHECKOUT_EM: '', FINALIZADA: 'NAO', CLIENTE_NOME_AUVO: 'Cliente de teste' }] : []);"""),
("""  assert.match(a.marc('u_beto', '2026-10-19', 'SAIDA').OBS, /em atendimento no Auvo/);""",
 """  assert.match(a.marc('u_beto', '2026-10-19', 'SAIDA').OBS, /em atendimento \\(O\\.S\\. OS-2026-0001, chegada 17:20\\)/);"""),
("""  a.tabelas.AUVO_TAREFAS.push({ ID: 't2', AUVO_TASK_ID: '9002', TECNICO_ID_SGO: 'u_ana', CHECKIN_EM: '2026-10-19T08:40:00-03:00', CHECKOUT_EM: '2026-10-19T10:05:00-03:00', FINALIZADA: 'SIM', CLIENTE_NOME_AUVO: 'Cliente de teste' });""",
 """  // 18/11/2026: a evidência vem só das O.S. do SGO+ (Auvo descontinuado pelo dono); a tarefa do Auvo da aba é ignorada
  a.tabelas.AUVO_TAREFAS.push({ ID: 't2', AUVO_TASK_ID: '9002', TECNICO_ID_SGO: 'u_ana', CHECKIN_EM: '2026-10-19T07:00:00-03:00', CHECKOUT_EM: '2026-10-19T07:30:00-03:00', FINALIZADA: 'SIM', CLIENTE_NOME_AUVO: 'Cliente de teste' });
  a.ctx.SGO_Atendimentos_linhas_ = (o) => (o && o.origem === 'SGO' ? [{ ORIGEM: 'SGO', AUVO_TASK_ID: 'OS-2026-0002', TECNICO_ID_SGO: 'u_ana', CHECKIN_EM: '2026-10-19T08:40:00-03:00', CHECKOUT_EM: '2026-10-19T10:05:00-03:00', FINALIZADA: 'SIM', CLIENTE_NOME_AUVO: 'Cliente de teste' }] : []);"""),
("""  assert.match(aj.EVIDENCIA, /check-in 08:40, check-out 10:05/);""",
 """  assert.match(aj.EVIDENCIA, /O\\.S\\. OS-2026-0002\\): chegada 08:40, conclusão 10:05/);
  assert.doesNotMatch(aj.EVIDENCIA, /Auvo|07:00/);"""),
]
for a, b in P:
    if s.count(a) != 1: sys.exit('ERRO %r' % a[:80])
    s = s.replace(a, b)
if crlf: s = s.replace('\n', '\r\n')
io.open(p, 'w', encoding='utf-8', newline='').write(s); print('ok')
