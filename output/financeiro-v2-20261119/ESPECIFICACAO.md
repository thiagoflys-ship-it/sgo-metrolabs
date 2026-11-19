# Financeiro v2 — Especificação de finanças (Fase 1)

**Data:** 19/11/2026
**Pedido:** `PLANO.md`
**Para quem:** designer (fase 2) e desenvolvimento (fase 3)
**Base do código atual:** `output/financeiro-20261116/cand34`, igual à produção

**Medições feitas em produção, só leitura, de 08:00 a 08:50 de 19/11:**
- Banco do SGO+: consultas com `default_transaction_read_only`.
- Omie: cerca de 150 chamadas de leitura (Listar/Pesquisar), com 2,5 s entre elas, numa cópia temporária do legado no contêiner (`/tmp/ensV2`, já apagada).

**O que não foi feito:**
- Nenhuma gravação no Omie, no banco do SGO+ nem em banco financeiro.
- Nenhuma leitura de valor de chave. Só se conferiu o **nome** das chaves gravadas.
- Nada tocado em `/opt/metrolabs/sgo/cofre`.

**Arquivo irmão:** `CREDENCIAIS_PARA_O_DONO.md`, versão curta para o dono.

---

## 0. Resumo em 12 linhas

1. **A Wanessa ainda opera no Omie, não no SGO+.**
   - Volume real: cerca de **560 contas a pagar** e **110 a receber** lançadas por mês, **470 pagamentos** e **90 recebimentos** baixados por mês, cerca de **505 movimentos** de conta corrente por mês (24 por dia útil).
   - No SGO+, desde 16/11, ela fez 2 baixas/operações e 2 conferências de conciliação.
2. **72 % das contas a pagar são digitadas à mão no Omie** (origem `MANP`, outubro). Só 12 % vêm de compras/notas e 10 % são repetições automáticas.
3. **A conciliação já é feita no Omie para quase tudo, menos o Itaú:**

   | Conta | Conciliado em outubro |
   |---|---|
   | Sicredi matriz | 302 de 303 |
   | Caixa matriz | 18 de 18 |
   | Sicoob | 67 de 80 |
   | Itaú Metrolabs | **56 de 196** |

4. **Existe um único Omie (uma empresa, a matriz, CNPJ final 0001-21).** A filial e a prestadora aparecem só como **contas bancárias** dentro dele ("Sicredi filial", "Sicredi prestadora", "Itaú Unibanco Prestadora", "CAIXA FILIAL") e como **departamentos** ("MATRIZ GOIÂNIA", "FILIAL RIO DE JANEIRO"). Nenhum título de outubro usou departamento. O modelo de 3 CNPJs precisa funcionar nos dois cenários (seção 4).
5. **Cadastro de fornecedores pobre:**
   - 3.912 cadastros;
   - nos 3.000 primeiros lidos: **0 com dados bancários ou Pix**, 65 % com endereço, 37 % com e-mail.
   - Por isso não existe pagamento automático hoje.
6. **Nenhuma chave de banco está gravada no SGO+:** nenhuma `SICREDI_*`, nenhuma `CAJU_*`. O dono "tem a chave", mas ela ainda não foi gravada. Só o Omie (matriz) está configurado.
7. **O Omie não cobre o banco.** A API do Omie não paga (não tem remessa nem pagamento), não emite guia de imposto e não traz extrato do banco: o `ListarExtrato` é o extrato **do Omie**. Pagar, receber por Pix/boleto próprio e ler extrato exigem as **APIs dos bancos**.
8. **Os bancos exigem certificado (mTLS)** em quase tudo:
   - Sicredi: Pix, extrato, saldo e Multipag;
   - Sicoob: todas as APIs;
   - Itaú: todas as APIs.

   O `UrlFetchApp` do legado (`sgo_servidor/src/compat/basicos.ts`) **não envia certificado de cliente**. Os conectores bancários precisam de um serviço novo no servidor Node (seção 5.6).
9. **Pagamento por API: o que se sabe hoje.**
   - **Sicredi** (Multipag) e **Sicoob** (Pagamentos, Pix Pagamentos, SPB): existe, mas os detalhes estão na área logada do portal.
   - **Itaú:** não há API pública de pagamentos (SISPAG é por arquivo).
   - **Caju:** a API não traz o extrato dos gastos.
10. **Dados com cara de erro de categoria:** "Tarifas Bancárias" somou **R$ 275.100,85** em outubro, mas só R$ 4.755 eram tarifas de fato (47 lançamentos). R$ 170.335 vieram de 7 débitos automáticos e R$ 100.012 de 2 Pix classificados como tarifa. Isso distorce DRE e indicadores; conferir com o contador.
11. **O que o v2 precisa fazer (além do que já existe):**
    - transferências (entre contas e entre empresas);
    - cadastro completo de fornecedor (banco, Pix, endereço);
    - pagamento pelo banco com aprovação;
    - recebimento por Pix/boleto do banco com baixa automática;
    - conciliação automática pelo extrato da API;
    - notas (consulta, PDF/XML, cancelamento);
    - calendário e pagamento de guias;
    - relatórios (DRE, fluxo, aging, por empresa e por centro de custo);
    - multiempresa.
12. **O que depende do dono:** CNPJs e Omie de cada empresa; gravar Sicredi e Caju; Sicoob e Itaú; decisões das seções 4.7, 6 e 12.

---

## 1. Rotina real (números medidos)

### 1.1 Volume por mês no Omie (contagem pelo próprio Omie, `nTotRegistros`)

| Mês | CP por vencimento | CR por vencimento | CP lançadas (inclusão) | CR lançadas | Pagamentos baixados | Recebimentos baixados | Movimentos na conta corrente | Movimentos de transferência | NF-e saída | NF-e entrada | NFS-e emitidas |
|---|---|---|---|---|---|---|---|---|---|---|---|
| mai/26 | 321 | 84 | 303 | 96 | 480 | 78 | 376 | 10 | 44 | 67 | 31 |
| jun/26 | 295 | 94 | 446 | 127 | 297 | 97 | 393 | 16 | 46 | 72 | 51 |
| jul/26 | 348 | 140 | 637 | 123 | 338 | 120 | 466 | 20 | 52 | 78 | 29 |
| ago/26 | 544 | 108 | 786 | 91 | 535 | 86 | 469 | 10 | 34 | 67 | 38 |
| set/26 | 637 | 104 | 660 | 104 | 655 | 86 | 726 | 20 | 49 | 58 | 34 |
| out/26 | 524 | 119 | 533 | 116 | 509 | 87 | 601 | 14 | 40 | 63 | 39 |
| nov/26 (até 19) | 492 | 96 | 369 | 53 | 414 | 60 | 473 | 2 | 25 | 38 | 23 |
| **Média mai–out** | **445** | **108** | **561** | **110** | **469** | **92** | **505** | **15** | **44** | **68** | **37** |

**Como ler a tabela:**
- "Movimentos de transferência" = `CCT`. Cada transferência gera 2 movimentos (saída e entrada), ou seja, cerca de **7 transferências entre contas por mês**.
- NF-e de entrada = notas de fornecedores registradas no Omie.
- NFS-e = só as faturadas (status F).

### 1.2 Dinheiro que passou pelo caixa (fotografia diária do SGO+, `FIN_FOTO_MES`, regime de caixa, sem transferências)

| Mês | Recebido | Pago |
|---|---|---|
| dez/25 | 739.497,67 | 453.404,86 |
| jan/26 | 285.055,47 | 928.137,72 (inclui aplicação CDB 520.000) |
| fev/26 | 389.769,94 | 544.003,32 |
| mar/26 | 348.364,02 | 441.896,66 |
| abr/26 | 426.666,87 | 470.673,78 |
| mai/26 | 312.670,89 | 454.494,29 |
| jun/26 | 828.127,53 | 532.617,71 |
| jul/26 | 788.492,97 | 1.018.867,97 (inclui "EMPRESTIMO" 467.690,87) |
| ago/26 | 467.718,57 | 585.692,27 |
| set/26 | 259.635,89 | 654.279,60 |
| out/26 | 955.269,68 | 774.355,75 (inclui "Tarifas Bancárias" 275.100,85, ver resumo, item 10) |
| nov/26 (até 17) | 336.870,66 | 332.586,54 |

**Despesas que mais aparecem todo mês** (categorias do Omie): Compras de Mercadorias para Revenda (100 a 235 mil), Salários (32 a 56 mil), Serviço Contratado (28 a 57 mil), Pró-Labore (15 a 35 mil), Cartão de crédito, EMPRESTIMO / Pagamento de Empréstimos, USO E CONSUMO, reembolso funcionário, ISS, Aluguel, Frete, Vale Refeição/Transporte, CARTÃO CAJU/FLASH BENEFÍCIO, Contabilidade, Tarifas Bancárias.

**Impostos que aparecem pagos no Omie:** ISS (5,4 a 9,9 mil por mês), COFINS/PIS, ICMS, Simples Nacional (DAS), INSS, FGTS, IRRF. O DAS aparece pago dentro do Omie da matriz, que **não é optante do Simples**. Provavelmente é a guia da **prestadora**, paga pela conta da prestadora ou da matriz. Confirmar com a Wanessa e o contador.

### 1.3 Posição em 17/11 (fotografia `FIN_FOTOS`)

**A receber:**
- em aberto: R$ 690.014,73;
- vencido: R$ 293.364,96 (42,5 %);
- vencido há mais de 30 dias: R$ 128.478,84 (18,6 %);
- aging: a vencer 396.649,77 · até 30 dias 164.886,12 · 31 a 90 dias 37.413,68 · mais de 90 dias 91.065,16;
- concentração: os 5 maiores clientes somam 57,3 % do aberto.

**A pagar:**
- em aberto: R$ 490.208,02;
- vencido: R$ 132.927,00. A rotina marca "deveria ser zero": boa parte são contas pagas e não baixadas.

**Prazos:**
- prazo médio de recebimento: 25 dias;
- atraso médio de recebimento: 11 dias;
- prazo médio de pagamento: 14 dias.

**Liquidez em 30 dias:** 0,88 vez. A receber em 30 dias: 332.508,24; a pagar em 30 dias: 356.212,62; taxa de realização 67,7 %.

**Falha da rotina:** **não há fotografia de 18/11 nem de 19/11.** Ela é necessária para Indicadores, Régua e Agenda. A causa está registrada na auditoria de 19/11, seção 8; a rotina precisa de log próprio (etapa a).

### 1.4 Como os títulos nascem e são pagos (outubro/2026, 643 títulos por vencimento, 601 movimentos)

**Origem dos títulos a pagar (524):**

| Origem | Quantidade | % | Significado |
|---|---|---|---|
| `MANP` | 377 | 72 % | Digitado à mão |
| `COMP` | 76 | 15 % | Vindo de compra ou nota de entrada no Omie |
| `RPTP` | 66 | 13 % | Repetição (conta recorrente) |
| `DEVP` | 3 | | Devolução |
| `CTEP` | 2 | | CT-e |

**Origem dos títulos a receber (119):**

| Origem | Quantidade | Significado |
|---|---|---|
| `VENR` | 106 | Faturamento de pedido ou OS no Omie |
| `MANR` | 13 | Digitado à mão |

**Tipo de documento dos títulos a pagar:**

| Tipo | Quantidade | Valor |
|---|---|---|
| `CRC` (compras no cartão) | 193 | R$ 50 mil |
| `BOL` (boleto) | 124 | R$ 183 mil |
| `PIX` | 119 | R$ 305 mil |
| `TAR` (tarifa) | 48 | R$ 5 mil |
| `DEBA` (débito automático) | 17 | R$ 199 mil |
| `NFE` | 14 | |
| `CRD` | 8 | |

**Tipo de documento dos títulos a receber:**

| Tipo | Quantidade | Valor |
|---|---|---|
| `BOL` | 58 | R$ 235 mil |
| `PIX` | 48 | R$ 647 mil |
| `NFS` | 3 | |
| `CHQ` | 3 | |
| `RES` (resgate) | 1 | R$ 160 mil |

Conclusão para o v2: **pagar por Pix e por boleto (código de barras) cobre cerca de 85 % dos pagamentos em valor.** No recebimento, Pix e boleto são quase tudo.

**Contas usadas (movimentos em outubro):**

