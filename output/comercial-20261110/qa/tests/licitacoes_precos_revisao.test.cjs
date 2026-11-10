// SGO+ Licitações, tabela de preços e simulador: correções da revisão independente de ca99fe5 (02/11/2026), um teste por item.
// Mesmo ambiente de tests/licitacoes_precos.test.cjs (Comercial real e Licitações no mesmo contexto). Só dados de teste.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ambientePrecos } = require('./_licitacoes_precos_ambiente.cjs');

const OPS = [{ ID: 'op1', CODIGO: 'LIC-2026-0001', UF: 'GO', MUNICIPIO: 'Rio Verde', VALOR_ESTIMADO: 20000 },
  { ID: 'op2', CODIGO: 'LIC-2026-0002', UF: 'RJ', MUNICIPIO: 'Niterói', VALOR_ESTIMADO: 50000 },
  { ID: 'op3', CODIGO: 'LIC-2026-0003', UF: 'GO', MUNICIPIO: 'Goiânia', VALOR_ESTIMADO: 9000 }];
const ok = (r) => { assert.equal(r.ok, true, r.message); return r; };
function base(o) {
  const a = ambientePrecos(Object.assign({ oportunidades: OPS }, o || {}));
  const pv = ok(a.lic('s_dora', 'importarPrevia'));
  ok(a.lic('s_dora', 'importar', { marca: pv.marca, motivo: 'Ponto de partida da tabela' }));
  return a;
}
const LOCAL = { municipio: 'Goiânia', dias: 1, noites: 0 };
const exec = (x) => Object.assign({ uf: 'GO', municipio: 'Rio Verde', tecnicos: 1, engenheiros: 0, viagens: 1, dias: 2, noites: 1, pedagio: '0', transporte: 'VEICULO_EMPRESA' }, x || {});
const calc = (a, id, itens, x, seguro) => ok(a.lic('s_dora', 'simulacaoCalcular', { id, entrada: { itens, execucao: exec(x), seguro: seguro || { exige: false } } })).resultado;
const op = (a, id) => a.tabelas.LIC_OPORTUNIDADES.find((x) => x.ID === id);
const margem = (a, id) => { const p = a.ctx.Lic_pesos_(); return { pesos: p, c: a.ctx.Lic_criteriosCodigo_(op(a, id), p, '2026-11-02') }; };

test('revisão 1 (grave): deslocamento numa linha própria entra na sobra do lote e na nota (edital R$ 400, viagem R$ 2.521 → prejuízo, nota 0)', () => {
  const a = base();
  ok(a.lic('s_dora', 'politicaSalvar', { campos: { diluir: 'NAO' }, motivo: 'Deslocamento numa linha própria' }));
  const r = calc(a, 'op1', [{ codigo: 'CAL-001', quantidade: 2, precoEdital: '200', precoProposta: '200' }]);
  assert.equal(r.itens[0].rateioDeslocamento, 0); assert.equal(r.linhaExtra.custo, 2521.25);
  assert.equal(r.totais.linhaPropriaCusto, 2521.25);
  const esperado = Math.round((400 - 400 * 0.1425 - 129.4 - 2521.25) / 400 * 10000) / 100;
  assert.equal(r.totais.margemEditalPct, esperado); assert.ok(r.totais.margemEditalPct < 0);
  assert.equal(r.totais.margemPropostaPct, esperado);
  assert.ok(r.avisos.some((x) => /linha própria/.test(x) && /já desconta/.test(x)));
  ok(a.lic('s_dora', 'simulacaoSalvar', { id: 'op1', entrada: { itens: [{ codigo: 'CAL-001', quantidade: 2, precoEdital: '200' }], execucao: exec() }, motivo: 'Linha própria de deslocamento' }));
  assert.equal(margem(a, 'op1').c.criterios.margem.pontos, 0, 'não dá 15 com prejuízo');
});

