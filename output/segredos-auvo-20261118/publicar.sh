#!/bin/sh
# 18/11/2026: Auvo fora da tela /_sgo/segredos (Auvo cancelado). Valores gravados ficam no cofre, sem leitura nem apagamento.
set -eu
TAG=segredos-sem-auvo-20261118
BASE=metrolabs/sgo:auvo-retirada-20261118
NOVA=metrolabs/sgo:$TAG
SGO=/opt/metrolabs/sgo
BK=/opt/metrolabs/backup/$TAG
DIR=/tmp/pub-segredos
cd "$DIR"
C=$(docker compose -f $SGO/docker-compose.yml ps -q app)
echo "== 1. base"
grep -q "image: $BASE\$" $SGO/docker-compose.yml || { echo "compose não está na base $BASE"; exit 1; }
for par in dist/servicos/segredos.js:dist_segredos.js src/servicos/segredos.ts:src_segredos.ts; do
  H=$(docker exec "$C" sha256sum /app/${par%%:*} | cut -d' ' -f1); grep -q "^$H  ${par##*:}\$" base.txt || { echo "mudou no contêiner: ${par%%:*}"; exit 1; }
done
echo "base conferida"
echo "== 2. backup"
mkdir -p "$BK"; cp $SGO/docker-compose.yml "$BK/compose.antes.yml"
docker compose -f $SGO/docker-compose.yml exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" -Fc "$POSTGRES_DB"' > "$BK/banco-antes.dump"; test -s "$BK/banco-antes.dump"; ls -l "$BK"
echo "== 3. imagem"
rm -rf ctx && mkdir -p ctx/app/dist/servicos ctx/app/src/servicos && cp segredos.js ctx/app/dist/servicos/ && cp segredos.ts ctx/app/src/servicos/
chmod 644 ctx/app/dist/servicos/segredos.js ctx/app/src/servicos/segredos.ts
printf 'FROM %s\nCOPY app/ /app/\n' "$BASE" > ctx/Dockerfile
docker build --no-cache -q -t "$NOVA" ctx
docker run --rm --entrypoint sh "$NOVA" -c 'id -un; node --check /app/dist/servicos/segredos.js && echo sintaxe-ok; grep -ci auvo /app/dist/servicos/segredos.js /app/src/servicos/segredos.ts || true; ls /app/legado | wc -l'
echo "== 4. troca"
sed -i "s#image: $BASE\$#image: $NOVA#" $SGO/docker-compose.yml; grep -q "image: $NOVA\$" $SGO/docker-compose.yml
INICIO=$(date -u +%Y-%m-%dT%H:%M:%SZ)
docker compose -f $SGO/docker-compose.yml up -d app
C=$(docker compose -f $SGO/docker-compose.yml ps -q app); OK=0
for i in $(seq 1 60); do S=$(docker inspect --format '{{.State.Health.Status}}' "$C" 2>/dev/null || echo x); [ "$S" = healthy ] && { OK=1; break; }; sleep 5; done
if [ $OK != 1 ]; then echo "NÃO ficou saudável: revertendo"; cp "$BK/compose.antes.yml" $SGO/docker-compose.yml; docker compose -f $SGO/docker-compose.yml up -d app; exit 1; fi
echo "saudável"
echo "== 5. no ar"
docker exec "$C" node -e "fetch('http://127.0.0.1:8080/').then(r=>console.log('GET /', r.status)).catch(e=>{console.log('GET falhou',e.message);process.exit(1)})"
docker inspect --format '{{.Config.Image}} {{.Image}}' "$C"
sleep 20
echo "erros no log desde a troca: $(docker logs --since "$INICIO" "$C" 2>&1 | grep -ciE 'error|erro ' || true)"
docker logs --since "$INICIO" "$C" 2>&1 | grep -iE 'error|erro ' | head -10 || true
