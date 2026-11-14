// Consultas de la página pública de un logro, por la API local y siempre con los permisos de
// quien mira (AGENTS.md, Payload rules): un visitante solo recibe lo publicado, y un logro
// En preparación no tiene página. La vista previa del panel enseña el último borrador.

import type { Payload } from 'payload'

import { isGuideSlug } from '@/lib/guides/slug'
import type { Media, User } from '@/payload-types'

import { dungeonChooser, noteMatch, type NoteMatch } from './dungeons'
import type { IndexData } from './metalogros'
import {
  type AchievementPageData,
  dungeonPicks,
  type GuideRef,
  isDungeonNote,
  needKey,
  noteLabels,
  type NoteItemDoc,
  type PageDoc,
  type SiblingDoc,
} from './page'

export interface ReadAchievementOptions {
  /** Vista previa desde el panel: el último borrador, también En preparación. */
  preview?: { user: User | null }
}

const relationId = (value: number | { id: number } | null | undefined) =>
  value == null ? null : typeof value === 'number' ? value : value.id

/**
 * Lo que necesita la página de un logro: la página (depth 2: el logro con su icono, el
 * metalogro, las misiones con sus prerrequisitos y los objetos con su icono), los logros
 * del mismo metalogro, las guías publicadas de sus misiones y de sus prerrequisitos, los
 * PNJ que dan cada misión, los objetos que nombran las notas de Necesitarás y la imagen del
 * jefe de cada mazmorra que nombran. Null si no hay página que enseñar.
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
          populate: {
            items: { name: true, superTypeId: true, image: true },
            dungeons: { name: true },
          },
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

  const labels = noteLabels(guides)
  const noteItems = await readNoteItems(payload, labels)
  const dungeonBosses = await readDungeonBosses(payload, labels, { picks: dungeonPicks(guides) })

  return {
    page,
    siblings,
    guides,
    givers: new Map(npcs.map((npc) => [npc.dofusId, npc])),
    noteItems,
    dungeonBosses,
  }
}

/** Con qué permisos leen los ayudantes: los de un visitante, o todos para un script. */
interface ReadAccess {
  overrideAccess?: boolean
}

/**
 * Las notas de Necesitarás que son el nombre exacto de un objeto del juego: la página las
 * pinta como ese objeto, con su icono. Si varios se llaman igual, el de ID de DofusDB menor.
 */
export async function readNoteItems(
  payload: Payload,
  labels: string[],
  { overrideAccess = false }: ReadAccess = {},
): Promise<Map<string, NoteItemDoc>> {
  const noteItems = new Map<string, NoteItemDoc>()
  if (labels.length === 0) return noteItems
  const { docs } = await payload.find({
    collection: 'items',
    where: { name: { in: labels } },
    select: { name: true, image: true },
    sort: 'dofusId',
    depth: 1,
    pagination: false,
    overrideAccess,
  })
  for (const item of docs) {
    if (item.name && !noteItems.has(item.name)) noteItems.set(item.name, item as NoteItemDoc)
  }
  return noteItems
}

/** Cómo casó una nota de mazmorra, y la imagen de su jefe si la tiene en Media. */
export interface NoteDungeon {
  match: NoteMatch
  image?: Media
}

interface DungeonOptions extends ReadAccess {
  /** Las mazmorras elegidas a mano en las guías, por la clave de la nota (dungeonPicks). */
  picks?: Map<string, number>
}

/**
 * La imagen del jefe de la mazmorra que nombra cada nota de mazmorra, por la clave de la
 * nota (needKey). La mazmorra es la que Torre eligió a mano para esa nota y, si no eligió
 * ninguna, la que casa con el nombre de la nota (dungeonChooser), sin imágenes; luego trae
 * solo los jefes de esas mazmorras, y de cada una se queda con el primero que tiene imagen.
 * Una nota sin mazmorra, o cuya mazmorra no tiene jefe con imagen, no está: la página le
 * pone el icono genérico.
 */
export async function readDungeonBosses(
  payload: Payload,
  labels: string[],
  options: DungeonOptions = {},
): Promise<Map<string, Media>> {
  const notes = await chooseDungeonBosses(payload, labels, options)
  return new Map([...notes].flatMap(([key, { image }]) => (image ? [[key, image]] : [])))
}

/**
 * Como readDungeonBosses, para todas las notas de mazmorra: cómo casó cada una (a mano, por
 * nombre, por jefe o nada, con las candidatas si dudó) y la imagen del jefe si la tiene.
 */
export async function chooseDungeonBosses(
  payload: Payload,
  labels: string[],
  { overrideAccess = false, picks = new Map() }: DungeonOptions = {},
): Promise<Map<string, NoteDungeon>> {
  const result = new Map<string, NoteDungeon>()
  const notes = labels.filter(isDungeonNote)
  if (notes.length === 0) return result
  const dungeons = (
    await payload.find({
      collection: 'dungeons',
      select: { name: true, bosses: true },
      populate: { monsters: { name: true } },
      depth: 1,
      pagination: false,
      overrideAccess,
    })
  ).docs.map((doc) => {
    const list = (doc.bosses ?? []).flatMap((boss) => (typeof boss === 'object' ? [boss] : []))
    return {
      id: doc.id,
      name: doc.name,
      bosses: list.flatMap((boss) => boss.name ?? []),
      bossIds: list.map((boss) => boss.id),
    }
  })
  const choose = dungeonChooser(dungeons, (label) => picks.get(needKey(label)))
  const chosen = new Map<string, number[]>()
  for (const label of notes) {
    const choice = choose(label)
    result.set(needKey(label), { match: noteMatch(choice) })
    if (choice.dungeon) chosen.set(needKey(label), choice.dungeon.bossIds)
  }
  const ids = [...new Set([...chosen.values()].flat())]
  if (ids.length === 0) return result
  const { docs } = await payload.find({
    collection: 'monsters',
    where: { id: { in: ids }, image: { exists: true } },
    select: { image: true },
    depth: 1,
    pagination: false,
    overrideAccess,
  })
  const images = new Map(
    docs.flatMap((doc) =>
      typeof doc.image === 'object' && doc.image ? [[doc.id, doc.image]] : [],
    ),
  )
  for (const [key, bossIds] of chosen) {
    const image = bossIds.map((id) => images.get(id)).find(Boolean)
    if (image) result.set(key, { ...result.get(key)!, image })
  }
  return result
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
