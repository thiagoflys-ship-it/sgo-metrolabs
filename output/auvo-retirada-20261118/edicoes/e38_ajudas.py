import sys, os, subprocess, tempfile
C = r'C:\Users\venda\projetos\google-script-dev\output\financeiro-20261116\cand31' + '\\'
BLOCOS = [
(C + 'SGO_Ajuda.js', [
("  auvo: 'Integração Auvo', frota: 'Frota',", "  auvo_historico: 'Histórico do Auvo', frota: 'Frota',"),
(" assistencia_transicao: 'Transição do Auvo', assistencia_portal: 'Meus chamados',", " assistencia_portal: 'Meus chamados',"),
]),
(C + 'SGO_AuvoAcervo_Tela.js', [
("  if (typeof Ajuda_abrir_ === 'function') Ajuda_abrir_('auvo/acervo');", "  if (typeof Ajuda_abrir_ === 'function') Ajuda_abrir_('auvo_historico');"),
]),
(C + 'SGO_Ajuda_Administracao.js', [
('{ nome: "\\"Conta técnica (Auvo)\\" na coluna E-mail", significado: "Conta da integração com o Auvo. Ela não é de uma pessoa, não usa e-mail e continua entrando como antes." },',
 '{ nome: "\\"Conta técnica (Auvo)\\" na coluna E-mail", significado: "Conta que a integração com o Auvo usava. O Auvo foi descontinuado em 18/11/2026: a conta não é de uma pessoa, não usa e-mail e pode ser inativada pelo Administrador." },'),
("(inteligência artificial, Auvo, e-mail, WhatsApp, rastreador da frota, COMMAND)", "(inteligência artificial, e-mail, WhatsApp, rastreador da frota, COMMAND)"),
("avisos da Frota, do Comercial, do Auvo e do Programa de conduta guardados para o resumo", "avisos da Frota, do Comercial e do Programa de conduta guardados para o resumo"),
("(Frota, Comercial, Compras, Assistência, Conduta, Auvo e Segurança predial)", "(Frota, Comercial, Compras, Assistência, Conduta e Segurança predial)"),
("O Atendente de IA, os avisos do Auvo ao cliente e o orçamento do chamado ficam retidos.", "O Atendente de IA e o orçamento do chamado ficam retidos."),
("O nome de usuário não existe mais para ninguém; a conta técnica do Auvo continua como antes.", "O nome de usuário não existe mais para ninguém; a antiga conta técnica do Auvo (sistema descontinuado em 18/11/2026) não é usada."),
("Caixa de decisões e Ponto, Atividades e comunicação, Cadastros, Auvo, Licitações e automação predial)", "Caixa de decisões e Ponto, Atividades e comunicação, Cadastros, histórico do Auvo e qualidade, Licitações e automação predial)"),
]),
(C + 'SGO_Ajuda_Assistencia.js', [
(""" Só o Administrador marca "Auvo desligado" na Transição do Auvo.' },""", """' },"""),
(" Em uso junto com o Auvo: atendimento novo nasce aqui; o que já estava no Auvo termina no Auvo.',", " O Auvo foi descontinuado em 18/11/2026: todo atendimento é feito aqui.',"),
("os atendimentos do SGO+ e do Auvo, as reservas de veículo", "os atendimentos do SGO+, as reservas de veículo"),
("'Itens cinza são do Auvo (só leitura); itens laranja são ausências ou reservas de veículo.'", "'Itens laranja são ausências ou reservas de veículo.'"),
("Nada é apagado e o Auvo continua como está.'] },", "Nada é apagado.'] },"),
('__RE__', r"    'assistencia_transicao': \{.*?\n      quemPode: quem\n    \},?\n", r"", 1),
]),
(C + 'SGO_Ajuda_Cadastros.js', [
("a equipe vê também o histórico de atendimentos do Auvo sem relatório em PDF no SGO+. Ele não conta como documento.",
 "a equipe vê também o histórico do Auvo (sistema descontinuado em 18/11/2026) sem relatório em PDF no SGO+. Ele é só para consulta e não conta como documento."),
('"Toque na aba \\"Atendimentos\\" para ver os atendimentos do Auvo ligados ao equipamento.",',
 '"Toque na aba \\"Atendimentos\\" para ver as O.S. do SGO+ e o histórico do Auvo ligados ao equipamento.",'),
('{ nome: "Selo verde \\"Concluído\\" na aba Atendimentos", significado: "O atendimento do Auvo foi finalizado." },',
 '{ nome: "Selo verde \\"Concluído\\" na aba Atendimentos", significado: "O atendimento foi finalizado." },'),
('{ nome: "Selo amarelo \\"Em andamento\\" na aba Atendimentos", significado: "O atendimento do Auvo ainda não foi finalizado." }',
 '{ nome: "Selo amarelo \\"Em andamento\\" na aba Atendimentos", significado: "A O.S. do SGO+ ainda não foi encerrada." },\n        { nome: "Selo cinza \\"Não finalizado no Auvo\\" na aba Atendimentos", significado: "Tarefa antiga do Auvo que ficou sem finalizar lá. É histórico: o Auvo foi descontinuado em 18/11/2026." }'),
('{ situacao: "A aba \\"Atendimentos\\" mostra \\"Nenhum atendimento do Auvo ligado a este equipamento\\".", oQueFazer: "O atendimento ainda não foi ligado a este equipamento no Auvo. Fale com a gestão da integração Auvo." }',
 '{ situacao: "A aba \\"Atendimentos\\" mostra \\"Nenhum atendimento ligado a este equipamento\\".", oQueFazer: "Nenhuma O.S. do SGO+ foi feita neste equipamento e o histórico do Auvo não tem tarefa ligada a ele. Atendimento novo é aberto em Assistência técnica." }'),
("contatos, a ligação com o Auvo, oportunidades, propostas", "contatos, a ligação com o histórico do Auvo, oportunidades, propostas"),
("A ligação da unidade com o Auvo continua guardada com ela;", "A ligação da unidade com o histórico do Auvo continua guardada com ela;"),
]),
(C + 'SGO_Ajuda_Compras.js', [
("'Se a compra for para um cliente, saiba qual cliente e, se houver, o número da O.S. do Auvo.',", "'Se a compra for para um cliente, saiba qual cliente e, se houver, o número da O.S.',"),
]),
(C + 'SGO_Ajuda_Conduta.js', [
("Frota, Auvo, Painel de qualidade, Minhas atividades, Avisos e o ponto do COMMAND só geram sugestões.", "Frota, Assistência técnica, Painel de qualidade, Minhas atividades, Avisos e o ponto do COMMAND só geram sugestões."),
("O.S. finalizada sem foto, sem relato ou sem check-out e O.S. aberta há dias (Auvo);", "O.S. finalizada sem foto, sem relato ou sem check-out e O.S. aberta há dias (Assistência técnica; o Auvo saiu em 18/11/2026);"),
('(ou \\"Abrir no Auvo\\", \\"Abrir Avisos\\"...)', '(ou \\"Abrir Assistência técnica\\", \\"Abrir Avisos\\"...)'),
("ou vincule o técnico em Integração Auvo. A sugestão aparece na próxima busca.", "ou confira o técnico na O.S. da Assistência técnica. A sugestão aparece na próxima busca."),
]),
(C + 'SGO_Ajuda_Frota.js', [
('(O.S. do Auvo, atividade ou cliente) são opcionais.', '(O.S., atividade ou cliente) são opcionais.'),
]),
(C + 'SGO_Ajuda_Ponto.js', [
("(só os horários de check-in e check-out do Auvo)", "(só os horários de chegada e conclusão das O.S. do SGO+)"),
("ou em atendimento no Auvo.' },", "ou em atendimento numa O.S. do SGO+.' },"),
("A única informação extra do pedido de ajuste é o horário do check-in e do check-out do Auvo naquele dia.", "A única informação extra do pedido de ajuste é o horário de chegada e de conclusão das O.S. do SGO+ naquele dia."),
("Com o check-in aberto no Auvo, o assistente não lembra.", "Com a chegada registrada numa O.S. e sem a conclusão, o assistente não lembra."),
]),
(C + 'SGO_Ajuda_Principal.js', [
('"Na gestão, veja também os atendimentos do Auvo: abertos, concluídos em 30 dias, O.S. sem relato de serviço, atendimentos por técnico e últimos atendimentos.",',
 '"Na gestão, veja também os atendimentos da Assistência técnica: abertos, concluídos em 30 dias, O.S. sem relato de serviço, atendimentos por técnico e últimos atendimentos.",'),
('"Últimos atendimentos\\" (Auvo)", significado:', '"Últimos atendimentos\\"", significado:'),
('{ situacao: "Não aparece o bloco de atendimentos do Auvo", oQueFazer: "O bloco só aparece para Gestor, Admin e Diretoria, e só quando há atendimentos registrados." }',
 '{ situacao: "Não aparece o bloco de atendimentos", oQueFazer: "O bloco só aparece para Gestor, Admin e Diretoria, e só quando há O.S. registradas na Assistência técnica." }'),
("o bloco de atendimentos do Auvo e os botões de gestão", "o bloco de atendimentos e os botões de gestão"),
('titulo: "Atendimento de O.S. e do Auvo (agenda única, 26/10/2026)",', 'titulo: "Atendimento de O.S. (agenda única, 26/10/2026)",'),
(' Os atendimentos do Auvo aparecem em cinza, só para consulta.",', ' Desde 18/11/2026 a agenda não mostra mais atendimentos do Auvo (sistema descontinuado).",'),
('"Se quiser, tire do e-mail de resumo os avisos do Comercial, da Frota ou do Auvo. Eles continuam no sistema.",',
 '"Se quiser, tire do e-mail de resumo os avisos do Comercial ou da Frota. Eles continuam no sistema.",'),
]),
(C + 'SGO_Ajuda_Qualidade.js', [
('"Mostra à gestão como estão os registros de campo: atendimentos do Auvo e uso da Frota.', '"Mostra à gestão como estão os registros de campo: O.S. da Assistência técnica e uso da Frota.'),
('"Os atendimentos chegam pela sincronização do Auvo (Integração Auvo). Se ela estiver desligada, o quadro do Auvo fica vazio.",',
 '"Os atendimentos são as O.S. registradas em Assistência técnica. O Auvo foi descontinuado em 18/11/2026 e não entra mais no painel.",'),
('{ nome: "\\"OK integrações respondendo\\" em verde", significado: "Auvo e Frota foram lidos agora." },',
 '{ nome: "\\"OK leituras respondendo\\" em verde", significado: "Assistência técnica e Frota foram lidas agora." },'),
('{ nome: "Aviso vermelho \\"integração com falha\\" ou amarelo \\"Auvo: conexão não configurada\\"", significado:',
 '{ nome: "Aviso vermelho \\"integração com falha\\"", significado:'),
('{ situacao: "\\"Nenhum atendimento do Auvo no período.\\"", oQueFazer: "Abra \\"Integração Auvo\\" e ligue a sincronização automática ou toque em \\"Sincronizar agora\\"." },',
 '{ situacao: "\\"Nenhuma O.S. da Assistência técnica no período.\\"", oQueFazer: "Confira em Assistência técnica se há O.S. no período ou escolha um período maior." },'),
]),
(C + 'SGO_Ajuda_RecargaCaju.js', [
("as O.S. do SGO+ e os atendimentos do Auvo já agendados para você na semana entram como itens.", "as O.S. do SGO+ já agendadas para você na semana entram como itens."),
]),
(C + 'SGO_EnviarDoc_Ajuda.js', [
("  auvo: 'depois de gerar o relatório de atendimentos (documento interno)',\n", ""),
]),
(C + 'SGO_Assistente.js', [
(" * aplicarRegrasDeAcesso_ (Usuários, Auvo, Qualidade),", " * aplicarRegrasDeAcesso_ (Usuários, Histórico do Auvo, Qualidade),"),
("  auvo: ['ADMIN', 'GESTOR', 'DIRETORIA'],", "  auvo_historico: ['ADMIN', 'DIRETORIA'], // 18/11/2026: Auvo descontinuado; só a consulta do histórico"),
]),
(C + 'SGO_AssistenteErros.js', [
("  [/^(Auvo[A-Za-z]*|tplAuvo)_/, 'auvo'],", "  [/^(Auvo[A-Za-z]*|tplAuvo)_/, 'auvo_historico'],"),
("JS_Auvo: 'auvo',", "JS_Auvo: 'auvo_historico',"),
]),
]
rep = r'C:\Users\venda\AppData\Local\Temp\claude\b22c3c2c767b0e1f\e1d0539f-743d-4268-a74e-8dbd5da7591b\scratchpad\rep.py'
for arq, pares in BLOCOS:
    fd, tmp = tempfile.mkstemp(suffix='.py'); os.close(fd)
    open(tmp, 'w', encoding='utf-8').write('ARQ = %r\nPARES = %r\n' % (arq, pares))
    r = subprocess.run([sys.executable, rep, tmp], capture_output=True, text=True)
    print((r.stdout + r.stderr).strip()); os.remove(tmp)
    if r.returncode: sys.exit(1)
