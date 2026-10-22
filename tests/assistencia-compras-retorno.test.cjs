// Assistência técnica, etapa 3 (22/10/2026): Compras devolve o chamado quando a peça fica disponível (modelo do COMMAND) e o
// retorno avisa o cliente; "Retomar" + "Agendar" numa O.S. reaproveitada avisa o cliente; primeiro agendamento avisa o cliente;
// alerta "P1 sem triagem em 30 min"; prazo de chegada ao local do contrato; O.S. com documentação pendente volta à triagem.
// Código real num contexto isolado (tests/_assistencia_ambiente.cjs); só dados de teste; relógio fixo; trava não reentrante.
const test = require('node:test');
const assert = require('node:assert/strict');
const { ambiente, ok, abrirChamado, triarVisita, agendar, chamadoAgendado } = require('./_assistencia_ambiente.cjs');
const { PDF, FOTO, CNPJS } = require('./_compras_ambiente.cjs');

const ev = (tipo, osId, n, dados, em) => ({ tipo, osId, idLocal: 'apar3-' + String(n).padStart(4, '0'), em: em || '2026-10-20T09:10:00', dados: dados || {} });
const sync = (amb, sid, eventos) => amb.app('Ast_appSincronizar', sid || 's_tiago', { pedidoId: 'p-' + Math.random().toString(36).slice(2), eventos });
const cmp = (amb, sid, acao, d) => { const r = amb.ctx.Compras_api(sid, acao, d || {}); if (amb.trava.presa) throw new Error('trava presa depois de ' + acao); return r; };
const okc = (r) => { assert.equal(r.ok, true, r.message); return r; };
const chamadoDe = (amb, id) => amb.tabelas.ATEC_CHAMADOS.find((c) => c.ID === id);
const emailsCom = (amb, rx) => amb.emails.filter((m) => rx.test(m.subject));

/** Compras pronto (comprador Carlos, um fornecedor) e a peça em falta lançada em campo: devolve { os, chamado, req }. */
function pecaEmFalta(amb) {
  amb.api('s_dora', 'iniciar', {});
  okc(cmp(amb, 's_dora', 'regras', { salvar: Object.assign({}, okc(cmp(amb, 's_dora', 'regras', {})).regras, { compradores: ['u_cmp'] }), motivo: 'Regras de compras do ensaio automático' }));
  const forn = okc(cmp(amb, 's_carlos', 'salvarFornecedor', { documento: CNPJS[0], razao: 'FORNECEDOR TESTE UM LTDA', fantasia: 'Fornecedor Teste Um', email: 'pedidos1@fornecedor.exemplo.test', categorias: ['Peças hospitalares'], confirmarParecido: true })).fornecedor;
  const { os, chamado } = chamadoAgendado(amb);
  ok(sync(amb, 's_tiago', [ev('CHEGUEI', os.id, 1), ev('PECA', os.id, 2, { descricao: 'Resistência da câmara 220 V', quantidade: 1, situacao: 'FALTA' }), ev('CONCLUI', os.id, 3, {}, '2026-10-20T10:00:00')]));
  const req = amb.tabelas.CMP_REQUISICOES[0];
  assert.ok(req, 'pedido de compra aberto'); assert.equal(req.OS_AUVO, chamado.numero);
  assert.equal(chamadoDe(amb, chamado.id).SITUACAO, 'AGUARDANDO_PECA');
  return { os, chamado, req, forn };
}
/** Leva o pedido de compra até "pedido feito": o comprador completa a especificação da peça (o técnico lança só a descrição), cota, escolhe e faz o pedido. */
function pedidoFeito(amb, req, forn) {
  const q0 = okc(cmp(amb, 's_carlos', 'requisicao', { id: req.ID })).requisicao;
  okc(cmp(amb, 's_carlos', 'salvarRequisicao', { id: req.ID, urgencia: 'ALTA', finalidade: q0.finalidade, vinculo: { tipo: 'CLIENTE', clienteId: 'c1', unidadeId: 'un1', osAuvo: req.OS_AUVO },
    itens: [{ id: q0.itens[0].id, categoria: 'PECA', descricao: 'Resistência da câmara 220 V', quantidade: 1, unidade: 'un.', equipamentoId: 'eq1', tensao: '220 V', dimensao: '30 cm', fotosNovas: [FOTO] }] }));
  assert.equal(amb.tabelas.CMP_REQUISICOES[0].OS_AUVO, req.OS_AUVO, 'o vínculo com o chamado continua');
  okc(cmp(amb, 's_carlos', 'iniciarCotacao', { id: req.ID }));
  const q = okc(cmp(amb, 's_carlos', 'requisicao', { id: req.ID })).requisicao;
  const t = okc(cmp(amb, 's_carlos', 'salvarCotacao', { requisicaoId: q.id, fornecedorId: forn.id, precos: [{ itemId: q.itens[0].id, precoUnitario: '250,00' }], prazoDias: 5, validade: '2026-11-10', arquivo: PDF, compatibilidade: 'EQUIVALENTE' })).requisicao;
  okc(cmp(amb, 's_carlos', 'escolher', { requisicaoId: q.id, cotacaoId: t.cotacoes[0].id }));
  okc(cmp(amb, 's_carlos', 'emitirPedido', { requisicaoId: q.id, previsaoEntrega: '2026-10-24', formaPagamento: 'PIX' }));
  return q;
}

