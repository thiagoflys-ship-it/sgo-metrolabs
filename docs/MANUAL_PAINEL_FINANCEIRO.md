# Manual — Painel financeiro (16/11/2026)

<div style="text-align: justify">

## 1. Para que serve

O Painel financeiro é onde o Financeiro trabalha sem abrir o Omie. Pela tela do SGO+, ele vê a posição do caixa, o que vence, quem está devendo, os títulos a pagar e a receber, os pedidos aprovados, os boletos, o faturamento, as notas, o fluxo de caixa e as provisões. O Omie continua sendo o lugar da nota fiscal e da contabilidade: o SGO+ lê e grava no Omie pela conexão do sistema.

Menu: **Financeiro > Painel financeiro**. No celular, o atalho **Financeiro**. O Financeiro é **sigiloso**: o botão só aparece para as contas da lista de sigilo (hoje: Thiago e Charles, da Diretoria, e Wanessa, do Financeiro). Veja a seção 8.

## 2. Gravação no Omie: ligada (16/11/2026, decisão do dono)

Desde 16/11/2026 o Financeiro faz tudo pelo SGO+: lançar, alterar e baixar títulos, gerar e prorrogar boletos, faturar pedidos e O.S. e importar NF-e de saída **gravam no Omie**. Toda operação segue o mesmo caminho, que protege contra erro de digitação e contra envio repetido:

1. **Preencha** os campos (cada um explica embaixo o que é e para que serve).
2. **Conferir prévia:** o SGO+ confere os dados com o Omie e mostra exatamente o que será enviado. Os campos ficam travados.
3. **Confirmar no Omie:** só então a operação é enviada. Se algo estiver errado, toque em **Revisar campos** antes de confirmar.
4. **Atualizar:** confira o título na lista depois de confirmar.

Regras que valem sempre:

- O SGO+ **nunca repete** um envio sozinho. Se aparecer "O envio não foi confirmado", consulte o título no Omie antes de tentar de novo.
- A **baixa** registra no Omie que o dinheiro entrou ou saiu; ela **não** faz transferência nem pagamento no banco.
- **Gerar e prorrogar boleto** podem ter tarifa do banco. **Faturar** emite nota fiscal: acompanhe a autorização no Omie.
- Se a faixa amarela **"Consultas ligadas; gravação no Omie desligada"** voltar a aparecer, a gravação foi desligada pelo responsável pelo sistema: a prévia continua aparecendo, mas nada é enviado.

## 3. As abas

| Aba | O que mostra ou faz |
|---|---|
| Visão geral | Posição de hoje (saldo das contas e os próximos 10 dias), resumo do período, agenda de vencimentos e vencidos a receber por cliente. |
| Contas a pagar e receber | Títulos por situação: Vencidos, Vencem hoje, A vencer ou Todos (mais recentes primeiro). |
| Ficha do cliente | Para a cobrança: busca no cadastro do SGO+ e mostra, lido do Omie, o vencido e o em aberto (saldo ainda devido), os recebimentos dos últimos 12 meses e o atraso médio ao pagar. Só consulta. |
| Pedidos aprovados | Propostas aprovadas pelo cliente, com o preparo da conta a receber no Omie. |
| Lançamentos e baixas | Novo lançamento, edição e registro de pagamento ou recebimento (baixa), sempre com prévia. |
| Cobranças | Ver, gerar e prorrogar o boleto de um título a receber. |
| Conciliação bancária | Extrato do banco (OFX ou CSV) comparado com o Omie; a conferência fica registrada no SGO+. |
| Faturamento de produtos e de serviços | Pedidos e O.S. cadastrados no Omie, por etapa; faturar emite a nota fiscal pelo Omie. |
| Importação de notas | Primeiro quadro: lançar no Omie, como conta a pagar, a NF-e de compra ou a NFS-e recebida. Segundo quadro: importar no Omie a NF-e de saída emitida fora dele, ou guardar a nota só como documento no SGO+. |
| Fluxo de caixa | Saldos e movimentos de uma conta no período, e o orçamento do mês por categoria. |
| Resultado do mês | Recebido, pago e resultado do mês pelo dia do pagamento, por categoria do plano de contas do Omie; transferências entre contas à parte. |
| Provisões | Previsões do Omie e provisões internas do SGO+ (estas não criam título no Omie). |
| Comissões | Leva a Ganhos dos vendedores. |
| Regras do Financeiro | Configurações em vigor, aprovações pendentes (só o dono do sistema e a Diretoria decidem) e o de-para de categorias. |
| Indicadores | Nota de saúde financeira e os indicadores I01 a I19 com gráficos, lidos da fotografia diária (seção 8d). |
| Sigilo e acessos | Quem pode ver o Financeiro; para a Diretoria, o registro de consultas, planilhas baixadas e recusas. Só o responsável pelo sistema altera a lista. |

## 4. Visão geral

**Posição de hoje.** Vem do resumo do próprio Omie. Mostra o saldo somado das contas e, para os próximos 10 dias, o que entra, o que sai e o saldo previsto ao fim de cada dia, como o Omie calcula.

**Resumo do período.** O que está em aberto a pagar e a receber com vencimento entre as datas escolhidas e quanto disso já venceu. Títulos cancelados ficam fora.

**Agenda de vencimentos.** O que vence nos próximos 7, 15 ou 30 dias, dia a dia, com o nome do cliente ou fornecedor, o documento ou a parcela e o valor que ainda está em aberto. Dá para ver só a pagar ou só a receber. A agenda de 30 dias pode levar cerca de 15 segundos.

**Vencidos a receber por cliente** (botão). Quem está devendo, quantos títulos, o total ainda em aberto (descontado o que já foi pago em parte), desde quando e há quantos dias. É o ponto de partida da cobrança.

## 5. Pedidos aprovados: conta a receber sem redigitar

1. Abra **Pedidos aprovados**. Busque pelo número, cliente, título ou OC.
2. Toque em **Preparar conta a receber**. O SGO+ acha o cliente no Omie pelo CNPJ e abre o novo lançamento já preenchido com o cliente, o documento (número da proposta), o valor, a referência única (SGO-número da proposta) e a observação com a OC e a condição de pagamento.
3. Acima do formulário aparecem os últimos títulos que o cliente já tem no Omie. Confira para não lançar em dobro.
4. Ajuste valor e vencimento pela condição de pagamento. Para parcelas, faça um lançamento por parcela, com a referência terminada em -1, -2 e assim por diante. Escolha a categoria e a conta corrente.
5. Toque em **Conferir prévia**. Os nomes da prévia vêm do Omie, não do que foi digitado. Se estiver certo, **Confirmar no Omie**; se não, **Revisar campos**.

Se o cliente estiver sem CNPJ no SGO+, sem cadastro no Omie ou com dois cadastros no Omie, a tela diz o que corrigir.

## 5a. Ficha do cliente (cobrança)

