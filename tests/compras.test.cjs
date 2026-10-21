// Compras e peças nativo do SGO+ (21/10/2026): pedido de peça com especificação e vínculo, fornecedores, regras,
// cotações e aprovação por faixa, pedido de compra A4, recebimento, entrega, Comercial, Financeiro e relatório.
// Código real num contexto isolado (tests/_compras_ambiente.cjs). Só dados de teste; relógio fixo (não depende da hora real).
const test = require('node:test');
const assert = require('node:assert/strict');
const { ambiente, FOTO, regrasDeTeste, fornecedoresDeTeste, pedidoSimples, CNPJS } = require('./_compras_ambiente.cjs');

const ok = (r) => { assert.equal(r.ok, true, r.message); return r; };
const pend = (amb, sid) => amb.ctx.SGO_Pendencias_listar(sid, { semCache: true }).itens;
const semValor = (t, onde) => assert.doesNotMatch(String(t), /R\$\s?\d/, 'sem valor em ' + onde + ': ' + String(t).slice(0, 160));

function pecaIncompleta(amb, sid) {
  return ok(amb.api(sid || 's_tiago', 'salvarRequisicao', { urgencia: 'CRITICA', finalidade: 'Troca da resistência da autoclave AC-01 parada na CME', vinculo: { tipo: 'CLIENTE', clienteId: 'c1', unidadeId: 'un1', osAuvo: '12345' },
    itens: [{ categoria: 'PECA', descricao: 'Resistência da câmara', quantidade: 1, unidade: 'un.', equipamentoId: 'eq1' }] })).requisicao;
}

// ------------------------------------------------------------------ etapa 1
test('etapa 1 · quem pediu não vê valores nem a fila; técnico, metrologia e RH pedem e acompanham; comprador e gestores veem a fila', () => {
  const amb = ambiente();
  regrasDeTeste(amb);
  for (const sid of ['s_tiago', 's_mara', 's_rita', 's_vera']) {
    const a = ok(amb.api(sid, 'acesso'));
    assert.equal(a.veValores, sid === 's_vera' ? false : false, sid);
    assert.equal(a.veFila, false, sid);
    assert.match(amb.api(sid, 'fila').message, /fila de compras é dos compradores/);
    assert.match(amb.api(sid, 'fornecedores').message, /valores de compra ficam só com/);
    assert.match(amb.api(sid, 'salvarFornecedor', { documento: CNPJS[0], razao: 'TESTE' }).message, /ação é do comprador/);
  }
  for (const sid of ['s_carlos', 's_sara', 's_lia', 's_gil', 's_dora']) assert.equal(ok(amb.api(sid, 'acesso')).veFila, true, sid);
  assert.equal(ok(amb.api('s_fabio', 'acesso')).financeiro, true);
  assert.equal(ok(amb.api('s_fabio', 'acesso')).veFila, false);
  assert.equal(amb.api('s_cliente_inexistente', 'acesso').ok, false);
  const r = pedidoSimples(amb);
  const meus = ok(amb.api('s_tiago', 'meus')).requisicoes;
  assert.equal(meus.length, 1);
  assert.equal(meus[0].valorTxt, undefined, 'solicitante não recebe valor');
  assert.equal(meus[0].veValores, false);
  assert.equal(amb.api('s_tales', 'requisicao', { id: r.id }).ok, false, 'outro técnico não abre o pedido de outra pessoa');
  assert.match(amb.api('s_tales', 'requisicao', { id: r.id }).message, /é de TIAGO TECNICO TESTE/);
  assert.equal(ok(amb.api('s_carlos', 'fila')).requisicoes.length, 1);
});

test('etapa 1 · vínculo e finalidade obrigatórios; pedido do Comercial só aprovado; uso interno explicado', () => {
  const amb = ambiente();
  regrasDeTeste(amb);
  const base = { urgencia: 'NORMAL', finalidade: 'Material para a sede administrativa', itens: [{ categoria: 'ESCRITORIO', descricao: 'Papel A4 resma', quantidade: 5, unidade: 'resma' }] };
  assert.match(amb.api('s_tiago', 'salvarRequisicao', base).message, /diga a que a compra está ligada/);
  assert.match(amb.api('s_tiago', 'salvarRequisicao', Object.assign({}, base, { vinculo: { tipo: 'INTERNO', motivoInterno: 'escritório' } })).message, /pelo menos 20 letras/);
  assert.match(amb.api('s_tiago', 'salvarRequisicao', Object.assign({}, base, { finalidade: 'papel', vinculo: { tipo: 'INTERNO', motivoInterno: 'Material de escritório da recepção da sede' } })).message, /para que é a compra/);
  amb.tabelas.COM_PROPOSTAS = [{ ID: 'p1', NUMERO: 'PROP-2026-0009', SITUACAO: 'ENVIADA', CLIENTE_ID: 'c1', CLIENTE_NOME: 'Hospital Teste Alfa' }];
  assert.match(amb.api('s_tiago', 'salvarRequisicao', Object.assign({}, base, { vinculo: { tipo: 'COMERCIAL', propostaId: 'p1' } })).message, /ainda não foi aprovada pelo cliente/);
  const v = ok(amb.api('s_tiago', 'salvarRequisicao', Object.assign({}, base, { vinculo: { tipo: 'VEICULO', veiculoId: 'v1' } }))).requisicao;
  assert.match(v.vinculo.texto, /TST1A23/);
  assert.match(amb.api('s_tiago', 'salvarRequisicao', Object.assign({}, base, { vinculo: { tipo: 'INTERNO', motivoInterno: 'Material de escritório da recepção da sede' }, itens: [{ categoria: 'ESCRITORIO', descricao: 'Papel', quantidade: 0 }] })).message, /sem quantidade/);
});

