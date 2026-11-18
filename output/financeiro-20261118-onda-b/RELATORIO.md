# Relatório — Onda B do Financeiro: B2 Compras no Omie, B3 Caju no Omie, B4 conferência com o Omie e achado M8 (18/11/2026)

**Base de trabalho:** `output/financeiro-20261116/cand25`. Antes da mudança, era idêntica à `cand24` (produção atual, `diff -rq` vazio).

**Especificação:** `ESPEC_ONDA2_FINANCEIRO.md`, seção 5 (Onda B: B2, B3, B4) e `ESPEC_FINANCEIRO.md`, itens 8 e 9 da seção 6 e achado M8.
Decisões do dono de 18/11/2026 aplicadas sem perguntar (seção 4).

**O que não foi feito:** nada foi publicado e não houve commit. Não houve acesso à produção, ao banco nem ao `/opt/metrolabs/sgo/cofre`. Omie, Caju
e Gemini reais não foram chamados; nenhum e-mail saiu (nos testes, `SGO_notificar_` grava na memória e o Omie é simulado). O servidor Node, a
Frota/rastreador, o chat do RH360, os PGT/POP gerados e o Portal do cliente não foram tocados. Nenhum cron novo.

## 1. O que foi feito

### Aba nova "Compras e Caju no Omie" (Painel financeiro; `SGO_Financeiro_Espelho.js` e `JS_Financeiro_Espelho.html`)

- **O SGO+ é o registro principal; o Omie é o espelho.** A aba lista o que deve virar conta a pagar no Omie, sem digitar de novo:
  - **B2, compras:** vencimentos de compras **faturadas e por boleto** cuja compra foi **conferida** pelo Financeiro em Compras (um item por
    vencimento, referência `CMP-<requisição>-<parcela>`; se a parcela for refeita depois de lançada, a nova ganha `-R2`). Compra não conferida ou
    com conferência divergente fica em "Aguardando a origem", com o que falta. Compra no cartão de crédito entra pela fatura.
  - **B2, faturas:** faturas dos cartões **fechadas** (ou fechadas com ressalva) em Compras > Conciliação das faturas, pelo total do extrato (já com
    os estornos do M8), vencimento pelo dia do cartão (sem o dia, a tela pede), referência `FAT-<final>-<AAAAMM>`.
  - **B3, Caju:** cada carga paga ao Caju, de viagem (`VIA_CARGAS`) e da Recarga Caju da rotina (`RCJ_CARGAS`), pela API ou registrada à mão
    (referências `CJU-V-<carga>` e `CJU-R-<carga>`). A **taxa de serviço** do Caju vira item separado (`...-TX`), para ir na própria categoria. A
    observação leva a viagem (número, destino, colaborador, centro de custo) ou a recarga (número, período, colaborador); o documento é a nota do
    Caju quando houver.
- **Início:** a lista começa no mês da primeira abertura (`FIN_ESPELHO_INICIO`, gravado sozinho; troca em Chaves e senhas). O que é anterior foi
  lançado à mão, como antes; nada antigo aparece de repente.
- **"Preparar lançamento"** (caixa `FIN_OMIE_LANCAR`) abre Lançamentos e baixas com o novo lançamento preenchido (documento, valor, vencimento,
  observação, referência única). O fornecedor vem da **busca do Omie já com o CNPJ** do fornecedor de Compras (ou "Caju"); se não houver cadastro,
  o botão "Cadastrar no Omie" de sempre (prévia e confirmação, completando com Compras > Fornecedores). Depois do primeiro lançamento, o SGO+
  **lembra** o fornecedor do mesmo CNPJ, o emissor do mesmo cartão e o Caju. **Só a confirmação na prévia grava no Omie** (`OmieOps_apiPrevia`/
  `OmieOps_apiConfirmar`: token, alçadas, gravação ligada, trilha `FIN_OMIE_OPERACOES`, envios a conferir). A prévia mostra a "Origem no SGO+" e
  avisa quando o valor digitado é diferente. A mesma referência é recusada (aba e digitação) depois de lançada ou dispensada; esses itens não são
  parcelados por aqui.
- **"Já lancei direto no Omie"** (o que foi conferido e, opcional, o número do título) e **"Dispensar"** (motivo), ambos desfazíveis com motivo e
  registrados no registro de acessos (sem valor). Item lançado pelo SGO+ não se desfaz pela aba: a exclusão é pela Trilha das operações.
