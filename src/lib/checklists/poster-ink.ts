// El color del nombre en la tarjeta del índice /checklists: el de su Dofus, que lo elige Torre
// (o la guía de su Dofus) y puede no leerse sobre la sombra. Se decide en el servidor: tal cual
// si llega al AA de texto normal (4,5:1) sobre la sombra de su modo; si no, mezclado con blanco
// (modo oscuro) o con negro (modo claro) lo justo para llegar. Código puro: tests/unit.

/**
 * La sombra bajo el nombre en el peor caso (checklists-index.css, `.poster__shade`): la oscura,
 * el fondo más claro de los temas oscuros (Arcano) al 96 % sobre arte blanco; la clara, la
 * superficie más oscura de los temas claros (Ocre) al 92 % sobre arte negro al 55 %.
 */
export const POSTER_SHADE = { dark: '#1a1824', light: '#e8e3da' } as const

const AA = 4.5

type Rgb = [number, number, number]

function parse(hex: string | null | undefined): Rgb | null {
  const match = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex?.trim() ?? '')
  if (!match) return null
  const digits =
    match[1].length === 3
      ? [...match[1]].map((digit) => digit + digit).join('')
      : match[1].toLowerCase()
  return [0, 2, 4].map((at) => parseInt(digits.slice(at, at + 2), 16)) as Rgb
}

const toHex = (rgb: Rgb) =>
  `#${rgb.map((channel) => Math.round(channel).toString(16).padStart(2, '0')).join('')}`

function luminance([r, g, b]: Rgb): number {
  const linear = (channel: number) => {
    const c = channel / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b)
}

const ratio = (a: Rgb, b: Rgb) => {
  const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (high + 0.05) / (low + 0.05)
}

/** El contraste WCAG 2.x entre dos colores hexadecimales. */
export function contrastRatio(a: string, b: string): number {
  const x = parse(a)
  const y = parse(b)
  if (!x || !y) throw new Error(`Color no válido: ${x ? b : a}`)
  return ratio(x, y)
}

const mix = (from: Rgb, to: Rgb, amount: number): Rgb =>
  from.map((channel, index) => channel + (to[index] - channel) * amount) as Rgb

/** El color mezclado con `toward` lo justo (en pasos del 2 %) para llegar a 4,5:1 sobre `on`. */
function readable(color: Rgb, toward: Rgb, on: Rgb): string {
  for (let step = 0; step <= 50; step += 1) {
    const candidate = mix(color, toward, step / 50)
    const rounded = parse(toHex(candidate))!
    if (ratio(rounded, on) >= AA) return toHex(rounded)
  }
  return toHex(toward)
}

/** El color del nombre en cada modo, o undefined sin un color válido (la tinta del tema). */
export function posterInk(
  color: string | null | undefined,
): { dark: string; light: string } | undefined {
  const rgb = parse(color)
  if (!rgb) return undefined
  return {
    dark: readable(rgb, [255, 255, 255], parse(POSTER_SHADE.dark)!),
    light: readable(rgb, [0, 0, 0], parse(POSTER_SHADE.light)!),
  }
}
