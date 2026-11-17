// `pnpm zones:backgrounds` (scripts/zone-backgrounds.ts): las subzonas que usan las guías de
// misión y las páginas de logro publicadas y aún no tienen fondo, y, con apply, su fondo
// traído de DofusDB (fillZoneBackground). Una página con fondo propio no necesita el de su
// subzona. Solo escribe lo que falta: repetirlo no hace nada.
import type { Payload } from 'payload'

import { achievementZoneQuest, questSubAreaId, type ZoneQuest } from './background'
import { fillZoneBackground, type ZoneSource } from './fill'

export interface PendingZone {
  /** El ID de Payload de la subzona. */
  id: number
  dofusId: number
  name: string
  areaName: string | null
  /** Los slugs de las páginas publicadas que la usan. */
  pages: string[]
}

export interface ZoneBackfillResult {
  pending: PendingZone[]
  filled: (PendingZone & { mapId: number })[]
  /** Sin mapas en DofusDB, o DofusDB falló: el motivo. */
  failed: (PendingZone & { reason: string })[]
}

const populateQuest = { quests: { startPositions: true, stages: true } } as const

/** Los slugs de las páginas publicadas sin fondo propio, por la subzona que usan. */
async function pagesBySubArea(payload: Payload): Promise<Map<number, string[]>> {
  const bySubArea = new Map<number, string[]>()
  const add = (subAreaId: number | null, slug: string) => {
    if (subAreaId === null) return
    bySubArea.set(subAreaId, [...(bySubArea.get(subAreaId) ?? []), slug])
  }

  const guides = await payload.find({
    collection: 'quest-guides',
    where: { _status: { equals: 'published' } },
    select: { slug: true, quest: true, background: true },
    populate: populateQuest,
    sort: 'slug',
    draft: false,
    depth: 1,
    pagination: false,
    overrideAccess: true,
  })
  for (const guide of guides.docs) {
    if (guide.background) continue
    add(questSubAreaId(guide.quest as ZoneQuest | number | null), guide.slug)
  }

  const pages = await payload.find({
    collection: 'achievement-pages',
    where: { _status: { equals: 'published' }, state: { equals: 'published' } },
    // Sin select: con él, Payload no trae las relaciones de dentro del array.
    populate: populateQuest,
    sort: 'slug',
    draft: false,
    depth: 1,
    pagination: false,
    overrideAccess: true,
  })
  for (const page of pages.docs) {
    if (page.background) continue
    const rows = page.quests as { quests?: (ZoneQuest | number | null)[] | null }[] | null
    add(questSubAreaId(achievementZoneQuest(rows)), page.slug)
  }
  return bySubArea
}

/** Las subzonas que usa lo publicado y no tienen fondo, por su ID de DofusDB. */
export async function pendingZones(payload: Payload): Promise<PendingZone[]> {
  const pages = await pagesBySubArea(payload)
  if (pages.size === 0) return []
  const { docs } = await payload.find({
    collection: 'subareas',
    where: { dofusId: { in: [...pages.keys()] }, background: { exists: false } },
    select: { dofusId: true, name: true, areaName: true },
    sort: 'dofusId',
    depth: 0,
    pagination: false,
    overrideAccess: true,
  })
  return docs.map((doc) => ({
    id: doc.id,
    dofusId: doc.dofusId,
    name: doc.name,
    areaName: doc.areaName ?? null,
    pages: pages.get(doc.dofusId) ?? [],
  }))
}

/**
 * Lista las subzonas pendientes y, con apply, les trae el fondo una a una. Un fallo de una
 * no para las demás.
 */
export async function fillMissingZoneBackgrounds(
  payload: Payload,
  {
    apply,
    source,
    log = () => {},
  }: { apply: boolean; source?: ZoneSource; log?: (message: string) => void },
): Promise<ZoneBackfillResult> {
  const pending = await pendingZones(payload)
  const result: ZoneBackfillResult = { pending, filled: [], failed: [] }
  if (!apply) return result
  for (const zone of pending) {
    try {
      const filled = await fillZoneBackground(payload, zone.id, { source })
      if (filled.status === 'filled') {
        result.filled.push({ ...zone, mapId: filled.mapId })
        log(`${zone.name}: mapa ${filled.mapId}${filled.reused ? ' (ya estaba en Media)' : ''}`)
      } else {
        result.failed.push({ ...zone, reason: 'DofusDB no da mapas de esta subzona' })
      }
    } catch (error) {
      result.failed.push({
        ...zone,
        reason: error instanceof Error ? error.message : String(error),
      })
    }
  }
  return result
}

const zoneLabel = (zone: PendingZone) =>
  `${zone.name}${zone.areaName && zone.areaName !== zone.name ? ` (${zone.areaName})` : ''} ` +
  `[${zone.dofusId}]`

/** El informe del script, una línea por subzona y el resumen al final. */
export function zoneBackgroundReport(result: ZoneBackfillResult, apply: boolean): string[] {
  const lines: string[] = []
  if (!apply) {
    for (const zone of result.pending) {
      lines.push(`Sin fondo: ${zoneLabel(zone)}, en ${zone.pages.join(', ')}`)
    }
    lines.push(
      result.pending.length === 0
        ? 'Todas las subzonas de lo publicado tienen fondo.'
        : `${result.pending.length} subzonas sin fondo. En seco: repite con --apply para traerlos.`,
    )
    return lines
  }
  for (const zone of result.filled)
    lines.push(`Fondo traído: ${zoneLabel(zone)}, mapa ${zone.mapId}`)
  for (const zone of result.failed) lines.push(`Sin fondo: ${zoneLabel(zone)}: ${zone.reason}`)
  lines.push(`${result.filled.length} fondos traídos, ${result.failed.length} fallidos.`)
  return lines
}
