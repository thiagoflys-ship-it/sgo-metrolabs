# Manutenção do servidor Metrolabs — 19/11/2026 (00:04 às 00:25)

Servidor Hostinger 179.197.73.61 (Ubuntu 24.04.5, 193 GB de disco, 15 GB de RAM).
Pedido do dono: limpar, corrigir e remover o que ocupa espaço sem motivo.
Nenhum contêiner de produção foi parado ou reiniciado. Nenhum compose, cofre, segredo, volume ou banco foi alterado.

Os registros completos (listas exatas de tudo o que saiu) estão em `registro/` ao lado deste arquivo e no servidor em `/opt/metrolabs/manutencao/registro-20261119/`.

## 1. Resultado em uma linha

**Disco: 8,0 GB livres (96%) → 107 GB livres (45%). Foram liberados cerca de 98 GB.** Ao fim, SGO+, RH360, os dois bancos e o Caddy seguiam no ar e saudáveis, sem nenhum reinício. HTTP local respondeu 200 e o HTTPS público também respondeu 200.

## 2. Estado antes (19/11 00:04)

| Item | Valor |
|---|---|
| Disco `/` | 193 G, 185 G usados, **8,0 G livres (96%)** |
| Imagens Docker | 420 (583 etiquetas), 37,6 GB |
| Contêineres | 251 no total: 36 em execução e 215 parados |
| Volumes | 90 (13,8 GB) |
| Cache de build | 21 GB (1554 registros) |
| Memória / swap | 3,5 GB usados de 15 GB, 12 GB disponíveis; swap com 1,9 de 4 GB em uso |

Maiores consumidores:

| Pasta | Tamanho | O que é |
|---|---|---|
| `/opt/metrolabs/qa` | **68 GB** | ensaios de QA (RH e SGO, de 31/10 a 18/11), em 301 pastas |
| `/var/lib/containerd` + `/var/lib/docker` | 63 GB | imagens, cache de build e volumes |
| `/opt/metrolabs/backup` | 27 GB | backups de publicação, backup noturno e scripts de rotina |
| `/opt/metrolabs/sgo` | 21 GB | `dados` 12 G (produção), `migracao` 8,1 G, `pgdata` 1,1 G |
| `/opt/metrolabs/rh` | 2,4 GB | `atualizacoes` 2,1 G |

O vigia avisava "disco em 85% ou mais" desde 14/11 e chegou a 96% em 18/11 às 15:30.

## 3. O que foi removido

| # | Item | Quantidade | Liberado | Por que era sobra |
|---|---|---|---|---|
| 1 | Contêineres parados | 215 | ~2 GB | Todos eram ensaios de QA de 31/10 a 06/11 (`qa-*`, `rh-*-crash`, `rh_sgo337_*`, `secullum_setup336_*`, `sgo-*-restore` etc.). Nenhum pertencia a um compose real: o rótulo de pasta do compose estava vazio ou apontava para `/opt/metrolabs/qa`. A remoção foi feita **sem `-v`**, então os volumes ficaram. Lista: `registro/01-conteineres-parados-removidos.txt` |
| 2 | Imagens fora da retenção | 549 etiquetas / 400 imagens | ~19 GB | Para metrolabs/sgo e metrolabs/rh ficaram a atual + as 5 mais recentes, mais as imagens usadas por qualquer contêiner. `docker rmi` rodou sem `-f` e não houve nenhuma recusa. Lista: `registro/02-imagens-a-remover.txt` e `registro/02-imagens-mantidas.txt` |
| 3 | Cache de build | 1554 registros | ~14 GB efetivos (21 GB nominais) | Ele é refeito na próxima publicação |
| 4 | Backups de publicação pela regra de guarda | 162 itens | 7,7 GB | Detalhes na seção 3.1. Lista: `registro/07-backups-limpeza_2026-11-19_0017.log` |
| 5 | `/tmp` com mais de 2 dias | ~300 arquivos e pastas | ~0,1 GB | Sobras de publicações e diagnósticos de 23/10 a 13/11: `deploy_*.log`, `pacote-*.tgz`, `zz_*.ts`, `sgo-publicacao-20261023-*` |
| 6 | Pastas de QA antigas (só os arquivos grandes) | 1192 arquivos em 56 pastas | **53,0 GB** | Detalhes na seção 3.2. Lista: `registro/05-qa-arquivos-removidos.txt` |
| 7 | Cópias duplicadas da migração do SGO+ | 1 pasta + 1992 arquivos | 3,2 GB | Detalhes na seção 3.3. Lista: `registro/06-migracao-removidos.txt` |

