// Arranca un Postgres embebido para desarrollo, sin Docker ni Postgres instalado.
// Uso: pnpm db:dev (se queda en primer plano; Ctrl+C lo para).
import EmbeddedPostgres from 'embedded-postgres'
import { existsSync } from 'node:fs'
import path from 'node:path'

import { DEV_DATABASE, DEV_DATABASE_URL } from '../src/lib/db/dev-database.ts'

const dataDir = path.resolve(DEV_DATABASE.dataDir)
const verbose = process.argv.includes('--verbose')

const postgres = new EmbeddedPostgres({
  databaseDir: dataDir,
  port: DEV_DATABASE.port,
  user: DEV_DATABASE.user,
  password: DEV_DATABASE.password,
  persistent: true,
  initdbFlags: ['--encoding=UTF8', '--locale=C'],
  onLog: (message) => {
    if (verbose) console.log(message)
  },
  onError: (error) => console.error(error),
})

async function databaseExists(name: string) {
  const client = postgres.getPgClient('postgres', DEV_DATABASE.host)
  await client.connect()
  try {
    const result = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [name])
    return (result.rowCount ?? 0) > 0
  } finally {
    await client.end()
  }
}

async function main() {
  // initdb solo la primera vez; después se reutilizan los datos de .postgres/.
  if (!existsSync(path.join(dataDir, 'PG_VERSION'))) {
    console.log(`Creando el clúster en ${DEV_DATABASE.dataDir}…`)
    await postgres.initialise()
  }

  await postgres.start()

  if (!(await databaseExists(DEV_DATABASE.database))) {
    await postgres.createDatabase(DEV_DATABASE.database)
  }

  console.log(`Postgres listo en ${DEV_DATABASE_URL}`)
  if (process.env.DATABASE_URL) {
    console.log('Aviso: DATABASE_URL está definida, así que la app usará esa base y no esta.')
  }
  console.log('Ctrl+C para pararlo.')

  let stopping = false
  const stop = async () => {
    if (stopping) return
    stopping = true
    await postgres.stop()
    process.exit(0)
  }
  process.on('SIGINT', stop)
  process.on('SIGTERM', stop)
}

main().catch(async (error: unknown) => {
  console.error('No se pudo arrancar Postgres:', error)
  // Un apagado brusco deja .postgres/data/postmaster.pid; si no hay otro Postgres
  // en marcha, borrarlo deja arrancar de nuevo.
  await postgres.stop().catch(() => {})
  process.exit(1)
})
