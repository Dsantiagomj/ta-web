import type { Field } from 'payload'

/**
 * Los campos de datos de una lista, sin las piezas que solo los colocan en el formulario:
 * filas, desplegables y pestañas sin nombre no cambian dónde se guardan. Una pestaña con
 * nombre sí guarda sus campos dentro: sale como un grupo con ese nombre.
 */
export function layoutFields(fields: Field[]): Field[] {
  return fields.flatMap((candidate): Field[] => {
    if (candidate.type === 'row' || candidate.type === 'collapsible') {
      return layoutFields(candidate.fields)
    }
    if (candidate.type === 'tabs') {
      return candidate.tabs.flatMap((tab): Field[] =>
        'name' in tab && tab.name
          ? [{ type: 'group', name: tab.name, label: tab.label, fields: tab.fields } as Field]
          : layoutFields(tab.fields),
      )
    }
    return [candidate]
  })
}
