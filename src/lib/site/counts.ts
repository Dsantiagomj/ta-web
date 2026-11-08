import type { Payload } from 'payload'

/** Las cifras de la cabecera y la portada: guías de misión y logros publicados. */
export interface SiteGuideCounts {
  guides: number
  achievements: number
}

/**
 * Cuenta lo que un visitante ve: solo lo publicado (overrideAccess: false). Los logros son
 * las páginas de logro publicadas y no En preparación, las mismas que el índice de
 * metalogros enlaza, para que la cabecera, la portada y /metalogros digan lo mismo.
 */
export async function countSiteGuides(payload: Payload): Promise<SiteGuideCounts> {
  const [guides, achievements] = await Promise.all([
    payload.count({
      collection: 'quest-guides',
      where: { _status: { equals: 'published' } },
      overrideAccess: false,
    }),
    payload.count({
      collection: 'achievement-pages',
      where: { _status: { equals: 'published' }, state: { equals: 'published' } },
      overrideAccess: false,
    }),
  ])
  return { guides: guides.totalDocs, achievements: achievements.totalDocs }
}
