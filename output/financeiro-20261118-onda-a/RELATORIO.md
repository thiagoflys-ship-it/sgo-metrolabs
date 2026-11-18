# Relatório — Onda A do Financeiro: A1 contas fixas, A3 fechamento do mês e A4 trilha das operações com estorno de baixa (18/11/2026)

**Base de trabalho:** `output/financeiro-20261116/cand23`. Antes da mudança, era idêntica à `cand22` (produção atual, `diff -rq` vazio).

**Especificação:** `output/financeiro-20261116/especialistas/ESPEC_ONDA2_FINANCEIRO.md`, seção 5 (Onda A e "Segurança e auditoria"), e
`ESPEC_FINANCEIRO.md`, achado M2 e itens 2 e 5 da seção 6.

**O que não foi feito:** nada foi publicado e não houve commit. Não houve acesso à produção, ao banco nem ao `/opt/metrolabs/sgo/cofre`. Omie, Caju e
Gemini reais não foram chamados e nenhum e-mail saiu: nos testes, o Omie é simulado (`tests/_financeiro_onda_a.cjs`, sobre o ambiente do bloco B).
O servidor Node, a Frota/rastreador, o chat do RH360, os PGT/POP gerados e o Portal do cliente não foram tocados. Nenhum cron novo.

## 1. O que foi feito

### A1 — Contas fixas (aba nova, `SGO_Financeiro_ContasFixas.js` e `JS_Financeiro_ContasFixas.html`)

- **Cadastro local** (`FIN_CONTAS_FIXAS`): descrição, fornecedor do Omie (a mesma busca por CNPJ ou nome do lançamento), categoria de despesa e conta
  corrente (as listas do Omie), dia do vencimento (1 a 31; em mês mais curto vale o último dia), valor fixo ou "valor varia — confirmar no mês",
  mês de início e de fim, observação. **A tela começa vazia**; nenhuma conta nem valor foi cadastrado.
- **Alteração** com motivo (15 letras ou mais), gravando só o que mudou (`SGO_DATA.update` campo a campo); antes, depois e motivo em
  `FIN_CONTAS_FIXAS_HIST`. O mês já preparado guarda o valor da época.
- **Todo mês:** `FinFix_rodada_`, chamada por `Ges_rodada_` (o mesmo caminho da fotografia e das rotinas do Financeiro), uma vez por dia, prepara a
  conta do mês **10 dias antes do vencimento** (`FIN_FIXAS_MES`, situação PREPARADA). Preparar não chama o Omie. A aba também prepara ao abrir.
- **"Preparar lançamento"** abre Lançamentos e baixas com o novo lançamento preenchido (fornecedor, documento `FX<AAAAMM>-<código>`, valor, vencimento,
  categoria, conta, observação e a referência única `FIX-<conta>-<AAAAMM>`). A Wanessa confere a prévia e confirma; **só a confirmação grava no
  Omie**, com alçadas e trilha. Confirmado, o mês vira LANCADA sozinho (`FinFix_registrarLancado_`, chamado por `OmieOps_apiConfirmar`).
  Lançar o mesmo mês de novo é recusado.
- **"Já lancei direto no Omie"** (o que foi conferido) e **"Dispensar este mês"** (motivo), ambos desfazíveis com motivo.
- **Pendência** `fin_fixa_lancar`: conta que chega ao vencimento sem lançamento → só as pessoas do Financeiro da lista de sigilo (sem ninguém, a
  Diretoria da lista), só a contagem, sem descrição nem valor.
- **Faixa em Lançamentos e baixas** com quantas contas fixas estão para lançar (sem valores) e o atalho.
- **Agenda e previsão (bloco B):** as contas fixas não lançadas entram no Gantt (grupo "Contas fixas a pagar ainda não lançadas no Omie") e na
  previsão de 90 dias como saída no vencimento (vencidas, hoje), nas duas curvas, na aba Indicadores (G2) e no relatório semanal. Valor variável
  aparece no Gantt sem valor e fica fora da soma, com a premissa dizendo quantas. Lançada, a conta sai da soma (passa a vir da fotografia do Omie).
  Sem contas fixas, a previsão fica exatamente como antes.

### A3 — Fechamento do mês (aba nova, `SGO_Financeiro_Fechamento.js` e `JS_Financeiro_Fechamento.html`)

- **Lista padrão recomendada** (versão 0, da especificação): conciliação de todas as contas; notas recebidas lançadas; Caju fechado (viagens e
  Recarga Caju da rotina); provisões revistas; títulos vencidos revistos; relatório do mês para a Diretoria. Cada item: quem faz (Financeiro ou
  dono/Diretoria) e prazo em dias úteis do mês seguinte (5; o relatório, 7).
