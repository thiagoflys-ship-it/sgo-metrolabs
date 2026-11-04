import pathlib,subprocess,json,hashlib,shutil
p=pathlib.Path('/opt/metrolabs/qa/sgo-ponto-avisos-20261104');assert json.loads((p/'PUBLICADO.json').read_text())['passed'];proof=json.loads((p/'backup-restore-result.json').read_text());assert proof['passed']
back=p/'backup-verificado';target=back/'fs-restaurado';assert target.resolve()==pathlib.Path('/opt/metrolabs/qa/sgo-ponto-avisos-20261104/backup-verificado/fs-restaurado') and target.is_dir() and not target.is_symlink()
assert not (p/'qa-retirement-result.json').exists()
def ins(n):return json.loads(subprocess.check_output(['docker','inspect',n]))[0]
def digest(f):
 h=hashlib.sha256()
 with f.open('rb') as r:
  for c in iter(lambda:r.read(8*1024*1024),b''):h.update(c)
 return h.hexdigest()
assert digest(back/'dados.tgz')==proof['filesArchiveSha256'];assert digest(back/'banco.dump')==proof['dumpSha256']
running={x['Id']:(x['Image'],x['State']['Pid']) for x in json.loads(subprocess.check_output(['docker','inspect',*subprocess.check_output(['docker','ps','-q'],text=True).split()]))}
freedBefore=shutil.disk_usage('/').free;removed=[]
for phase in ['old-before','candidate','old-rollback']:
 n='sgo-ponto-'+phase+'-aba38552eaa1';x=ins(n);assert not x['State']['Running'];assert any(m['Source']==str(target/'dados') for m in x['Mounts']);subprocess.run(['docker','rm',n],check=True,capture_output=True);removed.append(x['Id'])
x=ins('sgo-ponto-smoke-aba38552eaa1');assert not x['State']['Running'] and x['Image']=='sha256:fa1e066352d2d6f70ba966f0e1290eae094e41e2572512555fc6bdb5eb8c7169';subprocess.run(['docker','rm',x['Id']],check=True,capture_output=True);removed.append(x['Id'])
shutil.rmtree(target)
assert all((ins(k)['Image'],ins(k)['State']['Pid'])==v and ins(k)['State']['Running'] for k,v in running.items());assert (back/'dados.tgz').is_file() and (back/'banco.dump').is_file()
r={'passed':True,'retiredStoppedOwnContainers':removed,'retiredPath':str(target),'fullVerifiedArchiveAndDumpRetained':True,'runningPreserved':len(running),'bytesReleased':shutil.disk_usage('/').free-freedBefore,'bytesFree':shutil.disk_usage('/').free};(p/'qa-retirement-result.json').write_text(json.dumps(r,indent=2));print(json.dumps(r))
