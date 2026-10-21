<!-- Versão em Markdown do documento C:\Users\venda\Documents\METROLABS_PROJETO_ASSISTENCIA_20261021\PROJETO_ASSISTENCIA_TECNICA_NO_SGO.html (fonte para impressão). -->

**METROLABS**

# Projeto: Assistência Técnica nativa no SGO+ e desligamento do Auvo

*Estudo para decisão do dono. Nenhum código foi alterado.*

|  |  |
| --- | --- |
| Número | PRJ-20261021-AST |
| Revisão | 00 |
| Data | 21/10/2026 |
| Elaborado por | Equipe de projeto (serviços de campo e engenharia clínica, software, aplicativo de campo e qualidade) |
| Para | Dono da empresa (decisão) |
| Situação | Proposta. Aguarda as respostas da seção 6. |

## Resumo para decidir

Hoje o Auvo é o aplicativo do técnico. É nele que o técnico recebe a tarefa, faz o check-in e o check-out, responde o questionário, tira as fotos e colhe a assinatura do cliente. O SGO+ só lê esses dados a cada 30 minutos. Com eles monta o painel de qualidade, as pendências de fechamento, as sugestões do Conduta, o deslocamento da Frota, o bloco de atendimentos do Início e a aba de atendimentos do equipamento. O SGO+ também cria uma tarefa concluída no Auvo para cada certificado, laudo de NR-13, registro operacional e PGT/POP emitido.

O COMMAND já tem uma Assistência Técnica bem desenhada e testada em ambiente de teste: chamado com 15 situações controladas, triagem, prazo por criticidade e por contrato, agenda com checagem de conflito, marcos de campo, assinatura na tela, O.S. que só fecha com a documentação completa, aviso de número de série divergente, orçamento do chamado, ligação com Compras e relatório da O.S. em A4. Nunca foi usada de verdade e não tem aplicativo de campo: o técnico usaria a tela web e as fotos ficariam no painel de anexos. Não há trabalho sem internet nem registro de localização.

**Recomendação.** Trazer a Assistência para o SGO+ em oito etapas pequenas, reaproveitando as regras do COMMAND e os cadastros, documentos e avisos do SGO+. O ponto novo de verdade é o aplicativo do técnico no celular. Ele é viável no servidor atual: o endereço próprio com conexão segura permite instalar o aplicativo pelo navegador e guardar o trabalho no aparelho quando falta internet. Pela ordem, a primeira etapa é **copiar para o servidor todo o acervo do Auvo, com as fotos e as assinaturas**, antes de qualquer outra coisa e muito antes de cancelar o contrato.

**Risco principal.** As fotos e as assinaturas dos atendimentos não estão no SGO+. Estão só no Auvo, e o SGO+ guarda apenas o endereço de cada imagem. Se o contrato terminar antes da cópia, esse material, que é evidência de serviço prestado a hospitais, se perde. O SGO+ também só tem as tarefas desde 26/08/2026: o histórico anterior, mais de cinco mil tarefas em dois anos, também está só no Auvo.

Decisões pedidas agora: aprovar a etapa 0 (cópia do acervo, só leitura no Auvo), informar o prazo do contrato com o Auvo e responder às perguntas da seção 6, que definem o tamanho das etapas 2 e 3.

## 1. O que o Auvo faz hoje para a Metrolabs

Esta seção descreve o Auvo pelo que a integração do SGO+ realmente lê e grava, pelos números medidos em agosto de 2026 e pelos achados das sessões sobre o Auvo. O que o Auvo oferece além disso não foi visto no código e está listado como dúvida no item 1.5.

### 1.1 O que a integração usa do Auvo

| Função no Auvo | Como aparece na integração | Situação medida |
| --- | --- | --- |
| Tarefa (a O.S. de campo) | Lida a cada 30 minutos: cliente, técnico, tipo, data, finalizada ou não, check-in, check-out, prioridade, orientação, endereço, link da tarefa e equipamentos ligados. | 5.174 tarefas em 2 anos; 338 abertas em 31/08/2026, 96% delas com sinal de execução. |
| Tipos de tarefa | O SGO+ lê só o nome do tipo em cada tarefa. Em 28/08/2026, os títulos dos 30 tipos foram reescritos uma única vez. | 30 tipos. Só 5 tinham exigências configuradas. Calibração e Qualificação não exigiam foto, assinatura nem relato. |
| Questionário (checklist) | Cada resposta é lida. Pergunta com a palavra "FOTO" conta como foto; com "ASSINATURA", como assinatura; o resto vira relato. | 13 questionários cadastrados. A foto é reconhecida pelo texto da pergunta, não por um campo próprio. |
| Fotos e assinatura | Chegam como endereço de imagem dentro da resposta do questionário. A assinatura geral da tarefa só serve para decidir se houve execução. | Não há cópia das imagens no SGO+. |
| Check-in e check-out | Só a data e a hora. | A localização do técnico não é lida. |
| Relato do serviço | Montado com as respostas de texto do questionário; o relato geral da tarefa só é usado nas pendências. | Muitas O.S. sem relato (painel de qualidade). |
| Finalizar a tarefa | Não é possível pelo SGO+: a interface de programação do Auvo não aceita mudar esse campo. | Testado ao vivo em 31/08/2026. Só fecha pelo aplicativo ou pelo site do Auvo. |
| Aplicativo do técnico | Usado pela equipe. A integração não depende dele diretamente. | 8 usuários no Auvo em 31/08/2026. |
| Clientes e equipamentos do Auvo | Lidos uma vez por dia (4h) e casados com o SGO+ pela raiz do CNPJ. O SGO+ também envia ao Auvo clientes, unidades e equipamentos, sem duplicar. | Cerca de 2.013 clientes no Auvo. Cadastros repetidos causaram o problema do IMED (15/10). |
| Tarefa criada pelo SGO+ | Cada documento emitido em quatro módulos gera uma tarefa concluída no Auvo, com o link do PDF. | Os demais documentos (RelCal, Declaração, Cronograma, CME, Autoclave, Cadeia de Frio, Estufa, Lavadora) não criam tarefa. |

