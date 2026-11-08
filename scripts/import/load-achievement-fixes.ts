// Arreglos puntuales sobre lo que dejó la importación de los metalogros de Torre
// (load-achievements.ts), para una base que ya tiene sus datos: cambian solo las entradas de
// la lista y nada más. No vuelven a pasar la importación entera, que pisaría lo que Torre
// haya cambiado después en el panel. Cada arreglo compara antes de escribir, así que una
// segunda pasada no cambia nada.
import type { Payload } from 'payload'

import { achievementStrings, type PageState } from '@/lib/achievements/strings'

/** Una página de logro que va en otro sitio, con otro nombre o en otro estado. */
export interface PageFix {
  /** El slug del metalogro: metalogro-misiones-de-mundo. */
  group: string
  /** El logro de DofusDB. */
  achievement: number
  /** Su puesto entre las páginas del metalogro, desde 1, como en la lista de Torre. */
  position: number
  name?: string
  slug?: string
  state?: PageState
}

export interface AchievementFixes {
  /** El representante del metalogro: un PNJ de DofusDB. Solo si no tiene ninguno. */
  representatives: { group: string; npc: number }[]
  pages: PageFix[]
  /** Guías sueltas que se añaden al final, en este orden, sin quitar las que ya tiene. */
  guides: { group: string; slugs: string[] }[]
}

/**
 * Lo que la importación de 2026-11-07 dejó mal en dev (datos.json ya lo trae bien para la
 * próxima importación):
 * - Alineamiento no tenía representante: es Amayiro.
 * - Cinco logros de Torre se leyeron como guías sueltas y no casaron. Ocre de ámbar, De un
 *   mundo al otro, Todos para uno y uno se lo queda todo y Picadillo de wabbit tienen guía en
 *   todas sus misiones: se publican en su sitio. Dimensión carcelaria no tiene ninguna
 *   (sus páginas en Squarespace están vacías): sigue En preparación, en su sitio.
 * - Las «Misiones extra» de Vulkania son diez guías publicadas, guías sueltas del metalogro.
 */
export const TORRE_FIXES: AchievementFixes = {
  representatives: [{ group: 'metalogro-alineamiento', npc: 6309 }],
  pages: [
    {
      group: 'metalogro-misiones-de-mundo',
      achievement: 5220,
      position: 5,
      name: 'Ocre de ámbar',
      slug: 'ocre-de-ambar',
      state: 'published',
    },
    {
      group: 'metalogro-dimensiones-divinas',
      achievement: 1072,
      position: 1,
      name: 'De un mundo a otro',
      slug: 'de-un-mundo-a-otro',
      state: 'published',
    },
    {
      group: 'metalogro-isla-de-frigost',
      achievement: 614,
      position: 14,
      name: 'Todos para uno y uno se lo queda todo',
      slug: 'todos-para-uno-y-uno-se-lo-queda-todo',
      state: 'published',
    },
    {
      group: 'metalogro-archipielago-wabbit',
      achievement: 1071,
      position: 6,
      name: 'Picadillo de wabbit',
      slug: 'picadillo-de-wabbit',
      state: 'published',
    },
    { group: 'metalogro-en-busca-y-captura', achievement: 1198, position: 7 },
  ],
  guides: [
    {
      group: 'metalogro-archipielago-de-vulkania',
      slugs: [
        'casktel-gratis',
        'toma-de-sangre',
        'divina-divinidad',
        'los-heores',
        'nostalgia-de-juventud',
        'la-pobre-carla-ha-perdido-su-miaumiau',
        'recuerdos-perdidos',
        'le-falta-sal',
        'sabes-tapar-boquetes',
        'la-tecnica-de-las-placas',
      ],
    },
  ],
}

export interface FixOptions {
  fixes: AchievementFixes
  /** Sin él solo dice lo que haría. */
  apply: boolean
  /** El ID de Payload del PNJ de DofusDB, importándolo si falta; null si no existe. */
  ensureNpc: (dofusId: number) => Promise<number | null>
}

export interface FixReport {
  /** Lo que cambia (o cambiaría, sin --apply). */
  changes: string[]
  /** Lo que se deja como está, y por qué. */
  skipped: string[]
}

type Collection = 'achievement-groups' | 'achievement-pages'

const relationId = (value: unknown) =>
  value == null ? null : typeof value === 'object' ? (value as { id: number }).id : Number(value)
const stateName = (state: PageState) => achievementStrings.states[state]

