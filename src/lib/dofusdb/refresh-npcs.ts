import type { Payload } from 'payload'
import sharp from 'sharp'

import type { Media, Npc } from '../../payload-types'
import { mapWithConcurrency } from '../concurrency'
import { spanish } from './map-quest'
import { npcRenderKey, npcRenderUrl, RENDER_DIRECTIONS, type RenderDirection } from './npc-render'
import type { UpsertCounts } from './refresh-quests'
import type { RawNpc } from './types'

/** Descarga un render de DofusDB; lanza si no llega una imagen. */
export type FetchRender = (url: string) => Promise<Buffer>

export interface RefreshNpcsOptions {
  fetchRender?: FetchRender
  now?: Date
  log?: (message: string) => void
  /** PNJ procesados a la vez. Pocos: cada uno descarga, recorta y sube dos imágenes. */
  concurrency?: number
}

export interface RefreshNpcsCounts {
  npcs: UpsertCounts
  /** Renders subidos, encontrados ya en Media sin enlazar y que no se pudieron traer. */
  renders: { imported: number; reused: number; failed: number }
}

const DEFAULT_CONCURRENCY = 4
// El renderizador devuelve 1000×1000 con mucho margen; recortado, la figura mide unos
// 400×850. 720 de alto sobra para los 128px de ancho que ocupa en la página, a 2x y más.
const MAX_HEIGHT = 720
const USER_AGENT = 'ta-web/datos-del-juego'
const FIELD: Record<RenderDirection, 'renderRight' | 'renderLeft'> = {
  right: 'renderRight',
  left: 'renderLeft',
}

/** fetch del render con un límite de tiempo; solo acepta una imagen PNG. */
export async function fetchRenderFromDofusDb(url: string): Promise<Buffer> {
  const response = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'image/png' },
    signal: AbortSignal.timeout(30_000),
  })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  const type = response.headers.get('content-type') ?? ''
  if (!type.startsWith('image/')) throw new Error(`La respuesta no es una imagen (${type})`)
  return Buffer.from(await response.arrayBuffer())
}

/** Quita el margen transparente y limita el alto: el archivo que se guarda en Media. */
async function prepareRender(data: Buffer): Promise<Buffer> {
  const trimmed = await sharp(data).trim().png().toBuffer()
  return sharp(trimmed).resize({ height: MAX_HEIGHT, withoutEnlargement: true }).png().toBuffer()
}

function mediaId(value: number | Media | null | undefined): number | null {
  if (value == null) return null
  return typeof value === 'number' ? value : value.id
}

/**
 * Crea o actualiza los PNJ por su ID de DofusDB e importa sus renders (mirando a la
 * derecha y a la izquierda) a Media, una sola vez: cada archivo lleva su clave
 * (npcRenderKey) y se busca por ella antes de descargar nada, así que repetirlo no
 * duplica archivos aunque una pasada anterior se cortara a medias. Un look nuevo sube
 * renders nuevos y conserva los viejos, que una guía puede usar. Sin look, o si el renderizador falla, el PNJ se
 * guarda sin ese render: la página no pinta su columna, y el siguiente refresco lo reintenta.
 */
export async function refreshNpcs(
  payload: Payload,
  rows: RawNpc[],
  options: RefreshNpcsOptions = {},
): Promise<RefreshNpcsCounts> {
  const fetchRender = options.fetchRender ?? fetchRenderFromDofusDb
  const refreshedAt = (options.now ?? new Date()).toISOString()
  const log = options.log ?? (() => {})
  const concurrency = options.concurrency ?? DEFAULT_CONCURRENCY

  const existing = await payload.find({
    collection: 'npcs',
    pagination: false,
    depth: 1,
    overrideAccess: true,
  })
  const byDofusId = new Map(existing.docs.map((doc) => [doc.dofusId, doc]))
  const unique = new Map(rows.map((row) => [row.id, row]))
  const renders = { imported: 0, reused: 0, failed: 0 }

  async function findByKey(key: string): Promise<Media | undefined> {
    const { docs } = await payload.find({
      collection: 'media',
      where: { gameAsset: { equals: key } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })
    return docs[0]
  }

  /** El ID de Media del render de una dirección: el que ya tiene, uno subido antes o uno nuevo. */
  async function render(
    raw: RawNpc,
    name: string,
    look: string,
    direction: RenderDirection,
    current: number | Media | null | undefined,
  ): Promise<number | null> {
    const key = npcRenderKey(raw.id, direction, look)
    if (typeof current === 'object' && current?.gameAsset === key) return current.id
    const found = await findByKey(key)
    if (found) {
      renders.reused += 1
      return found.id
    }
    const url = npcRenderUrl(look, direction)!
    try {
      const data = await prepareRender(await fetchRender(url))
      const media = await payload.create({
        collection: 'media',
        data: { alt: name, gameAsset: key },
        file: {
          data,
          mimetype: 'image/png',
          name: `pnj-${raw.id}-${direction}-${key.split(':').at(-1)}.png`,
          size: data.length,
        },
        depth: 0,
        overrideAccess: true,
      })
      renders.imported += 1
      return media.id
    } catch (error) {
      renders.failed += 1
      log(`Render del PNJ ${raw.id} (${direction}) no disponible: ${String(error)}`)
      // Mejor el render de un look anterior que ninguno; el próximo refresco lo reintenta.
      return mediaId(current)
    }
  }

  const statuses = await mapWithConcurrency([...unique.values()], concurrency, async (raw) => {
    const doc: Npc | undefined = byDofusId.get(raw.id)
    const name = spanish(raw.name) ?? `PNJ ${raw.id}`
    const look = raw.look?.trim() || null
    const ids: Record<RenderDirection, number | null> = { right: null, left: null }
    for (const direction of RENDER_DIRECTIONS) {
      const current = doc?.[FIELD[direction]]
      ids[direction] = look ? await render(raw, name, look, direction, current) : null
    }

    const data = {
      dofusId: raw.id,
      name,
      look,
      renderRight: ids.right,
      renderLeft: ids.left,
    }
    const stored = doc && {
      dofusId: doc.dofusId,
      name: doc.name,
      look: doc.look ?? null,
      renderRight: mediaId(doc.renderRight),
      renderLeft: mediaId(doc.renderLeft),
    }
    let status: keyof UpsertCounts = 'unchanged'
    if (!doc) {
      await payload.create({
        collection: 'npcs',
        data: { ...data, refreshedAt },
        depth: 0,
        overrideAccess: true,
      })
      status = 'created'
    } else if (JSON.stringify(stored) !== JSON.stringify(data)) {
      await payload.update({
        collection: 'npcs',
        id: doc.id,
        data: { ...data, refreshedAt },
        depth: 0,
        overrideAccess: true,
      })
      status = 'updated'
    }

    // Los renders de un look anterior se quedan en Media: son registros que un editor puede
    // haber elegido en una guía, y borrarlos rompería esa imagen. Un look cambia muy pocas
    // veces, así que lo que sobra es poco.
    return status
  })

  const npcs = { created: 0, updated: 0, unchanged: 0 }
  for (const status of statuses) npcs[status] += 1
  return { npcs, renders }
}
