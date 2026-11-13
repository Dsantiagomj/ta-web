// La migración del progreso que guarda silvestre-checklist en el mismo navegador
// (src/tools/checklist/state/store.js y lib/*.js de ese repo) a ta-web:progress. La carga la
// isla con import() solo si legacy-keys.ts encuentra claves antiguas sin migrar.
//
// - Una vez por checklist antigua (`migrated`), sin borrar ni tocar sus claves, y sumando: lo
//   que ya hay en ta-web:progress nunca se quita ni se deshace.
// - La de esta página entera: la versión de la guía (previousSteps), el modelo antiguo de las
//   misiones (questPos), las claves de objetos que cambiaron (ownedMoves), el checklist clásico
//   si aún no se había traído, los pasos hechos («done», por su número antiguo), el avance de
//   las misiones (questObjective), los prerrequisitos y lo conseguido («#n» pasa a «#stepId»).
// - Lo compartido entre checklists (dofus-checklists:shared) y las misiones y los objetos de las
//   checklists antiguas que no son esta (silvestre:*, hielos:*, global:*): sus pasos no se
//   pueden pasar sin su estructura, pero lo hecho en ellas sale hecho aquí.
import type { ChecklistIslandData } from '../page'
import { checklistModel, markSteps, type ChecklistModel } from './engine'
import { legacySource, QUESTS_ONLY, SHARED_KEY } from './legacy-keys'
import type { Progress, QuestEntry } from './store'

type Flags = Record<string, unknown>
type Moves = Record<string, [string, number[]]>

export interface LegacyInput {
  /** Todas las claves de localStorage. */
  keys: string[]
  read: (key: string) => string | null
  data: ChecklistIslandData
  now: number
}

/** Desde la 2 de silvestre-checklist, questPos ya no da por hechas las misiones de antes. */
const QUEST_MODEL = '2'
/** Las claves de objetos están al día desde la 2. */
const OWNED_MODEL = '2'

function readObject(read: LegacyInput['read'], key: string): Flags {
  try {
    const value = JSON.parse(read(key) ?? '{}')
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {}
  } catch {
    return {}
  }
}

const numbers = (flags: Flags) =>
  Object.fromEntries(
    Object.entries(flags).filter(
      (entry): entry is [string, number] => typeof entry[1] === 'number' && entry[1] >= 0,
    ),
  )

/**
 * Pasa progreso de la versión anterior de la guía a la numeración de ahora: un paso nuevo queda
 * hecho si lo estaban todos los antiguos que lo forman; la misión en curso solo se conserva si
 * el paso no se juntó ni se partió. `previous[i]` son los pasos antiguos del paso i + 1.
 */
export function migrateProgress(
  done: Flags,
  questPos: Record<string, number>,
  previous: number[][],
): { done: Record<number, true>; questPos: Record<number, number> } {
  const uses = new Map<number, number>()
  for (const old of previous.flat()) uses.set(old, (uses.get(old) ?? 0) + 1)
  const out = { done: {} as Record<number, true>, questPos: {} as Record<number, number> }
  previous.forEach((old, index) => {
    if (old.every((n) => done[n] === true)) out.done[index + 1] = true
    const [only] = old
    if (old.length === 1 && uses.get(only) === 1 && questPos[only] != null) {
      out.questPos[index + 1] = questPos[only]
    }
  })
  return out
}

/**
 * El modelo 1 de las misiones daba por terminadas las obligatorias de antes de la que iba en
 * curso en cada paso: ahora lo están de verdad. `weights` son, por paso antiguo, lo que vale
 * cada misión (las que valen 0 no se terminaban), sus IDs y sus objetivos.
 */
export function migrateQuestPos(
  questPos: Record<string, number>,
  questObj: Record<string, number>,
  weights: Record<string, { q: number[]; ids: string[]; os: number[] }>,
): Record<string, number> {
  const out = { ...questObj }
  for (const [n, at] of Object.entries(questPos)) {
    const { q = [], ids = [], os = [] } = weights[n] ?? {}
    const pos = Math.min(at || 0, q.length - 1)
    for (let i = 0; i < pos; i++) {
      if (q[i] > 0 && (out[ids[i]] ?? 0) < os[i]) out[ids[i]] = os[i]
    }
  }
  return out
}

