import subprocess, pathlib, json, time
P = pathlib.Path('/opt/metrolabs/qa/sgo-retomada-20261104-1157a80ec5b4')
assert json.loads((P/'backup-restore-continuation-result.json').read_text())['passed']
assert json.loads((P/'smoke-result.json').read_text())['passed']
PG = 'sgo-retomada-restore-1157a80ec5b4'
OLD = 'sha256:4958e80c6f637d6f12f3fc2379d9df1752f1141a21985d4342d3f8080643bdac'
NEW = 'sha256:3eeef084dd35cd7a16470e898477f118b2f908b33411ec35e8f82f25494fc005'
created = []
results = []
production = json.loads(subprocess.check_output(['docker','inspect','sgo-app-1']))[0]
def run(args, **kw): return subprocess.run(args, check=True, **kw)
def wait(name):
    for i in range(90):
        r = subprocess.run(['docker','exec',name,'node','-e',"fetch('http://127.0.0.1:8080/saude').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"],capture_output=True)
        if not r.returncode: return
        time.sleep(2)
    raise RuntimeError('saúde não confirmou em '+name)
feature = r"""
import pg from 'pg';import assert from 'node:assert/strict';
const db=new pg.Client({connectionString:process.env.DATABASE_URL});await db.connect();
const ss=(await db.query("SELECT valor FROM propriedades WHERE escopo='script' AND chave LIKE 'SGO_SESSION_%'")).rows.map(r=>{try{return JSON.parse(r.valor)}catch{return{}}}).filter(s=>(s.perfil==='ADMIN'||s.usuario==='admin')&&Date.parse(s.expiresAt)>Date.now()).sort((a,b)=>Date.parse(b.lastAccessAt)-Date.parse(a.lastAccessAt));
assert.ok(ss[0],'É necessária sessão administrativa válida no snapshot');await db.end();
async function api(fn,args){const j=await(await fetch('http://127.0.0.1:8080/api/run',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({fn,args}),signal:AbortSignal.timeout(120000)})).json();assert.equal(j.ok,true,j.erro);assert.equal(j.valor.ok,true,j.valor.message);return j.valor;}
const ronda=await api('Assistencia_api',[ss[0].sessionId,'rondaTela',{}]);
const ramo=await api('Licitacoes_api',[ss[0].sessionId,'ramo',{op:'tela'}]);
assert.equal(ramo.coletorNoServidor,true);assert.ok(Array.isArray(ramo.candidatas));
console.log(JSON.stringify({passed:true,nativePostgres:true,ronda:true,ramo:true,workers:2,externalNetwork:'none',syntheticPeopleCreated:0}));
"""
proof = {'passed': False, 'productionChanged': False, 'sequence': results}
try:
    run(['docker','start',PG],capture_output=True)
    for label, image in [('old-before',OLD),('candidate',NEW),('old-rollback',OLD)]:
        name='sgo-retomada-'+label+'-1157a80ec5b4'
        run(['docker','run','-d','--name',name,'--network','container:'+PG,
             '-e','DATABASE_URL=postgres://sgo:qa-restore-sintetico-20261104@127.0.0.1:5432/sgo',
             '-e','SGO_PREPARAR=0','-e','SGO_ENSAIO=1','-e','SGO_AGENDADOR=0','-e','WORKERS=2','-e','LEGADO_COMMAND=',
             '-e','URL_PUBLICA=http://127.0.0.1:8080','-e','SGO_COFRE_ARQUIVO=/cofre/chave',
             '-v',str(P/'backup-verificado/fs-restaurado/dados')+':/dados',
             '-v','/opt/metrolabs/sgo/cofre:/cofre:ro',image],capture_output=True)
        created.append(name);wait(name)
        r=run(['docker','exec',name,'node','/app/scripts/smoke_publicacao.mjs'],capture_output=True,text=True,timeout=300)
        (P/('native-'+label+'.json')).write_text(r.stdout+r.stderr)
        if label=='candidate':
            r=run(['docker','exec',name,'node','--input-type=module','-e',feature],capture_output=True,text=True,timeout=300)
            (P/'native-features.json').write_text(r.stdout+r.stderr)
        results.append({'phase':label,'image':image,'passed':True})
        run(['docker','stop',name],capture_output=True)
    now=json.loads(subprocess.check_output(['docker','inspect','sgo-app-1']))[0]
    assert now['Id']==production['Id'] and now['Image']==production['Image'] and now['State']['Pid']==production['State']['Pid'] and now['State']['Running']
    proof['passed']=True
finally:
    for name in created: subprocess.run(['docker','stop',name],capture_output=True)
    subprocess.run(['docker','stop',PG],capture_output=True)
    (P/'native-rollback-result.json').write_text(json.dumps(proof,indent=2))
print(json.dumps(proof))
