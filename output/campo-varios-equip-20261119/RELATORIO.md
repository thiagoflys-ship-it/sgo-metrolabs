# SGO+ Campo: vários equipamentos na mesma O.S. (19/11/2026)

O pedido (dono, técnico em campo): o técnico precisa registrar mais de um equipamento. Decisão do dono: **vários equipamentos na
MESMA O.S.** Uma visita atende vários equipamentos e tudo sai num relatório só. Cada equipamento tem a sua série/TAG, a sua
situação, as suas fotos e o seu relato.

**Estado:** pronto e testado, **não publicado** e sem commit. Nada foi escrito em produção.

**Bases usadas:**
- Legado: `output/financeiro-20261116/cand38`. Ele parte de `cand37`, que está em produção com a E1. Os arquivos de
  Compras, Recarga, Caju e Depósito não foram tocados.
- App: partiu da versão em produção **94b9805bcd21** (`output/contratos-aditivo-20261119/e1/campo/novo`, E1 com a correção
  "sem série/TAG"). A rebase foi feita por merge de 3 vias, sem conflito no `app.js`. O `estilo.css` é o da E1 com as
  3 linhas novas no fim.

**Versão nova do app:** **f78affc17e5d**.

## 1. Como o técnico usa

1. Na O.S. (corretiva, preventiva e os demais serviços técnicos com visita), aparece o passo novo **"Equipamentos atendidos
   nesta visita"**, entre o Relato e a Assinatura.
   - O equipamento da O.S. aparece como o 1º da lista, com o que falta nos passos de sempre.
2. **"+ Acrescentar equipamento"** tem dois caminhos:
   - **Escolher da lista da unidade.** O filtro aceita TAG, série, tipo, setor e patrimônio. A lista vem no Meu dia, então
     funciona sem sinal.
   - **"Não está na lista: cadastrar o equipamento"**, com tipo, fabricante, modelo, série, TAG, setor e patrimônio.
     - Só o tipo é obrigatório. Sem série, TAG ou patrimônio também vale, como na correção do coordenador.
     - O cadastro vai para a fila (CADASTRO) e o equipamento entra com o id provisório, que o servidor troca pelo real.
     - Se a série ou a TAG digitada já existe na lista da unidade, o app usa o equipamento do cadastro.
     - Se for o próprio equipamento da O.S., o app recusa e diz o que fazer.
3. A tela de cada equipamento acrescentado tem 4 blocos:
   1. **Conferir:** "A série da etiqueta é…", "A TAG é…", digitar a série, ou "O equipamento não tem série nem TAG".
   2. **Relato próprio:** a mesma tela do relato, com os mesmos campos, os mínimos de palavras, o resultado do teste, a
      situação final, as medições e a revisão do português. O aviso "Relato só deste equipamento" fica no topo.
   3. **Fotos próprias:** mínimo 1, pela câmera ou pela galeria. A legenda já vem com o equipamento.
   4. **Peças dele:** a mesma tela de peças, filtrada. Peça em falta abre Compras como sempre.

   A tela também lista o que ainda falta e tem a opção **"Acrescentei por engano: tirar este equipamento"**, que pede o motivo.
4. A **assinatura do cliente é uma só** e vale para todos.
5. O **Concluí** só libera com todos completos e diz o que falta e em qual equipamento. Exemplo: "Equipamento 3 (Seladora):
   no relato, o serviço realizado…" ou "…: Pelo menos 1 foto deste equipamento".
6. Mensagens, ajuda e manual:
   - As mensagens dizem o quê, por quê e o que fazer.
   - A ajuda do app ganhou a seção nova "Vários equipamentos na mesma visita".
   - O `docs/MANUAL_APP_CAMPO.md` ganhou a seção "Vários equipamentos na mesma visita (19/11/2026)".

## 2. O que mudou

### App (`novo/`)

