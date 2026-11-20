// Lo terminado en el Silvestre, el Hielos y el Nebuloso sale hecho en el Rush de todos los
// Dofus, que repite sus misiones: el progreso de las misiones es uno para todas las checklists,
// por el ID de DofusDB, y lo apuntado con el id antiguo («nebuloso») también cuenta.
import { beforeAll, describe, expect, it } from 'vitest'

import { CHECKLIST_CATALOG } from '../../scripts/import/checklists/catalog'
import { readLegacyChecklist } from '../../scripts/import/checklists/legacy'
import { toChecklistDraft, type ChecklistDraft } from '../../scripts/import/checklists/to-checklist'
import generic from '../fixtures/legacy-checklist/generic-alternatives.json'
import { islandData, ROOT } from './helpers/nebuloso'

import { checklistModel, questState, type ChecklistModel } from '@/lib/checklists/progress/engine'
import { emptyProgress, type Progress } from '@/lib/checklists/progress/store'

const alternatives = generic as unknown as Record<string, number[]>
const RUSH = 5
const OTHERS = { silvestre: 1, hielos: 2, nebuloso: 3 } as const
const NAMES = {
  silvestre: 'Dofus Silvestre',
  hielos: 'Dofus de los Hielos',
  nebuloso: 'Dofus Nebuloso',
}

const draftOf = async (id: string) =>
  toChecklistDraft(
    CHECKLIST_CATALOG.find((entry) => entry.id === id)!,
    await readLegacyChecklist(ROOT, id),
    alternatives,
  )

const questsOf = (draft: ChecklistDraft) =>
  new Set(draft.steps.flatMap((step) => step.quests.map((row) => row.quest)))

let rush: ChecklistDraft
let model: ChecklistModel
const others: Partial<Record<keyof typeof OTHERS, ChecklistDraft>> = {}

beforeAll(async () => {
  rush = await draftOf('todos')
  for (const id of Object.keys(OTHERS) as (keyof typeof OTHERS)[]) others[id] = await draftOf(id)
  model = checklistModel({
    ...islandData(rush),
    checklistId: RUSH,
    slug: 'checklist-todos-dofus',
    legacy: { prefix: 'todos:', classicKeys: { v4: null, v3: null }, guideVersion: 1 },
    checklists: Object.fromEntries(
      Object.entries(OTHERS).flatMap(([id, n]) => [
        [String(n), NAMES[id as keyof typeof OTHERS]],
        [id, NAMES[id as keyof typeof OTHERS]],
      ]),
    ),
  })
})

/** El primer paso del rush que lleva una misión que también lleva `other`, y esa misión. */
function shared(other: ChecklistDraft): { index: number; quest: number } {
  const theirs = questsOf(other)
  for (const [index, step] of rush.steps.entries()) {
    const row = step.quests.find((candidate) => theirs.has(candidate.quest))
    if (row) return { index, quest: row.quest }
  }
  throw new Error('No comparten ninguna misión')
}

describe('el rush y las checklists que repite', () => {
  for (const id of Object.keys(OTHERS) as (keyof typeof OTHERS)[]) {
    it(`una misión terminada en la del ${NAMES[id]} sale hecha en el rush, y se puede deshacer aquí`, () => {
      const { index, quest } = shared(others[id]!)
      const p: Progress = emptyProgress()
      p.quests[quest] = { o: 'done', by: { c: OTHERS[id], s: 'paso-1' }, at: 1 }
      expect(questState(p, model, index, quest)).toEqual({
        done: true,
        elsewhere: NAMES[id],
      })
    })

    it(`lo migrado de «${id}:» en el navegador también cuenta`, () => {
      const { index, quest } = shared(others[id]!)
      const p: Progress = emptyProgress()
      p.quests[quest] = { o: 'done', by: { c: id }, at: 1 }
      expect(questState(p, model, index, quest)).toEqual({
        done: true,
        elsewhere: NAMES[id],
      })
    })
  }
})
