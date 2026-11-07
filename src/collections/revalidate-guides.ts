import { revalidateTag } from 'next/cache'
import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'

import { ACHIEVEMENT_PAGES_TAG } from '../lib/achievements/cache'
import { GUIDE_PAGES_TAG } from '../lib/guides/cache'

/**
 * Caduca una etiqueta de la caché de páginas: la siguiente visita lee lo publicado, sin
 * servir la versión vieja. Fuera de una petición de Next (la importación, los scripts con
 * payload run, las pruebas) no hay caché que tocar y Next lanza un invariante: se ignora;
 * cualquier otro error sale.
 */
function expire(tag: string): void {
  try {
    revalidateTag(tag, { expire: 0 })
  } catch (error) {
    if (error instanceof Error && error.message.includes('static generation store missing')) {
      return
    }
    throw error
  }
}

/** Las guías en caché (src/lib/guides/cache.ts). */
export function revalidateGuidePages(): void {
  expire(GUIDE_PAGES_TAG)
}

/** Las páginas de logro en caché (src/lib/achievements/cache.ts). */
export function revalidateAchievementPages(): void {
  expire(ACHIEVEMENT_PAGES_TAG)
}

// Las guías y Media salen en las dos páginas: una guía publicada enlaza su tarjeta en el
// logro, y un archivo es el icono o el render de las dos.
export const revalidateGuidePagesAfterChange: CollectionAfterChangeHook = ({ doc }) => {
  revalidateGuidePages()
  revalidateAchievementPages()
  return doc
}

export const revalidateGuidePagesAfterDelete: CollectionAfterDeleteHook = ({ doc }) => {
  revalidateGuidePages()
  revalidateAchievementPages()
  return doc
}

export const revalidateAchievementPagesAfterChange: CollectionAfterChangeHook = ({ doc }) => {
  revalidateAchievementPages()
  return doc
}

export const revalidateAchievementPagesAfterDelete: CollectionAfterDeleteHook = ({ doc }) => {
  revalidateAchievementPages()
  return doc
}
