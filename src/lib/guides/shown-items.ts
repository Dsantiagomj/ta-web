// Pone al día la lista de Necesitarás de las guías rellenadas desde DofusDB antes de separar
// «Enséñale» de «Entrégale» (DESIGN.md, Necesitarás en total). Entonces cada «Enséñale» se
// sumaba: El forjador de leyenda enseña dos veces el Cocobur y su guía guardó 2. Solo cambia
// la lista que sigue igual que la rellenó DofusDB; la que Torre cambió se queda y se lista.
// Lo usa scripts/backfill-shown-items.ts (pnpm guides:shown-items).
import type { Payload } from 'payload'

import { addQuantity } from '../dofusdb/quantities'
import { questNeeds } from '../dofusdb/quest-needs'
import { showsItem } from '../dofusdb/quest-stages'
import type { QuantityByDofusId, RawQuest } from '../dofusdb/types'
import type { QuestGuide } from '../../payload-types'
import { neededItems } from './format'

/** Un objeto del catálogo de items, por su ID de DofusDB. */
export interface CatalogItem {
  id: number
  dofusId: number
  superTypeId?: number | null
  name?: string | null
}

/** Una fila de la lista de la guía: el ID del item en Payload y su cantidad. */
export interface ItemRow {
  item: number
  quantity: number
}

export type ShownItemsDecision =
  | { status: 'fix'; from: ItemRow[]; to: ItemRow[] }
  /** La lista no es la que rellenaba DofusDB: la cambió Torre, o está vacía. No se toca. */
  | { status: 'different' }
  /** Ya está al día, o la misión da lo mismo antes y ahora. */
  | { status: 'current' }

const BRING_ITEM = 'QuestObjectiveBringItemToNpcData'

/**
 * Los objetos que daba questNeeds hasta 2026-11-15: need.items y, por encima, la suma de
 * cada objetivo de esa clase, enseñar incluido. Sirve para reconocer lo que se rellenó así.
 */
export function legacyQuestItems(raw: RawQuest): QuantityByDofusId[] {
  const delivered: QuantityByDofusId[] = []
  for (const objective of (raw.steps ?? []).flatMap((step) => step.objectives ?? [])) {
    if (objective.className !== BRING_ITEM) continue
    const item = objective.parameters?.parameter1 ?? null
    if (item !== null) addQuantity(delivered, item, objective.parameters?.parameter2 ?? 1)
  }
  const items: QuantityByDofusId[] = []
  const quantities = raw.need?.quantities ?? []
  ;(raw.need?.items ?? []).forEach((dofusId, index) =>
    addQuantity(items, dofusId, quantities[index] ?? 1),
  )
  for (const { dofusId, quantity } of delivered) {
    const existing = items.find((entry) => entry.dofusId === dofusId)
    if (existing) existing.quantity = Math.max(existing.quantity, quantity)
    else items.push({ dofusId, quantity })
  }
  return items
}

/** Las filas que el rellenado de la guía guarda para esos objetos (summaryToFill). */
function autofillRows(items: QuantityByDofusId[], catalog: Map<number, CatalogItem>): ItemRow[] {
  const linked = items.flatMap(({ dofusId, quantity }) => {
    const item = catalog.get(dofusId)
    return item ? [{ item, quantity }] : []
  })
  return neededItems({ items: linked }).map(({ item, quantity }) => ({ item: item.id, quantity }))
}

// La lista como conjunto de objeto y cantidad, como summaryNote: el orden no importa.
const rowsKey = (rows: ItemRow[]) =>
  rows
    .map(({ item, quantity }) => `${item}x${quantity}`)
    .sort()
    .join(',')

/** Si la misión enseña algo y su lista de antes y la de ahora no coinciden. */
export function shownItemsChanged(raw: RawQuest): boolean {
  const shows = (raw.steps ?? []).some((step) =>
    (step.objectives ?? []).some((objective) => objective && showsItem(objective)),
  )
  if (!shows) return false
  const key = (items: QuantityByDofusId[]) =>
    items
      .map(({ dofusId, quantity }) => `${dofusId}x${quantity}`)
      .sort()
      .join(',')
  return key(legacyQuestItems(raw)) !== key(questNeeds(raw).items)
}

/** Qué hacer con la lista guardada de una guía de esa misión. */
export function shownItemsDecision(
  stored: ItemRow[],
  raw: RawQuest,
  catalog: Map<number, CatalogItem>,
): ShownItemsDecision {
  const before = autofillRows(legacyQuestItems(raw), catalog)
  const now = autofillRows(questNeeds(raw).items, catalog)
  const key = rowsKey(stored)
  if (rowsKey(before) === rowsKey(now) || key === rowsKey(now)) return { status: 'current' }
  if (key !== rowsKey(before)) return { status: 'different' }
  return { status: 'fix', from: stored, to: now }
}

/** Una fila para leerla: el nombre del objeto y su cantidad. */
export type NamedRow = [name: string, quantity: number]

