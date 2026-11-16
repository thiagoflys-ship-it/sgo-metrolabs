// Assistência técnica (12/11/2026): "Faturar para" no orçamento do chamado. O equipamento é de um cliente e o serviço é pago
// por outro CNPJ: antes a equipe precisava transferir o equipamento em Vínculos (e o orçamento sempre saía no dono). Agora o
// orçamento, o envio, o link de aceite, o comprovante e o portal usam o pagador; equipamento, chamado e histórico ficam no dono.
// Código real num contexto isolado (tests/_assistencia_ambiente.cjs); só dados de teste.
const test = require('node:test');
const assert = require('node:assert/strict');
const { ambiente, ok, abrirChamado, ASSINATURA } = require('./_assistencia_ambiente.cjs');

const ITENS = [{ tipo: 'SERVICO', descricao: 'Avaliação e conserto', quantidade: 1, valorUnitario: 480 }];
const APROVA = { decisao: 'APROVADO', nome: 'Bia Pagadora Teste', cargo: 'Compras', email: 'compras@beta.exemplo.test', concordo: true, assinatura: ASSINATURA };
const plano = (x) => JSON.parse(JSON.stringify(x));

function amb0() {
  const amb = ambiente();
  amb.ctx.ScriptApp.getService = () => ({ getUrl: () => 'https://sgo.teste/' });
  amb.tabelas.CAD_CLIENTES[1].CNPJ = '44.555.666/0001-81';
  amb.tabelas.CAD_CLIENTES.push({ ID: 'c3', RAZAO_SOCIAL: 'EMPRESA TESTE INATIVA', NOME_FANTASIA: 'Empresa Teste Inativa', CNPJ: '', STATUS: 'INATIVO' });
  amb.tabelas.CAD_CONTATOS = (amb.tabelas.CAD_CONTATOS || []).concat([{ ID: 'k_beta', CLIENTE_ID: 'c2', NOME: 'Bia Pagadora Teste', EMAIL: 'compras@beta.exemplo.test', CARGO: 'Compras', STATUS: 'ATIVO' }]);
  return amb;
}
function rascunho(amb) {
  const c = abrirChamado(amb);
  ok(amb.api('s_gil', 'triagem', { id: c.id, checklist: { sintomas_confirmados: 'Confirmado', risco_operar: 'Médio', diagnostico_preliminar: 'Avaliar conserto' }, acao: 'AGUARDANDO_ORCAMENTO', orcamentoDescricao: 'Avaliação para conserto' }));
  const orc = amb.tabelas.ATEC_ORCAMENTOS.filter((o) => o.CHAMADO_ID === c.id).pop();
  return { c, orc };
}
const linha = (amb, id) => amb.tabelas.ATEC_ORCAMENTOS.find((o) => o.ID === id);

test('sem "Faturar para": continua como sempre (orçamento, A4 e envio no cliente do chamado)', () => {
  const amb = amb0();
  const { orc } = rascunho(amb);
  ok(amb.api('s_gaspar', 'salvarOrcamento', { id: orc.ID, itens: ITENS, condicoes: 'Pagamento em 28 dias.' }));
  assert.ok(!linha(amb, orc.ID).PAGADOR_ID, 'sem pagador gravado');
  const e = ok(amb.api('s_gaspar', 'emitirOrcamento', { id: orc.ID }));
  assert.match(e.html, /Hospital Teste Alfa/);
  assert.doesNotMatch(e.html, /Faturar para|Proprietário do equipamento/);
  assert.equal(e.orcamento.pagadorOutro, false);
  const p = ok(amb.api('s_gaspar', 'previaEnvioOrcamento', { id: orc.ID }));
  assert.match(p.assunto, /Hospital Teste Alfa/);
  assert.doesNotMatch(p.texto, /Faturamento em nome de/);
});

