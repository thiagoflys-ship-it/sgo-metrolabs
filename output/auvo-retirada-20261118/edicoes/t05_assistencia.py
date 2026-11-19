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

troca('assistencia.test.cjs', [
("""test('fonte única: Auvo e O.S. do SGO+ na mesma lista, com os campos de sempre; ficha do equipamento junta as duas e o acervo', () => {""",
 """// 18/11/2026: Auvo descontinuado pelo dono. A fonte única, sem origem, devolve só as O.S. do SGO+; as tarefas do Auvo ficam como
// histórico (origem 'AUVO' ou 'TODAS') e continuam na ficha do equipamento.
test('fonte única: O.S. do SGO+ (o Auvo fica só como histórico), com os campos de sempre; ficha do equipamento junta O.S., Auvo e acervo', () => {"""),
("""  const l = amb.ctx.SGO_Atendimentos_linhas_();
  assert.equal(l.length, 2);""",
 """  const l = amb.ctx.SGO_Atendimentos_linhas_({ origem: 'TODAS' });
  assert.equal(l.length, 2);
  assert.deepEqual(JSON.parse(JSON.stringify(amb.ctx.SGO_Atendimentos_linhas_().map((x) => x.ORIGEM))), ['SGO'], 'sem origem: só o SGO+');"""),
('__RE__' + r"test\('transição do Auvo: seis critérios; só o Administrador marca \"Auvo desligado\" e só com todos cumpridos', \(\) => \{.*?\n}\);\n",
 """// 18/11/2026: Auvo descontinuado pelo dono. A "Transição do Auvo" (seis critérios, destino das O.S. abertas e "Auvo desligado")
// saiu da tela e do servidor; o teste antigo foi substituído pela recusa, que não muda nada.
test('transição do Auvo retirada (18/11/2026): transição, confirmar critério, destino e "Auvo desligado" recusam sem mudar nada', () => {
  const amb = ambiente({ tabelas: { AUVO_TAREFAS: [{ ID: 'a1', AUVO_TASK_ID: '45123', CLIENTE_ID_SGO: 'c1', CLIENTE_NOME_AUVO: 'Hospital Teste Alfa', TECNICO_ID_SGO: 'u_tec', TIPO_TAREFA: 'Visita', DATA_TAREFA: '2026-10-15T08:00:00', FINALIZADA: 'NAO' }] } });
  for (const [quem, acao, dados] of [['s_gil', 'transicao', {}], ['s_gil', 'confirmarCriterio', { chave: 'faltasAceitas', texto: 'Aceito as faltas do relatório' }],
    ['s_gil', 'destinoAuvo', { taskId: '45123', destino: 'RECRIAR', texto: 'Continua no SGO+' }], ['s_admin', 'auvoDesligado', { texto: 'Contrato cancelado' }],
    ['s_admin', 'importarAuvo', {}], ['s_admin', 'derivarQuestionarios', {}]]) {
    const r = amb.api(quem, acao, dados);
    assert.equal(r.ok, false, acao);
    assert.match(r.message, /descontinuado em 18\\/11\\/2026/, acao);
  }
  assert.equal((amb.tabelas.ATEC_CHAMADOS || []).length, 0, 'nenhum chamado criado');
});
"""),
])

