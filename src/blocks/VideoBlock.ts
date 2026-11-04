import type { Block } from 'payload'

/** Una URL https obligatoria. Devuelve true o el mensaje de error, como espera Payload. */
export function validateVideoUrl(value: string | null | undefined): true | string {
  const message = 'Tiene que ser una URL que empiece por https://'
  if (!value) return message
  try {
    // Solo https: la página es https y un embed http lo bloquearía el navegador.
    if (new URL(value).protocol === 'https:') return true
  } catch {
    // Cae al mensaje de error.
  }
  return message
}

// Vídeo incrustado: YouTube o cualquier embed https.
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
        description: 'Enlace https de YouTube o de otro sitio que se pueda incrustar.',
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
