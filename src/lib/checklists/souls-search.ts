// El buscador de una checklist de almas (el Ocre). Un alma se busca por su monstruo, su mazmorra
// (solo los jefes tienen), su zona, su región o su nivel: un número es un nivel («55», «nv. 55»)
// y dos, un rango («100-150», «100 a 150»). Lo demás se busca en el texto, sin acentos ni
// mayúsculas (SoulView.search). Lo usa la isla (souls-ui.ts); sin dependencias, va en su JS.
import { fold } from '@/lib/text/fold'

/** Lo escrito: un texto ya plegado, o un rango de niveles. Null sin nada escrito. */
export type SoulQuery = string | { min: number; max: number } | null

const LEVELS = /^(?:nv\.?|nivel)?\s*(\d{1,3})(?:\s*(?:-|–|—|a)\s*(\d{1,3}))?$/

export function soulQuery(raw: string): SoulQuery {
  const text = fold(raw.trim())
  if (!text) return null
  const levels = LEVELS.exec(text)
  if (!levels) return text
  const from = Number(levels[1])
  const to = levels[2] === undefined ? from : Number(levels[2])
  return { min: Math.min(from, to), max: Math.max(from, to) }
}

export function soulMatches(
  query: SoulQuery,
  soul: { search: string; level: number | null },
): boolean {
  if (query === null) return true
  if (typeof query === 'string') return soul.search.includes(query)
  return soul.level !== null && soul.level >= query.min && soul.level <= query.max
}
