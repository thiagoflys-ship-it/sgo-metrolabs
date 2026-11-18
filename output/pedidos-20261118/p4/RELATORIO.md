# Pacote 4 de 18/11/2026 — Viagem e recarga (itens 12 e 13) — Relatório

**Base:** `output/financeiro-20261116/cand29`. Antes deste trabalho ela era igual à cand28, que é a produção atual (`diff -rq` vazio).

**Diff completo:** `legado-p4.patch` (cand28 → cand29).

**O que não foi feito:**
- Nada foi publicado e não houve commit.
- Nada foi gravado na produção. Houve uma leitura no banco com `default_transaction_read_only=on`: as abas `REG_FROTA_ABASTECIMENTO`, `CAD_VEICULOS` e `VIA_POLITICA`, copiadas para a pasta temporária da sessão (fora do projeto).
- Caju, Omie, Gemini, e-mail e WhatsApp reais não foram chamados. Os testes usam os simuladores.
- Não mexi no servidor Node, no bloqueio da Frota e no rastreador, no chat do RH360, nos PGT/POP gerados, no `/opt/metrolabs/sgo/cofre` nem no Portal do cliente.

**Placar:** **suíte completa 2665 aprovados / 0 falhas, 293 arquivos, todos com saída 0** (a diferença em relação à referência são os 12 testes novos) (`suite.txt`; referência anterior: 2653 / 0).

**Testes novos:**

| Arquivo | Testes | Resultado |
|---|---|---|
| `tests/pedidos-20261118-p4-viagem.test.cjs` | 7 | verdes |
| `tests/pedidos-20261118-p4-semanal.test.cjs` | 4 | verdes |
| `tests/pedidos-20261118-p4-telas.test.cjs` | 1 (tela real a 1366 e 390 px) | verde |

## 1. O que foi feito, por item

### Item 12a — Valor da recarga da viagem: total, proporcional ou fixo

**Como funciona:**
- O total da solicitação continua sendo a soma das linhas, nunca digitado.
- O quadro novo "Recarga no cartão Caju" (no fim da etapa 5 do formulário) define quanto vai para o cartão:
  - **Valor total da solicitação:** como antes; é o padrão.
  - **Percentual do total:** usa o percentual definido na política.
  - **Valor fixo informado:** precisa ser menor ou igual ao total e exige um motivo de 10 letras ou mais.

**Política de viagem (`VIA_POLITICA`), campos novos:**
- `recargaModo`: o padrão é **"Quem pede escolhe"**. Também pode ser fixado em "sempre o total", "sempre o percentual" ou "sempre fixo".
- `recargaPercentual`: **VAZIO**. Enquanto estiver vazio, a opção proporcional não aparece. Se alguém a escolher, a tela recusa e diz o que fazer.
- Não dá para gravar "sempre proporcional" sem preencher o percentual.

**Aprovação e carga:**
- O valor da recarga entra na marca da aprovação, mas **só quando não é o total**. Assim, as solicitações em andamento mantêm a mesma marca. Isso foi testado comparando com o código da cand28.
- Na aprovação final, o valor é gravado em `APROVADO_RECARGA`. Vazio quer dizer "o total aprovado", como antes.
- Passam a usar a recarga aprovada:
  - a carga manual e a carga pelo Caju;
  - o "falta carregar" e a lista "Carga no cartão";
  - as pendências e as contagens;
  - a tela "Créditos" e a divergência "crédito acima do aprovado" da Conciliação Caju.
- A recarga aparece também:
  - na tela da solicitação;
  - no aviso a quem aprova e no aviso ao Financeiro;
  - no A4 da solicitação;
  - no A4 de fechamento (linha "Recarga aprovada para o cartão").
- O que faltar na viagem é pago com dinheiro próprio e volta como reembolso na prestação de contas. Esse fluxo já existia.

### Item 12b — Combustível pelo consumo real do veículo

**Botão "Calcular pelo veículo"** na linha de combustível, quando o veículo é da Frota. Ele preenche:
- **Consumo:** a mediana dos intervalos entre abastecimentos do veículo, com a mesma regra e as mesmas funções da Frota (`FrotaAb_kmLVeiculo_` e `FrotaR_intervalosConsumo_`). São exigidos 3 intervalos coerentes ou mais; lançamentos "a conferir" e rendimentos impossíveis ficam fora da média.
- **Preço do litro:** valor ÷ litros do último abastecimento do veículo. Se o veículo não tiver abastecimento com valor, usa o preço de referência da política (`precoLitroPadrao`, **VAZIO**).

