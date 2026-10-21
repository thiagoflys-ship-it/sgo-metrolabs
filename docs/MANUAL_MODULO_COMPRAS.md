# Manual do módulo Compras e peças do SGO+

Versão de 21/10/2026. Telas: Compras > Pedir peça ou material, Meus pedidos de compra, Fila de compras (com cotações e aprovação), Fornecedores e Regras de compras.

## Para que serve

O Compras do SGO+ acaba com dois problemas: o pedido vago ("uma mangueira de 1/2") que leva à compra errada e a compra sem rastro (sem saber para que foi, quem aprovou, como foi paga e se o Financeiro conferiu). O caminho inteiro fica no sistema: alguém pede a peça com a especificação, o comprador confere, cota com os fornecedores, a compra é aprovada por quem tem alçada para aquele valor, o pedido é feito ao fornecedor, a peça chega e é conferida, é entregue a quem pediu e o Financeiro confere o pagamento.

As regras vieram do Compras do COMMAND, mais enxutas. As tarefas de cada pessoa são atividades de Minhas atividades; a aprovação por valor aparece e é cobrada na Caixa de decisões; os avisos seguem a matriz de avisos aprovada pelo dono.

## Quem faz o quê

Solicitante: qualquer colaborador interno. Pede, completa a especificação, acompanha em Meus pedidos de compra e recebe a peça. Não vê valores.

Comprador: quem está na lista de compradores ou de substitutos em Compras > Regras de compras. Confere a especificação, cadastra fornecedores, cota, escolhe, faz o pedido, recebe, entrega e cancela com motivo. Aprova as compras da faixa do comprador.

Gestor da área de Compras (Logística, no padrão): faz tudo o que o comprador faz e cobra as compras paradas.

Demais gestores: veem a fila com valores e aprovam as compras da faixa do gestor quando a área é deles.

Financeiro (perfil ou área): confere as compras e consulta os fornecedores.

Diretoria e Administrador: tudo, inclusive as Regras de compras. A Diretoria aprova a faixa mais alta.

Técnicos, Metrologia e RH não veem preço, orçamento nem pagamento.

## Situações de um pedido de compra

1. Solicitada: Compras recebeu. Quando falta algo na especificação, leva a marca "especificação incompleta" e não é cotada nem aprovada até completar.
2. Em cotação: o comprador está pedindo orçamentos.
3. Aguardando aprovação: orçamento escolhido; espera quem tem a alçada para aquele valor.
4. Aprovada: o pedido ao fornecedor vai ser feito.
5. Pedido feito: o fornecedor recebeu o pedido de compra.
6. Recebida com divergência: chegou com problema (quantidade, especificação ou dano).
7. Disponível: chegou e foi conferida; quem pediu é avisado.
8. Entregue: encerra.
9. Cancelada: sempre com o motivo.

## Pedir peça ou material

1. Toque em Compras > Pedir peça ou material.
2. Escreva para que é e onde será usado (obrigatório).
3. Escolha a urgência. Crítica é para equipamento ou atendimento parado: o comprador recebe a atividade com prazo no mesmo dia.
4. Escolha a que a compra está ligada: cliente (com a unidade e, se houver, o número da O.S. do Auvo), pedido aprovado do Comercial, veículo da Frota ou uso interno (com a explicação de pelo menos 20 letras). Nenhuma compra fica sem vínculo.
5. Acrescente os itens: tipo, descrição, quantidade e unidade. Um pedido pode ter vários itens.
6. Para peça de equipamento ou de veículo, informe o equipamento de origem e o número da peça com a marca, ou pelo menos dois dados técnicos (tensão, corrente ou potência, pressão, rosca, dimensão, material). Sem o número da peça, a foto é obrigatória.
7. Toque em "Enviar a Compras". O pedido recebe o número REQ-ano-número (por exemplo REQ-2026-0001).

Para material simples (papel, ferramenta comum) bastam descrição, quantidade e unidade.

O que falta aparece na hora, embaixo de cada item. O pedido pode ser enviado assim mesmo, mas fica marcado "especificação incompleta" e aparece para quem pediu no Início e em Meus pedidos até completar.

## Meus pedidos de compra

Mostra os pedidos que você fez e, para o vendedor, os do pedido aprovado dele no Comercial. Para cada um: situação, uma frase do que está acontecendo, previsão de entrega, itens e andamento. Não mostra valores.

Enquanto o pedido está "Solicitada", quem pediu pode alterar, completar a especificação ou cancelar com o motivo. Depois que a cotação começa, o cancelamento é pedido ao comprador.

## Fila de compras

