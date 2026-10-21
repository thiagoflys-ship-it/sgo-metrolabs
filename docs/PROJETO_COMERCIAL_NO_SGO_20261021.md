<!-- Versão em Markdown do documento C:\Users\venda\Documents\METROLABS_PROJETO_COMERCIAL_20261021\PROJETO_COMERCIAL_NO_SGO.html (fonte para impressão). -->

**METROLABS**

# Projeto: trazer o Comercial do COMMAND para o SGO+

*Estudo para decisão do dono. Nenhum código foi alterado.*

|  |  |
| --- | --- |
| Número | PRJ-20261021-COM |
| Revisão | 00 |
| Data | 21/10/2026 |
| Elaborado por | Equipe de projeto (processos comerciais, software e qualidade) |
| Para | Dono da empresa (decisão) |
| Situação | Proposta. Aguarda as respostas da seção 7. |

## Resumo para decidir

O Comercial do COMMAND é a parte mais completa daquele sistema: tem cadastro de negociações por etapa, retorno obrigatório ao cliente, proposta em folha A4 com aceite do cliente por link e assinatura, trava de desconto por vendedor, encaminhamento do pedido aprovado aos setores, metas e relatórios. Foi construído e testado em simulador, mas **nunca foi usado por ninguém**: no pacote de dados de 16/10/2026 todas as tabelas comerciais estavam vazias (só os dois funis padrão gerados na primeira abertura).

O SGO+ já tem boa parte da base que o Comercial precisa: o cadastro único de clientes, unidades e equipamentos, Minhas atividades (prazo, responsável, Kanban, Gantt, cobrança até concluir), a Caixa de decisões da gestão com a escada de cobrança, o envio de documento ao cliente por e-mail e WhatsApp com histórico, o e-mail de cada colaborador, o padrão de documento A4 com cópia na pasta do cliente, a ajuda por tela e o assistente de dúvidas.

**Recomendação.** Não copiar o Comercial do COMMAND inteiro. Trazer para o SGO+, em quatro etapas pequenas, só o núcleo de uma venda:

1. oportunidades ligadas ao cliente e à unidade do SGO+, com etapa, valor, próxima ação e motivo da perda;
2. catálogo de produtos e serviços e proposta em A4, numerada e com revisão, salva na pasta do cliente e enviada pelo "Enviar documento" que já existe;
3. registro da resposta do cliente e passagem do pedido aprovado aos setores (técnica, compras, financeiro) como atividades com prazo;
4. painel do Comercial e relatório mensal em A4.

Os retornos ao cliente viram atividades do próprio SGO+ (Minhas atividades), as exceções de desconto viram itens da Caixa de decisões e os avisos seguem a regra já adotada: dentro do sistema até resolver, e-mail no expediente e WhatsApp só no resumo diário, primeiro no piloto. Ficam de fora, por ora, as cobranças automáticas a cada duas horas, o PIN do módulo, as funções de inteligência artificial, a comissão do vendedor e a biblioteca comercial. O link de aceite com assinatura, as metas e a ligação com as ordens de serviço do Auvo entram depois, se o uso pedir.

Antes de começar a etapa 1 são necessárias cinco decisões curtas (seção 7): quem são os vendedores e o gestor comercial, se o SGO+ passa a ter uma lista de contatos por cliente, se o valor das propostas fica escondido dos outros perfis, qual o limite de desconto sem aprovação e se o aceite do cliente começa manual ou já pelo link.

## 1. O que o Comercial do COMMAND faz hoje

O módulo fica no grupo "Comercial" do menu do COMMAND e só abre para quem tem o papel certo (Vendedor, Gestor comercial, Diretoria ou Administrador) e digita um PIN pessoal de seis números, gerado pelo administrador. Técnicos e outros papéis não veem o módulo nem os valores. O vendedor enxerga só as próprias negociações, tarefas e propostas; a gestão comercial e a Diretoria veem a equipe toda.

### 1.1 O caminho de uma venda, de ponta a ponta

Tabela 1 — Fluxo de uma venda no COMMAND

| Passo | O que acontece | Quem faz |
| --- | --- | --- |
| 1. Contato inicial | O vendedor cria uma negociação: título, cliente, contato principal, funil (Engenharia ou Produtos), etapa, valor estimado, origem (prospecção, indicação, carteira, licitação, site, WhatsApp e outras) e a próxima ação com data. Sem próxima ação o sistema não salva. Não existe uma tabela separada de "leads": o contato inicial já nasce como negociação na primeira etapa. | Vendedor |
| 2. Negociação | A negociação anda pelas etapas do funil (20%, 40%, 60%, 80% e 100% de chance). Cada contato com o cliente é registrado (ligação, WhatsApp, e-mail, reunião, visita), dizendo se o cliente respondeu, e sempre com o próximo passo marcado. Há conversa interna por negociação, com menção a colegas. | Vendedor |
| 3. Proposta | O vendedor monta o orçamento dentro da negociação: modelo (serviços, produtos ou misto), pacote de textos prontos, itens do catálogo, desconto, logística da viagem (quilômetros, diárias, hospedagem). O sistema confere o desconto e a margem contra o limite do vendedor. A proposta sai em folha A4 numerada (ORC-2026-0012) e com revisão (rev.2). | Vendedor; a gestão passa do limite informando o motivo |
| 4. Envio | Ao enviar, os dados do cliente e da empresa ficam congelados na proposta e o sistema gera um link próprio, que vence na validade e pode ser revogado. O envio pode ser por e-mail, pelo WhatsApp da empresa ou copiando o link. O PDF fica no cadastro do cliente. | Vendedor |
| 5. Aprovação | O cliente abre o link sem senha, lê a proposta e aprova (nome, CPF ou CNPJ, cargo, aceite das condições e assinatura no quadro) ou recusa com o motivo. Se a proposta mudou depois do envio, a aprovação é recusada. O sistema guarda o PDF assinado e um código de verificação. | Cliente |
| 6. Venda ganha ou perdida | A aprovação só sugere o ganho; quem marca "ganha" é o vendedor. A perda exige um motivo da lista e uma frase sobre o que aconteceu, e cancela as propostas enviadas daquela negociação. | Vendedor; reabrir só a gestão |
| 7. Pós-venda | O pedido aprovado precisa ser encaminhado aos setores. O vendedor escolhe Área técnica, Compras e/ou Financeiro; cada setor recebe uma pendência com prazo (2, 1 e 2 dias úteis) e uma lista de conferência. O setor assume e conclui contando o que fez (número da OS, do pedido de compra, da nota fiscal). Para Compras nasce também uma requisição por produto; o Financeiro cuida do faturamento e da bonificação de viagem dos técnicos. Técnica e Compras não veem o valor. | Vendedor encaminha; setores executam |
| 8. Passagem à operação | Além das pendências, nasce uma missão de implantação para o gestor operacional, com os itens vendidos e uma lista de conferência (cliente e unidade, contato, escopo, contrato, peça, execução), sem valores. | Automático |

### 1.2 Tela por tela

Tabela 2 — Telas do Comercial no COMMAND

