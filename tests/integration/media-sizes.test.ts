import { randomUUID } from 'node:crypto'
import { existsSync } from 'node:fs'
import path from 'node:path'

import type { Payload } from 'payload'
import sharp from 'sharp'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { mediaImageSizes } from '@/lib/media/sizes'
import type { Media } from '@/payload-types'

import { startPayload } from './payload'

// Sin R2 (tests/integration/env.ts), Payload guarda el original y sus variantes en ./media.
const MEDIA_DIR = path.resolve('media')

async function png(width: number, height: number) {
  const data = await sharp({
    create: { width, height, channels: 3, background: { r: 40, g: 90, b: 140 } },
  })
    .png()
    .toBuffer()
  return { data, mimetype: 'image/png', name: `captura-${randomUUID()}.png`, size: data.length }
}

const size = (media: Media, name: string) =>
  (media.sizes as Record<string, { filename?: string | null; width?: number | null }>)[name]

describe('variantes de media', () => {
  let payload: Payload

  beforeAll(async () => {
    payload = await startPayload()
  })

  afterAll(async () => {
    await payload.delete({ collection: 'media', where: { id: { exists: true } } })
    await payload.destroy()
  })

  it('al subir una imagen genera cada ancho en AVIF y WebP, junto al original', async () => {
    const media = await payload.create({
      collection: 'media',
      data: { alt: 'Captura ancha' },
      file: await png(1920, 1080),
    })
    for (const { name, width } of mediaImageSizes) {
      const variant = size(media, name) as Record<string, unknown>
      expect(variant.width).toBe(width)
      // La altura sigue la proporción del original.
      expect(variant.height).toBe(Math.round((width! * 1080) / 1920))
      expect(variant.mimeType).toBe(name.startsWith('avif') ? 'image/avif' : 'image/webp')
      expect(existsSync(path.join(MEDIA_DIR, variant.filename as string))).toBe(true)
    }
  })

  it('nunca amplía: los anchos mayores que el original se quedan vacíos', async () => {
    const media = await payload.create({
      collection: 'media',
      data: { alt: 'Captura de 1000px' },
      file: await png(1000, 500),
    })
    expect(size(media, 'webp-800').width).toBe(800)
    expect(size(media, 'webp-1200').filename).toBeNull()
    expect(size(media, 'avif-1600').filename).toBeNull()
  })

  it('una imagen más estrecha que 480 tiene su AVIF y su WebP a su propio ancho', async () => {
    const media = await payload.create({
      collection: 'media',
      data: { alt: 'Icono' },
      file: await png(96, 96),
    })
    expect(size(media, 'webp-480').width).toBe(96)
    expect(size(media, 'avif-480').width).toBe(96)
    expect(size(media, 'webp-800').filename).toBeNull()
  })
})
