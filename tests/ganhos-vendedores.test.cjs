// Ganhos dos vendedores, etapa 1 (12/11/2026): contrato por vendedor, faixa cheia sobre o recebido, apuração mensal,
// fechamento (vendedor confere -> Financeiro fecha -> Diretoria aprova -> Financeiro paga), permissões, pendências, Caixa
// de decisões e avaliação (IA com os números apurados; sem chave, regras). Código real do SGO+ num contexto isolado
// (ambiente do Comercial + caixas de acesso), relógio controlado, só pessoas e dados fictícios.
//
// Rodar contra a candidata (redirecionador do legado):
//   F=$(cygpath -w "$PWD/output/lote-20261111n/fontes.cjs") && DEST="$(cygpath -w "$PWD/output/ganhos-vendedores-20261112/cand/legado")" node --require "$F" tests/ganhos-vendedores.test.cjs
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ambiente, FAIXAS_MONICA, PASTA } = require('./_ganhos_ambiente.cjs');

const passo = (a, login, acao, vend, comp, extra) => a.g(login, acao, Object.assign({ vendedorId: vend, competencia: comp }, extra || {}));

// ---------------------------------------------------------------------------------------------------------------
test('faixa cheia (contrato da Mônica): limites exatos, percentual sobre o total e o que falta para a próxima', () => {
  const a = ambiente();
  const faixas = a.ctx.GV_validarFaixas_(FAIXAS_MONICA);
  const casos = [
    [29999.99, 2, 600.00, 0.02], [30000.00, 2, 600.00, 0.01], [30000.01, 3, 900.00, 30000.00], [50000, 3, 1500.00, 10000.01],
    [80000, 4, 3200.00, 0.01], [80000.01, 5, 4000.00, null], [0, 2, 0, 30000.01]
  ];
  for (const [total, pct, com, falta] of casos) {
    const r = a.ctx.GV_calcularFaixa_(faixas, total);
    assert.equal(r.pct, pct, 'pct de ' + total);
    assert.equal(r.comissao, com, 'comissão de ' + total);
    if (falta === null) assert.equal(r.proxima, null); else assert.equal(r.proxima.falta, falta, 'falta de ' + total);
  }
  assert.equal(a.ctx.GV_moeda_(1500), 'R$ 1.500,00');
  assert.equal(a.ctx.GV_moeda_(1234567.891), 'R$ 1.234.567,89');
  assert.equal(a.ctx.GV_pct_(2.5), '2,5%');
  assert.match(a.ctx.GV_rotuloFaixa_(faixas, 1), /acima de R\$ 30\.000,00 até R\$ 60\.000,00/);
  // faixas inválidas: valor final na última, valores fora de ordem, percentual fora de 0-100
  assert.throws(() => a.ctx.GV_validarFaixas_([{ ate: '10.000,00', pct: 2 }, { ate: '5.000,00', pct: 3 }, { ate: '', pct: 4 }]), /precisa ser maior/);
  assert.throws(() => a.ctx.GV_validarFaixas_([{ ate: '10.000,00', pct: 2 }]), /última faixa é "acima de"/);
  assert.throws(() => a.ctx.GV_validarFaixas_([{ ate: '', pct: 120 }]), /de 0 a 100/);
});

