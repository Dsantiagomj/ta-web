import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'

import { afterEach, beforeAll, describe, expect, it } from 'vitest'

import config from '@payload-config'

import { GOLDEN_PAGES } from '../../scripts/import/golden/catalog'
import { goldenOutput } from '../../scripts/import/golden/convert'
import { stableJson } from '../../scripts/import/golden/stable-json'
import { createHtmlToLexical, type LexicalState } from '../../scripts/import/rich-text'
import { parseHtml } from '../../scripts/import/squarespace/dom'
import { releaseDom } from '../../scripts/import/squarespace/dom'

// S-15: las 30 páginas de oro de la importación de Squarespace. Cada una pasa por su conversor
// (scripts/import/golden/convert.ts) y la salida tiene que ser la revisada, bloque a bloque,
// contra la página en vivo. Un cambio en un conversor que altere contenido real falla aquí.
// Además, la prosa de cada salida pasa a Lexical (scripts/import/rich-text.ts, lo que hace la
// carga) sin perder una letra ni un enlace.
// Si el cambio es el que se quería, o si pnpm import:golden-refresh trajo lo que Torre cambió
// en Squarespace, se revisa el diff y se acepta con pnpm test:import -u.

const FIXTURES = path.resolve(__dirname, '../fixtures/import-golden')

const slugsIn = (folder: string, extension: string) =>
  readdirSync(path.join(FIXTURES, folder))
    .filter((file) => file.endsWith(extension))
    .map((file) => file.slice(0, -extension.length))
    .sort()

type LexicalNode = {
  type: string
  text?: string
  fields?: { url?: string }
  children?: LexicalNode[]
}

/** Los HTML de la salida: la prosa que la carga pasa a Lexical. */
function htmlFragments(value: unknown): string[] {
  if (!value || typeof value !== 'object') return []
  return Object.entries(value).flatMap(([key, item]) =>
    key === 'html' && typeof item === 'string' ? [item] : htmlFragments(item),
  )
}

/** El texto de un nodo de Lexical, sin espacios: un salto de línea o un espacio no cuentan. */
const lexicalText = (node: LexicalNode): string =>
  node.type === 'text' ? (node.text ?? '') : (node.children ?? []).map(lexicalText).join('')

const lexicalLinks = (node: LexicalNode): string[] => [
  ...(node.type === 'link' || node.type === 'autolink' ? [node.fields?.url ?? ''] : []),
  ...(node.children ?? []).flatMap(lexicalLinks),
]

const withoutSpaces = (text: string) => text.replace(/[\s\u00a0]+/gu, '')

let toLexical: (html: string) => LexicalState

beforeAll(async () => {
  toLexical = await createHtmlToLexical(await config)
})

afterEach(async () => {
  // happy-dom retiene cada documento que parsea: se suelta entre página y página.
  await releaseDom()
})

describe('el catálogo de páginas de oro', () => {
  it('tiene 30 páginas, sin repetir, con su fuente y su salida revisada y nada más', () => {
    const slugs = GOLDEN_PAGES.map((page) => page.slug)
    expect(slugs).toHaveLength(30)
    expect(new Set(slugs).size).toBe(30)
    expect(slugsIn('pages', '.html')).toEqual([...slugs].sort())
    expect(slugsIn('expected', '.json')).toEqual([...slugs].sort())
  })
})

describe.each(GOLDEN_PAGES)('$kind $slug', (page) => {
  it('convierte como la salida revisada', async () => {
    const html = readFileSync(path.join(FIXTURES, 'pages', `${page.slug}.html`), 'utf8')
    await expect(stableJson(goldenOutput(page, html))).toMatchFileSnapshot(
      path.join(FIXTURES, 'expected', `${page.slug}.json`),
    )
  })

  it('su prosa pasa a Lexical sin perder texto ni enlaces', () => {
    const html = readFileSync(path.join(FIXTURES, 'pages', `${page.slug}.html`), 'utf8')
    for (const fragment of htmlFragments(goldenOutput(page, html))) {
      const root = toLexical(fragment).root as unknown as LexicalNode
      const source = parseHtml(`<div>${fragment}</div>`).body
      expect(withoutSpaces(lexicalText(root)), fragment).toBe(
        withoutSpaces(source.textContent ?? ''),
      )
      expect(lexicalLinks(root), fragment).toEqual(
        [...source.querySelectorAll('a[href]')].map((link) => link.getAttribute('href')),
      )
    }
  })
})
