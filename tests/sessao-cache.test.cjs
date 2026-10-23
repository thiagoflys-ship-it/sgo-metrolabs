const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
function ambiente(cacheVencido=true,bancoVencido=false){
 const agora=new Date().toISOString(),sessao={sessionId:'SESS_TESTE',userId:'u',usuario:'teste',conferidoEm:agora,expiresAt:new Date(Date.now()+(bancoVencido?-60000:3600000)).toISOString()};
 const props=new Map([['SGO_SESSION_SESS_TESTE',JSON.stringify(sessao)]]),cache=new Map([['SESS_TESTE',JSON.stringify({...sessao,expiresAt:cacheVencido?'2000-01-01T00:00:00Z':sessao.expiresAt})]]);
 const c=vm.createContext({SGO_CFG:{SESSION_TTL:21600},SGO_UTILS:{safe:x=>String(x??'').trim(),nowIso:()=>new Date().toISOString()},CacheService:{getScriptCache:()=>({get:k=>cache.get(k),put:(k,v)=>cache.set(k,v),remove:k=>cache.delete(k)})},PropertiesService:{getScriptProperties:()=>({getProperty:k=>props.get(k),setProperty:(k,v)=>props.set(k,v),deleteProperty:k=>props.delete(k)})}});
 vm.runInContext(fs.readFileSync(path.join(__dirname,'../apps-script-imports/portal_sgo_versao_cnpj_db/SGO_Auth.js'),'utf8'),c);return{c,props,cache};
}
test('sessão renovada no banco prevalece sobre cache vencido',()=>{const a=ambiente();assert.equal(a.c.validarSessao('SESS_TESTE').valid,true);assert.equal(a.props.has('SGO_SESSION_SESS_TESTE'),true);assert.equal(a.c.validarSessao('SESS_TESTE').valid,true)});
test('sessão realmente vencida nas duas camadas é encerrada',()=>{const a=ambiente(true,true);assert.equal(a.c.validarSessao('SESS_TESTE').valid,false);assert.equal(a.props.has('SGO_SESSION_SESS_TESTE'),false)});
test('cache com sessão diferente não concede acesso e usa a cópia correta',()=>{const a=ambiente();a.cache.set('SESS_TESTE',JSON.stringify({sessionId:'SESS_OUTRA',expiresAt:'2099-01-01T00:00:00Z'}));assert.equal(a.c.validarSessao('SESS_TESTE').data.userId,'u')});
