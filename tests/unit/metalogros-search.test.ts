import { describe, expect, it } from 'vitest'

import {
  markMatches,
  searchIndex,
  searchWords,
  type IndexSearchData,
} from '@/lib/achievements/metalogros-search'

const data: IndexSearchData = {
  z: [
    ['Misiones de Mundo', 'misiones-de-mundo', '22 logros · 151 misiones'],
    ['Astrub', 'astrub', '7 logros · 50 misiones'],
    ['Misiones de templo', 'misiones-de-templo', '39 misiones', 1],
  ],
  a: [
    ['La ocasión hace al ladrón', 'Astrub', '/la-ocasion-hace-al-ladron', 3],
    ['La gran biblioteca', 'Astrub', '/la-gran-biblioteca', 4, 1],
  ],
  q: [
    ['Esto hace aguas', 1, 0],
    ['Seis pies bajo tierra', 2, 0],
  ],
}

describe('searchWords', () => {
  it('pliega tildes y mayúsculas y quita las palabras pequeñas', () => {
    expect(searchWords('Misiones DEL múndo')).toEqual(['misiones', 'mundo'])
  })

  it('si solo hay palabras pequeñas, las usa', () => {
    expect(searchWords('de la')).toEqual(['de', 'la'])
  })
})

describe('searchIndex', () => {
  it('«misiones del mundo» encuentra «Misiones de Mundo»', () => {
    expect(searchIndex(data, 'misiones del mundo').map((r) => r.name)).toEqual([
      'Misiones de Mundo',
    ])
  })

  it('zonas, logros y misiones, en ese orden; una misión lleva a su logro', () => {
    const results = searchIndex(data, 'ocasion')
    expect(results).toEqual([
      expect.objectContaining({
        kind: 'achievement',
        name: 'La ocasión hace al ladrón',
        href: '/la-ocasion-hace-al-ladron',
      }),
    ])
    const quest = searchIndex(data, 'aguas')[0]!
    expect(quest).toMatchObject({ kind: 'quest', href: '/la-ocasion-hace-al-ladron' })
    expect(quest.meta).toBe('→ misión 1 de La ocasión hace al ladrón · Astrub')
    expect(searchIndex(data, 'astrub')[0]).toMatchObject({ kind: 'zone', href: '#astrub' })
  })

  it('lo que está En preparación sale, marcado como no elegible', () => {
    expect(searchIndex(data, 'templo')[0]).toMatchObject({ name: 'Misiones de templo', off: true })
    expect(searchIndex(data, 'biblioteca')[0]).toMatchObject({ off: true })
  })

  it('con menos de dos letras, nada', () => {
    expect(searchIndex(data, 'a')).toEqual([])
  })
})

describe('markMatches', () => {
  it('marca cada coincidencia sin tildes y escapa el resto', () => {
    expect(markMatches('La ocasión <b>', ['ocasion'])).toBe('La <mark>ocasión</mark> &lt;b&gt;')
  })
})
