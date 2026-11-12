/** Un archivo de una imagen y su ancho en píxeles, para srcset con descriptores w. */
export interface ImageSource {
  src: string
  width: number
}

/**
 * Una imagen ya convertida (AGENTS.md, Media): WebP siempre, AVIF si existe, con el tamaño
 * del archivo principal para reservar su sitio. La app nunca optimiza imágenes al vuelo.
 */
export interface ImageAsset {
  /** El WebP más ancho: el src de la imagen. */
  src: string
  /** El AVIF más ancho. */
  avif?: string
  /** Ancho y alto de src. */
  width: number
  height: number
  /** Los anchos WebP, del más estrecho al más ancho; sin ellos, solo src. */
  srcSet?: ImageSource[]
  /** Los anchos AVIF, del más estrecho al más ancho; sin ellos, solo avif. */
  avifSrcSet?: ImageSource[]
  /** El archivo que se subió, con su tamaño: el que abre el visor. Sin variantes, es src. */
  original?: ImageSource & { height: number }
}
