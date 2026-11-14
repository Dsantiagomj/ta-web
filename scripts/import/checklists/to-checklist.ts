// Una checklist de silvestre-checklist como borrador de la colección checklists, sin tocar la
// base: las misiones, los logros, los PNJ y los jefes van por su ID de DofusDB, los objetos
// por su clave antigua, las imágenes por su ruta en public/img/ y los pasos que cierra un
// verde por su número antiguo. load.ts los resuelve contra Payload.
//
// La fidelidad manda: los textos, las notas y los prerrequisitos de Torre se copian tal cual
// y en su orden. La zona de cada paso va en el paso: es la de Torre, que los agrupa.
import { gameImageKey } from '@/lib/dofusdb/game-images'

import type { ChecklistCatalogEntry } from './catalog'
import type { LegacyChecklist, LegacyResourceRow, LegacyStep } from './legacy'
import { FOLLOW_UP, followUpStop, stepStops, type StepQuest, type StopPoint } from './stops'

/** Los avisos de la guía, en su tramo: nota, consejo, lo que se debe hacer, lo que incluye. */
export type CallKind = 'note' | 'tip' | 'must' | 'includes'

/** Una parada de un rojo: la misión, su objetivo y sus opciones (stops.ts). */
export interface StopDraft {
  quest: number | null
  stopObjective: number | null
  later?: true
  line?: string
  resumeLine?: string
}

export type SegmentDraft =
  | { kind: 'plain' | CallKind; text: string }
  | ({ kind: 'stop'; text: string; more?: StopDraft[] } & StopDraft)
  | { kind: 'resolve'; text: string; closes: number[] }

export interface ArtRef {
  /** La ruta del archivo dentro de public/img/ de silvestre-checklist. */
  path: string
  alt: string
  /** Su clave en media.gameAsset, si es arte del juego que Media ya puede tener. */
  key?: string
}

/** Los grupos de «Necesitarás» de la checklist antigua (build_resources.py, CATEGORY). */
const NEED_CATEGORIES = {
  recursos: 'resources',
  consumibles: 'consumables',
  equipables: 'equipment',
  almas: 'souls',
  criaturas: 'creatures',
  cosmeticos: 'cosmetics',
} as const

export type NeedCategory = (typeof NEED_CATEGORIES)[keyof typeof NEED_CATEGORIES]

export interface NeedOption {
  /** El ID de DofusDB del objeto o, si DofusDB no lo tiene, «x:<nombre>». */
  item: string
  name: string
  quantity: number
}

export interface NeedDraft extends NeedOption {
  /** Las otras opciones de la fila: «A o B». */
  alternatives?: NeedOption[]
  note: string | null
  category: NeedCategory
  /** El grupo dentro de su categoría («Misión opcional»). */
  group?: string
  /** false: sale en el paso pero no cuenta en los totales (la marca x antigua). */
  countsInTotal: boolean
  /** Se conserva al usarla: en los totales cuenta la mayor cantidad, no la suma. */
  reusable?: true
  quests: number[]
}

export interface StepDraft {
  legacyNumber: number
  segments: SegmentDraft[]
  note: string | null
  achievements: { achievement: number; mode: 'all' | 'some' | 'upto'; on: number[] }[]
  quests: {
    quest: number
    kind: 'mandatory' | 'optional' | 'take'
    note: string | null
    /** El número antiguo del paso que la termina. */
    optionalDoneBy: number | null
    /** Una fila genérica: su nombre y las demás misiones que también valen. */
    label?: string
    alternatives?: number[]
  }[]
  needs: NeedDraft[]
  /** Los pasos que cierra sin verde (el 93 del Silvestre); con verde van en su tramo. */
  closes: number[]
  /** Los pasos cuyas misiones avanza sin terminarlas. */
  updates: number[]
  figure: { npc: number | null; art: ArtRef | null; role: string } | null
  bosses: number[]
  icon: ArtRef | null
  banner: ArtRef | null
  /** La zona de Torre: agrupa los pasos en la lista. */
  zone: string
}

