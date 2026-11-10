// Relatórios de qualificação da lavadora, da estufa/banho-maria e da cadeia de frio (21/10/2026): patrimônio,
// capacidade, câmaras e ano de fabricação do cadastro do equipamento aparecem quando preenchidos, como no da
// autoclave. 22/10/2026: fabricante e modelo do cadastro também saem (fora da identificação assinada). Com os campos
// vazios a identificação não muda (envios aguardando aprovação continuam válidos). Fluxo real (rascunho → envio → prévia). Só dados de teste.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const L = require('./_lavadora_ambiente.cjs');
const E = require('./_estufa_ambiente.cjs');
const C = require('./_cadeiafrio_ambiente.cjs');

const CAMPOS = { PATRIMONIO: 'PAT-TESTE-77', CAPACIDADE: '200 L', NUM_CAMARAS: '2', ANO_FABRICACAO: '2019' };
function gravar(env, id, campos) {
  vm.runInContext('(function (id, o) { var l = (__ABAS.CAD_EQUIPAMENTOS || []).filter(function (x) { return String(x.ID) === String(id); })[0]; Object.keys(o).forEach(function (k) { l[k] = o[k]; }); })(' + JSON.stringify(id) + ', ' + JSON.stringify(campos) + ')', env.ctx);
}
function confere(html) {
  assert.match(html, /Patrimônio<\/th><td>PAT-TESTE-77/);
  assert.match(html, /Capacidade ou volume<\/th><td>200 L/);
  assert.match(html, /Câmaras ou portas<\/th><td>2</);
  assert.match(html, /Ano de fabricação<\/th><td>2019/);
  assert.match(html, /Fabricante \(marca\)<\/th><td>MARCAFICTICIA/);
  assert.match(html, /Modelo<\/th><td>(MODELOXYZ|MODELOEST)/);
}
function semCampos(html) { assert.doesNotMatch(html, /Patrimônio<\/th>|Capacidade ou volume<\/th>|Câmaras ou portas<\/th>/); }

test('lavadora: relatório de qualificação mostra patrimônio, capacidade, câmaras e ano do cadastro só quando preenchidos', () => {
  const env = L.criarAmbiente({ cadastro: true });
  const p0 = { modoEntrada: 'COLAR', nSensores: 3, setpoint: '90', motor: 'TERMO', classeArtigo: 'SEMICRITICO', dateStyle: 'BR', cliente: 'CLIENTE DE TESTE', cnpj: '11.222.333/0001-81',
    tag: 'LAV-TESTE-01', certNumero: 'LAV-T-0201', certDataLogger: 'DTL-T1', respTecnico: 'Técnico Teste', ensaio: 'QO (Vazio)', cicloNum: '1', programa: 'Instrumental 90 °C',
    textoColado: L.csvCompleto(L.cicloTermo({ nSensores: 3 })), clienteId: 'cli1', unidadeId: 'uni1', equipamentoId: 'eq1' };
  const r0 = env.lav('tec', 'apiGerarRascunhoCertificado', p0);
  assert.equal(r0.bloqueado, false, JSON.stringify(r0.travas));
  const envio0 = env.lav('tec', 'apiEnviarParaAprovacao', Object.assign({}, p0, { assinaturaContextoCertificado: r0.assinaturaContexto, textosCertificado: r0.textos }));
  env.lav('rt', 'apiAprovarEmitir', { id: envio0.id, confirmacaoRevisao: true });
  const qi = {};
  env.fn('LAVOFICIAL_CFG').QI_ITENS.forEach(it => { qi[it.id] = { situacao: 'C' }; });
  const base = { clienteId: 'cli1', unidadeId: 'uni1', equipamentoId: 'eq1', etapas: { QI: true, QO: true }, motivo: 'Requalificação periódica', periodicidadeMeses: 12, qi: qi, dataQi: '10/10/2026', ciclos: [envio0.id] };
  const a = env.oficial('tec', 'apiGerarRascunho', base);
  assert.equal(a.ok, true, a.erro);
  gravar(env, 'eq1', { PATRIMONIO: '', CAPACIDADE: ' ' });
  assert.equal(env.oficial('tec', 'apiGerarRascunho', base).assinaturaContexto, a.assinaturaContexto, 'campos vazios não mudam a assinatura');
  semCampos(env.oficial('tec', 'apiPrevia', base).html || '');
  gravar(env, 'eq1', CAMPOS);
  const prev = env.oficial('tec', 'apiPrevia', base);
  assert.equal(prev.ok, true, prev.erro);
  confere(prev.html);
});

