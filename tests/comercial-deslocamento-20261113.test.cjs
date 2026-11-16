// Repasse do deslocamento (13/11/2026, caso PROP-2026-0071, RIO MED, vendedor Ricardo). Diagnóstico: no modo "Diluído no preço dos
// serviços" o sistema tirava a linha "Despesas de deslocamento e estadia" e não punha o valor em lugar nenhum: o total caía de
// R$ 26.580 para R$ 21.400 (o cliente via um "desconto" de R$ 5.180), o custo da viagem saía da sobra (45,71% -> 24,99%, Diretoria)
// e a tela pedia para subir os serviços à mão em custo ÷ (1 − 14,25% − 3% − 35%) = R$ 12.971,73 (a conta "ao inverso").
// Regra do dono: nos dois modos o cliente paga no mínimo o custo da viagem mais impostos, sem margem e sem desconto, fora da sobra;
// trocar o modo nunca baixa o total nem cria desconto. Agora os dois modos cobram o mesmo valor; o diluído só distribui esse valor
// no preço dos serviços que o cliente vê (documento A4 e link). Código real num contexto isolado; só dados de teste (fictícios).
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ambiente, oportunidadeDeTeste } = require('./_comercial_ambiente.cjs');

const LEGADO = path.join(__dirname, '../apps-script-imports/portal_sgo_versao_cnpj_db');
const ok = (r) => { assert.equal(r.ok, true, r.message); return r; };
const reg = (amb, id) => amb.tabelas.COM_PROPOSTAS.find((x) => x.ID === id);
const itensDe = (amb, id) => JSON.parse(reg(amb, id).ITENS_JSON);
const tela = (amb, id, sid) => ok(amb.api(sid || 's_gaspar', 'proposta', { id })).proposta;
const r2 = (v) => Math.round(v * 100) / 100;

function amb0() {
  const amb = ambiente();
  amb.ctx.CONDUTA_SHEETS = { DISTANCIA_REFERENCIA: 'qual_distancia_referencia' };
  amb.ctx.Conduta_obterParametros_ = () => ({ VALOR_INCENTIVO_MISSAO: 300, MISSAO_KM_MINIMO: 200 });
  return amb;
}
function produto(amb, codigo, nome, preco, custo) {
  ok(amb.api('s_gaspar', 'salvarProduto', { codigo, nome, tipo: 'SERVICO', preco, custo }));
  return amb.tabelas.COM_PRODUTOS.find((p) => p.CODIGO === codigo);
}
// 13/11/2026 (dono: "não pagamos diárias a colaboradores"): a diária de R$ 220 continua digitada na fixture e não entra na conta.
// Como está a PROP-2026-0071 (dados de teste equivalentes): unidade emissora Goiânia (impostos de serviço 14,25%), equipe saindo do
// Rio de Janeiro para Angra dos Reis, 139 km só a ida, 1 técnico, veículo da empresa, 1 viagem de 8 dias e 8 noites.
const VIAGEM_RM = (extra) => Object.assign({ unidade: 'GO', viagem: { ha: 'SIM', tecnicos: 1, engenheiros: 0, transporte: 'VEICULO_EMPRESA', origem: 'Rio de Janeiro/RJ', destino: 'Angra dos Reis/RJ',
  kmTrecho: '139', kmFonte: 'DIGITADO', kmConfirmado: true, viagens: 1, dias: 8, noites: 8,
  linhas: { KM: { valor: '3' }, PEDAGIO: { valor: '50' }, ALIMENTACAO: { valor: '100' }, DIARIA: { valorTecnico: '220' }, HOSPEDAGEM: { valor: '230' },
    COMBUSTIVEL: { valor: '250' }, HORAS: { valorTecnico: '220', horas: '3' } } } }, extra || {});