export interface ChecklistDraft {
  slug: string
  name: string
  description: string
  order: number
  legacyHref: string
  /** El slug de la guía de su Dofus. */
  dofusGuide: string
  prerequisites: {
    intro: string
    groups: { title: string; rows: { key: string; text: string }[] }[]
    /** Los avisos de Torre sobre los prerrequisitos (el Dofus Ocre, la orden de alineamiento). */
    notes: { title: string; text: string }[]
    /** Los objetos que piden, con el prerrequisito en el que se gasta cada uno. */
    needs: (NeedDraft & { prerequisite: string | null })[]
  }
  steps: StepDraft[]
  /** Las misiones que el juego termina solas al terminar todas las de `by` (COMPLETED_BY). */
  completedBy: { quest: number; by: number[] }[]
  /** Las filas genéricas de misión que se quedan fuera (no son una misión de DofusDB). */
  generic?: { step: number; name: string }[]
  /** Los nombres de lo que se enlaza por ID de DofusDB, para el informe de lo que no casa. */
  names?: Partial<Record<'quests' | 'achievements' | 'monsters' | 'npcs', Record<number, string>>>
  legacy: {
    prefix: string
    classicKeys: Record<string, string | null>
    guideVersion: number
    previousSteps: number[][]
    ownedMoves: Record<string, [string, number[]]>
    /** Las filas genéricas antiguas («clase», «alt:…») por la primera de sus misiones. */
    genericQuests?: Record<string, number>
  }
}

/** El texto entero de un paso: sus tramos unidos por un espacio, como estaban en la guía. */
export const stepText = (step: Pick<StepDraft, 'segments'>) =>
  step.segments.map((segment) => segment.text).join(' ')

const QUEST_KINDS = new Set(['mandatory', 'optional', 'take'])
const NPC_IMAGE = /^npcs\/npc-(\d+)\.png$/
// El arte de DofusDB que la checklist antigua copió: su clave en Media es la del arte del juego.
const GAME_IMAGE = /^(items|achievements|monsters)\/(\d+)\.png$/
const GAME_KIND = { items: 'item', achievements: 'achievement', monsters: 'monster' } as const

/** El icono del paso como imagen, con la clave de arte del juego si lo es. */
function iconRef(icon: { src: string; label: string } | null | undefined): ArtRef | null {
  if (!icon) return null
  const game = icon.src.match(GAME_IMAGE)
  const key = game
    ? gameImageKey(GAME_KIND[game[1] as keyof typeof GAME_KIND], Number(game[2]))
    : undefined
  return { path: icon.src, alt: icon.label, ...(key ? { key } : {}) }
}

type MarkKind = 'plain' | 'stop' | 'done' | CallKind

/**
 * El texto del paso en tramos: lo que va entre resaltados queda normal y cada resaltado en su
 * tramo, con el texto de la guía. El resaltado antiguo puede venir con otra mayúscula y sin
 * los signos que lo rodean («(hasta tener que pasar X)»): se busca sin mayúsculas y se alarga
 * hasta los espacios, así los tramos, unidos por un espacio, dan el texto. Lanza si un
 * resaltado no está en el texto o si los tramos no dan el texto de partida: nunca se pierde ni
 * se cambia una palabra. `raw` es el resaltado tal como lo guardaba la checklist antigua.
 */
