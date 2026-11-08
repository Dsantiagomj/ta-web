import type { Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import {
  findGuideAchievement,
  readAchievementPage,
  readMetalogrosIndex,
} from '@/lib/achievements/queries'
import type { User } from '@/payload-types'

import { createPanelUser, startPayload } from './payload'

// Lo que lee la página de un logro, como un visitante (overrideAccess: false): solo lo
// publicado, y un logro En preparación no tiene página. Con la vista previa del panel, sí.

let payload: Payload
let editor: User

async function cleanUp() {
  for (const collection of [
    'achievement-pages',
    'achievement-groups',
    'achievements',
    'achievement-categories',
    'quest-guides',
  ] as const) {
    await payload.delete({ collection, where: { id: { exists: true } } })
  }
  await payload.delete({ collection: 'quests', where: { dofusId: { in: [1975, 1976, 1977] } } })
  await payload.delete({ collection: 'npcs', where: { dofusId: { equals: 4412 } } })
  await payload.delete({ collection: 'items', where: { dofusId: { equals: 990_366 } } })
}

beforeAll(async () => {
  payload = await startPayload()
  await cleanUp()
  editor = await createPanelUser(payload)
  await payload.create({ collection: 'npcs', data: { dofusId: 4412, name: 'Hupe Esse' } })
  const pico = await payload.create({
    collection: 'items',
    data: { dofusId: 990_366, name: 'Pico de tofu' },
  })
  const [aguas, seis, cazador] = [
    await payload.create({
      collection: 'quests',
      data: { dofusId: 1975, name: 'Esto hace aguas', levelMin: 15 },
    }),
    await payload.create({
      collection: 'quests',
      data: {
        dofusId: 1976,
        name: 'Seis pies bajo tierra',
        levelMin: 20,
        startPositions: [{ npcId: 4412 }],
      },
    }),
    await payload.create({
      collection: 'quests',
      data: { dofusId: 1977, name: 'El cazador cazado', levelMin: 25 },
    }),
  ]
  await payload.create({
    collection: 'quest-guides',
    data: {
      title: 'Seis pies bajo tierra',
      slug: 'seis-pies-bajo-tierra',
      quest: seis.id,
      summary: { needs: { notes: '1 x Combate (solo).', items: [{ item: pico.id, quantity: 2 }] } },
      _status: 'published',
    },
  })
  // La guía de la tercera misión, sin publicar: su tarjeta va sin enlace.
  await payload.create({
    collection: 'quest-guides',
    data: { title: 'El cazador cazado', slug: 'el-cazador-cazado', quest: cazador.id },
    draft: true,
  })
  const group = await payload.create({
    collection: 'achievement-groups',
    data: { name: 'Astrub', slug: 'metalogro-astrub', state: 'published', _status: 'published' },
  })
  for (const [dofusId, name, slug, state, quests] of [
    [1678, 'Un ciudadano modelo', 'un-ciudadano-modelo', 'published', [aguas]],
    [
      1671,
      'La ocasión hace al ladrón',
      'la-ocasion-hace-al-ladron',
      'published',
      [aguas, seis, cazador],
    ],
    [1672, 'La gran biblioteca', 'la-gran-biblioteca', 'preparing', [cazador]],
  ] as const) {
    const achievement = await payload.create({
      collection: 'achievements',
      data: { dofusId, name },
    })
    await payload.create({
      collection: 'achievement-pages',
      data: {
        achievement: achievement.id,
        name,
        slug,
        state,
        group: group.id,
        order: dofusId === 1678 ? 1 : dofusId === 1671 ? 2 : 3,
        quests: quests.map((quest) => ({ name: quest.name, quests: [quest.id] })),
        _status: 'published',
      },
    })
  }
})

afterAll(async () => {
  await cleanUp()
  await payload.destroy()
})

describe('readAchievementPage', () => {
  it('lee la página publicada con su metalogro, sus guías publicadas y quien da cada misión', async () => {
    const data = await readAchievementPage(payload, 'la-ocasion-hace-al-ladron')
    expect(data?.page).toMatchObject({
      name: 'La ocasión hace al ladrón',
      group: { name: 'Astrub' },
    })
    expect(data?.siblings.map((doc) => [doc.name, doc.state])).toEqual([
      ['Un ciudadano modelo', 'published'],
      ['La ocasión hace al ladrón', 'published'],
      ['La gran biblioteca', 'preparing'],
    ])
    // Con el nivel de sus misiones, para «Niveles 15 a 30» en la columna.
    const first = data?.siblings[0]?.quests?.[0]?.quests?.[0]
    expect(first).toMatchObject({ levelMin: 15 })
    // Solo la guía publicada; el borrador no se ve.
    expect(data?.guides.map((guide) => guide.slug)).toEqual(['seis-pies-bajo-tierra'])
    expect(data?.guides[0]?.needs?.notes).toBe('1 x Combate (solo).')
    // Los objetos que pide, con su nombre: la página los suma en «Necesitarás en total».
    expect(data?.guides[0]?.needs?.items).toMatchObject([
      { item: { name: 'Pico de tofu' }, quantity: 2 },
    ])
    expect([...(data?.givers.values() ?? [])].map((npc) => npc.name)).toEqual(['Hupe Esse'])
  })

  it('un logro En preparación no tiene página para un visitante', async () => {
    expect(await readAchievementPage(payload, 'la-gran-biblioteca')).toBeNull()
  })

  it('la vista previa del panel lo enseña', async () => {
    const data = await readAchievementPage(payload, 'la-gran-biblioteca', {
      preview: { user: editor },
    })
    expect(data?.page.name).toBe('La gran biblioteca')
  })

  it('un slug que no es de logro, o reservado, no consulta nada', async () => {
    expect(await readAchievementPage(payload, 'no-existe')).toBeNull()
    expect(await readAchievementPage(payload, 'sistema')).toBeNull()
  })
})

describe('findGuideAchievement', () => {
  async function questId(dofusId: number) {
    const { docs } = await payload.find({
      collection: 'quests',
      where: { dofusId: { equals: dofusId } },
    })
    return docs[0]!.id
  }

  it('la página de logro de una misión, su metalogro y su lugar en ella', async () => {
    // Seis pies bajo tierra está en un solo logro: La ocasión hace al ladrón, la 2 de 3.
    expect(await findGuideAchievement(payload, await questId(1976))).toEqual({
      page: {
        name: 'La ocasión hace al ladrón',
        slug: 'la-ocasion-hace-al-ladron',
        published: true,
      },
      group: { name: 'Astrub', slug: 'metalogro-astrub' },
      position: 2,
      total: 3,
    })
  })

  it('si está en varios, el primero del metalogro; uno En preparación se dice', async () => {
    // El cazador cazado está en La ocasión (publicada) y en La gran biblioteca (en preparación).
    const found = await findGuideAchievement(payload, await questId(1977))
    expect(found?.page.slug).toBe('la-ocasion-hace-al-ladron')
    expect(found?.position).toBe(3)
  })

  it('sin página de logro, nada', async () => {
    expect(await findGuideAchievement(payload, 999_999)).toBeNull()
    expect(await findGuideAchievement(payload, null)).toBeNull()
  })
})

describe('readMetalogrosIndex', () => {
  it('los metalogros, sus páginas de logro con sus misiones y las guías sueltas publicadas', async () => {
    const guides = await payload.find({
      collection: 'quest-guides',
      draft: true,
      pagination: false,
    })
    const group = (await payload.find({ collection: 'achievement-groups', limit: 1 })).docs[0]!
    await payload.update({
      collection: 'achievement-groups',
      id: group.id,
      data: { guides: guides.docs.map((guide) => guide.id) },
    })
    const index = await readMetalogrosIndex(payload)
    expect(index.groups.map((doc) => doc.name)).toEqual(['Astrub'])
    expect(index.pages.map((page) => [page.name, page.state])).toEqual([
      ['Un ciudadano modelo', 'published'],
      ['La ocasión hace al ladrón', 'published'],
      ['La gran biblioteca', 'preparing'],
    ])
    // Con el nombre y el nivel de sus misiones, para la búsqueda y «Niv. 15–25».
    expect(index.pages[1]!.quests![1]!.quests![0]).toMatchObject({
      name: 'Seis pies bajo tierra',
      levelMin: 20,
    })
    // Solo la guía publicada: el borrador no llega a un visitante.
    expect([...index.guides.values()].map((guide) => guide.slug)).toEqual(['seis-pies-bajo-tierra'])
  })
})
