# Matriz de avisos do SGO+ e do COMMAND

EST-20261021-AVS · Revisão 00 · 21/10/2026 · Equipe de gestão de processos, gestão da qualidade e comunicação interna · Para decisão do dono

Proposta para aprovação antes de qualquer código. Base: leitura do código do SGO+ (`apps-script-imports/portal_sgo_versao_cnpj_db`) e do COMMAND (`metrolabs_command`) em 21/10/2026. Versão para imprimir: `Documents/METROLABS_MATRIZ_AVISOS_20261021/MATRIZ_DE_AVISOS.html` e `.pdf`.


## Resumo para decidir

O dono pediu, em 20/10/2026, regras claras de quem recebe cada aviso (geral, individual, área, gestor, Diretoria, RH, Financeiro, Comercial, Compras e Logística), o mesmo critério para o WhatsApp e a separação entre o aviso do ponto e os avisos do COMMAND. Este estudo leu o código dos dois sistemas, listou todos os avisos que existem hoje e propõe, para cada um, quem deve receber e por qual canal. Nenhum código foi alterado.

| O que foi levantado | Quantidade |
|---|---|
| Eventos que disparam aviso hoje, nos dois sistemas | 188 |
| No SGO+ | 58 |
| No COMMAND (117 pontos do código que gravam o sino, mais a fila do WhatsApp, o espelho no SGO+ e a cópia dos avisos do SGO+) | 120 |
| No assistente do ponto (COMMAND) | 10 |
| Tipos de pendência da central do SGO+ (já ficam só no sistema; muda só quem vê) | 64 |

| Resultado da proposta | Quantidade |
|---|---|
| Continuam avisando no SGO+ (com público e canal ajustados) | 57 |
| Continuam no assistente do ponto (piloto próprio, seção 4) | 8 |
| Viram só histórico (registro consultável, sem aviso) | 22 (1 no SGO+, 19 no COMMAND, 2 no ponto) |
| COMMAND: deixam de existir, substituídos por função que o SGO+ já tem | 41 |
| COMMAND: ficam só no sino do próprio COMMAND até o módulo vir ao SGO+ | 60 |
| Eventos do SGO+ que mandam WhatsApp hoje | 21 |
| Eventos que alimentam o único WhatsApp do dia (resumo, no máximo 1 por pessoa) | 7 |
| Eventos com WhatsApp na hora (exceção justificada, só no expediente) | 4 |
| Mensagens do assistente do ponto que continuam (horário combinado, só CLT) | 4 |

**As cinco mudanças principais**

- Um resumo por dia: cada pessoa recebe no máximo um e-mail de resumo (8h) e um WhatsApp de resumo (9h30, só CLT, só se ainda não abriu o sistema). Hoje há até quatro e-mails separados por pessoa (atividades, Comercial, reservas e Caixa de decisões).
- WhatsApp avulso acaba. Ficam só quatro avisos na hora, todos da Frota e todos com alguém parado esperando (seção 3).
- Quem age recebe; o gestor só recebe quando a decisão é dele ou quando o item parou (escada da Caixa de decisões). Avisos que hoje vão a "toda a gestão" passam ao gestor da área.
- O COMMAND não fala com ninguém fora do próprio sino enquanto não for usado. Demandas, Missões, SEDNA e o Comercial antigo são substituídos por Minhas atividades, Caixa de decisões e Comercial do SGO+.
- O ponto fica separado: só o assistente do ponto fala no horário das marcações, com identificação própria, só para CLT que aceitar, e nunca leva assunto de outro módulo.


## 1. Princípios

Dez regras valem para todos os avisos, dos dois sistemas, de hoje em diante. Cada aviso novo que for criado precisa passar por elas antes de ser programado.

1. Aviso é para quem precisa fazer algo ou para quem o trabalho muda por causa do fato. O que é só registro (quem alterou, quando concluiu, o que mudou de situação) fica no histórico do próprio registro, consultável na tela, e não vira aviso.
2. Um aviso, um responsável. O aviso vai para a pessoa que age. O gestor só recebe quando a decisão é dele ou quando o item parou (escada da Caixa de decisões). "Toda a gestão" deixa de ser destinatário.
3. Três canais, cada um com seu papel. Sistema: sempre, na hora, para tudo o que é aviso (sino, central de pendências, Início, Caixa de decisões). E-mail: um resumo por dia; na hora só o que exige ciência ou tem hora marcada para hoje. WhatsApp: no máximo um resumo por dia; na hora só as exceções desta matriz.
4. Horário de trabalho. Nada sai fora do expediente da empresa (hoje 08h00 às 17h30, segunda a sexta, menos feriados, em Atividades da equipe > Avisos e horários). O que nascer fora espera e sai agrupado no expediente seguinte. Os dois sistemas passam a usar o mesmo expediente.
5. Agrupamento. Vários avisos da mesma pessoa viram um. O mesmo item não é avisado duas vezes no mesmo dia, no mesmo canal.
6. Vínculo. WhatsApp só para quem tem vínculo CLT cadastrado. PJ e vínculo não informado recebem pelo sistema e por e-mail. O assistente do ponto é só para CLT.
7. Conteúdo. WhatsApp e e-mail de resumo nunca levam valor em reais, dado pessoal (CPF, telefone, endereço, localização de veículo), assunto de conduta, ocorrência, incentivo ou ponto de um colega. Levam a contagem e o caminho no sistema ("você tem 3 itens; abra o SGO+").
8. Quem fez a ação não é avisado da própria ação.
9. Ninguém no limbo. Todo aviso diz o quê, por quê, o que fazer e onde fazer (caminho na tela).
10. Um sistema só fala. Enquanto o COMMAND não for usado pela equipe, nada dele sai do próprio sino. Cada módulo que vier ao SGO+ entra já nesta matriz.


### 1.1 Os três canais

| Canal | Para que serve | Quando sai | Limite |
|---|---|---|---|
| Sistema (sino, central de pendências, Início, Caixa de decisões, janela ao entrar) | Tudo o que é aviso. Cobra até ser resolvido. | Na hora, a qualquer momento (a pessoa vê quando entrar) | Sem limite; some quando resolvido ou lido |
| E-mail no resumo | O que a pessoa precisa saber no dia: atividades, decisões, reservas, avisos pendentes | Um e-mail por pessoa, às 08h00 do dia útil, só se houver algo | 1 por dia |
| E-mail na hora | O que exige ciência (Avisos) ou muda algo de hoje (reserva cancelada, cliente respondeu a proposta) | Na hora, dentro do expediente; fora dele, espera | Agrupado por rodada |
| WhatsApp no resumo do dia | Lembrar quem não entrou no sistema que há algo para hoje | Às 09h30 do dia útil, só CLT, só se a pessoa não abriu o sistema e há item para hoje, atrasado ou decisão parada | 1 por dia |
| WhatsApp na hora | Alguém está parado esperando agora | Só no expediente, só nas 4 exceções da matriz | 1 por pessoa por dia em cada exceção |


### 1.2 Horários

| Momento | O que sai |
|---|---|
| 07h55, 11h00, 11h55, 17h55 (horários do ponto de cada pessoa) | Só o assistente do ponto (seção 4). Nenhum outro aviso usa esses horários. |
| 08h00 | E-mail de resumo do dia (um por pessoa). Para a Diretoria, o mesmo e-mail leva escalados e relatórios. |
| 09h30 | WhatsApp de resumo do dia (um por pessoa, só CLT, só se não abriu o sistema). |
| 08h00 às 17h30 | E-mail na hora e as exceções de WhatsApp na hora. |
| Depois das 17h30, fim de semana e feriado | Nada sai. Fica no sistema e espera o próximo expediente. |


## 2. Públicos

Cada aviso tem um público. O público é sempre calculado a partir do cadastro, nunca de nome escrito no código. Hoje o cadastro já tem quase tudo o que é preciso: perfil de acesso, área da pessoa (CAD_USUARIOS.AREA, SGO_Areas.js), vínculo de trabalho e celular (Administração > Usuários) e os gestores responsáveis por área (Caixa de decisões > Regras e responsáveis).

| Público | Quem é | Como o sistema sabe | Exemplos |
|---|---|---|---|
| Geral | Toda a equipe ativa, sem o perfil Cliente | Usuários ativos | Só Avisos com ciência publicados para todos. Nenhum aviso automático vai ao público geral. |
| Individual | A pessoa do registro: responsável, condutor, executante, solicitante, reservante | O campo de responsável do próprio registro | Atividade para você, reserva, CNH, missão |
| Área | As pessoas de uma área (Diretoria, Administrativo, Comercial, Financeiro, RH, Qualidade, Metrologia, Técnica/Campo, Logística) | CAD_USUARIOS.AREA | Pedido aprovado passado ao setor; aviso publicado para uma área |
| Gestor da área | Quem responde pelas decisões da área | Caixa de decisões > Regras e responsáveis (gestores por área). Área sem gestor: Diretoria, como hoje | Missão para aprovar, item parado, uso de veículo sem registro |
| Diretoria | Perfil Diretoria e o responsável pelo sistema | Perfil DIRETORIA e SGO_DONOS | Escalados, relatórios semanal e mensal, o que envolve gestor no Programa de conduta |
| RH | Perfil RH e área RH | Perfil RH | Pedido de ajuste do ponto, resumo de esquecimentos, cadastro sem vínculo |
| Financeiro | Área Financeiro | Área FINANCEIRO (perfil Financeiro) | Pedido aprovado (parte do Financeiro), multa vencida, compra para conferir |
| Comercial | Área Comercial; gestor comercial é o marcado no Comercial ou o Gestor da área Comercial | Área COMERCIAL e gestores do Comercial (SGO_Comercial_Config.js:478) | Oportunidade, proposta, desconto, renovação de documentos de clientes |
| Compras e Logística | Quem compra, recebe e expede | Área LOGISTICA. Hoje "compras administrativas" está descrita na área Administrativo (SGO_Areas.js:35): precisa decidir (pergunta 6) | Pedido aprovado (parte de compras), compra aprovada, peça disponível |
| Administrador | Perfil Administrador | Perfil ADMIN | Só falha técnica: rastreador sem conexão, importação do Auvo parada, modelo do WhatsApp recusado |

> Hoje a central de pendências mostra "tudo da equipe" a qualquer Administrador, Gestor ou Diretoria (SGO_Alertas_Central.js:37). A proposta é que o gestor veja o da sua área e o seu; a Diretoria continua vendo tudo; o Administrador vê as falhas técnicas e o que é dele.


## 3. A matriz

Cada linha é um evento que hoje gera aviso, com o arquivo e a linha do código onde ele nasce. As colunas dizem quem recebe hoje e por onde, quem deve receber, o canal proposto, o limite e a decisão. A legenda dos canais está na seção 1.1.

**Como ler a coluna "Decisão"**

- Continua avisando: o aviso fica, com o público e o canal desta linha.
- Vira só histórico: o fato continua registrado no histórico do registro; ninguém é avisado.
- Deixa de avisar: substituído no SGO+: a função do COMMAND sai porque o SGO+ já faz o mesmo (indicado na coluna "Quem deve receber").
- Deixa de avisar fora do COMMAND; só sino até migrar: enquanto o COMMAND não for usado, o aviso fica só no sino dele, sem WhatsApp, sem e-mail e sem espelho no SGO+. Quando o módulo vier ao SGO+, segue o público e o canal desta linha.


### 3.1 SGO+


#### Minhas atividades

