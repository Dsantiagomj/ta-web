import type { CollectionConfig } from 'payload'

import { fillAchievementPage } from './achievement-autofill'
import {
  dofusDbNote,
  linkedNameValidator,
  linkedSlugValidator,
  stateField,
} from './achievement-fields'
import { isPanelUser, readPublishedOrAll } from './editorial-access'
import {
  revalidateAchievementPagesAfterChange,
  revalidateAchievementPagesAfterDelete,
} from './revalidate-guides'
import { rejectSharedSlug } from './root-slug'

const note = (field: string) => dofusDbNote('achievement', field)

// Las páginas de logro de Torre: cada una enlaza un logro de DofusDB y copia lo que la
// página enseña. Lo vacío se rellena con DofusDB al guardar; lo escrito no se toca nunca,
// tampoco al refrescar los datos del juego (como las guías con su misión).
export const AchievementPages: CollectionConfig = {
  slug: 'achievement-pages',
  labels: { singular: 'Logro', plural: 'Logros' },
  admin: {
    useAsTitle: 'name',
    group: 'Guías',
    defaultColumns: ['name', 'group', 'state', '_status', 'updatedAt'],
  },
  access: {
    read: readPublishedOrAll,
    create: isPanelUser,
    update: isPanelUser,
    delete: isPanelUser,
  },
  versions: { drafts: true, maxPerDoc: 50 },
  hooks: {
    beforeValidate: [fillAchievementPage, rejectSharedSlug('achievement-pages')],
    // Borradores incluidos: es barato y cubre despublicar.
    afterChange: [revalidateAchievementPagesAfterChange],
    afterDelete: [revalidateAchievementPagesAfterDelete],
  },
  fields: [
    {
      name: 'achievement',
      label: 'Logro de DofusDB',
      type: 'relationship',
      relationTo: 'achievements',
      required: true,
      unique: true,
      admin: {
        description:
          'Lo que esté vacío se rellena con sus datos al guardar. Lo que cambies no lo ' +
          'pisa ningún refresco.',
      },
    },
    {
      name: 'name',
      label: 'Nombre',
      type: 'text',
      required: true,
      localized: true,
      validate: linkedNameValidator('achievement'),
      admin: note('name'),
    },
    {
      // Sin traducir: la URL es la misma en todos los idiomas. Comparte /<slug> con las guías.
      name: 'slug',
      label: 'Slug',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      validate: linkedSlugValidator('achievement'),
      admin: {
        position: 'sidebar',
        description:
          'La URL del logro, la misma que en la web de Torre: la-ocasion-hace-al-ladron.',
      },
    },
    stateField,
    {
      name: 'group',
      label: 'Metalogro',
      type: 'relationship',
      relationTo: 'achievement-groups',
      admin: note('group'),
    },
    {
      name: 'order',
      label: 'Orden en el metalogro',
      type: 'number',
      admin: note('order'),
    },
    {
      name: 'quests',
      label: 'Misiones',
      labels: { singular: 'Misión', plural: 'Misiones' },
      type: 'array',
      admin: {
        ...note('quests'),
        initCollapsed: true,
      },
      fields: [
        { name: 'name', label: 'Nombre', type: 'text', localized: true },
        {
          name: 'quests',
          label: 'Misiones de DofusDB',
          type: 'relationship',
          relationTo: 'quests',
          hasMany: true,
          admin: { description: 'Varias son alternativas: se hace una (la misión de clase).' },
        },
      ],
    },
    { name: 'points', label: 'Puntos', type: 'number', admin: note('points') },
    {
      name: 'rewards',
      label: 'Recompensas',
      type: 'group',
      admin: { description: 'Para un personaje de nivel 200, como en tus páginas.' },
      fields: [
        { name: 'experience', label: 'Experiencia', type: 'number', admin: note('experience') },
        { name: 'kamas', label: 'Kamas', type: 'number', admin: note('kamas') },
        {
          name: 'items',
          label: 'Objetos',
          type: 'array',
          admin: note('items'),
          fields: [
            {
              name: 'item',
              label: 'Objeto',
              type: 'relationship',
              relationTo: 'items',
              required: true,
            },
            { name: 'quantity', label: 'Cantidad', type: 'number', required: true, min: 1 },
          ],
        },
      ],
    },
    {
      name: 'intro',
      label: 'Entrada',
      type: 'richText',
      localized: true,
      admin: { description: 'Texto antes de las misiones. Opcional.' },
    },
    {
      name: 'outro',
      label: 'Cierre',
      type: 'richText',
      localized: true,
      admin: { description: 'Texto después de las misiones. Opcional.' },
    },
  ],
}