test('revisão 2: item com piso e sem preço do edital deixa a margem da nota como pendência (não calcula com parte dos itens)', () => {
  const a = base();
  ok(a.lic('s_dora', 'simulacaoSalvar', { id: 'op1', entrada: { itens: [{ codigo: 'CAL-001', quantidade: 100, precoEdital: '400' }, { codigo: 'CAL-002', quantidade: 10, precoEdital: '' }], execucao: exec() }, motivo: 'Um item sem preço do edital' }));
  const { pesos, c } = margem(a, 'op1');
  assert.equal(c.criterios.margem.pontos, 5 * pesos.margem / 15);
  assert.match(c.criterios.margem.como, /1 item\(ns\) sem o preço de referência do edital/);
  assert.ok(c.afirmacoes.some((x) => x.tipo === 'PENDENCIA' && /todos os itens/.test(x.texto)));
});

test('revisão 3: limite de 40 itens igual em Calcular e Salvar; 40 itens com descrições longas e pendências sempre gravam', () => {
  const a = base();
  const longa = 'Calibração de termômetro digital com sonda externa, certificado rastreável e pontos conforme o termo de referência, '.repeat(3).slice(0, 300);
  const itens = Array.from({ length: 40 }, (_, k) => ({ numero: String(k + 1), descricao: longa, codigo: k % 3 ? 'CAL-001' : 'CAL-MONITOR', quantidade: 3, pontos: 5, precoEdital: '1.234,56', precoProposta: '999,99' }));
  const r = calc(a, 'op1', itens);
  assert.ok(r.pendencias.length >= 14, 'com pendências de parceiro sem custo');
  const s = ok(a.lic('s_dora', 'simulacaoSalvar', { id: 'op1', entrada: { itens, execucao: exec() }, motivo: 'Lote grande de 40 itens' }));
  assert.ok(a.tabelas.LIC_SIMULACOES[0].RESULTADO_JSON.length < 48000, 'cabe na célula');
  assert.ok(a.tabelas.LIC_SIMULACOES[0].ENTRADA_JSON.length < 48000);
  assert.equal(s.simulacao.resultado.itens.length, 40);
  const mais = itens.concat([Object.assign({}, itens[0], { numero: '41' })]);
  const m1 = a.lic('s_dora', 'simulacaoCalcular', { id: 'op1', entrada: { itens: mais, execucao: exec() } }).message;
  const m2 = a.lic('s_dora', 'simulacaoSalvar', { id: 'op1', entrada: { itens: mais, execucao: exec() }, motivo: 'Lote grande de 41 itens' }).message;
  assert.match(m1, /até 40 itens/); assert.equal(m2, m1, 'salvar recusa igual, sem cortar em silêncio');
  assert.equal(a.tabelas.LIC_SIMULACOES.length, 1);
  const b = ambientePrecos({ oportunidades: OPS, catalogo: false, itensFonte: Array.from({ length: 45 }, (_, k) => ({ numeroItem: k + 1, descricao: 'item', quantidade: 1, valorUnitario: 10 })) });
  const ab = ok(b.lic('s_dora', 'simulacao', { id: 'op1' }));
  assert.equal(ab.rascunho.itens.length, 40); assert.equal(ab.rascunho.cortados, 5); assert.equal(ab.limiteItens, 40);
});

test('revisão 4: simulação alterada fora do SGO+ não vale para a nota (5 com pendência)', () => {
  const a = base();
  ok(a.lic('s_dora', 'simulacaoSalvar', { id: 'op1', entrada: { itens: [{ codigo: 'CAL-001', quantidade: 100, precoEdital: '250' }], execucao: exec() }, motivo: 'Simulação que será alterada' }));
  assert.equal(margem(a, 'op1').c.criterios.margem.pontos, margem(a, 'op1').pesos.margem);
  a.tabelas.LIC_SIMULACOES[0].MOTIVO = 'trocado na planilha';
  const { pesos, c } = margem(a, 'op1');
  assert.equal(c.criterios.margem.pontos, 5 * pesos.margem / 15); assert.match(c.criterios.margem.como, /alterada fora do SGO\+/);
  assert.ok(c.afirmacoes.some((x) => x.tipo === 'PENDENCIA' && /alterada fora do SGO\+/.test(x.texto)));
});

