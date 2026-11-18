import { unstable_cache } from 'next/cache'
import type { Payload } from 'payload'

import { ACHIEVEMENT_PAGES_TAG } from '../achievements/cache'
import { CHECKLISTS_TAG } from '../checklists/cache'
import { DOFUS_GUIDES_TAG } from '../dofus-guides/cache'
import { GUIDE_PAGES_REVALIDATE, GUIDE_PAGES_TAG } from '../guides/cache'
import { PAGES_TAG } from '../pages/cache'
import type { SearchIndex } from './guide-index'
import { readSearchIndex } from './read-index'

// El índice de la búsqueda en caché, el mismo para el endpoint de las islas
// (src/endpoints/search-index.ts) y para la página /buscar, que busca sin JavaScript. Con las
// etiquetas de cada cosa (src/lib/guides/cache.ts, src/lib/achievements/cache.ts,
// src/lib/dofus-guides/cache.ts, src/lib/checklists/cache.ts, src/lib/pages/cache.ts): sus
// hooks las caducan al guardar, así que lo recién publicado sale en la siguiente petición.

/** El índice como lo ve un visitante anónimo: se lee con payload, nunca con el usuario. */
export function cachedSearchIndex(payload: Payload): Promise<SearchIndex> {
  return unstable_cache(() => readSearchIndex(payload), ['site-search-index', 'content'], {
    tags: [GUIDE_PAGES_TAG, ACHIEVEMENT_PAGES_TAG, DOFUS_GUIDES_TAG, CHECKLISTS_TAG, PAGES_TAG],
    revalidate: GUIDE_PAGES_REVALIDATE,
  })()
}
