import { describe, expect, it } from 'vitest'

import type { DofusDbClient } from '@/lib/dofusdb/client'
import { fetchQuestData } from '@/lib/dofusdb/fetch-quest-data'
import type { RawQuest } from '@/lib/dofusdb/types'

import mapPositions from '../fixtures/dofusdb/map-positions.json'
import npcs from '../fixtures/dofusdb/npcs.json'
import quests from '../fixtures/dofusdb/quests.json'

describe('fetchQuestData', () => {
  it('trae las misiones y busca solo los PNJ y mapas de sus posiciones de inicio', async () => {
    const lookups: Record<string, number[]> = {}
    const rows: Record<string, unknown[]> = {
      quests,
      npcs,
      'map-positions': mapPositions,
    }
    const client: DofusDbClient = {
      fetchAll: async <T>(collection: string) => rows[collection] as T[],
      fetchByIds: async <T>(collection: string, ids: number[]) => {
        lookups[collection] = ids
        return rows[collection] as T[]
      },
    }

    const data = await fetchQuestData(client)

    expect(data).toEqual({ quests, npcs, mapPositions })
    const positions = (quests as RawQuest[]).flatMap((quest) => quest.startPosition ?? [])
    expect(new Set(lookups.npcs)).toEqual(new Set(positions.map((position) => position?.npcId)))
    expect(new Set(lookups['map-positions'])).toEqual(
      new Set(positions.map((position) => position?.mapId)),
    )
  })
})
