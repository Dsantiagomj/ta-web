import { readFileSync } from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import { PAGE_CATALOG, type PageEntry } from '../../scripts/import/pages/catalog'
import { convertPage, type PagePiece } from '../../scripts/import/pages/convert'
import { parseHtml } from '../../scripts/import/squarespace/dom'
import { parsePage } from '../../scripts/import/squarespace/parse-page'

// Las páginas sueltas de Torre en Squarespace, recortadas en tests/fixtures/pages/: su texto,
// sus capturas y sus enlaces pasan a la página tal cual (regla de fidelidad: nada se pierde,
// se junta ni se reescribe). Solo su primer encabezado pasa a ser el título.

const fixture = (slug: string) =>
  readFileSync(path.resolve(__dirname, `../fixtures/pages/${slug}.html`), 'utf8')

const entry = (slug: string): PageEntry => {
  const found = PAGE_CATALOG.find((candidate) => candidate.slug === slug)
  if (!found) throw new Error(`Falta ${slug} en el catálogo`)
  return found
}

const LIVE = new Set(['emotes-global', 'emote-sealar-con-el-dedo', 'emote-soltar-los-gases'])
const live = (slug: string) => LIVE.has(slug)

const convert = (slug: string, overrides: Partial<PageEntry> = {}) =>
  convertPage(fixture(slug), { ...entry(slug), ...overrides }, live)

const html = (pieces: PagePiece[]) =>
  pieces.flatMap((piece) => (piece.type === 'html' ? [piece.html] : [])).join('')

const textOf = (markup: string) =>
  (parseHtml(`<div>${markup}</div>`).body.textContent ?? '').replace(/\s+/g, ' ').trim()

/** Todo el texto de la página de Squarespace, elemento a elemento, sin los vacíos. */
const sourceTexts = (slug: string) =>
  parsePage(fixture(slug)).blocks.flatMap((block) =>
    block.type === 'text' ? block.elements.map((element) => element.text).filter(Boolean) : [],
  )

describe('el catálogo de páginas', () => {
  it('lleva los emotes, los cómo llegar y las páginas legales con su slug de siempre', () => {
    expect(PAGE_CATALOG.map((page) => page.slug)).toEqual([
      'emotes-global',
      'emote-sealar-con-el-dedo',
      'emote-soltar-los-gases',
      'acceso-pandala-3',
      'camino-a-stim-power',
      'weyes-magos',
      'aviso-legal',
      'politica-de-cookies',
      'politica-de-privacidad',
    ])
  })

  it('las legales llegan En preparación; el resto, Publicada', () => {
    const preparing = PAGE_CATALOG.filter((page) => page.state === 'preparing')
    expect(preparing.map((page) => page.slug)).toEqual([
      'aviso-legal',
      'politica-de-cookies',
      'politica-de-privacidad',
    ])
  })

  it('cada emote cuelga de la página de los emotes', () => {
    for (const page of PAGE_CATALOG.filter((candidate) => candidate.slug.startsWith('emote-'))) {
      expect(page.parent, page.slug).toBe('emotes-global')
    }
  })
})