test('com "Faturar para" outro cliente: A4, envio, link, portal e comprovante no pagador; equipamento e chamado ficam no dono', () => {
  const amb = amb0();
  const { c, orc } = rascunho(amb);
  const s = ok(amb.api('s_gaspar', 'salvarOrcamento', { id: orc.ID, itens: ITENS, condicoes: 'Pagamento em 28 dias.', pagadorId: 'c2' }));
  assert.match(s.message, /faturado para Clínica Teste Beta \(CNPJ 44\.555\.666\/0001-81\)/);
  assert.equal(linha(amb, orc.ID).PAGADOR_ID, 'c2');
  assert.equal(linha(amb, orc.ID).CLIENTE_ID, 'c1', 'o orçamento continua ligado ao dono do equipamento');
  const e = ok(amb.api('s_gaspar', 'emitirOrcamento', { id: orc.ID }));
  assert.match(e.html, /Faturar para/); assert.match(e.html, /Clínica Teste Beta/); assert.match(e.html, /44\.555\.666\/0001-81/);
  assert.match(e.html, /Proprietário do equipamento/); assert.match(e.html, /Hospital Teste Alfa/); assert.match(e.html, /11\.222\.333\/0001-81/);
  assert.equal(e.orcamento.pagadorOutro, true); assert.equal(e.orcamento.pagadorNome, 'Clínica Teste Beta');
  // envio: contatos do pagador primeiro e sugeridos; os do dono continuam, sem marcar
  const p = ok(amb.api('s_gaspar', 'previaEnvioOrcamento', { id: orc.ID }));
  assert.equal(p.contatos[0].email, 'compras@beta.exemplo.test'); assert.equal(p.contatos[0].sugerido, true);
  assert.ok(p.contatos.some((k) => k.email === 'rui@alfa.exemplo.test' && !k.sugerido), 'contato do dono na lista, sem marcar');
  assert.match(p.assunto, /Clínica Teste Beta/);
  assert.match(p.texto, /Faturamento em nome de Clínica Teste Beta, CNPJ 44\.555\.666\/0001-81\. O equipamento é de Hospital Teste Alfa\./);
  // portal: quem paga vê e responde; o dono também vê
  const pb = ok(amb.api('s_cliente.beta', 'portal', {}));
  assert.equal(pb.orcamentos.length, 1); assert.match(pb.orcamentos[0].cliente, /Clínica Teste Beta.*equipamento de Hospital Teste Alfa/);
  assert.equal(ok(amb.api('s_cliente.alfa', 'portal', {})).orcamentos.length, 1);
  ok(amb.api('s_cliente.beta', 'responderOrcamento', Object.assign({ id: orc.ID, navegador: 'Teste portal' }, APROVA)));
  const o = linha(amb, orc.ID);
  assert.equal(o.SITUACAO, 'APROVADO');
  // nada mudou de dono
  assert.equal(amb.tabelas.CAD_EQUIPAMENTOS.find((q) => q.ID === 'eq1').CLIENTE_ID, 'c1');
  assert.equal(amb.tabelas.ATEC_CHAMADOS.find((q) => q.ID === c.id).CLIENTE_ID, 'c1');
  // comprovante no pagador
  const comp = amb.ctx.AstL_htmlComprovante_(o, amb.tabelas.ATEC_ORC_ACEITES.slice(-1)[0], '');
  assert.match(comp, /Faturar para/); assert.match(comp, /Clínica Teste Beta/); assert.match(comp, /Proprietário do equipamento/);
});

test('"Faturar para": cliente inexistente ou inativo recusa com o caminho; o próprio dono ou vazio limpa; salvar sem o campo mantém', () => {
  const amb = amb0();
  const { orc } = rascunho(amb);
  assert.match(amb.api('s_gaspar', 'salvarOrcamento', { id: orc.ID, itens: ITENS, pagadorId: 'nao-existe' }).message, /não foi encontrado no cadastro/);
  assert.match(amb.api('s_gaspar', 'salvarOrcamento', { id: orc.ID, itens: ITENS, pagadorId: 'c3' }).message, /está inativo\. Reative em Cadastros > Clientes/);
  ok(amb.api('s_gaspar', 'salvarOrcamento', { id: orc.ID, itens: ITENS, pagadorId: 'c2' }));
  ok(amb.api('s_gaspar', 'salvarOrcamento', { id: orc.ID, itens: ITENS }));
  assert.equal(linha(amb, orc.ID).PAGADOR_ID, 'c2', 'salvar sem o campo não apaga o pagador');
  ok(amb.api('s_gaspar', 'salvarOrcamento', { id: orc.ID, itens: ITENS, pagadorId: 'c1' }));
  assert.equal(linha(amb, orc.ID).PAGADOR_ID, '', 'escolher o próprio dono = sem pagador diferente');
});

test('nova revisão mantém o "Faturar para" e o cliente que não é dono nem pagador não vê o orçamento', () => {
  const amb = amb0();
  const { orc } = rascunho(amb);
  ok(amb.api('s_gaspar', 'salvarOrcamento', { id: orc.ID, itens: ITENS, pagadorId: 'c2' }));
  ok(amb.api('s_gaspar', 'emitirOrcamento', { id: orc.ID }));
  const r = ok(amb.api('s_gaspar', 'revisarOrcamento', { id: orc.ID }));
  assert.equal(linha(amb, r.orcamento.id).PAGADOR_ID, 'c2');
  assert.equal(r.orcamento.pagadorNome, 'Clínica Teste Beta');
  assert.equal(plano(amb.ctx.AstL_doCliente_(linha(amb, r.orcamento.id), { clienteId: 'c9' })), false);
});