| Conta | Movimentos | Entradas (R$) | Saídas (R$) | Conciliados no Omie | Com CPF/CNPJ no movimento |
|---|---|---|---|---|---|
| Sicredi matriz (748) | 303 | 444.615,78 | 405.836,50 | 302 | 248 |
| Itaú Metrolabs (341) | 196 | 226.001,32 | 227.897,29 | **56** | 54 |
| Sicoob (756) | 80 | 147.393,77 | 100.399,28 | 67 | 63 |
| Caixa matriz (104) | 18 | 463.181,22 | 365.575,76 | 18 | 13 |
| Itaú Prestadora (341) | 2 | 0,23 | 169,00 | 2 | 0 |
| Caixa filial (104) | 1 | 44,18 | — | 1 | 1 |
| Caixinha | 1 | 150,00 | — | 0 | 1 |

Em outubro, "Sicredi filial" e "Sicredi prestadora" **não tiveram movimento** neste Omie.

**Outros pontos de outubro:**
- 9 títulos a receber cancelados (R$ 27.735).
- Nenhum título com departamento ou projeto: **o Omie não é usado para centro de custo.**

### 1.5 Contas correntes cadastradas no Omie (24)

| Situação | Contas |
|---|---|
| Ativas, com cobrança marcada no Omie | Sicredi matriz, Sicredi filial, Sicredi prestadora (748); Sicoob (756); Itaú Metrolabs, Itaú Unibanco Prestadora, Itaú Unibanco cartão crédito (341); CAIXA MATRIZ APLICAÇÃO (104); Banco do Brasil (001); SICOOB CARTÃO CRÉDITO |
| Ativas, sem cobrança | CAIXA MATRIZ, CAIXA FILIAL (104); Caixa Pagamentos; Caixinha; CHEQUE IOG; CAIXA CARTÕES CRÉDITO 1388 |
| Inativas | Omie.CASH (Boletos), Omie.CASH (encerrada), Sicoob Conta Capital, cartões MasterCard, Bradescard, Itaú LATAM, Itaú 8846 |

Nenhuma conta tem Pix integrado no Omie (`pix_sn` = N em todas as ativas). O Omie.CASH, único Pix do Omie, está **encerrado**.

### 1.6 Cadastros

- **Clientes e fornecedores (o mesmo cadastro no Omie):** 3.912 no total, 3.374 com a tag Fornecedor.
- **Amostra dos 3.000 primeiros:**

  | Item | Quantidade |
  |---|---|
  | Fornecedor | 2.573 |
  | Cliente | 394 |
  | Transportadora | 195 |
  | Funcionário | 18 |
  | Sócio | 2 |
  | Sem tag | 19 |
  | Pessoa física | 142 |
  | Com endereço | 1.936 |
  | Com e-mail | 1.100 |
  | **Com conta bancária** | **0** |
  | **Com chave Pix** | **0** |

- **Categorias:** 215. As mais usadas em outubro:
  - despesas: 2.01.01 Compras de Mercadorias para Revenda, 2.01.89 USO E CONSUMO, 2.05.04 Tarifas Bancárias, 2.04.96 Serviço Contratado, 2.03.11 Vale Transporte, 2.03.01 Salários, 2.01.91 Software, 2.03.81 reembolso funcionário, 2.03.12 Vale Refeição;
  - receitas: 1.01.02 Serviços Prestados PJ, 1.01.03 Revenda de Mercadoria PJ;
  - transferência: 0.01.01 / 0.01.02 Entrada e Saída de Transferência.
- **Departamentos:** 3 (METROLAB, MATRIZ GOIÂNIA, FILIAL RIO DE JANEIRO), sem uso.
- **Projetos:** 0.
- **Orçamento de caixa no Omie:** vazio.

### 1.7 Uso do SGO+ pelo Financeiro hoje (`FIN_OMIE_ACESSOS`, desde 16/11)

**Wanessa:** cerca de 70 consultas. Ela abre Lançamentos, Faturamento, Visão geral, Contas, Conciliação e Regras. Fez 2 confirmações de operação, 3 prévias de conciliação e 2 confirmações de conciliação.

**Dono:** abriu todas as telas para conferir. **Charles:** nenhum acesso.

**Registros:**
- `OMIE_CONCILIACOES`: 6 linhas.
- Operações no Omie pelo SGO+: 3 (inclusão e alteração de conta a pagar).
- `FIN_PAG_ITENS`, `FIN_CONTAS_FIXAS` e a trilha `FIN_OMIE_OPERACOES` **ainda não existem**: nunca foram usadas.

**Conclusão:** o SGO+ é hoje uma janela. A operação diária (lançar, baixar, conciliar, transferir, emitir boleto, pagar no banco) acontece no Omie e no Internet Banking.

### 1.8 O que não deu para medir (perguntar à Wanessa)

- Como ela paga hoje: um a um no Internet Banking, em lote, ou por remessa CNAB.
- Quem aprova no banco.
- Quantos pagamentos por dia em cada banco.
- Como o extrato chega ao Omie (OFX manual ou conexão automática do Omie com o banco) e por que o Itaú está atrasado.
- Folha: quem calcula (contador?), como chega (arquivo, PDF) e por qual banco paga a matriz e a prestadora.
- Guias: quem gera (contador), como chegam e em que dias.
- Emissão de boleto: hoje pelo Omie (contas com cobrança marcada) ou pelo banco direto.
- Cartões de crédito da empresa: como a fatura é lançada.

---

## 2. O que existe no SGO+ hoje e o que falta (visão geral)

**Já existe e funciona** (auditoria de 19/11, `output/financeiro-auditoria-20261119/RELATORIO.md`):
- sigilo (só dono, Charles, Wanessa) e registro de acessos;
- Visão geral, Fluxo, Resultado, Agenda;
- Contas a pagar e receber por período (17 colunas);
- Lançamentos e baixas (incluir, alterar, baixar com juros/multa/desconto, estornar), com prévia, alçadas e trilha;
- Conciliação por OFX/CSV com baixa no Omie;
- Aprovação de pagamentos (dono/Charles);
- Cobrança (boleto do Omie);
- Faturamento de pedido/OS e importação de NF-e de compra;
- Contas fixas, Compras e Caju no Omie (espelho), Fechamento do mês;
- Orçamento anual (SGO fonte);
- Fotografia diária, Indicadores, Régua de cobrança, Relatório semanal, Especialista (Gemini);
- Recarga Caju e Conciliação Caju (CSV + API Caju sem chave).

**Falta para o SGO+ operar:**

| # | Falta | Por quê importa |
|---|---|---|
| F1 | Multiempresa (3 CNPJs) | Pedido do dono; hoje tudo é "a matriz" |
| F2 | Transferência entre contas e entre empresas | Cerca de 7 por mês; hoje só no Omie |
| F3 | Cadastro completo de fornecedor/cliente: endereço, contato, banco, Pix, tags, categoria padrão | Sem isso não há pagamento automático (0 % com dados bancários) |
| F4 | Pagamento pelo banco (Pix, boleto, tributo, TED) depois da aprovação | É o principal "sair do SGO" da Wanessa |
| F5 | Extrato e saldo automáticos pela API (sem OFX) | Conciliação diária sem baixar arquivo |
| F6 | Recebimento por Pix/boleto do **banco** (Omie.CASH encerrado) com baixa automática | Hoje o boleto sai pelo Omie ou à mão |
| F7 | Conciliação automática com níveis de confiança | Os 505 movimentos por mês são hoje conciliados no Omie à mão |
| F8 | Notas: listar NF-e/NFS-e, baixar PDF/XML, cancelar, enviar ao cliente | Hoje só no Omie |
| F9 | Impostos: calendário, guias (PDF do contador → título com código de barras), pagamento, retenções | Pedido do dono |
| F10 | Relatórios: DRE gerencial, fluxo realizado × previsto, aging, por empresa e por centro de custo, extrato por conta, posição de fornecedores | Pedido do dono |
| F11 | Anexos (boleto, nota, comprovante) ligados ao título e enviados ao Omie | Auditoria e contador |
| F12 | Centro de custo: departamentos do Omie ou centro de custo do SGO | DRE por área; hoje 0 % dos títulos |
| F13 | Lançamento em lote: importar planilha ou folha, títulos repetidos | Folha e prestadora |
| F14 | Cartões de crédito da empresa: fatura → títulos por categoria | 193 compras no cartão por mês; parte já existe em Compras |
| F15 | Log e saúde das rotinas (fotografia, extrato, webhooks) | A fotografia falhou em 18 e 19/11 sem aviso |

---

## 3. Cobertura da API do Omie (tabela completa)

**Legenda:**
- **Existe** = o SGO+ já chama.
- **Funciona** = evidência em produção ou em leitura real. "T" = só em testes, sem uso real.
- **v2** = o que o desenvolvimento deve fazer.

Endereço base: `https://app.omie.com.br/api/v1/`. Lista oficial: https://developer.omie.com.br/service-list/

### 3.1 Finanças

| Serviço (caminho) | Métodos | Existe no SGO+ | Funciona | v2 |
|---|---|---|---|---|
| Contas a pagar `financas/contapagar/` | IncluirContaPagar, AlterarContaPagar, ConsultarContaPagar, ListarContasPagar, LancarPagamento, CancelarPagamento, ExcluirContaPagar | Sim | Sim (Incluir/Alterar em produção; baixa só T) | Manter. Acrescentar o bloco `cnab_integracao_bancaria` (forma de pagamento TRA/BOL/PIX, banco/agência/conta, `pix_qrcode`, `codigo_barras_boleto`, titular) e `codigo_barras_ficha_compensacao`. Acrescentar `distribuicao` por departamento e as retenções (`valor_*`/`retem_*`) |
| | UpsertContaPagar, IncluirContaPagarPorLote, UpsertContaPagarPorLote | Não | — | **Lote**: folha, prestadora, importação de planilha (F13). Usar `codigo_lancamento_integracao` = id do SGO (idempotência) |
| Contas a receber `financas/contareceber/` | IncluirContaReceber, ConsultarContaReceber, ListarContasReceber, LancarRecebimento, CancelarRecebimento, AlterarContaReceber | Sim | Incluir pela prévia (T); baixa T | Manter |
| | ConciliarRecebimento, DesconciliarRecebimento | Não (a conciliação vai na baixa por `conciliar_documento`) | — | Usar ConciliarRecebimento para recebimentos já baixados no Omie e só conciliados no SGO |
| | Incluir/Alterar/ExcluirDistribuicaoDepartamento, IncluirContaReceberPorLote, Upsert…, ExcluirContaReceber, CancelarContaReceber (cancela o boleto do título) | Não | — | Rateio por centro de custo (F12); lote (contratos) |
| Boletos `financas/contareceberboleto/` | GerarBoleto, ObterBoleto, ProrrogarBoleto | Sim | T (sem uso real) | Usar só se a conta do Omie emitir boleto por convênio. **Recomendação:** emitir pela API do banco (seção 5) e registrar no título |
| | CancelarBoleto | Não | — | Acrescentar |
| Pix do Omie `financas/pix/` | GerarPix, GerarQrCodePix, ObterPix, ObterStatusPix, ListarPix, ListarStatusPix, CancelarPix | Não | — | **Não usar**: depende de conta com Pix integrado no Omie (padrão Omie.CASH, encerrado; nenhuma conta com `pix_sn` = S). Pix pela API do banco |
| Lançamentos de conta corrente `financas/contacorrentelancamentos/` | IncluirLancCC | Sim (lançamento avulso) | T | Manter |
| | IncluirLancCC com **`transferencia.nCodCCDestino`** | **Não** | — | **Transferência entre contas** (F2). Categoria de transferência 0.01.02 / 0.01.01. Testar na 1ª operação acompanhada: conta de origem = `cabecalho.nCodCC` |
| | ListarLancCC, ConsultaLancCC, AlterarLancCC, ExcluirLancCC | Não | — | Listar e estornar lançamentos e transferências feitos pelo SGO |
| Extrato `financas/extrato/` | ListarExtrato | Sim | Sim | Manter. É o extrato **do Omie**, não o do banco |
| Movimentos `financas/mf/` | ListarMovimentos | Sim | Sim | Manter. Usar `cTpLancamento` CCT (transferências), BX, CC e `dDtConcilia` para medir a conciliação |
| Resumo `financas/resumo/` | ObterResumoFinancas | Sim | Sim | Manter (saldo por conta no Omie) |
| Orçamento de caixa `financas/caixa/` | ListarOrcamentos | Sim | Sim (vazio) | **Não há gravação na API.** O orçamento fica no SGO (decisão de 18/11). No Omie, só leitura |
| Pesquisar títulos `financas/pesquisartitulos/` | PesquisarLancamentos | Não | — | Dispensável (o `mf` cobre) |

