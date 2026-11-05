import type { Palette } from '@/lib/theme/palette'

// El dibujo del emblema (la propuesta C, elegida por Torre): el sombrero cónico con su
// glifo, los ojos y la sonrisa, en una caja de 64 × 64. Lo comparten el componente
// <Emblem> y las imágenes que se generan con scripts/build-icons.ts.

export const EMBLEM_VIEWBOX = '0 0 64 64'

export const EMBLEM_ART = {
  hat: 'M32 4.5 C33.6 4.5 35 5.6 36.4 7 L61 33.2 C62.4 34.7 61.6 36.7 59.6 36.9 Q32 40.6 4.4 36.9 C2.4 36.7 1.6 34.7 3 33.2 L27.6 7 C29 5.6 30.4 4.5 32 4.5 Z',
  glyph: [
    'M24 21.6 Q32 14.6 40 21.6',
    'M28.4 25 H35.8 M32 25 V29.4',
    'M24.6 29.6 H39.6',
    'M25 34 H38.6 M27.6 34 L26.4 31.8 M35.6 34 L37 31.8',
  ],
  glyphWidth: 2.6,
  eyes: ['M19.5 43 L27 46', 'M44.5 43 L37 46'],
  eyesWidth: 3.4,
  grin: 'M17.5 49.5 Q32 52.5 46.5 47.5 Q43.5 60 31.5 60 Q20.5 59.6 17.5 49.5 Z',
  // Para 16 px: sin glifo ni ojos, un sombrero más alto y una sonrisa más grande.
  simpleHat: 'M32 4 L62 36 Q32 41 2 36 Z',
  simpleGrin: 'M14 46 Q32 50 50 45 Q46 62 31 62 Q17 61.5 14 46 Z',
} as const

export type EmblemVariant = 'full' | 'simple'

/** Sombrero, glifo (el color que asoma por el sombrero) y cara (ojos y sonrisa). */
export interface EmblemColors {
  hat: string
  glyph: string
  face: string
}

/** Los colores del emblema en un tema y modo: accent, bg e ink. */
export function emblemColors(values: Record<string, string>): EmblemColors {
  return { hat: values.accent, glyph: values.bg, face: values.ink }
}

type Backdrop = { shape: 'tile'; color: string; radius?: number } | { shape: 'disc'; color: string }

function art(variant: EmblemVariant, colors: EmblemColors) {
  if (variant === 'simple') {
    return `<path d="${EMBLEM_ART.simpleHat}" fill="${colors.hat}"/><path d="${EMBLEM_ART.simpleGrin}" fill="${colors.face}"/>`
  }
  const strokes = (paths: readonly string[], width: number, color: string) =>
    `<g fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round">${paths.map((d) => `<path d="${d}"/>`).join('')}</g>`
  return (
    `<path d="${EMBLEM_ART.hat}" fill="${colors.hat}"/>` +
    strokes(EMBLEM_ART.glyph, EMBLEM_ART.glyphWidth, colors.glyph) +
    strokes(EMBLEM_ART.eyes, EMBLEM_ART.eyesWidth, colors.face) +
    `<path d="${EMBLEM_ART.grin}" fill="${colors.face}"/>`
  )
}

/**
 * El emblema como SVG suelto, con los colores escritos: para los PNG del favicon y las
 * descargas. Sin fondo es transparente; `padding` (0 a 0,5) lo encoge hacia el centro.
 */
export function emblemSvg({
  colors,
  variant = 'full',
  size = 64,
  backdrop,
  padding = 0,
}: {
  colors: EmblemColors
  variant?: EmblemVariant
  size?: number
  backdrop?: Backdrop
  padding?: number
}) {
  const back = !backdrop
    ? ''
    : backdrop.shape === 'disc'
      ? `<circle cx="32" cy="32" r="32" fill="${backdrop.color}"/>`
      : `<rect width="64" height="64" rx="${backdrop.radius ?? 0}" fill="${backdrop.color}"/>`
  const body = art(variant, colors)
  const scaled = padding
    ? `<g transform="translate(${+(64 * padding).toFixed(2)} ${+(64 * padding).toFixed(2)}) scale(${+(1 - 2 * padding).toFixed(4)})">${body}</g>`
    : body
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="${EMBLEM_VIEWBOX}">${back}${scaled}</svg>\n`
}

/**
 * El favicon SVG: la versión simplificada sobre una placa redondeada de Arcano, el tema
 * por defecto. Oscuro, y claro si el navegador usa el esquema claro.
 */
export function faviconSvg(palette: Palette) {
  const dark = palette['arcano-dark']
  const light = palette['arcano-light']
  const fills = (p: Record<string, string>) =>
    `.t{fill:${p.bg}}.h{fill:${p.accent}}.f{fill:${p.ink}}`
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${EMBLEM_VIEWBOX}">` +
    `<style>${fills(dark)}@media (prefers-color-scheme:light){${fills(light)}}</style>` +
    `<rect class="t" width="64" height="64" rx="14"/>` +
    `<path class="h" d="${EMBLEM_ART.simpleHat}"/>` +
    `<path class="f" d="${EMBLEM_ART.simpleGrin}"/>` +
    `</svg>\n`
  )
}
