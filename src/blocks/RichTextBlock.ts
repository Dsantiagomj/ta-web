import type { Block } from 'payload'

import { blockImages } from '../lib/admin/block-thumbnails'

// Prosa de la guía. Usa el editor Lexical de la configuración general.
export const RichTextBlock: Block = {
  slug: 'richText',
  interfaceName: 'RichTextBlock',
  admin: { images: blockImages('richText') },
  labels: { singular: 'Texto', plural: 'Textos' },
  fields: [
    {
      name: 'content',
      label: 'Texto',
      type: 'richText',
      required: true,
      localized: true,
    },
  ],
}
