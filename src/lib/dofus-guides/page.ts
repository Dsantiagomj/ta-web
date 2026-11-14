// De la guía de Dofus guardada a lo que pintan los componentes (DESIGN.md, Dofus guide
// page). Código puro, sin Payload ni React: la ruta carga los documentos y esto decide qué
// se enseña. Todo sale de la colección dofus-guides y de lo que enlaza: nada está escrito
// aquí, para que Torre lo cambie en el panel.

import type { GameItem } from '@/components/game/types'
import type { ImageAsset } from '@/components/ui/types'
import {
  buildBreadcrumb,
  cardLevels,
  questCards,
  questRows,
  type BreadcrumbData,
  type PageDoc,
  type QuestCard,
  type QuestDoc,
} from '@/lib/achievements/page'
import type { PageState } from '@/lib/achievements/strings'
import {
  gameItem,
  guideContent,
  type GuideContent,
  type GuideDoc,
  type RichTextState,
} from '@/lib/guides/page'
import { youtubeId } from '@/lib/guides/video'
import { mediaImageAsset } from '@/lib/media/image-asset'
import type { Media } from '@/payload-types'

import { isNeedGroup, NEED_GROUPS, needGroupLabel } from './need-groups'
import { dofusGuideStrings, dofusPageStrings as s } from './strings'

/** El índice de las guías de Dofus. */
export const DOFUS_INDEX_PATH = '/guias-dofus'

type Relation<T> = number | T | null | undefined
type MediaRef = Relation<Media>
type ItemRef = Relation<{ id: number; name?: string | null; image?: MediaRef }>

export type NeedRowDoc =
  | {
      blockType: 'needItem'
      item?: ItemRef
      quantity: number
      name?: string | null
      note?: string | null
    }
  | { blockType: 'needNote'; text: RichTextState }

export type PartDoc =
  | { blockType: 'dofusAchievement'; achievement: Relation<{ id: number }>; note?: string | null }
  | {
      blockType: 'dofusMetalogro'
      name: string
      achievements?: { achievement: Relation<{ id: number }>; note?: string | null }[] | null
    }
  | {
      blockType: 'dofusQuests'
      title?: string | null
      quests?: { guide: Relation<{ id: number }>; note?: string | null }[] | null
    }
  | { blockType: 'dofusQuest'; guide: Relation<{ id: number }>; note?: string | null }
  | { blockType: 'dofusNote'; text: RichTextState }

/** Una guía de Dofus con depth 2: su objeto Dofus con la imagen y sus objetos de Necesitarás. */
export interface DofusGuideDoc {
  id: number
  name: string
  slug: string
  state: PageState
  level?: number | null
  tag?: 'primordial' | 'event' | null
  color?: string | null
  dofus?: ItemRef
  prerequisites?: RichTextState | null
  needs?: {
    title?: string | null
    groups?: { name?: string | null; rows?: NeedRowDoc[] | null }[] | null
  } | null
  rewards?: RichTextState | null
  intro?: RichTextState | null
  parts?: PartDoc[] | null
  /** Los bloques de las guías de misión (src/blocks), con imágenes y monstruos poblados. */
  body?: GuideDoc['body']
  outro?: RichTextState | null
  video?: string | null
  videoPoster?: MediaRef
  checklist?: { name?: string | null; url?: string | null } | null
}

/** Una página de logro de las partes, con sus misiones pobladas. */
export type AchievementDoc = Pick<
  PageDoc,
  'id' | 'name' | 'slug' | 'state' | 'points' | 'quests'
> & {
  achievement?: Relation<{ icon?: MediaRef }>
}

/** Una guía de misión publicada de las partes, con su misión poblada. */
export interface QuestGuideDoc {
  id: number
  slug: string
  title: string
  quest?: QuestDoc | null
}

/** Un Dofus de la lista de todos, con sus cifras ya contadas. */
export interface DofusListDoc {
  id: number
  name: string
  slug: string
  state: PageState
  level?: number | null
  tag?: 'primordial' | 'event' | null
  color?: string | null
  aliases?: string | null
  egg?: MediaRef
  achievements: number
  quests: number
}

