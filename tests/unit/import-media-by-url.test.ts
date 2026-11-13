import type { Payload } from 'payload'
import { describe, expect, it } from 'vitest'

import { ImageDownloadError, mediaByUrl } from '../../scripts/import/media-by-url'

// El archivo de Media de una URL de origen: lo busca, lo sube solo si se pide, y separa una
// descarga fallida (se anota) de un error de la base (para la importación).

function fakePayload(stored: Record<string, number> = {}) {
  const created: string[] = []
  const payload = {
    find: async ({ where }: { where: { originalUrl: { equals: string } } }) => {
      const id = stored[where.originalUrl.equals]
      return { docs: id ? [{ id }] : [] }
    },
    create: async ({ data }: { data: { originalUrl: string } }) => {
      created.push(data.originalUrl)
      stored[data.originalUrl] = 100 + created.length
      return { id: stored[data.originalUrl] }
    },
  }
  return { payload: payload as unknown as Payload, created }
}

const file = async () => ({ data: Buffer.from('x'), mimetype: 'image/png', name: 'x.png', size: 1 })

describe('mediaByUrl', () => {
  it('sin upload solo busca; lo que no está da null y se sube cuando se pide', async () => {
    const { payload, created } = fakePayload({ 'https://a/ya.png': 7 })
    const media = mediaByUrl(payload, file)
    expect(await media('https://a/ya.png', 'x', { upload: false })).toBe(7)
    expect(await media('https://a/nueva.png', 'x', { upload: false })).toBeNull()
    expect(created).toEqual([])
    expect(await media('https://a/nueva.png', 'x', { upload: true })).toBe(101)
    expect(await media('https://a/nueva.png', 'x', { upload: true })).toBe(101)
    expect(created).toEqual(['https://a/nueva.png'])
  })

  it('una descarga fallida es ImageDownloadError; un error de la base, no', async () => {
    const { payload } = fakePayload()
    const broken = mediaByUrl(payload, async () => {
      throw new Error('HTTP 404')
    })
    await expect(broken('https://a/caida.png', 'x', { upload: true })).rejects.toBeInstanceOf(
      ImageDownloadError,
    )
    const database = mediaByUrl(
      {
        find: async () => {
          throw new Error('connection terminated')
        },
      } as unknown as Payload,
      file,
    )
    const error = await database('https://a/x.png', 'x', { upload: true }).catch((e: unknown) => e)
    expect(error).not.toBeInstanceOf(ImageDownloadError)
    expect(error).toMatchObject({ message: 'connection terminated' })
  })
})
