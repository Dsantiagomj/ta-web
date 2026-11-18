// Lee de la base, sin escribir nada, lo que este sitio tiene en /<slug>: cada documento
// publicado de las colecciones con página propia, con si está En preparación, y las
// direcciones que Torre cambió (colección redirects). Lo usan pnpm links:legacy (para saber
// quién desbloquea un enlace) y pnpm urls:map (el mapa de URL viejas, url-map.ts).
import type { Payload } from 'payload'

import { readSlugRedirects } from '@/lib/redirects/queries'

import type { SiteIndex } from './url-map'

/** Las colecciones que tienen página en /<slug>. Las de `state` pueden estar En preparación. */
const SLUG_COLLECTIONS = [
  'quest-guides',
  'achievement-pages',
  'dofus-guides',
  'checklists',
  'pages',
  'class-pages',
  'dungeon-pages',
] as const

export async function readSiteIndex(payload: Payload): Promise<SiteIndex> {
  const documents = new Map<string, { collection: string; preparing: boolean }>()
  for (const collection of SLUG_COLLECTIONS) {
    const { docs } = await payload.find({
      collection,
      // Un borrador nunca publicado no tiene página: no cuenta.
      where: { _status: { equals: 'published' } },
      select: { slug: true, ...(collection !== 'quest-guides' && { state: true }) },
      depth: 0,
      draft: false,
      pagination: false,
      overrideAccess: true,
    })
    for (const doc of docs as { slug?: string | null; state?: string | null }[]) {
      if (!doc.slug || documents.has(doc.slug)) continue
      const preparing = collection !== 'quest-guides' && doc.state !== 'published'
      documents.set(doc.slug, { collection, preparing })
    }
  }
  const slugMoves = new Map(await readSlugRedirects(payload))
  return { documents, slugMoves }
}

/** La colección de lo publicado En preparación con ese slug, o null. */
export const preparingIn =
  (site: SiteIndex) =>
  (slug: string): string | null => {
    const doc = site.documents.get(slug)
    return doc?.preparing ? doc.collection : null
  }
