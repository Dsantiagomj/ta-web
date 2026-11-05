import { revalidateTag } from 'next/cache'
import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'

import { GUIDE_PAGES_TAG } from '../lib/guides/cache'

/**
 * Caduca las guías en caché (src/lib/guides/cache.ts): la siguiente visita lee lo
 * publicado, sin servir la versión vieja. Fuera de una petición de Next (la importación,
 * los scripts con payload run, las pruebas) no hay caché que tocar y Next lanza un
 * invariante: se ignora; cualquier otro error sale.
 */
export function revalidateGuidePages(): void {
  try {
    revalidateTag(GUIDE_PAGES_TAG, { expire: 0 })
  } catch (error) {
    if (error instanceof Error && error.message.includes('static generation store missing')) {
      return
    }
    throw error
  }
}

export const revalidateGuidePagesAfterChange: CollectionAfterChangeHook = ({ doc }) => {
  revalidateGuidePages()
  return doc
}

export const revalidateGuidePagesAfterDelete: CollectionAfterDeleteHook = ({ doc }) => {
  revalidateGuidePages()
  return doc
}