- **Aprovar ou alterar a lista:** só o dono e a Diretoria da lista, com motivo; cada gravação é uma versão (`FIN_FECHAMENTO_LISTA`) e vale para os
  checklists abertos depois. Gravar sem mudança também vale como aprovação.
- **Abertura:** `FinFech_rodada_` em `Ges_rodada_`, **dentro do expediente e em dia útil**, abre o checklist do mês anterior. Na primeira rodada
  depois de publicado só grava `FIN_FECH_INICIO` = mês atual: **nenhum checklist atrasado é criado**. Abertura manual do mês atual e de até 3
  anteriores na tela.
- **Atividades sigilosas:** cada item vira atividade do módulo `financeiro`, restrita, criada pela rotina do sistema (`Ges_comoSistema_`), para a
  pessoa do Financeiro da lista (ou o dono/Diretoria no item da Diretoria), prazo às 18:00 do N-ésimo dia útil (feriados do expediente contam).
- **Marcar como feito** registra nome, data e hora do servidor e observação, e conclui a atividade; **desfazer** (quem marcou ou a Diretoria) pede
  motivo e reabre a atividade. **Dispensar, reabrir mês e alterar a lista:** só o dono e a Diretoria (regra `APROVACAO_SO_DIRETORIA`), com motivo;
  dispensar cancela a atividade. O mês só fica **FECHADO** com todos os itens feitos ou dispensados.

### A4 — Trilha das operações, estorno de baixa e exclusão de título (aba nova, `SGO_Financeiro_Trilha.js` e `JS_Financeiro_Trilha.html`)

- **Trilha `FIN_OMIE_OPERACOES`:** `Omie_requisitar_` (SGO_Omie.js) passou a envolver toda gravação (tudo que não é Listar, Consultar, Obter,
  Pesquisar ou Validar) e grava uma linha imutável depois da chamada: quem (a sessão conferida por `Omie_exigirAcesso_` na mesma chamada), tela de
  origem, operação, tipo, título, documento, valor, data, conta, **`CODIGO_BAIXA` devolvido pelo Omie**, código de integração, resultado (OK,
  RECUSADO, NAO_EXECUTADO, INCERTO) e motivo do Omie. O resultado e o erro voltam a quem chamou como antes; a trilha nunca impede a operação.
  Vale para lançamentos, baixas, boletos, cadastro no Omie, notas recebidas, faturamento, estorno e exclusão.
- **Estorno de baixa:** "Pedir estorno" na linha da baixa → prévia lida no Omie (sem gravar) → motivo (15 letras ou mais) → pedido em
  `FIN_OMIE_PEDIDOS`. Nada vai ao Omie. O pedido aparece em "Pedidos de estorno e exclusão" e **na Caixa de decisões** (tipo `fin_estorno_decidir`,
  registrado em `GES_TIPOS`, `soDiretoria`, `sigiloFin`, quem pediu em `naoPode`, sem valor no título). **Só o dono e a Diretoria confirmam**
  (`OmieRegras_podeAprovar_`, que segue `APROVACAO_SO_DIRETORIA`); quem pediu nunca confirma. Confirmar confere de novo o título e chama
  `CancelarRecebimento`/`CancelarPagamento` com `codigo_baixa` (ou `codigo_baixa_integracao`). Recusa e retirada pedem motivo.
  Gravação desligada: nada é enviado e o pedido continua aguardando. Omie ocupado: continua aguardando. Omie recusou: pedido FALHOU, nada feito.
  Sem resposta: pedido INCERTO, pendência para quem pediu e quem confirmou, "Conferi: foi feito / não foi feito", sem reenvio automático.
- **Exclusão de título:** só conta a pagar lançada pelo SGO+ e sem baixa (`ExcluirContaPagar`), pelo mesmo caminho. Conta a receber: recusada com o
  motivo (método do Omie a confirmar).
- **Consulta:** filtros (período, operação, resultado, busca), até 500 linhas, planilha CSV identificada pela rotina das outras planilhas
  (`Omie_apiCsv`, registro em `FIN_OMIE_ACESSOS`). Só a lista de sigilo; recusas registradas como NEGADO; nenhum valor no registro de acessos.

### Ajuda, manual e assistente

- `JS_Omie_Ajuda.html`: "Como fazer nesta aba" das três abas, passo novo em Lançamentos e baixas e explicação de cada campo (31 textos novos).
- `SGO_Ajuda_Financeiro.js`: três passos e quatro problemas novos.
- `docs/MANUAL_PAINEL_FINANCEIRO.md` (só sigilo): tabela das abas, nota das caixas, seções novas **8k, 8l e 8m**, seis problemas, seção 10 e
  seção 11 com os mesmos textos da tela.
