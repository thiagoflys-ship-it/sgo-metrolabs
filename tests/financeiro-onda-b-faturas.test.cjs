// Onda B do Financeiro, 18/11/2026: achado M8 (o estorno na fatura do cartão era descartado; agora é linha própria casada com a compra de
// origem e a compra fica marcada como estornada) e B4 (o que foi lançado no Omie é conferido contra o Omie: valor, situação, título
// cancelado ou excluído, fatura reaberta, compra cancelada ou paga em Compras sem a baixa no Omie).
// Código REAL do SGO+: Compras em tests/_compras_ambiente.cjs e o Financeiro com o OMIE SIMULADO em tests/_financeiro_onda_b.cjs.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { ambiente, regrasDeTeste } = require('./_compras_ambiente.cjs');
const { montarOndaB } = require('./_financeiro_onda_b.cjs');

const B64 = (t) => Buffer.from(t).toString('base64');
const comprovante = (n) => ({ nome: 'comprovante' + (n || '') + '.jpg', tipo: 'image/jpeg', base64: B64('comprovante de teste ' + (n || '')) });
function informar(amb, extra) {
  const r = amb.api('s_tiago', 'informar', Object.assign({ finalidade: 'Vedação da porta da autoclave do cliente, troca no atendimento', vinculo: { tipo: 'CLIENTE', clienteId: 'c1', unidadeId: 'un1' },
    itens: [{ descricao: 'Vedação de silicone da porta', quantidade: 1, unidade: 'un.' }], fornecedorNome: 'Loja de Peças Teste', valor: '300,00', formaPagamento: 'CARTAO_CREDITO',
    cartaoFinal: '4321', parcelas: 1, dataCompra: '2026-10-19', comprovante: comprovante(), nfNumero: '12345', recebido: true }, extra || {}));
  assert.equal(r.ok, true, r.message); return r;
}

