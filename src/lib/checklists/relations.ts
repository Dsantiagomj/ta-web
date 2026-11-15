// Las relaciones de Payload tal como llegan: el ID sin poblar, el documento poblado o nada.
// Las usan la lectura de la checklist y la forma de su página.

import { corrected, hiddenByTorre } from '@/lib/game-data/correction'

export type Relation<T> = number | T | null | undefined

/** El ID de una relación, poblada o no; null si no hay. */
export function relationId(value: unknown): number | null {
  if (typeof value === 'number') return value
  if (value && typeof value === 'object' && 'id' in value) {
    const { id } = value as { id: unknown }
    return typeof id === 'number' ? id : null
  }
  return null
}

/** El documento de una relación poblada; null si solo es el ID o no hay. */
export function populated<T extends object>(value: Relation<T>): T | null {
  return value && typeof value === 'object' ? value : null
}

/**
 * Un dato del juego poblado tal como lo enseña la web: con lo que Torre corrigió encima
 * (src/lib/game-data/correction.ts), o null si lo ocultó o solo es el ID.
 */
export function shown<T extends object>(value: Relation<T>): T | null {
  const doc = populated(value)
  return doc && !hiddenByTorre(doc) ? (corrected(doc as never) as T) : null
}
