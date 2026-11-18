// Pone al día el texto del resumen de las guías importadas antes de dos arreglos del
// importador, como lo dejaría ahora `pnpm import:guides`:
// 1. Un elemento de lista con una sublista daba su texto pegado al de la sublista y luego la
//    sublista otra vez («Si eres nivel 1 a 109: 664 793 XP.7 020 kamas.…» y debajo las mismas
//    cifras). Ahora da su propia línea y debajo las de la sublista. Toca Prerrequisitos,
//    Necesitarás (notas) y Recompensas.
// 2. La etiqueta «Prerequisitos:» (o «Prrerequisitos:») no se reconocía: la guía se quedaba sin
//    Prerrequisitos y la etiqueta con su lista quedaba en el cuerpo. Ahora llena Prerrequisitos
//    y quita ese bloque del cuerpo.
// Sigue la regla de la importación (importSnapshot): un campo cambia solo mientras tiene lo que
// escribió la última importación; si Torre lo cambió en el panel, se queda y se lista. Lo usa
// scripts/backfill-summary-text.ts (pnpm guides:summary-text).
import { isDeepStrictEqual } from 'node:util'
import type { Payload } from 'payload'

import { livePicks } from '@/lib/guides/need-notes'
import { readRewardsText } from '@/lib/guides/reward-text'
import type { QuestGuide } from '@/payload-types'

import {
  comparable,
  editedSinceImport,
  same,
  valueAt,
  type TrackedField,
} from './load-quest-guides'
import { releaseDom } from './squarespace/dom'
import { parsePage, type SquarespacePage } from './squarespace/parse-page'
import { summaryLabel, toQuestGuide, type GuideDraft } from './squarespace/to-quest-guide'

export const SUMMARY_TEXT_FIELDS = [
  'summary.prerequisites',
  'summary.needs.notes',
  'summary.rewards',
] as const satisfies readonly TrackedField[]
export type SummaryTextField = (typeof SUMMARY_TEXT_FIELDS)[number]

type Block = { blockType: string; content?: unknown; body?: Block[] | null; [key: string]: unknown }
type DungeonPick = { note?: string | null; [key: string]: unknown }
type Snapshot = Partial<Record<TrackedField, unknown>>

/** Lo que hace falta de una guía guardada: su resumen, su cuerpo y su snapshot. */
export interface StoredGuide {
  slug: string
  summary?: {
    prerequisites?: string | null
    rewards?: string | null
    needs?: { notes?: string | null; dungeons?: DungeonPick[] | null } | null
    [key: string]: unknown
  } | null
  body?: Block[] | null
  importSnapshot?: unknown
}

export interface SummaryTextUpdate {
  changes: { field: SummaryTextField; from: string | null; to: string | null }[]
  /** Los campos que Torre cambió en el panel: se quedan como están. */
  kept: SummaryTextField[]
  /** Los que cambiarían más que el texto: no se tocan aquí. */
  skipped: { field: SummaryTextField; reason: string }[]
  /**
   * El bloque «Prerequisitos:» que se quedaba en el cuerpo: quitado porque Prerrequisitos ya
   * dice lo mismo; sin quitar porque Torre escribió otros Prerrequisitos (`kept`); no
   * encontrado como lo dejó la importación al llenar Prerrequisitos (`missing`); o nada.
   */
  labelBlock: 'removed' | 'kept' | 'missing' | 'none'
  /** Las mazmorras elegidas a mano cuya nota ya no está en Notas, que se quitan. */
  staleDungeons: string[]
  /** Lo que se guarda (sin `_status`), o null si no cambia nada. */
  data: Record<string, unknown> | null
}

const SKIPPED_REWARDS = 'cambiarían las cifras que se leen de su texto; pasa por pnpm import:guides'

const text = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() ? value : null

/** El valor de cada campo en la guía convertida, como lo escribe la importación. */
function convertedValue(guide: GuideDraft, field: SummaryTextField): string | null {
  if (field === 'summary.needs.notes') return text(guide.summary.needs?.notes)
  if (field === 'summary.prerequisites') return text(guide.summary.prerequisites)
  return text(guide.summary.rewards)
}

/**
 * Si dos textos de recompensas dan lo mismo a los campos de la guía (XP, kamas, objetos,
 * notas): los que no se leen solos no dan nada, así que valen igual entre ellos.
 */
function sameReading(a: string | null, b: string | null): boolean {
  const before = readRewardsText(a)
  const after = readRewardsText(b)
  if (before.unreadable !== undefined || after.unreadable !== undefined) {
    return before.unreadable !== undefined && after.unreadable !== undefined
  }
  const fields = (read: typeof before & { notes: string[] }) => ({
    ...read,
    items: read.items.map(({ quantity, name }) => ({ quantity, name })),
  })
  return isDeepStrictEqual(fields(before), fields(after))
}