test('peça chegou: o recebimento conferido em Compras devolve o chamado a Planejado com "peça disponível em", avisa técnico e gestão (AT14), avisa o cliente por e-mail (AT15) e entra na Caixa como retorno a agendar', () => {
  const amb = ambiente();
  const { os, chamado, req, forn } = pecaEmFalta(amb);
  const q = pedidoFeito(amb, req, forn);
  const antesAvisos = amb.tabelas.ATEC_AVISOS.length;
  // a Assistência precisa ser chamada DEPOIS de Compras soltar a trava (as duas usam a trava do servidor, que não é reentrante)
  const original = amb.ctx.Assistencia_pecaDisponivel_, travaNaChamada = [];
  amb.ctx.Assistencia_pecaDisponivel_ = function () { travaNaChamada.push(amb.ctx.CMP_TRAVA.n + ':' + (amb.trava.presa ? 'presa' : 'solta')); return original.apply(this, arguments); };
  amb.mudar('2026-10-24T09:00:00-03:00');
  const r = okc(cmp(amb, 's_carlos', 'receber', { requisicaoId: q.id, itens: [{ itemId: q.itens[0].id, qtdRecebida: 1 }], especificacaoConfere: true, semDano: true, nfNumero: '555' }));
  assert.equal(r.requisicao.situacao, 'DISPONIVEL');
  assert.deepEqual(travaNaChamada, ['0:solta'], 'a Assistência rodou depois de soltar a trava de Compras');
  const c = chamadoDe(amb, chamado.id);
  assert.equal(c.SITUACAO, 'PLANEJADO');
  assert.ok(c.PECA_DISPONIVEL_EM, 'peça disponível em'); assert.match(c.PROXIMA_ACAO, /agendar o retorno/i);
  assert.ok(amb.tabelas.ATEC_EVENTOS.some((e) => e.ENTIDADE === 'CHAMADO' && e.TIPO === 'PECA_DISPONIVEL' && e.PUBLICO === 'SIM'));
  // avisos internos: técnico responsável e gestão da área Técnica (AT14, sistema; e-mail no resumo)
  const novos = amb.tabelas.ATEC_AVISOS.slice(antesAvisos).filter((a) => a.TIPO === 'PECA_DISPONIVEL');
  assert.deepEqual(novos.map((a) => a.DESTINATARIO_ID).sort(), ['u_gt', 'u_tec']);
  assert.match(novos[0].TEXTO, /Agendar o retorno/);
  // cliente: e-mail "peça chegou, retorno será agendado" (AT15), sem WhatsApp
  const m = emailsCom(amb, /Peça recebida: retorno técnico/);
  assert.equal(m.length, 1); assert.equal(m[0].to, 'rui@alfa.exemplo.test'); assert.match(m[0].body, /retorno do técnico será agendado/); assert.match(m[0].body, /Metrolabs — Assistência técnica/);
  assert.equal(amb.whats.length, 0, 'nada de WhatsApp ao cliente');
  // ficha e Caixa de decisões: retorno a agendar (no lugar do "planejado sem agenda")
  const f = ok(amb.api('s_gil', 'chamado', { id: chamado.id })).chamado;
  assert.equal(f.retornoAAgendar, true); assert.ok(f.pecaDisponivelEm);
  const p = amb.pend('s_gil').filter((i) => i.tipo === 'ast_retorno');
  assert.equal(p.length, 1); assert.match(p[0].oQueFazer, /Agendar o retorno/); assert.match(p[0].detalhe, /conferida por Compras/);
  assert.equal(amb.pend('s_gil').filter((i) => i.tipo === 'ast_agendar').length, 0, 'não cobra em dobro');
  // ao agendar o retorno: mesma O.S., cliente recebe "retorno agendado para dd/mm"
  const ag = ok(agendar(amb, chamado.id, '2026-10-27T09:00'));
  assert.equal(ag.os.numero, os.numero); assert.equal(ag.os.situacao, 'AGENDADA');
  assert.match(ag.message, /Retorno agendado/); assert.match(ag.message, /cliente recebe o aviso por e-mail/);
  const m2 = emailsCom(amb, /Retorno técnico agendado/);
  assert.equal(m2.length, 1); assert.match(m2[0].subject, /27\/10\/2026/); assert.match(m2[0].body, /27\/10\/2026 09:00/); assert.match(m2[0].body, /peça .* já recebida e conferida/);
  assert.equal(amb.pend('s_gil').filter((i) => i.tipo === 'ast_retorno').length, 0);
  // receber de novo (mesmo pedido) não muda o chamado agendado, nem avisa o cliente de novo
  amb.ctx.Assistencia_pecaDisponivel_(amb.tabelas.CMP_REQUISICOES[0], { id: 'u_cmp', nome: 'CARLOS' });
  assert.equal(chamadoDe(amb, chamado.id).SITUACAO, 'AGENDADO');
  assert.equal(emailsCom(amb, /Peça recebida/).length, 1);
});