troca('assistencia-fonte-integracao.test.cjs', [
("""// Fonte única de atendimentos (21/10/2026): os leitores do Auvo passam a ler Auvo + O.S. da Assistência do SGO+ sem quebrar.""",
 """// Fonte única de atendimentos (21/10/2026): os leitores do Auvo passam a ler Auvo + O.S. da Assistência do SGO+ sem quebrar.
// 18/11/2026: Auvo descontinuado pelo dono. Ponto, Conduta, central, Frota, Início e qualidade passam a ler só as O.S. do SGO+; as
// tarefas do Auvo ficam como histórico (ficha do equipamento). Os testes abaixo foram ajustados para isso, com o comentário datado."""),
("""test('ponto: técnico em atendimento pelo aplicativo novo (Cheguei sem Concluí) entra na mesma regra do Auvo; evidência diz a origem', () => {""",
 """test('ponto: técnico em atendimento pelo aplicativo novo (Cheguei sem Concluí) não recebe lembrete; tarefa do Auvo não conta mais (18/11/2026)', () => {"""),
("""  const t = amb.ctx.Ponto_tarefasAuvo_('2026-10-19');
  assert.equal(t.u_tec.length, 2);""",
 """  const t = amb.ctx.Ponto_tarefasAuvo_('2026-10-19');
  assert.equal(t.u_tec.length, 1, '18/11/2026: só a O.S. do SGO+');"""),
("""  assert.match(evid, /Auvo \\(tarefa 45123\\): check-in 08:10/);""",
 """  assert.doesNotMatch(evid, /Auvo/, '18/11/2026: a evidência não usa mais o Auvo');"""),
("""test('central e Conduta: O.S. do SGO+ aberta há 3 dias vira sugestão "O.S. aberta"; qualidade da O.S. encerrada lida pela fonte única leva à ficha da O.S.', () => {""",
 """test('central e Conduta: O.S. do SGO+ aberta há 3 dias vira sugestão "O.S. aberta"; tarefa do Auvo não vira sugestão nem pendência (18/11/2026)', () => {"""),
("""  const sug = amb.ctx.Cndq_coletarAuvo_({}, '2026-10-01', avisos);
  assert.ok(sug.some((s) => s.chave === 'SGO|ABERTA|' + os.numero && /no SGO\\+/.test(s.titulo)), JSON.stringify(sug.map((s) => s.chave)));
  assert.ok(sug.some((s) => s.chave === 'AUVO|SEM_FOTO|45123'), 'o Auvo continua igual');
  // central: item de qualidade da tarefa do Auvo continua com o link do Auvo
  const itens = [];
  amb.ctx.Pend_fonteQualidade_((i) => itens.push(i), { gestao: true, userId: 'u_gt', perfil: 'GESTOR' });
  const q = itens.find((i) => i.id === 'QUAL:OS:45123');
  assert.ok(q && q.tela.tipo === 'link');""",
 """  const sug = amb.ctx.Cndq_coletarAtendimentos_({}, '2026-10-01', avisos);
  assert.ok(sug.some((s) => s.chave === 'SGO|ABERTA|' + os.numero && /no SGO\\+/.test(s.titulo)), JSON.stringify(sug.map((s) => s.chave)));
  assert.equal(sug.some((s) => /^AUVO\\|/.test(s.chave)), false, '18/11/2026: o Auvo não gera mais sugestão');
  // central: tarefa do Auvo sem relato não vira cobrança de qualidade
  const itens = [];
  amb.ctx.Pend_fonteQualidade_((i) => itens.push(i), { gestao: true, userId: 'u_gt', perfil: 'GESTOR' });
  assert.equal(itens.some((i) => i.id === 'QUAL:OS:45123'), false);"""),
("""  assert.match(ler('SGO_Frota_Rastreamento.js'), /SGO_Atendimentos_linhas_\\(\\) : Frota_lerSeExistir_\\(SGO_CFG\\.SHEETS\\.AUVO_TAREFAS\\)/);""",
 """  // 18/11/2026: só a origem SGO (Auvo descontinuado pelo dono)
  assert.match(ler('SGO_Frota_Rastreamento.js'), /SGO_Atendimentos_linhas_\\(\\{ origem: 'SGO' \\}\\) : \\[\\]/);"""),
("""  assert.match(ler('SGO_Main.js'), /fonteUnica \\? SGO_Atendimentos_linhas_\\(\\) : SGO_DATA\\.getAll\\(aba\\)/);""",
 """  assert.match(ler('SGO_Main.js'), /var tarefas = SGO_Atendimentos_linhas_\\(\\{ origem: "SGO" \\}\\);/);"""),
("""  assert.match(ler('SGO_Qualidade_Auvo.js'), /fonteUnica \\? SGO_Atendimentos_linhas_\\(\\) : SGO_DATA\\.getAll\\(aba\\)/);""",
 """  assert.match(ler('SGO_Qualidade_Auvo.js'), /var tarefas = SGO_Atendimentos_linhas_\\(\\{ origem: 'SGO' \\}\\);/);"""),
("""  const imp = ok(amb.api('s_gil', 'importarAuvo', {}));
  assert.equal(imp.modelos, 1); assert.equal(imp.ligados, 1); assert.equal(imp.tiposNovos, 1);
  const mod = amb.tabelas.ATEC_MODELOS.find((m) => m.AUVO_QUESTIONARIO_ID === '189072');
  const perg = JSON.parse(mod.PERGUNTAS_JSON);
  assert.deepEqual(perg.map((p) => p.tipo), ['SIM_NAO', 'FOTO', 'OPCAO']);
  assert.equal(amb.tabelas.ATEC_TIPOS.find((t) => t.CODIGO === 'MANUTENCAO_CORRETIVA').MODELO_CODIGO, 'AUVO_Q189072');
  const imp2 = ok(amb.api('s_gil', 'importarAuvo', {}));
  assert.equal(imp2.modelos, 0, 'sem duplicar');""",
 """  // 18/11/2026: Auvo descontinuado pelo dono. O botão "Trazer os questionários do Auvo" saiu: a chamada recusa e não cria modelo.
  // A importação em si (AstF_importarDoAcervo_, só leitura do acervo já copiado) continua no código, usada só pela rotina.
  const imp = amb.api('s_gil', 'importarAuvo', {});
  assert.equal(imp.ok, false); assert.match(imp.message, /descontinuado/);
  assert.equal((amb.tabelas.ATEC_MODELOS || []).some((m) => m.AUVO_QUESTIONARIO_ID === '189072'), false);
  const r = amb.ctx.AstF_importarDoAcervo_({ id: '', nome: 'Rotina', perfil: 'SISTEMA', gestao: true, interno: true, regras: true }, { sistema: true });
  assert.equal(r.modelos, 1, 'a rotina ainda transforma o que já foi copiado');"""),
])