test('apuração pelo lançamento: 29.999,99 / 30.000,00 / 30.000,01 / 50.000 / 80.000 / 80.000,01 no mês, em centavos e pt-BR', () => {
  const a = ambiente();
  a.contrato('u_ven', '2026-01');
  const meses = [['2026-03', '29.999,99', 'R$ 600,00', '2%'], ['2026-04', '30.000,00', 'R$ 600,00', '2%'], ['2026-05', '30.000,01', 'R$ 900,00', '3%'],
    ['2026-06', '50.000,00', 'R$ 1.500,00', '3%'], ['2026-07', '80.000,00', 'R$ 3.200,00', '4%'], ['2026-08', '80.000,01', 'R$ 4.000,00', '5%']];
  for (const [comp, valor] of meses) {
    // o valor do mês em duas parcelas, para provar que a faixa vale sobre o total do mês
    const n = Number(valor.replace(/\./g, '').replace(',', '.'));
    const p1 = Math.round(n * 40) / 100, p2 = Math.round((n - p1) * 100) / 100;
    a.receber('p1', comp + '-05', p1, 'NF ' + comp + '/1');
    a.receber('p1', comp + '-20', p2, 'NF ' + comp + '/2');
  }
  for (const [comp, valor, com, pct] of meses) {
    const p = a.painel('wanessa', 'u_ven', comp);
    assert.equal(p.apuracao.totalBr, 'R$ ' + valor, comp);
    assert.equal(p.apuracao.comissaoBr, com, comp);
    assert.equal(p.apuracao.pctBr, pct, comp);
    assert.equal(p.apuracao.recebimentos.length, 2);
    assert.equal(p.apuracao.recebimentos[0].cliente, 'HOSPITAL TESTE ALFA LTDA');
    assert.equal(p.apuracao.recebimentos[0].proposta, 'PROP-2026-0001');
  }
  // índices: 12 meses, ticket médio por proposta recebida, propostas ganhas x recebidas, prazo médio
  const p = a.painel('wanessa', 'u_ven', '2026-10');
  assert.equal(p.serie.length, 12);
  assert.equal(p.serie.find((m) => m.competencia === '2026-06').comissao, 1500);
  assert.equal(p.indices.propostasComRecebimento, 1);
  assert.equal(p.indices.ganhas, 2); // p1 (01/2026) e p2 (09/2026); p5 não está aprovada; p3 é do Vito
  assert.equal(p.indices.ganhasRecebidas, 1);
  assert.equal(p.indices.prazoMedioDias, 54); // ganha em 10/01, primeiro recebimento em 05/03
  assert.equal(p.indices.ticketMedioBr, 'R$ 300.000,01');
});

test('mês sem recebido: comissão zero, fecha e aprova, e não pede pagamento', () => {
  const a = ambiente();
  a.contrato('u_ven', '2026-09');
  let p = a.painel('vera', 'u_ven', '2026-10');
  assert.equal(p.apuracao.total, 0);
  assert.equal(p.apuracao.comissaoBr, 'R$ 0,00');
  assert.equal(p.apuracao.recebimentos.length, 0);
  assert.equal(p.fechamento.situacao, 'ABERTO');
  a.ok(passo(a, 'vera', 'conferir', 'u_ven', '2026-10'));
  a.ok(passo(a, 'wanessa', 'fechar', 'u_ven', '2026-10'));
  a.ok(passo(a, 'dora', 'aprovar', 'u_ven', '2026-10'));
  p = a.painel('wanessa', 'u_ven', '2026-10');
  assert.equal(p.fechamento.situacao, 'APROVADO');
  assert.equal(p.acoes.pagar.pode, false);
  assert.match(p.acoes.pagar.motivo, /comissão do mês é zero/);
  assert.equal(a.pend('wanessa').filter((i) => i.tipo === 'ganhos_pagar').length, 0);
  // mês corrente: em andamento, ainda não confere
  p = a.painel('vera', 'u_ven', '2026-11');
  assert.equal(p.fechamento.situacao, 'EM_ANDAMENTO');
  a.recusa(passo(a, 'vera', 'conferir', 'u_ven', '2026-11'), /ainda não terminou/);
});

test('contrato mudando no meio do ano: cada mês usa o contrato vigente e o mês fechado não muda', () => {
  const a = ambiente();
  a.contrato('u_ven', '2026-01');
  a.receber('p1', '2026-06-10', 50000, 'NF 100');
  // fecha junho inteiro (1.500,00 a 3%)
  a.ok(passo(a, 'vera', 'conferir', 'u_ven', '2026-06'));
  a.ok(passo(a, 'wanessa', 'fechar', 'u_ven', '2026-06'));
  a.ok(passo(a, 'dora', 'aprovar', 'u_ven', '2026-06'));
  // contrato novo começando em junho ou antes: recusado (junho está congelado)
  a.recusa(a.g('fabio', 'salvarContrato', { vendedorId: 'u_ven', vigencia: '2026-06', faixas: [{ ate: '', pct: 10 }], motivo: 'nova negociação de teste' }), /congelados.*Escolha o início em 07\/2026/);
  a.recusa(a.g('fabio', 'salvarContrato', { vendedorId: 'u_ven', vigencia: '2026-05', faixas: [{ ate: '', pct: 10 }], motivo: 'nova negociação de teste' }), /06\/2026/);
  // sem motivo, recusado (já existe contrato)
  a.recusa(a.g('fabio', 'salvarContrato', { vendedorId: 'u_ven', vigencia: '2026-07', faixas: [{ ate: '', pct: 10 }] }), /motivo da mudança/);
  a.ok(a.g('fabio', 'salvarContrato', { vendedorId: 'u_ven', vigencia: '2026-07', faixas: [{ ate: '', pct: 10 }], motivo: 'nova negociação assinada (teste)' }));
  a.receber('p1', '2026-07-10', 10000, 'NF 101');
  assert.equal(a.painel('vera', 'u_ven', '2026-06').apuracao.comissaoBr, 'R$ 1.500,00');
  assert.equal(a.painel('vera', 'u_ven', '2026-06').fechamento.situacao, 'APROVADO');
  assert.equal(a.painel('vera', 'u_ven', '2026-07').apuracao.comissaoBr, 'R$ 1.000,00');
});

