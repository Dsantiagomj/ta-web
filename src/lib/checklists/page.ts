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

import { populated, relationId, type Relation } from './relations'
import { checklistPageStrings as s, checklistStrings } from './strings'

type Step = NonNullable<Checklist['steps']>[number]
type Segment = NonNullable<Step['segments']>[number]
type Need = NonNullable<Step['needs']>[number]
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

/** Por ID de DofusDB: los PNJ, objetos y monstruos que los objetivos nombran como {npc,123}. */
export interface ObjectiveNames {
  npc: Record<number, string>
  item: Record<number, string>
  monster: Record<number, string>
}

export const OBJECTIVE_REFERENCE = /\{(npc|item|monster),(\d+)\}/g

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
  dofusId: number
  name: string
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

export type TotalRowView = NeedRowView & { steps: number[] }

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
  achievements: {
    name: string
    href?: string
    icon?: ImageAsset
    some: boolean
    /** «Hasta la misión N»: la última misión del logro que se hace en el paso. */
    upto?: number
  }[]
  quests: QuestRowView[]
  needs: NeedGroupView[]
  bosses: { name: string; image?: ImageAsset }[]
  note: RichTextState | null
  /** El texto entero, sin acentos y en minúsculas, para el buscador de la isla. */
  search: string
}

