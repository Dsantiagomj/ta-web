import type { ImageSize } from 'payload'

/**
 * Anchos de las variantes (DESIGN.md, Imagery). 480: tarjetas de 240px a 2x y móviles a
 * 1x; 800: la columna de lectura (--width-prose) y móviles a 2x; 1200: móviles a 3x y el
 * arte de cabecera en tabletas; 1600: la columna a 2x y el arte de cabecera a lo ancho.
 */
export const IMAGE_WIDTHS = [480, 800, 1200, 1600] as const

/** AVIF primero, que es el que el navegador prueba antes; WebP siempre como respaldo. */
export const IMAGE_FORMATS = ['avif', 'webp'] as const

export type ImageFormat = (typeof IMAGE_FORMATS)[number]

// Calidades por defecto de sharp: WebP 80, AVIF 50 (equivale de sobra a un JPEG de 80).
const FORMAT_OPTIONS = {
  avif: { format: 'avif', options: { quality: 50 } },
  webp: { format: 'webp', options: { quality: 80 } },
} as const

// Las mismas formas que Payload acepta para sharp: la lista no se puede inferir de las calidades.
const RESIZABLE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/tiff',
  'image/avif',
]

export const imageSizeName = (format: ImageFormat, width: number) => `${format}-${width}`

/**
 * Las variantes que Payload genera con sharp al subir un archivo, en el panel o en la
 * importación, y guarda junto al original (R2 o disco). Nunca al pedir la imagen.
 *
 * Solo se fija el ancho, así que la altura sigue la proporción del original. Payload omite
 * una variante más ancha que el original (no amplía); la más estrecha lleva
 * withoutEnlargement para que exista siempre, al ancho del original si este es menor, y
 * así hasta un icono de 96px tenga su AVIF y su WebP.
 */
export const mediaImageSizes: ImageSize[] = IMAGE_WIDTHS.flatMap((width) =>
  IMAGE_FORMATS.map(
    (format): ImageSize => ({
      name: imageSizeName(format, width),
      width,
      ...(width === IMAGE_WIDTHS[0] ? { withoutEnlargement: true } : {}),
      formatOptions: FORMAT_OPTIONS[format],
      admin: { disableGroupBy: true, disableListColumn: true, disableListFilter: true },
    }),
  ),
)

type SizeRecord = { filename?: string | null } | null | undefined

export interface MediaFileRecord {
  mimeType?: string | null
  width?: number | null
  sizes?: Record<string, SizeRecord> | null
}

// Los tipos que Payload lee con todos sus fotogramas (isAnimatedImage de Payload). Con más de
// uno, el parche de Payload (patches/payload@3.92.1.patch) no genera sus AVIF: sharp los
// apilaría en una tira. Sus WebP sí salen animados.
const ANIMATABLE_MIME_TYPES = ['image/gif', 'image/webp', 'image/tiff']

const isAvif = (name: string) => name.startsWith('avif-')

/**
 * Las variantes que le faltan a un archivo: las que Payload generaría para su ancho y no
 * tienen archivo. Vacío si no es una imagen que sharp convierte o si ya están todas. Una
 * imagen animada (`animated`, que solo se sabe leyendo el archivo) no lleva AVIF.
 */
export function missingImageSizes(
  media: MediaFileRecord,
  { animated = false }: { animated?: boolean } = {},
): string[] {
  const { mimeType, width } = media
  if (!mimeType || !RESIZABLE_MIME_TYPES.includes(mimeType) || !width) return []
  return mediaImageSizes
    .filter((size) => size.withoutEnlargement || size.width! <= width)
    .map((size) => size.name)
    .filter((name) => !(animated && isAvif(name)))
    .filter((name) => !media.sizes?.[name]?.filename)
}

/**
 * Si le falta un AVIF a un archivo de un tipo que puede ser animado: entonces solo el
 * archivo dice si ese AVIF falta de verdad o no debe existir (missingImageSizes con
 * `animated`).
 */
export function mayBeAnimated(media: MediaFileRecord): boolean {
  return (
    ANIMATABLE_MIME_TYPES.includes(media.mimeType ?? '') && missingImageSizes(media).some(isAvif)
  )
}
