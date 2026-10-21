<!-- Versão em Markdown do documento C:/Users/venda/Documents/METROLABS_PROJETO_ASSISTENCIA_20261021/PROJETO_ASSISTENCIA_TECNICA_NO_SGO.html (fonte para impressão). -->

**METROLABS**

# Projeto: trazer a Assistência técnica para o SGO+ e deixar de usar o Auvo

*Estudo para decisão do dono. Nenhum código foi alterado.*

|  |  |
| --- | --- |
| Número | PRJ-20261021-AST |
| Revisão | 00 |
| Data | 21/10/2026 |
| Elaborado por | Equipe de projeto (operação de campo, software e qualidade) |
| Para | Dono da empresa (decisão) |
| Situação | Proposta. Aguarda as respostas da seção 6. |

## Resumo para decidir

Hoje o Auvo é a ferramenta de campo da Metrolab: o técnico recebe a tarefa no celular, registra a chegada e a saída, responde o questionário do serviço com fotos e colhe a assinatura do cliente. O SGO+ copia esses dados a cada 30 minutos e monta em cima deles o painel de qualidade, as pendências, os avisos ao cliente e o painel de vínculos. Em dois anos foram cerca de 5.174 tarefas, para cerca de 2.013 clientes, com 8 usuários, 30 tipos de tarefa e 13 questionários.

O ponto mais sensível é que **as fotos e as assinaturas não estão no SGO+**: o SGO+ guarda só o endereço delas, e elas continuam hospedadas no Auvo. Se o contrato do Auvo acabar antes de copiarmos esse acervo, as provas de execução de dois anos se perdem.

O COMMAND tem um módulo de Assistência bem desenhado (chamado com etapas controladas, prazo contratual, triagem, agenda com conflito de horário, aguardar peça, assinatura na tela, encerramento só com a O.S. completa, orçamento do chamado e portal do cliente), mas nunca foi usado pela equipe e não tem aplicativo de campo que funcione sem internet. O SGO+ já tem o cadastro único de clientes, unidades e equipamentos, o QR do equipamento, Minhas atividades, Caixa de decisões, central de pendências, e-mail, Enviar documento, documento A4 na pasta do cliente, Frota e o modo celular.

**Recomendação.** Construir a Assistência técnica nativa no SGO+, aproveitando as regras do COMMAND (não o código inteiro), em seis etapas pequenas:

0. **primeiro de tudo**, copiar para o servidor todas as fotos, assinaturas e relatos do Auvo, com conferência;
1. chamados e triagem no computador;
2. ordem de serviço com lista de verificação por tipo de serviço (os 13 questionários viram modelos);
3. aplicativo do técnico no celular, instalável e capaz de trabalhar sem internet;
4. relatório da O.S. em A4 ao cliente e portal do cliente;
5. uso em paralelo com o Auvo e desligamento quando o critério da seção 4.4 for cumprido.

A etapa 0 vale sozinha e deve começar já, mesmo que o resto demore. A etapa 3 é a mais trabalhosa e a mais arriscada, porque é a única parte realmente nova para o servidor (hoje ele não guarda nada no aparelho e não funciona sem internet).

Antes da etapa 1 o dono precisa responder às perguntas da seção 6, em especial: quantos técnicos usam o sistema, quais tipos de serviço continuam, se o cliente assina na tela, quando vence o contrato do Auvo e se há internet nos locais de atendimento.

## 1. O que o Auvo faz hoje para a Metrolab e o que se perde sem ele

### 1.1 Números de uso

Tabela 1 — Uso do Auvo (levantamento de agosto a outubro de 2026)

| Item | Quantidade | Observação |
| --- | --- | --- |
| Tipos de tarefa | 30 | Cada tipo define o serviço (manutenção, qualificação, calibração, visita e outros). |
| Questionários | 13 | Perguntas que o técnico responde em campo, com foto e assinatura. |
| Usuários | 8 | Técnicos e gestão. |
| Clientes cadastrados | cerca de 2.013 | Ligados aos clientes e unidades do SGO+ pelo painel de vínculos. |
| Tarefas em dois anos | cerca de 5.174 | Cada uma pode ter várias fotos e uma assinatura. |
| O.S. abertas no levantamento | 338 | 96% delas já tinham evidência de execução; o campo "concluída" não pode ser mudado pela integração. |

### 1.2 Funções usadas e o que acontece se o Auvo sair

Tabela 2 — O que o Auvo faz e o que se perde sem ele

