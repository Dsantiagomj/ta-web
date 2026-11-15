import config from '@payload-config'
import type { Metadata } from 'next'
import { unstable_cache } from 'next/cache'
import { getPayload } from 'payload'

import { DofusIndex } from '@/components/dofus/DofusIndex'
import { DOFUS_GUIDES_REVALIDATE, DOFUS_GUIDES_TAG } from '@/lib/dofus-guides/cache'
import { dofusIndexView } from '@/lib/dofus-guides/index-view'
import { DOFUS_INDEX_PATH } from '@/lib/dofus-guides/page'
import { readDofusList } from '@/lib/dofus-guides/queries'
import type { RichTextState } from '@/lib/guides/page'
import { indexMetadata } from '@/lib/site-copy/metadata'

import { loadIndexTexts, loadSiteSettings } from '../site-data'

// El título y la descripción son de «Portada e índices»; el nombre del sitio y la imagen al
// compartir, de «Ajustes del sitio».
export async function generateMetadata(): Promise<Metadata> {
  const [texts, settings] = await Promise.all([loadIndexTexts(), loadSiteSettings()])
  return indexMetadata(DOFUS_INDEX_PATH, texts.dofusGuides.seo, settings)
}

// Las tarjetas y la entradilla, en caché con la etiqueta de las guías de Dofus: la caducan
// las guías de Dofus, su índice, los logros, las guías y Media (src/lib/dofus-guides/cache.ts).
const readIndex = unstable_cache(
  async () => {
    const payload = await getPayload({ config })
    const [list, index] = await Promise.all([
      readDofusList(payload),
      payload.findGlobal({ slug: 'dofus-guides-index', depth: 0, overrideAccess: false }),
    ])
    return { view: dofusIndexView(list), intro: (index.intro ?? null) as RichTextState | null }
  },
  ['dofus-guides-index'],
  { tags: [DOFUS_GUIDES_TAG], revalidate: DOFUS_GUIDES_REVALIDATE },
)

/** El índice de las guías de Dofus (DESIGN.md, Dofus guides index). */
export default async function DofusGuidesPage() {
  const [{ view, intro }, texts] = await Promise.all([readIndex(), loadIndexTexts()])
  return <DofusIndex view={view} intro={intro} texts={texts.dofusGuides} />
}
