import type { Block } from 'payload'

import { youtubeId } from '../lib/guides/video'

/**
 * Un enlace https a un vídeo de YouTube, obligatorio: las guías solo llevan vídeos de
 * YouTube. Devuelve true o el mensaje de error, como espera Payload.
 */
export function validateVideoUrl(value: string | null | undefined): true | string {
  const message = 'Tiene que ser un enlace https a un vídeo de YouTube'
  if (!value || !/^https:\/\//i.test(value)) return message
  return youtubeId(value) ? true : message
}

// Vídeo de YouTube; la página lo muestra con la fachada (DESIGN.md, Video facade).
export const VideoBlock: Block = {
  slug: 'video',
  interfaceName: 'VideoBlock',
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
