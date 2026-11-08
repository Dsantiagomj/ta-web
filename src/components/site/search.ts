// El motor de la búsqueda de misiones (DESIGN.md, Layout: Search): lo comparten el diálogo
// de la cabecera y la búsqueda de la portada. Sin React ni DOM. Las dos islas lo cargan con
// import() la primera vez que hace falta, a la vez que el índice de las guías: así no pesa
// en el JavaScript inicial de ninguna página (150 KB).

import { GAME_ICONS } from '@/components/game/game-icons'
import { GUIDE_SEARCH_INDEX_URL, type GuideSearchIndex } from '@/lib/search/guide-index'

import type { SearchEntry, SearchType } from './nav'
import { queryKind } from './search-query'
import { searchResultStrings } from './search-result-strings'

const s = searchResultStrings

export interface SearchGroup {
  type: SearchType
  items: SearchEntry[]
}

export interface SearchResults {
  groups: SearchGroup[]
  /** Las misiones que encajan, se vean o no. */
  questTotal: number
  /** Lo que encontró en el menú. */
  navCount: number
}

/** Hasta aquí se ven todas las misiones; con más, la línea pide seguir escribiendo. */
export const MANY_QUESTS = 50
/** Las misiones que se ven cuando encajan más de MANY_QUESTS. */
export const SHOWN_WHEN_MANY = 20

const ORDER: SearchType[] = ['seccion', 'dofus', 'checklist', 'clase', 'mazmorra']

/** Sin tildes ni mayúsculas: «ebano» encuentra «Dofus Ébano». */
export const fold = (text: string) =>
  text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()

/** Las palabras de lo buscado, ya sin tildes ni mayúsculas. */
export const words = (query: string) => fold(query).split(/\s+/).filter(Boolean)

