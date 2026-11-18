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
| Contas fixas | Cadastro das despesas que se repetem todo mês e a conta de cada mês para lançar no Omie pela prévia de Lançamentos e baixas (seção 8k). |
| Fechamento do mês | Checklist do fechamento de cada mês, com quem fez e quando; cada item é uma atividade sigilosa do Financeiro (seção 8l). |
| Comissões | Leva a Ganhos dos vendedores. |
| Regras do Financeiro | Configurações em vigor, aprovações pendentes (só o dono do sistema e a Diretoria decidem) e o de-para de categorias. |
| Indicadores | Nota de saúde financeira e os indicadores I01 a I19 com gráficos, lidos da fotografia diária (seção 8d). |
| Régua de cobrança | Quadro (Kanban) dos títulos a receber por etapa da cobrança, com as ações registradas, a decisão da Diretoria e as pendências (seção 8f). Não grava no Omie nem manda nada ao cliente. |
| Agenda financeira | O que vence a receber e a pagar nos próximos 30, 60 ou 90 dias (Gantt) e a previsão de caixa de 90 dias, otimista e realista (seção 8g). |
| Relatórios semanais | Relatório A4 de saúde financeira de cada semana, aberto só no SGO+, com a lista de quem foi avisado (seção 8h). |
| Recarga Caju | Recarga Caju da rotina dos técnicos: pedidos e cargas, prestações gasto a gasto, portadores, divergências, política, painel e relatórios A4 (seção 8i). |
| Especialista financeiro | Dúvidas de uso do Painel, regras financeiras e leitura da situação de hoje pela fotografia, com propostas de ação e de atividade que só viram atividade com a sua confirmação (seção 8j). Não grava no Omie, não aprova e não envia mensagem. |
| Trilha das operações | Toda gravação feita pelo SGO+ no Omie, com o resultado, e os pedidos de estorno de baixa e de exclusão de título, que só o dono e a Diretoria confirmam (seção 8m). |
| Compras e Caju no Omie | As compras faturadas e por boleto já conferidas em Compras, as faturas dos cartões fechadas na conciliação e as cargas pagas ao Caju (viagens e Recarga Caju, com a taxa em separado), para lançar no Omie como conta a pagar pela prévia de Lançamentos e baixas, e a conferência do que foi lançado contra o Omie (seção 8q). |
| Aprovação de pagamentos | Lista diária das contas a pagar (vencidas, de hoje e as que o Financeiro escolher) enviada para aprovação; o dono ou a Diretoria aprova num toque ou recusa e adia item por item. A baixa de conta a pagar só é liberada depois (seção 8n). |
| Orçamento anual | Orçamento do ano por categoria e mês, com versão, motivo e aprovação do dono ou da Diretoria; acompanhamento orçado × realizado do Omie (seção 8o). |
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
| Registrar ações da régua de cobrança | Contato, lembrete, promessa, acordo e encaminhamento à Diretoria na Régua de cobrança (18/11/2026). |
| Gerar o relatório semanal de saúde financeira agora (parcial) | "Gerar agora" em Relatórios semanais (18/11/2026). |

As abas Contas fixas, Fechamento do mês e Trilha das operações (18/11/2026) não têm caixa própria: ver é da lista de sigilo; cadastrar conta fixa, marcar item do fechamento e pedir estorno ou exclusão usam a caixa "Lançar, alterar e baixar títulos no Omie"; confirmar estorno e exclusão, dispensar item, reabrir mês e alterar a lista do fechamento são do dono e da Diretoria da lista. A aba Compras e Caju no Omie (18/11/2026) também não tem caixa própria: ver e "Conferir com o Omie" são da lista de sigilo; preparar o lançamento, "Já lancei direto no Omie", "Dispensar" e "Desfazer" usam a caixa "Lançar, alterar e baixar títulos no Omie".

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
| I16 | Execução da cobrança | Vencidos com ação de cobrança registrada nos últimos 7 dias, divididos pelos vencidos, vezes 100. | Mede o trabalho de cobrança, não o cliente: quanto dos títulos vencidos teve ação registrada na Régua de cobrança na última semana (seção 8f). |
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

G1 recebido × pago em 12 meses, com a linha do resultado; G2 saldo previsto de 90 dias (da Agenda financeira, seção 8g); G3 envelhecimento do a receber (a vencer, 1 a 30, 31 a 90, acima de 90 dias); G4 inadimplência semana a semana (fotografia do fim de cada semana); G5 despesas por categoria no mês, com as que somam 80 % em destaque; G6 os 10 maiores devedores; G7 orçado × realizado (com orçamento no Omie); G8 viagens no Caju (carregado, gasto conciliado e gasto sem comprovante ligado, 6 meses). Cada gráfico tem uma frase dizendo o que mostra; no celular ocupam a largura da tela.

### Atividades do Financeiro e o assistente geral

Atividade de um módulo do Financeiro (Financeiro, Omie, Caju, Conciliação Caju, Compras do Financeiro) é sempre restrita e só é vista pelo responsável, por quem lançou e por quem está na lista de sigilo. O RH e a gestão fora da lista não a veem (nem na lista, nem no detalhe, nem na central de pendências, na Caixa de decisões ou na cobrança da SEDNA). O responsável precisa estar na lista: "A atividade do Financeiro só pode ser de alguém da lista de sigilo. Para pedir algo a outra pessoa, crie a atividade sem valores e sem nome de cliente, fora do Financeiro." As atividades restritas do Programa de conduta continuam como antes (RH e gestão de decisões veem). O assistente geral "Tire sua dúvida" não tem mais a ajuda nem os manuais do Financeiro (Painel financeiro, Conciliação Caju, conferência de Compras): essas dúvidas ficam no "Como usar esta tela" do próprio Painel e no especialista financeiro (seção 8j), só para a lista de sigilo.

## 8e. Reajustes de contratos (17/11/2026, pedido do dono)

Pedido do dono: "reajuste automático para o financeiro faturar com os índices já calculados no painel do financeiro". A aba **Reajustes de contratos** mostra:

- **Índices do mês (Banco Central):** IPCA, IGP-M, INPC e IPCA-E, com a variação do último mês publicado, o acumulado de 12 meses e a data da coleta. A rotina consulta a API pública do Banco Central uma vez por dia; sem internet, a tela avisa e o sistema usa os últimos valores gravados. Nada é estimado.
- **Contratos a reajustar:** cada contrato com índice, data-base e valor (cadastrados pelo Comercial em Portal do cliente > Contratos de clientes), com o aniversário, o período do índice, o acumulado, o valor atual e o novo e a data a partir da qual se fatura. "Memória de cálculo" abre a conta mês a mês, com a fonte.
- **Aprovar ou recusar:** só o dono do sistema e a Diretoria, dentro da lista de sigilo (regra "Aprovação só do dono e da Diretoria"). A recusa exige o motivo. Aprovado, o valor do contrato é atualizado (versão nova no histórico do contrato) e o Financeiro recebe o aviso, sem valores.
- **Marcar como faturado:** o Financeiro fatura pelas telas de sempre, com o valor aprovado, escreve o número da nota ou do pedido e toca em "Marcar como faturado". **Nada é gravado no Omie por esta aba.**
- **Atualizar os índices agora:** consulta o Banco Central na hora e recalcula os reajustes ainda não decididos.
- **Contratos que o sistema não calcula:** índice "outro" (cálculo manual), sem data-base ou sem valor. Complete o contrato em Portal do cliente > Contratos de clientes.

Sigilo: as quatro consultas da aba passam pela trava do Financeiro (lista de sigilo e caixa de consulta) e ficam no registro de acessos ("Reajustes de contratos", "Decisão de reajuste de contrato", "Reajuste marcado como faturado", "Índices do Banco Central atualizados"). O Comercial vê o índice e gera a carta de reajuste ao cliente na tela de contratos; ele não vê faturamento nem movimento. As pendências e o relatório diário levam só a contagem.

## 8f. Régua de cobrança (18/11/2026, Bloco B da onda 3)

A aba **Régua de cobrança** organiza a cobrança dos títulos a receber num quadro de oito colunas. A etapa de cada título é **calculada pelo sistema** a partir da fotografia diária do Omie e das ações registradas na própria aba: ninguém arrasta cartão. A régua é **só interna** (decisão do dono): não manda e-mail nem mensagem ao cliente e não grava nada no Omie.

| Etapa | Entra quando | Sai quando |
|---|---|---|
| A vencer em 5 dias | Faltam até 5 dias para o vencimento (configurável). | Vence, é pago ou recebe uma ação. |
| Vencido sem contato | Venceu e não há ação desde o vencimento, ou passaram 7 dias sem nova ação depois do último contato (em destaque). | Uma ação é registrada. |
| Em contato | Contato feito, lembrete enviado ou decisão da Diretoria nos últimos 7 dias. | Promessa, acordo ou 7 dias sem nova ação. |
| Promessa de pagamento | O cliente disse data e valor. | É pago (sai sozinho) ou a data passa: vai para "Promessa quebrada". |
| Promessa quebrada | Data prometida mais 2 dias úteis (configurável) sem o pagamento no Omie. Feriados e fins de semana não contam. | Nova ação. |
| Acordo ou renegociação | Nova condição combinada (as parcelas são lançadas depois no Omie, em Lançamentos e baixas, com a prévia). | O título é pago ou baixado. |
| Com a Diretoria | O Financeiro encaminhou para protesto, negativação, cobrança jurídica ou perda, com o motivo. | A Diretoria registra a decisão, com o motivo. |
| Recebido (7 dias) | O Omie mostra o título pago (só o que estava na régua ou foi pago com atraso). | Some depois de 7 dias. |

**Cartão:** cliente (nome do Omie), documento e parcela, saldo em aberto, dias de atraso, atraso médio do cliente nos últimos 12 meses (ponderado pelo valor), próxima ação, promessa, decisão da Diretoria e a última ação com quem registrou. Toque no cartão para abrir o painel do título: histórico, atalhos (Ficha do cliente; segunda via ou prorrogação do boleto) e o formulário.

**Quem decide o quê.** Registrar ações: caixa "Registrar ações da régua de cobrança" (padrão: Financeiro e Diretoria da lista de sigilo). **Protesto, negativação, cobrança jurídica e baixa como perda: só o dono do sistema e a Diretoria decidem** (regra "Aprovação só do dono e da Diretoria"), sempre com motivo de pelo menos 15 letras, que fica no histórico. A Wanessa encaminha e executa; a baixa como perda, se decidida, é feita em Lançamentos e baixas, com a prévia.

**Pendências.** Os lembretes do dia (próxima ação vencida) vão para quem registrou a última ação; as promessas quebradas, para o Financeiro e a Diretoria; os títulos com a Diretoria, para o dono e a Diretoria. A pendência diz só a quantidade: **nenhum nome de cliente nem valor** sai do Painel (o relatório diário da empresa mostra só a contagem).

