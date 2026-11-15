import config from '@payload-config'
import type { Metadata } from 'next'
import { unstable_cache } from 'next/cache'
import { getPayload } from 'payload'

import { MetalogrosIndex } from '@/components/achievement/MetalogrosIndex'
import { ACHIEVEMENT_PAGES_REVALIDATE, ACHIEVEMENT_PAGES_TAG } from '@/lib/achievements/cache'
import { metalogrosIndexView } from '@/lib/achievements/metalogros'
import { METALOGROS_PATH } from '@/lib/achievements/page'
import { readMetalogrosIndex } from '@/lib/achievements/queries'
import { indexMetadata } from '@/lib/site-copy/metadata'

import { loadIndexTexts, loadSiteSettings } from '../site-data'

// El título y la descripción son de «Portada e índices»; el nombre del sitio y la imagen al
// compartir, de «Ajustes del sitio».
export async function generateMetadata(): Promise<Metadata> {
  const [texts, settings] = await Promise.all([loadIndexTexts(), loadSiteSettings()])
  return indexMetadata(METALOGROS_PATH, texts.metalogros.seo, settings)
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
  const [view, texts] = await Promise.all([readIndex(), loadIndexTexts()])
  return (
    <div className="[--color-section:var(--color-sec-logros)]">
      <MetalogrosIndex view={view} texts={texts.metalogros} />
    </div>
  )
}
