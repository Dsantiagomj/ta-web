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

import type { Checklist, Monster, Quest } from '@/payload-types'

import type { LexicalState } from '../rich-text'
import type { ChecklistCatalogEntry } from './catalog'
import type {
  ArtRef,
  ChecklistDraft,
  NeedDraft,
  NeedOption,
  StepDraft,
  StopDraft,
} from './to-checklist'

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
  'misión' | 'logro' | 'PNJ' | 'jefe' | 'imagen' | 'guía de Dofus' | 'objetivo' | 'parada' | 'paso'

export interface LoadChecklistsReport {
  created: number
  updated: number
  unchanged: number
  /** Campos que Torre cambió en el panel y la importación respetó. */
  kept: { slug: string; field: string }[]
  /** Lo que no se pudo casar y se queda fuera, por paso (null: la checklist). */
  unmatched: { slug: string; step: number | null; kind: UnmatchedKind; name: string }[]
  /**
   * Las checklists de almas: cuántas almas pide su misión, los monstruos que no están en la base,
   * los que están sin los datos del juego que pinta la página (hay que refrescarlos) y los
   * objetivos de llevar algo que no es un alma.
   */
  souls: {
    slug: string
    souls: number
    missingMonsters: number[]
    withoutGameData: number[]
    notSouls: number
  }[]
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
  'completedBy',
  'legacy',
] as const
/** Una checklist sin portar solo lleva su ficha: sus pasos y prerrequisitos son de Torre. */
const ENTRY_FIELDS = ['name', 'description', 'order', 'dofusGuide', 'legacyHref'] as const
/** Una checklist de almas: su ficha, su tipo, su misión y lo que necesita la migración. */
const SOULS_FIELDS = [...ENTRY_FIELDS, 'kind', 'soulsQuest', 'legacy'] as const

type ImportedField = (typeof FULL_FIELDS)[number] | (typeof SOULS_FIELDS)[number]

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

type ZonedStep = { stepId?: string | null; zone?: string | null }

/**
 * Los pasos sin su zona: la zona va aparte de importSnapshot.steps, paso a paso, para que
 * llegue aunque Torre haya editado otros campos de los pasos (mergeZones).
 */
const withoutZones = (steps: unknown) =>
  Array.isArray(steps)
    ? steps.map((step: ZonedStep & Record<string, unknown>) => {
        const { zone: _zone, ...rest } = step
        return rest
      })
    : steps

/** La zona importada de cada paso, por su stepId: lo que guarda importSnapshot.zones. */
const zonesByStep = (steps: ZonedStep[]): Record<string, string | null> =>
  Object.fromEntries(
    steps.flatMap((step) => (step.stepId ? [[step.stepId, step.zone ?? null]] : [])),
  )

/**
 * Los pasos con la zona de cada uno: la importada si el paso no tiene o si sigue siendo la
 * que dejó la última importación; si no, la de Torre. Un paso que no viene en la importación
 * (lo añadió Torre) se queda como está.
 */
