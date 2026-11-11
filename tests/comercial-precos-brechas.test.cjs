// Comercial, brechas de preço (10/11/2026). Caso real que motivou: PROP-2026-0028 (cliente IMED, produto "Fragmentadora de papel")
// cadastrado no catálogo pela vendedora com preço de R$ 15.525,00 e SEM custo; a proposta ficou PRONTA "dentro da política" (sem
// custo o piso não é calculado). Com o custo de R$ 9.200,00 cadastrado depois, o piso é R$ 21.467,00 (sobra mínima de 35% depois de
// impostos e comissão). Um teste por brecha, com dados fictícios. Código real (tests/_comercial_ambiente.cjs).
// FASE=producao mostra as brechas abertas (os testes falham); FASE=candidato, fechadas.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ambiente, oportunidadeDeTeste, SEM_VIAGEM } = require('./_comercial_ambiente.cjs');

const PASTA = path.join(__dirname, '../apps-script-imports/portal_sgo_versao_cnpj_db');
const ok = (r) => { assert.equal(r.ok, true, r.message); return r; };
const falha = (r, re) => { assert.equal(r.ok, false, 'devia falhar: ' + (r.message || '')); if (re) assert.match(r.message, re); return r; };
const prop = (a, id) => a.tabelas.COM_PROPOSTAS.find((x) => x.ID === id);
const prod = (a, id) => a.tabelas.COM_PRODUTOS.find((x) => x.ID === id);
const hist = (a, id) => a.tabelas.COM_HISTORICO.filter((h) => h.ENTIDADE_ID === id);
const ARQ = { nome: 'ordem-de-compra.pdf', tipo: 'application/pdf', base64: Buffer.from('%PDF aceite').toString('base64') };
const COND_PRODUTO = { pagamento: 'Boleto em 28 dias', prazoExecucao: 'Entrega em até 30 dias corridos' };

/** Produto "como a vendedora cadastrou na versão antiga": preço e sem custo (gravado direto, sem pedido de preço). */
function produtoSemCusto(a, extra) {
  a.tabelas.COM_PRODUTOS = a.tabelas.COM_PRODUTOS || [];
  const p = Object.assign({ ID: 'prod_frag', CODIGO: 'FRAG-01', NOME: 'Fragmentadora de papel de teste', TIPO: 'PRODUTO', UNIDADE_MEDIDA: 'un.', PRECO: 15525, CUSTO: '', ATIVO: 'SIM',
    ATUALIZADO_POR_NOME: 'VERA VENDEDORA TESTE', CRIADO_EM: '2026-11-05T14:30:00.000Z' }, extra || {});
  a.tabelas.COM_PRODUTOS.push(p);
  return p;
}
/** Rascunho da vendedora com os itens (tela) e sem viagem; devolve { id, o, contato }. */
function rascunho(a, itens, extra) {
  const { oportunidade, contato } = oportunidadeDeTeste(a);
  const np = ok(a.api('s_vera', 'novaProposta', { oportunidadeId: oportunidade.id }));
  const r = ok(a.api('s_vera', 'salvarProposta', Object.assign({ id: np.proposta.id, deslocamento: SEM_VIAGEM, escopo: 'Fornecimento de equipamento para a CME do cliente de teste.', contatoId: contato.id, itens, condicoes: COND_PRODUTO }, extra || {})));
  return { id: np.proposta.id, o: oportunidade, contato, salvo: r };
}
const itemFrag = (preco) => [{ produtoId: 'prod_frag', descricao: 'Fragmentadora de papel de teste', quantidade: 1, precoUnitario: preco || '15.525,00' }];
/** Proposta pronta "da versão antiga": concluída sem conferir o custo (como a PROP-2026-0028 rev.00). */
function prontaAntiga(a, comPdf) {
  produtoSemCusto(a);
  const x = rascunho(a, itemFrag());
  const r = prop(a, x.id);
  Object.assign(r, { SITUACAO: 'PRONTA', DESCONTO_SITUACAO: 'DENTRO' });
  if (comPdf) Object.assign(r, { PDF_ID: 'pdf_antigo', HTML_ID: 'html_antigo', MARCA_CONTEUDO: 'marca_antiga', GERADA_EM: '2026-10-19T09:00' });
  return x;
}

