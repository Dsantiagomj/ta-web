import type { Endpoint } from 'payload'

import { cachedSearchIndex } from '../lib/search/cached-index'
import { GUIDE_SEARCH_INDEX_URL, type SearchIndex } from '../lib/search/guide-index'

// El índice de la búsqueda de la cabecera y de la portada, en GET /api/search/guides: las
// guías, las páginas de logro, los metalogros, las guías de Dofus, las checklists y las
// páginas publicadas. Público: es lo mismo que ve cualquier visitante, sin usuario.
//
// En caché con las etiquetas de cada cosa (src/lib/search/cached-index.ts), la misma lectura
// que la página /buscar. El navegador lo guarda cinco minutos y luego lo revalida.

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
    return searchIndexResponse(await cachedSearchIndex(req.payload))
  },
}
