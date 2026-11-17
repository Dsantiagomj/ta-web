// Trae el fondo de una subzona de DofusDB: elige un mapa (pickBackgroundMap), descarga su
// render, le quita la marca de DofusDB y lo guarda en Media una sola vez por mapa
// (media.gameAsset). Lo usan el botón «Traer fondo de DofusDB» del panel
// (src/endpoints/zone-background.ts) y `pnpm zones:backgrounds`. La web nunca llama a DofusDB.
import sharp from 'sharp'
import type { Payload } from 'payload'

import { createDofusDbClient, type DofusDbClient } from '../dofusdb/client'
import {
  pickBackgroundMap,
  watermarkCrop,
  ZONE_RENDER_URL,
  zoneBackgroundAlt,
  zoneRenderKey,
  type ZoneMap,
} from './background'

/** De dónde salen los mapas y sus renders; en las pruebas, simulado. */
export interface ZoneSource {
  /** Los mapas de una subzona, por su ID de DofusDB. */
  maps(subAreaDofusId: number): Promise<ZoneMap[]>
  /** El render de un mapa (JPEG). */
  render(mapId: number): Promise<Buffer>
}

const USER_AGENT = 'ta-web/fondos-de-zona'

/** DofusDB de verdad: los mapIds de la subzona y su posición, y el render a escala 1. */
export function dofusDbZoneSource(client: DofusDbClient = createDofusDbClient()): ZoneSource {
  return {
    async maps(subAreaDofusId) {
      const [subArea] = await client.fetchWhere<{ mapIds?: number[] | null }>(
        'subareas',
        { id: subAreaDofusId },
        { select: ['id', 'mapIds'] },
      )
      const ids = subArea?.mapIds ?? []
      if (ids.length === 0) return []
      const maps = await client.fetchByIds<ZoneMap>('map-positions', ids)
      // En el orden de la subzona, que fetchByIds no garantiza.
      const order = new Map(ids.map((id, index) => [id, index]))
      return maps.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0))
    },
    async render(mapId) {
      const response = await fetch(ZONE_RENDER_URL(mapId), {
        headers: { 'User-Agent': USER_AGENT, Accept: 'image/*' },
        signal: AbortSignal.timeout(30_000),
      })
      if (!response.ok) throw new Error(`DofusDB respondió ${response.status} al render ${mapId}`)
      const type = response.headers.get('content-type') ?? ''
      if (!type.startsWith('image/')) throw new Error(`La respuesta no es una imagen (${type})`)
      return Buffer.from(await response.arrayBuffer())
    },
  }
}

/** El render sin la marca de DofusDB, en JPEG: Payload genera de él los AVIF y WebP. */
export async function cropZoneRender(data: Buffer): Promise<Buffer> {
  const { width, height } = await sharp(data).metadata()
  if (!width || !height) throw new Error('El render no tiene tamaño')
  return sharp(data).extract(watermarkCrop(width, height)).jpeg({ quality: 85 }).toBuffer()
}

/**
 * Los mapas, en ese orden, donde empieza la misión de una guía publicada: los preferidos
 * para el fondo. Una misión guarda sus mapas de inicio (startPositions.mapId).
 */
async function guideStartMaps(payload: Payload, mapIds: number[]): Promise<number[]> {
  if (mapIds.length === 0) return []
  const { docs: quests } = await payload.find({
    collection: 'quests',
    where: { 'startPositions.mapId': { in: mapIds } },
    select: { startPositions: true },
    sort: 'dofusId',
    pagination: false,
    depth: 0,
    overrideAccess: true,
  })
  if (quests.length === 0) return []
  const { docs: guides } = await payload.find({
    collection: 'quest-guides',
    where: { quest: { in: quests.map((quest) => quest.id) } },
    select: { quest: true },
    sort: 'createdAt',
    draft: false,
    pagination: false,
    depth: 0,
    overrideAccess: true,
  })
  const published = new Set(
    guides.map((guide) => (typeof guide.quest === 'object' ? guide.quest?.id : guide.quest)),
  )
  const inSubArea = new Set(mapIds)
  return quests
    .filter((quest) => published.has(quest.id))
    .flatMap((quest) =>
      (quest.startPositions ?? []).flatMap((position) =>
        position.mapId != null && inSubArea.has(position.mapId) ? [position.mapId] : [],
      ),
    )
}

/** El archivo de Media del render de un mapa: lo busca por su clave o lo descarga y lo sube. */
async function renderMedia(
  payload: Payload,
  mapId: number,
  alt: string,
  source: ZoneSource,
): Promise<{ id: number; reused: boolean }> {
  const key = zoneRenderKey(mapId)
  const { docs } = await payload.find({
    collection: 'media',
    where: { gameAsset: { equals: key } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  if (docs[0]) return { id: docs[0].id, reused: true }
  const data = await cropZoneRender(await source.render(mapId))
  const created = await payload.create({
    collection: 'media',
    data: { alt, gameAsset: key },
    file: { data, mimetype: 'image/jpeg', name: `fondo-zona-${mapId}.jpg`, size: data.length },
    depth: 0,
    overrideAccess: true,
  })
  return { id: created.id, reused: false }
}

export type FillZoneResult =
  { status: 'filled'; mapId: number; mediaId: number; reused: boolean } | { status: 'no-maps' }

/**
 * Pone el fondo de una subzona (por su ID de Payload): el render del mapa `mapId`, el de su
 * backgroundMapId o el que elige pickBackgroundMap, y guarda los dos campos. Lanza si
 * DofusDB falla; la subzona se queda como estaba.
 */
export async function fillZoneBackground(
  payload: Payload,
  subAreaId: number,
  { mapId, source = dofusDbZoneSource() }: { mapId?: number | null; source?: ZoneSource } = {},
): Promise<FillZoneResult> {
  const subArea = await payload.findByID({
    collection: 'subareas',
    id: subAreaId,
    depth: 0,
    overrideAccess: true,
  })
  let picked = mapId ?? subArea.backgroundMapId ?? null
  if (picked === null) {
    const maps = await source.maps(subArea.dofusId)
    const preferred = await guideStartMaps(
      payload,
      maps.map((map) => map.id),
    )
    picked = pickBackgroundMap({ maps, preferred })
  }
  if (picked === null) return { status: 'no-maps' }

  const alt = zoneBackgroundAlt({ name: subArea.name, areaName: subArea.areaName })
  const media = await renderMedia(payload, picked, alt, source)
  await payload.update({
    collection: 'subareas',
    id: subAreaId,
    data: { background: media.id, backgroundMapId: picked },
    depth: 0,
    overrideAccess: true,
  })
  return { status: 'filled', mapId: picked, mediaId: media.id, reused: media.reused }
}
