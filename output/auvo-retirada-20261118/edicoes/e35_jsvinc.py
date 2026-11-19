import sys, os, subprocess, tempfile
BLOCOS = [
(r'C:\Users\venda\projetos\google-script-dev\output\financeiro-20261116\cand31\JS_Vinculos.html', [
("Só funciona se nada estiver ligado a ele; a ligação com o Auvo criada pelo SGO+ fica guardada e o contato da unidade fica inativo.",
 "Só funciona se nada estiver ligado a ele; a ligação com o histórico do Auvo fica guardada e o contato da unidade fica inativo."),
('["AUVO", "Integração com o Auvo"]', '["AUVO", "Histórico do Auvo"]'),
('ENTIDADE_ID: "Cadastro ligado no Auvo"', 'ENTIDADE_ID: "Cadastro ligado no histórico do Auvo"'),
("Certificados, laudos NR-13 e atendimentos do Auvo ficam no cadastro original.", "Certificados, laudos NR-13 e o histórico do Auvo ficam no cadastro original."),
]),
(r'C:\Users\venda\projetos\google-script-dev\output\financeiro-20261116\cand31\JS_CadastroCorrecoes.html', [
('AUVO_SYNC: "Integração com o Auvo"', 'AUVO_SYNC: "Histórico do Auvo (ligações)"'),
]),
(r'C:\Users\venda\projetos\google-script-dev\output\financeiro-20261116\cand31\SGO_Unidades.js', [
("""" Se o que prende a unidade é só a ligação com o Auvo (AUVO_SYNC), exclua por Cadastros > Vínculos: escolha a unidade, a ação Excluir e clique em Conferir impacto; a prévia mostra o que acontece com a ligação antes de confirmar.\"""",
 """" Se o que prende a unidade é só a ligação com o histórico do Auvo (AUVO_SYNC), exclua por Cadastros > Vínculos: escolha a unidade, a ação Excluir e clique em Conferir impacto; a ligação fica guardada como histórico.\""""),
]),
(r'C:\Users\venda\projetos\google-script-dev\output\financeiro-20261116\cand31\SGO_CadastroQualidade.js', [
("if (/AUVO/.test(o)) nome = 'Integração Auvo';", "if (/AUVO/.test(o)) nome = 'Histórico do Auvo';"),
]),
]
rep = r'C:\Users\venda\AppData\Local\Temp\claude\b22c3c2c767b0e1f\e1d0539f-743d-4268-a74e-8dbd5da7591b\scratchpad\rep.py'
for arq, pares in BLOCOS:
    fd, tmp = tempfile.mkstemp(suffix='.py'); os.close(fd)
    open(tmp, 'w', encoding='utf-8').write('ARQ = %r\nPARES = %r\n' % (arq, pares))
    r = subprocess.run([sys.executable, rep, tmp], capture_output=True, text=True)
    print((r.stdout + r.stderr).strip()); os.remove(tmp)
    if r.returncode: sys.exit(1)