### 3.2 Geral e cadastros

| Serviço | Métodos | Existe | Funciona | v2 |
|---|---|---|---|---|
| Clientes/fornecedores `geral/clientes/` | ListarClientes, ConsultarCliente, IncluirCliente, AlterarCliente (tags somadas) | Sim | Busca sim; cadastro T | **Cadastro completo (F3):** endereço (`endereco`, `endereco_numero`, `bairro`, `cidade`, `estado`, `cep`, `cidade_ibge`), `inscricao_estadual`/`municipal`, `email`, telefones, contato, `pessoa_fisica`, `optante_simples_nacional`, **`dadosBancarios`** (`codigo_banco`, `agencia`, `conta_corrente`, `doc_titular`, `nome_titular`, `transf_padrao`, **`cChavePix`**), `recomendacoes` (categoria e conta padrão, vendedor, e-mail da nota), `tags`, `inativo`, `bloquear_faturamento`. Consulta de CNPJ na Receita (o SGO+ já tem rotina de CNPJ) para preencher |
| | UpsertCliente, ExcluirCliente, ListarClientesResumido | Não | — | Upsert **nunca** (sobrescreve o feito à mão); Excluir não; Resumido para buscas rápidas |
| Tags `geral/clientetag/` | IncluirTags, ExcluirTags, ListarTags | Não (tags vão no Alterar) | — | Opcional |
| Características `geral/clientescaract/` | Incluir/Listar características | Não | — | Opcional (ex.: "prazo de pagamento padrão") |
| Contas correntes `geral/contacorrente/` | ListarContasCorrentes, ConsultarContaCorrente | Sim | Sim | Acrescentar o vínculo **conta → empresa** no SGO (seção 4) |
| | IncluirContaCorrente, AlterarContaCorrente | Não | — | Não fazer (cadastro raro; fica no Omie) |
| Categorias `geral/categorias/` | ListarCategorias, ConsultarCategoria | Sim | Sim | Manter. Plano de contas e DRE |
| Departamentos `geral/departamentos/` | ListarDepartamentos, ConsultarDepartamento, Incluir/Alterar | Não | — | Ler e usar como centro de custo, ou empresa no modo compartilhado (seções 4 e 6.9) |
| Projetos `geral/projetos/` | ListarProjetos, IncluirProjeto… | Não | — | Opcional: contrato ou obra (0 cadastrados) |
| Contas do DRE `geral/dre/` | ListarCadastroDRE | Não | — | **Ler** para montar a DRE com a mesma estrutura do contador |
| Empresas `geral/empresas/` | ListarEmpresas, ConsultarEmpresa | Não | — | **Ler** para conferir que cada chave pertence ao CNPJ cadastrado (seção 4) |
| Anexos `geral/anexo/` | IncluirAnexo (zip + base64 + MD5), ObterAnexo (link), ListarAnexo, ConsultarAnexo, ExcluirAnexo | Não | — | **Fazer (F11):** anexar boleto, nota, comprovante e guia em `conta-pagar`, `conta-receber`, `conta-corrente-lancamento` e `cliente` |
| Auxiliares | `geral/bancos/`, `geral/tiposdoc/` (tipos de documento: PIX, BOL, TAR, DEBA, DARF, DAS, GUIA…), `geral/finaltransf/` (finalidade de TED/Pix), `geral/tipocc/`, `geral/origemlancamento/`, `geral/parcelas/` | Não | — | Ler e guardar 24 h (listas dos formulários) |

### 3.3 Notas e faturamento

| Serviço | Métodos | Existe | Funciona | v2 |
|---|---|---|---|---|
| Pedido de venda `produtos/pedido/` | ConsultarPedido | Sim | T | Manter |
| Faturar pedido `produtos/pedidovendafat/` | ValidarPedidoVenda, FaturarPedidoVenda, ObterPedidosVenda | Sim | T (sem uso) | Manter. **Cancelar a NF-e:** método de cancelamento deste serviço, nome a confirmar na documentação no desenvolvimento |
| Ordem de serviço `servicos/os/` + faturar `servicos/osp/` | ConsultarOS; ValidarOS, FaturarOS, ObterOS | Sim | T | Manter. Cancelamento da NFS-e: método de cancelamento do `osp`, a confirmar |
| Faturamento em lote `servicos/oslote/`, `servicos/contratolote/` | — | Não | — | Opcional (contratos de manutenção mensais) |
| Contratos de serviço `servicos/contrato/`, `servicos/contratofat/` | Incluir/Alterar/Listar contrato; faturar | Não | — | **Avaliar:** o SGO+ tem 733 reajustes de contrato (`COM_REAJUSTES`). Faturar contrato pelo Omie gera NFS-e e título sozinho |
| Consultar NF-e `produtos/nfconsultar/` | ListarNF, ConsultarNF | Não | Leitura real OK no ensaio | **Fazer (F8):** listar saída/entrada por período, situação, cliente |
| PDF/XML NF-e `produtos/notafiscalutil/`, `produtos/dfedocs/` | URLs de DANFE/XML; obter documentos | Não | — | Fazer: baixar e enviar ao cliente |
| Consultar NFS-e `servicos/nfse/` | ListarNFSEs (`cStatusNFSe` C/F/N) | Não | Leitura real OK no ensaio | Fazer |
| Documentos da OS `servicos/osdocs/` | Obter NFS-e, recibo… | Não | — | Fazer (PDF da NFS-e) |
| Importar NF-e de compra `produtos/nfe/` + recebimento `produtos/recebimentonfe/` | ImportarNFe; ConsultarRecebimento | Sim | T | Manter. Origem das contas a pagar de compra |
| Nota de entrada `produtos/notaentrada/`, `notaentradafat/` | — | Não | — | Opcional |
| CT-e `produtos/cte/` | — | Não | — | Opcional (2 por mês) |
| Painel do contador `contador/xml/`, `contador/resumo/` | Listar XMLs (NF-e, NFS-e); ObterResumoContador (situação do fechamento contábil por mês) | Não | — | **Fechamento do mês:** conferir se o contador fechou (`cSituacao`, `dBloqueado`) e entregar os XMLs |

### 3.4 Impostos — o que a API do Omie oferece de fato

- **Não há** apuração de impostos, emissão de guia (DAS, DARF, GPS/DCTFWeb, FGTS, ISS) nem calendário fiscal na API do Omie. Os serviços "Impostos" (`produtos/cfop`, `icmscst`, `piscst`…) são só tabelas fiscais para nota.
- **O que existe:** retenções no título (`valor_pis/cofins/csll/ir/iss/inss` + `retem_*`), `servico_tomado` na conta a pagar, tipos de documento `DARF`, `DAS`, `GUIA`, `PARI`, e o "Painel do contador" (situação do fechamento).
- **Alternativa recomendada (seção 6.7):**
  1. O contador manda as guias em PDF (e-mail ou pasta).
  2. O SGO+ lê o PDF (Gemini, já ativo) e extrai tributo, competência, vencimento, valor e **linha digitável**.
  3. A Wanessa confere.
  4. O SGO+ cria a conta a pagar no Omie (tipo DARF/DAS/GUIA, categoria do imposto, código de barras) com o PDF anexado.
  5. A conta segue para aprovação e pagamento pelo banco (convênio/tributo).
