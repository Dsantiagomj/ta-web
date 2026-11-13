// De la página de logro guardada a lo que pintan los componentes (DESIGN.md, Achievement
// page). Código puro, sin Payload ni React: la ruta carga los documentos y esto decide qué
// se enseña. Lo que no está no se inventa.

import type { GameItem } from '@/components/game/types'
import type { ImageAsset } from '@/components/ui/types'
import { neededItems } from '@/lib/guides/format'
import { gameItem, needNote, type NeedNote, type QuestHeaderData } from '@/lib/guides/page'
import type { LinkedNeeds } from '@/lib/guides/summary'
import { mediaImageAsset } from '@/lib/media/image-asset'
import type { Media } from '@/payload-types'

import type { GuideAchievement } from './queries'
import { achievementPageStrings as s, type PageState } from './strings'

/** El índice de metalogros. */
export const METALOGROS_PATH = '/metalogros'

/** Un metalogro es su panel en el índice: /metalogros#astrub. */
export const metalogroHref = (slug: string) =>
  `${METALOGROS_PATH}#${slug.replace(/^metalogro-/, '')}`

type Relation<T> = number | T | null | undefined
type MediaRef = Relation<Media | (Partial<Media> & { id: number })>

export interface QuestDoc {
  id: number
  name?: string | null
  levelMin?: number | null
  startPositions?: { npcId?: number | null }[] | null
  prerequisites?: Relation<{ id: number; name?: string | null }>[] | null
}

/** Una página de logro con depth 2: su logro con el icono, su metalogro y sus misiones. */
export interface PageDoc {
  id: number
  name: string
  slug: string
  state: PageState
  points?: number | null
  quests?: { name?: string | null; quests?: Relation<QuestDoc>[] | null }[] | null
  rewards?: {
    experience?: number | null
    kamas?: number | null
    items?:
      | {
          item: Relation<{ id: number; name?: string | null; image?: MediaRef }>
          quantity: number
        }[]
      | null
  } | null
  achievement?: Relation<{
    icon?: MediaRef
    countsFor?:
      | {
          name?: string | null
          points?: number | null
          achievements?: number | null
          icon?: MediaRef
        }[]
      | null
  }>
  group?: Relation<{ name: string; slug: string }>
}

/** Un logro del mismo metalogro, para la columna y el anterior y el siguiente. */
export interface SiblingDoc {
  id: number
  name: string
  slug: string
  state: PageState
  achievement?: Relation<{ icon?: MediaRef }>
  quests?: { quests?: Relation<{ levelMin?: number | null }>[] | null }[] | null
}

/** La guía publicada de una misión, con su Necesitarás. */
export interface GuideRef {
  questId: number
  slug: string
  needs: { items?: unknown; notes?: string | null } | null
}

export interface AchievementPageData {
  page: PageDoc
  /** Los logros del metalogro, en orden, este incluido. */
  siblings: SiblingDoc[]
  /** Las guías publicadas de las misiones del logro y de sus prerrequisitos. */
  guides: GuideRef[]
  /** Los PNJ que dan las misiones, por su ID de DofusDB, con sus renders. */
  givers: Map<number, { name?: string | null; renderRight?: MediaRef }>
  /** Los objetos del juego que nombran las notas de Necesitarás, por su nombre exacto. */
  noteItems: Map<string, NoteItemDoc>
  /**
   * La imagen del jefe de la mazmorra que nombra cada nota de mazmorra, por su clave
   * (needKey): solo las casadas cuyo jefe tiene imagen (readDungeonBosses).
   */
  dungeonBosses: Map<string, MediaRef>
  /** El origen público del sitio, para el JSON-LD. */
  siteUrl: string
}

export interface QuestCard {
  position: number
  level?: number
  title: string
  /** Su guía publicada; sin ella, sin enlace. */
  href?: string
  giver?: ImageAsset
}

export interface GroupItem {
  name: string
  href?: string
  current: boolean
  /** En preparación: se ve, apagado y sin enlace. */
  disabled: boolean
  icon?: ImageAsset
  quests: number
  levels?: string
}

