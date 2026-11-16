// Comercial — diária e veículo locado (13/11/2026, decisão do dono): "não pagamos diárias a colaboradores, e veículo locado não usamos
// mais, um dia pode ser usado". A linha "Diárias" da viagem fica sempre "não se aplica", sem campo de valor; diária digitada antes
// (PROP-2026-0071: R$ 220 x 8 dias) ou gravada na política sai da conta ao calcular. O veículo locado continua possível, com a orientação
// marcada como "hoje a empresa não usa".
// Uso: DEST=<legado> node --require <fontes.cjs> tests/comercial-diaria-20261113.test.cjs
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { ambiente: ambienteBase, oportunidadeDeTeste } = require('./_comercial_ambiente.cjs');
const ambiente = (o) => ambienteBase(Object.assign({ custoAvulso: 0.3 }, o || {}));

const ok = (r) => { assert.equal(r.ok, true, r.message); return r; };
const reg = (amb, id) => amb.tabelas.COM_PROPOSTAS.find((x) => x.ID === id);
function amb0() {
  const amb = ambiente({ tabelas: { qual_distancia_referencia: [{ ID: 'd1', DESTINO: 'Rio Verde/GO', KM_TRECHO: 228 }] } });
  amb.tabelas.CAD_UNIDADES[0].CIDADE = 'Rio Verde';
  amb.ctx.CONDUTA_SHEETS = { DISTANCIA_REFERENCIA: 'qual_distancia_referencia' };
  amb.ctx.Conduta_obterParametros_ = () => ({ VALOR_INCENTIVO_MISSAO: 300, MISSAO_KM_MINIMO: 200 });
  return amb;
}
function politica(amb, campos) {
  const m = ok(amb.api('s_dora', 'metodologia')).metodologia;
  delete m.versao; delete m.atualizadaEm; delete m.atualizadaPor;
  m.precificacao = Object.assign({}, m.precificacao, campos);
  return amb.api('s_dora', 'metodologia', { salvar: m, motivo: 'Política de teste' });
}
function rascunho(amb, viagem) {
  const { oportunidade } = oportunidadeDeTeste(amb);
  const np = ok(amb.api('s_vera', 'novaProposta', { oportunidadeId: oportunidade.id }));
  const s = ok(amb.api('s_vera', 'salvarProposta', { id: np.proposta.id, escopo: 'Qualificação térmica da autoclave da CME, com relatório.',
    itens: [{ descricao: 'Qualificação térmica de autoclave', quantidade: 1, precoUnitario: '9.000,00', equipamentoId: 'eq1' }],
    condicoes: { pagamento: 'Boleto em 28 dias', prazoExecucao: 'A combinar', garantia: '90 dias' }, deslocamento: { viagem } }));
  return { id: np.proposta.id, salvo: s };
}
const linhas = (d) => Object.fromEntries(d.calculo.linhas.map((x) => [x.codigo, x]));
// Rio de Janeiro -> Angra dos Reis, como a PROP-2026-0071: 1 técnico, 8 dias e 8 noites, diária de R$ 220 digitada
const RM = { ha: 'SIM', tecnicos: 1, engenheiros: 0, transporte: 'VEICULO_EMPRESA', origem: 'Rio de Janeiro/RJ', destino: 'Angra dos Reis/RJ', kmTrecho: '139', kmConfirmado: true,
  viagens: 1, dias: 8, noites: 8, linhas: { KM: { valor: '3' }, PEDAGIO: { valor: '50' }, ALIMENTACAO: { valor: '100' }, DIARIA: { valorTecnico: '220' }, HOSPEDAGEM: { valor: '200' } } };

test('1. diária digitada não entra: a linha fica "não se aplica" automática e o custo é o da conta sem diária', () => {
  const amb = amb0();
  const { id, salvo } = rascunho(amb, RM);
  const d = salvo.proposta.deslocamento, l = linhas(d);
  assert.equal(l.DIARIA.nsa, true); assert.equal(l.DIARIA.total, 0);
  assert.match(l.DIARIA.motivo, /A Metrolabs não paga diária a colaboradores \(Diretoria, 13\/11\/2026\)/);
  // 278 km x 3 + 50 + 8 x 100 + 8 x 200 = 834 + 50 + 800 + 1.600 = 3.284 (sem os R$ 1.760 da diária)
  assert.equal(d.calculo.custo, 3284);
  const gravado = JSON.parse(reg(amb, id).DESLOCAMENTO_JSON);
  const dia = gravado.viagem.linhas.DIARIA;
  assert.equal(dia.valor.TECNICO, null, 'o valor digitado não fica gravado'); assert.equal(dia.fonteFuncao.TECNICO, '');
  assert.equal(d.checklist.ok, true, JSON.stringify(d.checklist.faltas));
});

