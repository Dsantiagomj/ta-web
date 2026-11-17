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
  return (
    <div className="zone-bg" aria-hidden="true">
      <picture>
        {(avifSet || image.avif) && (
          <source
            type="image/avif"
            srcSet={avifSet ?? image.avif}
            sizes={avifSet ? '100vw' : undefined}
          />
        )}
        <img
          className="zone-bg__img"
          src={image.src}
          srcSet={webpSet}
          sizes={webpSet ? '100vw' : undefined}
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
