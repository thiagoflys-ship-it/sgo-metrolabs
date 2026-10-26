# Manual da Matriz de avisos e de Meus avisos (SGO+ e COMMAND)

Versão de 21/10/2026. Matriz aprovada pelo dono em 21/10/2026 (estudo `docs/MATRIZ_DE_AVISOS_20261021.md`, todas as respostas da seção 8 conforme a recomendação). Telas: SGO+ › Administração › Matriz de avisos (Administrador e Diretoria) e SGO+ › Principal › Meus avisos (cada pessoa), em `JS_AvisosMatriz.html`. Servidor: `SGO_Avisos_Matriz.js` (regras, resumo do dia, preferências, central por área e medição) e `SGO_Notificar.js` (todo envio passa pela matriz).

## 1. Para que serve

Define, para cada aviso que o sistema manda, quem recebe e por qual canal. Uma tabela só (evento, público, canal e frequência), com a matriz aprovada como padrão. O notificador consulta a tabela em todo envio. O Administrador e a Diretoria ajustam na tela; cada mudança fica na trilha. Cada pessoa ajusta o que é opcional em Meus avisos.

## 2. Os três canais

| Canal | O que vai | Quando |
|---|---|---|
| Sistema | Todo aviso (Início, central de pendências, Caixa de decisões, sino). Cobra até ser resolvido. | Na hora, sempre |
| E-mail de resumo do dia | Um e-mail por pessoa com o que espera por ela: atividades, decisões (gestor), avisos da Frota, do Comercial, do Auvo e do Programa de conduta, a contagem de avisos com ciência e a contagem de mensagens não lidas no bate-papo | A partir das 08:00 do dia útil (ou 12:00, se a pessoa escolher), só se houver algo |
| E-mail na hora | O que exige ciência (avisos), o que muda algo de hoje (reserva cancelada ou trocada, lembrete da reserva, cliente respondeu a proposta, pedido de apoio, atividade com prazo para hoje) | Na hora, no expediente; fora dele, sai agrupado na primeira rodada do expediente seguinte |
| WhatsApp de resumo do dia | Só contagens: atividades atrasadas, para hoje e novas, decisões paradas, avisos para confirmar, mensagens não lidas | A partir das 09:30 do dia útil, só CLT e PJ, só se a pessoa ainda não abriu o sistema, só se há item para hoje, atrasado ou decisão parada; durante o piloto, só quem está na lista do piloto |
| WhatsApp na hora | As quatro exceções da Frota, a campainha, o aviso urgente (S70) e todo evento que a gestão marcar "Na hora" na matriz (26/10/2026) | No expediente, só CLT e PJ; as exceções da Frota e a campainha, uma por pessoa por dia em cada uma; os demais eventos somam até 3 por pessoa por dia (teto ajustável em Alterar horários, de 1 a 10) |

As quatro exceções do WhatsApp na hora: partida não liberada pelo rastreador (gestor da Frota); veículo em uso sem registro, só no expediente (gestor da Frota; fora do expediente vai no resumo do dia seguinte); devolução atrasada com reserva no mesmo dia (quem está com o veículo); reserva de hoje liberada a outra pessoa (quem reservou).

Nada sai fora do expediente da empresa (Atividades da equipe › Avisos e horários). WhatsApp e e-mail de resumo nunca levam valor em reais, dado pessoal, assunto de conduta, ocorrência, incentivo ou ponto de colega: esses vão só como contagem.

## 3. Regras gerais que valem para todo envio

