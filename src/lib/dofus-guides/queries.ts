import type { Payload } from 'payload'

import { isGuideSlug } from '@/lib/guides/slug'
import type { User } from '@/payload-types'

import {
  countParts,
  type AchievementDoc,
  type DofusGuideData,
  type DofusGuideDoc,
  type DofusListDoc,
  type PartDoc,
  type QuestGuideDoc,
} from './page'

export interface ReadDofusGuideOptions {
  /** Con un usuario del panel: el último borrador, también En preparación. */
  preview?: { user: User }
}

type Access = { draft: boolean; overrideAccess: false; user?: User }

const relationId = (value: unknown): number | null =>
  typeof value === 'number'
    ? value
    : value && typeof value === 'object' && 'id' in value
      ? (value as { id: number }).id
      : null

/** Los IDs de las páginas de logro y de las guías de misión que enlazan unas partes. */
function partIds(parts: readonly PartDoc[]) {
  const achievements = new Set<number>()
  const guides = new Set<number>()
  const add = (set: Set<number>, value: unknown) => {
    const id = relationId(value)
    if (id !== null) set.add(id)
  }
  for (const part of parts) {
    if (part.blockType === 'dofusAchievement') add(achievements, part.achievement)
    else if (part.blockType === 'dofusMetalogro') {
      for (const row of part.achievements ?? []) add(achievements, row.achievement)
    } else if (part.blockType === 'dofusQuests') {
      for (const row of part.quests ?? []) add(guides, row.guide)
    } else if (part.blockType === 'dofusQuest') add(guides, part.guide)
  }
  return { achievements: [...achievements], guides: [...guides] }
}

/**
 * Todos los Dofus en el orden de Torre, con el huevo de su objeto y sus cifras (logros y
 * misiones), para la lista lateral y el índice. Como un visitante: lo publicado.
 */
export async function readDofusList(payload: Payload): Promise<DofusListDoc[]> {
  const { docs } = await payload.find({
    collection: 'dofus-guides',
    sort: ['order', 'name'],
    select: {
      name: true,
      slug: true,
      state: true,
      level: true,
      tag: true,
      color: true,
      aliases: true,
      dofus: true,
      parts: true,
    },
    populate: { items: { image: true } },
    depth: 2,
    pagination: false,
    draft: false,
    overrideAccess: false,
  })
  const linked = docs.map((doc) => partIds((doc.parts ?? []) as PartDoc[]))
  const ids = [...new Set(linked.flatMap((part) => part.achievements))]
  const guideIds = [...new Set(linked.flatMap((part) => part.guides))]
  const visibleGuides = new Set(
    guideIds.length
      ? (
          await payload.find({
            collection: 'quest-guides',
            where: { id: { in: guideIds } },
            select: { slug: true },
            depth: 0,
            pagination: false,
            draft: false,
            overrideAccess: false,
          })
        ).docs.map((doc) => doc.id)
      : [],
  )
  const pages = ids.length
    ? (
        await payload.find({
          collection: 'achievement-pages',
          where: { id: { in: ids } },
          select: { quests: true },
          depth: 0,
          pagination: false,
          draft: false,
          overrideAccess: false,
        })
      ).docs
    : []
  const questCount = new Map(pages.map((page) => [page.id, (page.quests ?? []).length]))
  return docs.map((doc) => {
    const dofus = doc.dofus && typeof doc.dofus === 'object' ? doc.dofus : null
    return {
      id: doc.id,
      name: doc.name,
      slug: doc.slug,
      state: doc.state,
      level: doc.level ?? null,
      tag: doc.tag ?? null,
      color: doc.color ?? null,
      aliases: doc.aliases ?? null,
      egg: dofus?.image ?? null,
      ...countParts(
        (doc.parts ?? []) as PartDoc[],
        (id) => questCount.get(id) ?? null,
        (id) => visibleGuides.has(id),
      ),
    }
  })
}

/**
 * La guía de Dofus de un slug y lo que enlaza: sus páginas de logro con sus misiones, las
 * guías publicadas de esas misiones y de las misiones sueltas, los PNJ que las dan y la
 * lista de todos los Dofus. Null si no hay guía que enseñar: a un visitante, una En
 * preparación tampoco (no tiene página).
 */
