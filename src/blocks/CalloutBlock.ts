import type { Block } from 'payload'

// Aviso destacado dentro de la guía: consejo, cuidado o alto.
export const CalloutBlock: Block = {
  slug: 'callout',
  interfaceName: 'CalloutBlock',
  labels: { singular: 'Aviso', plural: 'Avisos' },
  fields: [
    {
      name: 'variant',
      label: 'Tipo',
      type: 'select',
      required: true,
      defaultValue: 'tip',
      options: [
        { label: 'Consejo', value: 'tip' },
        { label: 'Cuidado', value: 'warning' },
        { label: 'Alto', value: 'stop' },
      ],
    },
    {
      name: 'content',
      label: 'Texto',
      type: 'richText',
      required: true,
      localized: true,
    },
  ],
}
