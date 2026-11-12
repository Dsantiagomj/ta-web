import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

// Las medidas van en rem (px ÷ 16) para que toda la interfaz escale con la fuente raíz;
// solo los filetes por debajo de 3px se quedan en px, para que sigan nítidos (DESIGN.md,
// Tokens). Y los estilos inline solo pasan datos al CSS como propiedades personalizadas
// (AGENTS.md, Next rules).

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
// Las clases arbitrarias de Tailwind con px: `size-[42px]`, `grid-cols-[240px_1fr]`.
const PX_IN_CLASS = /\[[^\]\s'"`]*?(?<![\w.#-])(-?\d*\.?\d+)px[^\]\s'"`]*\]/g

/** Las claves de cada `style={{ … }}` escrito en línea. */
function inlineStyleKeys(source: string): { index: number; keys: string[] }[] {
  const found: { index: number; keys: string[] }[] = []
  for (const match of source.matchAll(/style=\{\{/g)) {
    // Hasta la llave que cierra el objeto, aunque detrás venga `as CSSProperties`.
    const start = match.index + match[0].length
    let depth = 1
    let end = start
    while (end < source.length && depth > 0) {
      if (source[end] === '{') depth++
      if (source[end] === '}') depth--
      end++
    }
    const body = source.slice(start, end - 1)
    const keys = [...body.matchAll(/(?:^|,)\s*(['"]?)([\w-]+)\1\s*:/g)].map((key) => key[2])
    found.push({ index: match.index, keys })
  }
  return found
}

const cssFiles = filesUnder('src', '.css')
const tsxFiles = filesUnder('src', '.tsx')

describe('unidades del CSS', () => {
  it('lee las hojas de estilo y los componentes de src', () => {
    expect(cssFiles).toContain(join('src', 'styles', 'theme.css'))
    expect(tsxFiles.length).toBeGreaterThan(20)
  })

  it('el CSS escrito a mano no usa px de 3 o más: van en rem', () => {
    const offenders = cssFiles.flatMap((file) =>
      thickPx(file, withoutComments(readFileSync(file, 'utf8')), PX_IN_CSS),
    )
    expect(offenders).toEqual([])
  })

  it('las clases arbitrarias de Tailwind no usan px de 3 o más', () => {
    const offenders = tsxFiles.flatMap((file) =>
      thickPx(file, readFileSync(file, 'utf8'), PX_IN_CLASS),
    )
    expect(offenders).toEqual([])
  })

  // Dentro de un SVG con transform-box: view-box, transform-origin se mide en unidades del
  // viewBox: en rem el pivote se movería al subir la fuente raíz. Va en porcentajes.
  it('el pivote de una parte de un SVG va en porcentajes del viewBox, no en rem', () => {
    const offenders = cssFiles.flatMap((file) => {
      const css = withoutComments(readFileSync(file, 'utf8'))
      return [...css.matchAll(/\{[^{}]*transform-box:\s*view-box[^{}]*\}/g)]
        .filter((rule) => /transform-origin:[^;]*\d(rem|em)\b/.test(rule[0]))
        .map((rule) => `${file}:${lineOf(css, rule.index)}`)
    })
    expect(offenders).toEqual([])
  })

  it('distingue un filete de una medida', () => {
    const css = '.a { border: 1px solid; outline-offset: 2.5px; padding: 3px 12px; inset: -4px }'
    expect(thickPx('a.css', css, PX_IN_CSS)).toEqual([
      'a.css:1 3px',
      'a.css:1 12px',
      'a.css:1 -4px',
    ])
    expect(thickPx('a.tsx', 'className="border-[1.5px] size-[42px]"', PX_IN_CLASS)).toEqual([
      'a.tsx:1 [42px]',
    ])
  })
})

describe('estilos inline', () => {
  it('solo pasan propiedades personalizadas al CSS', () => {
    const offenders = tsxFiles.flatMap((file) => {
      const source = readFileSync(file, 'utf8')
      return inlineStyleKeys(source)
        .filter(({ keys }) => keys.some((key) => !key.startsWith('--')))
        .map(({ index, keys }) => `${file}:${lineOf(source, index)} ${keys.join(', ')}`)
    })
    expect(offenders).toEqual([])
  })

  it('lee las claves de un objeto de estilo', () => {
    const source = `<b style={{ '--x': orb.x, whiteSpace: 'pre-line', "--dy": \`\${dy}rem\` }} />`
    expect(inlineStyleKeys(source)).toEqual([{ index: 3, keys: ['--x', 'whiteSpace', '--dy'] }])
  })
})