| Tela | O que o vendedor faz | O que a gestão vê ou faz a mais |
| --- | --- | --- |
| Comercial (trava) | Digita o PIN de seis números para abrir o módulo naquela sessão. | O administrador gera e revoga os PINs. |
| Painel comercial | Vê a faixa "Hoje você precisa" (retornos atrasados, retornos de hoje, clientes esquecidos, propostas sem resposta), a lista de negociações paradas há muitos dias (chamadas de "zumbi"), a sugestão de mudar a estratégia quando o cliente não responde, o funil por etapa, o próprio painel (vendido no mês, comissão estimada, posição) com simulador de desconto, um "assistente do dia" com mensagens prontas, o roteiro de vendas (Playbook) e os documentos oficiais da área. | Tabela da equipe por vendedor, botão "Cobrar" vendedor, análise do funil pela inteligência artificial, ficha de cada vendedor (desconto máximo, margem mínima, faixas de comissão), relatórios e regras das cobranças automáticas. |
| Negociações | Quadro por etapas (arrastar o cartão no computador), criar negociação, registrar contato feito, agendar tarefa, agendar a cadência de 10 dias (seis tarefas de uma vez), ver histórico, conversa interna, propostas, perfil do cliente e sugestões da inteligência artificial; marcar ganha ou perdida. | Vê todas, filtra por vendedor, troca o responsável e reabre negociação encerrada. |
| Retornos ao cliente (follow-ups) | Lista das próprias tarefas em atrasadas, de hoje e próximas; concluir exige dizer o que aconteceu e marcar a próxima ação. | Vê as tarefas da equipe e agenda tarefa para outra pessoa. |
| Orçamentos | Cria, edita o rascunho, vê a folha A4, baixa o PDF, envia, faz nova revisão, duplica, reenvia com link novo, cancela, acompanha "visto", aprovado, recusado e expirado, encaminha aos setores. | Vê os de todos, passa do limite de desconto com motivo e mantém o modelo do orçamento (textos padrão, pacotes de serviço, valores da logística). |
| Produtos e serviços | Não vê a tela; usa o catálogo dentro do orçamento. | Cadastra itens com tipo, código, nome, categoria, unidade, preço de venda e custo; arquiva o que não é mais vendido. |
| Metas e relatórios | Vê as próprias metas do mês (alvo, realizado, projeção, quanto falta por dia) e relatórios dos próprios dados. | Define metas por vendedor ou da equipe (valor ganho, negociações ganhas, oportunidades novas, propostas enviadas, atividades concluídas), com motivo obrigatório para alterar; relatórios do funil, perdas, conversão, tempo por etapa, previsão, ranking; planilha e relatório A4; análise do mês pela inteligência artificial. |
| Biblioteca comercial | Lê os documentos oficiais (Política, Playbook, Planejamento, tabela de preços, modelos) e registra "Li e entendi" quando a leitura é obrigatória; pode perguntar ao documento. | Publica, importa e versiona os documentos e vê quem leu. |
| Pós-venda (pedidos aprovados) | Não é tela do vendedor: é a fila dos setores. | Gestor operacional e supervisores (área técnica), Compras e Financeiro assumem e concluem; Diretoria vê todas as filas. |

### 1.3 Regras que o sistema impõe

- Toda negociação aberta tem dono, valor, origem e próxima ação com data no futuro.
- Negociação sem atividade há 10 dias vira "zumbi": o vendedor precisa registrar um contato real ou a perda antes de qualquer outra coisa.
- Perda só com motivo da lista (preço, concorrente, sem verba, fora do perfil de cliente, demora na decisão, fora do escopo, falha de acompanhamento).
- Desconto do vendedor até o limite da ficha dele (padrão 15%) e margem mínima quando o item tem custo; passar do limite só a gestão, com motivo.
- Só rascunho pode ser editado; o que foi enviado muda apenas por nova revisão, e a revisão nova invalida o link anterior.
- O cliente aprova exatamente o que foi enviado: o conteúdo tem uma marca de conferência que é checada na aprovação.
- Os valores ficam só dentro do Comercial; os avisos que saem para o sino e para o SGO+ não levam valores.

### 1.4 Avisos e cobranças automáticas

O Comercial do COMMAND cobra muito. Uma rotina roda a cada hora no expediente e avisa o vendedor de negociação sem próxima ação ou com ação atrasada a cada 2 horas úteis, até 4 vezes por dia por negociação; escala para a gestão após 2 dias úteis de atraso; avisa cliente esfriando (7 dias), zumbi (10 dias), proposta sem resposta (lembrete no 2º dia útil, gestão no 5º), proposta vencendo (3 dias antes) e cliente da carteira sem contato há 60 dias. Há ainda um balão na tela "Você tem N clientes esperando retorno" e o botão "Cobrar" da gestão. No pós-venda, pedido aprovado sem encaminhamento avisa o vendedor e, depois de um dia útil, a gestão. Todos esses avisos entram no sino e, se os avisos por WhatsApp do COMMAND estiverem ligados, também na fila do WhatsApp (hoje desligados).

Esse volume contraria a regra adotada pelo dono em 19/10 e 20/10: dentro do sistema pode cobrar até resolver, e-mail no expediente, WhatsApp no máximo um resumo por dia útil, e toda função de envio nasce em piloto. Por isso a recomendação é não trazer essas rotinas como estão e usar a escada que o SGO+ já tem (seção 4.8).

### 1.5 O que está maduro, incompleto ou nunca testado

Tabela 3 — Situação de cada parte

| Parte | Situação | Comentário |
| --- | --- | --- |
| Negociações, etapas, próxima ação, perda com motivo | Maduro no código | Regras auditadas e com testes automáticos; nunca usado com cliente real. |
| Proposta A4, revisão, link com validade, aceite com assinatura | Maduro no código | A parte mais cuidada: dados congelados no envio, conferência do conteúdo, resposta única mesmo com dois cliques. Nunca recebeu resposta de cliente real. |
| Trava de desconto e margem por vendedor | Maduro no código | Depende de alguém cadastrar a ficha de cada vendedor e o custo dos itens; nada foi cadastrado. |
| Pós-venda por setor | Maduro no código | Os setores do COMMAND (Compras, Financeiro) não têm uso real hoje. |
| Cobranças automáticas e balão | Funciona, mas excessivo | Rodou em 14/10 a 16/10 sem nada a cobrar (registros "0 avisos"). Conflita com a regra de avisos. |
| Metas e relatórios | Maduro no código | Sem meta cadastrada, o painel mostra "sem meta". |
| Catálogo de produtos e serviços | Vazio | A tela existe; o catálogo nunca foi preenchido. |
| Ficha do vendedor e comissão | Incompleto para uso | Os valores de referência (meta de R$ 600 mil, ticket médio, comissão de 1% a 5%) vieram do Playbook e da Política; comissão é só estimativa, sem ligação com faturado ou recebido. |
| Orçamento ligado ao chamado da assistência | Sem uso possível hoje | Liga ao chamado do COMMAND, que ninguém usa; a assistência real roda no Auvo e no SGO+. |
| Inteligência artificial (assistente do dia, perfil do cliente, estratégia, análise do funil, análise do mês, perguntas à política) | Nunca testado com uso real | Só sugere; depende da chave e de dados reais, que não existem. |
| Envio pelo WhatsApp da empresa | Fora de uso | Usava a Z-API, que saiu do sistema em 20/10 (número misturado com conversas pessoais). |
| Biblioteca comercial | Vazia | Nenhum documento publicado. |

