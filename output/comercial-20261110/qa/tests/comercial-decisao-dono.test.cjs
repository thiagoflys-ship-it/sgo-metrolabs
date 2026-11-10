// Decisão do dono de 01/11/2026: sobra mínima de 35% (antes de IR e CSLL), valores maiores, taxa por viagem removida (era o
// Incentivo de Missão), Bônus Coletivo diluído na hora, km R$ 2,50 e impostos por unidade emissora (Lucro Real, Goiânia e Rio).
// Também a aplicação na produção (política como versão nova, preços como lote de reajuste), sempre com prévia.
// Código real num contexto isolado (tests/_comercial_ambiente.cjs). Só dados de teste.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { ambiente, oportunidadeDeTeste, SEM_VIAGEM } = require('./_comercial_ambiente.cjs');

const ok = (r) => { assert.equal(r.ok, true, r.message); return r; };
const reg = (amb, id) => amb.tabelas.COM_PROPOSTAS.find((x) => x.ID === id);
const prodCod = (amb, cod) => amb.tabelas.COM_PRODUTOS.find((p) => p.CODIGO === cod);

function amb0(o) {
  const amb = ambiente(Object.assign({ tabelas: { qual_distancia_referencia: [{ ID: 'd1', DESTINO: 'Rio Verde/GO', KM_TRECHO: 228 }] } }, o || {}));
  amb.ctx.CONDUTA_SHEETS = { DISTANCIA_REFERENCIA: 'qual_distancia_referencia' };
  amb.ctx.Conduta_obterParametros_ = () => ({ VALOR_INCENTIVO_MISSAO: 300, MISSAO_KM_MINIMO: 200 });
  return amb;
}
function produto(amb, codigo, tipo, preco, custo) {
  ok(amb.api('s_gaspar', 'salvarProduto', { codigo, nome: 'Item de teste ' + codigo, tipo, preco, custo }));
  return prodCod(amb, codigo);
}
function proposta(amb, itens, deslocamento, extra) {
  const { oportunidade } = oportunidadeDeTeste(amb);
  const id = ok(amb.api('s_vera', 'novaProposta', { oportunidadeId: oportunidade.id })).proposta.id;
  const s = ok(amb.api('s_vera', 'salvarProposta', Object.assign({ id, escopo: 'Serviço de teste com relatório e certificado ao final.', itens, deslocamento: deslocamento || SEM_VIAGEM, condicoes: { pagamento: 'Boleto em 28 dias', garantia: '90 dias' } }, extra || {})));
  return { id, salvo: s };
}
const item = (p, preco, extra) => Object.assign({ produtoId: p.ID, descricao: p.NOME, quantidade: 1, precoUnitario: preco || String(p.PRECO).replace('.', ',') }, extra || {});
const analise = (amb, id) => ok(amb.api('s_gaspar', 'proposta', { id })).proposta.deslocamento.analise;
// 1 técnico a Rio Verde (228 km), bate-volta, sem pedágio: km 1.140 + alimentação 100 + incentivo 300 + estrada 6,5 h x 112,50 = 2.271,25
const VIAGEM_RV = { viagem: { ha: 'SIM', tecnicos: 1, destino: 'Rio Verde/GO', kmTrecho: '228', dias: 1, noites: 0, linhas: { PEDAGIO: { nsa: true, motivo: 'Sem pedágio no trajeto' } } } };

test('sobra mínima de 35%: abaixo vai para a Diretoria (qualquer que seja a alçada do vendedor); acima conclui direto', () => {
  const amb = amb0();
  const caro = produto(amb, 'SRV-OK', 'SERVICO', '1.000,00', '400,00');
  const barato = produto(amb, 'SRV-BX', 'SERVICO', '800,00', '400,00');
  // 1.000 − 142,50 (14,25%) − 30 (3%) − 400 = 427,50 = 42,75%
  const a = proposta(amb, [item(caro)]);
  const an = analise(amb, a.id);
  assert.equal(an.margemValor, 427.5); assert.equal(an.margemPct, 42.75); assert.equal(an.margemMinPct, 35); assert.equal(an.margemAlvoPct, 40); assert.equal(an.abaixoMin, false);
  assert.equal(ok(amb.api('s_vera', 'concluirProposta', { id: a.id })).proposta.situacao, 'PRONTA');
  // 800 − 114 − 24 − 400 = 262 = 32,75%: só a Diretoria aprova, mesmo com o vendedor autorizado a dar 50% de desconto
  ok(amb.api('s_gaspar', 'metodologia', { pagina: 'PRECO', salvar: { politica: { descontoMaxPct: 15, descontoPorVendedor: { u_ven: 50 } } }, motivo: 'Teste: alçada larga para a vendedora' }));
  const b = proposta(amb, [item(barato)]);
  assert.equal(analise(amb, b.id).margemPct, 32.75);
  assert.equal(b.salvo.politica.exigeDiretoria, true);
  assert.match(b.salvo.politica.motivos.join(' '), /sobra de 32,8% .* abaixo da mínima de 35,0% da política de precificação; só a Diretoria aprova/);
  const r = amb.api('s_vera', 'concluirProposta', { id: b.id });
  assert.equal(r.ok, false); assert.match(r.message, /precisa da aprovação da Diretoria .*Escreva por que este preço é necessário/);
  ok(amb.api('s_vera', 'concluirProposta', { id: b.id, justificativa: 'Cliente estratégico com contrato anual em negociação' }));
  assert.match(amb.api('s_gaspar', 'decidirDesconto', { id: b.id, aprovar: true, texto: 'Gestor tentando aprovar' }).message, /essa exceção é da Diretoria/);
  ok(amb.api('s_dora', 'decidirDesconto', { id: b.id, aprovar: true, texto: 'Aprovado pela Diretoria: contrato anual' }));
  assert.equal(reg(amb, b.id).SITUACAO, 'PRONTA');
  // o desconto também não leva abaixo de 35% sem a Diretoria: 1.000 com 15% de desconto = 850 -> 850 − 121,13 − 25,50 − 400 = 35,9%; com 20%, 31,25%
  const c = proposta(amb, [item(caro)], null, { descontoGeral: '200,00' });
  assert.equal(c.salvo.politica.exigeDiretoria, true, 'desconto dentro da alçada da vendedora, mas a sobra cai abaixo de 35%');
});