function splitText(step: LegacyStep): { kind: MarkKind; text: string; raw?: string }[] {
  const parts: { kind: MarkKind; text: string; raw?: string }[] = []
  const text = step.text
  const lower = text.toLowerCase()
  let at = 0
  const plain = (to: number) => {
    const piece = text.slice(at, to).trim()
    if (piece) parts.push({ kind: 'plain', text: piece })
  }
  for (const [kind, marked] of step.marks ?? []) {
    // Sin los espacios de alrededor: alargar hasta el espacio se comería la palabra siguiente.
    const raw = marked.trim()
    let from = lower.indexOf(raw.toLowerCase(), at)
    if (from < 0) throw new Error(`Paso ${step.n}: el resaltado «${raw}» no está en su texto`)
    let to = from + raw.length
    while (from > at && !/\s/.test(text[from - 1])) from--
    while (to < text.length && !/\s/.test(text[to])) to++
    plain(from)
    parts.push({ kind, text: text.slice(from, to), raw })
    at = to
  }
  plain(text.length)
  if (parts.map((part) => part.text).join(' ') !== text) {
    throw new Error(`Paso ${step.n}: sus tramos no dan su texto exacto`)
  }
  return parts
}

const CALL_KINDS = new Set<string>(['note', 'tip', 'must', 'includes'])

/** Una parada como la guarda el tramo: la misión y el objetivo, y sus opciones si las tiene. */
const stopDraft = (point: StopPoint | undefined): StopDraft => ({
  quest: point?.quest ?? null,
  stopObjective: point?.index ?? null,
  ...(point?.later && { later: true as const }),
  ...(point?.line && { line: point.line }),
  ...(point?.resumeLine && { resumeLine: point.resumeLine }),
})

/**
 * Los avisos de los prerrequisitos, como los pinta PrereqsPanel.jsx: empezar el Dofus Ocre
 * cuanto antes (el texto de la guía y la misión que lo da) y la orden de alineamiento que sigue
 * la guía.
 */
function prerequisiteNotes(legacy: LegacyChecklist): { title: string; text: string }[] {
  const { prereqNote, orderNote } = legacy.config
  const { ocre, ocreStep } = legacy.prerequisites
  if (prereqNote && (!ocre.trim() || ocreStep == null)) {
    throw new Error('El aviso del Dofus Ocre necesita PREREQS_OCRE y OCRE_STEP en steps.js')
  }
  return [
    ...(prereqNote
      ? [
          {
            title: prereqNote.title,
            text: `${ocre} Lo da la misión «${prereqNote.quest}», que la guía termina en el paso ${ocreStep} con el logro «${prereqNote.achievement}».`,
          },
        ]
      : []),
    ...(orderNote ? [{ title: orderNote.title, text: orderNote.text }] : []),
  ]
}

/**
 * `alternatives` son las misiones de cada fila genérica, por su id antiguo («clase»,
 * «alt:607:1568»; generic.ts): la fila va con la primera y las demás también valen. Una fila
 * genérica sin ellas se queda fuera y el informe la nombra.
 */
