import type { Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import type { QuestData } from '@/lib/dofusdb/fetch-quest-data'
import {
  GAME_DATA_COLLECTIONS,
  refreshGameData,
  rowFailures,
  type GameDataSummary,
} from '@/lib/dofusdb/refresh-game-data'
import type { RawAchievement, RawAchievementCategory, RawNpc, RawQuest } from '@/lib/dofusdb/types'
import type { User } from '@/payload-types'

import categories from '../fixtures/dofusdb/achievement-categories.json'
import achievements from '../fixtures/dofusdb/achievements.json'
import items from '../fixtures/dofusdb/items.json'
import mapPositions from '../fixtures/dofusdb/map-positions.json'
import monsters from '../fixtures/dofusdb/monsters.json'
import npcs from '../fixtures/dofusdb/npcs.json'
import quests from '../fixtures/dofusdb/quests-steps.json'

import { createPanelUser, startPayload } from './payload'

// El refresco entero de los datos del juego, el que corren el script, la tarea programada y
// el botón del panel, con DofusDB sustituido por los fixtures y sin red para las imágenes.

const DUNGEON = 990_777

function dofusDb(rename = false): QuestData {
  const data = structuredClone({
    quests: quests as RawQuest[],
    npcs: npcs as RawNpc[],
    mapPositions,
    items,
    monsters,
    subAreas: [{ id: 990_001, name: { es: 'Subzona de prueba' }, areaId: 990_002 }],
    areas: [{ id: 990_002, name: { es: 'Área de prueba' } }],
    achievements: achievements as RawAchievement[],
    achievementCategories: categories as RawAchievementCategory[],
    dungeons: [{ id: DUNGEON, name: { es: 'Mazmorra de prueba' }, bosses: [] }],
  }) as QuestData
  if (!rename) return data
  const bis = <T extends { name?: { es?: string } | null }>(row: T): T => ({
    ...row,
    name: { ...row.name, es: `${row.name?.es} (bis)` },
  })
  return {
    ...data,
    quests: data.quests.map(bis),
    npcs: data.npcs.map(bis),
    items: data.items.map(bis),
    monsters: data.monsters.map(bis),
    achievements: data.achievements!.map(bis),
    dungeons: data.dungeons!.map(bis),
  }
}

const offline = async () => {
  throw new Error('sin red en las pruebas')
}

let payload: Payload
let editor: User

const CORRECTABLE = ['quests', 'items', 'monsters', 'npcs', 'achievements', 'dungeons'] as const

async function cleanUp() {
  for (const collection of [
    'achievement-pages',
    'achievement-groups',
    'achievements',
    'achievement-categories',
    'quests',
    'items',
    'monsters',
    'dungeons',
    'npcs',
    'subareas',
  ] as const) {
    await payload.delete({ collection, where: { id: { exists: true } } })
  }
}

function refresh(data: QuestData): Promise<GameDataSummary> {
  return refreshGameData(payload, {
    fetchData: async () => data,
    fetchImage: offline,
  })
}

beforeAll(async () => {
  payload = await startPayload()
  await cleanUp()
  editor = await createPanelUser(payload, 'editor')
})

afterAll(async () => {
  await cleanUp()
  await payload.destroy()
})

describe('refreshGameData', () => {
  it('guarda todas las colecciones del juego y cuenta lo que hizo en cada una', async () => {
    const summary = await refresh(dofusDb())

    expect(Object.keys(summary.collections).sort()).toEqual([...GAME_DATA_COLLECTIONS].sort())
    for (const collection of GAME_DATA_COLLECTIONS) {
      expect(summary.collections[collection].created, collection).toBeGreaterThan(0)
    }
    expect(rowFailures(summary)).toBe(0)
  })

  it('repetirlo con los mismos datos no cambia nada', async () => {
    const summary = await refresh(dofusDb())

    for (const collection of GAME_DATA_COLLECTIONS) {
      expect(summary.collections[collection], collection).toMatchObject({
        created: 0,
        updated: 0,
        failed: 0,
      })
    }
    expect(summary.newPages).toEqual({ groups: 0, pages: 0 })
  })

  it('cambia lo de DofusDB y nunca la «Corrección de Torre», ni lo que escribió Torre', async () => {
    const corrected = new Map<(typeof CORRECTABLE)[number], number>()
    for (const collection of CORRECTABLE) {
      const doc = (await payload.find({ collection, limit: 1, depth: 0, sort: 'id' })).docs[0]!
      await payload.update({
        collection,
        id: doc.id,
        data: { correction: { name: `De Torre (${collection})` } },
        overrideAccess: false,
        user: editor,
      })
      corrected.set(collection, doc.id)
    }
    const page = (await payload.find({ collection: 'achievement-pages', limit: 1, depth: 0 }))
      .docs[0]!
    await payload.update({
      collection: 'achievement-pages',
      id: page.id,
      data: { name: 'El nombre que eligió Torre' },
      overrideAccess: false,
      user: editor,
    })

    const summary = await refresh(dofusDb(true))

    expect(rowFailures(summary)).toBe(0)
    for (const [collection, id] of corrected) {
      const doc = await payload.findByID({ collection, id, depth: 0 })
      expect(doc.name, collection).toMatch(/\(bis\)$/)
      expect(doc, collection).toMatchObject({
        correction: { name: `De Torre (${collection})` },
        corrected: true,
      })
    }
    const after = await payload.findByID({ collection: 'achievement-pages', id: page.id })
    expect(after.name).toBe('El nombre que eligió Torre')
  })
})
