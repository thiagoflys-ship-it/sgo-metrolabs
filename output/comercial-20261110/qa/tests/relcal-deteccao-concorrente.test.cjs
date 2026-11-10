const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const assert = require('node:assert/strict');
const loaded = {};
vm.runInNewContext(fs.readFileSync(path.resolve(__dirname, '../apps-script-imports/portal_sgo_versao_cnpj_db/SGO_RelCal_ConteudoModulo.js'), 'utf8'), loaded);
const html = loaded.RELCAL_CONTEUDO_MODULO;
const handler = html.slice(html.indexOf('  function tplRelCal_aoAnexarCertificado(codigo) {'), html.indexOf('  function tplRelCal_montarPayload_()'));
async function scenario(change) {
  const selectedFile = {};
  const input = {files:[selectedFile]};
  const fields = {tplRelCal_cert_INSTRUMENTO:input, tplRelCal_instrumento:{value:'TERMOMETRO'}, tplRelCal_detectarAuto:{checked:true}, tplRelCal_statusDeteccao:{innerHTML:''}, tplRelCal_cliente:{value:''}};
  let resolveApi;
  const api = new Promise(resolve => { resolveApi = resolve; });
  const sandbox = {document:{getElementById:id=>fields[id]}, tplRelCal_writeLog:()=>{}, tplRelCal_lerArquivoComoBase64_:()=>Promise.resolve({base64:'fixture'}), tplRelCal_chamarApi:()=>api};
  vm.runInNewContext(handler, sandbox);
  sandbox.tplRelCal_aoAnexarCertificado('INSTRUMENTO');
  await Promise.resolve();
  change(fields);
  resolveApi({campos:{cliente:'Cliente detectado'}});
  await new Promise(resolve=>setImmediate(resolve));
  return fields.tplRelCal_cliente.value;
}
(async()=>{
  assert.equal(await scenario(()=>{}), 'Cliente detectado');
  assert.equal(await scenario(fields=>{fields.tplRelCal_instrumento.value='BALANCA';}), '');
  assert.equal(await scenario(fields=>{fields.tplRelCal_cert_INSTRUMENTO={files:[{}]};}), '');
  assert.equal(await scenario(fields=>{fields.tplRelCal_cert_INSTRUMENTO.files=[{}];}), '');
  console.log('OK: detecção atual preenche; respostas de instrumento, slot e arquivo anteriores são descartadas.');
})().catch(error=>{console.error(error);process.exitCode=1;});