**O que fica gravado.** FIN_COBRANCA (um registro por título acompanhado: documento, vencimento, etapa, próxima ação e a promessa) e FIN_COBRANCA_ACOES (histórico que não se altera). Não há CNPJ, e-mail do cliente nem o valor do título (o saldo vem sempre do Omie). E-mails e números longos digitados nos textos são retirados automaticamente.

**Execução da cobrança (I16).** O indicador I16 passa a ser calculado: títulos vencidos com ação registrada nos últimos 7 dias divididos pelos títulos vencidos.

**Régua externa (e-mail ao cliente).** Desligada por padrão. A chave existe em Chaves e senhas, mas ligá-la ainda não envia nada: o texto, o dia de início e se vai o boleto dependem de decisão do dono, e a tela avisa isso.

**Configuração** (Chaves e senhas > Regras do Financeiro; sem valor = padrão): dias do "a vencer" (5), dias sem nova ação até voltar a "vencido sem contato" (7), dias úteis de tolerância da promessa (2) e a régua externa (desligada).

## 8g. Agenda financeira e previsão de caixa (18/11/2026, Bloco B da onda 3)

A aba **Agenda financeira** mostra, num quadro de linha do tempo (Gantt), o que vence nos próximos 30, 60 ou 90 dias (padrão 60), com a semana anterior à vista: a receber por cliente (os 10 maiores e "Outros clientes"), a pagar por categoria do Omie (as 10 maiores e "Outras categorias"), as provisões internas e os prazos de prestação de contas de viagem. Losango cheio é vencido; vazado, a vencer. Barra amarela é promessa de pagamento e roxa é acordo, da data da ação até a data combinada. Para 60 e 90 dias a régua mostra uma marca por semana; para 30 dias, uma por dia. Toque num item para ver documento, valor e situação. Os dados vêm da fotografia diária: a aba não chama o Omie.

**Previsão de caixa de 90 dias.** Parte do saldo em contas da fotografia e soma, dia a dia, o que entra, menos o que sai, mais ou menos as provisões internas. Há duas curvas:

- **Otimista (pelo vencimento):** todo título a receber entra na data da previsão do Omie (ou no vencimento); o que venceu há até 90 dias entra hoje.
- **Realista (pela realização):** o que vai vencer entra deslocado pelo atraso médio dos clientes e multiplicado pela taxa observada de recebimento até 15 dias depois do vencimento; o que venceu há até 90 dias entra pela taxa de recuperação observada (do que venceu de 91 a 365 dias atrás sem ser pago, quanto acabou entrando).
- Nas duas, o vencido há mais de 90 dias fica fora; a pagar entra no vencimento, e o já vencido entra hoje.

As taxas usadas aparecem em "Como a previsão é feita". **Saldo mínimo de segurança:** por decisão do dono, não há valor fixo e o campo começa vazio. Sem ele, a previsão não compara com mínimo nenhum e avisa só se o saldo previsto ficar negativo. Com o valor definido em Chaves e senhas, a linha vermelha tracejada aparece e a faixa diz o dia em que a curva realista cruza o mínimo. A mesma previsão vira o gráfico G2 da aba Indicadores e entra no relatório semanal.

**Memória do servidor.** A lista de títulos da fotografia fica até 6 horas na memória do servidor (renovada a cada 15 minutos enquanto a fotografia for a de hoje) e nunca é gravada em tabela. Se o servidor reiniciar, a Régua e a Agenda pedem uma nova fotografia ("Pedir nova fotografia"), sem gravar nada no Omie.

## 8h. Relatório semanal de saúde financeira (18/11/2026, Bloco B da onda 3)

**Quando sai e para quem.** Toda **segunda-feira, a partir das 07:00**, depois da fotografia do dia, a rotina gera o relatório A4 da semana fechada anterior (segunda a domingo). Se a segunda não for dia útil, sai no primeiro dia útil seguinte; se a fotografia do dia não ficar pronta até as 10:00, usa a última e avisa na capa. Um relatório por semana. Por padrão recebem o aviso **o dono do sistema e a Diretoria** da lista de sigilo; **a Wanessa não recebe** (decisão do dono). O sistema só envia a quem está na lista de sigilo, mesmo que outra pessoa seja configurada; quem não é da Diretoria recebe só dentro do expediente.

**Só o link, nunca anexo.** O e-mail diz que o relatório da semana está pronto e leva o endereço do SGO+; não traz nenhum valor nem a nota (opção "Link e faixa da nota" acrescenta só a faixa). O documento abre só no Painel financeiro > Relatórios semanais, com login e lista de sigilo; cada abertura fica registrada e cada página impressa leva "gerado para <nome> · código". O arquivo fica numa pasta própria, não compartilhada, e o endereço dela nunca aparece na tela.

**Conteúdo.** Índice clicável; resumo executivo (nota de saúde com a seta da semana anterior, seis indicadores e três parágrafos: o que aconteceu, o que preocupa, o que fazer); saúde financeira (critérios com a explicação e o gráfico da nota por semana); caixa (saldo no início e no fim, entradas e saídas da semana, previsão de 90 dias com o alerta do mínimo); recebimentos e cobrança (envelhecimento, 10 maiores vencidos com o nome do cliente, promessas quebradas, execução da cobrança, prazos médios); pagamentos (próximos 30 dias por categoria e as contas vencidas); resultado (12 meses, despesas do mês, orçado e realizado); Caju; disciplina operacional; comparação com as 4 semanas anteriores; conclusão; e o anexo com a fórmula de cada número.

**A IA só escreve; os números são do sistema.** Com "Análise do Financeiro pela IA" = Sim (padrão, decisão do dono, chave paga do Gemini), o relatório envia à IA os indicadores e as listas da semana com os clientes e fornecedores trocados por códigos (Cliente 01, Fornecedor 02), sem documento, CNPJ, CPF, e-mail nem nome de colaborador; o que vem do Omie (nome de categoria) vai marcado como dado. Cada número que a IA escreve é conferido com os do sistema: se não bater, ou se aparecer nome que não veio dos dados, aquele parágrafo é trocado pelo texto padrão e o relatório avisa "análise parcialmente substituída pelo texto padrão". Sem a chave ou com a IA não autorizada, o relatório sai inteiro com o texto padrão.

**Gerar agora.** Monta o relatório da semana em curso, marcado como **parcial**, sem avisar ninguém (caixa "Gerar o relatório semanal de saúde financeira agora").

**Configuração** (Chaves e senhas > Regras do Financeiro; sem valor = padrão): relatório ligado; dia (segunda); hora (07:00); quem recebe (o dono e a Diretoria da lista de sigilo); forma do aviso (só o link); análise pela IA (sim). A aba Relatórios semanais mostra a configuração em vigor e quem recebe de fato.

## 8i. Recarga Caju da rotina (18/11/2026, Bloco C da onda 3)

**Para que serve.** Os técnicos da rotina (peças, insumos, oficina, deslocamento local) usam o cartão Caju da empresa. O técnico **pede** a recarga em Operação de campo > Minha recarga Caju, **gasta**, **presta contas** gasto a gasto com a foto do comprovante e, no fim do período, **devolve o que sobrou**. A gestão fica nesta aba, só para a lista de sigilo do Financeiro. O manual do técnico é o docs/MANUAL_RECARGA_CAJU.md.

**Decisões do dono que valem como estão.**
- Modelo **pedido avulso + prestação + devolução** (não é fundo rotativo). Fundo, limite do Financeiro e tetos existem na política, mas ficam **vazios**: vazio quer dizer sem limite automático, e cada pedido é decidido na aprovação. Nenhum valor foi inventado.
- **Só o dono e a Diretoria aprovam** (regra "Aprovação só do dono e da Diretoria" em Chaves e senhas). A Wanessa faz a carga, confere e concilia, mas não aprova.
- **Quem pede não aprova** o próprio pedido; **quem aprova não faz a carga** quando há outra pessoa da lista que possa fazer. Se só restar quem aprovou, a carga é registrada como "aprovada e carregada pela mesma pessoa" e aparece no relatório semanal.
- O **portador nunca carrega nem confere** o próprio cartão. Se a Wanessa for portadora, a Diretoria aprova e confere a prestação dela.
- **Não comprovado vira devolução.** O sistema não faz desconto em folha; isso só com acordo assinado, depois de revisar com o RH e o contador.
- **Termo do portador**: texto padrão profissional, configurável na Política e marcado "revisar com o RH e o contador". Mudar o texto pede novo aceite de cada portador.
- **WhatsApp desligado** na cobrança do portador. A cobrança é no sistema e por e-mail, só em dia útil e no expediente, sem valores no assunto.
- **Período mensal** (configurável para quinzenal). Prazos: comprovante em 2 dias úteis depois do gasto; fechamento em 3 dias úteis depois do fim do período; trava com pendência há mais de 10 dias úteis.
- **Categoria ou carteira própria no Caju para a rotina: a confirmar com o Caju.** Fica configurável na Política; sem ela, a separação entre viagem e rotina é feita pelo SGO+ (janela da viagem e gasto lançado).

**Pedidos e cargas.** Cada pedido mostra o valor, a justificativa, para que vai ser usado e a situação do portador (gastos a comprovar, saldo da rotina, valor a devolver, trava). O dono ou a Diretoria aprova (pode aprovar valor menor, com fundamentação), devolve para ajuste ou nega (fundamentação obrigatória). Aprovado, quem tem a caixa da carga faz a **carga pelo Caju** (modo API: o SGO+ cria o pedido "RECARGA" com o número, paga com o saldo da conta Caju e registra a carga quando o Caju creditar) ou **registra a carga feita** no portal, com o comprovante. A carga nunca passa do aprovado e não há dois pedidos de crédito para a mesma recarga.

**Prestações.** Para cada portador: carregado, gasto lançado, a conferir, aceito, glosado, gasto do extrato sem comprovante, a devolver e a reembolsar. Cada gasto traz o comprovante, para que foi, o vínculo, os apontamentos da política (termo proibido no nome ou no ramo do CNPJ, fim de semana ou feriado, acima do teto, possível fracionamento) e a diferença entre o que a leitura do comprovante viu e o que foi digitado. **Aceite** ou **glose** (total ou parcial, com o motivo de 15 letras ou mais, que o portador vê). Fechado o período pelo portador, ou vencido o prazo dele (com o motivo), toque em **Concluir o período**: a conta (nunca digitada) é carregado menos o aceito no cartão menos o devolvido. Registre a **devolução** (recolhimento do saldo no Caju ou depósito/PIX) ou o **reembolso** (gasto pago com dinheiro próprio), com o comprovante. Acertado, o período fica encerrado.

