import { IMAGE_SIZES } from './image-sizes'
import { Picture } from './Picture'
import { uiStrings } from './strings'
import type { ImageAsset } from './types'

import './ui.css'

const s = uiStrings.figure

/**
 * Captura de la guía con su pie: proporción del archivo, --radius-card, --shadow-art.
 * Se abre a pantalla completa (DESIGN.md, Figure): sin JavaScript el enlace lleva al
 * WebP más ancho (src); con PageEnhancements, el clic abre el visor con ese mismo archivo
 * y su AVIF. En la página, el navegador elige el ancho que necesita la columna.
 */
export function Figure({
  image,
  alt,
  caption,
  priority = false,
}: {
  image: ImageAsset
  alt: string
  caption?: string
  /** La captura que puede ser la LCP: sin diferir y con prioridad alta (DESIGN.md, Imagery). */
  priority?: boolean
}) {
  return (
    <figure>
      <a
        href={image.src}
        className="figure__link"
        data-image-viewer=""
        data-image-avif={image.avif}
        aria-label={s.open(alt)}
      >
        <Picture
          image={image}
          alt={alt}
          priority={priority}
          sizes={IMAGE_SIZES.prose}
          className="block w-full rounded-card bg-raised shadow-art"
        />
      </a>
      {caption && <figcaption className="mt-2.5 text-sm text-muted">{caption}</figcaption>}
    </figure>
  )
}