function propostaRM(amb, repasse, extra) {
  const auto = produto(amb, 'QUA-AUT-T', 'Autoclave hospitalar a vapor (teste): pacote QI, QO e QD', '4.500,00', '2.756,95');
  const termo = produto(amb, 'QUA-TER-T', 'Termodesinfectora (teste): pacote QI, QO e QD', '4.800,00', '1.758,60');
  const sec = produto(amb, 'QT-SEC-T', 'Qualificação de secadora (teste)', '1.200,00', '653,22');
  const { oportunidade } = oportunidadeDeTeste(amb);
  const id = ok(amb.api('s_vera', 'novaProposta', { oportunidadeId: oportunidade.id })).proposta.id;
  const itens = [{ produtoId: auto.ID, descricao: auto.NOME, quantidade: 2, precoUnitario: '4.500,00' },
    // avulso sem custo, como a lavadora ultrassônica da PROP-2026-0071
    { descricao: 'Qualificação lavadora ultrassônica (QI, QO e QD) (teste)', quantidade: 2, precoUnitario: '3.000,00' },
    { produtoId: termo.ID, descricao: termo.NOME, quantidade: 1, precoUnitario: '5.200,00' },
    { produtoId: sec.ID, descricao: sec.NOME, quantidade: 1, precoUnitario: '1.200,00' }];
  const salvo = ok(amb.api('s_vera', 'salvarProposta', Object.assign({ id, escopo: 'Qualificação térmica com relatório ao final.', itens, deslocamento: VIAGEM_RM({ repasse }),
    condicoes: { pagamento: 'Boleto em 28 dias', garantia: '90 dias' } }, extra || {})));
  return { id, itens, salvo };
}
const trocar = (amb, id, itens, repasse, extra) => ok(amb.api('s_vera', 'salvarProposta', Object.assign({ id, itens, deslocamento: { repasse } }, extra || {})));
const analise = (amb, id) => amb.ctx.ComPr_daProposta_(reg(amb, id), null).analise;
const a4 = (amb, id) => amb.ctx.ComDoc_propostaHtml_(reg(amb, id), {}, 'TESTE');

test('1. PROP-2026-0071 (Rio Med) com item separado: custo R$ 4.434, item R$ 5.180, total R$ 26.580; sobra sem a viagem; histórico sem "item avulso" do automático', () => {
  const amb = amb0();
  const { id } = propostaRM(amb, 'ITEM');
  const d = tela(amb, id).deslocamento;
  const l = Object.fromEntries(d.calculo.linhas.map((x) => [x.codigo, x]));
  assert.equal(l.KM.quantidadeTxt, '278 km (139 km x 2)'); assert.equal(l.KM.total, 834);
  assert.equal(l.PEDAGIO.total, 50); assert.equal(l.ALIMENTACAO.quantidadeTxt, '1 pessoa x 8 dias'); assert.equal(l.ALIMENTACAO.total, 800);
  assert.equal(l.DIARIA.nsa, true); assert.equal(l.DIARIA.total, 0, '13/11/2026: a diária digitada (R$ 220 x 8 dias) não entra: a empresa não paga diária'); assert.equal(l.HOSPEDAGEM.total, 1840); assert.equal(l.COMBUSTIVEL.total, 250); assert.equal(l.HORAS.total, 660);
  assert.equal(l.CONDUTA.nsa, true, '139 km: abaixo do mínimo da Conduta');
  assert.equal(d.calculo.custo, 4434);
  const auto = itensDe(amb, id).filter((i) => i.auto);
  assert.equal(auto.length, 1); assert.equal(auto[0].precoUnitario, 5180, '4.434 ÷ (1 − 14,25%) = 5.170,85, para cima a R$ 10'); assert.equal(auto[0].diluido, undefined);
  const p = reg(amb, id);
  assert.equal(p.TOTAL, 26580); assert.equal(p.SUBTOTAL, 26580); assert.equal(Number(p.DESCONTO_PCT), 0);
  const a = analise(amb, id);
  assert.equal(a.receitaItens, 21400); assert.equal(a.impostosItens, 3049.5); assert.equal(a.comissao, 642); assert.equal(a.custoItens, 7925.72);
  assert.equal(a.margemValor, 9782.78); assert.equal(a.margemPct, 45.71); assert.equal(a.custoDiluido, 0); assert.equal(a.receitaDeslocamento, 5180);
  assert.equal(d.repasseResumo.modo, 'ITEM');
  assert.equal(d.repasseResumo.texto, 'Custo da viagem R$ 4.434,00 + impostos R$ 738,15 (14,25% sobre o valor cobrado) + arredondamento R$ 7,85 = R$ 5.180,00 na linha "Despesas de deslocamento e estadia". Total ao cliente: R$ 26.580,00 (serviços e produtos R$ 21.400,00 + R$ 5.180,00). Sem margem, sem comissão e sem desconto: fica fora da conta da sobra.');
  // o histórico não chama o item automático de "avulso" (antes: "5 itens ... 1 item avulso" com 2 avulsos de verdade = 0 aqui no catálogo de teste)
  const h = amb.tabelas.COM_HISTORICO.filter((x) => x.ENTIDADE_ID === id && x.TIPO === 'RASCUNHO').pop();
  assert.match(h.TEXTO, /^4 itens \+ despesas de deslocamento e estadia R\$ 5\.180,00 \(item separado\); total R\$ 26\.580,00; desconto 0,0%\./);
  assert.match(h.TEXTO, /1 item avulso \(fora do catálogo\)/, 'só a lavadora ultrassônica é avulsa');
  // A4 do item separado: a linha aparece com quantidade 1 vb
  const html = a4(amb, id);
  assert.match(html, /Despesas de deslocamento e estadia/); assert.match(html, /R\$ 5\.180,00/); assert.match(html, /R\$ 26\.580,00/);
});

