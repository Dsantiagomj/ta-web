import type { SearchEntry } from '@/components/site/nav'
import { highlight, type SearchGroup, words } from '@/components/site/search'
import { searchResultStrings as r } from '@/components/site/search-result-strings'

import { HERO_SEARCH_ID, optionId } from './hero-search-strings'

export { heroResults, loadEntries } from '@/components/site/search'

function Option({
  entry,
  index,
  terms,
  active,
  onActive,
  onPick,
}: {
  entry: SearchEntry
  index: number
  terms: string[]
  active: number
  onActive: (i: number) => void
  onPick: (entry: SearchEntry, newTab: boolean) => void
}) {
  return (
    <li
      id={optionId(index)}
      role="option"
      aria-selected={index === active}
      onPointerMove={() => index !== active && onActive(index)}
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
  )
}

/**
 * Las opciones de la búsqueda de la portada, con lo que encaja en <mark> (texto, nunca
 * innerHTML). Su isla carga este módulo con import() junto con el motor, la primera vez que
 * el campo recibe el foco: así las filas no pesan en el JavaScript inicial de la portada.
 * Con un solo grupo van sueltas; con varios (misiones, logros, metalogros), cada uno con su
 * título, como los grupos de opciones de un listbox (ARIA APG). Las flechas las recorren
 * todas seguidas, en el orden en que se ven. Al pasar el ratón, una opción pasa a ser la
 * activa; un clic la abre, y con Ctrl, Cmd o la rueda, en otra pestaña.
 */
export function HeroOptions({
  groups,
  query,
  active,
  onActive,
  onPick,
}: {
  groups: SearchGroup[]
  query: string
  active: number
  onActive: (i: number) => void
  onPick: (entry: SearchEntry, newTab: boolean) => void
}) {
  const terms = words(query)
  let next = 0
  const options = (items: SearchEntry[]) =>
    items.map((entry) => {
      const index = next++
      return (
        <Option
          key={entry.href}
          entry={entry}
          index={index}
          terms={terms}
          active={active}
          onActive={onActive}
          onPick={onPick}
        />
      )
    })
  if (groups.length < 2) return options(groups[0]?.items ?? [])
  return groups.map((group) => {
    const id = `${HERO_SEARCH_ID}-g-${group.type}`
    return (
      <li key={group.type} role="group" aria-labelledby={id} className="cbx__g">
        <span role="presentation" id={id} className="cbx__h">
          {r.types[group.type]}
        </span>
        <ul role="none">{options(group.items)}</ul>
      </li>
    )
  })
}
