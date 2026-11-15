import { describe, expect, it } from 'vitest'

import { legalLinks, searchIndex } from '@/components/site/nav'
import { checklistRoute } from '@/lib/checklists/page'
import {
  pageNavItems,
  sitePageBreadcrumb,
  sitePageRoute,
  sitePageSeo,
  type SitePageDoc,
} from '@/lib/pages/page'
import { legacyRoute } from '@/lib/site/legacy'

// Las páginas sueltas (backlog B-09): qué hace /<slug>, sus metadatos, sus migas y los
// enlaces del sitio, que llevan a Squarespace mientras están En preparación (B-01, B-10).

const SITE = 'https://ta-web.example'
const LEGACY = 'https://www.torrentearcano.com/aviso-legal'

const text = (value: string) => ({ type: 'text', text: value, version: 1 })
const paragraph = (...values: string[]) => ({
  type: 'paragraph',
  version: 1,
  children: values.map(text),
})
const richText = (...children: object[]) =>
  ({ root: { type: 'root', version: 1, children } }) as never

const page = (overrides: Partial<SitePageDoc> = {}): SitePageDoc => ({
  title: 'Señalar con el dedo',
  slug: 'emote-sealar-con-el-dedo',
  state: 'published',
  ...overrides,
})

describe('sitePageRoute', () => {
  it('Publicada tiene página; la vista previa del panel siempre la pinta', () => {
    expect(sitePageRoute(page(), false, SITE)).toEqual({ kind: 'page' })
    expect(sitePageRoute(page({ state: 'preparing' }), true, SITE)).toEqual({ kind: 'page' })
  })

  it('En preparación lleva a su página de Squarespace', () => {
    expect(sitePageRoute(page({ state: 'preparing', legacyHref: LEGACY }), false, SITE)).toEqual({
      kind: 'legacy',
      href: LEGACY,
    })
  })

  it('sin enlace, o con uno a esta misma web (daría vueltas), no hay página', () => {
    expect(sitePageRoute(page({ state: 'preparing' }), false, SITE)).toEqual({ kind: 'none' })
    expect(
      sitePageRoute(page({ state: 'preparing', legacyHref: `${SITE}/aviso-legal` }), false, SITE),
    ).toEqual({ kind: 'none' })
    expect(
      sitePageRoute(page({ state: 'preparing', legacyHref: 'no es una url' }), false, SITE),
    ).toEqual({ kind: 'none' })
  })

  it('es la misma regla que la de las checklists', () => {
    const doc = { state: 'preparing' as const, legacyHref: LEGACY }
    expect(checklistRoute(doc, false, SITE)).toEqual(legacyRoute(doc, false, SITE))
  })
})

describe('sitePageSeo', () => {
  it('el título y la descripción SEO de Torre ganan', () => {
    const seo = sitePageSeo(
      page({
        seo: { metaTitle: 'Emote: Señalar con el dedo', metaDescription: 'Cómo se consigue.' },
      }),
    )
    expect(seo).toEqual({ title: 'Emote: Señalar con el dedo', description: 'Cómo se consigue.' })
  })

  it('sin ellos, el título de la página y el principio de su texto', () => {
    const seo = sitePageSeo(
      page({
        body: [
          { blockType: 'image', image: 1 },
          {
            blockType: 'richText',
            content: richText(
              paragraph('Para conseguir este emote, ', 'pasa una vez la mazmorra.'),
              paragraph('Luego escribe /point.'),
            ),
          },
        ] as never,
      }),
    )
    expect(seo).toEqual({
      title: 'Señalar con el dedo',
      description: 'Para conseguir este emote, pasa una vez la mazmorra. Luego escribe /point.',
    })
  })

  it('el texto del primer paso cuenta si la página empieza por él', () => {
    const seo = sitePageSeo(
      page({
        body: [
          {
            blockType: 'step',
            body: [{ blockType: 'richText', content: richText(paragraph('Entra por la puerta.')) }],
          },
        ] as never,
      }),
    )
    expect(seo.description).toBe('Entra por la puerta.')
  })

  it('una descripción larga se corta en una palabra, con puntos suspensivos, en 160', () => {
    const long = 'palabra '.repeat(40).trim()
    const { description } = sitePageSeo(
      page({ body: [{ blockType: 'richText', content: richText(paragraph(long)) }] as never }),
    )
    expect(description.length).toBeLessThanOrEqual(160)
    expect(description.endsWith('palabra…')).toBe(true)
  })

  it('sin texto, la descripción es el título', () => {
    expect(sitePageSeo(page()).description).toBe('Señalar con el dedo')
  })
})

