import type { GlobalAfterChangeHook, GlobalConfig } from 'payload'

import { isPanelUser } from '../collections/editorial-access'
import { revalidateDofusGuides } from '../collections/revalidate-guides'
import { dofusGuideStrings } from '../lib/dofus-guides/strings'
import { panelStrings } from '../lib/admin/strings'

// La entradilla del índice /guias-dofus, de Torre: el resto del índice sale de dofus-guides.
const revalidateIndex: GlobalAfterChangeHook = ({ doc }) => {
  revalidateDofusGuides()
  return doc
}

export const DofusGuidesIndex: GlobalConfig = {
  slug: 'dofus-guides-index',
  label: 'Índice de guías de Dofus',
  admin: {
    group: panelStrings.groups.content,
    hideAPIURL: true,
    description: dofusGuideStrings.admin.indexDescription,
  },
  access: {
    read: () => true,
    update: isPanelUser,
  },
  hooks: { afterChange: [revalidateIndex] },
  fields: [
    {
      name: 'intro',
      label: 'Entradilla',
      type: 'richText',
      localized: true,
      admin: { description: dofusGuideStrings.admin.indexIntroDescription },
    },
  ],
}