### 3.1 Regra aplicada aos backups

A regra vale para `/opt/metrolabs/backup` e `/opt/metrolabs/sgo/backups`, separando os sistemas SGO e RH:

- Ficou **tudo** o que tem até 7 dias e os **10 mais recentes** de cada sistema.
- Entre 7 e 60 dias, ficou **o mais recente de cada semana**. Esses representantes são:
  - SGO: `portoes_contagem`, de 23/10, saiu porque `sgo/backups/integracao-20261023-a2e1…` é mais recente na mesma semana e ficou; `dump_antes_licitacoes-etapa1_20261101_2240`; `comercial-20261106T192159Z`; `comercial-proposta-guiada-20261112`.
  - RH: `rh-cct-governanca-20261107T003840Z`; `rh360-dossie-preparacao-20261112T030430Z`.
- Nos backups que não ficaram, **saíram só os arquivos acima de 1 MB** (dumps, .tar, .tgz). Os arquivos pequenos ficaram (`compose.antes.yml`, `docker-compose.anterior.yml`, `reverter.sh`, json), para manter o histórico do que foi publicado.
- Nenhum backup tinha mais de 60 dias; o mais antigo é de 21/10.
- Os 106 dumps soltos `dump_antes_*.sql.gz` (21/10 a 03/11), o `catalogo-antes-20261111.dump` e o `prova.zVZJ5N/sgo.dump`, que era um ensaio de 05/11, entraram na mesma regra.
- Ficaram de fora porque já têm rotina própria: `backup/banco` (noturno do SGO, 14 dias), `backup/rh` (noturno do RH) e `backup/logs`.

### 3.2 Pastas de QA

Foram aliviadas as pastas de `/opt/metrolabs/qa` que cumpriam três condições: criadas antes de 05/11 (mais de 14 dias), sem montagem em nenhum contêiner em execução e com o ensaio já encerrado, porque os contêineres dele foram os parados removidos no item 1. Saíram só os arquivos acima de 1 MB; os relatórios e json de evidência ficaram. Principais:

| Pasta | Liberado | Conteúdo |
|---|---|---|
| `sgo-ponto-avisos-20261104/backup-verificado` | 9,0 GB | `dados.tgz` + `banco.dump` de produção de 04/11 (antes da publicação). Pela regra de backups, o representante da semana é `comercial-20261106T192159Z`. Os arquivos do SGO+ também têm cópia diária no Drive, com 60 dias de versões. |
| `sgo-retomada-20261104-1157…/backup-verificado` | 9,0 GB | Idem, de 04/11 00:50 |
| `completed329-`, `completed3295f-`, `completed330-`, `completed331-backup-20261101…` | 30,3 GB | Retratos dos ambientes de QA do RH (rootfs .tar de 2,6 GB, imagens .tar), feitos em 01/11 para descartar os ensaios. Não são backup de produção. |
| `*-operator-20261101-*`, `*-browser-source-*`, `hr-reference-base-metadata-*`, `sgo-ponto-separar/mobile`, `sgo-compras-acessos`, `sgo-estufa-simulado`, `sgo-comercial-investimento` e outras | ~4,7 GB | Áreas de trabalho de ensaios de 31/10 a 04/11. As funções testadas foram publicadas há muito tempo: o RH já está na r98. |

O `completed332op-backup-20261101T134520Z` (8,4 GB) ficou inteiro como representante da semana. As pastas de ensaio de 05/11 em diante (~15 GB) também não foram mexidas.

### 3.3 Migração do SGO+

Em `/opt/metrolabs/sgo/migracao`, só saiu o que foi provado como cópia:

- `base_20261015` (1,6 GB): `diff -r` mostrou que é **idêntica byte a byte** a `pacote`.
- Em `por_id`, saíram 1992 arquivos (1,6 GB). Antes de apagar cada um, `cmp` confirmou que existe uma cópia idêntica em `por_id_novo`. Sobrou só `_conferencia.json`.

