#!/usr/bin/env bash
# Conferência rápida de saúde dos sistemas de produção (usada pela limpeza e à mão).
ok=0
for c in sgo-app-1 sgo-db-1 rh-app-1 rh-db-1 caddy-caddy-1; do
  st=$(docker inspect -f "{{.State.Status}} {{if .State.Health}}{{.State.Health.Status}}{{end}} reinicios={{.RestartCount}}" "$c" 2>/dev/null || echo ausente)
  echo "$c: $st"; case "$st" in running\ healthy*|running\ \ *) ;; *) ok=1 ;; esac
done
for c in sgo-app-1 rh-app-1; do
  s=$(docker exec "$c" node -e "fetch(\"http://127.0.0.1:\"+(process.env.PORTA||process.env.PORT||8080)+\"/\").then(r=>console.log(r.status)).catch(e=>console.log(\"erro\"))" 2>/dev/null)
  echo "$c HTTP local: $s"; case "$s" in 2*|3*) ;; *) ok=1 ;; esac
done
h=$(curl -s -o /dev/null -w "%{http_code}" --resolve sgo.metrolabs.com.br:443:127.0.0.1 https://sgo.metrolabs.com.br/ 2>/dev/null); echo "HTTPS via Caddy (sgo): $h"
df -h / | tail -1
exit $ok
