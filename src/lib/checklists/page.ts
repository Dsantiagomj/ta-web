// Lo que pinta la página de una checklist (prototipo A): la checklist guardada y lo que
// enlaza, ya listo para los componentes. Sin Payload ni React: se prueba con datos sueltos.
//
// El texto de Torre se copia tal cual, tramo a tramo: solo se enlaza el nombre del logro que
// cita, sin cambiar una letra. Lo que la checklist no guarda no se pinta.
import type { ImageAsset } from '@/components/ui/types'
import { buildBreadcrumb, type BreadcrumbData } from '@/lib/achievements/page'
import { questParents, routePrerequisites } from '@/lib/derive/checklist'
import { questLevel, questPoints, stepWeights } from '@/lib/derive/weights'
import type { RichTextState } from '@/lib/guides/page'
import type { QuestObjectiveKind } from '@/lib/dofusdb/types'
import { mediaImageAsset } from '@/lib/media/image-asset'
import { fold } from '@/lib/text/fold'
import type { Checklist, Media, Quest } from '@/payload-types'

import { openStops } from './open-stops'
import type { SoulsReadData } from './souls'
import { objectiveText, type ObjectiveNames } from './objective-text'
import { populated, relationId, type Relation } from './relations'
import { checklistPageStrings as s, checklistStrings } from './strings'

type Step = NonNullable<Checklist['steps']>[number]
type Segment = NonNullable<Step['segments']>[number]
type Need = NonNullable<Step['needs']>[number]
type PrerequisiteNeed = NonNullable<NonNullable<Checklist['prerequisites']>['needs']>[number]
export type NeedCategory = NonNullable<Need['category']>
export type QuestKind = NonNullable<Step['quests']>[number]['kind']

/** Lo que lee la página: la checklist y los slugs de lo que enlaza (src/lib/checklists/queries.ts). */
export interface ChecklistData {
  checklist: Checklist
  /** El ID de cada misión con guía publicada y el slug de esa guía. */
  questGuides: Record<number, string>
  /** El ID de cada logro con página publicada y el slug de esa página. */
  achievementPages: Record<number, string>
  /** Las misiones donde para un «Detente aquí», con sus etapas. */
  stopQuests: Record<number, { stages?: Quest['stages'] }>
  /** Los nombres de lo que sus objetivos nombran por ID de DofusDB. */
  names: ObjectiveNames
  /** El nivel que da la guía de Torre de cada misión que lo da, por ID de la misión. */
  torreLevels: Record<number, number>
  /** Sus misiones y las que estas piden terminadas, por ID: lo que necesita el progreso. */
  questGraph: Record<number, QuestNode>
  /** Todas las checklists: «Hecha en la checklist del Dofus X». */
  checklists: ChecklistName[]
  siteUrl: string
  /** Solo en una checklist de almas (el Ocre): lo que pinta su página (souls.ts). */
  souls?: SoulsReadData
}

export interface QuestNode {
  dofusId: number
  levelMin: number | null
  startCriterion: string | null
  /** El ID de DofusDB de cada objetivo, en el orden aplanado de sus etapas. */
  objectives: number[]
  /** Lo que pide terminado antes de empezar, por ID de DofusDB. */
  prerequisites: number[]
}

export interface ChecklistName {
  id: number
  name: string
  /** Su id en silvestre-checklist («nebuloso»), si lo tiene. */
  legacyId: string | null
}

export { OBJECTIVE_REFERENCE, objectiveText, type ObjectiveNames } from './objective-text'

/** Un trozo de texto o un enlace dentro de un tramo. */
export type TextPart = string | { text: string; href: string }

export interface SegmentView {
  kind: Segment['kind']
  parts: TextPart[]
}

/** Una línea de Torre dentro de una misión: dónde para (rojo) o lo que la retoma (verde). */
export interface RouteLine {
  at: number
  kind: 'stop' | 'resolve'
  text: string
}

export interface QuestRowView {
  /** Su clave en el progreso (questRowKey): el ID de DofusDB, o en negativo si es genérica. */
  dofusId: number
  name: string
  /** Una fila genérica: cuántas misiones valen. */
  anyOf?: number
  href?: string
  level?: number
  kind: QuestKind
  note?: string
  /** Solo en las misiones donde para el paso: sus objetivos y las líneas de Torre en su sitio. */
  route?: {
    objectives: { kind: QuestObjectiveKind; text: string }[]
    lines: RouteLine[]
    /** Las hijas del mismo paso que empiezan dentro de ella, en el objetivo donde empiezan. */
    kids?: { at: number; names: string[] }[]
  }
}

