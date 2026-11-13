import { BlocksFeature, lexicalEditor } from '@payloadcms/richtext-lexical'

import { ProseVideoBlock } from '../blocks/ProseVideoBlock'

// El editor de la entrada y el cierre de las páginas de logro: el de siempre, más el vídeo
// de YouTube, que Torre mete donde quiera entre los párrafos.
export const proseEditor = lexicalEditor({
  features: ({ defaultFeatures }) => [
    ...defaultFeatures,
    BlocksFeature({ blocks: [ProseVideoBlock] }),
  ],
})
