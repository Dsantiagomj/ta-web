'use client'

import { TextField, useDocumentInfo, useFormFields } from '@payloadcms/ui'
import type { TextFieldClientComponent } from 'payload'

import { isSavedRowValue } from '@/lib/admin/locked-row'

/**
 * Un texto que se escribe al crear su fila y luego queda fijo, como la clave de un
 * prerrequisito (src/collections/locked-once-saved.ts). Lo guardado es lo último que devolvió
 * el servidor: una fila recién añadida se puede escribir hasta guardar.
 */
export const LockedOnceSavedText: TextFieldClientComponent = (props) => {
  const { data } = useDocumentInfo()
  const rowPath = props.path.slice(0, props.path.lastIndexOf('.'))
  const rowId = useFormFields(([fields]) => fields[`${rowPath}.id`]?.value)
  const locked = isSavedRowValue(data, props.path, rowId)
  return <TextField {...props} readOnly={props.readOnly || locked} />
}