A leitura do código mostrou também pequenas falhas que não devem ser repetidas na versão do SGO+: a página do cliente promete um e-mail de confirmação da aprovação que nunca é enviado; a proposta só passa a "vencida" quando alguém abre o link (vencida e nunca aberta continua cobrando o vendedor); revogar o link deixa a proposta como "enviada"; perder a negociação cancela as propostas enviadas, mas não os rascunhos; e não há ligação entre a venda e o contrato aberto depois dela.

Uma limitação estrutural importa para o SGO+: a negociação e a proposta do COMMAND ficam presas ao *cliente*, sem unidade nem equipamento. No SGO+, quase tudo é organizado por unidade e por equipamento (pasta por CNPJ, vínculos, QR do equipamento). Na migração, a oportunidade e a proposta devem ganhar a unidade e, quando fizer sentido, os equipamentos.

### 1.6 Há dados para migrar?

No pacote exportado do COMMAND em 16/10/2026 (110 tabelas), as tabelas comerciais estavam vazias: negociações, atividades, propostas e seus itens, catálogo, contatos, metas, fichas de vendedor, encaminhamentos ao pós-venda, orçamento do chamado e biblioteca, todas com zero registros. Havia só os 2 funis e as 10 etapas criados sozinhos na primeira abertura e 12 marcas da rotina de cobrança dizendo "0 avisos". Os clientes, unidades e equipamentos do COMMAND (1.885, 1.967 e 1.404) são cópia do SGO+ e não precisam vir.

O COMMAND está no servidor próprio desde 17/10. Como ele nunca foi usado, a expectativa é que continue vazio, mas isso deve ser conferido antes da etapa 1 com a consulta só de leitura do Anexo B. Se aparecer algum registro real, ele é trazido na etapa correspondente; se não, nada é migrado e o Comercial começa do zero no SGO+.

## 2. O que o SGO+ já tem e serve ao Comercial

O objetivo desta seção é evitar construir de novo o que o SGO+ já faz. Cada item abaixo já está em produção no servidor próprio.

Tabela 4 — O que reaproveitar do SGO+

| O que existe no SGO+ | Como serve ao Comercial | Falta algo? |
| --- | --- | --- |
| Cadastros de clientes, unidades, equipamentos e vínculos (fonte única, busca de CNPJ, painel de vínculos) | A oportunidade e a proposta apontam para o cliente e a unidade do cadastro; não existe outro cadastro de empresas. O perfil Comercial já pode cadastrar e editar clientes, unidades e equipamentos; excluir e trocar vínculo fica com a gestão. | **Lista de contatos por cliente.** Hoje o cliente tem um campo de contato, e-mail e telefone, e a unidade tem um responsável e um telefone. Não há várias pessoas por cliente (quem compra, quem aprova, quem usa). O COMMAND tem essa tabela, vazia. |
| Minhas atividades e Atividades da equipe (responsável, prazo, situação, 5W2H, Kanban, Gantt, justificativa de atraso, cobrança no sistema até concluir, e-mail no expediente, WhatsApp só no resumo diário) | Cada próxima ação com o cliente e cada pendência do pós-venda vira uma atividade, com o módulo "Comercial" e o cliente e a unidade já previstos nas colunas da atividade. O vendedor vê os retornos de hoje no mesmo lugar em que vê o resto do trabalho. | A atividade não tem campo de origem; como já fazem o Programa de conduta e a Frota, o Comercial guarda do seu lado o número da atividade ligada a cada oportunidade, para abrir uma pela outra e concluir a atividade quando a oportunidade avança. |
| Caixa de decisões da gestão e escada de cobrança (na hora, e-mail diário às 8 h, WhatsApp após 2 dias úteis, Diretoria após 5) e avaliação do gestor | A exceção de desconto e a reabertura de venda perdida viram decisões da gestão, com prazo, quem decide e histórico. A própria caixa já trata vencimentos de calibrações e laudos de clientes como "acompanhamento", que é oportunidade comercial. | Registrar os novos tipos de pendência do Comercial e a área padrão "Comercial" para eles. A caixa mostra, cobra e leva à tela; a aprovação em si é feita na tela da proposta (a caixa não tem botão genérico de aprovar). |
| Central de pendências e notificador comum (sistema, e-mail e WhatsApp, com registro de cada envio e regras de uma mensagem por dia) | Todo aviso do Comercial passa por ele; não há outro sistema de avisos. | Uma categoria "COMERCIAL" com a mesma regra sutil das atividades, e o modo piloto em construção. |
| Enviar documento ao cliente (e-mail e/ou WhatsApp, contatos sugeridos do cliente e da unidade, histórico por cliente, tentar de novo, pedido repetido não envia duas vezes) | A proposta é enviada por aqui, sem uma tela de envio própria. | Cadastrar a pasta raiz das propostas na lista de pastas que o envio reconhece, como documento de cliente. |
| E-mail de cada colaborador (caixa pessoal do domínio, caixas compartilhadas por área, aviso de e-mail de cliente sem resposta) | O vendedor envia a proposta e responde ao cliente pela própria caixa; a caixa compartilhada do Comercial pode receber pedidos de orçamento. | Nada para começar. Depois: "Registrar no cliente" ligar o e-mail à oportunidade. |
| Documentos A4 (moldura comum, capa, sumário com páginas, cabeçalho e rodapé corridos, números em pt-BR, cópia HTML e PDF na pasta do CNPJ) | A proposta e o relatório mensal do Comercial usam a mesma moldura. | Escrever o gerador da proposta nessa moldura (o do COMMAND serve de modelo). |
| Áreas (CAD_USUARIOS.AREA; a área "Comercial" já existe) e perfis (ADMIN, DIRETORIA, GESTOR, TECNICO, METROLOGIA, COMERCIAL, FINANCEIRO, RH, CLIENTE) | O vendedor é o perfil Comercial; o gestor comercial pode ser um Gestor com área Comercial. | Não existe um perfil "Gestor comercial" separado. Decisão na seção 7. |
| Avisos com ciência ("Li e estou ciente", anexos) | Substitui a Biblioteca comercial: a gestão publica a Política ou o Playbook como aviso com leitura confirmada. | Nada. |
| Ajuda "Como usar esta tela", manuais e assistente "Tire sua dúvida" | Toda tela nova do Comercial nasce com ajuda e entra no assistente (regra do dono). | Escrever a ajuda das telas novas. |
| Programa de conduta (o catálogo já tem os itens COM-01 a COM-06 do Comercial, como proposta enviada sem validação técnica) | As regras de conduta do Comercial já existem; o módulo novo só precisa respeitá-las. | Nada para começar. |
| Bate-papo interno | Substitui a conversa interna por negociação. | Nada. |
| Integração com o Auvo (ordens de serviço) | Mais tarde, a proposta de reparo pode nascer de uma O.S. do Auvo e, aprovada, voltar a ela. | Fica para depois. |