**`regras.js`**
- A O.S. normalizada passou a ter `clienteId`, `unidadeId`, `variosEquipamentos` e `equipamentosUnidade`.
- A O.S. provisória (aberta em campo) também aceita equipamentos a mais.
- Na execução, a lista nova `equipExtras` guarda o relato de cada equipamento. Na troca de celular, ela volta do servidor
  com `mesclarRegistrado`.
- O passo novo é `equipamentos`. As faltas são por equipamento (`faltasDoEquipExtra`) e `faltasDoRelato` é comum ao
  relato da O.S. e ao de cada equipamento.
- O mínimo de fotos da O.S. não conta as fotos dos outros equipamentos.

**`app.js`**
- Telas novas: `equipamentos`, `equipadd` e `equipx/<chave>`. O relato e as peças agora aceitam a chave do equipamento:
  `relato/<chave>` e `pecas/<chave>`.
- Evento `EQUIPAMENTO`:
  - o primeiro envio leva o equipamento;
  - os seguintes levam o estado inteiro (juntar `equip:<chave>`);
  - o pedido para tirar leva `remover`.
- Foto: `perguntaId` = `equip:<chave>`. Peça: leva `equipChave`.

**`fila.js`:** tipo `EQUIPAMENTO`.

**`estilo.css`:** `.lista-equip`.

### Legado (`cand37` → `cand38`, 8 arquivos, LF preservado; `legado-cand37-cand38.patch`)

| Arquivo | Mudança |
|---|---|
| `SGO_Assistencia_Config.js` | Aba nova `ATEC_OS_EQUIPAMENTOS` (CHAVE, EQUIPAMENTO_ID, a conferência e o relato com os mesmos nomes de coluna da ATEC_OS, ATIVO/REMOVIDO). Em `ATEC_PECAS`: coluna `EQUIP_CHAVE`. Cache `ATEC_ABAS_OK_V13`. |
| `SGO_Assistencia_OS.js` | Evento `EQUIPAMENTO` (`AstO_aplicarEquipExtra_`). Faltas por equipamento dentro de `AstO_faltas_`, o que leva a O.S. a ficar em "Documentação pendente" e diz qual equipamento falta. Foto `equip:<chave>` aceita. Peça com `equipChave`. Ficha da O.S. com `equipamentosExtras`. |
| `SGO_Assistencia_App.js` | Meu dia: `variosEquipamentos`, `equipamentosUnidade` (até 500, só com a O.S. aberta), `registrado.equipamentos` e `equipChave` nas peças. |
| `SGO_Assistencia_Relatorio.js` | Seção "Equipamento N atendido nesta visita". |
| `SGO_Assistencia_Fonte.js` | Histórico de atendimentos (ver abaixo). |
| `SGO_DocumentosPastas.js` | **Sem mudança** (igual à `cand37`), por decisão do coordenador com base na regra do dono de 18/11. O PDF da visita só aparece no prontuário, no QR, nas pastas e no Portal do **equipamento principal** da O.S. |
| `JS_Assistencia.html` | Bloco "Equipamentos atendidos nesta visita" na ficha da O.S. |
| `SGO_Ajuda_Assistencia.js` | Ajuda da Assistência com o fluxo novo. |
| `SGO_AssistenteManuais.js` | Base regerada. A única diferença é a seção nova do manual. |

**Regras do evento `EQUIPAMENTO`:**
- Idempotente pela chave do aparelho.
- Recusa definitiva, com o que fazer: equipamento de **outro cliente**, o próprio equipamento da O.S., equipamento em dobro,
  tipo de serviço de logística ou ronda.
- Aceita o id provisório do cadastro feito em campo.
- Série divergente gera aviso à gestão.
- `SEM_IDENT` vale como conferido.
- Tirar o equipamento só marca `ATIVO=NAO`; nada é apagado.

**Relatório:**
- Cada equipamento acrescentado tem a sua seção: identificação, conferência, caixa do resultado, serviço, medições,
  teste, situação final, recomendações, peças e fotos.
