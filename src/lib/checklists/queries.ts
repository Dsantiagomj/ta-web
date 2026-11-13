import type { Payload, Where } from 'payload'

import { isGuideSlug } from '@/lib/guides/slug'
import type { Checklist, User } from '@/payload-types'

import { torreLevel } from '@/lib/derive/weights'
import { SITE_LOCALE } from '@/lib/site/locale'

import { checklistDetails, type ChecklistDetails, type DetailsQuest } from './details'
import type { ChecklistDoc } from './list'
import { relationId } from './relations'
import {
  OBJECTIVE_REFERENCE,
  type ChecklistData,
  type ChecklistName,
  type ObjectiveNames,
  type QuestNode,
} from './page'

export interface ReadChecklistOptions {
  /** Con un usuario del panel: el último borrador. */
  preview?: { user: User }
}

type Access = { draft: boolean; overrideAccess: false; user?: User }

// Lo enlazado siempre como lo ve un visitante: una guía o un logro sin publicar no sale.
const visitor = { draft: false, overrideAccess: false } as const

const access = (preview: ReadChecklistOptions['preview']): Access =>
  preview
    ? { draft: true, user: preview.user, overrideAccess: false }
    : { draft: false, overrideAccess: false }

const ids = (values: unknown[]) => [
  ...new Set(
    values.flatMap((value) => {
      const id = relationId(value)
      return id === null ? [] : [id]
    }),
  ),
]

const NAME_COLLECTIONS = { npc: 'npcs', item: 'items', monster: 'monsters' } as const

type ObjectiveOf<Q extends Pick<DetailsQuest, 'stages'>> = NonNullable<
  NonNullable<Q['stages']>[number]['objectives']
>[number]

/** Los objetivos de unas misiones, aplanados en el orden de sus etapas. */
const objectivesOf = <Q extends Pick<DetailsQuest, 'stages'>>(quests: Q[]): ObjectiveOf<Q>[] =>
  quests.flatMap((quest) =>
    (quest.stages ?? []).flatMap((stage) => (stage.objectives ?? []) as ObjectiveOf<Q>[]),
  )

/**
 * Los nombres de lo que los objetivos de unas misiones nombran por ID ({npc,2351}): los PNJ
 * que dan alguna de esas misiones y, lo que falte, de los PNJ, objetos y monstruos guardados.
 */
async function readObjectiveNames(
  payload: Payload,
  quests: Pick<DetailsQuest, 'startPositions' | 'stages'>[],
): Promise<ObjectiveNames> {
  const names: ObjectiveNames = { npc: {}, item: {}, monster: {} }
  for (const quest of quests) {
    for (const start of quest.startPositions ?? []) {
      if (start.npcId != null && start.npcName) names.npc[start.npcId] = start.npcName
    }
  }
  const wanted = { npc: new Set<number>(), item: new Set<number>(), monster: new Set<number>() }
  for (const objective of objectivesOf(quests)) {
    for (const [, kind, id] of (objective.text ?? '').matchAll(OBJECTIVE_REFERENCE)) {
      const key = kind as keyof ObjectiveNames
      if (!(Number(id) in names[key])) wanted[key].add(Number(id))
    }
  }
  await Promise.all(
    (Object.keys(wanted) as (keyof ObjectiveNames)[]).map(async (kind) => {
      if (!wanted[kind].size) return
      const { docs } = await payload.find({
        collection: NAME_COLLECTIONS[kind],
        where: { dofusId: { in: [...wanted[kind]] } },
        select: { dofusId: true, name: true },
        depth: 0,
        pagination: false,
        ...visitor,
      })
      for (const doc of docs) names[kind][doc.dofusId] = doc.name
    }),
  )
  return names
}

/**
 * El nombre de cada subzona donde está algún objetivo de unas misiones, por su ID de DofusDB, en
 * el idioma del sitio. Las subzonas solo cambian con `pnpm data:quests`, fuera del servidor: como
 * las misiones, se ven al caducar la caché de los detalles (CHECKLISTS_REVALIDATE).
 */
