// El motor de la búsqueda de misiones y logros (DESIGN.md, Layout: Search): lo comparten el
// diálogo de la cabecera y la búsqueda de la portada. Sin React ni DOM. Las dos islas lo
// cargan con import() la primera vez que hace falta, a la vez que el índice de la búsqueda:
// así no pesa en el JavaScript inicial de ninguna página (150 KB).

import { GAME_ICONS } from '@/components/game/game-icons'
import { GUIDE_SEARCH_INDEX_URL, type SearchIndex } from '@/lib/search/guide-index'

import type { SearchEntry, SearchType } from './nav'
import { queryKind } from './search-query'
import { searchResultStrings } from './search-result-strings'

const s = searchResultStrings

export interface SearchGroup {
  type: SearchType
  items: SearchEntry[]
}

/** Lo que llega del índice del servidor, ya como entradas de la búsqueda. */
export interface SiteEntries {
  quests: SearchEntry[]
  achievements: SearchEntry[]
  metalogros: SearchEntry[]
}

/** Lo que se busca en el índice del servidor, cada cosa en su grupo. */
type FoundType = 'mision' | 'logro' | 'metalogro'

export interface SearchResults {
  groups: SearchGroup[]
  /** Las misiones, los logros y los metalogros que encajan, se vean o no. */
  totals: Record<FoundType, number>
  /** Lo que encontró en el menú. */
  navCount: number
}

