import type { CollectionConfig } from 'payload'

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
// Payload guarda el ancho y el alto del original; las variantes AVIF y WebP se generan
// antes de importar (ver AGENTS.md, Media).
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
    {
      name: 'credits',
      label: 'Créditos',
      type: 'text',
      localized: true,
    },
    {
      name: 'variants',
      label: 'Variantes',
      type: 'array',
      admin: {
        description: 'Variantes AVIF y WebP pregeneradas en R2. Las rellena la importación.',
      },
      fields: [
        { name: 'key', label: 'Clave en R2', type: 'text', required: true },
        { name: 'width', label: 'Ancho (px)', type: 'number', required: true, min: 1 },
        {
          name: 'format',
          label: 'Formato',
          type: 'select',
          required: true,
          options: [
            { label: 'AVIF', value: 'avif' },
            { label: 'WebP', value: 'webp' },
          ],
        },
      ],
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
  },
}
