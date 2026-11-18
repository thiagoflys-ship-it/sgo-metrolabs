# Relatório — B1 aprovação de pagamentos, C3 orçamento anual, lançamento avulso na conta corrente e parcelamento (18/11/2026)

**Base de trabalho:** `output/financeiro-20261116/cand24`. Antes da mudança, era idêntica à `cand23` (produção atual, `diff -rq` vazio).

**Especificação:** `ESPEC_ONDA2_FINANCEIRO.md`, seção 5 (Onda B, B1; Onda C, C3; "Segurança e auditoria") e `ESPEC_FINANCEIRO.md`, seção 1.3 e
itens 7, 10 e 13 da seção 6. Decisões do dono de 18/11/2026 aplicadas sem perguntar (lista abaixo, seção 4).

**O que não foi feito:** nada foi publicado e não houve commit. Não houve acesso à produção, ao banco nem ao `/opt/metrolabs/sgo/cofre`. Omie,
Caju e Gemini reais não foram chamados; nenhum e-mail saiu (nos testes, `SGO_notificar_` grava na memória). O servidor Node, a Frota/rastreador,
o chat do RH360, os PGT/POP gerados e o Portal do cliente não foram tocados. Nenhum cron novo (as rotinas entram em `Ges_rodada_`).

## 1. O que foi feito

### B1 — Aprovação de pagamentos (aba nova, `SGO_Financeiro_Pagamentos.js` e `JS_Financeiro_Pagamentos.html`)

- **Lista do dia.** A aba lê no Omie (só leitura, `ListarContasPagar` com `filtrar_por_status` ATRASADO e VENCEHOJE) as contas a pagar vencidas e
  as que vencem hoje, já marcadas; com "Também as que vencem em até 30 dias", acrescenta as a vencer (AVENCER, até 30 dias), desmarcadas, para a
  Wanessa escolher. "Enviar para aprovação" confere cada título de novo no Omie e grava um item por título em `FIN_PAG_ITENS` (título, documento,
  fornecedor, vencimento, valor do documento, quem enviou e quando). Nada é pago nem gravado no Omie.
- **Aprovar.** Só o dono e a Diretoria da lista de sigilo (`OmieRegras_podeAprovar_`, regra `APROVACAO_SO_DIRETORIA`); quem enviou não decide o
  próprio item (se o dono enviar, a Diretoria aprova, e vice-versa). "Aprovar todos" aprova num toque todos os itens que a pessoa pode decidir;
  "Recusar" e "Adiar" (com data) são item por item, com motivo de 10 letras ou mais. Tentativa de quem não pode: recusada com o quê/por quê/
  quem aprova e registrada como NEGADO no registro de acessos.
- **Trava da baixa.** `OmieOps_preparar_` (baixa de conta a pagar) chama `FinPag_exigirLiberacao_` antes de ler o saldo, e `OmieOps_apiConfirmar`
  confere de novo antes de enviar. Sem aprovação, a mensagem diz o quê, por quê, **de quem se espera a decisão e desde quando** e o que fazer
  ("ainda não passou pela lista", "está aguardando aprovação desde 16/11/2026 10:00 (enviado por …). Quem aprova: …", "foi recusado …",
  "foi adiado … para …"). Baixa acima do valor aprovado é recusada; baixa parcial deixa o restante liberado; quitado, o item vira PAGO
  (`FinPag_registrarPago_`). A prévia mostra quem aprovou e até que valor. Conta a receber não muda.
- **Lançamentos e baixas:** cada conta a pagar da lista mostra a situação da aprovação (aguardando de quem e desde quando, aprovado, recusado,
  adiado, pago). Na aba nova, "Registrar a baixa" abre a baixa do título aprovado.
- **Dispensa por valor:** chave nova `FIN_PAG_DISPENSA_ABAIXO` (Chaves e senhas > Regras do Financeiro), com validação; **vazia por padrão =
  nenhuma dispensa**. Nenhum valor foi gravado.
