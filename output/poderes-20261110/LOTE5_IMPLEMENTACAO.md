# Acessos por caixas — Lote 5: Compras (implementação)

Implementação de 11/11/2026, só no candidato local `output/poderes-20261110/base/legado`. **Nada foi publicado**, não houve acesso ao servidor (sem ssh) e não houve `git commit`. Cópia do legado antes da mudança: `output/poderes-20261110/lote5-antes-legado` (referência da equivalência e da suíte "antes").

Estado real: **preparado e testado localmente** (vm com o código real de Compras e do motor das caixas, 23 contas reais, configuração real de Compras e `gestoresPorArea` real). **Não publicado, não verificado em produção, sem ensaio no navegador** (ver Limites).

---

## 1. Poderes ligados

`SGO_PODERES_LIGADOS` (SGO_Poderes.js:31-39) ganhou **os 10 poderes do lote 5** (total: 28 ligados):

`COMPRAS_PEDIR`, `COMPRAS_VER_FILA`, `COMPRAS_VER_VALORES`, `COMPRAS_COMPRAR`, `COMPRAS_APROVAR_ATE_LIMITE`, `COMPRAS_APROVAR_DA_AREA`, `COMPRAS_APROVAR_SEM_LIMITE`, `COMPRAS_GESTAO`, `COMPRAS_REGRAS_EDITAR`, `COMPRAS_CIENCIA_GESTAO`.

Nenhuma trava de Compras está no servidor Node (`src/`: nenhuma ocorrência de `Cmp_` ou `COMPRAS_`); nada ficou desligado por esse motivo. `FIN_CONFERIR_COMPRAS` (Financeiro) não é deste lote e não foi tocado.

---

## 2. Como foi feito (espelho)

A regra padrão de cada caixa continua sendo a de hoje (`Cmp_nivelDe_` e `CmpC_rota_`): lista de compradores e substitutos, área de Compras, gestor de cada área (Caixa de decisões > Regras e responsáveis, senão o Gestor da área no cadastro) e Diretoria. **Só a alteração gravada para a pessoa em Administração > Acessos muda o resultado**: SIM dá o poder; NÃO tira, inclusive de quem está na lista de compradores. O dono do sistema nunca perde caixa (origem `dono` do motor é ignorada aqui: ele continua com o que tinha, que já é tudo).

Motor do lote (SGO_Compras_Config.js, CRLF preservado):

| Linha | Nome | O quê |
|--:|---|---|
| 455 | `Cmp_eu_` | depois do nível de sempre, chama `Cmp_aplicarCaixas_(eu, sessão)` |
| 466 | `CMP_CAIXAS` | os 10 códigos do lote |
| 468 | `Cmp_aplicarCaixas_(eu, sessao)` | `eu.cx = { CODIGO: 'SIM' \| 'NAO' }` só com as alterações gravadas (origem `excecao` de `Poderes_avaliar_`) dos códigos ligados; sem motor, sem `userId` ou sem nenhuma alteração da pessoa, sai sem consultar nada. Sobrepõe `comprador`, `veFila`, `veValores` e `regras` |
| 490 | `Cmp_cx_(eu, codigo, padrao)` | SIM/NÃO gravado ou, sem alteração, a expressão de antes |
| 495 | `Cmp_msgCaixa_(eu, codigo, msgPadrao, acao)` | recusa por NÃO: «nome da caixa», o que faz e "Administração > Acessos"; sem alteração, a mensagem de antes |
| 499 | `CMP_NIVEL_CAIXA` | nível do `Cmp_exigir_` → caixa (COMPRADOR, VALORES, FILA, REGRAS, GESTAO, INTERNO; FINANCEIRO fica fora: é do Financeiro) |

---

## 3. Travas trocadas (arquivo:linha no candidato)

| Arquivo:linha | Função | Antes | Agora |
|---|---|---|---|
| SGO_Compras_Config.js:455 | `Cmp_eu_` | flags de `Cmp_nivelDe_` | + alterações das caixas (`comprador`←COMPRAS_COMPRAR, `veFila`←COMPRAS_VER_FILA, `veValores`←COMPRAS_VER_VALORES, `regras`←COMPRAS_REGRAS_EDITAR) |
| SGO_Compras_Config.js:502-506 | `Cmp_exigir_` | GESTAO = `eu.gestao`; INTERNO = `nivel !== 'NENHUM'` | GESTAO = `Cmp_cx_(COMPRAS_GESTAO)`; INTERNO = `Cmp_cx_(COMPRAS_PEDIR)`; recusa com NÃO gravado → mensagem da caixa; sem alteração → mensagem de antes |
| SGO_Compras_Cotacoes.js:176-183 | `CmpC_podeAprovar_` | está em `rota.ids` | depois das proteções fixas (quem pediu; quem cotou acima da faixa do comprador), a faixa do pedido escolhe a caixa (`CMP_CAIXA_FAIXA`: COMPRADOR→ATE_LIMITE, GESTOR_AREA→DA_AREA, DIRETORIA→SEM_LIMITE). NÃO recusa com a mensagem da caixa + "Quem aprova: …"; SIM aprova (DA_AREA só na área da pessoa; Diretoria todas); sem alteração, a rota de antes |
| SGO_Compras_Painel.js:252 | `relatorioMes` | `eu.gestao \|\| eu.gestor \|\| eu.diretoria` | `Cmp_cx_(eu, 'COMPRAS_GESTAO', mesma expressão)` |
| SGO_Compras_Financeiro.js:173 | `CmpFin_ciente_` | `eu.gestor \|\| eu.diretoria \|\| eu.admin` | `Cmp_cx_(eu, 'COMPRAS_CIENCIA_GESTAO', mesma expressão)`; mensagem de antes ou da caixa |
| SGO_Compras_Relatorios.js:264-271 (LF) | `CmpRel_nivelPorId_` | `Cmp_nivelDe_` | + `Cmp_aplicarCaixas_`: o custo de compras mostrado no chamado (Assistência) e na proposta (Comercial) segue «Ver valores de compras e fornecedores» |

