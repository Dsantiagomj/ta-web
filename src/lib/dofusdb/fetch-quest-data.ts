import type { DofusDbClient } from './client'
import { questNeeds } from './quest-needs'
import { questRewards } from './quest-rewards'
import type { RawItem, RawMapPosition, RawMonster, RawNpc, RawQuest } from './types'

export interface QuestData {
  quests: RawQuest[]
  npcs: RawNpc[]
  mapPositions: RawMapPosition[]
  items: RawItem[]
  monsters: RawMonster[]
}

/**
 * Todas las misiones de DofusDB, más los PNJ y mapas de sus posiciones de inicio y los
 * objetos y monstruos de sus recompensas y requisitos. Solo se piden los que se nombran.
 */
export async function fetchQuestData(client: DofusDbClient): Promise<QuestData> {
  const quests = await client.fetchAll<RawQuest>('quests')
  const npcIds = new Set<number>()
  const mapIds = new Set<number>()
  const itemIds = new Set<number>()
  const monsterIds = new Set<number>()
  for (const quest of quests) {
    for (const position of quest.startPosition ?? []) {
      if (position?.npcId != null) npcIds.add(position.npcId)
      if (position?.mapId != null) mapIds.add(position.mapId)
    }
    const needs = questNeeds(quest)
    for (const { dofusId } of [...questRewards(quest).items, ...needs.items]) itemIds.add(dofusId)
    for (const { dofusId } of needs.monsters) monsterIds.add(dofusId)
  }
  const npcs = await client.fetchByIds<RawNpc>('npcs', [...npcIds])
  const mapPositions = await client.fetchByIds<RawMapPosition>('map-positions', [...mapIds])
  const items = await client.fetchByIds<RawItem>('items', [...itemIds])
  const monsters = await client.fetchByIds<RawMonster>('monsters', [...monsterIds])
  return { quests, npcs, mapPositions, items, monsters }
}
