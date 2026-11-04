import pathlib,json,subprocess,shutil
P=pathlib.Path('/opt/metrolabs/qa/sgo-ponto-separar-20261104');assert json.loads((P/'PUBLICADO.json').read_text())['passed'];assert not(P/'qa-retirement-result.json').exists();old='sha256:0c35261ce54fa812ba0e3a4bf4042c2d2891ca33ef0ee3342c752c7e5a5286a8';new=json.loads((P/'build-result.json').read_text())['image']
def ins(n):return json.loads(subprocess.check_output(['docker','inspect',n]))[0]
running={x['Id']:(x['Image'],x['State']['Pid']) for x in json.loads(subprocess.check_output(['docker','inspect',*subprocess.check_output(['docker','ps','-q'],text=True).split()]))};removed=[]
for phase in ['old-before','candidate','old-rollback','smoke']:
 n='sgo-ponto-separar-'+phase+'-20261104';x=ins(n);assert not x['State']['Running'] and x['Image']==(old if phase.startswith('old-') else new)
 if phase!='smoke':assert any(m['Source']==str(P/'native-dados') and m['Destination']=='/dados' for m in x['Mounts'])
 subprocess.run(['docker','rm',x['Id']],check=True,capture_output=True);removed.append(x['Id'])
assert all((ins(k)['Image'],ins(k)['State']['Pid'])==v and ins(k)['State']['Running'] for k,v in running.items());assert not ins('sgo-ponto-separar-restore-20261104')['State']['Running'];assert(P/'backup-verificado/banco.dump').is_file() and(P/'backup-verificado/filesystem-delta.tgz').is_file()
r={'passed':True,'retiredStoppedOwnContainers':removed,'runningPreserved':len(running),'qaDatabaseStoppedRetained':True,'nativeScratchAndBackupsRetained':True,'bytesFree':shutil.disk_usage('/').free};(P/'qa-retirement-result.json').write_text(json.dumps(r,indent=2));print(json.dumps(r))