- Base do assistente regerada (`_tools/gerar_base_assistente.cjs --docs docs --saida cand23/SGO_AssistenteManuais.js`); o manual continua `acesso:
  sigilo`. `SGO_AssistenteErros.js`: as três telas mapeadas para `omie`. `SGO_Omie_Sigilo.js`: nomes das 16 APIs novas no registro de acessos.

## 2. Arquivos (relativos à cand23)

**Novos:** `SGO_Financeiro_ContasFixas.js`, `SGO_Financeiro_Fechamento.js`, `SGO_Financeiro_Trilha.js`, `JS_Financeiro_ContasFixas.html`,
`JS_Financeiro_Fechamento.html`, `JS_Financeiro_Trilha.html`.

**Alterados** (fim de linha preservado, conferido arquivo a arquivo: CRLF continua CRLF e LF continua LF):
- `Index.html` (LF): inclui as três telas
- `JS_Omie_Gestao.html` (CRLF): 3 abas (26 no total), rotas e rótulos do registro de acessos
- `JS_Omie_Ajuda.html` (CRLF; o CR solto que já existia ficou)
- `JS_Omie_Operacoes.html` (CRLF): faixa das contas fixas
- `SGO_Ajuda_Financeiro.js` (misto, como já era)
- `SGO_AssistenteErros.js`, `SGO_AssistenteManuais.js` (gerado)
- `SGO_Financeiro_Agenda.js`: contas fixas no Gantt e na previsão (`FinAg_fixas_`)
- `SGO_Financeiro_Relatorio.js`: contas fixas na previsão do relatório semanal
- `SGO_Gestao_Escada.js`: `FinFix_rodada_` e `FinFech_rodada_` em `Ges_rodada_`
- `SGO_Omie.js`: `Omie_requisitar_` com a trilha (o corpo antigo virou `Omie_requisitarBase_`) e o operador da chamada
- `SGO_Omie_Operacoes.js`: documento do título para a trilha e registro do mês da conta fixa ao confirmar
- `SGO_Omie_Sigilo.js`: nomes das consultas

**Fora da cand23:** `docs/MANUAL_PAINEL_FINANCEIRO.md`; `tests/_financeiro_onda_a.cjs` (novo); `tests/financeiro-onda-a-trilha.test.cjs`,
`tests/financeiro-onda-a-fixas.test.cjs`, `tests/financeiro-onda-a-fechamento.test.cjs`, `tests/financeiro-onda-a-telas.test.cjs` (novos);
`tests/financeiro-omie-20261114.test.cjs` ajustado de propósito de 23 para 26 abas.

Diff completo: `legado-onda-a.patch` (cand22 → cand23).

## 3. Testes

| Arquivo | Passam | Falham |
|---|---|---|
| financeiro-onda-a-trilha | 9 | 0 |
| financeiro-onda-a-fixas | 8 | 0 |
| financeiro-onda-a-fechamento | 6 | 0 |
| financeiro-onda-a-telas | 2 | 0 |

Regressão direta (`rodar-lista.sh`): assistente-duvidas 12/0, assistente-manuais-acesso 6/0, financeiro-omie-20261114 25/0,
financeiro-cobranca-agenda 7/0, financeiro-relatorio-semanal 8/0, financeiro-especialista 12/0, omie-operacoes 20/0, financeiro-completo 23/0,
financeiro-config 8/0, financeiro-sigilo-geral 5/0.

**Suíte completa:** ver a seção 7 e `suite.txt`.

**Capturas reais** (`capturas/`, página completa do SGO+, 1366 e 390 px; 320 px conferido sem captura): contas fixas, cadastro, lançamento
preparado a partir da conta fixa, fechamento do mês (Wanessa e Diretoria com a edição da lista), trilha com o pedido de estorno, trilha com a
Diretoria decidindo, e a Agenda com as contas fixas (1366). O teste confere: sem erro de JavaScript, sem rolagem lateral, guia aberto, explicação em
todo campo, texto justificado.

## 4. Decisões adotadas

- Seguidas as decisões do dono: só o dono e o Charles confirmam (regra `APROVACAO_SO_DIRETORIA`, configurável); a Wanessa pede e executa; quem
  pede não confirma; sigilo em tudo; nenhum dado inventado.
- **Nenhuma caixa nova em Acessos:** ver = lista de sigilo; cadastrar, marcar e pedir = `FIN_OMIE_LANCAR`; decidir = dono e Diretoria da lista.
  Assim o lote 3 de Acessos não muda.
