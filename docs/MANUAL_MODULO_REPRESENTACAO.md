# Manual do módulo Representação

Metrolabs · SGO+ · versão de 11/11/2026 (régua de prazos do chamado da representada: estudar e agendar, relatório, peça, avaliação e pedido de mais prazo; imagens e vídeos do pedido e do chamado) · equipe da Metrolabs

## 1. Para que serve

O módulo Representação é a área do SGO+ em que a empresa representada (Brasmedical) aciona a Metrolabs para atendimento técnico aos clientes finais dos equipamentos dela e acompanha cada pedido até o encerramento. Do lado da Metrolabs, o mesmo módulo reúne a fila de pedidos, as conversas com a representada, o cadastro da representada e o catálogo de modelos. O pedido aceito vira chamado da Assistência técnica, com a marca da representada, e segue a triagem, a agenda, a O.S., o aplicativo do técnico e o relatório de sempre.

## 2. Como a representada entra

- A pessoa da representada entra pela entrada normal do SGO+, com o e-mail cadastrado e a senha, no perfil "Representada". Se esquecer a senha, usa "Esqueci minha senha" na tela de entrada (ou a Metrolabs envia o link em Administração > Usuários).
- A conta é criada em Administração > Usuários: perfil Representada, a representada (empresa) e o papel dela: administrador da representada, atendente, financeiro de garantia ou leitura.
- O perfil Representada vê só o módulo Representação. O servidor recusa qualquer outra função do SGO+ para essa sessão, e a conta não aparece nas listas de pessoas (responsáveis, avisos internos, bate-papo, conduta, ponto, atividades).
- Representada inativa (Representação > Representadas) ou conta sem representada: a pessoa não entra, e a mensagem diz o motivo.
- Contrato vencido (17/11/2026, Portal do cliente etapa 0): a data de fim da vigência da representada passa a valer, com a mesma carência do Portal do cliente (padrão 30 dias, em Portal do cliente > Contratos de clientes > Regras do portal). Passada a carência, a representada não entra e a mensagem diz quando o contrato terminou e o que fazer (renovar com a Metrolabs). Sem data de fim, vale só a situação, como antes. Antes de publicar, confira a data de fim de cada representada cadastrada.
- Não há troca da própria senha pela pessoa nesta etapa: a senha é definida e redefinida em Administração > Usuários, como para as demais contas.

## 3. Primeira configuração

1. Representação > Representadas > "Nova representada": nome, CNPJ, contrato, vigência, contato e prazos.
2. Prazos (padrão do estudo, configuráveis por representada): aceite do pedido em 240 minutos úteis (4 horas), prazo de atendimento do chamado (estudar o caso e agendar) em 1710 minutos úteis (3 dias úteis, decisão de 11/11/2026), relatório do atendimento em 2 dias úteis, avaliação depois da chegada da peça em 2 dias úteis (régua de prazos, seção 6.3), alerta ao responsável a 75% do prazo, chamado sem registro em 3 dias úteis. A tela mostra o que o número quer dizer ("= 3 dias úteis"); um dia de expediente tem 570 minutos.
3. Opções: consulta de CNPJ na base pública da Receita ao cadastrar cliente (ligada no padrão) e cancelamento pela representada antes da visita, com motivo (ligado no padrão).
4. Catálogo de modelos: a própria representada cadastra os modelos dela (seção 10.1). A Metrolabs também pode incluir em Representação > Catálogo de modelos (código, nome, tipo de equipamento, família, garantia em meses e, se houver, o padrão do número de série).
5. Assistência técnica > Regras da assistência > Representação: marque quem responde pela conta da representada. Sem ninguém marcado, vale quem faz a triagem.
6. Administração > Usuários: crie as contas da representada.

## 4. Painel: o que cada perfil vê e como cada número é contado

O Painel é a primeira aba do módulo, para a Metrolabs e para a representada, e a primeira parte de Assistência técnica > Meus chamados, para todo cliente do portal. Usa os mesmos componentes do resto do SGO+: os cartões de índice, o Kanban e o Gantt da agenda única de atividades (Atividades da equipe), com a mesma régua de dias e semanas. Uma chamada ao servidor por tela; o servidor já manda só o que o perfil pode ver. A tela não se atualiza sozinha: o botão "Atualizar" fica no alto.

### 4.1 Regras comuns de tempo

- Horas úteis pelo expediente da Metrolabs (Atividades da equipe > Avisos e horários: dias e horário de trabalho; padrão segunda a sexta, 8h às 17h30). Um "dia útil" nos textos é um dia inteiro desse expediente.
- "Tempo até X" conta do envio do pedido pela representada e desconta o tempo em que o pedido esperou o complemento pedido à representada.
- Período escolhido (30, 90, 180 ou 365 dias corridos até hoje): aceite entra pelo dia do aceite, visita pelo dia da chegada do técnico, conclusão pelo dia da conclusão; distribuições (cliente, UF, garantia, reincidência) pelo dia do envio. Abertos, fila, em risco, vencidos e pendências são sempre de agora.
- Situação do prazo (cor da borda do cartão e da barra): prazo de aceite enquanto o pedido não é aceito (Rep_prazoAceite_); prazo de atendimento do chamado depois do aceite (prioridade e contrato, Regras da assistência; pausa só quando o contrato permite). No prazo (azul), em risco (amarelo: aceite a 75% do prazo; atendimento com 25% ou menos do prazo restante), vencido (vermelho), pausado ou sem prazo (cinza), concluído no prazo (verde), concluído fora do prazo (marrom).
- Etapas fechadas: Recusado, Concluído, Encerrado e Cancelado. Concluído é o chamado resolvido remotamente ou com a documentação da O.S. pendente; Encerrado é o chamado encerrado na Assistência.

### 4.2 Representada (Brasmedical)

| Índice | Fórmula |
|---|---|
| Pedidos e chamados abertos | Pedidos e chamados da representada fora das etapas fechadas, agora. |
| Aguardando a Metrolabs | Abertos que dependem da Metrolabs: pedido enviado ou com o complemento respondido, chamado em análise, peça, visita ou atendimento. Mostra junto quantos estão com o prazo vencido ou em risco. |
| Aguardando a sua empresa | Pedidos com complemento pedido (o prazo de aceite fica pausado). |
| Aguardando o cliente final | Chamados aguardando a aprovação do orçamento ou o retorno do cliente. |
| Aceitos no prazo | Pedidos aceitos no período cujo tempo até o aceite (horas úteis, descontada a espera do complemento) ficou até o prazo da representada (padrão 4 h úteis) ÷ pedidos aceitos no período. |
| Tempo médio até o aceite | Média, nos aceitos do período, do envio ao aceite em horas úteis, descontada a espera do complemento. |
| Tempo médio até a visita | Média, nas visitas do período, do envio do pedido à chegada do técnico no local (registrada pelo aplicativo), em horas úteis, descontada a espera do complemento. |
| Tempo médio até a conclusão | Média, nos concluídos do período, do envio do pedido à conclusão do atendimento (execução concluída; sem ela, o encerramento), em horas úteis, descontada a espera do complemento. |
| Por etapa | Abertos agora e fechados no período, por etapa. |
| Por prioridade | Abertos agora. Pedido ainda não aceito conta pela prioridade prevista: P2 com o equipamento parado, P3 nos demais. |
| Por cliente e por UF | Pedidos enviados no período (UF da unidade do cliente). |
| Garantia | Pedidos enviados no período (recusados e cancelados antes do aceite não contam), pela garantia do cadastro do equipamento: em garantia, fora de garantia ou não comprovada (sem nota fiscal e sem data de instalação). Não é o enquadramento pretendido no pedido. |
| Reincidência | Chamados do período cujo equipamento teve outro chamado (não cancelado) até 90 dias antes ÷ chamados do período; por modelo e por equipamento. |
| Pendências da sua empresa | Cada complemento pedido, com a pergunta, a data e há quanto tempo espera (horas úteis). Não há prazo contratual para a resposta. |

