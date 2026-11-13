// El motor del progreso de una checklist: qué está hecho, qué se puede deshacer, qué pasa al
// marcar un paso o una misión y el porcentaje. Funciones puras sobre el progreso guardado
// (./store.ts) y la estructura que recibe la isla (ChecklistIslandData): cada cambio devuelve
// un progreso nuevo. Sin React ni DOM; lo prueba tests/unit.
//
// Una misión sale hecha, en este orden:
// 1. hecha en este paso: se puede deshacer;
// 2. hecha en otro paso: «Hecha en el paso N»;
// 3. la pide terminada otra misión hecha: «La pide “Y”»;
// 4. el paso está marcado: hecha, y se puede deshacer;
// 5. hecha en otra checklist (y aquí no): «Hecha en la checklist del Dofus X».
// Lo apuntado con el id antiguo de la checklist («nebuloso») es de esta misma checklist.
// Marcar el paso de un «detente aquí» deja su misión en el objetivo de la parada; la termina el
// paso que lo cierra. Una madre cuya hija para en el paso espera en el objetivo donde empieza
// la hija (PARENT de silvestre-checklist).
import type { ChecklistIslandData } from '../page'
import type { Progress, QuestEntry } from './store'

type Kind = 'mandatory' | 'optional' | 'take'

interface StepModel {
  id: string
  quests: { id: number; kind: Kind; stop?: number }[]
  w: number
  shares: number[]
}

export interface ChecklistModel {
  id: number
  /** Su id en silvestre-checklist («nebuloso»): lo apuntado con él también es de esta checklist. */
  legacyId: string | null
  steps: StepModel[]
  index: Map<string, number>
  /** Paso con «aquí se resuelve» → los pasos que cierra. */
  closes: Map<string, string[]>
  /** Los pasos que cierra otro. */
  closed: Set<string>
  objectives: Record<number, number>
  prereqs: Record<number, number[]>
  /** Al revés que `prereqs`: misión → las que la piden terminada. */
  requiredBy: Map<number, number[]>
  parents: Record<number, [number, number[]][]>
  names: Record<string, string>
  total: number
}

export type QuestLock = { step: number } | { checklist: string | null } | { need: number }

export interface QuestState {
  done: boolean
  /** Por qué no se puede deshacer aquí. */
  lock?: QuestLock
  /** A medias: el objetivo por el que va. */
  at?: number
  /** Una madre a medias: las hijas sin terminar que espera. */
  wait?: number[]
}

export function checklistModel(data: ChecklistIslandData): ChecklistModel {
  const steps = data.steps.map(([id, , quests], index): StepModel => {
    const [w, shares] = data.weights[index] ?? [1, []]
    return {
      id,
      quests: quests.map(([quest, kind, stop]) => ({
        id: quest,
        kind,
        ...(stop != null && { stop }),
      })),
      w,
      shares,
    }
  })
  const requiredBy = new Map<number, number[]>()
  for (const [quest, needs] of Object.entries(data.prereqs)) {
    for (const need of needs) {
      const list = requiredBy.get(need) ?? []
      list.push(Number(quest))
      requiredBy.set(need, list)
    }
  }
  return {
    id: data.checklistId,
    legacyId: data.legacy?.prefix?.replace(/:$/, '') || null,
    steps,
    index: new Map(steps.map((step, index) => [step.id, index])),
    closes: new Map(data.closes),
    closed: new Set(data.closes.flatMap(([, closed]) => closed)),
    objectives: data.objectives,
    prereqs: data.prereqs,
    requiredBy,
    parents: data.parents,
    names: data.checklists,
    total: steps.reduce((sum, step) => sum + step.w, 0),
  }
}

/** Si lo guardado da la misión por terminada: «done» o pasada de su último objetivo. */
export const finishedEntry = (m: ChecklistModel, id: number, entry?: QuestEntry) =>
  Boolean(entry) &&
  (entry!.o === 'done' || ((m.objectives[id] ?? 0) > 0 && entry!.o >= m.objectives[id]))

/** Si lo apuntado con `c` es de esta checklist: su ID o su id antiguo. */
export const isSelf = (m: ChecklistModel, c: number | string) => c === m.id || c === m.legacyId

