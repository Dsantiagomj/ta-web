// La importación delta: lleva a ta-web lo que Torre escribió en Squarespace después de la
// primera importación, comparando el inventario anterior con uno nuevo (pnpm import:inventory).
// - Guías nuevas (esbozos que llenó y páginas nuevas del sitemap): las crea la importación de
//   guías (loadQuestGuides), como borradores, con su misión de DofusDB cuando casa una sola.
// - Lo demás que cambió se lista sin tocarlo.
// Primero decide y después sube: en seco no escribe ni sube nada a Media.
import type { Payload } from 'payload'

import { isLegacySource } from '@/lib/redirects/table'

import { readInventoryPage } from '../inventory/read'
import { pageFeatures, type PageDelta } from '../inventory/pages'
import { createGuideBuilder, loadQuestGuides, type FetchImage } from '../load-quest-guides'
import { releaseDom } from '../squarespace/dom'
import { parsePage } from '../squarespace/parse-page'
import { toQuestGuide, type ConvertedGuide } from '../squarespace/to-quest-guide'
import { looksLikeQuestGuide, neverQuestGuide, questMatcher } from './match'

export interface LoadDeltaOptions {
  /** Las carpetas del inventario anterior y del nuevo. */
  previous: string
  next: string
  /** Lo que cambió entre los dos (compareInventories). */
  deltas: PageDelta[]
  apply: boolean
  fetchImage: FetchImage
  log?: (message: string) => void
}

export interface NewGuide {
  slug: string
  title: string
  questIds: number[]
  ambiguous: boolean
  blocks: number
  /** Las imágenes que no están en Media: se suben al importar. */
  uploads: string[]
  oddities: string[]
}

export interface DeltaReport {
  newGuides: NewGuide[]
  /** Guías nuevas que la tabla de redirecciones tapa: hay que desplegarla sin su fila antes. */
  blockedByTable: string[]
  /** Páginas que cambiaron y la delta no trata, con el porqué. */
  untreated: { path: string; status: PageDelta['status']; reason: string }[]
  written: { created: number; uploads: number }
}

const TREATED = new Set<PageDelta['status']>(['changed', 'filled', 'new'])

/** De quién es cada slug de /<slug> en ta-web, salvo las guías de misión. */
const OWNERS = [
  ['achievement-pages', 'pnpm import:achievement-prose'],
  ['dofus-guides', 'pnpm import:dofus-guides'],
  ['checklists', 'pnpm import:checklists'],
  ['pages', 'pnpm import:pages'],
  ['class-pages', 'pnpm import:section-pages'],
  ['dungeon-pages', 'pnpm import:section-pages'],
] as const

/** El slug de Squarespace de una guía importada, de su URL original. */
function sourceSlug(originalUrl: string | null | undefined): string | null {
  const slug = originalUrl?.trim().split('/').filter(Boolean).at(-1)
  return slug && /^[\w-]+$/.test(slug) ? slug : null
}

