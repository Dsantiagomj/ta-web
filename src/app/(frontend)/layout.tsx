import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import type { ReactNode } from 'react'

import { SiteFooter } from '@/components/site/SiteFooter'
import { TOP_ANCHOR } from '@/components/site/nav'
import { SiteHeader } from '@/components/site/SiteHeader'
import { modeScript } from '@/lib/theme/mode-script'
import { MODE_COOKIE, resolveMode, resolveTheme } from '@/lib/theme/theme'
import { SITE_URL } from '@/lib/site/origin'
import { fontVariables } from '@/styles/fonts'
import '@/styles/globals.css'

import { loadChecklistNav, loadDofusNav, loadSiteCounts } from './site-data'
import { siteStrings } from './strings'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: siteStrings.brand,
  description: siteStrings.description,
}

export default async function FrontendLayout({ children }: { children: ReactNode }) {
  const mode = resolveMode((await cookies()).get(MODE_COOKIE)?.value)
  // Todavía no hay miembros: nadie tiene el derecho a un tema premium.
  const theme = resolveTheme(undefined, { premium: false })
  const [counts, dofus, checklists] = await Promise.all([
    loadSiteCounts(),
    loadDofusNav(),
    loadChecklistNav(),
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
        <SiteHeader counts={counts} dofus={dofus} checklists={checklists} initialMode={mode} />
        {children}
        <SiteFooter year={new Date().getFullYear()} />
      </body>
    </html>
  )
}