function mergeZones<T extends ZonedStep>(
  steps: T[],
  stored: Record<string, string | null>,
  imported: Record<string, string | null>,
  last: Record<string, string | null>,
): T[] {
  return steps.map((step) => {
    if (!step.stepId || !(step.stepId in imported)) return step
    const current = stored[step.stepId] ?? null
    const zone =
      !current || current === (last[step.stepId] ?? null) ? imported[step.stepId] : current
    return { ...step, zone }
  })
}

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
      step.segments.flatMap((segment) =>
        segment.kind === 'stop'
          ? [segment, ...(segment.more ?? [])].flatMap((point) =>
              point.quest === null ? [] : [point.quest],
            )
          : [],
      ),
    ),
    ...all.flatMap((step) => step.quests.map((row) => row.quest)),
    // Las misiones de cada fila de «Necesitarás», también las de los prerrequisitos: pueden
    // no estar en ningún paso.
    ...[...all.flatMap((step) => step.needs), ...draft.prerequisites.needs].flatMap(
      (need) => need.quests,
    ),
    ...all.flatMap((step) => step.quests.flatMap((row) => row.alternatives ?? [])),
    ...draft.completedBy.flatMap((row) => [row.quest, ...row.by]),
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
  /** El stepId de un paso antiguo; uno que no está en la checklist se dice y queda fuera. */
  const stepRef = (from: number, n: number | null) => {
    if (n === null) return null
    const id = stepIds.get(n) ?? null
    if (id === null) unmatched(from, 'paso', `paso ${n}`)
    return id
  }
  const stepRefs = (from: number, ns: number[]) =>
    ns.flatMap((n) => {
      const id = stepRef(from, n)
      return id === null ? [] : [id]
    })

  const questId = (n: number | null, dofusId: number) => {
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
  const item = async (n: number, need: NeedOption) => {
    const id = need.item.startsWith('x:')
      ? await options.findItem(need.name)
      : await options.ensureItem(Number(need.item))
    if (id === null) labelled(n, need.name)
    else if (id < 0) pending.items.add(need.item)
    else items.add(id)
    return id
  }
  /** Un objeto del juego o, si no lo es, su texto: la fila nunca se pierde. */
  const option = async (n: number, need: NeedOption) => {
    const id = await item(n, need)
    return { ...(id === null ? { label: need.name } : { item: id }), quantity: need.quantity }
  }
  const resolveNeed = async (n: number, need: NeedDraft) => {
    const alternatives = []
    for (const alt of need.alternatives ?? []) alternatives.push(await option(n, alt))
    return {
      ...(await option(n, need)),
      ...(alternatives.length > 0 && { alternatives }),
      note: need.note,
      category: need.category,
      ...(need.group && { group: need.group }),
      countsInTotal: need.countsInTotal,
      ...(need.reusable && { reusable: true }),
      quests: need.quests.flatMap((dofusId) => {
        const found = questId(n, dofusId)
        return found === null ? [] : [found]
      }),
    }
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
    const point = (stop: StopDraft) => {
      const found = stop.quest === null ? undefined : quests.get(stop.quest)
      // La parada tiene que caer en un objetivo que la misión guardada tiene.
      if (found && stop.stopObjective !== null && stop.stopObjective >= objectiveCount(found)) {
        unmatched(n, 'objetivo', `${stop.quest}: ${stop.stopObjective}`)
      }
      return {
        quest: stop.quest === null ? null : questId(n, stop.quest),
        stopObjective: stop.stopObjective,
        ...(stop.later && { later: true }),
        ...(stop.line && { line: stop.line }),
        ...(stop.resumeLine && { resumeLine: stop.resumeLine }),
      }
    }
    const segments = step.segments.map((segment) => {
      if (segment.kind === 'resolve') {
        return { kind: 'resolve', text: segment.text, closes: stepRefs(n, segment.closes) }
      }
      if (segment.kind !== 'stop') return { kind: segment.kind, text: segment.text }
      // Un rojo que no se sabe dónde para queda como aviso: se dice, para que Torre lo mire.
      if (segment.quest === null) unmatched(n, 'parada', segment.text)
      const more = (segment.more ?? []).map(point)
      return {
        kind: 'stop',
        text: segment.text,
        ...point(segment),
        ...(more.length > 0 && { more }),
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
      // Una fila genérica: las demás misiones que también valen.
      const alternatives = (row.alternatives ?? []).flatMap((id) => {
        const found = questId(n, id)
        return found === null ? [] : [found]
      })
      return [
        {
          quest,
          kind: row.kind,
          note: row.note,
          optionalDoneBy: stepRef(n, row.optionalDoneBy),
          ...(row.label && { label: row.label, alternatives }),
        },
      ]
    })
    // Todas las filas, en su orden: la que no es un objeto del juego va con su texto.
    const needs = []
    for (const need of step.needs) needs.push(await resolveNeed(n, need))
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
      closes: stepRefs(n, step.closes),
      updates: stepRefs(n, step.updates),
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
  for (const { step, name } of draft.generic ?? []) {
    unmatched(step, 'misión', `${name} (una de varias según la persona: falta modelarla)`)
  }
  // Los objetos de los prerrequisitos, como los de un paso (el 0 en el informe).
  const prerequisiteNeeds = []
  for (const need of draft.prerequisites.needs) {
    prerequisiteNeeds.push({ ...(await resolveNeed(0, need)), prerequisite: need.prerequisite })
  }
  // Las misiones que se terminan solas: una que falta se dice y la fila se queda fuera.
  const completedBy = draft.completedBy.flatMap((row) => {
    const quest = questId(null, row.quest)
    const by = row.by.flatMap((id) => {
      const found = questId(null, id)
      return found === null ? [] : [found]
    })
    return quest !== null && by.length === row.by.length ? [{ quest, by }] : []
  })
  return {
    steps: resolved,
    prerequisites: { ...draft.prerequisites, needs: prerequisiteNeeds },
    completedBy,
  }
}

/**
 * La checklist guardada, entera. En seco contra una base a la que aún le falta la migración de
 * la colección (dev antes de desplegar), leerla entera falla: entonces se lee solo su ficha y
 * sus pasos, que es todo lo que tiene una ficha sin portar. Al escribir nunca: sin la
 * migración, escribir fallaría igual.
 */
async function readCurrent(
  payload: Payload,
  id: number,
  apply: boolean,
  log: (message: string) => void,
): Promise<Checklist> {
  const full = () =>
    payload.findByID({ collection: 'checklists', id, depth: 0, draft: true, overrideAccess: true })
  if (apply) return (await full()) as Checklist
  try {
    return (await full()) as Checklist
  } catch (error) {
    const doc = (await payload.findByID({
      collection: 'checklists',
      id,
      depth: 0,
      draft: true,
      overrideAccess: true,
      // Sin los prerrequisitos, las misiones que se terminan solas, lo antiguo ni los tramos,
      // misiones y objetos de los pasos: lo que añaden las migraciones. Pedir solo unos campos no basta (Payload une igual las de los grupos).
      select: {
        prerequisites: false,
        completedBy: false,
        legacy: false,
        kind: false,
        soulsQuest: false,
        steps: { segments: false, needs: false, quests: false },
      },
    })) as Checklist
    if ((doc.steps ?? []).length > 0) throw error
    log(
      `${doc.slug}: la base aún no tiene la última migración de checklists; se compara solo su ficha (no tiene pasos).`,
    )
    return doc
  }
}

/** Una ficha sin portar: ni pasos ni almas, solo el enlace a Squarespace. */
const isFicha = (checklist: Checklist) =>
  !(checklist.steps ?? []).length && checklist.kind !== 'souls'

/**
 * Postgres no encuentra una columna (42703) o una tabla (42P01, la de un campo de varios valores
 * como `levels`): la base aún no tiene la migración.
 */
const MISSING_SCHEMA = new Set(['42703', '42P01'])
function isMissingSchema(error: unknown): boolean {
  for (let cause = error; cause instanceof Error; cause = cause.cause) {
    const { code } = cause as { code?: unknown }
    if (typeof code === 'string' && MISSING_SCHEMA.has(code)) return true
  }
  return false
}

/**
 * La misión de una checklist de almas y lo que se puede decir de sus almas: los objetivos de
 * llevar un alma (con su monstruo), los monstruos que faltan y los que están sin los datos del
 * juego que pinta la página. Ningún monstruo se adivina: solo los que nombra el objetivo.
 */
async function resolveSouls(
  payload: Payload,
  entry: ChecklistCatalogEntry,
  unmatched: (step: number | null, kind: UnmatchedKind, name: string) => void,
  report: LoadChecklistsReport,
  apply: boolean,
): Promise<number | null> {
  const { docs } = await payload.find({
    collection: 'quests',
    where: { dofusId: { equals: entry.soulsQuest } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
    select: { stages: true },
  })
  const quest = docs[0] as Pick<Quest, 'id' | 'stages'> | undefined
  if (!quest) {
    unmatched(null, 'misión', String(entry.soulsQuest))
    return null
  }
  const brings = (quest.stages ?? [])
    .flatMap((stage) => stage.objectives ?? [])
    .filter((objective) => objective.kind === 'bring')
  // Un monstruo que se pide más de una vez es una sola alma (soulsView).
  const monsterIds = [
    ...new Set(
      brings.flatMap((objective) => (objective.monsterId == null ? [] : [objective.monsterId])),
    ),
  ]
  const find = (select: Record<string, true>) =>
    payload.find({
      collection: 'monsters',
      where: { dofusId: { in: monsterIds } },
      pagination: false,
      depth: 0,
      overrideAccess: true,
      select,
    })
  // En seco contra una base sin la migración de los monstruos (dev antes de desplegar), sus
  // datos del juego aún no existen: se buscan solo por su ID y se dan por faltar. Escribiendo,
  // o con cualquier otro error, falla.
  const monsters = monsterIds.length
    ? await find({ dofusId: true, levels: true, subAreaId: true })
        .catch((error: unknown) => {
          if (apply || !isMissingSchema(error)) throw error
          return find({ dofusId: true })
        })
        .then((result) => result.docs as Pick<Monster, 'dofusId' | 'levels' | 'subAreaId'>[])
    : []
  const found = new Map(monsters.map((monster) => [monster.dofusId, monster]))
  report.souls.push({
    slug: entry.slug,
    souls: monsterIds.length,
    missingMonsters: monsterIds.filter((id) => !found.has(id)),
    withoutGameData: monsterIds.filter((id) => {
      const monster = found.get(id)
      return monster !== undefined && (!monster.levels?.length || monster.subAreaId == null)
    }),
    notSouls: brings.filter((objective) => objective.monsterId == null).length,
  })
  return quest.id
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
    souls: [],
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

    // Primero solo la ficha: el documento entero se lee si existe. La consulta corta no toca
    // las tablas de los prerrequisitos ni de los pasos, así que la pasada en seco funciona
    // contra una base a la que aún le falta la última migración de la colección.
    const found = await payload.find({
      collection: 'checklists',
      where: { slug: { equals: entry.slug } },
      limit: 1,
      depth: 0,
      draft: true,
      overrideAccess: true,
      select: {
        prerequisites: false,
        steps: false,
        completedBy: false,
        legacy: false,
        kind: false,
        soulsQuest: false,
      },
    })
    const current = found.docs[0]
      ? await readCurrent(payload, found.docs[0].id, options.apply, log)
      : undefined

    const data: Imported = {
      name: head.name,
      description: head.description,
      order: head.order,
      dofusGuide,
      legacyHref: head.legacyHref,
      ...(draft &&
        (await resolveSteps(payload, draft, current, {
          options,
          unmatched,
          labelled,
          pending,
          items,
        }))),
      ...(draft && { legacy: draft.legacy }),
      ...(entry.kind === 'souls' && {
        kind: 'souls',
        soulsQuest: await resolveSouls(payload, entry, unmatched, report, options.apply),
        // El progreso del Ocre antiguo: la lista de almas de «cosecha:done».
        legacy: { prefix: 'cosecha:' },
      }),
    }
    const fields = draft ? FULL_FIELDS : entry.kind === 'souls' ? SOULS_FIELDS : ENTRY_FIELDS
    // La zona de los pasos se compara aparte (mergeZones): los pasos se comparan sin ella.
    const valueOf = (values: Partial<Record<ImportedField, unknown>>, field: ImportedField) =>
      field === 'steps' ? withoutZones(values.steps) : values[field]
    const importedZones = draft ? zonesByStep(data.steps as ZonedStep[]) : null
    const snapshotOf = (
      values: Imported,
    ): Imported & { zones?: Record<string, string | null> } => ({
      ...Object.fromEntries(
        fields.map((field) => [field, comparable(valueOf(values, field)) ?? null]),
      ),
      ...(importedZones && { zones: importedZones }),
    })

    if (!current) {
      if (options.apply) {
        // Una checklist portada queda en borrador hasta que tenga página; las fichas sin
        // portar se publican: solo enlazan a Squarespace.
        const status = entry.ported ? 'draft' : 'published'
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
    const snapshot = (current.importSnapshot ?? {}) as Imported & {
      zones?: Record<string, string | null>
    }
    const changes: Imported = {}
    const nextSnapshot: Imported & { zones?: Record<string, string | null> } = { ...snapshot }
    for (const field of fields) {
      const stored = valueOf(current as Partial<Record<ImportedField, unknown>>, field)
      const imported = valueOf(data, field)
      if (same(stored, imported)) {
        nextSnapshot[field] = comparable(imported) ?? null
        continue
      }
      if (field in snapshot && !same(stored, snapshot[field])) {
        report.kept.push({ slug: entry.slug, field })
        continue
      }
      changes[field] = data[field]
      nextSnapshot[field] = comparable(imported) ?? null
    }
    // La zona de cada paso, aunque Torre haya editado otros campos de los pasos: si solo
    // cambia la zona, se reescriben los pasos guardados con ella.
    if (importedZones) {
      const storedSteps = (current.steps ?? []) as ZonedStep[]
      const storedZones = zonesByStep(storedSteps)
      const merged = mergeZones(
        (changes.steps ?? storedSteps) as ZonedStep[],
        storedZones,
        importedZones,
        snapshot.zones ?? {},
      )
      if (changes.steps || !same(zonesByStep(merged), storedZones)) changes.steps = merged
      nextSnapshot.zones = importedZones
    }
    const snapshotChanged = !same(snapshot.zones ?? null, nextSnapshot.zones ?? null)
    if (Object.keys(changes).length === 0 && !snapshotChanged) {
      report.unchanged += 1
      continue
    }
    if (options.apply) {
      // Si Torre tiene un borrador a medias, el cambio va a su borrador y no se publica. La
      // primera vez que se porta una ficha, lo portado (pasos o almas) también va a un
      // borrador: lo publicado sigue siendo la ficha hasta que Torre la revise.
      const porting = entry.ported && isFicha(current)
      const status = current._status === 'draft' || porting ? 'draft' : 'published'
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
      `${entry.slug}: ${options.apply ? 'actualizada' : 'se actualizaría'} (${Object.keys(changes).join(', ') || 'importSnapshot'})`,
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