export interface DofusGuideData {
  guide: DofusGuideDoc
  /** Las páginas de logro de sus partes que el visitante puede ver, por ID. */
  achievements: Map<number, AchievementDoc>
  /** Las guías de misión de sus partes que el visitante puede ver, por ID. */
  questGuides: Map<number, QuestGuideDoc>
  /** La guía publicada de cada misión de esos logros, por ID de misión. */
  guideByQuest: Map<number, { slug: string }>
  /** Los PNJ que dan las misiones, por su ID de DofusDB, con sus renders. */
  givers: Map<number, { renderRight?: MediaRef }>
  /** Todos los Dofus, en el orden de Torre: el anterior y el siguiente salen de aquí. */
  list: DofusListDoc[]
  siteUrl: string
}

export type NeedRowView =
  | { kind: 'item'; item: GameItem; quantity: number; note?: string }
  | { kind: 'note'; text: RichTextState }

export interface AchievementPartView {
  name: string
  href?: string
  disabled: boolean
  icon?: ImageAsset
  meta: string[]
  note?: string
  quests: QuestCard[]
}

export type DofusQuestCard = QuestCard & { note?: string }

export type PartView =
  | { kind: 'achievement'; achievement: AchievementPartView }
  | { kind: 'metalogro'; number: number; name: string; achievements: AchievementPartView[] }
  | { kind: 'quests'; title?: string; quests: DofusQuestCard[] }
  | { kind: 'quest'; quest: DofusQuestCard }
  | { kind: 'note'; text: RichTextState }

export interface DofusListItem {
  name: string
  href?: string
  current: boolean
  disabled: boolean
  egg?: ImageAsset
  /** «2 logros - 40 misiones - Nivel 180»; solo «Nivel 180» si está En preparación. */
  meta: string
}

export interface DofusGuideView {
  title: string
  egg?: ImageAsset
  color?: string
  tag?: string
  /** «7 logros», «40 misiones», «Nivel 180». */
  meta: string[]
  prerequisites: RichTextState | null
  rewards: RichTextState | null
  intro: RichTextState | null
  outro: RichTextState | null
  /** El paso a paso, con los bloques de las guías de misión. */
  body: GuideContent
  needs: { title: string; groups: { name?: string; rows: NeedRowView[] }[] } | null
  parts: PartView[]
  /** Los logros de las partes, para el título de la sección («El logro»). */
  achievementCount: number
  video: { id: string; title: string; poster?: ImageAsset } | null
  checklist: { name: string; href: string } | null
  previous: DofusListItem | null
  next: DofusListItem | null
  breadcrumb: BreadcrumbData
}

function populated<T extends object>(value: Relation<T>): T | null {
  return value && typeof value === 'object' ? value : null
}

const relationId = (value: Relation<{ id: number }>) =>
  value == null ? null : typeof value === 'number' ? value : value.id

const image = (value: MediaRef) => mediaImageAsset(populated(value)) ?? undefined
const join = (parts: string[]) => parts.join(s.metaSeparator)

/** «2 logros - 40 misiones - Nivel 180»: lo que no hay no se escribe. */
export function dofusMeta(counts: {
  achievements: number
  quests: number
  level?: number | null
}): string[] {
  return [
    ...(counts.achievements > 0 ? [s.achievements(counts.achievements)] : []),
    ...(counts.quests > 0 ? [s.quests(counts.quests)] : []),
    ...(counts.level ? [s.level(counts.level)] : []),
  ]
}

/**
 * Los logros y las misiones de unas partes, para las cifras de la lista: un logro cuenta si
 * questsOf lo conoce (el visitante lo ve) y una guía de misión si guideVisible lo dice.
 */
export function countParts(
  parts: readonly PartDoc[],
  questsOf: (achievementId: number) => number | null,
  guideVisible: (guideId: number) => boolean = () => true,
): { achievements: number; quests: number } {
  let achievements = 0
  let quests = 0
  const addAchievement = (id: number | null) => {
    const count = id === null ? null : questsOf(id)
    if (count === null) return
    achievements += 1
    quests += count
  }
  for (const part of parts) {
    if (part.blockType === 'dofusAchievement') addAchievement(relationId(part.achievement))
    else if (part.blockType === 'dofusMetalogro') {
      for (const row of part.achievements ?? []) addAchievement(relationId(row.achievement))
    } else if (part.blockType === 'dofusQuests') {
      for (const row of part.quests ?? []) {
        const id = relationId(row.guide)
        if (id !== null && guideVisible(id)) quests += 1
      }
    } else if (part.blockType === 'dofusQuest') {
      const id = relationId(part.guide)
      if (id !== null && guideVisible(id)) quests += 1
    }
  }
  return { achievements, quests }
}

