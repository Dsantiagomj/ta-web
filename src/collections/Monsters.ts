import type { CollectionConfig } from 'payload'

import { gameDataAccess } from './game-data-access'

// Monstruos de DofusDB que piden los objetivos de las misiones.
export const Monsters: CollectionConfig = {
  slug: 'monsters',
  labels: { singular: 'Monstruo de DofusDB', plural: 'Monstruos de DofusDB' },
  admin: {
    useAsTitle: 'name',
    group: 'Datos del juego',
    defaultColumns: ['name', 'dofusId'],
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
    {
      name: 'iconId',
      label: 'ID de la imagen',
      type: 'number',
      admin: {
        // DofusDB lo llama gfxId. Nada se carga de DofusDB ni de Ankama al servir la web.
        description: 'ID de la imagen en DofusDB (gfxId).',
      },
    },
    {
      name: 'refreshedAt',
      label: 'Actualizado el',
      type: 'date',
      admin: { description: 'La pone el script de refresco.' },
    },
  ],
}
