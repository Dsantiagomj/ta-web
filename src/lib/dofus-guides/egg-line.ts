// El borde de cada tarjeta del índice /guias-dofus: el color de su Dofus, que lo elige Torre y
// puede no verse sobre la página (el plateado del Dofus Plateado en el modo claro). Como borde
// pide 3:1 (WCAG 1.4.11) sobre el fondo de la página y la superficie de la tarjeta: tal cual
// si llega, y si no, aclarado (modo oscuro) u oscurecido (modo claro) lo justo. Se decide en
// el servidor, como el nombre de las tarjetas de /checklists. Código puro: tests/unit.

import { contrastedColor } from '@/lib/checklists/poster-ink'

/**
 * El peor fondo de cada modo entre el fondo y la superficie de todos los temas de theme.css:
 * el más claro de los oscuros (la superficie de Bonta) y el más oscuro de los claros (el fondo
 * de Amakna). tests/unit/dofus-egg-line.test.ts lo comprueba contra theme.css.
 */
export const EGG_LINE_GROUND = { dark: '#171f31', light: '#f5f0e6' } as const

const NON_TEXT = 3

/** El borde de la tarjeta en cada modo, o undefined sin un color válido (el de la sección). */
export function eggLine(
  color: string | null | undefined,
): { dark: string; light: string } | undefined {
  return contrastedColor(color, EGG_LINE_GROUND, NON_TEXT)
}
