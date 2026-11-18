// Onda A do Financeiro (18/11/2026), item A1: contas fixas recorrentes. Cadastro local (começa vazio), conta do mês preparada pela rotina,
// lançamento só pela prévia de Lançamentos e baixas, pendência só para a lista de sigilo, Gantt e previsão de 90 dias.
// Especificação: ESPEC_ONDA2_FINANCEIRO.md, seção 5 (A1) e seção 1.6. Código REAL do SGO+ com o OMIE SIMULADO; nada sai para a rede.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { montarA } = require('./_financeiro_onda_a.cjs');

const ALUGUEL = { descricao: 'Aluguel da sede', fornecedorId: '90', fornecedorNome: 'Posto Noventa Fictício', categoria: '2.10', categoriaNome: 'Serviços de terceiros', contaId: '5', contaNome: 'Banco simulado', dia: '20', valorTipo: 'FIXO', valor: '2.500,00', inicio: '2026-11' };
const ENERGIA = { descricao: 'Energia do escritório', fornecedorId: '91', fornecedorNome: 'Terceiros Noventa e Um', categoria: '2.03', categoriaNome: 'Combustível', contaId: '5', contaNome: 'Banco simulado', dia: '31', valorTipo: 'VARIAVEL', inicio: '2026-11' };
const cadastrar = (a, d) => { const r = a.F('OmieFix_apiSalvar', 'wanessa', d); assert.equal(r.ok, true, r.mensagem); return r.id; };

test('A1-1: a tela começa vazia (nada inventado) e o cadastro confere cada campo com o quê, por quê e o que fazer', () => {
  const a = montarA();
  const r = a.F('OmieFix_apiTela', 'wanessa');
  assert.equal(r.ok, true, r.mensagem);
  assert.deepEqual([r.fixas.length, r.paraLancar.length, r.proximas.length, r.feitas.length], [0, 0, 0, 0]);
  assert.equal((a.tabelas.FIN_CONTAS_FIXAS || []).length, 0);
  const erros = [
    [{}, /descrição/], [Object.assign({}, ALUGUEL, { fornecedorId: '' }), /Escolha o fornecedor no Omie[\s\S]*Usar este/], [Object.assign({}, ALUGUEL, { categoria: '' }), /categoria de despesa/],
    [Object.assign({}, ALUGUEL, { contaId: 'x' }), /conta corrente/], [Object.assign({}, ALUGUEL, { dia: '32' }), /de 1 a 31/], [Object.assign({}, ALUGUEL, { valor: '0' }), /valor fixo[\s\S]*Valor varia/],
    [Object.assign({}, ALUGUEL, { valor: 'abc' }), /valor fixo/], [Object.assign({}, ALUGUEL, { inicio: '' }), /mês de início/], [Object.assign({}, ALUGUEL, { fim: '2026-10' }), /anterior ao de início/],
    [Object.assign({}, ALUGUEL, { valorTipo: 'x' }), /fixo ou se varia/]
  ];
  for (const [d, re] of erros) { const x = a.F('OmieFix_apiSalvar', 'wanessa', d); assert.equal(x.ok, false); assert.match(x.mensagem, re); assert.match(x.mensagem, /Nada foi gravado/); }
  assert.equal((a.tabelas.FIN_CONTAS_FIXAS || []).length, 0);
  const id = cadastrar(a, ALUGUEL);
  const f = a.tabelas.FIN_CONTAS_FIXAS[0];
  assert.deepEqual([f.ID, f.VALOR, f.VALOR_TIPO, f.DIA, f.INICIO, f.FIM, f.CRIADO_POR_ID], [id, 2500, 'FIXO', '20', '2026-11', '', 'u_fin']);
  assert.equal(a.tabelas.FIN_CONTAS_FIXAS_HIST[0].ACAO, 'CADASTRO');
  assert.equal(a.escritas().length, 0, 'cadastrar não grava nada no Omie');
});