export async function readDofusGuide(
  payload: Payload,
  slug: string,
  { preview }: ReadDofusGuideOptions = {},
): Promise<Omit<DofusGuideData, 'siteUrl'> | null> {
  if (!isGuideSlug(slug)) return null
  const access: Access = preview
    ? { draft: true, user: preview.user, overrideAccess: false }
    : { draft: false, overrideAccess: false }
  const { docs } = await payload.find({
    collection: 'dofus-guides',
    where: {
      slug: { equals: slug },
      ...(!preview && { state: { equals: 'published' } }),
    },
    // El objeto Dofus y los de Necesitarás con su imagen; logros y guías solo como ID: se
    // leen aparte, con lo que hace falta de cada uno.
    populate: {
      items: { name: true, image: true },
      'achievement-pages': { name: true },
      'quest-guides': { slug: true },
    },
    depth: 2,
    limit: 1,
    pagination: false,
    ...access,
  })
  const guide = docs[0] as unknown as DofusGuideDoc | undefined
  if (!guide) return null

  const ids = partIds(guide.parts ?? [])
  // Lo enlazado siempre como lo ve un visitante: un logro o una guía sin publicar no sale.
  const visitor = { draft: false, overrideAccess: false } as const
  const [achievementDocs, guideDocs, list] = await Promise.all([
    ids.achievements.length
      ? payload.find({
          collection: 'achievement-pages',
          where: { id: { in: ids.achievements } },
          // Sin select: con él, Payload no puebla las relaciones de dentro del array de
          // misiones. populate limita lo que trae de cada logro y cada misión.
          populate: {
            achievements: { icon: true },
            quests: { name: true, levelMin: true, startPositions: true },
          },
          depth: 2,
          pagination: false,
          ...visitor,
        })
      : { docs: [] },
    ids.guides.length
      ? payload.find({
          collection: 'quest-guides',
          where: { id: { in: ids.guides } },
          select: { slug: true, title: true, quest: true },
          populate: { quests: { name: true, levelMin: true, startPositions: true } },
          depth: 1,
          pagination: false,
          ...visitor,
        })
      : { docs: [] },
    readDofusList(payload),
  ])
  const achievements = new Map(
    (achievementDocs.docs as unknown as AchievementDoc[]).map((doc) => [doc.id, doc]),
  )
  const questGuides = new Map(
    (guideDocs.docs as unknown as QuestGuideDoc[]).map((doc) => [doc.id, doc]),
  )

  // Las misiones de los logros: su guía publicada y quién las da.
  const quests = [...achievements.values()].flatMap((page) =>
    (page.quests ?? []).flatMap((row) =>
      (row.quests ?? []).flatMap((quest) => (quest && typeof quest === 'object' ? [quest] : [])),
    ),
  )
  const questIds = [...new Set(quests.map((quest) => quest.id))]
  const published = questIds.length
    ? (
        await payload.find({
          collection: 'quest-guides',
          where: { quest: { in: questIds } },
          select: { slug: true, quest: true },
          depth: 0,
          pagination: false,
          ...visitor,
        })
      ).docs
    : []
  const guideByQuest = new Map(
    published.flatMap((doc) => {
      const questId = relationId(doc.quest)
      return questId === null ? [] : [[questId, { slug: doc.slug }] as const]
    }),
  )

  const npcIds = [
    ...new Set(
      [
        ...quests,
        ...[...questGuides.values()].flatMap((doc) => (doc.quest ? [doc.quest] : [])),
      ].flatMap((quest) => {
        const npcId = quest.startPositions?.find((start) => start.npcId != null)?.npcId
        return npcId == null ? [] : [npcId]
      }),
    ),
  ]
  const npcs = npcIds.length
    ? (
        await payload.find({
          collection: 'npcs',
          where: { dofusId: { in: npcIds } },
          select: { dofusId: true, renderRight: true },
          depth: 1,
          pagination: false,
          ...visitor,
        })
      ).docs
    : []
  const givers = new Map(npcs.map((npc) => [npc.dofusId, { renderRight: npc.renderRight }]))

  return { guide, achievements, questGuides, guideByQuest, givers, list }
}
