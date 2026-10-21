<!-- Versão em Markdown do documento C:\Users\venda\Documents\METROLABS_PROJETO_COMPRAS_20261021\PROJETO_COMPRAS_NO_SGO.html (fonte para impressão). -->

**METROLABS**

# Projeto: trazer Compras e peças do COMMAND para o SGO+

*Estudo para decisão do dono. Nenhum código foi alterado.*

|  |  |
| --- | --- |
| Número | PRJ-20261021-CMP |
| Revisão | 00 |
| Data | 21/10/2026 |
| Elaborado por | Equipe de projeto (compras, software e qualidade) |
| Para | Dono da empresa (decisão) |
| Situação | Proposta. Aguarda as respostas da seção 7. |

## Resumo para decidir

O módulo Compras e peças do COMMAND foi feito para acabar com dois problemas: pedido vago ("uma mangueira de 1/2") que leva à compra errada, e compra sem rastro (sem saber para que foi, quem aprovou, como foi paga e se o Financeiro conferiu). Ele cobre o caminho inteiro: alguém pede a peça com a especificação, o comprador confere, cota com fornecedores, a compra é aprovada por quem tem alçada para aquele valor, o pedido é feito ao fornecedor, a peça chega e é conferida, é entregue a quem pediu e o Financeiro confere o pagamento. Foi construído e testado em simulador, mas **nunca foi usado**: o COMMAND não tem dados reais de compras.

O SGO+ já tem quase toda a base: Minhas atividades (prazo, responsável, cobrança até concluir), a Caixa de decisões da gestão com a escada de cobrança, a central de pendências, o padrão de documento A4 salvo no Drive com PDF, o envio de documento por e-mail com histórico, a consulta de CNPJ, as áreas (Logística, Financeiro, Administrativo), o perfil Financeiro e o Comercial nativo, que já entrega o pedido aprovado ao setor Compras como uma atividade. Falta o principal: **o SGO+ não tem cadastro de fornecedores** (a Frota guarda a oficina e o posto como texto solto) e não tem nenhum registro de compra.

**Recomendação.** Trazer o Compras para o SGO+ como módulo nativo (SGO_Compras_*.js, no mesmo padrão do Comercial), mais enxuto que o do COMMAND, em quatro etapas pequenas:

1. cadastro de fornecedores (com a consulta de CNPJ que já existe) e o "Pedir peça ou material", com especificação obrigatória e vínculo (cliente, pedido do Comercial, veículo ou uso interno);
2. cotações com o arquivo do orçamento e aprovação por faixa de valor, que aparece e é cobrada na Caixa de decisões;
3. pedido de compra em A4 numerado, enviado ao fornecedor, recebimento com conferência e entrega a quem pediu;
4. conferência do Financeiro (comprovante, forma de pagamento, final do cartão), painel e relatório mensal em A4.

As 16 situações do COMMAND ficam em 9; as "missões" do COMMAND viram atividades do SGO+; os avisos seguem a matriz aprovada (sistema até resolver, e-mail no resumo das 8 h, WhatsApp só no resumo diário, nunca com valor). Ficam para depois a revisão da especificação por inteligência artificial, o estoque de peças, a avaliação automática do fornecedor e as ligações com Contratos, Ordens de metrologia e a Assistência técnica (que entram quando esses módulos chegarem ao SGO+).

Antes da etapa 1 são necessárias sete respostas curtas (seção 7): quem compra, quem aprova e até que valor, quantas cotações por faixa, se há estoque de peças, se já existe uma lista de fornecedores, como o Financeiro confere hoje e se Compras fica na área Logística ou Administrativo.

## 1. O que o Compras do COMMAND faz hoje

O módulo fica no menu do COMMAND como "Compras e peças" e abre para quem tem a permissão do módulo (papéis Compras, Financeiro, Gestor operacional, Supervisor de assistência, Diretoria e Administrador). Quem não tem a permissão ainda pode pedir peça a partir de um chamado ou do Comercial e acompanhar os próprios pedidos, sem ver valores.

### 1.1 O caminho de uma compra, de ponta a ponta

Tabela 1 — Fluxo de uma compra no COMMAND

