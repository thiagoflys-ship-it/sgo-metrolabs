#!/bin/sh
# 19/11/2026 (pedido do dono, técnico em campo): vários equipamentos na MESMA O.S. — legado (aba ATEC_OS_EQUIPAMENTOS, evento EQUIPAMENTO,
# relatório com uma seção por equipamento, histórico/QR de cada equipamento, ficha da O.S.) e o app de campo ("Equipamentos atendidos
# nesta visita", "+ Acrescentar equipamento"). Roda no servidor, em /tmp/pub-veq (camada.tgz, campo.tgz, *.txt). Confere a base (legado e app), faz backup (compose + banco), constrói
# FROM base, confere a imagem, troca, espera saudável (senão reverte), confere GET 200, a versão nova do app e erros no log.
# Uso: sh publicar.sh   (BASE = imagem em produção; confira antes com: grep image: /opt/metrolabs/sgo/docker-compose.yml)
set -eu
TAG=campo-varios-equip-20261119
BASE=${BASE:-metrolabs/sgo:contratos-aditivo-e1-20261119}
NOVA=metrolabs/sgo:$TAG
SGO=/opt/metrolabs/sgo
BK=/opt/metrolabs/backup/$TAG
DIR=/tmp/pub-veq
VERSAO_APP=f78affc17e5d
cd "$DIR"
C=$(docker compose -f $SGO/docker-compose.yml ps -q app)

echo "== 1. base"
grep -q "image: $BASE\$" $SGO/docker-compose.yml || { echo "compose não está na base $BASE"; exit 1; }
docker exec "$C" sh -c "cd /app/legado && sha256sum $(cut -d' ' -f3 base-hashes.txt | tr '\n' ' ')" | sed 's/ \*/  /' | sort > base-atual.txt
sort base-hashes.txt > base-esperada.txt
cmp -s base-esperada.txt base-atual.txt || { echo "arquivos do legado mudaram no contêiner"; diff base-esperada.txt base-atual.txt; exit 1; }
test "$(docker exec "$C" sh -c 'ls /app/legado | wc -l')" = "$(cat total-base.txt)" || { echo "total de arquivos do legado diferente da base"; exit 1; }
for f in $(grep NOVO manifesto.txt | cut -d' ' -f2); do docker exec "$C" test ! -e /app/legado/$f || { echo "já existe no contêiner: $f"; exit 1; }; done
# base do app (E1 publicada, versão 94b9805bcd21): /app/dist = campo-base.txt; /app/src = campo-base-src.txt (os dois = e1/campo/novo)
for par in dist:campo-base.txt src:campo-base-src.txt; do
  d=${par%%:*}; b=${par##*:}
  docker exec "$C" sh -c "cd /app/$d/publico/campo && sha256sum *" | sed 's/ \*/  /' | sort > campo-atual-$d.txt
  sort $b | cmp -s - campo-atual-$d.txt || { echo "app do campo em produção (/app/$d) diferente da base ($b)"; sort $b | diff - campo-atual-$d.txt; exit 1; }
done
echo "base conferida (legado e app do campo)"

echo "== 2. backup"
mkdir -p "$BK"
cp $SGO/docker-compose.yml "$BK/compose.antes.yml"
docker compose -f $SGO/docker-compose.yml exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" -Fc "$POSTGRES_DB"' > "$BK/banco-antes.dump"
test -s "$BK/banco-antes.dump"
ls -l "$BK"

echo "== 3. imagem"
rm -rf ctx && mkdir -p ctx/app/legado && tar -xzf camada.tgz -C ctx/app/legado
chmod 644 ctx/app/legado/* && chown root:root ctx/app/legado/*
tar -xzf campo.tgz -C ctx && chmod 644 ctx/app/dist/publico/campo/* ctx/app/src/publico/campo/* && chown -R root:root ctx/app/dist ctx/app/src
printf 'FROM %s\nCOPY app/ /app/\n' "$BASE" > ctx/Dockerfile
docker build --no-cache -q -t "$NOVA" ctx
docker run --rm --entrypoint sh "$NOVA" -c "id -un; ls /app/legado | wc -l; cd /app/legado && sha256sum $(cut -d' ' -f3 manifesto-hashes.txt | tr '\n' ' ')" > imagem.txt
head -3 imagem.txt
test "$(sed -n 1p imagem.txt)" = "pwuser" || { echo "usuário da imagem não é pwuser"; exit 1; }
test "$(sed -n 2p imagem.txt)" = "$(cat total-esperado.txt)" || { echo "total de arquivos diferente do esperado"; exit 1; }
sed -n '3,$p' imagem.txt | sed 's/ \*/  /' | sort > img-hashes.txt; sort manifesto-hashes.txt > esp-hashes.txt
cmp -s img-hashes.txt esp-hashes.txt || { echo "hashes do legado na imagem diferentes"; diff esp-hashes.txt img-hashes.txt; exit 1; }
for d in dist src; do
  docker run --rm --entrypoint sh "$NOVA" -c "cd /app/$d/publico/campo && sha256sum *" | sed 's/ \*/  /' | sort > campo-img-$d.txt
  sort campo-esperado.txt | cmp -s - campo-img-$d.txt || { echo "app do campo na imagem (/app/$d) diferente do esperado"; sort campo-esperado.txt | diff - campo-img-$d.txt; exit 1; }
done
JS=$(grep '\.js$' manifesto.txt | cut -d' ' -f2 | tr '\n' ' ')
docker run --rm --entrypoint sh "$NOVA" -c "cd /app/legado && for f in $JS; do node --check \$f || exit 1; done; cd /app/dist/publico/campo && for f in regras.js fila.js banco.js sw.js; do node --check \$f || exit 1; done; node --input-type=module --check < app.js || exit 1; echo sintaxe-ok"
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
docker exec "$C" node -e "fetch('http://127.0.0.1:8080/campo/versao',{headers:{host:'sgo.metrolabs.com.br'}}).then(r=>r.json()).then(j=>{console.log('versão do app', j.versao); if (j.versao !== '$VERSAO_APP') { console.log('VERSÃO DIFERENTE da esperada $VERSAO_APP'); process.exit(1); }})"
docker inspect --format '{{.Config.Image}} {{.Image}}' "$C"
sleep 20
echo "erros no log desde a troca: $(docker logs --since "$INICIO" "$C" 2>&1 | grep -ciE 'error|erro ' || true)"
docker logs --since "$INICIO" "$C" 2>&1 | grep -iE 'error|erro ' | head -10 || true
# reverter: cp $BK/compose.antes.yml $SGO/docker-compose.yml && docker compose -f $SGO/docker-compose.yml up -d app
