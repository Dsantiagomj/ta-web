import config from '@payload-config'
import type { MetadataRoute } from 'next'
import { unstable_cache } from 'next/cache'
import { getPayload } from 'payload'

import { ACHIEVEMENT_PAGES_TAG } from '@/lib/achievements/cache'
import { CHECKLISTS_TAG } from '@/lib/checklists/cache'
import { DOFUS_GUIDES_TAG } from '@/lib/dofus-guides/cache'
import { GUIDE_PAGES_REVALIDATE, GUIDE_PAGES_TAG } from '@/lib/guides/cache'
import { readSitemapData } from '@/lib/seo/read-sitemap'
import { sitemapEntries } from '@/lib/seo/sitemap'
import { SITE_URL } from '@/lib/site/origin'

// Se pinta en cada petición, como robots.txt: el build no tiene base. Lo que se guarda es la
// lectura, con las etiquetas de lo que lista: los hooks de guías, logros, metalogros, guías de
// Dofus y checklists la caducan al publicar, y lo de fuera del panel se ve en diez minutos.
export const dynamic = 'force-dynamic'

const readData = unstable_cache(
  async () => readSitemapData(await getPayload({ config })),
  ['sitemap'],
  {
    tags: [GUIDE_PAGES_TAG, ACHIEVEMENT_PAGES_TAG, DOFUS_GUIDES_TAG, CHECKLISTS_TAG],
    revalidate: GUIDE_PAGES_REVALIDATE,
  },
)

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  return sitemapEntries(await readData(), SITE_URL)
}
