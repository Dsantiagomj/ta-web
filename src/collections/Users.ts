import type { CollectionConfig } from 'payload'

// Cuentas del panel (Torre y editores). Los miembros de la web usan Better Auth, no esta colección.
export const Users: CollectionConfig = {
  slug: 'users',
  labels: { singular: 'Usuario del panel', plural: 'Usuarios del panel' },
  admin: {
    useAsTitle: 'email',
  },
  // El panel de dev es público: tras 5 intentos fallidos, la cuenta queda bloqueada 10
  // minutos. Son los valores por defecto de Payload, fijados aquí para que no cambien
  // sin que nadie lo note.
  auth: { maxLoginAttempts: 5, lockTime: 10 * 60 * 1000 },
  fields: [],
}
