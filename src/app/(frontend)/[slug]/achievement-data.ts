import config from '@payload-config'
import { unstable_cache } from 'next/cache'
import { draftMode, headers } from 'next/headers'
import { getPayload } from 'payload'
import { cache } from 'react'

import { ACHIEVEMENT_PAGES_REVALIDATE, ACHIEVEMENT_PAGES_TAG } from '@/lib/achievements/cache'
import type { AchievementPageData } from '@/lib/achievements/page'
import { readAchievementPage, type ReadAchievementOptions } from '@/lib/achievements/queries'
import { SITE_URL } from '@/lib/site/origin'
import type { User } from '@/payload-types'

// unstable_cache guarda JSON: los PNJ y los objetos de las notas van como pares y se vuelven
// a juntar al leer. Una entrada guardada antes de noteItems da un Map vacío.
async function read(slug: string, options?: ReadAchievementOptions) {
  const payload = await getPayload({ config })
  const data = await readAchievementPage(payload, slug, options)
  return data && { ...data, givers: [...data.givers], noteItems: [...data.noteItems] }
}

// Lo publicado, en caché con la etiqueta de las páginas de logro (src/lib/achievements/cache.ts).
const readPublished = unstable_cache((slug: string) => read(slug), ['achievement-page'], {
  tags: [ACHIEVEMENT_PAGES_TAG],
  revalidate: ACHIEVEMENT_PAGES_REVALIDATE,
})

/**
 * La página del logro, una vez por petición. Con el draft mode de Next y una sesión del
 * panel, el último borrador y sin caché, también En preparación; sin sesión, lo publicado.
 */
export const loadAchievementPage = cache(
  async (slug: string): Promise<(AchievementPageData & { preview: boolean }) | null> => {
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
      givers: new Map(stored.givers),
      noteItems: new Map(stored.noteItems),
      siteUrl: SITE_URL,
      preview,
    }
  },
)
