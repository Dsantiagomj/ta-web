import { isDeepStrictEqual } from 'node:util'
import type { Payload } from 'payload'

import type { Achievement, AchievementCategory } from '../../payload-types'
import { mapWithConcurrency } from '../concurrency'
import { type FetchImage, gameImageImporter, type ImportCounts } from './game-images'
import { countsForIndex, mapAchievement, mapAchievementCategory } from './map-achievement'
import { DEFAULT_WRITE_CONCURRENCY, type UpsertCounts } from './refresh-quests'
import type {
  MappedAchievement,
  MappedAchievementCategory,
  RawAchievement,
  RawAchievementCategory,
} from './types'

/**
 * Las categorías raíz de DofusDB cuyos logros tienen página: Misiones (8) y Eventos (9).
 * Son la estructura del juego, no una lista de Torre: un logro o una zona nuevos dentro de
 * ellas entran solos en el siguiente refresco.
 */
export const QUEST_ROOT_CATEGORIES = [8, 9]

export interface AchievementData {
  achievements: RawAchievement[]
  categories: RawAchievementCategory[]
}

export interface RefreshAchievementsOptions {
  now?: Date
  log?: (message: string) => void
  fetchImage?: FetchImage
  concurrency?: number
}

export interface RefreshAchievementsCounts {
  categories: UpsertCounts
  achievements: UpsertCounts
  icons: ImportCounts
  /** Misiones y objetos que DofusDB nombra y no están guardados; se omiten. */
  missingQuests: number
  missingItems: number
}

type Status = keyof UpsertCounts
type Relation = number | { id: number } | null | undefined

function countStatuses(statuses: Status[]): UpsertCounts {
  const counts = { created: 0, updated: 0, unchanged: 0 }
  for (const status of statuses) counts[status] += 1
  return counts
}

const id = (value: Relation): number | null =>
  value == null ? null : typeof value === 'number' ? value : value.id

/** Las categorías de logros de misiones: las raíz y todas las que cuelgan de ellas. */
function questCategoryIds(categories: MappedAchievementCategory[]): Set<number> {
  const parent = new Map(categories.map((category) => [category.dofusId, category.parentDofusId]))
  const inScope = (dofusId: number, seen = new Set<number>()): boolean => {
    if (QUEST_ROOT_CATEGORIES.includes(dofusId)) return true
    const next = parent.get(dofusId)
    if (next == null || seen.has(dofusId)) return false
    seen.add(dofusId)
    return inScope(next, seen)
  }
  return new Set(categories.filter((c) => inScope(c.dofusId)).map((c) => c.dofusId))
}

/** Un mapa de ID de DofusDB a ID de Payload de una colección del juego. */
async function payloadIds(
  payload: Payload,
  collection: 'quests' | 'items',
  dofusIds: number[],
): Promise<Map<number, number>> {
  if (dofusIds.length === 0) return new Map()
  const { docs } = await payload.find({
    collection,
    where: { dofusId: { in: [...new Set(dofusIds)] } },
    select: { dofusId: true },
    pagination: false,
    depth: 0,
    overrideAccess: true,
  })
  return new Map(docs.map((doc) => [doc.dofusId, doc.id]))
}

async function refreshCategories(
  payload: Payload,
  rows: MappedAchievementCategory[],
  refreshedAt: string,
): Promise<{ counts: UpsertCounts; ids: Map<number, number> }> {
  const existing = await payload.find({
    collection: 'achievement-categories',
    pagination: false,
    depth: 0,
    overrideAccess: true,
  })
  const byDofusId = new Map(existing.docs.map((doc) => [doc.dofusId, doc]))
  const ids = new Map(existing.docs.map((doc) => [doc.dofusId, doc.id]))
  const statuses = new Map<number, Status>()

  // Primero las filas; luego la categoría madre, que necesita el ID de Payload de todas.
  for (const { parentDofusId: _parent, ...row } of rows) {
    const doc = byDofusId.get(row.dofusId)
    const stored = doc && { dofusId: doc.dofusId, name: doc.name, order: doc.order ?? null }
    if (!doc) {
      const created = await payload.create({
        collection: 'achievement-categories',
        data: { ...row, refreshedAt },
        depth: 0,
        overrideAccess: true,
      })
      ids.set(row.dofusId, created.id)
      statuses.set(row.dofusId, 'created')
    } else if (!isDeepStrictEqual(stored, row)) {
      await payload.update({
        collection: 'achievement-categories',
        id: doc.id,
        data: { ...row, refreshedAt },
        depth: 0,
        overrideAccess: true,
      })
      statuses.set(row.dofusId, 'updated')
    } else statuses.set(row.dofusId, 'unchanged')
  }
  for (const row of rows) {
    const parent = row.parentDofusId == null ? null : (ids.get(row.parentDofusId) ?? null)
    const doc = byDofusId.get(row.dofusId) as AchievementCategory | undefined
    if (doc && id(doc.parent) === parent) continue
    if (!doc && parent === null) continue
    await payload.update({
      collection: 'achievement-categories',
      id: ids.get(row.dofusId)!,
      data: { parent, refreshedAt },
      depth: 0,
      overrideAccess: true,
    })
    if (statuses.get(row.dofusId) === 'unchanged') statuses.set(row.dofusId, 'updated')
  }
  return { counts: countStatuses([...statuses.values()]), ids }
}

