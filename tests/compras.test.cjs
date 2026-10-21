// Compras e peças nativo do SGO+ (21/10/2026): pedido de peça com especificação e vínculo, fornecedores, regras,
// cotações e aprovação por faixa, pedido de compra A4, recebimento, entrega, Comercial, Financeiro e relatório.
// Código real num contexto isolado (tests/_compras_ambiente.cjs). Só dados de teste; relógio fixo (não depende da hora real).
const test = require('node:test');
const assert = require('node:assert/strict');
const { ambiente, FOTO, PDF, regrasDeTeste, fornecedoresDeTeste, pedidoSimples, CNPJS } = require('./_compras_ambiente.cjs');

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

// ------------------------------------------------------------------ etapa 2
/** Pedido em cotação com um item; devolve a ficha (com o item). */
function emCotacao(amb, descricao, sid) {
  const r = pedidoSimples(amb, { itens: [{ categoria: 'FERRAMENTA', descricao: descricao, quantidade: 1, unidade: 'un.' }] }, sid);
  ok(amb.api('s_carlos', 'iniciarCotacao', { id: r.id }));
  return ok(amb.api('s_carlos', 'requisicao', { id: r.id })).requisicao;
}
function cotar(amb, q, forn, preco, extra) {
  return ok(amb.api('s_carlos', 'salvarCotacao', Object.assign({ requisicaoId: q.id, fornecedorId: forn.id, precos: [{ itemId: q.itens[0].id, precoUnitario: preco }], prazoDias: 5, validade: '2026-11-10', arquivo: PDF }, extra || {}))).requisicao;
}
const caixa = (amb) => amb.ctx.Ges_caixa_().itens.filter((i) => /^compras/.test(i.tipo));

test('etapa 2 · cotação: arquivo obrigatório, total pelo sistema, validade, mais barata exige justificativa', () => {
  const amb = ambiente();
  regrasDeTeste(amb);
  const fs = fornecedoresDeTeste(amb);
  const q = emCotacao(amb, 'Multímetro digital');
  const sem = amb.api('s_carlos', 'salvarCotacao', { requisicaoId: q.id, fornecedorId: fs[0].id, precos: [{ itemId: q.itens[0].id, precoUnitario: '300,00' }], prazoDias: 3, validade: '2026-11-10' });
  assert.match(sem.message, /anexe o arquivo do orçamento/);
  assert.match(amb.api('s_carlos', 'salvarCotacao', { requisicaoId: q.id, fornecedorId: fs[0].id, precos: [{ itemId: q.itens[0].id, precoUnitario: '300' }], prazoDias: 3, validade: '2026-10-01', arquivo: PDF }).message, /já passou/);
  let t = cotar(amb, q, fs[0], '300,00', { frete: '25,50', impostos: '10' });
  assert.equal(t.cotacoes[0].totalTxt, 'R$ 335,50', 'preço x quantidade + frete + impostos');
  assert.match(amb.api('s_tiago', 'salvarCotacao', { requisicaoId: q.id }).message, /ação é do comprador/);
  t = cotar(amb, q, fs[1], '290,00');
  const cara = t.cotacoes.find((c) => !c.maisBarata);
  assert.match(amb.api('s_carlos', 'escolher', { requisicaoId: q.id, cotacaoId: cara.id }).message, /não é o mais barato/);
  amb.mudar('2026-11-12T10:00:00-03:00');
  const venc = amb.api('s_carlos', 'escolher', { requisicaoId: q.id, cotacaoId: t.cotacoes.find((c) => c.maisBarata).id });
  assert.match(venc.message, /validade vencida/);
});