export async function applyAchievementFixes(
  payload: Payload,
  { fixes, apply, ensureNpc }: FixOptions,
): Promise<FixReport> {
  const report: FixReport = { changes: [], skipped: [] }

  // Un borrador más nuevo que lo publicado es Torre a medio editar: guardar encima lo dejaría
  // atrás, así que esa entrada se salta.
  const pendingDraft = async (collection: Collection, id: number) => {
    const latest = await payload.findByID({
      collection,
      id,
      draft: true,
      depth: 0,
      overrideAccess: true,
    })
    return latest._status === 'draft'
  }
  const save = async (collection: Collection, id: number, data: Record<string, unknown>) => {
    if (!apply) return
    await payload.update({ collection, id, data, depth: 0, overrideAccess: true })
  }
  const groupBySlug = async (slug: string) =>
    (
      await payload.find({
        collection: 'achievement-groups',
        where: { slug: { equals: slug } },
        depth: 0,
        limit: 1,
        overrideAccess: true,
      })
    ).docs[0]

  for (const fix of fixes.representatives) {
    const group = await groupBySlug(fix.group)
    if (!group) {
      report.skipped.push(`${fix.group}: no existe ese metalogro`)
      continue
    }
    const current = group.representative
    if (current && relationId(current.value) !== null) {
      const npc = await payload.find({
        collection: 'npcs',
        where: { dofusId: { equals: fix.npc } },
        depth: 0,
        limit: 1,
        overrideAccess: true,
      })
      const same = current.relationTo === 'npcs' && npc.docs[0]?.id === relationId(current.value)
      if (!same) report.skipped.push(`${group.name}: ya tiene representante; no se cambia`)
      continue
    }
    if (await pendingDraft('achievement-groups', group.id)) {
      report.skipped.push(`${group.name}: tiene un borrador sin publicar en el panel; no se toca`)
      continue
    }
    const npc = await ensureNpc(fix.npc)
    if (npc === null) {
      report.skipped.push(`${group.name}: DofusDB no tiene el PNJ ${fix.npc}`)
      continue
    }
    const { name } = await payload.findByID({
      collection: 'npcs',
      id: npc,
      depth: 0,
      overrideAccess: true,
    })
    report.changes.push(`${group.name}: representante ${name} (DofusDB ${fix.npc})`)
    await save('achievement-groups', group.id, {
      representative: { relationTo: 'npcs', value: npc },
    })
  }

  for (const fix of fixes.pages) {
    const group = await groupBySlug(fix.group)
    const achievement = (
      await payload.find({
        collection: 'achievements',
        where: { dofusId: { equals: fix.achievement } },
        depth: 0,
        limit: 1,
        overrideAccess: true,
      })
    ).docs[0]
    const page = achievement
      ? (
          await payload.find({
            collection: 'achievement-pages',
            where: { achievement: { equals: achievement.id } },
            depth: 0,
            limit: 1,
            overrideAccess: true,
          })
        ).docs[0]
      : undefined
    if (!group || !page) {
      report.skipped.push(
        `${fix.name ?? fix.achievement}: no existe ${group ? 'su página de logro' : fix.group}`,
      )
      continue
    }
    const label = fix.name ?? page.name
    if (await pendingDraft('achievement-pages', page.id)) {
      report.skipped.push(`${label}: tiene un borrador sin publicar en el panel; no se toca`)
      continue
    }

    const data: Record<string, unknown> = {}
    const said: string[] = []
    if (fix.state && page.state !== fix.state) {
      data.state = fix.state
      said.push(`estado ${stateName(page.state)} → ${stateName(fix.state)}`)
    }
    if (fix.name && page.name !== fix.name) {
      data.name = fix.name
      said.push(`nombre «${page.name}» → «${fix.name}»`)
    }
    if (fix.slug && page.slug !== fix.slug) {
      data.slug = fix.slug
      said.push(`slug ${page.slug} → ${fix.slug}`)
    }
    if (relationId(page.group) !== group.id) data.group = group.id

    // Su puesto entre las páginas del metalogro; las demás se corren sin cambiar su orden.
    const { docs: inGroup } = await payload.find({
      collection: 'achievement-pages',
      where: { group: { equals: group.id } },
      sort: ['order', 'name'],
      depth: 0,
      pagination: false,
      overrideAccess: true,
    })
    const siblings = inGroup.filter((doc) => doc.id !== page.id)
    const was = inGroup.findIndex((doc) => doc.id === page.id) + 1
    const at = Math.min(Math.max(fix.position, 1), siblings.length + 1)
    const sequence = [...siblings]
    sequence.splice(at - 1, 0, page)
    const reorder = sequence.flatMap((doc, index) =>
      doc.id !== page.id && doc.order !== index + 1 ? [{ id: doc.id, order: index + 1 }] : [],
    )
    if (page.order !== at) data.order = at
    if (was !== at) said.push(`posición ${was || '—'} → ${at} en ${group.name}`)

    if (Object.keys(data).length === 0 && reorder.length === 0) continue
    report.changes.push(`${label}: ${said.join('; ') || `orden en ${group.name}`}`)
    for (const { id, order } of reorder) await save('achievement-pages', id, { order })
    if (Object.keys(data).length) await save('achievement-pages', page.id, data)
  }

  for (const fix of fixes.guides) {
    const group = await groupBySlug(fix.group)
    if (!group) {
      report.skipped.push(`${fix.group}: no existe ese metalogro`)
      continue
    }
    const current = (group.guides ?? []).flatMap((guide) => {
      const id = relationId(guide)
      return id === null ? [] : [id]
    })
    const added: { id: number; slug: string }[] = []
    for (const slug of fix.slugs) {
      const guide = (
        await payload.find({
          collection: 'quest-guides',
          where: { slug: { equals: slug }, _status: { equals: 'published' } },
          depth: 0,
          limit: 1,
          overrideAccess: true,
        })
      ).docs[0]
      if (!guide) {
        report.skipped.push(`${group.name}: no hay guía publicada con el slug ${slug}`)
        continue
      }
      if (!current.includes(guide.id)) added.push({ id: guide.id, slug })
    }
    if (added.length === 0) continue
    if (await pendingDraft('achievement-groups', group.id)) {
      report.skipped.push(`${group.name}: tiene un borrador sin publicar en el panel; no se toca`)
      continue
    }
    report.changes.push(
      `${group.name}: guías sueltas + ${added.map((guide) => guide.slug).join(', ')}`,
    )
    await save('achievement-groups', group.id, {
      guides: [...current, ...added.map((guide) => guide.id)],
    })
  }
  return report
}
