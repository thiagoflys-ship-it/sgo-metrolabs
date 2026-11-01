// Comercial C3 (01/11/2026): banco de preços e Orçamentista. Código real num contexto isolado (tests/_comercial_ambiente.cjs),
// só dados de teste. Cobre: carga idempotente, alimentação por proposta ganha e perdida, acesso (vendedor sem custo), Orçamentista
// por regras (itens, prazo, deslocamento e rascunho), IA que nunca troca os números do sistema, busca na internet que não grava
// sem confirmação e os indicadores do Painel.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { ambiente, oportunidadeDeTeste, SEM_VIAGEM } = require('./_comercial_ambiente.cjs');

const ok = (r) => { assert.equal(r.ok, true, r.message); return r; };
const PEDIDO = 'qualificação de 2 autoclaves de 300 L e 1 termodesinfectora em Anápolis, urgente';

function amb0(o) {
  const amb = ambiente(Object.assign({ tabelas: { qual_distancia_referencia: [{ ID: 'd1', DESTINO: 'Anápolis/GO', KM_TRECHO: 55 }, { ID: 'd2', DESTINO: 'Rio Verde/GO', KM_TRECHO: 230 }] } }, o || {}));
  amb.ctx.CONDUTA_SHEETS = { DISTANCIA_REFERENCIA: 'qual_distancia_referencia' };
  amb.ctx.Conduta_obterParametros_ = () => ({ VALOR_INCENTIVO_MISSAO: 300, MISSAO_KM_MINIMO: 200 });
  const pv = ok(amb.api('s_dora', 'importarC1Previa'));
  ok(amb.api('s_dora', 'importarC1', { marca: pv.marca, escolhas: {} }));
  return amb;
}
const prod = (amb, tab) => amb.tabelas.COM_PRODUTOS.find((p) => p.TABELA_CODIGO === 'C1:' + tab);
const linhasDe = (amb, propId) => (amb.tabelas.COM_PRECOS || []).filter((r) => r.REF_ID === propId);
const aceite = { nome: 'aceite.pdf', tipo: 'application/pdf', base64: Buffer.from('%PDF aceite').toString('base64') };

/** Proposta concluída e entregue (para registrar a resposta). */
function propostaEnviada(amb, itens) {
  const { oportunidade } = oportunidadeDeTeste(amb, 's_vera');
  const id = ok(amb.api('s_vera', 'novaProposta', { oportunidadeId: oportunidade.id })).proposta.id;
  ok(amb.api('s_vera', 'salvarProposta', { id, deslocamento: SEM_VIAGEM, itens, condicoes: { pagamento: 'Boleto em 28 dias', garantia: '90 dias' } }));
  ok(amb.api('s_vera', 'concluirProposta', { id }));
  ok(amb.api('s_vera', 'gerarDocumento', { id }));
  ok(amb.api('s_vera', 'marcarEnviada', { id, como: 'Entregue em mãos na reunião com a CME' }));
  return { id, oportunidade };
}

test('carga inicial do banco: prévia por origem, carga idempotente e marca da prévia conferida; vendedor não carrega', () => {
  const amb = amb0();
  const pv = ok(amb.api('s_dora', 'bancoCargaPrevia'));
  assert.equal(pv.c1.total, 3053);
  assert.equal(pv.c1.novas, 3053);
  const por = Object.fromEntries(pv.c1.porOrigem.map((o) => [o.origem, o.novas]));
  assert.deepEqual(por, { LICITACAO: 696, CRM: 2227, PROPOSTA_METROLABS: 130 });
  assert.ok(pv.foraTxt.some((t) => /lote, valor global, mensal/.test(t)), 'a prévia diz o que ficou de fora e por quê');
  assert.match(amb.api('s_dora', 'bancoCarregar', { marca: 'velha' }).message, /mudou desde a prévia/);
  assert.equal((amb.tabelas.COM_PRECOS || []).length, 0, 'marca errada não grava nada');
  ok(amb.api('s_dora', 'bancoCarregar', { marca: pv.marca }));
  assert.equal(amb.tabelas.COM_PRECOS.length, 3053);
  const pv2 = ok(amb.api('s_dora', 'bancoCargaPrevia'));
  assert.equal(pv2.c1.novas, 0); assert.equal(pv2.c1.jaNoBanco, 3053);
  assert.match(ok(amb.api('s_dora', 'bancoCarregar', { marca: pv2.marca })).message, /Nada a carregar/);
  assert.equal(amb.tabelas.COM_PRECOS.length, 3053, 'rodar de novo não repete nada');
  assert.equal(new Set(amb.tabelas.COM_PRECOS.map((r) => r.CHAVE)).size, 3053);
  // sem dados pessoais: linhas do Drive sem cliente; pessoa física do CRM sem nome
  assert.ok(amb.tabelas.COM_PRECOS.filter((r) => r.ORIGEM === 'PROPOSTA_METROLABS' && r.REF_TIPO === 'CARGA_C1').every((r) => !r.CLIENTE_NOME));
  assert.match(amb.api('s_vera', 'bancoCargaPrevia').message, /ação é da gestão comercial/);
  assert.match(amb.api('s_vera', 'bancoCarregar', { marca: pv2.marca }).message, /ação é da gestão comercial/);
});