**Conciliação com o extrato.** Roda sozinha depois de cada importação do extrato na Conciliação Caju e depois de cada gasto lançado. O gasto da recarga é ligado à transação pelo valor exato e pela data (a IA nunca liga). Dentro da janela de uma viagem, o gasto da viagem tem prioridade. Fora das viagens, a transação do portador sem comprovante vira "Recarga: gasto do cartão sem comprovante" (do portador) em vez de "fora do período". Quem não é portador continua como antes. Divergências novas: sem comprovante, valor diferente, gasto sem transação (do portador); fora da política, leitura diferente, comprovante repetido, saldo parado e crédito sem recarga (do Financeiro). Elas aparecem em Divergências desta aba e na Conciliação Caju, onde são resolvidas com o motivo. Ninguém resolve a divergência do próprio cartão.

**Portadores.** Quem tem o CPF vinculado ao Caju pode ser habilitado ("Usa o cartão na rotina", com motivo). A trava (pendência além do prazo) impede nova recarga e também o depósito de viagem; só a Diretoria libera, com motivo e validade de 1 a 30 dias. Ao desabilitar quem tem saldo ou valor a devolver, a tela avisa para recolher o saldo e concluir o período.

**Política.** Modelo, período, prazos, trava, saldo parado, fundo, limite do Financeiro, gasto sem comprovante, fim de semana e feriado, categoria do Caju, finalidades, tetos, termos proibidos e o texto do termo. Cada gravação pede o motivo e vira uma versão; cada recarga lembra a versão que valeu. Só a Diretoria altera.

**Painel e relatórios.** Índices do período (carregado, gasto no extrato, % com comprovante, % conciliado sozinho, prazo médio do comprovante, comprovantes vencidos, divergências por tipo, % fora da política, glosado, saldo parado), gráficos (por finalidade, por pessoa, evolução mensal e prazo médio por pessoa com a linha do prazo), quadro de leitura e gasto por vínculo (o cartão da rotina não tem centro de custo próprio). Relatórios A4: individual (com o extrato do período linha a linha; com o período concluído, é o A4 de fechamento), geral e pendências. Cada geração fica registrada. O relatório semanal de saúde financeira traz a recarga na seção 7, e o gráfico G8 soma viagem e recarga.

**Sigilo.** Valores e dados só para a lista de sigilo do Financeiro e para o próprio portador (que vê só os dele). Pendências e avisos para quem está fora da lista saem sem valor. Toda abertura e toda recusa ficam no registro de Sigilo e acessos.

## 8j. Especialista financeiro (18/11/2026, onda 3, etapas E10 e E11)

**Para que serve.** A aba "Especialista financeiro" (e o botão "Perguntar ao especialista", no canto superior do Painel) responde a três tipos de pergunta, só para a lista de sigilo do Financeiro. Em "Automático", o sistema escolhe o tipo pela pergunta; a pessoa pode escolher.

| Tipo de ajuda | Exemplo | De onde vem a resposta | Vai dado da empresa ao serviço de IA? |
|---|---|---|---|
| Como fazer no sistema | "Como lanço uma nota de serviço recebida?" | Ajuda das telas e manuais do Financeiro | Não |
| Regra financeira | "Qual a diferença entre regime de caixa e de competência?" | Base de regras financeiras da empresa, mais conhecimento geral, com a regra citada | Não |
| Analisar a situação | "Quem devo cobrar primeiro?" | Fotografia do Financeiro do dia (Indicadores), com clientes em código | Sim, o mínimo, pseudonimizado |

**O que vai ao serviço de IA na análise.** Os indicadores, o envelhecimento do a receber, os maiores vencidos por cliente, os 15 maiores títulos vencidos (código T01 a T15, cliente em código, saldo em reais inteiros, dias de atraso e etapa da régua), o a pagar de 30 dias por categoria, as contas a pagar vencidas (fornecedor em código), o recebido e o pago por mês, os responsáveis possíveis (em código, "Responsável 1 (Financeiro)") e as abas do Painel. Nunca vão nome de cliente ou fornecedor, CNPJ, CPF, número de documento, e-mail, telefone, conta bancária nem nome de colaborador; nomes de clientes e de colegas escritos na pergunta são trocados por códigos antes do envio. O que vem do Omie (nome de categoria) vai marcado como dado, com a instrução de ignorar qualquer ordem escrita lá dentro. A tabela de troca dos códigos fica só no servidor; a resposta volta com os nomes reais na sua tela.

**Números conferidos.** Toda resposta com número passa pela conferência de números do sistema contra o que foi enviado (os dados, a regra ou o manual). A frase com número que não está nos dados, ou, na análise, com nome que não veio dos dados, é retirada, e a resposta avisa "Foram retirados ... trecho(s)". Se nada sobrar, aparece o texto padrão do sistema, com os números da fotografia. Abaixo de cada resposta aparecem as fontes ("Fotografia do Financeiro de dd/mm/aaaa hh:mm", a regra usada ou a seção do manual) e o aviso "Texto de apoio; confira os números nos quadros do Painel".

**Sem a chave da IA ou sem autorização.** O especialista funciona sem a chave: "Como fazer" mostra os trechos do manual mais próximos, "Regra financeira" mostra a regra da empresa mais próxima e a análise mostra o texto padrão do sistema. Com "Análise do Financeiro pela IA" = Não (Chaves e senhas > Regras do Financeiro), nenhum dado da empresa sai; os outros dois tipos continuam. A faixa no topo da aba diz o que está ligado.

**Regra financeira e o contador.** A base de regras é um texto padrão profissional, marcado "revisar com a contabilidade" até a Diretoria gravar uma versão revisada. A resposta cita a regra usada (ex.: "R02 Juros, multa e desconto na baixa") ou avisa que veio de conhecimento geral. Quando a pergunta envolve imposto, retenção, contabilidade, folha, protesto, negativação ou lei, ou a regra usada é marcada "confirmar com o contador" ou "com o jurídico", a resposta traz o aviso de confirmar antes de decidir. A base fica em "Base de regras financeiras", no fim da aba: a lista de sigilo lê; só o dono do sistema e a Diretoria alteram, com o motivo, e cada gravação vira uma versão nova (a anterior fica guardada).

**Propostas.** Na análise, o especialista pode propor até 3 ações: abrir uma aba do Painel (a Régua de cobrança já filtrada no cliente, a Ficha do cliente, a Agenda financeira), sem executar nada, ou uma atividade. O sistema descarta a proposta com responsável fora da lista de sigilo, prazo fora de 1 a 30 dias úteis, aba que não existe ou número que não está nos dados, e diz quantas descartou. O cartão da atividade vem preenchido e editável (título, descrição, responsável, prazo e prioridade). **Nada é criado sem o toque "Criar atividade".** A atividade vai para o módulo de Atividades como do Financeiro: restrita, vista só pelo responsável, por quem criou e pela lista de sigilo, com o responsável sempre da lista de sigilo (decisão do dono: atividade sugerida para quem está fora da lista, não). A proposta vale 30 minutos.

**O que o especialista não faz, por construção.** Não grava, não altera, não baixa nem exclui nada no Omie, no Caju ou em cadastro; não aprova nada (só o dono do sistema e o Charles aprovam o que é financeiro); não envia e-mail, WhatsApp ou mensagem a cliente, fornecedor ou colaborador; não muda a lista de sigilo, as caixas ou as chaves; não responde a quem está fora da lista de sigilo. Pedido de CNPJ, dados bancários, senhas ou para contornar regras é recusado antes de chamar a IA.

**Limites e registro.** 30 perguntas por hora por pessoa e 15 análises com dados da empresa por dia. Cada pergunta fica registrada (quem, quando, o tipo de ajuda, se foram enviados dados, quantos caracteres, a resposta com os clientes em código, as propostas, as atividades criadas e a avaliação "Resolveu" ou "Não resolveu") e entra no registro de acessos como "Perguntou ao especialista", sem valores. A Diretoria lê o registro em Sigilo e acessos. A pergunta e a resposta são apagadas depois de **12 meses** (decisão do dono; "Especialista financeiro: meses de guarda" em Chaves e senhas > Regras do Financeiro) e ficam as demais colunas. A conversa na tela não fica guardada no navegador: some ao sair do Painel, ao trocar de conta e depois de 10 minutos sem uso.

**O assistente geral "Tire sua dúvida".** Para quem está fora da lista de sigilo, a base do assistente geral não tem a ajuda nem os manuais do Financeiro (Painel financeiro, Conciliação Caju, conferência de Compras, gestão da Recarga Caju). Para quem está na lista, o manual do Painel financeiro continua lá; as perguntas de regra e de análise ficam no especialista.

## 8k. Contas fixas (18/11/2026, Onda A, item A1)

**O que é.** Um cadastro no SGO+ das despesas que se repetem todo mês (aluguel, internet, softwares, contador, seguros): descrição, fornecedor do Omie, categoria de despesa, conta corrente, dia do vencimento, valor fixo ou "valor varia — confirmar no mês", e os meses de início e de fim. A lista começa vazia: o sistema não traz nenhuma conta nem valor prontos.

**Todo mês.** Dez dias antes de cada vencimento, a rotina do Financeiro (a mesma da fotografia diária) prepara a conta do mês, que aparece em "Para lançar". "Preparar lançamento" abre a aba Lançamentos e baixas com o novo lançamento preenchido: fornecedor, documento (FX + ano e mês + código da conta), valor, vencimento, categoria, conta corrente, observação e a referência única FIX-<conta>-<AAAAMM>, que impede lançar o mesmo mês duas vezes. Com valor variável, o valor vem em branco e é digitado conforme a fatura. Nada vai ao Omie sem "Conferir prévia" e "Confirmar no Omie"; valem as alçadas e a trilha de sempre. Confirmado pelo Omie, o mês sai de "Para lançar" sozinho. Dia 31 em mês mais curto vira o último dia do mês.

**Sem passar pelo lançamento.** "Já lancei direto no Omie" (com o que foi conferido, 10 letras ou mais) e "Dispensar este mês" (com o motivo, 15 letras ou mais). As duas podem ser desfeitas, com motivo. A conta lançada pelo SGO+ já está no Omie: se foi engano, peça a exclusão do título na Trilha das operações.

**Alterar.** Toda alteração pede o motivo (15 letras ou mais) e grava só o que mudou; o histórico guarda o antes, o depois e quem alterou. O mês já preparado continua com o valor da época; a alteração vale a partir do próximo mês preparado. Para encerrar uma conta, informe o mês de fim.

**Pendência.** A conta do mês que chega ao vencimento sem ser lançada vira pendência só para as pessoas do Financeiro da lista de sigilo (sem ninguém, o dono e a Diretoria da lista), só com a contagem, sem descrição nem valor. Lançamentos e baixas mostra no topo quantas contas fixas estão para lançar.

**Agenda e previsão.** As contas fixas ainda não lançadas entram no Gantt da Agenda financeira (grupo "Contas fixas a pagar ainda não lançadas no Omie") e na previsão de caixa de 90 dias, como saída no vencimento (as já vencidas, hoje), nas duas curvas e no relatório semanal. As de valor variável aparecem no Gantt sem valor e ficam fora da soma; a premissa diz quantas. Depois de lançada, a conta entra pela fotografia do Omie e não é contada duas vezes.

