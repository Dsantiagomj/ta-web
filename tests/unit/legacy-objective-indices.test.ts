// El checklist de silvestre-checklist guarda el progreso de cada misión como un índice
// sobre sus objetivos aplanados (questObjective) y marca la línea roja de un paso con un
// índice igual. Para migrar ese progreso, nuestros objetivos tienen que caer en las mismas
// posiciones. Los fixtures salen de ese repo: los datos de DofusDB que usó
// (.build/data/quests.json), los objetivos que pinta (src/dofus/*/quests.json, con los
// nombres ya puestos) y las paradas rojas del Nebuloso que calcula su stops.js. Los
// nombres para resolver las marcas del texto son los de DofusDB.
import { describe, expect, it } from 'vitest'

import { questStages } from '@/lib/dofusdb/quest-stages'
import type { MappedQuestObjective, RawQuest } from '@/lib/dofusdb/types'

import questsWithObjectives from '../fixtures/dofusdb/quests-objectives.json'
import legacy from '../fixtures/legacy-checklist/objectives.json'

type Names = Record<string, Record<string, string | null>>

const PLACEHOLDER = /\{(\w+),(\d+)(?:,[^}]*)?\}/g
const UNKNOWN: Record<string, string> = { npc: 'un PNJ', item: 'un objeto', monster: 'un monstruo' }

/** Pone los nombres en el texto, como hacía el checklist al construir sus datos. */
function resolve(text: string | null): string {
  return (text ?? '').replace(
    PLACEHOLDER,
    (_match, kind: string, id: string) =>
      (legacy.names as Names)[kind]?.[id] ?? UNKNOWN[kind] ?? '?',
  )
}

function flatObjectives(id: number): MappedQuestObjective[] {
  const raw = (questsWithObjectives as RawQuest[]).find((candidate) => candidate.id === id)
  if (!raw) throw new Error(`Falta la misión ${id} en los fixtures`)
  return questStages(raw).flatMap((stage) => stage.objectives)
}

const legacyObjectives = legacy.objectives as Record<string, { kind: string; text: string }[]>

describe('índices de objetivos del checklist antiguo', () => {
  it.each(Object.keys(legacyObjectives))(
    'la misión %s tiene los mismos objetivos en el mismo orden',
    (id) => {
      const ours = flatObjectives(Number(id)).map((objective) => ({
        kind: objective.kind,
        text: resolve(objective.text),
      }))
      expect(ours).toEqual(legacyObjectives[id])
    },
  )

  it.each(legacy.stops.map((stop) => [stop.step, stop.questId, stop.index, stop.text] as const))(
    'la parada roja del paso %i del Nebuloso cae en el mismo objetivo (misión %i, índice %i)',
    (_step, questId, index, text) => {
      const objectives = flatObjectives(questId)
      expect(objectives.length).toBe(legacyObjectives[questId].length)
      expect(resolve(objectives[index].text)).toBe(text)
    },
  )

  it('las paradas incluyen índices dentro de misiones largas', () => {
    // Que la prueba no se quede en misiones de un objetivo, donde todo cae en el 0.
    expect(legacy.stops.filter((stop) => stop.index > 0).length).toBeGreaterThanOrEqual(3)
  })
})