**Registro e conferência:**
- A linha guarda de onde veio cada número (`calculo`: consumo e preço com origem FROTA, POLITICA ou INFORMADO, mais o texto).
- O texto "Como foi calculado" aparece na tela, na tabela da solicitação e no A4.
- Se a pessoa muda o consumo ou o preço à mão depois do cálculo, a origem passa a "informado" e o texto registra a alteração.
- Se o veículo não tem leituras suficientes, a tela diz quantos intervalos ele tem e pede o consumo e o preço.
- Na conferência, um consumo digitado mais de 15% diferente do real do veículo vira apontamento para quem aprova. Não bloqueia o envio.

### Item 12c — "Sem combustível nesta viagem"

- Na categoria Combustível há dois atalhos:
  - "Abastece pelo cartão da frota (Itaú)";
  - "Tanque cheio, cabe na autonomia".
- O atalho marca "Não se aplica" com o motivo padrão, que pode ser editado. Tira as linhas de combustível, e o combustível sai do total e da recarga.
- O motivo vai para quem aprova e para o A4.
- Não foi criada coluna nova: o atalho usa o "Não se aplica" que já existia e já entra na aprovação.

### Item 12d — Alerta ao Financeiro para recolher a sobra

**Quando dispara:** quando a prestação é enviada. A partir daí:
- o Financeiro (quem confere viagens e está na **lista de sigilo**) recebe o aviso por sistema e e-mail, com o valor só no corpo, nunca no assunto;
- aparece a pendência `viagem_recolher`: "Recolher a sobra de R$ X do cartão Caju de Fulano (viagem VIA-...)".

**Prazo e cobrança:**
- O prazo é `prazoRecolhimentoDiasUteis` da política: 2 dias úteis depois do envio.
- Vencido o prazo, a rotina diária manda o aviso uma vez e a pendência fica crítica.

**Quanto recolher:** o menor entre:
- o saldo no cartão, que é o carregado menos os gastos lançados com o cartão menos o que já foi recolhido no Caju;
- a devolução prevista pela conta.

O que for glosa a pessoa devolve por depósito ou PIX.

**Depois da conferência:**
- O item de acerto que já existia (`viagem_acerto`) passa a mostrar esse valor e esse prazo.
- Isso só acontece quando todos que o recebem são da lista de sigilo; caso contrário, fica o título antigo, sem valor.
- Não fica item duplicado.

**Registro de quando foi recolhido:**
- É o acerto que já existia: Devolução, "Recolhimento do saldo no Caju", com a data e o comprovante.
- É o mesmo `VIA_FORMAS_ACERTO` que a Recarga Caju (bloco C) usa e que a Conciliação Caju liga ao extrato. Não há fluxo duplicado.

**Onde mais aparece:**
- Na tela da solicitação, o Financeiro vê o quadro com o que fazer, e quem viajou vê "você não precisa fazer nada".
- O id da pendência começa com `VIA:ACERTO:`, então o relatório diário mostra só a contagem do Financeiro.

### Item 13 — Recarga semanal com a programação da semana

Ficou como um **tipo de pedido dentro da Recarga Caju** (`TIPO = SEMANAL`), sem módulo novo. Continuam valendo o mesmo portador, termo, carga, prestação gasto a gasto, conferência, período e devolução.

**Na tela do portador** ("Pedir recarga" > "Recarga semanal (com a programação)"):
- Escolhe a semana (segunda a domingo), a atual ou até 6 semanas à frente.
- "Puxar da minha agenda" traz as O.S. do SGO+ e as tarefas do Auvo agendadas para a pessoa na semana, pela fonte única da Assistência, sem as canceladas. Cidade e UF vêm do endereço quando dá. É só leitura.
- Cada item tem dia, cidade, cliente, O.S. ou tarefa, atividade, finalidade e valor previsto. A conferência aponta, item a item, o que falta.

**Cálculo do valor:**
- O valor **não é digitado**: é o previsto menos o saldo da rotina que já está no cartão (pelo extrato importado ou, sem ele, pelo que foi lançado).
- Isso segue a política `semanalDescontarSaldo`, ligada por padrão.
- Se o saldo cobre a semana, o pedido é recusado com a explicação.

**Aprovação:**
- Sempre do dono e da Diretoria (etapa DIRETORIA), mesmo com `APROVACAO_SO_DIRETORIA = NAO`.
- A Wanessa é recusada com o motivo.
- Quem pede não aprova.

**Limite:** uma recarga semanal por semana; as negadas e as canceladas não contam.

**Política, campos novos:**
- `semanalLigado`: sim.
- `semanalTeto`: **vazio**. Quando for preenchido e o previsto passar dele, o portador justifica e o pedido leva o motivo.
- `semanalValorDia`: **vazio**.
- `semanalDescontarSaldo`: sim.

Cada campo tem a explicação embaixo e versão com motivo.