| Nº | Evento e origem no código | Hoje: quem recebe e por onde | Quem deve receber | Canal proposto | Limite | Decisão |
|---|---|---|---|---|---|---|
| S01 | Nova atividade lançada para você<br>`SGO_Atividades.js:577` | Responsável<br>Sistema; e-mail no expediente; entra no resumo do WhatsApp (9h, só CLT) | Individual (responsável) | Sistema + E-mail no resumo + WhatsApp no resumo do dia | Resumo: 1 por dia | Continua avisando<br>Prazo para hoje: e-mail na hora, no expediente. |
| S02 | Atividade passada para você<br>`SGO_Atividades.js:733` | Novo responsável<br>Sistema; e-mail; resumo do WhatsApp | Individual (novo responsável) | Sistema + E-mail no resumo + WhatsApp no resumo do dia | Resumo: 1 por dia | Continua avisando |
| S03 | Atividade passada para outra pessoa<br>`SGO_Atividades.js:737` | Responsável anterior<br>Sistema | Individual (responsável anterior) | Sistema | 1 por troca | Continua avisando |
| S04 | Atividade alterada ou replanejada<br>`SGO_Atividades.js:742` | Responsável<br>Sistema | Individual (responsável) | Sistema | Só mudança de prazo | Continua avisando<br>Outras alterações (texto, cliente) passam a ser só histórico. |
| S05 | Atividade concluída ou aguardando<br>`SGO_Atividades.js:783` | Quem lançou<br>Sistema | Individual (quem lançou) | Sistema | 1 por mudança | Continua avisando |
| S06 | Comentário em atividade<br>`SGO_Atividades.js:803` | Responsável ou quem lançou<br>Sistema | Individual (o outro lado) | Sistema | — | Continua avisando |
| S07 | Justificativa de atraso registrada<br>`SGO_Atividades.js:914` | Quem lançou<br>Sistema; e-mail | Gestor (quem lançou), pela Caixa de decisões | Sistema + E-mail no resumo | No resumo do dia | Continua avisando<br>O e-mail avulso sai; o item vai no resumo da gestão. |
| S08 | Atividade atrasada<br>`SGO_Atividades.js:248` | Responsável<br>Sistema (cobra até justificar); e-mail; resumo do WhatsApp | Individual (responsável) | Sistema + E-mail no resumo + WhatsApp no resumo do dia | 1 vez por previsão vencida | Continua avisando<br>Parada há 2 dias úteis entra na Caixa do gestor. |
| S09 | Atividade devolvida (responsável inativo ou sem responsável)<br>`SGO_Gestao_Escada.js:498` | Quem lançou ou gestor da área<br>Sistema; e-mail | Gestor da área | Sistema + E-mail no resumo | 1 por atividade | Continua avisando |
| S10 | E-mail das atividades (fila por rodada)<br>`SGO_Atividades_Avisos.js:106` | Cada pessoa com aviso<br>Um e-mail por rodada, no expediente | Individual | E-mail no resumo | 1 por dia | Continua avisando<br>Passa a fazer parte do resumo do dia único. |
| S11 | Resumo do dia no WhatsApp<br>`SGO_Atividades_Avisos.js:249` | Individual, só CLT<br>WhatsApp às 9h, 1 por dia, dia útil | Individual, só CLT | WhatsApp no resumo do dia | 1 por dia | Continua avisando<br>Vira o resumo único do dia (atividades, Caixa, Comercial, Frota, avisos, bate-papo). |


#### Caixa de decisões

| Nº | Evento e origem no código | Hoje: quem recebe e por onde | Quem deve receber | Canal proposto | Limite | Decisão |
|---|---|---|---|---|---|---|
| S12 | E-mail diário da gestão (decisões aguardando)<br>`SGO_Gestao_Escada.js:236` | Gestores da área e Diretoria<br>E-mail às 8h, dia útil | Gestor da área; Diretoria | E-mail no resumo | 1 por dia | Continua avisando<br>Junta-se ao resumo do dia único. |
| S13 | WhatsApp da gestão (item parado há 2 dias úteis)<br>`SGO_Gestao_Escada.js:309` | Gestor, só CLT<br>WhatsApp, 1 por dia somado às atividades | Gestor da área, só CLT | WhatsApp no resumo do dia | 1 por dia | Continua avisando |
| S14 | Escalada à Diretoria (parado há 5 dias úteis)<br>`SGO_Gestao_Escada.js:181` | Diretoria<br>Dentro do e-mail diário | Diretoria | Sistema + E-mail no resumo | 1 por dia | Continua avisando |
| S15 | Relatório semanal da gestão (A4)<br>`SGO_Gestao_Escada.js:351` | Diretoria<br>E-mail no 1º dia útil da semana | Diretoria | E-mail no resumo | Semanal | Continua avisando |
| S16 | Relatórios mensais (gestão, Frota, Conduta, Atividades)<br>`SGO_Gestao_Escada.js:363` | Diretoria<br>E-mail no 1º dia útil do mês | Diretoria | E-mail no resumo | Mensal | Continua avisando |
| S17 | CNH vencendo em 30, 15 e 7 dias<br>`SGO_Gestao_Escada.js:426` | Condutor<br>E-mail avulso | Individual (condutor); com 7 dias, também o gestor da Frota | Sistema + E-mail no resumo | 3 marcos | Continua avisando |
| S18 | Manutenção preventiva prevista vira atividade<br>`SGO_Gestao_Escada.js:450` | Gestor da área da Frota<br>Aviso de atividade nova | Gestor da área (Frota) | Sistema + E-mail no resumo | 1 por veículo e tipo a cada 60 dias | Continua avisando |


#### Avisos com ciência

| Nº | Evento e origem no código | Hoje: quem recebe e por onde | Quem deve receber | Canal proposto | Limite | Decisão |
|---|---|---|---|---|---|---|
| S19 | Aviso publicado pela gestão ou RH<br>`SGO_Avisos.js:462 (texto em :486)` | Público escolhido (todos, perfil ou pessoas)<br>Sistema (janela ao entrar); e-mail; WhatsApp a todos, sem olhar o vínculo | Geral, Área ou pessoas escolhidas | Sistema + E-mail na hora + WhatsApp no resumo do dia | No WhatsApp, só a contagem no resumo (CLT) | Continua avisando<br>Sai o WhatsApp avulso. Ciência continua obrigatória. |
| S20 | Reenvio a quem não confirmou<br>`SGO_Avisos.js:563` | Quem não leu<br>Sistema; e-mail; WhatsApp | Quem não leu | Sistema + E-mail na hora | No máximo 1 reenvio por dia | Continua avisando |
| S21 | Leitura atrasada<br>`SGO_Alertas_Central.js:120` | Quem publicou<br>Sistema (central e Caixa) | Quem publicou | Sistema + E-mail no resumo | No resumo do dia | Continua avisando |


#### Comercial

| Nº | Evento e origem no código | Hoje: quem recebe e por onde | Quem deve receber | Canal proposto | Limite | Decisão |
|---|---|---|---|---|---|---|
| S22 | Oportunidade passou para você<br>`SGO_Comercial_Oportunidades.js:242` | Vendedor<br>Sistema; e-mail no expediente | Individual (Comercial) | Sistema + E-mail no resumo | 1 por troca | Continua avisando |
| S23 | Pedido de apoio à gestão comercial<br>`SGO_Comercial_Oportunidades.js:312` | Gestão comercial<br>Sistema; e-mail no expediente | Gestor da área (Comercial) | Sistema + E-mail na hora | 1 por pedido | Continua avisando<br>Quem pede apoio espera resposta no mesmo dia. |
| S24 | Venda ganha<br>`SGO_Comercial_Oportunidades.js:330` | Gestão comercial<br>Sistema | Gestor da área (Comercial) | Sistema | — | Continua avisando<br>Diretoria vê no relatório mensal. |
| S25 | Reabertura não aprovada<br>`SGO_Comercial_Oportunidades.js:398` | Quem pediu<br>Sistema | Individual | Sistema | — | Continua avisando |
| S26 | Oportunidade reaberta<br>`SGO_Comercial_Oportunidades.js:408` | Vendedor<br>Sistema; e-mail | Individual | Sistema + E-mail no resumo | — | Continua avisando |
| S27 | Desconto aprovado ou negado<br>`SGO_Comercial_Propostas.js:401` | Vendedor<br>Sistema | Individual | Sistema | — | Continua avisando |
| S28 | Cliente aprovou ou recusou a proposta<br>`SGO_Comercial_Propostas.js:669` | Vendedor e gestão comercial<br>Sistema; e-mail | Vendedor (na hora); gestor comercial (resumo) | Sistema + E-mail na hora | 1 por resposta | Continua avisando<br>Para o gestor, vai no resumo do dia. |
| S29 | Setor concluiu a parte do pedido<br>`SGO_Comercial_Propostas.js:787` | Vendedor<br>Sistema | Individual | Sistema | — | Continua avisando |
| S30 | Pedido aprovado passado aos setores (atividade por setor)<br>`SGO_Comercial_Propostas.js:753` | Responsável de cada setor<br>Aviso de atividade nova | Área (Técnica, Metrologia, Financeiro, Compras e Logística) | Sistema + E-mail no resumo | Como atividade | Continua avisando |
| S31 | Atividades do vendedor (retorno ao cliente, proposta vencendo, decidir após recusa)<br>`SGO_Comercial_Propostas.js:493, :659, :820` | Vendedor<br>Aviso de atividade nova | Individual (Comercial) | Sistema + E-mail no resumo | Como atividade | Continua avisando |
| S32 | E-mails guardados do Comercial<br>`SGO_Comercial_Config.js:523` | Cada destinatário<br>E-mail por rodada, no expediente | Individual | E-mail no resumo | 1 por dia | Continua avisando<br>Passa a fazer parte do resumo do dia único. |


#### Frota

| Nº | Evento e origem no código | Hoje: quem recebe e por onde | Quem deve receber | Canal proposto | Limite | Decisão |
|---|---|---|---|---|---|---|
| S33 | Retirada registrada em seu nome pela gestão<br>`SGO_Frota_Main.js:1248` | Condutor<br>Sistema; e-mail; WhatsApp a qualquer hora, sem olhar o vínculo | Individual (condutor) | Sistema + E-mail no resumo | 1 por registro | Continua avisando<br>Sai o WhatsApp (é informativo). |
| S34 | Devolução registrada em seu nome pela gestão<br>`SGO_Frota_Main.js:1371` | Condutor<br>Sistema; e-mail; WhatsApp a qualquer hora | Individual (condutor) | Sistema + E-mail no resumo | 1 por registro | Continua avisando<br>Sai o WhatsApp. |
| S35 | Veículo em uso sem registro (rastreador)<br>`SGO_Frota_Rastreador.js:912` | Toda a gestão (Administrador, Gestor, Diretoria)<br>Sistema; e-mail; WhatsApp a qualquer hora, inclusive à noite | Gestor da Frota (área Administrativo) | Sistema + E-mail na hora + WhatsApp na hora | 1 por alerta | Continua avisando<br>WhatsApp na hora só no expediente. Fora dele: decisão do dono (pergunta 3). |
| S36 | Partida não liberada pelo rastreador<br>`SGO_Frota_Rastreador.js:1101` | Toda a gestão<br>Sistema; e-mail; WhatsApp a qualquer hora | Gestor da Frota | Sistema + WhatsApp na hora | 1 por retirada | Continua avisando<br>Justificado: o condutor está parado esperando. Só no expediente. |
| S37 | Bloqueio da partida pendente há 30 minutos<br>`SGO_Frota_Rastreador.js:1146` | Toda a gestão<br>Sistema; e-mail; WhatsApp a qualquer hora | Gestor da Frota | Sistema + E-mail na hora | 1 por pedido | Continua avisando<br>Sai o WhatsApp. |
| S38 | Reserva feita pela gestão em seu nome<br>`SGO_Frota_Reservas.js:444` | Reservante<br>Sistema; e-mail no expediente | Individual | Sistema + E-mail no resumo | — | Continua avisando |
| S39 | Reserva cancelada pela gestão<br>`SGO_Frota_Reservas.js:505` | Reservante<br>Sistema; e-mail no expediente | Individual | Sistema + E-mail na hora | — | Continua avisando |
| S40 | Reserva mudou de veículo<br>`SGO_Frota_Reservas.js:542` | Reservante<br>Sistema; e-mail no expediente | Individual | Sistema + E-mail na hora | — | Continua avisando |
| S41 | Veículo da sua reserva liberado pela gestão a outra pessoa<br>`SGO_Frota_Reservas.js:640` | Reservante<br>Sistema; e-mail; WhatsApp se for no mesmo dia (regra sutil) | Individual | Sistema + E-mail na hora + WhatsApp na hora | WhatsApp só no mesmo dia, expediente, CLT | Continua avisando<br>Justificado: a pessoa ia sair com o veículo hoje. |
| S42 | Veículo da sua reserva foi devolvido<br>`SGO_Frota_Reservas.js:670` | Próximo reservante<br>Sistema; e-mail | Individual | Sistema | — | Continua avisando<br>Sai o e-mail. |
| S43 | Reserva não utilizada (veículo liberado)<br>`SGO_Frota_Reservas.js:835` | Reservante<br>Sistema; e-mail | Individual | Sistema + E-mail no resumo | — | Continua avisando |
| S44 | Devolução atrasada com reserva a seguir (a quem está com o veículo)<br>`SGO_Frota_Reservas.js:868` | Condutor atual<br>Sistema; e-mail; WhatsApp se for no mesmo dia | Individual (condutor atual) | Sistema + WhatsApp na hora | Mesmo dia, expediente, CLT, 1 por dia | Continua avisando<br>Justificado: outra pessoa espera o veículo. |
| S45 | Devolução atrasada: aviso ao próximo reservante<br>`SGO_Frota_Reservas.js:875` | Reservante<br>Sistema; e-mail | Individual | Sistema + E-mail na hora | — | Continua avisando |
| S46 | Devolução atrasada: aviso à gestão<br>`SGO_Frota_Reservas.js:880` | Gestores<br>Sistema; e-mail | Gestor da Frota | Sistema | — | Continua avisando<br>Fica na Caixa; o e-mail avulso sai. |
| S47 | Lembrete da reserva (véspera, 14h)<br>`SGO_Frota_Reservas.js:919` | Reservante<br>Sistema; e-mail | Individual | Sistema + E-mail na hora | 1 por reserva | Continua avisando |
| S48 | Problema na reserva (ao reservante)<br>`SGO_Frota_Reservas.js:923` | Reservante<br>Sistema; e-mail | Individual | Sistema + E-mail na hora | 1 por conferência | Continua avisando |
| S49 | Problema na reserva (à gestão)<br>`SGO_Frota_Reservas.js:928` | Gestores<br>Sistema; e-mail | Gestor da Frota | Sistema + E-mail no resumo | No resumo do dia | Continua avisando |
| S50 | Pedido de comprovante de abastecimento (vira atividade)<br>`SGO_Frota_Rastreamento.js:839` | Condutor<br>Aviso de atividade nova | Individual (condutor) | Sistema + E-mail no resumo | Como atividade | Continua avisando |


