#!/bin/sh
# Hook pre-commit: revisión con IA de los archivos en stage (configuración en .gga).
# Sin gga instalado avisa y no bloquea el commit.
if ! command -v gga >/dev/null 2>&1; then
  echo "Aviso: gga (Gentleman Guardian Angel) no está instalado; el commit sigue sin revisión con IA." >&2
  echo "Instálalo con: brew install gentleman-programming/tap/gga" >&2
  exit 0
fi

exec gga run
