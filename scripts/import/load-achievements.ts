// Lleva a los metalogros y páginas de logro lo que Torre tiene hoy en su web: el orden de su
// índice, sus nombres y slugs, el estado de cada metalogro y de cada logro, los
// representantes que eligió a mano y las guías sueltas. La fuente es el índice ya calculado
// del prototipo (tmp/mockups/comun/indice/datos.json): los estados se copian, no se deducen.
import type { Payload } from 'payload'

import { slugFromName } from '@/lib/guides/autofill'

/** Un logro o una guía de una entrada del índice, con su página en la web de Torre. */
export interface TorreLink {
  name: string
  href: string
  /** Listo: tiene guía. Solo en los logros. */
  ready?: boolean
}

/** Una entrada del índice de Torre, en su orden. */
export interface TorreZone {
  name: string
  /** Su página (…/metalogro-astrub), o null si no tiene (Misiones de templo). */
  href: string | null
  /** En verde en el índice: terminado. */
  done: boolean
  /** El representante; solo se siembra el elegido a mano. */
  pnj?: { id: number; name?: string; chosen?: boolean } | null
  achievements: TorreLink[]
  guides: TorreLink[]
}

export interface ImportOptions {
  zones: TorreZone[]
  /** Sin él solo cuenta lo que haría. */
  apply: boolean
  /** El ID de Payload del PNJ de DofusDB, importándolo si falta; null si no existe. */
  ensureNpc: (dofusId: number) => Promise<number | null>
  log?: (message: string) => void
}

export interface ImportReport {
  groups: { updated: number; created: number }
  pages: { updated: number; created: number }
  guides: number
  unmatched: { group: string; name: string }[]
}

// Los nombres de Torre que no son los del juego.
const ALIASES: Record<string, string> = {
  'el descenso del dragon': 'el descanso del dragon',
  'campamento de los bworks y de los goblins': 'campamentos de los bworks y de los goblins',
}

function fold(text: string): string {
  const folded = text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLocaleLowerCase('es')
    .replace(/[^a-z0-9ñ]+/g, ' ')
    .trim()
  return ALIASES[folded] ?? folded
}

/** El slug de una página de Torre: el último tramo de su URL. */
const slugOf = (href: string) => new URL(href).pathname.replace(/^\/+|\/+$/g, '')

const relationId = (value: number | { id: number } | null | undefined) =>
  value == null ? null : typeof value === 'number' ? value : value.id

/**
 * Pone en cada metalogro el nombre, el slug, el orden y el estado del índice de Torre, su
 * representante elegido a mano y sus guías sueltas, y en la página de cada logro su slug,
 * su orden, su metalogro y su estado. Crea lo que falte: un metalogro sin categoría
 * (Misiones de templo) y la página de un logro sin misiones que Torre lista. Las páginas de
 * los logros que Torre no lista quedan detrás, sin cambiar su estado. Es la
 * migración de su web: lo que cambie después en el panel lo pisaría una nueva pasada.
 */