| Função do Auvo | Como a Metrolab usa | Sem o Auvo | Quem substitui |
| --- | --- | --- | --- |
| Agenda de tarefas por técnico | A gestão cria a tarefa com cliente, endereço, tipo e orientação; o técnico vê no celular. | Ninguém sabe onde cada técnico deve ir. | Etapas 1 e 2 (chamado, agenda e despacho). |
| Aplicativo do técnico | Check-in e check-out com hora, questionário, fotos pela câmera, relato, assinatura do cliente. Funciona sem sinal e envia depois. | Perde-se a prova de execução em campo. É a função mais difícil de substituir. | Etapa 3. |
| Questionários por tipo de serviço | 13 modelos de perguntas, com campos de foto e assinatura. | Perde-se o padrão de registro por serviço. | Etapa 2 (modelos de lista de verificação). |
| Guarda das fotos e assinaturas | Ficam hospedadas no Auvo; o SGO+ guarda só o endereço. | Perdem-se dois anos de evidências, se não forem copiadas antes. | Etapa 0 (cópia do acervo). |
| Cadastro de clientes e equipamentos | O SGO+ envia unidades e equipamentos ao Auvo. | Nenhuma perda: o cadastro mestre já é o SGO+. | Já existe. |
| Relatório da tarefa | Página do Auvo com o atendimento (o SGO+ guarda o link). | Os links antigos param de abrir. | Etapa 0 (cópia) e etapa 4 (relatório A4 próprio). |
| Avisos ao cliente | Hoje quem avisa é o SGO+, a partir dos dados do Auvo (O.S. aberta e concluída, para técnico, gestão e cliente). | Os avisos param se não houver nova origem. | Etapa 1 em diante (mesmos avisos, origem no módulo). |

Limites conhecidos do Auvo que deixam de existir: o campo "concluída" não é editável pela integração, as exigências por tipo de tarefa (foto obrigatória, assinatura obrigatória) não são configuráveis pela integração e os dados chegam com até 30 minutos de atraso.

### 1.3 Partes do SGO+ que dependem do Auvo

Tabela 3 — Dependências internas

| Parte do SGO+ | O que usa do Auvo | O que muda |
| --- | --- | --- |
| Painel de qualidade das O.S. | O.S. sem foto, sem relato ou sem check-out. | Passa a ler as O.S. do módulo; com as exigências travadas na própria O.S., o painel vira conferência e não caça de falhas. |
| Programa de conduta | Sugestões de ocorrência vindas das falhas das O.S. | Continua só como sugestão, que a gestão confirma ou descarta. |
| Frota e rastreamento | Deslocamento até o atendimento. | Liga a reserva ou o trajeto ao chamado agendado. |
| Assistente do ponto | Não lembrar o técnico que está em atendimento. | Lê o estado "no local" ou "em execução" do módulo. |
| Central de pendências | O.S. abertas, sem documentação, atrasadas. | Mesmas pendências, origem no módulo. |
| Cronograma de execução | Tarefas do Auvo ligadas às execuções. | A execução agendada vira chamado ou O.S. no próprio SGO+. |
| Avisos de O.S. | Abertura e conclusão para técnico, gestão e cliente. | Mesmos avisos, disparados pela mudança de etapa. |
| Painel de vínculos (IMED) | Ligação cliente Auvo e cliente SGO+. | Fica só para leitura do histórico depois do desligamento. |
| Comercial: "Passar aos setores" | A parte técnica vai para o Cronograma e para Minhas atividades. | Passa a poder abrir também um chamado ou uma O.S. planejada. |

## 2. O que já existe para aproveitar

### 2.1 Assistência do COMMAND

O COMMAND foi construído e testado em simulador, mas a equipe nunca o usou: não há dados reais a migrar dele. O valor dele está nas regras, que já foram pensadas e testadas, e não no código, que roda em outra base. A proposta é reescrever no padrão do SGO+ usando essas regras como especificação.

Tabela 4 — Situação de cada parte da Assistência no COMMAND

