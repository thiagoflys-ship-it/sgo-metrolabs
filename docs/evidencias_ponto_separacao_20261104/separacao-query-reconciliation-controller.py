import pathlib,subprocess,json,time
P=pathlib.Path('/opt/metrolabs/qa/sgo-ponto-separar-20261104');PG='sgo-ponto-separar-restore-20261104';subprocess.run(['docker','start',PG],check=True,capture_output=True)
try:
 for _ in range(30):
  if subprocess.run(['docker','exec',PG,'pg_isready','-h','127.0.0.1','-U','sgo','-d','sgo'],capture_output=True).returncode==0:break
  time.sleep(1)
 where="aba IN ('PONTO_MARCACOES','PONTO_PESSOAS','PONTO_AJUSTES','PONTO_RESUMOS','PONTO_AVISOS','qual_sugestao')"
 q="SELECT md5(coalesce(string_agg(md5(aba||':'||n::text||':'||v::text),'' ORDER BY aba,n),'')) FROM linhas WHERE "+where
 ties="SELECT count(*) FROM(SELECT aba,n FROM linhas WHERE "+where+" GROUP BY aba,n HAVING count(DISTINCT planilha_id)>1)t"
 def sql(db,q):return subprocess.check_output(['docker','exec',PG,'psql','-XAtq','-U','sgo','-d',db,'-c',q],text=True).strip()
 r={'originalQueryMissingWorkbookKey':True,'multiWorkbookTieGroups':int(sql('sgo',ties)),'oldUnstableDigestRestoredBaseline':sql('audit_before',q),'oldUnstableDigestCandidate':sql('sgo',q),'canonicalComparison':json.loads((P/'history-diff-summary.json').read_text())};assert r['multiWorkbookTieGroups']>0;assert r['canonicalComparison']['changedRows']==0
 (P/'native-query-reconciliation.json').write_text(json.dumps(r,indent=2));print(json.dumps(r))
finally:subprocess.run(['docker','stop',PG],capture_output=True)