1. Abra **Ficha do cliente** e busque pelo nome ou CNPJ (no cadastro do SGO+; não consulta o Omie). Toque no cliente.
2. Os cartões mostram: **Vencido** (saldo ainda devido dos títulos vencidos, desde quando e há quantos dias), **Em aberto** (vencido + a vencer), **Recebido em 12 meses** e **Atraso médio ao pagar**.
3. Abaixo, cada título em aberto (vencimento, documento, parcela, valor em aberto, dias de atraso; "pago em parte" quando houve pagamento parcial) e os recebimentos dos últimos 12 meses com o atraso de cada um.
4. Cliente **inativo no Omie**: os títulos continuam valendo e aparecem, com aviso. Nesse caso o Omie não informa o saldo em aberto pela consulta de movimentos, e a ficha mostra o valor do documento; confira pagamentos parciais no Omie.
5. Conferido no Omie real em 16/11/2026: para 5 clientes ativos com vencidos, a ficha bate exatamente (quantidade e total) com a lista de vencidos por cliente.

## 6. Recebimentos do Omie em Ganhos dos vendedores

Em **Ganhos dos vendedores > Recebimentos > Recebimentos do Omie**, o Financeiro vê o que entrou na conta no mês, com as propostas aprovadas do mesmo cliente. **Usar esta proposta** preenche o formulário de lançamento do recebimento; o Financeiro confere e lança. Nada é lançado sozinho, e o mesmo recebimento do Omie não entra duas vezes. Detalhes no manual de Ganhos dos vendedores.

## 7. Limites do Omie

O Omie impõe limites às consultas. O SGO+ trata esses limites assim:

- **A mesma consulta feita de novo em menos de um minuto** vem guardada no SGO+, sem chamar o Omie.
- **Duas consultas seguidas do mesmo tipo:** o SGO+ espera alguns segundos entre elas, porque o Omie recusa chamadas encostadas. Por isso uma consulta às vezes demora um pouco mais.
- **"O Omie estava ocupado" ou "só responde à mesma consulta uma vez por minuto":** nada foi feito. Aguarde um minuto e repita.
- **"O Omie limitou as chamadas desta conexão":** o Omie bloqueia por alguns minutos depois de muitas recusas. Aguarde; se repetir, avise o responsável pelo sistema.
- **O SGO+ nunca repete uma gravação sozinho.** Se o envio não for confirmado, consulte o título no Omie antes de tentar de novo.

## 8. Quem pode o quê

As caixas de acesso ficam em Administração > Acessos, no módulo Financeiro:

| Caixa | Permite |
|---|---|
| Consultar o Financeiro no SGO+ (Omie) | Abrir o painel e todas as consultas. |
| Lançar, alterar e baixar títulos no Omie | Lançamentos, baixas e preparo de conta a receber a partir do pedido. |
| Gerar e prorrogar boletos pelo Omie | Cobranças. |
| Faturar pedidos e O.S. e importar notas no Omie | Faturamento e notas. |
| Conferir o extrato do banco com o Omie | Conciliação bancária. |
| Registrar e cancelar provisões do Financeiro | Provisões internas. |

**Sigilo (16/11/2026, decisão do dono).** Acima das caixas existe a lista de sigilo do Financeiro. Quem não está nela não abre o painel, não vê o botão, não recebe as sugestões de recebimentos do Omie em Ganhos dos vendedores e não consegue nada pelo endereço do sistema, qualquer que seja o perfil. Em Administração > Acessos, as caixas do Financeiro dessa pessoa aparecem como "Sigiloso: fora da lista do módulo" e não podem ser marcadas; modelo e "copiar de outra pessoa" pulam essas caixas.

- **Quem está na lista:** Thiago (responsável pelo sistema), Charles (Diretoria) e Wanessa (Financeiro).
- **Quem altera:** só o responsável pelo sistema, na aba **Sigilo e acessos**, com motivo. Ele não pode se retirar; contas de clientes e representadas nunca entram; no máximo 10 contas.
- **Registro:** toda consulta (uma vez a cada 10 minutos por pessoa e rotina), toda planilha baixada, toda recusa e toda mudança da lista ficam em FIN_OMIE_ACESSOS, sem valores. A Diretoria vê o registro na aba Sigilo e acessos.
- **Na tela:** ao sair do sistema, ou depois de 10 minutos sem mexer no painel, os dados somem da página (e da memória da planilha). "Mostrar de novo" faz nova consulta.
- **O que o sistema não impede:** foto da tela, impressão e repasse de planilha baixada. Por isso o download fica registrado.
- **Vale para todo o Financeiro, não só para o painel (pente fino de 16/11/2026):** a Conferência do Financeiro em Compras (conferir compras, faturas de cartão, A pagar, cadastro e limite dos cartões, relatório da conciliação), a Conciliação Caju e a carga e a conferência do Depósito de viagem seguem a mesma lista. Os demais só **enviam** informação ao Financeiro (o comprador registra o pagamento e o comprovante; quem viaja presta contas) e recebem de volta só o que precisam corrigir. Compradores veem o cartão pelo final e pelo responsável, sem o limite. O relatório diário da empresa mostra só a contagem de pendências do Financeiro, sem títulos nem valores.

Dentro da lista, o padrão das caixas é: todas para Financeiro, Diretoria e Administrador. Exceções por pessoa são gravadas pelo responsável pelo sistema.

## 8a. Mudanças de 16/11/2026 (especificação do Financeiro)

**Baixa sem acréscimo, por enquanto.** Ainda não foi confirmado como o Omie soma juros e multa (e tira o desconto) no saldo do banco quando a baixa vem pela API. Até a primeira baixa acompanhada confirmar, os campos de juros, multa e desconto ficam em zero e o servidor recusa outro valor. Baixa com acréscimo ou desconto se faz direto no Omie. A prévia mostra a linha "Efeito na conta corrente" com o valor que entra ou sai.

**Baixa confere o saldo em aberto.** A prévia lê no Omie o saldo em aberto do título e mostra "Saldo antes · Esta baixa · Saldo depois", dizendo se a baixa é parcial ou quita o título. Baixa maior que o saldo, de título pago, recebido, liquidado ou cancelado, ou sem o saldo lido no Omie, é recusada. Na lista, esses títulos não têm os botões "Editar" e "Registrar baixa".

**Editar envia só o que mudou.** Título com rateio de categorias ou de departamentos, ou já pago ou cancelado, não é alterado pelo SGO+ (altere no Omie). Nos demais, só os campos que você mudou vão ao Omie; o resto do título fica como está.

**Categoria do tipo certo.** Conta a pagar só mostra categorias de despesa; conta a receber, só de receita. Categorias inativas, grupos (totalizadoras) e de transferência não aparecem, e o servidor confere de novo na prévia.

**Recusa do Omie e envio incerto.** Quando o Omie responde com um motivo (categoria não cadastrada, campo obrigatório), nada foi feito: a tela mostra o motivo e libera corrigir e enviar de novo. Quando o Omie não responde, o envio fica "incerto" e travado. Ele aparece em **Lançamentos e baixas > Envios a conferir no Omie**: confira no Omie, escreva o que encontrou e toque em "Conferi: não foi feito" (libera enviar de novo) ou "Conferi: foi feito" (encerra sem repetir). Vale também para faturamento e importação de NF-e. Fica no registro de acessos.

