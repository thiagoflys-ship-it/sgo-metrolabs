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

- WhatsApp para vínculo CLT e PJ (decisão de 26/10/2026; Administração › Usuários › Vínculo: CLT, PJ ou Diretoria). Os lembretes do ponto vão só para CLT. Diretoria e vínculo não informado recebem pelo sistema e por e-mail; a Diretoria só recebe WhatsApp se a gestão a marcar em Atividades da equipe › Avisos e horários. Os vínculos Cliente e Representante (contas de fora, 03/11/2026) não entram na lista do WhatsApp nem nos avisos internos. Vale para todos os módulos, inclusive Frota, Programa de conduta, Avisos e Auvo.
- WhatsApp na hora só nos eventos marcados "Na hora" na matriz (desde 26/10/2026, qualquer evento pode ser marcado pelo Administrador ou pela Diretoria, com motivo). Fora deles e do resumo do dia, o envio fica PULADO em Notificações enviadas, com o motivo. Passou do teto do dia, o aviso fica no sistema e no e-mail.
- Eventos novos (26/10/2026): S69 "Atividade vence hoje" (desligado até a gestão marcar; sai uma vez por atividade, na primeira rodada do expediente do dia do prazo) e S70 "Aviso urgente" (quem publica um aviso escolhe a importância Urgente: vai também pelo WhatsApp na hora).
- Compras, cartão da empresa (31/10/2026): CP02 "Compra no cartão da empresa sem informar" (ao responsável pelo cartão: e-mail na hora, no expediente, depois de 2 dias úteis da importação da fatura; WhatsApp só na contagem do resumo do dia; a cobrança fica no Início até informar) e CP03 "A pagar e conciliação do dia" (ao Financeiro, no resumo de e-mail, sem WhatsApp).
- Avisos por setor (26/10/2026): CP01 "Avisos de Compras" (requisição aprovada ou reprovada, item disponível, especificação devolvida, cancelamento, conferência) e VC01 "Vencimentos que dependem de você" (uma vez por dia, no e-mail de resumo: padrões de referência, calibrações e requalificações de equipamentos, documentos, CNH e veículos, só o vencido e o que vence em até 7 dias). A Assistência técnica tem os eventos AT01 a AT17.
- Escalonamento das atividades atrasadas por prioridade (26/10/2026): S71 "cobrança ao responsável" (nível 1), S72 "escalada ao gestor da área" (nível 2) e S73 "escalada à Diretoria" (nível 3). Saem no sistema e por e-mail na hora, uma vez por atividade e por previsão, só no expediente; o WhatsApp só sai se a gestão marcar "Na hora". Os prazos de cada prioridade ficam em Caixa de decisões > Regras e responsáveis (padrão: Urgente 15 min, 1 h e 4 h; Alta 1, 4 e 24 h; Normal 4, 24 e 72 h; Baixa 24, 72 e 168 h).
- Evento marcado "Na hora" vai também pelo WhatsApp mesmo quando o módulo pediu só sistema ou e-mail: a matriz acrescenta o canal e confere expediente, vínculo, piloto e teto.
- Cliente e contato externo não recebem WhatsApp até o fim do piloto (o evento S56 começa sem WhatsApp; o e-mail ao cliente continua na hora).
- Evento "vira histórico": ninguém é avisado; o fato continua no histórico do próprio registro (ex.: chamado do Auvo concluído).
- Gestor da área no lugar de "toda a gestão": rastreador, reservas e missões do Programa de conduta vão ao gestor da área (Caixa de decisões › Regras e responsáveis). Área sem gestor: Diretoria. Compras fica na área Logística.
- O assistente do ponto tem identificação e regra próprias; nada da matriz se aplica a ele. O resumo do dia não leva assunto do ponto e não sai a menos de 10 minutos de um lembrete do ponto da mesma pessoa.
- O piloto do WhatsApp continua valendo: quem não está na lista fica RETIDO, e o servidor confere a mesma lista. A exceção são os avisos da gestão (seção 3A).