export interface CountsFor {
  name: string
  points?: number
  achievements: number
  icon?: ImageAsset
}

export interface BreadcrumbData {
  parents: { name: string; href: string }[]
  jsonLd: {
    '@context': 'https://schema.org'
    '@type': 'BreadcrumbList'
    itemListElement: { '@type': 'ListItem'; position: number; name: string; item: string }[]
  }
}

export interface AchievementPageView {
  title: string
  icon?: ImageAsset
  /** «3 misiones», «Niveles 15 a 25», «10 puntos». */
  meta: string[]
  facts: Pick<QuestHeaderData, 'prerequisites' | 'rewards'>
  /** «Necesitarás en total», su propia zona bajo la cabecera. */
  needs: AchievementNeeds
  quests: QuestCard[]
  group: { name: string; items: GroupItem[] } | null
  previous: GroupItem | null
  next: GroupItem | null
  countsFor: CountsFor[]
  breadcrumb: BreadcrumbData
}

function populated<T extends object>(value: Relation<T>): T | null {
  return value && typeof value === 'object' ? value : null
}

const icon = (value: MediaRef) => mediaImageAsset(populated(value) as Media | null) ?? undefined
const positive = (value: number | null | undefined) => (value && value > 0 ? value : undefined)

/** El nivel más bajo y el más alto de una lista, como «Niveles 15 a 25», o nada. */
function levelRange(levels: (number | null | undefined)[]): string | undefined {
  const known = levels.filter((level): level is number => Boolean(level && level > 0))
  if (known.length === 0) return undefined
  return s.levels(Math.min(...known), Math.max(...known))
}

/** El nivel de una fila: el más bajo de sus misiones (las alternativas). */
function rowLevel(quests: (QuestDoc | null)[]): number | undefined {
  const known = quests.flatMap((quest) => (quest?.levelMin ? [quest.levelMin] : []))
  return known.length ? Math.min(...known) : undefined
}

/** Un objeto de «Necesitarás en total». Sin cantidad cuando lo nombra una nota que no la da. */
export interface NeedItem {
  item: GameItem
  quantity?: number
}

/** «Necesitarás en total» en sus tres grupos (DESIGN.md, Achievement page components). */
export interface AchievementNeeds {
  /** «Objetos»: los que enlazan las guías y los que nombran sus notas, con su icono. */
  items: NeedItem[]
  /** «Combates y mazmorras»: una mazmorra casada lleva la imagen de su jefe. */
  tasks: { quantity?: number; label: string; kind: 'combat' | 'dungeon'; boss?: ImageAsset }[]
  /** «Otros»: el resto de las notas, tal como las escribió Torre. */
  others: { quantity?: number; label: string }[]
}

/** Un objeto del juego que nombra una nota, por su nombre exacto (readAchievementPage). */
export type NoteItemDoc = { id: number; name: string; image?: Media | number | null }

// «Mazmorra Malefíscof»: va con los combates, con el jefe de esa mazmorra o el icono de
// mazmorra.
const DUNGEON = /\bmazmorras?\b/iu

/** Si una nota va como mazmorra en «Combates y mazmorras». */
export const isDungeonNote = (label: string) => DUNGEON.test(label)

/** Las notas de Necesitarás de unas guías, cada línea como la lee la página. */
function guideNotes(guides: Pick<GuideRef, 'needs'>[]): NeedNote[] {
  return guides.flatMap((guide) =>
    (guide.needs?.notes ?? '')
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map(needNote),
  )
}

/** Lo que dicen las notas de unas guías, para buscar los objetos que nombran. */
export function noteLabels(guides: Pick<GuideRef, 'needs'>[]): string[] {
  return [...new Set(guideNotes(guides).map((note) => note.label))]
}