A integração não usa agenda própria do Auvo, roteiro, quilometragem, equipes, envio de relatório ao cliente pelo Auvo nem portal do cliente do Auvo. Se a equipe usa alguma dessas funções direto no Auvo, o código não mostra. Veja o item 1.5.

### 1.2 O que o SGO+ faz com esses dados

| Onde no SGO+ | O que usa | Para quê |
| --- | --- | --- |
| Integração Auvo (módulo) | Tarefas, pendências, vínculos | Painel, O.S. completa na tela, pendências de fechamento com botão Cobrar, relatório A4 com interpretação, envio de cadastro ao Auvo, sincronização reversa. |
| Painel de qualidade | Relato, quantidade de fotos, check-in, check-out, questionário | Aponta O.S. concluída com registro incompleto; Cobrar e Parabenizar por técnico. |
| Programa de Conduta | Mesmos motivos e O.S. aberta há 3 dias ou mais | Sugestões de ocorrência (O.S. sem foto, sem relato, check-out esquecido, O.S. aberta). São só sugestões: nada vira ocorrência sozinho. |
| Frota (rastreamento) | Check-in e check-out do técnico | Tempo e quilômetros do deslocamento até cada atendimento, pela trilha do rastreador. A reserva de veículo pode citar a O.S. |
| Central de pendências e Caixa de decisões | O.S. aberta, O.S. sem vínculo, importação parada | Pendências da área Técnica com prazo de 3 dias (1 dia para importação parada). |
| Início | Tarefas do dia | Bloco "Atendimentos" e aviso com som de atendimento iniciado ou concluído (só no computador). |
| Equipamento (prontuário) | Equipamentos ligados à tarefa | Aba "Atendimentos" do equipamento. |
| Avisos de O.S. | Abertura e conclusão | E-mail e WhatsApp ao técnico, à gestão e ao cliente. Prontos, mas desligados por chave. |
| Painel de Vínculos | Tarefas abertas por cliente | Impede trocar o cliente de cadastro que tem tarefa aberta. |
| Assistente do ponto (COMMAND) | Check-in sem check-out de hoje | Às 17h55 sabe que o técnico está em atendimento; o "Esqueci de bater" leva a evidência do Auvo ao RH. |

O Cronograma de execução, o Comercial e os geradores de documentos de calibração e qualificação não leem dados do Auvo. O Comercial manda o pedido aprovado para a área Técnica como atividade no Cronograma e em Minhas atividades. Esses geradores apenas criam a tarefa no Auvo.

### 1.3 O que se perde se o Auvo for desligado sem substituto

| Perda | Efeito | Gravidade |
| --- | --- | --- |
| Aplicativo do técnico | O técnico deixa de receber a tarefa e de registrar chegada, saída, fotos, checklist e assinatura. | Para a operação |
| Fotos e assinaturas já colhidas | Os endereços guardados no SGO+ deixam de abrir. Some a evidência de serviço prestado. | Irreversível |
| Histórico anterior a 26/08/2026 | Só existe no Auvo. | Irreversível |
| Painel de qualidade, sugestões do Conduta, pendências de fechamento | Ficam sem fonte e passam a mostrar zero, o que parece bom mas é falta de dado. | Engana a gestão |
| Deslocamento da Frota até o atendimento | Sem check-in e check-out, não há como cruzar com a trilha do veículo. | Perde controle |
| Atendimentos no prontuário do equipamento e no Início | Param de crescer. | Perde histórico |
| Evidência do ponto (COMMAND) | O assistente do ponto deixa de saber quem está em atendimento. | Perde apoio |
| Tarefa do documento emitido | Hoje só registra no Auvo o documento já guardado no SGO+. | Sem perda real |

### 1.4 Fotos e assinaturas: o ponto de maior risco

O SGO+ não baixa nenhuma imagem do Auvo. Na tabela de tarefas fica só um texto com as perguntas e as respostas do questionário; a foto e a assinatura aparecem ali como endereço de uma imagem guardada no Auvo. Esse texto ainda é cortado em 45.000 caracteres, então tarefas com muitas fotos podem ter perdido endereços no corte. A assinatura geral da tarefa nem é guardada: só é usada para dizer se houve execução.

Quatro fatos tornam a cópia urgente:

- A cópia exige que a conta do Auvo esteja ativa: as imagens só se buscam com acesso à conta.
- Não sabemos se esses endereços vencem com o tempo nem se o Auvo entrega os dados depois do cancelamento.
- O SGO+ só tem tarefas desde 26/08/2026. Por decisão daquela data, o histórico ficou de fora.
- Para hospitais, a foto e a assinatura do atendimento podem ser cobradas em auditoria e em vigilância sanitária.

