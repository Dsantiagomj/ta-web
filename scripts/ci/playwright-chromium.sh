#!/bin/sh
# Chromium de Playwright y sus dependencias del sistema, en CI (ci.yml y smoke.yml).
#
# El navegador baja del CDN de Playwright. Las dependencias del sistema vienen de los
# mirrors de Ubuntu con apt, pero la imagen del runner ya trae Google Chrome y casi todas
# sus librerías: si Chromium arranca, apt no hace falta. El 2026-11-11 el DNS de
# archive.ubuntu.com falló durante horas y apt se quedaba colgado: por eso apt va al final,
# solo si Chromium no arranca, y cada intento tiene un tiempo máximo.
#
# Uso: scripts/ci/playwright-chromium.sh [--cached]
#   --cached  el navegador ya está en la caché (~/.cache/ms-playwright): no se descarga.
set -u

# Cada intento, como mucho 5 minutos; entre intentos, 15 y 30 s.
retry() {
  label=$1
  shift
  for wait in 15 30 0; do
    timeout 300 "$@" && return 0
    [ "$wait" -eq 0 ] && break
    echo "::warning::$label falló; reintento en ${wait} s."
    sleep "$wait"
  done
  return 1
}

launches() {
  timeout 60 node -e "require('@playwright/test').chromium.launch().then((b) => b.close())"
}

if [ "${1:-}" != "--cached" ]; then
  retry "La descarga de Chromium" pnpm exec playwright install chromium || exit 1
fi

if launches; then
  echo "Chromium arranca con las librerías del runner; no hace falta apt."
  exit 0
fi

echo "Chromium no arranca: instalo sus dependencias con apt."
retry "La instalación de las dependencias de Chromium (apt)" \
  pnpm exec playwright install-deps chromium || exit 1
if launches; then
  exit 0
fi
echo "::error::Chromium no arranca ni con las dependencias de apt."
exit 1
