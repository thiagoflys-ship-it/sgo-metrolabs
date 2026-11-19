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

troca('sedna.test.cjs', [
("""    { tipo: 'auvo_sem_vinculo', rotulo: 'Revisar', qtd: 259 }, { tipo: 'auvo_os_aberta', rotulo: 'Revisar', qtd: 168 }
  ];""",
 """    // 18/11/2026: Auvo descontinuado pelo dono; os tipos auvo_sem_vinculo (259) e auvo_os_aberta (168) saíram da central. No lugar,
    // dois tipos que continuam existindo, com os mesmos números.
    { tipo: 'qualidade_mov', rotulo: 'Revisar', qtd: 259 }, { tipo: 'atividade_atrasada', rotulo: 'Atrasada', qtd: 168 }
  ];"""),
("""  assert.deepEqual(m, [{ grupo: 'pedidos de nova data para decidir', qtd: 261 }, { grupo: 'O.S. do Auvo sem vínculo de cadastro', qtd: 259 }, { grupo: 'O.S. abertas no Auvo', qtd: 168 }]);""",
 """  assert.deepEqual(m, [{ grupo: 'pedidos de nova data para decidir', qtd: 261 }, { grupo: 'retiradas de veículos com registro incompleto', qtd: 259 }, { grupo: 'atividades atrasadas', qtd: 168 }]);"""),
("""Maiores grupos: 261 pedidos de nova data para decidir; 259 O.S. do Auvo sem vínculo de cadastro; 168 O.S. abertas no Auvo./);""",
 """Maiores grupos: 261 pedidos de nova data para decidir; 259 retiradas de veículos com registro incompleto; 168 atividades atrasadas./);"""),
])

troca('assistencia-tela.test.cjs', [
("""const MODS = ['assistencia', 'assistencia_abrir', 'assistencia_os', 'assistencia_agenda', 'assistencia_solicitacoes', 'assistencia_casos', 'assistencia_indicadores', 'assistencia_regras', 'assistencia_transicao', 'assistencia_portal'];

test('casca: grupo do menu com as 10 telas, include,""",
 """// 18/11/2026: Auvo descontinuado pelo dono. A tela "Transição do Auvo" (assistencia_transicao) saiu do menu, da rota e da ajuda: 9 telas.
const MODS = ['assistencia', 'assistencia_abrir', 'assistencia_os', 'assistencia_agenda', 'assistencia_solicitacoes', 'assistencia_casos', 'assistencia_indicadores', 'assistencia_regras', 'assistencia_portal'];

test('casca: grupo do menu com as 9 telas (a Transição do Auvo saiu em 18/11/2026), include,"""),
("""  MODS.forEach((m) => assert.match(idx, new RegExp('data-mod="' + m + '"[^>]*onclick="abrir\\\\(\\'' + m + '\\'\\\\)"'), m));""",
 """  MODS.forEach((m) => assert.match(idx, new RegExp('data-mod="' + m + '"[^>]*onclick="abrir\\\\(\\'' + m + '\\'\\\\)"'), m));
  assert.doesNotMatch(idx, /assistencia_transicao/);"""),
("""  MODS.forEach((m) => assert.match(aj, new RegExp(m + ': \\'')));""",
 """  MODS.forEach((m) => assert.match(aj, new RegExp(m + ': \\'')));
  assert.equal(a.assistencia_transicao, undefined, '18/11/2026: a ajuda da Transição do Auvo saiu');"""),
("""  ['Prazos de atendimento', 'Ordem de serviço', 'Transição do Auvo', 'Orçamento do chamado', 'Fonte única'].forEach(""",
 """  // 18/11/2026: a seção "Transição do Auvo" do manual virou "Fim do Auvo (18/11/2026)".
  ['Prazos de atendimento', 'Ordem de serviço', 'Fim do Auvo', 'Orçamento do chamado', 'Fonte única'].forEach("""),
])
