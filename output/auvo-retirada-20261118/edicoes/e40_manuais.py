import sys, os, subprocess, tempfile
D = r'C:\Users\venda\projetos\google-script-dev\docs' + '\\'
BLOCOS = [
(D + 'MANUAL_MODULO_ASSISTENCIA.md', [
("""Assistência técnica nativa do SGO+ (21/10/2026). Substitui o uso do Auvo para chamados, agenda, ordens de serviço,
relatório do atendimento e acompanhamento do cliente. Funciona em paralelo ao Auvo até os seis critérios da tela
"Transição do Auvo" serem cumpridos. O aplicativo do técnico no celular tem manual próprio (Manual do SGO+ Campo).""",
"""Assistência técnica nativa do SGO+ (21/10/2026). Substituiu o Auvo para chamados, agenda, ordens de serviço,
relatório do atendimento e acompanhamento do cliente. Em 18/11/2026 o dono descontinuou o Auvo: ele não faz mais parte
do SGO+ e todo atendimento é feito aqui. O histórico copiado do Auvo fica só para consulta (ficha do equipamento e
"Histórico do Auvo"). O aplicativo do técnico no celular tem manual próprio (Manual do SGO+ Campo)."""),
("""- Administrador: marca "Auvo desligado" quando os seis critérios estão cumpridos.
""", ""),
("""- Integração Auvo: a lista "O.S. aberta no Auvo" é uma foto da última varredura. A O.S. que a sincronização das tarefas
  leu depois dessa foto já finalizada, ou com a data passada para um dia depois de hoje (reagendada no Auvo), sai da
  lista; a próxima varredura confirma. Leitura da tarefa mais antiga que a foto não muda nada.
""", """- Desde 18/11/2026 não existem mais pendências do Auvo (O.S. aberta no Auvo, O.S. sem vínculo, importação parada): o
  Auvo foi descontinuado pelo dono.
"""),
("""3. Toque em "Agendar". Se o técnico já tem O.S. no horário, tarefa aberta no Auvo ou ausência (férias, afastamento,""",
 """3. Toque em "Agendar". Se o técnico já tem O.S. no horário ou ausência (férias, afastamento,"""),
("""Agenda dos técnicos: dia ou semana, com os atendimentos do SGO+ e do Auvo, reservas de veículo e ausências. "Rota do""",
 """Agenda dos técnicos: dia ou semana, com os atendimentos do SGO+, reservas de veículo e ausências. "Rota do"""),
(""""Assistência do SGO+ ligada". Tipos de serviço (29, vindos dos 30 tipos do Auvo) e modelos de checklist (editáveis;
"Trazer os questionários do Auvo" cria os modelos a partir dos 13 questionários copiados no acervo). Quando a lista de questionários do acervo veio vazia, "Montar os checklists a partir das tarefas do Auvo" (e a rotina, de hora em hora) lê as tarefas copiadas em lotes e monta um modelo por questionário, com as perguntas na ordem mais frequente e o tipo de resposta inferido das respostas (foto, assinatura, sim ou não, número, opção, texto). Esses modelos nascem inativos: revise e marque "Ativo" no editor do modelo. Cada mudança""",
 """"Assistência do SGO+ ligada". Tipos de serviço (29, vindos dos 30 tipos que eram usados no Auvo) e modelos de checklist
(editáveis; os modelos que vieram dos questionários do Auvo continuam na lista como os demais). Modelo inativo
(rascunho) não aparece no aplicativo do técnico: revise as perguntas e marque "Ativo" no editor do modelo. Cada mudança"""),
("""## Fonte única de atendimentos e o Auvo

Painel de qualidade, Programa de conduta (sugestões), Frota (deslocamento até o atendimento), ponto (técnico em
atendimento não recebe lembrete), central de pendências, Início, ficha do equipamento e Vínculos leem a mesma lista:
tarefas do Auvo e O.S. do SGO+. A ficha do equipamento mostra também o histórico copiado do Auvo; as fotos do acervo
abrem só para a equipe interna.

## Transição do Auvo

Os seis critérios do projeto, cada um com o que o sistema mediu e a confirmação da gestão:

1. Cópia do acervo do Auvo com zero faltas (ou faltas aceitas pelo dono) e o backup conferido.
2. Quatro semanas seguidas com todos os técnicos só no SGO+, sem atendimento perdido.
3. Painel de qualidade, Conduta e Frota mostrando os dados do módulo novo, conferidos pela gestão.
4. Nenhuma O.S. aberta no Auvo, ou cada uma com destino registrado (fechar no Auvo, recriar como chamado no SGO+ ou
   não houve atendimento).
5. Pelo menos um atendimento feito sem internet e sincronizado sem perda, conferido.
6. Relatório da O.S. aprovado pela Qualidade e já enviado a clientes reais.

Com os seis cumpridos, o Administrador marca "Auvo desligado". É o registro da decisão: nada é desligado sozinho.
Depois, desligue os gatilhos em Integração Auvo, retire a criação de tarefa nos geradores e cancele o contrato.""",
 """## Fonte única de atendimentos e o histórico do Auvo

Painel de qualidade, Programa de conduta (sugestões), Frota (deslocamento até o atendimento), ponto (técnico em
atendimento não recebe lembrete), central de pendências, Início, agenda, Recarga semanal e Vínculos leem a mesma
lista: as O.S. do SGO+. Desde 18/11/2026 (Auvo descontinuado pelo dono) as tarefas do Auvo não entram mais nessa
lista nem em nenhum indicador, aviso ou cobrança.

O histórico do Auvo não foi apagado. A ficha do equipamento (aba Atendimentos), o prontuário, o QR e o Portal do
cliente continuam mostrando o histórico do Auvo ligado ao equipamento, como antes; as fotos do acervo abrem só para a
equipe interna. A consulta completa do que foi copiado fica em "Histórico do Auvo", só para o Administrador e a
Diretoria.

## Fim do Auvo (18/11/2026)

O dono cancelou o contrato com o Auvo. A tela "Transição do Auvo" e os seis critérios saíram; o registro da
transição fica guardado. Nenhuma rotina, pendência, aviso, alerta ou item da Caixa de decisões vem mais do Auvo, e
os documentos (certificado, laudo NR-13, PGT/POP, registro operacional) não criam mais tarefa no Auvo."""),
("""   - Reclamação, pedido do cliente, pedido aprovado do Comercial e tarefa do Auvo: continuam onde estão; nada muda no Auvo.""",
 """   - Reclamação, pedido do cliente e pedido aprovado do Comercial: continuam onde estão."""),
("""- Em Atividades da equipe, o Gantt mostra o atendimento em azul no horário da O.S. e os atendimentos do Auvo em cinza (só consulta).""",
 """- Em Atividades da equipe, o Gantt mostra o atendimento em azul no horário da O.S."""),
]),
(D + 'MANUAL_APP_CAMPO.md', [
("O SGO+ Campo é o aplicativo do técnico de campo da Metrolabs. Ele substitui o aplicativo do Auvo",
 "O SGO+ Campo é o aplicativo do técnico de campo da Metrolabs. Ele substituiu o aplicativo do Auvo (descontinuado em 18/11/2026)"),
("últimos atendimentos dele (inclusive os do Auvo).", "últimos atendimentos dele (inclusive o histórico do Auvo)."),
]),
(D + 'MANUAL_CLIENTES_UNIDADES_VINCULOS.md', [
("aplicativo de campo da Assistência, sincronização do Auvo, importação do CRM) continuam como estavam;",
 "aplicativo de campo da Assistência, importação do CRM) continuam como estavam;"),
("(ou com a origem: Integração Auvo, Importação do CRM, cadastro em campo)", "(ou com a origem: Histórico do Auvo, Importação do CRM, cadastro em campo)"),
("contatos, a ligação com o Auvo, oportunidades, propostas", "contatos, a ligação com o histórico do Auvo, oportunidades, propostas"),
('__RE__', r"### Unidades ligadas ao Auvo \(21/10/2026\)\n.*?(\n\n#|\Z)",
 r"### Unidades ligadas ao Auvo (histórico; Auvo descontinuado em 18/11/2026)\n\n- A ligação da unidade com o cliente do Auvo fica guardada com a unidade, só para consulta. Desvincular, transferir e excluir não são impedidos por ela.\n- **Transferir** a unidade para outro cliente leva junto os equipamentos, os documentos, os contatos da unidade e a ligação com o histórico do Auvo daquele endereço (quando existir).\n- **Excluir** uma unidade que só tem a ligação com o histórico do Auvo e/ou um contato: a prévia mostra que a ligação fica guardada como de cadastro excluído (para consulta) e que o contato fica inativo; nada é apagado além da unidade.\1", 1),
]),
(D + 'MANUAL_CONDUTA_FISCAL.md', [
("| Auvo | O.S. finalizada sem foto, sem relato ou sem check-out; O.S. aberta há 3 dias ou mais | CAM-01 ou CAM-02 |",
 "| Assistência técnica (O.S. do SGO+; o Auvo saiu em 18/11/2026) | O.S. finalizada sem foto, sem relato ou sem check-out; O.S. aberta há 3 dias ou mais | CAM-01 ou CAM-02 |"),
]),
(D + 'MANUAL_ENVIAR_DOCUMENTO.md', [
("| Painel de qualidade, Auvo | Relatórios de gestão e de atendimentos | interno |", "| Painel de qualidade | Relatórios de gestão | interno |"),
]),
(D + 'MANUAL_MATRIZ_DE_AVISOS.md', [
("avisos da Frota, do Comercial, do Auvo e do Programa de conduta", "avisos da Frota, do Comercial e do Programa de conduta"),
("(ex.: chamado do Auvo concluído)", "(ex.: missão cadastrada em que você é executante)"),
("5. Se quiser, tire do e-mail de resumo os avisos do Comercial, da Frota ou do Auvo (continuam no sistema).", "5. Se quiser, tire do e-mail de resumo os avisos do Comercial ou da Frota (continuam no sistema)."),
("(rastreador sem conexão, importação do Auvo parada)", "(rastreador sem conexão)"),
]),
(D + 'MANUAL_MODULO_COMPRAS.md', [
("cliente (com a unidade e, se houver, o número da O.S. do Auvo)", "cliente (com a unidade e, se houver, o número da O.S.)"),
]),
(D + 'MANUAL_MODULO_FROTA.md', [
("quando o condutor tem atendimentos no Auvo, o deslocamento até cada um.", "quando o condutor tem O.S. da Assistência técnica, o deslocamento até cada uma."),
('"Ligar a" (O.S. do Auvo, atividade ou cliente)', '"Ligar a" (O.S., atividade ou cliente)'),
]),
(D + 'MANUAL_MODULO_GESTAO_DECISOES.md', [
("| Qualidade e Auvo | O.S. com registro incompleto, retirada com registro incompleto, O.S. aberta, O.S. sem vínculo, importação do Auvo parada (administrador) |",
 "| Qualidade | O.S. com registro incompleto, retirada com registro incompleto (desde 18/11/2026 os itens do Auvo não existem mais: o Auvo foi descontinuado pelo dono) |"),
("NR-13 e Auvo: Técnica/Campo;", "NR-13: Técnica/Campo;"),
('__RE__', r"(Pedido do dono \(11/11/2026\): \"desempenho da gestão, isso está horrível\")",
 r"Atualização de 18/11/2026: o Auvo foi descontinuado pelo dono. Os itens do Auvo (O.S. aberta, O.S. sem vínculo, importação parada) saíram da Caixa na primeira atualização, marcados como \"Retirada (Auvo descontinuado)\": não contam como decisão, nem como resolvidos, nem na nota. O saneamento abaixo vale só como registro do que foi feito antes; o histórico fica guardado.\n\n\1", 1),
]),
(D + 'MANUAL_MODULO_PONTO.md', [
("- quem está em atendimento no Auvo (check-in feito, sem check-out).", "- quem está em atendimento numa O.S. do SGO+ (chegada registrada, sem conclusão)."),
("A evidência é só o horário de check-in e de check-out do Auvo naquele dia.", "A evidência é só o horário de chegada e de conclusão das O.S. do SGO+ naquele dia."),
]),
(D + 'MANUAL_MODULO_PORTAL_CLIENTE.md', [
("(O.S. do SGO+ e tarefas do Auvo encerradas)", "(O.S. do SGO+ e o histórico do Auvo encerrado, que fica só para consulta desde 18/11/2026)"),
]),
(D + 'MANUAL_MODULO_REPRESENTACAO.md', [
("(a do Auvo e da Frota fica embaixo)", "(a da Frota fica embaixo)"),
]),
(D + 'MANUAL_NAVEGACAO_VOLTAR.md', [
("marcações do Piloto do WhatsApp e chaves da Integração Auvo com 44 px;", "marcações do Piloto do WhatsApp com 44 px;"),
]),
(D + 'MANUAL_PAINEL_FINANCEIRO.md', [
("puxada da agenda de O.S. do SGO+ e do Auvo quando houver.", "puxada da agenda de O.S. do SGO+ quando houver."),
]),
(D + 'MANUAL_RECARGA_CAJU.md', [
("As O.S. do SGO+ e os atendimentos do Auvo já agendados para você naquela semana entram como itens,", "As O.S. do SGO+ já agendadas para você naquela semana entram como itens,"),
]),
(D + 'MANUAL_SEGURANCA_ACESSO_GESTAO.md', [
("- A conta técnica do Auvo continua entrando como antes (pelo nome), fora da troca obrigatória e do código.",
 "- A conta técnica do Auvo ficou sem uso: o Auvo foi descontinuado em 18/11/2026. O Administrador pode inativá-la em Usuários."),
]),
(D + 'MANUAL_MODULO_EMAIL.md', [
("10 clientes importados do Auvo tinham", "10 clientes importados do Auvo (sistema descontinuado em 18/11/2026) tinham"),
]),
]
rep = r'C:\Users\venda\AppData\Local\Temp\claude\b22c3c2c767b0e1f\e1d0539f-743d-4268-a74e-8dbd5da7591b\scratchpad\rep.py'
for arq, pares in BLOCOS:
    fd, tmp = tempfile.mkstemp(suffix='.py'); os.close(fd)
    open(tmp, 'w', encoding='utf-8').write('ARQ = %r\nPARES = %r\n' % (arq, pares))
    r = subprocess.run([sys.executable, rep, tmp], capture_output=True, text=True)
    print((r.stdout + r.stderr).strip()); os.remove(tmp)
    if r.returncode: sys.exit(1)