// ------------------------------------------------------------------ B1: caso real, produto sem custo no catálogo
test('B1 caso PROP-2026-0028: item do catálogo sem custo não deixa a proposta pronta; vai para a Diretoria com o motivo "item sem custo"', () => {
  const a = ambiente();
  produtoSemCusto(a);
  const x = rascunho(a, itemFrag());
  // a tela avisa ANTES de concluir (resposta do salvar e passo 4)
  assert.equal(x.salvo.politica.dentro, false);
  assert.equal(x.salvo.politica.exigeDiretoria, true);
  assert.match(x.salvo.politica.motivos.join(' '), /item sem custo: item 1 \(FRAG-01, Fragmentadora de papel de teste\)/);
  const det = ok(a.api('s_vera', 'proposta', { id: x.id })).proposta;
  assert.equal(det.politica.dentro, false); assert.equal(det.politica.pendencias[0].codigo, 'SEM_CUSTO');
  // sem justificativa: não conclui e diz o que fazer
  const r0 = falha(a.api('s_vera', 'concluirProposta', { id: x.id }), /item sem custo.*aprovação da Diretoria.*peça à gestão comercial ou ao Financeiro para cadastrar o custo/);
  assert.equal(prop(a, x.id).SITUACAO, 'RASCUNHO', r0.message);
  ok(a.api('s_vera', 'concluirProposta', { id: x.id, justificativa: 'Cliente pediu preço fechado para a licitação interna' }));
  const p = prop(a, x.id);
  assert.equal(p.SITUACAO, 'AGUARDANDO_APROVACAO'); assert.equal(p.DESCONTO_SITUACAO, 'PEDIDO');
  assert.ok(a.tabelas.COM_AVISOS.some((v) => v.DESTINATARIO_ID === 'u_dir' && v.TIPO === 'MARGEM_DIRETORIA' && /Preço sem conferência pelo custo/.test(v.TITULO)), 'Diretoria avisada');
  // o gestor comercial não aprova (é da Diretoria); a Diretoria aprova e o que foi aprovado fica registrado
  falha(a.api('s_gaspar', 'decidirDesconto', { id: x.id, aprovar: true, texto: 'Aprovo pelo volume do cliente' }), /item sem custo.*essa exceção é da Diretoria/);
  ok(a.api('s_dora', 'decidirDesconto', { id: x.id, aprovar: true, texto: 'Aprovado: custo confirmado por telefone com o fornecedor' }));
  const q = prop(a, x.id), ap = JSON.parse(q.PRECIFICACAO_JSON).aprovacao;
  assert.equal(q.SITUACAO, 'PRONTA'); assert.equal(q.DESCONTO_SITUACAO, 'APROVADO'); assert.equal(q.DESCONTO_DECISAO_POR_NOME, 'DORA DIRETORA TESTE');
  assert.equal(ap.porNome, 'DORA DIRETORA TESTE'); assert.equal(ap.diretoria, true); assert.deepEqual(ap.codigos, ['SEM_CUSTO']);
  assert.match(ap.texto, /custo confirmado por telefone/); assert.ok(ap.marca);
});

// ------------------------------------------------------------------ B2: item avulso (fora do catálogo) sem custo
test('B2 item avulso (sem catálogo, sem custo) também vai para a Diretoria; o custo digitado na tela pela vendedora é ignorado', () => {
  const a = ambiente();
  const x = rascunho(a, [{ descricao: 'Fragmentadora de papel avulsa', tipo: 'PRODUTO', quantidade: 1, precoUnitario: '15.525,00', custoUnitario: '1,00' }]);
  assert.equal(JSON.parse(prop(a, x.id).ITENS_JSON)[0].custoUnitario, null, 'custo do item vem só do catálogo');
  assert.match(x.salvo.politica.motivos.join(' '), /item sem custo: item 1 \(Fragmentadora de papel avulsa, avulso\)/);
  ok(a.api('s_vera', 'concluirProposta', { id: x.id, justificativa: 'Item fora do catálogo pedido pelo cliente' }));
  assert.equal(prop(a, x.id).SITUACAO, 'AGUARDANDO_APROVACAO');
});

