import type { GlobalAfterChangeHook, GlobalConfig } from 'payload'

import { isPanelUser } from '../collections/editorial-access'
import { revalidateChecklists } from '../collections/revalidate-guides'
import { panelStrings } from '../lib/admin/strings'
import { checklistStrings } from '../lib/checklists/strings'

const s = checklistStrings.admin.teaser

// Lo del índice /checklists que no es de ninguna checklist: la tarjeta «???» del final, la
// siguiente checklist que prepara Torre (DESIGN.md, Checklists index). Las demás tarjetas salen
// de la colección checklists.
const revalidateIndex: GlobalAfterChangeHook = ({ doc }) => {
  revalidateChecklists()
  return doc
}

export const ChecklistsIndex: GlobalConfig = {
  slug: 'checklists-index',
  label: 'Índice de checklists',
  admin: {
    group: panelStrings.groups.content,
    hideAPIURL: true,
    description: s.indexDescription,
  },
  access: {
    read: () => true,
    update: isPanelUser,
  },
  hooks: { afterChange: [revalidateIndex] },
  fields: [
    {
      name: 'teaser',
      label: 'Tarjeta «Próximamente»',
      type: 'group',
      admin: { description: s.description },
      fields: [
        {
          name: 'enabled',
          label: 'Se ve en el índice',
          type: 'checkbox',
          defaultValue: true,
          admin: { description: s.enabled },
        },
        {
          name: 'label',
          label: 'Etiqueta',
          type: 'text',
          localized: true,
          defaultValue: 'En camino',
          admin: { description: s.label },
        },
        {
          name: 'text',
          label: 'Texto',
          type: 'text',
          localized: true,
          defaultValue: '???',
          admin: { description: s.text },
        },
        {
          name: 'scene',
          label: 'Escena',
          type: 'upload',
          relationTo: 'media',
          admin: { description: s.scene },
        },
        {
          name: 'egg',
          label: 'Huevo',
          type: 'upload',
          relationTo: 'media',
          admin: { description: s.egg },
        },
      ],
    },
    {
      // Lo último que escribió la importación de las tarjetas (pnpm import:checklist-cards): al
      // repetirla, lo que ya no coincide lo cambió Torre y no se toca.
      name: 'importSnapshot',
      type: 'json',
      admin: { hidden: true },
    },
  ],
}
