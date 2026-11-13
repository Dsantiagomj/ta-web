import { describe, expect, it } from 'vitest'

import { indexLookups, mapQuest } from '@/lib/dofusdb/map-quest'
import { objectiveNpcIds, questStages } from '@/lib/dofusdb/quest-stages'
import type { RawQuest, RawQuestObjective } from '@/lib/dofusdb/types'

import questsWithObjectives from '../fixtures/dofusdb/quests-objectives.json'

function quest(id: number): RawQuest {
  const found = (questsWithObjectives as RawQuest[]).find((candidate) => candidate.id === id)
  if (!found) throw new Error(`Falta la misión ${id} en los fixtures`)
  return structuredClone(found)
}

/** Una misión de una etapa con ese objetivo. */
function withObjective(objective: Partial<RawQuestObjective>): RawQuest {
  return {
    id: 1,
    name: { es: 'Prueba' },
    steps: [
      {
        id: 10,
        optimalLevel: 1,
        duration: 1,
        objectives: [{ id: 100, className: 'QuestObjectiveFreeFormData', ...objective }],
      },
    ],
  }
}

function only(raw: RawQuest) {
  return questStages(raw)[0].objectives[0]
}

describe('questStages', () => {
  it('copia las etapas y sus objetivos en el orden de DofusDB, con el texto tal cual', () => {
    // Los ladrones de colores: una etapa con tres entregas al mismo PNJ
    expect(questStages(quest(1575))).toEqual([
      {
        dofusId: 2195,
        name: 'Los ladrones de colores',
        objectives: [9093, 9094, 9095].map((dofusId, index) => ({
          dofusId,
          kind: 'bring',
          text: `Entrégale a {npc,2646}: 4 x {item,${15712 + index}}`,
          npcId: 2646,
          monsterId: null,
          itemId: 15712 + index,
          quantity: 4,
          mapId: 145229323,
          x: 1,
          y: 6,
          subAreaId: 836,
        })),
      },
    ])
  })

  it('guarda las etapas una tras otra, en el orden de DofusDB', () => {
    const raw = withObjective({})
    raw.steps!.push({
      id: 11,
      name: { es: ' Segunda ' },
      optimalLevel: 1,
      duration: 1,
      objectives: [
        { id: 101, className: 'QuestObjectiveFreeFormData' },
        { id: 102, className: 'QuestObjectiveFreeFormData' },
      ],
    })
    expect(
      questStages(raw).map((stage) => [
        stage.dofusId,
        stage.name,
        stage.objectives.map((objective) => objective.dofusId),
      ]),
    ).toEqual([
      [10, null, [100]],
      [11, 'Segunda', [101, 102]],
    ])
  })

  it('da a cada tipo de objetivo de DofusDB su clase y lo que nombra', () => {
    const cases: [Partial<RawQuestObjective>, object][] = [
      [
        { className: 'QuestObjectiveGoToNpcData', parameters: { parameter0: 447 } },
        { kind: 'npc', npcId: 447, monsterId: null, itemId: null, quantity: null },
      ],
      [
        {
          className: 'QuestObjectiveBringSoulToNpcData',
          parameters: { parameter0: 6693, parameter1: 928, parameter2: 1 },
        },
        { kind: 'bring', npcId: 6693, monsterId: 928, itemId: null, quantity: 1 },
      ],
      [
        {
          className: 'QuestObjectiveFightMonsterData',
          parameters: { parameter0: 182, parameter1: 1 },
        },
        { kind: 'fight', npcId: null, monsterId: 182, itemId: null, quantity: 1 },
      ],
      [
        {
          className: 'QuestObjectiveMultiFightMonsterData',
          parameters: { parameter0: 68, parameter1: 5 },
        },
        { kind: 'fight', monsterId: 68, quantity: 5 },
      ],
      [
        {
          className: 'QuestObjectiveFightMonstersOnMapData',
          parameters: { parameter0: 4128, parameter1: 8, parameter2: 216531204 },
        },
        { kind: 'fight', monsterId: 4128, quantity: 8 },
      ],
      [
        {
          className: 'QuestObjectiveCraftItemData',
          parameters: { parameter0: 9977, parameter1: 1 },
        },
        { kind: 'craft', npcId: null, monsterId: null, itemId: 9977, quantity: 1 },
      ],
      [
        { className: 'QuestObjectiveDiscoverMapData', parameters: { parameter0: 287243 } },
        { kind: 'map', npcId: null, monsterId: null, itemId: null, quantity: null },
      ],
      [
        { className: 'QuestObjectiveDiscoverSubAreaData', parameters: { parameter0: 165 } },
        { kind: 'map', npcId: null, monsterId: null, itemId: null, quantity: null },
      ],
      [
        { className: 'QuestObjectiveFreeFormData', parameters: { parameter0: 55635 } },
        { kind: 'free', npcId: null, monsterId: null, itemId: null, quantity: null },
      ],
      [
        { className: 'QuestObjectiveSomethingNew', parameters: { parameter0: 1 } },
        { kind: 'free', npcId: null, monsterId: null, itemId: null, quantity: null },
      ],
    ]
    for (const [objective, expected] of cases) {
      expect(only(withObjective(objective)), objective.className).toMatchObject(expected)
    }
  })

  it('toma las coordenadas del mapa del objetivo y, sin mapa, las de coords', () => {
    expect(only(withObjective({ mapId: 0, coords: { x: 25, y: -8 }, map: null }))).toMatchObject({
      mapId: null,
      x: 25,
      y: -8,
      subAreaId: null,
    })
    expect(
      only(
        withObjective({
          mapId: 99092993,
          coords: { x: 1, y: 1 },
          map: { posX: 0, posY: -3, subAreaId: 12 },
        }),
      ),
    ).toMatchObject({ mapId: 99092993, x: 0, y: -3, subAreaId: 12 })
    expect(only(withObjective({}))).toMatchObject({ mapId: null, x: null, y: null })
  })

  it('sin texto en español usa el francés, y sin ninguno lo deja vacío', () => {
    expect(only(withObjective({ text: { fr: 'Aller voir {npc,1}' } })).text).toBe(
      'Aller voir {npc,1}',
    )
    expect(only(withObjective({})).text).toBeNull()
  })

  it('sin etapas ni objetivos no falla', () => {
    expect(questStages({ id: 1, name: { es: 'Prueba' } })).toEqual([])
    expect(
      questStages({
        id: 1,
        name: { es: 'Prueba' },
        steps: [{ id: 10, optimalLevel: 1, duration: 1, objectives: null }],
      }),
    ).toEqual([{ dofusId: 10, name: null, objectives: [] }])
  })

  // El checklist del Silvestre hace esos combates en otro orden que DofusDB, y el progreso
  // guardado cuenta objetivos en su orden.
  it('reordena los objetivos de las etapas que el checklist hace en otro orden', () => {
    const ids = (raw: RawQuest) =>
      questStages(raw).flatMap((stage) => stage.objectives.map((objective) => objective.dofusId))
    const dofusDbOrder = (raw: RawQuest) =>
      (raw.steps ?? []).flatMap((step) => (step.objectives ?? []).map((objective) => objective.id))

    const viti = quest(1660)
    const [a, b, c, d] = dofusDbOrder(viti)
    expect(ids(viti)).toEqual([b, c, a, d])

    const thomahon = quest(1661)
    const [e, f, g, h, i] = dofusDbOrder(thomahon)
    expect(ids(thomahon)).toEqual([f, g, h, e, i])
  })

  it('si DofusDB cambia la etapa reordenada, deja su orden en vez de fallar', () => {
    const viti = quest(1660)
    viti.steps![0].objectives!.pop()
    const expected = viti.steps![0].objectives!.map((objective) => objective.id)
    expect(questStages(viti)[0].objectives.map((objective) => objective.dofusId)).toEqual(expected)
  })

  it('mapQuest incluye las etapas', () => {
    const raw = quest(1575)
    expect(mapQuest(raw, indexLookups([], [])).stages).toEqual(questStages(raw))
  })
})