/** Lo único que recibe la isla (plan, sección 3): la estructura, nunca los textos. */
export interface ChecklistIslandData {
  checklistId: number
  slug: string
  /** Cuándo cambió la checklist: la isla solo vuelve a empezar con una versión nueva. */
  version: string
  /** [stepId, número antiguo, [[ID de DofusDB de la misión, tipo, objetivo de parada?]]] */
  steps: [string, number | null, ([number, QuestKind] | [number, QuestKind, number])[]][]
  /** [stepId, stepIds que cierra] */
  closes: [string, string[]][]
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
    /** Lo que piden, por grupo, cada fila con el prerrequisito que la gasta. */
    needs: NeedGroupView<NeedRowView & { prerequisite?: string }>[]
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

/**
 * El texto de un objetivo de DofusDB sin sus marcas: «{map,1::Banco real}» es «Banco real»
 * y «{npc,2351}» el nombre de ese PNJ; si no lo tenemos, «un PNJ».
 */
export function objectiveText(
  text: string | null | undefined,
  names: ObjectiveNames = { npc: {}, item: {}, monster: {} },
): string {
  return (text ?? '')
    .replace(/\{[a-zA-Z]+,[^{}]*?::([^{}]*)\}/g, '$1')
    .replace(
      OBJECTIVE_REFERENCE,
      (_, kind: keyof ObjectiveNames, id: string) => names[kind][Number(id)] ?? s.unnamed[kind],
    )
    .trim()
}

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

/** Una opción de una fila: el objeto del juego o, si no lo es, su texto; null sin ninguno. */
function needOption(option: NeedOption): NeedOptionView | null {
  const item = populated(option.item)
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

    const achievements = (step.achievements ?? []).flatMap((row) => {
      const achievement = populated(row.achievement)
      if (!achievement?.name) return []
      const slug = data.achievementPages[achievement.id]
      const icon = image(achievement.icon)
      return [
        {
          name: achievement.name,
          ...(slug && { href: `/${slug}` }),
          ...(icon && { icon }),
          some: row.mode === 'some',
          ...(row.mode === 'upto' && row.on?.length && { upto: Math.max(...row.on) }),
        },
      ]
    })
    const links = new Map(
      achievements.flatMap((row) => (row.href ? [[row.name, row.href] as const] : [])),
    )

    const quests = (step.quests ?? []).flatMap((row): QuestRowView[] => {
      const quest = populated(row.quest)
      if (!quest) return []
      const slug = data.questGuides[quest.id]
      const questLines = lines.get(quest.id) ?? []
      const objectives = questLines.length
        ? flatObjectives(data.stopQuests[quest.id]?.stages, data.names)
        : []
      const kids = (island.parents[quest.dofusId] ?? []).flatMap(([at, ids]) => {
        const names = ids.flatMap((id) => {
          const kid = (step.quests ?? []).find((other) => populated(other.quest)?.dofusId === id)
          const kidQuest = populated(kid?.quest)
          return kidQuest && kid?.kind !== 'take' ? [kidQuest.name] : []
        })
        return names.length ? [{ at, names }] : []
      })
      return [
        {
          dofusId: quest.dofusId,
          name: quest.name,
          ...(slug && { href: `/${slug}` }),
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
      achievements,
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

  const totals = byCategory(totalRows(rawSteps))

  const guide = populated(checklist.dofusGuide)
  const publishedGuide = guide?.state === 'published' ? guide : null
  const egg = image(populated(guide?.dofus)?.image)
  const groups = (checklist.prerequisites?.groups ?? []).flatMap((group) => {
    const rows = (group.rows ?? []).map(({ key, text }) => ({ key, text }))
    return rows.length ? [{ title: group.title ?? '', rows }] : []
  })
  const title = s.title(checklist.name)

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
      notes: (checklist.prerequisites?.notes ?? []).map(({ title, text }) => ({
        title: title ?? '',
        text,
      })),
      needs: byCategory(
        (checklist.prerequisites?.needs ?? []).flatMap((need) => {
          const row = needRow(need)
          if (!row) return []
          const prerequisite = need.prerequisite ? { prerequisite: need.prerequisite } : {}
          return [{ category: need.category ?? null, row: { ...row, ...prerequisite } }]
        }),
        true,
      ),
    },
    totals,
    totalsCount: totals.reduce((sum, group) => sum + group.rows.length, 0),
    soonSteps: [...new Set(totals.flatMap((group) => group.rows.flatMap((row) => row.steps)))]
      .sort((a, b) => a - b)
      .slice(0, SOON_STEPS),
    island,
  }
}

/** Lo que piden todos los pasos, sumado por objeto (o por texto) y grupo. */
function totalRows(steps: Step[]) {
  const rows = new Map<string, { category: NeedCategory | null; row: TotalRowView }>()
  steps.forEach((step, index) => {
    for (const need of step.needs ?? []) {
      if (need.countsInTotal === false) continue
      const row = needRow(need)
      if (!row) continue
      // Una fila por objeto (o por texto), con la clave de lo conseguido: la misma que su
      // casilla, aunque cambie de grupo o de mayúsculas entre pasos. Va en el grupo del primero.
      const key = row.key
      const seen = rows.get(key)
      if (seen) {
        // Lo que se conserva tras usarlo cuenta la mayor cantidad; lo demás, la suma.
        const add = (was: number, more: number) => (row.reusable ? Math.max(was, more) : was + more)
        seen.row.quantity = add(seen.row.quantity, row.quantity)
        seen.row.alternatives = seen.row.alternatives?.map((alt, at) => ({
          ...alt,
          quantity: add(alt.quantity, row.alternatives?.[at]?.quantity ?? 0),
        }))
        if (!seen.row.steps.includes(index + 1)) seen.row.steps.push(index + 1)
      } else {
        const { note: _note, ...rest } = row
        rows.set(key, { category: need.category ?? null, row: { ...rest, steps: [index + 1] } })
      }
    }
  })
  return [...rows.values()]
}

function islandData(data: ChecklistData): ChecklistIslandData {
  const { checklist, questGraph, torreLevels } = data
  const steps = checklist.steps ?? []
  const islandSteps = steps.map((step): ChecklistIslandData['steps'][number] => {
    const stop = (step.segments ?? []).find(
      (segment) => segment.kind === 'stop' && segment.quest != null,
    )
    const stopQuest = relationId(stop?.quest ?? null)
    return [
      step.stepId ?? '',
      step.legacyNumber ?? null,
      (step.quests ?? []).flatMap((row) => {
        const quest = populated(row.quest)
        if (!quest) return []
        return [
          stop && quest.id === stopQuest && stop.stopObjective != null
            ? ([quest.dofusId, row.kind, stop.stopObjective] as [number, QuestKind, number])
            : ([quest.dofusId, row.kind] as [number, QuestKind]),
        ]
      }),
    ]
  })

  // Lo que el progreso necesita de cada misión, por su ID de DofusDB.
  const byDofusId = new Map<number, QuestNode & { level: number }>()
  for (const step of steps) {
    for (const row of step.quests ?? []) {
      const quest = populated(row.quest)
      if (!quest || byDofusId.has(quest.dofusId)) continue
      const node = questGraph[quest.id]
      const levelMin = node?.levelMin ?? quest.levelMin ?? null
      byDofusId.set(quest.dofusId, {
        dofusId: quest.dofusId,
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
    closes: steps.flatMap((step) => {
      const resolves = (step.segments ?? []).filter((segment) => segment.kind === 'resolve')
      if (!resolves.length) return []
      return [[step.stepId ?? '', resolves.flatMap((segment) => segment.closes ?? [])]] as [
        string,
        string[],
      ][]
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
