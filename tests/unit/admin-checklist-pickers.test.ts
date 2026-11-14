import { describe, expect, it } from 'vitest'

import {
  objectiveOptions,
  ownStepIndex,
  siblingPath,
  stepRefOptions,
} from '@/lib/admin/checklist-pickers'

// Los selectores del panel que sustituyen a copiar identificadores y contar objetivos desde 0
// (A-19): los pasos de la checklist por su nombre y los objetivos de la misión por su texto.

const form = {
  steps: { value: 3 },
  'steps.0.stepId': { value: 'a' },
  'steps.0.zone': { value: 'Anutropía' },
  'steps.1.stepId': { value: 'b' },
  'steps.1.segments.0.text': { value: 'Avanza hasta las muestras.' },
  'steps.2.stepId': { value: 'c' },
  'steps.2.segments.0.text': { value: 'Se termina la etapa 2.' },
}

describe('ownStepIndex y siblingPath', () => {
  it('el paso de un campo, por su ruta, y la ruta de un campo hermano', () => {
    expect(ownStepIndex('steps.2.segments.1.closes')).toBe(2)
    expect(ownStepIndex('steps.0.quests.3.optionalDoneBy')).toBe(0)
    expect(ownStepIndex('prerequisites.needs.0.prerequisite')).toBeNull()
    expect(siblingPath('steps.1.segments.1.stopObjective', 'quest')).toBe(
      'steps.1.segments.1.quest',
    )
    expect(siblingPath('steps.1.segments.1.more.0.stopObjective', 'quest')).toBe(
      'steps.1.segments.1.more.0.quest',
    )
  })
})

describe('stepRefOptions', () => {
  it('los demás pasos por su nombre: un paso no se elige a sí mismo', () => {
    expect(stepRefOptions(form, 'steps.2.segments.0.closes', [])).toEqual([
      { value: 'a', label: 'Paso 1: Anutropía' },
      { value: 'b', label: 'Paso 2: Avanza hasta las muestras.' },
    ])
  })

  it('un identificador guardado que ya no es de ningún paso sale como tal, para quitarlo', () => {
    expect(stepRefOptions(form, 'steps.0.closes', ['b', 'perdido']).at(-1)).toEqual({
      value: 'perdido',
      label: 'Un paso que ya no existe',
    })
  })
})

describe('objectiveOptions', () => {
  it('los objetivos de la misión, etapa tras etapa, numerados desde 1 y con su texto limpio', () => {
    const stages = [
      { objectives: [{ text: 'Ve a ver a {npc,264}' }] },
      { objectives: [{ text: 'Entrégale a Wello: 3 x {item,5}' }, { text: null }] },
    ]
    expect(objectiveOptions(stages)).toEqual([
      { value: '0', label: '1. Ve a ver a un PNJ' },
      { value: '1', label: '2. Entrégale a Wello: 3 x un objeto' },
      { value: '2', label: '3. Objetivo sin texto' },
    ])
    expect(objectiveOptions(null)).toEqual([])
  })
})