/** Una opción de una fila de Necesitarás: un objeto del juego o, si no lo es, su texto. */
export type NeedOptionView =
  | { kind: 'item'; key: string; name: string; icon?: ImageAsset; quantity: number }
  | { kind: 'label'; key: string; name: string; quantity: number }

/**
 * Una fila de Necesitarás: su primera opción y las demás («A o B»). `key` es su clave en lo
 * conseguido, como en silvestre-checklist: las claves de sus opciones (el ID de DofusDB del
 * objeto o «x:<texto>») unidas por «|», y «@<apartado>» si va en uno.
 */
export type NeedRowView = NeedOptionView & {
  alternatives?: NeedOptionView[]
  note?: string
  /** Su apartado dentro del grupo («Misión opcional»). */
  group?: string
  /** Se conserva al usarla: en los totales cuenta la mayor cantidad, no la suma. */
  reusable?: true
}

export interface NeedGroupView<Row = NeedRowView> {
  category: NeedCategory | null
  title: string
  rows: Row[]
}

/**
 * Una fila de Objetos: lo que piden los pasos sumado. `steps` son sus números (0: los
 * prerrequisitos) y `prerequisites`, los prerrequisitos que gastan lo de los prerrequisitos: se
 * gasta cuando están todos completos (o, sin ninguno, cuando lo están todos los de la checklist).
 */
export type TotalRowView = NeedRowView & { steps: number[]; prerequisites?: string[] }

export interface StepView {
  stepId: string
  n: number
  label: string
  /** La zona en la que Torre agrupa el paso («Anutropía»). */
  zone?: string
  segments: SegmentView[]
  hasStop: boolean
  hasResolve: boolean
  /** Los números de los pasos que cierra; y el del paso que lo cierra a él. */
  closes: number[]
  closedBy: number | null
  /** Los pasos cuyas misiones avanza sin terminarlas, y los que avanzan las suyas. */
  updates: number[]
  resumedIn: number[]
  icon?: ImageAsset
  banner?: ImageAsset
  figure?: { image?: ImageAsset; name?: string; role?: string }
  quests: QuestRowView[]
  needs: NeedGroupView[]
  bosses: { name: string; image?: ImageAsset }[]
  note: RichTextState | null
  /** El texto entero, sin acentos y en minúsculas, para el buscador de la isla. */
  search: string
}

export type IslandQuest =
  [number, QuestKind] | [number, QuestKind, number] | [number, QuestKind, number, 1]

/**
 * La clave de una fila de misión en el progreso: el ID de DofusDB de su misión o, si es una fila
 * genérica (vale con cualquiera de varias), el de su primera misión en negativo, para no dar por
 * hecha ninguna de ellas en concreto.
 */
export function questRowKey(row: {
  quest: unknown
  label?: string | null
  alternatives?: unknown
}) {
  const quest = populated(row.quest as Relation<Quest>)
  if (!quest) return null
  const generic =
    Boolean(row.label) || (Array.isArray(row.alternatives) && row.alternatives.length > 0)
  return generic ? -quest.dofusId : quest.dofusId
}

/** Lo único que recibe la isla (plan, sección 3): la estructura, nunca los textos. */
export interface ChecklistIslandData {
  checklistId: number
  slug: string
  /** Cuándo cambió la checklist: la isla solo vuelve a empezar con una versión nueva. */
  version: string
  /**
   * [stepId, número antiguo, [[ID de DofusDB de la misión, tipo, objetivo donde la deja a medias?,
   * 1 si la termina un paso posterior?]]]. Solo lleva objetivo lo que el paso deja a medias
   * (src/lib/checklists/open-stops.ts).
   */
  steps: [string, number | null, IslandQuest[]][]
  /** [stepId, stepIds que cierra]: los de sus «aquí se resuelve» y los que cierra sin verde. */
  closes: [string, string[]][]
  /** Las claves de los prerrequisitos: lo de los prerrequisitos se gasta al completarlos. */
  prerequisites: string[]
  /**
   * Las claves de lo conseguido con alternativas o apartado («7045|7047», «…@mision opcional»):
   * la migración solo trae las antiguas que son una de estas.
   */
  compositeKeys: string[]
  /** [stepId, misiones opcionales que termina ese paso (por su ID de DofusDB)]. */
  optionalDoneBy: [string, number[]][]
  /**
   * Las filas genéricas («Misión de clase»): su clave (el ID de su primera misión en negativo)
   * y todas las misiones que valen. La fila queda hecha con cualquiera.
   */
  anyOf: [number, number[]][]
  /** Las misiones que el juego termina solas: [misión, las que terminadas todas la terminan]. */
  completedBy: [number, number[]][]
  legacy: Checklist['legacy']
  /** Por paso, en orden: [su peso, lo que vale en él cada misión] (src/lib/derive/weights.ts). */
  weights: [number, number[]][]
  /** Los objetivos de cada misión, por su ID de DofusDB. */
  objectives: Record<number, number>
  /** Las misiones de la checklist que pide terminadas cada una, también a través de otras. */
  prereqs: Record<number, number[]>
  /** Madre → [[objetivo donde empiezan sus hijas, hijas]], las de un mismo paso. */
  parents: Record<number, [number, number[]][]>
  /** El nombre del Dofus de cada checklist, por su ID y por su id antiguo («nebuloso»). */
  checklists: Record<string, string>
  /** El ID de cada checklist con id antiguo, por ese id: lo que migra el progreso antiguo. */
  legacyIds: Record<string, number>
}