**Proposta (etapa 0):** uma rotina só de leitura no Auvo percorre todas as tarefas desde o início da conta, mês a mês. Para cada tarefa, guarda no servidor o registro completo, sem cortes, e baixa cada imagem: fotos, assinatura do questionário e assinatura da tarefa. As imagens vão para a pasta do cliente, com o número da tarefa no nome. A rotina confere tamanho e impressão digital de cada arquivo e entrega um relatório de conferência: tarefas lidas, imagens esperadas, imagens copiadas e faltas com o motivo. Antes de copiar, roda em modo contagem para medir o espaço necessário. O acervo copiado entra no backup diário criptografado que já existe. O Auvo só é cancelado depois que o relatório mostrar zero faltas ou faltas explicadas e aceitas pelo dono.

### 1.5 O que não sabemos sobre o Auvo

Não sabemos o que o Auvo oferece além do que a integração usa, e não vamos supor. Precisa ser confirmado com a equipe ou com o suporte do Auvo:

- Se a equipe usa no Auvo funções que o SGO+ não lê: roteiro do dia, quilometragem rodada, conversa com o técnico, pesquisa de satisfação, envio automático do relatório ao cliente, portal do cliente do Auvo, controle de estoque, equipes.
- Se o cliente recebe hoje algum relatório gerado pelo Auvo. Na leitura dos tipos de tarefa de 28/08 apareceu uma opção de "enviar a tarefa por e-mail", mas não sabemos se está ligada.
- Se os endereços das fotos vencem, se há exportação em massa e o que acontece com os dados depois do cancelamento.
- Prazo, multa e aviso prévio do contrato.
- Se o aplicativo do Auvo funciona hoje sem internet e se a equipe depende disso.

## 2. O que já existe para aproveitar

### 2.1 Assistência do COMMAND

A Assistência do COMMAND tem regras de negócio maduras e cerca de 230 verificações automáticas só no núcleo, mais de 900 contando os módulos ligados. Nunca teve uso real: o COMMAND não foi usado, e "maduro" aqui quer dizer "testado no ambiente de teste".

| Parte | O que faz | Situação |
| --- | --- | --- |
| Chamado e situações | 15 situações, de Aberto a Encerrado ou Cancelado, com transições controladas no servidor. Toda mudança grava evento com a hora do servidor. Tem proteção contra toque duplo. | Maduro |
| Abertura | Canais: telefone, WhatsApp, e-mail, portal e presencial. Exige equipamento, sintomas, solicitante, criticidade e prazo combinado. Marca reincidência (mesmo equipamento em 30 dias). | Maduro |
| Portal do cliente | Link de acesso por cliente. A solicitação entra numa caixa de entrada e alguém converte em chamado. O cliente acompanha em 5 etapas. | Maduro, sem uso |
| WhatsApp e e-mail de entrada | Atendente com IA que abre o chamado sozinho pelo WhatsApp. | Testado; depende de IA e da Meta; nunca visto em uso |
| Triagem | Checklist de 9 itens; 4 saídas: resolvido remotamente, aguardando orçamento, aguardando peça, planejado. IA de diagnóstico só sugere. | Maduro |
| Prazo (SLA) | Padrão por criticidade: P1 2 h para responder e 24 h para resolver; P2 4 h e 48 h; P3 24 h e 120 h; P4 48 h e 240 h. O contrato prevalece. Pode contar só o horário comercial. Pausa ao aguardar o cliente ou a peça, se o contrato permitir. "Em risco" quando resta 25%. | Maduro no essencial; prazos de reconhecimento, triagem e chegada do contrato não são usados; não há prazo por cliente sem contrato |
| Agenda e despacho | Só a gestão agenda. Exige técnico, duração e checklist de preparo: ferramentas, instrumentos calibrados, acesso, documentação, peças e risco. Avisa conflito de horário e deslocamento impossível, mas não bloqueia. Reagendar exige motivo. | Maduro |
| Campo | Marcos: saí, cheguei, iniciei, pausei, aguardando cliente ou peça, retomei, finalizei. Assinatura na tela com nome e documento. Fotos pelo painel de anexos. | Maduro na tela web; sem localização, sem trabalho offline, peças em texto livre |
| Encerramento da O.S. | Só fecha com série confirmada, condição encontrada, causa, serviço, peças, teste funcional, evidências, recomendações e assinatura (ou motivo para não ter). Série divergente avisa a gestão. | Maduro |
| Orçamento do chamado | O Comercial faz o orçamento ligado ao chamado e o envia por link. A aprovação volta sozinha e o chamado passa a Planejado. A Assistência não vê valores. | Maduro |
| Peças e compras | Aguardar peça cria uma requisição de compra; quando a peça chega, o chamado volta a Planejado. | Maduro; depende do Compras |
| Relatório da O.S. em A4 | Identificação, triagem, atendimento, serviço, quadro do prazo, linha do tempo e assinaturas. Até o fim da execução sai como rascunho. Versões nunca sobrescritas; envio por e-mail. | Maduro |
| Casos | Junta chamado, peça, missão e contrato num problema só, com dono e prazo; inclui reclamação do cliente. | Maduro; avaliar se vale trazer |
| Pesquisa de satisfação | Não existe. | Ausente |
| Aplicativo do técnico | Não existe. A execução em campo foi deixada para o Auvo. | Ausente |