function needRows(rows: NeedRowDoc[]): NeedRowView[] {
  return rows.flatMap((row): NeedRowView[] => {
    if (row.blockType === 'needNote') return [{ kind: 'note', text: row.text }]
    const linked = populated(row.item)
    const name = linked?.name || row.name
    if (!name) return []
    const item = linked ? gameItem({ ...linked, name }) : { name }
    return [{ kind: 'item', item, quantity: row.quantity, ...(row.note && { note: row.note }) }]
  })
}

/**
 * El paso a paso: los mismos bloques que una guía de misión, ya listos para pintar (entrada,
 * pasos y cierre). Un paso sin bloques que pintar ni coordenadas no cuenta. Su primera
 * captura no va con prioridad: está debajo de la ficha.
 */
function dofusBody(guide: DofusGuideDoc): GuideContent {
  const content = guideContent({ title: guide.name, body: guide.body }, { priority: false })
  const steps = content.steps.filter((step) => step.blocks.length > 0 || step.coordinates)
  return { ...content, steps }
}

function needsView(guide: DofusGuideDoc): DofusGuideView['needs'] {
  // Los grupos en el orden de la lista fija (need-groups.ts), con su nombre en español; dos
  // grupos iguales salen juntos. Un nombre fuera de la lista va al final, sin título.
  const rank = (name: string | null | undefined) =>
    isNeedGroup(name) ? NEED_GROUPS.indexOf(name) : NEED_GROUPS.length
  const byName = new Map<number, { name?: string; rows: NeedRowView[] }>()
  for (const group of guide.needs?.groups ?? []) {
    const rows = needRows(group.rows ?? [])
    if (rows.length === 0) continue
    const at = rank(group.name)
    const known = byName.get(at)
    if (known) known.rows.push(...rows)
    else {
      const name = isNeedGroup(group.name) ? needGroupLabel(group.name) : undefined
      byName.set(at, { ...(name && { name }), rows })
    }
  }
  const groups = [...byName].sort(([a], [b]) => a - b).map(([, group]) => group)
  if (groups.length === 0) return null
  // «Otros» solo dice algo junto a otros grupos: solo, va sin título.
  if (groups.length === 1 && byName.has(NEED_GROUPS.indexOf('otros'))) delete groups[0]!.name
  return { title: guide.needs?.title || s.needs, groups }
}

/** Una guía de misión de una parte como tarjeta: su PNJ, su nivel y su título enlazado. */
function guideCard(
  data: DofusGuideData,
  guideRef: Relation<{ id: number }>,
  position: number,
  note?: string | null,
): DofusQuestCard | null {
  const id = relationId(guideRef)
  const guide = id === null ? undefined : data.questGuides.get(id)
  if (!guide) return null
  const quest = guide.quest ?? null
  const npcId = quest?.startPositions?.find((start) => start.npcId != null)?.npcId
  const giver = npcId != null ? image(data.givers.get(npcId)?.renderRight) : undefined
  const level = quest?.levelMin && quest.levelMin > 0 ? quest.levelMin : undefined
  return {
    position,
    ...(level && { level }),
    title: guide.title,
    href: `/${guide.slug}`,
    ...(giver && { giver }),
    ...(note && { note }),
  }
}

function achievementPart(
  data: DofusGuideData,
  ref: Relation<{ id: number }>,
  note?: string | null,
): AchievementPartView | null {
  const id = relationId(ref)
  const page = id === null ? undefined : data.achievements.get(id)
  if (!page) return null
  const quests = questCards(questRows(page), data.guideByQuest, data.givers)
  const levels = cardLevels(quests)
  const disabled = page.state !== 'published'
  const icon = image(populated(page.achievement)?.icon)
  const points = page.points && page.points > 0 ? page.points : undefined
  return {
    name: page.name,
    ...(!disabled && { href: `/${page.slug}` }),
    disabled,
    ...(icon && { icon }),
    meta: [
      s.quests(quests.length),
      ...(levels ? [levels] : []),
      ...(points ? [s.points(points)] : []),
    ],
    ...(note && { note }),
    quests,
  }
}

