// Los detalles de una checklist que la página no lleva en su HTML y la isla carga después
// (GET /api/checklists/<slug>/details): quién da cada misión y dónde, y sus objetivos con sus
// coordenadas. En listas cortas en vez de objetos: son muchas misiones.
import type { Quest } from '@/payload-types'

import type { ChecklistDetails, ObjectiveDetail, QuestDetail } from './details-url'
import { objectiveText, type ObjectiveNames } from './page'

export type { ChecklistDetails } from './details-url'

export type DetailsQuest = Pick<Quest, 'dofusId' | 'startPositions' | 'stages'>

export function checklistDetails(quests: DetailsQuest[], names: ObjectiveNames): ChecklistDetails {
  return {
    q: Object.fromEntries(
      quests.map((quest) => {
        const start =
          quest.startPositions?.find((position) => position.npcName) ?? quest.startPositions?.[0]
        const objectives = (quest.stages ?? []).flatMap((stage) =>
          (stage.objectives ?? []).map((objective): ObjectiveDetail => [
            objective.kind,
            objectiveText(objective.text, names),
            objective.x ?? null,
            objective.y ?? null,
          ]),
        )
        return [
          quest.dofusId,
          [start?.npcName ?? null, start?.x ?? null, start?.y ?? null, objectives] as QuestDetail,
        ]
      }),
    ),
  }
}
