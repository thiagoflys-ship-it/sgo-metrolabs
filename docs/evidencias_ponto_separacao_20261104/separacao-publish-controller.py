"""Troca única para a imagem já ensaiada; rollback somente de código/imagem, nunca rebobina dados."""
import subprocess, pathlib, json, time, hashlib
ROOT = pathlib.Path('/opt/metrolabs/sgo')
P = pathlib.Path('/opt/metrolabs/qa/sgo-ponto-separar-20261104')
BACK = P/'backup-verificado'
FREEZE=json.loads((P/'deployment-freeze.json').read_text())
REV=FREEZE['revision']
OLD = 'sha256:0c35261ce54fa812ba0e3a4bf4042c2d2891ca33ef0ee3342c752c7e5a5286a8'
NEW=json.loads((P/'build-result.json').read_text())['image']
APP = ROOT/'app'
CAND = ROOT/'app-candidato-separar-20261104'
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
for name in ['smoke-result.json','backup-restore-result.json','filesystem-delta-result.json','native-acceptance-result.json','image-byte-comparison.json']:
    assert json.loads((P/name).read_text())['passed'], name
assert json.loads(subprocess.check_output(['docker','image','inspect',NEW]))[0]['Config']['Labels']['org.opencontainers.image.revision']==REV
assert hashlib.sha256((P/'codigo.tgz').read_bytes()).hexdigest()==FREEZE['archiveSha256']
old=inspect('sgo-app-1');pg=inspect('sgo-db-1')
assert old['Id']=='3f05676359f7e29b857806ead2048abbe6454c7f1690eb03fd401f09ddba174e' and old['Image']==OLD and old['State']['Running']
assert not CAND.exists() and not SAVED.exists()
others={x['Id']:(x['Image'],x['State']['Pid']) for x in json.loads(subprocess.check_output(['docker','inspect',*subprocess.check_output(['docker','ps','-q'],text=True).split()])) if x['Id']!=old['Id']}
CAND.mkdir(mode=0o700)
run(['tar','-xzf',str(P/'codigo.tgz'),'-C',str(CAND)])
run(['docker','tag',OLD,'metrolabs/sgo:rollback-separar-20261104'])
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