- **Pagamento (B1, sem alçada nova):** a conta a pagar criada aparece na Aprovação de pagamentos como qualquer outra. Quando a baixa aprovada é
  confirmada pelo SGO+, o item fica "Pago"; se quitou uma compra, o vencimento em `CMP_PARCELAS` passa a PAGA (só `SITUACAO`, `PAGO_EM`,
  `PAGO_POR_ID`, `PAGO_POR_NOME`, `ATUALIZADO_*`, com histórico da requisição). Compra e carga já pagas antes do lançamento: a prévia avisa que a
  baixa vai pela lista, com a data do pagamento.
- **B4, conferir com o Omie:** "Conferir com o Omie" lê no Omie (sem cache, sem gravar) até 20 títulos lançados por toque e compara valor e
  situação; título pago fora do SGO+ fica registrado como pago (sem mexer em Compras). **"Diferenças com o Omie"** mostra, cada uma com o que
  fazer: valor diferente no Omie, título cancelado ou não encontrado, fatura reaberta em Compras depois do lançamento, valor mudado na origem,
  vencimento cancelado em Compras depois do lançamento e compra paga em Compras > A pagar sem a baixa no Omie.
- **Pendências** (só o Financeiro da lista de sigilo; sem ninguém, a Diretoria da lista), só a contagem, sem valor nem descrição:
  `fin_esp_lancar` (item vencido sem estar no Omie) e `fin_esp_divergencia` (diferenças). Nada é cobrado antes da primeira abertura da aba.
  **Faixa** em Lançamentos e baixas com as contagens e o atalho.
- **Categorias:** 8 tipos novos no de-para das Regras do Financeiro: `COMPRA_CLIENTE`, `COMPRA_COMERCIAL`, `COMPRA_VEICULO`, `COMPRA_INTERNO`
  (pela finalidade da requisição), `FATURA_CARTAO`, `CAJU_VIAGEM`, `CAJU_RECARGA`, `CAJU_TAXA`, todos de conta a pagar e aceitando regra por CNPJ.
  **Padrão vazio**: nenhuma regra foi gravada; a Wanessa escolhe na prévia e a prévia confere a categoria no Omie.
- **Centro de custo:** chave `FIN_ESPELHO_DEPARTAMENTO` (Chaves e senhas > Regras do Financeiro), **vazia = não envia** (padrão). Com
  `CENTRO_CUSTO`, a carga de viagem leva `distribuicao: [{ cCodDep: <CODIGO_OMIE do centro>, nPerDep: 100 }]` e a prévia mostra a linha
  "Departamento (centro de custo)". As duas configurações aparecem (só leitura) em Regras do Financeiro.

### Achado M8 — estorno na fatura do cartão (`SGO_Compras_Faturas.js`)

Conferido antes: **não estava corrigido** (o valor negativo era descartado como "estorno ou crédito: não é compra"). Agora:
- O crédito/estorno (negativo que não é pagamento nem saldo) **entra como linha própria**; a prévia conta os estornos e quantos têm origem.
- **Casamento automático** com a linha da compra de origem: mesmo final, mesmo valor (até R$ 0,05), descrição parecida (palavras em comum, sem
  "estorno", "crédito" etc.), data igual ou anterior, em qualquer fatura do cartão, uma origem por estorno. Casado: "Estorno casado com a
  compra"; a parcela ganha `ESTORNO_EXTRATO_ID`, `ESTORNO_VALOR`, `ESTORNADA_EM` ("Estornada na fatura", histórico `ESTORNADA`); se a compra não
  tinha sido informada, a linha dela é justificada sozinha (a cobrança ao responsável do cartão acaba).
- Sem origem: "Estorno sem a compra de origem" (conta como item em aberto para fechar a fatura): "Casar com a compra" (lista as compras do mesmo
  cartão, as de valor mais perto primeiro; quem comprou não casa a própria), "Justificar", "Desfazer" (devolve a compra não informada à
  cobrança), "Reabrir".
