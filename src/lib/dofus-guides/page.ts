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
import { isDungeonNote, needKey, needNote } from '@/lib/guides/need-notes'
import { youtubeId } from '@/lib/guides/video'
import { mediaImageAsset } from '@/lib/media/image-asset'
import { LEGACY_SITE_ORIGIN } from '@/lib/site/legacy'
import type { Media } from '@/payload-types'

import { siteOrWebHref } from './links'
import { isNeedGroup, NEED_GROUPS, type NeedGroup, needGroupLabel } from './need-groups'
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

/** Una misión de la lista de un logro, como la escribe Torre: su texto y las guías que enlaza. */
export interface QuestRowDoc {
  title: string
  guides?: Relation<{ id: number }>[] | null
  note?: string | null
}

/**
 * Un logro de las partes. Con pageQuests en false, sus misiones son las de Torre (ownQuests),
 * aunque no haya ninguna; si no, las de su página de logro. link es el enlace de Torre al
 * logro: lleva a su web mientras la página del logro está En preparación.
 */
export interface AchievementRefDoc {
  achievement: Relation<{ id: number }>
  note?: string | null
  link?: string | null
  pageQuests?: boolean | null
  ownQuests?: QuestRowDoc[] | null
}

/** Una fila de una lista de misiones: una guía, o lo que Torre enlaza que no es una misión. */
export interface LooseQuestDoc {
  guide?: Relation<{ id: number }>
  /** El texto de Torre; sin él, el título de la guía. */
  title?: string | null
  /** Un enlace que no es una guía de misión («Logro: Cazadores cazados»). */
  link?: string | null
  note?: string | null
}

export type PartDoc =
  | ({ blockType: 'dofusAchievement' } & AchievementRefDoc)
  | { blockType: 'dofusMetalogro'; name: string; achievements?: AchievementRefDoc[] | null }
  | { blockType: 'dofusQuests'; title?: string | null; quests?: LooseQuestDoc[] | null }
  | {
      blockType: 'dofusQuest'
      guide: Relation<{ id: number }>
      title?: string | null
      note?: string | null
    }
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
    note?: string | null
    groups?: { name?: string | null; subtitle?: string | null; rows?: NeedRowDoc[] | null }[] | null
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

/** Un grupo de Necesitarás en la página: su nombre y sus partes (cada subtítulo y sus filas). */
export interface NeedGroupView {
  /** El grupo de la lista fija, o null en una guía migrada sin ordenar. */
  key: string | null
  name?: string
  parts: { subtitle?: string; rows: NeedRowView[] }[]
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
  /**
   * La imagen del jefe de la mazmorra que nombra cada nota que va como mazmorra, por su
   * clave (needKey): solo las casadas cuyo jefe tiene imagen (readDungeonBosses).
   */
  dungeonBosses: Map<string, MediaRef>
  /** La checklist de este Dofus publicada en la web, si la hay: la tarjeta lleva a ella. */
  checklist?: { slug: string }
  siteUrl: string
}

/**
 * Una fila de Necesitarás. Una nota que va como mazmorra (dungeon) lleva en su hueco el jefe
 * de la mazmorra que nombra (boss) o, si no nombra una sola, el icono de mazmorra.
 */
export type NeedRowView =
  | { kind: 'item'; item: GameItem; quantity: number; note?: string }
  | { kind: 'note'; text: RichTextState; dungeon?: true; boss?: ImageAsset }

export interface AchievementPartView {
  name: string
  href?: string
  disabled: boolean
  icon?: ImageAsset
  meta: string[]
  note?: string
  quests: DofusQuestCard[]
}

/**
 * Una fila de una lista de misiones. links parte el texto de Torre cuando enlaza varias
 * guías («La fatalidad - El destino - La rivalidad»); kind 'link' es lo que Torre enlaza que no
 * es una misión: sin número ni «Sin guía todavía».
 */
export type DofusQuestCard = QuestCard & {
  note?: string
  links?: { text: string; href?: string }[]
  kind?: 'link'
}

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
  needs: {
    title: string
    /** La nota de Torre sobre todo Necesitarás, encima de los grupos. */
    note?: string
    groups: NeedGroupView[]
  } | null
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

/** Torre escribió la lista de misiones del logro: salen las suyas, aunque no haya ninguna. */
export const hasOwnQuests = (ref: Pick<AchievementRefDoc, 'pageQuests'>) => ref.pageQuests === false

/** Una fila suelta que no es una misión, sino algo que Torre enlaza («Logro: …»). */
const isLinkRow = (row: LooseQuestDoc) =>
  relationId(row.guide ?? null) === null && Boolean(row.link)

