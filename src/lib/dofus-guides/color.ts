import { dofusGuideStrings } from './strings'

/** Un color hexadecimal de seis cifras: #2a5aaa. */
export const HEX_COLOR = /^#[0-9a-f]{6}$/i

/**
 * El brillo de una guía de Dofus: un hexadecimal de seis cifras, o nada. Devuelve true o el
 * mensaje. Lo usan la colección (al guardar) y el campo del panel (en el navegador).
 */
export function validateColor(value: unknown): true | string {
  if (value === null || value === undefined || value === '') return true
  return typeof value === 'string' && HEX_COLOR.test(value)
    ? true
    : dofusGuideStrings.admin.colorInvalid
}
