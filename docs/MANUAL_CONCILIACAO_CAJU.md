# Manual da Conciliação Caju

Versão de 11/11/2026. Menu: Financeiro > Conciliação Caju. Quem usa: o Financeiro (controle total). A Diretoria e o Administrador acompanham e geram os relatórios. Quem viaja não usa este módulo: lança os gastos no Depósito de viagem e gera ali o próprio relatório individual.

## Para que serve

O dinheiro da viagem vai para o cartão Caju de quem viaja. Este módulo faz a carga pelo Caju sem entrar no portal, acompanha até o crédito cair no cartão, traz o extrato do cartão e confere, gasto a gasto, se o que foi pago bate com a prestação de contas (comprovante e para que foi). O que não bate vira divergência, com o dono (quem precisa agir) e o motivo. No fim do mês, o Financeiro fecha o período por centro de custo, com o relatório A4.

## Modo da carga

A carga do depósito de viagem tem dois modos, escolhidos pelo Financeiro em Configuração (cada mudança vira versão com o motivo):

Carga pelo Caju (pedido de benefício via API) | o SGO+ cria e paga o pedido de crédito no Caju, acompanha e registra a carga sozinho.
Carga manual (Caju Despesas ou outro) | o Financeiro carrega fora do SGO+ e registra a carga na viagem com o comprovante; os gastos são conciliados pelo extrato importado.

O padrão é a carga manual, e ela vale sempre que as credenciais do Caju não existem. Motivo: o Caju respondeu oficialmente (protocolo 02527150, 11/11/2026) que a API de parceiros contempla colaboradores (cadastro, arquivamento, desarquivamento e transferência entre empresas) e pedidos de benefício (criação e fechamento), mas não o módulo de Despesas. O tipo TRIP, as categorias, o extrato e os avisos automáticos (webhooks) ainda serão respondidos pelo time técnico do Caju.

## Antes de começar

1. O responsável pelo sistema grava as credenciais do Caju em Administração > Chaves e senhas, grupo Caju: ambiente, Client ID, Client Secret, ID e senha da integração. Comece pelo ambiente de homologação (conta fictícia): o crédito é fictício e a carga não entra no depósito.
2. Em Configuração, escolha o modo da carga. No modo pelo Caju, toque em Testar a conexão e escolha a categoria do crédito (em que saldo do Caju o dinheiro da viagem cai). Também dá para escolher na primeira carga.
3. Em Colaboradores, toque em Atualizar a lista do Caju e vincule cada pessoa que viaja pelo CPF.

## Colaboradores

Cada pessoa do SGO+ é ligada ao cadastro dela no Caju pelo CPF. Digite o CPF e toque em Vincular pelo CPF, ou toque na sugestão pelo nome (vinda da lista do Caju). Quem não está no Caju: Cadastrar no Caju, confira o nome completo, o CPF e o e-mail ou o celular (o Caju exige um dos dois) e confirme. Pessoa que saiu da empresa: Arquivar no Caju, com o motivo; arquivada, não recebe carga. O alerta vermelho aponta quem está inativo no SGO+ e ativo no Caju. O CPF aparece sempre mascarado.

## Carga pelo Caju

Só no modo Carga pelo Caju. No modo manual, a viagem mostra só o registro da carga com o comprovante.

1. Abra a viagem aprovada em Depósito de viagem > Carga no cartão.
2. No quadro Fazer a carga pelo Caju, confira o valor (nunca passa do que falta carregar do aprovado; menor só com o motivo) e toque no botão. Confirme na caixa.
3. O SGO+ cria o pedido VIAGEM <número> e paga com o saldo da conta Caju da empresa (o crédito mais a taxa do Caju).
4. Faltou saldo: o pedido fica criado e não pago. Coloque saldo e toque em Tentar de novo com o saldo, ou em Pagar por PIX: o código aparece na tela, com o botão Copiar, para pagar no banco da empresa.
5. O SGO+ consulta o Caju a cada 15 minutos (ou no botão Atualizar). Creditado, a carga entra sozinha na viagem, com o número do pedido, a taxa, o total cobrado, o centro de custo e o comprovante do pedido.

