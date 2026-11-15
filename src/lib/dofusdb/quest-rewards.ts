import { addQuantity } from './quantities'
import type {
  QuestLevelRewards,
  QuestRewards,
  RawQuest,
  RawQuestReward,
  RawQuestStep,
} from './types'

// Las guías de Torre dan las recompensas de un personaje de nivel 200, igual que dofusdb.fr.
const PLAYER_LEVEL = 200

// Fórmula del cliente de Dofus, la misma que usan DofusDB y Ganymede.
function fixedExperience(level: number, step: RawQuestStep, ratio: number): number {
  return ((level * (100 + 2 * level) ** 2) / 20) * step.duration * ratio
}

/**
 * La XP de la etapa para un personaje de ese nivel: un 30 % la del nivel más bajo entre el
 * suyo y el óptimo, y un 70 % la del más alto, que se topa en 1,5 veces el más bajo, sin
 * truncar. En el óptimo es la XP fija de ese nivel. Cuadra con las cifras de Torre por tramo
 * (1 329 586 XP al 109 en La crisis de fe, de óptimo 200).
 */
function stepExperience(step: RawQuestStep, ratio: number, playerLevel = PLAYER_LEVEL): number {
  const lower = Math.min(playerLevel, step.optimalLevel)
  const upper = Math.min(Math.max(playerLevel, step.optimalLevel), lower * 1.5)
  return 0.3 * fixedExperience(lower, step, ratio) + 0.7 * fixedExperience(upper, step, ratio)
}

/**
 * Los kamas del nivel óptimo, como los muestra DofusDB; los que escalan con el personaje,
 * los de su nivel hasta el óptimo (14 041 kamas al 109 en La crisis de fe).
 */
function stepKamas(step: RawQuestStep, reward: RawQuestReward, playerLevel: number): number {
  const level = reward.kamasScaleWithPlayerLevel
    ? Math.min(playerLevel, step.optimalLevel)
    : step.optimalLevel
  return (level ** 2 + 20 * level - 20) * reward.kamasRatio * step.duration
}

function addIds(list: number[], ids: number[] | null | undefined) {
  for (const id of ids ?? []) if (!list.includes(id)) list.push(id)
}

// Una entrada con tramo tiene sus dos niveles; -1 (o nada) es para todos los niveles.
const hasTier = (reward: RawQuestReward) =>
  (reward.levelMin ?? -1) >= 0 && (reward.levelMax ?? -1) >= 0

/**
 * Las entradas de la etapa para un personaje de ese nivel, en el orden de DofusDB: las de
 * todos los niveles y la de su tramo. Sin tramo para el nivel 200, la última, la del nivel
 * más alto.
 */
function rewardsAt(step: RawQuestStep, level: number): RawQuestReward[] {
  const rewards = step.rewards ?? []
  const tiers = rewards.filter(hasTier)
  const inTier = (reward: RawQuestReward) => reward.levelMin! <= level && level <= reward.levelMax!
  if (level === PLAYER_LEVEL && tiers.length && !tiers.some(inTier)) {
    return [...rewards.filter((reward) => !hasTier(reward)), tiers.at(-1)!]
  }
  return rewards.filter((reward) => !hasTier(reward) || inTier(reward))
}

type Totals = Omit<QuestRewards, 'experienceMin' | 'byLevel'>

/** Lo que da la misión a un personaje de ese nivel, sumado por etapas. */
function totalsAt(raw: RawQuest, level: number): Totals {
  const totals: Totals = {
    experience: 0,
    kamas: 0,
    items: [],
    emoteIds: [],
    spellIds: [],
    titleIds: [],
    jobIds: [],
  }
  for (const step of raw.steps ?? []) {
    for (const reward of rewardsAt(step, level)) {
      // DofusDB redondea hacia abajo cada etapa y luego suma.
      totals.experience += Math.floor(stepExperience(step, reward.experienceRatio, level))
      totals.kamas += Math.floor(stepKamas(step, reward, level))
      for (const [dofusId, quantity] of reward.itemsReward ?? []) {
        addQuantity(totals.items, dofusId, quantity)
      }
      addIds(totals.emoteIds, reward.emotesReward)
      addIds(totals.spellIds, reward.spellsReward)
      addIds(totals.titleIds, reward.titlesReward)
      addIds(totals.jobIds, reward.jobsReward)
    }
  }
  return totals
}

