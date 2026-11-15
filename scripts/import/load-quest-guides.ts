import { isDeepStrictEqual } from 'node:util'
import type { Payload, Where } from 'payload'

import { validateSlug } from '@/collections/QuestGuides'
import {
  comparableMonsterName,
  splitFightLists,
  type FightListBlock,
} from '@/lib/guides/fight-lists'
import { livePicks } from '@/lib/guides/need-notes'
import { applySummaryFill, summaryToFill } from '@/lib/guides/summary'
import type { Quest, QuestGuide } from '@/payload-types'

import { createHtmlToLexical } from './rich-text'
import { ImageDownloadError } from './media-by-url'
import { releaseDom } from './squarespace/dom'
import type {
  ContentBlock,
  ConvertedGuide,
  GuideBlock,
  GuideSummary,
} from './squarespace/to-quest-guide'

export interface ImageFile {
  data: Buffer
  mimetype: string
  name: string
  size: number
}

/** Descarga una imagen del CDN de Squarespace. Inyectable para probar sin red. */
export type FetchImage = (url: string) => Promise<ImageFile>

// Drizzle envuelve los errores del cliente en `cause`. No convertir un fallo de
// base de datos en una imagen omitida y una guía marcada como importada.
function connectionFailed(error: unknown): boolean {
  if (!(error instanceof Error)) return false
  const code = (error as Error & { code?: string }).code ?? ''
  return (
    /^(08|57P0)/.test(code) ||
    ['ECONNRESET', 'ETIMEDOUT', 'EADDRNOTAVAIL', 'EPIPE', 'ECONNREFUSED'].includes(code) ||
    /not queryable|connection (?:terminated|closed)/i.test(error.message) ||
    connectionFailed(error.cause)
  )
}

export interface LoadQuestGuidesOptions {
  fetchImage: FetchImage
  log?: (message: string) => void
}

export interface LoadQuestGuidesResult {
  guides: { created: number; updated: number; unchanged: number; skipped: number }
  media: { created: number; reused: number }
  /** Por slug: las rarezas de la conversión más las de la carga. */
  oddities: Record<string, string[]>
  /** Los campos que Torre cambió en el panel y la importación deja como están. */
  kept: { slug: string; field: TrackedField }[]
}

type BodyBlock = NonNullable<QuestGuide['body']>[number]
type StepBody = NonNullable<Extract<BodyBlock, { blockType: 'step' }>['body']>[number]

/**
 * Para comparar con lo guardado: sin IDs (de bloque y los aleatorios de los enlaces de
 * Lexical) ni campos vacíos, que Payload devuelve como null aunque no se enviaran.
 */
function comparable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(comparable)
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key, item]) => key !== 'id' && item !== null && item !== undefined)
        .map(([key, item]) => [key, comparable(item)]),
    )
  }
  return value
}

const SUMMARY_FIELDS = ['prerequisites', 'rewards', 'startNpc', 'startX', 'startY'] as const

/**
 * Los campos que escribe la importación, cada uno con su valor en el snapshot. El resumen va
 * campo a campo: Torre puede cambiar las recompensas y dejar que el resto siga a Squarespace.
 * Las mazmorras elegidas a mano no están: son siempre de Torre.
 */
export const TRACKED_FIELDS = [
  'title',
  'slug',
  'originalUrl',
  'quest',
  'body',
  ...SUMMARY_FIELDS.map((field) => `summary.${field}` as const),
  'summary.needs.notes',
  'summary.needs.items',
] as const
export type TrackedField = (typeof TRACKED_FIELDS)[number]
type Snapshot = Partial<Record<TrackedField, unknown>>

/** El valor de un campo por su ruta («summary.needs.notes»). */
function valueAt(doc: unknown, field: TrackedField): unknown {
  return field
    .split('.')
    .reduce<unknown>(
      (value, key) =>
        value && typeof value === 'object' ? (value as Record<string, unknown>)[key] : undefined,
      doc,
    )
}

const same = (a: unknown, b: unknown) =>
  isDeepStrictEqual(comparable(a) ?? null, comparable(b) ?? null)

// Un campo vacío de una guía sin snapshot no lo escribió Torre: la importación lo llena.
function isEmpty(value: unknown): boolean {
  if (value === null || value === undefined) return true
  if (typeof value === 'string') return !value.trim()
  return Array.isArray(value) && value.length === 0
}

