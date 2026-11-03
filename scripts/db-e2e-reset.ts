// Deja vacía la base E2E dentro del Postgres embebido de `pnpm db:dev`, para que
// `pnpm migrate` la cree desde cero como en CI. Solo toca esa base.
import EmbeddedPostgres from 'embedded-postgres'

import { DEV_DATABASE } from '../src/lib/db/dev-database.ts'

const postgres = new EmbeddedPostgres({
  databaseDir: DEV_DATABASE.dataDir,
  port: DEV_DATABASE.port,
  user: DEV_DATABASE.user,
  password: DEV_DATABASE.password,
})

const client = postgres.getPgClient('postgres', DEV_DATABASE.host)
await client.connect()
try {
  await client.query(`DROP DATABASE IF EXISTS "${DEV_DATABASE.e2eDatabase}" WITH (FORCE)`)
  await client.query(`CREATE DATABASE "${DEV_DATABASE.e2eDatabase}"`)
  console.log(`Base ${DEV_DATABASE.e2eDatabase} vacía y lista para migrar.`)
} finally {
  await client.end()
}
