import type { Metadata } from 'next'

import { Areas } from '@/components/home/Areas'
import { Author } from '@/components/home/Author'
import { ChecklistsSection } from '@/components/home/ChecklistsSection'
import { GuideTour } from '@/components/home/GuideTour'
import { Hero } from '@/components/home/Hero'
import { LiveStrip } from '@/components/home/LiveStrip'
import { liveState } from '@/lib/site/live'
import '@/components/home/home.css'

import { loadChecklistNav, loadIndexTexts, loadSiteCounts, loadSiteSettings } from './site-data'

// La URL canónica de la portada: «/», sin la query (?directo=…). El título y la descripción
// son los del layout, de «Ajustes del sitio».
export const metadata: Metadata = { alternates: { canonical: '/' } }

/**
 * La portada (DESIGN.md, Layout: Home): el directo si lo hay, el hero con la búsqueda, qué
 * vas a encontrar, cómo es una guía, las checklists y Torre. Las cifras y las checklists son
 * las mismas de la cabecera (loadSiteCounts, loadChecklistNav), así que nunca discrepan. Los
 * textos son de «Portada e índices» y las redes de Torre, de «Ajustes del sitio»: se leen en
 * el servidor y no suman JavaScript.
 */
export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const [counts, checklists, params, { home }, { socials }] = await Promise.all([
    loadSiteCounts(),
    loadChecklistNav(),
    searchParams,
    loadIndexTexts(),
    loadSiteSettings(),
  ])
  const live = liveState(params.directo, process.env)
  return (
    <main id="contenido" className="home">
      <LiveStrip live={live} twitch={socials.twitch} />
      <Hero texts={home} />
      <Areas counts={counts} texts={home.areas} />
      <GuideTour texts={home.tour} />
      <ChecklistsSection checklists={checklists} texts={home.checklists} />
      <Author live={live} texts={home.author} socials={socials} />
    </main>
  )
}
