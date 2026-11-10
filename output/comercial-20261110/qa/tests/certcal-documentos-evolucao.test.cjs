const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const base=path.resolve(__dirname,'../apps-script-imports/portal_sgo_versao_cnpj_db');const s={};vm.createContext(s);
for(const f of ['SGO_DocA4.js','SGO_RelTecA4.js','SGO_RelTecIA.js','SGO_CertCal_Config.js','SGO_CertCal_Calculo.js','SGO_CertCal_Documento.js','SGO_CertCal_IA.js'])vm.runInContext(fs.readFileSync(path.join(base,f),'utf8'),s);
// Simulacros fiéis do Apps Script: "Registrado em" sai em dd/MM/yyyy HH:mm no fuso do script (CertCalDoc_dataHora_).
{const g=require('./_simulacros_gas.cjs');s.Session=g.criarSession();s.Utilities=g.criarUtilities();}
// Tests exercise exact configured text independently from user-facing wording.
s.CERTCAL_CFG={...s.CERTCAL_CFG,PROXIMA_CALIBRACAO_SEM_DATA:s.CERTCAL_CFG.PROXIMA_CALIBRACAO_SEM_DATA||'Sem data solicitada pelo cliente.',PROXIMA_CALIBRACAO_COM_DATA:s.CERTCAL_CFG.PROXIMA_CALIBRACAO_COM_DATA||'Data indicada por solicitação do cliente.'};
const bloco={...s.CertCalCalculo.calcularBloco([{nominal:3000,leituras:[2999.15,2999.25,2999.35]},{nominal:5000,leituras:[5000.17,5000.18,5000.19]}],[{codigo:'RPM',incertezaU95:0.12,fatorK:2,veff:0}]),titulo:'Rotação',unidade:'rpm',numLeituras:3,fontesIncerteza:[],padroesUsados:[]};
const baseCtx={cliente:{razaoSocial:'Hospital Teste',cnpj:'12.345.678/0001-90'},equipamento:{descricao:'Centrífuga',tag:'CENT-001',fabricante:'Fabricante Teste',modelo:'Modelo Teste',serie:'SERIE-001'},blocos:[bloco],numeroCertificado:'QA-2026-001',dataCalibracao:'08/10/2026',dataEmissao:'08/10/2026',localCalibracao:'LABORATORIO',tecnicoExecutor:'Técnico Teste'};
const render=ctx=>{const txt=s.CertCalIA_gerarRelatorioInterpretativo_(ctx);return {cert:s.CertCalDoc_montarDocumentoHtml_(ctx),rel:s.CertCalDoc_montarRelatorioInterpretativoHtml_(ctx,txt,[]),txt};};
const nao={...baseCtx,proximaCalibracao:{solicitada:false}};
const sim={...baseCtx,proximaCalibracao:{solicitada:true,data:'08/10/2027',solicitante:'Maria <Qualidade>',cargoSetor:'Qualidade',referencia:'E-mail de solicitação',observacao:'Intervalo definido pelo cliente',registradoPor:{userId:'USER-123',usuario:'colaborador.teste',nome:'Colaborador Teste'},registradoEm:'2026-10-08T13:15:00.000Z'}};
for(const [name,ctx]of[['nao',nao],['sim',sim]]) {
 const before=JSON.stringify(ctx),r=render(ctx);assert.equal(JSON.stringify(ctx),before);
 for(const h of [r.cert,r.rel]) {
  assert.ok(!h.includes('Data de validade:'));assert.ok(!h.includes('nas laboratório'));assert.ok(!/aprovado|reprovado/i.test(h));
  assert.ok(h.includes('12.345.678/0001-90'));assert.ok(h.includes('SERIE-001'));
  if(name!=='sim')assert.ok(!h.includes('08/10/2027'));
 }
 // Padrão A4 de 18/10 (commit 157d735, docs/DOCUMENTOS_FRENTE_B_20261018.md: "Próxima calibração três vezes no interpretativo"
 // retirada): o texto configurado e a solicitação ficam só no certificado; o interpretativo traz uma linha de resumo.
 assert.ok(r.cert.includes(ctx.proximaCalibracao.solicitada?s.CERTCAL_CFG.PROXIMA_CALIBRACAO_COM_DATA:s.CERTCAL_CFG.PROXIMA_CALIBRACAO_SEM_DATA));
 assert.ok(!r.rel.includes(s.CERTCAL_CFG.PROXIMA_CALIBRACAO_COM_DATA)&&!r.rel.includes(s.CERTCAL_CFG.PROXIMA_CALIBRACAO_SEM_DATA));
 if(name==='sim'){
  assert.ok(r.cert.includes('<td class="rotulo">Data informada pelo contratante</td><td>08/10/2027</td>'));
  assert.ok(r.cert.includes('Maria &lt;Qualidade&gt;'));assert.ok(r.cert.includes('Colaborador Teste'));
  assert.ok(r.cert.includes('<td class="rotulo">Registrado em</td><td colspan="3">08/10/2026 10:15</td>'));
  assert.ok(r.rel.includes('Próxima calibração</td><td colspan="3">08/10/2027, data informada pelo contratante</td>'));
  assert.ok(!r.rel.includes('Maria &lt;Qualidade&gt;'));
 } else assert.ok(r.rel.includes('Não informada: a periodicidade é definida pelo contratante'));
 // k por ponto na tabela do certificado; o texto padrão (17/10) resume a faixa de k, preserva o sinal da tendência e
 // conclui pelo maior |tendência| + U95.
 for(const p of bloco.resultados)assert.ok(r.cert.includes('<td class="num">'+s.CertCalDoc_num_(p.k)+'</td>'));
 const ks=bloco.resultados.map(p=>p.k);
 assert.ok(r.txt.resultadosExplicados.includes('com k de '+s.CertCalDoc_num_(Math.min(...ks))+' a '+s.CertCalDoc_num_(Math.max(...ks))));
 assert.ok(r.txt.resultadosExplicados.includes('A tendência ficou entre -0,75 e 0,18'));
 assert.ok(r.txt.conclusaoTecnica.includes('maior |tendência| + U95: Rotação, 0,94 rpm no ponto de 3.000,00 rpm'));
 // Fecho com as assinaturas num bloco que não se parte (RelTecA4_css_: .reltec-fecho com break-inside:avoid).
 assert.ok(r.cert.includes('<div class="reltec-fecho">'));assert.ok(s.RelTecA4_css_().includes('.reltec-fecho{break-inside:avoid;page-break-inside:avoid}'));
 assert.ok(r.rel.includes('Documento complementar ao Certificado de Calibração nº QA-2026-001'));assert.ok(r.rel.includes('prevalece o certificado'));
 if(process.argv.includes('--fixtures')){fs.mkdirSync(path.resolve(__dirname,'../tmp'),{recursive:true});for(const[k,h]of Object.entries({certificado:r.cert,relatorio:r.rel}))fs.writeFileSync(path.resolve(__dirname,'../tmp/certcal-evolucao-'+name+'-'+k+'.html'),h);}
}
const legado={...baseCtx,dataValidade:'31/12/2026'},l=render(legado);
assert.ok(l.cert.includes('Data de validade registrada no documento histórico: 31/12/2026'));assert.ok(l.rel.includes('31/12/2026 (registro histórico)'));
for(const h of[l.cert,l.rel])assert.ok(!h.includes('Data solicitada pelo cliente'));
const mixed=render({...sim,dataValidade:'31/12/2026'});assert.ok(!mixed.cert.includes('31/12/2026'));
// Quem registrou a solicitação aparece no certificado (o interpretativo não repete a solicitação desde 18/10).
for (const [actor,expected] of [[{usuario:'usuario-backend'},'usuario-backend'],[{userId:'USER-LEGADO'},'USER-LEGADO']]) {
 const ctx={...sim,proximaCalibracao:{...sim.proximaCalibracao,registradoPor:actor}};
 assert.ok(render(ctx).cert.includes(expected));
}
const compat=render({...sim,proximaCalibracao:{...sim.proximaCalibracao,registradoPor:undefined,colaborador:'Colaborador legado'}});
assert.ok(compat.cert.includes('Colaborador legado'));
console.log('CertCal evolução: próxima calibração SIM/NÃO, legado, literal config, metadados, K por ponto, sinal e preservação de contexto passed.');
