import { describe, expect, it } from 'vitest'

import { sitemapEntries, type SitemapData } from '@/lib/seo/sitemap'

// /sitemap.xml (backlog B-02): lo publicado que un visitante puede abrir, con su fecha de
// cambio. Nada de borradores, nada En preparación, nada del panel ni de la API.

const SITE = 'https://www.torrentearcano.com'

const data = (extra: Partial<SitemapData> = {}): SitemapData => ({
  questGuides: [
    { slug: 'aprendizaje-escudero', updatedAt: '2026-11-01T10:00:00.000Z' },
    { slug: 'borrador', updatedAt: '2026-11-12T10:00:00.000Z', _status: 'draft' },
  ],
  achievementPages: [
    {
      slug: 'la-larga-marcha',
      updatedAt: '2026-11-02T10:00:00.000Z',
      state: 'published',
      grouped: true,
    },
    {
      slug: 'correccional',
      updatedAt: '2026-11-11T10:00:00.000Z',
      state: 'preparing',
      grouped: true,
    },
    // Sin metalogro: el índice no la enseña, así que no mueve su fecha.
    { slug: 'suelta', updatedAt: '2026-11-12T10:00:00.000Z', state: 'published', grouped: false },
  ],
  achievementGroups: [{ updatedAt: '2026-11-03T10:00:00.000Z' }],
  dofusGuides: [
    { slug: 'dofus-ocre', updatedAt: '2026-11-04T10:00:00.000Z', state: 'published' },
    { slug: 'jyfus', updatedAt: '2026-11-05T10:00:00.000Z', state: 'preparing' },
  ],
  dofusIndexUpdatedAt: '2026-11-06T10:00:00.000Z',
  checklists: [
    { slug: 'checklist-nebuloso', updatedAt: '2026-11-07T10:00:00.000Z', state: 'published' },
    { slug: 'checklist-silvestre', updatedAt: '2026-11-08T10:00:00.000Z', state: 'preparing' },
  ],
  ...extra,
})

const urls = (d: SitemapData) => sitemapEntries(d, SITE).map((entry) => entry.url)

describe('sitemapEntries', () => {
  it('lleva la portada, los índices y cada página publicada, con URL absolutas', () => {
    expect(urls(data())).toEqual([
      `${SITE}/`,
      `${SITE}/metalogros`,
      `${SITE}/guias-dofus`,
      `${SITE}/checklists`,
      `${SITE}/aprendizaje-escudero`,
      `${SITE}/la-larga-marcha`,
      `${SITE}/suelta`,
      `${SITE}/dofus-ocre`,
      `${SITE}/checklist-nebuloso`,
    ])
  })

  it('deja fuera los borradores y lo En preparación', () => {
    const list = urls(data())
    for (const slug of ['borrador', 'correccional', 'jyfus', 'checklist-silvestre']) {
      expect(list).not.toContain(`${SITE}/${slug}`)
    }
  })

  it('nunca lleva el panel, la API, el catálogo ni la vista previa', () => {
    const list = urls(
      data({
        questGuides: [
          { slug: 'admin', updatedAt: '2026-11-01T10:00:00.000Z' },
          { slug: 'api', updatedAt: '2026-11-01T10:00:00.000Z' },
          { slug: 'sistema', updatedAt: '2026-11-01T10:00:00.000Z' },
          { slug: 'vista-previa', updatedAt: '2026-11-01T10:00:00.000Z' },
          { slug: 'Mal Slug', updatedAt: '2026-11-01T10:00:00.000Z' },
        ],
      }),
    )
    expect(list.filter((url) => /admin|api|sistema|vista-previa|Mal/.test(url))).toEqual([])
  })

  it('cada página lleva su fecha de cambio', () => {
    const entries = sitemapEntries(data(), SITE)
    const at = (path: string) => entries.find((entry) => entry.url === `${SITE}${path}`)

    expect(at('/aprendizaje-escudero')?.lastModified).toEqual(new Date('2026-11-01T10:00:00.000Z'))
    expect(at('/checklist-nebuloso')?.lastModified).toEqual(new Date('2026-11-07T10:00:00.000Z'))
  })

  it('un índice cambia con lo último que muestra; la portada, con lo último del sitio', () => {
    const entries = sitemapEntries(data(), SITE)
    const at = (path: string) => entries.find((entry) => entry.url === `${SITE}${path}`)

    // /metalogros enseña lo En preparación de sus metalogros (apagado): cuenta. Una página sin
    // metalogro no sale en el índice: no cuenta. Los borradores tampoco.
    expect(at('/metalogros')?.lastModified).toEqual(new Date('2026-11-11T10:00:00.000Z'))
    expect(at('/guias-dofus')?.lastModified).toEqual(new Date('2026-11-06T10:00:00.000Z'))
    expect(at('/checklists')?.lastModified).toEqual(new Date('2026-11-08T10:00:00.000Z'))
    expect(at('/')?.lastModified).toEqual(new Date('2026-11-11T10:00:00.000Z'))
  })

  it('sin contenido, los índices van sin fecha', () => {
    const empty = sitemapEntries(
      {
        questGuides: [],
        achievementPages: [],
        achievementGroups: [],
        dofusGuides: [],
        dofusIndexUpdatedAt: null,
        checklists: [],
      },
      SITE,
    )
    expect(empty.map((entry) => entry.url)).toEqual([
      `${SITE}/`,
      `${SITE}/metalogros`,
      `${SITE}/guias-dofus`,
      `${SITE}/checklists`,
    ])
    expect(empty.every((entry) => entry.lastModified === undefined)).toBe(true)
  })

  it('nunca lleva una URL que el proxy redirige o da por desaparecida', () => {
    const list = urls(
      data({
        questGuides: [
          { slug: 'home', updatedAt: '2026-11-01T10:00:00.000Z' },
          { slug: 'cart', updatedAt: '2026-11-01T10:00:00.000Z' },
          { slug: 'corazon-de-piedra', updatedAt: '2026-11-01T10:00:00.000Z' },
          { slug: 'aprendizaje-escudero', updatedAt: '2026-11-01T10:00:00.000Z' },
        ],
      }),
    )
    expect(list).not.toContain(`${SITE}/home`)
    expect(list).not.toContain(`${SITE}/cart`)
    expect(list).not.toContain(`${SITE}/corazon-de-piedra`)
    expect(list).toContain(`${SITE}/aprendizaje-escudero`)
  })

  it('no repite una URL', () => {
    const list = urls(
      data({
        questGuides: [
          { slug: 'repetida', updatedAt: '2026-11-01T10:00:00.000Z' },
          { slug: 'repetida', updatedAt: '2026-11-02T10:00:00.000Z' },
        ],
      }),
    )
    expect(list.filter((url) => url.endsWith('/repetida'))).toHaveLength(1)
  })
})