**Buscar e cadastrar cliente ou fornecedor.** No lançamento, busque pelo CNPJ (ou CPF) ou por parte do nome; a lista mostra razão social, CNPJ, cidade/UF e se o cadastro está inativo. Se não estiver no Omie, "Cadastrar no Omie" abre o cadastro com prévia: o SGO+ procura o documento no Omie antes; se já existe, só acrescenta a tag que falta (Cliente ou Fornecedor); se está inativo ou duplicado, diz o que fazer no Omie. Os campos vazios vêm do cadastro do SGO+ (Clientes, Fornecedores de Compras), da nota fiscal ou da consulta pública do CNPJ, e a prévia mostra de onde veio cada um. O código do Omie fica guardado no cadastro do SGO+.

**Lançar nota recebida no Omie.** Em **Importação de notas**, o primeiro quadro, "Lançar nota recebida no Omie (conta a pagar)", recebe o XML de NF-e de compra ou de NFS-e. O SGO+ confere que a nota é para a empresa (CNPJ da empresa em Chaves e senhas > Omie), que não foi lançada antes (no SGO+, no Recebimento de NF-e do Omie e nas contas a pagar do fornecedor) e mostra o fornecedor no Omie. NF-e: uma conta a pagar por parcela da nota, com a chave da NF-e; sem parcela, um título com o vencimento informado; nota sem pagamento (remessa, bonificação) fica "Registrada sem título". NFS-e: o valor a pagar é o líquido (serviço menos as retenções), as retenções vão na observação do título, e o que o XML não trouxe é digitado com motivo e fica marcado. Se uma parcela falhar, as anteriores ficam lançadas e a próxima prévia envia só o que falta. A nota não entra no módulo fiscal do Omie (só o financeiro). A autenticidade e o cancelamento da nota não são consultados na SEFAZ ou na prefeitura.

**Marca d'água, planilhas e impressão.** Sobre os dados do Painel aparece, bem clara, a marca com o nome, o login, a data e a hora de quem está vendo, e o rótulo SIGILOSO. Ela não atrapalha os toques e sai em qualquer foto de tela. Na impressão saem a marca e o rodapé "Impresso por". Toda planilha só é baixada depois de registrada: a primeira linha diz quem gerou, quando e o código do download, e a última repete o código. O registro de acessos guarda o código, a quantidade de linhas e um resumo do conteúdo (nunca os valores).

## 8b. Ajustes de tela de 16/11/2026 (apresentação)

Nenhuma regra mudou: os campos enviados ao Omie, a prévia e a confirmação são os mesmos. Mudou o jeito de mostrar.

**Rotinas no celular.** No computador as 15 rotinas continuam em botões no alto. No celular elas viram uma lista de escolha, **Rotina do Financeiro**, logo abaixo do título, para a tela começar no que interessa e não em oito linhas de botões.

**Ordem dos campos do lançamento.** O formulário segue a ordem do trabalho: cliente ou fornecedor, documento, valor e vencimento; depois categoria e conta corrente; por fim a referência única e as datas opcionais (previsão e emissão). Quando a lista de categorias ou de contas já veio inteira, o botão "Carregar mais" some.

**Baixa.** Desconto, juros e multa ficam juntos num quadro só, travados em zero, com uma única explicação (antes eram três explicações iguais e mais o aviso).

**Prévia de confirmação.** A prévia aparece numa caixa com a borda verde. Cada informação fica numa linha, com o nome à esquerda (em cima, no celular). Valores em reais e datas aparecem em negrito, e as linhas de valor, saldo, data e vencimento têm fundo verde claro, para conferir de relance o que vai ao Omie. Abaixo, a validade da prévia e o lembrete "Nada foi enviado ainda". O botão principal é sempre **Confirmar no Omie** (ou o equivalente), em verde. Isso vale para lançamento, baixa, boleto, cadastro no Omie, nota recebida e faturamento.

**Nota recebida.** Em Importação de notas, o quadro de lançar a nota recebida como conta a pagar, que é o uso do dia a dia, vem primeiro; a importação de NF-e de saída e o histórico documental vêm depois. Na prévia da nota, a tabela das contas a pagar destaca o vencimento e o valor de cada parcela e termina com o total que será lançado.

**Cadastro no Omie.** Os campos ficam em três grupos (Quem é, Endereço, Contato). No celular, número e complemento, e UF e CEP, ficam lado a lado. Na prévia do cadastro, no celular, cada campo mostra o valor em negrito e a origem logo abaixo, sem repetir rótulos.

**Conciliação bancária e faturamento.** Os campos ficam em grade, com o rótulo em cima, e **Gerar prévia**, **Conferir XML**, **Registrar conferências selecionadas** e **Confirmar faturamento** são os botões principais. A caixa de marcar de cada movimento e a de autorização do faturamento têm área de toque maior.

**Situação dos títulos.** Nas listas, a situação aparece por extenso (Em aberto, Vencido, A vencer, Pago, Cancelado), em vez do código do Omie.

**Mensagens.** Os avisos de andamento e de erro dos formulários aparecem numa faixa azul, lidos em voz alta pelo leitor de tela. O foco do teclado fica marcado com um contorno verde.

**Marca d'água.** O texto da marca não sai mais cortado quando o nome é longo.

## 8c. Regras do Financeiro configuráveis (16/11/2026, decisão do dono)

O dono pediu que as decisões do Financeiro fiquem organizadas para serem configuradas. Cada uma tem um padrão seguro, que é o comportamento de antes. As quatro primeiras ficam em **Administração > Chaves e senhas > Regras do Financeiro** (alteradas pelo responsável pelo sistema) e aparecem, só para leitura, na aba **Regras do Financeiro** do Painel.

| Configuração | Opções | Padrão |
|---|---|---|
| NF-e de compra: onde entra no Omie | Só financeiro (conta a pagar) · Financeiro e fiscal (combinar com o contador) | Só financeiro. Com "Financeiro e fiscal", a tela da nota avisa que o caminho fiscal ainda não existe no SGO+ e o lançamento continua só no financeiro. |
| NFS-e: como lançar as retenções | Valor líquido, retenções na observação · Retenções nos campos do Omie | Valor líquido. Na outra opção, a conta vai pelo valor do serviço e cada retenção no campo de impostos retidos do Omie (a confirmar na primeira operação acompanhada que o Omie baixa pelo líquido). |
| Alçada: digitar o valor de novo acima de (R$) | valor em reais ou vazio | Vazio = desligada. Acima do valor, a confirmação pede o valor digitado de novo. |
| Aprovação só do dono e da Diretoria | Sim · Não | Sim (decisão do dono, 16/11/2026). Vale para todas as aprovações financeiras: alçada do Omie, Compras (todas as faixas), Depósito de viagem (uma etapa só) e Recarga Caju. Com "Não", voltam as regras de antes de cada módulo (no Omie, qualquer outra pessoa da lista de sigilo aprova). |
| Alçada: aprovação de outra pessoa acima de (R$) | valor em reais ou vazio | Vazio = desligada. Acima do valor, a prévia espera a aprovação do dono do sistema ou da Diretoria (nunca de quem preparou; o Financeiro não aprova). |

