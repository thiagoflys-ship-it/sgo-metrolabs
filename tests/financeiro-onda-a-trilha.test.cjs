// Onda A do Financeiro (18/11/2026), item A4: trilha das operações (FIN_OMIE_OPERACOES) e estorno de baixa / exclusão de título com
// pedido, prévia, motivo e confirmação do dono ou da Diretoria. Especificação: ESPEC_ONDA2_FINANCEIRO.md, seção 5 (A4) e ESPEC_FINANCEIRO.md,
// M2 e item 2 da seção 6. Código REAL do SGO+ com o OMIE SIMULADO (tests/_financeiro_onda_a.cjs); nada sai para a rede.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { montarA, baixaConfirmada } = require('./_financeiro_onda_a.cjs');

const MOTIVO = 'baixa lançada no título errado; o pagamento era de outra nota';

test('A4-1: toda gravação no Omie entra na trilha com quem, de onde, o quê, valor, códigos e resultado; leitura não entra', () => {
  const a = montarA();
  const l = baixaConfirmada(a);
  assert.equal(l.ACAO, 'BAIXA'); assert.equal(l.TIPO, 'receber'); assert.equal(l.CHAMADA, 'LancarRecebimento'); assert.equal(l.RESULTADO, 'OK');
  assert.equal(l.USUARIO_ID, 'u_fin'); assert.equal(l.NOME, 'WANESSA FINANCEIRO TESTE'); assert.equal(l.ORIGEM, 'Lançamentos e baixas');
  assert.equal(l.TITULO_OMIE, '101'); assert.equal(l.DOCUMENTO, 'NF-001'); assert.equal(l.VALOR, 400); assert.equal(l.DATA, '16/11/2026'); assert.equal(l.CONTA, '5');
  assert.equal(l.CODIGO_BAIXA, '7001', 'o codigo_baixa devolvido pelo Omie fica guardado (M2)');
  assert.match(l.CODIGO_INTEGRACAO, /^SGO[0-9a-f]{17}$/);
  // leituras (Consultar, Listar) e validações não entram
  assert.equal(a.trilha().length, 1);
  assert.ok(a.omie.some((c) => /^(Consultar|Listar)/.test(c.call)), 'houve leituras');
  // lançamento a pagar (IncluirContaPagar) com a referência
  const p = a.F('OmieOps_apiPrevia', 'wanessa', { acao: 'criar', tipo: 'pagar', dados: { pessoaId: 90, categoria: '2.10', contaId: 5, vencimento: '2026-12-10', valor: '1250.5', documento: 'NF-77', referencia: 'REF-77' } });
  assert.equal(p.ok, true, p.mensagem);
  assert.equal(a.F('OmieOps_apiConfirmar', 'wanessa', { token: p.token }).ok, true);
  const inc = a.trilha().slice(-1)[0];
  assert.deepEqual([inc.ACAO, inc.TIPO, inc.DOCUMENTO, inc.VALOR, inc.DATA, inc.CODIGO_INTEGRACAO, inc.RESULTADO, inc.TITULO_OMIE], ['LANCAMENTO', 'pagar', 'NF-77', 1250.5, '10/12/2026', 'REF-77', 'OK', '901']);
});

