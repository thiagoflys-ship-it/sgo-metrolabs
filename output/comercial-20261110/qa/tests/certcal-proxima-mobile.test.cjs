const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../apps-script-imports/portal_sgo_versao_cnpj_db/JS_Core.html'), 'utf8');
function extract(name) {
  const start = source.indexOf('  function ' + name + '(');
  assert(start >= 0, name);
  const next = source.indexOf('\n  function ', start + 1);
  return source.slice(start, next < 0 ? source.length : next).split('\n  //')[0];
}
const elements = {
  mob_cc_proxima_opcao: { value: 'NAO' },
  mob_cc_proxima_campos: { style: {} },
  mob_cc_data: { value: '08/10/2026' }
};
const fields = ['data', 'solicitante', 'cargoSetor', 'referencia', 'observacao'];
fields.forEach(k => elements['mob_cc_proxima_' + k] = { value: 'residual' });
const context = {
  MOBILE_CERTCAL: { cliente: { ID: 'CLI' }, equipamento: { ID: 'EQ' }, blocos: [], fotos: [] },
  document: { getElementById: id => elements[id] },
  getValue_: id => elements[id] ? String(elements[id].value).trim() : '',
  escapeHtml_: value => String(value),
  mobileFieldHtml_: (label, html) => label + html,
  renderMobileCertCalEnsaios_: () => {},
  alert: message => { throw new Error(message); },
  window: { open: () => null }
};
vm.createContext(context);
for (const name of ['mobileCertCalProximaCampos_', 'mobileCertCalProximaAlternar_', 'mobileCertCalLerProxima_', 'mobileCertCalAvancarDados_', 'mobileCertCalGerar_']) vm.runInContext(extract(name), context);
const empty = { solicitada: false, data: '', solicitante: '', cargoSetor: '', referencia: '', observacao: '' };
const plain = value => JSON.parse(JSON.stringify(value));
assert(context.mobileCertCalProximaCampos_({}).includes('value="NAO" selected'));
assert(context.mobileCertCalProximaCampos_({}).includes('style="display:none"'));
assert.deepEqual(plain(context.mobileCertCalLerProxima_()), empty);
context.mobileCertCalProximaAlternar_();
fields.forEach(k => { assert.equal(elements['mob_cc_proxima_' + k].value, ''); assert.equal(elements['mob_cc_proxima_' + k].disabled, true); });
elements.mob_cc_proxima_opcao.value = 'SIM';
context.mobileCertCalProximaAlternar_();
assert.equal(elements.mob_cc_proxima_campos.style.display, '');
assert.equal(elements.mob_cc_proxima_data.required, true);
assert.equal(elements.mob_cc_proxima_observacao.required, false);
assert.throws(() => context.mobileCertCalAvancarDados_(), /solicitante/);
const requested = { solicitada: true, data: '08/10/2027', solicitante: 'Maria', cargoSetor: 'Qualidade', referencia: 'OS 123', observacao: '' };
fields.forEach(k => elements['mob_cc_proxima_' + k].value = requested[k]);
context.mobileCertCalAvancarDados_();
assert.deepEqual(plain(context.MOBILE_CERTCAL.dados.proximaCalibracao), requested);
let emitted;
context.mobileCertCalChamarApi_ = (name, payload) => { emitted = payload; return new Promise(() => {}); };
context.mobileCertCalGerar_();
assert.deepEqual(plain(emitted.proximaCalibracao), requested);
assert(!Object.hasOwn(emitted, 'validadeMeses'));
assert(!Object.hasOwn(emitted, 'veredito'));
elements.mob_cc_proxima_opcao.value = 'NAO';
context.mobileCertCalProximaAlternar_();
context.mobileCertCalAvancarDados_();
context.mobileCertCalGerar_();
assert.deepEqual(plain(emitted.proximaCalibracao), empty);
assert(!extract('renderMobileCertCalGerar_').includes('MOBILE_CERTCAL.veredito'));
console.log('OK: próxima calibração mobile, padrão NÃO, limpeza, obrigatórios e payload de geração.');