test('deslocamento: fica fora da conta da sobra (nem ajuda nem atrapalha) e o desconto geral nunca reduz o item', () => {
  const amb = amb0();
  const srv = produto(amb, 'SRV-1', 'SERVICO', '1.000,00', '400,00');
  const sem = proposta(amb, [item(srv)]);
  const com = proposta(amb, [item(srv)], VIAGEM_RV);
  const it = JSON.parse(reg(amb, com.id).ITENS_JSON).find((i) => i.auto === 'DESLOCAMENTO');
  assert.equal(it.custoUnitario, 2271.25); assert.equal(it.precoUnitario, 2650, '2.271,25 ÷ (1 − 14,25%) = 2.648,69, para cima a R$ 10');
  const a1 = analise(amb, sem.id), a2 = analise(amb, com.id);
  assert.equal(a2.margemPct, a1.margemPct, 'a sobra é a mesma com e sem o item de deslocamento');
  assert.equal(a2.margemValor, a1.margemValor); assert.equal(a2.receitaItens, 1000); assert.equal(a2.receitaDeslocamento, 2650); assert.equal(a2.custoDiluido, 0);
  assert.equal(a2.comissao, 30, 'sem comissão sobre o deslocamento');
  // desconto geral de R$ 100: sai só do serviço
  ok(amb.api('s_vera', 'salvarProposta', { id: com.id, itens: [item(srv)], descontoGeral: '100,00' }));
  const a3 = analise(amb, com.id);
  assert.equal(a3.receitaDeslocamento, 2650, 'o item de deslocamento fica com o preço inteiro'); assert.equal(a3.naoRepassado, 0);
  assert.equal(a3.receitaItens, 900); assert.equal(a3.margemPct, 38.31, '900 − 128,25 − 27 − 400 = 344,75 (38,31% de 900)');
  assert.equal(reg(amb, com.id).TOTAL, 3550); assert.equal(reg(amb, com.id).DESCONTO_PCT, 10, '100 sobre os 1.000 do serviço');
  const calc = amb.ctx.ComP_calcular_(JSON.parse(reg(amb, com.id).ITENS_JSON), 100);
  assert.equal(calc.fatorItens, 0.9); assert.equal(calc.subtotalItens, 1000);
});

test('revisão: deslocamento digitado abaixo de custo + impostos sai da sobra (o vendedor não fura os 35% dentro da própria alçada)', () => {
  const amb = amb0();
  const srv = produto(amb, 'SRV-G', 'SERVICO', '10.000,00', '4.000,00');
  // sem mexer no deslocamento: 10.000 − 1.425 − 300 − 4.000 = 4.275 (42,75%); o item de deslocamento sai a 2.650
  const p = proposta(amb, [item(srv)], VIAGEM_RV);
  assert.equal(analise(amb, p.id).margemPct, 42.75);
  // deslocamento digitado a 1.150 (1.500 abaixo = 15% dos serviços, dentro do limite de 15% da vendedora)
  const s = ok(amb.api('s_vera', 'salvarProposta', { id: p.id, itens: [item(srv)], deslocamento: Object.assign({}, VIAGEM_RV, { precoInformado: '1.150,00' }) }));
  const a = analise(amb, p.id);
  assert.equal(a.naoRepassado, 1285.13, '2.271,25 − 1.150 x (1 − 14,25%)');
  assert.equal(a.margemValor, 2989.87, '4.275 − 1.285,13 que o deslocamento deixou de cobrir');
  assert.equal(a.abaixoMin, true);
  assert.equal(s.politica.exigeDiretoria, true, 'antes da revisão a sobra ficava em 42,75% e a proposta concluía direto');
  assert.equal(amb.api('s_vera', 'concluirProposta', { id: p.id }).ok, false);
  // deslocamento cobrado a mais não aumenta a sobra (repasse)
  ok(amb.api('s_vera', 'salvarProposta', { id: p.id, itens: [item(srv)], deslocamento: Object.assign({}, VIAGEM_RV, { precoInformado: '3.000,00' }) }));
  assert.equal(analise(amb, p.id).margemPct, 42.75);
});

