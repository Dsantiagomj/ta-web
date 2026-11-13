#!/bin/sh
# Hook pre-commit: revisión con IA de los archivos en stage (configuración en .gga).
# Sin gga instalado avisa y no bloquea el commit.
if ! command -v gga >/dev/null 2>&1; then
  echo "Aviso: gga (Gentleman Guardian Angel) no está instalado; el commit sigue sin revisión con IA." >&2
  echo "Instálalo con: brew install gentleman-programming/tap/gga" >&2
  exit 0
fi

# gga llama a `claude --print` sin modelo, así que usaría el modelo por defecto de Claude
# Code, que puede ser uno caro. La revisión de cada commit va con Sonnet 5.5;
# GGA_CLAUDE_MODEL lo cambia.
export ANTHROPIC_MODEL="${GGA_CLAUDE_MODEL:-claude-sonnet-5-5}"

exec gga run