**Previsto × realizado:**
- Na tela do portador e no Painel financeiro > Recarga Caju.
- Compara os gastos lançados com data na semana, por dia e por finalidade, mais o que do extrato ainda falta comprovar.
- Mostra a sobra prevista e quais itens com O.S. tiveram gasto ligado.

**Gestão:** o pedido semanal mostra a tabela da programação, o previsto, o saldo descontado e o comparativo.

### Ajuda, manuais e assistente

**Ajuda:**
- `SGO_Ajuda_DepositoViagem.js`: passos novos ("Combustível e recarga no cartão", "Sobra no cartão a recolher"), problemas, perguntas e a seção do manual.
- `SGO_Ajuda_RecargaCaju.js`: passo "Pedir a recarga semanal", problemas e pergunta.
- `JS_Omie_Ajuda.html`: guia da aba Recarga.

**Manuais** (fora da cand29, CRLF preservado):
- `docs/MANUAL_DEPOSITO_VIAGEM.md`: seção 21.
- `docs/MANUAL_RECARGA_CAJU.md`: seção 10.
- `docs/MANUAL_PAINEL_FINANCEIRO.md`: seção 8s, só sigilo.

**Assistente:** base regerada (`SGO_AssistenteManuais.js`). Mudaram só os trechos novos: 26 linhas de diferença.

## 2. Arquivos (relativos à cand29)

**Novos:**
- `SGO_Viagem_Recarga.js`: recarga proporcional ou fixa, consumo do veículo, "sem combustível" e sobra a recolher.
- `SGO_RecargaCaju_Semanal.js`: semana, agenda, programação, cálculo e previsto × realizado.

**Alterados.** Todos continuam LF, menos `JS_Omie_Ajuda.html`, que continua CRLF; conferido arquivo a arquivo.

| Arquivo | O que mudou |
|---|---|
| `SGO_Viagem.js` | Colunas novas: `RECARGA_MODO`, `RECARGA_PERCENTUAL`, `RECARGA_VALOR`, `RECARGA_JUSTIFICATIVA`, `APROVADO_RECARGA`, `RECOLHER_PRAZO`, `RECOLHER_AVISADO_EM`; cache `VIA_ABAS_OK_V4`. Política nova. Conteúdo com recarga e cálculo. `Via_recargaAprovada_` e `Via_aCarregar_`. Tipo `viagem_recolher`. Ação `consumoVeiculo`. |
| `SGO_Viagem_Prestacao.js` | Pendência e aviso da sobra, item do acerto com valor e prazo, rotina. |
| `SGO_Viagem_Documento.js`, `SGO_Viagem_Fechamento.js` | A4. |
| `SGO_Caju_Pedidos.js`, `SGO_Caju_Conciliacao.js` | Carga, créditos e divergência pela recarga aprovada. |
| `SGO_RecargaCaju.js` | Colunas `TIPO`, `SEMANA_DE`, `SEMANA_ATE`, `PROGRAMACAO_JSON`, `PREVISTO_TOTAL`, `SALDO_DESCONTADO`; cache `RCJ_ABAS_OK_V2`. Política semanal. Pedido semanal. Ação `agendaSemana`. |
| `SGO_RecargaCaju_Prestacao.js` | Pedido semanal na tela; dados da semanal em "minha". |
| `JS_DepositoViagem.html` | Quadro da recarga, "Calcular pelo veículo", atalhos de "sem combustível", recarga na tela, sobra a recolher, campos da política. |
| `JS_RecargaCaju.html` | Formulário da recarga semanal; pedido semanal com o comparativo. |
| `JS_RecargaCaju_Gestao.html` | Programação e comparativo no pedido; campos da política. |
| `SGO_Ajuda_DepositoViagem.js`, `SGO_Ajuda_RecargaCaju.js`, `JS_Omie_Ajuda.html` | Ajuda. |
| `SGO_AssistenteManuais.js` | Base regerada. |

**Fora da cand29:**
- Manuais: `docs/MANUAL_DEPOSITO_VIAGEM.md`, `docs/MANUAL_RECARGA_CAJU.md`, `docs/MANUAL_PAINEL_FINANCEIRO.md`.
- Testes novos: `tests/pedidos-20261118-p4-viagem|semanal|telas.test.cjs`.
- Ajustados os ambientes de teste (carregam os arquivos novos quando eles existem na pasta):
  - `tests/_viagem_ambiente.cjs` (`SGO_Viagem_Recarga.js`);
  - `tests/_caju_ambiente.cjs` (`SGO_RecargaCaju_Semanal.js`).
- Nenhum teste antigo foi alterado.

## 3. Decisões

