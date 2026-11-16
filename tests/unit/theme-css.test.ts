import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import { contrastRatio } from '@/lib/checklists/poster-ink'
import { readPalette } from '@/lib/theme/palette'
import { DEFAULT_THEME, MODES, THEMES } from '@/lib/theme/theme'

const css = readFileSync('src/styles/theme.css', 'utf8')

// Los tokens semánticos que @theme inline apunta a los valores crudos de cada tema.
const semanticTokens = [...css.matchAll(/^\s*(--color-[\w-]+):\s*(var\(--t-[\w-]+\));/gm)].map(
  ([, token, value]) => ({ token, value }),
)

describe('theme.css en una sección con su propio tema', () => {
  it('lee los tokens semánticos del bloque @theme inline', () => {
    expect(semanticTokens.map(({ token }) => token)).toContain('--color-accent')
    expect(semanticTokens.length).toBeGreaterThanOrEqual(20)
  })

  it('vuelve a resolver cada token en un elemento con data-theme o data-mode', () => {
    // Una variable que apunta a otra se resuelve donde se declara (:root) y se hereda ya
    // resuelta: sin redeclararla, var(--color-accent) daría Arcano oscuro dentro de una
    // sección con data-theme="bonta".
    const block = /\[data-theme\],\s*\[data-mode\]\s*\{([^}]*)\}/.exec(css)?.[1] ?? ''
    for (const { token, value } of semanticTokens) {
      expect(block, token).toContain(`${token}: ${value};`)
    }
    expect(block).toContain('--color-section: var(--t-accent);')
    expect(block).toMatch(/--shadow-art:/)
  })
})

const palette = readPalette(css)

// Los valores crudos que define cada tema en cada modo. btn, chip y bar son los papeles del
// diseño de color de Torre (opción D): el relleno de los botones, el de las píldoras y el de
// la barra de la cabecera y el pie.
const RAW_TOKENS = [
  'bg',
  'surface',
  'raised',
  'line',
  'ink',
  'ink-2',
  'muted',
  'accent',
  'accent-2',
  'btn',
  'btn-hi',
  'btn-ink',
  'chip',
  'chip-hi',
  'bar',
]

// Texto (4,5:1) y gráficos (3:1) que el diseño pone uno sobre otro (DESIGN.md, Color).
const TEXT_PAIRS = [
  ['ink', 'bg'],
  ['ink', 'surface'],
  ['ink', 'raised'],
  ['ink-2', 'bg'],
  ['ink-2', 'surface'],
  ['ink-2', 'raised'],
  ['muted', 'bg'],
  ['muted', 'surface'],
  ['muted', 'raised'],
  ['accent', 'bg'],
  ['accent', 'surface'],
  ['accent', 'raised'],
  ['accent-2', 'surface'],
  ['accent-2', 'raised'],
  ['btn-ink', 'btn'],
  ['btn-ink', 'btn-hi'],
  ['ink', 'chip'],
  ['ink', 'chip-hi'],
  ['ink', 'bar'],
  ['accent', 'bar'],
] as const
const GRAPHIC_PAIRS = [['bg', 'accent']] as const

describe('las paletas de theme.css', () => {
  const blocks = THEMES.flatMap((theme) => MODES.map((mode) => `${theme}-${mode}` as const))

  it('cada tema define todos sus valores crudos en los dos modos', () => {
    for (const key of blocks) {
      expect(Object.keys(palette[key] ?? {}).sort(), key).toEqual([...RAW_TOKENS].sort())
    }
  })

  it('cada par de texto pasa el AA (4,5:1) y cada gráfico 3:1, en cada tema y modo', () => {
    for (const key of blocks) {
      const values = palette[key]
      for (const [fg, bg] of TEXT_PAIRS) {
        expect(
          contrastRatio(values[fg], values[bg]),
          `${key}: ${fg} sobre ${bg}`,
        ).toBeGreaterThanOrEqual(4.5)
      }
      for (const [fg, bg] of GRAPHIC_PAIRS) {
        expect(
          contrastRatio(values[fg], values[bg]),
          `${key}: ${fg} sobre ${bg}`,
        ).toBeGreaterThanOrEqual(3)
      }
    }
  })

  it('lleva los colores de la opción D de Torre', () => {
    expect(palette['amakna-dark']).toMatchObject({
      bg: '#14110e',
      accent: '#b5e04a',
      bar: '#000000',
    })
    expect(palette['arcano-light']).toMatchObject({ bg: '#f3f1fa', btn: '#0a6a85' })
    expect(palette['bonta-dark']).toMatchObject({ bg: '#0e1320', chip: '#2f3b57' })
    expect(palette['brakmar-light']).toMatchObject({ btn: '#b3261c', 'btn-ink': '#ffffff' })
  })

  it('el tema por defecto, oscuro, es también el de :root', () => {
    expect(css).toContain(`:root,\n[data-theme='${DEFAULT_THEME}'][data-mode='dark'] {`)
  })

  it('expone los papeles nuevos como tokens semánticos', () => {
    const tokens = semanticTokens.map(({ token }) => token)
    for (const token of ['btn', 'btn-hi', 'btn-ink', 'chip', 'chip-hi', 'bar']) {
      expect(tokens).toContain(`--color-${token}`)
    }
  })
})