**Quem pode.** Ver: a lista de sigilo. Cadastrar, alterar, preparar, dispensar e marcar como já lançada: quem tem a caixa "Lançar, alterar e baixar títulos no Omie".

## 8l. Fechamento do mês (18/11/2026, Onda A, item A3)

**A lista.** A lista padrão recomendada tem seis itens: conciliação de todas as contas correntes; notas recebidas do mês lançadas; Caju fechado (viagens e Recarga Caju da rotina); provisões revistas; títulos vencidos revistos; relatório do mês para a Diretoria. Cada item tem quem faz (Financeiro, ou o dono e a Diretoria) e o prazo em dias úteis do mês seguinte (5, e 7 para o relatório). O dono e a Diretoria aprovam ou alteram a lista em "Aprovar ou alterar a lista", sempre com motivo; cada gravação é uma versão nova e vale para os checklists abertos depois dela. Enquanto ninguém grava, vale a lista padrão (versão 0).

**Abertura.** No primeiro dia útil do mês, dentro do expediente, a rotina do Financeiro abre o checklist do mês anterior. Cada item vira uma atividade sigilosa do Financeiro (restrita, módulo Financeiro) para a pessoa do Financeiro da lista de sigilo, com o prazo às 18:00 do dia útil do item. Na primeira rodada depois da publicação nada é aberto: o primeiro checklist automático é o do mês da publicação, aberto no mês seguinte. Meses anteriores (até três) são abertos à mão em "Abrir o checklist de".

**Marcar.** "Marcar como feito" registra o nome, a data e a hora do servidor e a observação, e conclui a atividade. "Desfazer a marcação" (quem marcou ou a Diretoria) pede o motivo e devolve a atividade para "A fazer". Dispensar um item, reabrir um mês fechado e alterar a lista são só do dono e da Diretoria, com motivo (segue a regra de aprovação do Painel). O mês fica fechado quando todos os itens estão feitos ou dispensados; reaberto, fecha de novo quando tudo estiver resolvido. Nenhum valor é gravado e nada vai ao Omie.

## 8m. Trilha das operações, estorno de baixa e exclusão de título (18/11/2026, Onda A, item A4)

**Trilha.** Toda gravação que o SGO+ faz no Omie (lançamento, alteração, baixa, estorno, exclusão, boleto, cadastro de cliente ou fornecedor, faturamento e importação de nota) vira uma linha que nunca é alterada nem apagada: quando, quem, de qual tela, a operação, o título, o documento, o valor, a data, a conta corrente, o código da baixa devolvido pelo Omie, o código de integração e o resultado (feito no Omie; recusado pelo Omie, nada feito; não executado por limite do Omie, nada feito; sem resposta, conferir no Omie). Leituras não entram. O que foi feito direto no Omie não aparece. A aba só abre para a lista de sigilo; a planilha CSV sai identificada e fica no registro de acessos.

**Estorno de baixa.** Na linha da baixa feita pelo SGO+, "Pedir estorno" mostra a prévia (lida no Omie, sem gravar): o título, a situação no Omie, a baixa a desfazer, quem fez, o código da baixa e o efeito (o valor volta a ficar em aberto e o movimento sai da conta corrente no Omie; o banco não é mexido). Quem pede (lista de sigilo com a caixa de lançar) escreve o motivo (15 letras ou mais) e envia. O pedido aparece em "Pedidos de estorno e exclusão" e na Caixa de decisões do dono e da Diretoria, sem valor no título. Por decisão do dono, só o dono do sistema e a Diretoria (o Charles) confirmam; quem pediu nunca confirma o próprio pedido. "Confirmar e fazer no Omie" confere de novo o título e chama CancelarRecebimento ou CancelarPagamento com o código da baixa; "Recusar" pede o motivo. Com APROVACAO_SO_DIRETORIA = NAO, outra pessoa da lista confirma. Quem pediu pode retirar o pedido enquanto aguarda. Baixa feita antes desta versão, ou direto no Omie, não tem o código e é estornada no próprio Omie.

**Exclusão de título.** Conta a pagar lançada pelo SGO+ por engano e ainda sem baixa: "Pedir exclusão", com o mesmo caminho (prévia, motivo, confirmação do dono ou da Diretoria, ExcluirContaPagar). Título com baixa é recusado: estorne a baixa antes. A exclusão de conta a receber ainda não é feita pelo SGO+, porque o método do Omie não foi confirmado: faça no Omie.

**Sem resposta do Omie.** Se o Omie não responder à confirmação, o pedido fica "sem resposta" e vira pendência para quem pediu e quem confirmou. Nada é reenviado sozinho: confira o título no Omie e registre "foi feito" ou "não foi feito". Se o Omie recusar, nada foi feito e o pedido é encerrado com o motivo do Omie.

## 8n. Aprovação de pagamentos (18/11/2026, Onda B, item B1)

**Decisão do dono (permanente).** Toda conta a pagar é aprovada pelo dono do sistema ou pelo Charles (Diretoria) antes de ser paga. O Financeiro (a Wanessa) monta e envia a lista; nunca aprova. Quem enviou um item não decide esse item. O campo "Aprovação de pagamentos: dispensa abaixo de (R$)", em Chaves e senhas > Regras do Financeiro, existe mas fica vazio: vazio quer dizer que nenhuma conta é dispensada.

**A lista do dia.** Na aba Aprovação de pagamentos, "A pagar até hoje" traz, lidas do Omie, as contas a pagar vencidas e as que vencem hoje, já marcadas. Para incluir as próximas, escolha "Também as que vencem em até 30 dias" e toque em Atualizar; elas aparecem desmarcadas. Confira, escreva uma observação para quem aprova (opcional) e toque em "Enviar para aprovação". O SGO+ confere cada título de novo no Omie (em aberto, sem pedido ativo, não adiado). Nada é pago nem gravado no Omie.

**Aprovar.** O dono e a Diretoria recebem o aviso no SGO+ e por e-mail, dentro do expediente (a lista enviada fora dele é avisada no início do próximo expediente), e a pendência na Caixa de decisões. O aviso não traz valor nem fornecedor: os detalhes ficam só no Painel. Em "Para a sua aprovação", "Aprovar todos" aprova de uma vez; para recusar ou adiar um item, use o botão do item e escreva o motivo (o adiamento pede a data). No topo do Painel, a faixa "pagamento(s) aguardando a sua aprovação" leva à lista.

**Pagar.** Aprovado, o item vai para "Aprovados: liberados para pagar". "Registrar a baixa" abre Lançamentos e baixas com a baixa do título. A prévia mostra quem aprovou e até que valor. A baixa acima do aprovado é recusada; baixa parcial deixa o restante liberado. Confirmada a baixa no Omie, o item vira "Pago". A baixa continua sem pagar no banco: o pagamento no banco é feito como sempre.

**Trava da baixa.** Sem aprovação, "Registrar baixa" de conta a pagar não prepara nada e diz por quê: "ainda não passou pela lista" (envie), "está aguardando aprovação desde ... (enviado por ...). Quem aprova: ..." (avise quem aprova se for urgente), "foi recusado" ou "foi adiado" (com quem, quando e o motivo). A lista de Lançamentos e baixas mostra a mesma situação em cada conta a pagar. A aprovação é conferida de novo na hora de confirmar.

**Retirar da lista.** Se o valor do boleto mudou ou a conta não será paga, "Retirar da lista" (com o motivo) tira o item; para pagar depois, envie de novo. Item com pagamento já registrado não sai.

## 8o. Orçamento anual (18/11/2026, Onda C, item C3)

**O SGO+ é a fonte.** O orçamento é cadastrado no SGO+ por categoria do plano de contas do Omie e por mês, com versão e motivo. A API do Omie só permite ler o orçamento (ListarOrcamentos); não há como gravar orçamento no Omie pelo SGO+. Para ter o mesmo orçamento no Omie, baixe a planilha da versão vigente e digite lá.

**Preparar (Financeiro).** Escolha o ano e o ponto de partida: em branco, cópia da versão vigente do ano anterior, realizado do ano anterior lido do Omie (os meses ainda não lidos ficam vazios e a tela diz quais) ou revisão da versão vigente do ano. Preencha a grade (vazio = sem orçamento no mês) e toque em "Gravar o rascunho": só as células mudadas são gravadas. "Incluir categoria" acrescenta uma linha (só categorias ativas de despesa ou receita do Omie). "Importar planilha" lê um CSV com uma linha por categoria (código; descrição opcional; janeiro a dezembro, separados por ponto e vírgula, com vírgula nos centavos); célula vazia mantém o valor do rascunho; código inexistente no Omie recusa a importação inteira.

**Aprovar (dono ou Diretoria).** Pronto o rascunho, escreva o motivo da versão e toque em "Enviar para aprovação". O dono e a Diretoria recebem o aviso (sem valores) e a pendência. Aprovar torna a versão vigente; a anterior fica como substituída. Recusar pede o motivo e mantém a vigente. Quem preparou não aprova. Versão enviada ou aprovada não muda: para revisar, crie uma versão nova a partir dela.

**Acompanhar.** Escolha o mês: "Ver" usa o realizado já guardado; "Ler o realizado deste mês no Omie" lê o mês de novo (só leitura). Cada categoria mostra o orçado, o realizado, o desvio em reais e em porcentagem e o acumulado do ano, que soma só os meses com realizado lido. Em destaque, despesa acima ou receita abaixo do orçado. Categoria com realizado no Omie e sem orçamento aparece como "sem orçamento". A fotografia diária guarda sozinha o realizado do mês corrente.

**Indicadores e relatório semanal.** Com versão vigente, o indicador I15 (orçado × realizado) e o gráfico G7 usam o orçado do SGO+ (despesas) e o realizado do Omie; sem versão vigente, continuam com o previsto cadastrado no Omie, como antes. O relatório semanal ganhou a seção "Orçamento: orçado × realizado", logo depois de Resultado, com os totais do mês, o desvio acumulado e os maiores desvios.

**A confirmar na primeira leitura acompanhada:** se o "realizado" do Omie (nValorRealilzado) é só o que já foi pago ou inclui o que está a pagar, e se a lista traz categorias sem previsto no Omie.

## 8p. Parcelamento e lançamento avulso na conta corrente (18/11/2026, pendências da onda 1)

**Parcelamento.** Em Lançamentos e baixas > Novo lançamento, informe "Parcelas" (1 a 48) e o "Intervalo entre as parcelas" (mensal, no mesmo dia, ou a cada 7 a 30 dias). Com mais de uma parcela, o "Valor do documento" é o total e o "Vencimento" é o da 1ª parcela; o SGO+ divide em partes iguais e o centavo que sobra vai na última. A prévia mostra cada parcela (001/003, 002/003...) com vencimento, valor e referência (a referência informada com -1, -2...). O envio é uma parcela por vez. Se o Omie recusar ou estiver ocupado no meio, as parcelas já lançadas não são repetidas: em "Envios a conferir no Omie", "Continuar as parcelas" segue da que falhou (por até 24 horas) e "Encerrar sem as que faltam" fecha o lançamento (com o que você fez). Se o Omie não responder, confira a parcela no Omie e registre "foi feito" ou "não foi feito"; depois continue. A alçada vale pelo total. Lançamento de pedido aprovado e de conta fixa não é parcelado por aqui.