/**
 * Lo conseguido con claves que cambiaron: lo marcado con la vieja, entero o solo para un paso,
 * queda marcado en esas partes de la nueva (`moves`: vieja → [nueva, pasos]).
 */
export function migrateOwned(owned: Flags, moves: Moves): Flags {
  const out: Flags = {}
  for (const [key, value] of Object.entries(owned)) {
    const move = moves[key.split('#')[0]]
    if (!move) {
      out[key] = value
      continue
    }
    const [to, steps] = move
    for (const n of steps) out[`${to}#${n}`] = true
  }
  return out
}

/**
 * Los pasos marcados en el checklist clásico de Torrente Arcano (`checked[i]` es el paso i + 1):
 * los de la v4 o, sin ella, los de la v3 pasados a la numeración de ahora.
 */
export function readClassic(
  read: LegacyInput['read'],
  keys: { v4?: string | null; v3?: string | null },
  previous: number[][],
): number[] {
  const checked = (key?: string | null) => {
    if (!key) return null
    try {
      const value = JSON.parse(read(key) ?? 'null')
      return value && Array.isArray(value.checked) ? (value.checked as unknown[]) : null
    } catch {
      return null
    }
  }
  const v4 = checked(keys.v4)
  const source = v4 ?? checked(keys.v3)
  if (!source) return []
  const steps = source.flatMap((on, index) => (on === true ? [index + 1] : []))
  if (v4) return steps.filter((n) => n <= previous.length)
  const old = new Set(steps)
  return previous.flatMap((prev, index) => (prev.every((n) => old.has(n)) ? [index + 1] : []))
}

/** Suma una misión: una terminada no se toca; si no, gana la que va más lejos. */
function addQuest(p: Progress, m: ChecklistModel, id: string, entry: QuestEntry) {
  const was = p.quests[id]
  const total = m.objectives[Number(id)] ?? 0
  const finished = (e?: QuestEntry) =>
    Boolean(e) && (e!.o === 'done' || (total > 0 && e!.o >= total))
  if (finished(was)) return
  if (was && !finished(entry) && typeof was.o === 'number' && was.o >= (entry.o as number)) return
  p.quests[id] = entry
}

function migrateOwn(p: Progress, m: ChecklistModel, input: LegacyInput, prefix: string) {
  const { read, data, now } = input
  const legacy = data.legacy ?? {}
  const steps = data.steps
  const previous = Array.isArray(legacy.previousSteps)
    ? (legacy.previousSteps as number[][])
    : steps.map((_, index) => [index + 1])
  const key = (name: string) => `${prefix}${name}`

  let done = readObject(read, key('done'))
  let questPos = numbers(readObject(read, key('questPos')))
  let questObj = numbers(readObject(read, key('questObjective')))
  if (read(key('guide')) !== String(legacy.guideVersion ?? 1)) {
    ;({ done, questPos } = migrateProgress(done, questPos, previous))
  }
  if (read(key('questModel')) !== QUEST_MODEL && Object.keys(questPos).length) {
    const weights = Object.fromEntries(
      steps.map(([, n, quests], index) => [
        String(n ?? index + 1),
        {
          q: data.weights[index]?.[1] ?? [],
          ids: quests.map(([id]) => String(id)),
          os: quests.map(([id]) => data.objectives[id] ?? 0),
        },
      ]),
    )
    questObj = migrateQuestPos(questPos, questObj, weights)
  }
  // El clásico se traía una sola vez: si ya vino, lo desmarcado después se respeta.
  if (!read(key('classicImported'))) {
    const classicKeys = (legacy.classicKeys ?? {}) as { v4?: string; v3?: string }
    for (const n of readClassic(read, classicKeys, previous)) done[n] = true
  }

  const by = { c: m.id }
  for (const [id, k] of Object.entries(questObj)) {
    const total = m.objectives[Number(id)] ?? 0
    if (k > 0) addQuest(p, m, id, { o: total > 0 && k >= total ? 'done' : k, by, at: now })
  }

  const indexOf = new Map(steps.map(([, n], index) => [n ?? index + 1, index]))
  const marked = Object.keys(done)
    .filter((n) => done[n] === true)
    .flatMap((n) => {
      const index = indexOf.get(Number(n))
      return index === undefined ? [] : [index]
    })
  Object.assign(p, markSteps(p, m, marked, now))

  for (const [name, on] of Object.entries(readObject(read, key('prereqs')))) {
    const id = `${m.id}:${name}`
    if (on === true && !p.prereqs[id]) p.prereqs[id] = now
  }

  let owned = readObject(read, key('owned'))
  if (read(key('ownedModel')) !== OWNED_MODEL) {
    owned = migrateOwned(owned, ((legacy as { ownedMoves?: Moves }).ownedMoves ?? {}) as Moves)
  }
  for (const [name, on] of Object.entries(owned)) {
    if (on !== true) continue
    const [item, n] = name.split('#')
    const index = n === undefined ? undefined : indexOf.get(Number(n))
    if (n !== undefined && index === undefined) continue
    const ownedKey = index === undefined ? item : `${item}#${steps[index][0]}`
    p.owned[ownedKey] ??= now
  }
}