test('contrato no meio do ano (continuação): junho congelado, julho no contrato novo, reabrir pela Diretoria', () => {
  const a = ambiente();
  a.contrato('u_ven', '2026-01');
  a.receber('p1', '2026-06-10', 50000, 'NF 100');
  a.ok(passo(a, 'vera', 'conferir', 'u_ven', '2026-06'));
  a.ok(passo(a, 'wanessa', 'fechar', 'u_ven', '2026-06'));
  a.ok(a.g('fabio', 'salvarContrato', { vendedorId: 'u_ven', vigencia: '2026-07', faixas: [{ ate: '', pct: 10 }], motivo: 'nova negociação assinada (teste)' }));
  a.receber('p1', '2026-07-10', 10000, 'NF 101');
  const jun = a.painel('wanessa', 'u_ven', '2026-06'), jul = a.painel('wanessa', 'u_ven', '2026-07');
  assert.equal(jun.apuracao.congelado, true);
  assert.equal(jun.apuracao.comissaoBr, 'R$ 1.500,00');
  assert.equal(jul.apuracao.comissaoBr, 'R$ 1.000,00');
  assert.equal(jul.apuracao.pctBr, '10%');
  // ninguém altera mês fechado: lançar, anular e classificar em junho são recusados
  a.recusa(a.g('wanessa', 'lancarRecebimento', { propostaId: 'p1', data: '2026-06-30', valor: 100, documento: 'NF tardia' }), /congelados.*reabrir/);
  const recJun = a.ok(a.g('wanessa', 'recebimentos', { competencia: '2026-06', vendedorId: 'u_ven' })).recebimentos[0];
  a.recusa(a.g('wanessa', 'anularRecebimento', { id: recJun.id, motivo: 'lançamento em duplicidade (teste)' }), /congelados/);
  // contrato usado em mês fechado não é cancelado
  const cts = a.ok(a.g('wanessa', 'contratos', { vendedorId: 'u_ven' })).contratos;
  const antigo = cts.find((c) => c.vigencia === '2026-01');
  a.recusa(a.g('wanessa', 'cancelarContrato', { id: antigo.id, motivo: 'contrato errado de teste' }), /usado no fechamento de 06\/2026/);
  // reabrir: Financeiro não pode; Diretoria sem motivo, recusado; com motivo, volta para a conferência e libera o lançamento
  a.recusa(passo(a, 'wanessa', 'reabrir', 'u_ven', '2026-06', { motivo: 'faltou um recebimento de junho' }), /da Diretoria/);
  a.recusa(passo(a, 'dora', 'reabrir', 'u_ven', '2026-06', { motivo: 'curto' }), /motivo/);
  a.ok(passo(a, 'dora', 'reabrir', 'u_ven', '2026-06', { motivo: 'faltou um recebimento de junho (teste)' }));
  assert.equal(a.painel('wanessa', 'u_ven', '2026-06').fechamento.situacao, 'ABERTO');
  a.receber('p1', '2026-06-30', 100, 'NF tardia');
  assert.equal(a.painel('wanessa', 'u_ven', '2026-06').apuracao.comissaoBr, 'R$ 1.503,00');
  const hist = a.tabelas.GAN_HISTORICO.filter((h) => h.ACAO === 'REABERTO');
  assert.equal(hist.length, 1);
  assert.match(hist[0].TEXTO, /Cálculo que estava congelado/);
});

