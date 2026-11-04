// Prepara la base de las pruebas de integración: vacía (en local) y con las
// migraciones versionadas aplicadas, como en producción. Sin push de esquema.
import { execFileSync, type ChildProcess } from 'node:child_process'

import { ensureDevDatabase, stopProcess } from '../../scripts/dev-database-process.ts'
import { resetDevDatabase } from '../../scripts/reset-dev-database.ts'
import { DEV_DATABASE } from '../../src/lib/db/dev-database.ts'
import { integrationEnv, usesEmbeddedDatabase } from './env.ts'

export default async function setup() {
  let database: ChildProcess | undefined
  try {
    if (usesEmbeddedDatabase(process.env)) {
      database = await ensureDevDatabase()
      await resetDevDatabase(DEV_DATABASE.integrationDatabase)
    }

    execFileSync('pnpm', ['migrate'], {
      env: { ...process.env, ...integrationEnv(process.env) },
      stdio: 'inherit',
    })
  } catch (error) {
    // Vitest no llama al teardown si setup falla: se para aquí el Postgres que arrancamos
    if (database) await stopProcess(database)
    throw error
  }

  return async () => {
    if (database) await stopProcess(database)
  }
}