/**
 * Un objetivo donde se queda una misión a medias (una parada, una madre que espera): nunca su
 * último, que la daría por terminada. Una parada después del último objetivo se queda en él.
 */
const parked = (m: ChecklistModel, id: number, at: number) => {
  const total = m.objectives[id] ?? 0
  return total > 0 ? Math.min(at, total - 1) : at
}

/** La misión hecha que pide terminada a `id`, o null. */
export function impliedBy(p: Progress, m: ChecklistModel, id: number): number | null {
  for (const other of m.requiredBy.get(id) ?? []) {
    if (finishedEntry(m, other, p.quests[other])) return other
  }
  return null
}

/** Terminada por cualquier camino: aquí, en otro paso, en otra checklist o porque otra la pide. */
export const questFinished = (p: Progress, m: ChecklistModel, id: number) =>
  finishedEntry(m, id, p.quests[id]) || impliedBy(p, m, id) !== null

export const stepDone = (p: Progress, m: ChecklistModel, index: number) =>
  p.steps[m.steps[index]?.id]?.done === true

export const stepsDone = (p: Progress, m: ChecklistModel) =>
  m.steps.filter((_, index) => stepDone(p, m, index)).length

/** El primer paso sin marcar, o -1. */
export const nextPending = (p: Progress, m: ChecklistModel) =>
  m.steps.findIndex((_, index) => !stepDone(p, m, index))

const mandatory = (step: StepModel) => step.quests.filter((quest) => quest.kind === 'mandatory')

/**
 * Lo que el paso deja a medias, con el objetivo donde se queda: la misión de su «detente aquí»
 * y la madre de una hija que se queda a medias, en el objetivo donde empieza esa hija. Un paso
 * que se resuelve en sí mismo (con «aquí se resuelve») no deja nada, salvo que otro lo cierre.
 */
function openIn(m: ChecklistModel, index: number): Map<number, number> {
  const step = m.steps[index]
  const quests = mandatory(step)
  const stops = !m.closes.has(step.id) || m.closed.has(step.id)
  const open = new Map(
    quests.flatMap((quest) =>
      stops && quest.stop != null ? [[quest.id, parked(m, quest.id, quest.stop)]] : [],
    ),
  )
  for (let grew = true; grew;) {
    grew = false
    for (const quest of quests) {
      if (open.has(quest.id)) continue
      const waits = (m.parents[quest.id] ?? []).find(([, kids]) =>
        kids.some((kid) => open.has(kid)),
      )
      if (waits) {
        open.set(quest.id, parked(m, quest.id, waits[0]))
        grew = true
      }
    }
  }
  return open
}

const allFinished = (p: Progress, m: ChecklistModel, index: number) => {
  const quests = mandatory(m.steps[index])
  return quests.length > 0 && quests.every((quest) => questFinished(p, m, quest.id))
}

export function questState(p: Progress, m: ChecklistModel, index: number, id: number): QuestState {
  const step = m.steps[index]
  const entry = p.quests[id]
  const finished = finishedEntry(m, id, entry)
  if (finished && (!entry.by || isSelf(m, entry.by.c))) {
    const other = entry.by?.s && entry.by.s !== step.id ? m.index.get(entry.by.s) : undefined
    return other === undefined ? { done: true } : { done: true, lock: { step: other + 1 } }
  }
  const need = impliedBy(p, m, id)
  if (need !== null) return { done: true, lock: { need } }
  const row = step.quests.find((quest) => quest.id === id)
  if (row?.kind === 'mandatory' && stepDone(p, m, index)) return { done: true }
  // Hecha en otra checklist, y aquí no
  if (finished) return { done: true, lock: { checklist: m.names[String(entry.by!.c)] ?? null } }
  const at = typeof entry?.o === 'number' && entry.o > 0 ? entry.o : undefined
  if (at === undefined) return { done: false }
  const wait = (m.parents[id] ?? [])
    .filter(([from]) => parked(m, id, from) === at)
    .flatMap(([, kids]) => kids)
    .filter((kid) => !questFinished(p, m, kid))
  return { done: false, at, ...(wait.length > 0 && { wait }) }
}

const copy = (p: Progress): Progress => ({
  ...p,
  quests: { ...p.quests },
  steps: { ...p.steps },
  prereqs: { ...p.prereqs },
  owned: { ...p.owned },
})

