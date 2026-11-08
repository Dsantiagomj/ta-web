import type { Payload } from 'payload'

/** Las cifras de la cabecera: guías de misión publicadas y logros distintos de sus misiones. */
export interface SiteGuideCounts {
  guides: number
  achievements: number
}

/**
 * Las cifras de la cabecera y de la portada, siempre de aquí, para que nunca discrepen.
 *
 * TODO(logros): los logros se cuentan aún como los logros distintos de las misiones con guía
 * publicada. Cuando la cadena de logros (#55 a #60) traiga sus colecciones y el índice de
 * metalogros, contarlos desde allí (los 214 logros de los 34 metalogros del prototipo).
 *
 * Cuenta lo que un visitante ve: solo lo publicado (overrideAccess: false). Lee el logro
 * de la misión de cada guía con select, sin el resto de la guía.
 */
export async function countSiteGuides(payload: Payload): Promise<SiteGuideCounts> {
  const { docs } = await payload.find({
    collection: 'quest-guides',
    where: { _status: { equals: 'published' } },
    select: { quest: true },
    populate: { quests: { achievement: true } },
    depth: 1,
    pagination: false,
    overrideAccess: false,
  })
  const achievements = new Set<number>()
  for (const guide of docs) {
    const id = typeof guide.quest === 'object' ? guide.quest?.achievement?.dofusId : null
    if (id != null) achievements.add(id)
  }
  return { guides: docs.length, achievements: achievements.size }
}
