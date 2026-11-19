# Manutenção do servidor — parte 2 (19/11/2026, a partir das 07:34)

Esta parte executa os itens que o dono autorizou às ~02:50. A mensagem com a autorização só chegou para execução às **07:34 (hora do servidor)**. Nesse horário:

- já estava em curso a janela em que o SGO+ não pode ser trocado nem reiniciado (06:00–08:30, fotografia diária do Financeiro);
- o limite de 05:45 para o reboot já tinha passado.

Por isso a ordem ficou assim:
- itens 1, 2 e 3, que não tocam no SGO+, foram feitos logo;
- item 4 ficou para depois das 08:30;
- **item 5 (atualizações + reboot) NÃO foi executado**, conforme a instrução "se não der, pare e reporte". Ver seção 5.

Listas exatas de tudo o que saiu: `registro/1x-*` (cópia de `/opt/metrolabs/manutencao/registro-20261119/` no servidor).

## 1. Ensaios de QA do RH — feito

**Conferência antes de remover** (`registro/11-qa-conteineres.txt`):
- Os 31 contêineres de ensaio não usavam nenhuma das redes de produção (`metrolabs`, `rh_interno`, `sgo_interno`). Cada um estava numa rede própria de ensaio (`rh-accounting-qa-*`, `rh-reference-cold-*` etc.).
- Também não montavam nenhum caminho de produção: só montavam `/opt/metrolabs/qa/...` ou volumes anônimos.
- Nenhum tinha pasta de compose. O rótulo `com.docker.compose.project=rh` vinha copiado, sem `working_dir`.
- Produção confirmada à parte:
  - `rh-app-1`: redes `metrolabs` e `rh_interno`, monta `/opt/metrolabs/rh/dados`;
  - `rh-db-1`: rede `rh_interno`, monta `/opt/metrolabs/rh/pgdata`;
  - `sgo-app-1`, `sgo-db-1` e `caddy-caddy-1` também usam só pastas montadas do disco, **nenhum volume Docker**.

**Removido:**

| Item | Quantidade | Tamanho |
|---|---|---|
| Contêineres de ensaio (parados com `docker stop -t 20` e removidos) | 31 | — |
| Volumes de banco de QA (70 anônimos + 20 `qa-completed*-raw-clone/sql-restore` com rótulo `metrolabs.qa…`; todos postgres) | 90 | 13,2 GB |
| Redes de ensaio vazias | 27 | — |
| Pastas de QA de 05/11 em diante, mais `completed332op-backup` | 144 | 10,1 GB |

As listas exatas estão em `registro/12-volumes-qa-removidos.txt`, `registro/11-qa-redes.txt` e `registro/13-qa-pastas-removidas.txt`.

**Mantido de propósito:**
- **Pastas de QA das últimas 24 h** (cerca de 71 itens, entre eles `rh-fonte-recorte-registro-r102-20261119*`, `rh-cct-condicoes-excecoes-r100-*` e `rh-cct-expressoes-fundamento-r99-*`). O RH publicou r99 a r102 hoje de manhã (r102 às 07:29) e o processo de publicação do RH usa essas pastas. Apagá-las poderia quebrar uma publicação em andamento.
- **Restos das pastas de QA de antes de 05/11.** Na parte 1 elas já tinham ficado só com arquivos pequenos e somam ~4,2 GB. A autorização falava em "de 05/11 em diante". **Se o dono quiser, podem ser apagadas inteiras**, porque também têm cópias de dados de pessoas.

Depois: `rh-app-1` em execução e saudável, HTTP local 200 e HTTPS público 200. O SGO+ não foi tocado.

## 2. Migração do SGO+ e pacotes antigos do RH — feito

**Conferência antes de remover:**
- Nenhum compose, cron, unidade systemd, script de backup ou de publicação, `.env` ou Caddyfile cita `sgo/migracao` ou `rh/atualizacoes`.
- Nenhum contêiner monta essas pastas.
- A única citação é em `/opt/metrolabs/sgo/carregar_dados_reais.sh`: o script **manual** da carga inicial de 15/10, que *apaga o banco* para carregar o pacote. Ele não roda por cron e, sem a pasta, para logo na primeira checagem ("Falta migracao/pacote/…"), o que o deixa mais seguro.
- Em `rh/atualizacoes` nada foi alterado desde 01/11. As publicações do RH hoje usam `/opt/metrolabs/qa`.

**Removido:**
- `/opt/metrolabs/sgo/migracao` (4,9 GB, 2163 arquivos). A listagem completa está em `registro/14-migracao-lista.txt`. Os relatórios pequenos (`carga.log`, `carga_oficial.log`, `relatorio_importacao_*.json`, `_conferencia.json`) foram guardados em `registro/14-migracao-relatorios/`.
- `/opt/metrolabs/rh/atualizacoes` (2,1 GB, 111 pastas, 39 222 arquivos). Listagem em `registro/15-rh-atualizacoes-lista.txt`.

Saúde depois: SGO+ e RH com HTTP local 200 e HTTPS 200.