#### Programa de conduta

| Nº | Evento e origem no código | Hoje: quem recebe e por onde | Quem deve receber | Canal proposto | Limite | Decisão |
|---|---|---|---|---|---|---|
| S51 | Missão aguardando aprovação<br>`SGO_Conduta_Missao.js:138` | Todos os Gestores e a Diretoria<br>Sistema; e-mail; WhatsApp, sem olhar o vínculo | Gestor da área do executante (Caixa de decisões) | Sistema + E-mail no resumo | No resumo do dia | Continua avisando<br>Sai o WhatsApp: assunto de incentivo. |
| S52 | Missão aprovada ou recusada<br>`SGO_Conduta_Missao.js:186` | Quem registrou e executantes<br>Sistema; e-mail; WhatsApp | Individual | Sistema + E-mail no resumo | — | Continua avisando<br>Sai o WhatsApp. |
| S53 | Missão cadastrada em que você é executante<br>`SGO_Conduta_Missao.js:216` | Executantes<br>Sistema; e-mail; WhatsApp (modelo sgo_missao_nova) | Individual | Sistema | — | Continua avisando<br>Só no sistema. |


#### Integração Auvo

| Nº | Evento e origem no código | Hoje: quem recebe e por onde | Quem deve receber | Canal proposto | Limite | Decisão |
|---|---|---|---|---|---|---|
| S54 | Chamado técnico aberto (técnico e gestão)<br>`SGO_Auvo_Incremental.js:546` | Técnico e todos os Gestores e Diretoria<br>E-mail e WhatsApp a cada chamado, a qualquer hora | Individual (técnico); gestão só no painel | Sistema + E-mail no resumo | No resumo do dia | Continua avisando<br>O aplicativo do Auvo já avisa o técnico. Gestão deixa de receber um aviso por chamado. |
| S55 | Chamado técnico concluído (técnico e gestão)<br>`SGO_Auvo_Incremental.js:546` | Técnico e todos os Gestores e Diretoria<br>E-mail e WhatsApp a cada chamado | Ninguém | Só histórico | — | Vira só histórico<br>Fica no painel do Auvo e no relatório. |
| S56 | Chamado aberto ou concluído (ao cliente)<br>`SGO_Auvo_Incremental.js:560` | Contato do cliente ou da unidade<br>E-mail e WhatsApp | Cliente (externo) | E-mail na hora | 1 por evento | Continua avisando<br>WhatsApp ao cliente só depois do piloto e com modelo aprovado (pergunta 8). |


#### Bate-papo

| Nº | Evento e origem no código | Hoje: quem recebe e por onde | Quem deve receber | Canal proposto | Limite | Decisão |
|---|---|---|---|---|---|---|
| S57 | Mensagem direta ou menção para quem está fora do sistema<br>`SGO_ComunicacaoWhatsapp.js:175` | Pessoa ausente (CLT); hoje desligado<br>WhatsApp até 1 por hora e 4 por dia (desligado em 20/10) | Individual | Sistema + WhatsApp no resumo do dia | No resumo: só a contagem de não lidas | Continua avisando<br>Ponte para o WhatsApp não volta. Ver seção 5. |


#### Piloto do WhatsApp

| Nº | Evento e origem no código | Hoje: quem recebe e por onde | Quem deve receber | Canal proposto | Limite | Decisão |
|---|---|---|---|---|---|---|
| S58 | Resumo diário do piloto<br>`SGO_WhatsappPiloto.js:429` | Responsável pelo sistema<br>E-mail às 18h | Diretoria (dono) | E-mail na hora | 1 por dia, durante o piloto | Continua avisando<br>Sugestão: às 17h, dentro do expediente. |


#### Assistência técnica (nativa, 21/10/2026; etapas 2, 3 e 4 em 22/10/2026)

Eventos AT01 a AT17 registrados em `SGO_Pendencias_Assistencia.js` (todo envio passa por `SGO_notificar_` e pela matriz). O cliente recebe só e-mail enquanto durar o piloto; o PDF da O.S. nunca sai sozinho: vai pelo Enviar documento, por uma pessoa (técnico no aplicativo ou gestão na ficha da O.S.), e o envio fica gravado na O.S.

| Nº | Evento e origem no código | Hoje: quem recebe e por onde | Quem deve receber | Canal proposto | Limite | Decisão |
|---|---|---|---|---|---|---|
| AT01 | Chamado novo para a triagem<br>`SGO_Assistencia_Chamados.js` | Gestor da área Técnica<br>Sistema; e-mail na hora | Gestor da área (Técnica) | Sistema + E-mail na hora | 1 por chamado | Continua avisando |
| AT02 | Chamado crítico (P1) aberto; P1 sem triagem em 30 min (22/10)<br>`SGO_Assistencia_Chamados.js`; `SGO_Assistencia_Painel.js` | Gestor da área Técnica<br>Sistema; e-mail; WhatsApp 1 por dia | Gestor da área (Técnica); Diretoria no alerta dos 30 min | Sistema + E-mail na hora + WhatsApp na hora (expediente, CLT, 1 por dia) | 1 por chamado; o alerta dos 30 min 1 vez | Continua avisando<br>Pendência própria "P1 sem triagem" na Caixa de decisões. |
| AT03 | Atendimento agendado para você<br>`SGO_Assistencia_Agenda.js` | Técnico<br>Sistema; resumo | Técnico | Sistema + E-mail no resumo + WhatsApp no resumo do dia | 1 por dia | Continua avisando |
| AT04 | Reagendado, passado a outro técnico ou chamado de volta à triagem (22/10)<br>`SGO_Assistencia_Agenda.js`; `SGO_Assistencia_Chamados.js` | Técnico<br>Sistema; e-mail na hora | Técnico | Sistema + E-mail na hora | 1 por mudança | Continua avisando |
| AT05 | O.S. cancelada<br>`SGO_Assistencia_Chamados.js` | Técnico | Técnico | Sistema + E-mail na hora | 1 por O.S. | Continua avisando |
| AT06 | Reclamação de cliente para tratar<br>`SGO_Assistencia_Chamados.js` | Dono do caso | Dono do caso | Sistema + E-mail no resumo | No resumo | Continua avisando |
| AT07 | Atendimento do pedido do Comercial concluído<br>`SGO_Assistencia_Chamados.js` | Vendedor | Vendedor | Sistema + E-mail no resumo | 1 por chamado | Continua avisando (informativo) |
| AT08 | Ao cliente: chamado recebido, visita agendada (22/10) ou reagendada, atendimento concluído<br>`SGO_Assistencia_*.js` | Cliente<br>E-mail na hora | Cliente (externo) | E-mail na hora | 1 por evento | Continua avisando<br>WhatsApp ao cliente só depois do piloto. O e-mail de atendimento concluído não leva o PDF: o documento vai pelo Enviar documento. |
| AT09 | Pedido de atendimento do cliente na fila<br>`SGO_Assistencia_Chamados.js` | Gestor da área Técnica | Gestor da área (Técnica) | Sistema + E-mail na hora | 1 por pedido | Continua avisando |
| AT10 | Série do equipamento diferente do cadastro<br>`SGO_Assistencia_OS.js` | Gestor da área Técnica | Gestor da área (Técnica) | Sistema + E-mail no resumo | No resumo | Continua avisando |
| AT11 | Falta de peça no atendimento<br>`SGO_Assistencia_OS.js` | Gestor da área Técnica | Gestor da área (Técnica) | Sistema + E-mail no resumo | No resumo | Continua avisando<br>O pedido de compra abre sozinho em Compras. |
| AT12 | Orçamento do chamado pedido ou respondido<br>`SGO_Assistencia_Relatorio.js` | Gestor comercial; gestor da área Técnica | Gestor comercial; gestor da área Técnica | Sistema + E-mail no resumo | No resumo | Continua avisando |
| AT13 | Cadastro criado em campo pelo técnico<br>`SGO_Assistencia_App.js` | Gestor da área Técnica | Gestor da área (Técnica) | Sistema + E-mail no resumo | No resumo | Continua avisando (etapa 1) |
| AT14 | Peça disponível em Compras: chamado devolvido à Assistência, retorno a agendar (22/10)<br>`SGO_Assistencia_Chamados.js` (chamado por `SGO_Compras_Pedido.js` depois de soltar a trava de Compras) | Técnico responsável; gestor da área Técnica<br>Sistema; e-mail no resumo | Técnico responsável; gestor da área (Técnica) | Sistema + E-mail no resumo (WhatsApp interno só pelo piloto, no resumo) | 1 por pedido de compra | Continua avisando<br>O chamado volta sozinho a "Planejado"; pendência "retorno a agendar" na Caixa de decisões. |
| AT15 | Ao cliente: peça recebida (retorno será agendado) e retorno técnico agendado para dd/mm (22/10)<br>`SGO_Assistencia_Chamados.js`; `SGO_Assistencia_Agenda.js` | Cliente<br>E-mail na hora | Cliente (externo) | E-mail na hora | 1 por evento | Continua avisando<br>Nada de WhatsApp ao cliente nesta etapa. |
| AT16 | Orçamento aprovado pelo cliente pelo link (sem login) ou pelo portal "Meus chamados" (22/10, etapa 4)<br>`SGO_Assistencia_Aceite.js`; `SGO_Assistencia_Relatorio.js` | Gestor da área Técnica; gestor comercial; técnico do chamado<br>Sistema; e-mail na hora | Gestor da área (Técnica); gestor comercial; técnico do chamado | Sistema + E-mail na hora | 1 por orçamento | Novo<br>O chamado vai sozinho a Planejado (ou Aguardando peça, com o pedido em Compras). O cliente recebe a confirmação com o comprovante de aprovação por e-mail; nada de WhatsApp ao cliente. |
| AT17 | Orçamento recusado ou com pedido de ajuste pelo cliente (link ou portal) (22/10, etapa 4)<br>`SGO_Assistencia_Aceite.js`; `SGO_Assistencia_Relatorio.js` | Gestor da área Técnica; gestor comercial; técnico do chamado<br>Sistema; e-mail na hora | Gestor da área (Técnica); gestor comercial; técnico do chamado | Sistema + E-mail na hora | 1 por resposta | Novo<br>Entra na Caixa de decisões: recusa (negociar, cobrar a visita ou encerrar) e ajuste (nova revisão e novo envio). |

Pendências da Assistência na central e na Caixa de decisões (só sistema, escada da Caixa): triagem, agendar, prazo, orçamento parado, documentação pendente (técnico; 24 h depois a gestão), sem sincronização, série divergente, solicitação na fila, reclamação, O.S. de hoje, cadastro criado em campo e, desde 22/10: "relatório para enviar ao cliente" (técnico, até 1 dia útil), "O.S. encerrada há 1 dia útil sem envio ao cliente" (gestão), "retorno a agendar" (peça disponível) e "P1 sem triagem em 30 minutos" (gestão e Diretoria); na etapa 4, "orçamento recusado pelo cliente para decidir" e "pedido de ajuste no orçamento para revisar" (gestão da área Técnica e Comercial).


### 3.2 Pendências da central do SGO+ (já ficam só no sistema)

Estes 64 tipos de pendência aparecem no Início, na central e, os que são decisão, na Caixa de decisões. Não mandam mensagem sozinhos: o e-mail e o WhatsApp da gestão saem só pela escada da Caixa (resumo das 08h00 e, parado há 2 dias úteis, o resumo do WhatsApp). A proposta muda apenas quem vê cada grupo.

