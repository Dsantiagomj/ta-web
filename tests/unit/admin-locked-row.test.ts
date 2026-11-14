import { describe, expect, it } from 'vitest'

import { isSavedRowValue, lockedRowValue } from '@/lib/admin/locked-row'

// La clave de un prerrequisito queda fija cuando su fila ya está guardada (backlog A-23).
describe('isSavedRowValue', () => {
  const saved = {
    prerequisites: {
      groups: [
        { id: 'g1', rows: [{ id: 'r1', key: 'nivel-200' }] },
        {
          id: 'g2',
          rows: [
            { id: 'r2', key: 'alineamiento' },
            { id: 'r3', key: '' },
          ],
        },
      ],
    },
  }

  it('una fila guardada con su valor queda fija, aunque haya cambiado de sitio', () => {
    expect(isSavedRowValue(saved, 'prerequisites.groups.0.rows.0.key', 'r1')).toBe(true)
    // Movida al otro grupo antes de guardar: sigue siendo la misma fila.
    expect(isSavedRowValue(saved, 'prerequisites.groups.1.rows.4.key', 'r1')).toBe(true)
  })

  it('una fila nueva, o guardada sin valor, se puede escribir', () => {
    expect(isSavedRowValue(saved, 'prerequisites.groups.0.rows.1.key', 'nueva')).toBe(false)
    expect(isSavedRowValue(saved, 'prerequisites.groups.1.rows.1.key', 'r3')).toBe(false)
    expect(isSavedRowValue(saved, 'prerequisites.groups.0.rows.0.key', undefined)).toBe(false)
    expect(isSavedRowValue(undefined, 'prerequisites.groups.0.rows.0.key', 'r1')).toBe(false)
  })
})

describe('lockedRowValue (el servidor)', () => {
  const saved = {
    prerequisites: {
      groups: [
        { id: 'g1', rows: [{ id: 'r1', key: 'nivel-200' }] },
        { id: 'g2', rows: [{ id: 'r2', key: 'alineamiento' }] },
      ],
    },
  }
  const path = (group: number, row: number) => [
    'prerequisites',
    'groups',
    group,
    'rows',
    row,
    'key',
  ]
  const incoming = (rows: { id?: string; key: string }[][]) => ({
    prerequisites: { groups: rows.map((group) => ({ rows: group })) },
  })

  it('una fila guardada se queda con su clave aunque se mueva a otro grupo', () => {
    const data = incoming([
      [],
      [
        { id: 'r2', key: 'alineamiento' },
        { id: 'r1', key: 'otra' },
      ],
    ])
    expect(
      lockedRowValue({ saved, incoming: data, path: path(1, 1), rowId: 'r1', value: 'otra' }),
    ).toBe('nivel-200')
  })

  it('una fila nueva, con un id que nunca se guardó, lleva la suya', () => {
    const data = incoming([
      [
        { id: 'r1', key: 'nivel-200' },
        { id: 'nueva', key: 'nivel-100' },
      ],
    ])
    expect(
      lockedRowValue({
        saved,
        incoming: data,
        path: path(0, 1),
        rowId: 'nueva',
        value: 'nivel-100',
      }),
    ).toBe('nivel-100')
  })

  it('sin id, no le cambia la clave a la fila guardada de su sitio', () => {
    const data = incoming([[{ key: 'otra' }], [{ id: 'r2', key: 'alineamiento' }]])
    expect(
      lockedRowValue({ saved, incoming: data, path: path(0, 0), rowId: undefined, value: 'otra' }),
    ).toBe('nivel-200')
  })

  it('sin id, una clave que ya estaba guardada la identifica', () => {
    // La importación reescribe las filas sin id y con las mismas claves.
    const data = incoming([[{ key: 'alineamiento' }], [{ key: 'nivel-200' }]])
    expect(
      lockedRowValue({
        saved,
        incoming: data,
        path: path(0, 0),
        rowId: undefined,
        value: 'alineamiento',
      }),
    ).toBe('alineamiento')
  })

  it('sin id, una fila nueva que empuja a las demás lleva su clave', () => {
    // La clave guardada en su sitio sigue en otra fila: no se pierde nada.
    const data = incoming([[{ key: 'nueva' }, { key: 'nivel-200' }], [{ key: 'alineamiento' }]])
    expect(
      lockedRowValue({ saved, incoming: data, path: path(0, 0), rowId: undefined, value: 'nueva' }),
    ).toBe('nueva')
  })

  it('sin id, al final de un grupo, es una fila nueva aunque otra fila intente cambiar su clave', () => {
    // La fila guardada r1 sigue (con su id) y se queda con su clave: la nueva lleva la suya.
    const data = incoming([
      [{ id: 'r1', key: 'otra' }, { key: 'nivel-100' }],
      [{ id: 'r2', key: 'alineamiento' }],
    ])
    expect(
      lockedRowValue({
        saved,
        incoming: data,
        path: path(0, 1),
        rowId: undefined,
        value: 'nivel-100',
      }),
    ).toBe('nivel-100')
  })

  it('sin id, en el sitio de una fila guardada que sigue en otro grupo, es nueva', () => {
    const data = incoming([
      [{ key: 'nueva' }],
      [
        { id: 'r2', key: 'alineamiento' },
        { id: 'r1', key: 'nivel-200' },
      ],
    ])
    expect(
      lockedRowValue({ saved, incoming: data, path: path(0, 0), rowId: undefined, value: 'nueva' }),
    ).toBe('nueva')
  })
})
