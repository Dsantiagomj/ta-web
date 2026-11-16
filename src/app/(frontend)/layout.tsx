import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import type { ReactNode } from 'react'

import { Ambience } from '@/components/site/Ambience'
import { SiteFooter } from '@/components/site/SiteFooter'
import { legalLinks, TOP_ANCHOR } from '@/components/site/nav'
import { SiteHeader } from '@/components/site/SiteHeader'
import { modeScript } from '@/lib/theme/mode-script'
import { MODE_COOKIE, resolveMode, resolveTheme } from '@/lib/theme/theme'
import { SITE_URL } from '@/lib/site/origin'
import { siteMetadata } from '@/lib/site-copy/metadata'
import { fontVariables } from '@/styles/fonts'
import '@/styles/globals.css'

import {
  loadChecklistNav,
  loadDofusNav,
  loadNavigation,
  loadPageNav,
  loadSiteCounts,
  loadSiteSettings,
} from './site-data'

// El nombre, la descripción y la imagen al compartir son de «Ajustes del sitio».
export async function generateMetadata(): Promise<Metadata> {
  return { metadataBase: new URL(SITE_URL), ...siteMetadata(await loadSiteSettings()) }
}

export default async function FrontendLayout({ children }: { children: ReactNode }) {
  const mode = resolveMode((await cookies()).get(MODE_COOKIE)?.value)
  // Todavía no hay miembros: nadie tiene el derecho a un tema premium.
  const theme = resolveTheme(undefined, { premium: false })
  const [counts, dofus, checklists, pages, settings, nav] = await Promise.all([
    loadSiteCounts(),
    loadDofusNav(),
    loadChecklistNav(),
    loadPageNav(),
    loadSiteSettings(),
    loadNavigation(),
  ])

  // data-scroll-behavior: el desplazamiento suave (globals.css) es para las anclas de la
  // página; Next lo apaga al cambiar de ruta, que salta arriba sin animación.
  return (
    <html
      lang="es"
      data-theme={theme}
      data-mode={mode}
      data-scroll-behavior="smooth"
      className={fontVariables}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: modeScript }} />
      </head>
      <body id={TOP_ANCHOR}>
        <SiteHeader
          counts={counts}
          dofus={dofus}
          checklists={checklists}
          pages={pages}
          initialMode={mode}
          socials={settings.socials}
          sections={nav.sections}
          featured={nav.featured}
        />
        {children}
        <SiteFooter
          year={new Date().getFullYear()}
          legal={legalLinks(pages)}
          settings={settings}
          sections={nav.sections}
        />
        <Ambience />
      </body>
    </html>
  )
}
