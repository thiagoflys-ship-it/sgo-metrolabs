# Manual da gestão: preços, ficha de custo e parâmetros do Comercial

Versão de 01/11/2026 (Comercial C2), com o Banco de preços e o Orçamentista (Comercial C3). Para a gestão comercial, a Diretoria, o Administrador e o Financeiro. Telas: Comercial > Metodologia comercial > Preço e desconto, Comercial > Produtos e serviços, Comercial > Banco de preços e Comercial > Orçamentista. Estudo de origem: docs/COMERCIAL_C1_PRECIFICACAO_20261101.md. Manual do módulo: docs/MANUAL_MODULO_COMERCIAL.md.

## Quem muda o quê

| O quê | Quem |
|---|---|
| Impostos, comissão, margens, custo da hora, custo fixo, hora avulsa, deslocamento e faixas de prazo | Diretoria e Administrador |
| Limite de desconto do vendedor, alçadas, desconto por pagamento até o dia 10 e o texto da política de desconto | Gestão comercial, Diretoria e Administrador |
| Importar a tabela de preços C1 | Gestão comercial, Diretoria e Administrador |
| Ficha de custo do item e "Usar o preço sugerido" | Gestão comercial, Diretoria, Administrador e Financeiro |

## A regra do preço

Preço de tabela = custo ÷ (1 − impostos − comissão − margem alvo). Com os valores iniciais: custo ÷ 0,6275, ou seja, custo × 1,594. O preço mínimo usa a margem mínima (custo ÷ 0,7275). O preço arredonda para cima: R$ 5 abaixo de R$ 100 e R$ 10 a partir de R$ 100. A página mostra a regra com o exemplo da qualificação de autoclave refeito a cada número que muda.

Custo do serviço = horas do técnico × custo da hora do técnico + horas do engenheiro × custo da hora do engenheiro, mais o custo fixo sobre essa mão de obra, mais padrões e consumíveis.

Preço sugerido: o preço pela conta. Quando a mediana do mercado público e a mediana do que a Metrolabs cobrou (CRM 2025-26) ficam as duas acima da conta, o preço sobe até o menor dos dois. Exceções da tabela: ultracongelador com piso de 120% do freezer e hora técnica avulsa no valor da política.

Deslocamento: custo ÷ (1 − impostos), sem margem e sem comissão.

## Valores iniciais (provisórios até o dono confirmar)

| Parâmetro | Valor inicial |
|---|---|
| Impostos sobre a nota | 14,25% (Lucro Real) |
| Comissão | 3% |
| Margem alvo e margem mínima | 20% e 10% |
| Custo da hora | técnico R$ 45,00; engenheiro R$ 132,00 |
| Custo fixo sobre a mão de obra | 25% |
| Hora técnica avulsa | R$ 190,00 |
| Km rodado | R$ 2,50 (ida e volta) |
| Taxa por viagem | R$ 300,00, só fora da Grande Goiânia (trecho acima de 60 km); o nome é editável |
| Benefício da Conduta | R$ 300,00 por pessoa em trecho acima de 200 km (vem do Programa de conduta) |
| Alimentação | R$ 100,00 por pessoa por dia, fora da Grande Goiânia |
| Hotel | R$ 150,00 por pessoa por noite |
| Alçadas de desconto (referência) | vendedor 5%, gerente 10%, Diretoria até 13,75% |

Campo deixado em branco volta ao valor inicial. Os valores que ainda dependem do dono aparecem com o selo "valor provisório": salários reais e horas faturáveis, custo fixo real, o que é a taxa por viagem, calibração própria ou de parceiro, comissão, a faixa prioritária, se o cliente de contrato paga urgência, as alçadas, o fim do desconto por pagamento até o dia 10 e se o prazo conta até a execução ou até o relatório. Quando o dono confirmar, marque em "O que o dono já confirmou". Enquanto houver valor provisório, o panorama da gestora lembra.