| Grupo | Tipos (código) | Origem | Quem vê hoje | Quem deve ver |
|---|---|---|---|---|
| Padrões de referência (3) | padrao_vencido, padrao_vencendo, padrao_sem_validade | SGO_Alertas_Central.js:76-78 | Toda a gestão, Metrologia e técnicos | Metrologia e gestor da Metrologia; técnicos só o vencido (bloqueia o trabalho) |
| Vencimentos de clientes (documentos, calibrações, requalificações, NR-13) (8) | documento_vencido, documento_vencendo, calibracao_vencida, calibracao_vencendo, requalificacao_vencida, requalificacao_vencendo, nr13_vencida, nr13_vencendo | SGO_Alertas_Central.js:79-87 | Toda a gestão, Metrologia e o cliente | Comercial (renovação) e gestor da área técnica, como acompanhamento; cliente vê os dele |
| Frota: CNH, documentos, manutenção e multas (9) | cnh_vencida, cnh_vencendo, veiculo_doc_vencido, veiculo_doc_vencendo, manutencao_vencida, manutencao_vencendo, multa_conferir, multa_vencida, multa_vencendo | SGO_Alertas_Central.js:88-94, 107-108 | Toda a gestão; condutor vê a própria CNH | Gestor da Frota; CNH ao condutor; multa vencida também ao Financeiro |
| Frota: operação e rastreador (10) | frota_viagem_aberta, frota_km_conferir, frota_rastreador_uso, frota_rastreador_liberar, frota_rastreador_bloqueio, frota_rastreador_conexao, frota_comprovante, frota_avaria, frota_caso, frota_copiloto | SGO_Alertas_Central.js:95-106, 140, 142 | Toda a gestão | Gestor da Frota; falha de conexão só ao Administrador |
| Frota: reservas e registros em nome de outro (5) | frota_reserva_atraso, frota_reserva_problema, frota_reserva_proxima, frota_reserva_aviso, frota_registro_gestao | SGO_Alertas_Central.js:111-115 | Reservante, condutor e gestão | Individual; atraso e problema também ao gestor da Frota |
| Minhas atividades (4) | atividade_atrasada, atividade_hoje, atividade_aviso, atividade_justificativa | SGO_Alertas_Central.js:116-118, 139 | Responsável; justificativa a quem lançou | Sem mudança |
| Avisos com ciência (2) | aviso_ciencia, aviso_leitura_atrasada | SGO_Alertas_Central.js:119-120 | Público do aviso; quem publicou | Sem mudança |
| Programa de conduta (6) | conduta_ciencia, conduta_sugestao, conduta_fechamento, conduta_homologar, conduta_julgar, conduta_missao | SGO_Alertas_Central.js:121-124, 136-138 | Colaborador (ciência); toda a gestão (decisões) | Colaborador (ciência); gestor da área; o que envolve gestor vai à Diretoria. Nunca fora do sistema |
| Qualidade (4) | qualidade_cobranca, qualidade_os, qualidade_mov, plano_atrasado | SGO_Alertas_Central.js:125-127, 141 | Colaborador e gestão | Colaborador (ciência); gestor da área; plano atrasado a quem criou |
| Integração Auvo (3) | auvo_os_aberta, auvo_sem_vinculo, auvo_importacao | SGO_Alertas_Central.js:128-129, 134 | Técnico e gestão | Técnico (O.S. dele); gestor da Técnica; importação parada ao Administrador |
| E-mail de clientes (3) | email_cliente_nao_lido, email_cliente_sem_resposta, email_cliente_parado | SGO_Alertas_Central.js:131-133 | A própria pessoa; gestão (parado) | Sem mudança (gestor da área da pessoa) |
| Comercial (7) | comercial_sem_proxima, comercial_parada, comercial_desconto, comercial_reabertura, comercial_pedido_parado, comercial_pedido_passar, comercial_aviso | SGO_Alertas_Central.js:144-150 | Vendedor e gestão comercial | Sem mudança |


### 3.3 COMMAND

Toda chamada de cmdNotificar_ (Crm.js:328) grava o sino, põe o aviso na fila do WhatsApp (AvisosWhatsapp.js) e, até 21/10, copiava o aviso no balão do SGO+. A fila foi desligada em 20/10 e o espelho em 21/10 (0.38.0). A proposta é tornar isso definitivo: enquanto o COMMAND não for usado, nenhum dos 120 eventos sai do sino do COMMAND.


#### Agenda

| Nº | Evento e origem no código | Hoje: quem recebe e por onde | Quem deve receber | Canal proposto | Limite | Decisão |
|---|---|---|---|---|---|---|
| C001 | Novo compromisso ou compromisso alterado<br>`Agenda.js:238` | Dono do compromisso<br>Sino; fila do WhatsApp (desligada em 20/10); espelho no SGO+ (desligado em 21/10) | Individual | Sistema | — | Deixa de avisar fora do COMMAND; só sino até migrar |
| C002 | Compromisso passado para outra pessoa<br>`Agenda.js:241` | Dono anterior<br>Sino; fila do WhatsApp (desligada em 20/10); espelho no SGO+ (desligado em 21/10) | Ninguém | Só histórico | — | Vira só histórico |
| C003 | Novo compromisso na sua agenda<br>`Agenda.js:246` | Dono do compromisso<br>Sino; fila do WhatsApp (desligada em 20/10); espelho no SGO+ (desligado em 21/10) | Individual | Sistema | — | Deixa de avisar fora do COMMAND; só sino até migrar |
| C004 | Compromisso cancelado<br>`Agenda.js:269` | Dono do compromisso<br>Sino; fila do WhatsApp (desligada em 20/10); espelho no SGO+ (desligado em 21/10) | Individual | Sistema | — | Deixa de avisar fora do COMMAND; só sino até migrar |


#### Caixa de Entrada

| Nº | Evento e origem no código | Hoje: quem recebe e por onde | Quem deve receber | Canal proposto | Limite | Decisão |
|---|---|---|---|---|---|---|
| C005 | Entrada para você triar<br>`Agenda.js:527` | Responsável<br>Sino; fila do WhatsApp (desligada em 20/10); espelho no SGO+ (desligado em 21/10) | Individual | Sistema + E-mail no resumo | — | Deixa de avisar fora do COMMAND; só sino até migrar |
| C006 | Entrada reatribuída para triar<br>`Agenda.js:610` | Novo responsável<br>Sino; fila do WhatsApp (desligada em 20/10); espelho no SGO+ (desligado em 21/10) | Individual | Sistema | — | Deixa de avisar fora do COMMAND; só sino até migrar |
| C069 | Nova mensagem em conversa<br>`Integracoes.js:393` | Responsável<br>Sino; fila do WhatsApp (desligada em 20/10); espelho no SGO+ (desligado em 21/10) | Individual | Sistema | — | Deixa de avisar fora do COMMAND; só sino até migrar |
| C070 | Resposta de WhatsApp não entregue<br>`Integracoes.js:428` | Quem respondeu<br>Sino; fila do WhatsApp (desligada em 20/10); espelho no SGO+ (desligado em 21/10) | Individual | Sistema | — | Deixa de avisar fora do COMMAND; só sino até migrar |
| C071 | Novo e-mail em entrada<br>`Integracoes.js:685` | Responsável<br>Sino; fila do WhatsApp (desligada em 20/10); espelho no SGO+ (desligado em 21/10) | Substituído: e-mail de cliente não lido (SGO+) | Só histórico | — | Deixa de avisar: substituído no SGO+ |


#### Assistência

| Nº | Evento e origem no código | Hoje: quem recebe e por onde | Quem deve receber | Canal proposto | Limite | Decisão |
|---|---|---|---|---|---|---|
| C007 | Aviso de chamado à gestão da assistência<br>`Assistencia.js:144` | Gestão da assistência<br>Sino; fila do WhatsApp (desligada em 20/10); espelho no SGO+ (desligado em 21/10) | Gestor da área (Técnica) | Sistema | — | Deixa de avisar fora do COMMAND; só sino até migrar |
| C008 | Triagem para você<br>`Assistencia.js:375` | Responsável pela triagem<br>Sino; fila do WhatsApp (desligada em 20/10); espelho no SGO+ (desligado em 21/10) | Individual | Sistema | — | Deixa de avisar fora do COMMAND; só sino até migrar |
| C009 | Peça disponível (técnico)<br>`Assistencia.js:411` | Técnico<br>Sino; fila do WhatsApp (desligada em 20/10); espelho no SGO+ (desligado em 21/10) | Individual | Sistema + E-mail no resumo | — | Deixa de avisar fora do COMMAND; só sino até migrar |
| C010 | Peça disponível (responsável pela triagem)<br>`Assistencia.js:412` | Triagem<br>Sino; fila do WhatsApp (desligada em 20/10); espelho no SGO+ (desligado em 21/10) | Individual | Sistema | — | Deixa de avisar fora do COMMAND; só sino até migrar |
| C011 | Peça disponível (gestão)<br>`Assistencia.js:415` | Gestão<br>Sino; fila do WhatsApp (desligada em 20/10); espelho no SGO+ (desligado em 21/10) | Ninguém | Só histórico | — | Vira só histórico |
| C012 | Chamado para você (triagem)<br>`Assistencia.js:618` | Responsável<br>Sino; fila do WhatsApp (desligada em 20/10); espelho no SGO+ (desligado em 21/10) | Individual | Sistema | — | Deixa de avisar fora do COMMAND; só sino até migrar |
| C013 | Orçamento pedido pela assistência<br>`Assistencia.js:683` | Comercial<br>Sino; fila do WhatsApp (desligada em 20/10); espelho no SGO+ (desligado em 21/10) | Comercial (vira oportunidade no SGO+) | Sistema | — | Deixa de avisar fora do COMMAND; só sino até migrar |
| C014 | Atendimento passado para você<br>`Assistencia.js:771` | Técnico<br>Sino; fila do WhatsApp (desligada em 20/10); espelho no SGO+ (desligado em 21/10) | Individual | Sistema + WhatsApp no resumo do dia | — | Deixa de avisar fora do COMMAND; só sino até migrar<br>No resumo do WhatsApp só se for para hoje. |
| C015 | Atendimento reagendado<br>`Assistencia.js:772` | Técnico<br>Sino; fila do WhatsApp (desligada em 20/10); espelho no SGO+ (desligado em 21/10) | Individual | Sistema + E-mail no resumo | — | Deixa de avisar fora do COMMAND; só sino até migrar |
| C016 | Chamado replanejado<br>`Assistencia.js:963` | Técnico<br>Sino; fila do WhatsApp (desligada em 20/10); espelho no SGO+ (desligado em 21/10) | Individual | Sistema | — | Deixa de avisar fora do COMMAND; só sino até migrar |
| C100 | Orçamento do chamado aprovado: agendar<br>`OrcChamado.js:118` | Gestão da assistência<br>Sino; fila do WhatsApp (desligada em 20/10); espelho no SGO+ (desligado em 21/10) | Gestor da área (Técnica) | Sistema + E-mail no resumo | — | Deixa de avisar fora do COMMAND; só sino até migrar |
| C101 | Orçamento do chamado recusado: decidir<br>`OrcChamado.js:121` | Gestão da assistência<br>Sino; fila do WhatsApp (desligada em 20/10); espelho no SGO+ (desligado em 21/10) | Gestor da área (Técnica) | Sistema | — | Deixa de avisar fora do COMMAND; só sino até migrar |
| C111 | Pedido de remarcação de visita<br>`Remarcacoes.js:38` | Gestão da assistência<br>Sino; fila do WhatsApp (desligada em 20/10); espelho no SGO+ (desligado em 21/10) | Gestor da área (Técnica) | Sistema | — | Deixa de avisar fora do COMMAND; só sino até migrar |
| C112 | Remarcação recusada<br>`Remarcacoes.js:95` | Quem pediu<br>Sino; fila do WhatsApp (desligada em 20/10); espelho no SGO+ (desligado em 21/10) | Individual | Sistema | — | Deixa de avisar fora do COMMAND; só sino até migrar |


#### Atendente virtual

| Nº | Evento e origem no código | Hoje: quem recebe e por onde | Quem deve receber | Canal proposto | Limite | Decisão |
|---|---|---|---|---|---|---|
| C017 | Cliente aguardando uma pessoa no WhatsApp<br>`Atendente.js:360` | Responsável ou gestão da assistência<br>Sino; fila do WhatsApp (desligada em 20/10); espelho no SGO+ (desligado em 21/10) | Individual (responsável da entrada) | Sistema + E-mail na hora | — | Deixa de avisar fora do COMMAND; só sino até migrar |
| C018 | Cliente escreveu sobre o chamado<br>`Atendente.js:396` | Técnico ou triagem<br>Sino; fila do WhatsApp (desligada em 20/10); espelho no SGO+ (desligado em 21/10) | Individual | Sistema | — | Deixa de avisar fora do COMMAND; só sino até migrar |


#### Auvo (COMMAND)