| Parte | O que faz | Situação |
| --- | --- | --- |
| Chamado com etapas controladas | Aberto, em triagem, resolvido remotamente, aguardando orçamento, aguardando peça, planejado, agendado, em deslocamento, no local, em execução, pausado, aguardando cliente, execução concluída com documentação pendente, encerrado ou cancelado. Qualquer passagem fora da tabela é recusada. Todo passo grava data, hora e autor. | Maduro (regras); nunca usado |
| Prazo contratual | Prazo de resposta e de solução por criticidade, padrão ou do contrato; o relógio pausa ao aguardar cliente ou peça só quando o contrato permite. | Maduro; nunca usado |
| Triagem | Responsável da supervisão, decisão (remoto, orçamento, peça, planejar), sugestão de diagnóstico por inteligência artificial. | Maduro; IA fica de fora no início |
| Agenda e conflito | Agendar exige técnico, data, duração e preparo; aviso de conflito de horário; reagendar e replanejar com motivo. | Maduro; nunca usado |
| Aguardar peça | Exige requisição de compra ou justificativa; aviso quando a peça chega. | Depende de Compras, que não existe no SGO+ |
| Encerramento | Só fecha com série confirmada, condição encontrada, causa, serviço, peças, teste funcional, evidências e assinatura (ou motivo da falta). Série divergente gera aviso. | Maduro; é a regra que mais falta hoje no Auvo |
| Assinatura na tela | Quadro de assinatura no navegador, com nome e documento de quem assina. | Maduro; precisa ser refeito no aplicativo |
| Reclamações (Casos) | Reclamação com dono, prazo e ligação a chamado, equipamento ou cliente. | Completo, mas é outro assunto; trazer depois |
| Orçamento do chamado | Orçamento ligado ao chamado, com link para o cliente aprovar. | Incompleto (envio por WhatsApp de serviço externo) |
| Portal do cliente | Página com link próprio onde o cliente abre chamado e manda foto pela câmera. | Incompleto; nunca usado |
| Contratos | Prazos e regras por contrato. | Completo no COMMAND; o SGO+ não tem cadastro de contrato |
| Aplicativo de campo | Telas de celular dentro do sistema, sempre com internet. | Não existe trabalho sem internet |

### 2.2 O que o SGO+ já tem e serve

Tabela 5 — Base pronta no SGO+

| Recurso do SGO+ | Uso na Assistência |
| --- | --- |
| Cadastro de cliente, unidade, equipamento e vínculos | Todo chamado nasce ligado a cliente, unidade e equipamento. Não haverá cadastro paralelo. |
| QR do equipamento e prontuário | O técnico lê o QR e abre o equipamento certo; o histórico de chamados entra no prontuário, ao lado da qualificação e da calibração. |
| Minhas atividades e Caixa de decisões | Tarefas da gestão (aprovar orçamento, cobrar documentação) e exceções (prazo estourado, encerramento sem assinatura) com a escada de cobrança. |
| Central de pendências e avisos | Mesmas regras de aviso já adotadas: dentro do sistema até resolver, e-mail no expediente, WhatsApp no resumo diário. |
| E-mail integrado e Enviar documento | Envio do relatório da O.S. e do orçamento ao cliente, com histórico. |
| Documento A4 e salvamento na pasta | Relatório da O.S. no mesmo padrão dos outros documentos, salvo na pasta do cliente e do equipamento. |
| Modo celular | Ponto de partida das telas do técnico (mas sem trabalho sem internet). |
| Frota, reservas e rastreamento | Veículo e trajeto ligados ao atendimento. |
| Comercial | Pedido aprovado com parte técnica abre o atendimento; orçamento do chamado pode usar o catálogo de produtos e serviços. |
| Servidor próprio | Arquivos no disco do servidor com cópia diária criptografada; repetição automática de pedidos sem registro em dobro; envio de arquivos até cerca de 45 MB por pedido. |

O que o servidor ainda não tem e o aplicativo do técnico exige: instalação no celular, guarda de dados no aparelho, fila de envio sem internet, localização pelo navegador e acesso de fora do escritório (ver 3.6 e 4.5).

## 3. Proposta do módulo nativo no SGO+

O módulo se chamará **Assistência técnica** e terá dois objetos: o **chamado** (o pedido do cliente ou da própria Metrolab, do primeiro contato até a solução) e a **ordem de serviço** (cada ida a campo ou cada execução, com a lista de verificação, as fotos e a assinatura). Um chamado pode ter mais de uma O.S. (por exemplo, diagnóstico e depois troca de peça). Serviços programados, como uma qualificação anual vinda do Cronograma, podem nascer direto como O.S. planejada, sem chamado.

### 3.1 Caminho de um chamado

Tabela 6 — Etapas do chamado

