// Crea las páginas de los logros de Alineamiento que faltan: DofusDB no les da misiones, así
// que el refresco no las crea (src/lib/achievements/ensure-pages.ts). Cada una lleva el slug de
// la página de Torre en Squarespace, se crea «En preparación» (Torre la publica) y el hook de
// relleno copia de DofusDB el nombre, el metalogro, el orden, los puntos y las recompensas.
// Nunca cambia una página que ya existe ni toma un slug que ya usa otra.
import { createLocalReq, type Payload } from 'payload'

import { isRootSlugTaken } from '@/collections/root-slug'

import {
  ALIGNMENT_CATEGORY,
  matchAlignment,
  type AlignmentAchievement,
  type TorreAchievementLink,
} from './alignment'

export interface LoadAlignmentOptions {
  /** La lista «Alineamiento» del índice /logros de Torre (alignmentLinks). */
  links: TorreAchievementLink[]
  /** Sin él solo cuenta lo que haría. */
  apply: boolean
  /** La categoría de DofusDB; por defecto, Alineamiento (43). */
  categoryDofusId?: number
  log?: (message: string) => void
}

type Row = { name: string; slug: string }

export interface LoadAlignmentReport {
  /** El nombre de la categoría guardada, o null si no está (falta `pnpm data:refresh`). */
  category: string | null
  /** Los logros de la categoría, en el orden del juego. */
  achievements: AlignmentAchievement[]
  /** Las páginas creadas, o las que se crearían en seco. */
  created: Row[]
  /** Los logros que ya tienen página: su slug y el de Torre. */
  existing: (Row & { torreSlug: string })[]
  /** Los slugs de Torre que ya usa otra página, una ruta del sitio o una redirección. */
  taken: Row[]
  withoutTorrePage: AlignmentAchievement[]
  withoutAchievement: TorreAchievementLink[]
}

const relationId = (value: number | { id: number } | null | undefined) =>
  value == null ? null : typeof value === 'number' ? value : value.id

export async function loadAlignmentPages(
  payload: Payload,
  options: LoadAlignmentOptions,
): Promise<LoadAlignmentReport> {
  const { links, apply, categoryDofusId = ALIGNMENT_CATEGORY, log = () => {} } = options
  const report: LoadAlignmentReport = {
    category: null,
    achievements: [],
    created: [],
    existing: [],
    taken: [],
    withoutTorrePage: [],
    withoutAchievement: links,
  }

  const category = (
    await payload.find({
      collection: 'achievement-categories',
      where: { dofusId: { equals: categoryDofusId } },
      depth: 0,
      limit: 1,
      overrideAccess: true,
    })
  ).docs[0]
  if (!category) return report
  report.category = category.name

  const { docs } = await payload.find({
    collection: 'achievements',
    where: { category: { equals: category.id } },
    select: { dofusId: true, name: true },
    sort: ['order', 'dofusId'],
    depth: 0,
    pagination: false,
    overrideAccess: true,
  })
  report.achievements = docs.map((doc) => ({ id: doc.id, dofusId: doc.dofusId, name: doc.name }))

  // Borradores incluidos: una página a medias de Torre también existe.
  const pages = await payload.find({
    collection: 'achievement-pages',
    where: { achievement: { in: report.achievements.map((row) => row.id) } },
    select: { achievement: true, slug: true },
    depth: 0,
    draft: true,
    pagination: false,
    overrideAccess: true,
  })
  const pageSlug = new Map(pages.docs.map((page) => [relationId(page.achievement), page.slug]))

  const match = matchAlignment(report.achievements, links)
  report.withoutTorrePage = match.withoutTorrePage
  report.withoutAchievement = match.withoutAchievement

  const req = await createLocalReq({}, payload)
  for (const { achievement, link } of match.matched) {
    const { name } = achievement
    const existing = pageSlug.get(achievement.id)
    if (existing) {
      report.existing.push({ name, slug: existing, torreSlug: link.slug })
      continue
    }
    if (await isRootSlugTaken(req, link.slug, 'achievement-pages')) {
      report.taken.push({ name, slug: link.slug })
      log(`${name}: /${link.slug} ya está ocupado; no se crea`)
      continue
    }
    if (apply) {
      await payload.create({
        collection: 'achievement-pages',
        // El nombre lo pone el hook de relleno: Payload lo tipa como obligatorio.
        data: {
          achievement: achievement.id,
          slug: link.slug,
          state: 'preparing',
          _status: 'published',
        } as never,
        depth: 0,
        overrideAccess: true,
      })
    }
    report.created.push({ name, slug: link.slug })
  }
  return report
}
