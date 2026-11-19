import io, sys
p = r'C:\Users\venda\projetos\google-script-dev\tests\assistencia-questionarios-tarefas.test.cjs'
raw = io.open(p, encoding='utf-8', newline='').read(); crlf = '\r\n' in raw; s = raw.replace('\r\n', '\n')
P = [
("""  const { amb, leituras } = montar();
  let r;
  for (let k = 0; k < 5; k++) { r = ok(amb.api('s_gil', 'derivarQuestionarios', {})); if (r.situacao.concluido) break; amb.ctx.Ast_memoLimpar_(); }""",
 """  const { amb, leituras } = montar();
  // 18/11/2026: Auvo descontinuado pelo dono. O botão "Montar os checklists a partir das tarefas do Auvo" saiu (a chamada da tela recusa);
  // a montagem continua só pela rotina da Assistência, a partir do acervo já copiado (leitura local, sem o Auvo).
  const SIS = { id: '', nome: 'Rotina da Assistência', perfil: 'SISTEMA', gestao: true, interno: true };
  let r;
  for (let k = 0; k < 5; k++) { r = amb.ctx.AstQ_derivar_(SIS, { sistema: true, lote: 60, orcamentoMs: 90000 }); if (r.situacao.concluido) break; amb.ctx.Ast_memoLimpar_(); }"""),
("""  ok(amb.api('s_gil', 'derivarQuestionarios', { recomecar: true, gerarAgora: true }));""",
 """  amb.ctx.AstQ_derivar_(SIS, { sistema: true, lote: 60, orcamentoMs: 90000, recomecar: true, gerarAgora: true });"""),
("""  assert.match(amb.api('s_tiago', 'derivarQuestionarios', {}).message, /Regras da assistência/);""",
 """  assert.match(amb.api('s_gil', 'derivarQuestionarios', {}).message, /descontinuado/);
  assert.match(amb.api('s_tiago', 'derivarQuestionarios', {}).message, /descontinuado/);"""),
]
for a, b in P:
    if s.count(a) != 1: sys.exit('ERRO %r' % a[:80])
    s = s.replace(a, b)
if crlf: s = s.replace('\n', '\r\n')
io.open(p, 'w', encoding='utf-8', newline='').write(s); print('ok')