type LexicalNode = { type?: string; text?: string; children?: LexicalNode[] }

function plain(node: LexicalNode): string {
  if (node.type === 'text') return node.text ?? ''
  if (node.type === 'linebreak') return ' '
  return (node.children ?? []).map(plain).join('')
}

/**
 * Las líneas de un bloque de texto como las leería la importación: una por párrafo y una por
 * elemento de lista, sin el texto de sus sublistas, que dan sus propias líneas.
 */
function blockLines(block: Block): string[] {
  const root = (block.content as { root?: LexicalNode } | undefined)?.root
  const lines: string[] = []
  const visit = (node: LexicalNode) => {
    if (node.type === 'list') {
      for (const item of node.children ?? []) visit(item)
    } else if (node.type === 'listitem') {
      const children = node.children ?? []
      lines.push(
        children
          .filter((child) => child.type !== 'list')
          .map(plain)
          .join(' '),
      )
      for (const child of children) if (child.type === 'list') visit(child)
    } else {
      lines.push(plain(node))
    }
  }
  for (const node of root?.children ?? []) visit(node)
  return lines.map((line) => line.replace(/\s+/g, ' ').trim()).filter(Boolean)
}

/** Si el bloque es la etiqueta de Prerrequisitos con su lista, y esa lista es `prerequisites`. */
function isLabelBlock(block: Block, prerequisites: string): boolean {
  if (block.blockType !== 'richText') return false
  const [first, ...rest] = blockLines(block)
  const label = first ? summaryLabel(first) : null
  if (label?.field !== 'prerequisites') return false
  return [label.rest, ...rest].filter(Boolean).join('\n') === prerequisites
}

/**
 * El cuerpo sin el bloque de la etiqueta, suelto o dentro de un paso, o null si no está como
 * lo dejó la importación. Un paso no se queda vacío: si el bloque es lo único que tiene, sigue.
 */
function withoutLabelBlock(body: Block[], prerequisites: string): Block[] | null {
  for (const [index, block] of body.entries()) {
    if (isLabelBlock(block, prerequisites)) return body.filter((_, at) => at !== index)
    if (block.blockType !== 'step') continue
    const steps = block.body ?? []
    const at = steps.findIndex((inner) => isLabelBlock(inner, prerequisites))
    if (at === -1 || steps.length < 2) continue
    const stepBody = steps.filter((_, i) => i !== at)
    return body.map((candidate, i) => (i === index ? { ...block, body: stepBody } : candidate))
  }
  return null
}

const squashed = (line: string) => line.replace(/\s+/g, '')
const textLines = (value: string) =>
  value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

/**
 * Si `stored` es `next` como lo escribía la importación antes de leer bien las sublistas: un
 * elemento con sublista daba su texto pegado al de toda la sublista, y luego la sublista otra
 * vez. Cada línea guardada es entonces su línea nueva seguida de las de su sublista, sin
 * espacios entre ellas. Sirve para las guías importadas antes del snapshot, que no dicen qué
 * escribió la importación: un texto que Torre tocó ya no encaja.
 */
export function isOldListRendering(stored: string, next: string): boolean {
  const before = textLines(stored)
  const after = textLines(next)
  if (stored === next || before.length !== after.length) return false
  return before.every((line, at) => {
    const target = squashed(line)
    let joined = ''
    for (const following of after.slice(at)) {
      joined += squashed(following)
      if (joined === target) return true
      if (!target.startsWith(joined)) return false
    }
    return false
  })
}

/** Para ver si Torre escribió lo mismo: sin punto final ni espacios de más en cada línea. */
const loosely = (value: string) =>
  textLines(value)
    .map((line) => line.replace(/\.+$/, '').replace(/\s+/g, ' '))
    .join('\n')

/**
 * Qué cambia en una guía guardada con lo que da ahora la conversión de su página, campo a
 * campo con la regla de la importación: cambia lo que sigue como lo dejó la última
 * importación (su snapshot) y, en una guía sin snapshot, lo vacío y lo que es justo lo que
 * escribía la importación antes del arreglo de las sublistas. No escribe nada: `data` es lo
 * que se guardaría.
 */
