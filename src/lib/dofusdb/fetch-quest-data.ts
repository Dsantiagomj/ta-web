import type { DofusDbClient } from './client'
import type {
  RawAchievement,
  RawArea,
  RawItem,
  RawMapPosition,
  RawMonster,
  RawNpc,
  RawQuest,
  RawSubArea,
} from './types'

export interface QuestData {
  quests: RawQuest[]
  npcs: RawNpc[]
  mapPositions: RawMapPosition[]
  items: RawItem[]
  monsters: RawMonster[]
  /** Las subzonas y áreas de los mapas de inicio: la zona de la misión. */
  subAreas?: RawSubArea[]
  areas?: RawArea[]
  /** Todos los logros: de ellos sale el logro de cada misión y su posición. */
  achievements?: RawAchievement[]
}

// Los campos de cada objeto que se guardan. Con typeId, DofusDB añade el tipo, que trae
// el supertipo; la fila entera pesa unas ocho veces más.
const ITEM_FIELDS = ['id', 'name', 'level', 'typeId', 'iconId', 'type']
const ACHIEVEMENT_FIELDS = ['id', 'name', 'slug', 'need']
const MONSTER_FIELDS = ['id', 'name', 'gfxId']

function ids(values: (number | null | undefined)[]): number[] {
  return [...new Set(values.filter((value): value is number => value != null))]
}

/**
 * Todas las misiones de DofusDB, más los PNJ y mapas de sus posiciones de inicio y las
 * subzonas y áreas de esos mapas, que se piden por ID. Los objetos, los monstruos y los
 * logros se traen todos: Torre puede nombrar cualquier objeto o monstruo en una guía (los
 * combates se casan por nombre), y el logro de una misión solo se sabe mirando los logros.
 */
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
  const subAreaIds = ids(mapPositions.map((map) => map.subAreaId))
  const subAreas = subAreaIds.length
    ? await client.fetchByIds<RawSubArea>('subareas', subAreaIds)
    : []
  const areaIds = ids(subAreas.map((subArea) => subArea.areaId))
  const areas = areaIds.length ? await client.fetchByIds<RawArea>('areas', areaIds) : []
  const achievements = await client.fetchAll<RawAchievement>('achievements', {
    select: ACHIEVEMENT_FIELDS,
  })
  const items = await client.fetchAll<RawItem>('items', { select: ITEM_FIELDS })
  const monsters = await client.fetchAll<RawMonster>('monsters', { select: MONSTER_FIELDS })
  return { quests, npcs, mapPositions, items, monsters, subAreas, areas, achievements }
}
