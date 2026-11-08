import type { SearchEntry } from '@/components/site/nav'
import { highlight, words } from '@/components/site/search'

import { optionId } from './hero-search-strings'

export { loadQuestEntries, questStatus, rankQuests } from '@/components/site/search'

/**
 * Las opciones de la búsqueda de la portada, con lo que encaja en <mark> (texto, nunca
 * innerHTML). Su isla carga este módulo con import() junto con el motor, la primera vez que
 * el campo recibe el foco: así las filas no pesan en el JavaScript inicial de la portada.
 * Al pasar el ratón, una opción pasa a ser la activa; un clic la abre, y con Ctrl, Cmd o la
 * rueda, en otra pestaña.
 */
export function HeroOptions({
  items,
  query,
  active,
  onActive,
  onPick,
}: {
  items: SearchEntry[]
  query: string
  active: number
  onActive: (i: number) => void
  onPick: (entry: SearchEntry, newTab: boolean) => void
}) {
  const terms = words(query)
  return items.map((entry, i) => (
    <li
      key={entry.href}
      id={optionId(i)}
      role="option"
      aria-selected={i === active}
      onPointerMove={() => i !== active && onActive(i)}
      onClick={(event) => onPick(entry, event.ctrlKey || event.metaKey)}
      onAuxClick={(event) => event.button === 1 && onPick(entry, true)}
    >
      <span className="cbx__w" aria-hidden="true">
        {entry.image && (
          // eslint-disable-next-line @next/next/no-img-element -- icono estático en WebP
          <img src={entry.image.src} width={26} height={26} alt="" decoding="async" />
        )}
      </span>
      <span className="cbx__x">
        <span className="cbx__n">
          {highlight(entry.name, terms).map((part, j) =>
            part.mark ? (
              <mark key={j} className="hit">
                {part.text}
              </mark>
            ) : (
              part.text
            ),
          )}
        </span>
        {entry.detail && <span className="cbx__d">{entry.detail}</span>}
      </span>
    </li>
  ))
}
