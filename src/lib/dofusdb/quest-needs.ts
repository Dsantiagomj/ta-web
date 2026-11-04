import { addQuantity } from './quantities'
import type { QuantityByDofusId, QuestNeeds, RawQuest, RawQuestObjective } from './types'

type Parameter = 'parameter0' | 'parameter1' | 'parameter2'

// Dónde lleva cada objetivo el monstruo y la cantidad. Las almas van con el PNJ delante.
const MONSTER_OBJECTIVES: Record<string, [monster: Parameter, quantity: Parameter]> = {
  QuestObjectiveFightMonsterData: ['parameter0', 'parameter1'],
  QuestObjectiveMultiFightMonsterData: ['parameter0', 'parameter1'],
  QuestObjectiveFightMonstersOnMapData: ['parameter0', 'parameter1'],
  QuestObjectiveBringSoulToNpcData: ['parameter1', 'parameter2'],
}

// Entrégale a {npc}: N x {item}
const BRING_ITEM = 'QuestObjectiveBringItemToNpcData'

const DISCOVER_OBJECTIVES = new Set([
  'QuestObjectiveDiscoverMapData',
  'QuestObjectiveDiscoverSubAreaData',
])

function parameter(objective: RawQuestObjective, name: Parameter): number | null {
  return objective.parameters?.[name] ?? null
}

/**
 * Lo que pide la misión: objetos, monstruos y si hay que descubrir mapas. Hablar con PNJ,
 * fabricar y los objetivos libres no se cuentan.
 */
export function questNeeds(raw: RawQuest): QuestNeeds {
  const objectives = (raw.steps ?? []).flatMap((step) => step.objectives ?? [])

  const delivered: QuantityByDofusId[] = []
  const monsters: QuantityByDofusId[] = []
  let walksMaps = false
  for (const objective of objectives) {
    if (DISCOVER_OBJECTIVES.has(objective.className)) walksMaps = true
    if (objective.className === BRING_ITEM) {
      const item = parameter(objective, 'parameter1')
      if (item !== null) addQuantity(delivered, item, parameter(objective, 'parameter2') ?? 1)
    }
    const monsterParameters = MONSTER_OBJECTIVES[objective.className]
    if (monsterParameters) {
      const monster = parameter(objective, monsterParameters[0])
      const quantity = parameter(objective, monsterParameters[1]) ?? 1
      if (monster !== null) addQuantity(monsters, monster, quantity)
    }
  }

  // need.items es el resumen de DofusDB y ya incluye las entregas: se toma la cantidad
  // mayor de las dos, no la suma, para no contar dos veces el mismo objeto.
  const needItems = raw.need?.items ?? []
  const needQuantities = raw.need?.quantities ?? []
  const items: QuantityByDofusId[] = []
  needItems.forEach((dofusId, index) => addQuantity(items, dofusId, needQuantities[index] ?? 1))
  for (const { dofusId, quantity } of delivered) {
    const existing = items.find((entry) => entry.dofusId === dofusId)
    if (existing) existing.quantity = Math.max(existing.quantity, quantity)
    else items.push({ dofusId, quantity })
  }

  return { items, monsters, walksMaps }
}
