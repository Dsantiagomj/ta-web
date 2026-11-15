import { describe, expect, it } from 'vitest'

import { questNeeds } from '@/lib/dofusdb/quest-needs'
import type { RawQuest, RawQuestObjective } from '@/lib/dofusdb/types'

import shownItems from '../fixtures/dofusdb/quests-shown-items.json'
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

  describe('un objeto que solo hay que enseñar no se suma', () => {
    // «Enséñale a {npc}: N x {item}» (typeId 2) no se queda el objeto: el mismo sirve para
    // enseñarlo las veces que haga falta. DofusDB lo suma en need.items igualmente.
    const shown = (id: number) => {
      const found = (shownItems as RawQuest[]).find((candidate) => candidate.id === id)
      if (!found) throw new Error(`Falta la misión ${id} en los fixtures`)
      return structuredClone(found)
    }

    it('El forjador de leyenda enseña dos veces el Cocobur: 1', () => {
      // need.items de DofusDB dice 2 × 20210 porque cuenta cada «Enséñale». El frasco
      // (20211) sí se entrega.
      expect(questNeeds(shown(2036)).items).toEqual([
        { dofusId: 20210, quantity: 1 },
        { dofusId: 20211, quantity: 1 },
      ])
    })

    it('La espada de la roca enseña el Cocobur y un trozo, y entrega lo demás', () => {
      expect(questNeeds(shown(2035)).items).toEqual([
        { dofusId: 20210, quantity: 1 },
        { dofusId: 20207, quantity: 1 },
        { dofusId: 20208, quantity: 1 },
        { dofusId: 20209, quantity: 3 },
      ])
    })

    it('enseñarlo y luego entregarlo es el mismo objeto: 1', () => {
      // Las llaves de la desgracia (1725): Enséñale 1 x 17792 y luego Entrégale 1 x 17792.
      expect(questNeeds(shown(1725)).items).toEqual([{ dofusId: 17792, quantity: 1 }])
    })

    it('sin need.items, la mayor de las veces que se enseña', () => {
      const raw = withObjectives([
        { ...objective('BringItemToNpc', 6391, 10288, 2), typeId: 2 },
        { ...objective('BringItemToNpc', 6391, 10288, 2), typeId: 2 },
        { ...objective('BringItemToNpc', 6391, 10319, 1), typeId: 2 },
      ])
      expect(questNeeds(raw).items).toEqual([
        { dofusId: 10288, quantity: 2 },
        { dofusId: 10319, quantity: 1 },
      ])
    })

    it('lo que need.items pide además de lo enseñado se queda', () => {
      // Quien siembra vientos recoge Artempestad (1998): enseña 1 x 306 y DofusDB pide 3, dos de
      // ellos por fabricar y entregar. Solo sale la parte del «Enséñale».
      const raw = withObjectives([
        {
          ...objective('BringItemToNpc', 4344, 306, 1),
          typeId: 2,
          need: { generated: { items: [306], quantities: [1] } },
        },
      ])
      raw.need = { items: [306], quantities: [3] }
      expect(questNeeds(raw).items).toEqual([{ dofusId: 306, quantity: 2 }])
    })
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
