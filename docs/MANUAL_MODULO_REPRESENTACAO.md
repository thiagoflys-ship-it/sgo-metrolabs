# Manual do módulo Representação

Metrolabs · SGO+ · versão de 29/10/2026 (com o Painel) · equipe da Metrolabs

## 1. Para que serve

O módulo Representação é a área do SGO+ em que a empresa representada (Brasmedical) aciona a Metrolabs para atendimento técnico aos clientes finais dos equipamentos dela e acompanha cada pedido até o encerramento. Do lado da Metrolabs, o mesmo módulo reúne a fila de pedidos, as conversas com a representada, o cadastro da representada e o catálogo de modelos. O pedido aceito vira chamado da Assistência técnica, com a marca da representada, e segue a triagem, a agenda, a O.S., o aplicativo do técnico e o relatório de sempre.

## 2. Como a representada entra

- A pessoa da representada entra pelo login normal do SGO+, com usuário e senha, no perfil "Representada".
- A conta é criada em Administração > Usuários: perfil Representada, a representada (empresa) e o papel dela: administrador da representada, atendente, financeiro de garantia ou leitura.
- O perfil Representada vê só o módulo Representação. O servidor recusa qualquer outra função do SGO+ para essa sessão, e a conta não aparece nas listas de pessoas (responsáveis, avisos internos, bate-papo, conduta, ponto, atividades).
- Representada inativa (Representação > Representadas) ou conta sem representada: a pessoa não entra, e a mensagem diz o motivo.
- Não há troca da própria senha pela pessoa nesta etapa: a senha é definida e redefinida em Administração > Usuários, como para as demais contas.

## 3. Primeira configuração

1. Representação > Representadas > "Nova representada": nome, CNPJ, contrato, vigência, contato e prazos.
2. Prazos (padrão do estudo, configuráveis por representada): aceite do pedido em 240 minutos úteis (4 horas), alerta ao responsável a 75% do prazo, chamado sem registro em 3 dias úteis.
3. Opções: consulta de CNPJ na base pública da Receita ao cadastrar cliente (ligada no padrão) e cancelamento pela representada antes da visita, com motivo (ligado no padrão).
4. Representação > Catálogo de modelos: código, nome, tipo de equipamento, família, garantia em meses e, se houver, o padrão do número de série. Sem modelo, a representada não cadastra equipamento.
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

## 6. Alertas de prazo

| Marco | Quem recebe | Onde |
|---|---|---|
| Pedido novo | Responsável pela representação (sem ninguém, quem faz a triagem) | Aviso na Assistência e e-mail na hora (RP01; RP02 se o equipamento está parado) |
| 75% do prazo de aceite | Responsável pela representação | Central de pendências e e-mail uma vez (RP07) |
| Prazo de aceite vencido | Responsável e gestão da área Técnica | Central de pendências, Caixa de decisões e e-mail uma vez (RP07) |
| Chamado sem registro em 3 dias úteis | Responsável pela representação | Central de pendências, Caixa de decisões e e-mail uma vez por período parado (RP08) |

O tempo com complemento pedido não conta. Os avisos seguem a Matriz de avisos (Administração > Matriz de avisos, módulo Representação); nesta etapa nada sai pelo WhatsApp.

## 7. Conversas

- Cada pedido e cada chamado tem conversa própria; cada representada tem um canal geral.
- A mensagem da Metrolabs vai por e-mail à representada (quem abriu o pedido e o administrador dela).
- "Nota interna" fica só com a equipe (amarela, tracejada). Nada é apagado.
- A mensagem da representada avisa o responsável pela representação e o técnico do chamado.

## 8. Na Assistência técnica

- Filtro "Representação" na lista de chamados e selo roxo com o nome da representada.
- Parte "Representação" na ficha do chamado: protocolo, enquadramento pretendido, relato completo (código de erro, risco, o que já foi tentado), contato no local, arquivos e número de mensagens.
- Linha do tempo com três públicos: interno (sem marca), representada e cliente final. O que é registrado para o cliente final aparece também para a representada.

## 9. O que a representada vê e o que nunca vê