- Totais: o extrato soma o estorno; as compras informadas somam o estorno casado; o relatório A4 da conciliação mostra os estornos.
- Colunas novas no fim das abas: `CMP_EXTRATO.ORIGEM_EXTRATO_ID`; `CMP_PARCELAS.ESTORNO_EXTRATO_ID`, `ESTORNO_VALOR`, `ESTORNADA_EM` (a marca de
  garantia de colunas foi para `CMP_ABAS_OK_V4`, para criar as colunas na produção).

### Ajuda, manuais e assistente

- `JS_Omie_Ajuda.html`: guia "Como fazer nesta aba" da aba nova, passo atualizado em Lançamentos e baixas e explicação dos 3 campos novos.
- `SGO_Ajuda_Financeiro.js`: passo novo e 3 problemas. `SGO_Ajuda_Compras.js` (Conciliação das faturas): passos, selos e problema do estorno.
- `docs/MANUAL_PAINEL_FINANCEIRO.md` (continua só sigilo): tabela das abas, nota das caixas, seção nova **8q**, 3 problemas, seção 10 e seção 11.
- `docs/MANUAL_COMPRAS_FINANCEIRO.md`: estorno na conciliação (passo 5 e duas situações) e seção "Compras e faturas no Omie" marcada
  `<!-- assistente: acesso=sigilo -->`. `docs/MANUAL_CONCILIACAO_CAJU.md`: seção "Cargas do Caju no Omie" marcada `acesso=sigilo`.
- Base do assistente regerada (`node _tools/gerar_base_assistente.cjs --docs docs --saida output/financeiro-20261116/cand25/SGO_AssistenteManuais.js`);
  as duas seções novas dos manuais de Compras e da Conciliação Caju saem com `acesso: ["sigilo"]`. `SGO_AssistenteErros.js`: tela nova mapeada
  para `omie`. `SGO_Omie_Sigilo.js`: nomes das 5 APIs novas.

## 2. Arquivos (relativos à cand25)

**Novos:** `SGO_Financeiro_Espelho.js`, `JS_Financeiro_Espelho.html`.

**Alterados** (fim de linha preservado, conferido arquivo a arquivo: CRLF continua CRLF, LF continua LF, o misto continua misto):
- `Index.html` (LF): inclui a tela nova
- `JS_Omie_Gestao.html` (CRLF): aba "Compras e Caju no Omie" (29 abas), rota e rótulo do registro de acessos
- `JS_Omie_Operacoes.html` (CRLF): faixa da aba nova e o departamento (oculto, com a linha explicativa) no novo lançamento
- `JS_Omie_Ajuda.html` (CRLF), `JS_Omie_Regras.html` (LF): as duas configurações novas
- `JS_Compras.html` (CRLF): estornos na conciliação (selos, ações, janela de casar, prévia, contador de abertos)
- `SGO_Omie_Operacoes.js`: trava da referência já lançada, linhas da origem na prévia, departamento, trava de parcelamento (CMP/FAT/CJU, com a
  frase antiga preservada), `op.saldoDepois` na baixa e os dois ganchos depois da confirmação
- `SGO_Omie_Regras.js`: 8 tipos no de-para e as configurações na tela; `SGO_Chaves.js`: `FIN_ESPELHO_DEPARTAMENTO` e `FIN_ESPELHO_INICIO`, com validação
- `SGO_Compras_Config.js` (CRLF): colunas do estorno e `CMP_ABAS_OK_V4`; `SGO_Compras_Faturas.js`: M8; `SGO_Compras_Relatorios.js`: estornos no A4
- `SGO_Ajuda_Financeiro.js` (misto), `SGO_Ajuda_Compras.js` (CRLF), `SGO_AssistenteErros.js`, `SGO_AssistenteManuais.js` (gerado), `SGO_Omie_Sigilo.js`

**Fora da cand25:** `docs/MANUAL_PAINEL_FINANCEIRO.md`, `docs/MANUAL_COMPRAS_FINANCEIRO.md`, `docs/MANUAL_CONCILIACAO_CAJU.md`;
`tests/_financeiro_onda_b.cjs` (novo); `tests/financeiro-onda-b-compras.test.cjs`, `-caju.test.cjs`, `-faturas.test.cjs`, `-telas.test.cjs` (novos);
`tests/financeiro-omie-20261114.test.cjs` ajustado de propósito de 28 para 29 abas; `tests/assistente-manuais-acesso-20261117.test.cjs` com o parágrafo reescrito pelo M8 na lista de justificados.