- Kanban: uma coluna por etapa da representada (Enviado, Complemento pedido, Recusado, Aceito em análise, Aguardando aprovação de orçamento, Aguardando peça, Visita a agendar ou agendada, Em atendimento, Impedimento, Concluído, Encerrado, Cancelado). Colunas fechadas mostram os últimos 30 dias. A representada não arrasta cartão: a etapa muda pelo atendimento. Ela age só nos cartões que dependem dela ("Depende de você": responder o complemento). Toque no cartão abre a ficha.
- Gantt da carteira: uma barra por pedido ou chamado, do envio até a conclusão (ou até hoje); janela de 2 semanas a 180 dias; por chamado ou por cliente. Tracejado: fim do prazo; vermelho: tempo depois do prazo; losango vazado: visita agendada; losango cheio: chegada do técnico; linha azul: hoje.
- Gantt do chamado (ficha, "Marcos"): pedido enviado; aceite (previsto: envio + prazo de aceite, mais a espera do complemento; realizado: aceite); visita (previsto: data agendada; realizado: chegada do técnico); conclusão (previsto: fim do prazo de atendimento; realizado: conclusão). Mostra se ficou no previsto, depois do previsto ou atrasado.
- Nunca vê: outras representadas e os clientes delas, notas internas, valores, primeiro contato interno, fila e carga da Metrolabs, técnico antes de a visita ser agendada.

### 4.3 Metrolabs (aba Painel do módulo; filtro por representada)

| Índice | Fórmula |
|---|---|
| Pedidos na fila | Pedidos de representadas enviados ou com complemento pedido, ainda não aceitos nem recusados, agora. Mostra quantos com o prazo de aceite vencido. |
| Aceite no prazo | Igual ao da representada, somando todas as representadas do filtro. |
| Primeiro contato no prazo | Chamados cujo primeiro registro da Metrolabs depois do aceite (triagem assumida, triagem iniciada ou mensagem à representada no pedido ou no chamado; nota interna não conta) aconteceu no período e ficou até o prazo de primeiro contato da representada (padrão 8 h úteis) ÷ chamados com primeiro registro no período. Também mostra os aceitos ainda sem nenhum registro. |
| Prazo vencido agora / em risco | Abertos com o prazo valendo (aceite ou atendimento) vencido ou em risco. |
| Abertos e com quem estão | Como na representada: com a Metrolabs, com a representada, com o cliente. |
| Tempo médio até a visita e até a conclusão | Como na representada. |
| Reincidência | Como na representada. |
| Prazo de atendimento por prioridade | Por P1 a P4: chamados atendidos no período (com a situação do prazo de atendimento já decidida), % no prazo, média do envio até a visita, abertos e vencidos agora. |
| Fila de pedidos | Cada pedido da fila com a representada, o cliente, a idade em horas úteis (sem a espera do complemento) e o prazo de aceite; ordenada pelo prazo. |
| Carga por técnico | Chamados de representadas abertos agora por técnico: abertos, com visita agendada, em risco e vencidos. |
| Por representada | Abertos, na fila, vencidos, enviados no período e aceite no prazo. |

- O Painel considera só os chamados que a pessoa pode abrir na Assistência técnica (gestão: todos; técnico: os dele e os da fila livre da triagem). A fila de pedidos é igual para todos.
- Kanban de leitura: as etapas mudam pelas regras do atendimento da Assistência (as transições permitidas de cada situação), por isso o cartão não se arrasta. O pedido abre no próprio módulo (aceitar, pedir complemento, recusar); o chamado abre na ficha da Assistência técnica, onde ficam a triagem, a agenda e a O.S.
- Gantt da carteira por chamado, cliente, técnico ou representada. A agenda de cada técnico com as O.S. fica na agenda única (Atividades da equipe), com botão de atalho no Gantt.
- Na Assistência técnica, o filtro "Representação" da lista de chamados continua separando os chamados de representadas.

### 4.4 Cliente final (Assistência técnica > Meus chamados, todo cliente do portal)

| Índice | Fórmula |
|---|---|
| Abertos | Chamados do cliente nas etapas Recebido, Em análise, Visita agendada e Em atendimento, mais os pedidos que a equipe técnica ainda está conferindo. Mostra quantos em análise e com visita agendada. |
| Em atendimento agora | Chamados na etapa Em atendimento (técnico no local, execução, pausa ou documentação). |
| Próxima visita | A visita agendada mais próxima a partir de agora, com o chamado e o equipamento. |
| Concluídos (90 dias) | Chamados na etapa Concluído com a conclusão nos últimos 90 dias. Tempo médio: da abertura do chamado à conclusão, em horas úteis. |

- Kanban das 5 etapas do portal (Recebido, Em análise, Visita agendada, Em atendimento, Concluído; concluídos dos últimos 30 dias) e Gantt dos chamados dele (cor pela etapa, losango na visita agendada). Toque no cartão ou na barra leva ao chamado em "Lista e relatórios", onde ficam o relatório e o histórico de sempre. Orçamentos a responder continuam no alto.
- Nunca vê: chamados de outros clientes, prazo interno, técnico, valores internos, nada da conversa entre a Metrolabs e a representada, notas internas.

## 5. Pedidos

- A aba "Pedidos" mostra a fila: representada, cliente, cidade, equipamento e o prazo de aceite (verde em dia, amarelo em risco, vermelho vencido, cinza pausado).
- Aceitar: escolha a prioridade (sem escolha, P2 para equipamento parado e P3 para os demais) e, se souber, o tipo de serviço. Vira chamado CH-AAAA-NNNN com a representada, o protocolo dela e o enquadramento pretendido. A representada recebe e-mail.
- Pedir complemento: o pedido volta para a representada com a pergunta e o prazo de aceite fica pausado até a resposta.
- Recusar com motivo: a representada vê o motivo e recebe e-mail.
- Os mesmos botões aparecem em Assistência técnica > Solicitações dos clientes, com o selo roxo da representada.

### 5.1 Abrir em nome da representada (03/11/2026)

Para quando a representada pede o atendimento por telefone, e-mail ou WhatsApp.

- **Quem pode:** só quem está na lista "Quem pode abrir pedido em nome da representada". A lista começa vazia e só o Administrador muda, em Representação > Representadas (caixa no fim da aba). O sistema mostra como sugestão a conta de matheus.godoi@metrolabs.com.br, mas nunca marca sozinho. Conta inativa ou excluída deixa de valer sozinha. Quem não está na lista não vê o botão e o servidor recusa. Cada mudança da lista fica na auditoria (quem entrou e quem saiu).
- **Como:** Pedidos > "Abrir em nome da representada". Escolha a representada, por onde ela pediu (telefone, e-mail ou WhatsApp), o nome e o contato de quem pediu (obrigatórios). Depois, o mesmo caminho da representada: cliente pelo CNPJ ou CPF completo, equipamento pela série exata (no escopo da representada escolhida; a busca feita para uma não vale para outra) e o mesmo relato. Não achou o cliente, a unidade ou o equipamento: cadastre em Cadastros e busque de novo. As fotos são opcionais.
- **Como nasce:** igual ao pedido da representada: fila de Pedidos, prazo de aceite, avisos de pedido novo e de prazo. Fica gravado "Aberto pela Metrolabs (nome) a pedido de Fulano (representada), por telefone" no pedido, na linha do tempo (visível para a representada) e no registro de ações. A representada recebe e-mail: os administradores dela e, quando o contato de quem pediu é o e-mail de uma conta da representada, essa conta também (os avisos seguintes do pedido vão para elas). A pessoa da Metrolabs que abriu fica gravada à parte e nunca recebe os avisos destinados à representada. Sem administrador ativo, vão os atendentes ativos da representada; sem ninguém, a resposta avisa que nenhum e-mail saiu e pede para cadastrar a conta (perfil Representada, papel Administrador da representada ou Atendente).

## 6. Alertas de prazo