test('fluxo completo com permissões: vendedor não fecha, Financeiro não aprova, quem fechou não aprova, pagamento exato', () => {
  const a = ambiente();
  a.recusa(a.g('vera', 'salvarContrato', { vendedorId: 'u_ven', vigencia: '2026-01', faixas: FAIXAS_MONICA }), /permissão «Manter o contrato/);
  a.recusa(a.g('wanessa', 'salvarContrato', { vendedorId: 'u_fin', vigencia: '2026-01', faixas: FAIXAS_MONICA }), /próprio contrato/);
  a.contrato('u_ven', '2026-01');
  a.contrato('u_ven2', '2026-01');
  a.receber('p2', '2026-10-05', 45000, 'NF 200');
  a.receber('p3', '2026-10-06', 20000, 'NF 300');
  // a vendedora vê só os próprios ganhos
  a.recusa(a.g('vera', 'painel', { vendedorId: 'u_ven2', competencia: '2026-10' }), /só os seus próprios ganhos/);
  a.recusa(a.g('vera', 'comparativo', { competencia: '2026-10' }), /Financeiro e da Diretoria/);
  a.recusa(a.g('vera', 'lancarRecebimento', { propostaId: 'p2', data: '2026-10-07', valor: 1, documento: 'X' }), /permissão «Lançar recebimentos/);
  assert.equal(a.ok(a.g('vera', 'recebimentos', {})).recebimentos.every((r) => r.vendedorId === 'u_ven'), true);
  // RH e técnico não veem o módulo
  assert.equal(a.ok(a.g('rita', 'iniciar')).ver, false);
  assert.equal(a.ok(a.g('tiago', 'iniciar')).ver, false);
  assert.equal(a.ok(a.g('vera', 'iniciar')).ver, true);
  // antes da conferência, o Financeiro não fecha; ninguém confere pelo vendedor
  a.recusa(passo(a, 'wanessa', 'fechar', 'u_ven', '2026-10'), /Aguardando a conferência/);
  a.recusa(passo(a, 'wanessa', 'conferir', 'u_ven', '2026-10'), /Só o próprio vendedor/);
  a.recusa(passo(a, 'dora', 'conferir', 'u_ven', '2026-10'), /Só o próprio vendedor/);
  a.ok(passo(a, 'vera', 'conferir', 'u_ven', '2026-10', { observacao: 'conferido' }));
  // recebimento novo depois da conferência: o mês volta para a vendedora
  a.receber('p2', '2026-10-25', 10000, 'NF 201');
  let p = a.painel('vera', 'u_ven', '2026-10');
  assert.equal(p.fechamento.situacao, 'ABERTO');
  assert.equal(p.apuracao.comissaoBr, 'R$ 1.650,00'); // 55.000 a 3%
  a.ok(passo(a, 'vera', 'conferir', 'u_ven', '2026-10'));
  a.recusa(passo(a, 'vera', 'fechar', 'u_ven', '2026-10'), /Fechar o mês é do Financeiro/);
  a.recusa(passo(a, 'dora', 'fechar', 'u_ven', '2026-10'), /Fechar o mês é do Financeiro/);
  a.ok(passo(a, 'wanessa', 'fechar', 'u_ven', '2026-10'));
  a.recusa(passo(a, 'wanessa', 'aprovar', 'u_ven', '2026-10'), /da Diretoria/);
  a.recusa(passo(a, 'vera', 'aprovar', 'u_ven', '2026-10'), /da Diretoria/);
  // ninguém altera mês fechado (lançamento recusado)
  a.recusa(a.g('fabio', 'lancarRecebimento', { propostaId: 'p2', data: '2026-10-26', valor: 10, documento: 'NF 202' }), /congelados/);
  a.recusa(passo(a, 'wanessa', 'pagar', 'u_ven', '2026-10', { data: '2026-11-12', forma: 'PIX', valor: '1.650,00' }), /depois da aprovação/);
  a.ok(passo(a, 'dora', 'aprovar', 'u_ven', '2026-10', { observacao: 'ok' }));
  a.recusa(passo(a, 'dora', 'pagar', 'u_ven', '2026-10', { data: '2026-11-12', forma: 'PIX', valor: '1.650,00' }), /do Financeiro/);
  a.recusa(passo(a, 'wanessa', 'pagar', 'u_ven', '2026-10', { data: '2026-11-12', forma: 'PIX', valor: '1.600,00' }), /diferente da comissão aprovada/);
  a.recusa(passo(a, 'wanessa', 'pagar', 'u_ven', '2026-10', { data: '2026-11-20', forma: 'PIX', valor: '1.650,00' }), /no futuro/);
  a.ok(passo(a, 'wanessa', 'pagar', 'u_ven', '2026-10', { data: '2026-11-12', forma: 'PIX', valor: '1.650,00', comprovante: { nome: 'pix.pdf', tipo: 'application/pdf', base64: Buffer.from('%PDF-1.4 teste').toString('base64') } }));
  p = a.painel('vera', 'u_ven', '2026-10');
  assert.equal(p.fechamento.situacao, 'PAGO');
  assert.equal(p.fechamento.pago.valorBr, 'R$ 1.650,00');
  assert.ok(p.fechamento.pago.comprovanteUrl);
  a.recusa(passo(a, 'dora', 'reabrir', 'u_ven', '2026-10', { motivo: 'teste de reabertura de mês pago' }), /Mês pago não é reaberto/);
  // o dono tem todas as caixas, mas quem fechou não aprova o mesmo fechamento
  a.ok(passo(a, 'vito', 'conferir', 'u_ven2', '2026-10'));
  a.ok(passo(a, 'admin', 'fechar', 'u_ven2', '2026-10'));
  a.recusa(passo(a, 'admin', 'aprovar', 'u_ven2', '2026-10'), /Quem fechou o mês não aprova/);
  a.ok(passo(a, 'davi', 'aprovar', 'u_ven2', '2026-10'));
  a.recusa(passo(a, 'davi', 'pagar', 'u_ven2', '2026-10', { data: '2026-11-12', forma: 'PIX', valor: '400,00' }), /do Financeiro/);
  // histórico completo, nada apagado
  const acoes = a.tabelas.GAN_HISTORICO.filter((h) => h.VENDEDOR_ID === 'u_ven' && h.COMPETENCIA === '2026-10').map((h) => h.ACAO);
  for (const x of ['CONFERIDO', 'VOLTOU_PARA_CONFERENCIA', 'FECHADO', 'APROVADO', 'PAGO']) assert.ok(acoes.includes(x), x);
  const f = a.tabelas.GAN_FECHAMENTOS.find((x) => x.VENDEDOR_ID === 'u_ven' && x.COMPETENCIA === '2026-10');
  assert.equal(JSON.parse(f.CALCULO_JSON).comissao, 1650);
  assert.equal(f.CALCULO_HASH.length, 64);
  // comparativo (Financeiro e Diretoria)
  const cmp = a.ok(a.g('dora', 'comparativo', { competencia: '2026-10' }));
  assert.equal(cmp.linhas.find((l) => l.id === 'u_ven').comissaoBr, 'R$ 1.650,00');
  assert.equal(cmp.linhas.find((l) => l.id === 'u_ven2').comissaoBr, 'R$ 400,00');
});