test('M8: estorno na fatura entra como linha própria, casa sozinho com a compra de origem e a soma do extrato fecha com a das compras', () => {
  const amb = ambiente();
  regrasDeTeste(amb);
  amb.api('s_fabio', 'salvarCartao', { final: '4321', apelido: 'Cartão da equipe técnica', responsavelId: 'u_tec', diaFechamento: 28, diaVencimento: 5 });
  informar(amb, { valor: '300,00', dataCompra: '2026-10-19' });
  const csv = 'Data;Descrição;Parcela;Valor (R$)\n19/10/2026;LOJA DE PECAS TESTE;;300,00\n17/10/2026;POSTO TESTE;;150,00\n21/10/2026;ESTORNO LOJA DE PECAS TESTE;;-300,00\n' +
    '22/10/2026;ESTORNO POSTO TESTE;;-150,00\n23/10/2026;CREDITO TARIFA ANUIDADE;;-25,00\n10/10/2026;PAGAMENTO DE FATURA;;-1.200,00\n';
  const pv = amb.api('s_fabio', 'importarExtrato', { final: '4321', competencia: '2026-11', texto: csv, nomeArquivo: 'fatura.csv' });
  assert.equal(pv.ok, true, pv.message);
  assert.match(pv.resumo, /5 lançamentos lidos: 1 casam com compras informadas, 1 sem compra informada .*, 3 estornos \(crédito na fatura, 2 com a compra de origem\)/);
  assert.match(pv.resumo, /1 linhas ignoradas \(pagamento, saldo, total ou ilegível\)/);
  assert.ok(pv.linhas.some((x) => x.estorno && /estorno de LOJA DE PECAS TESTE \(19\/10\/2026\)/.test(x.casa)));
  assert.ok(pv.linhas.some((x) => x.estorno && /CREDITO TARIFA/.test(x.descricao) && !x.casa));
  const im = amb.api('s_fabio', 'importarExtrato', { final: '4321', competencia: '2026-11', texto: csv, nomeArquivo: 'fatura.csv', confirmar: true });
  assert.equal(im.ok, true, im.message);
  assert.match(im.message, /2 estornos casados com a compra de origem; 1 estorno ficou sem a compra de origem/);
  const ext = amb.tabelas.CMP_EXTRATO;
  const estLoja = ext.find((x) => /ESTORNO LOJA/.test(x.DESCRICAO)), loja = ext.find((x) => x.DESCRICAO === 'LOJA DE PECAS TESTE');
  assert.deepEqual([estLoja.SITUACAO, estLoja.VALOR, estLoja.ORIGEM_EXTRATO_ID, estLoja.PARCELA_ID], ['ESTORNO', -300, loja.ID, loja.PARCELA_ID]);
  const parc = amb.tabelas.CMP_PARCELAS.find((x) => x.ID === loja.PARCELA_ID);
  assert.deepEqual([parc.SITUACAO, parc.ESTORNO_EXTRATO_ID, parc.ESTORNO_VALOR], ['CONCILIADA', estLoja.ID, 300], 'a compra fica marcada como estornada');
  assert.ok(amb.tabelas.CMP_HISTORICO.some((h) => h.TIPO === 'ESTORNADA' && /estornada na fatura: crédito de R\$ 300,00/.test(h.TEXTO)));
  // a compra não informada (posto) foi estornada: a linha dela é justificada sozinha e a cobrança ao responsável acaba
  const posto = ext.find((x) => x.DESCRICAO === 'POSTO TESTE');
  assert.equal(posto.SITUACAO, 'JUSTIFICADA'); assert.match(posto.MOTIVO, /^Estornada na fatura: crédito de R\$ 150,00 em 22\/10\/2026/);
  let t = amb.api('s_fabio', 'fatura', { final: '4321', competencia: '2026-11' });
  assert.equal(t.resumo.naoInformadas, 0); assert.equal(t.resumo.estornos, 3); assert.equal(t.resumo.estornosSemOrigem, 1);
  // extrato: 300 + 150 - 300 - 150 - 25 = -25; compras informadas: 300 - 300 (estorno casado) - 150 (estorno do posto) = -150; a diferença é a tarifa e o posto (justificados)
  assert.equal(t.resumo.totalExtratoTxt, 'R$ -25,00'); // formato de Compras (Cmp_moeda_), sem mudança
  assert.ok(t.parcelas.some((x) => x.estornada && /Estornada na fatura \(R\$ 300,00\)/.test(x.estornoTxt)));
  // estorno sem origem: conta como aberto, impede fechar; justificar resolve; reabrir volta a "sem origem"
  assert.match(amb.api('s_fabio', 'fecharFatura', { final: '4321', competencia: '2026-11' }).message, /ainda há 1 item aberto/);
  const tarifa = t.linhas.find((x) => x.situacao === 'ESTORNO_SEM_ORIGEM');
  assert.ok(Array.isArray(tarifa.candidatos), 'o estorno sem origem oferece as compras do mesmo cartão');
  assert.equal(amb.api('s_fabio', 'conciliacao', { acao: 'justificar', extratoId: tarifa.id, motivo: 'Devolução da tarifa de anuidade pelo banco' }).ok, true);
  assert.equal(amb.api('s_fabio', 'conciliacao', { acao: 'reabrirLinha', extratoId: tarifa.id, motivo: 'Conferir de novo com o extrato do banco' }).ok, true);
  assert.equal(amb.tabelas.CMP_EXTRATO.find((x) => x.ID === tarifa.id).SITUACAO, 'ESTORNO_SEM_ORIGEM');
  // casar à mão com uma compra; quem comprou não casa a própria; desfazer tira a marca da compra
  informar(amb, { valor: '25,00', dataCompra: '2026-10-18', fornecedorNome: 'Papelaria Teste', comprovante: comprovante(9) });
  t = amb.api('s_fabio', 'fatura', { final: '4321', competencia: '2026-11' });
  const cand = t.linhas.find((x) => x.id === tarifa.id).candidatos;
  assert.equal(cand[0].valorTxt, 'R$ 25,00', 'as de valor mais perto vêm primeiro');
  assert.match(amb.api('s_tiago', 'conciliacao', { acao: 'casar', extratoId: tarifa.id, parcelaId: cand[0].id, motivo: 'Loja confirmou o cancelamento da compra' }).message, /Financeiro|sua/);
  const c = amb.api('s_fabio', 'conciliacao', { acao: 'casar', extratoId: tarifa.id, parcelaId: cand[0].id, motivo: 'Loja confirmou o cancelamento da compra' });
  assert.equal(c.ok, true, c.message); assert.match(c.message, /Estorno casado com a compra REQ-/);
  assert.equal(amb.tabelas.CMP_PARCELAS.find((x) => x.ID === cand[0].id).ESTORNO_EXTRATO_ID, tarifa.id);
  assert.match(amb.api('s_fabio', 'conciliacao', { acao: 'casar', extratoId: tarifa.id, parcelaId: cand[0].id, motivo: 'Loja confirmou o cancelamento da compra' }).message, /não está "Não informada"|já está/);
  const d = amb.api('s_fabio', 'conciliacao', { acao: 'descasar', extratoId: tarifa.id, motivo: 'A compra estornada era outra, conferir' });
  assert.equal(d.ok, true, d.message);
  assert.equal(amb.tabelas.CMP_PARCELAS.find((x) => x.ID === cand[0].id).ESTORNO_EXTRATO_ID, '');
  assert.equal(amb.tabelas.CMP_EXTRATO.find((x) => x.ID === tarifa.id).SITUACAO, 'ESTORNO_SEM_ORIGEM');
  // desfazer o estorno do posto devolve a compra não informada à cobrança
  const estPosto = amb.tabelas.CMP_EXTRATO.find((x) => /ESTORNO POSTO/.test(x.DESCRICAO));
  assert.equal(amb.api('s_fabio', 'conciliacao', { acao: 'descasar', extratoId: estPosto.ID, motivo: 'O estorno era de outro abastecimento' }).ok, true);
  assert.equal(amb.tabelas.CMP_EXTRATO.find((x) => x.ID === posto.ID).SITUACAO, 'NAO_INFORMADA');
  // o relatório A4 da conciliação mostra os estornos
  const rel = amb.api('s_fabio', 'gerarRelatorio', { tipo: 'CONCILIACAO', final: '4321', competencia: '2026-11' });
  assert.equal(rel.ok, true, rel.message); assert.match(rel.html, /Estornos na fatura/); assert.match(rel.html, /Estorno casado com a compra/);
});