| Nº | Evento e origem no código | Hoje: quem recebe e por onde | Quem deve receber | Canal proposto | Limite | Decisão |
|---|---|---|---|---|---|---|
| C019 | Erro ao enviar chamado ao Auvo<br>`AuvoLideranca.js:85` | Gestão<br>Sino; fila do WhatsApp (desligada em 20/10); espelho no SGO+ (desligado em 21/10) | Gestor da área (Técnica) | Sistema | — | Deixa de avisar fora do COMMAND; só sino até migrar |
| C020 | Tarefas criadas direto no Auvo sem origem<br>`AuvoLideranca.js:136` | Gestão<br>Sino; fila do WhatsApp (desligada em 20/10); espelho no SGO+ (desligado em 21/10) | Gestor da área (Técnica) | Sistema + E-mail no resumo | — | Deixa de avisar fora do COMMAND; só sino até migrar |
| C021 | Check-out do Auvo registrado<br>`AuvoSync.js:276` | Técnico (só sino)<br>Só sino do COMMAND | Ninguém | Só histórico | — | Vira só histórico |
| C022 | Atendimento no Auvo: faça check-in e check-out<br>`AuvoSync.js:549` | Técnico (só sino)<br>Só sino do COMMAND | Ninguém (o aplicativo do Auvo avisa) | Só histórico | — | Vira só histórico |


#### Avisos no WhatsApp

| Nº | Evento e origem no código | Hoje: quem recebe e por onde | Quem deve receber | Canal proposto | Limite | Decisão |
|---|---|---|---|---|---|---|
| C023 | Falha de configuração dos avisos no WhatsApp<br>`AvisosWhatsapp.js:201` | Administrador<br>Só sino do COMMAND | Ninguém (o módulo sai) | Só histórico | — | Deixa de avisar: substituído no SGO+ |
| C119 | Fila do WhatsApp de todo aviso do sino<br>`Crm.js:332 e AvisosWhatsapp.js` | Toda a equipe (desligado em 20/10)<br>WhatsApp (desligado em 20/10) | Ninguém: desligar de vez | Só histórico | — | Deixa de avisar: substituído no SGO+ |


#### Comercial (COMMAND)

| Nº | Evento e origem no código | Hoje: quem recebe e por onde | Quem deve receber | Canal proposto | Limite | Decisão |
|---|---|---|---|---|---|---|
| C024 | Nova versão de documento para ler<br>`BibliotecaComercial.js:464` | Comercial<br>Só sino do COMMAND | Vira Aviso com ciência do SGO+ | Só histórico | — | Deixa de avisar: substituído no SGO+ |
| C045 | Nova negociação para você<br>`Crm.js:168` | Vendedor<br>Sino; fila do WhatsApp (desligada em 20/10); espelho no SGO+ (desligado em 21/10) | Substituído: oportunidade do SGO+ | Só histórico | — | Deixa de avisar: substituído no SGO+ |
| C046 | Venda ganha (com valor)<br>`Crm.js:222` | Gestão comercial<br>Sino; fila do WhatsApp (desligada em 20/10); espelho no SGO+ (desligado em 21/10) | Substituído: venda ganha do SGO+ | Só histórico | — | Deixa de avisar: substituído no SGO+ |
| C047 | Nova tarefa comercial<br>`Crm.js:288` | Vendedor<br>Sino; fila do WhatsApp (desligada em 20/10); espelho no SGO+ (desligado em 21/10) | Substituído: Minhas atividades | Só histórico | — | Deixa de avisar: substituído no SGO+ |
| C048 | Cobrança comercial à gestão<br>`CrmCobranca.js:502` | Gestão comercial<br>Sino; fila do WhatsApp (desligada em 20/10); espelho no SGO+ (desligado em 21/10) | Substituído: Caixa de decisões | Só histórico | — | Deixa de avisar: substituído no SGO+ |
| C049 | Cobrança de retornos ao vendedor<br>`CrmCobranca.js:523` | Vendedor<br>Sino; fila do WhatsApp (desligada em 20/10); espelho no SGO+ (desligado em 21/10) | Substituído: lista do dia do Comercial | Só histórico | — | Deixa de avisar: substituído no SGO+ |
| C050 | Orçamento sem resposta (gestão avisada)<br>`CrmCobranca.js:544` | Vendedor<br>Sino; fila do WhatsApp (desligada em 20/10); espelho no SGO+ (desligado em 21/10) | Substituído: retorno no 2º dia útil | Só histórico | — | Deixa de avisar: substituído no SGO+ |
| C051 | Ligue para o cliente: orçamento sem resposta<br>`CrmCobranca.js:550` | Vendedor<br>Sino; fila do WhatsApp (desligada em 20/10); espelho no SGO+ (desligado em 21/10) | Substituído: retorno no 2º dia útil | Só histórico | — | Deixa de avisar: substituído no SGO+ |
| C052 | Proposta vence em N dias<br>`CrmCobranca.js:557` | Vendedor<br>Sino; fila do WhatsApp (desligada em 20/10); espelho no SGO+ (desligado em 21/10) | Substituído: proposta vencendo (SGO+) | Só histórico | — | Deixa de avisar: substituído no SGO+ |
| C053 | Gestor cobrando retornos<br>`CrmCobranca.js:589` | Vendedores<br>Sino; fila do WhatsApp (desligada em 20/10); espelho no SGO+ (desligado em 21/10) | Substituído | Só histórico | — | Deixa de avisar: substituído no SGO+ |
| C054 | Pedido de apoio da gestão<br>`CrmCobranca.js:667` | Gestão comercial<br>Sino; fila do WhatsApp (desligada em 20/10); espelho no SGO+ (desligado em 21/10) | Substituído: pedido de apoio (SGO+) | Só histórico | — | Deixa de avisar: substituído no SGO+ |
| C055 | Comentário ou menção na negociação<br>`CrmCobranca.js:763` | Vendedor ou mencionado<br>Sino; fila do WhatsApp (desligada em 20/10); espelho no SGO+ (desligado em 21/10) | Substituído | Só histórico | — | Deixa de avisar: substituído no SGO+ |
| C102 | Orçamento aprovado ou recusado (vendedor)<br>`Orcamentos.js:1244` | Vendedor<br>Sino; fila do WhatsApp (desligada em 20/10); espelho no SGO+ (desligado em 21/10) | Substituído: resposta da proposta (SGO+) | Só histórico | — | Deixa de avisar: substituído no SGO+ |
| C103 | Orçamento aprovado ou recusado (gestão)<br>`Orcamentos.js:1248` | Gestão comercial<br>Sino; fila do WhatsApp (desligada em 20/10); espelho no SGO+ (desligado em 21/10) | Substituído | Só histórico | — | Deixa de avisar: substituído no SGO+ |
| C105 | Pedido aprovado para o setor (pós-venda)<br>`PosVenda.js:193` | Responsável do setor<br>Sino; fila do WhatsApp (desligada em 20/10); espelho no SGO+ (desligado em 21/10) | Substituído: passagem aos setores (SGO+) | Só histórico | — | Deixa de avisar: substituído no SGO+ |
| C106 | Setor concluiu o pedido<br>`PosVenda.js:238` | Vendedor<br>Sino; fila do WhatsApp (desligada em 20/10); espelho no SGO+ (desligado em 21/10) | Substituído | Só histórico | — | Deixa de avisar: substituído no SGO+ |
| C107 | Encaminhe o pedido aprovado<br>`PosVenda.js:309` | Vendedor<br>Sino; fila do WhatsApp (desligada em 20/10); espelho no SGO+ (desligado em 21/10) | Substituído: pendência do Comercial | Só histórico | — | Deixa de avisar: substituído no SGO+ |
| C108 | Pedido aprovado sem encaminhamento (gestão)<br>`PosVenda.js:312` | Gestão<br>Sino; fila do WhatsApp (desligada em 20/10); espelho no SGO+ (desligado em 21/10) | Substituído: Caixa de decisões | Só histórico | — | Deixa de avisar: substituído no SGO+ |


#### Casos

| Nº | Evento e origem no código | Hoje: quem recebe e por onde | Quem deve receber | Canal proposto | Limite | Decisão |
|---|---|---|---|---|---|---|
| C025 | Caso para você<br>`Casos.js:353` | Dono do caso<br>Sino; fila do WhatsApp (desligada em 20/10); espelho no SGO+ (desligado em 21/10) | Individual | Sistema + E-mail no resumo | — | Deixa de avisar fora do COMMAND; só sino até migrar |
| C026 | Reclamação de cliente aberta<br>`Casos.js:360` | Gestão<br>Sino; fila do WhatsApp (desligada em 20/10); espelho no SGO+ (desligado em 21/10) | Gestor da área (Qualidade) | Sistema + E-mail na hora | — | Deixa de avisar fora do COMMAND; só sino até migrar<br>Tem prazo de resposta ao cliente. |
| C027 | Caso encerrado ou cancelado<br>`Casos.js:574` | Dono do caso<br>Sino; fila do WhatsApp (desligada em 20/10); espelho no SGO+ (desligado em 21/10) | Ninguém | Só histórico | — | Vira só histórico |
| C028 | Caso passado para você<br>`Casos.js:594` | Novo dono<br>Sino; fila do WhatsApp (desligada em 20/10); espelho no SGO+ (desligado em 21/10) | Individual | Sistema | — | Deixa de avisar fora do COMMAND; só sino até migrar |
| C029 | Nota no caso<br>`Casos.js:643` | Dono do caso<br>Sino; fila do WhatsApp (desligada em 20/10); espelho no SGO+ (desligado em 21/10) | Individual | Sistema | — | Deixa de avisar fora do COMMAND; só sino até migrar |


#### Compras

| Nº | Evento e origem no código | Hoje: quem recebe e por onde | Quem deve receber | Canal proposto | Limite | Decisão |
|---|---|---|---|---|---|---|
| C030 | Especificação incompleta<br>`Compras.js:286` | Solicitante<br>Sino; fila do WhatsApp (desligada em 20/10); espelho no SGO+ (desligado em 21/10) | Individual | Sistema | — | Deixa de avisar fora do COMMAND; só sino até migrar |
| C031 | Complete a especificação<br>`Compras.js:645` | Solicitante<br>Sino; fila do WhatsApp (desligada em 20/10); espelho no SGO+ (desligado em 21/10) | Individual | Sistema + E-mail no resumo | — | Deixa de avisar fora do COMMAND; só sino até migrar |
| C032 | Compra aprovada: fazer o pedido<br>`Compras.js:858` | Comprador<br>Sino; fila do WhatsApp (desligada em 20/10); espelho no SGO+ (desligado em 21/10) | Compras e Logística | Sistema + E-mail no resumo | — | Deixa de avisar fora do COMMAND; só sino até migrar |
| C033 | Compra reprovada<br>`Compras.js:871` | Comprador<br>Sino; fila do WhatsApp (desligada em 20/10); espelho no SGO+ (desligado em 21/10) | Compras e Logística | Sistema | — | Deixa de avisar fora do COMMAND; só sino até migrar |
| C034 | Peça pedida (previsão de entrega)<br>`Compras.js:897` | Solicitante<br>Sino; fila do WhatsApp (desligada em 20/10); espelho no SGO+ (desligado em 21/10) | Ninguém | Só histórico | — | Vira só histórico |
| C035 | Peça disponível<br>`Compras.js:943` | Solicitante<br>Sino; fila do WhatsApp (desligada em 20/10); espelho no SGO+ (desligado em 21/10) | Individual | Sistema + E-mail no resumo | — | Deixa de avisar fora do COMMAND; só sino até migrar |
| C036 | Requisição cancelada<br>`Compras.js:998` | Solicitante<br>Sino; fila do WhatsApp (desligada em 20/10); espelho no SGO+ (desligado em 21/10) | Individual | Sistema | — | Deixa de avisar fora do COMMAND; só sino até migrar |
| C037 | Compra para conferir (leva valor)<br>`ComprasRastreio.js:170` | Financeiro<br>Sino; fila do WhatsApp (desligada em 20/10); espelho no SGO+ (desligado em 21/10) | Financeiro | Sistema + E-mail no resumo | — | Deixa de avisar fora do COMMAND; só sino até migrar<br>Valor só na tela, nunca no e-mail ou WhatsApp. |
| C038 | Divergência apontada pelo Financeiro<br>`ComprasRastreio.js:290` | Comprador<br>Sino; fila do WhatsApp (desligada em 20/10); espelho no SGO+ (desligado em 21/10) | Compras e Logística | Sistema | — | Deixa de avisar fora do COMMAND; só sino até migrar |
| C039 | Mudança de situação da compra<br>`ComprasRastreio.js:339` | Solicitante<br>Sino; fila do WhatsApp (desligada em 20/10); espelho no SGO+ (desligado em 21/10) | Ninguém | Só histórico | — | Vira só histórico |


#### Bate-papo (COMMAND)

| Nº | Evento e origem no código | Hoje: quem recebe e por onde | Quem deve receber | Canal proposto | Limite | Decisão |
|---|---|---|---|---|---|---|
| C040 | Mensagem nova no bate-papo (sino com trecho do texto)<br>`ComunicacaoAdaptador.js:84` | Membros da conversa<br>Só sino do COMMAND | Ninguém: o balão do bate-papo já mostra | Só histórico | — | Deixa de avisar: substituído no SGO+ |


