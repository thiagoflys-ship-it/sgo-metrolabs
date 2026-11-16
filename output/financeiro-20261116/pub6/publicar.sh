#!/bin/sh
# Publicação em camada do Painel financeiro (14/11/2026). Roda no servidor, em /tmp/pub-financeiro (camada.tgz + manifesto.txt +
# base-hashes.txt). Confere a base, faz backup (compose + banco), constrói FROM base, confere a imagem, troca, espera saudável
# (senão reverte) e confere GET 200 e erros no log. Uso: sh publicar.sh
set -eu
TAG=financeiro-aprovacao-diretoria-20261116
BASE=metrolabs/sgo:financeiro-onda2-indicadores-20261116
NOVA=metrolabs/sgo:$TAG
SGO=/opt/metrolabs/sgo
BK=/opt/metrolabs/backup/$TAG
DIR=/tmp/pub-financeiro
cd "$DIR"
C=$(docker compose -f $SGO/docker-compose.yml ps -q app)

echo "== 1. base"
grep -q "image: $BASE\$" $SGO/docker-compose.yml || { echo "compose não está na base $BASE"; exit 1; }
docker exec "$C" sh -c "cd /app/legado && sha256sum $(cut -d' ' -f3 base-hashes.txt | tr '\n' ' ')" | sort > base-atual.txt
sort base-hashes.txt > base-esperada.txt
cmp -s base-esperada.txt base-atual.txt || { echo "arquivos da base mudaram no contêiner"; diff base-esperada.txt base-atual.txt; exit 1; }
for f in $(grep NOVO manifesto.txt | cut -d' ' -f2); do docker exec "$C" test ! -e /app/legado/$f || { echo "já existe no contêiner: $f"; exit 1; }; done
echo "base conferida"

echo "== 2. backup"
mkdir -p "$BK"
cp $SGO/docker-compose.yml "$BK/compose.antes.yml"
docker compose -f $SGO/docker-compose.yml exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" -Fc "$POSTGRES_DB"' > "$BK/banco-antes.dump"
test -s "$BK/banco-antes.dump"
ls -l "$BK"

echo "== 3. imagem"
rm -rf ctx && mkdir -p ctx/app/legado && tar -xzf camada.tgz -C ctx/app/legado
chmod 644 ctx/app/legado/* && chown root:root ctx/app/legado/*
printf 'FROM %s\nCOPY app/ /app/\n' "$BASE" > ctx/Dockerfile
docker build --no-cache -q -t "$NOVA" ctx
docker run --rm --entrypoint sh "$NOVA" -c "id -un; ls /app/legado | wc -l; cd /app/legado && sha256sum $(cut -d' ' -f3 manifesto-hashes.txt | tr '\n' ' ')" > imagem.txt
cat imagem.txt | head -3
test "$(sed -n 1p imagem.txt)" = "pwuser" || { echo "usuário da imagem não é pwuser"; exit 1; }
test "$(sed -n 2p imagem.txt)" = "$(cat total-esperado.txt)" || { echo "total de arquivos diferente do esperado"; exit 1; }
sed -n '3,$p' imagem.txt | sort > img-hashes.txt; sort manifesto-hashes.txt > esp-hashes.txt
cmp -s img-hashes.txt esp-hashes.txt || { echo "hashes da imagem diferentes"; diff esp-hashes.txt img-hashes.txt; exit 1; }
echo "imagem conferida"

echo "== 4. troca"
sed -i "s#image: $BASE\$#image: $NOVA#" $SGO/docker-compose.yml
grep -q "image: $NOVA\$" $SGO/docker-compose.yml
INICIO=$(date -u +%Y-%m-%dT%H:%M:%SZ)
docker compose -f $SGO/docker-compose.yml up -d app
C=$(docker compose -f $SGO/docker-compose.yml ps -q app)
OK=0
for i in $(seq 1 60); do
  S=$(docker inspect --format '{{.State.Health.Status}}' "$C" 2>/dev/null || echo x)
  [ "$S" = healthy ] && { OK=1; break; }
  sleep 5
done
if [ $OK != 1 ]; then
  echo "NÃO ficou saudável: revertendo"
  cp "$BK/compose.antes.yml" $SGO/docker-compose.yml
  docker compose -f $SGO/docker-compose.yml up -d app
  exit 1
fi
echo "saudável"

echo "== 5. no ar"
docker exec "$C" node -e "fetch('http://127.0.0.1:8080/').then(r=>console.log('GET /', r.status)).catch(e=>{console.log('GET falhou',e.message);process.exit(1)})"
docker inspect --format '{{.Config.Image}} {{.Image}}' "$C"
sleep 20
echo "erros no log desde a troca: $(docker logs --since "$INICIO" "$C" 2>&1 | grep -ciE 'error|erro ' || true)"
docker logs --since "$INICIO" "$C" 2>&1 | grep -iE 'error|erro ' | head -10 || true