test('revisão 5: piso arredondado PARA CIMA no centavo: sempre deixa a sobra mínima, e 1 centavo a menos não deixa; o Comercial não mudou', () => {
  const a = base();
  const lp = a.ctx.LicP_politica_(), pc = a.ctx.LicP_polConta_(lp);
  let conferidos = 0;
  for (let c = 1.13; c < 900; c += 7.77) {
    const custo = Math.round(c * 10000) / 10000, p = a.ctx.LicP_precoQueGarante_(custo, 'SERVICO', pc, 35);
    const sobra = (x) => (x - x * pc.imp / 100 - custo) / x;
    assert.ok(sobra(p) >= 0.35 - 1e-12, 'custo ' + custo + ' piso ' + p);
    assert.ok(sobra(Math.round((p - 0.01) * 100) / 100) < 0.35, 'custo ' + custo + ' piso ' + p + ' não é o menor');
    conferidos++;
  }
  assert.ok(conferidos > 100);
  assert.match(a.ler('SGO_Comercial_Precificacao.js'), /return d > 0\.05 \? Com_r2_\(c \/ d\) : null;/);
});

test('revisão 6: a viagem só é rateada entre os itens da equipe própria; lote só de parceiro não tem viagem da equipe; o seguro vai a todos', () => {
  const a = base();
  const r = calc(a, 'op1', [{ codigo: 'CAL-001', quantidade: 10 }, { codigo: 'CAL-MONITOR', quantidade: 10, custoParceiro: '150' }], {}, { exige: true, custo: '100' });
  assert.equal(r.itens[1].rateioDeslocamento, 0); assert.equal(r.itens[0].rateioDeslocamento, r.viagem.custo);
  assert.ok(r.itens[1].rateioSeguro > 0); assert.equal(Math.round((r.itens[0].rateioSeguro + r.itens[1].rateioSeguro) * 100), 10000);
  const so = calc(a, 'op2', [{ codigo: 'CAL-MONITOR', quantidade: 3, custoParceiro: '150' }], { uf: 'RJ', municipio: 'Niterói', pedagio: '' });
  assert.equal(so.viagem.custo, 0); assert.equal(so.totais.deslocamento, 0);
  assert.ok(!so.pendencias.some((p) => p.codigo === 'KM' || p.codigo === 'PEDAGIO'), 'sem pedir km nem pedágio da equipe');
  assert.ok(so.informacoes.some((x) => /só tem itens por parceiro/.test(x)), 'informação (faixa verde), não aviso vermelho (03/11/2026)'); assert.ok(!so.avisos.some((x) => /só tem itens por parceiro/.test(x)));
  assert.equal(so.pendencias.length, 0);
});

test('revisão 7: código repetido no catálogo entra uma vez só na prévia (vale o oficial)', () => {
  const a = ambientePrecos({ oportunidades: OPS });
  const cal = a.tabelas.COM_PRODUTOS.find((p) => p.CODIGO === 'CAL-001');
  a.tabelas.COM_PRODUTOS.unshift(Object.assign({}, cal, { ID: 'dup1', CATALOGO_OFICIAL: '', NOME: 'Cópia antiga', PRECO: 10 }));
  const pv = ok(a.lic('s_dora', 'importarPrevia'));
  const l = pv.linhas.filter((x) => x.codigo === 'CAL-001');
  assert.equal(l.length, 1); assert.equal(l[0].preco, 75.5, 'vale o oficial'); assert.deepEqual(pv.duplicados, ['CAL-001']);
  ok(a.lic('s_dora', 'importar', { marca: pv.marca, motivo: 'Importação com código repetido' }));
  assert.equal(a.tabelas.LIC_PRECOS.filter((x) => x.CODIGO === 'CAL-001').length, 1);
});

