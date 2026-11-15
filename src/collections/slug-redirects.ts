import type { CollectionAfterChangeHook, CollectionBeforeChangeHook, PayloadRequest } from 'payload'

import {
  redirectProblem,
  slugMove,
  type SlugRedirectCollection,
} from '../lib/redirects/slug-redirects'

// Al publicar una página con otro slug, su dirección vieja pasa a llevar a la nueva: una fila
// de la colección redirects (src/collections/Redirects.ts), que acorta las cadenas y rechaza
// los bucles. Y una página que publica una dirección vieja se la queda: su fila se borra.

const contextKey = (collection: SlugRedirectCollection, id: number | string) =>
  `slugMove:${collection}:${id}`

/**
 * Antes de guardar, apunta si el guardado mueve la dirección pública. Lo publicado es la fila
 * de la colección, no la última versión: guardar un borrador solo escribe versiones, así que
 * la fila sigue con el slug que ve la web.
 */
export function trackSlugMove(collection: SlugRedirectCollection): CollectionBeforeChangeHook {
  return async ({ data, operation, originalDoc, req }) => {
    if (operation !== 'update' || !originalDoc?.id) return data
    const status = data?._status ?? originalDoc._status
    if (status !== 'published') return data
    const stored = await req.payload.db.findOne<{ id: number; slug?: string; _status?: string }>({
      collection,
      where: { id: { equals: originalDoc.id } },
      req,
    })
    const move = slugMove(
      stored && { status: stored._status, slug: stored.slug },
      data?.slug ?? originalDoc.slug,
      status,
    )
    if (move) req.context[contextKey(collection, originalDoc.id)] = move
    return data
  }
}

/** Borra la fila de una dirección que vuelve a tener página. */
async function releaseSlug(req: PayloadRequest, slug: string) {
  await req.payload.delete({
    collection: 'redirects',
    where: { from: { equals: slug } },
    overrideAccess: true,
    req,
  })
}

/** La dirección vieja lleva a la nueva; si ya tenía fila, se cambia. */
async function saveMove(req: PayloadRequest, from: string, to: string) {
  // Una dirección vieja que ya no puede redirigir (una ruta nueva del sitio o una URL que la
  // tabla de Squarespace responde antes) se deja: nunca impide publicar.
  if (redirectProblem(from, to)) return
  const { docs } = await req.payload.find({
    collection: 'redirects',
    where: { from: { equals: from } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
    req,
  })
  const data = { from, to, auto: true }
  if (docs[0]) {
    await req.payload.update({
      collection: 'redirects',
      id: docs[0].id,
      data,
      overrideAccess: true,
      req,
    })
  } else {
    await req.payload.create({ collection: 'redirects', data, overrideAccess: true, req })
  }
}

// Los hooks de applySlugMove: las pruebas de caché los separan de los que revalidan.
const slugMoveHooks = new WeakSet<object>()

/** Si un hook afterChange es el que guarda las redirecciones (applySlugMove). */
export const isSlugMoveHook = (hook: object): boolean => slugMoveHooks.has(hook)

/** Después de publicar: la dirección nueva se libera de filas viejas y la vieja redirige. */
export function applySlugMove(collection: SlugRedirectCollection): CollectionAfterChangeHook {
  const hook: CollectionAfterChangeHook = async ({ doc, req }) => {
    if (doc?._status !== 'published' || typeof doc.slug !== 'string') return doc
    await releaseSlug(req, doc.slug)
    const key = contextKey(collection, doc.id)
    const move = req.context[key] as { from: string; to: string } | undefined
    if (move) {
      delete req.context[key]
      await saveMove(req, move.from, move.to)
    }
    return doc
  }
  slugMoveHooks.add(hook)
  return hook
}