### 2.2 O que o SGO+ já tem que serve

| Recurso | Uso na Assistência |
| --- | --- |
| Cadastro único de clientes, unidades e equipamentos, com Vínculos e consulta de CNPJ | Base do chamado. Acaba a duplicidade entre SGO+ e Auvo, origem do problema do IMED. |
| QR do equipamento e prontuário | O técnico lê o QR no local: abre o equipamento certo, confirma a série e vê o histórico. O cliente pode abrir chamado pelo QR. |
| Documentos A4 (capa, tabelas, fotos, assinaturas, PDF, gravação na pasta do cliente) | Relatório da O.S. no padrão da casa, com as fotos e a assinatura. |
| Enviar documento e e-mail | Envio do relatório ao cliente, com histórico. |
| Avisos por e-mail e WhatsApp, com modelos de chamado aberto e concluído já cadastrados | Avisos ao cliente e à gestão sem trabalho novo. |
| Minhas atividades, Caixa de decisões e Central de pendências | Pendências de O.S. aberta, documentação atrasada, prazo estourado e orçamento parado, com a cobrança até resolver. |
| Painel de qualidade, Conduta (sugestões) e ocorrências com ciência | Continuam iguais; só mudam de fonte. |
| Frota com rastreador (posição, rota, paradas, distância) | Deslocamento até o atendimento e checagem da chegada. |
| Comercial (pedido aprovado para a Técnica) | O pedido aprovado vira chamado ou O.S. planejada, em vez de atividade solta. |
| Geradores de certificados e laudos | O atendimento de calibração ou qualificação abre o gerador já com cliente, equipamento e técnico. |
| Ajuda "Como usar esta tela" e manuais por perfil | Cada tela nova nasce com ajuda, como as demais. |

### 2.3 O que o servidor próprio permite

- O SGO+ roda no servidor próprio, com endereço e conexão segura próprios. O acesso já é aberto fora do escritório (a restrição por IP ficou só como arquivo reserva), então o técnico em campo consegue entrar.
- Os arquivos ficam em disco no servidor, com o registro no banco. O backup diário vai para o Google Drive criptografado, inclusive os arquivos. Cada envio do navegador aceita até 60 MB; fotos reduzidas no próprio celular ficam bem abaixo disso.
- Arquivos internos só abrem com login; os marcados como públicos abrem pelo link, como no Drive. Isso serve para o relatório enviado ao cliente.
- Hoje o SGO+ não tem aplicativo instalável nem trabalho sem internet. No Google isso não era possível. No servidor próprio passou a ser: o endereço próprio com conexão segura é a condição para o navegador instalar o aplicativo e guardar dados no aparelho.

## 3. Proposta do módulo nativo

Princípios: um sistema só (SGO+); regras do COMMAND reaproveitadas, sem copiar o que não foi usado; o cadastro do SGO+ como fonte única; tela do celular feita para o celular, com poucos campos, igual para toda a equipe; toda trava diz o que aconteceu, por quê, o que fazer e como voltar; nenhum texto com cara de sistema estrangeiro ou de IA.

### 3.1 O caminho de um chamado

| Passo | Quem | Onde | O que o sistema exige |
| --- | --- | --- | --- |
| 1. Abertura | Atendimento, gestão, cliente (portal ou QR), Comercial (pedido aprovado), contrato (preventiva) | Computador ou portal | Cliente, equipamento (ou "não identificado" com descrição), sintoma, solicitante, criticidade. |
| 2. Triagem | Supervisor técnico | Computador | Checklist curto e decisão: remoto, orçamento, peça ou planejar visita. |
| 3. Agenda | Supervisor | Computador | Técnico, data, duração, tipo de serviço e preparo; aviso de conflito. |
| 4. Execução | Técnico | Celular | Saí, cheguei (com localização), QR ou série, checklist do tipo, fotos mínimas, relato, peças, assinatura, saí do cliente. |
| 5. Fechamento | Técnico e supervisor | Celular ou computador | Documentação completa; sem isso fica "documentação pendente" e vira cobrança. |
| 6. Entrega | Sistema | Automático | Relatório da O.S. em A4 na pasta do cliente e do equipamento, e envio ao cliente. |

### 3.2 Abertura e triagem

- **Interna** (telefone, e-mail, presencial): tela de abertura no computador, com busca do cliente e do equipamento pelo cadastro único.
- **Pelo cliente:** portal com link por cliente (modelo do COMMAND) e QR do equipamento ("Solicitar atendimento"). Tudo entra numa fila de solicitações; um atendente converte em chamado. O chamado não nasce sozinho, para não abrir chamado duplicado ou errado.
- **Por e-mail:** a caixa de e-mail do SGO+ ganha o botão "Abrir chamado" na mensagem.
- **Pelo WhatsApp:** fica para depois. O Atendente com IA do COMMAND existe, mas a estratégia de mensagens ainda está em definição. Quando vier, entra na mesma fila.
- **Triagem:** o checklist do COMMAND, reduzido aos itens que a equipe confirmar como úteis, com as quatro saídas.

### 3.3 Prazos de atendimento (SLA)

