import { Picture } from './Picture'
import { uiStrings } from './strings'
import type { ImageAsset } from './types'

import './ui.css'

const s = uiStrings.figure

/**
 * Captura de la guía con su pie: proporción del archivo, --radius-card, --shadow-art.
 * Se abre a pantalla completa (DESIGN.md, Figure): sin JavaScript el enlace lleva al
 * WebP, el archivo más grande; con PageEnhancements, el clic abre el visor.
 */
export function Figure({
  image,
  alt,
  caption,
}: {
  image: ImageAsset
  alt: string
  caption?: string
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
          sizes="(min-width: 50rem) 800px, 100vw"
          className="block w-full rounded-card bg-raised shadow-art"
        />
      </a>
      {caption && <figcaption className="mt-2.5 text-sm text-muted">{caption}</figcaption>}
    </figure>
  )
}