test('carga traz as cotações de Compras como COTACAO_FORNECEDOR, só lendo (Compras não muda); idempotente', () => {
  const amb = amb0({ tabelas: {
    qual_distancia_referencia: [],
    CMP_REQUISICOES: [{ ID: 'rq1', NUMERO: 'REQ-2026-0007', TITULO: 'Sensores' }],
    CMP_ITENS: [{ ID: 'it1', REQUISICAO_ID: 'rq1', DESCRICAO: 'Sensor de temperatura PT100 com cabo de 2 m', QUANTIDADE: 4, UNIDADE: 'UN', MARCA: 'MARCA TESTE' }],
    CMP_COTACOES: [{ ID: 'ct1', REQUISICAO_ID: 'rq1', FORNECEDOR_NOME: 'FORNECEDOR TESTE A', PRECOS_JSON: JSON.stringify([{ itemId: 'it1', precoUnitario: 210 }]), SITUACAO: 'LANCADA', CRIADO_EM: '2026-10-10T10:00' },
      { ID: 'ct2', REQUISICAO_ID: 'rq1', FORNECEDOR_NOME: 'FORNECEDOR TESTE B', PRECOS_JSON: JSON.stringify([{ itemId: 'it1', precoUnitario: 260 }]), SITUACAO: 'RETIRADA', CRIADO_EM: '2026-10-11T10:00' }] } });
  const antes = JSON.stringify([amb.tabelas.CMP_COTACOES, amb.tabelas.CMP_ITENS, amb.tabelas.CMP_REQUISICOES]);
  const pv = ok(amb.api('s_dora', 'bancoCargaPrevia'));
  assert.equal(pv.compras.novas, 1, 'a cotação retirada não entra');
  ok(amb.api('s_dora', 'bancoCarregar', { marca: pv.marca }));
  const c = amb.tabelas.COM_PRECOS.find((r) => r.ORIGEM === 'COTACAO_FORNECEDOR');
  assert.equal(c.VALOR_UNITARIO, 210); assert.equal(c.FORNECEDOR, 'FORNECEDOR TESTE A'); assert.equal(c.CUSTO_UNITARIO, 210); assert.equal(c.TIPO, 'PRODUTO');
  assert.equal(JSON.stringify([amb.tabelas.CMP_COTACOES, amb.tabelas.CMP_ITENS, amb.tabelas.CMP_REQUISICOES]), antes, 'Compras fica como estava');
  // vendedor: a cotação aparece, sem o valor (preço de compra é custo)
  const q = ok(amb.api('s_vera', 'bancoPrecos', { busca: 'PT100' }));
  const l = q.linhas.find((x) => x.origem === 'COTACAO_FORNECEDOR');
  assert.equal(l.valor, null); assert.match(l.valorTxt, /só a gestão vê/); assert.equal(l.custo, undefined);
  const g = ok(amb.api('s_gaspar', 'bancoItem', { itemChave: c.ITEM_CHAVE }));
  assert.equal(g.porFornecedor[0].fornecedor, 'FORNECEDOR TESTE A'); assert.match(g.compraTxt, /210,00/);
  const v = ok(amb.api('s_vera', 'bancoItem', { itemChave: c.ITEM_CHAVE }));
  assert.equal(v.porFornecedor, undefined); assert.equal(v.compra, undefined); assert.equal(v.linhas[0].valor, null);
});