/**
 * Lo que hay que reunir para todas las misiones: los objetos y las notas de las guías. Las
 * notas con cantidad («1 x Combate (solo).») se suman; las que no la tienen («Hechizo
 * Captura de almas.», «1 kama») salen tal cual, una vez aunque las repitan varias guías:
 * nada de lo que Torre escribió se pierde. Una nota con cantidad que nombra un objeto del
 * total («2 x Dragopavo pelirrojo.», cuando otra guía lo enlaza como objeto) se suma a ese
 * objeto: se cruzan al final, así que da igual en qué guía venga cada uno. Una nota cuyo
 * texto es el nombre exacto de un objeto del juego (noteItems) pasa a ser ese objeto, con su
 * icono, y suma su cantidad a la que pidan otras notas; las que solo cambian en mayúsculas o
 * tildes cuentan como él. Nada depende del orden de las guías. El resto se reparte en
 * combates y mazmorras, y otros.
 */
function totalNeeds(
  guides: GuideRef[],
  noteItems: Map<string, NoteItemDoc>,
  dungeonBosses: Map<string, MediaRef>,
): AchievementNeeds {
  const notes = new Map<string, NeedNote>()
  const items = new Map<number, NeedItem>()
  for (const guide of guides) {
    for (const note of guideNotes([guide])) {
      // Con y sin cantidad no se mezclan: «1 x Combate» y «Combate» son filas distintas.
      const key = `${note.quantity == null ? '-' : '#'}${needKey(note.label)}`
      const same = notes.get(key)
      if (!same) notes.set(key, { ...note })
      else if (note.quantity != null) same.quantity! += note.quantity
    }
    for (const { item, quantity } of neededItems(guide.needs as LinkedNeeds | null)) {
      const known = items.get(item.id)
      if (known) known.quantity = (known.quantity ?? 0) + quantity
      else items.set(item.id, { item: gameItem(item), quantity })
    }
  }
  const itemByName = new Map([...items.values()].map((entry) => [needKey(entry.item.name), entry]))
  // Los objetos que alguna nota nombra exactamente, por la misma clave que junta las notas:
  // si «1 x Piedra de alma mediana» y «2 x piedra de alma mediana» se suman en una fila, esa
  // fila es el objeto venga primero la exacta o la otra.
  const namedByKey = new Map([...noteItems].map(([name, doc]) => [needKey(name), doc]))
  const needs: AchievementNeeds = { items: [], tasks: [], others: [] }
  for (const note of notes.values()) {
    const { quantity, label } = note
    const linked = quantity == null ? undefined : itemByName.get(needKey(label))
    if (linked) {
      linked.quantity = (linked.quantity ?? 0) + quantity!
      continue
    }
    const named = namedByKey.get(needKey(label))
    if (named) {
      // Una cantidad pedida se suma siempre, aunque otra guía nombrara antes el objeto sin
      // ella: el resultado no depende del orden de las guías.
      const known = items.get(named.id)
      if (!known)
        items.set(named.id, { item: gameItem(named), ...(quantity != null && { quantity }) })
      else if (quantity != null) known.quantity = (known.quantity ?? 0) + quantity
      continue
    }
    const row = { ...(quantity != null && { quantity }), label }
    if (isDungeonNote(label)) {
      const boss = icon(dungeonBosses.get(needKey(label)))
      needs.tasks.push({ ...row, kind: 'dungeon', ...(boss && { boss }) })
    } else if (note.combat) needs.tasks.push({ ...row, kind: 'combat' })
    else needs.others.push(row)
  }
  needs.items = [...items.values()]
  return needs
}

/** Para casar una nota con otra o con un objeto: sin mayúsculas, tildes ni espacios de más. */
export function needKey(label: string): string {
  return label
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/\s+/gu, ' ')
    .trim()
    .toLocaleLowerCase('es')
}