| Marco | Quem recebe | Onde |
|---|---|---|
| Pedido novo | Responsável pela representação (sem ninguém, quem faz a triagem) | Aviso na Assistência, aviso com ciência em Avisos, WhatsApp do sistema e e-mail na hora (RP01; RP02 se o equipamento está parado) |
| Pedido novo, complemento respondido e 75% do prazo | Gestão da área Técnica, quem faz a triagem e o responsável pela representação | Aviso no canto da tela, com som, em qualquer tela do SGO+ (seção 6.1) |
| 75% do prazo de aceite | Responsável pela representação | Central de pendências, aviso com ciência em Avisos, WhatsApp do sistema e e-mail uma vez (RP07) |
| Prazo de aceite vencido | Responsável e gestão da área Técnica | Central de pendências, Caixa de decisões e e-mail uma vez (RP07) |
| Chamado sem registro em 3 dias úteis | Responsável pela representação | Central de pendências, Caixa de decisões e e-mail uma vez por período parado (RP08) |

O tempo com complemento pedido não conta. Os avisos seguem a Matriz de avisos (Administração > Matriz de avisos, módulo Representação). Pedido aceito, recusado ou cancelado não gera aviso novo.

### 6.1 Aviso na tela (pop-up e som), 03/11/2026

- Quem recebe: a gestão da Assistência técnica (Administrador, Diretoria, Gestor da área Técnica e responsáveis da área Técnica na Caixa de decisões), quem faz a triagem (Regras da assistência > Triagem) e quem responde pela representação (Regras da assistência > Representação). Os demais não recebem.
- Em qualquer tela do SGO+, com a aba visível, o sistema confere a cada 45 segundos só a lista curta dos pedidos na fila. Não recarrega a tela e não mexe no que está sendo digitado: o aviso aparece no canto.
- Três avisos por pedido: pedido novo; complemento respondido pela representada; pedido que chegou a 75% do prazo de aceite sem aceite (com o prazo vencido, o mesmo aviso diz "vencido"). Cada um mostra o número, a representada, o cliente, o equipamento e quanto falta, em horas úteis, para o prazo de aceite.
- "Abrir pedido" abre o pedido em Representação > Pedidos. "Dispensar" tira o aviso só para quem dispensou, em qualquer computador; dispensar o de 75% tira também o de pedido novo. O pedido continua na fila até ser tratado. Pedido aceito, recusado ou cancelado sai do canto da tela de todos.
- O aviso fica numa caixa própria, no alto e à direita (a do Auvo e da Frota fica embaixo); no celular, no máximo 2 de cada vez e o botão "mais N". Sem conexão ou com a sessão vencida, o SGO+ tenta de novo em 2 e depois 5 minutos e volta a cada 45 segundos quando dá certo (também ao voltar para a aba). Quem não recebe pergunta de novo a cada 5 minutos: quem passa a responder pela representação começa a receber sem recarregar a página.
- Som: dois bipes curtos, sem arquivo. O navegador só toca som depois de um clique na página; enquanto isso, o aviso aparece com "Clique para ativar o som". O botão "Som" liga ou desliga neste navegador.

### 6.2 Aviso com ciência, WhatsApp e e-mail, 03/11/2026

| O quê | Regra |
|---|---|
| Quem recebe | Quem responde pela representação (Regras da assistência > Representação); sem ninguém marcado, quem faz a triagem. Vale também para quem não é da gestão. |
| Aviso com ciência | Em Avisos (menu Principal), com a janela ao entrar no SGO+, até "Li e estou ciente". Um ao entrar o pedido e outro (urgente) a 75% do prazo de aceite. Publicado por "SGO+ (Representação)". |
| Pedido tratado | Aceito, recusado ou cancelado: o aviso com ciência que ainda não foi lido é arquivado (não cobra mais) e o arquivamento diz o porquê. |
| WhatsApp | Número do sistema, modelo sgo_gestao_acao (o mesmo dos avisos da gestão), com o link que abre o pedido depois do login. Sai na hora, sem esperar o agrupamento de 30 minutos. Enquanto o modelo não estiver aprovado na Meta, sai só o e-mail, com a marca "WhatsApp aguardando modelo". |
| Horário | Só no expediente e em dia útil, para todos (também para a Diretoria). O que nasce fora dele sai na abertura do próximo expediente. |
| Sem repetir | Um por pedido, por marco (pedido novo, 75%, vencido) e por pessoa. O WhatsApp que ainda espera o expediente não sai se o pedido foi tratado antes. |
| Teto | No máximo 10 WhatsApp de pedidos por pessoa por dia. Passou disso, o aviso vai por e-mail e fica no sistema; a linha mostra "Teto do dia: só e-mail". |
| E-mail | Sai junto com o WhatsApp. |
| Onde conferir | Administração > Matriz de avisos > Avisos da gestão: cada aviso, a pessoa, os canais e o motivo. |

### 6.3 Régua de prazos do chamado da representada (11/11/2026)

Decisão do dono (11/11/2026): o chamado da representada não tem um prazo único. Ele anda por etapas, cada uma com quem responde e até quando. Os prazos ficam na tela da representada (Representação > Representadas) e valem em dias úteis do expediente da Metrolabs. O tempo com o cliente final (aguardando orçamento ou o cliente) não conta nas etapas da Metrolabs.

| Etapa | Quem responde | Começa | Termina (cumprida) | Prazo padrão |
|---|---|---|---|---|
| 1. Estudar o caso e agendar o atendimento | Metrolabs | Abertura do chamado (aceite do pedido) | Chamado vai para "Agendado" (ou o estudo conclui que precisa de peça, ou o chamado é resolvido) | 3 dias úteis (prazo de atendimento do chamado) |
| 2. Relatório do atendimento | Metrolabs | Cada atendimento realizado (o técnico saiu do local: execução concluída, falta de peça, voltar outro dia) | Relatório do atendimento na versão da representada gerado pela Metrolabs | 2 dias úteis |
| 3. Previsão de chegada da peça | Representada | Chamado vai para "Aguardando peça" | A representada informa a data prevista no portal (ou a Metrolabs registra em nome dela) | Sem prazo da Metrolabs: pendência da representada, prazo da Metrolabs pausado |
| 3. Chegada da peça | Representada | Previsão informada | Chegada registrada pela Metrolabs (ou conferida pelo Compras, ou "Liberar para agendar") | A data prevista informada pela representada |
| 4. Avaliação depois da chegada da peça | Metrolabs | Chegada da peça (ou peça dispensada, quando o chamado volta à triagem: "Reavaliação") | Novo atendimento realizado, chamado concluído ou "Registrar a avaliação (próximo passo)" | 2 dias úteis |
| 5. Pedido de mais prazo | Metrolabs pede, representada responde | Qualquer etapa da Metrolabs em aberto, com motivo e nova data | Aceito: vale a nova data. Recusado (com motivo): segue o prazo vigente | Repetível, um pedido por vez em cada etapa |

**Onde aparece.** Na ficha do chamado (Assistência técnica > chamado > parte "Representação" > "Régua de prazos") e na ficha da representada (Representação > Chamados): a etapa de agora, com quem está, o prazo vigente e o que falta, e a lista das etapas com início, prazo vigente, conclusão e situação, mais os pedidos de mais prazo. Nos cartões do Kanban e no Gantt dos dois lados ("Régua: etapa · até ..."), no relatório A4 do atendimento (seção "Régua de prazos", versões da representada e interna; o cliente final não lê) e na lista de chamados da representada.

**Ações da Metrolabs** (gestão da área Técnica e quem responde pela representação): "Pedir mais prazo" (etapa, nova data, hora opcional, motivo); "Registrar a chegada da peça" (data e hora; o chamado que espera a peça volta para "Planejado"); "Registrar a avaliação (próximo passo)"; "Registrar a previsão informada por outro canal" (quem informou e por onde).

**Ações da representada** (administrador e atendentes): "Informar a previsão" da peça (para mudar a data depois, com o motivo); "Aceitar o novo prazo" ou "Recusar" com o motivo. Leitura e Financeiro de garantia só consultam.