test('divergência no recebimento não devolve o chamado; resolvida a divergência, devolve', () => {
  const amb = ambiente();
  const { chamado, req, forn } = pecaEmFalta(amb);
  const q = pedidoFeito(amb, req, forn);
  const d = okc(cmp(amb, 's_carlos', 'receber', { requisicaoId: q.id, itens: [{ itemId: q.itens[0].id, qtdRecebida: 0 }], especificacaoConfere: true, semDano: true, nfNumero: '555', obs: 'Veio a nota sem a peça; fornecedor manda amanhã' }));
  assert.equal(d.requisicao.situacao, 'RECEBIDA_DIVERGENCIA');
  assert.equal(chamadoDe(amb, chamado.id).SITUACAO, 'AGUARDANDO_PECA', 'segue aguardando a peça');
  assert.equal(emailsCom(amb, /Peça recebida/).length, 0);
  okc(cmp(amb, 's_carlos', 'resolverDivergencia', { requisicaoId: q.id, texto: 'Fornecedor entregou a peça; conferida e sem dano' }));
  assert.equal(chamadoDe(amb, chamado.id).SITUACAO, 'PLANEJADO');
  assert.equal(emailsCom(amb, /Peça recebida/).length, 1);
});

test('"Retomar" + "Agendar" numa O.S. reaproveitada avisa o cliente (retorno agendado); o primeiro agendamento também avisa (visita agendada)', () => {
  const amb = ambiente();
  const { os, chamado } = chamadoAgendado(amb);
  const m0 = emailsCom(amb, /Visita técnica agendada/);
  assert.equal(m0.length, 1); assert.equal(m0[0].to, 'rui@alfa.exemplo.test'); assert.match(m0[0].body, /20\/10\/2026 09:00/); assert.match(m0[0].body, /Técnico: TIAGO/);
  ok(sync(amb, 's_tiago', [ev('CHEGUEI', os.id, 1), ev('PECA', os.id, 2, { descricao: 'Resistência da câmara', quantidade: 1, situacao: 'FALTA' })]));
  assert.equal(chamadoDe(amb, chamado.id).SITUACAO, 'AGUARDANDO_PECA');
  ok(amb.api('s_gil', 'retomar', { id: chamado.id, texto: 'Peça chegou e foi separada' }));
  const ag = ok(agendar(amb, chamado.id, '2026-10-22T09:00'));
  assert.equal(ag.os.numero, os.numero);
  const m = emailsCom(amb, /Retorno técnico agendado/);
  assert.equal(m.length, 1); assert.match(m[0].body, /22\/10\/2026 09:00/);
  assert.equal(emailsCom(amb, /Visita técnica agendada/).length, 1, 'o retorno não repete o e-mail de primeira visita');
});

test('P1 sem triagem em 30 minutos: pendência crítica própria na Caixa (gestão e Diretoria) e aviso uma vez só', () => {
  const amb = ambiente();
  const c = abrirChamado(amb, { prioridade: 'P1' });
  amb.mudar('2026-10-19T10:20:00-03:00');
  assert.equal(amb.pend('s_gil').filter((i) => i.tipo === 'ast_p1_triagem').length, 0);
  amb.mudar('2026-10-19T10:35:00-03:00');
  const p = amb.pend('s_gil').filter((i) => i.tipo === 'ast_p1_triagem');
  assert.equal(p.length, 1); assert.equal(p[0].gravidade, 'CRITICO'); assert.match(p[0].titulo, /sem triagem há 35 min/);
  assert.equal(amb.pend('s_dora').filter((i) => i.tipo === 'ast_p1_triagem').length, 1, 'Diretoria também vê');
  const avisos = () => amb.tabelas.ATEC_AVISOS.filter((a) => a.TIPO === 'P1_SEM_TRIAGEM');
  assert.equal(avisos().filter((a) => a.DESTINATARIO_ID === 'u_gt').length, 1);
  assert.ok(amb.tabelas.ATEC_CHAMADOS[0].P1_ALERTA_EM);
  amb.pend('s_dora'); amb.pend('s_gil');
  assert.equal(avisos().filter((a) => a.DESTINATARIO_ID === 'u_gt').length, 1, 'não repete o aviso');
  triarVisita(amb, c.id);
  assert.equal(amb.pend('s_gil').filter((i) => i.tipo === 'ast_p1_triagem').length, 0);
});