**Lançamento avulso na conta corrente.** Para registrar no Omie o que o banco já fez e não tem título: tarifa, juros ou IOF (saída, em categoria de despesa), rendimento, aporte ou devolução (entrada, em categoria de receita) e transferência entre contas da própria empresa (conta de destino; categoria vazia ou de transferência). Em Lançamentos e baixas, toque em "Lançamento avulso na conta", preencha, confira a prévia e confirme. Não passa pela aprovação de pagamentos, porque não paga conta a pagar. Entra na trilha como "Lançamento avulso na conta corrente". **A confirmar na primeira operação acompanhada:** o SGO+ envia o valor sempre positivo e o Omie decide saída ou entrada pela categoria; na transferência, se o Omie cria sozinho a entrada na conta de destino. Depois do primeiro envio, confira o extrato da conta no Omie.

## 8q. Compras e Caju no Omie (18/11/2026, Onda B, itens B2, B3 e B4)

**Decisão do dono.** O SGO+ é o registro principal e o Omie é o espelho, gravado pela API. A compra conferida, a fatura do cartão fechada e a carga paga ao Caju viram conta a pagar no Omie sem digitar de novo. Criar a conta a pagar não é aprovar gasto: o gasto já foi aprovado no módulo de origem. O pagamento continua passando pela Aprovação de pagamentos (seção 8n): só o dono e a Diretoria aprovam. Nenhuma alçada nova foi criada.

**O que aparece.** A aba Compras e Caju no Omie começa no mês da primeira abertura (o que é anterior foi lançado como antes, à mão) e mostra:

- **Compras faturadas e por boleto** conferidas pelo Financeiro em Compras > Conferência do Financeiro, um item por vencimento (referência CMP-<requisição>-<parcela>). A compra ainda não conferida, ou com a conferência divergente, fica em "Aguardando a origem", com o que falta. A compra no cartão de crédito entra pela fatura; a compra paga na hora (PIX, débito, transferência, dinheiro) e o reembolso a colaborador não entram por aqui (veja "O que ficou para depois").
- **Faturas dos cartões da empresa** fechadas em Compras > Conciliação das faturas (também as fechadas com ressalva), pelo total do extrato, já com os estornos (referência FAT-<final>-<AAAAMM>). O vencimento é o dia cadastrado no cartão; sem ele, a tela pede o vencimento.
- **Cargas do Caju**: as cargas de viagem do Depósito de viagem e as da Recarga Caju da rotina, feitas pela API do Caju ou registradas à mão (referências CJU-V-<carga> e CJU-R-<carga>). Quando o Caju cobrou taxa de serviço, a taxa é um item separado (referência terminada em -TX), para ir na sua própria categoria. A viagem (número, destino, colaborador e centro de custo) ou a recarga (número, período e colaborador) vai na observação do título.

**Lançar.** "Preparar lançamento" abre Lançamentos e baixas com o novo lançamento preenchido: documento (a nota, quando houver), valor, vencimento, observação e a referência única. O fornecedor vem pela busca do Omie com o CNPJ do fornecedor de Compras; se não estiver no Omie, "Cadastrar no Omie" faz o cadastro com prévia. Depois do primeiro lançamento, o SGO+ lembra o fornecedor do mesmo CNPJ, o emissor do mesmo cartão e o Caju. A categoria vem do de-para das Regras do Financeiro (tipos por finalidade da compra, fatura do cartão, carga de viagem, carga da recarga e taxa do Caju); sem regra, a categoria fica vazia e você escolhe. Escolha a conta corrente, confira a prévia (ela mostra a origem no SGO+ e avisa se o valor digitado for diferente) e confirme. Confirmado no Omie, o item vai para "Lançados no Omie". A mesma referência não é lançada duas vezes, nem pela aba nem digitada no novo lançamento, e o item não é parcelado por aqui.

**Pagar.** A conta a pagar lançada aparece na Aprovação de pagamentos como qualquer outra. Aprovada e com a baixa registrada pelo SGO+, o item fica "Pago"; na compra, o vencimento passa a pago em Compras > A pagar sozinho (só a data e quem pagou; o resto da compra não muda). Compra e carga do Caju que já estavam pagas antes do lançamento também passam pela lista: a prévia avisa e a baixa vai com a data do pagamento.

**Já lançado ou fora do Omie.** "Já lancei direto no Omie" (o que foi conferido, pelo menos 10 letras, e o número do título, se souber) e "Dispensar" (por que não vai ao Omie, pelo menos 15 letras) tiram o item de "Para lançar" e podem ser desfeitos com o motivo. Item lançado pelo SGO+ não se desfaz por aqui: para apagar o título, peça a exclusão na Trilha das operações.

**Conferir com o Omie (B4).** O botão lê no Omie, sem gravar, até 20 títulos lançados por toque e compara valor e situação. "Diferenças com o Omie" mostra, com o que fazer: valor diferente no Omie, título cancelado ou não encontrado no Omie, fatura reaberta em Compras depois do lançamento, valor mudado na origem, vencimento cancelado em Compras depois do lançamento e compra paga em Compras > A pagar sem a baixa no Omie. Título pago direto no Omie fica registrado como pago, sem mexer em Compras. A conferência fica no registro de acessos, sem valores.

**Centro de custo.** A estrutura de centros de custo e o rateio ainda não foram decididos (dependem do contador). Por isso, o padrão é não enviar departamento ao Omie: o centro de custo vai escrito na observação. Em Chaves e senhas > Regras do Financeiro, "Compras e Caju no Omie: centro de custo como departamento" pode ser ligado depois; aí a carga de viagem vai com o departamento igual ao "Código no Omie" do centro de custo (100%). A Recarga Caju da rotina não tem centro de custo.

**Pendências e faixa.** O item que chega ao vencimento sem estar no Omie e as diferenças com o Omie viram pendências só para o Financeiro da lista de sigilo, com a contagem e sem valor nem descrição. Em Lançamentos e baixas, uma faixa mostra quantos itens estão para lançar e o atalho para a aba.

**A confirmar na primeira operação acompanhada:** o formato do departamento no Omie (distribuição com o código e 100%), quando for ligado; se a conta a pagar de carga já paga ao Caju com o saldo da conta Caju deve ter a baixa na conta corrente do Caju no Omie (combinar com o contador); e o fornecedor do Omie a usar para cada cartão (o banco ou o emissor).

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
| Régua ou Agenda: "a lista de títulos da fotografia não está mais na memória do servidor" | Toque em "Pedir nova fotografia" e volte em até 15 minutos; nada é gravado no Omie. |
| Régua: "Este título não está na fotografia" | O título pode ter sido pago, cancelado ou criado depois da fotografia. Atualize o quadro; se faltar, peça nova fotografia em Indicadores. |
| Régua: "Você não registra esta decisão" | Protesto, negativação, cobrança jurídica e perda são só da Diretoria. Encaminhe o título à Diretoria com o motivo. |
| Relatório com "análise parcialmente substituída pelo texto padrão" | É a conferência de números: o parágrafo da IA citou número ou nome fora dos dados e foi trocado pelo texto do sistema. Nada a fazer. |
| O relatório semanal não saiu na segunda-feira | Ele espera a fotografia do dia (até 10:00); feriado passa para o primeiro dia útil. A aba Relatórios semanais mostra o próximo horário. |
| Especialista: "Foram retirados ... trecho(s) da resposta" | É a conferência de números: a parte com número que o sistema não calculou foi retirada. O restante vale como apoio; confira os números nos quadros. |
| Especialista responde a análise com o texto padrão do sistema | A IA está desligada para dados da empresa, a chave não está cadastrada, o limite de 15 análises do dia foi atingido ou a IA não respondeu. A faixa no topo da aba e o aviso da resposta dizem qual foi. |
| "A proposta expirou (ela vale 30 minutos) ou já foi usada" | Nada foi criado. Faça a pergunta de novo e confirme a nova proposta em até 30 minutos. |
| "proposta(s) da IA foram descartadas pelo sistema" | O responsável estava fora da lista de sigilo, o prazo fora de 1 a 30 dias úteis, a aba não existe ou havia número fora dos dados. Se a atividade for necessária, crie pelo módulo de Atividades. |
| Contas fixas: "já foi lançada (título … no Omie)" | A conta daquele mês já está no Omie. Nada foi preparado. Se foi engano, peça a exclusão do título na Trilha das operações. |
| Trilha: "Esta baixa não tem o código da baixa do Omie" | Baixa feita antes da trilha ou sem o código devolvido pelo Omie. Estorne direto no Omie. |
| Trilha: "Você não confirma nem recusa estorno ou exclusão no Omie" | Só o dono e a Diretoria confirmam. Acompanhe o pedido em "Pedidos de estorno e exclusão". |
| Trilha: "O Omie não confirmou o envio" ao confirmar um pedido | Pode ter sido feito. Confira o título no Omie e registre "foi feito" ou "não foi feito" no pedido. |
| Fechamento: "Por decisão do dono, só o dono do sistema e a Diretoria ... dispensam item" | Marque o que foi feito e peça à Diretoria a dispensa do item que não se aplica, com o motivo. |
| Fechamento: "O mês já está fechado" | A Diretoria reabre o mês com o motivo; depois, desfaça a marcação do item a refazer. |
| Baixa de conta a pagar: "ainda não passou pela lista de aprovação" | Envie o título em Aprovação de pagamentos; aprovado, registre a baixa. |
| Baixa de conta a pagar: "está aguardando aprovação desde ..." | A mensagem diz quem aprova. Se for urgente, avise o dono ou a Diretoria; nada foi preparado. |
| Baixa de conta a pagar: "passa do valor aprovado" | O valor mudou depois da aprovação. Retire o título da lista com o motivo e envie de novo. |
| Aprovação de pagamentos: "Você não aprova pagamentos" | Só o dono e a Diretoria aprovam. O Financeiro envia e acompanha. |
| Orçamento: importação "categorias não existem no Omie" | Corrija os códigos na planilha (use "Carregar categorias" para ver os válidos) e importe de novo; nada foi importado. |
| Orçamento: "Já existe uma versão em preparação" | Continue na versão em preparação, descarte o rascunho ou, se estiver aguardando, retire-o da aprovação. |
| Parcelado: "Já lançadas no Omie: 1 de 3 parcelas" | As lançadas não se repetem. Em Envios a conferir, "Continuar as parcelas" ou, se lançou o restante direto no Omie, "Encerrar sem as que faltam". |
| Compras e Caju no Omie: a compra conferida não aparece | Só entram compras faturadas ou por boleto, conferidas, com vencimento a partir do mês de início. Veja "Aguardando a origem": a coluna "O que falta" diz o que fazer. Compra no cartão entra pela fatura. |
| "A referência ... já foi lançada no Omie" | O item já tem conta a pagar no Omie. Nada foi preparado. Se o título foi excluído no Omie, desfaça o registro com o motivo e lance de novo. |
| Diferenças com o Omie: "Paga em Compras > A pagar ..., mas a baixa no Omie ainda não foi registrada" | Inclua o título na Aprovação de pagamentos e registre a baixa com a data do pagamento; se já foi baixado direto no Omie, toque em "Conferir com o Omie". |
| Lançamento avulso: "não é de despesa" ou "não é de receita" | Saída usa categoria de despesa; entrada, de receita; transferência, vazia ou de transferência. |

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
8. Contas fixas para lançar aparecem numa faixa no topo, com o atalho para a aba Contas fixas. Para estornar uma baixa ou excluir um título lançado por engano, use a aba Trilha das operações: o pedido vai ao dono ou à Diretoria.
9. Parcelado: em "Novo lançamento", informe as parcelas e o intervalo; o valor do documento é o total. A prévia mostra cada parcela; o envio é uma parcela por vez e, se parar no meio, "Envios a conferir" mostra de onde continuar.
10. Conta a pagar: a baixa só é preparada depois da aprovação do dono ou da Diretoria na aba Aprovação de pagamentos. A lista mostra, em cada título, se está aguardando (de quem e desde quando), aprovado ou recusado.
11. Tarifa, rendimento ou transferência entre contas (movimento sem título): toque em "Lançamento avulso na conta", confira a prévia e confirme.

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