| Passo | O que acontece | Quem faz |
| --- | --- | --- |
| 1. Pedido (requisição) | Alguém pede uma peça: nome, quantidade, urgência (crítica, alta, normal, baixa), para que serve, equipamento (fabricante, modelo, série), número de peça (part number), fabricante, tensão, corrente, pressão, rosca, dimensão, material, fotos e desenhos. O pedido recebe um código (REQ-2026-0001). Pode nascer na tela, de um chamado da Assistência que está aguardando peça ou de um pedido aprovado do Comercial (uma requisição por produto). | Técnico, supervisor, vendedor ou o próprio comprador |
| 2. Vínculo | Toda compra diz a que está ligada: chamado, pedido aprovado do Comercial, contrato, ordem de metrologia ou uso interno (estoque, ferramenta, administrativo), este último com explicação de pelo menos 20 caracteres. | Quem pede ou o comprador |
| 3. Especificação | O sistema confere se a especificação está completa. Se falta algo, a requisição fica em "Especificação pendente", não pode ser cotada nem aprovada, e quem pediu é avisado do que falta. O comprador revisa e valida. Há um botão de inteligência artificial que aponta o que falta e o risco de comprar errado (só sugere). | Comprador |
| 4. Cotação | O comprador lança as cotações por fornecedor: preço unitário, quantidade, frete, impostos, prazo, validade, marca, compatibilidade (original, equivalente, a confirmar, incompatível), condição de pagamento e o arquivo do orçamento. O total é calculado pelo sistema. Só conta cotação com o arquivo anexado. | Comprador |
| 5. Escolha | O comprador escolhe a vencedora. Se não é a mais barata, precisa justificar. Se há menos cotações que o mínimo, precisa explicar (por exemplo, fornecedor único). Cotação vencida ou de compatibilidade não confirmada não pode ser escolhida. | Comprador |
| 6. Aprovação | O valor da vencedora define quem aprova, por uma tabela de faixas editável (padrão: até R$ 1.000 o comprador; de R$ 1.000 a R$ 10.000 um gestor; acima, a Diretoria). Quem pediu, quem validou a especificação e quem escolheu a cotação não aprovam a mesma compra. Reprovar exige motivo e devolve para cotação. | Aprovador da faixa |
| 7. Pedido ao fornecedor | O comprador registra o número do pedido, a previsão de entrega, a forma de pagamento (cartão com o final e as parcelas, PIX, boleto, transferência, faturado ou reembolso), o valor pago e o comprovante. Depois pode marcar "fornecedor confirmou" e "em trânsito" (com código de rastreio). Mudar a previsão exige motivo. | Comprador |
| 8. Recebimento | Na chegada, a conferência é obrigatória: quantidade, especificação, dano, nota fiscal e foto. Qualquer divergência segura a peça em "Inspeção pendente" com o motivo. Sem divergência, a peça fica "Disponível" e quem pediu é avisado; se veio de chamado, o chamado volta a ser planejado. | Comprador ou quem recebe |
| 9. Entrega e encerramento | A peça pode ser reservada para um serviço, é entregue a uma pessoa com evidência (protocolo, retirada assinada, foto) e a requisição é encerrada. | Comprador |
| 10. Conferência do Financeiro | Toda compra feita entra em conferência. O Financeiro vê o dossiê (vínculo, cotações, aprovação, pagamento, comprovante, nota) e marca "conferida" ou "divergente"; na divergência o comprador corrige e reenvia. Há filtro por mês e pelo final do cartão, para bater a fatura, e exportação em planilha (CSV). Quem registrou a compra não confere a própria. | Financeiro |
| Cancelamento | Possível em quase toda etapa até a peça chegar, sempre com motivo de pelo menos uma frase; quem pediu é avisado. | Comprador |

Cada etapa abre uma "missão" do COMMAND para o próximo responsável (validar a especificação, aprovar, fazer o pedido, conferir o recebimento, entregar) e fecha a anterior.

### 1.2 Tela por tela

Tabela 2 — Abas do módulo no COMMAND

| Aba | O que mostra |
| --- | --- |
| Painel | Contagens: requisições abertas, especificação pendente, aguardando aprovação (e quantas na sua alçada), pedidos atrasados, peças para liberar; alertas por gravidade. |
| Requisições | Lista com filtro por situação e busca; ficha da requisição com especificação, vínculo, cotações, histórico e anexos. |
| Cotações e aprovações | Requisições em cotação (com comparativo) e as que aguardam aprovação, com valor e alçada. |
| Pedidos e recebimento | Pedidos feitos, confirmados e em trânsito; recebimento com conferência; peças disponíveis e reservadas. |
| Fornecedores | Cadastro: razão social, nome fantasia, CNPJ, contato, telefone, WhatsApp, e-mail, categorias, prazo médio, avaliação e observações. |
| Conferência financeira | Só para quem confere (Financeiro e Diretoria): lista por mês, situação e final do cartão; dossiê; conferir ou apontar divergência; planilha. |
| Política de aprovação | Só para o administrador: faixas de valor (por categoria e urgência, se quiser), nível que aprova e mínimo de cotações. |
| Minhas requisições | Para quem pediu: situação de cada pedido e previsão, sem valores; completar a especificação e enviar fotos. |

### 1.3 Regras que o sistema impõe

- Especificação incompleta não é cotada, aprovada nem comprada.
- O total da cotação é calculado pelo sistema (preço × quantidade pedida + frete + impostos); a "mais barata" compara sempre pela quantidade pedida.
- Vencedora que não é a mais barata exige justificativa; menos cotações que o mínimo exige explicação registrada em auditoria.
- Quem pede não aprova; na faixa do gestor e da Diretoria, quem validou, lançou ou escolheu a cotação também não.
- Cotação com validade vencida não é aprovada; a compra só é vinculada a pedido do Comercial já aprovado pelo cliente e a contrato ativo.
- O pedido exige número, previsão, forma de pagamento, valor pago e comprovante.
- O recebimento exige conferência; peça com dano exige foto.
- Os anexos de cotação, comprovante e nota fiscal só são vistos por quem tem o módulo; quem pediu vê as fotos e o que ele mesmo enviou.