test('2. trocar para "Diluído" não muda total, desconto, sobra nem aprovação; o valor vai para o preço dos serviços no A4 e no link (quantidades fecham)', () => {
  const amb = amb0();
  const { id, itens, salvo } = propostaRM(amb, 'ITEM');
  const antes = { p: Object.assign({}, reg(amb, id)), a: analise(amb, id), pol: salvo.politica };
  const s2 = trocar(amb, id, itens, 'DILUIDO');
  const p = reg(amb, id), a = analise(amb, id);
  for (const k of ['SUBTOTAL', 'TOTAL', 'DESCONTO_GERAL', 'DESCONTO_PCT', 'MARGEM_PCT', 'CUSTO_TOTAL']) assert.equal(String(p[k]), String(antes.p[k]), k + ' igual nos dois modos');
  for (const k of ['margemValor', 'margemPct', 'abaixoMin', 'receitaItens', 'impostos', 'comissao', 'custoTotal']) assert.equal(a[k], antes.a[k], k + ' igual nos dois modos');
  assert.equal(a.custoDiluido, 0, 'a viagem continua fora da sobra (antes: 4.434 dentro, sobra de 24,99%)');
  assert.deepEqual([...s2.politica.motivos], [...antes.pol.motivos], 'mesmo motivo de aprovação (só o item sem custo)');
  assert.equal(s2.politica.exigeDiretoria, antes.pol.exigeDiretoria);
  // por dentro: o mesmo item, marcado diluído, e a parte de cada serviço
  const its = itensDe(amb, id), auto = its.find((i) => i.auto);
  assert.equal(auto.diluido, true); assert.equal(auto.precoUnitario, 5180); assert.equal(auto.valorRepasse, 5180);
  assert.deepEqual(its.filter((i) => !i.auto).map((i) => i.acrescimoRepasse), [1089.26, 726.17, 1258.67, 290.47]);
  assert.deepEqual(its.filter((i) => !i.auto).map((i) => i.precoUnitario), [4500, 3000, 5200, 1200], 'o preço digitado não muda');
  // o que o cliente vê
  const cli = amb.ctx.ComPr_itensCliente_(its);
  assert.equal(cli.length, 4, 'sem a linha de deslocamento');
  assert.deepEqual(cli.map((i) => [i.quantidade, i.precoUnitario]), [[2, 5589.26], [2, 3726.17], [1, 6458.67], [1, 1490.47]]);
  assert.equal(r2(cli.reduce((s, i) => s + i.quantidade * i.precoUnitario, 0)), 26580, 'quantidade x preço unitário fecha com o total gravado');
  const html = a4(amb, id);
  assert.ok(!/Despesas de deslocamento e estadia/.test(html), 'o A4 diluído não tem a linha');
  for (const t of ['R$ 5.589,26', 'R$ 11.178,52', 'R$ 3.726,17', 'R$ 7.452,34', 'R$ 6.458,67', 'R$ 1.490,47', 'R$ 26.580,00']) assert.ok(html.includes(t), 'A4 com ' + t);
  // o link de assinatura usa a mesma lista
  const src = fs.readFileSync(path.join(LEGADO, 'SGO_Comercial_Propostas.js'), 'utf8');
  const iVer = src.indexOf('function ComP_assinaturaVer_(');
  assert.ok(iVer > 0 && src.slice(iVer, iVer + 2500).includes('ComPr_itensCliente_(Com_json_(p.ITENS_JSON, []))'), 'o link de assinatura usa os itens como o cliente vê');
  // a tela explica a conta nos dois modos
  const d = tela(amb, id).deslocamento;
  assert.equal(d.precoRepasse, 5180, 'o valor calculado aparece também no diluído');
  assert.equal(d.diluir, 0, 'nada a "subir à mão"');
  assert.equal(d.repasseResumo.modo, 'DILUIDO');
  assert.equal(d.repasseResumo.texto, 'Custo da viagem R$ 4.434,00 + impostos R$ 738,15 (14,25% sobre o valor cobrado) + arredondamento R$ 7,85 = R$ 5.180,00 distribuídos no preço dos serviços: o cliente não vê a linha de deslocamento, cada serviço aparece com a sua parte. Total ao cliente: R$ 26.580,00, o mesmo do item separado. Sem margem, sem comissão e sem desconto: fica fora da conta da sobra.');
  assert.deepEqual(d.repasseResumo.diluicao.map((x) => x.clienteTxt), ['R$ 5.589,26', 'R$ 3.726,17', 'R$ 6.458,67', 'R$ 1.490,47']);
  const h = amb.tabelas.COM_HISTORICO.filter((x) => x.ENTIDADE_ID === id && x.TIPO === 'RASCUNHO').pop();
  assert.match(h.TEXTO, /^4 itens \+ despesas de deslocamento e estadia R\$ 5\.180,00 \(diluído nos serviços\); total R\$ 26\.580,00/);
  // voltar para item separado devolve a linha e tira a parte dos serviços
  trocar(amb, id, itens, 'ITEM');
  const its2 = itensDe(amb, id);
  assert.equal(its2.find((i) => i.auto).diluido, undefined); assert.ok(its2.every((i) => i.acrescimoRepasse === undefined));
  assert.equal(reg(amb, id).TOTAL, 26580);
});

