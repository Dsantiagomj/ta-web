import { describe, expect, it } from 'vitest'

import { assignStepIds } from '@/lib/checklists/step-ids'

// El stepId es la clave del progreso de cada paso (AGENTS.md, Members and progress): se
// genera una vez y no cambia al editar, reordenar ni reimportar.

/** Identificadores predecibles para las pruebas: nuevo-1, nuevo-2… */
function counter() {
  let next = 0
  return () => `nuevo-${++next}`
}

const saved = [
  { id: 'fila-a', stepId: 'paso-a', legacyNumber: 1 },
  { id: 'fila-b', stepId: 'paso-b', legacyNumber: 2 },
  { id: 'fila-c', stepId: 'paso-c', legacyNumber: 3 },
]

describe('assignStepIds', () => {
  it('da un identificador nuevo a cada paso que no lo tiene', () => {
    const steps = assignStepIds(
      [
        { id: null, text: 'uno' },
        { id: null, text: 'dos' },
      ],
      [],
      counter(),
    )
    expect(steps.map((step) => step.stepId)).toEqual(['nuevo-1', 'nuevo-2'])
    expect(steps.map((step) => step.text)).toEqual(['uno', 'dos'])
  })

  it('al reordenar, cada paso conserva el suyo', () => {
    const reordered = [saved[2]!, saved[0]!, saved[1]!]
    const steps = assignStepIds(reordered, saved, counter())
    expect(steps.map((step) => step.stepId)).toEqual(['paso-c', 'paso-a', 'paso-b'])
  })

  it('una fila guardada recupera el suyo aunque llegue vacío o cambiado', () => {
    const edited = [
      { id: 'fila-a', stepId: null },
      { id: 'fila-b', stepId: 'otro-valor' },
      { id: 'fila-c' },
    ]
    const steps = assignStepIds(edited, saved, counter())
    expect(steps.map((step) => step.stepId)).toEqual(['paso-a', 'paso-b', 'paso-c'])
  })

  it('una fila duplicada en el panel recibe uno nuevo: dos pasos nunca comparten progreso', () => {
    const duplicated = [{ id: 'fila-copia', stepId: 'paso-a' }, ...saved]
    const steps = assignStepIds(duplicated, saved, counter())
    expect(steps.map((step) => step.stepId)).toEqual(['nuevo-1', 'paso-a', 'paso-b', 'paso-c'])
  })

  it('sin fila guardada, respeta el identificador que trae (una importación que lo conoce)', () => {
    const steps = assignStepIds([{ stepId: 'traido' }], saved, counter())
    expect(steps.map((step) => step.stepId)).toEqual(['traido'])
  })

  it('una reimportación sin filas recupera el de cada paso por su número antiguo', () => {
    const reimported = [{ legacyNumber: 2 }, { legacyNumber: 1 }, { legacyNumber: 4 }]
    const steps = assignStepIds(reimported, saved, counter())
    expect(steps.map((step) => step.stepId)).toEqual(['paso-b', 'paso-a', 'nuevo-1'])
  })

  it('un paso nuevo no puede quedarse con el identificador de otro paso guardado', () => {
    const steps = assignStepIds([{ stepId: 'paso-b' }, saved[1]!], saved, counter())
    expect(steps.map((step) => step.stepId)).toEqual(['nuevo-1', 'paso-b'])
  })

  it('una importación que reescribe las filas con sus identificadores los conserva', () => {
    const rewritten = saved.map(({ stepId, legacyNumber }) => ({ stepId, legacyNumber }))
    const steps = assignStepIds(rewritten, saved, counter())
    expect(steps.map((step) => step.stepId)).toEqual(['paso-a', 'paso-b', 'paso-c'])
  })
})
