// Resumen de una guía sacado de su misión de DofusDB.
// Código puro, sin Payload: lo usan el servidor y los componentes del panel.

import {
  formatThousands,
  itemsText,
  neededItems,
  prerequisitesText,
  rewardedItems,
  rewardsText,
  type NeededItem,
} from './format'
import type { Correction } from '../game-data/correction'
import type { Media } from '../../payload-types'
import { guideStrings } from './strings'

/** Una relación de Payload: el ID sin poblar o el documento poblado. */
type Relation<T> = number | T

export interface NamedDoc {
  name?: string | null
}

export interface LinkedItem extends NamedDoc {
  id?: number
  /** Su ID en DofusDB, para cruzarlo con los objetivos de las misiones. */
  dofusId?: number | null
  superTypeId?: number | null
  /** El icono importado de DofusDB (Media), si ya está. */
  image?: number | Media | null
  /** Lo que Torre corrigió de este objeto (src/lib/game-data/correction.ts). */
  correction?: Correction | null
}

export interface LinkedRewards {
  experience?: number | null
  /** La XP de un personaje en el nivel óptimo: el principio del rango. */
  experienceMin?: number | null
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
  rewardExperience: number | null
  rewardExperienceMin: number | null
  rewardKamas: number | null
  /** Los objetos de recompensa en el orden de Torre. */
  rewardItems: NeededItem[]
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
    // Un 0 de DofusDB es que no da nada: no hay cifra que copiar.
    rewardExperience: quest?.rewards?.experience || null,
    rewardExperienceMin: quest?.rewards?.experienceMin || null,
    rewardKamas: quest?.rewards?.kamas || null,
    rewardItems: rewardedItems(quest?.rewards),
    startNpc: start?.npcName || null,
    startX: start?.x ?? null,
    startY: start?.y ?? null,
  }
}

/**
 * Los campos del resumen que se rellenan con DofusDB si están vacíos: texto o cifras. La XP
 * mínima no está: va con la XP (summaryToFill).
 */
export type FillableField =
  | 'prerequisites'
  | 'rewards'
  | 'rewardExperience'
  | 'rewardKamas'
  | 'startNpc'
  | 'startX'
  | 'startY'

export const FILLABLE_FIELDS: FillableField[] = [
  'prerequisites',
  'rewards',
  'rewardExperience',
  'rewardKamas',
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
  rewardExperienceMin?: number | null
  rewardItems?: NeedRow[] | null
  needs?: { items?: NeedRow[] | null } | null
}

/** Una fila de una lista rellenada: el ID del item en Payload y su cantidad. */
export interface FilledRow {
  item: number
  quantity: number
}

/** Lo que DofusDB rellena en el resumen. Las listas de objetos guardan IDs de items. */
export type SummaryFill = Partial<Pick<SummaryValues, FillableField | 'rewardExperienceMin'>> & {
  rewardItems?: FilledRow[]
  needs?: { items: FilledRow[] }
}

const filledRows = (rows: NeededItem[]): FilledRow[] =>
  rows.map(({ item, quantity }) => ({ item: item.id, quantity }))

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
  const fill: Partial<Record<FillableField | 'rewardExperienceMin', string | number>> = {}
  for (const field of FILLABLE_FIELDS) {
    const value = fromQuest[field]
    if (value !== null && isEmpty(current[field])) fill[field] = value
  }
  // El rango de DofusDB vale con su XP: no con otra cifra que escribió Torre.
  const experience = fill.rewardExperience ?? current.rewardExperience
  if (
    fromQuest.rewardExperienceMin !== null &&
    current.rewardExperienceMin == null &&
    experience === fromQuest.rewardExperience
  ) {
    fill.rewardExperienceMin = fromQuest.rewardExperienceMin
  }
  const needs = !current.needs?.items?.length && fromQuest.needs.length
  const rewardItems = !current.rewardItems?.length && fromQuest.rewardItems.length
  return {
    ...(fill as SummaryFill),
    ...(rewardItems && { rewardItems: filledRows(fromQuest.rewardItems) }),
    ...(needs && { needs: { items: filledRows(fromQuest.needs) } }),
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

/** Los campos que llevan nota en el panel: los rellenables y las listas de objetos. */
export type NotedField = FillableField | 'rewardExperienceMin' | 'rewardItems' | 'needs'

/** Las listas de objetos del resumen, que se comparan como conjunto. */
const LIST_FIELDS = new Set<NotedField>(['needs', 'rewardItems'])

/** Si la nota del campo compara filas de objetos. */
export const isListField = (field: NotedField) => LIST_FIELDS.has(field)

// Las cifras de recompensa se leen con los miles separados, como en la web.
const REWARD_NUMBERS = new Set<NotedField>([
  'rewardExperience',
  'rewardExperienceMin',
  'rewardKamas',
])

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
 * (y qué da DofusDB) o si está vacío (y qué copiaría el botón «Rellenar desde DofusDB»).
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

  if (field === 'needs' || field === 'rewardItems') {
    const rows = Array.isArray(current) ? current : []
    const given = fromQuest[field]
    const shown = itemsText(given)
    if (shown === null) return rows.length ? admin.dofusDbEmptyChanged : admin.dofusDbEmpty
    if (!rows.length) return admin.emptyCanFill(shown)
    return rowsKey(rows) === rowsKey(given) ? admin.fromDofusDb : admin.changed(shown)
  }

  const value = Array.isArray(current) ? null : current
  const given = fromQuest[field]
  if (given === null) return isEmpty(value) ? admin.dofusDbEmpty : admin.dofusDbEmptyChanged
  const shown =
    typeof given === 'number' && REWARD_NUMBERS.has(field) ? formatThousands(given) : String(given)
  if (isEmpty(value)) return admin.emptyCanFill(shown)
  return sameValue(value, given) ? admin.fromDofusDb : admin.changed(shown)
}
