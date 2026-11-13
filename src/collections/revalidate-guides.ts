import { revalidateTag } from 'next/cache'
import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'

import { ACHIEVEMENT_PAGES_TAG } from '../lib/achievements/cache'
import { CHECKLISTS_TAG } from '../lib/checklists/cache'
import { DOFUS_GUIDES_TAG } from '../lib/dofus-guides/cache'
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

/** Las guías de Dofus en caché (src/lib/dofus-guides/cache.ts). */
export function revalidateDofusGuides(): void {
  expire(DOFUS_GUIDES_TAG)
}

/** Las checklists en caché (src/lib/checklists/cache.ts). */
export function revalidateChecklists(): void {
  expire(CHECKLISTS_TAG)
}

// Las guías y Media salen en todas las páginas: una guía publicada enlaza su tarjeta en el
// logro, su fila en la guía de Dofus y su misión en la checklist, y un archivo es el icono o
// el render de todas.
export const revalidateGuidePagesAfterChange: CollectionAfterChangeHook = ({ doc }) => {
  revalidateGuidePages()
  revalidateAchievementPages()
  revalidateDofusGuides()
  revalidateChecklists()
  return doc
}

export const revalidateGuidePagesAfterDelete: CollectionAfterDeleteHook = ({ doc }) => {
  revalidateGuidePages()
  revalidateAchievementPages()
  revalidateDofusGuides()
  revalidateChecklists()
  return doc
}

// Una página de logro o un metalogro salen también en las guías (sus migas y «Misión 2 de
// 3»), en las guías de Dofus (las misiones de cada logro) y en las checklists (el enlace de
// cada logro).
export const revalidateAchievementPagesAfterChange: CollectionAfterChangeHook = ({ doc }) => {
  revalidateAchievementPages()
  revalidateGuidePages()
  revalidateDofusGuides()
  revalidateChecklists()
  return doc
}

export const revalidateAchievementPagesAfterDelete: CollectionAfterDeleteHook = ({ doc }) => {
  revalidateAchievementPages()
  revalidateGuidePages()
  revalidateDofusGuides()
  revalidateChecklists()
  return doc
}

// Una guía de Dofus sale en su página y en el índice, y el menú de todas las páginas
// enlaza los Dofus publicados: la caché de las guías también caduca. Su checklist toma de
// ella el huevo, el color y las migas.
export const revalidateDofusGuidesAfterChange: CollectionAfterChangeHook = ({ doc }) => {
  revalidateDofusGuides()
  revalidateGuidePages()
  revalidateChecklists()
  return doc
}

export const revalidateDofusGuidesAfterDelete: CollectionAfterDeleteHook = ({ doc }) => {
  revalidateDofusGuides()
  revalidateGuidePages()
  revalidateChecklists()
  return doc
}

// Una checklist guardada, publicada o borrada, o una misión que enseña (su nombre, su nivel,
// sus objetivos): la siguiente visita lee la nueva.
export const revalidateChecklistsAfterChange: CollectionAfterChangeHook = ({ doc }) => {
  revalidateChecklists()
  return doc
}

export const revalidateChecklistsAfterDelete: CollectionAfterDeleteHook = ({ doc }) => {
  revalidateChecklists()
  return doc
}
