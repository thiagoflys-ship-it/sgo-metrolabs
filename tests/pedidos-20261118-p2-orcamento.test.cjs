// Pacote 2 de 18/11/2026, item 8 (Matheus, 18/11/2026 02:14): menos tempo para o representante gerar o orçamento. Servidor: duplicar
// proposta anterior (preço da tabela de hoje; desconto, aprovação e validação do escopo não copiados), propostas anteriores do cliente,
// itens mais usados e o padrão do cliente na proposta nova (contato principal; condições da última proposta, pedido pela tela).
// Código real (legado) num contexto isolado; só dados de teste.
// Uso: DEST=<legado> node --require <fontes.cjs> tests/pedidos-20261118-p2-orcamento.test.cjs
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { ambiente, oportunidadeDeTeste, SEM_VIAGEM } = require('./_comercial_ambiente.cjs');

const ok = (r) => { assert.equal(r.ok, true, r.message); return r; };
const falha = (r, re) => { assert.equal(r.ok, false, 'devia falhar'); if (re) assert.match(r.message, re); return r; };
const COND = { pagamento: 'Boleto em 28 dias após a nota', prazoExecucao: 'Conforme a faixa', garantia: '90 dias', frete: 'Por conta da Metrolabs', local: 'CME da Unidade Centro' };

function catalogo(a) {
  ok(a.api('s_gaspar', 'salvarProduto', { codigo: 'CAL-T', nome: 'Calibração de termômetro', tipo: 'SERVICO', preco: '180,00', custo: '60,00' }));
  ok(a.api('s_gaspar', 'salvarProduto', { codigo: 'CAL-M', nome: 'Calibração de manômetro', tipo: 'SERVICO', preco: '220,00', custo: '70,00' }));
  const id = (c) => a.tabelas.COM_PRODUTOS.find((p) => p.CODIGO === c).ID;
  return { t: id('CAL-T'), m: id('CAL-M') };
}
/** Proposta de origem: 10 termômetros com desconto, 4 manômetros e um avulso; enviada. */
function origem(a, cat) {
  const { oportunidade } = oportunidadeDeTeste(a);
  const id = ok(a.api('s_vera', 'novaProposta', { oportunidadeId: oportunidade.id })).proposta.id;
  ok(a.api('s_vera', 'salvarProposta', { id, deslocamento: SEM_VIAGEM, condicoes: COND, escopo: 'Calibração dos instrumentos da CME com certificado rastreável e relatório de cada instrumento ao final.',
    itens: [{ produtoId: cat.t, descricao: 'Calibração de termômetro', quantidade: 10, precoUnitario: '170,00', tipoEquipamento: 'termômetro digital' },
      { produtoId: cat.m, descricao: 'Calibração de manômetro', quantidade: 4, precoUnitario: '220,00', equipamentoId: 'eq1' },
      { descricao: 'Taxa de emissão de segunda via', quantidade: 1, precoUnitario: '50,00' }], descontoGeral: '20,00' }));
  a.tabelas.COM_PROPOSTAS.find((p) => p.ID === id).SITUACAO = 'ENVIADA';
  return id;
}

