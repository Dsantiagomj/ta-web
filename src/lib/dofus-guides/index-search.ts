// La búsqueda y los filtros del índice de las guías de Dofus: código puro y sin dependencias,
// porque viaja con la isla del índice (DofusIndexIsland). index-view.ts lo reexporta.

export type DofusTag = 'primordial' | 'event'
export type DofusFilter = 'all' | DofusTag

/** Minúsculas y sin tildes, para buscar como se escribe. */
export const foldText = (text: string) =>
  text.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('es').trim()

/**
 * Si una tarjeta pasa el filtro y la búsqueda: cada palabra buscada, sin tildes, está en su
 * nombre o en sus otros nombres (search ya viene sin tildes).
 */
export function matchesDofus(
  card: { search: string; tag?: DofusTag },
  query: string,
  filter: DofusFilter,
): boolean {
  if (filter !== 'all' && card.tag !== filter) return false
  const words = foldText(query).split(/\s+/).filter(Boolean)
  return words.every((word) => card.search.includes(word))
}
