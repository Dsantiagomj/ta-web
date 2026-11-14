// Los datos de una checklist de silvestre-checklist, tal como los deja su carpeta
// src/dofus/<id>/: steps.js y config.js (módulos de JavaScript, leídos con import()) y los
// JSON que generan sus scripts de .build/. Solo se leen; el significado de cada campo está en
// esos scripts (build_quests_js.py, build_resources.py, build_figures.py…).
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

/**
 * Un tramo resaltado del texto: rojo («detente aquí»), verde («aquí se resuelve») o un aviso
 * de la guía: nota, consejo, lo que se debe hacer («must») o lo que el paso incluye.
 */
export type LegacyMark = ['stop' | 'done' | 'note' | 'tip' | 'must' | 'includes', string]

export interface LegacyStep {
  /** El número del paso: la clave de su progreso en la checklist antigua. */
  n: number
  zone: string
  text: string
  base: string
  marks?: LegacyMark[]
  /** Los pasos cuyas misiones termina este. */
  closes?: number[]
  /** Los pasos cuyas misiones avanza sin terminarlas («se actualiza la misión del inciso N»). */
  updates?: number[]
}

export interface LegacyPrereq {
  id: string
  text: string
}

export interface LegacyObjective {
  k: string
  t: string
  m?: number
  a?: string
}

export interface LegacyQuest {
  n: string
  lv?: number
  st?: { npc?: string; m?: number; a?: string }
  s: { n: string; o: LegacyObjective[] }[]
}

/** Paso -> [nombre de la misión, comienzo del objetivo que va justo después de la parada, opciones]. */
export type LegacyStopAt = Record<
  string,
  [string, string, { text?: string; later?: boolean; done?: string }?][]
>

export interface LegacyConfig {
  id: string
  name: string
  storagePrefix: string
  classicKeys: Record<string, string | null>
  guideVersion: number
  /** Las claves de objetos que cambiaron: vieja → [nueva, pasos donde está ahora]. */
  ownedMoves?: Record<string, [string, number[]]>
  /** El aviso sobre el Dofus Ocre en los prerrequisitos: su título, la misión y el logro. */
  prereqNote?: { title: string; quest: string; achievement: string } | null
  /** La orden de alineamiento que sigue la guía, en los prerrequisitos. */
  orderNote?: { title: string; text: string } | null
  journal: {
    extraNotes: Record<string, string>
    questNotes: Record<string, Record<string, string>>
    optionalDoneBy: Record<string, number>
    stopAt: LegacyStopAt
  }
}

export interface LegacyQuests {
  STEP_QUESTS: Record<string, number[]>
  STEP_QUEST_KINDS: Record<string, Record<string, string>>
  QUESTS: Record<string, LegacyQuest>
  /** Misión → las misiones que, terminadas todas, la terminan sola (de la ruta o no). */
  COMPLETED_BY?: Record<string, number[]>
}

export interface LegacyPlan {
  t: string
  id: number
  name: string
  mode: 'all' | 'some' | 'upto'
  on: number[]
}

export interface LegacyResourceRow {
  /** Su clave en lo conseguido: las opciones unidas por «|» y «@grupo». */
  k: string
  c: string
  /** El grupo dentro de su categoría («Misión opcional»). */
  g: string | null
  /** Las opciones de la fila, cada una con su cantidad: «A o B». */
  a: [string, number][]
  n?: string
  /** Sale en el paso pero no cuenta en los totales. */
  x?: number
  /** Se conserva al usarla: en los totales cuenta la mayor cantidad, no la suma. */
  r?: number
  /** En los prerrequisitos (el paso 0): la clave del prerrequisito en el que se gasta. */
  p?: string | null
  m?: string[]
}

export interface LegacyResources {
  items: Record<string, { name: string; img: string | null; type: string; lvl: number }>
  steps: Record<string, LegacyResourceRow[]>
}

export interface LegacyFigure {
  m?: number
  f: { img: string; name: string; as: string }
}

export interface LegacyChecklist {
  config: LegacyConfig
  steps: LegacyStep[]
  previousSteps: number[][]
  prerequisites: {
    intro: string
    groups: { title: string; rows: LegacyPrereq[] }[]
    /** El aviso de empezar el Dofus Ocre cuanto antes y el paso que lo termina. */
    ocre: string
    ocreStep: number | null
  }
  quests: LegacyQuests
  plans: Record<string, LegacyPlan[]>
  resources: LegacyResources
  figures: Record<string, LegacyFigure>
  assets: {
    STEP_ASSETS: Record<
      string,
      {
        /** El icono del paso: la recompensa de su logro, su jefe o el icono del logro. */
        icon?: { src: string; label: string; from: string } | null
        bosses?: { id: number; name: string }[]
      }
    >
  }
  zones: Record<string, { map: number; img: string; thumb: string }>
}

// Los títulos de los grupos de prerrequisitos, como los pinta PrereqsPanel.jsx.
const PREREQ_GROUPS = [
  ['Logros previos', 'PREREQS_LOGROS'],
  ['Oficios', 'PREREQS_OFICIOS'],
  ['Hechizos', 'PREREQS_HECHIZOS'],
] as const

/** La carpeta de una checklist dentro de silvestre-checklist. */
export const legacyDir = (root: string, id: string) => path.join(root, 'src', 'dofus', id)

async function json<T>(dir: string, file: string): Promise<T> {
  return JSON.parse(await readFile(path.join(dir, file), 'utf8')) as T
}

/** Lee la checklist `id` de la copia de silvestre-checklist que hay en `root`. */
export async function readLegacyChecklist(root: string, id: string): Promise<LegacyChecklist> {
  const dir = legacyDir(root, id)
  const steps = await import(pathToFileURL(path.join(dir, 'steps.js')).href)
  const config = (await import(pathToFileURL(path.join(dir, 'config.js')).href)).default
  return {
    config: config as LegacyConfig,
    steps: steps.STEPS as LegacyStep[],
    previousSteps: steps.PREVIOUS_STEPS as number[][],
    prerequisites: {
      intro: steps.PREREQS_INTRO as string,
      groups: PREREQ_GROUPS.map(([title, name]) => ({
        title,
        rows: (steps[name] ?? []) as LegacyPrereq[],
      })),
      ocre: (steps.PREREQS_OCRE ?? '') as string,
      ocreStep: (steps.OCRE_STEP ?? null) as number | null,
    },
    quests: await json(dir, 'quests.json'),
    plans: await json(dir, 'plans.json'),
    resources: await json(dir, 'resources.json'),
    figures: await json(dir, 'figures.json'),
    assets: await json(dir, 'assets.json'),
    zones: await json(dir, 'zones.json'),
  }
}