- **Aviso e pendência:** só para o dono e a Diretoria da lista de sigilo, sem valor nem fornecedor no assunto e no texto. O aviso (SGO+ e e-mail)
  sai na hora se o envio for dentro do expediente; fora dele, `FinPag_rodada_` (em `Ges_rodada_`, depois do `if (!ex.dentro)`) envia no próximo
  expediente, uma vez por lista. Pendência `fin_pag_aprovar` na central e na Caixa de decisões (`GES_TIPOS`, prazo 1 dia útil, `sigiloFin`,
  `soDiretoria`, quem enviou em `naoPode`). Faixa no topo do Painel para quem decide ("N pagamento(s) aguardando a sua aprovação").
- **Retirar da lista** (com motivo): para valor que mudou ou conta que não será paga; item com pagamento registrado não sai.

### C3 — Orçamento anual (aba nova, `SGO_Financeiro_Orcamento.js` e `JS_Financeiro_Orcamento.html`)

- **O SGO+ é a fonte.** Versões em `FIN_ORC_VERSOES` (ano, versão, situação, ponto de partida, motivo, valores por categoria e mês, totais, quem
  preparou, quem decidiu). Ponto de partida: em branco, cópia da versão vigente do ano anterior, realizado do ano anterior (o que o SGO+ já leu
  do Omie; os meses não lidos ficam vazios e a tela diz quais) ou revisão da vigente. Rascunho gravado **célula a célula** (merge); categoria
  nova conferida no plano de contas do Omie (ativa, despesa ou receita, nunca grupo ou transferência). **Importação CSV** (código; descrição
  opcional; janeiro a dezembro; `;` e vírgula nos centavos; arquivo até 200 KB ou texto colado): célula vazia mantém o valor; código
  inexistente ou valor inválido recusa a importação inteira com a linha e o motivo.
- **Aprovação:** só o dono e a Diretoria; quem preparou não aprova. Aprovada, vira a vigente e a anterior fica "substituída"; recusa pede motivo e
  mantém a vigente. Versão enviada ou aprovada não muda (revisar = nova versão). Aviso e pendência `fin_orc_aprovar` como no B1, sem valores.
- **Envio ao Omie:** a documentação pública do Omie (`financas/caixa/`, conferida em 18/11/2026) tem **só `ListarOrcamentos`**; não há método de
  inclusão ou alteração. Por isso o SGO+ só lê o Omie (`FIN_ORC_OMIE_GRAVA = false`), a tela diz isso e oferece a planilha CSV da versão vigente
  (identificada, pela rotina das outras planilhas) para quem quiser digitar no Omie.
- **Acompanhamento:** por mês, orçado (vigente) × realizado do Omie (`ListarOrcamentos`, `nValorRealilzado`), desvio em R$ e %, desfavorável em
  destaque (despesa acima ou receita abaixo), categorias com realizado e sem orçamento, e acumulado do ano **só dos meses com realizado lido**.
  O realizado fica em `FIN_ORC_REALIZADO` (só números por categoria); a fotografia diária guarda o do mês corrente; os outros meses são lidos
  sob pedido ("Ler o realizado deste mês no Omie").
- **Indicadores:** com versão vigente, I15 e G7 usam o orçado do SGO+ (despesas) e o realizado do Omie, e o texto diz a fonte; sem versão
  vigente, ficam exatamente como antes (previsto do Omie). **Relatório semanal:** seção nova "Orçamento: orçado × realizado" depois de
  Resultado (totais do mês, desvio do mês e acumulado, 10 maiores desvios); sem versão vigente, a seção diz que não há orçamento aprovado.

### Pendências da onda 1

- **Lançamento avulso na conta corrente** (`SGO_Financeiro_ContaCorrente.js` e `JS_Financeiro_ContaCorrente.html`): botão "Lançamento avulso
  na conta" em Lançamentos e baixas; tipos saída (categoria de despesa), entrada (receita) e transferência entre contas (conta de destino,
  categoria vazia ou de transferência). `IncluirLancCC` com `cCodIntLanc`, `cabecalho {nCodCC, dDtLanc, nValorLanc}`, `detalhes {cCodCateg,
  cTipo, cNumDoc, cObs}`, `transferencia {nCodCCDestino}` (campos conferidos na documentação pública). Mesmo caminho das outras gravações
  (`OmieOps_apiPrevia`/`OmieOps_apiConfirmar`, `acao = 'avulso'`): prévia, token, trava de envio repetido de 24 horas, gravação ligada, envios a
  conferir e trilha (`LANCAMENTO_CC`, "Lançamento avulso na conta corrente"). Não passa pela aprovação de pagamentos (não é baixa de conta a
  pagar). A prévia tem a linha **"A confirmar"**.
