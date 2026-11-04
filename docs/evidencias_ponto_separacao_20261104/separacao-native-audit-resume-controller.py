import pathlib,subprocess,json,hashlib,time
P=pathlib.Path('/opt/metrolabs/qa/sgo-ponto-separar-20261104');PG='sgo-ponto-separar-restore-20261104';assert json.loads((P/'native-rollback-result.json').read_text())['passed']==False
subprocess.run(['docker','start',PG],check=True,capture_output=True)
try:
 for _ in range(30):
  if subprocess.run(['docker','exec',PG,'pg_isready','-h','127.0.0.1','-U','sgo','-d','sgo'],capture_output=True).returncode==0:break
  time.sleep(1)
 else:raise RuntimeError('QA PG not ready')
 exists=subprocess.check_output(['docker','exec',PG,'psql','-XAtq','-U','sgo','-d','sgo','-c',"SELECT count(*) FROM pg_database WHERE datname='audit_before'"],text=True).strip()
 if exists=='0':subprocess.run(['docker','exec',PG,'createdb','-U','sgo','audit_before'],check=True,capture_output=True)
 tables=subprocess.check_output(['docker','exec',PG,'psql','-XAtq','-U','sgo','-d','audit_before','-c',"SELECT count(*) FROM pg_tables WHERE schemaname='public'"],text=True).strip()
 assert tables=='0','baseline restore already started; inspect instead of repeating'
 with (P/'backup-verificado/banco.dump').open('rb') as f:subprocess.run(['docker','exec','-i',PG,'pg_restore','--exit-on-error','-U','sgo','-d','audit_before'],stdin=f,check=True,capture_output=True)
 sql="SELECT row_to_json(t) FROM (SELECT planilha_id,aba,n,v FROM linhas WHERE aba IN ('PONTO_MARCACOES','PONTO_PESSOAS','PONTO_AJUSTES','PONTO_RESUMOS','PONTO_AVISOS','qual_sugestao') ORDER BY planilha_id,aba,n)t"
 def rows(db):return [json.loads(l) for l in subprocess.check_output(['docker','exec',PG,'psql','-XAtq','-U','sgo','-d',db,'-c',sql],text=True).splitlines() if l]
 before=rows('audit_before');after=rows('sgo');b={(r['planilha_id'],r['aba'],r['n']):r['v'] for r in before};a={(r['planilha_id'],r['aba'],r['n']):r['v'] for r in after};diff=[]
 for k in sorted(set(b)|set(a)):
  if b.get(k)==a.get(k):continue
  hdr=a.get((k[0],k[1],1),b.get((k[0],k[1],1),[]));bv=b.get(k,[]);av=a.get(k,[])
  fields=[hdr[i] if i<len(hdr) else str(i) for i in range(max(len(bv),len(av))) if (bv[i] if i<len(bv) else None)!=(av[i] if i<len(av) else None)]
  diff.append({'table':k[1],'row':k[2],'fields':fields,'before':bv,'after':av})
 (P/'history-diff-private.json').write_text(json.dumps(diff),encoding='utf-8')
 hashes={'baseline':hashlib.sha256(json.dumps(before,sort_keys=True).encode()).hexdigest(),'after':hashlib.sha256(json.dumps(after,sort_keys=True).encode()).hexdigest()}
 r={'baselineRows':len(before),'afterRows':len(after),'changedRows':len(diff),'changes':[{'table':x['table'],'row':x['row'],'fields':x['fields']} for x in diff],'hashes':hashes};(P/'history-diff-summary.json').write_text(json.dumps(r,indent=2));print(json.dumps(r))
finally:subprocess.run(['docker','stop',PG],capture_output=True)
