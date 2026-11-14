// Siembra las guías, el logro, las guías de Dofus y las checklists de prueba (tests/e2e/seed/) en la base de las E2E o de
// Lighthouse CI, después de `pnpm migrate`. Corre con `payload run`; se niega con una base
// que no sea de esta máquina. Repetirlo no duplica nada.
import { getPayload } from 'payload'

import config from '@payload-config'
import { isLocalDatabaseUrl, resolveDatabaseUrl } from '@/lib/db/database-url'

import { seedAchievements } from '../tests/e2e/seed/achievements'
import { seedChecklistCards } from '../tests/e2e/seed/checklist-cards'
import { seedChecklistPages } from '../tests/e2e/seed/checklists'
import { seedChecklistIndex } from '../tests/e2e/seed/checklists-index'
import { seedDofusGuides } from '../tests/e2e/seed/dofus-guides'
import { seedGuides } from '../tests/e2e/seed/guides'

const databaseUrl = resolveDatabaseUrl(process.env)
if (!isLocalDatabaseUrl(databaseUrl)) {
  console.error('La siembra de pruebas solo escribe en una base local; DATABASE_URL apunta a otra.')
  process.exit(1)
}

const payload = await getPayload({ config })
try {
  await seedGuides(payload)
  await seedAchievements(payload)
  await seedDofusGuides(payload)
  await seedChecklistPages(payload)
  await seedChecklistIndex(payload)
  await seedChecklistCards(payload)
  console.log('Guías, logro, guías de Dofus y checklists de prueba sembrados.')
} finally {
  await payload.destroy()
}
process.exit(0)