// ------------------------------------------------------------------ B3: cadastro pela equipe comercial
test('B3 produto novo da vendedora: custo obrigatório, preço fica aguardando aprovação e a proposta com ele vai para a Diretoria (o piso do caso real é R$ 21.467)', () => {
  const a = ambiente();
  falha(a.api('s_vera', 'salvarProduto', { codigo: 'FRAG-01', nome: 'Fragmentadora de papel de teste', tipo: 'PRODUTO', preco: '15.525,00' }), /informe o custo de compra do produto.*Por quê.*Como resolver/);
  falha(a.api('s_vera', 'salvarProduto', { codigo: 'FRAG-01', nome: 'Fragmentadora de papel de teste', tipo: 'PRODUTO', preco: '8.000,00', custo: '9.200,00' }), /abaixo do custo/);
  assert.equal((a.tabelas.COM_PRODUTOS || []).length, 0, 'nada gravado');
  const r = ok(a.api('s_vera', 'salvarProduto', { codigo: 'FRAG-01', nome: 'Fragmentadora de papel de teste', tipo: 'PRODUTO', preco: '15.525,00', custo: '9.200,00' }));
  assert.equal(r.pendente, true); assert.match(r.message, /aguardando a aprovação/);
  const pr = prod(a, r.produto.id);
  assert.equal(pr.CUSTO, 9200); assert.equal(pr.PRECO, 15525); assert.equal(pr.PRECO_PEDIDO_SITUACAO, 'PENDENTE'); assert.equal(pr.PRECO_PEDIDO, 15525); assert.match(pr.PRECO_PEDIDO_MOTIVO, /Cadastro novo/);
  assert.ok(a.tabelas.COM_AVISOS.some((v) => v.DESTINATARIO_ID === 'u_gc' && v.TIPO === 'PRECO_PEDIDO' && /cadastrou/.test(v.TEXTO)), 'gestão avisada');
  // o piso pela política (custo ÷ (1 − impostos − comissão − 35%), com o crédito de produto): R$ 21.467
  assert.equal(a.ctx.ComPr_pisoItem_({ tipo: 'PRODUTO', custoUnitario: 9200 }, a.ctx.ComPr_politica_()), 21467);
  const x = rascunho(a, [{ produtoId: r.produto.id, descricao: 'Fragmentadora de papel de teste', quantidade: 1, precoUnitario: '15.525,00' }]);
  const mot = x.salvo.politica.motivos.join(' ');
  assert.match(mot, /preço do catálogo ainda não aprovado/); assert.match(mot, /abaixo da mínima/);
  ok(a.api('s_vera', 'concluirProposta', { id: x.id, justificativa: 'Cliente com orçamento de concorrente' }));
  assert.equal(prop(a, x.id).SITUACAO, 'AGUARDANDO_APROVACAO');
  // a vendedora muda o preço do cadastro pendente: o pedido acompanha (continua pendente)
  ok(a.api('s_vera', 'salvarProduto', { id: r.produto.id, codigo: 'FRAG-01', nome: 'Fragmentadora de papel de teste', tipo: 'PRODUTO', preco: '22.000,00' }));
  assert.equal(prod(a, r.produto.id).PRECO_PEDIDO_SITUACAO, 'PENDENTE'); assert.equal(prod(a, r.produto.id).PRECO_PEDIDO, 22000);
  // quem cadastrou não decide; a gestão aprova com fundamentação
  falha(a.api('s_vera', 'decidirPreco', { id: r.produto.id, aprovar: true, texto: 'Aprovando o meu próprio cadastro' }));
  ok(a.api('s_gaspar', 'decidirPreco', { id: r.produto.id, aprovar: true, texto: 'Cotação do fornecedor conferida' }));
  assert.equal(prod(a, r.produto.id).PRECO_PEDIDO_SITUACAO, 'APROVADO'); assert.equal(prod(a, r.produto.id).PRECO, 22000);
  // com o preço aprovado e acima do piso, a proposta nova fica pronta sem aprovação
  const y = rascunho(a, [{ produtoId: r.produto.id, descricao: 'Fragmentadora de papel de teste', quantidade: 1, precoUnitario: '22.000,00' }]);
  assert.equal(y.salvo.politica.dentro, true, y.salvo.politica.motivos.join('; '));
  ok(a.api('s_vera', 'concluirProposta', { id: y.id }));
  assert.equal(prop(a, y.id).SITUACAO, 'PRONTA');
});

