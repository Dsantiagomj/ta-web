import type { Block } from 'payload'

// Las miniaturas del selector de bloques del panel: cómo se ve cada bloque en la web, para que
// Torre los reconozca de un vistazo. Son capturas del catálogo /sistema (el grupo «Bloques del
// panel»), en Arcano oscuro, que hace `pnpm panel:block-thumbs`. Payload pide 3:2.

export const BLOCK_THUMBNAIL_DIR = '/img/panel/bloques'

export const BLOCK_THUMBNAIL_SIZE = { width: 480, height: 320 } as const

/** El texto alternativo de cada miniatura, por el slug de su bloque: lo que se ve en ella. */
export const blockThumbnails = {
  richText: 'Un párrafo de la guía con un nombre en negrita y unas coordenadas.',
  image: 'Una captura del juego con su pie de foto debajo.',
  video: 'La portada de un vídeo de YouTube con el botón de reproducir.',
  callout: 'Un consejo de Torre con su avatar y un aviso de cuidado.',
  fight: 'Un combate: cada monstruo con su imagen y su cantidad.',
  step: 'Un paso con sus coordenadas, su texto y una captura.',
  table: 'Una tabla con su título, los encabezados de las columnas y filas con nombres y cifras.',
  proseVideo: 'Un vídeo de YouTube dentro del texto, bajo un párrafo.',
  needItem: 'Filas de Necesitarás: cada objeto con su icono y su cantidad.',
  needNote: 'Filas de Necesitarás escritas a mano, como una mazmorra o un combate.',
  dofusAchievement: 'Un logro con su icono y sus misiones numeradas debajo.',
  dofusMetalogro: 'Un metalogro con su nombre y sus logros uno debajo de otro.',
  dofusQuests: 'Una lista de misiones sueltas con su título.',
  dofusQuest: 'Una misión sola, con el personaje que la da y su nivel.',
  dofusNote: 'Un consejo de Torre escrito entre los logros, con una palabra en negrita.',
} as const

export type BlockThumbnailSlug = keyof typeof blockThumbnails

export const blockThumbnailSlugs = Object.keys(blockThumbnails) as BlockThumbnailSlug[]

type BlockImages = NonNullable<NonNullable<Block['admin']>['images']>

/**
 * Las imágenes de un bloque para su `admin.images`: la miniatura del selector y, con `icon`, el
 * icono cuadrado del menú de Lexical (sin él, Lexical encoge la miniatura a 20 px).
 */
export function blockImages(slug: BlockThumbnailSlug, { icon = false } = {}): BlockImages {
  const alt = blockThumbnails[slug]
  return {
    thumbnail: { url: `${BLOCK_THUMBNAIL_DIR}/${slug}.webp`, alt },
    ...(icon && { icon: { url: `${BLOCK_THUMBNAIL_DIR}/${slug}-icono.svg`, alt } }),
  }
}
