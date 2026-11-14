// Los objetos del juego que piden las guías de Dofus: el propio Dofus y las filas de
// Necesitarás. La base solo tiene los objetos que usan las misiones (pnpm data:quests); lo que
// falta se trae de DofusDB una vez, con su icono en Media, igual que hace ese refresco.
import type { Payload } from 'payload'

import type { DofusDbClient } from '@/lib/dofusdb/client'
import { gameImageImporter, type FetchImage } from '@/lib/dofusdb/game-images'
import { mapItem } from '@/lib/dofusdb/map-items-monsters'
import type { RawItem } from '@/lib/dofusdb/types'

import { fold } from './fold'
import { itemNamePattern, sameItem, singularForms } from './item-match'

const ITEM_FIELDS = ['id', 'name', 'level', 'typeId', 'iconId', 'type']

/** El objeto que casó con un nombre: su ID en Payload, su nombre en el juego y si casó en singular. */
export interface ItemMatch {
  id: number
  name: string
  singular: boolean
  /** Su supertipo en DofusDB (recurso, consumible, equipo…), para el grupo de Necesitarás. */
  superTypeId: number | null
}

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
  const byName = new Map<string, Promise<ItemMatch | null>>()

  type StoredItem = {
    id: number
    name: string
    iconId?: number | null
    image?: unknown
    superTypeId?: number | null
  }

  /**
   * Un objeto que ya estaba sin imagen (el refresco de DofusDB solo trae las de lo que piden
   * las misiones) recibe aquí su icono, una vez: el huevo y los objetos de las guías de Dofus
   * no se quedan sin él. En seco no escribe.
   */
  async function withIcon(doc: StoredItem): Promise<number> {
    if (doc.image || doc.iconId == null || options.dryRun) return doc.id
    const image = await images.media('item', doc.iconId, doc.name)
    if (image !== null) {
      await payload.update({
        collection: 'items',
        id: doc.id,
        data: { image },
        depth: 0,
        overrideAccess: true,
      })
      options.log?.(`Icono del objeto añadido: ${doc.name} (${doc.iconId})`)
    }
    return doc.id
  }

  async function stored(dofusId: number): Promise<number | null> {
    const { docs } = await payload.find({
      collection: 'items',
      where: { dofusId: { equals: dofusId } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })
    return docs[0] ? withIcon(docs[0]) : null
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

  /** Lo que DofusDB tiene con alguno de esos nombres, sin mirar mayúsculas ni tildes. */
  const searchNames = (names: string[]) =>
    options.client.fetchWhere<RawItem>(
      'items',
      { 'name.es[$regex]': itemNamePattern(names), 'name.es[$options]': 'i' },
      { select: ITEM_FIELDS },
    )

  /** El objeto de DofusDB como ItemMatch, importándolo si falta. */
  async function matched(raw: RawItem, singular: boolean): Promise<ItemMatch | null> {
    const id = await fromRaw(raw)
    if (id === null) return null
    return { id, name: raw.name?.es ?? '', singular, superTypeId: raw.type?.superTypeId ?? null }
  }

  // Lo que casó en singular, para el informe de cada importación.
  const singulars = new Map<string, string>()

  /**
   * Busca en DofusDB uno de los nombres (sin mayúsculas ni tildes) y se queda con el objeto
   * que casa (sameItem); null si ninguno o si hay duda. Los nombres que no casan del todo
   * tras plegar (fold) no cuentan.
   */
  async function fromDofusDb(names: string[], label: string): Promise<RawItem | null | 'none'> {
    const rows = await searchNames(names)
    const keys = new Set(names.map(fold))
    const candidates = rows.filter((row) => keys.has(fold(row.name?.es ?? '')))
    if (candidates.length === 0) return 'none'
    const raw = sameItem(candidates)
    if (!raw) options.log?.(`Varios objetos distintos casan con «${label}»: no se adivina`)
    return raw
  }

  /**
   * El objeto que se llama así, con cantidad o sin ella: en la base con el nombre exacto; si
   * no, en DofusDB sin mirar mayúsculas ni tildes (Torre escribe «Piel de Rojiva»). Si no hay
   * ninguno, en singular («Bananaranjas» → «Bananaranja»). Con varios, el de ID más bajo solo
   * si son el mismo objeto (mismo nombre y tipo); si no, null: nunca se adivina. Una promesa
   * por nombre: cada nombre se busca una vez.
   */
  function matchItem(name: string): Promise<ItemMatch | null> {
    const key = name.trim()
    const known = byName.get(key)
    if (known) return known
    const pending = (async (): Promise<ItemMatch | null> => {
      const local = await payload.find({
        collection: 'items',
        where: { name: { equals: key } },
        sort: 'dofusId',
        limit: 10,
        depth: 0,
        overrideAccess: true,
      })
      if (local.docs.length > 0) {
        const doc = sameItem(local.docs)
        if (!doc) {
          options.log?.(`Varios objetos distintos se llaman «${key}» en la base: no se adivina`)
          return null
        }
        const id = await withIcon(doc)
        return { id, name: doc.name, singular: false, superTypeId: doc.superTypeId ?? null }
      }
      const exact = await fromDofusDb([key], key)
      if (exact !== 'none') return exact ? matched(exact, false) : null
      const forms = singularForms(key)
      if (forms.length === 0) return null
      const singular = await fromDofusDb(forms, key)
      if (singular === 'none' || !singular) return null
      singulars.set(key, singular.name?.es ?? '')
      options.log?.(`Casado en singular: «${key}» → «${singular.name?.es ?? ''}» (${singular.id})`)
      return matched(singular, true)
    })()
    byName.set(key, pending)
    return pending
  }

  /** El ID en Payload de matchItem: lo que usan las checklists. */
  async function findItem(name: string): Promise<number | null> {
    return (await matchItem(name))?.id ?? null
  }

  /** Lo que casó en singular hasta ahora, ordenado por el nombre que escribió Torre. */
  function singularMatches(): { name: string; item: string }[] {
    return [...singulars]
      .map(([name, item]) => ({ name, item }))
      .sort((a, b) => a.name.localeCompare(b.name, 'es'))
  }

  return { ensureItem, findItem, matchItem, singularMatches, images: images.counts }
}
