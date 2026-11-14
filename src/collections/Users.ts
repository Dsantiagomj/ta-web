import {
  APIError,
  type CollectionBeforeChangeHook,
  type CollectionBeforeDeleteHook,
  type CollectionConfig,
  type PayloadRequest,
} from 'payload'

import { panelStrings } from '../lib/admin/strings'
import { PANEL_ROLES, adminOrSelf, isAdmin, isAdminField } from './editorial-access'

const s = panelStrings.users

const countAdmins = async (req: PayloadRequest) =>
  (
    await req.payload.count({
      collection: 'users',
      where: { role: { equals: 'admin' } },
      overrideAccess: true,
      req,
    })
  ).totalDocs

/**
 * La primera cuenta, la que se crea en /admin con la base vacía, es administradora: si no,
 * nadie podría gestionar las demás. Y nunca se queda el panel sin administradores.
 */
const keepAnAdmin: CollectionBeforeChangeHook = async ({ data, operation, originalDoc, req }) => {
  if (operation === 'create') {
    const { totalDocs } = await req.payload.count({
      collection: 'users',
      overrideAccess: true,
      req,
    })
    return totalDocs === 0 ? { ...data, role: 'admin' } : data
  }
  if (originalDoc?.role === 'admin' && 'role' in data && data.role !== 'admin') {
    if ((await countAdmins(req)) <= 1) throw new APIError(s.lastAdmin, 400, null, true)
  }
  return data
}

const keepAnAdminOnDelete: CollectionBeforeDeleteHook = async ({ id, req }) => {
  const doc = await req.payload.findByID({
    collection: 'users',
    id,
    depth: 0,
    overrideAccess: true,
    req,
  })
  if (doc.role === 'admin' && (await countAdmins(req)) <= 1) {
    throw new APIError(s.lastAdmin, 400, null, true)
  }
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
    beforeChange: [keepAnAdmin],
    beforeDelete: [keepAnAdminOnDelete],
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
