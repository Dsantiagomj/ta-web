import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { connection } from 'next/server'

import { PageEnhancements } from '@/components/game/PageEnhancements'
import { isDesignCatalogEnabled } from '@/lib/dev-gate/design-catalog'
import { MODES, THEMES } from '@/lib/theme/theme'

import { CatalogSection } from './CatalogSection'
import { catalogStrings as s } from './strings'

export const metadata: Metadata = {
  title: s.metaTitle,
  robots: { index: false, follow: false },
}

/**
 * Catálogo de componentes (DESIGN.md, Component catalog): cada componente en los cinco
 * temas y los dos modos. 404 en producción. ?tema= y ?modo= dejan una sola sección, para
 * las capturas.
 */
export default async function DesignCatalogPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  // Se decide en cada petición, nunca en el build: el mismo build sirve E2E y producción.
  await connection()
  if (!isDesignCatalogEnabled(process.env)) notFound()

  const { tema, modo } = await searchParams
  const themes = THEMES.filter((theme) => !tema || theme === tema)
  const modes = MODES.filter((mode) => !modo || mode === modo)

  return (
    <main id="contenido">
      <div className="mx-auto max-w-(--width-page) px-4 py-12 sm:px-6 lg:px-12">
        <h1 className="font-display text-4xl text-ink">{s.title}</h1>
        <p className="mt-3 max-w-[72ch] text-lg text-ink-2">{s.lead}</p>
        <nav aria-label={s.jump} className="mt-6">
          <ul className="flex flex-wrap gap-2" role="list">
            {themes.flatMap((theme) =>
              modes.map((mode) => (
                <li key={`${theme}-${mode}`}>
                  <a href={`#${theme}-${mode}`} className="text-sm">
                    {s.section(s.themes[theme], s.modes[mode])}
                  </a>
                </li>
              )),
            )}
          </ul>
        </nav>
      </div>
      {themes.flatMap((theme) =>
        modes.map((mode) => <CatalogSection key={`${theme}-${mode}`} theme={theme} mode={mode} />),
      )}
      <PageEnhancements />
    </main>
  )
}
