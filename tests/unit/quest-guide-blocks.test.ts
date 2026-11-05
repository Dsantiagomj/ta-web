import type { BlocksField, Block, Field, SelectField } from 'payload'
import { describe, expect, it } from 'vitest'

import { CalloutBlock } from '@/blocks/CalloutBlock'
import { ImageBlock } from '@/blocks/ImageBlock'
import { RichTextBlock } from '@/blocks/RichTextBlock'
import { StepBlock, validateStepCoordinate } from '@/blocks/StepBlock'
import { validateVideoUrl, VideoBlock } from '@/blocks/VideoBlock'
import { guideStrings } from '@/lib/guides/strings'

/** Los campos del bloque, con los de las filas (row) sacados a su nivel, como los guarda Payload. */
function flat(fields: Field[]): Field[] {
  return fields.flatMap((candidate) =>
    candidate.type === 'row' ? flat(candidate.fields) : [candidate],
  )
}

function field(block: Block, name: string): Field {
  const found = flat(block.fields).find(
    (candidate) => 'name' in candidate && candidate.name === name,
  )
  if (!found) throw new Error(`Falta el campo ${name} en el bloque ${block.slug}`)
  return found
}

describe('bloque de texto', () => {
  it('usa el slug richText y guarda texto enriquecido obligatorio y traducible', () => {
    expect(RichTextBlock.slug).toBe('richText')
    expect(field(RichTextBlock, 'content')).toMatchObject({
      type: 'richText',
      required: true,
      localized: true,
    })
  })
})

describe('bloque de imagen', () => {
  it('usa el slug image y sube una imagen obligatoria a media', () => {
    expect(ImageBlock.slug).toBe('image')
    expect(field(ImageBlock, 'image')).toMatchObject({
      type: 'upload',
      relationTo: 'media',
      required: true,
    })
  })

  it('guarda un pie de foto opcional y traducible', () => {
    const caption = field(ImageBlock, 'caption')
    expect(caption).toMatchObject({ type: 'text', localized: true })
    expect(caption).not.toHaveProperty('required', true)
  })
})

describe('bloque de vídeo', () => {
  it('usa el slug video y guarda una URL https obligatoria', () => {
    expect(VideoBlock.slug).toBe('video')
    expect(field(VideoBlock, 'url')).toMatchObject({
      type: 'text',
      required: true,
      validate: validateVideoUrl,
    })
  })

  it('la ayuda del panel pide un enlace de YouTube y no ofrece otros sitios', () => {
    const description = (field(VideoBlock, 'url') as { admin?: { description?: unknown } }).admin
      ?.description
    expect(description).toMatch(/YouTube/)
    expect(description).not.toMatch(/otro sitio/)
  })

  it('guarda un título opcional y traducible', () => {
    const title = field(VideoBlock, 'title')
    expect(title).toMatchObject({ type: 'text', localized: true })
    expect(title).not.toHaveProperty('required', true)
  })
})

describe('validateVideoUrl', () => {
  it('acepta los enlaces de YouTube que se pegan en el panel', () => {
    for (const url of [
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      'https://youtu.be/dQw4w9WgXcQ',
      'https://www.youtube.com/embed/dQw4w9WgXcQ',
      'https://www.youtube.com/shorts/dQw4w9WgXcQ',
    ]) {
      expect(validateVideoUrl(url), url).toBe(true)
    }
  })

  it('rechaza los vídeos de otros sitios: los vídeos son solo de YouTube', () => {
    expect(validateVideoUrl('https://player.vimeo.com/video/123')).toMatch(/YouTube/)
    expect(validateVideoUrl('https://vimeo.com/76979871')).toMatch(/YouTube/)
  })

  it('rechaza un enlace de YouTube que no lleva a un vídeo', () => {
    expect(validateVideoUrl('https://www.youtube.com/channel/UC123')).toMatch(/YouTube/)
    expect(validateVideoUrl('https://www.youtube.com/watch?v=corto')).toMatch(/YouTube/)
  })

  it('rechaza una URL vacía, porque el vídeo es obligatorio', () => {
    expect(validateVideoUrl(undefined)).toMatch(/YouTube/)
    expect(validateVideoUrl(null)).toMatch(/YouTube/)
    expect(validateVideoUrl('')).toMatch(/YouTube/)
  })

  it('rechaza http y lo que no es una URL', () => {
    expect(validateVideoUrl('http://www.youtube.com/watch?v=dQw4w9WgXcQ')).toMatch(/YouTube/)
    expect(validateVideoUrl('youtube.com/watch?v=dQw4w9WgXcQ')).toMatch(/YouTube/)
  })
})