test('alimentação: concluída entra em aberto; recusada vira perdida com quem ganhou e por quanto (rateado); aprovada vira ganha', () => {
  const amb = amb0();
  const ac = prod(amb, 'QT_AUTOCLAVE_GRANDE'), tm = prod(amb, 'CAL_TERMOMETRO');
  const a = propostaEnviada(amb, [{ produtoId: ac.ID, descricao: ac.NOME, quantidade: 1, precoUnitario: '3.020,00' }, { produtoId: tm.ID, descricao: tm.NOME, quantidade: 10, precoUnitario: '70,00' }]);
  let l = linhasDe(amb, a.id);
  assert.equal(l.length, 2); assert.ok(l.every((r) => r.RESULTADO === 'EM_ABERTO' && r.ORIGEM === 'PROPOSTA_METROLABS'));
  assert.equal(l.find((r) => r.ITEM_CODIGO === 'QT_AUTOCLAVE_GRANDE').ITEM_CHAVE, 'C1:QT_AUTOCLAVE_GRANDE');
  assert.match(amb.api('s_vera', 'respostaCliente', { id: a.id, resposta: 'RECUSADA', motivo: 'Concorrente escolhido', texto: 'Fechou com outra empresa', valorVencedor: 'muito' }).message, /precisa ser um valor em reais/);
  ok(amb.api('s_vera', 'respostaCliente', { id: a.id, resposta: 'RECUSADA', motivo: 'Concorrente escolhido', texto: 'Fechou com outra empresa', concorrente: 'CONCORRENTE TESTE LTDA', valorVencedor: '3.000,00' }));
  l = linhasDe(amb, a.id);
  assert.ok(l.every((r) => r.RESULTADO === 'PERDIDO' && r.CONCORRENTE === 'CONCORRENTE TESTE LTDA'));
  // 3.000 rateados: autoclave 3020/3720 do total, termômetro 700/3720 (por unidade)
  assert.equal(l.find((r) => r.ITEM_CODIGO === 'QT_AUTOCLAVE_GRANDE').VALOR_VENCEDOR, Math.round(3000 * 3020 / 3720 * 100) / 100);
  assert.equal(l.find((r) => r.ITEM_CODIGO === 'CAL_TERMOMETRO').VALOR_VENCEDOR, Math.round(3000 * 700 / 3720 / 10 * 100) / 100);
  assert.equal(amb.tabelas.COM_PROPOSTAS.find((p) => p.ID === a.id).CONCORRENTE_VENCEDOR, 'CONCORRENTE TESTE LTDA');
  // perder a oportunidade depois: sem concorrente nesta tela, o que já estava fica (merge)
  ok(amb.api('s_vera', 'perder', { id: a.oportunidade.id, motivo: 'Concorrente escolhido', aprendizado: 'O cliente comparou só o preço da autoclave' }));
  assert.ok(linhasDe(amb, a.id).every((r) => r.RESULTADO === 'PERDIDO' && r.CONCORRENTE === 'CONCORRENTE TESTE LTDA'), 'nunca apaga campo sem merge');
  // outra proposta aprovada
  const b = propostaEnviada(amb, [{ produtoId: ac.ID, descricao: ac.NOME, quantidade: 2, precoUnitario: '2.900,00' }]);
  ok(amb.api('s_vera', 'respostaCliente', { id: b.id, resposta: 'APROVADA', texto: 'Aprovado por e-mail', arquivo: aceite }));
  const lb = linhasDe(amb, b.id);
  assert.equal(lb.length, 1); assert.equal(lb[0].RESULTADO, 'GANHO'); assert.equal(lb[0].VALOR_UNITARIO, 2900); assert.equal(lb[0].QUANTIDADE, 2);
  // a consulta junta as duas no mesmo item, com a taxa de ganho
  const it = ok(amb.api('s_vera', 'bancoItem', { itemChave: 'C1:QT_AUTOCLAVE_GRANDE' }));
  assert.equal(it.decididas, 2); assert.equal(it.taxaGanho, 50);
  assert.equal(it.vencedores[0].concorrente, 'CONCORRENTE TESTE LTDA');
});

test('alimentação: oportunidade perdida (sem recusa registrada) leva as propostas concluídas como perdidas, com o vencedor; nova revisão tira a anterior das contas', () => {
  const amb = amb0();
  const ac = prod(amb, 'QT_AUTOCLAVE_GRANDE');
  const a = propostaEnviada(amb, [{ produtoId: ac.ID, descricao: ac.NOME, quantidade: 1, precoUnitario: '3.020,00' }]);
  const r = ok(amb.api('s_vera', 'novaRevisao', { id: a.id }));
  assert.ok(linhasDe(amb, a.id).every((x) => x.SITUACAO === 'SUBSTITUIDO'), 'a revisão substituída sai das contas');
  const nova = r.proposta.id;
  ok(amb.api('s_vera', 'salvarProposta', { id: nova, deslocamento: SEM_VIAGEM, itens: [{ produtoId: ac.ID, descricao: ac.NOME, quantidade: 1, precoUnitario: '2.950,00' }], condicoes: { pagamento: 'Boleto em 28 dias', garantia: '90 dias' } }));
  ok(amb.api('s_vera', 'concluirProposta', { id: nova }));
  const p = ok(amb.api('s_vera', 'perder', { id: a.oportunidade.id, motivo: 'Preço ou condição de pagamento', aprendizado: 'Ganhou quem não cobrou a urgência', concorrente: 'OUTRA EMPRESA TESTE', valorVencedor: '2.400' }));
  assert.match(p.message, /banco de preços/);
  const ln = linhasDe(amb, nova);
  assert.equal(ln.length, 1); assert.equal(ln[0].RESULTADO, 'PERDIDO'); assert.equal(ln[0].CONCORRENTE, 'OUTRA EMPRESA TESTE'); assert.equal(ln[0].VALOR_VENCEDOR, 2400);
  assert.ok(linhasDe(amb, a.id).every((x) => x.SITUACAO === 'SUBSTITUIDO'), 'a revisão antiga continua fora');
  const o = amb.tabelas.COM_OPORTUNIDADES.find((x) => x.ID === a.oportunidade.id);
  assert.equal(o.CONCORRENTE_VENCEDOR, 'OUTRA EMPRESA TESTE'); assert.equal(o.VALOR_VENCEDOR, 2400);
  // ganhar sem resposta do cliente: a última concluída vira ganha
  const b = propostaEnviada(amb, [{ produtoId: ac.ID, descricao: ac.NOME, quantidade: 1, precoUnitario: '3.020,00' }]);
  ok(amb.api('s_vera', 'ganhar', { id: b.oportunidade.id }));
  assert.equal(linhasDe(amb, b.id)[0].RESULTADO, 'GANHO');
});