## Margem mínima única

Existe uma margem mínima só: a sobra depois de impostos, comissão e custos (itens com custo, deslocamento e frete). A comissão não incide sobre o deslocamento nem sobre o frete. Abaixo da mínima, a proposta vai para a Caixa de decisões e só a Diretoria aprova; o gestor comercial pode negar.

Antes havia duas margens: a da política de desconto (margem bruta dos itens com custo) e a da política de precificação. Na leitura, vale a da precificação; se ela estava vazia, vale a antiga da política de desconto (quando maior que zero); sem nenhuma das duas, 10%. Os dois valores antigos aparecem na página e ficam no histórico das versões.

## Faixas de prazo

| Faixa | Prazo | Acréscimo | Situação inicial |
|---|---|---|---|
| Normal | 10 dias úteis | 0% | sempre ligada |
| Prioritária | 5 dias úteis | 50% | desligada até o dono aprovar |
| Urgente | 3 dias úteis | 110% | ligada |

- O acréscimo vale só para serviço. Deslocamento e produto ficam fora.
- "Licitação ou contrato: sem acréscimo de urgência" aparece na proposta; o texto é editável.
- O prazo conta até a entrega do relatório ou certificado (padrão) ou até a execução (o relatório sai em até 5 dias úteis depois). O documento explica ao cliente em cada item e em "Prazo de execução".
- Urgente e prioritária precisam de menos dias que a Normal; o sistema confere ao salvar.
- A proposta guarda as faixas em vigor quando foi salva. Mudar os dias ou o acréscimo de uma faixa depois vale para as propostas novas e para os rascunhos salvos de novo; o documento de proposta já concluída ou enviada continua com o prazo da época.

## Importar a tabela de preços C1

1. Em Produtos e serviços, toque em "Importar tabela de preços C1".
2. Confira a prévia: os 42 serviços, com custo e preço sugerido pela política em vigor. Cada linha diz se é novo, se já existe um item com o mesmo código ou nome (lado a lado, com o preço e o custo de hoje) ou se já foi importado. O nome é comparado sem acento, sem maiúscula, sem pontuação e sem as palavras de ligação: "Manutenção preventiva em seladora" e "Manutenção preventiva de seladora" são o mesmo serviço. Com mais de um item igual no catálogo, a prévia mostra o que tem preço e avisa quantos outros existem (confira em Situação > "Possíveis duplicados (mesmo nome)").
3. Para o que já existe, escolha "Preencher só o que está vazio" (horas, padrões, consumíveis, categoria, descrição, custo e referências; nunca troca preço, nome ou descrição já gravados), "Deixar como está (não importa este serviço)" ou "Criar um item novo (o existente fica como está)", para quando o nome parecido é de outro serviço.
4. Toque em "Importar" e confirme.

Rodar de novo não duplica: o item importado fica ligado à tabela e aparece como "Já importado". Se alguém mudou o catálogo entre a prévia e a importação, o sistema pede a prévia de novo. Uma escolha inválida para algum item para a importação inteira antes de gravar qualquer coisa.

Item que já tinha custo cadastrado: a importação preenche as horas da ficha (a conta da tabela aparece em "Ficha de custo"), mas o custo usado nas propostas continua o cadastrado até a gestão conferir as horas e tocar em "Salvar a ficha". A prévia e a ficha avisam.

## Ficha de custo e preço sugerido

- "Ficha de custo" do item mostra a conta aberta, o preço sugerido, o mínimo, o urgente, o mercado público (menor, mediana e maior preço, com quantos preços), o Centro-Oeste e o histórico da Metrolabs.
- Ajuste as horas, os padrões e os consumíveis e toque em "Salvar a ficha". Fica no histórico do item.
- O preço sugerido muda na hora quando a Diretoria muda um parâmetro. O preço de venda só muda quando você toca em "Usar o preço sugerido" e escreve o motivo; o histórico guarda o preço anterior, o novo e o motivo. As propostas já salvas guardam o preço antigo.
- Nas propostas novas, o custo do item com ficha é o custo da ficha pela política em vigor. Exceção: item que já tinha custo cadastrado antes da importação continua com o custo cadastrado até a gestão salvar a ficha.

