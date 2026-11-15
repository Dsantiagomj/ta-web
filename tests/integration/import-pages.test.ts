import type { Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { liveSiteSlugs } from '../../scripts/import/live-slugs'
import type { PageEntry } from '../../scripts/import/pages/catalog'
import type { ConvertedPage } from '../../scripts/import/pages/convert'
import { loadSitePages, type LoadSitePagesOptions } from '../../scripts/import/pages/load'
import { ImageDownloadError } from '../../scripts/import/media-by-url'
import { createHtmlToLexical } from '../../scripts/import/rich-text'

import { startPayload } from './payload'

// La importación de las páginas sueltas de Torre (pnpm import:pages): crea las que faltan,
// las legales En preparación con su enlace a Squarespace, y al repetirla no cambia nada ni
// pisa lo que Torre cambió en el panel.

const PREFIX = 'importar-pagina-'
const IMAGE_URL = 'https://images.squarespace-cdn.com/content/v1/prueba/emote.png'
const BROKEN_URL = 'https://images.squarespace-cdn.com/content/v1/prueba/caida.png'

let payload: Payload
let htmlToLexical: LoadSitePagesOptions['htmlToLexical']
let mediaId = 0

const slug = (name: string) => `${PREFIX}${name}`

const ENTRIES: PageEntry[] = [
  { slug: slug('emotes'), title: 'Emotes', state: 'published' },
  { slug: slug('beso'), title: 'Dar un beso', state: 'published', parent: slug('emotes') },
  { slug: slug('aviso'), title: 'Aviso Legal', state: 'preparing' },
]

const converted = (overrides: Record<string, ConvertedPage | null> = {}) =>
  ENTRIES.map((entry) => {
    const pages: Record<string, ConvertedPage | null> = {
      [slug('emotes')]: {
        title: 'Emotes',
        pieces: [{ type: 'html', html: '<p>Aquí tienes TODOS los emotes.</p>' }],
        seo: { metaTitle: 'EMOTES GLOBAL | Descubre y Usa Emotes Ahora' },
        oddities: [],
      },
      [slug('beso')]: {
        title: 'Dar un beso',
        pieces: [
          { type: 'html', html: '<p>Habla con Don Huan.</p>' },
          { type: 'image', url: IMAGE_URL, alt: 'Don Huan' },
          { type: 'video', url: 'https://www.youtube.com/watch?v=ovPAxnBdKYQ' },
        ],
        seo: {},
        oddities: [],
      },
      [slug('aviso')]: {
        title: 'Aviso Legal',
        pieces: [{ type: 'html', html: '<p>Este sitio web muestra publicidad.</p>' }],
        seo: {},
        oddities: [],
      },
      ...overrides,
    }
    return { entry, page: pages[entry.slug] ?? null }
  })

const requests: { url: string; upload: boolean }[] = []
/** Lo ya subido: como mediaByUrl, sin upload se encuentra por su URL de origen. */
const uploaded = new Set<string>()

function load(apply: boolean, pages = converted(), overrides: Partial<LoadSitePagesOptions> = {}) {
  return loadSitePages(payload, {
    pages,
    apply,
    htmlToLexical,
    mediaFor: async (url, _alt, { upload }) => {
      requests.push({ url, upload })
      if (url === BROKEN_URL) throw new ImageDownloadError('404')
      if (upload) uploaded.add(url)
      return uploaded.has(url) ? mediaId : null
    },
    log: (message) => process.env.DEBUG_IMPORT && console.log(message),
    ...overrides,
  })
}

const find = async (name: string) =>
  (
    await payload.find({
      collection: 'pages',
      where: { slug: { equals: slug(name) } },
      depth: 0,
      draft: true,
      limit: 1,
      overrideAccess: true,
    })
  ).docs[0]

async function cleanUp() {
  for (const collection of ['pages', 'quest-guides'] as const) {
    await payload.delete({ collection, where: { slug: { like: PREFIX } }, overrideAccess: true })
  }
}

beforeAll(async () => {
  payload = await startPayload()
  htmlToLexical = await createHtmlToLexical(payload.config)
  await cleanUp()
  const media = await payload.find({ collection: 'media', limit: 1, depth: 0 })
  mediaId =
    media.docs[0]?.id ??
    (
      await payload.create({
        collection: 'media',
        data: { alt: 'Captura de prueba' },
        file: {
          data: Buffer.from(
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
            'base64',
          ),
          mimetype: 'image/png',
          name: 'importar-pagina.png',
          size: 68,
        },
      })
    ).id
})

afterAll(async () => {
  await cleanUp()
})

describe('loadSitePages', () => {
  it('en seco cuenta lo que crearía y no escribe ni sube nada', async () => {
    requests.length = 0
    const report = await load(false)
    expect(report.created).toEqual([slug('emotes'), slug('beso'), slug('aviso')])
    expect(await find('emotes')).toBeUndefined()
    expect(requests.every((request) => !request.upload)).toBe(true)
  })

  it('crea las páginas publicadas, las legales En preparación con su enlace a Squarespace', async () => {
    const report = await load(true)
    expect(report.created).toHaveLength(3)

    const emotes = await find('emotes')
    expect(emotes).toMatchObject({
      title: 'Emotes',
      state: 'published',
      _status: 'published',
      seo: { metaTitle: 'EMOTES GLOBAL | Descubre y Usa Emotes Ahora' },
    })
    expect(emotes?.legacyHref).toBeFalsy()

    const beso = await find('beso')
    expect(beso?.parent).toBe(emotes?.id)
    expect(beso?.body?.map((block) => block.blockType)).toEqual(['richText', 'image', 'video'])
    expect(beso?.body?.[1]).toMatchObject({ image: mediaId })

    const aviso = await find('aviso')
    expect(aviso).toMatchObject({
      state: 'preparing',
      legacyHref: `https://www.torrentearcano.com/${slug('aviso')}`,
      _status: 'published',
    })
    expect(aviso?.importSnapshot).toBeTruthy()
  })

  it('una segunda pasada no cambia nada', async () => {
    const report = await load(true)
    expect(report.created).toEqual([])
    expect(report.updated).toEqual([])
    expect(report.unchanged).toHaveLength(3)
  })

  it('no pisa lo que Torre cambió en el panel, ni su estado, y sigue al día lo demás', async () => {
    const aviso = await find('aviso')
    await payload.update({
      collection: 'pages',
      id: aviso!.id,
      data: { title: 'Aviso legal', state: 'published' },
      overrideAccess: true,
    })
    const changed = converted({
      [slug('aviso')]: {
        title: 'Aviso Legal',
        pieces: [{ type: 'html', html: '<p>Texto nuevo de Squarespace.</p>' }],
        seo: {},
        oddities: [],
      },
    })
    const report = await load(true, changed)
    expect(report.kept).toEqual([{ slug: slug('aviso'), field: 'title' }])
    expect(report.updated).toEqual([slug('aviso')])
    const after = await find('aviso')
    expect(after).toMatchObject({ title: 'Aviso legal', state: 'published' })
    expect(JSON.stringify(after?.body)).toContain('Texto nuevo de Squarespace.')
  })

  it('el texto y el SEO que Torre reescribe en el panel sobreviven a otra importación', async () => {
    const beso = await find('beso')
    const torre = await htmlToLexical('<p>Lo escribió Torre en el panel.</p>')
    await payload.update({
      collection: 'pages',
      id: beso!.id,
      data: {
        body: [{ blockType: 'richText', content: torre }],
        seo: { metaDescription: 'La descripción de Torre.' },
      },
      overrideAccess: true,
    })
    // Squarespace cambia el texto y el SEO de esa página: no importa, Torre ya los tocó.
    const changed = converted({
      [slug('beso')]: {
        title: 'Dar un beso',
        pieces: [{ type: 'html', html: '<p>Texto nuevo de Squarespace.</p>' }],
        seo: { metaDescription: 'Otra descripción de Squarespace.' },
        oddities: [],
      },
    })
    const report = await load(true, changed)
    expect(report.kept).toEqual(
      expect.arrayContaining([
        { slug: slug('beso'), field: 'body' },
        { slug: slug('beso'), field: 'seo' },
      ]),
    )
    expect(report.updated).not.toContain(slug('beso'))
    const after = await find('beso')
    expect(JSON.stringify(after?.body)).toContain('Lo escribió Torre en el panel.')
    expect(JSON.stringify(after?.body)).not.toContain('Texto nuevo de Squarespace.')
    expect(after?.seo?.metaDescription).toBe('La descripción de Torre.')
  })

  it('con un borrador de Torre a medias, la página no se toca', async () => {
    const emotes = await find('emotes')
    await payload.update({
      collection: 'pages',
      id: emotes!.id,
      data: { _status: 'draft' },
      draft: true,
      overrideAccess: true,
    })
    const changed = converted({
      [slug('emotes')]: {
        title: 'Emotes',
        pieces: [{ type: 'html', html: '<p>Otro texto.</p>' }],
        seo: {},
        oddities: [],
      },
    })
    const report = await load(true, changed)
    expect(report.drafts).toEqual([slug('emotes')])
    expect(JSON.stringify((await find('emotes'))?.body)).not.toContain('Otro texto.')
  })

  it('una página que no está en Squarespace se lista y no se crea', async () => {
    await cleanUp()
    const report = await load(false, converted({ [slug('beso')]: null }))
    expect(report.missing).toEqual([slug('beso')])
    expect(report.created).toEqual([slug('emotes'), slug('aviso')])
  })

  it('una captura que no se descarga se anota y la página se crea sin ella', async () => {
    await cleanUp()
    const pages = converted({
      [slug('beso')]: {
        title: 'Dar un beso',
        pieces: [
          { type: 'html', html: '<p>Habla con Don Huan.</p>' },
          { type: 'image', url: BROKEN_URL, alt: 'Caída' },
        ],
        seo: {},
        oddities: [],
      },
    })
    const report = await load(true, pages)
    expect(report.oddities).toContainEqual({
      slug: slug('beso'),
      message: `Captura sin importar: ${BROKEN_URL} (404)`,
    })
    expect((await find('beso'))?.body?.map((block) => block.blockType)).toEqual(['richText'])
  })

  it('las rarezas de la conversión salen en el informe', async () => {
    await cleanUp()
    const pages = converted({
      [slug('emotes')]: {
        title: 'Emotes',
        pieces: [{ type: 'html', html: '<p>Hola.</p>' }],
        seo: {},
        oddities: ['Bloque de Squarespace sin convertir: gallery'],
      },
    })
    const report = await load(false, pages)
    expect(report.oddities).toContainEqual({
      slug: slug('emotes'),
      message: 'Bloque de Squarespace sin convertir: gallery',
    })
  })
})

describe('una dirección que ya es de otra página del sitio', () => {
  it('no se crea, se anota y el resto sigue', async () => {
    await cleanUp()
    await payload.create({
      collection: 'quest-guides',
      data: { title: 'Emote: Dar un beso', slug: slug('beso'), _status: 'published' },
      overrideAccess: true,
    })
    const dry = await load(false)
    expect(dry.created).toEqual([slug('emotes'), slug('aviso')])
    expect(dry.taken).toEqual([slug('beso')])
    const report = await load(true)
    expect(report.created).toEqual([slug('emotes'), slug('aviso')])
    expect(report.taken).toEqual([slug('beso')])
    expect(await find('beso')).toBeUndefined()
  })
})

describe('liveSiteSlugs', () => {
  it('cuenta las páginas Publicadas: los enlaces de Torre a ellas pasan a ser relativos', async () => {
    await cleanUp()
    await load(true)
    const live = await liveSiteSlugs(payload)
    expect(live.has(slug('emotes'))).toBe(true)
    expect(live.has(slug('beso'))).toBe(true)
    // En preparación lleva a Squarespace: un enlace a ella sigue yendo allí.
    expect(live.has(slug('aviso'))).toBe(false)
  })
})
