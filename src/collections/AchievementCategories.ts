import type { CollectionConfig } from 'payload'

import { gameDataAccess } from './game-data-access'
import { panelStrings } from '../lib/admin/strings'

// Categorías de logros de DofusDB («Astrub», dentro de «Misiones»). Cada metalogro de Torre
// apunta a una; el refresco las trae todas.
export const AchievementCategories: CollectionConfig = {
  slug: 'achievement-categories',
  labels: { singular: 'Categoría de logros de DofusDB', plural: 'Categorías de logros de DofusDB' },
  admin: {
    useAsTitle: 'name',
    group: panelStrings.groups.gameData,
    hideAPIURL: true,
    defaultColumns: ['name', 'dofusId', 'parent', 'order'],
  },
  access: gameDataAccess,
  fields: [
    {
      name: 'dofusId',
      label: 'ID en DofusDB',
      type: 'number',
      required: true,
      unique: true,
      index: true,
    },
    { name: 'name', label: 'Nombre', type: 'text', required: true, localized: true },
    {
      name: 'parent',
      label: 'Categoría madre',
      type: 'relationship',
      relationTo: 'achievement-categories',
      admin: { description: 'Misiones o Eventos, en las categorías de misiones.' },
    },
    { name: 'order', label: 'Orden', type: 'number' },
    {
      name: 'refreshedAt',
      label: 'Actualizada el',
      type: 'date',
      admin: { description: 'La pone el script de refresco.' },
    },
  ],
}