- **Parcelamento no novo lançamento:** campos "Parcelas" (1 a 48) e "Intervalo" (mensal no mesmo dia, com último dia no mês curto, ou 7 a 30
  dias). O valor é o total, dividido igual, com o centavo na última; referência `REF-1..N`; `numero_parcela` `001/00N`. Um `IncluirConta*` por
  parcela (a documentação não tem quantidade de parcelas por chamada). Progresso gravado depois de cada parcela: recusa ou Omie ocupado no meio
  não repete as lançadas e "Continuar as parcelas" (Envios a conferir) segue da que falhou, por até 24 horas; sem resposta, a parcela vai para
  conferência ("foi feito"/"não foi feito") e depois continua; "Encerrar sem as que faltam" fecha com motivo. Nova prévia igual fica barrada
  enquanto há parcelas lançadas. Alçada pelo total. Pedido aprovado (`SGO-`) e conta fixa (`FIX-`) não são parcelados por aqui.

### Ajuda, manual e assistente

- `JS_Omie_Ajuda.html`: guias "Como fazer nesta aba" das duas abas novas, 3 passos novos em Lançamentos e baixas e 30 explicações de campo
  (pagamentos, orçamento, avulso com chaves `ops-avulso:`, parcelas e intervalo). As células da grade do orçamento apontam
  (`aria-describedby`) para uma explicação única acima da grade.
- `SGO_Ajuda_Financeiro.js`: 3 passos e 4 problemas novos.
- `docs/MANUAL_PAINEL_FINANCEIRO.md` (continua só sigilo): tabela das abas, seções novas **8n, 8o e 8p**, 8 problemas, seção 10 e seção 11.
- Base do assistente regerada (`node _tools/gerar_base_assistente.cjs --docs docs --saida output/financeiro-20261116/cand24/SGO_AssistenteManuais.js`);
  o manual do Financeiro continua `acesso: ["sigilo"]`. `SGO_AssistenteErros.js`: três telas mapeadas para `omie`. `SGO_Omie_Sigilo.js`:
  nomes das 14 APIs novas no registro de acessos.

## 2. Arquivos (relativos à cand24)

**Novos:** `SGO_Financeiro_Pagamentos.js`, `SGO_Financeiro_Orcamento.js`, `SGO_Financeiro_ContaCorrente.js`, `JS_Financeiro_Pagamentos.html`,
`JS_Financeiro_Orcamento.html`, `JS_Financeiro_ContaCorrente.html`.

**Alterados** (fim de linha preservado, conferido arquivo a arquivo: CRLF continua CRLF, LF continua LF, o misto continua misto):
- `Index.html` (LF): inclui as três telas
- `JS_Omie_Gestao.html` (CRLF): 2 abas (28 no total), rotas, faixa "pagamentos aguardando a sua aprovação", rótulos do registro de acessos
- `JS_Omie_Operacoes.html` (CRLF): botão do avulso, campos de parcelas, situação da aprovação na lista, "Continuar as parcelas"/"Encerrar"
- `JS_Omie_Ajuda.html` (CRLF, com o CR solto que já existia)
- `SGO_Ajuda_Financeiro.js` (misto), `SGO_AssistenteErros.js`, `SGO_AssistenteManuais.js` (gerado)
- `SGO_Chaves.js`: chave `FIN_PAG_DISPENSA_ABAIXO` e validação
- `SGO_Financeiro_Foto.js`: passo "orçamento" guarda o realizado e usa o orçado do SGO+ quando há versão vigente
- `SGO_Financeiro_Indicadores.js`: textos de I15 e G7 com a fonte
- `SGO_Financeiro_Relatorio.js`: seção "Orçamento: orçado × realizado"
- `SGO_Financeiro_Trilha.js`: `IncluirLancCC` na trilha, documento com a parcela, código de integração e título do avulso
- `SGO_Gestao_Escada.js`: `FinPag_rodada_` no expediente
- `SGO_Omie.js`: `pagamentosPendentes` em `Omie_apiIniciar`
- `SGO_Omie_Gestao.js`: `OmieLer_orcamento_(payload, comCodigo)` (a api da tela continua devolvendo exatamente o mesmo)
- `SGO_Omie_Operacoes.js`: trava B1, parcelamento (prévia, envio por parcela, continuação, conferência), desvio para o avulso
- `SGO_Omie_Sigilo.js`: nomes das consultas

