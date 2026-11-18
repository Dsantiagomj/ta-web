// La regla de la importación delta para una guía de misión ya importada, campo a campo (la de
// pnpm guides:summary-text): cambia a lo que da ahora su página de Squarespace solo lo que sigue
// como lo dejó la importación. Con snapshot, lo que sigue igual a él; sin snapshot (las guías
// de la primera importación), lo que es justo lo que la importación da de la página anterior
// (el inventario de entonces). Lo demás lo cambió Torre en el panel, u otra carga: se queda y se
// lista. Código puro: no lee ni escribe nada.
import { comparable, same, TRACKED_FIELDS, valueAt, type TrackedField } from '../load-quest-guides'

export type Snapshot = Partial<Record<TrackedField, unknown>>

export interface DeltaUpdateInput {
  /** La guía guardada (su última versión). */
  stored: unknown
  /** Su importSnapshot, o {} si no tiene. */
  snapshot: Snapshot
  /** Lo que la importación da de la página anterior y de la nueva, como se guardaría. */
  before: unknown
  after: unknown
}

export interface DeltaUpdate {
  changes: { field: TrackedField; from: unknown; to: unknown }[]
  /** Los campos que no siguen como los dejó la importación: de Torre, se quedan. */
  kept: TrackedField[]
  /** El snapshot después de guardar: lo que escribió la importación en cada campo suyo. */
  snapshot: Snapshot
}

export function deltaUpdate({ stored, snapshot, before, after }: DeltaUpdateInput): DeltaUpdate {
  const update: DeltaUpdate = { changes: [], kept: [], snapshot: { ...snapshot } }
  for (const field of TRACKED_FIELDS) {
    const current = valueAt(stored, field)
    const next = valueAt(after, field)
    if (same(current, next)) {
      update.snapshot[field] = comparable(next) ?? null
      continue
    }
    const imported = field in snapshot ? snapshot[field] : valueAt(before, field)
    if (!same(current, imported)) {
      update.kept.push(field)
      continue
    }
    update.changes.push({ field, from: current, to: next })
    update.snapshot[field] = comparable(next) ?? null
  }
  return update
}
