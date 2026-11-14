// Los selectores de una checklist en el panel (A-19): en vez de copiar el identificador de un
// paso, se elige el paso por su nombre; en vez de contar los objetivos desde 0, se elige el
// objetivo por su texto. Lo guardado no cambia (identificadores y el índice desde 0). Sin
// React: lo usan src/components/admin/StepRefField.tsx y StopObjectiveField.tsx.
import { objectiveText } from '../checklists/objective-text'
import { stepOptions } from './step-outline'
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
 * Los pasos que puede elegir un campo: todos los guardados menos el suyo, por su nombre. Un
 * identificador elegido que ya no es de ningún paso sigue saliendo, para poder quitarlo.
 */
export function stepRefOptions(fields: FormFields, path: string, chosen: string[]): Option[] {
  const own = ownStepIndex(path)
  const ownId = own === null ? null : fields[`steps.${own}.stepId`]?.value
  const options = stepOptions(fields).filter((option) => option.value !== ownId)
  const known = new Set(options.map((option) => option.value))
  return [
    ...options,
    ...chosen
      .filter((id) => !known.has(id) && id !== ownId)
      .map((value) => ({ value, label: p.missingStep })),
  ]
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