## 3A. Avisos da gestão no celular (01/11/2026, decisão do dono)

Pendência, aprovação, atraso e ato irreversível da gestão chegam aos gestores e à Diretoria por WhatsApp e por e-mail, com um link que abre o item exato no SGO+. Inventário completo: `docs/AVISOS_GESTAO_CELULAR_20261101.md`.

| Tipo | Exemplos | Quando chega |
|---|---|---|
| Pendência / Aprovação | Decisão nova na Caixa de decisões (GS01: desconto acima da alçada, reabertura, preço, pedido de nova data, compra a aprovar, Frota, Assistência, padrões), pedido de apoio comercial (S23), pedido da representada (RP01, RP02) | Agrupada: o que nasce em 30 minutos vai numa mensagem só, com um link por item |
| Atraso | Prazo de decisão vencido sem ação (GS02), decisão escalada à Diretoria (GS03), atividade atrasada escalada ao gestor ou à Diretoria (S72, S73), prazo de aceite da representada (RP07) | Na hora |
| Irreversível | Oportunidade perdida, proposta cancelada ou excluída, desconto não aprovado, reabertura recusada (GI01); pedido de nova data recusado (GI02); pedido de compra cancelado (GI03); chamado cancelado ou excluído, solicitação descartada (GI04); julgamento do Programa de conduta, só à Diretoria, com o título fixo "Julgamento registrado no Programa de Conduta" e sem o resultado (GI05); pedido da representada recusado (GI06); cadastro excluído (GI07) | Na hora, ao gestor da área e à Diretoria, menos quem fez: quem fez, o quê, o item e o motivo |

Regras:

- Quem recebe: Administrador, Gestor e Diretoria; RH e Financeiro só quando são responsáveis de área (Caixa de decisões › Regras e responsáveis). Inclusive PJ, sem piloto: o celular deles vai numa lista própria do piloto, que libera só estes avisos. Para as demais pessoas nada muda (teto de 3 WhatsApp na hora e resumo do dia). Quem recebe um irreversível sem ser da gestão (por exemplo, um técnico responsável pela área) recebe por e-mail, pela regra comum.
- Horário: a Diretoria recebe a qualquer hora, inclusive à noite e no fim de semana. O gestor recebe só no expediente; o que nasce fora dele chega na abertura do próximo dia útil (08:00 no padrão).
- Não há teto de mensagens para a gestão.
- O link abre o item no SGO+ depois do login, só para quem recebeu o aviso e para a gestão. Quem abre o link de outra pessoa vê "Este aviso é de outra pessoa". A decisão é sempre tomada no sistema: o WhatsApp não tem botão de aprovar ou recusar.
- Cada item avisa uma vez por marco: um segundo marco do mesmo item (prazo em risco e depois vencido, um segundo pedido de nova data) avisa de novo.
- Informativo (venda ganha, comentário, atividade concluída, itens de acompanhamento) continua como antes, sem WhatsApp da gestão.
- O ponto continua fora.
- Pedido da representada (03/11/2026, pedido do dono): RP01, RP02 e RP07 vão também para quem responde pela representação (Regras da assistência › Representação; sem ninguém, quem faz a triagem), mesmo sem ser da gestão; o celular dessas pessoas entra na lista da gestão do piloto só para estes avisos. Para estes três eventos: só no expediente e em dia útil para todos, inclusive a Diretoria; RP01 e RP02 saem na hora (sem o agrupamento de 30 minutos); no máximo 10 WhatsApp por pessoa por dia (passou disso, "Teto do dia: só e-mail"); e o aviso que ainda espera o expediente não sai se o pedido foi aceito, recusado ou cancelado antes (fica "Resolvido" com o motivo).
- Enquanto o modelo `sgo_gestao_acao` não for aprovado pela Meta, o aviso sai só por e-mail com a marca "WhatsApp aguardando modelo". Sem celular no cadastro ou com erro da Meta, também vai o e-mail, e o motivo fica registrado.
- Cada aviso tem um ciclo registrado: criado, na fila, enviado (e-mail e WhatsApp), entregue ou lido (quando a Meta devolver), aberto e resolvido (quando o item sai da pendência). Sem ação no prazo, a escada da Caixa de decisões e a SEDNA continuam cobrando.

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
10. "Avisos da gestão" (01/11/2026): escolha o dia e toque em "Mostrar". Aparecem os totais (enviados, na fila, falhas, parados e WhatsApp aguardando modelo), a situação do modelo `sgo_gestao_acao` e uma linha por aviso: quando, pessoa, tipo, item, situação, canais e o motivo. "Parado" em vermelho = na fila há mais de 1 hora, enviado e sem resolução depois do prazo, ou nada chegou.
11. Nas regras, cada evento da gestão tem o selo "Gestão: <tipo>" e a escolha "Avisos da gestão": Ligado (WhatsApp e e-mail aos gestores e à Diretoria) ou Desligado (só a regra comum da linha). Salvar pede o motivo, como as outras mudanças. A ligação inicial está na trilha com o motivo "decisão do dono 01/11/2026".

