# Manual — Ganhos dos vendedores (etapa 1, 12/11/2026)

<div style="text-align: justify">

## 1. Para que serve

O módulo acompanha e fecha, mês a mês, a comissão de cada vendedor pelo contrato de ganhos dele. O vendedor vê os próprios ganhos e confere o mês; o Financeiro mantém os contratos, lança os recebimentos, fecha o mês e registra o pagamento; a Diretoria acompanha todos, aprova ou devolve o fechamento e reabre mês quando for preciso.

Menu: **Ganhos dos vendedores**. O botão aparece para o vendedor com contrato ou da equipe comercial, para o Financeiro e para a Diretoria.

## 2. Regras do cálculo (decisões do dono, 12/11/2026)

- **Base de cálculo: o valor recebido.** Só conta quando o cliente paga, pelo mês da data em que o dinheiro entrou na conta.
- **Faixa cheia.** A faixa atingida no mês vale sobre todo o recebido no mês. Exemplo com o contrato da Mônica: até R$ 30.000,00 = 2%; acima de R$ 30.000,00 até R$ 60.000,00 = 3%; acima de R$ 60.000,00 até R$ 80.000,00 = 4%; acima de R$ 80.000,00 = 5%. Quem recebe R$ 50.000,00 no mês ganha 3% sobre os R$ 50.000,00, ou seja, R$ 1.500,00.
- **"Até" inclui o próprio valor.** R$ 30.000,00 ainda é 2%; R$ 30.000,01 já é 3%.
- **Período mensal.** O mês em andamento aparece como parcial; a conferência abre no dia 1º do mês seguinte.
- **Arredondamento em centavos**, valores em formato brasileiro (R$ 1.234,56).
- **Contrato por vendedor**, com faixas e mês de início. Contrato novo vale do mês de início em diante e não altera mês já fechado.

## 3. De onde vem o recebido

O recebimento é lançado pelo Financeiro, ligado a uma proposta aprovada pelo cliente. O vendedor é o responsável pela proposta no Comercial (sem ele, o responsável pela oportunidade). Recebimento sem proposta, ou de proposta sem responsável, fica **"a classificar"** e não entra em comissão de ninguém até ser ligado à proposta certa. O sistema nunca atribui recebimento a um vendedor por suposição.

**Recebimentos do Omie (15/11/2026).** Na aba Recebimentos, o bloco "Recebimentos do Omie" mostra o que entrou na conta no mês, pela data do pagamento no Omie: cliente, nota ou boleto, valor recebido e retenções de impostos. Para cada recebimento aparecem as propostas aprovadas do mesmo cliente (ligadas pelo CNPJ do cadastro de clientes do SGO+), com saldo e vendedor. "Usar esta proposta" preenche o formulário de lançamento; o Financeiro confere e lança, com todas as regras acima. Sem proposta encontrada, "Preencher o formulário sem proposta" deixa o recebimento a classificar. Nada é lançado sozinho, e o mesmo recebimento do Omie não entra duas vezes (o lançamento guarda a referência do título do Omie; anulado, libera de novo). Pagamento parcial só aparece quando o recebido mais as retenções e o desconto ficam abaixo do valor do título.

## 4. Fluxo do fechamento

1. **O vendedor confere** o mês (recebimentos, faixa e comissão). Se algo está errado, **contesta** com o motivo.
2. **O Financeiro fecha** o mês. Os números ficam congelados: o sistema guarda a cópia do cálculo com a marca de conferência. Com contestação, o Financeiro corrige os recebimentos (o mês volta para o vendedor conferir) ou escreve a resposta à contestação.
3. **A Diretoria aprova**, ou **devolve ao Financeiro** com o motivo. O fechamento aparece na Caixa de decisões.
4. **O Financeiro registra o pagamento**: data, forma (PIX, transferência, junto com a folha ou outra), valor igual à comissão aprovada e o comprovante, se houver. Mês com comissão zero fica aprovado, sem pagamento.

Se os números mudarem antes do fechamento (recebimento lançado, anulado ou classificado, ou contrato mudado), o mês volta para o vendedor conferir de novo. Mês fechado ou aprovado só é reaberto pela Diretoria, com o motivo; o cálculo congelado fica no histórico. Mês pago não é reaberto nesta etapa.

Cada passo grava quem fez, quando e a observação. Nada é apagado: lançamento errado é anulado com motivo, contrato é cancelado com motivo.

