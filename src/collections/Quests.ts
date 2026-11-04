import type { CollectionConfig } from 'payload'

// Datos públicos del juego: cualquiera los lee. Nadie los cambia por la API ni el panel;
// el script de refresco escribe con la API local y overrideAccess: true.
export const questsAccess = {
  read: () => true,
  create: () => false,
  update: () => false,
  delete: () => false,
}

// Misiones de DofusDB. Torre las elige desde las guías con campos de relación.
export const Quests: CollectionConfig = {
  slug: 'quests',
  labels: { singular: 'Misión de DofusDB', plural: 'Misiones de DofusDB' },
  admin: {
    useAsTitle: 'name',
    group: 'Datos del juego',
    defaultColumns: ['name', 'dofusId', 'levelMin'],
    description: 'Datos de DofusDB, de solo lectura. Los actualiza un script.',
  },
  access: questsAccess,
  fields: [
    {
      name: 'dofusId',
      label: 'ID en DofusDB',
      type: 'number',
      required: true,
      unique: true,
      index: true,
    },
    {
      name: 'name',
      label: 'Nombre',
      type: 'text',
      required: true,
      localized: true,
    },
    { name: 'levelMin', label: 'Nivel mínimo', type: 'number' },
    { name: 'levelMax', label: 'Nivel máximo', type: 'number' },
    { name: 'categoryId', label: 'ID de categoría en DofusDB', type: 'number' },
    {
      name: 'startCriterion',
      label: 'Criterio de inicio',
      type: 'text',
      admin: {
        // Se guarda tal cual para calcular datos derivados más adelante.
        description: 'Criterio en bruto de DofusDB, como Ps=1&Pa=1&PL>29&Qf=55.',
      },
    },
    {
      name: 'prerequisites',
      label: 'Prerrequisitos',
      type: 'relationship',
      relationTo: 'quests',
      hasMany: true,
      admin: {
        description: 'Misiones que hay que terminar antes.',
      },
    },
    {
      // DofusDB puede dar varias, por ejemplo una por clase.
      name: 'startPositions',
      label: 'Posiciones de inicio',
      type: 'array',
      fields: [
        { name: 'npcId', label: 'ID del PNJ', type: 'number' },
        { name: 'npcName', label: 'Nombre del PNJ', type: 'text', localized: true },
        { name: 'mapId', label: 'ID del mapa', type: 'number' },
        { name: 'x', label: 'X', type: 'number' },
        { name: 'y', label: 'Y', type: 'number' },
      ],
    },
    {
      name: 'refreshedAt',
      label: 'Actualizada el',
      type: 'date',
      admin: {
        description: 'La pone el script de refresco.',
      },
    },
  ],
}
