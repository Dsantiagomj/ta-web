import type { Metadata } from 'next'

import { ChecklistsIndex } from '@/components/checklists/ChecklistsIndex'
import { CHECKLISTS_INDEX_PATH } from '@/lib/checklists/path'
import { checklistIndexStrings } from '@/lib/checklists/strings'

import { loadChecklists, loadChecklistTeaser } from '../site-data'
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
 * que el menú (loadChecklists) y la tarjeta «???». El porcentaje de cada cartel lo pide la
 * isla, solo si el navegador tiene progreso (GET /api/checklists/poster-progress).
 */
export default async function ChecklistsPage() {
  const [entries, teaser] = await Promise.all([loadChecklists(), loadChecklistTeaser()])
  return <ChecklistsIndex entries={entries} teaser={teaser} />
}
