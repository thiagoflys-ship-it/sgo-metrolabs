# Auditoria do Financeiro — contas por período e conciliação com baixa no Omie (19/11/2026)

**Base:** `output/financeiro-20261116/cand33`. Antes da mudança, conferida **igual à produção** por hash de todos os 569 arquivos do contêiner (`/app/legado`), e igual à `cand32`.
**Pedido:** o dono pediu um especialista para mapear e verificar o módulo financeiro; o Matheus e a Wanessa relataram (1) falta de contas a pagar e a receber por período, com as colunas do Omie, e (2) conciliação que não aceita contas atrasadas e que não baixa nada no Omie.
**Não foi feito:** publicação, commit, qualquer escrita no banco de produção ou no Omie real (nenhum método de gravação do Omie foi chamado). Nada foi lido ou exibido de `/opt/metrolabs/sgo/cofre` nem de chaves. O ensaio em `/tmp/ensF` foi apagado do contêiner no fim.

---

## 1. Resumo para o dono

| Relato | Causa encontrada | O que mudou |
|---|---|---|
| "Não deixa conciliar as contas atrasadas" | A conciliação só comparava o extrato do banco com o **extrato do Omie, na mesma data e no mesmo valor**. A conta atrasada fica no extrato do Omie na data de previsão antiga, como "Previsto"; o pagamento chega no banco em outra data, então nunca casava. | Cada movimento do banco agora é casado com os **títulos em aberto** do Omie: todos os atrasados, os que vencem hoje e os a vencer até 45 dias depois do extrato, pelo saldo em aberto (igual ou com juros/multa/desconto), CPF/CNPJ e documento citados no extrato e nome. |
| "As que deixa conciliar não baixam no Omie" | A confirmação só gravava uma "conferência local" (`OMIE_CONCILIACOES`). Pior: os títulos **em aberto** que vencem no dia aparecem no extrato do Omie como "Conta a Pagar/Previsto" e eram "conferidos" como se já estivessem pagos (6 registros da Wanessa em 18/11 eram assim; os 5 títulos foram baixados à mão no Omie depois: hoje estão PAGO). | A confirmação **baixa no Omie** (LancarRecebimento/LancarPagamento) com data e conta do extrato, juros, multa e desconto, e `conciliar_documento = S` (já conciliada). Código da baixa no histórico. "Previsto" nunca mais conta como pago. |
| Contas a pagar e receber por período, com as colunas do Omie | A aba só tinha situação e paginação de 50, 5 colunas. | Aba refeita: período por vencimento, previsão, pagamento ou emissão; 8 situações; as 17 colunas pedidas (+3 opcionais); ordenar e filtrar por coluna; agrupar com subtotais; totais; planilha CSV. Conferida com o Omie real (seção 4). |
| Juros, multa e desconto na baixa | Estavam travados em zero "até a primeira baixa acompanhada". | **Confirmado com os dados reais do Omie** como ele soma no banco (seção 5) e liberado, com chave de emergência para desligar. |

**Placar da suíte:** ver seção 9 (`suite.txt`).

---

## 2. Mapa do módulo (Painel financeiro e telas ligadas)

Acesso a tudo: **lista de sigilo** (`OMIE_SIGILO_CONTAS`; em produção a lista padrão: admin, charles, wanessa) **e** a caixa do Financeiro de cada ação. Toda consulta e recusa vai para `FIN_OMIE_ACESSOS` (124 registros em produção). Gravação no Omie: chave `OMIE_GRAVACAO_LIGADA` = 1 em produção (desde 16/11).

