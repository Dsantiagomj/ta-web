// Siembra las guías de prueba (tests/e2e/seed/guides.ts) en la base de las E2E o de
// Lighthouse CI, después de `pnpm migrate`. Corre con `payload run`; se niega con una base
// que no sea de esta máquina. Repetirlo no duplica nada.
import { getPayload } from 'payload'

import config from '@payload-config'
import { isLocalDatabaseUrl, resolveDatabaseUrl } from '@/lib/db/database-url'

import { seedGuides } from '../tests/e2e/seed/guides'

const databaseUrl = resolveDatabaseUrl(process.env)
if (!isLocalDatabaseUrl(databaseUrl)) {
  console.error('La siembra de pruebas solo escribe en una base local; DATABASE_URL apunta a otra.')
  process.exit(1)
}

const payload = await getPayload({ config })
try {
  await seedGuides(payload)
  console.log('Guías de prueba sembradas.')
} finally {
  await payload.destroy()
}
process.exit(0)
