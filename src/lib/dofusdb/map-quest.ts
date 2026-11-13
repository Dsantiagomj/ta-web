import { requiredTerms } from './criterion'
import { spanish } from './localized'
import { questNeeds } from './quest-needs'
import { questRewards } from './quest-rewards'
import type {
  MappedQuest,
  QuestAchievement,
  RawAchievement,
  RawArea,
  RawMapPosition,
  RawNpc,
  RawQuest,
  RawSubArea,
} from './types'

export interface QuestLookups {
  npcs: Map<number, RawNpc>
  mapPositions: Map<number, RawMapPosition>
  subAreas: Map<number, RawSubArea>
  areas: Map<number, RawArea>
  /** El logro de cada misión, por su ID de DofusDB. */
  achievements: Map<number, QuestAchievement>
}

export interface ExtraLookups {
  subAreas?: RawSubArea[]
  areas?: RawArea[]
  achievements?: RawAchievement[]
}

export { spanish }

/** Un slug como los de la web de Torre: minúsculas, sin acentos ni signos, con guiones. */
export function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLocaleLowerCase('es')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * El logro de cada misión y su posición en él. Una misión que está en varios logros se
 * queda con el de ID más bajo, para que el resultado no dependa del orden de DofusDB.
 */
function achievementsByQuest(achievements: RawAchievement[]): Map<number, QuestAchievement> {
  const byQuest = new Map<number, QuestAchievement>()
  const sorted = [...achievements].sort((a, b) => a.id - b.id)
  for (const achievement of sorted) {
    const quests = achievement.need?.quests ?? []
    const name = spanish(achievement.name)
    if (!name) continue
    const slug = slugify(spanish(achievement.slug) ?? name)
    quests.forEach((questId, index) => {
      if (byQuest.has(questId)) return
      byQuest.set(questId, {
        dofusId: achievement.id,
        name,
        slug,
        position: index + 1,
        total: quests.length,
      })
    })
  }
  return byQuest
}

export function indexLookups(
  npcs: RawNpc[],
  mapPositions: RawMapPosition[],
  extra: ExtraLookups = {},
): QuestLookups {
  return {
    npcs: new Map(npcs.map((npc) => [npc.id, npc])),
    mapPositions: new Map(mapPositions.map((map) => [map.id, map])),
    subAreas: new Map((extra.subAreas ?? []).map((subArea) => [subArea.id, subArea])),
    areas: new Map((extra.areas ?? []).map((area) => [area.id, area])),
    achievements: achievementsByQuest(extra.achievements ?? []),
  }
}

/** El área del primer mapa de inicio que la tiene, o null. */
function questZone(raw: RawQuest, lookups: QuestLookups): string | null {
  for (const position of raw.startPosition ?? []) {
    const map = position?.mapId == null ? undefined : lookups.mapPositions.get(position.mapId)
    const subArea = map?.subAreaId == null ? undefined : lookups.subAreas.get(map.subAreaId)
    const area = subArea?.areaId == null ? undefined : lookups.areas.get(subArea.areaId)
    const name = spanish(area?.name)
    if (name) return name
  }
  return null
}

// Solo los Qf= obligatorios: las alternativas con | y need.quests (que también trae Qa=) no son "terminar antes".
const FINISHED_QUEST = /^Qf=(\d+)$/

function prerequisites(raw: RawQuest): number[] {
  const ids = requiredTerms(raw.startCriterion).flatMap((term) => {
    const match = FINISHED_QUEST.exec(term)
    return match ? [Number(match[1])] : []
  })
  const unique = new Set(ids)
  unique.delete(raw.id)
  return [...unique]
}

/** Convierte una misión de DofusDB en los datos de la colección quests. Nunca falla por una búsqueda que falta. */
export function mapQuest(raw: RawQuest, lookups: QuestLookups): MappedQuest {
  const startPositions = (raw.startPosition ?? []).flatMap((position) => {
    if (!position) return []
    const npcId = position.npcId ?? null
    const mapId = position.mapId ?? null
    const npc = npcId === null ? undefined : lookups.npcs.get(npcId)
    const map = mapId === null ? undefined : lookups.mapPositions.get(mapId)
    return [
      {
        npcId,
        npcName: spanish(npc?.name),
        mapId,
        x: map?.posX ?? null,
        y: map?.posY ?? null,
      },
    ]
  })

  return {
    dofusId: raw.id,
    // El nombre es obligatorio en la colección: sin texto, al menos el ID.
    name: spanish(raw.name) ?? `Misión ${raw.id}`,
    levelMin: raw.levelMin ?? null,
    levelMax: raw.levelMax ?? null,
    categoryId: raw.categoryId ?? null,
    startCriterion: raw.startCriterion || null,
    startPositions,
    zone: questZone(raw, lookups),
    achievement: lookups.achievements.get(raw.id) ?? null,
    prerequisiteDofusIds: prerequisites(raw),
    rewards: questRewards(raw),
    needs: questNeeds(raw),
  }
}
