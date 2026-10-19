const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const loaded = {};
vm.runInNewContext(fs.readFileSync(path.resolve(__dirname, '../apps-script-imports/portal_sgo_versao_cnpj_db/SGO_RelCal_ConteudoModulo.js'), 'utf8'), loaded);
const html = loaded.RELCAL_CONTEUDO_MODULO;
const handler = html.slice(html.indexOf('  function tplRelCal_gerarRelatorio()'), html.indexOf('  function tplRelCal_prepararProximoRelatorio_()'));
(async () => {
  let resolveApi;
  const api = new Promise(resolve => { resolveApi = resolve; });
  const fields = { tplRelCal_btnGerar: {}, tplRelCal_statusArea: {}, tplRelCal_instrumento: { value: 'TERMOMETRO' } };
  const s = {
    document: { getElementById: id => fields[id] }, window: { open: () => null },
    RELCAL_CFG_CLIENTE: { instrumentos: { TERMOMETRO: { label: 'Termômetro' }, BALANCA: { label: 'Balança' } } },
    tplRelCal_writeLog: () => {}, tplRelCal_mostrarErro: (_, err) => { throw err; }, tplRelCal_prepararProximoRelatorio_: () => {},
    tplRelCal_coletarCertificados_: () => Promise.resolve([{ base64: 'fixture' }]), tplRelCal_coletarFotos_: () => Promise.resolve([]),
    tplRelCal_montarPayload_: () => ({ instrumento: 'TERMOMETRO', cliente: 'Cliente original', tagEquipamento: 'TAG-1' }),
    tplRelCal_chamarApi: () => api
  };
  // Desde 17/10 (36e3757) o relatório é salvo sozinho na pasta do cliente logo depois de gerado: tplRelCal_salvarDocumento
  // (fora do trecho carregado) vira simulacro que registra os valores congelados no momento do salvamento.
  const salvos = [];
  s.tplRelCal_salvarDocumento = () => salvos.push({ cliente: s.RELCAL_ULTIMO_CLIENTE, tag: s.RELCAL_ULTIMO_TAG, instrumento: s.RELCAL_ULTIMO_INSTRUMENTO_LABEL });
  vm.runInNewContext(handler, s); s.tplRelCal_gerarRelatorio();
  await new Promise(resolve => setImmediate(resolve));
  fields.tplRelCal_instrumento.value = 'BALANCA';
  resolveApi({ html: '<html>Relatório original</html>' });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(s.RELCAL_ULTIMO_INSTRUMENTO_LABEL, 'Termômetro');
  assert.equal(s.RELCAL_ULTIMO_CLIENTE, 'Cliente original');
  assert.equal(s.RELCAL_ULTIMO_TAG, 'TAG-1');
  assert.deepEqual(salvos, [{ cliente: 'Cliente original', tag: 'TAG-1', instrumento: 'Termômetro' }]);
  console.log('OK: salvar usa instrumento, cliente e TAG da geração, mesmo após alteração da tela durante a IA.');
})().catch(error => { console.error(error); process.exitCode = 1; });