- WhatsApp para vínculo CLT e PJ (decisão de 26/10/2026; Administração › Usuários › Vínculo: CLT, PJ ou Diretoria). Os lembretes do ponto vão só para CLT. Diretoria e vínculo não informado recebem pelo sistema e por e-mail; a Diretoria só recebe WhatsApp se a gestão a marcar em Atividades da equipe › Avisos e horários. Vale para todos os módulos, inclusive Frota, Programa de conduta, Avisos e Auvo.
- WhatsApp na hora só nos eventos marcados "Na hora" na matriz (desde 26/10/2026, qualquer evento pode ser marcado pelo Administrador ou pela Diretoria, com motivo). Fora deles e do resumo do dia, o envio fica PULADO em Notificações enviadas, com o motivo. Passou do teto do dia, o aviso fica no sistema e no e-mail.
- Eventos novos (26/10/2026): S69 "Atividade vence hoje" (desligado até a gestão marcar; sai uma vez por atividade, na primeira rodada do expediente do dia do prazo) e S70 "Aviso urgente" (quem publica um aviso escolhe a importância Urgente: vai também pelo WhatsApp na hora).
- Avisos por setor (26/10/2026): CP01 "Avisos de Compras" (requisição aprovada ou reprovada, item disponível, especificação devolvida, cancelamento, conferência) e VC01 "Vencimentos que dependem de você" (uma vez por dia, no e-mail de resumo: padrões de referência, calibrações e requalificações de equipamentos, documentos, CNH e veículos, só o vencido e o que vence em até 7 dias). A Assistência técnica tem os eventos AT01 a AT17.
- Escalonamento das atividades atrasadas por prioridade (26/10/2026): S71 "cobrança ao responsável" (nível 1), S72 "escalada ao gestor da área" (nível 2) e S73 "escalada à Diretoria" (nível 3). Saem no sistema e por e-mail na hora, uma vez por atividade e por previsão, só no expediente; o WhatsApp só sai se a gestão marcar "Na hora". Os prazos de cada prioridade ficam em Caixa de decisões > Regras e responsáveis (padrão: Urgente 15 min, 1 h e 4 h; Alta 1, 4 e 24 h; Normal 4, 24 e 72 h; Baixa 24, 72 e 168 h).
- Evento marcado "Na hora" vai também pelo WhatsApp mesmo quando o módulo pediu só sistema ou e-mail: a matriz acrescenta o canal e confere expediente, vínculo, piloto e teto.
- Cliente e contato externo não recebem WhatsApp até o fim do piloto (o evento S56 começa sem WhatsApp; o e-mail ao cliente continua na hora).
- Evento "vira histórico": ninguém é avisado; o fato continua no histórico do próprio registro (ex.: chamado do Auvo concluído).
- Gestor da área no lugar de "toda a gestão": rastreador, reservas e missões do Programa de conduta vão ao gestor da área (Caixa de decisões › Regras e responsáveis). Área sem gestor: Diretoria. Compras fica na área Logística.
- O assistente do ponto tem identificação e regra próprias; nada da matriz se aplica a ele. O resumo do dia não leva assunto do ponto e não sai a menos de 10 minutos de um lembrete do ponto da mesma pessoa.
- O piloto do WhatsApp continua valendo: quem não está na lista fica RETIDO, e o servidor confere a mesma lista.

## 4. Matriz de avisos (Administrador e Diretoria)

1. Abra Menu › Administração › Matriz de avisos.
2. "Resumo do dia e filtro por área": confira as horas (e-mail 08:00, WhatsApp 09:30), o WhatsApp de resumo e a central por área. Para mudar, abra "Alterar horários", ajuste, escreva o motivo e toque em "Salvar horários".
3. "Gestor de cada área": mostra quem responde por cada área. Área sem gestor aparece em amarelo (vai para a Diretoria). Para definir, toque no botão que abre Caixa de decisões › Regras e responsáveis.
4. "Regras de cada evento": filtre pelo módulo. Em cada evento escolha o canal do e-mail (só no sistema, no resumo do dia, na hora), o do WhatsApp (sem WhatsApp, na contagem do dia; na hora só nas exceções) e a decisão (continua avisando ou vira só histórico). Toque em "Salvar" e escreva o motivo.
5. "Voltar ao padrão aprovado" desfaz uma mudança (também pede o motivo).
6. "Resumos do dia": escolha o dia e veja, por pessoa e canal, se o resumo saiu e por quê não saiu (sem novidade, já abriu o sistema, PJ, desligado pela pessoa, retido pelo piloto).
7. "Medição": antes (16/10 a 20/10) e depois; mostra a média e o maior número de e-mails e WhatsApp por pessoa por dia, quantas pessoas-dia passaram da meta, WhatsApp fora do expediente e para PJ, retidos pelo piloto e e-mails guardados para o resumo.
8. "Preferências da equipe": o que cada pessoa escolheu em Meus avisos (só leitura).
9. "Trilha de mudanças": quem mudou, quando, o antes, o depois e o motivo.

