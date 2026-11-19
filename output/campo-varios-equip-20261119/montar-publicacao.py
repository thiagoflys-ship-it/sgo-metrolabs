# Monta output/campo-varios-equip-20261119/publicar/ (camada do legado cand37 -> cand38 e o app de campo com vários equipamentos).
# Rodar na raiz do repositório:  python output/campo-varios-equip-20261119/montar-publicacao.py
# Base em produção (19/11, imagem contratos-aditivo-e1-20261119): legado = cand37; app de campo em /app/dist e /app/src =
# output/contratos-aditivo-20261119/e1/campo/novo (versão 94b9805bcd21). App novo = output/campo-varios-equip-20261119/novo.
import hashlib, os, shutil, tarfile
D = 'output/campo-varios-equip-20261119'
C37, C38, P = 'output/financeiro-20261116/cand37', 'output/financeiro-20261116/cand38', D + '/publicar'
BASE_CAMPO, NOVO = 'output/contratos-aditivo-20261119/e1/campo/novo', D + '/novo'
h = lambda f: hashlib.sha256(open(f, 'rb').read()).hexdigest()
if os.path.isdir(P): shutil.rmtree(P)
os.makedirs(P)
man = []
for f in sorted(os.listdir(C38)):
    if not os.path.exists(os.path.join(C37, f)): man.append(('NOVO', f))
    elif h(os.path.join(C37, f)) != h(os.path.join(C38, f)): man.append(('ALTERADO', f))
w = lambda nome, linhas: open(os.path.join(P, nome), 'w', newline='\n').write(''.join(l + '\n' for l in linhas))
w('manifesto.txt', [a + ' ' + f for a, f in man])
w('base-hashes.txt', [h(os.path.join(C37, f)) + '  ' + f for a, f in man if a == 'ALTERADO'])
w('manifesto-hashes.txt', [h(os.path.join(C38, f)) + '  ' + f for a, f in man])
w('total-base.txt', [str(len(os.listdir(C37)))])
w('total-esperado.txt', [str(len(os.listdir(C38)))])
with tarfile.open(os.path.join(P, 'camada.tgz'), 'w:gz') as t:
    for a, f in man: t.add(os.path.join(C38, f), arcname=f)
pasta = lambda d: sorted(n for n in os.listdir(d) if os.path.isfile(os.path.join(d, n)))
base = [h(os.path.join(BASE_CAMPO, n)) + '  ' + n for n in pasta(BASE_CAMPO)]
w('campo-base.txt', base); w('campo-base-src.txt', base)
w('campo-esperado.txt', [h(os.path.join(NOVO, n)) + '  ' + n for n in pasta(NOVO)])
with tarfile.open(os.path.join(P, 'campo.tgz'), 'w:gz') as t:
    for d in ('dist', 'src'):
        for n in pasta(NOVO): t.add(os.path.join(NOVO, n), arcname='app/%s/publico/campo/%s' % (d, n))
shutil.copy(D + '/publicar.sh', P + '/publicar.sh')
print('pronto:', man, '; total', len(os.listdir(C38)), '; app de campo', len(pasta(NOVO)), 'arquivos')
