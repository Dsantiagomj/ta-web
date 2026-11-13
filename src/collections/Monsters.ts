import type { CollectionConfig } from 'payload'

import { gameDataAccess } from './game-data-access'
import { panelStrings } from '../lib/admin/strings'

// Todo el catálogo de monstruos de DofusDB: los que piden las misiones y los que nombran
// los combates de las guías.
export const Monsters: CollectionConfig = {
  slug: 'monsters',
  labels: { singular: 'Monstruo de DofusDB', plural: 'Monstruos de DofusDB' },
  admin: {
    useAsTitle: 'name',
    group: panelStrings.groups.gameData,
    hideAPIURL: true,
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
      name: 'image',
      label: 'Imagen',
      type: 'upload',
      relationTo: 'media',
      admin: {
        description: 'Importada una vez de DofusDB a Media al refrescar los datos del juego.',
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
