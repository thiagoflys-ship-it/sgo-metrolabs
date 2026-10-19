const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const base = path.resolve(__dirname, '../apps-script-imports/portal_sgo_versao_cnpj_db');
// SGO_UTILS real (SGO_Utilis.js): o simulacro antigo só tinha safe() e o CertCal usa safeUpper e outros.
const s = vm.createContext({});
vm.runInContext(fs.readFileSync(path.join(base,'SGO_Utilis.js'),'utf8'),s);s.SGO_UTILS=vm.runInContext('SGO_UTILS',s);
for (const f of ['SGO_DocA4.js','SGO_RelTecA4.js','SGO_RelTecIA.js','SGO_CertCal_Config.js','SGO_CertCal_Calculo.js','SGO_DocSalvar.js','SGO_CertCal_Main.js','SGO_CertCal_Documento.js','SGO_CertCal_IA.js','SGO_RelCal_Config.js','SGO_RelCal_IA.js']) vm.runInContext(fs.readFileSync(path.join(base,f),'utf8'),s);
// Independent physical scenarios: units and references are fixtures, never inferred by the generic motor.
const temperature=['Temperatura','°C',[28,37,50],0.15];
const profiles={TERMOMETRO:[temperature], BANHO_MARIA_BANCADA:[temperature], TERMOHIGROMETRO:[temperature,['Umidade relativa','%UR',[30,50,70],0.8]], INCUBADORA_TESTES_BIOLOGICOS:[['Temperatura','°C',[37,56,60],0.15]], ESTUFA_INCUBACAO:[temperature], BALANCA:[['Massa','g',[0,100,500],0.002]], CENTRIFUGA:[['Tempo','s',[60,120,300],0.1],['Rotação','rpm',[1000,3000,5000],4]], CENTRIFUGA_REFRIGERADA:[['Tempo','s',[60,120,300],0.1],['Rotação','rpm',[1000,3000,5000],4],['Temperatura','°C',[4,10,20],0.15]], ESFIGMOMANOMETRO:[['Pressão','mmHg',[0,100,200],0.5]]};
for(const [code,dimensions] of Object.entries(profiles)) test(`${code}: motor real, certificado e interpretativo com todas grandezas`,()=>{
  assert.ok(s.RELCAL_CFG.INSTRUMENTOS[code]);
  const standards={},payload=dimensions.map(([titulo,unidade,nominals,u],i)=>{
    standards[i]={ID:String(i),TAG:`PAD-${i}`,DESCRICAO:titulo,INCERTEZA_U95:u,FATOR_K:2,VEFF:0,VALIDADE:'08/10/2027',CERTIFICADO_NUMERO:`PAD-2026-${i}`};
    return {titulo,unidade,padroesIds:[String(i)],pontos:nominals.map(n=>({nominal:n,leituras:[n+0.123456,n+0.123456,n+0.123456]}))};
  });
  const blocks=s.CertCal_calcularBlocos_(payload,standards);
  const ctx={numeroCertificado:'QA-2026',dataCalibracao:'08/10/2026',cliente:{razaoSocial:'Cliente QA'},equipamento:{descricao:s.RELCAL_CFG.INSTRUMENTOS[code].label,tag:code},blocos:blocks,veredito:'APROVADO'};
  const snapshot=JSON.stringify(ctx),texts=s.CertCalIA_gerarRelatorioInterpretativo_(ctx),html=s.CertCalDoc_montarDocumentoHtml_(ctx),report=s.CertCalDoc_montarRelatorioInterpretativoHtml_(ctx,texts,[]);
  assert.equal(JSON.stringify(ctx),snapshot);
  assert.doesNotMatch(html+report,/aprovado|reprovado/i);
  for(let i=0;i<blocks.length;i++){
    const b=blocks[i],u=dimensions[i][3];
    assert.ok(html.includes(b.titulo)); assert.ok(texts.resultadosExplicados.includes(`${b.titulo} (${b.unidade})`));
    // Casas decimais do bloco: no mínimo 2 e as necessárias para a menor U95 (padrão A4 de 17/10, CertCalDoc_casasBloco_).
    const cb=s.CertCalDoc_casasBloco_(b);
    for(const r of b.resultados){
      assert.ok(Math.abs(r.media-r.nominal-0.123456)<1e-10);
      assert.ok(Math.abs(r.incertezaPadraoCombinada-u/2)<1e-10);
      for(const k of ['nominal','media','tendencia','incertezaU95','erroMaximo']){
        const value=s.CertCalDoc_num_(r[k],cb); assert.match(value,/^-?\d{1,3}(\.\d{3})*,\d{2,6}$/);assert.ok(html.includes(value));
      }
      // Sem resolução informada, ela é deduzida das leituras (0,000001 aqui, docs/RELATORIOS_A4_TECNICOS_20261017.md) e o
      // documento mostra 6 casas; nunca o número cru do JavaScript nem casas além das do bloco.
      assert.doesNotMatch(report,/0\.123456|0,1234560/);
    }
    // O texto padrão do interpretativo (17/10) resume a grandeza pelas faixas, sem repetir a tabela do certificado.
    const faixa=k=>b.resultados.map(r=>r[k]);
    for(const k of ['tendencia','incertezaU95'])for(const x of [Math.min(...faixa(k)),Math.max(...faixa(k))])assert.ok(texts.resultadosExplicados.includes(s.CertCalDoc_num_(x,cb)),b.titulo+' faixa '+k);
    assert.ok(texts.conclusaoTecnica.includes(s.CertCalDoc_num_(Math.max(...faixa('erroMaximo')),cb)),b.titulo+' valor decisivo');
  }
  const fora=s.RelTecIA_numerosForaDaLista_(texts.resultadosExplicados+'\n'+texts.conclusaoTecnica,html.match(/-?\d+(?:\.\d{3})*,\d+/g));
  assert.equal(fora.length,0,'números do texto fora do certificado: '+fora.join('; '));
  // Real public emission + persisted snapshot + public interpretative emission.
  // Apps Script storage/PDF services are mocked; this does not verify Google's PDF converter.
  let persisted, converted=[];
  s.exigirSessao=()=>({usuario:'QA',userId:'QA'});s.CertCal_bootstrap_=()=>{};
  s.CertCal_mapaPadroesAtivos_=()=>standards;s.CertCal_proximoNumero_=()=> 'QA-2026';
  s.CertCal_obterPastaCliente_=()=>({createFile:()=>({setSharing(){},getUrl:()=> 'https://fixture.invalid/pdf'})});
  // Simulacro fiel de formatDate: o antigo devolvia sempre '08/10/2026' em qualquer formato, e a trava de data no
  // futuro (compara 'yyyy-MM-dd') recusava a calibração.
  const gas=require('./_simulacros_gas.cjs');
  s.Session=gas.criarSession();
  s.Utilities=gas.criarUtilities({newBlob:html=>({getAs(){converted.push(html);return this},setName(){return this}})});
  s.MimeType={PDF:'pdf'};s.DriveApp={Access:{ANYONE_WITH_LINK:'link'},Permission:{VIEW:'view'}};
  s.SGO_UTILS.formatCnpj=v=>v;s.SGO_VINCULOS={relation(){}};
  s.SGO_CFG={SHEETS:{CAD_CLIENTES:'cliente',CAD_EQUIPAMENTOS:'equip',CAD_UNIDADES:'unidade',CAD_TECNICOS:'tecnico',CERT_CALIBRACAO:'cert'}};
  s.SGO_DOCUMENTOS={registrarDocumentoExistente(){}};s.Auvo_criarTarefa_=()=>{};
  s.LockService={getScriptLock:()=>({waitLock(){},releaseLock(){}})};
  s.SGO_DATA={getById:(sheet)=>sheet==='cert'?persisted:sheet==='cliente'?{ID:'C',RAZAO_SOCIAL:'Cliente QA'}:sheet==='equip'?{ID:'E',CLIENTE_ID:'C',UNIDADE_ID:'U',TAG:code,TIPO:ctx.equipamento.descricao}:{ID:'U',CLIENTE_ID:'C'},normalizarObjetoParaSheet:(sheet,v)=>v,gerarRegistroBase:v=>({...v,ID:'CERT'}),getSheet:()=>({getLastRow:()=>1,getMaxRows:()=>10,getRange:()=>({setNumberFormat(){}})}),getHeaders:()=>[],insert:(sheet,v)=>persisted=v,update:(sheet,id,v)=>Object.assign(persisted,v),log(){}};
  assert.equal(s.CertCal_apiGerarCertificado('QA',{clienteId:'C',equipamentoId:'E',tecnicoExecutorLivre:'Executor QA',dataCalibracao:'08/10/2026',blocos:payload}).ok,true);
  const saved=persisted.DADOS_JSON;
  assert.equal(persisted.VEREDITO,'');
  assert.deepEqual(JSON.parse(saved).blocos,JSON.parse(snapshot).blocos);
  assert.equal(s.CertCal_apiGerarRelatorioInterpretativo('QA',{certificadoId:'CERT'}).ok,true);
  assert.equal(persisted.DADOS_JSON,saved);assert.equal(converted.length,2);
  for(const b of blocks)for(const r of b.resultados)for(const k of ['nominal','media','tendencia','incertezaU95','erroMaximo'])assert.ok(converted[0].includes(s.CertCalDoc_num_(r[k],s.CertCalDoc_casasBloco_(b))));
});
test('autodetecção oferece todos nove perfis e rejeita código desconhecido',()=>{
  s.PropertiesService={getScriptProperties:()=>({getProperty:k=>k==='GEMINI_API_KEY'?'mock':''})};
  let requested='',answer='';
  s.UrlFetchApp={fetch:(url,opts)=>{requested=JSON.parse(opts.payload).contents[0].parts[0].text;return {getResponseCode:()=>200,getContentText:()=>JSON.stringify({candidates:[{content:{parts:[{text:JSON.stringify({instrumento:answer})}]}}]})}}};
  for(const code of Object.keys(profiles)){answer=code;assert.equal(s.RelCalIA_detectarCampos_('fixture','application/pdf').instrumento,code);for(const expected of Object.keys(profiles))assert.ok(requested.includes(expected));}
  answer='INVENTADO';assert.equal(s.RelCalIA_detectarCampos_('fixture','application/pdf').instrumento,'');
});
test('relatório externo formata apenas colunas de medição e preserva identificação',()=>{
 vm.runInContext(fs.readFileSync(path.join(base,'SGO_RelCal_Documento.js'),'utf8'),s);
 const html=s.RelCalDoc_renderizarResultados_('Certificado 202600011, data 08/10/2026.\n\nNominal | Média | Número certificado\n1,23456 | 2 | 202600011');
 // Padrão A4 de 18/10 (157d735): colunas depois da primeira saem com class="num" (alinhadas à direita).
 assert.ok(html.includes('<td>1,23</td>'));assert.ok(html.includes('<td class="num">2,00</td>'));assert.ok(html.includes('<td class="num">202600011</td>'));assert.ok(html.includes('08/10/2026'));
});
