#!/usr/bin/env bash
set -u
R=/opt/metrolabs/manutencao/registro-20261119; L=$R/18-troca-achatada.log; exec > >(tee -a $L) 2>&1; date
[ -n "$(find /tmp -maxdepth 1 -name "pub-*" -mmin -10)" ] && { echo "publicação em andamento, abortado"; exit 1; }
pgrep -f "docker (build|buildx build|compose .*up)" && { echo "build em andamento, abortado"; exit 1; }
B=/opt/metrolabs/backup/sgo-achatada-20261119; mkdir -p $B; chmod 750 $B; cd /opt/metrolabs/sgo
cp -p docker-compose.yml $B/compose.antes.yml
docker exec sgo-db-1 pg_dump -U sgo -d sgo -Fc > $B/banco-antes.dump.parcial && mv $B/banco-antes.dump.parcial $B/banco-antes.dump
set -o pipefail
docker exec -i sgo-db-1 pg_restore --list < $B/banco-antes.dump | grep "TABLE DATA public linhas" >/dev/null && echo "dump ok $(du -h $B/banco-antes.dump | cut -f1)" || { echo "dump falhou, abortado"; exit 1; }
printf "%s\n" "cd /opt/metrolabs/sgo && cp -p $B/compose.antes.yml docker-compose.yml && docker compose up -d --no-build app" > $B/reverter.sh; chmod 700 $B/reverter.sh
[ "$(grep -c "image: metrolabs/sgo:manutencao-geral-20261119" docker-compose.yml)" = 1 ] || { echo "linha da imagem não encontrada, abortado"; exit 1; }
sed -i "s#image: metrolabs/sgo:manutencao-geral-20261119#image: metrolabs/sgo:achatada-20261119#" docker-compose.yml; diff $B/compose.antes.yml docker-compose.yml
echo "troca $(date +%T)"; docker compose up -d --no-build app 2>&1 | tail -3
ok=0; for i in $(seq 1 36); do s=$(docker inspect -f "{{.State.Health.Status}}" sgo-app-1 2>/dev/null); [ "$s" = healthy ] && { ok=1; break; }; sleep 5; done
echo "estado: $s após $((i*5)) s ($(date +%T))"
if [ $ok = 1 ]; then
  g=$(docker exec sgo-app-1 node -e "fetch(\"http://127.0.0.1:8080/\").then(r=>console.log(r.status)).catch(()=>console.log(0))")
  h=$(curl -s -o /dev/null -m 20 -w "%{http_code}" https://sgo.metrolabs.com.br/); echo "GET local $g, HTTPS público $h"
  [ "$g" = 200 ] && [ "$h" = 200 ] || ok=0
fi
if [ $ok = 0 ]; then echo "REVERTENDO"; sh $B/reverter.sh; sleep 60; docker inspect -f "{{.Config.Image}} {{.State.Health.Status}}" sgo-app-1; exit 2; fi
docker inspect -f "{{.Config.Image}} {{.State.Status}} {{.State.Health.Status}} reinicios={{.RestartCount}}" sgo-app-1
