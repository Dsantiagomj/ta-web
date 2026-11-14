import { describe, expect, it } from 'vitest'

import {
  NEED_GROUPS,
  byNeedGroup,
  headingGroup,
  itemGroup,
  needGroupLabel,
} from '@/lib/dofus-guides/need-groups'

// Los grupos de Necesitarás de las guías de Dofus: una lista fija, en el orden de las guías
// que Torre tiene bien ordenadas (Domakuro, Moteado, Vulbis), con los nombres en español.

describe('NEED_GROUPS', () => {
  it('es la lista fija, en su orden', () => {
    expect(NEED_GROUPS).toEqual([
      'combates',
      'mazmorras',
      'recursos',
      'equipables',
      'consumibles',
      'oficios',
      'emotes',
      'logros',
      'otros',
    ])
  })

  it('cada grupo tiene su nombre en español', () => {
    expect(NEED_GROUPS.map(needGroupLabel)).toEqual([
      'Combates',
      'Mazmorras',
      'Recursos',
      'Equipables',
      'Consumibles',
      'Oficios',
      'Emotes',
      'Logros',
      'Otros',
    ])
  })

  it('ordena por la lista fija', () => {
    const groups = [{ name: 'otros' }, { name: 'recursos' }, { name: 'combates' }] as const
    expect([...groups].sort(byNeedGroup).map((group) => group.name)).toEqual([
      'combates',
      'recursos',
      'otros',
    ])
  })
})

describe('headingGroup', () => {
  it('el título de Torre que ya es un grupo, sin mayúsculas, tildes, cantidad ni «:»', () => {
    expect(headingGroup('Combates')).toBe('combates')
    expect(headingGroup('MAZMORRAS:')).toBe('mazmorras')
    expect(headingGroup('1 x Mazmorra')).toBe('mazmorras')
    expect(headingGroup('Recursos')).toBe('recursos')
    expect(headingGroup('Oficios')).toBe('oficios')
    expect(headingGroup('Emotes')).toBe('emotes')
    expect(headingGroup('Otros')).toBe('otros')
  })

  it('un título que mezcla varias cosas no es ningún grupo', () => {
    expect(headingGroup('Recursos y otras movidas')).toBeNull()
    expect(headingGroup('Otros detalles y oficios')).toBeNull()
    expect(headingGroup('Dependiendo de tu nivel')).toBeNull()
    expect(headingGroup(null)).toBeNull()
  })
})

describe('itemGroup', () => {
  it('por el supertipo del objeto en DofusDB', () => {
    expect(itemGroup(9)).toBe('recursos')
    expect(itemGroup(6)).toBe('consumibles')
    // Consumibles de combate: la Piedra de alma mediana.
    expect(itemGroup(70)).toBe('consumibles')
    // Arma, anillo, sombrero, capa, mascota (los dragopavos), Dofus.
    for (const superType of [1, 2, 3, 4, 5, 7, 10, 11, 12, 13]) {
      expect(itemGroup(superType)).toBe('equipables')
    }
  })

  it('un supertipo que no es ninguno de los tres, o sin supertipo, no se clasifica', () => {
    expect(itemGroup(14)).toBeNull()
    expect(itemGroup(26)).toBeNull()
    expect(itemGroup(null)).toBeNull()
    expect(itemGroup(undefined)).toBeNull()
  })
})
