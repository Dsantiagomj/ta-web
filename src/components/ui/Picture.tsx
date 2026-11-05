import { cx } from './cx'
import { srcSetValue } from './srcset'
import type { ImageAsset } from './types'

/**
 * <picture> con AVIF y WebP y el tamaño del archivo (DESIGN.md, Imagery). Con varios anchos
 * escribe srcset y sizes en los dos formatos; sizes dice cuánto ocupa (IMAGE_SIZES).
 * Diferida por defecto; la imagen principal de la página va con priority.
 */
export function Picture({
  image,
  alt,
  priority = false,
  sizes,
  className,
  style,
}: {
  image: ImageAsset
  alt: string
  priority?: boolean
  sizes?: string
  className?: string
  style?: React.CSSProperties
}) {
  const webpSet = srcSetValue(image.srcSet)
  const avifSet = srcSetValue(image.avifSrcSet)
  return (
    <picture className="contents">
      {(avifSet || image.avif) && (
        <source
          type="image/avif"
          srcSet={avifSet ?? image.avif}
          sizes={avifSet ? sizes : undefined}
        />
      )}
      <img
        src={image.src}
        srcSet={webpSet}
        sizes={webpSet ? sizes : undefined}
        width={image.width}
        height={image.height}
        alt={alt}
        decoding="async"
        {...(priority ? { fetchPriority: 'high' as const } : { loading: 'lazy' as const })}
        className={cx('h-auto max-w-full', className)}
        style={style}
      />
    </picture>
  )
}
