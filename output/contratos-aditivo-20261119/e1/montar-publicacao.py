# Monta output/contratos-aditivo-20261119/e1/publicar/ (camada do legado cand36 -> cand37 e o app de campo novo). Rodar na raiz do repositório:
#   python output/contratos-aditivo-20261119/e1/montar-publicacao.py
# App de campo: base em produção (19/11 15:40, imagem campo-sem-serie-tag-20261119): /app/dist = e1/campo/prod (versão a1fad0ddf68e,
# output/campo-20261118/novo + app.js e regras.js de output/campo-semid-20261119); /app/src = e1/campo/prod-src (= campo-20261118/novo).
import hashlib, os, shutil, tarfile, io
E1 = 'output/contratos-aditivo-20261119/e1'
C36, C37, P = 'output/financeiro-20261116/cand36', 'output/financeiro-20261116/cand37', E1 + '/publicar'
h = lambda f: hashlib.sha256(open(f, 'rb').read()).hexdigest()
if os.path.isdir(P): shutil.rmtree(P)
os.makedirs(P)
man = []
for f in sorted(os.listdir(C37)):
    if not os.path.exists(os.path.join(C36, f)): man.append(('NOVO', f))
    elif h(os.path.join(C36, f)) != h(os.path.join(C37, f)): man.append(('ALTERADO', f))
w = lambda nome, linhas: open(os.path.join(P, nome), 'w', newline='\n').write(''.join(l + '\n' for l in linhas))
w('manifesto.txt', [a + ' ' + f for a, f in man])
w('base-hashes.txt', [h(os.path.join(C36, f)) + '  ' + f for a, f in man if a == 'ALTERADO'])
w('manifesto-hashes.txt', [h(os.path.join(C37, f)) + '  ' + f for a, f in man])
w('total-base.txt', [str(len(os.listdir(C36)))])
w('total-esperado.txt', [str(len(os.listdir(C37)))])
with tarfile.open(os.path.join(P, 'camada.tgz'), 'w:gz') as t:
    for a, f in man: t.add(os.path.join(C37, f), arcname=f)
pasta = lambda d: sorted(n for n in os.listdir(d) if os.path.isfile(os.path.join(d, n)))
w('campo-base.txt', [h(os.path.join(E1, 'campo/prod', n)) + '  ' + n for n in pasta(E1 + '/campo/prod')])
w('campo-base-src.txt', [h(os.path.join(E1, 'campo/prod-src', n)) + '  ' + n for n in pasta(E1 + '/campo/prod-src')])
w('campo-esperado.txt', [h(os.path.join(E1, 'campo/novo', n)) + '  ' + n for n in pasta(E1 + '/campo/novo')])
with tarfile.open(os.path.join(P, 'campo.tgz'), 'w:gz') as t:
    for d in ('dist', 'src'):
        for n in pasta(E1 + '/campo/novo'): t.add(os.path.join(E1, 'campo/novo', n), arcname='app/%s/publico/campo/%s' % (d, n))
shutil.copy(E1 + '/publicar.sh', P + '/publicar.sh')
print('pronto:', len(man), 'arquivos do legado', sum(1 for a, f in man if a == 'NOVO'), 'novo; total', len(os.listdir(C37)), '; app de campo', len(pasta(E1 + '/campo/novo')), 'arquivos')
