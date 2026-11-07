import type { Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { gameImageKey } from '@/lib/dofusdb/game-images'
import { refreshAchievements } from '@/lib/dofusdb/refresh-achievements'
import type { RawAchievement, RawAchievementCategory } from '@/lib/dofusdb/types'

import categories from '../fixtures/dofusdb/achievement-categories.json'
import achievements from '../fixtures/dofusdb/achievements.json'

import { startPayload, tinyPng } from './payload'

// Los logros y sus categorías de DofusDB, con las misiones y objetos ya guardados por el
// refresco de misiones. DofusDB se sustituye por una función que devuelve un PNG.

const QUESTS = [1975, 1976, 1977]
const ITEMS = [1681, 2467, 2574]

function data() {
  return structuredClone({
    achievements: achievements as RawAchievement[],
    categories: categories as RawAchievementCategory[],
  })
}

function images() {
  const calls: string[] = []
  return {
    calls,
    fetchImage: async (url: string) => {
      calls.push(url)
      return tinyPng().data
    },
  }
}

let payload: Payload

async function cleanUp() {
  await payload.delete({ collection: 'achievements', where: { id: { exists: true } } })
  await payload.delete({ collection: 'achievement-categories', where: { id: { exists: true } } })
  await payload.delete({ collection: 'quests', where: { dofusId: { in: QUESTS } } })
  await payload.delete({ collection: 'items', where: { dofusId: { in: ITEMS } } })
  await payload.delete({
    collection: 'media',
    where: { gameAsset: { like: 'dofusdb-achievement-image' } },
  })
}

async function achievement(dofusId: number) {
  const { docs } = await payload.find({
    collection: 'achievements',
    where: { dofusId: { equals: dofusId } },
    depth: 1,
  })
  return docs[0]
}

beforeAll(async () => {
  payload = await startPayload()
  await cleanUp()
  for (const dofusId of QUESTS) {
    await payload.create({ collection: 'quests', data: { dofusId, name: `Misión ${dofusId}` } })
  }
  for (const dofusId of ITEMS) {
    await payload.create({ collection: 'items', data: { dofusId, name: `Objeto ${dofusId}` } })
  }
})

afterAll(async () => {
  await cleanUp()
  await payload.destroy()
})

describe('refresco de logros desde DofusDB', () => {
  const first = new Date('2026-01-01T10:00:00.000Z')

  it('guarda todas las categorías y los logros de las de misiones y eventos', async () => {
    const fetcher = images()
    const counts = await refreshAchievements(payload, data(), {
      now: first,
      fetchImage: fetcher.fetchImage,
    })

    expect(counts.categories).toEqual({ created: 6, updated: 0, unchanged: 0 })
    // 1671, 1677, 1678 y 1679 (Astrub, en Misiones) y 982 (Vulkania, en Eventos).
    expect(counts.achievements).toEqual({ created: 5, updated: 0, unchanged: 0 })
    // Los iconos 203, 82, 458 y 459, una vez cada uno: 982 comparte uno de ellos.
    expect(counts.icons).toEqual({ imported: 4, reused: 0, failed: 0 })
    expect(new Set(fetcher.calls).size).toBe(fetcher.calls.length)

    const { docs } = await payload.find({
      collection: 'achievement-categories',
      where: { dofusId: { equals: 45 } },
      depth: 1,
    })
    expect(docs[0]).toMatchObject({ name: 'Astrub', order: 13, parent: { dofusId: 8 } })
  })

  it('enlaza misiones, categoría, objetos, icono y los logros que lo piden', async () => {
    const doc = await achievement(1671)
    expect(doc).toMatchObject({
      name: 'La ocasión hace al ladrón',
      points: 10,
      level: 25,
      order: 9,
      category: { dofusId: 45 },
      icon: { gameAsset: gameImageKey('achievement', 203) },
      rewards: { experience: 102_128, kamas: 1_105 },
      refreshedAt: first.toISOString(),
    })
    expect(
      doc!.quests!.map((row) => row.quests?.map((quest) => (quest as { dofusId: number }).dofusId)),
    ).toEqual([[1975], [1976], [1977]])
    expect(doc!.rewards!.items!.map((row) => (row.item as { dofusId: number }).dofusId)).toEqual(
      ITEMS,
    )
    expect(doc!.countsFor!.map((meta) => [meta.name, meta.achievements])).toEqual([
      ['Periplo astrubiense', 6],
      ['De Incarnam a Astrub', 4],
    ])
    expect(doc!.countsFor![0]!.icon).toMatchObject({ gameAsset: gameImageKey('achievement', 82) })
  })

  it('una misión que no está guardada se omite y se cuenta, pero la fila queda', async () => {
    const doc = await achievement(1678)
    expect(doc!.quests).toHaveLength(6)
    expect(doc!.quests![3]!.name).toBe('Misión de clase')
    expect(doc!.quests![3]!.quests ?? []).toEqual([])
  })

  it('repetido con los mismos datos no cambia nada ni descarga iconos', async () => {
    const fetcher = images()
    const counts = await refreshAchievements(payload, data(), {
      now: new Date('2026-02-01T10:00:00.000Z'),
      fetchImage: fetcher.fetchImage,
    })
    expect(counts.categories).toEqual({ created: 0, updated: 0, unchanged: 6 })
    expect(counts.achievements).toEqual({ created: 0, updated: 0, unchanged: 5 })
    expect(counts.icons).toEqual({ imported: 0, reused: 4, failed: 0 })
    expect(fetcher.calls).toEqual([])
    expect((await achievement(1671))!.refreshedAt).toBe(first.toISOString())
  })

  it('actualiza lo que cambia en DofusDB', async () => {
    const changed = data()
    changed.achievements.find((raw) => raw.id === 1671)!.points = 15
    const counts = await refreshAchievements(payload, changed, { fetchImage: images().fetchImage })
    expect(counts.achievements).toEqual({ created: 0, updated: 1, unchanged: 4 })
    expect((await achievement(1671))!.points).toBe(15)
  })
})