Primeiro, o prazo padrão por criticidade do COMMAND, com os números ajustados pelo dono. O prazo por contrato só entra quando os contratos vierem para o SGO+ (Contratos está na ordem sugerida dos próximos módulos). Pode ser em horário comercial ou corrido, pausa só quando o contrato permitir, e mostra o estado: em dia, em risco ou estourado. Recomenda-se usar também o prazo de chegada ao local, que o COMMAND guarda no contrato mas não usa, porque é o que o hospital mais cobra.

### 3.4 Agenda e despacho dos técnicos

- Quadro por técnico e por dia, com os atendimentos, as reservas de veículo e as ausências do ponto.
- Conflito de horário e deslocamento impossível são avisados e o supervisor confirma com motivo, como no COMMAND.
- Reagendar exige motivo e avisa o técnico. O cliente é avisado por e-mail; por WhatsApp, só quando os avisos ao cliente forem ligados.
- A agenda do técnico aparece no aplicativo do celular. No primeiro momento não há roteirização automática; a ordem do dia é do supervisor.

### 3.5 Tipos de serviço e checklists

Aqui o SGO+ corrige o que o Auvo não deixou corrigir. Os 30 tipos de tarefa de hoje viram tipos de serviço do SGO+, cada um com as suas exigências: relato, assinatura, número mínimo de fotos, checklist, leitura do QR e documento técnico a gerar. A tabela de 28/08/2026 já define o padrão: serviço técnico com relato, assinatura e 2 fotos; logística com relato, assinatura e 1 foto; Instalação com 3 fotos; Treinamento sem foto. Calibração e Qualificação passam a ter exigência, e "Visita técnica" fica no grupo mais exigente para não virar atalho. A Qualidade altera a regra e cada alteração fica registrada. Os 13 questionários do Auvo servem de ponto de partida para os checklists, revisados por tipo de equipamento.

### 3.6 Aplicativo do técnico no celular

É um aplicativo instalado pelo próprio navegador, com ícone na tela do celular, servido pelo mesmo servidor e com o mesmo login do SGO+. Não precisa de loja de aplicativos. Telas:

1. **Meu dia:** atendimentos na ordem, endereço com botão para abrir o mapa, contato do cliente.
2. **Atendimento:** botões grandes, um passo por vez: Saí, Cheguei, Ler QR do equipamento, Checklist, Fotos, Peças usadas, Relato, Assinatura do cliente, Concluir.
3. **Pendências:** o que falta para fechar, dito em palavras ("falta 1 foto e a assinatura").
4. **Envios:** o que ainda não subiu para o servidor, com a hora de cada item.

| Item | Como fica |
| --- | --- |
| Localização | Registrada só nos toques Cheguei e Concluí, nunca o tempo todo. A distância até o endereço da unidade é calculada; longe demais vira observação para a gestão, não bloqueio. |
| Fotos | Câmera do celular; a foto é reduzida no aparelho antes de enviar (cerca de 300 KB) e marcada com data, hora e número da O.S. |
| Assinatura | Quadro na tela, com nome e documento de quem assina (modelo do COMMAND). Sem assinatura, exige motivo. |
| Peças usadas | Lista com quantidade. Por enquanto em texto estruturado; a baixa de estoque depende de existir estoque (pergunta 6). |
| Sem internet | Ver abaixo. |

**Viabilidade do trabalho sem internet no servidor atual: viável, com cuidados.** O endereço próprio com conexão segura permite instalar o aplicativo e guardar no aparelho a agenda do dia, os checklists e uma fila de ações. Sem sinal, cada toque, foto e assinatura entra na fila com a hora do aparelho e uma chave única. Quando a internet volta, a fila sobe sozinha. A chave única impede registro em dobro; o COMMAND já usa essa proteção contra toque duplo. O servidor guarda as duas horas, a do aparelho e a do recebimento, e mostra as duas no relatório.

Cuidados: (1) o aparelho precisa abrir o aplicativo com internet ao menos uma vez no dia, para baixar a agenda; (2) em iPhone, dados de aplicativos de navegador podem ser apagados pelo próprio aparelho se o aplicativo ficar dias sem uso, então a fila deve subir sempre que houver sinal e a tela Envios precisa avisar o que está pendente; (3) atendimento criado fora da agenda, sem internet, fica como "provisório" até chegar ao servidor; (4) a assinatura e as fotos ficam no aparelho até subir, e o técnico é avisado se tentar sair com itens pendentes.

### 3.7 Relatório da O.S. em A4

Parte do relatório do COMMAND: identificação, equipamento com série confirmada, sintoma, condição encontrada, causa, serviço, peças, teste funcional, recomendações, quadro de prazos e linha do tempo. Acrescenta as fotos e a assinatura no padrão A4 do SGO+. Fica salvo em HTML e PDF na pasta do cliente e no prontuário do equipamento, e é enviado ao cliente pelo Enviar documento. Enquanto a documentação não fecha, sai marcado como rascunho. Nenhuma versão é sobrescrita.

### 3.8 Orçamento, peças e compras

- **Orçamento do chamado:** a triagem pede o orçamento e o Comercial do SGO+ faz a proposta ligada ao chamado (o Comercial já nasceu no SGO+). A aprovação do cliente leva o chamado a Planejado. A Assistência não vê valores, como no COMMAND.
- **Peças:** "aguardando peça" exige a referência da peça e, quando o Compras vier ao SGO+, gera a requisição. Até lá, vira atividade para o responsável por compras, com prazo.
- O relógio do prazo pausa só se o contrato permitir.

