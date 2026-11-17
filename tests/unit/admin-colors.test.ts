import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import { readPalette } from '@/lib/theme/palette'

// El panel pinta su marca y sus notas con los colores de Arcano (src/app/(payload)/custom.scss).
// No se cambia de tema, pero los valores tienen que ser los de Arcano de ahora en theme.css, no
// los de la paleta de antes de la opción D.

const scss = readFileSync('src/app/(payload)/custom.scss', 'utf8')
const palette = readPalette(readFileSync('src/styles/theme.css', 'utf8'))

/** Una variable del primer bloque que la declara a partir de `selector`. */
function value(selector: string, name: string) {
  const block = scss.slice(scss.indexOf(selector)).split('}')[0]
  return new RegExp(`${name}:\\s*(#[0-9a-f]{6})`).exec(block)?.[1]
}

describe('los colores de Arcano del panel', () => {
  it('claro (:root) y oscuro (data-theme dark) son los de theme.css', () => {
    for (const [selector, mode] of [
      [':root {', 'light'],
      ["html[data-theme='dark'] {", 'dark'],
    ] as const) {
      const arcano = palette[`arcano-${mode}`]
      expect(value(selector, '--ta-bg'), `${mode} bg`).toBe(arcano.bg)
      expect(value(selector, '--ta-ink'), `${mode} ink`).toBe(arcano.ink)
      expect(value(selector, '--ta-muted'), `${mode} muted`).toBe(arcano.muted)
      expect(value(selector, '--ta-accent'), `${mode} accent`).toBe(arcano.accent)
    }
  })

  it('los extremos de la escala de grises son los fondos de Arcano', () => {
    expect(value(':root {', '--color-base-50')).toBe(palette['arcano-light'].bg)
    expect(value(':root {', '--color-base-900')).toBe(palette['arcano-dark'].bg)
  })
})
