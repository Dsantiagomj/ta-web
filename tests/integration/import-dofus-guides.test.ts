import type { Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import type { DofusCatalogEntry } from '../../scripts/import/dofus-guides/catalog'
import {
  loadDofusGuides,
  loadDofusIndexIntro,
  type LoadDofusGuidesOptions,
} from '../../scripts/import/dofus-guides/load'
import type { DofusGuideSource } from '../../scripts/import/dofus-guides/parse'
import { createHtmlToLexical } from '../../scripts/import/rich-text'
import type { DofusGuide } from '@/payload-types'

import { startPayload, tinyPng } from './payload'

// La importación de las guías de Dofus: crea lo que falta, enlaza logros, misiones y objetos
// de la base, avisa de lo que no casa y, al repetir, no pisa lo que Torre cambió en el panel.

let payload: Payload
let htmlToLexical: LoadDofusGuidesOptions['htmlToLexical']
const ids = { pepita: 0, varita: 0, dofus: 0, page: 0, pesca: 0, heroe: 0, luces: 0, poster: 0 }

const SLUG = 'prueba-dofus-abisal'
const entry: DofusCatalogEntry = {
  slug: SLUG,
  name: 'Dofus Abisal',
  page: true,
  tag: null,
  level: 180,
  color: '#2a5aaa',
  dofusId: 918043,
}
const empty: DofusCatalogEntry = {
  ...entry,
  slug: 'prueba-dofus-vacio',
  name: 'Dofus vacío',
  dofusId: 918044,
}

const source = (intro = 'Para obtener tu Dofus Abisal…'): DofusGuideSource => ({
  heading: 'DOFUS ABISAL',
  banner: null,
  prerequisites: [[{ t: 'text', v: 'Nivel mínimo 180.' }]],
  needs: {
    title: 'Necesitarás',
    note: null,
    groups: [
      {
        name: null,
        rows: [
          {
            text: 'Algún oficio nivel 200.',
            segs: [{ t: 'text', v: 'Algún oficio nivel 200.' }],
            name: 'Algún oficio nivel 200',
          },
          {
            text: '200 x Pepita.',
            segs: [{ t: 'text', v: '200 x Pepita.' }],
            quantity: 200,
            name: 'Pepita',
          },
          {
            text: '1 x Objeto que no existe.',
            segs: [{ t: 'text', v: '1 x Objeto que no existe.' }],
            quantity: 1,
            name: 'Objeto que no existe',
          },
          // Torre escribe el plural tras la cantidad.
          {
            text: '8 x Pepitas.',
            segs: [{ t: 'text', v: '8 x Pepitas.' }],
            quantity: 8,
            name: 'Pepitas',
          },
          // El Cacao: Torre no escribió «1 x».
          {
            text: 'Varita pitusa.',
            segs: [{ t: 'text', v: 'Varita pitusa.' }],
            name: 'Varita pitusa',
          },
        ],
      },
    ],
  },
  intro: [[{ t: 'text', v: intro }]],
  parts: [
    {
      type: 'achievement',
      name: '¡Plof!',
      slug: null,
      quests: [
        { name: 'A la pesca de información', slug: 'prueba-a-la-pesca' },
        { name: 'El héroe de Sufokia', slug: 'prueba-el-heroe' },
      ],
    },
    {
      type: 'achievement',
      name: 'Un logro sin página',
      slug: null,
      quests: [{ name: 'El héroe de Sufokia', slug: 'prueba-el-heroe' }],
    },
    {
      type: 'quests',
      title: 'También algunas misiones random',
      quests: [{ name: 'Luces y sombra', slug: 'prueba-luces', note: '(solo empezarla)' }],
    },
  ],
  rewards: null,
  video: 'ovPAxnBdKYQ',
  body: [],
})

function options(guides: LoadDofusGuidesOptions['guides'], apply = true): LoadDofusGuidesOptions {
  return {
    guides,
    apply,
    htmlToLexical,
    ensureItem: async (dofusId) => (dofusId === entry.dofusId ? ids.dofus : null),
    findItem: async (name) =>
      name === 'Pepita' || name === 'Pepitas'
        ? { id: ids.pepita, name: 'Pepita', singular: name === 'Pepitas' }
        : null,
    findOnlyItem: async (name) =>
      name === 'Varita pitusa' ? { id: ids.varita, name: 'Varita pitusa', singular: false } : null,
    mediaFor: async () => {
      throw new Error('Esta guía no tiene capturas')
    },
    posterFor: async () => ids.poster,
  }
}

async function cleanUp() {
  await payload.delete({ collection: 'dofus-guides', where: { slug: { like: 'prueba-dofus' } } })
  await payload.delete({
    collection: 'achievement-pages',
    where: { slug: { equals: 'prueba-plof' } },
  })
  await payload.delete({ collection: 'achievements', where: { dofusId: { equals: 919001 } } })
  await payload.delete({ collection: 'quest-guides', where: { slug: { like: 'prueba-' } } })
  await payload.delete({
    collection: 'items',
    where: { dofusId: { in: [918043, 914635, 918102] } },
  })
}

const read = async (slug: string) =>
  (
    await payload.find({
      collection: 'dofus-guides',
      where: { slug: { equals: slug } },
      draft: true,
      depth: 0,
      overrideAccess: true,
    })
  ).docs[0] as DofusGuide

beforeAll(async () => {
  payload = await startPayload()
  await cleanUp()
  htmlToLexical = await createHtmlToLexical(payload.config)
  ids.pepita = (
    await payload.create({ collection: 'items', data: { dofusId: 914635, name: 'Pepita' } })
  ).id
  ids.varita = (
    await payload.create({ collection: 'items', data: { dofusId: 918102, name: 'Varita pitusa' } })
  ).id
  ids.dofus = (
    await payload.create({ collection: 'items', data: { dofusId: 918043, name: 'Dofus abisal' } })
  ).id
  const achievement = await payload.create({
    collection: 'achievements',
    data: { dofusId: 919001, name: '¡Plof!' },
  })
  ids.page = (
    await payload.create({
      collection: 'achievement-pages',
      data: {
        achievement: achievement.id,
        name: '¡Plof!',
        slug: 'prueba-plof',
        state: 'published',
        quests: [{ name: 'A la pesca de información' }, { name: 'Otra misión de la página' }],
      },
    })
  ).id
  const guide = async (slug: string, title: string) =>
    (await payload.create({ collection: 'quest-guides', data: { slug, title } })).id
  ids.pesca = await guide('prueba-a-la-pesca', 'A la pesca de información')
  ids.heroe = await guide('prueba-el-heroe', 'El héroe de Sufokia')
  ids.luces = await guide('prueba-luces', 'Luces y sombras')
  ids.poster = (
    await payload.create({ collection: 'media', data: { alt: 'Portada' }, file: tinyPng() })
  ).id
})

afterAll(async () => {
  await cleanUp()
})

describe('loadDofusGuides', () => {
  it('en seco solo cuenta: no escribe nada', async () => {
    const report = await loadDofusGuides(payload, options([{ entry, source: source() }], false))
    expect(report.created).toBe(1)
    expect(await read(SLUG)).toBeUndefined()
  })

  it('crea la guía publicada con sus logros, misiones y objetos enlazados', async () => {
    const report = await loadDofusGuides(
      payload,
      options([
        { entry, source: source() },
        { entry: empty, source: null },
      ]),
    )
    expect(report.created).toBe(2)

    const doc = await read(SLUG)
    expect(doc).toMatchObject({
      name: 'Dofus Abisal',
      state: 'published',
      _status: 'published',
      order: 1,
      dofus: ids.dofus,
      level: 180,
      color: '#2a5aaa',
      video: 'https://www.youtube.com/watch?v=ovPAxnBdKYQ',
      videoPoster: ids.poster,
      originalUrl: `https://www.torrentearcano.com/${SLUG}`,
    })
    const rows = doc.needs?.groups?.[0]?.rows ?? []
    expect(rows.map((row) => row.blockType)).toEqual([
      'needNote',
      'needItem',
      'needNote',
      'needItem',
      'needItem',
    ])
    expect(rows[1]).toMatchObject({ item: ids.pepita, quantity: 200 })
    expect(rows[3]).toMatchObject({ item: ids.pepita, quantity: 8 })
    // Sin «1 x», el único objeto que se llama así, con cantidad 1; lo que no casa, nota.
    expect(rows[4]).toMatchObject({ item: ids.varita, quantity: 1 })
    expect(report.withoutQuantity).toEqual([
      { slug: SLUG, text: 'Varita pitusa.', item: 'Varita pitusa' },
    ])
    // Lo que casó en singular va aparte, para revisarlo.
    expect(report.singular).toEqual([{ slug: SLUG, text: '8 x Pepitas.', item: 'Pepita' }])
    // Las misiones del logro salen de su página; el logro sin página no pierde las suyas.
    expect(doc.parts?.map((part) => part.blockType)).toEqual([
      'dofusAchievement',
      'dofusQuests',
      'dofusQuests',
    ])
    expect(doc.parts?.[0]).toMatchObject({ achievement: ids.page })
    expect(doc.parts?.[1]).toMatchObject({
      title: 'Un logro sin página',
      quests: [{ guide: ids.heroe }],
    })
    expect(doc.parts?.[2]).toMatchObject({
      quests: [{ guide: ids.luces, note: '(solo empezarla)' }],
    })

    expect(report.unmatched).toEqual([
      { slug: SLUG, kind: 'objeto', name: 'Objeto que no existe' },
      { slug: SLUG, kind: 'logro', name: 'Un logro sin página' },
    ])
    expect(report.differences).toEqual([
      {
        slug: SLUG,
        achievement: '¡Plof!',
        torre: ['A la pesca de información', 'El héroe de Sufokia'],
        page: ['A la pesca de información', 'Otra misión de la página'],
      },
    ])
  })

  it('un Dofus sin contenido en la web de Torre queda En preparación', async () => {
    expect(await read('prueba-dofus-vacio')).toMatchObject({ state: 'preparing', order: 2 })
  })

  it('repetirla sin cambios no toca nada', async () => {
    const report = await loadDofusGuides(payload, options([{ entry, source: source() }]))
    expect(report).toMatchObject({ created: 0, updated: 0, unchanged: 1, kept: [] })
  })

  it('al repetirla respeta lo que Torre cambió y actualiza el resto', async () => {
    const doc = await read(SLUG)
    await payload.update({
      collection: 'dofus-guides',
      id: doc.id,
      data: {
        intro: htmlToLexical('<p>La intro que escribió Torre en el panel.</p>'),
        tag: 'primordial',
      },
      overrideAccess: true,
    })

    const report = await loadDofusGuides(
      payload,
      options([
        { entry: { ...entry, color: '#123456' }, source: source('Otra intro en Squarespace') },
      ]),
    )

    expect(report.updated).toBe(1)
    expect(report.kept).toEqual([
      { slug: SLUG, field: 'tag' },
      { slug: SLUG, field: 'intro' },
    ])
    const after = await read(SLUG)
    expect(after.color).toBe('#123456')
    expect(after.tag).toBe('primordial')
    expect(JSON.stringify(after.intro)).toContain('La intro que escribió Torre')
  })
})

describe('loadDofusGuides: filas sin cantidad en guías ya importadas', () => {
  // Una guía importada antes del arreglo guardó «Varita pitusa.» como nota.
  const before: Pick<LoadDofusGuidesOptions, 'findOnlyItem'> = { findOnlyItem: async () => null }
  // Sin Dofus en la base (ensureItem da null): el Dofus de una guía es único.
  const cacao = (slug: string, dofusId: number): DofusCatalogEntry => ({
    ...entry,
    slug,
    name: 'Dofus Cacao',
    dofusId,
  })
  const blockTypes = async (slug: string) =>
    ((await read(slug)).needs?.groups ?? []).flatMap((group) =>
      (group.rows ?? []).map((row) => row.blockType),
    )

  it('la nota pasa a objeto si Torre no tocó Necesitarás, y repetirla no cambia nada', async () => {
    const slug = 'prueba-dofus-cacao'
    const guides = [{ entry: cacao(slug, 918045), source: source() }]
    await loadDofusGuides(payload, { ...options(guides), ...before })
    expect(await blockTypes(slug)).toEqual([
      'needNote',
      'needItem',
      'needNote',
      'needItem',
      'needNote',
    ])

    const report = await loadDofusGuides(payload, options(guides))
    expect(report).toMatchObject({ updated: 1, kept: [] })
    expect(report.withoutQuantity).toEqual([
      { slug, text: 'Varita pitusa.', item: 'Varita pitusa' },
    ])
    expect(await blockTypes(slug)).toEqual([
      'needNote',
      'needItem',
      'needNote',
      'needItem',
      'needItem',
    ])

    const again = await loadDofusGuides(payload, options(guides))
    expect(again).toMatchObject({
      updated: 0,
      unchanged: 1,
      kept: [],
      withoutQuantity: [],
      singular: [],
    })
  })

  it('si Torre cambió Necesitarás en el panel, la importación no lo pisa', async () => {
    const slug = 'prueba-dofus-cacao-editada'
    const guides = [{ entry: cacao(slug, 918046), source: source() }]
    await loadDofusGuides(payload, { ...options(guides), ...before })
    const doc = await read(slug)
    const needs = {
      title: null,
      groups: [
        {
          name: null,
          rows: [
            { blockType: 'needNote', text: htmlToLexical('<p>Varita pitusa (de Torre).</p>') },
          ],
        },
      ],
    }
    await payload.update({
      collection: 'dofus-guides',
      id: doc.id,
      data: { needs } as never,
      overrideAccess: true,
    })

    const report = await loadDofusGuides(payload, options(guides))
    expect(report.kept).toEqual([{ slug, field: 'needs' }])
    expect(report.withoutQuantity).toEqual([])
    const after = await read(slug)
    expect(after.needs?.groups?.[0]?.rows?.map((row) => row.blockType)).toEqual(['needNote'])
    expect(JSON.stringify(after.needs)).toContain('Varita pitusa (de Torre).')
  })
})

describe('loadDofusIndexIntro', () => {
  it('pone la entradilla de Torre en el índice solo si está vacía', async () => {
    await payload.updateGlobal({ slug: 'dofus-guides-index', data: { intro: null } })
    expect(
      await loadDofusIndexIntro(payload, {
        intro: 'Descubre aquí las guías.',
        apply: false,
        htmlToLexical,
      }),
    ).toBe('se pondría')
    expect((await payload.findGlobal({ slug: 'dofus-guides-index' })).intro).toBeFalsy()

    expect(
      await loadDofusIndexIntro(payload, {
        intro: 'Descubre aquí las guías.',
        apply: true,
        htmlToLexical,
      }),
    ).toBe('puesta')
    expect(
      JSON.stringify((await payload.findGlobal({ slug: 'dofus-guides-index' })).intro),
    ).toContain('Descubre aquí')

    // Lo que Torre escribió no se toca.
    await payload.updateGlobal({
      slug: 'dofus-guides-index',
      data: { intro: htmlToLexical('<p>La de Torre.</p>') },
    })
    expect(await loadDofusIndexIntro(payload, { intro: 'Otra.', apply: true, htmlToLexical })).toBe(
      'se respeta',
    )
    expect(
      JSON.stringify((await payload.findGlobal({ slug: 'dofus-guides-index' })).intro),
    ).toContain('La de Torre')
  })
})