As alçadas valem para a baixa (a pagar e a receber), o lançamento e a alteração de conta a pagar e o lançamento de nota recebida. **Quem aprova (decisão do dono, 16/11/2026):** só o dono do sistema e a Diretoria, dentro da lista de sigilo. O Financeiro e os demais colaboradores preparam e acompanham, mas não aprovam nem recusam; quem preparou nunca decide a própria operação (se o dono preparou, a Diretoria aprova, e vice-versa). A prévia que precisa de aprovação espera até 24 horas; quem aprova vê a prévia em **Regras do Financeiro > Aprovações pendentes** (o Painel mostra no topo quantas esperam por você). Depois de aprovada, vale 10 minutos, como sempre. Recusa exige motivo, e quem preparou o vê ao tentar confirmar. Tudo fica no registro de acessos.

**De-para de categorias.** Na aba Regras do Financeiro, quem lança no Omie (caixa "Lançar, alterar e baixar títulos no Omie") monta a lista: tipo de lançamento (NF-e de compra, NFS-e recebida, conta a receber de proposta aprovada), CNPJ opcional e a categoria do Omie, escolhida na lista que vem do Omie. Cada gravação pede o motivo e fica no histórico. A categoria sugerida aparece já escolhida no lançamento (a regra do CNPJ vale antes da regra geral); quem lança confere e pode trocar, e a prévia confere a categoria de novo. Lista vazia: a categoria é escolhida em cada lançamento, como antes. A escolha de quem altera (quem lança, e não só o dono) é porque é quem conhece o plano de contas no dia a dia; a Diretoria vê o histórico com o motivo.

**Programa de Conduta.** Em Chaves e senhas > Conduta, "Ocorrência: o envolvido vê quem registrou" (padrão: Não).

## 8d. Indicadores e saúde financeira (Onda 2, 16/11/2026)

A aba **Indicadores** mostra os números do Financeiro calculados pelo sistema, sem consultar o Omie a cada toque. Uma **rotina** lê o Omie uma vez por dia (só leitura, nada é gravado no Omie) a partir das 06:00, antes do expediente, e guarda uma **fotografia** só com números agregados: nenhum nome de cliente, CNPJ ou número de documento vai para a tabela (os maiores clientes ficam pelo código do Omie; os nomes ficam só na memória do servidor por 6 horas). A fotografia sai em uma a três rodadas automáticas (de 15 em 15 minutos), com no máximo 20 páginas do Omie por rodada (8 no expediente); no expediente, se a tela do Financeiro acabou de consultar o Omie, a rotina espera a rodada seguinte, para não disputar o limite do Omie com quem está trabalhando. Depois de feita, a fotografia não é repetida no mesmo dia.

**Atualizar agora** só pede uma nova fotografia: a próxima rodada automática a faz (até 15 minutos). O botão fica parado, com o motivo escrito, enquanto uma fotografia está em andamento, quando já há um pedido e por 15 minutos depois da última. Indicador cuja fonte falhou aparece como **"não calculado"** com o motivo, nunca como zero; a faixa do topo diz quando a fotografia ficou incompleta.

### Os indicadores

Cada cartão mostra o valor de hoje, o da fotografia de 7 dias atrás (ou 30, em "Comparar com"), a seta (verde: melhorou; vermelha: piorou) e as duas linhas abaixo.

| Código | Indicador | Como é calculado | O que é e como ler |
|---|---|---|---|
| I01 | Saldo em contas | Soma dos saldos das contas correntes no resumo do Omie. O limite de crédito fica à parte e nunca é somado. | Quanto a empresa tem hoje nos bancos e no caixa. Compare com o que vence a pagar nos próximos dias. |
| I01M | Folga sobre o saldo mínimo | Saldo em contas menos o saldo mínimo de segurança definido em Chaves e senhas > Regras do Financeiro. | Positivo: o caixa está acima do mínimo combinado. Negativo: está abaixo; priorize recebimentos e adie o que puder. Sem o mínimo definido, mostra "a definir". |
| I02 | A receber em aberto | Soma do saldo em aberto (não o valor do documento) dos títulos a receber não cancelados, com vencimento de 12 meses atrás até 90 dias à frente. | Tudo o que os clientes ainda devem, vencido ou não. Pagamentos parciais já estão descontados. |
| I03 | A receber vencido | Parte do "a receber em aberto" com vencimento antes de hoje. | Dinheiro que já devia ter entrado. Quanto menor, melhor; o detalhe por cliente está em "Maiores devedores". |
| I04 | Inadimplência | A receber vencido dividido pelo a receber em aberto, vezes 100. | Que parte do que os clientes devem já venceu. Atraso curto é rotina; veja também a parte acima de 30 dias. |
| I05 | Inadimplência acima de 30 dias | Vencidos há mais de 30 dias divididos pelo a receber em aberto, vezes 100. | O risco de verdade: atraso longo costuma virar perda. É o critério C3 da nota de saúde. |
| I06 | A pagar em aberto | Soma do saldo em aberto dos títulos a pagar não cancelados (mesma janela do a receber); o detalhe mostra a parte vencida. | O que a empresa deve aos fornecedores. A parte vencida deve ser zero: se não for, gera juros e entra na nota de saúde. |
| I07 | Resultado de caixa do mês | Recebido menos pago no mês, pela data em que o dinheiro entrou ou saiu. Transferências entre contas da empresa ficam fora. | Se o mês está fechando no positivo até hoje. O mês ainda não acabou: compare com o mesmo ponto do mês anterior. |
| I08 | Margem de caixa do mês | Recebido menos pago, dividido pelo recebido, vezes 100 (mês atual até hoje). A nota de saúde usa os 3 últimos meses fechados. | De cada R$ 100 que entraram, quanto sobrou depois dos pagamentos. Negativo: saiu mais do que entrou. |
| I09 | Prazo médio de recebimento | Média, ponderada pelo valor, dos dias entre a emissão e o pagamento dos títulos recebidos nos últimos 90 dias. | Quantos dias, em média, o dinheiro leva para entrar depois da venda. Se for maior que o prazo de pagamento, o caixa financia os clientes. |
| I10 | Atraso médio de recebimento | Média, ponderada pelo valor, dos dias de atraso (pagamento menos vencimento; pago em dia conta zero) dos títulos recebidos nos últimos 90 dias. | Quantos dias depois do vencimento os clientes pagam, em média. Mesma conta da Ficha do cliente, agora pesando o valor. |
| I11 | Prazo médio de pagamento | Média, ponderada pelo valor, dos dias entre a emissão e o pagamento das contas pagas nos últimos 90 dias. | Quantos dias a empresa leva para pagar depois da compra. Compare com o prazo de recebimento. |
| I12 | Cobertura de caixa | Saldo em contas dividido pela média diária de pagamentos dos últimos 90 dias (sem transferências). | Quantos dias a empresa paga as contas só com o saldo de hoje, sem receber nada. É o critério C1 da nota de saúde. |
| I13 | Cobertura dos compromissos de 30 dias | (Saldo em contas + a receber que vence nos próximos 30 dias × taxa de realização) dividido pelo a pagar até 30 dias (incluindo o vencido). Taxa de realização: quanto do que venceu nos últimos 90 dias foi recebido até o vencimento. | Acima de 1, o caixa fecha os próximos 30 dias; abaixo de 1, vai faltar dinheiro se nada mudar. É o critério C2 da nota de saúde. |
| I14 | Concentração de recebíveis | Soma dos 5 maiores clientes no a receber em aberto, dividida pelo total a receber, vezes 100. | Dependência de poucos clientes: quanto maior, maior o risco se um deles atrasar. É o critério C5 da nota de saúde. |
| I15 | Orçado × realizado do mês | Realizado dividido pelo previsto, vezes 100, somando as categorias do orçamento do mês no Omie. | Só aparece com orçamento cadastrado no Omie. Perto de 100 %: o mês está seguindo o planejado. |
| I16 | Execução da cobrança | Vencidos com ação de cobrança registrada nos últimos 7 dias, divididos pelos vencidos, vezes 100. | Mede o trabalho de cobrança, não o cliente. Passa a ser calculado com a régua de cobrança. |
| I17 | Conciliação bancária em dia | Dias desde a última data de extrato conferida na aba Conciliação bancária, na conta mais atrasada. | Até 7 dias é o combinado. Mais do que isso, o saldo do Omie pode não bater com o banco. |
| I18 | Envios incertos ao Omie | Quantidade de envios ao Omie sem resposta clara, aguardando conferência em Lançamentos e baixas > Envios a conferir. | Deve ser zero. Cada um precisa ser conferido no Omie para não lançar em dobro. |
| I19 | Caju: prestações vencidas e divergências | Prestações de contas de viagem com prazo vencido mais as divergências abertas da Conciliação Caju. | Pendências do cartão Caju que dependem de alguém agir. Deve ser zero. |

