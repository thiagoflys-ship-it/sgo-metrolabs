// Comercial (28/10/2026, pedido do dono): "faz um modelo para serviço e um modelo para produto; selecionou o tipo de
// orçamento, já automaticamente muda os dizeres ou layout". Tipo de orçamento na proposta (Serviço | Produto | Misto;
// automático pelos itens quando o vendedor não escolhe; proposta antiga deduz pelos itens). Código real num contexto
// isolado (tests/_comercial_ambiente.cjs). Só dados de teste.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { ambiente, oportunidadeDeTeste } = require('./_comercial_ambiente.cjs');

const ok = (r) => { assert.equal(r.ok, true, r.message); return r; };
const textoDe = (html) => html.replace(/<style[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

function cenario(itens, extra) {
  const amb = ambiente();
  const prod = ok(amb.api('s_gaspar', 'salvarProduto', { codigo: 'PRD-0215', nome: 'Termo-higrômetro digital com sonda externa', tipo: 'PRODUTO', unidade: 'un', preco: '420,00' })).produto;
  const serv = ok(amb.api('s_gaspar', 'salvarProduto', { codigo: 'SRV-0010', nome: 'Qualificação térmica de autoclave', tipo: 'SERVICO', unidade: 'un', preco: '4.500,00' })).produto;
  const { oportunidade } = oportunidadeDeTeste(amb);
  const np = ok(amb.api('s_vera', 'novaProposta', { oportunidadeId: oportunidade.id }));
  const it = { P: { produtoId: prod.id, descricao: prod.nome, quantidade: 3, unidade: 'un', precoUnitario: '420,00' }, S: { produtoId: serv.id, descricao: serv.nome, quantidade: 1, precoUnitario: '4.500,00', equipamentoId: 'eq1' } };
  const salvo = ok(amb.api('s_vera', 'salvarProposta', Object.assign({ id: np.proposta.id, escopo: '', itens: itens.map((k) => it[k]) }, extra || {})));
  return { amb, id: np.proposta.id, salvo, itens: itens.map((k) => it[k]) };
}
function gerar(amb, id) {
  ok(amb.api('s_vera', 'concluirProposta', { id }));
  const g = ok(amb.api('s_vera', 'gerarDocumento', { id }));
  return amb.arquivos[g.htmlId].bytes.toString('utf8');
}
const reg = (amb, id) => amb.tabelas.COM_PROPOSTAS.find((x) => x.ID === id);

test('modelo SERVIÇO (itens de serviço): documento como antes (Escopo, prazo de execução, local de execução ou entrega, responsabilidades de execução); código do catálogo embaixo da descrição', () => {
  const { amb, id, salvo } = cenario(['S']);
  assert.equal(salvo.proposta.tipoOrcamento, 'SERVICOS'); assert.equal(salvo.proposta.tipoOrcamentoEscolhido, '');
  const html = gerar(amb, id), t = textoDe(html);
  assert.match(html, /\d+\. Escopo<\/h2>/);
  assert.match(t, /Prazo de execução A combinar após o aceite da proposta\./);
  assert.match(t, /Local de execução ou entrega Nas instalações do cliente\./);
  assert.match(t, /Executar os serviços descritos nesta proposta/);
  assert.match(t, /As datas de execução serão agendadas em comum acordo após o aceite\./);
  assert.match(t, /autoriza a execução nos termos aqui descritos/);
  assert.match(t, /proposta técnica e comercial/);
  assert.match(html, /<b>Qualificação térmica de autoclave<\/b><span class="sub">Código: SRV-0010<\/span>/);
  assert.match(t, /Termos e condições da contratação/);
});

test('modelo PRODUTO (itens de produto): resumo do fornecimento, prazo e local de entrega com o endereço da unidade, responsabilidades de fornecimento, sem "datas de execução"; termos iguais', () => {
  const { amb, id, salvo } = cenario(['P']);
  assert.equal(salvo.proposta.tipoOrcamento, 'PRODUTOS');
  assert.match(salvo.message, /Tipo de orçamento: Produto \(automático pelos itens\)\. Textos padrão trocados para o modelo de produto: apresentação, garantia, frete, local, condições gerais\./);
  const html = gerar(amb, id), t = textoDe(html);
  assert.match(html, /\d+\. Resumo do fornecimento<\/h2>/);
  assert.doesNotMatch(html, /\d+\. Escopo<\/h2>/);
  assert.match(t, /Prazo de entrega A combinar/);
  assert.match(t, /Local de entrega No endereço da unidade do cliente indicada nesta proposta\. Endereço de entrega: Unidade Centro, Rua de Teste, 100 · Goiânia\/GO\./);
  assert.doesNotMatch(t, /Local de execução/);
  assert.doesNotMatch(t, /datas de execução/i);
  assert.match(t, /proposta de fornecimento/);
  assert.match(t, /Fornecer os produtos conforme descritos nesta proposta/);
  assert.match(t, /Entregar os produtos acompanhados da nota fiscal/);
  assert.match(t, /contra defeito de fabricação/);
  assert.match(t, /Receber e conferir os produtos no ato da entrega/);
  assert.match(t, /Comunicar à Metrolabs qualquer divergência ou avaria em até 2 \(dois\) dias úteis/);
  assert.match(t, /Efetuar os pagamentos nas condições acordadas/);
  assert.doesNotMatch(t, /Executar os serviços descritos/);
  assert.match(t, /autoriza o fornecimento nos termos aqui descritos/);
  assert.match(html, /<span class="sub">Código: PRD-0215<\/span>/);
  assert.match(t, /Termos e condições da contratação.*1\. DO OBJETO:/);
});

test('troca do tipo pelo vendedor muda o documento; texto escrito pelo vendedor fica; volta ao automático; valor inválido é recusado com o que fazer', () => {
  const { amb, id, itens } = cenario(['S'], { condicoes: { garantia: 'Garantia de 180 dias combinada com a compradora' } });
  const r = ok(amb.api('s_vera', 'salvarProposta', { id, itens, tipoOrcamento: 'PRODUTOS' }));
  assert.equal(r.proposta.tipoOrcamento, 'PRODUTOS'); assert.equal(r.proposta.tipoOrcamentoEscolhido, 'PRODUTOS');
  const p = reg(amb, id), cond = JSON.parse(p.CONDICOES_JSON);
  assert.equal(p.TIPO_ORCAMENTO, 'PRODUTOS'); assert.equal(p.MODELO, 'PRODUTOS');
  assert.equal(cond.garantia, 'Garantia de 180 dias combinada com a compradora', 'texto do vendedor não é trocado');
  assert.match(cond.local, /^No endereço da unidade/); assert.doesNotMatch(cond.gerais, /datas de execução/);
  assert.match(p.APRESENTACAO, /proposta de fornecimento/);
  assert.ok(amb.tabelas.COM_HISTORICO.some((h) => h.ENTIDADE_ID === id && h.TIPO === 'TIPO_ORCAMENTO' && h.DE === 'Serviço' && h.PARA === 'Produto'));
  // salvar de novo sem mandar o tipo mantém a escolha
  ok(amb.api('s_vera', 'salvarProposta', { id, itens, titulo: 'Fornecimento' }));
  assert.equal(reg(amb, id).TIPO_ORCAMENTO, 'PRODUTOS');
  const t = textoDe(gerar(amb, id));
  assert.match(t, /Resumo do fornecimento/); assert.match(t, /Local de entrega/); assert.match(t, /Garantia de 180 dias combinada com a compradora/);
  ok(amb.api('s_vera', 'voltarRascunho', { id }));
  const v = ok(amb.api('s_vera', 'salvarProposta', { id, itens, tipoOrcamento: '' }));
  assert.equal(v.proposta.tipoOrcamento, 'SERVICOS', 'automático: volta a valer pelos itens');
  assert.match(reg(amb, id).APRESENTACAO, /proposta técnica e comercial/);
  const ruim = amb.api('s_vera', 'salvarProposta', { id, itens, tipoOrcamento: 'LOCACAO' });
  assert.equal(ruim.ok, false); assert.match(ruim.message, /não existe\. Escolha Serviço, Produto, Serviço e produto \(misto\) ou Automático pelos itens/);
});

test('modelo MISTO (serviço e produto): textos enxutos que cobrem os dois', () => {
  const { amb, id, salvo } = cenario(['S', 'P']);
  assert.equal(salvo.proposta.tipoOrcamento, 'MISTO');
  const t = textoDe(gerar(amb, id));
  assert.match(t, /Escopo/);
  assert.match(t, /Prazo de execução e de entrega/); assert.match(t, /Local de execução e de entrega Serviços nas instalações do cliente; produtos entregues/);
  assert.match(t, /Executar os serviços descritos/); assert.match(t, /Fornecer os produtos conforme descritos/);
  assert.match(t, /As datas de execução e de entrega serão combinadas/);
  assert.match(t, /autoriza a execução dos serviços e o fornecimento dos produtos/);
});

test('proposta antiga (sem a coluna do tipo): deduz pelos itens, como antes; a revisão da gestora segue o tipo', () => {
  const { amb, id } = cenario(['P']);
  const p = reg(amb, id); delete p.TIPO_ORCAMENTO; p.MODELO = 'PRODUTOS';
  assert.equal(amb.ctx.ComP_tipoOrcamento_(p).tipo, 'PRODUTOS');
  assert.equal(amb.ctx.ComP_tipoOrcamento_({ ITENS_JSON: '[]', MODELO: '' }).tipo, 'SERVICOS');
  assert.equal(amb.ctx.ComP_tipoOrcamento_({ ITENS_JSON: JSON.stringify([{ tipo: 'SERVICO' }, { tipo: 'PRODUTO' }]) }).tipo, 'MISTO');
  const det = ok(amb.api('s_vera', 'proposta', { id })).proposta;
  assert.equal(det.tipoOrcamento, 'PRODUTOS'); assert.equal(det.tipoOrcamentoEscolhido, '');
  // escolher Serviço numa proposta só de produtos: o prazo vira de execução na revisão
  const c = JSON.parse(p.CONDICOES_JSON); c.prazoExecucao = ''; p.CONDICOES_JSON = JSON.stringify(c);
  assert.ok(amb.ctx.ComG_revisarPropostaRegras_(p).erros.includes('falta o prazo de entrega'));
  p.TIPO_ORCAMENTO = 'SERVICOS';
  assert.ok(amb.ctx.ComG_revisarPropostaRegras_(p).erros.includes('falta o prazo de execução'));
});

test('metodologia: os modelos de produto e misto são editáveis pela gestão como o de serviço e valem nas propostas', () => {
  const amb = ambiente();
  const met = ok(amb.api('s_gaspar', 'metodologia', {}));
  assert.match(met.metodologia.proposta.responsabilidadesProduto, /Receber e conferir/);
  const n = JSON.parse(JSON.stringify(met.metodologia));
  n.proposta.responsabilidadesProduto = 'Da Metrolabs:\n- Fornecer os produtos com nota fiscal.\nDo cliente:\n- Conferir no ato da entrega e avisar avaria em 24 horas.';
  n.proposta.condicoesProduto.frete = 'Incluso até o local de entrega.';
  ok(amb.api('s_gaspar', 'metodologia', { salvar: n, motivo: 'Modelo de produto revisado pela gestão' }));
  const m = amb.ctx.Com_modeloProposta_('PRODUTOS');
  assert.match(m.responsabilidades, /avisar avaria em 24 horas/);
  assert.equal(m.condicoes.frete, 'Incluso até o local de entrega.');
  assert.equal(amb.ctx.Com_modeloProposta_('SERVICOS').condicoes.frete, 'Não se aplica.');
  const ruim = JSON.parse(JSON.stringify(n)); ruim.proposta.condicoesMisto = 'texto';
  const r = amb.api('s_gaspar', 'metodologia', { salvar: ruim, motivo: 'Teste de formato inválido' });
  assert.equal(r.ok, false); assert.match(r.message, /modelo de serviço e produto vieram num formato inválido/);
});

test('ajuda da tela, manual e base do assistente explicam o tipo de orçamento', () => {
  const fs = require('node:fs'), path = require('node:path');
  const pasta = path.join(__dirname, '../apps-script-imports/portal_sgo_versao_cnpj_db');
  assert.match(fs.readFileSync(path.join(pasta, 'SGO_Ajuda_Comercial.js'), 'utf8'), /Tipo de orçamento/);
  assert.match(fs.readFileSync(path.join(__dirname, '../docs/MANUAL_MODULO_COMERCIAL.md'), 'utf8'), /### Tipo de orçamento: modelo de serviço, de produto ou misto/);
  assert.match(fs.readFileSync(path.join(pasta, 'SGO_AssistenteManuais.js'), 'utf8'), /Tipo de orçamento: modelo de serviço, de produto ou misto/);
  const tela = fs.readFileSync(path.join(pasta, 'JS_Comercial.html'), 'utf8');
  assert.match(tela, /id="cmPrTipo"/); assert.match(tela, /cmMPApr" \+ x\[0\]/);
});
