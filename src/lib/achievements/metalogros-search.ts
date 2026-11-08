// La búsqueda del índice de metalogros (DESIGN.md, Metalogros index): zonas, logros y
// misiones, sin tildes ni mayúsculas, con todas las palabras en cualquier orden. Código puro:
// lo usan la isla del índice y sus pruebas. Los textos salen de metalogrosStrings.

import { metalogrosStrings as s } from './strings'

/**
 * Lo que busca el índice, compacto para ir en la página: zonas [nombre, ancla, recuentos,
 * apagada], logros [nombre, zona, enlace, misiones, apagado] y misiones [nombre, posición,
 * índice de su logro]. «Apagado» (1) es lo que está En preparación: sale, pero no se elige.
 */
export interface IndexSearchData {
  z: ([string, string, string] | [string, string, string, 1])[]
  a: ([string, string, string, number] | [string, string, string, number, 1])[]
  q: [string, number, number][]
}

export interface IndexSearchResult {
  kind: 'zone' | 'achievement' | 'quest'
  name: string
  /** «#astrub» para una zona (abre su panel); la página del logro para el resto. */
  href: string
  meta: string
  /** En preparación: se lista sin poder elegirse. */
  off: boolean
}

// Las palabras pequeñas no tienen que coincidir («misiones del mundo» encuentra «Misiones de
// Mundo»), salvo que la búsqueda no tenga otras.
const STOPWORDS = new Set(['de', 'del', 'la', 'las', 'el', 'los', 'y', 'a', 'en'])

const MAX = { z: 4, a: 7, q: 7 }

// Un carácter cada vez, para que el texto plegado mida lo mismo que el original.
function foldChar(char: string): string {
  const folded = char
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
  return folded.length === 1 ? folded : char.toLowerCase()
}

const fold = (text: string) => Array.from(text).map(foldChar).join('')

/** Las palabras de la búsqueda, plegadas y sin las pequeñas (salvo que no haya otras). */
export function searchWords(query: string): string[] {
  const all = fold(query.trim()).split(/\s+/).filter(Boolean)
  const words = all.filter((word) => !STOPWORDS.has(word))
  return words.length ? words : all
}

const matches = (text: string, words: string[]) => {
  const folded = fold(text)
  return words.every((word) => folded.includes(word))
}

/** Hasta 4 zonas, 7 logros y 7 misiones que tienen todas las palabras. */
export function searchIndex(data: IndexSearchData, query: string): IndexSearchResult[] {
  const words = searchWords(query)
  if (!words.length || query.trim().length < 2) return []
  const zones = data.z
    .filter(([name]) => matches(name, words))
    .slice(0, MAX.z)
    .map(([name, anchor, counts, off]): IndexSearchResult => ({
      kind: 'zone',
      name,
      href: `#${anchor}`,
      meta: counts,
      off: off === 1,
    }))
  const achievements = data.a
    .filter(([name]) => matches(name, words))
    .slice(0, MAX.a)
    .map(([name, zone, href, quests, off]): IndexSearchResult => ({
      kind: 'achievement',
      name,
      href,
      meta: quests ? `${zone} · ${s.quests(quests)}` : zone,
      off: off === 1,
    }))
  const quests = data.q
    .filter(([name]) => matches(name, words))
    .slice(0, MAX.q)
    .flatMap(([name, position, index]): IndexSearchResult[] => {
      const achievement = data.a[index]
      if (!achievement) return []
      return [
        {
          kind: 'quest',
          name,
          href: achievement[2],
          meta: s.questResult(position, achievement[0], achievement[1]),
          off: achievement[4] === 1,
        },
      ]
    })
  return [...zones, ...achievements, ...quests]
}

const escape = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/** El nombre en HTML escapado, con cada coincidencia en <mark> (en negrita en el CSS). */
export function markMatches(text: string, words: string[]): string {
  const chars = Array.from(text)
  const folded = chars.map(foldChar).join('')
  const on = new Array<boolean>(chars.length).fill(false)
  for (const word of words) {
    for (let at = folded.indexOf(word); at >= 0; at = folded.indexOf(word, at + word.length)) {
      for (let i = at; i < at + word.length; i += 1) on[i] = true
    }
  }
  let html = ''
  let open = false
  chars.forEach((char, i) => {
    if (on[i] && !open) html += '<mark>'
    if (!on[i] && open) html += '</mark>'
    open = on[i]!
    html += escape(char)
  })
  return open ? `${html}</mark>` : html
}
