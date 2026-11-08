import type { Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { importTorreAchievements } from '../../scripts/import/load-achievements'
import type { AchievementCategory, Npc, QuestGuide } from '@/payload-types'

import { startPayload } from './payload'

// Lo que Torre tiene hoy en Squarespace (su índice y la página de cada metalogro) sobre los
// metalogros y páginas de logro que creó el refresco: sus nombres, slugs, orden y estados.

let payload: Payload
let astrub: AchievementCategory
let guide: QuestGuide
let paula: Npc

async function cleanUp() {
  for (const collection of [
    'achievement-pages',
    'achievement-groups',
    'achievements',
    'achievement-categories',
  ] as const) {
    await payload.delete({ collection, where: { id: { exists: true } } })
  }
  await payload.delete({ collection: 'quest-guides', where: { slug: { like: 'prueba-importar' } } })
  await payload.delete({ collection: 'npcs', where: { dofusId: { equals: 4356 } } })
}

const TORRE = 'https://www.torrentearcano.com'

// La forma de tmp/mockups/comun/indice/datos.json: el índice de Torre con sus estados.
const zones = [
  {
    name: 'Astrub',
    href: `${TORRE}/metalogro-astrub`,
    done: true,
    pnj: { id: 4356, name: 'Paula Sepe', chosen: true },
    // Un enlace sin logro delante: no debe correr el orden de los demás.
    achievements: [
      { name: 'Nada con este nombre', href: `${TORRE}/nada`, ready: true },
      { name: 'Un ciudadano modelo', href: `${TORRE}/un-ciudadano-modelo`, ready: true },
      {
        name: 'La ocasión hace al ladrón',
        href: `${TORRE}/la-ocasion-hace-al-ladron`,
        ready: true,
      },
    ],
    guides: [{ name: 'Guía suelta', href: `${TORRE}/prueba-importar-guia` }],
  },
  {
    name: 'Misiones de templo',
    href: null,
    done: false,
    pnj: { id: 4355, name: 'Enviada de los Doce', chosen: false },
    achievements: [],
    guides: [],
  },
]

beforeAll(async () => {
  payload = await startPayload()
  await cleanUp()
  paula = await payload.create({ collection: 'npcs', data: { dofusId: 4356, name: 'Paula Sepe' } })
  const misiones = await payload.create({
    collection: 'achievement-categories',
    data: { dofusId: 8, name: 'Misiones', order: 4 },
  })
  astrub = await payload.create({
    collection: 'achievement-categories',
    data: { dofusId: 45, name: 'Astrub', order: 13, parent: misiones.id },
  })
  // La gran biblioteca no está en la lista de Torre: su página la creó el refresco.
  for (const [dofusId, name, order] of [
    [1672, 'La gran biblioteca', 1],
    [1678, 'Un ciudadano modelo', 8],
    [1671, 'La ocasión hace al ladrón', 9],
  ] as const) {
    await payload.create({
      collection: 'achievements',
      data: { dofusId, name, order, category: astrub.id },
    })
  }
  // Lo que crea el refresco: el metalogro, en preparación.
  await payload.create({
    collection: 'achievement-groups',
    data: { category: astrub.id, state: 'preparing', _status: 'published' } as never,
  })
  const biblioteca = await payload.find({
    collection: 'achievements',
    where: { dofusId: { equals: 1672 } },
  })
  await payload.create({
    collection: 'achievement-pages',
    data: {
      achievement: biblioteca.docs[0]!.id,
      state: 'preparing',
      _status: 'published',
    } as never,
  })
  guide = await payload.create({
    collection: 'quest-guides',
    data: { title: 'Guía suelta', slug: 'prueba-importar-guia', _status: 'published' },
  })
})

afterAll(async () => {
  await cleanUp()
  await payload.destroy()
})

describe('importar los metalogros de Torre', () => {
  it('sin --apply solo cuenta: no escribe nada', async () => {
    const report = await importTorreAchievements(payload, {
      zones,
      apply: false,
      ensureNpc: async () => paula.id,
    })
    // Cuenta lo mismo que haría con --apply.
    expect(report.groups).toEqual({ updated: 1, created: 1 })
    expect(report.pages).toEqual({ updated: 0, created: 2 })
    expect(report.unmatched).toEqual([{ group: 'Astrub', name: 'Nada con este nombre' }])
    // Solo la página que creó el refresco.
    const { totalDocs } = await payload.count({ collection: 'achievement-pages' })
    expect(totalDocs).toBe(1)
  })

  it('pone nombre, slug, orden, estado, representante elegido y guías sueltas a cada metalogro', async () => {
    const report = await importTorreAchievements(payload, {
      zones,
      apply: true,
      ensureNpc: async (dofusId) => (dofusId === 4356 ? paula.id : null),
    })
    expect(report.unmatched).toEqual([{ group: 'Astrub', name: 'Nada con este nombre' }])

    const { docs } = await payload.find({
      collection: 'achievement-groups',
      sort: 'order',
      depth: 0,
    })
    expect(docs.map((doc) => [doc.name, doc.slug, doc.order, doc.state, doc.section])).toEqual([
      ['Astrub', 'metalogro-astrub', 1, 'published', 'zones'],
      // Sin categoría de DofusDB, una entrada de Torre va con las historias.
      ['Misiones de templo', 'metalogro-misiones-de-templo', 2, 'preparing', 'stories'],
    ])
    expect(docs[0]!.representative).toEqual({ relationTo: 'npcs', value: paula.id })
    expect(docs[0]!.guides).toEqual([guide.id])
    expect(docs[1]!.category ?? null).toBeNull()
  })

  it('crea o actualiza la página de cada logro con el slug, el orden y el estado de Torre', async () => {
    const { docs } = await payload.find({
      collection: 'achievement-pages',
      sort: 'order',
      depth: 0,
    })
    expect(docs.map((doc) => [doc.name, doc.slug, doc.order, doc.state])).toEqual([
      ['Un ciudadano modelo', 'un-ciudadano-modelo', 1, 'published'],
      ['La ocasión hace al ladrón', 'la-ocasion-hace-al-ladron', 2, 'published'],
      // Lo que Torre no lista va detrás, en el orden del juego, y sigue en preparación.
      ['La gran biblioteca', 'la-gran-biblioteca', 3, 'preparing'],
    ])
  })

  it('pone el nombre de Torre en la página, también cuando el del juego es otro', async () => {
    const dragon = await payload.create({
      collection: 'achievements',
      data: { dofusId: 1680, name: 'El descanso del dragón', order: 20, category: astrub.id },
    })
    await importTorreAchievements(payload, {
      zones: [
        {
          ...zones[0]!,
          achievements: [
            ...zones[0]!.achievements,
            {
              name: 'El descenso del dragón',
              href: `${TORRE}/el-descenso-del-dragon`,
              ready: true,
            },
          ],
        },
      ],
      apply: true,
      ensureNpc: async () => null,
    })
    const { docs } = await payload.find({
      collection: 'achievement-pages',
      where: { achievement: { equals: dragon.id } },
      depth: 0,
    })
    expect(docs[0]).toMatchObject({
      name: 'El descenso del dragón',
      slug: 'el-descenso-del-dragon',
    })
    await payload.delete({ collection: 'achievement-pages', id: docs[0]!.id })
    await payload.delete({ collection: 'achievements', id: dragon.id })
  })

  it('copia el estado de cada logro tal cual: listo es Publicada', async () => {
    await importTorreAchievements(payload, {
      zones: [
        {
          ...zones[0]!,
          done: false,
          achievements: [
            { ...zones[0]!.achievements[1]!, ready: true },
            { ...zones[0]!.achievements[2]!, ready: false },
          ],
        },
      ],
      apply: true,
      ensureNpc: async () => null,
    })
    const { docs } = await payload.find({
      collection: 'achievement-pages',
      sort: 'order',
      depth: 0,
    })
    expect(docs.map((doc) => doc.state)).toEqual(['published', 'preparing', 'preparing'])
  })
})