test('3. "não se aplica" (horas e combustível) e várias viagens: o custo muda e os dois modos continuam com o mesmo total', () => {
  const amb = amb0();
  const { id, itens } = propostaRM(amb, 'ITEM');
  // "não se aplica" com o motivo: 4.434 − 660 − 250 = 3.524 -> 3.524 ÷ 0,8575 = 4.109,62 -> R$ 4.110
  const nsa = VIAGEM_RM(); nsa.viagem.linhas.HORAS = { nsa: true, motivo: 'Técnico já está no Rio de Janeiro' }; nsa.viagem.linhas.COMBUSTIVEL = { nsa: true, motivo: 'Veículo da empresa: o km cobre o combustível' };
  ok(amb.api('s_vera', 'salvarProposta', { id, itens, deslocamento: Object.assign(nsa, { repasse: 'ITEM' }) }));
  assert.equal(tela(amb, id).deslocamento.calculo.custo, 3524); assert.equal(reg(amb, id).TOTAL, 21400 + 4110);
  trocar(amb, id, itens, 'DILUIDO');
  assert.equal(reg(amb, id).TOTAL, 25510);
  assert.equal(r2(amb.ctx.ComPr_itensCliente_(itensDe(amb, id)).reduce((s, i) => s + i.quantidade * i.precoUnitario, 0)), 25510);
  // 2 viagens: km 556 x 3 = 1.668; pedágio 100; alimentação 1.600; diária 3.520; hotel 3.680; combustível 500; horas 1.320 = 8.868 -> R$ 14.450
  const duas = VIAGEM_RM({ repasse: 'DILUIDO' }); duas.viagem.viagens = 2;
  duas.viagem.linhas.HORAS.nsa = false; duas.viagem.linhas.COMBUSTIVEL.nsa = false; // desmarca o "não se aplica" anterior
  ok(amb.api('s_vera', 'salvarProposta', { id, itens, deslocamento: duas }));
  const d = tela(amb, id).deslocamento, l = Object.fromEntries(d.calculo.linhas.map((x) => [x.codigo, x]));
  assert.equal(l.KM.quantidadeTxt, '556 km (139 km x 2 x 2 viagens)'); assert.equal(l.HORAS.total, 1320);
  assert.equal(d.calculo.custo, 8868);
  assert.equal(reg(amb, id).TOTAL, 21400 + 10350);
  trocar(amb, id, itens, 'ITEM');
  assert.equal(reg(amb, id).TOTAL, 21400 + 10350);
});