**Contas fixas.** Cadastrar as despesas que se repetem todo mês e lançar a conta de cada mês no Omie sem digitar tudo de novo.

1. A lista começa vazia. Em "Cadastro das contas fixas", toque em "Nova conta fixa" e preencha a descrição, o fornecedor do Omie, a categoria de despesa, a conta corrente, o dia, o valor (fixo ou "valor varia") e o mês de início.
2. Alguns dias antes de cada vencimento, a conta do mês aparece em "Para lançar". Toque em "Preparar lançamento": a aba Lançamentos e baixas abre com o novo lançamento preenchido.
3. Confira os campos (com valor variável, digite o valor do mês), toque em "Conferir prévia" e depois em "Confirmar no Omie". Nada vai ao Omie sem essa confirmação; confirmado, o mês sai de "Para lançar" sozinho.
4. Se a conta já foi lançada direto no Omie, toque em "Já lancei direto no Omie"; se não será paga neste mês, em "Dispensar este mês". As duas pedem o motivo e podem ser desfeitas.
5. A conta que chega ao vencimento sem ser lançada vira pendência para o Financeiro da lista de sigilo. As contas ainda não lançadas aparecem na Agenda financeira e entram na previsão de caixa (as de valor variável, sem valor).

**Fechamento do mês.** Fechar o mês com um checklist: o que precisa estar feito, quem fez e quando.

1. O checklist do mês abre sozinho no primeiro dia útil do mês seguinte, e cada item vira uma atividade sigilosa do Financeiro com prazo. Para começar antes, escolha o mês em "Abrir o checklist de" e toque em "Abrir o checklist".
2. Feito um item, toque em "Marcar como feito" e escreva, se quiser, uma observação. Fica registrado quem fez e quando, e a atividade é concluída junto. "Desfazer a marcação" pede o motivo.
3. Item que não se aplica no mês só é dispensado pelo dono ou pela Diretoria, com o motivo. O mês fica fechado quando todos os itens estão feitos ou dispensados; reabrir também é da Diretoria, com o motivo.
4. A lista é aprovada e alterada pelo dono e pela Diretoria em "Aprovar ou alterar a lista". Cada gravação é uma versão nova e vale para os checklists abertos depois dela.

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

**Régua de cobrança.** Acompanhar a cobrança de cada título a receber vencido ou a vencer, registrar o que foi feito e ver o que precisa de ação hoje.

1. Cada coluna é uma etapa: a vencer, vencido sem contato, em contato, promessa, promessa quebrada, acordo, com a Diretoria e recebido nos últimos 7 dias. O sistema põe o cartão na coluna certa: ninguém arrasta.
2. Comece pelas colunas "Promessa quebrada" e "Vencido sem contato" (borda vermelha). Cartão com contorno amarelo tem retorno marcado para hoje.
3. Toque no cartão: abre o painel do título com o histórico, os atalhos (Ficha do cliente, segunda via ou prorrogação do boleto) e o formulário.
4. Escolha a ação, preencha os campos que aparecem e toque em "Registrar a ação". O cartão muda de etapa na hora. Para protesto, negativação, cobrança jurídica ou perda, use "Encaminhar à Diretoria" com o motivo: só a Diretoria decide.
5. A régua não manda nada ao cliente e não grava no Omie: segunda via, prorrogação e baixa continuam nas abas Cobranças e Lançamentos e baixas, com a prévia.

**Agenda financeira.** Ver o que vence a receber e a pagar nos próximos dias e onde o caixa aperta nos próximos 90 dias.

1. Escolha o período do quadro (30, 60 ou 90 dias). Cada linha é um cliente, uma categoria de despesa, as provisões ou os prazos de viagem.
2. Losango cheio é vencido; vazado, a vencer. Barra amarela é promessa de pagamento; roxa, acordo. Toque num item para ver documento, valor e situação logo abaixo do quadro.
3. Na previsão de caixa, a linha azul conta tudo o que vence (otimista) e a laranja o que costuma entrar de fato (realista). A faixa do topo diz se e quando o saldo cai abaixo do mínimo ou fica negativo.
4. Abra "Como a previsão é feita" para ver as taxas usadas. O saldo mínimo de segurança muda em Chaves e senhas > Regras do Financeiro (sem ele, a previsão não compara com mínimo).

**Relatórios semanais.** Ler o relatório semanal de saúde financeira em A4 e ver quem foi avisado.

1. A lista mostra cada semana com a nota, a variação, se a análise teve apoio de IA e quem recebeu o aviso. O relatório da semana fechada sai sozinho, no dia e na hora configurados.
2. Toque em "Abrir": o relatório aparece abaixo, com a sua identificação e um código em cada página. A abertura fica registrada em Sigilo e acessos.
3. "Imprimir ou salvar em PDF" imprime essa cópia identificada. Não repasse o arquivo: o código mostra de quem é a cópia.
4. "Gerar agora" monta o relatório da semana em curso, marcado como parcial, sem avisar ninguém. A configuração (dia, hora, quem recebe, IA) muda em Chaves e senhas > Regras do Financeiro.

**Recarga Caju.** Acompanhar a recarga Caju da rotina dos técnicos: decidir os pedidos, fazer a carga, conferir os comprovantes gasto a gasto, concluir o período e registrar a devolução do que sobrou.

1. Em "Pedidos e cargas", cada pedido mostra a justificativa e a situação do portador (gastos a comprovar, saldo, travas). Só o dono e a Diretoria aprovam; quem pediu nunca decide o próprio pedido.
2. Aprovado, quem tem a caixa da carga faz a carga pelo Caju (modo API) ou registra a carga feita no portal, com o comprovante. A carga nunca passa do aprovado, e quem aprovou não carrega se outra pessoa da lista puder.
3. Em "Prestações", aceite ou glose cada gasto (a glosa pede o motivo). Fechado o período pelo portador, ou vencido o prazo dele, toque em "Concluir o período" e registre a devolução ou o reembolso com o comprovante.
4. Divergências do extrato (gasto sem comprovante, valor diferente, fora da política) aparecem em "Divergências" e na Conciliação Caju. Portador travado: a Diretoria decide a liberação em "Portadores".
5. "Política" guarda as regras com versão e motivo; "Painel" mostra os índices, os gráficos e o quadro; "Relatórios A4" gera o individual (com o extrato), o geral e o de pendências.

**Especialista financeiro.** Tirar dúvidas de uso do Painel e de regras financeiras e pedir uma leitura da situação do Financeiro de hoje, com sugestões de ação.

1. Escreva a pergunta ou toque numa sugestão. Em "Tipo de ajuda", deixe "Automático" ou escolha: "Como fazer" (manual do SGO+), "Regra financeira" (base de regras da empresa) ou "Analisar a situação" (fotografia do dia).
2. Na análise, os clientes vão ao serviço de IA como códigos e cada número da resposta é conferido com os do sistema; o que não bater é retirado e a resposta avisa. Confira os números nos quadros antes de decidir.
3. Abaixo de cada resposta aparecem as fontes, o aviso quando o assunto é do contador ou do jurídico e os botões "Resolveu" e "Não resolveu".
4. Proposta de atividade: confira o título, a descrição, o responsável (só da lista de sigilo), o prazo e a prioridade e toque em "Criar atividade". Sem esse toque nada é criado; a proposta vale 30 minutos.
5. O especialista não grava nada no Omie, não aprova nada e não envia mensagem a ninguém. A conversa some ao sair do Painel. A "Base de regras financeiras", no fim da aba, mostra as regras usadas; só o dono e a Diretoria as alteram.

**Trilha das operações.** Ver toda gravação que o SGO+ fez no Omie e pedir o estorno de uma baixa ou a exclusão de um título lançado por engano.

1. Cada linha é uma gravação: quando, quem, de qual tela, a operação, o título, o valor, o resultado (feito, recusado, não executado ou sem resposta) e os códigos do Omie. Use os filtros e toque em Consultar; "Baixar planilha (CSV)" sai identificada com o seu nome.
2. Para desfazer uma baixa feita pelo SGO+, toque em "Pedir estorno" na linha da baixa; para apagar uma conta a pagar lançada por engano (sem baixa), em "Pedir exclusão". Leia a prévia, escreva o motivo e envie o pedido.
3. O pedido não muda nada no Omie. O dono do sistema ou a Diretoria lê a prévia e o motivo em "Pedidos de estorno e exclusão" e toca em "Confirmar e fazer no Omie" (o SGO+ faz na hora) ou em "Recusar". Quem pediu não confirma o próprio pedido; enquanto aguarda, pode retirá-lo.
4. Se o Omie não responder à confirmação, o pedido fica "sem resposta": confira o título no Omie e registre "foi feito" ou "não foi feito". Baixa feita antes desta versão ou direto no Omie não tem o código e é estornada no próprio Omie.

**Aprovação de pagamentos.** Aprovar, antes da baixa, as contas a pagar do dia: o Financeiro monta e envia a lista; o dono ou a Diretoria aprova num toque.