test('etapa 2 · faixas: até R$ 1.000 o comprador aprova na escolha; até R$ 10.000 o gestor da área na Caixa; acima, a Diretoria', () => {
  const amb = ambiente();
  regrasDeTeste(amb);
  const fs = fornecedoresDeTeste(amb);
  const q1 = emCotacao(amb, 'Alicate amperímetro');
  const t1 = cotar(amb, q1, fs[0], '800,00');
  const e1 = ok(amb.api('s_carlos', 'escolher', { requisicaoId: q1.id, cotacaoId: t1.cotacoes[0].id }));
  assert.equal(e1.requisicao.situacao, 'APROVADA');
  assert.match(e1.requisicao.aprovacaoTexto, /comprador.*registrado/);
  assert.equal(amb.tabelas.CMP_APROVACOES.length, 1);
  assert.ok(amb.tabelas.ATV_ATIVIDADES.some((a) => /Fazer o pedido de compra/.test(a.TITULO) && a.RESPONSAVEL_ID === 'u_cmp'));
  const q2 = emCotacao(amb, 'Analisador de segurança elétrica');
  const t2 = cotar(amb, q2, fs[0], '5.000,00');
  assert.match(amb.api('s_carlos', 'escolher', { requisicaoId: q2.id, cotacaoId: t2.cotacoes[0].id }).message, /pede 2 cotações/);
  const e2 = ok(amb.api('s_carlos', 'escolher', { requisicaoId: q2.id, cotacaoId: t2.cotacoes[0].id, justificativaMinimo: 'Fornecedor único autorizado do analisador' }));
  assert.equal(e2.requisicao.situacao, 'AGUARDANDO_APROVACAO');
  assert.deepEqual(Array.from(e2.requisicao.aprovacao.quem), ['GIL GESTOR TECNICO TESTE', 'DORA DIRETORA TESTE', 'DAVI DIRETOR TESTE']);
  let cx = caixa(amb);
  assert.equal(cx.length, 1);
  assert.equal(cx[0].tipo, 'compras_aprovar');
  assert.deepEqual(Array.from(cx[0].responsaveis), ['u_gt'], 'Caixa: gestor da área de quem pediu');
  semValor(cx[0].titulo + cx[0].detalhe, 'Caixa');
  assert.equal(cx[0].prazoIso, '2026-10-20', '1 dia útil');
  assert.match(amb.api('s_carlos', 'decidir', { requisicaoId: q2.id, aprovar: true }).message, /quem cota não aprova/);
  assert.match(amb.api('s_lia', 'decidir', { requisicaoId: q2.id, aprovar: true }).message, /Quem aprova: GIL/);
  ok(amb.api('s_gil', 'decidir', { requisicaoId: q2.id, aprovar: true, texto: 'Necessário para a manutenção preventiva' }));
  assert.equal(caixa(amb).length, 0, 'sai da Caixa depois da decisão');
  assert.equal(pend(amb, 's_carlos').filter((i) => i.tipo === 'compras_aviso' && /aprovada/i.test(i.titulo)).length, 1, 'comprador avisado no sistema');
  const q3 = emCotacao(amb, 'Bancada de calibração');
  cotar(amb, q3, fs[0], '15.000,00'); cotar(amb, q3, fs[1], '16.000,00');
  const t3 = cotar(amb, q3, fs[2], '17.000,00');
  const e3 = ok(amb.api('s_carlos', 'escolher', { requisicaoId: q3.id, cotacaoId: t3.cotacoes.find((c) => c.maisBarata).id }));
  assert.equal(e3.requisicao.aprovacao.nivelNome, 'Diretoria');
  cx = caixa(amb);
  assert.equal(cx.length, 1);
  assert.deepEqual(Array.from(cx[0].responsaveis).sort(), ['u_dir', 'u_dir2']);
  assert.equal(cx[0].reserva, true);
  assert.match(amb.api('s_gil', 'decidir', { requisicaoId: q3.id, aprovar: true }).message, /faixa "Diretoria"/);
  ok(amb.api('s_dora', 'decidir', { requisicaoId: q3.id, aprovar: true }));
});