export function summaryTextUpdate(stored: StoredGuide, converted: GuideDraft): SummaryTextUpdate {
  const snapshot = (stored.importSnapshot ?? {}) as Snapshot
  const update: SummaryTextUpdate = {
    changes: [],
    kept: [],
    skipped: [],
    labelBlock: 'none',
    staleDungeons: [],
    data: null,
  }
  for (const field of SUMMARY_TEXT_FIELDS) {
    const current = text(valueAt(stored, field))
    const value = convertedValue(converted, field)
    if (same(current, value)) continue
    const oldImport =
      !(field in snapshot) &&
      current !== null &&
      value !== null &&
      isOldListRendering(current, value)
    if (!oldImport && editedSinceImport(current, field, snapshot)) {
      update.kept.push(field)
    } else if (field === 'summary.rewards' && !sameReading(current, value)) {
      update.skipped.push({ field, reason: SKIPPED_REWARDS })
    } else {
      update.changes.push({ field, from: current, to: value })
    }
  }

  const summary: Record<string, unknown> = {}
  const nextSnapshot: Snapshot = { ...snapshot }
  for (const { field, to } of update.changes) {
    nextSnapshot[field] = comparable(to) ?? null
    if (field === 'summary.prerequisites') summary.prerequisites = to
    else if (field === 'summary.rewards') summary.rewards = to
    else {
      // Como la importación: una mazmorra elegida a mano sin su nota en Notas se quita.
      const picks = stored.summary?.needs?.dungeons ?? []
      const { live, stale } = livePicks(picks, to)
      update.staleDungeons = stale.map((pick) => pick.note ?? '')
      summary.needs = { notes: to, dungeons: live }
    }
  }

  // La etiqueta mal escrita dejaba Prerrequisitos vacíos y su bloque en el cuerpo. El bloque
  // sobra cuando Prerrequisitos ya dice lo mismo, lo llene ahora esta carga o lo llenara Torre.
  const prerequisites = convertedValue(converted, 'summary.prerequisites')
  let body: Block[] | null = null
  if (prerequisites) {
    const filled = update.changes.find(({ field }) => field === 'summary.prerequisites')
    const final = filled ? filled.to : text(stored.summary?.prerequisites)
    const without = withoutLabelBlock(stored.body ?? [], prerequisites)
    if (without && final && loosely(final) === loosely(prerequisites)) {
      body = without
      update.labelBlock = 'removed'
      // El snapshot del cuerpo sigue al cuerpo solo si este seguía como lo dejó la importación.
      if ('body' in snapshot && same(stored.body, snapshot.body)) {
        nextSnapshot.body = comparable(body) ?? null
      }
    } else if (without) {
      update.labelBlock = 'kept'
    } else if (filled && filled.from === null) {
      update.labelBlock = 'missing'
    }
  }

  if (update.changes.length || body) {
    update.data = {
      ...(Object.keys(summary).length && { summary }),
      ...(body && { body }),
      ...(!isDeepStrictEqual(snapshot, nextSnapshot) && { importSnapshot: nextSnapshot }),
    }
  }
  return update
}

/** Si la página escribe la etiqueta de Prerrequisitos de otra forma («Prerequisitos:»). */
function hasMisspelledLabel(page: SquarespacePage): boolean {
  return page.blocks.some(
    (block) =>
      block.type === 'text' &&
      block.elements.some(
        (element) =>
          summaryLabel(element.text)?.field === 'prerequisites' &&
          !/^prerrequisitos\s*:/i.test(element.text.trim()),
      ),
  )
}

export interface BackfillSummaryTextOptions {
  /** La página guardada de Squarespace por su slug, o null si no está. */
  readPage: (slug: string) => Promise<string | null>
  apply: boolean
  log?: (message: string) => void
}

export interface SummaryTextResult {
  guides: number
  /** Guías importadas sin página guardada. */
  noSource: number
  updates: (SummaryTextUpdate & { slug: string; status: 'published' | 'draft' })[]
  published: number
  drafts: number
}

/** El slug de Squarespace de una guía importada, de su URL original. */
function sourceSlug(originalUrl: string | null | undefined): string | null {
  const slug = originalUrl?.trim().split('/').filter(Boolean).at(-1)
  return slug && /^[\w-]+$/.test(slug) ? slug : null
}

/**
 * Recorre las guías importadas por su última versión y pone al día el texto de su resumen con
 * lo que da ahora la conversión de su página guardada. Como las demás cargas: lo último
 * publicado se guarda publicado y un borrador se guarda como borrador. Repetirlo no cambia nada.
 */
