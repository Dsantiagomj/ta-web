import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import { contrastRatio, POSTER_SHADE, posterInk } from '@/lib/checklists/poster-ink'
import { readPalette } from '@/lib/theme/palette'

// El nombre de la tarjeta del índice /checklists va en el color de su Dofus sobre la sombra de
// abajo (DESIGN.md, Checklists index): con el color tal cual si se lee, aclarado en el modo
// oscuro o oscurecido en el claro hasta el AA de texto normal (4,5:1) si no.

describe('contrastRatio', () => {
  it('es el de WCAG 2.x', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 5)
    expect(contrastRatio('#ffffff', '#ffffff')).toBeCloseTo(1, 5)
    // Arcano oscuro: ink sobre bg, 16,62 en DESIGN.md.
    expect(contrastRatio('#f1eeff', '#110f1b')).toBeCloseTo(16.62, 1)
  })
})

// La sombra del peor caso sale de theme.css, no de una paleta vieja: la oscura, el fondo de
// cada tema oscuro al 96 % sobre arte blanco, el más claro; la clara, la superficie de cada tema
// claro al 92 % sobre arte negro, la más oscura (checklists-index.css, .poster__shade).
describe('POSTER_SHADE', () => {
  const palette = readPalette(readFileSync('src/styles/theme.css', 'utf8'))
  const channels = (hex: string) => [1, 3, 5].map((at) => parseInt(hex.slice(at, at + 2), 16))
  const over = (color: string, art: number, share: number) =>
    `#${channels(color)
      .map((c) =>
        Math.round(c * share + art * (1 - share))
          .toString(16)
          .padStart(2, '0'),
      )
      .join('')}`
  const shades = (mode: 'dark' | 'light') =>
    Object.entries(palette)
      .filter(([key]) => key.endsWith(`-${mode}`))
      .map(([, values]) =>
        mode === 'dark' ? over(values.bg!, 255, 0.96) : over(values.surface!, 0, 0.92),
      )

  it('la oscura es la más clara de los temas oscuros y la clara la más oscura de los claros', () => {
    const byWhite = (a: string, b: string) =>
      contrastRatio(a, '#ffffff') - contrastRatio(b, '#ffffff')
    expect(POSTER_SHADE.dark).toBe(shades('dark').sort(byWhite)[0])
    expect(POSTER_SHADE.light).toBe(shades('light').sort(byWhite).at(-1))
  })

  it('un nombre que pasa sobre la sombra pasa sobre la de cada tema', () => {
    for (const color of ['#875cd2', '#47c4ff', '#d18b23', '#b0d62d']) {
      const ink = posterInk(color)!
      for (const shade of shades('dark')) {
        expect(contrastRatio(ink.dark, shade), `${color} ${shade}`).toBeGreaterThanOrEqual(4.5)
      }
      for (const shade of shades('light')) {
        expect(contrastRatio(ink.light, shade), `${color} ${shade}`).toBeGreaterThanOrEqual(4.5)
      }
    }
  })
})

describe('posterInk', () => {
  it('un color que ya se lee sobre la sombra oscura se queda como está', () => {
    expect(posterInk('#b0d62d')?.dark).toBe('#b0d62d')
  })

  it('el morado del Nebuloso se aclara en el modo oscuro hasta 4,5:1', () => {
    const ink = posterInk('#875cd2')!
    expect(contrastRatio('#875cd2', POSTER_SHADE.dark)).toBeLessThan(4.5)
    expect(ink.dark).not.toBe('#875cd2')
    expect(contrastRatio(ink.dark, POSTER_SHADE.dark)).toBeGreaterThanOrEqual(4.5)
  })

  it('en el modo claro se oscurece hasta 4,5:1 sobre la sombra clara', () => {
    for (const color of ['#b0d62d', '#47c4ff', '#875cd2', '#d18b23', '#dee9f6']) {
      const ink = posterInk(color)!
      expect(contrastRatio(ink.light, POSTER_SHADE.light), color).toBeGreaterThanOrEqual(4.5)
      expect(contrastRatio(ink.dark, POSTER_SHADE.dark), color).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('acepta el color corto y en mayúsculas, como el panel', () => {
    expect(posterInk('#FFF')).toEqual(posterInk('#ffffff'))
  })

  it('sin un color válido, nada: la tarjeta usa la tinta del tema', () => {
    expect(posterInk(undefined)).toBeUndefined()
    expect(posterInk('verde')).toBeUndefined()
  })
})
