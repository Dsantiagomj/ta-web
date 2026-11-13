import type { Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import {
  loadAchievementProse,
  type LoadProseOptions,
} from '../../scripts/import/achievements/load-prose'
import type { AchievementProse } from '../../scripts/import/achievements/prose'
import { ImageDownloadError } from '../../scripts/import/media-by-url'
import { createHtmlToLexical } from '../../scripts/import/rich-text'

import { startPayload, tinyPng } from './payload'

// La importación de la prosa de Torre a las páginas de logro: la entrada y el cierre con sus
// capturas y sus vídeos. Al repetirla no cambia nada, y nunca pisa lo que Torre escribió en
// el panel.

const PREFIX = 'prosa-prueba-'
const OTHER = 'prosa-otra-'
const ACHIEVEMENTS = [990_951, 990_952, 990_953, 990_954, 990_955, 990_956]
const IMAGE_URL = 'https://images.squarespace-cdn.com/content/v1/prueba/captura.png'
const BROKEN_URL = 'https://images.squarespace-cdn.com/content/v1/prueba/caida.png'
const TORRE_IMAGE_URL = 'https://images.squarespace-cdn.com/content/v1/prueba/de-torre.png'

let payload: Payload
let htmlToLexical: LoadProseOptions['htmlToLexical']
const media = { image: 0, poster: 0 }

const closing = (text = 'Aquí tienes también un vídeo guía.'): AchievementProse => ({
  intro: [],
  outro: [
    { type: 'html', html: `<p>${text}</p>` },
    { type: 'video', url: 'https://www.youtube.com/watch?v=ovPAxnBdKYQ', title: null },
    { type: 'html', html: '<p>No te olvides suscribirte al canal UwU</p>' },
  ],
})

const sources = (overrides: Record<string, AchievementProse> = {}) =>
  new Map<string, AchievementProse>([
    [`${PREFIX}verde`, closing()],
    [
      `${PREFIX}cazador`,
      {
        intro: [{ type: 'html', html: '<p>Solo hay que hacer <strong>una</strong>.</p>' }],
        outro: [{ type: 'image', url: IMAGE_URL, alt: 'Captura' }],
      },
    ],
    [`${PREFIX}vacia`, { intro: [], outro: [] }],
    [
      `${PREFIX}torre`,
      {
        intro: [
          { type: 'html', html: '<p>La de Squarespace.</p>' },
          { type: 'image', url: TORRE_IMAGE_URL, alt: 'Captura' },
        ],
        outro: [],
      },
    ],
    ...Object.entries(overrides),
  ])

/** Lo que se pidió a Media: cada URL o vídeo, y si se podía subir. */
const requests: { what: string; upload: boolean }[] = []

async function load(
  apply: boolean,
  pages = sources(),
  overrides: Partial<LoadProseOptions> = {},
  prefix = PREFIX,
) {
  return loadAchievementProse(payload, {
    pages,
    apply,
    htmlToLexical,
    mediaFor: async (url, _alt, { upload }) => {
      requests.push({ what: url, upload })
      return media.image
    },
    posterFor: async (videoId, { upload }) => {
      requests.push({ what: videoId, upload })
      return media.poster
    },
    only: (slug) => slug.startsWith(prefix),
    ...overrides,
  })
}

const page = async (slug: string) =>
  (
    await payload.find({
      collection: 'achievement-pages',
      where: { slug: { equals: slug } },
      depth: 0,
      draft: true,
      limit: 1,
    })
  ).docs[0]!

/** El texto plano y los nodos de un campo de texto enriquecido, para comparar. */
function nodes(value: unknown): string[] {
  const root = (value as { root?: { children?: Record<string, unknown>[] } } | null)?.root
  return (root?.children ?? []).map((node) => {
    if (node.type === 'block') {
      const fields = node.fields as Record<string, unknown>
      return `vídeo ${fields.blockType} ${fields.url} «${fields.title}» portada ${fields.poster}`
    }
    if (node.type === 'upload') return `imagen ${node.value}`
    const text = JSON.stringify(node.children ?? [])
      .match(/"text":"([^"]*)"/g)
      ?.map((match) => match.slice(8, -1))
      .join('')
    return `${node.type}: ${text}`
  })
}

async function cleanUp() {
  await payload.delete({ collection: 'achievement-pages', where: { slug: { like: 'prosa-' } } })
  await payload.delete({ collection: 'achievements', where: { dofusId: { in: ACHIEVEMENTS } } })
  await payload.delete({ collection: 'media', where: { alt: { like: 'Prosa de prueba' } } })
}

