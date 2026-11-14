// Casar un nombre de Necesitarás con un objeto del juego sin adivinar. Una fila sin cantidad
// («Varita pitusa.») es un objeto solo si un único objeto se llama así, sin mirar mayúsculas
// ni tildes. Un nombre en plural («8 x Bananaranjas») se prueba en singular, con la misma
// regla: cuenta solo si un único objeto casa. Con ninguno o con varios, la fila queda como nota.
import { fold } from './fold'

/** Cada vocal (y la n) con sus variantes con tilde, en minúscula y mayúscula. */
const VARIANTS: Record<string, string> = {
  a: 'aáàâäAÁÀÂÄ',
  e: 'eéèêëEÉÈÊË',
  i: 'iíìîïIÍÌÎÏ',
  o: 'oóòôöOÓÒÔÖ',
  u: 'uúùûüUÚÙÛÜ',
  n: 'nñNÑ',
}

const namePattern = (name: string) =>
  [...name.trim().normalize('NFC')]
    .map((char) => {
      const base = char.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
      const variants = VARIANTS[base]
      if (variants) return `[${variants}]`
      return char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    })
    .join('')

/**
 * Un $regex de DofusDB que casa uno de los nombres entero, sin mirar tildes; con $options i,
 * tampoco mayúsculas. Los demás signos se toman literales.
 */
export function itemNamePattern(names: string | string[]): string {
  const list = typeof names === 'string' ? [names] : names
  return list.length === 1
    ? `^${namePattern(list[0]!)}$`
    : `^(?:${list.map(namePattern).join('|')})$`
}

/** Un objeto de la base (nombre en texto) o de DofusDB (nombre por idioma). */
type Candidate = {
  id: number
  dofusId?: number | null
  typeId?: number | null
  name?: string | { es?: string | null } | null
}

const nameOf = (row: Candidate) => (typeof row.name === 'string' ? row.name : (row.name?.es ?? ''))

/**
 * El objeto entre varios que casan: si todos son el mismo objeto repetido (mismo nombre y
 * mismo tipo), el de ID de DofusDB más bajo; si hay dos distintos, null. Nunca se adivina.
 */
export function sameItem<T extends Candidate>(rows: T[]): T | null {
  if (rows.length === 0) return null
  const [first] = rows
  const same = rows.every(
    (row) => nameOf(row) === nameOf(first!) && (row.typeId ?? null) === (first!.typeId ?? null),
  )
  if (!same) return null
  return [...rows].sort((a, b) => (a.dofusId ?? a.id) - (b.dofusId ?? b.id))[0]!
}

/**
 * El objeto de rows que se llama como uno de los nombres (sin mayúsculas ni tildes), con la
 * regla de sameItem para los repetidos; null si ninguno o si hay duda.
 */
export function onlyItem<T extends Candidate>(names: string | string[], rows: T[]): T | null {
  const keys = new Set((typeof names === 'string' ? [names] : names).map(fold))
  return sameItem(rows.filter((row) => keys.has(fold(nameOf(row)))))
}

/** «Flores»: «Flore» y «Flor». Una palabra de tres letras o menos («gas», «más») se deja. */
function singularWord(word: string): string[] {
  if (word.length <= 3 || !/s$/i.test(word)) return []
  const forms = [word.slice(0, -1)]
  if (word.length > 4 && /es$/i.test(word)) forms.push(word.slice(0, -2))
  return forms
}

/**
 * Las formas en singular de un nombre en plural: sin la «s» o la «es» final. En un nombre de
 * varias palabras, el sustantivo del principio («Orejas de buldogro»), la última palabra o
 * ambas («Alas rojas»). Vacío si no hay plural que quitar.
 */
export function singularForms(name: string): string[] {
  const words = name.trim().split(/\s+/)
  const first = words[0] ?? ''
  if (words.length === 1) return singularWord(first)
  const middle = words.slice(1, -1)
  const last = words.at(-1)!
  const heads = singularWord(first)
  const lasts = singularWord(last)
  const forms = [
    ...heads.map((head) => [head, ...middle, last]),
    ...lasts.map((tail) => [first, ...middle, tail]),
    ...heads.flatMap((head) => lasts.map((tail) => [head, ...middle, tail])),
  ].map((parts) => parts.join(' '))
  return [...new Set(forms)]
}
