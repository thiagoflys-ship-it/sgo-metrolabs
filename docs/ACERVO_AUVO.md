# Acervo do Auvo — cópia de segurança (etapa 0 da Assistência técnica)

21/10/2026 · aprovada pelo dono em 21/10/2026 · projeto: `docs/PROJETO_ASSISTENCIA_TECNICA_NO_SGO_20261021.md` (item 1.4 e etapa 0)

## Para que serve

Copiar para o servidor do SGO+ tudo o que está no Auvo antes de a empresa deixar de usá-lo: o registro completo de cada tarefa desde o início da conta (o JSON que a API devolve, sem cortes), as fotos, as assinaturas (do questionário e da tarefa), os anexos e as listas de apoio (usuários, tipos de tarefa, questionários, clientes, equipamentos, equipes).

Regras que o código garante:

- **Só leitura no Auvo.** Toda chamada é GET. O único POST é o login do token, o mesmo da integração atual.
- **Não mexe no SGO+ atual.** AUVO_TAREFAS, AUVO_SYNC e os cadastros ficam como estão. O acervo vive em abas próprias e numa pasta própria e é só consulta.
- **Nunca apaga nem sobrescreve.** Tarefa que mudou no Auvo ganha versão nova (`tarefa_<id>_versao2.json`); a anterior fica. Arquivo com o mesmo nome e conteúdo diferente ganha outro nome.
- **Retomável e idempotente.** Roda em lotes de até 4 minutos, com o ponto de parada gravado. Rodar de novo não baixa o que já foi copiado.
- **Privado.** Só Administrador e Diretoria veem a parte do acervo. Os arquivos ficam com compartilhamento privado: o link `/arquivos/<id>` exige estar logado no SGO+.

## Onde fica

| O quê | Onde |
|---|---|
| Código | `SGO_AuvoAcervo.js` (rotina e chamadas da tela), `SGO_AuvoAcervo_Tela.js` (parte da tela), carregada por `JS_Auvo.html` |
| Ajuda da tela | `SGO_Ajuda_Auvo.js`, chave `auvo/acervo` |
| Tarefas | aba `AUVO_ACERVO_TAREFAS`: uma linha por tarefa (resumo, sha256 e versão do JSON, pasta, conferência) |
| JSON completo | arquivo `tarefa_<id>.json` na pasta da tarefa, com sha256 e tamanho na aba de tarefas. A aba `AUVO_ACERVO_JSON` (trechos de 40.000 caracteres) foi preenchida na primeira cópia e continua lá; desde 22/10/2026 não recebe mais trechos (`GRAVAR_JSON_NA_ABA: false`), porque o servidor carrega a aba inteira na memória a cada gravação |
| Fotos, assinaturas, anexos | aba `AUVO_ACERVO_ARQUIVOS`: endereço original, tipo, de onde veio no JSON, nome, tamanho, tipo do conteúdo, sha256, situação, tentativas, motivo da falha, conferência |
| Arquivos | pasta `Acervo Auvo/<ano>/<número da tarefa>/` no servidor (disco + banco). Nome: `<tarefa>_foto_q1_r2.jpg`, `<tarefa>_assinatura_tarefa.png`, `<tarefa>_assinatura_questionario_q1_r4.png`, `<tarefa>_anexo_...pdf` |
| Listas de apoio | `Acervo Auvo/_listas_de_apoio/<lista>_<data>.json` |
| Relatórios | `Acervo Auvo/_relatorios/contagem_<data>.json` e `conferencia_<data>.json`; o último de cada fica também nas propriedades `AUVO_ACERVO_CONTAGEM` e `AUVO_ACERVO_RELATORIO` |
| Progresso | propriedade `AUVO_ACERVO_ESTADO`; pedido de pausa em `AUVO_ACERVO_PEDIDO`; trava do lote em `AUVO_ACERVO_EXECUTANDO` |

## Passo a passo

Pré-requisito: as chaves do Auvo gravadas em "Chaves e senhas" (AUVO_API_KEY e AUVO_API_TOKEN) e "Testar conexão" verde na tela Integração Auvo.

