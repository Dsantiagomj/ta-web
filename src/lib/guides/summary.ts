// Resumen de una guía sacado de su misión de DofusDB.
// Código puro, sin Payload: lo usan el servidor y los componentes del panel.

import { needsText, prerequisitesText, rewardsText } from './format'
import { guideStrings } from './strings'

/** Una relación de Payload: el ID sin poblar o el documento poblado. */
type Relation<T> = number | T

export interface NamedDoc {
  name?: string | null
}

export interface LinkedItem extends NamedDoc {
  typeId?: number | null
}

export interface LinkedRewards {
  experience?: number | null
  kamas?: number | null
  items?: { item: Relation<LinkedItem>; quantity: number }[] | null
}

export interface LinkedNeeds {
  items?: { item: Relation<LinkedItem>; quantity: number }[] | null
  monsters?: { monster: Relation<NamedDoc>; quantity: number }[] | null
  walksMaps?: boolean | null
}

/** La misión de DofusDB enlazada a la guía, leída de la colección quests con depth 1. */
export interface LinkedQuest {
  name?: string | null
  levelMin?: number | null
  startCriterion?: string | null
  prerequisites?: Relation<NamedDoc>[] | null
  startPositions?: { npcName?: string | null; x?: number | null; y?: number | null }[] | null
  rewards?: LinkedRewards | null
  needs?: LinkedNeeds | null
}

export interface SummaryValues {
  prerequisites: string | null
  needs: string | null
  rewards: string | null
  startNpc: string | null
  startX: number | null
  startY: number | null
}

export type SummaryField = keyof SummaryValues

/** Lo que DofusDB da para cada campo del resumen. */
export function summaryFromQuest(quest: LinkedQuest | null | undefined): SummaryValues {
  // DofusDB puede dar varias posiciones de inicio, una por clase: vale la primera.
  const start = quest?.startPositions?.[0]
  return {
    prerequisites: quest ? prerequisitesText(quest) : null,
    needs: needsText(quest?.needs),
    rewards: rewardsText(quest?.rewards),
    startNpc: start?.npcName || null,
    startX: start?.x ?? null,
    startY: start?.y ?? null,
  }
}

/** La misión enlazada tal como la ve el panel mientras Torre edita. */
export type LinkedQuestState =
  | { status: 'none' }
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; quest: LinkedQuest }

/** El texto bajo un campo del resumen: lo que se mostrará si Torre lo deja vacío. */
export function inheritedHint(state: LinkedQuestState, field: SummaryField): string {
  const { admin } = guideStrings
  if (state.status === 'none') return admin.noQuest
  if (state.status === 'loading') return admin.inheritedLoading
  if (state.status === 'error') return admin.inheritedUnavailable
  const value = summaryFromQuest(state.quest)[field]
  return value === null ? admin.inheritedEmpty : admin.inherited(String(value))
}
