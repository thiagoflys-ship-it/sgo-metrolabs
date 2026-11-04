"""Troca única para a imagem já ensaiada; rollback somente de código/imagem, nunca rebobina dados."""
import subprocess, pathlib, json, time, hashlib
ROOT = pathlib.Path('/opt/metrolabs/sgo')
P = pathlib.Path('/opt/metrolabs/qa/sgo-retomada-20261104-1157a80ec5b4')
BACK = P/'backup-verificado'
REV = '1157a80ec5b446bdaf188f1150a6fe8dd825793a'
OLD = 'sha256:4958e80c6f637d6f12f3fc2379d9df1752f1141a21985d4342d3f8080643bdac'
NEW = 'sha256:3eeef084dd35cd7a16470e898477f118b2f908b33411ec35e8f82f25494fc005'
APP = ROOT/'app'
CAND = ROOT/'app-candidato-1157a80ec5b4'
SAVED = BACK/'app-anterior'
def run(args, **kw): return subprocess.run(args, check=True, **kw)
def inspect(name): return json.loads(subprocess.check_output(['docker','inspect',name]))[0]
def wait(image):
    for i in range(90):
        x=inspect('sgo-app-1')
        if x['Image']==image and x['State'].get('Health',{}).get('Status')=='healthy': return x
        time.sleep(2)
    raise RuntimeError('aplicação não ficou saudável na imagem esperada')
assert ROOT.resolve()==ROOT and APP.is_dir() and not APP.is_symlink()
assert not (P/'PUBLICADO.json').exists(), 'publicação já confirmada; não repetir'
for name in ['smoke-result.json','backup-restore-continuation-result.json','native-rollback-result.json']:
    assert json.loads((P/name).read_text())['passed'], name
assert json.loads(subprocess.check_output(['docker','image','inspect',NEW]))[0]['Config']['Labels']['org.opencontainers.image.revision']==REV
assert hashlib.sha256((P/'codigo.tgz').read_bytes()).hexdigest()=='628209d352c268ae3cd677e6118bb3810e03791cff19f871975d81a966b8926c'
old=inspect('sgo-app-1');pg=inspect('sgo-db-1')
assert old['Id']=='46330c2eefc6230cfefa4fb6c5a4627995542ddf9b3af941a66dd91b15be514f' and old['Image']==OLD and old['State']['Running']
assert not CAND.exists() and not SAVED.exists()
others={x['Id']:(x['Image'],x['State']['Pid']) for x in json.loads(subprocess.check_output(['docker','inspect',*subprocess.check_output(['docker','ps','-q'],text=True).split()])) if x['Id']!=old['Id']}
CAND.mkdir(mode=0o700)
run(['tar','-xzf',str(P/'codigo.tgz'),'-C',str(CAND)])
run(['docker','tag',OLD,'metrolabs/sgo:rollback-1157a80ec5b4'])
swapped=False
switched=False
proof={'passed':False,'revision':REV,'oldImage':OLD,'newImage':NEW,'databaseRestoredInProduction':False}
try:
    APP.rename(SAVED);CAND.rename(APP);swapped=True
    run(['docker','tag',NEW,'metrolabs/sgo:atual'])
    switched=True
    with (P/'compose-publicacao.log').open('w') as out:
        run(['docker','compose','up','-d','--no-deps','--no-build','--pull','never','app'],cwd=ROOT,stdout=out,stderr=subprocess.STDOUT)
    now=wait(NEW)
    assert sorted(now['Config']['Env'])==sorted(old['Config']['Env']), 'ambiente mudou'
    mounts=lambda x:sorted((m['Source'],m['Destination'],m['RW']) for m in x['Mounts'])
    assert mounts(now)==mounts(old), 'montagens mudaram'
    r=run(['docker','exec','sgo-app-1','node','/app/scripts/smoke_publicacao.mjs'],capture_output=True,text=True,timeout=300)
    (P/'smoke-producao.json').write_text(r.stdout+r.stderr)
    run(['curl','-fsS','--max-time','30','https://sgo.metrolabs.com.br/saude'],stdout=subprocess.DEVNULL)
    assert inspect('sgo-db-1')['Id']==pg['Id'] and inspect('sgo-db-1')['State']['Pid']==pg['State']['Pid']
    assert all((inspect(k)['Image'],inspect(k)['State']['Pid'])==v and inspect(k)['State']['Running'] for k,v in others.items())
    proof.update(passed=True,appId=now['Id'],postgresContainerUnchanged=True,otherRunningContainersPreserved=len(others),environmentPreserved=True,mountsPreserved=True,publicTLS=True)
    (P/'PUBLICADO.json').write_text(json.dumps(proof,indent=2))
except Exception as e:
    proof['error']=str(e)
    run(['docker','tag',OLD,'metrolabs/sgo:atual'])
    if swapped:
        APP.rename(BACK/'app-candidato-reprovado');SAVED.rename(APP)
    if switched:
        run(['docker','compose','up','-d','--no-deps','--no-build','--pull','never','app'],cwd=ROOT,capture_output=True)
        wait(OLD)
        proof['rollbackConfirmed']=True
    raise
finally:
    (P/'publication-result.json').write_text(json.dumps(proof,indent=2))
print(json.dumps(proof))