### 1.4 Avisos

O COMMAND avisa pelo próprio sino em dez momentos (especificação incompleta, complete a especificação, compra aprovada, compra reprovada, peça pedida, peça disponível, requisição cancelada, compra para conferir, divergência do Financeiro e mudança de situação para o vínculo). A matriz de avisos de 21/10/2026 (itens C030 a C039) já classificou cada um: os avisos de "peça pedida" e "mudança de situação" viram só histórico, os demais ficam no sistema e alguns entram no e-mail de resumo. Além disso, a central do COMMAND calcula cinco alertas: compra aprovada sem pedido há 1 dia, especificação pendente há 2 dias, pedido atrasado, peça recebida e não liberada há 1 dia, e requisição crítica parada há mais de 4 horas (alta, 24 horas).

### 1.5 O que está maduro, incompleto ou nunca testado

Tabela 3 — Avaliação do módulo do COMMAND

| Parte | Avaliação | Comentário |
| --- | --- | --- |
| Fluxo e regras de aprovação | Maduro | Bem pensado e coberto por dois arquivos de teste. É a parte que vale trazer quase como está. |
| Rastreabilidade (vínculo, pagamento, comprovante, Financeiro) | Maduro | Pedido do dono de 14/10/2026. Vale trazer. |
| Quantidade de situações (16) | Excessivo | "Fornecedor confirmou", "em trânsito", "reservada" e "revisão da especificação" são passos que uma equipe pequena não vai marcar. Cada passo a mais é uma pendência a mais. |
| Mínimo de cotações | Contraditório | A tabela de faixas diz 1 cotação até R$ 1.000, mas a regra de rastreabilidade força no mínimo 3 em qualquer valor. Na prática, uma peça de R$ 50 exige três orçamentos ou uma justificativa. Precisa de decisão do dono (pergunta 3). |
| Uma peça por requisição | Limitado | Um pedido do Comercial com cinco produtos vira cinco requisições, cinco cotações e cinco pedidos ao mesmo fornecedor. |
| Fornecedores | Simples | Cadastro sem consulta de CNPJ; a "avaliação" é digitada, não calculada pelo prazo cumprido. |
| Estoque | Não existe | "Disponível" e "reservada" são da requisição, não de um saldo de peças. Não há entrada e saída de estoque. |
| Pedido de compra em documento | Não existe | O número do pedido é digitado; não sai folha de pedido de compra para o fornecedor. |
| Inteligência artificial | Opcional | Revisão da especificação pelo Gemini, só sugere. Útil, mas não essencial no começo. |
| Uso real | Nunca usado | Sem dados reais; não há nada a migrar do COMMAND. |

## 2. O que o SGO+ já tem e serve a Compras

Tabela 4 — Base existente no SGO+

| Recurso do SGO+ | Como serve a Compras |
| --- | --- |
| Comercial nativo (pedido aprovado passa aos setores) | Já cria a atividade do setor Compras, com prazo de 1 dia útil e lista de conferência ("conferir os produtos", "verificar estoque ou cotar", "emitir o pedido de compra", "informar o prazo ao vendedor"). Passa a abrir também a requisição de compra com os itens do pedido. |
| Minhas atividades | Substitui as "missões" do COMMAND: cada etapa vira atividade com responsável, prazo, por quê, onde e como, cobrada até concluir. |
| Caixa de decisões e escada de cobrança | Lugar natural da aprovação por valor: mostra o item ao aprovador certo, conta o prazo, sobe para a Diretoria se parar. Já recebe itens do Comercial (desconto) no mesmo modelo: decide-se na tela do módulo e a caixa mostra, cobra e leva até lá. |
| Central de pendências e Início | Recebe os alertas de compra (aprovada sem pedido, pedido atrasado, peça sem entregar) sem tela nova. |
| Áreas (CAD_AREAS) | Já existem Logística ("estoque, recebimento e expedição"), Administrativo ("compras administrativas") e Financeiro; definem para quem vão os itens e quem é o gestor. |
| Perfis | Já existe o perfil Financeiro. Não existe perfil Compras: o comprador será definido no próprio módulo (como o vendedor no Comercial). |
| Consulta de CNPJ | Preenche razão social, nome fantasia e endereço do fornecedor no cadastro. |
| Documento A4 e Arquivo de documentos | Padrão de folha A4 com cabeçalho e rodapé, salvo no Drive em HTML e PDF; serve ao pedido de compra e ao relatório mensal. |
| Enviar documento e e-mail integrado | Envia o pedido de compra ao fornecedor com histórico. Hoje escolhe contatos de cliente; precisa aceitar também o e-mail do fornecedor (pequena extensão). |
| Frota (manutenção, despesas, abastecimentos) | Tem custo e oficina na manutenção, valor nas despesas e posto no abastecimento, mas a oficina e o posto são texto livre. Com o cadastro de fornecedores, passam a apontar para ele, e uma peça de veículo pode virar requisição vinculada ao veículo. |
| Ajuda por tela, manual e assistente | Cada tela nova nasce com ajuda passo a passo e o manual atualizado no mesmo trabalho. |
| Gemini (já usado em vários módulos) | Permite trazer depois a revisão da especificação, sem custo de integração nova. |

