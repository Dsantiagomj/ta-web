import type { CollectionConfig } from 'payload'

import { gameDataAccess } from './game-data-access'
import { panelStrings } from '../lib/admin/strings'

// Las mazmorras de DofusDB con sus jefes: «Necesitarás en total» pinta el jefe de la
// mazmorra que nombra una nota de Torre («Mazmorra Kumijo»).
export const Dungeons: CollectionConfig = {
  slug: 'dungeons',
  labels: { singular: 'Mazmorra de DofusDB', plural: 'Mazmorras de DofusDB' },
  admin: {
    useAsTitle: 'name',
    group: panelStrings.groups.gameData,
    hideAPIURL: true,
    defaultColumns: ['name', 'bosses', 'dofusId'],
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
      name: 'bosses',
      label: 'Jefes',
      type: 'relationship',
      relationTo: 'monsters',
      hasMany: true,
      admin: { description: 'En el orden de DofusDB; la página pinta el primero.' },
    },
    {
      name: 'refreshedAt',
      label: 'Actualizado el',
      type: 'date',
      admin: { description: 'La pone el script de refresco.' },
    },
  ],
}
