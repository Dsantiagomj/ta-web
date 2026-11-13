// Lleva a la colección checklists los borradores de to-checklist.ts y las fichas de las
// checklists sin portar. Resuelve cada referencia contra la base (misiones, logros, objetos,
// PNJ, jefes, guía del Dofus y arte) y avisa de lo que no encuentra. Crea lo que falta y, al
// repetir, cambia solo los campos que Torre no ha tocado desde la última importación: lo que
// escribió cada vez se guarda en importSnapshot, como en las guías de Dofus.
//
// Cada paso conserva su stepId (la clave del progreso): el del paso guardado con su mismo
// número antiguo o, la primera vez, uno nuevo. Con ellos se escriben los pasos que cierra un
// «aquí se resuelve» y el que termina una misión opcional.
import { randomUUID } from 'node:crypto'

import type { Payload } from 'payload'

import type { Checklist } from '@/payload-types'

import type { LexicalState } from '../rich-text'
import type { ChecklistCatalogEntry } from './catalog'
import type { ArtRef, ChecklistDraft, StepDraft } from './to-checklist'

export interface ChecklistInput {
  entry: ChecklistCatalogEntry
  /** El borrador entero, o null para una checklist sin portar: solo su ficha. */
  draft: ChecklistDraft | null
}

export interface LoadChecklistsOptions {
  checklists: ChecklistInput[]
  /** Sin él solo cuenta y avisa de lo que haría. */
  apply: boolean
  htmlToLexical: (html: string) => LexicalState
  /** El objeto de DofusDB, importándolo con su icono si falta; negativo si lo importaría; null si no existe. */
  ensureItem: (dofusId: number) => Promise<number | null>
  /** El objeto que se llama así (los que DofusDB no tiene con ID en la checklist antigua). */
  findItem: (name: string) => Promise<number | null>
  /** El PNJ de DofusDB, importándolo con sus renders si falta; negativo si lo importaría. */
  ensureNpc: (dofusId: number) => Promise<number | null>
  /** El archivo de Media de una imagen de la checklist antigua; negativo si la subiría. */
  artFor: (art: ArtRef) => Promise<number | null>
  newId?: () => string
  log?: (message: string) => void
}

export type UnmatchedKind =
  'misión' | 'logro' | 'PNJ' | 'jefe' | 'imagen' | 'guía de Dofus' | 'objetivo'

export interface LoadChecklistsReport {
  created: number
  updated: number
  unchanged: number
  /** Campos que Torre cambió en el panel y la importación respetó. */
  kept: { slug: string; field: string }[]
  /** Lo que no se pudo casar y se queda fuera, por paso (null: la checklist). */
  unmatched: { slug: string; step: number | null; kind: UnmatchedKind; name: string }[]
  /** Filas de «Necesitarás» sin objeto del juego: se guardan con su texto, nunca se pierden. */
  labels: { slug: string; step: number; name: string }[]
  /**
   * Lo que se traería de DofusDB o se subiría a Media (solo en seco): objetos y PNJ que
   * faltan, iconos de objetos que ya estaban sin él e imágenes de la checklist antigua.
   */
  pending: { items: number; npcs: number; icons: number; art: number }
}

/** Los campos que escribe la importación; el estado (y el resto) es de Torre. */
const FULL_FIELDS = [
  'name',
  'description',
  'order',
  'dofusGuide',
  'legacyHref',
  'prerequisites',
  'steps',
  'legacy',
] as const
/** Una checklist sin portar solo lleva su ficha: sus pasos y prerrequisitos son de Torre. */
const ENTRY_FIELDS = ['name', 'description', 'order', 'dofusGuide', 'legacyHref'] as const

type ImportedField = (typeof FULL_FIELDS)[number]
type Imported = Partial<Record<ImportedField, unknown>>

/**
 * El valor sin IDs de fila ni campos vacíos y con las claves en orden, para comparar lo
 * guardado con lo importado: Postgres guarda el texto enriquecido como jsonb, que reordena las
 * claves, y devuelve [] o un grupo de nulls donde la importación no puso nada.
 */