test('acesso: vendedor vê preço praticado e mercado sem custo nem margem; gestão vê tudo; técnico e cliente não abrem', () => {
  const amb = amb0();
  ok(amb.api('s_dora', 'bancoCarregar', { marca: ok(amb.api('s_dora', 'bancoCargaPrevia')).marca }));
  const v = ok(amb.api('s_vera', 'bancoPrecos', { busca: 'autoclave', origem: 'CRM' }));
  assert.ok(v.linhas.length > 0); assert.equal(v.veCusto, false);
  const json = JSON.stringify(v);
  assert.doesNotMatch(json, /"custo"|"custoTxt"|"margemBruta|"compra"|"porFornecedor"|"margemCompraVenda/);
  assert.ok(v.linhas.every((l) => l.valor > 0), 'o vendedor vê o preço praticado');
  const g = ok(amb.api('s_gaspar', 'bancoPrecos', { busca: 'autoclave', origem: 'CRM' }));
  assert.equal(g.veCusto, true);
  assert.ok(g.linhas.some((l) => l.custoTxt), 'a gestão vê o custo cadastrado no CRM');
  assert.match(amb.api('s_vera', 'bancoIndicadores', {}).message, /ação é da gestão comercial/);
  assert.match(amb.api('s_vera', 'bancoDesconsiderar', { id: g.linhas[0].id, motivo: 'teste de acesso do vendedor' }).message, /ação é da gestão comercial/);
  assert.equal(amb.api('s_tiago', 'bancoPrecos', {}).ok, false);
  assert.equal(amb.api('s_tiago', 'orcamentista', { texto: PEDIDO }).ok, false);
  amb.sessoes.s_cli = { userId: 'u_cli', usuario: 'cli', nome: 'CLIENTE TESTE', perfil: 'CLIENTE' };
  assert.match(amb.api('s_cli', 'bancoPrecos', {}).message, /equipe interna/);
  // o Orçamentista do vendedor: aviso de mínimo sem o número; a gestão vê o número e o custo
  const ov = ok(amb.api('s_vera', 'orcamentista', { texto: 'calibração de 1 aparelho de anestesia', semIA: true }));
  assert.equal(ov.itens[0].precoMinimo, undefined); assert.equal(ov.itens[0].custoUnitario, undefined);
  const og = ok(amb.api('s_gaspar', 'orcamentista', { texto: 'calibração de 1 aparelho de anestesia', semIA: true }));
  assert.ok(og.itens[0].precoMinimo > 0); assert.ok(og.itens[0].custoUnitario > 0);
  // a margem sobre peças é da gestão: o vendedor não vê o valor na metodologia
  const met = ok(amb.api('s_vera', 'metodologia'));
  assert.equal(met.metodologia.precificacao.margemPecasPct, null);
  assert.equal(ok(amb.api('s_dora', 'metodologia')).metodologia.precificacao.margemPecasPct, 30);
});