Diff completo: `legado-onda-b.patch` (cand24 → cand25).

## 3. Testes

| Arquivo | Passam | Falham |
|---|---|---|
| financeiro-onda-b-compras | 7 | 0 |
| financeiro-onda-b-caju | 5 | 0 |
| financeiro-onda-b-faturas | 3 | 0 |
| financeiro-onda-b-telas | 2 | 0 |

Regressão direta (`rodar-lista.sh`): compras 17/0, compras-informar-conciliacao 10/0, compras-acesso-financeiro-delegado 7/0, compras-equipamento-cadastro
4/0, conciliacao-caju 14/0, deposito-viagem 22/0, deposito-viagem-prestacao 13/0, recarga-caju 12/0, omie-operacoes 20/0, omie-financeiro 13/0,
omie-conciliacao 9/0, omie-faturamento 12/0, financeiro-completo 23/0, financeiro-config 8/0, financeiro-sigilo-geral 5/0, financeiro-onda-a-fixas 8/0,
-trilha 9/0, -fechamento 6/0, financeiro-pagamentos-orcamento-b1 7/0, -c3 6/0, -cc-parcelas 6/0 (a primeira rodada falhou 1 porque eu tinha mudado a
frase da trava de parcelamento; a frase antiga foi preservada), financeiro-onda2-e1e5 12/0, financeiro-onda3-a 7/0, financeiro-cobranca-agenda 7/0,
financeiro-relatorio-semanal 8/0, financeiro-especialista 12/0, poderes-lote3 4/0, ajuda-sem-recurso-admin 1/0, financeiro-omie-20261114 25/0.

**Capturas reais** (`capturas/`, página completa do SGO+, 1366 e 390 px; 320 px conferido sem captura): a aba nova (diferença, para lançar,
aguardando, lançados), o lançamento de compra preparado (fornecedor lembrado), a prévia com a origem, a carga do Caju preparada (busca "Caju"
rodando), Regras do Financeiro (tipos novos e configurações) e Compras > Conciliação das faturas com estornos e a janela de casar o estorno. O
teste confere: sem erro de JavaScript, sem rolagem lateral, guia aberto, explicação em todo campo, texto justificado; conta fora da lista de
sigilo não vê nada (NEGADO registrado).

**Suíte completa:** ver a seção 7 e `suite.txt`.

## 4. Decisões adotadas

- Do dono (18/11/2026): SGO+ principal, Omie espelho pela API; B2 e B3 sim; aprovação só do dono ou do Charles (nenhuma alçada nova; criar a
  conta a pagar é da Wanessa com prévia e confirmação); centro de custo e rateio não decididos (vazio = não envia); categorias pelo de-para com
  padrão vazio; fornecedor pelo cadastro do Omie (cadastro com confirmação se faltar); nada enviado sozinho; sigilo só a lista; Compras continua vendo
  Compras como antes (nenhuma informação do Omie foi posta nas telas de Compras e da Conciliação Caju).
- **Sem caixa nova em Acessos:** ver e conferir = lista de sigilo (`FIN_OMIE_CONSULTAR`); preparar, marcar, dispensar e desfazer = `FIN_OMIE_LANCAR`.
- **Compra entra só depois da conferência do Financeiro** (espec, item 8: "ao conferir uma compra faturada/boleto"). A baixa não é "ao marcar como
  pago em Compras": pela decisão B1, toda baixa passa pela lista aprovada; o caminho ficou o inverso (baixa aprovada no Omie → pago em Compras).
  "Marcar como pago" em Compras continua funcionando; se for usado antes, a aba mostra a diferença até a baixa passar pela lista.
- **Taxa do Caju como conta a pagar separada** (e não rateio de categorias num título só): o lançamento do SGO+ tem uma categoria por título e o
  rateio depende do contador. Consequência: duas baixas para um pagamento ao Caju.
- **Carga pelo registro da carga** (`VIA_CARGAS`/`RCJ_CARGAS`), e não pelo pedido: cobre a API e a carga manual sem contar duas vezes; a taxa vem
  do pedido. Carga em homologação não gera carga e não aparece.