export interface ChecklistView {
  id: number
  slug: string
  name: string
  title: string
  description: string
  egg?: ImageAsset
  color?: string
  breadcrumb: BreadcrumbData
  steps: StepView[]
  prerequisites: {
    intro: string | null
    groups: { title: string; rows: { key: string; text: string }[] }[]
    count: number
    /** Los avisos de Torre (el Dofus Ocre, la orden de alineamiento). */
    notes: { title: string; text: string }[]
    /** Lo que piden, por grupo, cada fila con el prerrequisito que la gasta y su texto. */
    needs: NeedGroupView<NeedRowView & { prerequisite?: string; prerequisiteText?: string }>[]
    /** Si hay algo que enseñar: grupos, avisos u objetos. */
    shown: boolean
  }
  totals: NeedGroupView<TotalRowView>[]
  totalsCount: number
  /** Sin progreso, los pasos de «Tus próximos pasos» en Objetos: los cinco primeros que piden algo. */
  soonSteps: number[]
  island: ChecklistIslandData
}

const SOON_STEPS = 5

const DOFUS_INDEX_PATH = '/guias-dofus'
const CATEGORIES = Object.keys(checklistStrings.needCategories) as NeedCategory[]

const image = (value: Relation<Media>) => mediaImageAsset(populated(value)) ?? undefined

const ACHIEVEMENT_QUOTE = /Logro "([^"]+)"/

/** El nombre del paso en la lista: el logro que cita o su primera frase. */
function stepLabel(text: string): string {
  const quoted = ACHIEVEMENT_QUOTE.exec(text)?.[1]
  if (quoted) return quoted
  return text.split('. ')[0].replace(/\.$/, '').trim()
}

/**
 * Un tramo en trozos: el nombre citado de un logro con página pasa a ser su enlace. Busca
 * siempre la cita que va más a la izquierda, así ninguna se salta por el orden de la lista.
 */
function segmentParts(text: string, links: Map<string, string>): TextPart[] {
  const parts: TextPart[] = []
  let rest = text
  for (;;) {
    let first: { at: number; name: string; href: string } | null = null
    for (const [name, href] of links) {
      const at = rest.indexOf(`"${name}"`)
      if (at >= 0 && (!first || at < first.at)) first = { at, name, href }
    }
    if (!first) break
    parts.push(rest.slice(0, first.at + 1))
    parts.push({ text: first.name, href: first.href })
    rest = rest.slice(first.at + 1 + first.name.length)
  }
  if (rest) parts.push(rest)
  return parts
}

type NeedOption = Pick<Need, 'item' | 'label' | 'quantity'>

/**
 * Una opción de una fila: el objeto del juego o, si no lo es, su texto. Un objeto que ya no
 * existe (borrado de la base) no se pierde: sale como tal, con una clave de su ID guardado,
 * para no cambiar la de las demás opciones. Null solo sin objeto ni texto.
 */
function needOption(option: NeedOption): NeedOptionView | null {
  const item = populated(option.item)
  const stored = relationId(option.item ?? null)
  if (!item?.name && stored !== null) {
    return { kind: 'label', key: `item:${stored}`, name: s.unknownItem, quantity: option.quantity }
  }
  if (item?.name) {
    const icon = image(item.image)
    return {
      kind: 'item',
      key: String(item.dofusId),
      name: item.name,
      ...(icon && { icon }),
      quantity: option.quantity,
    }
  }
  if (option.label) {
    const key = `x:${option.label.toLocaleLowerCase('es')}`
    return { kind: 'label', key, name: option.label, quantity: option.quantity }
  }
  return null
}

