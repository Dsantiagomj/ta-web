import type { CollectionConfig } from 'payload'

// Imágenes y archivos. Van a Cloudflare R2 cuando está configurado y al disco local si no.
export const Media: CollectionConfig = {
  slug: 'media',
  labels: { singular: 'Archivo', plural: 'Archivos' },
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'alt',
      label: 'Texto alternativo',
      type: 'text',
      required: true,
      localized: true,
    },
  ],
  upload: {
    staticDir: 'media',
  },
}