/** Filtra el índice de la cabecera y lo agrupa por tipo, en el orden del menú. */
export function searchNav(index: SearchEntry[], query: string): SearchGroup[] {
  const terms = words(query)
  if (terms.length === 0) return []
  const found = index.filter((entry) => score(entry.name, terms) !== null)
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

// Una sola petición por página: si la portada ya pidió el índice, el diálogo usa la misma
// promesa, y al revés. Si falla, la siguiente vez se pide otra vez.
let questRequest: Promise<SearchEntry[]> | null = null

/** Pide el índice de las guías publicadas, una vez, y lo convierte en entradas. */
export function loadQuestEntries(): Promise<SearchEntry[]> {
  questRequest ??= fetch(GUIDE_SEARCH_INDEX_URL)
    .then(async (response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      return questEntries((await response.json()) as GuideSearchIndex)
    })
    .catch((error: unknown) => {
      questRequest = null
      throw error
    })
  return questRequest
}

/** Para las pruebas: olvida el índice pedido. */
export function resetQuestEntries() {
  questRequest = null
}

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * Cómo encaja un nombre, de mejor a peor: 0 si empieza por lo buscado (sin contar los signos
 * del principio, como ¡ o ¿), 1 si cada palabra empieza una palabra del nombre, 2 si solo
 * aparece dentro; null si falta alguna palabra.
 */
function score(name: string, terms: string[]): number | null {
  const folded = fold(name)
  if (!terms.every((word) => folded.includes(word))) return null
  if (folded.replace(/^[^\p{L}\p{N}]+/u, '').startsWith(terms.join(' '))) return 0
  const atWordStart = terms.every((word) =>
    new RegExp(`(?:^|[^\\p{L}\\p{N}])${escape(word)}`, 'u').test(folded),
  )
  return atWordStart ? 1 : 2
}

/**
 * Las misiones que encajan, de la que mejor a la que peor (a igualdad, la más corta y luego
 * por orden alfabético). Se ven todas hasta MANY_QUESTS; con más, las SHOWN_WHEN_MANY mejores.
 */
export function rankQuests(quests: SearchEntry[], query: string) {
  const terms = words(query)
  const matched = quests
    .map((entry) => ({ entry, score: score(entry.name, terms) }))
    .filter((m): m is { entry: SearchEntry; score: number } => m.score !== null)
    .sort(
      (a, b) =>
        a.score - b.score ||
        a.entry.name.length - b.entry.name.length ||
        a.entry.name.localeCompare(b.entry.name, 'es'),
    )
  const shown = matched.length > MANY_QUESTS ? SHOWN_WHEN_MANY : matched.length
  return {
    items: matched.slice(0, shown).map((m) => m.entry),
    total: matched.length,
    best: matched[0]?.score ?? null,
  }
}

/**
 * La búsqueda del diálogo: el menú y las guías de misiones. Los grupos van del que mejor
 * encaja al que peor; a igualdad, las misiones primero, que es lo que más se busca, y el
 * resto en el orden del menú. Con menos de dos letras no busca.
 */
export function searchSite(
  index: SearchEntry[],
  quests: SearchEntry[],
  query: string,
): SearchResults {
  if (queryKind(query) !== 'search') return { groups: [], questTotal: 0, navCount: 0 }
  const terms = words(query)
  const quest = rankQuests(quests, query)
  const best = (group: SearchGroup) => Math.min(...group.items.map((e) => score(e.name, terms)!))
  const groups = searchNav(index, query).map((group) => ({ group, best: best(group), rank: 1 }))
  const navCount = groups.reduce((n, g) => n + g.group.items.length, 0)
  if (quest.best !== null) {
    groups.push({ group: { type: 'mision', items: quest.items }, best: quest.best, rank: 0 })
  }
  groups.sort((a, b) => a.best - b.best || a.rank - b.rank)
  return { groups: groups.map((g) => g.group), questTotal: quest.total, navCount }
}

/** Un trozo del nombre: lo que encaja va marcado (<mark>). */
export interface HighlightPart {
  text: string
  mark: boolean
}

/**
 * El nombre en trozos, con cada aparición de cada palabra marcada. Compara sin tildes ni
 * mayúsculas y devuelve el texto original: «mision» marca «Misión». Se pinta como texto y
 * <mark>, nunca con innerHTML.
 */
export function highlight(name: string, terms: string[]): HighlightPart[] {
  // Cada carácter del nombre plegado apunta al carácter original del que sale.
  let folded = ''
  const origin: number[] = []
  Array.from(name).forEach((char, i) => {
    for (const c of fold(char) || char.toLowerCase()) {
      folded += c
      origin.push(i)
    }
  })
  const chars = Array.from(name)
  const on = chars.map(() => false)
  for (const word of terms) {
    for (let at = folded.indexOf(word); at >= 0; at = folded.indexOf(word, at + 1)) {
      for (let j = at; j < at + word.length; j++) on[origin[j]] = true
    }
  }
  const parts: HighlightPart[] = []
  chars.forEach((char, i) => {
    const last = parts.at(-1)
    if (last && last.mark === on[i]) last.text += char
    else parts.push({ text: char, mark: on[i] })
  })
  return parts
}

/** Lo que encontró, en la línea de estado: las misiones y, en el diálogo, lo del menú. */
export function questStatus(query: string, questTotal: number, navCount = 0): string {
  const nav = navCount ? s.nav(navCount) : ''
  if (questTotal === 0) return nav ? s.noneWithNav(nav) : s.none(query.trim())
  const head = questTotal > MANY_QUESTS ? s.many(MANY_QUESTS) : s.count(questTotal)
  return nav ? `${head} · ${nav}` : head
}

export type GuidesState = 'idle' | 'loading' | 'ready' | 'error'

/**
 * La línea de estado (role="status"), la misma en el diálogo y en la portada. Los textos de
 * pedir otra letra, de carga y de error llegan de la isla (search-strings.ts), que los pinta
 * antes de que llegue este módulo. Mientras cargan las misiones, la nota sale también antes
 * de escribir nada (DESIGN.md, Search).
 */
export function searchStatus({
  query,
  guides,
  questTotal,
  navCount,
  notes,
}: {
  query: string
  guides: GuidesState
  questTotal: number
  navCount: number
  notes: { hint: string; guidesLoading: string; guidesError: string }
}): string {
  const kind = queryKind(query)
  if (kind === 'hint') return notes.hint
  if (guides === 'error') return notes.guidesError
  if (guides !== 'ready') return kind === 'empty' && guides === 'idle' ? '' : notes.guidesLoading
  return kind === 'empty' ? '' : questStatus(query, questTotal, navCount)
}
