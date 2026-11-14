// Los selectores de una checklist en el panel (A-19): en vez de copiar el identificador de un
// paso, se elige el paso por su nombre; en vez de contar los objetivos desde 0, se elige el
// objetivo por su texto, numerado desde 1 como en los errores. Lo guardado no cambia
// (identificadores y el índice desde 0). Sin React: lo usan StepRefField.tsx y
// StopObjectiveField.tsx en src/components/admin/.
import { objectiveText } from '../checklists/objective-text'
import { outlineRows } from './step-outline'
import { panelStrings } from './strings'

type FormFields = Record<string, { value?: unknown } | undefined>
type Option = { value: string; label: string }

const p = panelStrings.pickers

/** El paso al que pertenece un campo, por su ruta («steps.2.segments.0.closes» → 2), o null. */
export function ownStepIndex(path: string): number | null {
  const match = path.match(/^steps\.(\d+)\./)
  return match ? Number(match[1]) : null
}

/** La ruta de un campo hermano: la misma fila, otro nombre. */
export const siblingPath = (path: string, name: string) => path.replace(/[^.]+$/, name)

/**
 * Los pasos que se pueden elegir, por su nombre. Cada paso tiene identificador desde que se
 * añade (su valor por defecto), así que uno nuevo se elige sin guardar antes.
 */
export const stepOptions = (fields: FormFields): Option[] =>
  outlineRows(fields).flatMap((row) =>
    row.stepId ? [{ value: row.stepId, label: row.label }] : [],
  )

/**
 * Los pasos como texto: el selector se suscribe a esto y no a todo el formulario, así que solo se
 * vuelve a pintar si cambia un paso.
 */
export const stepsSignature = (fields: FormFields) => JSON.stringify(stepOptions(fields))

/**
 * Las opciones de un campo de pasos: todos menos el suyo. Un identificador elegido que ya no es
 * de ningún paso sigue saliendo, para poder quitarlo.
 */
export function refOptions(steps: Option[], ownId: unknown, chosen: string[]): Option[] {
  const options = steps.filter((option) => option.value !== ownId)
  const known = new Set(options.map((option) => option.value))
  return [
    ...options,
    ...chosen
      .filter((id) => !known.has(id) && id !== ownId)
      .map((value) => ({ value, label: p.missingStep })),
  ]
}

/** refOptions leyendo los pasos y el propio del formulario entero. */
export function stepRefOptions(fields: FormFields, path: string, chosen: string[]): Option[] {
  const own = ownStepIndex(path)
  const ownId = own === null ? null : fields[`steps.${own}.stepId`]?.value
  return refOptions(stepOptions(fields), ownId, chosen)
}

type Stages = { objectives?: { text?: string | null }[] | null }[] | null | undefined

/** Los objetivos de una misión, etapa tras etapa: el valor es su índice desde 0, el de siempre. */
export function objectiveOptions(stages: Stages): Option[] {
  return (stages ?? [])
    .flatMap((stage) => stage.objectives ?? [])
    .map((objective, index) => ({
      value: String(index),
      label: `${index + 1}. ${objectiveText(objective.text) || p.emptyObjective}`,
    }))
}

/**
 * Las opciones del selector de objetivo con el guardado siempre presente: si ya no está entre
 * los de la misión (o aún no han cargado), sale como tal, para verlo y quitarlo.
 */
export function objectivePickerOptions(options: Option[], value: number | null): Option[] {
  if (value == null || options.some((option) => option.value === String(value))) return options
  return [...options, { value: String(value), label: p.staleObjective(value + 1) }]
}
