# Acessos por caixas — Lote 6: Frota, localização e bloqueio da partida (implementação)

Implementação de 11/11/2026, só no candidato local `output/poderes-20261110/base/legado`. **Nada foi publicado**, não houve acesso ao servidor (sem ssh) e não houve `git commit`. Cópia do legado antes da mudança: `output/poderes-20261110/lote6-antes-legado` (referência da equivalência e da suíte "antes").

Estado real: **preparado e testado localmente** (vm com o código real da Frota e do motor das caixas, 23 contas reais). **Não publicado, não verificado em produção, sem ensaio no navegador** (ver Limites).

---

## 1. Poderes ligados

`SGO_PODERES_LIGADOS` (SGO_Poderes.js:31-42) ganhou **os 6 poderes do lote 6** (total: 34 ligados):

`FROTA_LOCALIZAR`, `FROTA_RASTREADOR_CONFIGURAR`, `FROTA_BLOQUEAR_PARTIDA`, `FROTA_LIBERAR_PARTIDA`, `FROTA_BLOQUEIO_ROUBO`, `FROTA_ODOMETRO_CORRIGIR`.

Nenhuma trava do lote está no servidor Node (`src/`): `src/servicos/rotas.ts` só guarda e lê posições do rastreador para o legado (sem decisão de acesso). Nada ficou desligado por esse motivo.

---

## 2. Como foi feito (espelho estrito)

A regra padrão de cada caixa continua a de hoje: gestão da Frota (`Frota_ehGestao_`: Administrador, Diretoria, Gestor, RH e Financeiro) e, onde já havia, a exigência de perfil (**"Liberar agora"**: Administrador, Diretoria, Gestor e RH; **bloqueio de roubo**: só Diretoria; **hodômetro**: Gestor e Administrador, `FBLQ_ODO_PERFIS` intacto). **Só a alteração gravada para a pessoa em Administração > Acessos muda o resultado**: SIM dá, NÃO tira. Sem alteração, resultado e mensagem são os de antes.

O dono do sistema mantém exatamente o que tinha: a origem `dono` do motor é ignorada aqui (o admin continua **sem** o bloqueio de roubo, como hoje; decisão D-08/item 5 do catálogo continua em aberto).

**A caixa decide só QUEM pode; nenhuma etapa é pulada.** Continuam iguais para todos, com ou sem SIM: equipe interna (`Frota_exigirEquipe_`, conta de cliente nunca), motivo obrigatório (`Frota_exigirJustificativa_`), dupla confirmação do roubo (marcar e digitar `BLOQUEAR <PLACA>`), modo de cada carro (Ativo/Simulação/Desligado, inclusive a recusa com bloqueio desligado), condições seguras (conectado, parado, desligado, na base), prazo de 24 h da emergência (`FBLQ_EMERGENCIA_HORAS`), registro de eventos, "ninguém autoriza a si mesmo" na passagem do carro.

Motor do lote (SGO_Frota_Main.js, CRLF preservado):

| Linha | Nome | O quê |
|--:|---|---|
| 634 | `FROTA_CAIXAS_L6` | os 6 códigos do lote |
| 636 | `FrotaCx_excecao_(sessaoOuId, codigo)` | 'SIM'/'NAO' só com alteração gravada (origem `excecao` de `Poderes_avaliar_`) numa caixa ligada; sem motor, sem pessoa ou sem nenhuma alteração da pessoa, '' (nada é consultado) |
| 649 | `Frota_cx_(sessaoOuId, codigo, padrao)` | SIM/NÃO gravado ou, sem alteração, a expressão de antes |
| 655 | `Frota_cxGestao_(sessionId, codigo)` | `Frota_cx_` com padrão `Frota_ehGestao_` |
| 659 | `Frota_cxMsg_(sessaoOuId, codigo, msgPadrao, acao)` | recusa por NÃO: «nome da caixa» + "Administração > Acessos"; sem alteração, a mensagem de antes |

---

## 3. Travas trocadas (arquivo:linha no candidato)

