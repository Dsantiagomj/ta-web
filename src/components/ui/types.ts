/**
 * Una imagen ya convertida (AGENTS.md, Media): WebP siempre, AVIF si existe, con el tamaño
 * del archivo para reservar su sitio. La app nunca optimiza imágenes al vuelo.
 */
export interface ImageAsset {
  src: string
  avif?: string
  width: number
  height: number
}
