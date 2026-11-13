import type { CollectionConfig } from 'payload'

import { panelStrings } from '../lib/admin/strings'
import { IMAGE_WIDTHS, imageSizeName, mediaImageSizes } from '../lib/media/sizes'
import {
  revalidateGuidePagesAfterChange,
  revalidateGuidePagesAfterDelete,
} from './revalidate-guides'

/** Vacío o una URL http(s). Devuelve true o el mensaje de error, como espera Payload. */
export function validateOptionalUrl(value: string | null | undefined): true | string {
  if (!value) return true
  try {
    const { protocol } = new URL(value)
    if (protocol === 'http:' || protocol === 'https:') return true
  } catch {
    // Cae al mensaje de error.
  }
  return 'Tiene que ser una URL que empiece por http:// o https://'
}

/**
 * La dirección de la página o la imagen en Squarespace: la pone la importación. Torre no la
 * edita, y en lo nuevo, que no la tiene, no sale.
 */
export const originalUrlAdmin = {
  readOnly: true,
  condition: (data: { originalUrl?: unknown } | undefined) => Boolean(data?.originalUrl),
  description: panelStrings.originalUrl.description,
}

// Imágenes y archivos. Van a Cloudflare R2 cuando está configurado y al disco local si no.
// Payload guarda el ancho y el alto del original y, al subirlo (panel o importación), genera
// sus variantes AVIF y WebP junto a él (ver AGENTS.md, Media). Nunca al pedir la imagen.
export const Media: CollectionConfig = {
  slug: 'media',
  labels: { singular: 'Imagen', plural: 'Imágenes' },
  admin: {
    group: panelStrings.groups.media,
    hideAPIURL: true,
    defaultColumns: ['filename', 'alt', 'updatedAt'],
    listSearchableFields: ['alt', 'filename'],
  },
  access: {
    read: () => true,
  },
  // Las guías pintan el texto alternativo y el tamaño de sus imágenes.
  hooks: {
    afterChange: [revalidateGuidePagesAfterChange],
    afterDelete: [revalidateGuidePagesAfterDelete],
  },
  fields: [
    {
      name: 'alt',
      label: 'Texto alternativo',
      type: 'text',
      required: true,
      localized: true,
      admin: { description: panelStrings.media.altDescription },
    },
    {
      name: 'credits',
      label: 'Créditos',
      type: 'text',
      localized: true,
      admin: { description: panelStrings.media.creditsDescription },
    },
    {
      // El refresco de datos del juego busca por ella lo que ya subió: nunca duplica.
      name: 'gameAsset',
      label: 'Arte del juego',
      type: 'text',
      unique: true,
      index: true,
      admin: {
        readOnly: true,
        // Solo lo pone el refresco de DofusDB: en una imagen subida a mano no sale.
        condition: (data) => Boolean(data?.gameAsset),
        description: 'Arte del juego que trajo DofusDB, como los renders de PNJ.',
      },
    },
    {
      name: 'originalUrl',
      label: panelStrings.originalUrl.label,
      type: 'text',
      validate: validateOptionalUrl,
      admin: originalUrlAdmin,
    },
  ],
  upload: {
    staticDir: 'media',
    imageSizes: mediaImageSizes,
    adminThumbnail: imageSizeName('webp', IMAGE_WIDTHS[0]),
  },
}