/**
 * Los logros y las misiones de unas partes, para las cifras de la lista: un logro cuenta si
 * questsOf lo conoce (el visitante lo ve), con las misiones de Torre si las escribió o las de
 * su página; una guía de misión suelta, si guideVisible lo dice, y una fila de Torre sin guía
 * también, porque se pinta. Lo que no es una misión no cuenta.
 */
export function countParts(
  parts: readonly PartDoc[],
  questsOf: (achievementId: number) => number | null,
  guideVisible: (guideId: number) => boolean = () => true,
): { achievements: number; quests: number } {
  let achievements = 0
  let quests = 0
  const addAchievement = (ref: AchievementRefDoc) => {
    const id = relationId(ref.achievement)
    const count = id === null ? null : questsOf(id)
    if (count === null) return
    achievements += 1
    quests += hasOwnQuests(ref) ? (ref.ownQuests ?? []).length : count
  }
  const addQuest = (guide: Relation<{ id: number }>, title?: string | null) => {
    const id = relationId(guide ?? null)
    if ((id !== null && guideVisible(id)) || title?.trim()) quests += 1
  }
  for (const part of parts) {
    if (part.blockType === 'dofusAchievement') addAchievement(part)
    else if (part.blockType === 'dofusMetalogro') {
      for (const row of part.achievements ?? []) addAchievement(row)
    } else if (part.blockType === 'dofusQuests') {
      for (const row of part.quests ?? []) if (!isLinkRow(row)) addQuest(row.guide, row.title)
    } else if (part.blockType === 'dofusQuest') addQuest(part.guide, part.title)
  }
  return { achievements, quests }
}

/** El texto de una nota de Torre, con sus párrafos seguidos. */
function plainText(node: unknown): string {
  if (!node || typeof node !== 'object') return ''
  const { text, children } = node as { text?: unknown; children?: unknown }
  if (typeof text === 'string') return text
  return Array.isArray(children)
    ? children
        .map(plainText)
        .filter((part) => part.trim())
        .join(' ')
    : ''
}

/** Lo que dice una nota sin cantidad ni punto final («Mazmorra Wey Wabbit»). */
const noteLabel = (text: RichTextState) => needNote(plainText(text?.root).trim()).label

/**
 * Si una nota va como mazmorra: todas las del grupo Mazmorras, que Torre (o la importación,
 * con datos) puso ahí, y en Combates, como en «Necesitarás en total» de las páginas de logro,
 * las que dicen «mazmorra». En los demás grupos una nota sale tal cual.
 */
function isDungeonRow(group: string | null | undefined, label: string): boolean {
  if (!label) return false
  return group === 'mazmorras' || (group === 'combates' && isDungeonNote(label))
}

/**
 * Las notas de Necesitarás que van como mazmorra, sin cantidad y una vez cada una: con ellas
 * se buscan los jefes (readDungeonBosses).
 */
export function dungeonNoteLabels(guide: Pick<DofusGuideDoc, 'needs'>): string[] {
  const labels = (guide.needs?.groups ?? []).flatMap((group) =>
    (group.rows ?? []).flatMap((row) => {
      if (row.blockType !== 'needNote') return []
      const label = noteLabel(row.text)
      return isDungeonRow(group.name, label) ? [label] : []
    }),
  )
  return [...new Set(labels)]
}