Existe também no SGO+ um esboço antigo de orçamentos (13 tabelas desenhadas em maio de 2026, nunca criadas no banco) e uma tela "Orçamento de escopo" dos padrões de referência, que é interna e não é proposta comercial. Nenhum dos dois atrapalha; o esboço antigo deve ser descartado formalmente para não haver duas ideias de orçamento no código. Um cuidado: a solicitação de orçamento dos padrões já usa o número "ORC-aaaammdd-hhmm". Para a proposta ao cliente não se confundir com ela, sugere-se outra sigla (por exemplo "PROP-2026-0001") ou manter "ORC-2026-0001" e renomear a dos padrões (pergunta 11).

## 3. Recomendação: o que trazer, o que trazer depois e o que deixar de fora

O critério foi: trazer o que uma venda precisa para sair do contato e chegar ao pedido nos setores, sem nada que só faria sentido com uma equipe comercial grande ou com uso que ainda não existe. Nada aqui é função nova: tudo existe hoje no COMMAND ou no SGO+.

### 3.1 Trazer (essencial)

Tabela 5 — Itens essenciais

| Item | Como entra no SGO+ | Motivo |
| --- | --- | --- |
| Oportunidade (negociação) | Tela nova ligada ao cliente e à unidade do SGO+, com título, valor estimado, origem, etapa, responsável e situação (aberta, ganha, perdida). | É o centro do Comercial. Sem ela não há funil nem proposta. |
| Funis e etapas do Playbook | Os dois funis do COMMAND (Engenharia e Produtos, 5 etapas, 20% a 100%), editáveis pela gestão. | Já estão escritos a partir do Playbook da empresa. |
| Próxima ação obrigatória | Toda oportunidade aberta tem uma atividade futura em Minhas atividades; concluir a atividade pede o próximo passo. | É a regra principal do Playbook ("nenhum cliente sem próximo passo") e usa o que o SGO+ já cobra. |
| Registro de contato e histórico | Ligação, WhatsApp, e-mail, reunião ou visita, com "respondeu ou não" e o que aconteceu. | Dá o histórico do cliente e mostra quem está sem retorno. |
| Perda com motivo e reabertura pela gestão | Lista de motivos do COMMAND; reabrir é decisão da gestão. | Sem motivo, o relatório de perdas não ensina nada. |
| Catálogo de produtos e serviços | Nome, tipo, unidade, preço de venda; custo opcional e visível só à gestão. | Padroniza preços e descrições das propostas. |
| Proposta em A4 | Número, revisão, validade, itens, desconto, condições, textos padrão; moldura A4 do SGO+; cópia na pasta do CNPJ; envio pelo "Enviar documento". | É o documento que o cliente recebe. A lógica do COMMAND (dados congelados no envio, só rascunho edita, revisão substitui) é boa e deve ser mantida. |
| Limite de desconto com aprovação | Um limite geral (ou por vendedor) e, acima dele, a proposta vai para a Caixa de decisões antes do envio. | Protege a margem sem bloquear a venda. |
| Resposta do cliente | Registro manual da aprovação ou recusa, com o arquivo do aceite (e-mail, pedido de compra, proposta assinada) anexado. | É como o cliente aprova hoje. O link com assinatura vem depois (3.2). |
| Passagem aos setores | Pedido aprovado gera atividades para Técnica, Compras e Financeiro, com prazo e lista de conferência, sem valor para quem não é do Comercial. | É o elo que hoje se perde entre vender e executar; usa Minhas atividades, sem fila nova. |
| Painel do Comercial | O que espera o vendedor hoje, oportunidades paradas, propostas sem resposta, funil por etapa, ganho e perdido no mês. | A gestão precisa ver o funil sem planilha à parte. |

### 3.2 Trazer depois (útil, quando o uso pedir)

Tabela 6 — Itens para uma segunda fase

| Item | Motivo para esperar |
| --- | --- |
| Link de aceite com assinatura do cliente | Está maduro no COMMAND, mas abre uma página pública no SGO+ (sem login) e precisa de cuidado de segurança e de teste com cliente real. Vale trazer quando o registro manual mostrar volume. |
| Metas mensais e relatório A4 do mês | Só fazem sentido depois de dois ou três meses de dados reais no funil. |
| Modelos de proposta por tipo de serviço (pacotes de textos) e logística da viagem (quilômetros, diárias, hospedagem diluídas ou detalhadas) | Úteis para propostas de qualificação e calibração fora da cidade; entram quando os textos padrão estiverem aprovados. |
| Oportunidades a partir de vencimentos | O SGO+ já sabe quando vence a calibração, a qualificação ou o laudo de cada equipamento de cliente e mostra isso como acompanhamento. Um botão "Criar oportunidade" nessa lista transforma o vencimento em venda. Depende da etapa 1 estar em uso. |
| Proposta ligada a O.S. do Auvo ou ao equipamento | Equivale ao "orçamento do chamado" do COMMAND, mas sobre o Auvo, que é o que a equipe usa. |
| Ficha do vendedor (desconto máximo, margem mínima por pessoa) | Com um ou dois vendedores, um limite geral basta. |
| Cliente esquecido da carteira (sem contato há N dias) | Entra como item do painel, sem aviso automático, quando houver carteira registrada. |

### 3.3 Deixar de fora (por ora)

Tabela 7 — Itens que não vêm

| Item | Motivo |
| --- | --- |
| Cobranças automáticas a cada 2 horas úteis, até 4 por dia por negociação; balão "clientes esperando retorno"; botão "Cobrar vendedor" | Conflitam com a regra de avisos. A atividade atrasada já é cobrada pelo SGO+ (sistema até resolver, e-mail no expediente, resumo diário). |
| PIN de seis números para abrir o Comercial | No SGO+ o acesso é pelo perfil. Uma segunda senha cria suporte (PIN esquecido, PIN gerado só pelo administrador) sem ganho real se o servidor já esconde os valores de quem não é do Comercial. Decisão na seção 7. |
| Inteligência artificial do Comercial (assistente do dia, perfil do cliente, estratégia, análise do funil e do mês, perguntas à política, texto da proposta) | Sem dados reais ela não tem o que analisar; volta a ser avaliada depois de alguns meses de uso. O assistente de dúvidas do SGO+ continua respondendo sobre as telas. |
| Comissão estimada, ranking e simulador de comissão | Comissão envolve regra de RH e Financeiro (faturado ou recebido) que não está definida; mostrar número estimado gera expectativa errada. |
| Biblioteca comercial | Avisos com ciência do SGO+ já fazem a publicação com leitura confirmada. |
| Conversa interna por negociação | O bate-papo do SGO+ cobre. |
| Cadência automática de 10 dias (6 tarefas de uma vez) | Pode virar um modelo de atividades mais tarde; criar seis tarefas de uma vez enche a lista no começo. |
| Envio da proposta pela Z-API | A Z-API saiu do sistema. O WhatsApp segue pelo canal oficial e pelo "Enviar documento", dentro do piloto. |
| Missão de implantação do COMMAND | O SGO+ não tem missões; as atividades para os setores fazem esse papel. |
| Contratos, Compras, Assistência e Metrologia do COMMAND | São os próximos módulos, um de cada vez, depois que o Comercial estiver em uso. |