export interface BackfillShownItemsResult {
  /** Misiones cuya lista cambia y guías suyas leídas. */
  quests: number
  guides: number
  fixes: { slug: string; status: 'published' | 'draft'; from: NamedRow[]; to: NamedRow[] }[]
  different: { slug: string; stored: NamedRow[] }[]
  /** Guías guardadas: publicadas (lo último era lo publicado) y borradores. */
  published: number
  drafts: number
}

export interface BackfillShownItemsOptions {
  /** Sin apply solo lista: no escribe nada. */
  apply: boolean
  /** Las misiones de DofusDB, tal cual las da su API. */
  quests: RawQuest[]
  log?: (message: string) => void
}

const relationId = (item: ItemRow['item'] | { id: number } | null | undefined) =>
  typeof item === 'object' ? (item?.id ?? null) : item

/**
 * Recorre las guías de las misiones afectadas por su última versión, como
 * backfillFightLists: si lo último es lo publicado, guarda publicado; si es un borrador,
 * guarda el borrador y lo publicado sigue igual hasta que Torre lo publique.
 */
export async function backfillShownItems(
  payload: Payload,
  options: BackfillShownItemsOptions,
): Promise<BackfillShownItemsResult> {
  const log = options.log ?? (() => {})
  const result: BackfillShownItemsResult = {
    quests: 0,
    guides: 0,
    fixes: [],
    different: [],
    published: 0,
    drafts: 0,
  }
  const affected = new Map(
    options.quests.filter(shownItemsChanged).map((quest) => [quest.id, quest]),
  )
  result.quests = affected.size
  if (affected.size === 0) return result

  const questDocs = await payload.find({
    collection: 'quests',
    where: { dofusId: { in: [...affected.keys()] } },
    pagination: false,
    depth: 0,
    select: { dofusId: true },
    overrideAccess: true,
  })
  const rawByQuestId = new Map(questDocs.docs.map((doc) => [doc.id, affected.get(doc.dofusId)!]))
  if (rawByQuestId.size === 0) return result

  const itemIds = new Set<number>()
  for (const raw of rawByQuestId.values()) {
    for (const { dofusId } of [...legacyQuestItems(raw), ...questNeeds(raw).items]) {
      itemIds.add(dofusId)
    }
  }
  const items = await payload.find({
    collection: 'items',
    where: { dofusId: { in: [...itemIds] } },
    pagination: false,
    depth: 0,
    select: { dofusId: true, superTypeId: true, name: true },
    overrideAccess: true,
  })
  const catalog = new Map(items.docs.map((item) => [item.dofusId, item as CatalogItem]))
  const nameById = new Map(items.docs.map((item) => [item.id, item.name ?? `#${item.id}`]))
  const named = (rows: ItemRow[]): NamedRow[] =>
    rows.map(({ item, quantity }) => [nameById.get(item) ?? `#${item}`, quantity])

  const guides = await payload.find({
    collection: 'quest-guides',
    where: { quest: { in: [...rawByQuestId.keys()] } },
    pagination: false,
    depth: 0,
    draft: true,
    sort: 'slug',
    overrideAccess: true,
  })
  for (const guide of guides.docs) {
    const raw = rawByQuestId.get(relationId(guide.quest as number | { id: number }) ?? -1)
    if (!raw) continue
    result.guides += 1
    const stored = (guide.summary?.needs?.items ?? []).flatMap(({ item, quantity }) => {
      const id = relationId(item)
      return id == null || quantity == null ? [] : [{ item: id, quantity }]
    })
    const decision = shownItemsDecision(stored, raw, catalog)
    if (decision.status === 'different') {
      result.different.push({ slug: guide.slug, stored: named(stored) })
      log(`Guía ${guide.slug}: la lista no es la de DofusDB, se deja como está`)
      continue
    }
    if (decision.status === 'current') continue

    const published = guide._status === 'published'
    const status = published ? 'published' : 'draft'
    result.fixes.push({
      slug: guide.slug,
      status,
      from: named(decision.from),
      to: named(decision.to),
    })
    const change = `${named(decision.from)
      .map(([name, quantity]) => `${quantity} × ${name}`)
      .join(', ')} → ${named(decision.to)
      .map(([name, quantity]) => `${quantity} × ${name}`)
      .join(', ')}`
    if (!options.apply) {
      log(`Guía ${guide.slug}${published ? '' : ' (borrador)'}: ${change}`)
      continue
    }
    const summary = guide.summary ?? {}
    await payload.update({
      collection: 'quest-guides',
      id: guide.id,
      data: {
        summary: { ...summary, needs: { ...summary.needs, items: decision.to } },
        _status: status,
      } as Partial<QuestGuide>,
      draft: !published,
      depth: 0,
      overrideAccess: true,
    })
    if (published) result.published += 1
    else result.drafts += 1
    log(`Guía ${guide.slug}${published ? '' : ' (borrador)'}: ${change}`)
  }
  return result
}