test('duplicar: rascunho novo em oportunidade nova, preço da tabela de hoje, tipo e equipamento ativo copiados; sem desconto; histórico nos dois', () => {
  const a = ambiente({ custoAvulso: 0.3 });
  const cat = catalogo(a);
  const src = origem(a, cat);
  // o catálogo subiu depois da proposta de origem
  ok(a.api('s_gaspar', 'salvarProduto', Object.assign({}, { id: cat.t, codigo: 'CAL-T', nome: 'Calibração de termômetro', tipo: 'SERVICO', preco: '195,00', custo: '60,00', motivoPreco: 'Reajuste anual de teste' })));
  const r = ok(a.api('s_vera', 'duplicarProposta', { id: src }));
  assert.match(r.message, /criada em rascunho a partir da PROP-2026-0001/); assert.match(r.message, /preços da tabela de hoje/);
  const p = a.tabelas.COM_PROPOSTAS.find((x) => x.ID === r.propostaId);
  assert.equal(p.SITUACAO, 'RASCUNHO'); assert.notEqual(p.OPORTUNIDADE_ID, a.tabelas.COM_PROPOSTAS.find((x) => x.ID === src).OPORTUNIDADE_ID, 'oportunidade nova');
  const it = JSON.parse(p.ITENS_JSON).filter((i) => !i.auto);
  assert.equal(it.length, 3);
  assert.equal(it[0].precoUnitario, 195, 'termômetro pelo preço de hoje (não os 170 negociados)'); assert.equal(it[0].quantidade, 10); assert.equal(it[0].tipoEquipamento, 'termômetro digital');
  assert.equal(it[1].equipamentoId, 'eq1', 'equipamento ativo da unidade copiado');
  assert.equal(it[2].produtoId, '', 'avulso continua avulso'); assert.equal(it[2].precoUnitario, 50);
  assert.equal(Number(p.DESCONTO_GERAL), 0, 'desconto não é copiado');
  assert.equal(JSON.parse(p.CONDICOES_JSON).pagamento, COND.pagamento);
  assert.match(p.ESCOPO, /certificado rastreável/); assert.ok(!p.ESCOPO_VALIDACAO_JSON, 'validação do escopo não é copiada');
  assert.equal(p.CONTATO_ID, a.tabelas.COM_PROPOSTAS.find((x) => x.ID === src).CONTATO_ID);
  assert.ok(a.tabelas.COM_HISTORICO.some((h) => h.ENTIDADE_ID === r.propostaId && h.TIPO === 'DUPLICADA'));
  assert.ok(a.tabelas.COM_HISTORICO.some((h) => h.ENTIDADE_ID === src && h.TIPO === 'COPIADA'));
  assert.equal(a.tabelas.COM_OPORTUNIDADES.find((o) => o.ID === r.oportunidadeId).ORIGEM_REF, 'Cópia da PROP-2026-0001 rev.00');
});

test('duplicar: item que saiu do catálogo vira avulso com aviso; equipamento inativo fica fora; oportunidade escolhida tem de ser do mesmo cliente', () => {
  const a = ambiente({ custoAvulso: 0.3 });
  const cat = catalogo(a);
  const src = origem(a, cat);
  a.tabelas.COM_PRODUTOS.find((p) => p.ID === cat.m).ATIVO = 'NAO';
  a.tabelas.CAD_EQUIPAMENTOS.find((e) => e.ID === 'eq1').STATUS = 'INATIVO';
  const r = ok(a.api('s_vera', 'duplicarProposta', { id: src }));
  assert.match(r.message, /saiu do catálogo e veio como avulso/); assert.match(r.message, /não está mais ativo/);
  const it = JSON.parse(a.tabelas.COM_PROPOSTAS.find((x) => x.ID === r.propostaId).ITENS_JSON).filter((i) => !i.auto);
  assert.equal(it[1].produtoId, ''); assert.equal(it[1].precoUnitario, 220); assert.equal(it[1].equipamentoId, '');
  // oportunidade de outro cliente é recusada
  const ct2 = ok(a.api('s_vera', 'salvarContato', { clienteId: 'c2', nome: 'Beto Compras Teste', email: 'beto@beta.exemplo.test' })).contato;
  const o2 = ok(a.api('s_vera', 'salvarOportunidade', { titulo: 'Outro cliente de teste', clienteId: 'c2', contatoId: ct2.id, funil: 'ENGENHARIA', origem: 'Indicação', valor: '1.000,00', proxima: { acao: 'Ligar', data: '2026-10-20', hora: '10:00', tipo: 'LIGACAO' } })).oportunidade;
  falha(a.api('s_vera', 'duplicarProposta', { id: src, oportunidadeId: o2.id }), /outro cliente/);
  // outro vendedor não duplica a proposta da Vera
  falha(a.api('s_vito', 'duplicarProposta', { id: src }));
  // propostas anteriores do cliente: a da Vera vê as dela, com resumo; valores só para quem vê valores
  const l = ok(a.api('s_vera', 'propostasDoCliente', { clienteId: 'c1' })).propostas;
  assert.ok(l.length >= 2); assert.match(l.find((x) => x.id === src).resumo, /10 × Calibração de termômetro/);
  assert.equal(ok(a.api('s_vito', 'propostasDoCliente', { clienteId: 'c1' })).propostas.length, 0);
});

