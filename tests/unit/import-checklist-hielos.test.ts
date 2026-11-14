// La checklist del Dofus de los Hielos tal como la deja la importación, antes de tocar la base.
// Sobre lo que ya trae el Silvestre, lleva las misiones que el juego termina solas al terminar
// otras (COMPLETED_BY), un «detente aquí» que solo avisa (el 14 solo toma una misión) y avisos
// sueltos (el 2).
import path from 'node:path'

import { beforeAll, describe, expect, it } from 'vitest'

import { CHECKLIST_CATALOG } from '../../scripts/import/checklists/catalog'
import { readLegacyChecklist, type LegacyChecklist } from '../../scripts/import/checklists/legacy'
import {
  stepText,
  toChecklistDraft,
  type ChecklistDraft,
} from '../../scripts/import/checklists/to-checklist'

import generic from '../fixtures/legacy-checklist/generic-alternatives.json'
import oldStops from '../fixtures/legacy-checklist/hielos-stops.json'

const alternatives = generic as unknown as Record<string, number[]>

const ROOT = path.resolve(__dirname, '../fixtures/silvestre-checklist')
const hielos = CHECKLIST_CATALOG.find((entry) => entry.id === 'hielos')!

let legacy: LegacyChecklist
let draft: ChecklistDraft

beforeAll(async () => {
  legacy = await readLegacyChecklist(ROOT, 'hielos')
  draft = toChecklistDraft(hielos, legacy, alternatives)
})

const step = (n: number) => draft.steps.find((candidate) => candidate.legacyNumber === n)!

describe('el Dofus de los Hielos', () => {
  it('sus 70 pasos, con el texto exacto de la guía', () => {
    expect(draft.steps).toHaveLength(70)
    for (const [index, old] of legacy.steps.entries()) {
      expect(stepText(draft.steps[index])).toBe(old.text)
    }
  })

  it('las paradas caen en los objetivos que calcula el checklist antiguo', () => {
    const ours = draft.steps.flatMap((ours) =>
      ours.segments.flatMap((segment) =>
        segment.kind === 'stop'
          ? [segment, ...(segment.more ?? [])].flatMap((point) =>
              point.quest === null
                ? []
                : [{ step: ours.legacyNumber, quest: point.quest, index: point.stopObjective }],
            )
          : [],
      ),
    )
    // Las de «Recolección en…» (agricultor o alquimista) van con la primera de sus misiones.
    const first = (quest: number | string) =>
      typeof quest === 'number' ? quest : alternatives[quest][0]
    expect(ours).toEqual(
      oldStops.map(({ step, quest, index }) => ({ step, quest: first(quest), index })),
    )
  })

  it('el 14 solo toma una misión: su rojo avisa, sin misión donde parar', () => {
    expect(step(14).segments[1]).toMatchObject({ kind: 'stop', quest: null, stopObjective: null })
  })

  it('un aviso suelto va en su tramo', () => {
    expect(step(2).segments.map((segment) => segment.kind)).toEqual(['plain', 'note'])
  })

  it('las misiones que se terminan solas, con las que las terminan, en su orden', () => {
    expect(draft.completedBy).toEqual(
      Object.entries(legacy.quests.COMPLETED_BY ?? {}).map(([quest, by]) => ({
        quest: Number(quest),
        by,
      })),
    )
    expect(draft.completedBy).toContainEqual({ quest: 649, by: [612, 613, 614, 615] })
  })

  it('las diez de «Recolección en…»: la de agricultor o la de alquimista', () => {
    expect(draft.generic).toBeUndefined()
    expect(step(3).quests).toContainEqual(
      expect.objectContaining({
        quest: 556,
        label: 'Recolección en los campos de hielo',
        alternatives: [566],
      }),
    )
    // Y «Prólogo invernal», una por alineamiento, como en el Silvestre.
    expect(Object.keys(draft.legacy.genericQuests ?? {})).toHaveLength(11)
  })

  it('los pasos que avanza un paso y su migración', () => {
    expect(step(41).updates).toEqual([36])
    expect(draft.legacy).toMatchObject({
      prefix: 'hielos:',
      classicKeys: { v4: 'dofus_hielos_clean_v2', v3: null },
      guideVersion: 1,
    })
  })
})
