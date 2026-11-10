const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const fixture=require('./fixtures/certcal-202600250.json');
const certs=[{CLIENTE_ID:'C',EQUIPAMENTO_ID:'E',DADOS_JSON:JSON.stringify({blocos:fixture.blocos.map(b=>({titulo:b.titulo,unidade:b.unidade,resultados:b.snapshot}))})}];
const s={SGO_UTILS:{safe:v=>String(v||'').trim(),safeUpper:v=>String(v||'').trim().toUpperCase()},SGO_CFG:{SHEETS:{CERT_CALIBRACAO:'cert',CAD_CLIENTES:'cli',CAD_EQUIPAMENTOS:'eq',CAD_PADROES:'pad'}},SGO_DATA:{getAll:sheet=>sheet==='cert'?certs:[]},Utilities:{formatDate:()=> '08/10/2026'},Session:{getScriptTimeZone:()=> 'America/Sao_Paulo'}};
vm.runInNewContext(fs.readFileSync(path.resolve(__dirname,'../apps-script-imports/portal_sgo_versao_cnpj_db/SGO_CertCal_GestaoRelatorios.js'),'utf8'),s);
let ctx=s.CertCalGest_contextoDesempenho_(0);
// Desde 18/10 (157d735, docs/DOCUMENTOS_FRENTE_B_20261018.md) "Pontos calibrados por grandeza" conta pontos, não blocos.
assert.equal(ctx.pontosCalibrados,9);assert.equal(ctx.grandezas.Tempo,4);assert.equal(ctx.grandezas['Rotação/velocidade'],5);
certs.push({DADOS_JSON:JSON.stringify({blocos:[{titulo:'Tempo',unidade:'s',pontos:[{},{}]}]})});
assert.equal(s.CertCalGest_contextoDesempenho_(0).pontosCalibrados,11);
assert.equal(s.CertCalGest_grandeza_('Cronômetro'),'Tempo');
assert.equal(s.CertCalGest_grandeza_('Temperatura °C'),'Temperatura');
assert.equal(s.CertCalGest_grandeza_('Massa g'),'Massa');
assert.equal(s.CertCalGest_grandeza_('Balança'),'Massa');
assert.equal(s.CertCalGest_grandeza_('Manômetro'),'Pressão');
console.log('PASS: gestão cruza 9 pontos do snapshot, grandeza Tempo e legado pontos.');
