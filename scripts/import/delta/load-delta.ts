// La importación delta: lleva a ta-web lo que Torre escribió en Squarespace después de la
// primera importación, comparando el inventario anterior con uno nuevo (pnpm import:inventory).
// - Guías nuevas (esbozos que llenó y páginas nuevas del sitemap): las crea la importación de
//   guías (loadQuestGuides), como borradores, con su misión de DofusDB cuando casa una sola.
// - Guías ya importadas cuya página cambió: cada campo con la regla de rule.ts; lo que Torre
//   cambió en el panel se queda y se lista. Se guarda con el estado que tenía (lo publicado,
//   publicado) y con su importSnapshot, para que la siguiente pasada solo mire el snapshot.
// - Páginas de logro cuya página cambió: su prosa con import:achievement-prose (load-prose.ts),
//   que ya sigue la regla del snapshot.
// - Metalogros: solo informa de la lista de Squarespace contra la del panel.
// Primero decide y después sube: en seco no escribe ni sube nada a Media.
import { isDeepStrictEqual } from 'node:util'
import type { Payload } from 'payload'

import { livePicks } from '@/lib/guides/need-notes'
import { isLegacySource, LEGACY_URLS } from '@/lib/redirects/table'
import type { QuestGuide } from '@/payload-types'

import { loadAchievementProse, type LoadProseOptions } from '../achievements/load-prose'
import { readAchievementPages } from '../achievements/read-pages'
import { readInventoryPage } from '../inventory/read'
import { pageFeatures, type PageDelta } from '../inventory/pages'
import {
  comparable,
  createGuideBuilder,
  loadQuestGuides,
  type FetchImage,
  type ImportedGuide,
  type TrackedField,
} from '../load-quest-guides'
import { ImageDownloadError } from '../media-by-url'
import { releaseDom } from '../squarespace/dom'
import { parsePage } from '../squarespace/parse-page'
import { toQuestGuide, type ConvertedGuide } from '../squarespace/to-quest-guide'
import { compareMetalogro, linkedSlugs, type MetalogroComparison } from './metalogros'
import { looksLikeQuestGuide, neverQuestGuide, questMatcher } from './match'
import { deltaUpdate, type Snapshot } from './rule'

