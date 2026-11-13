// Las mazmorras de DofusDB con sus jefes, en la colección dungeons: «Necesitarás en total»
// pinta el jefe de la mazmorra que nombra una nota (src/lib/achievements/dungeons.ts).
import { isDeepStrictEqual } from 'node:util'
import type { Payload } from 'payload'

import type { Dungeon } from '../../payload-types'
import { mapWithConcurrency } from '../concurrency'
import { spanish } from './localized'
import type { UpsertCounts } from './refresh-quests'
import type { RawDungeon } from './types'

export interface RefreshDungeonsCounts extends UpsertCounts {
  /** Jefes que no están en monsters: se omiten. */
  missingBosses: number
}

export interface RefreshDungeonsOptions {
  now?: Date
  concurrency?: number
}

const relationId = (value: number | { id: number }) =>
  typeof value === 'number' ? value : value.id

/**
 * Crea o actualiza las mazmorras por su ID de DofusDB, solo si cambian, con sus jefes
 * enlazados a los monstruos ya guardados (corre después de refreshQuests, que guarda todo
 * el catálogo de monstruos). Nada se borra.
 */
export async function refreshDungeons(
  payload: Payload,
  rows: RawDungeon[],
  options: RefreshDungeonsOptions = {},
): Promise<RefreshDungeonsCounts> {
  const refreshedAt = (options.now ?? new Date()).toISOString()
  const unique = new Map(rows.map((row) => [row.id, row]))
  const bossIds = [...new Set([...unique.values()].flatMap((row) => row.bosses ?? []))]
  const monsters = bossIds.length
    ? (
        await payload.find({
          collection: 'monsters',
          where: { dofusId: { in: bossIds } },
          select: { dofusId: true },
          pagination: false,
          depth: 0,
          overrideAccess: true,
        })
      ).docs
    : []
  const monsterIds = new Map(monsters.map((doc) => [doc.dofusId, doc.id]))
  const existing = await payload.find({
    collection: 'dungeons',
    pagination: false,
    depth: 0,
    overrideAccess: true,
  })
  const byDofusId = new Map(existing.docs.map((doc) => [doc.dofusId, doc]))

  let missingBosses = 0
  const statuses = await mapWithConcurrency(
    [...unique.values()],
    options.concurrency ?? 8,
    async (row): Promise<keyof UpsertCounts> => {
      const bosses: number[] = []
      for (const dofusId of row.bosses ?? []) {
        const id = monsterIds.get(dofusId)
        if (id === undefined) missingBosses += 1
        else bosses.push(id)
      }
      const fields = {
        dofusId: row.id,
        name: spanish(row.name) ?? `Mazmorra ${row.id}`,
        bosses,
      }
      const doc = byDofusId.get(row.id)
      if (!doc) {
        await payload.create({
          collection: 'dungeons',
          data: { ...fields, refreshedAt },
          depth: 0,
          overrideAccess: true,
        })
        return 'created'
      }
      if (isDeepStrictEqual(stored(doc), fields)) return 'unchanged'
      await payload.update({
        collection: 'dungeons',
        id: doc.id,
        data: { ...fields, refreshedAt },
        depth: 0,
        overrideAccess: true,
      })
      return 'updated'
    },
  )
  const counts = { created: 0, updated: 0, unchanged: 0, missingBosses }
  for (const status of statuses) counts[status] += 1
  return counts
}

// Lo que el script escribe en una mazmorra, salvo la fecha de refresco.
function stored(doc: Dungeon) {
  return {
    dofusId: doc.dofusId,
    name: doc.name,
    bosses: (doc.bosses ?? []).map(relationId),
  }
}
