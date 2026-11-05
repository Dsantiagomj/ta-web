import { describe, expect, it } from 'vitest'

import {
  IMAGE_FORMATS,
  IMAGE_WIDTHS,
  imageSizeName,
  mediaImageSizes,
  missingImageSizes,
} from '@/lib/media/sizes'

describe('anchos y formatos de las variantes', () => {
  it('cubren del móvil al doble de la columna de lectura y del arte de cabecera', () => {
    expect(IMAGE_WIDTHS).toEqual([480, 800, 1200, 1600])
    expect(IMAGE_FORMATS).toEqual(['avif', 'webp'])
  })

  it('una variante por ancho y formato, con nombre «formato-ancho»', () => {
    const names = mediaImageSizes.map((size) => size.name)
    expect(names).toHaveLength(IMAGE_WIDTHS.length * IMAGE_FORMATS.length)
    expect(names).toContain('webp-480')
    expect(names).toContain('avif-1600')
    expect(imageSizeName('webp', 800)).toBe('webp-800')
  })

  it('solo fija el ancho: la altura sigue la proporción del original', () => {
    for (const size of mediaImageSizes) {
      expect(size.width).toBeGreaterThan(0)
      expect(size.height).toBeUndefined()
    }
  })

  it('cada variante sale en su formato', () => {
    const webp = mediaImageSizes.find((size) => size.name === 'webp-800')
    const avif = mediaImageSizes.find((size) => size.name === 'avif-800')
    expect(webp?.formatOptions?.format).toBe('webp')
    expect(avif?.formatOptions?.format).toBe('avif')
  })

  it('nunca amplía: los anchos mayores que el original se omiten', () => {
    // Sin withoutEnlargement, Payload deja vacía la variante más ancha que el original.
    const wide = mediaImageSizes.filter((size) => size.width !== IMAGE_WIDTHS[0])
    for (const size of wide) expect(size.withoutEnlargement).toBeUndefined()
  })

  it('el ancho más estrecho siempre existe, al ancho del original si este es menor', () => {
    // Con withoutEnlargement: true, sharp deja el original a su tamaño en vez de ampliarlo.
    const narrowest = mediaImageSizes.filter((size) => size.width === IMAGE_WIDTHS[0])
    expect(narrowest).toHaveLength(IMAGE_FORMATS.length)
    for (const size of narrowest) expect(size.withoutEnlargement).toBe(true)
  })

  it('no llenan las columnas ni los filtros de la lista del panel', () => {
    for (const size of mediaImageSizes) {
      expect(size.admin).toEqual({
        disableGroupBy: true,
        disableListColumn: true,
        disableListFilter: true,
      })
    }
  })
})

describe('missingImageSizes', () => {
  const file = (width: number) => ({ filename: `captura-${width}.webp`, width })
  const allSizes = (originalWidth: number) =>
    Object.fromEntries(
      mediaImageSizes.map((size) => [
        size.name,
        size.width! <= originalWidth || size.withoutEnlargement
          ? file(Math.min(size.width!, originalWidth))
          : { filename: null, width: null },
      ]),
    )

  it('una imagen sin variantes las necesita todas las que caben en su ancho', () => {
    expect(missingImageSizes({ mimeType: 'image/png', width: 1000, sizes: undefined })).toEqual([
      'avif-480',
      'webp-480',
      'avif-800',
      'webp-800',
    ])
  })

  it('una imagen más estrecha que 480 solo necesita la variante más estrecha', () => {
    expect(missingImageSizes({ mimeType: 'image/png', width: 96, sizes: {} })).toEqual([
      'avif-480',
      'webp-480',
    ])
  })

  it('una imagen con todas sus variantes no necesita nada: el script no la toca', () => {
    expect(
      missingImageSizes({ mimeType: 'image/png', width: 1000, sizes: allSizes(1000) }),
    ).toEqual([])
    expect(
      missingImageSizes({ mimeType: 'image/png', width: 2400, sizes: allSizes(2400) }),
    ).toEqual([])
  })

  it('lo que no es una imagen que sharp convierte no necesita variantes', () => {
    expect(missingImageSizes({ mimeType: 'application/pdf', width: null, sizes: {} })).toEqual([])
    expect(missingImageSizes({ mimeType: 'image/svg+xml', width: 800, sizes: {} })).toEqual([])
  })
})
