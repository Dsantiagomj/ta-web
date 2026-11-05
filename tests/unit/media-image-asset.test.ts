import { describe, expect, it } from 'vitest'

import { mediaImageAsset } from '@/lib/media/image-asset'
import type { Media } from '@/payload-types'

type Sizes = NonNullable<Media['sizes']>
type Size = Sizes[keyof Sizes]

const variant = (format: 'avif' | 'webp', width: number, height: number): Size => ({
  url: `/api/media/file/zaap-${width}x${height}.${format}`,
  width,
  height,
  mimeType: `image/${format}`,
  filesize: 1000,
  filename: `zaap-${width}x${height}.${format}`,
})

const empty: Size = {
  url: null,
  width: null,
  height: null,
  mimeType: null,
  filesize: null,
  filename: null,
}

function media(overrides: Partial<Media> = {}): Media {
  return {
    id: 7,
    alt: 'El zaap de Astrub',
    url: '/api/media/file/zaap.png',
    filename: 'zaap.png',
    mimeType: 'image/png',
    width: 1000,
    height: 500,
    updatedAt: '2026-11-05T00:00:00.000Z',
    createdAt: '2026-11-05T00:00:00.000Z',
    ...overrides,
  }
}

describe('mediaImageAsset', () => {
  it('ofrece cada ancho por formato, del más estrecho al más ancho', () => {
    const asset = mediaImageAsset(
      media({
        sizes: {
          'webp-800': variant('webp', 800, 400),
          'webp-480': variant('webp', 480, 240),
          'avif-480': variant('avif', 480, 240),
          'avif-800': variant('avif', 800, 400),
          'webp-1200': empty,
          'avif-1200': empty,
        },
      }),
    )
    expect(asset).toEqual({
      src: '/api/media/file/zaap-800x400.webp',
      avif: '/api/media/file/zaap-800x400.avif',
      width: 800,
      height: 400,
      srcSet: [
        { src: '/api/media/file/zaap-480x240.webp', width: 480 },
        { src: '/api/media/file/zaap-800x400.webp', width: 800 },
      ],
      avifSrcSet: [
        { src: '/api/media/file/zaap-480x240.avif', width: 480 },
        { src: '/api/media/file/zaap-800x400.avif', width: 800 },
      ],
    })
  })

  it('el archivo principal es la variante WebP más ancha, con su tamaño: la que abre el visor', () => {
    const asset = mediaImageAsset(
      media({
        width: 1920,
        height: 1080,
        sizes: {
          'webp-480': variant('webp', 480, 270),
          'webp-1600': variant('webp', 1600, 900),
        },
      }),
    )
    expect(asset).toMatchObject({
      src: '/api/media/file/zaap-1600x900.webp',
      width: 1600,
      height: 900,
    })
    expect(asset?.avif).toBeUndefined()
    expect(asset?.avifSrcSet).toBeUndefined()
  })

  it('una imagen pequeña con una sola variante no necesita srcset', () => {
    const asset = mediaImageAsset(
      media({
        width: 96,
        height: 96,
        sizes: { 'webp-480': variant('webp', 96, 96), 'avif-480': variant('avif', 96, 96) },
      }),
    )
    expect(asset).toEqual({
      src: '/api/media/file/zaap-96x96.webp',
      avif: '/api/media/file/zaap-96x96.avif',
      width: 96,
      height: 96,
    })
  })

  it('sin variantes, el original con su tamaño, hasta que se generen', () => {
    expect(mediaImageAsset(media({ sizes: undefined }))).toEqual({
      src: '/api/media/file/zaap.png',
      width: 1000,
      height: 500,
    })
  })

  it('sin archivo, sin tamaño o sin poblar la relación, nada', () => {
    expect(mediaImageAsset(null)).toBeNull()
    expect(mediaImageAsset(undefined)).toBeNull()
    expect(mediaImageAsset(7)).toBeNull()
    expect(mediaImageAsset(media({ url: null }))).toBeNull()
    expect(mediaImageAsset(media({ width: null }))).toBeNull()
  })
})
