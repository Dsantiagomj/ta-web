// Casar un nombre de Necesitarás con un objeto del juego sin adivinar. Una fila sin cantidad
// («Varita pitusa.») es un objeto solo si un único objeto se llama así, sin mirar mayúsculas
// ni tildes. Un nombre en plural («8 x Bananaranjas») se prueba en singular, con la misma
// regla: cuenta solo si un único objeto casa. Con ninguno o con varios, la fila queda como nota.
import type { RawItem } from '@/lib/dofusdb/types'

import { fold } from './load'

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

/**
 * El único objeto de rows que se llama como uno de los nombres (sin mayúsculas ni tildes);
 * null si ninguno o varios.
 */
export function onlyItem<T extends Pick<RawItem, 'id' | 'name'>>(
  names: string | string[],
  rows: T[],
): T | null {
  const keys = new Set((typeof names === 'string' ? [names] : names).map(fold))
  const matches = new Map<number, T>()
  for (const row of rows) {
    if (keys.has(fold(row.name?.es ?? ''))) matches.set(row.id, row)
  }
  return matches.size === 1 ? [...matches.values()][0]! : null
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
