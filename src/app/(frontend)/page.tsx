import { Areas } from '@/components/home/Areas'
import { Author } from '@/components/home/Author'
import { ChecklistsSection } from '@/components/home/ChecklistsSection'
import { GuideTour } from '@/components/home/GuideTour'
import { Hero } from '@/components/home/Hero'
import { LiveStrip } from '@/components/home/LiveStrip'
import { liveState } from '@/lib/site/live'
import '@/components/home/home.css'

import { loadSiteCounts } from './site-data'

/**
 * La portada (DESIGN.md, Layout: Home): el directo si lo hay, el hero con la búsqueda, qué
 * vas a encontrar, cómo es una guía, los checklists y Torre. Las cifras son las mismas de la
 * cabecera (loadSiteCounts), así que nunca discrepan.
 */
export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const [counts, params] = await Promise.all([loadSiteCounts(), searchParams])
  const live = liveState(params.directo, process.env)
  return (
    <main id="contenido" className="home">
      <LiveStrip live={live} />
      <Hero />
      <Areas counts={counts} />
      <GuideTour />
      <ChecklistsSection />
      <Author live={live} />
    </main>
  )
}
