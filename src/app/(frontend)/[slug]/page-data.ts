import config from '@payload-config'
import { unstable_cache } from 'next/cache'
import { draftMode, headers } from 'next/headers'
import { getPayload } from 'payload'
import { cache } from 'react'

import { PAGES_REVALIDATE, PAGES_TAG } from '@/lib/pages/cache'
import { readSitePage, type ReadSitePageOptions } from '@/lib/pages/queries'
import type { User } from '@/payload-types'

async function read(slug: string, options?: ReadSitePageOptions) {
  return readSitePage(await getPayload({ config }), slug, options)
}

// Lo publicado, en caché con la etiqueta de las páginas (src/lib/pages/cache.ts).
const readPublished = unstable_cache((slug: string) => read(slug), ['site-page'], {
  tags: [PAGES_TAG],
  revalidate: PAGES_REVALIDATE,
})

/**
 * La página suelta del slug, una vez por petición (la piden la página y sus metadatos). Con
 * el draft mode de Next y una sesión del panel, el último borrador y sin caché; sin sesión,
 * lo publicado.
 */
export const loadSitePage = cache(async (slug: string) => {
  if ((await draftMode()).isEnabled) {
    const payload = await getPayload({ config })
    const { user } = await payload.auth({ headers: await headers() })
    if (user) {
      const page = await read(slug, { preview: { user: user as User } })
      return page && { page, preview: true }
    }
  }
  const page = await readPublished(slug)
  return page && { page, preview: false }
})