async function readSubareaNames(
  payload: Payload,
  quests: Pick<DetailsQuest, 'stages'>[],
): Promise<Record<number, string>> {
  const wanted = [
    ...new Set(
      objectivesOf(quests).flatMap((objective) =>
        objective.subAreaId == null ? [] : [objective.subAreaId],
      ),
    ),
  ]
  if (!wanted.length) return {}
  const { docs } = await payload.find({
    collection: 'subareas',
    where: { dofusId: { in: wanted } },
    select: { dofusId: true, name: true },
    locale: SITE_LOCALE,
    depth: 0,
    pagination: false,
    ...visitor,
  })
  return Object.fromEntries(docs.map((doc) => [doc.dofusId, doc.name]))
}

/** El slug de cada documento por el ID de lo que enlaza en un campo. */
function slugsBy<T extends { slug: string }>(docs: T[], field: keyof T): Record<number, string> {
  return Object.fromEntries(
    docs.flatMap((doc) => {
      const id = relationId(doc[field])
      return id === null ? [] : [[id, doc.slug]]
    }),
  )
}

/**
 * Las misiones de la checklist con lo que el progreso necesita (sus objetivos, su criterio de
 * inicio y lo que piden terminado), y las que estas piden, de dentro o de fuera de la
 * checklist, hasta el final de la cadena. Por ID de Payload; lo que piden, por ID de DofusDB.
 *
 * Dos consultas como mucho, sea cual sea el largo de la cadena: las misiones de la checklist y,
 * si alguna pide una de fuera, lo que pide cada misión guardada (el ID, el de DofusDB y sus
 * prerrequisitos), que se sigue en memoria. La página lo guarda en su caché (cache.ts).
 */
export async function readQuestGraph(
  payload: Payload,
  questIds: number[],
): Promise<Record<number, QuestNode>> {
  const { docs } = await payload.find({
    collection: 'quests',
    where: { id: { in: questIds } },
    select: {
      dofusId: true,
      levelMin: true,
      startCriterion: true,
      prerequisites: true,
      stages: { objectives: { dofusId: true } },
    },
    depth: 0,
    pagination: false,
    ...visitor,
  })
  const found = new Map<number, { node: Omit<QuestNode, 'prerequisites'>; needs: number[] }>()
  for (const doc of docs) {
    found.set(doc.id, {
      node: {
        dofusId: doc.dofusId,
        levelMin: doc.levelMin ?? null,
        startCriterion: doc.startCriterion ?? null,
        objectives: (doc.stages ?? []).flatMap((stage) =>
          (stage.objectives ?? []).map((objective) => objective.dofusId),
        ),
      },
      needs: ids(doc.prerequisites ?? []),
    })
  }
  const outside = [...found.values()].some(({ needs }) => needs.some((id) => !found.has(id)))
  if (outside) {
    const all = await payload.find({
      collection: 'quests',
      select: { dofusId: true, prerequisites: true },
      depth: 0,
      pagination: false,
      ...visitor,
    })
    const byId = new Map(all.docs.map((doc) => [doc.id, doc]))
    const queue = [...found.values()].flatMap(({ needs }) => needs)
    for (let id = queue.shift(); id !== undefined; id = queue.shift()) {
      const doc = byId.get(id)
      if (!doc || found.has(id)) continue
      const needs = ids(doc.prerequisites ?? [])
      found.set(id, {
        node: { dofusId: doc.dofusId, levelMin: null, startCriterion: null, objectives: [] },
        needs,
      })
      queue.push(...needs)
    }
  }
  return Object.fromEntries(
    [...found].map(([id, { node, needs }]) => [
      id,
      {
        ...node,
        prerequisites: needs.flatMap((need) => {
          const dofusId = found.get(need)?.node.dofusId
          return dofusId === undefined ? [] : [dofusId]
        }),
      },
    ]),
  )
}