## O que a gestora aponta

- Item abaixo do preço mínimo da tabela (na faixa escolhida).
- Item abaixo do menor ou acima do maior preço público (com pelo menos 3 preços).
- Deslocamento abaixo do custo da viagem.
- Prazo urgente ou prioritário sem a agenda confirmada pela Área técnica.
- Desconto por pagamento até o dia 10 quando a política não permite.
- Desconto acima da alçada da Diretoria.
- Valores da política ainda provisórios.

## Banco de preços (gestão)

Comercial > Banco de preços (tabela COM_PRECOS, uma linha por preço observado). Campos: tipo (serviço ou produto), item do catálogo e da tabela C1, descrição, unidade, valor unitário, quantidade, data, cidade e UF, cliente, origem (proposta da Metrolabs, CRM, licitação, cotação de fornecedor, concorrente ou internet), resultado (ganho, perdido, em aberto ou referência), concorrente e valor do vencedor, fornecedor e marca, custo (só gestão), link ou fonte, confiança e quem registrou. Nada é apagado: revisão substituída, proposta cancelada e preço tirado das contas ficam marcados, fora do mínimo, da mediana e da taxa de ganho.

**Carga inicial e Compras.** Toque em "Carga inicial e Compras". A prévia mostra, por origem, o que já está e o que entra, e o que ficou de fora da C1 de propósito: 360 preços públicos de lote, valor global ou mensal; os valores do Drive que não são preço unitário de um serviço da tabela; as linhas de deslocamento do CRM. A carga só acrescenta o que falta: rodar de novo não repete nada. As cotações de fornecedor já lançadas em Compras entram como "cotação de fornecedor" (o valor é o custo); Compras não muda. Cotação nova em Compras entra na próxima carga.

**O que só a gestão vê.** Custo de cada preço praticado (o custo cadastrado no CRM e o da proposta), a margem bruta (preço menos custo, antes de impostos), o preço de compra dos fornecedores, o histórico por fornecedor e a relação entre a mediana de venda e a de compra.

**Tirar das contas.** Em "Ver o item", "Tirar das contas" pede o motivo (por exemplo "valor da proposta inteira, não do item"). O preço fica no banco, marcado; "Voltar às contas" desfaz.

**Preços fora da curva.** "Preços fora da curva" lista os preços com menos de 1/5 ou mais de 5 vezes a referência: o preço normal da tabela C1 (serviços da tabela) ou a mediana do item (com pelo menos 4 preços). Exemplo da carga: qualificação de autoclave a R$ 4,50, lido por regra numa proposta antiga do Drive. A carga da C1 tem cerca de 100 casos assim (propostas antigas do Drive, CRM e licitações). Todos vêm marcados: desmarque o que for preço de verdade, escreva o motivo (vale para todos os marcados) e confirme. Nada é apagado; ficam fora das contas, com o motivo e o seu nome. Cotação de fornecedor não entra nessa lista.

**O cliente para o vendedor.** O vendedor vê o nome do cliente só nas linhas dele (propostas e registros que ele fez) e nas licitações (o órgão é público). Nas outras, o valor aparece e entra nas contas, sem o cliente, e a busca pelo nome do cliente não as encontra. Na cotação de fornecedor, o vendedor não vê valor, fornecedor, marca nem a requisição de Compras.

