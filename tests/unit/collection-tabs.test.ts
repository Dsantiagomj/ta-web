import type { Field } from 'payload'
import { describe, expect, it } from 'vitest'

import { placeInTabs } from '@/collections/field-tabs'

// Las pestañas de un paso solo colocan campos: uno que no esté en ninguna desaparecería del
// esquema, y la próxima migración borraría su columna. placeInTabs para con un error antes.

const text = (name: string): Field => ({ name, type: 'text' })
const fields = [text('zone'), text('note'), text('banner')]

describe('placeInTabs', () => {
  it('cada campo en su pestaña, en el orden de la pestaña', () => {
    expect(
      placeInTabs(fields, [
        { label: 'Texto', names: ['note', 'zone'] },
        { label: 'Imágenes', names: ['banner'] },
      ]).tabs.map((tab) => [tab.label, tab.fields.map((f) => ('name' in f ? f.name : null))]),
    ).toEqual([
      ['Texto', ['note', 'zone']],
      ['Imágenes', ['banner']],
    ])
  })

  it('un campo que no está en ninguna pestaña, o está en dos, o no existe, para con un error', () => {
    expect(() => placeInTabs(fields, [{ label: 'Texto', names: ['zone', 'note'] }])).toThrow(
      /banner/,
    )
    expect(() =>
      placeInTabs(fields, [
        { label: 'Texto', names: ['zone', 'note', 'banner'] },
        { label: 'Otra', names: ['note'] },
      ]),
    ).toThrow(/note/)
    expect(() =>
      placeInTabs(fields, [{ label: 'Texto', names: ['zone', 'note', 'banner', 'icon'] }]),
    ).toThrow(/icon/)
  })
})
