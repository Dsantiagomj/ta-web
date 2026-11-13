import { isDeepStrictEqual } from 'node:util'
import type { Payload } from 'payload'

import type { Subarea } from '../../payload-types'
import { mapWithConcurrency } from '../concurrency'
import { spanish } from './localized'
import type { UpsertCounts } from './refresh-quests'
import type { RawArea, RawSubArea } from './types'

export interface RefreshSubAreasOptions {
  now?: Date
  /** Escrituras a la vez; pocas subzonas (unas 570), así que basta con el valor por defecto. */
  concurrency?: number
}

const DEFAULT_CONCURRENCY = 8

/** Lo que el script escribe en una subzona, salvo la fecha de refresco. */
function stored(doc: Subarea) {
  return {
    dofusId: doc.dofusId,
    name: doc.name,
    areaDofusId: doc.areaDofusId ?? null,
    areaName: doc.areaName ?? null,
  }
}

/**
 * Crea o actualiza las subzonas por su ID de DofusDB, con el nombre de su área, solo si
 * cambian: repetirlo con los mismos datos no escribe nada. Nunca borra una subzona que
 * DofusDB deje de dar. Una subzona sin nombre en español se guarda con su ID.
 */
export async function refreshSubAreas(
  payload: Payload,
  data: { subAreas: RawSubArea[]; areas: RawArea[] },
  options: RefreshSubAreasOptions = {},
): Promise<UpsertCounts> {
  const refreshedAt = (options.now ?? new Date()).toISOString()
  const areas = new Map(data.areas.map((area) => [area.id, spanish(area.name) ?? null]))
  const existing = await payload.find({
    collection: 'subareas',
    pagination: false,
    depth: 0,
    overrideAccess: true,
  })
  const byDofusId = new Map(existing.docs.map((doc) => [doc.dofusId, doc]))
  const unique = new Map(data.subAreas.map((row) => [row.id, row]))

  const statuses = await mapWithConcurrency(
    [...unique.values()],
    options.concurrency ?? DEFAULT_CONCURRENCY,
    async (raw): Promise<keyof UpsertCounts> => {
      const row = {
        dofusId: raw.id,
        name: spanish(raw.name) ?? `Subzona ${raw.id}`,
        areaDofusId: raw.areaId ?? null,
        areaName: raw.areaId == null ? null : (areas.get(raw.areaId) ?? null),
      }
      const doc = byDofusId.get(raw.id)
      if (!doc) {
        await payload.create({
          collection: 'subareas',
          data: { ...row, refreshedAt },
          depth: 0,
          overrideAccess: true,
        })
        return 'created'
      }
      if (isDeepStrictEqual(stored(doc), row)) return 'unchanged'
      await payload.update({
        collection: 'subareas',
        id: doc.id,
        data: { ...row, refreshedAt },
        depth: 0,
        overrideAccess: true,
      })
      return 'updated'
    },
  )

  const counts: UpsertCounts = { created: 0, updated: 0, unchanged: 0 }
  for (const status of statuses) counts[status] += 1
  return counts
}
