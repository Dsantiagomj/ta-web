// El mismo progreso da el mismo porcentaje que silvestre-checklist, con el Silvestre de verdad:
// paradas que termina un paso posterior (el 38 y el 92), el verde que deja una parada (el 43 y
// el 72), pasos que cierran otros sin verde (el 93 y el 94) y varias paradas en un rojo. Se
// mide con el cálculo antiguo, copiado de src/tools/checklist/state/store.js (donePts,
// questPts, questDoneElsewhere y openOf con `later` y `followUp`), y con el motor nuevo sobre
// los mismos pesos (los de su weights.json) y el mismo progreso.
import { beforeAll, describe, expect, it } from 'vitest'

import type { LegacyChecklist } from '../../scripts/import/checklists/legacy'
import {
  checklistModel,
  markSteps,
  progressPct,
  type ChecklistModel,
} from '@/lib/checklists/progress/engine'
import { emptyProgress, type Progress } from '@/lib/checklists/progress/store'

import oldStops from '../fixtures/legacy-checklist/silvestre-stops.json'
import { silvestre, silvestreIsland, stepId, W, type Silvestre } from './helpers/silvestre'

let legacy: LegacyChecklist
let model: ChecklistModel
let objTotal: Silvestre['objTotal']

beforeAll(async () => {
  const loaded = await silvestre()
  ;({ legacy, objTotal } = loaded)
  model = checklistModel(silvestreIsland(loaded))
})

/** El porcentaje de silvestre-checklist con sus pasos hechos y el objetivo de cada misión. */
function legacyPct(done: Set<number>, questObj: Record<number, number>): number {
  const data = legacy.quests as unknown as {
    STEP_QUESTS: Record<string, (number | string)[]>
    STEP_QUEST_KINDS: Record<string, Record<string, string>>
    PREREQS: Record<string, (number | string)[]>
    PARENT: Record<string, [number, number[]][]>
  }
  const numbers = legacy.steps.map((step) => step.n)
  const weight = (n: number) => W[n]?.w ?? 1
  // La única diferencia a propósito con silvestre-checklist (desde el PR 5 del Nebuloso): una
  // misión terminada al marcar su paso también da por hechas las que pide terminadas, no solo
  // la terminada a mano (impliedDone).
  const finishedQuests = new Set(
    Object.entries(questObj).flatMap(([id, k]) => (k >= objTotal(Number(id)) ? [id] : [])),
  )
  const implied = new Set<string>()
  const imply = () => {
    for (const id of finishedQuests) for (const x of data.PREREQS[id] ?? []) implied.add(String(x))
  }
  const closers: Record<number, number[]> = {}
  for (const step of legacy.steps)
    for (const c of step.closes ?? []) (closers[c] ??= []).push(step.n)
  const resolves = (n: number) => !!legacy.steps[n - 1].marks?.some(([kind]) => kind === 'done')
  const mandatory = (n: number) =>
    (data.STEP_QUESTS[n] ?? [])
      .filter((id) => (data.STEP_QUEST_KINDS[n]?.[id] ?? 'mandatory') === 'mandatory')
      .map(String)
  const openOf = (n: number) => {
    const stops = oldStops.filter((point) => point.step === n) as {
      quest: number
      index: number
      later?: boolean
      followUp?: boolean
    }[]
    const own = !resolves(n)
      ? stops
      : stops.some((p) => p.followUp)
        ? stops.filter((p) => p.followUp || p.later)
        : closers[n]
          ? stops
          : stops.filter((p) => p.later)
    const quests = mandatory(n)
    const open = new Set(own.map((p) => String(p.quest)).filter((id) => quests.includes(id)))
    const later = Object.fromEntries(
      own.filter((p) => p.later).map((p) => [String(p.quest), p.index]),
    )
    for (let grew = true; grew;) {
      grew = false
      for (const id of quests) {
        if (open.has(id)) continue
        if ((data.PARENT[id] ?? []).some(([, kids]) => kids.some((kid) => open.has(String(kid))))) {
          open.add(id)
          grew = true
        }
      }
    }
    return { open, later }
  }
  const stepsOf: Record<string, number[]> = {}
  for (const n of numbers) for (const id of mandatory(n)) (stepsOf[id] ??= []).push(n)
  const doneElsewhere = (id: string, except: number) => {
    for (const m of stepsOf[id] ?? []) {
      if (m === except || !done.has(m)) continue
      const { open, later } = openOf(m)
      if (!open.has(id)) return true
      if (id in later) continue
      const by = closers[m] ?? []
      if (by.length && by.every((c) => done.has(c))) return true
    }
    return false
  }
  for (const n of done) {
    const { open } = openOf(n)
    for (const id of mandatory(n)) if (!open.has(id)) finishedQuests.add(id)
  }
  for (const n of numbers) {
    for (const id of mandatory(n)) if (doneElsewhere(id, -1)) finishedQuests.add(id)
  }
  imply()
  const questPts = (n: number) =>
    (W[n]?.q ?? []).reduce((sum, share, i) => {
      const id = W[n].ids[i]
      const finished =
        (questObj[Number(id)] ?? 0) >= W[n].os[i] || implied.has(id) || doneElsewhere(id, n)
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
    p.quests[id] = { o: k >= objTotal(Number(id)) ? 'done' : k, at: 1 }
  }
  const indices = [...done].map((n) => model.index.get(stepId(n))!)
  return markSteps(p, model, indices, 1)
}

const range = (from: number, to: number) =>
  Array.from({ length: to - from + 1 }, (_, i) => from + i)
const finished = (...ids: number[]) => Object.fromEntries(ids.map((id) => [id, objTotal(id)]))
const questOf = (name: string) =>
  Number(Object.entries(legacy.quests.QUESTS).find(([, quest]) => quest.n === name)![0])

describe('el porcentaje del Silvestre, como en silvestre-checklist', () => {
  const cases: [string, () => number[], () => Record<number, number>][] = [
    ['nada', () => [], () => ({})],
    ['los treinta primeros pasos', () => range(1, 30), () => ({})],
    // El 43 deja la parada de su verde; el 45 la termina.
    ['el 43, que deja la parada de su verde', () => range(1, 43), () => ({})],
    ['el 43 y el 45, que lo cierra', () => range(1, 45), () => ({})],
    // El 38 deja «La bruja mala del Este» para un paso posterior (la termina el 62).
    ['el 38, que deja una para un paso posterior', () => range(1, 38), () => ({})],
    ['hasta el 61, sin el que la termina', () => range(1, 61), () => ({})],
    ['hasta el 62', () => range(1, 62), () => ({})],
    // El 93 cierra el 92 sin verde; el 92 deja «Un legado atormentado» para el 98.
    ['el 92 y el 93, que lo cierra sin verde', () => [...range(1, 40), 92, 93], () => ({})],
    [
      'misiones terminadas en un paso sin marcar',
      () => range(1, 5),
      () => finished(questOf('Draconantropía')),
    ],
    ['una a medias no cuenta', () => range(1, 9), () => ({ [questOf('Encender la mecha')]: 1 })],
    ['todos menos uno', () => range(1, 100).filter((n) => n !== 50), () => ({})],
    ['todos', () => range(1, 100), () => ({})],
  ]

  it.each(cases)('%s', (_, steps, questObj) => {
    const done = new Set(steps())
    const objectives = questObj()
    expect(progressPct(progressOf(done, objectives), model)).toBe(legacyPct(done, objectives))
  })
})