/** Lo que se comparte entre checklists: los objetos conseguidos enteros, con claves simples. */
const sharedOwned = (keys: string[]) => keys.filter((key) => !/[#@|]/.test(key))

function migrateOthers(p: Progress, m: ChecklistModel, input: LegacyInput, id: string) {
  const { read, data, now } = input
  const by = { c: data.legacyIds[id] ?? id }
  for (const [quest, k] of Object.entries(numbers(readObject(read, `${id}:questObjective`)))) {
    const total = m.objectives[Number(quest)] ?? 0
    if (k > 0) addQuest(p, m, quest, { o: total > 0 && k >= total ? 'done' : k, by, at: now })
  }
  const owned = readObject(read, `${id}:owned`)
  for (const key of sharedOwned(Object.keys(owned).filter((key) => owned[key] === true))) {
    p.owned[key] ??= now
  }
}

function migrateShared(p: Progress, m: ChecklistModel, input: LegacyInput, own: string | null) {
  const { read, data, now } = input
  const all = readObject(read, SHARED_KEY)
  for (const [id, entry] of Object.entries(all)) {
    // Lo de esta checklist ya llega, con sus pasos, de sus propias claves.
    if (id === own || !entry || typeof entry !== 'object') continue
    const { quests, owned } = entry as { quests?: unknown; owned?: unknown }
    const by = { c: data.legacyIds[id] ?? id }
    for (const quest of Array.isArray(quests) ? quests : []) {
      if (typeof quest === 'number' || typeof quest === 'string') {
        addQuest(p, m, String(quest), { o: 'done', by, at: now })
      }
    }
    for (const key of sharedOwned(Array.isArray(owned) ? owned.map(String) : [])) {
      p.owned[key] ??= now
    }
  }
}

/**
 * Suma a `progress` lo que haya de silvestre-checklist sin migrar y apunta qué migró. Sin nada
 * pendiente devuelve el mismo progreso.
 */
export function migrateLegacy(progress: Progress, input: LegacyInput): Progress {
  const prefix = input.data.legacy?.prefix ?? null
  const own = prefix ? prefix.replace(/:$/, '') : null
  const pending = [...new Set(input.keys.flatMap((key) => legacySource(key, own) ?? []))].filter(
    (source) => !progress.migrated[source],
  )
  if (!pending.length) return progress

  const m = checklistModel(input.data)
  const p: Progress = {
    ...progress,
    quests: { ...progress.quests },
    steps: { ...progress.steps },
    prereqs: { ...progress.prereqs },
    owned: { ...progress.owned },
    migrated: { ...progress.migrated },
  }
  if (own && prefix && pending.includes(own)) migrateOwn(p, m, input, prefix)
  if (pending.includes('shared')) migrateShared(p, m, input, own)
  for (const source of pending) {
    if (source.endsWith(':quests')) migrateOthers(p, m, input, source.slice(0, -':quests'.length))
  }
  for (const source of pending) p.migrated[source] = input.now
  return p
}

export { QUESTS_ONLY }