## 4. Como ficará no SGO+

### 4.1 Telas

Um grupo novo "Comercial" no menu, visível só aos perfis da tabela 9, com quatro telas na primeira fase. Cada tela nasce com "Como usar esta tela" e entra no assistente de dúvidas.

Tabela 8 — Telas propostas

| Tela | Conteúdo | Etapa |
| --- | --- | --- |
| Oportunidades | Quadro por etapa do funil e lista; filtros por responsável, cliente, etapa e situação; ficha da oportunidade com cliente, unidade, contato, valor, origem, histórico de contatos, atividades, propostas e documentos enviados. | 1 |
| Propostas | Lista com situação (rascunho, aguardando aprovação interna, enviada, aprovada, recusada, vencida, cancelada); editor de itens; ver e baixar a folha A4; enviar; nova revisão; registrar resposta do cliente; passar aos setores. | 2 e 3 |
| Produtos e serviços | Catálogo; gestão cadastra e altera; vendedor só consulta dentro da proposta. | 2 |
| Painel comercial | "Hoje você precisa", funil, propostas sem resposta, oportunidades paradas, ganho e perdido no mês, perdas por motivo; visão da equipe para a gestão. | 4 |

Na ficha do cliente (Cadastros) aparece um quadro "Comercial" com as oportunidades e propostas daquele cliente, visível só a quem pode ver o Comercial.

### 4.2 Perfis e permissões

Tabela 9 — Quem faz o quê

| Ação | Comercial (vendedor) | Gestor comercial | Diretoria | Financeiro | Demais perfis |
| --- | --- | --- | --- | --- | --- |
| Ver oportunidades e propostas | Só as próprias | Todas | Todas | Só aprovadas, para faturar | Não |
| Criar e trabalhar oportunidade | Sim | Sim, e trocar responsável | Sim | Não | Não |
| Reabrir oportunidade encerrada | Não | Sim, com motivo | Sim, com motivo | Não | Não |
| Montar e enviar proposta | Sim, dentro do limite | Sim | Sim | Não | Não |
| Aprovar desconto acima do limite | Não | Sim (Caixa de decisões) | Sim | Não | Não |
| Manter catálogo, preços e textos padrão | Não | Sim | Sim | Não | Não |
| Ver custo e margem | Não | Sim | Sim | Não | Não |
| Registrar resposta do cliente | Sim (as próprias) | Sim | Sim | Não | Não |
| Receber pedido aprovado (atividade do setor) | — | — | Vê todos | Sim, com dados de faturamento e valor | Técnica e Compras: sim, sem valor |
| Painel e relatórios | Os próprios números | Equipe | Equipe | Não | Não |

"Gestor comercial" pode ser, sem perfil novo, um usuário de perfil Gestor com a área Comercial no cadastro. O Administrador segue o mesmo acesso da Diretoria. O servidor confere o perfil em toda chamada; esconder botão na tela não basta.

O Financeiro precisa ver o valor do pedido aprovado para faturar. Os perfis Técnico, Metrologia e RH não veem valores em nenhuma tela, como já acontece no COMMAND.

### 4.3 Dados

As tabelas novas ficam no banco principal do SGO+, criadas sob demanda como as de Minhas atividades e da Caixa de decisões, com nada apagado (exclusão lógica e histórico):

- **COM_OPORTUNIDADES**: cliente, unidade, contato, título, funil, etapa, valor estimado, origem, responsável, situação, motivo e aprendizado da perda, datas (entrada na etapa, último contato, ganho, perda).
- **COM_FUNIS** e **COM_ETAPAS**: os dois funis do Playbook.
- **COM_CONTATOS_REGISTRO**: cada contato feito com o cliente (tipo, respondeu ou não, o que aconteceu).
- **COM_PRODUTOS**: catálogo.
- **COM_PROPOSTAS** e **COM_PROPOSTA_ITENS**: número, revisão, validade, itens, totais, dados do cliente congelados no envio, marca de conferência do conteúdo, resposta do cliente e arquivo do aceite.
- **COM_HISTORICO**: mudanças de etapa, revisões, decisões de desconto, reaberturas.
- **CAD_CONTATOS** (se aprovado): pessoas do cliente e da unidade, com cargo, papel (compra, aprova, usa), e-mail e celular. Serve ao Comercial, ao "Enviar documento" e, mais tarde, aos avisos de O.S. do Auvo ao cliente.

Os retornos ao cliente não ganham tabela própria: são atividades de Minhas atividades com o módulo "Comercial", o cliente, a unidade e a referência da oportunidade. As pendências dos setores também.

**Migração:** pelo pacote de 16/10 não há nada a trazer do COMMAND. Antes da etapa 1, rodar a consulta do Anexo B no servidor; se vier zero, não há migração. Os dois funis e o modelo de textos da proposta podem ser copiados do código do COMMAND como ponto de partida.

### 4.4 Ligações com o resto do SGO+

- **Cliente, unidade e equipamento:** a oportunidade e a proposta usam os identificadores do cadastro; o cliente não é digitado. A proposta pode listar equipamentos da unidade como itens (por exemplo, "qualificação térmica da autoclave TAG AC-01").
- **Atividades:** próxima ação e pendências dos setores. Concluir a atividade de retorno abre o registro do contato; ganhar ou perder a oportunidade encerra as atividades abertas dela.
- **Caixa de decisões:** desconto acima do limite, reabertura de venda encerrada e pedido aprovado parado, com quem decide (gestor da área Comercial; sem ele, a Diretoria). A decisão é registrada na tela da proposta; a caixa mostra, cobra pela escada e leva até lá.
- **Documentos:** a proposta salva na pasta do CNPJ entra no histórico de documentos do cliente.
- **Financeiro:** a atividade de faturamento leva os dados do cliente, a condição de pagamento e o valor; o SGO+ não emite nota fiscal nem controla recebimento nesta fase.
- **COMMAND:** enquanto o Comercial do SGO+ não estiver em uso, o do COMMAND fica como está (sem uso). Quando o do SGO+ estiver aprovado, o grupo Comercial sai do menu do COMMAND, para não haver dois lugares de venda.

### 4.5 E-mail e WhatsApp

- **Proposta ao cliente:** sempre por ação do vendedor, pelo "Enviar documento", com o PDF anexo. E-mail pela caixa pessoal do vendedor (ou a do sistema com "responder para" o vendedor). WhatsApp só pelo número oficial do sistema e só depois de o piloto do WhatsApp terminar.
- **Avisos internos:** no sistema na hora; e-mail no expediente; WhatsApp apenas dentro do resumo diário que o SGO+ já manda (no máximo uma mensagem por pessoa por dia útil, no horário de trabalho, nunca à noite ou no fim de semana).
- **Mensagem ao cliente pelo WhatsApp fora do envio de documento:** não entra nesta fase.

