// Una checklist de silvestre-checklist como borrador de la colección checklists, sin tocar la
// base: las misiones, los logros, los PNJ y los jefes van por su ID de DofusDB, los objetos
// por su clave antigua, las imágenes por su ruta en public/img/ y los pasos que cierra un
// verde por su número antiguo. load.ts los resuelve contra Payload.
//
// La fidelidad manda: los textos, las notas y los prerrequisitos de Torre se copian tal cual
// y en su orden. La zona de cada paso va en el paso: es la de Torre, que los agrupa.
import { gameImageKey } from '@/lib/dofusdb/game-images'

import type { ChecklistCatalogEntry } from './catalog'
import type { LegacyChecklist, LegacyStep } from './legacy'
import { stepStops, type StepQuest } from './stops'

export type SegmentDraft =
  | { kind: 'plain'; text: string }
  | { kind: 'stop'; text: string; quest: number; stopObjective: number }
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

export interface StepDraft {
  legacyNumber: number
  segments: SegmentDraft[]
  note: string | null
  achievements: { achievement: number; mode: 'all' | 'some'; on: number[] }[]
  quests: {
    quest: number
    kind: 'mandatory' | 'optional' | 'take'
    note: string | null
    /** El número antiguo del paso que la termina. */
    optionalDoneBy: number | null
  }[]
  needs: {
    /** El ID de DofusDB del objeto o, si DofusDB no lo tiene, «x:<nombre>». */
    item: string
    name: string
    quantity: number
    note: string | null
    category: NeedCategory
    /** false: sale en el paso pero no cuenta en los totales (la marca x antigua). */
    countsInTotal: boolean
    quests: number[]
  }[]
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
  }
  steps: StepDraft[]
  /** Los nombres de lo que se enlaza por ID de DofusDB, para el informe de lo que no casa. */
  names?: Partial<Record<'quests' | 'achievements' | 'monsters' | 'npcs', Record<number, string>>>
  legacy: {
    prefix: string
    classicKeys: Record<string, string | null>
    guideVersion: number
    previousSteps: number[][]
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

/**
 * El texto del paso en tramos: lo que va entre resaltados queda normal y cada resaltado,
 * rojo o verde, en su tramo. Lanza si un resaltado no está en el texto o si los tramos, unidos,
 * no dan el texto de partida: nunca se pierde ni se cambia una palabra.
 */
function splitText(step: LegacyStep): { kind: 'plain' | 'stop' | 'done'; text: string }[] {
  const parts: { kind: 'plain' | 'stop' | 'done'; text: string }[] = []
  let rest = step.text
  const plain = (text: string) => {
    if (text.trim()) parts.push({ kind: 'plain', text: text.trim() })
  }
  for (const [kind, text] of step.marks ?? []) {
    const at = rest.indexOf(text)
    if (at < 0) throw new Error(`Paso ${step.n}: el resaltado «${text}» no está en su texto`)
    plain(rest.slice(0, at))
    parts.push({ kind, text })
    rest = rest.slice(at + text.length)
  }
  plain(rest)
  if (parts.map((part) => part.text).join(' ') !== step.text) {
    throw new Error(`Paso ${step.n}: sus tramos no dan su texto exacto`)
  }
  return parts
}

export function toChecklistDraft(
  entry: ChecklistCatalogEntry,
  legacy: LegacyChecklist,
): ChecklistDraft {
  const { config, quests: data } = legacy
  const journal = config.journal

  const questsOf = (n: number): StepQuest[] =>
    (data.STEP_QUESTS[n] ?? []).map((id) => ({
      ...data.QUESTS[id],
      id,
      kind: data.STEP_QUEST_KINDS[n]?.[id] ?? 'mandatory',
    }))

  /** El ID de la misión que se llama así: primero entre las del paso, luego entre todas. */
  const questByName = (name: string, own: StepQuest[]): number | null => {
    const mine = own.find((quest) => quest.n === name)
    if (mine) return mine.id
    const any = Object.entries(data.QUESTS).find(([, quest]) => quest.n === name)
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

  const steps = legacy.steps.map((step): StepDraft => {
    const quests = questsOf(step.n)
    const stops = stepStops(step, quests, journal.stopAt)
    let red = 0
    const greens = (step.marks ?? []).filter(([kind]) => kind === 'done').length
    if (greens > 1 && step.closes?.length) {
      throw new Error(`Paso ${step.n}: varios verdes y no se sabe cuál cierra cada paso`)
    }
    const segments = splitText(step).map((part): SegmentDraft => {
      if (part.kind === 'plain') return { kind: 'plain', text: part.text }
      if (part.kind === 'stop') {
        const point = stops[red++]
        if (!point) throw new Error(`Paso ${step.n}: no se sabe dónde para «${part.text}»`)
        return { kind: 'stop', text: part.text, quest: point.quest, stopObjective: point.index }
      }
      if (!step.closes?.length) {
        throw new Error(`Paso ${step.n}: el verde «${part.text}» no cierra ningún paso`)
      }
      return { kind: 'resolve', text: part.text, closes: step.closes }
    })

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
          note: journal.questNotes[step.n]?.[quest.id] ?? null,
          optionalDoneBy:
            quest.kind === 'optional' ? (journal.optionalDoneBy[quest.id] ?? null) : null,
        }
      }),
      needs: (legacy.resources.steps[step.n] ?? []).map((row) => {
        // El esquema aún no guarda alternativas ni grupos opcionales (Silvestre, Hielos):
        // mejor parar que perderlos.
        if (row.a.length !== 1) {
          throw new Error(`Paso ${step.n}: la fila «${row.k}» tiene alternativas`)
        }
        if (row.g) {
          throw new Error(`Paso ${step.n}: la fila «${row.k}» va en el grupo «${row.g}»`)
        }
        const [[item, quantity]] = row.a
        const category = NEED_CATEGORIES[row.c as keyof typeof NEED_CATEGORIES]
        if (!category) throw new Error(`Paso ${step.n}: grupo desconocido «${row.c}»`)
        return {
          item,
          name: legacy.resources.items[item]?.name ?? item.replace(/^x:/, ''),
          quantity,
          note: row.n ?? null,
          category,
          countsInTotal: !row.x,
          quests: (row.m ?? []).flatMap((name) => {
            const id = questByName(name, quests)
            return id === null ? [] : [id]
          }),
        }
      }),
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
    },
    steps,
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
    },
  }
}
