import {
  ValidationError,
  type CollectionBeforeValidateHook,
  type PayloadRequest,
  type Where,
} from 'payload'

import { achievementStrings } from '../lib/achievements/strings'
import { isReservedSlug } from '../lib/guides/slug'

/**
 * Las colecciones con página en la raíz del sitio, /<slug>: las guías y las páginas de
 * logro (src/app/(frontend)/[slug]), los metalogros, que usan los slugs de Torre
 * (metalogro-astrub), y las guías de Dofus, con los slugs de su web (dofus-abisal).
 * Comparten un solo espacio de slugs.
 */
export const ROOT_SLUG_COLLECTIONS = [
  'quest-guides',
  'achievement-pages',
  'achievement-groups',
  'dofus-guides',
] as const

export type RootSlugCollection = (typeof ROOT_SLUG_COLLECTIONS)[number]

const OWNER: Record<RootSlugCollection, string> = {
  'quest-guides': 'una guía',
  'achievement-pages': 'un logro',
  'achievement-groups': 'un metalogro',
  'dofus-guides': 'una guía de Dofus',
}

/**
 * Si un documento de la colección usa el slug, guardado o en su último borrador: un slug
 * cambiado en un borrador sin publicar también está ocupado, o publicarlo chocaría.
 */
async function slugUsedIn(
  req: PayloadRequest,
  collection: RootSlugCollection,
  slug: string,
  exceptId?: number,
): Promise<boolean> {
  const bySlug: Where = { slug: { equals: slug } }
  const where: Where = exceptId ? { and: [bySlug, { id: { not_equals: exceptId } }] } : bySlug
  const stored = await req.payload.count({ collection, where, overrideAccess: true, req })
  if (stored.totalDocs > 0) return true
  const drafts = await req.payload.find({
    collection,
    where,
    draft: true,
    depth: 0,
    limit: 1,
    pagination: false,
    overrideAccess: true,
    req,
  })
  return drafts.docs.length > 0
}

/** La otra colección que ya usa el slug, o null si está libre fuera de la propia. */
export async function slugOwner(
  req: PayloadRequest,
  slug: string,
  self: RootSlugCollection,
): Promise<RootSlugCollection | null> {
  for (const collection of ROOT_SLUG_COLLECTIONS) {
    if (collection !== self && (await slugUsedIn(req, collection, slug))) return collection
  }
  return null
}

/**
 * Si el slug está ocupado para un documento de `self`: por una ruta del sitio, por otra
 * colección de la raíz o por otro documento de la suya, también en borradores. Lo usan los
 * slugs que se rellenan solos (guías, logros, metalogros) para elegir un sufijo libre.
 */
export async function isRootSlugTaken(
  req: PayloadRequest,
  slug: string,
  self: RootSlugCollection,
  ownId?: number,
): Promise<boolean> {
  if (isReservedSlug(slug)) return true
  if (await slugOwner(req, slug, self)) return true
  return slugUsedIn(req, self, slug, ownId)
}

/**
 * Cada colección tiene su slug único; este hook rechaza el que ya usa otra de la raíz,
 * para que dos páginas nunca compartan URL.
 */
export function rejectSharedSlug(self: RootSlugCollection): CollectionBeforeValidateHook {
  return async ({ data, originalDoc, req }) => {
    const slug = data?.slug ?? originalDoc?.slug
    if (typeof slug !== 'string' || !slug) return data
    const owner = await slugOwner(req, slug, self)
    if (!owner) return data
    throw new ValidationError({
      collection: self,
      errors: [{ path: 'slug', message: achievementStrings.admin.slugTaken(slug, OWNER[owner]) }],
      req,
    })
  }
}