- A numeração das fotos continua a do relatório.
- A tabela de peças e as fotos do equipamento da O.S. não misturam os outros equipamentos.
- A marca de conferência do conteúdo inclui os equipamentos acrescentados.

**Histórico de atendimentos (`SGO_Assistencia_Fonte.js`):**
- Os equipamentos acrescentados entram em `EQUIPAMENTOS_ID_SGO`.
- `EQUIP_RELATOS` faz o histórico de cada equipamento mostrar **o relato dele**. Os dados não cruzam: o teste confere que
  a autoclave não mostra o relato da lavadora e vice-versa.

**Regra do dono de 18/11 aplicada (decisão do coordenador):** dado de um equipamento nunca cruza com outro.
- O PDF único da visita fica só no equipamento principal da O.S.
- No equipamento acrescentado aparece só o atendimento no histórico (ficha do equipamento, histórico da Assistência e Portal
  do cliente), com o relato dele e **sem o link do PDF** (`relatorioUrl` vazio em `SGO_Atendimentos_doEquipamento_`).
- O Portal monta o histórico pela mesma função e não leva link.
- O índice de documentos (QR, pastas, Portal) liga o relatório só ao `EQUIPAMENTO_ID` da O.S.
- O teste do servidor confere: histórico interno e de cliente, PDF ausente no acrescentado e presente no principal, índice.

**Servidor TypeScript:** sem mudança.

**Reabrir para correção:** continua igual. A O.S. reaberta libera também os equipamentos acrescentados no app.

## 3. Testes

| Teste | Resultado |
|---|---|
| `tests/campo-varios-equipamentos-20261119.test.cjs` (novo, legado real) | **5/0**. Cobre: Meu dia com a lista da unidade (sem o equipamento da O.S. e sem os de outro cliente); Concluí com o 2º incompleto fica em DOC_PENDENTE dizendo qual equipamento falta; ao completar, encerra; relatório com a seção do 2º, peça e foto nela e numeração contínua; idempotência; histórico sem cruzar dados; recusas (outro cliente, o próprio, em dobro); cadastro provisório; tirar o equipamento; tela, ajuda e manual. |
| `tests/campo-varios-equip-app-20261119.test.mjs` (novo, Chromium, Android e iPhone, 390 px) | **2/0**. Cobre: lista; acrescentar com filtro; conferir a série; relato do 2º (mínimos e resultado); foto do 2º com `equip:<chave>`; cadastrar sem série/TAG (CADASTRO com cliente e unidade); Concluí bloqueado dizendo o equipamento; tirar o acrescentado por engano e concluir. |
| Testes do app com `CAMPO=novo` | `campo-app-20261118` 6/0, `contratos-aditivo-e1-campo` 2/0, `relatorio-campo-app` 6/0, `pente-assistencia-campo` 8/0 |
| Suíte completa do legado em `cand38` (`suite.txt`, 303 arquivos) | **2738 pass / 0 fail**, nenhum arquivo com saída diferente de zero |
| Depois da regra do PDF (só `SGO_Assistencia_Fonte.js`, `SGO_Ajuda_Assistencia.js`, `JS_Assistencia.html` e a base do assistente mudaram; `SGO_DocumentosPastas.js` voltou ao da `cand37`) | Os 86 arquivos de teste que tocam esses arquivos: todos 0 falhas, entre eles `qr-equipamento-documentos` 9/0, `documentos-pastas` 9/0, `portal-cliente-etapa0` a `etapa6` (+ navegador) 81/0, `campo-varios-equipamentos` 5/0 e `assistente-duvidas` 12/0. App: 2/0 e `contratos-aditivo-e1-campo` 2/0. |

