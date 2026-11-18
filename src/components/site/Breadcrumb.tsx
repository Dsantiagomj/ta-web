import type { BreadcrumbData } from '@/lib/achievements/page'

import '@/components/game/game.css'
import { uiStrings } from '../ui/strings'
import { JsonLd } from './JsonLd'

/**
 * La ruta de navegación de las páginas de logro y de guía (DESIGN.md, Breadcrumb): solo los
 * padres, porque el h1 de debajo nombra la página, con «/» entre ellos. En el móvil, solo
 * el padre directo, como enlace de vuelta «‹ Astrub». La página actual va en el JSON-LD.
 */
export function Breadcrumb({ parents, jsonLd }: BreadcrumbData) {
  return (
    <nav className="crumbs" aria-label={uiStrings.breadcrumb}>
      <ol role="list">
        {parents.map((parent, index) => (
          <li key={parent.href}>
            <a href={parent.href}>
              {index === parents.length - 1 && (
                <svg
                  className="crumbs__chev"
                  viewBox="0 0 12 12"
                  width="12"
                  height="12"
                  aria-hidden="true"
                  focusable="false"
                >
                  <path
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M7.5 2.5 4 6l3.5 3.5"
                  />
                </svg>
              )}
              {parent.name}
            </a>
          </li>
        ))}
      </ol>
      <JsonLd data={jsonLd} />
    </nav>
  )
}
