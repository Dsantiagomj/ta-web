import type { SearchEntry, SearchType } from './nav'

export interface SearchGroup {
  type: SearchType
  items: SearchEntry[]
}

const ORDER: SearchType[] = ['seccion', 'dofus', 'checklist', 'clase', 'mazmorra']

/** Sin tildes ni mayúsculas: «ebano» encuentra «Dofus Ébano». */
export const fold = (text: string) =>
  text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()

/** Filtra el índice de la cabecera y lo agrupa por tipo, en el orden del menú. */
export function searchNav(index: SearchEntry[], query: string): SearchGroup[] {
  const words = fold(query).split(/\s+/).filter(Boolean)
  if (words.length === 0) return []
  const found = index.filter((entry) => {
    const name = fold(entry.name)
    return words.every((word) => name.includes(word))
  })
  return ORDER.map((type) => ({ type, items: found.filter((e) => e.type === type) })).filter(
    (group) => group.items.length > 0,
  )
}