**O que não existe e precisa nascer:** cadastro de fornecedores, requisição de compra, cotação, aprovação de compra, pedido de compra, recebimento, conferência do Financeiro e a lista de compradores e aprovadores.

## 3. Recomendação: trazer agora, trazer depois, deixar de fora

### 3.1 Trazer agora (essencial)

Tabela 5 — O que entra nas quatro etapas

| Item | Motivo |
| --- | --- |
| Cadastro de fornecedores | Sem ele não há cotação nem pedido; também organiza a oficina e o posto da Frota. |
| Pedir peça ou material, com especificação obrigatória e um ou mais itens | É o coração do módulo: evita a compra errada. Vários itens no mesmo pedido evitam cinco pedidos ao mesmo fornecedor. |
| Vínculo obrigatório e finalidade | Pedido do dono (14/10/2026): nenhuma compra sem saber para que é. |
| Cotações com arquivo do orçamento e escolha justificada | Dá a prova de preço e evita escolha sem motivo. |
| Aprovação por faixa de valor, com separação de quem pede, cota e aprova | Controle de gasto; aparece e é cobrada na Caixa de decisões. |
| Pedido de compra em A4, numerado, enviado ao fornecedor | Documento formal que hoje não existe nem no COMMAND. |
| Recebimento com conferência e entrega a quem pediu | Fecha o ciclo e avisa quem está esperando a peça. |
| Conferência do Financeiro com comprovante, forma de pagamento e final do cartão | Pedido do dono; permite bater a fatura do cartão. |
| Painel e relatório mensal em A4 | Gasto por vínculo, por fornecedor e por área; compras fora do prazo. |

### 3.2 Trazer depois (quando o uso pedir ou o módulo vizinho chegar)

- **Revisão da especificação por inteligência artificial**: útil quando houver volume; só sugere, nunca valida.
- **Estoque de peças** (saldo, entrada, saída, estoque mínimo): só se a resposta da pergunta 4 disser que há estoque relevante.
- **Avaliação do fornecedor calculada** (prazo prometido x cumprido, divergências no recebimento).
- **Vínculo com Contratos e Ordens de metrologia**: entra quando esses módulos vierem ao SGO+ (próximos da ordem aprovada).
- **Vínculo com a Assistência técnica** (chamado aguardando peça): entra quando a Assistência nativa existir; até lá, o vínculo é ao cliente e à unidade, com o número da O.S. do Auvo em texto.
- **Agrupar várias requisições aprovadas num só pedido ao mesmo fornecedor.**

### 3.3 Deixar de fora (por ora)

- **Situações "fornecedor confirmou", "em trânsito", "reservada" e "revisão da especificação"**: viram campos (previsão, código de rastreio, observação) dentro de "pedido feito" e "disponível".
- **Faixas de aprovação por categoria e por urgência**: começar só por valor; é mais fácil de entender e de auditar.
- **Missões do COMMAND e alertas do SEDNA**: substituídos por Minhas atividades, central de pendências e Caixa de decisões.
- **Avisos a cada mudança de situação**: viram histórico, como manda a matriz (princípio 1).

## 4. Como ficará no SGO+

O caminho fica com nove situações: **Solicitada** (com a marca "especificação incompleta" quando faltar algo), **Em cotação**, **Aguardando aprovação**, **Aprovada**, **Pedido feito**, **Recebida com divergência**, **Disponível**, **Entregue** (encerra) e **Cancelada**. A conferência do Financeiro corre em paralelo, a partir do pedido feito (aguardando conferência, conferida, divergente).

### 4.1 Telas

Tabela 6 — Telas do grupo Compras no menu

| Tela | Quem vê | O que faz |
| --- | --- | --- |
| Pedir peça ou material | Todos os colaboradores internos (também no celular) | Formulário guiado: itens com especificação, fotos, quantidade, urgência, finalidade e vínculo. Diz na hora o que falta. Sem valores. |
| Meus pedidos de compra | Quem pediu | Situação, previsão de entrega e o que falta completar. Sem valores. |
| Compras (fila do comprador) | Compradores, aprovadores, Diretoria, Administrador | Quadro por situação; ficha com itens, vínculo, cotações, aprovação, pedido, recebimento, histórico e anexos. |
| Fornecedores | Compradores, Financeiro, gestão; Frota consulta | Cadastro com consulta de CNPJ, categorias, contato, prazo médio, histórico de compras; arquivar sem apagar. |
| Conferência do Financeiro | Financeiro e Diretoria | Lista por mês, situação e final do cartão; dossiê; conferir ou apontar divergência; planilha. |
| Painel de compras | Compradores, gestão, Diretoria | Abertas, paradas, atrasadas, gasto do mês por vínculo, área e fornecedor; relatório mensal em A4. |
| Regras de compras | Administrador e Diretoria | Compradores, faixas de valor e quem aprova, mínimo de cotações por faixa, prazos dos alertas. |

