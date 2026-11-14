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
import { groupKey, type ChecklistIslandData, type IslandQuest } from '@/lib/checklists/page'

import alternatives from '../../fixtures/legacy-checklist/generic-alternatives.json'

export type Weights = Record<string, { w: number; q: number[]; ids: string[]; os: number[] }>

const ROOT = path.resolve(__dirname, '../../fixtures/silvestre-checklist')
/** Los pesos de su weights.json, por paso antiguo. */
export const weightsOf = (id: string) =>
  JSON.parse(readFileSync(path.join(ROOT, `src/dofus/${id}/weights.json`), 'utf8')) as Weights
export const W = weightsOf('silvestre')

export const stepId = (n: number) => `paso-${n}`

export interface Silvestre {
  id: string
  legacy: LegacyChecklist
  draft: ChecklistDraft
  objTotal: (id: number) => number
}

/** Una checklist antigua importada (el Silvestre por defecto; también el Hielos). */
export async function silvestre(id = 'silvestre'): Promise<Silvestre> {
  const legacy = await readLegacyChecklist(ROOT, id)
  const draft = toChecklistDraft(
    CHECKLIST_CATALOG.find((entry) => entry.id === id)!,
    legacy,
    alternatives as unknown as Record<string, number[]>,
  )
  const objTotal = (id: number) =>
    legacy.quests.QUESTS[id].s.reduce((sum, stage) => sum + stage.o.length, 0)
  return { id, legacy, draft, objTotal }
}

/** Lo que recibe la isla para el Silvestre importado, con los pesos de su weights.json. */
export function silvestreIsland({ id, legacy, draft, objTotal }: Silvestre): ChecklistIslandData {
  const W = weightsOf(id)
  // Los objetivos de una fila genérica, los de su registro antiguo («clase», «alt:…»).
  const genericObjectives = (first: number) => {
    const oldId = Object.entries(draft.legacy.genericQuests ?? {}).find(([, q]) => q === first)?.[0]
    const quest = oldId ? legacy.quests.QUESTS[oldId] : undefined
    return quest ? quest.s.reduce((sum, stage) => sum + stage.o.length, 0) : 0
  }
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
    slug: `checklist-${id}`,
    version: '1',
    steps: draft.steps.map((step) => {
      const open = openStops(step.segments, closed.has(step.legacyNumber))
      return [
        stepId(step.legacyNumber),
        step.legacyNumber,
        step.quests.map((row): IslandQuest => {
          const key = row.label ? -row.quest : row.quest
          const stop = open.get(row.quest)
          if (!stop) return [key, row.kind]
          return stop.later ? [key, row.kind, stop.at, 1] : [key, row.kind, stop.at]
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
    prerequisites: draft.prerequisites.groups.flatMap((group) => group.rows.map((row) => row.key)),
    // Las claves compuestas de sus filas, como las da la página (needRow en page.ts).
    compositeKeys: [
      ...new Set(
        [...draft.steps.flatMap((step) => step.needs), ...draft.prerequisites.needs].flatMap(
          (need) => {
            const option = (item: string, name: string) =>
              item.startsWith('x:') ? `x:${name.toLocaleLowerCase('es')}` : item
            const key =
              [
                option(need.item, need.name),
                ...(need.alternatives ?? []).map((alt) => option(alt.item, alt.name)),
              ].join('|') + (need.group ? `@${groupKey(need.group)}` : '')
            return /[|@]/.test(key) ? [key] : []
          },
        ),
      ),
    ],
    anyOf: draft.steps.flatMap((step) =>
      step.quests.flatMap((row): [number, number[]][] =>
        row.label ? [[-row.quest, [row.quest, ...(row.alternatives ?? [])]]] : [],
      ),
    ),
    completedBy: draft.completedBy.map(({ quest, by }): [number, number[]] => [quest, by]),
    legacy: draft.legacy,
    weights: draft.steps.map((step) => {
      const own = W[step.legacyNumber]
      // Una fila genérica pesa lo que su id antiguo («clase») en weights.json.
      const oldId = (quest: number) =>
        Object.entries(draft.legacy.genericQuests ?? {}).find(([, first]) => first === quest)?.[0]
      return [
        own?.w ?? 1,
        step.quests.map((row) => {
          const id = row.label ? (oldId(row.quest) ?? '') : String(row.quest)
          return own?.q[own.ids.indexOf(id)] ?? 0
        }),
      ]
    }),
    objectives: Object.fromEntries(
      draft.steps.flatMap((step) =>
        step.quests.map((row) => [
          row.label ? -row.quest : row.quest,
          row.label ? genericObjectives(row.quest) : objTotal(row.quest),
        ]),
      ),
    ),
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
