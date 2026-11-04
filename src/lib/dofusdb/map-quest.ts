import { requiredTerms } from './criterion'
import { questNeeds } from './quest-needs'
import { questRewards } from './quest-rewards'
import type { LocalizedText, MappedQuest, RawMapPosition, RawNpc, RawQuest } from './types'

export interface QuestLookups {
  npcs: Map<number, RawNpc>
  mapPositions: Map<number, RawMapPosition>
}

export function indexLookups(npcs: RawNpc[], mapPositions: RawMapPosition[]): QuestLookups {
  return {
    npcs: new Map(npcs.map((npc) => [npc.id, npc])),
    mapPositions: new Map(mapPositions.map((map) => [map.id, map])),
  }
}

// Solo español al lanzar; el francés es el idioma original de DofusDB y cubre los huecos.
export function spanish(text: LocalizedText | null | undefined): string | null {
  return text?.es || text?.fr || null
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
    prerequisiteDofusIds: prerequisites(raw),
    rewards: questRewards(raw),
    needs: questNeeds(raw),
  }
}
