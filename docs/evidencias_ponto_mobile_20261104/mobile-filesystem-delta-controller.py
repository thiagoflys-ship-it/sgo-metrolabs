import pathlib,json,subprocess,hashlib,os,stat
P=pathlib.Path('/opt/metrolabs/qa/sgo-ponto-mobile-20261104'); B=P/'backup-verificado'; BASE=pathlib.Path('/opt/metrolabs/qa/sgo-ponto-avisos-20261104/backup-verificado'); ROOT=pathlib.Path('/opt/metrolabs/sgo/dados')
assert json.loads((P/'backup-restore-result.json').read_text())['passed'];assert not (P/'filesystem-delta-result.json').exists()
old={r['path']:r for r in json.loads((BASE/'files-source.json').read_text())};cur={r['path']:r for r in json.loads((B/'files-observed.json').read_text())}
changed=[r for k,r in cur.items() if old.get(k)!=r];removed=sorted(set(old)-set(cur))
for r in changed:
 n=pathlib.PurePosixPath(r['path']);assert not n.is_absolute() and '..' not in n.parts;assert r['kind']!='link','review symlink before delta'
listing=B/'delta-files.list';listing.write_bytes(b''.join(r['path'].encode()+b'\0' for r in changed));archive=B/'filesystem-delta.tgz'
subprocess.run(['tar','-czf',str(archive),'-C',str(ROOT),'--no-recursion','--null','-T',str(listing)],check=True)
restored=B/'delta-restored';restored.mkdir(mode=0o700);subprocess.run(['tar','-xzf',str(archive),'-C',str(restored)],check=True)
def sha(p):
 h=hashlib.sha256()
 with p.open('rb') as f:
  for c in iter(lambda:f.read(8*1024*1024),b''):h.update(c)
 return h.hexdigest()
for r in changed:
 p=restored/r['path'];st=p.lstat();assert stat.S_IMODE(st.st_mode)==r['mode'] and st.st_uid==r['uid'] and st.st_gid==r['gid']
 if r['kind']=='file':assert p.stat().st_size==r['size'] and sha(p)==r['sha256'] and sha(ROOT/r['path'])==r['sha256']
composition={k:v for k,v in old.items() if k not in removed};composition.update({r['path']:r for r in changed});assert composition==cur
(B/'removed-paths.json').write_text(json.dumps(removed));proof={'passed':True,'baseArchiveRetained':str(BASE/'dados.tgz'),'deltaArchive':str(archive),'deltaSha256':sha(archive),'changedEntries':len(changed),'removedPaths':len(removed),'composedManifestEqualsObserved':True,'deltaRestoredBytesOwnersModes':True,'fullFilesystemRestoreRepeated':False,'productionChanged':False};(P/'filesystem-delta-result.json').write_text(json.dumps(proof,indent=2));print(json.dumps(proof))