### 4.6 Documentos: proposta em A4

A proposta usa a moldura A4 do SGO+ (cabeçalho e rodapé corridos, "Página X de Y", números e datas em pt-BR, texto justificado), em retrato. Conteúdo, aproveitando o gerador do COMMAND: identificação do cliente e da unidade, apresentação, escopo, tabela de itens (Tabela 1), condições (pagamento, prazo de execução, garantia, frete, impostos), responsabilidades, validade e campo de aceite. Nome do arquivo no padrão do SGO+: "Proposta comercial - ORC-2026-0012 rev.02 - <cliente> - aaaa-MM-dd HHmm", com HTML e PDF na pasta do CNPJ. A proposta interna com custo e margem nunca vai para a pasta do cliente.

### 4.7 Indicadores e relatórios

Tabela 10 — Indicadores da primeira fase

| Indicador | Como se conta | Quem vê |
| --- | --- | --- |
| Oportunidades abertas e valor em aberto, por etapa | Situação aberta, na data da consulta | Vendedor (as suas), gestão |
| Oportunidades com próxima ação em dia | Abertas com atividade futura e não atrasada, sobre o total aberto | Vendedor, gestão |
| Propostas enviadas, aprovadas e recusadas no mês | Pela data de envio e de resposta | Vendedor, gestão |
| Taxa de aprovação | Aprovadas sobre respondidas no período | Gestão |
| Valor ganho no mês | Soma das oportunidades ganhas pela data do ganho | Vendedor (o seu), gestão |
| Perdas por motivo | Contagem e valor por motivo | Gestão |
| Tempo até a primeira proposta | Da criação da oportunidade ao primeiro envio | Gestão |
| Pedidos aprovados ainda sem passagem aos setores | Aprovados sem atividades dos setores | Gestão |

O relatório mensal em A4 (com os mesmos indicadores e gráficos em SVG) entra na etapa 4. Metas e previsão ponderada ficam para depois (seção 3.2).

### 4.8 Avisos: quem recebe o quê (proposta inicial para a matriz de avisos)

Tabela 11 — Matriz de avisos do Comercial

| Acontecimento | Quem recebe | No sistema | E-mail | WhatsApp |
| --- | --- | --- | --- | --- |
| Próxima ação vence hoje ou atrasou | Responsável | Sim, até resolver | No expediente, uma vez | Só no resumo diário |
| Próxima ação atrasada há 2 dias úteis | Gestor da área Comercial | Sim (Caixa de decisões) | No e-mail diário das 8 h | Pela escada da gestão |
| Proposta aguardando aprovação de desconto | Gestor da área Comercial; sem ele, Diretoria | Sim (Caixa de decisões) | No e-mail diário das 8 h | Pela escada da gestão |
| Desconto aprovado ou negado | Vendedor | Sim | Não | Não |
| Proposta sem resposta do cliente no 2º dia útil; vencendo em 3 dias | Vendedor | Sim (entra como atividade "ligar ao cliente") | Não | Não |
| Cliente aprovou ou recusou (registrado) | Vendedor e gestor comercial | Sim | Sim | Não |
| Pedido aprovado passado aos setores | Responsável de cada setor | Sim (atividade) | No expediente | Só no resumo diário |
| Setor concluiu sua parte | Vendedor | Sim | Não | Não |
| Pedido aprovado sem passagem aos setores há 1 dia útil | Gestor comercial | Sim (Caixa de decisões) | No e-mail diário das 8 h | Pela escada da gestão |

Nenhum aviso leva valor fora do Comercial. Nenhum aviso vai ao cliente sozinho: o que vai ao cliente é sempre o envio de documento feito pelo vendedor. Durante o piloto, os avisos fora do sistema seguem a lista de pessoas do piloto.

## 5. Plano em etapas

Cada etapa é pequena, útil sozinha e testável com o próprio dono e um vendedor antes da seguinte. Nenhuma etapa é publicada sem os testes automáticos verdes, sem a ajuda das telas escrita e sem um roteiro de teste com dados reais.

### Etapa 0 — Conferência e decisões (sem código)

- Rodar a consulta do Anexo B no servidor e registrar o resultado.
- Responder as perguntas da seção 7.
- Juntar o material: Playbook e Política comercial em vigor, modelo de proposta usado hoje (Word ou PDF), lista inicial de serviços e preços.

**Pronto quando:** as respostas estiverem registradas e o material entregue.

### Etapa 1 — Oportunidades ligadas ao cliente

- Tela Oportunidades (quadro por etapa e lista), funis do Playbook, ficha da oportunidade.
- Próxima ação obrigatória como atividade de Minhas atividades; registro de contato; ganho e perda com motivo; reabertura pela gestão via Caixa de decisões.
- Lista de contatos do cliente, se aprovada.
- Quadro "Comercial" na ficha do cliente; ajuda das telas.

**Pronto quando:** o vendedor cria uma oportunidade de um cliente real em menos de um minuto; a atividade aparece em Minhas atividades no prazo certo; a perda não salva sem motivo; um usuário Técnico não vê o grupo Comercial e o servidor recusa a chamada direta; o gestor vê as oportunidades de todos.

**Riscos:** excesso de campos obrigatórios afastar o vendedor (manter o mínimo do COMMAND); atividade duplicada se a pessoa também lançar à mão (a oportunidade mostra a atividade ligada).

**Decidir antes:** perguntas 1, 2, 3 e 6.

### Etapa 2 — Catálogo e proposta em A4

- Catálogo de produtos e serviços.
- Proposta: rascunho, itens, desconto, validade, número e revisão; folha A4 na moldura do SGO+; cópia HTML e PDF na pasta do CNPJ; envio pelo "Enviar documento".
- Desconto acima do limite vai para a Caixa de decisões antes do envio.

**Pronto quando:** uma proposta real é montada, conferida em PDF pelo checklist A4 do SGO+ (orientação, quebras, números pt-BR, sem repetição), salva na pasta certa e enviada por e-mail a um endereço de teste; a revisão nova mantém o número e marca a anterior como substituída; o desconto acima do limite não deixa enviar até a decisão.

**Riscos:** textos padrão da proposta sem aprovação jurídica ou da Diretoria; cliente sem CNPJ na unidade (pasta pelo nome, como no padrão).

**Decidir antes:** perguntas 4, 5, 7 e 11.

### Etapa 3 — Resposta do cliente e passagem aos setores

- Registrar aprovação ou recusa com o arquivo do aceite.
- Pedido aprovado gera atividades para Técnica, Compras e Financeiro, com prazo e lista de conferência (as do COMMAND como ponto de partida), sem valor para Técnica e Compras.
- O vendedor acompanha na proposta o andamento de cada setor.

**Pronto quando:** um pedido de teste aprovado chega às três pessoas certas, cada uma conclui contando o que fez, o vendedor vê tudo concluído, e o técnico não vê o valor em nenhuma tela.

**Riscos:** setores sem responsável definido (a atividade cai para a gestão); pedido aprovado esquecido sem passagem (aviso à gestão em 1 dia útil).