test('A1-2: alterar só grava o que mudou (merge), pede motivo e guarda antes e depois; o mês já preparado não muda', () => {
  const a = montarA();
  const id = cadastrar(a, ALUGUEL);
  a.F('OmieFix_apiTela', 'wanessa'); // prepara novembro (vence 20/11, dentro de 10 dias)
  let r = a.F('OmieFix_apiSalvar', 'wanessa', Object.assign({}, ALUGUEL, { id, valor: '2.750,00' }));
  assert.equal(r.ok, false); assert.match(r.mensagem, /motivo da alteração[\s\S]*15 letras/);
  // outro campo do registro (gravado fora do formulário) não pode ser apagado pela alteração
  a.tabelas.FIN_CONTAS_FIXAS[0].CRIADO_EM = '2026-11-16T13:00:00.000Z';
  r = a.F('OmieFix_apiSalvar', 'wanessa', Object.assign({}, ALUGUEL, { id, valor: '2.750,00', motivo: 'reajuste anual do contrato de aluguel' }));
  assert.equal(r.ok, true, r.mensagem);
  const f = a.tabelas.FIN_CONTAS_FIXAS[0];
  assert.equal(f.VALOR, 2750); assert.equal(f.CRIADO_EM, '2026-11-16T13:00:00.000Z'); assert.equal(f.DESCRICAO, 'Aluguel da sede');
  const h = a.tabelas.FIN_CONTAS_FIXAS_HIST.slice(-1)[0];
  assert.deepEqual([h.ACAO, h.ANTES, h.DEPOIS, h.MOTIVO], ['ALTERACAO', 'Valor fixo: R$ 2.500,00', 'Valor fixo: R$ 2.750,00', 'reajuste anual do contrato de aluguel']);
  r = a.F('OmieFix_apiSalvar', 'wanessa', Object.assign({}, ALUGUEL, { id, valor: '2750', motivo: 'nada mudou de verdade aqui' }));
  assert.equal(r.ok, false); assert.match(r.mensagem, /Nenhum campo foi alterado/);
  const t = a.F('OmieFix_apiTela', 'wanessa');
  assert.equal(t.paraLancar[0].valorTxt, 'R$ 2.500,00', 'novembro já preparado continua com o valor da época');
  assert.equal(t.proximas.find((o) => o.competencia === '2026-12').valorTxt, 'R$ 2.750,00', 'dezembro já sai com o valor novo');
});

