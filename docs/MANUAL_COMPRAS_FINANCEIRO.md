# Manual de Compras para o Financeiro e a gestão: cartões, conciliação das faturas, A pagar, painel e relatórios

Versão de 31/10/2026. Telas: Compras > Cartões da empresa, Conciliação das faturas, A pagar e Painel de compras. Para quem: Financeiro (perfil ou área), Diretoria, Administrador e o gestor da área de Compras. A compra informada pelos colaboradores está no manual do módulo Compras (seção "Informar compra já feita").

## Para que serve

Desde 31/10/2026 (pedido do dono), as compras feitas com os cartões da empresa, faturadas, por boleto, Pix, dinheiro do caixa ou com o dinheiro do próprio colaborador são informadas no sistema, com o comprovante. Cada compra ganha as suas parcelas ou o seu vencimento. Com isso o Financeiro:

- bate cada fatura de cartão com as compras informadas, importando o extrato que o banco exporta;
- cobra automaticamente quem responde pelo cartão quando há lançamento na fatura sem compra informada;
- vê numa lista só o que há a pagar (faturado, boleto, reembolso) e baixa com o comprovante;
- tira relatórios A4 por colaborador, por cliente e chamado, por forma de pagamento, do período e da conciliação de cada fatura, que ficam salvos.

## Cartões da empresa

Cada cartão é cadastrado pelo final (os 4 últimos números; nunca o número inteiro), com apelido, tipo (crédito, débito ou os dois), responsável, dia de fechamento, dia de vencimento, limite (opcional) e observações. Financeiro, Diretoria e Administrador cadastram; compradores e gestores consultam.

1. Compras > Cartões da empresa > "Novo cartão".
2. Preencha o final, o apelido, o tipo, o responsável e os dois dias (estão na fatura).
3. "Salvar o cartão".

Ao salvar, as compras já informadas com aquele final se ligam ao cartão e a fatura de cada parcela ainda não conciliada é recalculada com os dias reais. Na edição, só o que mudou é gravado, com o motivo, e fica no histórico do cartão. Dois cartões ativos com o mesmo final não são aceitos.

"O que falta" lista, uma linha por condição, o que impede a conciliação completa: nenhum cartão cadastrado, cartão sem responsável ativo, cartão de crédito sem os dias de fechamento e vencimento, final usado em compras e ainda não cadastrado (com o botão para cadastrar) e ninguém com o perfil ou a área Financeiro.

## Em que fatura cai cada parcela

- A fatura é identificada pelo mês do vencimento.
- Compra feita antes do dia do fechamento entra na fatura que fecha no mesmo mês; no dia do fechamento ou depois, na seguinte. O vencimento cai no mesmo mês do fechamento quando o dia do vencimento é maior que o do fechamento; senão, no mês seguinte.
- Parcelado: a parcela 1 cai na fatura da compra; a parcela 2 na seguinte, e assim por diante. O valor é o total dividido pelas parcelas; a diferença de centavos fica na primeira.
- Cartão ainda não cadastrado: a fatura é estimada (mês seguinte ao da compra) e aparece marcada "fatura estimada" até o cadastro.
- Faturado e boleto: um vencimento na data informada. Reembolso: a pagar ao colaborador em 5 dias úteis. Pix, transferência, débito e dinheiro do caixa: pago na data da compra (confere pelo comprovante).

As compras do fluxo normal (pedido de compra) também ganham as parcelas quando o pagamento é registrado.

## Conciliação das faturas

1. Compras > Conciliação das faturas: escolha o cartão e o mês da fatura (mês do vencimento). A tela mostra o total do extrato, o total das compras informadas, a diferença e os itens em aberto.
2. Exporte a fatura pelo banco em CSV, Excel (.xlsx) ou OFX. As colunas são reconhecidas pelo nome (data, descrição ou estabelecimento, valor, parcela e final do cartão, quando houver).
3. Escolha o arquivo e toque em "Ver a prévia": mostra cada lançamento e com que compra ele casa. Nada é gravado.
4. "Importar e conciliar" grava os lançamentos e casa sozinho: mesmo final, valor com diferença até R$ 0,05, data da compra até 3 dias e, quando o extrato traz "02/03", a mesma parcela. Lançamento já importado não entra duas vezes; pagamento da fatura, saldo, estorno e crédito são ignorados com o motivo. O arquivo fica guardado e listado em "Importações".

Situações:

| Situação | O que é | O que fazer |
| --- | --- | --- |
| Conciliada | Lançamento e compra casados | Nada |
| Não informada | Está na fatura e ninguém informou a compra | O responsável do cartão é cobrado. Se a compra existe com valor diferente (frete, por exemplo), "Casar" com a parcela. Se não é compra (tarifa, assinatura, anuidade), "Justificar" |
| Justificada | Lançamento explicado sem compra, com o motivo | "Reabrir" volta a cobrar |
| Não está na fatura | Compra informada que não veio no extrato deste mês | "Próxima fatura" (compra perto do fechamento) ou "Divergente" (quem comprou é avisado) |
| Divergente | Compra com problema apontado | Resolva com quem comprou e toque em "Voltar a conciliar" |