export function toChecklistDraft(
  entry: ChecklistCatalogEntry,
  legacy: LegacyChecklist,
  alternatives: Record<string, number[]> = {},
): ChecklistDraft {
  const { config, quests: data } = legacy
  const journal = config.journal

  // Las filas genéricas («Misión de clase», una misión por alineamiento…) no son una misión de
  // DofusDB: van con sus misiones, sin elegir ninguna por la persona. Sin ellas se quedan
  // fuera y el informe las nombra.
  const generic: ChecklistDraft['generic'] = []
  const genericQuests: Record<string, number> = {}
  // Una fila genérica lleva su id antiguo («alt:…», «clase»): sus notas y el paso que la
  // termina van por él.
  type RouteQuest = StepQuest & { label?: string; others?: number[]; legacyId?: string }
  const questsOf = (n: number): RouteQuest[] =>
    (data.STEP_QUESTS[n] ?? []).flatMap((id): RouteQuest[] => {
      const kind = data.STEP_QUEST_KINDS[n]?.[id] ?? 'mandatory'
      if (Number.isInteger(Number(id))) return [{ ...data.QUESTS[id], id, kind }]
      const quests = alternatives[String(id)]
      const name = data.QUESTS[id]?.n ?? String(id)
      if (!quests?.length) {
        generic.push({ step: n, name })
        return []
      }
      const [first, ...others] = quests
      genericQuests[String(id)] = first
      return [{ ...data.QUESTS[id], id: first, kind, label: name, others, legacyId: String(id) }]
    })

  /** El ID de la misión que se llama así: primero entre las del paso, luego entre todas. */
  const questByName = (name: string, own: StepQuest[]): number | null => {
    const mine = own.find((quest) => quest.n === name)
    if (mine) return mine.id
    const any = Object.entries(data.QUESTS).find(
      ([id, quest]) => quest.n === name && Number.isInteger(Number(id)),
    )
    return any ? Number(any[0]) : null
  }

  /** El nombre de la subzona de un mapa, de lo que dicen las misiones; o null. */
  const areaOf = (map: number): string | null => {
    for (const quest of Object.values(data.QUESTS)) {
      if (quest.st?.m === map && quest.st.a) return quest.st.a
      const objective = quest.s.flatMap((stage) => stage.o).find((o) => o.m === map && o.a)
      if (objective?.a) return objective.a
    }
    return null
  }

  /** Una fila de «Necesitarás», con todas sus opciones, su grupo y si se conserva. */
  const needDraft = (row: LegacyResourceRow, n: number, quests: StepQuest[]): NeedDraft => {
    const category = NEED_CATEGORIES[row.c as keyof typeof NEED_CATEGORIES]
    if (!category) throw new Error(`Paso ${n}: grupo desconocido «${row.c}»`)
    if (row.a.length === 0) throw new Error(`Paso ${n}: la fila «${row.k}» no lleva ningún objeto`)
    const option = ([item, quantity]: [string, number]): NeedOption => ({
      item,
      name: legacy.resources.items[item]?.name ?? item.replace(/^x:/, ''),
      quantity,
    })
    const [first, ...others] = row.a.map(option)
    return {
      ...first,
      ...(others.length > 0 && { alternatives: others }),
      note: row.n ?? null,
      category,
      ...(row.g && { group: row.g }),
      countsInTotal: !row.x,
      ...(row.r && { reusable: true as const }),
      quests: (row.m ?? []).flatMap((name) => {
        const id = questByName(name, quests)
        return id === null ? [] : [id]
      }),
    }
  }

  const steps = legacy.steps.map((step): StepDraft => {
    const quests = questsOf(step.n)
    const stops = stepStops(step, quests, journal.stopAt)
    let red = 0
    const greens = (step.marks ?? []).filter(([kind]) => kind === 'done').length
    if (greens > 1 && step.closes?.length) {
      throw new Error(`Paso ${step.n}: varios verdes y no se sabe cuál cierra cada paso`)
    }
    const segments = splitText(step).flatMap((part): SegmentDraft[] => {
      if (part.kind === 'plain' || CALL_KINDS.has(part.kind)) {
        return [{ kind: part.kind as 'plain' | CallKind, text: part.text }]
      }
      if (part.kind === 'stop') {
        const [first, ...more] = stops[red++] ?? []
        return [
          {
            kind: 'stop',
            text: part.text,
            ...stopDraft(first),
            ...(more.length > 0 && { more: more.map(stopDraft) }),
          },
        ]
      }
      const closes = step.closes ?? []
      // El verde que deja una parada nueva («…hasta tener que pasar Kodámade»): esa parte es
      // un «detente aquí» detrás del «aquí se resuelve».
      const follow = part.raw?.match(FOLLOW_UP)
      if (!follow || follow.index === undefined)
        return [{ kind: 'resolve', text: part.text, closes }]
      const cut = part.text.toLowerCase().indexOf(part.raw!.toLowerCase()) + follow.index
      return [
        { kind: 'resolve', text: part.text.slice(0, cut), closes },
        {
          kind: 'stop',
          text: part.text.slice(cut).trim(),
          ...stopDraft(followUpStop(part.raw!, quests) ?? undefined),
        },
      ]
    })
    const hasResolve = segments.some((segment) => segment.kind === 'resolve')

    const figure = legacy.figures[step.n]
    const npc = figure?.f.img.match(NPC_IMAGE)
    const startMap = figure?.m
    const zone = legacy.zones[step.zone]

    return {
      legacyNumber: step.n,
      segments,
      note: journal.extraNotes[step.n] ?? null,
      achievements: (legacy.plans[step.n] ?? [])
        .filter((plan) => plan.t === 'a')
        .map((plan) => ({ achievement: plan.id, mode: plan.mode, on: plan.on })),
      quests: quests.map((quest) => {
        if (!QUEST_KINDS.has(quest.kind)) {
          throw new Error(`Paso ${step.n}: tipo de misión desconocido «${quest.kind}»`)
        }
        return {
          quest: quest.id,
          kind: quest.kind as StepDraft['quests'][number]['kind'],
          note: journal.questNotes[step.n]?.[quest.legacyId ?? quest.id] ?? null,
          optionalDoneBy:
            quest.kind === 'optional'
              ? (journal.optionalDoneBy[quest.legacyId ?? quest.id] ?? null)
              : null,
          ...(quest.label && { label: quest.label, alternatives: quest.others ?? [] }),
        }
      }),
      needs: (legacy.resources.steps[step.n] ?? []).map((row) => needDraft(row, step.n, quests)),
      closes: hasResolve ? [] : (step.closes ?? []),
      updates: step.updates ?? [],
      figure: figure
        ? {
            npc: npc ? Number(npc[1]) : null,
            art: npc ? null : { path: figure.f.img, alt: figure.f.name },
            role: figure.f.as,
          }
        : null,
      bosses: (legacy.assets.STEP_ASSETS[step.n]?.bosses ?? []).map((boss) => boss.id),
      icon: iconRef(legacy.assets.STEP_ASSETS[step.n]?.icon),
      banner: startMap
        ? { path: `maps/start/${startMap}.jpg`, alt: areaOf(startMap) ?? step.zone }
        : zone
          ? { path: zone.img, alt: step.zone }
          : null,
      zone: step.zone,
    }
  })

  return {
    slug: entry.slug,
    name: entry.name,
    description: entry.description,
    order: entry.order,
    legacyHref: entry.legacyHref,
    dofusGuide: entry.dofusGuide,
    prerequisites: {
      intro: legacy.prerequisites.intro,
      groups: legacy.prerequisites.groups
        .filter((group) => group.rows.length > 0)
        .map((group) => ({
          title: group.title,
          rows: group.rows.map((row) => ({ key: row.id, text: row.text })),
        })),
      notes: prerequisiteNotes(legacy),
      needs: (legacy.resources.steps[0] ?? []).map((row) => ({
        ...needDraft(row, 0, []),
        prerequisite: row.p ?? null,
      })),
    },
    steps,
    completedBy: Object.entries(data.COMPLETED_BY ?? {}).map(([quest, by]) => ({
      quest: Number(quest),
      by,
    })),
    ...(generic.length > 0 && { generic }),
    names: {
      quests: Object.fromEntries(
        Object.entries(data.QUESTS).map(([id, quest]) => [Number(id), quest.n]),
      ),
      achievements: Object.fromEntries(
        Object.values(legacy.plans)
          .flat()
          .map((plan) => [plan.id, plan.name]),
      ),
      monsters: Object.fromEntries(
        Object.values(legacy.assets.STEP_ASSETS).flatMap((assets) =>
          (assets.bosses ?? []).map((boss) => [boss.id, boss.name]),
        ),
      ),
      npcs: Object.fromEntries(
        Object.values(legacy.figures).flatMap((figure) => {
          const npc = figure.f.img.match(NPC_IMAGE)
          return npc ? [[Number(npc[1]), figure.f.name]] : []
        }),
      ),
    },
    legacy: {
      prefix: config.storagePrefix,
      classicKeys: config.classicKeys,
      guideVersion: config.guideVersion,
      previousSteps: legacy.previousSteps,
      ownedMoves: config.ownedMoves ?? {},
      ...(Object.keys(genericQuests).length > 0 && { genericQuests }),
    },
  }
}