### Nota de saúde financeira (0 a 100)

Soma de seis critérios. Cada um vale de 0 (no limite "ruim" ou pior) até a pontuação cheia (no limite "bom" ou melhor), proporcionalmente entre os dois. Critério sem dado fica fora e os pesos dos demais são reescalados; a tela diz qual faltou e por quê. Faixas: **80 a 100 Saudável**, **60 a 79 Atenção**, **40 a 59 Alerta**, **abaixo de 40 Crítica**. A frase de cada critério é escrita pelo sistema.

| Critério | Indicador | Ruim (0) | Bom (cheio) | Peso |
|---|---|---|---|---|
| C1 Fôlego do caixa | I12 | 10 dias | 60 dias | 25 |
| C2 Compromissos de 30 dias | I13 | 0,8 vezes | 1,3 vezes | 20 |
| C3 Inadimplência acima de 30 dias | I05 | 15 % | 3 % | 20 |
| C4 Margem de caixa (3 meses fechados) | I08 | 0 % | 15 % | 20 |
| C5 Concentração de recebíveis | I14 | 70 % | 35 % | 5 |
| C6 Disciplina operacional | I17, I18, I19, I06 | quatro conferências: conciliação bancária com até 7 dias; nenhum envio incerto; nenhuma prestação Caju vencida há mais de 10 dias úteis; nenhum título a pagar vencido | cada conferência em dia vale a mesma parte | 10 |

Os limites e os pesos são **propostas iniciais** (decisão do dono com o contador). Ficam em **Administração > Chaves e senhas > Regras do Financeiro**:

| Configuração | Formato | Sem valor |
|---|---|---|
| Saldo mínimo de segurança do caixa (R$) | valor em reais, zero ou mais | "a definir": o cartão "Folga sobre o saldo mínimo" mostra "a definir" |
| Nota de saúde: pesos dos seis critérios | seis inteiros de C1 a C6 somando 100 (ex.: 25;20;20;20;5;10) | 25;20;20;20;5;10 |
| Nota de saúde: limites "ruim" e "bom" | "Cn: ruim a bom" separados por ponto e vírgula (ex.: C1: 10 a 60; C3: 15 a 3), de C1 a C5 | os da tabela acima |
| Fotografia diária: a partir de que hora | hh:mm | 06:00 |
| Fotografia diária do Financeiro | Ligada ou Desligada | Ligada |

Valor estranho gravado por outro caminho vale o padrão. A aba Regras do Financeiro mostra o que está em vigor.

### Gráficos

G1 recebido × pago em 12 meses, com a linha do resultado; G2 saldo previsto de 90 dias (entra com a Agenda financeira, próxima etapa); G3 envelhecimento do a receber (a vencer, 1 a 30, 31 a 90, acima de 90 dias); G4 inadimplência semana a semana (fotografia do fim de cada semana); G5 despesas por categoria no mês, com as que somam 80 % em destaque; G6 os 10 maiores devedores; G7 orçado × realizado (com orçamento no Omie); G8 viagens no Caju (carregado, gasto conciliado e gasto sem comprovante ligado, 6 meses). Cada gráfico tem uma frase dizendo o que mostra; no celular ocupam a largura da tela.

### Atividades do Financeiro e o assistente geral

Atividade de um módulo do Financeiro (Financeiro, Omie, Caju, Conciliação Caju, Compras do Financeiro) é sempre restrita e só é vista pelo responsável, por quem lançou e por quem está na lista de sigilo. O RH e a gestão fora da lista não a veem (nem na lista, nem no detalhe, nem na central de pendências, na Caixa de decisões ou na cobrança da SEDNA). O responsável precisa estar na lista: "A atividade do Financeiro só pode ser de alguém da lista de sigilo. Para pedir algo a outra pessoa, crie a atividade sem valores e sem nome de cliente, fora do Financeiro." As atividades restritas do Programa de conduta continuam como antes (RH e gestão de decisões veem). O assistente geral "Tire sua dúvida" não tem mais a ajuda nem os manuais do Financeiro (Painel financeiro, Conciliação Caju, conferência de Compras): essas dúvidas ficam no "Como usar esta tela" do próprio Painel e, depois, no especialista financeiro.

## 9. Problemas comuns

| Situação | O que fazer |
|---|---|
| Faixa vermelha "Conexão com o Omie não configurada" | Avise o responsável pelo sistema. |
| "Nada foi enviado ao Omie: a gravação pelo SGO+ ainda está desligada" | A gravação foi desligada pelo responsável pelo sistema. Fale com ele; se for urgente, faça a operação no Omie. |
| "o Omie exige 1 minuto entre duas consultas do mesmo título" ao confirmar | Nada foi enviado. Aguarde os segundos indicados e toque em Confirmar de novo; a prévia continua valendo. |
| "O título mudou no Omie desde a prévia" | Alguém alterou o título no Omie. Atualize e gere nova prévia. |
| "Você não tem a permissão…" | A mensagem diz a caixa que falta; peça a liberação, se for da sua função. |
| A Visão geral recusa o período por ter mais de 2.500 títulos | Diminua o período. |
| "O Omie recusou a operação: … Nada foi feito no Omie" | Corrija o que o Omie apontou em "Revisar campos" e confira uma nova prévia. |
| "O envio não foi confirmado" | Pode ter sido feito. Confira no Omie e registre em "Envios a conferir no Omie". |
| "Baixa com juros, multa ou desconto ainda não é feita pelo SGO+" | Registre só o valor sem acréscimo ou faça esta baixa no Omie. |
| "Falta o CNPJ da empresa em Administração > Chaves e senhas > Omie" | Peça ao responsável pelo sistema para preencher o CNPJ da empresa. |
| "Não foi possível ler no Omie o saldo em aberto deste título" | Nada foi feito. Tente em 1 minuto ou registre a baixa no Omie. |
| "está aguardando a aprovação do dono do sistema ou da Diretoria" | O valor passa da alçada. Peça ao dono ou à Diretoria a aprovação em Regras do Financeiro > Aprovações pendentes e toque em Confirmar de novo (a prévia espera até 24 horas). |
| "O valor digitado não confere com o da prévia" | Digite de novo exatamente o valor da prévia no campo "Digite o valor de novo". |
| "Quem preparou a operação não aprova a própria operação" | Peça ao dono do sistema ou à Diretoria (a outra pessoa, não você). |
| "Você não aprova nem recusa operações do Financeiro" | Por decisão do dono (16/11/2026), só o dono do sistema e a Diretoria decidem as operações acima da alçada. O Financeiro prepara e acompanha em Aprovações pendentes. |