- **Vencimento** da compra = vencimento do boleto/faturado; da fatura = dia do cartão; da carga do Caju = data da carga (já paga).
- **Conferência com o Omie sob demanda** (botão, 20 títulos por toque), sem rotina nova, para não gastar chamadas do Omie todo dia.

## 5. O que ficou para depois e por quê

- **Compras pagas na hora (PIX, débito, transferência, dinheiro) e reembolsos a colaborador** não entram na aba: a especificação (item 8) pede só
  faturado/boleto e a fatura; o à vista já saiu do banco (caberia o lançamento avulso ou título + baixa) e o reembolso exige o colaborador como
  fornecedor no Omie (CPF). A forma certa depende do contador.
- **Rateio** de categorias e departamentos (fatura do cartão por finalidade de cada compra; um título Caju com crédito e taxa): depende de C1.
- **Saída da previsão de caixa:** os itens ainda não lançados não entram na Agenda/previsão de 90 dias (as compras a pagar já estavam fora antes);
  entram pela fotografia do Omie depois de lançados.
- **Exclusão do título quando a origem é cancelada:** a aba aponta e manda pela Trilha das operações (exclusão já existente, dono/Diretoria).
- **[A CONFIRMAR NA 1ª OPERAÇÃO]:** (1) formato do departamento em `IncluirContaPagar` (`distribuicao` com `cCodDep` e `nPerDep: 100`), só se a
  chave for ligada; (2) se a recusa do Omie para `codigo_lancamento_integracao` repetido aparece (o SGO+ já recusa antes); (3) a conta corrente da
  baixa das cargas pagas **com o saldo da conta Caju** (combinar com o contador se é a conta "Caju" no Omie); (4) o fornecedor do Omie de cada
  cartão (banco ou emissor); (5) a mensagem do Omie para título excluído em `ConsultarContaPagar` (o SGO+ trata "não encontrado/não existe");
  (6) estornos reais do banco: a descrição do crédito parecida com a da compra (o casamento automático exige palavra em comum; se o banco usar
  outra descrição, o estorno fica "sem a compra de origem" e é casado à mão).

## 6. Riscos e o que muda no primeiro dia

**Para a Wanessa:**
1. Aparece a aba **Compras e Caju no Omie**; na primeira abertura a lista começa no mês corrente (11/2026). Os itens de novembro que ela já lançou
   à mão no Omie precisam de "Já lancei direto no Omie" (com o número do título, se tiver), senão viram pendência no vencimento.
2. As categorias vêm vazias até ela (ou o dono) gravar o de-para em Regras do Financeiro; escolher na prévia funciona desde o primeiro dia.
3. Cada conta a pagar criada entra na Aprovação de pagamentos (dono/Charles aprovam); a carga do Caju gera duas (crédito e taxa).
4. Novas pendências (vencido sem lançar, diferenças) só para ela e para a Diretoria da lista, sem valores.

**Para Compras:**
1. Nada muda nas telas de quem compra. Na Conciliação das faturas (Financeiro), a próxima importação passa a trazer os **estornos** como linhas: o
   que casar sozinho some da cobrança; o estorno sem origem fica em aberto até casar ou justificar (a fatura com ele só fecha com ressalva).
2. O vencimento pago pela baixa aprovada no Omie aparece como pago em Compras > A pagar com "baixa no Omie, título N".

**Riscos:** a referência `CMP-<requisição>-<parcela>` depende do número da requisição (não muda); faturas reabertas e parcelas refeitas depois do
lançamento viram diferença (nunca correção automática no Omie); o casamento de estornos por descrição pode não casar extratos com descrições
muito diferentes (fica para o manual, sem erro).

## 7. Suíte completa

O resultado está em `suite.txt` (execução em `suite-execucao.log`, capturas da suíte em `capturas-suite/`):

| | Arquivos | Passam | Falham | Saída diferente de zero |
|---|---|---|---|---|
| Esta rodada | 278 | 2604 | 0 | 0 |
| Referência | 274 | 2587 | 0 | — |

A diferença são os 17 testes dos quatro arquivos novos (7 + 5 + 3 + 2). Ajustados de propósito: `financeiro-omie-20261114` (29 abas) e
`assistente-manuais-acesso-20261117` (o parágrafo 4 da conciliação no manual de Compras foi reescrito pelo M8 e entrou na lista de parágrafos
justificados, P12); os dois passam.