Travas: WhatsApp na hora só nos eventos aprovados como exceção; evento obrigatório (avisos com ciência, atividade atrasada, decisões do gestor, escalada à Diretoria, exceções da Frota) não pode deixar de avisar; toda mudança pede motivo de pelo menos 8 letras.

**Desde 01/11/2026 (Etapa 6 do Programa de melhoria):** com Módulo em "Todos", as regras vêm agrupadas por módulo, com o número de avisos e de regras alteradas no título de cada grupo. No celular os grupos começam fechados (antes a página tinha cerca de 36 mil px); no computador, abertos. O grupo que você abriu ou fechou continua assim depois de salvar uma regra. O botão "Definir gestores em Caixa de decisões" quebra a linha no celular em vez de passar da tela.

**Piloto do WhatsApp (mesma data):** o bloco Situação diz o nome do campo que falta em Chaves e senhas (token permanente, identificação do número de telefone, identificação da conta comercial) em vez do nome interno da chave; a última alteração aparece como 01/11/2026 12:15; o selo antigo "Z-API desligada" agora é "Envio antigo (Z-API) desligado". No celular, marcar a pessoa, o tipo de aviso ou a área tem alvo de 44 px. O dia sem mensagens diz como ver outro dia ou todas as pessoas. O envio não mudou.

## 5. Meus avisos (cada pessoa)

1. Abra Menu › Principal › Meus avisos.
2. Marque ou desmarque o WhatsApp de resumo do dia (para CLT e PJ).
3. Escolha a hora do e-mail de resumo: 08:00 ou 12:00.
4. Se quiser, receba no e-mail de resumo os avisos informativos (comentário, atividade concluída, venda ganha), que continuam no sistema.
5. Se quiser, tire do e-mail de resumo os avisos do Comercial, da Frota ou do Auvo (continuam no sistema).
6. Toque em "Salvar". Vale a partir do próximo resumo.
7. "Ver a prévia" mostra o texto do seu e-mail de resumo de hoje, sem enviar nada.

Não podem ser desligados: avisos com ciência (sistema e e-mail), a cobrança da atividade atrasada no sistema, o e-mail com as decisões do gestor, as exceções da Frota para o gestor da Frota e para quem está com o veículo, e as pendências da central. Para quem é da gestão, também os avisos da gestão (pendência, aprovação, atraso e ato irreversível por WhatsApp e e-mail): a tela mostra o porquê e o horário de cada um (gestor no expediente, Diretoria a qualquer hora). Só a própria pessoa altera as suas preferências; a gestão vê na Matriz de avisos.

## 6. Central de pendências por área

O gestor vê o da sua área (área do cadastro e áreas de Regras e responsáveis) e o que é dele; a Diretoria vê tudo; o Administrador sem área vê as falhas técnicas (rastreador sem conexão, importação do Auvo parada) e o que é dele. Gestor sem área definida continua vendo tudo, para ninguém ficar sem enxergar o que precisa. Quem publicou um aviso com ciência vê a leitura atrasada dele. O filtro desliga em Matriz de avisos › Alterar horários.

