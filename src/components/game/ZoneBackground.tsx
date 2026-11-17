import { srcSetValue } from '../ui/srcset'
import type { ImageAsset } from '../ui/types'

import './game.css'

/**
 * El fondo de zona de una guía de misión o una página de logro (DESIGN.md, Zone background):
 * el paisaje de la subzona, fijo detrás de toda la página bajo un velo plano del color de la
 * página. Decorativo: sin texto alternativo, diferido y con prioridad baja, para que nunca
 * retrase el texto ni compita por el LCP. Sin JavaScript.
 */
export function ZoneBackground({ image }: { image: ImageAsset }) {
  const webpSet = srcSetValue(image.srcSet)
  const avifSet = srcSetValue(image.avifSrcSet)
  const sizes = coverSizes(image)
  return (
    <div className="zone-bg" aria-hidden="true">
      <picture>
        {(avifSet || image.avif) && (
          <source
            type="image/avif"
            srcSet={avifSet ?? image.avif}
            sizes={avifSet ? sizes : undefined}
          />
        )}
        <img
          className="zone-bg__img"
          src={image.src}
          srcSet={webpSet}
          sizes={webpSet ? sizes : undefined}
          width={image.width}
          height={image.height}
          alt=""
          loading="lazy"
          decoding="async"
          fetchPriority="low"
        />
      </picture>
    </div>
  )
}

/**
 * El ancho que pinta la imagen con object-fit: cover a toda la ventana: el de la ventana, o,
 * cuando la ventana es más alta que la imagen (un móvil), su alto por la proporción de la
 * imagen. Con 100vw un móvil de 390px bajaba la de 800px y la estiraba unas cuatro veces.
 */
function coverSizes({ width, height }: ImageAsset): string {
  if (!width || !height) return '100vw'
  return `(max-aspect-ratio: ${width}/${height}) ${Math.round((width / height) * 100)}vh, 100vw`
}
