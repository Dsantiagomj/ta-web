import type { CollectionConfig } from 'payload'

// Cuentas del panel (Torre y editores). Los miembros de la web usan Better Auth, no esta colección.
export const Users: CollectionConfig = {
  slug: 'users',
  labels: { singular: 'Usuario del panel', plural: 'Usuarios del panel' },
  admin: {
    useAsTitle: 'email',
  },
  auth: true,
  fields: [],
}
