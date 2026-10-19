const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const base = path.join(__dirname, '../apps-script-imports/portal_sgo_versao_cnpj_db');
const motor = require(path.join(base, 'SGO_CertCal_Calculo.js'));
const perto = (a, b, tol = 1e-9) => assert.ok(Math.abs(a - b) <= tol, `${a} != ${b}`);
function backend() {
  const ctx = vm.createContext({ CertCalCalculo: motor, CERTCAL_CFG: { NUM_LEITURAS_POR_PONTO: 3 }, SGO_UTILS: { safe: v => String(v ?? '').trim() } });
  // SGO_DocA4.js: formatação numérica pt-BR comum (SGO_DocA4_num_), carregada junto em produção.
  vm.runInContext(fs.readFileSync(path.join(base, 'SGO_DocA4.js'), 'utf8'), ctx);
  vm.runInContext(fs.readFileSync(path.join(base, 'SGO_CertCal_Main.js'), 'utf8'), ctx);
  return ctx;
}
test('centrífuga: RPM, tendência assinada, U95/K e Welch-Satterthwaite independentes', () => {
  const r = motor.calcularPonto('3000,00', ['2990,00', 3000, '3010.00'], [{ incertezaU95: '4,00', fatorK: 2, veff: 0 }]);
  perto(r.media, 3000); perto(r.tendencia, 0);
  const ua2 = 100 / 3, uc2 = ua2 + 4;
  perto(r.incertezaPadraoCombinada, Math.sqrt(uc2));
  perto(r.veff, uc2 * uc2 / (ua2 * ua2 / 2));
  perto(motor._interno.probabilidadeBicaudalT(r.k, r.veff), 0.9545, 1e-10);
  perto(r.incertezaU95, r.k * Math.sqrt(uc2));
});
test('fator Student tem referência analítica para um grau de liberdade', () => {
  perto(motor._interno.fatorAbrangenciaT(1, 0.9545), Math.tan(Math.PI * 0.9545 / 2), 1e-8);
});
test('mesmas leituras: U95 do padrão dividida por K; incerteza interna não é arredondada', () => {
  const r = motor.calcularPonto(20, [20.1234, 20.1234, 20.1234], [{ incertezaU95: 0.15, fatorK: 3, veff: 0 }]);
  perto(r.incertezaPadraoCombinada, 0.05); perto(r.tendencia, 0.1234);
  assert.equal(r.veff, 0); assert.ok(r.incertezaU95 > 0.09999 && r.incertezaU95 < 0.10001);
});
test('WS permanece finito para componentes extremamente pequenas ou grandes', () => {
  for (const u of [1e-100, 1e100]) {
    const r = motor.calcularPonto(0, [0, 0, 0], [{ incertezaU95: u, fatorK: 2, veff: 10 }]);
    perto(r.veff, 10); assert.ok(Number.isFinite(r.incertezaU95));
  }
});
test('pior caso mantém sinal da tendência e usa máximo correto para cada coluna', () => {
  const r = motor.calcularBloco([{ nominal: 10, leituras: [8, 8, 8] }, { nominal: 10, leituras: [7, 10, 13] }], [{ incertezaU95: 0.2, fatorK: 2, veff: 0 }]);
  assert.equal(r.piorTendencia, -2); assert.equal(r.piorIncertezaU95, r.resultados[1].incertezaU95);
  assert.equal(r.piorErroMaximo, Math.max(...r.resultados.map(p => p.erroMaximo)));
});
test('parsing estrito preserva números JSON e aceita decimal brasileiro e agrupamento inequívoco', () => {
  assert.equal(motor.numero(1.234), 1.234); assert.equal(motor.numero('1.234,56'), 1234.56);
  assert.equal(motor.numero('0,001'), 0.001); assert.equal(motor.numero('1.234'), 1.234);
  for (const v of ['', '12 rpm', true, NaN, Infinity, '1,2,3']) assert.throws(() => motor.numero(v));
  assert.throws(() => motor.calcularPonto(0, [0, '', 0], []));
  assert.throws(() => motor.calcularPonto(0, [0], [{ incertezaU95: 1, fatorK: 0 }]));
});
test('backend exige grandeza, unidade, três leituras, padrões distintos e pontos', () => {
  const ctx = backend(), mapa = { a: { ID: 'a', TAG: 'RPM', INCERTEZA_U95: 4, FATOR_K: 2, VEFF: 0, VALIDADE: '01/01/2027' } };
  const b = { titulo: 'Rotação', unidade: 'rpm', padroesIds: ['a'], pontos: [{ nominal: 3000, leituras: [2990, 3000, 3010] }] };
  assert.equal(ctx.CertCal_calcularBlocos_([b], mapa)[0].resultados[0].media, 3000);
  for (const v of [null, [], [null], [{ ...b, unidade: '' }], [{ ...b, pontos: [] }], [{ ...b, pontos: [{ nominal: 1, leituras: [1, 1] }] }], [{ ...b, padroesIds: ['a', 'a'] }]]) {
    assert.throws(() => ctx.CertCal_calcularBlocos_(v, mapa));
  }
});
test('condições ambientais: temperatura com 1 casa e umidade inteira (padrão A4 de 17/10), sem zero negativo e validam umidade', () => {
  const ctx = backend();
  assert.equal(ctx.CertCal_formatarNumeroBr_(-0.001), '0,00');
  // docs/RELATORIOS_A4_TECNICOS_20261017.md: "Temperatura ambiente 23,5 °C; umidade relativa do ar 55 %." (antes "(23,50) °C").
  assert.equal(ctx.CertCal_formatarCondicoesAmbientais_('23,456', '50'), 'Temperatura ambiente 23,5 °C; umidade relativa do ar 50 %.');
  assert.throws(() => ctx.CertCal_formatarCondicoesAmbientais_('23', '101'));
  assert.throws(() => ctx.CertCal_formatarCondicoesAmbientais_('23', '-1'));
});
