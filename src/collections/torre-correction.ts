import type {
  Access,
  CollectionBeforeChangeHook,
  CollectionConfig,
  Field,
  GroupField,
} from 'payload'

import { panelStrings } from '../lib/admin/strings'
import { hasCorrection, type Correction } from '../lib/game-data/correction'
import { isPanelUser } from './editorial-access'

// «Corrección de Torre» en los datos de DofusDB: un grupo que solo edita el panel y que los
// scripts de refresco nunca escriben. Lo demás del dato sigue siendo de DofusDB.

const t = panelStrings.correction

/** Todos leen; nadie crea ni borra; una cuenta del panel edita, solo la corrección. */
export const correctableAccess = {
  read: () => true,
  create: () => false,
  update: isPanelUser,
  delete: () => false,
} satisfies Record<string, Access>

interface CorrectionOptions {
  /** Si el dato enseña un nivel (no los PNJ). */
  level: boolean
  /** Si el dato enseña una imagen y puede ocultarse (no las misiones). */
  image: boolean
}

function correctionField({ level, image }: CorrectionOptions): GroupField {
  const fields: Field[] = [
    {
      name: 'name',
      label: t.name,
      type: 'text',
      localized: true,
      admin: { description: t.nameHelp },
    },
  ]
  if (level) {
    fields.push({
      name: 'level',
      label: t.level,
      type: 'number',
      admin: { description: t.levelHelp },
    })
  }
  if (image) {
    fields.push(
      {
        name: 'image',
        label: t.image,
        type: 'upload',
        relationTo: 'media',
        admin: { description: t.imageHelp },
      },
      { name: 'hidden', label: t.hidden, type: 'checkbox', admin: { description: t.hiddenHelp } },
    )
  }
  return {
    name: 'correction',
    label: t.label,
    type: 'group',
    admin: { description: t.help },
    fields,
  }
}

const SYSTEM_KEYS = new Set(['id', 'createdAt', 'updatedAt'])

/**
 * Lo que se escribe en un dato del juego. Una cuenta del panel solo cambia la corrección: lo
 * demás vuelve a lo guardado. Un script (sin cuenta) escribe lo de DofusDB y nunca la
 * corrección, que se queda como estaba. Al crear se guarda todo. En los dos casos marca
 * «Corregido por Torre» si queda algo corregido.
 */
export const scopeCorrectionWrite: CollectionBeforeChangeHook = ({
  data,
  originalDoc,
  operation,
  req,
}) => {
  const saved = originalDoc as Record<string, unknown> | undefined
  if (operation === 'update' && saved) {
    if (req.user) {
      for (const key of Object.keys(data)) {
        if (key !== 'correction' && !SYSTEM_KEYS.has(key)) data[key] = saved[key]
      }
    } else data.correction = saved.correction
  }
  data.corrected = hasCorrection(data.correction as Correction | undefined)
  return data
}

function readOnly(field: Field): Field {
  if (!('name' in field)) return field
  return { ...field, admin: { ...field.admin, readOnly: true } } as Field
}

/**
 * Un dato del juego con «Corrección de Torre»: el grupo arriba del formulario, lo demás de
 * solo lectura, la columna «Corregido por Torre» y la búsqueda por los dos nombres.
 */
export function withTorreCorrection(
  collection: CollectionConfig,
  options: CorrectionOptions,
): CollectionConfig {
  return {
    ...collection,
    access: correctableAccess,
    admin: {
      ...collection.admin,
      defaultColumns: [...(collection.admin?.defaultColumns ?? []), 'corrected'],
      listSearchableFields: ['name', 'correction.name'],
    },
    hooks: {
      ...collection.hooks,
      beforeChange: [...(collection.hooks?.beforeChange ?? []), scopeCorrectionWrite],
    },
    fields: [
      correctionField(options),
      ...collection.fields.map(readOnly),
      {
        name: 'corrected',
        label: t.flag,
        type: 'checkbox',
        index: true,
        defaultValue: false,
        admin: { readOnly: true, position: 'sidebar', description: t.flagHelp },
      },
    ],
  }
}
