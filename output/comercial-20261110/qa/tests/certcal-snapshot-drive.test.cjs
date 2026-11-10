const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const base=path.join(__dirname,'../apps-script-imports/portal_sgo_versao_cnpj_db');
const gas=require('./_simulacros_gas.cjs');
function ambiente(){
 const files=[],eventos=[];let registro;
 const ctx=vm.createContext({SGO_UTILS:{safe:v=>String(v||'').trim(),safeUpper:v=>String(v||'').toUpperCase()},exigirSessao:()=>({usuario:'QA'}),SGO_CFG:{SHEETS:{CERT_CALIBRACAO:'cert'}},
 // Session e Utilities.formatDate fiéis (nome do documento com data/hora); blob com setDataFromString/setContentType para a cópia .html (SGO_DocSalvar).
 Session:gas.criarSession(),Utilities:gas.criarUtilities({newBlob:(data,mime,name)=>({data,mime,name,getAs(){return this},setName(){return this},setDataFromString(d){this.data=d;return this},setContentType(m){this.mime=m;return this}})}),MimeType:{PDF:'pdf',HTML:'text/html'},
 DriveApp:{Access:{ANYONE_WITH_LINK:'link',PRIVATE:'private'},Permission:{VIEW:'view',NONE:'none'},getFileById:id=>{const f=files.find(f=>f.id===id);if(!f)throw Error('Não encontrado');return f;}},
 SGO_DATA:{normalizarObjetoParaSheet:(_,r)=>r,gerarRegistroBase:r=>({...r,ID:'CERT'}),getSheet:()=>({getLastRow:()=>1,getMaxRows:()=>10}),getHeaders:()=>[],insert:(_,r)=>{if(r.DADOS_JSON.length>50000)throw Error('Limite Sheets');registro=r;return r;},getById:()=>registro,log(){}},
 SGO_DOCUMENTOS:{registrarDocumentoExistente(){}},Auvo_criarTarefa_(){},CertCalDoc_montarDocumentoHtml_:()=>'<html></html>',CertCalDoc_capturarDocumento_:()=>({logo:{data:'x'.repeat(1000000)}})});
 // Em produção todos os .js são carregados juntos: SGO_UTILS real, moldura A4 (RelTecA4_paginar_) e cópia HTML (SGO_DocSalvar_htmlAoLado_).
 for(const f of ['SGO_Utilis.js','SGO_DocA4.js','SGO_RelTecA4.js','SGO_DocSalvar.js','SGO_DocRevisao.js','SGO_CertCal_Revisao.js','SGO_CertCal_Main.js'])vm.runInContext(fs.readFileSync(path.join(base,f),'utf8'),ctx);
 const pasta={createFile:blob=>{const f={id:'file_snapshot_'+files.length,blob,trashed:false,getId(){return this.id},getUrl(){return 'https://drive.google.com/file/d/'+this.id+'/view'},isTrashed(){return this.trashed},setTrashed(v){this.trashed=v},getBlob(){return {getDataAsString:()=>this.blob.data}},setSharing(access){eventos.push(this.blob.mime+':'+access)}};files.push(f);return f;}};
 ctx.CertCal_bootstrap_=()=>{};ctx.CertCal_mapaPadroesAtivos_=()=>({});ctx.CertCal_proximoNumero_=()=> '202600250';ctx.CertCal_obterPastaCliente_=()=>pasta;ctx.CertCal_obterPastaSnapshots_=()=>pasta;
 ctx.CertCal_montarContexto_=()=>({numeroCertificado:'202600250',cliente:{id:'C',razaoSocial:'Cliente'},equipamento:{id:'E',tag:'CENT'},blocos:[{titulo:'Rotação',unidade:'rpm',resultados:[{},{}]}],proximaCalibracao:{solicitada:false}});
 return {ctx,pasta,files,eventos,registro:()=>registro};
}
test('emissão real com logo de um milhão de caracteres salva referência compacta e JSON privado completo',()=>{
 const a=ambiente();const r=a.ctx.CertCal_apiGerarCertificado('QA',{});assert.equal(r.ok,true);
 const row=a.registro(),ref=JSON.parse(row.DADOS_JSON);assert.equal(ref.snapshotVersion,1);assert.ok(row.DADOS_JSON.length<45000);
 assert.equal(ref.blocos[0].quantidadePontos,2);const loaded=a.ctx.CertCal_lerSnapshot_(row);assert.equal(loaded.documento.logo.data.length,1000000);
 assert.ok(a.files.find(f=>f.blob.mime==='application/json').blob.data.length>999184);
 assert.deepEqual(a.eventos,['application/json:private','text/html:link']);
});
test('JSON legado direto é lido sem consulta Drive e mantém dados',()=>{
 const a=ambiente();const legacy=a.ctx.CertCal_montarContexto_();const row={DADOS_JSON:JSON.stringify(legacy),NUMERO_CERTIFICADO:'202600250',CLIENTE_ID:'C',EQUIPAMENTO_ID:'E'};
 assert.equal(a.ctx.CertCal_lerSnapshot_(row).equipamento.tag,'CENT');assert.equal(a.files.length,0);
});
test('referência inválida, ausente, removida e conteúdo divergente são rejeitados',()=>{
 const a=ambiente();a.ctx.CertCal_apiGerarCertificado('QA',{});const row=a.registro(),ref=JSON.parse(row.DADOS_JSON);
 for(const patch of [{snapshotVersion:2},{snapshotFileId:'bad'},{snapshotFileId:'file_missing_123'}])assert.throws(()=>a.ctx.CertCal_lerSnapshot_({...row,DADOS_JSON:JSON.stringify({...ref,...patch})}));
 assert.throws(()=>a.ctx.CertCal_lerSnapshot_({...row,NUMERO_CERTIFICADO:'OUTRO'}));
 assert.throws(()=>a.ctx.CertCal_lerSnapshot_({...row,CLIENTE_ID:'OUTRO'}));
 assert.throws(()=>a.ctx.CertCal_lerSnapshot_({...row,EQUIPAMENTO_ID:'OUTRO'}));
 const file=a.files.find(f=>f.id===ref.snapshotFileId);file.trashed=true;assert.throws(()=>a.ctx.CertCal_lerSnapshot_(row));file.trashed=false;
 const bad=JSON.parse(file.blob.data);bad.cliente.id='OUTRO';file.blob.data=JSON.stringify(bad);assert.throws(()=>a.ctx.CertCal_lerSnapshot_(row),/referência salva/);
});
test('falha de persistência descarta PDF e snapshot privado complementar',()=>{
 const a=ambiente();a.ctx.SGO_DATA.insert=()=>{throw Error('Sheets falhou')};assert.throws(()=>a.ctx.CertCal_apiGerarCertificado('QA',{}),/persistência/);
 assert.equal(a.files.length,2);assert.ok(a.files.every(f=>f.trashed));assert.deepEqual(a.eventos,['application/json:private']);
});
test('desempenho contabiliza resumo sem recuperar JSON Drive',()=>{
 const a=ambiente();a.ctx.CertCal_apiGerarCertificado('QA',{});a.ctx.SGO_CFG.SHEETS.CAD_CLIENTES='cli';a.ctx.SGO_CFG.SHEETS.CAD_EQUIPAMENTOS='eq';
 a.ctx.SGO_DATA.getAll=sheet=>sheet==='cert'?[a.registro()]:[];a.ctx.DriveApp.getFileById=()=>{throw Error('Não deve ler Drive')};
 vm.runInContext(fs.readFileSync(path.join(base,'SGO_CertCal_GestaoRelatorios.js'),'utf8'),a.ctx);
 a.ctx.CertCalGest_contextoPadroes_=()=>({total:0,contagens:{},comErros:0});assert.equal(a.ctx.CertCalGest_contextoDesempenho_(0).pontosCalibrados,2);
});
test('falha ao tornar JSON privado impede persistência/publicação e limpa os dois artefatos',()=>{
 const a=ambiente();const criar=a.pasta.createFile;a.pasta.createFile=blob=>{const f=criar(blob);if(blob.mime==='application/json')f.setSharing=()=>{throw Error('Privacidade recusada')};return f;};
 assert.throws(()=>a.ctx.CertCal_apiGerarCertificado('QA',{}),/Privacidade recusada/);
 assert.ok(a.files.every(f=>f.trashed));assert.equal(a.registro(),undefined);assert.deepEqual(a.eventos,[]);
});
test('pasta de snapshots nasce na raiz privada e não na árvore do cliente',()=>{
 const a=ambiente();const prefs={};const events=[];const folder={getId:()=> 'folder_snapshot_1',setSharing:(access,permission)=>events.push([access,permission])};
 a.ctx.PropertiesService={getScriptProperties:()=>({getProperty:k=>prefs[k],setProperty:(k,v)=>prefs[k]=v})};
 a.ctx.DriveApp.getRootFolder=()=>({createFolder:n=>{events.push(n);return folder}});a.ctx.DriveApp.getFolderById=id=>{assert.equal(id,'folder_snapshot_1');return folder};
 vm.runInContext(fs.readFileSync(path.join(base,'SGO_CertCal_Main.js'),'utf8'),a.ctx);
 assert.equal(a.ctx.CertCal_obterPastaSnapshots_(),folder);assert.equal(prefs.CERTCAL_SNAPSHOTS_FOLDER_ID,'folder_snapshot_1');
 assert.equal(a.ctx.CertCal_obterPastaSnapshots_(),folder);assert.equal(events.filter(e=>typeof e==='string').length,1);
 assert.deepEqual(events.slice(1),[['private','none'],['private','none']]);
});
