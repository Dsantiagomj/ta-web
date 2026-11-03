import type { ArrayField, Field, SelectField } from 'payload'
import { describe, expect, it } from 'vitest'

import { Media, validateOptionalUrl } from '@/collections/Media'

function field(name: string, fields: Field[] = Media.fields): Field {
  const found = fields.find((candidate) => 'name' in candidate && candidate.name === name)
  if (!found) throw new Error(`Falta el campo ${name}`)
  return found
}

describe('colección media', () => {
  it('guarda el texto alternativo y los créditos, traducibles', () => {
    expect(field('alt')).toMatchObject({ type: 'text', required: true, localized: true })
    expect(field('credits')).toMatchObject({ type: 'text', localized: true })
  })

  it('guarda las variantes pregeneradas en R2 con clave, ancho y formato', () => {
    const variants = field('variants') as ArrayField
    expect(variants.type).toBe('array')
    expect(field('key', variants.fields)).toMatchObject({ type: 'text', required: true })
    expect(field('width', variants.fields)).toMatchObject({ type: 'number', required: true })
    const format = field('format', variants.fields) as SelectField
    expect(format).toMatchObject({ type: 'select', required: true })
    expect(
      format.options.map((option) => (typeof option === 'string' ? option : option.value)),
    ).toEqual(['avif', 'webp'])
  })

  it('guarda la URL original de Squarespace de las imágenes migradas', () => {
    expect(field('originalUrl')).toMatchObject({ type: 'text', validate: validateOptionalUrl })
  })
})

describe('validateOptionalUrl', () => {
  it('acepta vacío, porque las imágenes nuevas no vienen de Squarespace', () => {
    expect(validateOptionalUrl(undefined)).toBe(true)
    expect(validateOptionalUrl(null)).toBe(true)
    expect(validateOptionalUrl('')).toBe(true)
  })

  it('acepta URLs http y https', () => {
    expect(validateOptionalUrl('https://images.squarespace-cdn.com/content/v1/abc/zaap.png')).toBe(
      true,
    )
  })

  it('rechaza lo que no es una URL http o https', () => {
    expect(validateOptionalUrl('zaap.png')).toMatch(/URL/)
    expect(validateOptionalUrl('ftp://ejemplo.com/zaap.png')).toMatch(/URL/)
  })
})
