import { unstable_cache } from 'next/cache'
import type { Endpoint, PayloadRequest } from 'payload'

import { CHECKLISTS_REVALIDATE, CHECKLISTS_TAG } from '../lib/checklists/cache'
import { readPosterModels } from '../lib/checklists/poster-models'
import type { PosterProgressModel } from '../lib/checklists/poster-progress'
import { POSTER_PROGRESS_PATH } from '../lib/checklists/poster-progress-url'
import { readChecklists } from '../lib/checklists/queries'
import { CHECKLIST_DETAILS_CACHE_CONTROL } from './checklist-details'

// GET /api/checklists/poster-progress: lo que pide el motor del porcentaje de cada cartel del
// índice /checklists, de cada checklist Publicada (src/lib/checklists/poster-models.ts). La
// isla del índice lo pide solo cuando el navegador tiene progreso guardado, así que no viaja a
// quien no ha marcado nada. Va en la colección checklists, así que Payload lo sirve bajo su
// ruta. Se lee como un visitante, en caché con la etiqueta de las checklists, y el navegador lo
// guarda cinco minutos.

/** La respuesta, en JSON tal cual: la comprime Next (ver searchIndexResponse). */
export function posterProgressResponse(models: PosterProgressModel[]): Response {
  return Response.json(models, { headers: { 'Cache-Control': CHECKLIST_DETAILS_CACHE_CONTROL } })
}

const readModels = (req: PayloadRequest) =>
  unstable_cache(
    async () => {
      const docs = await readChecklists(req.payload)
      return readPosterModels(
        docs.filter((doc) => doc.state === 'published').map((doc) => doc.slug),
      )
    },
    ['checklist-poster-models'],
    { tags: [CHECKLISTS_TAG], revalidate: CHECKLISTS_REVALIDATE },
  )()

export const checklistPosterProgressEndpoint: Endpoint = {
  path: POSTER_PROGRESS_PATH,
  method: 'get',
  handler: async (req) => posterProgressResponse(await readModels(req)),
}
