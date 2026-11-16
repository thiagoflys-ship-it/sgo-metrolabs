// Assistência técnica (13/11/2026): o dono reclamou que o orçamento da Assistência "ficou bem menor, sem os termos jurídicos"
// comparado à Proposta comercial validada. O A4 do orçamento passa a trazer os mesmos textos da Proposta comercial
// (condições comerciais, condições gerais, responsabilidades, texto de aceite e Termos e condições da contratação), congelados
// na emissão. Orçamento já emitido sem os textos continua igual (marca e link de aceite não mudam).
// Código real num contexto isolado (tests/_assistencia_ambiente.cjs) com o módulo Comercial carregado; só dados de teste.
const test = require('node:test');
const assert = require('node:assert/strict');
const { ambiente, ok, abrirChamado } = require('./_assistencia_ambiente.cjs');

const COMERCIAL = ['SGO_Comercial_Config.js', 'SGO_Comercial_Propostas.js', 'SGO_Comercial_Documento.js'];

function amb0(extras) {
  const amb = ambiente(extras ? { extras } : {});
  amb.ctx.ScriptApp.getService = () => ({ getUrl: () => 'https://sgo.teste/' });
  return amb;
}
function rascunho(amb) {
  const c = abrirChamado(amb);
  ok(amb.api('s_gil', 'triagem', { id: c.id, checklist: { sintomas_confirmados: 'Confirmado', risco_operar: 'Médio', diagnostico_preliminar: 'Avaliar conserto' }, acao: 'AGUARDANDO_ORCAMENTO', orcamentoDescricao: 'Avaliação para conserto' }));
  return amb.tabelas.ATEC_ORCAMENTOS.filter((o) => o.CHAMADO_ID === c.id).pop();
}
const linha = (amb, id) => amb.tabelas.ATEC_ORCAMENTOS.find((o) => o.ID === id);

test('orçamento de serviço sai com condições comerciais, responsabilidades e os Termos e condições da contratação', () => {
  const amb = amb0(COMERCIAL);
  const orc = rascunho(amb);
  ok(amb.api('s_gaspar', 'salvarOrcamento', { id: orc.ID, itens: [{ tipo: 'SERVICO', descricao: 'Conserto do motor', quantidade: 1, valorUnitario: 1155 }], condicoes: 'Retirada do equipamento pela Metrolabs.' }));
  const e = ok(amb.api('s_gaspar', 'emitirOrcamento', { id: orc.ID }));
  const tm = amb.ctx.Com_termosVigentes_();
  assert.ok(tm.texto.length > 500, 'há termos em vigor');
  for (const t of ['Condições comerciais', 'Forma de pagamento', 'Garantia', 'Prazo de execução', 'Condições gerais', 'Responsabilidades', 'Termos e condições da contratação', 'Validade e aceite',
    'DO OBJETO', 'Observações', 'Retirada do equipamento pela Metrolabs', 'Aprovação do cliente']) assert.ok(e.html.includes(t), 'falta no A4: ' + t);
  assert.ok(e.html.includes('versão ' + tm.versao), 'versão dos termos no A4');
  const cg = JSON.parse(linha(amb, orc.ID).CONGELADO_JSON);
  assert.equal(cg.tipo, 'SERVICOS'); assert.equal(cg.termos.texto, tm.texto); assert.ok(cg.condicoes.garantia);
  // o link de aceite inclui os textos congelados no que o cliente aprova
  const o = linha(amb, orc.ID);
  assert.ok(amb.ctx.AstL_conteudo_(o).dados.textos, 'textos no resumo do conteúdo');
});

