// Qué rellena el panel al elegir la misión. Se decide dos veces: al planear, con lo que
// hay en el formulario, y justo antes de aplicar, porque entre medias se espera a la API
// (el slug libre) y Torre puede haber escrito en algún campo.

import { autofillFromQuest } from './autofill'
import { FILLABLE_FIELDS, summaryToFill, type LinkedQuest, type NeedRow } from './summary'

export const NEEDS_PATH = 'summary.needs.items'

/** Lee el valor actual de un campo por su ruta, como getDataByPath del formulario. */
export type ReadField = (path: string) => unknown

export interface FormFill {
  /** Ruta del campo y valor. El slug sale sin comprobar que esté libre. */
  values: Record<string, string | number>
  /** Las filas para la lista vacía de Necesitarás. */
  needsItems: { item: number; quantity: number }[]
}

function isBlank(value: unknown): boolean {
  if (typeof value === 'number') return false
  return typeof value === 'string' ? !value.trim() : value == null
}

// Las filas de la lista. Payload da un array; un número sería el recuento de filas.
function rows(value: unknown): NeedRow[] {
  if (Array.isArray(value)) return value as NeedRow[]
  const count = typeof value === 'number' ? value : 0
  return Array.from({ length: count }, () => ({ item: null, quantity: null }))
}

/** Lo que la misión rellenaría en el formulario tal como está ahora. */
export function plannedFormFill(read: ReadField, quest: LinkedQuest): FormFill {
  const text = (path: string) => read(path) as string | null | undefined
  const fill = autofillFromQuest(
    {
      title: text('title'),
      slug: text('slug'),
      metaTitle: text('seo.metaTitle'),
      metaDescription: text('seo.metaDescription'),
    },
    quest,
  )
  const { needs, ...summary } = summaryToFill(
    {
      ...Object.fromEntries(
        FILLABLE_FIELDS.map((field) => [field, read(`summary.${field}`) as string | number]),
      ),
      needs: { items: rows(read(NEEDS_PATH)) },
    },
    quest,
  )

  const candidates: [string, string | number | null | undefined][] = [
    ['title', fill.title],
    ['slug', fill.slug],
    ['seo.metaTitle', fill.metaTitle],
    ['seo.metaDescription', fill.metaDescription],
    ...Object.entries(summary).map(([field, value]): [string, string | number | null] => [
      `summary.${field}`,
      value,
    ]),
  ]
  const values: FormFill['values'] = {}
  for (const [path, value] of candidates) if (!isBlank(value)) values[path] = value!
  return { values, needsItems: needs?.items ?? [] }
}

/** Lo planeado que sigue vacío en el formulario: lo que Torre escribió entre medias se queda. */
export function stillEmpty(planned: FormFill, read: ReadField): FormFill {
  return {
    values: Object.fromEntries(
      Object.entries(planned.values).filter(([path]) => isBlank(read(path))),
    ),
    needsItems: rows(read(NEEDS_PATH)).length ? [] : planned.needsItems,
  }
}
