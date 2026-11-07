// De la página de logro guardada a lo que pintan los componentes (DESIGN.md, Achievement
// page). Código puro, sin Payload ni React: la ruta carga los documentos y esto decide qué
// se enseña. Lo que no está no se inventa.

import type { GameItem, Quantity } from '@/components/game/types'
import type { ImageAsset } from '@/components/ui/types'
import { gameItem, needNote, type NeedNote, type QuestHeaderData } from '@/lib/guides/page'
import { mediaImageAsset } from '@/lib/media/image-asset'
import { legacyHref } from '@/lib/site/legacy'
import type { Media } from '@/payload-types'

import { achievementPageStrings as s, type PageState } from './strings'

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

/** Las notas de Necesitarás de varias guías: las que tienen cantidad, sumadas. */
function totalNeeds(guides: GuideRef[]): NeedNote[] {
  const notes: NeedNote[] = []
  for (const guide of guides) {
    for (const line of (guide.needs?.notes ?? '')
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)) {
      const note = needNote(line)
      const same = notes.find(
        (known) => known.label.toLocaleLowerCase('es') === note.label.toLocaleLowerCase('es'),
      )
      if (!same) notes.push({ ...note })
      else if (same.quantity != null && note.quantity != null) same.quantity += note.quantity
    }
  }
  return notes
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
  const needs = {
    items: [] as Quantity<GameItem>[],
    notes: totalNeeds(single.flatMap((quest) => guideByQuest.get(quest.id) ?? [])),
  }

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

  // Las migas: solo los padres; la página actual va en el JSON-LD. El índice y los metalogros
  // aún viven en la web de Torre.
  const parents = [
    { name: s.index, href: legacyHref('metalogros') },
    ...(group ? [{ name: group.name, href: legacyHref(group.slug) }] : []),
  ]
  const breadcrumb: BreadcrumbData = {
    parents,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [...parents, { name: page.name, href: `${data.siteUrl}/${page.slug}` }].map(
        (crumb, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          name: crumb.name,
          item: crumb.href,
        }),
      ),
    },
  }

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
