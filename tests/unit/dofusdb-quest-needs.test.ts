import { describe, expect, it } from 'vitest'

import { questNeeds } from '@/lib/dofusdb/quest-needs'
import type { RawQuest, RawQuestObjective } from '@/lib/dofusdb/types'

import quests from '../fixtures/dofusdb/quests-steps.json'

function quest(id: number): RawQuest {
  const found = (quests as RawQuest[]).find((candidate) => candidate.id === id)
  if (!found) throw new Error(`Falta la misión ${id} en los fixtures`)
  return structuredClone(found)
}

/** Una misión de una sola etapa con estos objetivos, sin need.items. */
function withObjectives(objectives: RawQuestObjective[]): RawQuest {
  return {
    id: 1,
    name: { es: 'Prueba' },
    need: { items: [], quantities: [] },
    steps: [{ id: 1, optimalLevel: 1, duration: 1, rewards: [], objectives }],
  }
}

function objective(className: string, ...values: number[]): RawQuestObjective {
  const parameters = Object.fromEntries(values.map((value, index) => [`parameter${index}`, value]))
  return { id: 1, className: `QuestObjective${className}Data`, parameters }
}

describe('questNeeds', () => {
  it('pide los objetos que hay que entregar a un PNJ', () => {
    // Intoxicación profunda (1433): Entrégale a {npc,2186}: 10 x {item,14808}
    expect(questNeeds(quest(1433))).toEqual({
      items: [{ dofusId: 14808, quantity: 10 }],
      monsters: [],
      walksMaps: false,
    })
  })

  it('pide los objetos de need.items aunque ningún objetivo los entregue', () => {
    // Entretanto, un renacer (2420): seis objetos que hay que tener, y un mapa por descubrir
    expect(questNeeds(quest(2420))).toEqual({
      items: [737, 694, 739, 7754, 7115, 7114].map((dofusId) => ({ dofusId, quantity: 1 })),
      monsters: [],
      walksMaps: true,
    })
  })

  it('no cuenta dos veces un objeto que está en need.items y en una entrega', () => {
    // need.items es el resumen de DofusDB y ya incluye las entregas: La hoz maldita (245)
    // pide 2 x 8993 en need.items y entrega 1 x 8993; hacen falta 2, no 3.
    expect(questNeeds(quest(245)).items).toEqual([
      { dofusId: 8993, quantity: 2 },
      { dofusId: 7183, quantity: 1 },
    ])
  })

  it('suma las entregas del mismo objeto en varios objetivos', () => {
    const raw = withObjectives([
      objective('BringItemToNpc', 119, 1746, 1),
      objective('BringItemToNpc', 196, 1746, 2),
    ])
    raw.need = { items: [1746], quantities: [1] }
    expect(questNeeds(raw).items).toEqual([{ dofusId: 1746, quantity: 3 }])
  })

  it('pide los monstruos de los combates, sumados por monstruo', () => {
    // El rey Estitch (332): un combate contra 4246
    expect(questNeeds(quest(332))).toEqual({
      items: [
        { dofusId: 10424, quantity: 1 },
        { dofusId: 9264, quantity: 1 },
      ],
      monsters: [{ dofusId: 4246, quantity: 1 }],
      walksMaps: true,
    })
    expect(questNeeds(quest(241)).monsters).toHaveLength(30)
  })

  it('cuenta todos los tipos de combate y las almas que hay que llevar', () => {
    const raw = withObjectives([
      objective('FightMonster', 182, 1),
      objective('MultiFightMonster', 3453, 3),
      objective('FightMonstersOnMap', 4128, 8, 216531204),
      // Lleva 1 alma(s) de {monster,182} a {npc,6693}: el monstruo va en parameter1
      objective('BringSoulToNpc', 6693, 182, 1),
    ])
    expect(questNeeds(raw).monsters).toEqual([
      { dofusId: 182, quantity: 2 },
      { dofusId: 3453, quantity: 3 },
      { dofusId: 4128, quantity: 8 },
    ])
  })

  it('marca caminar mapas al descubrir un mapa o una zona', () => {
    expect(questNeeds(withObjectives([objective('DiscoverMap', 287243)])).walksMaps).toBe(true)
    expect(questNeeds(withObjectives([objective('DiscoverSubArea', 165)])).walksMaps).toBe(true)
    expect(questNeeds(withObjectives([objective('GoToNpc', 447)])).walksMaps).toBe(false)
  })

  it('ignora hablar con PNJ, objetivos libres y fabricar', () => {
    // Seis pies bajo tierra (1976) solo tiene objetivos libres y PNJ
    expect(questNeeds(quest(1976))).toEqual({ items: [], monsters: [], walksMaps: false })
    expect(questNeeds(withObjectives([objective('CraftItem', 9977, 1)]))).toEqual({
      items: [],
      monsters: [],
      walksMaps: false,
    })
  })

  it('una misión sin etapas ni need no pide nada', () => {
    expect(questNeeds({ id: 1, name: { es: 'Vacía' } })).toEqual({
      items: [],
      monsters: [],
      walksMaps: false,
    })
  })
})
