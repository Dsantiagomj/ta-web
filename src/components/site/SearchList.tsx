import type { ReactNode } from 'react'

import type { SearchEntry } from './nav'
import type { SearchGroup } from './search'
import { searchResultStrings as s } from './search-result-strings'
import { StaticImg } from './StaticImg'

export { loadQuestEntries, searchSite, searchStatus } from './search'

/**
 * Los resultados del diálogo de búsqueda: sin texto, las secciones («Ir a»); con texto, los
 * grupos que encontró. La isla de la cabecera carga este módulo con import() al abrir la
 * búsqueda, junto con search.ts, para no sumar peso a las páginas de guía. El icono de la
 * puerta llega de la isla: si este módulo importara icons.tsx, la isla lo descargaría entero.
 */
export function SearchList({
  index,
  groups,
  query,
  door,
}: {
  index: SearchEntry[]
  groups: SearchGroup[]
  query: string
  door: ReactNode
}) {
  const shown = query.trim()
    ? groups
    : [{ type: 'seccion' as const, items: index.filter((e) => e.type === 'seccion') }]
  return (
    <div className="sdlg__list">
      {shown.map((group) => (
        <section key={group.type} aria-labelledby={`buscar-g-${group.type}`}>
          <h2 className="sdlg__h" id={`buscar-g-${group.type}`}>
            {query.trim() ? s.types[group.type] : s.goTo}
          </h2>
          <ul role="list">
            {group.items.map((item) => (
              <li key={item.href + item.name}>
                <a href={item.href}>
                  <span className="site-well" aria-hidden="true">
                    {item.image ? (
                      <StaticImg src={item.image.src} width={26} height={26} alt="" />
                    ) : (
                      door
                    )}
                  </span>
                  <span className="sdlg__t">
                    <span>{item.name}</span>
                    {item.detail && <span className="sdlg__d">{item.detail}</span>}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
