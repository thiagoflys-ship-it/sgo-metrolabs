#!/usr/bin/env bash
# Limpeza semanal conservadora do servidor Metrolabs (cron: domingo 03:30, /etc/cron.d/metrolabs_limpeza).
# Criada em 19/11/2026 a pedido do dono ("limpar o que não tem por que existir").
#
# O que faz (e só isto):
#   1. Cache de build do Docker: apaga tudo (é refeito na próxima publicação).
#   2. Imagens metrolabs/*: mantém, por repositório, as 6 mais recentes (a atual + 5 para reverter),
#      todas as que algum contêiner usa (ativo ou parado) e as citadas em FROM de Dockerfile em /opt/metrolabs.
#      Imagens de base (postgres, caddy, node...) nunca são tocadas. Remove sem -f: se o Docker recusar, fica.
#   3. Backups de publicação em /opt/metrolabs/backup e /opt/metrolabs/sgo/backups:
#      mantém TUDO dos últimos 7 dias e os 10 mais recentes de cada sistema (sgo, rh);
#      de 7 a 60 dias, mantém o mais recente de cada semana por sistema;
#      dos demais, apaga só os arquivos grandes (> 1 MB: dumps, .tar, .tgz) e guarda os arquivos pequenos
#      (compose.antes.yml, reverter.sh, json). Não mexe em backup/banco, backup/rh e backup/logs
#      (têm rotina própria: backup.sh e rh/backup.sh).
#   4. /tmp: apaga o que tem mais de 2 dias (não toca em arquivos de sistema nem do dia).
# NUNCA: remove volume, contêiner em execução, banco, cofre, dados dos sistemas, nem reinicia nada.
#
# Uso: limpeza.sh            -> aplica
#      limpeza.sh --ensaio   -> só mostra o que faria
set -uo pipefail
umask 077
ENSAIO=0; [ "${1:-}" = "--ensaio" ] && ENSAIO=1
M=/opt/metrolabs/manutencao
mkdir -p "$M/logs"
LOG="$M/logs/limpeza_$(date +%F_%H%M)$([ $ENSAIO = 1 ] && echo _ensaio).log"
exec > >(tee -a "$LOG") 2>&1
exec 9>"$M/.limpeza.lock"; flock -n 9 || { echo "outra limpeza em andamento"; exit 75; }

usado() { df --output=used -B1M / | tail -1 | tr -dc 0-9; }
INI=$(usado)
echo "== Limpeza $(date '+%d/%m/%Y %H:%M') $([ $ENSAIO = 1 ] && echo '(ENSAIO, nada é apagado)') =="
df -h / | tail -1

# 0. só segue se os sistemas estiverem no ar (não limpa no meio de uma pane ou publicação)
if ! "$M/saude.sh" >/dev/null 2>&1; then
  echo "ATENÇÃO: algum sistema não está saudável agora; limpeza adiada."; "$M/saude.sh"
  echo "adiada: sistemas fora do normal em $(date '+%d/%m %H:%M')" > "$M/ultima_limpeza.txt"; exit 1
fi
if pgrep -f "docker (build|buildx build|compose .*up)" >/dev/null; then
  echo "Há publicação em andamento (docker build/compose up); limpeza adiada."
  echo "adiada: publicação em andamento em $(date '+%d/%m %H:%M')" > "$M/ultima_limpeza.txt"; exit 1
fi

# 1. cache de build
echo; echo "-- 1. cache de build"
if [ $ENSAIO = 1 ]; then docker system df | grep -i "build cache"
else docker builder prune -a -f 2>&1 | tail -1; fi

# 2. imagens
echo; echo "-- 2. imagens metrolabs/* fora da retenção (6 mais recentes por repositório)"
T=$(mktemp -d)
docker images --no-trunc --format '{{.Repository}}|{{.Tag}}|{{.ID}}|{{.CreatedAt}}' > "$T/img"
docker ps -a -q | xargs -r docker inspect -f '{{.Image}}' | sort -u > "$T/uso"
grep -hiE '^FROM ' /opt/metrolabs/*/Dockerfile /opt/metrolabs/*/*/Dockerfile 2>/dev/null | awk '{print $2}' | sort -u > "$T/from"
{
  for r in $(cut -d'|' -f1 "$T/img" | grep '^metrolabs/' | sort -u); do
    grep "^$r|" "$T/img" | sort -t'|' -k4 -r | awk -F'|' '!s[$3]++' | head -6 | cut -d'|' -f3
  done
  cat "$T/uso"
  while read -r f; do awk -F'|' -v f="$f" '($1":"$2)==f {print $3}' "$T/img"; done < "$T/from"
} | sort -u > "$T/manter"
awk -F'|' 'NR==FNR{k[$1]=1;next} $1 ~ /^metrolabs\// && $2 != "<none>" && !($3 in k) {print $1":"$2}' "$T/manter" "$T/img" > "$T/remover"
echo "imagens a remover: $(wc -l < "$T/remover")"
sed 's/^/  /' "$T/remover"
if [ $ENSAIO = 0 ] && [ -s "$T/remover" ]; then
  xargs -n 40 docker rmi < "$T/remover" 2>&1 | grep -v -E '^(Untagged|Deleted):' || true
  docker image prune -f >/dev/null 2>&1
