const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const source=fs.readFileSync(path.resolve(__dirname,'../apps-script-imports/portal_sgo_versao_cnpj_db/JS_Core.html'),'utf8');
function extract(name){const start=source.indexOf('  function '+name+'(');assert(start>=0);const end=source.indexOf('\n  function ',start+1);return source.slice(start,end).split('\n  //')[0];}
(async()=>{
 const elements={mob_cc_btn_gerar:{},mob_cc_gerar_status:{},mob_cc_btn_relatorio:{},mob_cc_relatorio_status:{}};
 const calls=[];
 const s={MOBILE_CERTCAL:{cliente:{ID:'C'},equipamento:{ID:'E'},dados:{},blocos:[],fotos:[]},document:{getElementById:id=>elements[id]},escapeHtml_:v=>String(v),window:{open:()=>null},alert:msg=>{throw Error(msg)},mobileCertCalChamarApi_:(fn,payload)=>{calls.push({fn,payload});return Promise.resolve({certificadoId:'CERT-1',numeroCertificado:'QA-1',linkPdf:'https://fixture.invalid/pdf',html:'<p>QA</p>'});}};
 vm.createContext(s);for(const f of ['mobileCertCalGerar_','mobileCertCalGerarInterpretativo_'])vm.runInContext(extract(f),s);
 assert.throws(()=>s.mobileCertCalGerarInterpretativo_(),/Emita/);
 s.mobileCertCalGerar_();await new Promise(r=>setImmediate(r));
 assert.equal(s.MOBILE_CERTCAL.certificadoEmitidoId,'CERT-1');
 assert.ok(elements.mob_cc_gerar_status.innerHTML.includes('Gerar relatório interpretativo'));
 await s.mobileCertCalGerarInterpretativo_();
 assert.equal(calls[1].fn,'apiGerarRelatorioInterpretativo');assert.equal(calls[1].payload.certificadoId,'CERT-1');
 assert.ok(elements.mob_cc_relatorio_status.innerHTML.includes('https://fixture.invalid/pdf'));assert.equal(elements.mob_cc_btn_relatorio.disabled,false);
 s.mobileCertCalChamarApi_=()=>Promise.reject(Error('Falha simulada'));
 await s.mobileCertCalGerarInterpretativo_();assert.ok(elements.mob_cc_relatorio_status.textContent.includes('Falha simulada'));assert.equal(elements.mob_cc_btn_relatorio.disabled,false);
 s.mobileCertCalChamarApi_=()=>Promise.resolve({certificadoId:'CERT-2',numeroCertificado:'QA-2',linkPdf:'https://fixture.invalid/2',html:'',avisos:['Auditoria pendente']});
 s.mobileCertCalGerar_();await new Promise(r=>setImmediate(r));
 assert.ok(elements.mob_cc_gerar_status.innerHTML.includes('Auditoria pendente'));
 await s.mobileCertCalGerarInterpretativo_();
 assert.ok(elements.mob_cc_relatorio_status.innerHTML.includes('Auditoria pendente'));
 console.log('PASS: mobile emite certificado, conserva ID, chama interpretativo do mesmo registro e exibe pendências após salvamento.');
})().catch(e=>{console.error(e);process.exitCode=1;});
