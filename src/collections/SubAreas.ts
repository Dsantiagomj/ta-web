import type { CollectionConfig } from 'payload'

import { gameDataAccess } from './game-data-access'
import { panelStrings } from '../lib/admin/strings'

// Las subzonas de DofusDB («Caminos rocosos») con el nombre de su área («Llanuras de
// Cania»): dónde pasa cada objetivo de misión, que solo guarda el ID de su subzona.
export const SubAreas: CollectionConfig = {
  slug: 'subareas',
  labels: { singular: 'Subzona de DofusDB', plural: 'Subzonas de DofusDB' },
  admin: {
    useAsTitle: 'name',
    group: panelStrings.groups.gameData,
    hideAPIURL: true,
    defaultColumns: ['name', 'areaName', 'dofusId'],
    description: 'Datos de DofusDB, de solo lectura. Los actualiza un script.',
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
    { name: 'areaDofusId', label: 'ID del área en DofusDB', type: 'number' },
    { name: 'areaName', label: 'Área', type: 'text', localized: true },
    {
      name: 'refreshedAt',
      label: 'Actualizado el',
      type: 'date',
      admin: { description: 'La pone el script de refresco.' },
    },
  ],
}
