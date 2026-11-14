// El progreso de una checklist de almas (el Ocre): las almas que se tienen, en `souls` de
// ta-web:progress, por el ID de DofusDB de su monstruo. Compartidas con cualquier otra checklist
// de almas. Funciones puras sobre el progreso guardado (./store.ts); lo prueba tests/unit.
import type { SoulsIslandData } from '../souls'
import type { Progress } from './store'

/** La clave antigua del Ocre en silvestre-checklist: la lista de almas marcadas. */
const COSECHA_DONE = 'cosecha:done'
const COSECHA = 'cosecha'

export function setSoul(p: Progress, id: number, on: boolean, now: number): Progress {
  const souls = { ...p.souls }
  if (on) souls[id] = now
  else delete souls[id]
  return { ...p, souls }
}

/** Cuántas almas de esta checklist se tienen. */
export const soulsDone = (p: Progress, data: SoulsIslandData) =>
  data.souls.filter((id) => p.souls[id] !== undefined).length

/** El porcentaje, con un decimal: 100 solo con todas y 0 solo sin ninguna. */
export function soulsPct(p: Progress, data: SoulsIslandData): number {
  const done = soulsDone(p, data)
  if (!done || !data.souls.length) return 0
  if (done === data.souls.length) return 100
  return Math.min(99.9, Math.max(0.1, Math.round((done / data.souls.length) * 1000) / 10))
}

/** Quita las almas de esta checklist; las de otras, si las hubiera, se quedan. */
export function resetSouls(p: Progress, data: SoulsIslandData): Progress {
  const mine = new Set(data.souls.map(String))
  return {
    ...p,
    souls: Object.fromEntries(Object.entries(p.souls).filter(([id]) => !mine.has(id))),
  }
}

export interface SoulsLegacyInput {
  keys: string[]
  read: (key: string) => string | null
  data: SoulsIslandData
  now: number
}

/** Las almas marcadas de «cosecha:done» (parseDone de src/tools/cosecha/souls.js). */
function parseDone(raw: string | null): number[] {
  try {
    const list = JSON.parse(raw ?? 'null')
    return Array.isArray(list) ? list.filter(Number.isInteger) : []
  } catch {
    return []
  }
}

/**
 * Trae una vez lo marcado en el Ocre de silvestre-checklist: suma, nunca quita, y no toca la
 * clave antigua. Solo las almas de esta checklist. Sin nada que traer devuelve lo mismo.
 */
export function migrateSouls(p: Progress, input: SoulsLegacyInput): Progress {
  if (p.migrated[COSECHA] || !input.keys.includes(COSECHA_DONE)) return p
  const mine = new Set(input.data.souls)
  const souls = { ...p.souls }
  for (const id of parseDone(input.read(COSECHA_DONE))) {
    if (mine.has(id)) souls[id] ??= input.now
  }
  return { ...p, souls, migrated: { ...p.migrated, [COSECHA]: input.now } }
}
