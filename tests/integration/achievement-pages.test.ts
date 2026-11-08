import { Forbidden, ValidationError, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { achievementValues, groupValues } from '@/lib/achievements/dofusdb-source'
import { ensureAchievementPages } from '@/lib/achievements/ensure-pages'
import type { Achievement, AchievementCategory, Npc, Quest, User } from '@/payload-types'

import { createPanelUser, startPayload } from './payload'

// Las páginas de logro y los metalogros de Torre: copian lo que da DofusDB en lo vacío al
// guardar, nunca pisan lo escrito, y el refresco crea las que faltan sin tocar las demás.

let payload: Payload
let editor: User
let misiones: AchievementCategory
let astrub: AchievementCategory
let ocasion: Achievement
let quests: Quest[]
let giver: Npc

async function cleanUp() {
  for (const collection of [
    'achievement-pages',
    'achievement-groups',
    'achievements',
    'achievement-categories',
  ] as const) {
    await payload.delete({ collection, where: { id: { exists: true } } })
  }
  await payload.delete({ collection: 'quests', where: { dofusId: { in: [1975, 1976] } } })
  await payload.delete({ collection: 'npcs', where: { dofusId: { equals: 1502 } } })
  await payload.delete({ collection: 'quest-guides', where: { slug: { like: 'prueba-logro' } } })
}

beforeAll(async () => {
  payload = await startPayload()
  await cleanUp()
  editor = await createPanelUser(payload)
  giver = await payload.create({
    collection: 'npcs',
    data: { dofusId: 1502, name: 'Consejera Archi' },
  })
  quests = [
    await payload.create({
      collection: 'quests',
      data: {
        dofusId: 1975,
        name: 'Esto hace aguas',
        levelMin: 15,
        startPositions: [{ npcId: 1502 }],
      },
    }),
    await payload.create({
      collection: 'quests',
      data: { dofusId: 1976, name: 'Seis pies bajo tierra' },
    }),
  ]
  misiones = await payload.create({
    collection: 'achievement-categories',
    data: { dofusId: 8, name: 'Misiones', order: 4 },
  })
  astrub = await payload.create({
    collection: 'achievement-categories',
    data: { dofusId: 45, name: 'Astrub', order: 13, parent: misiones.id },
  })
  ocasion = await payload.create({
    collection: 'achievements',
    data: {
      dofusId: 1671,
      name: 'La ocasión hace al ladrón',
      points: 10,
      order: 9,
      category: astrub.id,
      quests: [
        { name: 'Esto hace aguas', quests: [quests[0]!.id] },
        { name: 'Seis pies bajo tierra', quests: [quests[1]!.id] },
      ],
      rewards: { experience: 102_128, kamas: 1_105 },
    },
  })
})

afterAll(async () => {
  await cleanUp()
  await payload.destroy()
})

describe('valores de DofusDB', () => {
  it('de un metalogro: nombre, orden, sección y quien da la primera misión', async () => {
    expect(await groupValues(payload, astrub.id)).toEqual({
      name: 'Astrub',
      order: 13,
      section: 'zones',
      representative: { relationTo: 'npcs', id: giver.id, name: 'Consejera Archi' },
    })
  })
})

describe('la sección de un metalogro', () => {
  it('lo que cuelga de Eventos es de temporada, también más abajo', async () => {
    const eventos = await payload.create({
      collection: 'achievement-categories',
      data: { dofusId: 9, name: 'Eventos', order: 7 },
    })
    const vulkania = await payload.create({
      collection: 'achievement-categories',
      data: { dofusId: 60, name: 'Archipiélago de Vulkania', order: 0, parent: eventos.id },
    })
    const nested = await payload.create({
      collection: 'achievement-categories',
      data: { dofusId: 6001, name: 'Subcategoría de Vulkania', order: 0, parent: vulkania.id },
    })
    expect((await groupValues(payload, vulkania.id))?.section).toBe('seasonal')
    expect((await groupValues(payload, nested.id))?.section).toBe('seasonal')
    for (const doc of [nested, vulkania, eventos]) {
      await payload.delete({ collection: 'achievement-categories', id: doc.id })
    }
  })
})

describe('el refresco crea lo que falta', () => {
  it('un metalogro por categoría de misiones y una página por logro con misiones', async () => {
    const counts = await ensureAchievementPages(payload)
    expect(counts).toEqual({ groups: 1, pages: 1 })

    const group = (await payload.find({ collection: 'achievement-groups', depth: 0 })).docs[0]!
    expect(group).toMatchObject({
      category: astrub.id,
      name: 'Astrub',
      slug: 'metalogro-astrub',
      order: 13,
      section: 'zones',
      representative: { relationTo: 'npcs', value: giver.id },
      state: 'preparing',
      _status: 'published',
    })

    const page = (await payload.find({ collection: 'achievement-pages', depth: 0 })).docs[0]!
    expect(page).toMatchObject({
      achievement: ocasion.id,
      name: 'La ocasión hace al ladrón',
      slug: 'la-ocasion-hace-al-ladron',
      group: group.id,
      order: 9,
      points: 10,
      rewards: { experience: 102_128, kamas: 1_105 },
      state: 'preparing',
      _status: 'published',
    })
    expect(page.quests!.map((row) => row.quests)).toEqual([[quests[0]!.id], [quests[1]!.id]])
    expect(await achievementValues(payload, ocasion.id)).toMatchObject({
      group: { id: group.id, name: 'Astrub' },
    })
  })

  it('también en las categorías que cuelgan de otra, como hace el refresco', async () => {
    const nested = await payload.create({
      collection: 'achievement-categories',
      data: { dofusId: 4501, name: 'Subzona de prueba', order: 1, parent: astrub.id },
    })
    await payload.create({
      collection: 'achievements',
      data: {
        dofusId: 1673,
        name: 'Logro de una subzona',
        category: nested.id,
        quests: [{ quests: [quests[0]!.id] }],
      },
    })
    expect(await ensureAchievementPages(payload)).toEqual({ groups: 1, pages: 1 })
  })

  it('repetido no crea ni cambia nada', async () => {
    expect(await ensureAchievementPages(payload)).toEqual({ groups: 0, pages: 0 })
  })
})

describe('lo de Torre manda', () => {
  async function page() {
    const { docs } = await payload.find({
      collection: 'achievement-pages',
      where: { achievement: { equals: ocasion.id } },
      depth: 0,
    })
    return docs[0]!
  }

  it('el panel cambia nombre, puntos y estado, y DofusDB no lo pisa', async () => {
    const before = await page()
    await payload.update({
      collection: 'achievement-pages',
      id: before.id,
      data: { name: 'La ocasión', points: 12, state: 'published' },
      overrideAccess: false,
      user: editor,
    })
    await payload.update({ collection: 'achievements', id: ocasion.id, data: { points: 20 } })
    await ensureAchievementPages(payload)
    expect(await page()).toMatchObject({ name: 'La ocasión', points: 12, state: 'published' })
  })

  it('un campo vaciado vuelve a lo que da DofusDB al guardar', async () => {
    const current = await page()
    const saved = await payload.update({
      collection: 'achievement-pages',
      id: current.id,
      data: { points: null },
      overrideAccess: false,
      user: editor,
    })
    expect(saved.points).toBe(20)
  })

  it('nadie crea ni borra páginas sin sesión', async () => {
    await expect(
      payload.create({
        collection: 'achievement-pages',
        data: { achievement: ocasion.id, name: 'Anónima', slug: 'anonima', state: 'published' },
        overrideAccess: false,
      }),
    ).rejects.toThrow(Forbidden)
  })
})

describe('un slug para guías, logros y metalogros', () => {
  it('cuenta también el slug del último borrador: publicar no puede chocar luego', async () => {
    const guide = await payload.create({
      collection: 'quest-guides',
      data: { title: 'Guía con borrador', slug: 'prueba-logro-publicada', _status: 'published' },
    })
    // Torre cambia el slug en un borrador guardado, sin publicarlo.
    await payload.update({
      collection: 'quest-guides',
      id: guide.id,
      data: { slug: 'prueba-logro-del-borrador' },
      draft: true,
    })
    const error = await payload
      .create({
        collection: 'achievement-groups',
        data: {
          name: 'Metalogro que choca',
          slug: 'prueba-logro-del-borrador',
          state: 'preparing',
        },
        overrideAccess: false,
        user: editor,
      })
      .catch((caught: unknown) => caught)
    expect(error).toBeInstanceOf(ValidationError)
  })

  it('el slug que sale de la misión toma un sufijo libre si ya es de un logro o metalogro', async () => {
    await payload.create({
      collection: 'achievement-groups',
      data: { name: 'Choque', slug: 'prueba-logro-mision-choque', state: 'preparing' },
    })
    const quest = await payload.create({
      collection: 'quests',
      data: { dofusId: 990_501, name: 'Prueba logro misión choque' },
    })
    try {
      const guide = await payload.create({
        collection: 'quest-guides',
        data: { quest: quest.id } as never,
        draft: true,
      })
      expect(guide.slug).toBe('prueba-logro-mision-choque-2')
    } finally {
      await payload.delete({ collection: 'quest-guides', where: { quest: { equals: quest.id } } })
      await payload.delete({ collection: 'quests', id: quest.id })
    }
  })

  it('una guía no puede usar el slug de un logro', async () => {
    const error = await payload
      .create({
        collection: 'quest-guides',
        data: { title: 'Guía', slug: 'la-ocasion-hace-al-ladron' },
        overrideAccess: false,
        user: editor,
      })
      .catch((caught: unknown) => caught)
    expect(error).toBeInstanceOf(ValidationError)
    expect((error as ValidationError).data.errors[0]).toMatchObject({ path: 'slug' })
  })

  it('un logro nuevo cuyo nombre ya es una guía toma el prefijo logro-', async () => {
    await payload.create({
      collection: 'quest-guides',
      data: { title: 'Prueba', slug: 'prueba-logro-gemelo', _status: 'published' },
    })
    const twin = await payload.create({
      collection: 'achievements',
      data: {
        dofusId: 1672,
        name: 'Prueba logro gemelo',
        category: astrub.id,
        quests: [{ quests: [quests[1]!.id] }],
      },
    })
    await ensureAchievementPages(payload)
    const { docs } = await payload.find({
      collection: 'achievement-pages',
      where: { achievement: { equals: twin.id } },
      depth: 0,
    })
    expect(docs[0]!.slug).toBe('logro-prueba-logro-gemelo')
  })
})