/** Los tramos que nombran las entradas de todas las etapas, sin solaparse, de menor a mayor. */
function levelSegments(raw: RawQuest): [number, number][] {
  const tiers = (raw.steps ?? []).flatMap((step) => (step.rewards ?? []).filter(hasTier))
  const starts = new Set<number>()
  for (const tier of tiers) {
    starts.add(tier.levelMin!)
    starts.add(Math.min(tier.levelMax!, PLAYER_LEVEL) + 1)
  }
  const bounds = [...starts].sort((a, b) => a - b)
  const covered = (level: number) =>
    tiers.some((tier) => tier.levelMin! <= level && level <= tier.levelMax!)
  return bounds
    .slice(0, -1)
    .flatMap((start, index): [number, number][] =>
      covered(start) ? [[start, bounds[index + 1]! - 1]] : [],
    )
}

// Lo que no cambia con el nivel dentro de un tramo: si coincide, dos tramos seguidos son uno.
function sameGifts(a: Totals, b: Totals): boolean {
  const key = (totals: Totals) =>
    JSON.stringify([totals.items, totals.emoteIds, totals.spellIds, totals.titleIds, totals.jobIds])
  return key(a) === key(b)
}

/**
 * Una recompensa por tramo, con la XP y los kamas del nivel más alto del tramo, como las
 * escribe Torre. Los tramos seguidos que dan lo mismo salvo XP y kamas se juntan (DofusDB da
 * un tramo por nivel en los eventos de Nawidad). Con un solo tramo, ninguno.
 */
function levelRewards(raw: RawQuest): QuestLevelRewards[] {
  const merged: { levelMin: number; levelMax: number; totals: Totals }[] = []
  for (const [levelMin, levelMax] of levelSegments(raw)) {
    const totals = totalsAt(raw, levelMax)
    const last = merged.at(-1)
    if (last && last.levelMax + 1 === levelMin && sameGifts(last.totals, totals)) {
      last.levelMax = levelMax
      last.totals = totals
    } else {
      merged.push({ levelMin, levelMax, totals })
    }
  }
  if (merged.length < 2) return []
  return merged.map(({ levelMin, levelMax, totals }) => ({
    levelMin,
    levelMax,
    experience: totals.experience,
    kamas: totals.kamas,
    items: totals.items,
  }))
}

function experienceMin(raw: RawQuest): number {
  let total = 0
  for (const step of raw.steps ?? []) {
    for (const reward of rewardsAt(step, PLAYER_LEVEL)) {
      const level = Math.min(step.optimalLevel, PLAYER_LEVEL)
      total += Math.floor(stepExperience(step, reward.experienceRatio, level))
    }
  }
  return total
}

/**
 * Experiencia, kamas y objetos de la misión para un personaje de nivel 200. La XP va
 * también en su mínimo, la de un personaje en el nivel óptimo de cada etapa: el rango que
 * enseña la guía (9 800 a 16 380 XP). El máximo se alcanza en 1,5 veces el óptimo, así que
 * el valor de nivel 200 ya es el tope. Las misiones que dan otra cosa según el nivel llevan
 * además una recompensa por tramo (byLevel).
 */
export function questRewards(raw: RawQuest): QuestRewards {
  const { experience, kamas, items, emoteIds, spellIds, titleIds, jobIds } = totalsAt(
    raw,
    PLAYER_LEVEL,
  )
  return {
    experience,
    experienceMin: experienceMin(raw),
    kamas,
    items,
    emoteIds,
    spellIds,
    titleIds,
    jobIds,
    byLevel: levelRewards(raw),
  }
}
