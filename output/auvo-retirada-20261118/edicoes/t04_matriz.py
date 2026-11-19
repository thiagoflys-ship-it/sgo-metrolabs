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

troca('matriz-avisos.test.cjs', [
("""  assert.equal(r.regras.length, 99);""",
 """  // 18/11/2026: Auvo descontinuado pelo dono; S54, S55 e S56 (chamados do Auvo) saíram da matriz e ficam na trilha como retirados. Antes: 99.
  assert.equal(r.regras.length, 96);"""),
("""  assert.equal(por.S55.decisao, 'HISTORICO');
""", """  assert.equal(por.S54 || por.S55 || por.S56, undefined, 'eventos do Auvo retirados');
"""),
("""  assert.equal(por.S56.whatsapp, 'NAO', 'WhatsApp ao cliente só depois do piloto');
""", ""),
("""test('vira histórico: chamado do Auvo concluído (S55) não avisa ninguém; missão cadastrada (S53) fica só no sistema', () => {
  const amb = ambiente();
  const r = notificar(amb, { usuarios: ['u_tec', 'u_gt'], canais: ['email', 'whatsapp'], origem: 'AUVO_OS', evento: 'S55' });
  assert.deepEqual([r.ok, r.erro, r.pulado], [0, 0, 0]);
  assert.equal(amb.tabelas.NTF_ENVIOS.length, 0, 'nenhum envio, nenhuma linha');
  assert.equal(amb.emails.length + amb.whats.length, 0);
  const r2 = notificar""",
 """// 18/11/2026: Auvo descontinuado pelo dono. O exemplo do chamado do Auvo concluído (S55) saiu com o evento; o "vira histórico"
// continua provado abaixo pelo evento que o Administrador transforma em histórico (S43).
test('vira histórico: missão cadastrada (S53) fica só no sistema; evento transformado em histórico para de avisar', () => {
  const amb = ambiente();
  const r2 = notificar"""),
("""  assert.deepEqual(Array.from(c.SGO_avisoGestoresDe_('auvo')), ['u_gt']);""",
 """  // 18/11/2026: o módulo "auvo" saiu (Auvo descontinuado); NR-13 continua com a área Técnica.
  assert.deepEqual(Array.from(c.SGO_avisoGestoresDe_('nr13')), ['u_gt']);"""),
("""  // pela gestão, reserva cancelada, missão aprovada, chamado do Auvo aberto e concluído, 1 aviso do Comercial.""",
 """  // pela gestão, reserva cancelada, missão aprovada, 1 aviso do Comercial. (18/11/2026: o chamado do Auvo aberto e concluído saiu
  // dos fatos, porque o Auvo foi descontinuado pelo dono e os eventos S54 e S55 não existem mais.)"""),
("""    { canais: ['sgo', 'email'], origem: 'CONDUTA', evento: 'S52' }, { canais: ['email'], origem: 'AUVO_OS', evento: 'S54' }, { canais: ['email'], origem: 'AUVO_OS', evento: 'S55' },""",
 """    { canais: ['sgo', 'email'], origem: 'CONDUTA', evento: 'S52' },"""),
("""  const antesWhats = 4 /* aviso com ciência, retirada, missão, chamado aberto */ + 1 /* chamado concluído */ + 1 /* resumo de atividades */;""",
 """  const antesWhats = 3 /* aviso com ciência, retirada, missão */ + 1 /* resumo de atividades */;"""),
('__RE__' + r"// -{66} Auvo\ntest\('Auvo: chamado aberto vai só ao técnico.*?\n}\);\n",
 """// ------------------------------------------------------------------ Auvo (18/11/2026: descontinuado pelo dono)
// O teste dos avisos de chamado do Auvo (S54 ao técnico, S55 histórico, S56 ao cliente) saiu: a sincronização que os gerava foi
// retirada. Fica a prova de que os eventos não estão mais na matriz e de que a retirada está registrada na trilha.
test('Auvo descontinuado: S54, S55 e S56 fora da matriz e registrados na trilha como retirados em 18/11/2026', () => {
  const amb = ambiente();
  const c = amb.ctx;
  assert.equal(c.MTZ_PADRAO.some((e) => e.modulo === 'auvo'), false);
  const t = c.SGO_AvisosMatriz_api('s_dir', 'trilha', {}).trilha.filter((l) => /^S5[456]$/.test(l.codigo));
  assert.deepEqual(t.map((l) => l.codigo).sort(), ['S54', 'S55', 'S56']);
  assert.ok(t.every((l) => l.emBr === '18/11/2026 00:00' && /descontinuado/.test(l.motivo)));
});
"""),
])