test('Orçamentista por regras: identifica itens e quantidades, prazo urgente, Anápolis pela tabela da Conduta e monta o rascunho; nada é enviado', () => {
  const amb = amb0();
  ok(amb.api('s_dora', 'bancoCarregar', { marca: ok(amb.api('s_dora', 'bancoCargaPrevia')).marca }));
  const r = ok(amb.api('s_vera', 'orcamentista', { texto: PEDIDO, clienteId: 'c1', unidadeId: 'un1' }));
  assert.equal(r.origem, 'REGRAS');
  assert.match(r.avisos.join(' '), /Sem a chave da IA/);
  assert.deepEqual(r.itens.map((i) => [i.codigo, i.quantidade]), [['QT_AUTOCLAVE_GRANDE', 2], ['QT_LAVADORA_TD', 1]]);
  assert.deepEqual(r.naoEntendi, [], 'cidade e "urgente" não são item');
  assert.equal(r.prazo.faixa, 'URGENTE');
  const ac = r.itens[0];
  assert.equal(ac.precoNormal, 3020); assert.equal(ac.precoTabela, 6350, 'urgente: 3.020 × 2,1 arredondado como na tabela');
  assert.equal(r.deslocamento.destino, 'Anápolis/GO'); assert.equal(r.deslocamento.kmTrecho, 55); assert.equal(r.deslocamento.kmFonte, 'REFERENCIA_CONDUTA');
  assert.equal(r.deslocamento.tecnicos, 2); assert.equal(r.deslocamento.noites, 0, 'trecho curto: sem hotel');
  assert.ok(r.viagem && r.viagem.preco > 0);
  assert.match(ac.mercado.txt, /Centro-Oeste/); assert.ok(ac.parecidos.n > 0);
  assert.ok(ac.riscos.some((x) => /maior preço com que já ganhamos/.test(x.texto)));
  assert.ok(ac.fontes.some((f) => /Riscos comparados com o preço normal/.test(f)));
  assert.match(r.justificativa, /2 × Qualificação térmica de autoclave/);
  // volume não dito e "bancada"
  const b = ok(amb.api('s_vera', 'orcamentista', { texto: 'qualificação de autoclave de bancada; calibração de 10 termômetros e 3 balanças pediátricas', semIA: true }));
  assert.deepEqual(b.itens.map((i) => [i.codigo, i.quantidade]), [['QT_AUTOCLAVE_BANCADA', 1], ['CAL_TERMOMETRO', 10], ['CAL_BALANCA_PEQ', 3]]);
  const s = ok(amb.api('s_vera', 'orcamentista', { texto: 'preventiva de 1 autoclave', semIA: true }));
  assert.equal(s.itens[0].codigo, 'MP_AUTOCLAVE_GRANDE'); assert.match(s.itens[0].riscos[0].texto, /volume da autoclave não foi dito/);
  // montar: cria o rascunho com os preços do sistema (a tela manda preço errado: ignorado)
  const { oportunidade } = oportunidadeDeTeste(amb, 's_vera');
  const r2 = ok(amb.api('s_vera', 'orcamentista', { texto: PEDIDO, clienteId: 'c1', unidadeId: 'un1' }));
  assert.ok(r2.oportunidades.some((o) => o.id === oportunidade.id));
  const enviosAntes = amb.emails.length + amb.whats.length + amb.tabelas.DOC_ENVIOS.length;
  const m = ok(amb.api('s_vera', 'orcamentistaMontar', { oportunidadeId: oportunidade.id, itens: r2.itens.map((i) => ({ produtoId: i.produtoId, codigo: i.codigo, quantidade: i.quantidade, precoUnitario: 1 })), prazo: r2.prazo, deslocamento: r2.deslocamento, justificativa: r2.justificativa }));
  assert.match(m.message, /nada foi enviado ao cliente/);
  const p = amb.tabelas.COM_PROPOSTAS.find((x) => x.ID === m.propostaId);
  assert.equal(p.SITUACAO, 'RASCUNHO');
  const itens = JSON.parse(p.ITENS_JSON).filter((i) => !i.auto);
  assert.deepEqual(itens.map((i) => [i.codigo, i.quantidade, i.precoUnitario]), [['QT-AUTOCLAVE-GRANDE', 2, 6350], ['QT-LAVADORA-TD', 1, 5110]]);
  assert.equal(JSON.parse(p.PRAZO_JSON).faixa, 'URGENTE');
  const desl = JSON.parse(p.DESLOCAMENTO_JSON).viagem;
  assert.equal(desl.ha, true); assert.equal(desl.destino, 'Anápolis/GO'); assert.equal(desl.kmTrecho, 55); assert.equal(desl.equipe.TECNICO, 2);
  assert.ok(JSON.parse(p.ITENS_JSON).some((i) => i.auto), 'o item do deslocamento foi calculado');
  assert.equal(amb.emails.length + amb.whats.length + amb.tabelas.DOC_ENVIOS.length, enviosAntes, 'nada enviado');
  // de novo na mesma oportunidade: merge (o que já está fica como está; o vendedor mudou o preço e a quantidade)
  const its = JSON.parse(p.ITENS_JSON).filter((i) => !i.auto).map((i) => ({ produtoId: i.produtoId, descricao: i.descricao, quantidade: i.quantidade, precoUnitario: i.precoUnitario }));
  its[0].precoUnitario = '6.000,00'; its[0].quantidade = 3;
  ok(amb.api('s_vera', 'salvarProposta', { id: p.ID, itens: its }));
  const tm = prod(amb, 'CAL_TERMOMETRO');
  const m2 = ok(amb.api('s_vera', 'orcamentistaMontar', { oportunidadeId: oportunidade.id, itens: [{ produtoId: r2.itens[0].produtoId, quantidade: 1 }, { produtoId: tm.ID, quantidade: 5 }], prazo: { faixa: 'NORMAL' }, deslocamento: { destino: 'Rio Verde/GO', kmTrecho: 230, tecnicos: 1, dias: 2, noites: 1 } }));
  assert.match(m2.message, /1 item já estava na proposta/); assert.match(m2.message, /deslocamento que já estava/);
  const p2 = amb.tabelas.COM_PROPOSTAS.find((x) => x.ID === p.ID), it2 = JSON.parse(p2.ITENS_JSON).filter((i) => !i.auto);
  assert.equal(it2.length, 3);
  assert.equal(it2[0].precoUnitario, 6000); assert.equal(it2[0].quantidade, 3, 'item que já estava fica como estava');
  assert.equal(JSON.parse(p2.DESLOCAMENTO_JSON).viagem.destino, 'Anápolis/GO');
  assert.equal(JSON.parse(p2.PRAZO_JSON).faixa, 'URGENTE');
  assert.equal(it2[2].precoUnitario, 150, 'termômetro novo na faixa urgente da proposta: 70 × 2,1');
  assert.ok(amb.tabelas.COM_HISTORICO.some((h) => h.TIPO === 'ORCAMENTISTA' && h.ENTIDADE_ID === p.ID));
  // operador nunca no limbo: proposta pronta pede para voltar ao rascunho
  const its3 = JSON.parse(p2.ITENS_JSON).filter((i) => !i.auto).map((i) => ({ produtoId: i.produtoId, codigo: i.codigo, descricao: i.descricao, quantidade: i.quantidade, precoUnitario: i.precoUnitario }));
  ok(amb.api('s_vera', 'salvarProposta', { id: p.ID, itens: its3, deslocamento: SEM_VIAGEM, condicoes: { pagamento: 'Boleto em 28 dias', garantia: '90 dias' } }));
  ok(amb.api('s_vera', 'concluirProposta', { id: p.ID, justificativa: 'Teste: preço combinado com a gestão' }));
  assert.match(amb.api('s_vera', 'orcamentistaMontar', { oportunidadeId: oportunidade.id, itens: [{ produtoId: tm.ID, quantidade: 1 }] }).message, /Editar \(volta para rascunho\)/);
  assert.match(amb.api('s_vera', 'orcamentista', { texto: '' }).message, /descreva o pedido/);
});

