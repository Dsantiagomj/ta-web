import { describe, expect, it } from 'vitest'

import { moveTo, outlineRows, stepOptions } from '@/lib/admin/step-outline'

// El esquema de los pasos de una checklist en el panel (A-18) y la lista de pasos que eligen
// «Pasos que termina», «También termina», «Avanza los pasos» y «La termina el paso» (A-19).
// Leen el estado del formulario de Payload: un campo por ruta («steps.0.zone»).

const form = {
  steps: { value: 3 },
  'steps.0.stepId': { value: 'a' },
  'steps.0.segments.0.text': { value: '  ' },
  'steps.0.segments.1.text': { value: 'Logro "De un mundo a otro". Completo.' },
  'steps.1.stepId': { value: 'b' },
  'steps.1.zone': { value: 'Anutropía' },
  'steps.2.segments.0.text': { value: 'Recién añadido, sin guardar.' },
}

describe('outlineRows', () => {
  it('cada paso con su número, su stepId y su nombre: el primer tramo con texto o su zona', () => {
    expect(outlineRows(form)).toEqual([
      { index: 0, stepId: 'a', label: 'Paso 1: Logro "De un mundo a otro". Completo.' },
      { index: 1, stepId: 'b', label: 'Paso 2: Anutropía' },
      { index: 2, stepId: null, label: 'Paso 3: Recién añadido, sin guardar.' },
    ])
  })

  it('sin pasos, nada', () => {
    expect(outlineRows({})).toEqual([])
  })
})

describe('stepOptions', () => {
  it('los pasos que ya tienen identificador, con su nombre; el que lo tendrá al guardar, no', () => {
    expect(stepOptions(form)).toEqual([
      { value: 'a', label: 'Paso 1: Logro "De un mundo a otro". Completo.' },
      { value: 'b', label: 'Paso 2: Anutropía' },
    ])
  })
})

describe('moveTo', () => {
  it('Alt con las flechas sube o baja un paso; Alt con Inicio o Fin lo lleva al extremo', () => {
    const key = (key: string, altKey = true) => ({ key, altKey })
    expect(moveTo(key('ArrowUp'), 2, 5)).toBe(1)
    expect(moveTo(key('ArrowDown'), 2, 5)).toBe(3)
    expect(moveTo(key('Home'), 2, 5)).toBe(0)
    expect(moveTo(key('End'), 2, 5)).toBe(4)
  })

  it('en el borde, o sin Alt, no se mueve', () => {
    expect(moveTo({ key: 'ArrowUp', altKey: true }, 0, 5)).toBeNull()
    expect(moveTo({ key: 'ArrowDown', altKey: true }, 4, 5)).toBeNull()
    expect(moveTo({ key: 'ArrowDown', altKey: false }, 1, 5)).toBeNull()
    expect(moveTo({ key: 'a', altKey: true }, 1, 5)).toBeNull()
  })
})