Seguem a caixa **sem edição** (usam `eu.comprador`, `eu.veFila`, `eu.veValores`, `eu.regras` ou `Cmp_exigir_`): as ~45 travas do inventário — lançar/retirar/escolher orçamento, emitir pedido, marcar enviado, previsão, receber, divergência, entregar, pagamento, fornecedores (listar, detalhe, salvar, arquivar, CNPJ, importar), devolver especificação, iniciar cotação, fila, painel, relatórios, regras (ver e salvar), equipe, pedir/informar/buscar clientes e chamados, `CmpP_paraTela_` (valores), `CmpC_acoes_`, `CmpC_paraTela_` (aprovação), `Cmp_inicio_` e a ação `acesso` (sinais da tela).

**Ficam fora das caixas (de propósito):** quem pediu acompanha o próprio pedido (`CmpR_podeVer_`: solicitante/vendedor); "quem pediu não aprova" e "quem cotou não aprova acima da faixa do comprador" (proteções fixas); os valores das faixas (R$ 1.000,00 / R$ 10.000,00) e o nível de aprovação de cada pedido continuam em Regras de compras (`CMP_REGRAS_PADRAO` intacto); quem recebe a atividade de compra e a rota da Caixa de decisões (`Cmp_compradorPara_`, `CmpC_rota_`) continuam pelas listas.

### Tela

Sem mudança de HTML: JS_Compras.html já decide pelos sinais do servidor (`acesso`/`iniciar`: `comprador`, `veFila`, `veValores`, `podeRegras`, `vePainel`; ficha: `acoes.decidir`, `aprovacao.podeEu`), que agora vêm com as caixas. A recusa continua sempre no servidor. A tela Acessos mostra as 10 caixas como ligadas.

---

## 4. Ajuda

- `SGO_Ajuda_Administracao.js` › **Acessos** (LF): "Implantação por etapas" (lote 5 ligado), "O que muda para a equipe" e o parágrafo "Lote 5" em "Implantação por lotes" (listas continuam valendo; NÃO tira mesmo da lista; SIM dá; faixas em R$ continuam nas Regras; escopo da área; proteções fixas; quem pediu continua vendo o seu).
- `SGO_Ajuda_Compras.js` (CRLF): problemas "Você não tem a permissão «Pedir compra…»" (Pedir peça ou material) e "«Cotar e comprar»/…" e "«Aprovar compra até o limite…»/…" (Fila de compras).

---

## 5. Testes e placares

**`tests/poderes-lote5.test.cjs`** (novo, 5 testes) — `FASE=candidato`: **5/5**.

1. **Equivalência:** 23 contas reais × 68 ações (nível e sinais de `Cmp_eu_`; `Cmp_exigir_` nos 7 níveis; `CmpC_podeAprovar_` nas 3 faixas × 7 áreas de quem pediu + "quem pediu"; `CmpRel_nivelPorId_`; ciência; ações da ficha; 35 ações de `Compras_api`), contra `lote5-antes-legado`: **1.564 comparações, 1.231 recusas no legado, 0 divergências** de resultado e de mensagem (`lote5-equivalencia.txt`).
2. **Exceção NÃO:** comprador da lista (não Diretoria/Administrador) com NÃO em COMPRAR/ATE_LIMITE/VER_VALORES perde cotar, emitir, receber, fornecedores, valores (inclusive no custo do chamado/proposta) e a aprovação da faixa do comprador, com «nome da caixa» e "Administração > Acessos"; continua na lista. Diretoria com NÃO em SEM_LIMITE, GESTAO, CIENCIA, REGRAS e VER_FILA é recusada nas 5. NÃO em PEDIR recusa abrir pedido, mas quem pediu continua vendo o próprio. Dono com as 10.
3. **Exceção SIM:** técnico fora da lista passa a cotar, ver a fila e valores e aprovar a faixa do comprador (botão "decidir" na ficha); SIM em DA_AREA vale só na área da pessoa; SIM em GESTAO/CIENCIA/REGRAS libera relatório mensal, ciência e regras.
4. **Alçada em R$:** SIM na faixa do comprador não aprova a faixa do gestor nem a da Diretoria; quem pediu nunca aprova; faixas (800 → comprador, 5.000 → gestor, 50.000 → Diretoria) e `CMP_REGRAS_PADRAO` iguais aos de antes.
5. **Tela:** 10 caixas ligadas; a página completa inclui JS_Compras; em 6 casos (com e sem exceção) o sinal `veFila` da tela = a recusa do servidor na fila; ajuda atualizada.

