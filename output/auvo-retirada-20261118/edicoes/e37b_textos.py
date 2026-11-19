import sys, os, subprocess, tempfile
BLOCOS = [
(r'C:\Users\venda\projetos\google-script-dev\output\financeiro-20261116\cand31\SGO_Frota_ConteudoModulo.js', [
("quando o condutor tem atendimentos no Auvo, o deslocamento até cada um.", "quando o condutor tem O.S. da Assistência técnica, o deslocamento até cada uma."),
('(O.S. do Auvo, atividade ou cliente) são opcionais.', '(O.S., atividade ou cliente) são opcionais.'),
]),
(r'C:\Users\venda\projetos\google-script-dev\output\financeiro-20261116\cand31\SGO_Conduta_ConteudoModulo.js', [
("o registro de origem (Frota, Auvo, Atividades...)", "o registro de origem (Frota, Assistência técnica, Atividades...)"),
]),
(r'C:\Users\venda\projetos\google-script-dev\output\financeiro-20261116\cand31\SGO_Conduta_Biblioteca.js', [
("<tr><td>Auvo</td><td>O.S. finalizada sem foto, sem relato ou sem check-out; O.S. aberta há 3 dias ou mais</td>",
 "<tr><td>Assistência técnica</td><td>O.S. finalizada sem foto, sem relato ou sem check-out; O.S. aberta há 3 dias ou mais</td>"),
]),
]
rep = r'C:\Users\venda\AppData\Local\Temp\claude\b22c3c2c767b0e1f\e1d0539f-743d-4268-a74e-8dbd5da7591b\scratchpad\rep.py'
for arq, pares in BLOCOS:
    fd, tmp = tempfile.mkstemp(suffix='.py'); os.close(fd)
    open(tmp, 'w', encoding='utf-8').write('ARQ = %r\nPARES = %r\n' % (arq, pares))
    r = subprocess.run([sys.executable, rep, tmp], capture_output=True, text=True)
    print((r.stdout + r.stderr).strip()); os.remove(tmp)
    if r.returncode: sys.exit(1)
