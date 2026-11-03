// Deja vacía la base E2E dentro del Postgres embebido de `pnpm db:dev`, para que
// `pnpm migrate` la cree desde cero como en CI. Solo toca esa base.
import { DEV_DATABASE } from '../src/lib/db/dev-database.ts'
import { resetDevDatabase } from './reset-dev-database.ts'

await resetDevDatabase(DEV_DATABASE.e2eDatabase)
console.log(`Base ${DEV_DATABASE.e2eDatabase} vacía y lista para migrar.`)
