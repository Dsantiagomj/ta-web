#!/bin/sh
# Hook commit-msg: commits convencionales y sin líneas Co-Authored-By (ver AGENTS.md).
# Uso: commit-msg.sh <archivo del mensaje>
set -eu

message_file="$1"
# La primera línea que no es comentario es el título.
subject=$(grep -v '^#' "$message_file" | sed -n '/[^[:space:]]/{p;q;}')

case "$subject" in
  'Merge '* | 'Revert "'* | 'fixup! '* | 'squash! '* | 'amend! '*) exit 0 ;;
esac

types='feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert'
if ! printf '%s\n' "$subject" | grep -Eq "^($types)(\([^()[:space:]][^()]*\))?!?: [^[:space:]]"; then
  echo "El título no sigue los commits convencionales:" >&2
  echo "  $subject" >&2
  echo "Formato: tipo(ámbito): descripción, con tipo en $types." >&2
  echo "Ejemplo: feat(guias): añade la guía de Aprendizaje escudero" >&2
  exit 1
fi

if grep -v '^#' "$message_file" | grep -iq '^co-authored-by:'; then
  echo "Sin líneas Co-Authored-By en los commits (AGENTS.md)." >&2
  exit 1
fi
