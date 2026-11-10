// Los objetos del juego que piden las guías de Dofus: el propio Dofus y las filas de
// Necesitarás. La base solo tiene los objetos que usan las misiones (pnpm data:quests); lo que
// falta se trae de DofusDB una vez, con su icono en Media, igual que hace ese refresco.
import type { Payload } from 'payload'

import type { DofusDbClient } from '@/lib/dofusdb/client'
import { gameImageImporter, type FetchImage } from '@/lib/dofusdb/game-images'
import { mapItem } from '@/lib/dofusdb/map-items-monsters'
import type { RawItem } from '@/lib/dofusdb/types'

const ITEM_FIELDS = ['id', 'name', 'level', 'typeId', 'iconId', 'type']

/** Escapa un texto para usarlo literal en un $regex de DofusDB. */
const literal = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

export function gameItems(
  payload: Payload,
  options: {
    client: DofusDbClient
    fetchImage?: FetchImage
    log?: (message: string) => void
    /** En seco busca sin crear: lo que importaría devuelve su ID de DofusDB en negativo. */
    dryRun?: boolean
  },
) {
  const images = gameImageImporter(payload, {
    fetchImage: options.fetchImage,
    log: options.log,
  })
  // Una promesa por objeto: dos filas con el mismo objeto no lo crean dos veces.
  const byDofusId = new Map<number, Promise<number | null>>()
  const byName = new Map<string, Promise<number | null>>()

  async function stored(dofusId: number): Promise<number | null> {
    const { docs } = await payload.find({
      collection: 'items',
      where: { dofusId: { equals: dofusId } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })
    return docs[0]?.id ?? null
  }

  /** Crea el objeto de DofusDB con su icono, o devuelve el que ya estaba. */
  function fromRaw(raw: RawItem): Promise<number | null> {
    const known = byDofusId.get(raw.id)
    if (known) return known
    const pending = (async () => {
      const existing = await stored(raw.id)
      if (existing !== null) return existing
      if (options.dryRun) return -raw.id
      const item = mapItem(raw)
      const image = item.iconId === null ? null : await images.media('item', item.iconId, item.name)
      const created = await payload.create({
        collection: 'items',
        data: { ...item, image },
        depth: 0,
        overrideAccess: true,
      })
      options.log?.(`Objeto de DofusDB importado: ${item.name} (${item.dofusId})`)
      return created.id
    })()
    byDofusId.set(raw.id, pending)
    return pending
  }

  /** El ID en Payload del objeto de DofusDB, importándolo si falta; null si DofusDB no lo conoce. */
  async function ensureItem(dofusId: number): Promise<number | null> {
    const existing = byDofusId.get(dofusId) ?? stored(dofusId)
    const id = await existing
    if (id !== null) return id
    const [raw] = await options.client.fetchByIds<RawItem>('items', [dofusId])
    return raw ? fromRaw(raw) : null
  }

  /**
   * El objeto que se llama así: en la base con el nombre exacto; si no, en DofusDB con el
   * nombre exacto y luego sin mayúsculas (Torre escribe «Piel de Rojiva»). Con varios, el de
   * ID más bajo. null si no hay ninguno: la fila queda como nota.
   */
  function findItem(name: string): Promise<number | null> {
    const key = name.trim()
    const known = byName.get(key)
    if (known) return known
    const pending = (async () => {
      const local = await payload.find({
        collection: 'items',
        where: { name: { equals: key } },
        sort: 'dofusId',
        limit: 1,
        depth: 0,
        overrideAccess: true,
      })
      if (local.docs[0]) return local.docs[0].id
      const select = { select: ITEM_FIELDS }
      let rows = await options.client.fetchWhere<RawItem>('items', { 'name.es': key }, select)
      if (rows.length === 0) {
        rows = await options.client.fetchWhere<RawItem>(
          'items',
          { 'name.es[$regex]': `^${literal(key)}$`, 'name.es[$options]': 'i' },
          select,
        )
      }
      const [first] = [...rows].sort((a, b) => a.id - b.id)
      return first ? fromRaw(first) : null
    })()
    byName.set(key, pending)
    return pending
  }

  return { ensureItem, findItem, images: images.counts }
}