1. Financeiro: em "A pagar até hoje", as contas vencidas e as que vencem hoje já vêm marcadas. Para incluir as próximas, escolha "Também as que vencem em até 30 dias" e toque em Atualizar. Confira e toque em "Enviar para aprovação".
2. O pedido não paga nada nem grava no Omie. Enquanto aguarda, a lista mostra quem aprova e desde quando; a baixa desses títulos fica travada em Lançamentos e baixas, com o mesmo aviso.
3. Dono ou Diretoria: em "Para a sua aprovação", confira os itens e toque em "Aprovar todos". Para recusar ou adiar um item, use o botão do item e escreva o motivo; o restante continua para o "Aprovar todos". Quem enviou não decide.
4. Aprovado: em "Aprovados: liberados para pagar", "Registrar a baixa" abre Lançamentos e baixas com a baixa do título; confira a prévia e confirme no Omie. A baixa não paga no banco: pague pelo banco como sempre e registre aqui.
5. Valor da conta mudou depois da aprovação: retire o título da lista (com o motivo) e envie de novo. Recusado ou adiado: a lista diz por quem e por quê.

**Orçamento anual.** Preparar o orçamento do ano por categoria e mês, com versão e aprovação, e acompanhar o orçado contra o realizado do Omie.

1. Escolha o ano e toque em "Abrir o ano". Sem versão em preparação, escolha o ponto de partida (em branco, cópia do ano anterior, realizado do ano anterior ou revisão da vigente) e toque em "Criar rascunho".
2. Na grade, digite o valor de cada categoria em cada mês e toque em "Gravar o rascunho" (só as células mudadas são gravadas). "Incluir categoria" acrescenta uma linha; "Importar planilha" preenche a partir de um CSV.
3. Pronto, escreva o motivo e toque em "Enviar para aprovação". O dono ou a Diretoria aprova a versão vigente ou recusa com o motivo; quem preparou não aprova. Para ajustar uma versão enviada, "Retirar da aprovação".
4. No acompanhamento, escolha o mês e toque em "Ver"; para atualizar o realizado do mês, "Ler o realizado deste mês no Omie" (só leitura). O desvio em destaque é despesa acima ou receita abaixo do orçado.
5. O Omie não recebe orçamento pela API: o SGO+ é a fonte. Para ter o mesmo orçamento no Omie, baixe a planilha da versão vigente e digite lá.

**Compras e Caju no Omie.** Levar ao Omie, sem digitar de novo, as compras faturadas e por boleto, as faturas dos cartões da empresa e as cargas pagas ao Caju, e conferir o que foi lançado.

1. A lista começa no mês da primeira abertura. Em "Para lançar" aparecem: as compras faturadas e por boleto já conferidas em Compras (um item por vencimento), as faturas dos cartões fechadas na conciliação e as cargas do Caju creditadas ou registradas, com a taxa de serviço como item separado.
2. Toque em "Preparar lançamento": a aba Lançamentos e baixas abre com a conta a pagar preenchida (documento, valor, vencimento, observação e a referência única). O fornecedor vem pela busca do CNPJ; se não estiver no Omie, use "Cadastrar no Omie". A categoria vem do de-para das Regras do Financeiro, se houver regra; senão, escolha.
3. Escolha a conta corrente, toque em "Conferir prévia" e depois em "Confirmar no Omie". Confirmado, o item passa para "Lançados no Omie". O pagamento segue a Aprovação de pagamentos; quitada a baixa de uma compra, o vencimento fica pago em Compras > A pagar sozinho.
4. Se o item já está no Omie, toque em "Já lancei direto no Omie"; se não vai ao Omie, em "Dispensar". Os dois pedem o motivo e podem ser desfeitos. "Aguardando a origem" diz o que falta no módulo de origem (por exemplo, a conferência da compra).
5. "Conferir com o Omie" lê no Omie os títulos lançados e compara valor e situação. "Diferenças com o Omie" lista o que não bate (valor mudado, fatura reaberta, compra paga sem baixa no Omie, título cancelado) e diz o que fazer.

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

- **Parcelas:** em quantas vezes o documento será pago ou recebido (1 a 48). Com mais de uma, o "Valor do documento" é o total: o SGO+ divide em partes iguais (o centavo que sobra vai na última) e o "Vencimento" é o da 1ª parcela.
- **Intervalo entre as parcelas:** mensal (mesmo dia de cada mês; em mês mais curto, o último dia) ou a cada tantos dias. A prévia mostra o vencimento e o valor de cada parcela antes do envio.

### Lançamento avulso na conta corrente

- **Tipo do lançamento:** saída (tarifa bancária, juros, IOF), entrada (rendimento, aporte, devolução) ou transferência entre contas da própria empresa. Pagamento a fornecedor e recebimento de cliente não entram aqui: são baixas de títulos.
- **Conta corrente:** o banco ou o caixa em que o movimento aconteceu (na transferência, a conta de onde o dinheiro saiu). Confira no extrato.
- **Conta de destino:** na transferência, a conta da empresa que recebeu o dinheiro. Precisa ser diferente da conta de origem.
- **Data:** o dia do movimento no extrato do banco.
- **Valor (R$):** o valor do movimento, sempre positivo. O sentido (saída ou entrada) vem do tipo e da categoria; na primeira operação acompanhada, confira no extrato do Omie.
- **Categoria:** na saída, uma categoria de despesa (ex.: tarifas bancárias); na entrada, uma de receita (ex.: rendimentos de aplicação). Na transferência, deixe vazia ou escolha a de transferência.
- **Tipo de documento:** como o movimento aparece no banco (débito, crédito, TED, transferência). Vazio usa o mais comum para o tipo do lançamento.
- **Número do documento (opcional):** o número que aparece no extrato ou no comprovante, para achar o lançamento depois.
- **Referência única:** um código deste lançamento (já vem sugerido; até 20 caracteres). Impede que o mesmo lançamento seja enviado duas vezes.
- **Observação:** o que explica o movimento (ex.: "tarifa do pacote de serviços de novembro"). Vai junto para o Omie.

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

### Régua de cobrança

- **Buscar no quadro:** digite parte do nome do cliente ou do número do documento para ver só esses cartões. Não consulta o Omie; filtra o que já está na tela.
- **Ação:** o que foi feito agora. "Contato feito" é uma conversa com o cliente; "Lembrete enviado" é e-mail ou mensagem sem resposta; "Promessa" é quando o cliente disse data e valor; "Acordo" é nova condição combinada; "Encaminhar à Diretoria" é para protesto, negativação, cobrança jurídica ou perda.
- **Canal:** por onde o contato foi feito (telefone, e-mail, WhatsApp da empresa, presencial). Serve para saber o que funciona com cada cliente.
- **Com quem falou:** nome e cargo de quem atendeu no cliente (ex.: Ana, contas a pagar). Ajuda o próximo contato a ir direto à pessoa certa.
- **Data prometida:** o dia em que o cliente disse que vai pagar. Se passar 2 dias úteis sem o pagamento aparecer no Omie, o cartão vai sozinho para "Promessa quebrada". No acordo, é a data da primeira parcela combinada.
- **Valor prometido:** quanto o cliente disse que vai pagar nessa data. Em branco, vale o saldo em aberto. Valor menor indica pagamento parcial.
- **Próxima ação em:** quando você quer ser lembrada de voltar a este título. O lembrete aparece em Minhas pendências nesse dia, no expediente.
- **Observação:** o que ajuda quem pegar a cobrança depois (ex.: "aguardando empenho", "pediu segunda via do boleto"). No acordo, descreva as parcelas combinadas. Não escreva dados bancários nem senhas.
- **Motivo para a Diretoria:** por que este título precisa de decisão da Diretoria (ex.: 120 dias de atraso, três promessas quebradas). Obrigatório, pelo menos 15 letras.
- **Decisão:** só o dono do sistema e a Diretoria decidem. Protestar, negativar, cobrança jurídica ou baixar como perda são executados depois pelo Financeiro (a baixa como perda, em Lançamentos e baixas, com a prévia). "Voltar para a cobrança normal" devolve o título à régua.
- **Motivo da decisão:** por que a Diretoria decidiu assim. Obrigatório, pelo menos 15 letras; fica no histórico do título.

### Agenda financeira

- **Período do quadro:** quantos dias à frente o quadro mostra (30, 60 ou 90). A semana anterior aparece sempre, para os vencidos recentes. A previsão de caixa abaixo é sempre de 90 dias.

### Especialista financeiro

- **Sua pergunta:** escreva como falaria com um colega do Financeiro (ex.: "quais clientes estão atrasando mais que o normal?"). Não cole senhas, dados de cartão nem dados de conta bancária. Até 600 letras.
- **Tipo de ajuda:** "Como fazer" responde pelo manual do SGO+, sem usar dados da empresa; "Regra financeira" explica conceitos a partir da base de regras da empresa; "Analisar a situação" usa a fotografia do Financeiro de hoje (sem nomes de clientes) para apontar riscos e sugerir ações. Em "Automático", o sistema escolhe.
- **Usar os dados de hoje:** marcado, a análise envia ao serviço de IA os indicadores e as listas da fotografia, com clientes trocados por códigos (Cliente 01, Cliente 02). Desmarcado, a resposta usa só o manual e a base de regras.
- **Título:** o que precisa ser feito, em uma frase (ex.: "Ligar para o Cliente 03 sobre a NF 1234 vencida há 45 dias"). Os códigos de cliente já aparecem trocados pelo nome real aqui na sua tela.
- **Descrição:** o porquê e o como. Veio da análise; ajuste o que não fizer sentido antes de criar.
- **Responsável:** quem vai fazer. Só aparecem pessoas da lista de sigilo do Financeiro, porque a atividade fala de valores e clientes.
- **Prazo:** data e hora em que deve estar feita. A sugestão considera dia útil e o expediente.
- **Prioridade:** Baixa, Normal, Alta ou Urgente. A sugestão sobe para Alta quando o valor está entre os 3 maiores vencidos ou o atraso passa de 60 dias.
- **Criar atividade:** só cria depois deste toque. A atividade fica no módulo de Atividades, marcada como sigilosa do Financeiro.
- **Base de regras financeiras** (só o dono do sistema e a Diretoria alteram):
  - **Título da regra:** o assunto, em poucas palavras (ex.: "Juros, multa e desconto na baixa"). Aparece como fonte nas respostas.
  - **Texto da regra:** como a empresa trata o assunto, em texto corrido (20 a 3.000 letras). O especialista responde a partir deste texto; não escreva valores que não sejam regra da empresa.
  - **Confirmar com:** escolha o contador (impostos, contabilidade, folha) ou o jurídico (protesto, negativação, cobrança judicial) quando a decisão depender deles. A resposta que usar esta regra leva o aviso.
  - **Motivo da mudança:** o que mudou e por quê (pelo menos 15 letras). A versão anterior fica guardada.
  - **Texto revisado com a contabilidade:** marque só quando o contador tiver lido e aprovado esta versão. Sem a marca, as respostas avisam que a base é o texto padrão.

### Contas fixas