## 3. Caddy — feito

- **Backup:** `/opt/metrolabs/caddy/Caddyfile.antes_20261119`.
- **Mudança:** nos três sites (`sgo`, `command`, que usa o mesmo app do SGO+, e `rh`), `reverse_proxy <app>:8080` virou:
  ```
  reverse_proxy sgo-app:8080 {
  	lb_try_duration 30s
  	lb_try_interval 250ms
  }
  ```
- **Validação:**
  - primeiro `caddy validate` num contêiner descartável com o arquivo novo ("Valid configuration");
  - depois o arquivo foi regravado **no mesmo inode**. Isso é necessário porque o Caddyfile é montado direto no contêiner: um `sed -i` criaria outro arquivo e o Caddy continuaria vendo o antigo;
  - por fim `caddy validate` dentro do contêiner e `caddy reload`.
- **Sem reinício:** o contêiner segue no ar desde 23/10, com 0 reinícios.
- **HTTPS público após o reload:** sgo 200, rh 200, command 200.
- **Efeito:** durante o reinício do app numa publicação, quem estiver usando o sistema espera até 30 s em vez de receber erro 502. Isso também cobre o "lookup sgo-app" que falha enquanto o contêiner é recriado.

## 4. Imagem do SGO+ achatada — feito (09:27, fora da janela do Financeiro)

**Nova tag base do SGO+: `metrolabs/sgo:achatada-20261119`.** As próximas publicações devem usar `FROM metrolabs/sgo:achatada-20261119`.

**Como foi feita:**
1. `docker create` da imagem `manutencao-geral-20261119`.
2. `docker export | docker import`, que preserva dono, permissões e conteúdo, repondo USER, WORKDIR, EXPOSE, CMD e todos os ENV. O resultado é a imagem intermediária `achatada-20261119-fs`.
3. Um Dockerfile mínimo que repõe o que o `import` não carrega: HEALTHCHECK e o rótulo. Fica em `/opt/metrolabs/build-sgo-achatada-20261119/Dockerfile`.

**Resultado:** **1 camada e 4,03 GB**, contra 136 camadas e 4,61 GB.

**Conferência de igualdade** (`registro/16-*`, `registro/17-*`):
- **Configuração:** USER, ENTRYPOINT, CMD, WORKDIR, ENV, EXPOSE, HEALTHCHECK, rótulos, VOLUME e STOPSIGNAL são **idênticos**.
- **`/app`:** sha256 dos **10 977 arquivos idêntico** (arquivos de lista comparados byte a byte).
- **Sistema de arquivos inteiro:** 49 377 entradas comparadas (caminho, tipo, permissão, dono, grupo, tamanho e alvo de link). Só 6 diretórios diferem no "tamanho do diretório", que é efeito de como o disco aloca o diretório e não muda conteúdo. Os arquivos que o Docker gera em cada contêiner (`/etc/hosts`, `/etc/hostname`, `/etc/resolv.conf`, `/.dockerenv`) ficaram fora da comparação.

**Troca** (script `/opt/metrolabs/manutencao/troca-achatada-20261119.sh`, log em `registro/18-troca-achatada.log`):
- **Backup antes da troca**, em `/opt/metrolabs/backup/sgo-achatada-20261119/`:
  - `compose.antes.yml`;
  - `banco-antes.dump` (186 MB, conferido com `pg_restore --list`);
  - `reverter.sh`.
- **Troca:** só a linha `image:` mudou no compose; depois `docker compose up -d --no-build app`.
- **Reversão automática:** o script voltaria sozinho para a imagem anterior se o app não ficasse saudável em 3 min ou se o GET não desse 200.
- **Resultado:** **saudável em 20 s**; GET local 200 e HTTPS público 200; 0 reinícios.
- **Logs depois da troca:** o app subiu normalmente ("pronto em 3711 ms", ponte dos portões e Tuya conectadas), com **0 linhas de erro**. O Caddy registrou **0 erros** durante a troca: o `lb_try_duration` segurou as requisições.
- **A imagem anterior `manutencao-geral-20261119` foi mantida**, para reverter se preciso.

A primeira tentativa (09:27:06) parou sozinha por um alarme falso: o `pgrep`, que procura publicação em andamento, encontrou o próprio comando digitado, porque o texto dele contém "docker compose up". Não houve nenhuma mudança nessa tentativa. A troca foi refeita a partir de um arquivo de script, onde isso não acontece. A rotina `limpeza.sh` e o script do reboot também rodam de arquivo e não têm esse problema.

**O RH não foi achatado.** As publicações dele dependem da cadeia de tags.

## 5. Atualizações + reboot — AGENDADO para hoje, 19/11, às 22:30

Por ordem do coordenador, o reboot ficou para a noite. **Agendamento:** `systemd-run --on-calendar="2026-11-19 22:30:00"`, unidade `metrolabs-reboot-20261119.timer`, que dispara `/opt/metrolabs/manutencao/reboot-20261119.sh`.