### 3.9 Qualidade e pendências

Os dependentes do item 1.2 passam a ler uma fonte única de atendimentos. Ela junta as tarefas do Auvo, enquanto houver, e as O.S. do módulo novo, com os mesmos campos que eles já usam: cliente, técnico, equipamentos, finalizada, check-in, check-out, relato, quantidade de fotos, checklist, endereço, link e dias aberta. Com essa troca de fonte, Qualidade, Conduta, Frota, Central, Início, Equipamento e Vínculos seguem funcionando durante o uso em paralelo, sem reescrita. Pendências novas que o módulo permite: documentação pendente há mais de 24 horas, prazo estourado ou em risco, chamado sem técnico, série divergente, orçamento parado, fila de envio parada num celular.

### 3.10 Ligações com o resto do SGO+

| Módulo | Ligação |
| --- | --- |
| Frota | Deslocamento até o atendimento pela trilha do rastreador, com o "Cheguei" do aplicativo; reserva de veículo ligada à O.S. |
| Ponto | "Técnico em atendimento" vem do módulo novo. Nada de aviso de ponto pelo atendimento fora do horário de trabalho. |
| Conduta | Só sugestões (O.S. sem foto, sem relato, sem saída, aberta), como hoje. Nada vira ocorrência sozinho. |
| Comercial | Pedido aprovado com serviço técnico cria O.S. planejada para a Técnica; o vendedor é avisado na conclusão. |
| Calibração e qualificação | O atendimento do tipo Calibração ou Qualificação abre o gerador do documento já preenchido. O documento emitido fica ligado à O.S. A tarefa no Auvo deixa de ser criada. |
| Cronograma de execução | As O.S. agendadas aparecem no cronograma da Técnica. |

### 3.11 Perfis e avisos

- **Técnico:** vê os próprios atendimentos.
- **Supervisor técnico:** triagem, agenda e todos os chamados da área.
- **Atendimento:** abre e acompanha.
- **Comercial:** só o orçamento.
- **Cliente:** só o portal, sem valores internos.
- **Diretoria:** tudo.

No celular, todo perfil da equipe vê o mesmo aplicativo.

Avisos seguem a regra já firmada: dentro do SGO+ e por e-mail, cobrando até resolver; WhatsApp para a equipe no máximo um resumo por dia útil, em horário de trabalho, sem insistência. Ao cliente, os modelos de chamado aberto e concluído já existem e serão ligados primeiro em teste, com lista de pessoas. A matriz de avisos de 21/10 fica valendo para os eventos da Assistência.

## 4. Migração e transição

### 4.1 Trazer o histórico do Auvo para leitura

- **Acervo completo** (etapa 0, item 1.4): todas as tarefas desde o início da conta, com o registro completo, fotos e assinaturas baixadas para o servidor, e relatório de conferência.
- **Leitura no SGO+:** as O.S. antigas aparecem no prontuário do equipamento e na ficha do cliente como "Atendimento do Auvo (histórico)", só leitura, com as fotos vindas do servidor e não mais do Auvo.
- **Vínculos:** o mapeamento de clientes, unidades e equipamentos que existe hoje (regra "vale o original") é usado para ligar o histórico ao cadastro. Tarefas sem vínculo vão para uma lista de revisão; nada se perde por falta de vínculo.
- **O.S. abertas no Auvo:** antes do desligamento, cada uma é fechada no Auvo ou recriada como chamado no SGO+. A lista de pendências de fechamento já existe e serve de roteiro.

### 4.2 Uso em paralelo

Primeiro um técnico, depois metade da equipe, depois todos. Atendimento novo nasce no SGO+; o que já estava no Auvo termina no Auvo. Durante o paralelo, a sincronização com o Auvo continua ligada e a fonte única de atendimentos mostra as duas origens. Não se registra o mesmo atendimento nos dois sistemas.

### 4.3 Critério para desligar o Auvo

1. Relatório da cópia do acervo com zero faltas ou faltas aceitas pelo dono, e o backup do acervo conferido.
2. Quatro semanas seguidas com todos os técnicos só no SGO+, sem atendimento perdido.
3. Painel de qualidade, Conduta e Frota mostrando os dados do módulo novo, conferidos pela gestão.
4. Nenhuma O.S. aberta no Auvo, ou cada uma com destino registrado.
5. Pelo menos um atendimento feito sem internet e sincronizado sem perda, conferido.
6. Relatório da O.S. aprovado pela Qualidade e já enviado a clientes reais.

Só então: desligar os gatilhos do Auvo no SGO+, retirar a criação de tarefa nos quatro geradores, trocar os textos de ajuda e cancelar o contrato.

### 4.4 Riscos

| Risco | Cuidado |
| --- | --- |
| Perder fotos e assinaturas do Auvo | Etapa 0 antes de tudo; cancelar só com o relatório de conferência aprovado. |
| Técnico sem internet no cliente (subsolo, centro cirúrgico) | Fila no aparelho, tela Envios, aviso de pendência; teste em cliente real antes de expandir. |
| iPhone apagando dados do aplicativo | Subir a fila sempre que houver sinal; teste com os aparelhos da equipe. |
| Treinamento e resistência à troca | Piloto com um técnico, roteiro de uma página, ajuda em cada tela, telas mais simples que as do Auvo. |
| Contrato do Auvo vencer no meio | Saber hoje o prazo e o aviso prévio; se for curto, renovar pelo menor período possível só para o paralelo. |
| Registro em dobro durante o paralelo | Regra clara: atendimento novo só no SGO+; fonte única mostra a origem. |
| Espaço em disco para o acervo | Modo contagem antes da cópia; o backup criptografado já cobre os arquivos. |
| Localização do técnico vista como vigilância | Só nos toques Cheguei e Concluí, informado por escrito à equipe; nada contínuo. |
| Painéis mostrando zero por falta de dado | Fonte única com as duas origens; aviso na tela quando a fonte estiver parada. |

