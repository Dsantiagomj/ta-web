import type { Metadata } from 'next'

import { ChecklistsIndex } from '@/components/checklists/ChecklistsIndex'
import { CHECKLISTS_INDEX_PATH } from '@/lib/checklists/path'
import { indexMetadata } from '@/lib/site-copy/metadata'

import { loadChecklists, loadChecklistTeaser, loadIndexTexts, loadSiteSettings } from '../site-data'

// El título y la descripción son de «Portada e índices»; el nombre del sitio y la imagen al
// compartir, de «Ajustes del sitio».
export async function generateMetadata(): Promise<Metadata> {
  const [texts, settings] = await Promise.all([loadIndexTexts(), loadSiteSettings()])
  return indexMetadata(CHECKLISTS_INDEX_PATH, texts.checklists.seo, settings)
}

/**
 * El índice de las checklists (DESIGN.md, Checklists index), con la misma lectura en caché
 * que el menú (loadChecklists) y la tarjeta «???». El porcentaje de cada cartel lo pide la
 * isla, solo si el navegador tiene progreso (GET /api/checklists/poster-progress).
 */
export default async function ChecklistsPage() {
  const [entries, teaser, texts] = await Promise.all([
    loadChecklists(),
    loadChecklistTeaser(),
    loadIndexTexts(),
  ])
  return <ChecklistsIndex entries={entries} teaser={teaser} texts={texts.checklists} />
}