| Etapa | O que acontece | Quem | Trava |
| --- | --- | --- | --- |
| 1. Aberto | Registro do pedido: cliente, unidade, equipamento (se souber), sintoma, se o equipamento está parado, canal de entrada. | Cliente pelo portal, atendimento, gestão | Sem cliente e unidade não salva. |
| 2. Em triagem | Alguém da supervisão assume, confirma o equipamento, define a criticidade e decide o caminho. | Triagem | O relógio de resposta para quando a triagem começa. |
| 3. Decisão | Resolvido remotamente, aguardando orçamento, aguardando peça ou planejado para campo. | Triagem | Aguardar peça exige requisição ou justificativa. |
| 4. Agendado | Técnico, data, duração, veículo e preparo; nasce a O.S. | Gestão | Aviso de conflito de horário e de técnico ausente. |
| 5. Em campo | Deslocamento, chegada, execução, pausa, aguardando cliente ou peça. | Técnico (aplicativo) | Hora gravada pelo aparelho e conferida pelo servidor. |
| 6. Execução concluída | Técnico termina a lista de verificação; falta conferência se algo obrigatório ficou em branco. | Técnico | Sem lista completa fica "documentação pendente". |
| 7. Encerrado | Relatório A4 gerado, enviado ao cliente e salvo na pasta. | Gestão ou técnico, conforme regra | Sem assinatura, só com motivo aceito. |
| Cancelado | A qualquer momento antes do encerramento. | Gestão | Exige motivo. |

### 3.2 Abertura do chamado

- **Portal do cliente:** link próprio de cada unidade, sem senha, com validade e possibilidade de revogar; o cliente escolhe o equipamento da lista dele (ou lê o QR colado no equipamento), descreve o problema e pode mandar foto pela câmera do celular. Recebe o número do chamado e acompanha a etapa.
- **E-mail:** o atendimento abre o chamado a partir da mensagem recebida no e-mail integrado, que fica anexada ao chamado.
- **Telefone:** o atendimento abre pela tela, informando quem ligou.
- **WhatsApp:** só depois do piloto, quando os canais acima estiverem estáveis.
- **Interno:** do Comercial (pedido aprovado), do Cronograma (serviço programado), de uma reclamação ou de uma não conformidade encontrada em qualificação ou calibração.

Antes de salvar, o sistema mostra se já existe chamado aberto para o mesmo equipamento, para evitar duplicidade, e marca reincidência quando o mesmo equipamento teve chamado encerrado nos últimos 30 dias (prazo a confirmar).

### 3.3 Triagem e prazo contratual

O SGO+ ainda não tem cadastro de contrato. A proposta é começar simples: um **prazo padrão por criticidade** (por exemplo, resposta em 4 horas úteis e solução em 2 dias úteis para equipamento parado) e uma **exceção por cliente ou unidade**, cadastrada no próprio cliente. O cadastro de contratos completo, como no COMMAND, fica para depois, se o dono quiser. O relógio só pausa ao aguardar cliente ou peça quando a regra do cliente permitir. Prazo estourando vira item da Caixa de decisões; prazo estourado sobe na escada de cobrança.

### 3.4 Agenda e despacho

- Quadro da semana por técnico, com os chamados agendados, as O.S. do Cronograma, as ausências e as reservas de veículo.
- Aviso de conflito de horário, de técnico sem a competência do serviço e de técnico em férias ou ausente.
- Ao agendar: aviso ao técnico (dentro do sistema e e-mail) e ao cliente (data e janela de chegada).
- Reagendar e replanejar exigem motivo e ficam na história do chamado.
- Pedido de veículo na Frota direto do agendamento.

### 3.5 Ordem de serviço e lista de verificação por tipo de serviço

Cada tipo de serviço tem um **modelo de lista de verificação**. Os 13 questionários do Auvo são convertidos em 13 modelos iniciais, revisados com a gestão antes do uso. Cada item do modelo diz o tipo de resposta (texto, número com unidade, sim ou não, escolha, foto, assinatura), se é obrigatório e, para números, a faixa aceitável. A diferença em relação ao Auvo é que **a exigência fica na própria O.S.**: sem as fotos obrigatórias, o relato e a assinatura (ou o motivo da falta), a O.S. não encerra. Os campos fixos de toda O.S. vêm das regras do COMMAND: equipamento confirmado no local, número de série confirmado, condição encontrada, causa, serviço realizado, peças aplicadas, teste funcional e recomendações. Número de série diferente do cadastro gera aviso à gestão em vez de mudar o cadastro sozinho.

Os modelos têm versão: mudar um modelo não altera as O.S. já feitas, que guardam a versão usada.

### 3.6 Aplicativo do técnico no celular

É a peça central e a única realmente nova. O técnico precisa trabalhar em subsolo de hospital, em área técnica sem sinal e em cidades com internet fraca, como faz hoje no Auvo. Por isso não basta a tela do SGO+ em modo celular.