**Decidir antes:** pergunta 8.

### Etapa 4 — Painel e relatório mensal

- Painel comercial com os indicadores da tabela 10; visão da equipe para a gestão.
- Relatório mensal em A4.
- Retirar o grupo Comercial do menu do COMMAND.

**Pronto quando:** os números do painel batem com uma contagem manual de um mês de teste; o relatório A4 passa no checklist; o COMMAND não mostra mais o Comercial.

### Depois das quatro etapas

Com o Comercial em uso por um ou dois meses, avaliar com o dono, nesta ordem: oportunidades a partir de vencimentos, link de aceite com assinatura, modelos de proposta e logística da viagem, metas, ligação com O.S. do Auvo. Só então começar o próximo módulo do COMMAND.

## 6. Riscos gerais e cuidados

- **Dois lugares de venda.** Enquanto o COMMAND mostrar o Comercial, alguém pode usar o de lá. Recomendação: manter o PIN do COMMAND sem distribuir e retirar o grupo do menu na etapa 4.
- **Valores à vista de quem não deve.** O controle tem que estar no servidor (perfil conferido em cada chamada), nos avisos (sem valores) e nos documentos (proposta interna com custo nunca vai à pasta do cliente).
- **Avisos demais.** Toda cobrança do Comercial passa pelo notificador do SGO+ e pela escada da gestão; nada de rotina própria.
- **WhatsApp.** Só número oficial, só depois do piloto, só por ação do vendedor ao enviar documento.
- **Copiar código antigo sem revisar.** O COMMAND roda em outro padrão (missões, sino próprio, PIN). Trazer as regras, não os arquivos.
- **Dados pessoais.** Contatos de clientes são dados pessoais: só quem trabalha com o cliente vê, e o envio fica registrado.

## 7. Perguntas para o dono

1. Quem são hoje os vendedores e quem é o gestor comercial? O gestor comercial pode ser um usuário de perfil Gestor com a área Comercial, ou prefere um perfil próprio?
2. O SGO+ passa a ter uma lista de contatos por cliente e unidade (várias pessoas, com cargo, e-mail e celular)?
3. O valor das oportunidades e propostas fica escondido de Técnico, Metrologia e RH, e o Financeiro vê só os pedidos aprovados? Basta o perfil, sem o PIN do COMMAND?
4. Qual o desconto máximo que o vendedor dá sem pedir aprovação? Um limite para todos ou por vendedor? (O COMMAND usa 15%.)
5. O aceite do cliente começa manual (anexar e-mail, pedido ou proposta assinada) e o link com assinatura fica para depois, ou já quer o link na etapa 3?
6. Os dois funis do Playbook (Engenharia e Produtos, cinco etapas) servem como estão?
7. Pode enviar o modelo de proposta usado hoje e a lista inicial de serviços e preços? O custo dos itens vai ser cadastrado?
8. Quem recebe o pedido aprovado em cada setor (técnica, compras, financeiro)?
9. Quem participa do teste do Comercial: o dono e mais quem?
10. Concorda em retirar o grupo Comercial do COMMAND quando o do SGO+ for aprovado?
11. Número da proposta: "ORC-2026-0001" (como no COMMAND, renomeando o pedido de orçamento dos padrões) ou outra sigla, como "PROP-2026-0001"?

## Anexo A. Referências no código

Caminhos relativos às pastas: COMMAND = `C:\Users\venda\projetos\metrolabs_command`; SGO+ = `C:\Users\venda\projetos\google-script-dev\apps-script-imports\portal_sgo_versao_cnpj_db`; Servidor = `C:\Users\venda\projetos\sgo_servidor`.

Tabela A.1 — Afirmações técnicas e onde conferir

