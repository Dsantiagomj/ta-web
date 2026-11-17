import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import { BAR_COLORS, themeViewport } from '@/lib/theme/theme-color'
import { readPalette } from '@/lib/theme/palette'
import { MODES, THEMES } from '@/lib/theme/theme'

// El color de la barra del navegador en el móvil (<meta name="theme-color">) es el de la barra
// de la cabecera, --color-bar, en el tema y el modo que pinta el servidor.

const palette = readPalette(readFileSync('src/styles/theme.css', 'utf8'))

describe('BAR_COLORS', () => {
  it('es el --t-bar de cada tema y modo de theme.css', () => {
    for (const theme of THEMES) {
      for (const mode of MODES) {
        expect(BAR_COLORS[`${theme}-${mode}`], `${theme}-${mode}`).toBe(
          palette[`${theme}-${mode}`].bar,
        )
      }
    }
  })
})

describe('themeViewport', () => {
  it('da el color de la barra y el esquema del modo', () => {
    expect(themeViewport('amakna', 'dark')).toEqual({ themeColor: '#000000', colorScheme: 'dark' })
    expect(themeViewport('bonta', 'light')).toEqual({
      themeColor: palette['bonta-light'].bar,
      colorScheme: 'light',
    })
  })
})
