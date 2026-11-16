import type { Field } from 'payload'

import { classPageStrings as s } from '../lib/section-pages/strings'
import { validateOptionalUrl } from './Media'
import { rowLabel } from './row-label'
import { sectionPageCollection } from './section-pages'

/** Las builds de un modo de juego: una imagen cada una y, si Torre quiere, adónde lleva. */
const builds = (name: 'pvmBuilds' | 'pvpBuilds', label: string): Field => ({
  name,
  label,
  labels: { singular: s.build, plural: label },
  type: 'array',
  admin: {
    description: s.buildsDescription,
    components: { ...rowLabel('TextRowLabel', { singular: s.build, field: 'name' }) },
  },
  fields: [
    {
      name: 'name',
      label: s.buildName,
      type: 'text',
      localized: true,
      admin: { description: s.buildNameDescription },
    },
    { name: 'image', label: s.buildImage, type: 'upload', relationTo: 'media', required: true },
    {
      name: 'link',
      label: s.buildLink,
      type: 'text',
      validate: validateOptionalUrl,
      admin: { description: s.buildLinkDescription },
    },
  ],
})

// Las páginas de clase de Torre (backlog S-10): casi todas son sus builds de PVM y de PVP,
// cada una una imagen que lleva a la build en Dofusbook; la del Yopuka y la del Selotrop son
// guías largas, que van en la pestaña del texto.
export const ClassPages = sectionPageCollection({
  slug: 'class-pages',
  labels: { singular: 'Clase', plural: 'Clases' },
  strings: s,
  tabsBefore: [
    { label: s.tabs.builds, fields: [builds('pvmBuilds', s.pvm), builds('pvpBuilds', s.pvp)] },
  ],
})
