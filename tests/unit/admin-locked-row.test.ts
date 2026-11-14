import { describe, expect, it } from 'vitest'

import { isSavedRowValue } from '@/lib/admin/locked-row'

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
