import type { Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import {
  loadAchievementProse,
  type LoadProseOptions,
} from '../../scripts/import/achievements/load-prose'
import type { AchievementProse } from '../../scripts/import/achievements/prose'
import { createHtmlToLexical } from '../../scripts/import/rich-text'

import { startPayload, tinyPng } from './payload'

// La importación de la prosa de Torre a las páginas de logro: la entrada y el cierre con sus
// capturas y sus vídeos. Al repetirla no cambia nada, y nunca pisa lo que Torre escribió en
// el panel.

const PREFIX = 'prosa-prueba-'
const ACHIEVEMENTS = [990_951, 990_952, 990_953, 990_954]
const IMAGE_URL = 'https://images.squarespace-cdn.com/content/v1/prueba/captura.png'

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
    [`${PREFIX}torre`, { intro: [{ type: 'html', html: '<p>La de Squarespace.</p>' }], outro: [] }],
    ...Object.entries(overrides),
  ])

async function load(apply: boolean, pages = sources()) {
  return loadAchievementProse(payload, {
    pages,
    apply,
    htmlToLexical,
    mediaFor: async () => media.image,
    posterFor: async () => media.poster,
    only: (slug) => slug.startsWith(PREFIX),
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
  await payload.delete({ collection: 'achievement-pages', where: { slug: { like: PREFIX } } })
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
  for (const [index, name] of names.entries()) {
    const achievement = await payload.create({
      collection: 'achievements',
      data: { dofusId: ACHIEVEMENTS[index]!, name: `Prueba ${name}` },
    })
    await payload.create({
      collection: 'achievement-pages',
      data: {
        achievement: achievement.id,
        name: name === 'verde' ? 'Verde esmeralda' : `Prueba ${name}`,
        slug: `${PREFIX}${name}`,
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
    expect(report).toMatchObject({ updated: 2, unchanged: 2, videos: 1, images: 1 })
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

    // La entrada de Torre se queda como estaba.
    expect(nodes((await page(`${PREFIX}torre`)).intro)).toEqual([
      'paragraph: La que escribió Torre.',
    ])
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
})
