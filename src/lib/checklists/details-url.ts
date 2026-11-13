// La URL de los detalles de una checklist y su forma, sin dependencias: la importa la isla de
// la página, así que no puede arrastrar nada más (src/lib/checklists/details.ts los arma).
// Los tipos se borran al compilar.
import type { QuestObjectiveKind } from '@/lib/dofusdb/types'

export const checklistDetailsUrl = (slug: string) => `/api/checklists/${slug}/details`

/** [tipo, texto, x, y] */
export type ObjectiveDetail = [QuestObjectiveKind, string, number | null, number | null]

/** [PNJ que la da, x, y, objetivos] */
export type QuestDetail = [string | null, number | null, number | null, ObjectiveDetail[]]

export interface ChecklistDetails {
  /** Por ID de DofusDB de la misión. */
  q: Record<number, QuestDetail>
}