**Fora da cand24:** `docs/MANUAL_PAINEL_FINANCEIRO.md`; `tests/_financeiro_b1c3.cjs` (novo); `tests/financeiro-pagamentos-orcamento-b1.test.cjs`,
`-c3.test.cjs`, `-cc-parcelas.test.cjs`, `-telas.test.cjs` (novos); `tests/financeiro-omie-20261114.test.cjs` ajustado de propósito de 26 para 28 abas.

Diff completo: `legado-b1-c3.patch` (cand23 → cand24).

## 3. Testes

| Arquivo | Passam | Falham |
|---|---|---|
| financeiro-pagamentos-orcamento-b1 | 7 | 0 |
| financeiro-pagamentos-orcamento-c3 | 6 | 0 |
| financeiro-pagamentos-orcamento-cc-parcelas | 6 | 0 |
| financeiro-pagamentos-orcamento-telas | 2 | 0 |

Regressão direta (`rodar-lista.sh`): financeiro-onda-a-trilha 9/0, -fixas 8/0, -fechamento 6/0, omie-operacoes 20/0, financeiro-completo 23/0,
financeiro-config 8/0, financeiro-sigilo-geral 5/0, financeiro-onda2-e1e5 12/0, financeiro-relatorio-semanal 8/0, financeiro-cobranca-agenda 7/0,
financeiro-especialista 12/0, assistente-duvidas 12/0.

**Capturas reais** (`capturas/`, página completa do SGO+, 1366 e 390 px; 320 px conferido sem captura): aprovação de pagamentos (Financeiro e
Diretoria), lista a pagar com a situação da aprovação, prévia do lançamento parcelado, lançamento avulso (transferência), orçamento (rascunho
e acompanhamento) e decisão do orçamento pela Diretoria. O teste confere: sem erro de JavaScript, sem rolagem lateral, guia aberto, explicação
em todo campo, texto justificado; e que conta fora da lista de sigilo não vê nada (NEGADO registrado).

**Suíte completa:** ver a seção 7 e `suite.txt`.

## 4. Decisões adotadas

- Do dono (18/11/2026): aprovação só do dono e do Charles; quem preparou não aprova; a Wanessa nunca aprova; toda conta a pagar passa pela lista
  (dispensa vazia); aviso e pendência só para o dono e o Charles, sem valor, no expediente; orçamento com o SGO+ como fonte; tudo que grava no
  Omie pela trilha, com prévia e confirmação; sigilo só a lista.
- **Nenhuma caixa nova em Acessos:** ver = lista de sigilo; enviar, preparar, retirar e lançar = `FIN_OMIE_LANCAR`; decidir = dono e Diretoria
  da lista. O lote 3 de Acessos não muda.
- **Aprovação vale até o pagamento** (não expira sozinha), pelo valor do documento na hora do envio; mudou o valor, retira e envia de novo. O
  dono não deu prazo de validade; não inventei um.
- **Uma lista "a pagar hoje" sem limite de horário:** o Financeiro pode enviar mais de uma vez no dia; cada envio é um lote e um aviso.
- **Avulso fora do B1 e da alçada:** registra o que o banco já fez ou transferência entre contas da empresa; a trilha registra tudo.
- **Parcelamento por chamadas individuais** (e não `IncluirContaPagarPorLote`): o lote não diz quais parcelas entraram quando falha, e a
  continuação parcela a parcela evita lançar em dobro.
- **Acumulado do orçamento só com meses lidos**, para não comparar orçado com realizado zero.
- APIs com prefixo `Omie*` (`OmiePag_`, `OmieOrc_`, `OmieLcc_`), para entrar no registro de acessos e nos ensaios de tela existentes.

