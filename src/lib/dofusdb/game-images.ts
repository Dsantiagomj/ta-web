// Los iconos de los objetos y las imágenes de los monstruos (DESIGN.md, Imagery): DofusDB los
// sirve como PNG de 128px. Se importan una vez a Media al refrescar los datos del juego, con
// una clave por imagen (media.gameAsset), y el objeto o el monstruo enlaza el archivo. La web
// nunca los pide a DofusDB al servir una página.
import type { Payload } from 'payload'

import type { Media } from '../../payload-types'
import { mapWithConcurrency } from '../concurrency'
import { fetchRenderFromDofusDb } from './refresh-npcs'

export type GameImageKind = 'item' | 'monster' | 'achievement'

const IMAGES = 'https://api.dofusdb.fr/img'
const FOLDER: Record<GameImageKind, string> = {
  item: 'items',
  monster: 'monsters',
  achievement: 'achievements',
}
const COLLECTION = { item: 'items', monster: 'monsters' } as const
const DEFAULT_CONCURRENCY = 4

/** El PNG de DofusDB: el iconId de un objeto o el gfxId de un monstruo. */
export function gameImageUrl(kind: GameImageKind, imageId: number): string {
  return `${IMAGES}/${FOLDER[kind]}/${imageId}.png`
}

/** La clave del archivo en Media: una por imagen, así que los objetos que la comparten usan el mismo. */
export function gameImageKey(kind: GameImageKind, imageId: number): string {
  return `dofusdb-${kind}-image:${imageId}`
}

/** Descarga una imagen de DofusDB; lanza si no llega una imagen. */
export type FetchImage = (url: string) => Promise<Buffer>

export interface RefreshGameImagesOptions {
  /** IDs (de Payload) de los objetos y monstruos cuyas imágenes se importan. */
  items?: number[]
  monsters?: number[]
  fetchImage?: FetchImage
  log?: (message: string) => void
  concurrency?: number
}

export interface GameImageCounts {
  /** Archivos subidos y encontrados ya en Media por su clave. */
  imported: number
  reused: number
  /** Objetos y monstruos enlazados ahora a su imagen, o que ya la tenían. */
  linked: number
  unchanged: number
  /** Imágenes que DofusDB no sirvió: el siguiente refresco las reintenta. */
  failed: number
}

type Row = { id: number; name: string; iconId?: number | null; image?: number | Media | null }

/** Lo que suben y reutilizan las importaciones de imágenes del juego. */
export type ImportCounts = Pick<GameImageCounts, 'imported' | 'reused' | 'failed'>

/**
 * El archivo de Media de una imagen de DofusDB: lo busca por su clave y, si no está, lo
 * descarga y lo sube. Devuelve su ID, o null si DofusDB no la sirve (el siguiente refresco
 * lo reintenta). Una misma imagen pedida dos veces se sube una sola vez.
 */
export function gameImageImporter(
  payload: Payload,
  options: { fetchImage?: FetchImage; log?: (message: string) => void },
) {
  const fetchImage = options.fetchImage ?? fetchRenderFromDofusDb
  const log = options.log ?? (() => {})
  const counts: ImportCounts = { imported: 0, reused: 0, failed: 0 }
  // Una promesa por clave: dos objetos con el mismo icono no lo suben dos veces a la vez.
  const byKey = new Map<string, Promise<number | null>>()
  // Las subidas van de una en una: dos a la vez pueden elegir el mismo nombre de archivo
  // libre y chocar con el índice único de media.filename. Las descargas sí van a la vez.
  let uploads: Promise<unknown> = Promise.resolve()
  const serially = <T>(task: () => Promise<T>): Promise<T> => {
    const run = uploads.then(task, task)
    uploads = run.catch(() => {})
    return run
  }

  function media(kind: GameImageKind, imageId: number, alt: string) {
    const key = gameImageKey(kind, imageId)
    const known = byKey.get(key)
    if (known) return known
    const pending = (async () => {
      const { docs } = await payload.find({
        collection: 'media',
        where: { gameAsset: { equals: key } },
        limit: 1,
        depth: 0,
        overrideAccess: true,
      })
      if (docs[0]) {
        counts.reused += 1
        return docs[0].id
      }
      try {
        const data = await fetchImage(gameImageUrl(kind, imageId))
        const created = await serially(() =>
          payload.create({
            collection: 'media',
            data: { alt, gameAsset: key },
            file: {
              data,
              mimetype: 'image/png',
              name: `${kind}-${imageId}.png`,
              size: data.length,
            },
            depth: 0,
            overrideAccess: true,
          }),
        )
        counts.imported += 1
        return created.id
      } catch (error) {
        counts.failed += 1
        log(`Imagen de DofusDB ${kind} ${imageId} no disponible: ${String(error)}`)
        return null
      }
    })()
    byKey.set(key, pending)
    return pending
  }

  return { media, counts }
}

/**
 * Importa y enlaza las imágenes de esos objetos y monstruos. Cada archivo se busca por su
 * clave antes de descargar nada, así que repetirlo no duplica archivos aunque una pasada
 * anterior se cortara a medias. Sin iconId no hay imagen; si DofusDB falla, el objeto se
 * queda sin ella (la página deja el hueco vacío) y el siguiente refresco lo reintenta.
 */