/**
 * Marca el paso sobre `next` (ya copiado): sus obligatorias, sus paradas y lo que deja a medias
 * en los que cierra. Con `markClosed`, un paso cerrado al que ya no le falta nada queda marcado.
 */
function mark(
  next: Progress,
  m: ChecklistModel,
  index: number,
  now: number,
  { markClosed = true, explicit = true } = {},
) {
  const step = m.steps[index]
  const by = { c: m.id, s: step.id }
  next.steps[step.id] = { done: true, at: now }
  const open = openIn(m, index)
  for (const quest of mandatory(step)) {
    // Marcado a mano, las que otra pide terminadas también se apuntan a este paso, para que se
    // desmarquen aquí. Marcado solo (al terminar sus misiones), siguen pedidas por la otra.
    const done = explicit
      ? finishedEntry(m, quest.id, next.quests[quest.id])
      : questFinished(next, m, quest.id)
    if (done) continue
    const stop = open.get(quest.id)
    const was = next.quests[quest.id]?.o
    next.quests[quest.id] =
      stop === undefined
        ? { o: 'done', by, at: now }
        : { o: Math.max(stop, typeof was === 'number' ? was : 0), by, at: now }
  }
  for (const closed of m.closes.get(step.id) ?? []) {
    const at = m.index.get(closed)
    if (at === undefined) continue
    for (const quest of openIn(m, at).keys()) {
      if (!questFinished(next, m, quest)) next.quests[quest] = { o: 'done', by, at: now }
    }
    if (!markClosed || stepDone(next, m, at)) continue
    if (allFinished(next, m, at) || !mandatory(m.steps[at]).length) {
      next.steps[closed] = { done: true, at: now }
    }
  }
}

/** Los pasos que con este cambio tienen todas sus obligatorias hechas quedan marcados. */
function complete(before: Progress, next: Progress, m: ChecklistModel, now: number): Progress {
  for (let round = 0; round < m.steps.length; round++) {
    const index = m.steps.findIndex(
      (_, at) => !stepDone(next, m, at) && allFinished(next, m, at) && !allFinished(before, m, at),
    )
    if (index < 0) break
    mark(next, m, index, now, { explicit: false })
  }
  return next
}

/**
 * Marca varios pasos tal cual, sin marcar ningún otro: para traer progreso de otro sitio (la
 * checklist antigua), donde lo marcado ya es lo que es.
 */
export function markSteps(
  p: Progress,
  m: ChecklistModel,
  indices: number[],
  now: number,
): Progress {
  const next = copy(p)
  for (const index of indices)
    if (m.steps[index] && !stepDone(next, m, index))
      mark(next, m, index, now, { markClosed: false })
  return next
}

export function setStep(
  p: Progress,
  m: ChecklistModel,
  index: number,
  on: boolean,
  now: number,
): Progress {
  const step = m.steps[index]
  if (!step || stepDone(p, m, index) === on) return p
  const next = copy(p)
  if (on) {
    mark(next, m, index, now)
    return complete(p, next, m, now)
  }
  next.steps[step.id] = { done: false, at: now }
  for (const [id, entry] of Object.entries(next.quests)) {
    if (entry.by && isSelf(m, entry.by.c) && entry.by.s === step.id) delete next.quests[id]
  }
  // Lo que este dejó terminado de los que cierra vuelve a su parada, si siguen marcados.
  for (const closed of m.closes.get(step.id) ?? []) {
    const at = m.index.get(closed)
    if (at === undefined || !stepDone(next, m, at)) continue
    for (const [quest, stop] of openIn(m, at)) {
      if (!questFinished(next, m, quest)) {
        next.quests[quest] = { o: stop, by: { c: m.id, s: closed }, at: now }
      }
    }
  }
  return next
}