### 4.2 Perfis e permissões

Tabela 7 — Quem faz o quê

| Papel | Como é definido | Pode | Vê valores? |
| --- | --- | --- | --- |
| Solicitante | Qualquer colaborador interno | Pedir, completar a especificação, acompanhar, receber a peça | Não |
| Comprador | Lista em Regras de compras (área Logística ou Administrativo, pergunta 7) | Validar especificação, cadastrar fornecedor, cotar, escolher, fazer o pedido, receber, entregar, cancelar com motivo | Sim |
| Aprovador | Faixas de valor em Regras de compras (gestor da área, Diretoria) | Aprovar ou reprovar com motivo, pela Caixa de decisões | Sim |
| Financeiro | Perfil FINANCEIRO | Conferir, apontar divergência, exportar | Sim |
| Vendedor | Perfil Comercial | Ver a situação das compras do próprio pedido aprovado | Só o do pedido (já vê no Comercial) |
| Diretoria e Administrador | Perfis DIRETORIA e ADMIN | Tudo, inclusive as regras | Sim |

Regras que continuam: quem pediu não aprova; quem cotou ou escolheu não aprova acima da faixa do comprador; quem registrou a compra não a confere no Financeiro. Técnicos, Metrologia e RH não veem preços.

### 4.3 Fornecedores, itens e peças

- **Fornecedor:** CNPJ (ou CPF, para pessoa física), razão social e nome fantasia pela consulta de CNPJ, contato, telefone, e-mail para pedidos, categorias (peças hospitalares, ferramentas, insumos, veículos, serviços), prazo médio, observações, ativo. O CNPJ não se repete.
- **Item da requisição:** descrição, quantidade e unidade, número de peça e fabricante, equipamento de origem (pode apontar para o equipamento do cadastro do cliente), dados técnicos (tensão, corrente ou potência, pressão, rosca, dimensão, material) e fotos. Para material simples (papel, ferramenta comum), basta descrição e quantidade: os dados técnicos são exigidos só quando a categoria for peça.
- **Catálogo:** no começo não há catálogo de peças; o histórico de compras já mostra "quem vendeu esta peça e por quanto". O catálogo de produtos do Comercial (COM_PRODUTOS) continua sendo o do que se vende; o pedido aprovado leva dele a descrição para a requisição.

### 4.4 Aprovação por valor na Caixa de decisões

O comprador escolhe a cotação e a compra passa a "Aguardando aprovação". O SGO+ olha o valor total e a tabela de faixas e cria o item "Aprovar compra" na Caixa de decisões do aprovador daquela faixa, com prazo de 1 dia útil (crítica: no mesmo dia). A decisão é tomada na ficha da compra (a caixa mostra, cobra e leva até lá, como já faz com o desconto do Comercial). Se o item parar, a escada que já existe cobra pelo e-mail das 8 h, depois pelo resumo do WhatsApp, e chega à Diretoria.

Tabela 8 — Faixas sugeridas para discussão (o dono define na pergunta 2)

| Valor total da compra | Quem aprova | Cotações mínimas |
| --- | --- | --- |
| Até R$ 1.000 | O próprio comprador (fica registrado) | 1 |
| De R$ 1.000,01 a R$ 10.000 | Gestor da área do vínculo (ou o gestor de Compras) | 2 |
| Acima de R$ 10.000 | Diretoria | 3 |

Menos cotações que o mínimo exige explicação (fornecedor único, urgência) e a compra aparece marcada para o Financeiro. Esta tabela substitui a regra fixa de três cotações do COMMAND, que contradizia a tabela de faixas (seção 1.5).

### 4.5 Ligações com o resto do SGO+

Tabela 9 — Integrações

| Módulo | Como liga | Quando |
| --- | --- | --- |
| Comercial | Ao passar o pedido aprovado ao setor Compras, nasce também a requisição com os produtos do pedido, já vinculada (PROP-…). Quando a peça fica disponível, a atividade do setor Compras é concluída e o vendedor é avisado ("setor concluiu sua parte"). Técnica e Compras continuam sem ver o valor de venda. | Etapa 1 (vínculo) e etapa 3 (conclusão) |
| Frota | Vínculo "veículo" na requisição; oficina e posto passam a escolher do cadastro de fornecedores (o texto antigo fica como está, sem apagar). | Etapa 1 (vínculo); depois (oficina e posto) |
| Cadastros de clientes, unidades e equipamentos | Vínculo "cliente" e equipamento de origem da peça. | Etapa 1 |
| Assistência técnica (futura) | Chamado aguardando peça abre a requisição e volta a ser planejado quando a peça chega. Até lá: vínculo ao cliente com o número da O.S. do Auvo. | Quando a Assistência nativa existir |
| Contratos e Ordens de metrologia (futuros) | Novos tipos de vínculo. | Quando esses módulos chegarem |
| Financeiro | Conferência de cada compra; planilha por mês e final do cartão. | Etapa 4 |
| Painel da Diretoria (futuro) | Gasto do mês, compras paradas e divergências. | Quando o painel vier |

