const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../apps-script-imports/portal_sgo_versao_cnpj_db');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const index = read('Index.html');
const core = read('JS_Core.html');
const modules = [
  {menu:'declaracao_qiqo', loader:'JS_DeclaracaoExecQIQO', content:'SGO_DeclaracaoExecQIQO_ConteudoModulo.js', getter:'DeclExecQIQO_obterConteudoModulo', main:'SGO_DeclaracaoExec_Main.js', prefix:'DeclExec'},
  {menu:'relatorio_calibracao', loader:'JS_RelCal', content:'SGO_RelCal_ConteudoModulo.js', getter:'RelCal_obterConteudoModulo', main:'SGO_RelCal_Main.js', prefix:'RelCal'},
  {menu:'certificado_calibracao', loader:'JS_CertCal', content:'SGO_CertCal_ConteudoModulo.js', getter:'CertCal_obterConteudoModulo', main:'SGO_CertCal_Main.js', prefix:'CertCal'}
];
for (const mod of modules) {
  assert.ok(index.includes('data-mod="'+mod.menu+'"'), mod.menu+' menu ausente');
  assert.ok(index.includes("include('"+mod.loader+"')"), mod.menu+' loader ausente');
  assert.ok(core.includes('tipoMotor === "'+mod.menu+'"'), mod.menu+' rota ausente');
  assert.ok(read(mod.loader+'.html').includes('.'+mod.getter+'()'), mod.menu+' getter incorreto');
  const sandbox = {HtmlService:{createHtmlOutputFromFile:file=>({getContent:()=>read(file+'.html')})}};
  vm.createContext(sandbox);
  vm.runInContext(read(mod.content), sandbox);
  vm.runInContext(read(mod.main), sandbox);
  assert.equal(typeof sandbox[mod.getter], 'function', mod.menu+' getter inexistente');
  const html = sandbox[mod.getter]();
  assert.equal(typeof html, 'string');
  for (const block of html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)) new vm.Script(block[1]);
  const backend = read(mod.main);
  const dispatchStart = backend.indexOf('function '+mod.prefix+'_apiDispatch(');
  const nextDeclaration = /function\s+[A-Za-z_$][\w$]*\s*\(/.exec(backend.slice(dispatchStart+9));
  const dispatchEnd = nextDeclaration ? dispatchStart+9+nextDeclaration.index : backend.length;
  const dispatch = backend.slice(dispatchStart, dispatchEnd);
  const routes = [...dispatch.matchAll(/\b(api\w+)\s*:\s*(\w+)/g)];
  assert.ok(routes.length > 5);
  const actions = new Set([...html.matchAll(/["'](api[A-Z]\w+)["']/g)].map(m=>m[1]));
  const allowed = new Set(routes.map(m=>m[1]));
  for (const action of actions) assert.ok(allowed.has(action), mod.menu+' ação sem rota: '+action);
  // Exercise the actual dispatcher with all frontend actions. Stubs isolate Google calls,
  // while retaining the real session check, allowlist and argument routing.
  // O backend inteiro é carregado, para que as travas reais chamadas pelo despacho (equipe interna, perfil emissor:
  // DeclExecQIQO_exigirEquipe_, RelCal_exigirEquipe_, CertCal_exigirPerfilEmissor_) existam como em produção;
  // só as funções de destino das rotas viram simulacros.
  const ctx = {exigirSessao: sid => {assert.equal(sid,'SESSION-QA');return {perfil:'ADMIN'};}};
  vm.createContext(ctx);
  vm.runInContext(backend,ctx);
  for (const route of routes) ctx[route[2]] = (...args) => ({action:route[1],args});
  for (const action of actions) {
    const payload = {probe:'frontend-backend'};
    const response = ctx[mod.prefix+'_apiDispatch']({sessionId:'SESSION-QA',fn:action,payload});
    assert.equal(response.action,action);
    assert.ok(response.args.includes(payload));
  }
  assert.throws(()=>ctx[mod.prefix+'_apiDispatch']({sessionId:'SESSION-QA',fn:'acaoInexistente'}));
  assert.throws(()=>ctx[mod.prefix+'_apiDispatch']({sessionId:'INVALID',fn:'apiPing'}));
  console.log('PASS: '+mod.menu+' menu → loader → conteúdo → '+actions.size+' ações backend autenticadas.');
}
