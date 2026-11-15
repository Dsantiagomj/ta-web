import type { CollectionConfig } from 'payload'

import { isPanelUser } from './editorial-access'
import { panelStrings } from '../lib/admin/strings'
import { REFRESH_STATUSES, REFRESH_TRIGGERS } from '../lib/game-data/refresh-run-values'

const t = panelStrings.gameDataRefresh
const withTime = {
  date: { pickerAppearance: 'dayAndTime' as const, displayFormat: panelStrings.dateFormat },
}

// Cada refresco de los datos del juego desde DofusDB (src/lib/game-data/refresh-runs.ts):
// quién lo lanzó, cuándo y cómo acabó. Solo lo escribe el refresco, con la API local; el
// panel lo lee. La fila en marcha lleva `lock`, único en la base: así dos refrescos no
// corren a la vez, tampoco desde dos procesos (la tarea semanal de Railway y el panel).
export const GameDataRefreshes: CollectionConfig = {
  slug: 'game-data-refreshes',
  labels: { singular: t.singular, plural: t.plural },
  admin: {
    useAsTitle: 'startedAt',
    group: panelStrings.groups.gameData,
    hideAPIURL: true,
    defaultColumns: ['startedAt', 'status', 'trigger', 'finishedAt'],
  },
  defaultSort: '-startedAt',
  access: {
    read: isPanelUser,
    create: () => false,
    update: () => false,
    delete: () => false,
  },
  fields: [
    {
      name: 'startedAt',
      label: t.startedAt,
      type: 'date',
      required: true,
      index: true,
      admin: { readOnly: true, ...withTime },
    },
    {
      name: 'finishedAt',
      label: t.finishedAt,
      type: 'date',
      admin: { readOnly: true, ...withTime },
    },
    {
      name: 'status',
      label: t.status,
      type: 'select',
      required: true,
      options: REFRESH_STATUSES.map((value) => ({ value, label: t.statuses[value] })),
      admin: { readOnly: true },
    },
    {
      name: 'trigger',
      label: t.trigger,
      type: 'select',
      required: true,
      options: REFRESH_TRIGGERS.map((value) => ({ value, label: t.triggers[value] })),
      admin: { readOnly: true },
    },
    {
      name: 'requestedBy',
      label: t.requestedBy,
      type: 'relationship',
      relationTo: 'users',
      admin: { readOnly: true },
    },
    {
      name: 'report',
      label: t.report,
      type: 'textarea',
      admin: { readOnly: true, description: t.reportHelp },
    },
    { name: 'error', label: t.error, type: 'textarea', admin: { readOnly: true } },
    // El resumen entero, para quien lo lea con la API; el panel enseña `report`.
    { name: 'summary', type: 'json', admin: { hidden: true } },
    {
      // «running» (REFRESH_LOCK) mientras corre; vacío al acabar. Único: un segundo refresco no puede
      // apuntarse en marcha mientras haya otro.
      name: 'lock',
      type: 'text',
      unique: true,
      admin: { hidden: true },
    },
  ],
}
