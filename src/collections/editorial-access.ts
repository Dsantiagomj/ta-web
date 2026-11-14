import type { Access, FieldAccess } from 'payload'

// Permisos compartidos de las colecciones editoriales (guías y logros) y los papeles del
// panel (docs/research/backlog.md, A-15): el editor crea, edita y publica; el administrador,
// además, borra, cambia los campos que rompen datos y gestiona las cuentas.

/** Los papeles de una cuenta del panel. Una cuenta nueva es editora. */
export const PANEL_ROLES = ['admin', 'editor'] as const
export type PanelRole = (typeof PANEL_ROLES)[number]

type PanelUserLike = { id?: number | string; role?: string | null } | null | undefined

/** Si la cuenta es administradora. Sin papel (una sesión de antes de los papeles), no. */
export const isAdminUser = (user: PanelUserLike): boolean => user?.role === 'admin'

/** Las cuentas del panel son las únicas sesiones de Payload: los miembros usan Better Auth. */
export const isPanelUser: Access = ({ req: { user } }) => Boolean(user)

/** Torre ve todo desde el panel, borradores incluidos; el resto solo ve lo publicado. */
export const readPublishedOrAll: Access = ({ req: { user } }) =>
  user ? true : { _status: { equals: 'published' } }

/** Borrar lo importado y las imágenes, y gestionar las cuentas: solo un administrador. */
export const isAdmin: Access = ({ req: { user } }) => isAdminUser(user)

/**
 * Borrar en una colección que también llena la importación: un administrador, todo; un
 * editor, solo lo que no vino de ella, que es lo que tiene vacío `marker` (la dirección en
 * Squarespace o lo último que escribió la importación).
 */
export const adminOrNotImported =
  (marker: string): Access =>
  ({ req: { user } }) => {
    if (!user) return false
    return isAdminUser(user) ? true : { [marker]: { exists: false } }
  }

/** El mismo permiso para un campo: un editor lo ve, pero no lo cambia. */
export const isAdminField: FieldAccess = ({ req: { user } }) => isAdminUser(user)

/** Un administrador, todas las cuentas; un editor, solo la suya. */
export const adminOrSelf: Access = ({ req: { user } }) => {
  if (!user) return false
  return isAdminUser(user) ? true : { id: { equals: user.id } }
}

/**
 * Los campos que rompen datos si cambian, como el orden o el enlace con DofusDB (A-23):
 * cualquiera los pone al crear; después, solo un administrador los cambia. Payload descarta
 * lo que mande un editor y deja el valor guardado.
 */
export const adminOnlyAfterCreate = { update: isAdminField }
