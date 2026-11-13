import { describe, expect, it } from 'vitest'

import { populated, relationId } from '@/lib/checklists/relations'
import { fold } from '@/lib/text/fold'

describe('fold', () => {
  it('quita acentos y mayúsculas, como buscan la página y su isla', () => {
    expect(fold('Anutropía ÉPICA')).toBe('anutropia epica')
  })
})

describe('relationId y populated', () => {
  it('dan el ID de una relación poblada o no, y el documento solo si está poblada', () => {
    expect(relationId(7)).toBe(7)
    expect(relationId({ id: 8, name: 'x' })).toBe(8)
    expect(relationId(null)).toBeNull()
    expect(relationId({ id: 'no' })).toBeNull()
    expect(populated({ id: 8 })).toEqual({ id: 8 })
    expect(populated(8)).toBeNull()
  })
})