test('etapa 1 · especificação incompleta não avança: pendência para quem pediu, sem atividade de cotar; completa vira atividade do comprador', () => {
  const amb = ambiente();
  regrasDeTeste(amb);
  const r = pecaIncompleta(amb);
  assert.equal(r.especIncompleta, true);
  assert.ok(r.falta.some((f) => /foto da peça/.test(f)) && r.falta.some((f) => /número da peça/.test(f)), JSON.stringify(r.falta));
  assert.equal(amb.tabelas.ATV_ATIVIDADES.length, 0, 'sem atividade enquanto incompleta');
  const p = pend(amb, 's_tiago').filter((i) => i.tipo === 'compras_espec');
  assert.equal(p.length, 1);
  assert.match(p[0].oQueFazer, /Meus pedidos de compra/);
  const ini = amb.api('s_carlos', 'iniciarCotacao', { id: r.id });
  assert.equal(ini.ok, false);
  assert.match(ini.message, /especificação está incompleta.*não comprar errado/);
  // quem pediu completa: atividade do comprador com o prazo da urgência crítica (no mesmo dia)
  const c = ok(amb.api('s_tiago', 'salvarRequisicao', { id: r.id, urgencia: 'CRITICA', finalidade: r.finalidade, vinculo: { tipo: 'CLIENTE', clienteId: 'c1', unidadeId: 'un1' },
    itens: [{ id: r.itens[0].id, categoria: 'PECA', descricao: 'Resistência da câmara', quantidade: 1, unidade: 'un.', equipamentoId: 'eq1', tensao: '220 V', dimensao: '30 cm', fotosNovas: [FOTO] }] }));
  assert.equal(c.requisicao.especIncompleta, false);
  const atv = amb.tabelas.ATV_ATIVIDADES.filter((a) => /Conferir e cotar/.test(a.TITULO));
  assert.equal(atv.length, 1);
  assert.equal(atv[0].RESPONSAVEL_ID, 'u_cmp');
  assert.equal(atv[0].PRAZO.slice(0, 10), '2026-10-19', 'crítica: prazo no mesmo dia');
  assert.equal(pend(amb, 's_tiago').filter((i) => i.tipo === 'compras_espec').length, 0);
  // o comprador devolve: volta para quem pediu, com o texto, e a atividade é concluída
  ok(amb.api('s_carlos', 'devolverEspec', { id: r.id, texto: 'Envie a foto da etiqueta com a potência da resistência' }));
  const p2 = pend(amb, 's_tiago').filter((i) => i.tipo === 'compras_espec');
  assert.equal(p2.length, 1);
  assert.match(p2[0].detalhe, /foto da etiqueta/);
  assert.equal(amb.tabelas.ATV_ATIVIDADES.find((a) => /Conferir e cotar/.test(a.TITULO)).SITUACAO, 'Concluída');
  assert.match(amb.api('s_carlos', 'iniciarCotacao', { id: r.id }).message, /devolvida a quem pediu/);
  // atividades e pendências sem valor
  amb.tabelas.ATV_ATIVIDADES.forEach((a) => semValor(a.TITULO + a.DESCRICAO, 'atividade'));
  pend(amb, 's_tiago').forEach((i) => semValor(i.titulo + i.detalhe, 'pendência'));
});

test('etapa 1 · cancelamento: quem pediu só enquanto Solicitada; depois, o comprador; motivo obrigatório; quem pediu é avisado', () => {
  const amb = ambiente();
  regrasDeTeste(amb);
  const r = pedidoSimples(amb);
  assert.match(amb.api('s_tiago', 'cancelar', { id: r.id, motivo: 'curto' }).message, /pelo menos 10 letras/);
  ok(amb.api('s_carlos', 'iniciarCotacao', { id: r.id }));
  assert.match(amb.api('s_tiago', 'cancelar', { id: r.id, motivo: 'Não preciso mais das chaves' }).message, /já está com Compras/);
  ok(amb.api('s_carlos', 'cancelar', { id: r.id, motivo: 'Chaves encontradas no almoxarifado da sede' }));
  const avisos = pend(amb, 's_tiago').filter((i) => i.tipo === 'compras_aviso');
  assert.equal(avisos.length, 1);
  assert.match(avisos[0].titulo, /cancelado/);
  assert.equal(amb.tabelas.CMP_REQUISICOES[0].SITUACAO, 'CANCELADA');
});