beforeAll(async () => {
  payload = await startPayload()
  htmlToLexical = await createHtmlToLexical(payload.config)
  await cleanUp()
  media.image = (
    await payload.create({
      collection: 'media',
      data: { alt: 'Prosa de prueba: captura' },
      file: tinyPng(),
    })
  ).id
  media.poster = (
    await payload.create({
      collection: 'media',
      data: { alt: 'Prosa de prueba: portada' },
      file: tinyPng(),
    })
  ).id
  const names = ['verde', 'cazador', 'vacia', 'torre']
  const slugs = [...names.map((name) => `${PREFIX}${name}`), `${OTHER}fallo`, `${OTHER}videos`]
  for (const [index, slug] of slugs.entries()) {
    const name = slug.replace(/^prosa-(prueba|otra)-/, '')
    const achievement = await payload.create({
      collection: 'achievements',
      data: { dofusId: ACHIEVEMENTS[index]!, name: `Prueba ${name}` },
    })
    await payload.create({
      collection: 'achievement-pages',
      data: {
        achievement: achievement.id,
        name: name === 'verde' ? 'Verde esmeralda' : `Prueba ${name}`,
        slug,
        state: 'published',
        _status: 'published',
      },
    })
  }
  // Torre ya escribió su entrada en el panel antes de cualquier importación.
  await payload.update({
    collection: 'achievement-pages',
    where: { slug: { equals: `${PREFIX}torre` } },
    data: { intro: htmlToLexical('<p>La que escribió Torre.</p>') },
  })
})

afterAll(async () => {
  await cleanUp()
  await payload.destroy()
})