Enquanto houver pedido em andamento, a viagem não aceita outro pedido, carga manual, edição nem cancelamento. Dá para cancelar o pedido enquanto o Caju deixar (rascunho, saldo insuficiente ou PIX não pago). Se a rede cair na criação, o pedido fica Conferir no portal do Caju: informe o número do pedido que está no portal ou toque em Não foi criado, liberar. Quem aprovou ou viaja não faz a carga.

## Importar o extrato

1. No Portal do RH do Caju, exporte o extrato de despesas em CSV do período.
2. Em Importar extrato, escolha o arquivo. A prévia mostra qual coluna do arquivo é cada informação (data, valor, colaborador, CPF, estabelecimento, tipo, centro de custo, identificador). Troque o que estiver errado e toque em Ver a prévia de novo.
3. Toque em Importar estas linhas e confirme. Linha já importada é pulada; o mesmo arquivo não entra duas vezes; o arquivo original fica guardado. O mapeamento fica lembrado para o próximo arquivo igual.
4. A conciliação roda sozinha. Importação errada: Desfazer esta importação, com o motivo.

## Divergências

Cada transação de gasto é ligada ao gasto da prestação da mesma pessoa, dentro do período da viagem, pelo valor exato e pela data (com a tolerância da configuração). O que não casa vira divergência:

Gasto no cartão sem comprovante | o dono lança o gasto na prestação com o comprovante e para que foi.
Valor do cartão diferente do comprovante | corrigir a prestação ou resolver com o motivo (gorjeta, taxa).
Gasto fora do período da viagem | pedir a explicação; gasto que não é da viagem vira devolução.
Gasto da viagem pago no cartão de outra pessoa | confirmar quem pagou.
Transação repetida | conferir cobrança em dobro no Caju.
Gasto lançado como cartão Caju que não aparece no extrato | corrigir Pago com ou conferir o período importado.
Centro de custo diferente, pessoa sem vínculo, crédito sem carga, pedido pago e não creditado, carregado acima do aprovado, recolhimento sem acerto, saldo que ficou no cartão, gasto sem descrição.

Para tratar: Resolver (com motivo), escolhendo como foi resolvida; Avisar o dono (sistema e e-mail, uma vez por dia); ou abrir a viagem e Ligar ao gasto à mão. Quando a condição deixa de existir, a divergência é sanada sozinha. Ninguém concilia a viagem em que viaja ou que pediu.

## Fechamento

Escolha o período e o centro de custo e toque em Ver a prévia. Resolva as pendências apontadas; se precisar fechar assim, escreva a ressalva. Fechado, as transações e divergências do período não mudam mais; para corrigir, Reabrir com o motivo. O A4 do fechamento fica na lista.

## Relatórios A4

Individual: todas as viagens em que a pessoa levou o dinheiro no período, com o carregado, o gasto por categoria, cada comprovante com para que foi, glosas, devolvido ou reembolsado, pendências e a situação da conciliação. O colaborador gera o dele em Depósito de viagem > Relatórios A4.
Geral: por colaborador, por centro de custo, por cliente ou O.S. e por categoria, com totais, gráficos, divergências abertas e índice.
Também: divergências, créditos pedidos ao Caju e a prévia do fechamento. Todos abrem no navegador (Imprimir para PDF) ou baixam em .html.

## Configuração e registro

A configuração (categoria, tolerância de datas, dias antes da saída e depois da chegada, alerta de crédito parado) grava versões com o motivo. O registro das chamadas mostra cada chamada ao Caju: quando, o quê, o resultado e quem, sem corpo, sem CPF e sem segredo.

## O que preencher em cada campo (16/11/2026)

Embaixo de cada campo da Conciliação Caju aparece a explicação abaixo. As explicações da Configuração que já existiam (categoria do crédito, tolerância de datas, dias antes da saída e alerta de crédito parado) continuam como estavam.

Ajuste de tela de 16/11/2026: o campo de arquivo (extrato CSV) tem área de toque maior no celular.