function partsView(data: DofusGuideData): PartView[] {
  let metalogros = 0
  return (data.guide.parts ?? []).flatMap((part): PartView[] => {
    switch (part.blockType) {
      case 'dofusAchievement': {
        const achievement = achievementPart(data, part.achievement, part.note)
        return achievement ? [{ kind: 'achievement', achievement }] : []
      }
      case 'dofusMetalogro': {
        const achievements = (part.achievements ?? []).flatMap((row) => {
          const view = achievementPart(data, row.achievement, row.note)
          return view ? [view] : []
        })
        if (achievements.length === 0) return []
        metalogros += 1
        return [{ kind: 'metalogro', number: metalogros, name: part.name, achievements }]
      }
      case 'dofusQuests': {
        const quests = (part.quests ?? []).flatMap((row, index) => {
          const card = guideCard(data, row.guide, index + 1, row.note)
          return card ? [card] : []
        })
        if (quests.length === 0) return []
        return [{ kind: 'quests', ...(part.title && { title: part.title }), quests }]
      }
      case 'dofusQuest': {
        const quest = guideCard(data, part.guide, 1, part.note)
        return quest ? [{ kind: 'quest', quest }] : []
      }
      case 'dofusNote':
        return [{ kind: 'note', text: part.text }]
    }
  })
}

function listItem(doc: DofusListDoc, currentId: number): DofusListItem {
  const current = doc.id === currentId
  const disabled = doc.state !== 'published'
  const egg = image(doc.egg)
  const meta = disabled
    ? dofusMeta({ achievements: 0, quests: 0, level: doc.level })
    : dofusMeta(doc)
  return {
    name: doc.name,
    ...(!current && !disabled && { href: `/${doc.slug}` }),
    current,
    disabled,
    ...(egg && { egg }),
    meta: join(meta),
  }
}

/** Lo que pinta la página de una guía de Dofus. */
export function dofusGuideView(data: DofusGuideData): DofusGuideView {
  const { guide } = data
  const parts = partsView(data)
  // Las cifras de lo que la página enseña.
  const achievementViews = parts.flatMap((part) =>
    part.kind === 'achievement'
      ? [part.achievement]
      : part.kind === 'metalogro'
        ? part.achievements
        : [],
  )
  const counts = {
    achievements: achievementViews.length,
    quests:
      achievementViews.reduce((total, view) => total + view.quests.length, 0) +
      parts.reduce(
        (total, part) =>
          total + (part.kind === 'quests' ? part.quests.length : part.kind === 'quest' ? 1 : 0),
        0,
      ),
  }
  const list = data.list.map((doc) => listItem(doc, guide.id))
  const published = list.filter((item) => item.current || !item.disabled)
  const at = published.findIndex((item) => item.current)
  const videoId = guide.video ? youtubeId(guide.video) : null
  const poster = image(guide.videoPoster)
  const egg = image(populated(guide.dofus)?.image)
  const checklist =
    guide.checklist?.name && guide.checklist.url
      ? { name: guide.checklist.name, href: guide.checklist.url }
      : null

  return {
    title: guide.name,
    ...(egg && { egg }),
    ...(guide.color && { color: guide.color }),
    ...(guide.tag && { tag: dofusGuideStrings.tags[guide.tag] }),
    meta: dofusMeta({ ...counts, level: guide.level }),
    prerequisites: guide.prerequisites ?? null,
    rewards: guide.rewards ?? null,
    intro: guide.intro ?? null,
    outro: guide.outro ?? null,
    body: dofusBody(guide),
    needs: needsView(guide),
    parts,
    achievementCount: counts.achievements,
    video: videoId ? { id: videoId, title: guide.name, ...(poster && { poster }) } : null,
    checklist,
    previous: at > 0 ? published[at - 1]! : null,
    next: at >= 0 && at < published.length - 1 ? published[at + 1]! : null,
    breadcrumb: buildBreadcrumb(
      [{ name: s.index, href: DOFUS_INDEX_PATH }],
      { name: guide.name, href: `/${guide.slug}` },
      data.siteUrl,
    ),
  }
}
