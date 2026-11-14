import { describe, expect, it } from 'vitest'

import {
  legacyNeedGroup,
  snapshotDown,
  snapshotUp,
} from '../../src/migrations/20261114_153902_needs_group_select'

// La migración que pasa el nombre libre de los grupos de Necesitarás a la lista fija sin perder
// lo que escribió Torre: el nombre de siempre queda como subtítulo del grupo y down() lo
// devuelve. Un grupo sin nombre sigue sin grupo, en su sitio, hasta que la importación lo
// ordene. La copia de importSnapshot cambia igual, para que la importación siga viendo como
// suyos los grupos que Torre no tocó.

describe('legacyNeedGroup', () => {
  it('un nombre que ya es un grupo pasa a él, sin mayúsculas, tildes, cantidad ni «:»', () => {
    expect(legacyNeedGroup('Combates')).toBe('combates')
    expect(legacyNeedGroup('1 x Mazmorra')).toBe('mazmorras')
    expect(legacyNeedGroup('OTROS:')).toBe('otros')
  })

  it('un nombre que mezcla varias cosas pasa a «otros»; sin nombre, sin grupo', () => {
    expect(legacyNeedGroup('Recursos y otras movidas')).toBe('otros')
    expect(legacyNeedGroup('Dependiendo de tu nivel')).toBe('otros')
    expect(legacyNeedGroup(null)).toBeNull()
    expect(legacyNeedGroup('  ')).toBeNull()
  })
})

describe('snapshotUp y snapshotDown', () => {
  const before = {
    name: 'Dofus Cacao',
    needs: {
      groups: [
        { rows: [] },
        { name: 'Dependiendo de tu nivel', rows: [{ blockType: 'needNote' }] },
      ],
    },
  }
  const after = {
    name: 'Dofus Cacao',
    needs: {
      groups: [
        { rows: [] },
        { name: 'otros', subtitle: 'Dependiendo de tu nivel', rows: [{ blockType: 'needNote' }] },
      ],
    },
  }

  it('arriba: el grupo de la lista y el nombre de Torre como subtítulo', () => {
    expect(snapshotUp(before)).toEqual(after)
  })

  it('abajo: vuelve el nombre de Torre, tal cual', () => {
    expect(snapshotDown(after)).toEqual(before)
  })

  it('una copia sin Necesitarás queda igual', () => {
    expect(snapshotUp({ needs: null })).toEqual({ needs: null })
    expect(snapshotUp(null)).toBeNull()
  })
})