- **Opção automática paga:** API **Integra Contador (SERPRO)**. Emite o DAS (PGDAS-D), a guia da DCTFWeb e o DARF (Sicalc), com procuração ou e-CNPJ. É cobrada por chamada ([SERPRO](https://serpro.gov.br/menu/noticias/noticias-2022/integra-contador-unifica-acesso-a-informacoes-contabeis), [lista de serviços](https://www.istoedinheiro.com.br/receita-e-serpro-lancam-solucao-para-servicos-contabeis-integra-contador/)). FGTS Digital e ISS de Goiânia: sem API pública conhecida; continuam pelo PDF.

### 3.5 Pagamentos, CNAB e remessa

A API do Omie **não envia pagamento ao banco** e não gera remessa CNAB de pagamentos (no Omie isso é feito pela tela). Por isso **o pagamento é pela API do banco** (seção 5) e, depois, baixa no Omie com `LancarPagamento` + `conciliar_documento`. Onde o banco não tiver API de pagamento (Itaú), a alternativa é **arquivo SISPAG/CNAB 240 gerado pelo SGO+** e enviado pela Wanessa no Internet Banking. O retorno é importado pelo SGO+.

---

## 4. Multiempresa (3 CNPJs)

### 4.1 Situação encontrada

**No Omie:**
- O Omie ligado ao SGO+ tem **uma empresa** (METROLAB SOLUCOES EM ENGENHARIA CLINICA LTDA, final 0001-21, Goiânia, regime código 4 no Omie, não optante do Simples).
- Dentro dele há contas bancárias da filial e da prestadora, e departamentos de matriz e filial.

**No SGO+:**
- As chaves gravadas são `OMIE_APP_KEY`/`OMIE_APP_SECRET` (06/11) e `OMIE_EMPRESA_CNPJ` (16/11), usadas para conferir a empresa.

O SGO+ precisa suportar **dois modos por empresa**, porque ainda não se sabe se a filial e a prestadora têm Omie próprio:
- **PROPRIO:** a empresa tem o próprio app no Omie (App Key/Secret) e tudo dela é lido e gravado lá.
- **COMPARTILHADO:** a empresa vive dentro do Omie de outra (a matriz). O SGO+ identifica o que é dela por **conta corrente** (lista de `nCodCC`) e, quando houver, por **departamento** (`cCodDep`). Os títulos novos dela vão com essa conta e esse departamento.

Recomendação de finanças:
- **Prestadora** (outro CNPJ-raiz, folha própria): **Omie próprio**. Sem isso, as notas dela e o DRE se misturam com os da matriz.
- **Filial** (mesmo CNPJ-raiz, outro estabelecimento): Omie próprio se emitir nota pelo CNPJ dela. Se não emitir, o modo compartilhado com departamento resolve.

**Decisão do dono** (seção 12).

### 4.2 Cadastro de empresas no SGO+ (tabela `FIN_EMPRESAS`)

| Campo | Exemplo / regra |
|---|---|
| `ID` | uuid |
| `APELIDO` | `MATRIZ`, `FILIAL`, `PRESTADORA` (fixos, maiúsculas, viram o sufixo das chaves) |
| `NOME_CURTO` | "Metrolab's Matriz" (o dono preenche) |
| `RAZAO_SOCIAL`, `CNPJ`, `INSCRICAO_ESTADUAL`, `INSCRICAO_MUNICIPAL`, `REGIME` (Simples / Presumido / Real) | **o dono preenche. Não inventar.** CNPJ validado pelos dígitos e pela consulta de CNPJ do SGO+ |
| `OMIE_MODO` | `PROPRIO` ou `COMPARTILHADO` |
| `OMIE_EMPRESA_BASE` | no modo compartilhado: o APELIDO dono do Omie (ex.: MATRIZ) |
| `OMIE_CONTAS` | lista de `nCodCC` desta empresa (escolhidas na lista do Omie) |
| `OMIE_DEPARTAMENTO` | `cCodDep` (opcional) |
| `CONTA_PADRAO_RECEBER`, `CONTA_PADRAO_PAGAR` | `nCodCC` |
| `COR` | para gráficos (o designer define a paleta) |
| `ATIVA`, `ORDEM` | |
| `CRIADO_*`, `ATUALIZADO_*`, `MOTIVO` | histórico em `FIN_EMPRESAS_HIST` (antes/depois, motivo ≥ 15 letras) |

**Conferência automática** (botão "Testar"):
- Com a chave da empresa, chamar `geral/empresas` `ListarEmpresas`.
- O CNPJ devolvido tem de ser igual ao `CNPJ` cadastrado. Se for diferente: "a chave gravada em OMIE_APP_KEY_FILIAL é da empresa X; confira".
- O teste nunca mostra a chave.

**Contas bancárias por empresa (`FIN_CONTAS_BANCO`)**, uma linha por conta:
- `EMPRESA`, `BANCO` (748/756/341/104/001), `AGENCIA`, `CONTA`, `APELIDO`;
- `OMIE_NCODCC` (vínculo com a conta do Omie);
- `CONECTOR` (`SICREDI`, `SICOOB`, `ITAU`, `NENHUM`) e `PREFIXO_CHAVES` (ex.: `SICREDI_MATRIZ`);
- `CAPACIDADES` (calculadas pelo teste: saldo, extrato, pix_cobrar, boleto, pagar…);
- `ULTIMO_EXTRATO_EM`, `ULTIMO_SALDO`, `SALDO_EM`;
- `ATIVA`.

As contas sem API (Caixa, Banco do Brasil, cartões) ficam com `CONECTOR=NENHUM`, com OFX/CSV manual (já existe).

### 4.3 Chaves por empresa (nomes definidos)

| Empresa | Omie | Prefixo dos bancos |
|---|---|---|
| Matriz | `OMIE_APP_KEY`, `OMIE_APP_SECRET` (**os atuais, sem mudança**) | `SICREDI_MATRIZ_*`, `SICOOB_MATRIZ_*`, `ITAU_MATRIZ_*` |
| Filial | `OMIE_APP_KEY_FILIAL`, `OMIE_APP_SECRET_FILIAL` | `SICREDI_FILIAL_*`, … |
| Prestadora | `OMIE_APP_KEY_PRESTADORA`, `OMIE_APP_SECRET_PRESTADORA` | `SICREDI_PRESTADORA_*`, … |

A lista completa dos bancos está na seção 5.5.

**Onde as chaves aparecem:**
- As chaves do Omie aparecem no grupo **Omie** de Administração > Chaves e senhas (`SGO_Chaves.js`) e **também** em `/_sgo/segredos` (`sgo_servidor/src/servicos/segredos.ts`, lista fixa `SEGREDOS`, que precisa receber os nomes novos).
- As dos bancos ficam num grupo novo por banco.
- Certificados e chaves privadas são textos longos (PEM). A tela precisa de um **campo de várias linhas** e de "Escolher arquivo", que converte `.pfx` em base64.
- **Atenção do desenvolvedor:** o repositório `sgo_servidor` diverge da produção; a fonte é o contêiner (memória do projeto, 10/11).

### 4.4 Compatibilidade com o que existe

- `Omie_credenciais_()` passa a ser `Omie_credenciais_(empresa)`. Sem empresa (ou `MATRIZ`), lê as chaves atuais. Nenhuma tela antiga quebra.
- O cache de leitura já inclui a chave na impressão digital, o que separa as empresas sozinho.
- O **espaçamento por método** (`OMIE_ULT_<método>`) passa a ser **por app** (`OMIE_ULT_<empresa>_<método>`). O limite do Omie é por aplicativo.
- A fotografia diária roda **uma vez por empresa** (PROPRIO). No modo compartilhado, a foto da empresa-base é repartida pelas contas e departamentos.
- Todas as tabelas `FIN_*` e `OMIE_*` com registro de operação ganham a coluna `EMPRESA`; o padrão para o que já existe é `MATRIZ`. As prévias guardam a empresa, e a confirmação recusa se a empresa mudou.
- `OMIE_EMPRESA_CNPJ` vira o CNPJ da matriz no cadastro novo, migrado uma vez sem apagar a chave.
- A trilha `FIN_OMIE_OPERACOES` registra a empresa.

### 4.5 Seletor de empresa e visão consolidada

- **Seletor fixo no topo do módulo:** "Todas (consolidado)" · Matriz · Filial · Prestadora. A escolha fica no aparelho.
- **Consolidado:**
  - soma saldos, a receber e a pagar das três;
  - **elimina as transferências entre empresas do grupo** (não é receita nem despesa do grupo);
  - mostra uma coluna por empresa nas tabelas e uma barra empilhada nos gráficos.
- **Cada tela de operação** (lançar, pagar, transferir, emitir) **exige uma empresa** e nunca opera em "Todas". O formulário mostra a empresa com a cor dela, para evitar lançar na empresa errada.
- **Relatórios:** todos têm o filtro empresa, e o consolidado tem "por empresa" lado a lado.

### 4.6 Transferências entre empresas

| Caso | O que o SGO+ faz no Omie | No banco |
|---|---|---|
| Mesma empresa, duas contas | `IncluirLancCC` com `transferencia.nCodCCDestino`, categoria de transferência | Pix/TED da conta de origem para a de destino (se houver API de pagamento) ou "já feita no banco" (só registra) |
| Empresas diferentes, mesmo Omie (compartilhado) | **Não é transferência contábil**: são dois CNPJs. Registra-se como **mútuo entre empresas**: título a pagar na empresa de origem e a receber na de destino, categoria "Mútuo/Empréstimo entre empresas do grupo" (pedir ao contador o nome e o código), baixados no mesmo dia | Pix/TED entre os CNPJs |
| Empresas diferentes, Omies diferentes | Conta a pagar baixada no Omie da origem + conta a receber baixada no Omie do destino, mesma referência `TRF-<id>` nos dois | Pix/TED |

**Pagamento de pessoal pela prestadora:** se a matriz repassa dinheiro para a prestadora pagar funcionários, é o caso de mútuo ou de prestação de serviço (com nota da prestadora contra a matriz). **Definir com o contador** (seção 12).

**Idempotência:** cada transferência tem `ID` no SGO, e o mesmo `codigo_lancamento_integracao`/`cCodIntLanc` = `TRF-<id>-O` e `TRF-<id>-D` vai ao Omie. Antes de reenviar, consultar por esse código.

### 4.7 Sigilo e aprovações com várias empresas

- **Acesso:** a mesma lista de sigilo (dono, Charles, Wanessa) vale para as três empresas. Não há acesso por empresa no início. O campo `FIN_EMPRESA_ACESSO` fica previsto para o caso de, no futuro, um RH ver só a folha da prestadora.
- **Aprovações:** só dono ou Charles, nas três empresas. Quem enviou não aprova o próprio item (regra atual).
- **Transferência:**
  - entre contas da mesma empresa: **recomendação**, sem aprovação até o limite `FIN_TRF_DISPENSA_ATE` (o dono define; vazio = toda transferência precisa de aprovação);
  - entre empresas: **sempre** com aprovação do dono ou do Charles.
- Todo registro de acesso e de operação grava a empresa.

---

## 5. Bancos

**Fontes:**
- Portais oficiais: Sicredi, Sicoob, Itaú.
- Guia técnico Pix do Sicredi (PDF oficial, jan/2026).
- Páginas do Itaú sobre certificado dinâmico e mudança de hosts em 2026.
- Integradores (Omie, ACBr, CIGAM), marcados como **secundária**.

Os três portais escondem os detalhes de extrato e de pagamentos na área logada. O que está "a confirmar" deve ser conferido no portal pelo desenvolvedor, com o login do dono, antes de programar.

### 5.1 Sicredi (chave já obtida pelo dono; nada gravado no SGO+)

| Função | Existe na API? | API / caminho | Observação |
|---|---|---|---|
| Saldo | Sim | "Saldo de Conta Corrente" (mTLS) | Endpoints na área logada |
| Extrato | Sim | "Extrato de Conta Corrente" (mTLS) | Idem. Fim do OFX manual da conta mais movimentada (303 movimentos em outubro) |
| Pix cobrança imediata (`cob`) | Sim | API Pix padrão BACEN, `api-pix.sicredi.com.br` | Escopos `cob.read` e `cob.write` |
| Pix com vencimento (`cobv`) e lote | Sim | `cobv`, `lotecobv` | A cooperativa precisa habilitar |
| Pix recebidos (consulta) e devolução | Sim | `GET /pix`, devolução | Base da conciliação de recebimentos |
| Webhook Pix | Sim | `PUT /webhook/{chave}` | O servidor que recebe precisa de TLS 443 com CA pública e da cadeia do Sicredi (mTLS de entrada) |
| Pix Automático | Sim | `cobr` | Opcional (contratos mensais) |
| Boleto (híbrido com Pix): emitir, alterar, baixar, consultar | Sim | `api-parceiro.sicredi.com.br/cobranca/boleto/v1` (secundária) | O híbrido exige chave Pix **aleatória** |
| Liquidação do boleto | Parcial | Consulta "liquidados no dia" (um dia por vez) | **Webhook de boleto não confirmado**: consultar todo dia |
| Pagamentos: boleto, tributo/convênio, Pix de saída, TED, transferência interna | Provável | **Multipag** (mTLS), anexo do contrato PJ 2026 | Lista exata na área logada. **Perguntar se fica pendente de aprovação no Internet Banking** |
| CNAB 240/400 (cobrança) e CNAB de pagamentos | Sim | Arquivo | Plano B |

**Autenticação:**
- **Pix (oficial):** OAuth2 `client_credentials` com Basic(client_id:secret) + `scope`, token de cerca de 3.600 s, **reaproveitar** (o Sicredi bloqueia o IP se pedir token demais). Usa mTLS com o certificado `.CER` assinado pelo Sicredi (a partir de um CSR do portal) + `APLICACAO.KEY` + cadeia Sicredi. **Não é A1 ICP-Brasil.** O certificado vence.
- **Cobrança (secundária):** token em `api-parceiro.sicredi.com.br/auth/openapi/token`, header `x-api-key` (Developer Key), `username` = beneficiário + cooperativa, `password` = **Código de Acesso** gerado no Internet Banking. Usa `refresh_token`. É **uma Developer Key por beneficiário** (uma por empresa).

**Passo a passo para obter:**
1. A empresa adere à API Pix na cooperativa (termo; recebe o "ID da adesão").
2. No portal developer.sicredi.com.br, o técnico abre o chamado "Acesso à API Pix" (CNPJ + ID da adesão; resposta em cerca de 2 h úteis).
3. Registra o CSR, baixa o certificado e gera o client_id/secret.
4. **Cobrança:** o gerente habilita a "Cobrança Online". No portal, cria uma app com "API AUTH - OPENAPI - PARCEIROS" + "API COBRANÇA BOLETO" e abre um chamado pedindo o token de produção. A Developer Key aparece em "Tokens de Acesso". O Código de Acesso sai do Internet Banking > Cobrança.
5. **Extrato, Saldo e Multipag:** pedir à cooperativa e conferir as credenciais no portal.

**Homologação:**
- Pix: `api-pix-h.sicredi.com.br`; pedir por e-mail a integracoes_pix@sicredi.com.br.
- Cobrança: caminho `/sb/` (secundária).

### 5.2 Sicoob (o dono está providenciando)

| Função | Existe? | API |
|---|---|---|
| Saldo e extrato | Sim | Conta Corrente (o mesmo produto faz transferências entre contas Sicoob). Pela Tecnospeed (secundária), o fluxo pode ser *Authorization Code* com consentimento: confirmar |
| Pix cob/cobv, recebidos, webhook | Sim | Pix Recebimentos (padrão BACEN) |
| Boleto: emitir, alterar, baixar, consultar, **webhook** (escopos `webhooks_*`), movimentações | Sim | **Cobrança Bancária v3** `api.sicoob.com.br/cobranca-bancaria/v3` (a v2 foi desligada em 30/04/2025) |
| Boleto híbrido | Sim | v3 (exige chave Pix aleatória) |
| Pagar boleto | Sim | Cobrança Bancária – Pagamentos |
| Tributos e convênios com código de barras | Sim | Convênios/Pagamentos (DARF, GPS, DAS, FGTS: confirmar no portal) |
| Pix de saída | Sim | Pix Pagamentos |
| TED | Sim | SPB Transferência |
| CNAB 240 | Sim | Arquivo |

**Autenticação (secundária):**
- OAuth2 `client_credentials` em `auth.sicoob.com.br/auth/realms/cooperado/protocol/openid-connect/token`, com `client_id` no corpo e **mTLS com o e-CNPJ A1 da própria empresa** (o mesmo da NF-e).
- Não há client_secret.
- Configurar **PFX ou KEY+PEM, não os dois** (com os dois juntos dá 401 `invalid_client`).

**Obter acesso:**
1. O gerente de Cash da cooperativa habilita os produtos.
2. No portal, criar o aplicativo, marcar as APIs e enviar a parte pública do certificado, respondendo "Não" a "empresa parceira".
3. O portal gera o client_id.

**Sandbox:** `sandbox.sicoob.com.br/sicoob/sandbox/cobranca-bancaria/v3`, com token fixo. Só valida a comunicação.

**Cuidado:** um boleto registrado só pode ser cancelado ou prorrogado 30 min depois do registro (Omie, secundária).

### 5.3 Itaú (o dono está providenciando)

| Função | Existe? | API |
|---|---|---|
| Extrato e saldo | Parcial | "API de Conciliação de Conta Corrente PJ" (nome visto no site; detalhes na área logada). Alternativa oficial por arquivo: **camt.053** e CNAB 240 de conciliação |
| Pix cob/cobv/recebidos/webhook | Sim | Pix Recebimentos, **host novo `secure.gateway.api.itau`** |
| Boleto / BolePix | Sim | API de boleto v1 + bolecode (secundária, ACBr, mai/2026). Credenciais **separadas** para cobrança comum e BolePix |
| Liquidação de boleto | Sim | API de conciliação de boletos (substitui a "francesinha") |
| Pagamentos (boleto, tributo, Pix, TED) por API | **Não encontrado** | SISPAG só por arquivo CNAB. Iniciação de pagamento do Open Finance é outra coisa |

**Autenticação (oficial):**
1. O Analista de Operações do Itaú envia, cifrados, o **Client ID**, um **token temporário** e a chave de sessão.
2. A empresa gera o par RSA e o CSR com CN = client_id.
3. `POST https://sts.itau.com.br/seguranca/v1/certificado/solicitacao` devolve o **certificado** e o **client_secret, mostrado uma única vez**.
4. O token de acesso é `client_credentials` com mTLS e vale **300 s**.
5. Headers: `x-itau-apikey`, `x-itau-correlationID`, `x-itau-flowID`.

**Validade do certificado:** 365 dias, renovável só no último mês (`/seguranca/v1/certificado/renovacao`). Vencido, é preciso fazer outro do zero. A página de pré-requisitos cita 200 dias para certificados a partir de 15/03/2026: **confirmar**.

**Mudança de hosts e cadeia em 2026 (prazos já passados):**
- `api.itau.com.br` → `api.gateway.itau.com.br`;
- `secure.api.itau` → `secure.gateway.api.itau`.

Usar só os novos.

**Obter acesso:**
1. Contrato com o gerente.
2. Cadastro no devportal.itau.com.br.
3. Pedido ao Analista de Operações.
4. Geração do certificado: o SGO+ terá a tela "Gerar certificado Itaú", feita **pelo servidor**, que gera a chave lá e grava direto. Assim a chave privada nunca passa por e-mail.

### 5.4 Caju (chave obtida pelo dono; nada gravado no SGO+)

**O que já existe no SGO+:** `SGO_Caju_Api.js`.
- OAuth2 *password grant* em `auth.caju.com.br/realms/partner/...`, token de 600 s renovado 60 s antes.
- Chaves `CAJU_CLIENT_ID`, `CAJU_CLIENT_SECRET`, `CAJU_INTEGRACAO_ID`, `CAJU_INTEGRACAO_SENHA`, `CAJU_AMBIENTE`; opcionais `CAJU_URL_AUTH`/`CAJU_URL_API`.
- Registro de chamadas em `CJU_CHAMADAS`.

**Rotas documentadas (estudo de 11/11, lido com o acesso de parceiro):**
- colaboradores (`/v1/employee`);
- pedidos de crédito (`/v1/voucher/allowance_order`: criar rascunho, consultar, efetivar com BANK_SLIP / PIX_CODE / EXISTING_BALANCE);
- entrega de cartão.

**Rotas "A CONFIRMAR" na homologação:** arquivar, desarquivar, cancelar, paginação.

**O que a API não tem:** extrato ou gastos do cartão, saldo do colaborador, recolhimento de saldo, webhooks.

**Consequência:**
- A **recarga** pode ser automática (pedido → pagamento por boleto ou Pix do Caju → o SGO+ paga esse boleto/Pix pela API do banco).
- A **conferência dos gastos** continua pelo **CSV** exportado do portal (já existe em `SGO_Caju_Conciliacao.js`).
- Conferir na homologação se há uma conta Caju por CNPJ (`sponsorId` por empresa). Se houver, usar chaves com sufixo (`CAJU_CLIENT_ID_PRESTADORA`…). Sem sufixo = matriz, para compatibilidade.

### 5.5 Credenciais: nomes das chaves (todas por empresa)

`<E>` = `MATRIZ`, `FILIAL` ou `PRESTADORA`. Ambiente por banco: `SICREDI_AMBIENTE`, `SICOOB_AMBIENTE`, `ITAU_AMBIENTE` (`homologacao` | `producao`; vazio = desligado).

| Banco | Chaves |
|---|---|
| Sicredi | `SICREDI_<E>_PIX_CLIENT_ID`, `SICREDI_<E>_PIX_CLIENT_SECRET`, `SICREDI_<E>_PIX_CERT` (PEM), `SICREDI_<E>_PIX_CHAVE_PRIVADA` (PEM), `SICREDI_<E>_PIX_CHAVE` (chave Pix aleatória); `SICREDI_<E>_COB_API_KEY`, `SICREDI_<E>_COB_CODIGO_ACESSO`, `SICREDI_<E>_COOPERATIVA`, `SICREDI_<E>_POSTO`, `SICREDI_<E>_BENEFICIARIO`; `SICREDI_<E>_CONTA_CLIENT_ID`, `SICREDI_<E>_CONTA_CLIENT_SECRET` (extrato/saldo; se usar outro certificado: `SICREDI_<E>_CONTA_CERT`/`_CHAVE_PRIVADA`); `SICREDI_<E>_PAG_CLIENT_ID`, `SICREDI_<E>_PAG_CLIENT_SECRET` (Multipag; idem certificado) |
| Sicoob | `SICOOB_<E>_CLIENT_ID`, `SICOOB_<E>_CERT_PFX` (base64), `SICOOB_<E>_CERT_SENHA`, `SICOOB_<E>_NUMERO_CLIENTE`, `SICOOB_<E>_CONTA`, `SICOOB_<E>_PIX_CHAVE` |
| Itaú | `ITAU_<E>_CLIENT_ID`, `ITAU_<E>_CLIENT_SECRET`, `ITAU_<E>_CERT` (PEM), `ITAU_<E>_CHAVE_PRIVADA` (PEM), `ITAU_<E>_AGENCIA`, `ITAU_<E>_CONTA`, `ITAU_<E>_PIX_CHAVE`; se o BolePix tiver credencial separada: `ITAU_<E>_BOLEPIX_CLIENT_ID`/`_CLIENT_SECRET`/`_CERT`/`_CHAVE_PRIVADA` |
| Caju | existentes: `CAJU_CLIENT_ID`, `CAJU_CLIENT_SECRET`, `CAJU_INTEGRACAO_ID`, `CAJU_INTEGRACAO_SENHA`, `CAJU_AMBIENTE` (matriz); outras empresas: mesmos nomes com `_FILIAL` / `_PRESTADORA` |
| Omie | seção 4.3 |
| Impostos (opcional) | `SERPRO_CONSUMER_KEY`, `SERPRO_CONSUMER_SECRET` |
| Regras (abertas, não secretas, em Regras do Financeiro) | `FIN_TRF_DISPENSA_ATE`, `FIN_PAG_DISPENSA_ABAIXO` (já existe), `FIN_CONC_AUTO_LIGADA`, `FIN_PAG_BANCO_LIGADO` (gravação no banco: chave de emergência, igual ao `OMIE_GRAVACAO_LIGADA`), `FIN_WEBHOOK_LIGADO` |

**Regras:**
- O código funciona sem nenhuma chave. Cada conta mostra "não configurado — falta X". O teste nunca exibe valor.
- O vencimento dos certificados é lido do próprio PEM e **avisado 30 dias antes** (e-mail ao dono e aviso no painel).

### 5.6 Arquitetura dos conectores (para o desenvolvedor)

- **Por que não no legado:** mTLS não é possível no `UrlFetchApp` do legado (`compat/basicos.ts`: `pedidoHttp` não tem certificado). Fazer o serviço novo **`sgo_servidor/src/servicos/bancos/`** (Node `https.Agent` com `cert`/`key`/`pfx`/`ca`):
  - o legado pede `Bancos.chamar({ conta, operacao, dados })` por uma ponte (como `http.fetch`);
  - o servidor lê as chaves de `propriedades` pelo **prefixo** da conta. **O certificado nunca entra no legado.**
- **Interface única por banco:**
  - `testar()`, `saldo()`, `extrato(de, ate)` com paginação;
  - `pixCriarCob`, `pixCriarCobv`, `pixConsultar`, `pixRecebidos(de, ate)`, `pixDevolver`;
  - `boletoEmitir`, `boletoAlterar`, `boletoBaixar`, `boletoConsultar`, `boletoLiquidados(dia)`;
  - `pagarBoleto(linhaDigitavel)`, `pagarTributo(codigoBarras)`, `pixPagar(chave | qr | dadosBancarios)`, `ted`, `consultarPagamento(id)`;
  - `webhookRegistrar/Consultar`.

  Cada conector declara `capacidades`. Função não suportada devolve "este banco não oferece; faça pelo arquivo X".
- **Tokens:**
  - guardados em memória do servidor até 60 s antes de vencer (Sicredi Pix: o reuso é obrigatório);
  - um pedido de token por vez por credencial (trava);
  - 401 → renova uma vez.
- **Registro:** `FIN_BANCO_CHAMADAS` (igual ao `CJU_CHAMADAS`): quando, empresa, banco, operação, HTTP, ms, resultado, mensagem limpa, quem, referência. Sem corpo, sem CPF/CNPJ completo, sem token.
- **Webhooks:**
  - **Fase 1:** consulta periódica: Pix recebidos a cada 10 min no expediente; boletos liquidados de hora em hora e às 23:00; extrato a cada 30 min e às 06:30. Mais simples e suficiente.
  - **Fase 2:** webhook em `https://sgo.metrolabs.com.br/_sgo/banco/<banco>/<empresa>/<segredo>`. O Sicredi Pix exige **mTLS de entrada** (cadeia Sicredi no proxy). Configurar no proxy reverso uma rota que pede certificado de cliente só nesse caminho. Validar a origem, gravar o evento cru em `FIN_BANCO_EVENTOS` e processar como a consulta (o mesmo código, idempotente).
- **Hosts a liberar na saída do servidor:**
  - `api-pix.sicredi.com.br`, `api-parceiro.sicredi.com.br`;
  - `api.sicoob.com.br`, `auth.sicoob.com.br`;
  - `sts.itau.com.br`, `secure.gateway.api.itau`, `api.gateway.itau.com.br`;
  - `auth.caju.com.br`, `services.caju.com.br`.

---

## 6. Fluxos operacionais

**Padrão de toda gravação** (já usado em Lançamentos e baixas, mantido):
1. **Prévia** mostra exatamente o que vai ao Omie e ao banco.
2. **Confirmação** com token de uso único (10 min, ligado à sessão e à empresa).
3. Relê o estado: título no Omie, saldo no banco.
4. Trava por operação.
5. **Código de integração fixo** (`codigo_lancamento_integracao`, `codigo_baixa_integracao`, `txid` Pix, `seuNumero` do boleto, `idempotency key` do pagamento) gerado do ID do SGO. Reenviar nunca duplica.
6. Sem resposta = "**a conferir**", nunca reenviado sozinho. A tela "Envios a conferir" consulta pelo código.
7. Trilha (`FIN_OMIE_OPERACOES` + `FIN_BANCO_CHAMADAS`).
8. Mensagens com o quê, por quê e o que fazer.

**Chaves de emergência:** `OMIE_GRAVACAO_LIGADA` e `FIN_PAG_BANCO_LIGADO`.

### 6.1 Receber (venda/serviço → dinheiro na conta → Omie conciliado)

| Passo | Quem | SGO+ | Omie | Banco |
|---|---|---|---|---|
| 1. Pedido/OS aprovado no Comercial ou contrato do mês | Comercial / rotina | Fila "A faturar" (já existe: Pedidos aprovados, Faturamento) | — | — |
| 2. Faturar | Wanessa | Prévia: cliente, itens, valor, impostos e retenções, vencimentos, **conta de recebimento** (empresa) e **forma**: boleto híbrido (padrão), Pix com vencimento ou depósito | `ValidarPedidoVenda`/`ValidarOS` → `FaturarPedidoVenda`/`FaturarOS` → NF-e/NFS-e e títulos (`VENR`) | — |
| 3. Cobrança | automático após o faturamento | Para cada título: boleto **pelo banco da conta** (`boletoEmitir`, `seuNumero` = `nCodTitulo`) ou `cobv` Pix (`txid` = `SGO` + id do título). Guarda nosso número, linha digitável, txid e QR | `AlterarContaReceber`: código de barras/observação; `IncluirAnexo` com o PDF do boleto | Registra o boleto ou a cobrança Pix |
| 4. Envio | automático | E-mail ao cliente com NF (PDF/XML via `dfedocs`/`osdocs`) + boleto/QR. Registra o envio (a Régua já existe) | — | — |
| 5. Acompanhar | Wanessa | Contas a receber + Régua de cobrança (já existe) com a situação do boleto/Pix | — | `boletoConsultar`, `pixConsultar` |
| 6. Pago | automático | Pix recebido / boleto liquidado / crédito no extrato → **conciliação automática** (seção 7). Confiança alta: baixa sozinho | `LancarRecebimento` (valor, juros/multa/desconto, data do crédito, conta, `conciliar_documento=S`, `codigo_baixa_integracao`) | — |
| 7. Exceções | Wanessa | Pago a mais ou a menos, pago duas vezes, Pix sem cobrança: fila "Recebimentos para conferir" | Baixa parcial / crédito avulso | Devolução Pix se for o caso (aprovação do dono/Charles) |
| 8. Prorrogar/cancelar | Wanessa | Prévia | `AlterarContaReceber` / `CancelarContaReceber` | `boletoAlterar` / `boletoBaixar` (Sicoob: só 30 min depois do registro) |

**Pontos de atenção:**
- **Idempotência:** o boleto usa `seuNumero` único; o Pix usa `txid` único. Antes de emitir, consultar se já existe.
- **Erro do banco:** a cobrança fica "não emitida — tentar de novo"; o título no Omie continua.
- **Sem API no banco:** o boleto é emitido pelo Omie (`GerarBoleto`, se a conta tiver convênio no Omie) ou "cobrança manual".

### 6.2 Pagar (nota/conta → aprovação → banco → Omie)

| Passo | Quem | SGO+ | Omie | Banco |
|---|---|---|---|---|
| 1. Entrada da obrigação | Wanessa / Compras / rotina | Origens: (a) NF-e de compra (XML, já existe importação); (b) NFS-e/boleto recebido em PDF lido pela IA (fornecedor, valor, vencimento, linha digitável); (c) Compras conferidas e faturas de cartão (já existe: espelho); (d) contas fixas (já existe); (e) guias (6.7); (f) folha (6.4); (g) lançamento manual | `IncluirContaPagar` com `codigo_lancamento_integracao` = id SGO, categoria, departamento (centro de custo), **forma de pagamento** (`cnab_integracao_bancaria.codigo_forma_pagamento` BOL/PIX/TRA, código de barras ou chave Pix ou dados bancários do cadastro), anexo | — |
| 2. Validar dados de pagamento | automático | Boleto: confere a linha digitável (dígitos, valor, vencimento) e consulta o beneficiário (CIP) quando o banco oferecer. Pix: consulta a chave (nome/CPF-CNPJ do recebedor) e compara com o fornecedor. TED: banco, agência, conta, titular | — | Consulta prévia (DICT/CIP) se houver |
| 3. Aprovação | **dono ou Charles** | Lista do dia (já existe em `FIN_PAG_ITENS`), agora com a **forma de pagamento validada** e o anexo. Aprovar em lote. Quem enviou não aprova | — | — |
| 4. Agendar/pagar | Wanessa toca "Pagar aprovados" (ou rotina às 09:00 para os que vencem hoje, **se o dono ligar**) | Escolhe a conta pagadora (padrão da empresa) e confere o saldo pela API. Prévia com o total por conta | — | `pagarBoleto` / `pixPagar` / `pagarTributo` / `ted`, com a data de vencimento (agendamento) e `idempotency` = id do item |
| 5. Confirmação do banco | automático | Status: agendado → efetivado / recusado. Comprovante (PDF) baixado | — | `consultarPagamento` |
| 6. Baixa | automático no efetivado | | `LancarPagamento` com a data efetiva, conta, juros/multa/desconto (pela diferença boleto × título), `conciliar_documento=S`; comprovante em `IncluirAnexo` | — |
| 7. Exceções | Wanessa | Recusado (saldo, dados) volta para "A pagar" com o motivo. Pago fora do SGO aparece no extrato e é conciliado (seção 7) | — | — |

**Banco sem API de pagamento (Itaú, Caixa, BB):**
- O SGO+ gera o **arquivo de remessa** (SISPAG/CNAB 240 de pagamentos) dos aprovados.
- A Wanessa envia o arquivo no Internet Banking.
- O retorno é importado e baixa no Omie.
- Na falta do arquivo, a lista "pagar no Internet Banking" mostra a linha digitável e a chave para copiar, e o pagamento é conferido pelo extrato.

**Dupla alçada no banco:**
- Se o banco exigir aprovação no Internet Banking para pagamento enviado por API (perguntar ao gerente, seção 12), o status fica "**aguardando autorização no banco**".
- O dono ou o Charles autorizam no app do banco. O SGO+ mostra a lista do que falta autorizar.

### 6.3 Transferir entre contas e entre empresas

1. A Wanessa escolhe: origem (empresa + conta), destino (empresa + conta), valor, data e motivo.
2. A prévia mostra o caso (seção 4.6), o saldo da origem e as aprovações necessárias.
3. Aprovação: regra da seção 4.7.
4. **Banco:** Pix ou TED pela API da origem, se houver pagamento. Se não houver, "já transferi no banco" (só registra).
5. **Omie:** `IncluirLancCC` com `transferencia` (mesma empresa) ou o par de títulos de mútuo baixados (empresas diferentes).
6. **Conciliação:** a saída e a entrada no extrato casam com `TRF-<id>` (valor + data + conta de destino) e são marcadas sem lançar de novo.
7. **Consolidado:** transferências entre empresas ficam fora da receita e da despesa do grupo.

### 6.4 Folha e prestadora (parte financeira)

O que for de cálculo é do contador/RH. No Financeiro:
1. **Importar a folha do mês:** arquivo do contador (CSV/planilha ou PDF lido pela IA) com empresa, colaborador (CPF), líquido, banco/Pix e vencimento.
2. **Conferir com o cadastro de colaboradores** (`CAD_USUARIOS`/RH) e pela tag "Funcionário" no Omie (18 cadastros hoje).
3. **Gerar no Omie, por empresa:** um título por colaborador (`IncluirContaPagarPorLote`, categoria Salários / Férias / Rescisão / 13º / Adiantamento / Pró-Labore; pagamento por Pix ou crédito em conta).
4. **Aprovação do lote** (dono ou Charles): um toque para o lote, com total e quantidade.
5. **Pagamento:** em lote pela API (Pix por CPF ou chave). Onde houver **folha por arquivo** (Sicredi/Sicoob/Itaú "conta salário"), gerar o arquivo. **O Sicredi tem API "Conta Salário"** (catálogo): avaliar.
6. **Encargos** (FGTS, INSS/DCTFWeb, IRRF) vêm como guias (6.7).
7. **Prestadora:** os funcionários que recebem pela prestadora são pagos **da conta da prestadora**. Se a prestadora não tiver caixa, primeiro uma **transferência entre empresas** (mútuo ou fatura de serviço, decisão do contador) e depois a folha.
8. **Sigilo:** o valor individual de salário só aparece para dono, Charles e Wanessa (a lista atual). Nos relatórios gerais, o total por categoria.

### 6.5 Caju (recarga e conciliação)

**Já existe:** Recarga Caju da rotina (pedido, aprovação, carga); Depósito de viagem; espelho Caju → Omie (B3); Conciliação Caju por CSV.

**v2:**
1. Com as chaves gravadas e testadas na homologação, a **carga** cria o pedido pela API (já programado) e efetiva com **Pix** (`PIX_CODE`).
2. O SGO+ **paga o Pix do Caju pela API do banco** (fluxo 6.2, aprovado pelo dono ou pelo Charles conforme a regra atual da recarga).
3. Acompanha até `REDEEMED` e lança no Omie (valor + taxa separada, já especificado em B3).

**Conciliação dos gastos:** CSV do portal, sem mudança. A API não tem gastos.

### 6.6 Cartões de crédito da empresa

- 187 a 193 compras no cartão por mês.
- **Já existe** em Compras: cartões, conciliação das faturas, espelho no Omie.
- **v2:** a fatura fechada gera, no Omie, o título da fatura (pagar no vencimento, fluxo 6.2) e a distribuição por categoria (`IncluirContaPagar` com várias categorias ou um título por categoria, **decidir com o contador**). Os lançamentos `CRC` de hoje são um por compra.

### 6.7 Impostos e guias

1. **Calendário fiscal por empresa (`FIN_IMPOSTOS_CALENDARIO`):** tributo, competência, dia de vencimento, regra de dia útil (antecipa ou posterga), quem gera (contador / SGO / SERPRO), conta pagadora, categoria do Omie.
   - O dono e o contador preenchem uma vez.
   - Sugestão inicial a confirmar com o contador: DAS dia 20; DCTFWeb/INSS dia 20; FGTS dia 20; IRRF dia 20; PIS/COFINS dia 25; ISS Goiânia (conferir); ICMS GO (conferir); IRPJ/CSLL trimestral.
2. **Chegada da guia:** a Wanessa anexa o PDF (ou e-mail do contador para uma caixa monitorada, fase 2). A IA extrai tributo, CNPJ, competência, vencimento, valor principal/multa/juros e linha digitável; a Wanessa confere.
   - O SGO **recusa** guia de CNPJ diferente da empresa escolhida.
   - O SGO **avisa** se o valor variar mais de 30 % sobre a média dos 3 últimos meses.
3. **Lançar:** conta a pagar no Omie (tipo DARF/DAS/GUIA, categoria do tributo, código de barras, anexo).
4. **Aprovar e pagar:** fluxo 6.2 (`pagarTributo` / convênio).
5. **Alertas:** guia não recebida 5 dias úteis antes do vencimento (e-mail à Wanessa, cópia ao dono), guia vencida, competência sem guia.
6. **Retenções nas notas:** relatório mensal de retenções sofridas (CR) e feitas (CP) por tributo, a partir dos campos `valor_*`/`retem_*`. Base para o contador e para as guias de retenção (ex.: ISS retido, PIS/COFINS/CSLL retidos).
7. **Opcional (SERPRO Integra Contador):** gerar DAS/DARF direto, sem PDF (custo por guia).

### 6.8 Fechamento do mês (já existe "Fechamento"; v2 completa)

**Checklist por empresa, com situação automática:**
1. Extratos de todas as contas importados até o último dia.
2. 100 % dos movimentos conciliados, ou justificados.
3. Nenhum título "pago e não baixado" (vencido a pagar com saída no extrato).
4. Faturas de cartão lançadas.
5. Caju conciliado.
6. Guias da competência lançadas.
7. Folha lançada.
8. Notas do mês × títulos (toda NF-e/NFS-e tem título; todo título de venda tem nota).
9. Saldos: banco (API) = Omie (`ObterResumoFinancas`/extrato) em cada conta no último dia.
10. Orçamento × realizado comentado.
11. XMLs enviados ao contador (`contador/xml`).
12. Fechamento contábil no Omie (`ObterResumoContador`).

**Fechar:** dono ou Charles. O mês fechado bloqueia lançamentos com data anterior no SGO e avisa no Omie (`bloqueado` no título quando fizer sentido).

### 6.9 Relatórios

Todos com filtro de empresa, consolidado, período, PDF A4 justificado (regra do dono) e CSV.

| Relatório | Fonte | Detalhe |
|---|---|---|
| DRE gerencial (caixa e competência) | Títulos do `mf` + `geral/dre` (estrutura do contador) + categorias | Receita bruta, deduções e impostos sobre venda, receita líquida, custos (mercadoria revenda, serviço contratado), despesas por grupo, resultado operacional, financeiro (empréstimos, juros, tarifas, rendimentos), resultado. Mês a mês, acumulado, % da receita. **Transferências e mútuos fora** |
| Fluxo de caixa realizado × previsto | Extrato (banco/Omie) + títulos em aberto + previsão estatística (já existe na foto) | Diário, semanal e mensal, por conta e empresa, saldo projetado |
| Aging a receber e a pagar | `mf` | Faixas a vencer / 1-30 / 31-60 / 61-90 / >90, por cliente/fornecedor |
| Por centro de custo | Departamento do título ou centro de custo do SGO | Exige classificar na entrada (F12) |
| Orçamento × realizado | `FIN_ORC_*` (SGO é a fonte) | Já existe, acrescentar empresa |
| Extrato por conta | Banco (API) e Omie | Com a marca conciliado / a conciliar |
| Posição de clientes e fornecedores | `mf` | Histórico, atrasos, prazo médio |
| Impostos | Títulos de imposto + retenções | Por competência |
| Pagamentos feitos pelo SGO+ | `FIN_PAG_*` + banco | Com comprovantes |
| Inadimplência e régua | Já existe | |

### 6.10 Cadastro completo de fornecedor e cliente (F3)

- **Formulário único** (cliente e fornecedor são o mesmo cadastro no Omie, separados por tag).
  - A busca por CNPJ na Receita preenche razão, fantasia, endereço, CNAE e Simples.
  - O usuário completa: e-mail financeiro, telefone, contato.
  - **Dados de pagamento:** chave Pix (validada pelo DICT quando o banco oferecer), banco/agência/conta, titular e CPF/CNPJ do titular (**tem de ser o do fornecedor**; se não for, exige justificativa e aprovação do dono ou do Charles, por risco de fraude), forma de pagamento padrão.
  - Categoria padrão, prazo padrão, tags.
- **Omie:**
  - `IncluirCliente` / `AlterarCliente` só com os campos mudados (regra "nunca sobrescrever sem merge"). `dadosBancarios.cChavePix`, `recomendacoes`, `tags` somadas.
  - **Alterar dados bancários** de um fornecedor já usado exige aprovação do dono ou do Charles e fica no histórico (é o golpe mais comum).
- **Mutirão:** a tela "Fornecedores sem dados de pagamento" é ordenada pelo volume pago nos últimos 90 dias, para completar primeiro os que mais recebem.

---

## 7. Conciliação automática

**Base:** a conciliação atual (auditoria de 19/11, seção 6: pontuação contra títulos em aberto, baixa no Omie). No v2, a **fonte do extrato passa a ser a API do banco** (OFX/CSV continuam como plano B), e a confirmação passa a ser **automática** quando a confiança for alta.

### 7.1 Chaves de casamento (da mais forte para a mais fraca)

| # | Regra | Origem no banco | Pontos |
|---|---|---|---|
| 1 | **Identificador emitido pelo SGO**: `txid` do Pix (cob/cobv), nosso número/`seuNumero` do boleto, id do pagamento enviado pela API, `TRF-<id>` | Pix recebido, boleto liquidado, retorno de pagamento | **Certeza (100 %)** |
| 2 | Código de barras / linha digitável igual ao do título a pagar | Pagamento de boleto feito fora do SGO | 95 |
| 3 | Valor igual ao saldo em aberto **e** CPF/CNPJ do pagador/recebedor igual ao do cadastro | Extrato (o CPF/CNPJ vem em 248 de 303 movimentos do Sicredi) | 90 |
| 4 | Valor igual ao saldo + juros/multa (até 25 %) ou desconto, **e** CPF/CNPJ igual | Extrato | 75 |
| 5 | Valor igual + documento/nota citado na descrição | Extrato | 70 |
| 6 | Valor igual + nome (palavras) + data até 3 dias do vencimento ou da previsão | Extrato | 50 a 60 |
| 7 | Só o valor | Extrato | 20 (nunca sozinho) |

**Regras de desempate (já existentes):**
- empate = escolha manual;
- o mesmo título nunca para dois movimentos;
- "Previsto" do Omie nunca conta como pago;
- movimento já baixado no Omie é só "conferido".

### 7.2 Níveis de confiança e o que acontece

| Nível | Critério | Ação |
|---|---|---|
| **Automático** | Regra 1, ou regra 2/3 com um único candidato e diferença de valor 0 | Baixa e concilia no Omie **sem pedir**. Aparece em "Conciliados hoje" com o botão "desfazer" (estorno pela trilha, dono ou Charles), enquanto o mês não for fechado. Ligado por `FIN_CONC_AUTO_LIGADA` (começa **desligado**: 2 semanas em modo sugestão, medindo acertos) |
| **Sugerido** | 60 a 89 pontos com um único candidato, ou regra 3/4 com juros | Fila da Wanessa com o título escolhido; um toque confirma; "confirmar todos os sugeridos" com prévia |
| **Para conferir** | Menos de 60, empate, parcial, sem candidato | Fila com o "o que fazer": lançar título novo (formulário preenchido com valor, data, CPF/CNPJ e fornecedor achado pelo CNPJ), lançamento avulso, transferência entre contas (o par do outro lado), devolução |

**Meta:** em 30 dias de uso, ≥ 70 % automático + sugerido nas contas Sicredi e Sicoob. O índice I17 (conciliação) já está previsto no painel.

### 7.3 Casos especiais

- **Tarifas bancárias, IOF, juros de cheque especial, débitos automáticos** (48 tarifas + 17 débitos automáticos em outubro):
  - **decisão do dono:** precisam de aprovação do dono ou do Charles, como as demais contas;
  - o SGO cria a conta a pagar já paga (data do débito) **em "aguardando aprovação"**, com categoria sugerida por regra (descrição do extrato → categoria, tabela `FIN_CONC_REGRAS`, ex.: "TARIFA" → 2.05.04, "IOF" → IOF);
  - aprovação **em lote** ("Aprovar todas as tarifas do dia"); aprovada → lança e concilia no Omie;
  - `FIN_PAG_DISPENSA_ABAIXO` pode dispensar aprovação abaixo de um valor, **se o dono quiser** (hoje vazio = tudo aprovado);
  - o débito automático do **mesmo fornecedor e valor do mês anterior** já aprovado vem sugerido com o histórico.
- **Débito automático grande:** em outubro houve 7 débitos de R$ 170 mil classificados como tarifa. A regra de categoria **nunca** classifica sozinho como tarifa um débito acima de `FIN_CONC_TARIFA_MAX` (padrão R$ 500). Acima disso vai para "Para conferir".
- **Aplicações e resgates automáticos** (CDB, rendimento):
  - regra por descrição → transferência entre a conta e a conta de aplicação (`CAIXA MATRIZ APLICAÇÃO`), sem receita;
  - rendimento → categoria 1.02.02.
- **Pix recebido sem cobrança:**
  1. procurar título pelo CPF/CNPJ;
  2. se não achar, "Recebimento sem título" com sugestão de cliente pelo CNPJ.
- **Pagamento parcial e pagamento duplicado:** "Para conferir", sempre.
- **Transferência entre contas próprias:** saída numa conta + entrada noutra, mesmo valor, até 2 dias úteis, descrição com o CNPJ do grupo → par sugerido como transferência; se já registrada pelo SGO, regra 1.

---

## 8. Indicadores para o dashboard (para o designer)

**Regras gerais:**
- Todos com o seletor de empresa (consolidado por padrão) e data de atualização.
- Números em pt-BR (R$ 1.234,56).
- Cada card abre a lista que o originou.
- Os que já existem na fotografia diária estão marcados com (F).

### 8.1 Dono e Charles (visão de decisão)

| Bloco | Conteúdo | Forma |
|---|---|---|
| Caixa agora | Saldo por banco e empresa (API; sem API = saldo do Omie, marcado), total disponível, aplicações separadas | Cards por empresa + lista por banco |
| Aprovações pendentes | Pagamentos, tarifas/débitos, transferências entre empresas, alteração de dados bancários de fornecedor, estornos: quantidade, valor e o mais antigo | Card de destaque com o botão "Aprovar" |
| Previsão de caixa 30/60/90 dias | Saldo projetado dia a dia (realizado + a receber × taxa de realização (F) − a pagar); dia de menor saldo; alerta se negativo | Gráfico de linha com faixa |
| Resultado do mês | Recebido, pago, resultado, margem (F, I07/I08); comparação com o mês anterior e com o orçamento | Barras |
| A receber | Em aberto, vencido, % vencido, >30 dias (F, I02-I05), aging (F) | Barras empilhadas |
| Inadimplência | Taxa de realização (F, I13), atraso médio (F, I10), top 10 devedores | Lista |
| Concentração | Top 5 clientes = % do aberto (F, I14); maiores fornecedores do mês | Lista |
| Despesas por categoria | Mês e 12 meses, com variação; alerta de categoria acima de 30 % da média | Barras horizontais |
| Orçamento × realizado | Por grupo de categoria (F, I15 quando houver orçamento) | Barras pareadas |
| DRE resumida | Últimos 6 meses | Tabela compacta |
| Riscos | Certificados a vencer, conta sem extrato há mais de 2 dias, fotografia não rodou, envios a conferir | Faixa de alertas |

### 8.2 Wanessa (visão de trabalho do dia)

| Bloco | Conteúdo |
|---|---|
| Hoje | A pagar hoje (aprovado / aguardando aprovação / sem dados de pagamento), a receber hoje, guias que vencem em 5 dias, boletos a emitir |
| Conciliação | Movimentos do extrato não conciliados por conta (meta zero), automáticos de hoje, sugeridos, para conferir, última importação por conta |
| Pendências | "Pago e não baixado" (vencido a pagar com saída no extrato), recebimentos sem título, envios a conferir, cobranças com erro, fornecedores sem dados de pagamento |
| Semana | A pagar e a receber por dia (calendário), saldo projetado por conta |
| Cobrança | Régua (já existe): promessas de hoje, quebradas, vencidos sem contato |
| Fechamento | Checklist do mês com a situação (6.8) |

### 8.3 Alertas (e-mail; WhatsApp só no expediente e só para o dono e o Charles, regra "WhatsApp sutil")

- saldo projetado negativo em até 7 dias;
- pagamento recusado pelo banco;
- guia sem lançamento a 5 dias úteis do vencimento;
- certificado ou token a vencer em 30 dias;
- conta sem extrato há mais de 2 dias úteis;
- conciliação automática desfeita;
- tentativa de alterar dados bancários de fornecedor;
- rotina diária que não rodou.

### 8.4 Telas por assunto (lista para o designer, mesma divisão do PLANO)

1. Painel
2. Contas a receber
3. Contas a pagar (com aprovação e pagamento)
4. Bancos e conciliação (saldos, extratos, conciliação, transferências)
5. Notas fiscais (NF-e/NFS-e saída e entrada, PDF/XML, cancelar)
6. Cobrança (boletos, Pix, régua)
7. Fornecedores e clientes
8. Impostos (calendário, guias, retenções)
9. Relatórios
10. Orçamento
11. Empresas e integrações (cadastro, contas, situação de cada conector, certificados)
12. Fechamento
13. Trilha e acessos

Celular: Painel, aprovações, saldos e conciliação sugerida (um toque) precisam funcionar bem no celular. Dono e Charles aprovam pelo celular.

---

## 9. Modelo de dados novo (resumo para o desenvolvedor)

Todas as tabelas novas têm `EMPRESA`, `CRIADO_*`/`ATUALIZADO_*`, alteração campo a campo e histórico (`*_HIST`) com motivo. Datas sempre `America/Sao_Paulo` e somas em centavos inteiros.

| Tabela | Uso |
|---|---|
| `FIN_EMPRESAS`, `FIN_EMPRESAS_HIST` | Seção 4.2 |
| `FIN_CONTAS_BANCO` | Contas por empresa e conector |
| `FIN_BANCO_CHAMADAS` | Registro de cada chamada aos bancos |
| `FIN_BANCO_EVENTOS` | Webhooks recebidos (cru, para reprocessar) |
| `FIN_EXTRATO` | Movimentos do banco: empresa, conta, data, valor (centavos), descrição, CPF/CNPJ, id do banco (único por conta), txid, nosso número, origem (API/OFX/CSV), situação de conciliação, título e baixa ligados |
| `FIN_SALDOS` | Saldo por conta e hora |
| `FIN_COBRANCAS_BANCO` | Boletos e Pix emitidos: título do Omie, banco, nosso número, `seuNumero`, txid, linha digitável, QR, situação, liquidação |
| `FIN_PAGAMENTOS_BANCO` | Pagamentos enviados: item aprovado (`FIN_PAG_ITENS`), forma, dados validados, id no banco, idempotência, situação (preparado / enviado / agendado / aguardando autorização no banco / efetivado / recusado / a conferir), comprovante, baixa no Omie |
| `FIN_TRANSFERENCIAS` | Seção 6.3 |
| `FIN_CONC_REGRAS` | Descrição do extrato → categoria / fornecedor / tipo (tarifa, aplicação…) |
| `FIN_IMPOSTOS_CALENDARIO`, `FIN_GUIAS` | Seção 6.7 |
| `FIN_FOLHA_LOTES`, `FIN_FOLHA_ITENS` | Seção 6.4 |
| `FIN_FORNECEDOR_PAGTO_HIST` | Mudanças de dados bancários com aprovação |
| `FIN_ROTINAS_LOG` | Toda rodada de rotina: início, fim, páginas, erro (corrige o "sem log" da fotografia) |

---

## 10. Segurança e auditoria

- **Acesso:** sigilo atual (dono, Charles, Wanessa) + caixas de poder por ação.
  - Caixas novas: `FIN_BANCO_PAGAR`, `FIN_BANCO_COBRAR`, `FIN_TRANSFERIR`, `FIN_EMPRESAS`, `FIN_IMPOSTOS`.
  - **Aprovação:** só dono ou Charles, sempre (`OmieRegras_podeAprovar_`).
- **Segregação:** quem prepara não aprova. O pagamento só sai com aprovação registrada **e** a gravação no banco ligada.
- **Limite diário por conta de pagamento por API:** `FIN_PAG_LIMITE_DIA_<E>`, definido pelo dono; acima dele, nova aprovação.
- **Dados bancários de fornecedor:** alterar exige aprovação. Pagamento a conta de titular diferente do fornecedor exige justificativa e aprovação.
- **Segredos:**
  - só no servidor; nunca no legado, na tela, no registro ou no e-mail;
  - a mensagem de erro passa por limpeza (como `CajuApi_limpar_`);
  - certificados com aviso de vencimento.
- **Trilha:** toda gravação (Omie e banco) com quem, quando, empresa, antes e depois e resultado. Estorno só pela trilha, dono ou Charles.
- **Marca d'água e registro de acesso** nas telas e PDFs (já existe).

---

## 11. Etapas de desenvolvimento sugeridas

Cada etapa é publicável, com suíte 0 falhas, ajuda e manual no mesmo commit, e sem publicar entre 06:00 e 08:30. Mapeia as etapas (a) a (e) do PLANO.

| Etapa | Conteúdo | Depende do dono? |
|---|---|---|
| **a1** | `FIN_EMPRESAS` + `FIN_CONTAS_BANCO` + seletor de empresa + `Omie_credenciais_(empresa)` com compatibilidade + coluna `EMPRESA` nas tabelas + chaves novas em Chaves e senhas e `/_sgo/segredos` (campo de várias linhas e arquivo) + `FIN_ROTINAS_LOG` (e correção da fotografia) | CNPJs/razões; modo de cada empresa |
| **a2** | Dashboard novo (8.1/8.2) sobre a fotografia (por empresa) | — |
| **b1** | Transferência entre contas (`IncluirLancCC` + `transferencia`) e entre empresas (mútuo); 1ª operação acompanhada | Categoria de mútuo (contador) |
| **b2** | Cadastro completo de fornecedor/cliente (6.10) + mutirão de dados de pagamento + aprovação de mudança bancária | — |
| **b3** | Contas a pagar com forma de pagamento (`cnab_integracao_bancaria`), anexos (`geral/anexo`), lote (`IncluirContaPagarPorLote`), leitura de boleto/NFS-e em PDF pela IA | — |
| **c1** | Serviço `bancos` no Node (mTLS, tokens, registro) + conector **Sicredi**: saldo, extrato, Pix recebidos; extrato automático na conciliação | Chaves Sicredi gravadas (homologação primeiro) |
| **c2** | Conciliação automática (seção 7) em modo sugestão → automático | Ligar `FIN_CONC_AUTO_LIGADA` após 2 semanas |
| **c3** | Sicredi cobrança: boleto híbrido e Pix cobv + baixa automática | Cobrança Online liberada |
| **c4** | Sicredi Multipag: pagar aprovados (Pix, boleto, tributo) + comprovante + baixa | Multipag liberado; regra de dupla alçada |
| **c5** | Caju com chaves: homologação → produção; recarga paga por Pix pela API | Chaves Caju gravadas |
| **d1** | Notas: listar NF-e/NFS-e, PDF/XML, cancelar, enviar ao cliente | — |
| **d2** | Impostos: calendário, guias por PDF, retenções, alertas | Calendário (contador) |
| **d3** | Relatórios: DRE (com `geral/dre`), fluxo realizado × previsto, aging, por empresa e centro de custo, extrato | De-para da DRE (contador) |
| **d4** | Folha/prestadora em lote | Formato do arquivo do contador |
| **d5** | Fechamento completo (6.8) | — |
| **e1** | Conectores **Sicoob** e **Itaú** prontos, ligados quando as chaves chegarem; Itaú: tela de geração do certificado; arquivo SISPAG/CNAB para pagamentos | Chaves e contratos |
| **e2** | Webhooks (fase 2) com mTLS de entrada no proxy | Configuração do proxy no servidor |

**Ordem recomendada:** a1 → a2 → b1 → b2 → c1 → c2 → b3 → c3 → c4 → d1 → d3 → d2 → c5 → d4 → d5 → e1 → e2. A c1 entra cedo porque o extrato automático do Sicredi (a conta mais movimentada) é o que mais tira trabalho da Wanessa.

---

## 12. O que depende do dono (e de terceiros)

### Dados

1. CNPJ, razão social, IE/IM e regime das **3 empresas**.
2. A filial e a prestadora **têm Omie próprio?** Se sim, App Key/Secret de cada uma.
3. A qual empresa pertence cada conta bancária. Em especial: Sicoob, Itaú Metrolabs, Caixa matriz/filial, Banco do Brasil.
4. **Gravar** as chaves do Sicredi e do Caju. Nenhuma está gravada hoje.

### Bancos e terceiros

5. **Sicredi:** liberar, em cada empresa, Pix, Cobrança Online (híbrido), Extrato/Saldo e Multipag. Perguntar se o pagamento por API fica pendente de autorização no Internet Banking.
6. **Sicoob e Itaú:** contratos e credenciais (`CREDENCIAIS_PARA_O_DONO.md`). Itaú: perguntar se há API de pagamentos; se não houver, aceitar o arquivo SISPAG.
7. **Contador:**
   - categoria e tratamento do **mútuo entre empresas** e do repasse para a folha da prestadora;
   - calendário fiscal de cada empresa;
   - de-para da DRE;
   - revisão das categorias "Tarifas Bancárias" (R$ 275 mil em out/26, R$ 70 mil em set/26) e "EMPRESTIMO";
   - de qual empresa é o DAS pago no Omie da matriz.

### Decisões (recomendação entre parênteses)

8. Transferência entre contas da mesma empresa sem aprovação até um valor? (Sim, até R$ 5.000 na mesma empresa; entre empresas, sempre aprovar.)
9. Conciliação automática sem toque humano no nível "certeza"? (Sim, depois de 2 semanas em modo sugestão.)
10. Pagar automaticamente às 09:00 os itens aprovados que vencem no dia? (Sim, com limite diário por conta.)
11. Dispensa de aprovação para tarifas abaixo de um valor? (Decisão atual: tudo aprovado. Sugestão: aprovação em lote, sem dispensa.)
12. Limite diário de pagamento por API por empresa.
13. Integra Contador (SERPRO, pago) ou guias em PDF do contador. (Começar pelo PDF.)
14. Centro de custo: usar os departamentos do Omie ou criar centros de custo no SGO e espelhar como departamento. (Espelhar: o SGO como fonte, coerente com a decisão do orçamento.)

### Wanessa (lista do PLANO)

15. Responder as perguntas da seção 1.8.

---

## 13. Fontes

**Omie:**
- [Lista de serviços](https://developer.omie.com.br/service-list/)
- [mf](https://app.omie.com.br/api/v1/financas/mf/)
- [contapagar](https://app.omie.com.br/api/v1/financas/contapagar/)
- [contareceber](https://app.omie.com.br/api/v1/financas/contareceber/)
- [contareceberboleto](https://app.omie.com.br/api/v1/financas/contareceberboleto/)
- [pix](https://app.omie.com.br/api/v1/financas/pix/)
- [contacorrentelancamentos](https://app.omie.com.br/api/v1/financas/contacorrentelancamentos/)
- [caixa](https://app.omie.com.br/api/v1/financas/caixa/)
- [anexo](https://app.omie.com.br/api/v1/geral/anexo/)
- [nfconsultar](https://app.omie.com.br/api/v1/produtos/nfconsultar/)
- [nfse](https://app.omie.com.br/api/v1/servicos/nfse/)
- [contador/resumo](https://app.omie.com.br/api/v1/contador/resumo/)

**Sicredi:**
- [Portal](https://developer.sicredi.com.br/api-portal/pt-br)
- [Guia técnico API Pix (PDF, jan/2026)](https://www.sicredi.com.br/media/produtos/filer_public/2026/01/13/guia_tecnico_integracoes_apipix.pdf)
- [Contrato PJ 2026 (anexo Multipag)](https://www.sicredi.com.br/media/produtos/filer_public/2026/04/28/revisao_contrato_base_conta_pj_sicredi_revisao_2026_versao_final_publicacao_site_26032026.pdf)
- [Manual de pagamentos CNAB](https://www.sicredi.com.br/media/produtos/filer_public/2024/04/18/manual-pagamentos1804.pdf)
- Secundárias: [Omie — boletos Sicredi via API](https://ajuda.omie.com.br/pt-BR/articles/7187634-configurando-a-integracao-com-o-sicredi-boletos-via-api), [ACBr](https://www.projetoacbr.com.br/forum/tags/liquidado/), [CIGAM](https://www.cigam.com.br/wiki/index.php/GF_-_Como_Fazer_-_Open_Banking_para_Banco_Sicredi)

**Sicoob:**
- [Portal](https://developers.sicoob.com.br/portal/)
- [Serviços para empresa](https://www.sicoob.com.br/web/sicoob/servicos-empresa/-/asset_publisher/lPNqdz0jZZX1/content/id/166036588)
- Secundárias: [CIGAM](https://www.cigam.com.br/wiki/index.php/GF_-_Como_Fazer_-_Open_Banking_para_Banco_SICOOB), [ACBr v3](https://www.projetoacbr.com.br/forum/topic/77945-migra%C3%A7%C3%A3o-api-cobran%C3%A7a-banc%C3%A1ria-v3-do-banco-sicoob/), [Omie](https://ajuda.omie.com.br/pt-BR/articles/10149878-configurando-a-integracao-com-o-sicoob-boletos-via-api)

**Itaú:**
- [Certificado dinâmico](https://devportal.itau.com.br/certificado-dinamico)
- [Mudança de certificados e hosts 2026](https://devportal.itau.com.br/api-certificates-expiration-2026)
- [Pré-requisitos](https://devportal.itau.com.br/pre-requisitos-para-se-conectar-ao-ambiente-itau)
- [Guia de autorização](https://devportal.itau.com.br/guia-de-autorizacao)
- [SISPAG CNAB](https://download.itau.com.br/bankline/sispag_cnab.pdf)
- [camt.053](https://www.itau.com.br/media/dam/m/f93a4a663581443/original/itau-empresas-manual-camt-053.pdf)

**Caju:**
- `output/deposito-viagem-20261111/ESTUDO_API_CAJU.md` (lido com o acesso de parceiro; a documentação pública exige login)
- `SGO_Caju_Api.js`

**SERPRO Integra Contador:**
- [Notícia SERPRO](https://serpro.gov.br/menu/noticias/noticias-2022/integra-contador-unifica-acesso-a-informacoes-contabeis)
- [Lista de serviços](https://www.istoedinheiro.com.br/receita-e-serpro-lancam-solucao-para-servicos-contabeis-integra-contador/)
