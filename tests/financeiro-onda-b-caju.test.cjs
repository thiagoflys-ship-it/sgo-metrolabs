// Onda B do Financeiro, B3 (18/11/2026): cada carga paga ao Caju (Depósito de viagem e Recarga Caju; pela API ou registrada à mão) vira
// conta a pagar no Omie, com a taxa de serviço como conta separada, cada uma na sua categoria; viagem, colaborador e centro de custo vão na
// observação; o centro de custo como departamento do Omie só quando ligado (padrão: não envia). Pendências só para a lista de sigilo.
// Código REAL do SGO+ com o OMIE SIMULADO (tests/_financeiro_onda_b.cjs); nada sai para a rede (nenhum Caju real).
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { montarOndaB } = require('./_financeiro_onda_b.cjs');

test('cargas do Caju: viagem pela API (crédito e taxa separados), viagem registrada à mão e Recarga Caju, com a identificação na observação', () => {
  const a = montarOndaB();
  const r = a.tela('wanessa', { grupo: 'caju' });
  assert.equal(r.ok, true, r.mensagem);
  assert.deepEqual(r.paraLancar.map((x) => x.referencia).sort(), ['CJU-R-rk1', 'CJU-V-c1', 'CJU-V-c1-TX', 'CJU-V-c2']);
  assert.ok(r.paraLancar.every((x) => x.grupo === 'caju'), 'o filtro mostra só o Caju');
  const taxa = a.item(r, 'CJU-V-c1-TX');
  assert.deepEqual([taxa.valorTxt, taxa.tipoNome], ['R$ 1,50', 'Carga Caju de viagem (taxa de serviço)']);
  const pc = a.F('OmieEsp_apiPreparar', 'wanessa', { chave: a.item(r, 'CJU-V-c1').chave });
  assert.equal(pc.ok, true, pc.mensagem);
  assert.deepEqual([pc.previo.documento, pc.previo.valor, pc.previo.vencimento, pc.previo.referencia, pc.previo.departamento], ['NF 0001', 1200, '14/11/2026', 'CJU-V-c1', '']);
  assert.match(pc.previo.observacao, /Carga no cartão Caju: viagem VG-2026-0007 \(Rio Verde\/GO\), cartão de TIAGO TECNICO TESTE, centro de custo GO-TEC9 \(Técnica Goiás\)\. Pedido Caju ord-0001\./);
  assert.ok(pc.contexto.avisos.some((x) => /já foi paga ao Caju em 14\/11\/2026: depois de lançar, inclua o título na Aprovação de pagamentos/.test(x)));
  assert.equal(pc.contexto.buscaTexto, 'Caju', 'a busca do fornecedor vem com "Caju"');
  const pt = a.F('OmieEsp_apiPreparar', 'wanessa', { chave: taxa.chave });
  assert.deepEqual([pt.previo.documento, pt.previo.valor, pt.previo.referencia], ['TX NF 0001', 1.5, 'CJU-V-c1-TX']);
  assert.match(pt.previo.observacao, /Taxa de serviço do Caju do pedido ord-0001/);
  const pm = a.F('OmieEsp_apiPreparar', 'wanessa', { chave: a.item(r, 'CJU-V-c2').chave });
  assert.deepEqual([pm.previo.documento, pm.previo.valor], ['CAJU VG-2026-0007', 300]);
  assert.match(pm.previo.observacao, /Carga feita no portal do Caju e registrada no SGO\+/);
  const pr = a.F('OmieEsp_apiPreparar', 'wanessa', { chave: a.item(r, 'CJU-R-rk1').chave });
  assert.deepEqual([pr.previo.documento, pr.previo.valor, pr.previo.departamento], ['RECARGA RC-2026-0003', 400, '']);
  assert.match(pr.previo.observacao, /Recarga Caju RC-2026-0003 \(período 01\/11\/2026 a 30\/11\/2026\), cartão de PAULO TECNICO TESTE/);
  assert.equal(a.inclusoes().length, 0, 'preparar não grava no Omie');
});

