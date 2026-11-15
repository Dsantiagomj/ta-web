import { addQuantity } from './quantities'
import { showsItem } from './quest-stages'
import type { QuantityByDofusId, QuestNeeds, RawQuest, RawQuestObjective } from './types'

type Parameter = 'parameter0' | 'parameter1' | 'parameter2'

// Dónde lleva cada objetivo el monstruo y la cantidad. Las almas van con el PNJ delante.
const MONSTER_OBJECTIVES: Record<string, [monster: Parameter, quantity: Parameter]> = {
  QuestObjectiveFightMonsterData: ['parameter0', 'parameter1'],
  QuestObjectiveMultiFightMonsterData: ['parameter0', 'parameter1'],
  QuestObjectiveFightMonstersOnMapData: ['parameter0', 'parameter1'],
  QuestObjectiveBringSoulToNpcData: ['parameter1', 'parameter2'],
}

// Entrégale a {npc}: N x {item}, y también Enséñale (showsItem)
const BRING_ITEM = 'QuestObjectiveBringItemToNpcData'

const DISCOVER_OBJECTIVES = new Set([
  'QuestObjectiveDiscoverMapData',
  'QuestObjectiveDiscoverSubAreaData',
])

function parameter(objective: RawQuestObjective, name: Parameter): number | null {
  return objective.parameters?.[name] ?? null
}

/** Lo que el objetivo suma de ese objeto al need.items de la misión, según DofusDB. */
function generatedQuantity(objective: RawQuestObjective, dofusId: number): number {
  const generated = objective.need?.generated
  let total = 0
  generated?.items?.forEach((item, index) => {
    if (item === dofusId) total += generated.quantities?.[index] ?? 1
  })
  return total
}

/**
 * Lo que pide la misión: objetos, monstruos y si hay que descubrir mapas. Hablar con PNJ,
 * fabricar y los objetivos libres no se cuentan.
 */
export function questNeeds(raw: RawQuest): QuestNeeds {
  const objectives = (raw.steps ?? []).flatMap((step) => step.objectives ?? [])

  // Por objeto, en el orden de los objetivos: lo que se entrega (se suma) y lo que se enseña
  // (el mismo objeto vale para todas las veces: la mayor).
  const handed = new Map<number, { given: number; shown: number }>()
  // La parte de need.items que DofusDB saca de los «Enséñale»: los suma como si se gastaran.
  const shownInNeed = new Map<number, number>()
  const monsters: QuantityByDofusId[] = []
  let walksMaps = false
  for (const objective of objectives) {
    if (DISCOVER_OBJECTIVES.has(objective.className)) walksMaps = true
    if (objective.className === BRING_ITEM) {
      const item = parameter(objective, 'parameter1')
      const quantity = parameter(objective, 'parameter2') ?? 1
      if (item !== null) {
        let entry = handed.get(item)
        if (!entry) handed.set(item, (entry = { given: 0, shown: 0 }))
        if (showsItem(objective)) {
          entry.shown = Math.max(entry.shown, quantity)
          const inNeed = generatedQuantity(objective, item)
          shownInNeed.set(item, (shownInNeed.get(item) ?? 0) + inNeed)
        } else entry.given += quantity
      }
    }
    const monsterParameters = MONSTER_OBJECTIVES[objective.className]
    if (monsterParameters) {
      const monster = parameter(objective, monsterParameters[0])
      const quantity = parameter(objective, monsterParameters[1]) ?? 1
      if (monster !== null) addQuantity(monsters, monster, quantity)
    }
  }

  // need.items es el resumen de DofusDB y ya incluye las entregas: se toma la cantidad
  // mayor de las dos, no la suma, para no contar dos veces el mismo objeto. Enseñar no
  // gasta: su parte de need.items sale, y lo enseñado cuenta como mínimo, sin sumarse a
  // nada (lo que se enseña y luego se entrega es el mismo objeto).
  const needItems = raw.need?.items ?? []
  const needQuantities = raw.need?.quantities ?? []
  const items: QuantityByDofusId[] = []
  needItems.forEach((dofusId, index) => addQuantity(items, dofusId, needQuantities[index] ?? 1))
  for (const entry of items) {
    entry.quantity -= Math.min(entry.quantity, shownInNeed.get(entry.dofusId) ?? 0)
  }
  for (const [dofusId, { given, shown }] of handed) {
    const quantity = Math.max(given, shown)
    const existing = items.find((entry) => entry.dofusId === dofusId)
    if (existing) existing.quantity = Math.max(existing.quantity, quantity)
    else items.push({ dofusId, quantity })
  }

  return { items, monsters, walksMaps }
}