export function setQuest(
  p: Progress,
  m: ChecklistModel,
  index: number,
  id: number,
  on: boolean,
  now: number,
): Progress {
  const step = m.steps[index]
  const state = questState(p, m, index, id)
  if (!step || state.lock || state.done === on) return p
  const next = copy(p)
  const by = { c: m.id, s: step.id }
  if (on) {
    next.quests[id] = { o: 'done', by, at: now }
    return complete(p, next, m, now)
  }
  // Lo hecho en otra checklist se queda: allí sigue hecha. Solo se quita lo de esta.
  const own = next.quests[id]
  if (!own?.by || isSelf(m, own.by.c)) delete next.quests[id]
  // Las de este paso que piden terminada a esta y apuntó este paso vuelven a lo suyo, como en
  // silvestre-checklist: sin ella no pueden estar terminadas.
  const dependents = new Set(m.requiredBy.get(id) ?? [])
  for (const quest of mandatory(step)) {
    const entry = next.quests[quest.id]
    if (dependents.has(quest.id) && entry?.by && isSelf(m, entry.by.c) && entry.by.s === step.id) {
      delete next.quests[quest.id]
    }
  }
  if (stepDone(next, m, index)) {
    // Desmarcar una misión de un paso hecho lo desmarca. Las demás quedan como las dejaba el
    // paso: terminadas, o en su parada las que se quedan a medias. Nunca se termina nada.
    next.steps[step.id] = { done: false, at: now }
    const open = openIn(m, index)
    for (const quest of mandatory(step)) {
      if (quest.id === id || dependents.has(quest.id)) continue
      if (questFinished(next, m, quest.id) || next.quests[quest.id]) continue
      const stop = open.get(quest.id)
      next.quests[quest.id] =
        stop === undefined ? { o: 'done', by, at: now } : { o: stop, by, at: now }
    }
  }
  return next
}

export function setPrereq(
  p: Progress,
  m: ChecklistModel,
  key: string,
  on: boolean,
  now: number,
): Progress {
  const prereqs = { ...p.prereqs }
  if (on) prereqs[`${m.id}:${key}`] = now
  else delete prereqs[`${m.id}:${key}`]
  return { ...p, prereqs }
}

export function setOwned(p: Progress, keys: string[], on: boolean, now: number): Progress {
  const owned = { ...p.owned }
  for (const key of keys) {
    if (on) owned[key] = now
    else delete owned[key]
  }
  return { ...p, owned }
}

/**
 * Lo hecho, pesado por el nivel de las misiones de cada paso: un paso marcado vale su peso y,
 * sin marcar, sus misiones terminadas. Con un decimal: 100 solo con todos los pasos marcados y
 * 0 solo sin nada, como silvestre-checklist.
 */
export function progressPct(p: Progress, m: ChecklistModel): number {
  let points = 0
  m.steps.forEach((step, index) => {
    if (stepDone(p, m, index)) {
      points += step.w
      return
    }
    step.quests.forEach((quest, at) => {
      if (step.shares[at] && questFinished(p, m, quest.id)) points += step.shares[at]
    })
  })
  if (!points || !m.total) return 0
  if (stepsDone(p, m) === m.steps.length) return 100
  return Math.min(99.9, Math.max(0.1, Math.round((points / m.total) * 1000) / 10))
}

export interface ResetChoice {
  steps: boolean
  prereqs: boolean
  owned: boolean
}

/**
 * Borra lo de esta checklist que se elija: sus pasos y las misiones que terminó, sus
 * prerrequisitos y los objetos de sus pasos (`wholeKeys`: los suyos marcados enteros). Lo de
 * las demás checklists no se toca.
 */
export function resetChecklist(
  p: Progress,
  m: ChecklistModel,
  choice: ResetChoice,
  wholeKeys: string[],
): Progress {
  const next = copy(p)
  if (choice.steps) {
    const route = new Set(m.steps.flatMap((step) => step.quests.map((quest) => String(quest.id))))
    for (const id of m.index.keys()) delete next.steps[id]
    for (const [id, entry] of Object.entries(next.quests)) {
      if (entry.by ? isSelf(m, entry.by.c) : route.has(id)) delete next.quests[id]
    }
  }
  if (choice.prereqs) {
    for (const key of Object.keys(next.prereqs)) {
      if (key.startsWith(`${m.id}:`)) delete next.prereqs[key]
    }
  }
  if (choice.owned) {
    const whole = new Set(wholeKeys)
    for (const key of Object.keys(next.owned)) {
      const step = key.split('#')[1]
      if (step ? m.index.has(step) : whole.has(key)) delete next.owned[key]
    }
  }
  return next
}
