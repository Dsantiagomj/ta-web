import type { Block } from 'payload'

// Prosa de la guía. Usa el editor Lexical de la configuración general.
export const RichTextBlock: Block = {
  slug: 'richText',
  interfaceName: 'RichTextBlock',
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