**Prazo do chamado na Assistência.** O selo de prazo, os contadores e a central de pendências da Assistência seguem a etapa da Metrolabs que vale agora; com a pendência na representada, o prazo fica "pausado". No fim, o chamado fica "cumprido" se todas as etapas da Metrolabs fecharam no prazo vigente (com as prorrogações aceitas); senão, "fora do prazo". Os chamados que não são de representada não mudam. Chamado comum ligado depois à representada mantém o prazo com que nasceu.

| Aviso | Quem recebe | Quando |
|---|---|---|
| RP09 | Representada (administrador; sem ele, os atendentes) | Chamado entrou em "Aguardando peça": informar a previsão; lembrete depois de 1 dia útil sem previsão |
| RP10 | Representada | Pedido de mais prazo; lembrete depois de 1 dia útil sem resposta |
| RP11 | Responsável pela representação, quem pediu o prazo e o técnico do chamado | A representada informou a previsão ou respondeu o pedido de mais prazo |
| RP12 | Responsável pela representação; vencida, também a gestão da área Técnica | Etapa da Metrolabs a 75% do prazo ou vencida (uma vez por etapa); representada sem previsão da peça há 1 dia útil |
| RP06 | Representada | Relatório do atendimento enviado, peça recebida, avaliação registrada, previsão registrada em nome dela |

A central de pendências lista também o chamado com a pendência na representada há 1 dia útil ou mais ("Com a representada").

**Chamados que já estavam abertos.** Passam para a régua sem ficar falsamente vencidos: as etapas são lidas do histórico do chamado. A etapa 1 conta até o agendamento registrado no histórico (o chamado já agendado ou em atendimento dentro dos 3 dias úteis aparece como cumprido; o registro antigo sem as mudanças de situação no histórico, já agendado, conta como cumprido sem a hora). As etapas seguintes começam quando o atendimento for realizado ou a peça for pedida.

## 7. Conversas

- Cada pedido e cada chamado tem conversa própria; cada representada tem um canal geral.
- A mensagem da Metrolabs vai por e-mail à representada (quem abriu o pedido e o administrador dela).
- "Nota interna" fica só com a equipe (amarela, tracejada). Nada é apagado.
- A mensagem da representada avisa o responsável pela representação e o técnico do chamado.

## 8. Na Assistência técnica

- Filtro "Representação" na lista de chamados e selo roxo com o nome da representada.
- Parte "Representação" na ficha do chamado: protocolo, enquadramento pretendido, relato completo (código de erro, risco, o que já foi tentado), contato no local, arquivos e número de mensagens.
- Linha do tempo com três públicos: interno (sem marca), representada e cliente final. O que é registrado para o cliente final aparece também para a representada.
- **Ligar à representada (03/11/2026):** chamado comum que a representada pediu (por exemplo, urgência atendida antes) é ligado a ela na ficha do chamado, botão "Ligar à representada" (mesma lista restrita do item 5.1). Pede a representada, o protocolo dela (se houver) e o motivo (pelo menos 10 letras). Depois de ligado, a representada vê e acompanha o chamado, com quem ligou, quando e o motivo, e recebe e-mail. Chamado que já é de uma representada não muda de representada. Se a escolha ficou errada, só o **Administrador desliga** (botão "Desligar da representada" na parte Representação da ficha, com motivo): a representada deixa de ver o chamado e tudo dele (documentos da versão dela, arquivos, mensagens, fotos liberadas só para ela e os registros da linha do tempo feitos para ela, que voltam a ser internos) e recebe o aviso; a próxima representada ligada não herda nada disso; depois, quem está na lista liga à representada certa. Chamado que nasceu de pedido da representada não é desligado (cancele com o motivo, se for o caso).

## Prazo de atendimento do chamado da representada (11/11/2026)

<!-- recuperado da base do assistente em produção (versão 0a0b5125a2fe) em 17/11/2026: texto publicado que não estava em docs/ -->
Decisão do dono: depois do aceite, a Metrolabs tem 3 dias úteis para estudar o caso e agendar o atendimento.

O chamado que nasce do pedido da representada grava como prazo de atendimento o prazo da representada (Representação > Representadas > "Prazo de atendimento do chamado", padrão 1710 minutos úteis = 3 dias úteis), com a fonte "Prazo da representada". O prazo da Assistência pela prioridade (P1 = 4 h úteis etc.) não vale para ele; a prioridade continua decidindo o prazo da triagem, que nunca passa do prazo de atendimento.

Trocar a prioridade na triagem mantém o prazo da representada.

Mudar o prazo na representada vale para os chamados aceitos dali em diante (e na troca de prioridade); os já abertos ficam com o prazo gravado.

Telas e documentos da Representação mostram o prazo em dias úteis quando ele é um número inteiro de dias de expediente ("3 dias úteis" em vez de "28 h 30 min úteis").

Como esse prazo é contado no chamado (etapa 1 da régua, até o atendimento agendado) e o que vem depois: seção 6.3.

## Imagens e vídeos do pedido e do chamado (11/11/2026)

<!-- recuperado da base do assistente em produção (versão 0a0b5125a2fe) em 17/11/2026: texto publicado que não estava em docs/ -->
A galeria "Imagens e vídeos" fica no pedido (Representação > Pedidos), na ficha do chamado da Assistência técnica (parte "Representação") e, para a representada, na ficha do pedido ou do chamado. No chamado, junta o que foi anexado no chamado e no pedido que o originou.

Miniatura da imagem e player do vídeo; toque para ver grande ou assistir, passar para a anterior ou a próxima e baixar. Vídeo MOV de iPhone pode não tocar no Windows: use Baixar.

Limites: imagens JPG, PNG ou WEBP, até 10 por envio, reduzidas no aparelho para até 2 MB (mais uma cópia reduzida para miniatura e relatório A4); vídeo MP4, MOV, WEBM ou 3GP, um por envio, até 100 MB; até 60 imagens e vídeos por pedido ou chamado.

Por que o vídeo tem rota própria: pelo canal comum das telas ele ia em texto (base64) e, no servidor, virava uma lista de números de cerca de 40 vezes o tamanho do arquivo; 25 MB já chegavam ao limite de memória e o vídeo de 50 MB derrubava o processo. Agora o vídeo sobe direto para o disco (com barra de progresso) e o sistema só confere e registra. No Novo pedido, o vídeo sobe logo depois do pedido.

Quem anexa: a representada (administrador, atendente e financeiro de garantia; Leitura só consulta) nos pedidos e chamados dela, e a equipe da Metrolabs que vê o chamado. A Metrolabs pode marcar "Só para a Metrolabs" (a representada não vê). Pedido recusado ou cancelado e chamado encerrado ou cancelado não recebem anexo da representada; num pedido aceito, o envio vai para o chamado.

Avisos: a representada anexou, o responsável pela representação e o técnico do chamado recebem (RP05); a Metrolabs anexou sem a marca, a representada recebe por e-mail (RP06). A linha do tempo registra cada envio.

Retirar: quem enviou (ou o administrador da representada, nas da empresa dele; na Metrolabs, quem administra a representação) retira com motivo. O registro e o arquivo ficam guardados; a representada deixa de abrir o arquivo.

Relatórios A4: as imagens da galeria entram nas fotos do relatório do atendimento (versão interna: todas; versão da representada: só as que ela vê; versão do cliente: nenhuma). Os vídeos aparecem na lista de documentos do atendimento.

## 9. O que a representada vê e o que nunca vê

- Vê: os pedidos e chamados da empresa dela, a etapa (Enviado, Complemento pedido, Recusado, Aceito em análise, Aguardando aprovação de orçamento, Aguardando peça, Visita a agendar ou agendada, Em atendimento, Concluído, Encerrado, Cancelado), a data e o técnico da visita, a linha do tempo pública, os arquivos que ela enviou, a conversa e os equipamentos dos pedidos dela e os que ela cadastrou.
- Busca cliente só pelo CNPJ ou CPF completo e equipamento só pela série exata, com limite de 20 buscas em 15 minutos (contando achou e não achou). Série cadastrada em outro cliente: a tela pede para falar com a Metrolabs, sem dizer qual cliente.
- Vê também o Painel da empresa dela (índices, Kanban e Gantt; seção 4.2).
- Vê e gera os relatórios A4 da versão dela (atendimento e período; seção 12) e abre só esses documentos.
- Nunca vê: outros clientes, outras representadas, notas internas, valores, registros internos do chamado, fotos não liberadas, primeiro contato, fila e carga da Metrolabs, as versões interna e do cliente dos relatórios, o restante do SGO+.