test('A4-2: recusa do Omie, Omie ocupado e envio sem resposta ficam na trilha com o resultado certo; a operação continua igual', () => {
  const a = montarA();
  const prev = () => { const p = a.F('OmieOps_apiPrevia', 'wanessa', { acao: 'baixar', tipo: 'receber', id: 101, dados: { contaId: 5, valor: 100, data: '2026-11-16' } }); assert.equal(p.ok, true, p.mensagem); return p.token; };
  a.falhas.LancarRecebimento = [{ faultstring: 'ERROR: Conta corrente inválida', faultcode: 'SOAP-ENV:Client-102' }];
  let c = a.F('OmieOps_apiConfirmar', 'wanessa', { token: prev() });
  assert.equal(c.ok, false); assert.match(c.mensagem, /Nada foi feito no Omie/);
  a.falhas.LancarRecebimento = [{ faultstring: 'ERROR: Já existe uma requisição desse método sendo executada', faultcode: 'SOAP-ENV:Server' }];
  const t2 = prev();
  c = a.F('OmieOps_apiConfirmar', 'wanessa', { token: t2 });
  assert.equal(c.ok, false); assert.match(c.mensagem, /estava ocupado/);
  a.falhas.LancarRecebimento = ['transporte'];
  c = a.F('OmieOps_apiConfirmar', 'wanessa', { token: t2 });
  assert.equal(c.ok, false); assert.match(c.mensagem, /não foi confirmado/);
  assert.deepEqual(a.trilha().map((l) => l.RESULTADO), ['RECUSADO', 'NAO_EXECUTADO', 'INCERTO']);
  assert.match(a.trilha()[0].MOTIVO_OMIE, /Conta corrente inválida/);
  const r = a.F('OmieTri_apiLista', 'wanessa', { resultado: 'INCERTO' });
  assert.equal(r.ok, true); assert.equal(r.itens.length, 1); assert.equal(r.itens[0].resultadoNome, 'Sem resposta do Omie (conferir)');
  assert.equal(r.itens[0].podeEstornar, false, 'baixa sem resposta não é estornada');
});

test('A4-3: estorno de baixa — a Wanessa pede com motivo e prévia; ela e outro do Financeiro não confirmam; o dono ou a Diretoria confirma e só então o SGO+ chama o Omie', () => {
  const a = montarA();
  const l = baixaConfirmada(a);
  const escritas0 = a.escritas().length;
  // prévia: só leitura, com o que vai acontecer e quem confirma
  const pv = a.F('OmieTri_apiPrevia', 'wanessa', { operacaoId: l.ID, tipoPedido: 'ESTORNO_BAIXA' });
  assert.equal(pv.ok, true, pv.mensagem);
  const txt = pv.resumo.map((x) => x.join(': ')).join('\n');
  assert.match(txt, /Estornar \(desfazer\) a baixa no Omie/); assert.match(txt, /R\$ 400,00 em 16\/11\/2026/); assert.match(txt, /Código da baixa: 7001/);
  assert.match(txt, /Situação hoje no Omie: Em aberto/); assert.match(txt, /Quem confirma: O dono do sistema ou a Diretoria/);
  // motivo curto: recusa com o quê, por quê e o que fazer
  let r = a.F('OmieTri_apiPedir', 'wanessa', { operacaoId: l.ID, tipoPedido: 'ESTORNO_BAIXA', motivo: 'erro' });
  assert.equal(r.ok, false); assert.match(r.mensagem, /pelo menos 15 letras[\s\S]*Nada foi pedido/);
  r = a.F('OmieTri_apiPedir', 'wanessa', { operacaoId: l.ID, tipoPedido: 'ESTORNO_BAIXA', motivo: MOTIVO });
  assert.equal(r.ok, true, r.mensagem); assert.match(r.mensagem, /Nada foi enviado ao Omie/);
  const pid = r.pedidoId;
  assert.equal(a.escritas().length, escritas0, 'pedir não grava nada no Omie');
  // um pedido aberto por operação
  r = a.F('OmieTri_apiPedir', 'wanessa', { operacaoId: l.ID, tipoPedido: 'ESTORNO_BAIXA', motivo: MOTIVO });
  assert.equal(r.ok, false); assert.match(r.mensagem, /Já existe um pedido aberto/);
  // quem pediu não decide; o Financeiro não decide (APROVACAO_SO_DIRETORIA = SIM, padrão)
  r = a.F('OmieTri_apiDecidir', 'wanessa', { pedidoId: pid, decisao: 'confirmar' });
  assert.equal(r.ok, false); assert.match(r.mensagem, /Quem pediu não confirma nem recusa o próprio pedido/);
  r = a.F('OmieTri_apiDecidir', 'fabio', { pedidoId: pid, decisao: 'confirmar' });
  assert.equal(r.ok, false); assert.match(r.mensagem, /só o dono do sistema e a Diretoria[\s\S]*Nada foi alterado[\s\S]*Peça ao dono ou à Diretoria/);
  assert.ok(a.acessos().some((x) => x.RESULTADO === 'NEGADO' && x.CONSULTA === 'OmieTri_apiDecidir' && x.USUARIO_ID === 'u_fin2'), 'tentativa registrada como NEGADO');
  assert.equal(a.escritas().length, escritas0, 'nada foi ao Omie');
  // a Diretoria confirma: CancelarRecebimento com o codigo_baixa
  r = a.F('OmieTri_apiDecidir', 'dora', { pedidoId: pid, decisao: 'confirmar' });
  assert.equal(r.ok, true, r.mensagem); assert.match(r.mensagem, /feito no Omie/);
  const esc = a.escritas().slice(escritas0);
  assert.deepEqual(esc.map((c) => [c.call, c.param]), [['CancelarRecebimento', { codigo_baixa: 7001 }]]);
  const est = a.trilha().slice(-1)[0];
  assert.deepEqual([est.ACAO, est.RESULTADO, est.USUARIO_ID, est.ESTORNO_DE, est.PEDIDO_ID, est.CODIGO_BAIXA, est.VALOR], ['ESTORNO_BAIXA', 'OK', 'u_dir', l.ID, pid, '7001', 400]);
  assert.equal(a.pedidos()[0].SITUACAO, 'EXECUTADO'); assert.equal(a.pedidos()[0].DECIDIDO_POR_NOME, 'DORA DIRETORA TESTE');
  // a baixa aparece como estornada e não pode ser pedida de novo
  const lista = a.F('OmieTri_apiLista', 'wanessa', {});
  const b = lista.itens.find((i) => i.id === l.ID);
  assert.match(b.estornada, /^Estornada em 16\/11\/2026 10:00 \(DORA DIRETORA TESTE\)$/); assert.equal(b.podeEstornar, false);
  r = a.F('OmieTri_apiPrevia', 'wanessa', { operacaoId: l.ID, tipoPedido: 'ESTORNO_BAIXA' });
  assert.equal(r.ok, false); assert.match(r.mensagem, /já foi estornada/);
});

