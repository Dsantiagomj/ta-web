import type { Payload } from 'payload'

/** Las cifras de la cabecera y la portada: guías de misión y logros publicados. */
export interface SiteGuideCounts {
  guides: number
  achievements: number
}

/**
 * Los logros que ve un visitante: las páginas de logro publicadas y no En preparación, las
 * mismas que enlaza el índice de metalogros. Así la cabecera, la portada y /metalogros
 * dicen la misma cifra.
 */
export async function countPublishedAchievements(payload: Payload): Promise<number> {
  const { totalDocs } = await payload.count({
    collection: 'achievement-pages',
    where: { _status: { equals: 'published' }, state: { equals: 'published' } },
    overrideAccess: false,
  })
  return totalDocs
}

/** Cuenta lo que un visitante ve: solo lo publicado (overrideAccess: false). */
export async function countSiteGuides(payload: Payload): Promise<SiteGuideCounts> {
  const [guides, achievements] = await Promise.all([
    payload.count({
      collection: 'quest-guides',
      where: { _status: { equals: 'published' } },
      overrideAccess: false,
    }),
    countPublishedAchievements(payload),
  ])
  return { guides: guides.totalDocs, achievements }
}