| Arquivo:linha | Função | Caixa |
|---|---|---|
| SGO_Frota_Bloqueio.js:1198 | `FrotaBlq_exigirGestao_(sessionId, codigo, perfilOk, msgPerfil, acao)` | padrão BLOQUEAR_PARTIDA; NÃO recusa com a caixa; SIM dispensa gestão e perfil; sem alteração: gestão → bootstrap → perfil, na mesma ordem e com as mesmas mensagens |
| Bloqueio.js — DecidirForaBase, Modo, Triagem, EncerrarEmergencia, AreaBase, Integridade, Painel, Relatorio | via `FrotaBlq_exigirGestao_` | FROTA_BLOQUEAR_PARTIDA |
| Bloqueio.js:1266 `Frota_apiBloqueioLiberarAgora` | perfil de antes passado como `perfilOk` | FROTA_LIBERAR_PARTIDA |
| Bloqueio.js:1294 `Frota_apiBloqueioRoubo` | perfil DIRETORIA passado como `perfilOk` | FROTA_BLOQUEIO_ROUBO |
| Bloqueio.js:1361 `Frota_apiBloqueioHodometro` | `FBLQ_ODO_PERFIS` passado como `perfilOk` | FROTA_ODOMETRO_CORRIGIR |
| Bloqueio.js:1104 / 1109 `Frota_apiPassagemDecidir` | recusar (quem não é envolvido) / autorizar | FROTA_BLOQUEAR_PARTIDA (envolvido continua recusando sem caixa; envolvido nunca autoriza) |
| Bloqueio.js:1142 `Frota_apiBloqueioEncerrarEsquecida` | encerrar retirada de outra pessoa | FROTA_BLOQUEAR_PARTIDA |
| Bloqueio.js:1494-1495 `Frota_apiBloqueioPainel` | sinais `podeLiberar`, `podeRoubo`, `podeOdometro` | as 3 caixas (sem alteração: a expressão de perfil de antes) |
| SGO_Frota_Rastreador.js:1091 `Rastreador_exigirGestao_(sessionId, codigo, acao)` | ListarRastreador, AtualizarAgora → LOCALIZAR; Vincular, ConferirComandos, ConferirAlerta → RASTREADOR_CONFIGURAR; RastreadorBloquear → BLOQUEAR_PARTIDA | |
| SGO_Frota_Rastreamento.js:358 `FrotaR_exigirGestao_(sessionId, codigo, acao)` | Consultas, Mapa, Rota, Retiradas, Combustivel, CapacidadeTanque, PedirComprovante, CancelarPedido → LOCALIZAR; Config → RASTREADOR_CONFIGURAR | |
| Rastreamento.js:910 `Frota_apiRastrEnviarComprovante` | enviar comprovante de **outra** pessoa | FROTA_LOCALIZAR (o próprio condutor continua sem caixa) |
| Rastreamento.js:1059 `FrotaR_ponte_` (frota.painel do COMMAND) | perfil de antes como padrão | FROTA_LOCALIZAR (mensagem igual; COMMAND descontinuado) |
| SGO_Frota_RastreamentoGestao.js:64/376/410/699 | Gantt, Copiloto, CopilotoDecidir, Relatório | FROTA_LOCALIZAR |

`Frota_exigirGestor_` (SGO_Frota_Main.js:198) e o `Frota_ehGestao_` genérico **não** mudaram: atendem também o lote 9 (cadastros, condutores, gastos etc.).

**Fora das caixas (de propósito):** retirar, devolver, passar o carro, recusar passagem em que está envolvido, responder o próprio pedido de comprovante (quem usa o carro vê o que já via do próprio uso).

### Tela

Sem mudança de HTML. O painel do bloqueio (SGO_Frota_BloqueioTela.js / JS) já decide os botões por `podeLiberar`, `podeRoubo` e `podeOdometro`, que agora vêm com as caixas. A recusa continua sempre no servidor. A tela Acessos mostra as 6 caixas como ligadas.

---

## 4. Ajuda

- `SGO_Ajuda_Administracao.js` › **Acessos** (LF): "Implantação por etapas" (lote 6), "O que muda para a equipe" e parágrafo "Lote 6" (regra de antes, a caixa só decide quem pode, proteções que continuam, uso próprio fora das caixas, dependência do painel).
- `SGO_Ajuda_Frota.js` (CRLF) › Bloqueio da partida, "Antes de começar": as permissões também são caixas em Administração > Acessos; sem alteração vale a regra; motivo, confirmação, modo e condições continuam.

---

## 5. Testes e placares

**`tests/poderes-lote6.test.cjs`** (novo, 4 testes) — `FASE=candidato`: **4/4**.