Toda ação manual pede o motivo (pelo menos 15 letras) e vai para a trilha, com antes, depois, quem e quando. Quem comprou ou informou a compra não concilia a própria; outra pessoa do Financeiro ou a Diretoria faz.

### Fechar a fatura

Com tudo conciliado ou justificado, "Fechar a fatura" grava os totais. Se algo ficou aberto e é preciso fechar assim mesmo, "Fechar com ressalva" pede o motivo (pelo menos 20 letras) e o que ficou aberto continua na lista. Fatura fechada não aceita nova importação nem mudança de situação; reabrir é da Diretoria, com motivo.

"Relatório A4 da fatura" gera o relatório da conciliação (resumo, lançamentos, compras, importações) e salva em HTML e PDF.

## Cobrança de quem não informou

O lançamento "Não informada" vira na hora uma pendência no Início do responsável pelo cartão, com a data e a descrição do lançamento (sem valor), e aparece na aba "Compras a informar" dele, com o botão "Informar esta compra". Depois de 2 dias úteis (configurável), sai o e-mail no expediente (evento CP02 da matriz de avisos); no WhatsApp, só entra na contagem do resumo do dia, em dia útil. Depois de 5 dias úteis (configurável), entra na Caixa de decisões do gestor da área da pessoa e vira sugestão na fila do Programa de conduta, que a gestão decide; nada é automático. A sugestão some sozinha quando a compra é informada ou o lançamento é justificado. Lançamento de cartão sem responsável vai para o Financeiro, com o pedido de cadastrar o responsável.

## A pagar

Compras > A pagar lista, por vencimento, as compras faturadas, os boletos e os reembolsos a colaboradores. No alto, o total a pagar, os vencidos e os reembolsos pendentes. "Marcar como pago" pede a data e o comprovante; no reembolso, o colaborador é avisado. Ninguém baixa o próprio reembolso. Vencido ou vencendo hoje aparece no Início do Financeiro, e o resumo do dia (evento CP03) vai no e-mail.

## Conferência do Financeiro

Continua como antes, com a compra informada junto: selo "Informada depois de feita", os apontamentos (duplicidade possível, acima do comum, informada com atraso, cartão não cadastrado) e o comprovante. Quem comprou não confere a própria compra, nem quem a registrou.

## Ciência da gestão

Compra informada acima do limite da compra direta (R$ 1.000 no padrão) entra na Caixa de decisões da gestão até alguém tocar em "Ciente" na ficha, como a compra sem pedido.

## Painel de compras

Compradores, gestores, Financeiro e Diretoria. No alto, os índices do período escolhido (30, 90, 180 ou 365 dias): total comprado, parcela informada depois de feita, tempo médio para informar e percentual no prazo, lançamentos na fatura não informados, taxa de conciliação, compras com apontamento, a pagar vencido, compras em aberto e entregas atrasadas, compras aguardando o Financeiro e faturas abertas.

- Kanban: uma coluna por situação (as entregues dos últimos 30 dias); a cor da borda é a situação da entrega.
- Gantt: cada barra vai do pedido (ou da data da compra informada) até a chegada; o tracejado é a previsão de entrega e o losango, o recebimento.
- Indicadores: gasto por forma de pagamento, por colaborador, por vínculo e nos últimos 6 meses.
- Relatórios: gerar e abrir de novo os relatórios A4.
- Mês em detalhe: o painel mensal de antes e o relatório mensal.

## Relatórios A4

Em Painel de compras > Relatórios (e na conciliação, o da fatura). Todos com o padrão dos documentos do SGO+, índice e gráficos, salvos em HTML e PDF na pasta "Compras - Relatórios" e listados em "Relatórios gerados":

| Relatório | Conteúdo |
| --- | --- |
| Compras por colaborador | Gasto por pessoa com gráfico, formas e cartões usados, compras com apontamento, informadas com atraso e a lista |
| Compras por cliente e chamado | Gasto por cliente, por chamado da Assistência (custo do atendimento) e por pedido do Comercial, e a lista |
| Compras por forma de pagamento | Gasto por forma e por cartão, parcelas e vencimentos em aberto por mês |
| Total de compras do período | Gasto por mês, por vínculo, por origem (pedido de compra ou informada), por área e por fornecedor, controles e a lista |
| Conciliação da fatura do cartão | Resumo, lançamentos com a situação, compras da fatura e importações |

## Regras

Em Compras > Regras de compras, quadro "Compra informada depois de feita": limite da compra direta, prazo para informar, até quantos dias atrás qualquer pessoa informa, quantas vezes a média é "acima do comum", prazo do reembolso, quando a cobrança vai por e-mail e quando vai à Caixa de decisões e ao Conduta. Cada mudança vira uma versão com motivo.

## Integração

- Assistência técnica: a ficha do chamado mostra "Compras ligadas ao chamado", com o custo para quem vê valor.
- Comercial: a ficha do pedido aprovado mostra "Compras deste pedido", com o custo para quem vê valor.
- Minhas atividades: a compra informada que "ainda vai chegar" segue o recebimento normal; a peça disponível avisa quem comprou e vira a atividade de entrega do comprador.