| Aba (arquivo da tela / servidor) | Omie: métodos (L = leitura, E = escrita) | Tabelas do SGO+ | Caixa |
|---|---|---|---|
| Visão geral (`JS_Omie_Gestao` / `SGO_Omie_Gestao.js`) | L: ListarMovimentos (CPCR), ObterResumoFinancas, ListarExtrato | — | CONSULTAR |
| **Contas a pagar e receber** (`JS_Financeiro_Contas` **novo** / `SGO_Financeiro_Contas.js` **novo**) | L: ListarMovimentos (CR/CP, por data), ListarClientes, ListarCategorias | — (cache 5 min) | CONSULTAR |
| Ficha do cliente (`JS_Omie_Cliente` / `SGO_Omie_Cliente.js`) | L: ListarClientes, ListarMovimentos | — | CONSULTAR |
| Pedidos aprovados (`JS_Omie_Pedidos` / `SGO_Omie_Pedidos.js`) | E: IncluirContaReceber (pela prévia) | FIN_OMIE_PEDIDOS | LANCAR |
| Lançamentos e baixas (`JS_Omie_Operacoes` / `SGO_Omie_Operacoes.js`) | L: List/ConsultarContaPagar/Receber, ListarMovimentos (saldo), Consultar Cliente/Categoria/ContaCorrente. E: Incluir/AlterarContaPagar/Receber, **LancarPagamento/LancarRecebimento**, IncluirLancCC, IncluirCliente | propriedades `OMIE_OPS_*`, FIN_OMIE_OPERACOES (trilha) | LANCAR |
| Aprovação de pagamentos (`JS_Financeiro_Pagamentos` / `SGO_Financeiro_Pagamentos.js`) | L: ListarContasPagar | FIN_PAG_ITENS | CONSULTAR (decidir: dono e Diretoria) |
| Cobranças (boletos) | L: ObterBoleto. E: GerarBoleto, ProrrogarBoleto | — | COBRAR |
| **Conciliação bancária** (`JS_Omie_Conciliacao` / `SGO_Omie_Conciliacao.js`) | L: ListarContasCorrentes, ListarExtrato, **ListarMovimentos (abertos)**, ListarClientes. E (**novo**): LancarRecebimento/LancarPagamento com conciliar_documento | OMIE_CONCILIACOES | CONCILIAR (+ LANCAR para baixar) |
| Faturamento de produtos e serviços, Importação de notas (`SGO_Omie_Faturamento.js`, `SGO_Omie_Notas.js`) | L: ConsultarPedido/OS, ConsultarRecebimento. E: ValidarPedidoVenda/OS, FaturarPedidoVenda/OS, ImportarNFe, IncluirContaPagar, IncluirProduto | propriedades `OMIEFAT_OP_*` | FATURAR / LANCAR |
| Fluxo de caixa, Resultado do mês | L: ListarMovimentos, ListarCategorias | — | CONSULTAR |
| Orçamento anual (`SGO_Financeiro_Orcamento.js`) | L: ListarOrcamentos, ListarCategorias | FIN_ORC_* | CONSULTAR (aprovar: dono e Diretoria) |
| Provisões | — | local | PROVISOES |
| Contas fixas, Compras e Caju no Omie, Fechamento, Trilha | E pela prévia de Lançamentos (Incluir, Cancelar, Excluir) | FIN_FIX_*, FIN_ESP_*, FIN_FECH_*, FIN_OMIE_OPERACOES | LANCAR / CONSULTAR |
| Regras do Financeiro, Sigilo e acessos | L: ListarCategorias | propriedades | dono |
| Indicadores, Régua de cobrança, Agenda financeira, Relatórios semanais | leitura da **fotografia diária** (rotina) | FIN_FOTOS, FIN_FOTO_MES, FIN_COBRANCA*, FIN_RELATORIOS | CONSULTAR |
| Especialista financeiro (Gemini) | nenhuma escrita | registro de uso | CONSULTAR |
| Recarga Caju, Reajustes de contratos, Comissões (atalho) | — | tabelas próprias | — |

**Rotinas agendadas** (todas dentro de `Gestao_rotinaDecisoes`, a cada 15 minutos; não há gatilho próprio do Financeiro): fotografia diária `FinFoto_rodada_` (a partir das 06:00, só leitura do Omie), relatório semanal `FinRel_rodada_`, contas fixas `FinFix_rodada_`, fechamento `FinFech_rodada_`, aviso de pagamentos `FinPag_rodada_`, guarda do especialista `FinIa_limparUso_`. Os gatilhos do Auvo já não existem (conferido em `gatilhos`).

---

