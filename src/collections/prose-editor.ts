import { BlocksFeature, lexicalEditor } from '@payloadcms/richtext-lexical'

import { ProseVideoBlock } from '../blocks/ProseVideoBlock'
import { panelStrings } from '../lib/admin/strings'

// El editor de la entrada y el cierre de las páginas de logro: el de siempre, más el vídeo
// de YouTube, que Torre mete donde quiera entre los párrafos.
export const proseEditor = lexicalEditor({
  // El mismo texto del editor vacío que el resto del panel (src/payload.config.ts).
  admin: { placeholder: panelStrings.editorPlaceholder },
  features: ({ defaultFeatures }) => [
    ...defaultFeatures,
    BlocksFeature({ blocks: [ProseVideoBlock] }),
  ],
})
