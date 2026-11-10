import config from '@payload-config'
import { unstable_cache } from 'next/cache'
import { draftMode, headers } from 'next/headers'
import { getPayload } from 'payload'
import { cache } from 'react'

import { DOFUS_GUIDES_REVALIDATE, DOFUS_GUIDES_TAG } from '@/lib/dofus-guides/cache'
import type { DofusGuideData } from '@/lib/dofus-guides/page'
import { readDofusGuide, type ReadDofusGuideOptions } from '@/lib/dofus-guides/queries'
import { SITE_URL } from '@/lib/site/origin'
import type { User } from '@/payload-types'

// unstable_cache guarda JSON: los mapas van como pares y se vuelven a juntar al leer.
async function read(slug: string, options?: ReadDofusGuideOptions) {
  const payload = await getPayload({ config })
  const data = await readDofusGuide(payload, slug, options)
  return (
    data && {
      ...data,
      achievements: [...data.achievements],
      questGuides: [...data.questGuides],
      guideByQuest: [...data.guideByQuest],
      givers: [...data.givers],
    }
  )
}

// Lo publicado, en caché con la etiqueta de las guías de Dofus (src/lib/dofus-guides/cache.ts).
const readPublished = unstable_cache((slug: string) => read(slug), ['dofus-guide'], {
  tags: [DOFUS_GUIDES_TAG],
  revalidate: DOFUS_GUIDES_REVALIDATE,
})

/**
 * La guía de Dofus del slug, una vez por petición. Con el draft mode de Next y una sesión
 * del panel, el último borrador y sin caché, también En preparación; sin sesión, lo
 * publicado.
 */
export const loadDofusGuide = cache(
  async (slug: string): Promise<(DofusGuideData & { preview: boolean }) | null> => {
    let stored: Awaited<ReturnType<typeof read>> = null
    let preview = false
    if ((await draftMode()).isEnabled) {
      const payload = await getPayload({ config })
      const { user } = await payload.auth({ headers: await headers() })
      if (user) {
        stored = await read(slug, { preview: { user: user as User } })
        preview = true
      }
    }
    if (!preview) stored = await readPublished(slug)
    if (!stored) return null
    return {
      ...stored,
      achievements: new Map(stored.achievements),
      questGuides: new Map(stored.questGuides),
      guideByQuest: new Map(stored.guideByQuest),
      givers: new Map(stored.givers),
      siteUrl: SITE_URL,
      preview,
    }
  },
)