- **Antecedência de 10 dias** para preparar a conta do mês: constante no código (`FIN_FIX_ANTECEDENCIA`), não uma chave nova.
- **Responsável do checklist:** a pessoa do Financeiro da lista de sigilo (em ordem alfabética, se houver mais de uma); na produção atual, a Wanessa.
- **Estorno confirmado pela Diretoria executa na hora** (a Diretoria não precisa devolver para a Wanessa confirmar de novo), conforme "só então o
  SGO+ chama o Omie".
- A prévia do pedido fica 10 minutos guardada no servidor, porque o Omie só responde à mesma consulta uma vez por minuto.
- APIs com prefixo `Omie*` (OmieFix_, OmieFech_, OmieTri_) para entrar no registro de acessos e nos ensaios de tela existentes.

## 5. O que ficou para depois e por quê

- **A2 calendário fiscal:** depende do contador (regime e datas). **A5:** depende de A2; a previsão já soma A1.
- **Pendências da onda 1:**
  - estorno de baixa: **feito**;
  - exclusão de conta a pagar: **feita**; exclusão de conta a receber: método do Omie ainda a confirmar (ESPEC_FINANCEIRO.md, item 5);
  - anexo no Omie (`IncluirAnexo`): não feito; o limite de tamanho está "a confirmar" e a origem natural dos comprovantes (Compras → Omie, item 8)
    depende de decisão do dono;
  - lançamentos avulsos de conta corrente (`IncluirLancCC`) e parcelamento no novo lançamento: não dependem do dono, mas são novos tipos de
    gravação que pedem a confirmação dos campos na primeira operação acompanhada; ficaram fora para não ampliar o risco desta entrega. São a próxima
    etapa natural;
  - rateio: depende da estrutura de centros de custo (C1, decisão do dono).
- **Contas fixas:** conferências automáticas não foram feitas (por exemplo, achar no Omie a conta já lançada fora do SGO+); por enquanto, "Já lancei
  direto no Omie" à mão.
- **Fechamento:** os itens não são conferidos automaticamente (por exemplo, conciliação Caju concluída); a marcação é humana, com observação.
- **Idempotência da baixa (M1)** e baixa com juros, multa e desconto continuam como estavam.
- **Segurança transversal** (segunda verificação para ações críticas, revisão mensal de acessos, alerta fora do expediente, plano de contingência e
  prazos de guarda): não faz parte deste pedido.

## 6. Riscos e o que muda no primeiro dia

1. **Trilha a partir da publicação.** Gravações anteriores não estão na trilha; baixas antigas não têm o código e só se estornam no Omie (a tela diz).
2. **`Omie_requisitar_` mudou de forma.** Toda gravação passa a escrever uma linha em `FIN_OMIE_OPERACOES` (tabela criada na primeira gravação). Uma
   falha ao gravar a trilha vai para o console e não impede a operação. Leituras não mudaram.
3. **Quem aparece na trilha** vem da sessão conferida por `Omie_exigirAcesso_` na mesma chamada (até 10 minutos). Gravação sem sessão (não há hoje)
   apareceria como "Rotina do sistema (sem sessão)".
4. **Primeiro dia:** a aba Contas fixas está vazia; nada é preparado até a Wanessa cadastrar. A rotina do fechamento grava `FIN_FECH_INICIO` = 11/2026
   e não abre nada; o **primeiro checklist automático é o de novembro, em 01/12/2026** (terça), dentro do expediente, com 6 atividades para a Wanessa
   (prazo 07/12 e 09/12 para o relatório, se não houver feriado cadastrado). Para começar por outubro, abrir à mão na tela.
5. **Atividades do fechamento** avisam a responsável como qualquer atividade nova (aviso de "Nova atividade"). Elas são restritas ao Financeiro.
6. **Caixa de decisões:** o pedido de estorno entra para o dono e o Charles e conta na escada da gestão como qualquer item da Diretoria (prazo 1 dia útil).
7. **Previsão de caixa:** cadastrar contas fixas muda a curva e o alerta do relatório semanal; é o objetivo, mas a primeira segunda-feira depois do
   cadastro pode mostrar um saldo previsto menor.

## 7. Suíte completa

O resultado está em `suite.txt` (execução em `suite-execucao.log`, capturas da suíte em `capturas-suite/`):

| | Arquivos | Passam | Falham | Saída diferente de zero |
|---|---|---|---|---|
| Esta rodada | 270 | 2566 | 0 | 0 |
| Referência | — | 2541 | 0 | — |

A diferença são os 25 testes dos quatro arquivos novos (9 + 8 + 6 + 2). O teste ajustado de propósito (`financeiro-omie-20261114`, 26 abas) passa com 25 de 25.
