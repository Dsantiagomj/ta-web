import { GAME_ICONS } from '@/components/game/game-icons'
import type { GuideSearchIndex } from '@/lib/search/guide-index'

import type { SearchEntry, SearchType } from './nav'
import { siteShellStrings } from './strings'

const s = siteShellStrings.searchDialog

export interface SearchGroup {
  type: SearchType
  items: SearchEntry[]
}

export interface SearchResults {
  groups: SearchGroup[]
  /** Lo que encontró en total, misiones que no se ven incluidas. */
  found: number
  /** Las misiones que encajan, se vean o no. */
  questTotal: number
}

/** Las misiones que se ven a la vez: el resto se cuenta en la línea de estado. */
export const QUEST_RESULTS_LIMIT = 10

const ORDER: SearchType[] = ['seccion', 'dofus', 'checklist', 'clase', 'mazmorra']

/** Sin tildes ni mayúsculas: «ebano» encuentra «Dofus Ébano». */
export const fold = (text: string) =>
  text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()

const words = (query: string) => fold(query).split(/\s+/).filter(Boolean)

/** Filtra el índice de la cabecera y lo agrupa por tipo, en el orden del menú. */
export function searchNav(index: SearchEntry[], query: string): SearchGroup[] {
  const terms = words(query)
  if (terms.length === 0) return []
  const found = index.filter((entry) => {
    const name = fold(entry.name)
    return terms.every((word) => name.includes(word))
  })
  return ORDER.map((type) => ({ type, items: found.filter((e) => e.type === type) })).filter(
    (group) => group.items.length > 0,
  )
}

/** Las guías del índice del servidor como entradas de la búsqueda, con su segunda línea. */
export function questEntries(index: GuideSearchIndex): SearchEntry[] {
  if (!Array.isArray(index?.guides)) throw new Error('Índice de guías no válido')
  return index.guides.map((row) => {
    const [name, slug, achievement, level] = row
    if (typeof name !== 'string' || typeof slug !== 'string') {
      throw new Error('Guía no válida en el índice')
    }
    const detail = [level != null ? s.level(level) : null, achievement].filter(Boolean).join(' · ')
    return {
      type: 'mision',
      name,
      href: `/${slug}`,
      image: GAME_ICONS.quest,
      ...(detail && { detail }),
    }
  })
}

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * Cómo encaja un nombre, de mejor a peor: 0 si empieza por lo buscado, 1 si cada palabra
 * empieza una palabra del nombre, 2 si solo aparece dentro; null si falta alguna palabra.
 */
function score(name: string, terms: string[]): number | null {
  const folded = fold(name)
  if (!terms.every((word) => folded.includes(word))) return null
  if (folded.startsWith(terms.join(' '))) return 0
  const atWordStart = terms.every((word) =>
    new RegExp(`(?:^|[^\\p{L}\\p{N}])${escape(word)}`, 'u').test(folded),
  )
  return atWordStart ? 1 : 2
}

/**
 * La búsqueda de la cabecera: el menú y las guías de misiones. Las misiones se ordenan por
 * cómo encajan (y, a igualdad, de la más corta a la más larga y por orden alfabético), y se
 * ven las QUEST_RESULTS_LIMIT primeras. Los grupos van del que mejor encaja al que peor; a
 * igualdad, las misiones primero, que es lo que más se busca, y el resto en el orden del menú.
 */
export function searchSite(
  index: SearchEntry[],
  quests: SearchEntry[],
  query: string,
): SearchResults {
  const terms = words(query)
  if (terms.length === 0) return { groups: [], found: 0, questTotal: 0 }

  const matched = quests
    .map((entry) => ({ entry, score: score(entry.name, terms) }))
    .filter((m): m is { entry: SearchEntry; score: number } => m.score !== null)
    .sort(
      (a, b) =>
        a.score - b.score ||
        a.entry.name.length - b.entry.name.length ||
        a.entry.name.localeCompare(b.entry.name, 'es'),
    )

  const best = (group: SearchGroup) => Math.min(...group.items.map((e) => score(e.name, terms)!))
  const groups = searchNav(index, query).map((group) => ({ group, best: best(group), rank: 1 }))
  if (matched.length > 0) {
    groups.push({
      group: { type: 'mision', items: matched.slice(0, QUEST_RESULTS_LIMIT).map((m) => m.entry) },
      best: matched[0].score,
      rank: 0,
    })
  }
  groups.sort((a, b) => a.best - b.best || a.rank - b.rank)

  const navFound = groups.reduce((n, g) => n + (g.rank === 1 ? g.group.items.length : 0), 0)
  return {
    groups: groups.map((g) => g.group),
    found: navFound + matched.length,
    questTotal: matched.length,
  }
}

export type GuidesState = 'idle' | 'loading' | 'ready' | 'error'

/** La línea de estado del diálogo (role="status"): cuántos hay, si cargan las misiones o si fallaron. */
export function searchStatus({
  query,
  found,
  questTotal,
  guides,
}: {
  query: string
  found: number
  questTotal: number
  guides: GuidesState
}): string {
  const q = query.trim()
  const failed = guides === 'error' ? s.guidesError : ''
  if (!q) return failed
  const loading = guides === 'loading' || guides === 'idle'
  const parts = [
    found > 0 ? s.found(found) : loading ? '' : s.none(q),
    loading
      ? s.guidesLoading
      : questTotal > QUEST_RESULTS_LIMIT
        ? s.moreQuests(QUEST_RESULTS_LIMIT, questTotal)
        : '',
    failed,
  ].filter(Boolean)
  return parts
    .map((part, i) => (i < parts.length - 1 && !/[.…]$/.test(part) ? `${part}.` : part))
    .join(' ')
}
