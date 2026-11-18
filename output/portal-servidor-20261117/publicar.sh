#!/bin/sh
# 17/11/2026: portão da sessão CLIENTE no /api/run (servidor + sistemas, js e ts). Mesma rotina das camadas do legado.
set -eu
TAG=portal-cliente-portao-20261117
BASE=metrolabs/sgo:registrador-novo-certificado-20261117
NOVA=metrolabs/sgo:$TAG
SGO=/opt/metrolabs/sgo
BK=/opt/metrolabs/backup/$TAG
DIR=/tmp/pub-portao
cd "$DIR"
C=$(docker compose -f $SGO/docker-compose.yml ps -q app)
echo "== 1. base"
grep -q "image: $BASE\$" $SGO/docker-compose.yml || { echo "compose não está na base $BASE"; exit 1; }
for par in dist/servidor.js:dist_servidor.js src/servidor.ts:src_servidor.ts dist/sistemas.js:dist_sistemas.js src/sistemas.ts:src_sistemas.ts; do
  H=$(docker exec "$C" sha256sum /app/${par%%:*} | cut -d' ' -f1); grep -q "^$H  ${par##*:}\$" base.txt || { echo "mudou no contêiner: ${par%%:*}"; exit 1; }
done
echo "base conferida"
echo "== 2. backup"
mkdir -p "$BK"; cp $SGO/docker-compose.yml "$BK/compose.antes.yml"
docker compose -f $SGO/docker-compose.yml exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" -Fc "$POSTGRES_DB"' > "$BK/banco-antes.dump"; test -s "$BK/banco-antes.dump"; ls -l "$BK"
echo "== 3. imagem"
rm -rf ctx && mkdir -p ctx/app/dist ctx/app/src && cp servidor.js sistemas.js ctx/app/dist/ && cp servidor.ts sistemas.ts ctx/app/src/
chmod 644 ctx/app/dist/*.js ctx/app/src/*.ts
printf 'FROM %s\nCOPY app/ /app/\n' "$BASE" > ctx/Dockerfile
docker build --no-cache -q -t "$NOVA" ctx
docker run --rm --entrypoint sh "$NOVA" -c "id -un; node --check /app/dist/servidor.js && echo sintaxe-ok; node --check /app/dist/sistemas.js && grep -c portaoCliente /app/dist/servidor.js /app/src/servidor.ts; grep -c PORTAO_CLIENTE_FN /app/dist/sistemas.js; ls /app/legado | wc -l"
docker run --rm --entrypoint sh -w /app "$NOVA" -c "npx --no-install tsc --noEmit -p . && echo tsc-ok || echo tsc-FALHOU"
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
