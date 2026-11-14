// El Silvestre de verdad para las pruebas del progreso: sus pasos como los deja la importación,
// desde los datos de silvestre-checklist copiados en tests/fixtures/silvestre-checklist, con los
// pesos de su weights.json, y lo que recibe la isla con la misma regla que la página.
import { readFileSync } from 'node:fs'
import path from 'node:path'

import { CHECKLIST_CATALOG } from '../../../scripts/import/checklists/catalog'
import {
  readLegacyChecklist,
  type LegacyChecklist,
} from '../../../scripts/import/checklists/legacy'
import {
  toChecklistDraft,
  type ChecklistDraft,
} from '../../../scripts/import/checklists/to-checklist'
import { openStops } from '@/lib/checklists/open-stops'
import type { ChecklistIslandData, IslandQuest } from '@/lib/checklists/page'

export type Weights = Record<string, { w: number; q: number[]; ids: string[]; os: number[] }>

const ROOT = path.resolve(__dirname, '../../fixtures/silvestre-checklist')
export const W = JSON.parse(
  readFileSync(path.join(ROOT, 'src/dofus/silvestre/weights.json'), 'utf8'),
) as Weights

export const stepId = (n: number) => `paso-${n}`

export interface Silvestre {
  legacy: LegacyChecklist
  draft: ChecklistDraft
  objTotal: (id: number) => number
}

export async function silvestre(): Promise<Silvestre> {
  const legacy = await readLegacyChecklist(ROOT, 'silvestre')
  const draft = toChecklistDraft(
    CHECKLIST_CATALOG.find((entry) => entry.id === 'silvestre')!,
    legacy,
  )
  const objTotal = (id: number) =>
    legacy.quests.QUESTS[id].s.reduce((sum, stage) => sum + stage.o.length, 0)
  return { legacy, draft, objTotal }
}

/** Lo que recibe la isla para el Silvestre importado, con los pesos de su weights.json. */
export function silvestreIsland({ legacy, draft, objTotal }: Silvestre): ChecklistIslandData {
  const closed = new Set(
    draft.steps.flatMap((step) => [
      ...step.closes,
      ...step.segments.flatMap((segment) => (segment.kind === 'resolve' ? segment.closes : [])),
    ]),
  )
  const quests = new Set(draft.steps.flatMap((step) => step.quests.map((row) => row.quest)))
  const data = legacy.quests as unknown as {
    PREREQS: Record<string, unknown[]>
    PARENT: Record<string, [number, number[]][]>
  }
  return {
    checklistId: 1,
    slug: 'checklist-silvestre',
    version: '1',
    steps: draft.steps.map((step) => {
      const open = openStops(step.segments, closed.has(step.legacyNumber))
      return [
        stepId(step.legacyNumber),
        step.legacyNumber,
        step.quests.map((row): IslandQuest => {
          const stop = open.get(row.quest)
          if (!stop) return [row.quest, row.kind]
          return stop.later ? [row.quest, row.kind, stop.at, 1] : [row.quest, row.kind, stop.at]
        }),
      ]
    }),
    closes: draft.steps.flatMap((step): [string, string[]][] => {
      const resolves = step.segments.some((segment) => segment.kind === 'resolve')
      const closes = [
        ...step.segments.flatMap((segment) => (segment.kind === 'resolve' ? segment.closes : [])),
        ...step.closes,
      ]
      return resolves || closes.length ? [[stepId(step.legacyNumber), closes.map(stepId)]] : []
    }),
    optionalDoneBy: [],
    legacy: draft.legacy,
    weights: draft.steps.map((step) => {
      const own = W[step.legacyNumber]
      return [
        own?.w ?? 1,
        step.quests.map((row) => own?.q[own.ids.indexOf(String(row.quest))] ?? 0),
      ]
    }),
    objectives: Object.fromEntries([...quests].map((id) => [id, objTotal(id)])),
    prereqs: Object.fromEntries(
      Object.entries(data.PREREQS).flatMap(([id, needs]) =>
        quests.has(Number(id))
          ? [[id, needs.filter((x) => typeof x === 'number') as number[]]]
          : [],
      ),
    ),
    parents: data.PARENT,
    checklists: {},
    legacyIds: {},
  }
}