test('itens mais usados: os do catálogo mais frequentes nas propostas da pessoa (ou da equipe, com poucas); inativos fora', () => {
  const a = ambiente({ custoAvulso: 0.3 });
  const cat = catalogo(a);
  origem(a, cat);
  const f = ok(a.api('s_vera', 'itensFrequentes', {}));
  assert.equal(f.daEquipe, true, 'menos de 5 propostas: a lista é da equipe');
  assert.deepEqual(f.frequentes.map((x) => x.codigo).sort(), ['CAL-M', 'CAL-T']);
  assert.equal(f.frequentes[0].vezes, 1);
  assert.equal(f.frequentes[0].custo, undefined, 'vendedora não vê custo');
  a.tabelas.COM_PRODUTOS.find((p) => p.ID === cat.m).ATIVO = 'NAO';
  assert.deepEqual(ok(a.api('s_vera', 'itensFrequentes', {})).frequentes.map((x) => x.codigo), ['CAL-T']);
  falha(a.api('s_tiago', 'itensFrequentes', {}));
});

test('padrão do cliente na proposta nova: contato principal quando a oportunidade não tem; condições da última proposta só quando a tela pede', () => {
  const a = ambiente({ custoAvulso: 0.3 });
  const cat = catalogo(a);
  origem(a, cat);
  const ct = a.tabelas.CAD_CONTATOS.find((c) => c.NOME === 'Ana Enfermeira Teste');
  ct.PRINCIPAL = 'SIM';
  const o = ok(a.api('s_vera', 'salvarOportunidade', { titulo: 'Calibração anual de teste', clienteId: 'c1', unidadeId: 'un1', contatoId: ct.ID, funil: 'ENGENHARIA', origem: 'Indicação', valor: '2.000,00', proxima: { acao: 'Ligar', data: '2026-10-20', hora: '10:00', tipo: 'LIGACAO' } })).oportunidade;
  // oportunidade antiga (importada do CRM) sem contato
  Object.assign(a.tabelas.COM_OPORTUNIDADES.find((x) => x.ID === o.id), { CONTATO_ID: '', CONTATO_NOME: '' });
  const n = ok(a.api('s_vera', 'novaProposta', { oportunidadeId: o.id, condicoesDoCliente: true }));
  const p = a.tabelas.COM_PROPOSTAS.find((x) => x.ID === n.proposta.id);
  assert.equal(p.CONTATO_ID, ct.ID, 'contato principal');
  const c = JSON.parse(p.CONDICOES_JSON);
  assert.equal(c.pagamento, COND.pagamento); assert.equal(c.frete, COND.frete); assert.equal(c.local, COND.local, 'mesma unidade: o local vem');
  assert.match(n.message, /padrão do cliente/); assert.match(n.message, /PROP-2026-0001/);
  assert.ok(a.tabelas.COM_HISTORICO.some((h) => h.ENTIDADE_ID === p.ID && /Preenchido pelo padrão do cliente/.test(h.TEXTO)));
  // sem o pedido da tela, as condições são as da Metodologia (como antes)
  const o2 = ok(a.api('s_vera', 'salvarOportunidade', { titulo: 'Outra de teste', clienteId: 'c1', unidadeId: 'un1', contatoId: ct.ID, funil: 'ENGENHARIA', origem: 'Indicação', valor: '2.000,00', proxima: { acao: 'Ligar', data: '2026-10-20', hora: '10:00', tipo: 'LIGACAO' } })).oportunidade;
  const n2 = ok(a.api('s_vera', 'novaProposta', { oportunidadeId: o2.id }));
  assert.notEqual(JSON.parse(a.tabelas.COM_PROPOSTAS.find((x) => x.ID === n2.proposta.id).CONDICOES_JSON).pagamento, COND.pagamento);
});
