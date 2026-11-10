import config from '@payload-config'
import { unstable_cache } from 'next/cache'
import { getPayload } from 'payload'

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
