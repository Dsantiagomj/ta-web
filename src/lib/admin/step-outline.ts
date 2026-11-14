// Los pasos de una checklist en el panel, leídos del estado del formulario de Payload (un
// campo por ruta, «steps.0.zone»): el esquema que los reordena (A-18) y la lista de pasos que
// se eligen en vez de copiar identificadores (A-19). Sin React: lo usan
// src/components/admin/StepOutline.tsx y StepRefField.tsx.
import { stepRowLabel } from './row-labels'

type FormFields = Record<string, { value?: unknown } | undefined>

export interface OutlineRow {
  index: number
  /** Null si aún no se ha guardado: el hook se lo da al guardar. */
  stepId: string | null
  label: string
}

/** Los segmentos de un paso, como los quiere stepRowLabel: solo su texto. */
function segmentsOf(fields: FormFields, index: number) {
  const prefix = `steps.${index}.segments.`
  const texts = new Map<number, unknown>()
  for (const [path, field] of Object.entries(fields)) {
    if (!path.startsWith(prefix) || !path.endsWith('.text')) continue
    const at = Number(path.slice(prefix.length, -'.text'.length))
    if (Number.isInteger(at)) texts.set(at, field?.value)
  }
  return [...texts].sort(([a], [b]) => a - b).map(([, text]) => ({ text }))
}

/** Cada paso del formulario, en su orden, con su stepId y su nombre en la lista. */
export function outlineRows(fields: FormFields): OutlineRow[] {
  const count = Number(fields.steps?.value ?? 0)
  return Array.from({ length: Number.isInteger(count) ? count : 0 }, (_, index) => {
    const stepId = fields[`steps.${index}.stepId`]?.value
    return {
      index,
      stepId: typeof stepId === 'string' && stepId ? stepId : null,
      label: stepRowLabel(
        { segments: segmentsOf(fields, index), zone: fields[`steps.${index}.zone`]?.value },
        index,
      ),
    }
  })
}

/** Las opciones de un campo que elige pasos: los que ya tienen identificador. */
export const stepOptions = (fields: FormFields) =>
  outlineRows(fields).flatMap((row) =>
    row.stepId ? [{ value: row.stepId, label: row.label }] : [],
  )

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
