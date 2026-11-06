import { addQuantity } from './quantities'
import type { QuestRewards, RawQuest, RawQuestStep } from './types'

// Las guías de Torre dan las recompensas de un personaje de nivel 200, igual que dofusdb.fr.
const PLAYER_LEVEL = 200

// Fórmula del cliente de Dofus, la misma que usan DofusDB y Ganymede.
function fixedExperience(level: number, step: RawQuestStep, ratio: number): number {
  return ((level * (100 + 2 * level) ** 2) / 20) * step.duration * ratio
}

function stepExperience(step: RawQuestStep, ratio: number, playerLevel = PLAYER_LEVEL): number {
  const optimal = step.optimalLevel
  if (playerLevel <= optimal) return fixedExperience(playerLevel, step, ratio)
  // Por encima del óptimo, el nivel que cuenta se topa en 1,5 veces el óptimo, sin truncar.
  const rewardLevel = Math.min(playerLevel, optimal * 1.5)
  return (
    0.3 * fixedExperience(optimal, step, ratio) + 0.7 * fixedExperience(rewardLevel, step, ratio)
  )
}

// DofusDB muestra los kamas del nivel óptimo aunque escalen con el del personaje.
function stepKamas(step: RawQuestStep, ratio: number): number {
  const level = step.optimalLevel
  return (level ** 2 + 20 * level - 20) * ratio * step.duration
}

function addIds(list: number[], ids: number[] | null | undefined) {
  for (const id of ids ?? []) if (!list.includes(id)) list.push(id)
}

/**
 * Experiencia, kamas y objetos de la misión para un personaje de nivel 200. La XP va
 * también en su mínimo, la de un personaje en el nivel óptimo de cada etapa: el rango que
 * enseña la guía (9 800 a 16 380 XP). El máximo se alcanza en 1,5 veces el óptimo, así que
 * el valor de nivel 200 ya es el tope.
 */
export function questRewards(raw: RawQuest): QuestRewards {
  const rewards: QuestRewards = {
    experience: 0,
    experienceMin: 0,
    kamas: 0,
    items: [],
    emoteIds: [],
    spellIds: [],
    titleIds: [],
    jobIds: [],
  }
  for (const step of raw.steps ?? []) {
    // Hay una entrada por tramo de nivel; la última es la del nivel más alto.
    const reward = step.rewards?.at(-1)
    if (!reward) continue
    // DofusDB redondea hacia abajo cada etapa y luego suma.
    rewards.experience += Math.floor(stepExperience(step, reward.experienceRatio))
    rewards.experienceMin += Math.floor(
      stepExperience(step, reward.experienceRatio, Math.min(step.optimalLevel, PLAYER_LEVEL)),
    )
    rewards.kamas += Math.floor(stepKamas(step, reward.kamasRatio))
    for (const [dofusId, quantity] of reward.itemsReward ?? []) {
      addQuantity(rewards.items, dofusId, quantity)
    }
    addIds(rewards.emoteIds, reward.emotesReward)
    addIds(rewards.spellIds, reward.spellsReward)
    addIds(rewards.titleIds, reward.titlesReward)
    addIds(rewards.jobIds, reward.jobsReward)
  }
  return rewards
}
