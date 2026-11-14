import type { CollectionConfig } from 'payload'

import { achievementStrings, type GroupSection } from '../lib/achievements/strings'
import { fillAchievementGroup } from './achievement-autofill'
import {
  dofusDbNote,
  linkedNameValidator,
  linkedSlugValidator,
  stateField,
} from './achievement-fields'
import { refuseReferencedDelete } from './delete-guard'
import { lockedOnceSet, isAdmin, isPanelUser, readPublishedOrAll } from './editorial-access'
import {
  revalidateAchievementPagesAfterChange,
  revalidateAchievementPagesAfterDelete,
} from './revalidate-guides'
import { rejectSharedSlug } from './root-slug'
import { SLUG_LABEL, slugAdmin } from './slug-field'
import { panelStrings } from '../lib/admin/strings'

const note = (field: string) => dofusDbNote('group', field)
const SECTIONS: GroupSection[] = ['stories', 'zones', 'seasonal']

// Los metalogros del índice de Torre (/metalogros): una zona o historia del juego que agrupa
// logros, casi siempre una categoría de DofusDB. Lo vacío se rellena con DofusDB al guardar.
export const AchievementGroups: CollectionConfig = {
  slug: 'achievement-groups',
  labels: { singular: 'Metalogro', plural: 'Metalogros' },
  admin: {
    useAsTitle: 'name',
    group: panelStrings.groups.content,
    hideAPIURL: true,
    defaultColumns: ['name', 'section', 'order', 'state', '_status', 'updatedAt'],
    listSearchableFields: ['name', 'slug'],
  },
  access: {
    read: readPublishedOrAll,
    create: isPanelUser,
    update: isPanelUser,
    // Salen de DofusDB (pnpm data:quests): solo un administrador borra (backlog A-15).
    delete: isAdmin,
  },
  versions: { drafts: true, maxPerDoc: 50 },
  hooks: {
    beforeValidate: [fillAchievementGroup, rejectSharedSlug('achievement-groups')],
    // Borradores incluidos: es barato y cubre despublicar.
    afterChange: [revalidateAchievementPagesAfterChange],
    // No se borra un metalogro que tiene páginas de logro (A-17).
    beforeDelete: [refuseReferencedDelete('achievement-groups')],
    afterDelete: [revalidateAchievementPagesAfterDelete],
  },
  fields: [
    {
      name: 'category',
      label: 'Categoría de DofusDB',
      type: 'relationship',
      relationTo: 'achievement-categories',
      unique: true,
      access: lockedOnceSet('category'),
      admin: {
        description:
          'Sus logros son los de esta categoría. Sin categoría (Misiones de templo), el ' +
          'metalogro tiene solo guías o ninguna página.' +
          ` ${panelStrings.locks.dofusDb}`,
      },
    },
    {
      name: 'name',
      label: 'Nombre',
      type: 'text',
      required: true,
      localized: true,
      validate: linkedNameValidator('category'),
      admin: note('name'),
    },
    {
      name: 'slug',
      label: SLUG_LABEL,
      type: 'text',
      required: true,
      unique: true,
      index: true,
      validate: linkedSlugValidator('category'),
      admin: slugAdmin(
        'La de tu web: metalogro-astrub. El metalogro se abre en su panel del índice.',
        'metalogro',
      ),
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
      access: lockedOnceSet('order'),
      admin: {
        ...dofusDbNote('group', 'order', panelStrings.locks.order),
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
