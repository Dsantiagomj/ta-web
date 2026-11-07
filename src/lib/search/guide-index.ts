import type { Payload } from 'payload'

// El índice de las guías de misiones para la búsqueda de la cabecera (DESIGN.md, Layout:
// Search). Hasta que exista la búsqueda de texto completo en Postgres, la cabecera busca
// por título en este índice: la isla lo pide la primera vez que se abre la búsqueda.

/** Donde lo sirve el endpoint de src/endpoints/search-index.ts. */
export const GUIDE_SEARCH_INDEX_URL = '/api/search/guides'

/** Una guía: título, slug, logro de su misión y nivel mínimo. Tuplas: el JSON pesa menos. */
export type GuideIndexRow = [
  title: string,
  slug: string,
  achievement: string | null,
  level: number | null,
]

export interface GuideSearchIndex {
  guides: GuideIndexRow[]
}

/**
 * Lo que ve un visitante anónimo: solo lo publicado (overrideAccess: false, sin usuario,
 * draft: false). Lee de la misión solo el nivel y el nombre del logro.
 */
export async function readGuideSearchIndex(payload: Payload): Promise<GuideSearchIndex> {
  const { docs } = await payload.find({
    collection: 'quest-guides',
    where: { _status: { equals: 'published' } },
    select: { title: true, slug: true, quest: true },
    populate: { quests: { levelMin: true, achievement: { name: true } } },
    depth: 1,
    draft: false,
    pagination: false,
    overrideAccess: false,
  })
  const guides = docs.map((guide): GuideIndexRow => {
    const quest = typeof guide.quest === 'object' ? guide.quest : null
    return [
      guide.title,
      guide.slug,
      quest?.achievement?.name?.trim() || null,
      quest?.levelMin ?? null,
    ]
  })
  return { guides: guides.sort((a, b) => a[0].localeCompare(b[0], 'es')) }
}
