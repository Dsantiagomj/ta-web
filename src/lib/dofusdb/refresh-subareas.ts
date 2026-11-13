import type { Payload } from 'payload'

import type { Subarea } from '../../payload-types'
import { spanish } from './map-quest'
import { DEFAULT_WRITE_CONCURRENCY, refreshCatalog, type UpsertCounts } from './refresh-quests'
import type { RawArea, RawSubArea } from './types'

export interface RefreshSubAreasOptions {
  now?: Date
  /** Escrituras a la vez; por defecto DEFAULT_WRITE_CONCURRENCY. */
  concurrency?: number
  log?: (message: string) => void
}

interface MappedSubArea {
  dofusId: number
  name: string
  areaDofusId: number | null
  areaName: string | null
}

/** Lo que el script escribe en una subzona, salvo la fecha de refresco. */
function stored(doc: Subarea): MappedSubArea {
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
  const areas = new Map(data.areas.map((area) => [area.id, spanish(area.name) ?? null]))
  const rows = data.subAreas.map((raw): MappedSubArea => ({
    dofusId: raw.id,
    name: spanish(raw.name) ?? `Subzona ${raw.id}`,
    areaDofusId: raw.areaId ?? null,
    areaName: raw.areaId == null ? null : (areas.get(raw.areaId) ?? null),
  }))
  const { counts } = await refreshCatalog<MappedSubArea, Subarea>(
    payload,
    'subareas',
    rows,
    stored,
    (options.now ?? new Date()).toISOString(),
    options.concurrency ?? DEFAULT_WRITE_CONCURRENCY,
    options.log ?? (() => {}),
  )
  return counts
}
