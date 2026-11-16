import type { Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import type { SectionPageEntry } from '../../scripts/import/section-pages/catalog'
import type { ConvertedClassPage } from '../../scripts/import/section-pages/convert'
import {
  loadSectionPages,
  type LoadSectionPagesOptions,
} from '../../scripts/import/section-pages/load'
import { createHtmlToLexical } from '../../scripts/import/rich-text'

import { startPayload, tinyPng } from './payload'

// La importación de las páginas de clase y de mazmorra (pnpm import:section-pages): crea las
// que faltan como borrador En preparación, con su enlace a Squarespace, y al repetirla no
// cambia nada ni pisa lo que Torre cambió en el panel.

const PREFIX = 'importar-seccion-'
const BUILD_URL = 'https://images.squarespace-cdn.com/content/v1/prueba/fuego.png'
const SHOT_URL = 'https://images.squarespace-cdn.com/content/v1/prueba/jefe.png'
const DOFUSBOOK = 'https://www.dofusbook.net/fr/membre/464797-huz/equipements?include=feu-pvm'

let payload: Payload
let htmlToLexical: LoadSectionPagesOptions['htmlToLexical']
let mediaId = 0
const mediaIds: number[] = []

const slug = (name: string) => `${PREFIX}${name}`

const classEntry: SectionPageEntry = { slug: slug('feca'), title: 'Feca', inMenu: true }
const dungeonEntry: SectionPageEntry = { slug: slug('jefe'), title: 'Gruñente', inMenu: false }

const classPage = (): ConvertedClassPage => ({
  title: 'Feca',
  pieces: [],
  seo: {},
  oddities: [],
  builds: {
    pvm: [{ url: BUILD_URL, alt: 'Fuego', link: DOFUSBOOK }],
    pvp: [{ url: BUILD_URL, alt: 'Fuego' }],
  },
})

function load(collection: 'class-pages' | 'dungeon-pages', apply: boolean) {
  const pages =
    collection === 'class-pages'
      ? [{ entry: classEntry, page: classPage() }]
      : [
          {
            entry: dungeonEntry,
            page: {
              title: 'Gruñente',
              pieces: [
                { type: 'html' as const, html: '<p>Tiene 200% de resistencias.</p>' },
                { type: 'image' as const, url: SHOT_URL, alt: 'El jefe' },
              ],
              seo: {},
              oddities: [],
            },
          },
        ]
  return loadSectionPages(payload, {
    collection,
    pages,
    apply,
    htmlToLexical,
    mediaFor: async () => mediaId,
  })
}

const find = async (collection: 'class-pages' | 'dungeon-pages', name: string) =>
  (
    await payload.find({
      collection,
      where: { slug: { equals: slug(name) } },
      depth: 0,
      draft: true,
      limit: 1,
      overrideAccess: true,
    })
  ).docs[0] as unknown as Record<string, unknown> | undefined

async function cleanUp() {
  for (const collection of ['class-pages', 'dungeon-pages'] as const) {
    await payload.delete({ collection, where: { slug: { like: PREFIX } }, overrideAccess: true })
  }
}

beforeAll(async () => {
  payload = await startPayload()
  await cleanUp()
  htmlToLexical = await createHtmlToLexical(payload.config)
  const media = await payload.create({
    collection: 'media',
    data: { alt: 'Prueba' },
    file: tinyPng(),
    overrideAccess: true,
  })
  mediaId = media.id
  mediaIds.push(media.id)
})

afterAll(async () => {
  await cleanUp()
  for (const id of mediaIds) await payload.delete({ collection: 'media', id, overrideAccess: true })
})

describe('importar las páginas de clase y de mazmorra', () => {
  it('en seco cuenta lo que haría sin escribir nada', async () => {
    const report = await load('class-pages', false)
    expect(report.created).toEqual([slug('feca')])
    expect(report.images).toBe(2)
    expect(await find('class-pages', 'feca')).toBeUndefined()
  })

  it('crea la clase como borrador En preparación, con sus builds y su enlace a Squarespace', async () => {
    await load('class-pages', true)
    const doc = await find('class-pages', 'feca')
    expect(doc).toMatchObject({
      title: 'Feca',
      state: 'preparing',
      inMenu: true,
      _status: 'draft',
      legacyHref: `https://www.torrentearcano.com/${slug('feca')}`,
    })
    expect(doc?.pvmBuilds).toEqual([expect.objectContaining({ image: mediaId, link: DOFUSBOOK })])
    expect(doc?.pvpBuilds).toEqual([expect.objectContaining({ image: mediaId })])
    expect((doc?.pvpBuilds as { link?: string }[])[0]?.link ?? null).toBeNull()
    const visitor = await payload.find({
      collection: 'class-pages',
      where: { slug: { equals: slug('feca') } },
      overrideAccess: false,
    })
    expect(visitor.docs).toEqual([])
  })

  it('crea la mazmorra con su texto y su captura, fuera del menú si el catálogo lo dice', async () => {
    await load('dungeon-pages', true)
    const doc = await find('dungeon-pages', 'jefe')
    expect(doc).toMatchObject({ title: 'Gruñente', inMenu: false, state: 'preparing' })
    expect((doc?.body as { blockType: string }[]).map((block) => block.blockType)).toEqual([
      'richText',
      'image',
    ])
  })

  it('repetida, no cambia nada', async () => {
    const report = await load('class-pages', true)
    expect(report).toMatchObject({ created: [], updated: [], unchanged: [slug('feca')] })
  })

  it('no pisa lo que Torre cambió en el panel', async () => {
    const doc = await find('class-pages', 'feca')
    await payload.update({
      collection: 'class-pages',
      id: doc!.id as number,
      data: { title: 'Feca de Torre', _status: 'draft' },
      draft: true,
      overrideAccess: true,
    })
    const report = await load('class-pages', true)
    expect(report.kept).toEqual([{ slug: slug('feca'), field: 'title' }])
    expect((await find('class-pages', 'feca'))?.title).toBe('Feca de Torre')
  })
})
