// Lo mínimo para saber si un texto ya se busca, sin cargar el motor (search.ts): lo usan la
// búsqueda de la portada antes de que llegue el motor y el propio motor. Es pequeño a
// propósito, porque viaja en el JavaScript inicial de la portada.

/** Letras o cifras que hacen falta para buscar; con menos, se pide otra. */
export const MIN_QUERY = 2

export type QueryKind = 'empty' | 'hint' | 'search'

/** Vacío, una sola letra (se pide otra) o ya se busca. Los espacios y signos no cuentan. */
export function queryKind(query: string): QueryKind {
  if (!query.trim()) return 'empty'
  return query.replace(/[^\p{L}\p{N}]/gu, '').length < MIN_QUERY ? 'hint' : 'search'
}