test('A1-3: a rotina prepara a conta do mês 10 dias antes; "Preparar lançamento" preenche o lançamento e só a confirmação grava no Omie', () => {
  const a = montarA({ agora: '2026-11-05T09:00:00-03:00' });
  const id = cadastrar(a, ALUGUEL);
  let rod = a.j(a.ctx.FinFix_rodada_(new a.ctx.Date()));
  assert.deepEqual(rod, { preparadas: 0 }, 'a 15 dias do vencimento ainda não prepara');
  a.em('2026-11-10T07:00:00-03:00');
  rod = a.j(a.ctx.FinFix_rodada_(new a.ctx.Date()));
  assert.deepEqual(rod, { preparadas: 1 });
  assert.deepEqual(a.j(a.ctx.FinFix_rodada_(new a.ctx.Date())), { fora: 'contas fixas já preparadas hoje' }, 'uma vez por dia');
  const m = a.tabelas.FIN_FIXAS_MES[0];
  assert.deepEqual([m.FIXA_ID, m.COMPETENCIA, m.VENCIMENTO, m.VALOR_PREVISTO, m.SITUACAO, m.REFERENCIA], [id, '2026-11', '2026-11-20', 2500, 'PREPARADA', 'FIX-' + id + '-202611']);
  assert.equal(a.escritas().length, 0, 'preparar não grava no Omie');
  // a rotina está em Ges_rodada_ (o mesmo caminho das rotinas do Financeiro; nenhum cron novo)
  assert.match(vm.runInContext('Ges_rodada_.toString()', a.ctx), /FinFix_rodada_\(quando\)/);
  const pr = a.F('OmieFix_apiPreparar', 'wanessa', { fixaId: id, competencia: '2026-11' });
  assert.equal(pr.ok, true, pr.mensagem);
  assert.deepEqual(pr.previo, { pessoaId: '90', pessoaNome: 'Posto Noventa Fictício', documento: 'FX202611-' + id.replace(/[^0-9A-Za-z]/g, '').slice(0, 4).toUpperCase(), valor: 2500, vencimento: '20/11/2026',
    categoria: '2.10', categoriaNome: 'Serviços de terceiros', contaId: '5', referencia: 'FIX-' + id + '-202611', observacao: 'Conta fixa: Aluguel da sede (competência 11/2026). Preparada pelo SGO+.' });
  const pv = a.F('OmieOps_apiPrevia', 'wanessa', { acao: 'criar', tipo: 'pagar', dados: pr.previo });
  assert.equal(pv.ok, true, pv.mensagem);
  assert.equal(a.escritas().length, 0, 'a prévia não grava');
  assert.equal(a.F('OmieFix_apiTela', 'wanessa').paraLancar.length, 1, 'sem confirmar, continua para lançar');
  const c = a.F('OmieOps_apiConfirmar', 'wanessa', { token: pv.token });
  assert.equal(c.ok, true, c.mensagem);
  assert.deepEqual(a.escritas().map((x) => [x.call, x.param.codigo_lancamento_integracao, x.param.valor_documento]), [['IncluirContaPagar', 'FIX-' + id + '-202611', 2500]]);
  const m2 = a.tabelas.FIN_FIXAS_MES[0];
  assert.deepEqual([m2.SITUACAO, m2.FORMA, m2.TITULO_OMIE, m2.VALOR_LANCADO, m2.LANCADA_POR_ID], ['LANCADA', 'SGO', '901', 2500, 'u_fin']);
  const t = a.F('OmieFix_apiTela', 'wanessa');
  assert.equal(t.paraLancar.length, 0); assert.equal(t.feitas.length, 1); assert.match(t.feitas[0].situacaoNome, /Lançada/);
  const de = a.F('OmieFix_apiPreparar', 'wanessa', { fixaId: id, competencia: '2026-11' });
  assert.equal(de.ok, false); assert.match(de.mensagem, /já foi lançada \(título 901 no Omie\)[\s\S]*para não lançar duas vezes/);
  // a mesma referência entra na trilha das operações
  assert.equal(a.trilha().slice(-1)[0].CODIGO_INTEGRACAO, 'FIX-' + id + '-202611');
});

test('A1-4: valor variável abre sem valor e a prévia exige o valor; dia 31 vira o último dia do mês', () => {
  const a = montarA({ agora: '2026-11-24T09:00:00-03:00' });
  const id = cadastrar(a, ENERGIA);
  const t = a.F('OmieFix_apiTela', 'wanessa');
  assert.equal(t.paraLancar[0].vencimentoBr, '30/11/2026'); assert.equal(t.paraLancar[0].valorTxt, 'Valor varia: informe no lançamento');
  const pr = a.F('OmieFix_apiPreparar', 'wanessa', { fixaId: id, competencia: '2026-11' });
  assert.equal(pr.previo.valor, ''); assert.equal(pr.conta.variavel, true);
  assert.equal(a.F('OmieOps_apiPrevia', 'wanessa', { acao: 'criar', tipo: 'pagar', dados: pr.previo }).ok, false, 'sem valor, a prévia recusa');
  assert.equal(a.j(a.ctx.FinFix_vencimento_('2027-02', 31)), '2027-02-28');
  assert.equal(a.j(a.ctx.FinFix_vencimento_('2028-02', 30)), '2028-02-29');
});

