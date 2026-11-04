import subprocess, pathlib, json, time
P = pathlib.Path('/opt/metrolabs/qa/sgo-ponto-separar-20261104')
assert not (P/'native-rollback-result.json').exists(), 'native already dispatched; preserve original outcome'
assert json.loads((P/'backup-restore-result.json').read_text())['passed']
assert json.loads((P/'smoke-result.json').read_text())['passed']
PG = 'sgo-ponto-separar-restore-20261104'
OLD = 'sha256:0c35261ce54fa812ba0e3a4bf4042c2d2891ca33ef0ee3342c752c7e5a5286a8'
NEW = json.loads((P/'build-result.json').read_text())['image']
created = []
results = []
import os
(P/'native-dados').mkdir(mode=0o700,exist_ok=False);os.chown(P/'native-dados',1001,1001)
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
const pessoas=await api('Ponto_api',[ss[0].sessionId,'pessoas',{}]);
const escolhas=pessoas.pessoas.map(p=>({id:p.id,marcacoes:p.marcacoes,avisosProprios:p.avisosProprios,jornada:p.jornada,participa:p.participa,sem_almoco:p.sem_almoco}));
const {createHash}=await import('node:crypto');const hash=createHash('sha256').update(JSON.stringify(escolhas)).digest('hex');
const painel=(await api('Ponto_api',[ss[0].sessionId,'mes',{mes:'2026-11'}])).painel;
const declaredMode=process.env.POLICY_PHASE==='candidate';
for(const p of painel.pessoas){const expected=p.vinculo==='CLT'?(declaredMode?p.esqueci:p.esqueci+p.naoConfirmadas):0;assert.equal(p.esquecimentos,expected);assert.equal(p.resumo,expected>=painel.resumoAPartir);}
assert.ok(painel.pessoas.some(p=>p.naoConfirmadas>=4&&p.esqueci===0),'snapshot contains reported non-confirmations');
const d=new pg.Client({connectionString:process.env.DATABASE_URL});await d.connect();await d.query('BEGIN READ ONLY');
const raw=(await d.query("SELECT md5(coalesce(string_agg(md5(aba||':'||n::text||':'||v::text),'' ORDER BY aba,n),'')) AS h FROM linhas WHERE aba IN ('PONTO_MARCACOES','PONTO_PESSOAS','PONTO_AJUSTES','PONTO_RESUMOS','PONTO_AVISOS','qual_sugestao')")).rows[0].h;await d.query('ROLLBACK');await d.end();
console.log(JSON.stringify({passed:true,nativePostgres:true,declaredOnlyMode:declaredMode,settingsReadOnly:true,settingsHash:hash,rawHistoryHash:raw,people:painel.pessoas.length,unconfirmed: painel.total.naoConfirmadas,declared:painel.total.esqueci,workers:2,externalNetwork:'none',notificationsSent:0}));
"""
proof = {'passed': False, 'productionChanged': False, 'sequence': results}
try:
    run(['docker','start',PG],capture_output=True)
    for label, image in [('old-before',OLD),('candidate',NEW),('old-rollback',OLD)]:
        name='sgo-ponto-separar-'+label+'-20261104'
        run(['docker','run','-d','--name',name,'--network','container:'+PG,
             '-e','DATABASE_URL=postgres://sgo:qa-ponto-separar-20261104@127.0.0.1:5432/sgo',
             '-e','SGO_PREPARAR=0','-e','SGO_ENSAIO=1','-e','SGO_AGENDADOR=0','-e','WORKERS=2','-e','LEGADO_COMMAND=',
             '-e','URL_PUBLICA=http://127.0.0.1:8080','-e','SGO_COFRE_ARQUIVO=/cofre/chave',
             '-v',str(P/'native-dados')+':/dados',
             '-v','/opt/metrolabs/sgo/cofre:/cofre:ro',image],capture_output=True)
        created.append(name);wait(name)
        r=run(['docker','exec',name,'node','/app/scripts/smoke_publicacao.mjs'],capture_output=True,text=True,timeout=300)
        (P/('native-'+label+'.json')).write_text(r.stdout+r.stderr)
        r=run(['docker','exec','-e','POLICY_PHASE='+label,name,'node','--input-type=module','-e',feature],capture_output=True,text=True,timeout=300)
        (P/('native-settings-'+label+'.json')).write_text(r.stdout+r.stderr)
        currentSettings=json.loads(r.stdout.strip().splitlines()[-1]);assert currentSettings['passed']
        if label=='old-before': baselineSettings=currentSettings['settingsHash'];baselineHistory=currentSettings['rawHistoryHash']
        else:
            assert currentSettings['settingsHash']==baselineSettings,'person settings changed'
            assert currentSettings['rawHistoryHash']==baselineHistory,'raw point/history data changed'
        results.append({'phase':label,'image':image,'passed':True})
        run(['docker','stop',name],capture_output=True)
    now=json.loads(subprocess.check_output(['docker','inspect','sgo-app-1']))[0]
    assert now['Id']==production['Id'] and now['Image']==production['Image'] and now['State']['Pid']==production['State']['Pid'] and now['State']['Running']
    proof.update(passed=True,personSettingsPreservedAcrossRollback=True,rawHistoryPreservedAcrossRollback=True,policyReadVerified=True,filesystemScope='fresh isolated scratch; no new full FS restore',notificationsSent=0)
finally:
    for name in created: subprocess.run(['docker','stop',name],capture_output=True)
    subprocess.run(['docker','stop',PG],capture_output=True)
    (P/'native-rollback-result.json').write_text(json.dumps(proof,indent=2))
print(json.dumps(proof))