test('B4 serviço novo da vendedora: custo continua com a gestão; preço pendente; cadastro negado arquiva o item', () => {
  const a = ambiente();
  falha(a.api('s_vera', 'salvarProduto', { codigo: 'SRV-NOVO', nome: 'Serviço novo de teste', tipo: 'SERVICO', preco: '900,00', custo: '100,00' }), /custo do item é cadastrado pela gestão/);
  const r = ok(a.api('s_vera', 'salvarProduto', { codigo: 'SRV-NOVO', nome: 'Serviço novo de teste', tipo: 'SERVICO', preco: '900,00' }));
  assert.equal(prod(a, r.produto.id).PRECO_PEDIDO_SITUACAO, 'PENDENTE');
  ok(a.api('s_gaspar', 'decidirPreco', { id: r.produto.id, aprovar: false, texto: 'Serviço sem ficha de custo; refazer com a área técnica' }));
  assert.equal(prod(a, r.produto.id).ATIVO, 'NAO'); assert.equal(prod(a, r.produto.id).PRECO_PEDIDO_SITUACAO, 'NEGADO');
  assert.ok(hist(a, r.produto.id).some((h) => h.TIPO === 'PRECO_NEGADO' && /Cadastro não aprovado/.test(h.TEXTO)));
});

// ------------------------------------------------------------------ B5: proposta pronta antes do custo (reavaliação na próxima ação)
test('B5 proposta pronta "dentro da política" sem custo: gerar documento, enviar, marcar enviada, assinar e registrar aceite são barrados com o que fazer; nova conclusão usa o custo novo', () => {
  const a = ambiente();
  const x = prontaAntiga(a, true);
  const re = /dentro da política", mas hoje tem item sem custo.*Por quê.*Voltar para rascunho.*Diretoria.*Nada foi alterado/;
  falha(a.api('s_vera', 'gerarDocumento', { id: x.id }), re);
  falha(a.api('s_vera', 'conferirEnvio', { id: x.id }), re);
  falha(a.api('s_vera', 'marcarEnviada', { id: x.id, como: 'Entregue em mãos na reunião com a coordenação' }), re);
  falha(a.api('s_vera', 'assinarResponsavel', { id: x.id, pdfId: 'pdf_antigo', marca: 'marca_antiga', concordo: true, assinatura: 'data:image/png;base64,iVBORw0KGgo' + 'A'.repeat(200) }), re);
  falha(a.api('s_vera', 'respostaCliente', { id: x.id, resposta: 'APROVADA', aceiteTipo: 'ORDEM_COMPRA', ocNumero: 'OC-123', ocData: '2026-10-19', texto: 'Cliente mandou a OC', arquivo: ARQ }), re);
  assert.equal(prop(a, x.id).SITUACAO, 'PRONTA', 'nada mudou');
  // a tela mostra o aviso na proposta pronta
  assert.match(ok(a.api('s_vera', 'proposta', { id: x.id })).proposta.politica.reavaliar, /Voltar para rascunho/);
  // o custo de R$ 9.200 entra no catálogo depois (como no caso real): a nova conclusão usa o custo de agora
  prod(a, 'prod_frag').CUSTO = 9200;
  ok(a.api('s_vera', 'voltarRascunho', { id: x.id }));
  const r = falha(a.api('s_vera', 'concluirProposta', { id: x.id }), /abaixo da mínima/);
  ok(a.api('s_vera', 'concluirProposta', { id: x.id, justificativa: 'Preço negociado com o cliente em 05/11' }));
  const p = prop(a, x.id);
  assert.equal(p.SITUACAO, 'AGUARDANDO_APROVACAO', r.message);
  assert.equal(JSON.parse(p.ITENS_JSON)[0].custoUnitario, 9200, 'o custo atual do catálogo ficou gravado no item');
  assert.equal(JSON.parse(p.PRECIFICACAO_JSON).abaixoMin, true);
});