Ficaram `pacote` e `pacote_novo`, porque são diferentes entre si, e `por_id_novo`, que foi a fonte da mesclagem aplicada em 19/10. Juntos somam 4,9 GB.

## 4. O que foi mantido e por quê

- **Volumes: nenhum foi removido.** Dos 90, 67 não estão em uso (12,4 GB) e **todos os 67 são bancos postgres** de ensaios de QA do RH, com cópias de dados do RH. A regra proíbe remover volume de banco. Lista com tamanho: `registro/04-volumes-sem-uso.txt`.
- **31 contêineres de QA do RH em execução há 2 semanas** (`rh-accounting-*`, `rh-reference-*`, `rh-profile-*`, `rh-education334*`, `rh-policy-ack-*`). Três deles aparecem como *unhealthy*. Não foram parados porque a regra proíbe parar contêiner em execução. As imagens e pastas de QA deles também ficaram.
- **Imagens mantidas (20):**
  - SGO: atual + 5;
  - RH: atual + 5, contando os rótulos `-candidatoN` que apontam para as mesmas imagens;
  - 9 imagens antigas do RH usadas pelos contêineres de QA em execução;
  - `metrolabs/rh-base:20261019`, que é a base do Dockerfile do RH;
  - `postgres:16-alpine` e `caddy:2-alpine`.
- **Backups:** tudo dos últimos 7 dias (cerca de 12 GB, a maior parte com 130 a 184 MB por publicação do SGO), `rh-base-fs-r89-20261118` (1 GB), o noturno do SGO (`banco/`, 1,9 GB, 14 dias) e o noturno do RH (`rh/`, 0,7 GB).
- **Pequenos, sem ganho real:**
  - `/opt/metrolabs/build-*` (13 pastas, ~10 MB): contextos de build de 13 e 14/11;
  - `/opt/metrolabs/sgo/app.anterior` (35 MB);
  - `/opt/metrolabs/rh/codigo-antes-*` (34 MB);
  - `/opt/metrolabs/rh/atualizacoes` (2,1 GB, pacotes de atualização do RH): fica com o dono do RH.
- **Logs do Docker:** a rotação já existia em `/etc/docker/daemon.json` (`max-size 20m`, `max-file 5`) e todos os contêineres a usam. Não foi preciso mexer. O journal ocupa 143 MB, abaixo do limite de 500 MB, e o cache do apt estava vazio.

## 5. Estado depois (19/11 00:21)

| Item | Antes | Depois |
|---|---|---|
| Disco usado / livre | 185 G / 8,0 G (96%) | **87 G / 107 G (45%)** |
| Imagens | 420 (37,6 GB) | 20 (15,4 GB) |
| Contêineres | 251 (215 parados) | 36 (todos em execução) |
| Cache de build | 21 GB | 0 |
| `/opt/metrolabs/qa` | 68 GB | 15 GB |
| `/opt/metrolabs/backup` | 27 GB | 19 GB |
| `/opt/metrolabs/sgo` | 21 GB | 18 GB |
| `/var/lib/containerd` | 50 GB | 15 GB |

Saúde ao fim, conferida pelo `/opt/metrolabs/manutencao/saude.sh`, que também rodou depois de cada etapa:

- `sgo-app-1`, `sgo-db-1`, `rh-app-1` e `rh-db-1` em execução e saudáveis; `caddy-caddy-1` em execução; nenhum reinício.
- HTTP local: SGO+ 200 e RH360 200. HTTPS pelo Caddy (sgo.metrolabs.com.br): 200.
- O vigia registrou às 00:20: "Servidor Metrolabs: tudo normal de novo."

## 6. Problemas encontrados e correções

