import type { Payload } from 'payload'

import { metalogrosIndexView, type IndexView } from '@/lib/achievements/metalogros'
import { readMetalogrosIndex } from '@/lib/achievements/queries'

import type {
  AchievementIndexRow,
  GuideIndexRow,
  MetalogroIndexRow,
  SearchIndex,
} from './guide-index'

// Lee del servidor el índice de la búsqueda (guide-index.ts): lo sirve
// src/endpoints/search-index.ts en GET /api/search/guides.

/**
 * Las guías que ve un visitante anónimo: solo lo publicado (overrideAccess: false, sin
 * usuario, draft: false). Lee de la misión solo el nivel y el nombre del logro.
 */
async function readGuideRows(payload: Payload): Promise<GuideIndexRow[]> {
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
  return guides.sort((a, b) => a[0].localeCompare(b[0], 'es'))
}

/**
 * Lo que el índice de metalogros deja abrir, de los datos de su propio buscador: las páginas
 * de logro publicadas (en estado Publicada), con su metalogro y sus misiones, y los
 * metalogros que no están apagados. Lo En preparación no se busca: no tiene página.
 */
export function achievementSearchRows(
  view: IndexView,
): Pick<Required<SearchIndex>, 'achievements' | 'metalogros'> {
  return {
    achievements: view.search.a.flatMap(([name, zone, href, quests, off]) =>
      off ? [] : [[name, href.replace(/^\//, ''), zone, quests] satisfies AchievementIndexRow],
    ),
    metalogros: view.search.z.flatMap(([name, anchor, counts, off]) =>
      off ? [] : [[name, anchor, counts] satisfies MetalogroIndexRow],
    ),
  }
}

/** El índice entero de la búsqueda, como lo ve un visitante anónimo. */
export async function readSearchIndex(payload: Payload): Promise<SearchIndex> {
  const [guides, metalogros] = await Promise.all([
    readGuideRows(payload),
    readMetalogrosIndex(payload),
  ])
  return { guides, ...achievementSearchRows(metalogrosIndexView(metalogros)) }
}
