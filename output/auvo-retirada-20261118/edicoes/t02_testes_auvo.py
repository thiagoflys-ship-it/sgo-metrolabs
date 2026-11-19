import io, sys
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

troca('auvo-reconhecer-existente.test.cjs', [
("""  const ajuda = fs.readFileSync(path.join(base, 'SGO_Ajuda_Auvo.js'), 'utf8');
  assert.match(ajuda, /Só este cliente/);
  assert.match(ajuda, /já existia no Auvo/i);
});""",
"""  // 18/11/2026: Auvo descontinuado pelo dono. A tela Integração Auvo não é mais servida (o arquivo fica só como registro) e a
  // ajuda dela saiu; fica só a ajuda do "Histórico do Auvo".
  const ajuda = fs.readFileSync(path.join(base, 'SGO_Ajuda_Auvo.js'), 'utf8');
  assert.doesNotMatch(ajuda, /Só este cliente|"auvo":/);
  assert.match(ajuda, /"auvo_historico"/);
});"""),
])

troca('auvo-tabelas-celular.test.cjs', [
("""  const ajuda = JSON.stringify(ctxA.SGO_ajudaTelas_Auvo_().auvo);
  assert.match(ajuda, /tabelas da tela viram cartões/);
  assert.match(ajuda, /Aberta há N dias/);""",
"""  // 18/11/2026: Auvo descontinuado pelo dono. A ajuda da tela Integração Auvo saiu (a tela não é mais servida); a tela antiga fica
  // no arquivo só como registro, por isso as frases dela continuam conferidas abaixo.
  assert.equal(ctxA.SGO_ajudaTelas_Auvo_().auvo, undefined);
  assert.ok(ctxA.SGO_ajudaTelas_Auvo_().auvo_historico);"""),
])