#### Contratos

| Nº | Evento e origem no código | Hoje: quem recebe e por onde | Quem deve receber | Canal proposto | Limite | Decisão |
|---|---|---|---|---|---|---|
| C041 | Você é o gestor do contrato<br>`Contratos.js:416` | Gestor do contrato<br>Sino; fila do WhatsApp (desligada em 20/10); espelho no SGO+ (desligado em 21/10) | Individual | Sistema | — | Deixa de avisar fora do COMMAND; só sino até migrar |
| C042 | Contrato renovado<br>`Contratos.js:528` | Gestor do contrato<br>Sino; fila do WhatsApp (desligada em 20/10); espelho no SGO+ (desligado em 21/10) | Ninguém | Só histórico | — | Vira só histórico |
| C043 | Contrato vencido sem decisão<br>`Contratos.js:909` | Gestor do contrato<br>Sino; fila do WhatsApp (desligada em 20/10); espelho no SGO+ (desligado em 21/10) | Gestor do contrato (Caixa de decisões) | Sistema + E-mail no resumo | — | Deixa de avisar fora do COMMAND; só sino até migrar |
| C044 | Decidir renovação<br>`Contratos.js:915` | Gestor do contrato<br>Sino; fila do WhatsApp (desligada em 20/10); espelho no SGO+ (desligado em 21/10) | Gestor do contrato | Sistema + E-mail no resumo | — | Deixa de avisar fora do COMMAND; só sino até migrar |


#### Demandas

| Nº | Evento e origem no código | Hoje: quem recebe e por onde | Quem deve receber | Canal proposto | Limite | Decisão |
|---|---|---|---|---|---|---|
| C056 | Nova demanda para você<br>`Demandas.js:388` | Cada pessoa da demanda<br>Sino; espelho; WhatsApp próprio das demandas (desligado em 20/10) | Substituído: atividade nova (Minhas atividades) | Só histórico | — | Deixa de avisar: substituído no SGO+ |
| C057 | Confirme o atendimento<br>`Demandas.js:535` | Quem pediu<br>Sino; espelho; WhatsApp próprio das demandas (desligado em 20/10) | Substituído: atividade concluída | Só histórico | — | Deixa de avisar: substituído no SGO+ |
| C058 | Demanda atendida<br>`Demandas.js:544` | Responsável<br>Sino; espelho; WhatsApp próprio das demandas (desligado em 20/10) | Ninguém | Só histórico | — | Vira só histórico |
| C059 | Demanda reaberta<br>`Demandas.js:561` | Responsável<br>Sino; espelho; WhatsApp próprio das demandas (desligado em 20/10) | Substituído | Só histórico | — | Deixa de avisar: substituído no SGO+ |
| C060 | Demanda cancelada<br>`Demandas.js:568` | Responsável<br>Sino; espelho; WhatsApp próprio das demandas (desligado em 20/10) | Substituído | Só histórico | — | Deixa de avisar: substituído no SGO+ |
| C061 | Comentário na demanda<br>`Demandas.js:573` | O outro lado<br>Sino; espelho; WhatsApp próprio das demandas (desligado em 20/10) | Substituído: comentário em atividade | Só histórico | — | Deixa de avisar: substituído no SGO+ |
| C062 | Prazo alterado<br>`Demandas.js:585` | Responsável<br>Sino; espelho; WhatsApp próprio das demandas (desligado em 20/10) | Substituído: atividade replanejada | Só histórico | — | Deixa de avisar: substituído no SGO+ |
| C063 | Falha de configuração do WhatsApp das demandas<br>`Demandas.js:619` | Administrador<br>Sino; espelho; WhatsApp próprio das demandas (desligado em 20/10) | Ninguém | Só histórico | — | Deixa de avisar: substituído no SGO+ |
| C064 | Cobrança periódica (a cada 2 h úteis, até 4 por dia, com WhatsApp)<br>`Demandas.js:766` | Responsável e solicitante<br>Sino; espelho; WhatsApp próprio das demandas (desligado em 20/10) | Substituído: atividade atrasada (cobra na tela; e-mail e WhatsApp só no resumo) | Só histórico | — | Deixa de avisar: substituído no SGO+ |
| C065 | Demanda vencida escalada ao gestor<br>`Demandas.js:806` | Gestor<br>Sino; espelho; WhatsApp próprio das demandas (desligado em 20/10) | Substituído: escada da Caixa de decisões | Só histórico | — | Deixa de avisar: substituído no SGO+ |
| C066 | "Fulano está cobrando" (cobrar agora)<br>`Demandas.js:854` | Responsável<br>Sino; espelho; WhatsApp próprio das demandas (desligado em 20/10) | Substituído: comentário em atividade | Só histórico | — | Deixa de avisar: substituído no SGO+ |
| C067 | Resposta pelo WhatsApp<br>`Demandas.js:962` | Quem pediu<br>Sino; espelho; WhatsApp próprio das demandas (desligado em 20/10) | Ninguém | Só histórico | — | Vira só histórico |


#### Copiloto (COMMAND)

| Nº | Evento e origem no código | Hoje: quem recebe e por onde | Quem deve receber | Canal proposto | Limite | Decisão |
|---|---|---|---|---|---|---|
| C068 | Seu resumo do copiloto está pronto<br>`IaEspecialistas.js:1207` | Gestores<br>Sino; fila do WhatsApp (desligada em 20/10); espelho no SGO+ (desligado em 21/10) | Ninguém (fica na tela) | Só histórico | — | Vira só histórico |


#### Metrologia (COMMAND)

| Nº | Evento e origem no código | Hoje: quem recebe e por onde | Quem deve receber | Canal proposto | Limite | Decisão |
|---|---|---|---|---|---|---|
| C072 | Ordem de metrologia para você<br>`Metrologia.js:651` | Responsável<br>Sino; fila do WhatsApp (desligada em 20/10); espelho no SGO+ (desligado em 21/10) | Individual (Metrologia) | Sistema + E-mail no resumo | — | Deixa de avisar fora do COMMAND; só sino até migrar |
| C073 | Item reprovado na revisão<br>`Metrologia.js:782` | Executor<br>Sino; fila do WhatsApp (desligada em 20/10); espelho no SGO+ (desligado em 21/10) | Individual | Sistema | — | Deixa de avisar fora do COMMAND; só sino até migrar |
| C074 | Ordem acima do prazo prometido<br>`Metrologia.js:1096` | Responsável<br>Sino; fila do WhatsApp (desligada em 20/10); espelho no SGO+ (desligado em 21/10) | Responsável; gestor da Metrologia pela Caixa | Sistema + E-mail no resumo | — | Deixa de avisar fora do COMMAND; só sino até migrar |


#### Missões

| Nº | Evento e origem no código | Hoje: quem recebe e por onde | Quem deve receber | Canal proposto | Limite | Decisão |
|---|---|---|---|---|---|---|
| C075 | Nova missão para você<br>`Missoes.js:58` | Responsável<br>Sino; fila do WhatsApp (desligada em 20/10); espelho no SGO+ (desligado em 21/10) | Substituído: Minhas atividades | Só histórico | — | Deixa de avisar: substituído no SGO+ |
| C076 | Nova missão com prazo<br>`Missoes.js:135` | Responsável<br>Sino; fila do WhatsApp (desligada em 20/10); espelho no SGO+ (desligado em 21/10) | Substituído: Minhas atividades | Só histórico | — | Deixa de avisar: substituído no SGO+ |
| C077 | Missão concluída<br>`Missoes.js:188` | Quem criou<br>Sino; fila do WhatsApp (desligada em 20/10); espelho no SGO+ (desligado em 21/10) | Substituído | Só histórico | — | Deixa de avisar: substituído no SGO+ |
| C078 | Missão passada para você<br>`Missoes.js:227` | Novo responsável<br>Sino; fila do WhatsApp (desligada em 20/10); espelho no SGO+ (desligado em 21/10) | Substituído | Só histórico | — | Deixa de avisar: substituído no SGO+ |


#### Metrolab's Way

| Nº | Evento e origem no código | Hoje: quem recebe e por onde | Quem deve receber | Canal proposto | Limite | Decisão |
|---|---|---|---|---|---|---|
| C079 | Andon: colaborador precisa de ajuda<br>`MpsAndon.js:426` | Gestores<br>Sino; fila do WhatsApp (desligada em 20/10); espelho no SGO+ (desligado em 21/10) | Gestor da área | Sistema | — | Deixa de avisar fora do COMMAND; só sino até migrar<br>Se o Way for adotado, é o único candidato a WhatsApp na hora (pessoa parada). |
| C080 | Andon respondido<br>`MpsAndon.js:461` | Quem abriu<br>Sino; fila do WhatsApp (desligada em 20/10); espelho no SGO+ (desligado em 21/10) | Individual | Sistema | — | Deixa de avisar fora do COMMAND; só sino até migrar |
| C081 | Andon encerrado<br>`MpsAndon.js:480` | Quem abriu<br>Sino; fila do WhatsApp (desligada em 20/10); espelho no SGO+ (desligado em 21/10) | Individual | Sistema | — | Deixa de avisar fora do COMMAND; só sino até migrar |
| C082 | Andon escalado ao dono<br>`MpsAndon.js:505` | Direção<br>Sino; fila do WhatsApp (desligada em 20/10); espelho no SGO+ (desligado em 21/10) | Diretoria | Sistema + E-mail no resumo | — | Deixa de avisar fora do COMMAND; só sino até migrar |
| C083 | Andon escalado (gestor)<br>`MpsAndon.js:507` | Gestor<br>Sino; fila do WhatsApp (desligada em 20/10); espelho no SGO+ (desligado em 21/10) | Gestor da área | Sistema | — | Deixa de avisar fora do COMMAND; só sino até migrar |
| C084 | Pauta da daily (sino e e-mail diário)<br>`MpsDaily.js:210 (e-mail em :213)` | Gestores de área<br>Sino; fila do WhatsApp (desligada em 20/10); espelho no SGO+ (desligado em 21/10); e-mail diário | Ninguém (a pauta fica na tela) | Só histórico | — | Vira só histórico |
| C085 | Check-in da daily pendente<br>`MpsDaily.js:260` | Gestor<br>Sino; fila do WhatsApp (desligada em 20/10); espelho no SGO+ (desligado em 21/10) | Ninguém | Só histórico | — | Vira só histórico |
| C086 | Missão passada para você (fila)<br>`MpsFila.js:353` | Novo responsável<br>Sino; fila do WhatsApp (desligada em 20/10); espelho no SGO+ (desligado em 21/10) | Individual | Sistema | — | Deixa de avisar fora do COMMAND; só sino até migrar |
| C087 | Missão concluída (fila)<br>`MpsFila.js:606` | Quem criou<br>Sino; fila do WhatsApp (desligada em 20/10); espelho no SGO+ (desligado em 21/10) | Ninguém | Só histórico | — | Vira só histórico |
| C088 | Interrupção aprovada: entra no seu plano<br>`MpsFila.js:789` | Colaborador<br>Sino; fila do WhatsApp (desligada em 20/10); espelho no SGO+ (desligado em 21/10) | Individual | Sistema | — | Deixa de avisar fora do COMMAND; só sino até migrar |
| C089 | Tempo padrão atingido<br>`MpsFila.js:945` | Colaborador<br>Sino; fila do WhatsApp (desligada em 20/10); espelho no SGO+ (desligado em 21/10) | Individual | Sistema | — | Deixa de avisar fora do COMMAND; só sino até migrar |
| C090 | Desvio de tempo de um colaborador (ao gestor)<br>`MpsFila.js:950` | Gestor<br>Sino; fila do WhatsApp (desligada em 20/10); espelho no SGO+ (desligado em 21/10) | Ninguém (vai ao relatório) | Só histórico | — | Vira só histórico |
| C091 | Planos do dia sem publicar<br>`MpsFila.js:998` | Gestor<br>Sino; fila do WhatsApp (desligada em 20/10); espelho no SGO+ (desligado em 21/10) | Gestor da área | Sistema | — | Deixa de avisar fora do COMMAND; só sino até migrar |
| C092 | Informe o motivo (item não feito)<br>`MpsFila.js:1023` | Colaborador<br>Sino; fila do WhatsApp (desligada em 20/10); espelho no SGO+ (desligado em 21/10) | Individual | Sistema | — | Deixa de avisar fora do COMMAND; só sino até migrar |
| C093 | Novo item no seu plano<br>`MpsFila.js:1240` | Colaborador<br>Sino; fila do WhatsApp (desligada em 20/10); espelho no SGO+ (desligado em 21/10) | Individual | Sistema | — | Deixa de avisar fora do COMMAND; só sino até migrar |
| C094 | Seu plano foi publicado<br>`MpsFila.js:1326` | Colaborador<br>Sino; fila do WhatsApp (desligada em 20/10); espelho no SGO+ (desligado em 21/10) | Ninguém (a tela Hoje mostra) | Só histórico | — | Vira só histórico |
| C095 | Interrupção pré-aprovada por regra<br>`MpsFila.js:1411` | Aprovadores<br>Sino; fila do WhatsApp (desligada em 20/10); espelho no SGO+ (desligado em 21/10) | Ninguém | Só histórico | — | Vira só histórico |
| C096 | Aprovar interrupção<br>`MpsFila.js:1415` | Aprovadores<br>Sino; fila do WhatsApp (desligada em 20/10); espelho no SGO+ (desligado em 21/10) | Gestor da área | Sistema | — | Deixa de avisar fora do COMMAND; só sino até migrar |
| C097 | Interrupção recusada<br>`MpsFila.js:1438` | Solicitante<br>Sino; fila do WhatsApp (desligada em 20/10); espelho no SGO+ (desligado em 21/10) | Individual | Sistema | — | Deixa de avisar fora do COMMAND; só sino até migrar |
| C098 | Interrupção aprovada (ao solicitante)<br>`MpsFila.js:1449` | Solicitante<br>Sino; fila do WhatsApp (desligada em 20/10); espelho no SGO+ (desligado em 21/10) | Individual | Sistema | — | Deixa de avisar fora do COMMAND; só sino até migrar |
| C099 | Exceção de limite do quadro liberada<br>`MpsKanban.js:159` | Colaborador<br>Sino; fila do WhatsApp (desligada em 20/10); espelho no SGO+ (desligado em 21/10) | Ninguém | Só histórico | — | Vira só histórico |