## 3. Funciona de verdade? (tabela com evidência)

Evidência: **P** = produção (banco/log, só leitura), **R** = leitura real no Omie pelo ensaio, **T** = teste automatizado com o Omie simulado.

| Ferramenta | Situação | Evidência |
|---|---|---|
| Sigilo e registro de acessos | Funciona | P: 124 registros em FIN_OMIE_ACESSOS; T: Matheus recebe "sigiloso" em todas as APIs novas. Um erro único em 16/11 ("duplicate key abas_pkey" ao criar a aba do registro): corrida na primeira criação, não repetiu. |
| Visão geral, Fluxo, Resultado, Agenda de vencimentos | Funciona | P: chamadas reais no registro "lento" de 17 e 18/11 (2 a 5 s), nenhuma falha registrada. |
| Contas a pagar e receber (antes) | Funcionava **parcial**: só situação, 50 por página, 5 colunas, valor original | Código; substituída. |
| **Contas a pagar e receber por período (nova)** | Funciona | R: 96 títulos a receber de nov/2026 (= nTotRegistros do Omie), 12 s na 1ª leitura com os nomes; 3 títulos conferidos um a um com ConsultarContaReceber: valor, vencimento, documento, nota e parcela **iguais**. T: 3 testes. |
| Lançamentos e baixas: incluir e alterar | Funciona | P: IncluirContaPagar (CTE-314, 17/11) e AlterarContaPagar (18/11) concluídas pelo SGO+ (`OMIE_OPS_*`). |
| Lançamentos e baixas: **baixa** | Funcionava **parcial**: só sem juros/multa/desconto; nunca usada em produção | P: nenhuma baixa pelo SGO+. Corrigida (seção 5); T. |
| Envio com `codigo_status` ≠ 0 | **Não funcionava** como devia: virava "envio incerto" | Documentação do Omie: ≠ 0 é falha de validação (nada foi feito). Corrigido: recusa clara com o motivo. T. |
| **Conciliação bancária** | **Só registro local**; não casava atrasadas; "Previsto" contado como pago | P: 6 conferências locais da Wanessa em 18/11, todas de títulos ainda em aberto naquele dia; R: hoje os 5 estão PAGO (baixados à mão no Omie). Corrigida (seção 6); T: 8 testes. |
| Aprovação de pagamentos | Funciona (testes); ainda **não usada** | P: FIN_PAG_ITENS não existe ainda. |
| Cobranças (boleto), Faturamento, Importação de notas | Funcionam nos testes; **sem uso** em produção | P: nenhum `OMIEFAT_OP_*`. A 1ª operação real deve ser acompanhada. |
| Contas fixas, Compras e Caju, Fechamento, Trilha, Orçamento | Funcionam nos testes; **sem uso** (publicadas em 18/11) | P: tabelas ainda não criadas. |
| Fotografia diária (Indicadores, Régua, Agenda, Relatório) | Funciona **parcial** | P: FIN_FOTOS tem 16/11 e 17/11 COMPLETA; **não há fotografia de 18/11** e não há cursor em andamento. Provável causa: no expediente a rodada lê só 8 páginas e para quando a tela do Financeiro consulta o Omie, e 18/11 teve uso intenso e várias reinicializações do contêiner (publicações). Sem log da rotina (só `console.error`), não dá para afirmar. Não mexi; ver seção 8. |
| Relatório semanal | Funciona | P: FIN_RELATORIOS com 1 relatório. |
| Rotinas agendadas | Sem erro do Financeiro nos últimos 7 dias | P: `registro` (agendador: só erros do Auvo cancelado, 320 até 18/11; os gatilhos do Auvo já foram retirados). |

---

## 4. Contas a pagar e receber por período