const snapshotOf = (data: unknown): Snapshot =>
  Object.fromEntries(
    TRACKED_FIELDS.map((field) => [field, comparable(valueAt(data, field)) ?? null]),
  )

/**
 * El resumen con todos sus campos: lo que la conversión no trae va como null. Payload
 * conserva los campos de un grupo que no se envían, así que sin esto un dato que
 * desaparece de la página seguiría guardado.
 */
type FullSummary = {
  [field in (typeof SUMMARY_FIELDS)[number]]-?: NonNullable<GuideSummary[field]> | null
}

function fullSummary(summary: GuideSummary) {
  const full = Object.fromEntries(
    SUMMARY_FIELDS.map((field) => [field, summary[field] ?? null]),
  ) as FullSummary
  // La lista de objetos va vacía: la rellena DofusDB (filledSummary y el hook al guardar).
  return { ...full, needs: { notes: summary.needs?.notes ?? null, items: [] } }
}

/**
 * El resumen de Squarespace con los huecos rellenos desde DofusDB, igual que hará el hook
 * de la colección al guardar. Así la guía guardada y la convertida se comparan iguales y
 * repetir la importación no guarda versiones nuevas.
 */
function filledSummary(summary: GuideSummary, quest: Quest | undefined) {
  const full = fullSummary(summary)
  return applySummaryFill(full, summaryToFill(full, quest))
}

/**
 * Guarda las guías convertidas con la API local. Es un trabajo de confianza, así que
 * usa overrideAccess. Idempotente: las guías se buscan por slug y las imágenes por su
 * URL original, de modo que repetirla no duplica nada ni vuelve a descargar, y una guía
 * igual a su último borrador no se toca, para no sumar versiones vacías. Siempre
 * guarda borradores: una guía ya publicada recibe un borrador nuevo y sigue publicada
 * como estaba hasta que Torre lo publique.
 *
 * Nunca deshace lo que Torre cambió en el panel: lo que escribe cada vez se guarda en
 * importSnapshot, y al repetir solo cambia un campo que sigue como lo dejó la última pasada.
 * En una guía importada antes del snapshot, un campo con valor distinto del de Squarespace
 * se trata como suyo. La guía se busca por su URL original, así que cambiarle la dirección
 * no la duplica.
 */
