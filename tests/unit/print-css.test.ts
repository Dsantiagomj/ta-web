import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import { readPalette } from '@/lib/theme/palette'

// Al imprimir (globals.css, @media print): la guía sale en claro sobre blanco, sea cual sea el
// tema o el modo de la pantalla, y sin lo que solo sirve en pantalla (cabecera, pie, partículas,
// selector de tema, fondo de zona).

const theme = readFileSync('src/styles/theme.css', 'utf8')
const globals = readFileSync('src/styles/globals.css', 'utf8')
const palette = readPalette(theme)

const printBlock = globals.slice(globals.indexOf('@media print'))

/** Los valores --t-* de un bloque de texto. */
const values = (text: string) =>
  Object.fromEntries(
    [...text.matchAll(/--t-([\w-]+):\s*([^;]+);/g)].map(([, n, v]) => [n, v.trim()]),
  )

/** Los del modo claro que no dependen del tema (los bloques [data-mode='light'] sueltos). */
function lightShared() {
  const out: Record<string, string> = {}
  for (const [, body] of theme.matchAll(/\n\[data-mode='light'\]\s*\{([^}]*)\}/g)) {
    Object.assign(out, values(body))
  }
  return out
}

describe('la hoja de impresión', () => {
  it('existe en globals.css, sin una hoja más', () => {
    expect(globals).toContain('@media print')
  })

  it('fuerza los tokens claros de Amakna, con el fondo y las superficies en blanco', () => {
    const tokens = values(printBlock)
    const expected = { ...lightShared(), ...palette['amakna-light'] }
    for (const [name, value] of Object.entries(expected)) {
      const want = ['bg', 'surface', 'bar'].includes(name) ? '#ffffff' : value
      expect(tokens[name], name).toBe(want)
    }
    expect(printBlock).toMatch(/color-scheme:\s*light/)
  })

  it('esconde la cabecera, el pie, las partículas, el selector de tema, el fondo de zona y el Ko-fi flotante', () => {
    for (const selector of [
      '.site-hdr',
      '.site-ft',
      '.amb',
      '.tp',
      '.zone-bg',
      '.skip-link',
      '.kofi-dock',
    ]) {
      expect(printBlock, selector).toContain(selector)
    }
    expect(printBlock).toMatch(/display:\s*none\s*!important/)
  })

  it('imprime la tabla entera: sin desplazamiento, sin columna fija y sin partir una fila', () => {
    const rule = (selector: string) => {
      const at = printBlock.indexOf(selector)
      expect(at, selector).toBeGreaterThan(-1)
      return printBlock.slice(at, printBlock.indexOf('}', at))
    }
    // :root delante: game.css se carga después y ganaría con la misma especificidad.
    expect(rule(':root .gtable .gtable__scroll {')).toMatch(/overflow:\s*visible/)
    expect(rule(':root .gtable .gtable__table :is(th, td)')).toMatch(/position:\s*static/)
    expect(rule(':root .gtable .gtable__table tr')).toMatch(/break-inside:\s*avoid/)
  })
})
