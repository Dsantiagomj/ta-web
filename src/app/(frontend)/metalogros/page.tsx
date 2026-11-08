import config from '@payload-config'
import type { Metadata } from 'next'
import { unstable_cache } from 'next/cache'
import { getPayload } from 'payload'

import { MetalogrosIndex } from '@/components/achievement/MetalogrosIndex'
import { ACHIEVEMENT_PAGES_REVALIDATE, ACHIEVEMENT_PAGES_TAG } from '@/lib/achievements/cache'
import { metalogrosIndexView } from '@/lib/achievements/metalogros'
import { METALOGROS_PATH } from '@/lib/achievements/page'
import { readMetalogrosIndex } from '@/lib/achievements/queries'
import { metalogrosStrings } from '@/lib/achievements/strings'

import { siteStrings } from '../strings'

const s = metalogrosStrings.seo

export const metadata: Metadata = {
  title: s.title,
  description: s.description,
  alternates: { canonical: METALOGROS_PATH },
  openGraph: {
    type: 'website',
    title: s.title,
    description: s.description,
    url: METALOGROS_PATH,
    siteName: siteStrings.brand,
    locale: 'es_ES',
  },
}

// La vista, ya calculada, en caché con la etiqueta de las páginas de logro: la caducan las
// páginas de logro, los metalogros, las guías y Media (src/lib/achievements/cache.ts).
const readIndex = unstable_cache(
  async () => {
    const payload = await getPayload({ config })
    return metalogrosIndexView(await readMetalogrosIndex(payload))
  },
  ['metalogros-index'],
  { tags: [ACHIEVEMENT_PAGES_TAG], revalidate: ACHIEVEMENT_PAGES_REVALIDATE },
)

/** El índice de metalogros (DESIGN.md, Metalogros index). */
export default async function MetalogrosPage() {
  return (
    <div className="[--color-section:var(--color-sec-logros)]">
      <MetalogrosIndex view={await readIndex()} />
    </div>
  )
}
