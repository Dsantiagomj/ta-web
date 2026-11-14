import type { Field } from 'payload'

/**
 * Los campos con nombre de una lista, también los que van en una fila, un desplegable o una
 * pestaña sin nombre: esos solo los colocan en el panel, no cambian lo guardado.
 */
export const layoutFields = (fields: Field[]): Field[] =>
  fields.flatMap((candidate) =>
    candidate.type === 'row' || candidate.type === 'collapsible'
      ? layoutFields(candidate.fields)
      : candidate.type === 'tabs'
        ? candidate.tabs.flatMap((tab) => ('name' in tab ? [] : layoutFields(tab.fields)))
        : [candidate],
  )