test('B6 envio pelo "Enviar documento" de proposta pronta que hoje não passaria: fica enviada (o envio aconteceu), com histórico e aviso à Diretoria', () => {
  const a = ambiente();
  const x = prontaAntiga(a, true);
  a.tabelas.DOC_ENVIOS.push({ ID: 'env1', ARQUIVO_ID: 'pdf_antigo', SITUACAO: 'ENVIADO', CANAL: 'EMAIL', DESTINO: 'ana@alfa.exemplo.test', USUARIO_ID: 'u_ven', USUARIO_NOME: 'VERA', QUANDO: '2026-10-19T10:30:00' });
  ok(a.api('s_vera', 'sincronizarEnvios', {}));
  assert.equal(prop(a, x.id).SITUACAO, 'ENVIADA');
  assert.ok(hist(a, x.id).some((h) => h.TIPO === 'PRECO_SEM_APROVACAO' && /item sem custo/.test(h.TEXTO)));
  assert.ok(a.tabelas.COM_AVISOS.some((v) => v.DESTINATARIO_ID === 'u_dir' && /enviada sem a aprovação de preço/.test(v.TITULO)));
});

// ------------------------------------------------------------------ B7: aprovação antiga não é reaproveitada
test('B7 voltar para rascunho e nova revisão não reaproveitam a aprovação: concluir de novo pede a aprovação outra vez', () => {
  const a = ambiente();
  produtoSemCusto(a);
  const x = rascunho(a, itemFrag());
  ok(a.api('s_vera', 'concluirProposta', { id: x.id, justificativa: 'Cliente pediu preço fechado' }));
  ok(a.api('s_dora', 'decidirDesconto', { id: x.id, aprovar: true, texto: 'Aprovado pela Diretoria nesta condição' }));
  ok(a.api('s_vera', 'voltarRascunho', { id: x.id }));
  assert.equal(prop(a, x.id).DESCONTO_SITUACAO, 'DENTRO');
  falha(a.api('s_vera', 'concluirProposta', { id: x.id }), /item sem custo/);
  ok(a.api('s_vera', 'concluirProposta', { id: x.id, justificativa: 'Mesmo pedido de antes' }));
  assert.equal(prop(a, x.id).SITUACAO, 'AGUARDANDO_APROVACAO');
  ok(a.api('s_dora', 'decidirDesconto', { id: x.id, aprovar: true, texto: 'Aprovado de novo pela Diretoria' }));
  // enviada e depois revisada: a revisão nasce em rascunho, sem aprovação
  a.tabelas.COM_PROPOSTAS.find((r) => r.ID === x.id).SITUACAO = 'ENVIADA';
  const nv = ok(a.api('s_vera', 'novaRevisao', { id: x.id })).proposta;
  assert.equal(prop(a, nv.id).DESCONTO_SITUACAO, 'DENTRO');
  ok(a.api('s_vera', 'salvarProposta', { id: nv.id, itens: itemFrag(), condicoes: COND_PRODUTO }));
  ok(a.api('s_vera', 'concluirProposta', { id: nv.id, justificativa: 'Revisão pedida pelo cliente' }));
  assert.equal(prop(a, nv.id).SITUACAO, 'AGUARDANDO_APROVACAO');
});

// ------------------------------------------------------------------ B8: aprovação que não cobre o que mudou
test('B8 aprovação vale para o que foi aprovado: preço mudado por fora depois dela, ou custo novo que leva a sobra abaixo da mínima, barra o envio', () => {
  const a = ambiente();
  ok(a.api('s_gaspar', 'salvarProduto', { codigo: 'PRD-OK', nome: 'Produto com custo de teste', tipo: 'PRODUTO', preco: '10.000,00', custo: '3.000,00' }));
  const pid = a.tabelas.COM_PRODUTOS.find((p) => p.CODIGO === 'PRD-OK').ID;
  // desconto de 20% (acima dos 15% da vendedora): aprovado pelo gestor comercial
  const x = rascunho(a, [{ produtoId: pid, descricao: 'Produto com custo de teste', quantidade: 1, precoUnitario: '10.000,00' }], { descontoPct: '20' });
  ok(a.api('s_vera', 'concluirProposta', { id: x.id, justificativa: 'Cliente com três concorrentes' }));
  ok(a.api('s_gaspar', 'decidirDesconto', { id: x.id, aprovar: true, texto: 'Desconto aprovado pelo contrato anual' }));
  const ap = JSON.parse(prop(a, x.id).PRECIFICACAO_JSON).aprovacao;
  assert.deepEqual(ap.codigos, ['DESCONTO']); assert.equal(ap.diretoria, false);
  // (a) o custo do catálogo sobe e a sobra fica abaixo da mínima: só a Diretoria aprova; a aprovação do gestor não cobre
  prod(a, pid).CUSTO = 6000;
  falha(a.api('s_vera', 'gerarDocumento', { id: x.id }), /não cobriu a sobra abaixo da mínima/);
  prod(a, pid).CUSTO = 3000;
  ok(a.api('s_vera', 'conferirEnvio', { id: x.id }));
  // (b) o preço muda por fora depois da aprovação (sem voltar para rascunho)
  const r = prop(a, x.id), its = JSON.parse(r.ITENS_JSON);
  its[0].precoUnitario = 9000; r.ITENS_JSON = JSON.stringify(its);
  falha(a.api('s_vera', 'gerarDocumento', { id: x.id }), /mudou \(itens, preços, desconto ou viagem\) depois da aprovação de GASPAR/);
});