test('viagem diluída no preço dos serviços: o custo entra na sobra e a sobra mínima tem que cobrir', () => {
  const amb = amb0();
  const srv = produto(amb, 'SRV-1', 'SERVICO', '1.000,00', '400,00');
  const d = proposta(amb, [item(srv)], Object.assign({ repasse: 'DILUIDO' }, VIAGEM_RV));
  assert.equal(JSON.parse(reg(amb, d.id).ITENS_JSON).filter((i) => i.auto).length, 0, 'diluído não cria item');
  const a = analise(amb, d.id);
  assert.equal(a.custoDiluido, 2271.25); assert.equal(a.margemValor, -1843.75, '1.000 − 142,50 − 30 − 400 − 2.271,25'); assert.equal(a.abaixoMin, true);
  assert.equal(d.salvo.politica.exigeDiretoria, true);
  const g = ok(amb.api('s_gaspar', 'proposta', { id: d.id })).proposta.deslocamento;
  assert.equal(g.diluir, 4756.54, 'quanto somar aos serviços: 2.271,25 ÷ (1 − 14,25% − 3% − 35%)');
  // com o preço dos serviços cobrindo a viagem com a sobra mínima, conclui direto
  ok(amb.api('s_vera', 'salvarProposta', { id: d.id, itens: [item(srv, '5.900,00')] }));
  assert.equal(analise(amb, d.id).abaixoMin, false);
  assert.equal(ok(amb.api('s_vera', 'concluirProposta', { id: d.id })).proposta.situacao, 'PRONTA', 'acima da tabela não é desconto e a sobra cobre a viagem');
});