**O que o `reboot-20261119.sh` faz:**
1. Salva a lista dos contêineres em execução em `conteineres-antes-reboot.txt`, com nome, imagem, pasta do compose e serviço.
2. Se houver publicação em andamento, adia 30 min, **até 3 vezes**. Conta como publicação: `/tmp/pub-*` alterado nos últimos 10 min, `docker build` ou `compose up` rodando. Na 4ª vez, desiste sem atualizar e sem reiniciar.
3. Roda `apt-get update` e `DEBIAN_FRONTEND=noninteractive NEEDRESTART_MODE=l apt-get -y -o Dpkg::Options::=--force-confold -o Dpkg::Options::=--force-confdef upgrade`. Com `NEEDRESTART_MODE=l`, o `needrestart` só lista os serviços; quem reinicia é o reboot.
4. Se o `apt` falhar, **não reinicia**, para não subir com pacote pela metade, e registra a falha em `reboot.estado`.
5. Se tudo deu certo, executa `systemctl reboot`.
6. Log: `/opt/metrolabs/manutencao/logs/reboot-20261119.log`.

**Conferência depois do boot** (serviço `metrolabs-pos-boot.service`, habilitado e permanente, roda a cada boot; script `pos-boot.sh`):
1. Espera 3 min.
2. Compara os contêineres com a lista salva. Quem faltar e tiver compose é subido com `docker compose up -d --no-build <serviço>`.
3. Espera até 5 min pelos sistemas saudáveis.
4. Confere SGO+ e RH com HTTP local 200, HTTPS público de sgo e rh, `systemctl --failed`, cron ativo, se o servidor ainda pede reinício, e o disco.
5. Grava o log em `logs/pos-boot_*.log`.
6. **Manda o resumo por e-mail** pelo mesmo caminho da manutenção semanal (tabela `emails_saida`, destinatários de `manutencao.env`).

**Testes a seco** (sem instalar e sem reiniciar):
- `reboot-20261119.sh --ensaio`: salvou a lista (5 contêineres) e simulou o apt. Serão atualizados 20 pacotes: docker-ce 29.9.1 → 29.10.0, containerd, compose-plugin 5.6 → 5.8, glib, apparmor, sqlite, cloud-init, tmux, monarx-agent e outros. O kernel 6.8.0-149 já está instalado e entra no reboot.
- `pos-boot.sh --ensaio`:
  - os 5 de produção estão saudáveis;
  - HTTP 200 e HTTPS sgo/rh 200;
  - nenhum serviço com falha e cron ativo;
  - único alerta: "ainda pede reinício", o esperado antes do reboot.

### Versão anterior desta seção (07:34), mantida para registro: o que não foi feito de manhã

A instrução era terminar o reboot antes das 05:45 e, se não desse, parar e reportar. Às 07:34 o prazo já tinha passado, e de 06:00 a 08:30 o SGO+ não pode cair. Depois das 08:30 é horário de expediente, e um reboot derruba SGO+ e RH por ~2–3 minutos.

Também **não instalei as atualizações sem o reboot**. Os pacotes de segurança pendentes são `libgstreamer1.0-0` e `needrestart`, e o próprio `needrestart` pode reiniciar serviços ao fim do `apt`, inclusive o `docker.service`, o que derrubaria tudo. As outras pendências (kernel 6.8.0-149 e libc6) só valem com o reboot.

**Proposta de janela:** madrugada, entre **03:15 e 05:30**, depois do backup do SGO (02:00, ~15 min) e do RH (02:45, ~1 min) e longe da fotografia das 06:00. Procedimento já preparado:

1. Salvar a lista de contêineres ativos.
2. `NEEDRESTART_MODE=l DEBIAN_FRONTEND=noninteractive apt-get -o Dpkg::Options::=--force-confold upgrade`, para as atualizações de segurança.
3. `reboot`.
4. Depois do boot:
   - comparar a lista de contêineres;
   - conferir saúde com `/opt/metrolabs/manutencao/saude.sh`;
   - conferir HTTPS público, `systemctl --failed` e o cron.

Todos os compose têm `restart: unless-stopped`, então os sistemas voltam sozinhos.

## Estado final (19/11 09:30)

- **Disco:** 67 G usados, **126 G livres (35%)**. Antes da parte 1 eram 8 G livres (96%).
- **Contêineres em execução:**
  - `sgo-app-1` (`metrolabs/sgo:achatada-20261119`), saudável;
  - `sgo-db-1`, saudável;
  - `rh-app-1` (`metrolabs/rh:…-r104`, publicada pelo RH durante a manhã), saudável;
  - `rh-db-1`, saudável;
  - `caddy-caddy-1`, no ar.
- **Acesso:** HTTP local 200 em SGO+ e RH; HTTPS público 200 em sgo, rh e command.
- **Pendências do dono:**
  - criar um acesso próprio do rclone ao Google Drive (o acesso compartilhado atual vai ser desativado);
  - decidir se apaga os restos das pastas de QA de antes de 05/11 (~4,2 GB, só arquivos pequenos);
  - conferir o e-mail pós-reboot de hoje à noite.
