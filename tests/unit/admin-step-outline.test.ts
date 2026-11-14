import { describe, expect, it } from 'vitest'

import { liveStatus, moveTo, outlineRows, outlineSignature } from '@/lib/admin/step-outline'

// El esquema de los pasos de una checklist en el panel (A-18). Lee el estado del formulario de
// Payload: un campo por ruta («steps.0.zone»).

const form = {
  steps: { value: 3 },
  'steps.0.id': { value: 'fila-a' },
  'steps.0.stepId': { value: 'a' },
  'steps.0.segments.0.text': { value: '  ' },
  'steps.0.segments.1.text': { value: 'Logro "De un mundo a otro". Completo.' },
  'steps.1.id': { value: 'fila-b' },
  'steps.1.stepId': { value: 'b' },
  'steps.1.zone': { value: 'Anutropía' },
  'steps.2.id': { value: 'fila-c' },
  'steps.2.segments.0.text': { value: 'Recién añadido, sin guardar.' },
  'steps.10.segments.0.text': { value: 'Fuera del recuento: no es un paso.' },
  name: { value: 'Otro campo del formulario' },
}

describe('outlineRows', () => {
  it('cada paso con el id de su fila, su stepId y su nombre: el primer tramo con texto o su zona', () => {
    expect(outlineRows(form)).toEqual([
      {
        index: 0,
        id: 'fila-a',
        stepId: 'a',
        label: 'Paso 1: Logro "De un mundo a otro". Completo.',
      },
      { index: 1, id: 'fila-b', stepId: 'b', label: 'Paso 2: Anutropía' },
      { index: 2, id: 'fila-c', stepId: null, label: 'Paso 3: Recién añadido, sin guardar.' },
    ])
  })

  it('sin pasos, nada', () => {
    expect(outlineRows({})).toEqual([])
  })

  it('la firma solo cambia con lo que pinta el esquema, no con otros campos', () => {
    const signature = outlineSignature(form)
    expect(outlineSignature({ ...form, name: { value: 'Cambiado' } })).toBe(signature)
    expect(outlineSignature({ ...form, 'steps.1.zone': { value: 'Sramvil' } })).not.toBe(signature)
    expect(JSON.parse(signature)).toEqual(outlineRows(form))
  })
})

describe('liveStatus', () => {
  it('el aviso de un paso movido vale mientras el esquema siga como lo dejó; después, nada', () => {
    const moved = { message: 'El paso 1 es ahora el 2.', signature: 'tras-mover' }
    expect(liveStatus(moved, 'tras-mover')).toBe('El paso 1 es ahora el 2.')
    expect(liveStatus(moved, 'otro-cambio')).toBe('')
    expect(liveStatus(null, 'lo-que-sea')).toBe('')
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
