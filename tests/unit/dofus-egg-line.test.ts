import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import { contrastRatio } from '@/lib/checklists/poster-ink'
import { EGG_LINE_GROUND, eggLine } from '@/lib/dofus-guides/egg-line'
import { readPalette } from '@/lib/theme/palette'

// El borde de cada tarjeta de /guias-dofus va en el color de su Dofus, que elige Torre. Como
// borde de un control, pide 3:1 (WCAG 1.4.11) sobre el fondo de la página y la superficie de
// la tarjeta en cada tema: el plateado del Dofus Plateado casi no se veía en el modo claro.

const palette = readPalette(readFileSync('src/styles/theme.css', 'utf8'))
const grounds = (mode: 'dark' | 'light') =>
  Object.entries(palette)
    .filter(([key]) => key.endsWith(`-${mode}`))
    .flatMap(([, values]) => [values.bg!, values.surface!])

describe('eggLine', () => {
  it('mide contra el peor fondo de theme.css: el más claro de los oscuros y el más oscuro de los claros', () => {
    const white = '#ffffff'
    const black = '#000000'
    const lightest = grounds('dark').sort(
      (a, b) => contrastRatio(a, white) - contrastRatio(b, white),
    )
    const darkest = grounds('light').sort(
      (a, b) => contrastRatio(a, black) - contrastRatio(b, black),
    )
    expect(EGG_LINE_GROUND.dark).toBe(lightest[0])
    expect(EGG_LINE_GROUND.light).toBe(darkest[0])
  })

  it('el Dofus Plateado se oscurece en el modo claro hasta 3:1 sobre cada fondo claro', () => {
    const line = eggLine('#dce1c9')!
    expect(line.light).not.toBe('#dce1c9')
    for (const ground of grounds('light')) {
      expect(contrastRatio(line.light, ground), ground).toBeGreaterThanOrEqual(3)
    }
  })

  it('un color que ya se ve sobre los fondos de su modo se queda como está', () => {
    expect(eggLine('#d18b23')?.dark).toBe('#d18b23')
    expect(eggLine('#1d68ae')?.light).toBe('#1d68ae')
  })

  it('cualquier color llega a 3:1 en los dos modos, en cada tema', () => {
    for (const color of [
      '#dce1c9',
      '#d18b23',
      '#ff9118',
      '#2ecd68',
      '#3b1d10',
      '#ffffff',
      '#000',
    ]) {
      const line = eggLine(color)!
      for (const ground of grounds('dark')) {
        expect(contrastRatio(line.dark, ground), `${color} ${ground}`).toBeGreaterThanOrEqual(3)
      }
      for (const ground of grounds('light')) {
        expect(contrastRatio(line.light, ground), `${color} ${ground}`).toBeGreaterThanOrEqual(3)
      }
    }
  })

  it('sin un color válido, nada: la tarjeta usa el color de la sección', () => {
    expect(eggLine(undefined)).toBeUndefined()
    expect(eggLine('plateado')).toBeUndefined()
  })
})
