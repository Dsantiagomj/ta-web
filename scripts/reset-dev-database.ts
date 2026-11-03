// Deja vacía una base dentro del Postgres embebido de `pnpm db:dev`, para que
// `pnpm migrate` la cree desde cero como en CI. Solo toca la base que se le pasa.
import EmbeddedPostgres from 'embedded-postgres'

import { DEV_DATABASE } from '../src/lib/db/dev-database.ts'

export async function resetDevDatabase(name: string) {
  const postgres = new EmbeddedPostgres({
    databaseDir: DEV_DATABASE.dataDir,
    port: DEV_DATABASE.port,
    user: DEV_DATABASE.user,
    password: DEV_DATABASE.password,
  })

  const client = postgres.getPgClient('postgres', DEV_DATABASE.host)
  await client.connect()
  try {
    await client.query(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`)
    await client.query(`CREATE DATABASE "${name}"`)
  } finally {
    await client.end()
  }
}
