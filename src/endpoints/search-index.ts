import { unstable_cache } from 'next/cache'
import type { Endpoint } from 'payload'

import { ACHIEVEMENT_PAGES_TAG } from '../lib/achievements/cache'
import { CHECKLISTS_TAG } from '../lib/checklists/cache'
import { DOFUS_GUIDES_TAG } from '../lib/dofus-guides/cache'
import { GUIDE_PAGES_REVALIDATE, GUIDE_PAGES_TAG } from '../lib/guides/cache'
import { PAGES_TAG } from '../lib/pages/cache'
import { GUIDE_SEARCH_INDEX_URL, type SearchIndex } from '../lib/search/guide-index'
import { readSearchIndex } from '../lib/search/read-index'

// El índice de la búsqueda de la cabecera y de la portada, en GET /api/search/guides: las
// guías, las páginas de logro, los metalogros, las guías de Dofus, las checklists y las
// páginas publicadas. Público: es lo mismo que ve cualquier visitante, sin usuario.
//
// En caché con las etiquetas de cada cosa (src/lib/guides/cache.ts,
// src/lib/achievements/cache.ts, src/lib/dofus-guides/cache.ts, src/lib/checklists/cache.ts,
// src/lib/pages/cache.ts): sus hooks las caducan al guardar, así que lo recién publicado sale
// en la siguiente petición. El navegador lo guarda cinco minutos y luego lo revalida.

export const SEARCH_INDEX_CACHE_CONTROL = 'public, max-age=300, stale-while-revalidate=3600'

/**
 * La respuesta, en JSON tal cual. La comprime Next, como cualquier respuesta (y añade
 * `Vary: Accept-Encoding`); un `Content-Encoding` puesto aquí lo descarta Next desde 16.4.5.
 */
export function searchIndexResponse(index: SearchIndex): Response {
  return Response.json(index, { headers: { 'Cache-Control': SEARCH_INDEX_CACHE_CONTROL } })
}

export const searchIndexEndpoint: Endpoint = {
  path: GUIDE_SEARCH_INDEX_URL.replace(/^\/api/, ''),
  method: 'get',
  handler: async (req) => {
    // Se lee con payload y no con req: con req, el local API leería como el usuario de la
    // petición, y el índice es el de un visitante anónimo, el mismo para todos.
    const payload = req.payload
    const index = await unstable_cache(
      () => readSearchIndex(payload),
      ['site-search-index', 'content'],
      {
        tags: [GUIDE_PAGES_TAG, ACHIEVEMENT_PAGES_TAG, DOFUS_GUIDES_TAG, CHECKLISTS_TAG, PAGES_TAG],
        revalidate: GUIDE_PAGES_REVALIDATE,
      },
    )()
    return searchIndexResponse(index)
  },
}
