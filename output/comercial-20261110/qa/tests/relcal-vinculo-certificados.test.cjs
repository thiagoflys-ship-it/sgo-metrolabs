const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '../apps-script-imports/portal_sgo_versao_cnpj_db');
let calls = 0, received;
const sandbox = {
  exigirSessao: sid => { assert.equal(sid, 'QA'); return { perfil: 'ADMIN' }; },
  RelCalIA_gerarRelatorio_: (certs, label, contexto) => {
    calls++; received = { certs, label, contexto };
    return { introducao: 'Introdução', resultadosExplicados: 'Dados da fonte', conclusao: 'Avaliação pelo cliente' };
  },
  RelCalDoc_montarDocumentoHtml_: ctx => JSON.stringify(ctx),
  Utilities: require('./_simulacros_gas.cjs').criarUtilities(),
  Session: require('./_simulacros_gas.cjs').criarSession()
};
vm.createContext(sandbox);
// SGO_DocA4.js e SGO_RelTecA4.js: número automático do documento (RelTecA4_numeroAuto_), carregados juntos em produção.
for (const file of ['SGO_DocA4.js', 'SGO_RelTecA4.js', 'SGO_DocRevisao.js', 'SGO_RelCal_Config.js', 'SGO_RelCal_Main.js'])
  vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), sandbox);
const instrumentos = sandbox.RelCal_apiPing().instrumentos;
assert.equal(Object.keys(instrumentos).length, 9);
for (const instrumento of Object.values(instrumentos)) {
  const itens = instrumento.itensCalibraveis.length ? instrumento.itensCalibraveis : [{ codigo: 'INSTRUMENTO', label: instrumento.label }];
  const anexos = itens.map((item, index) => ({ codigo: item.codigo, base64: 'fixture-' + index, mimeType: 'application/pdf' }));
  const resolved = sandbox.RelCal_resolverCertificados_(instrumento, anexos.slice().reverse());
  assert.deepEqual(Array.from(resolved, item => item.codigo), Array.from(itens, item => item.codigo));
  assert.deepEqual(Array.from(resolved, item => item.base64), Array.from(anexos, item => item.base64));
  sandbox.RelCal_apiGerarDocumento({ instrumento: instrumento.codigo, certificados: anexos, fotos: [] }, 'QA');
  assert.equal(received.label, instrumento.label);
  assert.equal(received.contexto.itensComCertificado.length, itens.length);
  assert.equal(received.contexto.itensSemCertificado.length, 0);
  const count = calls;
  for (const invalid of [[...anexos, anexos[0]], [{ codigo: 'OUTRA_PECA', base64: 'fixture' }], [{ base64: 'fixture' }]])
    assert.throws(() => sandbox.RelCal_apiGerarDocumento({ instrumento: instrumento.codigo, certificados: invalid }, 'QA'), /peça|Peça|mesma/i);
  assert.equal(calls, count, 'Anexos inválidos devem ser bloqueados antes da interpretação');
}
sandbox.RelCal_apiGerarDocumento({ instrumento: 'CENTRIFUGA_REFRIGERADA', certificados: [{ codigo: 'INDICADOR_ROTACAO', base64: 'fixture-rpm', mimeType: 'application/pdf' }] }, 'QA');
assert.equal(received.contexto.itensComCertificado.length, 1);
assert.deepEqual(Array.from(received.contexto.itensSemCertificado), ['Temporizador/Cronômetro do ciclo', 'Sensor de Temperatura']);
assert.throws(() => sandbox.RelCal_apiGerarDocumento({ instrumento: 'CENTRIFUGA', certificados: [] }, 'QA'), /Anexe/);
console.log('OK: nove instrumentos, vínculo das peças, anexos inválidos e escopo parcial explícito no backend.');
