// De un logro de DofusDB a los datos de la colección achievements. Código puro: lo usan el
// refresco y sus pruebas.

import { spanish } from './map-quest'
import { addQuantity } from './quantities'
import type {
  MappedAchievement,
  MappedAchievementCategory,
  MappedMetaAchievement,
  RawAchievement,
  RawAchievementCategory,
  RawAchievementReward,
} from './types'

// Las páginas de Torre dan las recompensas de un personaje de nivel 200.
const PLAYER_LEVEL = 200

// «Qf=1975» (terminada) o «QF>600,0» (terminada más de 0 veces): una misión del objetivo.
const QUEST_TERM = /^Q[fF](?:=(\d+)|>(\d+),\d+)$/
// «SC=1» acompaña a algunos objetivos de misión y no cambia lo que piden.
const IGNORED_TERM = /^SC=\d+$/

/**
 * Las misiones de un objetivo de logro: una, o varias separadas por | cuando son
 * alternativas (la misión de clase: se hace la de tu clase). Un objetivo que pide otra
 * cosa (un logro, un nivel, un monstruo) no tiene misiones.
 */
export function objectiveQuestIds(criterion: string | null | undefined): number[] {
  const terms = (criterion ?? '')
    .split(/[()&|]/)
    .map((term) => term.trim())
    .filter((term) => term && !IGNORED_TERM.test(term))
  const ids: number[] = []
  for (const term of terms) {
    const match = QUEST_TERM.exec(term)
    if (!match) return []
    ids.push(Number(match[1] ?? match[2]))
  }
  return ids
}

// «OA=1671»: el objetivo pide tener ese logro.
const ACHIEVEMENT_TERM = /^\(?OA=(\d+)\)?$/

function requiredAchievement(criterion: string | null | undefined): number | null {
  const match = ACHIEVEMENT_TERM.exec((criterion ?? '').trim())
  return match ? Number(match[1]) : null
}

// La XP fija de un nivel, la misma fórmula que las misiones (src/lib/dofusdb/quest-rewards.ts).
const fixedExperience = (level: number, ratio: number) =>
  ((level * (100 + 2 * level) ** 2) / 20) * ratio

// Las páginas de Torre suman un 5 % a la fórmula del cliente: así coinciden 208 de sus 223
// páginas con XP; las demás son de logros que el juego cambió después.
const TORRE_BONUS = 1.05

/**
 * La XP de un logro para un personaje de nivel 200: el 30 % de la del nivel del logro y el
 * 70 % de la del tope, 1,5 veces ese nivel, como en el cliente, más el 5 % de Torre.
 */
export function achievementExperience(level: number, ratio: number): number {
  if (!ratio) return 0
  const cap = Math.min(PLAYER_LEVEL, level * 1.5)
  const base = Math.floor(0.3 * fixedExperience(level, ratio) + 0.7 * fixedExperience(cap, ratio))
  return Math.floor(base * TORRE_BONUS)
}

/** Los kamas del nivel del logro, como en las páginas de Torre. */
function achievementKamas(level: number, ratio: number): number {
  return Math.floor((level ** 2 + 20 * level - 20) * ratio)
}

/** Si una fila de recompensas vale para un personaje de nivel 200: sus PL>a y PL<b. */
function appliesAtLevel200(reward: RawAchievementReward): boolean {
  for (const term of (reward.criterions ?? '').split(/[&|()]/)) {
    const match = /^PL([<>])(\d+)$/.exec(term.trim())
    if (!match) continue
    const limit = Number(match[2])
    if (match[1] === '>' ? PLAYER_LEVEL <= limit : PLAYER_LEVEL >= limit) return false
  }
  return true
}

/** XP, kamas y objetos del logro para un personaje de nivel 200. */
export function achievementRewards(raw: RawAchievement): MappedAchievement['rewards'] {
  const level = raw.level ?? 0
  const rewards: MappedAchievement['rewards'] = { experience: 0, kamas: 0, items: [] }
  for (const reward of raw.rewards ?? []) {
    if (!reward || !appliesAtLevel200(reward)) continue
    rewards.experience += achievementExperience(level, reward.experienceRatio ?? 0)
    rewards.kamas += achievementKamas(level, reward.kamasRatio ?? 0)
    const quantities = reward.itemsQuantityReward ?? []
    ;(reward.itemsReward ?? []).forEach((dofusId, index) =>
      addQuantity(rewards.items, dofusId, quantities[index] ?? 1),
    )
  }
  return rewards
}

/** Los logros que piden otro: por el ID del pedido. */
export type CountsForIndex = Map<number, MappedMetaAchievement[]>

/**
 * Para cada logro, los logros del juego que lo piden, directamente o a través de otro
 * (Periplo astrubiense pide La ocasión hace al ladrón, y De Incarnam a Astrub pide
 * Periplo): primero los directos y luego los demás, cada grupo por ID.
 */
export function countsForIndex(achievements: RawAchievement[]): CountsForIndex {
  const metas = new Map<number, MappedMetaAchievement>()
  const requiredBy = new Map<number, number[]>()
  for (const raw of achievements) {
    const required = (raw.objectives ?? []).flatMap((objective) => {
      const id = requiredAchievement(objective?.criterion)
      return id === null ? [] : [id]
    })
    if (required.length === 0) continue
    metas.set(raw.id, {
      dofusId: raw.id,
      name: spanish(raw.name) ?? `Logro ${raw.id}`,
      points: raw.points ?? null,
      achievements: required.length,
      iconId: raw.iconId ?? null,
    })
    for (const id of required) requiredBy.set(id, [...(requiredBy.get(id) ?? []), raw.id])
  }

  const index: CountsForIndex = new Map()
  const byId = (a: number, b: number) => a - b
  for (const id of requiredBy.keys()) {
    const direct = [...(requiredBy.get(id) ?? [])].sort(byId)
    const seen = new Set<number>([id, ...direct])
    const indirect: number[] = []
    const queue = [...direct]
    while (queue.length) {
      for (const next of requiredBy.get(queue.shift()!) ?? []) {
        if (seen.has(next)) continue
        seen.add(next)
        indirect.push(next)
        queue.push(next)
      }
    }
    index.set(
      id,
      [...direct, ...indirect.sort(byId)].map((metaId) => metas.get(metaId)!),
    )
  }
  return index
}

/** Convierte un logro de DofusDB en los datos de la colección achievements. */
export function mapAchievement(raw: RawAchievement, countsFor: CountsForIndex): MappedAchievement {
  const objectives = [...(raw.objectives ?? [])]
    .filter((objective) => objective !== null)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  return {
    dofusId: raw.id,
    name: spanish(raw.name) ?? `Logro ${raw.id}`,
    iconId: raw.iconId ?? null,
    points: raw.points ?? null,
    level: raw.level ?? null,
    order: raw.order ?? null,
    categoryDofusId: raw.categoryId ?? null,
    quests: objectives.flatMap((objective) => {
      const questDofusIds = objectiveQuestIds(objective.criterion)
      return questDofusIds.length ? [{ name: spanish(objective.name), questDofusIds }] : []
    }),
    rewards: achievementRewards(raw),
    countsFor: countsFor.get(raw.id) ?? [],
  }
}

/** Convierte una categoría de logros de DofusDB en los datos de achievement-categories. */
export function mapAchievementCategory(raw: RawAchievementCategory): MappedAchievementCategory {
  return {
    dofusId: raw.id,
    name: spanish(raw.name) ?? `Categoría ${raw.id}`,
    parentDofusId: raw.parentId ? raw.parentId : null,
    order: raw.order ?? null,
  }
}
