import runpy, sys
# Vários arquivos: este roteiro aplica um por vez chamando o mesmo motor (rep.py) com ARQ/PARES de cada bloco.
BLOCOS = [
(r'C:\Users\venda\projetos\google-script-dev\output\financeiro-20261116\cand31\SGO_RecargaCaju_Semanal.js', [
(" *    do SGO+ e os atendimentos do Auvo já agendados para a pessoa na semana (só leitura; nada é gravado na agenda).",
 " *    do SGO+ já agendadas para a pessoa na semana (só leitura; nada é gravado na agenda). 18/11/2026: sem o Auvo (descontinuado pelo dono)."),
(" * O.S. do SGO+ e atendimentos do Auvo agendados para a pessoa na semana (só leitura). [{ dia, cliente, ref, atividade, endereco, fonte }].",
 " * O.S. do SGO+ agendadas para a pessoa na semana (só leitura). [{ dia, cliente, ref, atividade, endereco, fonte }].\n * 18/11/2026: Auvo descontinuado pelo dono; só a origem SGO (tarefa antiga do Auvo não entra)."),
("SGO_Atendimentos_linhas_({}) : Via_ler_('ATEC_OS')", "SGO_Atendimentos_linhas_({ origem: 'SGO' }) : Via_ler_('ATEC_OS')"),
("      if (Via_s_(t.TECNICO_ID_SGO) !== Via_s_(uid) || !dia || dia < de || dia > ate || Via_up_(t.CANCELADA) === 'SIM') return;",
 "      if (Via_up_(t.ORIGEM) !== 'SGO' || Via_s_(t.TECNICO_ID_SGO) !== Via_s_(uid) || !dia || dia < de || dia > ate || Via_up_(t.CANCELADA) === 'SIM') return;"),
("ref: (Via_up_(t.ORIGEM) === 'AUVO' ? 'Auvo ' : 'O.S. ') + Via_s_(t.AUVO_TASK_ID),", "ref: 'O.S. ' + Via_s_(t.AUVO_TASK_ID),"),
("endereco: Via_s_(t.ENDERECO), fonte: Via_up_(t.ORIGEM) === 'AUVO' ? 'AUVO' : 'SGO' });", "endereco: Via_s_(t.ENDERECO), fonte: 'SGO' });"),
("'Nenhuma O.S. ou atendimento do Auvo agendado para você na '", "'Nenhuma O.S. agendada para você na '"),
]),
(r'C:\Users\venda\projetos\google-script-dev\output\financeiro-20261116\cand31\SGO_RecargaCaju.js', [
("// 18/11/2026 (pacote 4): O.S. e Auvo da semana, para a programação", "// 18/11/2026 (pacote 4): O.S. da semana, para a programação"),
]),
(r'C:\Users\venda\projetos\google-script-dev\output\financeiro-20261116\cand31\JS_RecargaCaju.html', [
('"Número da O.S. do SGO+ ou da tarefa do Auvo, se houver."', '"Número da O.S. do SGO+, se houver."'),
("Traz as O.S. do SGO+ e os atendimentos do Auvo já agendados para você na semana. Confira e complete cada um.",
 "Traz as O.S. do SGO+ já agendadas para você na semana. Confira e complete cada um."),
]),
(r'C:\Users\venda\projetos\google-script-dev\output\financeiro-20261116\cand31\SGO_Ponto_Config.js', [
(" * (SGO_Notificar.js, categoria PONTO), ausências do Programa de conduta, atendimentos do Auvo, Minhas atividades,",
 " * (SGO_Notificar.js, categoria PONTO), ausências do Programa de conduta, O.S. da Assistência (SGO+), Minhas atividades,"),
(" *  - Não lembra quem está em atendimento no Auvo (check-in sem check-out) nem quem está ausente (férias e afastamento",
 " *  - Não lembra quem está em atendimento numa O.S. (chegada sem conclusão) nem quem está ausente (férias e afastamento"),
(" *  - LGPD: nada de localização. A evidência do pedido de ajuste é só o horário do check-in/check-out do Auvo.",
 " *  - LGPD: nada de localização. A evidência do pedido de ajuste é só o horário de chegada e conclusão das O.S. do SGO+.\n *  - 18/11/2026: Auvo descontinuado pelo dono; tarefa do Auvo não conta mais (só O.S. do SGO+)."),
("""/** Tarefas do Auvo do dia por técnico (lidas uma vez por rodada). */""",
 """/** O.S. do dia por técnico (lidas uma vez por rodada). O nome ficou; 18/11/2026: só O.S. do SGO+ (Auvo descontinuado). */"""),
("""    // 21/10/2026: fonte única (Auvo + O.S. da Assistência do SGO+): o técnico em atendimento no aplicativo novo também conta
    (typeof SGO_Atendimentos_linhas_ === 'function' ? SGO_Atendimentos_linhas_() : Pto_ler_(Ponto_abaAuvo_())).forEach(function (t) {""",
 """    // 21/10/2026: fonte única da Assistência. 18/11/2026: só a origem SGO (o Auvo foi descontinuado pelo dono)
    (typeof SGO_Atendimentos_linhas_ === 'function' ? SGO_Atendimentos_linhas_({ origem: 'SGO' }) : []).forEach(function (t) {"""),
("/** Evidência para o pedido de ajuste: só os horários de check-in e check-out do Auvo naquele dia (sem local, sem cliente). */",
 "/** Evidência para o pedido de ajuste: só os horários de chegada e conclusão das O.S. naquele dia (sem local, sem cliente). */"),
]),
(r'C:\Users\venda\projetos\google-script-dev\output\financeiro-20261116\cand31\SGO_Ponto_Rodada.js', [
(" *     ausente ou em atendimento no Auvo = não lembra (fica registrado como \"não lembrado\", com o motivo);",
 " *     ausente ou em atendimento numa O.S. = não lembra (fica registrado como \"não lembrado\", com o motivo);"),
("""'não lembrado: em atendimento no Auvo (tarefa ' + at.id + ', check-in ' + Pto_horaDe_(new Date(at.ci)) + ')'""",
 """'não lembrado: em atendimento (O.S. ' + at.id + ', chegada ' + Pto_horaDe_(new Date(at.ci)) + ')'"""),
]),
(r'C:\Users\venda\projetos\google-script-dev\output\financeiro-20261116\cand31\JS_Ponto.html', [
("(só os horários de check-in e check-out do Auvo)", "(só os horários de chegada e conclusão das O.S. do SGO+)"),
]),
(r'C:\Users\venda\projetos\google-script-dev\output\financeiro-20261116\cand31\SGO_Frota_Rastreamento.js', [
("/** Atendimentos do Auvo do condutor no período (check-in/check-out) com o deslocamento até cada um, pela rota. */",
 "/** Atendimentos (O.S. do SGO+) do condutor no período (chegada/conclusão) com o deslocamento até cada um, pela rota. 18/11/2026: sem o Auvo. */"),
("""  // 21/10/2026: fonte única de atendimentos (Auvo + O.S. da Assistência do SGO+, com o "Cheguei" e o "Concluí" do aplicativo)
  var atend = typeof SGO_Atendimentos_linhas_ === 'function' ? SGO_Atendimentos_linhas_() : Frota_lerSeExistir_(SGO_CFG.SHEETS.AUVO_TAREFAS);""",
 """  // 21/10/2026: fonte única de atendimentos (O.S. da Assistência do SGO+, com o "Cheguei" e o "Concluí" do aplicativo).
  // 18/11/2026: só a origem SGO (Auvo descontinuado pelo dono).
  var atend = typeof SGO_Atendimentos_linhas_ === 'function' ? SGO_Atendimentos_linhas_({ origem: 'SGO' }) : [];"""),
("/** Rota de uma retirada: análise + dados da retirada + atendimentos do Auvo. Sem trilha (quem chama registra). */",
 "/** Rota de uma retirada: análise + dados da retirada + atendimentos (O.S.) do condutor. Sem trilha (quem chama registra). */"),
]),
(r'C:\Users\venda\projetos\google-script-dev\output\financeiro-20261116\cand31\SGO_Frota_RastreamentoTela.js', [
("'<h3>Atendimentos do condutor (Auvo)</h3>'", "'<h3>Atendimentos do condutor (O.S.)</h3>'"),
]),
(r'C:\Users\venda\projetos\google-script-dev\output\financeiro-20261116\cand31\SGO_Frota_RastreamentoGestao.js', [
("RelA4_secao_('Atendimentos do condutor no período (Auvo)'", "RelA4_secao_('Atendimentos do condutor no período (O.S.)'"),
]),
(r'C:\Users\venda\projetos\google-script-dev\output\financeiro-20261116\cand31\SGO_Frota_Reservas.js', [
(" *     destino, motivo, passageiros opcionais, ligação opcional a O.S. do Auvo, atividade ou cliente). Sem",
 " *     destino, motivo, passageiros opcionais, ligação opcional a O.S., atividade ou cliente). Sem"),
("var FROTA_RES_VINCULOS = { AUVO: 'O.S. do Auvo', ATIVIDADE: 'Atividade', CLIENTE: 'Cliente' };",
 "// 18/11/2026: a chave AUVO ficou (reservas antigas guardam esse tipo), mas a ligação é à O.S. do SGO+ (Auvo descontinuado pelo dono).\nvar FROTA_RES_VINCULOS = { AUVO: 'O.S.', ATIVIDADE: 'Atividade', CLIENTE: 'Cliente' };"),
("/** Ligação opcional: O.S. do Auvo (número), atividade (das minhas abertas) ou cliente (cadastro). */",
 "/** Ligação opcional: O.S. do SGO+ (número), atividade (das minhas abertas) ou cliente (cadastro). */"),
("""    // 21/10/2026: a O.S. pode ser do Auvo ou da Assistência do SGO+ (fonte única, SGO_Assistencia_Fonte.js)
    var t = (typeof SGO_Atendimentos_linhas_ === 'function' ? SGO_Atendimentos_linhas_() : Frota_lerSeExistir_(SGO_CFG.SHEETS.AUVO_TAREFAS || 'AUVO_TAREFAS')).filter(""",
 """    // 21/10/2026: O.S. da Assistência do SGO+ (fonte única, SGO_Assistencia_Fonte.js). 18/11/2026: sem o Auvo (descontinuado).
    var t = (typeof SGO_Atendimentos_linhas_ === 'function' ? SGO_Atendimentos_linhas_({ origem: 'SGO' }) : []).filter("""),
("' (não encontrada na integração do Auvo)'", "' (O.S. não encontrada na Assistência técnica)'"),
]),
(r'C:\Users\venda\projetos\google-script-dev\output\financeiro-20261116\cand31\SGO_Frota_ReservasTela.js', [
("""'<label for="frs_fVi">Número da O.S. no Auvo</label>""", """'<label for="frs_fVi">Número da O.S.</label>"""),
]),
]
rep = r'C:\Users\venda\AppData\Local\Temp\claude\b22c3c2c767b0e1f\e1d0539f-743d-4268-a74e-8dbd5da7591b\scratchpad\rep.py'
import subprocess, json, os, tempfile
for arq, pares in BLOCOS:
    fd, tmp = tempfile.mkstemp(suffix='.py'); os.close(fd)
    open(tmp, 'w', encoding='utf-8').write('ARQ = %r\nPARES = %r\n' % (arq, pares))
    r = subprocess.run([sys.executable, rep, tmp], capture_output=True, text=True)
    print((r.stdout + r.stderr).strip())
    os.remove(tmp)
    if r.returncode: sys.exit(1)
