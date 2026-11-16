#!/bin/sh
# Uso: sh rodar-lista.sh <pasta-candidata> teste1 teste2 ...  (placar por arquivo, com os nomes das falhas)
D=$1; shift
for t in "$@"; do
  out=$(FASE=candidato DEST=$D CAPTURAS=output/financeiro-20261116/capturas LOTE3_ANTES=output/financeiro-20261115/lote3-antes timeout 900 node --require ./output/lote-20261111n/fontes.cjs --test --test-reporter=tap tests/$t.test.cjs 2>&1)
  p=$(echo "$out" | grep -m1 "^# pass" | cut -d' ' -f3); f=$(echo "$out" | grep -m1 "^# fail" | cut -d' ' -f3)
  echo "$t pass=$p fail=$f $(echo "$out" | grep -E '^\s*not ok' | sed 's/^ *not ok [0-9]* - //' | head -8 | tr '\n' '|')"
done
