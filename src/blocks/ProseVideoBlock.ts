import type { Block } from 'payload'

import { validateVideoUrl } from './VideoBlock'

// Un vídeo de YouTube dentro de un texto enriquecido (la entrada y el cierre de las páginas
// de logro). La página lo pinta con la fachada (DESIGN.md, Video facade): nada de YouTube se
// carga hasta pulsar. Va aparte del bloque Vídeo de las guías porque lleva su portada.
export const ProseVideoBlock: Block = {
  slug: 'proseVideo',
  interfaceName: 'ProseVideoBlock',
  labels: { singular: 'Vídeo', plural: 'Vídeos' },
  fields: [
    {
      name: 'url',
      label: 'URL del vídeo',
      type: 'text',
      required: true,
      validate: validateVideoUrl,
      admin: { description: 'Enlace al vídeo en YouTube (youtube.com o youtu.be).' },
    },
    {
      name: 'title',
      label: 'Título',
      type: 'text',
      required: true,
      admin: { description: 'Va bajo el vídeo, y es lo que oye quien usa un lector de pantalla.' },
    },
    {
      name: 'poster',
      label: 'Portada',
      type: 'upload',
      relationTo: 'media',
      admin: {
        description:
          'Una imagen del vídeo, la miniatura de YouTube. Sin ella, el recuadro enseña el título.',
      },
    },
  ],
}