- **Extrato do Caju (CSV):** o arquivo de transações exportado no portal do Caju, do período que você quer conferir. Linhas já importadas são puladas.
- **Data da transação:** a coluna com o dia da compra ou da carga. Obrigatória.
- **Hora:** a coluna com o horário, se o arquivo tiver. Ajuda a separar duas compras iguais no mesmo dia.
- **Valor:** a coluna com o valor de cada transação. Obrigatória.
- **Colaborador (nome):** a coluna com o nome de quem usou o cartão. Usada quando o arquivo não traz o CPF.
- **CPF do colaborador:** a coluna com o CPF do portador. É a forma mais segura de saber de quem é cada transação.
- **Estabelecimento:** a coluna com o nome da loja. Ajuda a ligar o gasto ao comprovante da prestação de contas.
- **Descrição:** a coluna com o histórico da transação.
- **Tipo da operação:** a coluna que diz se é compra, carga, estorno ou recolhimento. Necessária se o sinal do valor não separar isso.
- **CNPJ do estabelecimento:** a coluna com o CNPJ da loja, se houver. Confirma a ligação com o comprovante.
- **Final do cartão:** a coluna com os últimos números do cartão Caju.
- **Centro de custo:** a coluna com o centro de custo usado no Caju. É comparado com o da viagem.
- **Categoria (MCC):** a coluna com o tipo de estabelecimento ou a carteira do Caju.
- **Identificador da transação:** a coluna com o código único (NSU, autorização). Evita importar a mesma transação duas vezes.
- **Sinal do valor:** como o arquivo mostra gastos e créditos. Confira numa linha de compra conhecida: se a compra aparece negativa, escolha "Gasto vem com sinal de menos".
- **Por que desfazer:** o motivo de retirar esta importação (ex.: arquivo do mês errado). As linhas saem da conciliação; o arquivo original continua guardado. Mínimo de 15 letras.
- **Situação:** filtra as transações por resultado da conciliação (conciliadas, divergentes, pendentes).
- **De quem é esta transação:** escolha o colaborador dono do cartão quando o arquivo não permitiu reconhecer.
- **Lembrar este nome:** marcado, as próximas importações reconhecem sozinhas o mesmo nome do extrato como esta pessoa.
- **Ligar a um gasto da prestação:** escolha o gasto lançado na prestação de contas que corresponde a esta transação do cartão.
- **Motivo:** obrigatório se o valor do gasto for diferente do cartão (ex.: gorjeta paga à parte). Fica no histórico.
- **Situação:** abertas precisam de ação; resolvidas foram fechadas com motivo; sanadas sumiram sozinhas porque a condição deixou de existir.
- **Como foi resolvida:** aceita com justificativa, corrigida (na prestação, no extrato ou no cadastro), vai para glosa (desconto do colaborador na conferência) ou não é gasto de viagem.
- **De:** o primeiro dia do período que será fechado. Depois de fechado, nada do período muda sem reabrir.
- **Até:** o último dia do período que será fechado. Depois de fechado, nada do período muda sem reabrir.
- **Centro de custo:** feche um centro de custo por vez ou deixe vazio para fechar todos.
- **Ressalva:** o que ficou pendente no fechamento e o encaminhamento (ex.: divergências repassadas ao gestor para cobrança dos comprovantes). Mínimo de 20 letras. Sai no A4.
- **Centro de custo:** filtra o painel. Em "Todos", mostra tudo.
- **Colaborador:** filtra o painel. Em "Todos", mostra tudo.
- **Relatório:** escolha o tipo de A4 (fechamento, divergências, créditos, individual ou geral).
- **De:** o primeiro dia do período do relatório.
- **Até:** o último dia do período do relatório.
- Centro de custo do relatório. Vazio = todos.
- **Colaborador:** de quem é o relatório individual.
- **Código PIX:** o código para pagar o pedido de crédito no banco. Copie e cole no aplicativo do banco da empresa.
- **Motivo do cancelamento:** por que o pedido de crédito será cancelado (ex.: viagem adiada pelo cliente). O pedido é cancelado também no Caju.
- **CPF:** o CPF do colaborador, só os números. É o que liga a pessoa do SGO+ ao cartão Caju.
- **CPF:** o CPF do colaborador, só os números. É o que liga a pessoa do SGO+ ao cartão Caju.
- **Nome completo:** exatamente como no documento. O Caju confere.
- **E-mail:** o Caju exige o e-mail ou o celular para o colaborador acessar o app.
- **Celular:** o Caju exige o celular ou o e-mail para o colaborador acessar o app. Com DDD e o 9.
- **Nascimento:** data de nascimento do colaborador, se o Caju pedir.
- **Modo de carga:** "pelo Caju" cria o pedido de crédito pela integração; "manual" é quando o Financeiro carrega direto no portal do Caju e só registra aqui.
- **Dias depois da chegada:** gasto até N dias depois do retorno ainda conta como da viagem (ex.: estacionamento cobrado no dia seguinte).
- **Motivo da mudança:** por que a configuração mudou (ex.: categoria confirmada com o Caju). Fica no histórico.

