import type { Access } from 'payload'

// Permisos compartidos de las colecciones editoriales (guías y logros).

/** Las cuentas del panel son las únicas sesiones de Payload: los miembros usan Better Auth. */
export const isPanelUser: Access = ({ req: { user } }) => Boolean(user)

/** Torre ve todo desde el panel, borradores incluidos; el resto solo ve lo publicado. */
export const readPublishedOrAll: Access = ({ req: { user } }) =>
  user ? true : { _status: { equals: 'published' } }
