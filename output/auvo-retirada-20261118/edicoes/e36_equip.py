import sys, os, subprocess, tempfile
BLOCOS = [
(r'C:\Users\venda\projetos\google-script-dev\output\financeiro-20261116\cand31\SGO_Assistencia_Fonte.js', [
("origemNome: t.ORIGEM === 'SGO' ? 'SGO+' : 'Auvo',", "origemNome: t.ORIGEM === 'SGO' ? 'SGO+' : 'Auvo (histórico)',"),
]),
(r'C:\Users\venda\projetos\google-script-dev\output\financeiro-20261116\cand31\JS_Equipamentos.html', [
("""(x.finalizada ? '<span class="cadx-selo bc-selo tom-ok">Concluído</span>' : '<span class="cadx-selo bc-selo tom-alerta">Em andamento</span>')""",
 """(x.finalizada ? '<span class="cadx-selo bc-selo tom-ok">Concluído</span>' : (/^AUVO/.test(x.origem || "AUVO") ? '<span class="cadx-selo bc-selo">Não finalizado no Auvo</span>' : '<span class="cadx-selo bc-selo tom-alerta">Em andamento</span>'))"""),
("Nenhum atendimento ligado a este equipamento (SGO+, Auvo ou histórico do Auvo).", "Nenhum atendimento ligado a este equipamento (SGO+ ou histórico do Auvo)."),
("                // 21/10/2026: fonte única (Assistência técnica do SGO+, Auvo e o histórico copiado do Auvo)",
 "                // 21/10/2026: fonte única (Assistência técnica do SGO+ e o histórico do Auvo; 18/11/2026: Auvo descontinuado, só consulta)"),
]),
(r'C:\Users\venda\projetos\google-script-dev\output\financeiro-20261116\cand31\SGO_Equipamentos.js', [
("""  // Atendimentos do Auvo vinculados a este equipamento (via equipmentsId
  // do Task, resolvido sob demanda em SGO_Auvo_Incremental.js). Só""",
 """  // Atendimentos vinculados a este equipamento: O.S. do SGO+ e o histórico do Auvo
  // (18/11/2026: Auvo descontinuado pelo dono; o histórico fica só para consulta). Só"""),
]),
]
rep = r'C:\Users\venda\AppData\Local\Temp\claude\b22c3c2c767b0e1f\e1d0539f-743d-4268-a74e-8dbd5da7591b\scratchpad\rep.py'
for arq, pares in BLOCOS:
    fd, tmp = tempfile.mkstemp(suffix='.py'); os.close(fd)
    open(tmp, 'w', encoding='utf-8').write('ARQ = %r\nPARES = %r\n' % (arq, pares))
    r = subprocess.run([sys.executable, rep, tmp], capture_output=True, text=True)
    print((r.stdout + r.stderr).strip()); os.remove(tmp)
    if r.returncode: sys.exit(1)
