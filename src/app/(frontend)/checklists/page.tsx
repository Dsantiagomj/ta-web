import type { Metadata } from 'next'

import { ChecklistsIndex } from '@/components/checklists/ChecklistsIndex'
import { CHECKLISTS_INDEX_PATH } from '@/lib/checklists/path'
import { checklistIndexStrings } from '@/lib/checklists/strings'

import { loadChecklists, loadChecklistTeaser, loadPosterModels } from '../site-data'
import { siteStrings } from '../strings'

const s = checklistIndexStrings.seo

export const metadata: Metadata = {
  title: s.title,
  description: s.description,
  alternates: { canonical: CHECKLISTS_INDEX_PATH },
  openGraph: {
    type: 'website',
    title: s.title,
    description: s.description,
    url: CHECKLISTS_INDEX_PATH,
    siteName: siteStrings.brand,
    locale: 'es_ES',
  },
}

/**
 * El índice de las checklists (DESIGN.md, Checklists index), con la misma lectura en caché
 * que el menú (loadChecklists), la tarjeta «???» y lo que pide el porcentaje de cada cartel.
 */
export default async function ChecklistsPage() {
  const [entries, teaser, progress] = await Promise.all([
    loadChecklists(),
    loadChecklistTeaser(),
    loadPosterModels(),
  ])
  return <ChecklistsIndex entries={entries} teaser={teaser} progress={progress} />
}