test('A4-4: recusa e retirada do pedido não chamam o Omie; o dono também decide; gravação desligada não envia nada', () => {
  const a = montarA();
  const l1 = baixaConfirmada(a, 100), l2 = baixaConfirmada(a, 200), l3 = baixaConfirmada(a, 300);
  const pedir = (l) => a.F('OmieTri_apiPedir', 'wanessa', { operacaoId: l.ID, tipoPedido: 'ESTORNO_BAIXA', motivo: MOTIVO }).pedidoId;
  const p1 = pedir(l1), p2 = pedir(l2), p3 = pedir(l3);
  const e0 = a.escritas().length;
  let r = a.F('OmieTri_apiDecidir', 'admin', { pedidoId: p1, decisao: 'recusar', motivo: 'curto' });
  assert.equal(r.ok, false); assert.match(r.mensagem, /pelo menos 10 letras/);
  r = a.F('OmieTri_apiDecidir', 'admin', { pedidoId: p1, decisao: 'recusar', motivo: 'a baixa está certa, confira o extrato do dia' });
  assert.equal(r.ok, true, r.mensagem); assert.equal(a.pedidos().find((p) => p.ID === p1).SITUACAO, 'RECUSADO');
  r = a.F('OmieTri_apiRetirar', 'fabio', { pedidoId: p2, motivo: 'não fui eu que pedi isto' });
  assert.equal(r.ok, false); assert.match(r.mensagem, /Só quem fez o pedido o retira/);
  r = a.F('OmieTri_apiRetirar', 'wanessa', { pedidoId: p2, motivo: 'conferi de novo e a baixa estava certa' });
  assert.equal(r.ok, true, r.mensagem); assert.equal(a.pedidos().find((p) => p.ID === p2).SITUACAO, 'CANCELADO');
  delete a.props.OMIE_GRAVACAO_LIGADA;
  r = a.F('OmieTri_apiDecidir', 'admin', { pedidoId: p3, decisao: 'confirmar' });
  assert.equal(r.ok, false); assert.match(r.mensagem, /gravação pelo SGO\+ ainda está desligada/);
  assert.equal(a.pedidos().find((p) => p.ID === p3).SITUACAO, 'AGUARDANDO', 'o pedido continua aguardando');
  assert.equal(a.escritas().length, e0, 'nada foi ao Omie');
  a.props.OMIE_GRAVACAO_LIGADA = '1';
  r = a.F('OmieTri_apiDecidir', 'admin', { pedidoId: p3, decisao: 'confirmar' });
  assert.equal(r.ok, true, r.mensagem);
  assert.deepEqual(a.escritas().slice(e0).map((c) => c.call), ['CancelarRecebimento']);
});

