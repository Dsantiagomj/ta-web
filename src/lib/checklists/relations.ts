// Las relaciones de Payload tal como llegan: el ID sin poblar, el documento poblado o nada.
// Sin dependencias: las usan la lectura de la checklist y la forma de su página.

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
