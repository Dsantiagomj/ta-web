// Prepara la base de las pruebas de integración: vacía (en local) y con las
// migraciones versionadas aplicadas, como en producción. Sin push de esquema.
import { execFileSync, spawn, type ChildProcess } from 'node:child_process'
import { connect } from 'node:net'

import { resetDevDatabase } from '../../scripts/reset-dev-database.ts'
import { DEV_DATABASE } from '../../src/lib/db/dev-database.ts'
import { integrationEnv, usesEmbeddedDatabase } from './env.ts'

function portIsOpen(port: number, host: string): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = connect({ port, host })
    socket.once('connect', () => {
      socket.end()
      resolve(true)
    })
    socket.once('error', () => resolve(false))
  })
}

async function waitForPort(port: number, host: string, timeoutMs: number) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (await portIsOpen(port, host)) return
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  throw new Error(`Postgres no respondió en ${host}:${port} tras ${timeoutMs / 1000} s`)
}

/** Arranca `pnpm db:dev` si no está ya en marcha. Devuelve el proceso si lo arrancó. */
async function ensureDevDatabase(): Promise<ChildProcess | undefined> {
  if (await portIsOpen(DEV_DATABASE.port, DEV_DATABASE.host)) return undefined
  const child = spawn('node', ['scripts/db-dev.ts'], { stdio: 'inherit' })
  await waitForPort(DEV_DATABASE.port, DEV_DATABASE.host, 120_000)
  return child
}

function stop(child: ChildProcess): Promise<void> {
  return new Promise((resolve) => {
    if (child.exitCode !== null) return resolve()
    child.once('exit', () => resolve())
    child.kill('SIGTERM')
  })
}

export default async function setup() {
  let database: ChildProcess | undefined
  if (usesEmbeddedDatabase(process.env)) {
    database = await ensureDevDatabase()
    await resetDevDatabase(DEV_DATABASE.integrationDatabase)
  }

  execFileSync('pnpm', ['migrate'], {
    env: { ...process.env, ...integrationEnv(process.env) },
    stdio: 'inherit',
  })

  return async () => {
    if (database) await stop(database)
  }
}