## 10. Cadastros feitos pela representada

- Cliente completo (CNPJ ou CPF válido, endereço em partes, contato com e-mail e telefone) com "Ciente"; unidade com cidade e UF.
- Equipamento com modelo do catálogo, série, data de instalação, nota fiscal de venda (número, data e arquivo), revenda, setor, patrimônio e foto da etiqueta. Garantia calculada no cadastro: data da instalação (ou da nota) mais os meses do modelo; a data fim da garantia fica gravada no equipamento.
- Modelos do catálogo da representada (seção 10.1).
- Tudo fica com a origem "REPRESENTADA", quem cadastrou e o "Ciente" com data e hora, e entra em Cadastros > Correções de cadastro e no histórico dos cadastros.

### 10.1 Catálogo de modelos da representada (03/11/2026)

- Quem cadastra: o Administrador da representada e o Atendente (os papéis que abrem pedido). Financeiro de garantia e Leitura só consultam.
- Na abertura do pedido: o modelo que não está na lista é cadastrado ali mesmo ("Cadastrar modelo novo", logo abaixo do campo Modelo): código, nome, tipo de equipamento, família (opcional), garantia em meses (0 a 120) e padrão da série (opcional). O que já foi digitado continua no formulário e o modelo novo já fica escolhido.
- Na aba "Catálogo de modelos" do lado dela: lista com quem cadastrou, uso em equipamentos e histórico; "Cadastrar modelo novo", "Alterar", "Excluir" (ou "Inativar") e "Reativar".
- Código único na representada, contando os inativos. Duas representadas podem usar o mesmo código. O código não muda depois que algum equipamento usa o modelo.
- Excluir: sem nenhum equipamento com o modelo, ele sai do catálogo e passa para "Excluídos do catálogo" (no fim da tela, com quem excluiu, quando e o histórico). Com equipamento, vira INATIVO: some da lista de escolha do pedido, mas o histórico e a garantia dos equipamentos continuam. Inativo pode ser reativado.
- Garantia: mudar a garantia vale para os equipamentos cadastrados depois. Os já cadastrados mantêm a garantia gravada no cadastro deles; nada é recalculado.
- Histórico de cada modelo: quem cadastrou, alterou, inativou, reativou ou excluiu, de que lado (representada ou Metrolabs), quando, o antes e o depois de cada campo e o motivo. A Metrolabs vê "cadastrado por Fulano (Brasmedical)"; a representada vê "Fulano (Metrolabs)" nas alterações da Metrolabs.
- A Metrolabs continua alterando pelo lado interno (Representação > Catálogo de modelos > "Alterar"), com o motivo obrigatório; modelo novo não pede motivo.
- A representada só vê e altera os modelos da empresa dela; modelo de outra representada recebe a mesma resposta de "não encontrado".

## 11. Registro de ações

A aba "Registro de ações" mostra buscas, cadastros (também de modelos: cadastro, alteração, exclusão, inativação e reativação), pedidos e cancelamentos das representadas, com nome, data e hora. O administrador da representada vê o da própria equipe.

## 12. Documentos A4: relatório do atendimento e relatório do período

Um motor só (SGO_Representacao_Documentos.js) sobre a moldura A4 dos relatórios do SGO+ (capa com a logo, sumário com o número das páginas, seções, tabelas e figuras numeradas, cabeçalho e rodapé corridos). Três versões, uma por público; o servidor filtra antes de montar o documento, e cada versão só recebe o que o público dela pode ler.

### 12.1 Relatório do atendimento (um chamado)

O documento segue o caminho do atendimento, igual nas três versões (03/11/2026, caso CH-2026-0008):

- **A distância** (resolvido remotamente): só a seção "Orientação a distância" (o que foi orientado, por quem, quando); sem visita,
  sem tempo no local, sem serviço, peças nem assinaturas. O texto da orientação sai também nas versões do cliente e da representada,
  sem o enquadramento comercial; em chamado resolvido antes de 03/11/2026 (publicação) a seção diz só "Resolvido com orientação a
  distância" fora da versão da Metrolabs.
- **Logística** (entrega, retirada, envio): a seção da visita vira "Entrega" (ou "Retirada", "Envio") e o serviço vira o termo
  (itens, quantidade, identificação, estado, de quem ou para quem, motivo e destino), com as assinaturas "Recebido por" e "Entregue
  por (Metrolabs)". Já realizada sem O.S.: o registro (quem recebeu, quando; o nome do arquivo do comprovante só na versão da
  Metrolabs, fora dela "Comprovante anexado"). Na logística, "Em análise" quer dizer conferência da solicitação e programação.