test('chegada ao local pelo contrato: o selo aparece só quando o contrato define o prazo de chegada; a chegada da O.S. fecha o selo', () => {
  const amb = ambiente();
  assert.equal(abrirChamado(amb).slaChegada, null, 'sem contrato, sem selo');
  const reg = ok(amb.api('s_dora', 'regras', {})).regras;
  reg.contratos = [{ clienteId: 'c1', clienteNome: 'Hospital Teste Alfa', prazos: { P2: { atendimentoMin: 570, chegadaMin: 120 } } }];
  assert.match(amb.api('s_dora', 'regras', { salvar: Object.assign({}, reg, { contratos: [{ clienteId: 'c1', prazos: { P2: { atendimentoMin: 570, chegadaMin: 900 } } }] }), motivo: 'Contrato com chegada maior que o atendimento' }).message, /prazo de chegada inválido/);
  ok(amb.api('s_dora', 'regras', { salvar: reg, motivo: 'Contrato de teste com chegada em 2 horas' }));
  const c = abrirChamado(amb, { equipamentoId: 'eq2' });
  assert.equal(c.slaChegada.estado, 'EM_DIA'); assert.equal(c.slaChegada.ate, '19/10/2026 12:00'); assert.match(c.slaChegada.texto, /contrato/);
  triarVisita(amb, c.id);
  const a = ok(agendar(amb, c.id, '2026-10-19T11:00'));
  ok(sync(amb, 's_tiago', [ev('CHEGUEI', a.os.id, 1, {}, '2026-10-19T11:30:00')]));
  amb.mudar('2026-10-19T11:40:00-03:00');
  assert.equal(ok(amb.api('s_gil', 'chamado', { id: c.id })).chamado.slaChegada.estado, 'CUMPRIDO');
  // outro chamado do mesmo contrato, sem chegada depois do prazo: estourado
  const c2 = abrirChamado(amb, { equipamentoId: 'eq1', confirmarDuplicado: true });
  amb.mudar('2026-10-19T14:00:00-03:00');
  assert.equal(ok(amb.api('s_gil', 'chamado', { id: c2.id })).chamado.slaChegada.estado, 'ESTOURADO');
});

test('O.S. com documentação pendente volta à triagem com motivo (gestão): o chamado volta a Em triagem, a O.S. fica pausada e, planejada de novo, a mesma O.S. volta à agenda', () => {
  const amb = ambiente();
  const { os, chamado } = chamadoAgendado(amb);
  ok(sync(amb, 's_tiago', [ev('CHEGUEI', os.id, 1), ev('CONCLUI', os.id, 2, {}, '2026-10-20T10:00:00')]));
  assert.equal(chamadoDe(amb, chamado.id).SITUACAO, 'DOC_PENDENTE');
  assert.match(amb.api('s_tiago', 'voltarTriagem', { id: chamado.id, motivo: 'Precisa de orçamento da placa de controle' }).message, /gestão da área Técnica/);
  assert.match(amb.api('s_gil', 'voltarTriagem', { id: chamado.id, motivo: 'curto' }).message, /motivo/);
  const r = ok(amb.api('s_gil', 'voltarTriagem', { id: chamado.id, motivo: 'O técnico constatou que a placa de controle precisa de orçamento' }));
  assert.equal(r.chamado.situacao, 'EM_TRIAGEM');
  assert.equal(amb.tabelas.ATEC_OS.find((x) => x.ID === os.id).SITUACAO, 'PAUSADA');
  assert.ok(amb.tabelas.ATEC_AVISOS.some((a) => a.DESTINATARIO_ID === 'u_tec' && a.TIPO === 'VOLTA_TRIAGEM'));
  triarVisita(amb, chamado.id);
  const ag = ok(agendar(amb, chamado.id, '2026-10-22T09:00'));
  assert.equal(ag.os.numero, os.numero); assert.equal(ag.os.situacao, 'AGENDADA');
});