test('categorias por finalidade (viagem, recarga, taxa) e fornecedor Caju lembrado; o crédito e a taxa viram duas contas a pagar', () => {
  const a = montarOndaB();
  const s = a.F('OmieRegras_apiSalvarDepara', 'wanessa', { motivo: 'de-para do Caju combinado com o contador', regras: [{ tipo: 'CAJU_VIAGEM', categoria: '2.03' }, { tipo: 'CAJU_TAXA', categoria: '2.10' }] });
  assert.equal(s.ok, true, s.mensagem);
  let l = a.lancar('CJU-V-c1', { pessoaId: 77 });
  assert.equal(l.confirmar.ok, true, JSON.stringify(l));
  assert.equal(l.preparar.previo.categoria, '2.03');
  l = a.lancar('CJU-V-c1-TX');
  assert.equal(l.preparar.previo.pessoaId, '77', 'o Caju já usado vem preenchido');
  assert.equal(l.preparar.previo.categoria, '2.10');
  assert.equal(l.confirmar.ok, true, JSON.stringify(l));
  const inc = a.inclusoes().map((x) => [x.param.codigo_lancamento_integracao, x.param.valor_documento, x.param.codigo_categoria, x.param.codigo_cliente_fornecedor]);
  assert.deepEqual(inc, [['CJU-V-c1', 1200, '2.03', 77], ['CJU-V-c1-TX', 1.5, '2.10', 77]]);
  // a recarga sem regra: categoria vazia, a Wanessa escolhe
  const pr = a.F('OmieEsp_apiPreparar', 'wanessa', { chave: a.item(a.tela(), 'CJU-R-rk1').chave });
  assert.equal(pr.previo.categoria, ''); assert.equal(pr.previo.pessoaId, '77');
  assert.ok(pr.contexto.avisos.some((x) => /Sem categoria nas Regras do Financeiro para "Carga da Recarga Caju/.test(x)));
});

test('centro de custo como departamento do Omie: desligado por padrão; ligado, vai o código do Omie do centro (100%) e a prévia mostra', () => {
  const a = montarOndaB();
  assert.equal(a.tela().departamento, false);
  a.props.FIN_ESPELHO_DEPARTAMENTO = 'CENTRO_CUSTO';
  const r = a.tela();
  assert.equal(r.departamento, true);
  const l = a.lancar('CJU-V-c1', { pessoaId: 77 });
  assert.equal(l.preparar.previo.departamento, 'DEP-07');
  assert.match(l.previa.resumo.map((x) => x.join(': ')).join('\n'), /Departamento \(centro de custo\): GO-TEC9 \(Técnica Goiás\) · código DEP-07 no Omie, 100% do valor\. A confirmar na 1ª operação acompanhada/);
  assert.equal(l.confirmar.ok, true, JSON.stringify(l));
  assert.deepEqual(a.inclusoes()[0].param.distribuicao, [{ cCodDep: 'DEP-07', nPerDep: 100 }]);
  // recarga não tem centro de custo: sem departamento; viagem com centro sem código do Omie: avisa e vai sem
  assert.equal(a.F('OmieEsp_apiPreparar', 'wanessa', { chave: a.item(r, 'CJU-R-rk1').chave }).previo.departamento, '');
  a.tabelas.CAD_CENTROS_CUSTO.find((c) => c.ID === 'cc9').CODIGO_OMIE = '';
  const pm = a.F('OmieEsp_apiPreparar', 'wanessa', { chave: a.item(a.tela(), 'CJU-V-c2').chave });
  assert.equal(pm.previo.departamento, '');
  assert.ok(pm.contexto.avisos.some((x) => /não tem o código do Omie em Depósito de viagem > Centros de custo/.test(x)));
  // código inválido é recusado na prévia
  const pv = a.F('OmieOps_apiPrevia', 'wanessa', { acao: 'criar', tipo: 'pagar', dados: Object.assign({}, pm.previo, { vencimento: '2026-11-15', pessoaId: 77, categoria: '2.10', contaId: 5, departamento: 'DEP 07 <x>' }) });
  assert.equal(pv.ok, false); assert.match(pv.mensagem, /código do departamento.*caracteres inválidos/);
});

test('chaves das Regras do Financeiro: departamento e mês de início validados; vazio = padrão', () => {
  const a = montarOndaB();
  const item = (k) => vm.runInContext('Chaves_item_(' + JSON.stringify(k) + ')', a.ctx);
  const val = (k, v) => { try { return a.ctx.Chaves_validarValor_(item(k), v); } catch (e) { return 'ERRO: ' + e.message; } };
  assert.match(String(val('FIN_ESPELHO_DEPARTAMENTO', 'sim')), /ERRO: .*Para não enviar \(padrão\), use Apagar/);
  assert.equal(val('FIN_ESPELHO_DEPARTAMENTO', 'centro custo'), 'CENTRO_CUSTO');
  assert.equal(val('FIN_ESPELHO_INICIO', '11/2026'), '2026-11');
  assert.equal(val('FIN_ESPELHO_INICIO', '2026-10'), '2026-10');
  assert.match(String(val('FIN_ESPELHO_INICIO', '2026-13')), /ERRO: .*aaaa-mm/);
  // mês de início anterior traz a compra antiga para a lista
  a.props.FIN_ESPELHO_INICIO = '2026-10';
  assert.ok(a.item(a.tela(), 'CMP-REQ-2026-0090-1'), 'compra de outubro aparece');
});

test('pendências: item vencido sem lançar só para o Financeiro da lista de sigilo, sem valor nem descrição; nada antes da primeira abertura', () => {
  const a = montarOndaB();
  assert.ok(!a.pend('wanessa').some((p) => p.tipo === 'fin_esp_lancar'), 'antes da primeira abertura nada é cobrado');
  a.tela();
  const p = a.pend('wanessa').find((x) => x.tipo === 'fin_esp_lancar');
  assert.ok(p, 'Wanessa recebe a pendência');
  assert.match(p.titulo, /^5 itens de Compras ou do Caju chegaram ao vencimento sem estar no Omie$/);
  assert.ok(!/R\$|Caju VG|REQ-|PECAS|TIAGO/.test(p.titulo + ' ' + p.detalhe), 'sem valor nem descrição');
  for (const login of ['tiago', 'matheusgodoi', 'rita']) assert.ok(!a.pend(login).some((x) => /^fin_esp/.test(x.tipo)), login + ' não vê');
  // lançado ou dispensado, sai da contagem
  const r = a.tela();
  a.F('OmieEsp_apiItem', 'wanessa', { chave: a.item(r, 'FAT-4321-202611').chave, acao: 'LANCADO_DIRETO', motivo: 'fatura lançada no Omie pelo Financeiro em 12/11' });
  assert.match(a.pend('wanessa').find((x) => x.tipo === 'fin_esp_lancar').titulo, /^4 itens/);
  // faixa de Lançamentos e baixas: só contagens
  const f = a.F('OmieEsp_apiResumo', 'wanessa');
  assert.deepEqual([f.paraLancar, f.vencidos, f.divergencias], [6, 4, 0]);
});