1. **Contar.** Integração Auvo › quadro "Acervo do Auvo (cópia de segurança)" › confira "Começar em" (padrão 01/2022; meses sem tarefa custam uma consulta só) › "Contar o acervo". A contagem roda sozinha, em lotes; ao terminar mostra tarefas por ano e por tipo, questionários, respostas com foto, assinaturas, anexos, arquivos a copiar, espaço estimado e tempo estimado. Não baixa nada (mede o tamanho por HEAD numa amostra de até 300 imagens).
2. **Conferir o espaço.** No servidor, `df -h /opt/metrolabs` precisa ter livre pelo menos o dobro do "espaço estimado" (cópia + folga), e a conta do Google Drive do backup também precisa caber o acervo.
3. **Copiar.** "Iniciar cópia". Etapas: listas de apoio › leitura das tarefas mês a mês (grava o JSON e registra os arquivos) › segunda passada (pega o que entrou ou mudou durante a primeira) › cópia dos arquivos (6 em paralelo) › conferência (relê cada arquivo e compara o sha256) › relatório. Pode fechar a tela: os lotes seguem pelo agendador.
4. **Acompanhar.** A tela atualiza a cada 15 s enquanto roda. "Pausar" termina o passo atual e para; "Continuar" retoma de onde parou.
5. **Falhas.** "Falhas de cópia" lista cada arquivo com o motivo. Falhas temporárias (rede, 429, 5xx, 401/403) são repetidas sozinhas até 3 vezes; em 401/403 a cópia relê a tarefa no Auvo e usa o endereço atual da imagem. Depois de terminar, "Tentar de novo as falhas" põe todas de volta na fila. 404/410 ("o Auvo não tem mais este arquivo") e "página da internet, não um arquivo" vão para o dono decidir.
6. **Relatório de conferência.** Tarefas no Auvo × no acervo, por mês; arquivos esperados × copiados × falhas, por tipo e por motivo; conferência do sha256 dos arquivos e dos JSON. "Zero faltas" só quando não falta tarefa, não há falha nem pendência e nenhum arquivo diverge.
7. **Repetir antes de cancelar o Auvo.** Na véspera do cancelamento, "Iniciar cópia" de novo: o que já está copiado não é baixado; entram só tarefas novas ou alteradas. O Auvo só é cancelado com o relatório em zero faltas, ou com as faltas explicadas e aceitas pelo dono.

### Rodar pelo servidor (sem a tela)

As funções abaixo rodam no worker do legado (mesma via dos testes `pool.executar`), com o SGO+ já importado em `legado/`:

- `AuvoAcervo_iniciar_('CONTAGEM', { inicio: '2022-01' }, null)` ou `AuvoAcervo_iniciar_('COPIA', { inicio: '2022-01' }, null)`
- `AuvoAcervo_rodarLote_()` — um lote (até 3 min); o agendador chama `AuvoAcervo_loteGatilho` a cada 30 s enquanto houver trabalho, e um vigia de 6 min retoma se um lote for interrompido.
- `AuvoAcervo_status_()` — situação, contagem e relatório.

### Limites do lote (correção de 22/10/2026)

Em 21–22/10 a cópia derrubou o servidor ("JavaScript heap out of memory", 13 quedas), e o vigia retomava o mesmo grupo de arquivos a cada 8 min. Causas no código: no servidor, `blob.getBytes()` vira uma lista de números (cerca de 8 bytes de memória por byte do arquivo) e `Utilities.newBlob(lista)` copiava de novo, com 6 arquivos por grupo e sem saber o tamanho antes; além disso, o grupo podia passar do limite de 300 s do servidor. O que mudou:

- **Tamanho antes de baixar.** HEAD em cada arquivo. Acima de 40 MB, o arquivo não é baixado: vira FALHA "arquivo grande (N MB)...". Para copiar esses arquivos, grave a propriedade `AUVO_ACERVO_MAX_MB` com o limite novo (em MB) e toque em "Tentar de novo as falhas". Teste antes um arquivo só: um arquivo de 200 MB ocupa várias vezes o tamanho dele na memória durante a cópia.
- **Teto por grupo e por lote.** No máximo 24 MB por grupo em paralelo; arquivo sem tamanho informado vai sozinho. O lote para em 3 min, em 400 arquivos ou em 250 MB baixados, o que vier primeiro.
- **Sem cópias dos bytes.** O sha256 e o tamanho saem direto do blob da resposta, que é gravado como veio.
- **Leitura leve das abas.** A fila é montada lendo a aba de arquivos uma vez por lote, e só as linhas do lote viram objeto. Das tarefas, o lote lê só o número e a pasta. A conferência usa uma lista enxuta e grava só as duas colunas da conferência.
- **Tentativa marcada.** Cada arquivo é marcado (`ANDAMENTO_EM`) antes de baixar e gravado assim que termina. Se o lote for encerrado no meio, a próxima rodada separa os arquivos marcados e tenta cada um sozinho. O que for encerrado 2 vezes vira FALHA "download não concluiu" e a cópia segue.
- **Tempo por download.** O servidor corta cada busca em 60 s. A rotina não começa um grupo com menos de 90 s de folga e, na busca um a um, adia para o próximo lote o que não couber.
- **Trava curta.** A trava do lote vale 330 s, um pouco acima do limite do servidor; a trava de um lote morto se solta sozinha.