1. **Equivalência:** 23 contas reais × 34 ações (33 APIs do lote com veículo e passagem de teste + ponte), contra `lote6-antes-legado`: **782 comparações, 384 recusas pela trava no legado, 0 divergências** de resultado e de mensagem (`lote6-equivalencia.txt`).
2. **Exceção NÃO:** gestora (elisa) com NÃO nas 6 caixas é recusada nas 33 ações com «nome da caixa» e "Administração > Acessos"; Diretoria (charles) com NÃO em roubo perde o roubo e o botão; dono com as 6 no motor, mas o espelho mantém o admin sem roubo ("só da Diretoria").
3. **Exceção SIM:** técnico (joaopedro) com SIM nas 6 passa as travas; continuam: motivo obrigatório (roubo e liberar), dupla confirmação do roubo ("falta a dupla confirmação"), KM inválido no hodômetro; botões do painel ligados; conta de fora nunca ganha.
4. **Tela:** 6 caixas ligadas; em 6 casos (com e sem exceção) `podeLiberar/podeRoubo/podeOdometro` = recusa do servidor; textos de proteção (dupla confirmação, 24 h, motivo do roubo, `FBLQ_ODO_PERFIS`, DESLIGADO) com a mesma contagem de antes; ajuda atualizada.

**`poderes-lote0`**: 13/13 (ajustada só a lista esperada de ligados, + lote 6). **`poderes-lote1`** 5/5, **`poderes-lote4`** 5/5, **`poderes-lote5`** 5/5.

**Frota (candidato, antes → depois):** abastecimento 18/18, bloqueio 22/22, gestao 7/7, identificacao 11/11, leva2 13/13, rastreador-km 8/8, rastreamento-redesenho 10/10, rastreamento 13/13, reservas 14/14 — iguais.

**Suíte inteira** (`rodar-suite.cjs`; o "antes" rodou com `rodar-suite-antes-lote6.cjs` + `fontes-antes-lote6.cjs`, fontes em `lote6-antes-legado`, sem o arquivo novo):

| Fase (candidato) | Arquivos | Arquivos com falha | Testes que passaram | Testes que falharam |
|---|--:|--:|--:|--:|
| Antes do lote 6 (`lote6-antes.txt`) | 198 | 30 | 1.780 | 92 |
| Depois do lote 6 (`lote6-depois.txt`) | 199 | 30 | 1.784 | 92 |

**Nenhuma falha nova** (comparação teste a teste: 0 novas, 0 sumidas). A diferença é só o arquivo novo `poderes-lote6.test.cjs` (4/4). As 92 falhas são as mesmas do `lote5-depois.txt` (198 arquivos, 30 com falha, 1.780 ok, 92 falhas), em módulos fora deste lote.

`node --check` sem erro nos 8 `.js` alterados; finais de linha preservados (CRLF em SGO_Frota_Main/Bloqueio/Rastreador/Rastreamento/RastreamentoGestao e SGO_Ajuda_Frota; LF em SGO_Poderes e SGO_Ajuda_Administracao); 5 nomes globais novos (`FROTA_CAIXAS_L6`, `FrotaCx_excecao_`, `Frota_cx_`, `Frota_cxGestao_`, `Frota_cxMsg_`), nenhum repetido no legado.

---

## 6. Limites e pendências

- **Não publicado, não verificado em produção.** Testes em vm com o código real; **sem ensaio no Chromium** (HTML não mudou).
- **Abas da Frota na tela** dependem de `frotaSouGestao_` (JS_Core.html:2505, por perfil; é do lote 9). Quem ganha SIM sem ser da gestão não vê a aba Rastreamento/Visão geral até o lote 9; quem tem NÃO ainda vê a aba, mas cada ação é recusada no servidor com a mensagem da caixa (não fica no limbo).
- **Botões do cartão do carro** (liberar, roubo, hodômetro) ficam no painel aberto por `FROTA_BLOQUEAR_PARTIDA`: SIM só em liberar/roubo/hodômetro, sem a caixa do bloqueio, dá a permissão no servidor mas a tela não abre o painel. A tela Acessos não avisa essa dependência.
- **Admin e o bloqueio de roubo:** espelho mantém o admin sem o roubo (só Diretoria). A proteção "dono sempre tudo" daria o roubo ao admin; continua decisão do dono (D-08).
- **Avisos/e-mails da gestão da Frota** (relatório diário do piloto, pendências de bloqueio, retirada esquecida) continuam indo para a gestão pelo perfil; SIM não inclui a pessoa nessas listas e NÃO não a tira.
- **Ponte do COMMAND** (`FrotaR_ponte_`): segue a caixa, mas a mensagem da recusa é a de antes mesmo com NÃO (COMMAND descontinuado).
