import { ValidationError, type CollectionBeforeValidateHook, type PayloadRequest } from 'payload'

import { achievementStrings } from '../lib/achievements/strings'

/**
 * Las colecciones con página en la raíz del sitio, /<slug>: las guías y las páginas de
 * logro (src/app/(frontend)/[slug]), y los metalogros, que usan los slugs de Torre
 * (metalogro-astrub). Comparten un solo espacio de slugs.
 */
export const ROOT_SLUG_COLLECTIONS = [
  'quest-guides',
  'achievement-pages',
  'achievement-groups',
] as const

export type RootSlugCollection = (typeof ROOT_SLUG_COLLECTIONS)[number]

const OWNER: Record<RootSlugCollection, string> = {
  'quest-guides': 'una guía',
  'achievement-pages': 'un logro',
  'achievement-groups': 'un metalogro',
}

/** La otra colección que ya usa el slug, o null si está libre fuera de la propia. */
export async function slugOwner(
  req: PayloadRequest,
  slug: string,
  self: RootSlugCollection,
): Promise<RootSlugCollection | null> {
  for (const collection of ROOT_SLUG_COLLECTIONS) {
    if (collection === self) continue
    const { totalDocs } = await req.payload.count({
      collection,
      where: { slug: { equals: slug } },
      overrideAccess: true,
      req,
    })
    if (totalDocs > 0) return collection
  }
  return null
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
