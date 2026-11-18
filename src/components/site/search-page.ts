// Lo que enseña /buscar, la búsqueda de la portada sin JavaScript: el formulario de la
// portada manda aquí el texto (?q=…) cuando la isla no ha cargado. El mismo índice, el mismo
// orden y los mismos grupos que la isla (search.ts), calculados en el servidor. Código puro.
import type { SearchIndex } from '@/lib/search/guide-index'

import { heroResults, type SearchGroup, siteEntries } from './search'
import { queryKind } from './search-query'

/** Lo más largo que se busca: un nombre de misión cabe de sobra. */
export const MAX_QUERY_LENGTH = 100

export type SearchPageView =
  | { kind: 'empty'; query: string }
  | { kind: 'short'; query: string }
  | { kind: 'results'; query: string; groups: SearchGroup[]; status: string }

/** El texto buscado de ?q=: el primero si llegan varios, sin espacios de sobra y con tope. */
export function searchPageQuery(q: string | string[] | undefined): string {
  const value = Array.isArray(q) ? q[0] : q
  return (value ?? '').trim().slice(0, MAX_QUERY_LENGTH).trim()
}

/** Si hace falta leer el índice para este texto: solo cuando ya se busca. */
export const needsIndex = (query: string) => queryKind(query) === 'search'

/**
 * Los resultados de un texto: sin texto, nada; con una letra, se pide otra; si no, los grupos
 * y la línea de estado de la portada. index solo hace falta cuando needsIndex(query).
 */
export function searchPageView(index: SearchIndex | null, query: string): SearchPageView {
  const kind = queryKind(query)
  if (kind === 'empty') return { kind: 'empty', query }
  if (kind === 'hint' || !index) return { kind: 'short', query }
  const { groups, status } = heroResults(siteEntries(index), query)
  return { kind: 'results', query, groups, status }
}