Motivos, conforme a ação:

- (Desconsiderar transação) **Por que desconsiderar:** por que esta transação não é gasto da viagem (ex.: compra pessoal já descontada com acordo). Fica no histórico e no A4.
- (Reabrir divergência) **Por que reabrir:** o que mudou (ex.: o comprovante apresentado não confere).
- (Reabrir fechamento) **Por que reabrir o fechamento:** o que chegou ou mudou depois (ex.: comprovante do hotel chegou depois).
- (Arquivar colaborador) **Motivo:** por que arquivar a pessoa no Caju (ex.: saiu da empresa). Fica no histórico.
- (Desarquivar colaborador) **Motivo:** por que desarquivar a pessoa no Caju (ex.: voltou a viajar). Fica no histórico.
- (Desfazer vínculo) **Motivo:** por que desfazer o vínculo (ex.: CPF informado errado). Fica no histórico.
- (Resolver divergência) **Motivo:** o que foi verificado e decidido (ex.: comprovante apresentado; diferença é taxa do estabelecimento). Vai para o histórico e para o A4 do fechamento. Mínimo de 15 letras.

**Sigilo na tela.** A Conciliação Caju mostra uma marca d'água discreta com o nome, o login, a data e a hora de quem está vendo, também na impressão (com o rodapé "Impresso por").

## Cargas do Caju no Omie (18/11/2026, Painel financeiro)

<!-- assistente: acesso=sigilo -->

Esta seção é só para a lista de sigilo do Financeiro. Por decisão do dono, o SGO+ é o registro principal e o Omie é o espelho. Cada carga paga ao Caju (de viagem ou da Recarga Caju da rotina; pela API ou registrada à mão) vira conta a pagar no Omie pelo Painel financeiro > Compras e Caju no Omie, com prévia e confirmação. Quando o Caju cobrou taxa de serviço, a taxa vira outra conta a pagar, na sua própria categoria (de-para das Regras do Financeiro; sem regra, o Financeiro escolhe). A observação do título leva a viagem ou a recarga, o colaborador e o centro de custo. O centro de custo só vai como departamento do Omie quando a Diretoria ligar essa opção nas Regras do Financeiro, depois da definição do contador. O pagamento segue a Aprovação de pagamentos. Nada muda nesta tela. Detalhes no manual do Painel financeiro, seção 8q.

## Recarga Caju da rotina na conciliação (18/11/2026)

A conciliação também liga as transações à Recarga Caju da rotina (Painel financeiro > Recarga Caju). Para quem é portador da rotina: o crédito da recarga liga à carga registrada; a devolução liga ao acerto da recarga; o gasto liga ao gasto lançado em Minha recarga Caju pelo valor exato e pela data (a linha escolhida pelo técnico ao comprovar tem prioridade). Dentro da janela de uma viagem, o gasto da viagem vem primeiro. Fora das viagens, a transação do portador sem comprovante vira "Recarga: gasto do cartão sem comprovante", do portador, em vez de "Gasto fora do período da viagem". Quem não é portador continua como antes.

Divergências da recarga (todas começam com "Recarga:"): sem comprovante, valor diferente e gasto sem transação são do portador; fora da política, leitura do comprovante diferente, comprovante repetido, saldo parado e crédito sem recarga são do Financeiro. Ninguém resolve a divergência do próprio cartão. Os valores e o detalhe ficam só para a lista de sigilo do Financeiro.
