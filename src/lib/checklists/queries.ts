import type { Payload, Where } from 'payload'

import { isGuideSlug } from '@/lib/guides/slug'
import type { Checklist, User } from '@/payload-types'

import { checklistDetails, type ChecklistDetails, type DetailsQuest } from './details'
import type { ChecklistDoc } from './list'
import { relationId } from './relations'
import { OBJECTIVE_REFERENCE, type ChecklistData, type ObjectiveNames } from './page'

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
  for (const quest of quests) {
    for (const stage of quest.stages ?? []) {
      for (const objective of stage.objectives ?? []) {
        for (const [, kind, id] of (objective.text ?? '').matchAll(OBJECTIVE_REFERENCE)) {
          const key = kind as keyof ObjectiveNames
          if (!(Number(id) in names[key])) wanted[key].add(Number(id))
        }
      }
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
    items: { name: true, image: true },
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

  const [guides, pages, stops] = await Promise.all([
    questIds.length
      ? payload.find({
          collection: 'quest-guides',
          where: { quest: { in: questIds } },
          select: { slug: true, quest: true },
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
  ])

  return {
    checklist,
    questGuides: slugsBy(guides.docs, 'quest'),
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
  return checklistDetails(quests, await readObjectiveNames(payload, quests))
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