function needRows(
  rows: NeedRowDoc[],
  group: string | null | undefined,
  bosses: DofusGuideData['dungeonBosses'],
): NeedRowView[] {
  return rows.flatMap((row): NeedRowView[] => {
    if (row.blockType === 'needNote') {
      const label = noteLabel(row.text)
      if (!isDungeonRow(group, label)) return [{ kind: 'note', text: row.text }]
      // El texto de Torre no cambia: el jefe va en el hueco, al lado.
      const boss = image(bosses.get(needKey(label)))
      return [{ kind: 'note', text: row.text, dungeon: true, ...(boss && { boss }) }]
    }
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

/** Sin mayúsculas, tildes ni «:» final: para ver si un subtítulo solo repite el grupo. */
const plainKey = (text: string) =>
  text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLocaleLowerCase('es')
    .replace(/[:.\s]+$/u, '')
    .trim()

/**
 * El subtítulo de Torre como sale en la página («1 × Mazmorra:»), o nada si solo repite el
 * nombre del grupo («Combates» bajo Combates).
 */
function subtitleView(subtitle: string | null | undefined, label: string | undefined) {
  const text = subtitle?.trim()
  if (!text) return undefined
  if (label && [plainKey(label), plainKey(label).replace(/s$/u, '')].includes(plainKey(text))) {
    return undefined
  }
  const shown = text.replace(/^(\d[\d\s]*?)\s*x\s+/iu, '$1 × ').replace(/[:.\s]+$/u, '')
  return `${shown}:`
}

/**
 * Necesitarás por grupos. Con todos los grupos en la lista fija (need-groups.ts), en su orden
 * y con su nombre en español: los grupos iguales salen juntos, cada uno con su subtítulo de
 * Torre encima de sus filas, y «Otros» solo va sin título. Si alguno no tiene grupo (una guía
 * migrada que la importación aún no ordenó), todo queda en el orden guardado, sin mover filas.
 */
function needsView(
  guide: DofusGuideDoc,
  bosses: DofusGuideData['dungeonBosses'],
): DofusGuideView['needs'] {
  // Un título de Torre sin filas («1 x Mazmorra:» sobre «Dependiendo de tu nivel:») se queda,
  // encima de las de su grupo; sin nada debajo en todo el grupo, no sale.
  const stored = (guide.needs?.groups ?? []).flatMap((group) => {
    const rows = needRows(group.rows ?? [], group.name, bosses)
    return rows.length || group.subtitle?.trim() ? [{ ...group, rows }] : []
  })
  const legacy = stored.some((group) => !isNeedGroup(group.name))
  const groups: NeedGroupView[] = []
  for (const group of stored) {
    const name = isNeedGroup(group.name) ? needGroupLabel(group.name) : undefined
    const subtitle = subtitleView(group.subtitle, name)
    const part = { ...(subtitle && { subtitle }), rows: group.rows }
    const same = legacy ? undefined : groups.find((known) => known.key === group.name)
    if (!same) {
      groups.push({ key: group.name ?? null, ...(name && { name }), parts: [part] })
      continue
    }
    const last = same.parts.at(-1)!
    // Las filas sueltas de un mismo grupo van juntas.
    if (!part.subtitle && !last.subtitle) last.rows.push(...part.rows)
    else same.parts.push(part)
  }
  const shown = groups.filter((group) => group.parts.some((part) => part.rows.length > 0))
  groups.splice(0, groups.length, ...shown)
  if (groups.length === 0) return null
  if (!legacy) {
    groups.sort(
      (a, b) => NEED_GROUPS.indexOf(a.key as NeedGroup) - NEED_GROUPS.indexOf(b.key as NeedGroup),
    )
    // «Otros» solo dice algo junto a otros grupos: solo y sin subtítulos, va sin título.
    const [only] = groups
    if (groups.length === 1 && only!.key === 'otros' && !only!.parts.some((p) => p.subtitle)) {
      delete only!.name
    }
  }
  const note = guide.needs?.note?.trim()
  return { title: guide.needs?.title || s.needs, ...(note && { note }), groups }
}

/** El PNJ que da una misión y su nivel, de la misión de una guía. */
function questFacts(data: DofusGuideData, quest: QuestGuideDoc['quest'] | undefined) {
  const npcId = quest?.startPositions?.find((start) => start.npcId != null)?.npcId
  const giver = npcId != null ? image(data.givers.get(npcId)?.renderRight) : undefined
  const level = quest?.levelMin && quest.levelMin > 0 ? quest.levelMin : undefined
  return { ...(level && { level }), ...(giver && { giver }) }
}

const visibleGuide = (data: DofusGuideData, ref: Relation<{ id: number }>) => {
  const id = relationId(ref ?? null)
  return id === null ? undefined : data.questGuides.get(id)
}

/**
 * Una misión de una parte como tarjeta: su PNJ, su nivel y su título enlazado a su guía. El
 * título es el texto de Torre si lo hay. Sin guía visible, con texto de Torre, sale sin enlace
 * («Sin guía todavía»); sin nada, no sale.
 */
function guideCard(
  data: DofusGuideData,
  guideRef: Relation<{ id: number }>,
  position: number,
  extra: { title?: string | null; note?: string | null } = {},
): DofusQuestCard | null {
  const guide = visibleGuide(data, guideRef)
  const title = extra.title?.trim() || guide?.title
  if (!title) return null
  return {
    position,
    title,
    ...(guide && { href: `/${guide.slug}`, ...questFacts(data, guide.quest) }),
    ...(extra.note && { note: extra.note }),
  }
}

/** Los separadores con los que Torre junta varias misiones en una fila: « - », « o », « / ». */
const ALTERNATIVES = /(\s+[-–—/]\s+|\s+o\s+)/u

/**
 * Una fila de la lista de un logro de Torre. Con una guía, como cualquier misión; con varias
 * («La fatalidad - El destino - La rivalidad»), cada trozo del texto enlaza la suya, el nivel
 * es el más bajo y no hay PNJ. Si los trozos no casan con las guías, el texto entero enlaza
 * la primera.
 */
function torreRowCard(data: DofusGuideData, row: QuestRowDoc, position: number): DofusQuestCard {
  const guides = (row.guides ?? []).flatMap((ref) => visibleGuide(data, ref) ?? [])
  const title = row.title.trim()
  const note = row.note ? { note: row.note } : {}
  if (guides.length <= 1) {
    return guideCard(data, guides[0]?.id ?? null, position, { title, ...note })!
  }
  const levels = guides.flatMap((guide) => questFacts(data, guide.quest).level ?? [])
  const level = levels.length ? Math.min(...levels) : undefined
  const pieces = title.split(ALTERNATIVES)
  const texts = pieces.filter((_, index) => index % 2 === 0)
  const card = { position, title, ...(level && { level }), ...note }
  if (texts.length !== guides.length) return { ...card, href: `/${guides[0]!.slug}` }
  const links = pieces.map((text, index) =>
    index % 2 === 0 ? { text, href: `/${guides[index / 2]!.slug}` } : { text },
  )
  return { ...card, links }
}

/** Lo que Torre enlaza en una lista de misiones que no es una misión. */
function linkCard(row: LooseQuestDoc, position: number): DofusQuestCard {
  const href = siteOrWebHref(row.link)
  return {
    kind: 'link',
    position,
    title: row.title?.trim() || row.link!,
    ...(href && { href }),
    ...(row.note && { note: row.note }),
  }
}

function achievementPart(data: DofusGuideData, ref: AchievementRefDoc): AchievementPartView | null {
  const id = relationId(ref.achievement)
  const page = id === null ? undefined : data.achievements.get(id)
  if (!page) return null
  const quests = hasOwnQuests(ref)
    ? (ref.ownQuests ?? []).map((row, index) => torreRowCard(data, row, index + 1))
    : questCards(questRows(page), data.guideByQuest, data.givers)
  const levels = cardLevels(quests)
  const disabled = page.state !== 'published'
  const icon = image(populated(page.achievement)?.icon)
  const points = page.points && page.points > 0 ? page.points : undefined
  // En preparación no tiene página: el enlace de Torre lleva a la suya, en su web.
  const link = ref.link?.trim()
  const href = !disabled
    ? `/${page.slug}`
    : link?.startsWith('/') && !link.startsWith('//')
      ? `${LEGACY_SITE_ORIGIN}${link}`
      : undefined
  return {
    name: page.name,
    ...(href && { href }),
    disabled,
    ...(icon && { icon }),
    meta: [
      ...(quests.length > 0 ? [s.quests(quests.length)] : []),
      ...(levels ? [levels] : []),
      ...(points ? [s.points(points)] : []),
    ],
    ...(ref.note && { note: ref.note }),
    quests,
  }
}

function partsView(data: DofusGuideData): PartView[] {
  let metalogros = 0
  return (data.guide.parts ?? []).flatMap((part): PartView[] => {
    switch (part.blockType) {
      case 'dofusAchievement': {
        const achievement = achievementPart(data, part)
        return achievement ? [{ kind: 'achievement', achievement }] : []
      }
      case 'dofusMetalogro': {
        const achievements = (part.achievements ?? []).flatMap((row) => {
          const view = achievementPart(data, row)
          return view ? [view] : []
        })
        if (achievements.length === 0) return []
        metalogros += 1
        return [{ kind: 'metalogro', number: metalogros, name: part.name, achievements }]
      }
      case 'dofusQuests': {
        // Las misiones van numeradas; lo que Torre enlaza que no es una misión, sin número.
        let position = 0
        const quests = (part.quests ?? []).flatMap((row) => {
          if (isLinkRow(row)) return [linkCard(row, position)]
          const card = guideCard(data, row.guide ?? null, position + 1, row)
          if (card) position += 1
          return card ? [card] : []
        })
        if (quests.length === 0) return []
        return [{ kind: 'quests', ...(part.title && { title: part.title }), quests }]
      }
      case 'dofusQuest': {
        const quest = guideCard(data, part.guide, 1, part)
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
          total +
          (part.kind === 'quests'
            ? part.quests.filter((quest) => quest.kind !== 'link').length
            : part.kind === 'quest'
              ? 1
              : 0),
        0,
      ),
  }
  const list = data.list.map((doc) => listItem(doc, guide.id))
  const published = list.filter((item) => item.current || !item.disabled)
  const at = published.findIndex((item) => item.current)
  const videoId = guide.video ? youtubeId(guide.video) : null
  const poster = image(guide.videoPoster)
  const egg = image(populated(guide.dofus)?.image)
  // La checklist de la web si está publicada; si no (En preparación), la de Squarespace.
  const checklistHref = data.checklist ? `/${data.checklist.slug}` : guide.checklist?.url
  const checklist =
    guide.checklist?.name && checklistHref
      ? { name: guide.checklist.name, href: checklistHref }
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
    needs: needsView(guide, data.dungeonBosses),
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
