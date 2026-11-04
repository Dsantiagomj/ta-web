// Arranca y para el Postgres embebido de `pnpm db:dev` para las suites que lo necesitan
// (integración y Lighthouse CI) cuando no hay DATABASE_URL.
import { spawn, type ChildProcess } from 'node:child_process'
import { connect } from 'node:net'

import { DEV_DATABASE } from '../src/lib/db/dev-database.ts'

export function portIsOpen(port: number, host: string): Promise<boolean> {
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
export async function ensureDevDatabase(): Promise<ChildProcess | undefined> {
  if (await portIsOpen(DEV_DATABASE.port, DEV_DATABASE.host)) return undefined
  const child = spawn('node', ['scripts/db-dev.ts'], { stdio: 'inherit' })
  try {
    await waitForPort(DEV_DATABASE.port, DEV_DATABASE.host, 120_000)
  } catch (error) {
    // Si no llega a responder, el proceso que arrancamos no se queda colgado
    await stopProcess(child)
    throw error
  }
  return child
}

export function stopProcess(child: ChildProcess): Promise<void> {
  return new Promise((resolve) => {
    if (child.exitCode !== null || child.signalCode !== null) return resolve()
    child.once('exit', () => resolve())
    child.kill('SIGTERM')
  })
}