Capturas (390 px), em `capturas/android-*` e `capturas/iphone-*`:
1. lista de equipamentos;
2. acrescentar da lista da unidade;
3. relato do 2º equipamento;
4. 2º equipamento completo;
5. cadastrar equipamento;
6. conclusão bloqueada com o que falta no equipamento 3;
7. conclusão pronta.

## 4. Publicação (padrão da E1)

Pacote em `publicar/`. Ele é montado por `python output/campo-varios-equip-20261119/montar-publicacao.py`, rodado na raiz.

**Arquivos do pacote:**
- `camada.tgz`: os arquivos do legado que mudaram de `cand37` para `cand38`;
- `campo.tgz`: o app em `/app/dist` e em `/app/src`;
- listas de conferência: `base-hashes.txt`, `manifesto*.txt`, `total-*.txt`;
- `campo-base.txt` e `campo-base-src.txt`: os dois iguais a `e1/campo/novo`, versão 94b9805bcd21;
- `campo-esperado.txt`;
- `publicar.sh`: BASE `metrolabs/sgo:contratos-aditivo-e1-20261119`, TAG `campo-varios-equip-20261119`, pasta
  `/tmp/pub-veq`, `VERSAO_APP=f78affc17e5d`.

**Passos:**
1. Conferir a imagem em produção: `grep image: /opt/metrolabs/sgo/docker-compose.yml`. A esperada é
   `metrolabs/sgo:contratos-aditivo-e1-20261119`; se for outra, rode com `BASE=<imagem>`. O script recusa a publicação se o
   legado ou o app em dist/src tiverem mudado.
2. Copiar o pacote e rodar o script:
   - `ssh -i ~/.ssh/metrolabs_servidor root@179.197.73.61 "mkdir -p /tmp/pub-veq"`
   - `scp -i ~/.ssh/metrolabs_servidor output/campo-varios-equip-20261119/publicar/* root@179.197.73.61:/tmp/pub-veq/`
   - `ssh ... "cd /tmp/pub-veq && sh publicar.sh"`
3. O script faz, em ordem:
   1. confere a base;
   2. faz backup do compose e do banco;
   3. faz o build `FROM` base;
   4. confere usuário, total, hashes e sintaxe na imagem;
   5. troca a imagem e espera ficar saudável (se não ficar, reverte);
   6. confere `GET /` 200 e **`/campo/versao` = f78affc17e5d**;
   7. conta os erros no log.
4. **Celulares.** Com sinal, cada celular baixa a versão nova ao abrir o app, e ela assume sozinha no Meu dia, na O.S. e em
   Envios. Ao técnico em campo:
   - abra o SGO+ Campo com internet e toque em "Atualizar agenda";
   - se aparecer "Versão nova do app pronta", toque em **Atualizar agora**;
   - se a O.S. não mostrar "Equipamentos atendidos nesta visita", feche o app pela lista de recentes e abra de novo.

   A lista da unidade e a O.S. que aceita vários equipamentos chegam no próximo Meu dia.
5. **OS-2026-0038**, já concluída às 14:06:
   - se ainda estiver em "Documentação pendente", o técnico usa "Desfazer conclusão para corrigir" e acrescenta os
     equipamentos;
   - se já estiver encerrada, a gestão usa "Reabrir para correção".
6. Reverter: `cp /opt/metrolabs/backup/campo-varios-equip-20261119/compose.antes.yml /opt/metrolabs/sgo/docker-compose.yml && docker compose -f /opt/metrolabs/sgo/docker-compose.yml up -d app`.
   A aba nova fica no banco sem efeito.

**Arquivos desta pasta:**
- `novo/`: o app;
- `publicar/`: o pacote;
- `legado-cand37-cand38.patch`;
- `campo-e1-novo.patch`: o app, contra a E1;
- `docs.patch`: o manual;
- `legado-antes/`: a cópia dos arquivos antes da mudança;
- `versao-campo.cjs`: calcula a versão como o servidor;
- `capturas/`, `suite.txt`.