A fila do comprador traz todos os pedidos, do mais urgente ao mais antigo, com abas por situação e busca. A ficha do pedido mostra os itens, as fotos, os dados técnicos, o vínculo, o histórico e os botões do que pode ser feito agora.

Conferir a especificação: se estiver clara, toque em "Especificação conferida: iniciar cotação". Se faltar algo ou estiver ambíguo, toque em "Devolver a especificação" e escreva o que falta: quem pediu recebe o texto no sistema e no resumo de e-mail da manhã, e o pedido volta para "Solicitada" até completar. O comprador também pode completar ele mesmo pelo botão "Editar a especificação".

Cada pedido novo com a especificação completa vira a atividade "Conferir e cotar" do comprador em Minhas atividades, com o prazo da urgência (crítica: no mesmo dia; alta e normal: 1 dia útil; baixa: 2 dias úteis; configurável).

## Cotações

Com o pedido "Em cotação", o comprador toca em "Lançar orçamento" para cada fornecedor: preço unitário de cada item, frete, impostos que não estão no preço, prazo de entrega, validade, número do orçamento do fornecedor, condição de pagamento e, para peça, se é original (mesmo número de peça), equivalente (especificação conferida) ou a confirmar. O total é calculado pelo sistema (preço vezes a quantidade pedida, mais frete e impostos). O arquivo do orçamento (PDF, foto ou e-mail salvo) é obrigatório: é a prova do preço e fica na pasta "Compras - Anexos", visto só por quem vê valores.

Um orçamento por fornecedor em cada pedido: para mudar, "Corrigir"; para tirar da comparação, "Retirar" com o motivo (fica no histórico).

## Escolha e aprovação por valor

O comprador toca em "Escolher este orçamento". Só pode ser escolhido o orçamento com arquivo, dentro da validade e com a compatibilidade confirmada. Se não é o mais barato, o comprador escreve o motivo. Se há menos cotações de fornecedores diferentes que o mínimo da faixa, escreve a justificativa (fornecedor único, urgência) e a compra aparece marcada para o Financeiro.

O valor total do orçamento escolhido define quem aprova (Regras de compras):

1. Faixa do comprador (até R$ 1.000 no padrão): a escolha feita pelo comprador já é a aprovação, registrada com o nome dele. Se quem escolheu é quem pediu, aprova o substituto (sem ele, o gestor da área).
2. Faixa do gestor (até R$ 10.000): o gestor da área de quem pediu (responsável em Caixa de decisões > Regras e responsáveis; sem ele, o Gestor com essa área no cadastro; sem ninguém, a Diretoria).
3. Faixa da Diretoria (acima de R$ 10.000): a Diretoria.

Quem pediu nunca aprova a própria compra. Acima da faixa do comprador, quem lançou ou escolheu orçamento também não aprova. A Diretoria pode aprovar qualquer faixa.

A compra fica "Aguardando aprovação" e entra na Caixa de decisões do aprovador, com prazo de 1 dia útil (urgência crítica: no mesmo dia). A decisão é tomada na ficha da compra: a Caixa mostra, cobra pela escada (e-mail da manhã, depois o resumo do WhatsApp da gestão e, parada, a Diretoria) e leva até a ficha. Na faixa do comprador, o item aparece no Início dos compradores.

"Aprovar" (observação opcional): o comprador recebe a atividade "Fazer o pedido de compra" (crítica: no mesmo dia; demais: 1 dia útil) e o aviso no sistema e no resumo de e-mail. "Reprovar" exige o motivo: a compra volta para cotação, o comprador recebe o motivo no sistema e a atividade "Rever a cotação". Orçamento vencido não é aprovado: reprove com o motivo para o comprador pedir a revalidação.

## Pedido de compra ao fornecedor

Com a compra "Aprovada", o comprador toca em "Emitir o pedido de compra", informa a previsão de entrega combinada e a forma de pagamento (cartão de crédito ou débito com os 4 últimos números e as parcelas, PIX, boleto com o vencimento, transferência, faturado com a condição ou reembolso a um colaborador). Nunca se digita o número inteiro do cartão.

O pedido sai numerado (PC-ano-número, por exemplo PC-2026-0001, revisão 00) em folha A4 retrato, salva em PDF e HTML na pasta "Compras - Pedidos de compra", separada por mês. Traz os dados da Metrolabs (endereço de entrega e de faturamento, em Regras de compras), o fornecedor, os itens com a especificação e a quantidade, o preço unitário, o frete, os impostos e o total, a previsão, a condição e a forma de pagamento, o número do orçamento do fornecedor, quem emitiu e quem aprovou. O vínculo aparece só pela referência interna, sem o nome do cliente. No rodapé, a marca de conferência do conteúdo.

