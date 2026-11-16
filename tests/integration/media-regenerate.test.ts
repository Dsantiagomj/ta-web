import { randomUUID } from 'node:crypto'
import { existsSync } from 'node:fs'
import { readFile, rm } from 'node:fs/promises'
import path from 'node:path'

import type { Payload } from 'payload'
import sharp from 'sharp'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { regenerateImageSizes } from '@/lib/media/regenerate'
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
  return { data, mimetype: 'image/png', name: `antiguo-${randomUUID()}.png`, size: data.length }
}

async function animatedGif() {
  const data = await readFile(path.resolve('tests/fixtures/media/animado.gif'))
  return { data, mimetype: 'image/gif', name: `hechizo-${randomUUID()}.gif`, size: data.length }
}

const emptySizes = () =>
  Object.fromEntries(
    mediaImageSizes.map(({ name }) => [
      name,
      { url: null, width: null, height: null, mimeType: null, filesize: null, filename: null },
    ]),
  )

const size = (media: Media, name: string) =>
  (media.sizes as Record<string, { filename?: string | null; width?: number | null }>)[name]

describe('regenerateImageSizes', () => {
  let payload: Payload

  beforeAll(async () => {
    payload = await startPayload()
  })

  afterAll(async () => {
    await payload.delete({ collection: 'media', where: { id: { exists: true } } })
    await payload.destroy()
  })

  it('rellena las variantes de un archivo subido sin ellas y deja el original', async () => {
    const media = await payload.create({
      collection: 'media',
      data: { alt: 'Archivo antiguo' },
      file: await png(900, 600),
    })
    // Como un archivo subido antes de que existieran las variantes.
    const empty = Object.fromEntries(
      mediaImageSizes.map(({ name }) => [
        name,
        { url: null, width: null, height: null, mimeType: null, filesize: null, filename: null },
      ]),
    )
    await payload.db.updateOne({ collection: 'media', id: media.id, data: { sizes: empty } })

    const result = await regenerateImageSizes(payload, { log: () => {} })
    expect(result.regenerated).toContain(media.id)

    const after = await payload.findByID({ collection: 'media', id: media.id })
    expect(after.filename).toBe(media.filename)
    expect(existsSync(path.join(MEDIA_DIR, after.filename!))).toBe(true)
    expect(size(after, 'webp-800').width).toBe(800)
    expect(existsSync(path.join(MEDIA_DIR, size(after, 'avif-800').filename!))).toBe(true)
    expect(size(after, 'webp-1200').filename).toBeNull()
  })

  it('es idempotente: lo que ya tiene sus variantes no se vuelve a subir', async () => {
    await regenerateImageSizes(payload, { log: () => {} })
    const second = await regenerateImageSizes(payload, { log: () => {} })
    expect(second.regenerated).toEqual([])
    expect(second.failed).toEqual([])
    expect(second.complete).toBeGreaterThan(0)
  })

  it('si no encuentra el original lo cuenta como fallo y sigue con los demás', async () => {
    const media = await payload.create({
      collection: 'media',
      data: { alt: 'Original perdido' },
      file: await png(600, 400),
    })
    await payload.db.updateOne({
      collection: 'media',
      id: media.id,
      data: { sizes: { 'webp-480': { filename: null }, 'avif-480': { filename: null } } },
    })
    // Sin sus variantes en la base, sus archivos quedarían huérfanos en ./media.
    for (const name of ['webp-480', 'avif-480']) {
      await rm(path.join(MEDIA_DIR, size(media, name).filename!))
    }
    await rm(path.join(MEDIA_DIR, media.filename!))

    const result = await regenerateImageSizes(payload, { log: () => {} })
    expect(result.failed.map((failure) => failure.id)).toEqual([media.id])
    expect(result.failed[0].error).toMatch(/No está en media/)
    await payload.delete({ collection: 'media', id: media.id })
  })

  it('un GIF animado, sin AVIF porque no debe tenerlo, está completo: no se vuelve a subir', async () => {
    const media = await payload.create({
      collection: 'media',
      data: { alt: 'Hechizo animado' },
      file: await animatedGif(),
    })
    const result = await regenerateImageSizes(payload, { log: () => {} })
    expect(result.regenerated).not.toContain(media.id)
    expect(result.failed).toEqual([])
    await payload.delete({ collection: 'media', id: media.id })
  })

  it('a un GIF animado sin variantes le genera sus WebP animados y ningún AVIF, una vez', async () => {
    const media = await payload.create({
      collection: 'media',
      data: { alt: 'Hechizo antiguo' },
      file: await animatedGif(),
    })
    await payload.db.updateOne({ collection: 'media', id: media.id, data: { sizes: emptySizes() } })

    const first = await regenerateImageSizes(payload, { log: () => {} })
    expect(first.regenerated).toContain(media.id)
    const after = await payload.findByID({ collection: 'media', id: media.id })
    expect(size(after, 'avif-480').filename).toBeNull()
    const webp = path.join(MEDIA_DIR, size(after, 'webp-480').filename!)
    expect((await sharp(webp, { animated: true }).metadata()).pages).toBe(420)

    const second = await regenerateImageSizes(payload, { log: () => {} })
    expect(second.regenerated).not.toContain(media.id)
    expect(second.failed).toEqual([])
    await payload.delete({ collection: 'media', id: media.id })
  })
})
