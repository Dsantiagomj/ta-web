import { isDeepStrictEqual } from 'node:util'
import type { Payload } from 'payload'

import type { Item, Monster, Quest } from '../../payload-types'
import type { QuestData } from './fetch-quest-data'
import { mapItem, mapMonster } from './map-items-monsters'
import { indexLookups, mapQuest } from './map-quest'
import type { MappedItem, MappedMonster, MappedQuest, QuantityByDofusId } from './types'

export interface UpsertCounts {
  created: number
  updated: number
  unchanged: number
}

export interface RefreshQuestsCounts {
  quests: UpsertCounts
  items: UpsertCounts
  monsters: UpsertCounts
  /** Referencias a prerrequisitos que no existen en la colección; se omiten. */
  missingPrerequisites: number
  /** Referencias a objetos y monstruos que DofusDB no devolvió ni están guardados; se omiten. */
  missingItems: number
  missingMonsters: number
}

export interface RefreshQuestsOptions {
  now?: Date
  log?: (message: string) => void
}

type Status = keyof UpsertCounts

function countStatuses(statuses: Iterable<Status>): UpsertCounts {
  const counts = { created: 0, updated: 0, unchanged: 0 }
  for (const status of statuses) counts[status] += 1
  return counts
}

function relationId(value: number | { id: number }): number
function relationId(value: number | { id: number } | null | undefined): number | null
function relationId(value: number | { id: number } | null | undefined): number | null {
  // Una fila cuyo objeto se borró a mano queda en null; cuenta como un cambio.
  if (value == null) return null
  return typeof value === 'number' ? value : value.id
}

// Lo que el script escribe en un objeto o un monstruo, salvo la fecha de refresco.
function storedItem(doc: Item) {
  return {
    dofusId: doc.dofusId,
    name: doc.name,
    level: doc.level ?? null,
    typeId: doc.typeId ?? null,
    iconId: doc.iconId ?? null,
  }
}

function storedMonster(doc: Monster) {
  return { dofusId: doc.dofusId, name: doc.name, iconId: doc.iconId ?? null }
}

/**
 * Crea o actualiza las filas de items o monsters por su ID de DofusDB, solo si cambian.
 * Devuelve el ID de Payload de cada ID de DofusDB guardado, también de las filas de
 * pasadas anteriores que DofusDB ya no devuelve: nada se borra.
 */
async function refreshCatalog<
  T extends { dofusId: number },
  D extends { id: number; dofusId: number },
>(
  payload: Payload,
  collection: 'items' | 'monsters',
  rows: T[],
  stored: (doc: D) => T,
  refreshedAt: string,
): Promise<{ counts: UpsertCounts; ids: Map<number, number> }> {
  const existing = await payload.find({
    collection,
    pagination: false,
    depth: 0,
    overrideAccess: true,
  })
  const byDofusId = new Map(existing.docs.map((doc) => [doc.dofusId, doc as unknown as D]))
  // Por si DofusDB repite una fila: cuenta una vez.
  const unique = new Map(rows.map((row) => [row.dofusId, row]))
  const statuses: Status[] = []

  for (const row of unique.values()) {
    const doc = byDofusId.get(row.dofusId)
    // Payload no estrecha el tipo de data con una unión de colecciones; las filas ya
    // tienen la forma de la colección que toca.
    const data = { ...row, refreshedAt } as never
    if (!doc) {
      const created = await payload.create({ collection, data, depth: 0, overrideAccess: true })
      byDofusId.set(row.dofusId, created as unknown as D)
      statuses.push('created')
    } else if (!isDeepStrictEqual(stored(doc), row)) {
      await payload.update({ collection, id: doc.id, data, depth: 0, overrideAccess: true })
      statuses.push('updated')
    } else {
      statuses.push('unchanged')
    }
  }

  const ids = new Map([...byDofusId].map(([dofusId, doc]) => [dofusId, doc.id]))
  return { counts: countStatuses(statuses), ids }
}

// Lo que el script escribe en una misión, salvo prerrequisitos y fecha de refresco.
function storedFields(doc: Quest) {
  const rows = <K extends 'item' | 'monster'>(
    list: ({ quantity: number } & Record<K, number | { id: number } | null>)[] | null | undefined,
    key: K,
  ) => (list ?? []).map((row) => ({ [key]: relationId(row[key]), quantity: row.quantity }))
  return {
    dofusId: doc.dofusId,
    name: doc.name,
    levelMin: doc.levelMin ?? null,
    levelMax: doc.levelMax ?? null,
    categoryId: doc.categoryId ?? null,
    startCriterion: doc.startCriterion ?? null,
    startPositions: (doc.startPositions ?? []).map((position) => ({
      npcId: position.npcId ?? null,
      npcName: position.npcName ?? null,
      mapId: position.mapId ?? null,
      x: position.x ?? null,
      y: position.y ?? null,
    })),
    rewards: {
      experience: doc.rewards?.experience ?? null,
      kamas: doc.rewards?.kamas ?? null,
      items: rows(doc.rewards?.items, 'item'),
      emoteIds: doc.rewards?.emoteIds ?? [],
      spellIds: doc.rewards?.spellIds ?? [],
      titleIds: doc.rewards?.titleIds ?? [],
      jobIds: doc.rewards?.jobIds ?? [],
    },
    needs: {
      items: rows(doc.needs?.items, 'item'),
      monsters: rows(doc.needs?.monsters, 'monster'),
      walksMaps: doc.needs?.walksMaps ?? false,
    },
  }
}

