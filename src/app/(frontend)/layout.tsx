import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import Link from 'next/link'
import type { ReactNode } from 'react'

import { ModeToggle } from '@/components/mode-toggle/ModeToggle'
import { modeScript } from '@/lib/theme/mode-script'
import { MODE_COOKIE, resolveMode, resolveTheme } from '@/lib/theme/theme'
import { fontVariables } from '@/styles/fonts'
import '@/styles/globals.css'

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
        <header className="mx-auto flex h-16 max-w-(--width-wide) items-center justify-between gap-4 px-4 sm:px-6 lg:px-12">
          <Link
            href="/"
            className="font-display text-xl font-bold tracking-[0.02em] text-ink uppercase no-underline"
          >
            {siteStrings.brand}
          </Link>
          <ModeToggle initialMode={mode} />
        </header>
        {children}
      </body>
    </html>
  )
}