export function comparable(value: unknown): unknown {
  if (Array.isArray(value)) {
    const items = value.map(comparable)
    return items.length ? items : undefined
  }
  if (value && typeof value === 'object') {
    const entries = Object.entries(value)
      .filter(([key]) => key !== 'id')
      .map(([key, item]) => [key, comparable(item)] as const)
      .filter(([, item]) => item !== null && item !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    return entries.length ? Object.fromEntries(entries) : undefined
  }
  return value
}

const same = (a: unknown, b: unknown) =>
  JSON.stringify(comparable(a) ?? null) === JSON.stringify(comparable(b) ?? null)

const escapeHtml = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

type GameDoc = {
  id: number
  dofusId?: number | null
  stages?: { objectives?: unknown[] | null }[] | null
}

/** Las filas de esa colección con esos IDs de DofusDB, por ID de DofusDB. */
async function byDofusId(
  payload: Payload,
  collection: 'quests' | 'achievements' | 'monsters',
  dofusIds: number[],
): Promise<Map<number, GameDoc>> {
  if (dofusIds.length === 0) return new Map()
  const { docs } = await payload.find({
    collection,
    where: { dofusId: { in: [...new Set(dofusIds)] } },
    pagination: false,
    depth: 0,
    overrideAccess: true,
    select: collection === 'quests' ? { dofusId: true, stages: true } : { dofusId: true },
  })
  return new Map((docs as GameDoc[]).map((doc) => [doc.dofusId!, doc]))
}

const objectiveCount = (quest: GameDoc) =>
  (quest.stages ?? []).reduce((total, stage) => total + (stage.objectives?.length ?? 0), 0)

/** Lo que comparten los pasos de una checklist al resolverse. */
interface StepContext {
  options: LoadChecklistsOptions
  unmatched: (step: number | null, kind: UnmatchedKind, name: string) => void
  /** Una fila que se guarda como texto porque no casa con ningún objeto del juego. */
  labelled: (step: number, name: string) => void
  /** Lo que se traería o subiría en seco, por tipo. */
  pending: { items: Set<string>; npcs: Set<number>; art: Set<string> }
  /** Los objetos de la base que nombra la checklist (sus iconos se cuentan al final). */
  items: Set<number>
}

/** Los pasos del borrador con sus referencias resueltas y sus stepId. */
async function resolveSteps(
  payload: Payload,
  draft: ChecklistDraft,
  current: Checklist | undefined,
  context: StepContext,
) {
  const { options, unmatched, labelled, pending, items } = context
  const newId = options.newId ?? randomUUID
  const all = draft.steps
  const quests = await byDofusId(payload, 'quests', [
    ...all.flatMap((step) =>
      step.segments.flatMap((segment) => (segment.kind === 'stop' ? [segment.quest] : [])),
    ),
    ...all.flatMap((step) => step.quests.map((row) => row.quest)),
  ])
  const achievements = await byDofusId(
    payload,
    'achievements',
    all.flatMap((step) => step.achievements.map((row) => row.achievement)),
  )
  const bosses = await byDofusId(
    payload,
    'monsters',
    all.flatMap((step) => step.bosses),
  )

  // El stepId de cada número antiguo: el del paso guardado o uno nuevo.
  const stored = new Map(
    (current?.steps ?? []).flatMap((step) =>
      step.legacyNumber != null && step.stepId ? [[step.legacyNumber, step.stepId] as const] : [],
    ),
  )
  const stepIds = new Map(
    all.map((step) => [step.legacyNumber, stored.get(step.legacyNumber) ?? newId()]),
  )
  const label = (kind: keyof NonNullable<ChecklistDraft['names']>, dofusId: number) => {
    const name = draft.names?.[kind]?.[dofusId]
    return name ? `${name} (${dofusId})` : String(dofusId)
  }
  const stepRef = (n: number | null) => (n === null ? null : (stepIds.get(n) ?? null))

  const questId = (n: number, dofusId: number) => {
    const found = quests.get(dofusId)
    if (!found) unmatched(n, 'misión', label('quests', dofusId))
    return found?.id ?? null
  }
  const art = async (n: number, ref: ArtRef | null) => {
    if (!ref) return null
    const id = await options.artFor(ref)
    if (id === null) unmatched(n, 'imagen', ref.path)
    else if (id < 0) pending.art.add(ref.path)
    return id
  }
  const item = async (n: number, need: StepDraft['needs'][number]) => {
    const id = need.item.startsWith('x:')
      ? await options.findItem(need.name)
      : await options.ensureItem(Number(need.item))
    if (id === null) labelled(n, need.name)
    else if (id < 0) pending.items.add(need.item)
    else items.add(id)
    return id
  }
  const npc = async (n: number, dofusId: number | null) => {
    if (dofusId === null) return null
    const id = await options.ensureNpc(dofusId)
    if (id === null) unmatched(n, 'PNJ', label('npcs', dofusId))
    else if (id < 0) pending.npcs.add(dofusId)
    return id
  }

  const resolveStep = async (step: StepDraft) => {
    const n = step.legacyNumber
    const segments = step.segments.map((segment) => {
      if (segment.kind === 'plain') return { kind: 'plain', text: segment.text }
      if (segment.kind === 'resolve') {
        return { kind: 'resolve', text: segment.text, closes: segment.closes.map(stepRef) }
      }
      const found = quests.get(segment.quest)
      // La parada tiene que caer en un objetivo que la misión guardada tiene.
      if (found && segment.stopObjective >= objectiveCount(found)) {
        unmatched(n, 'objetivo', `${segment.quest}: ${segment.stopObjective}`)
      }
      return {
        kind: 'stop',
        text: segment.text,
        quest: questId(n, segment.quest),
        stopObjective: segment.stopObjective,
      }
    })
    const achievementRows = step.achievements.flatMap((row) => {
      const found = achievements.get(row.achievement)
      if (!found) unmatched(n, 'logro', label('achievements', row.achievement))
      return found ? [{ achievement: found.id, mode: row.mode, on: row.on }] : []
    })
    const questRows = step.quests.flatMap((row) => {
      const quest = questId(n, row.quest)
      if (quest === null) return []
      return [
        { quest, kind: row.kind, note: row.note, optionalDoneBy: stepRef(row.optionalDoneBy) },
      ]
    })
    // Todas las filas, en su orden: la que no es un objeto del juego va con su texto.
    const needs = []
    for (const need of step.needs) {
      const id = await item(n, need)
      needs.push({
        ...(id === null ? { label: need.name } : { item: id }),
        quantity: need.quantity,
        note: need.note,
        category: need.category,
        countsInTotal: need.countsInTotal,
        quests: need.quests.flatMap((dofusId) => {
          const found = quests.get(dofusId)
          return found ? [found.id] : []
        }),
      })
    }
    // Un grupo no admite null: sin figura, vacío.
    const figure = step.figure
      ? {
          npc: await npc(n, step.figure.npc),
          image: await art(n, step.figure.art),
          role: step.figure.role,
        }
      : {}
    return {
      stepId: stepIds.get(n),
      legacyNumber: n,
      segments,
      note: step.note ? options.htmlToLexical(`<p>${escapeHtml(step.note)}</p>`) : null,
      achievements: achievementRows,
      quests: questRows,
      needs,
      figure,
      bosses: step.bosses.flatMap((dofusId) => {
        const found = bosses.get(dofusId)
        if (!found) unmatched(n, 'jefe', label('monsters', dofusId))
        return found ? [found.id] : []
      }),
      icon: await art(n, step.icon),
      banner: await art(n, step.banner),
      zone: step.zone,
    }
  }

  const resolved = []
  for (const step of all) resolved.push(await resolveStep(step))
  return resolved
}

export async function loadChecklists(
  payload: Payload,
  options: LoadChecklistsOptions,
): Promise<LoadChecklistsReport> {
  const log = options.log ?? (() => {})
  const report: LoadChecklistsReport = {
    created: 0,
    updated: 0,
    unchanged: 0,
    kept: [],
    unmatched: [],
    labels: [],
    pending: { items: 0, npcs: 0, icons: 0, art: 0 },
  }
  const pending = { items: new Set<string>(), npcs: new Set<number>(), art: new Set<string>() }
  const items = new Set<number>()

  for (const { entry, draft } of options.checklists) {
    // Una misma referencia que falta se avisa una vez por paso.
    const seen = new Set<string>()
    const unmatched = (step: number | null, kind: UnmatchedKind, name: string) => {
      const key = `${step}|${kind}|${name}`
      if (seen.has(key)) return
      seen.add(key)
      report.unmatched.push({ slug: entry.slug, step, kind, name })
    }
    const labelled = (step: number, name: string) =>
      report.labels.push({ slug: entry.slug, step, name })

    // La ficha sale del borrador si lo hay (lo deriva del catálogo) y si no, del catálogo.
    const head = draft ?? entry
    const guides = await payload.find({
      collection: 'dofus-guides',
      where: { slug: { equals: head.dofusGuide } },
      limit: 1,
      depth: 0,
      draft: true,
      overrideAccess: true,
      select: { slug: true },
    })
    const dofusGuide = guides.docs[0]?.id ?? null
    if (dofusGuide === null) unmatched(null, 'guía de Dofus', head.dofusGuide)

    // Primero solo el ID: el documento entero se lee si existe. La consulta corta tampoco
    // toca las columnas de los pasos, así que la pasada en seco funciona contra una base a
    // la que aún le falta la última migración de la colección.
    const found = await payload.find({
      collection: 'checklists',
      where: { slug: { equals: entry.slug } },
      limit: 1,
      depth: 0,
      draft: true,
      overrideAccess: true,
      select: { slug: true },
    })
    const current = found.docs[0]
      ? ((await payload.findByID({
          collection: 'checklists',
          id: found.docs[0].id,
          depth: 0,
          draft: true,
          overrideAccess: true,
        })) as Checklist)
      : undefined

    const data: Imported = {
      name: head.name,
      description: head.description,
      order: head.order,
      dofusGuide,
      legacyHref: head.legacyHref,
      ...(draft && {
        prerequisites: draft.prerequisites,
        steps: await resolveSteps(payload, draft, current, {
          options,
          unmatched,
          labelled,
          pending,
          items,
        }),
        legacy: draft.legacy,
      }),
    }
    const fields = draft ? FULL_FIELDS : ENTRY_FIELDS
    const snapshotOf = (values: Imported): Imported =>
      Object.fromEntries(fields.map((field) => [field, comparable(values[field]) ?? null]))

    if (!current) {
      if (options.apply) {
        // Una checklist portada queda en borrador hasta que tenga página; las fichas sin
        // portar se publican: solo enlazan a Squarespace.
        const status = draft ? 'draft' : 'published'
        await payload.create({
          collection: 'checklists',
          data: {
            ...data,
            slug: entry.slug,
            state: 'preparing',
            importSnapshot: snapshotOf(data),
            _status: status,
          } as never,
          draft: status === 'draft',
          depth: 0,
          overrideAccess: true,
        })
      }
      report.created += 1
      log(`${entry.slug}: ${options.apply ? 'creada' : 'se crearía'}`)
      continue
    }

    // Un campo cambia solo si sigue como lo dejó la última importación.
    const snapshot = (current.importSnapshot ?? {}) as Imported
    const changes: Imported = {}
    const nextSnapshot: Imported = { ...snapshot }
    for (const field of fields) {
      const stored = current[field as keyof Checklist]
      if (same(stored, data[field])) {
        nextSnapshot[field] = comparable(data[field]) ?? null
        continue
      }
      if (field in snapshot && !same(stored, snapshot[field])) {
        report.kept.push({ slug: entry.slug, field })
        continue
      }
      changes[field] = data[field]
      nextSnapshot[field] = comparable(data[field]) ?? null
    }
    if (Object.keys(changes).length === 0) {
      report.unchanged += 1
      continue
    }
    if (options.apply) {
      // Si Torre tiene un borrador a medias, el cambio va a su borrador y no se publica.
      const status = current._status === 'draft' ? 'draft' : 'published'
      await payload.update({
        collection: 'checklists',
        id: current.id,
        data: { ...changes, importSnapshot: nextSnapshot, _status: status } as never,
        draft: status === 'draft',
        depth: 0,
        overrideAccess: true,
      })
    }
    report.updated += 1
    log(
      `${entry.slug}: ${options.apply ? 'actualizada' : 'se actualizaría'} (${Object.keys(changes).join(', ')})`,
    )
  }

  // Los objetos que ya estaban sin icono: ensureItem se lo trae al escribir.
  const icons = items.size
    ? await payload.count({
        collection: 'items',
        where: {
          id: { in: [...items] },
          image: { exists: false },
          iconId: { exists: true },
        },
        overrideAccess: true,
      })
    : { totalDocs: 0 }
  report.pending = {
    items: pending.items.size,
    npcs: pending.npcs.size,
    icons: icons.totalDocs,
    art: pending.art.size,
  }
  return report
}
