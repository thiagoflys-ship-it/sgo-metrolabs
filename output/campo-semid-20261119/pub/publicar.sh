#!/bin/sh
# 19/11/2026: equipamento sem série, TAG ou patrimônio pode ser cadastrado e confirmado no app de campo (pedido do dono).
set -eu
TAG=campo-sem-serie-tag-20261119
BASE=metrolabs/sgo:avisos-matheus-20261119
NOVA=metrolabs/sgo:$TAG
SGO=/opt/metrolabs/sgo
BK=/opt/metrolabs/backup/$TAG
cd /tmp/pub-campo
C=$(docker compose -f $SGO/docker-compose.yml ps -q app)
echo "== 1. base"
grep -q "image: $BASE\$" $SGO/docker-compose.yml || { echo "compose não está na base $BASE"; exit 1; }
for f in app.js regras.js; do H=$(docker exec "$C" sha256sum /app/dist/publico/campo/$f | cut -d' ' -f1); grep -q "^$H  $f\$" base.txt || { echo "mudou no contêiner: $f"; exit 1; }; done
echo "base conferida"
echo "== 2. backup"
mkdir -p "$BK"; cp $SGO/docker-compose.yml "$BK/compose.antes.yml"
docker compose -f $SGO/docker-compose.yml exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" -Fc "$POSTGRES_DB"' > "$BK/banco-antes.dump"; test -s "$BK/banco-antes.dump"; ls -l "$BK"
echo "== 3. imagem"
rm -rf ctx && mkdir -p ctx/app/dist/publico/campo && cp app.js regras.js ctx/app/dist/publico/campo/ && chmod 644 ctx/app/dist/publico/campo/*
printf 'FROM %s\nCOPY app/ /app/\n' "$BASE" > ctx/Dockerfile
docker build --no-cache -q -t "$NOVA" ctx
docker run --rm --entrypoint sh "$NOVA" -c "grep -c semIdentificacao /app/dist/publico/campo/app.js; node --check /app/dist/publico/campo/app.js && echo sintaxe-ok"
echo "== 4. troca"
sed -i "s#image: $BASE\$#image: $NOVA#" $SGO/docker-compose.yml; grep -q "image: $NOVA\$" $SGO/docker-compose.yml
INICIO=$(date -u +%Y-%m-%dT%H:%M:%SZ)
docker compose -f $SGO/docker-compose.yml up -d app
C=$(docker compose -f $SGO/docker-compose.yml ps -q app); OK=0
for i in $(seq 1 60); do S=$(docker inspect --format '{{.State.Health.Status}}' "$C" 2>/dev/null || echo x); [ "$S" = healthy ] && { OK=1; break; }; sleep 5; done
if [ $OK != 1 ]; then echo "NÃO ficou saudável: revertendo"; cp "$BK/compose.antes.yml" $SGO/docker-compose.yml; docker compose -f $SGO/docker-compose.yml up -d app; exit 1; fi
echo "saudável"
echo "== 5. no ar"
docker exec "$C" node -e "fetch('http://127.0.0.1:8080/campo/versao').then(r=>r.json()).then(j=>console.log('versao campo', j.versao))"
docker exec "$C" node -e "fetch('http://127.0.0.1:8080/').then(r=>console.log('GET /', r.status))"
sleep 15
echo "erros no log desde a troca: $(docker logs --since "$INICIO" "$C" 2>&1 | grep -ciE 'error|erro ' || true)"