export async function loadQuestGuides(
  payload: Payload,
  guides: ConvertedGuide[],
  options: LoadQuestGuidesOptions,
): Promise<LoadQuestGuidesResult> {
  const log = options.log ?? (() => {})
  const toLexical = await createHtmlToLexical(payload.config)
  const result: LoadQuestGuidesResult = {
    guides: { created: 0, updated: 0, unchanged: 0, skipped: 0 },
    media: { created: 0, reused: 0 },
    oddities: {},
    kept: [],
  }

  const dofusIds = [...new Set(guides.flatMap(({ guide }) => guide.questDofusIds))]
  const quests = await payload.find({
    collection: 'quests',
    where: { dofusId: { in: dofusIds } },
    pagination: false,
    // depth 1: los nombres de objetos y prerrequisitos con los que se rellena el resumen
    depth: 1,
    overrideAccess: true,
  })
  const questByDofusId = new Map(quests.docs.map((quest) => [quest.dofusId, quest]))

  // Los monstruos por nombre, para los combates (el de ID de DofusDB más bajo si se repite).
  const monsters = await payload.find({
    collection: 'monsters',
    pagination: false,
    depth: 0,
    sort: 'dofusId',
    select: { name: true },
    overrideAccess: true,
  })
  const monsterByName = new Map<string, number>()
  for (const monster of monsters.docs) {
    const name = comparableMonsterName(monster.name)
    if (!monsterByName.has(name)) monsterByName.set(name, monster.id)
  }

  // URL original → ID en media, para no repetir consultas ni descargas en la misma pasada.
  const mediaIdByUrl = new Map<string, number>()

  async function mediaFor(url: string, alt: string): Promise<number> {
    const known = mediaIdByUrl.get(url)
    if (known !== undefined) return known

    const existing = await payload.find({
      collection: 'media',
      where: { originalUrl: { equals: url } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })
    let id = existing.docs[0]?.id
    if (id === undefined) {
      const created = await payload.create({
        collection: 'media',
        data: { alt, originalUrl: url },
        file: await options.fetchImage(url).catch((cause: unknown) => {
          // El transporte del CDN puede fallar con los mismos códigos que Postgres.
          throw new ImageDownloadError(cause instanceof Error ? cause.message : String(cause), {
            cause,
          })
        }),
        depth: 0,
        overrideAccess: true,
      })
      id = created.id
      result.media.created += 1
    } else {
      result.media.reused += 1
    }
    mediaIdByUrl.set(url, id)
    return id
  }

  async function toContentBlock(block: ContentBlock, oddities: string[]): Promise<StepBody | null> {
    switch (block.blockType) {
      case 'richText':
        return { blockType: 'richText', content: toLexical(block.html) }
      case 'callout':
        return { blockType: 'callout', variant: block.variant, content: toLexical(block.html) }
      case 'video':
        return { blockType: 'video', url: block.url }
      case 'image':
        try {
          return { blockType: 'image', image: await mediaFor(block.url, block.alt) }
        } catch (error) {
          if (!(error instanceof ImageDownloadError) && connectionFailed(error)) throw error
          // Una imagen caída no tumba la guía: queda anotada para revisarla.
          oddities.push(`Imagen sin importar: ${block.url} (${(error as Error).message})`)
          return null
        }
    }
  }

  async function toContentBlocks(blocks: ContentBlock[], oddities: string[]) {
    const converted: StepBody[] = []
    for (const block of blocks) {
      const content = await toContentBlock(block, oddities)
      if (content) converted.push(content)
    }
    return converted
  }

  // Un paso guarda sus bloques como el cuerpo; sin coordenadas, x e y van vacías.
  async function toBodyBlock(block: GuideBlock, oddities: string[]): Promise<BodyBlock | null> {
    if (block.blockType !== 'step') return toContentBlock(block, oddities)
    return {
      blockType: 'step',
      x: block.x ?? null,
      y: block.y ?? null,
      body: await toContentBlocks(block.body, oddities),
    }
  }

  for (const { guide, oddities: conversionOddities } of guides) {
    const oddities = [...conversionOddities]
    result.oddities[guide.slug] = oddities
    if (validateSlug(guide.slug) !== true) {
      result.guides.skipped += 1
      log(`Guía ${guide.slug}: saltada, el slug no es válido`)
      continue
    }

    // Una guía enlaza una sola misión. Con varias no se elige ninguna al azar: lo decide Torre.
    const dofusIds = [...new Set(guide.questDofusIds)]
    let linked: Quest | undefined
    if (dofusIds.length > 1) {
      oddities.push(
        `Varias misiones de DofusDB (${dofusIds.join(', ')}): sin enlazar, elige una en el panel`,
      )
    } else if (dofusIds.length === 1) {
      linked = questByDofusId.get(dofusIds[0]!)
      if (!linked) oddities.push(`Misión de DofusDB ${dofusIds[0]} sin importar en quests`)
    }

    const blocks: BodyBlock[] = []
    for (const block of guide.body) {
      const converted = await toBodyBlock(block, oddities)
      if (converted) blocks.push(converted)
    }
    // Las listas de monstruos de un combate pasan a un bloque Combate; lo que no casa se queda.
    const fights = splitFightLists(blocks as FightListBlock[], (name) =>
      monsterByName.get(comparableMonsterName(name)),
    )
    const body = fights.body as BodyBlock[]
    for (const name of fights.unmatched) oddities.push(`Monstruo sin casar en un combate: ${name}`)
    // El cuerpo ya está en Lexical: se suelta el DOM de la conversión antes de la siguiente.
    await releaseDom()

    // Por su URL original: Torre puede cambiarle la dirección. Si no, por el slug.
    const byUrl = await findGuide(payload, { originalUrl: { equals: guide.originalUrl } })
    const current = byUrl ?? (await findGuide(payload, { slug: { equals: guide.slug } }))
    if (current && !byUrl && current.originalUrl !== guide.originalUrl) {
      // Una guía hecha a mano (o de otra página) con esa dirección: es de Torre, no se toca.
      result.guides.skipped += 1
      oddities.push(`Ya hay otra guía en /${guide.slug}: no se toca`)
      log(`Guía ${guide.slug}: saltada, la dirección es de otra guía`)
      continue
    }
    const summary = filledSummary(guide.summary, linked)
    const imported = {
      title: guide.title,
      slug: guide.slug,
      originalUrl: guide.originalUrl,
      summary,
      quest: linked?.id ?? null,
      body,
    }

    if (!current) {
      await payload.create({
        collection: 'quest-guides',
        data: {
          ...imported,
          summary: { ...summary, needs: { ...summary.needs, dungeons: [] } },
          importSnapshot: snapshotOf(imported),
          _status: 'draft',
        },
        draft: true,
        depth: 0,
        overrideAccess: true,
      })
      result.guides.created += 1
      log(`Guía ${guide.slug}: creada, ${body.length} bloques`)
      continue
    }

    // Un campo cambia solo si sigue como lo dejó la última importación.
    const snapshot = (current.importSnapshot ?? {}) as Snapshot
    const nextSnapshot: Snapshot = { ...snapshot }
    const changes = new Map<TrackedField, unknown>()
    for (const field of TRACKED_FIELDS) {
      const stored = valueAt(current, field)
      const value = valueAt(imported, field)
      if (same(stored, value)) {
        nextSnapshot[field] = comparable(value) ?? null
        continue
      }
      const edited = field in snapshot ? !same(stored, snapshot[field]) : !isEmpty(stored)
      if (edited) {
        result.kept.push({ slug: guide.slug, field })
        continue
      }
      changes.set(field, value)
      nextSnapshot[field] = comparable(value) ?? null
    }

    // Las mazmorras que Torre eligió a mano son suyas y se quedan, salvo las de una nota que
    // ya no está en Notas: no elegirían nada y bloquearían la guía al guardarla.
    const notes = changes.has('summary.needs.notes')
      ? summary.needs.notes
      : (current.summary?.needs?.notes ?? null)
    const { live: dungeons, stale } = livePicks(current.summary?.needs?.dungeons ?? [], notes)
    for (const pick of stale) {
      oddities.push(`Mazmorra elegida a mano quitada: «${pick.note}» ya no está en Notas`)
    }
    for (const { field } of result.kept.filter((kept) => kept.slug === guide.slug)) {
      log(`Guía ${guide.slug}: ${field} se queda como lo dejó Torre`)
    }

    if (changes.size === 0 && stale.length === 0) {
      if (!isDeepStrictEqual(snapshot, nextSnapshot)) {
        // Sin cambios de contenido: solo se anota lo que ya coincide, con el estado que tenía.
        const published = current._status === 'published'
        await payload.update({
          collection: 'quest-guides',
          id: current.id,
          data: { importSnapshot: nextSnapshot, _status: published ? 'published' : 'draft' },
          draft: !published,
          depth: 0,
          overrideAccess: true,
        })
      }
      result.guides.unchanged += 1
      log(`Guía ${guide.slug}: sin cambios`)
      continue
    }

    const data: Record<string, unknown> = {}
    const summaryData: Record<string, unknown> = {}
    const needsData: Record<string, unknown> = { dungeons }
    for (const [field, value] of changes) {
      const [head, sub, leaf] = field.split('.')
      if (head !== 'summary') data[head!] = value
      else if (sub !== 'needs') summaryData[sub!] = value
      else needsData[leaf!] = value
    }
    await payload.update({
      collection: 'quest-guides',
      id: current.id,
      data: {
        ...data,
        summary: { ...summaryData, needs: needsData },
        importSnapshot: nextSnapshot,
        _status: 'draft',
      } as never,
      draft: true,
      depth: 0,
      overrideAccess: true,
    })
    result.guides.updated += 1
    log(`Guía ${guide.slug}: actualizada (${[...changes.keys()].join(', ') || 'mazmorras'})`)
  }

  return result
}

async function findGuide(payload: Payload, where: Where): Promise<QuestGuide | undefined> {
  const found = await payload.find({
    collection: 'quest-guides',
    where,
    limit: 1,
    depth: 0,
    draft: true,
    overrideAccess: true,
  })
  return found.docs[0]
}
