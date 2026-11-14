import { describe, expect, it } from 'vitest'

import {
  legacyNeedGroup,
  snapshotWithGroups,
} from '../../src/migrations/20261114_141941_needs_group_select'

// La migración que convierte el nombre libre de los grupos de Necesitarás en la lista fija:
// los nombres de hoy pasan a su grupo y el resto a «otros». La copia de importSnapshot cambia
// igual, para que la importación siga viendo como suyos los grupos que Torre no tocó.

describe('legacyNeedGroup', () => {
  it('un nombre que ya es un grupo pasa a él, sin mayúsculas, tildes, cantidad ni «:»', () => {
    expect(legacyNeedGroup('Combates')).toBe('combates')
    expect(legacyNeedGroup('Mazmorras')).toBe('mazmorras')
    expect(legacyNeedGroup('1 x Mazmorra')).toBe('mazmorras')
    expect(legacyNeedGroup('Recursos')).toBe('recursos')
    expect(legacyNeedGroup('Oficios')).toBe('oficios')
    expect(legacyNeedGroup('Emotes')).toBe('emotes')
    expect(legacyNeedGroup('OTROS:')).toBe('otros')
  })

  it('un nombre que mezcla varias cosas, o ninguno, pasa a «otros»', () => {
    expect(legacyNeedGroup('Recursos y otras movidas')).toBe('otros')
    expect(legacyNeedGroup('Dependiendo de tu nivel')).toBe('otros')
    expect(legacyNeedGroup(null)).toBe('otros')
    expect(legacyNeedGroup('')).toBe('otros')
  })
})

describe('snapshotWithGroups', () => {
  it('cambia los nombres de los grupos de la copia y deja lo demás', () => {
    const snapshot = {
      name: 'Dofus Cacao',
      needs: { groups: [{ rows: [] }, { name: 'Emotes', rows: [{ blockType: 'needNote' }] }] },
    }
    expect(snapshotWithGroups(snapshot)).toEqual({
      name: 'Dofus Cacao',
      needs: {
        groups: [
          { name: 'otros', rows: [] },
          { name: 'emotes', rows: [{ blockType: 'needNote' }] },
        ],
      },
    })
  })

  it('una copia sin Necesitarás queda igual', () => {
    expect(snapshotWithGroups({ needs: null })).toEqual({ needs: null })
    expect(snapshotWithGroups(null)).toBeNull()
  })
})
