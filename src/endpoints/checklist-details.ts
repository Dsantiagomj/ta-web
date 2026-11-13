import { unstable_cache } from 'next/cache'
import { draftMode } from 'next/headers'
import { gzipSync } from 'node:zlib'
import type { Endpoint, PayloadRequest } from 'payload'

import { CHECKLISTS_REVALIDATE, CHECKLISTS_TAG } from '../lib/checklists/cache'
import type { ChecklistDetails } from '../lib/checklists/details'
import { readChecklistDetails } from '../lib/checklists/queries'
import type { User } from '../payload-types'
import { acceptsGzip } from './search-index'

// GET /api/checklists/<slug>/details: lo que la isla de la página de una checklist carga
// después de pintarla (quién da cada misión, dónde, y sus objetivos con coordenadas). Va en
// la colección checklists, así que Payload lo sirve bajo su ruta.
//
// Un visitante lee lo publicado, en caché con la etiqueta de las checklists
// (src/lib/checklists/cache.ts), y el navegador lo guarda cinco minutos. Como la página,
// solo una sesión del panel con el draft mode de Next lee el último borrador, que no se
// guarda en ninguna caché.

export const CHECKLIST_DETAILS_CACHE_CONTROL = 'public, max-age=300, stale-while-revalidate=3600'

/** La respuesta, comprimida con gzip si el navegador lo acepta: Next no comprime la API de Payload. */
export function checklistDetailsResponse(
  details: ChecklistDetails,
  acceptEncoding: string | null,
  privateRead: boolean,
): Response {
  const json = JSON.stringify(details)
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Cache-Control': privateRead ? 'private, no-store' : CHECKLIST_DETAILS_CACHE_CONTROL,
    Vary: 'Accept-Encoding',
  }
  if (!acceptsGzip(acceptEncoding)) return new Response(json, { headers })
  return new Response(new Uint8Array(gzipSync(json)), {
    headers: { ...headers, 'Content-Encoding': 'gzip' },
  })
}

/** El usuario con el que leer el borrador: uno del panel, y solo con draft mode. */
export function previewUser<T extends { collection?: string }>(
  user: T | null | undefined,
  draftModeEnabled: boolean,
): T | null {
  return user && user.collection === 'users' && draftModeEnabled ? user : null
}

/** Si la petición lleva el draft mode de Next; fuera de una petición de Next, no. */
async function isDraftMode(): Promise<boolean> {
  try {
    return (await draftMode()).isEnabled
  } catch {
    return false
  }
}

const readPublished = (req: PayloadRequest, slug: string) =>
  unstable_cache(() => readChecklistDetails(req.payload, slug), ['checklist-details', slug], {
    tags: [CHECKLISTS_TAG],
    revalidate: CHECKLISTS_REVALIDATE,
  })()

export const checklistDetailsEndpoint: Endpoint = {
  path: '/:slug/details',
  method: 'get',
  handler: async (req) => {
    const slug = String(req.routeParams?.slug ?? '')
    const user = previewUser(req.user as User | null, await isDraftMode())
    const details = user
      ? await readChecklistDetails(req.payload, slug, { preview: { user } })
      : await readPublished(req, slug)
    if (!details) return Response.json({ error: 'not found' }, { status: 404 })
    return checklistDetailsResponse(details, req.headers.get('accept-encoding'), Boolean(user))
  },
}