test('B4: conferir com o Omie: valor e situação iguais, valor mudado no Omie, título pago fora do SGO+, cancelado ou excluído', () => {
  const a = montarOndaB();
  for (const ref of ['FAT-4321-202611', 'CMP-REQ-2026-0101-1', 'CMP-REQ-2026-0104-1', 'CJU-V-c2']) assert.equal(a.lancar(ref, { pessoaId: 55 }).confirmar.ok, true, ref);
  const ids = a.contasPagar.map((c) => c.codigo_lancamento_omie);
  let c = a.F('OmieEsp_apiConferir', 'wanessa', {});
  assert.equal(c.ok, true, c.mensagem); assert.match(c.mensagem, /Conferidos no Omie: 4 \(4 iguais, 0 com diferença\)/);
  let r = a.tela();
  assert.match(a.item(r, 'FAT-4321-202611').conferencia.texto, /Conferido no Omie: título \d+, R\$ 1\.234,50, situação A VENCER/);
  // no Omie: a fatura mudou de valor, uma compra foi paga direto no Omie, a outra foi cancelada e a carga foi excluída
  a.contasPagar[0].valor_documento = 1300;
  a.statusPagar[ids[1]] = 'PAGO';
  a.statusPagar[ids[2]] = 'CANCELADO';
  a.removidos = [ids[3]]; a.contasPagar.splice(3, 1);
  c = a.F('OmieEsp_apiConferir', 'wanessa', {});
  assert.match(c.mensagem, /Conferidos no Omie: 4 \(1 iguais, 3 com diferença\)/);
  r = a.tela();
  assert.equal(r.contagens.divergencias, 3);
  const div = (ref) => a.item(r, ref).divergencias.join(' | ');
  assert.match(div('FAT-4321-202611'), /No Omie o título \d+ está com R\$ 1\.300,00; no SGO\+ o valor é R\$ 1\.234,50\. Corrija o título em Lançamentos e baixas > Editar/);
  assert.match(div('CMP-REQ-2026-0104-1'), /está cancelado no Omie, mas a origem continua no SGO\+/);
  assert.match(div('CJU-V-c2'), /não foi encontrado no Omie \(pode ter sido excluído\)/);
  const pago = a.item(r, 'CMP-REQ-2026-0101-1');
  assert.equal(pago.pago, true, 'pago no Omie fica registrado'); assert.deepEqual(pago.divergencias, []);
  assert.equal(a.espelho().find((x) => x.REFERENCIA === 'CMP-REQ-2026-0101-1').BAIXADO_POR_NOME, 'Conferido no Omie (baixa feita fora do SGO+)');
  assert.equal(a.tabelas.CMP_PARCELAS.find((x) => x.ID === 'x1').SITUACAO, 'A_PAGAR', 'a baixa feita fora do SGO+ não mexe em Compras');
  // pendência de diferença, sem valores, só para a lista
  const p = a.pend('wanessa').find((x) => x.tipo === 'fin_esp_divergencia');
  assert.ok(p); assert.match(p.titulo, /^3 diferenças entre o SGO\+ e o Omie em Compras e Caju$/); assert.ok(!/R\$/.test(p.titulo + p.detalhe));
  assert.ok(!a.pend('tiago').some((x) => x.tipo === 'fin_esp_divergencia'));
  // o registro de acessos guarda a conferência, sem valor
  assert.ok(a.acessos().some((x) => /Conferência com o Omie: 4 título/.test(JSON.stringify(x))));
  // fora da lista não confere
  assert.match(a.F('OmieEsp_apiConferir', 'tiago', {}).mensagem, /sigiloso/);
});

