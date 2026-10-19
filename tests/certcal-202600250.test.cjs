const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('node:assert/strict');
const base=path.resolve(__dirname,'../apps-script-imports/portal_sgo_versao_cnpj_db'),s={};
for(const f of ['SGO_DocA4.js','SGO_RelTecA4.js','SGO_RelTecIA.js','SGO_CertCal_Config.js','SGO_CertCal_Calculo.js','SGO_CertCal_Documento.js','SGO_CertCal_IA.js'])vm.runInNewContext(fs.readFileSync(path.join(base,f),'utf8'),s);
const fixture=require('./fixtures/certcal-202600250.json');
// O PDF de origem (fixture) não tinha separador de milhar; desde 18/10 os documentos saem no padrão pt-BR
// "1.009,30" (docs/DOCUMENTOS_PADRAO_A4_20261018.md, SGO_DocA4_num_). Compara com o milhar aplicado ao valor do PDF.
const milharPtBr=v=>String(v).replace(/^(-?)(\d+)((?:,\d+)?)$/,(m,sg,i,d)=>sg+i.replace(/\B(?=(\d{3})+(?!\d))/g,'.')+d);
let count=0;const blocos=fixture.blocos.map(b=>{
  const r=s.CertCalCalculo.calcularBloco(b.pontos,[b.fonte]);
  b.pontos.forEach((p,i)=>{
    const point=r.resultados[i];
    for(const key of ['nominal','media','tendencia','incertezaPadraoCombinada','incertezaU95','veff','k','erroMaximo'])assert.ok(Math.abs(point[key]-b.snapshot[i][key])<=1e-10*Math.max(1,Math.abs(point[key])),b.titulo+' '+p.nominal+' precisão integral '+key);
    for(const [key,pdf] of [['media','media'],['tendencia','tendencia'],['incertezaU95','u95'],['veff','veff'],['erroMaximo','soma']])assert.equal(s.CertCalDoc_num_(point[key]),milharPtBr(p[pdf]),b.titulo+' '+p.nominal+' '+key);
    assert.equal(point.erroMaximo,Math.abs(point.tendencia)+point.incertezaU95);
    count++;
  });
  return {...r,titulo:b.titulo,unidade:b.unidade,numLeituras:3,padroesUsados:[]};
});
const ctx={numeroCertificado:fixture.numeroCertificado,dataCalibracao:fixture.dataCalibracao,cliente:{razaoSocial:'Caso de regressão'},equipamento:{descricao:'Centrífuga',tag:fixture.tag},blocos,proximaCalibracao:{solicitada:false}};
const texts=s.CertCalIA_gerarRelatorioInterpretativo_(ctx),certificate=s.CertCalDoc_montarDocumentoHtml_(ctx),report=s.CertCalDoc_montarRelatorioInterpretativoHtml_(ctx,texts,[]);
for(const b of blocos)for(const r of b.resultados)for(const k of ['nominal','media','tendencia','incertezaU95','veff','k','erroMaximo']){
  const v=s.CertCalDoc_num_(r[k]);assert.ok(certificate.includes(v));
}
// Desde 17/10 o texto padrão do interpretativo não repete a tabela do certificado (CertCalIA_textoPadraoInterpretativo_):
// resume cada grandeza pelas faixas e leva à conclusão o maior |tendência| + U95. Confere as faixas, o valor decisivo
// e que nenhum número citado deixa de constar do certificado.
for(const b of blocos){
  const f=k=>b.resultados.map(r=>r[k]);
  for(const k of ['tendencia','incertezaU95'])for(const x of [Math.min(...f(k)),Math.max(...f(k))])assert.ok(texts.resultadosExplicados.includes(s.CertCalDoc_num_(x)),b.titulo+' faixa '+k);
  assert.ok(texts.conclusaoTecnica.includes(s.CertCalDoc_num_(Math.max(...f('erroMaximo')))),b.titulo+' valor decisivo');
}
const fora=s.RelTecIA_numerosForaDaLista_(texts.resultadosExplicados+'\n'+texts.conclusaoTecnica,certificate.match(/-?\d+(?:\.\d{3})*,\d+/g));
assert.equal(fora.length,0,'números do texto fora do certificado: '+fora.join('; '));
for(const i of [0,2]){
  const r=blocos[1].resultados[i],sum=Number(s.CertCalDoc_num_(Math.abs(r.tendencia)).replace(',','.'))+Number(s.CertCalDoc_num_(r.incertezaU95).replace(',','.'));
  assert.notEqual(sum.toFixed(2),r.erroMaximo.toFixed(2));
}
assert.ok(report.includes('202600250'));assert.equal(count,9);
console.log('OK: 202600250, cinco pontos RPM e quatro tempo; resultados do PDF reproduzidos, cálculos íntegros e ambos documentos coerentes.');