export async function importTorreAchievements(
  payload: Payload,
  { zones, apply, ensureNpc, log = () => {} }: ImportOptions,
): Promise<ImportReport> {
  const report: ImportReport = {
    groups: { updated: 0, created: 0 },
    pages: { updated: 0, created: 0 },
    guides: 0,
    unmatched: [],
  }
  const groups = await payload.find({
    collection: 'achievement-groups',
    depth: 1,
    pagination: false,
    overrideAccess: true,
  })
  const groupByName = new Map(
    groups.docs.map((group) => [
      fold(typeof group.category === 'object' && group.category ? group.category.name : group.name),
      group,
    ]),
  )

  for (const [position, zone] of zones.entries()) {
    const existing = groupByName.get(fold(zone.name))
    const categoryId = relationId(existing?.category)
    const representative = zone.pnj?.chosen && apply ? await ensureNpc(zone.pnj.id) : null
    const data = {
      name: zone.name,
      ...(zone.href && { slug: slugOf(zone.href) }),
      order: position + 1,
      state: zone.done ? ('published' as const) : ('preparing' as const),
      ...(representative !== null && {
        representative: { relationTo: 'npcs' as const, value: representative },
      }),
    }

    // Los logros de su categoría, por nombre: los que Torre lista llevan su slug y su estado.
    const achievements = categoryId
      ? await payload.find({
          collection: 'achievements',
          where: { category: { equals: categoryId } },
          depth: 0,
          pagination: false,
          overrideAccess: true,
        })
      : { docs: [] }
    const achievementByName = new Map(achievements.docs.map((doc) => [fold(doc.name), doc]))

    const guideIds: number[] = []
    for (const guide of zone.guides) {
      const { docs } = await payload.find({
        collection: 'quest-guides',
        where: { slug: { equals: slugOf(guide.href) } },
        depth: 0,
        limit: 1,
        draft: true,
        overrideAccess: true,
      })
      if (docs[0]) guideIds.push(docs[0].id)
      else report.unmatched.push({ group: zone.name, name: guide.name })
    }
    report.guides += guideIds.length

    if (existing) report.groups.updated += 1
    else report.groups.created += 1

    // Sin --apply se cuenta todo igual; solo no se escribe.
    const group = !apply
      ? existing
      : existing
        ? await payload.update({
            collection: 'achievement-groups',
            id: existing.id,
            // Sin categoría de DofusDB no hay sección que copiar: con las historias.
            data: { ...data, guides: guideIds, ...(categoryId === null && { section: 'stories' }) },
            depth: 0,
            overrideAccess: true,
          })
        : await payload.create({
            collection: 'achievement-groups',
            data: {
              ...data,
              slug: data.slug ?? `metalogro-${slugFromName(zone.name)}`,
              // Sin categoría de DofusDB (Misiones de templo), con las historias.
              section: 'stories',
              guides: guideIds,
              _status: 'published',
            },
            depth: 0,
            overrideAccess: true,
          })
    if (apply) log(`${zone.name}: ${data.state === 'published' ? 'publicado' : 'en preparación'}`)

    // El orden cuenta solo los enlaces que casan: uno sin logro no deja hueco ni solapa.
    const listed = new Set<number>()
    for (const link of zone.achievements) {
      const achievement = achievementByName.get(fold(link.name))
      if (!achievement) {
        report.unmatched.push({ group: zone.name, name: link.name })
        continue
      }
      listed.add(achievement.id)
      const { docs } = await payload.find({
        collection: 'achievement-pages',
        where: { achievement: { equals: achievement.id } },
        depth: 0,
        limit: 1,
        overrideAccess: true,
      })
      if (docs[0]) report.pages.updated += 1
      else report.pages.created += 1
      if (!apply || !group) continue
      // El nombre de Torre, que puede no ser el del juego (los alias de arriba).
      const pageData = {
        name: link.name,
        slug: slugOf(link.href),
        order: listed.size,
        group: group.id,
        state: link.ready ? ('published' as const) : ('preparing' as const),
      }
      if (docs[0]) {
        await payload.update({
          collection: 'achievement-pages',
          id: docs[0].id,
          data: pageData,
          depth: 0,
          overrideAccess: true,
        })
      } else {
        // El nombre y lo demás los rellena el hook desde DofusDB.
        await payload.create({
          collection: 'achievement-pages',
          data: { ...pageData, achievement: achievement.id, _status: 'published' } as never,
          depth: 0,
          overrideAccess: true,
        })
      }
    }
    if (!apply || !group) continue

    // Las páginas de logros que Torre no lista van detrás de las suyas, en el orden del juego.
    const unlisted = achievements.docs
      .filter((doc) => !listed.has(doc.id))
      .sort((x, y) => (x.order ?? 0) - (y.order ?? 0) || x.dofusId - y.dofusId)
    for (const [index, achievement] of unlisted.entries()) {
      const { docs } = await payload.find({
        collection: 'achievement-pages',
        where: { achievement: { equals: achievement.id } },
        depth: 0,
        limit: 1,
        overrideAccess: true,
      })
      if (!docs[0]) continue
      await payload.update({
        collection: 'achievement-pages',
        id: docs[0].id,
        data: { order: listed.size + index + 1, group: group.id },
        depth: 0,
        overrideAccess: true,
      })
    }
  }
  return report
}
