import type { CollectionBeforeOperationHook, FieldHook } from 'payload'

import { lockedRowValue } from '../lib/admin/locked-row'

// Un texto de una fila que se escribe al crearla y luego no cambia, como la clave de un
// prerrequisito de checklist: guarda lo que cada persona marcó (docs/research/backlog.md,
// A-23). En el panel se ve de solo lectura; aquí se protege también de la API.

/** Dónde se apuntan, en req.context, las filas que llegaron sin id. */
const ROWS_WITHOUT_ID = 'lockedOnceSaved.rowsWithoutId'

/** Los caminos de las filas de `rowPath` («prerequisites.groups.rows») que no traen id. */
function rowsWithoutId(data: unknown, segments: string[], prefix: string[] = []): string[] {
  if (segments.length === 0) return []
  const [head, ...rest] = segments
  const value = data && typeof data === 'object' ? (data as Record<string, unknown>)[head!] : null
  if (!Array.isArray(value)) {
    return rest.length && value ? rowsWithoutId(value, rest, [...prefix, head!]) : []
  }
  return value.flatMap((row, index) => {
    const here = [...prefix, head!, String(index)]
    if (rest.length) return rowsWithoutId(row, rest, here)
    const id = row && typeof row === 'object' ? (row as { id?: unknown }).id : null
    return id ? [] : [here.join('.')]
  })
}

/**
 * Payload le pone un id nuevo a una fila que llega sin él antes de cualquier otro hook, y así
 * parece una fila nueva del panel. Este, que ve la petición tal cual, apunta cuáles llegaron
 * sin id para que keepSavedValue no les deje cambiar una clave guardada.
 */
export const rememberRowsWithoutId =
  (rowPath: string): CollectionBeforeOperationHook =>
  ({ args, operation, req }) => {
    if (operation !== 'update') return args
    const data = (args as { data?: unknown }).data
    const found = rowsWithoutId(data, rowPath.split('.'))
    const known = (req.context[ROWS_WITHOUT_ID] as string[] | undefined) ?? []
    req.context[ROWS_WITHOUT_ID] = [...known, ...found]
    return args
  }

/**
 * Una fila ya guardada se queda con su valor, llegue el que llegue, aunque se haya movido a
 * otro grupo o llegue sin su id (src/lib/admin/locked-row.ts). Una fila nueva lleva el que
 * traiga.
 */
export const keepSavedValue: FieldHook = ({ value, originalDoc, data, path, siblingData, req }) => {
  if (!originalDoc) return value
  const rowPath = path.slice(0, -1).map(String).join('.')
  const withoutId = (req.context[ROWS_WITHOUT_ID] as string[] | undefined) ?? []
  return lockedRowValue({
    saved: originalDoc,
    incoming: data,
    path,
    rowId: withoutId.includes(rowPath)
      ? undefined
      : (siblingData as { id?: unknown } | undefined)?.id,
    value,
  })
}

/** El campo del panel: editable en una fila nueva, de solo lectura en una guardada. */
export const LOCKED_ONCE_SAVED_FIELD = '/components/admin/LockedOnceSavedText#LockedOnceSavedText'