describe('loadAchievementProse', () => {
  it('en seco cuenta y no escribe nada', async () => {
    const report = await load(false)
    expect(report).toMatchObject({ updated: 2, unchanged: 2, videos: 1, images: 2 })
    expect(report.withoutProse).toEqual([`${PREFIX}vacia`])
    expect(report.kept).toEqual([{ slug: `${PREFIX}torre`, field: 'intro' }])
    expect((await page(`${PREFIX}verde`)).outro).toBeFalsy()
  })

  it('escribe la entrada y el cierre, con el vídeo y la captura en su sitio', async () => {
    const report = await load(true)
    expect(report).toMatchObject({ updated: 2, unchanged: 2 })

    const verde = await page(`${PREFIX}verde`)
    expect(verde.intro).toBeFalsy()
    expect(nodes(verde.outro)).toEqual([
      'paragraph: Aquí tienes también un vídeo guía.',
      // Sin título en Squarespace, el del logro.
      `vídeo proseVideo https://www.youtube.com/watch?v=ovPAxnBdKYQ «Vídeo guía de Verde esmeralda» portada ${media.poster}`,
      'paragraph: No te olvides suscribirte al canal UwU',
    ])
    expect(verde._status).toBe('published')

    const cazador = await page(`${PREFIX}cazador`)
    expect(nodes(cazador.intro)).toEqual(['paragraph: Solo hay que hacer una.'])
    expect(nodes(cazador.outro)).toEqual([`imagen ${media.image}`])

    // La entrada de Torre se queda como estaba, y no se sube nada para ella.
    expect(nodes((await page(`${PREFIX}torre`)).intro)).toEqual([
      'paragraph: La que escribió Torre.',
    ])
    expect(requests.filter((request) => request.what === TORRE_IMAGE_URL)).not.toContainEqual(
      expect.objectContaining({ upload: true }),
    )
  })

  it('una segunda pasada no cambia nada', async () => {
    const before = await page(`${PREFIX}verde`)
    const report = await load(true)
    expect(report).toMatchObject({ updated: 0, unchanged: 4 })
    expect((await page(`${PREFIX}verde`)).updatedAt).toBe(before.updatedAt)
  })

  it('no pisa lo que Torre cambió en el panel, y sigue al día lo que no tocó', async () => {
    await payload.update({
      collection: 'achievement-pages',
      where: { slug: { equals: `${PREFIX}verde` } },
      data: { outro: htmlToLexical('<p>Mi cierre, reescrito en el panel.</p>') },
    })
    const changed = sources({
      [`${PREFIX}verde`]: closing('Otro texto en Squarespace.'),
      [`${PREFIX}cazador`]: {
        intro: [{ type: 'html', html: '<p>Una entrada nueva.</p>' }],
        outro: [{ type: 'image', url: IMAGE_URL, alt: 'Captura' }],
      },
    })
    const report = await load(true, changed)
    expect(report.kept).toEqual(
      expect.arrayContaining([
        { slug: `${PREFIX}verde`, field: 'outro' },
        { slug: `${PREFIX}torre`, field: 'intro' },
      ]),
    )
    expect(nodes((await page(`${PREFIX}verde`)).outro)).toEqual([
      'paragraph: Mi cierre, reescrito en el panel.',
    ])
    expect(nodes((await page(`${PREFIX}cazador`)).intro)).toEqual(['paragraph: Una entrada nueva.'])
  })

  it('con un borrador de Torre a medias, el cambio va a su borrador y no se publica', async () => {
    await payload.update({
      collection: 'achievement-pages',
      where: { slug: { equals: `${PREFIX}vacia` } },
      data: { name: 'Prueba vacía (borrador)' },
      draft: true,
    })
    const report = await load(
      true,
      sources({
        [`${PREFIX}vacia`]: { intro: [{ type: 'html', html: '<p>Llega tarde.</p>' }], outro: [] },
      }),
    )
    expect(report.updated).toBeGreaterThan(0)
    const draft = await page(`${PREFIX}vacia`)
    expect(draft._status).toBe('draft')
    expect(nodes(draft.intro)).toEqual(['paragraph: Llega tarde.'])
    const published = (
      await payload.find({
        collection: 'achievement-pages',
        where: { slug: { equals: `${PREFIX}vacia` } },
        depth: 0,
        draft: false,
        limit: 1,
      })
    ).docs[0]!
    expect(published.intro).toBeFalsy()
  })

  it('dice qué páginas no tienen página cacheada en Squarespace', async () => {
    const pages = sources()
    pages.delete(`${PREFIX}cazador`)
    const report = await load(false, pages)
    expect(report.missing).toEqual([`${PREFIX}cazador`])
  })

  it('una captura que no se puede descargar no tumba la importación: se anota y el texto se queda', async () => {
    const pages = new Map<string, AchievementProse>([
      [
        `${OTHER}fallo`,
        {
          intro: [],
          outro: [
            { type: 'html', html: '<p>Antes de la captura.</p>' },
            { type: 'image', url: BROKEN_URL, alt: 'Captura' },
            { type: 'html', html: '<p>Después de la captura.</p>' },
            { type: 'video', url: 'https://www.youtube.com/watch?v=3D89qGThRAI', title: 'Uno' },
          ],
        },
      ],
    ])
    const report = await load(
      true,
      pages,
      {
        mediaFor: async (url) => {
          if (url === BROKEN_URL) throw new ImageDownloadError('HTTP 404')
          return media.image
        },
        posterFor: async () => {
          throw new ImageDownloadError('HTTP 404')
        },
      },
      OTHER,
    )
    expect(report.updated).toBe(1)
    expect(report.oddities).toEqual([
      { slug: `${OTHER}fallo`, message: `Captura sin importar: ${BROKEN_URL} (HTTP 404)` },
      { slug: `${OTHER}fallo`, message: 'Portada del vídeo 3D89qGThRAI sin importar (HTTP 404)' },
    ])
    expect(nodes((await page(`${OTHER}fallo`)).outro)).toEqual([
      'paragraph: Antes de la captura.',
      'paragraph: Después de la captura.',
      'vídeo proseVideo https://www.youtube.com/watch?v=3D89qGThRAI «Uno» portada undefined',
    ])
  })

  it('un fallo que no es de descarga (la base) no se esconde: la importación falla', async () => {
    const pages = new Map<string, AchievementProse>([
      [`${OTHER}fallo`, { intro: [{ type: 'image', url: IMAGE_URL, alt: 'x' }], outro: [] }],
    ])
    await expect(
      load(
        true,
        pages,
        { mediaFor: async () => Promise.reject(new Error('connection terminated')) },
        OTHER,
      ),
    ).rejects.toThrow('connection terminated')
    const videos = new Map<string, AchievementProse>([
      [
        `${OTHER}fallo`,
        { intro: [{ type: 'video', url: 'https://youtu.be/3D89qGThRAI', title: null }], outro: [] },
      ],
    ])
    await expect(
      load(
        true,
        videos,
        { posterFor: async () => Promise.reject(new Error('connection terminated')) },
        OTHER,
      ),
    ).rejects.toThrow('connection terminated')
  })

  it('los vídeos sin título se numeran en toda la página, entrada y cierre juntos', async () => {
    const video = (id: string) => ({
      type: 'video' as const,
      url: `https://www.youtube.com/watch?v=${id}`,
      title: null,
    })
    const pages = new Map<string, AchievementProse>([
      [`${OTHER}videos`, { intro: [video('F7EkJd4nVtM')], outro: [video('gfKRvZwaEYQ')] }],
    ])
    await load(true, pages, {}, OTHER)
    const saved = await page(`${OTHER}videos`)
    expect(
      [...nodes(saved.intro), ...nodes(saved.outro)].map(
        (node) => node.split('«')[1]!.split('»')[0],
      ),
    ).toEqual(['Vídeo guía de Prueba videos (1 de 2)', 'Vídeo guía de Prueba videos (2 de 2)'])
  })
})