/** Todas las checklists con su nombre y su id antiguo: «Hecha en la checklist del Dofus X». */
async function readChecklistNames(payload: Payload): Promise<ChecklistName[]> {
  const { docs } = await payload.find({
    collection: 'checklists',
    select: { name: true, legacy: { prefix: true } },
    depth: 0,
    pagination: false,
    ...visitor,
  })
  return docs.map((doc) => ({
    id: doc.id,
    name: doc.name,
    legacyId: doc.legacy?.prefix?.replace(/:$/, '') || null,
  }))
}

/**
 * La checklist de un slug, como la ve quien pide: un visitante, la publicada (también la En
 * preparación: la página decide); un usuario del panel con preview, el último borrador. Null
 * si no hay ninguna.
 */
async function findChecklist(
  payload: Payload,
  slug: string,
  preview: ReadChecklistOptions['preview'],
  depth: number,
  populate: Record<string, Record<string, true>>,
): Promise<Checklist | null> {
  if (!isGuideSlug(slug)) return null
  const where: Where = { slug: { equals: slug } }
  const { docs } = await payload.find({
    collection: 'checklists',
    where,
    depth,
    populate,
    limit: 1,
    pagination: false,
    ...access(preview),
  })
  return (docs[0] as Checklist | undefined) ?? null
}

/**
 * La checklist de un slug con lo que enseña su página: sus misiones (nombre y nivel), los
 * objetos de Necesitarás, sus logros, figuras, jefes e imágenes, la guía de su Dofus con el
 * huevo, y los slugs de las guías de misión y las páginas de logro publicadas que enlaza.
 */
export async function readChecklist(
  payload: Payload,
  slug: string,
  { preview }: ReadChecklistOptions = {},
): Promise<Omit<ChecklistData, 'siteUrl'> | null> {
  const checklist = await findChecklist(payload, slug, preview, 3, {
    quests: { dofusId: true, name: true, levelMin: true },
    items: { dofusId: true, name: true, image: true },
    achievements: { name: true, icon: true },
    npcs: { name: true, renderRight: true },
    monsters: { name: true, image: true },
    'dofus-guides': { name: true, slug: true, state: true, color: true, dofus: true },
  })
  if (!checklist) return null

  const steps = checklist.steps ?? []
  const questIds = ids(steps.flatMap((step) => (step.quests ?? []).map((row) => row.quest)))
  const achievementIds = ids(
    steps.flatMap((step) => (step.achievements ?? []).map((row) => row.achievement)),
  )
  const stopIds = ids(
    steps.flatMap((step) =>
      (step.segments ?? []).flatMap((segment) => (segment.kind === 'stop' ? [segment.quest] : [])),
    ),
  )

  const [guides, pages, stops, questGraph, checklists] = await Promise.all([
    questIds.length
      ? payload.find({
          collection: 'quest-guides',
          where: { quest: { in: questIds } },
          select: { slug: true, quest: true, summary: { prerequisites: true } },
          depth: 0,
          pagination: false,
          ...visitor,
        })
      : { docs: [] },
    achievementIds.length
      ? payload.find({
          collection: 'achievement-pages',
          // Una página En preparación no tiene página: no se enlaza.
          where: { achievement: { in: achievementIds }, state: { equals: 'published' } },
          select: { slug: true, achievement: true },
          depth: 0,
          pagination: false,
          ...visitor,
        })
      : { docs: [] },
    stopIds.length
      ? payload.find({
          collection: 'quests',
          where: { id: { in: stopIds } },
          select: { stages: true, startPositions: true },
          depth: 0,
          pagination: false,
          ...visitor,
        })
      : { docs: [] },
    readQuestGraph(payload, questIds),
    readChecklistNames(payload),
  ])

  return {
    checklist,
    questGuides: slugsBy(guides.docs, 'quest'),
    torreLevels: Object.fromEntries(
      guides.docs.flatMap((guide) => {
        const quest = relationId(guide.quest)
        const level = torreLevel(guide.summary?.prerequisites)
        return quest !== null && level ? [[quest, level]] : []
      }),
    ),
    questGraph,
    checklists,
    achievementPages: slugsBy(pages.docs, 'achievement'),
    stopQuests: Object.fromEntries(stops.docs.map((doc) => [doc.id, { stages: doc.stages }])),
    names: await readObjectiveNames(payload, stops.docs),
  }
}

