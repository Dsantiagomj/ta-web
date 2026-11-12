import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

// Las medidas van en rem (px ÷ 16) para que toda la interfaz escale con la fuente raíz;
// solo los filetes por debajo de 3px se quedan en px, para que sigan nítidos (DESIGN.md,
// Tokens).

const HAIRLINE_LIMIT = 3

function filesUnder(dir: string, extension: string): string[] {
  return readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(extension))
    .map((entry) => join(entry.parentPath, entry.name))
    .sort()
}

/** Cambia los comentarios por espacios del mismo largo, para no mover las líneas. */
function withoutComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, (comment) => comment.replace(/[^\n]/g, ' '))
}

function lineOf(text: string, index: number): number {
  return text.slice(0, index).split('\n').length
}

/** Los px de 3 o más en un texto, como `archivo:línea valor`. */
function thickPx(file: string, text: string, pattern: RegExp): string[] {
  return [...text.matchAll(pattern)]
    .filter((match) => Math.abs(Number(match[1])) >= HAIRLINE_LIMIT)
    .map((match) => `${file}:${lineOf(text, match.index)} ${match[0].trim()}`)
}

const PX_IN_CSS = /(?<![\w.#-])(-?\d*\.?\d+)px\b/g

const cssFiles = filesUnder('src', '.css')

describe('unidades del CSS', () => {
  it('lee las hojas de estilo de src', () => {
    expect(cssFiles).toContain(join('src', 'styles', 'theme.css'))
  })

  it('el CSS escrito a mano no usa px de 3 o más: van en rem', () => {
    const offenders = cssFiles.flatMap((file) =>
      thickPx(file, withoutComments(readFileSync(file, 'utf8')), PX_IN_CSS),
    )
    expect(offenders).toEqual([])
  })

  it('distingue un filete de una medida', () => {
    const css = '.a { border: 1px solid; outline-offset: 2.5px; padding: 3px 12px; inset: -4px }'
    expect(thickPx('a.css', css, PX_IN_CSS)).toEqual([
      'a.css:1 3px',
      'a.css:1 12px',
      'a.css:1 -4px',
    ])
  })
})
