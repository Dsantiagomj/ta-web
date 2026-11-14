import config from '@payload-config'
import { draftMode, headers } from 'next/headers'
import { getPayload } from 'payload'
import { cache } from 'react'

import type { ChecklistData } from '@/lib/checklists/page'
import { readPublishedChecklist } from '@/lib/checklists/published'
import { readChecklist, type ReadChecklistOptions } from '@/lib/checklists/queries'
import { SITE_URL } from '@/lib/site/origin'
import type { User } from '@/payload-types'

async function read(slug: string, options?: ReadChecklistOptions) {
  const payload = await getPayload({ config })
  return readChecklist(payload, slug, options)
}

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
    const stored = await readPublishedChecklist(slug)
    return stored && { ...stored, siteUrl: SITE_URL, preview: false }
  },
)