### 4.6 Conferência do Financeiro

Ao registrar o pedido feito, o comprador informa a forma de pagamento (cartão de crédito ou débito com o final e as parcelas, PIX, boleto com vencimento, transferência, faturado com a condição, reembolso com quem pagou), o valor pago e anexa o comprovante; a nota fiscal entra no recebimento. A compra entra na lista do Financeiro como "aguardando conferência". O Financeiro abre o dossiê (vínculo, cotações, aprovação, pagamento, comprovante, nota) e marca "conferida" ou "divergente" com a observação; a divergência volta ao comprador como pendência até ele corrigir. O filtro por mês e final do cartão e a planilha servem para bater a fatura. Se a empresa usa o cartão corporativo Flash ou outro controle, a pergunta 6 define se a conferência só bate o lançamento ou se importa o extrato depois.

### 4.7 Documento A4: pedido de compra

O pedido de compra sai em folha A4 retrato no padrão do SGO+, com número próprio (PC-2026-0001) e revisão, e é salvo no Drive (pasta Compras, por mês) em HTML e PDF. Conteúdo: dados da Metrolabs (razão social, CNPJ, endereço de entrega e de faturamento), fornecedor, itens com especificação e quantidade, preço unitário, frete, impostos e total, prazo de entrega, condição e forma de pagamento, referência da cotação do fornecedor, quem emitiu e quem aprovou. O vínculo aparece só pelo código interno, sem o nome do cliente. O envio ao fornecedor é feito pelo Enviar documento, que guarda o histórico. Texto justificado, sem marcação de sistema, como os demais documentos.

O relatório mensal de compras (A4) traz: quantidade e valor por vínculo, área e fornecedor; compras fora do prazo; menos cotações que o mínimo; divergências do Financeiro e de recebimento.

### 4.8 Avisos: quem recebe o quê (proposta para a matriz)

Tabela 10 — Matriz de avisos de Compras no SGO+

| Acontecimento | Quem recebe | No sistema | E-mail | WhatsApp |
| --- | --- | --- | --- | --- |
| Especificação incompleta (C030, C031) | Quem pediu | Sim, até completar | No resumo das 8 h | Só no resumo diário |
| Nova requisição para cotar | Comprador | Sim (atividade) | No resumo das 8 h | Só no resumo diário |
| Requisição crítica | Comprador | Sim (atividade com prazo no dia) | Na hora, no expediente | Não |
| Compra aguardando aprovação | Aprovador da faixa; sem ele, Diretoria | Sim (Caixa de decisões) | No resumo das 8 h | Pela escada da gestão |
| Compra aprovada (C032) ou reprovada (C033) | Comprador | Sim | Aprovada: no resumo. Reprovada: não | Não |
| Aprovada sem pedido há 1 dia útil; pedido atrasado | Comprador; após 2 dias úteis, gestor da área | Sim (central; depois Caixa de decisões) | No resumo das 8 h | Pela escada da gestão |
| Peça pedida (C034); mudança de situação (C039) | Ninguém | Só histórico (quem pediu vê em Meus pedidos) | Não | Não |
| Recebida com divergência | Comprador | Sim, até resolver | Não | Não |
| Peça disponível (C035) | Quem pediu; no pedido do Comercial, o vendedor | Sim | No resumo das 8 h | Não |
| Peça disponível há 1 dia útil sem entrega | Comprador | Sim (central) | Não | Não |
| Requisição cancelada (C036) | Quem pediu | Sim | Não | Não |
| Compra para conferir (C037) | Financeiro | Sim, até conferir | No resumo das 8 h, sem valor | Não |
| Divergência do Financeiro (C038) | Comprador | Sim, até corrigir | No resumo das 8 h | Não |

Nenhum e-mail ou WhatsApp leva valor em reais (princípio 7); quem fez a ação não é avisado (princípio 8); nada sai fora do expediente (princípio 4); durante o piloto, os avisos fora do sistema seguem a lista de pessoas do piloto. Nenhum aviso vai ao fornecedor sozinho: o que vai ao fornecedor é o pedido de compra enviado pelo comprador.

### 4.9 Dados

Abas novas no banco do SGO+, com prefixo CMP_: CMP_CONFIG (compradores, faixas, mínimos e prazos), CMP_FORNECEDORES, CMP_REQUISICOES, CMP_ITENS, CMP_COTACOES, CMP_APROVACOES, CMP_PEDIDOS (número PC, documento, pagamento, conferência do Financeiro) e CMP_HISTORICO. Anexos (orçamentos, comprovantes, notas, fotos) no Drive, numa pasta Compras com permissão restrita; o solicitante vê só as fotos que ele mesmo enviou. Nada é migrado do COMMAND, porque lá não há dados.