test('etapa 2 · quem pediu não aprova a própria compra: comprador que pediu passa ao substituto; reprovação volta para cotação com motivo', () => {
  const amb = ambiente();
  regrasDeTeste(amb);
  const fs = fornecedoresDeTeste(amb);
  const r = pedidoSimples(amb, { itens: [{ categoria: 'ESCRITORIO', descricao: 'Toner da impressora de Compras', quantidade: 2, unidade: 'un.' }] }, 's_carlos');
  ok(amb.api('s_carlos', 'iniciarCotacao', { id: r.id }));
  const q = ok(amb.api('s_carlos', 'requisicao', { id: r.id })).requisicao;
  const t = cotar(amb, q, fs[0], '150,00');
  const e = ok(amb.api('s_carlos', 'escolher', { requisicaoId: q.id, cotacaoId: t.cotacoes[0].id }));
  assert.equal(e.requisicao.situacao, 'AGUARDANDO_APROVACAO', 'quem pediu escolheu: não aprova sozinho');
  assert.ok(e.requisicao.aprovacao.quem.includes('SARA SUBSTITUTA TESTE'));
  assert.ok(!e.requisicao.aprovacao.quem.includes('CARLOS COMPRADOR TESTE'));
  assert.match(amb.api('s_carlos', 'decidir', { requisicaoId: q.id, aprovar: true }).message, /Quem pediu não aprova a própria compra/);
  const p = pend(amb, 's_sara').filter((i) => i.tipo === 'compras_aprovar_comprador');
  assert.equal(p.length, 1, 'faixa do comprador: no Início do substituto, fora da Caixa');
  assert.equal(caixa(amb).length, 0);
  assert.match(amb.api('s_sara', 'decidir', { requisicaoId: q.id, aprovar: false, texto: 'curto' }).message, /pelo menos 10 letras/);
  const rep = ok(amb.api('s_sara', 'decidir', { requisicaoId: q.id, aprovar: false, texto: 'Use o toner compatível do contrato de impressão' }));
  assert.equal(rep.requisicao.situacao, 'EM_COTACAO');
  assert.equal(amb.tabelas.CMP_COTACOES[0].SITUACAO, 'ATIVA', 'a cotação volta a concorrer');
  assert.ok(amb.tabelas.ATV_ATIVIDADES.some((a) => /Rever a cotação/.test(a.TITULO)));
  const hist = ok(amb.api('s_carlos', 'meus')).requisicoes[0].historico.map((h) => h.texto).join(' ');
  assert.match(hist, /reprovada/i);
  semValor(hist, 'histórico de quem pediu');
});

// ------------------------------------------------------------------ etapa 3
/** Compra aprovada na faixa do comprador (um item de R$ 250,00). */
function aprovada(amb, fs, extra) {
  const q = emCotacao(amb, 'Kit de vedação da porta');
  const t = cotar(amb, q, fs[0], '250,00', extra);
  return ok(amb.api('s_carlos', 'escolher', { requisicaoId: q.id, cotacaoId: t.cotacoes[0].id })).requisicao;
}
const pagCartao = { formaPagamento: 'CARTAO_CREDITO', cartaoFinal: '4321', parcelas: 2 };