## 10. Como fazer em cada aba

No topo de cada aba há o quadro **"Como fazer nesta aba"**, aberto na primeira vez (feche quando já souber; o painel lembra). O conteúdo é este:

**Visão geral.** Ver, num só lugar, o que a empresa tem a pagar e a receber, o que já venceu e o que vence nos próximos dias.

1. Confira o período (do dia 1º até hoje) e troque as datas se quiser.
2. Os cartões mostram o total em aberto a pagar e a receber e quanto disso já venceu.
3. A Agenda de vencimentos, logo abaixo, lista dia a dia o que vai entrar e sair. Use "Período" e "Mostrar" para filtrar.

**Contas a pagar e receber.** Consultar os títulos a pagar e a receber, um por um.

1. Escolha A receber ou A pagar e a situação (vencidos, vencem hoje, a vencer ou todos).
2. Use Anterior e Próxima para andar pelas páginas (50 títulos por página).
3. Para lançar, alterar ou baixar um título, use a aba "Lançamentos e baixas".

**Ficha do cliente.** Preparar a cobrança de um cliente: o que ele deve, desde quando e como costuma pagar.

1. Digite parte do nome ou o CNPJ e toque no cliente.
2. Os cartões mostram o vencido, o total em aberto, o que ele pagou em 12 meses e o atraso médio.
3. Abaixo estão os títulos em aberto e os últimos recebimentos. Baixe a planilha se precisar enviar à Diretoria.

**Pedidos aprovados.** Transformar uma proposta aprovada pelo cliente em conta a receber no Omie, sem digitar tudo de novo.

1. Busque a proposta pelo número, cliente, título ou ordem de compra.
2. Toque em "Preparar conta a receber": o lançamento abre preenchido com cliente, documento e valor.
3. Confira a categoria, a conta e o vencimento, toque em "Conferir prévia" e depois em "Confirmar no Omie".

**Lançamentos e baixas.** Cadastrar ou corrigir títulos no Omie e registrar pagamentos e recebimentos (baixas).

1. Para um título novo: toque em "Novo lançamento", preencha os campos na ordem da tela (cada um diz o que é) e toque em "Conferir prévia".
2. Cliente ou fornecedor: busque pelo CNPJ ou pelo nome. Se não estiver no Omie, "Cadastrar no Omie" faz o cadastro com prévia, sem sair do lançamento.
3. Para corrigir: toque em "Editar" no título. Para registrar um pagamento ou recebimento: toque em "Registrar baixa".
4. Leia a prévia com atenção. Estando certa, toque em "Confirmar no Omie". Se algo estiver errado, toque em "Revisar campos".
5. Depois de confirmar, toque em Atualizar e confira o título na lista. A baixa registra o pagamento no Omie; ela não transfere dinheiro no banco.
6. A baixa confere o saldo em aberto do título e não aceita título já pago ou cancelado. Juros, multa e desconto ficam em zero até a primeira baixa acompanhada.
7. Se o Omie não respondeu a um envio, ele aparece em "Envios a conferir no Omie": confira no Omie e registre se foi feito ou não.

**Cobranças.** Consultar, gerar ou prorrogar o boleto de um título a receber.

1. "Ver boleto" abre o boleto já gerado e mostra o código de barras para enviar ao cliente.
2. "Gerar" cria o boleto no banco pelo Omie; "Prorrogar" muda o vencimento. Os dois passam pela prévia.
3. O banco pode cobrar tarifa para gerar ou alterar boleto.

**Conciliação bancária.** Conferir se cada movimento do extrato do banco está lançado no Omie.

1. Baixe o extrato no site do banco (de preferência em OFX).
2. Escolha a conta, o período, o formato e o arquivo e toque em "Gerar prévia".
3. Cada movimento do banco aparece ao lado do lançamento do Omie com a mesma data e o mesmo valor. Marque os que você conferiu e registre.
4. O que ficou sem par é o que falta lançar (ou foi lançado com data ou valor diferente).

**Faturamento de produtos.** Emitir a nota fiscal de um pedido de venda já cadastrado no Omie.

1. Escolha a etapa (normalmente "A faturar") e toque em "Atualizar lista".
2. Toque em "Conferir": o Omie valida o pedido antes da prévia.
3. Confira a prévia, marque a autorização e confirme. A nota é emitida pelo Omie; acompanhe a autorização da SEFAZ no Omie.

**Faturamento de serviços.** Emitir a nota de serviço de uma ordem de serviço já cadastrada no Omie.

1. Escolha a etapa (normalmente "A faturar") e toque em "Atualizar lista".
2. Toque em "Conferir": o Omie valida a O.S. antes da prévia.
3. Confira a prévia, marque a autorização e confirme. A NFS-e é emitida pelo Omie; acompanhe a autorização da prefeitura no Omie.

**Importação de notas.** Lançar no Omie, como conta a pagar, as notas recebidas de fornecedores, e importar no Omie as notas emitidas fora dele.

1. Para pagar uma NF-e de compra ou uma NFS-e: no primeiro quadro, "Lançar nota recebida no Omie", escolha o tipo e o XML e toque em "Conferir a nota".
2. Confira o fornecedor (cadastre se faltar), escolha a categoria de despesa e a conta, toque em "Conferir prévia" e confirme. Sai uma conta a pagar por parcela.
3. NF-e de saída emitida fora do Omie: no segundo quadro, escolha o documento e o XML, toque em "Conferir XML" e confirme a importação. Ela não gera título nem mexe no estoque.
4. Compra e NFS-e também podem ficar só guardadas no SGO+, sem ir ao Omie (histórico documental), pelo segundo quadro.

**Fluxo de caixa.** Ver o saldo e os movimentos de uma conta e o orçamento do mês.

1. Escolha a conta e o período e toque em Consultar: aparecem o saldo anterior, o atual, o previsto e os movimentos.
2. No orçamento, escolha o mês para comparar o previsto com o realizado por categoria.

**Resultado do mês.** Saber se o mês fechou positivo: tudo o que entrou menos tudo o que saiu.

1. Escolha o mês. O resultado é pela data em que o dinheiro entrou ou saiu (regime de caixa).
2. As tabelas mostram o recebido e o pago por categoria. Transferências entre contas da empresa não contam.

**Provisões.** Registrar despesas e receitas que ainda não viraram título (ex.: 13º, impostos anuais) para o planejamento.

1. Para consultar, escolha a origem e o período e toque em Consultar.
2. Para registrar uma provisão interna, abra o formulário, preencha tipo, descrição, valor e vencimento previsto e toque em "Registrar provisão".
3. A provisão interna fica só no SGO+: ela não cria título no Omie.

