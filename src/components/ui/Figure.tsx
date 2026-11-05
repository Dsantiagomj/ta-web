import { Picture } from './Picture'
import type { ImageAsset } from './types'

/** Captura de la guía con su pie: proporción del archivo, --radius-card, --shadow-art. */
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
      <Picture
        image={image}
        alt={alt}
        sizes="(min-width: 50rem) 800px, 100vw"
        className="block w-full rounded-card bg-raised shadow-art"
      />
      {caption && <figcaption className="mt-2.5 text-sm text-muted">{caption}</figcaption>}
    </figure>
  )
}
