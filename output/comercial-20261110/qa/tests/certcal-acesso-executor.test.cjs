const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
// Simulacros fiéis de Session/Utilities (o formatDate antigo ignorava o formato e a trava de data no futuro disparava).
const gas=require('./_simulacros_gas.cjs');
// SGO_DATA.getDB(): CertCal_apiListarTecnicos confere se a aba CAD_TECNICOS existe (17/10, lista vazia sem a aba).
function ambiente(perfil = 'CLIENTE') {
  const data = {clientes:[{ID:'C1',CNPJ:'111'},{ID:'C2',CNPJ:'222'}],equip:[{ID:'E',CLIENTE_ID:'C2',UNIDADE_ID:'U',STATUS:'ATIVO'}],unidades:[{ID:'U',CLIENTE_ID:'C2'}],cert:[{ID:'CERT',CLIENTE_ID:'C2',LINK_PDF_RELATORIO_INTERPRETATIVO:'https://drive.google.com/file/d/original/view',DADOS_JSON:'{}'}],tecnicos:[{ID:'T',STATUS:'ATIVO',NOME:'Executor'},{ID:'INATIVO',STATUS:'INATIVO',NOME:'Antigo'}]};
  const c=vm.createContext({SGO_UTILS:{safe:v=>String(v??'').trim(),safeUpper:v=>String(v??'').toUpperCase(),cnpjArmazenado:v=>v,formatCnpj:v=>v},exigirSessao:()=>({perfil,clienteId:'C1',usuario:'QA'}),SGO_CFG:{SHEETS:{CERT_CALIBRACAO:'cert',CAD_CLIENTES:'clientes',CAD_EQUIPAMENTOS:'equip',CAD_UNIDADES:'unidades',CAD_TECNICOS:'tecnicos'}},SGO_DATA:{getById:(s,id)=>data[s]?.find(x=>x.ID===id),getAll:s=>data[s]||[],getDB:()=>({getSheetByName:n=>n in data?{getName:()=>n}:null})},SGO_VINCULOS:{relation(){}},Session:gas.criarSession(),Utilities:gas.criarUtilities()});
  vm.runInContext(fs.readFileSync('apps-script-imports/portal_sgo_versao_cnpj_db/SGO_CertCal_Main.js','utf8'),c);c.CertCal_bootstrap_=()=>{};c.CertCal_calcularBlocos_=()=>[];return c;
}
test('cliente não acessa equipamentos, busca, snapshot ou relatório de outro cliente, inclusive link já emitido',()=>{
  const c=ambiente();for(const [fn,p]of [['CertCal_apiListarEquipamentosCliente',{clienteId:'C2'}],['CertCal_apiBuscarCertificadosPorCnpj',{cnpj:'222'}],['CertCal_apiReabrirCertificado',{certificadoId:'CERT'}],['CertCal_apiGerarRelatorioInterpretativo',{certificadoId:'CERT'}]])assert.throws(()=>c[fn]('S',p),/Acesso negado/);
  assert.doesNotThrow(()=>c.CertCal_exigirAcessoCliente_('S','C1'));
});
test('colaborador interno mantém consulta de equipamentos e relatório original',()=>{
  const c=ambiente('TECNICO');assert.equal(c.CertCal_apiListarEquipamentosCliente('S',{clienteId:'C2'}).items.length,1);assert.equal(c.CertCal_apiGerarRelatorioInterpretativo('S',{certificadoId:'CERT'}).reutilizado,true);
});
test('executor ausente ou ID inexistente/inativo não produz snapshot; nome livre e cadastro ativo são aceitos',()=>{
  const c=ambiente('TECNICO'),p={clienteId:'C2',equipamentoId:'E',dataCalibracao:'08/10/2026',blocos:[{}]};
  assert.throws(()=>c.CertCal_montarContexto_('S',p,{}),/técnico executor/);
  for(const id of ['INATIVO','NAOEXISTE'])assert.throws(()=>c.CertCal_montarContexto_('S',{...p,tecnicoId:id,tecnicoExecutorLivre:'Não substituir'},{}),/não encontrado ou inativo/);
  assert.equal(c.CertCal_montarContexto_('S',{...p,tecnicoId:'T'},{}).tecnicoExecutor,'Executor');
  assert.equal(c.CertCal_montarContexto_('S',{...p,tecnicoExecutorLivre:'Executor livre'},{}).tecnicoExecutor,'Executor livre');
});
test('cadastro simplificado aparece no catálogo CertCal para técnico; cliente não consulta nem grava',()=>{
  const c=ambiente('TECNICO');c.SGO_DATA.normalizarObjetoParaSheet=(_,r)=>r;c.SGO_DATA.gerarRegistroBase=r=>({ID:'NOVO',...r});let gravado;
  c.SGO_UTILS.onlyDigits=v=>String(v||'').replace(/\D/g,'');
  c.SGO_DATA.insert=(_,r)=>gravado=r;c.SGO_DATA.log=()=>{};
  c.CertCal_apiCriarTecnicoSimples('S',{nome:'Novo executor'});
  const antigos=c.SGO_DATA.getAll('tecnicos');c.SGO_DATA.getAll=()=>[...antigos,gravado];
  assert.ok(c.CertCal_apiListarTecnicos('S').items.some(x=>x.ID==='NOVO'));
  const cliente=ambiente();cliente.SGO_DATA.insert=()=>assert.fail('Não pode gravar');
  assert.throws(()=>cliente.CertCal_apiCriarTecnicoSimples('S',{nome:'Cliente'}),/equipe interna/);
  assert.throws(()=>cliente.CertCal_apiListarTecnicos('S'),/equipe interna/);
});
test('reabertura bloqueia número divergente e pesquisa mantém identificação histórica do snapshot',()=>{
  const c=ambiente('GESTOR');c.SGO_DATA.getById=()=>({CLIENTE_ID:'C2',NUMERO_CERTIFICADO:'202600001',DADOS_JSON:JSON.stringify({numeroCertificado:'202600002'})});
  assert.throws(()=>c.CertCal_apiReabrirCertificado('S',{certificadoId:'CERT'}),/diverge do snapshot/);
  c.SGO_DATA.getAll=s=>s==='clientes'?[{ID:'C2',CNPJ:'222'}]:s==='equip'?[{ID:'E',TAG:'TAG-EDITADA',TIPO:'Tipo editado'}]:[{ID:'CERT',CLIENTE_ID:'C2',EQUIPAMENTO_ID:'E',STATUS:'ATIVO',DADOS_JSON:JSON.stringify({equipamento:{descricao:'Tipo original',tag:'TAG-ORIGINAL'}})}];
  const r=c.CertCal_apiBuscarCertificadosPorCnpj('S',{cnpj:'222'});assert.equal(r.items[0].equipamentoTag,'TAG-ORIGINAL');assert.equal(r.items[0].equipamentoDescricao,'Tipo original');
});
