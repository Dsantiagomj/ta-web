// Para casar los nombres que escribe Torre con los del juego.

/** Minúsculas, sin tildes ni puntuación: para casar los nombres de Torre con los del juego. */
export function fold(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLocaleLowerCase('es')
    .replace(/[^a-z0-9ñ]+/g, ' ')
    .trim()
}
