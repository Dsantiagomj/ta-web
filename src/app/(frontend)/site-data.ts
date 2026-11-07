import config from '@payload-config'
import { unstable_cache } from 'next/cache'
import { getPayload } from 'payload'

import { GUIDE_PAGES_REVALIDATE, GUIDE_PAGES_TAG } from '@/lib/guides/cache'
import { countSiteGuides } from '@/lib/site/counts'

// Las cifras de la cabecera cambian cuando cambian las guías: la misma etiqueta de caché
// que las páginas de guía, que los hooks de quest-guides caducan al guardar.
export const loadSiteCounts = unstable_cache(
  async () => countSiteGuides(await getPayload({ config })),
  ['site-counts'],
  { tags: [GUIDE_PAGES_TAG], revalidate: GUIDE_PAGES_REVALIDATE },
)
