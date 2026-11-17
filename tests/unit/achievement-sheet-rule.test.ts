import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import { contrastRatio } from '@/lib/checklists/poster-ink'
import { readPalette } from '@/lib/theme/palette'

// La línea entre las misiones y la ficha de una página de logro (DESIGN.md, Achievement page
// components) separa dos columnas, no dos filas: con --color-line casi no se veía en el modo
// oscuro, sobre el fondo de zona. Va mezclada con --color-muted hasta 3:1 (WCAG 1.4.11) sobre
// el fondo y la superficie de cada tema y modo.

const css = readFileSync('src/components/achievement/achievement.css', 'utf8')
const palette = readPalette(readFileSync('src/styles/theme.css', 'utf8'))

const hex = (value: string) => [1, 3, 5].map((at) => parseInt(value.slice(at, at + 2), 16))
/** color-mix(in srgb, a p%, b), como lo calcula el navegador. */
const mix = (a: string, b: string, share: number) =>
  `#${hex(a)
    .map((channel, index) => Math.round(channel * share + hex(b)[index]! * (1 - share)))
    .map((channel) => channel.toString(16).padStart(2, '0'))
    .join('')}`

describe('la línea de la ficha del logro', () => {
  const block = /\.logro--sheet > \.logro__main > \.lsheet \{([^}]*)\}/.exec(css)?.[1] ?? ''
  const rule =
    /border-left: 1px solid color-mix\(in srgb, var\(--color-muted\) (\d+)%, var\(--color-line\)\);/.exec(
      block,
    )

  it('mezcla el texto apagado con la línea del tema', () => {
    expect(rule, block).not.toBeNull()
  })

  it('llega a 3:1 sobre el fondo y la superficie en cada tema y modo', () => {
    const share = Number(rule?.[1]) / 100
    for (const [key, values] of Object.entries(palette)) {
      const line = mix(values.muted!, values.line!, share)
      expect(contrastRatio(line, values.bg!), `${key} bg`).toBeGreaterThanOrEqual(3)
      expect(contrastRatio(line, values.surface!), `${key} surface`).toBeGreaterThanOrEqual(3)
    }
  })
})