/**
 * Los detalles de las misiones de una checklist (src/lib/checklists/details.ts), con la misma
 * visibilidad que su página. Null si no hay checklist.
 */
export async function readChecklistDetails(
  payload: Payload,
  slug: string,
  { preview }: ReadChecklistOptions = {},
): Promise<ChecklistDetails | null> {
  const checklist = await findChecklist(payload, slug, preview, 0, {})
  if (!checklist) return null
  const questIds = ids(
    (checklist.steps ?? []).flatMap((step) => (step.quests ?? []).map((row) => row.quest)),
  )
  const { docs } = questIds.length
    ? await payload.find({
        collection: 'quests',
        where: { id: { in: questIds } },
        select: { dofusId: true, startPositions: true, stages: true },
        depth: 0,
        pagination: false,
        ...visitor,
      })
    : { docs: [] }
  const quests = docs as DetailsQuest[]
  // Solo las misiones donde para algún paso tienen ruta en la página: solo sus subzonas.
  const stopIds = new Set(
    ids(
      (checklist.steps ?? []).flatMap((step) =>
        (step.segments ?? []).flatMap((segment) =>
          segment.kind === 'stop' ? [segment.quest] : [],
        ),
      ),
    ),
  )
  const routed = (docs as (DetailsQuest & { id: number })[]).filter((quest) =>
    stopIds.has(quest.id),
  )
  const [names, subareas] = await Promise.all([
    readObjectiveNames(payload, quests),
    readSubareaNames(payload, routed),
  ])
  return checklistDetails(quests, names, subareas)
}

type GuideArt = { color?: string | null; dofus?: unknown }

/**
 * Todas las checklists publicadas, en el orden de Torre, con el huevo y el color de la guía
 * de su Dofus, para el índice, el menú, el pie y la portada. Como un visitante: lo publicado
 * (también las En preparación, que enlazan a Squarespace). Sin los pasos, que pesan.
 *
 * El huevo (la imagen del objeto del Dofus, de DofusDB) y el color salen de la guía aunque
 * siga en borrador: son datos del juego. De esa guía se pide solo eso, así que nada de lo que
 * Torre aún no ha publicado llega a un visitante.
 */
export async function readChecklists(payload: Payload): Promise<ChecklistDoc[]> {
  const { docs } = await payload.find({
    collection: 'checklists',
    sort: ['order', 'name'],
    select: {
      name: true,
      slug: true,
      state: true,
      order: true,
      description: true,
      legacyHref: true,
      dofusGuide: true,
    },
    depth: 0,
    pagination: false,
    draft: false,
    overrideAccess: false,
  })
  const ids = [
    ...new Set(docs.map((doc) => relationId(doc.dofusGuide)).filter((id) => id !== null)),
  ]
  const art = new Map<number, GuideArt>()
  if (ids.length) {
    const guides = await payload.find({
      collection: 'dofus-guides',
      where: { id: { in: ids } },
      select: { color: true, dofus: true },
      populate: { items: { image: true } },
      depth: 2,
      pagination: false,
      draft: false,
      overrideAccess: true,
    })
    for (const guide of guides.docs) {
      art.set(guide.id, { color: guide.color ?? null, dofus: guide.dofus ?? null })
    }
  }
  return docs.map((doc) => {
    const id = relationId(doc.dofusGuide)
    return { ...doc, dofusGuide: id === null ? null : (art.get(id) ?? null) } as ChecklistDoc
  })
}
