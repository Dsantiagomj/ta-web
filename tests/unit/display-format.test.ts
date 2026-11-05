import { describe, expect, it } from 'vitest'

import { chainWindow, formatAmount } from '@/lib/guides/display'

describe('formatAmount', () => {
  it('separa los miles con un espacio que no parte la cifra', () => {
    expect(formatAmount(1)).toBe('1')
    expect(formatAmount(390)).toBe('390')
    expect(formatAmount(16380)).toBe('16 380')
    expect(formatAmount(3000000)).toBe('3 000 000')
  })
})

describe('chainWindow', () => {
  const quests = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']

  it('muestra la cadena entera si tiene cinco misiones o menos', () => {
    expect(chainWindow(['a', 'b', 'c'], 1)).toEqual(['a', 'b', 'c'])
    expect(chainWindow(quests.slice(0, 5), 4)).toEqual(['a', 'b', 'c', 'd', 'e'])
  })

  it('en una cadena larga deja la primera, la anterior, la actual, la siguiente y la última', () => {
    expect(chainWindow(quests, 4)).toEqual(['a', null, 'd', 'e', 'f', null, 'h'])
  })

  it('no pone huecos donde no falta ninguna misión', () => {
    expect(chainWindow(quests, 0)).toEqual(['a', 'b', null, 'h'])
    expect(chainWindow(quests, 1)).toEqual(['a', 'b', 'c', null, 'h'])
    expect(chainWindow(quests, 7)).toEqual(['a', null, 'g', 'h'])
  })
})
