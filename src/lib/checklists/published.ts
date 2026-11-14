// Lo publicado de una checklist, en caché con la etiqueta de las checklists (./cache.ts): la
// misma lectura para su página (src/app/(frontend)/[slug]/checklist-data.ts) y para lo que pide
// el porcentaje de los carteles del índice (src/endpoints/checklist-poster-progress.ts). La
// configuración de Payload se carga dentro de la función: importarla arriba haría un ciclo con
// las colecciones, que montan ese endpoint.
import { unstable_cache } from 'next/cache'
import { getPayload } from 'payload'

import { CHECKLISTS_REVALIDATE, CHECKLISTS_TAG } from './cache'
import { readChecklist } from './queries'

export const readPublishedChecklist = unstable_cache(
  async (slug: string) => {
    const { default: config } = await import('@payload-config')
    return readChecklist(await getPayload({ config }), slug)
  },
  ['checklist'],
  { tags: [CHECKLISTS_TAG], revalidate: CHECKLISTS_REVALIDATE },
)