**Itens do catálogo sem código da tabela.** Serviço do catálogo sem o código da tabela C1 (os que vieram do CRM antigo, enquanto a tabela não é importada ou quando o nome é outro) casa com o serviço da tabela pelo nome quando o nome começa pela atividade (qualificação, calibração, manutenção preventiva) e aponta um único serviço. Assim o histórico do CRM e das licitações aparece no item, e as propostas entram no mesmo grupo do banco. Reparo, corretiva, instalação, controle de qualidade e contrato ficam pela descrição. Na cópia do catálogo de 01/11/2026, 47 dos 122 serviços casam assim.

**Indicadores no Painel.** No fim do Painel comercial: taxa de ganho por serviço e por produto, preço médio ganho e perdido (com a leitura "ganhamos com preço menor" ou "mesmo com preço maior"), de quem mais perdemos, quem mais vence as licitações do banco, propostas perdidas sem o vencedor informado e os itens ativos do catálogo sem preço de referência.

## Margem sobre peças e produtos

Em Metodologia > Preço e desconto, "Margem sobre peças e produtos" (valor inicial 30%, da planilha interna citada na C1). O Orçamentista sugere o preço de venda do produto pela última cotação de fornecedor: custo ÷ (1 − margem). Só a gestão vê esse preço sugerido: com a margem conhecida, ele entregaria o preço de compra (sugerido × 0,7). O vendedor vê o preço de venda praticado (último e mediana das propostas e do CRM) e, quando o preço do catálogo está abaixo do sugerido, um aviso sem número para conferir com a gestão.

## Orçamentista: IA e busca na internet

Sem a chave da IA, o Orçamentista funciona pelas regras. Com a chave (Administração > Chaves e senhas > Chave da IA), a IA lê o pedido e escreve a justificativa, sempre conferida contra os números do sistema (só 0, 1 e 2 ficam livres; qualquer outro número precisa estar nos fatos); preço nunca vem da IA. Cada pessoa faz até 20 análises com IA por hora; depois, vale só as regras, com o aviso.

A busca de preços na internet usa a mesma chave da IA com a pesquisa do Google, no servidor (a chave não vai ao navegador). Para ligar: Administração > Chaves e senhas > Inteligência artificial > "Comercial: buscar preços na internet" = Ligado. Resposta da IA sem pesquisa na web não é aproveitada; resultado sem link https ou sem valor é descartado; nada entra no banco sem a confirmação de quem buscou, com o link e, se o valor mudou, o motivo. Cada pessoa faz até 10 buscas por hora; a mesma busca (mesma pessoa, item, tipo e UF) nas últimas 6 horas devolve o resultado já achado, sem chamar a IA de novo. Outro serviço de busca entra pelo ponto de extensão COM_BP_PROVEDORES_BUSCA (SGO_Comercial_BancoPrecos.js) e é escolhido em "Comercial: serviço de busca de preços".

## Problemas comuns

| Situação | O que fazer |
|---|---|
| "Só é alterada pela Diretoria ou pelo Administrador" ao salvar Preço e desconto | O gestor comercial muda só o desconto. Desfaça a mudança nos outros campos e salve de novo. |
| "O catálogo mudou desde a prévia" ao importar | Toque em "Importar tabela de preços C1" de novo e confira a prévia. |
| O preço sugerido mudou e o preço de venda não | É o esperado: confirme em "Usar o preço sugerido", com o motivo. |
| "Impostos, comissão e margem passam de 95% do preço" | Confira os percentuais: a conta do preço não fecha. |
| "O banco mudou desde a prévia" na carga | Alguém carregou ou registrou preços. Toque em "Carga inicial e Compras" de novo. |
| A busca na internet diz "não está configurada" | Ligue "Comercial: buscar preços na internet" em Chaves e senhas e confira a Chave da IA. |
| Um preço distorce a mediana | Em "Ver o item", "Tirar das contas", com o motivo. Vários de uma vez: "Preços fora da curva". |
| "O banco mudou desde a prévia" em Preços fora da curva | Alguém registrou ou tirou preços das contas. Abra "Preços fora da curva" de novo. |
