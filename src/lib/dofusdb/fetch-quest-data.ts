import type { DofusDbClient } from './client'
import { questNeeds } from './quest-needs'
import type { RawItem, RawMapPosition, RawMonster, RawNpc, RawQuest } from './types'

export interface QuestData {
  quests: RawQuest[]
  npcs: RawNpc[]
  mapPositions: RawMapPosition[]
  items: RawItem[]
  monsters: RawMonster[]
}

// Los campos de cada objeto que se guardan. Con typeId, DofusDB añade el tipo, que trae
// el supertipo; la fila entera pesa unas ocho veces más.
const ITEM_FIELDS = ['id', 'name', 'level', 'typeId', 'iconId', 'type']

/**
 * Todas las misiones de DofusDB, más los PNJ y mapas de sus posiciones de inicio y los
 * monstruos de sus requisitos, que se piden por ID. Los objetos se traen todos, no solo
 * los que nombran las misiones: Torre puede necesitar cualquiera en una guía.
 */
export async function fetchQuestData(client: DofusDbClient): Promise<QuestData> {
  const quests = await client.fetchAll<RawQuest>('quests')
  const npcIds = new Set<number>()
  const mapIds = new Set<number>()
  const monsterIds = new Set<number>()
  for (const quest of quests) {
    for (const position of quest.startPosition ?? []) {
      if (position?.npcId != null) npcIds.add(position.npcId)
      if (position?.mapId != null) mapIds.add(position.mapId)
    }
    for (const { dofusId } of questNeeds(quest).monsters) monsterIds.add(dofusId)
  }
  const npcs = await client.fetchByIds<RawNpc>('npcs', [...npcIds])
  const mapPositions = await client.fetchByIds<RawMapPosition>('map-positions', [...mapIds])
  const items = await client.fetchAll<RawItem>('items', { select: ITEM_FIELDS })
  const monsters = await client.fetchByIds<RawMonster>('monsters', [...monsterIds])
  return { quests, npcs, mapPositions, items, monsters }
}
