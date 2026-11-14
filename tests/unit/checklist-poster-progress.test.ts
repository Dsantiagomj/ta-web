import { beforeAll, describe, expect, it } from 'vitest'

import type { ChecklistIslandData } from '@/lib/checklists/page'
import {
  posterPct,
  soulsPosterModel,
  stepsPosterModel,
  type StepsPosterModel,
} from '@/lib/checklists/poster-progress'
import { checklistModel, markSteps, progressPct } from '@/lib/checklists/progress/engine'
import { soulsPct } from '@/lib/checklists/progress/souls'
import { emptyProgress, type Progress } from '@/lib/checklists/progress/store'
import type { SoulsIslandData } from '@/lib/checklists/souls'

import { silvestre, silvestreIsland } from './helpers/silvestre'

// El porcentaje de cada tarjeta del índice /checklists: el mismo motor que la página de la
// checklist (src/lib/checklists/progress/engine.ts), sobre lo justo que el índice manda al
// navegador de cada checklist.

// a: dos obligatorias y una opcional; b: para en la 20; c: cierra b; d: sin misiones; e: una
// fila genérica (la -40, con la 40 o la 41) y la 50, que el juego termina solo con la 51.
const island: ChecklistIslandData = {
  checklistId: 7,
  slug: 'checklist-nebuloso',
  version: '2026-11-14T00:00:00.000Z',
  steps: [
    [
      'a',
      1,
      [
        [10, 'mandatory'],
        [11, 'mandatory'],
        [12, 'optional'],
      ],
    ],
    [
      'b',
      2,
      [
        [20, 'mandatory', 1],
        [10, 'mandatory'],
      ],
    ],
    ['c', 3, [[20, 'mandatory']]],
    ['d', 4, []],
    [
      'e',
      5,
      [
        [-40, 'mandatory'],
        [50, 'mandatory'],
      ],
    ],
  ],
  closes: [['c', ['b']]],
  optionalDoneBy: [['a', [12]]],
  prerequisites: ['orden'],
  compositeKeys: ['7045|7047'],
  anyOf: [[-40, [40, 41]]],
  completedBy: [[50, [51]]],
  legacy: { prefix: 'nebuloso:', guideVersion: 1 },
  weights: [
    [150, [50, 100, 0]],
    [250, [200, 50]],
    [200, [200]],
    [1, []],
    [400, [250, 150]],
  ],
  objectives: { 10: 4, 11: 2, 12: 1, 20: 3, 40: 2, 41: 2, 50: 1, 51: 1 },
  prereqs: { 11: [10] },
  parents: { 20: [[1, [21]]] },
  checklists: { 7: 'Dofus Nebuloso', nebuloso: 'Dofus Nebuloso' },
  legacyIds: { nebuloso: 7 },
}

const done = (at = 1) => ({ o: 'done' as const, at })

/** Progresos que tocan cada camino del porcentaje. */
const progresses: [string, Progress][] = [
  ['sin nada', emptyProgress()],
  ['un paso marcado', { ...emptyProgress(), steps: { a: { done: true, at: 1 } } }],
  ['una misión hecha en otra checklist', { ...emptyProgress(), quests: { 20: done() } }],
  ['una misión que pide otra hecha', { ...emptyProgress(), quests: { 11: done() } }],
  ['la fila genérica con una de sus misiones', { ...emptyProgress(), quests: { 41: done() } }],
  ['la que el juego termina sola', { ...emptyProgress(), quests: { 51: done() } }],
  [
    'todos los pasos marcados',
    {
      ...emptyProgress(),
      steps: Object.fromEntries(['a', 'b', 'c', 'd', 'e'].map((id) => [id, { done: true, at: 1 }])),
    },
  ],
]

describe('stepsPosterModel', () => {
  it('lleva solo lo que pide el porcentaje: pasos, pesos, objetivos, prerrequisitos, filas genéricas y lo que el juego termina solo', () => {
    const model = stepsPosterModel(island)
    expect(model).toEqual({
      kind: 'steps',
      slug: 'checklist-nebuloso',
      id: 7,
      steps: [
        [
          'a',
          [
            [10, 'mandatory'],
            [11, 'mandatory'],
            [12, 'optional'],
          ],
        ],
        [
          'b',
          [
            [20, 'mandatory'],
            [10, 'mandatory'],
          ],
        ],
        ['c', [[20, 'mandatory']]],
        ['d', []],
        [
          'e',
          [
            [-40, 'mandatory'],
            [50, 'mandatory'],
          ],
        ],
      ],
      weights: island.weights,
      objectives: island.objectives,
      prereqs: island.prereqs,
      anyOf: island.anyOf,
      completedBy: island.completedBy,
    } satisfies StepsPosterModel)
  })
})

describe('posterPct', () => {
  const full = checklistModel(island)

  for (const [label, progress] of progresses) {
    it(`da lo mismo que la página de la checklist: ${label}`, () => {
      expect(posterPct(progress, stepsPosterModel(island))).toBe(progressPct(progress, full))
    })
  }

  it('el Silvestre de verdad da lo mismo que la página con cualquier tramo de pasos marcado', async () => {
    const data = silvestreIsland(await silvestre())
    const model = checklistModel(data)
    const poster = stepsPosterModel(data)
    // Un paso de cada siete y el tramo inicial: paradas, cierres y misiones a medias.
    const indices = model.steps.map((_, index) => index)
    const sparse = indices.filter((index) => index % 7 === 0)
    const firstHalf = indices.slice(0, indices.length / 2)
    for (const marked of [sparse, firstHalf]) {
      const progress = markSteps(emptyProgress(), model, marked, 1)
      expect(posterPct(progress, poster)).toBe(progressPct(progress, model))
      expect(posterPct(progress, poster)).toBeGreaterThan(0)
    }
  })

  describe('una checklist de almas', () => {
    const souls: SoulsIslandData = {
      checklistId: 9,
      slug: 'lista-ocre',
      version: '2026-11-14T00:00:00.000Z',
      legacy: { prefix: 'cosecha:' },
      souls: [101, 102, 103, 104],
    }

    it('lleva solo sus almas', () => {
      expect(soulsPosterModel(souls)).toEqual({
        kind: 'souls',
        slug: 'lista-ocre',
        souls: [101, 102, 103, 104],
      })
    })

    it('da lo mismo que su página', () => {
      const progress = { ...emptyProgress(), souls: { 101: 1, 103: 2, 999: 3 } }
      expect(posterPct(progress, soulsPosterModel(souls))).toBe(soulsPct(progress, souls))
      expect(posterPct(progress, soulsPosterModel(souls))).toBe(50)
    })
  })
})

// Lo que pesa en la página: lo que el índice manda de cada checklist, en texto.
describe('el tamaño de lo que se manda', () => {
  let data: ChecklistIslandData
  beforeAll(async () => {
    data = silvestreIsland(await silvestre())
  })

  it('es menos que lo que recibe la isla de la checklist', () => {
    expect(JSON.stringify(stepsPosterModel(data)).length).toBeLessThan(JSON.stringify(data).length)
  })
})
