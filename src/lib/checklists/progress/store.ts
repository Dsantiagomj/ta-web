// El progreso guardado en el navegador: uno solo para todas las checklists, en
// `ta-web:progress` (AGENTS.md, Members and progress). Las misiones van por su ID de DofusDB,
// los pasos por su stepId, los prerrequisitos por «<ID de la checklist>:<clave>» y los objetos
// por su ID de DofusDB (o «x:<texto>» si no son un objeto), con «#<stepId>» si solo cuentan para
// un paso. Cada entrada lleva cuándo cambió (`at`), para mezclarla algún día con la del servidor.
//
// Todo acceso a localStorage va en try/catch: sin él (modo privado, cuota llena, bloqueado) la
// checklist sigue funcionando, solo que no guarda.

/**
 * Una clave de lo conseguido en sus partes: el objeto y, tras el último «#», el paso. El objeto
 * puede llevar «#» en su apartado («17994@orden #2»).
 */
export function ownedParts(key: string): [string, string | undefined] {
  const at = key.lastIndexOf('#')
  return at < 0 ? [key, undefined] : [key.slice(0, at), key.slice(at + 1)]
}

/** La parte de lo conseguido de los objetos de los prerrequisitos: «<clave>#pre». */
export const PREREQUISITE_PART = 'pre'

export const PROGRESS_KEY = 'ta-web:progress'

export interface QuestEntry {
  /** El objetivo por el que va o «done» si está terminada. */
  o: number | 'done'
  /** Quién la terminó: la checklist (su ID, o su id antiguo si no está aquí) y el paso. */
  by?: { c: number | string; s?: string }
  at: number
}

export interface Progress {
  v: 1
  quests: Record<string, QuestEntry>
  steps: Record<string, { done: boolean; at: number }>
  prereqs: Record<string, number>
  owned: Record<string, number>
  /** Las almas que se tienen (el Ocre), por el ID de DofusDB de su monstruo. */
  souls: Record<string, number>
  /** Las checklists antiguas ya migradas, por su id («nebuloso»). */
  migrated: Record<string, number>
}

export interface ProgressStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

export const emptyProgress = (): Progress => ({
  v: 1,
  quests: {},
  steps: {},
  prereqs: {},
  owned: {},
  souls: {},
  migrated: {},
})

const isObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value)
const isTime = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value)

function entries<T>(value: unknown, keep: (entry: unknown) => entry is T): Record<string, T> {
  if (!isObject(value)) return {}
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => keep(entry))) as Record<
    string,
    T
  >
}

function isQuest(entry: unknown): entry is QuestEntry {
  if (!isObject(entry) || !isTime(entry.at)) return false
  if (entry.o !== 'done' && !(typeof entry.o === 'number' && entry.o >= 0)) return false
  if (entry.by === undefined) return true
  const by = entry.by
  return (
    isObject(by) &&
    (typeof by.c === 'number' || typeof by.c === 'string') &&
    (by.s === undefined || typeof by.s === 'string')
  )
}

const isStep = (entry: unknown): entry is Progress['steps'][string] =>
  isObject(entry) && typeof entry.done === 'boolean' && isTime(entry.at)

/** El progreso de un texto guardado; lo que no se entiende se descarta. */
export function parseProgress(text: string | null): Progress {
  let raw: unknown
  try {
    raw = JSON.parse(text ?? 'null')
  } catch {
    return emptyProgress()
  }
  if (!isObject(raw) || raw.v !== 1) return emptyProgress()
  return {
    v: 1,
    quests: entries(raw.quests, isQuest),
    steps: entries(raw.steps, isStep),
    prereqs: entries(raw.prereqs, isTime),
    owned: entries(raw.owned, isTime),
    souls: entries(raw.souls, isTime),
    migrated: entries(raw.migrated, isTime),
  }
}

const BACKUP_APP = 'ta-web'
const BACKUP_KIND = 'checklist-progress'

/** El archivo de una copia de seguridad (`backupFile`). */
export const backupFile = (progress: Progress, at: Date) => ({
  app: BACKUP_APP,
  kind: BACKUP_KIND,
  v: 1,
  at: at.toISOString(),
  progress,
})

/**
 * El progreso de una copia de seguridad, o null si no es una copia válida: otra app, otra
 * versión, sin progreso o con alguna entrada que no se entiende. Una copia a medias no se
 * restaura nunca: borraría lo que hay.
 */
export function parseBackup(text: string): Progress | null {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    return null
  }
  if (!isObject(raw) || raw.app !== BACKUP_APP || raw.kind !== BACKUP_KIND || raw.v !== 1) {
    return null
  }
  const progress = raw.progress
  if (!isObject(progress) || progress.v !== 1) return null
  const parsed = parseProgress(JSON.stringify(progress))
  const maps = ['quests', 'steps', 'prereqs', 'owned', 'migrated'] as const
  const intact =
    maps.every(
      (name) =>
        isObject(progress[name]) &&
        Object.keys(progress[name] as object).length === Object.keys(parsed[name]).length,
    ) &&
    // Las almas llegaron después: una copia de antes no las lleva y vale igual.
    (progress.souls === undefined ||
      (isObject(progress.souls) &&
        Object.keys(progress.souls).length === Object.keys(parsed.souls).length))
  return intact ? parsed : null
}

export function readProgress(storage: ProgressStorage): Progress {
  try {
    return parseProgress(storage.getItem(PROGRESS_KEY))
  } catch {
    return emptyProgress()
  }
}

/** Guarda el progreso; false si el navegador no deja. */
export function writeProgress(storage: ProgressStorage, progress: Progress): boolean {
  try {
    storage.setItem(PROGRESS_KEY, JSON.stringify(progress))
    return true
  } catch {
    return false
  }
}