## 5. O que ficou para depois e por quê

- **Gravação de orçamento no Omie:** não existe método na API pública (só `ListarOrcamentos`). Se o Omie publicar um, basta implementar o envio
  pela trilha e mudar `FIN_ORC_OMIE_GRAVA`.
- **[A CONFIRMAR NA 1ª OPERAÇÃO]:** (1) se `nValorRealilzado` é só o realizado ou "realizado e a realizar", e se `ListarOrcamentos` traz
  categorias sem previsto no Omie; (2) no `IncluirLancCC`, se o Omie decide saída/entrada pela categoria com valor positivo, se a
  transferência cria sozinha a entrada no destino e se exige categoria, e se `cCodIntLanc` repetido é recusado; (3) se `IncluirContaPagar`
  aceita `numero_parcela` "001/003" sem outro campo de parcelamento (a documentação diz "999/999").
- **B1 não bloqueia o Omie:** o SGO+ não impede que alguém registre o pagamento direto no Omie. Uma conferência automática (baixa no Omie sem
  aprovação no SGO+, pela fotografia diária) seria a próxima etapa natural.
- **Segurança transversal** (segunda verificação por código para mudar a dispensa ou a alçada, revisão mensal de acessos, alerta fora do
  expediente): não fazia parte do pedido; a chave nova segue a regra de Chaves e senhas (só o responsável pelo sistema grava).
- **Rateio** no lançamento (depende de C1) e **exclusão de conta a receber** (método do Omie a confirmar) continuam como na onda A.
- **Exclusão/estorno de lançamento avulso** (`ExcluirLancCC`) não foi feita: a trilha não oferece "Pedir exclusão" para o avulso; correção
  direto no Omie por enquanto.

## 6. Riscos e o que muda no primeiro dia para a Wanessa

1. **Todo pagamento que ela registrava direto pelo SGO+ passa a esperar aprovação.** A partir da publicação, "Registrar baixa" em conta a pagar
   não prepara nada sem a lista aprovada (a dispensa por valor está vazia). No primeiro dia, ela precisa abrir **Aprovação de pagamentos**, enviar
   a lista (as vencidas e as de hoje já vêm marcadas) e esperar o dono ou o Charles tocar em "Aprovar todos". Se ninguém aprovar, nenhuma
   baixa de conta a pagar sai pelo SGO+ naquele dia. Recomendo avisar o dono e o Charles antes de publicar e combinar um horário da lista.
2. **Baixas de conta a receber, lançamentos e boletos não mudam.** Contas a pagar de títulos que ela já pagou no banco e ainda não baixou também
   precisam passar pela lista (a regra é sobre a baixa).
3. **Lista enviada fora do expediente** só avisa o dono e o Charles no próximo expediente (decisão de aviso em expediente). A pendência
   aparece na hora na Caixa de decisões.
4. **Orçamento:** a aba começa vazia; nada muda nos Indicadores até a primeira versão ser aprovada. A fotografia passa a gravar o realizado do
   mês em `FIN_ORC_REALIZADO` (tabela criada na primeira rodada).
5. **Parcelamento:** se o Omie recusar no meio, ficam títulos parciais no Omie até alguém continuar ou encerrar; a tela e "Envios a conferir"
   mostram. A trilha registra cada parcela.
6. **Avulso:** o sentido (saída/entrada) do `IncluirLancCC` está a confirmar; a primeira tarifa deve ser lançada acompanhada e conferida no
   extrato do Omie.
7. `Omie_requisitar_`, as leituras e a api `Omie_apiOrcamento` não mudaram de forma (teste de equivalência E2 passa).

## 7. Suíte completa

O resultado está em `suite.txt` (execução em `suite-execucao.log`, capturas da suíte em `capturas-suite/`):

| | Arquivos | Passam | Falham | Saída diferente de zero |
|---|---|---|---|---|
| Esta rodada | 274 | 2587 | 0 | 0 |
| Referência | 270 | 2566 | 0 | — |

A diferença são os 21 testes dos quatro arquivos novos (7 + 6 + 6 + 2). O teste ajustado de propósito (`financeiro-omie-20261114`, 28 abas) passa.