Tabela 7 — O que o aplicativo faz

| Função | Como funciona |
| --- | --- |
| Agenda do dia | Lista das O.S. do técnico, com endereço, contato, orientação da gestão, histórico do equipamento e o modelo de lista de verificação. Baixada quando há internet e guardada no aparelho. |
| Deslocamento, chegada e saída | Um toque para cada marco; o aparelho grava a hora e, com permissão, a localização. Ao sincronizar, o servidor guarda também a hora em que recebeu. |
| Lista de verificação | Preenchida no aparelho, item por item, com aviso do que é obrigatório e do que está fora da faixa. |
| Fotos | Pela câmera, reduzidas no próprio aparelho para cerca de 1 a 2 MB, ligadas ao item da lista. |
| Relato e peças | Texto do serviço e peças aplicadas (da lista de peças ou livre). |
| Assinatura na tela | Quadro para o cliente assinar com o dedo, com nome e documento; ou motivo da falta. |
| Leitura do QR | Abre o equipamento e confere se é o mesmo da O.S. |
| Situação da fila | Mostra o que ainda não foi enviado e avisa quando tudo chegou ao servidor. |

**O que precisa ser construído** (nada disso existe hoje no servidor):

1. **Instalável no celular:** o SGO+ ganha um arquivo de descrição do aplicativo (nome, ícone, cor) e um programa de apoio que fica no aparelho e guarda as telas do técnico. Assim o técnico "instala" pelo navegador, ganha um ícone na tela inicial e o aplicativo abre mesmo sem sinal. Não passa por loja de aplicativos.
2. **Guardar no aparelho:** um banco de dados do próprio navegador guarda a agenda, os modelos, as respostas, as fotos e as assinaturas até a confirmação do servidor.
3. **Enviar depois, sem duplicar:** cada registro e cada foto recebe um número único gerado no aparelho. O envio é repetido até o servidor confirmar; o servidor reconhece o número e não grava duas vezes (o mesmo princípio da repetição automática que já existe). Fotos vão uma por vez, para não estourar o limite por pedido e não recomeçar tudo se cair a conexão.
4. **Conflito:** se a gestão alterar a O.S. enquanto o técnico está sem sinal (por exemplo, cancelou), o aplicativo mostra o aviso na sincronização e não apaga o que o técnico fez.
5. **Sessão longa no aparelho:** hoje a sessão dura de 6 a 24 horas. O técnico não pode perder o trabalho porque a sessão venceu no meio do atendimento: o aplicativo guarda tudo e pede a senha de novo só na hora de enviar.
6. **Acesso de fora do escritório:** o endereço do SGO+ precisa estar aberto à internet (ver 4.5), com senha e as proteções que já existem.

Cuidados conhecidos: em iPhone, o sistema pode apagar dados de sites pouco abertos; por isso a fila deve ser enviada assim que houver sinal e o aplicativo avisa quando há dados guardados há mais de um dia. A localização exige permissão do técnico e só é registrada nos marcos, nunca de forma contínua (o rastreamento contínuo já é feito pela Frota).

### 3.7 Relatório da O.S. ao cliente

Ao encerrar, o SGO+ gera o **relatório da O.S. em A4** no padrão dos outros documentos: dados do cliente, da unidade e do equipamento, datas e horas dos marcos, condição encontrada, causa, serviço, peças, teste funcional, respostas da lista de verificação, fotos com legenda, recomendações e a assinatura. O relatório é salvo na pasta do cliente e na do equipamento, aparece no prontuário do equipamento (QR) e vai ao cliente pelo Enviar documento, com histórico. No portal, o cliente vê os relatórios das próprias unidades.

### 3.8 Orçamento do chamado, peças e compras

- **Orçamento do chamado:** nasce dentro do chamado, usa o catálogo de produtos e serviços do Comercial e sai como proposta A4 pelo mesmo caminho do Comercial (numeração, revisão, envio, resposta do cliente). Aprovado, o chamado volta para planejamento.
- **Peças:** no início, lista simples de peças com código e descrição, e registro das peças aplicadas em cada O.S. Controle de estoque só se o dono pedir (pergunta 5).
- **Compras:** o SGO+ não tem módulo de compras. Até existir, "aguardando peça" exige a referência do pedido e uma previsão; a chegada da peça é marcada manualmente e avisa a triagem. O módulo de Compras do COMMAND é um projeto à parte.

### 3.9 Pendências, qualidade e avisos

