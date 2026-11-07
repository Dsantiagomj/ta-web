import type { Block } from 'payload'

import { guideStrings } from '../lib/guides/strings'

const s = guideStrings.admin.fight

// Un combate de la guía (DESIGN.md, Monster chip and fight block): los monstruos de DofusDB
// contra los que se lucha, con su cantidad. La frase que lo presenta («Vas a empezar una
// lucha contra:») va en el texto de antes.
export const FightBlock: Block = {
  slug: 'fight',
  interfaceName: 'FightBlock',
  labels: { singular: s.singular, plural: s.plural },
  fields: [
    {
      name: 'monsters',
      label: s.monsters,
      labels: { singular: s.monster, plural: s.monsters },
      type: 'array',
      required: true,
      minRows: 1,
      fields: [
        {
          name: 'monster',
          label: s.monster,
          type: 'relationship',
          relationTo: 'monsters',
          required: true,
        },
        {
          name: 'quantity',
          label: s.quantity,
          type: 'number',
          required: true,
          min: 1,
          defaultValue: 1,
        },
      ],
    },
  ],
}
