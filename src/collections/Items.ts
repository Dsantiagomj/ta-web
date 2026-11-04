import type { CollectionConfig } from 'payload'

import { gameDataAccess } from './game-data-access'

// Objetos de DofusDB que nombran las misiones, en recompensas y requisitos.
export const Items: CollectionConfig = {
  slug: 'items',
  labels: { singular: 'Objeto de DofusDB', plural: 'Objetos de DofusDB' },
  admin: {
    useAsTitle: 'name',
    group: 'Datos del juego',
    defaultColumns: ['name', 'dofusId', 'level'],
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
    { name: 'level', label: 'Nivel', type: 'number' },
    { name: 'typeId', label: 'ID de tipo en DofusDB', type: 'number' },
    {
      name: 'iconId',
      label: 'ID del icono',
      type: 'number',
      admin: {
        // Nada se carga de DofusDB ni de Ankama al servir la web: solo se guarda el ID.
        description: 'ID de la imagen en DofusDB.',
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
