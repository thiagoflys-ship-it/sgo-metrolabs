const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const path = require('node:path');
const base = path.resolve(__dirname, '../apps-script-imports/portal_sgo_versao_cnpj_db');
const sandbox = {};
vm.createContext(sandbox);
for (const file of ['SGO_DocA4.js','SGO_RelTecA4.js','SGO_RelTecIA.js','SGO_CertCal_Config.js','SGO_CertCal_Calculo.js','SGO_CertCal_Documento.js','SGO_CertCal_IA.js']) vm.runInContext(fs.readFileSync(path.join(base,file),'utf8'), sandbox);
const num = sandbox.CertCalDoc_num_;
for (const [value, expected] of [[0,'0,00'],[0.000001,'0,00'],[-0.0001,'0,00'],[2,'2,00'],[1.234567,'1,23'],['1,234','1,23'],[null,'—'],['','—'],[false,'—'],[Infinity,'—']]) assert.equal(num(value),expected);
// Desde 14/10 (commit 211e3de) o Veff tem formatador único: pt-BR com milhar e 2 casas, e "∞" para 0, infinito ou >= 10.000.
assert.equal(sandbox.CertCalDoc_veff_(1234.567),'1.234,57');
assert.equal(sandbox.CertCalDoc_veff_(242753796.61),'∞');
assert.equal(sandbox.CertCalDoc_veff_(Infinity),'∞');
assert.equal(sandbox.CertCalDoc_veff_(null),'—');
const block = Object.assign(sandbox.CertCalCalculo.calcularBloco([{nominal:3000,leituras:[2999.12345,3000.23456,3001.34567]},{nominal:5000,leituras:[4998.67891,5000.12345,5001.56789]}],[{codigo:'RPM-01',incertezaU95:0.1,fatorK:2,veff:0}]), {titulo:'Rotação',unidade:'rpm',numLeituras:3,fontesIncerteza:[{codigo:'RPM-01',incertezaU95:0.1,fatorK:2,veff:0}],padroesUsados:[]});
const ctx = {cliente:{razaoSocial:'Cliente de teste'},equipamento:{descricao:'Centrífuga',tag:'CENT-TESTE'},blocos:[block],numeroCertificado:'TESTE-2026',dataCalibracao:'08/10/2026',dataEmissao:'08/10/2026',localCalibracao:'CLIENTE',veredito:'APROVADO'};
const before = JSON.stringify(ctx);
const texts = sandbox.CertCalIA_gerarRelatorioInterpretativo_(ctx);
const html = sandbox.CertCalDoc_montarDocumentoHtml_(ctx);
const report = sandbox.CertCalDoc_montarRelatorioInterpretativoHtml_(ctx,texts,[]);
assert.equal(JSON.stringify(ctx),before,'Document rendering must not change canonical precision');
assert.ok(!/aprovado|reprovado/i.test(html));
assert.ok(!/aprovado|reprovado/i.test(report));
for (const row of block.resultados) for (const k of ['nominal','media','tendencia','incertezaU95','erroMaximo']) {
 assert.ok(html.includes(num(row[k])));
}
// O texto padrão do interpretativo (17/10) não repete a tabela do certificado: cita as faixas de tendência e U95
// de cada grandeza e, na conclusão, o maior |tendência| + U95; nenhum número citado pode faltar no certificado.
for (const k of ['tendencia','incertezaU95']) for (const x of block.resultados.map(r=>r[k])) assert.ok(texts.resultadosExplicados.includes(num(x)));
assert.ok(texts.conclusaoTecnica.includes(num(Math.max(...block.resultados.map(r=>r.erroMaximo)))));
{ const fora = sandbox.RelTecIA_numerosForaDaLista_(texts.resultadosExplicados+'\n'+texts.conclusaoTecnica, html.match(/-?\d+(?:\.\d{3})*,\d+/g)); assert.equal(fora.length,0,fora.join('; ')); }
assert.ok(!report.includes('2999.12345'));
assert.ok(report.includes('setor de qualidade do cliente'));
const four = {...block,numLeituras:4,resultados:[{...block.resultados[0],leituras:[1,2,3,4]}]};
// Coluna renomeada "Ensaio N" → "Leitura N" no padrão A4 de 17/10 (commit 36e3757).
assert.ok(sandbox.CertCalDoc_montarTabelaResultados_(four).includes('<th>Leitura 4</th>'));
assert.throws(()=>sandbox.CertCalIA_gerarRelatorioInterpretativo_({blocos:[]}),/Nenhum resultado/);
// Decorative photo captions must never introduce new measurement values or verdicts.
sandbox.PropertiesService = {getScriptProperties:()=>({getProperty:key=>key==='GEMINI_API_KEY'?'test-key':key==='IA_MODEL_FALLBACKS'?'test-model':''})};
let caption = 'Vista do equipamento durante o ensaio.';
sandbox.UrlFetchApp = {fetch:()=>({getResponseCode:()=>200,getContentText:()=>JSON.stringify({candidates:[{content:{parts:[{text:caption}]}}]})})};
assert.equal(sandbox.CertCalIA_analisarFoto_('test-base64','image/png','Centrífuga'),caption);
for (caption of ['Rotação de 3000 rpm.','Equipamento aprovado.','Equipamento conforme.']) assert.equal(sandbox.CertCalIA_analisarFoto_('test-base64','image/png','Centrífuga'),'');
if (process.argv.includes('--fixtures')) {
 fs.mkdirSync(path.resolve(__dirname,'../tmp'),{recursive:true});
 fs.writeFileSync(path.resolve(__dirname,'../tmp/certcal-certificado-qa.html'),html);
 fs.writeFileSync(path.resolve(__dirname,'../tmp/certcal-relatorio-qa.html'),report);
}
console.log('CertCal documents: decimal formatting, canonical consistency, finite Veff, no verdict, precision and dynamic columns passed.');