- **Conserto**: como antes (visita, serviço, peças, assinaturas do cliente e do técnico).
- Fora de conserto o texto da abertura é "Solicitação" (não "Problema relatado") e a "Situação do equipamento" não aparece.
- As etapas do cliente mostram só as que aconteceram, cada uma com a data ("Resolvido a distância", "Entrega agendada", "Em
  entrega" quando for o caso); o glossário traz só essas etapas. Marco que não aconteceu num atendimento encerrado não aparece.
- Um logo só (o da capa). Série e TAG só nos campos próprios; campo vazio ou "N/S" some.

| Parte | Representada | Cliente final | Metrolabs (interno) |
|---|---|---|---|
| Capa com o quadro "Situação em" (o essencial na primeira folha) | Situação, prazo de atendimento, aceite do pedido, visita, conclusão, com quem está, próximo passo | Situação, visita, conclusão, próximo passo | Como a representada, com a situação interna entre parênteses |
| Sumário e resumo | Tempos do envio à visita e à conclusão, marcos no previsto ("x de y"), situação do prazo; problema, causa, serviço e próximo passo | Aberto em, visita, concluído em, tempo no local; problema, causa, serviço e próximo passo | Como a representada |
| Cliente e equipamento | Com garantia, fabricante, instalação e nota fiscal; nome e protocolo da representada | Sem garantia e sem fabricante; sem o nome da representada | Como a representada |
| Relato da abertura | Completo (código de erro, risco, o que já foi tentado, contato no local, pedido, complemento) | Problema relatado e situação do equipamento | Completo |
| Etapas | — | As 5 etapas de "Meus chamados", com as datas | — |
| Linha do tempo (vertical: data quando muda o dia, hora, registro e quem fez; intervalo de 2 dias ou mais escrito) | Eventos PUBLICO = REPRESENTADA ou SIM; autor "Metrolabs" (o nome só quando é da própria representada) | Só PUBLICO = SIM; autor "Metrolabs" | Todos, com o nome; o interno sai com marcador vazado e a marca "interno" |
| Marcos previsto x realizado (aceite, visita, conclusão) | Sim, com gráfico e a diferença escrita em horas úteis (diferença só fora do expediente sai em tempo corrido, "fora do horário útil") | Não (prazos internos) | Sim |
| Visita e atendimento | O.S., técnico, agendado, chegada, conclusão, tempo no local | Igual (do técnico, só o nome) | Mais saída, deslocamento, conferência do equipamento e outras visitas |
| Diagnóstico e serviço | Condição, causa, serviço, teste, recomendações | Igual | Mais o relato do técnico e a orientação remota |
| Peças | Sem valor | Sem valor | Sem valor, com o pedido de compra da peça em falta |
| Fotos (duas por linha, mesmo quadro para todas; legenda com data e hora, quem tirou e o momento: abertura do pedido, antes da visita, durante a visita ou depois do serviço, pela hora da foto e a chegada e a conclusão da O.S.) | Liberadas (REPRESENTADA ou SIM) e as que ela enviou, separadas por origem | Só as liberadas ao cliente (SIM) | Todas, com a liberação de cada uma |
| Conversa do chamado | Sem nota interna | Não | Sem nota interna (as notas vão na parte própria) |
| Notas internas, Prazos e SLA (horas úteis, primeiro contato, pausa, triagem), Histórico do equipamento (reincidência em 90 dias) | Não | Não | Sim |
| Arquivos, relatório da O.S., assinatura e aceite (sem assinatura registrada, a seção diz o que falta) | Sim | Relatório da O.S. e assinatura | Sim, com quem lê cada arquivo |
| Sobre este documento: o que quer dizer cada etapa, emissão, revisão e marca de conferência | Etapas que a representada acompanha | Etapas de "Meus chamados" | Etapas que a representada acompanha |

Cadastro vazio (CNPJ, TAG, protocolo) ou que não informa nada ("N/S", traço) não aparece (03/11/2026; antes saía "Não informado"). O cabeçalho de cada folha traz o chamado e a versão ("Relatório do atendimento CH-... · versão da representada"), o nº e a revisão; o rodapé, "Página X de Y". Tabelas de identificação não se dividem entre folhas.

Nunca, em nenhuma versão: valores. Nunca nas externas: nota interna, foto não liberada, registro interno, outra representada.

### 12.2 Relatório do período

Mesmos índices do Painel, com as fórmulas da seção 4 (RepP_indices_ para representada e Metrolabs; para o cliente, as de "Meus chamados" com o período escolhido). Gráficos: por etapa, prazo cumprido (aceite, atendimento e, na interna, primeiro contato), tempos médios em horas úteis, por cliente, por UF, garantia e reincidência por modelo; para o cliente, por etapa, por mês, por equipamento e por unidade. Na capa, o quadro "Situação em": abertos agora com quantos têm prazo vencido e em risco, enviados, aceite e atendimento no prazo ("x de y"), tempo médio até a conclusão e os pontos de atenção pelo número (para o cliente: em aberto, abertos e concluídos no período, tempo médio e próxima visita). No resumo, os destaques: movimento, situação agora, prazo vencido e em risco por número, próximas visitas e reincidência. Tempos médios em barras com o mesmo texto do painel (h úteis ou dias úteis); prazo cumprido com "x de y no prazo". Gráfico por mês do cliente só com dois meses ou mais. Gantt da carteira em folha paisagem, na largura toda da folha (20 linhas por figura; o texto da barra é a etapa e, fora a versão do cliente, a situação do prazo, para ler também em preto e branco; rótulo de mês só aparece se couber antes do mês seguinte; o texto nunca encosta no losango da visita nem no fim do prazo). Lista dos pedidos e chamados do período (nº do pedido, cidade e série em linha menor; na interna, em folha paisagem junto do Gantt). "Como ler este relatório": definições dos índices e o que quer dizer cada etapa. Só na interna: prazo de atendimento por prioridade, carga por técnico, fila de pedidos e comparação entre representadas. Escopo: a representada só a carteira dela; o cliente só os chamados dele (inclusive os que não vieram de representada); a Metrolabs, os chamados que a pessoa pode ver, todas as representadas ou a escolhida no filtro.

### 12.3 Onde gerar

- 16/11/2026 (D8): no chamado de representada o botão livre virou "Ver prévia" (ficha do chamado, dos dois lados): a prévia do Dossiê do atendimento abre na tela e nada é gravado nem enviado. Os documentos que valem são o laudo de cada rodada e o Dossiê do atendimento (seção 12A.7.1).
- Representada: ficha do chamado > "Gerar relatório"; Painel > "Relatório do período"; Painel > aba "Relatórios gerados".
- Cliente: Meus chamados > "Lista e relatórios" > "Gerar relatório do atendimento" no chamado e "Relatório do período (últimos 90 dias)"; a lista "Relatórios gerados" fica logo abaixo.
- Metrolabs: ficha do chamado na Assistência técnica > "Relatórios do atendimento" (as três versões); Painel da Representação > "Versão do relatório" e "Relatório do período" (interna, ou a da representada escolhida no filtro).

### 12.4 Salvar, registrar e quem abre

- Todo documento é gravado em HTML e PDF (SGO_DocSalvar), privado, e registrado em REP_DOCUMENTOS com o tipo, o público, a representada, o cliente, o chamado, o número (RAT-aaaa-nnnn-M, -R ou -C; período RPM-, RPR- ou RPC- com data e hora), a emissão, quem gerou e de que lado. Nada é sobrescrito: cada emissão é uma versão nova, e a revisão do cabeçalho conta as emissões anteriores do mesmo chamado e público.
- Pastas: versão do cliente na pasta do equipamento (prontuário, "4. Ordens de Serviço") e no Arquivo de documentos do equipamento (tipo "RELATÓRIO DE ATENDIMENTO"); versão da representada em "Representação - Relatórios > (representada) > ano > chamado"; interna em "Representação - Relatórios > Metrolabs - uso interno > ano > chamado"; período do cliente na pasta do cliente em "Assistência técnica - Relatórios > Relatórios do período".
- Quem abre: a representada lista e abre só a versão dela da própria representada (a rota /arquivos confere a cada abertura, Representacao_arquivoPermitido_); o cliente lista e abre só a versão do cliente dos chamados dele (a rota /arquivos também confere, Representacao_arquivoClientePermitido_: documento da Representação de outro público ou de outro cliente é recusado, mesmo com o link); a equipe lista todas.
- A emissão entra no histórico do chamado (interno).

### 12.5 Fotos e liberação

- A foto do técnico (ATEC_FOTOS) só entra na versão externa depois de liberada na ficha do chamado, em "Quem vê nos relatórios": não liberada (padrão), só à representada, ou ao cliente e à representada. Libera a gestão da área Técnica e os responsáveis pela representação; a liberação fica no histórico da O.S. com quem e quando.
- Ao liberar, a tela gera uma cópia reduzida (lado maior 1000 px, JPEG) e o servidor a guarda na pasta privada da O.S.; o A4 usa essa cópia. Foto acima de 450 KB sem a cópia reduzida fica de fora do A4, com o aviso para liberar de novo. Até 12 fotos por documento.

## 12A. Processo do chamado da representada: do laudo ao dossiê (16/11/2026)

Decisões D1 a D13 do dono (output/representacao-fluxo-20261116/ESPEC_FLUXO_REPRESENTACAO.md) e o detalhamento da linha do tempo (ESPEC_LINHA_DO_TEMPO.md). Código: SGO_Representacao_Fluxo.js (processo) e SGO_Representacao_Marcos.js (marcos, peças, testes, mídia por marco, avisos por marco).

### 12A.1 O que mudou

O chamado da representada é um processo só, com o mesmo número CH (D12). Ele não encerra mais ao fechar a O.S.: a O.S. encerrada leva o chamado a "Laudo técnico em elaboração" e o e-mail ao hospital diz "Visita técnica concluída. O caso segue em análise; avisaremos o próximo passo." O processo só termina com quatro condições: a decisão da representada registrada (ou "não se aplica", com motivo), as ações concluídas, o equipamento de volta ao cliente (ou o destino final registrado com o termo) e as confirmações do cliente e da representada (ou o prazo delas vencido). O.S. só existe quando alguém vai a campo ou trabalha no equipamento; cada nova ida é uma O.S. nova no mesmo chamado.

Situações novas, só no chamado de representada: "Laudo técnico em elaboração", "Aguardando a decisão da representada" (o prazo da Metrolabs pausa) e "Concluído, aguardando confirmação". A representada lê "Em análise: laudo técnico em elaboração", "Laudo enviado: aguardando a sua decisão" e "Concluído: confirme o encerramento"; o hospital lê "Em análise", "Em análise pelo fabricante" e "Concluído: confirme o atendimento". A etapa "Concluído" da representada passou a se chamar "Atendimento realizado" (a visita terminou; o caso continua).

### 12A.2 Quadro "Processo do chamado"

Na ficha do chamado (Assistência técnica, parte Representação) e na ficha da representada o quadro se lê de cima para baixo, como um rastreio de encomenda:

- **Agora** (faixa no alto): a etapa em que o processo está, **Próximo passo com** (Metrolabs, representada, cliente ou transporte), o **Prazo** (data, dias úteis que faltam e o selo "no prazo", "em risco" ou "vencido"; a cor da faixa acompanha) e **Onde está o equipamento**. Quando há decisão pedida, a pergunta ao fabricante aparece em destaque. Logo abaixo ficam os botões da etapa (o principal em verde) e o formulário que o botão abre. Na Metrolabs, a linha "Como fazer nesta etapa" explica o que fazer.
- **Fases**: as seis bolinhas (Entrada, Diagnóstico, Decisão do fabricante, Peças, Reparo e testes, Devolução e encerramento): ✓ feita, número em destaque na atual, número claro nas que faltam.
- **Passo a passo**: um passo por linha, do pedido até agora, com data e hora, quem registrou, o resumo, as peças (código, rastreio, nota, lote), os testes ("6 de 8 aprovados", com os valores medidos ao abrir; reprovados em vermelho) e as **miniaturas das fotos e dos vídeos do passo** (toque para ver grande ou tocar o vídeo; "+N" abre as demais; "só Metrolabs" marca a mídia que a representada não vê). Rodadas aparecem como etiqueta ("2ª rodada de peças"). O último passo fica em destaque; os **próximos passos previstos** aparecem esmaecidos, com quem vai agir. Passo registrado depois (regularização) mostra a data do fato e "registrado em".
- Recolhidos, para consulta: "O que falta para encerrar" (a mesma lista que o servidor confere), as nove etapas, os documentos do processo e o **Histórico completo** (todos os registros do pedido, do chamado, das O.S. e da conversa, mais recente em cima, com "Ver como" Metrolabs, representada ou hospital).
- Ações decididas, decisões do fabricante, peças e testes ficam também em tabela, abaixo do passo a passo. Cada campo dos formulários tem a explicação logo abaixo.

A representada vê o mesmo quadro sem as notas internas, sem a mídia "só Metrolabs" e com os nomes dos passos escritos para ela (por exemplo, "Sua decisão é necessária"). O hospital, em "Meus chamados", vê a etapa em uma frase ("Agora: Em análise pelo fabricante"), sem o nome da representada.

### 12A.3 Laudo técnico (um por rodada)

"Preparar e enviar o laudo". Campos: testes realizados, defeito constatado, causa provável, recomendação técnica, peças necessárias, fotos e vídeos (pelo menos 1 foto e 1 vídeo já liberados à representada), a pergunta objetiva, o prazo para decidir (5 dias úteis; mudar pede motivo), a situação do equipamento enquanto aguarda e a pergunta de tecnovigilância (houve dano ou risco a paciente ou usuário? "Sim" avisa na hora a representada e a Diretoria). O laudo LTR-aaaa-nnnn-N sai nas versões da representada e interna. "Levar ao laudo" serve à análise só pelas fotos e pelo vídeo do pedido. "Registrar 'não se aplica'" (responsáveis pela representação) serve ao atendimento sem pedido de garantia.

### 12A.4 Decisão

Decidem o Administrador e o Financeiro de garantia da representada (D3); o Atendente acompanha. Resultados: garantia aprovada, aprovada em parte, negada, preciso de mais informação (abre a rodada seguinte do laudo) ou caso cancelado. Garantia negada com orçamento: a representada escolhe quem recebe o orçamento (D11). O hospital recebe o resultado em uma frase, sem o nome da representada (D5). Decisão recebida por e-mail ou telefone: só os responsáveis pela representação e o Administrador registram em nome dela, com o e-mail ou documento anexado (D4).

Prazo (D2): lembrete 1 dia útil antes; no vencimento, e-mail à representada e ao contato comercial dela; 3 dias úteis depois, a gestão Técnica (Caixa de decisões, pendência "Decisão da representada vencida"); 10 dias úteis depois, a Diretoria; depois disso, lembrete semanal. Nunca encerra sozinho.

### 12A.5 Execução, marcos, peças e testes

Cada ação decidida vira um item com responsável. Equipamento fora do cliente faz entrar sozinha "Devolver o equipamento ao cliente (entrega com termo)"; a devolução só conclui com o equipamento de volta. "Registrar passo" registra os marcos com ordem conferida: retirada (M12, com o termo ou "termo não colhido" com o motivo; a assinatura vai no termo de entrega), conferência de entrada (M13), bancada (M14 e M15), orientação do fabricante (M25), peças solicitadas, previsão, envio, conferência e divergência (M30 a M35), montagem (M40, M41), testes (M42; M43 reprovados com o próximo passo; M44 aprovados com o valor medido de cada item do roteiro, RDC 665/2022, art. 129), liberação técnica (M45) e pronto para devolução (M50), além das exceções (substituição, envio à fábrica, retorno, devolvido sem reparo, aguardando o cliente, dano ou risco, cobrança por telefone). Vídeo obrigatório (L6) na falha reproduzida em bancada, no teste reprovado e no ciclo completo aprovado. A 2ª reprovação de testes avisa a gestão Técnica (L7).

Fotos e vídeos: em qualquer passo, com legenda e quem vê (só a Metrolabs, também a representada, também o hospital); 60 por passo e 300 por chamado; o vídeo sobe pela galeria do chamado (até 100 MB, de preferência até 2 minutos).

### 12A.6 Onde está o equipamento

"Atualizar onde está o equipamento": no cliente, na oficina, no fabricante, em transporte ou destino final (substituído, baixado, devolvido ao fabricante), com desde quando e o documento. Sem termo, fica a pendência de anexar o comprovante. As O.S. de retirada, entrega e envio atualizam sozinhas.

### 12A.7 Confirmação e dossiê

Com tudo feito, o sistema pede as confirmações: cliente em 5 dias úteis (em "Meus chamados" ou registrada pela Metrolabs) e representada em 3 (D7). Sem resposta, vale "confirmado por prazo". "O problema continua" volta à triagem no mesmo chamado. Encerrado, saem uma vez os documentos finais (seção 12A.7.1). Nova emissão só como revisão com motivo. "Ver prévia do dossiê" mostra o documento como está agora, sem gravar, sem avisar e sem contar para a régua (D8).

#### 12A.7.1 Documentos finais: o dossiê e os documentos do hospital (16/11/2026)

Pedido do dono: um dossiê único, muito bem elaborado, para a Metrolabs e a representada; para o hospital, o resumo e os termos de retirada e de devolução.

**Dossiê do atendimento (DOS-aaaa-nnnn), Metrolabs e representada.** O mesmo documento A4 (HTML e PDF) para os dois. Capa com o número do chamado, o equipamento (modelo, série, patrimônio ou TAG), cliente e unidade, representada e protocolo, período e situação final; sumário com as páginas; e as seções: 1. Resumo executivo (o que aconteceu, o que foi constatado, a decisão do fabricante, o que foi feito, testes e liberação, situação final, com os tempos: do pedido ao encerramento, equipamento fora do hospital, espera pelo fabricante e testes aprovados); 2. Identificação do serviço (RDC 665/2022, art. 129); 3. Linha do tempo pela data do fato, por fase, com quem fez, a rodada ("2ª rodada de peças", "2ª bateria de testes"), "registrado em" quando foi registrado depois e o número de fotos de cada passo; 4. Diagnóstico e laudos (visita, bancada, laudo de cada rodada com testes, defeito, causa, recomendação, pergunta e a resposta de tecnovigilância); 5. Decisões do fabricante (pergunta, prazo, quem decidiu e por onde, protocolo, o que fazer, fundamentação e a evidência anexada); 6. Peças (pedido, envio com NF e rastreio, recebimento, conferência, série ou lote da nova, destino da peça retirada, divergências); 7. Reparo; 8. Testes (cada bateria, inclusive as reprovadas, com método, instrumento e certificado, critério, valor encontrado e resultado, e a liberação técnica); 9. Evidências fotográficas por fase, com legenda, data, autor e os 8 primeiros caracteres do SHA-256 (até 40 fotos; vídeos com QR code e o endereço no SGO+, que abre com login); 10. Logística e guarda (retirada e termo, conferência de entrada, entrega e termo, período com a Metrolabs, histórico da guarda); 11. Confirmações e assinaturas (com a assinatura do termo de entrega colhida no aparelho); 12. Conclusão técnica, com o responsável técnico; 13. Anotações internas da Metrolabs (só na versão da Metrolabs: notas internas, cobranças, orçamentos e valores, pendências, regularização); 14. Documentos relacionados; 15. Controle e rastreabilidade (número, versão, motivo da revisão, quem emitiu, quando e o **código de verificação**, resumo SHA-256 do conteúdo, gravado no registro do documento). A versão da representada é o mesmo documento sem a seção 13 e sem nomes de colaboradores além do técnico executor e do responsável técnico; fotos e vídeos, só os liberados a ela.

**Hospital (RSV-aaaa-nnnn): Resumo do serviço e termos.** Um documento em três partes, cada uma começando em folha nova: o Resumo do serviço em uma página (problema relatado, o que foi feito, a tabela dos testes que liberaram o equipamento com o valor medido, a liberação técnica e as recomendações); o Termo de retirada (data e hora, local, quem retirou e quem entregou, equipamento, acessórios, estado aparente, conferência na chegada e as assinaturas); e o Termo de entrega (data e hora, quem entregou e quem recebeu, situação do equipamento, período com a Metrolabs, itens, conferência e testes no local, declaração e assinaturas colhidas no aparelho). Vai ao hospital por e-mail com o PDF (L9) e fica em "Meus chamados > Relatórios gerados" como "Resumo do serviço e termos". Nunca leva o nome da representada nem das pessoas dela, nem assunto comercial: frases com garantia, protocolo, nota fiscal, rastreio, orçamento ou valores ficam de fora.

**Retirada sem termo (registrada depois, como no CH-2026-0030).** O documento do hospital não finge assinatura: a parte da retirada sai como "Registro de retirada (sem assinatura)", sem linhas de assinatura, dizendo que o termo não foi colhido no ato e quando o registro foi feito. O Termo de entrega diz "O equipamento esteve com a Metrolabs de [retirada] até esta entrega" e a declaração de quem recebe inclui a ciência da retirada sem termo; o termo de entrega da O.S. (Assistência) traz o mesmo período.

**Declaração na tela de assinatura (16/11/2026, opção B do dono).** No termo de entrega de equipamento que passou pela guarda da Metrolabs (retirada com ou sem termo, de representada ou não), a tela de assinatura do aplicativo do técnico mostra, antes do quadro, a declaração "Leia com quem vai assinar": quem recebe (nome, documento, setor), o equipamento com série e TAG, o estado na entrega e os acessórios, as verificações e os testes feitos no local e "o equipamento esteve na oficina da Metrolabs de … até a entrega" (com "retirado sem termo de retirada assinado; esta assinatura confirma também a retirada e esse período" quando for o caso). É exatamente o texto do PDF: uma função só monta os dois (`AstR_declaracaoEntregaTexto_` no SGO+ e `declaracaoEntregaTexto` no aplicativo, com o mesmo corpo, conferido por teste). O aplicativo manda junto da assinatura a marca (resumo SHA-256) do texto mostrado; o PDF escreve "Declaração mostrada a quem recebeu na tela de assinatura do aparelho, antes de assinar (marca …)" ou, se o termo mudou depois, avisa que o texto é diferente. Sem o nome da representada e sem frase comercial (garantia, protocolo, nota fiscal, rastreio, orçamento, valores). Os demais termos e telas de assinatura não mudaram. A prévia do hospital continua disponível como reforço.

**Uma vez, revisão com motivo.** Os documentos saem sozinhos no encerramento, uma vez. "Emitir revisão do dossiê" (Metrolabs, com motivo de pelo menos 10 letras) emite a revisão das três peças juntas (dossiê da Metrolabs, da representada e do hospital), com o motivo escrito no documento e um código de verificação novo; as emissões anteriores continuam guardadas.

**Prévia.** "Ver prévia do dossiê" (quadro do processo, nas três visões de "Ver como") e "Ver prévia" (Relatórios do atendimento, dos dois lados; portal do hospital) mostram o documento final como está agora, marcado PRÉVIA, sem número e sem código de verificação; para o hospital, a prévia é a do resumo do serviço com os termos.

### 12A.8 Avisos

Representada: e-mail a cada marco que ela lê; WhatsApp (modelos sgo_rep_etapa e sgo_rep_acao) nos marcos principais e nos que pedem ação dela, só aos contatos de aviso com o aceite registrado (até 3), no expediente, com teto de 2 por chamado e 6 por pessoa por dia; enquanto o modelo não estiver aprovado na Meta, só e-mail, com o motivo em NTF_ENVIOS. Marcos informativos do mesmo chamado em 30 minutos viram um aviso só; fora do expediente, saem no próximo dia útil. Hospital: só e-mail (L2), sem o nome da representada; e-mail semanal às sextas, 10:00, enquanto o equipamento estiver fora (L4). Representada sem conta ativa: o envio fica PULADO com o motivo e a central mostra "Representada sem conta". Padrões L1 a L12 em Chaves e senhas > Representação.

### 12A.9 Regularização dos encerrados antes do processo novo (D9)

Representação > Representadas > "Processo dos chamados de representada" lista os encerrados antes do processo novo. "Regularizar para o processo novo" (ficha do chamado) é só do dono, do Administrador e da Diretoria, com motivo de pelo menos 20 letras: reabre no laudo ou em "Aguardando a orientação/decisão do fabricante" (sobre o relatório que a representada já recebeu), guarda o encerramento anterior no evento "REABERTO PARA O FLUXO NOVO", não cria chamado novo (não conta reincidência), não reenvia e-mail antigo e conta o prazo a partir de hoje. Pode registrar a retirada que não foi lançada (sem termo, com o motivo) e a avaliação em bancada.

### 12A.10 Administrador da representada (D13)

"Convidar administrador da representada": cria a conta (Administrador ou Financeiro de garantia) e manda o link de uso único para a pessoa criar a senha (o mesmo mecanismo do convite do cliente). "Contatos de aviso": quem recebe os avisos por e-mail e WhatsApp.

## 13. Próximas etapas do projeto (ainda não estão no módulo)

Marcos da visita, impedimentos e aceite do encerramento pela representada; remessa de peças com rastreio; garantia, tabela de preços e custos; fechamento mensal; andamento automático por e-mail ao cliente final e à representada com link público só daquele chamado; consulta automática de rastreio (Correios primeiro, com a chave configurada em Chaves e senhas; sem chave, rastreio manual).

<div style="text-align: justify">

## Ficha do contrato da representada e régua de vencimento (17/11/2026)

A **vigência** da representada continua no cadastro dela (Representação > Representadas, campos "Vigência de" e "Vigência até") e é ela que libera o acesso. A Brasmedical vai até 31/12/2027.

O **contrato completo** fica em Portal do cliente > Contratos de clientes > aba **Representadas**: número, objeto, PDF lido pela IA (com o trecho de cada sugestão), contato, valores, índice e data-base do reajuste, aviso prévio, prazos, multas e obrigações, com motivo e histórico. O formulário da representada mostra um aviso com o botão "Abrir a ficha do contrato".

A **régua de vencimento** avisa o responsável pelo contrato e a gestão comercial aos 120, 90, 60, 30, 15, 7 e 0 dias do fim e antes do limite do aviso prévio; o contato da representada recebe o e-mail a partir de 90 dias. O **reajuste** pelos índices do Banco Central segue a mesma regra dos clientes: o sistema propõe, só o dono e a Diretoria aprovam (Painel financeiro) e o Financeiro fatura com o valor aprovado.

</div>