#### Portal do cliente

| Nº | Evento e origem no código | Hoje: quem recebe e por onde | Quem deve receber | Canal proposto | Limite | Decisão |
|---|---|---|---|---|---|---|
| C104 | Entrada aberta pelo portal do cliente<br>`PortalCliente.js:477` | Responsáveis<br>Sino; fila do WhatsApp (desligada em 20/10); espelho no SGO+ (desligado em 21/10) | Individual (responsável da entrada) | Sistema + E-mail no resumo | — | Deixa de avisar fora do COMMAND; só sino até migrar |


#### Prontuário

| Nº | Evento e origem no código | Hoje: quem recebe e por onde | Quem deve receber | Canal proposto | Limite | Decisão |
|---|---|---|---|---|---|---|
| C109 | Certificado do SGO+ a conferir<br>`Prontuario.js:448` | Responsáveis da ordem<br>Sino; fila do WhatsApp (desligada em 20/10); espelho no SGO+ (desligado em 21/10) | Individual (Metrologia) | Sistema | — | Deixa de avisar fora do COMMAND; só sino até migrar |
| C110 | Certificado do SGO+ registrado<br>`Prontuario.js:496` | Responsáveis da ordem<br>Sino; fila do WhatsApp (desligada em 20/10); espelho no SGO+ (desligado em 21/10) | Ninguém | Só histórico | — | Vira só histórico |


#### SEDNA

| Nº | Evento e origem no código | Hoje: quem recebe e por onde | Quem deve receber | Canal proposto | Limite | Decisão |
|---|---|---|---|---|---|---|
| C113 | Pendências para hoje (por pessoa)<br>`Sedna.js:130` | Cada pessoa com pendência<br>Sino; fila do WhatsApp (desligada em 20/10); espelho no SGO+ (desligado em 21/10) | Substituído: resumo do dia único | Só histórico | — | Deixa de avisar: substituído no SGO+ |
| C114 | Resumo SEDNA para gestores (sino e e-mail diário)<br>`Sedna.js:140 (e-mail em :298)` | Quem gere missões<br>Sino; fila do WhatsApp (desligada em 20/10); espelho no SGO+ (desligado em 21/10); e-mail diário | Substituído: Caixa de decisões | Só histórico | — | Deixa de avisar: substituído no SGO+ |
| C115 | Escalonamento de missão atrasada (3 níveis)<br>`Sedna.js:253` | Responsável, gestão, direção<br>Sino; fila do WhatsApp (desligada em 20/10); espelho no SGO+ (desligado em 21/10) | Substituído: escada da Caixa de decisões | Só histórico | — | Deixa de avisar: substituído no SGO+ |
| C116 | Alerta escalado por um colaborador<br>`Sedna.js:343` | Gestão<br>Sino; fila do WhatsApp (desligada em 20/10); espelho no SGO+ (desligado em 21/10) | Gestor da área (Caixa de decisões) | Sistema | — | Deixa de avisar fora do COMMAND; só sino até migrar |


#### Sistema

| Nº | Evento e origem no código | Hoje: quem recebe e por onde | Quem deve receber | Canal proposto | Limite | Decisão |
|---|---|---|---|---|---|---|
| C117 | Saúde do sistema com problema<br>`Sistema.js:132` | Administrador<br>Sino; fila do WhatsApp (desligada em 20/10); espelho no SGO+ (desligado em 21/10) | Administrador | Sistema + E-mail na hora | — | Deixa de avisar fora do COMMAND; só sino até migrar |


#### Ponte com o SGO+

| Nº | Evento e origem no código | Hoje: quem recebe e por onde | Quem deve receber | Canal proposto | Limite | Decisão |
|---|---|---|---|---|---|---|
| C118 | Avisos novos do SGO+ copiados no sino do COMMAND<br>`Sgo.js:492` | Todos com acesso<br>Sino do COMMAND | Ninguém (aviso em dobro) | Só histórico | — | Deixa de avisar: substituído no SGO+ |
| C120 | Espelho de todo aviso do COMMAND no balão do SGO+<br>`Crm.js:337` | Toda a equipe (desligado em 21/10)<br>Balão do SGO+ (desligado em 21/10) | Ninguém: não volta | Só histórico | — | Deixa de avisar: substituído no SGO+ |


### 3.4 Assistente do ponto

Linhas do ponto, com a proposta detalhada na seção 4.

| Nº | Evento e origem no código | Hoje: quem recebe e por onde | Quem deve receber | Canal proposto | Limite | Decisão |
|---|---|---|---|---|---|---|
| P01 | Lembrete de entrada (5 min antes)<br>`Ponto.js:800 (modelo cmd_ponto_entrada)` | CLT participantes<br>WhatsApp | CLT do piloto que aceitou | WhatsApp do ponto | 1 por dia | Continua avisando |
| P02 | Lembrete de saída para o almoço e de retorno<br>`Ponto.js:800 (cmd_ponto_almoco, cmd_ponto_retorno)` | CLT participantes<br>WhatsApp | Só quem pedir | WhatsApp do ponto | Opcional por pessoa | Continua avisando<br>Começa desligado. |
| P03 | Lembrete de saída (5 min antes)<br>`Ponto.js:800 (cmd_ponto_saida)` | CLT participantes<br>WhatsApp | CLT do piloto que aceitou | WhatsApp do ponto | 1 por dia | Continua avisando |
| P04 | Segundo lembrete 15 min depois, sem confirmação<br>`Ponto.js:815 (cmd_ponto_lembrete)` | CLT participantes<br>WhatsApp | Ninguém | Só histórico | — | Vira só histórico<br>Insistência: sai. |
| P05 | Saída de quem está em atendimento (17h55 e ao terminar, até 23h)<br>`Ponto.js:792 e :835 (cmd_ponto_saida_atendimento, cmd_ponto_saida_fim)` | Técnico CLT em atendimento<br>WhatsApp, inclusive à noite | Técnico CLT, só a mensagem das 17h55 | WhatsApp do ponto | Nada depois do expediente | Continua avisando<br>A mensagem ao terminar (noite) sai; o RH trata no dia seguinte (pergunta 10). |
| P06 | Mensagem de sexta para quem confirmou a semana toda<br>`Ponto.js:853 (cmd_ponto_semana)` | CLT participantes<br>WhatsApp | Ninguém | Só histórico | — | Vira só histórico |
| P07 | Pedido de ajuste do ponto ("esqueci de bater")<br>`Ponto.js:1055` | RH<br>Sino | RH | Sistema + E-mail no resumo | No resumo do dia | Continua avisando |
| P08 | Resposta do RH ao pedido de ajuste<br>`Ponto.js:1164-1166 (cmd_ponto_ajuste)` | Colaborador<br>Sino; WhatsApp | Individual | Sistema + E-mail no resumo | — | Continua avisando<br>Sai o WhatsApp. |
| P09 | Resumo de esquecimentos (a partir do 3º no mês)<br>`Ponto.js:908-914 (cmd_ponto_resumo)` | Gestão e RH<br>Sino; WhatsApp com o nome do colega | RH (e gestor da área no relatório mensal) | Sistema + E-mail no resumo | 1 por pessoa por mês | Continua avisando<br>Nunca por WhatsApp: dado pessoal de colega. |
| P10 | Aviso ao administrador (modelo, configuração)<br>`Ponto.js:654` | Administrador<br>Sino | Administrador | Sistema | 1 por motivo | Continua avisando |


## 4. Assistente do ponto

O assistente do ponto (Ponto.js, no COMMAND) lembra o colaborador de bater o ponto no relógio ou no aplicativo do RH e leva o "esqueci de bater" ao RH. Ele não sabe quem bateu e não substitui a batida. No dia 20/10 ele foi desligado (CMD_PONTO_CONFIG.ligado = falso) porque as mensagens dele saíram pelo mesmo número e com a mesma assinatura ("Metrolabs — COMMAND") dos avisos gerais do COMMAND, no WhatsApp que uma pessoa da equipe usa para conversar. Para a equipe, tudo pareceu a mesma enxurrada.


### 4.1 O que existe hoje

- Até quatro lembretes por dia (entrada 5 min antes, almoço na hora, retorno, saída 5 min antes) e um segundo lembrete 15 min depois de cada um sem confirmação: até oito mensagens por dia (Ponto.js:11-15).
- Técnico em atendimento: mensagem às 17h55 e outra quando o atendimento termina, até 23h00 (Ponto.js:16-18, :835).
- Mensagem de sexta para quem confirmou a semana (Ponto.js:853).
- A partir do 3º esquecimento no mês, gestão e RH recebem por WhatsApp um resumo com o nome do colega (Ponto.js:908-914).
- Já respeita: só CLT (Ponto.js:32-35), só por modelo aprovado, só dia útil, nunca repete o mesmo envio, não vai a quem tem folga ou férias na Agenda.
- Usa o calendário do COMMAND (Calendario.js: 08h00 às 18h00, sexta 17h30), diferente do expediente do SGO+ (08h00 às 17h30, SGO_Expediente.js:22).


### 4.2 Proposta

| Regra | Proposta |
|---|---|
| Quem recebe | Só CLT, só quem aceitar por escrito (participação marcada pela própria pessoa, com data), começando pelo piloto. |
| Número | Só o número oficial do sistema (Meta). Nunca o WhatsApp de uma pessoa da equipe. |
| Identificação | Toda mensagem começa com "Assistente do ponto" e termina com "O registro oficial é o do relógio ou do aplicativo de ponto". Nenhum outro assunto vai junto. |
| Quais lembretes | Entrada e saída. Almoço e retorno só para quem pedir. Sem segundo lembrete. Sem mensagem de sexta. |
| Horários | Só os horários combinados de cada pessoa (PONTO_PESSOAS). Nada depois do fim do expediente, nem para quem está em atendimento (pergunta 10). O assistente passa a usar o expediente do SGO+. |
| Separação dos outros avisos | O resumo do dia (09h30) e os avisos na hora nunca saem nos 10 minutos de um lembrete do ponto da mesma pessoa. |
| Esquecimento | Pedido de ajuste e resumo de esquecimentos vão ao RH pelo sistema e no e-mail de resumo. Nunca por WhatsApp. A resposta do RH ao colaborador vai pelo sistema e no e-mail. |
| Piloto | Duas semanas, com o técnico do piloto do WhatsApp e mais uma pessoa CLT do escritório. Medir confirmações e pedidos de ajuste antes de ampliar. |


## 5. Bate-papo

O bate-papo é conversa interna. Ele fica só dentro do sistema: balão no menu, lista de conversas e contagem de não lidas. A ponte para o WhatsApp (SGO_ComunicacaoWhatsapp.js) nasceu desligada e foi desligada de novo em 20/10 (COM_CONFIG wa_ligado = NAO); a proposta é não religá-la.

- No resumo do dia (e-mail e WhatsApp) pode ir só a contagem: "Você tem 4 mensagens não lidas no bate-papo." Sem nome de quem escreveu, sem trecho do texto, sem nome do grupo.
- O sino do COMMAND deixa de avisar mensagem de conversa (ComunicacaoAdaptador.js:84 leva hoje até 200 caracteres do texto): o balão do bate-papo já mostra.
- Mensagem que chega de fora pelo WhatsApp (cliente, fornecedor) não entra no bate-papo: vai para o atendimento ao cliente, quando ele for definido. A limpeza de 21/10 tirou do bate-papo as conversas que tinham entrado pela Z-API.
- Menção "@Nome" e mensagem direta continuam destacadas dentro do sistema.


