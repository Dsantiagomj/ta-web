// El identificador de cada paso de una checklist es la clave de su progreso (AGENTS.md,
// Members and progress): se genera una vez y no cambia al editar, reordenar ni reimportar.
// Sin dependencias de Payload, para probarlo solo.

import { randomUUID } from 'node:crypto'

/** Lo que identifica un paso: la fila del panel (id), su stepId y su número antiguo. */
export interface StepIdentity {
  id?: string | null
  stepId?: string | null
  legacyNumber?: number | null
}

const filled = (value: string | null | undefined): value is string =>
  typeof value === 'string' && value.trim() !== ''

/**
 * Los pasos con su stepId, en el mismo orden. Por orden de preferencia, cada paso se queda:
 * 1. con el de su fila guardada (el id de fila de Payload sobrevive a reordenar y editar),
 *    aunque llegue vacío o cambiado;
 * 2. con el que trae, si ningún otro paso lo tiene (una importación que ya lo conoce);
 * 3. con el del paso guardado de su mismo número antiguo (una reimportación sin filas);
 * 4. con uno nuevo.
 * Un identificador nunca se repite: una fila duplicada en el panel recibe uno nuevo.
 */
export function assignStepIds<T extends StepIdentity>(
  steps: readonly T[],
  previous: readonly StepIdentity[],
  newId: () => string = randomUUID,
): (T & { stepId: string })[] {
  const byRow = new Map<string, string>()
  const byLegacy = new Map<number, string>()
  for (const step of previous) {
    if (!filled(step.stepId)) continue
    if (filled(step.id)) byRow.set(step.id, step.stepId)
    if (step.legacyNumber != null) byLegacy.set(step.legacyNumber, step.stepId)
  }

  // Primero las filas guardadas: su identificador es suyo, vengan en el orden que vengan.
  const resolved: (string | null)[] = steps.map((step) =>
    filled(step.id) ? (byRow.get(step.id) ?? null) : null,
  )
  const taken = new Set(resolved.filter(filled))

  const claim = (candidate: string | null | undefined): string | null => {
    if (!filled(candidate) || taken.has(candidate)) return null
    taken.add(candidate)
    return candidate
  }

  return steps.map((step, index) => {
    const stepId =
      resolved[index] ??
      claim(step.stepId) ??
      claim(step.legacyNumber != null ? byLegacy.get(step.legacyNumber) : null) ??
      claim(newId())!
    return { ...step, stepId }
  })
}