test('A1-5: dispensar e "já lancei direto no Omie" pedem motivo, saem da lista e podem ser desfeitos; fim encerra a conta', () => {
  const a = montarA({ agora: '2026-11-12T09:00:00-03:00' });
  const id = cadastrar(a, ALUGUEL);
  let r = a.F('OmieFix_apiOcorrencia', 'wanessa', { fixaId: id, competencia: '2026-11', acao: 'DISPENSAR', motivo: 'curto' });
  assert.equal(r.ok, false); assert.match(r.mensagem, /pelo menos 15 letras[\s\S]*Nada foi alterado/);
  r = a.F('OmieFix_apiOcorrencia', 'wanessa', { fixaId: id, competencia: '2026-11', acao: 'DISPENSAR', motivo: 'carência de um mês negociada com o locador' });
  assert.equal(r.ok, true, r.mensagem);
  let t = a.F('OmieFix_apiTela', 'wanessa');
  assert.equal(t.paraLancar.length, 0); assert.equal(t.feitas[0].situacao, 'DISPENSADA'); assert.equal(t.feitas[0].podeDesfazer, true);
  r = a.F('OmieFix_apiOcorrencia', 'wanessa', { fixaId: id, competencia: '2026-11', acao: 'DESFAZER', motivo: 'a carência não foi aprovada' });
  assert.equal(r.ok, true, r.mensagem);
  r = a.F('OmieFix_apiOcorrencia', 'wanessa', { fixaId: id, competencia: '2026-11', acao: 'LANCADA_DIRETO', motivo: 'lançada no Omie em 10/11, documento 778' });
  assert.equal(r.ok, true, r.mensagem);
  t = a.F('OmieFix_apiTela', 'wanessa');
  assert.equal(t.feitas[0].forma, 'OMIE_DIRETO'); assert.equal(t.paraLancar.length, 0);
  assert.equal(a.escritas().length, 0, 'nada vai ao Omie por aqui');
  // fim em dezembro: janeiro não aparece
  r = a.F('OmieFix_apiSalvar', 'wanessa', Object.assign({}, ALUGUEL, { id, fim: '2026-12', motivo: 'contrato de aluguel termina em dezembro' }));
  assert.equal(r.ok, true, r.mensagem);
  t = a.F('OmieFix_apiTela', 'wanessa');
  assert.deepEqual(t.proximas.map((o) => o.competencia), ['2026-12']);
  // sem a caixa de lançar, não mexe (fora da lista, nem vê)
  for (const fora of ['rita', 'gil']) { const x = a.F('OmieFix_apiTela', fora); assert.equal(x.ok, false); assert.match(x.mensagem, /O Financeiro é sigiloso/); }
});

test('A1-6: pendência quando a conta chega ao vencimento sem lançamento: só a lista de sigilo, só a contagem, sem descrição nem valor', () => {
  const a = montarA({ agora: '2026-11-19T09:00:00-03:00' });
  cadastrar(a, ALUGUEL);
  assert.ok(!a.pend('wanessa').some((x) => x.id === 'OMIE:FIX:ATRASADAS'), 'antes do vencimento, sem pendência');
  a.em('2026-11-20T09:00:00-03:00');
  const p = a.pend('wanessa').find((x) => x.id === 'OMIE:FIX:ATRASADAS');
  assert.ok(p, 'no dia do vencimento, pendência');
  assert.equal(p.gravidade, 'CRITICO');
  assert.match(p.titulo, /^1 conta fixa chegou ao vencimento sem ser lançada no Omie$/);
  assert.ok(!/Aluguel|R\$|2\.500/.test(p.titulo + p.detalhe + p.oQueFazer), 'sem descrição nem valor');
  assert.deepEqual(p.paraUsuarios.sort(), ['u_fin', 'u_fin2'], 'as pessoas do Financeiro da lista');
  for (const fora of ['rita', 'gil', 'matheusgodoi', 'tiago']) assert.ok(!a.pend(fora).some((x) => /^OMIE:FIX/.test(x.id)), fora);
});