**Comissões.** Mostrar onde ficam as comissões dos vendedores.

1. As comissões são calculadas em "Ganhos dos vendedores", com a regra decidida pela gestão.

**Regras do Financeiro.** Ver as regras do Financeiro em vigor, aprovar operações acima da alçada e manter o de-para de categorias.

1. No topo estão as configurações em vigor (NF-e de compra, retenções da NFS-e e as duas alçadas). Elas são alteradas pelo responsável pelo sistema em Chaves e senhas.
2. Em "Aprovações pendentes", o dono do sistema ou a Diretoria lê a prévia preparada por outra pessoa e toca em Aprovar ou em Recusar (com o motivo). O Financeiro prepara e acompanha, mas não aprova; quem preparou não aprova a própria operação.
3. No de-para, escolha o tipo de lançamento, o CNPJ se a regra for de um fornecedor ou cliente, e a categoria do Omie; toque em "Acrescentar à lista".
4. Escreva o motivo e toque em "Gravar o de-para". A categoria sugerida aparece já escolhida nos lançamentos; quem lança sempre confere.

**Indicadores.** Ver, sem consultar o Omie a cada toque, como estão o caixa, a carteira e os pagamentos, a nota de saúde financeira e os gráficos, comparados com a fotografia de 7 ou 30 dias atrás.

1. Leia a faixa do topo: ela diz de quando é a fotografia (feita pela rotina a partir das 06:00, só leitura do Omie) e se ficou completa.
2. A nota de saúde (0 a 100) soma seis critérios. Cada linha diz o valor, os pontos e por quê; critério sem dado fica fora e a tela diz o motivo.
3. Cada cartão traz o número de hoje, o da fotografia anterior com a seta (verde melhorou, vermelha piorou), "O que é e como ler" e "Como é calculado". "Não calculado" sempre diz o motivo.
4. Em "Comparar com", escolha 7 ou 30 dias. Os gráficos ficam abaixo dos cartões, cada um com uma frase dizendo o que mostra.
5. Para números mais novos, toque em "Atualizar agora": a fotografia sai na próxima rodada automática (até 15 minutos). Saldo mínimo e pesos da nota mudam em Chaves e senhas > Regras do Financeiro.

**Sigilo e acessos.** Ver quem pode acessar o Financeiro e quem consultou o quê.

1. A lista mostra as contas autorizadas. Só o responsável pelo sistema altera, marcando as contas e escrevendo o motivo.
2. A Diretoria vê o registro: consultas, planilhas baixadas e tentativas recusadas (em destaque quando houver).

## 11. O que preencher em cada campo

Embaixo de cada campo do painel aparece a explicação abaixo (nas barras de filtro, numa linha logo abaixo da barra).

### Filtros e buscas

- **Contas:** A receber é o que os clientes devem à empresa; A pagar é o que a empresa deve aos fornecedores.
- **Situação:** filtra os títulos por vencimento (vencidos, vencem hoje, a vencer ou todos).
- **De:** o primeiro dia do período da consulta.
- **Até:** o último dia do período da consulta.
- **Conta:** a conta corrente (banco ou caixa) cadastrada no Omie que você quer consultar.
- **Mês:** o mês do orçamento (o previsto comparado com o realizado, por categoria).
- **Origem:** de onde vêm as previsões. As três primeiras são lançadas no Omie (contratos, O.S. e pedidos); "Provisões internas" são as registradas aqui no SGO+.
- **Período:** quantos dias à frente a agenda mostra.
- **Mostrar:** só o que vai entrar, só o que vai sair ou os dois.
- **Mês:** o mês do resultado (recebido menos pago, pela data em que o dinheiro entrou ou saiu).
- **Cliente:** digite pelo menos 3 letras do nome ou os números do CNPJ e toque no cliente da lista.
- **Buscar:** número da proposta, nome do cliente, título da proposta ou número da ordem de compra.

### Novo lançamento e edição (Lançamentos e baixas)

- **Cliente:** quem vai pagar. Busque pelo CNPJ (ou CPF) ou por parte do nome e toque em "Usar este". Se não aparecer, use "Cadastrar no Omie".
- **Fornecedor:** a quem a empresa vai pagar. Busque pelo CNPJ (ou CPF) ou por parte do nome e toque em "Usar este". Se não aparecer, use "Cadastrar no Omie".
- **Buscar no Omie:** digite o CNPJ (ou CPF) ou parte do nome. Se não aparecer, use "Cadastrar no Omie".
- **Documento:** O número do documento que originou o título: nota fiscal, proposta, fatura ou recibo. É por ele que o título é encontrado depois, aqui e no Omie.
- **Valor do documento:** o valor total do título em reais, como está no documento. Use vírgula ou ponto para os centavos.
- **Vencimento:** a data combinada para o pagamento.
- **Categoria:** a classificação no plano de contas do Omie (ex.: receita de serviços). Só aparecem categorias de receita, porque é uma conta a receber. Decide em que linha o valor aparece no Resultado do mês e no orçamento. Na dúvida, confirme com a contabilidade.
- **Categoria:** a classificação no plano de contas do Omie (ex.: aluguel, combustível, peças). Só aparecem categorias de despesa, porque é uma conta a pagar. Decide em que linha o valor aparece no Resultado do mês e no orçamento. Na dúvida, confirme com a contabilidade.
- **Categoria:** a classificação no plano de contas do Omie (ex.: receita de serviços, aluguel, combustível). Decide em que linha o valor aparece no Resultado do mês e no orçamento. Na dúvida, use a mesma categoria de títulos parecidos ou confirme com a contabilidade.
- **Conta corrente:** o banco ou o caixa onde o dinheiro deve entrar (a receber) ou de onde deve sair (a pagar).
- **Referência única do lançamento:** Um código único deste lançamento, criado por você (ex.: PROP-2026-0123-P1). Serve para o Omie recusar o mesmo lançamento se ele for confirmado duas vezes. Não repita o código em outro título.
- **Previsão financeira:** preencha só se você espera o dinheiro em outra data (ex.: o cliente costuma pagar alguns dias depois). Deixa o fluxo de caixa mais realista. Em branco, vale o vencimento.
- **Emissão:** a data do documento (nota ou fatura). Em branco, vale a data de hoje.
- **Observação:** o que ajuda quem consultar depois (ex.: parcela 1 de 3, combinado por e-mail com o cliente). Vai junto para o Omie.

### Registrar baixa

- **Conta corrente da baixa:** a conta em que o dinheiro entrou (recebimento) ou de onde saiu (pagamento). Confira no extrato do banco.
- **Valor da baixa:** o valor que entrou ou saiu da conta, como está no extrato, sem juros, multa ou desconto. Não pode passar do saldo em aberto do título, que aparece na prévia. Se for menor, a baixa é parcial e o restante continua em aberto.
- **Data da baixa:** o dia em que o dinheiro entrou ou saiu da conta (a data do extrato), não necessariamente hoje.
- **Desconto:** fica em zero até a primeira baixa acompanhada confirmar como o Omie trata o desconto no saldo do banco. Baixa com desconto, por enquanto, se faz direto no Omie.
- **Juros:** fica em zero até a primeira baixa acompanhada confirmar como o Omie soma os juros no saldo do banco (para não lançar em dobro). Baixa com juros, por enquanto, se faz direto no Omie.
- **Multa:** fica em zero pelo mesmo motivo dos juros. Baixa com multa, por enquanto, se faz direto no Omie.
- **Observação:** o que identifica o pagamento (ex.: número do comprovante, PIX recebido de quem).

