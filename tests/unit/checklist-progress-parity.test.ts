// El mismo progreso da el mismo porcentaje que silvestre-checklist. El Nebuloso de verdad (sus
// pasos como los deja la importación, con sus paradas y lo que cierra cada uno, y los pesos de
// su weights.json) se mide dos veces: con el cálculo antiguo, copiado aquí de
// src/tools/checklist/state/store.js (donePts, questPts, questDoneElsewhere, openOf,
// impliedDone), y con el motor nuevo sobre el mismo progreso.
import { beforeAll, describe, expect, it } from 'vitest'

import type { ChecklistDraft } from '../../scripts/import/checklists/to-checklist'
import {
  checklistModel,
  markSteps,
  progressPct,
  type ChecklistModel,
} from '@/lib/checklists/progress/engine'
import { emptyProgress, type Progress } from '@/lib/checklists/progress/store'

import { fixture, islandData, nebulosoDraft, stepId } from './helpers/nebuloso'

let draft: ChecklistDraft
let model: ChecklistModel

beforeAll(async () => {
  draft = await nebulosoDraft()
  model = checklistModel(islandData(draft))
})

/** El porcentaje de silvestre-checklist con sus pasos hechos y el objetivo de cada misión. */
function legacyPct(done: Set<number>, questObj: Record<number, number>): number {
  const W = fixture.weights
  // Todos los pasos: los que no tienen misiones no salen en weights.json y pesan 1
  const numbers = draft.steps.map((step) => step.legacyNumber)
  const weight = (n: number) => W[n]?.w ?? 1
  const objTotal = (id: number) => fixture.quests[id].objectives
  const implied = new Set<number>()
  for (const [id, k] of Object.entries(questObj)) {
    if (k >= objTotal(Number(id))) for (const x of fixture.prereqs[id] ?? []) implied.add(x)
  }
  const closers: Record<number, number[]> = {}
  const resolves = new Set<number>()
  const stops: Record<number, number[]> = {}
  for (const step of draft.steps) {
    for (const segment of step.segments) {
      if (segment.kind === 'resolve') {
        resolves.add(step.legacyNumber)
        for (const c of segment.closes) (closers[c] ??= []).push(step.legacyNumber)
      }
      if (segment.kind === 'stop') (stops[step.legacyNumber] ??= []).push(segment.quest)
    }
  }
  // openOf, sin paradas «later» ni las que deja un verde (el Nebuloso no las tiene)
  const openOf = (n: number) => {
    const own = !resolves.has(n) || closers[n] ? (stops[n] ?? []) : []
    const quests = fixture.stepQuests[n] ?? []
    const open = new Set(own.filter((id) => quests.includes(id)))
    for (let grew = true; grew;) {
      grew = false
      for (const id of quests) {
        if (open.has(id)) continue
        if ((fixture.parent[id] ?? []).some(([, kids]) => kids.some((kid) => open.has(kid)))) {
          open.add(id)
          grew = true
        }
      }
    }
    return open
  }
  const stepsOf: Record<number, number[]> = {}
  for (const n of numbers)
    for (const id of fixture.stepQuests[n] ?? []) (stepsOf[id] ??= []).push(n)
  const doneElsewhere = (id: number, except: number) => {
    for (const m of stepsOf[id] ?? []) {
      if (m === except || !done.has(m)) continue
      if (!openOf(m).has(id)) return true
      const by = closers[m] ?? []
      if (by.length && by.every((c) => done.has(c))) return true
    }
    return false
  }
  const questPts = (n: number) =>
    (W[n]?.q ?? []).reduce((sum, share, i) => {
      const id = Number(W[n].ids[i])
      const finished = (questObj[id] ?? 0) >= W[n].os[i] || implied.has(id) || doneElsewhere(id, n)
      return sum + (finished ? share : 0)
    }, 0)
  const total = numbers.reduce((sum, n) => sum + weight(n), 0)
  const pts = numbers.reduce((sum, n) => sum + (done.has(n) ? weight(n) : questPts(n)), 0)
  if (!pts) return 0
  if (numbers.every((n) => done.has(n))) return 100
  return Math.min(99.9, Math.max(0.1, Math.round((pts / total) * 1000) / 10))
}

/** El mismo progreso en ta-web:progress: las misiones con su objetivo y los pasos marcados. */
function progressOf(done: Set<number>, questObj: Record<number, number>): Progress {
  const p = emptyProgress()
  for (const [id, k] of Object.entries(questObj)) {
    p.quests[id] = { o: k >= fixture.quests[id].objectives ? 'done' : k, at: 1 }
  }
  const indices = [...done].map((n) => model.index.get(stepId(n))!)
  return markSteps(p, model, indices, 1)
}

const range = (from: number, to: number) =>
  Array.from({ length: to - from + 1 }, (_, i) => from + i)
const finished = (...ids: number[]) =>
  Object.fromEntries(ids.map((id) => [id, fixture.quests[id].objectives]))

describe('el porcentaje del Nebuloso, como en silvestre-checklist', () => {
  const cases: [string, number[], Record<number, number>][] = [
    ['nada', [], {}],
    ['los diez primeros pasos', range(1, 10), {}],
    ['el 7 para y aún no lo cierra el 11', range(1, 7), {}],
    ['el 7 y el 11 que lo cierra', [...range(1, 7), 11], {}],
    ['misiones terminadas en un paso sin marcar', range(1, 3), finished(1608, 1609, 1610)],
    ['misiones que piden otras terminadas', [], finished(1486, 1493)],
    ['una misión a medias no cuenta', range(1, 2), { 1571: 4 }],
    ['las misiones de varios pasos', range(1, 12), finished(1491, 1514)],
    ['todos menos uno', range(1, 26).filter((n) => n !== 12), {}],
    ['todos', range(1, 26), {}],
  ]

  it.each(cases)('%s', (_, steps, questObj) => {
    const done = new Set(steps)
    expect(progressPct(progressOf(done, questObj), model)).toBe(legacyPct(done, questObj))
  })
})
