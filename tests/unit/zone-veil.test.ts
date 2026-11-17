import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import { contrastRatio } from '@/lib/checklists/poster-ink'
import { readPalette } from '@/lib/theme/palette'

// El fondo de zona (DESIGN.md, Zone background): el paisaje de la subzona bajo un velo plano
// del fondo de la página. El texto de la guía y del logro se pinta sobre la mezcla del velo y
// el mapa, así que cada par tiene que pasar sobre el peor mapa posible: blanco en el modo
// oscuro (el texto es claro), negro en el claro (el texto es oscuro), y un gris medio entre
// los dos. Los separadores entre partes, 3:1 sobre los mismos fondos.

const theme = readFileSync('src/styles/theme.css', 'utf8')
const game = readFileSync('src/components/game/game.css', 'utf8')
const palette = readPalette(theme)

type Rgb = [number, number, number]
const rgb = (hex: string): Rgb => {
  const digits = hex.replace('#', '')
  return [0, 2, 4].map((at) => parseInt(digits.slice(at, at + 2), 16)) as Rgb
}
const hex = (color: Rgb) =>
  `#${color.map((channel) => Math.round(channel).toString(16).padStart(2, '0')).join('')}`
/** color-mix(in srgb, a share%, b). */
const mix = (a: string, b: string, share: number) =>
  hex(rgb(a).map((channel, index) => channel * share + rgb(b)[index] * (1 - share)) as Rgb)

/** Los valores de una variable --t-* que no dependen del tema (los bloques [data-mode]). */
function modeValues(mode: 'dark' | 'light') {
  const values: Record<string, string> = {}
  for (const [, block] of theme.matchAll(
    new RegExp(`\\[data-mode='${mode}'\\]\\s*\\{([^}]*)\\}`, 'g'),
  )) {
    for (const [, name, value] of block.matchAll(/--t-([\w-]+):\s*(#[0-9a-f]{6});/gi)) {
      values[name] = value
    }
  }
  return values
}

/** Un porcentaje declarado en un bloque de game.css, como fracción. */
function percent(selector: string, property: string) {
  const start = game.indexOf(`${selector} {`)
  expect(start, selector).toBeGreaterThan(-1)
  const block = game.slice(start, game.indexOf('}', start))
  const match = new RegExp(`${property}:\\s*([\\d.]+)%`).exec(block)
  expect(match, `${selector} ${property}`).not.toBeNull()
  return Number(match![1]) / 100
}

const veil = {
  dark: percent('.zone-bg', '--zone-veil'),
  light: percent("[data-mode='light'] .zone-bg", '--zone-veil'),
}
// En el modo claro, el texto sobre el velo se oscurece un poco: los tonos claros del diseño
// dan 4,5:1 justos sobre el fondo y cualquier sombra del mapa los bajaba.
const lightShift = percent("[data-mode='light'] .zone-bg ~ main", '--zone-ink-shift')
const ruleShare = percent('.zone-bg ~ main', '--zone-rule-muted')

const MAPS = { blanco: '#ffffff', gris: '#808080', negro: '#000000' }
const TEXT = [
  'ink',
  'ink-2',
  'muted',
  'accent',
  'accent-2',
  ...Array.from({ length: 8 }, (_, index) => `hue-${index + 1}`),
]
// Los que se oscurecen sobre el velo en el modo claro.
const SHIFTED = new Set(['muted', 'accent', 'accent-2', ...TEXT.filter((t) => t.startsWith('hue'))])

describe('el velo del fondo de zona', () => {
  it('es más fuerte que el del prototipo, que dejaba el texto bajo 4,5:1', () => {
    expect(veil.dark).toBeGreaterThan(0.8)
    expect(veil.light).toBeGreaterThan(0.84)
  })

  for (const [key, values] of Object.entries(palette)) {
    const mode = key.endsWith('-dark') ? 'dark' : 'light'
    const all = { ...modeValues(mode), ...values }
    const ink = (token: string) =>
      mode === 'light' && SHIFTED.has(token)
        ? mix(all[token], '#000000', 1 - lightShift)
        : all[token]

    it(`${key}: cada texto pasa 4,5:1 sobre el velo encima de un mapa blanco, gris o negro`, () => {
      for (const [name, map] of Object.entries(MAPS)) {
        const ground = mix(all.bg, map, veil[mode])
        for (const token of TEXT) {
          expect(
            contrastRatio(ink(token), ground),
            `${token} sobre mapa ${name}`,
          ).toBeGreaterThanOrEqual(4.5)
        }
      }
    })

    it(`${key}: los separadores pasan 3:1 sobre el velo y sobre la superficie`, () => {
      const rule = mix(ink('muted'), all.line, ruleShare)
      for (const [name, map] of Object.entries(MAPS)) {
        const ground = mix(all.bg, map, veil[mode])
        expect(contrastRatio(rule, ground), `mapa ${name}`).toBeGreaterThanOrEqual(3)
      }
      expect(contrastRatio(rule, all.surface), 'surface').toBeGreaterThanOrEqual(3)
    })
  }
})