test('4. garantia: em várias combinações, trocar o modo nunca baixa o total, nunca cria desconto e o cliente paga pelo menos custo + impostos', () => {
  const amb = amb0();
  const { id } = propostaRM(amb, 'ITEM');
  const imp = 14.25;
  const casos = [
    { itens: [{ descricao: 'Serviço de teste A', quantidade: 3, precoUnitario: '1.333,33' }, { descricao: 'Serviço de teste B', quantidade: 7, precoUnitario: '99,99' }], viagens: 1, km: '139' },
    { itens: [{ descricao: 'Serviço de teste C', quantidade: 4, precoUnitario: '250,00' }], viagens: 3, km: '57' },
    { itens: [{ descricao: 'Serviço de teste D', quantidade: 1, precoUnitario: '9.000,00' }, { descricao: 'Serviço de teste E', quantidade: 2, precoUnitario: '0,01' }], viagens: 2, km: '410' },
    { itens: [{ descricao: 'Serviço de teste F', quantidade: 6, precoUnitario: '777,77' }], viagens: 1, km: '139', descontoGeral: '300,00' }
  ];
  for (const c of casos) {
    const dv = (rep) => { const x = VIAGEM_RM({ repasse: rep }); x.viagem.viagens = c.viagens; x.viagem.kmTrecho = c.km; return x; };
    ok(amb.api('s_vera', 'salvarProposta', { id, itens: c.itens, deslocamento: dv('ITEM'), descontoGeral: c.descontoGeral || '0' }));
    const pi = Object.assign({}, reg(amb, id)), custo = tela(amb, id).deslocamento.calculo.custo;
    ok(amb.api('s_vera', 'salvarProposta', { id, itens: c.itens, deslocamento: dv('DILUIDO'), descontoGeral: c.descontoGeral || '0' }));
    const pd = reg(amb, id), its = itensDe(amb, id);
    assert.ok(pd.TOTAL >= pi.TOTAL - 0.001, 'diluído nunca abaixo do item: ' + pd.TOTAL + ' x ' + pi.TOTAL);
    assert.ok(pd.TOTAL - pi.TOTAL < 0.2, 'no máximo centavos de arredondamento: ' + pd.TOTAL + ' x ' + pi.TOTAL);
    assert.equal(Number(pd.DESCONTO_PCT), Number(pi.DESCONTO_PCT), 'trocar o modo não cria desconto');
    const servicos = its.filter((i) => !i.auto).reduce((s, i) => s + i.quantidade * i.precoUnitario, 0) - (Number(pd.DESCONTO_GERAL) || 0);
    assert.ok(pd.TOTAL - servicos >= custo / (1 - imp / 100) - 0.01, 'o cliente paga a viagem com os impostos');
    const cli = amb.ctx.ComPr_itensCliente_(its);
    assert.equal(r2(cli.reduce((s, i) => s + i.quantidade * i.precoUnitario, 0)), r2(Number(pd.SUBTOTAL)), 'A4: linhas fecham com o subtotal');
    assert.ok(!cli.some((i) => i.auto), 'nenhuma linha automática no A4 diluído');
    if (c.descontoGeral) assert.ok(a4(amb, id).includes('- R$ 300,00'), 'o desconto aparece igual no A4');
  }
});