| Problema | Situação | O que foi feito |
|---|---|---|
| **Disco em 96%**, perto de travar o backup das 02:00 (~180 MB por dia) e as publicações (~4,6 GB por imagem) | Corrigido | Limpeza descrita acima e rotina semanal (seção 7) |
| **Backup noturno de 16/11 falhou** na etapa "conferência" (`backup.sh`, linha 39). Esse dia ficou sem cópia no Drive. | Corrigido | A causa é intermitente: `pg_restore --list \| grep -q` com `pipefail`. O `grep -q` fecha o cano ao achar o texto e o `pg_restore` morre por SIGPIPE, o que derruba o script. Troquei por `grep … > /dev/null`, que lê tudo. A cópia original está em `backup.sh.antes_20261119`. Testei a conferência no dump de 18/11 e ela passou. Os backups de 17 e 18/11 estão OK, com Drive. |
| Serviço `sgo-qa-limpeza-manual-20261106.service` aparecia em `systemctl --failed` | Corrigido | Era uma unidade temporária de 06/11 que falhou na 1ª tentativa; a limpeza rodou depois com sucesso ("LIMPEZA_CONCLUIDA" no log). Rodei `systemctl reset-failed` e agora nenhum serviço consta como falho. |
| Caddy: ~170 "connection refused" e 16 "lookup sgo-app" em 24 h | Explicado, não corrigido | Todos caem nos horários das ~10 publicações de 18/11 (app reiniciando). Quem estava usando o sistema nesses segundos recebeu erro 502. Ver recomendação 4. |
| `sgo-db-1`: 10 erros de SQL em 24 h (sintaxe, role "postgres" inexistente) | Sem impacto | São consultas manuais de manutenção ou dos agentes, não do sistema. |
| Contêineres reiniciando em loop | Nenhum | Contagem de reinícios = 0 em todos |
| Certificados TLS | OK | sgo, rh e command valem até 13/01/2027 (55 dias); o Caddy renova sozinho aos 30 dias |
| Memória | OK | 12 GB disponíveis. O swap tem 1,9 GB em uso, provavelmente pelos 31 contêineres de QA parados no tempo. |
| Banco do SGO+ | OK | 940 MB. Maiores tabelas: `lic_contratacoes` 329 MB (9,8 mil linhas mortas, autovacuum em 18/11 22:37), `lic_bruto` 227 MB, `linhas` 223 MB, `emails_saida` 56 MB (53 MB de TOAST). Licitações somam ~65% do banco. Não precisa de VACUUM FULL: a rotina de segunda já faz VACUUM ANALYZE e a regra de guarda. Banco do RH: 21 MB. |
| Cron | OK | Rodando: backup SGO 02:00, backup RH 02:45, vigia a cada 5 min, manutenção segunda 06:30, teste de restauração dia 1 às 04:00 (último OK em 03/11) e agente Monarx sábado. |

## 7. Rotina automática criada

- **Script:** `/opt/metrolabs/manutencao/limpeza.sh`. Com `--ensaio`, só mostra o que faria.
- **Agendamento:** `/etc/cron.d/metrolabs_limpeza`, **domingo às 03:30**. Assim fica depois dos backups das 02:00 e 02:45 e antes da manutenção de segunda às 06:30.
- **Log:** `/opt/metrolabs/manutencao/logs/limpeza_AAAA-MM-DD_HHMM.log`, guardado por 180 dias. O resumo vai para `/opt/metrolabs/manutencao/ultima_limpeza.txt`.

Antes de começar, o script faz duas checagens:
- confere a saúde dos sistemas (`saude.sh`) e **adia a limpeza** se algo não estiver normal;
- **adia também** se houver `docker build` ou `compose up` em andamento.

O que ele faz:
1. Apaga o cache de build.
2. Remove imagens `metrolabs/*` fora da regra "6 mais recentes por repositório". Nunca remove as usadas por qualquer contêiner nem as citadas em `FROM` de Dockerfile em `/opt/metrolabs`. Imagens de base não são tocadas e o `docker rmi` roda sem `-f`.
3. Aplica a regra de backups da seção 3.1: 7 dias inteiros, os 10 mais recentes por sistema e 1 por semana até 60 dias. Dos demais, apaga só os arquivos acima de 1 MB.
4. Apaga o que está em `/tmp` há mais de 2 dias, sem tocar em arquivos de sistema.

**Nunca** remove volumes, contêineres, bancos, cofre ou dados, e nunca reinicia nada.

