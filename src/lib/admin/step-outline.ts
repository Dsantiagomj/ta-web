// Los pasos de una checklist en el panel, leídos del estado del formulario de Payload (un
// campo por ruta, «steps.0.zone»): el esquema que los reordena (A-18). Sin React: lo usa
// src/components/admin/StepOutline.tsx.
import { stepRowLabel } from './row-labels'

type FormFields = Record<string, { value?: unknown } | undefined>

export interface OutlineRow {
  index: number
  /** El id de la fila en el formulario: no cambia al moverla y no se copia al duplicarla. */
  id: string | null
  /** Null si aún no se ha guardado: el hook se lo da al guardar. */
  stepId: string | null
  label: string
}

const STEP_FIELD = /^steps\.(\d+)\.(?:(id|stepId|zone)|segments\.(\d+)\.text)$/

const text = (value: unknown) => (typeof value === 'string' && value ? value : null)

/**
 * Cada paso del formulario, en su orden, con el id de su fila, su stepId y su nombre en la
 * lista. Una sola pasada por el formulario, que tiene un campo por ruta.
 */
export function outlineRows(fields: FormFields): OutlineRow[] {
  const count = Number(fields.steps?.value ?? 0)
  if (!Number.isInteger(count) || count <= 0) return []
  const rows = Array.from({ length: count }, () => ({
    id: null as unknown,
    stepId: null as unknown,
    zone: null as unknown,
    segments: [] as { at: number; text: unknown }[],
  }))
  for (const [path, field] of Object.entries(fields)) {
    const match = STEP_FIELD.exec(path)
    const row = match ? rows[Number(match[1])] : undefined
    if (!match || !row) continue
    if (match[2]) row[match[2] as 'id' | 'stepId' | 'zone'] = field?.value
    else row.segments.push({ at: Number(match[3]), text: field?.value })
  }
  return rows.map((row, index) => ({
    index,
    id: text(row.id),
    stepId: text(row.stepId),
    label: stepRowLabel(
      {
        segments: row.segments.sort((a, b) => a.at - b.at).map(({ text }) => ({ text })),
        zone: row.zone,
      },
      index,
    ),
  }))
}

/**
 * Lo que pinta el esquema, como texto: el componente se suscribe a esto y no a todo el
 * formulario, así que solo se vuelve a pintar si cambia un paso, no con cada tecla en otro campo.
 */
export const outlineSignature = (fields: FormFields) => JSON.stringify(outlineRows(fields))

/** El aviso de un paso movido, mientras el esquema siga como lo dejó ese movimiento. */
export const liveStatus = (
  moved: { message: string; signature: string } | null,
  signature: string,
) => (moved && moved.signature === signature ? moved.message : '')

/**
 * Adónde lleva el teclado un paso del esquema: Alt con las flechas lo sube o lo baja, Alt con
 * Inicio o Fin lo lleva al principio o al final. Null si no se mueve.
 */
export function moveTo(
  event: { key: string; altKey: boolean },
  index: number,
  count: number,
): number | null {
  if (!event.altKey) return null
  const target =
    event.key === 'ArrowUp'
      ? index - 1
      : event.key === 'ArrowDown'
        ? index + 1
        : event.key === 'Home'
          ? 0
          : event.key === 'End'
            ? count - 1
            : null
  if (target === null || target === index || target < 0 || target >= count) return null
  return target
}