As pendências e o painel de qualidade passam a ler o módulo, e não mais o Auvo. Como a O.S. já não encerra sem os itens obrigatórios, o painel deixa de procurar "O.S. sem foto" e passa a mostrar: documentação pendente há mais de um dia, encerramento sem assinatura com motivo, prazo contratual estourado, reincidência e série divergente. Os avisos seguem a regra geral do SGO+ (dentro do sistema até resolver, e-mail no expediente, WhatsApp só no resumo diário e depois do piloto) e mantêm os destinatários de hoje: técnico, gestão e cliente na abertura e na conclusão.

### 3.10 Ligações com o resto do SGO+

Tabela 8 — Integrações

| Com | Ligação |
| --- | --- |
| Frota | Reserva de veículo a partir do agendamento; trajeto do dia ligado às O.S. |
| Ponto | O assistente do ponto não cobra o técnico que está em atendimento; horas de campo aparecem para conferência, sem lançar ponto sozinho. |
| Programa de conduta | Só sugestões (O.S. encerrada sem documentação, atraso sem justificativa); nunca ocorrência automática. |
| Comercial | "Passar aos setores", parte técnica, pode abrir chamado ou O.S. planejada; orçamento do chamado usa o catálogo. |
| Cronograma de execução | Execuções programadas viram O.S. planejadas, com o modelo do tipo de serviço. |
| Qualificação e calibração | O relatório técnico continua no módulo de cada serviço; a O.S. registra a execução em campo e aponta para o documento gerado. Não conformidade encontrada pode abrir chamado. |
| QR e prontuário do equipamento | Histórico de chamados e relatórios de O.S. no prontuário; leitura do QR no aplicativo. |
| Minhas atividades e Caixa de decisões | Tarefas de gestão do chamado e exceções com escada de cobrança. |

### 3.11 Perfis e permissões

- **Técnico:** vê só as próprias O.S. e o histórico dos equipamentos delas; não vê valores de orçamento.
- **Triagem e supervisão:** todos os chamados, agenda, despacho, encerramento.
- **Gestão:** tudo, inclusive prazos por cliente, modelos de lista de verificação e indicadores.
- **Cliente (portal):** só os chamados e relatórios das próprias unidades.

## 4. Migração e transição

**4.1 Antes de tudo: copiar fotos e assinaturas do Auvo para o servidor.** As fotos e as assinaturas de cerca de 5.174 tarefas só existem no Auvo; o SGO+ guarda apenas o endereço. Se o contrato do Auvo acabar, ou se os endereços expirarem, essas provas de execução se perdem para sempre. Esta cópia deve ser feita **antes de qualquer outra etapa** e antes de qualquer conversa de cancelamento com o Auvo.

Como fazer a cópia (etapa 0):

1. Percorrer todas as tarefas pelo meio de integração que já usamos, guardando as respostas dos questionários completas (não só as que o SGO+ já tem).
2. Baixar cada foto e cada assinatura e guardar no disco do servidor como arquivo do SGO+, com a tarefa, o cliente, o equipamento, a pergunta e a data.
3. Gerar também o relatório de cada tarefa em PDF, a partir dos dados copiados, para que o link antigo do Auvo não faça falta.
4. Conferir: quantidade de tarefas, de fotos e de assinaturas no Auvo contra o que chegou; arquivo vazio ou corrompido volta para a fila. Relatório de conferência assinado pela gestão.
5. Repetir a cópia das tarefas novas até o desligamento.

Antes de começar, medir o volume (quantidade e tamanho médio das fotos) para confirmar que o disco do servidor e a cópia diária para o Drive suportam o acervo. O Auvo pode limitar o número de consultas por minuto; a cópia deve andar devagar, em lotes, e continuar de onde parou.

### 4.2 Histórico para leitura

As O.S. antigas, os relatos, as respostas e os vínculos de clientes entram no SGO+ como **histórico somente para leitura**, ligados ao cliente, à unidade e ao equipamento, e aparecem no prontuário. Não viram chamados novos e não geram pendências. As 338 O.S. abertas no Auvo devem ser fechadas lá ou conferidas uma a uma antes do desligamento; as que ainda precisam de trabalho são reabertas no SGO+ como chamado novo, com referência à tarefa antiga.

### 4.3 Uso em paralelo

Durante o piloto, uma parte dos técnicos (ou um tipo de serviço) usa só o SGO+, e o restante continua no Auvo. Nunca o mesmo atendimento nos dois sistemas, para não haver registro duplo. A integração com o Auvo continua ligada para o restante até o desligamento.

### 4.4 Critério para desligar o Auvo