test('B4: diferenças da origem depois do lançamento: fatura reaberta, valor mudado, compra cancelada e compra paga em Compras sem a baixa no Omie', () => {
  const a = montarOndaB();
  for (const ref of ['FAT-4321-202611', 'CMP-REQ-2026-0101-1', 'CMP-REQ-2026-0104-1']) assert.equal(a.lancar(ref).confirmar.ok, true, ref);
  a.tabelas.CMP_FATURAS.find((f) => f.ID === 'ft1').SITUACAO = 'ABERTA';
  a.tabelas.CMP_PARCELAS.find((x) => x.ID === 'x1').SITUACAO = 'PAGA';
  a.tabelas.CMP_PARCELAS.find((x) => x.ID === 'x1').PAGO_EM = '2026-11-16';
  a.tabelas.CMP_PARCELAS.find((x) => x.ID === 'x5').SITUACAO = 'CANCELADA';
  let r = a.tela();
  assert.match(a.item(r, 'FAT-4321-202611').divergencias.join(' '), /A fatura foi reaberta em Compras depois do lançamento/);
  assert.match(a.item(r, 'CMP-REQ-2026-0101-1').divergencias.join(' '), /Paga em Compras > A pagar em 16\/11\/2026, mas a baixa no Omie ainda não foi registrada pelo SGO\+\. Inclua o título na Aprovação de pagamentos/);
  assert.match(a.item(r, 'CMP-REQ-2026-0104-1').divergencias.join(' '), /O vencimento foi cancelado em Compras depois do lançamento no Omie\. .*Trilha das operações > "Pedir exclusão"/);
  // fatura fechada de novo com outro total
  Object.assign(a.tabelas.CMP_FATURAS.find((f) => f.ID === 'ft1'), { SITUACAO: 'FECHADA', TOTAL_EXTRATO: 1200 });
  r = a.tela();
  assert.match(a.item(r, 'FAT-4321-202611').divergencias.join(' '), /O valor mudou no SGO\+ depois do lançamento: agora R\$ 1\.200,00, lançado no Omie R\$ 1\.234,50/);
  // faixa de Lançamentos e baixas avisa as diferenças
  assert.equal(a.F('OmieEsp_apiResumo', 'wanessa').divergencias, 3);
  // cancelada antes de lançar: some da lista (nada a fazer)
  a.tabelas.CMP_PARCELAS.find((x) => x.ID === 'x2').SITUACAO = 'CANCELADA';
  assert.ok(!a.item(a.tela(), 'CMP-REQ-2026-0102-1'));
});
