# Financeiro — o que ficou pronto na noite de 14 para 15/11/2026

<div style="text-align: justify">

**Para:** Thiago. **Base no ar:** metrolabs/sgo:financeiro-revisao2-20261115 (17 publicações na noite, todas com backup e reversão). Último ensaio de ponta a ponta, só leitura, com o código no ar: as 15 consultas funcionaram no Omie real. **Estado no fim da noite:** tudo publicado e conferido no ar. A gravação no Omie continua **desligada** de propósito: nada foi lançado, baixado ou faturado no Omie pelo SGO+.

## 1. O que a Wanessa já pode usar (só consulta, dados reais do Omie)

Menu **Financeiro > Painel financeiro**:

- **Posição de hoje.** Saldo somado das contas e os próximos 10 dias (entra, sai, saldo previsto), pelo resumo do próprio Omie.
- **Agenda de vencimentos.** O que vence em 7, 15 ou 30 dias, dia a dia, com o nome do cliente ou fornecedor e o valor em aberto.
- **Vencidos a receber por cliente.** Quem deve, quantos títulos, quanto ainda está em aberto e há quantos dias, com as faixas de atraso. A agenda, os vencidos e o resultado do mês podem ser baixados em planilha (CSV) para o Excel.
- **Contas a pagar e receber.** Com filtro de situação (Vencidos, Vencem hoje, A vencer, Todos) e o nome do cliente ou fornecedor.
- **Resultado do mês.** O que foi recebido e pago no mês, por categoria do plano de contas do Omie, com o resultado; transferências entre contas à parte. Visão de gestão do caixa; o contábil continua com o contador.
- **Pedidos aprovados.** As propostas aprovadas, com o preparo da conta a receber no Omie já preenchida pelo pedido (cliente achado pelo CNPJ, valor, referência, OC e condição de pagamento) e os títulos que o cliente já tem no Omie.
- **Demais abas:** fluxo de caixa, orçamento, conciliação do extrato, faturamento, notas e provisões. As 12 abas foram testadas na tela completa, no computador e no celular.

Em **Ganhos dos vendedores > Recebimentos**, o bloco **Recebimentos do Omie** mostra o que entrou no mês e sugere a proposta do mesmo cliente. O Financeiro confere e lança; nada é lançado sozinho, e o mesmo recebimento não entra duas vezes.

## 2. Números reais vistos nos ensaios (somente leitura)

- **A pagar:** 96 títulos vencidos e 835 a vencer.
- **A receber:** 80 títulos vencidos, de 37 clientes. Por atraso: 26 vencidos há até 30 dias, 7 entre 31 e 90 dias e 47 há mais de 90 dias.
- **Vencidos antigos:** 35 dos 80 vencidos a receber são de 2021 a 2024. Vale uma conversa com a cobrança e o contador.
- **Recebimentos do mês:** em novembro, 49 recebimentos; 45 com o cliente cadastrado no SGO+, mas só 5 com proposta aprovada no SGO+.
- **Pedidos aprovados:** 34 no total, 1 sem CNPJ no cadastro. Os 5 preparados de teste acharam o cliente no Omie.

## 3. Correções feitas durante os ensaios

- **Limites do Omie.** O Omie recusa duas chamadas seguidas do mesmo tipo e responde à mesma consulta só uma vez por minuto. O SGO+ agora guarda a resposta por um minuto, espera alguns segundos entre chamadas do mesmo tipo e nunca repete uma gravação sozinho.
- **Vencidos por cliente.** Somavam o valor do documento. Agora somam o que ainda está em aberto, que é cerca de 71% daquele valor (o resto já foi pago em parte ou retido em imposto).
- **Visão geral.** Duas consultas do mesmo tipo saíam ao mesmo tempo e o Omie recusava uma delas. Agora saem em sequência.
- **Telas.** A aba aberta passa a aparecer destacada, os formulários do celular ficaram legíveis e a aba Provisões não quebra mais em acesso por http.

**Revisão independente do código da noite.** Ela apontou 9 pontos; 7 foram corrigidos e publicados:
- em Ganhos, a referência do Omie não fica mais presa num lançamento manual;
- um título pago em meses diferentes passa a sugerir só a parte nova;
- confirmar uma gravação no primeiro minuto após a prévia agora pede para aguardar alguns segundos, em vez de falhar;
- o vínculo do pedido não confunde mais as revisões da proposta.

Os outros 2 pontos só podem gerar a mensagem "aguarde e repita", sem dado errado.

**Segunda revisão, das últimas mudanças, e bateria completa.** A segunda revisão apontou 7 pontos e 6 foram corrigidos. A bateria inteira do sistema (238 arquivos de teste), comparada com o início da noite, não teve nenhuma piora; os 8 arquivos que melhoraram são do trabalho do Financeiro.

## 4. Acessos

- **Lote 3 das caixas (Financeiro em Compras):** ligado. Conferir compras, faturas de cartão, a pagar, reabrir fatura e cartões passaram a seguir as caixas. Sem exceção gravada, todos têm exatamente o que tinham: 23 contas comparadas, 0 diferenças.
- **Caixas do Painel financeiro:** 6 próprias, com o padrão Financeiro, Diretoria e Administrador.
- **Página antiga `/financeiro`:** aposentada. Mostra um aviso apontando para o Painel.

## 5. O que depende de você

1. **Primeira gravação acompanhada no Omie.** Roteiro em `ROTEIRO_PRIMEIRA_GRAVACAO_OMIE.md`: começa por uma baixa que a Wanessa já faria no dia. Você liga em Chaves e senhas > Omie.
2. **Vencidos de 2021 a 2024:** decidir com a cobrança e o contador o que fazer com eles.
3. **Cadastro:** 1 proposta aprovada está com cliente sem CNPJ no SGO+.
4. **Como ficou combinado:** Sicoob, plano de contas e centro de custo únicos, e o fiscal seguem a ordem da Missão 01.

Manual da equipe: `docs/MANUAL_PAINEL_FINANCEIRO.md`. Registros de cada publicação: `output/financeiro-20261114/` e `output/financeiro-20261115/` (arquivos PUBLICADO_*).

</div>