## 5. Plano em etapas

Cada etapa é útil sozinha e tem critério de pronto. Antes de cada uma, o dono decide o que está indicado na coluna da direita.

| Etapa | Entrega | Pronto quando | O dono decide antes |
| --- | --- | --- | --- |
| 0. Cópia do acervo do Auvo | Rotina só de leitura no Auvo: tarefas completas, fotos e assinaturas no servidor, na pasta do cliente; relatório de conferência. | Relatório com todas as tarefas lidas e faltas explicadas; acervo no backup. | Aprovar a cópia; informar o prazo do contrato. |
| 1. Chamado no computador | Abertura interna, triagem, prazo padrão, agenda e encerramento com documentação, ainda sem aplicativo; relatório da O.S. em A4. | Supervisor registra chamados reais; relatório aprovado pela Qualidade. | Números do prazo padrão; quem faz a triagem. |
| 2. Tipos de serviço e checklists | Os 30 tipos com exigências; checklists por tipo de equipamento. | Qualidade aprova a tabela; cada tipo testado. | Quais tipos manter, juntar ou apagar; quem altera a regra. |
| 3. Aplicativo do técnico com internet | Meu dia, marcos com localização, QR, checklist, fotos, peças, relato, assinatura. | Um técnico usa por duas semanas em clientes reais. | Quem é o técnico piloto; assinatura na tela; uso da localização. |
| 4. Trabalho sem internet | Fila no aparelho, tela Envios, avisos de pendência. | Atendimento sem sinal sincronizado sem perda, em Android e iPhone. | Quais aparelhos a equipe usa. |
| 5. Fonte única de atendimentos | Qualidade, Conduta, Frota, Central, Início, Equipamento, Vínculos e ponto leem Auvo mais módulo novo. | Painéis conferidos pela gestão com dados das duas origens. | Nada novo, só conferir. |
| 6. Cliente e documentos | Portal do cliente e QR para pedir atendimento; caixa de e-mail com "Abrir chamado"; relatório enviado ao cliente; geradores de documento ligados à O.S. no lugar da tarefa do Auvo. | Cliente real pede atendimento e recebe o relatório. | Quais clientes recebem o portal; avisos ao cliente ligados ou não. |
| 7. Orçamento, peças e prazo por contrato | Orçamento do chamado pelo Comercial; peça com requisição (quando vier o Compras); prazo do contrato (quando vier o Contratos). | Chamado com orçamento aprovado volta sozinho a Planejado. | Ordem frente a Compras e Contratos. |
| 8. Paralelo e desligamento | Expansão para toda a equipe; critério do item 4.3. | Os seis itens do critério cumpridos. | Data de cancelamento do Auvo. |

WhatsApp de entrada (Atendente com IA), Casos e pesquisa de satisfação ficam fora destas etapas e entram depois, se o dono quiser.

## 6. Perguntas para o dono

1. Quantos técnicos vão a campo hoje? O Auvo tinha 8 usuários em agosto.
2. Qual o prazo do contrato com o Auvo, a multa e o aviso prévio? O Auvo entrega os dados depois do cancelamento?
3. A equipe usa no Auvo algo que o SGO+ não lê, como roteiro, quilometragem, conversa, pesquisa, relatório automático ao cliente, estoque ou equipes?
4. O cliente recebe hoje algum relatório do Auvo? Por e-mail, impresso ou nenhum?
5. O cliente vai assinar na tela do celular do técnico? Quando o responsável não está, quem pode assinar?
6. A empresa tem peças em estoque, ou compra peça por chamado?
7. Os técnicos usam celular próprio ou da empresa? Android, iPhone ou os dois?
8. Há clientes onde o celular fica sem sinal com frequência?
9. Os tipos de serviço de hoje (30) estão bons, ou podemos juntar alguns?
10. Quem faz a triagem e o despacho, e quem aprova o relatório da O.S.?
11. Os prazos padrão por criticidade do COMMAND (P1 2 h e 24 h; P2 4 h e 48 h; P3 24 h e 120 h; P4 48 h e 240 h) servem? Há contratos com prazo escrito?
12. Pode registrar a localização do técnico só nos toques Cheguei e Concluí?
13. Qual técnico faz o piloto?
14. Avisos ao cliente (chamado aberto e concluído) entram na primeira versão ou depois?

## Anexo A. Referências no código

Caminhos relativos às pastas: SGO+ = apps-script-imports/portal_sgo_versao_cnpj_db; COMMAND = metrolabs_command; Servidor = sgo_servidor.

