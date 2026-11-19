import sys, os, subprocess, tempfile
BLOCOS = [
(r'C:\Users\venda\projetos\google-script-dev\output\financeiro-20261116\cand31\SGO_Assistencia_Painel.js', [
(""" * ficaram sem ele, índice do acervo do Auvo por equipamento (um lote por rodada até terminar) e o relatório mensal.
 *
 * Transição do Auvo: os 6 critérios do projeto (seção 4.3). Quando todos estão cumpridos, só o Administrador marca
 * "Auvo desligado" (é um registro; nada é desligado sozinho: a integração com o Auvo continua até alguém desligá-la nela).""",
 """ * ficaram sem ele, índice do histórico do Auvo por equipamento (um lote por rodada até terminar, só leitura do que já foi
 * copiado) e o relatório mensal.
 *
 * 18/11/2026: o Auvo foi descontinuado pelo dono (SGO_Auvo_Retirada.js). A "Transição do Auvo" (6 critérios) saiu da tela e
 * do servidor; o registro dela (TRANSICAO nas regras da Assistência) fica guardado."""),
('__RE__', r"// -{60}\n// TRANSIÇÃO DO AUVO \(6 critérios do projeto, seção 4\.3\)\n// -{60}\nvar AST_CRITERIOS = \[.*?\nfunction AstP_marcarAuvoDesligado_\(eu, d\) \{.*?\n}\n",
 r"// 18/11/2026: a TRANSIÇÃO DO AUVO (AST_CRITERIOS, AstP_transicao_, AstP_confirmar_, AstP_destinoAuvo_ e AstP_marcarAuvoDesligado_)\n// saiu: o Auvo foi descontinuado pelo dono. O registro TRANSICAO fica nas regras da Assistência, só como histórico.\n", 1),
("Enquanto isso, o atendimento novo segue pelo Auvo.' };", "Enquanto isso, nenhum atendimento novo é aberto pelo SGO+.' };"),
]),
(r'C:\Users\venda\projetos\google-script-dev\output\financeiro-20261116\cand31\SGO_Assistencia_Chamados.js', [
("' do Auvo (transição)', efeito: 'Nada muda no Auvo; o destino registrado na Transição do Auvo continua.', alerta: false });",
 "' do Auvo (histórico)', efeito: 'Chamado aberto a partir de uma tarefa do Auvo, antes do Auvo ser descontinuado (18/11/2026).', alerta: false });"),
]),
(r'C:\Users\venda\projetos\google-script-dev\output\financeiro-20261116\cand31\JS_DocumentosPastas.html', [
("Atendimentos do Auvo e do histórico copiado do Auvo. Só a equipe vê esta lista; ela não conta como documento do prontuário.",
 "Histórico do Auvo (sistema descontinuado em 18/11/2026), só para consulta. Só a equipe vê esta lista; ela não conta como documento do prontuário."),
]),
(r'C:\Users\venda\projetos\google-script-dev\output\financeiro-20261116\cand31\JS_Vinculos.html', [
('AUVO_TAREFAS: "Atendimentos do Auvo", AUVO_SYNC: "Integração com o Auvo"', 'AUVO_TAREFAS: "Histórico do Auvo (atendimentos)", AUVO_SYNC: "Histórico do Auvo (ligações)"'),
]),
(r'C:\Users\venda\projetos\google-script-dev\output\financeiro-20261116\cand31\JS_WhatsappPiloto.html', [
("(Atendente de IA, avisos do Auvo, orçamento do chamado)", "(Atendente de IA, orçamento do chamado)"),
]),
(r'C:\Users\venda\projetos\google-script-dev\output\financeiro-20261116\cand31\SGO_WhatsappPiloto.js', [
("'Frota, Comercial, Compras, Assistência, Conduta, Auvo e Segurança predial'", "'Frota, Comercial, Compras, Assistência, Conduta e Segurança predial'"),
]),
(r'C:\Users\venda\projetos\google-script-dev\output\financeiro-20261116\cand31\SGO_Compras_Config.js', [
("CLIENTE: 'Cliente (atendimento, O.S. do Auvo)'", "CLIENTE: 'Cliente (atendimento, O.S.)'"),
]),
(r'C:\Users\venda\projetos\google-script-dev\output\financeiro-20261116\cand31\SGO_Compras_Requisicoes.js', [
("' · O.S. do Auvo ' + Cmp_s_(r.OS_AUVO)", "' · O.S. ' + Cmp_s_(r.OS_AUVO)"),
]),
(r'C:\Users\venda\projetos\google-script-dev\output\financeiro-20261116\cand31\JS_Compras.html', [
('Cp_campo_("Número da O.S. do Auvo (se houver)"', 'Cp_campo_("Número da O.S. (se houver)"'),
]),
(r'C:\Users\venda\projetos\google-script-dev\output\financeiro-20261116\cand31\SGO_Notificar.js', [
("— Auvo/COMMAND',", "— COMMAND',", 2),
]),
(r'C:\Users\venda\projetos\google-script-dev\output\financeiro-20261116\cand31\SGO_Frota_ConteudoModulo.js', [
("quando o condutor tem atendimentos no Auvo, o deslocamento até cada um.", "quando o condutor tem O.S. da Assistência técnica, o deslocamento até cada uma."),
('Passageiros e \\\\"Ligar a\\\\" (O.S. do Auvo, atividade ou cliente) são opcionais.', 'Passageiros e \\\\"Ligar a\\\\" (O.S., atividade ou cliente) são opcionais.'),
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