test('etapa 1 · fornecedores: CNPJ válido e único, nome parecido avisa, arquivar sem apagar, importação só preenche o vazio', () => {
  const amb = ambiente();
  regrasDeTeste(amb);
  assert.match(amb.api('s_carlos', 'salvarFornecedor', { documento: '11.111.111/1111-11', razao: 'TESTE LTDA' }).message, /não confere/);
  const f = ok(amb.api('s_carlos', 'salvarFornecedor', { documento: CNPJS[0], razao: 'FORNECEDOR TESTE UM LTDA', fantasia: 'Fornecedor Teste Um', email: 'pedidos@fornecedor.exemplo.test', categorias: ['Peças hospitalares'] })).fornecedor;
  assert.equal(f.codigo, 'FOR-0001');
  assert.match(amb.api('s_carlos', 'salvarFornecedor', { documento: CNPJS[0], razao: 'OUTRO' }).message, /já está cadastrado como Fornecedor Teste Um/);
  const par = ok(amb.api('s_carlos', 'salvarFornecedor', { documento: CNPJS[1], razao: 'FORNECEDOR TESTE UM LTDA' }));
  assert.ok(par.parecidos && par.parecidos.length === 1, 'avisa o nome parecido antes de criar');
  ok(amb.api('s_carlos', 'arquivarFornecedor', { id: f.id, motivo: 'Fechou a loja de atendimento' }));
  assert.equal(ok(amb.api('s_carlos', 'fornecedores', {})).fornecedores.length, 0);
  assert.equal(ok(amb.api('s_carlos', 'fornecedores', { incluirArquivados: true })).fornecedores.length, 1);
  assert.equal(amb.tabelas.CMP_FORNECEDORES.length, 1, 'nada apagado');
  // importação: CNPJ existente só ganha o vazio; novo entra; inválido é recusado
  const texto = 'CNPJ\tRazão social\tContato\tE-mail\tPrazo\n' + CNPJS[0] + '\tNOME TROCADO LTDA\tJoana Teste\toutro@fornecedor.exemplo.test\t7\n' + CNPJS[2] + '\tFORNECEDOR TESTE TRES LTDA\tCarlos Teste\t\t10\n123\tSEM CNPJ\t\t\t';
  const prev = ok(amb.api('s_carlos', 'importarFornecedores', { texto }));
  assert.equal(prev.novos.length, 1);
  assert.equal(prev.completados.length, 1);
  assert.deepEqual(prev.completados[0].campos.sort(), ['CONTATO', 'PRAZO_MEDIO_DIAS']);
  assert.equal(prev.recusados.length, 1);
  assert.equal(amb.tabelas.CMP_FORNECEDORES.length, 1, 'a prévia não grava');
  ok(amb.api('s_carlos', 'importarFornecedores', { texto, aplicar: true }));
  const um = amb.tabelas.CMP_FORNECEDORES.find((x) => x.ID === f.id);
  assert.equal(um.RAZAO_SOCIAL, 'FORNECEDOR TESTE UM LTDA', 'razão social preenchida não foi trocada');
  assert.equal(um.EMAIL_PEDIDOS, 'pedidos@fornecedor.exemplo.test', 'e-mail preenchido não foi trocado');
  assert.equal(um.CONTATO, 'Joana Teste', 'campo vazio foi completado');
  assert.equal(amb.tabelas.CMP_FORNECEDORES.length, 2);
});

test('etapa 1 · regras: só Administrador e Diretoria alteram, com motivo e versão; faixas precisam crescer', () => {
  const amb = ambiente();
  assert.match(amb.api('s_tiago', 'regras', {}).message, /valores de compra/);
  const atual = ok(amb.api('s_lia', 'regras', {}));
  assert.equal(atual.podeEditar, false);
  assert.match(amb.api('s_lia', 'regras', { salvar: atual.regras, motivo: 'Teste de alteração das regras' }).message, /só pelo Administrador e pela Diretoria/);
  const ruim = JSON.parse(JSON.stringify(atual.regras)); ruim.faixas[1].ate = 500;
  assert.match(amb.api('s_dora', 'regras', { salvar: ruim, motivo: 'Teste de faixas fora de ordem' }).message, /precisam crescer/);
  assert.match(amb.api('s_dora', 'regras', { salvar: atual.regras, motivo: 'curto' }).message, /pelo menos 10 letras/);
  const s = ok(amb.api('s_dora', 'regras', { salvar: Object.assign({}, atual.regras, { compradores: ['u_cmp'] }), motivo: 'Comprador escolhido pela Diretoria' }));
  assert.deepEqual(Array.from(s.regras.compradores), ['u_cmp']);
  assert.equal(ok(amb.api('s_dora', 'regras', {})).versoes.length, 1);
  assert.equal(ok(amb.api('s_carlos', 'acesso')).comprador, true);
});