function prerequisiteIds(doc: Quest): number[] {
  return (doc.prerequisites ?? []).map((prerequisite) => relationId(prerequisite))
}

/** Cambia los IDs de DofusDB por los de Payload; los que no están se omiten y se cuentan. */
function linkRows<K extends 'item' | 'monster'>(
  list: QuantityByDofusId[],
  key: K,
  ids: Map<number, number>,
  missing: { count: number },
) {
  return list.flatMap(({ dofusId, quantity }) => {
    const id = ids.get(dofusId)
    if (id === undefined) {
      missing.count += 1
      return []
    }
    return [{ [key]: id, quantity } as Record<K, number> & { quantity: number }]
  })
}

/**
 * Crea o actualiza objetos, monstruos y misiones por su ID de DofusDB. Es el único que
 * escribe en esas colecciones, por eso usa overrideAccess. Primero objetos y monstruos,
 * porque las recompensas y requisitos de las misiones apuntan a sus IDs de Payload; luego
 * las misiones, y al final los prerrequisitos, que necesitan los IDs de todas. Solo escribe
 * lo que cambia, así que repetirlo con los mismos datos no toca nada.
 */
export async function refreshQuests(
  payload: Payload,
  data: QuestData,
  options: RefreshQuestsOptions = {},
): Promise<RefreshQuestsCounts> {
  const refreshedAt = (options.now ?? new Date()).toISOString()
  const log = options.log ?? (() => {})
  const lookups = indexLookups(data.npcs, data.mapPositions)

  const items = await refreshCatalog<MappedItem, Item>(
    payload,
    'items',
    data.items.map(mapItem),
    storedItem,
    refreshedAt,
  )
  log(`Objetos guardados: ${items.ids.size}`)
  const monsters = await refreshCatalog<MappedMonster, Monster>(
    payload,
    'monsters',
    data.monsters.map(mapMonster),
    storedMonster,
    refreshedAt,
  )
  log(`Monstruos guardados: ${monsters.ids.size}`)

  // Por si DofusDB repite una misión entre páginas: cuenta una vez.
  const quests = new Map<number, MappedQuest>()
  for (const raw of data.quests) quests.set(raw.id, mapQuest(raw, lookups))

  const existing = await payload.find({
    collection: 'quests',
    pagination: false,
    depth: 0,
    overrideAccess: true,
  })
  const byDofusId = new Map(existing.docs.map((doc) => [doc.dofusId, doc]))
  const status = new Map<number, Status>()
  const missingItems = { count: 0 }
  const missingMonsters = { count: 0 }

  let done = 0
  for (const quest of quests.values()) {
    const { prerequisiteDofusIds: _prerequisites, rewards, needs, ...rest } = quest
    const fields = {
      ...rest,
      rewards: { ...rewards, items: linkRows(rewards.items, 'item', items.ids, missingItems) },
      needs: {
        items: linkRows(needs.items, 'item', items.ids, missingItems),
        monsters: linkRows(needs.monsters, 'monster', monsters.ids, missingMonsters),
        walksMaps: needs.walksMaps,
      },
    }
    const doc = byDofusId.get(quest.dofusId)
    if (!doc) {
      const created = await payload.create({
        collection: 'quests',
        data: { ...fields, refreshedAt },
        depth: 0,
        overrideAccess: true,
      })
      byDofusId.set(quest.dofusId, created)
      status.set(quest.dofusId, 'created')
    } else if (!isDeepStrictEqual(storedFields(doc), fields)) {
      const updated = await payload.update({
        collection: 'quests',
        id: doc.id,
        data: { ...fields, refreshedAt },
        depth: 0,
        overrideAccess: true,
      })
      byDofusId.set(quest.dofusId, updated)
      status.set(quest.dofusId, 'updated')
    } else {
      status.set(quest.dofusId, 'unchanged')
    }
    done += 1
    if (done % 250 === 0) log(`Misiones guardadas: ${done} de ${quests.size}`)
  }

  let missingPrerequisites = 0
  for (const quest of quests.values()) {
    const ids: number[] = []
    for (const dofusId of quest.prerequisiteDofusIds) {
      const target = byDofusId.get(dofusId)
      if (target) ids.push(target.id)
      else missingPrerequisites += 1
    }
    const doc = byDofusId.get(quest.dofusId)!
    if (isDeepStrictEqual(prerequisiteIds(doc), ids)) continue

    await payload.update({
      collection: 'quests',
      id: doc.id,
      data: { prerequisites: ids, refreshedAt },
      depth: 0,
      overrideAccess: true,
    })
    if (status.get(quest.dofusId) === 'unchanged') status.set(quest.dofusId, 'updated')
  }

  return {
    quests: countStatuses(status.values()),
    items: items.counts,
    monsters: monsters.counts,
    missingPrerequisites,
    missingItems: missingItems.count,
    missingMonsters: missingMonsters.count,
  }
}
