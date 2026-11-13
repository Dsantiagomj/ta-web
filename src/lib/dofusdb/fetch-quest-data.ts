import type { DofusDbClient } from './client'
import { objectiveNpcIds } from './quest-stages'
import type {
  RawAchievement,
  RawAchievementCategory,
  RawArea,
  RawDungeon,
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
  /** Todas las subzonas y áreas: la zona de la misión y la de cada objetivo. */
  subAreas?: RawSubArea[]
  areas?: RawArea[]
  /** Todos los logros: de ellos sale el logro de cada misión y su posición. */
  achievements?: RawAchievement[]
  /** Todas las categorías de logros: las zonas y grupos de los metalogros. */
  achievementCategories?: RawAchievementCategory[]
  /** Todas las mazmorras, con sus jefes: «Necesitarás en total» pinta el jefe. */
  dungeons?: RawDungeon[]
}

// Los campos de cada objeto que se guardan. Con typeId, DofusDB añade el tipo, que trae
// el supertipo; la fila entera pesa unas ocho veces más.
const ITEM_FIELDS = ['id', 'name', 'level', 'typeId', 'iconId', 'type']
// objectiveIds y rewardIds hacen que DofusDB añada a cada logro sus objetivos y sus
// recompensas; sin ellos en $select no llegan.
const ACHIEVEMENT_FIELDS = [
  'id',
  'name',
  'slug',
  'need',
  'categoryId',
  'iconId',
  'points',
  'level',
  'order',
  'objectiveIds',
  'rewardIds',
]
const CATEGORY_FIELDS = ['id', 'name', 'parentId', 'order']
const MONSTER_FIELDS = ['id', 'name', 'gfxId']
const SUBAREA_FIELDS = ['id', 'name', 'areaId']
const AREA_FIELDS = ['id', 'name']
const DUNGEON_FIELDS = ['id', 'name', 'bosses']

/**
 * Todas las misiones de DofusDB, más los PNJ de sus posiciones de inicio y de sus objetivos y
 * los mapas de inicio, que se piden por ID. Los objetos, los monstruos, los logros y las
 * subzonas y áreas se traen todos: Torre puede nombrar cualquier objeto o monstruo en una guía
 * (los combates se casan por nombre), el logro de una misión solo se sabe mirando los logros, y
 * los objetivos caen en subzonas que no son de ningún mapa de inicio (son unas 570).
 * Las mazmorras también, con sus jefes: sus notas nombran cualquiera.
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
    for (const npcId of objectiveNpcIds(quest)) npcIds.add(npcId)
  }
  const npcs = await client.fetchByIds<RawNpc>('npcs', [...npcIds])
  const mapPositions = await client.fetchByIds<RawMapPosition>('map-positions', [...mapIds])
  const subAreas = await client.fetchAll<RawSubArea>('subareas', { select: SUBAREA_FIELDS })
  const areas = await client.fetchAll<RawArea>('areas', { select: AREA_FIELDS })
  const achievements = await client.fetchAll<RawAchievement>('achievements', {
    select: ACHIEVEMENT_FIELDS,
  })
  const achievementCategories = await client.fetchAll<RawAchievementCategory>(
    'achievement-categories',
    { select: CATEGORY_FIELDS },
  )
  const items = await client.fetchAll<RawItem>('items', { select: ITEM_FIELDS })
  const monsters = await client.fetchAll<RawMonster>('monsters', { select: MONSTER_FIELDS })
  const dungeons = await client.fetchAll<RawDungeon>('dungeons', { select: DUNGEON_FIELDS })
  return {
    quests,
    npcs,
    mapPositions,
    items,
    monsters,
    subAreas,
    areas,
    achievements,
    achievementCategories,
    dungeons,
  }
}