- **Fonte:** `financas/mf` **ListarMovimentos** ([documentação](https://app.omie.com.br/api/v1/financas/mf/)), com `cTpLancamento` CR ou CP e `dDtVencDe/Ate`, `dDtPrevDe/Ate`, `dDtPagtoDe/Ate` ou `dDtEmisDe/Ate`, 50 por página, todas as páginas (até 60 = 3.000 títulos; acima, a tela diz para reduzir o período). Nomes: ListarClientes (`nome_fantasia`; sem ele, razão social), guardados 6 h. Categorias: ListarCategorias, guardadas 6 h.
- **Colunas (nomes dos campos conferidos no Omie real):** Situação (`cStatus` + saldo + vencimento, calculada no dia de Brasília), Nº do documento (`cNumTitulo`), Parcela (`cNumParcela`), Nota fiscal (`cNumDocFiscal`), Vencimento (`dDtVenc`), Cliente/Fornecedor (nome fantasia de `nCodCliente`), Valor da conta (`nValorTitulo`), Previsão (`dDtPrevisao`), Último recebimento/pagamento (`dDtPagamento`), Impostos retidos (soma de `nValorPIS/COFINS/CSLL/IR/ISS/INSS` com `cRet*` = S), Valor líquido (valor − retidos), Valor a receber/pagar (`resumo.nValAberto`), Desconto (`nDesconto`), Juros e multa (`nJuros + nMulta`), Valor recebido/pago (`resumo.nValLiquido`: o que entrou ou saiu no banco), Categoria (`cCodCateg` + descrição), Operação (`cOperacao` + nome da documentação). Extras escondidos: Emissão, CPF/CNPJ, Tipo de documento.
- **Exemplo real (título recebido, nov/2026):** valor 150,00; retidos 6,97; líquido 143,03; multa 11,02; recebido 154,05 — exatamente o que a tela calcula.
- **Situações:** todas, em aberto, a vencer, vence hoje, atrasadas, com pagamento parcial, pagas ou recebidas, canceladas. Trocar situação, ordem, filtro ou agrupamento não consulta o Omie de novo (resultado guardado 5 minutos por tipo + data + período + dia); "Ler de novo do Omie" ignora o guardado.
- **Tela:** ordenar clicando no título; filtro por coluna (texto ou `>1000`, `<500`, `=150,00`); Procurar; Agrupar por situação, cliente, categoria, operação ou mês, com subtotal; total no rodapé; colunas visíveis guardadas no aparelho; CSV registrado no sigilo (o mesmo `Omie_apiCsv` das outras planilhas). Filtros só aplicam ao sair do campo ou com Enter (não redesenha enquanto digita). Celular: cartões, sem a linha de filtros, sem rolagem lateral (390 e 320 px conferidos).
- **Matheus:** pediu a tela, mas está **fora da lista de sigilo**. Não liberei. É decisão do dono, em Painel financeiro > Sigilo e acessos (já configurável).

---

## 5. Juros, multa e desconto: como o Omie soma (evidência real)

Leitura de 436 títulos recebidos entre 01/07 e 18/11/2026: 56 com juros, multa ou desconto. Em todos, `nValLiquido = nValPago − nDesconto + nJuros + nMulta` (a fórmula da documentação), e nos movimentos de conta corrente conferidos (ListarMovimentos `BXCR` de novembro, `nValorMovCC`) o valor do banco é o `nValLiquido`:
- título 5277807664: baixado 158,91 + multa 31,78 = **190,69** no banco (nValorMovCC 190,69);
- título 5143297272: baixado 333,33 − desconto 71,56 = **261,77** no banco (o título inteiro, 333,33, saiu do saldo).

Logo, na API (LancarRecebimento/LancarPagamento, campos `valor`, `juros`, `multa`, `desconto`, [doc contareceber](https://app.omie.com.br/api/v1/financas/contareceber/), [doc contapagar](https://app.omie.com.br/api/v1/financas/contapagar/)): `valor` = quanto sai do saldo do título; o banco recebe `valor + juros + multa − desconto`. A trava antiga também tinha um erro: recusava `valor + desconto > saldo`, o que impediria quitar com desconto. Agora: `valor ≤ saldo` e `desconto ≤ valor`; a prévia mostra "Efeito na conta corrente" com a conta. Desligar em emergência: chave `OMIE_BAIXA_ACRESCIMO_DESLIGADO` = 1 (não existe em produção = ligado).
**Risco que fica:** o mapeamento `valor` da API = `nValPago` está deduzido dos dados e do nome "Valor a ser baixado"; nunca foi gravado pela API. Por isso o roteiro da seção 10 começa com uma baixa sem acréscimo e só depois uma com juros, conferindo o extrato do Omie.

---

## 6. Conciliação com baixa no Omie

**Prévia** (`Omie_apiConciliarPrevia`): lê o extrato do Omie (ListarExtrato) e os títulos em aberto (3 consultas de ListarMovimentos `CPCR`: `cStatus` ATRASADO, VENCEHOJE e AVENCER até 45 dias depois do fim do extrato, com 1,5 s entre elas — no ensaio, consultas seguidas sem pausa davam "Omie ocupado"; guardado 3 minutos). Leitura real: **146 títulos a receber e 388 a pagar em aberto, 79 e 91 atrasados, 10,8 s**. Para cada movimento:
1. pagamento ou recebimento **já feito** no Omie com o mesmo valor (mesma data ou até 3 dias), sem contar os "Previsto": **conferir** (registro no SGO+, como antes);
2. **título em aberto**: pontua saldo igual (+100), diferença de juros/multa até 25% (+45), a menor até 50% (+25), CPF/CNPJ do extrato (+80), documento ou nota citados (+25), nome (+20/palavra). Título claro vem escolhido; empate pede escolha; o mesmo título para dois movimentos nunca é escolhido sozinho; "Outro título" aceita o código do Omie. Para conta a pagar, mostra a situação da aprovação.
3. nada: diz o que fazer (lançar o título ou "Lançamento avulso na conta").

**Baixa** (`OmieConc_apiBaixaPrevia` → `OmieOps_apiPrevia`; `OmieConc_apiBaixaConfirmar` → `OmieOps_apiConfirmar`): a mesma prévia de Lançamentos e baixas (saldo, aprovação de pagamento do dono/Charles, alçadas, gravação ligada, trilha FIN_OMIE_OPERACOES, envios a conferir). `valor = banco − juros − multa + desconto`; a prévia recusa se a conta não fecha com o extrato. Parâmetros extras: `conciliar_documento = "S"` e `codigo_baixa_integracao = "CB" + 18 hex` fixo por movimento + título. Retorno gravado: `codigo_baixa`, `liquidado`, `valor_baixado` (OMIE_CONCILIACOES, tipo BAIXA_OMIE).
**Idempotência:** (a) antes de preparar e de novo dentro da trava antes de enviar, o movimento não pode estar no histórico; (b) a mesma operação não é reenviada em 24 h (índice já existente); (c) o título é relido no Omie na confirmação (mudou = nada enviado); (d) código de baixa fixo; (e) envio sem resposta fica "a conferir" e não é repetido; conferido como feito, entra no histórico. O minuto do Omie entre prévia e confirmação é esperado pela tela (o servidor devolve `esperar` sem enviar). "Baixas preparadas" lista o que ficou sem confirmar.
**ConciliarRecebimento** existe na API (por `codigo_baixa`), ConciliarPagamento não aparece na documentação de contapagar; por isso a conciliação vai junto na baixa (`conciliar_documento`, nos dois). Movimentos que já estavam baixados no Omie continuam só "conferidos" (a marca de conciliação deles é feita no Omie).

---

## 7. Problemas encontrados e corrigidos

1. Conciliação não casava atrasadas (data exata contra o extrato do Omie) — corrigido (seção 6).
2. Conciliação não baixava no Omie — corrigido.
3. Títulos "Previsto" do extrato do Omie eram conferidos como pagos — corrigido (`previsto` excluído; a confirmação local também recusa).
4. Juros/multa/desconto travados e a regra `valor + desconto > saldo` errada — corrigido com evidência real (seção 5).
5. `codigo_status` ≠ 0 do Omie virava "envio incerto" (travava a operação à toa) — agora é recusa com o motivo do Omie.
6. Contas a pagar e receber sem período e com 5 colunas — tela nova.
7. Mensagens da conciliação sem "o que fazer" (ex.: "Seleção inválida", "Escolha um período de até 94 dias", movimentos fora do período sem dizer qual) — reescritas com o quê, por quê e o que fazer.
8. "Baixas preparadas" mostraria prévias de movimentos já baixados por outra prévia — filtrado.
**Verificados sem defeito:** datas (todas as datas "de hoje" do módulo usam America/Sao_Paulo; as somas de dias usam UTC ao meio-dia), centavos (somas em inteiros de centavos nas telas novas), formato pt-BR (moeda e CSV com vírgula), paginação (Visão geral, período de Lançamentos, contas novas e conciliação leem todas as páginas, com limite e aviso), limite do Omie (espaçamento de 5 s por método, cache de 60 s, recusas "ocupado"/"repetida"/429 viram "nada foi feito"), sigilo nas APIs novas.

---

## 8. Riscos e pendências

- **Primeira baixa real** pela conciliação e a primeira com juros/desconto: acompanhar (seção 10).
- **Fotografia diária de 18/11 ausente** (Indicadores, Régua e Agenda dependem dela). Conferir depois da publicação se `FIN_FOTOS` tem o dia 19/11 até ~08:00. Se faltar de novo, a rotina precisa de log próprio e de mais páginas por rodada fora do expediente (não alterei sem evidência).
- **Conta a pagar debitada automaticamente** (débito em conta, tarifa) também precisa da aprovação do dono/Charles para baixar pela conciliação. Decisão do dono: manter, ou definir um valor de dispensa (`FIN_PAG_DISPENSA_ABAIXO`, já existe em Regras do Financeiro).
- **Matheus** na lista de sigilo para ver contas por período: decisão do dono.
- Títulos com **pagamento parcial ainda não vencidos** não entram na lista de abertos da conciliação (só os atrasados com parcial); escolha "Outro título" com o código. Juros acima de 25% do saldo sem CPF/CNPJ no extrato também pedem "Outro título".
- Durante a auditoria, uma sequência de leituras de teste provocou um **limite temporário do Omie (429) por alguns minutos**, por volta das 00:40; só leitura, de madrugada, sem efeito no uso. Por isso a conciliação espaça as consultas.
- Primeira consulta de um período grande na tela de contas pode levar 10 a 30 s (nomes dos clientes, 50 por chamada com 5 s de intervalo); depois fica em cache 6 h.

---

## 9. Arquivos mudados (cand32 → cand33) e testes

**Novos:** `SGO_Financeiro_Contas.js` (LF), `JS_Financeiro_Contas.html` (LF).
**Alterados** (fim de linha conferido: CRLF continua CRLF; `JS_Omie_Ajuda.html` mantém o CR solto que já tinha; `SGO_Ajuda_Financeiro.js` mantém a única linha LF):
- `SGO_Omie_Conciliacao.js`: pareamento com títulos em aberto, "Previsto", baixa (prévia/confirmação/pendentes), histórico com baixa, mensagens.
- `SGO_Omie_Operacoes.js`: juros/multa/desconto liberados (com chave de desligar), regra do saldo corrigida, efeito no banco, `conciliar_documento` e código de baixa da conciliação, retorno da baixa, `codigo_status` ≠ 0 = recusa, ganchos do histórico (confirmação e "conferi no Omie").
- `JS_Omie_Conciliacao.html` (CRLF): tela nova da conciliação. `JS_Omie_Operacoes.html` (CRLF): campos de juros/multa/desconto liberados e aviso novo. `JS_Omie_Gestao.html` (CRLF): aba Contas usa a tela nova. `Index.html`: inclui a tela.
- `SGO_Omie.js`: texto da caixa FIN_OMIE_CONCILIAR. `SGO_Omie_Sigilo.js`: nomes das 8 APIs no registro de acessos. `SGO_AssistenteErros.js`: tela nova mapeada para `omie`.
- Ajuda e manual: `JS_Omie_Ajuda.html` (guias das abas Contas e Conciliação, campos novos, textos da baixa), `SGO_Ajuda_Financeiro.js`, `docs/MANUAL_PAINEL_FINANCEIRO.md` (seções 8t e 8u, abas, problemas, campos), `SGO_AssistenteManuais.js` regerado (só o manual do Painel financeiro mudou).

**Testes:** novo `tests/financeiro-auditoria-20261119.test.cjs` (13 testes: período e colunas, paginação e validação, sigilo, atrasada encontrada, baixa com juros conciliada, idempotência, desconto e parcial, erros da API (recusa, `codigo_status`, sem resposta), conta a pagar com aprovação e o minuto do Omie, título à mão, desconto em Lançamentos, telas e página completa em 1366/390/320 px com capturas). Ajustados **de propósito** ao comportamento novo: `omie-conciliacao.test.cjs` (contagem renomeada para `candidatosOmie`), `financeiro-completo-20261116.test.cjs` (B1: juros liberados e chave de desligar; campo não é mais somente leitura), `financeiro-omie-20261114.test.cjs` (texto do aviso da baixa).
**Capturas:** `capturas/` (1366 e 390: contas por período agrupadas, prévia da conciliação, baixa feita).
**Patches:** `legado-cand32-cand33.patch`, `tests-docs.patch`. **Placar:** `suite.txt` (ver o fim deste relatório).

---

## 10. O que o coordenador faz ao publicar

1. Publicar a `cand33` inteira (2 arquivos novos). Não há tabela nova: `OMIE_CONCILIACOES` já existe com o mesmo cabeçalho; nada a migrar. Nenhuma chave nova obrigatória.
2. Depois de publicar: abrir Painel financeiro > Contas a pagar e receber (este mês) e conferir um título com o Omie; abrir Conciliação bancária e gerar uma prévia (só leitura) com o extrato do Sicredi matriz.
3. No dia seguinte de manhã: conferir se `FIN_FOTOS` tem a fotografia do dia (seção 8).
4. Commit de `tests/` e `docs/` junto.

## 11. Roteiro da 1ª baixa real assistida (Wanessa, com o coordenador ou o dono acompanhando)

1. Escolha uma conta **a receber** já creditada no banco, **sem juros**, de valor pequeno. No Omie, confira que ela está em aberto.
2. Baixe o OFX do Sicredi com o dia do crédito. Painel financeiro > Conciliação bancária: conta, período, OFX, arquivo, **Gerar prévia**.
3. No movimento, confira o título sugerido (documento, cliente, vencimento, "em aberto"). Toque em **Preparar baixa** e leia: "Saldo depois: R$ 0,00 (quitado)", "Efeito na conta corrente" igual ao valor do banco, linha "Conciliação".
4. Toque em **Confirmar a baixa no Omie** (a tela espera o minuto do Omie). Anote o "código da baixa".
5. No Omie: o título aparece recebido, na data do extrato, na conta certa, e o movimento aparece **conciliado** na conta corrente. Se não aparecer conciliado, avise (a baixa vale; só a marca de conciliação ficaria para fazer no Omie).
6. Gere a prévia de novo com o mesmo arquivo: o movimento deve aparecer "Já baixado pelo SGO+ ... (código da baixa N)".
7. Repita com um recebimento **atrasado com juros ou multa** (o banco maior que o saldo). Na prévia, "Efeito na conta corrente" = valor do banco = valor baixado + juros. No Omie, confira no extrato da conta que entrou **exatamente o valor do banco** (não valor + juros de novo). Se entrar diferente, o responsável pelo sistema grava `OMIE_BAIXA_ACRESCIMO_DESLIGADO` = 1 e avisa; a baixa errada se estorna pela Trilha das operações.
8. Por último, uma **conta a pagar**: ela precisa estar aprovada (Aprovação de pagamentos, dono ou Charles). Repita os passos 3 a 6.

---

## 12. Placar da suíte completa

`DEST=output/financeiro-20261116/cand33 ... node output/financeiro-20261115/rodar-suite-dest.cjs candidato` (19/11/2026 01:36): **297 arquivos, 2687 passam, 0 falham, nenhum arquivo com saída diferente de zero** (referência anterior: 2674; +13 do teste novo). Detalhe por arquivo em `suite.txt`.
