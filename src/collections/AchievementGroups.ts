import type { CollectionConfig } from 'payload'

import { achievementStrings, type GroupSection } from '../lib/achievements/strings'
import { fillAchievementGroup } from './achievement-autofill'
import { dofusDbNote, stateField } from './achievement-fields'
import { isPanelUser, readPublishedOrAll } from './editorial-access'
import { validateSlug } from './QuestGuides'
import { rejectSharedSlug } from './root-slug'

const note = (field: string) => dofusDbNote('group', field)
const SECTIONS: GroupSection[] = ['stories', 'zones', 'seasonal']

// Los metalogros del índice de Torre (/metalogros): una zona o historia del juego que agrupa
// logros, casi siempre una categoría de DofusDB. Lo vacío se rellena con DofusDB al guardar.
export const AchievementGroups: CollectionConfig = {
  slug: 'achievement-groups',
  labels: { singular: 'Metalogro', plural: 'Metalogros' },
  admin: {
    useAsTitle: 'name',
    group: 'Guías',
    defaultColumns: ['name', 'section', 'order', 'state', 'updatedAt'],
  },
  access: {
    read: readPublishedOrAll,
    create: isPanelUser,
    update: isPanelUser,
    delete: isPanelUser,
  },
  versions: { drafts: true, maxPerDoc: 50 },
  hooks: {
    beforeValidate: [fillAchievementGroup, rejectSharedSlug('achievement-groups')],
  },
  fields: [
    {
      name: 'category',
      label: 'Categoría de DofusDB',
      type: 'relationship',
      relationTo: 'achievement-categories',
      unique: true,
      admin: {
        description:
          'Sus logros son los de esta categoría. Sin categoría (Misiones de templo), el ' +
          'metalogro tiene solo guías o ninguna página.',
      },
    },
    {
      name: 'name',
      label: 'Nombre',
      type: 'text',
      required: true,
      localized: true,
      admin: note('name'),
    },
    {
      name: 'slug',
      label: 'Slug',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      validate: validateSlug,
      admin: {
        position: 'sidebar',
        description: 'El de tu web: metalogro-astrub.',
      },
    },
    stateField,
    {
      name: 'section',
      label: 'Grupo del índice',
      type: 'select',
      options: SECTIONS.map((value) => ({ value, label: achievementStrings.sections[value] })),
      admin: note('section'),
    },
    {
      name: 'order',
      label: 'Orden',
      type: 'number',
      admin: {
        ...note('order'),
        // La nota explica de dónde sale; esto, cómo se usa.
        placeholder: 'En Zonas el índice ordena de la A a la Z',
      },
    },
    {
      // Un PNJ o un monstruo: el arte de la tarjeta del índice. Por defecto, quien da la
      // primera misión del primer logro.
      name: 'representative',
      label: 'Representante',
      type: 'relationship',
      relationTo: ['npcs', 'monsters'],
      admin: note('representative'),
    },
    {
      name: 'intro',
      label: 'Entrada',
      type: 'richText',
      localized: true,
      admin: { description: 'Texto antes de los logros. Opcional.' },
    },
    {
      name: 'guides',
      label: 'Otras guías',
      type: 'relationship',
      relationTo: 'quest-guides',
      hasMany: true,
      admin: {
        description:
          'Guías que no son de ningún logro, en este orden. Un metalogro puede tener solo guías ' +
          '(Alineamiento).',
      },
    },
  ],
}
