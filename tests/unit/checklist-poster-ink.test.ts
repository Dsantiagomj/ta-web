import { describe, expect, it } from 'vitest'

import { contrastRatio, POSTER_SHADE, posterInk } from '@/lib/checklists/poster-ink'

// El nombre de la tarjeta del índice /checklists va en el color de su Dofus sobre la sombra de
// abajo (DESIGN.md, Checklists index): con el color tal cual si se lee, aclarado en el modo
// oscuro o oscurecido en el claro hasta el AA de texto normal (4,5:1) si no.

describe('contrastRatio', () => {
  it('es el de WCAG 2.x', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 5)
    expect(contrastRatio('#ffffff', '#ffffff')).toBeCloseTo(1, 5)
    // Arcano oscuro: ink sobre bg, 16,17 en DESIGN.md.
    expect(contrastRatio('#ece9ff', '#0f0d1a')).toBeCloseTo(16.17, 1)
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
