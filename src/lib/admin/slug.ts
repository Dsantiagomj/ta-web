import { isReservedSlug, isSlugFormat } from '../guides/slug'
import { guideStrings } from '../guides/strings'
import { legacySlugStrings } from '../redirects/strings'
import { isLegacySource } from '../redirects/table'
import { type AddressKind, panelStrings } from './strings'

/**
 * Lo que mira el validador del campo: el formato y las rutas del sitio. Devuelve el mensaje,
 * o null si vale. Vacía, null: cada validador decide si la acepta.
 */
export function slugFormatProblem(slug: string | null | undefined): string | null {
  const value = slug?.trim()
  if (!value) return null
  if (!isSlugFormat(slug)) return panelStrings.slug.format
  return isReservedSlug(value) ? guideStrings.admin.slugReserved(value) : null
}

/**
 * Por qué una dirección escrita no se va a poder guardar, con el mismo mensaje que daría al
 * guardar, o null si vale. Vacía no es un problema todavía: la vista previa pide escribirla.
 * Lo usa la vista previa del panel; al guardar, el formato lo mira validateSlug y la tabla
 * de redirecciones rejectSharedSlug (src/collections/root-slug.ts).
 */
export function slugProblem(
  slug: string | null | undefined,
  kind: AddressKind = 'page',
): string | null {
  const value = slug?.trim()
  if (!value) return null
  const format = slugFormatProblem(value)
  if (format) return format
  // Un metalogro no tiene página propia: la tabla lo lleva a su panel (root-slug.ts).
  if (kind !== 'metalogro' && isLegacySource(value)) return legacySlugStrings.taken(value)
  return null
}
