# SGO+ Campo — foto, assinatura em tela cheia e correção depois de errar (18/11/2026)

Pronto para publicar (não publicado). **Parte do hotfix publicado pelo coordenador** (imagem `metrolabs/sgo:campo-foto-hotfix-20261118`,
app `924037baf046`, arquivos em `hotfix/`), conferido por sha256 no contêiner às 19:27: `/app/dist/publico/campo` = `hotfix/`;
`/app/src/publico/campo` ainda é o app anterior (`prod/`, `c3cf721587c3`); legado = cand29 (os 7 arquivos conferidos). Versão nova do app: **`7eeb3c773ab4`**.

**Hotfix incorporado em `novo/`:** (1) `bloqueadaFoto()`/`fotoTravada()` — foto liberada depois de concluir no aparelho, só trava com
a O.S. encerrada/cancelada no servidor (a mensagem agora aponta para "Pedir correção"); (2) `index.html` do hotfix (entradas sem
`hidden`, classe `.arq-oculto`); (3) altura do quadro `max(260px, 45dvh)` (o CSS do hotfix entra igual, no fim de `estilo.css`).

**Hotfix x causa real:** o hotfix cobre as causas 2 e 3 abaixo. A causa principal (1, o celular fechar o app com a câmera aberta)
**não** é coberta por ele: nesse caso a foto continua sumindo em silêncio no hotfix. A entrega trata isso (aviso ao voltar) e as
causas 4 e 5.

## 1. Causa da falha da foto

O que a produção mostra (só leitura no banco, 18/11): **o envio de foto funciona**. Hoje chegaram fotos pela câmera e pela galeria
nos dois aparelhos em uso (iPhone na OS-2026-0037; Android "K" na OS-2026-0041: 2 pela câmera às 18:05 e 5 de uma vez pela galeria
às 18:24). Na OS-2026-0042 (Android, aberta às 18:30, foto obrigatória) o técnico registrou relato e as duas assinaturas até 18:36
e **nenhuma foto chegou** depois disso, sem nenhum registro de recusa: a foto morreu dentro do aparelho, em silêncio.

Causas no código do app (todas levam ao mesmo sintoma, "toquei e não aconteceu nada"):

1. **O celular fecha o app enquanto a câmera ou a galeria está aberta** (falta de memória: normal no iPhone com o app na Tela de
   Início e em Android simples). A página volta do zero, o "para qual O.S. é esta foto" estava só na memória (`fotoAlvo`) e a foto
   escolhida se perde. O app antigo não percebia e não dizia nada. **Esta é a causa principal**: explica falhar na câmera e na
   galeria, num aparelho que minutos antes funcionou.
2. **O.S. concluída no aparelho ou encerrada no servidor**: os botões de foto somem ou ficam desabilitados e não havia como
   desfazer; a mensagem só dizia "fale com o supervisor". Para o técnico, "não dá para anexar foto".
3. **Entradas de arquivo com `hidden`** (`display:none`): no iPhone (Safari e app na Tela de Início) o clique repassado a uma entrada
   escondida assim pode não abrir a câmera nem a galeria.
4. **Foto que o navegador não abre** (HEIC do iPhone, foto enorme sem memória para decodificar) ou **aparelho sem espaço** para
   guardar: mensagem genérica ou erro técnico, sem dizer o que fazer.
5. Detalhe: O.S. aberta em campo que recebe o número oficial com a câmera aberta mandava a foto para o id provisório.

O que não é causa (conferido): CSP (`img-src 'self' data: blob:`) e `Permissions-Policy: camera=(self)` estão certos; o toque chama
a câmera direto no gesto (sem `await` antes); o servidor aceita as fotos (nenhuma recusa nos registros).

## 2. O que mudou

