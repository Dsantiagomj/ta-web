import type { Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { readAchievementPage } from '@/lib/achievements/queries'
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