| Afirmação | Arquivo |
| --- | --- |
| Funis Engenharia e Produtos, 5 etapas, 20% a 100%; origens e motivos de perda | COMMAND `Crm.js` (início, `cmdSemearPadroes_`) |
| Próxima ação obrigatória; ganho, perda, reabertura | COMMAND `Crm.js` (`cmdValidarProximaAcao_`, `cmdApiSalvarNegociacao`, `cmdApiEncerrarNegociacao`, `cmdApiReabrirNegociacao`) |
| Missão de implantação ao gestor operacional | COMMAND `Crm.js` (`cmdHandoffComercial_`) |
| Colunas das tabelas EMPRESAS, CONTATOS, FUNIS, ETAPAS, NEGOCIACOES, ATIVIDADES, PRODUTOS, ORCAMENTOS, ORCAMENTO_ITENS, VENDEDOR_PERFIL (negociação sem unidade) | COMMAND `Db.js` (CMD_TABELAS) |
| Regras das cobranças (2 h úteis, 4 por dia, escala em 2 dias úteis, 7/10 dias, propostas 2/5 dias úteis, 3 dias antes, carteira 60 dias); estratégias; balão | COMMAND `CrmCobranca.js` (`CMD_COM_REGRAS_PADRAO`, `cmdComCobrancaExec_`) |
| Proposta A4, link com código guardado só como marca, validade, revogação, revisão, dados congelados e marca do conteúdo | COMMAND `Orcamentos.js` (cabeçalho, `cmdOrcDocumento_`, `cmdApiEnviarOrcamento`, `cmdApiNovaRevisaoOrcamento`) |
| Desconto máximo padrão 15%; trava de desconto e margem | COMMAND `Orcamentos.js` (`CMD_ORC_DESCONTO_MAX_VENDEDOR`, `cmdOrcAvaliar_`, `cmdOrcAplicarRegras_`) |
| Aprovação pelo cliente: nome, CPF ou CNPJ, cargo, aceite, assinatura; conferência do conteúdo; resposta única; PDF assinado | COMMAND `Orcamentos.js` (`cmdApiOrcResponder`) |
| Falhas a não repetir: e-mail de confirmação prometido e não enviado; vencida só ao abrir o link; revogar não muda a situação; perda não cancela rascunhos | COMMAND `Orcamento.html` (campo de e-mail do aceite), `Orcamentos.js` (`cmdApiOrcPublico`, `cmdApiRevogarLink`), `Crm.js` (`cmdApiEncerrarNegociacao`) |
| Contrato sem ligação com a venda (só o texto da lista de conferência) | COMMAND `Contratos.js` (tabela CONTRATOS sem negociação nem orçamento), `Crm.js` (`cmdHandoffComercial_`) |
| Itens COM-01 a COM-06 do Programa de conduta | SGO+ `SGO_Conduta_Setup.js` |
| Atividade sem campo de origem; criação por outro módulo | SGO+ `SGO_Atividades.js` (`Atividades_apiCriar`); exemplo em `SGO_Frota_Reservas.js` (`FrotaRes_comoSistema_`) |
| Como um módulo entra na Caixa de decisões | SGO+ `SGO_Alertas_Central.js` (`PEND_TIPOS`), `SGO_Gestao_Decisoes.js` (`GES_TIPOS`, `Gestao_fontePendencias_`) |
| Pastas reconhecidas pelo envio de documento | SGO+ `SGO_EnviarDoc.js` (`ENVDOC_RAIZES`) |
| Número ORC- já usado na solicitação de orçamento dos padrões | SGO+ `SGO_Padroes_Orcamento.js`, `SGO_Ajuda_Calibracao.js` |
| Orçamento ligado ao chamado do COMMAND | COMMAND `OrcChamado.js` |
| Pós-venda: setores, prazos, listas de conferência, avisos | COMMAND `PosVenda.js` (`CMD_PV_SETORES`, `cmdApiPosVendaEncaminhar`, `cmdPvRotina_`) |
| Metas: tipos e farol | COMMAND `Metas.js` (`CMD_METAS_TIPOS`, `CMD_METAS_FAROL`) |
| Ficha do vendedor, comissão, valores de referência do Playbook; assistente do dia; perfil do cliente por IA | COMMAND `Vendedores.js` (`CMD_PLAYBOOK_REF`, `cmdApiComAssistenteDia`, `cmdApiComPerfilCliente`) |
| Biblioteca comercial isolada, aceite de leitura | COMMAND `BibliotecaComercial.js` |
| Papéis e trava dupla (papel e PIN) | COMMAND `Papeis.js` (`CMD_PAPEIS`, seção do PIN) |
| Textos de cada tela do Comercial | COMMAND `AjudaTelasComercial.js`; pós-venda em `AjudaTelasModulos.js` |
| Avisos (sino, fila do WhatsApp, espelho no SGO+ sem valores) | COMMAND `Crm.js` (`cmdNotificar_`, `cmdComSemValores_`); `AvisosWhatsapp.js` |
| Perfis do SGO+ | SGO+ `SGO_Config.js` (PROFILES) |
| Área "Comercial" no cadastro de usuários | SGO+ `SGO_Areas.js` |
| Perfil Comercial cadastra e edita clientes, unidades e equipamentos | SGO+ `SGO_Ajuda_Cadastros.js` |
| Atividades com módulo, cliente, unidade e 5W2H; ponte com o COMMAND | SGO+ `SGO_Atividades.js` (cabeçalho e `ATV_COLUNAS`) |
| Caixa de decisões, roteamento por área, vencimentos como acompanhamento | SGO+ `SGO_Gestao_Decisoes.js`; escada em `SGO_Gestao_Escada.js` |
| Notificador comum e categorias com regra de uma mensagem por dia | SGO+ `SGO_Notificar.js` (`SGO_notificar_`) |
| Enviar documento ao cliente; contatos sugeridos do cliente e da unidade (sem tabela de contatos) | SGO+ `SGO_EnviarDoc.js` (`EnviarDoc_contatosCliente_`) |
| Padrão A4 e pasta por CNPJ | google-script-dev `docs\DOCUMENTOS_PADRAO_A4_20261018.md`; SGO+ `SGO_DocA4.js`, `SGO_DocSalvar.js` |
| Orçamento de escopo dos padrões (interno, não é proposta) | SGO+ `SGO_Padroes_Orcamento.js` |
| Armazenamento genérico das planilhas no PostgreSQL (planilhas, abas, linhas) | Servidor `src\db.ts` |
| COMMAND no mesmo servidor, ponte em memória com o SGO+ | Servidor `src\servidor.ts`, `src\sistemas.ts`, `src\servicos\ponteSgo.ts` |
| Pacote exportado do COMMAND (16/10/2026, 110 tabelas, comerciais vazias) | `G:\Meu Drive\COMMAND_MIGRACAO_PACOTE\banco_CMD_DB_ID.json`; relatório do ensaio em Servidor `ensaios_locais\command_virada\relatorio_importacao_command.json` |

Tabela A.2 — Registros por tabela comercial no pacote de 16/10/2026 (sem contar o cabeçalho)

| Tabela | Registros | Observação |
| --- | --- | --- |
| NEGOCIACOES, ATIVIDADES, ORCAMENTOS, ORCAMENTO_ITENS, PRODUTOS, CONTATOS | 0 | Nunca usadas |
| METAS_COMERCIAIS, METAS_HIST, VENDEDOR_PERFIL, CLIENTE_PERFIL_IA | 0 | Nunca usadas |
| ORC_ENCAMINHAMENTOS, ORC_CHAMADO, NEG_COMENTARIOS | 0 | Nunca usadas |
| COM_BIB_DOCS, COM_BIB_VERSOES, COM_BIB_TEXTOS, COM_BIB_ACEITES, COM_BIB_IA | 0 | Nunca usadas |
| FUNIS | 2 | Criados sozinhos na primeira abertura |
| ETAPAS | 10 | Criadas sozinhas na primeira abertura |
| COM_COBRANCAS | 12 | Marcas da rotina, todas "0 aviso(s)", de 14/10 a 16/10 |
| EMPRESAS, UNIDADES, EQUIPAMENTOS | 1.885 / 1.967 / 1.404 | Cópia do cadastro do SGO+ |

## Anexo B. Como conferir no servidor se há dados comerciais

Consulta só de leitura, para quem tem acesso ao servidor, na pasta do sistema. Ela conta, em cada tabela comercial do COMMAND, as linhas de dados (a linha 1 de cada tabela é o cabeçalho). Não grava nada: a sessão é aberta em modo só leitura.

```
cd /opt/metrolabs/sgo
docker compose exec -T db psql -U sgo -d sgo -c "SET default_transaction_read_only = on;
WITH c AS (SELECT valor id FROM propriedades WHERE escopo='script:command' AND chave='CMD_DB_ID')
SELECT a.nome, count(l.n) FILTER (WHERE l.n>1) AS linhas_dados
FROM abas a JOIN c ON a.planilha_id=c.id
LEFT JOIN linhas l ON l.planilha_id=a.planilha_id AND l.aba=a.nome
WHERE a.nome IN ('NEGOCIACOES','ATIVIDADES','FUNIS','ETAPAS','ORCAMENTOS','ORCAMENTO_ITENS',
 'PRODUTOS','CONTATOS','COM_COBRANCAS','NEG_COMENTARIOS','METAS_COMERCIAIS','METAS_HIST',
 'ORC_ENCAMINHAMENTOS','ORC_CHAMADO','VENDEDOR_PERFIL','CLIENTE_PERFIL_IA',
 'COM_BIB_DOCS','COM_BIB_VERSOES','COM_BIB_ACEITES')
GROUP BY a.nome ORDER BY a.nome;"
```

Resultado esperado, se o COMMAND continua sem uso: zero em todas, menos FUNIS (2), ETAPAS (10) e COM_COBRANCAS (marcas da rotina). Qualquer número acima disso em NEGOCIACOES, ORCAMENTOS, PRODUTOS ou CONTATOS indica uso real e deve ser olhado antes da etapa 1. Para ver uma amostra, trocar a consulta por:

```
SELECT n, v FROM linhas WHERE planilha_id=(SELECT valor FROM propriedades
 WHERE escopo='script:command' AND chave='CMD_DB_ID') AND aba='NEGOCIACOES' ORDER BY n DESC LIMIT 5;
```

Os scripts de manutenção do servidor em TypeScript abrem o banco criando estruturas que faltam; para esta conferência, usar só o comando acima.
