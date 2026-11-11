#!/bin/sh
# Chromium de Playwright y sus dependencias del sistema, en CI (ci.yml y smoke.yml).
#
# El navegador baja del CDN de Playwright; las dependencias, de los mirrors de Ubuntu con
# apt. Si apt no llega a los mirrors (pasó el 2026-11-11: el DNS de archive.ubuntu.com
# fallaba durante horas), se reintenta y, si sigue sin llegar, basta con que Chromium
# arranque: la imagen del runner trae Google Chrome y casi todas sus librerías. Solo falla
# si Chromium no arranca.
#
# Uso: scripts/ci/playwright-chromium.sh [--cached]
#   --cached  el navegador ya está en la caché (~/.cache/ms-playwright): solo dependencias.
set -u

retry() {
  label=$1
  shift
  for wait in 15 30 45 0; do
    "$@" && return 0
    [ "$wait" -eq 0 ] && break
    echo "::warning::$label falló; reintento en ${wait} s."
    sleep "$wait"
  done
  return 1
}

if [ "${1:-}" != "--cached" ]; then
  retry "La descarga de Chromium" pnpm exec playwright install chromium || exit 1
fi

if retry "La instalación de las dependencias de Chromium (apt)" \
  pnpm exec playwright install-deps chromium; then
  exit 0
fi

echo "::warning::apt no pudo instalar las dependencias de Chromium; se comprueba si arranca con las que trae el runner."
if node -e "require('@playwright/test').chromium.launch().then((b) => b.close())"; then
  echo "Chromium arranca con las librerías del runner."
  exit 0
fi
echo "::error::Chromium no arranca y apt no pudo instalar sus dependencias."
exit 1