**App (`novo/`, servido em `/campo/`):**
- Foto: entradas fora da vista em vez de `hidden`; antes de abrir a câmera o app anota a O.S. (`SGO_CAMPO_FOTO_ABERTA`); se o celular
  fechar o app, ao voltar aparece "A foto não chegou ao app" com o porquê e o que fazer, na tela de onde saiu. Leitura da foto já
  reduzida (menos memória), mensagem própria para HEIC, arquivo que não é imagem, foto vazia e sem espaço (guarda em texto se o
  aparelho não guardar o arquivo; `banco.js` sobe esse formato). Foto vai para a O.S. certa mesmo se o número oficial chegar no meio.
- Assinatura: botão **"Assinar em tela cheia"** (cliente e técnico/colaborador): quadro na tela inteira, linha de base, nome de quem
  assina, Limpar / Cancelar / Confirmar; no Android entra em tela cheia e vira na horizontal quando deixa; no iPhone, dica de virar
  (não obriga); girar não perde o traço. Confirmar passa a assinatura cortada e centralizada para o quadro; a imagem continua de 800
  a 200.000 caracteres. Quadro normal com altura proporcional à tela (`clamp(240px, 42vh, 460px)`) e linha de base.
- Correção: **"Desfazer conclusão para corrigir"** (com motivo, antes do encerramento no servidor; evento `DESFAZ_CONCLUSAO`);
  **"Pedir correção"** na O.S. encerrada (evento `PEDIR_CORRECAO`); O.S. **"Reaberta para correção"** pela gestão volta a aceitar tudo
  (conclusão antiga arquivada em `conclusoesDesfeitas`); "Refazer" assinatura também quando ela veio do servidor. Mensagens de
  bloqueio dizem o caminho. Ajuda do app com 3 seções novas.
- Versão nova: assume sozinha nas telas sem formulário (Meu dia, O.S., Envios) e nunca com câmera, janela ou assinatura aberta.

**Legado (`output/financeiro-20261116/cand30` = cand29 + 7 arquivos):**
- `SGO_Assistencia_OS.js`: eventos `DESFAZ_CONCLUSAO` (Documentação pendente → Em execução; encerrada = recusa definitiva com
  "Pedir correção") e `PEDIR_CORRECAO` (vale encerrada; aviso aos gestores da área); `AstO_reabrirCorrecao_` (dono/Admin, Diretoria,
  gestão da Técnica ou gestor do setor; motivo ≥ 10 letras; aviso ao técnico); reencerramento de O.S. reaberta gera a revisão
  seguinte do relatório e não anda o chamado/atividade de novo. Nada é apagado (eventos `CONCLUSAO_DESFEITA`, `CORRECAO_PEDIDA`,
  `REABERTA_CORRECAO`, `REENCERRADA`).
- `SGO_Assistencia_Config.js`: 6 colunas novas em ATEC_OS (`REABERTA_*`, `CORRECAO_PEDIDA_*`), conferência das abas `V12`.
- `SGO_Assistencia_App.js`: Meu dia manda `registrado.reaberta` e não manda a conclusão anterior à reabertura.
- `SGO_Assistencia_Painel.js` + `JS_Assistencia.html`: ação `osReabrirCorrecao`; bloco "Correção" na ficha da O.S. (pedido do
  técnico, última reabertura, botão "Reabrir para correção (com motivo)"). Com a O.S. reaberta, a gestão anexa foto e corrige campos
  pela própria ficha (formulário que já existia).
- `SGO_Ajuda_Assistencia.js`: ajuda da O.S. atualizada.
- `SGO_AssistenteManuais.js`: base do "Tire sua dúvida" regerada (`node _tools/gerar_base_assistente.cjs`) com as seções novas dos dois manuais.

**Servidor TypeScript:** sem mudança (as rotas `/campo` calculam a versão pelo conteúdo dos arquivos).

**Manuais:** `docs/MANUAL_APP_CAMPO.md` (seção 3c) e `docs/MANUAL_MODULO_ASSISTENCIA.md` ("Reabrir para correção").

## 3. Testes