## 6. Como cada pessoa ajusta o que recebe

Cada pessoa terá, em Minha conta > Avisos, uma tela simples com o que pode ligar e desligar. O obrigatório aparece na mesma tela, marcado e travado, com a explicação de por que não pode ser desligado. Só a própria pessoa mexe nas suas preferências; a gestão vê, mas não altera.

| Pode ajustar | Não pode desligar |
|---|---|
| Receber o WhatsApp de resumo do dia (só CLT; padrão ligado durante o piloto) | Avisos com ciência: sistema e e-mail |
| Hora do e-mail de resumo: 08h00 ou 12h00 | Atividade atrasada: cobrança no sistema até concluir ou justificar |
| Receber por e-mail os avisos informativos (comentário, concluída, venda ganha), que continuam no sistema | Caixa de decisões do gestor: e-mail de resumo |
| Lembretes do ponto: almoço e retorno (entrada e saída a pessoa aceita ou não no piloto) | Exceções de WhatsApp na hora da Frota para quem é o gestor da Frota ou está com o veículo |
| Silenciar um módulo no e-mail de resumo (por exemplo, Comercial para quem só apoia) | Pendências da central (aparecem sempre no Início) |

> O COMMAND já tem preferência pessoal parecida (AVW_PREFS, Minha conta). A proposta é ter uma só, no SGO+, valendo para os dois sistemas.


## 7. Como medir se melhorou

O SGO+ já registra cada envio: NTF_ENVIOS (e-mail e WhatsApp, com situação ENVIADO, RETIDO pelo piloto, PULADO ou ERRO e o motivo), ATV_AVISOS e ATV_RESUMOS (atividades), COM_AVISOS (Comercial), FROTA_RES_AVISOS (reservas), GES_ENVIOS (Caixa de decisões) e o relatório do piloto do WhatsApp (Administração > Piloto do WhatsApp, que junta o que o servidor bloqueou e o que o COMMAND tentou). No COMMAND: NOTIFICACOES (sino), AVW_FILA e DEMANDA_ENVIOS. Não é preciso criar registro novo para medir.

| Indicador | Como calcular | Meta |
|---|---|---|
| Avisos por pessoa por dia, por canal | Contagem por pessoa e dia útil em NTF_ENVIOS (e-mail, WhatsApp) e nas abas de aviso do sistema | E-mail: até 2 (resumo + na hora). WhatsApp: até 1, fora o ponto |
| WhatsApp fora do expediente | Envios com horário fora do expediente | Zero |
| WhatsApp para PJ ou vínculo vazio | Envios cruzados com VINCULO_TRABALHO | Zero |
| Avisos ignorados | Aviso no sistema não lido em 3 dias úteis; aviso com ciência fora do prazo; item da Caixa que subiu à Diretoria | Cair pela metade em 4 semanas |
| Tempo até a ação | Da entrada do item na Caixa até a primeira providência (GES_DECISOES) | Menor que antes |
| Mensagens retidas pelo piloto | SITUACAO = RETIDO em NTF_ENVIOS e o bloqueio do servidor | Mostra quanto sairia sem a matriz |
| Pedidos para parar | Quantas pessoas desligaram o WhatsApp de resumo ou reclamaram | Nenhuma reclamação de excesso |

Como comparar: tirar a semana de 16/10 a 20/10 (antes) dos registros acima, por pessoa, e repetir a mesma conta nas duas semanas depois de ligar a matriz para o grupo do piloto. O relatório do piloto já mostra o que foi enviado e o que foi retido; falta só a contagem por pessoa e por dia, que pode entrar no próprio relatório.


## 8. Plano de implantação e decisões do dono

| Etapa | O que acontece | Depende de |
|---|---|---|
| 0. Aprovação | O dono responde as perguntas abaixo e aprova ou corrige a matriz. | Dono |
| 1. Cadastro | Área e vínculo de todos; gestor de cada área em Regras e responsáveis; responsável por Compras e Logística; celular de quem participa do piloto. Sem código. | Gestão e RH |
| 2. COMMAND em silêncio | Fila do WhatsApp e espelho desligados de vez (hoje só por configuração); e-mails do SEDNA e da pauta da daily desligados; cópia dos avisos do SGO+ no sino do COMMAND desligada. Demandas e Missões passam a abrir atividade no SGO+. | Aprovação das perguntas 11 e 12 |
| 3. Resumo do dia único | Um e-mail por pessoa às 08h00 e um WhatsApp às 09h30 (CLT, piloto), juntando atividades, Caixa de decisões, Comercial, reservas, avisos com ciência pendentes e a contagem do bate-papo. Os e-mails avulsos de cada módulo deixam de sair. | Etapa 1; modelo de resumo aprovado na Meta |
| 4. Ajuste dos módulos | Frota (WhatsApp só nas 4 exceções; rastreador para o gestor da Frota), Programa de conduta e Avisos (sem WhatsApp avulso, com vínculo), Auvo (gestão sem aviso por chamado), central por área. | Etapa 3 |
| 5. Preferências | Tela Minha conta > Avisos, valendo para os dois sistemas. | Etapa 3 |
| 6. Ponto | Piloto do assistente do ponto com as regras da seção 4. | Pergunta 9 |
| 7. Medição e ampliação | Duas semanas de medição (seção 7) e, se os números estiverem dentro da meta, ampliar o WhatsApp de resumo para toda a equipe CLT. | Etapas 3 a 5 |
| Sempre | Todo módulo do COMMAND que vier ao SGO+ entra com a linha desta matriz; todo aviso novo nasce em modo de teste, com lista de pessoas. | — |


### Perguntas para o dono

1. Aprova os três canais e o limite de um WhatsApp de resumo por pessoa por dia, às 09h30, só se a pessoa não abriu o sistema?
2. Aprova as 4 exceções de WhatsApp na hora (partida não liberada, uso sem registro no expediente, devolução atrasada com reserva no mesmo dia, reserva de hoje liberada a outra pessoa)?
3. Uso de veículo sem registro fora do expediente: avisa alguém na hora (por exemplo, só o senhor) ou só no dia seguinte?
4. PJ e vínculo não informado ficam sem WhatsApp, só sistema e e-mail?
5. E-mail de resumo às 08h00 para todos?
6. Quem é o gestor de cada área (Administrativo/Frota, Técnica, Metrologia, Qualidade, Financeiro, RH, Compras e Logística)? Comercial é o Matheus. Compras fica na Logística ou no Administrativo?
7. Avisos com ciência deixam de ir por WhatsApp (só a contagem no resumo)?
8. Auvo: a gestão deixa de receber um aviso por chamado aberto ou concluído? O cliente continua recebendo por e-mail; WhatsApp ao cliente fica para depois do piloto?
9. Ponto: aprova o piloto com entrada e saída, sem segundo lembrete, sem mensagem de sexta e sem resumo de esquecimentos por WhatsApp? Quem participa?
10. Técnico em atendimento depois do expediente: manda o lembrete de saída ao terminar, ou o RH trata no dia seguinte?
11. COMMAND: aprova desligar de vez a fila do WhatsApp e o espelho, deixando só o sino até cada módulo vir ao SGO+?
12. Demandas e Missões do COMMAND viram Minhas atividades do SGO+, sem a cobrança a cada duas horas?
13. Concorda com a lista do que cada pessoa pode e não pode desligar (seção 6)?
14. Piloto: quem é o técnico, e a duração é de duas semanas?


## Anexo A. O que o levantamento encontrou no código

Pontos que explicam o excesso de mensagens e o que a matriz corrige. Todos conferidos na leitura do código de 21/10/2026.

| Nº | Achado | Onde |
|---|---|---|
| A1 | Avisos do rastreador vão a toda a gestão (Administrador, Gestor, Diretoria) por e-mail e WhatsApp, sem regra de horário nem de vínculo: podem sair à noite. | SGO_Frota_Rastreador.js:540-552 |
| A2 | Retirada e devolução registradas em nome do condutor mandam WhatsApp a qualquer hora, sem regra. | SGO_Frota_Main.js:602-607 |
| A3 | Missões do Programa de conduta mandam WhatsApp a todos os Gestores e à Diretoria e aos executantes, com assunto de incentivo, sem olhar o vínculo. | SGO_Conduta_Missao.js:125-142, :186-190, :216 |
| A4 | Avisos com ciência mandam WhatsApp a todo o público, sem olhar o vínculo. | SGO_Avisos.js:486 |
| A5 | Cada chamado do Auvo aberto ou concluído manda e-mail e WhatsApp ao técnico e a todos os Gestores e Diretoria, sem regra de horário. | SGO_Auvo_Incremental.js:394, :546 |
| A6 | Só atividades, Caixa de decisões e reservas usam a regra sutil (CLT, dia útil, horário, um por dia). Os demais chamam o notificador sem categoria e ficam fora dela. | SGO_Notificar.js:24-40 |
| A7 | Até quatro e-mails separados por pessoa por dia: atividades (por rodada), Comercial (por rodada), reservas (um por aviso) e Caixa de decisões (08h00). | SGO_Atividades_Avisos.js:106; SGO_Comercial_Config.js:523; SGO_Frota_Reservas.js:260; SGO_Gestao_Escada.js:236 |
| A8 | A central mostra tudo da equipe a qualquer Administrador, Gestor ou Diretoria, sem olhar a área. | SGO_Alertas_Central.js:37 |
| A9 | No COMMAND, toda ação grava o sino e põe na fila do WhatsApp; fora do expediente, aviso de prioridade alta sai na hora; até 6 por pessoa por hora. | Crm.js:328-340; AvisosWhatsapp.js:20-21, :71, :336 |
| A10 | Demandas do COMMAND cobram pelo WhatsApp a cada 2 horas úteis, até 4 vezes por dia por demanda, e escalam ao gestor. | Demandas.js:19-25, :50 |
| A11 | O assistente do ponto chega a 8 lembretes por dia, manda mensagem até 23h00 a quem está em atendimento e manda à gestão e ao RH, por WhatsApp, o nome de quem esqueceu. | Ponto.js:11-18, :835, :908-914 |
| A12 | Avisos do SGO+ são copiados no sino do COMMAND (aviso em dobro) e o sino do COMMAND avisa mensagem do bate-papo com trecho do texto. | Sgo.js:475-492; ComunicacaoAdaptador.js:84 |
| A13 | SEDNA e pauta da daily mandam e-mail diário aos gestores, embora o COMMAND não seja usado. | Sedna.js:298; MpsDaily.js:213 |
| A14 | O expediente do ponto (COMMAND) é diferente do expediente do SGO+. | Ponto.js:8-10; SGO_Expediente.js:22 |


## Anexo B. Arquivos lidos

SGO+ (apps-script-imports/portal_sgo_versao_cnpj_db): SGO_Notificar.js, SGO_Alertas_Central.js, SGO_Gestao_Decisoes.js, SGO_Gestao_Escada.js, SGO_Atividades.js, SGO_Atividades_Avisos.js, SGO_Avisos.js, SGO_Frota_Main.js, SGO_Frota_Rastreador.js, SGO_Frota_Rastreamento.js, SGO_Frota_Reservas.js, SGO_Conduta_Missao.js, SGO_Auvo_Incremental.js, SGO_Comercial_Config.js, SGO_Comercial_Oportunidades.js, SGO_Comercial_Propostas.js, SGO_Comercial_Painel.js, SGO_Comercial_Gestora.js, SGO_ComunicacaoWhatsapp.js, Comunicacao.js, SGO_WhatsappPiloto.js, SGO_Areas.js, SGO_Config.js, SGO_Expediente.js, SGO_Email.js.

COMMAND (metrolabs_command): Crm.js (cmdNotificar_) e as 117 chamadas em Agenda.js, Assistencia.js, Atendente.js, AuvoLideranca.js, AuvoSync.js, AvisosWhatsapp.js, BibliotecaComercial.js, Casos.js, Compras.js, ComprasRastreio.js, ComunicacaoAdaptador.js, Contratos.js, CrmCobranca.js, Demandas.js, IaEspecialistas.js, Integracoes.js, Metrologia.js, Missoes.js, MpsAndon.js, MpsDaily.js, MpsFila.js, MpsKanban.js, OrcChamado.js, Orcamentos.js, PortalCliente.js, PosVenda.js, Prontuario.js, Remarcacoes.js, Sedna.js, Sistema.js; e também Ponto.js, Sgo.js, Atividades.js e Reservas.js.

> Fora desta matriz: mensagens ao cliente que a própria pessoa envia (Enviar documento, e-mail integrado, proposta, portal do cliente) e o e-mail de acesso de usuário. Não são avisos automáticos internos.

