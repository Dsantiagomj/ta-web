import type { Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import type { DofusCatalogEntry } from '../../scripts/import/dofus-guides/catalog'
import {
  comparable,
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
          {
            text: 'Un par de combates por allí y por allá.',
            segs: [{ t: 'text', v: 'Un par de combates por allí y por allá.' }],
            name: 'Un par de combates por allí y por allá',
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
    findItem: async (name) => {
      if (name === 'Pepita' || name === 'Pepitas')
        return { id: ids.pepita, name: 'Pepita', singular: name === 'Pepitas', superTypeId: 9 }
      if (name === 'Varita pitusa')
        return { id: ids.varita, name: 'Varita pitusa', singular: false, superTypeId: 2 }
      return null
    },
    jobs: ['Minero', 'Campesino'],
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
    // Necesitarás en los grupos fijos: los objetos por su tipo, las notas por sus datos.
    const groups = doc.needs?.groups ?? []
    expect(groups.map((group) => [group.name, group.rows?.map((row) => row.blockType)])).toEqual([
      ['combates', ['needNote']],
      ['recursos', ['needItem', 'needItem']],
      ['equipables', ['needItem']],
      ['oficios', ['needNote']],
      ['otros', ['needNote']],
    ])
    const [pepita, pepitas] = groups[1]!.rows!
    expect(pepita).toMatchObject({ item: ids.pepita, quantity: 200 })
    expect(pepitas).toMatchObject({ item: ids.pepita, quantity: 8 })
    // Sin «1 x», el único objeto que se llama así, con cantidad 1; lo que no casa, nota.
    expect(groups[2]!.rows![0]).toMatchObject({ item: ids.varita, quantity: 1 })
    expect(report.withoutQuantity).toEqual([
      { slug: SLUG, text: 'Varita pitusa.', item: 'Varita pitusa' },
    ])
    // Cada fila suelta dice a qué grupo fue y por qué; lo que no se clasifica, a Otros.
    expect(report.needGroups).toContainEqual({
      slug: SLUG,
      text: '1 x Objeto que no existe.',
      from: null,
      to: 'otros',
      reason: 'sin clasificar',
    })
    expect(report.needGroups).toContainEqual({
      slug: SLUG,
      text: 'Algún oficio nivel 200.',
      from: null,
      to: 'oficios',
      reason: 'oficio',
    })
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
  const before: Pick<LoadDofusGuidesOptions, 'findItem'> = {
    findItem: async (name) => (name === 'Varita pitusa' ? null : options([]).findItem(name)),
  }
  // Sin Dofus en la base (ensureItem da null): el Dofus de una guía es único.
  const cacao = (slug: string, dofusId: number): DofusCatalogEntry => ({
    ...entry,
    slug,
    name: 'Dofus Cacao',
    dofusId,
  })
  const hasVarita = async (slug: string) =>
    ((await read(slug)).needs?.groups ?? []).some((group) =>
      (group.rows ?? []).some((row) => row.blockType === 'needItem' && row.item === ids.varita),
    )

  it('la nota pasa a objeto si Torre no tocó Necesitarás, y repetirla no cambia nada', async () => {
    const slug = 'prueba-dofus-cacao'
    const guides = [{ entry: cacao(slug, 918045), source: source() }]
    await loadDofusGuides(payload, { ...options(guides), ...before })
    expect(await hasVarita(slug)).toBe(false)

    const report = await loadDofusGuides(payload, options(guides))
    expect(report).toMatchObject({ updated: 1, kept: [] })
    expect(report.withoutQuantity).toEqual([
      { slug, text: 'Varita pitusa.', item: 'Varita pitusa' },
    ])
    expect(await hasVarita(slug)).toBe(true)

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
          name: 'otros',
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

describe('loadDofusGuides: búsquedas de objetos', () => {
  const guide = (slug: string, dofusId: number, extra: string[] = []) => ({
    entry: { ...entry, slug, name: 'Dofus de prueba', dofusId },
    source: {
      ...source(),
      needs: {
        title: 'Necesitarás',
        note: null,
        groups: [
          {
            name: null,
            rows: ['Varita pitusa', 'Mucha paciencia', ...extra].map((name) => ({
              text: `${name}.`,
              segs: [{ t: 'text' as const, v: `${name}.` }],
              name,
            })),
          },
        ],
      },
    },
  })

  it('cada nombre se busca una vez en toda la importación', async () => {
    const asked: string[] = []
    const counting = {
      findItem: async (name: string) => {
        asked.push(name)
        return options([]).findItem(name)
      },
    }
    await loadDofusGuides(payload, {
      ...options([guide('prueba-dofus-busca-1', 918061), guide('prueba-dofus-busca-2', 918062)]),
      ...counting,
      apply: false,
    })
    expect(asked.filter((name) => name === 'Varita pitusa')).toHaveLength(1)
    expect(asked.filter((name) => name === 'Mucha paciencia')).toHaveLength(1)
  })

  it('si falla la búsqueda de una fila sin cantidad, queda como nota y se avisa', async () => {
    const report = await loadDofusGuides(payload, {
      ...options([guide('prueba-dofus-busca-3', 918063)]),
      findItem: async (name) => {
        if (name === 'Mucha paciencia') throw new Error('DofusDB tardó demasiado')
        return options([]).findItem(name)
      },
      apply: false,
    })
    expect(report.created).toBe(1)
    expect(report.lookupFailures).toEqual([
      { slug: 'prueba-dofus-busca-3', text: 'Mucha paciencia.', error: 'DofusDB tardó demasiado' },
    ])
  })

  it('lo casado se informa solo si es nuevo frente a lo guardado', async () => {
    const slug = 'prueba-dofus-busca-4'
    await loadDofusGuides(payload, options([guide(slug, 918064)]))
    // Necesitarás cambia por otra fila, pero la Varita ya estaba guardada como objeto.
    const report = await loadDofusGuides(payload, options([guide(slug, 918064, ['Pepitas'])]))
    expect(report.updated).toBe(1)
    expect(report.withoutQuantity).toEqual([])
    expect(report.singular).toEqual([{ slug, text: 'Pepitas.', item: 'Pepita' }])
  })
})

describe('loadDofusGuides: grupos de Necesitarás', () => {
  const rows = (texts: string[]) => ({
    name: null,
    rows: texts.map((text) => ({ text, segs: [{ t: 'text' as const, v: text }] })),
  })
  const guideWith = (slug: string, dofusId: number, groups: DofusGuideSource['needs']) => ({
    entry: { ...entry, slug, name: 'Dofus Marfil', dofusId },
    source: { ...source(), needs: groups },
  })
  // El Marfil: todo suelto, combates, mazmorras y objetos mezclados.
  const marfil = {
    title: 'Necesitarás',
    note: null,
    groups: [
      {
        name: null,
        rows: [
          ...rows(['14 x combates.', '1 x Mazmorra Kutulú.']).rows,
          {
            text: '200 x Pepita.',
            segs: [{ t: 'text' as const, v: '200 x Pepita.' }],
            quantity: 200,
            name: 'Pepita',
          },
          ...rows(['Ser minero nivel 20 mínimo.', 'Ayuda de otras 2 personas.']).rows,
        ],
      },
    ],
  }
  const names = async (slug: string) =>
    ((await read(slug)).needs?.groups ?? []).map((group) => group.name)

  it('una guía con todo suelto queda en los grupos fijos, y repetirla no cambia nada', async () => {
    const slug = 'prueba-dofus-marfil'
    const guides = [guideWith(slug, 918047, marfil)]
    const first = await loadDofusGuides(payload, options(guides))
    expect(await names(slug)).toEqual(['combates', 'mazmorras', 'recursos', 'oficios', 'otros'])
    // Cómo queda Necesitarás, grupo a grupo, para revisarlo en seco antes de aplicar.
    expect(first.needsAfter).toEqual([
      {
        slug,
        groups: [
          { name: 'combates', rows: ['14 x combates.'] },
          { name: 'mazmorras', rows: ['1 x Mazmorra Kutulú.'] },
          { name: 'recursos', rows: ['200 x Pepita.'] },
          { name: 'oficios', rows: ['Ser minero nivel 20 mínimo.'] },
          { name: 'otros', rows: ['Ayuda de otras 2 personas.'] },
        ],
      },
    ])

    const again = await loadDofusGuides(payload, options(guides))
    expect(again).toMatchObject({
      updated: 0,
      unchanged: 1,
      kept: [],
      needGroups: [],
      needsAfter: [],
    })
  })

  it('una guía que la migración dejó con un solo grupo «otros» se normaliza al repetirla', async () => {
    const slug = 'prueba-dofus-marfil-antes'
    const guides = [guideWith(slug, 918048, marfil)]
    await loadDofusGuides(payload, options(guides))
    // Como la dejó la migración: un grupo «otros» con todo, y la copia de la importación igual.
    const doc = await read(slug)
    const before = {
      title: null,
      groups: [{ name: 'otros', rows: doc.needs!.groups!.flatMap((group) => group.rows ?? []) }],
    }
    const snapshot = { ...(doc.importSnapshot as object), needs: comparable(before) }
    await payload.update({
      collection: 'dofus-guides',
      id: doc.id,
      data: { needs: before, importSnapshot: snapshot } as never,
      overrideAccess: true,
    })
    expect(await names(slug)).toEqual(['otros'])

    const report = await loadDofusGuides(payload, options(guides))
    expect(report).toMatchObject({ updated: 1, kept: [] })
    expect(await names(slug)).toEqual(['combates', 'mazmorras', 'recursos', 'oficios', 'otros'])
    expect(report.needGroups.map((row) => [row.text, row.to, row.reason])).toEqual([
      ['14 x combates.', 'combates', 'combate'],
      ['1 x Mazmorra Kutulú.', 'mazmorras', 'mazmorra'],
      ['200 x Pepita.', 'recursos', 'tipo de objeto'],
      ['Ser minero nivel 20 mínimo.', 'oficios', 'oficio'],
      ['Ayuda de otras 2 personas.', 'otros', 'sin clasificar'],
    ])
  })

  it('si Torre ordenó Necesitarás a su manera en el panel, no se toca y se avisa', async () => {
    const slug = 'prueba-dofus-marfil-torre'
    const guides = [guideWith(slug, 918049, marfil)]
    await loadDofusGuides(payload, options(guides))
    const doc = await read(slug)
    const mine = {
      title: null,
      groups: [{ name: 'recursos', rows: doc.needs!.groups!.flatMap((group) => group.rows ?? []) }],
    }
    await payload.update({
      collection: 'dofus-guides',
      id: doc.id,
      data: { needs: mine } as never,
      overrideAccess: true,
    })

    const report = await loadDofusGuides(payload, options(guides))
    expect(report.kept).toEqual([{ slug, field: 'needs' }])
    expect(report.needGroups).toEqual([])
    expect(await names(slug)).toEqual(['recursos'])
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