test('A4-5: com APROVACAO_SO_DIRETORIA = NAO, outra pessoa da lista confirma (nunca quem pediu); fora da lista, nada', () => {
  const a = montarA();
  a.props.APROVACAO_SO_DIRETORIA = 'NAO';
  const l = baixaConfirmada(a);
  const pid = a.F('OmieTri_apiPedir', 'wanessa', { operacaoId: l.ID, tipoPedido: 'ESTORNO_BAIXA', motivo: MOTIVO }).pedidoId;
  assert.equal(a.F('OmieTri_apiDecidir', 'wanessa', { pedidoId: pid, decisao: 'confirmar' }).ok, false);
  for (const fora of ['rita', 'gil', 'tiago']) {
    const r = a.F('OmieTri_apiDecidir', fora, { pedidoId: pid, decisao: 'confirmar' });
    assert.equal(r.ok, false); assert.match(r.mensagem, /O Financeiro é sigiloso/);
    assert.equal(a.F('OmieTri_apiLista', fora, {}).ok, false);
  }
  const r = a.F('OmieTri_apiDecidir', 'fabio', { pedidoId: pid, decisao: 'confirmar' });
  assert.equal(r.ok, true, r.mensagem);
  assert.equal(a.pedidos()[0].DECIDIDO_POR_ID, 'u_fin2');
});

test('A4-6: Omie recusa o estorno (nada feito, pedido encerrado) e envio sem resposta (conferir no Omie, sem reenvio)', () => {
  const a = montarA();
  const l1 = baixaConfirmada(a, 100), l2 = baixaConfirmada(a, 200);
  const p1 = a.F('OmieTri_apiPedir', 'wanessa', { operacaoId: l1.ID, tipoPedido: 'ESTORNO_BAIXA', motivo: MOTIVO }).pedidoId;
  const p2 = a.F('OmieTri_apiPedir', 'wanessa', { operacaoId: l2.ID, tipoPedido: 'ESTORNO_BAIXA', motivo: MOTIVO }).pedidoId;
  a.falhas.CancelarRecebimento = [{ faultstring: 'ERROR: Baixa já conciliada', faultcode: 'SOAP-ENV:Client-500' }];
  let r = a.F('OmieTri_apiDecidir', 'dora', { pedidoId: p1, decisao: 'confirmar' });
  assert.equal(r.ok, false); assert.match(r.mensagem, /Baixa já conciliada[\s\S]*Nada foi feito no Omie e o pedido foi encerrado/);
  assert.equal(a.pedidos().find((p) => p.ID === p1).SITUACAO, 'FALHOU');
  a.falhas.CancelarRecebimento = ['transporte'];
  r = a.F('OmieTri_apiDecidir', 'dora', { pedidoId: p2, decisao: 'confirmar' });
  assert.equal(r.ok, false); assert.match(r.mensagem, /pode ter sido feito[\s\S]*Nada será reenviado sozinho/);
  assert.equal(a.pedidos().find((p) => p.ID === p2).SITUACAO, 'INCERTO');
  assert.deepEqual(a.trilha().slice(-2).map((x) => x.RESULTADO), ['RECUSADO', 'INCERTO']);
  // a pendência "conferir no Omie" vai para quem pediu e quem confirmou (lista de sigilo)
  const pend = a.pend('wanessa').find((x) => x.id === 'OMIE:EST:INC:' + p2);
  assert.ok(pend, 'pendência de conferência'); assert.deepEqual(pend.paraUsuarios.sort(), ['u_dir', 'u_fin']);
  assert.ok(a.pend('dora').some((x) => x.id === 'OMIE:EST:INC:' + p2), 'quem confirmou também confere');
  assert.ok(!a.pend('fabio').some((x) => x.id === 'OMIE:EST:INC:' + p2) && !a.pend('rita').some((x) => /^OMIE:/.test(x.id)));
  r = a.F('OmieTri_apiConferir', 'wanessa', { pedidoId: p2, desfecho: 'feito', motivo: 'a baixa não aparece mais no título' });
  assert.equal(r.ok, true, r.mensagem);
  assert.equal(a.pedidos().find((p) => p.ID === p2).SITUACAO, 'CONFERIDO_FEITO');
  const b = a.F('OmieTri_apiLista', 'wanessa', {}).itens.find((i) => i.id === l2.ID);
  assert.match(b.estornada, /^Estornada em/, 'a conferência "foi feito" marca a baixa como estornada');
  assert.ok(!a.pend('wanessa').some((x) => x.id === 'OMIE:EST:INC:' + p2), 'a pendência some');
});

