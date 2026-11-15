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
  // Entrégale a {npc}: N x {item}. «Enséñale» comparte la clase (showsItem).
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

// El typeId de «Enséñale a {npc}: N x {item}» (texto 56296 de DofusDB): el PNJ mira el
// objeto y no se lo queda. «Entrégale» (texto 114533) es el 3. En 2026-11 son 323 objetivos
// de 175 misiones, y ninguno de los dos typeId sale con otro texto.
const SHOW_ITEM_TYPE_ID = 2

/** Si el objetivo pide enseñar un objeto a un PNJ, que se lo devuelve: no se gasta. */
export function showsItem(raw: Pick<RawQuestObjective, 'className' | 'typeId'>): boolean {
  return raw.className === 'QuestObjectiveBringItemToNpcData' && raw.typeId === SHOW_ITEM_TYPE_ID
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
    kind: showsItem(raw) ? 'show' : shape.kind,
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

// Un PNJ nombrado en el texto de un objetivo: «Ve a ver a {npc,2351}».
const NPC_REFERENCE = /\{npc,(\d+)/g

/**
 * Los PNJ que nombran los objetivos de la misión: el del parámetro de su clase y los que
 * cita su texto (un objetivo libre solo los nombra ahí). Sin repetir y sin el 0, que en
 * DofusDB es que no hay. Lee los objetivos crudos: el orden no importa.
 */
export function objectiveNpcIds(raw: RawQuest): number[] {
  const ids = new Set<number>()
  for (const step of raw.steps ?? []) {
    for (const objective of step?.objectives ?? []) {
      if (!objective) continue
      const npc = SHAPES[objective.className]?.npc
      const fromParameter = npc ? positive(objective.parameters?.[npc]) : null
      if (fromParameter !== null) ids.add(fromParameter)
      for (const [, id] of (spanish(objective.text) ?? '').matchAll(NPC_REFERENCE)) {
        const fromText = positive(Number(id))
        if (fromText !== null) ids.add(fromText)
      }
    }
  }
  return [...ids]
}
