#!/bin/sh
# 19/11/2026 (Financeiro v2, etapa a): chaves novas do Financeiro em /_sgo/segredos (grupos, campo de várias linhas para PEM e arquivo .pfx
# em base64) e o padrão de nomes cifrados no cofre (CHAVE_PRIVADA, _PFX, CODIGO_ACESSO, CONSUMER_KEY). Só troca 4 arquivos do servidor Node;
# não lê nem apaga valor nenhum do cofre. Base = a imagem que estiver no compose na hora (conferida pelo hash dos 4 arquivos).
# Uso no servidor: copie esta pasta para /tmp/pub-segredos-fin e rode: sh /tmp/pub-segredos-fin/publicar.sh
set -eu
TAG=segredos-financeiro-v2-20261119
SGO=/opt/metrolabs/sgo
BK=/opt/metrolabs/backup/$TAG
DIR=/tmp/pub-segredos-fin
cd "$DIR"
BASE=$(grep -E '^\s*image: metrolabs/sgo:' $SGO/docker-compose.yml | head -1 | sed 's/.*image: //')
NOVA=metrolabs/sgo:$TAG
C=$(docker compose -f $SGO/docker-compose.yml ps -q app)
echo "== 1. base: $BASE"
for par in dist/servicos/segredos.js:dist_segredos.js src/servicos/segredos.ts:src_segredos.ts dist/servicos/propSegredas.js:dist_propSegredas.js src/servicos/propSegredas.ts:src_propSegredas.ts; do
  H=$(docker exec "$C" sha256sum /app/${par%%:*} | cut -d' ' -f1); grep -q "^$H  ${par##*:}\$" base.txt || { echo "mudou no contêiner desde 19/11: ${par%%:*} (refaça o patch sobre a versão atual)"; exit 1; }
done
echo "base conferida"
echo "== 2. backup"
mkdir -p "$BK"; cp $SGO/docker-compose.yml "$BK/compose.antes.yml"
docker compose -f $SGO/docker-compose.yml exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" -Fc "$POSTGRES_DB"' > "$BK/banco-antes.dump"; test -s "$BK/banco-antes.dump"; ls -l "$BK"
echo "== 3. imagem"
rm -rf ctx && mkdir -p ctx/app/dist/servicos ctx/app/src/servicos
cp novo/segredos.js novo/propSegredas.js ctx/app/dist/servicos/ && cp novo/segredos.ts novo/propSegredas.ts ctx/app/src/servicos/
chmod 644 ctx/app/dist/servicos/* ctx/app/src/servicos/*
printf 'FROM %s\nCOPY app/ /app/\n' "$BASE" > ctx/Dockerfile
docker build --no-cache -q -t "$NOVA" ctx
docker run --rm --entrypoint sh "$NOVA" -c 'node --check /app/dist/servicos/segredos.js && node --check /app/dist/servicos/propSegredas.js && echo sintaxe-ok; grep -c "SICREDI_MATRIZ_PIX_CHAVE_PRIVADA" /app/dist/servicos/segredos.js; grep -c "CHAVE_PRIVADA|_PFX" /app/dist/servicos/propSegredas.js; ls /app/legado | wc -l'
echo "== 4. troca"
sed -i "s#image: $BASE\$#image: $NOVA#" $SGO/docker-compose.yml; grep -q "image: $NOVA\$" $SGO/docker-compose.yml
INICIO=$(date -u +%Y-%m-%dT%H:%M:%SZ)
docker compose -f $SGO/docker-compose.yml up -d app
C=$(docker compose -f $SGO/docker-compose.yml ps -q app); OK=0
for i in $(seq 1 60); do S=$(docker inspect --format '{{.State.Health.Status}}' "$C" 2>/dev/null || echo x); [ "$S" = healthy ] && { OK=1; break; }; sleep 5; done
if [ $OK != 1 ]; then echo "NÃO ficou saudável: revertendo"; cp "$BK/compose.antes.yml" $SGO/docker-compose.yml; docker compose -f $SGO/docker-compose.yml up -d app; exit 1; fi
echo "saudável"
echo "== 5. no ar"
docker exec "$C" node -e "fetch('http://127.0.0.1:8080/_sgo/segredos').then(r=>r.text()).then(t=>console.log('GET /_sgo/segredos', /Chaves e senhas/.test(t)?'ok':'FALHOU')).catch(e=>{console.log('GET falhou',e.message);process.exit(1)})"
docker inspect --format '{{.Config.Image}} {{.Image}}' "$C"
sleep 20
echo "erros no log desde a troca: $(docker logs --since "$INICIO" "$C" 2>&1 | grep -ciE 'error|erro ' || true)"
docker logs --since "$INICIO" "$C" 2>&1 | grep -iE 'error|erro ' | head -10 || true
echo "Reverter: cp $BK/compose.antes.yml $SGO/docker-compose.yml && docker compose -f $SGO/docker-compose.yml up -d app"