export async function backfillSummaryText(
  payload: Payload,
  options: BackfillSummaryTextOptions,
): Promise<SummaryTextResult> {
  const log = options.log ?? (() => {})
  const result: SummaryTextResult = { guides: 0, noSource: 0, updates: [], published: 0, drafts: 0 }
  const guides = await payload.find({
    collection: 'quest-guides',
    where: { originalUrl: { exists: true } },
    pagination: false,
    depth: 0,
    draft: true,
    sort: 'slug',
    select: { slug: true, originalUrl: true, summary: true },
    overrideAccess: true,
  })

  for (const listed of guides.docs) {
    const slug = sourceSlug(listed.originalUrl)
    if (!slug) continue
    result.guides += 1
    const html = await options.readPage(slug)
    if (html === null) {
      result.noSource += 1
      continue
    }
    const page = parsePage(html)
    const { guide: converted } = toQuestGuide(page, { slug, questDofusIds: [] })
    const misspelled = hasMisspelledLabel(page)
    await releaseDom()
    // Sin diferencias en el texto del resumen ni etiqueta mal escrita, la guía no se lee entera.
    const upToDate = SUMMARY_TEXT_FIELDS.every((field) =>
      same(text(valueAt(listed, field)), convertedValue(converted, field)),
    )
    if (upToDate && !misspelled) continue
    const guide: QuestGuide = await payload.findByID({
      collection: 'quest-guides',
      id: listed.id,
      depth: 0,
      draft: true,
      overrideAccess: true,
    })
    const update = summaryTextUpdate(guide as unknown as StoredGuide, converted)
    const nothing = !update.data && !update.kept.length && !update.skipped.length
    if (nothing && update.labelBlock === 'none') continue
    const published = guide._status === 'published'
    result.updates.push({ ...update, slug: guide.slug, status: published ? 'published' : 'draft' })
    if (!update.data) continue
    log(`Guía ${guide.slug}${published ? '' : ' (borrador)'}: ${describe(update).join(', ')}`)
    if (!options.apply) continue
    await payload.update({
      collection: 'quest-guides',
      id: guide.id,
      data: { ...update.data, _status: published ? 'published' : 'draft' } as never,
      draft: !published,
      depth: 0,
      overrideAccess: true,
    })
    if (published) result.published += 1
    else result.drafts += 1
  }
  return result
}

const FIELD_NAMES: Record<SummaryTextField, string> = {
  'summary.prerequisites': 'Prerrequisitos',
  'summary.needs.notes': 'Necesitarás',
  'summary.rewards': 'Recompensas',
}

/** Lo que cambia en una guía, para el informe. */
function describe(update: SummaryTextUpdate): string[] {
  return [
    ...update.changes.map(({ field }) => FIELD_NAMES[field]),
    ...(update.labelBlock === 'removed' ? ['bloque «Prerequisitos» quitado del cuerpo'] : []),
  ]
}

/** El informe: cada guía que cambia, lo que se queda, lo que no se toca y los totales. */
export function summaryTextReport(result: SummaryTextResult, apply: boolean): string[] {
  const lines: string[] = []
  const draft = (update: SummaryTextResult['updates'][number]) =>
    update.status === 'draft' ? ' (borrador)' : ''
  const changed = result.updates.filter((update) => update.data)
  for (const update of changed) {
    lines.push(`Cambia ${update.slug}${draft(update)}: ${describe(update).join(', ')}`)
  }
  for (const update of result.updates) {
    const where = `${update.slug}${draft(update)}`
    for (const field of update.kept) {
      lines.push(
        `Se queda en ${where}: ${FIELD_NAMES[field]}, distinto de su página ` +
          '(cambiado en el panel o por otra carga)',
      )
    }
    for (const { field, reason } of update.skipped) {
      lines.push(`Sin tocar en ${where}: ${FIELD_NAMES[field]}, ${reason}`)
    }
    if (update.labelBlock === 'kept') {
      lines.push(
        `Revisar ${where}: el bloque «Prerequisitos» sigue en el cuerpo porque Prerrequisitos ` +
          'dice otra cosa',
      )
    }
    if (update.labelBlock === 'missing') {
      lines.push(
        `Revisar ${where}: Prerrequisitos llenos, pero el bloque «Prerequisitos» no está en el ` +
          'cuerpo como lo dejó la importación; se queda',
      )
    }
    for (const note of update.staleDungeons) {
      lines.push(`Mazmorra elegida a mano quitada en ${where}: «${note}» ya no está en Notas`)
    }
  }
  const count = (field: SummaryTextField) =>
    changed.filter((update) => update.changes.some((change) => change.field === field)).length
  const drafts = changed.filter((update) => update.status === 'draft').length
  const kept = result.updates.reduce((sum, update) => sum + update.kept.length, 0)
  lines.push(
    `Guías importadas leídas: ${result.guides} (${result.noSource} sin página guardada). ` +
      `Por cambiar: ${changed.length} (publicadas: ${changed.length - drafts}, ` +
      `borradores: ${drafts}).`,
    `Campos por cambiar: Prerrequisitos ${count('summary.prerequisites')}, Necesitarás ` +
      `${count('summary.needs.notes')}, Recompensas ${count('summary.rewards')}. Bloques ` +
      `«Prerequisitos» quitados del cuerpo: ` +
      `${changed.filter((update) => update.labelBlock === 'removed').length}. ` +
      `Campos distintos de su página que se quedan: ${kept}.`,
    apply
      ? `Guardadas: publicadas ${result.published} y borradores ${result.drafts}.`
      : 'En seco: sin --apply no se escribe nada.',
  )
  return lines
}