export interface LoadDeltaOptions {
  /** Las carpetas del inventario anterior y del nuevo. */
  previous: string
  next: string
  /** Lo que cambió entre los dos (compareInventories). */
  deltas: PageDelta[]
  apply: boolean
  fetchImage: FetchImage
  /** Lo que import:achievement-prose necesita para la prosa (proseMedia). */
  prose: Pick<LoadProseOptions, 'htmlToLexical' | 'mediaFor' | 'posterFor'>
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

export interface GuideUpdate {
  slug: string
  status: 'published' | 'draft'
  changed: TrackedField[]
  kept: TrackedField[]
  uploads: string[]
  staleDungeons: string[]
  /** Sin página en el inventario anterior: solo cuenta el snapshot. */
  noPreviousPage: boolean
}

export interface ProseUpdate {
  slug: string
  changed: string[]
  uploads: string[]
}

export interface DeltaReport {
  newGuides: NewGuide[]
  /** Guías nuevas que la tabla de redirecciones tapa: hay que desplegarla sin su fila antes. */
  blockedByTable: string[]
  guides: GuideUpdate[]
  /** Guías cuya página cambió pero cuya importación da lo mismo (cambios de plantilla). */
  sameImport: string[]
  prose: ProseUpdate[]
  proseKept: { slug: string; field: string }[]
  proseOddities: { slug: string; message: string }[]
  metalogros: (MetalogroComparison & { path: string })[]
  /** Páginas que cambiaron y la delta no trata, con el porqué. */
  untreated: { path: string; status: PageDelta['status']; reason: string }[]
  written: { created: number; updated: number; prose: number; uploads: number }
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

/** El ancla de /metalogros a la que la tabla de redirecciones lleva una página de metalogro. */
function metalogroAnchor(slug: string): string | null {
  const rule = LEGACY_URLS.get(`/${slug}`)
  return rule && 'to' in rule && rule.to.startsWith('/metalogros#') ? rule.to.slice(12) : null
}

/** Las URL de las imágenes de un cuerpo convertido, para saber qué hay que subir. */
type Uploads = Set<string>

export async function loadDelta(payload: Payload, options: LoadDeltaOptions): Promise<DeltaReport> {
  const { apply, previous, next } = options
  const log = options.log ?? (() => {})
  const report: DeltaReport = {
    newGuides: [],
    blockedByTable: [],
    guides: [],
    sameImport: [],
    prose: [],
    proseKept: [],
    proseOddities: [],
    metalogros: [],
    untreated: [],
    written: { created: 0, updated: 0, prose: 0, uploads: 0 },
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

  const guideUpdates: { delta: PageDelta; id: number }[] = []
  const newGuides: PageDelta[] = []
  const prosePages: string[] = []
  const metalogroPages: PageDelta[] = []
  for (const delta of options.deltas.filter((d) => TREATED.has(d.status))) {
    const { slug } = delta
    const guideId = guideBySource.get(slug)
    if (guideId !== undefined) {
      guideUpdates.push({ delta, id: guideId })
    } else if (slug.startsWith('metalogro-') && metalogroAnchor(slug)) {
      metalogroPages.push(delta)
    } else if (owners.get(slug)?.startsWith('achievement-pages')) {
      prosePages.push(slug)
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

  // Las misiones de DofusDB: para el cruce de las guías nuevas y la misión de las ya importadas.
  const quests = await payload.find({
    collection: 'quests',
    pagination: false,
    depth: 0,
    select: { dofusId: true, name: true },
    overrideAccess: true,
  })
  const match = questMatcher(quests.docs.map(({ dofusId, name }) => ({ dofusId, name })))
  const dofusIdOf = new Map(quests.docs.map((quest) => [quest.id, quest.dofusId]))

  // Media solo se busca: lo que falta se apunta en `pending` con un ID negativo, que nunca casa
  // con lo guardado y nunca se escribe (al guardar se vuelve a construir subiendo).
  const known = new Map<string, number | null>()
  let pending: Uploads = new Set()
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
  const uploaded = new Map<string, number>()
  const upload = async (url: string, alt: string): Promise<number> => {
    const found = known.get(url) ?? uploaded.get(url)
    if (found != null) return found
    const file = await options.fetchImage(url).catch((cause: unknown) => {
      throw new ImageDownloadError(cause instanceof Error ? cause.message : String(cause), {
        cause,
      })
    })
    const created = await payload.create({
      collection: 'media',
      data: { alt, originalUrl: url },
      file,
      depth: 0,
      overrideAccess: true,
    })
    uploaded.set(url, created.id)
    report.written.uploads += 1
    return created.id
  }

  const convert = async (dir: string, slug: string, questDofusIds: number[]) => {
    const html = await readInventoryPage(dir, slug)
    if (html === null) return null
    const converted = toQuestGuide(parsePage(html), { slug, questDofusIds })
    await releaseDom()
    return converted
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

  // --- Guías ya importadas cuya página cambió ---
  const stored = new Map<number, QuestGuide>()
  for (const { id } of guideUpdates) {
    stored.set(
      id,
      await payload.findByID({
        collection: 'quest-guides',
        id,
        depth: 0,
        draft: true,
        overrideAccess: true,
      }),
    )
  }
  const questOf = (guide: QuestGuide) => {
    const id = typeof guide.quest === 'object' ? guide.quest?.id : guide.quest
    const dofusId = id == null ? undefined : dofusIdOf.get(id)
    return dofusId === undefined ? [] : [dofusId]
  }
  const updateBuilder = await createGuideBuilder(
    payload,
    [...stored.values()].flatMap(questOf),
    (url) => lookUp(url),
  )
  const uploadBuilder = apply
    ? await createGuideBuilder(payload, [...stored.values()].flatMap(questOf), upload)
    : null

  for (const { delta, id } of guideUpdates) {
    const guide = stored.get(id)!
    const questIds = questOf(guide)
    const oldPage = await convert(previous, delta.slug, questIds)
    const newPage = await convert(next, delta.slug, questIds)
    if (!newPage) continue
    pending = new Set()
    const before: ImportedGuide | null = oldPage
      ? await updateBuilder.build(oldPage.guide, [])
      : null
    pending = new Set()
    const after = await updateBuilder.build(newPage.guide, [])
    const uploads = [...pending]
    const snapshot = (guide.importSnapshot ?? {}) as Snapshot
    const update = deltaUpdate({ stored: guide, snapshot, before: before ?? {}, after })
    const status = guide._status === 'published' ? 'published' : 'draft'
    const changed = update.changes.map(({ field }) => field)

    if (changed.length === 0) {
      if (update.kept.length === 0) report.sameImport.push(delta.slug)
      else {
        report.guides.push({
          slug: guide.slug,
          status,
          changed,
          kept: update.kept,
          uploads: [],
          staleDungeons: [],
          noPreviousPage: !oldPage,
        })
      }
      // Sin cambios de contenido: solo se anota el snapshot, con el estado que tenía.
      if (apply && !isDeepStrictEqual(snapshot, update.snapshot)) {
        await payload.update({
          collection: 'quest-guides',
          id,
          data: { importSnapshot: update.snapshot, _status: status },
          draft: status === 'draft',
          depth: 0,
          overrideAccess: true,
        })
      }
      continue
    }

    // Como la importación: una mazmorra elegida a mano sin su nota en Notas se quita.
    const notes = update.changes.find(({ field }) => field === 'summary.needs.notes')
    const { live: dungeons, stale } = livePicks(
      guide.summary?.needs?.dungeons ?? [],
      notes ? (notes.to as string | null) : (guide.summary?.needs?.notes ?? null),
    )
    report.guides.push({
      slug: guide.slug,
      status,
      changed,
      kept: update.kept,
      uploads: changed.includes('body') ? uploads : [],
      staleDungeons: stale.map((pick) => pick.note ?? ''),
      noPreviousPage: !oldPage,
    })
    log(`Guía ${guide.slug}: ${apply ? 'actualizada' : 'cambiaría'} (${changed.join(', ')})`)
    if (!apply) continue

    let body: unknown
    if (changed.includes('body')) {
      // Ahora sí: el cuerpo con sus imágenes subidas a Media.
      body = (await uploadBuilder!.build(newPage.guide, [])).body
      update.snapshot.body = comparable(body) ?? null
    }
    const data: Record<string, unknown> = {}
    const summary: Record<string, unknown> = {}
    const needs: Record<string, unknown> = { dungeons }
    for (const { field, to } of update.changes) {
      const [head, sub, leaf] = field.split('.')
      const value = field === 'body' ? body : to
      if (head !== 'summary') data[head!] = value
      else if (sub !== 'needs') summary[sub!] = value
      else needs[leaf!] = value
    }
    await payload.update({
      collection: 'quest-guides',
      id,
      data: {
        ...data,
        summary: { ...summary, needs },
        importSnapshot: update.snapshot,
        _status: status,
      } as never,
      draft: status === 'draft',
      depth: 0,
      overrideAccess: true,
    })
    report.written.updated += 1
  }

  // --- Prosa de las páginas de logro ---
  if (prosePages.length) {
    const { docs } = await payload.find({
      collection: 'achievement-pages',
      where: { slug: { in: prosePages } },
      select: { slug: true, achievement: true, quests: true },
      depth: 0,
      draft: true,
      pagination: false,
      overrideAccess: true,
    })
    const pages = await readAchievementPages(
      docs.map((doc) => ({
        slug: doc.slug,
        dofusDb: doc.achievement != null,
        quests: (doc.quests ?? []).length > 0,
      })),
      (slug) => readInventoryPage(next, slug),
    )
    for (const slug of prosePages) {
      // Una página cada vez, para saber qué capturas subiría cada una.
      const misses = new Set<string>()
      let changed: string[] = []
      const result = await loadAchievementProse(payload, {
        pages,
        apply,
        ...options.prose,
        mediaFor: async (url, alt, opts) => {
          const id = await options.prose.mediaFor(url, alt, opts)
          if (id === null) misses.add(url)
          return id
        },
        posterFor: async (videoId, opts) => {
          const id = await options.prose.posterFor(videoId, opts)
          if (id === null) misses.add(`https://www.youtube.com/watch?v=${videoId}`)
          return id
        },
        only: (candidate) => candidate === slug,
        // Los campos que cambian salen en su línea: «slug: se actualizaría (intro, outro)».
        log: (message) => {
          changed = /\(([^)]*)\)$/.exec(message)?.[1]?.split(', ') ?? []
          log(`Página de logro ${message}`)
        },
      })
      report.proseKept.push(...result.kept)
      report.proseOddities.push(...result.oddities)
      if (result.updated) {
        report.prose.push({ slug, changed, uploads: apply ? [] : [...misses] })
        if (apply) report.written.prose += 1
      }
    }
  }

  // --- Metalogros: solo el informe ---
  if (metalogroPages.length) {
    const pages = await payload.find({
      collection: 'achievement-pages',
      pagination: false,
      depth: 1,
      draft: true,
      select: { slug: true, group: true },
      overrideAccess: true,
    })
    const pageGroups = new Map(
      pages.docs.map((doc) => [
        doc.slug,
        doc.group && typeof doc.group === 'object' ? doc.group.slug : null,
      ]),
    )
    for (const delta of metalogroPages) {
      const anchor = metalogroAnchor(delta.slug)!
      const { docs } = await payload.find({
        collection: 'achievement-groups',
        // El ancla de /metalogros es el slug del metalogro, con o sin «metalogro-» delante.
        where: { slug: { in: [anchor, `metalogro-${anchor}`] } },
        limit: 1,
        depth: 1,
        draft: true,
        overrideAccess: true,
      })
      const group = docs[0]
      const html = await readInventoryPage(next, delta.slug)
      const linked = linkedSlugs(html ? pageFeatures(html).links : [])
      report.metalogros.push({
        path: delta.path,
        ...compareMetalogro(linked, {
          group: group?.slug ?? anchor,
          pageGroups,
          guides: (group?.guides ?? []).flatMap((guide) =>
            typeof guide === 'object' && guide ? [guide.slug] : [],
          ),
          // Las guías nuevas de esta pasada cuentan ya como guías.
          questGuides: new Set([...guideSlugs, ...report.newGuides.map(({ slug }) => slug)]),
        }),
      })
    }
  }
  return report
}

const FIELD_NAMES: Partial<Record<TrackedField, string>> = {
  title: 'título',
  slug: 'dirección',
  body: 'cuerpo',
  quest: 'misión',
  'summary.prerequisites': 'Prerrequisitos',
  'summary.rewards': 'Recompensas',
  'summary.needs.notes': 'Necesitarás',
  'summary.needs.items': 'objetos de Necesitarás',
  'summary.startNpc': 'PNJ de inicio',
  'summary.startX': 'X',
  'summary.startY': 'Y',
}
const fieldName = (field: TrackedField) => FIELD_NAMES[field] ?? field.replace('summary.', '')

/** El informe, página a página, y los totales. */
export function deltaReport(report: DeltaReport, apply: boolean): string[] {
  const lines: string[] = []
  const draft = (status: string) => (status === 'draft' ? ' (borrador)' : '')
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
  lines.push('', 'Guías ya importadas cuya página cambió:')
  for (const guide of report.guides) {
    const where = `${guide.slug}${draft(guide.status)}`
    if (guide.changed.length) {
      lines.push(
        `- Cambia ${where}: ${guide.changed.map(fieldName).join(', ')}` +
          (guide.uploads.length ? ` (${guide.uploads.length} imágenes por subir)` : ''),
      )
    }
    if (guide.kept.length) {
      lines.push(
        `- Se queda en ${where} (editado en el panel o por otra carga): ` +
          guide.kept.map(fieldName).join(', ') +
          (guide.noPreviousPage ? ' [sin página en el inventario anterior]' : ''),
      )
    }
    for (const note of guide.staleDungeons) {
      lines.push(`    Mazmorra elegida a mano quitada: «${note}» ya no está en Notas`)
    }
  }
  if (report.sameImport.length) {
    lines.push(
      `- Sin cambios en lo que importa (${report.sameImport.length}): ${report.sameImport.join(', ')}`,
    )
  }
  lines.push('', 'Prosa de las páginas de logro:')
  for (const page of report.prose) {
    lines.push(
      `- Cambia ${page.slug}: ${page.changed.join(', ')}` +
        (page.uploads.length ? ` (${page.uploads.length} capturas o portadas por subir)` : ''),
    )
  }
  for (const { slug, field } of report.proseKept) {
    lines.push(`- Se queda en ${slug}: ${field} (editado en el panel)`)
  }
  for (const { slug, message } of report.proseOddities)
    lines.push(`- Rareza en ${slug}: ${message}`)
  lines.push('', 'Metalogros (la delta no los cambia: sus logros salen de DofusDB):')
  for (const group of report.metalogros) {
    lines.push(`- ${group.path} → metalogro ${group.group}`)
    for (const { slug, note } of group.onlySquarespace) {
      lines.push(`    En Squarespace y no en el panel: ${slug} (${note})`)
    }
    for (const slug of group.onlyPanel) lines.push(`    En el panel y no en Squarespace: ${slug}`)
    if (!group.onlySquarespace.length && !group.onlyPanel.length) lines.push('    Iguales')
  }
  lines.push('', 'Sin tratar:')
  for (const page of report.untreated) lines.push(`- ${page.path} (${page.status}): ${page.reason}`)

  const changed = report.guides.filter((guide) => guide.changed.length)
  const kept = report.guides.reduce((sum, guide) => sum + guide.kept.length, 0)
  const uploads =
    report.newGuides.reduce((sum, guide) => sum + guide.uploads.length, 0) +
    changed.reduce((sum, guide) => sum + guide.uploads.length, 0) +
    report.prose.reduce((sum, page) => sum + page.uploads.length, 0)
  lines.push(
    '',
    `Guías nuevas: ${report.newGuides.length} (bloqueadas por la tabla: ${report.blockedByTable.length}). ` +
      `Guías que cambian: ${changed.length} (publicadas: ` +
      `${changed.filter((guide) => guide.status === 'published').length}). Campos de Torre que ` +
      `se quedan: ${kept} en ${report.guides.filter((guide) => guide.kept.length).length} guías. ` +
      `Páginas de logro con prosa nueva: ${report.prose.length} (campos que se quedan: ` +
      `${report.proseKept.length}). Metalogros revisados: ${report.metalogros.length}. Sin ` +
      `tratar: ${report.untreated.length}.`,
    apply
      ? `Escrito: ${report.written.created} guías creadas, ${report.written.updated} actualizadas, ` +
          `${report.written.prose} páginas de logro; ${report.written.uploads} imágenes subidas.`
      : `En seco: sin --apply no se escribe ni se sube nada. Imágenes que subiría: ${uploads}.`,
  )
  return lines
}