test('A4-7: exclusão de conta a pagar sem baixa (ExcluirContaPagar); com baixa ou a receber, recusa com o motivo', () => {
  const a = montarA();
  const p = a.F('OmieOps_apiPrevia', 'wanessa', { acao: 'criar', tipo: 'pagar', dados: { pessoaId: 90, categoria: '2.10', contaId: 5, vencimento: '2026-12-10', valor: 1000, documento: 'NF-88', referencia: 'REF-88' } });
  assert.equal(a.F('OmieOps_apiConfirmar', 'wanessa', { token: p.token }).ok, true);
  const inc = a.trilha().slice(-1)[0];
  a.titulo = Object.assign({}, a.titulo, { codigo_lancamento_omie: 901, valor_documento: 1000 }); a.saldo = 400; // saldo menor que o valor: tem baixa
  let r = a.F('OmieTri_apiPrevia', 'wanessa', { operacaoId: inc.ID, tipoPedido: 'EXCLUSAO_TITULO' });
  assert.equal(r.ok, false); assert.match(r.mensagem, /tem baixa registrada[\s\S]*estorne a baixa antes/);
  a.saldo = 1000; a.limpar();
  r = a.F('OmieTri_apiPrevia', 'wanessa', { operacaoId: inc.ID, tipoPedido: 'EXCLUSAO_TITULO' });
  assert.equal(r.ok, true, r.mensagem); assert.match(r.resumo.map((x) => x.join(': ')).join('\n'), /Excluir o título do Omie[\s\S]*sem baixa/);
  const pid = a.F('OmieTri_apiPedir', 'wanessa', { operacaoId: inc.ID, tipoPedido: 'EXCLUSAO_TITULO', motivo: 'nota lançada duas vezes por engano no mesmo dia' }).pedidoId;
  const e0 = a.escritas().length;
  a.limpar();
  r = a.F('OmieTri_apiDecidir', 'admin', { pedidoId: pid, decisao: 'confirmar' });
  assert.equal(r.ok, true, r.mensagem);
  assert.deepEqual(a.escritas().slice(e0).map((c) => [c.call, c.param]), [['ExcluirContaPagar', { codigo_lancamento_omie: 901 }]]);
  assert.equal(a.F('OmieTri_apiLista', 'wanessa', {}).itens.find((i) => i.id === inc.ID).podeExcluir, false);
  // conta a receber: método do Omie ainda a confirmar
  const p2 = a.F('OmieOps_apiPrevia', 'wanessa', { acao: 'criar', tipo: 'receber', dados: { pessoaId: 12, categoria: '1.01', contaId: 5, vencimento: '2026-12-10', valor: 500, documento: 'NF-99', referencia: 'REF-99' } });
  assert.equal(a.F('OmieOps_apiConfirmar', 'wanessa', { token: p2.token }).ok, true);
  const rec = a.trilha().slice(-1)[0];
  r = a.F('OmieTri_apiPrevia', 'wanessa', { operacaoId: rec.ID, tipoPedido: 'EXCLUSAO_TITULO' });
  assert.equal(r.ok, false); assert.match(r.mensagem, /exclusão de conta a receber ainda não é feita pelo SGO\+[\s\S]*Exclua direto no Omie/);
});

