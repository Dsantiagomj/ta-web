import type { Field, GlobalConfig } from 'payload'

import { isPanelUser } from '../collections/editorial-access'
import { panelStrings } from '../lib/admin/strings'
import { navigationDefaults } from '../lib/site-copy/defaults'
import { validateFeaturedDofus, validateNavSections } from '../lib/site-copy/navigation'
import { siteCopyStrings } from '../lib/site-copy/strings'
import { revalidateSiteCopyAfterChange } from './site-copy-fields'

const s = siteCopyStrings.navigation
const rows = navigationDefaults.sections

/** Checklists no tiene botón en el menú de arriba ni frase: va dentro del panel de Dofus. */
const notChecklists = (_: unknown, sibling: { key?: string } | undefined) =>
  sibling?.key !== 'checklists'

/** Un texto de Torre: vacío, la web pone el de siempre de esa sección (navigationDefaults). */
const text = (
  name: string,
  { label, description }: { label: string; description: string },
  { long = false, hideForChecklists = false } = {},
): Field => {
  const base = {
    name,
    label,
    localized: true,
    admin: { description, ...(hideForChecklists && { condition: notChecklists }) },
  }
  return long ? { ...base, type: 'textarea' } : { ...base, type: 'text' }
}

const sectionFields: Field[] = [
  {
    name: 'key',
    label: s.key,
    type: 'select',
    required: true,
    options: rows.map(({ key, title }) => ({ value: key, label: title })),
    admin: { readOnly: true },
  },
  text('label', s.menuLabel, { hideForChecklists: true }),
  text('title', s.title),
  text('description', s.description, { long: true, hideForChecklists: true }),
  {
    name: 'visible',
    label: s.visible.label,
    type: 'checkbox',
    defaultValue: true,
    admin: { description: s.visible.description },
  },
  {
    name: 'soon',
    label: s.soon.label,
    type: 'checkbox',
    defaultValue: false,
    admin: { description: s.soon.description },
  },
]

// Las secciones del menú, el móvil, el pie y la portada, y los Dofus de la tarjeta del menú
// (src/lib/site-copy/navigation.ts). Su dirección, icono y color van en el código
// (src/components/site/nav.ts): dependen de las rutas y de los colores del diseño.
export const Navigation: GlobalConfig = {
  slug: 'navigation',
  label: s.label,
  admin: { group: panelStrings.groups.settings, hideAPIURL: true, description: s.intro },
  access: { read: () => true, update: isPanelUser },
  hooks: { afterChange: [revalidateSiteCopyAfterChange] },
  fields: [
    {
      name: 'sections',
      label: s.sections.label,
      labels: { singular: s.sections.singular, plural: s.sections.plural },
      type: 'array',
      minRows: rows.length,
      maxRows: rows.length,
      defaultValue: rows,
      validate: validateNavSections,
      admin: {
        description: s.sections.description,
        initCollapsed: true,
        components: {
          RowLabel: {
            path: '/components/admin/RowLabels#TextRowLabel',
            clientProps: { singular: s.sections.singular, field: 'title' },
          },
        },
      },
      fields: sectionFields,
    },
    {
      name: 'featuredDofus',
      label: s.featured.label,
      type: 'relationship',
      relationTo: 'dofus-guides',
      hasMany: true,
      maxRows: 3,
      validate: validateFeaturedDofus,
      // Torre elige entre las guías que ya existen: aquí no se crean.
      admin: { description: s.featured.description, sortOptions: 'name', allowCreate: false },
    },
  ],
}
