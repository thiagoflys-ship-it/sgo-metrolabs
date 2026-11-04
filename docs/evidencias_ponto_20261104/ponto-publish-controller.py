"""Troca única para a imagem já ensaiada; rollback somente de código/imagem, nunca rebobina dados."""
import subprocess, pathlib, json, time, hashlib
ROOT = pathlib.Path('/opt/metrolabs/sgo')
P = pathlib.Path('/opt/metrolabs/qa/sgo-ponto-avisos-20261104')
BACK = P/'backup-verificado'
REV = 'aba38552eaa17b4cdc06cd0d770b1dd59e261cb1'
OLD = 'sha256:3eeef084dd35cd7a16470e898477f118b2f908b33411ec35e8f82f25494fc005'
NEW = 'sha256:fa1e066352d2d6f70ba966f0e1290eae094e41e2572512555fc6bdb5eb8c7169'
APP = ROOT/'app'
CAND = ROOT/'app-candidato-aba38552eaa1'
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
assert json.loads((P/'local-validation.json').read_text())['passed']
for name in ['smoke-result.json','backup-restore-result.json','native-rollback-result.json']:
    assert json.loads((P/name).read_text())['passed'], name
assert json.loads(subprocess.check_output(['docker','image','inspect',NEW]))[0]['Config']['Labels']['org.opencontainers.image.revision']==REV
assert hashlib.sha256((P/'codigo.tgz').read_bytes()).hexdigest()=='8614933b6916b20392672e6d906e7509ba48e2b3a1474017672c2111bd3c1f55'
old=inspect('sgo-app-1');pg=inspect('sgo-db-1')
assert old['Id']=='8d2d32ec62752d82b6236b60f6ba2de429a795aafbb8b55d658f1969d3058c46' and old['Image']==OLD and old['State']['Running']
assert not CAND.exists() and not SAVED.exists()
others={x['Id']:(x['Image'],x['State']['Pid']) for x in json.loads(subprocess.check_output(['docker','inspect',*subprocess.check_output(['docker','ps','-q'],text=True).split()])) if x['Id']!=old['Id']}
CAND.mkdir(mode=0o700)
run(['tar','-xzf',str(P/'codigo.tgz'),'-C',str(CAND)])
run(['docker','tag',OLD,'metrolabs/sgo:rollback-aba38552eaa1'])
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
