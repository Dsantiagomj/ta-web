// La regla de los enlaces de las redes en «Ajustes del sitio». Sin dependencias: la usa
// también el campo del panel en el navegador (src/components/admin/ValidatedTextField.tsx).

/** Una dirección web completa (https:// o http://), lo único que la web enlaza. */
export function isWebUrl(value: string): boolean {
  try {
    const { protocol } = new URL(value)
    return protocol === 'https:' || protocol === 'http:'
  } catch {
    return false
  }
}

/** Vacío vale (sale el enlace de siempre); si no, una dirección web completa. */
export function validateLinkUrl(value: unknown): true | string {
  if (value == null || (typeof value === 'string' && !value.trim())) return true
  if (typeof value === 'string' && isWebUrl(value.trim())) return true
  return 'Pega la dirección completa, empezando por https://'
}
