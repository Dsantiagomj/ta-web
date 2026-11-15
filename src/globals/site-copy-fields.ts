import type { Field, GlobalAfterChangeHook } from 'payload'

import { revalidateSiteCopy } from '../collections/revalidate-guides'

// Lo que comparten «Ajustes del sitio» y «Portada e índices».

/** Al guardar, la siguiente visita lee los textos nuevos (src/lib/site-copy/cache.ts). */
export const revalidateSiteCopyAfterChange: GlobalAfterChangeHook = ({ doc }) => {
  revalidateSiteCopy()
  return doc
}

/**
 * Un texto de Torre, que empieza con el de siempre: la web pone ese mismo si lo deja vacío
 * (src/lib/site-copy/resolve.ts). Los largos van en un cuadro de varias líneas.
 */
export function copyField(
  name: string,
  label: string,
  defaultValue: string,
  { long = false, description }: { long?: boolean; description?: string } = {},
): Field {
  const admin = description ? { admin: { description } } : {}
  const base = { name, label, localized: true, defaultValue, ...admin }
  return long ? { ...base, type: 'textarea' } : { ...base, type: 'text' }
}