/** El apartado en la clave, como `slug` de build_resources.py: sin tildes ni signos, en minúsculas. */
export const groupKey = (group: string) =>
  group
    .replace(/’/g, "'")
    .normalize('NFKD')
    .replace(/[^\x00-\x7f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()

type NeedLike = NeedOption & {
  alternatives?: NeedOption[] | null
  note?: string | null
  group?: string | null
  reusable?: boolean | null
}

function needRow(need: NeedLike): NeedRowView | null {
  const first = needOption(need)
  if (!first) return null
  const alternatives = (need.alternatives ?? []).flatMap((alt) => {
    const option = needOption(alt)
    return option ? [option] : []
  })
  const key =
    [first, ...alternatives].map((option) => option.key).join('|') +
    (need.group ? `@${groupKey(need.group)}` : '')
  return {
    ...first,
    key,
    ...(alternatives.length > 0 && { alternatives }),
    ...(need.note && { note: need.note }),
    ...(need.group && { group: need.group }),
    ...(need.reusable && { reusable: true as const }),
  }
}

/** El prerrequisito de un objeto de los prerrequisitos, si es uno de los que hay. */
const prerequisiteOf = (need: Need | PrerequisiteNeed, known: Set<string>) =>
  'prerequisite' in need && need.prerequisite && known.has(need.prerequisite)
    ? need.prerequisite
    : undefined

/** Las claves de los prerrequisitos de la checklist. */
const prerequisiteKeys = (checklist: Checklist) =>
  (checklist.prerequisites?.groups ?? []).flatMap((group) =>
    (group.rows ?? []).map((row) => row.key),
  )

const categoryTitle = (category: NeedCategory | null) =>
  category ? checklistStrings.needCategories[category] : s.otherNeeds

/**
 * Filas agrupadas por su grupo, en el orden de los grupos; dentro, en el de llegada. Con
 * `byGroup`, cada apartado («Misión opcional») va aparte, tras las filas sin apartado.
 */
function byCategory<Row extends { group?: string }>(
  rows: { category: NeedCategory | null; row: Row }[],
  byGroup = false,
): NeedGroupView<Row>[] {
  const order = [...CATEGORIES, null]
  return order.flatMap((category) => {
    const inGroup = rows.filter((entry) => entry.category === category).map((entry) => entry.row)
    if (!byGroup) {
      return inGroup.length ? [{ category, title: categoryTitle(category), rows: inGroup }] : []
    }
    const groups = [...new Set(inGroup.map((row) => row.group ?? ''))].sort((a, b) =>
      a === '' ? -1 : b === '' ? 1 : 0,
    )
    return groups.map((group) => ({
      category,
      title: group ? `${categoryTitle(category)} · ${group}` : categoryTitle(category),
      rows: inGroup.filter((row) => (row.group ?? '') === group),
    }))
  })
}

/** Las paradas de un tramo «detente aquí»: la suya y sus «más paradas». */
export function segmentStops(segment: Segment) {
  if (segment.kind !== 'stop') return []
  return [segment, ...(segment.more ?? [])]
}

/** Los IDs de las misiones donde para algún paso: las que llevan ruta en la página. */
export const stopQuestIds = (steps: Step[]) =>
  steps.flatMap((step) =>
    (step.segments ?? []).flatMap((segment) =>
      segmentStops(segment).flatMap((point) => {
        const id = relationId(point.quest ?? null)
        return id === null ? [] : [id]
      }),
    ),
  )

/**
 * Las líneas de Torre dentro de las misiones del paso, por misión (questStops de
 * silvestre-checklist). Sin verde, cada parada es dónde parar. Con verde, el rojo es dónde se
 * retoma y la línea es la verde (o su parte, `resumeLine`), salvo que otro paso lo cierre sin
 * que el verde deje parada propia; la parada que deja el verde (un «detente aquí» detrás del
 * «aquí se resuelve») y la que termina un paso posterior siguen en rojo.
 */
function routeLines(step: Step, closed: boolean): Map<number, RouteLine[]> {
  const segments = step.segments ?? []
  const resolveAt = segments.findIndex((segment) => segment.kind === 'resolve')
  const follows = resolveAt >= 0 && segments.some((s, i) => i > resolveAt && s.kind === 'stop')
  const redIsStop = resolveAt < 0 || (closed && !follows)
  const green = resolveAt >= 0 ? segments[resolveAt].text : ''
  const lines = new Map<number, RouteLine[]>()
  segments.forEach((segment, index) => {
    const follow = resolveAt >= 0 && index > resolveAt
    for (const point of segmentStops(segment)) {
      const quest = relationId(point.quest ?? null)
      if (quest === null) continue
      const stop = redIsStop || follow || Boolean(point.later)
      const line: RouteLine = stop
        ? { at: point.stopObjective ?? 0, kind: 'stop', text: point.line || segment.text }
        : { at: point.stopObjective ?? 0, kind: 'resolve', text: point.resumeLine || green }
      lines.set(quest, [...(lines.get(quest) ?? []), line])
    }
  })
  for (const list of lines.values()) list.sort((a, b) => a.at - b.at)
  return lines
}

/** Los pasos que cierra un paso: los de sus «aquí se resuelve» y los que cierra sin verde. */
export const closedSteps = (step: Step) => [
  ...(step.segments ?? []).flatMap((segment) =>
    segment.kind === 'resolve' ? (segment.closes ?? []) : [],
  ),
  ...(step.closes ?? []),
]

function flatObjectives(stages: Quest['stages'], names: ObjectiveNames) {
  return (stages ?? []).flatMap((stage) =>
    (stage.objectives ?? []).map((objective) => ({
      kind: objective.kind,
      text: objectiveText(objective.text, names),
    })),
  )
}

export function checklistView(data: ChecklistData): ChecklistView {
  const { checklist } = data
  const island = islandData(data)
  const rawSteps = checklist.steps ?? []
  const numberOf = new Map(rawSteps.map((step, index) => [step.stepId ?? '', index + 1]))
  const closedBy = new Map<string, number>()
  const resumedIn = new Map<string, number[]>()
  rawSteps.forEach((step, index) => {
    for (const closed of closedSteps(step))
      if (!closedBy.has(closed)) closedBy.set(closed, index + 1)
    for (const updated of step.updates ?? []) {
      resumedIn.set(updated, [...(resumedIn.get(updated) ?? []), index + 1])
    }
  })
  const numbers = (ids: string[]) =>
    ids.flatMap((id) => (numberOf.has(id) ? [numberOf.get(id) as number] : []))

  const steps = rawSteps.map((step, index): StepView => {
    const segments = step.segments ?? []
    const text = segments.map((segment) => segment.text).join(' ')
    // El primer «detente aquí» con misión: uno que solo avisa no para ninguna.
    const stop = segments.find((segment) => segment.kind === 'stop' && segment.quest != null)
    const resolve = segments.find((segment) => segment.kind === 'resolve')
    const lines = routeLines(step, closedBy.has(step.stepId ?? ''))

    // Los logros del paso no tienen sección propia (la quitó Torre, 2026-11-14): solo enlazan
    // su nombre en el texto, si tienen página.
    const links = new Map(
      (step.achievements ?? []).flatMap((row) => {
        const achievement = populated(row.achievement)
        const slug = achievement?.name && data.achievementPages[achievement.id]
        return slug ? [[achievement.name!, `/${slug}`] as const] : []
      }),
    )

    const quests = (step.quests ?? []).flatMap((row): QuestRowView[] => {
      const quest = populated(row.quest)
      if (!quest) return []
      const slug = data.questGuides[quest.id]
      const questLines = lines.get(quest.id) ?? []
      const objectives = questLines.length
        ? flatObjectives(data.stopQuests[quest.id]?.stages, data.names)
        : []
      const kids = (island.parents[questRowKey(row) ?? quest.dofusId] ?? []).flatMap(
        ([at, ids]) => {
          const names = ids.flatMap((id) => {
            const kid = (step.quests ?? []).find((other) => questRowKey(other) === id)
            const kidQuest = populated(kid?.quest)
            return kidQuest && kid?.kind !== 'take' ? [kidQuest.name] : []
          })
          return names.length ? [{ at, names }] : []
        },
      )
      const key = questRowKey(row) ?? quest.dofusId
      const generic = key < 0
      return [
        {
          dofusId: key,
          name: row.label || quest.name,
          // Con nombre pero sin más misiones, no hay «cualquiera» que decir.
          ...(generic && row.alternatives?.length && { anyOf: 1 + row.alternatives.length }),
          // La guía de su primera misión no es la de todas: una fila genérica no la enlaza.
          ...(slug && !generic && { href: `/${slug}` }),
          ...(quest.levelMin != null && { level: quest.levelMin }),
          kind: row.kind,
          ...(row.note && { note: row.note }),
          ...(objectives.length > 0 && {
            route: { objectives, lines: questLines, ...(kids.length > 0 && { kids }) },
          }),
        },
      ]
    })

    const needs = byCategory(
      (step.needs ?? []).flatMap((need) => {
        const row = needRow(need)
        return row ? [{ category: need.category ?? null, row }] : []
      }),
      true,
    )

    const figure = step.figure
    const npc = populated(figure?.npc)
    const figureImage = image(npc ? npc.renderRight : figure?.image)
    const figureName = npc?.name ?? populated(figure?.image)?.alt ?? undefined
    const icon = image(step.icon)
    const banner = image(step.banner)
    const n = index + 1

    return {
      stepId: step.stepId ?? '',
      n,
      label: stepLabel(text),
      ...(step.zone && { zone: step.zone }),
      segments: segments.map((segment) => ({
        kind: segment.kind,
        parts: segment.kind === 'plain' ? segmentParts(segment.text, links) : [segment.text],
      })),
      hasStop: Boolean(stop),
      hasResolve: Boolean(resolve),
      closes: numbers(closedSteps(step)),
      closedBy: closedBy.get(step.stepId ?? '') ?? null,
      updates: numbers(step.updates ?? []),
      resumedIn: resumedIn.get(step.stepId ?? '') ?? [],
      ...(icon && { icon }),
      ...(banner && { banner }),
      ...((figureImage || figureName) && {
        figure: {
          ...(figureImage && { image: figureImage }),
          ...(figureName && { name: figureName }),
          ...(figure?.role && { role: figure.role }),
        },
      }),
      quests,
      needs,
      bosses: (step.bosses ?? []).flatMap((boss) => {
        const monster = populated(boss)
        if (!monster) return []
        const picture = image(monster.image)
        return [{ name: monster.name, ...(picture && { image: picture }) }]
      }),
      note: (step.note as RichTextState | null | undefined) ?? null,
      search: fold([n, step.zone ?? '', text].join(' ')),
    }
  })

  const totals = byCategory(
    totalRows(rawSteps, checklist.prerequisites?.needs ?? [], new Set(prerequisiteKeys(checklist))),
  )

  const guide = populated(checklist.dofusGuide)
  const publishedGuide = guide?.state === 'published' ? guide : null
  const egg = image(populated(guide?.dofus)?.image)
  const groups = (checklist.prerequisites?.groups ?? []).flatMap((group) => {
    const rows = (group.rows ?? []).map(({ key, text }) => ({ key, text }))
    return rows.length ? [{ title: group.title ?? '', rows }] : []
  })
  const title = s.title(checklist.name)
  const prerequisiteNotes = (checklist.prerequisites?.notes ?? []).map(({ title, text }) => ({
    title: title ?? '',
    text,
  }))
  const prerequisiteTexts = new Map(
    groups.flatMap((group) => group.rows.map((row) => [row.key, row.text] as const)),
  )
  const prerequisiteNeeds = byCategory(
    (checklist.prerequisites?.needs ?? []).flatMap((need) => {
      const row = needRow(need)
      if (!row) return []
      const key = prerequisiteOf(need, new Set(prerequisiteTexts.keys()))
      const text = key ? prerequisiteTexts.get(key) : undefined
      const prerequisite = key ? { prerequisite: key, ...(text && { prerequisiteText: text }) } : {}
      return [{ category: need.category ?? null, row: { ...row, ...prerequisite } }]
    }),
    true,
  )

  return {
    id: checklist.id,
    slug: checklist.slug,
    name: checklist.name,
    title,
    description: checklist.description || s.lead,
    ...(egg && { egg }),
    ...(guide?.color && { color: guide.color }),
    breadcrumb: buildBreadcrumb(
      [
        { name: s.index, href: DOFUS_INDEX_PATH },
        ...(publishedGuide ? [{ name: publishedGuide.name, href: `/${publishedGuide.slug}` }] : []),
      ],
      { name: title, href: `/${checklist.slug}` },
      data.siteUrl,
    ),
    steps,
    prerequisites: {
      intro: checklist.prerequisites?.intro ?? null,
      groups,
      count: groups.reduce((sum, group) => sum + group.rows.length, 0),
      notes: prerequisiteNotes,
      needs: prerequisiteNeeds,
      shown: groups.length > 0 || prerequisiteNotes.length > 0 || prerequisiteNeeds.length > 0,
    },
    totals,
    totalsCount: totals.reduce((sum, group) => sum + group.rows.length, 0),
    soonSteps: soonSteps(totals),
    island,
  }
}

/**
 * Sin progreso, los pasos de «Tus próximos pasos»: los prerrequisitos (el 0) si piden algo y los
 * cinco primeros pasos que piden algo.
 */
function soonSteps(totals: NeedGroupView<TotalRowView>[]) {
  const all = new Set(totals.flatMap((group) => group.rows.flatMap((row) => row.steps)))
  const steps = [...all].filter((n) => n > 0).sort((a, b) => a - b)
  return [...(all.has(0) ? [0] : []), ...steps.slice(0, SOON_STEPS)]
}

/** Lo que piden los prerrequisitos y todos los pasos, sumado por objeto (o por texto) y grupo. */
function totalRows(steps: Step[], prerequisiteNeeds: PrerequisiteNeed[], known: Set<string>) {
  const rows = new Map<
    string,
    { category: NeedCategory | null; row: TotalRowView; parts: number[][] }
  >()
  // Los prerrequisitos van como el paso 0, como en silvestre-checklist.
  const lists: (Need | PrerequisiteNeed)[][] = [
    prerequisiteNeeds,
    ...steps.map((step) => step.needs ?? []),
  ]
  lists.forEach((needs, n) => {
    for (const need of needs) {
      if (need.countsInTotal === false) continue
      const row = needRow(need)
      if (!row) continue
      // Una fila por objeto (o por texto), con la clave de lo conseguido: la misma que su
      // casilla, aunque cambie de grupo o de mayúsculas entre pasos. Va en el grupo del primero.
      const key = row.key
      const seen = rows.get(key)
      const quantities = [row, ...(row.alternatives ?? [])].map((option) => option.quantity)
      if (seen) {
        seen.parts.push(quantities)
        if (row.reusable) seen.row.reusable = true
        if (!seen.row.steps.includes(n)) seen.row.steps.push(n)
        const pre = prerequisiteOf(need, known)
        if (pre && !seen.row.prerequisites?.includes(pre)) {
          seen.row.prerequisites = [...(seen.row.prerequisites ?? []), pre]
        }
      } else {
        const { note: _note, ...rest } = row
        const pre = prerequisiteOf(need, known)
        const prerequisite = pre ? { prerequisites: [pre] } : {}
        rows.set(key, {
          category: need.category ?? null,
          row: { ...rest, steps: [n], ...prerequisite },
          parts: [quantities],
        })
      }
    }
  })
  // Lo que se conserva tras usarlo (si lo dice cualquiera de sus filas) cuenta la mayor
  // cantidad de cada opción; lo demás, la suma. No depende del orden de los pasos.
  return [...rows.values()].map(({ category, row, parts }) => {
    const total = (at: number) => {
      const amounts = parts.map((part) => part[at] ?? 0)
      return row.reusable ? Math.max(...amounts) : amounts.reduce((sum, n) => sum + n, 0)
    }
    return {
      category,
      row: {
        ...row,
        quantity: total(0),
        ...(row.alternatives && {
          alternatives: row.alternatives.map((alt, at) => ({ ...alt, quantity: total(at + 1) })),
        }),
      },
    }
  })
}

/** Lo que recibe la isla de la checklist; el índice /checklists saca de ello su porcentaje. */
export function islandData(data: ChecklistData): ChecklistIslandData {
  const { checklist, questGraph, torreLevels } = data
  const steps = checklist.steps ?? []
  const closedIds = new Set(steps.flatMap(closedSteps))
  const islandSteps = steps.map((step): ChecklistIslandData['steps'][number] => {
    const open = openStops(step.segments ?? [], closedIds.has(step.stepId ?? ''))
    return [
      step.stepId ?? '',
      step.legacyNumber ?? null,
      (step.quests ?? []).flatMap((row): IslandQuest[] => {
        const quest = populated(row.quest)
        const key = questRowKey(row)
        if (!quest || key === null) return []
        const stop = open.get(quest.id)
        if (!stop) return [[key, row.kind]]
        return [stop.later ? [key, row.kind, stop.at, 1] : [key, row.kind, stop.at]]
      }),
    ]
  })
  // Las misiones opcionales que termina otro paso, por el paso que las termina.
  const optionalDoneBy = new Map<string, number[]>()
  for (const step of steps) {
    for (const row of step.quests ?? []) {
      const quest = populated(row.quest)
      if (!quest || row.kind !== 'optional' || !row.optionalDoneBy) continue
      optionalDoneBy.set(row.optionalDoneBy, [
        ...(optionalDoneBy.get(row.optionalDoneBy) ?? []),
        questRowKey(row) ?? quest.dofusId,
      ])
    }
  }

  // Lo que el progreso necesita de cada misión, por su ID de DofusDB.
  const byDofusId = new Map<number, QuestNode & { level: number }>()
  const anyOf = new Map<number, number[]>()
  for (const step of steps) {
    for (const row of step.quests ?? []) {
      const quest = populated(row.quest)
      const key = questRowKey(row)
      if (!quest || key === null || byDofusId.has(key)) continue
      const node = questGraph[quest.id]
      if (key < 0) {
        // Una fila genérica pesa como la más fácil de sus misiones, con los objetivos de la
        // primera; no pide ni es madre de nada.
        const others = (row.alternatives ?? []).flatMap((alt) => {
          const found = populated(alt as Relation<Quest>)
          return found ? [found] : []
        })
        anyOf.set(key, [quest.dofusId, ...others.map((other) => other.dofusId)])
        const levels = [quest, ...others].flatMap((q) => (q.levelMin == null ? [] : [q.levelMin]))
        const levelMin = levels.length ? Math.min(...levels) : null
        byDofusId.set(key, {
          dofusId: key,
          levelMin,
          startCriterion: null,
          objectives: node?.objectives ?? [],
          prerequisites: [],
          level: questLevel(undefined, levelMin),
        })
        continue
      }
      const levelMin = node?.levelMin ?? quest.levelMin ?? null
      byDofusId.set(key, {
        dofusId: key,
        levelMin,
        startCriterion: node?.startCriterion ?? null,
        objectives: node?.objectives ?? [],
        prerequisites: node?.prerequisites ?? [],
        level: questLevel(torreLevels[quest.id], levelMin),
      })
    }
  }
  const weightedSteps = islandSteps.map(([, , quests]) => ({
    quests: quests.map(([id, kind]) => [id, kind] as const),
  }))
  const points = Object.fromEntries(
    [...byDofusId].map(([id, node]) => [id, questPoints(node.level, node.objectives.length)]),
  )
  // Lo que piden las misiones de la ruta se sigue también a través de las de fuera.
  const direct = Object.fromEntries(
    Object.values(questGraph).map((node) => [node.dofusId, node.prerequisites]),
  )

  return {
    checklistId: checklist.id,
    slug: checklist.slug,
    version: checklist.updatedAt,
    steps: islandSteps,
    closes: steps.flatMap((step): [string, string[]][] => {
      const resolves = (step.segments ?? []).some((segment) => segment.kind === 'resolve')
      const closes = closedSteps(step)
      return resolves || closes.length ? [[step.stepId ?? '', closes]] : []
    }),
    optionalDoneBy: [...optionalDoneBy],
    prerequisites: prerequisiteKeys(checklist),
    compositeKeys: [
      ...new Set(
        [
          ...steps.flatMap((step) => step.needs ?? []),
          ...(checklist.prerequisites?.needs ?? []),
        ].flatMap((need) => {
          const row = needRow(need)
          return row && /[|@]/.test(row.key) ? [row.key] : []
        }),
      ),
    ],
    anyOf: [...anyOf],
    completedBy: (checklist.completedBy ?? []).flatMap((row): [number, number[]][] => {
      const quest = populated(row.quest)
      const by = (row.by ?? []).flatMap((id) => {
        const found = populated(id as Relation<Quest>)
        return found ? [found.dofusId] : []
      })
      // Sin todas las que la terminan, terminarla sola sería adelantarse: la fila no va.
      return quest && by.length && by.length === (row.by ?? []).length ? [[quest.dofusId, by]] : []
    }),
    legacy: checklist.legacy,
    weights: stepWeights(weightedSteps, points).map(({ w, shares }) => [w, shares]),
    objectives: Object.fromEntries(
      [...byDofusId].map(([id, node]) => [id, node.objectives.length]),
    ),
    prereqs: routePrerequisites([...byDofusId.keys()], direct),
    parents: questParents(weightedSteps, Object.fromEntries(byDofusId)),
    checklists: Object.fromEntries(
      data.checklists.flatMap(({ id, name, legacyId }) => [
        [String(id), name],
        ...(legacyId ? [[legacyId, name]] : []),
      ]),
    ),
    legacyIds: Object.fromEntries(
      data.checklists.flatMap(({ id, legacyId }) => (legacyId ? [[legacyId, id]] : [])),
    ),
  }
}

export type ChecklistRoute = { kind: 'page' } | { kind: 'legacy'; href: string } | { kind: 'none' }

/**
 * Qué hace /<slug> con una checklist: la Publicada tiene página; la En preparación no
 * (como una guía de Dofus En preparación) y lleva a la de Squarespace, salvo que ese enlace
 * sea esta misma web, que daría vueltas sin fin. La vista previa del panel siempre la pinta.
 */
export function checklistRoute(
  checklist: Pick<Checklist, 'state' | 'legacyHref'>,
  preview: boolean,
  siteUrl: string,
): ChecklistRoute {
  if (preview || checklist.state === 'published') return { kind: 'page' }
  const href = checklist.legacyHref
  if (!href) return { kind: 'none' }
  try {
    if (new URL(href).origin === new URL(siteUrl).origin) return { kind: 'none' }
  } catch {
    return { kind: 'none' }
  }
  return { kind: 'legacy', href }
}