test('IA: só interpreta; código inventado é descartado, preço da IA é ignorado e justificativa com número inventado é recusada', () => {
  const resposta = (prompt) => /TAREFA: interpretar/.test(prompt)
    ? JSON.stringify({ itens: [{ codigo: 'QT_AUTOCLAVE_GRANDE', quantidade: 2, preco: 1, precoUnitario: 1, total: 2 }, { codigo: 'QT_INVENTADO', quantidade: 3 }, { codigo: 'CAL_TERMOMETRO', quantidade: 2.5 }], faixa: 'NORMAL', licitacao: false, cidade: 'Rio Verde/GO', naoEntendi: [] })
    : JSON.stringify({ justificativa: 'Pelo histórico, cobre R$ 1.234,56 por autoclave e feche hoje.' });
  const amb = amb0({ ia: resposta });
  const r = ok(amb.api('s_vera', 'orcamentista', { texto: 'duas autoclaves e termômetros em Rio Verde' }));
  assert.equal(r.origem, 'IA');
  assert.deepEqual(r.itens.map((i) => [i.codigo, i.quantidade]), [['QT_AUTOCLAVE_GRANDE', 2], ['CAL_TERMOMETRO', 1]], 'quantidade inválida vira 1; código inventado sai');
  assert.match(r.avisos.join(' '), /QT_INVENTADO/);
  assert.equal(r.itens[0].precoTabela, 3020, 'o preço é o do catálogo, não o da IA');
  assert.equal(r.totalItens, 3020 * 2 + 70);
  assert.equal(r.justificativaOrigem, 'REGRAS');
  assert.match(r.avisos.join(' '), /justificativa da IA foi recusada/);
  assert.doesNotMatch(r.justificativa, /1\.234,56/);
  assert.equal(r.deslocamento.destino, 'Rio Verde/GO'); assert.equal(r.deslocamento.kmTrecho, 230);
  assert.ok(r.deslocamento.noites >= 1, 'trecho longo: pernoite');
  assert.ok(amb.iaPrompts.some((p) => /TAREFA: interpretar/.test(p) && /Não dê preço/.test(p)));
  // justificativa com os números do sistema passa
  const amb2 = amb0({ ia: (prompt) => /TAREFA: interpretar/.test(prompt) ? JSON.stringify({ itens: [{ codigo: 'QT_AUTOCLAVE_GRANDE', quantidade: 1 }], faixa: 'NORMAL' }) : JSON.stringify({ justificativa: 'Uma qualificação de autoclave pela tabela, a R$ 3.020,00, no prazo normal.' }) });
  const r2 = ok(amb2.api('s_vera', 'orcamentista', { texto: 'qualificação da autoclave' }));
  assert.equal(r2.justificativaOrigem, 'IA'); assert.match(r2.justificativa, /3\.020,00/);
  // "só pelas regras" não chama a IA
  const n = amb2.iaPrompts.length;
  ok(amb2.api('s_vera', 'orcamentista', { texto: 'qualificação da autoclave', semIA: true }));
  assert.equal(amb2.iaPrompts.length, n);
});

