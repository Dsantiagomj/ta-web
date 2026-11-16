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

// Los colores de marca del pie, iguales en los cuatro temas: el Discord violeta y el Ko-fi
// dorado (opción D). Van por modo, en los bloques [data-mode] de theme.css.
const modeValues = (mode: string) => {
  const values: Record<string, string> = {}
  const blocks = css.matchAll(/(?::root,\s*)?\[data-mode='(\w+)'\]\s*\{([^}]*)\}/g)
  for (const [, blockMode, body] of blocks) {
    if (blockMode !== mode) continue
    for (const [, name, value] of body.matchAll(/--t-([\w-]+):\s*([^;]+);/g)) {
      values[name] = value.trim()
    }
  }
  return values
}

describe('los colores del pie de theme.css', () => {
  const BRAND_PAIRS = [
    ['discord-ink', 'discord'],
    ['discord-ink', 'discord-hi'],
    ['kofi-ink', 'kofi'],
    ['kofi-ink', 'kofi-hi'],
  ] as const

  it('el Discord es violeta, el Ko-fi dorado con tinta oscura, en los dos modos', () => {
    expect(modeValues('dark')).toMatchObject({
      discord: '#7c52e8',
      'discord-ink': '#ffffff',
      kofi: '#f2c14e',
      'kofi-hi': '#f6cf6e',
      'kofi-ink': '#241a00',
    })
    expect(modeValues('light')).toMatchObject({
      discord: '#6a42d8',
      'discord-ink': '#ffffff',
      kofi: '#f2c14e',
      'kofi-hi': '#f6cf6e',
      'kofi-ink': '#241a00',
    })
  })

  it('cada texto sobre su relleno, también al pasar el ratón, pasa el AA (4,5:1)', () => {
    for (const mode of MODES) {
      const values = modeValues(mode)
      for (const [fg, bg] of BRAND_PAIRS) {
        expect(
          contrastRatio(values[fg], values[bg]),
          `${mode}: ${fg} sobre ${bg}`,
        ).toBeGreaterThanOrEqual(4.5)
      }
      // Al pasar el ratón, un poco más claro.
      expect(contrastRatio('#ffffff', values['discord-hi']), mode).toBeLessThan(
        contrastRatio('#ffffff', values.discord),
      )
    }
  })

  it('expone los colores del pie como tokens semánticos', () => {
    const tokens = semanticTokens.map(({ token }) => token)
    for (const token of ['discord', 'discord-hi', 'discord-ink', 'kofi', 'kofi-hi', 'kofi-ink']) {
      expect(tokens).toContain(`--color-${token}`)
    }
  })
})

// Los ocho tonos de la variedad (opción D): cada elemento de una lista, una ficha o un
// apartado de la cabecera lleva uno, como texto de su título, borde o relleno. Iguales en
// todos los temas, por modo: vivos en el oscuro, hondos en el claro. on-hue es la tinta
// sobre un relleno de tono (el número de una misión del logro, la etiqueta de un Dofus).
describe('los tonos de theme.css', () => {
  const HUES = ['hue-1', 'hue-2', 'hue-3', 'hue-4', 'hue-5', 'hue-6', 'hue-7', 'hue-8'] as const
  const TEXT_GROUNDS = ['bg', 'surface'] as const

  it('son los del prototipo, con la tinta oscura en el modo oscuro y blanca en el claro', () => {
    expect(modeValues('dark')).toMatchObject({
      'hue-1': '#ff6b5a',
      'hue-2': '#f2c14e',
      'hue-3': '#b5e04a',
      'hue-4': '#5cb8ff',
      'hue-5': '#45cdb9',
      'hue-6': '#b08bff',
      'hue-7': '#ff9d47',
      'hue-8': '#ff7fb6',
      'on-hue': '#14110e',
    })
    expect(modeValues('light')).toMatchObject({
      'hue-1': '#c23a28',
      'hue-2': '#946400',
      'hue-3': '#4b7610',
      'hue-4': '#1d68ae',
      'hue-5': '#0f7a6a',
      'hue-6': '#6744c4',
      'hue-7': '#ad540c',
      'hue-8': '#b23672',
      'on-hue': '#ffffff',
    })
  })

  // Como texto, un tono va sobre el fondo o la superficie (los títulos de los apartados, el
  // antetítulo de una ficha). Sobre raised (el hover de una ficha, el hueco de un icono en
  // el modo claro) solo va como borde o marco, que pide 3:1: los tonos hondos del claro
  // bajan a 4,01 sobre el raised del Ocre.
  it('cada tono se lee como texto (4,5:1) sobre el fondo y la superficie de cada tema, y como borde (3:1) sobre raised', () => {
    for (const theme of THEMES) {
      for (const mode of MODES) {
        const hues = modeValues(mode)
        const values = palette[`${theme}-${mode}`]
        for (const hue of HUES) {
          for (const ground of TEXT_GROUNDS) {
            expect(
              contrastRatio(hues[hue], values[ground]),
              `${theme}-${mode}: ${hue} sobre ${ground}`,
            ).toBeGreaterThanOrEqual(4.5)
          }
          expect(
            contrastRatio(hues[hue], values.raised),
            `${theme}-${mode}: ${hue} sobre raised`,
          ).toBeGreaterThanOrEqual(3)
        }
      }
    }
  })

  it('la tinta on-hue se lee (4,5:1) sobre cada tono', () => {
    for (const mode of MODES) {
      const values = modeValues(mode)
      for (const hue of HUES) {
        expect(
          contrastRatio(values['on-hue'], values[hue]),
          `${mode}: on-hue sobre ${hue}`,
        ).toBeGreaterThanOrEqual(4.5)
      }
    }
  })

  it('expone los tonos como tokens semánticos', () => {
    const tokens = semanticTokens.map(({ token }) => token)
    for (const token of [...HUES, 'on-hue']) expect(tokens).toContain(`--color-${token}`)
  })
})