| Assunto | Arquivo:linha |
| --- | --- |
| Endereços da API do Auvo usados (login, clientes, usuários, tarefas, equipamentos) | `SGO+ SGO_Auvo_Config.js:11-19` |
| Tabela de tarefas e colunas | `SGO+ SGO_Auvo_Incremental.js:28-53` |
| Foto e assinatura reconhecidas pelo texto da pergunta; relato | `SGO+ SGO_Auvo_Incremental.js:85-120` |
| Campos lidos da tarefa; questionário cortado em 45.000 caracteres | `SGO+ SGO_Auvo_Incremental.js:122-147` |
| Sincronização a cada 30 min; janela com tarefas abertas | `SGO+ SGO_Auvo_Incremental.js:279-357` |
| Avisos de O.S. (e-mail e WhatsApp, desligados por chave) | `SGO+ SGO_Auvo_Incremental.js:363-589` |
| O.S. completa na tela (lê só o que está guardado) | `SGO+ SGO_Auvo_Incremental.js:633-670` |
| Evidência de execução (relato, questionário, check-in, assinatura) | `SGO+ SGO_Auvo_Pendencias.js:40-45` |
| Campo "finalizada" só leitura na API | `SGO+ SGO_Auvo_Pendencias.js:5-10` |
| Envio de cliente e técnico; criação de tarefa com link do PDF | `SGO+ SGO_Auvo_Main.js:315-494` |
| Regra "vale o original" | `SGO+ SGO_Auvo_Main.js:259-285` |
| Envio de unidade e equipamento ao Auvo | `SGO+ SGO_Auvo_Push.js:1-30, 95-165, 236-396` |
| Sincronização reversa (clientes por raiz de CNPJ, equipamentos) | `SGO+ SGO_Auvo_Reverso.js:95-264, 638-686` |
| Quem cria tarefa no Auvo | `SGO+ SGO_NR13_Main.js:787; SGO_PgtPop_Main.js:222; SGO_RegOp_Main.js:478; SGO_CertCal_Main.js:1` |
| Motivos do painel de qualidade | `SGO+ SGO_Qualidade_Auvo.js:18-29` |
| Sugestões do Conduta vindas do Auvo | `SGO+ SGO_Conduta_Qualidade.js:234-266` |
| Deslocamento da Frota até o atendimento | `SGO+ SGO_Frota_Rastreamento.js:524-560` |
| Reserva de veículo ligada a O.S. | `SGO+ SGO_Frota_Reservas.js:70, 455-463` |
| Pendências do Auvo na central e prazos | `SGO+ SGO_Alertas_Central.js:126-134, 907-968; SGO_Gestao_Decisoes.js:79, 105` |
| Atendimentos no equipamento e no Início | `SGO+ SGO_Equipamentos.js:83-115; SGO_Main.js:201-309` |
| Vínculos e tarefas do Auvo | `SGO+ SGO_Vinculos.js:22-23, 126-131, 172-188` |
| Pedido aprovado para a Técnica | `SGO+ SGO_Comercial_Propostas.js:725-765; SGO_Comercial_Config.js:193-197` |
| Modelos de aviso de chamado aberto e concluído | `SGO+ SGO_Notificar.js:291-297` |
| Documento A4 com fotos e assinaturas | `SGO+ SGO_DocA4.js:391, 643, 658` |
| Ponto do COMMAND usando o Auvo | `COMMAND Ponto.js:16, 22, 428-431` |
| Situações e transições do chamado | `COMMAND Assistencia.js:1-56` |
| Prazo padrão, contrato, horário comercial | `COMMAND Assistencia.js:64-65, 161-215; Contratos.js:180-218` |
| Proteção contra toque duplo | `COMMAND Assistencia.js:224-249` |
| Triagem | `COMMAND Assistencia.js:623-695` |
| Conflito e agenda com preparo | `COMMAND Assistencia.js:700-793; Rotas.js:567` |
| Marcos de campo e numeração da O.S. | `COMMAND Assistencia.js:801-849` |
| Assinatura na tela | `COMMAND Assistencia.js:852-868` |
| Campos obrigatórios do encerramento; série divergente | `COMMAND Assistencia.js:872-934` |
| Fotos pelo painel de anexos | `COMMAND ModAssistencia.html:303` |
| Orçamento do chamado | `COMMAND OrcChamado.js:1-139` |
| Peça e requisição de compra | `COMMAND Assistencia.js:400-456; Compras.js:297, 944-945` |
| Portal do cliente | `COMMAND PortalCliente.js:144-485` |
| Atendente abre chamado pelo WhatsApp | `COMMAND Atendente.js:301-330` |
| Relatório da O.S. | `COMMAND Relatorios.js:195-391` |
| Modo misto com o Auvo (fotos e assinatura não importadas) | `COMMAND AuvoLideranca.js:1-17; AuvoSync.js:120, 254-281` |
| Papéis da Assistência | `COMMAND Papeis.js:19-20, 36-37, 45` |
| Testes da Assistência | `COMMAND testes/t_assistencia.js; t_zp_auditoria_ast.js; t_zz_aud_modulos.js; t_relatorios.js; t_zzzzzzz_orc_chamado.js` |
| Arquivos em disco e registro no banco | `Servidor src/servicos/arquivos.ts:1-30` |
| Limite de 60 MB por envio | `Servidor src/servidor.ts:183` |
| Arquivo interno só com login; público pelo link | `Servidor src/servidor.ts:365-380` |
| Backup diário criptografado, com arquivos | `Servidor deploy/backup/backup.sh:1-14` |
