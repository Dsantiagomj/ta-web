import { spanish } from './localized'
import type {
  MappedQuestObjective,
  MappedQuestStage,
  QuestObjectiveKind,
  RawQuest,
  RawQuestObjective,
} from './types'

type Parameter = 'parameter0' | 'parameter1' | 'parameter2'

interface ObjectiveShape {
  kind: QuestObjectiveKind
  npc?: Parameter
  monster?: Parameter
  item?: Parameter
  quantity?: Parameter
}

// La clase de cada objetivo y en qué parámetro lleva lo que nombra. Las mismas clases que
// el checklist antiguo (KIND en .build/build_quests_js.py); un objetivo nuevo es libre.
const SHAPES: Record<string, ObjectiveShape> = {
  QuestObjectiveFreeFormData: { kind: 'free' },
  // Ve a ver a {npc}
  QuestObjectiveGoToNpcData: { kind: 'npc', npc: 'parameter0' },
  // Entrégale a {npc}: N x {item}
  QuestObjectiveBringItemToNpcData: {
    kind: 'bring',
    npc: 'parameter0',
    item: 'parameter1',
    quantity: 'parameter2',
  },
  // Lleva N alma(s) de {monster} a {npc}
  QuestObjectiveBringSoulToNpcData: {
    kind: 'bring',
    npc: 'parameter0',
    monster: 'parameter1',
    quantity: 'parameter2',
  },
  // Vence a N x {monster}; la de mapa lleva el mapa en parameter2, que ya está en mapId
  QuestObjectiveFightMonsterData: { kind: 'fight', monster: 'parameter0', quantity: 'parameter1' },
  QuestObjectiveMultiFightMonsterData: {
    kind: 'fight',
    monster: 'parameter0',
    quantity: 'parameter1',
  },
  QuestObjectiveFightMonstersOnMapData: {
    kind: 'fight',
    monster: 'parameter0',
    quantity: 'parameter1',
  },
  QuestObjectiveDiscoverMapData: { kind: 'map' },
  QuestObjectiveDiscoverSubAreaData: { kind: 'map' },
  // Fabrica N {item}
  QuestObjectiveCraftItemData: { kind: 'craft', item: 'parameter0', quantity: 'parameter1' },
}

/**
 * Etapas cuyos objetivos el checklist antiguo hace en otro orden que DofusDB, por
 * «misión:etapa» (la etapa cuenta desde 0): la posición de DofusDB de cada objetivo en el
 * orden nuevo. El progreso guardado cuenta objetivos en ese orden. Del Silvestre
 * (OBJECTIVE_ORDER en .build/dofus/silvestre.py): el paso 39 pasa a Tynril y al
 * Morsagüino y deja a Funoroshi para el 48; el 50 pasa a Ben el Ripata, Kimbo y
 * Obsidiantre y deja a Sfinter Cell para el 51.
 */
const CHECKLIST_OBJECTIVE_ORDER: Record<string, number[]> = {
  '1660:0': [1, 2, 0, 3],
  '1661:0': [1, 2, 3, 0, 4],
}

// Un ID o una cantidad de DofusDB; 0 significa que no hay.
function positive(value: number | null | undefined): number | null {
  return value != null && value > 0 ? value : null
}

function coordinate(value: number | null | undefined): number | null {
  return value ?? null
}

function mapObjective(raw: RawQuestObjective): MappedQuestObjective {
  const shape = SHAPES[raw.className] ?? { kind: 'free' }
  const parameter = (name: Parameter | undefined) =>
    name ? positive(raw.parameters?.[name]) : null
  // Como el checklist: las coordenadas del mapa del objetivo y, si no tiene, las de coords.
  const map = raw.map ?? null
  return {
    dofusId: raw.id,
    kind: shape.kind,
    text: spanish(raw.text),
    npcId: parameter(shape.npc),
    monsterId: parameter(shape.monster),
    itemId: parameter(shape.item),
    quantity: parameter(shape.quantity),
    mapId: positive(raw.mapId),
    x: coordinate(map ? map.posX : raw.coords?.x),
    y: coordinate(map ? map.posY : raw.coords?.y),
    subAreaId: positive(map?.subAreaId),
  }
}

/** El orden nuevo si encaja con la etapa; si DofusDB la cambió, el suyo. */
function inChecklistOrder<T>(objectives: T[], order: number[] | undefined): T[] {
  if (!order || order.length !== objectives.length) return objectives
  const sorted = [...order].sort((a, b) => a - b)
  if (sorted.some((position, index) => position !== index)) return objectives
  return order.map((position) => objectives[position])
}

/**
 * Las etapas de la misión con sus objetivos, en el orden en que DofusDB los da, salvo las
 * etapas de CHECKLIST_OBJECTIVE_ORDER. Es el orden del checklist antiguo: un índice sobre
 * los objetivos aplanados apunta al mismo objetivo en los dos.
 */
export function questStages(raw: RawQuest): MappedQuestStage[] {
  const steps = (raw.steps ?? []).filter((step) => step != null)
  return steps.map((step, index) => {
    const objectives = (step.objectives ?? []).filter((objective) => objective != null)
    return {
      dofusId: step.id,
      name: spanish(step.name)?.trim() || null,
      objectives: inChecklistOrder(
        objectives.map(mapObjective),
        CHECKLIST_OBJECTIVE_ORDER[`${raw.id}:${index}`],
      ),
    }
  })
}
