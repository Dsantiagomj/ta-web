import type { DofusDbClient } from './client'
import type { RawMapPosition, RawNpc, RawQuest } from './types'

export interface QuestData {
  quests: RawQuest[]
  npcs: RawNpc[]
  mapPositions: RawMapPosition[]
}

/** Todas las misiones de DofusDB, más los PNJ y mapas que aparecen en sus posiciones de inicio. */
export async function fetchQuestData(client: DofusDbClient): Promise<QuestData> {
  const quests = await client.fetchAll<RawQuest>('quests')
  const npcIds = new Set<number>()
  const mapIds = new Set<number>()
  for (const quest of quests) {
    for (const position of quest.startPosition ?? []) {
      if (position?.npcId != null) npcIds.add(position.npcId)
      if (position?.mapId != null) mapIds.add(position.mapId)
    }
  }
  const npcs = await client.fetchByIds<RawNpc>('npcs', [...npcIds])
  const mapPositions = await client.fetchByIds<RawMapPosition>('map-positions', [...mapIds])
  return { quests, npcs, mapPositions }
}
