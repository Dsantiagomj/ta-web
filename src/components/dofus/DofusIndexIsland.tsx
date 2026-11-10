'use client'

import { useId, useState } from 'react'

import { smoothUpdate } from '@/components/ui/view-transition'
import { matchesDofus, type DofusFilter, type DofusTag } from '@/lib/dofus-guides/index-view'
import { dofusIndexStrings as s } from '@/lib/dofus-guides/strings'

const SEARCH_ICON = (
  <svg viewBox="0 0 20 20" aria-hidden="true">
    <circle cx="8.5" cy="8.5" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
    <path
      d="m13 13 4 4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
  </svg>
)

/**
 * Esconde las tarjetas que no pasan la búsqueda y el filtro, dentro de una transición de
 * vista: las que se van se funden y las que quedan se deslizan a su sitio (DESIGN.md,
 * Motion). Las tarjetas las pinta el servidor; esto solo cambia su atributo hidden.
 * Devuelve cuántas quedan.
 */
function applyFilter(query: string, filter: DofusFilter): number {
  const cells = document.querySelectorAll<HTMLElement>('[data-dofus-grid] > .dcard-cell')
  const visible = [...cells].map((cell) =>
    matchesDofus(
      { search: cell.dataset.search ?? '', tag: (cell.dataset.tag || undefined) as DofusTag },
      query,
      filter,
    ),
  )
  smoothUpdate(() => {
    cells.forEach((cell, index) => {
      cell.hidden = !visible[index]
    })
  }, 'guias-dofus')
  return visible.filter(Boolean).length
}

/**
 * El buscador y los filtros del índice (Todos, Primordiales, Evento). Solo existen con
 * JavaScript; el aviso de cuántas quedan habla solo mientras hay una búsqueda o un filtro.
 */
export function DofusIndexIsland({ filters }: { filters: DofusFilter[] }) {
  const id = useId()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<DofusFilter>('all')
  const [shown, setShown] = useState<number | null>(null)

  function update(nextQuery: string, nextFilter: DofusFilter) {
    setQuery(nextQuery)
    setFilter(nextFilter)
    const count = applyFilter(nextQuery, nextFilter)
    setShown(nextQuery.trim() || nextFilter !== 'all' ? count : null)
  }

  const status = shown === null ? '' : shown === 0 ? s.none(query.trim()) : s.found(shown)

  return (
    <div className="dg-tools">
      <label className="dg-search" htmlFor={`${id}-q`}>
        {SEARCH_ICON}
        <span className="sr-only">{s.searchLabel}</span>
        <input
          id={`${id}-q`}
          type="search"
          placeholder={s.search}
          autoComplete="off"
          value={query}
          onChange={(event) => update(event.target.value, filter)}
        />
      </label>
      {filters.length > 0 && (
        <div
          className="dg-seg"
          role="group"
          aria-label={s.filtersLabel}
          data-count={filters.length}
        >
          {filters.map((key) => (
            <button
              key={key}
              type="button"
              className="dg-pill"
              aria-pressed={filter === key}
              onClick={() => update(query, key)}
            >
              {s.filters[key]}
            </button>
          ))}
          <span className="dg-seg__ind" aria-hidden="true" />
        </div>
      )}
      <p className="dg-count" role="status">
        {status}
      </p>
    </div>
  )
}