export async function loadDelta(payload: Payload, options: LoadDeltaOptions): Promise<DeltaReport> {
  const { apply, next } = options
  const log = options.log ?? (() => {})
  const report: DeltaReport = {
    newGuides: [],
    blockedByTable: [],
    untreated: [],
    written: { created: 0, uploads: 0 },
  }

  // Lo que ya hay en ta-web con cada slug.
  const guides = await payload.find({
    collection: 'quest-guides',
    pagination: false,
    depth: 0,
    draft: true,
    select: { slug: true, originalUrl: true },
    overrideAccess: true,
  })
  const guideBySource = new Map<string, number>()
  const guideSlugs = new Set<string>()
  for (const guide of guides.docs) {
    guideSlugs.add(guide.slug)
    const source = sourceSlug(guide.originalUrl)
    if (source) guideBySource.set(source, guide.id)
  }
  const owners = new Map<string, string>()
  for (const [collection, command] of OWNERS) {
    const { docs } = await payload.find({
      collection,
      pagination: false,
      depth: 0,
      draft: true,
      select: { slug: true },
      overrideAccess: true,
    })
    for (const doc of docs) owners.set((doc as { slug: string }).slug, `${collection} (${command})`)
  }

  const newGuides: PageDelta[] = []
  for (const delta of options.deltas.filter((d) => TREATED.has(d.status))) {
    const { slug } = delta
    if (guideBySource.has(slug)) {
      report.untreated.push({
        path: delta.path,
        status: delta.status,
        reason: 'guía ya importada: sus cambios aún no se traen',
      })
    } else if (owners.has(slug)) {
      report.untreated.push({
        path: delta.path,
        status: delta.status,
        reason: `es de ${owners.get(slug)}`,
      })
    } else if (guideSlugs.has(slug)) {
      report.untreated.push({
        path: delta.path,
        status: delta.status,
        reason: 'ya hay una guía hecha a mano con este slug',
      })
    } else if (neverQuestGuide(slug) || delta.path.slice(1).includes('/')) {
      report.untreated.push({
        path: delta.path,
        status: delta.status,
        reason: 'no es una guía de misión',
      })
    } else {
      const html = await readInventoryPage(next, slug)
      if (html && looksLikeQuestGuide(pageFeatures(html).text)) newGuides.push(delta)
      else {
        report.untreated.push({
          path: delta.path,
          status: delta.status,
          reason: 'no parece una guía de misión (sin Prerrequisitos, Necesitarás ni Recompensas)',
        })
      }
    }
  }

  // Las misiones de DofusDB, para el cruce de las guías nuevas.
  const quests = await payload.find({
    collection: 'quests',
    pagination: false,
    depth: 0,
    select: { dofusId: true, name: true },
    overrideAccess: true,
  })
  const match = questMatcher(quests.docs.map(({ dofusId, name }) => ({ dofusId, name })))

  // Media solo se busca: lo que falta se apunta en `pending` con un ID negativo, que nunca casa
  // con lo guardado y nunca se escribe (al guardar se vuelve a construir subiendo).
  const known = new Map<string, number | null>()
  let pending = new Set<string>()
  let missing = 0
  const lookUp = async (url: string): Promise<number> => {
    if (!known.has(url)) {
      const { docs } = await payload.find({
        collection: 'media',
        where: { originalUrl: { equals: url } },
        limit: 1,
        depth: 0,
        overrideAccess: true,
      })
      known.set(url, docs[0]?.id ?? null)
    }
    const id = known.get(url)
    if (id != null) return id
    pending.add(url)
    missing += 1
    return -missing
  }
  // --- Guías nuevas ---
  const converted: ConvertedGuide[] = []
  for (const delta of newGuides) {
    const html = (await readInventoryPage(next, delta.slug))!
    const page = parsePage(html)
    const title = /<title>([\s\S]*?)<\/title>/.exec(html)?.[1]?.split(' | ')[0]?.trim() ?? ''
    const draft = toQuestGuide(page, { slug: delta.slug, questDofusIds: [] })
    const found = match(delta.slug, [draft.guide.title, title])
    const guide = toQuestGuide(page, {
      slug: delta.slug,
      questDofusIds: found.ambiguous ? [] : found.questIds,
    })
    if (found.ambiguous) guide.oddities.push('Cruce ambiguo con DofusDB, sin enlazar')
    await releaseDom()
    if (isLegacySource(delta.slug)) {
      report.blockedByTable.push(delta.slug)
      continue
    }
    converted.push(guide)
    report.newGuides.push({
      slug: delta.slug,
      title: guide.guide.title,
      questIds: found.questIds,
      ambiguous: found.ambiguous,
      blocks: 0,
      uploads: [],
      oddities: guide.oddities,
    })
  }
  const looking = await createGuideBuilder(
    payload,
    converted.flatMap(({ guide }) => guide.questDofusIds),
    (url) => lookUp(url),
  )
  for (const [index, { guide, oddities }] of converted.entries()) {
    pending = new Set()
    const imported = await looking.build(guide, [...oddities])
    const entry = report.newGuides[index]!
    entry.blocks = imported.body.length
    entry.uploads = [...pending]
  }
  if (apply && converted.length) {
    const result = await loadQuestGuides(payload, converted, {
      fetchImage: options.fetchImage,
      log,
    })
    report.written.created += result.guides.created
    report.written.uploads += result.media.created
  }

  return report
}

/** El informe, página a página, y los totales. */
export function deltaReport(report: DeltaReport, apply: boolean): string[] {
  const lines: string[] = []
  lines.push(`Guías nuevas (${report.newGuides.length}), como borradores:`)
  for (const guide of report.newGuides) {
    const quest = guide.ambiguous
      ? `cruce ambiguo (${guide.questIds.join(', ')}), sin enlazar`
      : guide.questIds.length
        ? `misión ${guide.questIds[0]}`
        : 'sin misión de DofusDB'
    lines.push(
      `- Nueva ${guide.slug} «${guide.title}»: ${quest}, ${guide.blocks} bloques, ` +
        `${guide.uploads.length} imágenes por subir`,
    )
    for (const oddity of guide.oddities) lines.push(`    Rareza: ${oddity}`)
  }
  for (const slug of report.blockedByTable) {
    lines.push(
      `- Bloqueada ${slug}: la tabla de redirecciones aún tiene su fila; despliega la tabla ` +
        'sin ella (pnpm redirects:stubs) y repite',
    )
  }
  lines.push('', 'Sin tratar:')
  for (const page of report.untreated) lines.push(`- ${page.path} (${page.status}): ${page.reason}`)
  const uploads = report.newGuides.reduce((sum, guide) => sum + guide.uploads.length, 0)
  lines.push(
    '',
    `Guías nuevas: ${report.newGuides.length} (bloqueadas por la tabla: ` +
      `${report.blockedByTable.length}). Sin tratar: ${report.untreated.length}.`,
    apply
      ? `Escrito: ${report.written.created} guías creadas; ${report.written.uploads} imágenes subidas.`
      : `En seco: sin --apply no se escribe ni se sube nada. Imágenes que subiría: ${uploads}.`,
  )
  return lines
}