test('etapa 3 · pedido de compra numerado (PC-2026-0001) em A4 na pasta, sem nome do cliente; envio pelo Enviar documento com o fornecedor', () => {
  const amb = ambiente();
  regrasDeTeste(amb);
  const fs = fornecedoresDeTeste(amb);
  const q = aprovada(amb, fs);
  assert.match(amb.api('s_carlos', 'emitirPedido', Object.assign({ requisicaoId: q.id, previsaoEntrega: '2026-10-24' }, { formaPagamento: 'CARTAO_CREDITO', cartaoFinal: '12' })).message, /4 últimos números/);
  assert.match(amb.api('s_carlos', 'emitirPedido', Object.assign({ requisicaoId: q.id, previsaoEntrega: '2026-10-01' }, pagCartao)).message, /já passou/);
  assert.match(amb.api('s_tiago', 'emitirPedido', Object.assign({ requisicaoId: q.id, previsaoEntrega: '2026-10-24' }, pagCartao)).message, /ação é do comprador/);
  const e = ok(amb.api('s_carlos', 'emitirPedido', Object.assign({ requisicaoId: q.id, previsaoEntrega: '2026-10-24' }, pagCartao)));
  assert.equal(e.requisicao.situacao, 'PEDIDO_FEITO');
  assert.equal(e.requisicao.pedido.numero, 'PC-2026-0001');
  const pdf = amb.arquivos[e.pdfId], html = amb.arquivos[e.htmlId].bytes.toString('utf8');
  assert.match(pdf.nome, /^Pedido de compra - PC-2026-0001 rev\.00 - Fornecedor Teste Um/);
  const pasta = amb.pastas[pdf.pasta];
  assert.equal(pasta.nome, '2026-10');
  assert.equal(amb.pastas[pasta.pai].nome, 'Compras - Pedidos de compra');
  assert.match(html, /PC-2026-0001/); assert.match(html, /R\$ 250,00/); assert.match(html, /REQ-2026-0001/); assert.match(html, /Marca de conferência/);
  assert.doesNotMatch(html, /4321/, 'final do cartão não vai ao fornecedor');
  assert.doesNotMatch(html, /Hospital Teste Alfa/);
  const env = amb.ctx.EnviarDoc_apiPreparar('s_carlos', { arquivoId: e.pdfId });
  assert.equal(env.documento.classe, 'FORNECEDOR');
  assert.equal(env.contatos[0].email, 'pedidos1@fornecedor.exemplo.test');
  // envio registrado marca o pedido como enviado; "peça pedida" só histórico (sem aviso)
  amb.tabelas.DOC_ENVIOS.push({ ID: 'env1', ARQUIVO_ID: e.pdfId, SITUACAO: 'ENVIADO', CANAL: 'EMAIL', DESTINO: 'pedidos1@fornecedor.exemplo.test', USUARIO_ID: 'u_cmp', USUARIO_NOME: 'CARLOS', QUANDO: '2026-10-19T11:00:00' });
  const s = ok(amb.api('s_carlos', 'sincronizarEnvios', { requisicaoId: q.id }));
  assert.ok(s.requisicao.pedido.enviado);
  assert.equal(amb.tabelas.CMP_AVISOS.filter((v) => v.DESTINATARIO_ID === 'u_tec').length, 0, 'pedido feito não gera aviso');
  // solicitante: previsão e número, sem valor nem documento
  const meu = ok(amb.api('s_tiago', 'meus')).requisicoes[0];
  assert.equal(meu.previsaoEntrega, '24/10/2026');
  assert.ok(!JSON.stringify(meu).includes('R$'), 'Meus pedidos sem valor');
  const det = ok(amb.api('s_tiago', 'requisicao', { id: q.id })).requisicao;
  assert.equal(det.pedido.pdfUrl, undefined, 'quem pediu não recebe o PDF (tem valor)');
  // nova revisão
  const rv = ok(amb.api('s_carlos', 'emitirPedido', Object.assign({ requisicaoId: q.id, previsaoEntrega: '2026-10-27', novaRevisao: true, motivo: 'Fornecedor mudou a data de entrega' }, pagCartao)));
  assert.equal(rv.requisicao.pedido.rotulo, 'PC-2026-0001 rev.01');
  assert.equal(amb.tabelas.CMP_PEDIDOS.length, 1);
});