describe('convertPage', () => {
  it('el primer encabezado es el título: solo cambian las mayúsculas', () => {
    const page = convert('emote-sealar-con-el-dedo')
    expect(page.title).toBe('Señalar con el dedo')
    expect(textOf(html(page.pieces))).not.toContain('SEÑALAR CON EL DEDO')
    expect(page.oddities).toEqual([])
  })

  it('con un título que no es el encabezado, el encabezado se queda y se avisa', () => {
    const page = convert('emote-sealar-con-el-dedo', { title: 'Otro título' })
    expect(page.title).toBe('Otro título')
    expect(textOf(html(page.pieces))).toContain('SEÑALAR CON EL DEDO')
    expect(page.oddities).toEqual([
      'El título «Otro título» no es el encabezado de Torre («SEÑALAR CON EL DEDO»): el encabezado se queda en el texto',
    ])
  })

  it('el texto y las capturas siguen el orden de Torre', () => {
    const { pieces } = convert('emote-sealar-con-el-dedo')
    expect(pieces.map((piece) => piece.type)).toEqual(['html', 'image', 'image', 'html'])
    const [first, image] = pieces
    expect(textOf((first as { html: string }).html)).toBe(
      'Para conseguir este emote, simplemente debes pasar una vez la mazmorra de los Bworks, situada en [-5,10].',
    )
    expect(image).toEqual({
      type: 'image',
      url: 'https://images.squarespace-cdn.com/content/v1/67976884fd6bbb4c207d8c51/190871b1-b272-498d-8d22-e004756ab471/Captura+de+pantalla+2026-04-01+120739.png',
      alt: 'dofus torrente arcano. Mapa de un juego con iconos y personajes, incluyendo un símbolo de sonrisa y instrucciones para señalar con el dedo.',
    })
  })

  it.each(['emotes-global', 'emote-sealar-con-el-dedo', 'emote-soltar-los-gases', 'aviso-legal'])(
    'no se pierde ni se reescribe texto de Torre: %s',
    (slug) => {
      const page = convert(slug)
      const text = textOf(html(page.pieces))
      const [heading, ...rest] = sourceTexts(slug)
      expect(page.title.toLowerCase()).toBe(heading!.toLowerCase())
      let from = 0
      for (const piece of rest) {
        const at = text.indexOf(piece, from)
        expect(at, piece).toBeGreaterThanOrEqual(from)
        from = at + piece.length
      }
    },
  )

  it('las capturas no se pierden: todas, con su texto alternativo', () => {
    const page = convert('emote-soltar-los-gases')
    const images = parsePage(fixture('emote-soltar-los-gases')).blocks.filter(
      (block) => block.type === 'image',
    )
    expect(page.pieces.filter((piece) => piece.type === 'image')).toEqual(images)
  })

  it('los párrafos vacíos que usaba para hacer hueco no pasan', () => {
    const page = convert('emote-soltar-los-gases')
    expect(html(page.pieces)).not.toMatch(/<p[^>]*>\s*(<br\s*\/?>)?\s*<\/p>/)
  })

  it('sus enlaces a su web: relativos si este sitio ya enseña la página, si no a Squarespace', () => {
    const markup = html(convert('emotes-global').pieces)
    expect(markup).toContain('href="/emote-sealar-con-el-dedo"')
    expect(markup).toContain('href="/emote-soltar-los-gases"')
    expect(markup).toContain('href="https://www.torrentearcano.com/emote-dar-un-beso"')
  })

  it('los enlaces a otras webs no cambian', () => {
    expect(html(convert('aviso-legal').pieces)).toContain('href="https://torrentearcano.com"')
  })

  it('el SEO de Squarespace de Torre, si lo escribió', () => {
    expect(convert('emote-sealar-con-el-dedo').seo).toEqual({
      metaTitle: 'Emote: Señalar con el dedo | Aprende y consigue emotes ahora',
      metaDescription:
        'Descubre cómo obtener el emote de señalar con el dedo en Dofus y otras funciones del juego en Torrentearcano, tu guía no oficial. Explora tutoriales y consejos.',
    })
    // Sin título SEO propio (es el de la página) ni descripción, no hay SEO.
    expect(convert('aviso-legal').seo).toEqual({})
  })

  it('una descripción de más de 160 caracteres no se corta: se avisa y se deja vacía', () => {
    const long = 'a'.repeat(161)
    const source = fixture('emotes-global').replace(
      /<meta name="description" content="[^"]*">/,
      `<meta name="description" content="${long}">`,
    )
    const page = convertPage(source, entry('emotes-global'), live)
    expect(page.seo.metaDescription).toBeUndefined()
    expect(page.oddities).toContain(
      'La descripción SEO de Squarespace pasa de 160 caracteres: no se importa',
    )
  })
})
