import config from '@payload-config'
import { unstable_cache } from 'next/cache'
import { getPayload } from 'payload'

import { CHECKLISTS_REVALIDATE, CHECKLISTS_TAG } from '@/lib/checklists/cache'
import { checklistEntries, checklistNavItems, checklistTeaser } from '@/lib/checklists/list'
import { readPosterModels } from '@/lib/checklists/poster-models'
import { readChecklists, readChecklistTeaser } from '@/lib/checklists/queries'
import { DOFUS_GUIDES_REVALIDATE, DOFUS_GUIDES_TAG } from '@/lib/dofus-guides/cache'
import { dofusNavItems } from '@/lib/dofus-guides/nav'
import { readDofusList } from '@/lib/dofus-guides/queries'
import { GUIDE_PAGES_REVALIDATE, GUIDE_PAGES_TAG } from '@/lib/guides/cache'
import { countSiteGuides } from '@/lib/site/counts'

// Las cifras de la cabecera cambian cuando cambian las guías: la misma etiqueta de caché
// que las páginas de guía, que los hooks de quest-guides caducan al guardar.
export const loadSiteCounts = unstable_cache(
  async () => countSiteGuides(await getPayload({ config })),
  ['site-counts'],
  { tags: [GUIDE_PAGES_TAG], revalidate: GUIDE_PAGES_REVALIDATE },
)

// Los Dofus del menú y de la búsqueda: cambian con las guías de Dofus y sus huevos, que
// caducan esta etiqueta al guardar (src/lib/dofus-guides/cache.ts).
export const loadDofusNav = unstable_cache(
  async () => dofusNavItems(await readDofusList(await getPayload({ config }))),
  ['dofus-nav'],
  { tags: [DOFUS_GUIDES_TAG], revalidate: DOFUS_GUIDES_REVALIDATE },
)

// Las checklists, una sola lectura en caché para el índice /checklists, el menú, el pie, la
// búsqueda y la portada: la caducan las checklists y las guías de Dofus, de donde salen el
// huevo y el color (src/lib/checklists/cache.ts).
export const loadChecklists = unstable_cache(
  async () => checklistEntries(await readChecklists(await getPayload({ config }))),
  ['checklists'],
  { tags: [CHECKLISTS_TAG], revalidate: CHECKLISTS_REVALIDATE },
)

/** Lo que pinta el menú de cada checklist, sacado de loadChecklists. */
export const loadChecklistNav = async () => checklistNavItems(await loadChecklists())

// La tarjeta «???» del índice, del global checklists-index: su hook caduca esta etiqueta.
export const loadChecklistTeaser = unstable_cache(
  async () => checklistTeaser(await readChecklistTeaser(await getPayload({ config }))),
  ['checklist-teaser'],
  { tags: [CHECKLISTS_TAG], revalidate: CHECKLISTS_REVALIDATE },
)

// Lo que el índice manda para el porcentaje de cada cartel: de cada Publicada, lo justo de lo
// que recibe la isla de su página. Lo caducan los mismos hooks que la página de la checklist.
export const loadPosterModels = unstable_cache(
  async () => {
    const published = (await loadChecklists()).filter((entry) => entry.state === 'published')
    return readPosterModels(
      await getPayload({ config }),
      published.map((entry) => entry.slug),
    )
  },
  ['checklist-poster-models'],
  { tags: [CHECKLISTS_TAG], revalidate: CHECKLISTS_REVALIDATE },
)
