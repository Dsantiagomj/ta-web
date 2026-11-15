import type { Block } from 'payload'

import { blockImages } from '../lib/admin/block-thumbnails'
import { validateVideoUrl } from '../lib/guides/video'

export { validateVideoUrl }

// Vídeo de YouTube; la página lo muestra con la fachada (DESIGN.md, Video facade).
export const VideoBlock: Block = {
  slug: 'video',
  interfaceName: 'VideoBlock',
  admin: { images: blockImages('video') },
  labels: { singular: 'Vídeo', plural: 'Vídeos' },
  fields: [
    {
      name: 'url',
      label: 'URL del vídeo',
      type: 'text',
      required: true,
      validate: validateVideoUrl,
      admin: {
        description: 'Enlace al vídeo en YouTube (youtube.com o youtu.be).',
        // Valida en el navegador: el mensaje sale bajo el campo antes de guardar.
        components: { Field: '/components/admin/ValidatedTextField#VideoUrlField' },
      },
    },
    {
      name: 'title',
      label: 'Título',
      type: 'text',
      localized: true,
    },
  ],
}
