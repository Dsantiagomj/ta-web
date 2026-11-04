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

/** Los campos del resumen que se rellenan con DofusDB: texto o coordenadas. */
export type FillableField = 'prerequisites' | 'rewards' | 'startNpc' | 'startX' | 'startY'

export const FILLABLE_FIELDS: FillableField[] = [
  'prerequisites',
  'rewards',
  'startNpc',
  'startX',
  'startY',
]

type FillableValue = string | number | null | undefined

// El 0 es una coordenada válida; un texto con solo espacios cuenta como vacío.
function isEmpty(value: FillableValue): boolean {
  if (typeof value === 'number') return false
  return !value?.trim()
}

/**
 * Los campos vacíos del resumen que DofusDB puede rellenar, con su valor. Nunca incluye
 * uno escrito, ni uno para el que DofusDB no da nada.
 */
export function summaryToFill(
  current: Partial<Record<FillableField, FillableValue>>,
  quest: LinkedQuest | null | undefined,
): Partial<Pick<SummaryValues, FillableField>> {
  if (!quest) return {}
  const fromQuest = summaryFromQuest(quest)
  const fill: Partial<Record<FillableField, string | number>> = {}
  for (const field of FILLABLE_FIELDS) {
    const value = fromQuest[field]
    if (value !== null && isEmpty(current[field])) fill[field] = value
  }
  return fill as Partial<Pick<SummaryValues, FillableField>>
}

/** La misión enlazada tal como la ve el panel mientras Torre edita. */
export type LinkedQuestState =
  | { status: 'none' }
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; quest: LinkedQuest }

function sameValue(a: FillableValue, b: string | number): boolean {
  return typeof a === 'string' && typeof b === 'string' ? a.trim() === b.trim() : a === b
}

/**
 * La nota bajo un campo del resumen: si su valor es el de DofusDB, si Torre lo cambió
 * (y qué da DofusDB) o si está vacío y se rellenará al guardar.
 */
export function summaryNote(
  state: LinkedQuestState,
  field: FillableField,
  current: FillableValue,
): string {
  const { admin } = guideStrings
  if (state.status === 'none') return admin.noQuest
  if (state.status === 'loading') return admin.dofusDbLoading
  if (state.status === 'error') return admin.dofusDbUnavailable
  const fromQuest = summaryFromQuest(state.quest)[field]
  if (fromQuest === null) return isEmpty(current) ? admin.dofusDbEmpty : admin.dofusDbEmptyChanged
  const shown = String(fromQuest)
  if (isEmpty(current)) return admin.emptyWillFill(shown)
  return sameValue(current, fromQuest) ? admin.fromDofusDb : admin.changed(shown)
}