describe('sitePageBreadcrumb', () => {
  it('sin página superior, el padre es la portada', () => {
    const crumbs = sitePageBreadcrumb(page({ title: 'Aviso legal', slug: 'aviso-legal' }), SITE)
    expect(crumbs.parents).toEqual([{ name: 'Inicio', href: '/' }])
    expect(crumbs.jsonLd.itemListElement.map((item) => item.item)).toEqual([
      `${SITE}/`,
      `${SITE}/aviso-legal`,
    ])
  })

  it('con una página superior que se ve, va por ella', () => {
    const parent = { title: 'Emotes', slug: 'emotes-global', state: 'published' as const }
    expect(sitePageBreadcrumb(page({ parent }), SITE).parents).toEqual([
      { name: 'Inicio', href: '/' },
      { name: 'Emotes', href: '/emotes-global' },
    ])
  })

  it('una página superior En preparación o sin poblar no sale', () => {
    const parent = { title: 'Emotes', slug: 'emotes-global', state: 'preparing' as const }
    expect(sitePageBreadcrumb(page({ parent }), SITE).parents).toHaveLength(1)
    expect(sitePageBreadcrumb(page({ parent: 3 }), SITE).parents).toHaveLength(1)
  })
})

describe('pageNavItems y los enlaces legales del pie', () => {
  const items = pageNavItems([
    { title: 'Aviso Legal', slug: 'aviso-legal', state: 'preparing', legacyHref: LEGACY },
    { title: 'Política de Privacidad', slug: 'politica-de-privacidad', state: 'published' },
    { title: 'Sin enlace', slug: 'sin-enlace', state: 'preparing' },
  ])

  it('Publicada enlaza su página; En preparación, Squarespace si lo tiene', () => {
    expect(items).toEqual([
      { name: 'Aviso Legal', slug: 'aviso-legal', href: LEGACY, legacy: true },
      {
        name: 'Política de Privacidad',
        slug: 'politica-de-privacidad',
        href: '/politica-de-privacidad',
      },
      { name: 'Sin enlace', slug: 'sin-enlace' },
    ])
  })

  it('el pie enlaza la página publicada y, si no, la de Squarespace con su slug', () => {
    expect(legalLinks(items)).toEqual([
      { name: 'Aviso legal', href: LEGACY },
      { name: 'Política de cookies', href: 'https://www.torrentearcano.com/politica-de-cookies' },
      { name: 'Política de privacidad', href: '/politica-de-privacidad' },
    ])
  })

  it('sin páginas, los tres van a Squarespace como hasta ahora', () => {
    expect(legalLinks([]).map((link) => link.href)).toEqual([
      'https://www.torrentearcano.com/aviso-legal',
      'https://www.torrentearcano.com/politica-de-cookies',
      'https://www.torrentearcano.com/politica-de-privacidad',
    ])
  })

  it('la búsqueda encuentra las páginas publicadas, no las de Squarespace', () => {
    const pages = searchIndex([], [], items).filter((entry) => entry.type === 'pagina')
    expect(pages).toEqual([
      { type: 'pagina', name: 'Política de Privacidad', href: '/politica-de-privacidad' },
    ])
  })
})