## 5. Proteções fixas

- Ninguém cadastra ou cancela o próprio contrato.
- Ninguém lança recebimento da própria venda.
- Só o vendedor confere o próprio mês.
- Ninguém fecha, aprova, paga ou reabre o próprio mês.
- Quem fechou não aprova o mesmo fechamento; quem aprovou não registra o pagamento.

## 6. Permissões (Administração > Acessos)

| Caixa | Padrão |
|---|---|
| Ver os ganhos de todos os vendedores | Financeiro e Diretoria |
| Manter o contrato de ganhos dos vendedores | Financeiro e Diretoria |
| Lançar recebimentos para a comissão | Financeiro |
| Fechar o mês de ganhos do vendedor | Financeiro |
| Aprovar o fechamento de ganhos | Diretoria |
| Registrar o pagamento da comissão | Financeiro |
| Reabrir mês de ganhos fechado | Diretoria |

O responsável pelo sistema pode dar ou tirar cada caixa de uma pessoa, com motivo. Sem caixa, o vendedor vê só os próprios ganhos.

## 7. Passo a passo

### Cadastrar o contrato (Financeiro ou Diretoria)
1. Abra **Contratos** e use o quadro "Novo contrato de ganhos".
2. Escolha o vendedor e o mês em que o contrato começa a valer.
3. Preencha as faixas (até que valor e percentual). A última fica sem valor final.
4. Para a Mônica, toque em **"Usar o modelo da negociação da Mônica"**. Confira; nada é gravado antes de "Gravar o contrato".
5. Use o simulador para ver a faixa e a comissão de um valor.
6. Se o vendedor já tem contrato, escreva o motivo da mudança e toque em **"Gravar o contrato"**.

### Lançar um recebimento (Financeiro)
1. Abra **Recebimentos**, busque a proposta (número, cliente ou título) e toque nela.
2. Informe a data em que o dinheiro entrou, o valor e o documento (nota, boleto ou título).
3. Se o valor passar do total da proposta, escreva a justificativa. Toque em **"Lançar"**.
4. Sem proposta, marque "Recebimento sem proposta", informe o cliente e o motivo.

### Conferir (vendedor), fechar (Financeiro), aprovar (Diretoria), pagar (Financeiro)
Abra **Fechamento do mês**, escolha o vendedor e o mês. O quadro "O que você pode fazer agora" mostra cada ação e, quando ela não está disponível, o motivo. A faixa **"Para você agora"** no alto leva direto ao mês que espera por você.

### Painel e avaliação
O **Painel** mostra o recebido no mês, a faixa, a comissão, quanto falta para a próxima faixa, o recebido em 12 meses, o ticket médio (recebido por proposta com recebimento), as propostas ganhas e as que já tiveram recebimento, o prazo médio entre o ganho e o primeiro recebimento, os clientes que mais pagaram e o gráfico de 12 meses. **"Avaliação da IA"** gera um texto curto sobre o mês: a IA recebe só os números apurados e o texto é conferido; se citar número que não existe, vale a análise pelas regras do sistema. Sem a chave da IA, a análise pelas regras aparece direto.

### Comparativo (Financeiro e Diretoria)
Mostra, no mês, o recebido, a faixa, o percentual, a comissão, o que falta para a próxima faixa, o prazo médio e a situação de cada vendedor, com o total e o valor ainda "a classificar".

## 8. Problemas comuns

| Situação | O que fazer |
|---|---|
| "Não há contrato de ganhos valendo neste mês" | Cadastrar o contrato do vendedor com início no mês certo. |
| O mês voltou para "Aberto" depois da conferência | Os números mudaram; conferir de novo. |
| Lançamento recusado: mês congelado | Pedir à Diretoria a reabertura do mês, com o motivo. |
| Recebimento ficou "a classificar" | Classificar pela proposta certa; se ela não tem responsável, pedir ao Comercial para registrar. |
| Pagamento recusado pelo valor | O valor precisa ser igual à comissão aprovada; não há pagamento parcial nesta etapa. |

## 9. Dados guardados

Abas criadas no primeiro uso: GAN_CONTRATOS, GAN_RECEBIMENTOS, GAN_FECHAMENTOS (com a cópia congelada do cálculo), GAN_HISTORICO e GAN_AVALIACOES. Comprovantes de pagamento na pasta "Ganhos dos vendedores - Comprovantes".

</div>
