// Compras: equipamento do cadastro na requisição (21/10/2026). Escolher o equipamento do cadastro não preenchia
// EQUIPAMENTO_TEXTO, e o pedido de compra A4 saía sem o equipamento. Agora o servidor grava o rótulo do cadastro
// quando o texto vem vazio, o documento usa o cadastro para itens antigos sem texto e a tela preenche ao escolher.
// Código real num contexto isolado (tests/_compras_ambiente.cjs). Só dados de teste.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ambiente, regrasDeTeste } = require('./_compras_ambiente.cjs');

const ok = (r) => { assert.equal(r.ok, true, r.message); return r; };
const ROTULO = 'Autoclave · M1 · TAG AC-01 · nº de série S1 · CME';

test('rótulo do cadastro: tipo · modelo · TAG · nº de série · setor, só o que está preenchido', () => {
  const amb = ambiente();
  assert.equal(amb.ctx.CmpR_equipRotulo_(amb.tabelas.CAD_EQUIPAMENTOS.filter((e) => e.ID === 'eq1')[0]), ROTULO);
  assert.equal(amb.ctx.CmpR_equipRotulo_({ TIPO: 'Lavadora', TAG: '', SERIE: '', SETOR: 'CME' }), 'Lavadora · CME');
  assert.equal(amb.ctx.CmpR_equipRotulo_(null), '');
});

test('requisição com equipamento do cadastro e sem texto grava o rótulo; texto escrito é mantido', () => {
  const amb = ambiente();
  regrasDeTeste(amb);
  const r = ok(amb.api('s_tiago', 'salvarRequisicao', { urgencia: 'NORMAL', finalidade: 'Troca da resistência da autoclave da CME', vinculo: { tipo: 'CLIENTE', clienteId: 'c1', unidadeId: 'un1' },
    itens: [{ categoria: 'PECA', descricao: 'Resistência da câmara', quantidade: 1, unidade: 'un.', equipamentoId: 'eq1', equipamentoTexto: '' },
      { categoria: 'PECA', descricao: 'Vedação da porta', quantidade: 1, unidade: 'un.', equipamentoId: 'eq1', equipamentoTexto: 'Autoclave da CME, porta de carga' }] })).requisicao;
  const itens = amb.tabelas.CMP_ITENS.filter((i) => i.REQUISICAO_ID === r.id).sort((a, b) => a.ORDEM - b.ORDEM);
  assert.equal(itens[0].EQUIPAMENTO_TEXTO, ROTULO);
  assert.equal(itens[1].EQUIPAMENTO_TEXTO, 'Autoclave da CME, porta de carga', 'texto escrito não é trocado');
});

test('pedido de compra: item antigo com equipamento do cadastro e texto vazio sai com o rótulo do cadastro', () => {
  const amb = ambiente();
  const txt = amb.ctx.CmpR_equipTextoItem_({ EQUIPAMENTO_ID: 'eq1', EQUIPAMENTO_TEXTO: '' }, {});
  assert.equal(txt, ROTULO);
  assert.equal(amb.ctx.CmpR_equipTextoItem_({ EQUIPAMENTO_ID: '', EQUIPAMENTO_TEXTO: '' }, {}), '');
  assert.equal(amb.ctx.CmpR_equipTextoItem_({ EQUIPAMENTO_ID: 'eq1', EQUIPAMENTO_TEXTO: 'Escrito' }, {}), 'Escrito');
  const ped = fs.readFileSync(path.join(__dirname, '../apps-script-imports/portal_sgo_versao_cnpj_db/SGO_Compras_Pedido.js'), 'utf8');
  assert.match(ped, /CmpR_equipTextoItem_\(i, mapaEq\) \? 'Equipamento '/, 'o documento usa o texto do item ou o cadastro');
});

test('tela: escolher o equipamento do cadastro preenche o texto ao lado (só vazio ou o rótulo posto antes)', () => {
  const tela = fs.readFileSync(path.join(__dirname, '../apps-script-imports/portal_sgo_versao_cnpj_db/JS_Compras.html'), 'utf8');
  assert.match(tela, /function preencherEquipTexto\(i\)/);
  assert.match(tela, /if \(atual && atual !== i\._equipAuto\) return;/);
  assert.match(tela, /=== "equipamentoId"\) preencherEquipTexto\(/);
});