## 5. Plano em etapas

Cada etapa termina com testes automáticos verdes, ensaio local (computador de 1366 px e celular), ajuda da tela e manual atualizados, e só então é publicada. O dono confere antes da etapa seguinte.

### Etapa 0 — Decisões e cadastro (sem código)

Respostas da seção 7; lista de compradores e aprovadores; faixas de valor; lista inicial de fornecedores (se existir planilha). **Pronto quando:** as sete perguntas estão respondidas e a matriz de avisos de Compras está aprovada.

### Etapa 1 — Fornecedores e pedido de peça

Cadastro de fornecedores com consulta de CNPJ; "Pedir peça ou material" com itens, especificação, fotos, urgência, finalidade e vínculo (cliente, pedido do Comercial, veículo, uso interno); "Meus pedidos"; fila do comprador; especificação incompleta volta a quem pediu com o que falta; a passagem do Comercial ao setor Compras abre a requisição. **Pronto quando:** um técnico pede uma peça pelo celular, o comprador a vê na fila com a atividade, a especificação incompleta não avança e quem pediu vê só a situação, sem valor.

### Etapa 2 — Cotações e aprovação

Cotações por fornecedor com arquivo do orçamento, total calculado, comparativo, escolha justificada; faixas de valor; item "Aprovar compra" na Caixa de decisões; aprovar ou reprovar com motivo; separação de quem pede, cota e aprova. **Pronto quando:** uma compra de cada faixa chega ao aprovador certo, quem cotou não consegue aprovar acima da própria faixa e a reprovação volta para cotação com o motivo.

### Etapa 3 — Pedido de compra, recebimento e entrega

Pedido de compra em A4 numerado, salvo no Drive e enviado ao fornecedor pelo Enviar documento; previsão e código de rastreio; recebimento com conferência (quantidade, especificação, dano, nota, foto); divergência; peça disponível avisa quem pediu e conclui a atividade do Comercial; entrega com evidência; cancelamento com motivo. **Pronto quando:** o PDF do pedido foi lido página a página, o fornecedor de teste recebe o e-mail, a divergência segura a peça e a entrega encerra a requisição.

### Etapa 4 — Financeiro, painel e relatório

Forma de pagamento, valor pago e comprovante no pedido; lista de conferência do Financeiro com dossiê, filtro por mês e final do cartão, planilha; divergência volta ao comprador; painel de compras; relatório mensal em A4; alertas na central. **Pronto quando:** o Financeiro bate uma fatura de teste pelo final do cartão, a divergência volta ao comprador e o relatório do mês fecha com os números do painel.

### Depois das quatro etapas

Na ordem que o uso pedir: revisão da especificação por inteligência artificial; oficina e posto da Frota pelo cadastro de fornecedores; estoque de peças (se a pergunta 4 indicar); avaliação calculada do fornecedor; vínculos com Contratos, Ordens de metrologia e Assistência técnica à medida que esses módulos chegarem.

## 6. Riscos e cuidados

- **Burocracia demais:** se pedir uma caneta exigir três orçamentos, a equipe compra por fora. Por isso a especificação técnica só é exigida para peça e o mínimo de cotações segue a faixa de valor.
- **Valor vazando:** o preço de compra não pode aparecer para técnicos nem em e-mail ou WhatsApp. Testes específicos para isso em cada etapa, como no Comercial.
- **Aprovador ausente:** faixa sem aprovador disponível vai para a reserva da Diretoria (regra da Caixa de decisões), nunca fica sem dono.
- **Operador no limbo:** toda trava diz o que falta, por quê e onde resolver (por exemplo, "anexe o arquivo do orçamento deste fornecedor na aba Cotações").
- **Cadastro de fornecedores duplicado:** CNPJ único e busca por nome antes de criar.
- **Compra fora do sistema:** o Financeiro só aceita reembolso ou fatura com a compra registrada; isso é regra de gestão, não de software (pergunta 6).

## 7. Perguntas para o dono

1. **Quem compra hoje?** Uma pessoa só ou várias (e quem substitui nas férias)?
2. **Quem aprova e até que valor?** As faixas da tabela 8 (R$ 1.000 e R$ 10.000) servem ou são outras?
3. **Quantas cotações por faixa?** 1, 2 e 3, como na tabela 8, ou sempre 3, como o COMMAND exige hoje?
4. **Há estoque de peças?** Guardamos peças e insumos para usar depois (vedações, resistências, filtros) ou compramos sempre sob demanda?
5. **Já existe uma lista de fornecedores** (planilha, contatos do celular, e-mails) que possamos carregar no cadastro?
6. **Como o Financeiro confere hoje?** Pela fatura do cartão (qual cartão; Flash?), por boleto e nota? A compra fora do sistema deixará de ser aceita?
7. **Compras fica em qual área?** Logística ou Administrativo (decide quem é o gestor e para onde vão os itens parados)?