test('busca na internet: sem configuração não trava e não grava; configurada, nada entra sem a confirmação de quem buscou, com o link', () => {
  const amb = amb0();
  const antes = (amb.tabelas.COM_PRECOS || []).length;
  const s = ok(amb.api('s_vera', 'bancoBuscarInternet', { descricao: 'qualificação térmica de autoclave', tipo: 'SERVICO' }));
  assert.equal(s.configurada, false); assert.match(s.comoConfigurar, /Chaves e senhas/); assert.match(s.message, /Nada travou/);
  assert.equal((amb.tabelas.COM_PRECOS || []).length, antes);
  // ligada, com a IA respondendo pela pesquisa do Google (simulada)
  amb.props.COM_BUSCA_WEB = '1'; amb.props.GEMINI_API_KEY = 'chave-de-teste';
  const chamadas = [];
  amb.ctx.UrlFetchApp = { fetch: (url, op) => {
    chamadas.push({ url, headers: op.headers });
    const corpo = JSON.parse(op.payload);
    assert.deepEqual(corpo.tools, [{ google_search: {} }]);
    const texto = JSON.stringify({ resultados: [{ titulo: 'Ata de registro de preços', url: 'https://pncp.gov.br/app/editais/teste/1', valor: 2890, unidade: 'serviço', data: '2026-05-10', onde: 'Prefeitura Teste', uf: 'GO', trecho: 'Qualificação de autoclave R$ 2.890,00' },
      { titulo: 'sem link', url: 'javascript:alert(1)', valor: 10 }, { titulo: 'sem valor', url: 'https://exemplo.test/x', valor: 'consulte' }] });
    return { getResponseCode: () => 200, getContentText: () => JSON.stringify({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: texto }] }, groundingMetadata: { webSearchQueries: ['qualificação autoclave preço'] } }] }) };
  } };
  const b = ok(amb.api('s_vera', 'bancoBuscarInternet', { descricao: 'qualificação térmica de autoclave', tipo: 'SERVICO', itemCodigo: 'QT_AUTOCLAVE_GRANDE' }));
  assert.equal(b.configurada, true); assert.equal(b.resultados.length, 1, 'só entra o que tem https e valor');
  assert.equal(chamadas[0].headers['x-goog-api-key'], 'chave-de-teste'); assert.doesNotMatch(JSON.stringify(b), /chave-de-teste/, 'a chave nunca vai à tela');
  assert.equal((amb.tabelas.COM_PRECOS || []).length, antes, 'buscar não grava nada');
  assert.match(amb.api('s_vito', 'bancoConfirmarInternet', { token: b.token, indice: 0 }).message, /só quem fez a busca/);
  assert.match(amb.api('s_vera', 'bancoConfirmarInternet', { token: b.token, indice: 0, valor: '2.500,00' }).message, /Escreva por quê/);
  ok(amb.api('s_vera', 'bancoConfirmarInternet', { token: b.token, indice: 0, origem: 'LICITACAO' }));
  const novos = amb.tabelas.COM_PRECOS.filter((r) => r.REF_TIPO === 'INTERNET');
  assert.equal(novos.length, 1); assert.equal(novos[0].ORIGEM, 'LICITACAO'); assert.equal(novos[0].LINK, 'https://pncp.gov.br/app/editais/teste/1'); assert.equal(novos[0].VALOR_UNITARIO, 2890);
  assert.equal(novos[0].ITEM_CHAVE, 'C1:QT_AUTOCLAVE_GRANDE'); assert.equal(novos[0].REGISTRADO_POR_NOME, 'VERA VENDEDORA TESTE');
  ok(amb.api('s_vera', 'bancoConfirmarInternet', { token: b.token, indice: 0, origem: 'LICITACAO' }));
  assert.equal(amb.tabelas.COM_PRECOS.filter((r) => r.REF_TIPO === 'INTERNET').length, 1, 'confirmar duas vezes não duplica');
  assert.match(amb.api('s_vera', 'bancoConfirmarInternet', { token: 'nao-existe', indice: 0 }).message, /expirou/);
  // a IA respondeu sem pesquisar: nada é aproveitado
  amb.ctx.UrlFetchApp = { fetch: () => ({ getResponseCode: () => 200, getContentText: () => JSON.stringify({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: '{"resultados":[{"url":"https://x.test/a","valor":5}]}' }] } }] }) }) };
  const sem = ok(amb.api('s_vera', 'bancoBuscarInternet', { descricao: 'qualificação térmica de autoclave' }));
  assert.equal(sem.resultados.length, 0); assert.match(sem.message, /sem pesquisar na web/);
});

