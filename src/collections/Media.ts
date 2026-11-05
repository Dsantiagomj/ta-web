import type { CollectionConfig } from 'payload'

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

// Imágenes y archivos. Van a Cloudflare R2 cuando está configurado y al disco local si no.
// Payload guarda el ancho y el alto del original y, al subirlo (panel o importación), genera
// sus variantes AVIF y WebP junto a él (ver AGENTS.md, Media). Nunca al pedir la imagen.
export const Media: CollectionConfig = {
  slug: 'media',
  labels: { singular: 'Archivo', plural: 'Archivos' },
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
    },
    {
      name: 'credits',
      label: 'Créditos',
      type: 'text',
      localized: true,
    },
    {
      name: 'originalUrl',
      label: 'URL original en Squarespace',
      type: 'text',
      validate: validateOptionalUrl,
      admin: {
        description: 'Solo en las imágenes migradas.',
      },
    },
  ],
  upload: {
    staticDir: 'media',
    imageSizes: mediaImageSizes,
    adminThumbnail: imageSizeName('webp', IMAGE_WIDTHS[0]),
  },
}
