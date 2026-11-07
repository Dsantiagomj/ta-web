// Lo que DofusDB da para cada campo de una página de logro o de un metalogro, el relleno
// de los vacíos y la nota del panel. Como las guías con su misión (src/lib/guides/summary.ts):
// Torre puede cambiarlo todo; lo vacío se rellena al guardar y lo escrito no se toca nunca.
// Código puro, sin Payload: lo usan los hooks, el endpoint y el panel.

import { guideStrings } from '../guides/strings'
import { achievementStrings, type GroupSection } from './strings'

/** Un documento enlazado, con el nombre que enseña la nota. */
export interface Ref {
  id: number
  name: string
}

/** Un documento de una relación con varias colecciones (el representante: PNJ o monstruo). */
export interface PolyRef extends Ref {
  relationTo: 'npcs' | 'monsters'
}

/** Lo que DofusDB da para una página de logro, desde su logro del juego. */
export interface AchievementValues {
  name: string | null
  /** El metalogro de la categoría del logro. */
  group: Ref | null
  order: number | null
  points: number | null
  experience: number | null
  kamas: number | null
  items: { item: Ref; quantity: number }[]
  /** Una fila por misión; varias en una fila son alternativas. */
  quests: { name: string | null; quests: Ref[] }[]
}

/** Lo que DofusDB da para un metalogro, desde su categoría. */
export interface GroupValues {
  name: string | null
  order: number | null
  section: GroupSection | null
  /** Quien da la primera misión del primer logro de la categoría: un PNJ. */
  representative: PolyRef | null
}

export type ValuesSource = 'achievement' | 'group'
type Values<S extends ValuesSource> = S extends 'achievement' ? AchievementValues : GroupValues
export type ValueField<S extends ValuesSource> = keyof Values<S> & string

/** La categoría raíz de los eventos en DofusDB; sus zonas son de temporada. */
const EVENTS_CATEGORY = 9
// En Misiones, el juego pone primero las historias (Misiones de mundo… Dimensiones divinas,
// orden 0 a 10) y luego las zonas, desde Archipiélago de las escamas (11).
const LAST_STORY_ORDER = 10

/** La parte del índice de una categoría de DofusDB. Torre puede cambiarla. */
export function groupSection(category: {
  order?: number | null
  parentDofusId?: number | null
}): GroupSection {
  if (category.parentDofusId === EVENTS_CATEGORY) return 'seasonal'
  return (category.order ?? 0) <= LAST_STORY_ORDER ? 'stories' : 'zones'
}

type Relation = number | { id: number } | null | undefined
const relationId = (value: unknown): number | null =>
  typeof value === 'number'
    ? value
    : value && typeof value === 'object' && 'id' in value && typeof value.id === 'number'
      ? value.id
      : null

/** Un campo vacío: sin valor, texto en blanco o lista sin filas. El 0 es un valor. */
function isEmpty(value: unknown): boolean {
  if (value == null) return true
  if (typeof value === 'string') return !value.trim()
  if (Array.isArray(value)) return value.length === 0
  return false
}

/** Un valor de DofusDB en la forma en que se guarda en el documento (IDs, no nombres). */
function stored(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((row: Record<string, unknown>) =>
      'item' in row
        ? { item: (row.item as Ref).id, quantity: row.quantity }
        : { name: row.name, quests: (row.quests as Ref[]).map((quest) => quest.id) },
    )
  }
  if (value && typeof value === 'object' && 'relationTo' in value) {
    const { relationTo, id } = value as PolyRef
    return { relationTo, value: id }
  }
  if (value && typeof value === 'object' && 'id' in value) return (value as Ref).id
  return value
}

/**
 * Los campos vacíos que DofusDB puede rellenar, con su valor tal como se guardan. Nunca
 * incluye uno escrito, ni uno para el que DofusDB no da nada.
 */
export function fillFromValues<S extends ValuesSource>(
  _source: S,
  values: Values<S>,
  current: Partial<Record<ValueField<S>, unknown>>,
): Partial<Record<ValueField<S>, unknown>> {
  const fill: Partial<Record<string, unknown>> = {}
  for (const [field, value] of Object.entries(values)) {
    if (isEmpty(value) || !isEmpty(current[field as ValueField<S>])) continue
    fill[field] = stored(value)
  }
  return fill as Partial<Record<ValueField<S>, unknown>>
}

/** Los valores de DofusDB tal como los ve el panel mientras Torre edita. */
export type ValuesState<S extends ValuesSource> =
  | { status: 'none' }
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; values: Values<S> }

function questsText(rows: AchievementValues['quests']): string {
  return rows
    .map((row) =>
      row.quests.length > 1
        ? achievementStrings.admin.alternatives(row.name ?? '', row.quests.length)
        : (row.quests[0]?.name ?? row.name ?? ''),
    )
    .join(' → ')
}

/** El valor de DofusDB como lo lee Torre en la nota. */
function shown(field: string, value: unknown): string {
  if (field === 'section') return achievementStrings.sections[value as GroupSection]
  if (field === 'quests') return questsText(value as AchievementValues['quests'])
  if (field === 'items') {
    return (value as AchievementValues['items'])
      .map(({ item, quantity }) => guideStrings.summary.quantity(quantity, item.name))
      .join(', ')
  }
  if (value && typeof value === 'object' && 'name' in value) return (value as Ref).name
  return String(value)
}

/** Una clave estable para comparar el valor del formulario con el de DofusDB. */
function key(field: string, value: unknown): string {
  if (field === 'items') {
    // Los objetos se comparan como conjunto: el orden no importa.
    return (value as { item: Relation; quantity: unknown }[])
      .map(({ item, quantity }) => `${relationId(item)}x${quantity}`)
      .sort()
      .join(',')
  }
  if (field === 'quests') {
    // Las misiones, en orden; las alternativas de una fila, como conjunto.
    return (value as { quests?: Relation[] | null }[])
      .map((row) => (row.quests ?? []).map(relationId).sort().join('|'))
      .join(',')
  }
  if (value && typeof value === 'object' && 'relationTo' in value) {
    // Una relación con varias colecciones: { relationTo, value }.
    const { relationTo, value: inner } = value as { relationTo: string; value: unknown }
    return `${relationTo}:${relationId(inner)}`
  }
  const id = relationId(value)
  if (id !== null) return String(id)
  return typeof value === 'string' ? value.trim() : String(value)
}

/**
 * La nota bajo un campo: si su valor es el de DofusDB, si Torre lo cambió (y qué da
 * DofusDB) o si está vacío y se rellenará al guardar. Los textos son los de las guías.
 */
export function dofusDbNote<S extends ValuesSource>(
  source: S,
  state: ValuesState<S>,
  field: ValueField<S>,
  current: unknown,
): string {
  const { admin } = guideStrings
  if (state.status === 'none') {
    return source === 'achievement'
      ? achievementStrings.admin.noAchievement
      : achievementStrings.admin.noCategory
  }
  if (state.status === 'loading') return admin.dofusDbLoading
  if (state.status === 'error') return admin.dofusDbUnavailable

  const given = state.values[field] as unknown
  if (isEmpty(given)) return isEmpty(current) ? admin.dofusDbEmpty : admin.dofusDbEmptyChanged
  const text = shown(field, given)
  if (isEmpty(current)) return admin.emptyWillFill(text)
  return key(field, current) === key(field, stored(given)) ? admin.fromDofusDb : admin.changed(text)
}