test('registro à mão e desconsiderar: link obrigatório para internet; cotação de fornecedor só pela gestão; tirar das contas pede motivo', () => {
  const amb = amb0();
  assert.match(amb.api('s_vera', 'bancoRegistrar', { origem: 'INTERNET', descricao: 'Sensor PT100', valor: '200', tipo: 'PRODUTO' }).message, /precisa do link/);
  assert.match(amb.api('s_vera', 'bancoRegistrar', { origem: 'COTACAO_FORNECEDOR', descricao: 'Sensor PT100', valor: '200', tipo: 'PRODUTO' }).message, /preço de compra/);
  ok(amb.api('s_vera', 'bancoRegistrar', { origem: 'CONCORRENTE', concorrente: 'CONCORRENTE TESTE', descricao: 'Qualificação térmica de autoclave', itemCodigo: 'QT_AUTOCLAVE_GRANDE', valor: '2.700,00', uf: 'GO' }));
  assert.match(ok(amb.api('s_vera', 'bancoRegistrar', { origem: 'CONCORRENTE', concorrente: 'CONCORRENTE TESTE', descricao: 'Qualificação térmica de autoclave', itemCodigo: 'QT_AUTOCLAVE_GRANDE', valor: '2.700,00', uf: 'GO' })).message, /já estava/);
  const l = amb.tabelas.COM_PRECOS[0];
  assert.match(amb.api('s_gaspar', 'bancoDesconsiderar', { id: l.ID, motivo: 'curto' }).message, /escreva o motivo/);
  ok(amb.api('s_gaspar', 'bancoDesconsiderar', { id: l.ID, motivo: 'Valor era de lote com 3 autoclaves' }));
  assert.equal(amb.tabelas.COM_PRECOS[0].SITUACAO, 'DESCONSIDERADO');
  assert.equal(ok(amb.api('s_vera', 'bancoPrecos', { busca: 'autoclave' })).encontradas, 0, 'fora das contas sai da consulta');
  ok(amb.api('s_gaspar', 'bancoDesconsiderar', { id: l.ID, desconsiderar: false }));
  assert.equal(ok(amb.api('s_vera', 'bancoPrecos', { busca: 'autoclave' })).encontradas, 1);
});

test('indicadores do Painel (gestão): taxa de ganho por serviço, preço médio ganho × perdido, concorrentes e itens sem referência', () => {
  const amb = amb0();
  ok(amb.api('s_dora', 'bancoCarregar', { marca: ok(amb.api('s_dora', 'bancoCargaPrevia')).marca }));
  ok(amb.api('s_gaspar', 'salvarProduto', { codigo: 'SRV-NOVO', nome: 'Ensaio de estanqueidade de câmara hiperbárica', tipo: 'SERVICO', preco: '900,00' }));
  const ac = prod(amb, 'QT_AUTOCLAVE_GRANDE');
  const a = propostaEnviada(amb, [{ produtoId: ac.ID, descricao: ac.NOME, quantidade: 1, precoUnitario: '3.020,00' }]);
  ok(amb.api('s_vera', 'respostaCliente', { id: a.id, resposta: 'RECUSADA', motivo: 'Concorrente escolhido', texto: 'Fechou com outra empresa', concorrente: 'CONCORRENTE TESTE LTDA', valorVencedor: '2.500,00' }));
  const r = ok(amb.api('s_gaspar', 'bancoIndicadores', {}));
  const auto = r.servicos.find((s) => s.itemChave === 'C1:QT_AUTOCLAVE_GRANDE');
  assert.equal(auto.decididas, 9); assert.equal(auto.ganhos, 6); assert.equal(auto.taxa, Math.round(6 / 9 * 1000) / 10);
  assert.equal(auto.mediaGanho, 2750); assert.ok(auto.mediaPerdido > auto.mediaGanho); assert.equal(auto.leitura, 'ganhamos com preço menor');
  assert.equal(r.concorrentes[0].nome, 'CONCORRENTE TESTE LTDA'); assert.equal(r.concorrentes[0].perdas, 1); assert.equal(r.concorrentes[0].comValor, 1);
  assert.ok(r.vencedoresLicitacoes.length > 0);
  assert.ok(r.semReferencia.some((x) => x.codigo === 'SRV-NOVO'));
  assert.ok(!r.semReferencia.some((x) => x.codigo === ac.CODIGO), 'a autoclave tem referência');
  assert.ok(r.totalPrecos > 3000);
});