function groupItem(doc: SiblingDoc, currentId: number): GroupItem {
  const current = doc.id === currentId
  const disabled = doc.state !== 'published'
  const levels = levelRange(
    (doc.quests ?? []).map((row) => {
      const known = (row.quests ?? []).flatMap((quest) => populated(quest)?.levelMin ?? [])
      return known.length ? Math.min(...known) : null
    }),
  )
  const asset = icon(populated(doc.achievement)?.icon)
  return {
    name: doc.name,
    ...(!current && !disabled && { href: `/${doc.slug}` }),
    current,
    disabled,
    ...(asset && { icon: asset }),
    quests: (doc.quests ?? []).length,
    ...(levels && { levels }),
  }
}

/** Las misiones de un logro en filas: una o varias alternativas (la misión de clase). */
export interface QuestRow {
  name: string
  quests: QuestDoc[]
}

/** Las filas de misiones de una página de logro, con sus misiones pobladas. */
export function questRows(page: Pick<PageDoc, 'quests'>): QuestRow[] {
  return (page.quests ?? []).map((row) => ({
    name: row.name ?? '',
    quests: (row.quests ?? [])
      .map((quest) => populated(quest))
      .filter((q): q is QuestDoc => q !== null),
  }))
}

/**
 * Las tarjetas de las misiones de un logro, en orden: el PNJ que da la misión, su nivel y
 * su título, con enlace si su guía está publicada. Una fila de alternativas es una tarjeta
 * con el nombre de la fila y el nivel más bajo. Las comparte la guía de Dofus.
 */
export function questCards(
  rows: QuestRow[],
  guideByQuest: Map<number, { slug: string }>,
  givers: AchievementPageData['givers'],
): QuestCard[] {
  return rows.map((row, index): QuestCard => {
    const level = rowLevel(row.quests)
    const only = row.quests.length === 1 ? row.quests[0]! : null
    const guide = only ? guideByQuest.get(only.id) : undefined
    const npcId = only?.startPositions?.find((position) => position.npcId != null)?.npcId
    const giver = npcId != null ? icon(givers.get(npcId)?.renderRight) : undefined
    return {
      position: index + 1,
      ...(level && { level }),
      title: only?.name ?? row.name,
      ...(guide && { href: `/${guide.slug}` }),
      ...(giver && { giver }),
    }
  })
}

/** «Niveles 15 a 25» de unas tarjetas, o nada. */
export const cardLevels = (cards: QuestCard[]) => levelRange(cards.map((card) => card.level))

/**
 * «Necesitarás en total» de una página de logro: lo que piden las guías publicadas de las
 * misiones sin alternativas (de la misión de clase no se sabe cuál harás). Lo usan la página
 * y el informe de mazmorras de `pnpm data:quests`, para que digan lo mismo.
 */
export function achievementNeeds(
  data: Pick<AchievementPageData, 'guides' | 'noteItems' | 'dungeonBosses'> & {
    page: Pick<PageDoc, 'quests'>
  },
): AchievementNeeds {
  const guideByQuest = new Map(data.guides.map((guide) => [guide.questId, guide]))
  const single = questRows(data.page).flatMap((row) =>
    row.quests.length === 1 ? [row.quests[0]!] : [],
  )
  return totalNeeds(
    single.flatMap((quest) => guideByQuest.get(quest.id) ?? []),
    data.noteItems,
    data.dungeonBosses,
  )
}

