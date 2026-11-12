import { IMAGE_SIZES } from './image-sizes'
import { Picture } from './Picture'
import { uiStrings } from './strings'
import type { ImageAsset } from './types'

import './ui.css'

const s = uiStrings.figure

/**
 * Captura de la guía con su pie: proporción del archivo, --radius-card, --shadow-art.
 * Se abre a pantalla completa (DESIGN.md, Figure): el enlace lleva al archivo que se subió
 * (sin él, al WebP más ancho) y dice su tamaño, para que el visor de PageEnhancements lo
 * ajuste a la pantalla. En la página, el navegador elige el ancho que necesita su sitio.
 */
export function Figure({
  image,
  alt,
  caption,
  priority = false,
  sizes = IMAGE_SIZES.prose,
}: {
  image: ImageAsset
  alt: string
  caption?: string
  /** La captura que puede ser la LCP: sin diferir y con prioridad alta (DESIGN.md, Imagery). */
  priority?: boolean
  /** Cuánto ocupa: la columna de lectura, o media en la rejilla de un paso. */
  sizes?: string
}) {
  const full = image.original ?? image
  return (
    <figure>
      <a
        href={full.src}
        className="figure__link"
        data-image-viewer=""
        data-image-width={full.width}
        data-image-height={full.height}
        aria-label={s.open(alt)}
      >
        <Picture
          image={image}
          alt={alt}
          priority={priority}
          sizes={sizes}
          className="block w-full rounded-card bg-raised shadow-art"
        />
      </a>
      {caption && <figcaption className="mt-2.5 text-sm text-muted">{caption}</figcaption>}
    </figure>
  )
}
