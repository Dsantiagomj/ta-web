import type { Block, Field, SelectField } from 'payload'
import { describe, expect, it } from 'vitest'

import { CalloutBlock } from '@/blocks/CalloutBlock'
import { ImageBlock } from '@/blocks/ImageBlock'
import { RichTextBlock } from '@/blocks/RichTextBlock'
import { validateVideoUrl, VideoBlock } from '@/blocks/VideoBlock'

function field(block: Block, name: string): Field {
  const found = block.fields.find((candidate) => 'name' in candidate && candidate.name === name)
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

  it('guarda un título opcional y traducible', () => {
    const title = field(VideoBlock, 'title')
    expect(title).toMatchObject({ type: 'text', localized: true })
    expect(title).not.toHaveProperty('required', true)
  })
})

describe('validateVideoUrl', () => {
  it('acepta una URL https de YouTube o de otro sitio', () => {
    expect(validateVideoUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(true)
    expect(validateVideoUrl('https://player.vimeo.com/video/123')).toBe(true)
  })

  it('rechaza una URL vacía, porque el vídeo es obligatorio', () => {
    expect(validateVideoUrl(undefined)).toMatch(/URL/)
    expect(validateVideoUrl(null)).toMatch(/URL/)
    expect(validateVideoUrl('')).toMatch(/URL/)
  })

  it('rechaza http y lo que no es una URL', () => {
    expect(validateVideoUrl('http://www.youtube.com/watch?v=dQw4w9WgXcQ')).toMatch(/https/)
    expect(validateVideoUrl('youtube.com/watch?v=dQw4w9WgXcQ')).toMatch(/https/)
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