export async function refreshGameImages(
  payload: Payload,
  options: RefreshGameImagesOptions,
): Promise<GameImageCounts> {
  const concurrency = options.concurrency ?? DEFAULT_CONCURRENCY
  const importer = gameImageImporter(payload, options)
  let linked = 0
  let unchanged = 0
  const mediaFor = importer.media

  for (const kind of ['item', 'monster'] as const) {
    const ids = [...new Set(kind === 'item' ? (options.items ?? []) : (options.monsters ?? []))]
    if (ids.length === 0) continue
    const collection = COLLECTION[kind]
    const { docs } = await payload.find({
      collection,
      where: { id: { in: ids } },
      pagination: false,
      depth: 1,
      overrideAccess: true,
    })
    await mapWithConcurrency(docs as Row[], concurrency, async (doc) => {
      if (doc.iconId == null) return
      const key = gameImageKey(kind, doc.iconId)
      if (typeof doc.image === 'object' && doc.image?.gameAsset === key) {
        unchanged += 1
        return
      }
      const mediaId = await mediaFor(kind, doc.iconId, doc.name)
      if (mediaId == null) return
      await payload.update({
        collection,
        id: doc.id,
        data: { image: mediaId },
        depth: 0,
        overrideAccess: true,
      })
      linked += 1
    })
  }
  return { ...importer.counts, linked, unchanged }
}

type Relation = number | { id: number } | null | undefined
type QuantityRow = { item?: Relation; monster?: Relation }
type BodyBlock = { blockType?: string; body?: BodyBlock[] | null; monsters?: QuantityRow[] | null }

function relationIds(rows: QuantityRow[] | null | undefined, field: 'item' | 'monster') {
  return (rows ?? []).flatMap((row) => {
    const value = row[field]
    if (value == null) return []
    return [typeof value === 'number' ? value : value.id]
  })
}

/** Los monstruos de los bloques Combate de un cuerpo, también dentro de los pasos. */
function fightMonsters(blocks: BodyBlock[] | null | undefined): number[] {
  return (blocks ?? []).flatMap((block) =>
    block.blockType === 'fight'
      ? relationIds(block.monsters, 'monster')
      : block.blockType === 'step'
        ? fightMonsters(block.body)
        : [],
  )
}

/**
 * Lo que pinta alguna página: los objetos de las recompensas y requisitos de las misiones,
 * los de las recompensas de los logros y de sus páginas, los que piden las guías en su
 * resumen, y los
 * monstruos de los requisitos de las misiones, de los combates de las guías y los que
 * representan a un metalogro. Solo esos: el catálogo entero son decenas de miles de objetos.
 */
export async function gameImageTargets(
  payload: Payload,
): Promise<{ items: number[]; monsters: number[] }> {
  const items = new Set<number>()
  const monsters = new Set<number>()
  const quests = await payload.find({
    collection: 'quests',
    pagination: false,
    depth: 0,
    select: { rewards: { items: true }, needs: { items: true, monsters: true } },
    overrideAccess: true,
  })
  for (const quest of quests.docs) {
    for (const id of relationIds(quest.rewards?.items, 'item')) items.add(id)
    for (const id of relationIds(quest.needs?.items, 'item')) items.add(id)
    for (const id of relationIds(quest.needs?.monsters, 'monster')) monsters.add(id)
  }
  const achievements = await payload.find({
    collection: 'achievements',
    pagination: false,
    depth: 0,
    select: { rewards: { items: true } },
    overrideAccess: true,
  })
  for (const achievement of achievements.docs) {
    for (const id of relationIds(achievement.rewards?.items, 'item')) items.add(id)
  }
  // Y los que Torre pone en las recompensas de una página de logro, borradores incluidos.
  const pages = await payload.find({
    collection: 'achievement-pages',
    pagination: false,
    depth: 0,
    draft: true,
    select: { rewards: { items: true } },
    overrideAccess: true,
  })
  for (const page of pages.docs) {
    for (const id of relationIds(page.rewards?.items, 'item')) items.add(id)
  }
  // El representante de un metalogro puede ser un monstruo: su imagen es el arte del índice.
  const groups = await payload.find({
    collection: 'achievement-groups',
    pagination: false,
    depth: 0,
    draft: true,
    select: { representative: true },
    overrideAccess: true,
  })
  for (const group of groups.docs) {
    const chosen = group.representative
    if (chosen?.relationTo !== 'monsters') continue
    monsters.add(typeof chosen.value === 'number' ? chosen.value : chosen.value.id)
  }
  const guides = await payload.find({
    collection: 'quest-guides',
    pagination: false,
    depth: 0,
    draft: true,
    select: { body: true, summary: { needs: { items: true } } },
    overrideAccess: true,
  })
  for (const guide of guides.docs) {
    for (const id of relationIds(guide.summary?.needs?.items, 'item')) items.add(id)
    for (const id of fightMonsters(guide.body as BodyBlock[])) monsters.add(id)
  }
  return { items: [...items], monsters: [...monsters] }
}
