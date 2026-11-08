// De la página de logro guardada a lo que pintan los componentes (DESIGN.md, Achievement
// page). Código puro, sin Payload ni React: la ruta carga los documentos y esto decide qué
// se enseña. Lo que no está no se inventa.

import type { GameItem, Quantity } from '@/components/game/types'
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

interface QuestDoc {
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
  facts: Pick<QuestHeaderData, 'prerequisites' | 'needs' | 'rewards'>
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

/**
 * Lo que hay que reunir para todas las misiones: los objetos y las notas con cantidad
 * («1 x Combate (solo).») de las guías, sumados. Una nota sin cantidad («Literalmente nada
 * xD.») es un comentario de esa guía y no entra en el total.
 */
function totalNeeds(guides: GuideRef[]): { items: Quantity<GameItem>[]; notes: NeedNote[] } {
  const notes: NeedNote[] = []
  const items = new Map<number, Quantity<GameItem>>()
  for (const guide of guides) {
    const lines = (guide.needs?.notes ?? '').split('\n').map((line) => line.trim())
    for (const line of lines.filter(Boolean)) {
      const note = needNote(line)
      if (note.quantity == null) continue
      const key = note.label.toLocaleLowerCase('es')
      const same = notes.find((known) => known.label.toLocaleLowerCase('es') === key)
      if (same) same.quantity! += note.quantity
      else notes.push({ ...note })
    }
    for (const { item, quantity } of neededItems(guide.needs as LinkedNeeds | null)) {
      const known = items.get(item.id)
      if (known) known.quantity += quantity
      else items.set(item.id, { item: gameItem(item), quantity })
    }
  }
  return { items: [...items.values()], notes }
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

/** Lo que pinta la página de un logro. */
export function achievementPageView(data: AchievementPageData): AchievementPageView {
  const { page } = data
  const guideByQuest = new Map(data.guides.map((guide) => [guide.questId, guide]))
  const rows = (page.quests ?? []).map((row) => ({
    name: row.name ?? '',
    quests: (row.quests ?? [])
      .map((quest) => populated(quest))
      .filter((q): q is QuestDoc => q !== null),
  }))
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

  // Lo que hace falta en total: lo que piden las guías publicadas de las misiones sin
  // alternativas (de la misión de clase no se sabe cuál harás).
  const single = rows.flatMap((row) => (row.quests.length === 1 ? [row.quests[0]!] : []))
  const needs = totalNeeds(single.flatMap((quest) => guideByQuest.get(quest.id) ?? []))

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

  const quests = rows.map((row, index): QuestCard => {
    const level = rowLevel(row.quests)
    const only = row.quests.length === 1 ? row.quests[0]! : null
    const guide = only ? guideByQuest.get(only.id) : undefined
    const npcId = only?.startPositions?.find((position) => position.npcId != null)?.npcId
    const giver = npcId != null ? icon(data.givers.get(npcId)?.renderRight) : undefined
    return {
      position: index + 1,
      ...(level && { level }),
      title: only?.name ?? row.name,
      ...(guide && { href: `/${guide.slug}` }),
      ...(giver && { giver }),
    }
  })

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
    facts: { prerequisites, needs, rewards },
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
function buildBreadcrumb(
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