### Janela "Avisos" ao entrar (31/10/2026)

Ao entrar no SGO+, a janela "Avisos" resume as pendências críticas da central que não têm janela própria (atividade atrasada, aviso com ciência, Programa de conduta e cobrança da gestão já abrem sozinhos). Para quem já recebe o balão de padrões, os padrões ficam fora do resumo.

1. No topo, abaixo de "Avisos", aparece o total. Exemplo: "89 pendências críticas · 7 grupos". Se houver, aparecem também as cobranças da gestão e os reconhecimentos.
2. Em "Pendências críticas" há um cartão por grupo. Cada cartão mostra o módulo, a etiqueta de gravidade ("Crítica" ou "Prazo estourado") e o motivo resumido (ex.: "Bloqueia emissão"). Mostra também o título com a quantidade (ex.: "76 padrões de referência vencidos"), até 3 exemplos com "e mais N", o "Por quê" (quando o grupo tem uma pendência só ou só parte dele é crítica) e o "O que fazer".
3. Ordem: primeiro o que é da própria pessoa, depois o que está com prazo estourado, depois o resto, na ordem da central.
4. "Abrir" fecha a janela e leva à tela que resolve. Quando o grupo não tem tela própria, o botão se chama "Ver a lista" e abre a lista do Início filtrada por aquele grupo.
5. A janela mostra os 5 primeiros grupos. "Ver todas as pendências" abre a lista completa do Início, com uma pendência por linha.
6. "Estou ciente" fica fixo no rodapé, também no celular. Ele só esconde o mesmo conjunto de pendências por 20 horas e não resolve nada. Se surgir uma pendência crítica nova, o resumo volta no próximo acesso.
7. No celular a janela ocupa a tela inteira, rola por dentro, os cartões ficam em coluna e os botões têm pelo menos 44 px.

O texto corrido do resumo continua sendo montado no servidor (campo DESCRICAO) para quem lê só texto; a janela desenha os cartões a partir dos grupos estruturados (campos RESUMO e GRUPOS, `Qualidade_gruposDaJanela_` em `SGO_Qualidade_Ocorrencias.js`).

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
| Aviso da gestão com "WhatsApp aguardando modelo" | O modelo `sgo_gestao_acao` ainda não foi aprovado pela Meta. O e-mail saiu. Cadastre em Chaves e senhas › Cadastrar modelos na Meta e confira em Situação dos modelos. |
| Aviso da gestão com "Sem celular no cadastro" | Complete o celular em Administração › Usuários. O e-mail saiu. |
| Gestor diz que o aviso chegou só de manhã | Gestor recebe só no expediente; o que nasce fora dele sai na abertura do próximo dia útil. A Diretoria recebe a qualquer hora. |
| O link do aviso abriu a Caixa de decisões em vez do item | O link não foi encontrado (copiado pela metade ou de outro ambiente). O item continua na Caixa até ser resolvido. |
| Aparece "Este aviso é de outra pessoa" | O link foi encaminhado. Só quem recebeu o aviso e a gestão abrem; o que é seu está no Início e em Meus avisos. |

## 9. Registros

Nada é apagado. `NTF_REGRAS` (cada mudança de regra e de horário, com antes, depois, motivo, quem e quando; a última de cada evento vale), `NTF_RESUMO_FILA` (itens guardados para o e-mail de resumo ou para o próximo expediente), `NTF_RESUMOS` (cada resumo avaliado: pessoa, dia, canal, situação, motivo), `NTF_PREFERENCIAS` (cada mudança de preferência) e `NTF_ENVIOS` (cada envio, com a coluna EVENTO; e-mail guardado para o resumo fica com SITUACAO = NO_RESUMO; destinatário da gestão de um aviso da gestão fica com SITUACAO = NA_FILA_GESTAO) e `NTF_GESTAO` (01/11/2026: cada aviso da gestão, uma linha por evento + item + pessoa, com a fila, o envio por canal, entregue, lido, aberto e resolvido).