### Envios a conferir no Omie

- **O que você conferiu no Omie:** escreva onde olhou e o que encontrou (ex.: o título não aparece em Contas a receber; a baixa aparece no extrato do Omie). Fica no registro de acessos. Pelo menos 10 letras.

### Cadastrar cliente ou fornecedor no Omie

- **Cadastrar como:** Cliente (quem paga a empresa), Fornecedor (a quem a empresa paga) ou os dois. Se o CNPJ já existe no Omie, o SGO+ só acrescenta o que falta.
- **CNPJ ou CPF:** o documento de quem será cadastrado. O SGO+ confere os dígitos e procura no Omie antes, para não cadastrar duas vezes.
- **Razão social:** o nome oficial, como no cartão CNPJ. O Omie aceita até 60 letras.
- **Nome fantasia:** o nome pelo qual a empresa é conhecida. Em branco, vale a razão social.
- **Endereço:** rua, número, bairro, cidade, UF e CEP. Vem do cadastro do SGO+, da nota fiscal ou da consulta do CNPJ; a origem aparece na prévia.
- **Número:** o número do imóvel no endereço (S/N se não houver).
- **Complemento:** sala, bloco, galpão (opcional).
- **Bairro:** como está no cartão CNPJ ou na nota.
- **Cidade:** o nome da cidade, sem a UF.
- **UF:** a sigla do estado, com 2 letras (ex.: GO).
- **CEP:** só os números ou no formato 00000-000.
- **E-mail:** cliente, o e-mail que recebe cobrança e boleto; fornecedor, o de pedidos.
- **Telefone:** com DDD, só os números.

### Boletos

- **Novo vencimento:** a nova data do boleto, combinada com o cliente. O banco pode cobrar tarifa pela alteração.

### Conciliação bancária

- **Conta corrente:** a mesma conta do extrato que você baixou do banco.
- **De:** o primeiro dia do extrato (o período vai até 94 dias).
- **Até:** o último dia do extrato.
- **Formato:** OFX é o arquivo padrão que os bancos exportam (prefira este); CSV é a planilha do extrato.
- **Arquivo:** o extrato baixado no site ou aplicativo do banco, do mesmo período e da mesma conta (até 500 KB e 100 movimentos).

### Faturamento e notas

- **Etapa:** "A faturar" são os prontos para emitir a nota; "Pedidos / ordens" ainda estão em andamento; "Faturados" já têm nota.
- **Documento:** "NF-e saída" é uma nota que a empresa emitiu fora do Omie e que entra no Omie; "NF-e compra" e "NFS-e" são notas recebidas, guardadas no SGO+ para conferência.
- **XML:** o arquivo .xml da nota (o PDF não serve). Saída até 40 KB; compra e NFS-e até 1 MB. O XML original fica guardado num arquivo da pasta do Financeiro.
- Marque só depois de conferir a prévia acima. É a sua autorização para esta operação ser enviada ao Omie.

### Lançar nota recebida no Omie (conta a pagar)

- **Tipo da nota:** NF-e de compra (modelo 55, produto ou material) ou NFS-e (serviço contratado pela empresa).
- **XML da nota:** o arquivo .xml que o fornecedor enviou (o PDF não serve). NF-e de compra ou NFS-e de um serviço contratado pela empresa.
- **Fornecedor:** lido da nota. Se não estiver cadastrado no Omie, cadastre aqui antes de lançar.
- **Parcelas:** os vencimentos e valores que vieram na nota. Confira com o boleto. Se a soma não bate com o total, explique abaixo.
- **Categoria:** em que despesa esta nota entra no plano de contas (ex.: peças para manutenção, serviços de terceiros). Só aparecem categorias de despesa. Vale para todas as parcelas.
- **Conta corrente:** de qual banco a empresa vai pagar.
- **Vencimento:** a nota não traz parcelas; informe a data do boleto ou a combinada com o fornecedor.
- **Nota já paga:** marque se o pagamento já foi feito (cartão, PIX no ato). O SGO+ lança a conta e, em seguida, oferece registrar o pagamento de cada parcela, cada um com a sua prévia.
- **Motivo da diferença:** por que o valor a pagar difere do total da nota (ex.: desconto negociado após a emissão).
- **Motivo da conferência manual:** por que algum dado foi digitado (ex.: a prefeitura usa um formato próprio; dados conferidos no PDF da nota). Fica registrado junto da nota.
- **Campo não lido do XML:** a prefeitura usa um formato diferente. Digite o valor como está na nota (PDF) e confira. Fica registrado que foi digitado.
- **Retenções:** impostos que a empresa desconta do prestador e recolhe ela mesma (IR, PIS, COFINS, CSLL, INSS, ISS). O valor a pagar ao prestador é o líquido.

### Provisões internas

- **Tipo:** "Despesa prevista" para algo que a empresa vai pagar; "Receita prevista" para algo que vai receber.
- **Descrição:** o que é a provisão (ex.: 13º salário de dezembro, IPVA da frota). Pelo menos 3 letras.
- **Valor:** o valor estimado em reais.
- **Vencimento previsto:** quando a empresa espera pagar ou receber.

### Regras do Financeiro (de-para, aprovação e segunda confirmação)

- **Tipo de lançamento:** em qual lançamento a sugestão vale (NF-e de compra, NFS-e recebida ou conta a receber de proposta aprovada).
- **CNPJ ou CPF (opcional):** preencha para a regra valer só para um fornecedor ou cliente. Em branco, vale para todos daquele tipo; a regra com CNPJ vale antes da regra geral.
- **Categoria do Omie:** a categoria que aparecerá já escolhida no lançamento. Só aparecem as utilizáveis: de despesa para conta a pagar, de receita para conta a receber. A pessoa sempre confere e pode trocar.
- **Motivo da mudança:** por que o de-para mudou (ex.: combinado com o contador; fornecedor novo de peças). Obrigatório, pelo menos 10 letras; fica no histórico.
- **Motivo:** obrigatório para recusar (ex.: valor diferente do combinado; confirmar a nota antes). Quem preparou vê o motivo ao tentar confirmar. Para aprovar, pode deixar em branco. Só o dono do sistema e a Diretoria aprovam ou recusam; o Financeiro prepara.
- **Digite o valor de novo:** a operação passa da alçada configurada. Digite o mesmo valor da prévia (ex.: 12.500,00) para confirmar; se não conferir, nada é enviado.

### Indicadores

- **Comparar com:** a fotografia usada para a seta de cada cartão e da nota de saúde. 7 dias mostra a tendência da semana; 30 dias, a do mês. Sem fotografia tão antiga, o cartão mostra só o valor de hoje.

### Sigilo e acessos

- **Motivo:** por que a lista muda (ex.: nova pessoa no Financeiro, saída de alguém). Obrigatório; fica no registro de acessos.

</div>