// Lo que el refresco escribe en un logro, salvo la fecha, para saber si cambió.
function storedAchievement(doc: Achievement) {
  return {
    dofusId: doc.dofusId,
    name: doc.name,
    icon: id(doc.icon),
    points: doc.points ?? null,
    level: doc.level ?? null,
    order: doc.order ?? null,
    category: id(doc.category),
    quests: (doc.quests ?? []).map((row) => ({
      name: row.name ?? null,
      quests: (row.quests ?? []).map((quest) => id(quest)),
    })),
    rewards: {
      experience: doc.rewards?.experience ?? null,
      kamas: doc.rewards?.kamas ?? null,
      items: (doc.rewards?.items ?? []).map((row) => ({
        item: id(row.item),
        quantity: row.quantity,
      })),
    },
    countsFor: (doc.countsFor ?? []).map((meta) => ({
      dofusId: meta.dofusId ?? null,
      name: meta.name ?? null,
      points: meta.points ?? null,
      achievements: meta.achievements ?? null,
      icon: id(meta.icon),
    })),
  }
}

/**
 * Crea o actualiza las categorías de logros (todas) y los logros de las categorías de
 * misiones y eventos, por su ID de DofusDB, e importa sus iconos a Media una sola vez.
 * Va después del refresco de misiones: enlaza las misiones y los objetos ya guardados; los
 * que faltan se omiten y se cuentan. Solo escribe lo que cambia y nunca borra nada.
 */
export async function refreshAchievements(
  payload: Payload,
  data: AchievementData,
  options: RefreshAchievementsOptions = {},
): Promise<RefreshAchievementsCounts> {
  const refreshedAt = (options.now ?? new Date()).toISOString()
  const log = options.log ?? (() => {})
  const concurrency = options.concurrency ?? DEFAULT_WRITE_CONCURRENCY

  const categoryRows = data.categories.map(mapAchievementCategory)
  const categories = await refreshCategories(payload, categoryRows, refreshedAt)
  const inScope = questCategoryIds(categoryRows)

  const countsFor = countsForIndex(data.achievements)
  const mapped = new Map<number, MappedAchievement>()
  for (const raw of data.achievements) {
    if (raw.categoryId != null && inScope.has(raw.categoryId)) {
      mapped.set(raw.id, mapAchievement(raw, countsFor))
    }
  }
  const rows = [...mapped.values()]

  // Los iconos de los logros y de los que los piden, uno por archivo.
  const importer = gameImageImporter(payload, { fetchImage: options.fetchImage, log })
  const iconNames = new Map<number, string>()
  for (const row of rows) {
    if (row.iconId != null) iconNames.set(row.iconId, row.name)
    for (const meta of row.countsFor) {
      if (meta.iconId != null && !iconNames.has(meta.iconId)) iconNames.set(meta.iconId, meta.name)
    }
  }
  const icons = new Map<number, number | null>()
  await mapWithConcurrency([...iconNames], 4, async ([iconId, name]) => {
    icons.set(iconId, await importer.media('achievement', iconId, name))
  })
  const icon = (iconId: number | null) => (iconId == null ? null : (icons.get(iconId) ?? null))

  const quests = await payloadIds(
    payload,
    'quests',
    rows.flatMap((row) => row.quests.flatMap((quest) => quest.questDofusIds)),
  )
  const items = await payloadIds(
    payload,
    'items',
    rows.flatMap((row) => row.rewards.items.map((item) => item.dofusId)),
  )
  let missingQuests = 0
  let missingItems = 0

  const existing = await payload.find({
    collection: 'achievements',
    pagination: false,
    depth: 0,
    overrideAccess: true,
  })
  const byDofusId = new Map(existing.docs.map((doc) => [doc.dofusId, doc]))

  const statuses = await mapWithConcurrency(rows, concurrency, async (row): Promise<Status> => {
    const fields = {
      dofusId: row.dofusId,
      name: row.name,
      icon: icon(row.iconId),
      points: row.points,
      level: row.level,
      order: row.order,
      category:
        row.categoryDofusId == null ? null : (categories.ids.get(row.categoryDofusId) ?? null),
      quests: row.quests.map((quest) => ({
        name: quest.name,
        quests: quest.questDofusIds.flatMap((dofusId) => {
          const found = quests.get(dofusId)
          if (found === undefined) missingQuests += 1
          return found === undefined ? [] : [found]
        }),
      })),
      rewards: {
        experience: row.rewards.experience,
        kamas: row.rewards.kamas,
        items: row.rewards.items.flatMap(({ dofusId, quantity }) => {
          const found = items.get(dofusId)
          if (found === undefined) missingItems += 1
          return found === undefined ? [] : [{ item: found, quantity }]
        }),
      },
      countsFor: row.countsFor.map(({ iconId, ...meta }) => ({ ...meta, icon: icon(iconId) })),
    }
    const doc = byDofusId.get(row.dofusId)
    if (!doc) {
      await payload.create({
        collection: 'achievements',
        data: { ...fields, refreshedAt },
        depth: 0,
        overrideAccess: true,
      })
      return 'created'
    }
    if (isDeepStrictEqual(storedAchievement(doc), fields)) return 'unchanged'
    await payload.update({
      collection: 'achievements',
      id: doc.id,
      data: { ...fields, refreshedAt },
      depth: 0,
      overrideAccess: true,
    })
    return 'updated'
  })

  return {
    categories: categories.counts,
    achievements: countStatuses(statuses),
    icons: importer.counts,
    missingQuests,
    missingItems,
  }
}
