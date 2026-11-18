import type { Metadata } from 'next'

import { Areas } from '@/components/home/Areas'
import { Author } from '@/components/home/Author'
import { ChecklistsSection } from '@/components/home/ChecklistsSection'
import { GuideTour } from '@/components/home/GuideTour'
import { Hero } from '@/components/home/Hero'
import { LiveStrip } from '@/components/home/LiveStrip'
import { JsonLd } from '@/components/site/JsonLd'
import { websiteJsonLd } from '@/lib/seo/json-ld'
import { liveState } from '@/lib/site/live'
import { SITE_URL } from '@/lib/site/origin'
import '@/components/home/home.css'

import {
  loadChecklistNav,
  loadIndexTexts,
  loadLiveState,
  loadNavigation,
  loadSiteCounts,
  loadSiteSettings,
} from './site-data'

// La URL canónica de la portada: «/», sin la query (?directo=…). El título y la descripción
// son los del layout, de «Ajustes del sitio».
export const metadata: Metadata = { alternates: { canonical: '/' } }

/**
 * La portada (DESIGN.md, Layout: Home): el directo si lo hay (el worker de Twitch de Torre, en
 * caché un minuto: loadLiveState), el hero con la búsqueda, qué
 * vas a encontrar, cómo es una guía, las checklists y Torre. Las cifras y las checklists son
 * las mismas de la cabecera (loadSiteCounts, loadChecklistNav), así que nunca discrepan. Los
 * textos son de «Portada e índices», las redes de Torre de «Ajustes del sitio» y las secciones
 * de «Navegación»: se leen en el servidor y no suman JavaScript.
 */
export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const [counts, checklists, { home }, settings, nav, live] = await Promise.all([
    loadSiteCounts(),
    loadChecklistNav(),
    loadIndexTexts(),
    loadSiteSettings(),
    loadNavigation(),
    liveState(params.directo, process.env, loadLiveState),
  ])
  const { socials } = settings
  return (
    <main id="contenido" className="home">
      {/* El sitio y su búsqueda (/buscar?q=) para los buscadores (AGENTS.md, SEO). */}
      <JsonLd
        data={websiteJsonLd({
          siteUrl: SITE_URL,
          siteName: settings.name,
          description: settings.description,
        })}
      />
      <LiveStrip live={live} twitch={socials.twitch} />
      <Hero texts={home} />
      <Areas counts={counts} texts={home.areas} sections={nav.sections} />
      <GuideTour texts={home.tour} />
      <ChecklistsSection checklists={checklists} texts={home.checklists} />
      <Author live={live} texts={home.author} socials={socials} />
    </main>
  )
}
