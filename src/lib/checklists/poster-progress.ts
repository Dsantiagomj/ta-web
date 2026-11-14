// El porcentaje de cada tarjeta del índice /checklists, con el mismo motor que la página de la
// checklist (./progress/engine.ts y ./progress/souls.ts). El índice manda al navegador lo justo
// de cada checklist para calcularlo: de una de pasos, sus pasos con sus misiones, los pesos,
// los objetivos, los prerrequisitos entre sus misiones, las filas genéricas y lo que el juego
// termina solo; de una de almas, sus almas. Código puro: lo prueba tests/unit.
import type { ChecklistIslandData } from './page'
import { checklistModel, progressPct } from './progress/engine'
import { soulsPct } from './progress/souls'
import type { Progress } from './progress/store'
import type { SoulsIslandData } from './souls'

type IslandQuestKind = ChecklistIslandData['steps'][number][2][number][1]

export interface StepsPosterModel {
  kind: 'steps'
  slug: string
  /** El ID de la checklist. */
  id: number
  /** [stepId, [[ID de DofusDB de la misión, tipo]]]. */
  steps: [string, [number, IslandQuestKind][]][]
  weights: ChecklistIslandData['weights']
  objectives: ChecklistIslandData['objectives']
  prereqs: ChecklistIslandData['prereqs']
  anyOf: ChecklistIslandData['anyOf']
  completedBy: ChecklistIslandData['completedBy']
}

export interface SoulsPosterModel {
  kind: 'souls'
  slug: string
  souls: number[]
}

export type PosterProgressModel = StepsPosterModel | SoulsPosterModel

/** Lo que el índice manda de una checklist de pasos, sacado de lo que recibe su isla. */
export function stepsPosterModel(island: ChecklistIslandData): StepsPosterModel {
  return {
    kind: 'steps',
    slug: island.slug,
    id: island.checklistId,
    steps: island.steps.map(([stepId, , quests]) => [
      stepId,
      quests.map(([quest, kind]): [number, IslandQuestKind] => [quest, kind]),
    ]),
    weights: island.weights,
    objectives: island.objectives,
    prereqs: island.prereqs,
    anyOf: island.anyOf,
    completedBy: island.completedBy,
  }
}

/** Lo que el índice manda de una checklist de almas: sus almas. */
export const soulsPosterModel = (island: SoulsIslandData): SoulsPosterModel => ({
  kind: 'souls',
  slug: island.slug,
  souls: island.souls,
})

/**
 * El porcentaje de la checklist con el progreso del navegador, con un decimal: el que enseña su
 * página. Lo que el porcentaje no usa (paradas, cierres, madres, nombres) va vacío.
 */
export function posterPct(progress: Progress, model: PosterProgressModel): number {
  if (model.kind === 'souls') {
    return soulsPct(progress, {
      checklistId: 0,
      slug: model.slug,
      version: '',
      legacy: {},
      souls: model.souls,
    })
  }
  const island: ChecklistIslandData = {
    checklistId: model.id,
    slug: model.slug,
    version: '',
    steps: model.steps.map(([stepId, quests]) => [stepId, null, quests]),
    closes: [],
    prerequisites: [],
    compositeKeys: [],
    optionalDoneBy: [],
    anyOf: model.anyOf,
    completedBy: model.completedBy,
    legacy: {},
    weights: model.weights,
    objectives: model.objectives,
    prereqs: model.prereqs,
    parents: {},
    checklists: {},
    legacyIds: {},
  }
  return progressPct(progress, checklistModel(island))
}
