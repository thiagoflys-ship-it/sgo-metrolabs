#!/usr/bin/env bash
# Atualizações + reinício do servidor (19/11/2026 22:30, autorizado pelo dono). Disparo único via systemd-run.
#   1. salva a lista dos contêineres em execução (o pos-boot.sh compara com ela depois do boot);
#   2. se houver publicação em andamento (/tmp/pub-* mexido nos últimos 10 min, docker build ou compose up),
#      adia 30 min, até 3 vezes; na 4ª, desiste sem reiniciar;
#   3. apt-get update + upgrade não interativo, mantendo as configurações locais (--force-confold);
#      se o apt falhar, NÃO reinicia (evita subir com pacote pela metade) e registra;
#   4. reinicia. O serviço metrolabs-pos-boot confere tudo 3 min depois do boot e manda o resumo por e-mail.
# Uso: reboot-20261119.sh [tentativa]   |   reboot-20261119.sh --ensaio  (simula o apt e não reinicia)
set -uo pipefail
M=/opt/metrolabs/manutencao
LOG="$M/logs/reboot-20261119.log"
mkdir -p "$M/logs"
exec >> "$LOG" 2>&1
ENSAIO=0; T=${1:-0}; [ "$T" = "--ensaio" ] && { ENSAIO=1; T=0; }
echo; echo "== $(date '+%d/%m/%Y %H:%M:%S') tentativa $T $([ $ENSAIO = 1 ] && echo '(ENSAIO: apt simulado, sem reinício)') =="

ocupado=""
[ -n "$(find /tmp -maxdepth 1 -name 'pub-*' -mmin -10 2>/dev/null | head -1)" ] && ocupado="publicação em andamento (/tmp/pub-* mexido nos últimos 10 min)"
pgrep -f "docker (build|buildx build|compose .*up)" >/dev/null && ocupado="${ocupado:+$ocupado; }docker build/compose up em execução"
if [ -n "$ocupado" ]; then
  if [ $ENSAIO = 1 ]; then echo "ocupado agora: $ocupado (no disparo real adiaria 30 min)"
  elif [ "$T" -lt 3 ]; then
    n=$((T + 1)); echo "ADIADO 30 min ($n/3): $ocupado"
    systemd-run --quiet --on-active=30min --unit="metrolabs-reboot-20261119-adiado$n" "$M/reboot-20261119.sh" "$n"
    exit 0
  else
    echo "DESISTIU: ainda ocupado depois de 3 adiamentos ($ocupado). Nada foi atualizado nem reiniciado."
    echo "desistiu $(date '+%d/%m %H:%M'): $ocupado" > "$M/reboot.estado"; exit 1
  fi
fi

docker ps --format '{{.Names}}|{{.Image}}|{{.Label "com.docker.compose.project.working_dir"}}|{{.Label "com.docker.compose.service"}}' | sort > "$M/conteineres-antes-reboot.txt.novo"
[ $ENSAIO = 0 ] && mv "$M/conteineres-antes-reboot.txt.novo" "$M/conteineres-antes-reboot.txt"
echo "contêineres em execução salvos: $(wc -l < "$M/conteineres-antes-reboot.txt.novo" 2>/dev/null || wc -l < "$M/conteineres-antes-reboot.txt")"
rm -f "$M/conteineres-antes-reboot.txt.novo"
df -h / /boot 2>/dev/null | sed 's/^/  /'

export DEBIAN_FRONTEND=noninteractive NEEDRESTART_MODE=l   # needrestart só lista; quem reinicia é o reboot
if [ $ENSAIO = 1 ]; then
  apt-get update -qq && apt-get -s -o Dpkg::Options::=--force-confold upgrade | grep -E '^Inst ' | sed 's/^/  simulado: /'
  echo "ENSAIO concluído: nada instalado, sem reinício."; exit 0
fi
if apt-get update -q && apt-get -y -q -o Dpkg::Options::=--force-confold -o Dpkg::Options::=--force-confdef upgrade; then
  echo "apt OK. Pacotes pedindo reinício: $(cat /var/run/reboot-required.pkgs 2>/dev/null | tr '\n' ' ')"
else
  echo "FALHA no apt: NÃO vou reiniciar. Conferir à mão (dpkg --configure -a)."
  echo "falhou-apt $(date '+%d/%m %H:%M')" > "$M/reboot.estado"; exit 1
fi
echo "reiniciando $(date '+%d/%m %H:%M:%S')" | tee "$M/reboot.estado"
sync; systemctl reboot
