import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import { contrastRatio } from '@/lib/checklists/poster-ink'
import { readPalette } from '@/lib/theme/palette'

// El relleno de los avisos (DESIGN.md, Components: Callout). Su color es el mismo en todos los
// temas (Shared colors); mezclado con el fondo de cada tema, el dorado de «¡Importante!» salía
// gris y turbio sobre los fondos azulados de Arcano claro y Bonta. Se mezcla con un suelo
// neutro por modo: el aviso conserva su tono en cada tema y la tinta sigue pasando 4,5:1.

const theme = readFileSync('src/styles/theme.css', 'utf8')
const ui = readFileSync('src/components/ui/ui.css', 'utf8')
const palette = readPalette(theme)

type Rgb = [number, number, number]
const rgb = (hex: string) => [1, 3, 5].map((at) => parseInt(hex.slice(at, at + 2), 16)) as Rgb
const hex = (color: Rgb) =>
  `#${color.map((c) => Math.round(c).toString(16).padStart(2, '0')).join('')}`
const mix = (a: string, b: string, share: number) =>
  hex(rgb(a).map((c, i) => c * share + rgb(b)[i] * (1 - share)) as Rgb)

/** El tono HSL en grados. */
function hue(color: string) {
  const [r, g, b] = rgb(color).map((c) => c / 255)
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  if (max === min) return NaN
  const d = max - min
  const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4
  return (h * 60 + 360) % 360
}

function status(mode: 'dark' | 'light') {
  const block = new RegExp(`\\[data-mode='${mode}'\\]\\s*\\{([^}]*--t-warning[^}]*)\\}`).exec(theme)
  const values: Record<string, string> = {}
  for (const [, name, value] of block![1].matchAll(/--t-([\w-]+):\s*(#[0-9a-f]{6});/gi)) {
    values[name] = value
  }
  return values
}

function callout(selector: string) {
  const start = ui.indexOf(`${selector} {`)
  expect(start, selector).toBeGreaterThan(-1)
  const block = ui.slice(start, ui.indexOf('}', start))
  return {
    ground: /--callout-ground:\s*(#[0-9a-f]{6})/.exec(block)![1],
    tint: Number(/--callout-tint:\s*([\d.]+)%/.exec(block)![1]) / 100,
  }
}

const look = { dark: callout('.callout'), light: callout("[data-mode='light'] .callout") }

describe('el relleno de los avisos', () => {
  for (const [key, values] of Object.entries(palette)) {
    const mode = key.endsWith('-dark') ? 'dark' : 'light'
    for (const variant of ['warning', 'danger', 'info']) {
      it(`${key}: «${variant}» conserva su tono y la tinta pasa 4,5:1`, () => {
        const color = status(mode)[variant]
        const fill = mix(color, look[mode].ground, look[mode].tint)
        const drift = Math.abs(hue(fill) - hue(color))
        expect(Math.min(drift, 360 - drift), fill).toBeLessThan(15)
        expect(contrastRatio(values.ink, fill)).toBeGreaterThanOrEqual(4.5)
      })
    }
  }
})
