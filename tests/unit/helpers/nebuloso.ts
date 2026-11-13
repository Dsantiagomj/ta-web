// El Nebuloso de verdad para las pruebas del progreso: sus pasos como los deja la importación
// (con sus paradas y lo que cierra cada uno) desde los datos de silvestre-checklist copiados en
// tests/fixtures/silvestre-checklist, y los pesos de sus misiones (weights-fixture.json).
import { readFileSync } from 'node:fs'
import path from 'node:path'

import { CHECKLIST_CATALOG } from '../../../scripts/import/checklists/catalog'
import { readLegacyChecklist } from '../../../scripts/import/checklists/legacy'
import {
  toChecklistDraft,
  type ChecklistDraft,
} from '../../../scripts/import/checklists/to-checklist'
import type { ChecklistIslandData } from '@/lib/checklists/page'
import { questPoints, stepWeights } from '@/lib/derive/weights'

export interface Fixture {
  stepQuests: Record<string, number[]>
  prereqs: Record<string, number[]>
  parent: Record<string, [number, number[]][]>
  quests: Record<string, { level: number; objectives: number }>
  weights: Record<string, { w: number; q: number[]; ids: string[]; os: number[] }>
}

export const ROOT = path.resolve(__dirname, '../../fixtures/silvestre-checklist')
export const fixture = JSON.parse(
  readFileSync(path.join(ROOT, 'src/dofus/nebuloso/weights-fixture.json'), 'utf8'),
) as Fixture

/** El borrador del Nebuloso que hace la importación con los datos antiguos. */
export async function nebulosoDraft(): Promise<ChecklistDraft> {
  const legacy = await readLegacyChecklist(ROOT, 'nebuloso')
  return toChecklistDraft(
    CHECKLIST_CATALOG.find((entry) => entry.id === 'nebuloso')!,
    legacy,
  )
}

export const stepId = (n: number) => `paso-${n}`

/** Lo que recibe la isla para el Nebuloso importado, con los pesos de sus misiones. */
export function islandData(checklist: ChecklistDraft): ChecklistIslandData {
  const steps = checklist.steps.map((step) => {
    const stop = step.segments.find((segment) => segment.kind === 'stop')
    return [
      stepId(step.legacyNumber),
      step.legacyNumber,
      step.quests.map((row) =>
        stop?.kind === 'stop' && stop.quest === row.quest
          ? ([row.quest, row.kind, stop.stopObjective] as [number, typeof row.kind, number])
          : ([row.quest, row.kind] as [number, typeof row.kind]),
      ),
    ] as ChecklistIslandData['steps'][number]
  })
  const points = Object.fromEntries(
    Object.entries(fixture.quests).map(([id, q]) => [id, questPoints(q.level, q.objectives)]),
  )
  const weights = stepWeights(
    steps.map(([, , quests]) => ({ quests: quests.map(([id, kind]) => [id, kind] as const) })),
    points,
  )
  return {
    checklistId: 1,
    slug: 'checklist-nebuloso',
    version: '1',
    steps,
    closes: checklist.steps.flatMap((step) =>
      step.segments.flatMap((segment) =>
        segment.kind === 'resolve'
          ? [[stepId(step.legacyNumber), segment.closes.map(stepId)] as [string, string[]]]
          : [],
      ),
    ),
    legacy: {
      prefix: 'nebuloso:',
      classicKeys: { v4: 'dofus_nebuloso_clean_v1', v3: null },
      guideVersion: 1,
    },
    weights: weights.map(({ w, shares }) => [w, shares]),
    objectives: Object.fromEntries(
      Object.entries(fixture.quests).map(([id, q]) => [id, q.objectives]),
    ),
    prereqs: fixture.prereqs,
    parents: fixture.parent,
    checklists: {},
    legacyIds: {},
  }
}