- Vê: os pedidos e chamados da empresa dela, a etapa (Enviado, Complemento pedido, Recusado, Aceito em análise, Aguardando aprovação de orçamento, Aguardando peça, Visita a agendar ou agendada, Em atendimento, Concluído, Encerrado, Cancelado), a data e o técnico da visita, a linha do tempo pública, os arquivos que ela enviou, a conversa e os equipamentos dos pedidos dela e os que ela cadastrou.
- Busca cliente só pelo CNPJ ou CPF completo e equipamento só pela série exata, com limite de 20 buscas em 15 minutos (contando achou e não achou). Série cadastrada em outro cliente: a tela pede para falar com a Metrolabs, sem dizer qual cliente.
- Vê também o Painel da empresa dela (índices, Kanban e Gantt; seção 4.2).
- Vê e gera os relatórios A4 da versão dela (atendimento e período; seção 12) e abre só esses documentos.
- Nunca vê: outros clientes, outras representadas, notas internas, valores, registros internos do chamado, fotos não liberadas, primeiro contato, fila e carga da Metrolabs, as versões interna e do cliente dos relatórios, o restante do SGO+.

## 10. Cadastros feitos pela representada

- Cliente completo (CNPJ ou CPF válido, endereço em partes, contato com e-mail e telefone) com "Ciente"; unidade com cidade e UF.
- Equipamento com modelo do catálogo, série, data de instalação, nota fiscal de venda (número, data e arquivo), revenda, setor, patrimônio e foto da etiqueta. Garantia calculada: data da instalação (ou da nota) mais os meses do modelo.
- Tudo fica com a origem "REPRESENTADA", quem cadastrou e o "Ciente" com data e hora, e entra em Cadastros > Correções de cadastro e no histórico dos cadastros.

## 11. Registro de ações

A aba "Registro de ações" mostra buscas, cadastros, pedidos e cancelamentos das representadas, com nome, data e hora. O administrador da representada vê o da própria equipe.

## 12. Documentos A4: relatório do atendimento e relatório do período

Um motor só (SGO_Representacao_Documentos.js) sobre a moldura A4 dos relatórios do SGO+ (capa com a logo, sumário com o número das páginas, seções, tabelas e figuras numeradas, cabeçalho e rodapé corridos). Três versões, uma por público; o servidor filtra antes de montar o documento, e cada versão só recebe o que o público dela pode ler.

### 12.1 Relatório do atendimento (um chamado)

| Parte | Representada | Cliente final | Metrolabs (interno) |
|---|---|---|---|
| Capa, sumário, resumo com índices | Sim | Sim | Sim |
| Cliente e equipamento | Com garantia, fabricante, instalação e nota fiscal; nome e protocolo da representada | Sem garantia e sem fabricante; sem o nome da representada | Como a representada |
| Relato da abertura | Completo (código de erro, risco, o que já foi tentado, contato no local, pedido, complemento) | Problema relatado e situação do equipamento | Completo |
| Etapas | — | As 5 etapas de "Meus chamados", com as datas | — |
| Linha do tempo | Eventos PUBLICO = REPRESENTADA ou SIM; autor "Metrolabs" (o nome só quando é da própria representada) | Só PUBLICO = SIM; autor "Metrolabs" | Todos, com o nome; o interno sai em ponto vazado |
| Marcos previsto x realizado (aceite, visita, conclusão) | Sim, com gráfico | Não (prazos internos) | Sim |
| Visita e atendimento | O.S., técnico, agendado, chegada, conclusão, tempo no local | Igual (do técnico, só o nome) | Mais saída, deslocamento, conferência do equipamento e outras visitas |
| Diagnóstico e serviço | Condição, causa, serviço, teste, recomendações | Igual | Mais o relato do técnico e a orientação remota |
| Peças | Sem valor | Sem valor | Sem valor, com o pedido de compra da peça em falta |
| Fotos | Liberadas (REPRESENTADA ou SIM) e as que ela enviou | Só as liberadas ao cliente (SIM) | Todas, com a liberação de cada uma |
| Conversa do chamado | Sem nota interna | Não | Sem nota interna (as notas vão na parte própria) |
| Notas internas, Prazos e SLA (horas úteis, primeiro contato, pausa, triagem), Histórico do equipamento (reincidência em 90 dias) | Não | Não | Sim |
| Arquivos, relatório da O.S., assinatura e aceite | Sim | Relatório da O.S. e assinatura | Sim, com quem lê cada arquivo |

