import type { Block } from 'payload'

import { blockImages } from '../lib/admin/block-thumbnails'

// Captura de pantalla entre párrafos. El texto alternativo vive en el archivo de media.
export const ImageBlock: Block = {
  slug: 'image',
  interfaceName: 'ImageBlock',
  admin: { images: blockImages('image') },
  labels: { singular: 'Imagen', plural: 'Imágenes' },
  fields: [
    {
      name: 'image',
      label: 'Imagen',
      type: 'upload',
      relationTo: 'media',
      required: true,
    },
    {
      name: 'caption',
      label: 'Pie de foto',
      type: 'text',
      localized: true,
    },
  ],
}