| Teste | Resultado |
|---|---|
| `tests/campo-app-20261118.test.mjs` (novo, Chromium em emulação de iPhone e Android, 390 px, app real servido com a CSP de produção) | **6/0** (no app antigo `prod/`: 0/6) — câmera, galeria (3 de uma vez), HEIC, app fechado pela câmera; tela cheia em pé e deitado, cliente e técnico, imagem no limite; desfazer, pedir correção, reaberta |
| `tests/assistencia-correcao-campo-20261118.test.cjs` (novo, legado real) | **3/0** |
| `tests/relatorio-campo-app-20261113.test.mjs` / `pente-assistencia-campo-20261112.test.mjs` com `CAMPO=novo` | 6/0 e 8/0 (iguais à produção) |
| `sgo_servidor/testes/campo*.test.ts` (vitest) com os arquivos do app trocados | 50/1 na produção e 50/1 no novo: a falha é antiga do repositório (diverge da produção), não deste pacote |
| Suíte completa do legado no cand30 (`suite.txt`, 294 arquivos) | **2668 pass / 0 fail** (referência 2665/0; +3 do teste novo) |

Limite conhecido: o teste roda no Chromium; o Safari do iPhone real não está no ambiente. A causa 1 (app fechado pela câmera) não
se reproduz em emulador; o teste simula a volta e confere a mensagem.

Capturas (celular simulado, 390 px): `capturas/` — `*-foto-1..4`, `*-assinatura-1..3`, `*-correcao-1..4` (iphone e android).

## 4. Como publicar

Pacote em `publicar/`: `camada.tgz` (7 arquivos do legado), `campo.tgz` (app em `/app/dist/publico/campo` e `/app/src/publico/campo`),
`base-hashes.txt`, `manifesto*.txt`, `campo-base.txt` (hotfix, /app/dist), `campo-base-src.txt` (prod, /app/src), `campo-esperado.txt`, `total-esperado.txt` (568), `publicar.sh`.

1. Conferir a imagem em produção: `grep image: /opt/metrolabs/sgo/docker-compose.yml` (esperada
   `metrolabs/sgo:campo-foto-hotfix-20261118`; outra: rodar com `BASE=<imagem atual>`). O script recusa se os 7 arquivos do legado,
   o app em `/app/dist` (= `hotfix/`, `campo-base.txt`) ou em `/app/src` (= `prod/`, `campo-base-src.txt`) tiverem mudado.
2. `scp -i ~/.ssh/metrolabs_servidor publicar/* root@179.197.73.61:/tmp/pub-campo/` e `ssh ... "cd /tmp/pub-campo && sh publicar.sh"`.
3. O script: confere base, backup (compose + banco), build `FROM base` + `COPY app/`, confere hashes e sintaxe na imagem, troca,
   espera saudável (senão reverte) e confere `GET /` 200 e **`/campo/versao` = `7eeb3c773ab4`**.
4. **Celulares pegarem a versão nova:** a versão é o resumo dos arquivos, então o `sw.js` muda e cada celular baixa a versão nova
   ao abrir o app com internet (ou voltar para ele). Com esta versão em diante, ela assume sozinha no Meu dia / O.S. / Envios. Para
   **esta** troca (o hotfix ainda mostra só o aviso): avisar os técnicos — "abram o SGO+ Campo com internet; quando aparecer
   'Versão nova do app pronta', toquem em **Atualizar agora**; se não aparecer em 1 minuto, fechem o app (tirar da lista de
   recentes) e abram de novo". O que está guardado no aparelho não se perde (fica no IndexedDB). Conferência: em Envios a O.S.
   do técnico mostra `versaoApp` `7eeb3c773ab4` nos registros novos (coluna APARELHO do ATEC_SYNC).
5. Reverter: `cp /opt/metrolabs/backup/campo-foto-assinatura-correcao-20261118/compose.antes.yml /opt/metrolabs/sgo/docker-compose.yml && docker compose -f /opt/metrolabs/sgo/docker-compose.yml up -d app`.

Depois de publicar: OS-2026-0042 (GABRIEL WANKLEY, foto obrigatória pendente) — pedir que ele atualize o app e tente de novo; se
aparecer "A foto não chegou ao app", a causa é a memória do aparelho (fechar outros apps).