- **Percentual da recarga, teto semanal, valor por dia e preço do litro de referência ficaram vazios.** Nenhum valor foi inventado.
- **Prazo do recolhimento: 2 dias úteis.** Não havia número do dono; segui o mesmo padrão do prazo do comprovante da Recarga Caju. O campo é configurável na política (1 a 30).
- **Diferença de consumo que gera apontamento: 15%.** É fixa no código e não bloqueia o envio.
- **O alerta da sobra começa no envio da prestação, não na volta da viagem.** Antes do envio o sistema não sabe o que foi gasto. Com o extrato importado, a Conciliação Caju já mostra o saldo.
- **A recarga semanal sempre vai à Diretoria**, mesmo que a regra do Financeiro seja desligada. É a regra dada para este pedido.
- **A recarga semanal desconta o saldo do cartão**, para economizar nas recargas, como o Matheus pediu. Dá para desligar na política.

## 4. Riscos e o que muda no primeiro dia

**Mudanças técnicas:**
- **Colunas novas.** Os caches mudam para `VIA_ABAS_OK_V4` e `RCJ_ABAS_OK_V2`, e as colunas são criadas na primeira chamada depois de publicar.
- **Solicitações antigas:** como a recarga fica vazia, continuam iguais (a carga é o total). A marca da aprovação não muda; isso foi testado com o código da cand28.

**Gestores que montam viagem:**
- Veem o quadro "Recarga no cartão Caju" com "Valor total" já escolhido.
- Veem o botão "Calcular pelo veículo" e os atalhos de "sem combustível".
- A opção proporcional só aparece quando a Diretoria gravar o percentual.

**Wanessa e Fábio:**
- Passam a receber o aviso e a pendência "Recolher a sobra..." quando uma prestação chegar com saldo no cartão.
- O item do acerto depois da conferência passa a mostrar o valor e o prazo.

**Técnicos portadores:**
- Veem "Recarga semanal (com a programação)" em Minha recarga Caju.
- O pedido semanal vai ao dono e ao Charles.

**Risco:**
- "Puxar da minha agenda" depende do `TECNICO_ID` das O.S. e do vínculo do técnico no Auvo.
- O.S. sem técnico não aparecem e são declaradas à mão.

## 5. Veículos com leituras suficientes para o consumo (produção, leitura de 18/11/2026)

Dados: `REG_FROTA_ABASTECIMENTO`, 21 abastecimentos, calculados com o código real (`Via_consumoVeiculo_`).

| Veículo | Consumo real | Intervalos válidos (fora da média) | Último preço do litro |
|---|---|---|---|
| PQB4394 (Onix 1.0) | **9,80 km/L** | 4 (3 fora) | R$ 6,84 (13/11/2026) |
| PRP8J05 (Montana LS2) | **8,03 km/L** | 5 (2 fora) | R$ 6,84 (16/11/2026) |
| GFU5G11 (Mobi 1.0) | insuficiente | 0 (só 1 abastecimento) | R$ 6,98 (05/11/2026) |
| PRD6C57 (Montana LS2) | insuficiente | 0 (só 1 abastecimento) | R$ 6,69 (05/11/2026) |

**Leitura dos resultados:**
- Dois veículos já calculam sozinhos. Nos outros dois, a tela pede o consumo até haver 3 intervalos.
- O GFU5G11 tem um abastecimento com KM 127,2, provavelmente digitado errado. Vale corrigir na Frota.
- Os intervalos fora da média são lançamentos "a conferir" ou "corrigidos" com rendimento impossível; a conferência na Frota melhora o número.

## 6. Capturas e suíte

**Capturas** (`capturas/`, tela real, página inteira, a 1366 e 390 px, sem rolagem lateral e sem erro de JavaScript):
- formulário da viagem com o combustível calculado pelo veículo e a recarga fixa;
- solicitação com a recarga;
- "sem combustível";
- política de viagem;
- sobra a recolher (visão do Financeiro);
- recarga semanal com a programação puxada da agenda;
- pedido semanal enviado;
- gestão com a programação;
- política da recarga com os campos da semanal.

**Suíte:** `suite.txt`; o log está em `suite-execucao.log`.

## 7. O que depende de dado ou decisão que não existe

- **Percentual da recarga proporcional:** vazio até a gestão informar, em Depósito de viagem > Política.
- **Preço do litro de referência:** vazio; vale o último abastecimento do veículo.
- **Teto semanal e valor de referência por dia da recarga semanal:** vazios, por decisão do dono.
- **Prazo do recolhimento:** confirmar se 2 dias úteis está bom.
- **Consumo dos veículos GFU5G11 e PRD6C57:** depende de mais abastecimentos lançados na Frota (e da correção do KM 127,2 do GFU5G11).
