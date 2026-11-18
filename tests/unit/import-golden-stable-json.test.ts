import { describe, expect, it } from 'vitest'

import { stableJson } from '../../scripts/import/golden/stable-json'

// Las salidas de oro se guardan como JSON legible: las claves en orden alfabético a cualquier
// profundidad, los arrays en su orden (es el orden de lectura de la página), sin los campos
// undefined y con salto de línea final, para que dos conversiones iguales den el mismo texto.

describe('stableJson', () => {
  it('ordena las claves a cualquier profundidad y deja los arrays en su orden', () => {
    const value = { b: 1, a: { d: [3, 1, 2], c: 'x' } }
    expect(stableJson(value)).toBe(
      '{\n  "a": {\n    "c": "x",\n    "d": [\n      3,\n      1,\n      2\n    ]\n  },\n  "b": 1\n}\n',
    )
  })

  it('da el mismo texto con las claves en otro orden', () => {
    expect(stableJson({ x: 1, y: { p: 1, q: 2 } })).toBe(stableJson({ y: { q: 2, p: 1 }, x: 1 }))
  })

  it('quita los campos undefined, también dentro de los arrays de objetos', () => {
    expect(JSON.parse(stableJson({ a: undefined, b: [{ c: undefined, d: 1 }] }))).toEqual({
      b: [{ d: 1 }],
    })
  })

  it('deja null, vacíos y textos con saltos de línea tal cual', () => {
    expect(JSON.parse(stableJson({ a: null, b: [], c: {}, d: 'uno\ndos' }))).toEqual({
      a: null,
      b: [],
      c: {},
      d: 'uno\ndos',
    })
  })

  it('rechaza lo que JSON no guarda igual: un Map o un número no finito', () => {
    expect(() => stableJson({ a: new Map() })).toThrow(/a/)
    expect(() => stableJson({ b: [Number.NaN] })).toThrow(/b\[0\]/)
  })
})
