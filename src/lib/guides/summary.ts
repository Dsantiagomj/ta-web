// Resumen de una guía sacado de su misión de DofusDB.
// Código puro, sin Payload: lo usan el servidor y los componentes del panel.

import { itemsText, neededItems, prerequisitesText, rewardsText, type NeededItem } from './format'
import type { Media } from '../../payload-types'
import { guideStrings } from './strings'

/** Una relación de Payload: el ID sin poblar o el documento poblado. */
type Relation<T> = number | T

export interface NamedDoc {
  name?: string | null
}

export interface LinkedItem extends NamedDoc {
  id?: number
  superTypeId?: number | null
  /** El icono importado de DofusDB (Media), si ya está. */
  image?: number | Media | null
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
  needs: NeededItem[]
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
    needs: neededItems(quest?.needs),
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

/** Una fila de la lista de Necesitarás, guardada o del formulario. */
export interface NeedRow {
  item: number | { id: number } | null | undefined
  quantity: number | null | undefined
}

/** Lo que hay en el resumen de la guía, tal como lo leen el hook, el panel y la importación. */
export type CurrentSummary = Partial<Record<FillableField, FillableValue>> & {
  needs?: { items?: NeedRow[] | null } | null
}

/** Lo que DofusDB rellena en el resumen. La lista de objetos guarda IDs de items. */
export type SummaryFill = Partial<Pick<SummaryValues, FillableField>> & {
  needs?: { items: { item: number; quantity: number }[] }
}

// El 0 es una coordenada válida; un texto con solo espacios cuenta como vacío.
function isEmpty(value: FillableValue): boolean {
  if (typeof value === 'number') return false
  return !value?.trim()
}

/**
 * Los campos vacíos del resumen que DofusDB puede rellenar, con su valor. Nunca incluye
 * uno escrito, ni uno para el que DofusDB no da nada. La lista de Necesitarás solo se
 * rellena si está vacía; sus notas, nunca.
 */
export function summaryToFill(
  current: CurrentSummary,
  quest: LinkedQuest | null | undefined,
): SummaryFill {
  if (!quest) return {}
  const fromQuest = summaryFromQuest(quest)
  const fill: Partial<Record<FillableField, string | number>> = {}
  for (const field of FILLABLE_FIELDS) {
    const value = fromQuest[field]
    if (value !== null && isEmpty(current[field])) fill[field] = value
  }
  const needs = !current.needs?.items?.length && fromQuest.needs.length
  return {
    ...(fill as SummaryFill),
    ...(needs && {
      needs: {
        items: fromQuest.needs.map(({ item, quantity }) => ({ item: item.id, quantity })),
      },
    }),
  }
}

/** El resumen con lo rellenado encima. Las notas de Necesitarás se conservan. */
export function applySummaryFill<T extends { needs?: object | null }>(
  summary: T,
  fill: SummaryFill,
): T {
  const { needs, ...fields } = fill
  return {
    ...summary,
    ...fields,
    ...(needs && { needs: { ...summary.needs, items: needs.items } }),
  }
}

/** La misión enlazada tal como la ve el panel mientras Torre edita. */
export type LinkedQuestState =
  | { status: 'none' }
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; quest: LinkedQuest }

/** Los campos que llevan nota en el panel: los rellenables y la lista de Necesitarás. */
export type NotedField = FillableField | 'needs'

function sameValue(a: FillableValue, b: string | number): boolean {
  return typeof a === 'string' && typeof b === 'string' ? a.trim() === b.trim() : a === b
}

// La lista se compara como conjunto de objeto y cantidad: el orden no importa.
function rowsKey(rows: { item: NeedRow['item']; quantity: NeedRow['quantity'] }[]): string {
  return rows
    .map(({ item, quantity }) => `${typeof item === 'object' ? item?.id : item}x${quantity}`)
    .sort()
    .join(',')
}

/** El valor del campo para la nota: texto o número, o las filas de la lista. */
export type NotedValue = FillableValue | NeedRow[]

/**
 * La nota bajo un campo del resumen: si su valor es el de DofusDB, si Torre lo cambió
 * (y qué da DofusDB) o si está vacío y se rellenará al guardar.
 */
export function summaryNote(
  state: LinkedQuestState,
  field: NotedField,
  current: NotedValue,
): string {
  const { admin } = guideStrings
  if (state.status === 'none') return admin.noQuest
  if (state.status === 'loading') return admin.dofusDbLoading
  if (state.status === 'error') return admin.dofusDbUnavailable
  const fromQuest = summaryFromQuest(state.quest)

  if (field === 'needs') {
    const rows = Array.isArray(current) ? current : []
    const shown = itemsText(fromQuest.needs)
    if (shown === null) return rows.length ? admin.dofusDbEmptyChanged : admin.dofusDbEmpty
    if (!rows.length) return admin.emptyWillFill(shown)
    return rowsKey(rows) === rowsKey(fromQuest.needs) ? admin.fromDofusDb : admin.changed(shown)
  }

  const value = Array.isArray(current) ? null : current
  const given = fromQuest[field]
  if (given === null) return isEmpty(value) ? admin.dofusDbEmpty : admin.dofusDbEmptyChanged
  const shown = String(given)
  if (isEmpty(value)) return admin.emptyWillFill(shown)
  return sameValue(value, given) ? admin.fromDofusDb : admin.changed(shown)
}