/** Lo que pinta la página de un logro. */
export function achievementPageView(data: AchievementPageData): AchievementPageView {
  const { page } = data
  const guideByQuest = new Map(data.guides.map((guide) => [guide.questId, guide]))
  const rows = questRows(page)
  const ownQuests = new Set(rows.flatMap((row) => row.quests.map((quest) => quest.id)))

  // Prerrequisitos: las misiones previas de fuera del logro, sin repetir.
  const prerequisites: QuestHeaderData['prerequisites'] = []
  const seen = new Set<number>()
  for (const quest of rows.flatMap((row) => row.quests)) {
    for (const previous of quest.prerequisites ?? []) {
      const doc = populated(previous)
      if (!doc?.name || ownQuests.has(doc.id) || seen.has(doc.id)) continue
      seen.add(doc.id)
      const guide = guideByQuest.get(doc.id)
      prerequisites.push(
        guide
          ? { label: doc.name, href: `/${guide.slug}`, quest: true }
          : { label: doc.name, quest: true },
      )
    }
  }

  const needs = achievementNeeds(data)

  const max = positive(page.rewards?.experience)
  const kamas = positive(page.rewards?.kamas)
  const items = (page.rewards?.items ?? []).flatMap(({ item, quantity }) => {
    const doc = populated(item)
    return doc?.name
      ? [{ item: gameItem(doc as { name: string; image?: Media | null }), quantity }]
      : []
  })
  const rewards: QuestHeaderData['rewards'] = {
    ...(max && { xp: { max } }),
    ...(kamas && { kamas }),
    items,
    notes: [],
  }

  const quests = questCards(rows, guideByQuest, data.givers)

  const levels = levelRange(quests.map((card) => card.level))
  const points = positive(page.points)
  const meta = [
    s.quests(rows.length),
    ...(levels ? [levels] : []),
    ...(points ? [s.points(points)] : []),
  ]

  const group = populated(page.group)
  const siblings = group ? data.siblings.map((doc) => groupItem(doc, page.id)) : []
  const at = siblings.findIndex((item) => item.current)

  const achievement = populated(page.achievement)
  const countsFor = (achievement?.countsFor ?? []).flatMap((meta): CountsFor[] => {
    if (!meta.name) return []
    const asset = icon(meta.icon)
    const metaPoints = positive(meta.points)
    return [
      {
        name: meta.name,
        ...(metaPoints && { points: metaPoints }),
        achievements: meta.achievements ?? 0,
        ...(asset && { icon: asset }),
      },
    ]
  })

  const breadcrumb = buildBreadcrumb(
    metalogroParents(group),
    { name: page.name, href: `/${page.slug}` },
    data.siteUrl,
  )

  const pageIcon = icon(achievement?.icon)
  return {
    title: page.name,
    ...(pageIcon && { icon: pageIcon }),
    meta,
    facts: { prerequisites, rewards },
    needs,
    quests,
    group: group ? { name: group.name, items: siblings } : null,
    previous: at > 0 ? siblings[at - 1]! : null,
    next: at >= 0 && at < siblings.length - 1 ? siblings[at + 1]! : null,
    countsFor,
    breadcrumb,
  }
}

/** Los primeros padres de las migas: el índice y el metalogro, que es su panel en el índice. */
function metalogroParents(group: { name: string; slug: string } | null) {
  return [
    { name: s.index, href: METALOGROS_PATH },
    ...(group ? [{ name: group.name, href: metalogroHref(group.slug) }] : []),
  ]
}

/**
 * Las migas: solo los padres, porque el h1 nombra la página; la página actual va en el
 * JSON-LD. Un enlace del sitio («/la-ocasion…») va con el origen en el JSON-LD.
 */
export function buildBreadcrumb(
  parents: { name: string; href: string }[],
  current: { name: string; href: string },
  siteUrl: string,
): BreadcrumbData {
  const absolute = (href: string) => (href.startsWith('/') ? `${siteUrl}${href}` : href)
  return {
    parents,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [...parents, current].map((crumb, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: crumb.name,
        item: absolute(crumb.href),
      })),
    },
  }
}

/**
 * Las migas de una guía: «Metalogros / Astrub / La ocasión hace al ladrón». Un logro En
 * preparación no tiene página, así que las migas acaban en el metalogro. Sin logro, null.
 */
export function guideBreadcrumb(
  found: GuideAchievement | null,
  guide: { title: string; slug: string },
  siteUrl: string,
): BreadcrumbData | null {
  if (!found) return null
  const parents = [
    ...metalogroParents(found.group),
    ...(found.page.published ? [{ name: found.page.name, href: `/${found.page.slug}` }] : []),
  ]
  return buildBreadcrumb(parents, { name: guide.title, href: `/${guide.slug}` }, siteUrl)
}