"Enviar ao fornecedor" abre a janela Enviar documento com o e-mail para pedidos do fornecedor sugerido; o envio fica no histórico. Depois, "Já enviei: atualizar" marca o pedido como enviado (a rotina também confere sozinha). Enviado por outro meio (portal do fornecedor, em mãos): "Enviado por outro meio", com o relato.

A previsão de entrega muda só com o motivo ("Mudar previsão ou rastreio"); quem pediu vê a data nova em Meus pedidos. Para mudar o pedido em si, "Nova revisão do pedido" com o que mudou: sai a revisão 01, 02, e a anterior continua na pasta.

## Recebimento, divergência e entrega

Na chegada, "Registrar o recebimento": a quantidade recebida de cada item, se a especificação confere, se chegou sem dano (com dano, a foto é obrigatória) e o número da nota fiscal (ou o motivo de vir sem nota). Qualquer divergência (quantidade diferente, especificação que não confere, dano) segura a compra em "Recebida com divergência", com a descrição, até o comprador tocar em "Divergência resolvida" (ou cancelar com o motivo).

Sem divergência, a compra fica "Disponível": quem pediu é avisado no sistema e no resumo de e-mail, e o comprador recebe a atividade "Entregar" (1 dia útil). A entrega é registrada com quem recebeu e a evidência (protocolo, retirada assinada ou foto); quem pediu também pode tocar em "Recebi a peça" em Meus pedidos de compra. A entrega encerra o pedido.

## Pedido aprovado do Comercial

Quando o vendedor passa um pedido aprovado aos setores e há produto, além da atividade do setor Compras nasce o pedido de compra (REQ) com os produtos do pedido, ligado à proposta e sem o valor de venda. A atividade do setor Compras é a tarefa do comprador; quando todas as compras daquele pedido ficam disponíveis, ela é concluída sozinha e o vendedor é avisado.

## Fornecedores

Cadastro único: CNPJ (ou CPF de pessoa física) que não se repete, razão social, nome fantasia e endereço pela consulta de CNPJ, contato, telefone, WhatsApp, e-mail para pedidos, categorias, prazo médio, condição de pagamento e observações. Antes de criar, o sistema avisa se já existe fornecedor com nome parecido.

Arquivar não apaga: o fornecedor sai da escolha nas cotações e o histórico continua. "Mostrar arquivados" e "Reativar" trazem de volta.

Importar da planilha (opcional): copie a linha de títulos e as linhas dos fornecedores e cole no quadro. Primeiro aparece a prévia; depois "Aplicar a importação". CNPJ que já existe só ganha os campos que estavam vazios; o que já foi digitado nunca é trocado.

## Regras de compras

Só o Administrador e a Diretoria alteram; compradores e gestores consultam. Cada alteração vira uma versão nova, com o motivo, e a anterior fica no histórico.

Padrão aprovado pelo dono em 21/10/2026:

| Valor total da compra | Quem aprova | Cotações mínimas |
| --- | --- | --- |
| Até R$ 1.000 | O comprador (fica registrado) | 1 |
| De R$ 1.000,01 a R$ 10.000 | Gestor da área | 2 |
| Acima de R$ 10.000 | Diretoria | 3 |

Compras fica na área Logística (configurável). O comprador e o substituto são escolhidos na tela, sem nomes no código.

## Avisos

Seguem a matriz de avisos aprovada: no sistema até resolver; e-mail só no resumo da manhã (um por pessoa por dia, a partir das 8 h, no expediente); WhatsApp nunca pelo Compras. Nenhum aviso leva valor em reais. Quem fez a ação não é avisado.

- Especificação incompleta ou devolvida: quem pediu, no sistema até completar; a devolução também vai no resumo de e-mail.
- Pedido cancelado: quem pediu (e o vendedor, se for de pedido do Comercial), só no sistema.
- Pedido novo para cotar: o comprador, como atividade.
- Compra aguardando aprovação: o aprovador da faixa, pela Caixa de decisões (faixa do comprador: no Início dos compradores).
- Compra aprovada: o comprador, no sistema e no resumo de e-mail, com a atividade de fazer o pedido. Compra reprovada: o comprador, só no sistema, com o motivo.
- Aprovada sem pedido há 1 dia útil ou entrega atrasada: o comprador, no Início; depois de 2 dias úteis, a Caixa de decisões do gestor da área de Compras.
- Peça pedida e mudança de situação: só histórico (quem pediu vê em Meus pedidos).
- Recebida com divergência: o comprador, no sistema até resolver.
- Peça disponível: quem pediu e, no pedido do Comercial, o vendedor, no sistema e no resumo de e-mail.