test('5. sem serviço com preço para receber o valor: a linha volta a aparecer, com aviso; proposta diluída antiga continua lendo como gravou', () => {
  const amb = amb0();
  const its = [{ descricao: 'Item sem preço', tipo: 'SERVICO', quantidade: 1, precoUnitario: 0 }, { auto: 'DESLOCAMENTO', descricao: 'Despesas de deslocamento e estadia', quantidade: 1, precoUnitario: 900, diluido: true, valorRepasse: 900 }];
  const r = amb.ctx.ComPr_aplicarDiluicao_(its);
  assert.deepEqual([...r.semDestino], ['deslocamento']);
  assert.equal(its[1].diluido, false); assert.equal(its[1].semDestino, true); assert.equal(its[1].precoUnitario, 900);
  assert.equal(amb.ctx.ComPr_itensCliente_(its).length, 2, 'sem destino, a linha aparece ao cliente');
  // itens mudados por outro caminho (a soma distribuída não fecha): o cliente vê a linha, nunca um total diferente
  const its2 = [{ descricao: 'Serviço', tipo: 'SERVICO', quantidade: 1, precoUnitario: 1000, acrescimoRepasse: 100 }, { auto: 'DESLOCAMENTO', descricao: 'Despesas de deslocamento e estadia', quantidade: 1, precoUnitario: 900, diluido: true }];
  const c2 = amb.ctx.ComPr_itensCliente_(its2);
  assert.equal(c2.length, 2); assert.equal(c2[0].precoUnitario, 1000);
  // proposta diluída gravada antes de 13/11/2026 (sem o item interno): a conta antiga continua (o custo sai da sobra) e a tela diz como passar à nova
  const { id } = propostaRM(amb, 'ITEM');
  const p = reg(amb, id), desl = JSON.parse(p.DESLOCAMENTO_JSON);
  desl.repasse = 'DILUIDO'; p.DESLOCAMENTO_JSON = JSON.stringify(desl);
  p.ITENS_JSON = JSON.stringify(JSON.parse(p.ITENS_JSON).filter((i) => !i.auto)); p.TOTAL = 21400; p.SUBTOTAL = 21400;
  const a = analise(amb, id);
  assert.equal(a.custoDiluido, 4434); assert.equal(a.margemPct, 24.99, 'como era: 9.782,78 − 4.434 = 5.348,78');
  assert.equal(a.diluir, 9285.86, 'a sugestão antiga: 4.434 ÷ (1 − 14,25% − 3% − 35%)');
  const d = tela(amb, id).deslocamento;
  assert.equal(d.repasseResumo.modo, 'DILUIDO_ANTIGO');
  assert.match(d.repasseResumo.texto, /proposta diluída gravada antes de 13\/11\/2026.*Toque em "Calcular \(salva o rascunho\)" para o sistema distribuir R\$ 5\.180,00/);
  assert.equal(JSON.parse(reg(amb, id).ITENS_JSON).length, 4, 'abrir não regrava nada');
});

test('6. "Usar preço sugerido" refaz a parte da viagem em cada serviço; tela, ajuda e manual explicam os dois modos', () => {
  const amb = amb0();
  const { id, itens } = propostaRM(amb, 'DILUIDO');
  const antes = reg(amb, id).TOTAL;
  const r = amb.api('s_vera', 'aplicarPrecos', { id, modo: 'SUGERIDO' });
  if (r.ok) {
    const its = itensDe(amb, id), auto = its.find((i) => i.auto);
    assert.equal(r2(its.filter((i) => !i.auto).reduce((s, i) => s + i.quantidade * (i.acrescimoRepasse || 0), 0)), auto.precoUnitario, 'a parte distribuída fecha com o valor do repasse');
    assert.ok(reg(amb, id).TOTAL >= antes);
  }
  const html = fs.readFileSync(path.join(LEGADO, 'JS_Comercial.html'), 'utf8');
  assert.match(html, /function Comercial_repasseHtml_\(d\)/);
  assert.match(html, /Os dois modos cobram o mesmo valor: custo da viagem mais impostos, sem margem, sem comissão e sem desconto/);
  assert.ok(!/aumente o preço dos serviços em pelo menos/.test(html), 'a conta "ao inverso" saiu da tela');
  const ajuda = fs.readFileSync(path.join(LEGADO, 'SGO_Ajuda_Comercial.js'), 'utf8');
  assert.match(ajuda, /Item separado ou diluído/);
  assert.ok(!/Dei desconto geral: ele também tira do deslocamento\?', r: 'Sim/.test(ajuda), 'a resposta antiga ("Sim") estava errada desde 01/11/2026');
  const man = fs.readFileSync(path.join(__dirname, '../docs/MANUAL_MODULO_COMERCIAL.md'), 'utf8');
  assert.match(man, /os dois modos cobram o mesmo valor/i);
});
