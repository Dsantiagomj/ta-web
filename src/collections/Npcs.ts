import type { CollectionConfig } from 'payload'

import { gameDataAccess } from './game-data-access'
import { panelStrings } from '../lib/admin/strings'

// PNJ de DofusDB que dan misiones o que nombran sus objetivos: su nombre, su look y sus
// renders importados a Media (DESIGN.md, Quest header). Nada se carga de DofusDB al servir
// la web.
export const Npcs: CollectionConfig = {
  slug: 'npcs',
  labels: { singular: 'PNJ de DofusDB', plural: 'PNJ de DofusDB' },
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
      name: 'look',
      label: 'Look',
      type: 'text',
      admin: { description: 'Su apariencia en DofusDB, de la que sale el render.' },
    },
    {
      name: 'renderRight',
      label: 'Render mirando a la derecha',
      type: 'upload',
      relationTo: 'media',
      admin: { description: 'Junto al título de la guía, en escritorio.' },
    },
    {
      name: 'renderLeft',
      label: 'Render mirando a la izquierda',
      type: 'upload',
      relationTo: 'media',
      admin: { description: 'A la derecha del título, en el móvil.' },
    },
    {
      name: 'refreshedAt',
      label: 'Actualizado el',
      type: 'date',
      admin: { description: 'La pone el script de refresco.' },
    },
  ],
}
