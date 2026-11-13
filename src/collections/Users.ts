import type { CollectionConfig } from 'payload'

import { panelStrings } from '../lib/admin/strings'

// Cuentas del panel (Torre y editores). Los miembros de la web usan Better Auth, no esta colección.
export const Users: CollectionConfig = {
  slug: 'users',
  labels: { singular: 'Usuario del panel', plural: 'Usuarios del panel' },
  admin: {
    useAsTitle: 'email',
    group: panelStrings.groups.settings,
    hideAPIURL: true,
    defaultColumns: ['name', 'email', 'updatedAt'],
  },
  // El panel de dev es público: tras 5 intentos fallidos, la cuenta queda bloqueada 10
  // minutos. Son los valores por defecto de Payload, fijados aquí para que no cambien
  // sin que nadie lo note.
  auth: { maxLoginAttempts: 5, lockTime: 10 * 60 * 1000 },
  fields: [
    {
      name: 'name',
      label: panelStrings.users.name,
      type: 'text',
      admin: { description: panelStrings.users.nameDescription },
    },
  ],
}