describe('objectiveNpcIds', () => {
  const quest = (objectives: RawQuestObjective[]): RawQuest => ({
    id: 1,
    name: { es: 'Misión de prueba' },
    steps: [{ id: 11, optimalLevel: 1, duration: 1, objectives }],
  })

  it('junta el PNJ del parámetro y los del texto, sin repetir', () => {
    const ids = objectiveNpcIds(
      quest([
        { id: 1, className: 'QuestObjectiveGoToNpcData', parameters: { parameter0: 20 } },
        {
          id: 2,
          className: 'QuestObjectiveFreeFormData',
          parameters: { parameter0: 751055 },
          text: { es: 'Habla con {npc,40} y con {npc,20}' },
        },
      ]),
    )
    expect(ids.sort((a, b) => a - b)).toEqual([20, 40])
  })

  it('descarta el 0 del texto como el del parámetro: en DofusDB, 0 es que no hay', () => {
    const ids = objectiveNpcIds(
      quest([
        { id: 1, className: 'QuestObjectiveGoToNpcData', parameters: { parameter0: 0 } },
        {
          id: 2,
          className: 'QuestObjectiveFreeFormData',
          parameters: { parameter0: 751055 },
          text: { es: 'Habla con {npc,0} y con {npc,40}' },
        },
      ]),
    )
    expect(ids).toEqual([40])
  })
})
