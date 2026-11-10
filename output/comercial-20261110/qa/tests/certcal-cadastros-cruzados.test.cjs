const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
// Simulacros fiéis de Session/Utilities: o formatDate antigo devolvia sempre '08/10/2026' em qualquer formato e a
// trava de data no futuro (compara 'yyyy-MM-dd') recusava todas as calibrações.
const gas=require('./_simulacros_gas.cjs');
const fixture=require('./fixtures/certcal-cadastros-20261008-anonimizados.json');
const root=path.resolve(__dirname,'../apps-script-imports/portal_sgo_versao_cnpj_db');
const tables={CAD_CLIENTES:fixture.clientes,CAD_UNIDADES:fixture.unidades,CAD_EQUIPAMENTOS:fixture.equipamentos};
const s={exigirSessao:()=>({perfil:'TECNICO',usuario:'qa'}),SGO_CFG:{SHEETS:{CAD_CLIENTES:'CAD_CLIENTES',CAD_UNIDADES:'CAD_UNIDADES',CAD_EQUIPAMENTOS:'CAD_EQUIPAMENTOS',CAD_TECNICOS:'CAD_TECNICOS'}},SGO_UTILS:{safe:v=>String(v??'').trim(),safeUpper:v=>String(v??'').trim().toUpperCase(),formatCnpj:v=>v||'',cnpjArmazenado:v=>String(v||'').replace(/\D/g,'')},SGO_DATA:{getById:(table,id)=>(tables[table]||[]).find(r=>r.ID===id)},Session:gas.criarSession(),Utilities:gas.criarUtilities()};
vm.createContext(s);
for(const file of ['SGO_CertCal_Config.js','SGO_CertCal_Calculo.js','SGO_Vinculos.js','SGO_CertCal_Main.js'])vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),s);
let accepted=0,blocked=[];
for(const e of fixture.equipamentos){
  const payload={clienteId:e.CLIENTE_ID,equipamentoId:e.ID,tecnicoExecutorLivre:'Executor de teste',dataCalibracao:'08/10/2026',blocos:[{titulo:'Grandeza sintética de teste',unidade:'unidade QA',padroesIds:['PAD'],pontos:[{nominal:10,leituras:[9,10,11]}]}]};
  try{const ctx=s.CertCal_montarContexto_('QA',payload,{PAD:{ID:'PAD',TAG:'PAD-QA',INCERTEZA_U95:1,FATOR_K:2,VEFF:0}});assert.equal(ctx.equipamento.id,e.ID);assert.equal(ctx.equipamento.descricao,e.TIPO);assert.equal(ctx.cliente.id,e.CLIENTE_ID);assert.equal(ctx.blocos[0].resultados.length,1);accepted++;}
  catch(err){assert.match(err.message,/unidade.*cliente|vínculo/i);blocked.push(e.row);}
}
assert.equal(accepted,391);assert.deepEqual(blocked,[25,26,27,28,29,30,31,32,33]);
console.log('PASS: 400 cadastros reais anonimizados cruzados com contexto e vínculo reais; 391 coerentes, 9 divergentes bloqueados. Não valida método físico nem PDF Google.');