// ------------------------------------------------------------------ B9: alçada somada duas vezes
test('B9 redução do catálogo pela vendedora (dentro da alçada) não vira tabela nova: somada ao desconto da proposta, passa da alçada e vai para aprovação', () => {
  const a = ambiente();
  ok(a.api('s_gaspar', 'salvarProduto', { codigo: 'PRD-RED', nome: 'Produto reduzido de teste', tipo: 'PRODUTO', preco: '1.000,00', custo: '100,00' }));
  const pid = a.tabelas.COM_PRODUTOS.find((p) => p.CODIGO === 'PRD-RED').ID;
  // 10% de redução no catálogo (dentro da alçada de 15% da vendedora): grava direto
  ok(a.api('s_vera', 'salvarProduto', { id: pid, codigo: 'PRD-RED', nome: 'Produto reduzido de teste', tipo: 'PRODUTO', preco: '900,00' }));
  assert.equal(prod(a, pid).PRECO, 900);
  // mais 10% na proposta: 810 sobre a tabela de 1.000 = 19% de desconto
  const x = rascunho(a, [{ produtoId: pid, descricao: 'Produto reduzido de teste', quantidade: 1, precoUnitario: '810,00' }]);
  const it = JSON.parse(prop(a, x.id).ITENS_JSON)[0];
  assert.equal(it.precoTabela, 1000, 'tabela = preço de referência antes da redução da vendedora');
  assert.equal(x.salvo.politica.dentro, false); assert.match(x.salvo.politica.motivos.join(' '), /desconto de 19,0% acima do limite de 15%/);
  ok(a.api('s_vera', 'concluirProposta', { id: x.id, justificativa: 'Cliente antigo pediu condição especial' }));
  assert.equal(prop(a, x.id).SITUACAO, 'AGUARDANDO_APROVACAO');
});

// ------------------------------------------------------------------ B10: custo congelado da revisão
test('B10 custo que subiu no catálogo entra na conta da conclusão (o custo antigo gravado no item não esconde a sobra abaixo da mínima)', () => {
  const a = ambiente();
  ok(a.api('s_gaspar', 'salvarProduto', { codigo: 'PRD-SOBE', nome: 'Produto cujo custo sobe', tipo: 'PRODUTO', preco: '1.000,00', custo: '300,00' }));
  const pid = a.tabelas.COM_PRODUTOS.find((p) => p.CODIGO === 'PRD-SOBE').ID;
  const x = rascunho(a, [{ produtoId: pid, descricao: 'Produto cujo custo sobe', quantidade: 1, precoUnitario: '1.000,00' }]);
  assert.equal(JSON.parse(prop(a, x.id).ITENS_JSON)[0].custoUnitario, 300);
  ok(a.api('s_gaspar', 'salvarProduto', { id: pid, codigo: 'PRD-SOBE', nome: 'Produto cujo custo sobe', tipo: 'PRODUTO', preco: '1.000,00', custo: '700,00' }));
  // salvar de novo o rascunho também leva o custo novo
  ok(a.api('s_vera', 'salvarProposta', { id: x.id, itens: [{ produtoId: pid, descricao: 'Produto cujo custo sobe', quantidade: 1, precoUnitario: '1.000,00' }], condicoes: COND_PRODUTO }));
  assert.equal(JSON.parse(prop(a, x.id).ITENS_JSON)[0].custoUnitario, 700);
  falha(a.api('s_vera', 'concluirProposta', { id: x.id }), /abaixo da mínima/);
});