**`tests/poderes-lote0.test.cjs`**: 13/13 — ajustada só a lista esperada de ligados (lotes 1, 4 e 5) e a expectativa `ligado` de COMPRAS_GESTAO. **`poderes-lote1`**: 5/5; **`poderes-lote4`**: 5/5, sem mudança.

**Suítes do lote** (candidato, antes → depois): compras 16/16 → 16/16; compras-equipamento-cadastro 4/4 → 4/4; compras-informar-conciliacao 10/10 → 10/10; assistencia-compras-retorno 6/6 → 6/6; comercial-custos-cotacao 12/12 → 12/12; etapa5-compras-email-cadastros 10/10 → 10/10; compras-acesso-financeiro-delegado 0 ok + 7 falhas → igual (falha antiga, já em `lote4-depois.txt`). poderes-lote0 no "antes" dá 10 + 3 falhas só porque o teste já espera o lote 5 ligado.

**Suíte inteira** (`rodar-suite.cjs`; o "antes" rodou com `fontes-antes-lote5.cjs`, que aponta as fontes para `lote5-antes-legado`, sem o arquivo novo):

| Fase (candidato) | Arquivos | Arquivos com falha | Testes que passaram | Testes que falharam |
|---|--:|--:|--:|--:|
| Antes do lote 5 (`lote5-antes.txt`) | 197 | 31 | 1.772 | 95 |
| Depois do lote 5 (`lote5-depois.txt`) | 198 | 30 | 1.780 | 92 |

**Nenhuma falha nova** (comparação teste a teste: 0 falhas novas). As 3 "sumidas" são do poderes-lote0 no "antes", que já espera o lote 5 ligado (artefato do teste atualizado, não do código). Fora isso, a diferença é só o arquivo novo `poderes-lote5.test.cjs` (5/5). As 92 falhas são as mesmas do `lote4-depois.txt` (197 arquivos, 30 com falha, 1.775 ok, 92 falhas), em módulos fora deste lote.

`node --check` sem erro nos 8 `.js` alterados; finais de linha preservados (CRLF em SGO_Compras_Config/Cotacoes/Painel/Financeiro e SGO_Ajuda_Compras; LF em SGO_Compras_Relatorios, SGO_Poderes e SGO_Ajuda_Administracao); 6 nomes globais novos (`CMP_CAIXAS`, `Cmp_aplicarCaixas_`, `Cmp_cx_`, `Cmp_msgCaixa_`, `CMP_NIVEL_CAIXA`, `CMP_CAIXA_FAIXA`), nenhum repetido no legado.

---

## 6. Limites e pendências

- **Não publicado, não verificado em produção.** Testes em vm com o código real; **sem ensaio no Chromium** (HTML não mudou; o teste confere os sinais do servidor e a inclusão na página completa).
- **Ver a fila/painel com NÃO em `COMPRAS_VER_FILA`:** o painel e os relatórios de Compras (`CmpFin_painel_`, `CmpRel_painel_`, `CmpRel_gerar_`) aceitam também `eu.financeiro` (Financeiro/Diretoria/Administrador), que é a caixa `FIN_CONFERIR_COMPRAS` do lote do Financeiro. Quem é do Financeiro continua vendo o painel até esse lote.
- **Relatório mensal com NÃO em `COMPRAS_GESTAO`** é recusado; sem alteração vale a regra de antes (gestão de Compras, qualquer Gestor ou Diretoria), que é mais larga que o padrão do catálogo (`gestao`). Espelho, não mudança de regra.
- **Aprovar pela ficha:** quem recebe SIM numa caixa de aprovação precisa também ver a fila (`COMPRAS_VER_FILA`) para abrir o pedido e ver os valores (`COMPRAS_VER_VALORES`) para o botão aparecer; sem isso o servidor aceitaria a decisão, mas a tela não oferece. A tela Acessos não avisa essa dependência.
- **Caixa de decisões e avisos:** a lista de quem recebe a pendência de aprovação continua a rota das Regras (listas); quem ganha a aprovação só por SIM não recebe a pendência automaticamente; quem perde por NÃO ainda pode receber o aviso (e a recusa diz quem aprova).
- **Pedido aberto pela Assistência sem sessão** (aprovação do cliente pelo link, `AstC_cmpComo_`): sai em nome de quem enviou o orçamento pelo nível de antes, sem a caixa `COMPRAS_PEDIR` (fluxo automático; arquivo da Assistência não foi tocado).
- **Limite por pessoa em R$** não existe: a caixa diz SE aprova; o valor continua na faixa das Regras de compras.
- Segundo passo do catálogo (listas viram exceções SIM e saem da tela de regras) **não** foi feito: as listas continuam valendo como hoje.
