import type { CollectionConfig } from 'payload'

import { fillAchievementPage } from './achievement-autofill'
import {
  dofusDbNote,
  linkedNameValidator,
  linkedSlugValidator,
  stateField,
} from './achievement-fields'
import { refuseReferencedDelete } from './delete-guard'
import { lockedOnceSet, isAdmin, isPanelUser, readPublishedOrAll } from './editorial-access'
import { proseEditor } from './prose-editor'
import {
  revalidateAchievementPagesAfterChange,
  revalidateAchievementPagesAfterDelete,
} from './revalidate-guides'
import { rejectSharedSlug } from './root-slug'
import { rowLabel } from './row-label'
import { SLUG_LABEL, slugAdmin } from './slug-field'
import { panelStrings } from '../lib/admin/strings'
import { pagePreview, withPublishStatus } from '../lib/admin/live-preview'

const note = (field: string) => dofusDbNote('achievement', field)

// Las páginas de logro de Torre: cada una enlaza un logro de DofusDB y copia lo que la
// página enseña. Lo vacío se rellena con DofusDB al guardar; lo escrito no se toca nunca,
// tampoco al refrescar los datos del juego (como las guías con su misión).
export const AchievementPages: CollectionConfig = {
  slug: 'achievement-pages',
  labels: { singular: 'Logro', plural: 'Logros' },
  admin: {
    useAsTitle: 'name',
    group: panelStrings.groups.content,
    hideAPIURL: true,
    defaultColumns: ['name', 'group', 'state', '_status', 'updatedAt'],
    listSearchableFields: ['name', 'slug'],
    // La página pública en el panel, borrador incluido, como las guías.
    ...pagePreview,
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
    beforeValidate: [fillAchievementPage, rejectSharedSlug('achievement-pages')],
    // Borradores incluidos: es barato y cubre despublicar.
    afterChange: [revalidateAchievementPagesAfterChange],
    // No se borra una página de logro que sale en una guía de Dofus (A-17).
    beforeDelete: [refuseReferencedDelete('achievement-pages')],
    afterDelete: [revalidateAchievementPagesAfterDelete],
  },
  fields: withPublishStatus([
    {
      name: 'achievement',
      label: 'Logro de DofusDB',
      type: 'relationship',
      relationTo: 'achievements',
      required: true,
      unique: true,
      access: lockedOnceSet('achievement'),
      admin: {
        description:
          'Lo que esté vacío se rellena con sus datos al guardar. Lo que cambies no lo ' +
          'pisa ningún refresco.' +
          ` ${panelStrings.locks.dofusDb}`,
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
      label: SLUG_LABEL,
      type: 'text',
      required: true,
      unique: true,
      index: true,
      validate: linkedSlugValidator('achievement'),
      admin: slugAdmin(
        'La del logro, la misma que en tu web: la-ocasion-hace-al-ladron. Si ya elegiste el ' +
          'logro de DofusDB, puedes dejarla vacía: al guardar sale del nombre.',
      ),
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
      access: lockedOnceSet('order'),
      admin: dofusDbNote('achievement', 'order', panelStrings.locks.order),
    },
    {
      name: 'quests',
      label: 'Misiones',
      labels: { singular: 'Misión', plural: 'Misiones' },
      type: 'array',
      admin: {
        ...note('quests'),
        initCollapsed: true,
        components: {
          ...note('quests').components,
          ...rowLabel('RelationRowLabel', {
            singular: panelStrings.rowLabels.quest,
            textField: 'name',
            relationField: 'quests',
            relationTo: 'quests',
          }),
        },
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
          labels: { singular: 'Objeto', plural: 'Objetos' },
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
      editor: proseEditor,
      admin: {
        description:
          'Texto antes de las misiones. Opcional. Admite vídeos de YouTube: «+» o «/», Vídeo.',
      },
    },
    {
      name: 'outro',
      label: 'Cierre',
      type: 'richText',
      localized: true,
      editor: proseEditor,
      admin: {
        description:
          'Texto después de las misiones. Opcional. Admite vídeos de YouTube: «+» o «/», Vídeo.',
      },
    },
    {
      // Lo último que escribió la importación de la prosa de Torre en la entrada y el cierre:
      // al repetirla, un campo que ya no coincide lo cambió Torre y no se toca
      // (scripts/import/achievements/load-prose.ts).
      name: 'importSnapshot',
      type: 'json',
      admin: { hidden: true },
    },
  ]),
}