describe('bloque de aviso', () => {
  it('usa el slug callout y elige entre consejo, cuidado y alto', () => {
    expect(CalloutBlock.slug).toBe('callout')
    const variant = field(CalloutBlock, 'variant') as SelectField
    expect(variant).toMatchObject({ type: 'select', required: true, defaultValue: 'tip' })
    expect(variant.options).toEqual([
      { label: 'Consejo', value: 'tip' },
      { label: 'Cuidado', value: 'warning' },
      { label: 'Alto', value: 'stop' },
    ])
  })

  it('guarda texto enriquecido obligatorio y traducible', () => {
    expect(field(CalloutBlock, 'content')).toMatchObject({
      type: 'richText',
      required: true,
      localized: true,
    })
  })
})

describe('bloque de paso', () => {
  const s = guideStrings.admin.step

  it('usa el slug step y se llama Paso en el panel', () => {
    expect(StepBlock.slug).toBe('step')
    expect(StepBlock.labels).toEqual({ singular: s.singular, plural: s.plural })
  })

  it('guarda un título obligatorio y traducible', () => {
    expect(field(StepBlock, 'title')).toMatchObject({
      type: 'text',
      required: true,
      localized: true,
      label: s.title,
    })
  })

  it('guarda unas coordenadas opcionales, X e Y, como las de inicio del resumen', () => {
    for (const name of ['x', 'y']) {
      const coordinate = field(StepBlock, name)
      expect(coordinate).toMatchObject({ type: 'number', validate: validateStepCoordinate })
      expect(coordinate).not.toHaveProperty('required', true)
      expect(coordinate).not.toHaveProperty('localized', true)
    }
  })

  it('su contenido son los bloques de texto, imagen, vídeo y aviso, sin pasos dentro', () => {
    const body = field(StepBlock, 'body') as BlocksField
    expect(body).toMatchObject({ type: 'blocks', label: s.body })
    expect(body.blocks).toEqual([RichTextBlock, ImageBlock, VideoBlock, CalloutBlock])
  })
})

describe('validateStepCoordinate', () => {
  const check = (value: number | null | undefined, siblingData: { x?: unknown; y?: unknown }) =>
    validateStepCoordinate(value, { siblingData })

  it('acepta las dos coordenadas o ninguna', () => {
    expect(check(7, { x: 7, y: -19 })).toBe(true)
    expect(check(-19, { x: 7, y: -19 })).toBe(true)
    expect(check(null, { x: null, y: null })).toBe(true)
    expect(check(undefined, {})).toBe(true)
  })

  it('con solo una de las dos pide la que falta: el chip necesita X e Y', () => {
    expect(check(null, { x: 7, y: null })).toBe(guideStrings.admin.step.coordinatesPair)
    expect(check(undefined, { x: 7 })).toBe(guideStrings.admin.step.coordinatesPair)
    // La que sí está no lleva el error.
    expect(check(7, { x: 7, y: null })).toBe(true)
  })

  it('rechaza decimales: las coordenadas del juego son enteras', () => {
    expect(check(7.5, { x: 7.5, y: 1 })).toBe(guideStrings.admin.step.coordinatesInteger)
  })
})
