import { randomUUID } from 'node:crypto'
import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import path from 'node:path'

import type { Payload } from 'payload'
import sharp from 'sharp'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { mediaImageSizes } from '@/lib/media/sizes'
import type { Media } from '@/payload-types'

import { mediaByUrl } from '../../scripts/import/media-by-url'

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

// 420 fotogramas de 40 × 40 px: apilados miden 16 800 px de alto, más que el límite de HEIF
// (16 384), como los GIF de hechizos de Torre en /yopuka-1. Hecho con sharp (join animado).
const ANIMATED_GIF = path.resolve('tests/fixtures/media/animado.gif')

async function animatedGif() {
  const data = await readFile(ANIMATED_GIF)
  return { data, mimetype: 'image/gif', name: `hechizo-${randomUUID()}.gif`, size: data.length }
}

/** Un GIF generado con tantos fotogramas como colores, de 40 × 40 px. */
async function gif(colors: string[]) {
  const frames = await Promise.all(
    colors.map((background) =>
      sharp({ create: { width: 40, height: 40, channels: 3, background } })
        .png()
        .toBuffer(),
    ),
  )
  const image = frames.length > 1 ? sharp(frames, { join: { animated: true } }) : sharp(frames[0])
  const data = await image.gif({ delay: colors.map(() => 100), loop: 0 }).toBuffer()
  return { data, mimetype: 'image/gif', name: `gif-${randomUUID()}.gif`, size: data.length }
}

const size = (media: Media, name: string) =>
  (media.sizes as Record<string, { filename?: string | null; width?: number | null }>)[name]

const variantNames = (media: Media, format: string) =>
  Object.entries(media.sizes as Record<string, { filename?: string | null }>)
    .filter(([name, variant]) => name.startsWith(`${format}-`) && variant.filename)
    .map(([name]) => name)

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

  describe('GIF animados', () => {
    it('se suben sin error y su WebP sigue animado, con la altura de un fotograma', async () => {
      const media = await payload.create({
        collection: 'media',
        data: { alt: 'Hechizo animado' },
        file: await animatedGif(),
      })
      expect(media.width).toBe(40)
      expect(media.height).toBe(40)

      const webp = size(media, 'webp-480') as Record<string, unknown>
      expect(webp.width).toBe(40)
      expect(webp.height).toBe(40)
      expect(webp.mimeType).toBe('image/webp')
      const file = await sharp(path.join(MEDIA_DIR, webp.filename as string), {
        animated: true,
      }).metadata()
      expect(file.pages).toBe(420)
      expect(file.pageHeight).toBe(40)
      expect(file.delay?.[0]).toBe(80)
    })

    it('nunca tienen AVIF: sería una tira con los fotogramas apilados', async () => {
      const media = await payload.create({
        collection: 'media',
        data: { alt: 'Tres fotogramas' },
        file: await gif(['#c33', '#3c3', '#33c']),
      })
      expect(variantNames(media, 'avif')).toEqual([])
      expect(variantNames(media, 'webp')).toEqual(['webp-480'])
    })

    it('un GIF de un solo fotograma tiene su AVIF y su WebP, como cualquier imagen', async () => {
      const media = await payload.create({
        collection: 'media',
        data: { alt: 'GIF quieto' },
        file: await gif(['#c33']),
      })
      expect(size(media, 'avif-480').width).toBe(40)
      expect(size(media, 'webp-480').width).toBe(40)
    })

    it('las importaciones los suben igual (mediaByUrl)', async () => {
      const url = `https://images.squarespace-cdn.com/hechizo-${randomUUID()}.gif`
      const mediaFor = mediaByUrl(payload, async () => animatedGif())
      const id = await mediaFor(url, 'Hechizo importado', { upload: true })
      const media = await payload.findByID({ collection: 'media', id: id! })
      expect(media.originalUrl).toBe(url)
      expect(variantNames(media, 'avif')).toEqual([])
      expect(variantNames(media, 'webp')).toEqual(['webp-480'])
    })
  })
})
