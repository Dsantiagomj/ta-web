import type { Payload } from 'payload'

import { searchIndex, type SearchEntry } from '@/components/site/nav'
import { metalogrosIndexView, type IndexView } from '@/lib/achievements/metalogros'
import { readMetalogrosIndex } from '@/lib/achievements/queries'
import { checklistEntries, checklistNavItems } from '@/lib/checklists/list'
import { readChecklists } from '@/lib/checklists/queries'
import { dofusNavItems } from '@/lib/dofus-guides/nav'
import { readDofusList } from '@/lib/dofus-guides/queries'
import { corrected } from '@/lib/game-data/correction'
import { pageNavItems } from '@/lib/pages/page'
import { readPageNav } from '@/lib/pages/queries'

import {
  CONTENT_TYPES,
  type AchievementIndexRow,
  type ContentIndexRow,
  type ContentType,
  type GuideIndexRow,
  type MetalogroIndexRow,
  type SearchIndex,
} from './guide-index'

// Lee del servidor el índice de la búsqueda (guide-index.ts): lo sirve
// src/endpoints/search-index.ts en GET /api/search/guides.

/**
 * Las guías que ve un visitante anónimo: solo lo publicado (overrideAccess: false, sin
 * usuario, draft: false). Lee de la misión solo el nivel, con la corrección de Torre, y el
 * nombre del logro.
 */
async function readGuideRows(payload: Payload): Promise<GuideIndexRow[]> {
  const { docs } = await payload.find({
    collection: 'quest-guides',
    where: { _status: { equals: 'published' } },
    select: { title: true, slug: true, quest: true, summary: { level: true } },
    populate: { quests: { levelMin: true, achievement: { name: true }, correction: true } },
    depth: 1,
    draft: false,
    pagination: false,
    overrideAccess: false,
  })
  const guides = docs.map((guide): GuideIndexRow => {
    // El nivel con la corrección de Torre, si la hay.
    const quest = guide.quest && typeof guide.quest === 'object' ? corrected(guide.quest) : null
    return [
      guide.title,
      guide.slug,
      quest?.achievement?.name?.trim() || null,
      // El nivel que escribió Torre en la guía gana al de la misión.
      guide.summary?.level || (quest?.levelMin ?? null),
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

const isContent = (entry: SearchEntry): entry is SearchEntry & { type: ContentType } =>
  (CONTENT_TYPES as readonly string[]).includes(entry.type)

/**
 * Las guías de Dofus, las checklists y las páginas, con las mismas reglas que la búsqueda del
 * menú (searchIndex): solo lo que se abre, con el huevo que ve el visitante (el de Torre, o
 * el del objeto con su corrección).
 */
export function contentRows(entries: SearchEntry[]): ContentIndexRow[] {
  return entries
    .filter(isContent)
    .map(({ type, name, href, image }) => [type, name, href, image?.src ?? null])
}

/** Lo que enlaza el menú, leído como lo ve un visitante anónimo. */
async function readContentRows(payload: Payload): Promise<ContentIndexRow[]> {
  const [dofus, checklists, pages] = await Promise.all([
    readDofusList(payload),
    readChecklists(payload),
    readPageNav(payload),
  ])
  return contentRows(
    searchIndex(
      dofusNavItems(dofus),
      checklistNavItems(checklistEntries(checklists)),
      pageNavItems(pages),
    ),
  )
}

/** El índice entero de la búsqueda, como lo ve un visitante anónimo. */
export async function readSearchIndex(payload: Payload): Promise<SearchIndex> {
  const [guides, metalogros, content] = await Promise.all([
    readGuideRows(payload),
    readMetalogrosIndex(payload),
    readContentRows(payload),
  ])
  return { guides, ...achievementSearchRows(metalogrosIndexView(metalogros)), content }
}
