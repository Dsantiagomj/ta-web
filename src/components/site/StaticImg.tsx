import type { ImgHTMLAttributes } from 'react'

/**
 * Un archivo estático de public/, ya en WebP y a su tamaño (AGENTS.md, Media: la app no
 * optimiza imágenes al pedirlas). Decorativo salvo que se le dé alt.
 */
export function StaticImg({ alt = '', ...props }: ImgHTMLAttributes<HTMLImageElement>) {
  // eslint-disable-next-line @next/next/no-img-element -- archivo estático ya en WebP
  return <img alt={alt} decoding="async" {...props} />
}