troca('pedidos-20261118-p3-pendencias.test.cjs', [
("""// texto da visita não registrada. No Auvo: O.S. da foto de pendências que a sincronização das tarefas leu depois já finalizada ou
// com a data passada para o futuro (reagendada no Auvo) não é cobrada.""",
 """// texto da visita não registrada. No Auvo: O.S. da foto de pendências que a sincronização das tarefas leu depois já finalizada ou
// com a data passada para o futuro (reagendada no Auvo) não é cobrada.
// 18/11/2026 (mesmo dia, depois): o dono descontinuou o Auvo; nenhuma O.S. do Auvo é mais cobrada (a fonte saiu da central)."""),
("""test('Auvo: O.S. da foto já finalizada ou reagendada pela sincronização mais nova não é cobrada; leitura antiga não muda nada', () => {""",
 """test('Auvo descontinuado (18/11/2026): nenhuma O.S. da foto de pendências é cobrada, finalizada, reagendada ou aberta', () => {"""),
("""  const ids = amb.pend('s_gil').filter((i) => i.tipo === 'auvo_os_aberta').map((i) => i.id).sort();
  assert.deepEqual(ids, ['AUVO:OS:300', 'AUVO:OS:400', 'AUVO:OS:500']);""",
 """  const ids = amb.pend('s_gil').filter((i) => /^auvo/.test(i.tipo) || /^AUVO:/.test(i.id)).map((i) => i.id).sort();
  assert.deepEqual(ids, []);"""),
])
