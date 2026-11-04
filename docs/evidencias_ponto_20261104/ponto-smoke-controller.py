import pathlib,json,subprocess,time
p=pathlib.Path('/opt/metrolabs/qa/sgo-ponto-avisos-20261104');image=json.loads((p/'build-result.json').read_text())['image'];name='sgo-ponto-smoke-aba38552eaa1'
def run(a,**kw):return subprocess.run(a,check=True,**kw)
proof={'passed':False,'image':image,'network':'none'}
try:
 run(['docker','run','-d','--name',name,'--network','none','-e','SGO_DB=memoria','-e','SGO_PREPARAR=1','-e','SGO_AGENDADOR=0','-e','SGO_ENSAIO=1','-e','SGO_SMOKE_ISOLADO=1','-e','WORKERS=2','-e','LEGADO_COMMAND=','-e','URL_PUBLICA=http://127.0.0.1:8080','-e','SGO_COFRE_ARQUIVO=/tmp/cofre/chave',image],capture_output=True)
 for i in range(90):
  r=subprocess.run(['docker','exec',name,'node','-e',"fetch('http://127.0.0.1:8080/saude').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"],capture_output=True)
  if not r.returncode:break
  time.sleep(2)
 else:raise RuntimeError('smoke health timeout')
 r=run(['docker','exec',name,'node','/app/scripts/smoke_publicacao.mjs'],capture_output=True,text=True,timeout=300);(p/'smoke-isolado.json').write_text(r.stdout+r.stderr)
 proof['passed']=True
finally:
 subprocess.run(['docker','stop',name],capture_output=True);(p/'smoke-result.json').write_text(json.dumps(proof,indent=2))
print(json.dumps(proof))
