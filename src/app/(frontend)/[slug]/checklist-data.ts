import config from '@payload-config'
import { unstable_cache } from 'next/cache'
import { draftMode, headers } from 'next/headers'
import { getPayload } from 'payload'
import { cache } from 'react'

import { CHECKLISTS_REVALIDATE, CHECKLISTS_TAG } from '@/lib/checklists/cache'
import type { ChecklistData } from '@/lib/checklists/page'
import { readChecklist, type ReadChecklistOptions } from '@/lib/checklists/queries'
import { SITE_URL } from '@/lib/site/origin'
import type { User } from '@/payload-types'

async function read(slug: string, options?: ReadChecklistOptions) {
  const payload = await getPayload({ config })
  return readChecklist(payload, slug, options)
}

// Lo publicado, en caché con la etiqueta de las checklists (src/lib/checklists/cache.ts).
const readPublished = unstable_cache((slug: string) => read(slug), ['checklist'], {
  tags: [CHECKLISTS_TAG],
  revalidate: CHECKLISTS_REVALIDATE,
})

/**
 * La checklist del slug, una vez por petición. Con el draft mode de Next y una sesión del
 * panel, el último borrador y sin caché; sin sesión, lo publicado, también En preparación
 * (la página manda esas a la checklist de Squarespace).
 */
export const loadChecklist = cache(
  async (slug: string): Promise<(ChecklistData & { preview: boolean }) | null> => {
    if ((await draftMode()).isEnabled) {
      const payload = await getPayload({ config })
      const { user } = await payload.auth({ headers: await headers() })
      if (user) {
        const stored = await read(slug, { preview: { user: user as User } })
        return stored && { ...stored, siteUrl: SITE_URL, preview: true }
      }
    }
    const stored = await readPublished(slug)
    return stored && { ...stored, siteUrl: SITE_URL, preview: false }
  },
)