### Retomar depois de uma parada

1. Importe o SGO+ atualizado para o `legado/` do servidor e reinicie.
2. Não é preciso apagar `AUVO_ACERVO_EXECUTANDO`: a trava antiga vence sozinha (330 s).
3. Na tela Integração Auvo › Acervo, toque em "Pausar": com a trava vencida, a situação muda na hora para "Pausada". Depois toque em "Continuar": o gatilho volta a ser criado e o próximo lote começa em 5 s. Sem a tela, pelo worker: `AuvoAcervo_apiPausar(null)` e depois `AuvoAcervo_apiContinuar(null)`.
4. Acompanhe pelas próximas rodadas: `estado.ultimaRodada` muda a cada ~3,5 min e `estado.arquivos.copiados` sobe a cada lote.

`AuvoAcervo_loteGatilho` tem "Gatilho" no nome, então o navegador não consegue chamá-lo (regra do servidor); o navegador só chama `AuvoAcervo_apiDispatch` e `AuvoAcervo_obterConteudo`, que conferem a sessão e o perfil.

## Estimativas (antes da contagem real)

Base do projeto: ~5.174 tarefas em 2 anos, 30 tipos, 13 questionários. Sem a contagem não se sabe quantas fotos há por tarefa; a contagem mede.

| Fotos por tarefa (média) | Arquivos | Espaço (≈ 400 KB por foto) | Tempo da cópia |
|---|---|---|---|
| 3 | ~16 mil | ~6 GB | ~1 h a 1 h 30 |
| 6 | ~31 mil | ~12 GB | ~2 h a 3 h |
| 10 | ~52 mil | ~20 GB | ~3 h a 5 h |

Mais: JSON das tarefas (~25 a 100 MB) e listas de apoio (poucos MB). Leitura das tarefas: ~60 meses + ~55 páginas + gravação de ~5.200 registros, em torno de 20 a 40 minutos. O ritmo mínimo entre chamadas à API do Auvo é de 250 ms; em 429 a rotina espera o tempo pedido pelo Auvo.

## Backup

O backup diário (`deploy/backup/backup.sh` do servidor) já cobre o acervo: o banco (abas e metadados) vai no `pg_dump`, e os arquivos ficam em `/opt/metrolabs/sgo/dados`, que o `rclone sync` envia criptografado para o Drive. Pontos de atenção:

- A primeira noite depois da cópia envia todo o acervo de uma vez (de 6 a 20 GB pelas estimativas). Cabe no limite diário de envio do Drive (750 GB), mas pode passar do horário: o vigia acusa backup longo, não falha.
- A conta do Google Drive do cofre precisa ter espaço livre para o acervo.
- Nada a mudar no script: os arquivos do acervo não são substituídos depois de gravados, então não enchem `dados_antigos`.

## O que não se sabe do Auvo (e como o código se protege)

- Se `/tasks` sem resultado devolve lista vazia ou 404: os dois contam como zero e o 404 aparece em "meses sem resposta" no relatório.
- Se `/taskTypes`, `/questionnaires` e `/teams` existem na conta: lista que devolve 404 fica "não disponível" e não para a cópia.
- Se o registro da listagem tem tudo o que a tarefa tem: a cópia guarda exatamente o que a listagem devolve (é a mesma fonte que a integração usa desde 26/08). `GET /tasks/<id>` só é usado para renovar endereço de imagem vencido.
- Se os endereços das imagens vencem: por isso a cópia é a etapa 0, e a falha 401/403 relê a tarefa.

## Testes

- `tests/auvo-acervo.test.cjs` (17 testes, `node --test`): download que nunca responde (lote encerrado à força, arquivo separado e FALHA na 2ª vez), arquivo grande e teto de bytes, 25 mil linhas com memória estável e estado pequeno, retomada com trava velha; contagem, paginação e retomada em lotes, JSON sem cortes em trechos, sha256 de cada arquivo, nomes e pastas, versão nova sem apagar a anterior, idempotência (segunda cópia não baixa nada), reaproveitamento de arquivo já gravado, falha registrada e "Tentar de novo", 401/403 com endereço renovado, conferência (divergente e sumido), 404/429/ERRO e retomada, pausa, trava, acesso por perfil, sem chave, tela e ajuda; em todos, só GET no Auvo e a aba AUVO_TAREFAS intacta.
- `sgo_servidor/testes/auvoAcervo.test.ts` (vitest): o mesmo fluxo na camada de compatibilidade real (planilha no PostgreSQL, DriveApp em disco, UrlFetchApp pela ponte), conferindo o sha256 da aba com o do arquivo no banco.
