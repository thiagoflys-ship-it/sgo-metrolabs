const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
let externalCalls = 0;
const s = {
 exigirSessao: sid => { if(sid === 'INVALIDA') throw Error('Sessão inválida'); return {perfil:sid === 'CLIENTE' ? 'CLIENTE':'TECNICO'}; },
 DriveApp: new Proxy({}, { get(){ externalCalls++; throw Error('Drive não deveria ser acessado'); } }),
 UrlFetchApp: {fetch(){externalCalls++;throw Error('HTTP não deveria ser acessado');}},
 RelCalIA_detectarCampos_(){externalCalls++;throw Error('IA não deveria ser acessada');}
};
vm.createContext(s);
const base = path.resolve(__dirname,'../apps-script-imports/portal_sgo_versao_cnpj_db');
for(const f of ['Config','Main']) vm.runInContext(fs.readFileSync(path.join(base,`SGO_RelCal_${f}.js`),'utf8'),s);
test('APIs diretas não contornam autenticação ou autorização do dispatch',()=>{
 for(const fn of ['apiConsultarCnpj','apiDetectarCampos','apiGerarDocumento','apiSalvarDocumento','apiListarDocumentosSalvos']) {
  for(const sid of [undefined,'CLIENTE','INVALIDA']) {
   assert.throws(()=>s['RelCal_'+fn]({html:'conteúdo',certificado:{base64:'fixture'}},sid),/Sessão|equipe interna/);
   assert.throws(()=>s.RelCal_apiDispatch({fn,sessionId:sid,payload:{}}),/Sessão|equipe interna/);
  }
 }
 assert.equal(externalCalls,0);
});
test('dispatch encaminha sessão às APIs e mantém ping de catálogo',()=>{
 assert.equal(s.RelCal_apiDispatch({fn:'apiPing',sessionId:'QA'}).ok,true);
 assert.equal(s.RelCal_apiDispatch({fn:'apiDetectarCampos',sessionId:'QA',payload:{}}).campos,null);
 assert.throws(()=>s.RelCal_apiDispatch({fn:'apiSalvarDocumento',sessionId:'QA',payload:{}}),/Nenhum conteúdo/);
});