test('A4-8: o pedido entra na Caixa de decisões só do dono e da Diretoria da lista (sem quem pediu, sem valor) e sai quando decidido', () => {
  const a = montarA();
  const l = baixaConfirmada(a);
  const pid = a.F('OmieTri_apiPedir', 'wanessa', { operacaoId: l.ID, tipoPedido: 'ESTORNO_BAIXA', motivo: MOTIVO }).pedidoId;
  const it = a.pendInterno().find((x) => x.id === 'OMIE:EST:' + pid);
  assert.ok(it, 'pendência criada');
  assert.deepEqual(it.paraUsuarios.sort(), ['u_adm', 'u_dir']);
  assert.ok(!/R\$|400/.test(it.titulo + ' ' + it.detalhe), 'sem valor no título nem no detalhe');
  assert.ok(it.extra.sigiloFin);
  assert.ok(a.ctx.GES_TIPOS.fin_estorno_decidir, 'tipo registrado na Caixa de decisões');
  for (const fora of ['rita', 'gil', 'matheusgodoi']) assert.ok(!a.pend(fora).some((x) => /^OMIE:EST/.test(x.id)), fora + ' não vê');
  assert.ok(!a.pend('wanessa').some((x) => x.id === 'OMIE:EST:' + pid), 'quem pediu não recebe a decisão');
  vm.runInContext('Ges_sincronizar_()', a.ctx);
  const cx = a.j(a.ctx.Gestao_apiCaixa('s_dora', { filtro: 'minhas' }));
  assert.equal(cx.ok, true, cx.mensagem || cx.message);
  assert.ok(JSON.stringify(cx).includes('OMIE:EST:' + pid), 'aparece na Caixa de decisões da Diretoria');
  const cxGil = a.j(a.ctx.Gestao_apiCaixa('s_gil', { filtro: 'todas' }));
  assert.ok(!JSON.stringify(cxGil).includes('OMIE:EST:'), 'gestor fora da lista não vê nem em "todas"');
  assert.equal(a.F('OmieTri_apiDecidir', 'dora', { pedidoId: pid, decisao: 'confirmar' }).ok, true);
  assert.ok(!a.pendInterno().some((x) => /^OMIE:EST/.test(x.id)), 'decidido, sai da central e da Caixa');
});

test('A4-9: sigilo — fora da lista não consulta nem pede; a consulta entra no registro de acessos com o nome; nenhum valor vai ao registro', () => {
  const a = montarA();
  baixaConfirmada(a);
  for (const fora of ['rita', 'tiago', 'gil', 'matheusgodoi']) {
    for (const fn of ['OmieTri_apiLista', 'OmieTri_apiPrevia', 'OmieTri_apiPedir']) {
      const r = a.F(fn, fora, { operacaoId: a.trilha()[0].ID, tipoPedido: 'ESTORNO_BAIXA', motivo: MOTIVO });
      assert.equal(r.ok, false); assert.match(r.mensagem, /O Financeiro é sigiloso/);
    }
  }
  assert.ok(a.acessos().filter((x) => x.RESULTADO === 'NEGADO' && /^OmieTri_/.test(x.CONSULTA)).length >= 12);
  assert.equal(a.ctx.OMIE_SIGILO_NOMES.OmieTri_apiLista, 'Trilha das operações');
  assert.equal(a.ctx.OMIE_SIGILO_NOMES.OmieTri_apiDecidir, 'Decisão de estorno ou exclusão');
  const r = a.F('OmieTri_apiLista', 'admin', { acao: 'BAIXA' });
  assert.equal(r.ok, true); assert.equal(r.itens.length, 1); assert.equal(r.itens[0].valorTxt, 'R$ 400,00');
  assert.ok(!a.acessos().some((x) => /400/.test(x.DETALHE)), 'nenhum valor no registro de acessos');
  // filtros de data
  assert.equal(a.F('OmieTri_apiLista', 'admin', { de: '2026-11-17' }).itens.length, 0);
  assert.match(a.F('OmieTri_apiLista', 'admin', { de: '2026-11-17', ate: '2026-11-10' }).mensagem, /A data inicial \(De\) está depois da final/);
});
