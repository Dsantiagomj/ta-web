import { unstable_cache } from 'next/cache'
import { gzipSync } from 'node:zlib'
import type { Endpoint } from 'payload'

import { ACHIEVEMENT_PAGES_TAG } from '../lib/achievements/cache'
import { GUIDE_PAGES_REVALIDATE, GUIDE_PAGES_TAG } from '../lib/guides/cache'
import { GUIDE_SEARCH_INDEX_URL, type SearchIndex } from '../lib/search/guide-index'
import { readSearchIndex } from '../lib/search/read-index'

// El índice de la búsqueda de la cabecera y de la portada, en GET /api/search/guides: las
// guías, las páginas de logro y los metalogros publicados. Público: es lo mismo que ve
// cualquier visitante, sin usuario.
//
// En caché con las etiquetas de las páginas de guía y de logro (src/lib/guides/cache.ts,
// src/lib/achievements/cache.ts): los hooks de quest-guides, achievement-pages y
// achievement-groups las caducan al guardar, así que lo recién publicado sale en la
// siguiente petición. El navegador lo guarda cinco minutos y luego lo revalida.

export const SEARCH_INDEX_CACHE_CONTROL = 'public, max-age=300, stale-while-revalidate=3600'

/** gzip aceptado, salvo que lo rechace con q=0. */
const acceptsGzip = (header: string | null) =>
  (header ?? '')
    .split(',')
    .map((part) => part.trim().toLowerCase().split(';'))
    .some(
      ([coding, ...params]) =>
        coding === 'gzip' && !params.some((p) => /^q=0(\.0*)?$/.test(p.trim())),
    )

// El último índice comprimido: mientras no cambia, no se vuelve a comprimir.
let compressed: { json: string; gzip: Buffer } | undefined

/**
 * La respuesta, comprimida con gzip si el navegador lo acepta: Next comprime las páginas,
 * pero no las respuestas de la API de Payload, y el índice pesa unos 100 KB sin comprimir.
 */
export function searchIndexResponse(index: SearchIndex, acceptEncoding: string | null): Response {
  const json = JSON.stringify(index)
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Cache-Control': SEARCH_INDEX_CACHE_CONTROL,
    Vary: 'Accept-Encoding',
  }
  if (!acceptsGzip(acceptEncoding)) return new Response(json, { headers })
  if (compressed?.json !== json) compressed = { json, gzip: gzipSync(json) }
  return new Response(new Uint8Array(compressed.gzip), {
    headers: { ...headers, 'Content-Encoding': 'gzip' },
  })
}

export const searchIndexEndpoint: Endpoint = {
  path: GUIDE_SEARCH_INDEX_URL.replace(/^\/api/, ''),
  method: 'get',
  handler: async (req) => {
    // Se lee con payload y no con req: con req, el local API leería como el usuario de la
    // petición, y el índice es el de un visitante anónimo, el mismo para todos.
    const payload = req.payload
    const index = await unstable_cache(() => readSearchIndex(payload), ['site-search-index'], {
      tags: [GUIDE_PAGES_TAG, ACHIEVEMENT_PAGES_TAG],
      revalidate: GUIDE_PAGES_REVALIDATE,
    })()
    return searchIndexResponse(index, req.headers.get('accept-encoding'))
  },
}