## Anexo A. Referências no código

COMMAND = C:\Users\venda\projetos\metrolabs_command. SGO+ = C:\Users\venda\projetos\google-script-dev\apps-script-imports\portal_sgo_versao_cnpj_db.

Tabela A1 — COMMAND

| Assunto | Arquivo:linha |
| --- | --- |
| Descrição do fluxo e das regras | `Compras.js:1-25` |
| Tabelas (FORNECEDORES, REQUISICOES, REQ_COTACOES, REQ_APROVACOES, REQ_HIST, COMPRAS_POLITICA) | `Compras.js:27-45` |
| 16 situações e transições | `Compras.js:47-73` |
| Faixas padrão e mínimo de cotações por nível | `Compras.js:76-84` |
| Prazos dos alertas (1 dia sem pedido, 2 dias especificação, 4 h crítica) | `Compras.js:90-91` |
| Criar requisição; aviso de especificação incompleta | `Compras.js:256-295` (aviso em `:286`) |
| Requisição criada por outro módulo (Assistência, Pós-venda) | `Compras.js:297`; uso em `Assistencia.js:428-439` e `PosVenda.js:178-183` |
| Nível de aprovação pelo valor | `Compras.js:341-358` |
| Minhas requisições (sem valores) | `Compras.js:448` |
| Cadastro de fornecedor | `Compras.js:545` |
| Validar especificação; aviso "complete a especificação" | `Compras.js:629-657` (aviso em `:645`) |
| Cotação: total, validade, elegibilidade, salvar | `Compras.js:664-708` |
| Escolher vencedora; mínimo de cotações forçado em 3 | `Compras.js:763-818` (mínimo forçado em `:783`; regra de 3 em `ComprasRastreio.js:22`) |
| Quem pode aprovar; aprovar e reprovar | `Compras.js:820-876` (avisos em `:858` e `:871`) |
| Registrar pedido; aviso de peça pedida | `Compras.js:878-904` (aviso em `:897`) |
| Recebimento com conferência; peça disponível | `Compras.js:906-956` (peça disponível em `:941`, aviso em `:943`) |
| Passos simples, entrega, encerramento, cancelamento | `Compras.js:958-1006` (aviso em `:998`) |
| Revisão da especificação pela inteligência artificial | `Compras.js:1008-1034` |
| Alertas da central e do SEDNA | `Compras.js:1036-1092` |
| Rastreabilidade: vínculo, cotação com arquivo, pagamento | `ComprasRastreio.js:1-160` |
| Envio ao Financeiro; aviso "compra para conferir" | `ComprasRastreio.js:166-173` (aviso em `:170`) |
| Conferência, divergência, planilha | `ComprasRastreio.js:192-318` (aviso em `:290`) |
| Aviso ao vínculo (chamado, vendedor) | `ComprasRastreio.js:320-345` (aviso em `:339`) |
| Abas da tela | `ModCompras.html:64-70`; Financeiro em `:528` |
| Permissões e papéis | `Papeis.js:24-25, 33-46, 60-61` |
| Testes | `testes/t_compras.js`, `testes/t_zzzzzzzzzzzz_compras_rastreio.js` |

Tabela A2 — SGO+

| Assunto | Arquivo:linha |
| --- | --- |
| Setores da passagem do pedido aprovado (Compras = área Logística, 1 dia útil, lista de conferência) | `SGO_Comercial_Config.js:84, 194-197` |
| Passagem do pedido aprovado aos setores (cria atividades) | `SGO_Comercial_Propostas.js:725-755` |
| Criar atividade a partir de um módulo | `SGO_Comercial_Config.js:551`; `SGO_Atividades.js:526` (Atividades_apiCriar) |
| Catálogo do Comercial (preço e custo) | `SGO_Comercial_Config.js:44, 55` |
| Caixa de decisões: regras de roteamento e tipos (inclui os do Comercial) | `SGO_Gestao_Decisoes.js:1-40, 91-110, 311` |
| Central de pendências: fontes do Comercial e da gestão | `SGO_Alertas_Central.js:143, 988-990` |
| Áreas padrão (Administrativo com "compras administrativas", Logística, Financeiro) | `SGO_Areas.js:32-48` |
| Perfis (sem perfil Compras) | `SGO_Config.js:50-68` |
| Frota: manutenção com CUSTO e OFICINA em texto, despesas, abastecimentos com POSTO | `SGO_Frota_Main.js:427-444, 1575` |
| Documento A4 salvo em HTML e PDF | `SGO_DocSalvar.js:49-68`; modelo da proposta em `SGO_Comercial_Documento.js:36` |
| Enviar documento | `SGO_EnviarDoc.js` |
| Consulta de CNPJ | `SGO_CnpjConsulta.js` |
| Matriz de avisos (itens C030 a C039, princípios) | `docs/MATRIZ_DE_AVISOS_20261021.md:41-56, 353-366` |
