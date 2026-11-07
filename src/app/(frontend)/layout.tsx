import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import type { ReactNode } from 'react'

import { SiteFooter } from '@/components/site/SiteFooter'
import { SiteHeader } from '@/components/site/SiteHeader'
import { modeScript } from '@/lib/theme/mode-script'
import { MODE_COOKIE, resolveMode, resolveTheme } from '@/lib/theme/theme'
import { fontVariables } from '@/styles/fonts'
import '@/styles/globals.css'

import { loadSiteCounts } from './site-data'
import { siteStrings } from './strings'

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  title: siteStrings.brand,
  description: siteStrings.description,
}

export default async function FrontendLayout({ children }: { children: ReactNode }) {
  const mode = resolveMode((await cookies()).get(MODE_COOKIE)?.value)
  // Todavía no hay miembros: nadie tiene el derecho a un tema premium.
  const theme = resolveTheme(undefined, { premium: false })
  const counts = await loadSiteCounts()

  return (
    <html
      lang="es"
      data-theme={theme}
      data-mode={mode}
      className={fontVariables}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: modeScript }} />
      </head>
      <body>
        <SiteHeader counts={counts} initialMode={mode} />
        {children}
        <SiteFooter year={new Date().getFullYear()} />
      </body>
    </html>
  )
}
