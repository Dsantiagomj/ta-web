import type { ImageAsset, ImageSource } from '../../components/ui/types'
import type { Media } from '../../payload-types'
import { IMAGE_FORMATS, type ImageFormat } from './sizes'

type SizeRecord = { url?: string | null; width?: number | null; height?: number | null }

interface Variant extends ImageSource {
  height: number
}

/** Las variantes de un formato que tienen archivo, del ancho menor al mayor, sin repetir. */
function variantsOf(media: Media, format: ImageFormat): Variant[] {
  const byWidth = new Map<number, Variant>()
  for (const [name, size] of Object.entries((media.sizes ?? {}) as Record<string, SizeRecord>)) {
    if (!name.startsWith(`${format}-`) || !size?.url || !size.width || !size.height) continue
    byWidth.set(size.width, { src: size.url, width: size.width, height: size.height })
  }
  return [...byWidth.values()].sort((a, b) => a.width - b.width)
}

const sources = (variants: Variant[]): ImageSource[] | undefined =>
  variants.length > 1 ? variants.map(({ src, width }) => ({ src, width })) : undefined

/**
 * Un archivo de media, con las variantes que Payload generó al subirlo, como ImageAsset
 * para Picture y Figure. El archivo principal es el WebP más ancho, con su tamaño; sin
 * variantes (aún sin generar), el original. Null si la relación no está poblada o el
 * archivo no tiene URL o tamaño.
 */
export function mediaImageAsset(media: Media | number | null | undefined): ImageAsset | null {
  if (!media || typeof media === 'number') return null
  const [avif, webp] = IMAGE_FORMATS.map((format) => variantsOf(media, format))
  const largest = webp.at(-1)
  if (!largest) {
    if (!media.url || !media.width || !media.height) return null
    return { src: media.url, width: media.width, height: media.height }
  }

  const asset: ImageAsset = {
    src: largest.src,
    width: largest.width,
    height: largest.height,
  }
  const largestAvif = avif.at(-1)
  if (largestAvif) asset.avif = largestAvif.src
  const srcSet = sources(webp)
  if (srcSet) asset.srcSet = srcSet
  const avifSrcSet = sources(avif)
  if (avifSrcSet) asset.avifSrcSet = avifSrcSet
  return asset
}
