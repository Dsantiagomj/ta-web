import config from '@payload-config'
import { unstable_cache } from 'next/cache'
import { draftMode, headers } from 'next/headers'
import { getPayload } from 'payload'
import { cache } from 'react'

import { findGuideAchievement } from '@/lib/achievements/queries'
import { GUIDE_PAGES_REVALIDATE, GUIDE_PAGES_TAG } from '@/lib/guides/cache'
import { guideAchievement, prerequisiteQuestIds, questGiverId } from '@/lib/guides/page'
import {
  findGuideBySlug,
  findNextQuest,
  findPublishedGuideLinks,
  findQuestGiver,
  type FindGuideOptions,
} from '@/lib/guides/queries'
import type { User } from '@/payload-types'

async function readGuide(slug: string, options: FindGuideOptions = {}) {
  const payload = await getPayload({ config })
  const guide = await findGuideBySlug(payload, slug, options)
  if (!guide) return null
  const questId = typeof guide.quest === 'object' && guide.quest ? guide.quest.id : null
  const [links, giver, next, achievement] = await Promise.all([
    findPublishedGuideLinks(payload, prerequisiteQuestIds(guide)),
    findQuestGiver(payload, questGiverId(guide)),
    findNextQuest(payload, guideAchievement(guide)),
    // Su página de logro: las migas y «Misión 2 de 3».
    findGuideAchievement(payload, questId),
  ])
  return { guide, links, giver, next, achievement }
}

// Lo publicado se guarda en caché con la etiqueta de las guías: los hooks de la colección
// la caducan al guardar desde el panel (src/lib/guides/cache.ts).
const readPublishedGuide = unstable_cache((slug: string) => readGuide(slug), ['guide-page'], {
  tags: [GUIDE_PAGES_TAG],
  revalidate: GUIDE_PAGES_REVALIDATE,
})

/**
 * La guía de la página, una vez por petición (la piden la página y sus metadatos). Con el
 * draft mode de Next y una sesión del panel, el último borrador y sin caché; sin sesión,
 * lo publicado aunque la cookie del draft mode esté puesta.
 */
export const loadGuidePage = cache(async (slug: string) => {
  if ((await draftMode()).isEnabled) {
    const payload = await getPayload({ config })
    const { user } = await payload.auth({ headers: await headers() })
    if (user) {
      const page = await readGuide(slug, { preview: { user: user as User } })
      return page && { ...page, preview: true }
    }
  }
  const page = await readPublishedGuide(slug)
  return page && { ...page, preview: false }
})