// ------------------------------------------------------------------ B11: itens automáticos não contam como "sem custo"
test('B11 item automático (deslocamento) tem custo próprio: não conta como item sem custo; proposta com custo e sobra fica pronta', () => {
  const a = ambiente();
  ok(a.api('s_gaspar', 'salvarProduto', { codigo: 'SRV-OK', nome: 'Serviço com custo de teste', tipo: 'SERVICO', preco: '5.000,00', custo: '1.000,00' }));
  const pid = a.tabelas.COM_PRODUTOS.find((p) => p.CODIGO === 'SRV-OK').ID;
  const desl = { repasse: 'ITEM', viagem: { ha: 'SIM', tecnicos: 1, engenheiros: 1, destino: 'Rio Verde/GO', kmTrecho: '228', dias: 2, noites: 1, viagens: 1, linhas: { PEDAGIO: { valor: '45,00' } } },
    frete: { nsa: true, motivo: 'Serviço sem entrega de produto' } };
  const { oportunidade, contato } = oportunidadeDeTeste(a);
  const np = ok(a.api('s_vera', 'novaProposta', { oportunidadeId: oportunidade.id }));
  const s = ok(a.api('s_vera', 'salvarProposta', { id: np.proposta.id, deslocamento: desl, escopo: 'Serviço técnico de teste na unidade do cliente.', contatoId: contato.id,
    itens: [{ produtoId: pid, descricao: 'Serviço com custo de teste', quantidade: 1, precoUnitario: '5.000,00' }], condicoes: { pagamento: 'Boleto em 28 dias' } }));
  const itens = JSON.parse(prop(a, np.proposta.id).ITENS_JSON);
  assert.ok(itens.some((i) => i.auto === 'DESLOCAMENTO'), 'item automático criado: ' + JSON.stringify(s.checklist));
  assert.ok(!(s.politica.motivos.join(' ').includes('sem custo')), s.politica.motivos.join('; '));
  ok(a.api('s_vera', 'concluirProposta', { id: np.proposta.id }));
  assert.equal(prop(a, np.proposta.id).SITUACAO, 'PRONTA');
});

// ------------------------------------------------------------------ B12: envio só com proposta pronta
test('B12 envio, link e aceite não acontecem com proposta aguardando aprovação ou em rascunho', () => {
  const a = ambiente();
  produtoSemCusto(a);
  const x = rascunho(a, itemFrag());
  falha(a.api('s_vera', 'conferirEnvio', { id: x.id }), /Só a proposta pronta/);
  ok(a.api('s_vera', 'concluirProposta', { id: x.id, justificativa: 'Cliente pediu preço fechado' }));
  falha(a.api('s_vera', 'conferirEnvio', { id: x.id }), /Só a proposta pronta/);
  falha(a.api('s_vera', 'gerarDocumento', { id: x.id }), /aguarda a aprovação/);
  falha(a.api('s_vera', 'marcarEnviada', { id: x.id, como: 'Entregue em mãos na reunião com a coordenação' }));
  falha(a.api('s_vera', 'linkAssinatura', { id: x.id, email: 'ana@alfa.exemplo.test' }));
  falha(a.api('s_vera', 'respostaCliente', { id: x.id, resposta: 'APROVADA', aceiteTipo: 'EMAIL_APROVACAO', texto: 'Cliente aprovou por e-mail', arquivo: ARQ }));
  assert.equal(prop(a, x.id).SITUACAO, 'AGUARDANDO_APROVACAO');
});

// ------------------------------------------------------------------ tela e ajuda
test('tela e ajuda: conferência antes do envio, custo de compra no cadastro da equipe, aviso antes de concluir e a regra do item sem custo explicada', () => {
  const tela = fs.readFileSync(path.join(PASTA, 'JS_Comercial.html'), 'utf8');
  assert.match(tela, /Com_chamar_\("conferirEnvio"/);
  assert.match(tela, /Custo de compra \(R\$\)/);
  assert.match(tela, /Preço a conferir antes do envio/);
  assert.match(tela, /Vai para a Caixa de decisões ao concluir \(aprovação/);
  const ajuda = fs.readFileSync(path.join(PASTA, 'SGO_Ajuda_Comercial.js'), 'utf8');
  assert.match(ajuda, /item sem custo/i); assert.match(ajuda, /custo de compra/i); assert.match(ajuda, /Voltar para rascunho/);
});