test('só peças = modelo de Produto; peças e serviço = Misto', () => {
  const amb = amb0(COMERCIAL);
  const a = rascunho(amb);
  ok(amb.api('s_gaspar', 'salvarOrcamento', { id: a.ID, itens: [{ tipo: 'PECA', descricao: 'Escova do motor', quantidade: 2, valorUnitario: 90 }] }));
  const ea = ok(amb.api('s_gaspar', 'emitirOrcamento', { id: a.ID }));
  assert.equal(JSON.parse(linha(amb, a.ID).CONGELADO_JSON).tipo, 'PRODUTOS'); assert.match(ea.html, /Prazo de entrega/);
  const amb2 = amb0(COMERCIAL);   // outro ambiente: o mesmo equipamento não abre dois chamados
  const b = rascunho(amb2);
  ok(amb2.api('s_gaspar', 'salvarOrcamento', { id: b.ID, itens: [{ tipo: 'PECA', descricao: 'Escova', quantidade: 1, valorUnitario: 90 }, { tipo: 'SERVICO', descricao: 'Troca', quantidade: 1, valorUnitario: 300 }] }));
  const eb = ok(amb2.api('s_gaspar', 'emitirOrcamento', { id: b.ID }));
  assert.equal(JSON.parse(linha(amb2, b.ID).CONGELADO_JSON).tipo, 'MISTO'); assert.match(eb.html, /Prazo de execução e de entrega/);
});

test('sem o módulo Comercial, ou orçamento antigo sem textos congelados: A4 e resumo do link como antes', () => {
  const amb = amb0();
  const orc = rascunho(amb);
  ok(amb.api('s_gaspar', 'salvarOrcamento', { id: orc.ID, itens: [{ tipo: 'SERVICO', descricao: 'Conserto', quantidade: 1, valorUnitario: 100 }] }));
  const e = ok(amb.api('s_gaspar', 'emitirOrcamento', { id: orc.ID }));
  assert.doesNotMatch(e.html, /Termos e condições da contratação/);
  assert.match(e.html, /Condições/);
  const o = linha(amb, orc.ID);
  assert.ok(!o.CONGELADO_JSON);
  assert.equal(amb.ctx.AstL_conteudo_(o).dados.textos, undefined, 'resumo do link de orçamento antigo não muda');
});

test('revisão nova congela de novo na emissão (não herda os textos da anterior)', () => {
  const amb = amb0(COMERCIAL);
  const orc = rascunho(amb);
  ok(amb.api('s_gaspar', 'salvarOrcamento', { id: orc.ID, itens: [{ tipo: 'SERVICO', descricao: 'Conserto', quantidade: 1, valorUnitario: 100 }] }));
  ok(amb.api('s_gaspar', 'emitirOrcamento', { id: orc.ID }));
  const r = ok(amb.api('s_gaspar', 'revisarOrcamento', { id: orc.ID }));
  const nova = amb.tabelas.ATEC_ORCAMENTOS.filter((o) => o.NUMERO === linha(amb, orc.ID).NUMERO).pop();
  assert.ok(!nova.CONGELADO_JSON, 'rascunho da revisão sem textos');
  const e = ok(amb.api('s_gaspar', 'emitirOrcamento', { id: nova.ID }));
  assert.match(e.html, /Termos e condições da contratação/);
  assert.ok(r);
});

test('13/11 (dono): "proposta" vira "orçamento" nas condições, responsabilidades e aceite; os Termos ficam idênticos', () => {
  const amb = amb0(COMERCIAL);
  const orc = rascunho(amb);
  ok(amb.api('s_gaspar', 'salvarOrcamento', { id: orc.ID, itens: [{ tipo: 'SERVICO', descricao: 'Conserto', quantidade: 1, valorUnitario: 100 }] }));
  ok(amb.api('s_gaspar', 'emitirOrcamento', { id: orc.ID }));
  const cg = JSON.parse(linha(amb, orc.ID).CONGELADO_JSON), tm = amb.ctx.Com_termosVigentes_();
  const fora = [cg.responsabilidades, cg.textoAceite].concat(Object.values(cg.condicoes)).join('\n');
  assert.doesNotMatch(fora, /proposta/i, 'sem "proposta" fora dos termos');
  assert.match(fora, /deste orçamento/); assert.match(fora, /neste orçamento/); assert.match(fora, /do orçamento/);
  assert.equal(cg.termos.texto, tm.texto, 'cláusulas sem nenhuma alteração');
  assert.equal(cg.termos.concordancia, tm.concordancia, 'frase de concordância sem alteração');
});