Travas: WhatsApp na hora só nos eventos aprovados como exceção; evento obrigatório (avisos com ciência, atividade atrasada, decisões do gestor, escalada à Diretoria, exceções da Frota) não pode deixar de avisar; toda mudança pede motivo de pelo menos 8 letras.

## 5. Meus avisos (cada pessoa)

1. Abra Menu › Principal › Meus avisos.
2. Marque ou desmarque o WhatsApp de resumo do dia (para CLT e PJ).
3. Escolha a hora do e-mail de resumo: 08:00 ou 12:00.
4. Se quiser, receba no e-mail de resumo os avisos informativos (comentário, atividade concluída, venda ganha), que continuam no sistema.
5. Se quiser, tire do e-mail de resumo os avisos do Comercial, da Frota ou do Auvo (continuam no sistema).
6. Toque em "Salvar". Vale a partir do próximo resumo.
7. "Ver a prévia" mostra o texto do seu e-mail de resumo de hoje, sem enviar nada.

Não podem ser desligados: avisos com ciência (sistema e e-mail), a cobrança da atividade atrasada no sistema, o e-mail com as decisões do gestor, as exceções da Frota para o gestor da Frota e para quem está com o veículo, e as pendências da central. Só a própria pessoa altera as suas preferências; a gestão vê na Matriz de avisos.

## 6. Central de pendências por área

O gestor vê o da sua área (área do cadastro e áreas de Regras e responsáveis) e o que é dele; a Diretoria vê tudo; o Administrador sem área vê as falhas técnicas (rastreador sem conexão, importação do Auvo parada) e o que é dele. Gestor sem área definida continua vendo tudo, para ninguém ficar sem enxergar o que precisa. Quem publicou um aviso com ciência vê a leitura atrasada dele. O filtro desliga em Matriz de avisos › Alterar horários.

## 7. COMMAND

O COMMAND fica em silêncio fora do próprio sino enquanto não for usado pela equipe: não põe nada na fila do WhatsApp nem espelha no SGO+, Demandas e SEDNA não mandam WhatsApp nem e-mail, e os eventos que viraram histórico deixam de gravar o sino. As preferências valem no SGO+ (Meus avisos), para os dois sistemas.

## 8. Problemas comuns

| O que aparece | O que fazer |
|---|---|
| Uma pessoa não recebe o WhatsApp de resumo | Em Resumos do dia, veja o motivo: PJ ou vínculo não informado, já abriu o sistema, nada para hoje, fora do piloto ou desligado por ela. |
| Uma pessoa não recebe o e-mail de resumo | Confira o e-mail no cadastro (Administração › Usuários). Dia sem nada para ela não tem e-mail. |
| "WhatsApp na hora só vale para as exceções aprovadas pelo dono" | Escolha "Na contagem do WhatsApp do dia" ou "Sem WhatsApp". |
| "é obrigatório pela matriz aprovada pelo dono" | Troque só entre na hora e no resumo; para mudar a regra, leve ao dono. |
| Um gestor vê poucas pendências | Confira a área dele em Administração › Usuários e em Caixa de decisões › Regras e responsáveis. |

## 9. Registros

Nada é apagado. `NTF_REGRAS` (cada mudança de regra e de horário, com antes, depois, motivo, quem e quando; a última de cada evento vale), `NTF_RESUMO_FILA` (itens guardados para o e-mail de resumo ou para o próximo expediente), `NTF_RESUMOS` (cada resumo avaliado: pessoa, dia, canal, situação, motivo), `NTF_PREFERENCIAS` (cada mudança de preferência) e `NTF_ENVIOS` (cada envio, com a coluna EVENTO; e-mail guardado para o resumo fica com SITUACAO = NO_RESUMO).
