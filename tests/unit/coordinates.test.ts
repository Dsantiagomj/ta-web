import { describe, expect, it } from 'vitest'

import {
  formatCoordinates,
  parseCoordinates,
  splitCoordinates,
  travelCommand,
} from '@/lib/guides/coordinates'

describe('travelCommand', () => {
  it('da el comando /travel que activa el autopilotaje en el chat del juego', () => {
    expect(travelCommand({ x: 7, y: -19 })).toBe('/travel 7,-19')
    expect(travelCommand({ x: -1, y: 0 })).toBe('/travel -1,0')
  })
})

describe('formatCoordinates', () => {
  it('escribe las coordenadas como el juego, entre corchetes y sin espacios', () => {
    expect(formatCoordinates({ x: 7, y: -19 })).toBe('[7,-19]')
  })
})

describe('parseCoordinates', () => {
  it('lee [x,y] con signo y espacios opcionales', () => {
    expect(parseCoordinates('[7,-19]')).toEqual({ x: 7, y: -19 })
    expect(parseCoordinates('[ -1 , 17 ]')).toEqual({ x: -1, y: 17 })
  })

  it('rechaza lo que no son exactamente dos enteros entre corchetes', () => {
    for (const text of ['7,-19', '[7]', '[7,-19,3]', '[7.5,3]', '[1234,1]', '[a,b]', '']) {
      expect(parseCoordinates(text), text).toBeNull()
    }
  })
})

describe('splitCoordinates', () => {
  it('separa las coordenadas escritas en la prosa del texto que las rodea', () => {
    expect(splitCoordinates('Habla con Hupe Esse [7,-19] para empezar la misión.')).toEqual([
      'Habla con Hupe Esse ',
      { x: 7, y: -19 },
      ' para empezar la misión.',
    ])
  })

  it('encuentra varias y respeta el texto pegado a ellas', () => {
    expect(splitCoordinates('[1,-17] y luego [ 4 , -15 ].')).toEqual([
      { x: 1, y: -17 },
      ' y luego ',
      { x: 4, y: -15 },
      '.',
    ])
  })

  it('deja como texto lo que no son coordenadas', () => {
    const text = 'Nivel [20], pila [7.5,3], tres [1,2,3] y [1234,5].'
    expect(splitCoordinates(text)).toEqual([text])
  })

  it('devuelve una lista vacía para un texto vacío', () => {
    expect(splitCoordinates('')).toEqual([])
  })
})