test('contestação e devolução: resposta obrigatória, Diretoria devolve, correção volta para o vendedor', () => {
  const a = ambiente();
  a.contrato('u_ven', '2026-01');
  a.receber('p2', '2026-10-05', 30000, 'NF 200');
  a.recusa(passo(a, 'vera', 'contestar', 'u_ven', '2026-10', { motivo: 'falta' }), /escreva o que está errado/);
  a.ok(passo(a, 'vera', 'contestar', 'u_ven', '2026-10', { motivo: 'falta o recebimento da NF 201 pago em 28/10 (teste)' }));
  assert.ok(a.pend('wanessa').some((i) => i.tipo === 'ganhos_fechar' && /contestados/.test(i.titulo)));
  a.recusa(passo(a, 'wanessa', 'fechar', 'u_ven', '2026-10'), /resposta à contestação/);
  a.ok(passo(a, 'wanessa', 'fechar', 'u_ven', '2026-10', { resposta: 'a NF 201 foi paga em novembro, entra no mês seguinte (teste)' }));
  a.recusa(passo(a, 'dora', 'devolver', 'u_ven', '2026-10', { motivo: 'curto' }), /motivo/);
  a.ok(passo(a, 'dora', 'devolver', 'u_ven', '2026-10', { motivo: 'conferir a data real do pagamento da NF 201 (teste)' }));
  assert.equal(a.painel('wanessa', 'u_ven', '2026-10').apuracao.congelado, false);
  a.receber('p2', '2026-10-28', 5000, 'NF 201');
  assert.equal(a.painel('vera', 'u_ven', '2026-10').fechamento.situacao, 'ABERTO');
  assert.ok(a.pend('vera').some((i) => i.tipo === 'ganhos_conferir' && i.id === 'GAN:CONF:u_ven:2026-10'));
  a.ok(passo(a, 'vera', 'conferir', 'u_ven', '2026-10'));
  a.ok(passo(a, 'wanessa', 'fechar', 'u_ven', '2026-10'));
  assert.equal(a.painel('dora', 'u_ven', '2026-10').apuracao.comissaoBr, 'R$ 1.050,00');
});

