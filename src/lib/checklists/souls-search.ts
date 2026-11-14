// El buscador de una checklist de almas (el Ocre). Un alma se busca por su monstruo, su mazmorra
// (solo los jefes tienen), su zona, su región o su nivel. Un número solo es su nivel o un trozo
// del texto («55»); con «nv.» o «nivel» delante, solo un nivel. Dos números son un rango
// («100-150», «100 a 150») y uno con el guion detrás, mientras se escribe, es «desde» («100-»).
// Lo demás se busca en el texto, sin acentos ni mayúsculas (SoulView.search). Lo usa la isla
// (souls-ui.ts); sin dependencias, va en su JS.
import { fold } from '@/lib/text/fold'

/**
 * Lo escrito: el texto plegado que se busca (vacío si solo cuenta el nivel) y, si es un nivel o
 * un rango, sus límites. Null sin nada escrito.
 */
export type SoulQuery = { text: string; min?: number; max?: number } | null

const LEVELS = /^(nv\.?\s*|nivel\s*)?(\d{1,3})(?:\s*(-|–|—|a)\s*(\d{1,3})?)?$/

export function soulQuery(raw: string): SoulQuery {
  const text = fold(raw.trim())
  if (!text) return null
  const levels = LEVELS.exec(text)
  if (!levels) return { text }
  const [, prefix, fromText, dash, toText] = levels
  const from = Number(fromText)
  // Con el guion y sin el segundo número: desde el primero.
  const to = toText !== undefined ? Number(toText) : dash ? Infinity : from
  return {
    // Un número solo también es texto: «300» puede estar en un nombre.
    text: prefix || dash ? '' : text,
    min: Math.min(from, to),
    max: Math.max(from, to),
  }
}

export function soulMatches(
  query: SoulQuery,
  soul: { search: string; level: number | null },
): boolean {
  if (query === null) return true
  const byLevel =
    query.min !== undefined &&
    soul.level !== null &&
    soul.level >= query.min &&
    soul.level <= (query.max ?? query.min)
  return byLevel || (query.text !== '' && soul.search.includes(query.text))
}