/** Lo que busca la portada: lo del servidor, sin el menú, y en una lista para el teclado. */
export interface HeroResults {
  groups: SearchGroup[]
  /** Las opciones en el orden en que se ven: las flechas las recorren así. */
  items: SearchEntry[]
  status: string
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

// Un metalogro se abre en su panel del índice (src/lib/achievements/page.ts, metalogroHref).
const METALOGROS_PATH = '/metalogros'

/** Las filas opcionales del índice: si están, tienen que ser una lista. */
const rows = <T>(value: T[] | undefined, what: string): T[] => {
  if (value === undefined) return []
  if (!Array.isArray(value)) throw new Error(`Índice de ${what} no válido`)
  return value
}

/**
 * El índice del servidor como entradas de la búsqueda, con su segunda línea: las guías, las
 * páginas de logro publicadas y los metalogros que se abren.
 */
export function siteEntries(index: SearchIndex): SiteEntries {
  if (!Array.isArray(index?.guides)) throw new Error('Índice de guías no válido')
  const achievements = rows(index.achievements, 'logros').map((row): SearchEntry => {
    const [name, slug, group, quests] = row
    if (typeof name !== 'string' || typeof slug !== 'string' || typeof group !== 'string') {
      throw new Error('Logro no válido en el índice')
    }
    const detail = [group, typeof quests === 'number' && quests ? s.count(quests) : null]
      .filter(Boolean)
      .join(' · ')
    return {
      type: 'logro',
      name,
      href: `/${slug}`,
      image: GAME_ICONS.achievement,
      ...(detail && { detail }),
    }
  })
  const metalogros = rows(index.metalogros, 'metalogros').map((row): SearchEntry => {
    const [name, anchor, counts] = row
    if (typeof name !== 'string' || typeof anchor !== 'string') {
      throw new Error('Metalogro no válido en el índice')
    }
    return {
      type: 'metalogro',
      name,
      href: `${METALOGROS_PATH}#${anchor}`,
      image: GAME_ICONS.achievement,
      ...(typeof counts === 'string' && counts && { detail: counts }),
    }
  })
  return { quests: questEntries(index.guides), achievements, metalogros }
}

/** Las guías del índice del servidor como entradas de la búsqueda, con su segunda línea. */
function questEntries(guides: SearchIndex['guides']): SearchEntry[] {
  return guides.map((row) => {
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
let request: Promise<SiteEntries> | null = null

/** Pide el índice de la búsqueda, una vez, y lo convierte en entradas. */
export function loadEntries(): Promise<SiteEntries> {
  request ??= fetch(GUIDE_SEARCH_INDEX_URL)
    .then(async (response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      return siteEntries((await response.json()) as SearchIndex)
    })
    .catch((error: unknown) => {
      request = null
      throw error
    })
  return request
}

/** Para las pruebas: olvida el índice pedido. */
export function resetEntries() {
  request = null
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
 * Lo que encaja, de lo que mejor a lo que peor (a igualdad, lo más corto y luego por orden
 * alfabético). Se ve todo hasta MANY_QUESTS; con más, lo SHOWN_WHEN_MANY mejor.
 */
function rank(entries: SearchEntry[], query: string) {
  const terms = words(query)
  const matched = entries
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

// Los grupos del índice del servidor, en su orden a igualdad: lo que más se busca primero.
const FOUND: [FoundType, keyof SiteEntries][] = [
  ['mision', 'quests'],
  ['logro', 'achievements'],
  ['metalogro', 'metalogros'],
]

type Ranked = { group: SearchGroup; best: number; rank: number }

/** Las misiones, los logros y los metalogros que encajan, cada cosa en su grupo. */
function rankFound(entries: SiteEntries | undefined, query: string) {
  const totals: Record<FoundType, number> = { mision: 0, logro: 0, metalogro: 0 }
  const groups: Ranked[] = []
  FOUND.forEach(([type, key], rankIndex) => {
    const found = rank(entries?.[key] ?? [], query)
    totals[type] = found.total
    if (found.best !== null) {
      groups.push({ group: { type, items: found.items }, best: found.best, rank: rankIndex })
    }
  })
  return { groups, totals }
}

const byScore = (a: Ranked, b: Ranked) => a.best - b.best || a.rank - b.rank

/**
 * La búsqueda del diálogo: el menú, las guías de misiones, las páginas de logro y los
 * metalogros. Los grupos van del que mejor encaja al que peor; a igualdad, las misiones
 * primero, que es lo que más se busca, luego los logros, los metalogros y el resto en el
 * orden del menú. Con menos de dos letras no busca.
 */
export function searchSite(
  index: SearchEntry[],
  entries: SiteEntries | undefined,
  query: string,
): SearchResults {
  if (queryKind(query) !== 'search') {
    return { groups: [], totals: { mision: 0, logro: 0, metalogro: 0 }, navCount: 0 }
  }
  const terms = words(query)
  const best = (group: SearchGroup) => Math.min(...group.items.map((e) => score(e.name, terms)!))
  const found = rankFound(entries, query)
  const nav = searchNav(index, query).map((group) => ({
    group,
    best: best(group),
    rank: FOUND.length,
  }))
  const navCount = nav.reduce((n, g) => n + g.group.items.length, 0)
  const groups = [...found.groups, ...nav].sort(byScore)
  return { groups: groups.map((g) => g.group), totals: found.totals, navCount }
}

/** La búsqueda de la portada: lo mismo sin el menú, con su línea de estado. */
export function heroResults(entries: SiteEntries, query: string): HeroResults {
  const found = rankFound(entries, query)
  const groups = found.groups.sort(byScore).map((g) => g.group)
  return {
    groups,
    items: groups.flatMap((group) => group.items),
    status: questStatus(query, found.totals),
  }
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

/**
 * Lo que encontró, en la línea de estado: las misiones, los logros, los metalogros y, en el
 * diálogo, lo del menú. Sin misiones ni logros, lo del menú va tras «Ninguna misión».
 */
function questStatus(query: string, totals: Record<FoundType, number>, navCount = 0): string {
  const nav = navCount ? s.nav(navCount) : ''
  const quests = totals.mision
  const parts = [
    quests ? (quests > MANY_QUESTS ? s.many(MANY_QUESTS) : s.count(quests)) : '',
    totals.logro ? s.achievements(totals.logro) : '',
    totals.metalogro ? s.metalogros(totals.metalogro) : '',
  ].filter(Boolean)
  if (parts.length === 0) return nav ? s.noneWithNav(nav) : s.none(query.trim())
  return [...parts, nav].filter(Boolean).join(' · ')
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
  results,
  notes,
}: {
  query: string
  guides: GuidesState
  results?: SearchResults
  notes: { hint: string; guidesLoading: string; guidesError: string }
}): string {
  const kind = queryKind(query)
  if (kind === 'hint') return notes.hint
  if (guides === 'error') return notes.guidesError
  if (guides !== 'ready') return kind === 'empty' && guides === 'idle' ? '' : notes.guidesLoading
  if (kind === 'empty') return ''
  return questStatus(
    query,
    results?.totals ?? { mision: 0, logro: 0, metalogro: 0 },
    results?.navCount ?? 0,
  )
}