test('recebimento sem vendedor fica "a classificar" e não entra em comissão; classificação só pela proposta', () => {
  const a = ambiente();
  a.contrato('u_ven', '2026-01');
  a.recusa(a.g('wanessa', 'lancarRecebimento', { semProposta: true, clienteNome: 'Cliente X', data: '2026-10-10', valor: 1000, documento: 'NF 900' }), /por que não há proposta/);
  const sem = a.ok(a.g('wanessa', 'lancarRecebimento', { semProposta: true, clienteNome: 'Cliente de teste sem proposta', data: '2026-10-10', valor: '1.000,00', documento: 'NF 900', observacao: 'depósito sem identificação no extrato (teste)' })).recebimento;
  assert.equal(sem.situacao, 'A_CLASSIFICAR');
  assert.equal(sem.vendedorId, '');
  // proposta sem responsável (nem na oportunidade): também a classificar, sem chute
  const semResp = a.receber('p4', '2026-10-11', 2000, 'NF 901').recebimento;
  assert.equal(semResp.situacao, 'A_CLASSIFICAR');
  // proposta não aprovada pelo cliente: recusada
  a.recusa(a.g('wanessa', 'lancarRecebimento', { propostaId: 'p5', data: '2026-10-11', valor: 10, documento: 'NF 902' }), /não está aprovada pelo cliente/);
  // nenhum dos dois entra na apuração de ninguém
  assert.equal(a.painel('wanessa', 'u_ven', '2026-10').apuracao.total, 0);
  assert.ok(a.pend('wanessa').some((i) => i.tipo === 'ganhos_classificar' && /2 recebimentos/.test(i.titulo)));
  // classificar com proposta sem responsável: recusado; com a proposta da vendedora: entra para ela
  a.recusa(a.g('fabio', 'classificarRecebimento', { id: sem.id, propostaId: 'p4' }), /não tem vendedor responsável/);
  a.ok(a.g('fabio', 'classificarRecebimento', { id: sem.id, propostaId: 'p2' }));
  const p = a.painel('wanessa', 'u_ven', '2026-10');
  assert.equal(p.apuracao.total, 1000);
  assert.equal(p.apuracao.comissaoBr, 'R$ 20,00');
  // ninguém lança recebimento da própria venda (p6 é da Wanessa)
  a.recusa(a.g('wanessa', 'lancarRecebimento', { propostaId: 'p6', data: '2026-10-11', valor: 10, documento: 'NF 903' }), /própria venda/);
  // acima do total da proposta só com justificativa; duplicado recusado
  a.recusa(a.g('wanessa', 'lancarRecebimento', { propostaId: 'p2', data: '2026-10-12', valor: 95000, documento: 'NF 904' }), /passaria do total/);
  a.receber('p2', '2026-10-12', 100, 'NF 905');
  a.recusa(a.g('wanessa', 'lancarRecebimento', { propostaId: 'p2', data: '2026-10-13', valor: 100, documento: 'NF 905' }), /já existe o recebimento/);
  // anular com motivo: sai da apuração
  const lista = a.ok(a.g('wanessa', 'recebimentos', { competencia: '2026-10', vendedorId: 'u_ven' })).recebimentos;
  const r905 = lista.find((r) => r.documento === 'NF 905');
  a.ok(a.g('wanessa', 'anularRecebimento', { id: r905.id, motivo: 'lançado na proposta errada (teste)' }));
  assert.equal(a.painel('wanessa', 'u_ven', '2026-10').apuracao.total, 1000);
  assert.equal(a.tabelas.GAN_RECEBIMENTOS.length, 3); // sem proposta, proposta sem responsável e NF 905 (anulada, não apagada)
  // busca de propostas para o lançamento: só aprovadas
  const busca = a.ok(a.g('wanessa', 'propostas', { q: 'prop-2026' })).propostas;
  assert.ok(!busca.some((x) => x.numero === 'PROP-2026-0005'));
  assert.ok(busca.find((x) => x.numero === 'PROP-2026-0004').semVendedor);
});

