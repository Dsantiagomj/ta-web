import type { FieldHook } from 'payload'

// Un texto de una fila que se escribe al crearla y luego no cambia, como la clave de un
// prerrequisito de checklist: guarda lo que cada persona marcó (docs/research/backlog.md,
// A-23). En el panel se ve de solo lectura; aquí se protege también de la API.

/**
 * Una fila ya guardada se queda con su valor, llegue el que llegue. Payload empareja la fila
 * por su id, así que reordenar no cuenta como cambio; una fila nueva lleva el que traiga.
 */
export const keepSavedValue: FieldHook = ({ value, previousValue }) =>
  typeof previousValue === 'string' && previousValue.trim() !== '' ? previousValue : value

/** El campo del panel: editable en una fila nueva, de solo lectura en una guardada. */
export const LOCKED_ONCE_SAVED_FIELD = '/components/admin/LockedOnceSavedText#LockedOnceSavedText'