test('etapa 3 · recebimento com conferência: divergência segura a peça; disponível avisa quem pediu e vira entrega; atrasado e parado cobrados', () => {
  const amb = ambiente();
  regrasDeTeste(amb);
  const fs = fornecedoresDeTeste(amb);
  const q = aprovada(amb, fs);
  // aprovada sem pedido: comprador no 1º dia útil; Caixa no 2º
  amb.mudar('2026-10-20T10:00:00-03:00');
  assert.equal(pend(amb, 's_carlos').filter((i) => i.tipo === 'compras_parado').length, 1);
  amb.mudar('2026-10-21T10:00:00-03:00');
  let cx = caixa(amb);
  assert.equal(cx.length, 1); assert.equal(cx[0].tipo, 'compras_parado_gestao'); assert.deepEqual(Array.from(cx[0].responsaveis), ['u_log'], 'gestor da área de Compras');
  ok(amb.api('s_carlos', 'emitirPedido', Object.assign({ requisicaoId: q.id, previsaoEntrega: '2026-10-22' }, pagCartao)));
  assert.equal(caixa(amb).length, 0);
  const it = q.itens[0];
  assert.match(amb.api('s_carlos', 'receber', { requisicaoId: q.id, itens: [{ itemId: it.id, qtdRecebida: 2 }], especificacaoConfere: true, semDano: false, nfNumero: '555' }).message, /dano exige foto/);
  assert.match(amb.api('s_carlos', 'receber', { requisicaoId: q.id, itens: [{ itemId: it.id, qtdRecebida: 2 }], especificacaoConfere: true, semDano: true }).message, /nota fiscal/);
  const d = ok(amb.api('s_carlos', 'receber', { requisicaoId: q.id, itens: [{ itemId: it.id, qtdRecebida: 0 }], especificacaoConfere: true, semDano: true, nfNumero: '555', obs: 'Veio a nota sem a peça; fornecedor manda amanhã' }));
  assert.equal(d.requisicao.situacao, 'RECEBIDA_DIVERGENCIA');
  assert.equal(pend(amb, 's_carlos').filter((i) => i.tipo === 'compras_divergencia').length, 1);
  assert.equal(amb.tabelas.CMP_AVISOS.filter((v) => v.TIPO === 'DISPONIVEL').length, 0, 'com divergência ninguém é avisado de disponível');
  ok(amb.api('s_carlos', 'resolverDivergencia', { requisicaoId: q.id, texto: 'Fornecedor entregou a unidade que faltava' }));
  const av = pend(amb, 's_tiago').filter((i) => i.tipo === 'compras_aviso');
  assert.ok(av.some((i) => /Peça disponível/.test(i.titulo)));
  assert.ok(amb.tabelas.ATV_ATIVIDADES.some((a) => /^Entregar REQ-2026-0001/.test(a.TITULO) && a.SITUACAO === 'A fazer'));
  const ent = ok(amb.api('s_tiago', 'entregar', { requisicaoId: q.id }));
  assert.equal(ent.requisicao.situacao, 'ENTREGUE');
  assert.ok(amb.tabelas.ATV_ATIVIDADES.filter((a) => /REQ-2026-0001/.test(a.TITULO)).every((a) => a.SITUACAO === 'Concluída'));
  // entrega atrasada
  const q2 = aprovada(amb, fs);
  ok(amb.api('s_carlos', 'emitirPedido', Object.assign({ requisicaoId: q2.id, previsaoEntrega: '2026-10-22' }, pagCartao)));
  amb.mudar('2026-10-23T10:00:00-03:00');
  const atr = pend(amb, 's_carlos').filter((i) => i.tipo === 'compras_parado');
  assert.equal(atr.length, 1); assert.match(atr[0].titulo, /atrasada/);
  assert.match(amb.api('s_carlos', 'previsao', { requisicaoId: q2.id, previsaoEntrega: '2026-10-28' }).message, /motivo/);
  ok(amb.api('s_carlos', 'previsao', { requisicaoId: q2.id, previsaoEntrega: '2026-10-28', motivo: 'Fornecedor sem estoque; data nova por telefone' }));
  assert.equal(pend(amb, 's_carlos').filter((i) => i.tipo === 'compras_parado').length, 0);
});