- **Descrição:** o nome da conta como a equipe a conhece (ex.: "Aluguel da sede", "Internet do escritório"). Aparece em "Para lançar", na Agenda financeira e na observação do título no Omie.
- **Fornecedor no Omie:** a quem a conta é paga. Digite o CNPJ (ou CPF) ou parte do nome, toque em Buscar e depois em "Usar este". Se ele não estiver no Omie, use "Cadastrar no Omie".
- **Categoria de despesa:** em que linha do plano de contas do Omie a conta entra (ex.: aluguel, telefonia e internet, softwares). Só aparecem categorias de despesa; a prévia de cada mês confere de novo no Omie.
- **Conta corrente:** o banco de onde a conta costuma ser paga. Vai preenchida no lançamento; dá para trocar na hora.
- **Dia do vencimento:** de 1 a 31. Em mês mais curto vale o último dia do mês (dia 31 em fevereiro vira 28 ou 29). Se cair em fim de semana ou feriado, ajuste a data no lançamento.
- **Valor:** "Valor fixo" quando a conta é sempre igual (ex.: aluguel); "Valor varia — confirmar no mês" quando muda com a fatura (ex.: energia). Com valor variável, o lançamento abre sem valor e a previsão de caixa não soma a conta até ela ser lançada.
- **Valor fixo (R$):** o valor de cada mês, com vírgula nos centavos (ex.: 1.250,00). Uma alteração vale para os meses ainda não preparados.
- **Início (mês):** o primeiro mês em que a conta é preparada para lançar.
- **Fim (mês, se houver):** o último mês da conta (ex.: fim do contrato). Deixe vazio se não há fim previsto. Para encerrar uma conta, altere e informe o fim.
- **Observação:** o que ajuda no lançamento (ex.: número do contrato, forma de pagamento). Vai junto na observação do título no Omie.
- **Motivo da alteração:** o que mudou e por quê (pelo menos 15 letras, ex.: "reajuste anual do aluguel"). Fica no histórico com o antes e o depois.
- **Motivo:** em "Dispensar este mês", por que a conta não será paga neste mês (pelo menos 15 letras); em "Já lancei direto no Omie", o que você conferiu no Omie, como a data e o documento (pelo menos 10 letras); em "Desfazer", por que está desfazendo. Fica registrado com o seu nome.

### Fechamento do mês

- **Mês:** o checklist mostrado abaixo. "Aberto" ainda tem item pendente; "fechado" teve todos os itens feitos ou dispensados.
- **Abrir o checklist de:** abre à mão o checklist de um mês que ainda não tem (o atual ou até 3 meses atrás), com as atividades do Financeiro. Normalmente ele abre sozinho no primeiro dia útil do mês seguinte.
- **Observação:** o que foi feito ou onde está a conferência (opcional, ex.: "conciliadas as 3 contas; tarifa lançada"). Fica com o seu nome, a data e a hora; a atividade é concluída junto.
- **Motivo:** ao desfazer, por que o item volta a pendente (pelo menos 10 letras); ao dispensar (só o dono e a Diretoria), por que o item não se aplica neste mês (pelo menos 15 letras).
- **Motivo da reabertura:** por que o mês fechado precisa ser reaberto (pelo menos 15 letras, ex.: "nota de outubro recebida depois do fechamento"). Só o dono e a Diretoria reabrem.
- **Título:** o que precisa estar feito, em poucas palavras (ex.: "Conciliação de todas as contas correntes"). Deixe vazio para retirar o item da lista.
- **Quem faz:** o Financeiro (a atividade vai para a pessoa do Financeiro da lista de sigilo) ou o dono e a Diretoria.
- **Prazo:** em qual dia útil do mês seguinte o item deve estar feito (de 1 a 15). Feriados cadastrados no expediente não contam.
- **Como conferir:** o que exatamente marca o item como feito. Vai na descrição da atividade.
- **Motivo:** por que a lista está sendo aprovada ou alterada (pelo menos 15 letras). Cada gravação é uma versão nova, com o seu nome.

### Trilha das operações

- **De e Até:** o período das gravações (pela data em que o SGO+ enviou ao Omie). Vazio mostra tudo.
- **Até:** o último dia do período.
- **Operação:** lançamento, alteração, baixa, estorno, exclusão, boleto, cadastro ou faturamento.
- **Resultado:** feito no Omie, recusado pelo Omie, não executado (Omie ocupado) ou sem resposta (conferir no Omie).
- **Buscar:** parte do nome de quem fez, do documento, do código do título ou dos códigos da baixa.
- **Motivo do pedido:** o que aconteceu e por que desfazer (pelo menos 15 letras, ex.: "baixa lançada no título errado; o pagamento era da NF 1234"). Quem confirma lê o motivo e a prévia acima.
- **Motivo da decisão:** opcional para confirmar; obrigatório para recusar (pelo menos 10 letras). Quem pediu lê o motivo.
- Por que está retirando o pedido (pelo menos 10 letras). Nada foi enviado ao Omie.
- **O que você conferiu no Omie (pelo menos 10 letras, ex.:** "a baixa não aparece mais no título"). "Foi feito" encerra sem repetir; "não foi feito" encerra e permite um pedido novo.

### Aprovação de pagamentos

- **Contas para a lista:** "Vencidas e de hoje" mostra as contas a pagar do Omie que vencem até hoje (já vêm marcadas); "Também as que vencem em até 30 dias" acrescenta as próximas, para você escolher o que entra na lista de hoje.
- **Observação para quem aprova:** o que ajuda a decidir (opcional, ex.: "fornecedor cobra multa a partir de amanhã"). Vale para todas as contas enviadas agora. Não escreva valores que já estão na lista.
- **Motivo (recusar ou adiar):** por que recusa ou adia este pagamento (pelo menos 10 letras, ex.: "aguardar a entrada do cliente X"). Quem enviou lê o motivo na lista e na trava da baixa.
- **Adiar para:** a partir de que dia o pagamento pode voltar para a lista. Até lá, a baixa fica travada e o título não pode ser enviado de novo.
- **Por que está retirando o título da lista:** pelo menos 10 letras, ex.: "fornecedor mandou boleto com outro valor". Para pagar depois, envie de novo para aprovação.

### Orçamento anual

- **Ano:** o ano do orçamento. A tela mostra a versão vigente (aprovada) e a que está em preparação.
- **Mês (acompanhamento):** "Ver" usa o realizado já guardado; "Ler o realizado deste mês no Omie" lê o mês de novo no Omie (só leitura, uma chamada).
- **Ponto de partida:** em branco; cópia da versão vigente do ano anterior; o realizado do ano anterior lido do Omie (os meses ainda não lidos ficam vazios e a tela diz quais); ou revisão da versão vigente deste ano.
- **Grade:** cada célula é o valor orçado da categoria no mês, em reais (ex.: 1.250,00). Vazio = sem orçamento naquele mês. Só as células alteradas são gravadas.
- **Incluir categoria:** uma categoria do plano de contas do Omie (despesa ou receita, ativa). Toque em "Carregar categorias", escolha e toque em "Incluir".
- **Arquivo da planilha:** CSV (até 200 KB) com uma linha por categoria: código no Omie; descrição (opcional); janeiro a dezembro, separados por ponto e vírgula. Célula vazia mantém o valor que já está no rascunho.
- **Ou cole aqui o conteúdo:** a planilha no mesmo formato, quando não tiver o arquivo.
- **Motivo da versão:** o que é esta versão e o que mudou (pelo menos 15 letras). Quem aprova lê o motivo.
- **Motivo da decisão:** opcional para aprovar; obrigatório para recusar (pelo menos 10 letras). Quem preparou lê o motivo.

### Compras e Caju no Omie

- **Mostrar:** tudo ou só um grupo: as compras faturadas e por boleto (já conferidas em Compras), as faturas dos cartões da empresa (fechadas na conciliação) ou as cargas do Caju (viagens e Recarga Caju).
- **Motivo:** em "Já lancei direto no Omie", o que você conferiu no Omie, como a data e o documento (pelo menos 10 letras); em "Dispensar", por que este item não vai ao Omie (pelo menos 15 letras); em "Desfazer", por que está desfazendo. Fica registrado com o seu nome.
- **Número do título no Omie (opcional):** o "Código do lançamento" da conta a pagar no Omie, só algarismos. Com ele, "Conferir com o Omie" também confere este item.
- **Departamento no Omie (no novo lançamento):** aparece só quando o centro de custo como departamento estiver ligado nas Regras do Financeiro; vem do centro de custo da viagem e vai com 100% do valor.

### Sigilo e acessos

- **Motivo:** por que a lista muda (ex.: nova pessoa no Financeiro, saída de alguém). Obrigatório; fica no registro de acessos.

### Reajustes de contratos

- **Situação:** mostra os reajustes aguardando a aprovação da Diretoria, os aprovados para faturar, os que aguardam o índice do Banco Central, os faturados ou os recusados.
- **Observação ou motivo:** opcional para aprovar; obrigatório para recusar (pelo menos 10 letras). Fica no histórico do contrato.
- **Nota ou pedido em que foi faturado:** o número da nota fiscal ou do pedido com o valor novo. Marca o reajuste como faturado; nada vai ao Omie por aqui.

</div>

### Recarga Caju

- **Valor aprovado:** pode ser menor que o pedido. Nunca passa do fundo sem a Diretoria. A carga não passa deste valor.
- **Fundamentação:** por que aprovou, devolveu ou negou. Obrigatória para devolver, negar e aprovar valor menor (pelo menos 15 letras); quem pediu lê esta resposta.
- **Data da carga, valor carregado e comprovante da carga:** a data em que a carga foi feita no portal do Caju; no máximo o que falta carregar do aprovado (menor pede a observação); o print ou PDF da carga.
- **Valor glosado:** só para glosar: o valor não aceito. Vazio glosa o gasto inteiro; parcial aceita o resto.
- **Motivo da glosa:** por que o gasto não foi aceito, total ou parcialmente (ex.: "gasto pessoal, fora da política"). Pelo menos 15 letras; o portador vê.
- **Motivo (o portador não fechou):** quando o prazo do portador passou sem o fechamento; o que não foi comprovado vira valor a devolver.
- **Forma, data, valor e comprovante do acerto:** como o portador devolveu (recolhimento do saldo no Caju ou depósito/PIX) ou como a empresa reembolsou; no máximo o que está a acertar.
- **Usa o cartão na rotina:** marcado, a pessoa vê Minha recarga Caju e pode pedir recarga. Só aparece para quem já tem o CPF vinculado ao Caju.
- **Fundo desta pessoa:** o saldo máximo do cartão para a rotina (só no modelo fundo rotativo). Em branco, vale o padrão da política.
- **Motivo da mudança da política:** o que mudou e por quê. A versão anterior fica guardada e cada recarga lembra a versão que valeu.
- **Liberar a trava:** motivo (20 letras ou mais) e validade de 1 a 30 dias. A pendência continua devida e a cobrança continua.
