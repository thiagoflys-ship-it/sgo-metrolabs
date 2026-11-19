# Etapa E1 — compra de contrato (E1a) e aditivo de recarga em viagem (E1b) (19/11/2026)

Base: `output/financeiro-20261116/cand36` = produção (conferido hoje: os 576 arquivos de `/app/legado` da imagem
`metrolabs/sgo:avisos-matheus-20261119` têm o mesmo SHA-256 da cand36). Trabalho em `cand37` (cand36 + esta etapa, 577 arquivos).
App de campo: produção desde 19/11 ~15:40 (imagem `metrolabs/sgo:campo-sem-serie-tag-20261119`, correção do coordenador "equipamento
sem série/TAG") = `/app/dist` versão `a1fad0ddf68e` (`e1/campo/prod` = `campo-20261118/novo` + `app.js` e `regras.js` de `campo-semid-20261119`)
e `/app/src` ainda com o app de 18/11 (`e1/campo/prod-src`); conferido por SHA-256 no contêiner. O legado dessa imagem continua = cand36.
Versão nova (aditivo aplicado sobre a correção) em `e1/campo/novo`: `94b9805bcd21`. **Nada publicado, nada gravado em produção, nenhum envio real, API do Caju não chamada,
cofre não tocado. Sem commit.** Decisões do dono = recomendações da seção 6 do estudo. IMED HCN: nada cadastrado.

## 1. O que mudou, por arquivo (legado, `cand37`)

| Arquivo | Fim de linha | Mudança |
|---|---|---|
| `SGO_Caju_Aditivo.js` (novo) | LF | Todo o aditivo: tabela `CJU_ADITIVOS`, pedir, cancelar, complementar/responder, parecer do gestor, decisão do sócio, carga de exceção, conferência da exceção, repasse ao cliente, avisos GS12/VG01, rodada de 30/60 min, pendências da central e da Caixa, tela, prestação, A4, relatórios. |
| `SGO_Viagem.js` | LF | Colunas `VIA_CARGAS.ADITIVO_ID/MESMA_PESSOA` e `VIA_PRESTACOES.ADITIVO_ID` (cache `VIA_ABAS_OK_V5`); `Via_tetoCarga_` (= recarga aprovada + aditivos aprovados) usado por `Via_aCarregar_` e nas mensagens da carga; gancho de separação de funções (quem aprovou o aditivo não carrega pelo caminho comum); `Adt_aposCarga_` depois da carga manual; aditivos na tela da viagem; contagem `aditivos` no `iniciar`; 9 ações `aditivo*` no `Viagem_api`; política com `aditivoLembreteMin` (30), `aditivoEscalarMin` (60) e `aditivoFotoAcimaDe` (vazio), com validação e versões; registro de avisos, tipos e fonte de pendências. |
| `SGO_Viagem_Prestacao.js` | LF | Gasto com `aditivoId` (só aditivo aprovado; não fica "fora do orçado"); item mostra o aditivo; prestação não é enviada com aditivo aguardando decisão (mensagem com o caminho); quadro dos aditivos (previsto × realizado). |
| `SGO_Viagem_Fechamento.js` | LF | A4: seção "2b. Previsto × realizado, com os aditivos" e o aditivo no gasto. |
| `SGO_Viagem_Painel.js` | LF | Relatório A4 "Aditivos de recarga em viagem" (mês, categoria, técnico, cliente, tempo até decidir, negados, escalados, exceções, repasse pendente). |
| `SGO_Caju.js` / `SGO_Caju_Pedidos.js` | LF | `CJU_PEDIDOS.ADITIVO_ID` (cache V3); `Cju_recargaAprovada_` usa o teto com aditivos (carga pela API e conciliação); pedido no Caju "ADT VIA-AAAA-NNNN/A1" quando falta só o aditivo; `Adt_aposCarga_` no crédito. |
| `SGO_Gestao_Escada.js` | LF | `Adt_rodada_` na rodada de 15 min, a qualquer hora. |
| `SGO_Avisos_Matriz.js` | CRLF | Origem `ADITIVO_PARADO` fora da matriz (resposta ao técnico parado sai na hora). |
| `SGO_Compras_Config.js` | CRLF | Vínculo `CONTRATO`, tipos e naturezas, 6 colunas (`CONTRATO_ID` vazio até a E3, `CONTRATO_REF`, `CONTRATO_TIPO`, `COMPETENCIA`, `CONTRATO_NATUREZA`, `CONTRATO_JUSTIFICATIVA`), cache `CMP_ABAS_OK_V6`. |
| `SGO_Compras_Requisicoes.js` | CRLF | `CmpR_vinculoContrato_` (cliente e unidade obrigatórios, tipo, referência ≥ 5, competência, natureza, justificativa ≥ 20 em reposição/complemento), texto do vínculo, conferências (competência repetida, reposição, competência a > 2 meses com motivo), ação `corrigirVinculo` na ficha. |
| `SGO_Compras_Informar.js` | LF | Vínculo no Informar compra (competência vazia = mês da compra), pergunta "COMPETENCIA" junto com atraso/duplicidade, nomes dos apontamentos, `CmpI_corrigirVinculo_` (só os campos do vínculo, histórico campo a campo, motivo ≥ 15), opções do contrato. |
| `SGO_Compras_Painel.js` | CRLF | Ações `corrigirVinculo` e opções do contrato. |
| `SGO_Compras_Relatorios.js` | LF | Relatórios "Compras de contrato de cliente" e "Peças compradas em viagem (só leitura)". |
| `JS_Compras.html` | CRLF | Campos do contrato no pedido e no Informar compra, pergunta da competência, selos novos, botão e formulário "Corrigir o vínculo". |
| `JS_DepositoViagem.html` | LF | Aba "Aditivos de recarga" (pedir; decidir; parecer; carga e exceção; conferir; repasse; meus), bloco na viagem, aditivo no gasto e quadro previsto × realizado, campos da política, relatório novo, contagens. |
| `SGO_Ajuda_DepositoViagem.js`, `SGO_Ajuda_Compras.js` | LF / CRLF | Ajuda das telas. |
| `SGO_AssistenteManuais.js` | LF | Base do "Tire sua dúvida" regerada (`_tools/gerar_base_assistente.cjs`). |

Fora da cand: manuais `docs/MANUAL_DEPOSITO_VIAGEM.md` (seção 22), `docs/MANUAL_MODULO_COMPRAS.md` (compra de contrato), `docs/MANUAL_APP_CAMPO.md`
(aditivo no app), `docs/MANUAL_MATRIZ_DE_AVISOS.md` (3D, GS12/VG01); testes `tests/contratos-aditivo-e1-20261119.test.cjs` (16),
`tests/contratos-aditivo-e1-telas-20261119.test.cjs` (2, navegador), `tests/contratos-aditivo-e1-campo-20261119.test.mjs` (2, app de campo);
`tests/_viagem_ambiente.cjs` carrega `SGO_Caju_Aditivo.js`; `tests/pedidos-20261118-p1-compras.test.cjs` P1-2c aceita a 3ª pergunta.
Fins de linha conferidos: todo arquivo CRLF continua 100% CRLF.

## 2. Fluxos

**E1a — compra de contrato.** Vínculo "Contrato de cliente (fornecimento recorrente, comodato, locação)" no pedido e no Informar compra;
qualquer pessoa que informa marca. Conferências viram apontamento ao Financeiro, sem bloquear: 2º "fornecimento do mês" do mesmo cliente,
unidade, referência (comparada sem acento/caixa) e competência; reposição (custo de erro); competência a mais de 2 meses pede o motivo.
"Corrigir o vínculo" na ficha (quem informou/comprou, Compras, Financeiro, gestão): grava só o vínculo, histórico com antes, depois e
campo a campo. É o caminho para o Matheus reclassificar a REQ-2026-0017 depois que a unidade IMED HCN existir no cadastro.

**E1b — aditivo de recarga.** Quem viaja (ou quem pediu a viagem), com viagem aprovada/carregada, da véspera da saída ao dia seguinte à
volta e antes de enviar a prestação, pede pelo SGO+ (aba "Aditivos de recarga") ou pelo app de campo. Número `VIA-…/A1`. Basta **um**
sócio (dono ou Diretoria; quem viaja não decide): aprovar, aprovar menor (fundamentação), pedir informação, negar (motivo). Gestor da área
só acompanha e dá parecer (sem valor se não vê a viagem). Avisos: parado → sócios na hora a qualquer horário (GS12, `sgo_gestao_acao`,
alerta na tela); "pode ser hoje" → na abertura do expediente; lembrete único aos 30 min; aos 60 min tarefa (aviso + pendência) à Wanessa e
ao gestor para ligar; **nada aprovado por tempo**. Aprovado soma ao teto (`Via_tetoCarga_`); a aprovação/marca da viagem não muda; a
carga segue pelo Financeiro (manual ou Caju, pedido "ADT …"); à noite o outro sócio registra no aditivo, ou o aprovador como exceção
(`MESMA_PESSOA`, motivo) e a Wanessa confere no dia útil seguinte; no expediente o aprovador não carrega. Prestação vencida do
portador: apontamento ao sócio e liberação registrada (2 dias) ao aprovar. Técnico recebe decisão/crédito (VG01; parado = na hora).
Repassar "Sim" → tarefa sem valor ao Comercial/Financeiro. Peça do aditivo não vira compra (relatório de leitura em Compras).

**Escolhas e limites (explicados):** recarga da rotina (RCJ) não ganhou aditivo próprio: o "Pedir recarga" avulso já faz isso; a tela
aponta o caminho e a tabela guarda `ORIGEM_TIPO` para o futuro. O crédito vai sempre ao cartão do responsável pelo dinheiro da viagem
(trocar de cartão quebraria a prestação única). O lembrete depende da rodada de 15 min (sai entre 30 e 45 min). O pedido pelo app exige
internet (não entra na fila do aparelho, porque depende da decisão na hora).

## 3. App de campo (por que mexer)

O técnico em viagem usa o app de campo, então o pedido ficou lá também: botão "Em viagem: pedir aditivo de recarga" no Meu dia, tela
`#/aditivo` (pedido com foto reduzida no aparelho, "Meus aditivos", Responder e Cancelar), ajuda nova. Só `app.js` e `estilo.css`
mudaram em relação à versão em produção (diff em `campo-prod-novo.patch`; a correção "sem série/TAG" foi mantida: `regras.js` igual ao
publicado). Versão `a1fad0ddf68e` → `94b9805bcd21`.

## 4. Telas (capturas em `capturas/`)

Técnico 390 px: `390-tecnico-pedir-aditivo`, `390-tecnico-aditivo-enviado`; app de campo iPhone/Android: `campo-*-aditivo-1..4`.
Sócio: `1366-socio-aditivo-decidir`, `1366-socio-aditivo-aprovar-form`, `1366-socio-aditivo-aprovado`, `390-socio-aditivo-decidir`,
`390-socio-aditivo-aprovado`; viagem com aditivo: `1366-viagem-com-aditivo`. Compras: `1366-` e `390-informar-compra-contrato`,
`*-corrigir-vinculo`, `1366-vinculo-corrigido`. Sem erro de JavaScript, sem diálogo do navegador, sem rolagem lateral.

## 5. Placar

- Suíte completa na cand37 (`suite.txt`, 302 arquivos): **2733 passam, 0 falham** (referência 2714 + 18 novos + 1 que falhou na 1ª rodada:
  P1-2c conferia o texto exato do formulário; ajustado e reexecutado 10/0). `email-outlook-20261117` passou.
- App de campo (fora da suíte `.cjs`), refeito sobre a correção de 19/11: `contratos-aditivo-e1-campo-20261119.test.mjs` 2/0; com
  `CAMPO=e1/campo/novo`: `campo-app-20261118` 6/0, `relatorio-campo-app-20261113` 6/0, `pente-assistencia-campo-20261112` 8/0.

## 6. Publicação (não feita)

Pacote em `publicar/` (montado por `python montar-publicacao.py` na raiz): `camada.tgz` (manifesto: 18 alterados + 1 novo), `campo.tgz`
(o app novo em `/app/dist` e `/app/src`), `base-hashes.txt`, `manifesto*.txt`, `total-base.txt` (576), `total-esperado.txt` (577),
`campo-base.txt` (`/app/dist`, a1fad0ddf68e), `campo-base-src.txt` (`/app/src`), `campo-esperado.txt`, `publicar.sh`.
1. Conferir a imagem: `grep image: /opt/metrolabs/sgo/docker-compose.yml` (esperada `metrolabs/sgo:campo-sem-serie-tag-20261119`; outra: `BASE=<imagem>`).
2. `scp -i ~/.ssh/metrolabs_servidor output/contratos-aditivo-20261119/e1/publicar/* root@179.197.73.61:/tmp/pub-e1/` e `ssh … "cd /tmp/pub-e1 && sh publicar.sh"`.
3. O script confere base do legado e do app, faz backup (compose + banco), constrói `FROM base`, confere hashes e sintaxe, troca, espera saudável
   (senão reverte), confere `GET /` 200 e `/campo/versao` = `94b9805bcd21`.
4. Nada a gravar: tabelas e colunas novas nascem no primeiro uso (caches V5/V6/V3 e `ADT_ABA_OK_V1`); política vale pelo padrão 30/60 min.
5. Celulares: avisar os técnicos para abrir o SGO+ Campo com internet e tocar em "Atualizar agora" quando aparecer a versão nova.
6. Depois: cadastrar a unidade IMED HCN (dono) e o Matheus reclassificar a REQ-2026-0017 por "Corrigir o vínculo".
Reverter: `cp /opt/metrolabs/backup/contratos-aditivo-e1-20261119/compose.antes.yml /opt/metrolabs/sgo/docker-compose.yml && docker compose -f /opt/metrolabs/sgo/docker-compose.yml up -d app`.

Patches: `legado-cand36-cand37.patch`, `docs-testes.patch`, `campo-prod-novo.patch`.