test('estufa: relatório de qualificação mostra os campos do cadastro quando preenchidos', () => {
  const env = E.criarAmbiente();
  const s = E.serieEstufa({});
  const pe = E.payloadIncubacao(s, { certNumero: 'REE-T-9' });
  const re = env.estufa('rt', 'apiQGerarRascunho', pe);
  assert.equal(re.bloqueado, false, JSON.stringify(re.travas));
  const ens = env.estufa('rt', 'apiQEmitir', Object.assign({}, pe, { assinaturaContexto: re.assinaturaContexto, textosCertificado: re.textos, confirmacaoRevisao: true }));
  const qi = {};
  env.oficialEstufa('tec', 'apiSituacao', {}).qiItens.forEach(it => { qi[it.id] = { situacao: 'C' }; });
  const p = { clienteId: 'cli1', unidadeId: 'uni1', equipamentoId: 'eq3', etapas: { QI: true, QO: true }, motivo: 'Qualificação inicial', periodicidadeMeses: 12, ensaios: [ens.emissaoId], qi: qi, dataQi: '05/10/2026' };
  const a = env.oficialEstufa('tec', 'apiGerarRascunho', p);
  gravar(env, 'eq3', { PATRIMONIO: '' });
  assert.equal(env.oficialEstufa('tec', 'apiGerarRascunho', p).assinaturaContexto, a.assinaturaContexto, 'campos vazios não mudam a assinatura');
  gravar(env, 'eq3', CAMPOS);
  const r = env.oficialEstufa('tec', 'apiGerarRascunho', p);
  assert.notEqual(r.assinaturaContexto, a.assinaturaContexto);
  const envio = env.oficialEstufa('tec', 'apiEnviarParaAprovacao', Object.assign({}, p, { assinaturaContexto: r.assinaturaContexto, textos: r.textos }));
  confere(env.oficialEstufa('rt', 'apiPreverAprovacao', { id: envio.id }).html);
});

test('cadeia de frio: relatório de qualificação mostra os campos do cadastro quando preenchidos', () => {
  const env = C.criarAmbiente();
  const T0 = new Date(2026, 9, 12, 8, 0, 0);
  const Ls = C.leituras({ inicio: T0, n: 1441, temp: (k) => [4.5, 5, 5.5][k] });
  const pc = C.payload({ certNumero: 'CF-T-0901', equipamentoId: 'eq1', textoColado: C.csv(Ls), estudos: { distribuicao: { tipo: 'DISTRIBUICAO_VAZIO', inicio: C.quando(Ls[0].d), fim: C.quando(Ls[Ls.length - 1].d) } } });
  const rc = env.dispatch('tec', 'apiGerarRascunhoCertificado', pc);
  assert.ok(!rc.bloqueado, JSON.stringify(rc.travas));
  const ec = env.dispatch('tec', 'apiEnviarParaAprovacao', Object.assign({}, pc, { assinaturaContextoCertificado: rc.assinaturaContexto, textosCertificado: rc.textos }));
  env.dispatch('rt', 'apiAprovarEmitir', { id: ec.id, confirmacaoRevisao: true });
  const qi = {};
  env.fn('CFOFICIAL_CFG').QI_ITENS.forEach(it => { qi[it.id] = { situacao: 'C' }; });
  const base = { clienteId: 'cli1', unidadeId: 'uni1', equipamentoId: 'eq1', etapas: { QI: true, QO: true }, motivo: 'Qualificação inicial', periodicidadeMeses: 12, dataQi: '12/10/2026', ensaios: [ec.id], qi: qi };
  const a = env.oficial('tec', 'apiGerarRascunho', base);
  gravar(env, 'eq1', { CAPACIDADE: '' });
  assert.equal(env.oficial('tec', 'apiGerarRascunho', base).assinaturaContexto, a.assinaturaContexto, 'campos vazios não mudam a assinatura');
  gravar(env, 'eq1', CAMPOS);
  const r = env.oficial('tec', 'apiGerarRascunho', base);
  const envio = env.oficial('tec', 'apiEnviarParaAprovacao', Object.assign({}, base, { assinaturaContexto: r.assinaturaContexto, textos: r.textos }));
  assert.equal(envio.ok, true, envio.erro);
  confere(env.oficial('rt', 'apiPreverAprovacao', { id: envio.id }).html);
});