fi

# 3. backups de publicação
echo; echo "-- 3. backups de publicação (7 dias inteiros; 10 mais recentes por sistema; 1 por semana até 60 dias)"
python3 - "$ENSAIO" <<'PY'
import os, sys, time, datetime, shutil
ensaio = sys.argv[1] == "1"
RAIZES = ["/opt/metrolabs/backup", "/opt/metrolabs/sgo/backups"]
FIXOS = {"banco", "rh", "logs"}          # têm rotina própria
GRANDE = 1024 * 1024                      # > 1 MB = dump/tar; o resto (texto) fica
agora = time.time(); D7 = agora - 7 * 86400; D60 = agora - 60 * 86400
itens = []
for raiz in RAIZES:
    if not os.path.isdir(raiz): continue
    for n in os.listdir(raiz):
        p = os.path.join(raiz, n)
        if os.path.islink(p): continue
        if os.path.isdir(p):
            if raiz == RAIZES[0] and n in FIXOS: continue
        elif not (n.endswith((".dump", ".sql.gz", ".sql")) and os.path.getsize(p) > GRANDE):
            continue
        sist = "rh" if (n.startswith("rh") or n.endswith("-rh")) else "sgo"
        itens.append((os.path.getmtime(p), p, sist))
manter = set()
for sist in ("sgo", "rh"):
    lst = sorted([i for i in itens if i[2] == sist], reverse=True)
    for i in lst[:10]: manter.add(i[1])
    semanas = {}
    for i in lst:
        if i[0] >= D7: manter.add(i[1]); continue
        if i[0] >= D60:
            s = datetime.date.fromtimestamp(i[0]).isocalendar()[:2]
            if s not in semanas: semanas[s] = i[1]; manter.add(i[1])
total = 0; n_itens = 0
for m, p, sist in sorted(itens):
    if p in manter: continue
    alvo = []
    if os.path.isdir(p):
        for r, ds, fs in os.walk(p):
            for f in fs:
                fp = os.path.join(r, f)
                if not os.path.islink(fp) and os.path.getsize(fp) > GRANDE: alvo.append(fp)
    else:
        alvo.append(p)
    if not alvo: continue
    tam = sum(os.path.getsize(a) for a in alvo); total += tam; n_itens += 1
    print("  %s  %-3s  %7.1f MB  %s" % (datetime.datetime.fromtimestamp(m).strftime("%d/%m/%Y"), sist, tam / 1048576, p))
    for a in alvo:
        print("      - " + a[len(p):] if a != p else "      - (arquivo inteiro)")
        if not ensaio: os.remove(a)
print("backups: %d item(ns) aliviados, %.1f GB %s" % (n_itens, total / 1073741824, "a liberar" if ensaio else "liberados"))
PY

# 4. /tmp
echo; echo "-- 4. /tmp com mais de 2 dias"
find /tmp -mindepth 1 -maxdepth 1 -mtime +2 \
  ! -name 'systemd-private-*' ! -name '.*-unix' ! -name 'snap-private-tmp' ! -name 'tmux-*' ! -name '.X*' \
  -printf '  %TY-%Tm-%Td  %p\n' | sort
[ $ENSAIO = 0 ] && find /tmp -mindepth 1 -maxdepth 1 -mtime +2 \
  ! -name 'systemd-private-*' ! -name '.*-unix' ! -name 'snap-private-tmp' ! -name 'tmux-*' ! -name '.X*' \
  -exec rm -rf -- {} +

rm -rf "$T"
FIM=$(usado)
echo; df -h / | tail -1
"$M/saude.sh" | sed 's/^/  /'
res="$(date '+%d/%m %H:%M'): $(( (INI - FIM) / 1024 )) GB liberados; disco em $(df --output=pcent / | tail -1 | tr -d ' ') ($(df -h --output=avail / | tail -1 | tr -d ' ') livres). Detalhe: $LOG"
[ $ENSAIO = 0 ] && echo "$res" > "$M/ultima_limpeza.txt"
echo "$res"
find "$M/logs" -name 'limpeza_*.log' -mtime +180 -delete