test('revisão 8 e 9: abaixo do piso separado em proposta e edital; histórico da política em pt-BR, sem JSON cru', () => {
  const a = base();
  ok(a.lic('s_dora', 'simulacaoSalvar', { id: 'op3', entrada: { itens: [{ codigo: 'CAL-001', quantidade: 10, precoEdital: '90', precoProposta: '300' },
    { codigo: 'CAL-001', quantidade: 10, precoEdital: '300', precoProposta: '90' }, { codigo: 'CAL-001', quantidade: 10, precoEdital: '80', precoProposta: '300' }], execucao: exec(LOCAL) }, motivo: 'Contagens separadas' }));
  const g = a.tabelas.LIC_SIMULACOES[0];
  assert.equal(g.ITENS_ABAIXO_PISO_EDITAL, 2); assert.equal(g.ITENS_ABAIXO_PISO_PROPOSTA, 1); assert.equal(g.ITENS_ABAIXO_PISO, undefined);
  const v = ok(a.lic('s_dora', 'simulacao', { id: 'op3' })).versoes[0];
  assert.equal(v.abaixoEdital, 2); assert.equal(v.abaixoProposta, 1);
  ok(a.lic('s_dora', 'politicaSalvar', { campos: { margemMinPct: '38', diluir: 'NAO', ufsEquipeRio: 'RJ' }, motivo: 'Mudança para conferir o texto' }));
  const h = a.tabelas.LIC_HISTORICO.filter((x) => x.TIPO === 'POLITICA_DE_PRECOS').pop();
  assert.match(h.TEXTO, /Sobra mínima: 35,00% → 38,00%/); assert.match(h.TEXTO, /Deslocamento e seguro: diluídos no preço unitário → numa linha própria/); assert.match(h.TEXTO, /UFs da equipe do Rio: RJ, ES → RJ/);
  assert.doesNotMatch(h.TEXTO, /[[\]"]|true|false/);
});

test('revisão 10 e 11: a IA externa recebe só a pontuação da margem; manual com "Preços" na barra de seções', () => {
  const a = base();
  ok(a.lic('s_dora', 'simulacaoSalvar', { id: 'op1', entrada: { itens: [{ codigo: 'CAL-001', quantidade: 100, precoEdital: '250' }], execucao: exec() }, motivo: 'Simulação para o pedido à IA' }));
  const { pesos, c } = margem(a, 'op1');
  const t = a.ctx.Lic_textoCalculado_(c, pesos, '2026-11-02');
  const m = t.slice(t.indexOf(' Margem: '));
  assert.match(m, /calculada pelo sistema/);
  assert.doesNotMatch(m, /R\$|piso|edital|sobra|17\.717|250/i);
  assert.match(c.criterios.margem.como, /piso R\$/, 'a tela continua com a conta inteira');
  const manual = fs.readFileSync(path.join(__dirname, '../docs/MANUAL_MODULO_LICITACOES.md'), 'utf8');
  assert.match(manual, /Agenda, Alertas, Preços, Portais e configurações\)/);
  assert.match(manual, /- Preços de licitação\r?\n- Portais e configurações/);
});

test('ajuste final 2a: item "a confirmar" não recebe rateio de viagem nem de seguro; o rateio fica só nos itens com piso, com aviso', () => {
  const a = base();
  const r = calc(a, 'op1', [{ numero: '1', codigo: 'CAL-001', quantidade: 10 }, { numero: '2', codigo: 'QT-AUTOCLAVE-BT', quantidade: 2 }], null, { exige: true, custo: '100' });
  const [cal, eto] = r.itens;
  assert.equal(eto.semPiso, true); assert.ok(eto.custoUnitBase > 0, 'o item a confirmar tem custo, mas fica fora do rateio');
  assert.equal(eto.rateioDeslocamento, 0); assert.equal(eto.rateioSeguro, 0);
  assert.equal(cal.rateioDeslocamento, r.viagem.custo); assert.equal(cal.rateioSeguro, 100);
  assert.ok(r.avisos.some((x) => /Item\(ns\) 2 sem piso/.test(x) && /só nos itens com piso/.test(x)));
  // só o item a confirmar: nada onde diluir, pendência dizendo o que fazer
  const s = calc(a, 'op1', [{ numero: '1', codigo: 'QT-AUTOCLAVE-BT', quantidade: 2 }]);
  assert.equal(s.itens[0].rateioDeslocamento, 0);
  assert.ok(s.pendencias.some((p) => p.codigo === 'RATEIO' && /confirme o preço dos itens "a confirmar"/.test(p.texto)));
});

test('ajuste final 2b: edital só com o total do lote: abaixo da soma dos pisos vira pendência; acima, aviso; a nota fica como pendência', () => {
  const a = base();
  const itens = [{ numero: '1', codigo: 'CAL-001', quantidade: 100 }];
  const ref = calc(a, 'op1', itens);
  const piso = ref.totais.piso;
  const ent = (lote) => ({ itens, execucao: exec(), seguro: { exige: false }, loteEdital: lote });
  const baixo = ok(a.lic('s_dora', 'simulacaoCalcular', { id: 'op1', entrada: ent(String(Math.floor(piso - 100)).replace('.', ',')) })).resultado;
  assert.equal(baixo.totais.loteEditalAbaixo, true);
  assert.ok(baixo.pendencias.some((p) => p.codigo === 'LOTE_EDITAL' && /abaixo da soma dos pisos/.test(p.texto)));
  const alto = ok(a.lic('s_dora', 'simulacaoCalcular', { id: 'op1', entrada: ent(String(Math.ceil(piso + 1000))) })).resultado;
  assert.equal(alto.totais.loteEditalAbaixo, false);
  assert.ok(!alto.pendencias.some((p) => p.codigo === 'LOTE_EDITAL')); assert.ok(alto.informacoes.some((x) => /cobre a soma dos pisos/.test(x)), 'informação (faixa verde), não aviso vermelho (03/11/2026)'); assert.ok(!alto.avisos.some((x) => /cobre a soma dos pisos/.test(x)));
  assert.match(a.lic('s_dora', 'simulacaoCalcular', { id: 'op1', entrada: ent('abc') }).message, /o total do lote no edital/);
  // salvar guarda o total na entrada; a margem da nota fica como pendência (5 de 15)
  ok(a.lic('s_dora', 'simulacaoSalvar', { id: 'op1', entrada: ent(String(Math.floor(piso - 100))), motivo: 'Edital só com o total do lote' }));
  assert.equal(JSON.parse(a.tabelas.LIC_SIMULACOES[0].ENTRADA_JSON).loteEdital, String(Math.floor(piso - 100)));
  const { pesos, c } = margem(a, 'op1');
  assert.equal(c.criterios.margem.pontos, 5 * pesos.margem / 15);
  // tela: campo do total do lote
  const js = a.ler('JS_Licitacoes_Precos.html');
  assert.match(js, /id="lprLote" data-lpr-lote/); assert.match(js, /r\.loteEdital = lote\.value/);
});

test('ajuste final 2c: "Salvar" grande demais agrupa as pendências repetidas; se nem assim couber, a mensagem diz o que fazer', () => {
  const a = base();
  const itens = Array.from({ length: 40 }, (_, k) => ({ numero: String(k + 1), descricao: 'Item sem serviço escolhido ' + k, codigo: '', quantidade: '' }));
  const res = ok(a.lic('s_dora', 'simulacaoCalcular', { id: 'op1', entrada: { itens, execucao: exec() } })).resultado;
  const cheio = JSON.stringify(res).length;
  a.ctx.LICP_MAX_RESULTADO = cheio - 1;   // força o caminho do resultado enxuto
  ok(a.lic('s_dora', 'simulacaoSalvar', { id: 'op1', entrada: { itens, execucao: exec() }, motivo: 'Quarenta itens sem serviço' }));
  const g = JSON.parse(a.tabelas.LIC_SIMULACOES[0].RESULTADO_JSON);
  assert.equal(g.pendenciasAgrupadas, true);
  const grupo = g.pendencias.find((p) => /escolha o serviço da tabela/.test(p.texto));
  assert.equal(grupo.itens, 40); assert.match(grupo.texto, /^Itens 1, 2, 3/);
  assert.equal(g.itens.length, 40, 'a conta de cada item continua gravada');
  a.ctx.LICP_MAX_RESULTADO = 1000;   // nem o enxuto cabe
  const m = a.lic('s_dora', 'simulacaoSalvar', { id: 'op1', entrada: { itens, execucao: exec() }, motivo: 'Quarenta itens sem serviço' }).message;
  assert.match(m, /40 itens e \d+ pendências/); assert.match(m, /resolva antes as pendências dos itens/); assert.match(m, /divida a simulação/); assert.match(m, /itens 1 a 20/); assert.match(m, /Nada foi gravado.?$/);
  assert.equal(a.tabelas.LIC_SIMULACOES.length, 1);
});
