import io, sys, re
T = r'C:\Users\venda\projetos\google-script-dev\tests' + '\\'
def troca(arq, pares):
    p = T + arq
    raw = io.open(p, encoding='utf-8', newline='').read()
    crlf = '\r\n' in raw
    s = raw.replace('\r\n', '\n')
    for a, b in pares:
        if s.count(a) != 1:
            sys.exit('ERRO %s: achou %d de %r' % (arq, s.count(a), a[:100]))
        s = s.replace(a, b)
    if crlf: s = s.replace('\n', '\r\n')
    io.open(p, 'w', encoding='utf-8', newline='').write(s)
    print('ok', arq, len(pares))

troca('conduta-qualidade-areas.test.cjs', [
("""  const r1 = ctx.Conduta_coletarSugestoes_('gil');
  const chaves = tabelas.qual_sugestao.map((s) => s.CHAVE).sort();
  assert.deepEqual(chaves, ['AUVO|SEM_FOTO|9001', 'FROTA|MULTA|m1']);""",
 """  const r1 = ctx.Conduta_coletarSugestoes_('gil');
  const chaves = tabelas.qual_sugestao.map((s) => s.CHAVE).sort();
  // 18/11/2026: Auvo descontinuado pelo dono. A tarefa do Auvo sem foto (9001) não vira mais sugestão (antes: 'AUVO|SEM_FOTO|9001').
  assert.deepEqual(chaves, ['FROTA|MULTA|m1']);"""),
("""  ctx.Conduta_coletarSugestoes_('gil');
  assert.equal(tabelas.qual_sugestao.length, 2, 'segunda coleta não repete');""",
 """  ctx.Conduta_coletarSugestoes_('gil');
  assert.equal(tabelas.qual_sugestao.length, 1, 'segunda coleta não repete');"""),
("""  ctx.Cndq_menosDias_ = () => '2026-08-20';
  ctx.Conduta_coletarSugestoes_('gil');
  const multa = tabelas.qual_sugestao.find((x) => x.CHAVE === 'FROTA|MULTA|m1');""",
 """  ctx.Cndq_menosDias_ = () => '2026-08-20';
  // 18/11/2026: sugestão do Auvo que já estava pendente antes da retirada: a coleta encerra sem cobrança, com o motivo
  tabelas.qual_sugestao.push({ ID: 'sa', CHAVE: 'AUVO|SEM_FOTO|9001', STATUS: 'PENDENTE', COLABORADOR_ID: 'u_tec', TIPO_CODIGO: 'CAM-01', DATA_FATO: '2026-10-10', DETECTADA_EM: HOJE, ORIGEM_MODULO: 'AUVO' });
  ctx.Conduta_coletarSugestoes_('gil');
  const doAuvo = tabelas.qual_sugestao.find((x) => x.ID === 'sa');
  assert.equal(doAuvo.STATUS, 'DESCARTADA');
  assert.equal(doAuvo.DECIDIDA_POR_NOME, 'Sistema');
  assert.match(doAuvo.MOTIVO, /Auvo foi descontinuado em 18\\/11\\/2026.*sem cobrança/);
  assert.equal(tabelas.qual_ocorrencia.length, 0, 'nenhuma ocorrência');
  const multa = tabelas.qual_sugestao.find((x) => x.CHAVE === 'FROTA|MULTA|m1');"""),
("""  const auvo = tabelas.qual_sugestao.find((x) => x.CHAVE === 'AUVO|SEM_FOTO|9001');
  assert.throws(() => ctx.Conduta_apiDescartarSugestao('s', { id: auvo.ID, motivo: 'curto' }), /pelo menos 10/);
  assert.equal(ctx.Conduta_apiDescartarSugestao('s', { id: auvo.ID, motivo: 'Fotos enviadas por e-mail ao cliente.' }).success, true);
  assert.equal(tabelas.qual_sugestao.find((x) => x.ID === auvo.ID).STATUS, 'DESCARTADA');""",
 """  // 18/11/2026: o descarte com motivo é conferido numa sugestão da Frota (antes: a do Auvo, que agora a coleta encerra sozinha)
  tabelas.qual_sugestao.push({ ID: 'sz', CHAVE: 'FROTA|AVARIA|z1', STATUS: 'PENDENTE', COLABORADOR_ID: 'u_tec', TIPO_CODIGO: 'VEI-04', DATA_FATO: HOJE, DETECTADA_EM: HOJE, ORIGEM_MODULO: 'FROTA' });
  assert.throws(() => ctx.Conduta_apiDescartarSugestao('s', { id: 'sz', motivo: 'curto' }), /pelo menos 10/);
  assert.equal(ctx.Conduta_apiDescartarSugestao('s', { id: 'sz', motivo: 'Avaria já registrada no caso da Frota.' }).success, true);
  assert.equal(tabelas.qual_sugestao.find((x) => x.ID === 'sz').STATUS, 'DESCARTADA');"""),
])

troca('certcal-emissao-parcial.test.cjs', [
("""  a.ctx.Auvo_criarTarefa_ = () => { throw Error('Auvo indisponível'); };
  const res = a.ctx.CertCal_apiGerarCertificado('QA', {});
  assert.equal(res.ok, true);
  assert.ok(res.avisos.some(v => v.includes('Inventário de Documentos')));
  assert.ok(res.avisos.some(v => v.includes('Auvo não foi concluída')));""",
 """  // 18/11/2026: Auvo descontinuado pelo dono. A emissão não cria mais tarefa no Auvo: nem chama, nem avisa.
  let chamouAuvo = 0;
  a.ctx.Auvo_criarTarefa_ = () => { chamouAuvo++; throw Error('Auvo indisponível'); };
  const res = a.ctx.CertCal_apiGerarCertificado('QA', {});
  assert.equal(res.ok, true);
  assert.ok(res.avisos.some(v => v.includes('Inventário de Documentos')));
  assert.equal(chamouAuvo, 0);
  assert.ok(!res.avisos.some(v => /Auvo/.test(v)));"""),
])