test('A1-7: Agenda financeira e previsão de 90 dias: conta fixa não lançada entra (valor variável fora da soma); lançada não conta duas vezes', () => {
  const a = montarA({ foto: true });
  const prev0 = a.F('FinAg_apiAgenda', 'wanessa', { dias: 60 });
  assert.equal(prev0.ok, true, prev0.mensagem);
  const ultimo0 = prev0.previsao.semanas.slice(-1)[0];
  const id = cadastrar(a, ALUGUEL); cadastrar(a, ENERGIA);
  const r = a.F('FinAg_apiAgenda', 'wanessa', { dias: 60 });
  assert.equal(r.ok, true, r.mensagem);
  assert.match(r.gantt.html, /Contas fixas a pagar ainda não lançadas no Omie/);
  assert.ok(r.gantt.detalhes.some((d) => d.linhas.some((l) => /^Aluguel da sede · R\$ 2\.500,00 · vence 20\/11\/2026 · ainda não lançada no Omie$/.test(l))), 'losango do aluguel com o valor');
  assert.ok(r.gantt.detalhes.some((d) => d.linhas.some((l) => /^Energia do escritório · valor varia \(confirmar no mês\)/.test(l))), 'energia sem valor');
  const fx = r.previsao.premissas.filter((p) => /conta\(s\) fixa\(s\)/.test(p));
  // em 90 dias a partir de 16/11: aluguel de 20/11, 20/12 e 20/01 = R$ 7.500,00; energia de 30/11, 31/12 e 31/01 = 3 variáveis
  assert.equal(fx[0], '3 conta(s) fixa(s) ainda não lançada(s) no Omie (aba Contas fixas) entram como saída no vencimento (as já vencidas, hoje), somando R$ 7.500,00.');
  assert.match(fx[1], /^3 conta\(s\) fixa\(s\) de valor variável fica\(m\) fora da soma/);
  const brl = (t) => Number(String(t).replace(/[^\d,-]/g, '').replace(',', '.'));
  assert.equal(Math.round((brl(ultimo0.realista) - brl(r.previsao.semanas.slice(-1)[0].realista)) * 100) / 100, 7500, 'saldo final cai R$ 7.500,00');
  // lançada no Omie: sai da conta da previsão (entra pela fotografia do Omie)
  const pr = a.F('OmieFix_apiPreparar', 'wanessa', { fixaId: id, competencia: '2026-11' });
  const pv = a.F('OmieOps_apiPrevia', 'wanessa', { acao: 'criar', tipo: 'pagar', dados: pr.previo });
  assert.equal(a.F('OmieOps_apiConfirmar', 'wanessa', { token: pv.token }).ok, true);
  const r2 = a.F('FinAg_apiAgenda', 'wanessa', { dias: 60 });
  assert.match(r2.previsao.premissas.find((p) => /entram como saída/.test(p)), /^2 conta\(s\) fixa\(s\)[\s\S]*R\$ 5\.000,00\.$/);
  // função pura: conta vencida entra hoje; valor variável não soma
  const p = a.j(a.ctx.FinAg_previsao_({ hoje: '2026-11-16', saldo: 1000, lista: [], taxas: {}, fixas: [{ dia: '2026-11-10', valor: 300, descricao: 'x' }, { dia: '2026-11-20', valor: null, descricao: 'y' }, { dia: '2026-11-18', valor: 200, descricao: 'z' }] }));
  assert.deepEqual([p.dias[0].sai, p.dias[0].realista, p.dias[2].sai, p.dias[2].realista, p.totais.fixas, p.totais.fixasValor, p.totais.fixasVariaveis], [300, 700, 200, 500, 2, 500, 1]);
  // sem contas fixas, a previsão fica exatamente como antes (nenhuma premissa nova)
  const p0 = a.j(a.ctx.FinAg_previsao_({ hoje: '2026-11-16', saldo: 1000, lista: [], taxas: {} }));
  assert.ok(!p0.premissas.some((x) => /fixa/.test(x)));
});

test('A1-8: Lançamentos e baixas mostra a faixa com a contagem; sigilo e registro de acessos', () => {
  const a = montarA({ agora: '2026-11-12T09:00:00-03:00' });
  assert.deepEqual(a.F('OmieFix_apiResumo', 'wanessa'), { ok: true, paraLancar: 0, vencidas: 0 });
  cadastrar(a, ALUGUEL);
  assert.deepEqual(a.F('OmieFix_apiResumo', 'wanessa'), { ok: true, paraLancar: 1, vencidas: 0 });
  a.em('2026-11-21T09:00:00-03:00');
  assert.deepEqual(a.F('OmieFix_apiResumo', 'wanessa'), { ok: true, paraLancar: 1, vencidas: 1 });
  assert.equal(a.F('OmieFix_apiResumo', 'rita').ok, false);
  assert.ok(a.acessos().some((x) => x.CONSULTA === 'OmieFix_apiSalvar' && x.RESULTADO === 'CONTA_FIXA'));
  assert.equal(a.ctx.OMIE_SIGILO_NOMES.OmieFix_apiTela, 'Contas fixas');
  assert.ok(!a.acessos().some((x) => /2\.500|2500/.test(x.DETALHE)), 'nenhum valor no registro de acessos');
});