test('pendências, Caixa de decisões e caixas de acesso', () => {
  const a = ambiente();
  a.contrato('u_ven', '2026-09');
  a.receber('p2', '2026-10-05', 30000, 'NF 200');
  // setembro e outubro terminaram: a vendedora confere os dois
  const pv = a.pend('vera').filter((i) => i.tipo === 'ganhos_conferir').map((i) => i.id).sort();
  assert.deepEqual(pv, ['GAN:CONF:u_ven:2026-09', 'GAN:CONF:u_ven:2026-10']);
  assert.ok(pv.every((id) => !/R\$/.test(id)));
  a.ok(passo(a, 'vera', 'conferir', 'u_ven', '2026-10'));
  assert.ok(a.pend('wanessa').some((i) => i.id === 'GAN:FECH:u_ven:2026-10'));
  assert.ok(!a.pend('vera').some((i) => i.id === 'GAN:FECH:u_ven:2026-10'));
  a.ok(passo(a, 'wanessa', 'fechar', 'u_ven', '2026-10'));
  // Caixa de decisões: aprovação vai para a Diretoria (reserva), sem a vendedora nem quem fechou
  a.ctx.SGO_Pendencias_invalidar_();
  const cx = a.ctx.Ges_pendenciasDecisao_().itens.filter((i) => i.tipo === 'ganhos_aprovar');
  assert.equal(cx.length, 1);
  const rota = a.ctx.Ges_rotear_(cx[0], a.ctx.Ges_cfg_(), a.ctx.Ges_usuarios_());
  assert.ok(rota.ids.includes('u_dir') && rota.ids.includes('u_dir2'));
  assert.ok(!rota.ids.includes('u_ven') && !rota.ids.includes('u_fin'));
  assert.ok(!/R\$/.test(cx[0].titulo));
  // contagens da tela
  assert.equal(a.ok(a.g('dora', 'iniciar')).contagens.aprovar, 1);
  assert.equal(a.ok(a.g('vera', 'iniciar')).contagens.conferir, 1);
  // caixas registradas no catálogo, já ligadas, com o padrão certo
  const cat = a.ctx.SGO_poderesCatalogo_();
  for (const c of ['GANHOS_VER_TODOS', 'GANHOS_CONTRATOS', 'GANHOS_RECEBIMENTOS', 'GANHOS_FECHAR', 'GANHOS_APROVAR', 'GANHOS_PAGAR', 'GANHOS_REABRIR']) assert.ok(cat.mapa[c] && cat.mapa[c].ligado, c);
  const pod = (login) => a.ok(a.g(login, 'iniciar')).poderes;
  assert.deepEqual(pod('wanessa'), { GANHOS_VER_TODOS: true, GANHOS_CONTRATOS: true, GANHOS_RECEBIMENTOS: true, GANHOS_FECHAR: true, GANHOS_APROVAR: false, GANHOS_PAGAR: true, GANHOS_REABRIR: false });
  assert.deepEqual(pod('dora'), { GANHOS_VER_TODOS: true, GANHOS_CONTRATOS: true, GANHOS_RECEBIMENTOS: false, GANHOS_FECHAR: false, GANHOS_APROVAR: true, GANHOS_PAGAR: false, GANHOS_REABRIR: true });
  assert.ok(Object.values(pod('vera')).every((v) => v === false));
  // exceção gravada em Acessos vale: a Diretora sem a caixa de aprovar deixa de aprovar
  a.tabelas.SYS_PODERES_EXCECOES = [{ ID: 'x1', USUARIO_ID: 'u_dir', PODER: 'GANHOS_APROVAR', VALOR: 'NAO', MOTIVO: 'teste' }];
  a.recusa(passo(a, 'dora', 'aprovar', 'u_ven', '2026-10'), /da Diretoria/);
  a.ok(passo(a, 'davi', 'aprovar', 'u_ven', '2026-10'));
});

test('sem o motor de caixas, a mesma regra padrão vale (Financeiro fecha, Diretoria aprova)', () => {
  const a = ambiente({ semPoderes: true });
  a.contrato('u_ven', '2026-01');
  a.receber('p2', '2026-10-05', 1000, 'NF 1');
  a.ok(passo(a, 'vera', 'conferir', 'u_ven', '2026-10'));
  a.recusa(passo(a, 'dora', 'fechar', 'u_ven', '2026-10'), /do Financeiro/);
  a.ok(passo(a, 'wanessa', 'fechar', 'u_ven', '2026-10'));
  a.ok(passo(a, 'dora', 'aprovar', 'u_ven', '2026-10'));
});

