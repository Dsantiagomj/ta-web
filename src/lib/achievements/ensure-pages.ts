// Tras refrescar los datos del juego, crea los metalogros y las páginas de logro que
// faltan, «En preparación», y deja que el hook de relleno copie lo que da DofusDB. Nunca
// cambia ni borra uno que ya existe: lo que hay en ellos es de Torre.

import type { Payload } from 'payload'

import { QUEST_ROOT_CATEGORIES } from '../dofusdb/refresh-achievements'

export interface EnsurePagesCounts {
  groups: number
  pages: number
}

const relationId = (value: number | { id: number } | null | undefined) =>
  value == null ? null : typeof value === 'number' ? value : value.id

/**
 * Un metalogro por cada categoría que cuelga de Misiones o Eventos, a cualquier
 * profundidad, y una página por cada
 * logro con misiones. Las que ya existen, por su categoría o su logro, no se tocan.
 */
export async function ensureAchievementPages(
  payload: Payload,
  options: { log?: (message: string) => void } = {},
): Promise<EnsurePagesCounts> {
  const log = options.log ?? (() => {})
  const counts: EnsurePagesCounts = { groups: 0, pages: 0 }

  // Todas las categorías que cuelgan de Misiones o Eventos, a cualquier profundidad, como
  // las que trae el refresco (src/lib/dofusdb/refresh-achievements.ts).
  const all = await payload.find({
    collection: 'achievement-categories',
    depth: 0,
    pagination: false,
    overrideAccess: true,
  })
  const roots = new Set(
    all.docs.filter((doc) => QUEST_ROOT_CATEGORIES.includes(doc.dofusId)).map((doc) => doc.id),
  )
  const parentOf = new Map(all.docs.map((doc) => [doc.id, relationId(doc.parent)]))
  const underRoot = (id: number): boolean => {
    const seen = new Set<number>()
    for (let parent = parentOf.get(id); parent != null; parent = parentOf.get(parent)) {
      if (roots.has(parent)) return true
      if (seen.has(parent)) return false
      seen.add(parent)
    }
    return false
  }
  const categories = { docs: all.docs.filter((doc) => underRoot(doc.id)) }
  const groups = await payload.find({
    collection: 'achievement-groups',
    select: { category: true },
    depth: 0,
    pagination: false,
    overrideAccess: true,
  })
  // El nombre y el slug los pone el hook de relleno: Payload los tipa como obligatorios.
  const withGroup = new Set(groups.docs.map((group) => relationId(group.category)))
  for (const category of categories.docs) {
    if (withGroup.has(category.id)) continue
    await payload.create({
      collection: 'achievement-groups',
      data: { category: category.id, state: 'preparing', _status: 'published' } as never,
      depth: 0,
      overrideAccess: true,
    })
    counts.groups += 1
    log(`Metalogro nuevo: ${category.name}`)
  }

  const achievements = await payload.find({
    collection: 'achievements',
    where: { category: { in: categories.docs.map((category) => category.id) } },
    // Sin select: con él, Payload no trae las relaciones de dentro del array.
    sort: 'dofusId',
    depth: 0,
    pagination: false,
    overrideAccess: true,
  })
  const pages = await payload.find({
    collection: 'achievement-pages',
    select: { achievement: true },
    depth: 0,
    pagination: false,
    overrideAccess: true,
  })
  const withPage = new Set(pages.docs.map((page) => relationId(page.achievement)))
  for (const achievement of achievements.docs) {
    const hasQuests = (achievement.quests ?? []).some((row) => (row.quests ?? []).length > 0)
    if (withPage.has(achievement.id) || !hasQuests) continue
    await payload.create({
      collection: 'achievement-pages',
      data: { achievement: achievement.id, state: 'preparing', _status: 'published' } as never,
      depth: 0,
      overrideAccess: true,
    })
    counts.pages += 1
    log(`Página de logro nueva: ${achievement.name}`)
  }
  return counts
}
