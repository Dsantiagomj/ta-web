import type { Field } from 'payload'
import { describe, expect, it } from 'vitest'

import { layoutFields } from './helpers/fields'

// El ayudante de las pruebas que deja solo los campos de datos de un formulario.

describe('layoutFields', () => {
  it('entra en filas, desplegables y pestañas sin nombre', () => {
    const fields: Field[] = [
      { type: 'row', fields: [{ name: 'a', type: 'text' }] },
      { type: 'collapsible', label: 'C', fields: [{ name: 'b', type: 'text' }] },
      { type: 'tabs', tabs: [{ label: 'T', fields: [{ name: 'c', type: 'text' }] }] },
    ]
    expect(layoutFields(fields).map((f) => ('name' in f ? f.name : f.type))).toEqual([
      'a',
      'b',
      'c',
    ])
  })

  it('una pestaña con nombre guarda sus campos dentro, como un grupo', () => {
    const fields: Field[] = [
      {
        type: 'tabs',
        tabs: [{ name: 'seo', label: 'SEO', fields: [{ name: 'd', type: 'text' }] }],
      },
    ]
    expect(layoutFields(fields)).toEqual([
      expect.objectContaining({
        type: 'group',
        name: 'seo',
        fields: [{ name: 'd', type: 'text' }],
      }),
    ])
  })
})
