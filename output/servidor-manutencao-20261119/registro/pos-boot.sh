#!/usr/bin/env bash
# Conferência depois de cada boot do servidor (serviço metrolabs-pos-boot, 19/11/2026).
#   Espera 3 min; compara os contêineres em execução com a lista salva antes do reinício
#   (/opt/metrolabs/manutencao/conteineres-antes-reboot.txt, se tiver menos de 2 dias; senão, os 5 de produção);
#   quem faltar e tiver compose é subido com "docker compose up -d --no-build <serviço>";
#   confere saúde (saude.sh), HTTPS público, systemctl --failed, cron e disco; grava log e manda o resumo
#   pelo mesmo caminho do e-mail da manutenção semanal (tabela emails_saida do SGO+).
# Uso: pos-boot.sh   |   pos-boot.sh --ensaio  (sem espera, sem subir nada, sem e-mail)
set -uo pipefail
M=/opt/metrolabs/manutencao; B=/opt/metrolabs/backup
ENSAIO=0; [ "${1:-}" = "--ensaio" ] && ENSAIO=1
LOG="$M/logs/pos-boot_$(date +%F_%H%M)$([ $ENSAIO = 1 ] && echo _ensaio).log"
mkdir -p "$M/logs"
exec > >(tee -a "$LOG") 2>&1
[ $ENSAIO = 0 ] && sleep 180
echo "== Conferência pós-boot $(date '+%d/%m/%Y %H:%M') $([ $ENSAIO = 1 ] && echo '(ENSAIO)') =="
echo "no ar desde: $(uptime -s)  kernel: $(uname -r)"
L="$M/conteineres-antes-reboot.txt"
if [ -f "$L" ] && [ -n "$(find "$L" -mtime -2)" ]; then esperado=$(cat "$L"); fonte="lista salva antes do reinício"
else
  esperado=$(printf '%s\n' "sgo-app-1||/opt/metrolabs/sgo|app" "sgo-db-1||/opt/metrolabs/sgo|db" "rh-app-1||/opt/metrolabs/rh|app" "rh-db-1||/opt/metrolabs/rh|db" "caddy-caddy-1||/opt/metrolabs/caddy|caddy")
  fonte="5 contêineres de produção (sem lista recente)"
fi
problemas=(); subiu=()
echo "esperados ($fonte): $(echo "$esperado" | grep -c .)"
while IFS='|' read -r nome img wd svc; do
  [ -z "$nome" ] && continue
  st=$(docker inspect -f '{{.State.Status}}' "$nome" 2>/dev/null || echo ausente)
  [ "$st" = running ] && continue
  if [ -n "$wd" ] && [ -n "$svc" ] && [ -f "$wd/docker-compose.yml" ]; then
    if [ $ENSAIO = 1 ]; then echo "faltaria subir: $nome ($wd, serviço $svc)"; continue; fi
    echo "subindo $nome: (cd $wd && docker compose up -d --no-build $svc)"
    (cd "$wd" && docker compose up -d --no-build "$svc") && subiu+=("$nome") || problemas+=("$nome não subiu pelo compose")
  else problemas+=("$nome ($st) não voltou e não tem compose (ensaio sem reinício automático?)"); fi
done <<< "$esperado"
# espera os de produção ficarem saudáveis (até 5 min)
for i in $(seq 1 30); do "$M/saude.sh" >/dev/null 2>&1 && break; [ $ENSAIO = 1 ] && break; sleep 10; done
saude=$("$M/saude.sh" 2>&1); rc=$?
echo "$saude"; [ $rc -ne 0 ] && problemas+=("saúde dos sistemas fora do normal (ver acima)")
for h in sgo rh; do
  c=$(curl -s -o /dev/null -m 20 -w '%{http_code}' "https://$h.metrolabs.com.br/"); echo "HTTPS público $h: $c"
  [ "$c" = 200 ] || problemas+=("HTTPS público de $h respondeu $c")
done
f=$(systemctl --failed --no-legend --plain | awk '{print $1}' | tr '\n' ' '); echo "systemctl --failed: ${f:-nenhum}"
[ -n "$f" ] && problemas+=("serviços com falha: $f")
systemctl is-active --quiet cron && echo "cron: ativo" || problemas+=("cron parado")
[ -f /var/run/reboot-required ] && problemas+=("ainda pede reinício: $(cat /var/run/reboot-required.pkgs 2>/dev/null | tr '\n' ' ')")
df -h / | tail -1
echo "em execução agora: $(docker ps -q | wc -l)"
[ ${#subiu[@]} -gt 0 ] && echo "subidos pelo compose: ${subiu[*]}"
if [ ${#problemas[@]} -eq 0 ]; then res="tudo voltou normal"; else res="${#problemas[@]} problema(s)"; printf ' - %s\n' "${problemas[@]}"; fi
echo "RESULTADO: $res"
[ $ENSAIO = 1 ] && exit 0
echo "$(date '+%d/%m %H:%M'): $res. Log: $LOG" > "$M/pos-boot.estado"
. "$B/manutencao.env" 2>/dev/null || true
for para in ${DESTINO:-engenharia@metrolabs.com.br}; do
  python3 - "$para" "Servidor Metrolabs | reinício $(date +%d/%m): $res" "$LOG" <<'PY' | docker exec -i sgo-db-1 psql -U sgo -d sgo -q >/dev/null 2>&1 || echo "falha ao pôr o e-mail na fila"
import json, sys, html
para, assunto, rel = sys.argv[1], sys.argv[2], sys.argv[3]
texto = open(rel, encoding="utf-8").read()
corpo = ('<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;color:#1f2a24;max-width:680px">'
         '<div style="border-bottom:2px solid #2f5d50;padding:0 0 8px;margin:0 0 16px;font-weight:bold;color:#2f5d50">SGO+ Metrolabs</div>'
         '<pre style="font-family:Arial,Helvetica,sans-serif;white-space:pre-wrap;margin:0">' + html.escape(texto) + '</pre></div>')
m = json.dumps({"para": para, "assunto": assunto, "texto": texto, "html": corpo, "nome": "SGO+ Metrolabs"}, ensure_ascii=False)
print("INSERT INTO emails_saida (mensagem) VALUES ($m$" + m + "$m$::jsonb);")
PY
done
