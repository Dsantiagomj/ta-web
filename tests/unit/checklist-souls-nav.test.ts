import { describe, expect, it } from 'vitest'

import {
  neighbours,
  pickKey,
  readSoulsHash,
  shownKeys,
  soulsHash,
  tallies,
  type NavGroup,
} from '@/lib/checklists/souls-nav'

// La navegación de la checklist de almas (el Ocre): las etapas o las regiones al lado, una a la
// vez, con lo que se tiene de cada una según el tipo elegido, anterior y siguiente, y lo elegido
// en la dirección (#etapa=3&tipo=jefes), que sobrevive a recargar y sirve de enlace.

const groups: NavGroup[] = [
  {
    key: '1',
    souls: [
      { id: 1, type: 'boss' },
      { id: 2, type: 'boss' },
    ],
  },
  {
    key: '2',
    souls: [
      { id: 3, type: 'archi' },
      { id: 4, type: 'archi' },
      { id: 5, type: 'archi' },
    ],
  },
  {
    key: '3',
    souls: [
      { id: 6, type: 'boss' },
      { id: 7, type: 'archi' },
    ],
  },
]
const owned = new Set([1, 3, 7])
const has = (id: number) => owned.has(id)

describe('tallies', () => {
  it('lo que se tiene de cada grupo, contando solo las almas del tipo elegido', () => {
    expect(Object.fromEntries(tallies(groups, has, 'all'))).toEqual({
      '1': { owned: 1, total: 2 },
      '2': { owned: 1, total: 3 },
      '3': { owned: 1, total: 2 },
    })
    expect(Object.fromEntries(tallies(groups, has, 'boss'))).toEqual({
      '1': { owned: 1, total: 2 },
      '2': { owned: 0, total: 0 },
      '3': { owned: 0, total: 1 },
    })
  })
})

describe('shownKeys', () => {
  it('los grupos con almas del tipo elegido, en su orden', () => {
    expect(shownKeys(groups, 'all')).toEqual(['1', '2', '3'])
    expect(shownKeys(groups, 'boss')).toEqual(['1', '3'])
    expect(shownKeys(groups, 'archi')).toEqual(['2', '3'])
  })
})

describe('pickKey', () => {
  it('el grupo pedido si se ve; si no, el primero que se ve', () => {
    expect(pickKey(['1', '3'], '3')).toBe('3')
    expect(pickKey(['1', '3'], '2')).toBe('1')
    expect(pickKey(['1', '3'], null)).toBe('1')
    expect(pickKey([], '1')).toBeNull()
  })
})

describe('neighbours', () => {
  it('el anterior y el siguiente entre los que se ven', () => {
    expect(neighbours(['1', '2', '3'], '2')).toEqual({ prev: '1', next: '3' })
    expect(neighbours(['1', '3'], '1')).toEqual({ prev: null, next: '3' })
    expect(neighbours(['1', '3'], '3')).toEqual({ prev: '1', next: null })
    expect(neighbours(['1', '3'], '2')).toEqual({ prev: null, next: null })
  })
})

describe('la dirección', () => {
  it('escribe la vista, el grupo y el tipo; «Todas» no se escribe', () => {
    expect(soulsHash({ by: 'stage', at: '3', type: 'boss' })).toBe('#etapa=3&tipo=jefes')
    expect(soulsHash({ by: 'region', at: 'Isla de Otomai', type: 'all' })).toBe(
      '#region=Isla+de+Otomai',
    )
    expect(soulsHash({ by: 'region', at: null, type: 'archi' })).toBe('#por=region&tipo=archis')
  })

  it('lee lo que escribe, y una dirección ajena no cambia nada', () => {
    expect(readSoulsHash('#etapa=3&tipo=jefes')).toEqual({ by: 'stage', at: '3', type: 'boss' })
    expect(readSoulsHash('#region=Isla+de+Otomai')).toEqual({ by: 'region', at: 'Isla de Otomai' })
    expect(readSoulsHash('#region=Bosque%20de%20Amakna&tipo=archis')).toEqual({
      by: 'region',
      at: 'Bosque de Amakna',
      type: 'archi',
    })
    expect(readSoulsHash('#por=region')).toEqual({ by: 'region' })
    expect(readSoulsHash('#contenido')).toEqual({})
    expect(readSoulsHash('')).toEqual({})
    expect(readSoulsHash('#tipo=dragones')).toEqual({})
  })
})