Ligação com a manutenção de segunda: em `manutencao_semanal.sh` entrou o bloco "8b". Ele põe o resumo da limpeza de domingo no e-mail de segunda, em "LIMPEZA FEITA". Se a limpeza foi adiada ou está há mais de 8 dias sem rodar, o aviso vai para "PEDEM ATENÇÃO". A cópia original está em `manutencao_semanal.sh.antes_20261119`; a sintaxe foi conferida e o resto do script ficou intacto.

O ensaio final do script não encontrou mais nada a remover (0 imagens, 0 backups).

## 8. Recomendações que dependem do dono

1. **Google Drive do backup pode parar (urgente).** O rclone avisa em todo backup: *"This remote uses rclone's shared Google Drive client_id, which is being retired and will stop working during 2026."* Os backups criptografados do SGO+ e do RH no Drive dependem disso. É preciso criar um client_id próprio no Google Cloud e reconfigurar o remoto `gdrive`. Isso pede a conta Google da empresa.
2. **Reinício pendente do servidor.** Há kernel 6.8.0-149 e libc6 novos instalados aguardando reinício. Marcar um horário fora do expediente; leva cerca de 2 minutos. Há 22 pacotes atualizáveis, 2 deles de segurança (`libgstreamer1.0-0` e `needrestart`). Não atualizei nada.
3. **QA do RH ocupa ~27 GB e guarda cópias de dados de pessoas.** São 31 contêineres de ensaio ligados há 2 semanas (3 *unhealthy*), 67 volumes postgres soltos (12,4 GB) e pastas de QA de 05/11 em diante (~15 GB, incluindo `completed332op-backup`, com 8,4 GB). Os ensaios terminaram e o RH já está na r98. Desligar e apagar tudo isso libera espaço, memória e swap e reduz cópias de dados pessoais (LGPD). Isso exige parar contêineres e apagar volumes de banco, por isso precisa do seu "ok" (ou do responsável pelo RH/Codex).
4. **Quedas de segundos a cada publicação do SGO+.** Durante o reinício do app, o Caddy devolve erro 502: foram ~170 requisições em 18/11. Uma linha `lb_try_duration 30s` no `reverse_proxy` do Caddyfile faz o Caddy esperar o app voltar em vez de dar erro. É uma mudança de configuração do Caddy, então não apliquei.
5. **As imagens crescem a cada publicação.** Cada imagem do SGO+ é construída `FROM` a anterior, por isso já tem 4,6 GB, e as do RH, 5,6 GB. Mesmo removendo etiquetas antigas, as camadas antigas continuam presas dentro da atual. Uma reconstrução limpa periódica, por exemplo mensal, a partir da imagem de base deve trazer cada imagem para menos de 1 GB e liberar ~10 GB.
6. **Migração do SGO+ (4,9 GB).** `migracao/pacote`, `pacote_novo` e `por_id_novo` são o material da importação de 15 a 19/10. Os dados já estão em `sgo/dados` e no banco, com cópia no Drive. Se não houver mais chance de reimportar, dá para apagar.
7. **Pacotes de atualização do RH** (`/opt/metrolabs/rh/atualizacoes`, 2,1 GB, 111 pastas). Vale combinar uma regra de guarda com quem publica o RH.
8. Pelo e-mail de manutenção de 16/11 há 407 erros de funcionamento e 373 avisos da gestão parados na semana. Isso é do sistema, não do servidor, e já aparece no e-mail de segunda.

## 9. Arquivos alterados ou criados no servidor

| Arquivo | Mudança |
|---|---|
| `/opt/metrolabs/manutencao/limpeza.sh` | novo (rotina semanal) |
| `/opt/metrolabs/manutencao/saude.sh` | novo (conferência rápida de saúde) |
| `/etc/cron.d/metrolabs_limpeza` | novo (domingo 03:30) |
| `/opt/metrolabs/backup/backup.sh` | linha 39 corrigida (original em `backup.sh.antes_20261119`) |
| `/opt/metrolabs/backup/manutencao_semanal.sh` | bloco 8b com o resumo da limpeza (original em `manutencao_semanal.sh.antes_20261119`) |
| `/opt/metrolabs/manutencao/registro-20261119/` | listas exatas do que saiu (cópia em `registro/` aqui) |
