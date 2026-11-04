import { describe, expect, it } from 'vitest'

import type { DofusDbClient } from '@/lib/dofusdb/client'
import { fetchQuestData } from '@/lib/dofusdb/fetch-quest-data'
import type { RawQuest } from '@/lib/dofusdb/types'

import items from '../fixtures/dofusdb/items.json'
import mapPositions from '../fixtures/dofusdb/map-positions.json'
import monsters from '../fixtures/dofusdb/monsters.json'
import npcs from '../fixtures/dofusdb/npcs.json'
import questsWithSteps from '../fixtures/dofusdb/quests-steps.json'
import quests from '../fixtures/dofusdb/quests.json'

/** Un cliente que sirve los fixtures y apunta qué IDs le piden de cada colección. */
function fixtureClient(rows: Record<string, unknown[]>) {
  const lookups: Record<string, number[]> = {}
  const client: DofusDbClient = {
    fetchAll: async <T>(collection: string) => rows[collection] as T[],
    fetchByIds: async <T>(collection: string, ids: number[]) => {
      lookups[collection] = ids
      return (rows[collection] ?? []) as T[]
    },
  }
  return { client, lookups }
}

describe('fetchQuestData', () => {
  it('trae las misiones y busca solo los PNJ y mapas de sus posiciones de inicio', async () => {
    const { client, lookups } = fixtureClient({ quests, npcs, 'map-positions': mapPositions })

    const data = await fetchQuestData(client)

    expect(data).toMatchObject({ quests, npcs, mapPositions })
    const positions = (quests as RawQuest[]).flatMap((quest) => quest.startPosition ?? [])
    expect(new Set(lookups.npcs)).toEqual(new Set(positions.map((position) => position?.npcId)))
    expect(new Set(lookups['map-positions'])).toEqual(
      new Set(positions.map((position) => position?.mapId)),
    )
  })

  it('busca solo los objetos y monstruos de recompensas y requisitos', async () => {
    const { client, lookups } = fixtureClient({ quests: questsWithSteps, items, monsters })

    const data = await fetchQuestData(client)

    expect(data.items).toEqual(items)
    expect(data.monsters).toEqual(monsters)
    // Los fixtures traen justo los objetos y monstruos que nombran estas misiones
    expect(new Set(lookups.items)).toEqual(new Set(items.map((item) => item.id)))
    expect(new Set(lookups.monsters)).toEqual(new Set(monsters.map((monster) => monster.id)))
  })
})
