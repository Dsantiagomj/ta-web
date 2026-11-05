import { cx } from './cx'
import type { ImageAsset } from './types'

/**
 * <picture> con AVIF y WebP y el tamaño del archivo (DESIGN.md, Imagery). Diferida por
 * defecto; la imagen principal de la página va con priority.
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
  return (
    <picture className="contents">
      {image.avif && <source type="image/avif" srcSet={image.avif} sizes={sizes} />}
      <img
        src={image.src}
        width={image.width}
        height={image.height}
        alt={alt}
        sizes={sizes}
        decoding="async"
        {...(priority ? { fetchPriority: 'high' as const } : { loading: 'lazy' as const })}
        className={cx('h-auto max-w-full', className)}
        style={style}
      />
    </picture>
  )
}
