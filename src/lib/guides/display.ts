// Cifras y listas tal como se pintan en las páginas de guía. Sin dependencias: lo importa
// la isla de las guías (PageEnhancements) a través de sus textos.

/** Separa los miles con un espacio normal, como escribe Torre: 24 316. */
export function formatThousands(value: number): string {
  return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

/** Miles separados por un espacio que no se parte: 16 380 nunca queda en dos líneas. */
export function formatAmount(value: number): string {
  return formatThousands(value).replaceAll(' ', ' ')
}

// Una cadena de logro de más de cinco misiones se recorta (DESIGN.md, Achievement chain).
const MAX_FULL_CHAIN = 5

/**
 * Las misiones de una cadena que se ven: la primera, la anterior, la actual, la siguiente
 * y la última; null marca un hueco de una o más misiones.
 */
export function chainWindow<T>(quests: T[], current: number): (T | null)[] {
  if (quests.length <= MAX_FULL_CHAIN) return quests
  const kept = new Set([0, current - 1, current, current + 1, quests.length - 1])
  const visible: (T | null)[] = []
  quests.forEach((quest, index) => {
    if (kept.has(index)) visible.push(quest)
    else if (visible.at(-1) !== null) visible.push(null)
  })
  return visible
}

/**
 * El rootMargin de la lista «Pasos»: deja la franja entre el 30 % y el 40 % de la altura de
 * la ventana. Va en píxeles porque los porcentajes de rootMargin se miden contra el ancho
 * de la ventana, también los de arriba y abajo.
 */
export function stepBandMargin(viewportHeight: number): string {
  const top = Math.round(viewportHeight * 0.3)
  const bottom = Math.round(viewportHeight * 0.6)
  return `-${top}px 0px -${bottom}px 0px`
}