test('2. proposta gravada antes com diária: ao salvar de novo, a diária sai; marcar "não se aplica" com motivo próprio não muda nada', () => {
  const amb = amb0();
  const { id } = rascunho(amb, RM);
  // simula o rascunho antigo: a diária gravada como VENDEDOR
  const p = reg(amb, id), dj = JSON.parse(p.DESLOCAMENTO_JSON);
  dj.viagem.linhas.DIARIA = { nsa: false, motivo: '', auto: false, fonte: '', valor: { TECNICO: 220, ENGENHEIRO: null }, fonteFuncao: { TECNICO: 'VENDEDOR', ENGENHEIRO: '' } };
  p.DESLOCAMENTO_JSON = JSON.stringify(dj);
  const s = ok(amb.api('s_vera', 'salvarProposta', { id, deslocamento: { viagem: {} } }));
  assert.equal(linhas(s.proposta.deslocamento).DIARIA.total, 0); assert.equal(s.proposta.deslocamento.calculo.custo, 3284);
  const s2 = ok(amb.api('s_vera', 'salvarProposta', { id, deslocamento: { viagem: { linhas: { DIARIA: { nsa: true, motivo: 'Técnico sem diária nesta viagem' } } } } }));
  const l2 = linhas(s2.proposta.deslocamento).DIARIA;
  assert.equal(l2.auto, true); assert.match(l2.motivo, /não paga diária/);
});

test('3. diária gravada na política também não entra; o checklist nunca cobra diária', () => {
  const amb = amb0();
  ok(politica(amb, { diariaPessoaDia: { TECNICO: 150, ENGENHEIRO: 250 } }));
  const { id, salvo } = rascunho(amb, { ha: 'SIM', tecnicos: 1, engenheiros: 1, destino: 'Rio Verde/GO', kmTrecho: '228', dias: 2, noites: 1, viagens: 1, linhas: { PEDAGIO: { valor: '45' } } });
  const l = linhas(salvo.proposta.deslocamento);
  assert.equal(l.DIARIA.nsa, true); assert.equal(l.DIARIA.total, 0);
  const r = amb.api('s_vera', 'concluirProposta', { id });
  assert.doesNotMatch(String(r.message || ''), /Diária/);
});

test('4. telas: a linha da diária não tem campo de valor; legenda, política e transporte dizem a regra; veículo locado continua possível', () => {
  const html = fs.readFileSync(path.join(__dirname, '../apps-script-imports/portal_sgo_versao_cnpj_db/JS_Comercial.html'), 'utf8');
  const tela = vm.createContext({ console, window: {}, setTimeout, USER_CONTEXT: { perfil: 'COMERCIAL' }, escapeHtml_: (v) => String(v).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`),
    document: { getElementById: () => null, querySelectorAll: () => [], querySelector: () => null, addEventListener() {} }, google: { script: { run: {} } } });
  vm.runInContext(html.slice(html.indexOf('<script>') + 8, html.lastIndexOf('</script>')), tela);
  const amb = amb0();
  const { id } = rascunho(amb, RM);
  const cx = tela.Comercial_editorCustos_(ok(amb.api('s_vera', 'proposta', { id })).proposta);
  const i = cx.indexOf('data-cvl="DIARIA"'), j = cx.indexOf('data-cvl="', i + 20);
  assert.ok(i > 0 && j > i);
  const linhaDia = cx.slice(i, j);
  assert.doesNotMatch(linhaDia, /data-cvf="valorTecnico"|data-cvf="valorEngenheiro"|data-cvf="nsa"|data-cvf="motivoAbaixo"/, 'sem campo de valor nem "não se aplica" manual');
  assert.match(linhaDia, /Não pagamos diária a colaboradores/);
  assert.match(linhaDia, /Diárias: a Metrolabs não paga diária a colaboradores/);
  assert.match(cx, /Veículo locado: hoje a empresa não usa; se um dia usar, marque o km rodado/);
  assert.match(cx, /<option value="VEICULO_LOCADO"/, 'a opção continua no transporte');
  assert.match(cx, /Custo da viagem sem diária R\$ 4\.434,00 ÷ \(1 − 14,25%\) = R\$ 5\.170,85, arredondado para R\$ 5\.180,00/);
  assert.doesNotMatch(cx, /6\.194|28\.630/);
  const met = tela.Comercial_metPreco_(ok(amb.api('s_dora', 'metodologia')));
  assert.doesNotMatch(met, /cmPrDiaT|cmPrDiaE/); assert.match(met, /não paga diária a colaboradores/);
  // ajuda: sem orientação de digitar diária; veículo locado como possibilidade futura
  const ajuda = fs.readFileSync(path.join(__dirname, '../apps-script-imports/portal_sgo_versao_cnpj_db/SGO_Ajuda_Comercial.js'), 'utf8');
  assert.match(ajuda, /A Metrolabs não paga diária a colaboradores \(Diretoria, 13\/11\/2026\)/);
  assert.doesNotMatch(ajuda, /diárias do técnico e do engenheiro|diárias por pessoa por dia/);
  assert.match(ajuda, /Veículo locado: hoje a empresa não usa/);
});