- Acervo copiado e conferido (fotos, assinaturas e relatos), com relatório de conferência.
- Todos os técnicos usando o aplicativo há pelo menos 4 semanas seguidas, sem perda de dado.
- Pelo menos um atendimento feito sem internet, sincronizado depois sem duplicar e sem perder foto.
- Relatórios de O.S. chegando aos clientes e salvos nas pastas.
- Painel de qualidade, pendências, avisos, Frota e ponto lendo o módulo novo.
- Nenhuma O.S. aberta no Auvo.
- Somente então: avisar o Auvo conforme o prazo do contrato e desligar a sincronização.

### 4.5 Riscos

Tabela 9 — Riscos e cuidados

| Risco | Efeito | Cuidado |
| --- | --- | --- |
| Contrato do Auvo vencer antes da cópia | Perda das evidências de dois anos. | Etapa 0 primeiro; saber a data de vencimento (pergunta 4). |
| Sem internet em campo | Técnico perde o atendimento ou desiste do aplicativo. | Aplicativo que trabalha sem internet desde a primeira versão de campo; teste em local sem sinal antes do piloto. |
| Celular apagar dados guardados | Perda de fotos antes do envio. | Enviar assim que houver sinal; aviso de dados presos; teste em Android e iPhone. |
| Acesso externo ao servidor | Hoje o endereço do SGO+ pode estar restrito ao IP do escritório; o técnico em campo não entra. | Conferir e retirar a restrição no dia da troca, como já previsto no roteiro de implantação; manter senha forte e limite de tentativas. |
| Treinamento | Técnico acostumado ao Auvo resiste à troca. | Telas no mesmo jeito do Auvo (agenda, marcos, questionário); ajuda passo a passo em cada tela; piloto com um técnico que goste de testar. |
| Espaço em disco e cópia diária | Fotos ocupam muito espaço. | Reduzir fotos no aparelho; medir o acervo antes; acompanhar o crescimento. |
| Servidor fora do ar | Antes, o Auvo seguia funcionando sozinho. | O aplicativo continua funcionando sem servidor e envia depois; acompanhar a disponibilidade do servidor. |
| Prova jurídica da assinatura | Cliente contesta a execução. | Guardar a assinatura com nome, documento, data, hora e, com permissão, localização; relatório A4 com código de conferência. |

## 5. Plano em etapas

Cada etapa é útil sozinha e só começa depois que o dono aprova as decisões da linha correspondente. Os prazos são estimativas de esforço de construção e dependem das respostas da seção 6.

Tabela 10 — Etapas

| Etapa | O que entrega | Critério de pronto | O dono decide antes |
| --- | --- | --- | --- |
| 0. Cópia do acervo do Auvo | Fotos, assinaturas, respostas e relatórios de todas as tarefas no servidor, ligados a cliente e equipamento; cópia contínua das novas. | Conferência de quantidades igual ao Auvo; amostra de 50 tarefas aberta e lida pela gestão; cópia diária do Drive incluindo o acervo. | Autorizar a cópia completa; informar o vencimento do contrato do Auvo. |
| 1. Chamados e triagem | Abertura por telefone, e-mail e portal simples; triagem; prazo padrão por criticidade e exceção por cliente; pendências e avisos. | Chamados reais de duas semanas registrados no SGO+ (o campo continua no Auvo); prazos e avisos corretos; testes automáticos verdes. | Quem faz a triagem; prazos padrão; quais clientes têm prazo próprio. |
| 2. O.S. e lista de verificação no computador | O.S. ligada ao chamado ou ao Cronograma; 13 modelos convertidos e revisados; encerramento com trava; agenda da semana e conflitos. | Gestão aprova os 13 modelos; O.S. de teste preenchida e encerrada no computador; agenda sem conflito ignorado. | Quais tipos de serviço continuam; o que é obrigatório em cada modelo. |
| 3. Aplicativo do técnico | Instalável, agenda do dia, marcos, lista de verificação, fotos, relato, peças, assinatura, QR, trabalho sem internet e envio sem duplicar. | Piloto com um técnico por 2 semanas, incluindo atendimento sem sinal; nenhuma foto perdida ou duplicada; funciona nos celulares da equipe. | Celulares da equipe; quem é o técnico piloto; se o cliente assina na tela; liberar acesso externo. |
| 4. Relatório ao cliente e portal | Relatório A4 da O.S., envio, pasta do cliente e do equipamento, prontuário; portal do cliente para abrir e acompanhar chamados; orçamento do chamado. | Relatório aprovado pela gestão em 5 O.S. reais; três clientes piloto usando o portal. | Modelo do relatório; quais clientes entram no portal; se o orçamento do chamado entra já. |
| 5. Paralelo e desligamento | Todos os técnicos no SGO+; painéis lendo o módulo; histórico do Auvo para leitura; integração desligada. | Critério da seção 4.4 cumprido. | Data de aviso ao Auvo; destino do painel de vínculos. |

