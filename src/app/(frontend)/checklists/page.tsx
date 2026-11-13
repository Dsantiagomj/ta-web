import type { Metadata } from 'next'

import { ChecklistsIndex } from '@/components/checklists/ChecklistsIndex'
import { CHECKLISTS_INDEX_PATH } from '@/lib/checklists/path'
import { checklistIndexStrings } from '@/lib/checklists/strings'

import { loadChecklists } from '../site-data'
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
 * que el menú (loadChecklists).
 */
export default async function ChecklistsPage() {
  return <ChecklistsIndex entries={await loadChecklists()} />
}
