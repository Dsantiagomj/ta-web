import type { CollectionBeforeChangeHook, CollectionConfig } from 'payload'

import { isAdmin } from './editorial-access'
import { revalidateAchievementPages, revalidateGuidePages } from './revalidate-guides'
import { zoneBackgroundEndpoint } from '../endpoints/zone-background'
import { panelStrings } from '../lib/admin/strings'

const t = panelStrings.zoneBackground

// Lo único de una subzona que se edita en el panel: su fondo de zona.
const EDITABLE = new Set(['background', 'backgroundMapId'])
const SYSTEM_KEYS = new Set(['id', 'createdAt', 'updatedAt'])

/**
 * Una cuenta del panel solo cambia el fondo: lo demás vuelve a lo guardado, que es de
 * DofusDB. Un script sin cuenta (el refresco, que solo manda sus campos, y el fondo
 * automático) escribe lo que manda.
 */
export const scopeSubAreaWrite: CollectionBeforeChangeHook = ({
  data,
  originalDoc,
  operation,
  req,
}) => {
  const saved = originalDoc as Record<string, unknown> | undefined
  if (operation === 'update' && saved && req.user) {
    for (const key of Object.keys(data)) {
      if (!EDITABLE.has(key) && !SYSTEM_KEYS.has(key)) data[key] = saved[key]
    }
  }
  return data
}

// Las subzonas de DofusDB («Caminos rocosos») con el nombre de su área («Llanuras de
// Cania»): dónde pasa cada objetivo de misión, que solo guarda el ID de su subzona. Su fondo
// (background) es de Torre: sale detrás de las guías y los logros de la zona (DESIGN.md,
// Zone background) y el refresco nunca lo toca.
export const SubAreas: CollectionConfig = {
  slug: 'subareas',
  labels: { singular: 'Subzona de DofusDB', plural: 'Subzonas de DofusDB' },
  admin: {
    useAsTitle: 'name',
    group: panelStrings.groups.gameData,
    hideAPIURL: true,
    defaultColumns: ['name', 'areaName', 'background', 'dofusId'],
  },
  access: {
    read: () => true,
    create: () => false,
    update: isAdmin,
    delete: () => false,
  },
  endpoints: [zoneBackgroundEndpoint],
  hooks: {
    beforeChange: [scopeSubAreaWrite],
    // El fondo sale en las guías y los logros de la zona, que se leen de la caché.
    afterChange: [
      ({ doc }) => {
        revalidateGuidePages()
        revalidateAchievementPages()
        return doc
      },
    ],
  },
  fields: [
    {
      name: 'background',
      label: t.background,
      type: 'upload',
      relationTo: 'media',
      admin: { description: t.backgroundHelp },
    },
    {
      name: 'backgroundMapId',
      label: t.mapId,
      type: 'number',
      min: 1,
      admin: {
        description: t.mapIdHelp,
        components: {
          Description: '/components/admin/ZoneBackgroundButton#ZoneBackgroundButton',
        },
      },
    },
    {
      name: 'dofusId',
      label: 'ID en DofusDB',
      type: 'number',
      required: true,
      unique: true,
      index: true,
      admin: { readOnly: true },
    },
    {
      name: 'name',
      label: 'Nombre',
      type: 'text',
      required: true,
      localized: true,
      admin: { readOnly: true },
    },
    {
      name: 'areaDofusId',
      label: 'ID del área en DofusDB',
      type: 'number',
      admin: { readOnly: true },
    },
    { name: 'areaName', label: 'Área', type: 'text', localized: true, admin: { readOnly: true } },
    {
      name: 'refreshedAt',
      label: 'Actualizado el',
      type: 'date',
      admin: { readOnly: true, description: 'La pone el script de refresco.' },
    },
  ],
}