test('etapa 3 · pedido aprovado do Comercial abre a requisição com os produtos, sem o valor de venda; disponível conclui a atividade do setor e avisa o vendedor', () => {
  const amb = ambiente();
  regrasDeTeste(amb);
  const fs = fornecedoresDeTeste(amb);
  const ct = ok(amb.com('s_vera', 'salvarContato', { clienteId: 'c1', unidadeId: 'un1', nome: 'Ana Enfermeira Teste', cargo: 'Coordenadora da CME', papel: 'USA', email: 'ana@alfa.exemplo.test' }));
  const op = ok(amb.com('s_vera', 'salvarOportunidade', { titulo: 'Peças para lavadora da CME', clienteId: 'c1', unidadeId: 'un1', contatoId: ct.contato.id, funil: 'PRODUTOS', etapa: 'PRO_2', origem: 'Indicação', valor: '3.200,00', proxima: { acao: 'Confirmar o modelo das peças', data: '2026-10-20', hora: '10:00', tipo: 'LIGACAO' } })).oportunidade;
  const np = ok(amb.com('s_vera', 'novaProposta', { oportunidadeId: op.id }));
  ok(amb.com('s_vera', 'salvarProposta', { id: np.proposta.id, escopo: 'Fornecimento de peças de reposição para a lavadora da CME.', itens: [{ tipo: 'PRODUTO', descricao: 'Kit de vedação da câmara', quantidade: 2, unidade: 'kit', precoUnitario: '1.600,00' }], condicoes: { pagamento: 'Boleto em 28 dias', prazoExecucao: 'Até 30 dias', garantia: 'Garantia do fabricante' } }));
  ok(amb.com('s_vera', 'concluirProposta', { id: np.proposta.id }));
  const g = ok(amb.com('s_vera', 'gerarDocumento', { id: np.proposta.id }));
  ok(amb.com('s_vera', 'marcarEnviada', { id: np.proposta.id, como: 'Enviada por e-mail para a coordenação (teste)' }));
  ok(amb.com('s_vera', 'respostaCliente', { id: np.proposta.id, resposta: 'APROVADA', texto: 'Aprovado por e-mail', arquivo: { nome: 'aceite.pdf', tipo: 'application/pdf', base64: Buffer.from('%PDF').toString('base64') } }));
  void g;
  ok(amb.com('s_vera', 'passarSetores', { id: np.proposta.id, responsaveis: { COMPRAS: 'u_cmp' } }));
  const reqs = amb.tabelas.CMP_REQUISICOES;
  assert.equal(reqs.length, 1);
  assert.equal(reqs[0].ORIGEM, 'COMERCIAL'); assert.equal(reqs[0].PROPOSTA_NUMERO, 'PROP-2026-0001'); assert.equal(reqs[0].COMERCIAL_VENDEDOR_ID, 'u_ven');
  assert.equal(reqs[0].ESPEC_INCOMPLETA, '');
  const itens = amb.tabelas.CMP_ITENS.filter((i) => i.REQUISICAO_ID === reqs[0].ID);
  assert.equal(itens.length, 1); assert.equal(itens[0].QUANTIDADE, 2);
  assert.ok(!JSON.stringify(reqs[0]).includes('1600') && !JSON.stringify(itens).includes('1600'), 'sem o valor de venda');
  assert.ok(!amb.tabelas.ATV_ATIVIDADES.some((a) => /Conferir e cotar/.test(a.TITULO)), 'a atividade do setor Compras já é a tarefa');
  // passar de novo não duplica
  assert.equal(amb.ctx.Compras_doPedidoComercial_(amb.tabelas.COM_PROPOSTAS.find((p) => p.ID === np.proposta.id), {}), 'REQ-2026-0001');
  assert.equal(amb.tabelas.CMP_REQUISICOES.length, 1);
  // a vendedora acompanha sem valor
  const meus = ok(amb.api('s_vera', 'meus')).requisicoes;
  assert.equal(meus.length, 1); assert.equal(meus[0].solicitante.nome, 'VERA VENDEDORA TESTE'); assert.equal(meus[0].valorTxt, undefined);
  // ciclo até disponível
  const id = reqs[0].ID;
  ok(amb.api('s_carlos', 'iniciarCotacao', { id }));
  const q = ok(amb.api('s_carlos', 'requisicao', { id })).requisicao;
  const t = cotar(amb, q, fs[0], '400,00');
  ok(amb.api('s_carlos', 'escolher', { requisicaoId: id, cotacaoId: t.cotacoes[0].id }));
  ok(amb.api('s_carlos', 'emitirPedido', { requisicaoId: id, previsaoEntrega: '2026-10-24', formaPagamento: 'PIX' }));
  ok(amb.api('s_carlos', 'receber', { requisicaoId: id, itens: [{ itemId: q.itens[0].id, qtdRecebida: 2 }], especificacaoConfere: true, semDano: true, nfNumero: '777' }));
  const atvCom = amb.tabelas.ATV_ATIVIDADES.find((a) => /Pedido aprovado PROP-2026-0001 rev\.00 · Compras/.test(a.TITULO));
  assert.equal(atvCom.SITUACAO, 'Concluída');
  assert.ok(pend(amb, 's_vera').some((i) => i.tipo === 'compras_aviso' && /PROP-2026-0001/.test(i.titulo)), 'vendedora avisada');
});