Ficam para depois, se o uso pedir: WhatsApp como canal de abertura, cadastro de contratos completo, controle de estoque de peças, módulo de Compras, reclamações com dono e prazo (Casos do COMMAND) e diagnóstico sugerido por inteligência artificial.

## 6. Perguntas para o dono

1. **Técnicos:** quantos técnicos vão usar o aplicativo e quem é o piloto?
2. **Tipos de serviço:** dos 30 tipos de tarefa e 13 questionários do Auvo, quais continuam? Há algum a juntar ou a eliminar?
3. **Assinatura:** o cliente assina na tela do celular do técnico? Em que casos se aceita encerrar sem assinatura?
4. **Contrato do Auvo:** quando vence, qual o valor mensal e qual o prazo de aviso para cancelar?
5. **Peças:** há estoque de peças a controlar, ou basta registrar as peças aplicadas em cada O.S.?
6. **Celulares e internet:** os técnicos usam celular da empresa ou próprio? Android ou iPhone? Há plano de dados? Em quais locais de atendimento falta sinal?
7. **Triagem:** quem faz a triagem dos chamados, e quem substitui nas ausências?
8. **Prazos:** há clientes com prazo de atendimento em contrato? Quais?
9. **Portal do cliente:** começa com quais clientes?

## Anexo A. Referências no código

Caminhos relativos a `projetos/google-script-dev/apps-script-imports/portal_sgo_versao_cnpj_db` (SGO+), `projetos/metrolabs_command` (COMMAND) e `projetos/sgo_servidor` (servidor).

| Assunto | Onde |
| --- | --- |
| Integração Auvo: arquivos | `SGO_Auvo_Config.js`, `SGO_Auvo_Main.js`, `SGO_Auvo_Incremental.js`, `SGO_Auvo_Push.js`, `SGO_Auvo_Reverso.js`, `SGO_Auvo_Pendencias.js`, `SGO_Auvo_Relatorio.js`, `SGO_Auvo_RelatorioIA.js`, `SGO_Auvo_Auditoria.js`, `SGO_Qualidade_Auvo.js`, `JS_Auvo.html` (cerca de 4.860 linhas nos .js) |
| O.S. completa copiada (orientação, endereço, questionário com fotos e assinatura, link da tarefa) | `SGO_Auvo_Incremental.js:43-50` |
| Fotos e assinaturas tratadas como endereço | `SGO_Auvo_Incremental.js:92-111` |
| Sincronização a cada 30 minutos | `SGO_Auvo_Incremental.js:356` |
| Avisos de O.S. a técnico, gestão e cliente | `SGO_Auvo_Incremental.js:538-561` |
| Frota lendo tarefas do Auvo | `SGO_Frota_Reservas.js:462` |
| Comercial: passar aos setores (TECNICA para o Cronograma) | `SGO_Comercial_Propostas.js:725-756` |
| COMMAND: etapas e regras do chamado | `Assistencia.js:1-45` |
| COMMAND: prazo contratual | `Assistencia.js:161-227` |
| COMMAND: criação, triagem, agenda e conflito | `Assistencia.js:325-380`, `630-800` |
| COMMAND: marcos de campo, assinatura, encerramento | `Assistencia.js:801-937` |
| COMMAND: avisos da assistência | `Assistencia.js:141-963` |
| COMMAND: aguardar peça e compras | `Assistencia.js:400-458`, `Compras.js` |
| COMMAND: reclamações, orçamento do chamado, portal, contratos | `Casos.js`, `OrcChamado.js`, `PortalClientePagina.html`, `Contratos.js` |
| Servidor: arquivos no disco servidos por endereço próprio | `src/servidor.ts:365`, `src/servicos/arquivos.ts` |
| Servidor: tamanho máximo do pedido (60 MB, cerca de 45 MB de arquivo em base64) | `src/servidor.ts:183` |
| Servidor: repetição sem registro em dobro | `src/servidor.ts` (cabeçalho do número do pedido), `testes/repeticao.test.ts` |
| Servidor: retirar restrição ao IP do escritório | `docs/DIA_DA_TROCA.md:24-25` |