test('taxa por viagem não soma mais; Incentivo de Missão só a partir de 200 km, por executante', () => {
  const amb = amb0();
  const srv = produto(amb, 'SRV-1', 'SERVICO', '9.000,00', '400,00');
  const via = (km, tec, eng) => ({ viagem: { ha: 'SIM', tecnicos: tec, engenheiros: eng || 0, destino: 'Destino de teste/GO', kmTrecho: String(km), dias: 1, noites: 0, linhas: { PEDAGIO: { nsa: true, motivo: 'Sem pedágio no trajeto' }, TAXA: { valor: '300' } } } });
  const l199 = Object.fromEntries(proposta(amb, [item(srv)], via(199, 1)).salvo.proposta.deslocamento.calculo.linhas.map((x) => [x.codigo, x]));
  assert.equal(l199.CONDUTA.total, 0); assert.equal(l199.CONDUTA.nsa, true); assert.match(l199.CONDUTA.motivo, /199 km, abaixo do mínimo de 200 km do Programa de conduta: não há Incentivo de Missão/);
  assert.equal(l199.TAXA, undefined, 'a taxa não volta nem se a tela mandar valor');
  const p200 = proposta(amb, [item(srv)], via(200, 2, 1));
  const l200 = Object.fromEntries(p200.salvo.proposta.deslocamento.calculo.linhas.map((x) => [x.codigo, x]));
  assert.equal(l200.CONDUTA.total, 900, 'R$ 300 x 3 executantes (2 técnicos e 1 engenheiro)'); assert.equal(l200.CONDUTA.nome, 'Incentivo de Missão (Programa de conduta)');
  assert.equal(p200.salvo.proposta.deslocamento.calculo.beneficio, 900);
  const soma = p200.salvo.proposta.deslocamento.calculo.linhas.reduce((t, x) => t + x.total, 0);
  assert.equal(p200.salvo.proposta.deslocamento.calculo.custo, soma, 'nenhuma linha escondida (sem a taxa de R$ 300)');
  assert.equal(p200.salvo.checklist.ok, true, 'a taxa desligada não falta no checklist');
  // o cliente nunca vê o nome do incentivo
  ok(amb.api('s_vera', 'concluirProposta', { id: p200.id }));
  const g = ok(amb.api('s_vera', 'gerarDocumento', { id: p200.id }));
  const doc = amb.arquivos[g.htmlId].bytes.toString('utf8').replace(/<style[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, ' ');
  assert.match(doc, /Despesas de deslocamento e estadia/);
  assert.doesNotMatch(doc, /incentivo|miss[ãa]o|conduta|taxa por viagem/i);
});

test('Bônus Coletivo diluído por hora: bônus x colaboradores ativos (filtro da Conduta) ÷ horas faturáveis; soma no custo da hora da ficha', () => {
  const amb = amb0();
  amb.ctx.Conduta_obterParametros_ = () => ({ VALOR_INCENTIVO_MISSAO: 300, MISSAO_KM_MINIMO: 200, VALOR_BONUS_COLETIVO: '300.0' });
  let b = amb.ctx.ComPr_bonusHora_(amb.ctx.ComPr_politica_());
  // 11 usuários ativos, menos a conta "Administrador" = 10; de campo: técnico, metrologia e o gestor da área técnica = 3 x 140 h
  assert.equal(b.valor, 300); assert.match(b.fonteValor, /Programa de conduta \(Bônus Coletivo\)/);
  assert.equal(b.colaboradores, 10); assert.equal(b.campo, 3); assert.equal(b.horas, 420); assert.equal(b.porHora, 7.14); assert.equal(b.totalMes, 3000);
  // colaborador inativo e cliente não entram (mesmo filtro do fechamento da Conduta)
  amb.tabelas.CAD_USUARIOS.push({ ID: 'u_x', USUARIO: 'xis', NOME: 'X INATIVO', PERFIL: 'TECNICO', STATUS: 'INATIVO', AREA: 'TECNICA' }, { ID: 'u_c', USUARIO: 'cli', NOME: 'CLIENTE', PERFIL: 'CLIENTE', STATUS: 'ATIVO' });
  amb.ctx.COM_PR_BONUS_MEMO = null;
  assert.equal(amb.ctx.ComPr_bonusHora_(amb.ctx.ComPr_politica_()).colaboradores, 10);
  // a Diretoria informa as horas faturáveis da equipe: 1.600 h -> 3.000 ÷ 1.600 = 1,88 por hora
  ok(amb.api('s_dora', 'metodologia', { pagina: 'PRECO', salvar: { precificacao: { bonusConduta: { horasFaturaveisMes: 1600 } } }, motivo: 'Horas faturáveis informadas pela Diretoria' }));
  const pol = amb.ctx.ComPr_politica_();
  b = amb.ctx.ComPr_bonusHora_(pol);
  assert.equal(b.horas, 1600); assert.equal(b.porHora, 1.88); assert.equal(b.provisorio, false);
  const c = amb.ctx.ComF_calcular_(amb.ctx.ComF_tabelaC1_('QT_AUTOCLAVE_GRANDE'), pol);
  assert.equal(c.bonusHora, 1.88); assert.equal(c.bonus, 35.72, '19 h x 1,88'); assert.equal(c.custo, 2715.72, '1.920 + 480 + 35,72 + 280');
  assert.match(amb.api('s_dora', 'metodologia', { pagina: 'PRECO', salvar: { precificacao: { bonusConduta: { horasFaturaveisMes: 0 } } }, motivo: 'Teste de valor inválido' }).message, /horas faturáveis da equipe por mês" precisa ficar entre 1 e/);
  // a tela da política mostra a conta (só quem vê custo)
  const t = ok(amb.api('s_dora', 'metodologia')).precificacao;
  assert.equal(t.bonus.porHora, 1.88); assert.equal(t.custoHoraComBonus.TECNICO, 91.88);
  assert.equal(ok(amb.api('s_vera', 'metodologia')).precificacao.bonus, undefined);
});

test('impostos de produto (Lucro Real) com crédito sobre o custo: Goiânia e Rio de Janeiro', () => {
  const amb = amb0();
  const pol = amb.ctx.ComPr_politica_(), go = amb.ctx.ComPr_polUnidade_(pol, 'GO'), rj = amb.ctx.ComPr_polUnidade_(pol, 'RJ');
  assert.equal(go.impostosServicoPct, 14.25); assert.equal(rj.impostosServicoPct, 14.25, 'ISS de 5% nos dois municípios (provisório)');
  assert.equal(go.impostosProdutoPct, 28.25, 'PIS 1,65 + COFINS 7,6 + ICMS 19'); assert.equal(rj.impostosProdutoPct, 31.25, 'PIS 1,65 + COFINS 7,6 + ICMS 20 + FECP 2');
  assert.equal(go.creditoProdutoPct, 21.25, 'crédito PIS/COFINS 9,25 + ICMS da compra 12'); assert.equal(rj.origemUnidade, 'Rio de Janeiro/RJ');
  // peça de custo R$ 1.000: 1.000 x (1 − 21,25%) ÷ (1 − 28,25% − 3% − 35%) = 2.333,33 -> 2.334 em GO; ÷ (1 − 31,25% − 3% − 35%) = 2.560,98 -> 2.561 no RJ
  assert.equal(amb.ctx.ComPr_precoProduto_(1000, go), 2334); assert.equal(amb.ctx.ComPr_precoProduto_(1000, rj), 2561);
  const peca = produto(amb, 'PCA-1', 'PRODUTO', '2.334,00', '1.000,00');
  const a = proposta(amb, [item(peca)]);
  const ag = analise(amb, a.id);
  assert.equal(ag.unidade, 'GO'); assert.equal(ag.impostosItens, 446.86, '2.334 x 28,25% − 1.000 x 21,25%'); assert.equal(ag.margemPct, 35.01); assert.equal(ag.abaixoMin, false);
  // a mesma peça vendida pela filial do Rio: o ICMS é maior e a sobra cai abaixo de 35%
  ok(amb.api('s_vera', 'salvarProposta', { id: a.id, itens: [item(peca)], deslocamento: { unidade: 'RJ' } }));
  const ar = analise(amb, a.id);
  assert.equal(ar.unidade, 'RJ'); assert.equal(ar.impostosItens, 516.88); assert.equal(ar.margemPct, 32.01); assert.equal(ar.abaixoMin, true);
  ok(amb.api('s_vera', 'salvarProposta', { id: a.id, itens: [item(peca, '2.561,00')], deslocamento: { unidade: 'RJ' } }));
  assert.equal(analise(amb, a.id).abaixoMin, false);
  // a tela avisa o item abaixo do piso: o vendedor vê o aviso sem o valor; a gestão vê o valor
  ok(amb.api('s_vera', 'salvarProposta', { id: a.id, itens: [item(peca, '2.400,00')], deslocamento: { unidade: 'RJ' } }));
  const tv = ok(amb.api('s_vera', 'proposta', { id: a.id })).proposta.deslocamento;
  assert.equal(tv.abaixoPiso.length, 1); assert.equal(tv.abaixoPiso[0].piso, undefined); assert.doesNotMatch(JSON.stringify(tv.abaixoPiso), /2\.561|2561/);
  const tg = ok(amb.api('s_gaspar', 'proposta', { id: a.id })).proposta.deslocamento;
  assert.equal(tg.abaixoPiso[0].piso, 2561); assert.equal(tg.abaixoPiso[0].pisoTxt, 'R$ 2.561,00');
  const rv = ok(amb.api('s_vera', 'revisarProposta', { id: a.id, comIA: false }));
  assert.ok(rv.alertas.some((x) => /abaixo do preço que garante a sobra mínima \(R\$ 2\.561,00, com os impostos de produto e os créditos da compra\)/.test(x)), rv.alertas.join(' | '));
});

test('unidade emissora: Rio de Janeiro muda a origem da distância (e o incentivo conta a partir da sede do Rio); unidade inválida diz o que fazer', () => {
  const amb = amb0();
  amb.tabelas.CAD_UNIDADES[0].CIDADE = 'Rio Verde';
  const srv = produto(amb, 'SRV-1', 'SERVICO', '9.000,00', '400,00');
  const a = proposta(amb, [item(srv)], VIAGEM_RV);
  assert.equal(JSON.parse(reg(amb, a.id).DESLOCAMENTO_JSON).viagem.origem, 'Goiânia/GO');
  let d = ok(amb.api('s_vera', 'proposta', { id: a.id })).proposta.deslocamento;
  assert.equal(d.unidade, 'GO'); assert.equal(d.sugestao.kmTrecho, 228, 'tabela de distâncias da Conduta (medida de Goiânia)');
  assert.deepEqual(d.unidades.map((u) => u.codigo), ['GO', 'RJ']);
  ok(amb.api('s_vera', 'salvarProposta', { id: a.id, itens: [item(srv)], deslocamento: { unidade: 'RJ', viagem: { kmTrecho: '150', destino: 'Volta Redonda/RJ' } } }));
  const dj = JSON.parse(reg(amb, a.id).DESLOCAMENTO_JSON);
  assert.equal(dj.unidade, 'RJ'); assert.equal(dj.viagem.origem, 'Rio de Janeiro/RJ', 'a origem padrão passa a ser a sede do Rio');
  assert.equal(dj.viagem.linhas.CONDUTA.nsa, true, '150 km a partir da sede do Rio: sem Incentivo de Missão');
  d = ok(amb.api('s_vera', 'proposta', { id: a.id })).proposta.deslocamento;
  assert.equal(d.sugestao.kmTrecho, null, 'a tabela da Conduta (medida de Goiânia) não vale para o Rio'); assert.equal(d.referencias.length, 0);
  assert.equal(d.politica.origemPadrao, 'Rio de Janeiro/RJ');
  const r = amb.api('s_vera', 'salvarProposta', { id: a.id, itens: [item(srv)], deslocamento: { unidade: 'SP' } });
  assert.equal(r.ok, false); assert.match(r.message, /a unidade emissora "SP" não existe\. Escolha Matriz Goiânia\/GO ou Filial Rio de Janeiro\/RJ/);
});

test('proposta antiga preservada: sem unidade conta como Goiânia; a taxa por viagem gravada continua aparecendo com o valor gravado', () => {
  const amb = amb0();
  const srv = produto(amb, 'SRV-1', 'SERVICO', '9.000,00', '400,00');
  const a = proposta(amb, [item(srv)], VIAGEM_RV);
  ok(amb.api('s_vera', 'concluirProposta', { id: a.id }));
  // como as propostas gravadas antes de 01/11/2026: sem unidade e com a taxa de R$ 300 na conta
  const r = reg(amb, a.id), dj = JSON.parse(r.DESLOCAMENTO_JSON);
  delete dj.unidade; dj.viagem.linhas.TAXA = { valor: 300, nsa: false, motivo: '', auto: false, fonte: 'POLITICA' }; r.DESLOCAMENTO_JSON = JSON.stringify(dj);
  const itensAntes = r.ITENS_JSON, fotoAntes = r.PRECIFICACAO_JSON;
  const t = ok(amb.api('s_gaspar', 'proposta', { id: a.id })).proposta.deslocamento;
  assert.equal(t.unidade, 'GO'); assert.equal(t.analise.unidade, 'GO');
  const tx = t.calculo.linhas.find((x) => x.codigo === 'TAXA');
  assert.ok(tx, 'a linha gravada aparece'); assert.equal(tx.total, 300); assert.equal(tx.nome, 'Taxa por viagem (proposta anterior a 01/11/2026)');
  assert.ok(t.linhas.some((L) => L.codigo === 'TAXA'));
  assert.equal(t.calculo.custo, 2571.25, '2.271,25 + a taxa gravada');
  assert.equal(r.ITENS_JSON, itensAntes, 'abrir a proposta não muda os itens'); assert.equal(r.PRECIFICACAO_JSON, fotoAntes);
});

test('preço do serviço = o maior entre a tabela C1, a planilha de 30/10 com imposto por fora e a conta com a sobra de 35%', () => {
  const amb = amb0();
  const pol = amb.ctx.ComPr_politica_(), c = (cod) => amb.ctx.ComF_calcular_(amb.ctx.ComF_tabelaC1_(cod), pol);
  const bis = c('CAL_BISTURI');
  assert.equal(bis.fonte, 'TABELA'); assert.equal(bis.precoSugerido, 480); assert.ok(bis.candidatos.conta < 480);
  const mp = c('MP_CAMARA');
  assert.equal(mp.fonte, 'PLANILHA'); assert.equal(mp.candidatos.planilha, 1110, '950 ÷ 0,8575 = 1.107,87 -> 1.110'); assert.equal(mp.precoSugerido, 1110);
  const ac = c('QT_AUTOCLAVE_GRANDE');
  assert.equal(ac.fonte, 'CONTA'); assert.equal(ac.precoSugerido, ac.candidatos.conta); assert.ok(ac.precoSugerido > ac.candidatos.tabela);
  // a sobra no preço sugerido nunca fica abaixo de 35%
  for (const s of amb.ctx.COM_TABELA_C1.servicos) {
    const x = amb.ctx.ComF_calcular_(s, pol), sobra = x.precoSugerido * (1 - 0.1425 - 0.03) - x.custo;
    assert.ok(sobra / x.precoSugerido >= 0.35 - 1e-9, s.codigo + ' sobra ' + (sobra / x.precoSugerido));
  }
  // o preço atual do catálogo também entra: nunca desce
  const alto = amb.ctx.ComF_calcular_(Object.assign({}, amb.ctx.ComF_tabelaC1_('CAL_ECG'), { precoAtual: 999 }), pol);
  assert.equal(alto.precoSugerido, 999); assert.equal(alto.fonte, 'ATUAL');
});

test('aplicar a decisão na produção: política como versão nova, campo a campo (o que a Diretoria gravou de diferente fica); prévia e marca', () => {
  const amb = amb0({ tabelas: { COM_CONFIG: [{ ID: 'cfgV', CHAVE: 'METODOLOGIA', VERSAO: 4, ATUALIZADO_POR_NOME: 'DORA', ATUALIZADO_EM: '2026-11-01T09:00', VALOR_JSON: JSON.stringify({
    politica: { descontoMaxPct: 12, margemMinPct: 10 },
    precificacao: { margemMinPct: 10, margemAlvoPct: 20, impostosPct: 14.25, comissaoPct: 4, custoHora: { TECNICO: 45, ENGENHEIRO: 132 }, taxaViagem: { valor: 300, rotulo: 'Taxa por viagem (fora da Grande Goiânia)', kmMinimo: 60 }, valorKm: 2.5, custoFixoPct: 30 }
  }) }] } });
  assert.equal(amb.ctx.ComPr_politica_().margemMinPct, 10, 'a versão gravada vence o padrão do código');
  assert.match(amb.api('s_gaspar', 'decisaoDonoPolitica', {}).message, /é da Diretoria \(ou do Administrador\)/);
  const pv = ok(amb.api('s_dora', 'decisaoDonoPolitica', {}));
  const l = Object.fromEntries(pv.linhas.map((x) => [x.chave, x]));
  assert.equal(pv.versaoAtual, 4);
  for (const k of ['margemMinPct', 'margemAlvoPct', 'impostosPct', 'custoHoraTecnico', 'taxaViagemValor', 'taxaViagemRotulo', 'unidades', 'unidadePadrao', 'bonusConduta', 'texto']) assert.equal(l[k].acao, 'APLICAR', k + ': ' + l[k].motivo);
  assert.equal(l.custoHoraEngenheiro.acao, 'IGUAL'); assert.equal(l.valorKm.acao, 'IGUAL');
  assert.match(l.margemMinPct.motivo, /valor inicial da C1/);
  assert.equal(amb.tabelas.COM_CONFIG.length, 1, 'a prévia não grava nada');
  assert.match(amb.api('s_dora', 'decisaoDonoPolitica', { aplicar: true, marca: 'outra' }).message, /a política mudou desde a prévia/);
  const ap = ok(amb.api('s_dora', 'decisaoDonoPolitica', { aplicar: true, marca: pv.marca }));
  assert.equal(ap.versao, 5); assert.match(ap.message, /Política gravada na versão 5/);
  const v5 = amb.tabelas.COM_CONFIG.find((c) => c.VERSAO === 5);
  assert.match(v5.MOTIVO, /^Decisão do dono 01\/11\/2026: sobra mínima 35%, valores maiores, incentivos, impostos por unidade/);
  const g = JSON.parse(v5.VALOR_JSON);
  assert.equal(g.precificacao.margemMinPct, 35); assert.equal(g.politica.margemMinPct, 35); assert.equal(g.precificacao.impostosPct, null); assert.equal(g.precificacao.taxaViagem.valor, 0);
  assert.equal(g.precificacao.comissaoPct, 4, 'o que não é da decisão fica como estava'); assert.equal(g.precificacao.custoFixoPct, 30); assert.equal(g.politica.descontoMaxPct, 12);
  const pol = amb.ctx.ComPr_politica_();
  assert.equal(pol.margemMinPct, 35); assert.equal(pol.margemAlvoPct, 40); assert.equal(pol.impostosPct, 14.25); assert.equal(pol.custoHora.TECNICO, 90); assert.equal(pol.taxaViagem.valor, 0);
  // de novo: nada a aplicar
  const pv2 = ok(amb.api('s_dora', 'decisaoDonoPolitica', {}));
  assert.equal(pv2.aplicar, 0);
  // valores da Diretoria diferentes do valor inicial ficam (e aparecem como conflito); abaixo do decidido pelo dono são trocados
  const amb2 = amb0({ tabelas: { COM_CONFIG: [{ ID: 'cfgD', CHAVE: 'METODOLOGIA', VERSAO: 2, VALOR_JSON: JSON.stringify({ precificacao: { margemMinPct: 38, margemAlvoPct: 45, custoHora: { TECNICO: 100, ENGENHEIRO: 120 }, impostosPct: 16 } }) }] } });
  const p2 = ok(amb2.api('s_dora', 'decisaoDonoPolitica', {}));
  const l2 = Object.fromEntries(p2.linhas.map((x) => [x.chave, x]));
  assert.equal(l2.margemMinPct.acao, 'MANTER'); assert.equal(l2.margemAlvoPct.acao, 'MANTER'); assert.equal(l2.custoHoraTecnico.acao, 'MANTER'); assert.equal(l2.impostosPct.acao, 'MANTER');
  assert.equal(l2.custoHoraEngenheiro.acao, 'APLICAR', 'R$ 120 é menor que os R$ 132 (valor maior)');
  assert.equal(p2.conflitos, 4);
  const p3 = ok(amb2.api('s_dora', 'decisaoDonoPolitica', { forcar: ['margemAlvoPct'] }));
  assert.equal(p3.linhas.find((x) => x.chave === 'margemAlvoPct').acao, 'APLICAR');
  const amb3 = amb0({ tabelas: { COM_CONFIG: [{ ID: 'cfgE', CHAVE: 'METODOLOGIA', VERSAO: 2, VALOR_JSON: JSON.stringify({ precificacao: { margemMinPct: 15 } }) }] } });
  assert.equal(ok(amb3.api('s_dora', 'decisaoDonoPolitica', {})).linhas.find((x) => x.chave === 'margemMinPct').acao, 'APLICAR', '15% contraria o mínimo de 35% do dono');
});

test('aplicar a decisão nos preços: só sobe, lote de reajuste com histórico e "desfazer o último reajuste"; função para o servidor sem tela', () => {
  const amb = amb0({ tabelas: { COM_CONFIG: [{ ID: 'cfgV', CHAVE: 'METODOLOGIA', VERSAO: 2, VALOR_JSON: JSON.stringify({ precificacao: { margemMinPct: 10, margemAlvoPct: 20, custoHora: { TECNICO: 45, ENGENHEIRO: 132 } } }) }] } });
  // catálogo importado antes da decisão (margens da C1) e uma peça com custo
  const pvI = ok(amb.api('s_dora', 'importarC1Previa')); ok(amb.api('s_dora', 'importarC1', { marca: pvI.marca, escolhas: {} }));
  const ac = prodCod(amb, 'QT-AUTOCLAVE-GRANDE'), antes = ac.PRECO;
  assert.ok(antes >= 3020 && antes < 5900, 'preço da importação antes da decisão: ' + antes);
  produto(amb, 'PCA-9', 'PRODUTO', '1.500,00', '1.000,00');
  // a política da decisão
  const pp = ok(amb.api('s_dora', 'decisaoDonoPolitica', {}));
  ok(amb.api('s_dora', 'decisaoDonoPolitica', { aplicar: true, marca: pp.marca }));
  assert.match(amb.api('s_gaspar', 'decisaoDonoPrecos', {}).message, /é da Diretoria/);
  const pv = ok(amb.api('s_dora', 'decisaoDonoPrecos', {}));
  // 01/11/2026 (catálogo oficial): alta acima de 100% (ou custo cadastrado maior que o preço) fica fora, como suspeito
  assert.ok(pv.qtd + pv.qtdSuspeitos >= 35, 'os serviços sobem: ' + pv.qtd + ' + suspeitos ' + pv.qtdSuspeitos); assert.equal(pv.semPreco, 0);
  assert.ok(pv.suspeitos.every((x) => /acima do limite de 100%|custo cadastrado/.test(x.motivo) && /corrigir o custo antes/.test(x.oQueFazer)));
  assert.ok(pv.linhas.every((x) => x.precoNovo > x.precoAtual), 'só sobe');
  const la = pv.linhas.find((x) => x.codigo === 'QT-AUTOCLAVE-GRANDE');
  assert.equal(la.precoAtual, antes); assert.equal(la.precoNovo, 5900, 'com o bônus de R$ 7,14 por hora do cadastro de teste');
  const lp = pv.linhas.find((x) => x.codigo === 'PCA-9');
  assert.equal(lp.precoNovo, 2334); assert.match(lp.fonte, /peça pela conta com a sobra mínima/);
  assert.equal(prodCod(amb, 'QT-AUTOCLAVE-GRANDE').PRECO, antes, 'a prévia não grava nada');
  assert.match(amb.api('s_dora', 'decisaoDonoPrecos', { aplicar: true, marca: 'outra' }).message, /o catálogo ou a política mudou desde a prévia/);
  const ap = ok(amb.api('s_dora', 'decisaoDonoPrecos', { aplicar: true, marca: pv.marca }));
  assert.equal(ap.qtd, pv.qtd); assert.match(ap.message, /Desfazer o último reajuste/);
  assert.equal(prodCod(amb, 'QT-AUTOCLAVE-GRANDE').PRECO, 5900); assert.equal(prodCod(amb, 'PCA-9').PRECO, 2334);
  const rj = amb.tabelas.COM_REAJUSTES.filter((x) => x.LOTE === ap.lote);
  assert.equal(rj.length, pv.qtd); assert.ok(rj.every((x) => x.SITUACAO === 'APLICADO' && x.PRECO_NOVO > x.PRECO_ANTERIOR && /Decisão do dono 01\/11\/2026/.test(x.MOTIVO)));
  assert.equal(ok(amb.api('s_dora', 'decisaoDonoPrecos', {})).qtd, 0, 'de novo: nada a subir');
  // desfazer o último reajuste devolve os preços
  ok(amb.api('s_dora', 'reajusteDesfazer', { lote: ap.lote, motivo: 'Teste: desfazer os preços da decisão' }));
  assert.equal(prodCod(amb, 'QT-AUTOCLAVE-GRANDE').PRECO, antes); assert.equal(prodCod(amb, 'PCA-9').PRECO, 1500);
  // a função para rodar no servidor (origem "editor"): prévia por padrão; aplicar com a marca
  const f = amb.ctx.Comercial_decisaoDono20261101({ etapa: 'PRECOS' });
  assert.equal(f.ok, true); assert.equal(f.aplicado, false); assert.equal(f.qtd, pv.qtd);
  const f2 = amb.ctx.Comercial_decisaoDono20261101({ etapa: 'PRECOS', aplicar: true, marca: f.marca });
  assert.equal(f2.ok, true); assert.equal(f2.aplicado, true); assert.equal(prodCod(amb, 'QT-AUTOCLAVE-GRANDE').PRECO, 5900);
  assert.equal(amb.ctx.Comercial_decisaoDono20261101({ etapa: 'POLITICA' }).aplicar, 0);
  assert.equal(amb.ctx.Comercial_decisaoDono20261101({ etapa: 'PRECOS', aplicar: true, marca: 'velha' }).ok, false);
});

test('gestora e especialista usam os números da política (35% e 40%), nunca da IA; documentação no mesmo pacote', () => {
  const fs = require('node:fs'), path = require('node:path');
  const amb = amb0();
  const t = amb.ctx.ComG_metodologiaTexto_(amb.ctx.Com_metodologia_());
  assert.match(t, /sobra mínima 35,0% e margem alvo 40,0%/); assert.doesNotMatch(t, /margem mínima 10|margem alvo 20/);
  const raiz = path.join(__dirname, '..');
  const manual = fs.readFileSync(path.join(raiz, 'docs/MANUAL_MODULO_COMERCIAL.md'), 'utf8');
  for (const r of [/sobra mínima de 35%/i, /antes de IR e CSLL/, /Incentivo de Missão/, /Bônus Coletivo/, /Rio de Janeiro/, /CBS/]) assert.match(manual, r);
  const ajuda = fs.readFileSync(path.join(raiz, 'apps-script-imports/portal_sgo_versao_cnpj_db/SGO_Ajuda_Comercial.js'), 'utf8');
  for (const r of [/sobra mínima de 35%/i, /unidade que emite a nota/i, /Incentivo de Missão/]) assert.match(ajuda, r);
  const base = fs.readFileSync(path.join(raiz, 'apps-script-imports/portal_sgo_versao_cnpj_db/SGO_AssistenteManuais.js'), 'utf8');
  assert.match(base, /antes de IR e CSLL/);
  const dono = fs.readFileSync(path.join(raiz, 'docs/COMERCIAL_MATERIAL_DO_DONO_20261101.md'), 'utf8');
  assert.match(dono, /Decidido pelo dono em 01\/11\/2026/);
  const prec = fs.readFileSync(path.join(raiz, 'apps-script-imports/portal_sgo_versao_cnpj_db/SGO_Comercial_Precificacao.js'), 'utf8');
  assert.match(prec, /01\/11\/2026 — DECISÃO DO DONO/);
});
