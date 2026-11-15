// «Corrección de Torre»: lo que Torre corrige de un dato de DofusDB (un PNJ, un monstruo, un
// objeto, un logro, una mazmorra o una misión) gana en todas las páginas donde sale. Lo vacío
// deja el dato del juego. Código puro: lo usan las lecturas de cada página.

import type { Media } from '@/payload-types'

/** Lo que Torre puede corregir. Cada colección guarda lo que ese dato enseña. */
export interface Correction {
  name?: string | null
  level?: number | null
  image?: number | Media | null
  hidden?: boolean | null
}

/** Un dato del juego con su corrección, tal como llega de Payload. */
export interface Correctable {
  name?: string | null
  correction?: Correction | null
}

type Doc = Correctable & {
  level?: number | null
  levelMin?: number | null
  levels?: number[] | null
  image?: unknown
  icon?: unknown
  renderRight?: unknown
  renderLeft?: unknown
}

const hasValue = <T>(value: T | null | undefined): value is T =>
  value !== null && value !== undefined

/**
 * El dato con lo que Torre corrigió encima: su nombre, su nivel (el de la misión o el de los
 * grados de un monstruo) y su imagen (el icono de un logro, los dos renders de un PNJ). Sin
 * corrección devuelve el mismo documento.
 */
export function corrected<T extends Doc>(doc: T): T {
  const correction = doc.correction
  if (!correction) return doc
  const name = correction.name?.trim()
  const { level, image } = correction
  const result: Doc = { ...doc }
  if (name) result.name = name
  if (hasValue(level)) {
    if ('levelMin' in doc) result.levelMin = level
    if ('levels' in doc) result.levels = [level]
    if ('level' in doc || !('levelMin' in doc || 'levels' in doc)) result.level = level
  }
  if (hasValue(image)) {
    if ('renderRight' in doc || 'renderLeft' in doc) {
      result.renderRight = image
      result.renderLeft = image
    } else if ('icon' in doc) result.icon = image
    else result.image = image
  }
  return result as T
}

/** Si Torre lo ocultó: no sale en ninguna página. Un ID sin poblar no está oculto. */
export function hiddenByTorre(doc: unknown): boolean {
  if (!doc || typeof doc !== 'object') return false
  return (doc as Correctable).correction?.hidden === true
}

/** Si hay algo corregido: lo marca «Corregido por Torre» en el panel. */
export function hasCorrection(correction: Correction | null | undefined): boolean {
  if (!correction) return false
  return Boolean(
    correction.name?.trim() ||
    hasValue(correction.level) ||
    hasValue(correction.image) ||
    correction.hidden === true,
  )
}
