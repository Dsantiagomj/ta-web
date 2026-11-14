import {
  APIError,
  type CollectionBeforeChangeHook,
  type CollectionBeforeOperationHook,
  type CollectionConfig,
  type Where,
} from 'payload'

import { panelStrings } from '../lib/admin/strings'
import { PANEL_ROLES, adminOrSelf, isAdmin, isAdminField, isAdminUser } from './editorial-access'

const s = panelStrings.users

const lastAdminError = () => new APIError(s.lastAdmin, 400, null, true)

/**
 * La primera cuenta, la que se crea en /admin con la base vacía, es administradora: si no,
 * nadie podría gestionar las demás. Basta con mirar si hay una cuenta. Dos altas a la vez con
 * la base vacía solo pueden darse al arrancar el panel, y las dos saldrían administradoras.
 */
export const firstAccountIsAdmin: CollectionBeforeChangeHook = async ({ data, operation, req }) => {
  if (operation !== 'create' || data.role === 'admin') return data
  const { docs } = await req.payload.find({
    collection: 'users',
    limit: 1,
    depth: 0,
    pagination: false,
    select: {},
    overrideAccess: true,
    req,
  })
  return docs.length === 0 ? { ...data, role: 'admin' } : data
}

/**
 * Nunca se queda el panel sin administradores. Se mira una vez por operación, antes de que
 * Payload reparta un borrado o un cambio en lote entre documentos en paralelo: si las cuentas
 * que se borran o dejan de ser administradoras son todas las administradoras, no se hace.
 */
const keepAnAdmin: CollectionBeforeOperationHook = async ({
  args,
  operation,
  overrideAccess,
  req,
}) => {
  if (operation !== 'delete' && operation !== 'update') return args
  // Un editor no borra ni cambia otras cuentas: el permiso de la operación lo rechaza.
  if (!overrideAccess && !isAdminUser(req.user)) return args
  // Un borrado o un cambio, de un documento (id) o en lote (where).
  const { data, id, where } = args as {
    data?: Record<string, unknown>
    id?: number | string
    where?: Where
  }
  if (operation === 'update' && (!data || !('role' in data) || data.role === 'admin')) return args
  const targets: Where = id != null ? { id: { equals: id } } : (where ?? {})
  const isAdminRow: Where = { role: { equals: 'admin' } }
  const [admins, removed] = await Promise.all([
    req.payload.count({ collection: 'users', where: isAdminRow, overrideAccess: true, req }),
    req.payload.count({
      collection: 'users',
      where: { and: [targets, isAdminRow] },
      overrideAccess: true,
      req,
    }),
  ])
  if (removed.totalDocs > 0 && removed.totalDocs >= admins.totalDocs) throw lastAdminError()
  return args
}

// Cuentas del panel (Torre y editores). Los miembros de la web usan Better Auth, no esta colección.
export const Users: CollectionConfig = {
  slug: 'users',
  labels: { singular: 'Usuario del panel', plural: 'Usuarios del panel' },
  admin: {
    useAsTitle: 'email',
    group: panelStrings.groups.settings,
    hideAPIURL: true,
    defaultColumns: ['name', 'email', 'role', 'updatedAt'],
  },
  // Un editor solo ve y cambia su cuenta; las demás, y crear o borrar, son del administrador.
  access: {
    read: adminOrSelf,
    create: isAdmin,
    update: adminOrSelf,
    delete: isAdmin,
    unlock: isAdmin,
  },
  // El panel de dev es público: tras 5 intentos fallidos, la cuenta queda bloqueada 10
  // minutos. Son los valores por defecto de Payload, fijados aquí para que no cambien
  // sin que nadie lo note.
  auth: { maxLoginAttempts: 5, lockTime: 10 * 60 * 1000 },
  hooks: {
    beforeOperation: [keepAnAdmin],
    beforeChange: [firstAccountIsAdmin],
  },
  fields: [
    {
      name: 'name',
      label: s.name,
      type: 'text',
      admin: { description: s.nameDescription },
    },
    {
      name: 'role',
      label: s.role,
      type: 'select',
      // Sin `required`: una cuenta sin papel no es administradora (isAdminUser).
      defaultValue: 'editor',
      options: PANEL_ROLES.map((value) => ({ value, label: s.roles[value] })),
      // Un editor ve su papel, pero no se lo cambia.
      access: { create: isAdminField, update: isAdminField },
      saveToJWT: true,
      admin: { position: 'sidebar', description: s.roleDescription },
    },
  ],
}