test('avaliação: sem chave vale a análise por regras; a IA recebe só os números apurados e é conferida', () => {
  const sem = ambiente();
  sem.contrato('u_ven', '2026-01');
  sem.receber('p2', '2026-10-05', 25000, 'NF 1');
  const r0 = sem.ok(sem.g('vera', 'avaliacao', { vendedorId: 'u_ven', competencia: '2026-10' }));
  assert.equal(r0.origem, 'REGRAS');
  assert.match(r0.aviso, /chave da IA não está cadastrada/);
  assert.match(r0.texto, /R\$ 25\.000,00/);
  assert.match(r0.texto, /faltam R\$ 5\.000,01/);
  assert.match(r0.texto, /CLINICA TESTE BETA respondeu por 100%/);
  assert.equal(sem.iaPrompts.length, 0);
  sem.recusa(sem.g('vera', 'avaliacao', { vendedorId: 'u_ven2', competencia: '2026-10' }), /só os seus próprios ganhos/);

  let resposta = '';
  const comIa = ambiente({ ia: () => resposta });
  comIa.contrato('u_ven', '2026-01');
  comIa.receber('p2', '2026-10-05', 25000, 'NF 1');
  resposta = JSON.stringify({ texto: 'Em outubro de 2026, Vera recebeu R$ 25.000,00 e ficou na faixa de 2%, com comissão de R$ 500,00. Todo o valor veio de um único cliente, o que concentra o resultado. Para chegar à faixa de 3%, faltam R$ 5.000,01 recebidos no mês. Acompanhar a cobrança das propostas já ganhas é o caminho mais curto.' });
  const r1 = comIa.ok(comIa.g('vera', 'avaliacao', { vendedorId: 'u_ven', competencia: '2026-10' }));
  assert.equal(r1.origem, 'IA', r1.aviso);
  assert.equal(comIa.iaPrompts.length, 1);
  assert.match(comIa.iaPrompts[0], /FATOS:/);
  assert.match(comIa.iaPrompts[0], /R\$ 25\.000,00/);
  assert.ok(!/NF 1/.test(comIa.iaPrompts[0]), 'documento não vai para a IA');
  // número inventado: recusado, vale a regra
  resposta = JSON.stringify({ texto: 'Em outubro de 2026, Vera recebeu R$ 31.000,00 e ficou na faixa de 3%, com comissão de R$ 930,00. O resultado é bom e deve crescer no próximo mês com novas propostas.' });
  const r2 = comIa.ok(comIa.g('vera', 'avaliacao', { vendedorId: 'u_ven', competencia: '2026-10' }));
  assert.equal(r2.origem, 'REGRAS');
  assert.match(r2.aviso, /fora dos números apurados/);
  assert.equal(comIa.tabelas.GAN_AVALIACOES.length, 2);
  assert.equal(comIa.ok(comIa.g('vera', 'painel', { vendedorId: 'u_ven', competencia: '2026-10' })).ultimaAvaliacao.origem, 'REGRAS');
});

test('abas criadas no primeiro uso, sessão inválida recusada, ajuda registrada e função pública aceita pelo servidor', () => {
  const a = ambiente();
  assert.equal(a.tabelas.GAN_CONTRATOS, undefined);
  a.contrato('u_ven', '2026-01');
  for (const t of ['GAN_CONTRATOS', 'GAN_RECEBIMENTOS', 'GAN_FECHAMENTOS', 'GAN_HISTORICO', 'GAN_AVALIACOES']) assert.ok(Array.isArray(a.tabelas[t]), t);
  const r = a.ctx.GanhosVendedores_api('sessao-falsa', 'iniciar', {});
  assert.equal(r.ok, false);
  const aj = a.ctx.SGO_ajudaTelas_GanhosVendedores_();
  assert.ok(aj.ganhos_vendedores && aj.ganhos_vendedores.passos.length >= 5);
  // mesmas regras do /api/run (src/servidor.ts): função pública com sessão como objeto e destinos de despacho ficam bloqueados
  const texto = fs.readFileSync(path.join(PASTA, 'SGO_Ganhos_Vendedores.js'), 'utf8');
  const publicas = [...texto.matchAll(/^function\s+([A-Za-z$][\w$]*)\s*\(([^)]*)\)/gm)].filter((m) => !m[1].endsWith('_'));
  assert.deepEqual(publicas.map((m) => m[1]), ['GanhosVendedores_api']);
  assert.ok(!publicas[0][2].split(',').map((p) => p.trim()).some((p) => ['sessao', 'sess', 'eu', 'sessaoObj'].includes(p)));
  const tela = fs.readFileSync(path.join(PASTA, 'JS_GanhosVendedores.html'), 'utf8');
  assert.match(tela, /\.GanhosVendedores_api\(/);
  assert.ok(!/window\.prompt|\bprompt\(|\bconfirm\(|\balert\(/.test(tela), 'sem prompt/confirm/alert');
  const index = fs.readFileSync(path.join(PASTA, 'Index.html'), 'utf8');
  assert.match(index, /include\('JS_GanhosVendedores'\)/);
  assert.match(index, /data-mod="ganhos_vendedores"/);
  const core = fs.readFileSync(path.join(PASTA, 'JS_Core.html'), 'utf8');
  assert.match(core, /mod === "ganhos_vendedores" && typeof Ganhos_render_ === "function"/);
  assert.equal((core.match(/Ganhos_iniciar_\(\)/g) || []).length >= 2, true);
});
