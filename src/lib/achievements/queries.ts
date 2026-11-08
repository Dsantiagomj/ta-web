// Consultas de la página pública de un logro, por la API local y siempre con los permisos de
// quien mira (AGENTS.md, Payload rules): un visitante solo recibe lo publicado, y un logro
// En preparación no tiene página. La vista previa del panel enseña el último borrador.

import type { Payload } from 'payload'

import { isGuideSlug } from '@/lib/guides/slug'
import type { User } from '@/payload-types'

import type { IndexData } from './metalogros'
import type { AchievementPageData, GuideRef, PageDoc, SiblingDoc } from './page'

export interface ReadAchievementOptions {
  /** Vista previa desde el panel: el último borrador, también En preparación. */
  preview?: { user: User | null }
}

const relationId = (value: number | { id: number } | null | undefined) =>
  value == null ? null : typeof value === 'number' ? value : value.id

/**
 * Lo que necesita la página de un logro: la página (depth 2: el logro con su icono, el
 * metalogro, las misiones con sus prerrequisitos y los objetos con su icono), los logros
 * del mismo metalogro, las guías publicadas de sus misiones y de sus prerrequisitos, y los
 * PNJ que dan cada misión. Null si no hay página que enseñar.
 */
export async function readAchievementPage(
  payload: Payload,
  slug: string,
  { preview }: ReadAchievementOptions = {},
): Promise<Omit<AchievementPageData, 'siteUrl'> | null> {
  if (!isGuideSlug(slug)) return null
  const access = preview
    ? { draft: true, user: preview.user, overrideAccess: false }
    : { draft: false, overrideAccess: false }
  const { docs } = await payload.find({
    collection: 'achievement-pages',
    where: {
      slug: { equals: slug },
      ...(!preview && { state: { equals: 'published' } }),
    },
    depth: 2,
    limit: 1,
    pagination: false,
    ...access,
  })
  const page = docs[0] as PageDoc | undefined
  if (!page) return null

  const groupId = relationId(page.group as number | { id: number } | null)
  const siblings = groupId
    ? ((
        await payload.find({
          collection: 'achievement-pages',
          where: { group: { equals: groupId } },
          sort: ['order', 'name'],
          // Sin select: con él, Payload no trae las relaciones de dentro del array. populate
          // limita lo que trae de cada logro y cada misión.
          populate: { achievements: { icon: true }, quests: { levelMin: true } },
          depth: 2,
          pagination: false,
          ...access,
        })
      ).docs as unknown as SiblingDoc[])
    : []

  const quests = (page.quests ?? []).flatMap((row) =>
    (row.quests ?? []).flatMap((quest) => (quest && typeof quest === 'object' ? [quest] : [])),
  )
  const questIds = new Set<number>()
  for (const quest of quests) {
    questIds.add(quest.id)
    for (const previous of quest.prerequisites ?? []) {
      const id = relationId(previous as number | { id: number } | null)
      if (id !== null) questIds.add(id)
    }
  }
  const guides: GuideRef[] = questIds.size
    ? (
        await payload.find({
          collection: 'quest-guides',
          where: { quest: { in: [...questIds] } },
          select: { slug: true, quest: true, summary: { needs: true } },
          // Los objetos de Necesitarás con su nombre y su icono.
          populate: { items: { name: true, superTypeId: true, image: true } },
          depth: 2,
          pagination: false,
          draft: false,
          overrideAccess: false,
        })
      ).docs.flatMap((doc) => {
        const questId = relationId(doc.quest as number | { id: number } | null)
        return questId === null
          ? []
          : [{ questId, slug: doc.slug, needs: doc.summary?.needs ?? null }]
      })
    : []

  const npcIds = quests.flatMap((quest) => {
    const npcId = quest.startPositions?.find((position) => position.npcId != null)?.npcId
    return npcId == null ? [] : [npcId]
  })
  const npcs = npcIds.length
    ? (
        await payload.find({
          collection: 'npcs',
          where: { dofusId: { in: npcIds } },
          depth: 1,
          pagination: false,
          overrideAccess: false,
        })
      ).docs
    : []

  return {
    page,
    siblings,
    guides,
    givers: new Map(npcs.map((npc) => [npc.dofusId, npc])),
  }
}

/** La página de logro de una misión, para las migas y el subtítulo de su guía. */
export interface GuideAchievement {
  page: { name: string; slug: string; published: boolean }
  group: { name: string; slug: string } | null
  /** Su lugar entre las misiones de la página: la 2 de 3. */
  position: number
  total: number
}

/**
 * La página de logro en la que está una misión, con su metalogro y el lugar de la misión
 * en ella. Si está en varias, la primera por orden. Una En preparación también vale, pero
 * se dice: las migas no la enlazan, porque no tiene página.
 */
export async function findGuideAchievement(
  payload: Payload,
  questId: number | null | undefined,
): Promise<GuideAchievement | null> {
  if (questId == null) return null
  const { docs } = await payload.find({
    collection: 'achievement-pages',
    where: { 'quests.quests': { in: [questId] } },
    sort: ['order', 'name'],
    depth: 1,
    limit: 1,
    pagination: false,
    draft: false,
    overrideAccess: false,
  })
  const page = docs[0]
  if (!page) return null
  const rows = page.quests ?? []
  const index = rows.findIndex((row) =>
    (row.quests ?? []).some((quest) => relationId(quest as number | { id: number }) === questId),
  )
  const group = typeof page.group === 'object' && page.group ? page.group : null
  return {
    page: { name: page.name, slug: page.slug, published: page.state === 'published' },
    group: group && { name: group.name, slug: group.slug },
    position: index + 1,
    total: rows.length,
  }
}

/**
 * Lo que pinta el índice de metalogros, como un visitante: los metalogros publicados con su
 * representante, sus páginas de logro en orden (también las En preparación, que se ven
 * apagadas) con el icono y las misiones, y sus guías sueltas publicadas.
 */
export async function readMetalogrosIndex(payload: Payload): Promise<IndexData> {
  const groups = await payload.find({
    collection: 'achievement-groups',
    depth: 2,
    populate: { npcs: { name: true, renderRight: true }, monsters: { name: true, image: true } },
    pagination: false,
    draft: false,
    overrideAccess: false,
  })
  const pages = await payload.find({
    collection: 'achievement-pages',
    where: { group: { exists: true } },
    sort: ['order', 'name'],
    // Sin select: con él, Payload no trae las relaciones de dentro del array.
    depth: 2,
    populate: { achievements: { icon: true }, quests: { name: true, levelMin: true } },
    pagination: false,
    draft: false,
    overrideAccess: false,
  })
  const guideIds = groups.docs.flatMap((group) =>
    (group.guides ?? []).flatMap((guide) => {
      const id = relationId(guide as number | { id: number })
      return id === null ? [] : [id]
    }),
  )
  const guides = guideIds.length
    ? (
        await payload.find({
          collection: 'quest-guides',
          where: { id: { in: guideIds } },
          select: { title: true, slug: true },
          depth: 0,
          pagination: false,
          draft: false,
          overrideAccess: false,
        })
      ).docs
    : []
  return {
    groups: groups.docs as unknown as IndexData['groups'],
    pages: pages.docs as unknown as IndexData['pages'],
    guides: new Map(guides.map((guide) => [guide.id, { title: guide.title, slug: guide.slug }])),
  }
}