Nunca, em nenhuma versão: valores. Nunca nas externas: nota interna, foto não liberada, registro interno, outra representada.

### 12.2 Relatório do período

Mesmos índices do Painel, com as fórmulas da seção 4 (RepP_indices_ para representada e Metrolabs; para o cliente, as de "Meus chamados" com o período escolhido). Gráficos: por etapa, prazo cumprido (aceite, atendimento e, na interna, primeiro contato), tempos médios em horas úteis, por cliente, por UF, garantia e reincidência por modelo; para o cliente, por etapa, por mês, por equipamento e por unidade. Gantt da carteira em folha paisagem (24 linhas por figura; o texto da barra é a etapa; rótulo de mês só aparece se couber antes do mês seguinte; o texto nunca encosta no losango da visita nem no fim do prazo). Lista dos pedidos e chamados do período. Só na interna: prazo de atendimento por prioridade, carga por técnico, fila de pedidos e comparação entre representadas. Escopo: a representada só a carteira dela; o cliente só os chamados dele (inclusive os que não vieram de representada); a Metrolabs, os chamados que a pessoa pode ver, todas as representadas ou a escolhida no filtro.

### 12.3 Onde gerar

- Representada: ficha do chamado > "Gerar relatório"; Painel > "Relatório do período"; Painel > aba "Relatórios gerados".
- Cliente: Meus chamados > "Lista e relatórios" > "Gerar relatório do atendimento" no chamado e "Relatório do período (últimos 90 dias)"; a lista "Relatórios gerados" fica logo abaixo.
- Metrolabs: ficha do chamado na Assistência técnica > "Relatórios do atendimento" (as três versões); Painel da Representação > "Versão do relatório" e "Relatório do período" (interna, ou a da representada escolhida no filtro).

### 12.4 Salvar, registrar e quem abre

- Todo documento é gravado em HTML e PDF (SGO_DocSalvar), privado, e registrado em REP_DOCUMENTOS com o tipo, o público, a representada, o cliente, o chamado, o número (RAT-aaaa-nnnn-M, -R ou -C; período RPM-, RPR- ou RPC- com data e hora), a emissão, quem gerou e de que lado. Nada é sobrescrito: cada emissão é uma versão nova, e a revisão do cabeçalho conta as emissões anteriores do mesmo chamado e público.
- Pastas: versão do cliente na pasta do equipamento (prontuário, "4. Ordens de Serviço") e no Arquivo de documentos do equipamento (tipo "RELATÓRIO DE ATENDIMENTO"); versão da representada em "Representação - Relatórios > (representada) > ano > chamado"; interna em "Representação - Relatórios > Metrolabs - uso interno > ano > chamado"; período do cliente na pasta do cliente em "Assistência técnica - Relatórios > Relatórios do período".
- Quem abre: a representada lista e abre só a versão dela da própria representada (a rota /arquivos confere a cada abertura, Representacao_arquivoPermitido_); o cliente lista só a versão do cliente dos chamados dele; a equipe lista todas.
- A emissão entra no histórico do chamado (interno).

### 12.5 Fotos e liberação

- A foto do técnico (ATEC_FOTOS) só entra na versão externa depois de liberada na ficha do chamado, em "Quem vê nos relatórios": não liberada (padrão), só à representada, ou ao cliente e à representada. Libera a gestão da área Técnica e os responsáveis pela representação; a liberação fica no histórico da O.S. com quem e quando.
- Ao liberar, a tela gera uma cópia reduzida (lado maior 1000 px, JPEG) e o servidor a guarda na pasta privada da O.S.; o A4 usa essa cópia. Foto acima de 450 KB sem a cópia reduzida fica de fora do A4, com o aviso para liberar de novo. Até 12 fotos por documento.

## 13. Próximas etapas do projeto (ainda não estão no módulo)

Marcos da visita, impedimentos e aceite do encerramento pela representada; remessa de peças com rastreio; garantia, tabela de preços e custos; fechamento mensal; andamento automático por e-mail ao cliente final e à representada com link público só daquele chamado; consulta automática de rastreio (Correios primeiro, com a chave configurada em Chaves e senhas; sem chave, rastreio manual).
